# AUDITAR-VIDEO — mide TODOS los cuadros de un MP4 y devuelve los pocos que hay que mirar.
#
# POR QUE EXISTE
# Un reel de 25 s son 750 cuadros. Mirarlos a ojo no entra en el contexto de un asistente, y elegir
# cuatro a dedo es lo que dejo pasar una imagen pixelada y una escena repetida que el usuario encontro
# en cinco segundos. La salida es: medir los 750 por programa —eso cuesta CPU, que sobra— y abrir solo
# los que la medicion senala.
#
# QUE MIDE, Y POR QUE CADA UNA
#   pixelado   Detalle FINO contra detalle GRUESO. Una imagen de 120 px estirada a 900 pierde el fino
#              y conserva el grueso: los bloques quedan planos adentro y duros en el canto. Es la misma
#              cuenta que `bandas()` usa en el kit para decidir si un tramo de pagina es legible.
#   nitidez    Varianza del laplaciano. Cae con el barrido del obturador y con el desenfoque.
#   quietud    Diferencia media contra el cuadro anterior. Sirve para las dos puntas: un tramo casi
#              identico es una escena muerta, y un salto enorme es un corte (o un defecto).
#   luma/std   Un cuadro plano y brillante suele ser un fogonazo no declarado.
#
# COMO ELIGE QUE MOSTRAR
# No devuelve "los N peores de una metrica": eso trae quince cuadros del mismo segundo. Reparte el
# presupuesto entre las categorias y exige separacion minima entre cuadros elegidos, asi que las 12
# imagenes cubren 12 momentos distintos de la pieza.
#
# USO
#   python tools/auditar-video.py <video.mp4> [carpeta_salida] [cuantos]
# Escribe los cuadros elegidos a resolucion COMPLETA (nunca en tira reescalada: eso destruye justo el
# detalle que se esta auditando) y un informe por consola.

import json
import os
import subprocess
import sys

import numpy as np
from PIL import Image, ImageFilter


def _ffmpeg():
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()


def _dims(video):
    exe = _ffmpeg()
    r = subprocess.run([exe, "-i", video], capture_output=True, text=True, errors="replace")
    for tok in (r.stderr or "").split():
        if "x" in tok and tok.replace("x", "").replace(",", "").isdigit():
            w, h = tok.replace(",", "").split("x")
            if int(w) > 200 and int(h) > 200:
                return int(w), int(h)
    return 1080, 1920


def medir(video, escala=270):
    """Un pase por TODOS los cuadros. Se miden en chico (270 px de ancho) porque las metricas son
    relativas y a resolucion completa el pase costaria minutos sin cambiar ninguna conclusion.
    El pixelado es la excepcion conceptual —depende de la escala— pero se conserva: un bloque de 8 px
    del original sigue siendo un bloque a 1/4, y lo que se busca es la RELACION fino/grueso."""
    W, H = _dims(video)
    h = int(escala * H / W)
    exe = _ffmpeg()
    cmd = [exe, "-v", "error", "-i", video, "-f", "rawvideo", "-pix_fmt", "gray",
           "-vf", f"scale={escala}:{h}", "-"]
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE)
    n = escala * h
    filas = []
    prev = None
    i = 0
    while True:
        buf = p.stdout.read(n)
        if len(buf) < n:
            break
        a = np.frombuffer(buf, dtype=np.uint8).reshape(h, escala).astype(np.float32)
        im = Image.fromarray(a.astype(np.uint8))
        # dos escalas de desenfoque: fino = lo que un upscale destruye, grueso = lo que conserva
        f2 = np.asarray(im.filter(ImageFilter.GaussianBlur(1.2)), dtype=np.float32)
        f8 = np.asarray(im.filter(ImageFilter.GaussianBlur(5.0)), dtype=np.float32)
        fino = float(np.abs(a - f2).mean())
        grueso = float(np.abs(f2 - f8).mean())
        # Mucho grueso y poco fino = bloques planos con canto duro. El +0.4 evita que un cuadro casi
        # liso (fino ~ 0 y grueso ~ 0) se dispare al infinito y se lleve todo el presupuesto.
        pix = grueso / (fino + 0.4)
        lap = float(np.abs(a - f2).var())
        dif = 0.0 if prev is None else float(np.abs(a - prev).mean())
        filas.append({"n": i, "luma": float(a.mean()), "std": float(a.std()),
                      "fino": fino, "grueso": grueso, "pix": pix, "nitidez": lap, "dif": dif})
        prev = a
        i += 1
    p.stdout.close(); p.wait()
    return filas


def elegir(filas, cuantos=12, sep=None):
    """Reparte el presupuesto entre categorias y exige separacion: 12 cuadros de 12 momentos, no 12
    del mismo segundo."""
    if not filas:
        return []
    sep = sep or max(6, len(filas) // (cuantos * 3))
    puesto, motivo = [], {}

    def tomar(orden, etq, cupo):
        tomados = 0
        for f in orden:
            if tomados >= cupo:
                break
            if any(abs(f["n"] - m) < sep for m in puesto):
                continue
            puesto.append(f["n"]); motivo[f["n"]] = etq; tomados += 1

    # El pixelado se lleva el cupo mas grande: es el defecto que motivo la herramienta.
    tomar(sorted(filas, key=lambda f: -f["pix"]), "pixelado", max(3, cuantos // 3))
    tomar(sorted(filas, key=lambda f: f["nitidez"]), "sin nitidez / barrido", max(2, cuantos // 6))
    tomar(sorted(filas, key=lambda f: -f["dif"]), "salto grande", max(2, cuantos // 6))
    tomar(sorted(filas, key=lambda f: (f["dif"], -f["n"])), "casi identico al anterior", max(2, cuantos // 6))
    tomar(sorted(filas, key=lambda f: (-f["luma"], f["std"])), "plano y brillante", max(1, cuantos // 8))
    # Y control: reparto parejo por la linea de tiempo para no auditar solo los extremos.
    paso = max(1, len(filas) // max(1, cuantos - len(puesto) + 1))
    tomar([filas[k] for k in range(0, len(filas), paso)], "control", cuantos - len(puesto))
    return sorted([(n, motivo[n]) for n in puesto])


def sacar(video, cuadros, dest):
    os.makedirs(dest, exist_ok=True)
    exe = _ffmpeg()
    rutas = []
    for n, _ in cuadros:
        r = os.path.join(dest, f"f{n:05d}.png")
        subprocess.run([exe, "-y", "-v", "error", "-i", video,
                        "-vf", f"select=eq(n\\,{n})", "-vframes", "1", r], capture_output=True)
        if os.path.exists(r):
            rutas.append(r)
    return rutas


def main():
    video = sys.argv[1]
    dest = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(video) or ".", "auditoria")
    cuantos = int(sys.argv[3]) if len(sys.argv) > 3 else 12

    filas = medir(video)
    print(f"  {len(filas)} cuadros medidos")
    pix = [f["pix"] for f in filas]
    print(f"  pixelado  media {np.mean(pix):.2f}  p95 {np.percentile(pix, 95):.2f}  max {max(pix):.2f}")
    nit = [f["nitidez"] for f in filas]
    print(f"  nitidez   media {np.mean(nit):.1f}  min {min(nit):.1f}")
    quietos = sum(1 for f in filas[1:] if f["dif"] < 0.6)
    print(f"  cuadros casi identicos al anterior: {quietos} ({100 * quietos / max(1, len(filas)):.0f}%)")

    elegidos = elegir(filas, cuantos)
    print(f"\n  {len(elegidos)} cuadros para mirar:")
    for n, m in elegidos:
        f = filas[n]
        print(f"    f{n:05d}  {m:<26} pix {f['pix']:5.2f}  nitidez {f['nitidez']:7.1f}  dif {f['dif']:5.2f}")
    rutas = sacar(video, elegidos, dest)
    print(f"\n  escritos en {dest}")
    with open(os.path.join(dest, "informe.json"), "w", encoding="utf-8") as fh:
        json.dump({"video": video, "cuadros": [{"n": n, "motivo": m, **filas[n]} for n, m in elegidos]}, fh, indent=1)
    for r in rutas:
        print("   ", r)


if __name__ == "__main__":
    main()
