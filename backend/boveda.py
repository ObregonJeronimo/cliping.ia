"""BOVEDA — de una URL a un reel, eligiendo una PLANTILLA COMPLETA del catalogo.

EN QUE SE DIFERENCIA DE `motor.py`, QUE ES LA PREGUNTA QUE IMPORTA

`motor.py` compone: un guionista elige que escenas entran y en que orden, asi que dos videos de la
misma pagina comparten vocabulario y se diferencian en el sorteo. Aca no hay sorteo. Cada plantilla es
una pieza escrita entera, y elegir otra plantilla es elegir OTRO VIDEO — mismo contenido, ninguna
similitud de plano.

LO QUE SE REUSA, A PROPOSITO
El analisis entero: captura del sitio, modelo semantico, recortes, tira y la conversion a DATOS. Boveda
no analiza nada nuevo y no deberia — ese trabajo ya esta hecho, medido y con compuertas. Lo unico nuevo
es la capa que dibuja.

Uso:
    python backend/boveda.py https://stripe.com --plantilla atrio
    python backend/boveda.py --plantillas            (el catalogo, leido del registro)
"""
import argparse
import asyncio
import json
import os
import subprocess
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
sys.path.insert(0, AQUI)

SALIDA = os.path.join(RAIZ, "tools", "out", "boveda")

import cerrojo                                             # noqa: E402
import motor                                               # noqa: E402  (reusa captura + datos)


def plantillas_disponibles() -> list[dict]:
    """Lee el catalogo del REGISTRO, no de una copia.

    Igual que `heroes_disponibles` en motor.py y por la misma razon: una lista duplicada en Python se
    desincroniza el dia que alguien agrega una plantilla, y el sintoma es un estudio que ofrece algo
    que no existe — o peor, que esconde algo que si.
    """
    js = (
        "const m=await import('file://" + RAIZ.replace("\\", "/") + "/render3d/boveda/index.js');"
        "console.log(JSON.stringify(m.PLANTILLAS.map(p=>p.meta)))"
    )
    r = subprocess.run(["node", "--input-type=module", "-e", js],
                       capture_output=True, text=True, cwd=RAIZ)
    if r.returncode != 0:
        raise RuntimeError("no se pudo leer el catalogo de plantillas: " + (r.stderr or "").strip()[:400])
    return json.loads(r.stdout.strip().splitlines()[-1])


async def render(url: str, salida: str, plantilla: str = "", dur: int = 0, seed: int = 7,
                 aire: str | None = None, recapturar: bool = False,
                 bitrate: int = 12_000_000, forzar: bool = False) -> str:
    """URL -> mp4 con la plantilla elegida.

    `dur` NO se usa para recortar: cada plantilla declara su largo en beats y ese largo es parte de la
    pieza. Se acepta el parametro para que la firma sea la misma que la del otro motor, y se ignora a
    proposito — una plantilla cortada a la mitad no es "la misma plantilla mas corta", es una pieza sin
    cierre. Lo que SI cambia el largo real es el bpm del aire.
    """
    dst = os.path.join(motor.SALIDA, motor._dominio(url))
    # Toda la parte cara —bajar el sitio, modelarlo, recortar, armar la tira, traducir a DATOS— es
    # exactamente la de `motor.py`. Se la pide prestada en vez de reimplementarla.
    d, pm = await motor.preparar(url, dst, seed=seed, recapturar=recapturar, forzar=forzar)

    cat = plantillas_disponibles()
    ids = [p.get("id") for p in cat]
    pid = (plantilla or "").strip()
    if pid and pid not in ids:
        raise SystemExit(f"plantilla desconocida: {pid!r}. Hay: {', '.join(i for i in ids if i)}")

    # SIN PLANTILLA PEDIDA SE ELIGE UNA ELEGIBLE, no la primera de la lista.
    #
    # La version anterior tomaba `ids[0]`, o sea `atrio` siempre. Eso no fallaba nunca —`atrio` no
    # necesita material— pero volvia mentira a "elegis otra y es otro video": sin elegir, el motor
    # devolvia doce veces la misma pieza. Y el dia que la primera del catalogo pida una tira, todas las
    # paginas sin tira reventarian en vez de componer con otra.
    #
    # El material se mide de lo que la captura consiguio DE VERDAD, no de lo que se esperaba.
    if not pid:
        tira_hay = os.path.exists(os.path.join(dst, "tira.png"))
        elementos = [e for e in (d.get("elementos") or []) if e.get("url")]
        cifras = len([x for x in ((d.get("datos") or {}).get("datos") or []) if x and x.get("valor")])
        disp = set()
        if tira_hay:
            disp.add("tira")
        if elementos:
            disp.add("elementos")

        def entra(m):
            for n in (m.get("necesita") or ["nada"]):
                if n == "nada":
                    continue
                if n == "cifras":
                    if cifras < int(m.get("minCifras") or 1):
                        return False
                elif n not in disp:
                    return False
            return True

        posibles = [m for m in cat if entra(m)] or cat
        # La semilla, que es el mismo mando con el que el estudio pide "otra version". Deterministico:
        # la misma pagina con la misma semilla da siempre la misma plantilla.
        pid = posibles[seed % len(posibles)].get("id")
        print(f"boveda: sin plantilla pedida -> \"{pid}\" ({len(posibles)} elegibles de {len(cat)}"
              f" · tira={tira_hay} elementos={len(elementos)} cifras={cifras})")

    meta = next(p for p in cat if p.get("id") == pid)

    spec = {
        "W": 1080, "H": 1920, "fps": 30,
        # Holgado a proposito: es el tope del arnes de grabacion, y el largo REAL lo devuelve la pagina.
        # Un tope corto trunca la pieza sin avisar.
        "dur": 60,
        "seed": seed,
        "pagina": "boveda/boveda.html",
        "plantilla": pid,
        "aire": aire or d["aire"],
        "datos": d["datos"],
        "dna": d.get("dna"),
        # Cuatro muestras. Este motor mueve la camara en TODAS las plantillas, asi que con dos lo que
        # se desplaza sale duplicado en vez de barrido — se ve como error de render, no como velocidad.
        "obturador": {"angulo": 190, "muestras": 4},
    }
    tira = os.path.join(dst, "tira.png")
    if os.path.exists(tira):
        spec["tira"] = "/assets/tira.png"
        spec["tiraViewport"] = (pm.get("_tira") or {}).get("viewport", 1560)

    import render3d
    print(f"boveda: plantilla \"{pid}\" ({meta.get('nombre','')}) · aire {spec['aire']} · semilla {seed}")
    await render3d.grabar_mp4(spec, salida, raiz_assets=dst, gpu=True, bitrate=bitrate, log=print)

    # QUE CORRIO DE VERDAD, al lado del mp4. Es la misma leccion que el otro motor aprendio con su
    # `plan.json`: el video no dice con que se hizo, y cuando aparece un defecto lo primero que hace
    # falta es saber que plantilla, que aire y que semilla lo produjeron. Tres campos y un archivo.
    try:
        with open(os.path.splitext(salida)[0] + ".plan.json", "w", encoding="utf-8") as f:
            json.dump({"plantilla": pid, "nombre": meta.get("nombre", ""), "beats": meta.get("beats"),
                       "tiempos": meta.get("tiempos"), "aire": spec["aire"], "seed": seed,
                       "url": url, "tira": bool(spec.get("tira"))}, f, ensure_ascii=False, indent=1)
    except Exception as e:
        print(f"boveda: no se pudo anotar el plan ({e}) — el video igual esta")
    return salida


def main():
    ap = argparse.ArgumentParser(description="Boveda: una URL y una plantilla completa -> un reel 9:16")
    ap.add_argument("url", nargs="?", help="la pagina a convertir")
    ap.add_argument("--plantilla", default="", help="cual del catalogo (ver --plantillas)")
    ap.add_argument("--plantillas", action="store_true", help="listar el catalogo")
    ap.add_argument("--seed", type=int, default=7, help="otra version de la MISMA plantilla")
    ap.add_argument("--aire", help="forzar un aire en vez del que sale del rubro")
    ap.add_argument("--salida", help="ruta del mp4")
    ap.add_argument("--recapturar", action="store_true", help="volver a bajar la pagina")
    ap.add_argument("--forzar", action="store_true", help="construir aunque la captura parezca un muro")
    ap.add_argument("--bitrate", type=float, default=12.0, help="calidad en Mbps")
    a = ap.parse_args()

    if a.plantillas:
        cat = plantillas_disponibles()
        print(f"{'id':<12} {'beats':<6} {'familia':<14} nombre")
        for p in cat:
            print(f"{p.get('id',''):<12} {str(p.get('beats','?')):<6} {p.get('familia',''):<14} {p.get('nombre','')}")
            if p.get("pitch"):
                print(f"{'':<12} {p['pitch']}")
        return
    if not a.url:
        ap.error("hace falta una URL (o --plantillas)")

    # EL CERROJO VA ACA, antes de levantar Chromium: un render en paralelo con el guard es lo que colgó
    # la maquina el 4 de agosto de 2026. Ver backend/cerrojo.py.
    cerrojo.exigir(f"boveda.py {a.url}")

    os.makedirs(SALIDA, exist_ok=True)
    salida = a.salida or os.path.join(SALIDA, f"{motor._dominio(a.url)}-{a.plantilla or 'auto'}.mp4")
    os.makedirs(os.path.dirname(salida), exist_ok=True)
    ruta = asyncio.run(render(a.url, salida, plantilla=a.plantilla, seed=a.seed, aire=a.aire,
                              recapturar=a.recapturar, forzar=a.forzar,
                              bitrate=int(a.bitrate * 1_000_000)))
    print(f"\n{ruta}  ({os.path.getsize(ruta) // 1024} kb)")


if __name__ == "__main__":
    main()
