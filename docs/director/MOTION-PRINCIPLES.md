# MOTION PRINCIPLES — motor Director (curvas, tiempos y coreografía)

> **Destilado (dev-time, una sola vez, F0.1)** de: `gsap-skills` (gsap-core · gsap-timeline · gsap-utils · gsap-performance), `genjutsu/_jutsu` (motion-principles + `references/easing-guide.md` + `references/enter-exit-recipes.md`, swiftui-motion/`springs-cheatsheet.md`, compose-motion, framer-motion) y la lección anti-shimmer YA PAGADA por este repo (`docs/URVID-1.0-NEXT.md` §1). **El motor no importa ni referencia ninguna de esas skills/libs: esta doc es la única fuente.** Implementación destino: `src/director/core/ease.js` (curvas, YA ESCRITO — ver §1) y `src/director/core/timeline.js` (evaluador).
>
> **Reparto de autoridad (para que no haya dos docs normativas peleando):**
> - `TIMELINE-SPEC.md` manda sobre el **esquema**: shape del JSON, enums de `kind`, set y rangos de `prop`, `life`, invariantes 1–25, algoritmo de `evalAt`, FLIP.
> - **Esta doc manda sobre la FORMA de las curvas y los tiempos**: qué hace cada token de ease, qué curva/duración para qué gesto, coreografía y presupuestos.
> - Donde las dos discrepan hoy, la lista exacta de deltas y quién gana está en **§1.7**. El ejecutor arregla esos deltas ANTES de escribir `timeline.js`.

---

## 0. Contexto de nuestro motor (esto condiciona TODO lo que sigue)

| Hecho | Consecuencia para el movimiento |
|---|---|
| `drawFrame(ctx, t)` **puro y determinista**, seek-safe | Toda animación es `f(t)`. Prohibidos acumuladores, velocidad "arrastrada", integración numérica de springs, `Math.random()` en runtime. |
| Timeline pre-compilada, **sin interrupciones ni input** | No existen "tweens que se pisan", `overwrite`, ni gestos. Cada track es una lista de keys ordenada. |
| Lienzo lógico **405×720**, export a **1080×1920** (escala `S = 1080/405 = 2.6̄`) | 1 px de export = **0.375 px lógicos**. La cuantización importa (§5). |
| Cajas en **coordenadas normalizadas 0..1** | Mover 0.01 en `x` = 4.05 px lógicos = 10.8 px de export. Los "8 px" del mundo web son **0.011 de alto** o **0.02 de ancho** en nuestro sistema. |
| fps = **30** | 1 frame = **0.0333 s**. El piso general de un gesto son **4 frames (0.133 s)**; las únicas excepciones están tabuladas en §4.4. |
| El espectador es **pasivo** (mira un video, no opera una UI) | Los presupuestos de UI ("nunca más de 500 ms") NO aplican; sí aplican los de lectura (§4). |
| Props del set cerrado v1: `x,y,w,h,scale,rot,alpha,reveal,sweep,color` | Cada gesto de §2 se expresa SOLO con esos props. `color` es el único de tipo string y se interpola en **luz lineal** (`lerpColor`, TIMELINE-SPEC §1.7), nunca en sRGB directo. |
| **No hay hooks de runtime**: la timeline sólo contiene keys | Cualquier "función de tiempo" (shake, ruido, contador) o se **compila a keys** (una por frame si hace falta) o vive dentro del pintor del kind. Un track NO puede llamar a una función en `evalAt`. Ver §2.2. |

Unidades y defaults de cada prop: **tabla 1.5 de `TIMELINE-SPEC.md`** (no se duplican acá para no derivar). Lo único que hay que tener en la cabeza al leer esta doc: `x,w` son fracción de `W=405`; `y,h` son fracción de `H=720`; `scale` multiplica alrededor de `base.anchor`; `reveal` y `alpha` viven en 0..1 con clamp al pintar. Un prop sin track vale su valor de `base` (default `alpha=1`, `scale=1`, `rot=0`, `reveal=1`, `sweep=-1`, `color=null`).

Convención de ángulos: `rot` en **grados** (más editable en el Inspector), convertido a radianes en `render.js`. Coincide con TIMELINE-SPEC §1.5/§2.6.

---

## 1. `ease.js` — parser y fórmulas cerradas

### 1.1 Firma y semántica

`src/director/core/ease.js` **ya existe y ya está escrito**. Esta doc se ajusta a él (no al revés): cambiar los tokens ahora significaría reescribir el parser, el validador y el dropdown del Inspector para no ganar nada.

```js
// src/director/core/ease.js  — 100% propio, sin deps
export function parseEase(str)          // string -> (u:number)=>number   [memoizado en un Map]
export function isEase(str)             // validador puro para schema.js  (NO se llama isValidEase)
export const easeName = str => '...'    // etiqueta legible para el Inspector
// además exporta las curvas sueltas: lin, expoOut, expoIn, expoInOut, cubicOut, cubicIn,
// cubicInOut, quintOut, backOut(t,s), spring(t,z,w)  y los helpers win/wobble/stagger.
```

- `u` es el **progreso normalizado del segmento**, `u ∈ [0,1]`. La función DEBE cumplir `f(0)=0` y `f(1)=1` (invariante 13 de TIMELINE-SPEC: `|e(0)|<1e-9`, `|e(1)−1|<1e-9`). `parseEase` envuelve toda curva en `clamp01`, así que `u` fuera de rango nunca extrapola.
- `parseEase` es **pura y memoizada por string** (`Map<string, fn>`): un `evalAt` no debe asignar memoria por frame.
- **Regla de propiedad del ease**: el campo `ease` de la key `k` gobierna el segmento `[k.t, k_{siguiente}.t]`. La última key de un track ignora su `ease` (pero es legal tenerlo). Key sin `ease` ⇒ `tl.defaultEase` ⇒ `'eo'`.
- String desconocido: `parseEase` **no tira** (el render nunca debe romper) — cae a `eo` en silencio. **No hay flag de fallback**: cualquier `parseEase.lastFallback` sería estado global mutable observable y rompería la pureza que pide el gate `E-DET`. El que rechaza un ease inválido es `schema.js`, con el código **`E-TL-EASE`** (así lo emite hoy `src/director/core/schema.js:270`; TIMELINE-SPEC §5 lo llama `E-SCHEMA-EASE` — ver delta D7 en §1.7).

### 1.2 Gramática (la que YA implementa `ease.js`)

```
ease := 'lin'                     f(u) = u
      | 'eo'                      expo out      1 − 2^(−10u)
      | 'co'                      cubic out     1 − (1−u)³
      | 'qo'                      quint out     1 − (1−u)⁵
      | 'cio'                     cubic in-out
      | 'eio'                     expo in-out                 ← ver aviso abajo
      | 'back:' s                 s ∈ [0.5, 3.0]              (el parser acepta más; §1.4 es el rango de diseño)
      | 'spring:' z ',' w         z ∈ [0.40, 0.95], w ∈ [8, 20], z·w ≥ 7   (idem: rango de diseño)
```

El parser además conoce `ei` (expo in), `ci` (cubic in) y `step`. **Los tres están PROHIBIDOS por política**, no por sintaxis:
- `ei`/`ci` (ease-in puro) no aparecen en ninguna receta: nuestro exit no usa ease-in (§6, última fila).
- `step` está prohibido porque un corte se escribe como **dos keys separadas 1 frame con `lin`** (§2 #6 y TIMELINE-SPEC §1.6): es exacto, editable y no agrega gramática. `schema.js` debe rechazarlo.

> **Aviso de nombre — el único que confunde**: en `ease.js`, **`eio` es EXPO in-out**, no cubic in-out. Es una curva con una zona central casi plana y dos rampas violentas: **no la uses**. Cada vez que esta doc quiere un in-out "de cámara" escribe **`cio`** (cubic in-out) explícitamente. Si en algún lugar heredado ves `eio`, asumí que quiso decir `cio`.

Todo string se serializa tal cual en la timeline y el Inspector lo dibuja muestreando `f(u)` en 64 puntos.

### 1.3 Fórmulas exactas

```js
const lin        = u => u
const expoOut    = u => (u >= 1 ? 1 : 1 - Math.pow(2, -10 * u))        // 'eo'
const cubicOut   = u => 1 - (1 - u) ** 3                               // 'co'
const quintOut   = u => 1 - (1 - u) ** 5                               // 'qo'
const cubicInOut = u => (u < 0.5 ? 4 * u ** 3 : 1 - Math.pow(-2 * u + 2, 3) / 2)   // 'cio'
const backOut    = (u, s) => { const v = u - 1; return 1 + v * v * ((s + 1) * v + s) }
function spring(u, z, w) {                       // subamortiguado, FORMA CERRADA
  if (u <= 0) return 0
  if (u >= 1) return 1
  const wd = w * Math.sqrt(1 - z * z)
  return 1 - Math.exp(-z * w * u) * (Math.cos(wd * u) + (z * w / wd) * Math.sin(wd * u))
}
```

**Perfil de cada curva (valor de `f(u)`, verificado numéricamente) — para elegir con datos, no con intuición:**

| u | `lin` | `co` (cubic out) | `qo` (quint out) | `eo` (expo out) | `cio` (cubic in-out) |
|---|---|---|---|---|---|
| 0.10 | 0.100 | 0.271 | 0.410 | **0.500** | 0.004 |
| 0.20 | 0.200 | 0.488 | 0.672 | **0.750** | 0.032 |
| 0.30 | 0.300 | 0.657 | 0.832 | **0.875** | 0.108 |
| 0.50 | 0.500 | 0.875 | 0.969 | **0.969** | 0.500 |
| 0.70 | 0.700 | 0.973 | 0.998 | **0.992** | 0.892 |
| 0.90 | 0.900 | 0.999 | 1.000 | **0.998** | 0.996 |

Lectura obligatoria de esa tabla: **`eo` (expo) hace la mitad del recorrido en el primer 10 % del tiempo**. Es perfecto para `alpha` y para recorridos cortos (≤ 0.04 normalizado), pero en un desplazamiento largo (> 0.15 normalizado ≈ 60 px lógicos) se lee como un SALTO seguido de arrastre. Para recorridos largos: **`co`** (o `qo` si se quiere más "aire" cinematográfico).

**Residuo de `eo` (el detalle que nadie mira)**: `expoOut` no llega a 1 por la fórmula, llega por el guard `u>=1 → 1`. En el último frame antes del final (`u = 29/30`) vale `0.99878`, o sea que hay un **snap final del 0.12 % del recorrido**. Sobre un desplazamiento de 0.03 normalizado en `y` eso son 0.07 px de export: invisible. Sobre un recorrido de pantalla completa serían ~2 px: **por eso `eo` no se usa para desplazamientos largos** (misma conclusión que el párrafo anterior, ahora con el número).

### 1.4 `back:s` — sobrepaso controlado

Rango de diseño: **`s ∈ [0.5, 3.0]`** (el piso 0.5 es el que exige el esquema, TIMELINE-SPEC §1.6; por debajo el sobrepaso es < 1 % y no se ve). Máximo de la curva y su instante (derivado, no estimado):

```
u_pico = 1 - 2s / (3(s+1))          sobrepaso = f(u_pico) - 1 = 4 s³ / (27 (s+1)²)
```

| `s` | sobrepaso | u_pico | carácter |
|---|---|---|---|
| 0.6 | **1.3 %** | 0.75 | apenas un guiño; el único permitido sobre TEXTO (§5) |
| 1.0 | **3.7 %** | 0.67 | sobrio, corporativo |
| 1.4 | **7.1 %** | 0.61 | pop de badge/píldora |
| 1.70158 | **10.0 %** | 0.58 | el "back.out clásico" (y el default de `backOut` en `ease.js`); techo para objetos medianos |
| 2.2 | **15.4 %** | 0.54 | sólo objeto héroe chico |
| 3.0 | **25.0 %** | 0.50 | prohibido salvo receta `impact` |

`back` es de **un solo rebote** (sube, sobrepasa, baja y se queda). Si querés más de un rebote → `spring`. `back` no oscila: es más barato de leer y NO deja residuo (`f(1)=1` exacto).

### 1.5 `spring:z,w` — el caballo de batalla

`z` (zeta, amortiguación) y `w` (omega, velocidad angular) se aplican sobre el **progreso normalizado del segmento**, NO sobre segundos. Consecuencia clave y deliberada: **estirar un keyframe en el editor conserva la forma del rebote** (sólo cambia su velocidad real). La frecuencia real en segundos es `wd / (2π · Δt)` Hz, con `Δt` = duración del segmento.

Métricas cerradas (usalas para elegir, no tantees):

```
wd        = w·√(1−z²)                                  frecuencia amortiguada (normalizada)
sobrepaso = exp(−π z / √(1−z²))                        primer pico, como fracción del recorrido
u_pico    = π / wd                                     instante normalizado del primer pico
u_settle  = ln( 1 / (0.02·√(1−z²)) ) / (z·w)           llega al 2 % del objetivo
residuo   = e^(−z·w) · (1 + z·w/wd)                    error en u=1 (tamaño del "snap" final)
```

| `z,w` | sobrepaso | u_pico | u_settle(2 %) | residuo | carácter | uso |
|---|---|---|---|---|---|---|
| `0.90,14` | 0.15 % | 0.515 | 0.376 | 0.001 % | **CRISP** — sin rebote visible | movimientos de cámara/placas, carry FLIP |
| `0.80,13` | 1.5 % | 0.403 | 0.425 | 0.007 % | **FIRME** | entrada de card/foto |
| `0.70,12` | 4.6 % | 0.367 | 0.506 | 0.04 % | **POP DISCRETO** | entrada de objeto genérica |
| `0.62,12` | 8.4 % | 0.334 | 0.558 | 0.10 % | **POP** (default del motor) | objeto héroe, badges |
| `0.55,13` | 12.6 % | 0.289 | 0.572 | 0.13 % | **VIVO** | 1 vez por escena máx. |
| `0.50,14` | 16.3 % | 0.259 | 0.579 | 0.14 % | **IMPACTO** | receta `impact`, número punch |
| `0.45,16` | 20.5 % | 0.220 | 0.559 | 0.11 % | **CELEBRACIÓN** | 1 vez por VIDEO máx. |

(La columna `residuo` es la **cota** `e^(−zw)·(1 + zw/wd)`; el error real en `u=1⁻` es menor porque el coseno y el seno no valen 1 a la vez. Verificado numéricamente: para `0.62,12` la cota da 0.105 % y el real es 0.058 %.)

Reglas duras de spring:
1. **`z·w ≥ 7`**. Es lo que acota el `residuo` — el salto de `f(1⁻)` a `1` que fuerza el guard — a **≤ 0.3 %** del recorrido. En píxeles: `residuo_px = residuo · |Δv| · 1080` (o `·1920` si el prop es `y`/`h`). Con la cota de 0.3 % eso son < 0.5 px de export sólo si `|Δv| ≤ 0.15`; para recorridos más largos usá una fila con residuo ≤ 0.05 % (las dos primeras) o `cio`. Si querés más rebote, **bajá `z` y SUBÍ `w`**, nunca bajes `z·w`.
   ⚠️ **Esto NO lo valida el esquema hoy**: TIMELINE-SPEC §1.6 acepta `z ∈ [0.05, 0.999]`, `w ∈ [4, 30]` y no mira el producto. `z·w ≥ 7` y los rangos de acá son un **motion-lint** que hay que agregar (delta D3 en §1.7). Hasta que exista, es responsabilidad del compilador no emitir springs fuera de tabla.
2. `z ≥ 0.40` siempre. `z=0` es oscilación perpetua (basura). Por debajo de 0.40 el segundo rebote se hace visible y parece un bug.
3. **`u_pico · Δt` debe caer en 0.10–0.22 s**, para que el pop se lea como "snap" y no como cámara lenta. La regla aplica al **gesto de entrada principal** (§2 #2) y a cualquier spring con sobrepaso ≥ 3 % (`z ≤ 0.75`). Con el default (`0.62,12`, `u_pico=0.334`) implica **Δt ∈ [0.30, 0.66] s**, que es exactamente el rango de nuestras entradas.
   **Exentos**: (a) los springs CRISP/FIRME (`0.90,14` y `0.80,13`, sobrepaso < 2 %), donde no hay pop que leer — por eso el carry puede durar 0.55 s con `0.90,14` aunque `u_pico·Δt = 0.28`; (b) los sub-gestos transitorios (vuelta del pop #4, cola del follow-through §3.4b), que son remates de un gesto ya leído, no gestos propios.
4. Nunca spring sobre `alpha` (el sobrepaso daría alpha > 1, que se clampea y produce una meseta rara) ni sobre `reveal` (idem, y una máscara que retrocede se ve como error). Tampoco sobre `color`: el overshoot en luz lineal satura el canal y produce un flash de color inventado.

### 1.6 Evaluador de segmento (contrato con `timeline.js`)

La implementación normativa es **`sampleTrack` de TIMELINE-SPEC §2.3** (5 casos, con `EPS = 1e-6`, hold en los dos extremos, corte duro en segmento degenerado y `lerpColor` si `v` es string). Reproducida acá sólo para que se vea dónde entra el ease:

```js
// keys ordenadas por t, t ESTRICTAMENTE creciente (gate E-TL-ORDER)
const u = (T - a.t) / (b.t - a.t)                       // a,b = keys del segmento; span > EPS
const e = parseEase(a.ease || tl.defaultEase || 'eo')(u)
return (typeof a.v === 'string') ? lerpColor(a.v, b.v, e) : a.v + (b.v - a.v) * e
```

Sin extrapolación, sin "auto-tangentes", sin bezier de 2 handles en v1 (eso es E3/F6 y se implementará como `cb:x1,y1,x2,y2` — nombre fijado por TIMELINE-SPEC §6 — con el mismo contrato `f(0)=0, f(1)=1`).

### 1.7 Deltas con `TIMELINE-SPEC.md` y con el código ya escrito (ARREGLAR ANTES DE F3)

Esta tabla existe porque las dos docs se escribieron en paralelo y divergieron. **Nada de esto es opinable: son contradicciones que hacen fallar un gate.** Quien implemente `timeline.js` arregla estos ítems primero.

| # | Dónde | Qué dice hoy | Qué gana | Acción |
|---|---|---|---|---|
| D1 | TIMELINE-SPEC §1.6 | `eo` = `1 − (1−t)³` (cubic out) | **`ease.js`**: `eo` = expo out `1 − 2^(−10t)` | Corregir TIMELINE-SPEC §1.6. Todo el cálculo de solape de §3.2 depende de que `eo` sea expo. |
| D2 | TIMELINE-SPEC §1.6 | gramática de 5 tokens (`lin\|eo\|eio\|spring\|back`) y su regex | **`ease.js`**: suma `co`, `qo`, `cio` (y `ei`,`ci`,`step`, prohibidos) | Ampliar el regex a `^(lin\|eo\|co\|qo\|cio\|eio\|spring:…\|back:…)$`. `step`/`ei`/`ci` se rechazan explícitamente. |
| D3 | TIMELINE-SPEC §1.6 | `spring z∈[0.05,0.999] w∈[4,30]`, `back s∈[0.5,4]` | Esquema para el **rango legal**, esta doc para el **rango de diseño** | Agregar motion-lint blando: `z∈[0.40,0.95]`, `w∈[8,20]`, `z·w ≥ 7`, `s ≤ 3.0`. Código `E-MOTION-LINT`. |
| D4 | TIMELINE-SPEC §4.4 | carry por defecto `spring:0.72,13` | **Esta doc §2 #9**: `spring:0.90,14` | Cambiar el default de `flipCarry`. `0.72,13` tiene 3.9 % de sobrepaso: un carry que rebota se lee como error de tracking. |
| D5 | TIMELINE-SPEC §3.3 | `each ∈ [0.04,0.08]`, spread ≤ 0.40 s, `N ≤ 8`, `from ∈ {start,end,center,edges,random}` | **Esta doc §3.1** | Ampliar a `each ∈ [0.026,0.09]`, spread ≤ 0.50 s, `N ≤ 20`; agregar `from:'grid'`. Ver §3.1. |
| D6 | TIMELINE-SPEC §4.3 y §4.6 | `dur ∈ [0.30,0.90]` para TODA transición | **Esta doc §4.2** | `flash-cut` (#8) dura 0.10–0.16 s por diseño. El gate debe exceptuarla por nombre de receta, no bajar el piso general. |
| D7 | `schema.js:270` vs TIMELINE-SPEC §5 | emite `E-TL-EASE`, la doc dice `E-SCHEMA-EASE` | El **código** | Unificar en `E-TL-EASE` y actualizar la taxonomía de `MOTOR-DIRECTOR.md` §8. |
| D8 | `ease.js` | exporta `isEase`, no `isValidEase`; no exporta `DEFAULT_EASE` ni `easeAt` | El **código** | El default sale de `tl.defaultEase` (TIMELINE-SPEC §1.1), no de una constante del módulo. |
| D9 | `MOTOR-DIRECTOR.md` §6 | ejemplo con `spring:0.6,11` | Esta doc | `z·w = 6.6 < 7`. Es un ejemplo ilustrativo ilegal; reemplazarlo por `spring:0.62,12`. |
| D10 | `MOTOR-DIRECTOR.md` §5 receta 8 | "flash 2 frames" | Esta doc §2 #6 / §4.2 | Son **3 frames**. Con 2 el flash se lee como un glitch de compresión. |
| D11 | TIMELINE-SPEC §2.6 | `drawKind[p.kind](ctx, {w,h,...p})` — no recibe `t` ni `frame` | — | El grano/textura de §5 necesita el índice de frame para su ruido determinista. Agregar `frame` (entero) a los args del pintor. Es un dato, no un hook: sigue siendo `f(frame)` pura. |

---

## 2. TABLA MAESTRA: qué curva para qué gesto

Duraciones en segundos (rango recomendado). "Keys" son literales listos para copiar al compilador. `Δn` = delta en unidades normalizadas del lienzo.

| # | Gesto | Props | Ease | Duración | Notas duras |
|---|---|---|---|---|---|
| 1 | **Entrada de texto** (título, statement, bullet) | `reveal` 0→1, `alpha` 0→1, `y` +0.018→0 | `reveal`: `co` · `alpha`: `eo` · `y`: `co` | 0.42–0.60 (display) · 0.28–0.40 (secundario) | **PROHIBIDO `spring` y `scale`** sobre texto (§5). El `y` de entrada máx. 0.02 normalizado (= 14.4 px lógicos, porque `y` es fracción de H=720). |
| 2 | **Entrada de objeto** (heroObj, card, badge, foto) | `scale` 0.88→1, `alpha` 0→1, `y` +0.03→0 | `scale`+`y`: `spring:0.62,12` · `alpha`: `eo` (35 % de la duración del gesto) | 0.45–0.65 | Nunca `scale` desde 0 (agujero negro): piso **0.84**. Excepción única: `morph-punto`, que colapsa a 0.04 por diseño y se sustituye por el objeto B. |
| 3 | **Salida** (cualquiera) | `alpha` 1→0, `y` 0→∓0.012, `scale` 1→0.97 | `alpha`: `eo` · resto: `cio` | 0.18–0.30 | La salida es **siempre más corta y más pobre** que la entrada (regla universal). Sobre `alpha` usamos `eo`, NO ease-in: ver §3.2 (nuestro contrato invierte la regla web y hay que respetarlo). |
| 4 | **Énfasis / pop** (CTA, badge, número al aterrizar) | `scale` 1→1.06→1 | ida: `cio` **0.133 s (4 frames)** · vuelta: `spring:0.55,13` 0.30 s | 0.40–0.44 total | Amplitud 1.05–1.09. `cio` en la ida (no `eo`: a 4 frames una expo es indistinguible de un salto). Sobre TEXTO sólo si es transitorio y termina EXACTO en 1 (§5). Máx. 1 pop simultáneo. |
| 5 | **Movimiento continuo** (parallax de foto, deriva de fondo/mesh, `sweep`, órbita de deco) | `x/y/scale/sweep` | **`lin` obligatorio** | toda la vida de la capa | Cualquier curva sobre un movimiento continuo se percibe como aceleración parásita y rompe el empalme al re-linkear. Velocidad: ≤ **0.010 normalizado/s** para fondo, ≤ 0.020/s para foto. Nunca sobre una capa que contenga glifos. |
| 6 | **Corte** (flash-cut, switch de placa, cambio de capa) | `alpha` (o `reveal`) | `lin` sobre **1 frame** (Δt = 1/fps = 0.0333) | 0.033 | Dos keys con el mismo `t` son ilegales (`E-TL-ORDER`); un corte son dos keys separadas exactamente 1 frame. **Nunca** el ease `step`. El *flash* que lo acompaña: `alpha` de una placa blanca 0→0.85 (1 frame, `lin`) → 0 (**3 frames**, `eo`). |
| 7 | **Revelado por máscara** (`reveal`) | `reveal` 0→1 | texto: `co` · wipe cinematográfico de foto/placa: `cio` · typewriter: `lin` | texto 0.40–0.55 · wipe 0.55–0.80 · typewriter 0.035 s/carácter (tope 1.2 s) | `reveal` es **monótono creciente**: nunca vuelve atrás dentro de una escena (queda feo y rompe la lectura). En typewriter el número de caracteres es `floor(reveal · n)` — por eso `lin`. |
| 8 | **Contador numérico** | valor derivado de un track `reveal` 0→1 | `co` (si el número es "grande y redondo", `qo`) | 0.70–1.10 | Ver §2.1: snapping, ancho fijo, y el aterrizaje. |
| 9 | **Match-cut / carry (FLIP)** | `x,y,w,h,scale,rot` a la vez | `spring:0.90,14` (o `cio` si el objeto cruza más de media pantalla) | 0.42–0.55 | Todos los props del carry con **el MISMO ease y la MISMA ventana**, si no el objeto se deforma. Continuidad ≤ 2 px (gate `E-OBJ-JUMP`). Éste es el default que debe tomar `flipCarry` (delta D4). |
| 10 | **Micro-shake de impacto** | `x,y` | ruido determinista **horneado a keys**, ver §2.2 | 3–5 frames (0.10–0.166) | Amplitud ≤ 2 px lógicos → `A/405` en `x`, `A/720` en `y`. **Nunca sobre texto.** Máx. 1 por video. |

### 2.1 Contador numérico (receta completa)

```js
// track: { layer:'sc4.num', prop:'reveal', keys:[ {t:T0, v:0, ease:'co'}, {t:T0+D, v:1} ] }
// en layers.js (pintor del kind 'punch'/'stat'):  v0,v1 salen de base (no son animables)
const r     = props.reveal
const raw   = v0 + (v1 - v0) * r
const step  = pickStep(v1 - v0)
const shown = Math.round(raw / step) * step

// step: la escala de redondeo. Dos condiciones, gana la MÁS GRUESA.
function pickStep(delta) {
  const d = Math.abs(delta)
  const porMagnitud = d < 100 ? 1 : d < 1e4 ? 10 : d < 1e6 ? 100 : 1000   // legibilidad del dígito
  const porAterrizaje = Math.pow(10, Math.ceil(Math.log10(d / 125)))      // ver "aterrizaje visible"
  return Math.max(porMagnitud, porAterrizaje)
}
```

Reglas:
- **Ancho reservado fijo**: medí el texto de `v1` (con su sufijo) y centrá siempre dentro de ese ancho. Si el contador cambia de cantidad de dígitos mientras corre, el bloque salta y se lee como bug. Alternativa válida: arrancar el conteo en `v1/10` (mismo número de dígitos).
- **Aterrizaje visible**: cortá el conteo cuando `|raw − v1| < step` y mantené `v1` el resto del tiempo. Con `co` el instante exacto del aterrizaje es **cerrado**, no hay que tantear:

  ```
  |raw − v1| = (v1−v0)·(1−u)³ < step   ⟺   u_land = 1 − (step / (v1−v0))^(1/3)
  ```

  Ejemplos verificados: `v1=85, step=1` → `u_land=0.773`; `v1=250, step=10` → `0.658`; `v1=1200, step=100` → `0.563`.
  **Contrato**: el número tiene que plantarse al menos **0.2·D antes del final**, o sea `u_land ≤ 0.80`, o sea **`step ≥ (v1−v0)/125`** — que es exactamente el término `porAterrizaje` del `pickStep` de arriba. Sin ese término un `v1=9999` con `step=10` aterriza en `u=0.900` y con D=0.9 s el número se planta sólo 0.09 s antes de terminar: no se lee, y ése era todo el punto del gesto.
- **El glifo NO se escala mientras cuenta** (anti-shimmer). El pop (#4) va DESPUÉS del aterrizaje, o sobre el anillo/placa que lo rodea.

### 2.2 Ruido determinista (shake) — pura y seek-safe

```js
// hash entero: mismo (seed, frame) -> mismo valor SIEMPRE. NO usar Math.random ni el índice de frame de un contador.
const h32 = n => { n = Math.imul(n ^ (n >>> 15), 0x2c1b3c6d); n ^= n >>> 12
                   n = Math.imul(n ^ (n >>> 7), 0x297a2d39);  return (n ^ (n >>> 15)) >>> 0 }
const noise = (seed, frame, axis) => (h32((seed ^ Math.imul(frame, 2654435761)) + axis) / 4294967295) * 2 - 1
// verificado: rango [-1, 1], sin correlación visible entre frames consecutivos ni entre ejes.
```

**Los dos ÚNICOS consumidores legítimos** (y la diferencia importa, porque uno de los dos no existe en runtime):

**(a) Shake — se HORNEA a keys en el compilador.** La timeline no tiene hooks: un track es una lista de keys y `evalAt` sólo interpola. Un shake de N frames se emite como **N+1 keys con `lin`**, una por frame, y muere ahí:

```js
// linker.js / receta `impact` — A en px lógicos (≤2), N ∈ [3,5], f0 = frame de impacto
for (let i = 0; i <= N; i++) {
  const u = i / N, decay = 1 - u                       // termina EXACTO en 0 (§5: nada residual)
  emitKey(layer, 'x', (f0 + i) / fps, x0 + (A / 405) * decay * noise(seed, f0 + i, 0), 'lin')
  emitKey(layer, 'y', (f0 + i) / fps, y0 + (A / 720) * decay * noise(seed, f0 + i, 1), 'lin')
}
```

La conversión a normalizado es obligatoria y **no es la misma en los dos ejes** (`/405` en `x`, `/720` en `y`): olvidarla mete un shake 2.4× más grande de lo pedido.

**(b) Grano/textura — vive dentro del pintor**, nunca en un track (serían 420 keys de nada). El pintor recibe el `frame` entero (delta D11) y llama a `noise(seed, frame, k)`. Sigue siendo `f(frame)` pura ⇒ seek-safe.

Lo que **no** es legítimo: leer `t` dentro de `evalAt` para calcular algo que no sea la interpolación de keys. Cualquier "vida" aleatoria del motor se escribe de una de esas dos formas o no se escribe.

---

## 3. COREOGRAFÍA

### 3.1 Stagger

`delay_i = each · ord(i)`, donde `ord` depende del patrón. `each` según cantidad:

| n elementos | `each` (ms) | Ventana total |
|---|---|---|
| 2–3 | **90** | ≤ 0.18 s |
| 4–6 | **60** | ≤ 0.30 s |
| 7–10 | **40** | ≤ 0.36 s |
| 11–20 | **26** | ≤ 0.49 s |
| > 20 | `450/(n−1)` | 0.45 s fijo |

**Cómo se le pasa esto al builder** (`B.stagger` de TIMELINE-SPEC §3.3): esa API acepta `each` **o** `amount` (spread total). Los valores de la tabla que caen fuera de la banda cómoda de `each` — los 90 ms de `n≤3` y los 26 ms de `n≥11` — se emiten como **`amount` = ventana total**, que es exactamente para lo que existe ese parámetro. `each_efectivo = amount / maxD` reproduce la tabla al milisegundo. Esto obliga a relajar los presupuestos del builder (delta D5): `each ∈ [0.026, 0.09]`, spread ≤ 0.50 s, `N ≤ 20`.

Reglas duras:
1. **Ventana total de stagger ≤ 0.50 s** y **≤ 40 % de la duración de la escena**. Si no entra, no es un stagger: es una lista mal diseñada (reducí elementos, no el tiempo).
2. El **último** elemento debe terminar su entrada con al menos `T_asentado` (§4.3) de escena por delante.
3. Patrones de `ord` permitidos (cerrados; el seed elige entre los válidos). Se corresponden 1:1 con el `from` del builder, salvo donde se aclara:
   - `start`: `ord(i) = i` — listas, pasos, bullets (el orden de lectura manda).
   - `center`: `ord(i) = |i − (n−1)/2|` — filas de logos, píldoras.
   - `edges`: `ord(i) = (n−1)/2 − |i − (n−1)/2|` — cierres/outro.
   - `grid` (bento `R×C`): `ord(i) = fila(i) + col(i)` (diagonal) — es el único que se ve "diseñado" en una grilla; el `start` en una grilla se lee como error de layout. **No existe hoy en el enum `from` del builder**: hay que agregarlo (delta D5), o compilarlo pasando los delays ya calculados.
   - `end` (`ord(i) = n−1−i`) existe en el builder pero **no lo usamos**: entrar de atrás para adelante contradice el orden de lectura.
   - `random`: desaconsejado. **No es un problema de determinismo** — el builder lo resuelve con un Fisher-Yates sobre `prng(seed,'stagger')`, o sea que es perfectamente reproducible — es un problema de que **casi siempre se ve sucio**. Usalo sólo en `rafaga.beat`.
4. Un stagger cuenta como **UN solo gesto** en el presupuesto de simultaneidad (§3.5), siempre que todos los elementos sean de la misma familia y usen la misma curva.
5. Cuando el stagger es *interno* a una capa (`logoRow`, `stepper`) no se inventan capas: se anima un solo `reveal` y el pintor deriva el progreso de cada item con `itemProgress` (TIMELINE-SPEC §3.4). En ese caso el `each` de la tabla se traduce a `overlap`.

### 3.2 Solape salida→entrada (contrato anti-frame-vacío)

Sea `D` la duración de la transición y `t0` su inicio. **Cronograma canónico** (el que implementa `dip-solapado`, receta #12, y que heredan las demás salvo aviso):

```
t0                     t0+0.20D            t0+0.55D                       t0+D
|  saliente: alpha 1->0 (ease 'eo', ventana 0.55D)   |
|                       ^ alpha = 8.0 %              |
                        |  entrante: alpha 0->1 ('eo', ventana A) + movimiento (spring, ventana M)
```

- **Ventana de alpha de la entrante**: `A = max(0.28·D, 4 frames)`. Con `D ∈ [0.30, 0.42]` (dip-solapado) el `0.28·D` da 0.084–0.118 s, o sea 2.5–3.5 frames: **siempre gana el piso de 4 frames** (§4.4). El término `0.28·D` sólo manda en transiciones largas.
- **Ventana de movimiento de la entrante**: `M = max(0.60·D, 0.45 s)`, y **M puede terminar DESPUÉS de `t0+D`**. Esto es deliberado y hay que escribirlo así: `0.60·D` con `D=0.36` daría 0.216 s, que rompe a la vez el rango de entrada de objeto (§2 #2: 0.45–0.65) y la regla 3 de spring (§1.5). La transición es una ventana de *alpha*; el gesto de entrada de la capa vive en su propia ventana y no tiene por qué caber adentro.

De dónde sale el 0.20D (no es un número inventado): con `alpha_out(u) = 1 − eo(u) = 2^(−10u)` sobre una ventana de `0.55D`, en `t0+0.20D` el progreso local es `u = 0.364` y

```
alpha_out = 2^(−3.64) = 0.080   →   exactamente el umbral del contrato (≤ 8 %)
```

Tabla de la caída de `alpha` con `eo` (útil para cualquier otra ventana):

| u | 0.10 | 0.20 | 0.30 | **0.364** | 0.50 | 0.70 | 1.00 |
|---|---|---|---|---|---|---|---|
| `alpha = 2^(−10u)` | 0.50 | 0.25 | 0.125 | **0.080** | 0.031 | 0.008 | 0.001 → **0** |

(En `u=1` la fórmula da 0.00098; el guard `u>=1 → 1` de `expoOut` lo lleva a 0 exacto. Es el mismo residuo del 0.1 % de §1.3, acá inofensivo porque `alpha` se clampea igual.)

Invariantes verificables (gates `E-EMPTY-FRAME` / `E-DEADAIR`):
- **I1**: en el instante de arranque de la entrante, `alpha` de TODA capa saliente ≤ **0.08**.
- **I2**: en **todo** frame de la transición existe al menos una capa de contenido con `alpha ≥ 0.35`. (La placa/fondo no cuenta: si sólo queda el fondo, es un frame vacío.) Con el cronograma de arriba se cumple con enorme margen: `eo` alcanza `alpha=0.35` en `u = −log₂(0.65)/10 = 0.062`, o sea **0.062·A ≈ 8 ms (menos de 1 frame)** desde el arranque de la entrante; en `u=0.43` ya vale 0.95. En el frame en que la saliente cruza el 0.08 la entrante ya está bien por encima de 0.35: nunca hay un frame sin protagonista.
- **I3**: ninguna capa de contenido tiene `alpha` entre 0.10 y 0.90 durante más de **0.30 s** seguidos (el "fantasma" — texto medio transparente = ilegible y sucio). Con `eo` esa banda ocupa `u ∈ [0.015, 0.332]`, o sea **0.317 · ventana**: la entrante la cruza en 0.042 s y la saliente (ventana 0.55D, D≤0.42) en 0.073 s. Margen de 4×.
- **I4**: cero frames entre el fin de una escena y el inicio de la siguiente sin transición declarada (la timeline no tiene "huecos": las vidas de capa se solapan). Ojo: `life` es dura (TIMELINE-SPEC §1.3) — fuera de `life` la capa no se evalúa, así que "solaparse" significa **extender `life`**, no bajar `alpha` a 0.

Excepciones autorizadas al cronograma:
- `flash-cut` (#8): NO solapa. Corte seco de 1 frame + flash de 3 frames. El "frame vacío" se evita porque la entrante ya está a `alpha=1` en el frame del corte.
- `carry` (#1): la capa con `matchKey` **no sale nunca** (`alpha` se mantiene en 1 cruzando el borde); sólo salen las demás.

### 3.3 Anticipación (keys concretas)

Una anticipación es un **retroceso breve en la dirección opuesta al movimiento principal**, expresado con una key extra — no con una curva.

Todos los `t` de los ejemplos están **en la grilla de 1/30** (frames 120, 123, 138): es obligatorio, `E-SCHEMA-GRID` rechaza cualquier otra cosa.

```json
{ "layer":"sc3.hero", "prop":"x", "keys":[
  { "t": 4.00, "v": 0.50,  "ease": "cio" },              // reposo            (frame 120)
  { "t": 4.10, "v": 0.472, "ease": "spring:0.62,12" },   // anticipa: −7 % del recorrido, 3 frames
  { "t": 4.60, "v": 0.90 }                               // principal: Δ=0.40 en 0.50 s (frame 138)
]}
```

- Magnitud: **6–10 %** del recorrido principal (acá `0.028 / 0.40 = 7 %`). Menos no se ve; más se lee como rebote de error.
- Duración: **0.10–0.133 s** (3–4 frames). Curva de ida: `cio` (arranca suave = "toma envión"). Es una de las excepciones tabuladas al piso de 4 frames (§4.4).
- El segmento principal dura 0.50 s, dentro del `Δt ∈ [0.30, 0.66]` que exige la regla 3 de spring para `0.62,12`.
- **Máximo 1 anticipación por escena** y sólo sobre el objeto protagonista. Nunca sobre texto (mueve glifos dos veces = tosco) ni sobre el fondo.
- Variante de escala (para un pop de objeto): `scale` `1 → 0.94 (0.10 s, cio) → 1.0 (0.40 s, spring:0.55,13)`.

### 3.4 Follow-through / overlap (keys concretas)

Dos formas, ambas legales:

**(a) Retraso del secundario respecto del primario** (el clásico "overlap"):

```
capa primaria (objeto):        entra en [T,        T+0.500]   dur 0.500 (15 fr)  spring:0.62,12
capa secundaria (badge):       entra en [T+0.100,  T+0.700]   dur 0.600 (18 fr)  spring:0.62,12   ← +100 ms, +20 %
capa terciaria (sombra/deco):  entra en [T+0.200,  T+0.900]   dur 0.700 (21 fr)  cio              ← +100 ms, +17 %
```
Retraso 60–120 ms por nivel de jerarquía, y cada nivel **15–25 % más lento** que el anterior (calculá el porcentaje sobre la DURACIÓN, no sobre el instante de fin — es el error fácil de cometer acá). Máx. 3 niveles. La terciaria usa `cio` porque con `spring:0.62,12` sobre 0.700 s el `u_pico·Δt` se iría a 0.234 s, fuera del rango de la regla 3.

**(b) Cola del elemento colgado** (sigue moviéndose **en la misma dirección** después de que el padre frena — si vuelve para atrás no es follow-through, es un rebote):

```json
{ "layer":"sc3.tag", "prop":"y", "keys":[
  { "t": 4.10, "v": 0.62,  "ease": "spring:0.70,12" },
  { "t": 4.60, "v": 0.40,  "ease": "cio" },              // el padre termina acá (recorrido Δ = −0.22)
  { "t": 4.70, "v": 0.3923, "ease": "spring:0.55,13" },  // SE PASA 3.5 % del recorrido (sigue subiendo), 3 fr
  { "t": 4.90, "v": 0.40 }                               // vuelve y se planta
]}
```
Amplitud de la cola: **3–5 %** del recorrido (acá `0.0077 / 0.22 = 3.5 %`). Duración total de la cola ≤ 0.30 s (acá 0.30 exactas). Sólo sobre elementos **sin glifos** o sobre la placa que contiene al texto — nunca sobre el texto solo.

### 3.5 Jerarquía de simultaneidad (cuántas cosas se mueven a la vez)

Definición operativa de **gesto activo en `t`**: una capa cuyo `|Δprop|` **entre el frame `t` y el anterior** (o sea por frame, no por segundo ni por ventana) supera **0.0015 normalizado** en `x/y/w/h`, **0.004** en `scale`, **0.25°** en `rot`, **0.02** en `alpha`, o **0.01** en `reveal`. En píxeles lógicos, 0.0015 son 0.61 px en `x/w` y 1.08 px en `y/h`.

> **No confundir con `E-DEADAIR`** (invariante 20 de TIMELINE-SPEC), que usa umbrales más gruesos (0.004 en `x/y`, 0.01 en `scale`, 1° en `rot`, 0.03 en `alpha/reveal`) **sobre una ventana de 1.2 s**. Son dos preguntas distintas: aquélla es "¿se murió el video?", ésta es "¿hay demasiadas cosas moviéndose?". La banda entre los dos umbrales (un movimiento perceptible pero chico) es intencional: no es dead-air y tampoco satura el presupuesto.

| Categoría | Máx. simultáneo | Cuenta como |
|---|---|---|
| Contenido protagonista (título, objeto héroe, foto) | **1** | 1 gesto |
| Contenido secundario (badge, chip, sub, stepper) | **2** | 1 gesto c/u; un stagger homogéneo = 1 |
| Deco sin glifos (barras, anillos, líneas, sweep, halo) | 2 | **no cuenta** |
| Fondo (mesh, gradiente, grano, viñeta, parallax) | 1 | **no cuenta** |
| Gesto "espectacular" (recetas 2/3/9/11, shake, flash) | **1 por video** | 1 gesto |

**Regla dura: ≤ 3 gestos activos en cualquier `t`** (+ deco + fondo), código **`E-BUSY`** (duro). Cuatro cosas moviéndose a la vez se lee como plantilla barata: es la diferencia más grande entre "premium" y "slop" en nuestros propios contact-sheets. Si el guion pide más, **escalonalo** (stagger) o **partilo en dos escenas**.

Corolario: durante una transición, el presupuesto se comparte entre la escena saliente y la entrante (una transición con 2 salientes + 2 entrantes ya está en el límite). Por eso las salidas son pobres: `alpha` + un `y` mínimo, nada más.

---

## 4. PRESUPUESTOS DE TIEMPO

### 4.1 Duración de escena por tipo

| Escena (kind) | Duración | Piso duro |
|---|---|---|
| `open.brand` | 1.6–2.2 | 1.4 |
| `hook.statement` | 2.2–3.0 | 1.8 |
| `howto.steps` | `1.0 + 0.9 · nPasos` → **2.8–5.5** (`nPasos ∈ [2,5]`, el rango de `stepper.n`) | 2.8 |
| `features.bento` | 3.0–4.0 | 2.6 |
| `hero.appwindow` | 3.0–3.8 | 2.6 |
| `hero.product` | 2.6–3.4 | 2.2 |
| `proof.punch` (número) | 1.8–2.4 | 1.6 |
| `proof.logos` | 1.8–2.4 | 1.6 |
| `proof.quote` | 2.8–3.6 | 2.4 |
| `offer.flash` | 2.0–2.6 | 1.8 |
| `cta.booking` / `outro.cta` | 2.4–3.2 | 2.0 |
| `rafaga.beat` (ráfaga) | 0.7–1.1 | 0.6 |

Video completo: **12–18 s**, **5–8 escenas** (las ráfagas cuentan como media). Fuera de ese rango el guionista está fabricando relleno.

### 4.2 Duración de transición por receta (catálogo §5 del plan)

| # | Receta | `D` (s) | Notas |
|---|---|---|---|
| 1 | `carry` (FLIP) | 0.42–0.55 | ease único (`spring:0.90,14`) para todos los props |
| 2 | `morph-punto` | 0.50–0.60 | 0.25 colapso + 0.30 expansión, solapadas 0.05 |
| 3 | `zoom-out-card` | 0.55–0.65 | `cio` sobre `w,h,x,y` |
| 4 | `push-reveal` | 0.45–0.60 | entrante `co`; parallax del fondo al 12 % con `lin` |
| 5 | `mask-swap` | 0.40–0.55 | `reveal` del nuevo empieza a 0.35·D |
| 6 | `crossfade-parallax` | 0.45–0.60 | escalas opuestas 1.06↔0.98, `lin` |
| 7 | `trace` (interna) | 0.50–0.80 | `sweep` del conector con `cio` |
| 8 | `flash-cut` | 0.10–0.16 | 3–5 frames; sin solape. **Única receta por debajo del piso de 0.30 s** del gate de linker: hay que exceptuarla por nombre (delta D6). |
| 9 | `impact` | 0.30–0.42 | dip 0.10 + número `spring:0.50,14` + shake 3 frames (horneado a keys, §2.2) |
| 10 | `stagger-pop` (interna) | 0.35–0.50 | `each` según §3.1 |
| 11 | `gather` | 0.45–0.60 | convergencia al centro con `cio`, ≤ 0.06 normalizado |
| 12 | `dip-solapado` (default) | 0.30–0.42 | el cronograma de §3.2 |

**Presupuesto global: la suma de todas las `D` ≤ 22 % de la duración del video** (código **`E-MOTION-BUDGET`**, blando). Si se pasa, el video "es puro movimiento" y no comunica. Chequeo de viabilidad: 8 escenas = 7 transiciones; con el default (0.30–0.42) son 2.1–2.9 s, contra un techo de 2.64 s en un video de 12 s. Entra, pero **no alcanza para 7 recetas caras**: por eso `dip-solapado` es el default y las espectaculares están limitadas a 1 por video.

### 4.3 Tiempo asentado mínimo (para que se lea)

Una escena tiene tres tramos: `entrada → ASENTADA → salida`. La ventana asentada es aquella en la que **ninguna capa de contenido tiene gestos activos** (§3.5); sólo se mueven fondo y deco.

```
T_asentado ≥ max( 0.90 ,  0.50 + 0.28 · palabrasVisibles )      [segundos]
T_asentado ≥ 0.45 · duraciónDeLaEscena
```

Referencia (verificada): 3 palabras → 1.34 s; 6 palabras → 2.18 s; 10 palabras → 3.30 s (a esa altura, partí el texto en dos escenas). Los números y logos cuentan como 1 palabra c/u; una cita cuenta sus palabras reales.

Violación ⇒ código **`E-NOSETTLE`** (duro): contenido ilegible por exceso de movimiento. **No es `E-DEADAIR`** — es su opuesto exacto, y meterlos en el mismo código haría imposible rankear el loop.

### 4.4 Cuantización y duraciones mínimas

- 1 frame = 0.0333 s. **Ningún gesto por debajo de 4 frames (0.133 s)**, con esta lista **cerrada** de excepciones:

  | Excepción | Frames | Dónde |
  |---|---|---|
  | Corte (rampa de `alpha`/`reveal`) | 1 | §2 #6 |
  | Flash de placa blanca | 3 | §2 #6, receta `flash-cut` |
  | Anticipación | 3–4 | §3.3 |
  | Micro-shake de impacto | 3–5 | §2 #10, §2.2 |

  Cualquier otra cosa por debajo de 4 frames es un bug de compilación, no una decisión de dirección.
- Todo `t` de key se **cuantiza a 1/30** al compilar (`q(t) = Math.round(t*fps)/fps`), y `E-SCHEMA-GRID` lo verifica sobre `dur`, `marker.t`, `life[]` y `key.t`. Esto vale también para los ejemplos de esta doc: si escribís `4.56` estás escribiendo el frame 136.8, que no existe.
- Un delta de valor que en píxeles de export sea < 1 px (**0.00093 normalizado en `x/w`, 0.00052 en `y/h`** — son `1/1080` y `1/1920`) es **invisible**: el schema lo marca como key inútil (`E-SCHEMA-NOOPTRACK`, blando).

---

## 5. ANTI-SHIMMER (lección pagada — REGLA DURA)

**Qué pasó** (`docs/URVID-1.0-NEXT.md` §1): un ken-burns global lentísimo que incluía al texto, más 5 sitios donde una función `breathe()` escalaba números y píldoras, producían un "hervor" del texto en TODOS los videos. Causa medida, no adivinada: **al escalar el cuadro que contiene glifos, cada frame re-rasteriza el glifo a una escala sub-píxel distinta**; los bordes del glifo cambian de píxel en píxel y el ojo lo lee como vibración/tosquedad. Al sacar el movimiento continuo del contenido, la métrica de residuo en la banda de texto cayó **0.129 → 0.047 (−64 %) en promedio y −98 % en la peor escena**.

### Regla dura

> **Una vez que el texto está ASENTADO, es 100 % pixel-estable: `scale` constante, `x/y` constantes, `rot` constante, `alpha` constante. Cero deriva, cero respiración, cero ken-burns que lo incluya.**

Corolarios operativos:

1. **Prohibido** cualquier track con `prop ∈ {scale, rot}` sobre una capa `kind` de texto (`text`, `priceTag` con número, `stepper` numerado, `punch`) **que se extienda más allá de la ventana de entrada**. Los tracks de entrada terminan con una key de valor **exacto** `1` (scale) y `0` (rot).
2. **Prohibido** `lin` de larga duración sobre `x/y` de una capa con glifos (eso es "deriva"). El parallax es para fotos, placas y fondo.
3. **Cuantización al asentar**: la última key de posición de una capa con glifos se redondea a píxel de export:
   ```js
   const S = 1080 / 405           // = 2.666…  = 1920/720 (la escala es UNIFORME en los dos ejes)
                                  // 1 px de export = 0.375 px lógicos
   const snapPx = q => Math.round(q * S) / S              // q en px lógicos
   xSettled = snapPx(x * 405) / 405                        // vuelta a normalizado (x usa W)
   ySettled = snapPx(y * 720) / 720                        // ídem                  (y usa H)
   ```
   Y el tamaño de fuente asentado se elige en **px lógicos múltiplos de 0.375** (= píxel entero de export), o directamente enteros, para que `S · fontSize` caiga en píxel entero.
4. **Pop transitorio: permitido.** La regla prohíbe movimiento *continuo/residual* en la ventana asentada, no el gesto de entrada. Un pop de 0.34 s que termina exacto en `scale=1` es legal y deseable.
5. **Nunca** aplicar `ctx.scale()` sobre un grupo que contiene texto para animarlo. Si el texto tiene que cambiar de tamaño, se re-dibuja con otro `fontSize` (y eso sólo ocurre entre escenas, no dentro).

### Qué SÍ puede moverse todo el tiempo

| Puede moverse siempre | Cómo |
|---|---|
| Fondo (mesh, gradiente, blobs, viñeta) | `lin`, ≤ 0.010 normalizado/s |
| Grano / textura | ruido determinista por frame (§2.2), sin desplazar contenido |
| Deco sin glifos: barras, anillos, líneas, subrayados, halo, `sweep`/sheen sobre PLACAS | `lin` o ciclo periódico; el sheen nunca sobre el glifo |
| Objetos héroe (los dibujantes de `src/shared/objects.js`) — mientras no lleven texto adentro | cualquier curva |
| Fotos y `fullbleed` | ken-burns permitido **si el cuadro transformado NO contiene texto**: el texto va en una capa hermana, no hija |
| La PLACA detrás del texto | puede respirar levemente (≤ 0.4 % de escala) **sólo si el texto es una capa separada, no hija de la placa** |

### Verificación (gate)

`director-shot.mjs` debe emitir, para cada escena, la diferencia entre **2 frames consecutivos dentro de la ventana asentada**, restringida a la bbox de las capas de texto ("band"). Código de error: **`E-SHIMMER`** (duro; hay que sumarlo a la taxonomía de `MOTOR-DIRECTOR.md` §8, junto con `E-BUSY`, `E-NOSETTLE`, `E-MOTION-BUDGET` y `E-MOTION-LINT`).

**La métrica, definida al bit** (es la de `tools/urvid1-textstill.mjs`, que ya existe y es la referencia de implementación — no la reinventes):

```js
const SS = 2                                   // supersample: sin esto el shimmer sub-pixel NO aparece
// a, b = ImageData.data de drawFrame(t) y drawFrame(t + 1/fps), ambos a (W·SS)×(H·SS)
d      = max(|aR−bR|, |aG−bG|, |aB−bB|)        // por pixel, en unidades 0..255 (NO normalizado a 0..1)
band   = promedio de d sobre los pixeles dentro de la bbox de texto
```

- Unidades: **0..255**. Umbral: **`band ≤ 0.05`** (o sea 0.02 % del rango: el texto asentado tiene que dar prácticamente cero).
- `t` de muestreo: dentro de la ventana asentada de §4.3, típicamente `min(inicio + max(0.95, dur·0.55), inicio + dur − 0.25)`.
- La deco y el fondo **sí** se encienden en el diff y eso está bien: la métrica sólo mira la banda de texto.
- Referencia de magnitud (medida en urvid, `docs/URVID-1.0-NEXT.md` §1, con el fondo anulado para aislar el glifo): promedio **0.129 → 0.047 (−64 %)**; peor escena de puro texto (`hero.center`) **0.607 → 0.013 (−98 %)**. O sea: el umbral 0.05 está calibrado apenas por encima del promedio ya alcanzado, y una escena rota da 10× eso.

---

## 6. Qué NO aplica a nosotros y por qué

Cosas que las skills fuente repiten como dogma y que en nuestro motor son **falsas, irrelevantes o directamente dañinas**:

| De la skill | Por qué NO aplica acá |
|---|---|
| "Nunca animes `width`/`height`/`top`/`left`; usá transforms" | Es una regla del **layout del DOM** (reflow por frame). En canvas 2D no hay layout: `w/h/x/y` son números que van a un `drawImage`/`fillRect`. Animar `w,h` nos cuesta **lo mismo** que animar `scale` — y de hecho es lo que el FLIP del linker necesita para que el radio de esquina y el grosor de borde no se deformen. **Preferimos `w,h` sobre `scale` para cajas, y `scale` sólo para pops.** |
| `will-change`, `force3D`, capas del compositor, `autoAlpha` (visibility) | No existe compositor ni hit-testing. `alpha` es `ctx.globalAlpha`. Una capa a `alpha=0` no "bloquea clicks" porque no hay clicks. |
| `prefers-reduced-motion`, `gsap.matchMedia()` | El motor produce un **archivo de video**, no una página. No hay media queries ni preferencias del sistema en tiempo de render. (Si algún día se ofrece una versión "calma", será una variante de guion —menos gestos, más `T_asentado`—, no un branch de runtime.) |
| `requestAnimationFrame`, `gsap.ticker`, `quickTo`, `overwrite`, `kill()`, interrupción de tweens | Nuestro render es `drawFrame(ctx, t)` llamado por el exportador o por un scrubber. No hay loop propio, no hay tweens vivos que se pisen, no hay nada que matar. **Cualquier `requestAnimationFrame` dentro de `src/director/` es un bug** (rompe determinismo y export headless). |
| Springs con física real (velocidad inicial, integración RK/semi-implícita, `Animatable`, `useSpring`) | Requieren estado entre frames ⇒ el seek en frío daría otro resultado. Por eso usamos **la solución analítica** del oscilador amortiguado (§1.5): `f(u)` cerrada, sin estado, seek-safe y byte-idéntica. |
| `elastic`, `bounce`, `rough`, `slow`, `steps`, `CustomEase` con paths SVG | Excluidos del set cerrado a propósito: `elastic`/`bounce` con muchos rebotes se ven a "plantilla de 2014" y nuestro `spring` cubre todo el eje de vivacidad con 2 parámetros legibles. Menos curvas = timeline editable y gates simples. (`ease.js` sí tiene un `step`, pero está prohibido: un corte son dos keys a 1 frame — §1.2.) |
| `AnimatePresence`, `layoutId`, `SharedTransitionLayout`, `Flip.getState()` | Son mecanismos para **descubrir** posiciones del DOM en runtime. Nosotros ya **declaramos** las cajas de A y de B en el storyboard: el FLIP se resuelve leyendo dos objetos, sin medir nada (ver `linker.js`). |
| Gestos: hover, tap, drag, scroll, `ScrollTrigger`, `useScroll` | No hay usuario dentro del video. (El **estudio** sí tiene gestos, pero eso es UI de React, fuera de `src/director/core`.) |
| "Regla de frecuencia: cuanto más se repite, más corto" | Es para elementos de UI que se ven 1000 veces al día. Nuestro video se ve una vez y de corrido: la coreografía de 0.6 s en una entrada de hero es **correcta**, no excesiva. |
| "Nunca superes 500 ms en una interacción" | Idem: aplica a alguien que está esperando. Un revelado por máscara cinematográfico de 0.8 s es lo esperable en un video vertical. Lo que sí respetamos es el techo de 0.9 s por transición (§4.2). |
| "Nunca escales a 0" | Aplica **casi** siempre (piso 0.84 en entradas). Excepción documentada: `morph-punto` colapsa a 0.04 hacia un punto de acento **por diseño**, y el punto pasa a ser el objeto B. |
| "El exit usa ease-in" | **Invertido en nuestro contrato.** En web el exit termina en un `unmount`, así que conviene que se demore y salga rápido al final. Acá el exit **se solapa con la entrada** y el invariante es `alpha ≤ 8 %` cuando la entrante arranca: eso exige una curva que **caiga rápido al principio** ⇒ `eo` sobre `alpha` (§3.2). El acompañamiento de desplazamiento sí puede usar `cio`. `ease.js` tiene `ei`/`ci` (ease-in puros) pero **ninguna receta los usa**: si aparecen en una timeline, es un error del compilador. |
| `blur` / `filter` en las recetas de entrada (estilo "Krehel") | `ctx.filter='blur()'` es carísimo por frame a 1080×1920 y **no es idéntico entre navegadores ni contra node-canvas** ⇒ rompería el gate de determinismo byte a byte. Sustituto nuestro: gradiente/alpha en capas + el truco `ghost` (2 copias desplazadas con alpha bajo) para motion blur barato. |
| `stagger: { from: "random" }` de GSAP | Su aleatoriedad no es reproducible. Nosotros SIEMPRE derivamos del PRNG con namespace (`prng('stagger')`), o no usamos random. |
| Checklist de performance "60 fps / low-end / DevTools 4x" | Nuestro cuello no es el compositor sino el **pintado por frame**. Traducción a nuestro mundo: presupuesto ≤ 33 ms/frame en preview; `evalAt` ≤ 1 ms; **≤ 3 usos de `ctx.shadowBlur` por frame**, **≤ 1 operación de canvas completo** (grano/viñeta pre-renderizados a un canvas offscreen y copiados, no recalculados). |

---

## 7. Checklist del ejecutor (antes de cerrar una tanda)

0. **¿Están cerrados los deltas de §1.7?** Si no, `timeline.js` va a compilar eases que `schema.js` rechaza. Es el paso 0 por algo.
1. ¿Cada key usa un ease de la gramática §1.2 (`lin|eo|co|qo|cio|spring|back`, nunca `eio`/`ei`/`ci`/`step`) y todo `spring` cumple `z·w ≥ 7`?
2. ¿Ningún track de `scale`/`rot` sobrevive a la entrada en una capa con glifos? ¿Las posiciones asentadas están cuantizadas a píxel de export en **los dos ejes**? (§5)
3. ¿En todo `t` hay ≤ 3 gestos activos? (§3.5, `E-BUSY`)
4. ¿Toda transición cumple I1–I4? (§3.2)
5. ¿Toda escena cumple `T_asentado`? (§4.3, `E-NOSETTLE`)
6. ¿La suma de transiciones ≤ 22 % del video y hay ≤ 1 receta espectacular? (§4.2)
7. ¿Cero `requestAnimationFrame`, cero `Math.random`, cero `Date.now` en `src/director/`?
8. ¿Los contadores tienen ancho reservado y `step ≥ (v1−v0)/125` para aterrizar antes del final? (§2.1)
9. ¿Todo `t` de key cae en la grilla `1/fps`? ¿Ningún gesto por debajo de 4 frames salvo los 4 de la tabla de §4.4?
10. ¿El shake está **horneado a keys** (una por frame) y no leído en runtime? ¿Con la conversión `/405` en `x` y `/720` en `y`? (§2.2)
11. ¿La banda de texto da `E-SHIMMER` ≤ 0.05 en la ventana asentada de cada escena? (§5)
