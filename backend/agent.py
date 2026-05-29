import asyncio
import os
from pathlib import Path
from typing import Callable

from playwright.async_api import async_playwright
from vision import analyze_page, plan_actions, execute_step, generate_voiceover_script

OUTPUTS_DIR = Path("outputs")
OUTPUTS_DIR.mkdir(exist_ok=True)

FORMATS = {
    "reel":    {"w": 390,  "h": 844},
    "youtube": {"w": 1280, "h": 720},
    "feed":    {"w": 1080, "h": 1080},
}

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
    final_video = OUTPUTS_DIR / f"{job_id}_final.mp4"
    mixed_video = OUTPUTS_DIR / f"{job_id}_mixed.mp4"

    progress_cb("browse", 10)
    descriptions = []
    click_timestamps = []  # para zoom en edicion

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-dev-shm-usage"]
        )
        context = await browser.new_context(
            viewport={"width": RECORD_W, "height": RECORD_H},
            record_video_dir=str(OUTPUTS_DIR),
            record_video_size={"width": RECORD_W, "height": RECORD_H},
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
        )
        page = await context.new_page()

        # cargar pagina
        progress_cb("browse", 15)
        try:
            await page.goto(url, wait_until="networkidle", timeout=30000)
        except Exception:
            try:
                await page.goto(url, wait_until="domcontentloaded", timeout=20000)
            except Exception:
                await page.goto(url, wait_until="commit", timeout=15000)

        await page.wait_for_timeout(3000)

        # FASE 1: analizar la pagina
        progress_cb("browse", 20)
        screenshot = await page.screenshot(type="png", full_page=False)
        page_analysis = await analyze_page(screenshot, url, action)
        print(f"[agent] page type: {page_analysis.get('page_type')} — plan: {page_analysis.get('plan')}")

        # FASE 2: ejecutar pasos planificados
        progress_cb("navigate", 25)
        steps = page_analysis.get("steps", [])
        
        for i, step in enumerate(steps[:10]):
            pct = 25 + int((i / max(len(steps), 1)) * 35)
            progress_cb("navigate", pct)

            screenshot = await page.screenshot(type="png", full_page=False)
            result = await execute_step(screenshot, step, url)
            
            act = result.get("action", "scroll_down")
            desc = result.get("description", "")
            x = result.get("x")
            y = result.get("y")
            
            if desc:
                descriptions.append(desc)
            print(f"[step {i}] {act} — {desc}")

            if act == "done":
                await page.wait_for_timeout(2000)
                break

            elif act == "click" and x and y:
                # click por coordenadas — mas confiable
                try:
                    await page.mouse.move(x, y)
                    await page.wait_for_timeout(300)
                    await page.mouse.click(x, y)
                    click_timestamps.append(i)
                    await page.wait_for_timeout(2500)
                except Exception as e:
                    print(f"[click error] {e}")
                    await page.evaluate(f"window.scrollBy({{top: 300, behavior: 'smooth'}})")
                    await page.wait_for_timeout(1500)

            elif act == "click_text":
                sel = result.get("selector", "")
                try:
                    el = page.get_by_text(sel, exact=False).first
                    if await el.count() > 0:
                        await el.scroll_into_view_if_needed()
                        await page.wait_for_timeout(400)
                        await el.click(timeout=5000)
                        click_timestamps.append(i)
                        await page.wait_for_timeout(2500)
                    else:
                        await page.evaluate(f"window.scrollBy({{top: 300, behavior: 'smooth'}})")
                        await page.wait_for_timeout(1500)
                except Exception as e:
                    print(f"[click_text error] {e}")

            elif act == "scroll_down":
                amount = result.get("scroll_amount", 400)
                await page.evaluate(f"window.scrollBy({{top: {amount}, behavior: 'smooth'}})")
                await page.wait_for_timeout(1800)

            elif act == "scroll_up":
                amount = result.get("scroll_amount", 400)
                await page.evaluate(f"window.scrollBy({{top: -{amount}, behavior: 'smooth'}})")
                await page.wait_for_timeout(1500)

            elif act == "scroll_to_top":
                await page.evaluate("window.scrollTo({top: 0, behavior: 'smooth'})")
                await page.wait_for_timeout(1500)

            elif act == "type":
                sel = result.get("selector", "")
                text = result.get("text", "")
                if sel and text:
                    try:
                        el = page.locator(sel).first
                        await el.click()
                        await page.wait_for_timeout(300)
                        await el.fill(text)
                        await page.wait_for_timeout(800)
                    except Exception:
                        pass

            elif act == "wait":
                await page.wait_for_timeout(2500)

        # pausa final para ver el resultado
        await page.wait_for_timeout(3000)
        video_path_str = await page.video.path() if page.video else None
        await context.close()
        await browser.close()

    # obtener webm
    if video_path_str:
        raw_video = Path(video_path_str)
    else:
        recorded = sorted(OUTPUTS_DIR.glob("*.webm"), key=lambda f: f.stat().st_mtime, reverse=True)
        if not recorded:
            raise RuntimeError("Playwright no genero video")
        raw_video = recorded[0]

    if not raw_video.exists() or raw_video.stat().st_size < 1000:
        raise RuntimeError(f"Video muy pequeno: {raw_video}")

    probe = await asyncio.create_subprocess_exec(
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", str(raw_video),
        stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL
    )
    dur_out, _ = await probe.communicate()
    raw_duration = float(dur_out.decode().strip() or "30")
    print(f"[agent] raw video: {raw_video.name} ({raw_video.stat().st_size//1024}KB) {raw_duration:.1f}s")

    # editar
    progress_cb("detect", 60)
    progress_cb("edit", 68)
    edited = await edit_video(raw_video, final_video, fmt, style, raw_duration)

    # voz en off
    result_video = edited
    if voice != "none":
        progress_cb("voice", 82)
        script = await generate_voiceover_script(action, url, descriptions, page_analysis)
        print(f"[voice] {script}")
        audio_path = await generate_voice(script, job_id, voice)
        if audio_path and audio_path.exists():
            mixed = await mix_audio(edited, audio_path, mixed_video)
            if mixed.exists() and mixed.stat().st_size > 10000:
                result_video = mixed

    progress_cb("export", 95)

    probe2 = await asyncio.create_subprocess_exec(
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", str(result_video),
        stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL
    )
    dur2, _ = await probe2.communicate()
    print(f"[agent] final: {result_video.name} duration={dur2.decode().strip()}s")

    try:
        raw_video.unlink()
    except Exception:
        pass

    return result_video


async def edit_video(input_path: Path, output_path: Path, fmt: dict, style: str, duration: float) -> Path:
    w, h = fmt["w"], fmt["h"]
    vf = (
        f"scale={w}:{h}:force_original_aspect_ratio=decrease,"
        f"pad={w}:{h}:(ow-iw)/2:(oh-ih)/2:black"
    )
    cmd = [
        "ffmpeg", "-y",
        "-i", str(input_path),
        "-vf", vf,
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "18",
        "-movflags", "+faststart",
        "-an",
        str(output_path),
    ]
    proc = await asyncio.create_subprocess_exec(
        *cmd, stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.PIPE
    )
    _, stderr = await proc.communicate()
    if not output_path.exists() or output_path.stat().st_size < 10000:
        print(f"FFmpeg error: {stderr.decode()[:300]}")
        return input_path
    return output_path


async def generate_voice(script: str, job_id: str, voice: str) -> Path | None:
    audio_path = OUTPUTS_DIR / f"{job_id}_voice.mp3"
    voice_map = {"female": "es-AR-ElenaNeural", "male": "es-AR-TomasNeural"}
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
        "-map", "0:v", "-map", "1:a",
        "-c:v", "copy", "-c:a", "aac", "-b:a", "128k",
        "-movflags", "+faststart",
        str(output_path),
    ]
    proc = await asyncio.create_subprocess_exec(
        *cmd, stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.DEVNULL
    )
    await proc.communicate()
    return output_path if output_path.exists() else video_path
