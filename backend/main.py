import asyncio
import json
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

from agent import run_agent

OUTPUTS_DIR = Path("outputs")
OUTPUTS_DIR.mkdir(exist_ok=True)

app = FastAPI(title="cliping.ia backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/outputs", StaticFiles(directory="outputs"), name="outputs")
from fastapi import Request
from fastapi.responses import Response

@app.middleware("http")
async def add_ngrok_header(request: Request, call_next):
    response = await call_next(request)
    response.headers["ngrok-skip-browser-warning"] = "true"
    response.headers["Access-Control-Allow-Origin"] = "*"
    return response



jobs: dict[str, dict] = {}

class GenerateRequest(BaseModel):
    url: str
    action: str
    format: str = "reel"
    style: str = "epic"
    voice: str = "female"
    userId: str = ""
    # parametros de video avanzados
    mode: str = "simple"
    visualStyle: str = "dark_premium"
    narrative: str = "problem_solution"
    hook: str = "question"
    tone: str = "enthusiastic"
    focus: str = "product"
    duration: int = 30

@app.get("/")
def root():
    return {"status": "ok", "service": "cliping.ia"}

@app.post("/api/generate")
async def generate(req: GenerateRequest):
    job_id = str(uuid.uuid4())
    jobs[job_id] = {
        "id": job_id,
        "status": "queued",
        "step": None,
        "progress": 0,
        "url": req.url,
        "action": req.action,
        "format": req.format,
        "style": req.style,
        "voice": req.voice,
        "userId": req.userId,
        "videoPath": None,
        "videoFilename": None,
        "error": None,
        "createdAt": datetime.utcnow().isoformat(),
    }
    asyncio.create_task(process_job(job_id, req))
    return {"job_id": job_id}

@app.get("/api/cache/list")
async def cache_list():
    """Lista todos los sitios en caché."""
    from animation_cache import list_cache
    return list_cache()

@app.post("/api/cache/clear")
async def cache_clear(url: str = None):
    """Limpia el caché de una URL o todo."""
    from animation_cache import clear_cache
    count = clear_cache(url)
    return {"cleared": count}

@app.get("/api/debug/last")
async def debug_last():
    """Retorna el último reporte de debug."""
    import glob, json
    reports = sorted(glob.glob("debug_reports/*_debug.json"), key=lambda f: __import__("os").path.getmtime(f), reverse=True)
    if not reports:
        return {"error": "No hay reportes aún"}
    return json.loads(open(reports[0], encoding="utf-8").read())

@app.get("/api/debug/animations")
async def debug_animations():
    """Retorna la última selección de animaciones de Claude."""
    from pathlib import Path
    f = Path("debug_reports/last_animation_selection.json")
    if not f.exists():
        return {"error": "No hay selección aún"}
    import json
    return json.loads(f.read_text(encoding="utf-8"))

@app.get("/api/debug/jobs")
async def debug_jobs():
    """Lista todos los reportes disponibles."""
    import glob, os, json
    reports = sorted(glob.glob("debug_reports/*_debug.json"), key=lambda f: os.path.getmtime(f), reverse=True)
    result = []
    for r in reports[:10]:
        try:
            data = json.loads(open(r, encoding="utf-8").read())
            result.append({
                "job_id": data.get("job_id","")[:8],
                "url": data.get("url",""),
                "errors": data.get("errors",[]),
                "total_time": data.get("data",{}).get("final",{}).get("total_time_s"),
                "animations": {k: v.get("animation") for k,v in data.get("data",{}).get("animation_selection",{}).items() if k != "reasoning" and isinstance(v,dict)},
            })
        except: pass
    return result

@app.get("/api/voice-preview")
async def voice_preview(voice: str = "female"):
    import edge_tts, tempfile, os
    from fastapi.responses import FileResponse
    voice_map = {"female": "es-MX-DaliaNeural", "male": "es-MX-JorgeNeural"}
    voice_name = voice_map.get(voice, "es-MX-DaliaNeural")
    script = "Transformá la presencia digital de tu negocio. Más clientes, más ventas, todo desde un solo lugar."
    tmp = OUTPUTS_DIR / f"preview_{voice}.mp3"
    try:
        communicate = edge_tts.Communicate(script, voice_name)
        await communicate.save(str(tmp))
        return FileResponse(str(tmp), media_type="audio/mpeg")
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/jobs/{job_id}")
def get_job(job_id: str):
    if job_id not in jobs:
        return {"error": "not found"}
    return jobs[job_id]

@app.get("/api/video/{filename}")
def serve_video(filename: str):
    path = OUTPUTS_DIR / filename
    if not path.exists():
        return {"error": "not found"}
    return FileResponse(path, media_type="video/mp4")

@app.websocket("/ws/{job_id}")
async def websocket_progress(ws: WebSocket, job_id: str):
    await ws.accept()
    try:
        while True:
            if job_id in jobs:
                job = jobs[job_id]
                await ws.send_text(json.dumps(job))
                if job["status"] in ("done", "error"):
                    break
            await asyncio.sleep(0.5)
    except WebSocketDisconnect:
        pass

async def process_job(job_id: str, req: GenerateRequest):
    def update(step: str, progress: int, status: str = "processing"):
        jobs[job_id].update({"step": step, "progress": progress, "status": status})

    try:
        update("browse", 5)
        video_path = await run_agent(
            url=req.url,
            action=req.action,
            format=req.format,
            style=req.style,
            voice=req.voice,
            job_id=job_id,
            progress_cb=update,
            req_params=req.model_dump(),
        )
        filename = video_path.name
        jobs[job_id].update({
            "status": "done",
            "progress": 100,
            "step": "export",
            "videoPath": str(video_path),
            "videoFilename": filename,
        })
        # Guardar en Firestore y descontar crédito
        try:
            import glob
            debug_files = sorted(glob.glob(f"debug_reports/{job_id}*_debug.json"))
            debug_data = json.loads(open(debug_files[0], encoding="utf-8").read()) if debug_files else {}
            await save_job_to_firestore(job_id, req, filename, debug_data)
        except Exception as fe:
            print(f"[firebase] Error al guardar: {fe}")
    except Exception as e:
        import traceback
        traceback.print_exc()
        jobs[job_id].update({"status": "error", "error": str(e)})


# ─── Firebase Admin SDK para guardar jobs y descontar créditos ─────────────
import os, json
from pathlib import Path

_firebase_admin_initialized = False
_firestore_client = None

def get_firestore():
    global _firebase_admin_initialized, _firestore_client
    if _firestore_client:
        return _firestore_client
    try:
        import firebase_admin
        from firebase_admin import credentials, firestore as fs_admin

        if not _firebase_admin_initialized:
            cred_path = Path("firebase-service-account.json")
            if cred_path.exists():
                cred = credentials.Certificate(str(cred_path))
                firebase_admin.initialize_app(cred)
                _firebase_admin_initialized = True
            else:
                print("[firebase] No se encontró firebase-service-account.json — guardado en Firestore deshabilitado")
                return None

        _firestore_client = fs_admin.client()
        return _firestore_client
    except Exception as e:
        print(f"[firebase] Error inicializando: {e}")
        return None


async def save_job_to_firestore(job_id: str, req, video_filename: str, debug_data: dict):
    """Guarda el job completado en Firestore y descuenta 1 crédito al usuario."""
    db = get_firestore()
    if not db or not req.userId:
        return

    try:
        # Descontar 1 crédito
        user_ref = db.collection("users").document(req.userId)
        user_snap = user_ref.get()
        if user_snap.exists:
            current_credits = user_snap.to_dict().get("credits", 0)
            if current_credits > 0:
                user_ref.update({"credits": current_credits - 1})

        # Guardar el video en la colección videos del usuario
        video_doc = {
            "jobId":       job_id,
            "userId":      req.userId,
            "url":         req.url,
            "action":      req.action,
            "videoUrl":    f"{os.environ.get('VITE_API_URL', 'http://localhost:8000')}/api/video/{video_filename}",
            "filename":    video_filename,
            "siteName":    debug_data.get("data", {}).get("page_data", {}).get("siteName", ""),
            "headline":    debug_data.get("data", {}).get("page_data", {}).get("headline", ""),
            "animations":  {k: v.get("animation") for k, v in debug_data.get("data", {}).get("animation_selection", {}).items() if isinstance(v, dict) and "animation" in v},
            "renderOk":    not bool(debug_data.get("errors", [])),
            "totalTime":   debug_data.get("data", {}).get("final", {}).get("total_time_s"),
            "createdAt":   __import__("google.cloud.firestore_v1", fromlist=["SERVER_TIMESTAMP"]).SERVER_TIMESTAMP if False else __import__("datetime").datetime.utcnow().isoformat(),
        }
        db.collection("users").document(req.userId).collection("videos").document(job_id).set(video_doc)
        print(f"[firebase] Video {job_id[:8]} guardado para usuario {req.userId[:8]}")
    except Exception as e:
        print(f"[firebase] Error guardando job: {e}")


# ─── Endpoint: solo analizar la página sin renderizar ─────────────────────────
@app.post("/api/analyze")
async def analyze_only(req: GenerateRequest):
    """Analiza la URL y devuelve los datos extraídos para que el usuario los edite."""
    import asyncio
    from playwright.async_api import async_playwright

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page(viewport={"width": 390, "height": 844})
            try:
                await page.goto(req.url, wait_until="domcontentloaded", timeout=30000)
            except Exception:
                # Si falla domcontentloaded, intentar con load
                await page.goto(req.url, wait_until="load", timeout=30000)
            await asyncio.sleep(2)
            hero_bytes = await page.screenshot(full_page=False)
            await browser.close()

        from remotion_renderer import extract_page_data_deep
        page_data = await extract_page_data_deep(hero_bytes, req.url, req.action)
        return {"ok": True, "page_data": page_data}
    except Exception as e:
        return {"ok": False, "error": str(e)}


# ─── Endpoint: renderizar con datos ya validados por el usuario ───────────────
class RenderRequest(BaseModel):
    url: str
    action: str
    page_data: dict          # datos editados por el usuario
    scene_order: list = []   # orden de escenas (futuro)
    format: str = "reel"
    style: str = "epic"
    voice: str = "female"
    userId: str = ""
    mode: str = "simple"
    visualStyle: str = "dark_premium"
    narrative: str = "problem_solution"
    hook: str = "question"
    tone: str = "enthusiastic"
    focus: str = "product"
    duration: int = 30

@app.post("/api/render")
async def render_with_data(req: RenderRequest):
    """Renderiza el video usando datos ya validados por el usuario."""
    job_id = str(uuid.uuid4())
    jobs[job_id] = {
        "id": job_id, "status": "queued", "step": None, "progress": 0,
        "url": req.url, "action": req.action, "format": req.format,
        "style": req.style, "voice": req.voice, "userId": req.userId,
        "videoPath": None, "videoFilename": None, "error": None,
        "createdAt": datetime.utcnow().isoformat(),
    }
    asyncio.create_task(process_render_job(job_id, req))
    return {"job_id": job_id}

async def process_render_job(job_id: str, req: RenderRequest):
    def update(step: str, progress: int, status: str = "processing"):
        jobs[job_id].update({"step": step, "progress": progress, "status": status})

    try:
        update("browse", 5)
        # Usar run_agent igual que process_job pero con page_data editados por el usuario
        video_path = await run_agent(
            url=req.url,
            action=req.action,
            format=req.format,
            style=req.style,
            voice=req.voice,
            job_id=job_id,
            progress_cb=update,
            req_params=req.model_dump(),
            override_page_data=req.page_data if req.page_data else None,
        )
        filename = video_path.name
        jobs[job_id].update({
            "status": "done", "progress": 100, "step": "export",
            "videoPath": str(video_path), "videoFilename": filename,
        })
        try:
            import glob
            debug_files = sorted(glob.glob(f"debug_reports/{job_id}*_debug.json"))
            debug_data = json.loads(open(debug_files[0], encoding="utf-8").read()) if debug_files else {}
            await save_job_to_firestore(job_id, req, filename, debug_data)
        except Exception as fe:
            print(f"[firebase] Error: {fe}")
    except Exception as e:
        import traceback
        traceback.print_exc()
        jobs[job_id].update({"status": "error", "error": str(e)})



# ─── COMPOSITION PREVIEW ENDPOINT ────────────────────────────────────────────
class CompositionRequest(BaseModel):
    page_data: dict
    duration: int = 30
    visual_style: str = "dark_premium"

@app.post("/api/compose")
async def generate_composition_preview(req: CompositionRequest):
    """Genera la composición IA para mostrarla en el compositor visual."""
    from composition_generator import generate_composition, composition_to_props, _fallback_composition
    from content_density import calculate_density
    from variations import build_video_context

    density = calculate_density(req.page_data)
    video_context = {
        "visual_style": req.visual_style,
        "narrative": "problem_solution",
        "hook": "bold",
        "tone": "professional",
        "duration": req.duration,
        "format": "reel",
    }
    try:
        composition = await generate_composition(req.page_data, {}, video_context)
    except Exception as e:
        print(f"[compose] fallback: {e}")
        primary = req.page_data.get("primaryColor", "#6366f1")
        bg = "#07070f"
        composition = _fallback_composition(req.page_data, primary, bg)

    return {
        "composition": composition,
        "density": density,
    }


# ─── DURATIONS ENDPOINT ───────────────────────────────────────────────────────
class DurationsRequest(BaseModel):
    page_data: dict

@app.post("/api/available-durations")
async def get_available_durations(req: DurationsRequest):
    """Calcula duraciones disponibles según la densidad de info del sitio."""
    from content_density import calculate_density
    result = calculate_density(req.page_data)
    return result


# ─── MASTERPIECE ENDPOINT ─────────────────────────────────────────────────────
@app.post("/api/masterpiece")
async def render_masterpiece():
    """Renderiza YercoMasterpiece — composición compleja hardcodeada."""
    job_id = str(uuid.uuid4())
    jobs[job_id] = {
        "id": job_id, "status": "queued", "step": None, "progress": 0,
        "videoPath": None, "videoFilename": None, "error": None,
        "createdAt": datetime.utcnow().isoformat(),
    }
    asyncio.create_task(_render_masterpiece_job(job_id))
    return {"job_id": job_id}

async def _render_masterpiece_job(job_id: str):
    from pathlib import Path
    import asyncio as _aio
    import shutil
    import sys
    REMOTION_DIR = Path(__file__).parent.parent / "remotion"
    OUTPUTS_DIR = Path(__file__).parent / "outputs"
    OUTPUTS_DIR.mkdir(exist_ok=True)
    output_path = OUTPUTS_DIR / f"{job_id}_masterpiece.mp4"

    jobs[job_id].update({"step": "render", "progress": 10, "status": "processing"})
    try:
        # Mismo mecanismo que remotion_renderer.py
        candidates = [
            str(REMOTION_DIR / "node_modules" / ".bin" / "remotion.cmd"),
            str(REMOTION_DIR / "node_modules" / ".bin" / "remotion"),
        ]
        remotion_bin = next((c for c in candidates if Path(c).exists()), "npx")
        args = [remotion_bin, "render", "index.jsx", "YercoMasterpiece",
                str(output_path.absolute()),
                "--codec", "h264", "--fps", "30",
                "--width", "1080", "--height", "1920",
                "--duration-in-frames", "765",
                "--concurrency", "4",
                "--jpeg-quality", "95",
                "--crf", "18",
                "--pixel-format", "yuv420p",
                "--log", "verbose"]
        print(f"[masterpiece] Iniciando render de 765 frames...")
        proc = await _aio.create_subprocess_exec(
            *args, cwd=str(REMOTION_DIR),
            stdout=_aio.subprocess.PIPE,
            stderr=_aio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()
        if proc.returncode != 0:
            out = stdout.decode(errors='replace') + stderr.decode(errors='replace')
            err_lines = [l for l in out.splitlines() if 'Error' in l or 'error' in l][:5]
            raise RuntimeError('\n'.join(err_lines) or out[-300:])

        print(f"[masterpiece] Render OK → {output_path.name}")
        jobs[job_id].update({
            "status": "done", "progress": 100, "step": "export",
            "videoPath": str(output_path),
            "videoFilename": output_path.name,
        })
    except Exception as e:
        print(f"[masterpiece] ERROR: {e}")
        jobs[job_id].update({"status": "error", "error": str(e)})
