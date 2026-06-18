# 🔌 URVID 1.0 — HANDOFF (cómo retomar con contexto completo)

> Leer ESTO primero al retomar. Estado al commit `adf105d` (jun 2026; 676 modulos: color + motion + typekit + markkit/datakit + transiciones + cerebro v2 + Olas 4/5/6 + PERCEPTION v3 URL->brief (1 llamada multimodal Sonnet 4.6 + brief rico + cache) + FLUIDEZ PULIDA en TODAS las libs (0 escenas congeladas) + POST (acabado) + estudio REDISENADO/responsive + PUENTE para que el asistente VEA los videos del estudio). Complementa: `docs/URVID-1.0-BLUEPRINT.md`
> (el mapa de bibliotecas) y `docs/ARBOL.md` (estado del motor VIEJO/Animaciones). El objetivo: el chat nuevo sigue
> haciendo EXACTAMENTE lo de ahora — llenar bibliotecas con módulos verificados + cablear uso — sin perder contexto.

## 0. Orientación (no perderse)
- Proyecto **Urvid** en `C:/Users/Usuario/Documents/cliping.ia` (la sesión ABRE en `...Desktop/Autoleads`, que NO es esto).
  Carpeta/Firebase/GitHub = `cliping.ia` (IDs reales, NO renombrar). Es Vite + React; el motor es Canvas-2D; MP4 final via Remotion.
- **NO se toca "Animaciones"** (`src/pages/Animaciones/`, `engineCore.js`) = motor VIEJO, intacto. urvid 1.0 vive aparte en `src/urvid/`.
- Git: commits ASCII imperativos + trailer `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`; `git fetch && git rebase origin/main` antes de push; nunca forzado.

## 1. Qué es urvid 1.0
Rearquitectura a un MAPA de bibliotecas de código categorizadas. Cada módulo = código PURO, PARAMETRIZADO, DETERMINISTA, TESTEADO.
El **director** (ensamblador) analiza la página y arma el video eligiendo un módulo de cada biblioteca (un rompecabezas).
Meta: **cientos** de módulos por categoría → cada video único → calidad "Canva o MEJOR que Canva".
Item de sidebar nuevo = **"urvid 1.0"** (`/studio/urvid`), con el almacén de videos en el mismo lugar.

## 2. Arquitectura actual (`src/urvid/`) — 676 módulos, anda de punta a punta
- **FLUIDEZ (PULIDA en todas las libs, commit adf105d)** (`core/motion.js` + `core/render.js` + `libs/motion/` + per-modulo en cada lib): DOS capas. (1) GLOBAL: cada escena tiene `motion.life` (0..1) que maneja un **ken-burns** (zoom lento <=3%, monotonico) y `motion.ambient` da respiracion/flote sutil. (2) PER-MODULO: las 73 escenas + 66 datakit + bg/sub/atm tenian elementos que entraban y se CONGELABAN -> ahora 0 congelados, 219 modulos con vida continua (deco respira/deriva/brilla via `t`; el TEXTO queda quieto/legible). Verificar movimiento con TIME-STRIPS (frames a lo largo de t), no un solo frame. REGLA permanente: todo modulo NUEVO con movimiento se pule para fluidez (ver memoria feedback-fluidity-motion-polish; bakear "pulir fluidez" al prompt de cada ola).
- **POST** (`core/post.js` + `libs/post/` = 14 finishes): el director elige un ACABADO (~58%) -> `video.postId`; `render.js` lo aplica ULTIMO sobre todo el cuadro (grano/vignette/leak/grade/scanlines/halacion/dust). Sutil (texto legible) + fluido.
- **PERCEPTION v3** (`backend/perception.py` + `POST /api/urvid/perceive` en `backend/main.py`): **UNA sola llamada multimodal a Sonnet 4.6** (texto curado `_page_digest` + screenshot juntos; antes eran 2 llamadas brand_dna+texto -> ahora mas barato y robusto). Devuelve brief RICO: brand/rubro/tone/brandColor/tagline/claim/cta + **bullets[]/stats[{value,label}]/proof/seriousness**. `_extract_json` tolerante, `_normalize` clampa, `max_tokens 750`, `BRIEF_MODEL="claude-sonnet-4-6"`. brandColor: lo elige el modelo (ve el screenshot) -> fallback themeColor/`_dominant_accent`. CACHE por URL: key versionada **`"v2-"`** + huella del contenido (in-memory `_urvid_brief_cache` + Firestore `users/{uid}/urvid_briefs`, 14d, flag `refresh`). La captura NO se dibuja en el video (decision del usuario); las fotos reales tampoco (NO photokit). El estudio pasa `userId`. SELECCION DE CONTENIDO: las escenas de lista/data/social usan los `bullets`/`stats`/`proof` REALES del brief (`listFrom/statAt/proofFrom` en scenes; datakit se excluye del pool de data si hay stats reales, porque fabrica numeros).
- **PUENTE "ver el video" (como el asistente VE lo que genera el usuario)**: el estudio tiene boton **"↗ Compartir con Claude"** -> `POST /api/urvid/share` (brief+seed+recipe) -> escribe `tools/urvid-shared.json` (ultimos 20). El asistente corre **`node tools/urvid1-shot.mjs`** -> regenera el video DETERMINISTA exacto -> contact-sheet `tools/out/urvid1-shared.png` (+ MP4) -> lo abre con Read. Asi "ve" el ultimo video del usuario sin que mande archivos. (Requiere que el backend `start.bat` este corriendo para que el boton Compartir funcione.)
- **core/**: `util.js` (math/color/fuentes/WCAG `contrast`/`legibleOn`), `prng.js` (`mulberry32`, `seedFor(seed,ns)`, `pick/range/weightedPick/shuffled`, `stableSeed`), `registry.js` (`register/registerAll/query(lib,{tone,rubro,category})/get/stats`), `palette.js` (`finalize(...)` + `tonedBg` + `derivePalette`; **onAccent por CONTRASTE real, no umbral de luminancia**), `text.js` (`drawText/drawWrapped/clip/wrap/fitFont` — **no-desborde horneado**), `fonts.js` (fallback), `motion.js` (`defaultMotion`/`resolveMotion` -> `env.motion`), `typekit.js` (`defaultTypekit`/`resolveTypekit` -> `env.typekit`), `transitions.js` (`defaultTransition`/`resolveTransition`), `strategy.js` (**cerebro v2**: `analyzeContent`/`buildArcSmart`/`sceneBias`), `assemble.js` (el **DIRECTOR**; `makeVideo` acepta brief ANIDADO o PLANO), `render.js` (**compositor** + transiciones).
- **libs/** (`index.js` importa todas) — 12 bibliotecas:
  | lib (carpeta) | registry `lib` | módulos |
  |---|---|---|
  | color | `color` | 141 (5 archivos por categoria + 6 en index.js) |
  | typography | `typography` | 23 |
  | backgrounds | `backgrounds` | 79 |
  | substrates | `substrates` | 83 |
  | atmosphere | `atmosphere` | 76 |
  | scenes | **`scene-layouts`** | 73 |
  | markkit | `markkit` | 87 |
  | datakit | `datakit` | 66 |
  | motion | `motion` | 12 (personalities -> `env.motion`; incl. `life`+`ambient` de fluidez) |
  | typekit | `typekit` | 6 (efectos de texto -> `env.typekit`) |
  | transitions | `transitions` | 16 (paso escena-a-escena -> `video.transitionId`) |
  | post | `post` | 14 (acabado/film-look -> `video.postId`, aplicado ULTIMO) |
  - El front hace `makeVideo(brief)` en el navegador. **`makeVideo` acepta el brief PLANO** (tagline/claim/cta sueltos) ademas del anidado -> el texto llega a las escenas y al cerebro.
  - OJO: la carpeta es `libs/scenes/` pero el `lib` del registro es `scene-layouts` (`query('scene-layouts')`). NO existe `libs/scene-layouts/`.
  - **MOTION**: director elige `motion.personality.*` -> `env.motion = { ease(monotonico), settle(overshoot), smooth, stagger, enter{dx,dy,scale,rotate}, enterDur, ambient }`. Las escenas usan `M.ease/M.settle`. `render.js` aplica `enter`+`ambient`. Default = feel previo.
  - **TYPEKIT**: director elige `typekit.effect.*` (~30% plain) -> `env.typekit` -> escenas dibujan el titulo via `TK.draw/TK.drawWrapped` con `opts.reveal`. A `reveal>=1` == `drawText` (no-desborde). Usado en 4 escenas; `TK` atado en todas -> deepen-ear = rutear mas titulos.
  - **TRANSITIONS**: director elige una por video -> `video.transitionId`. `render.js` ventana `[B.start, B.start+XF=0.5)`: la transicion compone A+B DIRECTO al ctx via clip/transform (callbacks `drawA/drawB`) -> nitido, SIN buffers (no necesita scene-buffering para wipes/slides/iris/bars/cut; dissolve/glitch/morph reales SI lo necesitarian -> pendiente).
  - **MARKKIT/DATAKIT en escenas**: datakit (charts full-frame) entra al pool de las escenas de DATA en `assemble.js` (un beat de data puede ser un chart). markkit = garnish de ICONO por rubro en una esquina (persistente, tenue, NUNCA blob centrado, ver regla [[feedback-no-morph-blobs]]); divisores/marcos quedan para composicion per-escena futura.
  - **CEREBRO v2** (`core/strategy.js`): `analyzeContent` saca señales del brief (numero/pregunta/lista/comparacion/prueba/claim-largo); `buildArcSmart` arma el arco desde esas señales; `sceneBias` sesga la escena hacia tags que matchean. El director ya NO arma el arco solo por azar.
- **index.js** (API): `makeVideo(brief)`, `drawFrame(ctx,t,video)`, `stats/query/get`, `W,H,FPS`.
- **Página**: `src/pages/Urvid1/Urvid1Studio.jsx` (+ `.module.css`) = input de URL + "✨ Analizar" (-> `/api/urvid/perceive`, manda `userId`) + brief editable (lleva bullets/stats/proof) + player en vivo (transport) + chips de la "carta"/recipe + "↗ Compartir con Claude" + "Mis videos" (localStorage). **REDISENADO** = consola oscura (violet-ink + degrade urvid #ff8a4c->#ff4f8b, chips mono) y **RESPONSIVE** (input `flex:1;min-width:0`, boton `flex:0 0 auto`; player `width:min(100%,410px)`; breakpoints 1240px->2col, 760px->1col). Ruta en `src/App.jsx` (`/studio/urvid`). Item en `src/components/Layout/Sidebar.jsx`. OJO: el estudio es DARK -> no meterlo en superficie clara (texto casi blanco sobre blanco).

### El DIRECTOR actual (`assemble.js` · `makeVideo(brief)`)
brief = `{ brand, rubro, tone:'dark'|'light', brandColor, content:{brand,tagline,claim,cta}, seed?, seriousness? }`.
1. `buildArc(seed)` → arco VARIADO: apertura (hook|hero) → 1-3 beats de cuerpo (statement/checklist/comparison/data/social) sin repetir → cierre. Distinto por semilla.
2. **CEREBRO v1 · seriedad**: `brief.seriousness` o default por rubro (salud .85, finanzas .8, … gastronomia .35). `wadj` sesga AWAY de tags "jugados" (y2k/cyber/glitch/vibrante/chrome/neon) cuando seriousness>0.62.
3. Elige (con `weightedPick`+`wadj`): **color** (`query('color')→mod.derive(...)→paleta`), **typography** (pairing), **background**, **substrate** (~65% opt), **atmosphere** (~55% opt), y una **escena** por beat.
4. Devuelve `{ palette, fonts, bgId/subId/atmId, scenes:[{start,dur,sceneId,seed}], duration, recipe }`. `recipe` = la "carta" del video.

## 3. EL CONTRATO de módulo (los agentes lo siguen — crítico)
- Firma `render(ctx, t, env)` (píxeles) | `derive(...)` (color) | dato (typography).
- `env = { pal, content{brand,tagline,claim,cta,bullets[],stats[{value,label}],proof}, fonts{display,text,accent}, seed:number, energy, sceneDur, motion, typekit }`. `t` = tiempo de escena (s). Las escenas usan `bullets/stats/proof` REALES via `listFrom/statAt/proofFrom` (en `libs/scenes/index.js`), y `M=env.motion`/`TK=env.typekit` para entrada/asentamiento/texto cinetico + vida continua (fluidez).
- **DETERMINISTA**: cero `Math.random`/`Date.now`. Azar estable = `mulberry32(env.seed)`/`seedFor`. Motion = `t`.
- **PARAMETRIZADO**: color de `env.pal.*` (nunca hardcodear), texto de `env.content.*` SIEMPRE via `core/text.js` (no se desborda), espacio 405×720.
- Regla de oro de color: **texto en tinta** (`pal.ink/inkText/dim/onAccent`), **acento solo para DECO** (barras/reglas/chips/chevrons).
- `register({ id:'<lib>.<categoria>.<nombre>', lib, category, tones:['dark'|'light'], rubros:['*'|...], weight, tags, render })`. tones/rubros HONESTOS (verificados).
- **color**: `derive(brandColor,{tone,rubro,seed}) → finalize(accent,accent2,bg0,bg1,tone)` (ver `libs/color/index.js`).
- **typography**: dato `{ id, lib:'typography', category:'pairings', tones, rubros, weight, tags, fonts:{display,text,accent} }`.
- Plantillas a copiar: `libs/backgrounds/index.js` (píxeles), `libs/color/index.js` (color), `libs/typography/index.js` (type).

## 4. Verificar (comandos)
- `node tools/urvid1-test.mjs` → arma un video, contact-sheet (`tools/out/urvid1-demo.png`), MP4 (`urvid1-demo.mp4`) + chequeo de **DETERMINISMO**.
- `node tools/urvid1-shot.mjs` → **PUENTE para VER el video del usuario**: lee `tools/urvid-shared.json` (lo que mando con "Compartir con Claude") o un brief inline -> regenera el video exacto -> contact-sheet `tools/out/urvid1-shared.png` (+ MP4). Abrir el PNG con Read. (Para movimiento, mejor pedir un MP4 / time-strip que un solo frame.)
- `node tools/urvid1-variety.mjs` → 9 semillas → galería de unicidad (`tools/out/urvid1-variety.png`).
- `node tools/urvid1-color-check.mjs` → **GATE de color**: TODA la lib x tono x 8 marcas (roles + determinismo + WCAG ink/bg>=4.5, inkText>=3, onAccent>=3). 1672 combos.
- `node tools/urvid1-motion-check.mjs` → **GATE de motion**: contrato de cada personalidad (ease/smooth monotonicos en [0,1], settle acotado en bordes, determinismo).
- `node tools/_fill/typekit-check.mjs` → verifica typekit: identidad a reveal=1 (== drawText) + contact-sheet por efecto x reveal (`tools/out/fill-typekit.png`). (gitignored)
- `npx vite build` → compila la app.
- (motor viejo, NO mezclar): `node tools/bounds-check.mjs`, `node tools/legibility-check.mjs`, `node tools/bg-check.mjs`.

## 5. Cómo se LLENAN las bibliotecas (el patrón probado — repetir)
Workflow con **un agente por biblioteca**. Cada agente:
1. LEE su archivo (`src/urvid/libs/<LIB>/index.js`; scenes = `libs/scenes/index.js`) para NO duplicar ids; lee `core/util.js`, `core/text.js`, `core/prng.js`, `core/registry.js` + su sección del blueprint.
2. AGREGA al final 10-16 módulos siguiendo el contrato/plantilla (preserva todo; NO toca `libs/index.js` ni otros archivos).
3. VERIFICA: escribe `tools/_fill/<LIB>N.mjs` (con `@napi-rs/canvas` + `GlobalFonts.loadFontsFromDir('tools/fonts')`), registra su archivo, renderiza cada módulo nuevo (dark/light según tones), chequea **determinismo** (mismo frame 2 veces = buffers idénticos) + sin error, arma contact-sheet `tools/out/fill-<LIB>-wN.png`, lo **abre con Read y descarta/arregla** los rotos/feos/ilegibles.
4. Reporta `{lib, modules_added, determinism_ok, rendered_ok, discarded, notes}`.
El **orquestador** (vos) integra: si es lib nueva agrega su import a `libs/index.js`; corre `urvid1-test` + `vite build`; re-renderiza variety; commitea. Cada lib es DUEÑA de su carpeta → sin conflictos entre agentes.
Olas hechas: Ola 1 (+96), Ola 2 (+85), Ola 3 (+107; COLOR falló), Ola 4 (color 6→141), Ola 5 (+89: bg/sub/atm/markkit/datakit/scenes). Cada ola ~570-810k tokens de subagentes.

## 6. PENDIENTE — el "todo" que falta (en orden recomendado)
1. **[HECHO]** Opción A completa: **color** 6→141 (Ola 4 + fix de raiz `finalize` onAccent-por-contraste + gate), **motion** (12 personalities, cableado, gate), **typekit** (6 efectos, cableado), **markkit/datakit en escenas** (datakit al pool de data; garnish de icono por rubro).
2. **[HECHO]** **transitions/** (16, clip/transform directo). **cerebro v2** (`strategy.js`: arco/escenas desde el contenido). **Olas 5 y 6** (+184 modulos: 309->662).
3. **[HECHO] perception v3 (URL -> brief)** — `backend/perception.py` + `POST /api/urvid/perceive` + UI en el estudio. Cierra el ciclo "pego URL -> sale el video". **1 sola llamada multimodal a Sonnet 4.6** (texto curado + screenshot); brief RICO (bullets/stats/proof/seriousness); **cache por URL** versionada `v2-` (in-memory + Firestore `urvid_briefs`, invalida por huella/14d). Las escenas USAN el contenido real (bullets/stats/proof). Verificado en vivo (Yerco -> "600" real, bullets/CTA reales). DECISIONES DEL USUARIO: la captura NO se dibuja en el video (nada de fotos reales -> NO photokit); el tono/voz del prompt `_SYS` se afina al FINAL (junto con audio).
4. **[HECHO] FLUIDEZ — pulida en TODAS las libs** (commit adf105d): global (motion `life`/ken-burns + `ambient`) + per-modulo (219 modulos; baseline tenia 71/73 escenas + 66/66 datakit + decenas de bg/sub/atm CONGELADAS tras entrar -> ahora 0 congeladas, vida continua via `t`, texto intacto). REGLA permanente: todo modulo NUEVO con movimiento se pule para fluidez (bakear al prompt de las olas). Verificar con time-strips.
5. **[HECHO] POST** (`libs/post/` = 14 finishes: grano/vignette/leak/grade/scanlines/halacion/dust, aplicado ULTIMO; sutil + fluido).
6. **Más olas** hacia *cientos* por categoría (workflow §5; varias libs en 70-90; color 141; contrato fijo por lib — sumar la regla de FLUIDEZ al prompt). Deepen-ear typekit.
7. **scene-buffering -> transiciones REALES de imagen** (dissolve verdadero/glitch/morph): hoy clip/transform; requiere OffscreenCanvas (factory cross-env). Solo si se quieren esas familias.
8. **Sin empezar** (blueprint): `composition` (solver de layout), `narrative`, `brand-kit`, **captions animados** (pega fuerte pero acompaña audio/VO). NO photokit (decision del usuario).
9. **audio** — **DEJADO PARA EL FINAL por decisión del usuario.** (Gap #1, va ultimo; el tono/voz del prompt de perception se afina junto con esto.)

## 7. Próximo paso (continuá EXACTO por acá)
Opción A + transiciones + cerebro v2 + Olas 4/5/6 + **perception v3** + **FLUIDEZ pulida en todas las libs** + **POST** + **estudio rediseñado/responsive** + **puente para ver videos** = HECHO (676 modulos, engine feature-complete + URL->video cerrado + acabado + movimiento fluido; todo verificado). **NO arrancar feature nueva sin confirmar con el usuario tras el /clear.** Próximos (bajo riesgo, elegir cuando lo pida): **(a) más olas** hacia cientos (workflow §5, sumar "pulir fluidez" al prompt); **(b) scene-buffering** para dissolve/glitch reales; **(c) composition/narrative/brand-kit**; **(d) deepen-ear typekit** (rutear mas titulos). **Audio + voz del prompt de perception = al FINAL** (decision del usuario). **NO** dibujar la captura/fotos reales en el video (decision del usuario).
Método: para más MÓDULOS → workflow de agentes (sección 5, corre bien en background). Para CABLEADO → orquestador inline.
**Probar EN VIVO (lo que el usuario hace ahora):** el front (engine + fluidez + estudio) auto-deploya en Vercel desde main; el **backend es LOCAL** -> hay que **reiniciar `start.bat`** (backend :8000 + ngrok) para que tomen perception v3 + `/api/urvid/share`. Luego: estudio -> pegar URL -> Analizar -> generar -> "↗ Compartir con Claude". El asistente ve el resultado con `node tools/urvid1-shot.mjs`.

## 8. Reglas duras (gates que nada viola)
1. No tocar Animaciones. 2. Determinismo (cero Math.random/Date.now; verificar con el determinism check). 3. Texto SIEMPRE via `core/text.js` (no-desborde). 4. Texto en tinta, acento en deco. 5. tones/rubros honestos. 6. Cada lib dueña de su carpeta; los agentes NO tocan `libs/index.js` ni `core/`. 7. Git: ASCII + trailer + rebase antes de push.

## 9. Historia de la sesión (qué se hizo)
- **Antes de urvid 1.0** (motor VIEJO/Animaciones): auditoría de 9 páginas reales + fixes (clasificador ES, force_hero, sello de partículas legible/early-start) + GATES nuevos (`bounds-check` texto-fuera-de-cuadro, `legibility-check` cuerpo-only) + método de análisis de video (`render.mjs motionmap/trail/mp4`, `docs/ANALISIS-VIDEO.md`) + fix SISTÉMICO de desborde de texto (clip/fitWrap + torture-fixture) + inventario (`docs/INVENTARIO-ELEMENTOS.md`). Todo en `docs/ARBOL.md`.
- **urvid 1.0**: blueprint (workflow de investigación, 8 dims) → fundación (core + rebanada vertical) → Ola 1 (96) → arco variado → Ola 2 (+85) → color/typography/cerebro-v1 → Ola 3 (+107) = 309 módulos.
- **Ola 4 + cableado completo + perception** (chat jun 2026): color 6→141 (workflow 5 agentes + fix RAIZ `finalize` onAccent-por-contraste + gate). MOTION (12 personalities, `core/motion.js`, 44 escenas usan `M.ease/M.settle`, gate). TYPEKIT (6 efectos, `core/typekit.js`, identidad a reveal=1). MARKKIT/DATAKIT en escenas. TRANSICIONES (16, clip/transform). CEREBRO v2 (`core/strategy.js`, 40/40 verificado). Olas 5 y 6 (+184: bg/sub/atm/markkit/datakit/scenes). PERCEPTION v2 (brand_dna + cache + `/api/urvid/perceive` + UI; fix: `makeVideo` acepta brief plano). FLUIDEZ global (`life`/ken-burns + ambient). POST (`libs/post/` 14 finishes). **309 → 676 módulos.** Determinismo + gates + vite build (+ py_compile) OK en CADA fase. Hasta commit `ae2fac7`.
- **Cierre del chat (jun 2026, hasta `adf105d`)**: PERCEPTION v3 (de 2 llamadas a **1 multimodal Sonnet 4.6** + brief rico bullets/stats/proof + seleccion de contenido real en escenas + cache versionada `v2-`; verificado en vivo con Yerco) [4a0e5fb, 8bcef80]. ESTUDIO rediseñado (consola oscura) [765ffab] + responsive (no se rompe al achicar) [8746c59]. PUENTE "ver el video" (boton Compartir + `/api/urvid/share` + `tools/urvid1-shot.mjs`) [bf8b769]. FLUIDEZ reforzada global [4b22974] + **pulida per-modulo en TODAS las libs** (workflow 6 agentes; 219 modulos; 0 congelados) [adf105d]. Handoff + memoria actualizados. **676 modulos, 12 libs, engine feature-complete.**
