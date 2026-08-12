"""BOVEDA — una FOTO de un beat, en segundos en vez de minutos.

POR QUE EXISTE
Afinar una plantilla es un bucle de mirar y corregir, y con el render completo ese bucle cuesta dos
minutos por vuelta. Peor: para ver el beat 5 hay que codificar los cuarenta. Las tres primeras piezas
de Boveda salieron mal por cosas que se ven en UN cuadro —el bloom del aire, el domo pintando ultimo,
la camara demasiado lejos— y cada diagnostico costo un video entero.

Esto abre la pagina, la inicializa con los mismos datos que el render de verdad, salta al beat pedido y
saca un PNG. Sin codificar, sin obturador, sin recorrer la timeline.

    python backend/boveda_foto.py atrio 5 12 20 33        (beats sueltos)
    python backend/boveda_foto.py reticula --tira          (una tira con seis beats repartidos)

LO QUE NO REEMPLAZA: el video. El obturador, el grano acumulado y el ritmo solo existen en movimiento,
y hay defectos —el fantasma del obturador, un corte que llega tarde— que un cuadro fijo no puede
mostrar. Esto es para COMPONER; el render es para juzgar.
"""
import argparse
import asyncio
import json
import os
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
sys.path.insert(0, AQUI)

import motor                                               # noqa: E402
import boveda                                              # noqa: E402


async def fotos(url: str, plantilla: str, beats: list[float], aire: str | None, seed: int,
                salida_dir: str, escala: float = 0.5):
    dst = os.path.join(motor.SALIDA, motor._dominio(url))
    d, pm = await motor.preparar(url, dst, seed=seed)

    spec = {
        "W": 1080, "H": 1920, "fps": 30, "dur": 60, "seed": seed,
        "pagina": "boveda/boveda.html", "plantilla": plantilla,
        "aire": aire or d["aire"], "datos": d["datos"], "dna": d.get("dna"),
        # UNA muestra: el obturador cuadruplica el costo y para juzgar composicion no aporta nada.
        "obturador": {"angulo": 190, "muestras": 1},
    }
    tira = os.path.join(dst, "tira.png")
    if os.path.exists(tira):
        spec["tira"] = "/assets/tira.png"
        spec["tiraViewport"] = (pm.get("_tira") or {}).get("viewport", 1560)

    import render3d
    from playwright.async_api import async_playwright

    os.makedirs(salida_dir, exist_ok=True)
    # El mismo servidor que usa el render: sirve three, gsap, las 72 tipografias y los assets del
    # dominio. Reimplementarlo seria volver a descubrir por que las fuentes tienen que ir por http.
    puerto, apagar = render3d._servir(dst)
    hechas = []
    try:
        async with async_playwright() as p:
            br = await p.chromium.launch(args=render3d.ARGS_GPU)
            pg = await br.new_page(viewport={"width": spec["W"], "height": spec["H"]})
            errores = []
            pg.on("pageerror", lambda e: errores.append(str(e)))
            pg.on("console", lambda m: errores.append("console." + m.type + ": " + m.text)
                  if m.type == "error" else None)
            await pg.goto(f"http://127.0.0.1:{puerto}/{spec['pagina']}", wait_until="load", timeout=30000)
            await pg.wait_for_function("() => !!window.URVID", timeout=15000)
            info = await pg.evaluate("(s) => window.URVID.init(s)", spec)
            print(f"  plantilla \"{info.get('plantilla')}\" · {info.get('beats')} beats · "
                  f"{info.get('bpm')} bpm · dur {info.get('dur'):.1f}s · texturas {info.get('texturas')}")
            if info.get("faltan"):
                print(f"  FALTAN texturas: {info['faltan'][:3]}")
            if info.get("uso"):
                print("  usa: " + ", ".join(f"{k}={v}" for k, v in info["uso"].items()))
            # QUE MIDE EL NAVEGADOR, no lo que yo creo que mide. La sonda de Node y la foto daban
            # resultados distintos sobre los mismos datos, y sin preguntarle al que dibuja no habia
            # forma de saber cual de los dos estaba corriendo otra cosa.
            medidas = await pg.evaluate('''() => {
              const out = []
              const r = window.__boveda && window.__boveda.rig
              if (!r) return out
              for (const raiz of [r.scene, r.escenaPagina]) {
                raiz.traverse(o => {
                  if (!o.isMesh || !o.geometry || !o.geometry.parameters) return
                  const m = o.material
                  const esTexto = m && m.uniforms && m.uniforms.map && m.uniforms.uProg
                  if (!esTexto) return
                  out.push({ w: +o.geometry.parameters.width.toFixed(2),
                             h: +o.geometry.parameters.height.toFixed(2),
                             prog: +m.uniforms.uProg.value.toFixed(2) })
                })
              }
              return out
            }''')
            if os.environ.get("BOVEDA_MEDIR"):
                print("  mallas de texto en el navegador (ancho x alto en unidades de mundo):")
                for m in medidas[:14]:
                    print(f"    {m['w']} x {m['h']}   uProg {m['prog']}")

            beat_seg = 60.0 / (info.get("bpm") or 124)
            for bt in beats:
                t = bt * beat_seg
                await pg.evaluate("(t) => window.URVID.frame(t)", t)
                nom = os.path.join(salida_dir, f"{plantilla}-b{bt:g}.png")
                await pg.locator("#acc").screenshot(path=nom)
                hechas.append(nom)
            for e in errores[:5]:
                print("  ERROR DE PAGINA: " + e[:160])
            await br.close()
    finally:
        apagar()
    return hechas


def main():
    ap = argparse.ArgumentParser(description="Una foto de un beat de una plantilla de Boveda")
    ap.add_argument("plantilla")
    ap.add_argument("beats", nargs="*", type=float, help="que beats fotografiar")
    ap.add_argument("--url", default="https://basecamp.com")
    ap.add_argument("--aire", default="editorial")
    ap.add_argument("--seed", type=int, default=5)
    ap.add_argument("--tira", action="store_true", help="seis beats repartidos por la pieza")
    a = ap.parse_args()

    beats = a.beats
    if a.tira or not beats:
        cat = {p["id"]: p for p in boveda.plantillas_disponibles()}
        n = cat.get(a.plantilla, {}).get("beats", 36)
        beats = [round(n * q, 1) for q in (0.12, 0.28, 0.45, 0.62, 0.80, 0.95)]

    salida = os.path.join(RAIZ, "tools", "out", "boveda", "fotos")
    hechas = asyncio.run(fotos(a.url, a.plantilla, beats, a.aire, a.seed, salida))
    for h in hechas:
        print("  " + h)


if __name__ == "__main__":
    main()
