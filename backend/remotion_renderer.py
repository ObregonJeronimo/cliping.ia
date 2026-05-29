"""
Renderiza videos animados con Remotion usando template sólido + variaciones por parámetros.
El template JSX siempre funciona. Las variaciones se pasan como props.
"""
import asyncio
import base64
import json
import os
from pathlib import Path

from vision import _groq_vision, _parse_json, _img
from variations import build_video_context

OUTPUTS_DIR = Path("outputs")
REMOTION_DIR = Path(__file__).parent.parent / "remotion"


async def extract_page_data_deep(screenshot_bytes: bytes, url: str, action: str) -> dict:
    """Extracción profunda de datos de la página."""
    domain = url.replace("https://", "").replace("http://", "").split("/")[0]

    prompt = f"""Analizá este screenshot de {url} y extraé TODA la información para un video de marketing único.

Respondé SOLO con JSON válido:
{{
  "siteName": "nombre exacto del producto (máximo 2 palabras)",
  "headline": "titular principal exacto de la página",
  "subheadline": "subtítulo o descripción secundaria si existe",
  "benefits": ["beneficio específico 1", "beneficio específico 2", "beneficio específico 3", "beneficio 4"],
  "features": ["feature 1", "feature 2", "feature 3"],
  "cta": "texto exacto del botón principal de acción",
  "problem": "el problema concreto que resuelve en una oración",
  "audience": "a quién va dirigido (específico)",
  "pageType": "saas|ecommerce|landing|portfolio|agency|startup",
  "primaryColor": "#hexcolor dominante",
  "secondaryColor": "#hexcolor secundario o complementario",
  "numbers": ["estadística o número real si hay"],
  "guarantee": "garantía si hay (ej: '30 días gratis', 'sin tarjeta de crédito')",
  "emotion": "confianza|urgencia|aspiración|alivio|entusiasmo",
  "value_prop": "propuesta de valor única en una frase corta"
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
            "problem": "El proceso actual es lento y complicado",
            "audience": "profesionales y empresas",
            "pageType": "saas",
            "primaryColor": "#6366f1",
            "secondaryColor": "#818cf8",
            "numbers": [],
            "guarantee": "",
            "emotion": "confianza",
            "value_prop": f"La mejor solución para {domain}",
        }

    print(f"[renderer] {data.get('siteName')} | {data.get('pageType')} | {data.get('emotion')} | {data.get('primaryColor')}")
    print(f"[renderer] headline: {data.get('headline','')[:60]}")
    print(f"[renderer] problem: {data.get('problem','')[:60]}")
    return data


async def render_video(
    page_data: dict,
    screenshot_path: Path,
    job_id: str,
    params: dict = None,
) -> Path:
    """Renderiza con Remotion usando template sólido + props de variación."""

    if params is None:
        params = {"mode": "simple", "duration": 30, "format": "reel"}

    output_path = OUTPUTS_DIR / f"{job_id}_remotion.mp4"

    # Screenshot a base64
    screenshot_b64 = None
    if screenshot_path and screenshot_path.exists():
        b64 = base64.b64encode(screenshot_path.read_bytes()).decode()
        screenshot_b64 = f"data:image/png;base64,{b64}"

    # Construir contexto de variación
    video_context = build_video_context(params, page_data, job_id, params.get("url", ""))
    print(f"[renderer] style={video_context['visual_style']} | narrative={video_context['narrative']} | hook={video_context['hook']} | tone={video_context['tone']}")

    # Duración y dimensiones
    duration = params.get("duration", 30)
    fmt = params.get("format", "reel")
    width  = 390  if fmt == "reel" else (1280 if fmt == "youtube" else 1080)
    height = 844  if fmt == "reel" else (720  if fmt == "youtube" else 1080)
    total_frames = duration * 30

    # Props: datos de página + parámetros de variación
    props = {
        # datos de la página
        "siteName":       page_data.get("siteName", "Mi Sitio"),
        "headline":       page_data.get("headline", "La solución que necesitás"),
        "subheadline":    page_data.get("subheadline", ""),
        "benefits":       page_data.get("benefits", ["Beneficio 1", "Beneficio 2", "Beneficio 3"]),
        "features":       page_data.get("features", []),
        "cta":            page_data.get("cta", "Empezá gratis"),
        "problem":        page_data.get("problem", ""),
        "audience":       page_data.get("audience", ""),
        "numbers":        page_data.get("numbers", []),
        "guarantee":      page_data.get("guarantee", ""),
        "primaryColor":   page_data.get("primaryColor", "#6366f1"),
        "secondaryColor": page_data.get("secondaryColor", "#818cf8"),
        "screenshotUrl":  screenshot_b64,
        # parámetros de variación → cambian el look del template
        "visualStyle":    video_context["visual_style"],
        "narrative":      video_context["narrative"],
        "hook":           video_context["hook"],
        "tone":           video_context["tone"],
        "focus":          params.get("focus", "product"),
    }

    props_file = OUTPUTS_DIR / f"{job_id}_props.json"
    props_file.write_text(json.dumps(props))

    # Buscar remotion bin
    candidates = [
        str(REMOTION_DIR / "node_modules" / ".bin" / "remotion.cmd"),
        str(REMOTION_DIR / "node_modules" / ".bin" / "remotion"),
        "npx",
    ]
    remotion_bin = next((c for c in candidates if Path(c).exists()), "npx")

    cpu_count = os.cpu_count() or 4
    concurrency = min(cpu_count, 8)

    cmd = [
        remotion_bin, "render",
        "index.jsx",
        "MarketingVideo",
        str(output_path.absolute()),
        "--props", str(props_file.absolute()),
        "--codec", "h264",
        "--fps", "30",
        "--width", str(width),
        "--height", str(height),
        "--duration-in-frames", str(total_frames),
        "--concurrency", str(concurrency),
        "--jpeg-quality", "80",
        "--log", "error",
    ]

    print(f"[renderer] rendering {duration}s {width}x{height} concurrency={concurrency}...")
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        cwd=str(REMOTION_DIR),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()

    try:
        props_file.unlink()
    except Exception:
        pass

    if proc.returncode != 0:
        err = stderr.decode()[-600:]
        print(f"[renderer] error: {err}")
        raise RuntimeError(f"Remotion falló: {err[-200:]}")

    if not output_path.exists():
        raise RuntimeError("Remotion no generó el archivo")

    size = output_path.stat().st_size // 1024
    print(f"[renderer] OK: {output_path.name} ({size}KB)")
    return output_path
