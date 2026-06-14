# Investigacion: motor de video Urvid (fluidez tipo Canva/Motion sin IA generativa)

> Generado el 2026-06-13 por un workflow de 13 agentes (research por avenida -> verificacion
> adversarial de claims -> sintesis), validado contra el codigo real del repo. Todas las fuentes
> al final. Verdicts: **descartar** Canva Connect y Rive; **prototipar** Fondos fluidos, GSAP,
> Direccion generativa y Lottie (en ese orden de prioridad).

# Urvid — Sintesis accionable: videos fluidos y unicos SIN IA generativa de video

## 1. TL;DR

El camino ganador es una **combinacion de tres avenidas que se refuerzan**, no una sola bala de plata. La causa raiz de "todos los videos salen iguales" es doble: **(a)** el fondo es un solo gradiente radial estatico (mayor hueco visual), y **(b)** el vocabulario del director es chico (15 morphs, 8 iconos, 10 themes), asi que el sampling colapsa al modo. Atacalas en este orden: **1) Fondos fluidos proceduralmente en `engineCore.drawBg` (Canvas 2D puro, cero deps, alimenta preview + MP4 de una)** — es el mayor ROI visual y resuelve la fluidez; **2) Capa de direccion generativa (Verbalized Sampling + style-engine por rubro)** — rompe los patrones sin tocar el motor; **3) GSAP (easings premium + morph + motion-path) y Lottie (acentos premium)** para subir el techo de vocabulario. Rive y Canva Connect: **descartar**. GSAP y fondos son la dupla de mas leverage; Lottie y direccion generativa son multiplicadores que se montan despues.

## 2. Ranking por ROI visual vs riesgo

| # | Avenida | Verdict final | ROI visual | Riesgo | Ataca fluidez | Ataca patrones |
|---|---------|---------------|-----------|--------|:---:|:---:|
| 1 | **Fondos fluidos** (mesh gradient / metaballs / flow field en Canvas 2D) | **adopt** | Muy alto | Bajo | Si | Si (via seed/escena) |
| 2 | **GSAP** (easings, MorphSVG, MotionPath, SplitText) | **prototype → adopt** | Alto | Medio (determinismo) | Si | Si (morph/path infinitos) |
| 3 | **Direccion generativa** (Verbalized Sampling + style-engine + brand_dna ampliado) | **prototype** | Alto (acoplado al motor) | Medio | No | Si (causa raiz) |
| 4 | **Lottie** (@remotion/lottie + GraphQL retrieval) | **prototype / maybe** | Medio-alto | Medio (determinismo + sameness) | Si | Parcial (puede empeorar) |
| 5 | **Rive** | **skip** | — | Alto | (si, pero) | No (lo empeora) |
| 6 | **Canva Connect API** | **skip** | — | — | No | No |

**Correcciones de la verificacion que cambian matices del ranking:**

- **GSAP — `getPositionOnPath` tiene un paso obligatorio que el research omitio:** el patron puro NO es `stringToRawPath → getPositionOnPath`, es `stringToRawPath → cacheRawPathMeasurements → getPositionOnPath`. Sin el cache, el sampling de path da valores incorrectos. Anotalo en el POC.
- **GSAP "sin atribucion" esta levemente sobre-vendido:** la licencia prohibe *quitar/alterar los avisos internos de GSAP de la libreria*. No tenes que dar credito en tu producto (eso es correcto), pero no podes strippear los notices del lib. Irrelevante en la practica.
- **GSAP licencia "Competitive Products":** Urvid (la IA escribe el timeline, no es un armador visual de keyframes tipo Webflow) cae en Permitted Use HOY. El preview/sidebar editor es zona gris si algun dia se vuelve un editor de animaciones sin codigo. No bloqueante; vigilar scope.
- **Lottie autofill / capacidades:** correccion menor (el autofill de Canva soporta mas campos de lo dicho), pero **no cambia que Canva se descarta**. Para Lottie, lo importante: usar **`jsonUrl`, NO `lottieUrl`** (el segundo es dotLottie/zip, no consumible por `@remotion/lottie`); y **las Lotties con expresiones son comunes en el pool gratis** (la primera de la query de prueba ya traia un efecto "Pseudo/MDS Elastic") → el gate de determinismo es trabajo real, no edge case raro, y debe detectar CUALQUIER expresion/capa de efecto, no solo keywords "random"/"time".
- **`@remotion/three` version:** el research dijo 4.0.471; el registry hoy muestra 4.0.477. Drift de snapshot, no afecta nada. **OJO con r3f:** la ultima (v9) es para React 19; el frontend usa React 18.3.1 → si algun dia vas a WebGL, usa **r3f v8**. Pero WebGL es Fase 2 opcional, no ahora.
- **`ctx.filter='blur()'`** (para el gooey de metaballs) **no es portable fuera de Chromium** (falla en Firefox). En el render headless de Remotion (Chromium) anda; en el preview del browser anda si es Chromium. Si queres portabilidad total, fallback = pre-render del blob a offscreen + stamping con alpha.
- **`noise2D` devuelve -1..1** (no 0..1 como `random(seed)`). Tenelo presente al mapear a alpha/posicion.
- **Rive:** la verificacion refuto una cita ("black box" NO es texto oficial de la doc de formato; el formato .riv SI esta documentado via Core Defs) y señalo que existe `@remotion/rive` oficial (no hay que cablear el loop a mano). **Pero el muro de fondo se mantiene:** no podes COMPONER un .riv desde codigo/IA, solo mover inputs de un .riv autorado a mano. Choca con "la IA compone". **Skip confirmado**, solo que por la razon correcta (autoria, no transporte).

## 3. Por avenida

### 1. Fondos fluidos — **ADOPT** (empezar por aca)
- **Que permite de verdad:** reemplazar `drawBg` (1 gradiente radial + glow + 16 motes random sin sembrar + vineta) por `drawFluidBg(ctx, t, theme, seed)`: mesh gradient de 4-6 puntos moviles (osciladores seno/coseno desfasados por seed) compuestos con `globalCompositeOperation='lighter'`, + capa opcional de metaballs (gradientes radiales + gooey via blur o stamping), + flow-field sembrado para los motes. **NO** replica el shimmer per-pixel de Stripe (eso es GPU/WebGL, Fase 2); logra ~80% del look con primitivas grandes.
- **Licencia/costo:** **$0, cero deps nuevas.** Usa el ctx 2D nativo + `random(seed)` del core de Remotion (ya instalado). Si queres simplex oficial, `@remotion/noise` (MIT) — pero para el POC arrancas sin el.
- **Encaje con el stack:** **perfecto.** `engineCore.drawFrame` alimenta preview Y MP4 → una mejora sube las dos superficies. Critico: reemplazar `Math.random()` no sembrado de los motes por `random(seed)`/PRNG mulberry32 sembrado (es exactamente lo que Remotion prohibe en render paralelo).
- **POC minimo:** funcion pura `drawFluidBg(ctx,t,theme,seed)` en el modulo de engineCore; campo `seed` por escena en el timeline JSON (o derivar de `hash(scene.id)`); seccion nueva del sidebar "Fondo" con `<canvas>` 405x720 + slider de `t` + input de `seed`. **Validar sin MP4:** vite build + esbuild bundle de `TimelineVideo.jsx`; harness Node ctx-2D → mismo `(t,seed)` da secuencia de ops IDENTICA en dos corridas (pureza/determinismo), distinto seed → distinta secuencia (varianza); grep que falle si aparece `Math.random|Date.now|performance.now` dentro de la funcion.

### 2. GSAP — **PROTOTYPE → ADOPT**
- **Que permite de verdad:** ~30 easings premium (power, expo, back, elastic, CustomEase) + timelines anidados + stagger; **MorphSVG** (morph entre cualquier par de paths → mata el cuello de "solo 15 morphs"); **MotionPath** (`getPositionOnPath` para texto/iconos viajando por curvas, hoy inexistente); **SplitText** (kinetic typography, lo mas reconociblemente "premium"). Solo sirven core + MotionPath + Morph + SplitText; ScrollTrigger/Draggable/Flip no aplican a render offline.
- **Licencia/costo:** **$0 comercial** desde abril 2025 (Webflow). No strippear notices internos del lib. Urvid = Permitted Use hoy.
- **Encaje:** `npm i gsap` en **`/remotion` Y en frontend** (Remotion tiene package.json propio). Patron determinista: **timeline en PAUSA por escena** (`gsap.timeline({paused:true})`), `tl.seek(t)` y leer valores tweeneados para dibujar en `drawFrame`; nunca arrancar `gsap.ticker`; `gsap.ticker.lagSmoothing(0)` al cargar. Para paths: `stringToRawPath(d)` → **`cacheRawPathMeasurements()`** → `getPositionOnPath(rawPath, progress)` (puro). NO tocar `globalTimeline` global (estado compartido entre frames paralelos = render roto).
- **POC minimo:** modulo `motionGsap.js` con `buildEasings()`, `samplePath(d,progress)`, `makeSceneTimeline(spec).sampleAt(t)`; cablear en `drawFrame`; tab del sidebar "Motion premium" con 4-6 presets demo. **Validar sin MP4:** vite build + esbuild bundle con gsap; harness Node importando SOLO utilities puras (o shim `domino`, porque GSAP core necesita `window`) → assert determinismo byte-a-byte de `(x,y,opacity)` para mismo `(t,seed)`; test anti-ticker (mockear reloj, salida identica).

### 3. Direccion generativa — **PROTOTYPE**
- **Que permite de verdad:** **Verbalized Sampling** (pedir K=5 candidatos con su probabilidad, muestrear de las colas tau<0.10 → 1.6-2.1x mas diversidad, gana mas en modelos potentes como Sonnet) + **String-Seed-of-Thought** (inyectar seed string en el prompt) en `timeline_director.py`; un **`style_engine.py`** (software puro, NO IA) que mapea rubro/publico → preset de tokens (paleta, pacing, densidad, morphs/iconos/shapes permitidos DISJUNTOS por rubro, `bg_kind`); ampliar `brand_dna.py` con dimensiones de rubro/audiencia. **Caveat duro:** la diversidad de prompting se topa con el techo del vocabulario de engineCore — solo recombina mejor lo que existe. Rinde **acoplada** a avenidas 1+2.
- **Licencia/costo:** software $0 (VS es Apache 2.0, no MIT como dijo el research — irrelevante). Unico costo: ~5x tokens de output del director con K=5 → mitigar con prompt caching del system prompt + pedir VS SOLO en el campo de mas varianza (arco/hook/secuencia), no el timeline entero x5.
- **Encaje:** `claude-sonnet-4-6` ya es el director; se cablea sin deps. `style_engine` debe ser funcion pura de `(profile, seed)` con seed = `hash(brand+url)`. La tabla rubro→tokens es **dato SOFT** (Figma/Pinterest son tendencia, no taxonomia) → curar a mano con Jero.
- **POC minimo:** `style_engine.py` (pytest: `py_compile`, determinismo, verticales con morphs disjuntos, mismo vertical + 2 seeds → presets distintos); helper `verbalized_sample()` + SSoT en el director (correr 2 marcas mismo rubro + 2 de rubros distintos, diffear los timeline JSON); seccion sidebar "Direccion" que muestra el preset elegido para curar el mapeo sin renderizar.

### 4. Lottie — **PROTOTYPE / MAYBE**
- **Que permite de verdad:** acentos motion-graphics profesionales (iconos animados, transiciones, loops decorativos) compuestos sobre el fondo de engineCore, con `@remotion/lottie` (determinista: `goToAndStop(useCurrentFrame())`). Retrieval: GraphQL **no autenticado** `graphql.lottiefiles.com` (`searchPublicAnimations`) que el director maneja como ya maneja Iconify. **NO** resuelve el fondo (el hueco #1). Puede **empeorar** la sameness si siempre agarra el top-1 → necesita seleccion sembrada sobre un set de candidatos.
- **Licencia/costo:** **$0**, Lottie Simple License (comercial, sin atribucion). Restriccion: no "coleccionar/compilar" la libreria para un servicio competidor → fetch on-demand, cachear solo lo que usa cada video, no rehostear.
- **Encaje:** `npm i @remotion/lottie@4.0.469 lottie-web@^5` **solo en `/remotion`**. Layer React `<Lottie>` compuesta sobre engineCore en `TimelineVideo.jsx` (NO meter en `drawFrame`). Cargar JSON con `staticFile()/fetch` + `delayRender()/continueRender()`. **Gate de determinismo obligatorio:** rechazar cualquier Lottie con expresiones/capas de efecto (comunes en el pool gratis); usar `jsonUrl`, nunca `lottieUrl`.
- **POC minimo:** `backend/lottie_search.py` (validar con `py_compile` + 1 fetch real imprimiendo 12 jsonUrls); script esbuild que monta una Lottie y assert dos frames identicos (determinismo); element kind `'lottie'` + `<LottieLayer>` + toggle en el sidebar. **Solo bundlea + se ve en `<Player>`; el harness Node NO corre lottie-web** (necesita DOM/canvas real).

### 5. Rive — **SKIP**
- El runtime es MIT y SI se puede hacer determinista (`@rive-app/canvas-advanced` con delta fijo, o el oficial `@remotion/rive`). **Pero los .riv son binarios que solo salen del editor Rive a mano** — no hay forma de componer un .riv desde codigo/IA. La variedad sale del animador humano, no del director. Traslada el problema de "vocabulario chico" a un pipeline de autoria manual + editor de pago (Cadet USD 9/seat/mes) + segundo runtime WASM. Contradice "la IA compone". **No vale el POC.**

### 6. Canva Connect API — **SKIP**
- Es una API de workflow/automatizacion, no un motor de render. No tiene NINGUN endpoint para autorar motion/keyframes/timeline. El unico camino "unico" es brand templates + autofill = exactamente la trampa de plantilla que Urvid quiere evitar; el MP4 es render opaco de Canva (sin seed, sin `(t)`, no se puede meter frame-a-frame en Remotion). Ademas requiere Canva Enterprise. **Sin POC.**

## 4. Plan de POCs (orden de construccion)

Cada POC vive en una **seccion aislada del sidebar** (ruta nueva en `src/App.jsx` + item en `Sidebar.jsx`) para no romper lo que anda. Asi Jero los evalua a ojo uno por uno sin tocar el flujo de produccion.

**POC 0 — Determinismo base (prerequisito, no es una seccion):** reemplazar el `Math.random()` no sembrado de los 16 motes en `engineCore` por `random(seed)`/mulberry32 sembrado. Es el unico no-determinismo conocido del modulo y bloquea el render paralelo correcto. Sin deps. Validar: harness Node, dos corridas mismo seed → ops identicas.

**POC 1 — Fondos fluidos** *(primero: mayor ROI visual, cero deps, alimenta preview+MP4)*
- Seccion sidebar: **"Fondo"** (`<canvas>` 405x720 + slider `t` + input `seed`).
- Deps: **ninguna** (ctx 2D nativo + `random(seed)` ya presente). Opcional despues: `@remotion/noise` (MIT) en **`/remotion`**.
- Validacion estructural: vite build (panel) + esbuild bundle de `TimelineVideo.jsx` (que el render bundlea) + harness Node (pureza/determinismo/varianza + grep anti-`Math.random/Date.now`).

**POC 2 — GSAP motion premium** *(segundo: sube el techo de vocabulario que la direccion generativa va a explotar)*
- Seccion sidebar: **"Motion premium"** (4-6 presets demo: easing expo, stagger SplitText, texto sobre motion-path, morph A→B).
- Deps: `npm i gsap` en **`/remotion` Y frontend**.
- Validacion: vite build + esbuild bundle con gsap; harness Node con `domino` shim o solo utilities puras → assert determinismo byte-a-byte; test anti-ticker. **Recordar `cacheRawPathMeasurements()` antes de `getPositionOnPath`.**

**POC 3 — Direccion generativa** *(tercero: una vez que el motor ya tiene vocabulario mas rico de 1+2, el director tiene de donde elegir)*
- Seccion sidebar: **"Direccion"** (muestra el preset/vertical detectado + tokens + `bg_kind` para curar el mapeo).
- Deps: ninguna nueva (Sonnet ya es el director). `style_engine.py` puro + VS/SSoT en el prompt.
- Validacion: `py_compile` + pytest de determinismo/disjuntez del style engine; diff de timeline JSON entre marcas (mismo rubro → distinto arco; distinto rubro → distinto vocabulario).

**POC 4 — Lottie (opcional, ultimo)** *(acentos premium; solo si despues de 1-3 falta "pop"; el de mas friccion de determinismo)*
- Seccion sidebar: **"Acentos (Lottie)"** (toggle para dropear una Lottie de prueba sobre el fondo actual en `<Player>`).
- Deps: `@remotion/lottie@4.0.469` + `lottie-web@^5` en **`/remotion`**; `backend/lottie_search.py`.
- Validacion: `py_compile` + 1 fetch GraphQL real; esbuild bundle; gate de determinismo (rechazar Lotties con expresiones). **No corre en el harness Node** → eyeball obligatorio en `<Player>`.

**Agrupamiento / sinergia:** POC 0+1 son una sola tanda (fondo). POC 2 y POC 3 son la dupla de "anti-patron de verdad" (vocabulario rico + sampling diverso) y conviene hacerlos seguidos. POC 4 es un add-on independiente. **WebGL/three (shimmer per-pixel estilo Stripe) = Fase 2**, solo si el 2D topa: duplica el motor de fondo (preview 2D vs render WebGL), rompe el single-source-of-truth de engineCore, y r3f para React 18 obliga v8.

## 5. Nota de honestidad

Lo que **se puede verificar aca** (sin render, sin ojo de Jero):
- **Compila / bundlea:** `vite build` (frontend), `esbuild` bundle de las composiciones de Remotion (que `engineCore`/gsap/lottie resuelven contra `remotion@4.0.469`), `py_compile`/pytest (backend `style_engine.py`, `lottie_search.py`).
- **Es determinista (estructuralmente):** el harness Node con ctx-2D simulado prueba que `drawFluidBg`/`drawFrame` son funciones puras → misma secuencia de ops o mismos valores numericos `(x,y,opacity)` para mismo `(t,seed)` en dos corridas; distinto seed → distinta salida. Esto es lo unico que demuestra el determinismo SIN render.
- **Las versiones alinean:** `@remotion/lottie@4.0.469` pinea `remotion@4.0.469` exacto; gsap trae todos los plugins en un paquete; el GraphQL de Lottie responde sin auth (verificado en vivo).

Lo que **NECESITA el render real o el ojo de Jero** (no se puede juzgar aca):
- **Si se ve lindo / estilo Canva-Motion:** la estetica final, el "feel" de las easings premium, si el mesh gradient luce bien. El harness ctx-2D **no rasteriza** (no implementa `ctx.filter`/`createRadialGradient` fielmente) → "corre sin tirar" NO prueba el blur ni el gradiente.
- **Paridad preview-vs-MP4:** `ctx.filter='blur()'` puede rasterizar distinto entre el Chrome del preview y el Chromium headless del render (mismo motor, posible distinta version). Si hay drift → fallback offscreen+stamping. Solo el MP4 real lo confirma.
- **Lottie en movimiento:** `@remotion/lottie` no corre en el harness Node; el determinismo de cada asset y como se ve solo se confirma en `<Player>`/MP4.
- **Que la diversidad del director se NOTE:** que dos videos del mismo rubro se vean genuinamente distintos es juicio visual de Jero sobre MP4s renderizados, no algo que el diff de JSON garantice.

Regla de oro para los tres niveles: **"bundlea" ≠ "renderiza" ≠ "se ve lindo".** Yo (y el harness) llegamos hasta "bundlea + es determinista". El "renderiza" y el "se ve lindo" son de Jero.

---

## Validacion contra el codigo real del repo (lo que confirme leyendo los archivos)

La sintesis se hizo desde el brief; estos puntos los verifique abriendo el codigo, y todos dan:

- **El fondo actual es exactamente el hueco #1.** `engineCore.js` `drawBg` (lineas ~84-111) = UN
  gradiente radial de 3 stops del theme + UN glow que respira + 16 "motes" + vineta. Nada mas.
- **POC 0 es real y necesario.** Los 16 motes se posicionan con random NO sembrado al cargar el
  modulo (`engineCore.js:85-88`). Es el unico no-determinismo conocido del nucleo y hay que
  reemplazarlo por un PRNG sembrado antes de confiar en el render paralelo de Remotion.
- **El puente Canvas->Remotion confirma que el fondo nuevo alimenta preview Y MP4 de una.**
  `remotion/src/compositions/TimelineVideo.jsx` dibuja con `drawFrame(ctx, frame/fps, timeline)`
  en un `useLayoutEffect` y escala 405x720 -> 1080x1920. El mismo `engineCore` corre en el preview
  en vivo (`src/pages/Animaciones/engine.js`, `createTimelineEngine`). Una mejora en `drawBg` sube
  las dos superficies.
- **engineCore es Canvas 2D puro:** por eso Lottie va en la capa React de `TimelineVideo.jsx`
  (NO dentro de `drawFrame`), y GSAP se usa como utilities que producen valores `(x,y,opacity)` que
  luego dibuja `drawFrame`. Confirmado el corte de capas que propone la sintesis.
- **GSAP/three/Lottie NO estan instalados.** `remotion/node_modules` (124 entradas) no tiene
  gsap, three ni lottie; el `node_modules` raiz directamente no existe (three esta declarado en el
  package.json del frontend pero no instalado local; Vercel lo instala en deploy). Consecuencia
  importante: `GsapAnimations.jsx` y `AnimeAnimations.jsx` importan gsap/anime desde rutas de
  `node_modules` que hoy NO existen -> esas composiciones experimentales NO bundlean actualmente
  (estan muertas). Esto resuelve la duda que dejaba el brief.
- **El techo de vocabulario del director es literal.** `timeline_director.py` (claude-sonnet-4-6,
  temperature 0.9, max_tokens 4000) ya rota angulo/hook/arco y tiene critico, pero el vocabulario
  libre son `_SCENE_FORMS` (15 formas), `_SCENE_ICONS` (8) y `_SCENE_SHAPE_TOK` (8). Por eso la
  direccion generativa (POC 3) rinde acoplada a 1+2: sin mas vocabulario, solo recombina lo mismo.
- **Enganche de las secciones POC:** se agregan como item en `src/components/Layout/Sidebar.jsx`
  (array `NAV`) + ruta bajo `/studio` en `src/App.jsx`. Aisladas, sin tocar el flujo de produccion.


---

## Fuentes verificadas (por avenida)

### Canva Connect API
- https://www.canva.dev/docs/connect/api-reference/exports/create-design-export-job/ — Export job endpoint: supported formats (jpg/png/gif/pptx/mp4/pdf/csv/html); MP4 quality enum (horizontal|verti
- https://www.canva.dev/docs/connect/api-reference/designs/create-design/ — Create design only produces blank preset / custom-sized / copy / from-template; cannot set text/shapes/layout;
- https://www.canva.dev/docs/connect/api-reference/autofills/create-design-autofill-job/ — Autofill fills only text+image fields of a brand template; no fonts/colors/layout; no video assets; requires C
- https://www.canva.dev/docs/connect/llms.txt — Full Connect API doc index: create-design, autofill, brand templates, resize/merge/import, assets, exports - N
- https://www.canva.dev/docs/connect/ — Positioning of Connect API: upload assets, programmatically create designs for USERS TO EDIT, export back - a 
- https://www.canva.com/developers/reach-beyond/ — Connect APIs free to use; certain APIs restricted to paid/Enterprise plans; integrations act on behalf of a us

### Lottie / LottieFiles
- https://www.npmjs.com/package/@remotion/lottie — Package exists; `npm view @remotion/lottie@4.0.469` confirmed version published, deps remotion@4.0.469, peers 
- https://www.remotion.dev/docs/lottie/lottie — <Lottie> component reference: animationData required, renderer svg|canvas|html, loop/playbackRate/direction, o
- https://www.remotion.dev/docs/lottie/ — Determinism: uses goToAndStop driven by useCurrentFrame(); warns expression-based Lotties may render non-deter
- https://www.remotion.dev/docs/lottie/getlottiemetadata — getLottieMetadata returns dimensions/duration/framerate; durationInFrames rounded down to integer.
- https://www.remotion.dev/docs/lottie/staticfile — staticFile()+fetch+delayRender() pattern to load Lottie JSON without blank/blank-frame errors.
- https://github.com/airbnb/lottie-web/wiki/Renderer-Settings — Canvas rendererSettings.context (shared 2D context) + clearCanvas:false for app-controlled canvas (relevant to
- https://lottiefiles.com/page/license — Lottie Simple License: commercial use/modify/distribute granted, no attribution required; restriction against 
- https://help.lottiefiles.com/hc/en-us/articles/45243303062681-Commercial-Use-Attribution — Free vs premium: free animations commercial-use OK under Simple License; premium carry their own commercial li

### Fondos fluidos
- https://www.remotion.dev/docs/random — Oficial: random(seed) es core de 'remotion', determinista 0-1; por que Math.random() rompe el render multi-thr
- https://www.remotion.dev/docs/noise/noise-2d — Oficial: noise2D/noise3D en @remotion/noise, simplex determinista por seed; depende de simplex-noise (no insta
- https://www.remotion.dev/docs/three — Oficial: deps a instalar (three, @react-three/fiber, @remotion/three, @types/three); determinismo con useCurre
- https://www.remotion.dev/docs/three-canvas — Oficial: ThreeCanvas fuerza frameloop never en render; useFrame (reloj real) no es determinista.
- https://www.npmjs.com/package/@remotion/three — Version actual 4.0.471 (npm; pagina dio 403 al fetch pero la version se confirmo via busqueda).
- https://alexharri.com/blog/webgl-gradients — Deconstruccion tecnica del gradiente fluido Stripe: simplex apilado + warp + blend en fragment shader, funcion
- https://github.com/exzenter/gradient-stripe/blob/main/README.md — whatamesh-like: FBM 3 octavas de simplex + modulacion sinusoidal de UV + blend modes en GLSL; WebGL, zero-dep.
- https://codepen.io/towc/post/what-the-metaball-canvas-guide — Guia canonica metaballs Canvas 2D: gradientes radiales + umbral de alpha, globalCompositeOperation.

### Motion premium con GSAP
- https://gsap.com/pricing/ — Oficial: 'GSAP is now free for everyone, thanks to Webflow's support'; todos los plugins gratis.
- https://gsap.com/community/standard-license/ — Standard License: Permitted Uses (cualquier website/web app/digital interface), Prohibited Uses y Competitive 
- https://scancode-licensedb.aboutcode.org/gsap-standard-no-charge-2025.html — Texto verbatim de la licencia 'gsap-standard-no-charge-2025': grant, permitted/prohibited uses, competitive pr
- https://webflow.com/blog/gsap-becomes-free — Anuncio oficial Webflow: GSAP 100% gratis incl. plugins club, licencia expandida a uso comercial.
- https://www.remotion.dev/docs/third-party — Doc oficial Remotion: animaciones deben driverse por useCurrentFrame; libs con clock propio necesitan sincroni
- https://hyperframes.mintlify.app/guides/hyperframes-vs-remotion — Describe el failure mode (ticker GSAP corre a wall-clock) y confirma que pausar+seek(frame/fps) por frame da r
- https://gsap.com/docs/v3/Plugins/MotionPathPlugin/static.getRelativePosition()/ — MotionPathPlugin.getPositionOnPath(rawPath, progress) -> {x,y,angle}, utility estatica pura para sampling de p
- https://gsap.com/docs/v3/GSAP/gsap.timeline()/ — Timeline como container; seek(time)/progress() para fast-forward/rewind y muestreo sincronico de valores.

### Capa de direccion generativa anti-patron: rediseno de timeli
- https://arxiv.org/abs/2510.01171 — Verbalized Sampling: paper que define la tecnica, mode collapse por typicality bias, 1.6-2.1x diversidad.
- https://github.com/CHATS-lab/verbalized-sampling — Repo oficial con el prompt template exacto (K=5, tau=0.10, samplear de las colas) y API verbalize(prompt,k,tau
- https://arxiv.org/pdf/2510.21150 — String Seed of Thought: seed string en el prompt para diversidad fiel a la distribucion, sirve con temperature
- https://www.remotion.dev/docs/random — API oficial random(seed) determinista y estable entre threads (vs Math.random).
- https://www.remotion.dev/docs/noise/noise-2d — noise2D del paquete @remotion/noise (separado del core), determinista, usa simplex-noise MIT, sin three.js.
- https://www.remotion.dev/docs/using-randomness — Guia oficial de por que Math.random rompe el render paralelo y como usar random(seed).
- https://arxiv.org/abs/2109.10217 — Shape Inference and Grammar Induction: gramaticas de forma para generacion procedural por ejemplo.
- https://www.boristhebrave.com/2020/04/13/wave-function-collapse-explained/ — WFC explicado: generacion por constraints de adyacencia/frecuencia, base para una gramatica compositiva determ

### Rive
- https://rive.app/pricing — Tiers oficiales: Free (sin exports comerciales), Cadet USD 9/seat/mes (max 3), Voyager USD 32/seat/mes, Enterp
- https://github.com/rive-app/rive-runtime/blob/main/LICENSE — Runtime bajo licencia MIT (uso comercial libre, incluido rive-wasm).
- https://rive.app/docs/runtimes/web/low-level-api-usage — Loop de bajo nivel con advance(elapsedTimeSec) manual + draw(); @rive-app/canvas-advanced = contexto Canvas2D.
- https://rive.app/docs/runtimes/web/rive-parameters — API alto nivel: play/pause/stop/drawFrame/start-stopRendering; el loop por defecto es RAF/reloj de pared (no d
- https://rive.app/docs/runtimes/advanced-topic/format — .riv = binario propietario exportado del editor; 'black box', no editable programaticamente.
- https://rive.app/docs/runtimes/web/canvas-vs-webgl — Canvas usa CanvasRenderingContext2D; WebGL2 usa el Rive Renderer (recomendado por performance). canvas-lite qu
- https://skywork.ai/skypage/en/unlocking-rive-ai-editor/1981622296102629376 — Rive Editor MCP server: Early Access, requiere editor desktop (Mac), solo andamia estructura; los animadores p
- https://github.com/rive-app/rive-code-generator-wip — Code generator: lee .riv -> bindings via Mustache; NO escribe .riv.

