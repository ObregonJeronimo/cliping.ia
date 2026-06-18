# 🔌 URVID 1.0 — HANDOFF (cómo retomar con contexto completo)

> Leer ESTO primero al retomar. Estado al commit `7723d57` (jun 2026). Complementa: `docs/URVID-1.0-BLUEPRINT.md`
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

## 2. Arquitectura actual (`src/urvid/`) — 309 módulos, anda de punta a punta
- **core/**: `util.js` (math/color/fuentes/WCAG `contrast`/`legibleOn`), `prng.js` (`mulberry32`, `seedFor(seed,ns)`, `pick/range/weightedPick/shuffled`, `stableSeed`), `registry.js` (`register/registerAll/query(lib,{tone,rubro,category})/get/stats`), `palette.js` (`finalize(accent,accent2,bg0,bg1,tone)` + `tonedBg` + `derivePalette`), `text.js` (`drawText/drawWrapped/clip/wrap/fitFont` — **no-desborde horneado**), `fonts.js` (fallback), `assemble.js` (el **DIRECTOR**), `render.js` (**compositor**: bg → substrate → atmosphere → contenido encima).
- **libs/** (`index.js` importa todas) — 8 bibliotecas:
  | lib (carpeta) | registry `lib` | módulos |
  |---|---|---|
  | color | `color` | 6 |
  | typography | `typography` | 24 |
  | backgrounds | `backgrounds` | 49 |
  | substrates | `substrates` | 51 |
  | atmosphere | `atmosphere` | 45 |
  | scenes | **`scene-layouts`** | 44 |
  | markkit | `markkit` | 53 |
  | datakit | `datakit` | 38 |
  - OJO: la carpeta es `libs/scenes/` pero el `lib` del registro es `scene-layouts` (`query('scene-layouts')`). NO existe `libs/scene-layouts/`.
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
1. **color** — el agente de Ola 3 falló (le costó el contrato `derive()`); quedó en 6 esquemas. **Reintentar/expandir** a cientos (harmony-schemes analogo/triada/tetrada/accented-neutral, mood-grading, **named-palettes** curadas tipo Coolors taggeadas, tone-systems, temperature). Es la lib más chica → prioridad para igualar.
2. **Más olas** de las 8 libs → hacia *cientos* por categoría.
3. **motion/** (NUEVA) — easings/choreography/physics + **cablear uso**: el director elige una "personalidad de motion" → `env.motion` → las escenas la usan en sus entradas (hoy hardcodean eases). Cambia el *feel*. (Editar `assemble.js`/`render.js`/`scenes` — hacerlo cuando NO corra un workflow que toque scenes.)
4. **typekit/** (NUEVA) — efectos de texto (entrada por letra, draw-on, highlight, count-up) que las escenas usan.
5. **markkit/datakit USADOS por las escenas** — hoy registrados pero las escenas casi no los componen → que compongan formas/charts.
6. **transitions/** — requiere PRIMERO el motor de **SCENE-BUFFERING** (renderizar escena saliente + entrante en OffscreenCanvas separados y componer; hoy `render.js` solo hace cross-fade de alpha). Después llenar familias (cuts/wipes/slides/dissolves/glitch/whips/morph/matchcut/framing).
7. **Cerebro completo** — `perception` (análisis REAL de la página: marca/colores/fotos/mensaje/PÚBLICO/seriedad desde la URL — pieza de PRODUCCIÓN, engancha con `backend/`) + `strategy`/`director`/`critique`/`audience` más listos. Hoy el director es esqueleto con sesgo de seriedad.
8. **Sin empezar** (blueprint): `composition` (solver de layout — hoy coords hardcodeadas en cada escena), `photokit` (necesita imágenes reales), `narrative`, `brand-kit`, `post.*` (grade/fx/overlays/**captions animados** = gap grande/format).
9. **audio** — **DEJADO PARA EL FINAL por decisión del usuario.** (Gap #1 competitivo, pero va último.)

## 7. Próximo paso (continuá EXACTO por acá)
El usuario aprobó la **opción A**: (1) reintentar+expandir **color**, (2) cablear **motion** + **typekit** (personalidad de movimiento + efectos de texto en las escenas), (3) que las escenas usen **markkit/datakit**. Luego (4) **scene-buffering + transitions**, luego (5) el **cerebro/análisis real**. Audio al final.
Método: para más MÓDULOS → workflow de agentes (sección 5). Para CABLEADO de uso (motion/typekit/transitions/cerebro) → lo hace el orquestador inline (NO en paralelo con un workflow que toque los mismos archivos).

## 8. Reglas duras (gates que nada viola)
1. No tocar Animaciones. 2. Determinismo (cero Math.random/Date.now; verificar con el determinism check). 3. Texto SIEMPRE via `core/text.js` (no-desborde). 4. Texto en tinta, acento en deco. 5. tones/rubros honestos. 6. Cada lib dueña de su carpeta; los agentes NO tocan `libs/index.js` ni `core/`. 7. Git: ASCII + trailer + rebase antes de push.

## 9. Historia de la sesión (qué se hizo)
- **Antes de urvid 1.0** (motor VIEJO/Animaciones): auditoría de 9 páginas reales + fixes (clasificador ES, force_hero, sello de partículas legible/early-start) + GATES nuevos (`bounds-check` texto-fuera-de-cuadro, `legibility-check` cuerpo-only) + método de análisis de video (`render.mjs motionmap/trail/mp4`, `docs/ANALISIS-VIDEO.md`) + fix SISTÉMICO de desborde de texto (clip/fitWrap + torture-fixture) + inventario (`docs/INVENTARIO-ELEMENTOS.md`). Todo en `docs/ARBOL.md`.
- **urvid 1.0**: blueprint (workflow de investigación, 8 dims) → fundación (core + rebanada vertical) → Ola 1 (96) → arco variado → Ola 2 (+85) → color/typography/cerebro-v1 → Ola 3 (+107) = **309 módulos**.
