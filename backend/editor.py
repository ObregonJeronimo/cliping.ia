"""
Editor de video cinematográfico para marketing.
Estrategia: capturar screenshots durante grabación → IA selecciona mejores momentos → FFmpeg edita con efectos épicos.
"""
import asyncio
import json
import os
from pathlib import Path
from typing import Callable

OUTPUTS_DIR = Path("outputs")


async def run_ffmpeg(cmd: list, label: str = "") -> bool:
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.DEVNULL,
        stderr=asyncio.subprocess.PIPE,
    )
    _, stderr = await proc.communicate()
    if proc.returncode != 0:
        print(f"[ffmpeg error] {label}: {stderr.decode()[:300]}")
        return False
    return True


async def get_duration(path: Path) -> float:
    proc = await asyncio.create_subprocess_exec(
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        str(path),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.DEVNULL,
    )
    out, _ = await proc.communicate()
    try:
        return float(out.decode().strip())
    except Exception:
        return 0.0


async def analyze_screenshots_for_edit(screenshots: list, action: str, page_analysis: dict) -> list:
    """
    Groq Vision analiza cada screenshot y devuelve los mejores momentos para el edit.
    screenshots: [{"timestamp": float, "path": Path, "description": str}]
    Retorna: [{"timestamp": float, "score": int, "type": str, "zoom_x": float, "zoom_y": float, "description": str}]
    """
    from vision import _groq_vision, _parse_json, _img

    if not screenshots:
        return []

    # Analizar todos los screenshots de una sola vez para ahorrar tokens
    # Mandamos 1 screenshot cada 2 para no gastar demasiado
    candidates = screenshots[::2] if len(screenshots) > 6 else screenshots

    results = []
    for i, shot in enumerate(candidates):
        try:
            img_bytes = Path(shot["path"]).read_bytes()
            prompt = f"""Analizá este screenshot de una página web para un video de marketing.

Contexto: {page_analysis.get('page_summary', '')}
Timestamp en el video: {shot['timestamp']:.1f}s
Descripción de la acción en este momento: {shot.get('description', '')}

Respondé SOLO con JSON:
{{
  "score": 1-10,
  "type": "hero" | "feature" | "cta" | "product" | "scroll" | "transition",
  "zoom_x": 0.0-1.0,
  "zoom_y": 0.0-1.0,
  "clip_duration": 3-5,
  "reason": "por qué este momento es interesante para marketing"
}}

score: qué tan interesante es para marketing (10 = muy bueno, 1 = scroll aburrido)
zoom_x/zoom_y: coordenadas normalizadas (0-1) del elemento más importante a destacar
clip_duration: cuántos segundos mostrar este clip"""

            raw = await _groq_vision([{"role": "user", "content": [
                {"type": "text", "text": prompt},
                _img(img_bytes)
            ]}], max_tokens=150)

            parsed = _parse_json(raw)
            if isinstance(parsed, list):
                parsed = parsed[0] if parsed else {}

            if parsed and "score" in parsed:
                results.append({
                    "timestamp": shot["timestamp"],
                    "score": int(parsed.get("score", 5)),
                    "type": parsed.get("type", "feature"),
                    "zoom_x": float(parsed.get("zoom_x", 0.5)),
                    "zoom_y": float(parsed.get("zoom_y", 0.5)),
                    "clip_duration": float(parsed.get("clip_duration", 3.5)),
                    "description": parsed.get("reason", ""),
                })
                print(f"[editor] shot@{shot['timestamp']:.1f}s score={parsed.get('score')} type={parsed.get('type')} — {parsed.get('reason','')[:60]}")
        except Exception as e:
            print(f"[editor] shot analysis error: {e}")

    # Ordenar por score y tomar los mejores
    results.sort(key=lambda x: x["score"], reverse=True)
    return results


async def create_epic_edit(
    raw_video: Path,
    screenshots: list,
    page_analysis: dict,
    action: str,
    fmt: dict,
    style: str,
    job_id: str,
    progress_cb: Callable,
) -> Path:
    """
    Pipeline completo de edición épica:
    1. Seleccionar mejores clips con IA
    2. Cortar clips del video original
    3. Aplicar zoom keyframeado a cada clip
    4. Speed ramp en scrolls
    5. Concatenar con smash cuts
    6. Color grade
    """
    w, h = fmt["w"], fmt["h"]
    work_dir = OUTPUTS_DIR / f"edit_{job_id}"
    work_dir.mkdir(exist_ok=True)

    raw_duration = await get_duration(raw_video)
    print(f"[editor] raw duration: {raw_duration:.1f}s, {len(screenshots)} screenshots")

    # PASO 1: Analizar screenshots con IA
    progress_cb("detect", 58)
    best_moments = await analyze_screenshots_for_edit(screenshots, action, page_analysis)

    # Si no hay suficientes buenos momentos, usar distribución uniforme
    if len(best_moments) < 4:
        print("[editor] Pocos momentos buenos, usando distribución uniforme")
        best_moments = _create_uniform_moments(raw_duration, len(screenshots))

    # Seleccionar 6-8 clips para el edit final
    # Siempre incluir el primer momento (hero) y el último (CTA)
    selected = _select_clips(best_moments, raw_duration, target_clips=7)
    print(f"[editor] Clips seleccionados: {len(selected)}")
    for c in selected:
        print(f"  t={c['timestamp']:.1f}s dur={c['clip_duration']:.1f}s score={c['score']} type={c['type']}")

    # PASO 2: Cortar y procesar cada clip
    progress_cb("edit", 65)
    clip_paths = []

    for i, moment in enumerate(selected):
        clip_path = work_dir / f"clip_{i:02d}.mp4"
        success = await _process_clip(
            raw_video, clip_path,
            start=moment["timestamp"],
            duration=moment["clip_duration"],
            zoom_x=moment["zoom_x"],
            zoom_y=moment["zoom_y"],
            clip_type=moment["type"],
            style=style,
            w=w, h=h,
            index=i,
            total=len(selected),
        )
        if success and clip_path.exists():
            clip_paths.append(clip_path)
            progress_cb("edit", 65 + int((i / len(selected)) * 20))

    if not clip_paths:
        print("[editor] No se generaron clips, usando video raw")
        return raw_video

    # PASO 3: Concatenar clips
    progress_cb("edit", 85)
    final_path = OUTPUTS_DIR / f"{job_id}_edited.mp4"
    concat_success = await _concatenate_clips(clip_paths, final_path, w, h)

    # Limpiar temporales
    for p in clip_paths:
        try: p.unlink()
        except: pass
    try: work_dir.rmdir()
    except: pass

    if concat_success and final_path.exists() and final_path.stat().st_size > 50000:
        dur = await get_duration(final_path)
        print(f"[editor] Edit final: {final_path.name} {dur:.1f}s ({final_path.stat().st_size//1024}KB)")
        return final_path

    print("[editor] Fallback al video raw")
    return raw_video


def _create_uniform_moments(duration: float, n_shots: int) -> list:
    """Crea momentos distribuidos uniformemente cuando la IA falla."""
    if duration <= 0:
        duration = 30.0
    count = min(8, max(4, n_shots))
    step = duration / (count + 1)
    moments = []
    types = ["hero", "feature", "feature", "feature", "cta", "feature", "cta", "hero"]
    for i in range(count):
        t = step * (i + 1)
        if t + 3 > duration:
            break
        moments.append({
            "timestamp": t,
            "score": 7 - i,
            "type": types[i % len(types)],
            "zoom_x": 0.5,
            "zoom_y": 0.4,
            "clip_duration": 3.5,
            "description": f"Sección {i+1}",
        })
    return moments


def _select_clips(moments: list, duration: float, target_clips: int = 7) -> list:
    """Selecciona clips respetando mínimo gap entre ellos y cubriendo todo el video."""
    if not moments:
        return []

    # Ordenar por timestamp
    by_time = sorted(moments, key=lambda x: x["timestamp"])

    # Asegurarse de no solapar clips
    selected = []
    last_end = -1.0

    for m in by_time:
        start = m["timestamp"]
        end = start + m["clip_duration"]

        # Gap mínimo de 1 segundo entre clips
        if start < last_end + 1.0:
            continue
        # No cortar más allá del final del video
        if start + 2.0 > duration:
            continue

        selected.append(m)
        last_end = end

        if len(selected) >= target_clips:
            break

    # Si quedaron pocos clips, rellenar con más
    if len(selected) < 4:
        return _create_uniform_moments(duration, 6)

    return selected


async def _process_clip(
    src: Path, dst: Path,
    start: float, duration: float,
    zoom_x: float, zoom_y: float,
    clip_type: str, style: str,
    w: int, h: int,
    index: int, total: int,
) -> bool:
    """Procesa un clip individual con zoom keyframeado y efectos."""

    # Velocidad según tipo de clip
    speed_map = {
        "scroll": 2.5,
        "transition": 2.0,
        "feature": 1.0,
        "hero": 0.9,
        "cta": 0.85,
        "product": 1.0,
    }
    speed = speed_map.get(clip_type, 1.0)

    # Duración real del clip en el source (ajustada por velocidad)
    src_duration = duration * speed

    # Escalar al formato destino primero
    scale_filter = (
        f"scale={w}:{h}:force_original_aspect_ratio=decrease,"
        f"pad={w}:{h}:(ow-iw)/2:(oh-ih)/2:black"
    )

    # Zoom keyframeado hacia el punto de interés
    zoom_amount = 1.25 if clip_type in ("hero", "cta") else 1.15
    # Convertir coordenadas normalizadas a offsets de zoom
    # zoompan trabaja en coordenadas de pixels del frame escalado
    fps = 30
    total_frames = int(duration * fps)

    zoom_filter = (
        f"zoompan="
        f"z='min(zoom+{(zoom_amount-1.0)/total_frames:.6f},{zoom_amount})':"
        f"x='iw*{zoom_x:.3f}-iw/zoom/2':"
        f"y='ih*{zoom_y:.3f}-ih/zoom/2':"
        f"d={total_frames}:"
        f"s={w}x{h}:"
        f"fps={fps}"
    )

    # Speed ramp
    speed_filter = f"setpts={1.0/speed:.4f}*PTS"

    # Fade in al inicio de cada clip (excepto el primero)
    fade_filter = ""
    if index > 0:
        fade_filter = f",fade=t=in:st=0:d=0.2"
    # Fade out al final de cada clip (excepto el último)
    if index < total - 1:
        fade_out_start = max(0, duration - 0.2)
        fade_filter += f",fade=t=out:st={fade_out_start:.2f}:d=0.2"

    vf = f"{scale_filter},{speed_filter},{zoom_filter}{fade_filter}"

    cmd = [
        "ffmpeg", "-y",
        "-ss", str(start),
        "-t", str(src_duration),
        "-i", str(src),
        "-vf", vf,
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "20",
        "-r", str(fps),
        "-pix_fmt", "yuv420p",
        "-an",
        str(dst),
    ]

    return await run_ffmpeg(cmd, f"clip_{index}")


async def _concatenate_clips(clips: list, output: Path, w: int, h: int) -> bool:
    """Concatena clips con smash cuts (corte seco)."""
    if len(clips) == 1:
        import shutil
        shutil.copy(clips[0], output)
        return True

    # Crear archivo de concat
    concat_file = output.parent / f"concat_{output.stem}.txt"
    with open(concat_file, "w") as f:
        for clip in clips:
            f.write(f"file '{clip.absolute()}'\n")

    cmd = [
        "ffmpeg", "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", str(concat_file),
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "18",
        "-movflags", "+faststart",
        "-pix_fmt", "yuv420p",
        "-an",
        str(output),
    ]

    success = await run_ffmpeg(cmd, "concat")

    try:
        concat_file.unlink()
    except:
        pass

    return success
