# Plan de calidad cinematográfica — cliping.ia

> Objetivo: que los videos se vean SUPER PRO (efectos fluidos y modernos), que la IA
> nunca repita patrones, y que el cliente nunca sepa qué va a salir pero siempre quede
> buenísimo y atractivo para el público de la página a la que se le hace el video.

## Principio rector
Lo "pro" NO viene de efectos llamativos, viene de FUNDAMENTOS: timing, curvas de
movimiento, profundidad y sonido. El exceso de efectos hace ver amateur. La variedad
sale de AZAR CURADO (opciones vetadas a mano), no de azar puro: el piso de calidad
nunca baja, pero dos videos nunca se sienten iguales.

Validación: cada cosa se controla con frames renderizados en navegador (look) y un
render real en la máquina del dev (movimiento). Iterar.

---

## FASE 1 — Sistema de movimiento central  [MÁXIMO ROI]
Archivo nuevo: `remotion/src/templates/motion.js` que TODAS las escenas consumen.
- Librería curada de ~6 curvas easing (cubic-bezier) + presets de spring con
  OVERSHOOT (se pasa y vuelve) y ANTICIPATION (retrocede antes de arrancar).
- Helpers compartidos: enter(), stagger(i), cameraDrift(), parallax(layer), float(),
  breathe() (gradientes/escala que respiran). Nada aparece de golpe ni se mueve lineal.
- "Nada está nunca quieto": deriva de cámara lenta + parallax (capas a distinta
  velocidad) + flote sutil en cada escena. El frame nunca se congela.
- MOTION BLUR (el truco clave de "fluido"): integrar `@remotion/motion-blur`
  (Trail / CameraMotionBlur). Los movimientos rápidos con blur se sienten caros.
- CameraRig: wrapper de profundidad multicapa que envuelve cada escena.
- Refactor de las escenas actuales (Kinetic/Integration/Mockup/Cta/IconTransform)
  para usar motion.js en vez de interpolate ad-hoc.
Dep nueva: @remotion/motion-blur.

## FASE 2 — Transiciones con continuidad  [donde vive lo "fluido"]
Hoy: solo crossfade (es lo que más delata). Objetivo: POOL de transiciones elegidas
por corte, con continuidad:
- Usar `@remotion/transitions` (slide, wipe, clockWipe, fade, none) + custom:
  zoom-through (entrás dentro de un ícono y abre la próxima escena), whip-pan,
  mask wipes, shared-element (un elemento de A se transforma y se vuelve B).
- VideoFromSpec pasa a usar TransitionSeries; la transición de cada corte se elige
  de un pool curado según theme/mood (no siempre la misma).
Dep nueva: @remotion/transitions.

## FASE 3 — Sonido  [barato, golpe de efecto enorme; ~40% de la calidad percibida]
- Cama musical (librería royalty-free curada, elegida por mood/theme).
- Whooshes en transiciones + ticks sutiles en entradas.
- Cortes sincronizados al beat (bpm -> frames por beat; alinear duración de escenas).
- Implementación: assets en remotion/public/audio; el director elige track por mood;
  escenas/transiciones colocan <Audio> con sfx.
- PENDIENTE definir: fuente de música royalty-free (librería propia curada o API con
  licencia comercial). Es un requisito legal, no técnico.

## FASE 4 — Capa de "finish" global
Overlay aplicado sobre TODO el video en VideoFromSpec:
- Grano de film sutil (mata el look "plano digital"), bloom en lo brillante, barridos
  de luz, viñeta apenas, micro chromatic aberration opcional.
- Gradientes mesh de 3+ paradas en los fondos de theme; sombras suaves.
- Técnica: filtros SVG / overlays con blend modes / divs animados.

## FASE 5 — Motor de variación (azar curado)  [la obsesión: nunca repetir]
El director arma por video una DIRECCIÓN DE ARTE eligiendo de opciones curadas:
- motivo visual (cards flotando / blobs líquidos / grilla / partículas / aurora)
- familia de entrada + familia de easing
- set de transiciones
- tratamiento de acento
Todo de opciones vetadas a mano -> piso de calidad fijo, combinatoria enorme.
+ LAYOUTS POR ESCENA: cada escena soporta 2-4 layouts (prop `variant`); el director/
  randomizer elige. La combinatoria (escenas x layouts x motivo x easing x transición
  x copy x theme) hace que dos videos nunca se sientan iguales.

## FASE 6 — Cohesión con la marca real
Que el video se sienta hecho a medida, no plantilla:
- Extraer del sitio: colores reales (paleta del screenshot/CSS/og image), logo
  (favicon/og:logo) y screenshots.
- Construir un theme override por marca al vuelo + usar logo/screenshots en
  MockupShowcase y en el cierre.

## FASE 7 — Más tipos de escena + variantes  [EN CURSO]
Cada escena nueva multiplica variedad y repertorio cinematográfico:
- StatReveal (número que cuenta), FeatureList (filas con íconos en stagger),
  Comparison (antes/después, vs), Testimonial/Quote, SocialProof (logos/avatars en
  arco), BigText/Logo reveal.
- Cada una themeable + con layouts variantes (alimenta la Fase 5).

HECHO (en `main`):
- 5 escenas nuevas en `remotion/src/templates/scenes/`: StatReveal, FeatureList,
  Comparison, Testimonial, SocialProof. Todas themeables, usan `motion.js` (cámara,
  parallax, stagger, springs) y consumen `durationInFrames` por prop.
- Registradas en `VideoFromSpec.jsx` (REGISTRY) y en el director: catálogo de escenas,
  `valid_types`, variantes de layout (`SCENE_VARIANTS`) y resolución de íconos
  (FeatureList resuelve `item.icon` vía Iconify, igual que IconTransform; ahora en paralelo).
- Reglas de HONESTIDAD en el director: StatReveal/Testimonial/SocialProof solo si hay
  datos reales del sitio (no inventar cifras ni testimonios).
- Variantes por escena: StatReveal (stack/ring/left), Comparison (sideBySide/stacked),
  Testimonial (card/plain), SocialProof (arc/row), FeatureList (cards/bare).

PENDIENTE de Fase 7:
- BigText/Logo reveal (usar logo real del sitio, enlaza con Fase 6).
- QA del render animado real en Windows y ajuste fino de timings por escena.

---

## Orden recomendado por ROI
1. Fase 1 (movimiento + motion blur) y Fase 2 (transiciones): el salto más grande,
   aplicado a las escenas que YA existen, sin construir nada nuevo.
2. Fase 3 (sonido): barato y enorme.
3. Fase 5 (motor de variación): garantiza el "nunca repite".
4. Fase 4 (finish global).
5. Fase 6 (marca real) + Fase 7 (más escenas).

## Honestidad / costos
Motion blur, audio y la capa de finish AUMENTAN el tiempo y costo de render (más
cómputo por frame). Es relevante para el plan de nube (docs/PLAN_NUBE.md): el costo
por video va a subir respecto del estimado actual. Conviene medir el render después
de Fase 1 y 4.

## Dependencias nuevas a sumar
@remotion/motion-blur, @remotion/transitions, fuente de música royalty-free,
y una lib de extracción de paleta de color para Fase 6.
