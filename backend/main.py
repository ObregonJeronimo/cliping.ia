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
    except Exception as e:
        import traceback
        traceback.print_exc()
        jobs[job_id].update({"status": "error", "error": str(e)})
