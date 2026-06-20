# 🚀 URVID 1.0 — QUÉ SIGUE (leer junto con HANDOFF + FIXES-POSTAUDIT)

> Doc de continuidad escrito antes de un /clear. Si retomás: leé en orden `docs/URVID-1.0-HANDOFF.md`
> (arquitectura), `docs/URVID-1.0-AUDITORIA.md` (la crítica), `docs/URVID-1.0-FIXES-POSTAUDIT.md` (qué se hizo)
> y ESTE (qué falta + cómo). Proyecto en `C:/Users/Usuario/Documents/cliping.ia`. Front auto-deploya en Vercel
> desde `main` (al pushear); backend es LOCAL (start.bat). Todo lo de abajo está pusheado hasta commit `5d6dd7a`.

## ESTADO ACTUAL (hecho + pusheado)
- Motor: **857 módulos**, 13 libs (color, typography, backgrounds, substrates, atmosphere, scene-layouts, markkit,
  datakit, motion, typekit, transitions, post, **layouts**).
- **Solver de composición** (`core/layout.js` + lib `layouts`): escenas piden SLOTS (`place(env,[...])`), llenan el
  área, se adaptan al formato. 20 escenas migradas (el resto son contenedores a propósito).
- **Multi-formato** 9:16/4:5/1:1 + **duración** corto/medio/largo. **Export** "Descargar video" (MediaRecorder).
- **Honestidad de datos**: nunca inventa números/stats/testimonios; las escenas de dato dicen algo (número + etiqueta);
  datakit fabricante EXCLUIDO; todo video tiene un beat de mensaje garantizado.
- **+155 fondos por rubro** (×2 tonos) + **identidad por rubro** (un brief tech usa fondos tech ~60-70%).
- **Tipografía** 43 pairings (+ fix de fuentes que no cargaban en index.html). **Color**: APCA perceptual.
- **Percepción** robusta: repair de JSON, cache por-usuario, botón Re-analizar. **Brand-kit** (logo). **Mis videos**
  en Firestore. **Variantes** para elegir. **Pacing** gobernado. **Transición SECUENCIADA** (A se disuelve → entra B,
  cero solape). **SSRF** cerrado.
- **GATE DE QA VISUAL** (clave): `npm run qa` (o `qa:full` / `npm run gates`) = `tools/urvid1-qa.mjs`, código puro
  SIN API. Detecta tamaños disparejos en listas, ellipsis y solape de tiempos. HOY EN 0. Regla: tras tocar
  escenas/texto/layout, dejarlo en 0. Ver memoria [[feedback-visual-qa-gate]].

## PENDIENTE — 4 pedidos nuevos del usuario (en orden sugerido)

### 1. FLUIDEZ del texto (recurrente, prioridad alta) — [HECHO]
El texto tenia un movimiento de "respiración"/agrandamiento lento que se usaba en TODOS los videos y se veia TOSCO.
Causa confirmada (diagnostico, no adivinanza): el ken-burns global (`render.js` paintScene `kb = motion.life*0.012*sp`,
zoom lento del cuadro que INCLUIA el texto) re-rasterizaba el glifo a escala sub-pixel cuadro a cuadro = shimmer; +
5 sitios en escenas donde `breathe()` escalaba TEXTO legible (numero gigante de hook.bignum, numeros de data.multi,
2 pildoras CTA, chip de comparacion). SOLUCION (opcion a del plan): el CONTENIDO ya NO se escala/deriva de forma
continua -> tras la ENTRADA (offset/zoom que decae, leido como "pop") el texto queda 100% PIXEL-ESTABLE; la vida la
ponen el fondo/sub/atm (sin texto) y la DECO de cada modulo (barras/sheen/glow). `motion.life` sigue en el contrato
de las personalidades pero ya NO mueve el contenido (a proposito; si se quiere push cinematografico va sobre el FONDO).
DIAGNOSTICO NUEVO: `node tools/urvid1-textstill.mjs [seeds]` = difiere 2 frames consecutivos en ventana ASENTADA;
metrica "band" = movimiento residual en la banda de texto. `FOCUS=<substr>` agranda tiles; `STRIP=1` anula fondo
para AISLAR el contenido. RESULTADOS (metrica aislada STRIP): AVG band 0.129 -> 0.047 (-64%); la peor escena de puro
texto (hero.center) 0.607 -> 0.013 (-98%). Visual: cuerpo del glifo NEGRO en el diff (estable); solo deco/fondo se
enciende. Gates OK (QA 0, determinismo, motion, build). Commit local; SIN push (pendiente OK del usuario).

### 2. BIBLIOTECA DE ANIMACIONES pre-hechas (miles, categorizadas)
Buscar e implementar animaciones YA hechas, categorizadas, con descripción de qué hacen (ej: "un carrito clickeado
por un mouse que cambia de color"). Miles. Categorizar + testear que estén bien + aplicarlas según haga falta (a
veces simples, suman profesionalismo). NOTAS/INVESTIGAR: el backend ya tiene `backend/lottie_search.py` y
`backend/iconify_service.py` (Lottie + iconos animados) -> reusar como fuente. urvid es Canvas-2D determinista; para
meter Lottie hay que renderizarlo al canvas (lottie-web/canvas) MANTENIENDO determinismo (avanzar la animación por
`t`, no por reloj). Alternativa más simple/segura: lib nueva `anim/` de micro-animaciones VECTORIALES propias
(determinista, como markkit pero con acción) categorizadas por concepto/rubro + descripción + tags. PLAN: (a) decidir
fuente (Lottie vía lottie_search vs vectoriales propias); (b) contrato de "anim module" (render determinista por t +
metadata: categoría, descripción, rubros, cuándo usar); (c) ola(s) de agentes para llenar; (d) el director las
elige por NECESIDAD (mapear concepto del brief -> animación). Categorización MUY detallada para no errar qué anim va
en qué video. Es trabajo grande -> empezar por el contrato + 20-30 ejemplos + el ruteo, después escalar.

### 3. DIRECTOR/CRÍTICO del guión (verificar el texto ANTES de renderizar) — [HECHO]
> ENFOQUE (usuario, jun 2026 — "haz lo que recomiendes"): opcion 1 = pre-fit por CODIGO + auto-chequeo en la MISMA
> llamada (cero llamadas extra, cero costo). NO se agrego 2da llamada LLM.
> HECHO (commit local, sin push):
> - **`src/urvid/core/script.js`** nuevo: `fitContent(content)` + `BUDGETS` (chars por campo, calibrados al peor slot)
>   + `clipWords` (recorte SIEMPRE en limite de palabra -> nunca "aburri…"). Descarta bullets vacios/imposibles y
>   stats sin value. Puro/determinista. **Cableado en `assemble.js` makeVideo** = un solo choke point (estudio+tests+
>   share) -> el texto se ve COMPLETO en cualquier escena.
> - **`backend/perception.py`**: `_clip_words` (espeja clipWords) en `_normalize` -> caps de salida = BUDGETS del motor
>   (tagline 42 / claim 76 / cta 22 / bullet 30 / label 28 / proof 90 / brand 32), recorte por palabra. `_SYS` con
>   limites de chars por campo + regla de COMPLETITUD + auto-chequeo ("relee cada texto: completo/concreto/fiel/largo").
> - **Fix de escena**: `scene.outro.stamp` cortaba el sub-label (cta/tagline) en su slot chico de 1 linea -> ahora
>   `min:9` (achica en vez de elidir) + maxW un poco mas ancho.
> - **GATE nuevo `tools/urvid1-prefit-check.mjs`** (`npm run prefit`, sumado a `gates`): mete contenido ADVERSARIAL
>   (largo, palabras reales) -> fitContent -> render por rubro x tono x semilla con telemetria -> exige 0 ellipsis.
>   Modo `sweep` para calibrar. VERIFICADO: prefit 0 (320 videos), QA 0, determinismo OK, py_compile OK, build OK.
Mejorar QUÉ se dice + auto-verificar que se MUESTRA completo (a veces los textos salen incompletos/cortados). Un
"director" que CRITICA lo escrito ANTES de aplicarlo al video, para no rehacer videos. La IA del guión re-verifica
cada cosa que va a mostrar + que el texto se vea bien (no cortado). PLAN: (a) en `backend/perception.py`, después del
brief, una pasada de CRÍTICA (mismo Sonnet o barato) que revise: ¿el claim/tagline/bullets son completos, concretos,
del largo correcto para entrar sin cortarse?, ¿coherentes con la página? -> corrige/recorta antes de mandar al motor;
(b) atar a la longitud REAL que el motor soporta por slot (pre-chequeo de fit con la misma lógica de core/text.js);
(c) el gate `npm run qa` ya asegura 0 ellipsis en el render -> el crítico evita que el TEXTO llegue largo de entrada.
Costo: 1 llamada extra barata, sólo si hace falta (cuidar el budget ~$0.10/video).

### 4. "URVID CRAFT" — nuevo item del sidebar (armado manual paso a paso)
Herramienta donde el usuario ARMA el video y ve sus opciones. FLUJO:
1. Pega un link -> análisis (el mejorado del punto 3).
2. Muestra los datos recopilados **SOLO los que se usarán** (no todos).
3. Wizard por PASOS con "siguiente" + ir/volver SIN perder lo hecho (estado persistente por paso).
4. Fase 1 (tras análisis): muestra qué tipo de página/estilo es -> **pregunta al usuario qué ESTILO quiere**, elige
   entre los disponibles.
5. Siguiente: muestra TODO sobre ese estilo y sus combinaciones.
6. Avanza por FASES pasando por TODAS las bibliotecas (8+), el usuario va **seleccionando y armando su propia
   "semilla"** (= su receta).
7. Al terminar: arma el video con esa receta.
MAPEO TÉCNICO (importante): la "semilla" que arma el usuario NO es el número seed, es un **recipe** (color/type/bg/
sub/atm/motion/typekit/mark/transition/post/layout/scenes). `makeVideo` YA acepta `lockRecipe` (reusa una receta
exacta). Cada lib tiene `query(lib,{tone,rubro})` para listar opciones; el estudio ya renderiza previews por módulo.
Entonces Urvid Craft = wizard que por cada lib muestra las opciones (con preview en vivo), el usuario elige, se arma
el `recipe`, y al final `makeVideo({...brief, lockRecipe: recipe})`. Ir/volver = guardar el recipe parcial en estado.
UX/UI **exquisita**: usar la skill `frontend-design` (y/o buscar un enfoque de UI exitoso) + **mismo estilo que el
front de la landing page** (revisar la landing actual para igualar tipografías/colores/espaciado). Ruta nueva en
`src/App.jsx` + item en `src/components/Layout/Sidebar.jsx` + página `src/pages/UrvidCraft/`.
CLARIFICACIONES (RESUELTAS por el usuario, jun 2026):
- ALCANCE: exponer TODAS las bibliotecas pero SIN abrumar -> pasos principales curados (estilo/color/tipo/fondo/
  escenas-arco/transicion-post) + un paso/acordeon "AVANZADO" plegable con el resto (substrate/atmosfera/motion/
  typekit/layout). Todas presentes, pero la complejidad esta escondida por defecto.
- PREVIEWS POR OPCION: cada opcion de biblioteca se muestra como **GIF si el modulo TIENE movimiento** y como
  **ejemplo ESTATICO si NO tiene movimiento**. (El render del preview por modulo es CLIENT-SIDE/Canvas = GRATIS,
  no gasta API; se puede animar en loop = "gif" sin costo de LLM.)
- PREVIEW DEL VIDEO COMPLETO: NO se re-renderiza el video entero en cada paso (opcion 2). Se muestra el preview de
  la OPCION que el usuario toca (los gifs/estaticos de arriba) y el VIDEO completo recien al FINAL. (El usuario
  penso que el live-render costaba plata; aclarado que es client-side/gratis, pero igual prefiere no re-renderizar
  todo el video constantemente -> mas limpio.)
- ESCENAS/ARCO: arco AUTO desde el contenido (#3 strategy) + el usuario puede CAMBIAR cada beat (opcional, defaults
  pre-cargados). NO tedioso.
- MINI-PLAYER "como va quedando": SI, chico y siempre visible (el usuario lo pidio); es client-side (Canvas) -> CERO
  costo de backend en la nube.
- SIDEBAR: item "Urvid Craft" debajo de "urvid 1.0".

CONSTRUCCION EN 3 FASES (para que el usuario vea avances): A esqueleto end-to-end; B motor de previews + pasos curados;
C avanzado + pulido.
ESTADO (commit local, SIN push): **FASE A HECHA** = ruta `/studio/craft` (App.jsx, BrowserRouter, hija de /studio) +
item en Sidebar.jsx (debajo de urvid 1.0) + `src/pages/UrvidCraft/UrvidCraftStudio.jsx` + `.module.css` (TEMA PAPEL de
la landing: #f3f2ee/#16150f, Bricolage Grotesque + DM Sans + JetBrains Mono, OJO la landing NO usa las vars del studio
gris). Framework de pasos data-driven (STEPS extensible) + estado (recipe parcial via keepRecipe + seed FIJO) + paso
Datos (perception reusada + "lo que va a usar el video" + campos editables incl. bullets/stats) + paso Revision (chips
de receta + Crear/guardar en Mis videos + Descargar via MediaRecorder) + MINI-PLAYER en vivo (rAF: en pausa dibuja 1
frame y NO loopea; reproduciendo throttlea el setState de la hora a ~8/s). VERIFICADO EN VIVO: build OK; con un .env.local
DUMMY temporal (no hay .env real local -> el front corre en Vercel; firebase.js tira sin env y deja el root vacio) se
levanto el dev (vite --prefix), se monto una ruta publica temporal y se confirmo por screenshot + getComputedStyle:
tema papel correcto, ambos pasos renderizan, mini-player dibuja frame real. Ruta temporal + .env.local YA removidos.
**FASE B HECHA** (commit local SIN push): motor de previews por opcion + pasos de libreria. Archivos nuevos en
src/pages/UrvidCraft/: `craftLib.js` (optionsFor/sceneOptionsFor por query(lib,{tone}) ordenado por fitWeight, NO pasa
rubro a query; previewMode), `previewLoop.js` (UN rAF maestro throttleado ~24fps + cap 16 draws/tick; cards .active via
IntersectionObserver -> solo lo visible anima; client-side, 0 backend), `OptionCard.jsx` (3 modos: canvas=gif del modulo
EN CONTEXTO via makeVideo lockRecipe override + drawFrame escena aislada/transicion entera; swatch=paleta via mod.derive;
type=muestra Aa+marca con mod.fonts), `OptionGrid.jsx` (cap 24 + "Ver mas" + "Ninguno" para opcionales + la opcion ACTIVA
siempre visible). Estudio refactor: estado picks{slot:id|null, scenes:{beat:id}} -> baseRecipe (auto) MERGE picks ->
fullRecipe -> makeVideo lockRecipe (pinea TODO incl. escenas; keepRecipe NO pinea escenas, por eso lock). Pasos nuevos
Estilo(color+type)/Fondo(bg)/Escenas(swap por beat de su categoria)/Cierre(transition+post opcional). FIX: STEPS dejo de
memoizarse con [] (capturaba closures viejos del estado). VERIFICADO EN VIVO (env dummy + ruta temporal, ya removidos):
Estilo screenshot OK (swatches + muestras de tipo); Fondo 24 canvas con frames REALES (getImageData: 40-57 colores
distintos, no-blank) + seleccion -> receta (chip "fondo: educacion.gridpaper" tras click); Escenas 4 beats por categoria
(31 canvas); Cierre transition+post+Ninguno (30 canvas); 0 errores de consola. (Los gif en pantalla NO se pueden
screenshotear -> el tool espera idle y el rAF anima; se verifico por pixeles/DOM.)
FALTA: FASE C (acordeon "Avanzado" plegable: substrate/atmosfera/motion/typekit/layout/mark; responsive fino;
persistencia/retomar el wizard; animaciones discretas de la landing; "datos que se usaran" mas pulido).

## ORDEN SUGERIDO
1) Fluidez del texto (#1) — chico, alto impacto, recurrente. 2) Director/crítico del guión (#3) — mejora todos los
videos + ataca "textos incompletos". 3) Urvid Craft (#4) — feature grande, UX. 4) Biblioteca de animaciones (#2) —
la más grande, hacer después (contrato + piloto + escalar por olas).

## REGLAS (no romper)
- Tras CUALQUIER cambio de escena/texto/layout: `npm run qa` en 0 (y `npm run gates` antes de cerrar).
- Determinismo (cero Math.random/Date.now en el motor). Texto SIEMPRE por core/text.js. No fabricar datos.
- Tests SIN API/LLM (el gate es código puro). Commits ASCII + trailer; `git pull --rebase` antes de push; push sólo
  cuando el usuario lo pide. Front por Vercel (push), backend local (start.bat).
