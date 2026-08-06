# -*- coding: utf-8 -*-
"""AUDITORIA DE HEROES CON RENDER — mide en PIXELES lo que la geometria no puede ver.

POR QUE EXISTE, y por que no alcanza con `heroes-audit.mjs`. Esa construye las escenas y proyecta su
geometria: es rapida y barre los 17, pero no ve nada de lo que el espectador mira. Medido en esta
misma sesion, tres cosas que le pasaron por al lado:

  · el contraste del rotulo — vive en el pixel iluminado, no en el color declarado. `calibre` salia a
    2.41:1 y ninguna compuerta lo veia.
  · el movimiento de los heroes que deforman en el VERTEX SHADER. Son 10 de 17: `gota` medida en CPU
    daba 0.0029 y en pixeles da 1.27-1.91.
  · la calidad de la composicion. `pulso` tiene la cobertura geometrica mas baja de los 17 (0.401) y
    en el cuadro se ve lleno: son trazos finos y la cobertura mide areas de caja.

QUE HACE. Para cada hero pedido: renderiza una pieza de verdad, ubica su tramo en el plan —y COMPRUEBA
que el hero que salio es el que se pidio, porque `--hero` no lo garantiza— y mide sobre los cuadros de
ese tramo:

  contraste  del rotulo del hero contra lo que tiene detras. Piso 3.0:1 (WCAG texto grande).
             No se juzga una banda sin texto: un contraste ~1.0 sobre una franja lisa significa "aca
             no hay rotulo", no "es ilegible". Ya costo un falso positivo con `mosaico`.
  movimiento cambio medio por pixel entre cuadros consecutivos. Referencias medidas: 0.005 es el
             ruido del codec sobre una imagen congelada y 0.370 la escena mas quieta del motor.
  tinta      fraccion de pixeles que se apartan del fondo. Proxy de "que tan lleno esta el cuadro",
             pero medido sobre la imagen y no sobre cajas.

ES CARO: un render por hero, ~2 min cada uno. Va por `npm run pesado` y NO esta en la cadena del
guard — es una herramienta de auditoria, no una compuerta.

Uso:  npm run pesado -- python tools/heroes-render.py                 (todos los elegibles)
      npm run pesado -- python tools/heroes-render.py --hero pulso    (uno)
      npm run pesado -- python tools/heroes-render.py --url X --seed N
"""
import json
import os
import subprocess
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SALIDA = os.path.join(RAIZ, "tools", "out", "heroes-render")

# Pagina y semilla que MIDEN. Se eligieron porque su plan lleva la escena `hero` — sin eso no hay nada
# que auditar, y el motor no garantiza incluirla (`--hero` elige cual, no obliga a que entre).
CASOS = [("https://stripe.com", 5), ("https://basecamp.com", 26)]

BANDA_ROTULO = (0.845, 0.875)
PISO_CONTRASTE = 3.0
SALTO_HAY_TEXTO = 20
RUIDO_CODEC = 0.005          # medido: dos cuadros identicos difieren esto por el codec
PISO_MOVIMIENTO = 0.05       # diez veces el ruido; la escena mas quieta del motor da 0.370


def _cuadro(mp4, t, dst):
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", "%.3f" % t,
                    "-i", mp4, "-vframes", "1", dst], capture_output=True)
    return os.path.exists(dst)


def medir(mp4, plan, tag):
    import numpy as np
    from PIL import Image
    tramos = [t.split(":")[0] for t in plan["tramos"].split(",")]
    if "hero" not in tramos:
        return {"error": "el plan no lleva la escena hero"}
    sb = 60.0 / plan["bpm"]
    acc = 0
    ini = fin = None
    for nom, bt in zip(tramos, plan["beats"]):
        if nom == "hero":
            ini, fin = acc * sb, (acc + bt) * sb
            break
        acc += bt

    def leer(t, nombre):
        p = os.path.join(SALIDA, "%s_%s.png" % (tag, nombre))
        if not _cuadro(mp4, t, p):
            return None
        return np.asarray(Image.open(p).convert("RGB"), dtype=float)

    medio = leer((ini + fin) / 2.0, "medio")
    if medio is None:
        return {"error": "no se pudo extraer el cuadro"}
    H = medio.shape[0]

    # --- contraste del rotulo
    band = medio[int(H * BANDA_ROTULO[0]):int(H * BANDA_ROTULO[1])]
    gris = band.mean(axis=2)
    hay_texto = np.percentile(np.abs(np.diff(gris, axis=1)), 99) >= SALTO_HAY_TEXTO
    contraste = None
    if hay_texto:
        c = band / 255.0
        c = np.where(c <= 0.03928, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
        L = 0.2126 * c[..., 0] + 0.7152 * c[..., 1] + 0.0722 * c[..., 2]
        p5, p50 = np.percentile(L, 5), np.percentile(L, 50)
        hi, lo = max(p5, p50), min(p5, p50)
        contraste = (hi + 0.05) / (lo + 0.05)

    # --- movimiento: dos pares de cuadros consecutivos dentro del tramo
    movs = []
    for frac in (0.35, 0.65):
        t = ini + (fin - ini) * frac
        a = leer(t, "m%d_a" % int(frac * 100))
        b = leer(t + 1.0 / 30.0, "m%d_b" % int(frac * 100))
        if a is not None and b is not None:
            movs.append(float(np.abs(a.mean(axis=2) - b.mean(axis=2)).mean()))
    movimiento = sum(movs) / len(movs) if movs else None

    # --- tinta: pixeles que se apartan del fondo del propio cuadro
    g = medio.mean(axis=2)
    tinta = float((np.abs(g - np.median(g)) > 18).mean())

    return {"contraste": contraste, "movimiento": movimiento, "tinta": tinta,
            "tramo": (int(ini * 30), int(fin * 30))}


def main():
    args = sys.argv[1:]
    solo = None
    casos = list(CASOS)
    for i, a in enumerate(args):
        if a == "--hero":
            solo = args[i + 1]
        elif a == "--url":
            casos = [(args[i + 1], casos[0][1])]
        elif a == "--seed":
            casos = [(casos[0][0], int(args[i + 1]))]

    os.makedirs(SALIDA, exist_ok=True)
    heroes = [solo] if solo else None
    if heroes is None:
        d = os.path.join(RAIZ, "render3d", "demo", "heroes")
        heroes = sorted(f[:-3] for f in os.listdir(d) if f.endswith(".js") and f != "index.js")

    filas, fallos, saltados = [], [], []
    for h in heroes:
        hecho = False
        for url, seed in casos:
            mp4 = os.path.join(SALIDA, "%s.mp4" % h)
            r = subprocess.run([sys.executable, os.path.join(RAIZ, "backend", "motor.py"), url,
                                "--dur", "20", "--seed", str(seed), "--hero", h, "--salida", mp4],
                               capture_output=True, text=True)
            if r.returncode != 0 or not os.path.exists(mp4):
                continue
            plan = json.load(open(mp4 + ".plan.json", encoding="utf8"))
            # EL PLAN MANDA. `--hero` no garantiza el hero: si no es elegible para esa pagina y ese
            # aire, el registro elige otro y el video sale igual de valido. Auditar sin comprobar esto
            # es medir un hero creyendo que es otro — paso dos veces en la sesion que escribio esto.
            if h not in (plan.get("heroes") or []):
                continue
            m = medir(mp4, plan, h)
            if "error" in m:
                continue
            filas.append((h, url, seed, m))
            hecho = True
            break
        if not hecho:
            saltados.append(h)

    print("AUDITORIA DE HEROES CON RENDER — %d medidos, %d sin caso donde salieran" % (len(filas), len(saltados)))
    print("  %-12s %10s %12s %8s   %s" % ("hero", "contraste", "movimiento", "tinta", "pagina"))
    for h, url, seed, m in sorted(filas, key=lambda f: (f[3]["contraste"] or 99)):
        cr = "sin rotulo" if m["contraste"] is None else "%.2f:1" % m["contraste"]
        mv = "-" if m["movimiento"] is None else "%.3f" % m["movimiento"]
        print("  %-12s %10s %12s %8.3f   %s" % (h, cr, mv, m["tinta"], url.replace("https://", "")))
        if m["contraste"] is not None and m["contraste"] < PISO_CONTRASTE:
            fallos.append("%s: rotulo a %.2f:1, el piso es %.1f:1" % (h, m["contraste"], PISO_CONTRASTE))
        if m["movimiento"] is not None and m["movimiento"] < PISO_MOVIMIENTO:
            fallos.append("%s: se mueve %.3f por pixel (el ruido del codec es %.3f) — se lee como diapositiva"
                          % (h, m["movimiento"], RUIDO_CODEC))

    # LOS SALTADOS SE DICEN. Un hero que no aparecio en ningun caso no esta "bien": no se midio. Sin
    # esta linea, una auditoria de 4 heroes se leeria igual que una de 17.
    if saltados:
        print("\n  NO SE MIDIERON (%d) — ningun caso los eligio; el REGISTRO filtra heroes por aire:" % len(saltados))
        print("   ", " ".join(saltados))
    if fallos:
        print("\n  HALLAZGOS (%d):" % len(fallos))
        for f in fallos:
            print("    " + f)
    else:
        print("\n  Sin hallazgos sobre los medidos.")


if __name__ == "__main__":
    main()
