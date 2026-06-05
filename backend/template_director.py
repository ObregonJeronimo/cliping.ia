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
LENGTH_SCENES = {"corto": (3, 4), "medio": (4, 5), "largo": (5, 6)}

# Variantes de layout por tipo de escena (azar curado: el piso de calidad no baja).
SCENE_VARIANTS = {
    "KineticStatement": ["center", "center", "center", "left"],
    "MockupShowcase": ["tiltLeft", "tiltLeft", "tiltRight", "flat"],
}


def _assign_variation(spec: dict) -> dict:
    """Semilla por video + variante de layout por escena -> dos videos nunca iguales."""
    spec["seed"] = random.randint(0, 9999)
    for s in spec.get("scenes", []):
        opts = SCENE_VARIANTS.get(s.get("type"))
        if opts and "variant" not in s:
            s["variant"] = random.choice(opts)
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
- "CtaOutro": cierre. props: brand = nombre de marca, cta = llamado a la acción corto."""

THEME_GUIDE = """THEMES (elegí 1 según el rubro):
- "saas-explainer": software, SaaS, apps, tech, plataformas, herramientas digitales.
- "organic-natural": comida saludable, dietética, productos naturales, bienestar, orgánico.
- "clinical-formal": médico, salud profesional, sistemas B2B serios, consultorios, finanzas, legal."""

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
- 4 a 6 escenas. La PRIMERA debe ser "KineticStatement" (hook). La ÚLTIMA "CtaOutro".
- Incluí "MockupShowcase" si hay un producto/web que mostrar.
- Incluí UN "IconTransform" cuando exista un contraste o transformación natural en el
  mensaje (en marketing casi siempre lo hay: antes/después, problema/solución, acción/
  resultado). Es el momento más vistoso del video. No lo fuerces solo si de verdad no pega.
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
- El storyboard debe contar una micro-historia coherente con el propósito."""


def _fallback_spec(url_data: dict, desarrollo: str, proposito: str) -> dict:
    brand = url_data.get("siteName") or "Tu marca"
    head = url_data.get("headline") or desarrollo or "Tu solución, simple"
    return {
        "theme": "saas-explainer",
        "brand": brand,
        "scenes": [
            {"type": "KineticStatement", "durationInFrames": 90,
             "lines": [[{"t": "Conocé "}, {"t": brand, "accent": True}]],
             "subtitle": head[:60]},
            {"type": "IntegrationCluster", "durationInFrames": 95,
             "title": [{"t": "Todo "}, {"t": "en un solo lugar", "accent": True}]},
            {"type": "MockupShowcase", "durationInFrames": 110,
             "title": [{"t": "Mirá cómo "}, {"t": "funciona", "accent": True}]},
            {"type": "CtaOutro", "durationInFrames": 80,
             "brand": brand, "cta": "Empezá hoy"},
        ],
    }


def _normalize(spec: dict, url_data: dict, desarrollo: str, proposito: str) -> dict:
    fb = _fallback_spec(url_data, desarrollo, proposito)
    if not isinstance(spec, dict):
        return fb
    theme = spec.get("theme")
    if theme not in ("saas-explainer", "organic-natural", "clinical-formal"):
        theme = "saas-explainer"
    scenes = spec.get("scenes")
    if not isinstance(scenes, list) or len(scenes) < 2:
        return fb
    valid_types = {"KineticStatement", "IntegrationCluster", "MockupShowcase", "CtaOutro", "IconTransform"}
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
    return {"theme": theme, "brand": spec.get("brand") or fb["brand"], "scenes": clean}


async def analyze_site_rich(url: str) -> dict:
    """
    Lectura más profunda del sitio para que el director escriba mejor copy:
    título, marca, descripción, subtítulos (h1/h2/h3) y primeros párrafos.
    Best-effort: si falla, cae a analyze_url_light.
    """
    base = await cine_generator.analyze_url_light(url)
    out = {"siteName": base.get("siteName", ""), "headline": base.get("headline", ""),
           "themeColor": base.get("themeColor", ""), "description": "", "sections": [], "context": ""}
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

        ctx = []
        if out["siteName"]:    ctx.append(f"Marca: {out['siteName']}")
        if out["headline"]:    ctx.append(f"Titular: {out['headline']}")
        if out["description"]: ctx.append(f"Descripción: {out['description']}")
        if out["sections"]:    ctx.append("Secciones: " + " · ".join(out["sections"]))
        out["context"] = "\n".join(ctx)
    except Exception as e:
        print(f"[director] analyze_site_rich: {e}")
    return out


async def _resolve_icons(spec: dict) -> dict:
    """Resuelve los conceptos de íconos de las escenas IconTransform a SVGs de Iconify."""
    for s in spec.get("scenes", []):
        if s.get("type") != "IconTransform":
            continue
        for key, svgkey in (("iconFrom", "iconFromSvg"), ("iconTo", "iconToSvg")):
            concept = s.get(key)
            if isinstance(concept, str) and concept.strip():
                try:
                    hits = await iconify_service.search_objects(concept.strip(), limit=1)
                    body = await iconify_service.get_icon_body(hits[0]["id"]) if hits else None
                    s[svgkey] = body  # {body, viewBox} o None (la escena cae a sparkle)
                except Exception as ie:
                    print(f"[director] icono '{concept}' no resuelto: {ie}")
                    s[svgkey] = None
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
    if theme_override in ("saas-explainer", "organic-natural", "clinical-formal"):
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
        if theme_override in ("saas-explainer", "organic-natural", "clinical-formal"):
            spec["theme"] = theme_override
        spec = await _resolve_icons(spec)
        spec = _assign_variation(spec)
        return spec
    except Exception as e:
        print(f"[director] fallback ({e})")
        return _assign_variation(_fallback_spec(url_data, desarrollo, proposito))


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
