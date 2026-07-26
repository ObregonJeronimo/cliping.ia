"""render3d — maneja la escena WebGL desde afuera y la convierte en MP4.

EL PIPELINE
    timeline del Director (medida de la pagina, determinista, editable)
        -> spec JSON
        -> Chrome headless con Three.js + GSAP
        -> un PNG por frame
        -> ffmpeg -> MP4

POR QUE UN SERVIDOR LOCAL Y NO file://
Chrome bloquea los modulos ES cargados por file:// (CORS lo trata como origen opaco), y toda la escena
son modulos. Levantar un http.server en un puerto libre cuesta milisegundos y ademas deja resolver
`/three.module.js` y `/jsm/...` directamente contra node_modules sin copiar la libreria a ningun lado.

POR QUE SWIFTSHADER POR DEFECTO
El invariante del repo es que el mismo seed da el mismo frame. Una GPU real es mucho mas rapida pero
el resultado depende del driver y de la placa: dos maquinas dan pixeles distintos. SwiftShader
rasteriza por CPU y da el MISMO frame en cualquier lado. `gpu=True` para preview, nunca para un gate.
"""
import asyncio
import base64
import http.server
import json
import os
import socket
import socketserver
import subprocess
import threading
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
RENDER3D = RAIZ / "render3d"
NODE = RAIZ / "node_modules"

# Chrome con SwiftShader: mismo rasterizado en cualquier maquina.
ARGS_CPU = ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
            "--disable-lcd-text", "--force-color-profile=srgb", "--hide-scrollbars"]
ARGS_GPU = ["--no-sandbox", "--enable-gpu", "--force-color-profile=srgb", "--hide-scrollbars"]


class _Handler(http.server.SimpleHTTPRequestHandler):
    """Sirve render3d/ y mapea las librerias directo a node_modules (sin copiarlas) y los assets a
    donde esten en disco. Copiar three + gsap a una carpeta temporal por cada render son 8MB de I/O
    por video y una copia mas que puede quedar desincronizada."""

    raiz_assets = None

    def translate_path(self, path):
        p = path.split("?", 1)[0].split("#", 1)[0]
        if p == "/three.module.js":
            return str(NODE / "three" / "build" / "three.module.js")
        if p == "/three.core.js":
            return str(NODE / "three" / "build" / "three.core.js")
        if p.startswith("/jsm/"):
            return str(NODE / "three" / "examples" / "jsm" / p[5:])
        if p == "/gsap.min.js":
            return str(NODE / "gsap" / "dist" / "gsap.min.js")
        if p.startswith("/fonts/"):
            # las mismas 72 tipografias que usa el render 2D del Director; servirlas por http es lo
            # que permite que el canvas del navegador MIDA con la fuente real y no con la del sistema
            return str(RAIZ / "tools" / "fonts" / p[7:])
        if p.startswith("/assets/") and self.raiz_assets:
            return str(Path(self.raiz_assets) / p[8:])
        return str(RENDER3D / p.lstrip("/"))

    def log_message(self, *a):
        pass                                        # el server no tiene que ensuciar la consola del render


def _servir(raiz_assets):
    """Levanta el server en un puerto libre y devuelve (puerto, apagar)."""
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        puerto = s.getsockname()[1]
    handler = type("H", (_Handler,), {"raiz_assets": str(raiz_assets) if raiz_assets else None})
    srv = socketserver.ThreadingTCPServer(("127.0.0.1", puerto), handler)
    srv.daemon_threads = True
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return puerto, srv.shutdown


async def render_frames(spec, salida_dir, raiz_assets=None, gpu=False, cada=1, log=print):
    """Renderiza los frames de `spec` a PNG en `salida_dir`. Devuelve la lista de rutas.

    `cada` saltea frames (cada=3 -> uno de cada tres): sirve para una hoja de contacto rapida sin
    esperar el video entero.
    """
    from playwright.async_api import async_playwright

    salida_dir = Path(salida_dir)
    salida_dir.mkdir(parents=True, exist_ok=True)
    for f in salida_dir.glob("f*.png"):
        f.unlink()

    puerto, apagar = _servir(raiz_assets)
    rutas = []
    try:
        async with async_playwright() as p:
            br = await p.chromium.launch(args=(ARGS_GPU if gpu else ARGS_CPU))
            pg = await br.new_page(viewport={"width": spec["W"], "height": spec["H"]},
                                   device_scale_factor=1)
            errores = []
            pg.on("pageerror", lambda e: errores.append(str(e)))
            pg.on("console", lambda m: errores.append(f"console.{m.type}: {m.text}") if m.type == "error" else None)

            await pg.goto(f"http://127.0.0.1:{puerto}/{spec.get('pagina', 'escena.html')}", wait_until="load", timeout=30000)
            await pg.wait_for_function("() => !!window.URVID", timeout=15000)
            info = await pg.evaluate("(s) => window.URVID.init(s)", spec)
            log(f"[render3d] escena: {info['capas']} capas, {info['texturas']} texturas"
                + (f", FALTAN {len(info['faltan'])}: {info['faltan'][:2]}" if info.get("faltan") else ""))
            if errores:
                log(f"[render3d] errores de pagina: {errores[:3]}")

            fps = spec.get("fps", 30)
            if info.get("dur"):
                # la pagina manda: la pieza a mano se mide en beats y su duracion no se sabe hasta
                # construirla. Sin esto se pedian 900 frames para una escena de 2.9 s y la tira de
                # contacto quedaba casi entera congelada despues del final.
                spec["dur"] = info["dur"]
            n = int(round(spec["dur"] * fps))
            lienzo = pg.locator("#acc")   # el de la acumulacion del obturador; con muestras=1 es copia de #c
            for i in range(0, n, cada):
                t = i / fps
                await pg.evaluate("(t) => window.URVID.frame(t)", t)
                ruta = salida_dir / f"f{i:05d}.png"
                await lienzo.screenshot(path=str(ruta), animations="disabled")
                rutas.append(ruta)
                if i and i % 60 == 0:
                    log(f"[render3d] {i}/{n}")
            await br.close()
    finally:
        apagar()
    return rutas


def _ivf(chunks, w, h, fps, salida):
    """Mete los chunks VP9 crudos en un contenedor IVF.

    IVF es el envase mas simple que ffmpeg lee sin adivinar nada: 32 bytes de cabecera y 12 por frame.
    Escribir WebM a mano seria escribir EBML — mucho mas codigo y un formato donde un byte mal puesto
    da un archivo que abre y se ve roto, en vez de fallar.
    """
    import struct
    with open(salida, "wb") as f:
        f.write(b"DKIF")
        f.write(struct.pack("<HH4sHHIIII", 0, 32, b"VP90", w, h, fps, 1, len(chunks), 0))
        for i, (b, _t, _k) in enumerate(chunks):
            f.write(struct.pack("<IQ", len(b), i))
            f.write(b)
    return salida


async def grabar_mp4(spec, salida, raiz_assets=None, gpu=False, bitrate=12_000_000, log=print):
    """Render + codificacion DENTRO del navegador. Es el camino rapido y el que se usa de verdad.

    Medido en este repo: dibujar un frame cuesta 6 ms y sacarle un PNG por Playwright 530 ms. Sacar
    frames era el 99% del tiempo de render. Codificando con WebCodecs el frame no sale del navegador
    y al final viaja un solo video.
    """
    from playwright.async_api import async_playwright

    puerto, apagar = _servir(raiz_assets)
    try:
        async with async_playwright() as p:
            br = await p.chromium.launch(args=(ARGS_GPU if gpu else ARGS_CPU))
            pg = await br.new_page(viewport={"width": spec["W"], "height": spec["H"]}, device_scale_factor=1)
            errores = []
            pg.on("pageerror", lambda e: errores.append(str(e)))
            await pg.goto(f"http://127.0.0.1:{puerto}/{spec.get('pagina', 'escena.html')}", wait_until="load", timeout=30000)
            await pg.wait_for_function("() => !!window.URVID", timeout=15000)
            info = await pg.evaluate("(s) => window.URVID.init(s)", spec)
            log(f"[render3d] escena: {info['capas']} capas, {info['texturas']} texturas"
                + (f", FALTAN {len(info['faltan'])}" if info.get("faltan") else ""))

            fps = spec.get("fps", 30)
            if info.get("dur"):
                spec["dur"] = info["dur"]           # la pagina manda: la pieza a mano se mide en beats
            n = int(round(spec["dur"] * fps))
            await pg.evaluate("(b) => window.URVID.grabarInicio(b)", bitrate)
            for i in range(n):
                await pg.evaluate("(i) => window.URVID.grabarFrame(i)", i)
                if i and i % 120 == 0:
                    log(f"[render3d] {i}/{n}")
            fin = await pg.evaluate("() => window.URVID.grabarFin()")
            log(f"[render3d] {fin['n']} chunks / {fin['bytes'] // 1024}kb codificados en el navegador")

            chunks = []
            POR_TAJADA = 60
            while len(chunks) < fin["n"]:
                t = await pg.evaluate("([d, c]) => window.URVID.tajada(d, c)", [len(chunks), POR_TAJADA])
                crudo = base64.b64decode(t["b64"])
                off = 0
                for m in t["metas"]:
                    chunks.append((crudo[off:off + m["n"]], m["t"], m["k"]))
                    off += m["n"]
            if errores:
                log(f"[render3d] errores de pagina: {errores[:2]}")
            await br.close()
    finally:
        apagar()

    tmp = Path(salida).with_suffix(".ivf")
    _ivf(chunks, spec["W"], spec["H"], spec.get("fps", 30), tmp)
    import imageio_ffmpeg
    exe = imageio_ffmpeg.get_ffmpeg_exe()
    # Transcodificar a H.264: VP9 en MP4 casi no se reproduce fuera de Chrome, e Instagram lo rechaza.
    cmd = [exe, "-y", "-i", str(tmp), "-c:v", "libx264", "-pix_fmt", "yuv420p",
           "-crf", "18", "-preset", "medium", "-movflags", "+faststart", str(salida)]
    r = subprocess.run(cmd, capture_output=True)
    if r.returncode != 0:
        raise RuntimeError("ffmpeg: " + r.stderr.decode("utf-8", "replace")[-400:])
    tmp.unlink(missing_ok=True)
    return salida


def a_mp4(dir_frames, salida, fps=30):
    """Junta los PNG en un MP4 con el ffmpeg que ya trae imageio-ffmpeg (nada que instalar aparte)."""
    import imageio_ffmpeg
    exe = imageio_ffmpeg.get_ffmpeg_exe()
    # Secuencia numerada y NO glob: el ffmpeg que trae imageio en Windows se compila sin soporte de
    # glob ("globbing is not supported by this libavformat build") y falla al abrir la entrada. El
    # patron %05d exige que los frames sean consecutivos, que es el caso del render completo — el
    # salteo de `cada` es solo para hojas de contacto, que no se codifican.
    cmd = [exe, "-y", "-framerate", str(fps),
           "-i", str(Path(dir_frames) / "f%05d.png"),
           # yuv420p + faststart: sin eso el MP4 no reproduce en Instagram ni en Safari, que es
           # exactamente donde va a terminar el video.
           # scale a lado PAR: libx264 con yuv420p rechaza dimensiones impares y el error que tira
           # ("received no packets") no menciona la causa. -2 conserva la proporcion.
           "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2",
           "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "17", "-preset", "medium",
           "-movflags", "+faststart", str(salida)]
    r = subprocess.run(cmd, capture_output=True)
    if r.returncode != 0:
        raise RuntimeError("ffmpeg: " + r.stderr.decode("utf-8", "replace")[-400:])
    return salida


async def render_mp4(spec, salida, raiz_assets=None, gpu=False, tmp=None, log=print):
    tmp = Path(tmp or (RAIZ / "tools" / "out" / "render3d_frames"))
    await render_frames(spec, tmp, raiz_assets=raiz_assets, gpu=gpu, log=log)
    return a_mp4(tmp, salida, fps=spec.get("fps", 30))


if __name__ == "__main__":
    import sys
    spec = json.load(open(sys.argv[1], encoding="utf-8"))
    assets = sys.argv[2] if len(sys.argv) > 2 else None
    salida = sys.argv[3] if len(sys.argv) > 3 else str(RAIZ / "tools" / "out" / "render3d.mp4")
    asyncio.run(render_mp4(spec, salida, raiz_assets=assets))
    print(salida)
