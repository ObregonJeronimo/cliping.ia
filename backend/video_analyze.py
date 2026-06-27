"""
video_analyze.py — Cine IA: analiza un clip (mp4) generado por IA y devuelve los BEATS para que el motor le
ponga el texto encima en los momentos/zonas correctos. SIN dependencias nuevas: ffmpeg (imageio-ffmpeg) + numpy
+ Pillow (ya instalados). Pipeline (verificado): bajar -> cortes (select=scene) + info; muestreo de frames (4fps,
ancho 160) -> energia de movimiento (diff de frames) + zona legible/color por beat -> JSON.

Salida: { duration, fps, size:{w,h}, cuts:[t...], energy:{hz, values:[0..1]},
          beats:[{start,end,motion, calmRegion:{x,y,w,h} (frac 0..1), dominantColor, textColor}] }
Lo consume el frontend de Cine IA para distribuir el texto del brief sobre los beats (zona calma, color, plate).
"""
import re
import shutil
import asyncio
import tempfile
import subprocess
from pathlib import Path

HZ = 4          # muestras/seg para la curva de energia (4fps alcanza y es barato)
FRAME_W = 160   # ancho del muestreo (mantiene uniformidad sin costo)
ROWS = 6        # bandas horizontales para elegir la zona de texto (caption = banda ancha)
SCENE_THRESH = 0.30


def _ffmpeg() -> str:
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return shutil.which("ffmpeg") or "ffmpeg"


def _run(args) -> str:
    """Corre ffmpeg y devuelve stderr (donde van la info del -i y showinfo)."""
    p = subprocess.run(args, capture_output=True, text=True, encoding="utf-8", errors="replace")
    return (p.stderr or "") + (p.stdout or "")


def _parse_info(stderr: str):
    dur = 0.0
    m = re.search(r"Duration:\s*(\d+):(\d+):(\d+\.?\d*)", stderr)
    if m:
        dur = int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3))
    w = h = 0
    m = re.search(r"(\d{2,5})x(\d{2,5})", stderr)
    if m:
        w, h = int(m.group(1)), int(m.group(2))
    fps = 0.0
    m = re.search(r"(\d+(?:\.\d+)?)\s*fps", stderr)
    if m:
        fps = float(m.group(1))
    return dur, w, h, fps


def _analyze_path(path: str) -> dict:
    """Trabajo pesado (sync): cortes + muestreo + energia + zonas. Se corre en un thread."""
    import numpy as np
    from PIL import Image
    ff = _ffmpeg()
    tmp = Path(tempfile.mkdtemp(prefix="cine_an_"))
    try:
        # 1) cortes + info en una pasada (showinfo imprime pts_time de los frames seleccionados como corte)
        info = _run([ff, "-hide_banner", "-i", path, "-vf",
                     f"select='gt(scene,{SCENE_THRESH})',showinfo", "-an", "-f", "null", "-"])
        duration, w, h, fps = _parse_info(info)
        cuts = sorted({round(float(t), 2) for t in re.findall(r"pts_time:(\d+\.?\d*)", info)})
        cuts = [t for t in cuts if 0.25 < t < (duration - 0.25 if duration else 1e9)]

        # 2) muestreo de frames a HZ fps (un solo set alimenta energia y zonas)
        fdir = tmp / "f"
        fdir.mkdir()
        _run([ff, "-hide_banner", "-i", path, "-vf", f"fps={HZ},scale={FRAME_W}:-1",
              "-q:v", "3", str(fdir / "f_%04d.png")])
        files = sorted(fdir.glob("f_*.png"))
        if not files:
            return {"error": "no se pudieron muestrear frames del clip"}
        arrs = [np.asarray(Image.open(f).convert("RGB"), dtype=np.float32) for f in files]
        grays = [a.mean(axis=2) for a in arrs]
        n = len(arrs)
        if not duration:
            duration = round(n / HZ, 2)
        if not (w and h):
            h0, w0 = arrs[0].shape[:2]
            w, h = w0, h0  # del muestreo si no se pudo leer del -i (aspecto correcto)

        # 3) curva de energia de movimiento (diff de frames), normalizada robusta (percentil 95)
        energy = [0.0]
        for i in range(1, n):
            energy.append(float(np.abs(grays[i] - grays[i - 1]).mean()))
        norm = float(np.percentile(energy, 95)) or 1.0
        energy = [round(min(1.0, e / norm), 3) for e in energy]

        # 4) beats = intervalos entre cortes; si no hay cortes -> ventanas ~iguales (clip de una sola toma)
        bounds = [0.0] + cuts + [duration]
        bounds = sorted(set(round(b, 2) for b in bounds))
        segs = [(bounds[i], bounds[i + 1]) for i in range(len(bounds) - 1) if bounds[i + 1] - bounds[i] > 0.3]
        if len(segs) <= 1:  # una sola toma: partir en N ventanas (2..5 segun largo)
            nseg = max(2, min(5, round(duration / 2.6)))
            segs = [(round(duration * k / nseg, 2), round(duration * (k + 1) / nseg, 2)) for k in range(nseg)]

        Hh, Ww = grays[0].shape
        beats = []
        for (a, b) in segs:
            i0, i1 = int(a * HZ), max(int(a * HZ) + 1, int(b * HZ))
            seg_arrs = arrs[i0:i1] or [arrs[min(i0, n - 1)]]
            motion = round(sum(energy[i0:i1]) / max(1, (i1 - i0)), 3)
            avg = np.mean(seg_arrs, axis=0)              # banda promedio del beat
            g = avg.mean(axis=2)
            # banda horizontal mas UNIFORME (menor varianza) = mejor para caption; sesgo a no quedar pegada al borde
            best = None
            for j in range(ROWS):
                y0, y1 = int(j * Hh / ROWS), int((j + 1) * Hh / ROWS)
                var = float(g[y0:y1, :].var())
                edge_pen = 1.35 if (j == 0 or j == ROWS - 1) else 1.0   # evita la fila de mas arriba/abajo
                if best is None or var * edge_pen < best[0]:
                    rgb = avg[y0:y1, :].reshape(-1, 3).mean(axis=0)
                    best = (var * edge_pen, j, rgb)
            _, j, rgb = best
            luma = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]
            dom = "#%02X%02X%02X" % (int(rgb[0]), int(rgb[1]), int(rgb[2]))
            beats.append({
                "start": round(a, 2), "end": round(b, 2), "motion": motion,
                "calmRegion": {"x": 0.06, "y": round(j / ROWS, 3), "w": 0.88, "h": round(1 / ROWS, 3)},
                "dominantColor": dom,
                "textColor": "#000000" if luma > 140 else "#FFFFFF",
            })

        return {"duration": round(duration, 2), "fps": fps or HZ, "size": {"w": w, "h": h},
                "cuts": cuts, "energy": {"hz": HZ, "values": energy}, "beats": beats}
    except Exception as e:
        return {"error": f"analisis fallo: {str(e)[:200]}"}
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


async def analyze(url: str) -> dict:
    """Baja el clip y lo analiza. Devuelve los beats (ver schema arriba) o {error}."""
    if not url or not str(url).startswith("http"):
        return {"error": "url invalida"}
    tmp = Path(tempfile.mkdtemp(prefix="cine_dl_"))
    out = tmp / "clip.mp4"
    try:
        import httpx
        async with httpx.AsyncClient(timeout=90.0, follow_redirects=True) as c:
            r = await c.get(url)
            if r.status_code >= 400:
                return {"error": f"no se pudo bajar el clip ({r.status_code})"}
            out.write_bytes(r.content)
        return await asyncio.to_thread(_analyze_path, str(out))
    except Exception as e:
        return {"error": f"descarga/analisis fallo: {str(e)[:200]}"}
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
