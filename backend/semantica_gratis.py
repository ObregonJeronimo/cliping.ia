"""SEMANTICA GRATIS — sacar lo que la pagina DICE del DOM, sin pagar un LLM.

EL AGUJERO QUE TAPA, Y ES GRANDE
El pagemodel tiene un bloque `semantica` (que hace, features, cifras, CTA) que hasta ahora lo llenaba
un LLM a traves del brief. Sin brief, `build_pagemodel` devuelve todos los campos VACIOS y no falla:
devuelve un modelo perfectamente valido que no dice nada. La primera corrida del camino completo
URL -> video lo mostro de golpe — Linear en vivo salio con CERO frases, CERO cifras, sin CTA y con la
marca puesta en "LINEAR.APP", mientras su fixture del repo (que si paso por el LLM) tiene seis
features y un claim. El motor entero andaba y el video salia mudo.

Y sobre todo: un LLM por video rompe la restriccion de costo del proyecto. Un reel a $0 no puede
depender de una llamada paga para saber que dice la pagina.

LO QUE ESTE ARCHIVO PUEDE Y LO QUE NO
No entiende la pagina: la LEE. La description de un <meta> la escribio el equipo de marketing de la
marca para que la lea Google, asi que es el mejor resumen de una linea que existe y es gratis. Los
<h2> de una landing SON su lista de features, porque asi se disenan las landings. El boton mas
prominente ES el CTA. Nada de eso necesita un modelo.

Lo que NO puede: reescribir, resumir de verdad, traducir, ni decidir el rubro por matices. Cuando el
LLM esta disponible sigue siendo mejor. Esto es el piso, no el techo — y un piso que dice cosas
CIERTAS es infinitamente mejor que un video mudo.

REGLA ANTI-INVENCION, otra vez y en el punto mas peligroso del repo
Todo lo que sale de aca es TEXTO LITERAL DE LA PAGINA, recortado. No se completa una lista para que
una escena tenga cinco tarjetas, no se redondea una cifra, no se escribe un CTA donde no habia boton.
Las cifras piden ademas que el numero Y su etiqueta esten pegados en la misma linea del DOM: un "99"
suelto en un lado y un "clientes" en otro no forman "99 clientes" — eso ya seria una afirmacion
armada por el motor sobre el negocio de otro.
"""
import re

# Encabezados que NO son features: navegacion, legales, formularios. Aparecen como <h2> en casi toda
# landing y se colarian como si fueran lo que el producto hace.
_NO_FEATURE = re.compile(
    r"^(menu|men[uú]|nav|inicio|home|contacto|contact|about|nosotros|blog|news|noticias|faq|"
    r"preguntas|legal|privacidad|privacy|terms|t[eé]rminos|cookies|newsletter|suscr[ií]b|"
    r"subscribe|follow|s[ií]guenos|compartir|share|login|iniciar sesi[oó]n|sign in|sign up|"
    r"buscar|search|carrito|cart|checkout|footer|copyright|todos los derechos)\b", re.I)

# Un CTA de verdad es corto e imperativo. "Leer mas sobre nuestra politica de privacidad" no lo es.
_CTA_BUENO = re.compile(
    r"^(empez|comenz|prob|solicit|pedi|ped[ií]|compr|reserv|agend|contrat|descarg|registr|cre[aá]|"
    r"suscrib|obten|consegu|habl|escrib|llam|ver |conoc|descubr|start|get |try |book|buy|shop|"
    r"request|sign |join|download|learn|explore|discover|contact|schedule|demo)", re.I)

# Una cifra que la pagina PRESENTA como dato: lleva unidad o magnitud. Un "2024" suelto no es una
# prueba, es un anio; un "3" tampoco. Se exige % , x, +, K/M/B o mil/millones.
_CIFRA = re.compile(
    r"(?<![\w.])((?:\+\s?)?\d{1,3}(?:[.,]\d{1,3})*\s?(?:%|x\b|k\b|K\b|M\b|MM\b|B\b|mil(?:lones)?\b))"
    r"[\s:·—–-]*([A-Za-zÁÉÍÓÚÑáéíóúñ][\w\sÁÉÍÓÚÑáéíóúñ/-]{2,26})?")


def _limpio(t, n=200):
    return re.sub(r"\s+", " ", str(t or "")).strip()[:n]


def _lista(v):
    return v if isinstance(v, list) else []


def _texto_de(h):
    """Un encabezado puede venir como string o como {texto/text/t, nivel/level}."""
    if isinstance(h, str):
        return _limpio(h)
    if isinstance(h, dict):
        for k in ("texto", "text", "t", "titulo", "title", "value"):
            if h.get(k):
                return _limpio(h[k])
    return ""


def _nivel_de(h):
    if isinstance(h, dict):
        for k in ("nivel", "level", "tag", "n"):
            v = h.get(k)
            if isinstance(v, int):
                return v
            if isinstance(v, str) and v.lower().startswith("h") and v[1:2].isdigit():
                return int(v[1])
    return 2


def marca_de(content, url=""):
    """El nombre de la marca. El dominio es el ULTIMO recurso, no el primero.

    `build_pagemodel` sin brief caia al dominio y ponia "LINEAR.APP" como nombre de la marca en el
    cuadro mas grande de la pieza — con el punto y el TLD adentro. og:site_name existe justamente
    para esto y lo declara la propia marca.
    """
    c = content or {}
    site = _limpio(c.get("siteName"), 40)
    if site:
        return site
    # El <title> casi siempre es "Marca — promesa" o "Promesa | Marca". Se parte por el separador y se
    # elige el lado CORTO: un nombre de marca rara vez pasa de tres palabras y una promesa siempre las
    # pasa.
    t = _limpio(c.get("title"), 120)
    partes = [p.strip() for p in re.split(r"\s[|·—–\-:]\s", t) if p.strip()]
    if len(partes) >= 2:
        corto = min(partes, key=len)
        if len(corto.split()) <= 3:
            return corto[:40]
    if partes and len(partes[0].split()) <= 3:
        return partes[0][:40]
    host = re.sub(r"^www\.", "", (url or "").split("//")[-1].split("/")[0])
    return host.split(".")[0].capitalize() if host else ""


def _features(content):
    """Los <h2>/<h3> de una landing SON su lista de features: asi se disenan las landings."""
    out, vistos = [], set()
    for h in _lista((content or {}).get("headings")):
        t = _texto_de(h)
        n = _nivel_de(h)
        if not t or n < 2 or n > 3:
            continue
        # Un feature es un titulo, no una oracion ni una palabra suelta.
        if len(t) < 6 or len(t) > 60 or _NO_FEATURE.search(t):
            continue
        clave = t.lower()
        if clave in vistos:
            continue
        vistos.add(clave)
        out.append({"titulo": t[:28], "detalle": ""})
        if len(out) >= 6:
            break
    return out


def _cta(content):
    cands = []
    for c in _lista((content or {}).get("ctas")):
        t = _texto_de(c) if not isinstance(c, str) else _limpio(c)
        if t and 2 <= len(t) <= 28 and _CTA_BUENO.search(t):
            cands.append(t)
    # El primero en el DOM: en una landing, el boton de arriba de todo es el principal.
    return cands[0] if cands else ""


def _stats(content):
    """Cifras que la pagina presenta COMO cifras, con su etiqueta pegada.

    Se leen de los encabezados y no del bodyText entero: en el cuerpo, un "20%" de una nota al pie de
    precios y un "clientes" tres parrafos mas abajo se juntarian en una estadistica que nadie escribio.
    """
    out, vistos = [], set()
    fuentes = [_texto_de(h) for h in _lista((content or {}).get("headings"))]
    fuentes += [_limpio(p, 120) for p in _lista((content or {}).get("paragraphs"))[:20]]
    for linea in fuentes:
        for valor, etiqueta in _CIFRA.findall(linea or ""):
            v = _limpio(valor, 10)
            e = _limpio(etiqueta, 26)
            if not v or not e or len(e) < 3:
                continue
            if v in vistos:
                continue
            vistos.add(v)
            out.append({"valor": v, "etiqueta": e})
            if len(out) >= 4:
                return out
    return out


def brief_de(site, url=""):
    """site (lo que devuelve capture_all) -> un brief con el bloque `semantica` que espera pagemodel.

    Se devuelve un BRIEF y no un pagemodel para entrar por la misma puerta que el LLM: asi
    `_norm_semantica` sigue siendo el unico lugar donde se decide la forma final, y la regla
    anti-invencion se aplica una sola vez para los dos caminos.
    """
    c = (site or {}).get("content") or {}
    # La description de un <meta> la escribio el equipo de la marca para que la lea un buscador: es el
    # mejor resumen de una linea que existe, y es gratis. Si no hay, el <h1> es lo siguiente.
    que_hace = _limpio(c.get("description"), 220)
    if not que_hace:
        for h in _lista(c.get("headings")):
            if _nivel_de(h) == 1 and _texto_de(h):
                que_hace = _texto_de(h)[:220]
                break
    if not que_hace:
        que_hace = _limpio(c.get("title"), 220)

    features = _features(c)
    return {
        "brand": marca_de(c, url),
        "semantica": {
            "queHace": que_hace,
            # `comoFunciona` son pasos y una landing rara vez los marca de forma reconocible sin un
            # modelo que los interprete. Vacio es correcto: deja la escena sin elegir en vez de
            # llenarla con encabezados que no son pasos.
            "comoFunciona": [],
            "features": features,
            "pruebas": {"stats": _stats(c), "testimonios": [], "logosClientes": False},
            "cta": _cta(c),
            "idioma": (_limpio(c.get("lang"), 5) or "es")[:2],
        },
        "content": {
            "bullets": [f["titulo"] for f in features],
            "stats": _stats(c),
        },
    }
