# Contexto para tu IA (pegá esto como primer mensaje)

> **Thiago:** copiá TODO lo de abajo (desde "Hola" hasta el final) y pegalo como primer mensaje en tu Claude Code / asistente, dentro de la carpeta del repo. Lo pone al día del proyecto y le marca las reglas para que no rompa nada.

---

Hola. Vas a trabajar en **cliping.ia (urvid)**, un proyecto que convierte una **URL** en un **reel vertical de marketing 9:16**. Antes de tocar nada, internalizá esto:

## Qué es y cómo está armado
- **urvid IA** (`/studio`) y **urvid IA Advanced** (`/studio/craft`): generan el video con un **motor de CANVAS que corre en el navegador** → `src/urvid/` (`makeVideo()` arma una "carta"/recipe determinista, `drawFrame()` la dibuja). Es **determinista** (mismo brief+seed = mismo frame), **$0** (no renderiza en servidor; exporta con MediaRecorder).
- **Cine IA** (`/studio/cine-motor`): un video de IA (fal.ai) es el fondo y nuestro motor le pone el texto. Usa un **fork**: `src/urvid-cine/`. **Las mejoras de Cine van SOLO ahí; `src/urvid/` no se toca para Cine.**
- **Frontend:** React + Vite (`src/`), deploy en **Vercel**. Push a `main` → redeploy.
- **Backend:** FastAPI (`backend/`, `python run.py`, puerto 8000): captura la página con Playwright + arma el **brief** con Claude (`/api/urvid/perceive`), genera video fal (`/api/seedance/*`), analiza clips (`/api/cine/analyze`).

## ⚠️ GOTCHA #1 — el motor vivo es `src/urvid`, NO Remotion
Hay una carpeta `remotion/` + `backend/template_director.py` + una skill `.claude/skills/cliping-ia` que dicen estar "activos". **Es LEGACY.** Los estudios vivos importan de `src/urvid` (canvas). No te guíes por la skill ni por Remotion: el código que corre es el canvas.

## ⚠️ GOTCHA #2 — todo cambio al motor DEBE pasar los gates
Antes de pushear cualquier cambio a `src/urvid`:
```
npm run gates
```
Corre la cadena: **determinismo** (frame idéntico), **texto** (el fitter ACHICA, nunca corta con "…", cero desborde aun con texto adversarial), **APCA/contraste** (ink≥4.5, onAccent≥3), **QA** (listas parejas, nunca dos escenas juntas en una transición) y **vite build**. **Si un gate se pone rojo, NO se pushea.** Extra (no está en la cadena): `node tools/urvid1-color-check.mjs`.

## ⚠️ GOTCHA #3 — los gates NO miden lo VISUAL
Determinismo/contraste/desborde sí; pero "se ve lindo / la animación queda bien / el color es de la marca" NO. Para eso renderizá una **hoja de contacto** con fuentes reales y miralá:
```
node tools/urvid1-shot.mjs '{"brand":"X","rubro":"tech","tone":"dark","brandColor":"#7c5cff","tagline":"...","claim":"...","stats":[{"label":"+40% algo"}],"seed":7}'
```
Sale `tools/out/urvid1-shared.png` (y un .mp4). Abrí el PNG para revisar color/tipografía/composición/legibilidad. Imprime la "CARTA" (recipe) — útil para confirmar, p.ej., que un brief con dato abre con un hook de número.

## ⚠️ GOTCHA #4 — el PRNG del arco es UNA secuencia compartida
En `src/urvid/core/strategy.js` `buildArcSmart` usa un solo generador (`seedFor(seed,'arc')`). Si agregás o quitás un `r()` en el medio, se **corre toda la secuencia** y se re-rollea el cuerpo del arco → puede aparecer texto largo en una escena angosta y romper el gate de texto (ya pasó: 10 "…" en escenas de prueba social). Si tocás el arco: o preservás el patrón de draws, o usás un **namespace de PRNG separado** (`seedFor(seed,'otro-nombre')`), o aceptás el re-roll y corrés `prefit`+`qa` para confirmar 0 "…".

## Cómo trabajamos entre los dos (IMPORTANTE)
1. **Un día trabaja uno, el otro día el otro.** Nunca los dos editando/pusheando `main` el mismo día.
2. **Siempre `git pull` ANTES de empezar.**
3. **Commit + push cuando terminás** la sesión (no dejes cambios sin pushear).
4. Commits chicos y frecuentes, mensajes claros.
5. **Nunca** subas `backend/.env` (secrets) al repo.

## Estado del proyecto (leé esto antes de proponer trabajo)
- `PLAN-MEJORAS.md` (en la raíz) es el **checklist vivo** del pulido del motor: `[x]` hecho, `[ ]` pendiente, `[~]` diferido. Ya está hecho todo el **pipeline de audiencia** (captura→brief→copy→arco→selección de color/fondo/atmósfera/escenas/movimiento, todo reacciona al público y al contenido) + muchos arreglos de calidad. **Lo que queda es mayormente arquitectónico (high/L) o refinamientos chicos (med/low).**
- `docs/DEFERRED-typekit-scrim-specs.md`: dos mejoras con diseño ya vetado pero diferidas (su valor es visual; hacelas con preview en vivo).
- `ONBOARDING.md`: setup paso a paso y cómo correr.

## Mapa rápido
- `src/urvid/` — motor canvas (urvid IA / Advanced). Núcleo en `core/` (assemble=director, render=dibujo, strategy=arco/señales, fit=scorer, layout, text, palette). Bibliotecas en `libs/` (scenes, color, backgrounds, motion, transitions, post, atmosphere, substrates, markkit, datakit).
- `src/urvid-cine/` — fork para Cine IA.
- `backend/perception.py` — arma el brief (incluye `audience{who,register,awareness}`). `backend/site_capture.py` — captura (texto, screenshot, imágenes rankeadas, datos declarados). `backend/main.py` — endpoints.

**Primera tarea sugerida:** corré `npm run gates` para confirmar que tu entorno está sano (debe dar todo verde), después abrí `PLAN-MEJORAS.md` y decime qué te gustaría encarar. No toques `src/urvid` sin entender el gotcha del PRNG y sin correr los gates después.
