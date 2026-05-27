"""
Agente principal de cliping.ia
Navega la web con Playwright, graba video, aplica efectos con FFmpeg
"""
import asyncio
import json
import os
import subprocess
from pathlib import Path
from typing import Callable

from playwright.async_api import async_playwright

OUTPUTS_DIR = Path("outputs")
OUTPUTS_DIR.mkdir(exist_ok=True)

# dimensiones por formato
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
    raw_video = OUTPUTS_DIR / f"{job_id}_raw.webm"
    final_video = OUTPUTS_DIR / f"{job_id}_final.mp4"

    # ── PASO 1: navegar y grabar ──────────────────────────────────────────
    progress_cb("browse", 10)
    events = []  # timestamps de clicks/scrolls para efectos

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 1280, "height": 720},
            record_video_dir=str(OUTPUTS_DIR),
            record_video_size={"width": 1280, "height": 720},
        )
        page = await context.new_page()

        # capturar eventos
        async def on_click(event):
            events.append({"type": "click", "ts": asyncio.get_event_loop().time(), "data": event})

        page.on("console", lambda msg: None)  # silenciar logs

        progress_cb("navigate", 20)
        await page.goto(url, wait_until="domcontentloaded", timeout=30000)
        await page.wait_for_timeout(2000)

        # ejecutar acción con el LLM
        progress_cb("navigate", 35)
        await execute_action(page, action, events)

        # esperar un poco al final para capturar la pantalla final
        await page.wait_for_timeout(2000)

        # cerrar — Playwright guarda el video al cerrar el context
        await context.close()
        await browser.close()

    # encontrar el video grabado (Playwright lo nombra con UUID propio)
    recorded = sorted(OUTPUTS_DIR.glob("*.webm"), key=lambda f: f.stat().st_mtime, reverse=True)
    if not recorded:
        raise RuntimeError("Playwright no generó video")
    raw_video = recorded[0]

    # ── PASO 2: editar con FFmpeg ─────────────────────────────────────────
    progress_cb("edit", 60)
    edited_video = await edit_video(raw_video, final_video, fmt, events, style)

    # ── PASO 3: voz en off ────────────────────────────────────────────────
    if voice != "none":
        progress_cb("voice", 80)
        script = generate_script(url, action)
        audio_path = await generate_voice(script, job_id, voice)
        if audio_path:
            edited_video = await mix_audio(edited_video, audio_path, job_id)

    progress_cb("export", 95)
    return edited_video


async def execute_action(page, action: str, events: list):
    """
    Ejecuta la acción en lenguaje natural usando el LLM configurado.
    Por ahora: implementación básica con heurísticas.
    Cuando tengas API key de OpenAI/DeepSeek, descomentar la sección LLM.
    """
    action_lower = action.lower()

    # scroll para mostrar la página
    await page.evaluate("window.scrollTo({top: 0, behavior: 'smooth'})")
    await page.wait_for_timeout(1000)
    await page.evaluate("window.scrollTo({top: 400, behavior: 'smooth'})")
    await page.wait_for_timeout(1500)
    await page.evaluate("window.scrollTo({top: 0, behavior: 'smooth'})")
    await page.wait_for_timeout(1000)

    # heurísticas básicas por tipo de acción
    if any(w in action_lower for w in ["pedido", "comprar", "carrito", "agregar"]):
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

    elif any(w in action_lower for w in ["catálogo", "catalogo", "productos", "tienda"]):
        await page.evaluate("window.scrollTo({top: 600, behavior: 'smooth'})")
        await page.wait_for_timeout(2000)
        await page.evaluate("window.scrollTo({top: 1200, behavior: 'smooth'})")
        await page.wait_for_timeout(2000)

    elif any(w in action_lower for w in ["login", "iniciar sesión", "ingresar"]):
        await _try_click_selector(page, events, [
            "a:has-text('Iniciar sesión')", "a:has-text('Login')",
            "button:has-text('Ingresar')", "[href*='login']",
        ])

    else:
        # acción genérica: scroll narrativo mostrando la página
        for scroll_y in [300, 700, 1200, 800, 400, 0]:
            await page.evaluate(f"window.scrollTo({{top: {scroll_y}, behavior: 'smooth'}})")
            await page.wait_for_timeout(1200)


async def _try_click_selector(page, events: list, selectors: list):
    for sel in selectors:
        try:
            el = page.locator(sel).first
            if await el.count() > 0:
                await el.scroll_into_view_if_needed()
                await page.wait_for_timeout(500)
                events.append({"type": "click", "ts": asyncio.get_event_loop().time()})
                await el.click()
                await page.wait_for_timeout(2000)
                return True
        except Exception:
            continue
    return False


async def edit_video(
    input_path: Path,
    output_path: Path,
    fmt: dict,
    events: list,
    style: str,
) -> Path:
    """Edición FFmpeg: crop, resize, speed ramp básico"""
    w, h = fmt["w"], fmt["h"]

    # filtro base: escalar y hacer crop para el formato destino
    # mantener aspect ratio llenando el frame (cover)
    vf = f"scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h}"

    # si hay clicks, agregar zoom suave en el primer click
    if events and style == "epic":
        vf += ",zoompan=z='min(zoom+0.002,1.3)':d=75:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={w}x{h}"

    cmd = [
        "ffmpeg", "-y",
        "-i", str(input_path),
        "-vf", vf,
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "23",
        "-r", "30",
        "-an",  # sin audio por ahora (se agrega en mix_audio)
        str(output_path),
    ]

    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.DEVNULL,
        stderr=asyncio.subprocess.DEVNULL,
    )
    await proc.wait()

    if not output_path.exists():
        # FFmpeg no disponible: devolver el raw
        return input_path

    return output_path


def generate_script(url: str, action: str) -> str:
    """Genera el script de la voz en off."""
    domain = url.replace("https://", "").replace("http://", "").split("/")[0]
    return f"Mirá qué fácil es en {domain}. {action}. En segundos, listo."


async def generate_voice(script: str, job_id: str, voice: str) -> Path | None:
    """
    Genera audio con edge-tts (gratis, sin API key).
    Instalar: pip install edge-tts
    """
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
    except ImportError:
        # edge-tts no instalado todavía, continuar sin voz
        return None
    except Exception:
        return None


async def mix_audio(video_path: Path, audio_path: Path, job_id: str) -> Path:
    """Mezcla video + voz en off con FFmpeg."""
    output = OUTPUTS_DIR / f"{job_id}_mixed.mp4"
    cmd = [
        "ffmpeg", "-y",
        "-i", str(video_path),
        "-i", str(audio_path),
        "-c:v", "copy",
        "-c:a", "aac",
        "-shortest",
        str(output),
    ]
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.DEVNULL,
        stderr=asyncio.subprocess.DEVNULL,
    )
    await proc.wait()
    return output if output.exists() else video_path
