# RESEARCH — Motor "calibre After Effects" para urvid

> Deep research 2026-07-09. Fuentes: 25 documentos primarios (docs Adobe, repos oficiales, licencias)
> + mapa técnico del repo + verificación empírica local de @napi-rs/canvas 1.0.
> Objetivo: apartado NUEVO con motor(es) nuevo(s) — sin tocar urvid IA, advanced ni Kinetic.

---

## 0. Veredicto ejecutivo

1. **La arquitectura que ya tenemos es la correcta.** `drawFrame(ctx, t, video)` puro + seed es
   exactamente el paradigma que Remotion defiende frente a Motion Canvas
   ([comparación first-party](https://www.remotion.dev/docs/compare/motion-canvas)) y la propiedad
   que Motion Canvas **no tiene** (su runtime de generators exige replay desde 0 para seekear,
   [issue #1218](https://github.com/motion-canvas/motion-canvas/issues/1218): no renderiza sin browser).
   **No adoptar ningún runtime ajeno como core.** El motor nuevo extiende el paradigma propio.

2. **El gap no es el easing — es el modelo de datos.** Kinetic ya tiene springs cerrados con
   overshoot, stagger y tipografía por carácter. Lo que no existe en todo `src/`: paths reales
   (`Path2D`, sampleo de longitud), keyframes con speed graph, text animators con range selectors,
   morphing de contornos arbitrarios, motion blur multi-sample, y un grafo de capas con mattes.

3. **Recomendación:** motor nuevo `src/aemotion/` (nombre a definir) con ~8 libs core nuevas,
   2 micro-librerías MIT vendorizadas (`bezier-easing`, `flubber`), reusando de Kinetic el
   director (dna/script/assemble), los springs y el doble-buffer de transiciones. Detalle en §4.

4. **GSAP queda descartado como dependencia** aunque sea gratis desde abr 2025: licencia
   propietaria de Webflow con cláusula explícita contra herramientas no-code de animación visual
   — urvid ES eso. Detalle en §3.

5. **Vía complementaria opcional (fase tardía):** templates AE→Lottie parametrizados con
   `dotlottie-web` (MIT, corre sobre @napi-rs/canvas). Sirve como *biblioteca de escenas
   importadas*, no como motor. Detalle en §5.

---

## 1. Verificación empírica (@napi-rs/canvas 1.0, local, 2026-07-09)

Corrido en este repo (script de prueba, leyendo píxeles para confirmar efecto real):

| Capacidad | Resultado |
|---|---|
| `ctx.filter = 'blur(12px)'` | ✅ FUNCIONA (borde difuminado medido: pixel 54/255 fuera del rect) |
| `ctx.filter` compuesto `blur(8px) contrast(20)` (receta gooey SVG) | ✅ settable (efecto a verificar visualmente) |
| `Path2D` (constructor SVG-string, `fill`, `clip`, `isPointInPath`, `addPath`) | ✅ todo funciona |
| `lineDashOffset` negativo (trim reverso) | ✅ aceptado |
| `getImageData`+pase por píxel+`putImageData` @ 540×960 | ✅ 5.3 ms (≈21 ms @ 1080×1920) |
| Composite ops (`source-in/out`, `destination-in/out`, `lighter`, `multiply`, `screen`, `overlay`) | ✅ todos |

**Caveat browser:** `ctx.filter` en Safari es reciente (Safari 18, 2024). Para el preview en
Safari viejo: feature-detect + fallback (la ruta membrana de §2.9 no usa filter). No afecta
gates (Node) ni Chrome/Edge.

---

## 2. Las 12 técnicas AE → implementación concreta y determinista

### 2.1 Easy Ease / Easing avanzado
- AE parametriza cada lado de un keyframe con **(speed, influence)**, no con 4 coordenadas libres
  ([KeyframeEase](https://ae-scripting.docsforadobe.dev/other/keyframeease/): influence ∈ [0.1, 100],
  speed en unidades/seg del tipo de propiedad).
- **Easy Ease = speed 0 + influence 33.33% en ambos lados**
  ([doc oficial](https://helpx.adobe.com/after-effects/using/speed.html)). Ese es el número mágico.
- Implementación: vendorizar [`bezier-easing`](https://github.com/gre/bezier-easing) (MIT, 1 archivo,
  Newton-Raphson + LUT, mismo algoritmo que Blink/WebKit, usado por React Native). Función pura,
  cero DOM, idéntica en browser y Node.

### 2.2 Speed Graph Manipulation
- Modelo de datos: `key = { t, v, in:{speed,influence}, out:{speed,influence} }` por dimensión.
- Conversión AE → bezier en el espacio (tiempo, valor), para el tramo [k1, k2] con dt=t2−t1:
  ```
  P0 = (t1, v1)
  P1 = (t1 + (i1out/100)·dt ,  v1 + s1out·(i1out/100)·dt)
  P2 = (t2 − (i2in/100)·dt ,  v2 − s2in·(i2in/100)·dt)
  P3 = (t2, v2)
  ```
  Evaluar: resolver x(u)=t con Newton (x es monótona porque influence ≤ 100) y devolver y(u).
  Es la generalización de `cubic-bezier()` de CSS sin normalizar ejes. Cerrado, seek gratis.
- El feature-set de **EaseCopy** (aescripts) confirma los invariantes: eases como datos de primera
  clase, re-normalizados por duración y delta al pegarse en otro segmento — exactamente lo que da
  este modelo. Bonus AE: "roving keyframes" = reparametrización a velocidad constante por longitud
  de arco ([doc](https://helpx.adobe.com/after-effects/using/speed.html)).

### 2.3 Overshoot / Bounce
- **Ya está** (`kinetic/core/motion.js` spring subamortiguado cerrado). Falta exponer la
  **derivada analítica** — necesaria para 2.4 y 2.5:
  ```
  v(t) = (ω²/ω_d) · e^(−zωt) · sin(ω_d·t)      con ω_d = ω√(1−z²)
  ```
  Cerrada, gratis, sin integración.

### 2.4 Squash & Stretch
- Escala anisotrópica con preservación de área: factor `s` en la dirección del movimiento,
  `1/s` perpendicular (área exacta). Guiado por velocidad: `s = 1 + k·clamp(|v(t)|·c, 0, max)`.
- En canvas: `rotate(atan2(vy,vx)) → scale(s, 1/s) → rotate(−θ)`. Con la derivada de 2.3 es
  puro y determinista. Hoy solo la transición `collapse` deforma anisotrópico; esto lo
  sistematiza para CUALQUIER entrada/rebote.

### 2.5 Motion Blur real
- AE: multi-sampling temporal. **16 sub-muestras fijas** por frame (capas 2D), ventana
  `(shutterAngle/360)/fps` seg (180° @ 24fps = 1/48s), `shutterPhase` −50% centra el blur
  ([AE Studio Techniques](https://flylib.com/books/en/2.104.1/motion_blur.html); AE permite hasta
  720° = ventana de 2 frames para blur estilizado).
- Remotion hace lo mismo con N=10 default y **advierte**: promediado destruye color con N alto,
  recomienda 5–10 y revisar ([CameraMotionBlur](https://www.remotion.dev/docs/motion-blur/camera-motion-blur)).
- Nuestro caso es ideal: `drawFrame` ya es evaluable en t±δ → renderizar la CAPA que se mueve
  N veces en offscreen con `globalAlpha = 1/N` y componer. **Por capa con flag, no frame entero**
  (costo N× solo donde hay movimiento rápido). El `ghost()` actual queda como el modo barato.

### 2.6 Kinetic Typography (text animators de AE)
- La spec completa de AE es replicable como función pura
  ([Animating text](https://helpx.adobe.com/after-effects/using/animating-text.html)):
  - **Range selector** = ventana Start/End + Offset con 6 formas de falloff:
    `square, rampUp, rampDown, triangle, round, smooth` — cada una una f(charIndex) trivial.
  - **Ease High / Ease Low** (−100..100): remapeo asimétrico de la curva de selección.
  - `amount(i)` multiplica los **deltas** de las propiedades del animator (pos/rot/scale/opacity/
    tracking/color): `final = base + w_i · Δprop`. Selectores múltiples se combinan con modos
    (Add/Subtract).
  - Wiggly selector con **Correlation** (100% = todos igual, 0% = independientes) y Randomize
    Order **con seed explícito** — AE mismo es determinista acá. Mapea directo a `seedFor()`.
- Base existente: `charLayout` en `kinetic/core/text.js` ya mide por carácter. Se generaliza de
  3 modos hardcodeados a animators declarativos.

### 2.7 Morphing de formas
- Problema central = correspondencia de puntos. [flubber](https://github.com/veltman/flubber)
  (MIT) lo resuelve con un algoritmo simple y portable: resampleo uniforme por perímetro
  (`maxSegmentLength`, knob suavidad/perf) + rotación del anillo minimizando Σ distancias² +
  interpolación lineal; splits/merges (1→N) por triangulación earcut + merge greedy por área.
  Sin `Math.random()` (verificado contra src) → determinista.
- API ideal para nosotros: `interpolate(A, B)` devuelve **interpolador puro f(t)** y acepta/emite
  **arrays de puntos** (cero DOM) → directo a `Path2D` → `fill` (verificado en napi §1).
- Límites documentados: sin compound paths (agujeros) — morphs de glifos con contadores ('o','a')
  necesitan trato aparte; formas muy disímiles degradan. Para nuestro caso (blobs, cards, íconos
  geométricos, siluetas) alcanza sobrado.

### 2.8 Shape Layers (trim paths, repeaters, wiggle paths)
- **Trim paths**: `setLineDash([vis, total]) + lineDashOffset = f(t)` es el primitivo nativo
  ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/lineDashOffset),
  Baseline 2015; negativo verificado en napi §1). Falta el helper de **longitud de path**
  (canvas no tiene `getTotalLength`): flatten adaptativo de beziers + tabla acumulada +
  `pointAtLength` por búsqueda binaria. Eso mismo habilita **follow-path** (que algo VIAJE por
  un trazado — hoy el blueprint de garnish es solo decorativo).
- **Repeater**: N copias con delta-transform acumulado (puro). **Wiggle path**: desplazar
  vértices con noise seedeado por vértice (`seedFor(seed,'wiggle')`), amplitud f(t).
- Shape layer declarativa: `{ path, fill, stroke, trim:{start,end,offset}, repeat, wiggle }`.

### 2.9 Liquid Motion
Tres rutas, todas verificadas viables; usar (a) como default:
- **(a) Membrana vectorial (metaball estilo Paper.js/Hiroyuki Sato):** conectar círculos/blobs
  con dos beziers cuyos handles se calculan de radios+distancia. Resolución-independiente,
  **byte-idéntico entre runtimes**, cero readback de píxeles
  ([survey](https://blog.hyuntak.com/metaball/)). Ideal para gotas que se funden, blobs que se
  parten, CTA "líquido".
- **(b) Blur + threshold raster:** gradientes radiales a offscreen → threshold del alpha
  ([guía canónica](https://codepen.io/towc/post/what-the-metaball-canvas-guide)); borde suave con
  remapeo sinusoidal en vez de corte duro. `ctx.filter` blur funciona en napi (§1); pase de
  píxeles 5.3ms @ 540×960. Para pantallas gooey completas.
- **(c) SDF + smooth-minimum:** `smin(a,b,k) = min(a,b) − h²k/4` con `h = max(k−|a−b|,0)/k`
  ([Quilez](https://iquilezles.org/articles/smin/)); `k` = inflado máximo exacto → knob de
  "gooeyness" animable. La variante que devuelve blend factor permite fundir colores de marca
  donde las formas se funden. Para fondos/transiciones líquidas por campo.

### 2.10 Seamless Transitions
- El doble-buffer de Kinetic ya deforma píxeles (`liquid`, `collapse`). Extender con:
  - **Morph-cut**: silueta dominante de A → silueta de B con 2.7 mientras el resto crossfadea.
  - **Wipe líquido con clip complementario**: cada píxel muestra A o B, nunca ambos (el borde es
    un path de 2.9a) — evita el problema de textos pisados que motivó el secuenciado del motor
    urvid principal.
  - **Match-cut / elemento compartido**: requiere que las escenas expongan "handoff slots"
    (elemento + bbox al entrar/salir) y el compositor tweenea ese elemento POR ENCIMA del corte.
    Es la técnica #1 de los templates tipo youmotion.
- Diseñar el contrato de escena nuevo con esto desde el día 1 (a diferencia de urvid, donde las
  escenas son placas opacas).

### 2.11 Clean & Minimal Motion
- No es tecnología, es curaduría: pocos elementos, holds largos, easing pronunciado (2.1/2.2),
  una sola idea por beat. El DNA de Kinetic ya modela personalidad — el motor nuevo hereda ese
  director y agrega un eje "restraint" (cuánto se anima por beat).

### 2.12 Motion Graphics / composición general
- Falta un **grafo de capas mínimo**: transforms anidados (grupo → hijo), **track mattes**
  (`source-in` / `destination-out`, verificados §1), blend modes por capa, y opacidad de grupo
  vía offscreen. No hace falta un scene-graph tipo AE completo: con 2 niveles (grupo+hoja) y
  mattes se cubren los templates de referencia.

---

## 3. Librerías: adoptar vs robar ideas vs descartar

| Lib | Licencia | Veredicto | Motivo |
|---|---|---|---|
| **bezier-easing** | MIT | **VENDORIZAR** | 1 archivo, algoritmo Blink/WebKit, puro, dual-runtime perfecto |
| **flubber** | MIT | **VENDORIZAR/ADOPTAR** | interpoladores puros f(t), arrays de puntos sin DOM, determinista verificado |
| **earcut** | ISC | adoptar si hacemos splits 1→N | ya es dependencia de flubber |
| **Motion Canvas** | MIT | **ROBAR IDEAS** | señales (grafo reactivo de valores puros — resuelve theme→layout→anim) y combinadores `all/chain/sequence/loop` **re-expresados como álgebra de intervalos en forma cerrada**; su runtime de generators rompe seek y no corre headless |
| **Revideo** | MIT | robar ideas (parametrización de templates) | headless necesita Chromium → incompatible |
| **Theatre.js** | core Apache-2.0 | prior art de keyframes serializables | pesado; nuestro modelo de §2.2 es más simple |
| **anime.js v4** | MIT | no necesario | seek determinista verificado (`tl.seek(ms)` con autoplay:false) — sería el plan B si no hiciéramos keyframes propios |
| **GSAP (+MorphSVG, SplitText)** | **propietaria Webflow** | **DESCARTAR como core** | gratis desde 2025-04-30, PERO: "Prohibited Uses" = herramientas no-code de animación visual que compitan con Webflow ([licencia](https://gsap.com/community/standard-license/)) — urvid es exactamente eso; prohíbe reverse-engineering para productos competidores; sin historia first-class en Node sin DOM (staff oficial → Puppeteer) |
| **Rive** | runtime OSS, editor propietario | **DESCARTAR** | headless real = binario C++ GPU (Metal/Vulkan) fuera de proceso — incompatible con Vercel estático + napi/Windows |
| **Remotion** | source-available (gratis ≤3 empleados) | no aplica | su `@remotion/web-renderer` (alpha) es literalmente nuestro stack actual (WebCodecs+mediabunny) — no suma nada sobre el motor propio |
| **dotlottie-web** | MIT | **OPCIONAL fase tardía** (§5) | runtime de templates AE→Lottie parametrizado |

*(Claims sobre Remotion corregidos por verificación adversarial: la afirmación "requiere Chromium
sí o sí" es falsa hoy — existe render en browser experimental; y es gratis para empresas ≤3
personas. No cambia el veredicto: no aporta nada al caso urvid.)*

## 4. Arquitectura recomendada — `src/aemotion/` (motor nuevo, apartado nuevo)

**Mismo contrato del ecosistema:** `makeMotionVideo({brief, seed}) → video` +
`drawFrame(ctx, t, video)` puro; PRNG solo vía `seedFor(seed, ns)`; gates de determinismo
idénticos a kinetic-test. Los 3 estudios existentes NO se tocan.

```
src/aemotion/
  core/
    keys.js      ← keyframes + speed graph AE (speed/influence) + bezier-easing vendorizado
    path.js      ← Path2D: parse, flatten, tabla de longitud, pointAtLength, trim, transform
    morph.js     ← correspondencia de puntos (flubber vendorizado) + morph-cut helpers
    shapes.js    ← shape layers declarativas: fill/stroke/trim/repeater/wiggle
    liquid.js    ← membrana metaball vectorial + smin SDF (+ ruta blur/threshold)
    textfx.js    ← text animators: range selectors (6 shapes, easeHigh/Low, modes, seed)
    blur.js      ← motion blur multi-sample por capa (shutterAngle/phase/samples 8–16)
    layers.js    ← grafo mínimo: grupo+hoja, track mattes, blend modes, opacidad de grupo
  (reusa de kinetic: motion.js springs + derivada analítica nueva; dna/script/assemble como
   director; el doble-buffer de transiciones extendido con morph-cut/wipe-clip/match-cut)
  libs/scenes/   ← escenas nuevas que consumen todo lo anterior
```

- **Frontend:** `/studio/motion` nuevo en el sidebar (patrón KineticStudio: canvas + loop con t,
  export por el pipeline WebCodecs+mediabunny existente).
- **Gates:** `aemotion-test` (determinismo byte-idéntico) + entrar a `npm run gates`.
- **Verificación:** tool tipo `kinetic-shot.mjs` (con `setScratchFactory` — obligatorio o las
  transiciones caen a corte seco) + contact-sheet + Read del PNG + `urvid1-textstill` para shimmer.

**Fases sugeridas:**
- **F1 — cimientos:** `keys` + `path` + `shapes` (trim/repeater) + derivada del spring +
  squash&stretch. Con esto solo ya salen escenas nivel "template SaaS" básico.
- **F2 — firma visual:** `morph` + `liquid` (membrana) + `blur` multi-sample + `textfx` completo.
- **F3 — seamless:** contrato de handoff entre escenas + morph-cut/wipe-clip/match-cut + director
  (DNA con eje restraint) + estudio `/studio/motion` + gates.
- **F4 (opcional) — §5.**

Riesgos conocidos: (1) morph de glifos con agujeros — fuera de alcance F2, usar siluetas;
(2) blur multi-sample × capas = costo — cap por escena y solo capas marcadas; (3) `ctx.filter`
en Safari viejo — feature-detect, la membrana no lo necesita; (4) el contrato de handoff entre
escenas es diseño nuevo — prototipar antes de fijar API.

## 5. Vía complementaria opcional: templates AE→Lottie parametrizados (dotlottie-web)

Para tener *literalmente* animaciones autoradas en After Effects dentro de urvid:
- [`dotlottie-web`](https://github.com/LottieFiles/dotlottie-web) (MIT, activo): core Rust/WASM
  (ThorVG), **isomórfico browser + Node 18+**, con
  [ejemplo oficial sobre @napi-rs/canvas](https://github.com/LottieFiles/dotlottie-web/tree/main/examples).
- Parametrización por marca sin re-export: **themes/slots** (color, escalares, gradientes, texto,
  imágenes — [doc](https://developers.lottiefiles.com/docs/tools/dotlottie-js/theming/)) y
  **Motion Tokens** (texto/color/transforms runtime). Gotcha: los slots se marcan AL AUTORAR
  en AE — archivos de marketplace ajenos no son tematizables si no vienen slotteados.
- **Gotchas serios** (por eso es fase tardía y opcional):
  1. Es un WASM que pinta píxeles — NO componible con nuestro compositor; tratarlo como capa
     pre-renderizada (fondo/overlay/escena completa).
  2. El patrón oficial de captura usa el reloj del player; para nosotros hay que conducirlo con
     `setFrame(n)` + `useFrameInterpolation:false` y **verificar determinismo byte-idéntico**
     antes de meterlo a gates (no está garantizado por docs).
  3. Ejemplo oficial probado contra @napi-rs/canvas 0.1.x; nosotros usamos 1.0 — verificar.
  4. Suma ~1 binario WASM al bundle de Vercel y al runtime de tools.

Valor: catálogo infinito de escenas "AE de verdad" autoradas por Jero en AE con slots → `.lottie`
en `public/` → escena `lottie-import` en el motor nuevo con colores/copy del brief.

## 6. Qué NO perseguir (callejones verificados)

- **GSAP como motor** (licencia + Node sin DOM) — §3.
- **Rive** (headless GPU nativo; editor propietario; adopción del renderer headless casi nula).
- **Adoptar Motion Canvas/Revideo como runtime** (generators = seek por replay; headless =
  Chromium; nuestro modelo cerrado es superior para este caso).
- **Física real (matter.js etc.)**: integradores numéricos rompen seek-anywhere; todo lo que
  necesitamos (bounce, settle, wobble) ya sale de curvas cerradas.
- **Ken Burns / micro-cámara sobre contenido**: ya medido en la ola visual (shimmer 0.735 = toso).
  La vida va en fondo/capas, no en el texto — el motor nuevo hereda esa regla: motion blur y
  squash van en ELEMENTOS, el texto asentado queda pixel-estable.
