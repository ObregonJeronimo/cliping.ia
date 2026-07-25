> **Destilado (dev-time, 2026-07-25)** de `gsap-skills/skills/gsap-timeline/SKILL.md`, `gsap-core/SKILL.md`, `gsap-plugins/SKILL.md` (sección Flip) y `genjutsu/skills/_jutsu/gsap/references/timeline.md`. **El motor no depende de GSAP ni de ninguna lib**: desde acá, esta doc es la ÚNICA fuente para `src/director/core/timeline.js`, `linker.js` y `tools/director-timeline-check.mjs`.

# TIMELINE-SPEC v1 — modelo de datos, evaluador y FLIP propio

Doc de la fase F0 del plan `docs/MOTOR-DIRECTOR.md` (§0, §5, §6, §8). Es **normativa**: si el código y
esta doc discrepan, gana la doc o se cambia la doc primero.

**Reparto de autoridad (para no tener dos verdades):**

| Tema | Autoridad | Esta doc |
|---|---|---|
| Shape del JSON, evaluador, builder, FLIP, invariantes | **esta doc** | — |
| Forma de las curvas de ease, duraciones, recetas de gesto | `docs/director/MOTION-PRINCIPLES.md` §1–§4 | la cita, no la redefine (§1.6) |
| Taxonomía de errores y fases | `docs/MOTOR-DIRECTOR.md` §8/§9 | la extiende con sufijos `E-SCHEMA-*` |

El código de F0.3 ya commiteado (`src/director/core/{ease,schema,prng}.js`) **no** cumple esta doc en
varios puntos; el delta exacto está en §8 y es trabajo de F3, no una licencia para ignorar la doc.

## 0. Las 6 decisiones que hacen que esto NO sea GSAP

| Decisión | Por qué |
|---|---|
| **Todo son keyframes absolutos.** No hay tweens vivos, ni objetos con estado, ni cola de animaciones. | `drawFrame(ctx,t)` tiene que ser puro: mismo `t` → mismos pixeles, sin importar qué frame se pintó antes. |
| **El JSON está aplanado.** Nada de timelines anidadas en runtime. | Un `evalAt` sin recursión, una UI de tracks planos, y un hash de undo/redo trivial. |
| **El azúcar (labels, `"+=0.5"`, `"<"`, stagger) vive en el COMPILADOR**, no en el runtime. | El runtime no resuelve nada relativo: leería estado "actual" y rompería el seek. |
| **`t` nunca se acumula.** El renderer llama `evalAt(tl, f / fps)` con `f` entero. | Acumular `t += dt` produce drift y mata el determinismo byte a byte (gate `E-DET`). |
| **Cero callbacks.** No hay `onStart`/`onComplete`/`onUpdate`. | Dependen de "pasar por" un tiempo; con seek aleatorio no se pasa por ningún lado. |
| **FLIP sin "Invert".** Nuestras cajas son declarativas, no del DOM. | No hace falta invertir con transforms: escribimos directamente el key inicial con el valor medido en A. |

Constantes globales del motor (repetidas acá para que el ejecutor no vaya a buscarlas):

```js
const EPS   = 1e-6      // tolerancia de tiempo (segundos)
const W     = 405       // lienzo lógico (px); export escala ×(1080/405) = 2.666…
const H     = 720
const FPS   = 30        // v1 por defecto
const PX_TOL = 2        // tolerancia de continuidad de match-cut (px lógicos), gate E-OBJ-JUMP
```

---

## 1. `timeline.json` v1 — shape EXACTO

Es el §6 del plan, completado con tipos, rangos e invariantes. **v1 está congelado**: agregar un `prop`,
un `kind` o una forma de `ease` obliga a subir `v` y a escribir un migrador en `schema.js`.

```json
{
  "v": 1,
  "fps": 30,
  "dur": 14.2,
  "W": 405,
  "H": 720,
  "seed": 918273,
  "defaultEase": "eo",
  "markers": [
    { "t": 0,   "label": "Apertura", "sceneId": "sc1" },
    { "t": 3.1, "label": "Producto", "sceneId": "sc2" }
  ],
  "layers": [
    {
      "id": "sc2.obj1",
      "sceneId": "sc2",
      "kind": "heroObj",
      "name": "Gráfico",
      "matchKey": "hero",
      "base": { "obj": "chart", "hp": [0.3, 0.7, 0.5], "box": [0.2, 0.25, 0.6, 0.35], "z": 20 },
      "life": [3.1, 7.4]
    }
  ],
  "tracks": [
    { "layer": "sc2.obj1", "prop": "y", "keys": [
      { "t": 3.1, "v": 0.9, "ease": "spring:0.6,13" },
      { "t": 3.7, "v": 0.4 }
    ] }
  ],
  "look": { "plate": "tinta", "case": "upper", "accent": "#E9573F", "grain": 0.22 }
}
```

### 1.1 Raíz

| Campo | Tipo | Regla |
|---|---|---|
| `v` | `1` literal | Cualquier otro valor → el cargador llama al migrador o falla con `E-SCHEMA-VERSION`. |
| `fps` | int ∈ {24,25,30,60} | v1 usa 30. No es editable desde la UI (cambiar fps = recompilar). |
| `dur` | number > 0 | Debe caer en la grilla: `|dur*fps − round(dur*fps)| < 1e-6`. Rango sano [4, 60]. |
| `W`,`H` | int > 0 | v1: 405 × 720. El export escala; el JSON **siempre** guarda el lienzo lógico. |
| `seed` | int ≥ 0 · **opcional** | Informativo (trazabilidad/regeneración). El evaluador NO lo lee. Ausente ⇒ `0`. |
| `defaultEase` | ease-string · **opcional** | Ease usado cuando un key no trae `ease`. Ausente ⇒ `"eo"`. |
| `markers` | array | Ordenado por `t` ascendente, `t` en grilla, `t ∈ [0, dur]`. Ver 1.2. |
| `layers` | array | ≥1 elemento. El orden del array es el **desempate estable de z**. |
| `tracks` | array | Puede estar vacío (un video de puros stills es legal, aunque `E-DEADAIR` lo va a marcar). |
| `look` | object | Opaco para el evaluador; lo consume `kit/`. Se guarda dentro de la timeline para que un snapshot sea autosuficiente. |

`seed` y `defaultEase` son **superset** del §6 del plan (que no los lista): son opcionales justamente
para que un JSON escrito contra el plan siga validando. Cualquier otro campo raíz desconocido es
`E-SCHEMA-ROOT` (blando: se ignora y se avisa; no bloquea, para que un snapshot viejo se pueda abrir).

### 1.2 `markers[]` — las escenas, degradadas a etiquetas

```ts
{ t: number, label: string, sceneId: string }
```

- **Regla de oro (§6 del plan)**: el renderer NO conoce escenas. Un marker es (a) una etiqueta visual en la
  UI, (b) el punto de snapping de la edición, (c) el ancla de posición para el compilador.
- `sceneId`: `^sc[0-9]+$`. Único entre markers. Todo `layer.sceneId` debe existir acá.
- El marker de una escena es su **inicio**. La escena termina donde empieza la siguiente (o en `dur`).
- Las transiciones **cruzan** la frontera: es normal y esperado que capas de `sc1` sigan vivas después del
  marker de `sc2`. Eso NO es un error.

### 1.3 `layers[]`

```ts
{
  id: string,          // ^[a-z0-9]+(\.[a-z0-9_-]+)*$  · convención "sc<N>.<slug>" · ÚNICO
  sceneId: string,     // debe existir en markers
  kind: Kind,          // enum cerrado (1.4)
  name: string,        // ≤40 chars, humano, para el Inspector
  matchKey?: string,   // ^[a-z0-9_-]{1,24}$ · sólo para el FLIP del linker (§4)
  base: BaseProps,     // valores base + datos propios del kind (1.4)
  life: [number, number]  // [t0,t1] en grilla, 0 ≤ t0 < t1 ≤ dur
}
```

**`life` es dura**: fuera de `life` la capa **no se evalúa ni se pinta**. No existe "alpha 0 pero viva".
Esto es lo que hace barato el evaluador y lo que permite tener 40+ capas sin costo.

### 1.4 `kind` — enum cerrado y qué exige cada uno en `base`

Todo `base` acepta las claves comunes; cada `kind` suma las suyas. Claves desconocidas en `base` →
`E-SCHEMA-BASEKEY` (evitan typos silenciosos como `boxx`).

**Comunes a todos los kinds:**

| Clave | Tipo | Default | Nota |
|---|---|---|---|
| `box` | `[x,y,w,h]` números | **obligatorio** | Normalizado. `x,y` = **esquina superior izquierda**; `w,h` = tamaño. Rango: `x,y ∈ [−1,2]`, `w,h ∈ (0,3]` — **los mismos rangos que los keys de 1.5** (si no, un key legal no podría partir del base). Fuera de rango → `E-SCHEMA-RANGE`. |
| `z` | int | **obligatorio** | 0..999. Orden de pintado ascendente. |
| `anchor` | `[ax,ay]` | `[0.5,0.5]` | Punto (relativo dentro de la caja) alrededor del cual aplican `scale` y `rot`. |
| `alpha` | 0..1 | `1` | Valor base del prop `alpha`. |
| `rot` | grados | `0` | Valor base del prop `rot`. |
| `scale` | >0 | `1` | Valor base del prop `scale`. |
| `reveal` | 0..1 | `1` | Valor base del prop `reveal`. **Default 1 = contenido completo** (una capa sin track de reveal se ve entera). |
| `sweep` | number | `-1` | Valor base del prop `sweep`. Fuera de [0,1] = sin destello. |
| `color` | `#rrggbb` \| `null` | `null` | `null` = la capa usa el color que le corresponde del `look`. |

| `kind` | Claves propias de `base` | Notas |
|---|---|---|
| `text` | `str` (string), `role` ∈ `TEXT_ROLES` (abajo), `align` ∈ `l\|c\|r`, `maxLines` (int 1..4), `accentWord?` (int, índice de palabra en acento) | El modo de `reveal` lo decide el `role` (tabla abajo). El fit lo resuelve `core/text.js` — **nunca desborda**. |
| `photo` | `src` (url o id de asset), `fit` ∈ `cover\|contain`, `aspect` (number w/h del original, en **píxeles**) | `aspect` es obligatorio para el FLIP (§4.5). |
| `heroObj` | `obj` (id del dibujante en `src/shared/objects.js`), `hp` (array de 0..3 números 0..1, hiperparámetros del objeto) | `hp` NO es animable en v1 (es forma, no movimiento). |
| `badge` | `str`, `variant` ∈ `pill\|tag\|ring` | |
| `shape` | `form` ∈ `rect\|circle\|line\|arc\|blob`, `stroke` (0..8 px lógicos), `fill` (bool) | Conectores, subrayados, anillos. |
| `stepper` | `n` (int 2..5), `idx` (int 0..n−1), `str` | Un stepper = una capa por paso; el conector es un `shape` con `reveal`. |
| `priceTag` | `price` (string), `strike?` (string), `note?` (string) | |
| `logoRow` | `items` (array ≤6 de `{src, aspect}`) | Una sola capa; el stagger interno se compila a `reveal` (ver 3.4). |
| `plate` | `style` ∈ `noir\|carbon\|tinta\|crema\|glass\|bento` | La placa de fondo de la escena. Siempre `z ≤ 5`. |

**`TEXT_ROLES` (enum cerrado, el MISMO que ya exporta `src/director/core/schema.js` — no inventar otro):**

```
kicker | title | subtitle | body | stat | statLabel | cta | mark | quote | step
```

| `role` | Qué dispara `reveal` 0→1 |
|---|---|
| `title`, `stat`, `quote`, `mark` | **mask-reveal** (la máscara sube; el glifo no se deforma) |
| `subtitle`, `body`, `step`, `statLabel` | mask-reveal por línea, con el overlap interno de 3.4 |
| `kicker`, `cta` | **typewriter**: caracteres visibles = `floor(reveal · n)` (por eso su ease es `lin`, MOTION-PRINCIPLES receta 7) |

**Assets y pureza**: `photo.src` / `logoRow.items[].src` son **identificadores ya resueltos**. `drawFrame`
es síncrono y no hace red: el bitmap tiene que estar precargado en el asset store antes del primer frame
(el render falla con `E-SCHEMA-ASSET` si falta, nunca "espera"). Una URL en el JSON es una *clave*, no una
descarga en runtime.

### 1.5 `tracks[]` y `prop`

```ts
{ layer: string, prop: Prop, keys: Key[] }
Key = { t: number, v: number | string, ease?: string }
```

- **Una sola track por par `(layer, prop)`** → si hay dos, es `E-SCHEMA-DUPTRACK`. Nunca hay "conflicto de
  tweens" ni `overwrite`: la última palabra la tiene el compilador, no el runtime.
- `keys` ordenado **estrictamente** por `t` creciente (dos keys con el mismo `t` → `E-TL-ORDER`).
- `keys.length ≥ 1`. Una track vacía es `E-SCHEMA-EMPTYTRACK`.
- Todo `key.t` debe estar dentro de la vida de la capa: `life[0] − EPS ≤ t ≤ life[1] + EPS` →
  si no, `E-SCHEMA-KEYLIFE`.
- `key.t` en la grilla de frames (múltiplo de `1/fps`, tolerancia 1e-6) → `E-SCHEMA-GRID`.
- El `ease` de un key gobierna el segmento que **empieza** en ese key (hacia el siguiente). El `ease` del
  último key es **ignorado** (pero legal: así arrastrar keys en el editor no rompe nada).

**Set cerrado de props v1:**

| `prop` | Tipo de `v` | Rango del key | Semántica | Clamp al evaluar |
|---|---|---|---|---|
| `x` | number | [−1, 2] | Borde izquierdo de la caja, fracción de `W` | ninguno (el overshoot es legítimo) |
| `y` | number | [−1, 2] | Borde superior, fracción de `H` | ninguno |
| `w` | number | (0, 3] | Ancho, fracción de `W` | `max(v, 1e-4)` |
| `h` | number | (0, 3] | Alto, fracción de `H` | `max(v, 1e-4)` |
| `scale` | number | [0, 4] | Multiplica `w`,`h` alrededor de `anchor` | `max(v, 1e-4)` |
| `rot` | number | [−720, 720] | **Grados** (no radianes) | ninguno |
| `alpha` | number | [−0.2, 1.2] | Opacidad de pintado | `clamp(v, 0, 1)` |
| `reveal` | number | [−0.2, 1.2] | Progreso de revelado del contenido | `clamp(v, 0, 1)` |
| `sweep` | number | [−0.5, 1.5] | Posición del destello/sheen a lo largo de la caja | ninguno |
| `color` | `"#rrggbb"` | — | Color de la capa (texto/relleno) | normalizado a minúsculas |

Rango violado en un **key** → `E-SCHEMA-RANGE`. Los márgenes ([−0.2,1.2] en alpha/reveal) existen para que
un `spring` con overshoot se pueda escribir; el clamp del evaluador lo corrige al pintar.

### 1.6 `ease` — gramática exacta

La **forma** de cada curva la fija `MOTION-PRINCIPLES.md` §1.3; acá va sólo el contrato serializable.
Si las dos docs discrepan en una fórmula, gana MOTION-PRINCIPLES (y esta tabla se corrige).

```
ease  := "lin"
       | "eo"  [ ":" p ]        p ∈ {2,3,5,"expo"}   default "expo"
       | "ei"  [ ":" p ]        idem
       | "eio" [ ":" p ]        p ∈ {2,3,5}          default 3
       | "back:" s              s ∈ [0.4, 3.0]
       | "spring:" z "," w      z ∈ [0.40, 0.95], w ∈ [8, 20], z·w ≥ 7
       | "step"

regex := /^(lin|step|(eo|ei|eio)(:(2|3|5|expo))?|back:(\d*\.?\d+)|spring:(\d*\.?\d+),(\d*\.?\d+))$/
```

| Forma | Curva (`u ∈ [0,1]`) | Uso |
|---|---|---|
| `lin` | `u` | Barridos técnicos, typewriter, cortes de 1 frame. **Nunca** un desplazamiento largo. |
| `eo` (= `eo:expo`) | `1 − 2^(−10u)` | **Default.** Alpha y recorridos cortos (≤0.04 normalizado). |
| `eo:2` / `eo:3` / `eo:5` | `1 − (1−u)ᵖ` | Recorridos largos. `eo:3` es la cubic-out clásica. |
| `eio` (= `eio:3`) | `u<0.5 ? 4u³ : 1 − (−2u+2)³/2` | Traslados largos, cámaras, carries lentos. |
| `spring:z,w` | forma cerrada (abajo) | Pops, impactos, match-cuts. **Nunca sobre `alpha` ni `reveal`.** |
| `back:s` | `1 + v²((s+1)v + s)`, `v = u−1` | Overshoot de un solo rebote, sin residuo. |
| `step` | `u >= 1 ? 1 : 0` | Legal para edición a mano; **el compilador no lo emite** (usa el corte de 1 frame, abajo). |

⚠️ `eo` **no** es `1−(1−u)³`. Eso es `eo:3`. El default del motor es la **expo**, que hace la mitad del
recorrido en el primer 10 % del tiempo (tabla de perfiles en MOTION-PRINCIPLES §1.3). Confundirlos cambia
el carácter de todo el video.

```js
// spring subamortiguado en FORMA CERRADA (sin integración numérica → seek gratis)
function spring(u, z, w) {
  if (u <= 0) return 0
  if (u >= 1) return 1                       // ← fuerza e(1)===1 exacto
  const wd = w * Math.sqrt(1 - z * z)
  const e  = Math.exp(-z * w * u)
  return 1 - e * (Math.cos(wd * u) + (z * w / wd) * Math.sin(wd * u))
}
```

**Por qué `z·w ≥ 7` es una regla DURA y no un consejo.** El `return 1` de `u ≥ 1` es un clamp: la fórmula
en `u = 1⁻` vale `1 − e^(−z·w)·(cos wd + (z·w/wd)·sin wd)`, así que el clamp introduce un **salto** de
tamaño acotado por `e^(−z·w) / √(1−z²)`. Con `z·w ≥ 7` y `z ≤ 0.95` ese salto es ≤ **0.003** (≈0.4 px de
export en un recorrido de media pantalla): invisible. Con los rangos que traía la versión anterior de esta
doc (`z=0.05, w=4`, es decir `z·w = 0.2`) el salto medido es **0.569**: el objeto se teletransporta en el
último frame. Verificado numéricamente:

| `z,w` | `z·w` | `e(1⁻)` | salto |
|---|---|---|---|
| 0.05, 4 | 0.20 | 1.5692 | **0.5692** ✗ |
| 0.30, 6 | 1.80 | 0.8875 | **0.1125** ✗ |
| 0.60, 11 | 6.60 | 1.0005 | 0.0005 — **igual se rechaza**: `w = 11` está en rango pero `z·w < 7`. La regla es uniforme y conservadora a propósito; el valor sano más cercano es `spring:0.6,13` (`z·w = 7.8`), que además es el default de `ease.js`. |
| 0.72, 13 | 9.36 | 1.0000 | 0.0000 ✓ |
| 0.90, 14 | 12.60 | 1.0000 | 0.0000 ✓ |

**Invariante de todo ease** (`ease.js` lo cumple y el gate lo verifica numéricamente en 3 puntos):
`|e(0)| < 1e-9`, `|e(1) − 1| < 1e-9` y **`|e(1 − 1e-3) − 1| < 5e-3`** (esta tercera es la que caza el
spring mal parametrizado: sin ella, un ease que "aterriza" sólo gracias al clamp pasa el gate).
**`step` está exento de la tercera** por definición — es el único ease discontinuo del set, y es
precisamente por eso que el compilador no lo emite. Ease no
parseable o con parámetros fuera de rango → `E-SCHEMA-EASE`. `parseEase` **nunca tira**: ante un string
desconocido devuelve `eo` (el render no puede romper); el que rechaza es `schema.js`.

**Corte duro (flash-cut, receta #8)**: el compilador **no** emite `step`. Emite **dos keys separados un
frame** (`t` y `q(t + 1/fps)`) con `lin`. Como el renderer sólo muestrea `f/fps`, ningún frame cae dentro
de la rampa: el corte es exacto, y además editable (se puede arrastrar el segundo key para suavizarlo).
Dos keys con el **mismo** `t` siguen siendo ilegales (`E-TL-ORDER`).

### 1.7 Cómo se interpola `color`

Determinista y especificado al bit (no "más o menos"):

```js
function lerpColor(a, b, u) {                  // a,b = "#rrggbb"
  const A = hex2rgb(a), B = hex2rgb(b), out = [0,0,0]
  for (let i = 0; i < 3; i++) {
    const la = Math.pow(A[i] / 255, 2.2)       // sRGB → luz lineal
    const lb = Math.pow(B[i] / 255, 2.2)
    const l  = la + (lb - la) * u
    out[i] = Math.round(Math.pow(l, 1 / 2.2) * 255)   // vuelta a sRGB
  }
  return rgb2hex(out)                          // siempre minúsculas, 7 chars
}
```

Vive en `core/util.js` (es el único módulo de la whitelist de §7 donde entra; **no** crear `color.js`).

Interpolar en luz lineal evita el gris barroso del punto medio en sRGB.

**Alcance honesto del determinismo**: `Math.pow` es *implementation-approximated* en la spec de JS — está
garantizado estable dentro de un mismo motor/versión, **no** entre versiones de Node ni entre Node y el
browser. Lo que nos salva es el `Math.round(... * 255)`: una diferencia de 1 ulp en `pow` sólo cambia el
byte si el valor cae a menos de 1e-13 de un `.5` exacto. Por eso `E-DET` se define como **byte-idéntico en
la misma máquina y la misma versión de Node** (que es lo que necesita el export y lo que corre el gate), y
NO se promete reproducibilidad cross-engine. Si algún día hace falta, se reemplaza `pow` por una LUT de
256 entradas precomputada y commiteada.

---

## 2. El evaluador: `evalAt(timeline, t)`

```js
/**
 * @param {Timeline} tl  timeline v1 YA validada por schema.js
 * @param {number}   t   segundos, absoluto. El renderer pasa SIEMPRE f/fps con f entero.
 * @returns {Map<string, ResolvedLayer>}  sólo las capas VIVAS en t, en orden de pintado
 */
function evalAt(tl, t) { … }

ResolvedLayer = {
  id, kind, base,                 // referencias directas (no copias) para que kit/layers.js lea `str`, `obj`, etc.
  z,                              // = base.z (no animable en v1)
  x, y, w, h, scale, rot, alpha, reveal, sweep,   // numbers resueltos
  color                           // string "#rrggbb" o null
}
```

### 2.1 Propiedades del contrato

1. **Pura**: sin estado entre llamadas, sin `Date`, sin `Math.random`, sin lectura de DOM.
2. **Sin orden**: `evalAt(tl, 9.3)` en frío === `evalAt(tl, 9.3)` después de recorrer 280 frames (`E-SEEK`).
3. **Total**: definida para cualquier `t` real. `t` se clampea a `[0, dur]` de entrada.
4. **Determinista**: dos llamadas devuelven estructuras con los mismos números bit a bit (`E-DET`).
5. **Orden de pintado**: el `Map` se devuelve ya ordenado por `(z asc, índice de la capa en tl.layers asc)`.
   El desempate por índice es lo que hace estable el z-order (nunca dependa del orden de inserción del Map).
6. **Sólo lectura**: `ResolvedLayer.base` es **la referencia viva** del JSON, no una copia. Ningún consumidor
   (`render.js`, `kit/`, la UI) puede escribirla. Mutar `base` desde un pintor corrompe la timeline y el memo
   de 2.5 sin que salte ningún gate. Si un pintor necesita derivar algo, lo hace en variables locales.

### 2.2 Algoritmo

```js
function evalAt(tl, t) {
  const T = Math.min(Math.max(t, 0), tl.dur)
  const idx = compile(tl)                 // memo derivada, ver 2.5
  const out = new Map()

  // (1) capas vivas → props base
  for (const L of idx.layersSorted) {
    if (T < L.life[0] - EPS || T > L.life[1] + EPS) continue
    out.set(L.id, {
      id: L.id, kind: L.kind, base: L.base, z: L.base.z,
      x: L.base.box[0], y: L.base.box[1], w: L.base.box[2], h: L.base.box[3],
      scale:  L.base.scale  ?? 1,
      rot:    L.base.rot    ?? 0,
      alpha:  L.base.alpha  ?? 1,
      reveal: L.base.reveal ?? 1,
      sweep:  L.base.sweep  ?? -1,
      color:  L.base.color  ?? null,
    })
  }

  // (2) tracks → override de props
  for (const tr of tl.tracks) {
    const p = out.get(tr.layer)
    if (!p) continue                       // capa no viva en T → la track no cuesta nada
    p[tr.prop] = clampProp(tr.prop, sampleTrack(tr, T, tl))
  }
  return out
}
```

`clampProp` es la columna "Clamp al evaluar" de 1.5, escrita una sola vez (no la re-derive el ejecutor):

```js
const CLAMP = {                       // undefined = sin clamp (el overshoot es legítimo)
  w: v => (v < 1e-4 ? 1e-4 : v),
  h: v => (v < 1e-4 ? 1e-4 : v),
  scale: v => (v < 1e-4 ? 1e-4 : v),
  alpha:  v => (v < 0 ? 0 : v > 1 ? 1 : v),
  reveal: v => (v < 0 ? 0 : v > 1 ? 1 : v),
  color:  v => String(v).toLowerCase(),
}
const clampProp = (prop, v) => (CLAMP[prop] ? CLAMP[prop](v) : v)
```

El paso (1) **no** clampea: `base` ya viene validado por `schema.js` dentro de rango. El clamp existe sólo
para el overshoot que introduce un ease (un `back` sobre `alpha` puede pasar de 1 a mitad de segmento).

### 2.3 `sampleTrack` — los 5 casos, en orden

```js
function sampleTrack(tr, T, tl) {
  const K = tr.keys, n = K.length

  // CASO A · un solo key → constante en toda la vida (NO es un error; es el modo "set")
  if (n === 1) return K[0].v

  // CASO B · antes del primer key → HOLD del primer valor (no extrapolamos jamás)
  if (T <= K[0].t + EPS) return K[0].v

  // CASO C · después del último key → HOLD del último valor
  if (T >= K[n - 1].t - EPS) return K[n - 1].v

  // CASO D · búsqueda binaria del segmento [i, i+1] con K[i].t <= T < K[i+1].t
  let lo = 0, hi = n - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (K[mid].t <= T) lo = mid; else hi = mid
  }
  const a = K[lo], b = K[lo + 1]
  const span = b.t - a.t

  // CASO E · segmento degenerado (dos keys a <1e-6 de distancia) → gana el POSTERIOR (corte duro)
  if (span <= EPS) return b.v

  const u = (T - a.t) / span
  const e = parseEase(a.ease || tl.defaultEase || 'eo')(u)   // parseEase de core/ease.js, memoizado
  return (typeof a.v === 'string')
    ? lerpColor(a.v, b.v, e)
    : a.v + (b.v - a.v) * e
}
```

**Por qué HOLD y no extrapolación**: extrapolar con un spring fuera de [0,1] diverge y produce capas a
kilómetros del lienzo. El hold es la semántica de After Effects y la que espera el editor.

### 2.4 Resolución de props ausentes — tabla definitiva

| Situación | Valor resuelto |
|---|---|
| La capa no tiene track para ese prop | Valor base (tabla 1.4). `x,y,w,h` salen de `base.box[0..3]`. |
| Tiene track pero `T` está antes del primer key | `keys[0].v` (hold) |
| Tiene track pero `T` está después del último key | `keys[n−1].v` (hold) |
| Tiene track de 1 solo key | ese valor, siempre |
| `T` fuera de `life` | la capa **no aparece** en el Map (no se pinta) |

**`base` es el único lugar donde vive el "valor por defecto"**. El compilador nunca debe emitir un track de
un solo key con el mismo valor que `base`: es ruido para la UI (el gate lo reporta como warning blando).

### 2.5 `compile(tl)` — memo derivada (permitida)

```js
const _memo = new WeakMap()   // key: el objeto timeline · value: índice derivado
function compile(tl) {
  let m = _memo.get(tl)
  if (!m) {
    m = {
      layersSorted: tl.layers.map((L, i) => ({ ...L, _i: i }))
                             .sort((a, b) => (a.base.z - b.base.z) || (a._i - b._i)),
      byId: new Map(tl.layers.map(L => [L.id, L])),
    }
    _memo.set(tl, m)
  }
  return m
}
```

Reglas: el memo **sólo puede depender de `tl`, nunca de `t`**. Prohibido cachear "el último índice de key
visitado" (esa optimización asume playback monótono y rompe el seek). El editor produce un objeto timeline
NUEVO en cada comando (inmutabilidad) → el WeakMap se invalida solo.

**Costo**: `O(L + Σᵢ log kᵢ)` por frame, sumando sobre las `T` tracks. Un video típico (40 capas, ~120
tracks, ~300 keys → `k̄ ≈ 2.5`) da `40 + 120·⌈log₂ 2.5⌉ ≈ 2·10²` comparaciones más ~10 operaciones de
aritmética por track: **orden 10³ operaciones simples por frame**, contra los ~3·10⁵ píxeles que hay que
pintar. El evaluador nunca va a ser el cuello de botella; no lo optimices a costa de la pureza.

### 2.6 De props normalizados a pixeles (contrato con `render.js`)

```js
// render.js: una sola conversión, antes de llamar al pintor del kind
const ax = p.base.anchor?.[0] ?? 0.5, ay = p.base.anchor?.[1] ?? 0.5

// (1) el ANCLA en píxeles: se calcula con la caja SIN escalar (es el punto fijo del scale/rot)
const ancX = (p.x + p.w * ax) * tl.W
const ancY = (p.y + p.h * ay) * tl.H

// (2) el tamaño pintado, ya escalado
const pw = p.w * tl.W * p.scale
const ph = p.h * tl.H * p.scale

// (3) offset del CENTRO de la caja escalada respecto del ancla.
//     Con anchor=[0.5,0.5] da (0,0); con anchor=[0,0] (top-left) da (+pw/2, +ph/2).
const ox = (0.5 - ax) * pw
const oy = (0.5 - ay) * ph

ctx.save()
ctx.globalAlpha *= p.alpha
ctx.translate(ancX, ancY)
ctx.rotate(p.rot * Math.PI / 180)     // rot está en GRADOS en el JSON
ctx.translate(ox, oy)                 // ← sin esto, anchor ≠ centro pinta la capa corrida
drawKind[p.kind](ctx, { w: pw, h: ph, ...p })   // el pintor SIEMPRE pinta centrado en (0,0)
ctx.restore()
```

- **Invariante del ancla**: escalar o rotar mueve todo *menos* el punto `(ancX, ancY)`. Se verifica así:
  el borde izquierdo pintado queda en `ancX + ox − pw/2 = ancX − ax·pw`, que para `scale = 1` es
  exactamente `p.x · W`. ✔ (La versión anterior de esta doc afirmaba que bastaba con calcular `cx` con
  `p.w` y pintar centrado: eso sólo es correcto si `anchor = [0.5, 0.5]`, y descoloca la capa medio ancho
  en cualquier otro caso.)
- Sólo se aplica `ctx.rotate`, nunca `ctx.scale`: el escalado viaja en `pw/ph`, así el grosor de los trazos
  y el tamaño de fuente los decide el pintor (un `ctx.scale` engordaría los strokes y arruinaría el texto).
- El export a 1080×1920 aplica `ctx.setTransform(S,0,0,S,0,0)` con `S = 1080/405 = 2.6̄` **una vez** al
  principio del frame (`720·S = 1920` ✔). Nada en la timeline sabe de 1080.

---

## 3. Composición temporal: todo el azúcar se COMPILA

`timeline.js` expone un **builder** que se usa sólo en tiempo de compilación (`composer` + `linker` lo
alimentan). El builder emite el JSON plano de §1 y después se descarta. **El JSON no guarda nada relativo.**

### 3.1 El cursor y el resolvedor de posición

```js
const B = makeBuilder({ fps: 30, W: 405, H: 720, seed })
// estado interno del builder: { cursor, lastStart, lastEnd, labels: Map<string, number> }
```

`resolvePos(spec)` → segundos absolutos, **siempre cuantizados a la grilla** (`q(t) = Math.round(t*fps)/fps`):

| Forma | Significado | Resuelve a |
|---|---|---|
| `3.2` (number) | absoluto | `q(3.2)` |
| `"+=0.5"` | 0.5 s después del **final** de lo agregado hasta ahora | `q(cursor + 0.5)` |
| `"-=0.2"` | 0.2 s antes del final (solape) | `q(cursor − 0.2)` |
| `"<"` | mismo inicio que el último bloque agregado | `q(lastStart)` |
| `"<0.2"` / `"<-0.1"` | 0.2 s después / 0.1 s antes del **inicio** del último bloque | `q(lastStart ± d)` |
| `">"` | al **final** del último bloque (= append, es el default) | `q(lastEnd)` |
| `">-0.1"` | 0.1 s antes del final del último bloque | `q(lastEnd − 0.1)` |
| `"sc2"` | en el label `sc2` | `q(labels.get("sc2"))` |
| `"sc2+=0.3"` | 0.3 s después del label | `q(labels.get("sc2") + 0.3)` |

Gramática exacta (el ejecutor la implementa con este regex, no "a ojo"):

```
pos    := number | string
string := ( "+=" | "-=" ) num          // relativo al cursor
        | "<" [ sign num ]             // relativo al INICIO del último bloque
        | ">" [ sign num ]             // relativo al FIN del último bloque
        | label [ ("+="|"-=") num ]    // relativo a un label
label  := /^[a-z][a-z0-9_]*$/          // los sceneId (^sc[0-9]+$) son un subconjunto
num    := /\d*\.?\d+/
regex  := /^(?:([+-]=)(\d*\.?\d+)|([<>])([+-]?\d*\.?\d+)?|([a-z][a-z0-9_]*)(?:([+-]=)(\d*\.?\d+))?)$/
```

Orden de parseo: primero `+=`/`-=`, después `<`/`>`, y **al final** el label — así `"sc2-=0.25"` se lee
como (label `sc2`) − 0.25 y nunca como el operador `-=` suelto. Un label no puede empezar con `<`, `>`,
`+` ni `-`, ni contener `=`, lo cual hace la gramática no ambigua.

Label inexistente → error de compilación (`E-SCHEMA-LABEL`), nunca 0 silencioso. String que no matchea el
regex → `E-SCHEMA-POS`. Todo resultado pasa por `q()` **y** se clampea a `[0, +∞)`: una posición negativa
(p. ej. `"<-0.5"` en el primer bloque) es `E-SCHEMA-POS`, no un `t` negativo silencioso.
`cursor` se actualiza a `max(cursor, fin del bloque agregado)` — igual que el append de GSAP.

### 3.2 Labels vs markers

- **Labels** = herramienta del compilador (viven en el builder, no en el JSON).
- **Markers** = lo que sí se persiste, y sólo para escenas (`sceneId` obligatorio).
- Regla: por cada escena, el builder hace `B.label(sceneId, tAbs)` **y** `B.marker(tAbs, titulo, sceneId)`.
  Así el linker puede escribir posiciones como `"sc3-=0.25"` y el editor puede snapear al mismo instante.

### 3.3 Stagger — azúcar puro, se compila a keys absolutas

Firma del builder:

```js
B.stagger(layerIds, prop, [vFrom, vTo], {
  at,                    // posición (§3.1) del PRIMER item
  dur,                   // duración de cada item (s)
  ease   = 'eo',
  each   = 0.06,         // s entre items    (usar each O amount, no ambos)
  amount = null,         // s de spread TOTAL: each_efectivo = amount / (maxD || 1)
  from   = 'start',      // start | end | center | edges | random
  seedNs = 'stagger'     // namespace del prng cuando from = 'random'
})
```

Cálculo exacto del retardo del item `i` de `N`:

```js
// 1) distancia según `from`
d(i) = from === 'start'  ? i
     : from === 'end'    ? (N - 1 - i)
     : from === 'center' ? Math.abs(i - (N - 1) / 2)
     : from === 'edges'  ? ((N - 1) / 2) - Math.abs(i - (N - 1) / 2)
     : /* random */        perm[i]            // Fisher-Yates con prng(seed, seedNs) → determinista

// 2) normalización
maxD = Math.max(...d)                          // 0 si N === 1
step = amount != null ? (maxD > 0 ? amount / maxD : 0) : each

// 3) emisión (dos keys por item, valores explícitos: SIEMPRE fromTo, nunca "from el estado actual")
t0_i = q(at + step * d(i))
track(layerIds[i], prop).key(t0_i,       vFrom, ease)
track(layerIds[i], prop).key(q(t0_i + dur), vTo)
```

**Presupuestos de coreografía (duros, el gate los mira):**

| Parámetro | Valor | Motivo |
|---|---|---|
| `each` | 0.04 – 0.08 s | <0.04 se lee como simultáneo; >0.08 se lee como lento. |
| spread total (`step * maxD`) | ≤ 0.40 s | Más que eso y la escena "espera" al último item. |
| `N` por stagger | ≤ 8 | Con más, usar `amount` y bajar el spread, o partir en dos grupos. |
| `dur` de cada item | 0.28 – 0.55 s | Ver `MOTION-PRINCIPLES.md`. |

Ojo con `from`: `center` y `edges` producen `d(i)` **fraccionario** y `maxD = (N−1)/2`, o sea la mitad del
spread que da `start` con el mismo `each`. Si querés el mismo spread total, usá `amount`.

`track(layer, prop).key(t, v, ease)` **inserta ordenado** (búsqueda binaria + splice), no hace push: un
stagger puede caer entremedio de keys que ya existían. Si el `t` que se intenta insertar ya existe en esa
track (dentro de `EPS`), es `E-TL-ORDER` en tiempo de compilación — nunca "el último gana" en silencio.

En runtime **no existe** el concepto stagger: son N tracks con offsets distintos. Eso es lo que permite que
el usuario mueva UN item del stagger sin romper los otros (E2 del plan).

### 3.4 Sub-stagger dentro de una capa (logoRow, stepper)

Cuando el stagger es *interno* a una capa (los 5 logos de un `logoRow` son una sola capa), NO se inventan
capas: se anima un único prop `reveal` de 0→1 y el pintor del kind deriva el progreso del item `i` con la
fórmula cerrada:

```js
// en kit/layers.js — pura, sin estado
function itemProgress(reveal, i, n, overlap = 0.6) {
  const dur   = 1 / (1 + (n - 1) * (1 - overlap))
  const start = i * dur * (1 - overlap)
  return clamp((reveal - start) / dur, 0, 1)
}
```

Criterio para elegir: si el usuario debe poder mover/borrar los items por separado → capas separadas;
si es un bloque visual atómico → `reveal` interno.

### 3.5 Nesting: por qué lo APLANAMOS

GSAP anida timelines (`master.add(child, "-=0.3")`) y cada hija es un bloque reposicionable con su propio
`timeScale`. Nosotros usamos la misma **ergonomía de autor**, pero el resultado se aplana:

```js
const sub = makeBuilder({ fps })      // sub-timeline de la escena, t local desde 0
buildScene(sub, escena)
B.add(sub, resolvePos('sc2'))         // ← APLANA: suma el offset a todo lo de `sub`
```

`B.add(sub, tAbs)` copia a la timeline padre `sub.layers` (con `life += tAbs`), `sub.tracks`
(con `key.t += tAbs`) y `sub.markers` (con `t += tAbs`), re-cuantizando cada tiempo. Los ids se prefijan con
el `sceneId` para que sigan siendo únicos.

**Las 5 razones (para no re-discutirlo):**
1. `evalAt` sin recursión ni mapeo de tiempo padre→hija: el tiempo es **la identidad**, trivialmente invertible.
2. `timeScale` anidado haría el mapeo afín por rama; cualquier bug ahí es invisible y carísimo (lección ya pagada
   con las "ventanas de escena" del motor viejo).
3. La UI de timeline dibuja tracks planos: si el dato fuera un árbol, la UI tendría que aplanarlo igual en cada
   repaint.
4. Undo/redo hashea `JSON.stringify(tl)` — un árbol con referencias compartidas no hashea estable.
5. El linker necesita **cruzar** la frontera entre escenas (un carry vive en las dos). Con árbol, esa capa no
   tendría dónde vivir.

**Costo aceptado**: reordenar escenas obliga a re-offsetear keys en vez de mover un nodo. Es una función pura de
20 líneas (`shiftRange(tl, from, to, delta)`) y el gate la cubre.

### 3.6 Cambiar la duración de una escena (E1 del plan)

```
scaleRange(tl, t0, t1, k):
  para cada key.t, life[i], marker.t en [t0, t1]:  t' = q(t0 + (t - t0) * k)
  para todo lo que está DESPUÉS de t1:             t' = q(t + (t1 - t0) * (k - 1))
  dur' = q(dur + (t1 - t0) * (k - 1))
```

Reglas: (a) `k` se clampea para que ninguna vida quede < 0.4 s; (b) las capas de **carry** que cruzan `t0`/`t1`
se re-linkean en vez de escalarse (un match-cut escalado a 0.15 s se ve roto); (c) después siempre se re-corre
la validación de §5.

---

## 4. FLIP propio — match-cuts entre escenas

Destilado de `Flip.getState()` → cambio de DOM → `Flip.from()`. **Lo que sobrevive del algoritmo es la idea;
la mecánica cambia entera.**

### 4.1 La diferencia clave con el FLIP del DOM

| GSAP Flip (DOM) | El nuestro |
|---|---|
| **F**irst: `getBoundingClientRect()` de los elementos | `evalAt(tl, t0)` de la capa de A — la caja ya está declarada |
| **L**ast: se cambia el DOM y se vuelve a medir | `evalAt(tl, t0)` de la capa de B (su estado de inicio de escena) — tampoco hay que medir |
| **I**nvert: aplicar transforms para que el elemento *parezca* seguir en First | **No existe.** Escribimos el key inicial con el valor de First. |
| **P**lay: tween hacia 0 | Emitimos keys `First → Last` con `spring`/`eio` |

Por eso `absolute`, `nested`, `simple` y `scale` de `Flip.from()` **no tienen análogo**: son parches del layout
del navegador (ver §6).

### 4.2 Emparejamiento de capas

```js
function matchLayers(layersA, layersB) {
  const pairs = []
  for (const a of layersA) {
    const key = a.matchKey || autoKey(a)
    const cands = layersB.filter(b => (b.matchKey || autoKey(b)) === key && compatible(a.kind, b.kind))
    if (!cands.length) continue
    // desempate determinista: solape de caja + cercanía de centro + índice
    const best = cands.map((b, i) => ({ b, i, s: 0.6 * iou(a.base.box, b.base.box)
                                                 + 0.4 * (1 - dist(center(a), center(b)) / Math.SQRT2) }))
                      .sort((p, q) => (q.s - p.s) || (p.i - q.i))[0]
    pairs.push({ a, b: best.b, score: best.s })
  }
  return pairs
}

// matchKey automático cuando el composer no lo puso: identidad por contenido
function autoKey(L) {
  const sig = L.kind === 'text'    ? norm(L.base.str)
            : L.kind === 'photo'   ? L.base.src
            : L.kind === 'heroObj' ? L.base.obj
            : L.kind === 'badge'   ? norm(L.base.str)
            : null
  return sig ? `${L.kind}:${fnv1a(sig).toString(36)}` : `__nomatch_${L.id}`
}
```

`compatible(kindA, kindB)`: `true` si son iguales, o si ambos están en la familia
`{photo, heroObj}` (ambos son "el objeto grande de la escena"). Todo lo demás es incompatible.

**Los helpers, explícitos** (de ellos depende que dos corridas emparejen igual — nada de "más o menos"):

```js
const center = b => [b[0] + b[2] / 2, b[1] + b[3] / 2]          // box = [x,y,w,h] normalizado
const dist   = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1])   // máx. posible = √2 (de ahí Math.SQRT2)

function iou(A, B) {                                            // intersection over union, 0..1
  const ix = Math.max(0, Math.min(A[0] + A[2], B[0] + B[2]) - Math.max(A[0], B[0]))
  const iy = Math.max(0, Math.min(A[1] + A[3], B[1] + B[3]) - Math.max(A[1], B[1]))
  const inter = ix * iy
  const uni   = A[2] * A[3] + B[2] * B[3] - inter
  return uni > 0 ? inter / uni : 0
}

// FNV-1a 32 bits — el hash del matchKey automático. Los parámetros son los canónicos; cambiarlos
// cambia TODOS los autoKey y por lo tanto los emparejamientos: es un cambio de versión, no un refactor.
function fnv1a(s) {
  let h = 0x811c9dc5                                            // offset basis 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0                          // prime 16777619 (imul = 32 bits exactos)
  }
  return h >>> 0
}

// norm: minúsculas, sin acentos, sin puntuación de borde, espacios colapsados.
// Así "Envío gratis" y "ENVIO  GRATIS." dan la misma firma.
const norm = s => String(s)
  .normalize('NFD').replace(/[̀-ͯ]/g, '')             // saca diacríticos
  .toLowerCase().replace(/[^\p{L}\p{N} ]+/gu, ' ')
  .replace(/\s+/g, ' ').trim()
```

Nota sobre `dist(...)/Math.SQRT2`: la distancia se calcula en el espacio **normalizado** (el cuadrado
unitario), donde la diagonal máxima es √2 — por eso el término queda en `[0,1]` y las dos mitades del score
son comparables. NO usar píxeles acá (el lienzo es 405×720 y el término dejaría de estar normalizado).

### 4.3 La ventana de carry

```
tCut = marker de B (frontera exacta entre escenas)
dur  ∈ [0.30, 0.90]   ← límite duro del gate; el catálogo §5 del plan elige dentro
                        (default recomendado 0.42–0.55, MOTION-PRINCIPLES receta 9)
ovl  = 0.5            ← qué fracción de la transición ocurre ANTES del corte
t0   = q(tCut − dur * ovl)
t1   = q(t0 + dur)
```

Restricciones (si no se cumplen, se degrada a `dip-solapado`, receta #12):
`t0 ≥ life_A[0] + 0.25` y `t1 ≤ life_B[1] − 0.25`.

El margen es **0.25 s, no 0.15**: el carry recorta la vida de A a `[life_A[0], t0 − 1/fps]` (§4.4) y el
invariante #6 de §5 exige `life[1] − life[0] ≥ 0.20`. Con 0.15 el propio linker producía capas de vida
0.15 s que el gate rechazaba después — un fallo que sólo aparecía con escenas cortas. Con 0.25 queda
`0.25 − 1/30 = 0.2167 ≥ 0.20` ✔, ajustado pero correcto a 30 fps. **Si algún día `fps` baja a 24**
(`1/24 = 0.0417` ⇒ `0.208`) sigue entrando; el margen se recalcula como `0.20 + 2/fps` si se toca alguno
de los dos números.

### 4.4 Algoritmo completo (pseudocódigo ejecutable)

```js
/**
 * Emite el plan de carry para UN par (a,b). NO dibuja ni muta: devuelve el plan que aplica el linker.
 * @returns {null | {
 *   setLife:    Array<[layerId, [t0,t1]]>,
 *   setZ:       null | [layerId, z],
 *   dropKeys:   Array<{ layer, prop: '*'|Prop, from: number, to: number }>,  // rango SEMIABIERTO [from,to)
 *   keys:       Array<{ layer, prop, t, v, ease? }>
 * }}
 */
function flipCarry(tl, a, b, { tCut, dur, ovl = 0.5, ease = 'spring:0.9,14' }) {
  const t0 = q(tCut - dur * ovl), t1 = q(t0 + dur)
  const INF = Infinity

  // --- FIRST: estado de la capa de A en el instante en que la vamos a cortar
  const FIRST = evalAt(tl, t0).get(a.id)
  if (!FIRST) return null                       // A ya no estaba viva → sin carry
  if (FIRST.alpha < 0.05) return null           // A está tapada: no hay nada que carrear (§4.5)

  // --- LAST: estado de arranque de la capa de B, ANTES de tocarla
  //     (= evalAt en el inicio de su vida: base + los keys que caen exactamente ahí)
  const LAST = evalAt(tl, b.life[0]).get(b.id)
  if (!LAST) return null

  // --- DELTA + salida temprana
  const D = {
    x: LAST.x - FIRST.x, y: LAST.y - FIRST.y,
    w: LAST.w - FIRST.w, h: LAST.h - FIRST.h,
    scale: LAST.scale - FIRST.scale, rot: LAST.rot - FIRST.rot,
  }
  const movedPx = Math.hypot(D.x * tl.W, D.y * tl.H)
  const still   = movedPx < 0.5 && Math.abs(D.rot) < 1
                  && Math.abs(D.scale) < 0.01 && Math.abs(D.w * tl.W) < 1 && Math.abs(D.h * tl.H) < 1

  const out = { setLife: [], setZ: null, dropKeys: [], keys: [] }

  // --- CORTE DE VIDAS: sobrevive la capa de B.
  //     A muere UN FRAME ANTES de t0: en t0 nace B valiendo exactamente FIRST, así que si A siguiera
  //     viva en t0 las dos capas pintarían el mismo objeto en el mismo lugar (overdraw, y en el carry
  //     cruzado un doble alpha visible). El frame t0 lo pinta B y sólo B.
  out.setLife.push([a.id, [a.life[0], q(t0 - 1 / tl.fps)]])
  out.setLife.push([b.id, [t0, b.life[1]]])
  //   z del superviviente: el mayor de los dos, para que la placa de B no lo tape
  out.setZ = [b.id, Math.max(a.base.z, b.base.z)]

  // --- SUPRIMIR lo que pelea con el carry.
  //     De A: TODOS los props (no sólo CARRY_PROPS) a partir de su nueva muerte — si no, quedan keys
  //     fuera de `life` y salta E-SCHEMA-KEYLIFE. De B: sólo los props del carry, antes de t1.
  out.dropKeys.push({ layer: a.id, prop: '*', from: q(t0 - 1 / tl.fps), to: INF })
  for (const p of CARRY_PROPS) out.dropKeys.push({ layer: b.id, prop: p, from: -INF, to: t1 })
  //     `reveal`/`sweep` de B: se limpian SÓLO dentro de la ventana y se fuerzan a su valor neutro.
  //     (Si no se limpiaran, el key que B tenía en su life[0] chocaría en `t` con el que emitimos acá
  //      → dos keys en el mismo t → E-TL-ORDER.)
  out.dropKeys.push({ layer: b.id, prop: 'reveal', from: -INF, to: t1 })
  out.dropKeys.push({ layer: b.id, prop: 'sweep',  from: -INF, to: t1 })
  out.keys.push({ layer: b.id, prop: 'reveal', t: t0, v: 1 })   // el contenido ya está revelado
  out.keys.push({ layer: b.id, prop: 'sweep',  t: t0, v: -1 })  // sin destello durante el carry

  // --- ALPHA: SIEMPRE dos keys. Con un solo key el track queda constante (CASO A de 2.3) y B se
  //     quedaría con el alpha de A para toda su vida.
  out.keys.push({ layer: b.id, prop: 'alpha', t: t0, v: FIRST.alpha, ease: 'eo' })
  out.keys.push({ layer: b.id, prop: 'alpha', t: t1, v: LAST.alpha })

  if (still) return out            // sin keys de movimiento: evita micro-jitter

  // --- PLAY: dos keys por prop, valores explícitos (nunca relativos).
  //     TODOS con el MISMO ease y la MISMA ventana, o el objeto se deforma (MOTION-PRINCIPLES receta 9).
  for (const p of ['x','y','w','h','scale','rot']) {
    if (Math.abs(LAST[p] - FIRST[p]) < 1e-4) continue
    out.keys.push({ layer: b.id, prop: p, t: t0, v: FIRST[p], ease })
    out.keys.push({ layer: b.id, prop: p, t: t1, v: LAST[p] })
  }
  if (FIRST.color && LAST.color && FIRST.color !== LAST.color) {
    out.keys.push({ layer: b.id, prop: 'color', t: t0, v: FIRST.color, ease: 'eio' })
    out.keys.push({ layer: b.id, prop: 'color', t: t1, v: LAST.color })
  }
  return out
}

const CARRY_PROPS = ['x','y','w','h','scale','rot','alpha','color']
// `reveal` y `sweep` NO se carrean: se fuerzan a 1 y -1 en la ventana (ver arriba).
```

**Notas de aplicación del plan** (las hace el linker, en este orden, y después re-valida con §5):
`setLife` → `dropKeys` → `setZ` → `keys` (insertando ordenado). Un `dropKeys` que deja una track sin
ningún key **borra la track entera** (si no, `E-SCHEMA-EMPTYTRACK`). El ease `spring:0.9,14` cumple
`z·w = 12.6 ≥ 7` ✔ y es el recomendado por MOTION-PRINCIPLES receta 9; para recorridos de más de media
pantalla, `eio:3`.

**Por qué sobrevive la capa de B y no la de A**: la capa que sigue viva después del corte es la que el usuario
va a querer editar (pertenece a la escena que está mirando). Además su `sceneId` es el correcto para el
Inspector y para `scaleRange`.

**Continuidad garantizada por construcción**: `B(t0) = FIRST = A(t0)` por definición de `FIRST`. Ojo: eso
NO significa que la posición no cambie entre el frame `t0 − 1/fps` (que pinta A) y `t0` (que pinta B) — A
venía moviéndose y ese último paso es movimiento legítimo. Por eso `E-OBJ-JUMP` **no** se mide como
`|props(t0−1/fps) − props(t0)|` (eso da falsos positivos en cualquier capa rápida: a 0.3 normalizado/s son
4 px por frame). Se mide como está definido en §4.6.

### 4.5 Casos borde — todos con respuesta

| Caso | Qué hace el linker |
|---|---|
| **No hay par** (matchKey sin contraparte en B) | Sin carry. La capa de A usa su receta de salida; la de B, su entrada. Fallback global: `dip-solapado` (#12). |
| **Cambia el `kind`** (`heroObj`→`photo`) | Una sola capa no puede pintar dos kinds. Se usa **carry cruzado**: ambas capas viven en `[t0,t1]` (acá A **no** se corta un frame antes: su vida termina en `t1`), comparten *las mismas* keys de `x,y,w,h,scale,rot`, y se cruzan en alpha (A: 1→0 con `eio`; B: 0→1 con `eio`, cruce al 50 % en `t0+dur*0.5`). El resto igual. |
| **Cambia el aspect** (`|aspectA − aspectB| / aspectB > 0.15`) | Interpolar `w` y `h` linealmente estira la foto. Regla: se anima **sólo `w`** con las keys del carry, y cada capa deriva su `h` con sus propios keys, emitidos como track de `h` con los mismos tiempos: `h_i(t) = w(t) · (W/H) / aspect_i`. **El factor `W/H = 405/720 = 0.5625` no es opcional**: `aspect` está en píxeles (`w_px/h_px`) y `w`,`h` son fracciones de ejes distintos. Chequeo: `w=0.6, aspect=1.5` → `h = 0.6·0.5625/1.5 = 0.225` → `243×162 px` → `243/162 = 1.5` ✔ (con `h = w/aspect` daría `h=0.4` → `243×288` → aspect 0.84, la foto aplastada). Se combina con carry cruzado para que el cambio de recorte quede escondido en el cross-fade. |
| **Dos candidatos con el mismo matchKey en B** | Gana el de mayor `score` (0.6·IoU + 0.4·cercanía); empate exacto → menor índice. Determinista. |
| **`matchKey` presente en 3+ capas de A** | Se procesa por score descendente y cada capa de B se consume UNA sola vez (`used` set). Las sobrantes de A no carrean. |
| **`still` (delta ~0)** | Se hace el corte de vidas y la supresión de enter/exit, **sin emitir keys**. El objeto simplemente "no se entera" del corte de escena — que es exactamente el efecto buscado. |
| **La ventana no entra** (`t0 < life_A[0]+0.25` o `t1 > life_B[1]−0.25`) | Se recorta `dur` hasta 0.30 s; si aun así no entra → `dip-solapado`. |
| **La capa de A está tapada** (alpha < 0.05 en `t0`) | No hay nada que carrear visualmente → sin carry. |
| **`z` en conflicto** (la placa de B tiene z mayor) | La placa de B se limita a `z ≤ 5`; el carry toma `max(zA, zB)`. Si aún así queda tapado → error blando en el loop, no bloqueante. |
| **Carry con 3 escenas seguidas** (A→B→C con el mismo matchKey) | Se procesa por pares, en orden temporal. La capa superviviente de A→B (la de B) es la entrada de B→C. Ningún caso especial. |

### 4.6 Verificación del carry (lo que corre `director-linker-check`)

Por cada link, evaluar en los **frames enteros** de `[t0 − 2/fps, t1 + 2/fps]` (no en 12 puntos
arbitrarios: sólo los frames enteros existen en el video, y una grilla de 12 puntos cae entre frames y
mide cosas que nadie va a ver). Son ~26 evaluaciones por link.

1. En todo frame de la ventana hay ≥1 capa con `alpha > 0.02` → `E-EMPTY-FRAME`.
2. **Cobertura**: en todo frame de la ventana existe la capa de A **o** la de B (nunca el hueco de un
   frame sin el objeto carreado) → `E-OBJ-JUMP`.
3. **Continuidad en el corte** (la única medición que importa, y hay que hacerla bien):
   ```
   P_A = props de la capa de A en t0, evaluados IGNORANDO el corte de vida
         (= evalAt sobre la timeline PRE-link, o evalAt con life[1] extendido a t0)
   P_B = props de la capa de B en t0 sobre la timeline POST-link
   jump = ‖ (P_B.x−P_A.x)·W , (P_B.y−P_A.y)·H ‖  +  |Δw|·W + |Δh|·H  (esquinas, en px lógicos)
   exigir jump ≤ PX_TOL (2 px)
   ```
   Comparar en cambio `props(t0 − 1/fps)` contra `props(t0)` **no sirve**: mide el desplazamiento propio
   de A durante un frame, que en una capa rápida (0.3 normalizado/s en `x`) ya son 4 px legítimos.
   La continuidad de **velocidad** no se exige: un `spring` arranca con velocidad 0 mientras A venía en
   movimiento, y ese quiebre es deliberado (es lo que hace que el objeto "aterrice").
4. `dur ∈ [0.30, 0.90]` → `E-SCHEMA-RANGE`.
5. Ningún frame de la ventana pinta **las dos** capas del par salvo en carry cruzado (§4.5) → error
   blando `E-LAYER-COLLIDE` (síntoma de que el corte de vidas se aplicó mal).

---

## 5. Invariantes que verifica `director-timeline-check`

Lista numerada y cerrada. Cada una emite el código de la taxonomía §8 del plan. **Duro** = bloquea el push.

| # | Invariante | Código | Sev |
|---|---|---|---|
| 1 | `v === 1`; `fps ∈ {24,25,30,60}`; `W`,`H` enteros > 0; `dur > 0` | `E-SCHEMA-ROOT` | duro |
| 2 | Todos los tiempos (`dur`, `marker.t`, `life[0]`, `life[1]`, `key.t`) caen en la grilla `1/fps` (tol. 1e-6) | `E-SCHEMA-GRID` | duro |
| 3 | Ningún número es `NaN`/`±Infinity` en todo el JSON | `E-SCHEMA-NAN` | duro |
| 4 | `layer.id` único y con formato `^[a-z0-9]+(\.[a-z0-9_-]+)*$` | `E-SCHEMA-DUPID` | duro |
| 5 | `layer.kind ∈` enum (1.4) y `base` trae todas sus claves obligatorias, sin claves desconocidas | `E-SCHEMA-KIND` / `E-SCHEMA-BASEKEY` | duro |
| 6 | `0 ≤ life[0] < life[1] ≤ dur` y `life[1] − life[0] ≥ 0.20` | `E-SCHEMA-LIFE` | duro |
| 7 | `track.prop ∈` set cerrado (1.5) y el tipo de `v` coincide (string sólo en `color`) | `E-SCHEMA-PROP` | duro |
| 8 | `track.layer` existe en `layers` | `E-TL-ORPHAN` | duro |
| 9 | Un solo track por par `(layer, prop)` | `E-SCHEMA-DUPTRACK` | duro |
| 10 | `keys.length ≥ 1` y `keys[i].t < keys[i+1].t` **estricto** | `E-TL-ORDER` / `E-SCHEMA-EMPTYTRACK` | duro |
| 11 | Todo `key.t ∈ [life[0] − EPS, life[1] + EPS]` | `E-SCHEMA-KEYLIFE` | duro |
| 12 | Todo `key.ease` (si existe) matchea el regex de 1.6 y sus parámetros están en rango | `E-SCHEMA-EASE` | duro |
| 13 | Todo ease resuelto cumple `\|e(0)\| < 1e-9`, `\|e(1) − 1\| < 1e-9` y `\|e(1−1e-3) − 1\| < 5e-3` (chequeo numérico; `step` exento del tercero) | `E-SCHEMA-EASE` | duro |
| 14 | `key.v` dentro del rango del prop (tabla 1.5, con los márgenes de overshoot) | `E-SCHEMA-RANGE` | duro |
| 15 | `markers` ordenado por `t`, `sceneId` único, y todo `layer.sceneId` tiene su marker | `E-SCHEMA-MARKER` | duro |
| 16 | Para **todo** frame `f ∈ [0, dur·fps]`: `evalAt` devuelve ≥1 capa con `alpha > 0.02` **y** con área visible ≥ 5 % del lienzo, donde `área visible = área(bbox ∩ lienzo) / (W·H)` con la bbox **ya rotada y escalada** (§2.6) | `E-EMPTY-FRAME` | duro |
| 17 | Para todo carry declarado: continuidad en `t0` medida como en §4.6.3 (A pre-corte vs B post-link, **nunca** frame anterior vs frame actual) ≤ `PX_TOL` | `E-OBJ-JUMP` | duro |
| 18 | `evalAt(tl, t)` llamada dos veces devuelve valores idénticos; y `evalAt` en frío == tras recorrer todos los frames anteriores | `E-DET` / `E-SEEK` | duro |
| 19 | Durante `life`, la bbox de cada capa intersecta ≥ 60 % de su área con el lienzo, **salvo** en las ventanas de transición: `t ∈ [m.t − 0.5, m.t + 0.5]` para algún `m ∈ markers`. (Se define por markers **a propósito**: la timeline no persiste los links, y toda transición cruza un marker por construcción — así el gate no necesita un campo nuevo ni el output del linker.) | `E-LAYER-OOB` | duro |
| 20 | No hay ventana ≥ 1.2 s en la que **ningún** prop de **ninguna** capa cambie más de: 0.004 en `x/y`, 0.01 en `scale`, 1° en `rot`, 0.03 en `alpha/reveal` | `E-DEADAIR` | blando |
| 21 | Presupuesto: `layers.length ≤ 120`, `Σ keys ≤ 4000`, `tracks.length ≤ 400` | `E-SCHEMA-BUDGET` | blando |
| 22 | Ningún track de 1 solo key cuyo valor sea igual al valor base (track inútil, ruido para la UI) | `E-SCHEMA-NOOPTRACK` | blando |
| 23 | Tras cada comando del editor, el JSON sigue cumpliendo **todos los invariantes duros (1–19)**; los blandos (20–22) pueden degradarse y sólo se avisan. El editor CLAMPEA en vez de fallar | `E-EDIT-BREAK` | duro |
| 24 | `undo` de cualquier comando restaura `JSON.stringify(tl)` byte-idéntico | `E-EDIT-REVERT` | duro |
| 25 | `src/director/**` no importa nada fuera de la whitelist (`react` sólo en `src/pages/Director/`) | `E-INDEP` | duro |

Notas de implementación del gate:
- El chequeo 16 recorre **todos** los frames (14 s × 30 = 420 llamadas a `evalAt`): barato y sin excusas.
- El chequeo 18 se hace con dos pasadas: una secuencial `f = 0..N` y otra con los frames en orden barajado
  por el prng (`shuffled(seedFor(seed,'seek'), frames)`); se comparan los hashes por frame.
- **Forma del error**: la misma que ya emite `src/director/core/schema.js` — `err(code, path, msg)` →
  `{ code, path, msg }`, más los opcionales `{ sev: 'duro'|'blando', layerId, prop, t }` cuando aplican.
  `path` es un puntero tipo JSON-path (`tracks[3].keys[1].t`), que es lo que necesita el Inspector para
  saltar al lugar exacto. **No** inventar una forma nueva: `formatErrors()` y los gates ya asumen ésta.
- **Nombres de código**: todo lo que valida `schema.js` es `E-SCHEMA-<qué>`, con las dos excepciones que
  fija el plan §8 y que se respetan tal cual: `E-TL-ORDER` y `E-TL-ORPHAN`. Los códigos `E-TL-LIFE` y
  `E-TL-EASE` que hoy emite el archivo son los nombres viejos: se renombran a `E-SCHEMA-LIFE` y
  `E-SCHEMA-EASE` (§8).

---

## 6. Qué NO aplica a nosotros (y por qué)

Todo esto está en las skills de GSAP y es **deliberadamente irrelevante** acá. Está listado para que el
ejecutor no lo "porte por las dudas".

| De la skill | Por qué no aplica |
|---|---|
| **ScrollTrigger, ScrollSmoother, `scrub`, `pin`** | No hay scroll, ni viewport, ni usuario navegando. El único parámetro temporal es `t`. La skill insiste en "poné el ScrollTrigger en la timeline, no en los hijos": no hay hijos ni ScrollTrigger. |
| **`Flip.getState()` y `getBoundingClientRect`** | Medimos con `evalAt`, no con el layout engine. Nuestras cajas son la fuente de verdad, no un efecto secundario del CSS. |
| **`Flip.from` vars: `absolute`, `nested`, `simple`, `scale`** | Son parches para que el layout del DOM no reflowee mientras animás. En canvas 2D no hay layout: las cajas son absolutas por construcción. |
| **CSSPlugin, camelCase, `transform` aliases, `xPercent`** | No hay CSS. Nuestro set de props es cerrado y ya está en unidades normalizadas. |
| **`autoAlpha` / `visibility` / pointer-events** | El video no recibe eventos. El hit-test del editor es nuestro (punto vs caja rotada, en `editorState.js`), no del DOM. |
| **"No animes `width`/`height`, usá transforms"** | Es un consejo de reflow/compositing del navegador. En canvas 2D pintar con otro `w` cuesta exactamente lo mismo. Nosotros **sí** animamos `w`/`h` (es central en el FLIP). |
| **GPU / `will-change` / capas de composición** | El pintado es CPU, un solo canvas, sin capas de compositing. La performance la manda la cantidad de pixeles y de sombras, no los transforms. |
| **`gsap.matchMedia()`, breakpoints, `prefers-reduced-motion`** | La salida es un MP4 9:16 de tamaño fijo. No hay media queries. Un futuro 16:9 sería otro render, no una query. |
| **`onStart` / `onComplete` / `onUpdate`** | Rompen la pureza y el seek: dependen de "pasar por" un instante, y con seek aleatorio no se pasa por ningún lado. Prohibidos en el JSON y en el evaluador. |
| **`repeat`, `yoyo`, `repeatDelay`, `timeScale`, `reverse()`** | No se persisten. Un loop se compila a keys explícitas. El `timeScale` del **preview** (0.5×/2×) es del reproductor de la UI y no toca el JSON. |
| **`gsap.from()` / `immediateRender`** | Existen porque GSAP lee el estado actual del DOM. Nosotros siempre escribimos `fromTo` explícito: los dos extremos son números en el JSON. |
| **Valores relativos (`x: "+=20"`) y function-based values** | Dependen de un estado "actual" en el momento del primer render → no determinista y no seekeable. El **compilador** puede usarlos como azúcar; el JSON guarda números. |
| **`overwrite: auto` / resolución de conflictos** | No puede haber conflicto: un track por `(layer, prop)`. El compilador es la única autoridad. |
| **Plugins: SplitText, MorphSVG, DrawSVG, MotionPath, Draggable, Inertia, Physics, Pixi** | El split de texto es `core/text.js`; el morph es la receta `morph-punto` (#2 del catálogo); el trazo es el prop `reveal` de un `shape`; el drag es del editor sobre canvas. Ninguno entra al runtime. |
| **`CustomEase` con paths SVG** | v1 usa el set cerrado de 1.6. Si E3 agrega curvas custom, serán **cubic-bezier propias de 2 handles** serializadas como `cubic:x1,y1,x2,y2` (el nombre que ya fija MOTION-PRINCIPLES §1.6 — no `cb:`), con el mismo contrato `f(0)=0, f(1)=1`, bump de `v` y migrador. |
| **`requestAnimationFrame`, delta time, `tl.play()`** | El motor nunca corre en tiempo real: recibe `t` y pinta. El preview de la UI sí usa rAF, pero **fuera** de `src/director/core/`, y calcula `t = (now − t0)` → siempre lo cuantiza a `f/fps` antes de llamar al motor. |
| **`gsap.registerPlugin`, npm `gsap`, Club GSAP** | Cero dependencias de animación. El gate `director-independence-check` falla si aparece cualquier import fuera de la whitelist. |

---

## 7. Checklist para el ejecutor de `core/timeline.js`

1. `parse/validate(tl)` → array de errores tipados (§5). Nunca lanza; devuelve.
2. `evalAt(tl, t)` exactamente como §2.2/§2.3, con el memo `WeakMap` de §2.5.
3. `makeBuilder({fps,W,H,seed})` con `label`, `marker`, `layer`, `track/key`, `stagger`, `add(sub, pos)`,
   `resolvePos` (§3.1) y `q()` aplicado a **todo** tiempo antes de escribirlo.
4. `shiftRange`, `scaleRange` (§3.6) puros, devolviendo una timeline nueva (inmutabilidad para undo/redo).
5. `flipCarry` (§4.4) vive en `linker.js` y sólo **consume** `evalAt`; no conoce recetas ni dibuja.
6. Ningún `import` fuera de `./ease.js`, `./prng.js`, `./util.js`, `./schema.js`. Reparto: `q`, `clamp`,
   `lerpColor`, `hex2rgb/rgb2hex`, `iou/center/dist`, `fnv1a`, `norm` viven en `util.js`; `parseEase` en
   `ease.js`; `mulberry32/seedFor/shuffled` en `prng.js`. **No** crear `color.js` ni `geom.js`: la
   whitelist es la whitelist (gate `E-INDEP`).
7. Test de humo mínimo antes de seguir: una timeline de 2 capas y 3 tracks, `evalAt` en `t=−1`, `0`,
   entre keys, exactamente en un key, en el último key, en `dur+1`, y con una track de 1 solo key.
8. Ningún `Math.random`, `Date.now`, `performance.now`, `document`, `window` ni `requestAnimationFrame`
   en `core/`. El gate los grepea junto con los imports.

---

## 8. Deudas con el código de F0.3 ya commiteado

`src/director/core/{ease,schema}.js` se escribieron antes que esta doc y **no la cumplen**. Esto no es una
lista de sugerencias: hasta que se cierre, un timeline válido según esta doc es rechazado por el validador
real. Se salda al abrir F3 (`timeline.js`), **antes** de escribir el evaluador.

| # | Archivo | Hoy | Debe quedar | Por qué |
|---|---|---|---|---|
| 1 | `schema.js` | `PROPS` no incluye `'color'` y `validateTimeline` exige `isNum(k.v)` | agregar `'color'` a `PROPS`; el tipo de `v` se valida **por prop** (string `^#[0-9a-f]{6}$` sólo en `color`, number en el resto) | el plan §6 ya lista `color?` y §1.7 de esta doc especifica su interpolación; hoy un key de color es `E-SCHEMA-TYPE` |
| 2 | `schema.js` | `PROP_DEFAULT.sweep = 0` | `-1` | `0` es un valor **dentro** de `[0,1]` ⇒ toda capa sin track de sweep nace con el destello pegado al borde. El neutro es fuera del rango (§1.4) |
| 3 | `schema.js` | `PROP_DEFAULT` trae `x/y/w/h` (0.5/0.5/0.8/0.2) | esos cuatro salen **siempre** de `base.box`; sacarlos del mapa de defaults | dos fuentes para el mismo valor es exactamente el bug que §2.4 prohíbe |
| 4 | `schema.js` | códigos `E-TL-LIFE` / `E-TL-EASE` | `E-SCHEMA-LIFE` / `E-SCHEMA-EASE` | §5, notas de nombres |
| 5 | `schema.js` | `validateTimeline` no chequea grilla, `NaN`, dup `(layer,prop)`, key⊆life, rango por prop, ni markers | invariantes 2, 3, 9, 11, 14, 15 de §5 | hoy pasa un JSON con keys fuera de la vida de su capa |
| 6 | `ease.js` | tokens sueltos `co/ci/cio/qo`; `parseEase('eo:3')` **ignora el `:3`** y devuelve expo | soportar el sufijo `:p` de §1.6 (`eo:2/3/5`, `ei:*`, `eio:2/3/5`) y **eliminar** los tokens sueltos: `co`→`eo:3`, `qo`→`eo:5`, `ci`→`ei:3`, `cio`→`eio:3`. Se pueden borrar sin migrador: no existe todavía ningún `timeline.json` persistido (sólo los mencionan `schema.js:279` y `tools/director-test.mjs:54,64`, que se actualizan en el mismo commit) | MOTION-PRINCIPLES receta 1 pide `eo:3` para texto: hoy eso se pinta con expo **en silencio**, que es el peor tipo de bug. Y dos nombres para la misma curva garantizan que el Inspector y el compilador terminen discrepando |
| 7 | `ease.js` / `schema.js` | `isEase` acepta `spring` con `z ∈ (0,1)`, `w > 0` | `z ∈ [0.40,0.95]`, `w ∈ [8,20]`, **`z·w ≥ 7`** | sin eso entra `spring:0.05,4`, que salta 0.57 en el último frame (§1.6) |
| 8 | `ease.js` | `spring()` clampea `z` adentro pero no `w`, y `isEase` no valida el producto | validar en `schema.js` (no clampear en silencio en `ease.js`) | el clamp silencioso hace que el Inspector muestre un valor y el motor use otro |

Regla mientras la deuda esté abierta: **ningún gate nuevo se escribe contra el comportamiento actual del
código**; se escribe contra esta doc y se deja fallando (o `.skip` con el número de deuda en el mensaje).
