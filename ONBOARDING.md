# Onboarding — cliping.ia (urvid)

Guía para correr el proyecto en una PC nueva y trabajar entre varios sin pisarnos.

> **Thiago, empezá acá (orden):**
> 1. Instalá los programas y cloná el repo → **"Setup en una PC nueva"** (abajo).
> 2. Pedile a Jero el `backend/.env` (secrets) y, si vas a hostear la demo en vivo, su **authtoken de ngrok**.
> 3. Corré `npm install` (raíz) + las deps del backend, y probá `npm run gates` → debe dar **todo verde**.
> 4. Abrí **[`THIAGO-IA-CONTEXTO.md`](THIAGO-IA-CONTEXTO.md)** y pegá su contenido como **primer mensaje** en tu Claude Code: pone a tu IA al día del proyecto y le marca las reglas (gates, determinismo, qué NO romper).
> 5. Antes de tocar `main`: **`git pull`**. Al terminar el día: **commit + push**. Nunca los dos el mismo día.

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
1. Instalá **Python 3.12**, **Node 20+**, **git** y **Windows Terminal**. (**ngrok** solo si vas a **hostear la demo en vivo** — ver paso 6.)
2. Cloná el repo en una ruta **SIN espacios** (ej. `C:\Users\<vos>\Documents\cliping.ia`).
3. Pedí a Jero el `backend/.env` y guardalo en `backend/.env`. **Nunca** lo subas al repo ni lo pegues en chats.
4. Backend (una vez): `python -m pip install -r backend/requirements.txt` y `python -m playwright install chromium`.
5. Frontend (una vez): en la raíz del repo, `npm install`.
6. `start.bat` ya es **portable** (usa `%~dp0`, no hace falta editar rutas). **Solo si vas a hostear la demo en vivo**: instalá ngrok y cargá el **authtoken de Jero** una sola vez → `ngrok config add-authtoken <token-de-jero>`. Así tu túnel sirve el dominio FIJO `draw-overturn-backpack.ngrok-free.dev` que usa la página de Vercel (ese dominio está reservado en la cuenta de Jero; por eso necesitás su token, no el tuyo).

## Cómo correr y testear
- **Para desarrollar/testear tus cambios (RECOMENDADO):** corré los dos local:
  - Backend: `cd backend && python run.py` (o el `start.bat`).
  - Frontend: `npm run dev` → abrí `http://localhost:5173`. El front pega a `localhost:8000` (tu backend local). No necesitás ngrok ni Vercel.
- **`start.bat`** hace `git pull` + instala deps del backend + abre el **backend** + **ngrok con el dominio fijo** de Vercel. Con el authtoken de Jero cargado (paso 6), tu `start.bat` sirve el **mismo** dominio → en **tus días** la página de Vercel usa **tu** backend, sin tocar `vercel.json`. Para dev normal NO hace falta: alcanza con correr local (`npm run dev` + `python run.py`).
- **Regla de oro del ngrok:** **solo UNO corre el backend a la vez** (es el mismo dominio). Por eso el modelo "un día cada uno" — nunca los dos `start.bat` prendidos juntos.
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
