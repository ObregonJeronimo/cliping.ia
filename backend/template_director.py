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

import json
import random
import re
from pathlib import Path

from anthropic import AsyncAnthropic

import cine_generator  # reutilizamos analyze_url_light

_client = AsyncAnthropic()
DIRECTOR_MODEL = "claude-sonnet-4-6"

FADE = 12  # debe coincidir con VideoFromSpec.jsx

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

# Catálogo de escenas disponibles (se le pasa a la IA para que componga).
SCENE_CATALOG = """ESCENAS DISPONIBLES (type + props):
- "KineticStatement": frase de impacto. props: lines = array de líneas; cada línea
  es array de segmentos { "t": "texto", "accent": true|false }. La palabra/grupo
  clave va con accent:true. props opcional: subtitle. Ideal para hook y remates.
- "IntegrationCluster": "todo en un solo lugar / muchas fuentes unificadas".
  props: title = array de segmentos { t, accent }. opcional colors = array de hex.
- "MockupShowcase": muestra el producto/su UI. props: title = array de segmentos
  { t, accent }. (La captura del sitio se inyecta sola, no la pongas.)
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
- Incluí al menos un "MockupShowcase" si es un producto/software/plataforma.
- durationInFrames entre 75 y 120 por escena (30fps).
- Copy CORTO y potente, en el MISMO idioma del sitio/usuario (español rioplatense si aplica).
- MUY IMPORTANTE: en KineticStatement cada línea va de 1 a 4 palabras (máx ~22 caracteres).
  Partí las ideas largas en varias líneas o escenas. Pensá "to keep up" / "feature requests",
  no frases enteras. Lo mismo para los títulos de las otras escenas: breves.
- En cada texto marcá con accent:true SOLO la palabra o grupo clave (1 por línea).
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
    valid_types = {"KineticStatement", "IntegrationCluster", "MockupShowcase", "CtaOutro"}
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
    url_data = await cine_generator.analyze_url_light(url)

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
    user_prompt = f"""PROPÓSITO: {proposito}
SITIO: {url_data.get('siteName') or 'desconocido'}  ({url})
HEADLINE DEL SITIO: {url_data.get('headline') or '(sin dato)'}{extra}

{brief}

Generá el storyboard JSON. Que el copy y la estructura reflejen el ángulo y el mood."""

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
        return spec
    except Exception as e:
        print(f"[director] fallback ({e})")
        return _fallback_spec(url_data, desarrollo, proposito)


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
