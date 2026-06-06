"""
template_director.py — El "director" del sistema de plantillas.

Toma la URL del sitio + lo que el usuario escribió (desarrollo) y produce un
STORYBOARD (spec JSON): qué theme usar y qué escenas, en qué orden, con qué
copy. Después construye los archivos Remotion que renderizan ese spec usando
las escenas de remotion/src/templates/.

El render real (remotion render -> Cloudinary -> Firestore) lo dispara main.py
reusando el mismo mecanismo que el resto.
"""

from __future__ import annotations

import html
import json
import os
import asyncio
import random
import re
from pathlib import Path

import httpx
from anthropic import AsyncAnthropic

import cine_generator  # reutilizamos analyze_url_light
import iconify_service

_client = AsyncAnthropic()
DIRECTOR_MODEL = "claude-sonnet-4-6"

FADE = 14  # debe coincidir con TDUR en VideoFromSpec.jsx

# Variedad creativa: el director elige (o el usuario fija) entre estas opciones.
CREATIVE_ANGLES = [
    "hook con una pregunta provocadora",
    "problema doloroso -> solución",
    "antes vs después",
    "dato/estadística que impacta",
    "directo al beneficio principal",
    "historia de un usuario",
    "contraste 'sin esto' vs 'con esto'",
    "promesa audaz y cómo se cumple",
]
MOODS = ["enérgico y rápido", "calmo y premium", "confiable y claro", "moderno y audaz"]

# Cama musical por mood (Fase 3). Los archivos van en remotion/public/audio/music/<track>.mp3.
# Se activa SOLO con la env CLIPING_AUDIO seteada (para no apuntar a archivos inexistentes y
# romper el render). Cuando haya música cargada, prender CLIPING_AUDIO=1 y listo.
MOOD_TRACK = {
    "enérgico y rápido": "energetic",
    "calmo y premium": "calm",
    "confiable y claro": "confident",
    "moderno y audaz": "bold",
}


def _attach_audio(spec: dict, mood: str) -> dict:
    """Si hay música cargada (CLIPING_AUDIO seteada), suma la cama por mood al spec."""
    if not os.getenv("CLIPING_AUDIO"):
        return spec
    track = MOOD_TRACK.get(mood, "calm")
    spec.setdefault("audio", {"music": track, "musicVolume": 0.18, "whooshVolume": 0.5})
    return spec
LENGTH_SCENES = {"corto": (3, 4), "medio": (4, 5), "largo": (5, 6)}

# Variantes de layout por tipo de escena (azar curado: el piso de calidad no baja).
SCENE_VARIANTS = {
    "KineticStatement": ["center", "center", "center", "left"],
    "MockupShowcase": ["tiltLeft", "tiltLeft", "tiltRight", "flat"],
    "StatReveal": ["stack", "stack", "ring", "left"],
    "Comparison": ["sideBySide", "sideBySide", "stacked"],
    "Testimonial": ["card", "card", "plain"],
    "SocialProof": ["arc", "arc", "row"],
    "FeatureList": ["cards", "cards", "bare"],
    "LogoReveal": ["mark", "mark", "wordmark"],
}


# Direcciones de arte (azar curado y COHERENTE): cada preset cambia a la vez la
# cámara, la familia de entrada, la atmósfera de fondo y el set de transiciones.
# Esto es lo que hace que dos videos con las mismas escenas se sientan distintos.
ART_PRESETS = [
    {"name": "kinetic",   "camera": "pushIn",  "entrance": "rise",  "motif": "particles", "transitions": "slides"},
    {"name": "calm",      "camera": "drift",   "entrance": "scale", "motif": "aurora",    "transitions": "soft"},
    {"name": "bold",      "camera": "pullOut", "entrance": "zoom",  "motif": "rays",      "transitions": "wipes"},
    {"name": "editorial", "camera": "panR",    "entrance": "slide", "motif": "grid",      "transitions": "mixed"},
    {"name": "playful",   "camera": "sway",    "entrance": "drop",  "motif": "bokeh",     "transitions": "slides"},
    {"name": "techno",    "camera": "ken",     "entrance": "tilt",  "motif": "dots",      "transitions": "mixed"},
    {"name": "clean",     "camera": "drift",   "entrance": "rise",  "motif": "none",      "transitions": "soft"},
    {"name": "flow",      "camera": "panL",    "entrance": "scale", "motif": "waves",     "transitions": "mixed"},
]

def _assign_variation(spec: dict) -> dict:
    """Semilla + layout por escena + DIRECCIÓN DE ARTE por video -> nunca se repite."""
    spec["seed"] = random.randint(0, 9999)
    for s in spec.get("scenes", []):
        opts = SCENE_VARIANTS.get(s.get("type"))
        if opts and "variant" not in s:
            s["variant"] = random.choice(opts)
    if "art" not in spec:
        art = dict(random.choice(ART_PRESETS))
        art.pop("name", None)
        spec["art"] = art
    return spec


def _brand_accent(url_data: dict):
    """Devuelve el color de marca del sitio (theme-color) si es vibrante y usable."""
    hex_ = (url_data.get("themeColor") or "").strip()
    if not re.fullmatch(r"#[0-9a-fA-F]{6}", hex_):
        return None
    r, g, b = int(hex_[1:3], 16), int(hex_[3:5], 16), int(hex_[5:7], 16)
    mx, mn = max(r, g, b), min(r, g, b)
    sat = (mx - mn)
    # vibrante: con saturación y ni muy oscuro ni muy claro (legible sobre fondo oscuro)
    if sat >= 45 and 70 <= mx <= 252:
        return hex_
    return None


def _finalize(spec: dict, url_data: dict) -> dict:
    spec = _assign_variation(spec)
    acc = _brand_accent(url_data)
    if acc:
        spec.setdefault("accent", acc)
    # Logo real del sitio para los LogoReveal (URL cruda; main.py la re-hostea a
    # Cloudinary antes del render, igual que el screenshot del MockupShowcase).
    logo = (url_data.get("logo") or "").strip()
    if logo:
        for s in spec.get("scenes", []):
            if s.get("type") == "LogoReveal" and not s.get("logo"):
                s["logo"] = logo
    return spec

# Catálogo de escenas disponibles (se le pasa a la IA para que componga).
SCENE_CATALOG = """ESCENAS DISPONIBLES (type + props):
- "KineticStatement": frase de impacto. props: lines = array de líneas; cada línea
  es array de segmentos { "t": "texto", "accent": true|false }. La palabra/grupo
  clave va con accent:true. IMPORTANTE: incluí los espacios DENTRO del texto del
  segmento (ej: [{"t":"Comé "},{"t":"mejor","accent":true}]) para que no se peguen.
  props opcional: subtitle. UNA sola idea por escena (no metas 2 frases).
- "IntegrationCluster": "todo en un solo lugar / muchas cosas unificadas".
  props: title = array de segmentos { t, accent }. opcional colors = array de hex.
- "MockupShowcase": muestra el producto/su web. props: title = array de segmentos
  { t, accent }. (La captura del sitio se inyecta sola, no la pongas.)
- "IconTransform": beat de TRANSFORMACIÓN (el efecto "wow"). Un ícono se "clickea" y
  se convierte en otro con un estallido. props: iconFrom y iconTo = CONCEPTOS de ícono
  EN INGLÉS para buscar en una librería. props opcional: label = array de segmentos
  { t, accent }. BUSCÁ activamente el contraste/transformación del mensaje y pensá qué
  DOS íconos lo cuentan para ESTA marca puntual. Ejemplos para que generalices (NO los
  copies, inventá los tuyos): dietética: "burger"->"apple", "leaf"->"heart"; software:
  "documents"->"lightning", "lock"->"check"; gym: "couch"->"dumbbell"; finanzas:
  "piggy bank"->"chart"; e-commerce: "shopping cart"->"money". Elegí los íconos que de
  verdad representen la idea de la página.
- "StatReveal": un NÚMERO que cuenta de 0 hasta el valor (el beat de "dato que impacta").
  props: value = número (ej 95, 4.9, 12000); opcional prefix (ej "$", "+"); suffix (ej
  "%", "x", "k", "/5"); caption = línea chica ARRIBA (string); label = array de segmentos
  { t, accent } DEBAJO (qué describe el número). Usala SOLO si tenés un dato REAL del sitio.
  NUNCA inventes una cifra.
- "FeatureList": lista de features/beneficios en filas con ícono (cascada). props: opcional
  title = segmentos { t, accent }; items = array de 2 a 5 objetos
  { "icon": "<concepto EN INGLÉS>", "label": [segmentos { t, accent }] }. El ícono lo
  resuelve el sistema vía Iconify (igual que IconTransform): poné un concepto simple en
  inglés por item (ej "bolt", "lock", "chart", "clock"). Cada label corto (1 a 5 palabras).
- "Comparison": antes vs después / "sin esto" vs "con esto". props: opcional title =
  segmentos; leftLabel y rightLabel = segmentos (ej "Antes" / "Después"); leftItems y
  rightItems = arrays de strings cortos (los puntos). La izquierda es lo NEGATIVO (se marca
  con ✕), la derecha lo POSITIVO (✓). opcional connector: "vs" | "arrow". 2 a 3 puntos por lado.
- "Testimonial": una cita/testimonio destacado. props: quote = array de segmentos { t, accent };
  author = nombre; opcional role = cargo/empresa; opcional stars = 1 a 5. NO inventes
  testimonios ni nombres: usala SOLO si el sitio muestra reseñas/testimonios reales.
- "SocialProof": prueba social ("+500 equipos ya lo usan"): avatares en arco + título.
  props: title = segmentos { t, accent }; opcional subtitle = string; opcional count (3 a 7).
  Usala SOLO con datos reales o plausibles del sitio; no inventes cifras específicas falsas.
- "LogoReveal": sello de marca (stinger). props: brand = nombre de marca; opcional tagline
  = línea corta. (El logo real del sitio se inyecta solo, NO lo pongas.) variant lo elige el
  sistema. Útil como beat de marca en el medio del video; no la pongas primera ni última.
- "CtaOutro": cierre. props: brand = nombre de marca, cta = llamado a la acción corto."""

# Paletas disponibles (NO son rubros: son VIBRAS/colores que sirven para cualquier
# marca). El brand-accent (Fase 6) recolorea el acento con el color real del sitio
# arriba de la paleta, así además se adapta a cada marca.
THEME_VIBES = {
    "saas-explainer":  "violeta tech, moderno y digital",
    "ocean-deep":      "turquesa y azul profundo, fresco y confiable",
    "clinical-formal": "azul frío, preciso y profesional",
    "organic-natural": "verde cálido, natural y orgánico",
    "sunset-warm":     "naranjas y rosas de atardecer, cálido y lifestyle",
    "crimson-bold":    "rojo y magenta intensos, energía y urgencia",
    "berry-glow":      "púrpura y rosa con glow, creativo y vibrante",
    "gold-lux":        "negro y dorado, premium y elegante",
    "cyber-neon":      "neón cyan/lima sobre casi negro, futurista",
    "mono-ink":        "monocromo tinta con un acento, editorial y minimal",
}
VALID_THEMES = tuple(THEME_VIBES.keys())

THEME_GUIDE = (
    "PALETAS (elegí 1 por la VIBRA de la marca — sirve para CUALQUIER rubro, no son "
    "categorías cerradas; guiate por el tono y los colores del sitio):\n"
    + "\n".join(f'- "{k}": {v}' for k, v in THEME_VIBES.items())
)

DIRECTOR_SYSTEM = f"""Sos director creativo de videos verticales (reels) de marketing/explainer
para marcas. Diseñás un STORYBOARD que un motor renderiza con plantillas.

{SCENE_CATALOG}

{THEME_GUIDE}

Devolvés SOLO un objeto JSON válido (sin markdown), con esta forma:
{{
  "theme": "<uno de los themes>",
  "brand": "<nombre de marca>",
  "scenes": [ {{ "type": "...", "durationInFrames": 90, ...props }} ]
}}

REGLAS:
- 4 a 6 escenas. ABRÍ con un HOOK potente (no siempre el mismo tipo): puede ser
  "KineticStatement" (frase), "StatReveal" (un dato fuerte), "Comparison" (un contraste)
  o "LogoReveal" si la marca es conocida. Elegí la apertura según lo que MÁS enganche a
  ESTE público. CERRÁ con "CtaOutro" (el llamado a la acción).
- Incluí "MockupShowcase" si hay un producto/web que mostrar.
- Incluí UN "IconTransform" cuando exista un contraste o transformación natural en el
  mensaje (en marketing casi siempre lo hay: antes/después, problema/solución, acción/
  resultado). Es el momento más vistoso del video. No lo fuerces solo si de verdad no pega.
- Tenés un repertorio más amplio para que el video no sea formulaico: combiná las escenas
  según lo que cuente la página. Buenas oportunidades:
  · "StatReveal" si el sitio menciona un número fuerte (años, clientes, %, velocidad).
  · "FeatureList" para mostrar 3-4 features/beneficios concretos de un saque.
  · "Comparison" para un antes/después o "sin esto vs con esto" claro.
  · "Testimonial" SOLO si hay reseñas/testimonios reales en el sitio.
  · "SocialProof" si hay señales de adopción/confianza (clientes, comunidad).
  No metas las 5 en un mismo video: elegí 1 o 2 que de verdad sumen a la historia.
- HONESTIDAD (importante): StatReveal, Testimonial y SocialProof muestran "hechos". NO
  inventes cifras, testimonios ni nombres. Si no tenés el dato real del sitio, NO uses esa
  escena: contá el beneficio con KineticStatement/FeatureList en su lugar.
- durationInFrames entre 75 y 120 por escena (30fps).
- COPY: específico de ESTA marca, no genérico. Usá el contexto del sitio (qué vende,
  para quién, su diferencial). Evitá frases vacías tipo "la mejor calidad" o "tu aliado".
  Hablá de beneficios concretos y reales. Variá los verbos. Que suene humano.
- Copy CORTO y potente, en el MISMO idioma del sitio/usuario (español rioplatense si aplica).
- MUY IMPORTANTE: en KineticStatement cada línea va de 1 a 4 palabras (máx ~22 caracteres)
  e incluí los espacios dentro de cada segmento. Partí ideas largas en varias líneas o
  escenas. Pensá "to keep up" / "feature requests", no frases enteras.
- En cada texto marcá con accent:true SOLO la palabra o grupo clave (1 por línea).
- NO inventes datos que no sabés del sitio. Si no tenés un dato, no lo pongas.
- El storyboard debe contar una micro-historia coherente con el propósito.
- PÚBLICO (clave): inferí del sitio QUIÉN es el público objetivo (quién compra/usa esto:
  rubro, nivel, qué le importa, qué problema tiene) y escribí TODO el copy hablándole a
  ESE público, con su lenguaje y sus prioridades. El mismo producto se le presenta distinto
  a un dueño de pyme, a un developer o a un consumidor final. Que el video se sienta hecho
  para la audiencia de ESTA página, no un molde genérico."""


def _chunk_lines(text, max_words=8, per_line=3):
    """Parte un texto real del sitio en líneas cortas (1-4 palabras) con acento al final."""
    words = (text or "").split()[:max_words]
    if not words:
        return None
    lines = [[{"t": " ".join(words[i:i + per_line])}] for i in range(0, len(words), per_line)]
    last = lines[-1][0]["t"]
    parts = last.rsplit(" ", 1)
    lines[-1] = ([{"t": parts[0] + " "}, {"t": parts[1], "accent": True}]
                 if len(parts) == 2 else [{"t": last, "accent": True}])
    return lines


def _fallback_spec(url_data: dict, desarrollo: str, proposito: str) -> dict:
    """
    Respaldo SOLO si el director (LLM) falla. Aun así, arma el copy desde datos
    REALES del sitio (titular, secciones, descripción), no frases fijas, y varía la
    paleta. Nada hardcodeado de contenido.
    """
    brand = url_data.get("siteName") or "Tu marca"
    head = (url_data.get("headline") or desarrollo or "").strip()
    desc = (url_data.get("description") or "").strip()
    secs = [s for s in (url_data.get("sections") or []) if s]

    scenes = [{
        "type": "KineticStatement", "durationInFrames": 90,
        "lines": _chunk_lines(head) or [[{"t": "Conocé "}, {"t": brand, "accent": True}]],
        "subtitle": (desc or head)[:60],
    }]
    # Si el sitio tiene secciones reales -> FeatureList con ESAS secciones.
    if len(secs) >= 2:
        scenes.append({"type": "FeatureList", "durationInFrames": 110,
                       "title": [{"t": brand, "accent": True}],
                       "items": [{"label": [{"t": s[:26], "accent": True}]} for s in secs[:3]]})
    else:
        scenes.append({"type": "MockupShowcase", "durationInFrames": 110,
                       "title": _chunk_lines(head, 6) or [[{"t": brand, "accent": True}]]})
    # CTA: sin frase inventada. El LLM normalmente lo escribe; en el fallback va vacío
    # (el outro muestra la marca sin botón falso).
    scenes.append({"type": "CtaOutro", "durationInFrames": 80, "brand": brand, "cta": ""})

    return {"theme": random.choice(VALID_THEMES), "brand": brand, "scenes": scenes}


def _normalize(spec: dict, url_data: dict, desarrollo: str, proposito: str) -> dict:
    fb = _fallback_spec(url_data, desarrollo, proposito)
    if not isinstance(spec, dict):
        return fb
    theme = spec.get("theme")
    if theme not in VALID_THEMES:
        theme = "saas-explainer"
    scenes = spec.get("scenes")
    if not isinstance(scenes, list) or len(scenes) < 2:
        return fb
    valid_types = {"KineticStatement", "IntegrationCluster", "MockupShowcase", "CtaOutro", "IconTransform",
                   "StatReveal", "FeatureList", "Comparison", "Testimonial", "SocialProof", "LogoReveal"}
    clean = []
    for s in scenes:
        if not isinstance(s, dict) or s.get("type") not in valid_types:
            continue
        d = s.get("durationInFrames", 90)
        try:
            d = max(60, min(140, int(d)))
        except Exception:
            d = 90
        s["durationInFrames"] = d
        clean.append(s)
    if len(clean) < 2:
        return fb
    brand = spec.get("brand") or fb["brand"]
    for s in clean:
        if s.get("type") == "CtaOutro" and not s.get("brand"):
            s["brand"] = brand
    return {"theme": theme, "brand": brand, "scenes": clean}


async def analyze_site_rich(url: str) -> dict:
    """
    Lectura más profunda del sitio para que el director escriba mejor copy:
    título, marca, descripción, subtítulos (h1/h2/h3) y primeros párrafos.
    Best-effort: si falla, cae a analyze_url_light.
    """
    base = await cine_generator.analyze_url_light(url)
    out = {"siteName": base.get("siteName", ""), "headline": base.get("headline", ""),
           "themeColor": base.get("themeColor", ""), "description": "", "sections": [],
           "logo": "", "context": ""}
    if not url:
        return out
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True,
                headers={"User-Agent": "Mozilla/5.0 (compatible; clipingbot/1.0)"}) as c:
            r = await c.get(url)
            t = r.text[:300_000]

        def grab(pat):
            m = re.search(pat, t, re.I | re.S)
            return html.unescape(re.sub(r"<[^>]+>", "", m.group(1))).strip() if m else ""

        desc = grab(r'name=["\']description["\'][^>]*content=["\']([^"\']+)') \
            or grab(r'property=["\']og:description["\'][^>]*content=["\']([^"\']+)')
        out["description"] = re.sub(r"\s+", " ", desc)[:280]

        heads = re.findall(r"<h[1-3][^>]*>(.*?)</h[1-3]>", t, re.I | re.S)
        secs = []
        for h in heads:
            txt = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", html.unescape(h))).strip()
            if 3 <= len(txt) <= 80 and txt.lower() not in [s.lower() for s in secs]:
                secs.append(txt)
        out["sections"] = secs[:8]

        # Logo del sitio: apple-touch-icon (suele ser un mark limpio) > og:image >
        # icon link > /favicon.ico. Lo resolvemos a URL absoluta.
        def grab_attr(pat):
            m = re.search(pat, t, re.I)
            return m.group(1).strip() if m else ""

        cand = (
            grab_attr(r'<link[^>]+rel=["\'][^"\']*apple-touch-icon[^"\']*["\'][^>]*href=["\']([^"\']+)')
            or grab_attr(r'<link[^>]+href=["\']([^"\']+)["\'][^>]*rel=["\'][^"\']*apple-touch-icon')
            or grab_attr(r'property=["\']og:image["\'][^>]*content=["\']([^"\']+)')
            or grab_attr(r'<link[^>]+rel=["\'][^"\']*icon[^"\']*["\'][^>]*href=["\']([^"\']+)')
        )
        if not cand:
            cand = "/favicon.ico"
        try:
            from urllib.parse import urljoin
            out["logo"] = urljoin(str(r.url), cand)
        except Exception:
            out["logo"] = ""

        ctx = []
        if out["siteName"]:    ctx.append(f"Marca: {out['siteName']}")
        if out["headline"]:    ctx.append(f"Titular: {out['headline']}")
        if out["description"]: ctx.append(f"Descripción: {out['description']}")
        if out["sections"]:    ctx.append("Secciones: " + " · ".join(out["sections"]))
        out["context"] = "\n".join(ctx)
    except Exception as e:
        print(f"[director] analyze_site_rich: {e}")
    return out


async def _resolve_one_icon(concept: str):
    """Resuelve un concepto de ícono (en inglés) a {body, viewBox} de Iconify, o None."""
    try:
        hits = await iconify_service.search_objects(concept.strip(), limit=1)
        return await iconify_service.get_icon_body(hits[0]["id"]) if hits else None
    except Exception as ie:
        print(f"[director] icono '{concept}' no resuelto: {ie}")
        return None


async def _resolve_icons(spec: dict) -> dict:
    """
    Resuelve los conceptos de íconos a SVGs de Iconify, en paralelo.
    - IconTransform: iconFrom/iconTo -> iconFromSvg/iconToSvg.
    - FeatureList: cada item.icon -> item.iconSvg.
    """
    # Junta (setter, concepto) para resolver todo de una con gather.
    jobs = []
    for s in spec.get("scenes", []):
        t = s.get("type")
        if t == "IconTransform":
            for key, svgkey in (("iconFrom", "iconFromSvg"), ("iconTo", "iconToSvg")):
                concept = s.get(key)
                if isinstance(concept, str) and concept.strip():
                    jobs.append((lambda body, _s=s, _k=svgkey: _s.__setitem__(_k, body), concept))
        elif t == "FeatureList":
            for it in s.get("items", []):
                if not isinstance(it, dict):
                    continue
                concept = it.get("icon")
                if isinstance(concept, str) and concept.strip():
                    jobs.append((lambda body, _it=it: _it.__setitem__("iconSvg", body), concept))

    if not jobs:
        return spec

    results = await asyncio.gather(*[_resolve_one_icon(c) for _, c in jobs])
    for (setter, _), body in zip(jobs, results):
        setter(body)
    return spec


async def build_storyboard(url: str, desarrollo: str, proposito: str = "marketing",
                           theme_override: str = "", tone: str = "",
                           length: str = "medio", simple: bool = True) -> dict:
    """
    URL + desarrollo -> storyboard spec.

    Modo simple (simple=True): el director elige ángulo/mood al azar y genera con
    temperatura alta -> variedad entre corridas.
    Modo avanzado (simple=False): respeta los parámetros del usuario (theme, tono,
    duración) como restricciones, con menos azar.
    """
    url_data = await analyze_site_rich(url)

    lo, hi = LENGTH_SCENES.get(length, LENGTH_SCENES["medio"])
    n_scenes = random.randint(lo, hi)

    if simple:
        angle = random.choice(CREATIVE_ANGLES)
        mood = random.choice(MOODS)
        temperature = 0.95
    else:
        angle = "según las indicaciones del usuario"
        mood = tone or random.choice(MOODS)
        temperature = 0.6

    brief = (
        f"Dirección creativa para ESTE video (hacelo único, no formulaico):\n"
        f"- Ángulo narrativo: {angle}\n"
        f"- Mood: {mood}\n"
        f"- Apuntá a unas {n_scenes} escenas."
    )
    if theme_override in VALID_THEMES:
        brief += f"\n- Theme OBLIGATORIO: {theme_override}"

    extra = f'\nLo que pidió el usuario: "{desarrollo.strip()}"' if desarrollo.strip() else ""
    contexto = url_data.get("context") or f"Marca: {url_data.get('siteName') or 'desconocido'}"
    user_prompt = f"""PROPÓSITO: {proposito}
URL: {url}

CONTEXTO DEL SITIO (usalo para escribir copy específico y real, no genérico):
{contexto}{extra}

{brief}

Generá el storyboard JSON. El copy tiene que sonar a ESTA marca puntual (usá lo que
sabés del sitio), reflejar el ángulo y el mood, y respetar las reglas de líneas cortas."""

    try:
        resp = await _client.messages.create(
            model=DIRECTOR_MODEL, max_tokens=1500, temperature=temperature,
            system=DIRECTOR_SYSTEM,
            messages=[{"role": "user", "content": user_prompt}],
        )
        raw = resp.content[0].text.strip()
        m = re.search(r"\{.*\}", raw, re.S)
        spec = json.loads(m.group(0)) if m else None
        spec = _normalize(spec, url_data, desarrollo, proposito)
        if theme_override in VALID_THEMES:
            spec["theme"] = theme_override
        spec = await _resolve_icons(spec)
        return _attach_audio(_finalize(spec, url_data), mood)
    except Exception as e:
        print(f"[director] fallback ({e})")
        return _attach_audio(_finalize(_fallback_spec(url_data, desarrollo, proposito), url_data), mood)


def compute_total(scenes: list) -> int:
    cursor, last = 0, 0
    for i, s in enumerate(scenes):
        dur = s.get("durationInFrames", 90)
        frm = 0 if i == 0 else cursor
        last = frm + dur
        cursor = frm + dur - FADE
    return last


_ROOT_TEMPLATE = """import { Composition } from 'remotion'
import VideoFromSpec from './templates/VideoFromSpec'

const SPEC = __SPEC_JSON__

export const RemotionRoot = () => (
  <Composition
    id="__COMPID__"
    component={VideoFromSpec}
    durationInFrames={__TOTAL__}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{ spec: SPEC }}
  />
)
"""

_ENTRY_TEMPLATE = """import { registerRoot } from 'remotion'
import { RemotionRoot } from './src/__ROOT_FILE__'
registerRoot(RemotionRoot)
"""


def build_video_files(job_id: str, spec: dict, remotion_dir):
    """
    Escribe el Root + entry que renderizan el spec con VideoFromSpec.
    Las escenas viven fijas en remotion/src/templates/ (no son temporales).
    Devuelve (entry_file, comp_id, total_frames, temp_files).
    """
    remotion_dir = Path(remotion_dir)
    short = job_id[:8]
    comp_id = f"MarketingVideo-{short}"
    total = compute_total(spec.get("scenes", []))
    temp_files = []

    root_src = (_ROOT_TEMPLATE
                .replace("__SPEC_JSON__", json.dumps(spec, ensure_ascii=False))
                .replace("__TOTAL__", str(total))
                .replace("__COMPID__", comp_id))
    root_file = f"Root_vid_{short}.jsx"
    (remotion_dir / "src" / root_file).write_text(root_src, encoding="utf-8")
    temp_files.append(remotion_dir / "src" / root_file)

    entry_src = _ENTRY_TEMPLATE.replace("__ROOT_FILE__", root_file)
    entry_file = f"index_vid_{short}.jsx"
    (remotion_dir / entry_file).write_text(entry_src, encoding="utf-8")
    temp_files.append(remotion_dir / entry_file)

    return entry_file, comp_id, total, temp_files
