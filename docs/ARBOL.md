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
- **ANALISIS DE MOVIMIENTO** (ver `docs/ANALISIS-VIDEO.md`): `render.mjs motionmap <json>` = mapa de movimiento (0 tokens,
  marca las ventanas calientes; correr SIEMPRE primero); `render.mjs window <json> probe <t0> <t1>` = tira densa ~6-10fps
  (timing); `render.mjs trail <json> <name> <t0> <t1> [K=7]` = estela/long-exposure (1 img = trayectoria de la rafaga).
  Regla: NUNCA barrer a fps alto (mas fps = mas ciego al movimiento); ~4-5 imagenes por video alcanzan. Fluidez = juez el usuario.
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
- `node tools/render.mjs video tools/torture-fixture.json torture 18` — FIXTURE DE DESBORDE: copy absurdamente largo en
  cada tipo de escena + cada layout de lista. Tras tocar texto/layout, renderizar y confirmar que NADA se sale de su caja
  (clip/fitWrap). Es la garantia "no desborda en ningun video" (regla fix-the-class). Helpers: `clip` (ellipsis) + `fitWrap` (2 lineas).
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

## 🚀 CAMPAÑA MOTION/UNICIDAD (jun 17) — implementacion de docs/INVESTIGACION-MOTION.md
Capas implementadas por workflows secuenciales (impl + gate-keeper adversarial), cada paso 16/16 + similarity 0/0 + commit:
- **Capa A** (motion+morph+color): `_spring` analitico (settle premium en hero/numberStack) + `_morphRing` primitivo de
  morph PURO (resample+winding+rotacion de anillo, sin deps, anti-blob) usado en la firma ambiental + fondo claro
  enriquecido (`_wcagInk`, crema tintada al acento + vinieta). Commits 9a119f0/70e95fb/8698bff.
- **Capa B** (unicidad+motion vivo): `features()` ORTOGONAL en style_engine.py (sub-seeds por eje + distribuciones
  sesgadas, modelo QQL/fxhash; desacopla theme/tono/bg) + choreography (stagger sembrado + spring + FLIP) + tipografia
  draw-on (clip-wipe por letra). El par mas cercano se ALEJO (~0.31 -> 0.328). Commits 0c76155/cade2a9/fac355d.
- **Capa C** (combinar + biblioteca de fondos): `_bgFlowField` (campo de lineas por ruido seedeado, tipo Fidenza) +
  `_bgMorphField` (gran silueta del rubro que morfea, protagonica, detras del scrim, NUNCA sobre el titulo) + wiring
  del eje `bg_system` -> cada marca combina un sistema de fondo distinto del pool. Commits 9505eb6/79037a8/d56bfe2.
- **Capa D** (loop audit+fix): el paso "distribuir bg-systems" LANDEO (9d6eb1e); el resto del workflow (auditoria
  vision + fixes + gate-keeper) **SE COLGO** (~31min sin actividad, server flaky/agente trabado). El estado quedo
  SANO igual (16/16, build, similarity 0/0; galeria rica y variada; morphfield+texto legible verificado a mano).
- **Pulido LEAN (reemplazo de la D colgada, CERRO verde)**: auditor verificado + 4 fixes (de8eca3 watermark tenue en
  mono-ink/default; 125919b numberStack azul-sobre-azul -> acento+halo; b9f3499 chips con pill solido sobre halftone;
  779f4d9 outro motif fuera del CTA + acento calido sobre sunburst). 16/16, similarity 0/0.
  PENDIENTE (baja, proxima iteracion): par intra-tipo Nimbus vs Aula Viva (outro 0.128 + numberStack 0.160) comparten
  molde (ambas saas-explainer-ish) -> variar outro/numberStack para esos. Y la VERIFICACION EN VIVO de fluidez (MP4 real).
Resultado vs baseline ("palido lavado / hero estatico / todos iguales / cero morphs"): paleta con profundidad y mezcla
clara/oscura, motion con spring+stagger+draw-on, morphs fluidos (ambiental + morphfield), y unicidad por features
ortogonal + pool de fondos. Verificado en galeria + escenas. Determinismo 16/16 de punta a punta.

## 🎬 WOW (masterpiece -> motor generico) + ANTI-PALIDO + LOOP DE PAGINAS REALES (jun 17, lo mas reciente)
- DIAGNOSTICO: el ultimo video real del usuario (yerco) se veia IGUAL/palido. Causa: (a) mis cambios eran pulido
  sutil, no el "wow" cinematografico de remotion/src/compositions/YercoMasterpiece.jsx (one-off HECHO A MANO con
  Three.js, NO lo genera el pipeline; el pipeline usa el motor generico TimelineVideo + timeline JSON); (b) demasiados
  rolls en TONO CLARO -> palido lavado (el wow/glow popea sobre OSCURO).
- HECHO: (1) HERO DE PARTICULAS que ensambla la marca (port determinista de Scene1Particles, sin Three.js) -> COMUN
  (~60% en heroes tipograficos) + emparejado a dark; particulas SE DISUELVEN al asentar -> el nombre se LEE (no blob).
  (2) FONDO FLUID (port Scene2Fluid: noise multi-octava + ondas). (3) ANTI-PALIDO: baje light_p de los estilos claros
  por accidente (riso/meshflow/typographic/morph 0.25, aurora 0.4, retro70s 0.45) + _RUBRO_TONE dark-dominante ->
  galeria 9/12 oscuras. (4) force_hero ahora incluye 'particles' -> el wow nunca se pierde por falta de escena hero.
- HERRAMIENTA + METODO NUEVO: tools/video-frames.mjs (MP4 real -> contact sheets). Y el LOOP correcto: "simular la
  API" (yo de director: WebFetch de paginas reales NO cacheadas -> override del copy real en mock.generate -> render ->
  audit frame a frame), SIN gastar saldo. Probado en 5 paginas reales (Cal/Oatly/Gymshark/Glossier/Airbnb): oscuras,
  color de marca real popeando, particulas legibles, sin palido. Convergio.
- PENDIENTE (menor): el guard force_hero=particles es del MOCK; el director de PRODUCCION (LLM) no lo garantiza ->
  si el LLM no emite una 'scene' con display, las particulas no disparan (el engine convierte el display mas grande).
  Reforzar el prompt o un guard en _normalize_timeline. Y la VERIFICACION EN VIVO del MP4 real del usuario.

## 🔎 AUDITORIA DE 9 PAGINAS REALES (jun 18) — faithful mock + verificacion adversarial
Metodo FIEL (memoria feedback-faithful-api-testing): por cada pagina `mock.generate(brand, industria)` (rubro
inferido de la pagina, SIN override de copy, SIN imagenes) -> render contact-sheet -> auditoria. Workflow de 18
agentes (critico + verificador adversarial que MIDE pixeles/edges con zoom) sobre xataka/france24/espn/cookpad/elle/
educ.ar/last.fm/despegar/ciencia.unam. Hallazgos confirmados (no solo afirmados) -> 4 fixes (commits 51bc81d /
501cab8 / a1827cf / 89ffc6c), bg-check 16/16, similarity 0/0, build OK:
- **#1 sistemico: hero de particulas ILEGIBLE al asentar** (confirmado por edge-stddev en France24/ESPN/educ.ar/
  Last.fm/Despegar; Despegar ademas con DOBLE-TRAZO fantasma). Causa triple: sello px*1.16 (letras < nube -> halo),
  particulas disueltas solo a 0.3 (fuzz), y gather que arrancaba en ns -> en heroes CORTOS terminaba tras el corte.
  Fix (a1827cf): sello px*1.42 cap-matcheado + entra en eg>0.62 + glow 6px; disuelve a 0.12; arranca cerca del
  inicio de escena. Re-render: los 6 heroes muestran el nombre NITIDO (ventanas densas para ESPN/educ.ar).
- **alma/palido por mal rubro**: el clasificador era English-centric -> "tecnologia" caia en default (gris
  desaturado, sat 0.10-0.22) -> Xataka salia palido-mauve sin identidad. Fix (51bc81d): keywords ES/expandidas.
  Xataka -> tech (azul vivo, verificado). [El default es gris a proposito; el fix ataca la causa = clasificar bien.]
- **marca ausente hasta el outro**: Cookpad (morph) salia sin escena hero. Fix (501cab8): force_hero para todo
  heroResource -> ahora "Cookpad" aparece a mitad (verificado).
- **labels QA con `<b>` crudo** (visor, no el reel) -> strip (89ffc6c).
- REFUTADOS por el verificador (NO tocar): el titulo "momento" de Xataka es azul saturado (no gris); las particulas
  de Xataka SI asientan nitidas (hero largo); el watermark "DES" de Despegar es sutil (~8 RGB, no compite).

### COLA VERIFICADA (proxima iteracion / requiere MP4 real — los frames NO muestran motion)
- **ESPN**: hexagono (pool de forma-firma de fitness incluye 'hexagon') queda como figura solida cerca/arriba del
  titulo del checklist -> near-miss de la regla 4 (hay GAP, no pegado). Alejar/translucentar el floater de la franja del titulo.
- **educ.ar**: fondo `aurora` es un degrade ARCOIRIS (purpura-teal-verde-magenta) -> diluye el acento unico y lava en
  transiciones. Tintar la aurora hacia el acento (mono-hue).
- **Last.fm/Despegar**: wordmark + acento del OUTRO desaturados (sceneOutro usa `_accentInk(A1, 0.62)` -> lava el hue);
  idem 2da palabra del reveal. Tradeoff con legibilidad-sobre-mismo-hue (Aura/Trama) -> revisar con cuidado.
- **Elle (moda/light)**: riso rosa pastel sin ancla oscura = palido. Bajar light_p de riso o meter ancla oscura.
- **Ciencia UNAM**: el sunburst se lava a rosa casi-blanco en algunos frames (sat 0.17) -> clamp de lightness del fondo.
- **transiciones**: cross-fade deja 2 titulos legibles a la vez en un frame muestreado (educ.ar/ESPN). Verificar en
  MP4 (puede ser artefacto de muestreo); si el overlap dura, achicar la ventana para escenas con titulo.
- **alma profunda**: rubros sin hogar (noticias/deportes-media/musica/viajes) caen en default/fitness/tech -> copy
  generico (ESPN=gym, Last.fm=SaaS, France24/Despegar=default). Mejor inferencia + pools de copy por sub-tipo de medio.

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
