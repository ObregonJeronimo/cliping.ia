# Onboarding — cliping.ia (urvid)

Guía para correr el proyecto en una PC nueva y trabajar entre varios sin pisarnos.

## Qué es
**urvid** convierte una URL en un **reel vertical de marketing (9:16)**. Productos:
- **urvid IA** (`/studio`) y **urvid IA Advanced** (`/studio/craft`): generan el video con un **motor de CANVAS que corre en el navegador** (`src/urvid/`, `makeVideo()` + `drawFrame()`), determinista y **$0** (no usa servidor para renderizar; exporta con MediaRecorder).
- **Cine IA** (`/studio/cine-motor`): el video de **IA** (fal.ai) es el protagonista y **nuestro motor le pone el texto** en los beats. Usa un **fork** del motor: `src/urvid-cine/` (las mejoras de Cine van SOLO ahí; `src/urvid/` no se toca).

> Nota: el motor de **Remotion** (`remotion/`, `backend/template_director.py`, `/api/video/generate`) y la skill `.claude/skills/cliping-ia` lo describen como "activo", pero en el código vivo es **legacy** — los estudios usan el canvas (`src/urvid`). No te guíes por eso.

## Arquitectura
- **Frontend:** React + Vite (`src/`). Deploy en **Vercel** (`cliping-ia.vercel.app`). Push a `main` → redeploy automático.
- **Backend:** FastAPI (`backend/`, `python run.py`, puerto 8000). Se usa para:
  - `POST /api/urvid/perceive` — Playwright captura la página (texto + screenshot HD + imágenes) y Claude Sonnet arma el **brief**. Cacheado por URL.
  - `POST /api/seedance/*` — genera video con **fal.ai** (modelos en `backend/seedance.py`).
  - `POST /api/cine/analyze` — analiza un clip de IA (ffmpeg + numpy/Pillow) → **beats** (cortes, movimiento, zonas legibles) para colocar el texto.
  - subidas a Cloudinary.
- **Secrets:** `backend/.env` (GITIGNOREADO, NO está en el repo). Pedíselo a Jero. Lleva: `ANTHROPIC_API_KEY`, `FAL_KEY`, `GROQ_API_KEY`, `CLOUDINARY_*`. **No lo subas al repo ni lo pegues en chats públicos.**
- **Proxy:** `vercel.json` reenvía `/api/*` a **un dominio ngrok fijo (el de Jero)**. Por eso la página de Vercel **solo llega al backend de quien tenga ese dominio**. Para desarrollar, usá **local** (ver abajo).

## Setup en una PC nueva (Windows)
1. Instalá **Python 3.12**, **Node 20+**, **git**, **ngrok** (cuenta propia) y **Windows Terminal**.
2. Cloná el repo en una ruta **SIN espacios** (ej. `C:\Users\<vos>\Documents\cliping.ia`).
3. Pedí a Jero el `backend/.env` y guardalo en `backend/.env`.
4. Backend (una vez): `python -m pip install -r backend/requirements.txt` y `python -m playwright install chromium`.
5. Frontend (una vez): en la raíz del repo, `npm install`.
6. `start.bat`: **editá la ruta hardcodeada** (`cd /d C:\Users\Usuario\...` y la del panel del backend) por la tuya.

## Cómo correr y testear
- **Para desarrollar/testear tus cambios (RECOMENDADO):** corré los dos local:
  - Backend: `cd backend && python run.py` (o el `start.bat`).
  - Frontend: `npm run dev` → abrí `http://localhost:5173`. El front pega a `localhost:8000` (tu backend local). No necesitás ngrok ni Vercel.
- **`start.bat`** hace `git pull` + instala deps + abre backend + **ngrok** (para la demo vía la página de Vercel). Ojo: la página de Vercel apunta al ngrok **de Jero**, no al tuyo. Para que la Vercel use TU backend tendrías que cambiar el dominio en `vercel.json` (avanzado; para dev normal alcanza el local).
- **QA antes de pushear:** `npm run gates` (corre los chequeos del motor + build).

## Flujo de trabajo entre dos (importante)
Para no pisarnos en `main`:
1. **Un día trabaja uno, otro día el otro.** No editar/pushear los dos el mismo día.
2. **Siempre `git pull` ANTES de empezar** a tocar nada.
3. **Commit + push cuando terminás** la sesión (no dejar cambios sin pushear).
4. Si por error los dos tocaron lo mismo → resolver el conflicto con calma (o avisar al otro).
5. Cambios chicos y commits frecuentes con mensajes claros.

## Mapa rápido del código
- `src/urvid/` — motor canvas base (urvid IA / Advanced). **No tocar** para Cine.
- `src/urvid-cine/` — fork del motor para Cine IA (acá van las mejoras de Cine).
- `src/pages/CineEngine/CineEngineStudio.jsx` — el estudio Cine IA (motor).
- `backend/seedance.py` — registro de modelos fal + generación + `build_prompt`.
- `backend/video_analyze.py` — análisis de video → beats.
- `backend/main.py` — endpoints FastAPI.
