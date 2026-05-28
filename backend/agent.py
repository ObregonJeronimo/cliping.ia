import asyncio
import os
from pathlib import Path
from typing import Callable

from playwright.async_api import async_playwright
from vision import analyze_screenshot, generate_voiceover_script

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

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-dev-shm-usage"]
        )
        context = await browser.new_context(
            viewport={"width": RECORD_W, "height": RECORD_H},
            device_scale_factor=2,
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

        # pausa inicial larga para que se vea bien la página
        await page.wait_for_timeout(3000)

        progress_cb("navigate", 25)

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
                # pausa larga al final para que se vea el resultado
                await page.wait_for_timeout(3000)
                break

            elif act == "click":
                sel = instruction.get("selector", "")
                clicked = False
                if sel:
                    for try_fn in [
                        lambda: page.get_by_text(sel, exact=False).first,
                        lambda: page.locator(sel).first,
                        lambda: page.get_by_role("button", name=sel).first,
                    ]:
                        try:
                            el = try_fn()
                            if await el.count() > 0:
                                await el.scroll_into_view_if_needed()
                                await page.wait_for_timeout(600)
                                await el.click(timeout=5000)
                                clicked = True
                                break
                        except Exception:
                            continue
                if not clicked:
                    await page.evaluate("window.scrollBy(0, 300)")
                # pausa después de click para que se vea la reacción
                await page.wait_for_timeout(2500)

            elif act == "type":
                sel = instruction.get("selector", "")
                text = instruction.get("text", "")
                if sel and text:
                    try:
                        el = page.locator(sel).first
                        if await el.count() > 0:
                            await el.click()
                            await page.wait_for_timeout(400)
                            await el.fill(text)
                            await page.wait_for_timeout(800)
                    except Exception:
                        pass

            elif act == "scroll_down":
                amount = instruction.get("scroll_amount", 350)
                await page.evaluate(f"window.scrollBy({{top: {amount}, behavior: 'smooth'}})")
                await page.wait_for_timeout(1500)

            elif act == "scroll_up":
                amount = instruction.get("scroll_amount", 350)
                await page.evaluate(f"window.scrollBy({{top: -{amount}, behavior: 'smooth'}})")
                await page.wait_for_timeout(1500)

            elif act == "wait":
                await page.wait_for_timeout(2500)

        # pausa final
        await page.wait_for_timeout(2500)
        video_path_str = await page.video.path() if page.video else None
        await context.close()
        await browser.close()

    # obtener el webm
    if video_path_str:
        raw_video = Path(video_path_str)
    else:
        recorded = sorted(OUTPUTS_DIR.glob("*.webm"), key=lambda f: f.stat().st_mtime, reverse=True)
        if not recorded:
            raise RuntimeError("Playwright no generó video")
        raw_video = recorded[0]

    if not raw_video.exists() or raw_video.stat().st_size < 1000:
        raise RuntimeError(f"Video grabado muy pequeño: {raw_video}")

    print(f"[agent] raw video: {raw_video} ({raw_video.stat().st_size // 1024}KB)")
    # medir duración real
    probe = await asyncio.create_subprocess_exec(
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", str(raw_video),
        stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL
    )
    dur_out, _ = await probe.communicate()
    print(f"[agent] raw duration: {dur_out.decode().strip()}s")

    progress_cb("detect", 55)
    progress_cb("edit", 65)
    edited = await edit_video(raw_video, final_video, fmt, style)

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

    probe2 = await asyncio.create_subprocess_exec(
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", str(result_video),
        stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL
    )
    dur2, _ = await probe2.communicate()
    print(f"[agent] final video: {result_video} ({result_video.stat().st_size // 1024}KB) duration={dur2.decode().strip()}s")
    return result_video


async def edit_video(input_path: Path, output_path: Path, fmt: dict, style: str) -> Path:
    w, h = fmt["w"], fmt["h"]

    # escalar y crop al formato destino
    vf_scale = f"scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h}"

    vf = vf_scale

    cmd = [
        "ffmpeg", "-y",
        "-i", str(input_path),
        "-vf", vf,
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "20",
        "-movflags", "+faststart",
        "-vsync", "cfr",
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
    # obtener duración del video
    probe_cmd = [
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        str(video_path)
    ]
    proc = await asyncio.create_subprocess_exec(
        *probe_cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.DEVNULL,
    )
    stdout, _ = await proc.communicate()
    try:
        duration = float(stdout.decode().strip())
    except Exception:
        duration = 30.0

    # mezclar: video + voz + música de fondo suave (si hay)
    cmd = [
        "ffmpeg", "-y",
        "-i", str(video_path),
        "-i", str(audio_path),
        "-map", "0:v",
        "-map", "1:a",
        "-c:v", "copy",
        "-c:a", "aac",
        "-b:a", "128k",
        "-movflags", "+faststart",
        str(output_path),
    ]
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.DEVNULL,
        stderr=asyncio.subprocess.DEVNULL,
    )
    await proc.communicate()
    return output_path if output_path.exists() else video_path
