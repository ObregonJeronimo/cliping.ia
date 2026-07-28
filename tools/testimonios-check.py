"""GATE de la VOZ DEL CLIENTE: un testimonio se publica como lo dijo quien lo dijo, o no se publica.

POR QUE EXISTE
`semantica_gratis` escribia `"testimonios": []` fijo. El material ya venia capturado en
`content.testimonials` desde hacia tiempo, asi que la escena de cita no podia elegirse NUNCA: habia
voz del cliente entrando por la puerta y saliendo por la ventana.

Pero llenar ese campo es el lugar mas facil del repo para violar la anti-invencion, y por una razon
concreta: el innerText de un bloque de testimonio trae la cita y el autor PEGADOS, sin raya ni
comillas. Medido sobre basecamp.com, 7 de 7 vienen asi:

    "...Errors are down. Clients are happier. Patrick Sheffield, Moore Communications Group"

O sea que "extraer la firma" es, literalmente, adivinar donde termina la frase y empieza un nombre
propio. Si el corte sale mal, el video le atribuye a una persona real palabras que no dijo.

Y del otro lado esta la tentacion simetrica, que ya paso de verdad: cuando el material capturado llega
SIN autor, el casillero de firma queda vacio y algo lo rellena con un generico. El fixture
linear-app.json tiene las tres citas firmadas "Linear customer" — un rotulo que no esta en ninguna
parte de linear.app. La pagina SI dice quien las dijo (Gabriel Peal de OpenAI, Nik Koblov de Ramp,
Kaz Nejatian de Opendoor); lo que fallaba era la CAPTURA, que se traia el <blockquote> sin el hermano
donde vive el nombre. O sea que se perdia la prueba social mas fuerte de la pagina y ademas se
publicaba una atribucion que nadie hizo. Por eso esta compuerta mide las dos puntas: que la firma real
LLEGUE, y que cuando de verdad no hay, no se invente ninguna.

LO QUE ESTA COMPUERTA EXIGE
  E-CITA-LITERAL   toda firma publicada aparece TAL CUAL en el material capturado. Es la invariante
                   dura: si la firma no es un pedazo del texto que trajo la pagina, se invento.
  E-CITA-LITERAL   idem para el texto de la cita.
  E-CITA-SIN-FIRMA una cita sin autor identificable sale con firma vacia, no con un generico.
  E-CITA-NO-CTA    un boton de "pedi tu presupuesto" (que el selector `[class*="quote"]` pesca) no es
                   un testimonio: publicarlo como voz del cliente es vender copy propio como ajeno.
  E-CITA-ENTERA    ninguna firma cortada a mitad de palabra ("Shannon Kropf, Full Sail Uni").

El material de prueba son capturas REALES (basecamp.com y linear.app, tomadas con el mismo
site_capture que corre en produccion), no cadenas escritas para que el test pase.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))
from semantica_gratis import _testimonios  # noqa: E402

# --- material REAL capturado con site_capture (no inventado para el test) ---
BASECAMP = [
    "Simply put, we get more work done, quicker, and better. Productivity is up. Errors are down. "
    "Clients are happier. Patrick Sheffield, Moore Communications Group",
    "Since using Basecamp, our communication is drastically better and deadlines are met without "
    "drama. Shannon Kropf, Full Sail University",
    "Basecamp is beautiful software that has resisted every wrong trend and stayed true to the "
    "things that mattered most. Highly recommended. Tobi Lutke Shopify Co-Founder & CEO",
]
# linear.app: la firma vive en un hermano del <blockquote> y la captura ahora la trae pegada. La misma
# cita aparece dos veces con firma de distinto detalle (el selector matchea la cita y su contenedor):
# tiene que quedar UNA sola, con la firma mas completa. Esto es lo que impide que vuelva "Linear customer".
LINEAR = [
    "You’ll probably build a better product, just because of the craft that using Linear "
    "infuses on your brain. Gabriel Peal, OpenAI",
    "Our speed is intense and Linear helps us be action biased. Nik Koblov, Ramp",
    "Linear is excellent, just excellent. It has the right opinions for fast moving teams. "
    "Kaz Nejatian, Opendoor",
    "You’ll probably build a better product, just because of the craft that using Linear "
    "infuses on your brain. Gabriel Peal, Staff Software Engineer, OpenAI",
    "Our speed is intense and Linear helps us be action biased. Nik Koblov, Head of Engineering, Ramp",
]
LINEAR_AUTORES = ["Gabriel Peal", "Nik Koblov", "Kaz Nejatian"]
# Una pagina que publica la cita y NO dice quien la dijo. Es el caso que prueba que no rellenamos:
# sale con firma vacia y la escena la muestra sin autor, que es la verdad.
SIN_AUTOR = [
    "Nos cambio la forma de trabajar y el equipo lo agradece todos los dias.",
    "The onboarding took ten minutes and we were running the same afternoon.",
]
# Lo que el selector `[class*="quote" i]` pesca en un sitio de servicios, y no es una voz.
CTAS = [
    "Pedi tu presupuesto sin cargo y sin compromiso para tu hogar hoy mismo",
    "Get a free quote for your home insurance today and save money",
    "Solicita una demo personalizada con nuestro equipo comercial ahora",
]

fallos = []


def _literal(parte, crudos, etiqueta, caso):
    """Todo lo que se publica tiene que estar, tal cual, en algo que trajo la pagina."""
    if not parte:
        return
    if not any(parte in c for c in crudos):
        fallos.append(f"E-CITA-LITERAL  {caso}: {etiqueta} \"{parte}\" no aparece en el material capturado")


# ---- 1. material con firma pegada: se separa bien y NADA se inventa
sal = _testimonios({"testimonials": BASECAMP})
if len(sal) != 3:
    fallos.append(f"E-CITA-MATERIAL  basecamp: se publicaron {len(sal)} de 3 testimonios reales")
for t in sal:
    _literal(t["texto"], BASECAMP, "el texto", "basecamp")
    _literal(t["firma"], BASECAMP, "la firma", "basecamp")
    if not t["firma"]:
        fallos.append(f"E-CITA-FIRMA  basecamp: \"{t['texto'][:40]}\" trae autor en la pagina y salio sin firma")
    # La firma no puede quedarse dentro de la cita: si sigue ahi, el texto termina con el nombre.
    if t["firma"] and t["firma"] in t["texto"]:
        fallos.append(f"E-CITA-FIRMA  basecamp: la firma \"{t['firma']}\" quedo DENTRO del texto de la cita")
    # Cortar un apellido al medio se lee como un error de la herramienta, no como una cita.
    if t["firma"] and len(t["firma"]) >= 28 and not t["firma"].endswith((".", "…")):
        crudo = next((c for c in BASECAMP if t["firma"] in c), "")
        resto = crudo.split(t["firma"], 1)[1] if crudo else ""
        if resto[:1].isalpha():
            fallos.append(f"E-CITA-ENTERA  basecamp: firma cortada a mitad de palabra: \"{t['firma']}\"")

# ---- 2. firma en elemento aparte: LLEGA, no se pierde, y la cita repetida no se duplica
sal = _testimonios({"testimonials": LINEAR})
if len(sal) != 3:
    fallos.append(f"E-CITA-REPETIDA  linear: 5 entradas de 3 citas dieron {len(sal)} (deberian deduplicarse en 3)")
for t in sal:
    _literal(t["texto"], LINEAR, "el texto", "linear")
    _literal(t["firma"], LINEAR, "la firma", "linear")
for autor in LINEAR_AUTORES:
    if not any(f["firma"].startswith(autor) for f in sal):
        fallos.append(f"E-CITA-PERDIDA  linear: la pagina acredita a {autor} y no llego a la firma")

# ---- 3. citas sin autor: salen sin firma, NUNCA con un generico
sal = _testimonios({"testimonials": SIN_AUTOR})
if len(sal) != 2:
    fallos.append(f"E-CITA-MATERIAL  sin-autor: se publicaron {len(sal)} de 2 citas")
for t in sal:
    _literal(t["texto"], SIN_AUTOR, "el texto", "sin-autor")
    if t["firma"]:
        fallos.append(f"E-CITA-SIN-FIRMA  el material no trae autor y se publico \"{t['firma']}\"")

# ---- 3. un CTA no es una voz
sal = _testimonios({"testimonials": CTAS})
if sal:
    fallos.append(f"E-CITA-NO-CTA  {len(sal)} boton(es) publicados como testimonio: \"{sal[0]['texto'][:48]}\"")

# ---- 4. sin material, campo vacio (la escena se saltea, no se rellena)
for vacio in ({}, {"testimonials": []}, {"testimonials": ["corto"]}, None):
    if _testimonios(vacio):
        fallos.append(f"E-CITA-VACIO  sin material devolvio contenido: {vacio!r}")

# ---- 5. determinismo: dos corridas, el mismo resultado
if _testimonios({"testimonials": BASECAMP}) != _testimonios({"testimonials": BASECAMP}):
    fallos.append("E-CITA-DETERMINISMO  dos corridas del mismo material dieron resultados distintos")

if fallos:
    print(f"TESTIMONIOS: {len(fallos)} FALLO(S)")
    for f in fallos:
        print("  " + f)
    sys.exit(1)
# El parentesis no es estetico: tools/gates-guard.mjs cuenta las compuertas en verde con /OK \(|OK:/,
# asi que una linea que cierra con raya —como las de RUBRO, ADN y ENCUADRE— pasa pero NO se cuenta.
# Una compuerta que no mueve el numero es una compuerta invisible: el dia que se caiga, el resumen
# seguira diciendo el mismo total de siempre y nadie va a notar que falta.
print(f"TESTIMONIOS OK ({len(BASECAMP)} citas con firma pegada separadas sin inventar · "
      f"{len(LINEAR_AUTORES)} firmas en elemento aparte que llegan enteras y sin duplicar · "
      f"{len(SIN_AUTOR)} citas sin autor publicadas sin firma · {len(CTAS)} CTAs rechazados · "
      f"vacio y determinismo).")
