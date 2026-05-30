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
from animation_cache import get_cached, save_cache

OUTPUTS_DIR = Path("outputs")
REMOTION_DIR = Path(__file__).parent.parent / "remotion"
TEMPLATE_PATH = REMOTION_DIR / "src" / "compositions" / "MarketingVideo.jsx"



async def extract_page_data_deep(screenshot_bytes: bytes, url: str, action: str) -> dict:
    """Extracción profunda de datos de la página."""
    domain = url.replace("https://", "").replace("http://", "").split("/")[0]

    prompt = f"""Analizá este screenshot de {url} y extraé TODA la información para crear un video de marketing profesional.

IMPORTANTE para los colores: buscá el color MÁS VIBRANTE y característico de la marca — el color de los botones principales, logos, acentos llamativos. NO uses gris (#333, #666) ni negro como primaryColor — esos son colores de texto, no de marca. Si el sitio tiene amarillo, naranja, azul, verde, violeta, usá ESE color.

Respondé SOLO con JSON válido:
{{
  "siteName": "nombre exacto del producto (máximo 2 palabras)",
  "headline": "titular principal exacto de la página",
  "subheadline": "subtítulo si existe",
  "benefits": ["beneficio específico 1", "beneficio específico 2", "beneficio específico 3", "beneficio 4"],
  "features": ["feature técnica 1", "feature 2", "feature 3"],
  "cta": "texto exacto del botón principal de acción",
  "problem": "el problema concreto que resuelve en una oración directa",
  "audience": "a quién va dirigido (específico, ej: médicos, dueños de restaurantes)",
  "pageType": "saas|ecommerce|landing|portfolio|agency|startup",
  "primaryColor": "#hexcolor del color MÁS VIBRANTE de la marca (botones, logo, acentos) — NUNCA gris o negro",
  "secondaryColor": "#hexcolor secundario o complementario vibrante",
  "numbers": ["número o estadística real que aparece en la página"],
  "guarantee": "garantía si hay (ej: gratis 30 días, sin tarjeta)",
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

    # Validar que el color primario no sea gris/negro/blanco
    def is_boring_color(hex_color: str) -> bool:
        if not hex_color or not hex_color.startswith("#"):
            return True
        h = hex_color.lstrip("#")
        if len(h) == 3:
            h = "".join(c*2 for c in h)
        if len(h) != 6:
            return True
        try:
            r, g, b = int(h[0:2],16), int(h[2:4],16), int(h[4:6],16)
            max_c, min_c = max(r,g,b), min(r,g,b)
            saturation = (max_c - min_c) / max_c if max_c > 0 else 0
            brightness = max_c / 255
            # Solo rechazar si es casi gris (saturation muy baja) O casi negro O casi blanco puro
            return saturation < 0.12 or brightness < 0.12 or (brightness > 0.96 and saturation < 0.05)
        except:
            return True

    if is_boring_color(data.get("primaryColor", "")):
        print(f"[renderer] color aburrido detectado ({data.get('primaryColor')}), usando fallback vibrante")
        data["primaryColor"] = "#f59e0b"  # amber vibrante como fallback
    if is_boring_color(data.get("secondaryColor", "")):
        data["secondaryColor"] = "#6366f1"

    print(f"[renderer] {data.get('siteName')} | {data.get('pageType')} | {data.get('emotion')} | {data.get('primaryColor')}")
    print(f"[renderer] headline: {data.get('headline','')[:70]}")
    return data


async def render_video(
    page_data: dict,
    screenshot_path: Path,
    job_id: str,
    params: dict = None,
    debugger = None,
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
    if debugger: debugger.set_variation(video_context)

    # Dimensiones
    duration = params.get("duration", 30)
    fmt = params.get("format", "reel")
    # Renderizar a 2x para antialiasing — FFmpeg escala después
    SCALE = 2
    width  = 390  * SCALE if fmt == "reel" else (1280 * SCALE if fmt == "youtube" else 1080 * SCALE)
    height = 844  * SCALE if fmt == "reel" else (720  * SCALE if fmt == "youtube" else 1080 * SCALE)
    total_frames = duration * 30



    # Claude elige animaciones — con caché por URL
    url_key = params.get("url", "")
    anim_selection = get_cached(url_key)

    if anim_selection:
        print(f"[renderer] usando caché de animaciones para {url_key[:40]}")
        if debugger: debugger.log("cache", f"HIT — reutilizando selección previa", level="ok")
    else:
        if os.environ.get("ANTHROPIC_API_KEY"):
            try:
                anim_selection = await select_animations(video_context)
                if anim_selection:
                    save_cache(url_key, anim_selection)
            except Exception as e:
                print(f"[renderer] error seleccionando animaciones: {e}")
        if not anim_selection:
            anim_selection = get_default_selection(page_data)
            print(f"[renderer] usando selección por defecto")
    if debugger: debugger.set_animation_selection(anim_selection)

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
        # Brief creativo del director de arte
        "brief":             anim_selection.get("brief", {}),
    }

    props_file = OUTPUTS_DIR / f"{job_id}_props.json"
    props_file.write_text(json.dumps(props))

    # Debug: loguear props clave
    print(f"[renderer] props → siteName={props['siteName']} primaryColor={props['primaryColor']}")
    print(f"[renderer] props → hook={props['hookAnimation']} product={props['productAnimation']}")
    print(f"[renderer] props → benefits={props['benefitsAnimation']} cta={props['ctaAnimation']} outro={props['outroAnimation']}")
    print(f"[renderer] props → screenshotUrl={'SI' if props.get('screenshotUrl') else 'NO'} benefits_count={len(props.get('benefits',[]))}")
    if props.get('hookParams'):
        print(f"[renderer] hookParams → {list(props['hookParams'].keys())}")
    if props.get('productParams'):
        print(f"[renderer] productParams → {list(props['productParams'].keys())}")

    # Guardar props completas para debug
    debug_props = OUTPUTS_DIR / f"{job_id}_props_debug.json"
    debug_props.write_text(json.dumps(props, indent=2, default=lambda x: str(x)[:50] if isinstance(x, str) and len(str(x)) > 100 else x))
    print(f"[renderer] props debug → {debug_props.name}")

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
        "--codec", "h264",
        "--fps", "30",
        "--width", str(width),
        "--height", str(height),
        "--duration-in-frames", str(total_frames),
        "--concurrency", str(concurrency),
        "--jpeg-quality", "95",        # máxima calidad de frames
        "--crf", "16",                 # menor CRF = mayor calidad (18 default, 16 mejor)
        "--pixel-format", "yuv420p",
        "--log", "error",
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

    import time as _time; render_end = _time.time()
    if proc.returncode != 0:
        err = stderr.decode()[-800:]
        print(f"[renderer] remotion error: {err}")
        if debugger: debugger.set_render_result(False, error=err[-200:])
        raise RuntimeError(f"Remotion falló: {err[-200:]}")

    if not output_path.exists():
        raise RuntimeError("Remotion no generó el archivo")

    from editor import get_duration as _get_dur
    dur = await _get_dur(output_path)
    if debugger: debugger.set_render_result(True, output_path, duration_s=dur)
    # Downscale 2x→1x con antialiasing de alta calidad (Lanczos)
    fmt = params.get("format", "reel")
    final_w = 390  if fmt == "reel" else (1280 if fmt == "youtube" else 1080)
    final_h = 844  if fmt == "reel" else (720  if fmt == "youtube" else 1080)
    scaled_path = OUTPUTS_DIR / f"{job_id}_scaled.mp4"

    scale_cmd = [
        "ffmpeg", "-y",
        "-i", str(output_path),
        "-vf", f"scale={final_w}:{final_h}:flags=lanczos+accurate_rnd",
        "-c:v", "libx264",
        "-crf", "14",
        "-preset", "slow",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        str(scaled_path),
    ]

    scale_proc = await asyncio.create_subprocess_exec(
        *scale_cmd,
        stdout=asyncio.subprocess.DEVNULL,
        stderr=asyncio.subprocess.DEVNULL,
    )
    await scale_proc.communicate()

    if scaled_path.exists() and scaled_path.stat().st_size > 50000:
        try: output_path.unlink()
        except: pass
        output_path = scaled_path
        print(f"[renderer] scaled OK: {output_path.name} ({output_path.stat().st_size//1024}KB)")
    else:
        print(f"[renderer] scale falló, usando sin escalar")

    print(f"[renderer] OK: {output_path.name} ({output_path.stat().st_size//1024}KB)")
    return output_path
