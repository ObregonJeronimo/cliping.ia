# 🤝 HANDOFF para el PRÓXIMO CHAT — urvid (cliping.ia)

> Pegá este doc (o decí "leé docs/HANDOFF-PROXIMO-CHAT.md") al arrancar el chat nuevo. Tiene el contexto completo,
> cómo trabajar, lo del token de GitHub, el estado actual y los PENDIENTES. Objetivo: que el chat nuevo actúe IGUAL
> que el anterior (mismo criterio, mismos gates, misma autonomía).

## 0. Orientación (CRÍTICO, no perderse)
- El proyecto es **urvid** y vive en `C:/Users/Usuario/Documents/cliping.ia`.
- **OJO**: la sesión de Claude Code ABRE en `C:/Users/Usuario/Desktop/Autoleads`, que es **OTRO proyecto distinto**.
  El `CLAUDE.md` que se carga es el de **Autoleads** (IRRELEVANTE para esto). Para urvid, USÁ SIEMPRE rutas absolutas a
  `C:/Users/Usuario/Documents/cliping.ia` y leé sus `docs/`.
- Stack: **Vite + React**, motor **Canvas-2D determinista** en `src/urvid/`. El FRONT **auto-deploya en Vercel desde
  `main`** (al pushear). El BACKEND es **local** (Python/FastAPI, se levanta con `start.bat` en localhost:8000) y todavía
  NO está en la nube.
- Repo: `github.com/ObregonJeronimo/cliping.ia` (privado). Firebase real (no renombrar IDs).

## 1. Qué es urvid
Generador de **reels verticales (9:16) de marketing** a partir de una URL. El usuario pega un link → se analiza la página
(perception: **1 llamada a Claude Sonnet 4.6**, devuelve brief: marca/rubro/tono/color/tagline/claim/cta/bullets/stats) →
un **MOTOR de bibliotecas categorizadas** (color, tipografía, fondos, escenas, transiciones, post, layouts, Lotties, etc.)
arma un video **ÚNICO y DETERMINISTA** (frame = f(t)). El render es **client-side** (canvas + MediaRecorder/WebCodecs) →
costo de render = **$0**. Dos estudios:
- **urvid IA** (`/studio`, `src/pages/Urvid1/Urvid1Studio.jsx`) — estudio simple, 1 pantalla. (Antes "urvid 1.0".)
- **urvid IA advanced** (`/studio/craft`, `src/pages/UrvidCraft/`) — wizard paso a paso (Datos→Estilo→Fondo→Escenas→Cierre→Avanzado→Crear). (Antes "Urvid Craft".)
- Además, en el sidebar: **Animaciones IA** (`/studio/anim`, `src/pages/AnimLab/`) y **Lotties** (`/studio/lotties`, `src/pages/Lotties/`).

## 2. Cómo trabajar (reglas duras)
- **DETERMINISMO**: CERO `Math.random`/`Date.now` en el motor (`src/urvid/`). Verificar con `node tools/urvid1-test.mjs`.
- **TEXTO** siempre por `core/text.js` (no-desborde). **COLOR** de `env.pal.*` (nunca hardcodear hex de marca). El **TONO**
  (dark/light) es el único filtro duro.
- **GATES** (correr tras tocar el motor; dejarlos en 0/verde): `npm run qa` (ellipsis/timing/listas), `npm run prefit`
  (texto completo), `node tools/urvid1-color-check.mjs` (WCAG), `node tools/urvid1-test.mjs` (determinismo), `npx vite build`.
- **Git**: commits **ASCII** imperativos + trailer `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
  `git pull --rebase origin main` antes de push, **nunca forzado**. El usuario suele pedir **push directo a `main`**.
- **Autonomía** (cómo trabajó el chat anterior): construir + verificar solo, commitear por paso, y frenar solo donde la
  decisión es del usuario (forks de costo/API key, gustos visuales). Presupuesto de IA chico → no quemar tokens al pedo.
- Para verificar UI en navegador: el front corre con `npm run dev` PERO necesita un `.env` de Firebase (no commiteado).
  Truco usado: `.env.local` DUMMY temporal (gitignored) + ruta pública temporal en `App.jsx` → screenshot → revertir.
  **OJO: el navegador del preview headless PAUSA `requestAnimationFrame`** → las animaciones por rAF (Lottie, AnimLab,
  cinético) NO se ven ahí. Verificar por píxeles/lógica/getComputedStyle; **el movimiento lo prueba el usuario EN VIVO en Vercel**.

## 3. El token de GitHub (clásico) — cómo se "pushea" (y por qué NO hay token que pegar)
- Los `git push origin main` se autentican con un **Personal Access Token (classic)** guardado en el **Windows Credential
  Manager** de la máquina. **El asistente NUNCA ve el valor del token**: solo corre `git push` y la credencial guardada lo
  usa para autenticar. **No está en el repo ni en ningún archivo** (verificado). Por eso no hay token para "pasar" en un
  mensaje: el chat nuevo no lo necesita pegado — mientras la credencial siga en la máquina, `git push` anda solo.
- El usuario va a **rotar/eliminar** ese token más adelante (buena práctica). **No te preocupes por eso, lo gestiona él.**
  Si lo elimina, `git push` va a FALLAR hasta que reconfigure una credencial; mientras tanto **COMMITEÁ local** y avisale
  para que él pushee (o reconfigure el token). NUNCA intentes leer/extraer el token del credential manager.

## 4. Estado actual (TODO pusheado a `main`; último commit `f7fe0bd`)
La sección 5 del handoff viejo (5.1–5.11) está **TODA HECHA**. Resumen de lo logrado:
- **Sidebar/estudios**: borrado el motor viejo "Animaciones"; estudios renombrados a **urvid IA** (`/studio`) y
  **urvid IA advanced** (`/studio/craft`); "Mis videos" separado por estudio; logo con sheen iridiscente; el token "**IA**"
  pintado con gradiente `.urvidIA` (en urvid IA / advanced / Animaciones IA); receta movida al pie; título con mini-entrada.
- **Escenas/Fondo/previews (advanced)**: más variedad por beat con filtro de categoría; "Fondo" rendea solo la capa de
  fondo; `EffectPreview.jsx` (preview grande dedicado para Cierre/Avanzado); "Icono de marca" → "Icono".
- **Lotties a escala**: 2050 → **1057** Lotties (CDN de LottieFiles). Manifiesto `src/urvid/lottie/manifest.js`
  (metadata + url, ~lazy del CDN), generado por `tools/lottie_manifest.py` (busca via `backend/lottie_search.py` +
  fetch paralelo + gate de determinismo `has_expressions` + filtro de calidad). Render con lottie-web (`lottie/player.js`,
  `goToAndStop` por t = determinista; **solo browser, no-op en Node**).
- **Visor/curador "Lotties"** (`src/pages/Lotties/LottieGallery.jsx`): hover reproduce, filtros rubro/concepto/búsqueda,
  clic marca "a borrar" (localStorage `'lottie.trash'`), botón "Copiar IDs". Con eso el usuario curó 993 ids.
- **Borrado permanente de 993 Lotties**: `tools/lottie_blocklist.txt` (ids) + `tools/lottie_prune.mjs` (las saca del
  manifest) + `lottie_manifest.py` **RESPETA la blocklist al regenerar** → no vuelven. (manifiesto 2050 → 1057.)
- **Animaciones por escena (FEATURE, SOLO urvid IA)**: flag `perSceneAnims` (advanced INTACTO). Cada beat muestra
  **1–3 Lotties ruteadas por LO QUE DICE ESA ESCENA**, usando **TODA la biblioteca, no solo el rubro** (cross-rubro: una
  escena de ecommerce en un video de salud SÍ muestra anim de ecommerce). En `core/assemble.js`: `ANIM_ROUTES` (temas con
  kw + `pool`=rubro cuya librería cubre el tema, ej ecommerce→moda, dinero→finanzas) + `_beatText` (texto por categoría de
  beat) + `pickSceneAnims`. `core/render.js` dibuja las 1–3 de la escena activa en esquinas. `Urvid1Studio` pasa
  `perSceneAnims:true`. Verificado: ruteo relevante + determinista + gates verdes. **FALTA validarlo EN VIVO** (no-op en Node).
- **Animaciones IA** (`src/pages/AnimLab/AnimLab.jsx`, BETA): familia RÍGIDA/2.5D (determinista, fotos reales, render $0;
  NO generativa tipo Runway/Kling). Loop: subir imagen → **SAM** (transformers.js `Xenova/slimsam`, cargado del CDN con
  import `@vite-ignore` → no pesa el bundle, corre client-side) recorta el objeto con un clic → sprite RGBA → path
  recto/curvo (Catmull-Rom, arrastrar/borrar anclas, undo) → animar (easings, delay/stagger, spin, loop) → **export MP4**
  (Mediabunny/WebCodecs, fallback WebM/MediaRecorder). Fallbacks sin IA: "Imagen entera", "Subir PNG".
- **Costo por video (corregido)**: render = **$0** (browser). Único costo IA = **perception** (1 call Sonnet 4.6, topeada,
  **cacheada por URL**) → ~**$0.02 por página única**. Plan 150 videos/mes: techo Anthropic ~$3/usuario/mes peor caso,
  realista <<$1. (`docs/PLAN_NUBE.md` está OBSOLETO: asume Remotion Lambda en servidor.)
- **Licencia Lottie** (pregunta del usuario): NO se puede GARANTIZAR cero riesgo legal (no soy abogado). Base actual:
  Lottie Simple License (uso comercial OK, sin atribución) + salida rasterizada (video, no `.json`) + urvid no es un
  servicio de Lotties competidor → razonable. **Riesgo residual real = IP del uploader** (logos/marcas/personajes ajenos).
- **Docs del repo a LEER** (orden): `docs/URVID-1.0-HANDOFF.md` (arquitectura + contrato de módulo) → `-AUDITORIA.md` →
  `-FIXES-POSTAUDIT.md` → `-NEXT.md` (detalle de Lottie + refinamientos).

## 5. ⭐ PENDIENTES NUEVOS (arrancar por acá — en orden de prioridad del usuario)

### 5.A 🥇 BIBLIOTECA DE LOTTIES 100% LIBRE DE LICENCIA (máxima prioridad)
Pedido textual del usuario: *"no quiero tener nada que ver con animaciones o lotties que tengan licencia, hasta podrían
verificar los agentes por si un usuario creó una animación pero esa animación tiene contenido que sí tiene licencia. Por más
que parezca que no tenga licencia, el usuario que la creó sí podría haber usado algo con licencia de otro lado. Ayudame por
favor. Quiero que cada lottie que tengamos sea de calidad, que abarquemos todo lo que se use normalmente en videos para cada
rubro."*
Traducido a trabajo (CONFIRMAR EL PLAN CON EL USUARIO ANTES DE CONSTRUIR — hay forks de fuente/API key/costo):
1. **Migrar a CC0 / dominio público** (cero ambigüedad). Candidato sugerido: **IconScout ~6300 Lotties CC0** (ver si hay
   API/descarga; puede requerir API key → decisión del usuario). Alternativas CC0/permisivas a evaluar también.
2. **Pipeline de ingesta + categorización**: reescribir/ampliar `tools/lottie_manifest.py` + `backend/lottie_search.py`
   para tirar de la(s) fuente(s) CC0, re-categorizar por **rubro + concepto**, y mantener los gates (determinismo + calidad).
3. **Verificación de IP por agentes**: un paso que revise cada animación (incluidas las que suba un usuario) para detectar
   **contenido con licencia/marca** (logos, personajes con copyright, IP ajena) aunque el archivo "parezca" libre. Definir
   método (visión multimodal sobre frames renderizados, matching de marcas, etc.).
4. **Calidad + cobertura total por rubro**: que cada rubro tenga lo que "se usa normalmente en videos" (cobertura completa,
   sin huecos), todas de buena calidad.
5. **Registro de licencias**: guardar la base legal (texto de licencia de la fuente + manifiesto + fechas) por las dudas.
- Curaduría dura ya en marcha (la blocklist de 993 sacó logos/marcas: `probeauty-logo`, `bitci-face`, `python-ring`, etc.).

### 5.B Animaciones IA (AnimLab) — continuar ("sí porfavor, sigue")
El usuario dijo que SÍ a seguir. El próximo tramo tiene un **fork de decisión** que ya estaba planteado:
- **Auto-detectar TODOS los objetos de una** (hoy es clic por objeto). Dos caminos —> **DECISIÓN DEL USUARIO**:
  (a) **SAM "automatic mask generator" en el navegador** — gratis pero lento (decenas de pasadas), o
  (b) **SAM hosteado** (Replicate/fal) — rápido, ~centavos por imagen, pero suma costo + API key.
- Después: **WebGPU** (self-hostear el modelo + headers **COOP/COEP** para que vuele), **timeline multi-escena**,
  **escala/opacidad a lo largo del path**.
- Antes de encarar el auto-detect, conviene que el usuario **pruebe lo que hay** (SAM por clic + path + export MP4) en vivo
  y elija (a) vs (b).

## 6. PENDIENTES ARRASTRADOS (de antes, siguen vigentes)
- **Backend → NUBE**: el "Analizar" (perception) da **404 en Vercel** porque el backend es local. Migrar a Cloud Run/similar.
  Hasta entonces, perceive solo anda levantando `start.bat` local.
- **Validar EN VIVO** (browser-only, no se ve headless): el render de las **1–3 Lotties por escena** (urvid IA) y el flujo
  **AnimLab** (SAM + path + export MP4).
- **Lottie refinements**: selector de Lotties en advanced (filtro por rubro + hover-play), recolor opcional a la marca,
  placement más protagónico, lazy-load del manifiesto, cachear el gate.
- **Multi-portal import** (Zonaprop/Argenprop/etc.), **instalador/empaquetado/multi-OS**, **audio** (al final).

---
**Resumen para el chat nuevo**: leé los `docs/URVID-1.0-*.md`, respetá los gates y el determinismo, trabajá con autonomía
(construir+verificar+commit por paso, frenar solo en decisiones del usuario), y **arrancá por la sección 5.A** (biblioteca
de Lotties 100% libre de licencia — confirmando el plan antes de construir). Todo lo anterior ya está en `main`.
