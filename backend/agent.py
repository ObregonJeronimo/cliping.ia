import asyncio
import os
from pathlib import Path
from typing import Callable

from playwright.async_api import async_playwright
from vision import analyze_page, execute_step, generate_voiceover_script
from editor import get_duration, OUTPUTS_DIR
from remotion_renderer import extract_page_data_deep, render_video
from debug_logger import VideoDebugger

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
    req_params: dict = None,
    override_page_data: dict = None,   # si viene, se usan estos datos en vez de analizar
) -> Path:
    if req_params is None:
        req_params = {}

    fmt = FORMATS.get(format, FORMATS["reel"])
    mixed_video = OUTPUTS_DIR / f"{job_id}_mixed.mp4"
    screenshots_dir = OUTPUTS_DIR / f"shots_{job_id}"
    screenshots_dir.mkdir(exist_ok=True)

    debugger = VideoDebugger(job_id, url, action)
    debugger.log("start", f"format={format} style={style} voice={voice}")
    progress_cb("browse", 10)
    descriptions = []
    hero_screenshot = None  # Screenshot principal para Remotion

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

        # Screenshot hero (full page scroll para capturar todo)
        hero_path = screenshots_dir / "hero.png"
        await page.screenshot(path=str(hero_path), type="png", full_page=False)
        hero_screenshot = hero_path

        # FASE 1: Analizar la página
        progress_cb("browse", 20)
        hero_bytes = hero_path.read_bytes()
        page_analysis = await analyze_page(hero_bytes, url, action)
        if override_page_data:
            page_data = override_page_data
            print(f"[agent] (datos editados) {page_data.get('siteName')} — {page_data.get('headline')}")
        else:
            page_data = await extract_page_data_deep(hero_bytes, url, action)
        debugger.set_page_data(page_data)
        print(f"[agent] {page_data.get('siteName')} — {page_data.get('headline')}")

        # FASE 2: Navegar la página (para el rawvideo de referencia y para tener descripciones)
        progress_cb("navigate", 25)
        steps = page_analysis.get("steps", [])

        for i, step in enumerate(steps[:10]):
            pct = 25 + int((i / max(len(steps), 1)) * 25)
            progress_cb("navigate", pct)

            shot_bytes = (await page.screenshot(type="png", full_page=False))
            result = await execute_step(shot_bytes, step, url)

            act = result.get("action", "scroll_down")
            desc = result.get("description", "")
            if desc:
                descriptions.append(desc)

            if act == "done":
                await page.wait_for_timeout(2000)
                break
            elif act == "click" and result.get("x") and result.get("y"):
                try:
                    await page.mouse.move(result["x"], result["y"])
                    await page.wait_for_timeout(300)
                    await page.mouse.click(result["x"], result["y"])
                    await page.wait_for_timeout(2000)
                except Exception as e:
                    print(f"[click error] {e}")
            elif act == "scroll_down":
                await page.evaluate(f"window.scrollBy({{top: {result.get('scroll_amount', 380)}, behavior: 'smooth'}})")
                await page.wait_for_timeout(1500)
            elif act == "scroll_up":
                await page.evaluate(f"window.scrollBy({{top: -{result.get('scroll_amount', 380)}, behavior: 'smooth'}})")
                await page.wait_for_timeout(1500)
            elif act == "scroll_to_top":
                await page.evaluate("window.scrollTo({top: 0, behavior: 'smooth'})")
                await page.wait_for_timeout(1500)
            elif act == "wait":
                await page.wait_for_timeout(2000)

        # Screenshot final (bottom of page)
        bottom_path = screenshots_dir / "bottom.png"
        await page.screenshot(path=str(bottom_path), type="png", full_page=False)

        await page.wait_for_timeout(1000)
        video_path_str = await page.video.path() if page.video else None
        await context.close()
        await browser.close()

    # Limpiar webm (no lo necesitamos para Remotion)
    if video_path_str:
        try: Path(video_path_str).unlink()
        except: pass

    # FASE 3: Generar video animado con Remotion
    progress_cb("detect", 55)
    progress_cb("edit", 60)
    debugger.log("render_start", "Iniciando Remotion")

    try:
        render_params = {
            "url": url,
            "mode": req_params.get("mode", "simple"),
            "visualStyle": req_params.get("visualStyle", "dark_premium"),
            "narrative": req_params.get("narrative", "problem_solution"),
            "hook": req_params.get("hook", "question"),
            "tone": req_params.get("tone", "enthusiastic"),
            "focus": req_params.get("focus", "product"),
            "duration": req_params.get("duration", 30),
            "format": format,
        }
        edited_video = await render_video(
            page_data=page_data,
            screenshot_path=hero_screenshot,
            job_id=job_id,
            params=render_params,
            debugger=debugger,
        )
    except Exception as e:
        print(f"[remotion] falló: {e}, usando fallback")
        # Fallback: buscar el webm más reciente
        webms = sorted(OUTPUTS_DIR.glob("*.webm"), key=lambda f: f.stat().st_mtime, reverse=True)
        if webms:
            from editor import create_epic_edit
            edited_video = await create_epic_edit(webms[0], [], page_analysis, action, fmt, style, job_id, progress_cb)
        else:
            raise RuntimeError("No se pudo generar el video")

    # Limpiar screenshots
    for p in screenshots_dir.glob("*"):
        try: p.unlink()
        except: pass
    try: screenshots_dir.rmdir()
    except: pass

    # FASE 4: Voz en off
    result_video = edited_video
    edit_duration = await get_duration(edited_video)

    if voice != "none" and edit_duration > 0:
        progress_cb("voice", 88)
        script = await generate_voiceover_script(action, url, descriptions, page_analysis, edit_duration)
        print(f"[voice] {edit_duration:.1f}s — {script[:80]}")
        audio_path = await generate_voice(script, job_id, voice)
        if audio_path and audio_path.exists():
            mixed = await mix_audio(edited_video, audio_path, mixed_video)
            if mixed.exists() and mixed.stat().st_size > 10000:
                result_video = mixed

    progress_cb("export", 95)
    final_duration = await get_duration(result_video)
    debugger.set_final(result_video)
    print(f"[agent] final: {result_video.name} {final_duration:.1f}s {result_video.stat().st_size//1024}KB")

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


async def mix_audio(video_path: Path, audio_path: Path, output_path: Path) -> Path:
    cmd = [
        "ffmpeg", "-y",
        "-i", str(video_path),
        "-i", str(audio_path),
        "-map", "0:v", "-map", "1:a",
        "-c:v", "copy", "-c:a", "aac", "-b:a", "128k",
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
