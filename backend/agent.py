import asyncio
import os
from pathlib import Path
from typing import Callable

from playwright.async_api import async_playwright
from vision import analyze_page, execute_step, generate_voiceover_script
from editor import create_epic_edit, get_duration, OUTPUTS_DIR

FORMATS = {
    "reel":    {"w": 390,  "h": 844},
    "youtube": {"w": 1280, "h": 720},
    "feed":    {"w": 1080, "h": 1080},
}

RECORD_W, RECORD_H = 390, 844
SCREENSHOT_INTERVAL = 3.0  # capturar screenshot cada N segundos durante la grabación


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
    mixed_video = OUTPUTS_DIR / f"{job_id}_mixed.mp4"
    screenshots_dir = OUTPUTS_DIR / f"shots_{job_id}"
    screenshots_dir.mkdir(exist_ok=True)

    progress_cb("browse", 10)
    descriptions = []
    screenshots = []  # [{timestamp, path, description}]
    recording_start = None

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

        # Cargar página
        progress_cb("browse", 15)
        try:
            await page.goto(url, wait_until="networkidle", timeout=30000)
        except Exception:
            try:
                await page.goto(url, wait_until="domcontentloaded", timeout=20000)
            except Exception:
                await page.goto(url, wait_until="commit", timeout=15000)

        await page.wait_for_timeout(3000)
        recording_start = asyncio.get_event_loop().time()

        # Screenshot inicial (hero)
        shot_path = screenshots_dir / f"shot_000.png"
        await page.screenshot(path=str(shot_path), type="png", full_page=False)
        screenshots.append({"timestamp": 0.0, "path": shot_path, "description": "Hero de la página"})

        # FASE 1: Analizar la página
        progress_cb("browse", 20)
        page_analysis = await analyze_page(shot_path.read_bytes(), url, action)
        print(f"[agent] {page_analysis.get('page_type')} — {page_analysis.get('page_summary','')[:80]}")

        # FASE 2: Ejecutar pasos con captura de screenshots
        progress_cb("navigate", 25)
        steps = page_analysis.get("steps", [])
        shot_counter = 1
        last_shot_time = 0.0

        for i, step in enumerate(steps[:12]):
            pct = 25 + int((i / max(len(steps), 1)) * 30)
            progress_cb("navigate", pct)

            current_ts = asyncio.get_event_loop().time() - recording_start

            # Capturar screenshot si pasaron N segundos
            if current_ts - last_shot_time >= SCREENSHOT_INTERVAL:
                shot_path = screenshots_dir / f"shot_{shot_counter:03d}.png"
                await page.screenshot(path=str(shot_path), type="png", full_page=False)
                screenshots.append({
                    "timestamp": current_ts,
                    "path": shot_path,
                    "description": step.get("goal", "")
                })
                shot_counter += 1
                last_shot_time = current_ts

            # Analizar y ejecutar el paso
            shot_for_analysis = screenshots[-1]["path"].read_bytes()
            result = await execute_step(shot_for_analysis, step, url)

            act = result.get("action", "scroll_down")
            desc = result.get("description", "")
            if desc:
                descriptions.append(desc)
            print(f"[step {i}] {act} — {desc[:60]}")

            if act == "done":
                await page.wait_for_timeout(2000)
                break
            elif act == "click" and result.get("x") and result.get("y"):
                x, y = result["x"], result["y"]
                try:
                    await page.mouse.move(x, y)
                    await page.wait_for_timeout(300)
                    await page.mouse.click(x, y)
                    await page.wait_for_timeout(2500)
                    # Screenshot post-click
                    shot_path = screenshots_dir / f"shot_{shot_counter:03d}.png"
                    await page.screenshot(path=str(shot_path), type="png", full_page=False)
                    ts = asyncio.get_event_loop().time() - recording_start
                    screenshots.append({"timestamp": ts, "path": shot_path, "description": f"Después de click: {desc}"})
                    shot_counter += 1
                    last_shot_time = ts
                except Exception as e:
                    print(f"[click error] {e}")
            elif act == "click_text":
                sel = result.get("selector", "")
                try:
                    el = page.get_by_text(sel, exact=False).first
                    if await el.count() > 0:
                        await el.scroll_into_view_if_needed()
                        await page.wait_for_timeout(400)
                        await el.click(timeout=5000)
                        await page.wait_for_timeout(2500)
                except Exception:
                    await page.evaluate("window.scrollBy({top: 300, behavior: 'smooth'})")
                    await page.wait_for_timeout(1500)
            elif act == "scroll_down":
                amount = result.get("scroll_amount", 380)
                await page.evaluate(f"window.scrollBy({{top: {amount}, behavior: 'smooth'}})")
                await page.wait_for_timeout(1800)
            elif act == "scroll_up":
                amount = result.get("scroll_amount", 380)
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
                        await el.fill(text)
                        await page.wait_for_timeout(800)
                    except Exception:
                        pass
            elif act == "wait":
                await page.wait_for_timeout(2500)

        # Pausa final + screenshot final
        await page.wait_for_timeout(2500)
        final_ts = asyncio.get_event_loop().time() - recording_start
        shot_path = screenshots_dir / f"shot_{shot_counter:03d}.png"
        await page.screenshot(path=str(shot_path), type="png", full_page=False)
        screenshots.append({"timestamp": final_ts, "path": shot_path, "description": "Vista final"})

        video_path_str = await page.video.path() if page.video else None
        await context.close()
        await browser.close()

    # Obtener webm
    if video_path_str:
        raw_video = Path(video_path_str)
    else:
        recorded = sorted(OUTPUTS_DIR.glob("*.webm"), key=lambda f: f.stat().st_mtime, reverse=True)
        if not recorded:
            raise RuntimeError("Playwright no generó video")
        raw_video = recorded[0]

    if not raw_video.exists() or raw_video.stat().st_size < 1000:
        raise RuntimeError(f"Video muy pequeño: {raw_video}")

    raw_duration = await get_duration(raw_video)
    print(f"[agent] raw: {raw_video.name} {raw_duration:.1f}s {raw_video.stat().st_size//1024}KB — {len(screenshots)} shots")

    # EDICIÓN ÉPICA
    progress_cb("detect", 55)
    edited_video = await create_epic_edit(
        raw_video=raw_video,
        screenshots=screenshots,
        page_analysis=page_analysis,
        action=action,
        fmt=fmt,
        style=style,
        job_id=job_id,
        progress_cb=progress_cb,
    )

    # Limpiar screenshots
    for shot in screenshots:
        try: Path(shot["path"]).unlink()
        except: pass
    try: screenshots_dir.rmdir()
    except: pass

    # Voz en off
    result_video = edited_video
    edit_duration = await get_duration(edited_video)

    if voice != "none":
        progress_cb("voice", 88)
        script = await generate_voiceover_script(action, url, descriptions, page_analysis, edit_duration)
        print(f"[voice] {edit_duration:.1f}s — {script}")
        audio_path = await generate_voice(script, job_id, voice)
        if audio_path and audio_path.exists():
            mixed = await mix_audio(edited_video, audio_path, mixed_video, edit_duration)
            if mixed.exists() and mixed.stat().st_size > 10000:
                result_video = mixed

    progress_cb("export", 95)
    final_duration = await get_duration(result_video)
    print(f"[agent] final: {result_video.name} {final_duration:.1f}s {result_video.stat().st_size//1024}KB")

    # Limpiar raw
    try: raw_video.unlink()
    except: pass

    return result_video


async def generate_voice(script: str, job_id: str, voice: str) -> Path | None:
    audio_path = OUTPUTS_DIR / f"{job_id}_voice.mp3"
    voice_map = {"female": "es-MX-DaliaNeural", "male": "es-MX-JorgeNeural"}
    try:
        import edge_tts
        communicate = edge_tts.Communicate(script, voice_map.get(voice, "es-MX-DaliaNeural"))
        await communicate.save(str(audio_path))
        return audio_path
    except Exception as e:
        print(f"[tts error] {e}")
        return None


async def mix_audio(video_path: Path, audio_path: Path, output_path: Path, video_duration: float) -> Path:
    """Mezcla video + audio, el audio se repite si es más corto que el video."""
    # Si el audio es más corto que el video, usamos adelay y aloop para cubrirlo
    cmd = [
        "ffmpeg", "-y",
        "-i", str(video_path),
        "-i", str(audio_path),
        "-map", "0:v",
        "-map", "1:a",
        "-c:v", "copy",
        "-c:a", "aac",
        "-b:a", "128k",
        "-shortest",
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
