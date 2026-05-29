"""
Renderiza videos animados con Remotion usando JSX generado dinámicamente por IA.
"""
import asyncio
import base64
import json
import os
import re
from pathlib import Path

from vision import _groq_vision, _parse_json, _img
from variations import build_video_context
from jsx_generator import generate_jsx

OUTPUTS_DIR = Path("outputs")
REMOTION_DIR = Path(__file__).parent.parent / "remotion"
REMOTION_TEMPLATE = REMOTION_DIR / "src" / "compositions" / "MarketingVideo.jsx"


async def extract_page_data_deep(screenshot_bytes: bytes, url: str, action: str) -> dict:
    """
    Extracción profunda de datos de la página para generar animaciones únicas.
    Va mucho más allá del nombre y colores.
    """
    domain = url.replace("https://", "").replace("http://", "").split("/")[0]

    prompt = f"""Analizá este screenshot de {url} y extraé TODA la información útil para crear un video de marketing único.

Respondé SOLO con JSON válido y detallado:
{{
  "siteName": "nombre exacto del producto/empresa (máximo 2 palabras)",
  "headline": "titular principal de la página (palabra por palabra, exacto)",
  "subheadline": "subtítulo o descripción secundaria",
  "benefits": ["beneficio 1 específico", "beneficio 2 específico", "beneficio 3 específico"],
  "features": ["feature técnica 1", "feature técnica 2", "feature técnica 3"],
  "cta": "texto exacto del botón principal",
  "cta_secondary": "texto del CTA secundario si existe",
  "problem": "descripción del problema que resuelve (1 oración directa)",
  "audience": "a quién va dirigido (específico, ej: 'propietarios de consultorios')",
  "pageType": "saas|ecommerce|landing|portfolio|agency|startup|otro",
  "primaryColor": "#hexcolor dominante de la marca",
  "secondaryColor": "#hexcolor secundario",
  "numbers": ["número/stat 1 si existe", "número/stat 2"],
  "testimonial": "testimonio o quote si hay alguno visible",
  "guarantee": "garantía si hay (ej: '30 días gratis', 'sin tarjeta')",
  "competitors_implied": "qué alternativa reemplaza (ej: 'Excel', 'WhatsApp', 'papel')",
  "emotion": "emoción principal que busca generar (confianza|urgencia|aspiración|alivio|entusiasmo)",
  "value_prop": "propuesta de valor en una frase (qué hace único al producto)"
}}"""

    raw = await _groq_vision([{
        "role": "user",
        "content": [
            {"type": "text", "text": prompt},
            _img(screenshot_bytes)
        ]
    }], max_tokens=600)

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
            "cta_secondary": "",
            "problem": "El proceso actual es lento y costoso",
            "audience": "profesionales y empresas",
            "pageType": "saas",
            "primaryColor": "#6366f1",
            "secondaryColor": "#818cf8",
            "numbers": [],
            "testimonial": "",
            "guarantee": "",
            "competitors_implied": "",
            "emotion": "confianza",
            "value_prop": f"La mejor solución para {domain}",
        }

    print(f"[renderer] {data.get('siteName')} | {data.get('pageType')} | emotion={data.get('emotion')}")
    print(f"[renderer] problem: {data.get('problem','')[:60]}")
    print(f"[renderer] audience: {data.get('audience','')[:60]}")
    return data


async def render_video(
    page_data: dict,
    screenshot_path: Path,
    job_id: str,
    params: dict = None,
) -> Path:
    """Genera JSX dinámico y renderiza con Remotion."""

    if params is None:
        params = {"mode": "simple", "duration": 30, "format": "reel"}

    output_path = OUTPUTS_DIR / f"{job_id}_remotion.mp4"

    # Convertir screenshot a base64
    screenshot_b64 = None
    if screenshot_path and screenshot_path.exists():
        img_bytes = screenshot_path.read_bytes()
        b64 = base64.b64encode(img_bytes).decode()
        screenshot_b64 = f"data:image/png;base64,{b64}"

    # Construir contexto de variación
    video_context = build_video_context(params, page_data, job_id, params.get("url", ""))
    print(f"[renderer] style={video_context['visual_style']} narrative={video_context['narrative']} hook={video_context['hook']} tone={video_context['tone']}")
    print(f"[renderer] anim techniques: {video_context['anim_techniques']}")

    # Generar JSX dinámico con Groq
    print(f"[renderer] generando JSX con IA...")
    jsx_code = await generate_jsx(video_context, screenshot_b64)

    if not jsx_code or len(jsx_code) < 200:
        print(f"[renderer] JSX generado muy corto o vacío, usando template estático")
        jsx_code = None

    # Si el JSX fue generado, escribirlo al archivo
    if jsx_code:
        # Agregar imports de Remotion al inicio
        full_jsx = f"""import {{
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Img,
  Sequence,
}} from 'remotion';

{jsx_code}
"""
        REMOTION_TEMPLATE.write_text(full_jsx, encoding='utf-8')
        print(f"[renderer] JSX escrito: {len(jsx_code)} chars")
    else:
        print(f"[renderer] usando MarketingVideo.jsx existente")

    # Props para Remotion
    duration = params.get("duration", 30)
    fmt = params.get("format", "reel")
    width = 390 if fmt == "reel" else (1280 if fmt == "youtube" else 1080)
    height = 844 if fmt == "reel" else (720 if fmt == "youtube" else 1080)
    total_frames = duration * 30

    props = {
        "siteName": page_data.get("siteName", "Mi Sitio"),
        "headline": page_data.get("headline", "La solución que necesitás"),
        "benefits": page_data.get("benefits", ["Beneficio 1", "Beneficio 2", "Beneficio 3"]),
        "cta": page_data.get("cta", "Empezá gratis"),
        "primaryColor": page_data.get("primaryColor", "#6366f1"),
        "secondaryColor": page_data.get("secondaryColor", "#818cf8"),
        "screenshotUrl": screenshot_b64,
        # datos adicionales para el JSX generado
        "problem": page_data.get("problem", ""),
        "audience": page_data.get("audience", ""),
        "features": page_data.get("features", []),
        "numbers": page_data.get("numbers", []),
        "guarantee": page_data.get("guarantee", ""),
        "subheadline": page_data.get("subheadline", ""),
    }

    props_file = OUTPUTS_DIR / f"{job_id}_props.json"
    props_file.write_text(json.dumps(props))

    # Buscar remotion bin
    npx_candidates = [
        str(REMOTION_DIR / "node_modules" / ".bin" / "remotion.cmd"),
        str(REMOTION_DIR / "node_modules" / ".bin" / "remotion"),
        "npx",
    ]
    remotion_bin = next((c for c in npx_candidates if Path(c).exists()), "npx")

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

    print(f"[renderer] rendering {job_id} — {duration}s {width}x{height} concurrency={concurrency}...")
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
        print(f"[renderer] remotion error: {err}")
        raise RuntimeError(f"Remotion falló: {err[-200:]}")

    if not output_path.exists():
        raise RuntimeError("Remotion no generó el archivo")

    print(f"[renderer] OK: {output_path.name} ({output_path.stat().st_size // 1024}KB)")
    return output_path
