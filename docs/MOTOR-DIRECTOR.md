# MOTOR "DIRECTOR" — storyboard-first: escenas estáticas → entrelazado → timeline AE

> **La idea de Jero (2026-07-05)**: en vez de animar desde cero, componer primero IMÁGENES/ESCENAS
> estáticas (un storyboard sobre la página del usuario, con su Design DNA), y DESPUÉS entrelazarlas
> con animaciones de ingreso/egreso y transiciones donde los objetos de una escena se transforman
> en la siguiente — para que parezca un proyecto de After Effects. Producto v1: modo AUTO (el video
> se hace solo) + una **línea de tiempo perfecta estilo AE** visible en el estudio. v2: modo craft.
>
> **Veredicto de factibilidad: MUY ALTA (9/10), de punta a punta, $0/video.** La razón clave: la
> "detección de objetos" NO es visión por computadora — nuestras escenas son DECLARATIVAS. El motor
> SABE qué objetos hay en cada escena porque él mismo los puso. El "objeto que se transforma en la
> siguiente escena" es matching por id/rol en un grafo de capas + un tween — el patrón FLIP de GSAP.
> Todo lo demás ya existe probado en el repo (compositor estático = look premium; kit de motion;
> export determinista; QA de grillas). Roles: **Fable 5 Max** = dirección/plan/auditoría/veredictos
> visuales; **Opus 4.8 Max** = ejecución de tandas con el loop de autotesting.

---

## 1. Investigación: qué es cada cosa de los screenshots y cómo se maneja

Los 5 son **skills de Claude Code**: carpetas de markdown (SKILL.md + referencias) que se cargan al
contexto del agente cuando la tarea matchea. Se instalan con `/plugin marketplace add <repo>` o
`npx skills add <url>` y viven en `.claude/skills/` (committeables al repo). **No son librerías de
runtime**: son CONOCIMIENTO para que el agente escriba mejor código (salvo GSAP, que además implica
la lib `gsap` de npm — hoy 100% gratis, plugins incluidos, desde que Webflow la liberó).

| Skill | Qué hace | Nos sirve |
|---|---|---|
| [GSAP Skills (oficial GreenSock)](https://github.com/greensock/gsap-skills) | 8 skills: core, **Timeline**, ScrollTrigger, **Flip**, SplitText, performance 60fps, React | **ALTO** — el modelo de TIMELINE (labels, tracks, easings, seek puro via `progress(t)`) es exactamente la "línea de tiempo AE" que queremos; y **FLIP** (First-Last-Invert-Play) es formalmente nuestro "linker" de escenas. Aunque no usemos la lib, sus patrones guían el diseño. |
| [design-dna](https://github.com/zanwei/design-dna) | Convierte referencias (URLs/screenshots) en **JSON "Design DNA"**: tokens + estilo cualitativo + efectos, versionable | **ALTO como esquema** — el spec de dna.json es lo que nuestra perception debe emitir (hoy sacamos color/fuentes; falta radius/sombras/densidad/mood). El skill lo usa el AGENTE al diseñar; el extractor lo implementamos nosotros en site_capture (computed styles via Playwright, ya lo hacemos para el accent). |
| [Genjutsu](https://github.com/AThevon/genjutsu) (ex creative-excellence) | Dirección creativa/motion para UI (cast/paint), multi-stack | **MEDIO** — conocimiento de criterio para las sesiones de ejecución. Instalar en `.claude/skills` del repo. |
| [Motion Design Skill (LottieFiles)](https://lottiefiles.com/tutorials/lottie-creator/lottie-creator-mcp-create-animations-with-your-favorite-ai-assistants-vs6LnaDzYAL) + [generadores Lottie](https://github.com/diffusionstudio/lottie) | Principios de timing/easing para agentes + prompt→Lottie JSON production-ready | **MEDIO** — para fabricar NUESTROS acentos animados (lotties propios curados, no los genéricos que tiramos). No-core para Director v1. |
| Three.js Skills ([colecciones](https://github.com/freshtechbro/claudedesignskills)) | Escenas 3D correctas en browser | **BAJO por ahora** — futuro: objetos héroe 3D (three ya está en package.json). Capa v4. |

**Acción**: instalar gsap-skills + design-dna + genjutsu en `.claude/skills` del repo (una vez,
`npx skills add`) para que TODAS las sesiones de ejecución hereden esos criterios. $0.

---

## 2. Por qué storyboard-first es LA arquitectura correcta (y qué recicla)

Hoy los motores animan "en vivo": cada escena es una función `render(ctx,t)` que decide composición
Y movimiento juntos. Eso hace difícil (a) verificar calidad (el 90% de mi verificación es sobre
STILLS), (b) transiciones con continuidad de objetos (cada escena es una caja negra), (c) mostrar
una timeline real (no existe el dato "keyframes").

**Storyboard-first invierte el orden**: primero se COMPONEN N escenas estáticas perfectas (donde
nuestro loop de verificación es más fuerte), después un LINKER calcula el movimiento entre ellas, y
el resultado es una TIMELINE de keyframes — que es a la vez lo que renderiza el motor y lo que ve
el usuario como línea de tiempo AE. Tres pájaros de un tiro.

**Reciclaje directo (nada se tira):**
| Pieza existente | Rol en Director |
|---|---|
| Placas + 14 objetos héroe + foto-real + ornamentos (premium.js) | Los "actores" de las escenas estáticas → mover los dibujantes PUROS a `src/shared/objects.js` (sin registry, importable por urvid/kinetic/director) |
| 5 gramáticas curadas + guionista | Plantillas de storyboard (qué escenas y en qué orden) |
| core prng/motion (springs)/text (fit nunca-desborda)/fit | Kit del renderer (patrón copia de kinetic, probado 2 veces) |
| Design DNA parcial (accent anclado, fuentes, imágenes rankeadas) | Base del extractor DNA ampliado |
| exportVideo.js con `drawFrameFn` | Export MP4 listo (cero cambios) |
| urvid1-cuts (grillas 12), reveal-check, gates infra | La base del autotesting del Director |
| Estudio (preview rAF, galería Firestore, watermark, selector) | Molde de la página "Director IA" |

---

## 3. Arquitectura del pipeline (6 etapas)

```
URL → [1 DNA] → [2 STORYBOARD estático] → [3 LINKER] → [4 TIMELINE] → [5 RENDERER] → [6 ESTUDIO]
```

### 3.1 DNA de la página (backend)
Ampliar site_capture/perception para emitir `dna.json`:
`{ tokens: { palette[5], fontHints, radius, shadow, density }, style: { mood, contraste, energía },`
`  assets: { logo, images[] rankeadas, ogImage } }` — esquema inspirado en design-dna. Lo que ya
tenemos (accent por computed-style del CTA, fuentes, imágenes) + radius/sombras/densidad medidos de
los computed styles del hero de la página. Fallbacks sanos cuando el sitio no da señal.

### 3.2 Storyboard: escenas ESTÁTICAS declarativas
`storyboard.json`: 5-7 escenas, cada una un **árbol de capas tipado**:
```json
{ "id": "sc2", "role": "hero", "plate": "tinta",
  "layers": [
    { "id": "kicker", "kind": "text", "role": "kicker", "text": "CONOCÉ URVID", "box": [.1,.12,.8,.06] },
    { "id": "obj1",   "kind": "heroObj", "obj": "chart", "hp": [0.3,0.7,0.5], "box": [.2,.25,.6,.35] },
    { "id": "claim",  "kind": "text", "role": "title", "text": "Videos en un click", "box": [.08,.65,.84,.2] }
  ] }
```
El **compositor estático** renderiza cada escena como STILL final (t=∞, todo asentado) usando el
kit compartido. **GATE DE STILLS antes de animar**: acá se juega la composición — tipografía,
jerarquía, contraste, aire — verificable en imagen fija con checks programáticos + grillas.

### 3.3 LINKER: el entrelazado (la pieza nueva de verdad)
Para cada par (A→B): matching de capas por id/rol → plan de transición con **catálogo curado de
recetas por par-de-tipos** (NO resolver el caso general — esa es la trampa):
- `heroObj → heroObj` (mismo obj): **carry** — el objeto NO sale: tween de box/escala/rotación a su
  pose en B (match-cut real, patrón FLIP)
- `heroObj → heroObj` (distinto): morph por colapso a punto → expande el nuevo
- `plate fullbleed → card`: zoom-out (la escena A queda como tarjeta dentro de B)
- `text(title) → text(title)`: mask-swap (el viejo sube y sale por máscara, el nuevo entra por abajo)
- `photo → photo`: crossfade con parallax de escala opuesta
- capas sin match: **exit** por tipo (mask-out / slide / fade+scale) SOLAPADO con los **enter** de B
  (lección aprendida: jamás un frame vacío — contrato p<0.33/alpha fantasma ya inventado)
- Elección determinista por seed entre las recetas VÁLIDAS para ese par + duración por energía.

### 3.4 TIMELINE: el modelo AE (una sola fuente de verdad)
Compilar storyboard+links → `timeline.json`:
```json
{ "fps": 30, "dur": 14.2, "markers": [{"t":0,"label":"Apertura"}, ...],
  "tracks": [ { "layer": "sc2.obj1", "prop": "y", "keys": [{"t":3.1,"v":0.9,"ease":"spring(0.6,11)"}, {"t":3.7,"v":0.4}] }, ... ] }
```
- Evaluador propio v1 (interpolador + easings del kit, seek puro, cero deps) con el MISMO shape
  conceptual que GSAP timeline → si algún día conviene, swap a `gsap.timeline().progress(t)` sin
  tocar el resto (el skill oficial documenta el modo seek).
- **Esta estructura alimenta 1:1 la UI**: cada track es una fila, cada key un rombo, los markers
  son las escenas. No hay "UI fake": la timeline que ves ES la que renderiza.

### 3.5 RENDERER
`drawFrame(ctx,t)`: evalúa timeline → dibuja capas con el kit compartido (placas, objetos, texto
con fit, grano/viñeta). Determinista y seek-safe por construcción (los keyframes son datos).
Export: `exportCanvasVideo(video, { drawFrameFn: drawDirectorFrame })` — ya existe.

### 3.6 Estudio "Director IA" (modo AUTO v1)
Sidebar nuevo. Flujo: URL → analizar (mismo backend) → video reproduciéndose + **panel timeline
estilo AE** debajo: regla de tiempo, markers de escena con nombre, tracks por capa (agrupadas por
escena, colapsables), barras/rombos de keyframes, playhead sincronizado, scrub, zoom horizontal.
v1 READ-ONLY estricto (mirar, no editar) — el craft mode (v2) edita este mismo JSON.

---

## 4. AUTOTESTING EN LOOP (pedido explícito de Jero)

**Taxonomía de errores tipada** (cada gate emite códigos, trackeables entre sesiones):
`E-TXT-OVERFLOW` (desborde) · `E-TXT-MIDWORD` (palabra cortada) · `E-LAYER-OOB` (capa fuera de
frame) · `E-LAYER-COLLIDE` (solape indebido) · `E-CONTRAST` (tinta/placa bajo umbral) ·
`E-OBJ-JUMP` (discontinuidad >6px lógicos en un carry/tween compartido) · `E-DEADAIR` (>0.9s sin
cambio perceptual) · `E-EMPTY-FRAME` (frame sin contenido en transición) · `E-TL-ORDER` (keys
desordenadas/huecos) · `E-DET` (no determinista / seek-frío difiere).

**Gates por etapa** (todos en `npm run gates`, patrón existente):
1. `director-storyboard-check`: N briefs × seeds → stills de cada escena → checks programáticos
   (telemetría de texto, bboxes dentro de frame, contraste contra placa, colisiones) → 0 errores.
2. `director-linker-check`: por cada link, evaluar la timeline en 12 puntos → continuidad de
   shared objects, cero frames vacíos, duraciones en rango [0.3, 0.9].
3. `director-timeline-check`: contrato del JSON (keys ordenadas, eases válidos, tracks completos,
   markers = escenas).
4. `director-test`: determinismo byte-idéntico + **seek en frío** (ya inventado en kinetic-test).
5. Visual: `director-shot.mjs` (stills por escena + grillas de 12 frames POR LINK — regla de Jero)
   + `--mp4`. Baselines commiteadas para comparar regresiones a ojo.

**El LOOP de auto-mejora** (`tools/director-loop.mjs`):
```
correr M briefs × N seeds → recolectar TODAS las violaciones tipadas
→ reporte rankeado por frecuencia y severidad (JSON snapshot con fecha)
→ fixear el top-3 → re-correr → repetir hasta: 0 errores duros, blandos < umbral
→ diff contra el snapshot anterior (nunca subir una clase de error que ya estaba en 0)
```
Regla operativa por tanda de ejecución: gates verdes + 2-3 grillas nuevas MIRADAS contra baseline
antes de cada push. Los veredictos visuales finos (¿el match-cut se siente bien?) los da Fable Max
con las grillas; Jero es el gate final de "feel" en el preview.

---

## 5. Fases de ejecución (con Opus 4.8 Max)

- **F0 — Cimientos** (1 sesión): schemas storyboard/timeline · `src/shared/objects.js` (extraer
  dibujantes puros de premium.js sin romper urvid) · compositor estático · `director-storyboard-check`
  + stills-grids. Entregable: 5 briefs × stills perfectos.
- **F1 — Linker + render** (1-2 sesiones): catálogo de 8-10 recetas de par · compilador de timeline ·
  evaluador + renderer · gates 2-4 · export MP4. Entregable: video AUTO completo de punta a punta.
- **F2 — Estudio** (1 sesión): página "Director IA" + panel timeline AE read-only sincronizado +
  galería (patrón kinetic_videos). Entregable: probable con bat → Vercel.
- **F3 — Loop de calidad** (1 sesión): `director-loop.mjs` + DNA ampliado en backend + pulido con
  grillas hasta 0 errores duros.
- **F4+ — Crecimiento**: craft mode (editar la timeline), más recetas de par y gramáticas, lotties
  propios como acentos, objetos 3D (three ya está en deps), swap opcional a GSAP timeline.

**Riesgos y mitigaciones**: linker genérico feo → catálogo curado por pares (nunca caso general) ·
scope-creep de la UI timeline → v1 read-only estricta · tercer motor duplica kit → `src/shared/`
SOLO para funciones puras sin registry · DNA infiel → empezar por tokens que ya extraemos + mood
de perception, fallbacks sanos.

**Costo**: $0/video (mismo stack canvas + export en la PC del usuario). GSAP si se adopta: gratis.
