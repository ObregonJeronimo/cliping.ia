# MOTOR "DIRECTOR" — biblia de ejecución v2 (storyboard-first + edición total + independencia)

> **Visión de Jero (2026-07-05)**: un motor nuevo y mejorado que (1) analiza la página y extrae su
> DNA de diseño, (2) ENTIENDE qué hace y cómo se maneja la página para componer escenas que tengan
> SENTIDO y sean modernas, (3) compone un storyboard de escenas estáticas, (4) las entrelaza con
> animaciones de ingreso/egreso y match-cuts (objetos que se transforman en la siguiente escena),
> (5) lo sirve como video AUTO con una **línea de tiempo estilo After Effects donde el usuario puede
> EDITAR LO QUE SEA** con todas las herramientas necesarias.
>
> **Regla de INDEPENDENCIA (innegociable)**: las skills existentes (GSAP/design-dna/genjutsu/
> LottieFiles) son MAESTROS para construir lo nuestro — el motor NO depende de ninguna skill, lib
> externa de animación, ni servicio ajeno, ni en runtime ni en build. Si mañana todo eso desaparece
> o se vuelve pago, el motor sigue igual. Lo que aprendamos se DESTILA a docs y código propios.
>
> **Roles**: Fable 5 Max = este plan, auditorías, veredictos visuales finos. **Opus 4.8 Max =
> ejecución de TODAS las fases**, siguiendo este doc al pie de la letra.
> **Costo**: $0/video (canvas propio + export WebCodecs en la PC del usuario, ya probado).

---

## 0. Principios (el ejecutor los relee antes de cada tanda)

1. **100% nuestro**: cero imports de skills/libs de animación en `src/director/`. Evaluador de
   timeline, easings, objetos, UI: todo propio. Las skills solo se leen en TIEMPO DE DESARROLLO.
2. **Determinismo absoluto**: mismo `pagemodel + seed` → mismo video byte a byte; `drawFrame(t)`
   puro y seek-safe (gate con seek-en-frío, patrón kinetic-test).
3. **Estático primero**: la calidad de composición se decide y VERIFICA en stills, antes de animar.
4. **La timeline es LA fuente de verdad única**: lo que renderiza el motor = lo que muestra la UI
   = lo que edita el usuario = lo que se guarda. Nunca dos representaciones.
5. **Catálogos curados, jamás caso general**: recetas de transición y de escena elegidas de un
   catálogo con reglas de sentido — el seed elige entre opciones VÁLIDAS, no inventa.
6. **Nunca un frame vacío, nunca texto cortado, nunca contraste roto** (lecciones ya pagadas:
   contratos de solape p<0.33/fantasma, fit-nunca-desborda, APCA — se heredan como gates).
7. **Autotesting en loop**: ninguna tanda se pushea sin gates verdes + grillas miradas vs baseline.

---

## 1. Skills: qué destilamos de cada una (y a qué archivo NUESTRO va)

Instalación (una vez, dev-time, $0): `npx skills add` de [gsap-skills](https://github.com/greensock/gsap-skills),
[design-dna](https://github.com/zanwei/design-dna), [genjutsu](https://github.com/AThevon/genjutsu) → `.claude/skills/` del repo.
Son solo lectura para el agente ejecutor; el motor JAMÁS las referencia.

| Skill | Qué destilamos | Archivo NUESTRO (destino) |
|---|---|---|
| GSAP · Timeline | Modelo mental de timeline: labels, tracks, position parameters, stagger, nesting | `docs/director/TIMELINE-SPEC.md` + `src/director/core/timeline.js` (evaluador propio) |
| GSAP · Flip | El algoritmo First-Last-Invert-Play para match-cuts (medir estado A, estado B, invertir, animar) | `src/director/core/linker.js` (nuestro FLIP: opera sobre cajas declaradas, ni DOM ni lib) |
| GSAP · Easing/perf | Tabla de easings pro (qué curva para qué gesto; duraciones 0.2-0.8s; nunca linear en UI) | `docs/director/MOTION-PRINCIPLES.md` + `src/director/core/ease.js` |
| design-dna | El ESQUEMA de DNA (tokens + estilo cualitativo + efectos) y qué señales mirar en una página | `docs/director/DNA-SPEC.md` + extractor en `backend/site_capture.py` (Playwright, ya nuestro) |
| genjutsu | Criterio anti-slop: jerarquía, restraint, un acento, micro-detalles que hacen "premium" | `docs/director/DIRECCION-DE-ARTE.md` (checklist que los gates visuales citan) |
| LottieFiles motion | Principios de coreografía (anticipación, overlap, follow-through, stagger budgets) | `docs/director/MOTION-PRINCIPLES.md` (misma doc, sección coreografía) |

**Tarea F0.1**: el ejecutor lee las skills UNA vez y escribe esas 4 docs destiladas (nuestras,
committeadas). Desde ahí, las docs propias son la única referencia. Verificación de independencia:
gate `director-independence-check` = grep en `src/director/` que falla si aparece cualquier import
externo fuera de la whitelist (react para la UI del estudio, nada más).

---

## 2. PageModel: entender la página (DNA visual + SEMÁNTICA + assets)

La pieza que pide Jero: que el motor ENTIENDA qué hace la página para que las escenas tengan
sentido. Un solo JSON versionado (`pagemodel.v1`) que une lo visual y lo semántico:

```json
{
  "v": 1,
  "dna": {
    "palette": { "accent": "#...", "accent2": "#...", "bg": "#...", "inkOnBg": "#..." },
    "typography": { "displayHint": "serif|grotesk|rounded|mono|condensed", "caseHint": "upper|title|sentence" },
    "shape": { "radius": 0-32, "borderStyle": "none|hairline|bold", "shadowStyle": "flat|soft|hard" },
    "density": "aireado|medio|denso",
    "mood": { "calidez": 0-1, "formalidad": 0-1, "energia": 0-1 },
    "modernidad": ["bento", "glass", "bigtype", "editorial-photo", "gradient-mesh", "brutalist"]
  },
  "semantica": {
    "queHace": "una frase: qué vende/ofrece la página",
    "comoFunciona": ["paso 1", "paso 2", "paso 3"],
    "tipoNegocio": "saas|ecommerce|servicio-local|educacion|media|portfolio|app|evento",
    "modeloUso": "suscripcion|compra|reserva|registro|descarga|contacto",
    "features": [{ "titulo": "", "detalle": "" }],
    "pruebas": { "stats": [], "testimonios": [], "logosClientes": bool },
    "oferta": { "precio": "", "promo": "", "urgencia": "" },
    "audiencia": { "who": "", "register": "", "awareness": "" },
    "vozDeMarca": "3 adjetivos"
  },
  "assets": { "logo": "", "images": [{ "url": "", "kind": "producto|persona|ambiente|ui", "rank": 0 }], "ogImage": "" }
}
```

**Cómo se extrae (todo nuestro, backend existente ampliado):**
- `dna.*`: site_capture con Playwright — computed styles del hero/CTA/cards (ya extraemos accent
  así): radius medianos de botones/cards, box-shadows, font-family stacks → displayHint, densidad
  por ratio texto/aire del viewport, modernidad por detección de patrones (backdrop-filter=glass,
  grid de cards=bento, tamaño de h1 vs viewport=bigtype).
- `semantica.*`: perception (el LLM que YA usamos) con prompt ampliado: pide queHace/comoFunciona/
  tipoNegocio/modeloUso/features/vozDeMarca ADEMÁS de lo actual. Sube el cache key (v8→v9).
- `assets.images[].kind`: clasificación barata por heurísticas (aspect, posición, alt) + el ranking
  9:16 existente.
- **Fallbacks sanos obligatorios**: cada campo tiene default razonable; una página pobre produce un
  pagemodel válido (gate lo asserta con 5 páginas adversariales: vacía, botwall, no-latina, SPA, 404).

**Por qué esto hace escenas CON SENTIDO**: el guionista deja de mapear "bullets→lista" a ciegas y
pasa a mapear semántica→escena: `comoFunciona` → escena "3 pasos" con steppers; `modeloUso=reserva`
→ CTA de reserva con horario; `tipoNegocio=ecommerce` → escena producto+precio; `saas` → ventana de
app con las features reales; `logosClientes` → escena de confianza. La tabla completa vive en §4.

---

## 3. Arquitectura (7 etapas) y árbol de archivos

```
URL → [1 PageModel] → [2 Guion semántico] → [3 STORYBOARD estático] → [4 LINKER] → [5 TIMELINE]
                                                                  → [6 RENDERER] → [7 ESTUDIO+EDITOR]
```

```
src/director/
  index.js                  barrel: makeDirector(pagemodel|brief, {seed}) → {video, timeline} · drawDirectorFrame(ctx,t,video)
  core/
    prng.js                 copia del patrón probado (mulberry32 + namespaces)
    ease.js                 easings + springs cerrados PROPIOS (destilado de MOTION-PRINCIPLES)
    text.js                 fit nunca-desborda + telemetría (patrón urvid/kinetic)
    schema.js               validadores de pagemodel/storyboard/timeline (errores tipados E-SCHEMA-*)
    scriptwriter.js         semántica → guion de escenas con sentido (tabla §4)
    composer.js             guion+DNA → storyboard.json (escenas estáticas: árboles de capas)
    linker.js               pares de escenas → plan de transición (FLIP propio + catálogo §5)
    timeline.js             compilador (storyboard+links → timeline.json) + EVALUADOR puro evalAt(tl, t)
    render.js               drawFrame(ctx,t): evalúa timeline y pinta capas con el kit
  kit/
    plates.js               placas (noir/carbón/tinta/crema + las que sumen los DNA modernos: glass/bento)
    objects.js              re-export de src/shared/objects.js + objetos nuevos
    layers.js               pintores por kind de capa: text/photo/heroObj/badge/shape/stepper/priceTag/logoRow
    fx.js                   grano, viñeta, sweep, halo, sombras (destilado del look premium)
src/shared/
  objects.js                los 14+ dibujantes héroe PUROS extraídos de premium.js (usados por urvid Y director)
src/pages/Director/
  DirectorStudio.jsx        página del estudio (preview + timeline + inspector)
  Timeline.jsx              el componente timeline AE (canvas propio — ver §7)
  Inspector.jsx             panel de propiedades de la capa/key seleccionada
  editorState.js            command-stack (undo/redo), selección, snapping — puro, testeable en Node
tools/
  director-shot.mjs         stills por escena + grillas de 12 por link + --mp4
  director-test.mjs         determinismo byte-idéntico + seek-en-frío + contrato
  director-storyboard-check.mjs · director-linker-check.mjs · director-timeline-check.mjs
  director-independence-check.mjs · director-editor-check.mjs
  director-loop.mjs         el loop de auto-mejora (§8)
docs/director/
  TIMELINE-SPEC.md · DNA-SPEC.md · MOTION-PRINCIPLES.md · DIRECCION-DE-ARTE.md   (destiladas en F0)
```

**Contratos clave (firmas exactas):**
- `makeDirector(input, { seed }) → { video: {W,H,duration,fps,pagemodel,storyboard,timeline,seed}, }`
  — `input` acepta pagemodel completo O un brief legacy (adapter interno) → funciona con el backend
  actual desde el día 1 y mejora cuando el backend emita pagemodel.
- `evalAt(timeline, t) → Map<layerId, {props resueltos}>` — puro, sin estado, O(tracks) con índice
  binario por track (los keys están ordenados; gate lo garantiza).
- `drawDirectorFrame(ctx, t, video)` — pinta `evalAt` con kit/layers.js. Export: el existente
  `exportCanvasVideo(video, { drawFrameFn: drawDirectorFrame })`.

---

## 4. Guion semántico: mapa "qué hace la página" → escenas modernas

`scriptwriter.js` — REGLAS DE SENTIDO (curadas; el seed elige entre las válidas):

| Señal del pagemodel | Escena que habilita (kind) | Nota de diseño moderno |
|---|---|---|
| `queHace` | `hook.statement` (mask-reveal, palabra clave en acento) | big type editorial |
| `comoFunciona` (≥2 pasos) | `howto.steps` — steppers numerados con conectores animados | bento/steps con líneas que se trazan |
| `features` (≥3 → bento; ≥2 → ráfaga) | `features.bento` (grilla bento 2×2) o `rafaga.beat` | bento = modernidad 2025-26; con 2 features la grilla queda coja (ver DIRECCION-DE-ARTE §4.1) |
| `tipoNegocio=saas/app` | `hero.appwindow` — ventana con las features REALES tipeadas adentro | ui-in-video |
| `tipoNegocio=ecommerce` + foto producto | `hero.product` — foto real con sweep + `priceTag` si hay oferta | foto editorial + etiqueta |
| `modeloUso=reserva/turno` | `cta.booking` — CTA con chip de horario/disponibilidad | |
| `pruebas.stats` | `proof.punch` (número gigante + anillo) | |
| `pruebas.logosClientes` | `proof.logos` (fila de placas con sheen) | |
| `pruebas.testimonios` | `proof.quote` (cita con comillas gigantes + firma) | |
| `oferta.promo/urgencia` | `offer.flash` (placa de acento con la promo + countdown visual NO fake) | |
| siempre | `open.brand` y `outro.cta` (ornamento del look + CTA con halo) | |

**Gramáticas**: las 5 curadas existentes (clásica/producto/dato/ráfaga/editorial) se PORTAN y se
suman 3 semánticas: `howto-first` (si comoFunciona es fuerte), `offer-first` (si hay promo+urgencia),
`social-first` (si pruebas son fuertes). Reglas duras: nunca dos escenas de la misma familia
seguidas; escena solo si su señal existe (jamás fabricar datos/testimonios — regla histórica).
**Modernidad**: `dna.modernidad` sesga el catálogo (glass → placas glass; bento → features.bento;
bigtype → statements más grandes; editorial-photo → héroes de foto). Así la página "se ve a sí
misma" en el video.

---

## 5. Linker: catálogo COMPLETO de recetas (v1 = 12)

Contrato: `link(A, B, seed) → { exits: [...], enters: [...], carries: [...], dur, name }`, todas
las recetas emiten KEYFRAMES (no dibujan): el linker escribe en la timeline.

Nuestro FLIP (destilado, sin lib): para cada capa con match (mismo `matchKey` — p.ej. el objeto
héroe, el logo, un título persistente): First = caja/props al final de A · Last = caja/props al
inicio de B · Invert = delta · Play = keys con spring. Continuidad garantizada por construcción
(gate E-OBJ-JUMP la verifica ≤ 2px).

| # | Par (A→B) | Receta | Detalle |
|---|---|---|---|
| 1 | heroObj → heroObj (mismo matchKey) | **carry** | FLIP de caja+rotación; el objeto nunca sale de pantalla |
| 2 | heroObj → heroObj (distinto) | **morph-punto** | A colapsa a punto de acento → punto expande como B (0.55s) |
| 3 | fullbleed → cualquiera | **zoom-out-card** | A se encoge a card con borde dentro de B (0.6s) |
| 4 | cualquiera → fullbleed foto | **push-reveal** | B empuja desde un borde con parallax 12% |
| 5 | title → title | **mask-swap** | viejo sube y sale por máscara, nuevo entra por abajo (solapados) |
| 6 | photo → photo | **crossfade-parallax** | escalas opuestas 1.06↔0.98 |
| 7 | steps interno | **trace** | el conector entre pasos se traza y arrastra la cámara |
| 8 | placa oscura ↔ clara | **flash-cut** | corte seco + flash 2 frames (ya probado en ráfaga) |
| 9 | cualquiera → punch | **impact** | dip 0.1s + número con spring overshoot + micro-shake 2px 3 frames |
| 10 | logos/bento interno | **stagger-pop** | celdas con stagger 0.05s y spring |
| 11 | cualquiera → outro | **gather** | las capas salientes convergen brevemente hacia el centro antes del corte (recogida) |
| 12 | default | **dip-solapado** | el contrato anti-frame-vacío existente (exit alpha ≤8% cuando B entra) |

Elección: filtro por par válido → weightedPick por seed + energía del pagemodel; máx 1 receta
"espectacular" (2/3/11) por video; flash-cut solo en ráfagas/energía alta.

---

## 6. Timeline: modelo de datos (v1 congelado — TODO depende de esto)

```json
{ "v": 1, "fps": 30, "dur": 14.2, "W": 405, "H": 720,
  "markers": [ { "t": 0, "label": "Apertura", "sceneId": "sc1" } ],
  "layers": [ { "id": "sc2.obj1", "sceneId": "sc2", "kind": "heroObj", "name": "Gráfico",
                "base": { "obj": "chart", "hp": [0.3,0.7,0.5], "box": [0.2,0.25,0.6,0.35], "z": 20 },
                "life": [3.1, 7.4] } ],
  "tracks": [ { "layer": "sc2.obj1", "prop": "y", "keys": [
                 { "t": 3.1, "v": 0.9, "ease": "spring:0.6,11" },
                 { "t": 3.7, "v": 0.4 } ] } ],
  "look": { "plate": "tinta", "case": "upper", "...": "el look del video (§premium heredado)" } }
```
- `prop` ∈ `x,y,w,h,scale,rot,alpha,reveal,sweep,color?` — set CERRADO v1 (el evaluador y la UI
  conocen cada uno; agregar props = bump de `v`).
- `ease` string parseable: `lin | eo | eio | spring:z,w | back:s` → `ease.js` los resuelve.
- `reveal` es EL prop de texto (0→1 dispara mask-reveal/typewriter según el kind) — así el
  typewriter es editable como cualquier key.
- **Regla de oro**: el renderer NO conoce escenas, solo capas+tracks. Las "escenas" son markers y
  agrupación visual. Eso hace la edición trivial y elimina la clase de bugs de ventanas de escena.

---

## 7. ESTUDIO + EDITOR (edición total, por capas de herramientas)

Layout: preview 9:16 arriba-izquierda · **Inspector** derecha · **Timeline** abajo full-width.
La Timeline se dibuja en un CANVAS propio (no DOM por fila — con 40+ tracks el DOM muere; canvas
nos da zoom/scroll fluidos y ya somos expertos en canvas).

**E1 — Edición de contenido y ritmo (entra en F3, junto con el motor):**
- Seleccionar capa (click en preview O en timeline) → Inspector: editar TEXTO (con re-fit
  automático — jamás desborda), color de acento del video, tipografía (dropdown de pairings),
  placa del look, objeto héroe (dropdown del pool), imagen (elegir otra de assets o subir).
- Ritmo: arrastrar la duración de una escena (estira/comprime proporcionalmente sus keys),
  reordenar escenas (drag del marker → el linker RE-LINKEA solo esos dos bordes),
  eliminar/duplicar escena, cambiar receta de transición de un borde (dropdown de válidas).
- Otra variante (seed) conservando edits de contenido (los edits son un overlay declarativo:
  `{ layerId, field, value }[]` que se re-aplica tras regenerar; si la capa ya no existe, se avisa).
- **Undo/redo ilimitado**: TODO pasa por `editorState.js` (command stack puro: `{do, undo}` por
  comando — testeable en Node sin browser).
- Guardar (Firestore `director_videos`): `{ pagemodelRef|brief, seed, edits[], timelineSnapshot }`.

**E2 — Edición de keyframes (F5):**
- Ver/mover keys (drag horizontal = tiempo, con snapping a 1/30s y a markers), editar valor
  (Inspector numérico), cambiar ease por key (dropdown + preview de curva dibujada), añadir/borrar
  key en el playhead, copiar/pegar keys entre capas del mismo prop.
- Mover/estirar la "vida" de una capa (barra), solo dentro de su escena ± transiciones.

**E3 — Herramientas pro (F6):**
- Añadir capas desde biblioteca (texto/objeto/badge/foto) con drag al preview, alinear/distribuir,
  z-order, edición de curvas de ease custom (2 handles), multi-selección con caja, atajos AE
  (space play, J/K/L, ←/→ frame, I/O vida de capa, cmd+Z/Y).

**Contrato de seguridad del editor**: toda edición pasa por `schema.js` → si un edit viola un
invariante (texto desborda a tamaño mínimo, key fuera de vida, contraste roto), el editor lo
CLAMPEA y lo marca en el Inspector — el usuario nunca puede producir un video roto.

---

## 8. AUTOTESTING EN LOOP (ampliado con el editor)

**Taxonomía tipada** (todo gate emite estos códigos; `director-loop` los agrega):
`E-SCHEMA-*` · `E-TXT-OVERFLOW` · `E-TXT-MIDWORD` · `E-LAYER-OOB` · `E-LAYER-COLLIDE` ·
`E-CONTRAST` · `E-OBJ-JUMP` · `E-EMPTY-FRAME` · `E-DEADAIR` · `E-TL-ORDER` · `E-TL-ORPHAN`
(track sin capa) · `E-DET` · `E-SEEK` · `E-EDIT-REVERT` (undo no restaura byte-idéntico) ·
`E-EDIT-BREAK` (un edit produce violación) · `E-INDEP` (import prohibido).

**Extension de composicion** (la agrego tras la auditoria de las docs destiladas — DIRECCION-DE-ARTE
§5.0.1 las emite y los gates visuales las citan): `E-HIER` (jerarquia sin ratio) · `E-FOCUS` (sin punto
focal dominante) · `E-IDEA` (mas de una idea por escena) · `E-AIRE` (margenes/aire bajo minimo) ·
`E-ALIGN` (mas de 2 ejes de alineacion) · `E-COLOR-EXCESO` (acento sobre presupuesto) · `E-DENSIDAD` ·
`E-PLANO` (menos de 3 planos de profundidad) · `E-ORNAMENTO` (deco compitiendo) · `E-MONOTONIA`
(esqueletos repetidos entre escenas/seeds) · `E-SAFE-AREA` (fuera de zona segura; distinto de
`E-LAYER-OOB`, que es fuera del lienzo) · `E-DATO-FALSO` (dato que no esta en el pagemodel) ·
`E-EMOJI` · `E-BLEED` (sangrado accidental) · `E-TRANSITO` (movimiento simultaneo excesivo) ·
`E-TXT-TOFU` (glifos no soportados por la fuente).

**Gates** (todos entran a `npm run gates`):
1. `director-test`: determinismo byte-idéntico ×2 + seek-en-frío + 24 seeds → genotipos distintos.
2. `director-storyboard-check`: 8 pagemodels × 4 seeds → stills → telemetría texto completa, bboxes
   en frame, contraste ≥4.5 texto / ≥3 display, colisiones cero.
3. `director-linker-check`: por link, evalAt en 12 puntos → E-OBJ-JUMP ≤2px, E-EMPTY-FRAME=0,
   dur ∈ [0.3,0.9], siempre ≥1 capa visible.
4. `director-timeline-check`: schema válido, keys ordenadas, eases parseables, sin huérfanos,
   markers = escenas, vida ⊆ [0,dur].
5. `director-editor-check` (Node, sin browser): fuzz de 200 comandos random del command-stack →
   cada undo restaura EXACTO (hash del timeline); edits inválidos clampean sin tirar.
6. `director-independence-check`: grep de imports en src/director → whitelist o falla.
7. Visual: `director-shot.mjs` stills + grillas de 12 POR LINK (regla de Jero) + `--mp4`;
   baselines en `tools/baselines/director/` para diff a ojo.

**`director-loop.mjs`** (el loop de auto-mejora): corre 10 pagemodels reales (lista fija: saas,
ecommerce, resto, gym, portfolio, educación, evento, salud, medio, página-pobre) × 5 seeds →
recolecta violaciones → `reports/director/loop-<fecha>.json` rankeado → el ejecutor fixea el top-3
→ re-run → repetir hasta 0 duros y blandos <5 → **diff contra el snapshot anterior: ninguna clase
que estaba en 0 puede volver** (si vuelve, la tanda no se pushea). Cadencia por tanda: gates verdes
+ 3 grillas miradas vs baseline + loop-report adjunto en el commit message.

---

## 9. FASES — plan de ejecución sesión por sesión (Opus 4.8 Max)

Cada fase: tareas numeradas → criterio de aceptación (CA) → gates que nacen. El ejecutor abre la
fase leyendo §0 y cierra commiteando + actualizando el "Estado" al final de este doc.

**F0 — Destilación + esqueleto (1 sesión)**
1. `npx skills add` (gsap-skills, design-dna, genjutsu) → leer → escribir las 4 docs destiladas.
2. Extraer `src/shared/objects.js` de premium.js (dibujantes puros, cero registry) y hacer que
   premium.js los importe de ahí (urvid queda byte-idéntico — gate urvid1-test lo prueba).
3. Crear `src/director/` con core/prng, ease, text, schema (validadores completos) + index stub.
4. Gates: `director-independence-check` + schema-tests. CA: gates 26+2 verdes, urvid intacto.

**F1 — PageModel (1 sesión)**
1. `DNA-SPEC.md` → extractor en site_capture (radius/shadow/density/modernidad por computed styles).
2. Prompt de perception ampliado (queHace/comoFunciona/tipoNegocio/modeloUso/features/vozDeMarca),
   cache v9, adapter brief-legacy→pagemodel en `schema.js`.
3. e2e_probe emite pagemodel.json; correr sobre las **10 páginas reales** de la lista fija + los **5
   casos adversariales** (vacía, botwall, no-latina, SPA, 404) = **15 fixtures** commiteados (los gates
   nunca dependen de red).
CA: 10 fixtures válidos (5 adversariales incluidos), pagemodel de urvid.com.ar y de un ecommerce
real leídos y con semántica correcta a ojo.

**F2 — Storyboard estático (1-2 sesiones)**
1. `scriptwriter.js` (tabla §4 completa + 8 gramáticas) → guion.
2. `kit/plates|layers|fx` + `composer.js` → storyboard.json → stills.
3. `director-storyboard-check` + `director-shot` stills; baselines.
CA: 8 fixtures × 4 seeds → 0 errores duros; grillas de stills MIRADAS: composición nivel premium
actual o mejor; escenas semánticas presentes cuando la señal existe (howto/bento/logos/price).

**F3 — Linker + Timeline + Render + Export + Estudio E1 (2 sesiones)**
1. `linker.js` (12 recetas) + `timeline.js` (compilador + evaluador) + `render.js`.
2. `director-test/linker-check/timeline-check`; grillas de 12 por link vs baseline.
3. `DirectorStudio.jsx` + `Timeline.jsx` (canvas: regla, markers, tracks, playhead, scrub, zoom) +
   Inspector con **E1 completo** + galería `director_videos` + export MP4 + item sidebar
   "Director IA" + selector en el flujo del bat.
CA: URL real → video AUTO completo → editar texto/color/objeto/duración/orden → export → todo
verificado con grillas; Jero puede probar con su flujo bat+Vercel.

**F4 — Loop de calidad (1 sesión)**
`director-loop.mjs` + correr hasta 0 duros en las 10 páginas × 5 seeds + pulido visual con grillas
+ ampliar recetas/escenas donde el loop muestre monotonía. CA: loop-report limpio commiteado.

**F5 — Editor E2 (1-2 sesiones)** — keyframes: drag/snap/ease/add/delete/copy, curvas dibujadas,
`director-editor-check` fuzz. CA: editar un match-cut a mano y que quede mejor que el auto.

**F6 — Editor E3 + craft (1-2 sesiones)** — capas desde biblioteca, multi-selección, atajos,
alinear/distribuir. CA: rehacer NOVA a mano dentro del editor en <30 min.

**F7+ — Crecimiento continuo**: más recetas/escenas/looks por sesión con el loop como guardián;
lotties propios como acentos; objetos 3D (three ya está); modo craft completo.

---

## 10. Riesgos y decisiones tomadas (para no re-discutir)

- **Linker feo en el caso general** → catálogo cerrado de 12; lo que no matchea usa dip-solapado.
- **UI timeline = pozo de tiempo** → canvas propio + E1/E2/E3 estrictos; E1 sale con F3, no antes.
- **Tercer motor duplica kit** → `src/shared/` SOLO funciones puras sin registry ni estado.
- **Perception más cara por prompt ampliado** → mismo llamado, más campos (costo marginal ~0);
  cache v9 por página.
- **Edits vs regeneración** → edits como overlay declarativo re-aplicable; snapshot de timeline
  guardado SIEMPRE (si el overlay no aplica, se abre el snapshot tal cual — nunca se pierde trabajo).
- **Skills pagas mañana** → irrelevante por diseño: docs destiladas + `director-independence-check`.
- **Timeline schema deriva** → `v` en el JSON + migradores en schema.js desde v1.

---

## Estado

- [x] Plan v2 completo (este doc) — Fable 5 Max, 2026-07-05
- [x] F0 — Destilación + esqueleto (2026-07-25: 4 docs destiladas+auditadas · shared/objects byte-idéntico · core prng/ease/text/util/schema · gates independence+director en la cadena)
- [ ] F1 — PageModel
- [ ] F2 — Storyboard estático
- [ ] F3 — Linker+Timeline+Render+Estudio E1  ← primer hito probable por Jero (bat → Vercel)
- [ ] F4 — Loop de calidad
- [ ] F5 — Editor E2 (keyframes)
- [ ] F6 — Editor E3 (pro)
