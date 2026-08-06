# -*- coding: utf-8 -*-
"""COMPUERTA E-IMAGEN-SE-MUEVE — que la IMAGEN cambie, no el grafo.

POR QUE EXISTE, y es un punto ciego estructural que salio del barrido visual del 5/8/2026:

  `verificar.mjs:646` ya comprueba que nada se quede quieto mas de un beat... pero lo hace comparando
  la FIRMA DEL GRAFO (`firmaDe(r.g, r.gr)`, `f === previa`). O sea que pregunta *"¿cambio algo en la
  escena?"* y no *"¿cambio algo que se VEA?"*.

  No son la misma pregunta. Una escena que anima una opacidad de 0.98 a 0.99, o que aplica una deriva
  por debajo del umbral perceptible, cambia su firma en CADA cuadro y no mueve un solo pixel: pasa la
  compuerta en verde y en pantalla se lee como una diapositiva.

  Es la misma familia que el punto ciego de los shaders —*"corren en Node y nunca compilan GLSL"*—.
  Aca es: **miden el grafo y nunca miran la imagen.**

  Hoy ninguna escena abusa de eso: el barrido reviso las dos mas sospechosas (`sello` con 0.952 de
  cuadros casi quietos y `gancho` con el movimiento mas bajo) y las dos resultaron estar bien. Pero
  nada lo impide, y una compuerta existe para el dia que alguien lo haga sin darse cuenta.

QUE MIDE, y por que asi:

  Se renderiza una pieza de verdad —la misma cadena que hace los videos— y se compara cada cuadro con
  el anterior, pixel por pixel, en escala de grises. Se cuenta la racha mas larga de cuadros que no
  cambian y se exige que no llegue a un beat. Un beat es el
  limite que el propio motor declara en `verificar.mjs` ("mas de un beat se lee como diapositiva"), asi
  que las dos compuertas usan el MISMO criterio sobre dos medidas distintas — que es lo correcto: la
  del grafo caza el bug de programacion, esta caza el bug visual.

  EL UMBRAL NO SE ELIGE A OJO: SALE DE MEDIR LOS DOS EXTREMOS. La primera version de esta compuerta
  exigia igualdad EXACTA, razonando que "dos cuadros identicos no admiten interpretacion". Suena bien y
  es falso en la practica: probada contra un video hecho a proposito con UNA SOLA imagen repetida dos
  segundos, informo 0.00 s de congelacion. H.264 no reproduce pixeles identicos — medido, 232 pixeles
  de 45.440 difieren en +-1 entre dos cuadros que son la misma imagen. El codec agrega ruido de
  cuantizacion y la igualdad exacta nunca se cumple.

  Asi que el umbral se calibra con los dos extremos MEDIDOS, que estan bien separados:

    imagen congelada de verdad (mismo PNG repetido)   0.005 de cambio medio por pixel
    la escena mas quieta del motor (`sello`)          0.370

  Setenta veces de diferencia. El corte va en 0.05 — diez veces por encima del ruido del codec y siete
  veces por debajo del movimiento real mas bajo que existe en el motor. Un umbral en el medio de un
  hueco asi no necesita suerte.

Uso:  python tools/imagen-check.py
      python tools/imagen-check.py --url https://stripe.com --seed 5
"""
import json
import os
import subprocess
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SALIDA = os.path.join(RAIZ, "tools", "out", "imagen-check")

# Piezas fijas: la compuerta tiene que ser determinista, asi que la URL y la semilla no se sortean.
# Dos paginas de caracter distinto —una densa y una escueta— para que el barrido vea planes distintos.
PIEZAS = [("https://linear.app", 11, 20), ("https://basecamp.com", 26, 20)]

# Cambio medio por pixel (0-255) por debajo del cual se considera que la imagen NO se movio. Ver la
# calibracion en la cabecera: el ruido del codec da 0.005 y el movimiento real mas bajo del motor 0.37.
UMBRAL_QUIETO = 0.05

# PISO DE OCUPACION — un trinquete, no un ideal. Mide que fraccion del cuadro NO es fondo, con umbral
# RELATIVO al rango del propio cuadro (el absoluto de `medir-video.py` castiga a los mundos oscuros:
# ahi todo vive cerca del negro y casi ningun pixel cruza un corte fijo de 60).
#
# Medido hoy sobre cuatro piezas de cuatro paginas: pentagram 0.326, stripe 0.299, tailwindcss 0.247 y
# linear 0.120. La peor es `linear`, y su causa esta medida: su guion no programo ninguna escena que
# ponga PIXELES DE LA PAGINA en el cuadro —es tipografia y geometria pura— mientras tailwindcss, que es
# igual de oscura, programo un heroe `ventana` y llego a 0.247.
#
# El piso va en 0.10, por debajo de la peor pieza que existe hoy. NO dice que 0.120 este bien —esa es
# una decision de producto que Jero y Thiago tienen que tomar— dice que de aca no se baja mientras
# tanto. Es el mismo trinquete que `eco-check` y `E-ENCAJE`: sube el piso en vez de premiar el statu quo.
PISO_OCUPACION = 0.10


def ocupacion(mp4, fps=1):
    """Fraccion del cuadro que NO es fondo, con umbral relativo al rango del propio cuadro."""
    from PIL import Image
    import glob
    d = os.path.join(SALIDA, "ocu")
    os.makedirs(d, exist_ok=True)
    for viejo in glob.glob(os.path.join(d, "*.png")):
        os.remove(viejo)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", mp4,
                    "-vf", "fps=%d,scale=160:-1" % fps, os.path.join(d, "o%03d.png")], check=True)
    vals = []
    for f in sorted(glob.glob(os.path.join(d, "*.png"))):
        im = Image.open(f).convert("RGB")
        px = list(im.getdata())
        n = len(px)
        # mediana por canal = el fondo del propio cuadro
        med = [sorted(c)[n // 2] for c in zip(*px)]
        difs = [abs(p[0] - med[0]) + abs(p[1] - med[1]) + abs(p[2] - med[2]) for p in px]
        orden = sorted(difs)
        rango = max(20.0, float(orden[int(n * 0.99)]))
        vals.append(sum(1 for x in difs if x > rango * 0.25) / float(n))
    return sum(vals) / max(1, len(vals))


def cuadros_congelados(mp4, fps=10):
    """Devuelve (segundos_congelados, momento, cambio). Compara cada cuadro con el anterior.

    Se muestrea a 10 cuadros por segundo y no a 30: una congelacion real dura beats, no milesimas, y
    a 30 fps esto tardaria el triple sin cambiar un veredicto.
    """
    try:
        from PIL import Image
    except Exception as e:                                    # pragma: no cover
        print("GATE IMAGEN: falta Pillow (%s) — se saltea" % e)
        sys.exit(0)
    dst = os.path.join(SALIDA, "f")
    os.makedirs(SALIDA, exist_ok=True)
    for viejo in os.listdir(SALIDA):
        if viejo.startswith("f") and viejo.endswith(".png"):
            os.remove(os.path.join(SALIDA, viejo))
    # Chico a proposito: una congelacion se ve igual en 160 px que en 1080, y el costo baja 45 veces.
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", mp4,
                    "-vf", "fps=%d,scale=160:-1" % fps, dst + "%04d.png"], check=True)
    archivos = sorted(f for f in os.listdir(SALIDA) if f.startswith("f") and f.endswith(".png"))
    previo, racha, peor, peor_en, peor_dif = None, 0, 0, 0.0, None
    for i, nombre in enumerate(archivos):
        im = Image.open(os.path.join(SALIDA, nombre)).convert("L")
        px = list(im.getdata())
        if previo is not None:
            dif = sum(abs(a - b) for a, b in zip(px, previo)) / float(len(px))
            if dif < UMBRAL_QUIETO:
                racha += 1
                if racha > peor:
                    peor, peor_en, peor_dif = racha, i / float(fps), dif
            else:
                racha = 0
        previo = px
    return peor / float(fps), peor_en, peor_dif


def main():
    url, seed, dur = PIEZAS[0][0], PIEZAS[0][1], PIEZAS[0][2]
    args = sys.argv[1:]
    solo_una = False
    for i, a in enumerate(args):
        if a == "--url":
            url = args[i + 1]; solo_una = True
        elif a == "--seed":
            seed = int(args[i + 1]); solo_una = True
    piezas = [(url, seed, dur)] if solo_una else PIEZAS

    fallos = []
    medidos = []
    for u, s, d in piezas:
        mp4 = os.path.join(SALIDA, "p%d.mp4" % s)
        os.makedirs(SALIDA, exist_ok=True)
        r = subprocess.run([sys.executable, os.path.join(RAIZ, "backend", "motor.py"), u,
                            "--dur", str(d), "--seed", str(s), "--salida", mp4],
                           capture_output=True, text=True)
        if r.returncode != 0 or not os.path.exists(mp4):
            print("GATE IMAGEN: no se pudo renderizar %s (seed %d)" % (u, s))
            print((r.stdout or "")[-400:], (r.stderr or "")[-400:])
            sys.exit(1)
        plan = json.load(open(mp4 + ".plan.json", encoding="utf8"))
        beat = 60.0 / plan["bpm"]
        congelado, cuando, dif = cuadros_congelados(mp4)
        ocu = ocupacion(mp4)
        medidos.append((u, s, congelado, beat, ocu))
        if ocu < PISO_OCUPACION:
            fallos.append("%s (seed %d): la pieza ocupa %.3f del cuadro, por debajo del piso de %.2f "
                          "— casi todo es fondo" % (u, s, ocu, PISO_OCUPACION))
        # EL MISMO CRITERIO QUE `verificar.mjs`, sobre otra medida. Un beat es el limite que el motor
        # declara, y usar dos numeros distintos para la misma idea es como una compuerta contradice a
        # la otra.
        if congelado >= beat:
            fallos.append("%s (seed %d): la imagen se congela %.2f s seguidos a los %.1f s "
                          "(un beat son %.2f s) — eso se lee como diapositiva"
                          % (u, s, congelado, cuando, beat))

    if fallos:
        print("GATE IMAGEN FAIL (%d):" % len(fallos))
        for f in fallos:
            print("  " + f)
        sys.exit(1)
    detalle = " · ".join("%s seed %d: %.2fs congelado (beat %.2fs), ocupacion %.3f"
                         % (u.split("//")[-1], s, c, b, o) for u, s, c, b, o in medidos)
    print("GATE IMAGEN OK (%d piezas renderizadas de verdad y comparadas cuadro a cuadro sobre los "
          "PIXELES, no sobre el grafo: ninguna congela la imagen un beat entero). %s"
          % (len(medidos), detalle))


if __name__ == "__main__":
    main()
