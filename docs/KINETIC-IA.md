# KINETIC IA — motor nuevo de videos calibre After Effects

> **Qué es**: un MOTOR NUEVO y SEPARADO (no es una mejora de urvid): `src/kinetic/` + estudio propio
> "Kinetic IA" en el sidebar, con su galería de videos guardados. Mismo flujo de entrada que urvid IA
> (pegás un link → el backend analiza la página → video), pero el resultado es un video del género
> **manifiesto tipográfico cinético**: la calidad y las mecánicas de un video hecho a mano en After
> Effects. **$0.00 por video** — 100% procedural, canvas 2D, render y export en la PC de cada usuario.
>
> Referencia de calidad: https://www.instagram.com/reel/DZW488fvMyn/ (@crestivmotion), bajado y
> analizado frame a frame (481 frames @ 30fps). NO replicamos ese video: construimos un motor que
> **genera infinitos videos distintos de ese género y ese calibre**.

---

## 1. La investigación (reel de referencia, frame a frame)

Ficha: 720×1280, 30 fps, 16.03 s, 13 escenas (~1.2 s promedio). El reel es split-screen
"Wireframe vs Render" (gimmick para presumir AE — eso no se copia). Lo que importa es el lenguaje:

| # | t (s) | Escena | Técnica clave |
|---|-------|--------|---------------|
| 1 | 0.0–1.0 | Canvas blanco vacío | *breathing room*; blob rosa entra con **wipe líquido** desde el borde |
| 2 | 1.0–2.0 | Rombo gradiente + "Design isn't" | **morph blob→rombo**; guías punteadas como decoración intencional |
| 3 | 2.0–3.2 | "Decorations." full-bleed | rombo **expande a full-bleed**; gradiente mesh **animado** |
| 4 | 3.2–3.6 | Transición colapso | la escena se **enrolla como cilindro** (bordes espejados) y colapsa en **esfera** sobre negro |
| 5 | 3.6–4.6 | Esfera→punto en negro | encoge a un punto con ease larguísimo — pausa dramática |
| 6 | 4.6–6.0 | Píldora "It's clarity." | píldora auto-dibujada; collage entra; tile bauhaus pop; arco dashed |
| 7 | 6.0–7.3 | "ITS MOTION" | **typewriter letra-por-letra** (letra nueva "cae" desde superíndice); tile bauhaus cicla patrones |
| 8 | 7.3–8.3 | Zoom-out a tarjeta | la escena **encoge a card con borde** flotando; "Every frame deliberate." palabra-por-palabra |
| 9 | 8.3–10.3 | "Every story" gigante | kinetic type letra-por-letra (gris→negro); blob gradiente animado detrás |
| 10 | 10.3–11.5 | "Alive." | mismo typewriter en blanco; gradiente satura y vira hue |
| 11 | 11.5–13.0 | "Brands 📷 don't wait." | **token polaroid INLINE** en la frase, pop+wobble, foto cicla (mini-slideshow) |
| 12 | 13.0–14.2 | "They transform." | **collage polaroids**: 5 fotos vuelan con overshoot+rotación |
| 13 | 14.2–16.0 | Marca + "makes it happen." → end card | logo por path; hard cut negro→blanco; tagline chico |

### Las 16 técnicas del género (la biblioteca a construir)

1. **Typewriter letra-por-letra** con settle por letra (gris→tinta; variante "cae desde superíndice")
2. **Reveal palabra-por-palabra** con palabras futuras atenuadas
3. **Token media inline** en una frase (polaroid con pop+wobble+ciclo de fotos del sitio)
4. **Gradiente mesh animado** (blobs radiales que derivan y viran hue)
5. **Wipe líquido** (blob orgánico que crece desde un borde)
6. **Morph de forma** (blob→rombo→full-bleed)
7. **Transición colapso-esfera** (cilindro+espejo+encoger a punto)
8. **Punto que respira** (~2 s un solo elemento — pacing con silencio visual)
9. **Zoom-out a tarjeta** (escena queda como card con borde)
10. **Tiles bauhaus** que ciclan patrones al beat
11. **Collage polaroids** con overshoot+rotación
12. **Garnish blueprint** (círculos dashed, arcos, cruces anchor — EN el render, intencional)
13. **Píldora/badge auto-dibujada** (borde→texto)
14. **Logo por path**
15. **Hard cuts al beat** + alternancia de polaridad (negro/blanco/gradiente) escena a escena
16. **Overshoot/settle spring en todo** + motion blur fake en movimientos rápidos

**Regla de oro**: pocas cosas por frame, tipografía enorme, contraste de polaridad entre escenas,
cortes al beat. La "calidad AE" es **80% easing+timing, 20% efectos**.

---

## 2. Por qué motor nuevo (y qué hereda de lo aprendido)

- urvid (actual) es un motor de **composición por layout**: escenas ricas, paneles, listas, datos.
- Kinetic es un motor de **dirección por beats**: 1 idea por escena, tipografía gigante, ritmo.
  Mezclarlos degradaría a los dos. Motores separados, cada uno con su registry y su receta.
- Lo que Kinetic hereda como PATRÓN (probado en urvid, re-implementado limpio): determinismo por
  seed (PRNG namespaced), registry de módulos con weights, contrato de texto NUNCA-desborda,
  doble-buffer para transiciones, gates de calidad en Node + contact-sheet visual, export WebCodecs.

## 3. El problema de la variedad — "Style DNA"

Requisito central de Jero: que los videos **no se parezcan entre sí ni delaten la fábrica**.
Ya se probó "que la IA idee un video desde 0 sin patrones" → salió mal. El camino es
**biblioteca de código combinatoria** + un sampler coherente:

- **Style DNA**: por seed se elige UNA VEZ por video un bundle coherente de ejes independientes:
  voz tipográfica (par de fuentes + case + ritmo de pesos), historia de color (duotono / mesh /
  mono+acento / papel / neón-oscuro, derivada de brandColor+rubro), dialecto de movimiento
  (parámetros CONTINUOS de spring/overshoot/stagger — floats del seed, no opciones discretas),
  patrón de polaridad, dialecto de garnish (blueprint/bauhaus/orgánico/ninguno), textura, y
  plantilla retórica del guion.
- **Motor de guion**: claim/tagline/bullets/testimonios → beats con plantillas retóricas
  (contraste "X no es Y / es Z" — la del reel —, enumeración, pregunta→respuesta, stat-punch,
  manifiesto declarativo), moduladas por audience.awareness/register.
- **Anti-fingerprint**: nada fijo entre videos (ni fuente, ni layout de CTA, ni posición de logo,
  ni grain). Los ejes continuos hacen que ni dos videos de la misma familia sean idénticos.
- El espacio combinatorio (ejes discretos × continuos) da millones de direcciones de arte;
  la probabilidad de que dos videos del mismo rubro compartan más de 2-3 rasgos es despreciable.

## 4. Arquitectura (v1)

```
src/kinetic/
  index.js            barrel: makeKinetic(brief,{seed}) + drawFrame(ctx,t,video)
  core/
    prng.js           seedFor namespaced (patrón urvid, copia limpia)
    motion.js         springs cerrados deterministas, stagger, ghost (motion blur fake)
    text.js           fit nunca-desborda + drawKinetic por carácter (gris→tinta, caída, settle)
    shapes.js         blobPath paramétrico, morph polar blob↔rombo↔rect
    dna.js            Style DNA sampler (ejes discretos + continuos)
    script.js         claim/bullets → beats (plantillas retóricas)
    assemble.js       makeKinetic: DNA + guion + picks → receta kinetic
    render.js         drawFrame por beats + ventana de transición (doble buffer propio)
  libs/
    scenes/           módulos kinetic.* (typewriter, wordreveal, inline, collage, respiro, card…)
    transitions/      cut / fade / blobwipe / collapse / cardzoom
    backgrounds/      placas por polaridad + mesh gradiente animado (APCA-safe por clamp de L)
    garnish/          blueprint / bauhaus / píldoras
src/pages/Kinetic*/   estudio "Kinetic IA": URL → analizar (mismo backend) → preview → variante →
                      export (reusa exportVideo con drawFrame propio) → galería de guardados
tools/kinetic-*.mjs   gates: determinismo, texto, contact-sheet visual
```

- **Escenas pintan su propia placa full-bleed** → la alternancia de polaridad es regla del arc,
  no probabilidad.
- **Transición colapso** = 3 drawImage con escalas sobre el buffer (cilindro fake) → corre en
  cualquier PC. Sin WebGL en v1.
- **Beat grid**: bpm por jingle (tabla medida a mano, gratis) → los cortes caen al beat.

## 5. Costo y dónde corre

| Concepto | Costo/video |
|---|---|
| Render + export (canvas 2D + WebCodecs, PC del usuario) | **$0.00** |
| Música/SFX (jingles + Kenney CC0 ya en el repo) | $0.00 |
| Fuentes (Google Fonts ya integradas) | $0.00 |
| Imágenes (las captura el backend del sitio del cliente) | $0.00 |
| **Total** | **$0.00 ≤ $0.10 ✅** |

Sin IA generativa en el camino crítico. El análisis de página es el MISMO backend de urvid IA
(perception ya devuelve claim/bullets/audience/imágenes/paleta — todo lo que el guionista necesita).

## 6. Estado

- [x] Investigación frame a frame del reel de referencia (2026-07-04)
- [x] Recon del código real + diseño (3 diseñadores) + auditoría adversarial (workflow, 11 agentes)
- [x] **v1 del motor CONSTRUIDO y ANDANDO** (2026-07-04):
  - `src/kinetic/core/`: prng · util · motion (springs cerrados z/w, stagger, ghost, wobble) ·
    shapes (blob polar, morph, wipe líquido) · text (fit nunca-desborda + `drawKinetic` por carácter +
    `drawWordReveal`) · dna (Style DNA: mood gaussiano cap 3:1 + vetos + ~15 continuos) ·
    script (4 plantillas retóricas: manifiesto/enumeración/stat-punch/contraste) ·
    registry propio · assemble (director por beats, cortes AL beat) · render (placas por escena +
    doble buffer de transiciones + cache de imágenes con hook Node)
  - `src/kinetic/libs/`: fonts (14 pares curados, pesos horneados browser/Node) · backgrounds
    (placas + mesh animado con clamp de luminancia) · garnish (blueprint/bauhaus/orgánico) ·
    7 escenas (typewriter, wordcascade, statement/respiro, stat, cta ×4 variantes, polaroid-inline,
    collage) · 4 transiciones (cut/fade/**liquid-wipe**/**collapse-esfera**)
  - **CERO imports cruzados** con src/urvid (motores separados de verdad, verificado por auditoría)
- [x] Estudio **Kinetic IA** en el sidebar (`/studio/kinetic`): link → analizar (mismo backend) →
  preview con watermark → Otra variante (salto áureo) → export MP4 (WebCodecs con `drawFrameFn`
  parametrizado, regresión cero en urvid) → música loopeada + whoosh en cortes → galería
  `kinetic_videos` (brief+seed+receta, nunca mp4)
- [x] Gates: `tools/kinetic-test.mjs` (determinismo byte-idéntico + 24/24 genotipos distintos +
  contrato) integrado a `npm run gates`; `tools/kinetic-shot.mjs` (contact-sheet + MP4) para eyeball
- [x] Verificado visual con 2 briefs reales: seeds distintos ⇒ videos IRRECONOCIBLES entre sí
- [x] **v1.1 "vida AE"** (2026-07-04, mismo día):
  - **Cámara con drift** (zoom/pan sutil continuo por escena — ningún frame muerto) + **whip de
    salida** hacia cada hard cut (suprimido cuando el borde lleva transición: la transición es el gesto)
  - 4 escenas nuevas de la firma del reel: **morph-reveal** (blob→rombo con la frase adentro→full-bleed,
    la apertura del reel), **card-zoom** (zoom-out a card con borde), **bauhaus** (grilla de tiles que
    cicla al beat), **badge** (píldora auto-dibujada con typewriter) — 11 escenas totales, casting sano
  - Testeo e2e de UNA línea: `node tools/kinetic-shot.mjs --url https://sitio.com [--mp4]`
    (captura+percepción REALES → video); verificado con duolingo.com
  - Review adversarial (workflow, 3 revisores con mediciones de TTF reales): 5 hallazgos, todos
    corregidos (desbordes del piso de fitFont en morph/bauhaus → wrap 2 líneas; whip horneado en el
    buffer de transición → suprimido; alpha pisado en card-zoom; gate ampliado con **seek-en-frío**)
- [ ] Siguiente: beat-grid con bpm real por jingle, más pares/familias/plantillas, gate estadístico
  de variedad, keepRecipe parcial, sesión de pulido de timing con Jero mirando el preview
