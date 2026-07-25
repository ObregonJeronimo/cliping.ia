# DNA-SPEC — `pagemodel.v1`: qué medimos de una página y cómo

> **Destilado de**: skill `design-dna` (zanwei/design-dna, MIT) — `SKILL.md`, `references/schema.md`, `references/generation-guide.md`, `README.md` — leída UNA vez en F0 (2026-07). Adaptado a nuestro stack (canvas 2D determinista, Playwright, lienzo 405×720). **El motor no referencia la skill jamás**; esta doc es la única fuente.

---

## 0. Para qué existe esta doc y qué NO es

El motor Director necesita un JSON versionado (`pagemodel.v1`) que describa la página en dos planos:
**visual** (`dna`, medido con Playwright — determinista, $0, sin LLM) y **semántico** (`semantica`,
producido por `perception.py` — el LLM que ya usamos). Esta doc especifica:

1. el **schema completo** con tipos, enums cerrados, rangos y **default de cada campo**;
2. el **método de medición exacto** de cada campo del `dna` (selector → propiedad → agregación → fallback);
3. las reglas de **normalización y sanidad**;
4. el mapa **dna → dirección de arte** del video;
5. los **5 casos adversariales** y qué debe devolver el extractor en cada uno.

**Invariante duro**: el extractor **nunca lanza**. Cualquier fallo parcial degrada a default y baja
`captura.confianza`. Una página vacía produce un `pagemodel` válido.

**Invariante duro 2**: el `pagemodel` se mide **una sola vez** y se guarda. El motor (`src/director/`)
**nunca** vuelve a medir en tiempo de render — si lo hiciera, el determinismo se rompe (una página cambia).
Los fixtures de test viven en el repo, no dependen de red.

---

## 1. Schema `pagemodel.v1`

### 1.0 Estructura de nivel superior

```jsonc
{
  "v": 1,
  "captura": { ... },   // NUESTRO agregado (no está en el boceto del plan §2): estado y confianza de la captura
  "dna":       { ... }, // medido con Playwright — determinista
  "semantica": { ... }, // producido por el LLM (perception)
  "assets":    { ... }  // URLs + clasificación barata
}
```

Convenciones de la tabla: **T** = tipo · **Rango/Enum** = valores válidos (enum = cerrado, agregar valores
= bump de `v`) · **Default** = lo que se escribe cuando la señal no existe o es inválida.

### 1.1 `captura` (nuestro agregado — imprescindible para los casos adversariales)

| Campo | T | Rango/Enum | Default | Nota |
|---|---|---|---|---|
| `url` | string | http/https, pasó `url_is_safe()` | `""` | la URL pedida |
| `urlFinal` | string | | `= url` | tras redirects (`page.url`) |
| `httpStatus` | int | 0..599 | `0` | 0 = no hubo respuesta |
| `estado` | enum | `ok \| botwall \| spa-vacia \| 404 \| timeout \| bloqueada` | `"ok"` | ver §5 |
| `ts` | string | ISO-8601 UTC | now | |
| `confianza` | float | 0..1 (2 decimales) | `0` | ver §1.5 |
| `viewport` | [int,int] | | `[1280, 900]` | **si cambia, todos los umbrales de §2 se invalidan** |
| `notas` | string[] | ≤8, ≤120 chars c/u | `[]` | diagnóstico legible (`"accent por defecto"`, `"botwall: dna descartado"`) |

### 1.2 `dna` — el plano visual (todo medido, nada inferido por LLM)

#### `dna.palette`

| Campo | T | Rango/Enum | Default | Nota |
|---|---|---|---|---|
| `accent` | hex `#rrggbb` | minúscula, 7 chars | `"#5b8cff"` | mismo default que `brief.brandColor` en `src/kinetic/core/dna.js` |
| `accent2` | hex \| `null` | | `null` | `null` = derivar (§3.4). Nunca inventar un segundo color de marca |
| `bg` | hex | | `"#ffffff"` | fondo dominante de la página |
| `inkOnBg` | hex | | `"#111114"` | color de texto dominante sobre `bg` |
| `accentText` | hex | | `= accent` | variante del accent legible sobre `bg` (ratio ≥ 4.5) — §3.3 |
| `acromatica` | bool | | `false` | `true` si **ningún** candidato superó chroma 0.12 → `signals.chromaMax < 0.12` (definición única, §3.2) |
| `bgLum` | float | 0..1 | `1.0` | **luminancia relativa WCAG** de `bg` (no es lightness HSL — la curva es muy distinta: `#808080` → `0.216`, `#e0e0e0` → `0.745`). Cacheada: la usan el mapa de placas (§4.1) y todas las decisiones tinta-clara/oscura, siempre contra el pivote `0.18` (§2.3) |

#### `dna.typography`

| Campo | T | Rango/Enum | Default | Nota |
|---|---|---|---|---|
| `displayHint` | enum | `serif \| grotesk \| rounded \| mono \| condensed` | `"grotesk"` | clase de la fuente de titulares |
| `bodyHint` | enum | idem | `"grotesk"` | clase de la fuente de cuerpo |
| `caseHint` | enum | `upper \| title \| sentence` | `"sentence"` | |
| `script` | enum | `latin \| cyrillic \| greek \| cjk \| arabic \| hebrew \| devanagari \| otro` | `"latin"` | |
| `textDir` | enum | `ltr \| rtl` | `"ltr"` | |
| `h1Ratio` | float | 0..0.5 | `0` | `fontSize(h1) / viewportWidth` — insumo de `bigtype` |
| `widthRatio` | float | 0.35..0.95 | `0.66` | ancho medio de MAYÚSCULA / fontSize (mide condensación real). **0.66 ≈ una grotesca normal** (Helvetica/Inter/Arial); ver §2.4 para la medición y los valores de referencia |

#### `dna.shape`

| Campo | T | Rango/Enum | Default | Nota |
|---|---|---|---|---|
| `radius` | int px | 0..32 | `12` | mediana ponderada por área, en px de viewport 1280 |
| `radiusRatio` | float | 0..0.5 | `0.06` | **lo que realmente heredamos**: `radius / min(w,h)` de la card mediana |
| `pill` | bool | | `false` | ≥50 % de los botones son pastilla (`r ≥ min(w,h)/2 − 1`) |
| `borderStyle` | enum | `none \| hairline \| bold` | `"none"` | |
| `borderWidth` | float px | 0..12 | `0` | mediana de los bordes visibles |
| `shadowStyle` | enum | `flat \| soft \| hard` | `"flat"` | |

#### `dna.density`

| Campo | T | Rango/Enum | Default | Nota |
|---|---|---|---|---|
| `nivel` | enum | `aireado \| medio \| denso` | `"medio"` | derivado de `score` |
| `score` | float | 0..1 | `0.35` | **el valor útil**: continuo, alimenta tamaños y ritmo (§4) |
| `fill` | float | 0..1 | `0` | fracción del primer viewport ocupada por contenido |
| `nodos` | int | 0..400 | `0` | nodos de contenido en el primer viewport |

#### `dna.mood` (los tres ejes ya existentes en `kinetic/core/dna.js`, ahora **medidos** en vez de inferidos)

| Campo | T | Rango | Default |
|---|---|---|---|
| `calidez` | float | 0..1 | `0.50` |
| `formalidad` | float | 0..1 | `0.50` |
| `energia` | float | 0..1 | `0.45` |

#### `dna.modernidad`

| Campo | T | Rango/Enum | Default | Nota |
|---|---|---|---|---|
| `modernidad` | string[] | subconjunto de `bento \| glass \| bigtype \| editorial-photo \| gradient-mesh \| brutalist` | `[]` | ordenado por score desc, **máx 3** (más de 3 = ruido, ninguna dirección de arte puede honrar 4 lenguajes) |
| `modernidadScores` | object | `{ clave: 0..1 }`, solo las detectadas | `{}` | para gates y desempates |

#### `dna.signals` (bloque crudo — nuestro agregado, obligatorio)

Números crudos de la medición. **Nunca** los consume el motor: existen para que `director-loop`
y los gates puedan explicar *por qué* salió tal DNA, y para re-derivar campos sin re-capturar.

```jsonc
"signals": {
  "muestras":   { "botones": 0, "cards": 0, "texto": 0, "imagenes": 0 },   // int, cuántos nodos se midieron
  "accentScore": 0.0,          // float, score del ganador de la votación de accent
  "chromaMax": 0.0,            // float 0..1, chroma del candidato más saturado
  "blurBackdrop": 0,           // px, mayor backdrop-filter blur visible
  "gridCards": 0,              // int, hijos directos del contenedor grid/flex más "card-like"
  "areaImgVsTexto": 0.0,       // float, área imagen / área texto en el primer viewport
  "gradStops": 0,              // int, color-stops del gradiente de fondo mayor
  "contrasteBgInk": 21.0       // float, ratio WCAG medido antes de sanear
}
```

Definición exacta de los tres que no son obvios (los consumen fórmulas de §1.5 y §3.2, así que
**no** pueden quedar a interpretación):

| Señal | Definición operativa |
|---|---|
| `muestras.*` | cardinalidad de los sub-conjuntos de §2.1 **después** de los caps: `BOTONES.length`, `CARDS.length`, `TEXTO.length`, `IMAGENES.length` |
| `accentScore` | score del ganador de la votación de §2.3. **`0` significa "accent NO medido"** (se cayó al default `#5b8cff`): es el flag exacto que usa la fórmula de `confianza` (§1.5) |
| `chromaMax` | `max(chroma(hex))` sobre **todos los candidatos de accent antes de cualquier descarte** ∪ `{bg, inkOnBg}`. Se calcula aunque la votación no arroje ganador — es la única señal que distingue "marca acromática" de "no encontré el botón" (§3.2) |

### 1.3 `semantica` — el plano semántico (LLM, `perception.py`, cache key v8 → **v9**)

| Campo | T | Rango/Enum | Default |
|---|---|---|---|
| `queHace` | string | 1 frase, 10..140 chars | `""` (si vacío → el composer usa `title`/host) |
| `comoFunciona` | string[] | 0..5 pasos, ≤48 chars c/u | `[]` |
| `tipoNegocio` | enum | `saas \| ecommerce \| servicio-local \| educacion \| media \| portfolio \| app \| evento \| otro` | `"otro"` |
| `modeloUso` | enum | `suscripcion \| compra \| reserva \| registro \| descarga \| contacto \| desconocido` | `"desconocido"` |
| `features[]` | obj[] | 0..6 · `{ titulo ≤28, detalle ≤90 }` | `[]` |
| `pruebas.stats[]` | obj[] | 0..4 · `{ valor ≤10, etiqueta ≤26 }` | `[]` |
| `pruebas.testimonios[]` | obj[] | 0..3 · `{ texto ≤140, firma ≤28 }` | `[]` |
| `pruebas.logosClientes` | bool | | `false` |
| `oferta.precio` | string | ≤16 chars, tal como aparece | `""` |
| `oferta.promo` | string | ≤40 | `""` |
| `oferta.urgencia` | string | ≤40 | `""` |
| `audiencia.who` | string | ≤60 | `""` |
| `audiencia.register` | enum | `formal \| casual \| warm` | `"casual"` |
| `audiencia.awareness` | enum | `unaware \| problem \| solution \| product \| most` | `"problem"` |
| `vozDeMarca` | string[] | exactamente 3 adjetivos, ≤14 chars c/u | `["claro","directo","actual"]` |
| `idioma` | string | ISO 639-1 (2 chars) | `"es"` |

**Regla histórica innegociable, se hereda**: si la señal no está en la página, el campo queda vacío.
**Jamás fabricar** stats, testimonios, precios o promos. Un array vacío desactiva su escena (plan §4).

### 1.4 `assets`

| Campo | T | Rango/Enum | Default |
|---|---|---|---|
| `logo` | string url \| `""` | | `""` |
| `ogImage` | string url \| `""` | | `""` |
| `screenshot` | string path \| `""` | | `""` (solo para auditoría humana; **no** entra al video, §4.3) |
| `images[]` | obj[] | 0..18 | `[]` |
| `images[].url` | string url | absoluta, no `data:`, no `.svg` | — |
| `images[].kind` | enum | `producto \| persona \| ambiente \| ui \| desconocido` | `"desconocido"` |
| `images[].rank` | float | ≥0, orden desc | `0` |
| `images[].ar` | float \| `null` | ancho/alto | `null` |

### 1.5 `captura.confianza` — fórmula cerrada

```
confianza = clamp(
    0.30 * (estado === "ok" ? 1 : 0)
  + 0.20 * min(1, signals.muestras.texto / 20)
  + 0.15 * min(1, signals.muestras.botones / 4)
  + 0.15 * (signals.accentScore > 0 ? 1 : 0)          // "accent medido, no default"
  + 0.10 * min(1, len(semantica.queHace) / 40)
  + 0.10 * (assets.images.length >= 1 ? 1 : 0)
, 0, 1)
```

Los pesos suman exactamente `1.00`. Página vacía con `estado: "ok"` → `0.30` y nada más (es el valor
del ejemplo §1.7 y el que asserta la matriz §5.7).

**Precedencia**: los topes por `estado` de §5 (botwall ≤0.15, 404 ≤0.10, spa-vacia ≤0.30) se aplican
**después** de la fórmula, como `confianza = min(formula, tope)`; la penalización de −0.10 del 404
recuperado (§5.5) se aplica antes del clamp final. Nunca al revés.

`confianza < 0.35` → el composer usa la **gramática mínima** (open.brand → hook.statement → outro.cta)
y desactiva las escenas que dependen de señales débiles.

### 1.6 Errores tipados (`schema.js`, taxonomía del plan §8)

| Código | Cuándo |
|---|---|
| `E-SCHEMA-VERSION` | `v` ausente o ≠ 1 |
| `E-SCHEMA-ENUM` | valor fuera del enum cerrado |
| `E-SCHEMA-RANGE` | número fuera de rango tras normalizar |
| `E-SCHEMA-COLOR` | string que no matchea `/^#[0-9a-f]{6}$/` |
| `E-SCHEMA-MISSING` | campo obligatorio ausente **y** sin default aplicable (no debería ocurrir nunca) |
| `E-SCHEMA-CONTRAST` | `contrast(inkOnBg, bg) < 4.5` tras la sanidad de §3.3 (bug del saneador) |

`validate(pagemodel)` **repara y reporta**: devuelve `{ ok, model, errores[] }` con `model` siempre
válido. El adapter `briefLegacy → pagemodel` (plan §3) vive en el mismo archivo y usa exactamente
estos defaults.

### 1.7 Ejemplo mínimo válido (página vacía — el "default puro")

```json
{
  "v": 1,
  "captura": { "url": "https://ejemplo.com", "urlFinal": "https://ejemplo.com", "httpStatus": 200,
               "estado": "ok", "ts": "2026-07-25T12:00:00Z", "confianza": 0.30,
               "viewport": [1280, 900], "notas": ["sin texto: dna por defecto"] },
  "dna": {
    "palette": { "accent": "#5b8cff", "accent2": null, "bg": "#ffffff", "inkOnBg": "#111114",
                 "accentText": "#1e61ff", "acromatica": false, "bgLum": 1.0 },
    "typography": { "displayHint": "grotesk", "bodyHint": "grotesk", "caseHint": "sentence",
                    "script": "latin", "textDir": "ltr", "h1Ratio": 0, "widthRatio": 0.66 },
    "shape": { "radius": 12, "radiusRatio": 0.06, "pill": false, "borderStyle": "none",
               "borderWidth": 0, "shadowStyle": "flat" },
    "density": { "nivel": "medio", "score": 0.35, "fill": 0, "nodos": 0 },
    "mood": { "calidez": 0.50, "formalidad": 0.50, "energia": 0.45 },
    "modernidad": [], "modernidadScores": {},
    "signals": { "muestras": { "botones": 0, "cards": 0, "texto": 0, "imagenes": 0 },
                 "accentScore": 0, "chromaMax": 0, "blurBackdrop": 0, "gridCards": 0,
                 "areaImgVsTexto": 0, "gradStops": 0, "contrasteBgInk": 21 }
  },
  "semantica": { "queHace": "", "comoFunciona": [], "tipoNegocio": "otro", "modeloUso": "desconocido",
                 "features": [], "pruebas": { "stats": [], "testimonios": [], "logosClientes": false },
                 "oferta": { "precio": "", "promo": "", "urgencia": "" },
                 "audiencia": { "who": "", "register": "casual", "awareness": "problem" },
                 "vozDeMarca": ["claro", "directo", "actual"], "idioma": "es" },
  "assets": { "logo": "", "ogImage": "", "screenshot": "", "images": [] }
}
```

Los dos únicos campos del ejemplo que **no** son el default literal de la tabla, sino un **derivado**
(el gate los recalcula, no los copia):

- `accentText: "#1e61ff"` — `contrast(#5b8cff, #ffffff) = 3.16 < 4.5`, así que corre el bucle de §3.3:
  `hsl(222.1°, 100 %, 67.8 %)` baja `l` de a `0.04` → `0.638` (3.69) → `0.598` (4.33) → `0.558` (**4.99 ≥ 4.5**, para).
  Tres iteraciones. Si tu `hexToHsl/hslToHex` da `#1e61ff ± 1` por redondeo, está bien; el gate compara
  contraste (`≥ 4.5`), no el hex exacto.
- `confianza: 0.30` — único término no nulo de §1.5: `0.30 × (estado === "ok")`.

### 1.8 Divergencias respecto del boceto del plan (`MOTOR-DIRECTOR.md` §2)

El boceto del plan es **indicativo**; **esta doc es la fuente normativa** de `pagemodel.v1`. Las
diferencias son deliberadas y el ejecutor debe implementar lo de acá:

| Campo | Plan §2 | Acá | Por qué |
|---|---|---|---|
| `dna.density` | string `"aireado\|medio\|denso"` | **objeto** `{nivel, score, fill, nodos}` | el plan §4 y §4.1 de esta doc necesitan el **continuo** (`score`) para ritmo y carga; el string sobrevive como `density.nivel` |
| `semantica.vozDeMarca` | string `"3 adjetivos"` | **`string[3]`** | un string obliga a re-parsear en el composer |
| `captura` | no existe | bloque nuevo | los 5 casos adversariales (§5) son indistinguibles sin `estado`/`confianza` |
| `dna.signals`, `dna.modernidadScores` | no existen | bloques nuevos | trazabilidad para `director-loop` y desempates; el motor **no** los consume |
| `dna.typography` | `displayHint`, `caseHint` | \+ `bodyHint`, `script`, `textDir`, `h1Ratio`, `widthRatio` | caso no-latino (§5.3) y detector `bigtype` (§2.8) |
| `dna.shape` | `radius`, `borderStyle`, `shadowStyle` | \+ `radiusRatio`, `pill`, `borderWidth` | `radius` en px de 1280 es **inutilizable** en un lienzo de 405 (§4.1) |
| `dna.palette` | 4 colores | \+ `accentText`, `acromatica`, `bgLum` | contraste y caso acromático |

**Taxonomía de errores**: §1.6 define los subtipos `E-SCHEMA-*` (el plan §8 solo los nombra con
comodín, así que no hay conflicto). Pero §5.3 introduce **`E-TXT-TOFU`**, que **no** está en la lista
del plan §8 — al cerrar F1 hay que agregarlo ahí junto a `E-TXT-OVERFLOW`/`E-TXT-MIDWORD`, o el gate
que lo emita reportará un código desconocido.

**Quién normaliza**: la normalización de §3 corre **una sola vez, en Python**, al capturar. El
`validate()` de `src/director/core/schema.js` es una **segunda línea defensiva** (valida un
`pagemodel` que llega de Firestore/fixture y repara lo que esté fuera de rango) — **no** vuelve a
derivar `accentText`, `mood` ni `acromatica`. Si ambos derivaran, derivarían distinto: los defaults
de §1 son la única tabla compartida y deben citarse desde un solo lugar en cada lenguaje.

---

## 2. Extracción del `dna` con Playwright

### 2.0 Dónde vive y cuándo corre

Nuevo `const _JS_DNA` en `backend/site_capture.py`, evaluado dentro de `capture_all()` en este punto
exacto del pipeline existente:

```
goto → _dismiss_consent → networkidle → scroll de lazy-load → wait_for_function(imgs) →
document.fonts.ready → wait_for_timeout(900)
    → _JS_EXTRACT              (ya existe)
    → _JS_DNA                  ◀── AQUÍ, con window.scrollY === 0
    → _JS_IMAGES               (ya existe)
    → screenshot → peek        (peek NAVEGA a otra URL — ver aviso)
```

**Aviso (trampa real del pipeline)**: el bloque *peek* de `capture_all()` hace `page.goto(peek)` a
`/precios`, `/nosotros`, etc. cuando el home trae poca señal. Si `_JS_DNA` se evaluara después del
peek, el DNA sería el de **otra página** del sitio. Debe ir donde marca el diagrama —
antes del `screenshot` y muy antes del peek — y esa precondición merece un comentario en el código,
porque el peek se agrega y se mueve seguido.

Precondiciones **obligatorias** (si alguna falla, `notas` lo registra y `confianza` baja):

1. `window.scrollY === 0` — el scroll de lazy-load ya vuelve arriba; el DNA **debe** medirse en el
   primer viewport real, no en mitad de la página.
2. `document.fonts.ready` resuelto — si se mide antes, `font-family` computa la fuente de fallback y
   `displayHint`/`widthRatio` salen mal.
3. Banner de consentimiento cerrado — si no, `bg`/`density`/`accent` miden el overlay del CMP, no la marca.
4. Viewport **1280×900** (`device_scale_factor` es irrelevante: se mide en px CSS). Todos los umbrales
   de esta sección están calibrados a ese ancho. Cambiarlo obliga a recalibrar §2.

Firma: `async def extract_dna(page) -> dict` → devuelve el bloque `dna` **crudo** (sin normalizar).
La normalización (§3) se hace **en Python**, no en JS, porque es testeable sin browser.

### 2.1 Universo de muestreo (definido una vez, se reutiliza en todos los campos)

```js
const VW = 1280, VH = 900, VAREA = VW * VH;            // 1_152_000

const visible = (el) => {
  const r = el.getBoundingClientRect();
  if (r.width < 8 || r.height < 8) return null;
  if (r.bottom < 0 || r.top > VH * 2) return null;     // 2 viewports de profundidad, no más
  const cs = getComputedStyle(el);
  if (cs.display === 'none' || cs.visibility === 'hidden') return null;
  if (parseFloat(cs.opacity) < 0.1) return null;
  return { el, r, cs };
};

// hasta 1200 nodos (cap anti-cuelgue: páginas con 20k divs existen)
const POOL = [...document.querySelectorAll('body *')].slice(0, 4000)
              .map(visible).filter(Boolean).slice(0, 1200);

// área del rect INTERSECTADA con el primer viewport
const areaVP = (r) => Math.max(0, Math.min(r.right, VW) - Math.max(r.left, 0)) *
                      Math.max(0, Math.min(r.bottom, VH) - Math.max(r.top, 0));
```

Sub-conjuntos (se calculan una vez y se pasan a cada medidor). **Todos los elementos de POOL y de
sus sub-conjuntos son la terna `{ el, r, cs }`**, no un `Element`: el pseudocódigo del resto de §2
escribe `TITULARES[0].innerText` o `el.innerText` por brevedad, pero el código real es
`TITULARES[0].el.innerText`. `r` y `cs` se miden **una sola vez** (releerlos por nodo dispara
reflow y hace que la extracción tarde segundos en una landing grande).

| Conjunto | Definición |
|---|---|
| `BOTONES` | `button, a.btn, a[class*="button" i], [role="button"], a[class*="cta" i], input[type=submit]` ∩ POOL, con `w ≥ 40 && h ≥ 16`. Cap 60 |
| `CARDS` | nodos de POOL con `area ≥ 0.02·VAREA` **y** (`borderRadius > 0` ∨ `boxShadow !== 'none'` ∨ `backgroundColor` opaco distinto del padre ∨ `borderWidth > 0`). Cap 80 |
| `TEXTO` | **hojas de texto**: nodos de POOL cuyo `innerText.trim().length ≥ 2` y que no tienen ningún hijo-elemento con texto propio. Cap 300 |
| `TITULARES` | `h1, h2, [class*="title" i], [class*="heading" i]` ∩ TEXTO, ordenados por `fontSize` desc. Cap 20 |
| `IMAGENES` | `img` con `naturalWidth ≥ 120` + nodos con `backgroundImage` que contenga `url(` y `area ≥ 0.02·VAREA`. Cap 40 |

### 2.2 Resolución de color — el único helper que hay que hacer bien

Chromium computa cada vez más colores como `oklch(...)`, `color(display-p3 ...)` o `color-mix(...)`.
Parsear `rgba(...)` con regex (como hace hoy el `accentCss` existente) **falla en silencio** en esos casos.
Solución determinista y de una línea de idea: **pintar el color en un canvas 1×1 y leer el píxel.**

```js
const _cv = document.createElement('canvas'); _cv.width = _cv.height = 1;
const _cx = _cv.getContext('2d', { willReadFrequently: true });
const HEXCACHE = new Map();

// devuelve { hex, a } o null si es transparente/ilegible
function toRGBA(css) {
  if (!css || css === 'none' || css === 'transparent') return null;
  if (HEXCACHE.has(css)) return HEXCACHE.get(css);
  let out = null;
  try {
    // VALIDEZ por DOBLE SENTINELA: `fillStyle` conserva el valor anterior si el nuevo es inválido.
    // Un solo sentinela negro obliga a una lista de "qué strings SON negro" (#000, #000000, black,
    // rgb(0,0,0), rgba(0,0,0,1), hsl(0 0% 0%), oklch(0 0 0), color(srgb 0 0 0)...) que SIEMPRE queda
    // corta y descarta negros legítimos. Con dos sentinelas opuestos no hace falta ninguna lista:
    // un valor válido no puede coincidir con los dos.
    _cx.fillStyle = '#000000'; _cx.fillStyle = css; const a1 = _cx.fillStyle;
    _cx.fillStyle = '#ffffff'; _cx.fillStyle = css; const a2 = _cx.fillStyle;
    if (a1 !== a2) { HEXCACHE.set(css, null); return null; }   // inválido: cada sentinela quedó como estaba
    _cx.save();
    _cx.globalCompositeOperation = 'copy';   // 'copy' escribe el alfa tal cual, sin componer con lo previo
    _cx.fillStyle = css;
    _cx.fillRect(0, 0, 1, 1);
    _cx.restore();                           // OBLIGATORIO: sin esto 'copy' queda pegado en el ctx
    const d = _cx.getImageData(0, 0, 1, 1).data;
    out = { hex: '#' + [d[0], d[1], d[2]].map(v => v.toString(16).padStart(2, '0')).join(''),
            a: d[3] / 255 };
  } catch (e) { out = null; }
  HEXCACHE.set(css, out);
  return out;
}
```

Dos precisiones que evitan bugs de ±1:

1. El canvas guarda **premultiplicado** y `getImageData` desmultiplica → un color con `a < 1` vuelve
   con hasta **±2/255 por canal** de error. Por eso el bucketing HSL de §2.3 (`Δh < 12°`) es
   obligatorio y no un lujo: sin él, `rgba(91,140,255,.9)` y `rgb(91,140,255)` votan como dos colores.
2. `getComputedStyle` ya resolvió `currentColor`, `var(--x)` y `color-mix()`; a `toRGBA` llegan
   valores absolutos. La excepción son las lecturas de HTML crudo (`meta[name=theme-color]`,
   §2.3 fallback 1), que **sí** pueden traer `#abc` de 4 chars — y el doble sentinela las acepta.

Derivados usados en todo §2 (todos sobre `hex`):

```
rgb(hex) -> [r,g,b] en 0..255
chroma   = (max(r,g,b) - min(r,g,b)) / 255            // 0..1
lum01    = (max(r,g,b) + min(r,g,b)) / 510            // luminosidad HSL, 0..1
hue      = HSL.h en grados 0..360 (0 si chroma < 0.02)
relLum   = luminancia relativa WCAG (misma fórmula que backend/brand_dna.py::_rellum)
contrast(a,b) = (max(relLum)+0.05) / (min(relLum)+0.05)   // 1..21
```

`toRGBA` corre **dentro del browser**; en Python se reciben ya hex + alpha.

### 2.3 `palette`

#### `accent`

Se **conserva el núcleo del algoritmo existente** de `_JS_EXTRACT.accentCss` (`backend/site_capture.py`,
validado en producción: mismos descartes `chroma < 0.18 / lum < 0.12 / lum > 0.92`, mismo peso 2:1
fill-vs-borde, mismo cap 60, mismo mínimo `w ≥ 40 ∧ h ≥ 16`). Cambia en cinco puntos, todos aditivos:

1. `toRGBA` (§2.2) en vez del regex `rgba?\(...\)` — el regex devuelve `''` ante `oklch()`/`color()`;
2. se suman los pseudo-elementos `::before`/`::after` de los botones;
3. se pondera además por área (`min(1, area/20000)`) — un CTA de 200×48 pesa más que un chip de 60×20;
4. se agrupan los casi-iguales en buckets HSL antes de sumar;
5. devuelve el **ranking completo**, no solo el ganador (lo necesitan `accent2` y el fallback acromático).

Nota de selector: el `_JS_EXTRACT` actual incluye `[class*="primary" i]`, que acá **se descarta a
propósito** (matchea `.text-primary`, `.primary-nav` y demás falsos positivos) y se reemplaza por
`input[type=submit]`. Si eso hiciera bajar la calidad del acento en alguna página real de la lista
fija, volver a agregarlo es un cambio de una línea — pero medilo, no lo asumas.

| Paso | Regla |
|---|---|
| Candidatos | por cada `el ∈ BOTONES`: `backgroundColor`, `borderColor` (top), `color`, y `getComputedStyle(el,'::before').backgroundColor` |
| Descarte | `a < 0.5` · `chroma < 0.18` · `lum01 < 0.12` · `lum01 > 0.92` (gris/blanco/negro no son acento de marca) |
| Voto | `score[hex] += chroma × peso × min(1, area/20000)` con `peso = 2` si es `backgroundColor` (el **fill** del CTA), `1` si es borde o texto |
| Agrupado | antes de sumar, colores "casi iguales" se funden: mismo bucket si `|Δh| < 12° ∧ \|Δs\| < 0.12 ∧ \|Δl\| < 0.10`; el representante es el de mayor `score` parcial |
| Ganador | mayor `score` → `accent`; se guarda en `signals.accentScore` |
| Fallback 1 | `meta[name=theme-color]` si pasa los mismos descartes |
| Fallback 2 | color más saturado entre los `backgroundColor` de los 8 nodos de mayor área que pasen los descartes |
| **Fallback 2.5 (acromático)** | **si hubo candidatos pero TODOS cayeron por el gate de `chroma < 0.18`** (y ninguno por alfa/luminosidad): re-votar **sin** el gate de chroma y tomar ese ganador como `accent`. `signals.accentScore` > 0 (cuenta como medido), `notas += "marca acromática: accent medido sin gate de chroma"` |
| Fallback 3 | `#5b8cff` (default), `notas += "accent por defecto"`, `signals.accentScore = 0` → no cuenta para `confianza` |

**El fallback 2.5 no es opcional**: sin él, `acromatica` es inalcanzable. Una página Apple/Vercel
(negro sobre blanco, cero croma) pierde todos sus candidatos en el gate `chroma < 0.18`, cae al
fallback 3 y se lleva `accent = #5b8cff` — un azul que la marca no tiene — con `chroma = 0.64`, así
que el test `chroma(accent) < 0.12` de §3.2 daría `false` y el video se pintaría de azul inventado:
exactamente el bug que §3.2 y §4.6 dicen evitar. Con 2.5, `accent` queda en el gris/negro real de la
marca y `acromatica` se decide por `signals.chromaMax`, que se calcula **antes** de todo descarte.

#### `accent2`

Segundo del ranking **con `|Δhue| ≥ 25°`** respecto de `accent` y `score ≥ 0.25 × scoreGanador`.
Si no existe → `null` (se deriva en §3.4). **Nunca** el mismo hue con otra luminosidad: eso no es un
segundo color de marca, es una sombra.

#### `bg`

| Paso | Regla |
|---|---|
| Voto | por cada nodo de POOL con `areaVP ≥ 0.06 · VAREA`, si su `backgroundColor` tiene `a ≥ 0.9`: `score[hex] += areaVP` |
| Ganador | mayor área acumulada |
| Fallback 1 | `backgroundColor` de `body`, luego de `html`, si `a ≥ 0.9` |
| Fallback 2 | si `body`/`html` tienen `backgroundImage` con gradiente: **primer color-stop** parseado con `toRGBA` |
| Fallback 3 | `#ffffff` |

#### `inkOnBg`

Voto ponderado por **cantidad de tinta**, no por área de caja:

```
por cada el ∈ TEXTO:
    peso = el.innerText.length × parseFloat(cs.fontSize)
    c = toRGBA(cs.color); si c.a >= 0.5: score[c.hex] += peso
ganador = argmax(score)
fallback: "#111114" si bgLum > 0.18, "#f4f1ea" si bgLum <= 0.18
```

`bgLum = relLum(bg)` se guarda en `dna.palette.bgLum` (lo consume el mapa de placas, §4).

**El pivote es `0.18`, no `0.5`** — y es el mismo en §3.3 y en todo el resto de la doc. No es un
número de gusto: es el punto donde el texto blanco y el negro dan **el mismo** contraste sobre ese
fondo. Se despeja de la fórmula WCAG:

```
1.05 / (L + 0.05) = (L + 0.05) / 0.05   →   (L + 0.05)² = 0.0525
L = √0.0525 − 0.05 = 0.2291 − 0.05 = 0.1791  ≈  0.18
```

Usar `0.5` rompe el caso más común de todos: un fondo `#8a8a8a` tiene `relLum = 0.25`, con `0.5`
recibiría tinta clara (`#f4f1ea`, contraste **2.8**) cuando la correcta es la oscura (contraste 5.9).
`relLum` **no** es lightness: `#808080` (el gris del medio para el ojo) vale `0.216`, no `0.5`.

### 2.4 `typography`

#### `displayHint` / `bodyHint`

Nodo de referencia: `TITULARES[0]` para display; para body, el nodo de `TEXTO` con mayor
`Σ length × fontSize` cuyo `fontSize ≤ 22px`. Se toma el **primer nombre del stack**
`cs.fontFamily.split(',')[0]` en minúscula, sin comillas, + el genérico final del stack.

Clasificación en cascada (primer match gana):

| Orden | Clase | Regla sobre el stack en minúscula |
|---|---|---|
| 1 | `mono` | `/mono|courier|consolas|menlo|monaco|jetbrains|space mono|ibm plex mono|source code|fira code/` **o** genérico `monospace` |
| 2 | `condensed` | `/condensed|narrow|oswald|bebas|anton|teko|archivo narrow|barlow condensed|roboto condensed/` **o** `cs.fontStretch` ≠ `normal` con valor < 100 % **o** `widthRatio < 0.56` (medido, ver abajo) |
| 3 | `serif` | `/(?<!sans-)serif|georgia|times|garamond|playfair|merriweather|lora|tiempos|canela|recoleta|freight|charter|cambria|bodoni|didot/` **o** genérico `serif` |
| 4 | `rounded` | `/rounded|nunito|quicksand|comfortaa|varela|baloo|fredoka|circular|dm sans rounded|sf pro rounded/` **o** `widthRatio > 0.74` con genérico sans |
| 5 | `grotesk` | **default** (todo el resto de sans) |

Cuidado con la regla 3: `"sans-serif"` contiene `serif`. Usar el lookbehind o, más simple y portable,
descartar primero `/sans[- ]?serif/` del stack antes de testear serif.

#### `widthRatio` (medida real, resuelve los casos que el nombre no delata)

Con la fuente ya cargada (`document.fonts.ready`), en el canvas 1×1 auxiliar:

```
_cx.font = `${cs.fontWeight} 100px ${cs.fontFamily}`
if (!_cx.font.includes('100px')) return 0.66          // font inválida: fillStyle-style silent keep
widthRatio = _cx.measureText('HAMBURGEFONTSIV').width / (15 * 100)
```

`HAMBURGEFONTSIV` = 15 mayúsculas (la panela clásica de diseño de tipos: cubre anchas `MWOG`,
medias `HABURNETSV` y la estrecha `I`). El divisor `15 × 100` es "15 glifos × 100 px de `font-size`",
o sea el resultado es **ancho medio de mayúscula en ems**.

**Valores de referencia reales** (suma de advance widths / 15, verificable con el snippet de arriba):

| Fuente | widthRatio | Clase esperada |
|---|---|---|
| Bebas Neue | ≈ 0.45 | `condensed` |
| Oswald | ≈ 0.50 | `condensed` |
| Roboto Condensed | ≈ 0.55 | `condensed` |
| Helvetica / Arial | ≈ 0.67 | `grotesk` |
| Inter | ≈ 0.69 | `grotesk` |
| Nunito / SF Rounded | ≈ 0.72–0.76 | `rounded` |
| Georgia | ≈ 0.72 | `serif` (lo decide el nombre, regla 3) |

Clamp `0.35..0.95`, **default `0.66`**. Los umbrales de la cascada salen de esta tabla, no al revés:
`< 0.56` → `condensed`, `> 0.74` → `rounded`, el resto no opina y decide el nombre.

> **Corregido en auditoría**: una versión previa decía "Helvetica ≈ 0.60–0.64", default `0.52`,
> umbrales `< 0.46` / `> 0.60`. Con esos números **Helvetica (0.67) caía en la regla 4 y se
> clasificaba `rounded`**, es decir la grotesca más neutra del mundo activaba el pairing de
> geométricas blandas — en casi cualquier sitio. Y el default `0.52` no correspondía a ninguna
> tipografía normal: era ya casi `condensed`.

#### `h1Ratio`

```
h1Ratio = clamp(parseFloat(TITULARES[0].cs.fontSize) / VW, 0, 0.5)     // VW = 1280
sin TITULARES  ->  0
```

Se mide y se guarda **acá** (es campo del schema, §1.2); el detector `bigtype` de §2.8 lo **consume**,
no lo recalcula. Es un ratio contra el ancho de viewport y no contra el alto a propósito: el ancho es
lo que limita cuántas palabras entran en una línea, que es lo que "big type" significa. `> 200 px` de
`fontSize` dispara la regla de §3.5 (página con `zoom`/`transform: scale`).

#### `caseHint`

Sobre `TITULARES` (máx 12) más los `BOTONES` con texto:

```
esUpper(el) = cs.textTransform === 'uppercase'
           || (texto.length >= 6 && letras(texto).filter(esMayus).length / letras(texto).length >= 0.85)
esTitle(el) = todas las palabras >3 chars empiezan en mayúscula y NO esUpper

if  ratio(esUpper) >= 0.40  -> "upper"
elif ratio(esTitle) >= 0.60 -> "title"
else                        -> "sentence"
```

Si `script ≠ latin` (§5.3) → **forzar `"sentence"`**: mayúsculas/Title Case no existen en CJK/árabe/hebreo
y aplicarlas produce texto roto.

#### `script` y `textDir`

```
blob = document.body.innerText.slice(0, 4000)
conteo por rango Unicode:
  cjk        ぀-ヿ 㐀-鿿 豈-﫿 가-힯
  arabic     ؀-ۿ ݐ-ݿ
  hebrew     ֐-׿
  cyrillic   Ѐ-ӿ
  greek      Ͱ-Ͽ
  devanagari ऀ-ॿ
  latin      a-zA-ZÀ-ɏ
script = el rango con >= 30% de los caracteres alfabéticos; si ninguno llega, "latin"
textDir = "rtl" si script ∈ {arabic, hebrew} o document.dir === 'rtl' o cs(html).direction === 'rtl'
```

### 2.5 `shape`

| Campo | Método |
|---|---|
| `radius` | por cada `el ∈ BOTONES ∪ CARDS`: `r = cs.borderTopLeftRadius`. Si viene en `%`, `r = pct/100 × min(w,h)`. Si `r ≥ min(w,h)/2 − 1` → marcar **pill** y excluir de la mediana. `radius = clamp(round(mediana ponderada por area de los NO-pill), 0, 32)`. Si no hay muestras → `12` |
| `radiusRatio` | mediana de `r / min(w,h)` **solo sobre CARDS** (los botones son bajitos y distorsionan). Clamp 0..0.5. Este es el valor que se hereda (§4) |
| `pill` | `count(pill) / count(BOTONES) ≥ 0.5` |
| `borderWidth` | mediana de `parseFloat(cs.borderTopWidth)` sobre `BOTONES ∪ CARDS` donde `borderStyle ≠ none` y el color del borde tiene `a ≥ 0.05` y contraste con `bg` ≥ 1.15 (un borde invisible no es un borde) |
| `borderStyle` | `frac = nodos con borde visible / total`. `frac < 0.25` → `none`; `borderWidth ≤ 1.5` → `hairline`; `> 1.5` → `bold` |
| `shadowStyle` | parsear `cs.boxShadow` de CARDS → `(offX, offY, blur, spread, color)`. `frac(sombra visible) < 0.25` → `flat`. Si no: `blurMediano ≥ 12` → `soft`; `blurMediano ≤ 6 ∧ max(\|offX\|,\|offY\|) ≥ 2` → `hard`; resto → `soft` |

Parseo de `box-shadow` sin librería: `cs.boxShadow` en Chromium siempre viene normalizado como
`rgb(...) X Y B S` (o `rgba(...) X Y B S [inset]`), separado por `, ` para múltiples sombras. Tomar la
**primera** no-`inset`, partir por `) ` y leer los px por orden. Descartar si el color tiene `a < 0.04`.

### 2.6 `density`

```js
// nodos de CONTENIDO en el primer viewport: hojas de texto + imágenes + botones
const CONT = [...TEXTO, ...IMAGENES, ...BOTONES].filter(x => areaVP(x.r) > 0);

// unión aproximada por rejilla (evita contar dos veces un texto dentro de una card):
// rejilla de 64×45 celdas de 20×20 px sobre el viewport; una celda cuenta 1 si algún nodo la toca.
const GRID = new Uint8Array(64 * 45);
for (const x of CONT) marcarCeldas(x.r);
fill = suma(GRID) / (64 * 45);                      // 0..1
nodos = CONT.length;
score = clamp(0.65 * fill + 0.35 * min(1, nodos / 45), 0, 1);
nivel = score < 0.30 ? 'aireado' : score <= 0.52 ? 'medio' : 'denso';
```

La rejilla es la parte que importa: sumar áreas de rects anidados da `fill > 1` en cualquier landing
moderna. 20×20 px = 64×45 = 2880 celdas: suficiente resolución y barato.

**Fórmula vs. default (vale también para §2.7)**: con `fill = 0` y `nodos = 0` la fórmula da
`score = 0`, pero el default de la tabla §1.2 es `0.35`. No es una contradicción: **la fórmula solo
corre si hubo medición**. Si la página cae en el caso "señal insuficiente" de §3.5 (`bodyText < 200`
∧ `TEXTO.length < 5`) o en botwall/404 (§5), el bloque entero va a los defaults de §1.2 y la fórmula
**no se evalúa**. Escribir `0` medido es distinto de escribir `0.35` por default: el primero dice
"la página está vacía de verdad", el segundo dice "no sé". Por eso `signals.muestras` viaja al lado.

### 2.7 `mood` — derivado, no adivinado

Los tres ejes se calculan **solo** a partir de señales ya medidas. Base + deltas, clamp 0..1, 2 decimales.

#### `calidez` (base 0.50)

```
warmth(hex) = chroma(hex) < 0.10 ? 0.5 : 0.5 + 0.5 * cos(rad(hue(hex) - 40))
```

(hue 40° = naranja → 1.0 · hue 220° = azul → ~0.0 · sin croma → neutro 0.5)

| Término | Δ |
|---|---|
| acento | `+0.40 × (warmth(accent) − 0.5) × 2` |
| fondo | `+0.20 × (warmth(bg) − 0.5) × 2` |
| tipografía | `serif` o `rounded` → `+0.08` · `mono` o `condensed` → `−0.08` |
| forma | `radiusRatio ≥ 0.12` → `+0.06` · `radiusRatio ≤ 0.02` → `−0.06` |
| polaridad | `bgLum ≥ 0.55` (papel, ≈ `#c4c4c4` o más claro) → `+0.04` · `bgLum ≤ 0.06` (noir, ≈ `#454545` o más oscuro) → `−0.04` |

#### `formalidad` (base 0.50)

| Señal | Δ |
|---|---|
| `displayHint = serif` | `+0.18` |
| `displayHint = mono` \| `condensed` | `+0.10` |
| `displayHint = rounded` | `−0.20` |
| `caseHint = upper` | `+0.12` |
| `radiusRatio ≤ 0.03` | `+0.12` |
| `radiusRatio ≥ 0.14` | `−0.14` |
| `density.nivel = denso` | `+0.12` |
| `density.nivel = aireado` | `−0.06` |
| `chroma(accent) ≥ 0.65` | `−0.14` |
| `chroma(accent) ≤ 0.25` | `+0.10` |
| `borderStyle = hairline` | `+0.08` |
| `modernidad ∋ brutalist` | `−0.10` |
| `modernidad ∋ editorial-photo` | `+0.06` |

#### `energia` (base 0.35 — ojo, el default de la tabla es 0.45)

Es el único de los tres ejes cuya **base de fórmula** (`0.35`) no coincide con su **default de
schema** (`0.45`), y es deliberado: el primer término (`+0.30 × chroma(accent)`) casi nunca es cero
en una página medida, así que una marca con acento saturado normal aterriza en ~0.55. `0.45` es el
valor de "no medí nada", que corresponde a una página neutra imaginaria — no al resultado de la
fórmula con entradas en cero. Ver la nota de fórmula-vs-default al final de §2.6.

| Señal | Δ |
|---|---|
| `+0.30 × chroma(accent)` | continuo |
| `accent2 ≠ null` con `\|Δhue\| ≥ 60°` | `+0.08` |
| `modernidad ∋ gradient-mesh` | `+0.12` |
| `modernidad ∋ bigtype` | `+0.10` |
| `modernidad ∋ brutalist` | `+0.10` |
| `nCTAs con fill de acento ≥ 3` | `+0.08` |
| `density.score ≥ 0.55` | `+0.08` |
| `bgLum ≤ 0.06` con `chroma(accent) ≥ 0.5` (neón sobre negro) | `+0.08` |
| `nAnimaciones` (nodos de POOL con `cs.animationName ≠ 'none'`) `≥ 5` | `+0.06` |
| `displayHint = serif` ∧ `caseHint ≠ upper` | `−0.08` |

Estos tres números caen directo en el `moodPick` gaussiano que ya existe en
`src/kinetic/core/dna.js` — mismo espacio, misma escala. Es la razón por la que los ejes son estos
tres y no otros.

### 2.8 `modernidad` — detectores (cada uno devuelve score 0..1; entra si score ≥ 0.5)

#### `glass`

```
cand = POOL donde (cs.backdropFilter || cs.webkitBackdropFilter) contiene 'blur('
       ∧ blurPx >= 4
       ∧ toRGBA(cs.backgroundColor).a ∈ [0.03, 0.85]
       ∧ areaVP >= 0.02 * VAREA
signals.blurBackdrop = cand.length ? max(blurPx) : 0
score = cand.length === 0 ? 0                                          // ◀ GUARDA OBLIGATORIA
      : clamp(0.5 + 0.1 * cand.length + 0.01 * (maxBlur - 4), 0, 1)    // 1 elemento ya lo activa
```

La guarda `cand.length === 0 → 0` **no es defensiva, es correctiva**: sin ella la expresión arranca
en `0.5` (y `maxBlur` sobre un conjunto vacío es `undefined` → `NaN`, o `-Infinity` con un
`Math.max()` pelado). Con `≥ 0.5` como umbral de entrada, `glass` se activaría en **todas** las
páginas del mundo, incluidas las que no tienen un solo `backdrop-filter`. Mismo criterio para
cualquier otro detector cuyo score no arranque en 0: el score de un conjunto vacío es 0, siempre.

`backdrop-filter` es la firma inequívoca del glassmorphism; `filter: blur()` sobre el propio nodo
**no** cuenta (eso es un blob desenfocado → mira `gradient-mesh`).

#### `bento`

```
contenedores = POOL donde cs.display ∈ {grid, inline-grid, flex} y tiene >= 4 hijos-elemento visibles
para cada contenedor:
    hijos = hijos directos visibles con (borderRadius >= 8 ∨ boxShadow ≠ none ∨ bg distinto del padre)
    si hijos.length < 4: seguir
    varianza = max(area(hijos)) / max(1, min(area(hijos)))
    asimetrico = varianza >= 1.6
              ∨ cs.gridTemplateAreas ≠ 'none'
              ∨ algún hijo con gridColumn/gridRow que declare span > 1
    score = clamp(0.35 + 0.08 * min(hijos.length, 8) + (asimetrico ? 0.25 : 0), 0, 1)
signals.gridCards = max(hijos.length)
```

Una grilla de **4** cards iguales da `0.35 + 0.08×4 = 0.67` sin asimetría → entra como bento suave;
una bento real (6 celdas con spans mixtos) da `0.35 + 0.48 + 0.25 = 1.08 → 1.0`. Es el comportamiento
querido: en ambos casos la dirección de arte es "celdas", solo cambia la fuerza.

Ojo con el piso: el detector exige `hijos.length ≥ 4` **dos veces** (en el filtro de contenedores y en
el `continue`), así que **una grilla de 3 cards no puntúa nunca** — no llega a la fórmula. Es
intencional (tres cards en fila es el layout más genérico que existe, no es un lenguaje bento), pero
significa que el mínimo score alcanzable de este detector es `0.67`, no `0.5`: `bento` entra o no
entra, nunca entra "raspando". Si en el loop de F4 aparecen bentos reales de 4 celdas simétricas que
convendría desactivar, el dial correcto es subir el umbral de entrada, no tocar el `0.08`.

#### `bigtype`

```
h1Ratio  = dna.typography.h1Ratio            // ya medido en §2.4, NO se recalcula
palabras = TITULARES[0].el.innerText.trim().split(/\s+/).length
score = clamp((h1Ratio - 0.030) / 0.030
              + (palabras <= 6 ? 0.20 : 0)
              + (fontWeight >= 700 ? 0.10 : 0), 0, 1)
```

Calibración (el primer término es el que manda; los dos bonos solo desempatan):

| h1 @1280 | `h1Ratio` | 1.er término | score con ambos bonos | ¿entra? |
|---|---|---|---|---|
| 32 px | 0.025 | −0.17 | 0.13 | no |
| 38 px | 0.030 | 0.00 | 0.30 | no |
| 48 px | 0.038 | +0.25 | 0.55 | sí (necesita los bonos) |
| 58 px | 0.045 | **+0.50** | 0.80 | **sí, solo** |
| 77 px | 0.060 | +1.00 | 1.00 | sí |

O sea: `h1Ratio ≥ 0.045` (≈58 px) entra por sí solo; un h1 de 32 px **no entra ni con las dos
bonificaciones** (0.13). Un h1 de 48 px entra únicamente si además es corto y bold, que es
justamente la definición de "big type" y no de "titular grande".

#### `editorial-photo`

```
areaImgVP  = Σ areaVP de IMAGENES en el primer viewport
areaTxtVP  = Σ areaVP de TEXTO   en el primer viewport
mayor      = max(areaVP de una sola imagen) / VAREA
nGrandes   = |IMAGENES con area >= 0.04 * VAREA| en los 2 viewports
signals.areaImgVsTexto = areaImgVP / max(1, areaTxtVP)

// CONDICION DE ENTRADA (antes del score): foto grande Y algo mas que una sola foto
if (mayor < 0.22 || (nGrandes < 2 && signals.areaImgVsTexto < 0.8)) score = 0
else score = clamp(0.5 * min(1, mayor / 0.22)
                 + 0.3 * min(1, nGrandes / 3)
                 + 0.2 * min(1, signals.areaImgVsTexto / 1.2), 0, 1)
```

Exige **foto grande** (≥22 % del viewport) **y** que no sea una foto sola: o hay ≥2 fotos grandes, o
la imagen le gana claramente al texto en área (`≥ 0.8`). Sin esa condición de entrada el score no
cumple lo que promete: `mayor = 0.22` con `nGrandes = 1` da `0.5 + 0.1 + …` y **entra igual**, porque
el primer término solo ya toca el umbral. Una landing SaaS con un único mockup de hero es exactamente
ese caso, y es el falso positivo que más caro sale (dispara héroes de foto real donde no hay fotos).
La segunda defensa es `kind = ui` (§2.9), que saca el mockup del pool de fotos editoriales.

#### `gradient-mesh`

```
PORTADORES = [body, html] ∪ (los 6 nodos de mayor areaVP con areaVP >= 0.40 * VAREA)
             // ◀ el gate de 40% va ACA, en el filtro; body/html quedan exentos (siempre cubren todo)
sobre cada portador:
  bgi = cs.backgroundImage
  stops    = contarStops(primer gradiente de bgi)     // ver abajo
  radiales = nº de 'radial-gradient(' en bgi          // incluye -webkit- y repeating-
  conicos  = nº de 'conic-gradient('  en bgi
blobs = |POOL con cs.filter que matchee /blur\(\s*(\d+(?:\.\d+)?)px/ con valor >= 40
         ∧ chroma(toRGBA(cs.backgroundColor).hex) >= 0.2|
signals.gradStops = max(stops)
score = clamp((radiales >= 2 ? 0.6 : 0) + (conicos >= 1 ? 0.6 : 0)
            + (stops >= 3 ? 0.35 : 0) + 0.15 * min(blobs, 3), 0, 1)
```

El gate de 40 % estaba solo en la prosa y no en el filtro: sin él, **un botón con gradiente activa
`gradient-mesh`** y el video entero se pinta de mesh. `blobs` sí recorre POOL completo (un blob
desenfocado es chico por definición); lo que debe ser grande es el **portador del gradiente**.

`contarStops` — el conteo ingenuo de comas se equivoca según haya o no dirección declarada:

```
contarStops(g):
  args = split de nivel 0 por ',' del interior del paréntesis   // respetar rgb(a,b,c) anidados
  si args[0] matchea /^(to |[\d.]+(deg|rad|grad|turn)|at |from |in )/  -> args.shift()
  return args.length
```

`linear-gradient(90deg, #a, #b)` → 3 args − 1 de dirección = **2 stops**. `linear-gradient(#a, #b)` →
2 args, sin dirección = **2 stops**. Contando comas darían 2 y 1: el segundo caso se escapaba del
umbral `stops >= 3` por un off-by-one. El `split` **tiene que ser de nivel 0** o `rgb(1, 2, 3)` cuenta
como tres stops y cualquier gradiente de dos colores dispara el detector.

#### `brutalist`

```
c1 = borderWidth >= 3
c2 = radius <= 4
c3 = shadowStyle === 'hard' ∧ blurMediano <= 2
c4 = contrast(inkOnBg, bg) >= 12
c5 = chroma(accent) >= 0.55 ∧ lum01(accent) ∈ [0.35, 0.75]   // color plano y chillón
score = 0.30*c1 + 0.25*c2 + 0.20*c3 + 0.15*c4 + 0.10*c5
```

Los pesos suman exactamente `1.00`. `c2` es necesario en la práctica: sin `radius ≤ 4` el máximo
alcanzable es `1.00 − 0.25 = 0.75`, que **todavía entra** — por eso `brutalist` convive mal con
`bento` y hace falta la regla de exclusión de abajo; en el desempate final (`máx 3`) se prefiere el
de score mayor.

**Salida**: ordenar por score desc, filtrar `≥ 0.5`, cortar a 3. Excluir combinaciones incoherentes:
si `brutalist` y `glass` entran ambos, se queda el de mayor score (son antagónicos por definición).

### 2.9 `assets.images[].kind` — clasificación barata (sin modelo)

Heurística sobre `alt`, `url`, aspecto y posición. **El orden de las filas ES la precedencia** (primer
match gana, se evalúa de arriba abajo); default `desconocido`. Los `∨`/`∧` están explícitos porque
"A o B y C" en castellano es ambiguo y acá cambia el resultado: la regla `ui` es
`nombre ∨ (aspecto ∧ marco)`, **no** `(nombre ∨ aspecto) ∧ marco` — con la segunda lectura, una
imagen con "dashboard" en el alt pero sin marco no se clasificaría `ui` y se colaría al pool
editorial.

| kind | Regla |
|---|---|
| `ui` | `match(url\|alt, /screenshot\|dashboard\|mockup\|app[-_]?(ui\|screen)\|interface\|panel/)` **∨** `( aspecto ∈ [1.5, 2.2] ∧ dentro de un contenedor con borderRadius ≥ 8 ∧ boxShadow ≠ none )` ← el patrón "captura enmarcada" |
| `persona` | `match(alt, /team\|equipo\|founder\|ceo\|cliente\|customer\|retrato\|portrait\|avatar\|staff/)` **∨** `( aspecto ∈ [0.7, 1.05] ∧ borderRadius ≥ 0.4·min(w,h) )` ← foto circular |
| `producto` | `dentro de [class*=product i] ∨ [itemprop=image] ∨ figure de una card de precio ∨ match(alt, /producto\|product\|item\|modelo\|sku/)` **∨** `aspecto ∈ [0.75, 1.3]` (el "fondo uniforme" del packshot no es medible barato → basta el selector) |
| `ambiente` | área ≥ 0.25·VAREA y aspecto ≥ 1.6 y sin match anterior (fondo/hero fotográfico) |
| `desconocido` | resto |

`rank` reutiliza **sin cambios** el ranking 9:16 que ya vive en `_JS_IMAGES`
(`area × aspectFactor × (1 + 0.35·rel) × logoFactor`).

### 2.10 Tabla resumen (referencia rápida del ejecutor)

| Campo | Selector / fuente | Propiedad | Agregación | Fallback |
|---|---|---|---|---|
| `palette.accent` | BOTONES + `::before` | `backgroundColor`/`borderColor`/`color` | voto por `chroma × peso × área`, buckets HSL | theme-color → bg más saturado → **re-voto sin gate de chroma (acromático)** → `#5b8cff` |
| `palette.accent2` | idem | idem | 2.º del ranking con Δhue ≥ 25° | `null` → derivado (§3.4) |
| `palette.bg` | POOL área ≥ 6 % VP | `backgroundColor` (a ≥ 0.9) | moda ponderada por área | body → html → 1.er stop del gradiente → `#ffffff` |
| `palette.inkOnBg` | TEXTO | `color` | voto por `len × fontSize` | `#111114` / `#f4f1ea` según `bgLum ≷ 0.18` |
| `palette.accentText` | derivado | — | bucle de contraste §3.3 (baja `l`, `s` intacta) | `= accent` si ya da ≥4.5; `inkOnBg` si no converge |
| `typography.displayHint` | TITULARES[0] | `fontFamily`, `fontStretch` | cascada de 5 reglas + `widthRatio` | `grotesk` |
| `typography.widthRatio` | TITULARES[0] | `measureText('HAMBURGEFONTSIV')` @100px | `/ (15 × 100)` | `0.66` |
| `typography.h1Ratio` | TITULARES[0] | `fontSize` | `/ VW`, clamp 0..0.5 | `0` |
| `typography.caseHint` | TITULARES + BOTONES | `textTransform` + ratio de mayúsculas | umbrales 0.40 / 0.60 | `sentence` |
| `typography.script` | `body.innerText` | rangos Unicode | ≥30 % del alfabeto | `latin` |
| `typography.textDir` | `script` + `document.dir` | `direction` | `rtl` si árabe/hebreo | `ltr` |
| `shape.radius` | BOTONES ∪ CARDS | `borderTopLeftRadius` | mediana ponderada, pills fuera | `12` |
| `shape.radiusRatio` | CARDS | `r / min(w,h)` | mediana | `0.06` |
| `shape.borderStyle` | BOTONES ∪ CARDS | `borderTopWidth/Style/Color` | fracción + mediana | `none` |
| `shape.shadowStyle` | CARDS | `boxShadow` | fracción + mediana de blur | `flat` |
| `density.*` | TEXTO+IMAGENES+BOTONES | rects | rejilla 64×45 + conteo | `medio` / `0.35` |
| `mood.*` | derivado | — | fórmulas §2.7 | `0.50/0.50/0.45` |
| `modernidad` | detectores §2.8 | varias | score ≥ 0.5, top 3 | `[]` |
| `assets.images[].kind` | `img` / bg-image | `alt`, url, aspecto, contenedor | primer match | `desconocido` |

---

## 3. Normalización y sanidad (en Python, `site_capture.py` / `schema.js`)

Orden **fijo** de aplicación (importa: la sanidad de contraste depende de la de acromatismo).

### 3.1 Formato

1. Todo hex → minúscula, 7 chars. `#abc` → `#aabbcc`. Cualquier cosa que no matchee
   `/^#[0-9a-f]{6}$/` tras expandir → se descarta y se aplica el fallback del campo (`E-SCHEMA-COLOR`
   se reporta pero no falla).
2. Todo float → `round(x, 2)`. Todo int → `round`. Clamp al rango de la tabla §1.
3. Enums: valor no reconocido → default del campo + `E-SCHEMA-ENUM` en `errores`.
4. Arrays: truncar al cap; strings: truncar al máximo de chars (sin cortar a mitad de palabra cuando
   el cap es de texto visible).

### 3.2 Marcas acromáticas

```
acromatica = signals.chromaMax < 0.12
```

**Solo `chromaMax`** — el test `chroma(accent) < 0.12` que decía una versión previa de esta doc
sobraba y además rompía el caso: si `accent` se cayó al default `#5b8cff` (chroma `0.64`), el `∧` daba
`false` y ninguna página acromática se detectaba jamás. `chromaMax` se mide **antes de todo descarte**
(§1.2), así que es la única señal honesta de "en esta página no hay color". Con el fallback 2.5 de
§2.3, además, `accent` ya no se va al azul en este caso: queda el gris/negro real de la marca.

Cuando es `true` (Apple, Vercel, muchos estudios, y toda página que solo usa negro/blanco):

- `accent` se **conserva medido** (honestidad: no inventamos un color de marca).
- `accent2 = null` y **no se deriva** (un segundo color inventado delata la fábrica al instante).
- Se marca `dna.palette.acromatica = true`. La dirección de arte (§4.6) cambia de estrategia:
  el acento deja de ser color y pasa a ser **luz y grosor** (halo blanco al 12 %, hairline, tipografía
  como único protagonista). Es el look "premium noir" que ya sabemos hacer.
- `energia` recibe `−0.10` adicional (una marca acromática rara vez es enérgica) y `formalidad` `+0.10`.

### 3.3 Contraste mínimo

```
si contrast(inkOnBg, bg) < 4.5:
    inkOnBg = "#0b0b0e" si bgLum > 0.18 else "#f4f1ea"      # pivote WCAG, ver §2.3
    notas += "ink saneado por contraste"
    si SIGUE < 4.5  ->  E-SCHEMA-CONTRAST  (bug del saneador: bg imposible)

accentText = accent
para i en 1..20 mientras contrast(accentText, bg) < 4.5:
    h,s,l = hexToHsl(accentText)
    l = l - 0.04 si bgLum > 0.18 else l + 0.04             # alejarse del fondo
    l = clamp(l, 0.04, 0.96)
    si l no cambio respecto de la iteracion previa: break   # tope: no converge, no gires 20 veces
    accentText = hslToHex(h, clamp(s, 0, 1), l)
si contrast(accentText, bg) < 4.5: accentText = inkOnBg     # ultima red: inkOnBg YA esta saneado
```

Con `#5b8cff` sobre blanco esto tarda **3 iteraciones** (`l: 0.678 → 0.638 → 0.598 → 0.558`,
contraste `4.99`) y da `#1e61ff` — el valor del ejemplo §1.7. `s` **no** se toca en ninguna
iteración: bajar la saturación junto con la luminosidad da un acento lavado, que es precisamente el
bug histórico que este bloque existe para evitar.

`accent` **no** se toca: sigue siendo el color de relleno de placas y halos (donde el contraste lo da el
texto encima, ya resuelto por `legibleOnBest` en `src/urvid/core/palette.js`). `accentText` es la
variante para tipografía sobre `bg`. Distinguirlos evita el bug histórico de "acento lavado".

### 3.4 Derivación de `accent2` cuando es `null`

Solo si la dirección de arte lo pide (mesh/glass/duotono). Determinista, sin seed:

```
h,s,l = hexToHsl(accent)
Δh = 150 si modernidad ∋ gradient-mesh   # complementario partido: mesh necesita salto real de hue
     else 32                              # análogo: acompaña sin competir
accent2 = hslToHex((h + Δh) % 360, clamp(s * 0.92, 0.25, 0.95), clamp(l + 0.06, 0.30, 0.72))
```

Si `acromatica` → `accent2` queda `null` y las escenas que lo requieren usan `inkOnBg` a alfa reducido.

### 3.5 Valores absurdos (todos vistos en producción)

| Síntoma | Regla |
|---|---|
| `radius > 64` px | es una pastilla mal medida → `pill = true`, `radius = 32` |
| `fontSize(h1) > 200` px | página con `zoom`/`transform: scale` → recalcular con `getBoundingClientRect().height` del titular; si no cuadra, `h1Ratio = 0` |
| `fill > 1` | bug de la rejilla → clamp 1 |
| `bg` con `a < 0.9` en todos los candidatos | página con fondo `transparent` sobre el UA → `#ffffff` |
| `accent == bg` (o `contrast(accent,bg) < 1.15`) | el "acento" era el fondo → descartar y pasar al siguiente candidato del ranking |
| `accent == inkOnBg` | idem: el acento era el color del texto → siguiente candidato |
| `bodyText < 200 chars` **y** `TEXTO.length < 5` (`bodyText` = `document.body.innerText.trim()`, el mismo blob de §2.4) | señal insuficiente → **todo** el `dna` a defaults salvo `bg` y `logo`; `confianza ≤ 0.3`. Es el caso §5.1 |
| `borderWidth > 12` | outline decorativo → clamp 12 |
| `chroma(accent) > 0.95 ∧ lum01 > 0.9` | amarillo/cian puro de un badge → válido, pero `accentText` **siempre** se usará para texto |
| más de 3 `modernidad` | cortar a 3 por score |
| `mood` fuera de 0..1 | clamp (bug de fórmula → `E-SCHEMA-RANGE`) |

---

## 4. Cómo el DNA influye en el video (y hasta dónde)

**Principio rector**: el DNA es un **adjetivo**, no un plano. El video debe *sentirse* de la misma
familia que la página; **no** debe parecerse a la página. Si un espectador puede reconstruir el layout
del sitio mirando el video, fallamos.

### 4.1 Qué se HEREDA

| Del DNA | A qué decisión del motor | Fórmula / regla concreta |
|---|---|---|
| `palette.accent` | acento único del video (`pal.accent`) | directo. **Un solo acento** por video (restraint — ver `DIRECCION-DE-ARTE.md`) |
| `palette.accent2` | segundo color solo en mesh/glass/duotono | si `null` y hace falta → §3.4 |
| `palette.bgLum` | elección de **placa** | `bgLum ≤ 0.06` → `noir`\|`carbon` · `0.06 < bgLum < 0.55` → `tinta` (teñida al hue del acento) · `bgLum ≥ 0.55` → `crema`. Equivalencias sRGB para verificar a ojo: `0.06` ≈ `#454545`, `0.55` ≈ `#c4c4c4`. **No son 0.20/0.80**: `bgLum` es luminancia relativa WCAG, no lightness — con el corte en `0.80` una página `#e0e0e0` (`bgLum 0.745`, blanquísima a la vista) caía en `tinta`, y con `0.20` un gris medio `#7c7c7c` se pintaba `noir` |
| `palette.acromatica` | modo de acento | `true` → acento = luz (halo 12 %) + hairline, no relleno de color |
| `shape.radiusRatio` | radio de TODAS las placas/cards del kit | `boxW = box[2] × 405`, `boxH = box[3] × 720` (las `box` de la timeline son **normalizadas 0..1**, plan §6) → `rKit = clamp(radiusRatio × min(boxW, boxH), 0, 40)` en px lógicos del lienzo 405×720. **Nunca** copiar `radius` en px del viewport: 1280 → 405 es ×0.316 y el radio se volvería invisible. El ratio es resolución-independiente y sobrevive al ×2.667 del export a 1080×1920 |
| `shape.pill` | badges y chips | `true` → chips pastilla (`r = h/2`) |
| `shape.borderStyle` | marcos del kit | `none` → sin marco · `hairline` → 1 px lógico al 35 % de alfa · `bold` → 2.5 px lógicos al 90 % |
| `shape.shadowStyle` | `fx.js` | `flat` → sin sombra, se separa por valor · `soft` → sombra difusa 18 px lógicos · `hard` → offset (3,4) blur 0 |
| `typography.displayHint` | pairing de **nuestras** fuentes | mapa §4.4. **Nunca** se descarga la webfont de la marca (§6) |
| `typography.caseHint` | `look.case` | directo, salvo `script ≠ latin` → `sentence` |
| `typography.textDir` | `text.js` | `rtl` → sin tracking positivo, sin `letterSpacing`, alineación derecha por defecto |
| `density.score` (d) | ritmo y carga por escena | `capasPorEscena = round(3 + 4·d)` (3..7) · `segundosPorEscena = 2.6 − 0.8·d` (1.8..2.6) · `escalaDisplay = 1.12 − 0.25·d` |
| `mood.energia` (e) | duración y elasticidad | `durTransicion = 0.62 − 0.26·e` (0.36..0.62 s) · `spring.w = 9 + 6·e` · `stagger = 0.09 − 0.045·e` |
| `mood.formalidad` (f) | curvas y ornamento | `f ≥ 0.65` → solo `eo`/`eio`, cero overshoot, ornamento `line` · `f ≤ 0.35` → `spring`/`back`, overshoot ≤ 1.14, ornamento `dots` |
| `mood.calidez` (c) | grano y viñeta (`fx.js`) | `c ≥ 0.60` → grano cálido (`#ffeedd` al 4 %) y viñeta marrón · `c ≤ 0.40` → grano neutro (`#ffffff` al 3 %) y viñeta negra |
| `modernidad[]` | sesgo del catálogo de escenas y placas | tabla §4.2 |
| `semantica.*` | qué escenas existen | tabla del plan §4 (no se repite acá) |
| `assets.images[].kind` + `rank` | qué foto va a qué escena | `producto` → `hero.product` · `persona` → `proof.quote` · `ambiente` → fondo full-bleed · `ui` → `hero.appwindow` |

### 4.2 `modernidad` → sesgo (multiplicadores sobre el `weightedPick` del catálogo)

| Señal | Efecto |
|---|---|
| `bento` | ×2.5 a `features.bento` · placas con celdas y separadores de 1 px · transición 10 (`stagger-pop`) preferida en esa escena |
| `glass` | placa `glass` habilitada (blur simulado: capa de acento al 8 % + hairline blanco al 20 % + borde superior degradado) · ×1.8 a escenas con card flotante |
| `bigtype` | `escalaDisplay ×1.18`, máx 4 palabras por línea, `hook.statement` casi obligatorio (peso ×3) |
| `editorial-photo` | ×2.2 a héroes de foto real · transición 6 (`crossfade-parallax`) y 4 (`push-reveal`) ganan peso · el objeto héroe procedural pierde peso |
| `gradient-mesh` | fondo mesh habilitado (2–3 blobs, ver `meshBlobs` de `kinetic/core/dna.js`) · `accent2` derivado con Δh=150 |
| `brutalist` | `borderStyle` forzado a `bold`, `radius` forzado a ≤4, sombras `hard`, `caseHint = upper`, ornamento `corners`, transición 8 (`flash-cut`) habilitada |

Regla dura: **máximo 2 sesgos activos** en un mismo video aunque `modernidad` traiga 3. El tercero se
usa solo como desempate. Tres lenguajes visuales simultáneos = slop.

### 4.3 Qué NO se hereda (lista negra explícita)

| No heredamos | Por qué |
|---|---|
| El **layout** de la página (grid, columnas, orden de secciones) | el video es 9:16 y temporal; copiar un layout de 1280 ancho da composiciones muertas. La composición la decide `composer.js` |
| El **screenshot** como fondo o textura | `assets.screenshot` existe solo para auditoría humana. Un screenshot en el video = "video hecho con plantilla" a primera vista. La única UI permitida es `hero.appwindow`, **redibujada** por nuestro kit con textos reales |
| Imágenes de **UI/chrome** (nav, footer, logos de terceros, mapas, iconos) | ya las filtra `_JS_IMAGES.BAD`; se refuerza con `kind = ui` (solo entra a `hero.appwindow`) |
| La **escala tipográfica completa** (7 niveles, tracking por nivel, line-height por nivel) | el video tiene 3 niveles (display / lead / caption). Heredar 7 niveles es ruido |
| Las **webfonts** de la marca | licencia + determinismo + peso del bundle (§6). Heredamos la *clase* (`displayHint`), no el archivo |
| Los **colores semánticos** (success/warning/error/info) | no hay estados en un video |
| Los **componentes** (input, modal, nav, list) | no hay interacción. Sobreviven solo `card` y `badge`, como formas |
| El **hue exacto del fondo** de la página | el fondo del video lo decide la placa; el hue de la página solo entra como tinte en la placa `tinta` |
| Las **animaciones CSS** de la página | §6 |

### 4.4 `displayHint` → pairing de nuestras fuentes

El pairing final lo elige `FONT_PAIRS` (`src/kinetic/libs/fonts.js`) con `moodPick`; el DNA aporta un
**filtro previo** de familias compatibles, no una elección fija (si el DNA eligiera la fuente, todos los
videos de un rubro serían iguales — anti-huella):

| `displayHint` | Familias candidatas del pool | Peso |
|---|---|---|
| `serif` | pares con display serif/didone | ×3 |
| `grotesk` | grotescas neutras y neo-grotescas | ×2 |
| `rounded` | geométricas de terminación blanda | ×3 |
| `mono` | mono solo para el **soporte** (caption/eyebrow), display sigue siendo sans | ×2 en soporte |
| `condensed` | condensadas / display alto | ×3 |

El `moodPick` gaussiano sigue mandando: el DNA orienta, el seed decide. Cap 3:1 ya implementado.

### 4.5 Anti-huella (obligatorio, se hereda de kinetic)

El DNA **nunca** produce un valor visual constante. Toda ancla derivada del DNA se jitteriza con el
seed antes de pintar (mismo patrón que `kinetic/core/dna.js`: hue ±14°, luminosidades por rango,
tracking float, bpm float). Dos videos de la **misma** página con seeds distintos deben verse
claramente distintos; dos videos de páginas distintas con el mismo seed también.

### 4.6 Caso acromático (la trampa más común)

Cuando `acromatica = true` la tentación es inventar un color. Prohibido. Estrategia:

- placa: `noir` o `crema` según `bgLum` (nunca `tinta` — no hay hue que teñir);
- "acento" = luz: halo radial blanco al 10–14 %, sweep, y hairline al 30 %;
- jerarquía 100 % tipográfica: `escalaDisplay ×1.15` y `sizeContrast ≥ 2.4`;
- ornamento `line` o `corners`, nunca `dots` (los puntos piden color);
- una única concesión de color: el grano cálido/frío según `calidez`, imperceptible pero presente.

---

## 5. Los 5 casos adversariales (fixtures obligatorios de F1)

Cada uno se commitea como `backend/fixtures/pagemodel/<caso>.json` + una nota de cómo se generó.
El gate `director-storyboard-check` los consume **sin red**.

### 5.1 Página vacía (200, `<body>` con ≤3 palabras, sin CSS)

**Detección**: `bodyText.length < 200` ∧ `TEXTO.length < 5` ∧ `httpStatus == 200`.

**Debe devolver**: exactamente el JSON de §1.7 (defaults puros) con `estado: "ok"`,
`confianza ≈ 0.30`, `notas: ["sin texto: dna por defecto"]`, `bg` medido si el `body` tiene color
(única señal aprovechable), `modernidad: []`, `semantica.queHace = ""`.

**Qué NO debe pasar**: excepción, `null` en ningún campo salvo `accent2`, `E-SCHEMA-*` de tipo hard.
El composer con esto produce la gramática mínima de 3 escenas usando `title`/host como texto.

### 5.2 Botwall (Cloudflare / "Just a moment…" / hCaptcha / "Access denied")

**Detección** (cualquiera):
```
httpStatus ∈ {403, 429, 503}
∨ /just a moment|checking your browser|verify (you are )?human|attention required|
   access denied|enable javascript|ddos protection|cf-browser-verification/i.test(title + bodyText)
∨ (bodyText.length < 400 ∧ document.querySelector('#cf-wrapper, .cf-error-code, [data-cf-*]'))
```

**Debe devolver**: `estado: "botwall"`, `confianza ≤ 0.15`, y — la parte importante — **el `dna`
medido se DESCARTA por completo y se reemplaza por los defaults**. Medir el DNA de un botwall es
medir el diseño de Cloudflare (gris, Inter, radius 8, sin acento) y estampárselo a la marca: peor que
no medir nada. Se conservan únicamente las señales que **no** vienen del render del muro:

- `meta[name=theme-color]` del HTML original si existe → candidato a `accent`;
- `link[rel*=icon]` / `apple-touch-icon` → `assets.logo` (y si se descarga, su color dominante puede
  alimentar `accent` como fallback 1.5). Esa descarga ocurre **en captura**, dentro del browser ya
  abierto y pasando por `_guard()`/`url_is_safe()` — **jamás en render**: el motor nunca hace red
  (invariante duro 2 de §0). El `pagemodel` guardado ya trae el hex resuelto;
- el **host** → `semantica.queHace` provisional (`"<marca>"`).

`notas += ["botwall: dna descartado"]`. El composer con `confianza < 0.35` va a gramática mínima.
No reintentar más de una vez (y jamás resolver el captcha: está fuera de lo que hacemos).

### 5.3 Página no latina (japonés, árabe, cirílico)

**Detección**: §2.4 (`script ≠ latin`), reforzado por `document.documentElement.lang`.

**Debe devolver**: el `dna` **completo y válido** — todas las mediciones de color, forma, densidad y
modernidad son agnósticas del idioma y funcionan perfecto. Los ajustes obligatorios son:

| Campo | Valor forzado | Motivo |
|---|---|---|
| `typography.caseHint` | `"sentence"` | no hay mayúsculas en CJK/árabe/hebreo; `upper` rompe el texto |
| `typography.displayHint` | `"grotesk"` si `script ∈ {cjk, arabic, hebrew, devanagari}` | la clasificación serif/rounded está calibrada para latinas |
| `typography.textDir` | `"rtl"` si `script ∈ {arabic, hebrew}` | `text.js`: sin tracking, sin letter-spacing, alineación derecha |
| `semantica.idioma` | el ISO real | perception escribe el copy **en ese idioma** |

**Nota crítica para F2/F3, no para el extractor**: nuestras fuentes empaquetadas no tienen glifos CJK
ni árabes. `text.js` debe **verificar la cobertura de glifos** antes de pintar
(`ctx.measureText(char).width > 0` y comparar con el ancho del glifo `.notdef`) y, si falta, degradar a
la fuente de sistema o marcar `E-TXT-TOFU`. El extractor solo deja la señal (`script`); resolverlo es
tarea del renderer. Registrarlo en `notas`: `"script no latino: verificar glifos"`.

### 5.4 SPA sin contenido en el HTML crudo

**Detección**: tras `networkidle` + scroll + `fonts.ready`, `bodyText.length < 200` ∧ existe
`#root, #app, [data-reactroot], [id=__next]` vacío o con ≤1 hijo.

**Debe hacer**: **un** reintento — `wait_for_timeout(3000)` + re-scroll + re-evaluar `_JS_EXTRACT` y
`_JS_DNA`. Si el segundo intento trae contenido → `estado: "ok"`, `notas += ["spa: 2.º intento"]`.

Si sigue vacía → `estado: "spa-vacia"`, `confianza ≤ 0.30`, y se conserva **solo lo que sí se pintó**:
`bg` (casi siempre hay uno), `theme-color` como `accent`, `logo` del favicon, `ogImage`. Todo lo demás
a defaults. `density.nivel = "aireado"` (es literalmente lo que se ve).

En la práctica este caso ya está casi resuelto por el pipeline existente (Playwright + networkidle +
`fonts.ready` + scroll de lazy-load): el fixture existe para que no vuelva a romperse.

### 5.5 404 / página de error

**Detección**: `response.status ≥ 400` ∨
`/\b404\b|not found|página no encontrada|no existe|error 5\d\d|oops/i` sobre `title` con
`bodyText.length < 800`.

**Debe hacer**: **una** recuperación — navegar a la raíz del **mismo host** (`scheme://host/`),
pasando por `url_is_safe()`. Si la raíz responde `< 400` y tiene contenido → medir ahí,
`captura.urlFinal` = la raíz, `notas += ["404: se midió la raíz"]`, `estado: "ok"`,
`confianza` con penalización de `−0.10`.

Si la raíz también falla → `estado: "404"`, `confianza ≤ 0.10`, **`dna` a defaults** (misma lógica que
el botwall: el diseño de una página de error suele ser el genérico del hosting, no el de la marca),
`semantica` vacía salvo el host. El composer con `confianza < 0.35` produce las 3 escenas mínimas —
lo cual, para una URL rota, es exactamente lo correcto: no fingir que hay marca.

### 5.6 Los otros dos `estado` del enum (`timeout`, `bloqueada`)

No tienen fixture propio (no son "páginas", son fallas de captura), pero **están en el enum de §1.1 y
sin definirlos el ejecutor no sabe cuándo escribirlos**. Ambos se comportan como el botwall: `dna` a
defaults, `semantica` vacía salvo el host, gramática mínima.

| `estado` | Detección | `confianza` | Nota |
|---|---|---|---|
| `timeout` | `page.goto` lanza y **no** hubo `domcontentloaded` (el `goto` actual ya atrapa la excepción y sigue: si tras eso `bodyText === ""` ∧ `httpStatus === 0`, es timeout, no SPA) | `0` | `notas += "timeout de captura"`. `httpStatus = 0`. No reintentar: el `goto` ya tiene 30 s |
| `bloqueada` | `url_is_safe()`/`_guard()` da `false` (esquema no http/https, host privado/loopback, SSRF), **o** el `content-type` de la respuesta no es HTML (PDF, imagen, `application/*`) | `0` | `notas += "url bloqueada: <motivo>"`. **Nunca** se abre el browser: es el único estado que se decide sin navegar |

`bloqueada` es el que más importa auditar: es la barrera de SSRF. Si el extractor llegara a medir una
URL que `url_is_safe()` rechazó, el bug es de seguridad, no de calidad de video.

### 5.7 Matriz de aceptación (lo que asserta el gate)

| Caso | `estado` | `confianza` | `dna` medido | `modernidad` | No lanza | Escenas resultantes |
|---|---|---|---|---|---|---|
| vacía | `ok` | ≈0.30 | solo `bg` | `[]` | ✔ | 3 (mínima) |
| botwall | `botwall` | ≤0.15 | **descartado** | `[]` | ✔ | 3 (mínima) |
| no latina | `ok` | normal | **completo** | normal | ✔ | completas, `case=sentence` |
| SPA vacía | `spa-vacia` | ≤0.30 | `bg` + theme-color | `[]` | ✔ | 3 (mínima) |
| 404 (raíz también falla) | `404` | ≤0.10 | **descartado** | `[]` | ✔ | 3 (mínima) |
| 404 (raíz sirvió) | `ok` | fórmula §1.5 **−0.10** | **completo, medido en la raíz** | normal | ✔ | completas si `confianza ≥ 0.35` |
| timeout | `timeout` | `0` | **descartado** | `[]` | ✔ | 3 (mínima) |
| bloqueada | `bloqueada` | `0` | **descartado** | `[]` | ✔ | 3 (mínima) |

La fila del 404 se partió en dos a propósito: son dos resultados **opuestos** (uno mide un sitio
entero, el otro no mide nada) y una sola fila con "`404` o `ok`" y "≤0.10" hacía imposible escribir el
assert — el caso recuperado tiene `confianza` alta y `dna` completo, no `≤0.10`.

En los 5 casos con fixture: `validate(pagemodel).ok === true` y `errores` sin códigos hard.

---

## 6. Qué NO aplica a nosotros y por qué

La skill `design-dna` está pensada para que un agente **genere HTML/CSS/JS** a partir de una
referencia. Nosotros generamos **frames de canvas 2D deterministas**. Estas partes se descartan
deliberadamente:

| De la skill | Por qué no aplica |
|---|---|
| **Toda la dimensión `visual_effects`** como *implementación* (WebGL, Three.js, Pixi, GLSL, shaders, `uniforms`, `EffectComposer`, CDNs) | El motor es canvas 2D puro, sin GPU y sin dependencias externas (regla de independencia, plan §0.1). Sí destilamos su **vocabulario**: `glass`, `mesh-gradient`, `noise-field`, `grain` se convierten en detectores (§2.8) y en pintores procedurales de `kit/fx.js` evaluados en función de `t`. Lo que se descarta es el *cómo* de la skill, no el *qué* |
| `requestAnimationFrame`, `ResizeObserver`, `IntersectionObserver`, loops de animación, `destroy/cleanup on unmount` | `drawFrame(ctx, t)` es **puro y seek-safe**: se llama con cualquier `t` en cualquier orden y debe pintar idéntico. Un rAF o cualquier estado acumulado rompe el determinismo y el gate de seek-en-frío |
| `scroll_effects` (parallax por scroll, `scroll_triggered_animations`, `scrub_behavior`, `scroll_morphing`) | No hay scroll en un mp4. **Se traducen**: parallax de scroll → parallax de cámara en las recetas 4 y 6 del linker; scroll-triggered reveal → keyframes de entrada en la timeline. El concepto se hereda, el mecanismo no |
| `cursor_effects` (custom cursor, magnetic buttons, spotlight, trail) e `interaction_feel` (hover, feedback, loading, microinteraction density) | No hay mouse, no hay hover, no hay estados de carga. Es la parte de la skill que menos transfiere |
| `layout.grid_system`, `max_content_width`, `columns`, `gutter`, `breakpoints` | El lienzo es fijo 405×720 lógicos (escalados ×2.667 a 1080×1920). No hay responsive ni columnas. La composición 9:16 no se deriva de una grilla de 1280 |
| `type_scale` completo (display/h1/h2/h3/body/body_small/caption/overline × size/weight/line_height/tracking) | 28 campos para 3 niveles reales de video. Heredamos `displayHint` + `caseHint` + `widthRatio` y punto |
| `font_families.*` como valor a usar | No descargamos ni embebemos las webfonts de la marca: licencia incierta, peso, y sobre todo **determinismo** (el render debe dar el mismo byte con las fuentes empaquetadas del repo). Heredamos la *clase*, elegimos *nuestro* pairing (§4.4) |
| `color.semantic.*` (success/warning/error/info) | Un video no tiene estados |
| `design_system.components` (button/input/card/nav/modal/list) | No hay UI interactiva. Solo `card` y `badge` sobreviven, y como formas del kit, no como componentes |
| `iconography.preferred_set` | No cargamos icon sets de terceros (independencia). Usamos nuestros objetos de `src/shared/objects.js` |
| `design_system.motion` observado de la página (easing CSS, duraciones, entrance/exit patterns) | No es medible de forma confiable sin interacción (las transiciones CSS solo se ven al hacer hover/click) y, sobre todo, **nuestras curvas no vienen de la página**: vienen de `MOTION-PRINCIPLES.md`. El DNA modula duración y elasticidad vía `mood.energia`/`formalidad` (§4.1), no copiando `cubic-bezier` ajenos |
| `overview.performance_tier`, `fallback_strategy`, `prefers-reduced-motion`, `navigator.hardwareConcurrency` | Render offline determinista. No hay dispositivo de baja gama ni preferencia de usuario que respetar en el frame |
| El mandato **"every field populated, no empty strings"** (SKILL.md fase 2) | Es una invitación directa a alucinar. Nosotros preferimos **default explícito + `captura.confianza`**. Un campo vacío es información (`features: []` desactiva la escena de features); un campo inventado es una mentira sobre la marca del cliente. Esta es la divergencia más importante respecto de la skill |
| El flujo de 3 fases con **LLM multimodal mirando screenshots** para extraer tokens | Caro, no determinista y peor que medir. Nosotros **medimos** con Playwright (gratis, exacto, repetible) y reservamos el LLM para `semantica`, que es lo único que no se puede medir. `brand_dna.py` (lectura visual del screenshot) queda como fuente **secundaria** de desempate, no como fuente de verdad |
| `meta.source_references`, `created_at` y el JSON como artefacto para "compartir entre equipos" | Nuestro artefacto equivalente es `pagemodel.json` versionado con `v` + `captura.ts`. Mismo espíritu, nuestro formato |
| La "polish iteration" (re-adjuntar las URLs y auditar contra la referencia) | Nuestro equivalente es `director-loop.mjs` (plan §8): 10 páginas × 5 seeds, violaciones tipadas, top-3, re-run. Loop objetivo con gates, no re-prompt subjetivo |

---

## 7. Checklist de aceptación de F1 (lo que el ejecutor debe poder tildar)

- [ ] `_JS_DNA` + `extract_dna(page)` en `backend/site_capture.py`, evaluado en el punto exacto de §2.0.
- [ ] Todos los campos de §1 presentes con su default; `validate(pagemodel)` nunca lanza.
- [ ] `toRGBA` (canvas 1×1) usado en **todas** las lecturas de color; cero regex de `rgba(`.
- [ ] Umbrales de §2 escritos como constantes nombradas arriba del `_JS_DNA`, con el viewport
      `1280×900` documentado como precondición.
- [ ] Normalización de §3 en Python, con tests unitarios puros (sin browser) para: acromatismo,
      contraste, derivación de `accent2`, cada fila de §3.5.
- [ ] Los 5 fixtures adversariales commiteados + la matriz §5.7 verificada por el gate.
      (Son **adicionales** a los 10 pagemodels reales de la lista fija de `director-loop`, plan §8:
      el repo termina F1 con 15 fixtures, no con 10 — el plan §9-F1 dice "10 fixtures (5
      adversariales incluidos)" y `director-loop` pide 10 páginas **reales**; ambas cosas a la vez
      son 15.)
- [ ] `pagemodel.json` de urvid.com.ar y de un ecommerce real leídos a ojo: acento correcto, placa
      correcta, `modernidad` creíble, `semantica.queHace` correcta.
- [ ] `perception.py` con los campos nuevos y cache key **v9**.
- [ ] Ningún import de la skill en ningún lado (`director-independence-check` verde).
- [ ] `E-TXT-TOFU` agregado a la taxonomía del plan §8 (§1.8).

**Tests unitarios que fijan las constantes corregidas en auditoría** (sin browser, puros — si alguno
falla, alguien revirtió una corrección sin darse cuenta):

- [ ] `pivote 0.18`: `bg = #8a8a8a` (`bgLum ≈ 0.25`) → `inkOnBg` **oscuro**, no claro (§2.3).
- [ ] `accentText`: `accent = #5b8cff`, `bg = #ffffff` → converge en 3 iteraciones a `contrast ≥ 4.5`
      (`≈ #1e61ff`) con la **saturación intacta** (§3.3, §1.7).
- [ ] `acromatica`: página negro-sobre-blanco → `acromatica = true` **y** `accent` ≠ `#5b8cff`
      (fallback 2.5 de §2.3). Es el test que caza la regresión más cara de todas.
- [ ] `glass` con cero nodos `backdrop-filter` → score `0`, `modernidad` sin `glass` (§2.8).
- [ ] `gradient-mesh`: botón de 120×40 con `linear-gradient` de 3 stops → score `0` (gate de 40 %).
- [ ] `widthRatio`: Inter → `∈ [0.63, 0.73]` → `grotesk`, **no** `rounded` (§2.4).
- [ ] `confianza`: página vacía `estado ok` → exactamente `0.30`; botwall → `≤ 0.15` por el `min()`.
