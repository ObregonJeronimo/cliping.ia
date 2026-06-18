# 🔌 URVID 1.0 — HANDOFF (cómo retomar con contexto completo)

> Leer ESTO primero al retomar. Estado al commit `79e22ea` (jun 2026; 662 modulos: Ola 4 color + motion + typekit + markkit/datakit + transiciones + cerebro v2 + Olas 5/6 + PERCEPTION URL->brief). Complementa: `docs/URVID-1.0-BLUEPRINT.md`
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

## 2. Arquitectura actual (`src/urvid/`) — 662 módulos, anda de punta a punta
- **core/**: `util.js` (math/color/fuentes/WCAG `contrast`/`legibleOn`), `prng.js` (`mulberry32`, `seedFor(seed,ns)`, `pick/range/weightedPick/shuffled`, `stableSeed`), `registry.js` (`register/registerAll/query(lib,{tone,rubro,category})/get/stats`), `palette.js` (`finalize(...)` + `tonedBg` + `derivePalette`; **onAccent por CONTRASTE real, no umbral de luminancia**), `text.js` (`drawText/drawWrapped/clip/wrap/fitFont` — **no-desborde horneado**), `fonts.js` (fallback), `motion.js` (`defaultMotion`/`resolveMotion` -> `env.motion`), `typekit.js` (`defaultTypekit`/`resolveTypekit` -> `env.typekit`), `transitions.js` (`defaultTransition`/`resolveTransition`), `strategy.js` (**cerebro v2**: `analyzeContent`/`buildArcSmart`/`sceneBias`), `assemble.js` (el **DIRECTOR**; `makeVideo` acepta brief ANIDADO o PLANO), `render.js` (**compositor** + transiciones).
- **libs/** (`index.js` importa todas) — 11 bibliotecas:
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
  | motion | `motion` | 12 (personalities -> `env.motion`) |
  | typekit | `typekit` | 6 (efectos de texto -> `env.typekit`) |
  | transitions | `transitions` | 16 (paso escena-a-escena -> `video.transitionId`) |
- **PERCEPTION (URL -> brief)**: `backend/perception.py` (`analyze_to_brief`) + endpoint `POST /api/urvid/perceive` (FastAPI, :8000). Usa `site_capture.capture_all` (texto+screenshot) + Claude (Sonnet 4.6, JSON tolerante) -> brief `{brand,rubro,tone,brandColor,tagline,claim,cta,seriousness}`; brandColor del theme-color o color dominante del screenshot. El estudio `Urvid1Studio.jsx` tiene input de URL + boton Analizar (`API_URL`/`localhost:8000`). El front hace `makeVideo(brief)` en el navegador. **`makeVideo` acepta el brief PLANO** (tagline/claim/cta sueltos) ademas del anidado -> el texto llega a las escenas y al cerebro.
  - OJO: la carpeta es `libs/scenes/` pero el `lib` del registro es `scene-layouts` (`query('scene-layouts')`). NO existe `libs/scene-layouts/`.
  - **MOTION**: director elige `motion.personality.*` -> `env.motion = { ease(monotonico), settle(overshoot), smooth, stagger, enter{dx,dy,scale,rotate}, enterDur, ambient }`. Las escenas usan `M.ease/M.settle`. `render.js` aplica `enter`+`ambient`. Default = feel previo.
  - **TYPEKIT**: director elige `typekit.effect.*` (~30% plain) -> `env.typekit` -> escenas dibujan el titulo via `TK.draw/TK.drawWrapped` con `opts.reveal`. A `reveal>=1` == `drawText` (no-desborde). Usado en 4 escenas; `TK` atado en todas -> deepen-ear = rutear mas titulos.
  - **TRANSITIONS**: director elige una por video -> `video.transitionId`. `render.js` ventana `[B.start, B.start+XF=0.5)`: la transicion compone A+B DIRECTO al ctx via clip/transform (callbacks `drawA/drawB`) -> nitido, SIN buffers (no necesita scene-buffering para wipes/slides/iris/bars/cut; dissolve/glitch/morph reales SI lo necesitarian -> pendiente).
  - **MARKKIT/DATAKIT en escenas**: datakit (charts full-frame) entra al pool de las escenas de DATA en `assemble.js` (un beat de data puede ser un chart). markkit = garnish de ICONO por rubro en una esquina (persistente, tenue, NUNCA blob centrado, ver regla [[feedback-no-morph-blobs]]); divisores/marcos quedan para composicion per-escena futura.
  - **CEREBRO v2** (`core/strategy.js`): `analyzeContent` saca señales del brief (numero/pregunta/lista/comparacion/prueba/claim-largo); `buildArcSmart` arma el arco desde esas señales; `sceneBias` sesga la escena hacia tags que matchean. El director ya NO arma el arco solo por azar.
- **index.js** (API): `makeVideo(brief)`, `drawFrame(ctx,t,video)`, `stats/query/get`, `W,H,FPS`.
- **Página**: `src/pages/Urvid1/Urvid1Studio.jsx` (+ `.module.css`) = brief + player en vivo (transport) + "Mis videos" (localStorage). Ruta en `src/App.jsx` (`/studio/urvid`). Item en `src/components/Layout/Sidebar.jsx`.

### El DIRECTOR actual (`assemble.js` · `makeVideo(brief)`)
brief = `{ brand, rubro, tone:'dark'|'light', brandColor, content:{brand,tagline,claim,cta}, seed?, seriousness? }`.
1. `buildArc(seed)` → arco VARIADO: apertura (hook|hero) → 1-3 beats de cuerpo (statement/checklist/comparison/data/social) sin repetir → cierre. Distinto por semilla.
2. **CEREBRO v1 · seriedad**: `brief.seriousness` o default por rubro (salud .85, finanzas .8, … gastronomia .35). `wadj` sesga AWAY de tags "jugados" (y2k/cyber/glitch/vibrante/chrome/neon) cuando seriousness>0.62.
3. Elige (con `weightedPick`+`wadj`): **color** (`query('color')→mod.derive(...)→paleta`), **typography** (pairing), **background**, **substrate** (~65% opt), **atmosphere** (~55% opt), y una **escena** por beat.
4. Devuelve `{ palette, fonts, bgId/subId/atmId, scenes:[{start,dur,sceneId,seed}], duration, recipe }`. `recipe` = la "carta" del video.

## 3. EL CONTRATO de módulo (los agentes lo siguen — crítico)
- Firma `render(ctx, t, env)` (píxeles) | `derive(...)` (color) | dato (typography).
- `env = { pal, content{brand,tagline,claim,cta}, fonts{display,text,accent}, seed:number, energy }`. `t` = tiempo de escena (s).
- **DETERMINISTA**: cero `Math.random`/`Date.now`. Azar estable = `mulberry32(env.seed)`/`seedFor`. Motion = `t`.
- **PARAMETRIZADO**: color de `env.pal.*` (nunca hardcodear), texto de `env.content.*` SIEMPRE via `core/text.js` (no se desborda), espacio 405×720.
- Regla de oro de color: **texto en tinta** (`pal.ink/inkText/dim/onAccent`), **acento solo para DECO** (barras/reglas/chips/chevrons).
- `register({ id:'<lib>.<categoria>.<nombre>', lib, category, tones:['dark'|'light'], rubros:['*'|...], weight, tags, render })`. tones/rubros HONESTOS (verificados).
- **color**: `derive(brandColor,{tone,rubro,seed}) → finalize(accent,accent2,bg0,bg1,tone)` (ver `libs/color/index.js`).
- **typography**: dato `{ id, lib:'typography', category:'pairings', tones, rubros, weight, tags, fonts:{display,text,accent} }`.
- Plantillas a copiar: `libs/backgrounds/index.js` (píxeles), `libs/color/index.js` (color), `libs/typography/index.js` (type).

## 4. Verificar (comandos)
- `node tools/urvid1-test.mjs` → arma un video, contact-sheet (`tools/out/urvid1-demo.png`), MP4 (`urvid1-demo.mp4`) + chequeo de **DETERMINISMO**.
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
3. **[HECHO] perception (URL -> brief)** — `backend/perception.py` + `POST /api/urvid/perceive` + UI en el estudio. Cierra el ciclo "pego una URL -> sale el video". PENDIENTE de afinar: el PROMPT del brief (tono/voz/que prioriza — `_SYS` en perception.py); `photokit` puede usar las `images`/`logo` que ya captura `site_capture` (hoy se devuelven en `source` pero el motor aun no las dibuja); cachear el analisis por URL (como el motor viejo) para no re-llamar a Claude.
4. **Más olas** hacia *cientos* por categoría (workflow §5; varias libs ya en 70-90; color 141; el contrato de CADA lib —incluidas motion/typekit/transitions— ya esta fijado). Deepen-ear typekit (rutear mas titulos por `TK`).
5. **scene-buffering -> transiciones REALES de imagen** (dissolve verdadero/glitch/morph): hoy clip/transform; para esas familias hace falta renderizar A y B a OffscreenCanvas (factory cross-env browser/Node). Solo si se quieren esas familias.
6. **Sin empezar** (blueprint): `composition` (solver de layout — hoy coords hardcodeadas), `photokit` (foto real: las imagenes ya las captura perception), `narrative`, `brand-kit`, `post.*` (grade/fx/overlays/**captions animados** — pega fuerte, acompaña audio/VO).
7. **audio** — **DEJADO PARA EL FINAL por decisión del usuario.** (Gap #1 competitivo, pero va último.)

## 7. Próximo paso (continuá EXACTO por acá)
Opción A + transiciones + cerebro v2 + Olas 5/6 + **perception** = HECHO (662 modulos, engine feature-complete + el ciclo URL->video cerrado y verificado). Próximos (bajo riesgo, elegir): **(a) afinar perception** (prompt `_SYS`, cache por URL, usar `images`/`logo` -> photokit); **(b) más olas** hacia cientos (workflow §5, contrato fijo por lib); **(c) post.\*** (grade/fx/captions); **(d) scene-buffering** para dissolve/glitch reales. Audio al final.
Método: para más MÓDULOS → workflow de agentes (sección 5, corre bien en background). Para CABLEADO de uso (perception/composition/post) → orquestador inline. Probar perception EN VIVO: `start.bat` (backend :8000) -> estudio -> pegar URL -> Analizar.

## 8. Reglas duras (gates que nada viola)
1. No tocar Animaciones. 2. Determinismo (cero Math.random/Date.now; verificar con el determinism check). 3. Texto SIEMPRE via `core/text.js` (no-desborde). 4. Texto en tinta, acento en deco. 5. tones/rubros honestos. 6. Cada lib dueña de su carpeta; los agentes NO tocan `libs/index.js` ni `core/`. 7. Git: ASCII + trailer + rebase antes de push.

## 9. Historia de la sesión (qué se hizo)
- **Antes de urvid 1.0** (motor VIEJO/Animaciones): auditoría de 9 páginas reales + fixes (clasificador ES, force_hero, sello de partículas legible/early-start) + GATES nuevos (`bounds-check` texto-fuera-de-cuadro, `legibility-check` cuerpo-only) + método de análisis de video (`render.mjs motionmap/trail/mp4`, `docs/ANALISIS-VIDEO.md`) + fix SISTÉMICO de desborde de texto (clip/fitWrap + torture-fixture) + inventario (`docs/INVENTARIO-ELEMENTOS.md`). Todo en `docs/ARBOL.md`.
- **urvid 1.0**: blueprint (workflow de investigación, 8 dims) → fundación (core + rebanada vertical) → Ola 1 (96) → arco variado → Ola 2 (+85) → color/typography/cerebro-v1 → Ola 3 (+107) = 309 módulos.
- **Ola 4 + cableado completo + perception** (chat jun 2026): color 6→141 (workflow 5 agentes + fix RAIZ `finalize` onAccent-por-contraste + gate). MOTION (12 personalities, `core/motion.js`, 44 escenas usan `M.ease/M.settle`, gate). TYPEKIT (6 efectos, `core/typekit.js`, identidad a reveal=1). MARKKIT/DATAKIT en escenas. TRANSICIONES (16, clip/transform). CEREBRO v2 (`core/strategy.js`, 40/40 verificado). Olas 5 y 6 (+184: bg/sub/atm/markkit/datakit/scenes). PERCEPTION (`backend/perception.py` + `/api/urvid/perceive` + UI en el estudio; fix: `makeVideo` acepta brief plano). **309 → 662 módulos.** Determinismo + gates + vite build (+ py_compile) OK en CADA fase. Commits: a34aaa4, 3654e74, 41656c1, 994e9bd, 7b094ab, 90cf96d, 5ff23dd, 6e77c94, b80bf6f, 6008c8d, 79e22ea.
