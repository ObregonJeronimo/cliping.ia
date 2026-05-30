"""
Renderiza videos animados con Remotion.
Claude genera JSX épico y único. Si falla, usa template sólido como fallback.
"""
import asyncio
import base64
import json
import os
from pathlib import Path

from vision import _groq_vision, _parse_json, _img
from variations import build_video_context
from jsx_generator import select_animations, get_default_selection

OUTPUTS_DIR = Path("outputs")
REMOTION_DIR = Path(__file__).parent.parent / "remotion"
TEMPLATE_PATH = REMOTION_DIR / "src" / "compositions" / "MarketingVideo.jsx"



async def extract_page_data_deep(screenshot_bytes: bytes, url: str, action: str) -> dict:
    """Extracción profunda de datos de la página."""
    domain = url.replace("https://", "").replace("http://", "").split("/")[0]

    prompt = f"""Analizá este screenshot de {url} y extraé TODA la información para un video de marketing único.

Respondé SOLO con JSON válido:
{{
  "siteName": "nombre exacto del producto (máximo 2 palabras)",
  "headline": "titular principal exacto",
  "subheadline": "subtítulo si existe",
  "benefits": ["beneficio específico 1", "beneficio 2", "beneficio 3", "beneficio 4"],
  "features": ["feature 1", "feature 2", "feature 3"],
  "cta": "texto exacto del botón principal",
  "problem": "el problema concreto que resuelve en una oración directa",
  "audience": "a quién va dirigido (específico)",
  "pageType": "saas|ecommerce|landing|portfolio|agency|startup",
  "primaryColor": "#hexcolor dominante de la marca",
  "secondaryColor": "#hexcolor secundario",
  "numbers": ["estadística real si existe"],
  "guarantee": "garantía si hay",
  "emotion": "confianza|urgencia|aspiración|alivio|entusiasmo",
  "value_prop": "propuesta de valor única en una frase"
}}"""

    raw = await _groq_vision([{
        "role": "user",
        "content": [{"type": "text", "text": prompt}, _img(screenshot_bytes)]
    }], max_tokens=500)

    data = _parse_json(raw)
    if isinstance(data, list):
        data = data[0] if data else {}

    if not data or "siteName" not in data:
        data = {
            "siteName": domain.split(".")[0].capitalize(),
            "headline": "La solución que necesitás",
            "subheadline": "",
            "benefits": ["Fácil de usar", "Ahorrá tiempo", "Resultados reales"],
            "features": [],
            "cta": "Empezá gratis",
            "problem": "El proceso actual es lento",
            "audience": "profesionales",
            "pageType": "saas",
            "primaryColor": "#6366f1",
            "secondaryColor": "#818cf8",
            "numbers": [],
            "guarantee": "",
            "emotion": "confianza",
            "value_prop": "La mejor solución",
        }

    print(f"[renderer] {data.get('siteName')} | {data.get('pageType')} | {data.get('emotion')} | {data.get('primaryColor')}")
    print(f"[renderer] headline: {data.get('headline','')[:70]}")
    return data


async def render_video(
    page_data: dict,
    screenshot_path: Path,
    job_id: str,
    params: dict = None,
) -> Path:
    """Genera JSX con Claude y renderiza con Remotion."""

    if params is None:
        params = {"mode": "simple", "duration": 30, "format": "reel"}

    output_path = OUTPUTS_DIR / f"{job_id}_remotion.mp4"

    # Screenshot a base64
    screenshot_b64 = None
    if screenshot_path and screenshot_path.exists():
        b64 = base64.b64encode(screenshot_path.read_bytes()).decode()
        screenshot_b64 = f"data:image/png;base64,{b64}"

    # Contexto de variación
    video_context = build_video_context(params, page_data, job_id, params.get("url", ""))
    video_context["format"] = params.get("format", "reel")
    video_context["duration"] = params.get("duration", 30)
    print(f"[renderer] style={video_context['visual_style']} | narrative={video_context['narrative']} | hook={video_context['hook']} | tone={video_context['tone']}")
    print(f"[renderer] animaciones: {video_context['anim_techniques']}")

    # Dimensiones
    duration = params.get("duration", 30)
    fmt = params.get("format", "reel")
    width  = 390  if fmt == "reel" else (1280 if fmt == "youtube" else 1080)
    height = 844  if fmt == "reel" else (720  if fmt == "youtube" else 1080)
    total_frames = duration * 30



    # Claude elige animaciones (devuelve JSON, no código)
    anim_selection = None
    if os.environ.get("ANTHROPIC_API_KEY"):
        try:
            anim_selection = await select_animations(video_context)
        except Exception as e:
            print(f"[renderer] error seleccionando animaciones: {e}")
    if not anim_selection:
        anim_selection = get_default_selection(page_data)
        print(f"[renderer] usando selección por defecto")

    # Props: datos de página + animaciones elegidas por Claude
    props = {
        "siteName":          page_data.get("siteName", "Mi Sitio"),
        "headline":          page_data.get("headline", "La solucion que necesitas"),
        "subheadline":       page_data.get("subheadline", ""),
        "benefits":          page_data.get("benefits", []),
        "features":          page_data.get("features", []),
        "cta":               page_data.get("cta", "Empeza gratis"),
        "problem":           page_data.get("problem", ""),
        "audience":          page_data.get("audience", ""),
        "numbers":           page_data.get("numbers", []),
        "guarantee":         page_data.get("guarantee", ""),
        "primaryColor":      page_data.get("primaryColor", "#6366f1"),
        "secondaryColor":    page_data.get("secondaryColor", "#818cf8"),
        "screenshotUrl":     screenshot_b64,
        "hookAnimation":     anim_selection.get("hook", {}).get("animation", "reveal_swipe"),
        "hookParams":        anim_selection.get("hook", {}).get("params", {}),
        "productAnimation":  anim_selection.get("product", {}).get("animation", "iphone_rise"),
        "productParams":     anim_selection.get("product", {}).get("params", {}),
        "benefitsAnimation": anim_selection.get("benefits", {}).get("animation", "benefit_cards_stagger"),
        "benefitsParams":    anim_selection.get("benefits", {}).get("params", {}),
        "ctaAnimation":      anim_selection.get("cta", {}).get("animation", "liquid_button_cta"),
        "ctaParams":         anim_selection.get("cta", {}).get("params", {}),
        "outroAnimation":    anim_selection.get("outro", {}).get("animation", "orbit_logo"),
        "outroParams":       anim_selection.get("outro", {}).get("params", {}),
    }

    props_file = OUTPUTS_DIR / f"{job_id}_props.json"
    props_file.write_text(json.dumps(props))

    # Remotion bin
    candidates = [
        str(REMOTION_DIR / "node_modules" / ".bin" / "remotion.cmd"),
        str(REMOTION_DIR / "node_modules" / ".bin" / "remotion"),
        "npx",
    ]
    remotion_bin = next((c for c in candidates if Path(c).exists()), "npx")
    concurrency = min(os.cpu_count() or 4, 8)

    cmd = [
        remotion_bin, "render", "index.jsx", "MarketingVideo",
        str(output_path.absolute()),
        "--props", str(props_file.absolute()),
        "--codec", "h264", "--fps", "30",
        "--width", str(width), "--height", str(height),
        "--duration-in-frames", str(total_frames),
        "--concurrency", str(concurrency),
        "--jpeg-quality", "80", "--log", "error",
    ]

    print(f"[renderer] rendering {duration}s {width}x{height} concurrency={concurrency}...")
    proc = await asyncio.create_subprocess_exec(
        *cmd, cwd=str(REMOTION_DIR),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()

    try:
        props_file.unlink()
    except Exception:
        pass

    if proc.returncode != 0:
        err = stderr.decode()[-800:]
        print(f"[renderer] remotion error: {err}")
        raise RuntimeError(f"Remotion falló: {err[-200:]}")

    if not output_path.exists():
        raise RuntimeError("Remotion no generó el archivo")

    print(f"[renderer] OK: {output_path.name} ({output_path.stat().st_size//1024}KB)")
    return output_path
