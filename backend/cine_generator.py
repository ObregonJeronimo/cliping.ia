"""
cine_generator.py — Render de cinematografías completas para cliping.ia.

Toma 5-10 animaciones ya generadas (su código JSX), arma un plan narrativo con
IA según el propósito + datos del sitio, y construye una composición Remotion
única (CineVideo) que las concatena con transiciones (crossfade), overlays de
texto por segmento, y un intro/outro de marca.

El render real (remotion render → Cloudinary → Firestore) lo dispara main.py
para reusar el mismo mecanismo que ya funciona con las animaciones sueltas.

Frames:
  - Cada clip dura CLIP_FRAMES (90 = 3s a 30fps), igual que en el forge.
  - Entre segmentos se solapan FADE frames -> crossfade.
  - Intro y outro de marca al principio y al final.
"""

from __future__ import annotations

import html
import json
import re
from pathlib import Path

import httpx
from anthropic import AsyncAnthropic

_client = AsyncAnthropic()
NARRATIVE_MODEL = "claude-haiku-4-5-20251001"

CLIP_FRAMES = 90      # cada animación (3s a 30fps)
FADE = 14             # frames de crossfade entre segmentos
INTRO_FRAMES = 48
OUTRO_FRAMES = 72

# Roles narrativos por propósito (fallback si la IA no responde).
ROLE_FLOW = {
    "marketing":    ["Hook", "Problema", "Solución", "Beneficio", "Beneficio", "Prueba", "Cierre"],
    "informativo":  ["Intro", "Dato", "Dato", "Detalle", "Detalle", "Contexto", "Resumen"],
    "presentacion": ["Apertura", "Quiénes", "Qué hacemos", "Cómo", "Valor", "Logros", "Cierre"],
    "storytelling": ["Inicio", "Conflicto", "Giro", "Desarrollo", "Clímax", "Resolución", "Final"],
    "producto":     ["Hook", "Feature", "Feature", "Feature", "Beneficio", "Demo", "CTA"],
    "branding":     ["Esencia", "Valor", "Valor", "Identidad", "Tono", "Emoción", "Firma"],
}


# ─── Análisis liviano del sitio (sin Playwright) ──────────────────────────────
async def analyze_url_light(url: str) -> dict:
    """
    Extrae siteName, headline y theme-color del HTML crudo. Rápido y best-effort:
    si algo falla, devuelve defaults derivados del dominio. NO usa Playwright para
    no acoplar Cine al agente pesado.
    """
    data = {"siteName": "", "headline": "", "themeColor": ""}
    if not url:
        return data

    try:
        async with httpx.AsyncClient(
            timeout=10.0, follow_redirects=True,
            headers={"User-Agent": "Mozilla/5.0 (compatible; clipingbot/1.0)"},
        ) as c:
            r = await c.get(url)
            t = r.text[:200_000]

        m = re.search(r"<title[^>]*>(.*?)</title>", t, re.I | re.S)
        if m:
            data["siteName"] = html.unescape(re.sub(r"\s+", " ", m.group(1))).strip()[:60]

        m = re.search(r'property=["\']og:site_name["\'][^>]*content=["\']([^"\']+)', t, re.I)
        if m:
            data["siteName"] = html.unescape(m.group(1)).strip()[:60]

        m = re.search(r"<h1[^>]*>(.*?)</h1>", t, re.I | re.S)
        if m:
            data["headline"] = re.sub(r"<[^>]+>", "", html.unescape(m.group(1))).strip()[:90]

        m = re.search(r'name=["\']theme-color["\'][^>]*content=["\']([^"\']+)', t, re.I)
        if m:
            data["themeColor"] = m.group(1).strip()
    except Exception as e:
        print(f"[cine] analyze_url_light: {e}")

    if not data["siteName"] and url:
        host = re.sub(r"^https?://(www\.)?", "", url).split("/")[0]
        data["siteName"] = host.split(".")[0].capitalize()

    return data


# ─── Plan narrativo con IA ────────────────────────────────────────────────────
NARRATIVE_SYSTEM = """Sos un director creativo de video marketing vertical (reels).
Recibís una lista ordenada de animaciones abstractas y armás un guion que las
convierta en UN video con sentido para el propósito indicado.

Devolvés SOLO un objeto JSON válido (sin markdown, sin explicaciones) con esta forma:
{
  "intro_title": "string corto (máx 4 palabras)",
  "outro_cta": "string corto, llamado a la acción (máx 4 palabras)",
  "palette": { "primary": "#RRGGBB", "secondary": "#RRGGBB", "accent": "#RRGGBB" },
  "segments": [ { "text": "frase corta sobreimpresa (máx 5 palabras)", "role": "rol del segmento" } ]
}

REGLAS:
- "segments" debe tener EXACTAMENTE tantos items como animaciones recibidas, en el mismo orden.
- Cada "text" es una frase potente y breve (máx 5 palabras). Puede ser "" si el segmento es puro impacto visual.
- La paleta tiene que ser coherente con la marca y verse bien sobre fondo oscuro (#07070f).
- El arco narrativo debe tener sentido: empezar con un hook y terminar en un cierre/CTA."""


def _valid_hex(value, default):
    if isinstance(value, str) and re.fullmatch(r"#[0-9a-fA-F]{6}", value.strip()):
        return value.strip()
    return default


def _fallback_plan(clips: list, url_data: dict, proposito: str) -> dict:
    n = len(clips)
    roles = ROLE_FLOW.get(proposito, ROLE_FLOW["marketing"])
    segments = []
    for i in range(n):
        if i == 0:
            role = roles[0]
        elif i == n - 1:
            role = roles[-1]
        else:
            role = roles[min(i, len(roles) - 2)]
        segments.append({"text": "", "role": role})

    primary = _valid_hex(url_data.get("themeColor"), "#6366f1")
    site = url_data.get("siteName") or "Tu marca"
    return {
        "intro_title": site[:24],
        "outro_cta": "Conocé más",
        "palette": {"primary": primary, "secondary": "#a78bfa", "accent": "#f59e0b"},
        "segments": segments,
    }


async def build_narrative_plan(clips: list, url_data: dict,
                               proposito: str, desarrollo: str) -> dict:
    """Pide a Haiku un guion JSON. Si falla o viene mal, usa el fallback robusto."""
    fallback = _fallback_plan(clips, url_data, proposito)
    n = len(clips)

    clips_desc = "\n".join(
        f"{i+1}. {c.get('component_name', 'clip')}: "
        f"{(c.get('idea') or c.get('rubro') or 'animación abstracta')[:80]}"
        for i, c in enumerate(clips)
    )
    extra = f'\nÁngulo/indicaciones del usuario: "{desarrollo.strip()}"' if desarrollo.strip() else ""

    user_prompt = f"""PROPÓSITO DEL VIDEO: {proposito}
SITIO: {url_data.get('siteName') or 'desconocido'}
HEADLINE DEL SITIO: {url_data.get('headline') or '(sin dato)'}{extra}

ANIMACIONES (en orden, {n} en total):
{clips_desc}

Generá el JSON con intro_title, outro_cta, palette y exactamente {n} segments."""

    try:
        resp = await _client.messages.create(
            model=NARRATIVE_MODEL,
            max_tokens=1200,
            system=NARRATIVE_SYSTEM,
            messages=[{"role": "user", "content": user_prompt}],
        )
        raw = resp.content[0].text.strip()
        m = re.search(r"\{.*\}", raw, re.S)
        if not m:
            raise ValueError("sin JSON en la respuesta")
        plan = json.loads(m.group(0))

        segs = plan.get("segments") or []
        norm_segs = []
        for i in range(n):
            seg = segs[i] if i < len(segs) and isinstance(segs[i], dict) else {}
            norm_segs.append({
                "text": str(seg.get("text", ""))[:48],
                "role": str(seg.get("role", fallback["segments"][i]["role"]))[:24],
            })

        pal = plan.get("palette") or {}
        return {
            "intro_title": str(plan.get("intro_title") or fallback["intro_title"])[:24],
            "outro_cta": str(plan.get("outro_cta") or fallback["outro_cta"])[:24],
            "palette": {
                "primary":   _valid_hex(pal.get("primary"),   fallback["palette"]["primary"]),
                "secondary": _valid_hex(pal.get("secondary"), fallback["palette"]["secondary"]),
                "accent":    _valid_hex(pal.get("accent"),    fallback["palette"]["accent"]),
            },
            "segments": norm_segs,
        }
    except Exception as e:
        print(f"[cine] narrative fallback ({e})")
        return fallback


# ─── Limpieza del JSX de cada clip (idéntica al render single que ya funciona) ─
def _clean_clip_code(code: str) -> str:
    code = re.sub(r"import\s*\{[^}]*\}\s*from\s*['\"]remotion['\"];?\s*\n?", "", code)
    for helper in ["const lerp", "const clamp", "const easeInOut", "const easeOut", "const easeIn"]:
        code = re.sub(rf"{helper}\s*=\s*[^\n]+\n?", "", code)
    code = re.sub(r"^export\s+default\s+\w+\s*;?\s*$", "", code, flags=re.MULTILINE)
    return code.strip()


def _safe_ident(name: str, fallback: str) -> str:
    ident = re.sub(r"[^A-Za-z0-9_]", "", name or "")
    if not ident or not ident[0].isalpha():
        ident = fallback
    return ident


_CLIP_HEADER = (
    "import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring } from 'remotion'\n\n"
    "const lerp = (a, b, t) => a + (b - a) * t\n"
    "const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))\n"
    "const easeInOut = (t) => t < 0.5 ? 2*t*t : -1+(4-2*t)*t\n"
    "const easeOut = (t) => 1 - Math.pow(1 - t, 3)\n\n"
)

# Plantilla de la composición. Sin f-string: se reemplazan los tokens __XXX__.
# Así no hay que escapar ninguna llave de JSX.
_CINE_TEMPLATE = """import { AbsoluteFill, Sequence, useCurrentFrame, interpolate } from 'remotion'
__IMPORTS__

const CLIPS = [__CLIPS_ARRAY__]
const PLAN = __PLAN_JSON__
const PALETTE = { primary: '__PRIMARY__', secondary: '__SECONDARY__', accent: '__ACCENT__' }
const FADE = __FADE__
const SITE = __SITE_JSON__
const OUTRO_CTA = __OUTRO_JSON__

const Fader = ({ duration, children }) => {
  const frame = useCurrentFrame()
  const opIn = interpolate(frame, [0, FADE], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const opOut = interpolate(frame, [duration - FADE, duration], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  return <AbsoluteFill style={{ opacity: Math.min(opIn, opOut) }}>{children}</AbsoluteFill>
}

const Caption = ({ text }) => {
  const frame = useCurrentFrame()
  if (!text) return null
  const y = interpolate(frame, [0, 14], [60, 0], { extrapolateRight: 'clamp' })
  const op = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: 'clamp' })
  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 280 }}>
      <div style={{
        transform: 'translateY(' + y + 'px)', opacity: op,
        maxWidth: 880, textAlign: 'center',
        fontSize: 76, fontWeight: 800, lineHeight: 1.05,
        color: '#fff', letterSpacing: '-0.02em',
        fontFamily: 'Inter, system-ui, sans-serif',
        textShadow: '0 6px 40px rgba(0,0,0,0.55)',
        padding: '0 60px',
      }}>{text}</div>
    </AbsoluteFill>
  )
}

const Intro = ({ title }) => {
  const frame = useCurrentFrame()
  const scale = interpolate(frame, [0, 24], [0.82, 1], { extrapolateRight: 'clamp' })
  const op = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: 'clamp' })
  const sweep = interpolate(frame, [10, 40], [-120, 120], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center',
      background: 'radial-gradient(circle at 50% 45%, ' + PALETTE.primary + '22, #07070f 70%)' }}>
      <div style={{
        transform: 'scale(' + scale + ')', opacity: op,
        fontSize: 104, fontWeight: 900, letterSpacing: '-0.03em',
        fontFamily: 'Inter, system-ui, sans-serif', textAlign: 'center', padding: '0 80px',
        background: 'linear-gradient(' + sweep + 'deg, ' + PALETTE.primary + ', ' + PALETTE.secondary + ', ' + PALETTE.accent + ')',
        WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
      }}>{title}</div>
    </AbsoluteFill>
  )
}

const Outro = ({ cta }) => {
  const frame = useCurrentFrame()
  const op = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' })
  const pulse = 1 + 0.04 * Math.sin(frame / 6)
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center',
      background: 'radial-gradient(circle at 50% 55%, ' + PALETTE.primary + '33, #07070f 72%)' }}>
      <div style={{ opacity: op, textAlign: 'center', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div style={{ fontSize: 92, fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', transform: 'scale(' + pulse + ')' }}>{cta}</div>
        <div style={{ marginTop: 40, height: 8, width: 220, marginLeft: 'auto', marginRight: 'auto',
          borderRadius: 8, background: 'linear-gradient(90deg, ' + PALETTE.primary + ', ' + PALETTE.accent + ')' }} />
      </div>
    </AbsoluteFill>
  )
}

export const __COMPID__ = ({
  primaryColor = PALETTE.primary,
  secondaryColor = PALETTE.secondary,
  accentColor = PALETTE.accent,
  siteName = SITE,
}) => (
  <AbsoluteFill style={{ backgroundColor: '#07070f' }}>
    {PLAN.map((s, i) => (
      <Sequence key={i} from={s.from} durationInFrames={s.duration}>
        <Fader duration={s.duration}>
          {s.kind === 'intro'
            ? <Intro title={s.text || siteName} />
            : s.kind === 'outro'
            ? <Outro cta={s.text || OUTRO_CTA} />
            : (() => {
                const Clip = CLIPS[s.clipIndex]
                return (
                  <AbsoluteFill>
                    <Clip primaryColor={primaryColor} secondaryColor={secondaryColor} accentColor={accentColor} bg="#07070f" siteName={siteName} />
                    <Caption text={s.text} />
                  </AbsoluteFill>
                )
              })()}
        </Fader>
      </Sequence>
    ))}
  </AbsoluteFill>
)

export default __COMPID__
"""

_ROOT_TEMPLATE = """import { Composition } from 'remotion'
import __COMPID__ from './__CINE_FILE__'

export const RemotionRoot = () => (
  <Composition
    id="__COMPID__"
    component={__COMPID__}
    durationInFrames={__TOTAL__}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{}}
  />
)
"""

_ENTRY_TEMPLATE = """import { registerRoot } from 'remotion'
import { RemotionRoot } from './src/__ROOT_FILE__'
registerRoot(RemotionRoot)
"""


def build_cine_files(job_id: str, clips: list, plan: dict, remotion_dir):
    """
    Escribe los archivos JSX necesarios para el render de la cinematografía:
      - remotion/src/compositions/CineClip_{job}_{i}.jsx   (un componente por clip)
      - remotion/src/CineVideo_{job}.jsx                   (composición concatenada)
      - remotion/src/Root_cine_{job}.jsx                   (registra CineVideo)
      - remotion/index_cine_{job}.jsx                      (entry point)

    Devuelve: (entry_filename, comp_id, total_frames, temp_files)
    """
    remotion_dir = Path(remotion_dir)
    comps_dir = remotion_dir / "src" / "compositions"
    comps_dir.mkdir(parents=True, exist_ok=True)

    short = job_id[:8]
    comp_id = f"CineVideo_{short}"
    temp_files = []

    # 1. Un archivo por clip, con el MISMO header que el render single.
    imports = []
    clips_array = []
    for i, clip in enumerate(clips):
        raw_code = clip.get("code", "")
        # El nombre exportado real lo tomamos del propio código (más fiable que
        # confiar en component_name). Si no hay export default, caemos a él.
        m = re.search(r"export\s+default\s+(\w+)", raw_code)
        export_name = m.group(1) if m else _safe_ident(clip.get("component_name", ""), f"Clip{i}")
        code_clean = _clean_clip_code(raw_code)
        jsx = f"{_CLIP_HEADER}{code_clean}\n\nexport default {export_name}\n"
        fname = f"CineClip_{short}_{i}.jsx"
        (comps_dir / fname).write_text(jsx, encoding="utf-8")
        temp_files.append(comps_dir / fname)
        imports.append(f"import Clip{i} from './compositions/{fname}'")
        clips_array.append(f"Clip{i}")

    # 2. Plan de segmentos con tiempos absolutos (crossfade = solape de FADE).
    segments = []
    segments.append({"kind": "intro", "from": 0, "duration": INTRO_FRAMES,
                     "text": plan["intro_title"], "role": "Intro"})
    cursor = INTRO_FRAMES - FADE

    for i, seg in enumerate(plan["segments"]):
        segments.append({
            "kind": "clip", "clipIndex": i,
            "from": max(0, cursor), "duration": CLIP_FRAMES,
            "text": seg.get("text", ""), "role": seg.get("role", ""),
        })
        cursor = cursor + CLIP_FRAMES - FADE

    segments.append({"kind": "outro", "from": max(0, cursor), "duration": OUTRO_FRAMES,
                     "text": plan["outro_cta"], "role": "Cierre"})

    total_frames = segments[-1]["from"] + segments[-1]["duration"]
    pal = plan["palette"]

    # 3. Composición CineVideo (token replacement, sin escapar llaves).
    cine_src = (_CINE_TEMPLATE
                .replace("__IMPORTS__", "\n".join(imports))
                .replace("__CLIPS_ARRAY__", ", ".join(clips_array))
                .replace("__PLAN_JSON__", json.dumps(segments, ensure_ascii=False))
                .replace("__PRIMARY__", pal["primary"])
                .replace("__SECONDARY__", pal["secondary"])
                .replace("__ACCENT__", pal["accent"])
                .replace("__FADE__", str(FADE))
                .replace("__SITE_JSON__", json.dumps(plan["intro_title"], ensure_ascii=False))
                .replace("__OUTRO_JSON__", json.dumps(plan["outro_cta"], ensure_ascii=False))
                .replace("__COMPID__", comp_id))
    cine_file = f"{comp_id}.jsx"
    (remotion_dir / "src" / cine_file).write_text(cine_src, encoding="utf-8")
    temp_files.append(remotion_dir / "src" / cine_file)

    # 4. Root temporal que registra SOLO esta composición.
    root_src = (_ROOT_TEMPLATE
                .replace("__CINE_FILE__", cine_file)
                .replace("__TOTAL__", str(total_frames))
                .replace("__COMPID__", comp_id))
    root_file = f"Root_cine_{short}.jsx"
    (remotion_dir / "src" / root_file).write_text(root_src, encoding="utf-8")
    temp_files.append(remotion_dir / "src" / root_file)

    # 5. Entry point.
    entry_src = _ENTRY_TEMPLATE.replace("__ROOT_FILE__", root_file)
    entry_file = f"index_cine_{short}.jsx"
    (remotion_dir / entry_file).write_text(entry_src, encoding="utf-8")
    temp_files.append(remotion_dir / entry_file)

    return entry_file, comp_id, total_frames, temp_files
