# 🔌 URVID 1.0 — HANDOFF (cómo retomar con contexto completo)

> Leer ESTO primero al retomar. Estado al commit `994e9bd` (jun 2026; Ola 4 color + motion + typekit cableados). Complementa: `docs/URVID-1.0-BLUEPRINT.md`
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

## 2. Arquitectura actual (`src/urvid/`) — 462 módulos, anda de punta a punta
- **core/**: `util.js` (math/color/fuentes/WCAG `contrast`/`legibleOn`), `prng.js` (`mulberry32`, `seedFor(seed,ns)`, `pick/range/weightedPick/shuffled`, `stableSeed`), `registry.js` (`register/registerAll/query(lib,{tone,rubro,category})/get/stats`), `palette.js` (`finalize(accent,accent2,bg0,bg1,tone)` + `tonedBg` + `derivePalette`; **onAccent por CONTRASTE real, no umbral de luminancia**), `text.js` (`drawText/drawWrapped/clip/wrap/fitFont` — **no-desborde horneado**), `fonts.js` (fallback), `motion.js` (`defaultMotion`/`resolveMotion` -> `env.motion`), `typekit.js` (`defaultTypekit`/`resolveTypekit` -> `env.typekit`), `assemble.js` (el **DIRECTOR**), `render.js` (**compositor**: bg → substrate → atmosphere → contenido encima; aplica la entrada de `env.motion` por escena + drift ambiente).
- **libs/** (`index.js` importa todas) — 10 bibliotecas:
  | lib (carpeta) | registry `lib` | módulos |
  |---|---|---|
  | color | `color` | 141 (harmony 32 / mood-grading 27 / named-palettes 34 / tone-systems 26 / color-temperature 22) |
  | typography | `typography` | 24 |
  | backgrounds | `backgrounds` | 49 |
  | substrates | `substrates` | 51 |
  | atmosphere | `atmosphere` | 45 |
  | scenes | **`scene-layouts`** | 44 |
  | markkit | `markkit` | 53 |
  | datakit | `datakit` | 38 |
  | motion | `motion` | 12 (personalities; el director elige una -> `env.motion`) |
  | typekit | `typekit` | 6 (efectos de texto; el director elige uno -> `env.typekit`) |
  - OJO: la carpeta es `libs/scenes/` pero el `lib` del registro es `scene-layouts` (`query('scene-layouts')`). NO existe `libs/scene-layouts/`.
  - color = 5 archivos por categoria (`harmony.js`/`grade.js`/`named.js`/`tone.js`/`temp.js`) + los 6 originales en `index.js`. Cada `derive()` termina en `finalize()`.
  - **MOTION cableado**: el director elige `motion.personality.*` -> `video.motionId` -> `env.motion = { ease(monotonico), settle(overshoot), smooth, stagger, enter{dx,dy,scale,rotate}, enterDur, ambient }`. Las 44 escenas usan `M.ease/M.settle` (ya NO eases hardcodeados). `render.js` aplica `enter`+`ambient` por escena. Default (`core/motion.js`) = feel previo.
  - **TYPEKIT cableado**: el director elige `typekit.effect.*` (~30% plain) -> `env.typekit` -> las escenas dibujan el titulo via `TK.draw/TK.drawWrapped` con `opts.reveal` (su progreso de entrada). A `reveal>=1` == `drawText` (no-desborde + estado final limpio). HOY usado en 4 escenas (hook.question, statement.boxed/panel, social.proof); `TK` YA esta atado en las 44 -> deepen-ear = rutear mas titulos por `TK` con su `reveal`.
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
Olas hechas: Ola 1 (+96, las 6 de píxeles), Ola 2 (+85), Ola 3 (+107; el agente de COLOR falló). Cada ola ~570-810k tokens de subagentes.

## 6. PENDIENTE — el "todo" que falta (en orden recomendado)
1. **[HECHO · Ola 4]** **color** 6 → 141 (5 archivos por categoria + fix de raiz en `finalize()` onAccent-por-contraste + gate `urvid1-color-check`). El agente de Ola 3 fallaba por la "banda muerta" de `finalize` (onAccent por umbral de luminancia HSL); resuelto en core.
2. **[HECHO]** **motion/** (12 personalities) + **cablear uso** (director → `env.motion`; 44 escenas usan `M.ease/M.settle`; `render.js` entrada+ambient) + gate `urvid1-motion-check`.
3. **[HECHO]** **typekit/** (6 efectos) + **cablear uso** (director → `env.typekit`; 4 escenas rutean el titulo por `TK`, las 44 ya tienen `TK` atado). Garantia no-desborde + identidad a reveal=1.
4. **[PROXIMO] markkit/datakit USADOS por las escenas** — hoy registrados (53/38) pero las escenas casi no los componen. Plan: el director asigna por escena un **mark decorativo** (de un subconjunto SEGURO: divisores/marcos/chevrons/sparkles/iconos — **NUNCA un blob centrado detras del titulo**, ver regla del usuario) en un slot de borde/esquina; y las escenas de data (`data/single`, `data/multi`) componen modulos de **datakit** (barras/anillos/numeros) en vez de su dibujo inline. Hacerlo INLINE (toca scenes/assemble/render), verificar con contact-sheet. Tambien: **deepen-ear typekit** (rutear mas titulos por `TK`) y **más olas** de color/typography/bg/etc hacia *cientos* (workflow por lib).
5. **transitions/** — requiere PRIMERO el motor de **SCENE-BUFFERING** (renderizar escena saliente + entrante en OffscreenCanvas separados y componer; hoy `render.js` solo hace cross-fade de alpha). Después llenar familias (cuts/wipes/slides/dissolves/glitch/whips/morph/matchcut/framing).
6. **Cerebro completo** — `perception` (análisis REAL de la página: marca/colores/fotos/mensaje/PÚBLICO/seriedad desde la URL — pieza de PRODUCCIÓN, engancha con `backend/`) + `strategy`/`director`/`critique`/`audience` más listos. Hoy el director es esqueleto con sesgo de seriedad + elige color/type/motion/typekit/bg/sub/atm/escenas.
7. **Sin empezar** (blueprint): `composition` (solver de layout — hoy coords hardcodeadas en cada escena), `photokit` (necesita imágenes reales), `narrative`, `brand-kit`, `post.*` (grade/fx/overlays/**captions animados** = gap grande/format).
8. **audio** — **DEJADO PARA EL FINAL por decisión del usuario.** (Gap #1 competitivo, pero va último.)

## 7. Próximo paso (continuá EXACTO por acá)
Opción A: (1) color [HECHO], (2) motion + typekit [HECHO]. **SIGUE (3): que las escenas usen markkit/datakit** (ver §6.4: marks decorativos en slots de borde — NUNCA blob detras del titulo — + datakit en las escenas de data). Es CABLEADO → inline (toca scenes/assemble/render). Después (4) **scene-buffering + transitions**, luego (5) el **cerebro/análisis real**. Audio al final.
Método: para más MÓDULOS → workflow de agentes (sección 5). Para CABLEADO de uso (markkit/datakit/transitions/cerebro) → lo hace el orquestador inline (NO en paralelo con un workflow que toque los mismos archivos).
Ideas rápidas de bajo riesgo para retomar: deepen-ear typekit (rutear los titulos de hero/statement/outro restantes por `TK` con su `reveal`); más personalidades de motion / efectos de typekit (workflow por lib, contrato ya fijado); olas de color/typography hacia cientos.

## 8. Reglas duras (gates que nada viola)
1. No tocar Animaciones. 2. Determinismo (cero Math.random/Date.now; verificar con el determinism check). 3. Texto SIEMPRE via `core/text.js` (no-desborde). 4. Texto en tinta, acento en deco. 5. tones/rubros honestos. 6. Cada lib dueña de su carpeta; los agentes NO tocan `libs/index.js` ni `core/`. 7. Git: ASCII + trailer + rebase antes de push.

## 9. Historia de la sesión (qué se hizo)
- **Antes de urvid 1.0** (motor VIEJO/Animaciones): auditoría de 9 páginas reales + fixes (clasificador ES, force_hero, sello de partículas legible/early-start) + GATES nuevos (`bounds-check` texto-fuera-de-cuadro, `legibility-check` cuerpo-only) + método de análisis de video (`render.mjs motionmap/trail/mp4`, `docs/ANALISIS-VIDEO.md`) + fix SISTÉMICO de desborde de texto (clip/fitWrap + torture-fixture) + inventario (`docs/INVENTARIO-ELEMENTOS.md`). Todo en `docs/ARBOL.md`.
- **urvid 1.0**: blueprint (workflow de investigación, 8 dims) → fundación (core + rebanada vertical) → Ola 1 (96) → arco variado → Ola 2 (+85) → color/typography/cerebro-v1 → Ola 3 (+107) = 309 módulos.
- **Ola 4 + cableado** (este chat): color 6 → 141 (workflow de 5 agentes, uno por categoria; cada uno descubrio y esquivo la "banda muerta" de `finalize`; fix de RAIZ en `core/palette.js` -> onAccent por contraste; gate `urvid1-color-check`). Cableado MOTION (12 personalities, `core/motion.js`, director+render+44 escenas, gate `urvid1-motion-check`). Cableado TYPEKIT (6 efectos, `core/typekit.js`, director+render, 4 escenas + `TK` atado en las 44; verificado identidad a reveal=1). **= 462 módulos**. Determinismo + vite build OK en cada fase. Commits: a34aaa4 (finalize), 3654e74 (color), 41656c1 (motion), 994e9bd (typekit).
