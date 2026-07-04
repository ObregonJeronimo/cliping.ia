# PLAN — Videos calibre After Effects (kinetic manifesto) · investigación + implementación

**Objetivo**: que urvid genere reels con la calidad del reel de referencia
(https://www.instagram.com/reel/DZW488fvMyn/ · @crestivmotion), para cualquier rubro/página,
a **$0.00 por video** (100% procedural, render en la PC del usuario, sin APIs pagas).
Presupuesto máximo permitido: $0.10/video → **cumplido con margen infinito: $0.00**.

---

## 1. Análisis del reel de referencia (bajado y analizado frame a frame, 481 frames @ 30fps)

Ficha: 720×1280, 30 fps, 16.03 s, 13 escenas (~1.2 s promedio), género **manifiesto tipográfico cinético**.
El reel es split-screen "Wireframe vs Render" (gimmick para mostrar AE). Lo que nos importa es el
**lenguaje del render**: eso es lo replicable y lo que define la sensación "hecho con AE".

### Guion visual escena por escena

| # | t (s) | Escena | Técnica clave |
|---|-------|--------|---------------|
| 1 | 0.0–1.0 | Canvas blanco vacío | *breathing room* inicial; blob rosa entra con **wipe líquido** desde el borde izq. |
| 2 | 1.0–2.0 | Rombo gradiente + "Design isn't" | **morph blob→rombo**; guías punteadas (círculos dashed) como decoración intencional |
| 3 | 2.0–3.2 | "Decorations." full-bleed | el rombo **expande a full-bleed**; gradiente mesh **animado** (deriva lenta) |
| 4 | 3.2–3.6 | Transición colapso | la escena entera se **enrolla como cilindro** (bordes espejados) y colapsa en una **esfera** sobre negro |
| 5 | 3.6–4.6 | Esfera→punto en negro | la esfera **encoge a un punto** con ease larguísimo (~2 s) — pausa dramática |
| 6 | 4.6–6.0 | Píldora "It's clarity." | píldora que se dibuja; **collage de fotos** entra top-izq; tile bauhaus rojo/blanco pop bottom-der; arco dashed |
| 7 | 6.0–7.3 | "ITS MOTION" | **typewriter letra-por-letra** (la letra nueva aparece chiquita arriba y "cae"); el tile bauhaus **cicla patrones** al beat |
| 8 | 7.3–8.3 | Zoom-out a tarjeta | la escena **encoge a una card con borde** flotando en blanco; "Every frame deliberate." **palabra-por-palabra** (futuras en gris) |
| 9 | 8.3–10.3 | "Every story" gigante | **kinetic type**: letra-por-letra, cada letra entra gris-suave y se asienta a negro; blob gradiente animado detrás |
| 10 | 10.3–11.5 | "Alive." | mismo typewriter, texto blanco, gradiente se satura y vira de hue |
| 11 | 11.5–13.0 | "Brands 📷 don't wait." | **token media inline**: polaroid DENTRO de la frase, pop+wobble, y la foto **cicla** (mini-slideshow) |
| 12 | 13.0–14.2 | "They transform." | **collage polaroids**: 5 fotos vuelan con overshoot+rotación, dispersas |
| 13 | 14.2–16.0 | Marca + "makes it happen." → end card | logo dibujado por path; hard cut negro→blanco; tagline chico |

### El lenguaje destilado (las 16 técnicas que hacen "AE")

1. **Typewriter letra-por-letra** con settle por letra (gris→tinta, y variante "cae desde superíndice")
2. **Reveal palabra-por-palabra** con palabras futuras atenuadas
3. **Token media inline** en una frase (polaroid con pop+wobble+ciclo de fotos)
4. **Gradiente mesh animado** (2-3 blobs radiales que derivan y viran hue, muy suaves)
5. **Wipe líquido** (blob orgánico que crece desde un borde y revela la escena)
6. **Morph de forma** (blob→rombo→full-bleed)
7. **Transición colapso-esfera** (cilindro+espejo+encoger a punto) — transición estrella
8. **Punto que respira** (~2 s un solo elemento en negro — pacing con silencio visual)
9. **Zoom-out a tarjeta** (la escena queda como card con borde flotando)
10. **Tiles bauhaus** que ciclan patrones geométricos al beat
11. **Collage polaroids** con overshoot+rotación
12. **Garnish blueprint** (círculos dashed, arcos de motion-path, cruces de anchor — EN el render, intencional)
13. **Píldora/badge** que se auto-dibuja (borde→texto)
14. **Logo por path**
15. **Hard cuts al beat** + alternancia de polaridad (negro/blanco/gradiente) escena a escena
16. **Overshoot/settle en todo** + motion blur en movimientos rápidos

**Regla de oro del género**: pocas cosas por frame, tipografía enorme, contraste de polaridad
entre escenas consecutivas, y cortes al beat. La "calidad AE" es 80% **easing+timing**, 20% efectos.

---

## 2. Qué tiene ya el motor (verificado en código, no asumido)

| Necesidad | Estado | Dónde |
|---|---|---|
| Export determinista frame-a-frame MP4 (sin frames perdidos) | ✅ **YA EXISTE** (WebCodecs/mediabunny + fallback MediaRecorder) | `src/lib/exportVideo.js` |
| Doble-buffer para transiciones (escena→canvas offscreen→compositar) | ✅ ya existe (bufA/bufB + blit en ventana xf) | `src/urvid/core/render.js:183-210` |
| Primitivas de texto con fit garantizado (nunca desborda) | ✅ `drawText/drawWrapped/fitFont/trackFor` + telemetría QA | `src/urvid/core/text.js` |
| Slot de media del sitio (imagen producto) + cache | ✅ slot-media (`_getImg`, `brief.mediaImage`, `video.images`) | `render.js`, `assemble.js` |
| Música/SFX reales | ✅ jingles + 33 SFX CC0 | `libs/audio` |
| Ejes seriousness/energy que modulan movimiento | ✅ (intK, staggerK, xf por personalidad) | `assemble.js`, `render.js` |
| Escenas full-bleed que pintan su propio fondo | ✅ (p.ej. `scene.showcase.fullbleed`) → **la alternancia de polaridad por escena NO requiere cambios de core** | `libs/scenes` |
| Gates de calidad (determinismo, APCA, layout, QA, prefit) | ✅ `npm run gates` + contact-sheet visual | `tools/` |
| Easing con overshoot/springs por letra | ❌ falta | — |
| Dibujo kinetic por carácter | ❌ falta | — |
| Fondos gradiente animados | ❌ falta | — |
| Morph de formas / wipes orgánicos / transición colapso | ❌ falta (hoy: crossfade/cut) | — |
| Collage polaroids / token inline / tiles bauhaus / card zoom-out | ❌ falta | — |
| Corte al beat | ❌ falta (no hay grilla de beats por jingle) | — |

Conclusión: **el chasis está** (determinismo, export, buffers, fit, media, audio, gates).
Falta la **capa de lenguaje cinético**. Todo es canvas 2D puro → $0.

---

## 3. Plan de implementación paso a paso

> Reglas transversales (lecciones ya aprendidas del motor):
> - PRNG: namespaces separados (`seedFor(seed,'kinetic')` etc.); nunca agregar/sacar `r()` en secuencias existentes; decisiones booleanas puras; sustituir DESPUÉS de `weightedPick`.
> - Mirror: cambios en libs compartidas se espejan a `src/urvid-cine/`; features con pipeline de audiencia quedan urvid-only.
> - Cada fase termina con `npm run gates` verde + contact-sheet (`node tools/urvid1-shot.mjs`) leída visualmente.
> - Determinismo absoluto: nada de `Date.now()`/`Math.random()` — todo del seed.

### FASE A — Motor de movimiento (`src/urvid/core/motion.js`, nuevo) — la base de todo
1. Easings cerrados (sin estado): `expoOut`, `backOut(s=1.7)`, `elasticOut`, y **spring amortiguado
   cerrado**: `spring(t, ζ, ω)` = `1 - e^(-ζωt)·cos(ω√(1-ζ²)·t)` → overshoot/settle AE-style, determinista.
2. `stagger(t, i, n, {dur, overlap})` → t local del ítem i (para letras/palabras/polaroids).
3. `ghost(ctx, drawFn, vx, vy, k)` → motion blur fake: 2 copias fantasma con alpha bajo a lo largo
   del vector de velocidad (solo cuando |v| supera umbral). Barato y determinista.
4. Gate nuevo `tools/urvid1-motion-check.mjs`: spring(∞)→1, monotonía fuera del overshoot, stagger
   dentro de [0,1], mismos inputs→mismos outputs (bit a bit).
- **Aceptación**: gate verde; cero cambios de comportamiento en escenas existentes (no se toca nada existente).

### FASE B — Texto cinético (`core/text.js` + escenas nuevas `kinetic.*`)
1. `drawKinetic(ctx, str, x, y, opts, t)` en text.js: fitea con `fitFont`/`trackFor` (mismo contrato:
   NUNCA desborda), luego dibuja **por carácter** avanzando con `measureText(ch).width + tracking`,
   aplicando por letra: alpha (gris→tinta), dy (caída), scale (settle) según `stagger()`.
   La telemetría registra el string completo con el ancho total → los gates de texto siguen funcionando.
2. Escenas nuevas (registradas con weights y ejes fitWeight como cualquier módulo):
   - `kinetic.typewriter` — claim/tagline gigante letra-por-letra (técnicas 1, 4)
   - `kinetic.wordreveal` — frase palabra-por-palabra con futuras atenuadas (técnica 2)
   - `kinetic.inline` — frase con token polaroid inline usando `video.images` (técnica 3; foto cicla
     al beat con índice determinista)
   Las tres pintan su **propia placa full-bleed** (polaridad propia) como ya hace showcase.fullbleed.
3. Copy-splitter en `assemble.js` (namespace PRNG nuevo): parte el claim en 2–4 fragmentos-beat
   ("Design isn't / Decorations. / It's clarity.") con heurística de puntuación/conjunciones;
   si el claim es corto, usa claim+tagline. Cae a escenas clásicas si no hay material.
- **Aceptación**: gates verdes (text-check/prefit sobre los fragmentos, layout-check con las escenas
  nuevas en las 198 combinaciones), contact-sheet: letras nítidas, sin desborde, settle visible.

### FASE C — Fondo gradiente mesh animado (`libs/backgrounds`: `bg.mesh.drift`)
1. 2-3 blobs de gradiente radial (colores del palette, `lighter`/`screen` sobre base) que derivan
   por curvas de Lissajous determinizadas por seed; hue vira ±12° a lo largo de la escena.
2. Legibilidad: el rango de luminancia de los blobs se **clampa por tono** (light: L∈[0.80,0.97];
   dark: L∈[0.06,0.22]) → la tinta pasa APCA contra el EXTREMO peor del rango, no contra un promedio.
   Se agregan los extremos al barrido de `tools/urvid1-apca-check.mjs`.
3. Espejar a urvid-cine (lib compartida).
- **Aceptación**: apca-check ampliado verde; contact-sheet: el gradiente se ve suave, sin banding
  (dither sutil del grain existente ya lo cubre).

### FASE D — Formas: morph + wipes (`core/shapes.js` nuevo + hooks en escenas)
1. Path de **superellipse/blob** paramétrico: `blobPath(cx, cy, r, k, harmonics(seed))` — k interpola
   blob↔rombo↔rect (morph por lerp de radios polares; siempre convexo-suave, sin auto-cruces).
2. `wipe.blob`: clip con blobPath creciendo desde un borde (reveal orgánico de la placa de la escena).
3. Tiles **bauhaus** como garnish nuevo (familia `garnish.bauhaus`): card chica con patrón geométrico
   (diamante/estrella-almohada/molinete) que **cicla al beat**; paleta = accent + tinta; respeta _gK.
- **Aceptación**: layout-check (tiles nunca sobre texto: usa las cajas libres del layout como el
  garnish actual); determinism-check; contact-sheet.

### FASE E — Transiciones showpiece (`core/render.js`, dentro de la ventana xf existente)
1. Registry de transiciones `libs/transitions/index.js`: `cut | fade (actual) | blobwipe | collapse | cardzoom`.
   La receta elige por corte (`recipe.cuts[i]`, PRNG namespace `cuts`), sesgada por seriousness
   (serio→cut/fade; enérgico→collapse/blobwipe, máx 1 collapse por video).
2. `collapse`: usa los buffers existentes (bufA ya tiene la escena A pintada) → 3 fases dentro de xf:
   (a) squeeze horizontal con lóbulos espejados en los bordes (3 drawImage con escalas: ilusión
   cilindro, sin WebGL), (b) wrap a círculo (clip circular + squeeze), (c) encoger a punto sobre
   la placa de B. Es la técnica 7 con costo O(3 drawImage).
3. `cardzoom`: escena A encoge a card con borde (drawImage escalado + stroke) flotando sobre placa
   de B, luego B entra (técnica 9).
4. SFX: mapear whoosh/pop existentes a cada tipo de corte (collapse→whoosh largo, cut→tick).
- **Aceptación**: determinism (la MISMA transición con el mismo seed), qa-check "nunca A+B en
  transición" se actualiza para conocer los tipos nuevos; contact-sheet de frames DENTRO de xf.

### FASE F — Beat grid + arco "manifiesto" (`assemble.js` + `libs/audio`)
1. Tabla `BEATS = { jingleId: { bpm, offset } }` medida una vez a mano (audacity/aubio, gratis).
2. `snapToBeat(tCut, bpm, offset, ±0.15s)`: los límites de escena se ajustan al beat más cercano
   (después del arc, antes de congelar timings; respeta duración total).
3. Arco nuevo `arc.manifesto` (elegible por energy alto + claim largo, PRNG namespace propio):
   secuencia hook(kinetic.typewriter) → beat corto → respiro (punto/forma sola ~1.5s) →
   kinetic.inline o collage → wordreveal → cierre marca+CTA. Polaridad alternada garantizada
   (la placa de cada escena kinetic alterna light/dark/gradient — regla dura, no probabilística).
4. `collage.polaroids` (escena): 3-5 `video.images` como polaroids (marco blanco+sombra procedural)
   volando con overshoot+rotación, posiciones de una grilla golden-angle determinista (nunca tapan
   el texto: cajas del layout).
- **Aceptación**: gates completos; 3 contact-sheets de rubros distintos (tech/beauty/resto) leídas:
  polaridad alterna, cortes al beat (verificable: t de cortes ≡ múltiplos de 60/bpm ± 0.15).

### FASE G — Pulido AE (transversal, barato)
1. Overshoot en TODAS las entradas de las escenas kinetic (spring de Fase A; intensidad = energy).
2. `ghost()` en polaroids/tiles/tokens cuando su velocidad supera umbral (motion blur fake).
3. Garnish blueprint (familia nueva): círculos dashed, arco de "motion path", cruces anchor —
   SOLO en escenas kinetic de polaridad clara, alpha bajo, respetando _gK (técnica 12).
4. Píldora auto-dibujada para eyebrow/CTA en escenas kinetic (stroke-dash animado → texto).
- **Aceptación**: contact-sheet A/B (con y sin pulido) — se elige visualmente; gates verdes.

### FASE H — Integración producto
1. `arc.manifesto` entra al pool normal de makeVideo (weight moderado, sube con energy/claim largo).
   "Otra variante" (keep) funciona gratis: los slots nuevos siguen el contrato keep existente.
2. Advanced studio: los módulos nuevos aparecen en los paneles existentes (animaciones/escenas)
   sin UI nueva obligatoria.
3. Espejo a urvid-cine de todo lo compartido (motion.js, shapes.js, bg.mesh, transiciones);
   el arc con pipeline de audiencia queda urvid-only (divergencia ya documentada).
4. Actualizar PLAN-MEJORAS.md y memoria del proyecto.

### Orden y dependencias
```
A (motion) ──► B (kinetic text) ──► F (arc manifesto) ──► H (integración)
A ──► D (shapes) ──► E (transiciones)
C (mesh bg) independiente (solo palette)
G al final, sobre todo lo anterior
```
Estimación: A+B una sesión larga; C+D una sesión; E+F una sesión; G+H una sesión.
Cada fase con el patrón **design+audit** (agentes de diseño en paralelo + auditor adversarial
verificando premisas contra el código) antes de implementar.

---

## 4. Costos y dónde corre

| Concepto | Costo/video |
|---|---|
| Render + export (canvas 2D + WebCodecs, PC del usuario) | **$0.00** |
| Música/SFX (jingles + Kenney CC0, ya en el repo) | $0.00 |
| Fuentes (Google Fonts ya integradas) | $0.00 |
| Imágenes (del sitio del cliente, ya las trae site_capture) | $0.00 |
| Backend (captura+percepción, ya existe; sin cambios de costo) | ~$0.00 |
| **Total** | **$0.00 ≤ $0.10 ✅** |

- Todo el trabajo pesado es del **navegador del usuario** (objetivo cumplido: consumo de recursos
  de la PC de cada usuario, no nuestro). Canvas 2D + 3 drawImage por transición: corre fluido
  hasta en máquinas modestas; el export WebCodecs no es tiempo real (no importa si la PC es lenta).
- Nada de IA generativa requerida para este nivel. (Si algún día se quiere un plus, el único
  candidato con sentido sería música con beat conocido o fondos I2V del Cine IA — ambos opcionales
  y fuera de este plan.)

## 5. Riesgos y mitigaciones
- **Riesgo**: per-char rendering rompe el contrato "nunca desborda". → Mitigado: `drawKinetic`
  fitea ANTES con el mismo `fitFont` y dibuja por avance medido; gate de texto lo cubre.
- **Riesgo**: PRNG re-roll de recetas existentes al agregar picks. → Namespaces nuevos +
  arc.manifesto como rama que NO consume del stream clásico; determinism-gate lo detecta.
- **Riesgo**: gradiente animado rompe APCA en algún frame. → Clamp de luminancia + gate ampliado
  con extremos del rango.
- **Riesgo**: transición collapse se ve "barata" sin WebGL. → El original es exactamente esto:
  squeeze+espejo+escala; si el contact-sheet no convence, degradar a cardzoom (siempre elegante).
- **Riesgo**: cortes al beat desincronizados si el usuario cambia el jingle. → snap se recalcula
  por jingle en makeVideo (bpm en la tabla); sin bpm conocido → grid de 0.5 s.

## 6. Qué NO vamos a copiar
- El split-screen "Wireframe vs Render" (es el gimmick de ESE reel para presumir AE, no un formato
  de marketing para clientes).
- Assets con marca (swoosh de Nike, fotos de sus campañas). Usamos el logo y las imágenes del
  sitio del cliente que ya captura el backend.
