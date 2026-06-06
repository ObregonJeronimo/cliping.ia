---
name: cliping-ia
description: >-
  Usar al trabajar en la GENERACIÓN DE VIDEOS de cliping.ia: escenas Remotion,
  sistema de movimiento/dirección de arte, paletas, o el pipeline del "director"
  (template_director -> VideoFromSpec -> scenes). Triggers: Remotion, VideoFromSpec,
  template_director, escenas/scenes, motion.js, theme/paletas, art direction,
  /api/video/generate, storyboard, spec del video. Cubre la arquitectura propia y
  los gotchas del repo para no escribir Remotion genérico ni romper convenciones.
---

# cliping.ia — generación de videos (Remotion + director)

Videos verticales de marketing (1080×1920) animados estilo motion-graphics. Para la
**corrección general de Remotion** está instalada aparte la skill oficial
`remotion-dev/skills` (`npx skills add remotion-dev/skills`). Esta skill cubre lo
ESPECÍFICO del repo.

## Arquitectura (pipeline ACTIVO = "templates")
URL + desarrollo + propósito → `backend/template_director.py:build_storyboard()` arma un
**spec JSON** (theme + art + escenas + copy) con Sonnet (`claude-sonnet-4-6`) → resuelve
íconos con `iconify_service` → `build_video_files()` arma los archivos →
`remotion/src/templates/VideoFromSpec.jsx` renderiza con `TransitionSeries` →
`remotion/src/templates/scenes/*.jsx`.
- Endpoint: `POST /api/video/generate` en `backend/main.py` (re-hostea screenshot y logo a Cloudinary).
- Helpers de movimiento: `remotion/src/templates/motion.js`. Paletas/colores: `theme.js`.
- Atmósfera global: `Backdrop.jsx`. Sonido (cableado, off sin archivos): `SoundLayer.jsx`.

> Nota: el pipeline viejo (forge, cine, agent, etc.) fue eliminado. Quedan solo los
> módulos del pipeline de templates: main, template_director, cine_generator (solo se
> reusa `analyze_url_light`), iconify_service, site_capture, cloudinary_upload. Único
> endpoint de generación: `POST /api/video/generate`.

## Reglas de oro (gotchas que YA rompimos)
- **Versiones Remotion pineadas EXACTAS a `4.0.469`** (todas las deps `@remotion/*`). No bumpear suelto.
- **Composition ID sin `_`**: se usa `MarketingVideo-<hash>` (guion, no guion bajo).
- `durationInFrames` se pasa **por prop** a cada escena dentro de `Sequence`/`TransitionSeries`.
- **`TDUR` (14) en `VideoFromSpec.jsx` debe coincidir con `FADE` (14) en `template_director.py`.**
- Registrar cada escena nueva en el `REGISTRY` de `VideoFromSpec.jsx` **y** en el director
  (catálogo, `valid_types`, `SCENE_VARIANTS`).

## NADA HARDCODEADO (centrar el video en el público del sitio)
Todo el contenido sale del análisis del sitio, no de defaults fijos:
- Copy/íconos los decide el LLM desde el contenido real; el director infiere el **PÚBLICO**
  de la página y escribe para esa audiencia.
- Colores: derivar de la marca con `accentPalette(theme, n)` (no listas fijas tipo Slack/Gmail).
- CTA: solo si el director lo provee (sin frases tipo "Empezá gratis" en la escena).
- Mockup sin screenshot → wireframe abstracto neutro (no kanban falso).
- Stat/Testimonial/SocialProof: **solo con datos reales/plausibles**, nunca cifras inventadas.

## Variedad (dirección de arte por video)
`spec.art = { camera, entrance, motif, transitions }` → se mergea en `theme.art`. Las escenas
usan `camera(theme.art, ...)` y `entrance(theme.art, ...)` (familias en `motion.js`); el
`Backdrop` aplica el `motif`. El director elige un preset coherente (`ART_PRESETS`). Las
entradas estructurales (paneles izq/der, filas) quedan direccionales fijas, no por art.
Hay **10 paletas-vibra** (no rubros) en `theme.js`; el brand-accent recolorea encima.

## QA sin Windows (validar antes de commitear)
No hay render real acá; validar con esbuild + react-dom/server:
1. `npm install --no-save esbuild@0.21.5 react@18 react-dom@18`.
2. Sintaxis: `esbuild transform` con `jsx:'react-jsx'` (automatic runtime; sino "React is not defined").
3. Runtime: renderizar cada escena con `react-dom/server` y un **mock de `remotion`**
   (AbsoluteFill, useCurrentFrame, useVideoConfig, Img, Audio, Sequence, staticFile, spring),
   a varios frames × art directions × paletas.
4. Bundle de `VideoFromSpec` con paquetes `remotion` como external.
5. **Limpiar siempre** antes de commitear: `rm -rf node_modules package-lock.json && git checkout -- package-lock.json`.

El render animado real lo corre el dev en Windows; puede pasar ajustes de timing.

## Git
Push directo (git-over-HTTPS) **preserva UTF-8**; no usar herramientas tipo `push_files`
que corrompen acentos/ñ. Enmascarar siempre el token en outputs (`sed 's/ghp_[A-Za-z0-9]*/ghp_***/g'`).
