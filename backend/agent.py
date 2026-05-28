import asyncio
import os
from pathlib import Path
from typing import Callable

from playwright.async_api import async_playwright
from vision import analyze_screenshot, generate_voiceover_script

OUTPUTS_DIR = Path("outputs")
OUTPUTS_DIR.mkdir(exist_ok=True)

FORMATS = {
    "reel":    {"w": 390,  "h": 844},   # iPhone móvil — nativo vertical
    "youtube": {"w": 1280, "h": 720},
    "feed":    {"w": 1080, "h": 1080},
}

# resolución de grabación interna (más alta para calidad)
RECORD_W, RECORD_H = 390, 844

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
    final_video  = OUTPUTS_DIR / f"{job_id}_final.mp4"
    mixed_video  = OUTPUTS_DIR / f"{job_id}_mixed.mp4"

    # ── PASO 1: navegar con Gemini Vision ────────────────────────────────
    progress_cb("browse", 10)
    descriptions = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-dev-shm-usage"]
        )
        context = await browser.new_context(
            viewport={"width": RECORD_W, "height": RECORD_H},
            device_scale_factor=2,  # retina para mejor calidad
            record_video_dir=str(OUTPUTS_DIR),
            record_video_size={"width": RECORD_W, "height": RECORD_H},
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
        )
        page = await context.new_page()

        progress_cb("browse", 15)
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=30000)
        except Exception:
            await page.goto(url, wait_until="commit", timeout=30000)
        await page.wait_for_timeout(2500)

        progress_cb("navigate", 25)

        # bucle de navegación guiada por Gemini
        max_steps = 12
        for step in range(max_steps):
            screenshot = await page.screenshot(type="png", full_page=False)
            instruction = await analyze_screenshot(screenshot, action, url, step)

            act = instruction.get("action", "scroll_down")
            desc = instruction.get("description", "")
            if desc:
                descriptions.append(desc)
                print(f"[step {step}] {act}: {desc}")

            pct = 25 + int((step / max_steps) * 30)
            progress_cb("navigate", pct)

            if act == "done":
                break

            elif act == "click":
                sel = instruction.get("selector", "")
                clicked = False
                if sel:
                    # intentar por texto primero
                    try:
                        el = page.get_by_text(sel, exact=False).first
                        if await el.count() > 0:
                            await el.scroll_into_view_if_needed()
                            await page.wait_for_timeout(400)
                            await el.click(timeout=5000)
                            clicked = True
                    except Exception:
                        pass
                    # intentar por selector CSS
                    if not clicked:
                        try:
                            el = page.locator(sel).first
                            if await el.count() > 0:
                                await el.scroll_into_view_if_needed()
                                await page.wait_for_timeout(400)
                                await el.click(timeout=5000)
                                clicked = True
                        except Exception:
                            pass
                if not clicked:
                    await page.evaluate("window.scrollBy(0, 300)")
                await page.wait_for_timeout(1500)

            elif act == "type":
                sel = instruction.get("selector", "")
                text = instruction.get("text", "")
                if sel and text:
                    try:
                        el = page.locator(sel).first
                        if await el.count() > 0:
                            await el.click()
                            await el.fill(text)
                            await page.wait_for_timeout(600)
                    except Exception:
                        pass

            elif act == "scroll_down":
                amount = instruction.get("scroll_amount", 400)
                await page.evaluate(f"window.scrollBy({{top: {amount}, behavior: 'smooth'}})")
                await page.wait_for_timeout(1000)

            elif act == "scroll_up":
                amount = instruction.get("scroll_amount", 400)
                await page.evaluate(f"window.scrollBy({{top: -{amount}, behavior: 'smooth'}})")
                await page.wait_for_timeout(1000)

            elif act == "wait":
                await page.wait_for_timeout(2000)

        # pausa final para que se vea el resultado
        await page.wait_for_timeout(2000)
        video_path_str = await page.video.path() if page.video else None
        await context.close()
        await browser.close()

    # obtener el webm grabado
    if video_path_str:
        raw_video = Path(video_path_str)
    else:
        recorded = sorted(OUTPUTS_DIR.glob("*.webm"), key=lambda f: f.stat().st_mtime, reverse=True)
        if not recorded:
            raise RuntimeError("Playwright no generó video")
        raw_video = recorded[0]

    if not raw_video.exists() or raw_video.stat().st_size < 1000:
        raise RuntimeError(f"Video grabado muy pequeño: {raw_video}")

    # ── PASO 2: editar ────────────────────────────────────────────────────
    progress_cb("detect", 55)
    progress_cb("edit", 65)
    edited = await edit_video(raw_video, final_video, fmt, style)

    # ── PASO 3: voz en off con script generado por Gemini ────────────────
    result_video = edited
    if voice != "none":
        progress_cb("voice", 80)
        script = await generate_voiceover_script(action, url, descriptions)
        print(f"[voice] script: {script}")
        audio_path = await generate_voice(script, job_id, voice)
        if audio_path and audio_path.exists():
            mixed = await mix_audio(edited, audio_path, mixed_video)
            if mixed.exists() and mixed.stat().st_size > 10000:
                result_video = mixed

    progress_cb("export", 95)

    try:
        raw_video.unlink()
    except Exception:
        pass

    return result_video


async def edit_video(input_path: Path, output_path: Path, fmt: dict, style: str) -> Path:
    w, h = fmt["w"], fmt["h"]

    # escalar manteniendo aspect ratio y crop al formato destino
    vf = f"scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h}"

    # speed ramp: acelerar partes lentas (2x promedio)
    # para "epic" agregar un leve zoom
    if style == "epic":
        vf += f",zoompan=z='min(zoom+0.001,1.15)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={w}x{h}"

    cmd = [
        "ffmpeg", "-y",
        "-i", str(input_path),
        "-vf", vf,
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "22",
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
        print(f"FFmpeg error: {stderr.decode()[:300]}")
        return input_path

    return output_path


async def generate_voice(script: str, job_id: str, voice: str) -> Path | None:
    audio_path = OUTPUTS_DIR / f"{job_id}_voice.mp3"
    voice_map = {
        "female": "es-AR-ElenaNeural",
        "male":   "es-AR-TomasNeural",
    }
    try:
        import edge_tts
        communicate = edge_tts.Communicate(script, voice_map.get(voice, "es-AR-ElenaNeural"))
        await communicate.save(str(audio_path))
        return audio_path
    except Exception as e:
        print(f"TTS error: {e}")
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
    proc = await asyncio.create_subprocess_exec(*cmd,
        stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.DEVNULL)
    await proc.communicate()
    return output_path if output_path.exists() else video_path
