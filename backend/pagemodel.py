# pagemodel.v1 — ENSAMBLADOR. Junta las tres fuentes en el UNICO JSON que consume el motor Director:
#   · site['dna']        -> mediciones CRUDAS del DOM (Playwright, determinista, $0)   [site_capture]
#   · brief['semantica'] -> el plano semantico (LLM)                                    [perception]
#   · site/brief         -> assets (logo / imagenes / ogImage) + estado de la captura
#
# ESPEJO OBLIGATORIO de src/director/core/schema.js::normalizePageModel: mismos defaults, mismos enums
# cerrados, mismos clamps. Si divergen, el motor "repara" lo que aca escribimos y el mismo pagemodel
# rinde distinto en Python y en JS -> se pierde la reproducibilidad, que es la razon de ser del motor.
#
# NORMATIVA: docs/director/DNA-SPEC.md — §1 schema y defaults, §1.5 formula de confianza, §3 normalizacion
# y sanidad, §5 los 5 casos adversariales. Cuando el plan (docs/MOTOR-DIRECTOR.md §2) y la DNA-SPEC
# discrepan, manda la DNA-SPEC (§1.8).
#
# INVARIANTE DURO: este modulo NUNCA lanza. Cualquier senal rota degrada a default, deja rastro en
# `captura.notas` y baja `captura.confianza`. Una pagina vacia/botwall/404 produce un pagemodel VALIDO.
# INVARIANTE DURO 2: nada de random ni de reloj propio. El `ts` lo pone la captura (que si sabe cuando
# midio); si no viene, queda vacio. Un timestamp inventado aca haria que dos ensamblados del MISMO
# site+brief dieran JSONs distintos y los fixtures cambiarian en cada corrida.
import math
import re
import unicodedata
from urllib.parse import urlparse

PM_V = 1
VIEWPORT = [1280, 900]

# ---------------------------------------------------------------- enums CERRADOS (§1) — agregar valor = bump de PM_V
ESTADO = ("ok", "botwall", "spa-vacia", "404", "timeout", "bloqueada")
DISPLAY_HINT = ("serif", "grotesk", "rounded", "mono", "condensed")
CASE_HINT = ("upper", "title", "sentence")
SCRIPT = ("latin", "cyrillic", "greek", "cjk", "arabic", "hebrew", "devanagari", "otro")
TEXT_DIR = ("ltr", "rtl")
BORDER_STYLE = ("none", "hairline", "bold")
SHADOW_STYLE = ("flat", "soft", "hard")
DENSITY = ("aireado", "medio", "denso")
MODERNIDAD = ("bento", "glass", "bigtype", "editorial-photo", "gradient-mesh", "brutalist")
TIPO_NEGOCIO = ("saas", "ecommerce", "servicio-local", "educacion", "media", "portfolio", "app", "evento", "otro")
MODELO_USO = ("suscripcion", "compra", "reserva", "registro", "descarga", "contacto", "desconocido")
REGISTER = ("formal", "casual", "warm")
AWARENESS = ("unaware", "problem", "solution", "product", "most")
IMG_KIND = ("producto", "persona", "ambiente", "ui", "desconocido")

# defaults del schema (§1.2/§1.3) — una sola tabla, citada desde los dos lenguajes
DEF_ACCENT = "#5b8cff"          # el mismo default que brief.brandColor en src/kinetic/core/dna.js
DEF_BG = "#ffffff"
DEF_INK = "#111114"
DEF_INK_DARK = "#f4f1ea"        # tinta para fondos oscuros (bgLum <= 0.18)
DEF_INK_SANE = "#0b0b0e"        # tinta saneada por contraste sobre fondo claro (§3.3)
DEF_VOZ = ["claro", "directo", "actual"]
PIVOTE_LUM = 0.18               # §2.3: punto donde tinta clara y oscura contrastan IGUAL. NO es 0.5.
CHROMA_ACROMATICA = 0.12        # §3.2
MIN_CONTRASTE = 4.5             # §3.3

# los estados donde el `dna` medido se DESCARTA entero (§5.2 / §5.5 / §5.6): medir el diseno de
# Cloudflare o el 404 del hosting y estamparselo a la marca es PEOR que no medir nada.
_DNA_DESCARTADO = ("botwall", "404", "timeout", "bloqueada")
_TOPE_CONFIANZA = {"botwall": 0.15, "404": 0.10, "spa-vacia": 0.30, "timeout": 0.0, "bloqueada": 0.0}

_BOTWALL_RE = re.compile(
    r"just a moment|checking your browser|verify (you are )?human|attention required|"
    r"access denied|enable javascript|ddos protection|cf-browser-verification", re.I)
_404_RE = re.compile(r"\b404\b|not found|p[áa]gina no encontrada|no existe|error 5\d\d|oops", re.I)


# ---------------------------------------------------------------- helpers puros (tipos, rangos, texto)
def _s(v, n=None):
    """String limpio (colapsa espacios) y opcionalmente capado a n chars sin cortar a mitad de palabra."""
    if v is None:
        return ""
    t = re.sub(r"\s+", " ", str(v)).strip()
    if n is None or len(t) <= n:
        return t
    cut = t[:n]
    sp = cut.rfind(" ")
    return (cut[:sp] if sp >= n * 0.6 else cut).strip()


def _f(v, default, lo, hi, dec=2):
    try:
        x = float(v)
    except (TypeError, ValueError):
        return default
    if not math.isfinite(x):
        return default
    return round(min(hi, max(lo, x)), dec)


def _i(v, default, lo, hi):
    try:
        x = int(round(float(v)))
    except (TypeError, ValueError):
        return default
    return min(hi, max(lo, x))


def _enum(v, valores, default):
    return v if v in valores else default


def _dict(v):
    return v if isinstance(v, dict) else {}


def _list(v):
    return v if isinstance(v, list) else []


# ---------------------------------------------------------------- color (mismas formulas que core/util.js)
_HEX_RE = re.compile(r"^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")


def _hex(v, default=None):
    """Normaliza a #rrggbb minuscula. #abc -> #aabbcc. Lo que no matchee cae al default (§3.1)."""
    if not isinstance(v, str):
        return default
    m = _HEX_RE.match(v.strip())
    if not m:
        return default
    h = m.group(1).lower()
    if len(h) == 3:
        h = h[0] * 2 + h[1] * 2 + h[2] * 2
    return "#" + h


def _rgb(h):
    h = h.lstrip("#")
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def _rellum(h):
    """Luminancia relativa WCAG (misma formula que backend/brand_dna.py::_rellum y core/util.js)."""
    def chan(c):
        c /= 255.0
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = _rgb(h)
    return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b)


def _contrast(a, b):
    la, lb = _rellum(a), _rellum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def _chroma(h):
    """Chroma de §2.2: (max-min)/255. NO es la chroma OKLCH de core/util.js — los umbrales de la
    DNA-SPEC (0.12 acromatica, 0.18 gate de acento, 0.55 brutalist) estan calibrados con ESTA."""
    r, g, b = _rgb(h)
    return (max(r, g, b) - min(r, g, b)) / 255.0


def _lum01(h):
    r, g, b = _rgb(h)
    return (max(r, g, b) + min(r, g, b)) / 510.0


def _hex_to_hsl(h):
    r, g, b = (c / 255.0 for c in _rgb(h))
    mx, mn = max(r, g, b), min(r, g, b)
    l = (mx + mn) / 2
    d = mx - mn
    if d < 1e-9:
        return 0.0, 0.0, l
    s = d / (2 - mx - mn) if l > 0.5 else d / (mx + mn)
    if mx == r:
        hu = ((g - b) / d) % 6
    elif mx == g:
        hu = (b - r) / d + 2
    else:
        hu = (r - g) / d + 4
    return (hu * 60) % 360, s, l


def _hsl_to_hex(h, s, l):
    h = h % 360
    c = (1 - abs(2 * l - 1)) * s
    x = c * (1 - abs((h / 60) % 2 - 1))
    m = l - c / 2
    rgb = [(c, x, 0), (x, c, 0), (0, c, x), (0, x, c), (x, 0, c), (c, 0, x)][int(h // 60) % 6]
    return "#" + "".join("%02x" % max(0, min(255, round((v + m) * 255))) for v in rgb)


def _hue_dist(a, b):
    d = abs(a - b) % 360
    return 360 - d if d > 180 else d


# ---------------------------------------------------------------- DNA por defecto (§1.2 / §1.7)
def _dna_default():
    return {
        "palette": {"accent": DEF_ACCENT, "accent2": None, "bg": DEF_BG, "inkOnBg": DEF_INK,
                    "accentText": DEF_ACCENT, "acromatica": False, "bgLum": 1.0},
        "typography": {"displayHint": "grotesk", "bodyHint": "grotesk", "caseHint": "sentence",
                       "script": "latin", "textDir": "ltr", "h1Ratio": 0.0, "widthRatio": 0.66},
        "shape": {"radius": 12, "radiusRatio": 0.06, "pill": False, "borderStyle": "none",
                  "borderWidth": 0.0, "shadowStyle": "flat"},
        "density": {"nivel": "medio", "score": 0.35, "fill": 0.0, "nodos": 0},
        "mood": {"calidez": 0.50, "formalidad": 0.50, "energia": 0.45},
        "modernidad": [], "modernidadScores": {},
        "signals": {"muestras": {"botones": 0, "cards": 0, "texto": 0, "imagenes": 0},
                    "accentScore": 0.0, "chromaMax": 0.0, "blurBackdrop": 0, "gridCards": 0,
                    "areaImgVsTexto": 0.0, "gradStops": 0, "contrasteBgInk": 21.0},
    }


def _norm_signals(raw):
    """Bloque crudo (§1.2). El motor NUNCA lo consume: existe para que director-loop y los gates puedan
    explicar POR QUE salio tal DNA y para re-derivar campos sin volver a capturar."""
    s = _dict(raw)
    m = _dict(s.get("muestras"))
    return {
        "muestras": {"botones": _i(m.get("botones"), 0, 0, 60), "cards": _i(m.get("cards"), 0, 0, 80),
                     "texto": _i(m.get("texto"), 0, 0, 300), "imagenes": _i(m.get("imagenes"), 0, 0, 40)},
        "accentScore": _f(s.get("accentScore"), 0.0, 0, 1e6, 3),
        "chromaMax": _f(s.get("chromaMax"), 0.0, 0, 1, 3),
        "blurBackdrop": _i(s.get("blurBackdrop"), 0, 0, 200),
        "gridCards": _i(s.get("gridCards"), 0, 0, 200),
        "areaImgVsTexto": _f(s.get("areaImgVsTexto"), 0.0, 0, 1e4, 3),
        "gradStops": _i(s.get("gradStops"), 0, 0, 64),
        "contrasteBgInk": _f(s.get("contrasteBgInk"), 21.0, 1, 21, 2),
    }


def _norm_palette(raw, signals, notas, errores, medido=True, marca=None):
    """§3.1 formato -> §3.2 acromatismo -> §3.3 contraste -> §3.4 accent2. El ORDEN importa: la
    sanidad de contraste asume que ya se decidio si la marca tiene color.
    `medido=False` = el dna se cayo a defaults (§2.6 formula-vs-default): con chromaMax = 0 porque no
    se midio nada, declarar `acromatica` seria afirmar "esta marca no tiene color" cuando lo correcto
    es "no se". Por eso §1.7 (pagina vacia) trae chromaMax 0 y acromatica FALSE."""
    p = _dict(raw)
    bg = _hex(p.get("bg"), DEF_BG)
    if _hex(p.get("bg")) is None and p.get("bg") is not None:
        errores.append("E-SCHEMA-COLOR:dna.palette.bg")
    bg_lum = _rellum(bg)
    accent = _hex(p.get("accent"), DEF_ACCENT)

    # §3.5: el "acento" que en realidad era el fondo (o la tinta) no es acento -> siguiente candidato
    # del ranking que trae la medicion; si no hay ranking, default. Se descarta ANTES de decidir tinta.
    ranking = [h for h in (_hex(x) for x in _list(p.get("accentRanking"))) if h]
    ink_raw = _hex(p.get("inkOnBg"))
    # `marca` = brief.brandColor, el color que el LLM leyo de la pagina. Va DESPUES de lo medido (una
    # medicion real le gana a una lectura) y ANTES del default. Sin este eslabon, toda pagina cuyo
    # acento medido resultara ser el fondo o la tinta caia al azul por defecto: medido sobre paginas
    # REALES, Linear (#5e6ad2) y Tailwind (#38bdf8) salian las dos con el MISMO #5b8cff aunque el brief
    # traia el color correcto. O sea: todo video de pagina real era del mismo azul.
    marca_hex = _hex(marca) if marca else None
    cands = [accent] + ranking + ([marca_hex] if marca_hex and _chroma(marca_hex) >= 0.12 else []) + [DEF_ACCENT]
    for cand in cands:
        if _contrast(cand, bg) >= 1.15 and (ink_raw is None or cand != ink_raw):
            accent = cand
            break
    else:
        accent = DEF_ACCENT
    if accent != _hex(p.get("accent"), DEF_ACCENT):
        notas.append("accent del brandColor del brief" if marca_hex and accent == marca_hex
                     else "accent descartado: era el fondo o la tinta")

    ink = ink_raw if ink_raw else (DEF_INK if bg_lum > PIVOTE_LUM else DEF_INK_DARK)

    # §3.2 acromatismo: SOLO chromaMax (se mide antes de todo descarte). Es la unica senal honesta de
    # "en esta pagina no hay color"; testear chroma(accent) fallaba cuando accent caia al default azul.
    acromatica = bool(medido and signals["chromaMax"] < CHROMA_ACROMATICA)

    # §3.3 contraste minimo del texto sobre el fondo
    if _contrast(ink, bg) < MIN_CONTRASTE:
        ink = DEF_INK_SANE if bg_lum > PIVOTE_LUM else DEF_INK_DARK
        notas.append("ink saneado por contraste")
        if _contrast(ink, bg) < MIN_CONTRASTE:
            errores.append("E-SCHEMA-CONTRAST:dna.palette.inkOnBg")

    # accentText: variante del acento LEGIBLE sobre bg. Baja (o sube) la luminosidad dejando la
    # saturacion INTACTA — bajar s junto con l da el "acento lavado", el bug historico que esto evita.
    accent_text = accent
    if _contrast(accent_text, bg) < MIN_CONTRASTE:
        h, s, l = _hex_to_hsl(accent_text)
        for _ in range(20):
            nl = min(0.96, max(0.04, l + (-0.04 if bg_lum > PIVOTE_LUM else 0.04)))
            if abs(nl - l) < 1e-9:
                break                                   # no converge: no gires 20 veces por nada
            l = nl
            accent_text = _hsl_to_hex(h, min(1.0, max(0.0, s)), l)
            if _contrast(accent_text, bg) >= MIN_CONTRASTE:
                break
        if _contrast(accent_text, bg) < MIN_CONTRASTE:
            accent_text = ink                            # ultima red: la tinta YA esta saneada

    # accent2: solo el 2.o del ranking con salto REAL de hue. Mismo hue con otra luminosidad no es un
    # segundo color de marca, es una sombra. Acromatica -> null (inventar color delata la fabrica).
    accent2 = _hex(p.get("accent2"))
    if accent2 and (acromatica or _hue_dist(_hex_to_hsl(accent2)[0], _hex_to_hsl(accent)[0]) < 25):
        accent2 = None
    return {"accent": accent, "accent2": accent2, "bg": bg, "inkOnBg": ink, "accentText": accent_text,
            "acromatica": acromatica, "bgLum": round(bg_lum, 3)}


def _norm_typography(raw, notas):
    t = _dict(raw)
    script = _enum(t.get("script"), SCRIPT, "latin")
    display = _enum(t.get("displayHint"), DISPLAY_HINT, "grotesk")
    case = _enum(t.get("caseHint"), CASE_HINT, "sentence")
    text_dir = _enum(t.get("textDir"), TEXT_DIR, "ltr")
    if script != "latin":
        # §5.3: mayusculas y Title Case no existen en CJK/arabe/hebreo -> aplicarlas rompe el texto.
        case = "sentence"
        if script in ("cjk", "arabic", "hebrew", "devanagari"):
            display = "grotesk"                          # la cascada serif/rounded esta calibrada para latinas
        if script in ("arabic", "hebrew"):
            text_dir = "rtl"
        notas.append("script no latino: verificar glifos")
    # h1Ratio y radiusRatio van a 3 decimales a proposito: con los 2 de §3.1, 0.045 (bigtype entra solo)
    # y 0.04 (no entra) colapsan al mismo numero y director-loop no puede re-derivar el detector.
    return {"displayHint": display, "bodyHint": _enum(t.get("bodyHint"), DISPLAY_HINT, "grotesk"),
            "caseHint": case, "script": script, "textDir": text_dir,
            "h1Ratio": _f(t.get("h1Ratio"), 0.0, 0, 0.5, 3), "widthRatio": _f(t.get("widthRatio"), 0.66, 0.35, 0.95, 3)}


def _norm_shape(raw, notas):
    s = _dict(raw)
    pill = bool(s.get("pill"))
    radius = s.get("radius")
    try:
        if radius is not None and float(radius) > 64:    # §3.5: eso no es un radio, es una pastilla mal medida
            pill, radius = True, 32
            notas.append("radius absurdo: pastilla")
    except (TypeError, ValueError):
        radius = None
    return {"radius": _i(radius, 12, 0, 32), "radiusRatio": _f(s.get("radiusRatio"), 0.06, 0, 0.5, 3),
            "pill": pill, "borderStyle": _enum(s.get("borderStyle"), BORDER_STYLE, "none"),
            "borderWidth": _f(s.get("borderWidth"), 0.0, 0, 12), "shadowStyle": _enum(s.get("shadowStyle"), SHADOW_STYLE, "flat")}


def _norm_density(raw):
    """`nivel` SIEMPRE se deriva de `score` (no se copia): si llegaran incoherentes, el motor leeria
    una cosa en el continuo y otra en el enum. El continuo es el que manda (§1.8)."""
    d = _dict(raw)
    fill = _f(d.get("fill"), 0.0, 0, 1)                  # §3.5: fill > 1 es bug de la rejilla -> clamp
    nodos = _i(d.get("nodos"), 0, 0, 400)
    score = _f(d.get("score"), 0.35, 0, 1)
    nivel = "aireado" if score < 0.30 else ("medio" if score <= 0.52 else "denso")
    return {"nivel": nivel, "score": score, "fill": fill, "nodos": nodos}


def _norm_modernidad(raw_list, raw_scores):
    """Orden por score desc, cap 3 (mas de 3 es ruido: ninguna direccion de arte honra 4 lenguajes) y
    exclusion de antagonicos: brutalist y glass no pueden convivir."""
    scores = {k: _f(v, 0.0, 0, 1) for k, v in _dict(raw_scores).items() if k in MODERNIDAD}
    keys = [m for m in _list(raw_list) if m in MODERNIDAD]
    for k in keys:
        scores.setdefault(k, 0.5)
    orden = sorted(set(keys), key=lambda k: (-scores.get(k, 0.0), MODERNIDAD.index(k)))
    if "brutalist" in orden and "glass" in orden:
        perdedor = "glass" if scores.get("brutalist", 0) >= scores.get("glass", 0) else "brutalist"
        orden.remove(perdedor)
    orden = orden[:3]
    return orden, {k: scores[k] for k in orden if k in scores}


def _norm_dna(raw, notas, errores, marca=None):
    """Normaliza el bloque MEDIDO. `raw` es lo que devuelve extract_dna() (crudo, sin normalizar)."""
    d = _dict(raw)
    signals = _norm_signals(d.get("signals"))
    palette = _norm_palette(d.get("palette"), signals, notas, errores, marca=marca)
    modernidad, mscores = _norm_modernidad(d.get("modernidad"), d.get("modernidadScores"))
    mood_raw = _dict(d.get("mood"))
    mood = {"calidez": _f(mood_raw.get("calidez"), 0.50, 0, 1),
            "formalidad": _f(mood_raw.get("formalidad"), 0.50, 0, 1),
            "energia": _f(mood_raw.get("energia"), 0.45, 0, 1)}
    if palette["acromatica"]:
        # §3.2: una marca acromatica rara vez es energica, y casi siempre es mas formal.
        mood["energia"] = _f(mood["energia"] - 0.10, 0.45, 0, 1)
        mood["formalidad"] = _f(mood["formalidad"] + 0.10, 0.50, 0, 1)
    signals["contrasteBgInk"] = _f(_contrast(palette["inkOnBg"], palette["bg"]), 21.0, 1, 21)
    return {"palette": palette, "typography": _norm_typography(d.get("typography"), notas),
            "shape": _norm_shape(d.get("shape"), notas), "density": _norm_density(d.get("density")),
            "mood": mood, "modernidad": modernidad, "modernidadScores": mscores, "signals": signals}


def _derivar_accent2(dna):
    """§3.4 — solo cuando la direccion de arte lo PIDE (mesh/glass necesitan un segundo color si o si).
    Determinista, sin seed. Acromatica -> se queda en null y las escenas usan inkOnBg a alfa reducido."""
    p = dna["palette"]
    if p["accent2"] or p["acromatica"]:
        return
    if "gradient-mesh" not in dna["modernidad"] and "glass" not in dna["modernidad"]:
        return
    h, s, l = _hex_to_hsl(p["accent"])
    dh = 150 if "gradient-mesh" in dna["modernidad"] else 32   # mesh necesita salto real de hue; glass acompana
    p["accent2"] = _hsl_to_hex((h + dh) % 360, min(0.95, max(0.25, s * 0.92)), min(0.72, max(0.30, l + 0.06)))


# ---------------------------------------------------------------- semantica (§1.3)
_RUBRO_NEGOCIO = {"tech": "saas", "educacion": "educacion", "gastronomia": "servicio-local",
                  "salud": "servicio-local", "belleza": "ecommerce", "moda": "ecommerce",
                  "fitness": "servicio-local", "inmobiliaria": "servicio-local", "eventos": "evento",
                  "finanzas": "app"}
_RUBRO_USO = {"tech": "suscripcion", "educacion": "registro", "gastronomia": "reserva",
              "salud": "reserva", "belleza": "compra", "moda": "compra", "fitness": "suscripcion",
              "inmobiliaria": "contacto", "eventos": "compra", "finanzas": "registro"}


def _norm_semantica(sem_raw, brief, content):
    """REGLA HISTORICA INNEGOCIABLE: si la senal no esta en la pagina, el campo queda VACIO. Jamas
    fabricar stats, testimonios, precios ni promos — un array vacio desactiva su escena, que es
    informacion; un campo inventado es una mentira sobre la marca del cliente (§1.3, §6)."""
    s = _dict(sem_raw)
    c = _dict(brief.get("content")) or brief             # el brief legacy aplana content en la raiz
    aud_raw = _dict(s.get("audiencia")) or _dict(brief.get("audience"))

    features = []
    for f in _list(s.get("features"))[:6]:
        if isinstance(f, str):
            features.append({"titulo": _s(f, 28), "detalle": ""})
        elif isinstance(f, dict):
            features.append({"titulo": _s(f.get("titulo"), 28), "detalle": _s(f.get("detalle"), 90)})
    if not features:                                      # fallback al brief legacy (bullets)
        features = [{"titulo": _s(b, 28), "detalle": ""} for b in _list(c.get("bullets"))[:6] if _s(b)]
    features = [f for f in features if f["titulo"]]

    pr = _dict(s.get("pruebas"))
    stats = []
    for x in (_list(pr.get("stats")) or _list(c.get("stats")))[:4]:
        x = _dict(x)
        valor = _s(x.get("valor") or x.get("value"), 10)
        if valor:
            stats.append({"valor": valor, "etiqueta": _s(x.get("etiqueta") or x.get("label"), 26)})
    testis = []
    for x in _list(pr.get("testimonios"))[:3]:
        if isinstance(x, str):
            x = {"texto": x}
        x = _dict(x)
        if _s(x.get("texto")):
            testis.append({"texto": _s(x.get("texto"), 140), "firma": _s(x.get("firma") or x.get("autor"), 28)})
    if not testis and _s(c.get("proof")):
        testis = [{"texto": _s(c.get("proof"), 140), "firma": ""}]

    of = _dict(s.get("oferta"))
    voz = [_s(v, 14) for v in _list(s.get("vozDeMarca")) if _s(v)][:3]
    idioma = _s(s.get("idioma") or _dict(content).get("lang"), 5).lower()[:2]
    return {
        "queHace": _s(s.get("queHace") or c.get("claim") or c.get("tagline"), 140),
        "comoFunciona": [_s(p, 48) for p in _list(s.get("comoFunciona"))[:5] if _s(p)],
        "tipoNegocio": _enum(s.get("tipoNegocio"), TIPO_NEGOCIO, _RUBRO_NEGOCIO.get(brief.get("rubro"), "otro")),
        "modeloUso": _enum(s.get("modeloUso"), MODELO_USO, _RUBRO_USO.get(brief.get("rubro"), "desconocido")),
        "features": features,
        "pruebas": {"stats": stats, "testimonios": testis, "logosClientes": bool(pr.get("logosClientes"))},
        "oferta": {"precio": _s(of.get("precio"), 16), "promo": _s(of.get("promo"), 40), "urgencia": _s(of.get("urgencia"), 40)},
        "audiencia": {"who": _s(aud_raw.get("who"), 60),
                      "register": _enum(aud_raw.get("register"), REGISTER, "casual"),
                      "awareness": _enum(aud_raw.get("awareness"), AWARENESS, "problem")},
        "vozDeMarca": voz if len(voz) == 3 else list(DEF_VOZ),
        "idioma": idioma if len(idioma) == 2 else "es",
        # el CTA no esta en la tabla §1.3 pero el composer lo necesita y el brief legacy siempre lo trae:
        # aditivo, nunca inventado (vacio = el composer usa su copy generico).
        "cta": _s(s.get("cta") or c.get("cta"), 22),
    }


# ---------------------------------------------------------------- assets (§1.4)
def _norm_assets(site, brief, content):
    imgs, vistas = [], set()
    crudas = _list(site.get("images")) or _list(brief.get("images"))
    n = len(crudas)
    for i, im in enumerate(crudas[:18]):
        if isinstance(im, str):
            url, kind, ar, rank = im, "desconocido", None, None
        elif isinstance(im, dict):
            url = im.get("url") or im.get("u") or im.get("src") or ""
            kind, ar, rank = im.get("kind"), im.get("ar"), im.get("rank")
        else:
            continue
        url = _s(url)
        # el schema prohibe data: y .svg (§1.4): un data-uri no viaja al render y un svg no es una foto
        if not url or url.startswith("data:") or url.lower().split("?")[0].endswith(".svg") or url in vistas:
            continue
        vistas.add(url)
        imgs.append({"url": url, "kind": _enum(kind, IMG_KIND, "desconocido"),
                     "rank": _f(rank, float(n - i), 0, 1e9, 2),   # sin rank medido: el ORDEN de llegada ya es el ranking
                     "ar": None if ar in (None, "") else _f(ar, None, 0.01, 100, 3)})
    return {"logo": _s(site.get("logo") or content.get("logo") or brief.get("logo")),
            "ogImage": _s(content.get("ogImage") or brief.get("mediaImage")),
            "screenshot": _s(site.get("screenshot")),      # SOLO para auditoria humana: no entra al video (§4.3)
            "images": imgs}


# ---------------------------------------------------------------- estado de la captura (§5)
def _infer_estado(site, content, http_status, url):
    """La captura es quien SABE el estado (vio el response y los reintentos): si viene en
    site['captura']['estado'], manda. Esto es la red de atras para pagemodels ensamblados a mano o
    para un site_capture viejo que todavia no lo emite."""
    ok, _ = True, ""
    try:
        u = urlparse(url or "")
        ok = u.scheme in ("http", "https") and bool(u.netloc)
    except Exception:
        ok = False
    if not ok:
        return "bloqueada"
    body = _s(content.get("bodyText"))
    title = _s(content.get("title"))
    if not content and http_status == 0:
        return "timeout"
    if http_status >= 400 or (_404_RE.search(title) and len(body) < 800):
        return "404"
    if http_status in (403, 429, 503) or _BOTWALL_RE.search(title + " " + body[:400]):
        return "botwall"
    if len(body) < 200 and content.get("spaVacia"):
        return "spa-vacia"
    return "ok"


def _confianza(estado, signals, semantica, assets, penal_404):
    """§1.5 — formula CERRADA, pesos que suman 1.00. Precedencia: primero la formula (con la
    penalizacion del 404 recuperado ANTES del clamp), despues el tope por estado. Nunca al reves."""
    m = signals["muestras"]
    c = (0.30 * (1 if estado == "ok" else 0)
         + 0.20 * min(1.0, m["texto"] / 20.0)
         + 0.15 * min(1.0, m["botones"] / 4.0)
         + 0.15 * (1 if signals["accentScore"] > 0 else 0)
         + 0.10 * min(1.0, len(semantica["queHace"]) / 40.0)
         + 0.10 * (1 if len(assets["images"]) >= 1 else 0))
    if penal_404:
        c -= 0.10
    c = min(1.0, max(0.0, c))
    tope = _TOPE_CONFIANZA.get(estado)
    if tope is not None:
        c = min(c, tope)
    return round(c, 2)


# ---------------------------------------------------------------- ENSAMBLADOR
def build_pagemodel(url: str, site=None, brief=None) -> dict:
    """Arma el pagemodel.v1 final. `site` = site_capture.capture_all(), `brief` = perception.analyze_to_brief().
    Nunca lanza: si falta todo, devuelve el "default puro" de §1.7 con confianza 0."""
    site, brief = _dict(site), _dict(brief)
    content = _dict(site.get("content"))
    cap = _dict(site.get("captura"))
    notas, errores = [], []

    url = _s(url or cap.get("url") or brief.get("url"))
    http_status = _i(cap.get("httpStatus"), 0, 0, 599)
    estado = _enum(cap.get("estado"), ESTADO, None) or _infer_estado(site, content, http_status, url)
    penal_404 = bool(cap.get("recuperado404"))            # §5.5: se midio la raiz del mismo host

    for n in _list(cap.get("notas")):
        if _s(n):
            notas.append(_s(n, 120))

    dna_raw = _dict(site.get("dna"))
    signals = _norm_signals(dna_raw.get("signals"))
    body_len = len(_s(content.get("bodyText")))

    if estado in _DNA_DESCARTADO:
        # §5.2/§5.5/§5.6: el DNA del muro/404 es el de Cloudflare o el del hosting, no el de la marca.
        # Solo sobreviven las senales que NO vienen del render del muro: theme-color y el favicon.
        dna = _dna_default()
        theme = _hex(content.get("themeColor")) if estado == "botwall" else None
        if theme and _chroma(theme) >= 0.18:
            dna["palette"]["accent"] = theme
            dna["palette"]["accentText"] = theme
            notas.append("accent del theme-color (unica senal fuera del muro)")
        notas.append(f"{estado}: dna descartado")
    elif estado == "spa-vacia":
        # §5.4: se conserva SOLO lo que si se pinto. Densidad medida en cero -> 'aireado', que es
        # literalmente lo que se ve; no un default de "no se".
        dna = _dna_default()
        bg = _hex(_dict(dna_raw.get("palette")).get("bg"), DEF_BG)
        dna["palette"]["bg"] = bg
        dna["palette"]["bgLum"] = round(_rellum(bg), 3)
        dna["palette"]["inkOnBg"] = DEF_INK if _rellum(bg) > PIVOTE_LUM else DEF_INK_DARK
        theme = _hex(content.get("themeColor"))
        if theme and _chroma(theme) >= 0.18:
            dna["palette"]["accent"] = theme
        dna["palette"]["accentText"] = dna["palette"]["accent"]
        dna["density"] = {"nivel": "aireado", "score": 0.0, "fill": 0.0, "nodos": 0}
        notas.append("spa vacia: solo bg y theme-color")
        # el accentText del theme-color puede no ser legible sobre el bg -> se sanea igual que en §3.3
        dna["palette"] = _norm_palette(dna["palette"], dna["signals"], notas, errores, medido=False, marca=_hex(brief.get("brandColor")))
    elif body_len < 200 and signals["muestras"]["texto"] < 5:
        # §3.5 ultima fila / §5.1: senal insuficiente. TODO el dna a defaults salvo bg (unica senal
        # aprovechable). Escribir el default es decir "no se"; escribir 0 medido seria mentir distinto.
        dna = _dna_default()
        bg = _hex(_dict(dna_raw.get("palette")).get("bg"), DEF_BG)
        dna["palette"]["bg"] = bg
        dna["palette"]["bgLum"] = round(_rellum(bg), 3)
        dna["palette"]["inkOnBg"] = DEF_INK if _rellum(bg) > PIVOTE_LUM else DEF_INK_DARK
        dna["palette"] = _norm_palette(dna["palette"], dna["signals"], notas, errores, medido=False, marca=_hex(brief.get("brandColor")))
        notas.append("sin texto: dna por defecto")
    else:
        dna = _norm_dna(dna_raw, notas, errores, marca=_hex(brief.get("brandColor")))
        _derivar_accent2(dna)

    semantica = _norm_semantica(brief.get("semantica"), brief, content)
    if estado in _DNA_DESCARTADO:
        # §5.2/§5.5/§5.6: lo que el LLM "leyo" en un muro o en un 404 describe el muro o el 404, no la
        # marca. Se conserva SOLO el host como queHace provisional; el resto vacio (y un array vacio
        # desactiva su escena, que es exactamente lo correcto para una URL rota).
        base = _norm_semantica(None, {}, content)
        base["queHace"] = _s(brief.get("brand")) or _bare_host(url)
        base["idioma"] = semantica["idioma"]
        semantica = base

    assets = _norm_assets(site, brief, content)
    if estado in _DNA_DESCARTADO:
        assets["images"] = []                              # las imagenes del muro/404 son del muro/404
    confianza = _confianza(estado, dna["signals"], semantica, assets, penal_404)
    vp = _list(cap.get("viewport"))
    return {
        "v": PM_V,
        "brand": _s(brief.get("brand")) or _bare_host(url) or "Marca",
        "url": url,
        "captura": {"url": url, "urlFinal": _s(cap.get("urlFinal")) or url, "httpStatus": http_status,
                    "estado": estado, "ts": _s(cap.get("ts")), "confianza": confianza,
                    # el viewport NO es decorativo: TODOS los umbrales de §2 estan calibrados a
                    # 1280x900. Si cambia, el dna guardado deja de ser comparable con el resto.
                    "viewport": [_i(vp[0] if len(vp) > 0 else None, VIEWPORT[0], 320, 4096),
                                 _i(vp[1] if len(vp) > 1 else None, VIEWPORT[1], 320, 4096)],
                    "notas": notas[:8], "errores": errores[:8]},
        "dna": dna, "semantica": semantica, "assets": assets,
    }


def _bare_host(url):
    try:
        h = urlparse(url or "").netloc.lower()
    except Exception:
        return ""
    h = h.split("@")[-1].split(":")[0]
    if h.startswith("www."):
        h = h[4:]
    return h


def _ascii_slug(s):
    """Nombre de archivo seguro para el fixture: un host cirilico/CJK no puede quedar en el path."""
    t = unicodedata.normalize("NFKD", _s(s)).encode("ascii", "ignore").decode("ascii").lower()
    t = re.sub(r"[^a-z0-9]+", "-", t).strip("-")
    return t or "sitio"
