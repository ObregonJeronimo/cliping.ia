# -*- coding: utf-8 -*-
"""COMPUERTA E-PLACEHOLDER — el recorte que se muestra es la imagen del cliente, no su borrador.

Muchas paginas cargan primero un LQIP: una version diminuta y borrosa de la foto, estirada al tamano
final mientras baja la de verdad. Si la captura llega en ese instante, lo que termina en el video es
un rectangulo de bloques de color ocupando medio cuadro. Paso, y lo encontro el dueno mirando su
propio video — no las compuertas.

El filtro existia (`backend/motor.py`, `es_placeholder`) pero estaba ANIDADO dentro de `datos_de`, o
sea que ninguna prueba podia importarlo: corria en el camino de captura, en Python, sin una sola
compuerta detras. Si se rompia, las siete rapidas seguian en verde. Eso es lo que cierra este archivo.

QUE SE COMPRUEBA:

  1. NO SE TIRA MATERIAL REAL. Los 53 recortes de verdad que hay en `tools/out/motor/*/elementos/`
     tienen que sobrevivir los 53. Un filtro que descarta la foto del cliente es peor que no tenerlo:
     el defecto que evita es feo, el que causa es no mostrar al cliente.
  2. SE DESCARTA UN LQIP. Se fabrican borrosos-y-coloridos, que es el unico cuadrante donde no vive
     ningun recorte real.
  3. EL LIMITE CONOCIDO SIGUE DONDE SE LO DEJO. Un placeholder de pocos tonos (un bloque gris, dos
     colores planos) NO se detecta, a proposito. Se comprueba para que el dia que alguien baje el
     umbral se entere de que empieza a descartar logos.

Uso:  python tools/placeholder-check.py
"""
import glob
import os
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(RAIZ, "backend"))

try:
    import numpy as np
    from PIL import Image, ImageFilter
except Exception as e:                                    # pragma: no cover
    print("GATE PLACEHOLDER: falta numpy o Pillow (%s) — se saltea" % e)
    sys.exit(0)

from motor import es_placeholder                          # noqa: E402

fallos = []
tmp = os.path.join(RAIZ, "tools", "out", "_placeholder-check")
os.makedirs(tmp, exist_ok=True)


def guardar(nombre, arr):
    ruta = os.path.join(tmp, nombre)
    Image.fromarray(arr.astype("uint8")).save(ruta)
    return ruta


# ---------------------------------------------------------------- 1. el material real no se tira
reales = sorted(glob.glob(os.path.join(RAIZ, "tools", "out", "motor", "*", "elementos", "*.png")))
descartados = [r for r in reales if es_placeholder(r)]
if descartados:
    for r in descartados[:6]:
        fallos.append("descarta un recorte REAL: %s" % os.path.relpath(r, RAIZ))
# Y SI NO HAY MATERIAL, SE DICE. `tools/out/` esta en .gitignore, asi que en un clon recien hecho
# —el de cualquiera que se sume— no hay un solo recorte y este caso pasaria sobre CERO archivos,
# informando "0 conservados" como si hubiera comprobado algo. Los casos sinteticos de abajo son los
# que tienen dientes siempre; este suma cobertura solo cuando hay renders hechos, y cuando no la hay
# conviene que se lea en la salida en vez de quedar escondido en un numero.
SIN_MATERIAL = not reales

# ---------------------------------------------------------------- 2. un LQIP se descarta
# Un LQIP es una foto DIMINUTA estirada: al ampliarla, el interpolador deja gradientes suaves (pocos
# cambios por fila = corrida alta) pero conserva la variedad de color del original (muchos tonos). Se
# fabrica igual que lo hace un navegador: se genera chico y se agranda.
rng = np.random.RandomState(7)                            # sembrado: la compuerta es determinista
chico = rng.randint(0, 255, size=(9, 9, 3))
lqip = np.asarray(Image.fromarray(chico.astype("uint8")).resize((520, 360), Image.BICUBIC))
ruta_lqip = guardar("lqip.png", lqip)
if not es_placeholder(ruta_lqip):
    fallos.append("NO detecta un LQIP (foto de 9x9 estirada a 520x360) — es el caso que llego a un video")

# Y el mismo, mas grande y mas suave todavia.
chico2 = rng.randint(0, 255, size=(6, 6, 3))
lqip2 = np.asarray(Image.fromarray(chico2.astype("uint8")).resize((900, 600), Image.BICUBIC))
if not es_placeholder(guardar("lqip2.png", lqip2)):
    fallos.append("NO detecta un LQIP de 6x6 estirado a 900x600")

# ---------------------------------------------------------------- 3. lo nitido se conserva
# Texto: franjas finas de alto contraste. Es lo contrario de un LQIP —cambia en cada pixel— y es la
# mitad de los recortes que el motor usa (logos, CTAs, titulares recortados de la pagina).
texto = np.full((300, 600), 245.0)
for y in range(20, 280, 22):
    texto[y:y + 9, 30:570] = 25
if es_placeholder(guardar("texto.png", texto)):
    fallos.append("descarta un recorte NITIDO de texto — se estaria tirando el logo del cliente")

# Un logo plano: dos tonos, sin gradiente. Corrida altisima, tonos bajos.
logo = np.full((200, 400), 250.0)
logo[60:140, 80:320] = 40
if es_placeholder(guardar("logo.png", logo)):
    fallos.append("descarta un logo plano de dos tonos")

# ------------------------------------------- 3b. el arte de marca SUAVE se conserva (2026-08-06)
# Los dos casos que el detector tiraba de verdad, reconstruidos. Aparecieron al recapturar stripe.com:
# mientras esa pagina llegaba con `elementos: 0` por la captura rancia, este falso positivo era
# INVISIBLE — no habia material que tirar. Van sinteticos y no como archivos porque `tools/out/` no
# viaja en el repo y el caso 1 solo tiene dientes en una maquina que ya renderizo.
#
# Y van los ARCHIVOS DE VERDAD, no una imitacion: el primer intento los reconstruyo con numpy y las
# copias median 13-17 tonos contra los 8-9 de los originales — un degradado matematicamente perfecto
# reparte el histograma mucho mas que una imagen real, asi que probaban un caso mas facil que el que
# fallo. Reescalados a 600 px de lado mayor, como hace `director-fixture-elementos.mjs` con los suyos;
# comprobado que las dos metricas sobreviven al reescalado: (24.1, 9) -> (24.3, 9) y (9.9, 8) -> (8.6, 8).
REALES_SUAVES = [
    ("stripe-degradado-marca.png",
     "un DEGRADADO de marca — el abanico naranja-rosa de la portada de stripe.com, arte real y suave "
     "a proposito (corrida 24.3, tonos 9)"),
    ("stripe-tarjeta-texto.png",
     "una TARJETA con texto perfectamente legible — 'Stripe Atlas', con un adorno degradado al lado "
     "(corrida 8.6, tonos 8, con saltos de 121 niveles: lo contrario de un borrador)"),
]
for nombre, desc in REALES_SUAVES:
    ruta = os.path.join(RAIZ, "tools", "fixtures", "placeholder", nombre)
    if not os.path.exists(ruta):
        fallos.append("falta el fixture %s — sin el, el caso que fallo de verdad no se prueba" % nombre)
        continue
    if es_placeholder(ruta):
        fallos.append("descarta %s" % desc)

# ---------------------------------------------------------------- 4. el limite declarado sigue ahi
# Un placeholder gris de pocos tonos NO se detecta, y es deliberado: para cazarlo habria que bajar el
# umbral de tonos, y ahi empiezan a caer los logos de arriba. Si algun dia esto cambia, que sea una
# decision y no un descuido.
gris = np.full((300, 500), 200.0)
gris[:, 250:] = 190
if es_placeholder(guardar("gris.png", gris)):
    fallos.append("AHORA SI detecta el placeholder de dos tonos planos — puede estar tirando logos; "
                  "revisar el caso 3 y la nota de limite en backend/motor.py")

# ---------------------------------------------------------------- 5. no explota con basura
# `es_placeholder` promete conservar ante la duda. Un archivo ilegible no puede tirar el recorte ni
# reventar el render.
roto = os.path.join(tmp, "roto.png")
with open(roto, "wb") as fh:
    fh.write(b"esto no es un png")
if es_placeholder(roto) is not False:
    fallos.append("con un archivo ilegible no devuelve False — ante la duda se conserva")

if fallos:
    print("GATE PLACEHOLDER FAIL (%d):" % len(fallos))
    for f in fallos:
        print("  " + f)
    sys.exit(1)
if SIN_MATERIAL:
    print("GATE PLACEHOLDER OK (2 LQIP descartados, texto y logo conservados, limite declarado, "
          "basura no explota).")
    print("  SIN RECORTES REALES que revisar: no hay nada en tools/out/motor/*/elementos/ (esa carpeta "
          "no viaja en el repo).")
    print("  Corre `python backend/motor.py <url>` una vez y esta compuerta suma la comprobacion que "
          "mas importa: que el filtro no tire el material del cliente.")
else:
    print("GATE PLACEHOLDER OK (%d recortes reales conservados, 2 LQIP descartados, texto y logo "
          "conservados, limite de pocos tonos declarado, basura no explota)." % len(reales))
