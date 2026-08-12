"""BARRIDO DEL RETRATO — corre el análisis sobre TODAS las capturas y mide si discrimina.

POR QUÉ EXISTE
==============

Un análisis calibrado sobre una sola página no está calibrado. La primera versión de `retrato.py` se
escribió mirando basecamp.com y parecía correcta: los números eran plausibles y la tabla se leía bien.
Pasada por las doce capturas del repo mostró tres defectos que sobre un solo sitio son invisibles:

  - `capas` daba **3 en once de doce sitios**. La fórmula sumaba dos señales ya normalizadas y el
    resultado caía siempre en la misma banda. No estaba mal razonada: estaba saturada.
  - `movimientos` daba **6 en once de doce**, contra el tope del rango. El detector de bandas usaba un
    percentil, y un percentil siempre encuentra su cola: en un sitio de una sección, ese 1% superior de
    cambios de brillo son las líneas de texto.
  - `vacio` daba **7% en tailwindcss**, que es de los sitios más aireados del conjunto. La causa no
    estaba en la fórmula sino en el dato de entrada: se confiaba en `palette.bgLum` del DOM, que ahí
    declara 0.002 —negro— cuando la tira mide 0.98. El fondo ahora se mide sobre los píxeles.

Los tres tienen la misma forma y es la forma más cara que hay en este repo: **el número se calculaba,
se guardaba, se leía, y no significaba nada**. Ninguno daba error.

QUÉ MIRA ESTA HERRAMIENTA
-------------------------

Para cada receta, cuántos valores DISTINTOS produce sobre el conjunto de capturas y cuál es su desvío.
Una receta que da el mismo valor en once de doce sitios no está midiendo la página: está decorando el
JSON. El criterio es explícito y está abajo, en `SOSPECHA`.

No es una compuerta y no bloquea: dice dónde mirar. Que una receta tenga poca variedad puede ser
correcto —`sistematico` es raro de verdad, casi ningún sitio usa una grilla estricta— y por eso el
veredicto es "sospechosa", no "rota".

    python tools/retrato-barrido.py
    python tools/retrato-barrido.py --sitio linear-app     (el detalle de uno solo)
"""
import argparse
import os
import statistics as st
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
sys.path.insert(0, os.path.join(RAIZ, "backend"))

import retrato  # noqa: E402

BASE = os.path.join(RAIZ, "tools", "out", "motor")

# Cuántos valores distintos, como mínimo, tiene que producir cada receta para que se la considere
# viva. El número no es el mismo para todas y no debería serlo:
#   - las continuas (velocidad, dureza, margen) tienen que dar casi tantos valores como sitios;
#   - las discretas chicas (capas 2..4, movimientos 2..6) no pueden dar más que su propio rango;
#   - las booleanas se miran aparte, por proporción.
SOSPECHA = {
    "velocidadCamara": 0.6,   # fracción del total de sitios
    "dureza": 0.4,
    "margenTexto": 0.5,
    "beatsSugeridos": 0.4,
    "capas": 0.15,
    "movimientos": 0.25,
    "cifrasAPedir": 0.1,
    "frasesAPedir": 0.1,
}
BOOLEANAS = ["sistematico", "acentoComoMasa", "pruebaGrande"]


def sitios():
    if not os.path.isdir(BASE):
        return []
    return [d for d in sorted(os.listdir(BASE))
            if os.path.isdir(os.path.join(BASE, d))
            and os.path.exists(os.path.join(BASE, d, "tira.png"))]


def main():
    ap = argparse.ArgumentParser(description="Corre el retrato sobre todas las capturas y mide si discrimina")
    ap.add_argument("--sitio", default="", help="ver el detalle de una sola captura")
    a = ap.parse_args()

    if a.sitio:
        d = os.path.join(BASE, a.sitio)
        if not os.path.isdir(d):
            print(f"no hay captura de {a.sitio} en {BASE}")
            raise SystemExit(2)
        print(retrato._tabla(retrato.escribir(d)))
        return

    ss = sitios()
    if not ss:
        print("no hay ninguna captura con tira.png en " + BASE)
        print("corre primero el motor o boveda sobre alguna URL.")
        raise SystemExit(2)

    print(f"{'sitio':<26}{'vel':>5}{'cap':>4}{'dur':>6}{'marg':>6}{'beat':>5}{'mov':>4}"
          f"{'sist':>6}{'masa':>6}{'vacio':>6}{'fondo':>6}{'desac':>6}   familia mas afin")
    filas, desacuerdos = [], []
    for s in ss:
        try:
            r = retrato.escribir(os.path.join(BASE, s))
        except Exception as e:
            print(f"{s:<26} ERROR: {str(e)[:60]}")
            continue
        rc, ai, fo, af = r["recetas"], r["aire"], r["fondo"], r["afinidad"][0]
        filas.append(rc)
        if fo["desacuerdo"] > 0.25:
            desacuerdos.append((s, fo["declarado"], fo["modo"]))
        print(f"{s:<26}{rc['velocidadCamara']:>5.2f}{rc['capas']:>4}{rc['dureza']:>6.2f}"
              f"{rc['margenTexto']:>6.2f}{rc['beatsSugeridos']:>5}{rc['movimientos']:>4}"
              f"{str(rc['sistematico']):>6}{str(rc['acentoComoMasa']):>6}{ai['vacio']:>6.2f}"
              f"{fo['modo']:>6.2f}{fo['desacuerdo']:>6.2f}   {af['familia']} {af['score']:.2f}")

    n = len(filas)
    print(f"\n  DISCRIMINACION sobre {n} sitios — una receta que da el mismo valor en casi todos no mide")
    sospechosas = []
    for k, minimo in SOSPECHA.items():
        vs = [f[k] for f in filas]
        d = len(set(vs))
        dev = st.pstdev(vs) if n > 1 else 0.0
        flojo = d < max(2, round(minimo * n))
        if flojo:
            sospechosas.append(k)
        print(f"    {k:<18} {d:>2}/{n} distintos  ·  min {min(vs):>6.2f}  max {max(vs):>6.2f}  "
              f"desvio {dev:.3f}{'   <- SOSPECHOSA: casi no varia' if flojo else ''}")
    for k in BOOLEANAS:
        vs = [1 for f in filas if f[k]]
        print(f"    {k:<18} True en {len(vs)}/{n}"
              + ("   <- SOSPECHOSA: siempre igual" if len(vs) in (0, n) and n > 3 else ""))

    if desacuerdos:
        print(f"\n  EL DOM Y LOS PIXELES NO COINCIDEN en {len(desacuerdos)} sitio(s). Se usa el medido:")
        for s, dec, med in desacuerdos:
            print(f"    {s:<26} el DOM declara bgLum {dec:.2f} y la tira mide {med:.2f}")

    fams = {}
    for s in ss:
        try:
            r = retrato.retrato_de(os.path.join(BASE, s))
        except Exception:
            continue
        f = r["afinidad"][0]["familia"]
        fams[f] = fams.get(f, 0) + 1
    print("\n  familia mas afin, por sitio: " + ", ".join(f"{k} x{v}" for k, v in sorted(fams.items(), key=lambda kv: -kv[1])))
    if len(fams) < 3 and n > 6:
        print("    <- SOSPECHOSO: con menos de tres familias distintas, la afinidad no esta ordenando nada")

    if sospechosas:
        print("\n  Hay " + str(len(sospechosas)) + " receta(s) que casi no varian: " + ", ".join(sospechosas))
        print("  Puede ser correcto (hay rasgos que de verdad son raros) o puede ser una formula saturada.")
        print("  Antes de darlo por bueno, mira de que senales sale cada una en backend/retrato.py.")


if __name__ == "__main__":
    main()
