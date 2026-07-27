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

# Y estas aparecen en CUALQUIER PARTE del encabezado, no solo al principio: "Sobre nosotros" y
# "Un poco sobre nosotros" son el mismo rotulo de seccion, y el ancla de arriba solo caza el
# primero. Aparecio probando una pagina que pone su hero abajo.
_SECCION = re.compile(
    r"(sobre nosotros|qui[eé]nes somos|nuestro equipo|nuestra historia|about us|our team|"
    r"our story|preguntas frecuentes|frequently asked)", re.I)

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


# Palabras sin contenido. No se usan para medir de que habla un encabezado: "for", "the", "de" y "la"
# aparecen en todo y no distinguen nada.
_VACIAS = set((
    "the a an and or of to for in on at with without from by into over under is are was be that this "
    "your our its it as not no you we they he she su sus de del la el los las un una unos unas y o u "
    "al con sin por para en que como mas pero desde hasta entre sobre tras es son fue ser mi tu se lo"
).split())


def _fichas(t):
    """Palabras con contenido, recortadas a cinco letras.

    El recorte es un lematizador de pobre y alcanza para lo unico que hace falta aca: que "build",
    "building" y "built" cuenten como la misma idea. Un lematizador de verdad seria una dependencia
    nueva para ganar dos casos.
    """
    palabras = re.findall(r"[A-Za-zÁÉÍÓÚÑáéíóúñ]{2,}", str(t or "").lower())
    return {w[:5] for w in palabras if w not in _VACIAS and len(w) > 2}


def _features(content, claim="", marca=""):
    """Los encabezados de una landing SON su lista de features. El problema es cuales.

    LO QUE ESTABA MAL, medido en vivo sobre tailwindcss.com: las cuatro frases que salian eran
    "Supported by the best.", "Built for the modern", "Browse properties" y "Redefining real-time".
    Las dos ultimas son titulos de PLANTILLAS de su galeria de ejemplos. No es invencion —estan
    literalmente en el DOM— pero en el video se leen como si fueran lo que el producto hace, y eso es
    igual de daniño: el espectador entiende que Tailwind vende propiedades inmobiliarias.

    La causa era tomar los encabezados EN ORDEN DE DOM y cortar en seis. Y el intento obvio de
    arreglarlo —pesar por el nivel del encabezado, h2 sobre h3— resulto INERTE: la captura devuelve
    `headings` como una lista plana de STRINGS, sin nivel. `_nivel_de` devolvia siempre el default.

    Lo que si separa a los buenos de los ajenos es el LEXICO. Los encabezados del producto comparten
    palabras con la descripcion que la marca escribio de si misma; los de una galeria no comparten
    ninguna. Medido sobre la captura de Tailwind, con la descripcion "utility-first CSS framework for
    rapidly building modern websites without ever leaving your HTML":

        "Rapidly build modern websites without ever leaving your HTML"  6 palabras en comun
        "Build whatever you want, without touching your CSS file"       3
        "Built for the modern web."                                     1
        "Browse properties"                                             0   <- galeria
        "Redefining real-time performance"                              0   <- galeria

    La posicion pesa, pero MUCHO MENOS que el lexico (un punto contra dos por palabra): hay landings
    que ponen su mejor titulo abajo, y castigarlas por eso seria cambiar un sesgo por otro.

    Y el orden de salida es el del DOCUMENTO, no el del puntaje: la lista de features de una landing
    tiene un orden que alguien penso, y reordenarla por afinidad lexica la desarma.
    """
    c = content or {}
    fichasClaim = _fichas(claim) | _fichas(c.get("description")) | _fichas(c.get("title"))
    # La navegacion aparece como encabezado en muchas landings ("Product", "Features", "Company").
    # La captura ya la trae aparte, asi que no hay que adivinarla: se descarta lo que este ahi.
    navegacion = {_limpio(x).lower() for x in (_lista(c.get("nav")) + _lista(c.get("ctas")))}
    # Un encabezado que NO DICE MAS QUE EL NOMBRE DE LA MARCA no es un feature: es el rotulo de una
    # seccion. Aparecio en cuanto empece a pesar por lexico, y era predecible — el nombre de la marca
    # esta en el titulo y en la descripcion, asi que "Tailwind CSS" y "Tailwind Plus" puntuaban altisimo
    # por decir exactamente lo que ya sabemos. Se descartan por SUSTRACCION: si al quitarle las palabras
    # de la marca no queda nada con contenido, no aporta nada.
    fichasMarca = _fichas(marca) | _fichas(c.get("siteName"))

    cands = []
    brutos = _lista(c.get("headings"))
    for i, h in enumerate(brutos):
        t = _texto_de(h)
        if not t:
            continue
        # Un feature es un titulo, no una oracion ni una palabra suelta.
        if len(t) < 6 or len(t) > 60 or _NO_FEATURE.search(t) or _SECCION.search(t):
            continue
        if t.lower() in navegacion:
            continue
        if not (_fichas(t) - fichasMarca):
            continue
        pos = 1.0 - (i / max(1, len(brutos) - 1))
        comun = len(_fichas(t) & fichasClaim)
        cands.append((comun * 2 + pos, comun, i, t))

    # EL PISO IMPORTA MAS QUE EL ORDEN. Ordenar por puntaje y cortar en seis no filtraba NADA cuando la
    # pagina daba ocho candidatos: entraban los seis mejores de ocho, o sea casi todos, y "Browse
    # properties" volvia a colarse en cuanto se liberaba un lugar. Lo que hay que decidir no es cual es
    # mejor sino QUE ENTRA, y para eso hace falta un umbral.
    #
    # El umbral es: al menos UNA palabra con contenido en comun con lo que la marca dice de si misma.
    # Cuesta perder algun titulo legitimo — "Ship faster and smaller." es copy real de Tailwind y se

    # cae— y ese costo es el correcto: la regla del repo es que un slot vacio es una escena que el
    # guionista no elige, y eso es mucho mas barato que una frase que dice algo falso sobre la marca.
    #
    # La excepcion es la pagina que no dio descripcion ni titulo utiles: ahi el lexico no puede medir
    # nada y filtrar por el dejaria la lista vacia. Con menos de tres sobrevivientes se vuelve al orden
    # de documento, que es el comportamiento de antes.
    # DOS y no tres. Probado con una pagina que pone su hero abajo ("Sobre nosotros", "Equipo",
    # "Novedades", "Gestion de turnos para clinicas", "Historia clinica digital"): con el umbral en
    # tres, los dos titulos buenos no alcanzaban el minimo, se caia al respaldo y entraban los tres
    # rotulos de seccion. Con dos, salen exactamente los dos que hablan del producto. Dos frases
    # ciertas valen mas que cinco de las cuales tres son ruido — y el guionista ya sabe componer con
    # menos material.
    conLexico = [c for c in cands if c[1] >= 1]
    usables = conLexico if len(conLexico) >= 2 else cands
    usables = sorted(usables, key=lambda x: -x[0])
    elegidos, vistos = [], set()
    for _, _comun, i, t in usables:
        if t.lower() in vistos:
            continue
        vistos.add(t.lower())
        elegidos.append((i, t))
        if len(elegidos) >= 6:
            break
    elegidos.sort()
    return [{"titulo": t[:28], "detalle": ""} for _, t in elegidos]


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

    features = _features(c, que_hace, marca_de(c, url))
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
