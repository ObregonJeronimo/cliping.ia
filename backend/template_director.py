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
import playbooks
import brand_dna

import cine_generator  # reutilizamos analyze_url_light
import iconify_service

_client = AsyncAnthropic()
DIRECTOR_MODEL = "claude-sonnet-4-6"

# Precios por millón de tokens (input, output) por modelo, para estimar el costo real por video.
MODEL_PRICES = {
    "claude-opus-4-8": (5.0, 25.0),
    "claude-sonnet-4-6": (3.0, 15.0),
    "claude-haiku-4-5-20251001": (1.0, 5.0),
}


def _acc_usage(sink, stage, model, resp):
    """Acumula el uso de tokens de una llamada en 'sink' (lista) para medir costo por video.
    Captura también los tokens de prompt caching (escritura/lectura) para que el costo sea exacto.
    No-op si sink es None. Best-effort (nunca rompe la generación)."""
    if sink is None:
        return
    try:
        u = resp.usage
        sink.append({"stage": stage, "model": model,
                     "in": int(getattr(u, "input_tokens", 0) or 0),
                     "out": int(getattr(u, "output_tokens", 0) or 0),
                     "cache_w": int(getattr(u, "cache_creation_input_tokens", 0) or 0),
                     "cache_r": int(getattr(u, "cache_read_input_tokens", 0) or 0)})
    except Exception:
        pass


def usage_cost(usage):
    """Suma tokens y estima el costo USD. Incluye prompt caching: escritura de cache = 1.25x el precio
    de input, lectura de cache = 0.1x. Así el costo medido es realista aun con caching activo."""
    tin = tout = tcw = tcr = 0
    cost = 0.0
    for e in usage or []:
        pin, pout = MODEL_PRICES.get(e.get("model"), (3.0, 15.0))
        i, o = e.get("in", 0), e.get("out", 0)
        cw, cr = e.get("cache_w", 0), e.get("cache_r", 0)
        tin += i; tout += o; tcw += cw; tcr += cr
        cost += i / 1e6 * pin + o / 1e6 * pout + cw / 1e6 * pin * 1.25 + cr / 1e6 * pin * 0.1
    return {"in": tin, "out": tout, "cache_w": tcw, "cache_r": tcr,
            "cost_usd": round(cost, 5), "calls": len(usage or [])}


def _brief_field(brief_txt: str, field: str) -> str:
    """Extrae el valor de un campo del brief (formato 'CAMPO: valor', una línea por campo)."""
    if not brief_txt:
        return ""
    m = re.search(rf"^{re.escape(field)}\s*:\s*(.+)$", brief_txt, re.M | re.I)
    return m.group(1).strip() if m else ""


def _qa_spec(spec: dict) -> list:
    """QA determinista del spec final: detecta y AUTOCORRIGE lo que si no requeriría 'ajuste' a ojo.
    Devuelve la lista de issues (para log). Modifica spec in place. Nunca rompe el pipeline."""
    issues = []
    try:
        scenes = spec.get("scenes") or []
        # NOTA: el formato (vertical/square/wide) lo elige el USUARIO (req.formato) y se aplica en
        # main.py DESPUÉS de esto. El QA NO decide ni pisa el formato; solo lo reporta si viene raro.
        fmt = spec.get("format", "")
        if fmt and fmt not in ("vertical", "square", "wide"):
            issues.append(f"format raro en el spec ('{fmt}') — lo define el usuario, no lo toco acá")
        if not scenes:
            issues.append("sin escenas")
            return issues
        HEAVY = ("Comparison", "FeatureList")
        if scenes[0].get("type") in HEAVY:
            swap = next((i for i, s in enumerate(scenes) if i > 0 and s.get("type") not in HEAVY), None)
            if swap:
                t0 = scenes[0].get("type")
                scenes[0], scenes[swap] = scenes[swap], scenes[0]
                issues.append(f"primera escena {t0} (pesada) -> swap con escena {swap}")
        if scenes[-1].get("type") not in ("CtaOutro", "LogoReveal"):
            issues.append("última escena no es CtaOutro/LogoReveal (sin cierre claro)")
        acc = spec.get("accent", "")
        if brand_dna._hex_ok(acc):
            fixed = brand_dna.ensure_visible_on_dark(acc)
            if fixed != acc:
                spec["accent"] = fixed
                issues.append(f"acento {acc} poco visible sobre fondo oscuro -> {fixed}")
        for i in range(1, len(scenes)):
            if scenes[i].get("type") == scenes[i - 1].get("type"):
                issues.append(f"escenas {i-1}-{i} mismo tipo ({scenes[i].get('type')}) consecutivas")
        for i, s in enumerate(scenes):
            txt = " ".join(_collect_text(s))
            words = len([w for w in txt.split() if w])
            d = int(s.get("durationInFrames", 90) or 90)
            if words >= 6 and d < (90 + int(0.45 * words * 30)):
                newd = min(240, 90 + int(0.5 * words * 30))
                s["durationInFrames"] = newd
                issues.append(f"escena {i} ({s.get('type')}): {words} palabras en {d}f -> {newd}f")
            for ln in (s.get("lines") or []):
                t = ln if isinstance(ln, str) else "".join(seg.get("t", "") for seg in (ln or []))
                if len(t) > 32:
                    issues.append(f"escena {i} ({s.get('type')}): línea larga ({len(t)}ch) '{t[:30]}…'")
    except Exception as e:
        issues.append(f"QA error (no crítico): {e}")
    return issues

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

# El PROPÓSITO moldea la ESTRUCTURA y el CTA del video (no solo el copy suelto).
PURPOSE_GUIDE = {
    "marketing":   "Equilibrá enganche + valor + marca; cerrá con un CTA claro.",
    "awareness":   "Priorizá un HOOK fuerte y la idea central de marca; CTA suave (seguir/conocer).",
    "branding":    "Priorizá identidad, tono y un mensaje memorable; CTA suave.",
    "conversion":  "Estructura: problema -> solución -> prueba real -> CTA fuerte y directo (comprar/agendar).",
    "ventas":      "Estructura: problema -> solución -> prueba real -> CTA fuerte y directo (comprar/agendar).",
    "lanzamiento": "Estructura: teaser -> reveal de la novedad/producto -> fecha o CTA de acción.",
    "launch":      "Estructura: teaser -> reveal de la novedad/producto -> fecha o CTA de acción.",
    "educacion":   "Enseñá algo útil en pasos claros; la marca aparece como quien lo resuelve.",
    "educational": "Enseñá algo útil en pasos claros; la marca aparece como quien lo resuelve.",
}

# BIBLIOTECA DE HOOKS (swipe file): patrones de apertura probados en social 2026. El director
# remixea uno por video (rotado) para la PRIMERA escena, en vez de inventar de cero. El hook
# decide la retención de los primeros 1-3s, que es la señal #1 del algoritmo.
HOOK_ARCHETYPES = [
    {"name": "pregunta-dolor",
     "guide": "Abrí con UNA pregunta que toque el dolor del público ('¿Todavía...?', '¿Cuánto...?'). Corta y filosa.",
     "ex": "¿Todavía lo hacés a mano?"},
    {"name": "loop-curiosidad",
     "guide": "Abrí un BUCLE de curiosidad: insinuá algo intrigante que el video recién resuelve más adelante (NO lo cierres en la primera escena).",
     "ex": "Hay una forma más fácil."},
    {"name": "numero-shock",
     "guide": "Abrí con un NÚMERO fuerte y REAL del sitio como gancho (al toque, no en el medio). Que sorprenda.",
     "ex": "+600 productos. Sin moverte."},
    {"name": "mito-contradiccion",
     "guide": "Abrí ROMPIENDO una creencia común del rubro ('X no es lo que pensás'). Genera tensión.",
     "ex": "Comer sano no es caro."},
    {"name": "pov-situacion",
     "guide": "Abrí con un POV/situación con la que el público se identifica ('POV:...', 'Cuando...'). Relatable = shares.",
     "ex": "POV: cobrar te saca el sueño."},
    {"name": "negacion-basta",
     "guide": "Abrí con una NEGACIÓN/orden que corta el scroll ('Dejá de...', 'Basta de...', 'No más...').",
     "ex": "Dejá de perseguir pagos."},
    {"name": "promesa-audaz",
     "guide": "Abrí con una PROMESA audaz y concreta del beneficio principal, en 3-5 palabras.",
     "ex": "Tu cobranza, en automático."},
    {"name": "antes-despues",
     "guide": "Abrí contrastando un ANTES doloroso al toque (corto, visual): 'Antes X. Ahora Y.'",
     "ex": "Antes: planillas. Ahora: un click."},
]

# ARCOS NARRATIVOS: esqueletos de historia probados. Le dan columna vertebral al video (no
# 'escenas lindas en fila'). Se rota entre los que encajan con el propósito -> variedad + estructura.
NARRATIVE_ARCS = {
    "pas":           "ARCO PAS: 1) hook que nombra el PROBLEMA · 2) agitá el dolor (qué se pierde/cuesta hoy) · 3) la SOLUCIÓN (tu marca) · 4) CTA. Potente para conversión.",
    "antes_despues": "ARCO ANTES/DESPUÉS: 1) hook · 2) el ANTES (cómo se sufre hoy) · 3) el DESPUÉS (con la marca: alivio/resultado) · 4) CTA.",
    "tres_razones":  "ARCO 3 RAZONES: 1) hook con la promesa · 2-3) dos o tres razones/beneficios concretos y REALES (una por escena o un FeatureList) · 4) CTA.",
    "como_funciona": "ARCO CÓMO FUNCIONA: 1) hook · 2) cómo funciona en PASOS simples (usá ProcessSteps) · 3) el resultado · 4) CTA. Ideal educativo.",
    "prueba_real":   "ARCO PRUEBA: 1) hook · 2) un DATO real (StatReveal) o testimonio real del sitio · 3) por qué importa · 4) CTA. SOLO si hay datos reales en el contexto.",
    "oferta":        "ARCO OFERTA: 1) hook · 2) el PRODUCTO/oferta con precio real (OfferPrice) · 3) urgencia/beneficio · 4) CTA de compra. Ideal ecommerce/ventas.",
    "manifiesto":    "ARCO MANIFIESTO: 1) hook de identidad · 2-3) qué representa la marca / su diferencial (KineticStatement + IllustrationScene) · 4) CTA suave. Ideal branding.",
}

# Qué arcos encajan con cada propósito (se ROTA entre ellos para no repetir estructura).
PURPOSE_ARCS = {
    "marketing":   ["pas", "tres_razones", "antes_despues", "como_funciona"],
    "awareness":   ["manifiesto", "tres_razones", "antes_despues"],
    "branding":    ["manifiesto", "antes_despues", "tres_razones"],
    "conversion":  ["pas", "oferta", "antes_despues", "prueba_real"],
    "ventas":      ["pas", "oferta", "antes_despues", "prueba_real"],
    "lanzamiento": ["como_funciona", "tres_razones", "manifiesto"],
    "launch":      ["como_funciona", "tres_razones", "manifiesto"],
    "educacion":   ["como_funciona", "tres_razones", "prueba_real"],
    "educational": ["como_funciona", "tres_razones", "prueba_real"],
}

# Estilo de EDICIÓN por video: rota qué escenas protagonizan y el ritmo, para que la
# ESTRUCTURA no sea siempre la misma (Hook -> IconTransform -> Mockup -> CTA). Es a la
# estructura lo que ART_PRESETS es al movimiento.
EDIT_STYLES = [
    ("punchy",    "ritmo rápido: 3-4 frases KineticStatement cortas y filosas; SIN listas (ni FeatureList ni Comparison); cerrá fuerte."),
    ("historia",  "arco problema -> solución -> CTA contado con KineticStatement; UN IconTransform para el giro; SIN listas."),
    ("ilustrado", "IllustrationScene como hero visual + una frase potente; estética limpia, poco texto; SIN listas ni Mockup."),
    ("dato",      "girá alrededor de UN StatReveal con un número REAL del sitio; si no hay número, contalo con frases; SIN listas."),
    ("showcase",  "el producto es protagonista: MockupShowcase al frente + frases; usar SOLO si hay web/app para mostrar; SIN listas."),
    ("prueba",    "liderado por confianza: SocialProof y/o Testimonial SOLO con datos reales del sitio; si no hay, contá con frases; SIN listas."),
    ("listicle",  "UNA sola FeatureList (3-4 beneficios concretos) como beat principal + frases; NADA de Comparison."),
    ("contraste", "UNA sola Comparison (sin esto vs con esto) + remate con el beneficio; NADA de FeatureList."),
]

# Estilos que protagonizan con una LISTA (los que "se ven iguales" entre videos).
LIST_STYLES = {"listicle", "contraste"}


def pick_edit_style(recent=None):
    """Elige un EDIT_STYLE evitando los últimos usados (rotación por usuario+marca) y
    sin permitir dos listas seguidas. recent = lista de nombres, más reciente primero."""
    recent = recent or []
    pool = [e for e in EDIT_STYLES if e[0] not in recent[:3]]
    # Nunca dos listas seguidas: si el último fue lista, esta vez no hay lista.
    if recent and recent[0] in LIST_STYLES:
        no_list = [e for e in pool if e[0] not in LIST_STYLES]
        pool = no_list or pool
    return random.choice(pool or EDIT_STYLES)


def _pick_avoiding(options, recent=None, n=2, key=None):
    """Elige al azar EVITANDO los 'n' más recientes (para rotar varias variables a la vez y
    que dos videos de la misma marca no se sientan iguales). key = atributo si son dicts."""
    rec = set((recent or [])[:n])
    pool = [o for o in options if (o.get(key) if key else o) not in rec]
    return random.choice(pool or options)


def _pick_smart(options, recent=None, net=None, n=2, key=None):
    """Como _pick_avoiding (evita los recientes -> rotación) PERO además sesga por rating:
    favorece los valores con rating neto positivo y evita los de rating negativo.
    net = {valor: score acumulado de ratings}. Sin net, se comporta como _pick_avoiding."""
    rec = set((recent or [])[:n])
    net = net or {}
    weights = []
    for o in options:
        val = o.get(key) if key else o
        w = 0.06 if val in rec else 1.0          # recientes casi no salen (rotación)
        s = net.get(val, 0)
        if s > 0:
            w *= (1 + min(s, 4) * 0.8)            # gustó -> más probable
        elif s < 0:
            w *= 0.2                              # no gustó -> mucho menos probable
        weights.append(max(w, 0.0001))
    total = sum(weights)
    r = random.uniform(0, total)
    acc = 0.0
    for o, w in zip(options, weights):
        acc += w
        if r <= acc:
            return o
    return options[-1] if options else None

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
    """Audio del video. Default: SILENCIO (cero líos de licencia, nunca rompe el render).
    Activables por entorno (cuando el dev deje los archivos en remotion/public/audio/):
      · CLIPING_SFX   -> whoosh sutil en los cortes (necesita audio/sfx/whoosh.mp3).
      · CLIPING_AUDIO -> cama musical por mood (necesita audio/music/<track>.mp3).
    Se pueden combinar. El usuario igual puede sumar audio de tendencia al postear en IG/TikTok."""
    sfx = bool(os.getenv("CLIPING_SFX"))
    music = bool(os.getenv("CLIPING_AUDIO"))
    if not (sfx or music):
        return spec
    audio = {"whoosh": sfx, "whooshVolume": 0.45}
    if music:
        audio["music"] = MOOD_TRACK.get(mood, "calm")
        audio["musicVolume"] = 0.18
    spec.setdefault("audio", audio)
    return spec
LENGTH_SCENES = {"corto": (3, 4), "medio": (4, 5), "largo": (5, 6)}

# Variantes de layout por tipo de escena. Antes el peso estaba cargado a la default
# (ej. 2 de 3 la misma) -> casi siempre se veía igual. Ahora reparto parejo para que
# la variedad se note de verdad (el piso de calidad lo sostienen los componentes).
SCENE_VARIANTS = {
    "KineticStatement": ["center", "left", "bar"],
    "MockupShowcase": ["tiltLeft", "tiltRight", "flat"],
    "StatReveal": ["stack", "ring", "left"],
    "Comparison": ["sideBySide", "stacked", "split"],
    "Testimonial": ["card", "plain"],
    "SocialProof": ["arc", "row", "stack"],
    "FeatureList": ["cards", "bare", "numbered"],
    "LogoReveal": ["mark", "wordmark"],
    "IllustrationScene": ["center", "top"],
    "IntegrationCluster": ["hub", "orbit", "arc"],
    "ProcessSteps": ["flow", "cards"],
    "OfferPrice": ["stack", "tag"],
    "MapLocation": ["pin", "card"],
}

# Apertura sugerida según el estilo de edición -> empuja a que la estructura ROTE
# entre videos (es una sugerencia, no una imposición: si no encaja, el director elige).
OPENINGS = {
    "punchy":    "StatReveal con un dato fuerte, o un KineticStatement filoso",
    "historia":  "KineticStatement que plantee el problema",
    "showcase":  "MockupShowcase del producto, o un KineticStatement que prometa el resultado",
    "listicle":  "KineticStatement corto que anticipe la lista",
    "prueba":    "SocialProof o Testimonial si el sitio tiene datos reales; si no, KineticStatement",
    "contraste": "Comparison (sin esto vs con esto)",
    "ilustrado": "IllustrationScene como hero visual",
    "dato":      "StatReveal con un número real del sitio",
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

# Tipos de decoración de primer plano (flotantes). Se ROTAN por video (coherente: uno por video).
DECORS = ["pills", "orbs", "sparks", "rings", "chips", "cross"]


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
    seed = spec.get("seed", 0)
    # El cierre NO siempre con la estrella: si hay logo lo usa; si no, rota la decoración.
    marks = ["star", "initial", "ring", "dot", "none"]
    for s in spec.get("scenes", []):
        t = s.get("type")
        if logo and t in ("LogoReveal", "CtaOutro") and not s.get("logo"):
            s["logo"] = logo
        if t == "CtaOutro" and not s.get("mark"):
            s["mark"] = marks[seed % len(marks)]  # fallback variado (la escena usa el logo si existe)
    return spec

# Catálogo de escenas disponibles (se le pasa a la IA para que componga).
SCENE_CATALOG = """ESCENAS DISPONIBLES (type + props):
- "KineticStatement": frase de impacto. props: lines = array de líneas; cada línea
  es array de segmentos { "t": "texto", "accent": true|false }. La palabra/grupo
  clave va con accent:true. IMPORTANTE: incluí los espacios DENTRO del texto del
  segmento (ej: [{"t":"Comé "},{"t":"mejor","accent":true}]) para que no se peguen.
  props opcional: subtitle. UNA sola idea por escena (no metas 2 frases).
  props opcional: reveal = "type" -> el texto aparece TIPEADO (como si lo escribieran
  en el momento, con cursor parpadeante). Es un efecto OCASIONAL: NO lo uses por defecto ni en
  la mayoría de los videos. Como mucho en 1 escena, y solo si le aporta intención a esa frase
  puntual. La inmensa mayoría de las frases van SIN reveal (aparición normal).
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
- "IllustrationScene": ilustración hero (estilo flat) con cámara, puntos flotantes y subtítulo.
  props: title = segmentos { t, accent }; opcional subtitle = string corto (da contexto y llena
  la escena, MUY recomendado). name = UNA de: "organic" (natural/saludable/plantas),
  "care" (salud/cuidado/bienestar), "quality" (confianza/calidad/garantía), "growth"
  (crecimiento/resultados), "audience" (público/comunidad), "connect" (integración/red),
  "idea" (idea/innovación), "launch" (lanzamiento/startup). ELEGÍ el name que MATCHEE el rubro:
  ej dietética/salud -> "organic" o "care" (NUNCA "launch"/cohete); seguridad/servicios ->
  "quality"; software/startup -> "idea"/"launch". Si ningún name encaja, mejor NO uses esta escena.
- "CtaOutro": cierre. props: brand = nombre de marca, cta = llamado a la acción corto y con
  ACCIÓN concreta (ej: "Pedí en yerco.ar", "Agendá tu demo", "Escribinos por WhatsApp").
  Prop OPCIONAL "urgency": una línea corta de urgencia/escasez SOLO si el propósito es
  conversión/ventas/oferta (ej: "Solo esta semana", "Cupos limitados", "Oferta por tiempo limitado").
  NO inventes urgencia falsa: usala solo si el contexto la respalda o el propósito lo amerita.
  (El logo real del sitio y la decoración del cierre se inyectan solos; NO los pongas.)
- "ProcessSteps": flujo de pasos 1->2->3 ("cómo funciona" / el proceso, secuencial — NO es una
  lista de features). props: opcional title = segmentos { t, accent }; steps = array de 3-4
  { label: [segmentos {t,accent}] } cortos. Ideal para servicios o "así de fácil es".
- "OfferPrice": oferta/precio (ideal ECOMMERCE). props: opcional badge = string corto ("OFERTA",
  "-20%"); opcional title = segmentos; price = string (ej "$15.000"); opcional oldPrice = string
  tachado; opcional caption = string ("Envío gratis · Solo esta semana"). USALA SOLO si el sitio
  tiene un PRECIO REAL (aparece en el contexto); si inventás el precio, se descarta.
- "MapLocation": ubicación estilizada para negocios LOCALES (mapa abstracto + pin que cae).
  props: city = string ("Villa Allende"); opcional area = string ("Córdoba · Av. San Martín 123");
  opcional label = segmentos ("Te esperamos"). USALA SOLO si es claramente un negocio físico/local
  con ubicación; NO inventes direcciones."""

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
- Seguí el ESTILO DE EDICIÓN del brief: define qué escenas protagonizan y el ritmo.
  No uses siempre el mismo esqueleto. Variá de verdad la estructura entre videos.
- "MockupShowcase": usalo SOLO si hay un producto/web que mostrar Y el estilo lo pide
  (no en todos los videos).
- "ProductShowcase": muestra FOTOS REALES del sitio (producto/hero/lifestyle) con movimiento.
  Usalo cuando el sitio sea visual (ecommerce, gastronomía, productos, lugar) y la historia gane
  con ver el producto de verdad. prop OPCIONAL: title (1 frase corta). NO pongas "images": las
  fotos reales se inyectan solas desde el sitio. Si la marca no es visual, NO uses esta escena.
- "IconTransform" es el beat más vistoso, pero NO es obligatorio: usalo como mucho UNA vez
  y solo cuando haya un contraste/transformación real y el estilo lo favorezca. Muchos
  videos NO lo llevan.
- Aprovechá TODO el repertorio según lo que cuente la página y el estilo de edición:
  · "StatReveal" si el sitio menciona un número fuerte (años, clientes, %, velocidad).
  · "FeatureList" para 3-4 features/beneficios concretos de un saque.
  · "Comparison" para un antes/después o "sin esto vs con esto" claro.
  · "Testimonial" SOLO si hay reseñas/testimonios reales en el sitio.
  · "SocialProof" si hay señales de adopción/confianza (clientes, comunidad).
  · "IllustrationScene" como hero visual cuando no haya screenshot ni datos para Stat.
  Elegí las que de verdad sumen a la historia; no repitas el mismo combo siempre.
- ANTI-FÓRMULA (CRÍTICO, leé esto): el error más común es armar SIEMPRE el mismo esqueleto
  (Hook -> Comparison -> FeatureList -> CtaOutro). NO lo hagas. "Comparison" y "FeatureList"
  son OPCIONALES, no obligatorias: NO las uses a las dos en el mismo video por defecto, y
  MUCHOS videos no deberían llevar NINGUNA de las dos. Pensá qué combinación cuenta MEJOR a
  ESTA marca puntual y animate a estructuras distintas (ej: KineticStatement -> IllustrationScene
  -> KineticStatement -> CtaOutro; o StatReveal -> IconTransform -> KineticStatement -> CtaOutro).
  Si dos marcas distintas terminan con el mismo esqueleto, fallaste.
- HONESTIDAD (CRÍTICO): StatReveal, Testimonial y SocialProof muestran "hechos". El número
  de un StatReveal y cualquier cifra/cita/nombre TIENE que aparecer textualmente en el
  CONTEXTO DEL SITIO que te paso. NO uses datos que "sabés" de memoria sobre marcas conocidas.
  Ejemplo de lo que NO hay que hacer: para Google poner StatReveal "8.500.000.000 búsquedas
  por día" o para YouTube "2.700M usuarios" -> eso es INVENTADO aunque suene real; NO lo hagas.
  Si el contexto del sitio no trae un número/reseña concreto, NO uses StatReveal/Testimonial/
  SocialProof: contá el beneficio con KineticStatement/FeatureList/Comparison en su lugar.
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


_SKIP_KEYS = {"type", "variant", "logo", "mark", "reveal", "durationInFrames",
              "accent", "icon", "seed", "art", "color", "image", "src"}
_NUM_KEYS = {"value"}  # los números se leen rápido, cuentan poco


def _collect_text(node) -> list:
    """Junta el texto VISIBLE de una escena (recursivo) para estimar tiempo de lectura."""
    parts = []
    if isinstance(node, str):
        parts.append(node)
    elif isinstance(node, list):
        for x in node:
            parts.extend(_collect_text(x))
    elif isinstance(node, dict):
        for k, v in node.items():
            if k in _SKIP_KEYS:
                continue
            if isinstance(v, (list, dict)):
                parts.extend(_collect_text(v))
            elif isinstance(v, str):
                parts.append(v if k not in _NUM_KEYS else " ")
    return parts


def _min_duration(s: dict) -> int:
    """Piso de duración por escena según el TIEMPO DE LECTURA real del texto. El término fijo (90f)
    cubre el overhead de entrada+salida que NO se lee, así el tiempo legible alcanza. Piso ~4s."""
    t = s.get("type")
    txt = " ".join(_collect_text(s))
    words = len([w for w in txt.split() if w])
    read = int(0.52 * words * 30)          # ~0.52s por palabra (antes 0.42, no se llegaba a leer)
    floor = 120                            # ~4s mínimo
    if words >= 8:
        floor += 30                        # +1s extra a las escenas con más texto
    if t in ("FeatureList", "Comparison"):
        n = len(s.get("items") or []) + len(s.get("leftItems") or []) + len(s.get("rightItems") or [])
        floor = max(floor, 110 + n * 18)
    return int(min(240, max(floor, 90 + read)))


# Duración EXACTA elegida por el usuario -> cuántas escenas usar para que entre bien.
SECONDS_SCENES = {10: 3, 15: 4, 20: 5}


def _fit_duration(spec: dict, target_frames: int) -> dict:
    """Reescala las duraciones de las escenas para que el total del video (contando el
    solape FADE entre cortes) sea EXACTAMENTE target_frames. Reparte proporcional al
    piso de lectura de cada escena, así las de más texto se llevan más tiempo."""
    scenes = spec.get("scenes", [])
    n = len(scenes)
    if n == 0:
        return spec
    needed = target_frames + (n - 1) * FADE  # sum(durations) requerido (compute_total invertido)
    mins = [_min_duration(s) for s in scenes]
    sm = sum(mins) or n
    if needed <= sm:
        durs = [max(45, round(needed * (mn / sm))) for mn in mins]
    else:
        surplus = needed - sm
        durs = [mn + round(surplus * (mn / sm)) for mn in mins]
    # corregir el drift de redondeo en la última -> total exacto
    durs[-1] += needed - sum(durs)
    if durs[-1] < 45:  # si quedó muy corta, mover el ajuste a la escena más larga
        durs[-1] = 45
        k = durs.index(max(durs))
        durs[k] += needed - sum(durs)
    for s, d in zip(scenes, durs):
        s["durationInFrames"] = int(d)
    return spec


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
                   "StatReveal", "FeatureList", "Comparison", "Testimonial", "SocialProof", "LogoReveal",
                   "IllustrationScene", "ProcessSteps", "OfferPrice", "MapLocation", "ProductShowcase"}
    # Antídoto contra info inventada: si el dato no está en el sitio, no se muestra como hecho.
    hay = " ".join([
        url_data.get("context", ""), url_data.get("description", ""),
        url_data.get("headline", ""), " ".join(url_data.get("sections") or []),
        " ".join(url_data.get("paragraphs") or []), url_data.get("bodyText", ""),
        " ".join(url_data.get("prices") or []), " ".join(url_data.get("claims") or []),
        desarrollo or "",
    ]).lower()
    hay_nums = [re.sub(r"\D", "", g) for g in re.findall(r"\d[\d.,]*", hay)]
    has_reviews = bool(re.search(r"rese|testimoni|opini|review|estrella|calific|★|⭐", hay))

    clean = []
    for s in scenes:
        if not isinstance(s, dict) or s.get("type") not in valid_types:
            continue
        t = s.get("type")
        # StatReveal con un número que NO aparece en el sitio = inventado -> pasar a frase.
        if t == "StatReveal":
            vd = re.sub(r"\D", "", str(s.get("value", "")))
            if len(vd) >= 2 and not any(vd in g for g in hay_nums):
                if s.get("label"):
                    s = {"type": "KineticStatement", "lines": [s["label"]], "durationInFrames": s.get("durationInFrames", 90)}
                elif s.get("caption"):
                    s = {"type": "KineticStatement", "lines": [[{"t": s["caption"]}]], "durationInFrames": s.get("durationInFrames", 90)}
                else:
                    continue  # sin texto rescatable -> descartar
                t = "KineticStatement"
        # Testimonial sin señales de reseñas reales en el sitio -> descartar (no inventar).
        if t == "Testimonial" and not has_reviews:
            continue
        # OfferPrice con un precio que NO aparece en el sitio = inventado -> descartar (o pasar
        # a frase si hay titular). No mostramos precios falsos.
        if t == "OfferPrice":
            pd = re.sub(r"\D", "", str(s.get("price", "")))
            if len(pd) < 2 or not any(pd in g for g in hay_nums):
                if s.get("title"):
                    s = {"type": "KineticStatement", "lines": [s["title"]], "durationInFrames": s.get("durationInFrames", 90)}
                    t = "KineticStatement"
                else:
                    continue
        d = s.get("durationInFrames", 90)
        try:
            d = int(d)
        except Exception:
            d = 90
        d = max(_min_duration(s), min(170, d))
        if t == "IllustrationScene":
            d = min(d, 105)  # hero visual: corto, que no se cuelgue en el vacío
        s["durationInFrames"] = d
        clean.append(s)
    if len(clean) < 2:
        return fb
    # Red de seguridad anti-repetición: como MUCHO una escena de lista por video.
    # (FeatureList/Comparison son las que "se ven iguales" entre videos.)
    seen_list = False
    capped = []
    for s in clean:
        if s.get("type") in ("FeatureList", "Comparison"):
            if seen_list:
                continue  # ya hay una lista -> descartamos la extra
            seen_list = True
        capped.append(s)
    clean = capped if len(capped) >= 2 else clean
    # La PRIMERA escena nunca debe ser pesada (lista/comparación): no engancha. Si quedó así,
    # la cambiamos por el primer hook liviano que haya.
    HEAVY = {"FeatureList", "Comparison"}
    LIGHT = {"KineticStatement", "StatReveal", "IconTransform", "IllustrationScene", "ProcessSteps"}
    if clean and clean[0].get("type") in HEAVY:
        for i in range(1, len(clean)):
            if clean[i].get("type") in LIGHT:
                clean[0], clean[i] = clean[i], clean[0]
                break
    brand = spec.get("brand") or fb["brand"]
    for s in clean:
        if s.get("type") == "CtaOutro" and not s.get("brand"):
            s["brand"] = brand
    return {"theme": theme, "brand": brand, "scenes": clean}


def _name_from_title(title: str) -> str:
    """Marca a partir del <title> (toma lo de antes del separador típico)."""
    return re.split(r"[|\-–—·:]", title or "")[0].strip()[:60]


_PRICE_RE = re.compile(r"(?:US?\$|AR\$|\$|€|USD|EUR|ARS)\s?\d[\d.,]*", re.I)
_CLAIM_RE = re.compile(
    r"(?:\+\s?)?\d[\d.,]*\s?(?:años|año|clientes|usuarios|productos|proyectos|"
    r"pa[ií]ses|marcas|millones|mil|%|estrellas|opiniones|rese[ñn]as|env[ií]os|ventas)",
    re.I)
_RATING_RE = re.compile(r"\b[1-5][.,]\d\b")


def _extract_prices(text: str) -> list:
    out = []
    for m in _PRICE_RE.findall(text or ""):
        v = m.strip().rstrip(".,")
        if v not in out:
            out.append(v)
        if len(out) >= 6:
            break
    return out


def _extract_claims(text: str) -> list:
    out = []
    for rx in (_CLAIM_RE, _RATING_RE):
        for m in rx.findall(text or ""):
            v = m.strip()
            if v and v not in out:
                out.append(v)
    return out[:8]


_SITE_CACHE = {}          # url -> (timestamp, data)
_SITE_TTL = 1800          # 30 min: varios videos de la MISMA marca no re-scrapean


async def analyze_site_rich(url: str, prefetched: dict = None) -> dict:
    """Wrapper con cache por URL (TTL 30 min). Si llega `prefetched` (texto ya extraído por una
    carga de browser previa, p.ej. capture_all), lo usa y evita re-cargar. Varios videos de la
    misma marca tampoco re-scrapean."""
    import time
    now = time.time()
    if prefetched is None:
        hit = _SITE_CACHE.get(url or "")
        if hit and (now - hit[0]) < _SITE_TTL:
            return hit[1]
    out = await _analyze_site_rich_uncached(url, prefetched=prefetched)
    if url:
        _SITE_CACHE[url] = (now, out)
    return out


async def _analyze_site_rich_uncached(url: str, prefetched: dict = None) -> dict:
    """
    Lectura PROFUNDA del sitio para que el director escriba copy específico y real.
    Primario: texto YA RENDERIZADO vía Chromium (sirve para SPAs React/Vue/Next que
    devuelven HTML vacío). Fallback: scrape liviano + httpx. Extrae además precios y
    datos reales (años, clientes, ratings) para StatReveal/SocialProof honestos.
    """
    out = {"siteName": "", "headline": "", "themeColor": "", "description": "",
           "sections": [], "nav": [], "paragraphs": [], "prices": [], "claims": [],
           "lang": "", "logo": "", "bodyText": "", "context": ""}
    if not url:
        return out

    rich = None
    if prefetched and isinstance(prefetched, dict):
        rich = prefetched          # texto ya extraído (capture_all) -> no recargamos browser
    else:
        try:
            import site_capture
            rich = await site_capture.extract_content(url)
        except Exception as e:
            print(f"[director] extract_content no disponible: {e}")

    if rich and (rich.get("bodyText") or rich.get("headings")):
        heads = rich.get("headings") or []
        out["siteName"] = rich.get("siteName") or _name_from_title(rich.get("title", ""))
        out["headline"] = heads[0] if heads else ""
        out["description"] = rich.get("description", "")
        out["themeColor"] = rich.get("themeColor", "")
        out["logo"] = rich.get("logo", "")
        out["lang"] = rich.get("lang", "")
        out["sections"] = heads[:8]
        out["nav"] = (rich.get("nav") or [])[:10]
        out["paragraphs"] = (rich.get("paragraphs") or [])[:8]
        out["bodyText"] = rich.get("bodyText", "")
    else:
        # Fallback sin browser: scrape liviano + httpx (lo de siempre).
        base = await cine_generator.analyze_url_light(url)
        out["siteName"] = base.get("siteName", "")
        out["headline"] = base.get("headline", "")
        out["themeColor"] = base.get("themeColor", "")
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
            out["bodyText"] = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", html.unescape(t)))[:4000]

            def grab_attr(pat):
                m = re.search(pat, t, re.I)
                return m.group(1).strip() if m else ""

            cand = (
                grab_attr(r'<link[^>]+rel=["\'][^"\']*apple-touch-icon[^"\']*["\'][^>]*href=["\']([^"\']+)')
                or grab_attr(r'<link[^>]+href=["\']([^"\']+)["\'][^>]*rel=["\'][^"\']*apple-touch-icon')
                or grab_attr(r'property=["\']og:image["\'][^>]*content=["\']([^"\']+)')
                or grab_attr(r'<link[^>]+rel=["\'][^"\']*icon[^"\']*["\'][^>]*href=["\']([^"\']+)')
            ) or "/favicon.ico"
            try:
                from urllib.parse import urljoin
                out["logo"] = urljoin(str(r.url), cand)
            except Exception:
                out["logo"] = ""
        except Exception as e:
            print(f"[director] analyze_site_rich httpx: {e}")

    # Datos reales (precios / claims) desde TODO el texto disponible -> copy honesto y específico.
    text_all = " ".join([out["bodyText"], out["description"], " ".join(out["sections"]),
                         " ".join(out["paragraphs"])])
    out["prices"] = _extract_prices(text_all)
    out["claims"] = _extract_claims(text_all)

    ctx = []
    if out["siteName"]:    ctx.append(f"Marca: {out['siteName']}")
    if out["headline"]:    ctx.append(f"Titular: {out['headline']}")
    if out["description"]: ctx.append(f"Descripción: {out['description']}")
    if out["sections"]:    ctx.append("Secciones: " + " · ".join(out["sections"]))
    if out["nav"]:         ctx.append("Menú: " + " · ".join(out["nav"]))
    if out["paragraphs"]:  ctx.append("Frases del sitio: " + " | ".join(out["paragraphs"][:6]))
    if out["prices"]:      ctx.append("Precios reales: " + " · ".join(out["prices"]))
    if out["claims"]:      ctx.append("Datos reales (usalos, no inventes): " + " · ".join(out["claims"]))
    out["context"] = "\n".join(ctx)
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


BRAND_SYSTEM = """Sos estratega de marca. A partir del contexto de un sitio, extraé los HECHOS de la
marca (lo estable, NO el video puntual). Escribí en español rioplatense (voseo), salvo que el contexto
esté claramente en otro idioma.
Formato EXACTO (sin markdown, sin texto extra, una línea por campo):
INDUSTRIA: <el rubro en 1-3 palabras: ej "dietética/comida", "software SaaS", "clínica de salud", "gimnasio", "tienda de ropa", "inmobiliaria">
QUÉ VENDE: <una frase concreta>
DIFERENCIAL: <qué los hace distintos, una frase>
PRUEBAS REALES: <datos/precios/claims reales que aparezcan en el contexto, o 'ninguna'>
TONO: <2-3 adjetivos del tono de la marca>
Si el contexto es pobre, inferí lo razonable del rubro, pero NO inventes datos numéricos."""

CREATIVE_SYSTEM = """Sos director creativo. Te paso los HECHOS de una marca y (si lo hay) el PEDIDO DEL
USUARIO. Devolvé la dirección creativa para UN video de marketing concreto. Español rioplatense (voseo),
salvo que los hechos estén en otro idioma.
PRIORIDAD ABSOLUTA: si hay un PEDIDO DEL USUARIO, ese pedido MANDA sobre todo lo demás. El objetivo, la
oferta, el público y el tono del video se subordinan a lo que pidió. Si nombra una oferta/producto/promo
puntual, el video gira alrededor de eso. Si pide un público o un tono, respetalos aunque difieran del
default del rubro. Si pide evitar algo, no lo incluyas.
Formato EXACTO (sin markdown, sin texto extra, una línea por campo):
PÚBLICO: <a quién le habla ESTE video (si el usuario lo indicó, ESE; si no, el público natural de la marca)>
OBJETIVO: <qué tiene que LOGRAR el video: vender X / lanzar Y / traer registros / dar a conocer Z. Si el usuario lo dijo, usá eso>
CONCEPTO: <la UNA idea creativa central del video, en una frase (el hilo conductor)>
MOMENTO HÉROE: <el momento que frena el scroll: qué dato/frase/imagen es el golpe de efecto>
MENSAJES CLAVE: <3 mensajes separados por ' | ', priorizando lo que pidió el usuario>
HOOK: <una idea de gancho potente para los primeros 2 segundos, alineada al OBJETIVO>
EVITAR: <qué NO incluir si el usuario lo pidió, o 'nada'>"""


def _sys_cached(text: str):
    """System como bloque CACHEABLE (prompt caching de Anthropic): en llamadas seguidas (ventana ~5 min)
    el input del system se cobra ~10% en vez de 100%. Ideal para el system grande y fijo del director."""
    return [{"type": "text", "text": text, "cache_control": {"type": "ephemeral"}}]


async def _analyze_brand(url_data: dict, usage: list = None) -> str:
    """Hechos de marca (INDUSTRIA/QUÉ VENDE/DIFERENCIAL/PRUEBAS/TONO). Estables por URL e independientes
    del pedido -> CACHEABLES. Best-effort: si falla, devuelve ''."""
    contexto = url_data.get("context") or f"Marca: {url_data.get('siteName') or 'desconocido'}"
    try:
        resp = await _client.messages.create(
            model=DIRECTOR_MODEL, max_tokens=350, temperature=0.3,
            system=BRAND_SYSTEM,
            messages=[{"role": "user", "content": f"CONTEXTO DEL SITIO:\n{contexto}"}],
        )
        _acc_usage(usage, "brand_facts", DIRECTOR_MODEL, resp)
        return (resp.content[0].text or "").strip()
    except Exception as e:
        print(f"[director] análisis de marca falló ({e})")
        return ""


async def _creative_brief(brand_block: str, desarrollo: str, proposito: str, usage: list = None) -> str:
    """Dirección creativa para ESTE video (PÚBLICO/OBJETIVO/CONCEPTO/HÉROE/MENSAJES/HOOK/EVITAR).
    Depende del pedido -> FRESCA en cada video. Best-effort: si falla, devuelve ''."""
    extra = (f'\n\n>>> PEDIDO DEL USUARIO (PRIORIDAD ABSOLUTA, manda sobre todo):\n"{desarrollo.strip()}"'
             if (desarrollo or "").strip() else "")
    body = f"PROPÓSITO: {proposito}\n\nHECHOS DE LA MARCA:\n{brand_block or '(poco contexto disponible)'}{extra}"
    try:
        resp = await _client.messages.create(
            model=DIRECTOR_MODEL, max_tokens=400, temperature=0.5,
            system=CREATIVE_SYSTEM,
            messages=[{"role": "user", "content": body}],
        )
        _acc_usage(usage, "creative", DIRECTOR_MODEL, resp)
        return (resp.content[0].text or "").strip()
    except Exception as e:
        print(f"[director] brief creativo falló ({e})")
        return ""


async def _build_brief(url_data: dict, desarrollo: str, proposito: str, usage: list = None,
                       cached_brand: str = None):
    """Paso 1 (entender): HECHOS de marca (cacheables por URL) + dirección CREATIVA (fresca por pedido).
    Devuelve (brief_txt, brand_block); brand_block se cachea para no re-analizar la misma página.
    Best-effort: si algo falla, devuelve lo que tenga y el storyboard se arma del contexto."""
    if cached_brand:
        brand_block = cached_brand
        print("[director] hechos de marca: usando CACHE (skip análisis de marca)")
    else:
        brand_block = await _analyze_brand(url_data, usage=usage)
    creative = await _creative_brief(brand_block, desarrollo, proposito, usage=usage)
    brief_txt = "\n".join([b for b in (brand_block, creative) if b]).strip()
    return brief_txt, brand_block


def _parse_spec(raw: str):
    """Extrae el primer objeto JSON del texto. None si no hay o no parsea."""
    if not raw:
        return None
    m = re.search(r"\{.*\}", raw, re.S)
    if not m:
        return None
    try:
        return json.loads(m.group(0))
    except Exception:
        return None


async def build_storyboard(url: str, desarrollo: str, proposito: str = "marketing",
                           theme_override: str = "", tone: str = "",
                           length: str = "medio", seconds: int = 0, simple: bool = True,
                           recent_profile: dict = None, prefetched_site: dict = None,
                           idioma: str = "", rating_bias: dict = None, usage: list = None,
                           dna: dict = None, cached_brand: str = None, brand_sink: list = None) -> dict:
    """
    URL + desarrollo -> storyboard spec.

    Modo simple: el director elige ángulo/mood/paleta/arte ROTANDO respecto de los videos
    recientes de la misma marca, así dos videos del mismo rubro NO se sienten iguales.
    Modo avanzado: respeta los parámetros del usuario como restricciones, con menos azar.
    """
    url_data = await analyze_site_rich(url, prefetched=prefetched_site)

    rp = recent_profile or {}
    rec_styles = rp.get("styles") or []
    rec_angles = rp.get("angles") or []
    rec_themes = rp.get("themes") or []
    rec_arts = rp.get("arts") or []
    rec_decors = rp.get("decors") or []
    rec_hooks = rp.get("hooks") or []
    rec_arcs = rp.get("arcs") or []
    rb = rating_bias or {}

    lo, hi = LENGTH_SCENES.get(length, LENGTH_SCENES["medio"])
    n_scenes = SECONDS_SCENES.get(seconds) or random.randint(lo, hi)

    if simple:
        angle = _pick_smart(CREATIVE_ANGLES, rec_angles, net=rb.get("angles"))
        mood = random.choice(MOODS)
        edit = pick_edit_style(rec_styles)
        temperature = 0.95
    else:
        angle = "según las indicaciones del usuario"
        mood = tone or random.choice(MOODS)
        edit = pick_edit_style(rec_styles)
        temperature = 0.6

    # Dirección de ARTE rotada (cámara + entrada + atmósfera), evitando las recientes + sesgo rating.
    art_preset = _pick_smart(ART_PRESETS, rec_arts, net=rb.get("arts"), key="name")
    art_name = art_preset.get("name", "")
    # Decoración de primer plano rotada por separado (más combinaciones, coherente por video).
    decor = _pick_smart(DECORS, rec_decors, net=rb.get("decors"))
    # HOOK rotado (swipe file): patrón de apertura probado, distinto del/los recientes.
    hook = _pick_smart(HOOK_ARCHETYPES, rec_hooks, net=rb.get("hooks"), key="name")
    # ARCO narrativo rotado entre los que encajan con el propósito (estructura + variedad).
    _arc_pool = PURPOSE_ARCS.get((proposito or "").lower(), PURPOSE_ARCS["marketing"])
    arc_name = _pick_smart(_arc_pool, rec_arcs, net=rb.get("arcs"))
    arc_guide = NARRATIVE_ARCS.get(arc_name, "")

    brief = (
        f"Dirección creativa para ESTE video (hacelo único, no formulaico):\n"
        f"- Ángulo narrativo: {angle}\n"
        f"- Mood: {mood}\n"
        f"- Estilo de edición: {edit[0]} — {edit[1]}\n"
        f"- Apertura sugerida (si encaja con ESTA marca): {OPENINGS.get(edit[0], 'el HOOK que más enganche')}\n"
        f"- Apuntá a unas {n_scenes} escenas."
    )
    if theme_override in VALID_THEMES:
        brief += f"\n- Theme OBLIGATORIO: {theme_override}"
    elif rec_themes:
        brief += f"\n- Paletas usadas hace poco para esta marca (elegí una DISTINTA): {', '.join(rec_themes[:2])}"

    extra = (f'\n\n>>> LO QUE PIDIÓ EL USUARIO (PRIORIDAD ABSOLUTA — el video DEBE cumplir esto; '
             f'manda sobre el arco, el hook y los defaults sugeridos más abajo):\n"{desarrollo.strip()}"'
             if desarrollo.strip() else "")
    contexto = url_data.get("context") or f"Marca: {url_data.get('siteName') or 'desconocido'}"
    _lang = (url_data.get("lang") or "").lower()
    _LANG_NAME = {"es": "español rioplatense (voseo)", "en": "inglés", "pt": "portugués"}
    if idioma:
        # El usuario eligió un idioma explícito -> manda sobre el idioma del sitio.
        lang_hint = (f"\nIDIOMA OBLIGATORIO: escribí TODO el copy en {_LANG_NAME.get(idioma, idioma)}, "
                     f"sin importar el idioma del sitio.")
    else:
        lang_hint = (f"\nIDIOMA: el sitio está en '{_lang}' — escribí TODO el copy en ese idioma."
                     if _lang and not _lang.startswith("es") else "")

    # Paso 1 (entender la marca): brief estratégico. Paso 2 (guionar): el storyboard.
    brief_txt, _brand_block = await _build_brief(url_data, desarrollo, proposito, usage=usage, cached_brand=cached_brand)
    if brand_sink is not None:
        brand_sink.append(_brand_block)   # para que main.py lo cachee (no re-analizar la misma URL)
    brief_block = f"\nBRIEF ESTRATÉGICO (basate en esto, es la lectura de la marca):\n{brief_txt}\n" if brief_txt else ""

    # Playbook del rubro: lo elige el brief (INDUSTRIA/PÚBLICO). Es la guía de marketing para ESE público.
    _industria = _brief_field(brief_txt, "INDUSTRIA")
    _publico = _brief_field(brief_txt, "PÚBLICO") or _brief_field(brief_txt, "PUBLICO")
    _pb = playbooks.pick(_industria, _publico)
    playbook_block = f"\n{_pb['guide']}\n"
    print(f"[director] rubro='{_industria}' publico='{_publico}' -> playbook={_pb['key']} (energía {_pb['energy']})")

    # Concepto + momento héroe (del brief): el hilo creativo y el golpe que frena el scroll.
    _concepto = _brief_field(brief_txt, "CONCEPTO")
    _heroe = _brief_field(brief_txt, "MOMENTO HÉROE") or _brief_field(brief_txt, "MOMENTO HEROE")
    concepto_block = ""
    if _concepto or _heroe:
        concepto_block = "\nCONCEPTO CREATIVO (que todo el video gire alrededor de esto):"
        if _concepto:
            concepto_block += f"\n- Idea central: {_concepto}"
        if _heroe:
            concepto_block += f"\n- Momento héroe (el golpe que frena el scroll): {_heroe} — dale a esto la escena más fuerte."

    # ADN visual del sitio (el "alma"): mood + vibra para que el video se sienta de la marca.
    dna_block = ""
    if dna and (dna.get("summary") or dna.get("mood")):
        _mood = ", ".join(dna.get("mood") or []) if isinstance(dna.get("mood"), list) else (dna.get("mood") or "")
        dna_block = ("\nALMA VISUAL DEL SITIO (replicá esta estética para que el video se sienta de la marca):"
                     f"\n- {dna.get('summary','')}"
                     f"\n- Estética: {_mood} | energía visual: {dna.get('energy','')} | densidad: {dna.get('density','')}"
                     "\nEl ritmo y el tono del video tienen que ir con esta estética.")

    # Energía efectiva: la del playbook, salvo que el ADN visual diga otra cosa.
    _energy = (dna or {}).get("energy") or _pb["energy"]
    energy_block = {
        "alto": "\nENERGÍA: ALTA -> escenas más cortas y punchy, frases filosas, ritmo rápido.",
        "bajo": "\nENERGÍA: BAJA -> más aire, ritmo calmo y elegante, frases que respiran.",
    }.get(_energy, "\nENERGÍA: MEDIA -> ágil pero legible.")

    user_prompt = f"""PROPÓSITO: {proposito}
URL: {url}

CONTEXTO DEL SITIO (usalo para escribir copy específico y real, no genérico):
{contexto}{extra}{lang_hint}
{brief_block}{playbook_block}{concepto_block}{dna_block}{energy_block}
{brief}

OBJETIVO DEL VIDEO ({proposito}): {PURPOSE_GUIDE.get((proposito or '').lower(), PURPOSE_GUIDE['marketing'])}

ESTRUCTURA SUGERIDA (seguí este arco, adaptándolo a ESTA marca; no lo recites literal):
{arc_guide}

EL HOOK MANDA (primeros 1-3 segundos = la señal #1 del algoritmo): usá ESTE patrón de apertura
para la PRIMERA escena, adaptado a la marca y su público:
>> {hook['guide']} (ejemplo de forma, NO de contenido: "{hook['ex']}")
La primera escena es CORTA y filosa (KineticStatement / StatReveal con dato real / IllustrationScene).
NUNCA arranques con Comparison ni FeatureList (pesadas de texto, no enganchan). Si la apertura
es débil o larga, nadie ve el resto.

Generá el storyboard JSON. El copy tiene que sonar a ESTA marca puntual (usá el brief y lo que
sabés del sitio), reflejar el ángulo, el mood y el playbook del rubro, y respetar las reglas de
líneas cortas.

REGLA QUE MANDA SOBRE TODO: si hay un PEDIDO DEL USUARIO o un OBJETIVO en el brief, el video tiene
que cumplirlo SÍ O SÍ. Ante cualquier conflicto entre lo que pidió el usuario y la estructura/hook/
defaults sugeridos acá, GANA el usuario: adaptá el arco, el hook y las escenas para servir su pedido
y su objetivo. Si pidió una oferta puntual, esa oferta es el corazón del video y el CTA. Si pidió
evitar algo, no aparece."""

    def _tag(out):
        """Anota las variables elegidas para que main.py actualice la memoria de rotación."""
        out["editStyle"] = edit[0]
        out["angle"] = angle
        out["artName"] = art_name
        out["decorName"] = decor
        out["hookName"] = hook["name"]
        out["arcName"] = arc_name
        # Asegurar que el arte lleve la decoración elegida (coherente en todas las escenas).
        if isinstance(out.get("art"), dict):
            out["art"].setdefault("decor", decor)
        return out

    try:
        resp = await _client.messages.create(
            model=DIRECTOR_MODEL, max_tokens=2200, temperature=temperature,
            system=_sys_cached(DIRECTOR_SYSTEM),
            messages=[{"role": "user", "content": user_prompt}],
        )
        spec = _parse_spec(resp.content[0].text.strip())
        _acc_usage(usage, "director", DIRECTOR_MODEL, resp)
        if spec is None:
            resp2 = await _client.messages.create(
                model=DIRECTOR_MODEL, max_tokens=2200, temperature=min(temperature, 0.5),
                system=_sys_cached(DIRECTOR_SYSTEM),
                messages=[{"role": "user", "content": user_prompt
                           + "\n\nIMPORTANTE: respondé SOLO el JSON del storyboard, sin texto antes ni después."}],
            )
            _acc_usage(usage, "director_retry", DIRECTOR_MODEL, resp2)
            spec = _parse_spec(resp2.content[0].text.strip())
        spec = _normalize(spec, url_data, desarrollo, proposito)
        # Paleta: el usuario manda; si no, el ADN visual (el "alma"); si no, evitar repetir reciente.
        _dna = dna or {}
        if theme_override in VALID_THEMES:
            spec["theme"] = theme_override
        elif _dna.get("theme") in VALID_THEMES:
            spec["theme"] = _dna["theme"]
            print(f"[director] theme por ADN visual -> {_dna['theme']}")
        elif spec.get("theme") in set(rec_themes[:2]):
            spec["theme"] = _pick_avoiding(list(VALID_THEMES), rec_themes, n=2)
        # Acento real del sitio (del ADN visual) -> el color de marca pega con la página.
        if brand_dna._hex_ok(_dna.get("accent", "")):
            spec["accent"] = _dna["accent"]
            print(f"[director] accent por ADN visual -> {_dna['accent']}")
        spec["energy"] = _dna.get("energy") or _pb["energy"]
        # QA determinista: detecta y autocorrige lo que si no requeriría ajuste a ojo.
        _issues = _qa_spec(spec)
        print("[qa] " + (" | ".join(_issues) if _issues else "OK"))
        # Arte rotado (si el director no impuso uno).
        spec.setdefault("art", {k: v for k, v in art_preset.items() if k != "name"})
        if isinstance(spec.get("art"), dict):
            spec["art"]["energy"] = spec.get("energy", "medio")   # modula el movimiento (motion.js)
        spec = await _resolve_icons(spec)
        out = _attach_audio(_finalize(spec, url_data), mood)
        if seconds in SECONDS_SCENES:
            out = _fit_duration(out, seconds * 30)
        return _tag(out)
    except Exception as e:
        print(f"[director] fallback ({e})")
        fb = _fallback_spec(url_data, desarrollo, proposito)
        fb.setdefault("art", {k: v for k, v in art_preset.items() if k != "name"})
        out = _attach_audio(_finalize(fb, url_data), mood)
        if seconds in SECONDS_SCENES:
            out = _fit_duration(out, seconds * 30)
        return _tag(out)


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
    width={__WIDTH__}
    height={__HEIGHT__}
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

    # Formato de salida (9:16 vertical por defecto, 1:1 cuadrado, 16:9 horizontal).
    FORMATS = {"vertical": (1080, 1920), "square": (1080, 1080), "wide": (1920, 1080)}
    w, h = FORMATS.get(spec.get("format", "vertical"), FORMATS["vertical"])

    root_src = (_ROOT_TEMPLATE
                .replace("__SPEC_JSON__", json.dumps(spec, ensure_ascii=False))
                .replace("__TOTAL__", str(total))
                .replace("__COMPID__", comp_id)
                .replace("__WIDTH__", str(w))
                .replace("__HEIGHT__", str(h)))
    root_file = f"Root_vid_{short}.jsx"
    (remotion_dir / "src" / root_file).write_text(root_src, encoding="utf-8")
    temp_files.append(remotion_dir / "src" / root_file)

    entry_src = _ENTRY_TEMPLATE.replace("__ROOT_FILE__", root_file)
    entry_file = f"index_vid_{short}.jsx"
    (remotion_dir / entry_file).write_text(entry_src, encoding="utf-8")
    temp_files.append(remotion_dir / entry_file)

    return entry_file, comp_id, total, temp_files
