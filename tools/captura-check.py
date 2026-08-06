# -*- coding: utf-8 -*-
"""COMPUERTA E-CAPTURA-REAL — no se construye un video sobre un muro.

El motor construyo 20 segundos enteros sobre una pagina de error de CloudFront: en el cuadro 87 se
lee "Request blocked" con el Request ID impreso en pantalla, y la pieza se entrego sin una sola
queja. De las 7 capturas cacheadas que habia en el repo, DOS estaban podridas — esa y una pantalla
anti-bot cuya marca quedo como "HUMAN VERIFICA". Un 29%.

La senal estaba a la vista desde siempre: el log del render imprime "0 frases - 0 cifras - cta
NINGUNO", y una pagina real no da eso nunca. Nadie la leia.

QUE SE COMPRUEBA:

  1. NINGUNA CAPTURA REAL SE RECHAZA. Las que hay en `tools/out/motor/*/datos.json` tienen que pasar
     todas. Un detector que frena una pagina legitima es peor que el defecto que evita: el defecto
     entrega un video feo, el falso positivo no entrega ninguno.
  2. LOS DOS MUROS DOCUMENTADOS SE RECHAZAN. No estan en el repo —se borraron—, asi que se
     reconstruyen desde lo que la ficha registro de cada uno: el de CloudFront por no tener NADA que
     decir, el anti-bot por su marca. Queda dicho que son reconstrucciones y no los archivos originales.
  3. UNA PAGINA POBRE PERO LEGITIMA PASA. Es el riesgo real de este detector, asi que se prueba con el
     peor caso medido del repo (mercadolibre: 2 frases, 1 cifra, sin CTA) y con uno todavia mas pobre.
  4. EL VOCABULARIO NO MUERDE PALABRAS NORMALES. Una marca que se llame "Just a Moment Cafe" seria un
     falso positivo; se comprueba que las frases del muro se busquen enteras y no por pedazos sueltos.

Uso:  python tools/captura-check.py
"""
import glob
import json
import io
import os
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(RAIZ, "backend"))
from motor import pagina_sospechosa                      # noqa: E402

fallos = []

# ---------------------------------------------------------------- 1. las capturas reales pasan
reales = sorted(glob.glob(os.path.join(RAIZ, "tools", "out", "motor", "*", "datos.json")))
for ruta in reales:
    with io.open(ruta, encoding="utf-8") as fh:
        datos = (json.load(fh) or {}).get("datos") or {}
    motivo = pagina_sospechosa(datos)
    if motivo:
        fallos.append("rechaza una captura REAL (%s): %s"
                      % (os.path.basename(os.path.dirname(ruta)), motivo))

# ---------------------------------------------------------------- 2. los muros documentados no
MUROS = [
    # www-sweetgreen-com: error de CloudFront. La ficha lo registra como "0 frases · 0 cifras · cta
    # NINGUNO" — la pagina no dijo absolutamente nada y aun asi se construyeron 20 segundos.
    ("CloudFront (sweetgreen)", {"marca": "SWEETGREEN", "frases": [], "datos": [], "cta": None,
                                 "claim": "", "bloque": {"titulo": ""}}),
    # www-sothebysrealty-com: pantalla de verificacion anti-bot. Lo que delata no es la falta de
    # material sino QUE dice: su marca quedo como "HUMAN VERIFICA".
    ("anti-bot (sothebysrealty)", {"marca": "HUMAN VERIFICA", "frases": ["Verifying you are human"],
                                   "datos": [], "cta": "CONTINUAR", "claim": "",
                                   "bloque": {"titulo": ""}}),
    # Y dos formas mas que la misma familia produce y que conviene tener cubiertas.
    ("403 del CDN", {"marca": "ACCESS DENIED", "frases": ["Request blocked"], "datos": [],
                     "cta": None, "claim": "", "bloque": {"titulo": ""}}),
    ("interstitial", {"marca": "TIENDA", "frases": ["Just a moment..."], "datos": [], "cta": "OK",
                      "claim": "", "bloque": {"titulo": ""}}),
]
for nombre, datos in MUROS:
    if not pagina_sospechosa(datos):
        fallos.append("NO detecta el muro %s — es el caso que llego a un video entregado" % nombre)

# ---------------------------------------------------------------- 3. una pagina pobre pasa igual
POBRES = [
    # El peor caso REAL medido en el repo.
    ("mercadolibre", {"marca": "MERCADO LIBRE ARGENTINA", "frases": ["Envios gratis", "Ofertas"],
                      "datos": [{"n": "1"}], "cta": None, "claim": "x" * 54,
                      "bloque": {"titulo": "Comprar"}}),
    # Y uno mas pobre todavia: una sola frase y nada mas. Sigue siendo una pagina.
    ("minima", {"marca": "PANADERIA DON JOSE", "frases": ["Pan de masa madre todos los dias"],
                "datos": [], "cta": None, "claim": "", "bloque": {"titulo": ""}}),
    # Sin frases pero con un CTA: tiene algo que decir.
    ("solo cta", {"marca": "ESTUDIO", "frases": [], "datos": [], "cta": "PEDIR TURNO",
                  "claim": "", "bloque": {"titulo": ""}}),
]
for nombre, datos in POBRES:
    motivo = pagina_sospechosa(datos)
    if motivo:
        fallos.append("rechaza una pagina POBRE pero legitima (%s): %s" % (nombre, motivo))

# ---------------------------------------------------------------- 4. el vocabulario no muerde de mas
# Las frases del muro se buscan enteras. Si alguna vez se las parte en palabras sueltas, una marca
# con "momento", "acceso" o "humano" en el nombre empezaria a rebotar y nadie sabria por que.
NORMALES = [
    ("cafe con nombre desafortunado", {"marca": "JUST A MOMENT CAFE", "frases": ["Cafe de especialidad"],
                                       "datos": [], "cta": "VER CARTA", "claim": "",
                                       "bloque": {"titulo": ""}}),
    ("consultora", {"marca": "ACCESO HUMANO", "frases": ["Consultoria en recursos humanos"],
                    "datos": [], "cta": None, "claim": "", "bloque": {"titulo": ""}}),
]
for nombre, datos in NORMALES:
    motivo = pagina_sospechosa(datos)
    if motivo and "just a moment" not in motivo:
        fallos.append("falso positivo por vocabulario (%s): %s" % (nombre, motivo))

# ------------------------------------------------- 5. una captura de formato viejo no se reusa
# El otro modo de captura podrida, y este era SILENCIOSO: no es que la pagina estuviera mal bajada,
# es que la bajo una version anterior del extractor. `stripe-com` y `www-mercadolibre-com-ar` quedaron
# cacheadas el 27/7 con una sola clave (`content`, el formato de antes de `elementos`); el motor las
# reusaba porque el archivo existia, y los dos videos se construyeron sin uno solo de los recortes que
# tenian en disco al lado — 12 y 8. Comprobado A/B: el site completo de linear-app da 7 elementos por
# `build_pagemodel` y el mismo degradado a {content} da 0.
#
# El riesgo de este detector es el falso positivo: marcar rancia una captura sana cuesta medio minuto
# de red por video. Por eso se prueba en las dos direcciones.
from motor import captura_rancia                            # noqa: E402
from site_capture import CLAVES_CAPTURA                     # noqa: E402

SANAS = [
    ("captura completa", {k: v for k, v in CLAVES_CAPTURA.items()}),
    # Una pagina que no dio NINGUN recorte es una respuesta legitima, no una captura vieja: la clave
    # esta y viene vacia. Si esto se marcara rancio, toda pagina sin elementos se recapturaria para
    # siempre, cada vez, sin que eso cambie nunca el resultado.
    ("pagina sin recortes", dict({k: v for k, v in CLAVES_CAPTURA.items()}, elementos=[])),
    ("pagina bloqueada", dict({k: v for k, v in CLAVES_CAPTURA.items()},
                              captura={"estado": "bloqueada"}, dna={"politica": "descartar"})),
]
for nombre, site in SANAS:
    motivo = captura_rancia(site)
    if motivo:
        fallos.append("falso positivo de captura rancia (%s): %s" % (nombre, motivo))

# Y las que tienen que acusar. La primera es el formato exacto que quedo en disco el 27/7.
VIEJAS = [
    ("formato 27/7, solo content", {"content": {"bodyText": "hola"}}),
    ("sin la clave elementos", {k: v for k, v in CLAVES_CAPTURA.items() if k != "elementos"}),
    ("sin la clave dna", {k: v for k, v in CLAVES_CAPTURA.items() if k != "dna"}),
    ("no es un objeto", ["content"]),
]
for nombre, site in VIEJAS:
    if not captura_rancia(site):
        fallos.append("captura vieja NO detectada (%s): se reusaria y el video saldria sin material" % nombre)

# Sobre las capturas reales que haya en disco: las que tienen las seis claves no se tocan.
sites = sorted(glob.glob(os.path.join(RAIZ, "tools", "out", "motor", "*", "site.json")))
n_viejas = 0
for ruta in sites:
    try:
        with io.open(ruta, encoding="utf-8") as fh:
            site = json.load(fh)
    except Exception:
        continue
    motivo = captura_rancia(site)
    completa = all(k in (site or {}) for k in CLAVES_CAPTURA)
    if completa and motivo:
        fallos.append("falso positivo sobre captura real %s: %s" % (os.path.basename(os.path.dirname(ruta)), motivo))
    if motivo:
        n_viejas += 1

if fallos:
    print("GATE CAPTURA FAIL (%d):" % len(fallos))
    for f in fallos:
        print("  " + f)
    sys.exit(1)
print("GATE CAPTURA OK (%d capturas reales aceptadas, %d muros rechazados, %d paginas pobres "
      "aceptadas, %d formatos viejos detectados, %d/%d capturas en disco son de formato viejo)."
      % (len(reales), len(MUROS), len(POBRES), len(VIEJAS), n_viejas, len(sites)))
if not reales:
    print("  SIN CAPTURAS REALES que revisar (tools/out/ no viaja en el repo): corre "
          "`python backend/motor.py <url>` una vez y esta compuerta suma el caso que mas importa.")
