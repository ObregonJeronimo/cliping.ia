"""
Extrae datos de la página web y genera un video animado con Remotion.
"""
import asyncio
import base64
import json
import os
import subprocess
from pathlib import Path

from vision import _groq_vision, _groq_text, _parse_json, _img

OUTPUTS_DIR = Path("outputs")
REMOTION_DIR = Path(__file__).parent.parent / "remotion"


async def extract_page_data(screenshot_bytes: bytes, url: str, action: str) -> dict:
    """Extrae nombre, headline, beneficios, CTA y colores de la página."""
    domain = url.replace("https://", "").replace("http://", "").split("/")[0]

    prompt = f"""Analizá este screenshot de {url} y extraé la información para un video de marketing.

Respondé SOLO con JSON válido:
{{
  "siteName": "nombre del producto o empresa (máximo 2 palabras)",
  "headline": "titular principal de la página (máximo 8 palabras)",
  "benefits": ["beneficio 1", "beneficio 2", "beneficio 3"],
  "cta": "texto del botón principal de llamada a la acción",
  "primaryColor": "#hexcolor del color dominante de la marca",
  "secondaryColor": "#hexcolor secundario o complementario",
  "pageType": "saas|ecommerce|landing|portfolio|otro"
}}

Si no ves algo claramente, usá valores razonables basados en lo que sí ves.
El siteName debe ser el nombre real del producto, no la URL."""

    raw = await _groq_vision([{
        "role": "user",
        "content": [
            {"type": "text", "text": prompt},
            _img(screenshot_bytes)
        ]
    }], max_tokens=300)

    data = _parse_json(raw)
    if isinstance(data, list):
        data = data[0] if data else {}

    # Defaults si algo falla
    if not data or "siteName" not in data:
        data = {
            "siteName": domain.split(".")[0].capitalize(),
            "headline": "La solución que necesitás",
            "benefits": ["Fácil de usar", "Ahorrá tiempo", "Resultados reales"],
            "cta": "Empezá gratis",
            "primaryColor": "#6366f1",
            "secondaryColor": "#818cf8",
            "pageType": "landing"
        }

    print(f"[remotion] extracted: {data.get('siteName')} — {data.get('headline')}")
    return data


async def render_video(
    page_data: dict,
    screenshot_path: Path,
    job_id: str,
    voice_script: str = "",
) -> Path:
    """Renderiza el video animado con Remotion."""

    output_path = OUTPUTS_DIR / f"{job_id}_remotion.mp4"

    # Convertir screenshot a base64 data URL para pasarlo como prop
    screenshot_b64 = None
    if screenshot_path and screenshot_path.exists():
        img_bytes = screenshot_path.read_bytes()
        b64 = base64.b64encode(img_bytes).decode()
        screenshot_b64 = f"data:image/png;base64,{b64}"

    # Props para Remotion
    props = {
        "siteName": page_data.get("siteName", "Mi Sitio"),
        "headline": page_data.get("headline", "La solución que necesitás"),
        "benefits": page_data.get("benefits", ["Beneficio 1", "Beneficio 2", "Beneficio 3"]),
        "cta": page_data.get("cta", "Empezá gratis"),
        "primaryColor": page_data.get("primaryColor", "#6366f1"),
        "secondaryColor": page_data.get("secondaryColor", "#818cf8"),
        "accentColor": "#f0f9ff",
        "screenshotUrl": screenshot_b64,
        "logoUrl": None,
    }

    props_json = json.dumps(props)
    props_file = OUTPUTS_DIR / f"{job_id}_props.json"
    props_file.write_text(props_json)

    # En Windows npx no está en PATH desde Python — buscar node_modules/.bin
    npx_candidates = [
        str(REMOTION_DIR / "node_modules" / ".bin" / "remotion.cmd"),
        str(REMOTION_DIR / "node_modules" / ".bin" / "remotion"),
        "npx",
    ]
    remotion_bin = None
    for candidate in npx_candidates:
        if Path(candidate).exists() or candidate == "npx":
            remotion_bin = candidate
            break

    import os
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
        "--width", "390",
        "--height", "844",
        "--concurrency", str(concurrency),
        "--jpeg-quality", "80",
        "--log", "error",
    ]

    print(f"[remotion] rendering {job_id} with {remotion_bin}...")
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        cwd=str(REMOTION_DIR),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()

    # Limpiar props file
    try:
        props_file.unlink()
    except Exception:
        pass

    if proc.returncode != 0:
        print(f"[remotion] error: {stderr.decode()[-500:]}")
        raise RuntimeError(f"Remotion render falló: {stderr.decode()[-200:]}")

    if not output_path.exists():
        raise RuntimeError("Remotion no generó el archivo de salida")

    print(f"[remotion] OK: {output_path.name} ({output_path.stat().st_size // 1024}KB)")
    return output_path
