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
- `node tools/video-frames.mjs <mp4> [fps=3] [cols] [rows] [t0] [t1]` — MP4 -> CONTACT SHEETS (grillas) via ffmpeg:
  un video de ~20s = 1-2 PNGs (barato en tokens, no cientos de lecturas). Overview a 3fps o "zoom" de fluidez
  (ventana corta a 16fps). Los videos reales del usuario estan en `backend/outputs/*_timeline.mp4`.
- **GATES determinísticos** (correr SIEMPRE tras un cambio del motor):
  - `node tools/bg-check.mjs` → DEBE dar **16 pass, 0 fail** (determinismo; sin Math.random/Date.now).
  - `node tools/legibility-probe.mjs <json>` → contraste WCAG texto-vs-fondo por escena (ojo: sobre-cuenta bordes/acentos; el CUERPO de texto es lo que importa).
  - `node tools/fluidity-probe.mjs <json>` → "crawl" del texto en el hold (MAD por banda); texto clavado ≈ fondo.
  - `node tools/similarity-probe.mjs [dir]` → anti-sameness: pares de marcas demasiado parecidos (estructura + aHash gris).
  - `node tools/stress-samerubro.mjs <rubro>` → genera N marcas del MISMO rubro estilo PRODUCCIÓN (cada una su
    stable_seed, SIN el re-roll del banco) y mide colisiones → ve el riesgo real de "dos videos parecidos" en prod.
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

## 🔁 LOG DEL LOOP (urvid-loop)
- **Iteración jun 16 #1** (HECHA): anti-sameness CONFIRMADO sano (probe filtra el banco canónico `^\d\d-`). Fixes:
  numberStack con DECIMALES, blueprint con HUE de marca, motivos por rubro (plato/birrete/contornos). bg-check 16/16.
  Implementado además (cola verificada): weight-wave (c8e9dda), transiciones glyph-wipe+push-band (9f051e6), sustrato
  por rubro (2861d9c), legibilidad outro `_softShadow` (e589a20), color same-rubro por lightness (c92d9ba),
  reveal vertical-anchor (0a0f512), folio editorial (00fbb4a). Nueva QA: tools/stress-samerubro.mjs.
- **Iteración jun 16 #2** (HECHA — 24 hallazgos, 10 alta, adversarialmente verificados; 2 REFUTADOS, ver abajo):
  - numberStack = driver #1 de sameness: layout sembrado (ancla/gap/foco) + contraste tono-claro (c729c597);
    STAT_SETS por rubro (tech/salud/educacion/moda/belleza + 2 variantes c/u) (19ace644).
  - alma "foto real": el mock perdía la foto -> _hero_resource visual SIEMPRE 'photo' + _gen_structure(force_hero)
    garantiza slot hero; educacion = rubro visual (19ace644). GUARD en PRODUCCIÓN: _normalize_timeline inyecta hero
    fotográfico si dna.images y no hay foto/split (037ccea, idempotente, respeta cap+outro, $0 sin API).
  - legibilidad: comilla de cierre del statement-quote se despegó del título (c729c597, era decoración-sobre-título).
  - brutalist: bloque esquina mostaza off-brand -> sombra del acento (on-brand) + respira (8ed51ee).
  - probe HONESTA: 5 muestras + umbral 0.20 + chequeo de CONTENIDO textual (numbers/frases/CTA, invisible al hash
    gris); _sig del banco cubre contenido; classify suma meditacion/bienestar a salud (6bf100e). Banco: 0 visual + 0
    contenido bajo el bar estricto. 16/16.
  - **REFUTADOS** (NO tocar): (a) "sustrato denso de Aura" = capa mal identificada (Aura usa contour, no dotgrid; los
    puntos densos son el halftone INTENCIONAL del estilo riso). (b) "chevron del CTA ctaOnly pisa el texto" = el render
    real mide 29.6px de aire (fitFont nunca envuelve; el offset escala con fs). No son accionables.

- **Iteración jun 17 #3** (HECHA — 21 hallazgos, 8 alta; 4 REFUTADOS por premisa falsa sobre strokeText/weights):
  - los drawers que faltaba SEMBRAR eran el driver de sameness: **sceneSplit** (ratio/ancla/barra) + **sceneQuote**
    (ancla + estilo de comilla big/tenue/bar) ahora varían por marca (6c7fd3e).
  - **blob orgánico** (la "planta" de 5 elipses en interior.png) junto al wordmark -> reemplazada por una lámpara de
    pie GEOMÉTRICA (6c7fd3e). Era el look rechazado (regla 4).
  - **reveal hero-word** azul-sobre-azul (DataFlow "caos") -> más brillante + halo de tono opuesto (e3a7947).
  - **técnica nueva rgbsplit** (7º corte): aberración cromática sembrada por (SEED^idx), transitoria (e3a7947).
  - Banco: 0 visual + 0 contenido. 16/16 en todo.
  - **Cola de #3 IMPLEMENTADA** (workflow urvid-finish-queue, secuencial + gate-keeper adversarial, verdict ok):
    (a) numberStack orientación columna|heroRow sembrada SOLO n===3, x por-item (aaf375d). (b) tratamiento de foto
    por marca: Ken-Burns sembrado + duotono al acento (945cacf). (c) outro 'diagonal' con 3 sub-variantes de layout
    por SEED (fef07a2). (d) probe intra-tipo: 1ra escena de cada tipo a su t-MEDIO, split-vs-split/quote/outro/numberStack
    (35c035c). (e) stock geométrico para tech/finanzas/default + dedup (cb0ce90). Banco: 0 visual + 0 contenido, 16/16.
  - **Cola de #3 (cola fina) IMPLEMENTADA** (directo, tras caer agentes por 529): split con corte HORIZONTAL sembrado
    ~40% -> separó el par intra-tipo Altos del Sur vs Vibra (85a8924, intra-tipo split = 0); sustrato 'editorialgrid'
    (hairlines de columna + reglas de baseline) asignado a moda (eace756); 'kinetic strip' (marquesina) en el tercio
    inferior del reveal, ~35% SEED, con guarda de watermark (e4ae0e3). bg-check 16/16, 0 visual + 0 contenido.
  - **DIFERIDO a conciencia** (NO es deuda olvidada): guard anti-sameness PERSISTIDO cross-marca en producción
    (timeline_director) -> baja prioridad: es path de API (no se verifica offline) y el stress + la probe honesta
    muestran el riesgo real controlado. Único intra-tipo restante: [outro] Verdo vs Sonrisa 0.158 (borderline,
    verificado que difieren en color/CTA/dirección del filete -> informativo, no rompe gate).

### COLA RESTANTE (verificada por el loop #2 — próxima iteración)
- **Técnica: tracking cinético (line-settle kerning)** [HECHO commit 5472e7f]: `_kineticDraw` con param `trackOpen`
  (default 0 -> CTAs de outro con track negativo intactos; trk NO clampeado). Display (fit>36) puede nacer ancho y
  cerrar (eOutCubic). Opt-in ~45% SEED, aparte del weight-wave. Verificado Trama (hero) + DataFlow (CTA sin regresión). 16/16.
- **Técnica: transición `colgrid` (split-flap editorial)** [HECHO commit dd8ce6b]: 4-6 columnas con stagger + shift
  vertical sembrados por (SEED^idx), rama en `_transAt(kind,wp,idx)`, en ambos `_TRANS`. Verificado DataFlow. 16/16.
- **Técnica: sustrato `crosshatch`** [HECHO commit 7187da9]: rayado cruzado +/-ang (densidad/fase por SEED, deriva CLK),
  alpha tone-aware bajo; asignado a finanzas (mock + prod). Verificado Capitalia. 16/16.
- **Técnica: cinta cinética (kinetic strip)** [MEDIO riesgo, PENDIENTE] — banda de marquesina en el tercio muerto;
  guarda DURA contra el watermark (statement solo tercio superior, nunca inferior; reveal inferior OK). Gate ~35% SEED.
- **Outro `diagonal` compartido** — 3 marcas oscuras caían en diagonal+dark+contour (end-card calcado en gris). El fix
  de "firma anti-colisión" es INEFECTIVO (verificado); el real es variar el LAYOUT del end-card diagonal por marca, o
  que estilos oscuros adyacentes en STYLE_ORDER no compartan diagonal. Pendiente de diseño.
- **Anti-sameness cross-marca PERSISTIDO en PRODUCCIÓN** (guard post-LLM por brand_key en timeline_director, sin API).
  Baja prioridad: el stress + la probe honesta muestran el riesgo real controlado.

## 🗺️ ROADMAP / PRÓXIMOS PASOS
- **Anti-sameness más profundo** (prioridad del usuario): que la ESTRUCTURA, el RITMO, la PALETA y el LOOK varíen fuerte por marca. Ya rotan por semilla: checklist(rows/grid/chips), statement(5 estilos), outro(6 comps), bigStat(bar/ring/plain), align. Falta: medir similitud entre marcas (ver `similarity-probe`) y atacar lo que quede igual.
- **"Alma de la página"**: que el video refleje de verdad el rubro/mensaje/marca (no genérico). Verificar que el director use bien las fotos + el copy específico.
- **Nuevas técnicas (deterministas, sin IA generativa)**: motion premium, tipografía cinética, composición editorial, transiciones — investigar e integrar al motor.
- **🔬 INVESTIGACION GRANDE (jun 17)**: ver `docs/INVESTIGACION-MOTION.md` — 22 hallazgos verificados con fuente +
  roadmap de 12 pasos para subir UNICIDAD + motion PRO + morphs FLUIDOS. Quick wins: spring analitico, PRNG por
  namespace, `features` ortogonal (motor de unicidad), paletas ColourLovers+WCAG, alineacion de anillo. Apuestas:
  flubber (morph real), smin+metaballs+marching-squares (blob INTENCIONAL), tipografia draw-on. Biblioteca inmensa =
  catalogo sembrable backgrounds/shapes/motion + blend-tree (patron Rive) + flow fields. NO adoptar Two.js/Lottie en
  runtime (Cairo!=Skia) ni Theatre/studio (AGPL). Diagnostico de los ultimos 3 videos: fondo palido lavado, hero
  estatico (motion solo de entrada), vocabulario compartido = sensacion de plantilla, cero morphs fluidos.
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
