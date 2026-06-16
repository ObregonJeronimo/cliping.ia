# 🌳 ARBOL — Urvid (mapa vivo del proyecto)

> **Single source of truth del estado y el camino.** Lo leen humanos Y agentes. Antes de tocar algo,
> leer esto. Despues de un cambio importante, ACTUALIZAR esto (es responsabilidad del agente que toca).
> Repo: `cliping.ia` (carpeta/GitHub/Firebase = IDs reales, NO renombrar). Producto = **Urvid**.

---

## 🎯 OBJETIVO DEL SISTEMA
Pegás un **link** → Urvid genera un **video vertical 9:16 de marketing** que:
1. **Captura el alma de la página** (su marca, color, rubro, mensaje, fotos reales).
2. Es **ÚNICO**: dos páginas distintas → videos que NO se parecen (ni estructura, ni look, ni "molde").
3. Se ve **profesional 2026** (legible, fluido, sin defectos de "plantilla" ni bugs).
4. **SIN IA generativa de imagen/video.** Todo es Canvas-2D **determinista** (PRNG sembrado) + fotos reales del sitio.

---

## 🟢 EN USO (arquitectura activa)
- **UI = solo "Animaciones"** (`src/pages/Animaciones/`). `/studio` index = TimelineStudio; sidebar = Animaciones + Mis animaciones. (Cinematicas y los labs se removieron.)
- **Motor** = `src/pages/Animaciones/engineCore.js` — `drawFrame(ctx,t,timeline)` dibuja todo. Lógico 405×720, escala a 1080×1920. Tipos de escena: `scene`(hero/sceneSpec), `statement`, `checklist`, `reveal`, `numberStack`, `quote`, `split`, `bigStat`, `outro`, `paintTitle`(legacy), `deliver`(legacy).
- **Director REAL** (producción, USA API Anthropic) = `backend/timeline_director.py` (`/api/timeline/generate` + `/api/timeline/batch`). Construido ENCIMA de `template_director.py` (cliente IA, análisis de sitio, brief, pools creativos, costo) → `template_director`/`cine_generator`/`vision_critic`/`brand_dna` son **engine-room COMPARTIDO**, NO se borran.
- **Director MOCK** (testing, NO API) = `backend/mock_director.py` → `python backend/mock_director.py --out tools/brands` genera timelines determinísticos diversos. **Para el loop de auto-mejora se usa SIEMPRE el mock, nunca la API.**
- **Catálogo** = `backend/style_catalog.py` (19 estilos + STYLE_FONTS por estilo) y `backend/style_engine.py`.
- **Render MP4** = `remotion/src/compositions/TimelineVideo.jsx` (composición Canvas). Backend local via `start.bat`.
- **Deploy** = frontend **Vercel** (push a main = auto-deploy); backend LOCAL via `start.bat` (git pull + :8000 + ngrok + Remotion).

## 🧰 QA TOOLKIT (cómo VER y MEDIR sin gastar API)
- `node tools/get-fonts.mjs` — baja las fuentes reales (Skia) a `tools/fonts/`.
- `node tools/make-stock-photos.mjs` — fotos fake por rubro (`tools/_stock/`).
- `python backend/mock_director.py --out tools/brands` — genera marcas mock.
- `node tools/render.mjs gallery|video <json> <name> <N>|window|gif` — rasteriza frames a `tools/out/` (abrir con Read).
- **ffmpeg** — extraer TODOS los frames de un MP4 real (`ffmpeg -i video.mp4 -vf fps=N frames_%03d.png`) para auditar el último video del usuario.
- **GATES determinísticos** (correr SIEMPRE tras un cambio del motor):
  - `node tools/bg-check.mjs` → DEBE dar **16 pass, 0 fail** (determinismo; sin Math.random/Date.now).
  - `node tools/legibility-probe.mjs <json>` → contraste WCAG texto-vs-fondo por escena (ojo: sobre-cuenta bordes/acentos; el CUERPO de texto es lo que importa).
  - `node tools/fluidity-probe.mjs <json>` → "crawl" del texto en el hold (MAD por banda); texto clavado ≈ fondo.
- `npx vite build` — que el front compile.

---

## ❌ PROBADO Y DESCARTADO (no repetir — y por qué)
- **Morph/"blobs"/gotas geométricas como hero** → el usuario los ODIA ("animaciones feas de gota"). El motor ahora DESCARTA morph/shape si la escena tiene texto. NUNCA volver a meter una figura geométrica sobre/junto a un título. [[feedback-no-morph-blobs]]
- **Cinematicas (engine viejo, Home)** → removido del UI. Era el otro motor (anime_*/gsap_* + Remotion ParticleHero). Urvid = solo Animaciones.
- **Labs (Fondo/Motion/Direccion/Lottie) + Lottie (POC4)** → POCs de desarrollo, removidos. Lottie no se usa (riesgo de determinismo + glifos).
- **Snap del texto a la grilla de píxeles** para la fluidez → DESCARTADO: agregaba saltos de 1px (sceneSpec re-traslada por elemento). El fix correcto fue: contenido con transform CONSTANTE en el hold (el movimiento vive en el fondo) → texto clavado, sin crawl.
- **Glifo ★ (estrella) por fuente** → daba "tofu" (caja vacía) en Skia headless. Reemplazado por estrella VECTORIAL por path. Regla: nunca depender de glifos de símbolos/emoji de la fuente.
- **Scrim central negro fijo** → en tono claro grisaba y el texto cream/acento no contrastaba. Ahora el scrim y `_accentPop` son tone-aware.
- **API real para testear** → PROHIBIDO en el loop de mejora (gasta el saldo del usuario). Se usa el MOCK.

---

## 🧪 FALTA TESTEAR / VERIFICAR EN VIVO (el usuario es el juez final; los frames NO muestran motion)
- **Fluidez del MP4** (texto fluido sobre fondo en movimiento) — solo se valida en vivo (Vercel + start.bat + generar video).
- **Fotos reales** del sitio (calidad, encuadre, Ken Burns) — en vivo.
- **Anti-sameness en vivo**: generar 3-4 videos de páginas distintas seguidas y confirmar que NO se parecen.
- **Import multi-portal** (Zonaprop/Argenprop/MercadoLibre/Properati) — los adapters/scrapers reales faltan (anti-bot, render JS). Solo RE/MAX anda.
- **Acento frío en marca cálida** (ej. Vibra azul sobre rayos cálidos) → revisar la selección de paleta en `brand_dna`/director.
- **Multi-OS** (build/firma Linux/Mac) — solo probado Windows.

---

## 🗺️ ROADMAP / PRÓXIMOS PASOS
- **Anti-sameness más profundo** (prioridad del usuario): que la ESTRUCTURA, el RITMO, la PALETA y el LOOK varíen fuerte por marca. Ya rotan por semilla: checklist(rows/grid/chips), statement(5 estilos), outro(6 comps), bigStat(bar/ring/plain), align. Falta: medir similitud entre marcas (ver `similarity-probe`) y atacar lo que quede igual.
- **"Alma de la página"**: que el video refleje de verdad el rubro/mensaje/marca (no genérico). Verificar que el director use bien las fotos + el copy específico.
- **Nuevas técnicas (deterministas, sin IA generativa)**: motion premium, tipografía cinética, composición editorial, transiciones — investigar e integrar al motor.
- **Loop autónomo** (ver `docs/AGENTES.md`): equipo de agentes que mejora + testea en loop con el mock.

---

## 🔒 REGLAS DURAS (gates que NINGÚN cambio puede violar)
1. **Determinismo**: nada de `Math.random`/`Date.now`/`new Date` en el motor → usar `mulberry32(seed)`. `bg-check` SIEMPRE 16/16.
2. **NO IA generativa** de imagen/video. Solo Canvas-2D determinista + fotos reales del sitio.
3. **NO gastar la API** en testing → usar el MOCK (`mock_director.py`).
4. **NO morph/figuras geométricas** sobre títulos.
5. **Anti-sameness**: dos links distintos → videos distintos. Si dos quedan iguales, es un bug.
6. **Legibilidad**: el cuerpo de texto SIEMPRE se lee (scrim/halo tone-aware).
7. **Git**: commits ASCII imperativos + trailer `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`; `git fetch && git rebase origin/main` antes de push; nunca push forzado.
8. **No tocar**: la landing (es de Thiago), los IDs reales (Firebase `cliping-ia`, repo, carpeta).
