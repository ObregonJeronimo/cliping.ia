import asyncio
import json
import re
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel


OUTPUTS_DIR = Path("outputs")
OUTPUTS_DIR.mkdir(exist_ok=True)

app = FastAPI(title="cliping.ia backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=False,
    expose_headers=["*"],
)

app.mount("/outputs", StaticFiles(directory="outputs"), name="outputs")
from fastapi import Request
from fastapi.responses import Response

@app.middleware("http")
async def add_ngrok_header(request: Request, call_next):
    # Para preflight OPTIONS, responder inmediatamente con los headers correctos
    if request.method == "OPTIONS":
        return Response(
            status_code=200,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "*",
                "ngrok-skip-browser-warning": "true",
            }
        )
    response = await call_next(request)
    response.headers["ngrok-skip-browser-warning"] = "true"
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Origin"] = "*"
    return response


jobs: dict[str, dict] = {}

@app.get("/")
def root():
    return {"status": "ok", "service": "cliping.ia"}

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


# ─── CINEMATIC FORGE ENDPOINTS ───────────────────────────────────────────────
import asyncio as _asyncio

# Jobs de forge activos
forge_jobs: dict = {}


# ─── CINE — RENDER DE CINEMATOGRAFÍAS COMPLETAS ──────────────────────────────


# ─── VIDEO POR PLANTILLAS (director + escenas) ───────────────────────────────
import template_director


class VideoGenRequest(BaseModel):
    url: str = ""
    desarrollo: str = ""
    proposito: str = "marketing"
    theme: str = ""        # override opcional del theme
    userId: str = ""


@app.post("/api/video/generate")
async def video_generate(req: VideoGenRequest):
    """Modo simple/avanzado: URL + desarrollo -> video con plantillas."""
    if not req.url.strip() and not req.desarrollo.strip():
        return {"error": "Necesitás al menos una URL o una descripción"}
    job_id = str(uuid.uuid4())
    jobs[job_id] = {
        "id": job_id, "status": "queued", "step": None, "progress": 0,
        "videoPath": None, "videoFilename": None, "cloudinaryUrl": "",
        "error": None, "spec": None, "createdAt": datetime.utcnow().isoformat(),
    }
    asyncio.create_task(_render_video_job(job_id, req))
    return {"job_id": job_id}


async def _render_video_job(job_id: str, req: VideoGenRequest):
    from pathlib import Path as _Path
    import asyncio as _asyncio
    REMOTION_DIR = _Path(__file__).parent.parent / "remotion"
    OUTPUTS_DIR  = _Path(__file__).parent / "outputs"
    OUTPUTS_DIR.mkdir(exist_ok=True)
    output_path = OUTPUTS_DIR / f"{job_id}_video.mp4"
    temp_files = []

    try:
        jobs[job_id].update({"status": "processing", "step": "script", "progress": 18})
        # 1. Director: URL + desarrollo -> storyboard
        spec = await template_director.build_storyboard(req.url, req.desarrollo, req.proposito)
        if req.theme in template_director.VALID_THEMES:
            spec["theme"] = req.theme
        jobs[job_id]["spec"] = spec

        # 1b. Captura real del sitio para el/los MockupShowcase (best-effort)
        needs_shot = [s for s in spec.get("scenes", [])
                      if s.get("type") == "MockupShowcase" and not s.get("screenshot")]
        if needs_shot and req.url.strip():
            try:
                jobs[job_id].update({"step": "capture", "progress": 30})
                import site_capture
                shot_path = str(OUTPUTS_DIR / f"{job_id}_cap.png")
                got = await site_capture.capture_site(req.url.strip(), shot_path)
                if got:
                    shot_url = ""
                    try:
                        from cloudinary_upload import upload_image
                        shot_url = await upload_image(got, f"cap_{job_id[:8]}")
                    except Exception as ie:
                        print(f"[video] upload screenshot error: {ie}")
                    if shot_url:
                        for s in needs_shot:
                            s["screenshot"] = shot_url
                        print(f"[video] screenshot del sitio listo")
            except Exception as ce:
                print(f"[video] captura del sitio falló (uso skeleton): {ce}")

        # 1c. Logo real del sitio para el/los LogoReveal: lo bajamos y re-hosteamos en
        # Cloudinary (URL confiable para Remotion). Si falla, la escena cae al wordmark.
        needs_logo = [s for s in spec.get("scenes", [])
                      if s.get("type") == "LogoReveal" and str(s.get("logo", "")).startswith("http")]
        if needs_logo:
            raw_logo = needs_logo[0]["logo"]
            logo_url = ""
            try:
                import httpx
                async with httpx.AsyncClient(timeout=10.0, follow_redirects=True,
                        headers={"User-Agent": "Mozilla/5.0 (compatible; clipingbot/1.0)"}) as c:
                    lr = await c.get(raw_logo)
                if lr.status_code == 200 and lr.content:
                    ext = ".png"
                    ct = lr.headers.get("content-type", "")
                    if "svg" in ct: ext = ".svg"
                    elif "jpeg" in ct or "jpg" in ct: ext = ".jpg"
                    elif "x-icon" in ct or "vnd.microsoft.icon" in ct or raw_logo.lower().endswith(".ico"): ext = ".ico"
                    logo_path = str(OUTPUTS_DIR / f"{job_id}_logo{ext}")
                    with open(logo_path, "wb") as f:
                        f.write(lr.content)
                    # .ico/.svg no son ideales para <Img>; solo subimos formatos ráster usables.
                    if ext in (".png", ".jpg"):
                        from cloudinary_upload import upload_image
                        logo_url = await upload_image(logo_path, f"logo_{job_id[:8]}")
            except Exception as le:
                print(f"[video] logo del sitio falló (uso wordmark): {le}")
            for s in needs_logo:
                if logo_url:
                    s["logo"] = logo_url
                    print("[video] logo del sitio listo")
                else:
                    s.pop("logo", None)  # sin logo confiable -> wordmark

        # 2. Construir los archivos del render
        jobs[job_id].update({"step": "build", "progress": 40})
        entry, comp_id, total_frames, temp_files = template_director.build_video_files(
            job_id, spec, REMOTION_DIR
        )

        # 3. Render con Remotion
        jobs[job_id].update({"step": "render", "progress": 52})
        candidates = [
            str(REMOTION_DIR / "node_modules" / ".bin" / "remotion.cmd"),
            str(REMOTION_DIR / "node_modules" / ".bin" / "remotion"),
        ]
        remotion_bin = next((c for c in candidates if _Path(c).exists()), "npx")
        args = [remotion_bin, "render", entry, comp_id,
                str(output_path.absolute()),
                "--codec", "h264", "--fps", "30",
                "--width", "1080", "--height", "1920",
                "--duration-in-frames", str(total_frames),
                "--concurrency", "4", "--jpeg-quality", "90", "--crf", "22",
                "--log", "error"]
        print(f"[video] Renderizando {comp_id} ({total_frames} frames, theme={spec.get('theme')})...")
        proc = await _asyncio.create_subprocess_exec(
            *args, cwd=str(REMOTION_DIR),
            stdout=_asyncio.subprocess.PIPE, stderr=_asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()
        if proc.returncode != 0:
            out = stdout.decode(errors='replace'); err = stderr.decode(errors='replace')
            print(f"[video] ERROR STDOUT:\n{out[:800]}")
            print(f"[video] ERROR STDERR:\n{err[:800]}")
            raise RuntimeError((out + err)[-400:])

        # 4. Cloudinary
        jobs[job_id].update({"status": "uploading", "step": "upload", "progress": 86})
        cloudinary_url = ""
        try:
            from cloudinary_upload import upload_video
            cloudinary_url = await upload_video(str(output_path), f"video_{job_id[:8]}")
            print(f"[video] Cloudinary OK -> {cloudinary_url}")
        except Exception as ce:
            print(f"[video] Cloudinary error: {ce}")

        # 5. Firestore: guardar en users/{uid}/videos (las reglas permiten que el dueño
        #    lo lea/borre desde el cliente). Si no hay userId, no se guarda.
        try:
            db = get_firestore()
            if db and req.userId:
                db.collection("users").document(req.userId).collection("videos").document(job_id).set({
                    "id": job_id, "url": req.url, "desarrollo": req.desarrollo,
                    "proposito": req.proposito, "userId": req.userId,
                    "theme": spec.get("theme"), "brand": spec.get("brand"),
                    "videoUrl": cloudinary_url, "localFile": output_path.name,
                    "frames": total_frames, "createdAt": datetime.utcnow().isoformat(),
                })
                print(f"[video] Firestore OK -> users/{req.userId[:8]}/videos/{job_id[:8]}")
        except Exception as fe:
            print(f"[video] Firestore error: {fe}")

        jobs[job_id].update({
            "status": "done", "step": "export", "progress": 100,
            "videoPath": str(output_path), "videoFilename": output_path.name,
            "cloudinaryUrl": cloudinary_url,
        })
        print(f"[video] OK -> {output_path.name}")
    except Exception as e:
        print(f"[video] ERROR: {e}")
        jobs[job_id].update({"status": "error", "error": str(e)[:400]})
    finally:
        for f in temp_files:
            try:
                f.unlink(missing_ok=True)
            except Exception:
                pass
