# 🔬 INVESTIGACION — motion pro, morphs fluidos y unicidad para Urvid

> Resultado del workflow `urvid-research-motion` (jun 17): 38 hallazgos, 35 factibles, **22 confirmados**
> (existen de verdad + son factibles para el motor Canvas-2D determinista headless), 0 refutados. Cada hallazgo
> trae fuente (URL). Verificados por un revisor escéptico contra las reglas del motor.
>
> **OJO con las rutas:** el agente sintetizador asumió `shared/*.ts`. El repo real es `cliping.ia` y el motor vive
> en `src/pages/Animaciones/engineCore.js` (JS, un solo archivo) + `backend/` (Python). Los "módulos" propuestos
> abajo son la ARQUITECTURA recomendada (a crear), no archivos existentes. Confirmar puntos de integración reales
> en engineCore.js antes de tocar código.

## Regla de oro (cruza todo)
Nada introduce `Math.random`/`Date.now`. Todo seed = `mulberry32(hash(brandUrl))`; todo tiempo = `frame/fps`.
Lo que rasterice con Cairo (node-canvas: Two.js, lottie-node) **NO** entra al pipeline de píxeles: se usa solo para
calcular geometría/paths y se redibuja con el `ctx` de Skia/Chromium (si no, se rompe el determinismo cross-render).

---

## Hallazgos confirmados (22) — por categoría

**Morph de formas (lo que más pide el usuario):**
- **flubber** (MIT, veltman) — interpolación best-guess entre 2 formas 2D arbitrarias; corre en Node SIN DOM.
  `interpolate(pathA, pathB, {maxSegmentLength:4})` → función pura del tiempo. Resuelve inversiones/saltos. **USAR directo.**
- **polymorph-js** (MIT) — morph por poly-bézier (preserva curvas, no poligoniza). **Precomputar** correspondencia en build, interpolar con lerp+bezierCurveTo en runtime (no meter la lib en caliente).
- **smin de Inigo Quilez** + **metaballs + marching squares** — fusión orgánica de SDFs **solo en la juntura** (variantes CD, NO las exponenciales) → blobs INTENCIONALES anti-gloop; contorno VECTORIAL (no raymarch por píxel).
- **Zach Lieberman** — matching óptimo de puntos (greedy NN o Hungarian) + camino curvo (Dubins) → morph sin torsiones cuando flubber no alcanza.
- **shapeIndex / alineación de anillo** (idea de GSAP MorphSVG, portada) — normalizar winding + rotar el anillo para minimizar Σ|A−B|². Pegamento de calidad de TODO morph.

**Motion / timing:**
- **Spring en forma cerrada (analítico)** — oscilador amortiguado, determinista por frame, sin integrar. Unifica el motion entre Skia (QA) y Chromium (Remotion).
- **Remotion `spring()`+`interpolate()`** — ya es el motor de MP4; primitivas nativas, `renderStill()` para QA de 1 frame.
- **Choreography** — stagger (`delay_i=i*step`), easing de autor (back/elastic), FLIP en Canvas (bbox first/last → translate/scale).
- **anime.js v4 / GSAP 3.13** (ambos gratis comercial) — como motor de VALORES (timeline pausada + `seek(t)`/`update(t)`, animar objetos planos, dibujar vos en ctx). **Posponer** (ya se cubre con spring+stagger propios).
- **Rive** — NO el runtime; portar el PATRÓN de **state machines / blend trees** (poses paramétricas + `blend(A,B,energia)`).
- **Codrops** — tipografía cinética: draw-on por `stroke-dashoffset` (paths de glifos con opentype.js) + stagger por letra.

**Unicidad / generativo:**
- **PRNG sembrado por hash + sub-seeds por namespace** (modelo fxhash/SFC32) — `seedFor('color')`, `seedFor('motion')`… para que iterar un generador no desbarajuste los otros.
- **Parameter-space ortogonal + distribuciones sesgadas** (QQL/Tyler Hobbs) — ejes continuos independientes + `weightedPick`/`gaussianAround` con colas raras; **auditar acoplamientos** (que "estilo" no fije paleta+layout juntos). Es el corazón de "no parecer plantilla".
- **Flow fields (Fidenza, Tyler Hobbs)** — fondo/energía por simplex-noise sembrado; energía/dureza = step_length + cuantización del ángulo.
- **Paletas ColourLovers + WCAG** (Matt DesLauriers) — ~200 paletas curadas embebidas + `wcag-contrast` (MIT) para texto/scrim. Mata el color random feo.

**Sistemas:**
- **Remotion** (ya integrado) — reforzar la regla anti-random; seed solo de (marca, escena, frame).
- **Two.js / Lottie(skottie) / Theatre.js** — con CAVEATS (ver "NO adoptar").

---

## ROADMAP — orden de ataque (12 acciones más valiosas)

### (1) QUICK WINS (técnica pura, riesgo bajo)
1. **`spring()` + `interpolate()` unificados** — base de todo; unifica motion Skia↔Remotion. *(bajo)*
2. **PRNG sub-seeds por namespace** — estabilidad entre versiones. *(bajo)*
3. **`features` ortogonal + distribuciones sesgadas** — EL motor de unicidad (10-12 ejes independientes, rangos continuos, motif/firma constante por marca). *(medio, MÁXIMO impacto en "único")*
4. **Paletas ColourLovers + WCAG** — quick win visible, mata el pálido feo. *(bajo)*
5. **shapeIndex / alineación de anillo** — prerequisito de cualquier morph bueno. *(medio)*

### (2) APUESTAS MEDIANAS
6. **Flubber** — morph fluido sin blobs, YA (adoptar lib; estabilizar orden de vértices + test cross-render). *(medio)*
7. **Choreography (stagger + FLIP + easing de autor)** — sensación PRO sin libs. *(bajo)*
8. **smin + metaballs + marching squares** — fondo orgánico anti-blob INTENCIONAL. *(medio)*
9. **Tipografía cinética draw-on + stagger por letra** — heroes tipográficos VIVOS (ataca el "hero estático"). *(medio)*

### (3) LA BIBLIOTECA INMENSA (lo que pidió el usuario)
10. **Catálogo sembrable**: `backgrounds/` (flowField, metaballs, gradientes, partículas) + `shapes/` (SDFs, iconos de rubro, contornos) + `motion/` (spring, stagger, drawOn, flip, blend), cada entrada PURA con firma `render(ctx, prng, frame, fps, params)`. **`features` ES el selector del catálogo** → explosión combinatoria coherente (modelo QQL: 30M outputs únicos del mismo "mundo"), con motif constante por marca para que no sea caótico.
11. **Blend-tree (patrón Rive)** — N poses paramétricas por escena + `blend(A,B,energia)`; agregar una pose MULTIPLICA salidas en vez de sumar un caso.
12. **Flow fields** como primer fondo "grande" del catálogo + **QA cross-render como gate** (todo módulo nuevo entra con test que compara Skia vs Chromium frame a frame; divergencia = orden de vértices o rasterizador colado).

### Refinamientos (solo si algo no alcanza)
- Matching óptimo + Dubins (Lieberman) si flubber tuerce. · polymorph para curvas si el facetado se nota. · GSAP/anime solo si la orquestación a mano se vuelve inmanejable.

### NO adoptar (honestidad)
- **Two.js / Lottie(skottie) en runtime**: rasterizan con Cairo ≠ Skia → 2º motor de píxeles rompe determinismo. Solo para geometría o precompilar a bitmap.
- **`@theatre/studio`**: AGPL → nunca en build de producto cerrado (`@theatre/core` Apache sí, para leer curvas).
- **Motion Canvas / Rive runtime**: no verificados headless-determinista; de Rive solo el patrón de blend trees.

---

## Fuentes clave
flubber https://github.com/veltman/flubber · IQ smooth-min https://iquilezles.org/articles/smin/ ·
marching squares https://github.com/gnikoloff/marching-squares · polymorph https://github.com/notoriousb1t/polymorph-js ·
GSAP gratis https://css-tricks.com/gsap-is-now-completely-free-even-for-commercial-use/ · anime v4 https://animejs.com/documentation/engine/engine-methods/update/ ·
Remotion randomness https://www.remotion.dev/docs/using-randomness · Tyler Hobbs flow fields https://www.tylerxhobbs.com/words/flow-fields ·
Hobbs distribuciones https://www.tylerxhobbs.com/words/probability-distributions-for-algorithmic-artists ·
fxhash/genart PRNG (SFC32) · Codrops https://tympanus.net/codrops/ · Zach Lieberman daily sketches 2021 · canvas-sketch (DesLauriers) + ColourLovers API.
