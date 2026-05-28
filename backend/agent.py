import asyncio
import os
from pathlib import Path
from typing import Callable

from playwright.async_api import async_playwright

OUTPUTS_DIR = Path("outputs")
OUTPUTS_DIR.mkdir(exist_ok=True)

FORMATS = {
    "reel":    {"w": 1080, "h": 1920},
    "youtube": {"w": 1920, "h": 1080},
    "feed":    {"w": 1080, "h": 1080},
}

async def run_agent(
    url: str,
    action: str,
    format: str,
    style: str,
    voice: str,
    job_id: str,
    progress_cb: Callable,
) -> Path:

    fmt = FORMATS.get(format, FORMATS["reel"])
    final_video = OUTPUTS_DIR / f"{job_id}_final.mp4"
    mixed_video = OUTPUTS_DIR / f"{job_id}_mixed.mp4"

    # ── PASO 1: navegar y grabar ──────────────────────────────────────────
    progress_cb("browse", 10)
    events = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 1280, "height": 720},
            record_video_dir=str(OUTPUTS_DIR),
            record_video_size={"width": 1280, "height": 720},
        )
        page = await context.new_page()

        progress_cb("navigate", 20)
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=30000)
        except Exception:
            await page.goto(url, wait_until="commit", timeout=30000)
        await page.wait_for_timeout(2000)

        progress_cb("navigate", 35)
        await execute_action(page, action, events)
        await page.wait_for_timeout(2000)

        # guardar path del video ANTES de cerrar
        video_path_str = await page.video.path() if page.video else None

        await context.close()
        await browser.close()

    # encontrar el webm grabado
    if video_path_str:
        raw_video = Path(video_path_str)
    else:
        recorded = sorted(OUTPUTS_DIR.glob("*.webm"), key=lambda f: f.stat().st_mtime, reverse=True)
        if not recorded:
            raise RuntimeError("Playwright no generó video")
        raw_video = recorded[0]

    if not raw_video.exists() or raw_video.stat().st_size < 1000:
        raise RuntimeError(f"Video grabado muy pequeño o inexistente: {raw_video}")

    # ── PASO 2: editar con FFmpeg ─────────────────────────────────────────
    progress_cb("detect", 50)
    progress_cb("edit", 60)
    edited = await edit_video(raw_video, final_video, fmt, events, style)

    # ── PASO 3: voz en off ────────────────────────────────────────────────
    result_video = edited
    if voice != "none":
        progress_cb("voice", 80)
        script = generate_script(url, action)
        audio_path = await generate_voice(script, job_id, voice)
        if audio_path and audio_path.exists():
            mixed = await mix_audio(edited, audio_path, mixed_video)
            if mixed.exists() and mixed.stat().st_size > 10000:
                result_video = mixed

    progress_cb("export", 95)

    # limpiar webm
    try:
        raw_video.unlink()
    except Exception:
        pass

    return result_video


async def execute_action(page, action: str, events: list):
    action_lower = action.lower()

    await page.evaluate("window.scrollTo({top: 0, behavior: 'smooth'})")
    await page.wait_for_timeout(800)
    await page.evaluate("window.scrollTo({top: 400, behavior: 'smooth'})")
    await page.wait_for_timeout(1200)
    await page.evaluate("window.scrollTo({top: 0, behavior: 'smooth'})")
    await page.wait_for_timeout(800)

    if any(w in action_lower for w in ["pedido", "comprar", "carrito", "agregar", "add"]):
        await _try_click_selector(page, events, [
            "[data-testid*='add']", ".add-to-cart", ".btn-cart",
            "button:has-text('Agregar')", "button:has-text('Comprar')",
            "button:has-text('Add to cart')", ".product-item:first-child",
        ])

    elif any(w in action_lower for w in ["registrar", "registro", "signup", "crear cuenta"]):
        await _try_click_selector(page, events, [
            "a:has-text('Registrarse')", "a:has-text('Crear cuenta')",
            "button:has-text('Sign up')", "[href*='register']", "[href*='signup']",
        ])

    elif any(w in action_lower for w in ["login", "iniciar", "ingresar"]):
        await _try_click_selector(page, events, [
            "a:has-text('Iniciar sesión')", "a:has-text('Login')",
            "button:has-text('Ingresar')", "[href*='login']",
        ])

    else:
        for scroll_y in [400, 800, 1200, 600, 0]:
            await page.evaluate(f"window.scrollTo({{top: {scroll_y}, behavior: 'smooth'}})")
            await page.wait_for_timeout(1000)


async def _try_click_selector(page, events: list, selectors: list):
    for sel in selectors:
        try:
            el = page.locator(sel).first
            if await el.count() > 0:
                await el.scroll_into_view_if_needed()
                await page.wait_for_timeout(500)
                events.append({"type": "click", "ts": asyncio.get_event_loop().time()})
                await el.click(timeout=5000)
                await page.wait_for_timeout(2000)
                return True
        except Exception:
            continue
    return False


async def edit_video(input_path: Path, output_path: Path, fmt: dict, events: list, style: str) -> Path:
    w, h = fmt["w"], fmt["h"]
    vf = f"scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h}"

    cmd = [
        "ffmpeg", "-y",
        "-i", str(input_path),
        "-vf", vf,
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "23",
        "-r", "30",
        "-an",
        str(output_path),
    ]

    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.DEVNULL,
        stderr=asyncio.subprocess.PIPE,
    )
    _, stderr = await proc.communicate()

    if not output_path.exists() or output_path.stat().st_size < 10000:
        print(f"FFmpeg error: {stderr.decode()[:500]}")
        return input_path

    return output_path


def generate_script(url: str, action: str) -> str:
    domain = url.replace("https://", "").replace("http://", "").split("/")[0]
    return f"Mirá qué fácil es en {domain}. {action}. En segundos, listo."


async def generate_voice(script: str, job_id: str, voice: str) -> Path | None:
    audio_path = OUTPUTS_DIR / f"{job_id}_voice.mp3"
    voice_map = {
        "female": "es-AR-ElenaNeural",
        "male":   "es-AR-TomasNeural",
    }
    voice_name = voice_map.get(voice, "es-AR-ElenaNeural")
    try:
        import edge_tts
        communicate = edge_tts.Communicate(script, voice_name)
        await communicate.save(str(audio_path))
        return audio_path
    except Exception as e:
        print(f"Voice error: {e}")
        return None


async def mix_audio(video_path: Path, audio_path: Path, output_path: Path) -> Path:
    cmd = [
        "ffmpeg", "-y",
        "-i", str(video_path),
        "-i", str(audio_path),
        "-c:v", "copy",
        "-c:a", "aac",
        "-shortest",
        str(output_path),
    ]
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.DEVNULL,
        stderr=asyncio.subprocess.DEVNULL,
    )
    await proc.communicate()
    return output_path if output_path.exists() else video_path
