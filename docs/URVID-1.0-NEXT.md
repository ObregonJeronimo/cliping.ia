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

### 1. FLUIDEZ del texto (recurrente, prioridad alta)
El texto tiene un movimiento de "respiración"/agrandamiento lento que se usa en TODOS los videos y se ve TOSCO, no
fluido. Causa probable: el ken-burns (`render.js` paintScene `kb = motion.life*0.012*sp`, zoom lento del cuadro
INCLUYE el texto) y/o `breathe()` en contenedores de texto en escenas. Re-rasterizar el glifo a escala sub-pixel
cuadro a cuadro = shimmer/tosco. PLAN: ver con time-strip fino (no adivinar); o (a) sacar el ken-burns del CONTENIDO
(que el texto quede 100% quieto; la vida la dan bg/deco), o (b) reemplazar el zoom por algo que no re-rasterice
(opacidad/posición suaves). Verificar con `node tools/urvid1-motionstrip.mjs` y comparar antes/después. NO romper
el QA. (Ojo: ya se intentó 1 vez sacando la deriva sinusoidal; falta el zoom/breathe sobre el texto.)

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

### 3. DIRECTOR/CRÍTICO del guión (verificar el texto ANTES de renderizar)
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
CLARIFICACIONES a confirmar con el usuario al arrancar #4: ¿"todas las bibliotecas" incluye color+tipo+fondo+sub+atm+
motion+typekit+transición+post+layout+ESCENAS (arco)? ¿o un subconjunto curado para no abrumar? ¿el preview se
actualiza en vivo en cada paso? (recomendado sí).

## ORDEN SUGERIDO
1) Fluidez del texto (#1) — chico, alto impacto, recurrente. 2) Director/crítico del guión (#3) — mejora todos los
videos + ataca "textos incompletos". 3) Urvid Craft (#4) — feature grande, UX. 4) Biblioteca de animaciones (#2) —
la más grande, hacer después (contrato + piloto + escalar por olas).

## REGLAS (no romper)
- Tras CUALQUIER cambio de escena/texto/layout: `npm run qa` en 0 (y `npm run gates` antes de cerrar).
- Determinismo (cero Math.random/Date.now en el motor). Texto SIEMPRE por core/text.js. No fabricar datos.
- Tests SIN API/LLM (el gate es código puro). Commits ASCII + trailer; `git pull --rebase` antes de push; push sólo
  cuando el usuario lo pide. Front por Vercel (push), backend local (start.bat).
