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
from animation_forge import forge_animation, list_library, get_animation

# Jobs de forge activos
forge_jobs: dict = {}

class ForgeRequest(BaseModel):
    idea: str = ""
    component_name: str
    rubro: str = "general"
    tags: list = []
    desarrollo: str = ""
    objects: list = []
    primaryColor: str = "#6366f1"
    secondaryColor: str = "#a78bfa"
    accentColor: str = "#f59e0b"

@app.post("/api/forge/generate")
async def forge_generate(req: ForgeRequest):
    """Dispara la generación de una animación en loop. Retorna job_id."""
    anim_id = str(uuid.uuid4())[:8]
    forge_jobs[anim_id] = {
        "id": anim_id,
        "status": "running",
        "progress": [],
        "result": None,
    }

    async def run():
        async def on_progress(evt):
            forge_jobs[anim_id]["progress"].append(evt)

        result = await forge_animation(
            idea=req.idea,
            component_name=req.component_name,
            rubro=req.rubro,
            anim_id=anim_id,
            tags=req.tags,
            desarrollo=req.desarrollo,
            objects=req.objects,
            primaryColor=req.primaryColor,
            secondaryColor=req.secondaryColor,
            accentColor=req.accentColor,
            progress_callback=on_progress,
        )
        forge_jobs[anim_id]["status"] = "done" if result["success"] else "failed"
        forge_jobs[anim_id]["result"] = result

        # Si compiló OK → renderizar con loop de reintento
        if result["success"]:
            MAX_RENDER_ATTEMPTS = 3
            render_success = False

            for render_attempt in range(1, MAX_RENDER_ATTEMPTS + 1):
                render_job_id = str(uuid.uuid4())
                jobs[render_job_id] = {
                    "id": render_job_id, "status": "queued", "step": None, "progress": 0,
                    "videoPath": None, "videoFilename": None, "error": None,
                    "createdAt": datetime.utcnow().isoformat(),
                }
                forge_jobs[anim_id]["render_job_id"] = render_job_id
                forge_jobs[anim_id]["progress"].append({
                    "msg": f"🎬 Renderizando (intento {render_attempt}/{MAX_RENDER_ATTEMPTS})...",
                    "step": 6, "total": 7, "id": anim_id
                })

                await _render_cinematic_job(render_job_id, result)

                if jobs[render_job_id]["status"] == "done":
                    render_success = True
                    forge_jobs[anim_id]["progress"].append({
                        "msg": f"✅ Video listo!", "step": 7, "total": 7, "id": anim_id
                    })
                    break
                else:
                    # Render falló — regenerar JSX antes del próximo intento
                    err = jobs[render_job_id].get("error", "")
                    forge_jobs[anim_id]["progress"].append({
                        "msg": f"⚠️ Render falló (intento {render_attempt}) — regenerando JSX...",
                        "step": 5, "total": 7, "id": anim_id
                    })
                    if render_attempt < MAX_RENDER_ATTEMPTS:
                        # Regenerar con el error como contexto
                        result = await forge_animation(
                            idea=req.idea,
                            component_name=req.component_name,
                            rubro=req.rubro,
                            anim_id=anim_id,
                            tags=req.tags,
                            desarrollo=req.desarrollo + f"\n\nEl intento anterior falló al renderizar con error: {err[:200]}. Asegurate de que el SVG sea válido y todas las etiquetas estén correctamente cerradas.",
                            objects=req.objects,
                            primaryColor=req.primaryColor,
                            secondaryColor=req.secondaryColor,
                            accentColor=req.accentColor,
                            progress_callback=on_progress,
                        )
                        forge_jobs[anim_id]["result"] = result
                        if not result["success"]:
                            break  # Si no compila, no tiene sentido seguir

            if not render_success:
                forge_jobs[anim_id]["progress"].append({
                    "msg": f"❌ No se pudo renderizar después de {MAX_RENDER_ATTEMPTS} intentos",
                    "step": 7, "total": 7, "id": anim_id
                })

    _asyncio.create_task(run())
    return {"anim_id": anim_id}

@app.get("/api/forge/status/{anim_id}")
async def forge_status(anim_id: str):
    """Polling del estado de una generación."""
    job = forge_jobs.get(anim_id)
    if not job:
        return {"error": "not found"}
    return job

@app.get("/api/forge/library")
async def forge_library():
    """Lista animaciones — Firestore primero, local solo si Firestore no disponible."""
    try:
        db = get_firestore()
        if db:
            docs = db.collection("cinematicas").order_by("createdAt", direction="DESCENDING").limit(100).stream()
            items = []
            for doc in docs:
                d = doc.to_dict()
                items.append({
                    "id":             d.get("id", doc.id),
                    "component_name": d.get("componentName", ""),
                    "rubro":          d.get("rubro", ""),
                    "idea":           d.get("idea", "")[:100],
                    "success":        True,
                    "attempts":       d.get("attempts", 0),
                    "elapsed_s":      d.get("elapsedS", 0),
                    "created_at":     d.get("createdAt", ""),
                    "video_url":      d.get("videoUrl", ""),
                })
            # Si Firestore está disponible, devolver lo que haya (aunque sea vacío)
            return {"animations": items, "source": "firestore"}
    except Exception as e:
        print(f"[library] Firestore error: {e}")
    # Fallback local SOLO si Firestore no disponible
    return {"animations": list_library(), "source": "local"}

@app.get("/api/forge/animation/{anim_id}")
async def forge_get(anim_id: str):
    """Obtiene una animación completa — Firestore primero, local como fallback."""
    try:
        db = get_firestore()
        if db:
            doc = db.collection("cinematicas").document(anim_id).get()
            if doc.exists:
                d = doc.to_dict()
                return {
                    "id":             d.get("id", anim_id),
                    "component_name": d.get("componentName", ""),
                    "rubro":          d.get("rubro", ""),
                    "idea":           d.get("idea", ""),
                    "code":           d.get("code", ""),
                    "success":        True,
                    "attempts":       d.get("attempts", 0),
                    "elapsed_s":      d.get("elapsedS", 0),
                    "video_url":      d.get("videoUrl", ""),
                    "created_at":     d.get("createdAt", ""),
                }
    except Exception as e:
        print(f"[forge_get] Firestore error: {e}")
    # Fallback local
    anim = get_animation(anim_id)
    if not anim:
        return {"error": "not found"}
    return anim

@app.delete("/api/forge/animation/{anim_id}")
async def forge_delete(anim_id: str):
    """Elimina una animación de la biblioteca — Firestore + archivos locales."""
    deleted = False

    # Borrar de Firestore
    try:
        db = get_firestore()
        if db:
            db.collection("cinematicas").document(anim_id).delete()
            deleted = True
            print(f"[forge_delete] Firestore: cinematicas/{anim_id} eliminado")
    except Exception as e:
        print(f"[forge_delete] Firestore error: {e}")

    # Borrar archivos locales
    from pathlib import Path as _Path
    lib_dir = _Path(__file__).parent.parent / "cinematic_library"
    f = lib_dir / f"{anim_id}.json"
    if f.exists():
        try:
            data = __import__("json").loads(f.read_text())
            jsx = lib_dir / f"{data.get('component_name','unknown')}.jsx"
            f.unlink(missing_ok=True)
            jsx.unlink(missing_ok=True)
            deleted = True
        except: pass

    return {"ok": deleted}


# ─── RENDER CINEMATIC ─────────────────────────────────────────────────────────
@app.post("/api/forge/render/{anim_id}")
async def render_cinematic(anim_id: str):
    """Renderiza una animación de la biblioteca como video MP4."""
    from animation_forge import get_animation
    from pathlib import Path as _Path
    import asyncio as _asyncio, shutil as _shutil

    anim = get_animation(anim_id)
    if not anim:
        return {"error": "Animación no encontrada"}
    if not anim.get("success"):
        return {"error": "Esta animación no compiló correctamente"}

    job_id = str(uuid.uuid4())
    jobs[job_id] = {
        "id": job_id, "status": "queued", "step": None, "progress": 0,
        "videoPath": None, "videoFilename": None, "error": None,
        "createdAt": datetime.utcnow().isoformat(),
    }
    asyncio.create_task(_render_cinematic_job(job_id, anim))
    return {"job_id": job_id}

async def _render_cinematic_job(job_id: str, anim: dict):
    from pathlib import Path as _Path
    import asyncio as _asyncio
    REMOTION_DIR = _Path(__file__).parent.parent / "remotion"
    OUTPUTS_DIR  = _Path(__file__).parent / "outputs"
    OUTPUTS_DIR.mkdir(exist_ok=True)
    COMPS_DIR = REMOTION_DIR / "src" / "compositions"
    output_path = OUTPUTS_DIR / f"{job_id}_cinematic.mp4"
    component_name = anim["component_name"]
    anim_id = anim["id"]  # ← fix

    jobs[job_id].update({"step": "setup", "progress": 5, "status": "processing"})

    # Limpiar imports y helpers duplicados del código generado
    code_clean = anim["code"]
    # Quitar imports de remotion
    code_clean = re.sub(r"import\s*\{[^}]*\}\s*from\s*['\"]remotion['\"];?\s*\n?", "", code_clean)
    # Quitar helpers que el wrapper ya define
    for helper in ["const lerp", "const clamp", "const easeInOut", "const easeOut", "const easeIn"]:
        code_clean = re.sub(rf"{helper}\s*=\s*[^\n]+\n?", "", code_clean)
    # Quitar export default si ya está en el código (el wrapper lo agrega)
    code_clean = re.sub(r"^export\s+default\s+\w+\s*;?\s*$", "", code_clean, flags=re.MULTILINE)

    # 1. Escribir el JSX en src/compositions/
    jsx_content = f"""import {{ AbsoluteFill, useCurrentFrame, useVideoConfig, spring }} from 'remotion'

const lerp = (a, b, t) => a + (b - a) * t
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const easeInOut = (t) => t < 0.5 ? 2*t*t : -1+(4-2*t)*t
const easeOut = (t) => 1 - Math.pow(1 - t, 3)

{code_clean}

export default {component_name}
"""
    comp_file = COMPS_DIR / f"Cinematic_{component_name}.jsx"
    comp_file.write_text(jsx_content, encoding="utf-8")

    # 2. Escribir Root temporal que registra esta composición
    root_content = f"""import {{Composition}} from 'remotion'
import {component_name} from './compositions/Cinematic_{component_name}.jsx'
import {{MarketingVideo}} from './compositions/MarketingVideo'

export const RemotionRoot = () => (
  <>
    <Composition id="CinematicPreview" component={{{component_name}}}
      durationInFrames={{90}} fps={{30}} width={{1080}} height={{1920}}
      defaultProps={{{{ primaryColor: '#6366f1', bg: '#07070f', siteName: 'Preview' }}}}
    />
    <Composition id="MarketingVideo" component={{MarketingVideo}}
      durationInFrames={{990}} fps={{30}} width={{1080}} height={{1920}} defaultProps={{{{}}}}
    />
  </>
)
"""
    root_file = REMOTION_DIR / "src" / "Root_cinematic.jsx"
    root_file.write_text(root_content, encoding="utf-8")
    entry_file = REMOTION_DIR / "index_cinematic.jsx"
    entry_file.write_text("""import {registerRoot} from 'remotion'
import {RemotionRoot} from './src/Root_cinematic.jsx'
registerRoot(RemotionRoot)
""", encoding="utf-8")

    jobs[job_id].update({"step": "render", "progress": 20, "status": "processing"})

    try:
        candidates = [
            str(REMOTION_DIR / "node_modules" / ".bin" / "remotion.cmd"),
            str(REMOTION_DIR / "node_modules" / ".bin" / "remotion"),
        ]
        remotion_bin = next((c for c in candidates if _Path(c).exists()), "npx")
        args = [remotion_bin, "render", "index_cinematic.jsx", "CinematicPreview",
                str(output_path.absolute()),
                "--codec", "h264", "--fps", "30",
                "--width", "1080", "--height", "1920",
                "--duration-in-frames", "90",
                "--concurrency", "4",
                "--jpeg-quality", "90",
                "--crf", "22",
                "--log", "error"]

        print(f"[cinematic] Renderizando {component_name}...")
        proc = await _asyncio.create_subprocess_exec(
            *args, cwd=str(REMOTION_DIR),
            stdout=_asyncio.subprocess.PIPE,
            stderr=_asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()

        # Limpiar archivos temporales
        comp_file.unlink(missing_ok=True)
        root_file.unlink(missing_ok=True)
        entry_file.unlink(missing_ok=True)

        if proc.returncode != 0:
            out = stdout.decode(errors='replace')
            err = stderr.decode(errors='replace')
            combined = out + err
            print(f"[cinematic] ERROR STDOUT inicio:\n{out[:800]}")
            print(f"[cinematic] ERROR STDERR inicio:\n{err[:800]}")
            raise RuntimeError(combined[-400:])

        jobs[job_id].update({
            "status": "uploading", "progress": 85, "step": "upload",
        })

        # Subir a Cloudinary
        cloudinary_url = ""
        try:
            from cloudinary_upload import upload_video
            public_id = f"{component_name}_{anim_id}"
            cloudinary_url = await upload_video(str(output_path), public_id)
            print(f"[cinematic] Cloudinary OK → {cloudinary_url}")
        except Exception as ce:
            print(f"[cinematic] Cloudinary error: {ce}")

        # Guardar en Firestore
        try:
            db = get_firestore()
            if db:
                db.collection("cinematicas").document(anim_id).set({
                    "id":             anim_id,
                    "componentName":  component_name,
                    "rubro":          anim.get("rubro", ""),
                    "idea":           anim.get("idea", "")[:300],
                    "code":           anim.get("code", ""),
                    "videoUrl":       cloudinary_url,
                    "localFile":      output_path.name,
                    "attempts":       anim.get("attempts", 0),
                    "elapsedS":       anim.get("elapsed_s", 0),
                    "createdAt":      __import__("datetime").datetime.utcnow().isoformat(),
                })
                print(f"[cinematic] Firestore OK → cinematicas/{anim_id}")
        except Exception as fe:
            print(f"[cinematic] Firestore error: {fe}")

        jobs[job_id].update({
            "status": "done", "progress": 100, "step": "export",
            "videoPath":     str(output_path),
            "videoFilename": output_path.name,
            "cloudinaryUrl": cloudinary_url,
        })
        print(f"[cinematic] OK → {output_path.name}")
    except Exception as e:
        # Limpiar igual si falla
        comp_file.unlink(missing_ok=True)
        root_file.unlink(missing_ok=True)
        entry_file.unlink(missing_ok=True)
        print(f"[cinematic] ERROR: {e}")
        jobs[job_id].update({"status": "error", "error": str(e)[:300]})


# ─── CINE — RENDER DE CINEMATOGRAFÍAS COMPLETAS ──────────────────────────────
from iconify_service import iconify_router
app.include_router(iconify_router)

import cine_generator


def _get_full_animation(anim_id: str):
    """Trae una animación completa (con código). Firestore primero, local fallback."""
    try:
        db = get_firestore()
        if db:
            doc = db.collection("cinematicas").document(anim_id).get()
            if doc.exists:
                d = doc.to_dict()
                return {
                    "id":             d.get("id", anim_id),
                    "component_name": d.get("componentName", ""),
                    "rubro":          d.get("rubro", ""),
                    "idea":           d.get("idea", ""),
                    "code":           d.get("code", ""),
                    "video_url":      d.get("videoUrl", ""),
                }
    except Exception as e:
        print(f"[cine] _get_full_animation Firestore: {e}")
    return get_animation(anim_id)


class CineRequest(BaseModel):
    animation_ids: list
    url: str = ""
    proposito: str = "marketing"
    desarrollo: str = ""
    userId: str = ""


@app.post("/api/cine/generate")
async def cine_generate(req: CineRequest):
    """Genera una cinematografía concatenando las animaciones seleccionadas."""
    if len(req.animation_ids) < 2:
        return {"error": "Necesitás al menos 2 animaciones"}
    job_id = str(uuid.uuid4())
    jobs[job_id] = {
        "id": job_id, "status": "queued", "step": None, "progress": 0,
        "videoPath": None, "videoFilename": None, "cloudinaryUrl": "",
        "error": None, "plan": None, "createdAt": datetime.utcnow().isoformat(),
    }
    asyncio.create_task(_render_cine_job(job_id, req))
    return {"job_id": job_id}


async def _render_cine_job(job_id: str, req: CineRequest):
    from pathlib import Path as _Path
    import asyncio as _asyncio
    REMOTION_DIR = _Path(__file__).parent.parent / "remotion"
    OUTPUTS_DIR  = _Path(__file__).parent / "outputs"
    OUTPUTS_DIR.mkdir(exist_ok=True)
    output_path = OUTPUTS_DIR / f"{job_id}_cine.mp4"
    temp_files = []

    try:
        jobs[job_id].update({"status": "processing", "step": "fetch", "progress": 8})

        # 1. Traer los clips completos (con código) en el orden pedido
        clips = []
        for aid in req.animation_ids:
            anim = _get_full_animation(aid)
            if anim and anim.get("code"):
                clips.append(anim)
        if len(clips) < 2:
            raise RuntimeError("No se pudieron cargar suficientes animaciones con código")

        # 2. Analizar el sitio (liviano) + armar el guion con IA
        jobs[job_id].update({"step": "analyze", "progress": 20})
        url_data = await cine_generator.analyze_url_light(req.url)
        jobs[job_id].update({"step": "script", "progress": 35})
        plan = await cine_generator.build_narrative_plan(clips, url_data, req.proposito, req.desarrollo)
        jobs[job_id]["plan"] = plan

        # 3. Construir los archivos de la composición
        jobs[job_id].update({"step": "build", "progress": 48})
        entry, comp_id, total_frames, temp_files = cine_generator.build_cine_files(
            job_id, clips, plan, REMOTION_DIR
        )

        # 4. Render con Remotion (mismo mecanismo que el render single)
        jobs[job_id].update({"step": "render", "progress": 55})
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
                "--concurrency", "4",
                "--jpeg-quality", "90",
                "--crf", "22",
                "--log", "error"]
        print(f"[cine] Renderizando {comp_id} ({total_frames} frames, {len(clips)} clips)...")
        proc = await _asyncio.create_subprocess_exec(
            *args, cwd=str(REMOTION_DIR),
            stdout=_asyncio.subprocess.PIPE,
            stderr=_asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()

        if proc.returncode != 0:
            out = stdout.decode(errors='replace')
            err = stderr.decode(errors='replace')
            print(f"[cine] ERROR STDOUT:\n{out[:800]}")
            print(f"[cine] ERROR STDERR:\n{err[:800]}")
            raise RuntimeError((out + err)[-400:])

        # 5. Subir a Cloudinary
        jobs[job_id].update({"status": "uploading", "step": "upload", "progress": 86})
        cloudinary_url = ""
        try:
            from cloudinary_upload import upload_video
            cloudinary_url = await upload_video(str(output_path), f"cine_{job_id[:8]}")
            print(f"[cine] Cloudinary OK → {cloudinary_url}")
        except Exception as ce:
            print(f"[cine] Cloudinary error: {ce}")

        # 6. Guardar en Firestore (colección cines)
        try:
            db = get_firestore()
            if db:
                db.collection("cines").document(job_id).set({
                    "id":           job_id,
                    "url":          req.url,
                    "proposito":    req.proposito,
                    "desarrollo":   req.desarrollo,
                    "userId":       req.userId,
                    "animationIds": req.animation_ids,
                    "introTitle":   plan["intro_title"],
                    "outroCta":     plan["outro_cta"],
                    "palette":      plan["palette"],
                    "videoUrl":     cloudinary_url,
                    "localFile":    output_path.name,
                    "frames":       total_frames,
                    "createdAt":    datetime.utcnow().isoformat(),
                })
                print(f"[cine] Firestore OK → cines/{job_id}")
        except Exception as fe:
            print(f"[cine] Firestore error: {fe}")

        jobs[job_id].update({
            "status": "done", "step": "export", "progress": 100,
            "videoPath": str(output_path), "videoFilename": output_path.name,
            "cloudinaryUrl": cloudinary_url,
        })
        print(f"[cine] OK → {output_path.name}")

    except Exception as e:
        print(f"[cine] ERROR: {e}")
        jobs[job_id].update({"status": "error", "error": str(e)[:400]})
    finally:
        # Limpiar todos los archivos temporales generados para el render
        for f in temp_files:
            try:
                f.unlink(missing_ok=True)
            except Exception:
                pass


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

        # 5. Firestore
        try:
            db = get_firestore()
            if db:
                db.collection("videos").document(job_id).set({
                    "id": job_id, "url": req.url, "desarrollo": req.desarrollo,
                    "proposito": req.proposito, "userId": req.userId,
                    "theme": spec.get("theme"), "brand": spec.get("brand"),
                    "videoUrl": cloudinary_url, "localFile": output_path.name,
                    "frames": total_frames, "createdAt": datetime.utcnow().isoformat(),
                })
                print(f"[video] Firestore OK -> videos/{job_id}")
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
