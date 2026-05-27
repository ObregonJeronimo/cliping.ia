# cliping.ia — Backend

Agente Python: Playwright + FFmpeg + FastAPI

## Setup

```powershell
pip install -r requirements.txt
pip install edge-tts
playwright install chromium
```

## Correr local

```powershell
uvicorn main:app --reload --port 8000
```

## Endpoints

- `POST /api/generate` — lanza un job
- `GET  /api/jobs/{job_id}` — estado del job
- `WS   /ws/{job_id}` — progreso en tiempo real

## FFmpeg

Descargar desde https://ffmpeg.org/download.html y agregar al PATH.
