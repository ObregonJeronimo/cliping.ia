# -*- coding: utf-8 -*-
"""LOS 11 AIRES SOBRE LA MISMA PIEZA — para ver si alguno compone sistematicamente peor.

POR QUE EXISTE. El aire no es una paleta: cambia el bpm (76 a 140), el dolly de la camara (0.4 a 1.55,
casi cuatro veces) y la tipografia. Ese rango ya produjo defectos reales — `toro` se salia del cuadro
SOLO con dolly 1.55, y el ancho de `apertura` estaba calculado contra el cuadro en reposo.

Las compuertas barren los once ROTANDO: cada escena ve un aire distinto. Eso da cobertura y no
comparacion — si un aire compusiera peor que los otros diez, quedaria diluido en el promedio.

QUE HACE. Renderiza LA MISMA pagina con LA MISMA semilla en los once aires y compara sobre pixeles.
Al fijar pagina y semilla, lo unico que cambia es el aire: cualquier diferencia es suya.

  contraste  del rotulo del hero, si la pieza lo lleva. Piso 3.0:1 (WCAG texto grande).
  movimiento cambio medio por pixel entre cuadros consecutivos. 0.005 es el ruido del codec.
  tinta      que tan lleno esta el cuadro, con umbral relativo al rango del propio cuadro — absoluto
             castiga a los mundos oscuros, y varios de estos aires lo son.

LO QUE NO SE PUEDE CONCLUIR. Un aire mas quieto no es peor: `lujo` declara bpm 76 contra los 140 de
`deportivo`, o sea que la mitad de la diferencia de movimiento es su tempo y esta buscada. La
herramienta dice DONDE MIRAR; el archivo del aire dice si eso estaba decidido.

Y EL AIRE CAMBIA EL GUION, no solo la camara: la misma semilla con otro aire arma otro plan. Asi que
las piezas NO son la misma pieza con otro color — se compara la calidad de lo que cada aire produce,
no el mismo video pintado once veces.

Uso:  npm run pesado -- python tools/aires-render.py
      npm run pesado -- python tools/aires-render.py --url https://stripe.com --seed 5
"""
import json
import os
import subprocess
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SALIDA = os.path.join(RAIZ, "tools", "out", "aires-render")
AIRES = ["artesanal", "bienestar", "corporativo", "deportivo", "editorial", "gastronomico",
         "inmobiliario", "jugueton", "lujo", "nocturno", "tecnico"]

BANDA_ROTULO = (0.845, 0.875)
PISO_CONTRASTE = 3.0
SALTO_HAY_TEXTO = 20
PISO_MOVIMIENTO = 0.05
PISO_TINTA = 0.08


def _tinta(a, np):
    p2, p98 = np.percentile(a, 2), np.percentile(a, 98)
    return float((np.abs(a - np.median(a)) > max(8.0, (p98 - p2) * 0.18)).mean())


def medir(mp4, plan, tag):
    import numpy as np
    from PIL import Image

    def cuadro(t, nom):
        p = os.path.join(SALIDA, "%s_%s.png" % (tag, nom))
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", "%.3f" % t,
                        "-i", mp4, "-vframes", "1", p], capture_output=True)
        return np.asarray(Image.open(p).convert("RGB"), dtype=float) if os.path.exists(p) else None

    dur = sum(plan["beats"]) * (60.0 / plan["bpm"])
    # Cinco instantes repartidos por la pieza ENTERA, no de una escena: lo que se compara es lo que el
    # aire produce a lo largo del video.
    movs, tintas = [], []
    for k in range(5):
        t = dur * (0.12 + 0.19 * k)
        a, b = cuadro(t, "m%d_a" % k), cuadro(t + 1.0 / 30.0, "m%d_b" % k)
        if a is None or b is None:
            continue
        ga, gb = a.mean(axis=2), b.mean(axis=2)
        movs.append(float(np.abs(ga - gb).mean()))
        tintas.append(_tinta(ga, np))

    # El rotulo solo existe si la pieza lleva la escena `hero`.
    contraste, motivo = None, "la pieza no lleva la escena hero"
    tramos = [t.split(":")[0] for t in plan["tramos"].split(",")]
    if "hero" in tramos:
        sb = 60.0 / plan["bpm"]
        acc = 0
        for nom, bt in zip(tramos, plan["beats"]):
            if nom == "hero":
                med = cuadro((acc + bt * 0.5) * sb, "hero")
                if med is not None:
                    H = med.shape[0]
                    band = med[int(H * BANDA_ROTULO[0]):int(H * BANDA_ROTULO[1])]
                    gris = band.mean(axis=2)
                    hay = np.percentile(np.abs(np.diff(gris, axis=1)), 99) >= SALTO_HAY_TEXTO
                    fondo = gris[gris > np.percentile(gris, 40)]
                    cama = float(fondo.std()) < 22 if fondo.size else False
                    if hay and cama:
                        c = band / 255.0
                        c = np.where(c <= 0.03928, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
                        L = 0.2126 * c[..., 0] + 0.7152 * c[..., 1] + 0.0722 * c[..., 2]
                        p5, p50 = np.percentile(L, 5), np.percentile(L, 50)
                        hi, lo = max(p5, p50), min(p5, p50)
                        contraste = (hi + 0.05) / (lo + 0.05)
                    else:
                        motivo = "sin rotulo" if not hay else "la banda tiene composicion, no una cama"
                break
            acc += bt
    if not movs:
        return None
    return {"movimiento": sum(movs) / len(movs), "tinta": sum(tintas) / len(tintas),
            "contraste": contraste, "motivo": motivo, "bpm": plan["bpm"],
            "escenas": len(tramos), "plan": plan["tramos"]}


def main():
    url, seed = "https://stripe.com", 5
    args = sys.argv[1:]
    for i, a in enumerate(args):
        if a == "--url":
            url = args[i + 1]
        elif a == "--seed":
            seed = int(args[i + 1])

    os.makedirs(SALIDA, exist_ok=True)
    filas, saltados = [], []
    for aire in AIRES:
        mp4 = os.path.join(SALIDA, "%s.mp4" % aire)
        r = subprocess.run([sys.executable, os.path.join(RAIZ, "backend", "motor.py"), url,
                            "--dur", "20", "--seed", str(seed), "--aire", aire, "--salida", mp4],
                           capture_output=True, text=True)
        if r.returncode != 0 or not os.path.exists(mp4):
            saltados.append((aire, "no se pudo renderizar"))
            continue
        plan = json.load(open(mp4 + ".plan.json", encoding="utf8"))
        m = medir(mp4, plan, aire)
        if m is None:
            saltados.append((aire, "no se pudieron extraer cuadros"))
            continue
        filas.append((aire, m))

    print("LOS 11 AIRES SOBRE %s seed %d — misma pagina, misma semilla, solo cambia el aire"
          % (url.replace("https://", ""), seed))
    print("  el aire cambia el GUION ademas de la camara, asi que los planes difieren: se compara la")
    print("  calidad de lo que cada uno produce, no el mismo video pintado once veces.\n")
    print("  %-14s %5s %7s %12s %8s   %s" % ("aire", "bpm", "escenas", "movimiento", "tinta", "contraste rotulo"))
    for aire, m in sorted(filas, key=lambda f: f[1]["movimiento"]):
        cr = "%.2f:1" % m["contraste"] if m["contraste"] is not None else m["motivo"]
        print("  %-14s %5.0f %7d %12.3f %8.3f   %s" % (aire, m["bpm"], m["escenas"], m["movimiento"], m["tinta"], cr))

    ojo = []
    for aire, m in filas:
        if m["contraste"] is not None and m["contraste"] < PISO_CONTRASTE:
            ojo.append("%s: rotulo a %.2f:1 (piso %.1f)" % (aire, m["contraste"], PISO_CONTRASTE))
        if m["movimiento"] < PISO_MOVIMIENTO:
            ojo.append("%s: se mueve %.3f por pixel — se lee como diapositiva" % (aire, m["movimiento"]))
        if m["tinta"] < PISO_TINTA:
            ojo.append("%s: tinta %.3f, el cuadro esta casi vacio" % (aire, m["tinta"]))
    if ojo:
        print("\n  PARA MIRAR (%d) — abrir cuadros y leer el archivo del aire antes de concluir:" % len(ojo))
        for o in ojo:
            print("    " + o)
    else:
        print("\n  Ninguno por debajo de los pisos.")

    # LOS QUE NO SE MIDIERON SE DICEN. Un aire que no se pudo renderizar no esta bien: no se midio.
    if saltados:
        print("\n  NO SE MIDIERON (%d):" % len(saltados))
        for a, por in saltados:
            print("    %-14s %s" % (a, por))
    if not filas:
        print("\n  FALLO: 0 aires medidos. No es que esten todos bien: no se midio NADA.")
        sys.exit(1)


if __name__ == "__main__":
    main()
