# 🤝 HANDOFF para el PRÓXIMO CHAT — urvid (cliping.ia)

> Pegá este doc (o "leé docs/HANDOFF-PROXIMO-CHAT.md") al arrancar el chat nuevo. Tiene el contexto completo,
> cómo trabajar, lo del token de GitHub, el estado actual y los PENDIENTES nuevos.

## 0. Orientación (CRÍTICO, no perderse)
- El proyecto es **urvid** y vive en `C:/Users/Usuario/Documents/cliping.ia`.
- **OJO**: la sesión de Claude Code ABRE en `C:/Users/Usuario/Desktop/Autoleads`, que es **OTRO proyecto distinto**.
  El `CLAUDE.md` que se carga es el de **Autoleads** (irrelevante para esto). Para urvid, USÁ SIEMPRE rutas absolutas a
  `C:/Users/Usuario/Documents/cliping.ia` y leé sus `docs/`.
- Stack: **Vite + React**, motor **Canvas-2D determinista** en `src/urvid/`. El FRONT **auto-deploya en Vercel desde
  `main`** (al pushear). El BACKEND es **local** (Python/FastAPI, se levanta con `start.bat` en localhost:8000) y todavía
  NO está en la nube.
- Repo: `github.com/ObregonJeronimo/cliping.ia` (privado). Firebase real (no renombrar IDs).

## 1. Qué es urvid
Generador de **reels verticales (9:16) de marketing** a partir de una URL. El usuario pega un link → se analiza la página
(perception: **1 llamada a Claude Sonnet 4.6**, devuelve brief: marca/rubro/tono/color/tagline/claim/cta/bullets/stats) →
un **MOTOR de bibliotecas categorizadas** (color, tipografía, fondos, escenas, transiciones, post, layouts, etc.) arma
un video **ÚNICO y DETERMINISTA** (frame = f(t)). Dos estudios:
- **urvid 1.0** (`/studio/urvid`, `src/pages/Urvid1/Urvid1Studio.jsx`) — estudio simple, 1 pantalla.
- **Urvid Craft** (`/studio/craft`, `src/pages/UrvidCraft/`) — wizard paso a paso (Datos→Estilo→Fondo→Escenas→Cierre→Avanzado→Crear).

## 2. Cómo trabajar (reglas duras)
- **DETERMINISMO**: CERO `Math.random`/`Date.now` en el motor (`src/urvid/`). Verificar con `node tools/urvid1-test.mjs`.
- **TEXTO** siempre por `core/text.js` (no-desborde). **COLOR** de `env.pal.*` (nunca hardcodear hex de marca). El **TONO**
  (dark/light) es el único filtro duro.
- **GATES** (correr tras tocar el motor; dejarlos en 0/verde): `npm run qa` (ellipsis/timing/listas), `npm run prefit`
  (texto completo), `node tools/urvid1-color-check.mjs` (WCAG), `node tools/urvid1-test.mjs` (determinismo), `npx vite build`.
- **Git**: commits **ASCII** imperativos + trailer `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
  `git pull --rebase origin main` antes de push, **nunca forzado**. (En este proyecto el usuario suele pedir push directo a `main`.)
- Para verificar UI en navegador: el front corre con `npm run dev` PERO necesita un `.env` de Firebase (no hay uno
  commiteado; el front "real" corre en Vercel). Truco usado: un `.env.local` DUMMY temporal (gitignored) + una ruta
  pública temporal en `App.jsx` para previsualizar sin login → sacar screenshot → revertir. OJO: el navegador del preview
  headless **pausa `requestAnimationFrame`**, así que las animaciones por rAF NO se ven ahí (verificar por
  getComputedStyle / píxeles / lógica, y dejar que el usuario pruebe el movimiento en vivo).

## 3. El token de GitHub (clásico) — el usuario lo va a eliminar, no te preocupes
- Los `git push origin main` se autentican con un **Personal Access Token (classic) de GitHub** guardado en el credential
  manager de la máquina (Windows). El asistente **NUNCA ve el valor del token**: solo corre `git push` y la credencial
  guardada lo usa para autenticar. Así es como se "hacen cambios" remotos (commit local → push → Vercel deploya).
- El usuario va a **rotar/eliminar** ese token (buena práctica: no dejar un classic token de larga vida). **No te
  preocupes por eso, lo gestiona él.** Si lo elimina, los `git push` van a FALLAR hasta que reconfigure una credencial;
  mientras tanto, COMMITEÁ local y avisale al usuario para que él pushee (o reconfigure el token).

## 4. Estado actual (lo hecho en la última sesión — TODO pusheado a `main`)
- **Fluidez del texto**: el texto quedó **pixel-estable** (se sacó el ken-burns del CONTENIDO; la vida la dan fondo+deco).
- **Crítico del guión**: `core/script.js` `fitContent` (recorte por PALABRA → el texto se ve COMPLETO, nunca cortado) +
  perception mejorada (`_clip_words` + `_SYS` con completitud) + gate `npm run prefit`.
- **Urvid Craft (wizard)**: completo (A/B/C). Previews por opción con **HOVER-PLAY** (no auto-play; anima al pasar el
  mouse), **filtro por rubro** en Fondo, mini-player en vivo, **persistencia** del borrador, **export HD 1080×1920**,
  acordeón "Avanzado", tema **PAPEL** (identidad de la landing: #f3f2ee + Bricolage Grotesque + DM Sans + JetBrains Mono).
- **Animaciones → LOTTIE** (pivote): se BORRARON las animaciones vectoriales propias (se veían flojas) y se pasó a
  **2050 animaciones Lottie reales** (200 por cada uno de 9 rubros + 250 universales) desde el **CDN de LottieFiles**.
  Pipeline: `tools/lottie_manifest.py` busca (via `backend/lottie_search.py`) + fetchea EN PARALELO + **gatea por
  determinismo** (`has_expressions`) + **filtra calidad** → `src/urvid/lottie/manifest.js` (metadata + url del CDN, ~555KB,
  NO bundle). Se rendean con **lottie-web** (`src/urvid/lottie/player.js`, `goToAndStop` por t = determinista; solo browser,
  no-op en Node). Ruteo en `assemble.js` por concepto+rubro → `video.animId`/`animUrl`, aparece en una esquina del video.
  **Licencia**: Lottie Simple License (uso comercial OK, sin atribución) — decisión del usuario (es producto pago).
- **Tema del estudio urvid 1.0**: pasó de consola oscura a **CLARO** = la paleta del sidebar (blanco principal `--surface`,
  negro secundario `--accent/--text`, fondo gris `--bg`), usando las variables globales de `src/index.css`.
- **Docs del repo a LEER** (en orden): `docs/URVID-1.0-HANDOFF.md` (arquitectura + el contrato de módulo + cómo se llenan
  las libs con workflows de agentes), `docs/URVID-1.0-AUDITORIA.md` (la crítica/roadmap), `docs/URVID-1.0-FIXES-POSTAUDIT.md`
  (qué se hizo del audit), `docs/URVID-1.0-NEXT.md` (lo que seguía + el detalle de Lottie y refinamientos).

## 5. ⭐ PENDIENTES NUEVOS (pedidos del usuario — arrancar por acá)

### 5.1 ELIMINAR "Animaciones" (el motor VIEJO) por completo
Hoy sigue existiendo el motor viejo "Animaciones" (separado de urvid 1.0). El usuario quiere **borrar todo lo relacionado**:
- `src/pages/Animaciones/` (TimelineStudio.jsx, MisAnimaciones.jsx, `engineCore.js`, etc.) y cualquier archivo de ese motor.
- Las rutas en `src/App.jsx`: el `<Route index>` de `/studio` hoy es `TimelineStudio` → cambiarlo (que el index sea
  "urvid IA", ver 5.2), y borrar `path="animaciones"` y `path="mis-animaciones"`.
- Los items del sidebar (`src/components/Layout/Sidebar.jsx`): "Animaciones" (◆) y "Mis animaciones" (◇).
- Cualquier import/referencia restante. Verificar que el motor NUEVO (`src/urvid/`) no dependa de nada de eso (no debería).

### 5.2 Sidebar: renombrar estudios + "Mis videos" SEPARADO por estudio
- "**urvid 1.0**" → renombrar a "**urvid IA**" (sigue siendo `Urvid1Studio`, `/studio/urvid`).
- "**Urvid Craft**" → renombrar a "**urvid IA advanced**" (sigue siendo `UrvidCraftStudio`, `/studio/craft`).
- **Cada estudio guarda/muestra SOLO sus propios videos** (hoy AMBOS comparten el almacén `localStorage 'urvid1.saved'` +
  Firestore `users/{uid}/urvid_videos`). Hay que **SEPARAR** los almacenes (ej keys `urvidia.saved` / `urvidia_adv.saved`
  + colecciones Firestore distintas) y que el panel "Mis videos" de cada estudio liste solo los suyos.
- **Urvid Craft (advanced) NO tiene panel "Mis videos"** todavía → agregárselo (urvid 1.0/IA sí lo tiene, en su columna derecha).

### 5.3 Animación del título al cambiar de sección
Al seleccionar un item del sidebar, el **título de la página** hace una **mini-animación** (entrada sutil al cambiar de sección).

### 5.4 El "IA" de los títulos = tipografía "arcoíris dark"
En los títulos "urvid **IA**" y "urvid **IA** advanced", la parte "**IA**" con una tipografía estilo **arcoíris pero DARK +
levemente brillante, en MOVIMIENTO LENTO constante** (un gradiente iridiscente oscuro animado sobre esas letras, loop lento).

### 5.5 urvid IA: el header de receta → abajo + sutil
En urvid 1.0/IA, el header con los chips de receta (COLOR/TIPO/FONDO/MOTION/... + el flow de escenas — el del screenshot que
mandó el usuario) → **moverlo ABAJO y hacerlo sutil/menos molesto** (hoy ocupa todo el header arriba y molesta).

### 5.6 Sacar "+ Nuevo video" del sidebar
Quitar el botón "**+ Nuevo video**" del `Sidebar.jsx`.

### 5.7 El logo "Urvid" del sidebar → más lindo/llamativo (estilo IA)
El logo de arriba del sidebar (`Sidebar.jsx`, hoy "Ur" negro + "vid" gris) → hacerlo **más bonito y llamativo, con una
animación tipo páginas de IA** (gradiente animado / glow sutil / shimmer), **NO genérico**.

### 5.8 Urvid Craft advanced, paso "Escenas": MÁS variedad + filtros por beat
Hoy el picker de cada beat muestra solo escenas de la MISMA categoría del beat (beat1=openers, beat2=statements,
beat3=lists, beat4=closers) y dentro hay pocas (openers→solo hero, statements→solo editorial, lists→solo checklist,
closers→solo outro). El `sceneOptionsFor(sceneId, brief)` filtra por la categoría de la escena actual.
El usuario quiere: **MÁS opciones por beat** y poder **ELEGIR la categoría/tipo de cada beat con filtros** (poder ver/elegir
escenas de cualquier categoría en cualquier beat, con un filtro por categoría). La lib `scene-layouts` tiene **73 escenas**
en varias categorías — exponerlas mejor en el picker (filtro de categoría por beat, no encerrarlo en la categoría original).

### 5.9 "Fondo" (paso 3): mostrar SOLO el fondo, no un preview real
Hoy el `OptionCard` de slot `bg` rendea el video COMPUESTO (escena con texto encima) → parece un preview real. El usuario
quiere que las opciones de FONDO muestren **solo la capa de FONDO** (sin texto/contenido). Técnicamente: para slot `bg`,
rendear solo `get(video.bgId).render(ctx, t, env)` (la capa de fondo) en vez de `drawFrame` (todo el compuesto). Mismo
criterio podría aplicar a `sub`/`atm` (capas) en Avanzado.

### 5.10 Cierre (paso 5) y Avanzado (paso 6): los previews NO comunican la diferencia
- **Transiciones** (16): pocas + el preview no muestra claro el wipe/slide (parecen todas iguales, chico). Ya se loopea la
  ventana del paso entre escenas, pero igual cuesta verlo.
- **Acabado/post**: el grano/viñeta/grade es SUTIL por diseño → casi no se ve en thumbnail.
- **Avanzado**: textura (substrate), atmósfera, movimiento (motion), texto cinético (typekit), composición (layout) — mismo
  problema: el preview no deja ver la diferencia entre opciones.
- Es un problema de UX REAL sin solución obvia. Repensar cómo previsualizar estas opciones "abstractas": ideas posibles =
  preview dedicado más grande del paso entre 2 escenas (transiciones), aplicar el efecto más fuerte / before-after / sample
  de alto contraste (post), mostrar el efecto sobre un sample controlado o con etiquetas/descripciones claras (motion/typekit/
  layout). **Conviene proponer opciones al usuario antes de implementar.**

### 5.11 "Icono de marca" → "Icono"
En el paso Avanzado de Urvid Craft, el slot `mark` se titula "Icono de marca" → renombrar a "**Icono**" (es un icono animado,
no es de la marca).

## 6. PENDIENTES ARRASTRADOS (de antes, siguen vigentes)
- **Backend → NUBE**: el "Analizar" (perception) da **404 en Vercel** porque el backend es local. Migrar a Cloud Run / similar.
  Hasta entonces, perceive solo anda levantando `start.bat` local. (Ver si hay `docs/PLAN-BACKEND-NUBE.md`.)
- **Lottie refinements** (ver `docs/URVID-1.0-NEXT.md`): selector de Lotties en Craft (con filtro por rubro + hover-play),
  recolor opcional a la marca, placement más protagónico, lazy-load del manifiesto (~555KB), cachear el gate.
- **Multi-portal import** (adapters de Zonaprop/Argenprop/etc.), **instalador/empaquetado/multi-OS**, **audio** (al final).

---
**Resumen para el chat nuevo**: leé los `docs/URVID-1.0-*.md`, respetá los gates y el determinismo, y arrancá por la
sección 5 (empezando por 5.1 borrar Animaciones + 5.2 renombrar/separar estudios). Todo lo de la última sesión ya está en `main`.
