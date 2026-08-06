# -*- coding: utf-8 -*-
"""AUDITORIA DE ESCENAS CON RENDER — cada tramo medido por separado, no la pieza promediada.

POR QUE EXISTE. `imagen-check.py` mide la PIEZA: cuanto se congela y cuanta ocupacion tiene en total.
Eso deja pasar el caso que importa — una escena floja dentro de una pieza sana. Un video de 20 s lleva
seis escenas y un solo hero, asi que la mayor parte de lo que se ve son escenas, y hasta ahora ninguna
herramienta las miraba de a una sobre PIXELES: `verificar.mjs` y `encuadre-check` construyen el grafo,
que es otra cosa.

El plan.json dice exactamente donde empieza y termina cada tramo, asi que medir por escena no cuesta
mas render: es el mismo video, leido por partes.

QUE MIDE, por tramo:

  movimiento  cambio medio por pixel entre cuadros consecutivos. Referencias MEDIDAS en este repo:
              0.005 es el ruido del codec sobre una imagen congelada y 0.370 la escena mas quieta
              (`sello`). El piso se pone en 0.05 — diez veces el ruido, siete veces por debajo de lo
              mas quieto que el motor produce a proposito.
  tinta       fraccion de pixeles que se apartan del fondo, con umbral RELATIVO al rango del propio
              cuadro. Absoluto castiga a los mundos oscuros —lo enseño `medir-video.py` y volvio a
              pasar aca con `rafaga`— y ademas la version geometrica subestima las composiciones de
              lineas finas (`pulso` da 0.401 de cobertura y se ve lleno).
  quietud     el tramo mas largo, en segundos, con el cambio por debajo del ruido. Un beat entero
              quieto se lee como diapositiva; es el mismo criterio que usa `verificar.mjs` sobre el
              grafo, aplicado a los pixeles.

LO QUE NO SE PUEDE CONCLUIR DE ESTO. Un numero bajo NO es un defecto. Las tres que ya se
comprobaron leyendo su cabecera, y que van a seguir apareciendo abajo del piso para siempre:

  sello    compone con el VACIO a proposito — "un emblema chico y tres cuartos de cuadro sin nada".
           Registrado en 0.042 de ocupacion; aca mide 0.051 de tinta.
  gancho   es una placa de texto que hay que poder LEER, asi que su quietud es inherente.
  bandera  "Un campo de color liso ocupando el cuadro entero, el nombre calado adentro. Sin marco,
           sin HUD, sin contador." Un campo LISO hace que la tinta sea baja por definicion: casi todo
           el cuadro es el mismo color. Mide 0.036, la mas baja de las 17.

Y UNA QUE PARECIA ESTARLO Y NO LO ESTABA, que es la leccion mas cara de esta herramienta:

  rafaga   con UNA aparicion medida daba 0.060 y entraba en la lista; con TRES da 0.250 y no entra.
           El promedio de n=1 no es un promedio. Antes de concluir sobre una escena hay que mirar
           cuantas veces se la vio — la columna `veces` esta para eso.

La herramienta dice DONDE MIRAR; la cabecera de la escena dice si eso que se ve estaba buscado.

Es cara —un render por pieza— asi que va por `npm run pesado` y NO entra en la cadena del guard.

Uso:  npm run pesado -- python tools/escenas-render.py
      npm run pesado -- python tools/escenas-render.py --piezas 6
"""
import json
import os
import subprocess
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SALIDA = os.path.join(RAIZ, "tools", "out", "escenas-render")

# Piezas fijas y deterministas. Se eligen paginas de caracter distinto para que el guion arme planes
# distintos y entren mas escenas del catalogo: con una sola pagina se auditan seis escenas y nada mas.
PIEZAS = [
    ("https://stripe.com", 5), ("https://stripe.com", 3),
    ("https://basecamp.com", 26), ("https://linear.app", 3),
    ("https://linear.app", 11), ("https://basecamp.com", 5),
    # Con las seis de arriba quedaban cinco escenas sin ver —bandera, columna, contraste, marquesina,
    # partida— y una escena que no se midio no esta bien: no se midio. Mas semillas mueven el guion,
    # que es quien elige que escenas entran.
    ("https://stripe.com", 11), ("https://linear.app", 26),
    ("https://basecamp.com", 3), ("https://stripe.com", 26),
    ("https://linear.app", 5), ("https://basecamp.com", 11),
]

RUIDO_CODEC = 0.005
PISO_MOVIMIENTO = 0.05
PISO_TINTA = 0.08


def _tinta(a, np):
    """Fraccion de pixeles que se apartan del fondo, con umbral RELATIVO al rango del propio cuadro.

    LA MEDIANA CON UMBRAL ABSOLUTO CASTIGA A LOS MUNDOS OSCUROS, y este repo ya lo tenia anotado por
    `medir-video.py`: en un mundo oscuro todo vive cerca del negro y casi nada cruza un corte fijo,
    aunque la composicion este igual de llena. El umbral pasa a ser una fraccion del rango real del
    cuadro (p2 a p98), con un piso para que un cuadro plano no dispare por ruido.

    Y QUEDA DICHO LO QUE ESTE CAMBIO NO ARREGLO, porque lo escribi al reves antes de medirlo: puse que
    explicaba el 0.059 de `rafaga` sobre linear.app, y no lo explica — con umbral relativo da 0.060.
    Lo que si movio fue `sello`, de 0.032 a 0.049 (+53%). El numero bajo de `rafaga` no es el mundo
    oscuro ni un defecto: es su forma, ver la lista de abajo.
    """
    p2, p98 = np.percentile(a, 2), np.percentile(a, 98)
    umbral = max(8.0, (p98 - p2) * 0.18)
    return float((np.abs(a - np.median(a)) > umbral).mean())


def medir_tramos(mp4, plan):
    import numpy as np
    from PIL import Image
    sb = 60.0 / plan["bpm"]
    tramos = [t.split(":")[0] for t in plan["tramos"].split(",")]
    out = []
    acc = 0
    for nom, bt in zip(tramos, plan["beats"]):
        ini, fin = acc * sb, (acc + bt) * sb
        acc += bt
        # Cinco instantes repartidos por el tramo, y de cada uno su cuadro siguiente: con uno solo no
        # se puede distinguir "quieta" de "la agarre en su pausa", que es una diferencia real —varias
        # escenas de este motor van A PASOS, con reposos deliberados entre golpe y golpe.
        difs, tintas = [], []
        for k in range(5):
            t = ini + (fin - ini) * (0.12 + 0.19 * k)
            pa = os.path.join(SALIDA, "_a.png")
            pb = os.path.join(SALIDA, "_b.png")
            for ruta, tt in ((pa, t), (pb, t + 1.0 / 30.0)):
                subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", "%.3f" % tt,
                                "-i", mp4, "-vframes", "1", ruta], capture_output=True)
            if not (os.path.exists(pa) and os.path.exists(pb)):
                continue
            a = np.asarray(Image.open(pa).convert("L"), dtype=float)
            b = np.asarray(Image.open(pb).convert("L"), dtype=float)
            difs.append(float(np.abs(a - b).mean()))
            tintas.append(_tinta(a, np))
        if not difs:
            continue
        quietos = sum(1 for d in difs if d < RUIDO_CODEC * 2)
        out.append({
            "escena": nom,
            "movimiento": sum(difs) / len(difs),
            "tinta": sum(tintas) / len(tintas),
            "quietud": quietos / len(difs),
            "dur": fin - ini,
        })
    return out


def main():
    args = sys.argv[1:]
    piezas = PIEZAS
    for i, a in enumerate(args):
        if a == "--piezas":
            piezas = PIEZAS[:int(args[i + 1])]

    os.makedirs(SALIDA, exist_ok=True)
    por_escena = {}
    renders = 0
    for url, seed in piezas:
        mp4 = os.path.join(SALIDA, "p_%s_%d.mp4" % (url.split("//")[1].split("/")[0].replace(".", "-"), seed))
        r = subprocess.run([sys.executable, os.path.join(RAIZ, "backend", "motor.py"), url,
                            "--dur", "20", "--seed", str(seed), "--salida", mp4],
                           capture_output=True, text=True)
        if r.returncode != 0 or not os.path.exists(mp4):
            print("  (no se pudo renderizar %s seed %d — se saltea)" % (url, seed))
            continue
        renders += 1
        plan = json.load(open(mp4 + ".plan.json", encoding="utf8"))
        for m in medir_tramos(mp4, plan):
            por_escena.setdefault(m["escena"], []).append(m)

    print("AUDITORIA DE ESCENAS CON RENDER — %d piezas, %d escenas distintas vistas"
          % (renders, len(por_escena)))
    print("  proxies sobre PIXELES. Un numero bajo dice DONDE MIRAR, no que haya un defecto:")
    print("  `sello` compone con el vacio a proposito y `gancho` es una placa que hay que poder leer.\n")
    print("  %-14s %6s %12s %8s %9s" % ("escena", "veces", "movimiento", "tinta", "quietud"))
    filas = []
    for nom, ms in por_escena.items():
        filas.append((nom, len(ms),
                      sum(m["movimiento"] for m in ms) / len(ms),
                      sum(m["tinta"] for m in ms) / len(ms),
                      sum(m["quietud"] for m in ms) / len(ms)))
    for nom, n, mov, tin, qui in sorted(filas, key=lambda f: f[2]):
        print("  %-14s %6d %12.3f %8.3f %8.0f%%" % (nom, n, mov, tin, qui * 100))

    ojo = [f for f in filas if f[2] < PISO_MOVIMIENTO or f[3] < PISO_TINTA]
    if ojo:
        print("\n  PARA MIRAR (%d) — abrir cuadros y leer la cabecera de la escena antes de concluir:" % len(ojo))
        for nom, n, mov, tin, qui in ojo:
            por = []
            if mov < PISO_MOVIMIENTO:
                por.append("se mueve %.3f (el ruido del codec es %.3f)" % (mov, RUIDO_CODEC))
            if tin < PISO_TINTA:
                por.append("tinta %.3f: el cuadro esta casi vacio" % tin)
            print("    %-14s %s" % (nom, " · ".join(por)))
    else:
        print("\n  Ninguna escena por debajo de los pisos.")

    # LAS QUE NO SE VIERON SE DICEN. El guion elige 5-7 escenas por pieza de un catalogo de 37: con
    # seis piezas se ven bastantes menos que todas, y una escena que no se midio NO esta bien.
    d = os.path.join(RAIZ, "render3d", "demo", "escenas")
    todas = sorted(f[:-3] for f in os.listdir(d) if f.endswith(".js") and f != "index.js")
    faltan = [e for e in todas if e not in por_escena]
    if faltan:
        print("\n  NO SE VIERON (%d de %d) — el guion no las eligio en estas piezas:" % (len(faltan), len(todas)))
        print("   ", " ".join(faltan))


if __name__ == "__main__":
    main()
