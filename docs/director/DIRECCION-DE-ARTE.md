---
destilado_de: "genjutsu (skills/cast + skills/paint 'zero AI slop', _jutsu/design-audit, _jutsu/ui-ux-pro-max, _jutsu/motion-principles, _jutsu/canvas-generative) + lo ya aprendido en ESTE repo (public/demo-nova.js, src/urvid/libs/scenes/premium.js, docs/KINETIC-IA.md, tools/legibility-probe.mjs, tools/urvid1-apca-check.mjs) — tarea F0.1 de docs/MOTOR-DIRECTOR.md. A partir de acá, ESTA doc es la única referencia: el motor no vuelve a mirar la skill."
auditoria: "v2 — auditada contra el código real del repo (@napi-rs/canvas, src/shared/objects.js, public/demo-nova.js, src/urvid/libs/scenes/premium.js, tools/legibility-probe.mjs, src/director/core/schema.js, tools/director-independence-check.mjs) y contra docs/MOTOR-DIRECTOR.md. Correcciones: máscaras tinta/glifo separadas, ratios de C1 en cascada, bandas de C10 sin huecos, códigos de error tabulados (§5.0.1), sheet-escenas vs sheet-link (§5.0), blur propio sin DOM ni ctx.filter (§4.2), gotcha de shadow vs CTM (§P2), pseudocódigo del medidor (§7)."
---

# DIRECCIÓN DE ARTE — el criterio anti-slop, convertido en checklist verificable

> **Para quién**: (a) `src/director/core/composer.js` y `kit/layers.js` al componer escenas estáticas,
> (b) `tools/director-storyboard-check.mjs` al medir stills, (c) el auditor visual (humano o agente)
> que mira grillas y firma un veredicto.
> **Regla de uso**: todo hallazgo se cita por su ID (`C3`, `S7`, `P2`, `D1`…). Un gate que dice
> "composición floja" no sirve; un gate que dice `C7 FALLA: acento cubre 21% del frame (máx 12%)` sí.

## 0. Constantes del lienzo (todo número de esta doc está en estas unidades)

| Concepto | Valor |
|---|---|
| Lienzo lógico | `W=405`, `H=720` (9:16). Se exporta escalando ×2.6667 → 1080×1920 (`DSF = 1080/405`) |
| Coordenadas de capa | `box = [x, y, w, h]` **normalizado 0..1** (x·W, y·H). Un `px` en esta doc = px del lienzo lógico 405×720 |
| Zona segura de composición | `x ∈ [0.06, 0.94]`, `y ∈ [0.05, 0.90]` |
| Zona segura de TEXTO (UI de Reels/TikTok encima) | `x ∈ [0.08, 0.90]`, `y ∈ [0.06, 0.84]` — **asimétrica a propósito**: el riel de acciones de TikTok/Reels come el borde derecho, la banda inferior es del caption |
| Grilla de referencia | vertical **6px**: toda `y` de baseline y todo alto de bloque se redondea a múltiplo de `6/720 = 0.008333` normalizado (`y = round(y·120)/120`). Ejes verticales por escena: **máx 2** |
| fps | 30 (todos los tiempos en segundos; `frame = round(t·30)`) |

Regla estructural que atraviesa todo: **el renderer no conoce escenas, sólo capas + tracks**
(§6 del plan). Por lo tanto todo criterio de esta doc se evalúa sobre el **still resuelto en un `t`**,
no sobre "la escena": `evalAt(timeline, t)` → capas → medición.

### 0.1 De dónde sale cada número, y la trampa de independencia

Todos los valores de esta doc están verificados contra código **nuestro** ya en el repo:
`public/demo-nova.js` (la pieza dirigida a mano, lienzo 1080×1920), `src/urvid/libs/scenes/premium.js`
y `src/shared/objects.js` (lienzo lógico 405×720), `tools/legibility-probe.mjs`, `src/urvid/core/util.js`.
Cuando el valor de nova y el de premium difieren, esta doc dice **cuál manda** y por qué.

> **TRAMPA DE INDEPENDENCIA — leer antes de escribir una línea.** `apcaLc()` y `contrast()` hoy viven
> en `src/urvid/core/util.js`. El gate `tools/director-independence-check.mjs` **falla** (`E-INDEP`) ante
> cualquier import desde `src/director/` que contenga `/urvid/` o `/kinetic/`. Por lo tanto: se **copian**
> (portadas verbatim, son ~20 líneas puras) a un archivo nuevo `src/director/core/util.js`. La única
> importación cruzada permitida es `../shared/objects.js`. Cada vez que esta doc diga "`core/util.js`"
> se refiere a `src/director/core/util.js` (copia propia), **nunca** al de urvid.

Fórmulas base, fijadas acá para que no haya dos versiones (idénticas a `legibility-probe.mjs`):

```js
const lin = c => { c /= 255; return c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4) }
const lum = (r,g,b) => 0.2126*lin(r) + 0.7152*lin(g) + 0.0722*lin(b)      // luminancia relativa WCAG, 0..1
const wcag = (l1,l2) => (Math.max(l1,l2)+0.05) / (Math.min(l1,l2)+0.05)   // 1..21
// apcaLc(textHex,bgHex) -> Lc firmado [-108..106]; siempre se usa |Lc| (constantes 0.98G-4g)
```

---

## 1. CHECKLIST DE COMPOSICIÓN (C1–C12)

Cada ítem tiene: **regla**, **cómo se ve a ojo en un still**, **cómo se mide** (fórmula computable
desde el storyboard JSON o desde los píxeles del still) y **código de error**. Los códigos están
tabulados en §5.0.1: los que ya existen en la taxonomía de MOTOR-DIRECTOR §8 se reutilizan tal cual,
y los de composición son **nuevos** y hay que sumarlos a §8.

### Método de medición por píxeles (una sola definición para toda la doc)

Se renderiza el still **dos veces, con el pipeline COMPLETO en las dos** (placa + `finish`), lo único
que cambia es que en la pasada `bg` se omiten las capas de sujeto:

- `full` = todas las capas + `finish`.
- `bg` = sólo `kind:'plate'` (+ scrims declarados) + `finish`. Flag del renderer: `drawDirectorFrame(ctx,t,video,{ only:'bg' })`.

Como el grano usa la **misma semilla** (`floor(t·30)`) y se dibuja último en las dos pasadas, se
cancela exactamente en los píxeles donde el fondo coincide: no ensucia el diff. La viñeta, en cambio,
sí queda incluida en las dos — **y debe estarlo**, porque oscurece el texto de los bordes y por lo
tanto afecta C6 de verdad (ver P4).

Se comparan por píxel, en el buffer de export (1080×1920), y se derivan **dos máscaras distintas** —
confundirlas es el error clásico que hace que C6 falle siempre:

```js
const dRGB = |Rf−Rb| + |Gf−Gb| + |Bf−Bb|              // 0..765
const dLum = |lum(full_p) − lum(bg_p)|                 // 0..1
mask.tinta(p)  = dRGB >= 12  || dLum > 0.01            // CUALQUIER contenido: sombras, halos, bordes AA,
                                                       // gradientes de objeto. Se usa para AIRE (C4),
                                                       // densidad (C8), superficie de acento (C7), peso (C2).
mask.glifo(p)  = dRGB >= 160                           // SÓLO el núcleo sólido del trazo (umbral verbatim de
                                                       // legibility-probe.mjs). Se usa para CONTRASTE (C6).
```

**Por qué dos umbrales**: un glifo antialiasado tiene, por construcción, un anillo de píxeles a mitad
de camino entre tinta y fondo. Si C6 midiera "el peor píxel de tinta", el peor sería siempre un píxel
de AA con contraste ~1.5:1 y **todo texto reprobaría**. `mask.glifo` (dRGB ≥ 160) descarta AA, sombras
y marcas de agua tenues; es exactamente lo que ya hace el probe en producción. Al revés: medir el aire
con el umbral 160 daría "aire 92%" en una escena llena de gradientes. Cada regla dice qué máscara usa.

### C1 · Jerarquía: exactamente 3 niveles, con saltos gruesos
- **Regla NORMATIVA (la que manda)**: máximo **3 clases de tamaño** de texto por escena, con
  `N1/N2 ≥ 1.8` y `N2/N3 ≥ 1.6`.
- **Rangos de referencia (pool de partida, NO normativos)**: **N1** 44–96px (peso 800–900) ·
  **N2** 20–34px (600–700) · **N3** 10–14px (400–600, tracking 3–7, alpha 0.45–0.75).
  ⚠️ Los rangos **no** garantizan los ratios por sí solos (N1=44 con N2=34 da 1.29, reprueba). El
  composer no elige tres tamaños sueltos de los rangos: **deriva en cascada desde N1**.
- **Algoritmo cerrado del composer** (esto es lo que hay que implementar, no "elegir bonito"):
```js
n1 = clamp(sizeDeseado, 44, 96)                 // el fit de texto puede bajarlo, nunca por debajo de 28 (P5)
n2 = clamp(Math.min(n1/1.8, 34), 20, 34);  if (n1/n2 < 1.8) n2 = Math.floor(n1/1.8)
n3 = clamp(Math.min(n2/1.6, 14), 10, 14);  if (n2/n3 < 1.6) n3 = Math.floor(n2/1.6)
if (n2 < 20 || n3 < 10) → NO hay 3 niveles posibles: la escena usa 2 clases (N1 + N3). Nunca se
                          "acomoda" un tamaño intermedio que rompa el ratio.
```
- **A ojo**: tapás la pantalla con la mano y la abrís 1 segundo — tiene que quedar clarísimo qué se
  lee primero. Si dudás entre dos textos, el ratio es chico.
- **Se mide**: tomar `size` de las capas `kind:'text'` visibles en `t`; **dos tamaños son la misma
  clase si `max/min < 1.15`** (agrupación por umbral sobre la lista ordenada descendente); luego
  `#clases ≤ 3` y los ratios entre clases consecutivas.
- **Falla** → `E-HIER` (blanda si algún ratio cae en [1.4, 1.8); dura si hay 4+ clases o algún ratio < 1.4).

### C2 · Punto focal único
- **Regla**: existe una capa `L*` cuyo **peso visual** es `≥ 2.0×` el de la segunda.
```js
// area_tinta(L): se renderiza el still con SÓLO esa capa encima del bg y se cuenta mask.tinta,
// normalizado 0..1 sobre los px del frame. OJO: ese render YA incluye el alpha de la capa en la
// intensidad del diff, pero mask.tinta es binaria -> el alpha NO está contado. Por eso se multiplica
// por alpha una sola vez (multiplicarlo dos veces era el bug de la v1 de esta doc).
bgLocal(L) = color medio (promedio RGB de la pasada `bg`) dentro del bbox de L
peso(L)    = area_tinta(L) * alpha(L) * Math.min(1, Math.abs(apcaLc(colorPrincipal(L), bgLocal(L))) / 60)
// colorPrincipal: para text = su color; para heroObj/photo = el color medio de sus px de tinta.
ratio = peso(1º) / Math.max(peso(2º), 1e-6)      // guarda: si sólo hay 1 capa con peso>0, ratio = ∞ -> OK
```
- **A ojo**: si dos cosas te tironean el ojo a la vez, no hay foco. El ojo debe entrar por un solo lado.
- **Se mide**: ranking de `peso` sobre las capas de sujeto (no cuentan `plate` ni scrims); `ratio ≥ 2.0`.
- **Falla** → `E-FOCUS`.

### C3 · Una idea por escena
- **Regla**: `≤ 12 palabras` de contenido visibles (no cuentan el kicker de ≤3 palabras ni la
  numeración tipo `01 / 03`), `≤ 3 bloques` de contenido (texto/objeto/foto/badge), `≤ 3 líneas` en N1.
- **A ojo**: si tenés que leer dos veces para entender la escena, sobra algo.
- **Se mide**: conteo desde el storyboard. **"Bloque de contenido"** = capa cuyo `kind ∈
  {text, heroObj, photo, badge, stepper, priceTag, logoRow}` (enum de `LAYER_KINDS` en `schema.js`
  menos `plate` y `shape`). **"Palabras"** = `text.trim().split(/\s+/).length` de las capas
  `kind:'text'` **excluyendo** `role ∈ {kicker, mark}`. Un `logoRow` o un `stepper` cuenta como **un**
  bloque, no como uno por celda.
- **Falla** → `E-IDEA`.

### C4 · Aire y márgenes
- **Regla**: `aire ≥ 35%` del frame (escena de respiro: `≥ 55%`). Ninguna caja de tinta sale de la
  zona segura. Separación mínima **entre bloques hermanos**: **24px** vertical, **18px** horizontal.
  Margen lateral mínimo del texto: **32px** (`0.08·W = 32.4`).
  **Excepción declarada**: dentro de un contenedor `bento` o `stepper`, el gutter interno vale
  **10px** (§4.1) — la separación de 24/18px se mide entre bloques de primer nivel, no entre celdas
  de la misma grilla. Sin esta excepción, todo bento reprobaría C4.
- **A ojo**: mirá los 4 bordes. Si algún texto "roza" el borde o dos bloques se tocan, falla.
- **Se mide**: `aire = 1 − (#px con mask.tinta / #px_total)` (máscara `tinta`, no `glifo`).
  Márgenes y gaps desde los bboxes de tinta de cada bloque.
- **Falla** → `E-SAFE-AREA` (bbox de texto fuera de la zona segura de texto, **dura**),
  `E-AIRE` (aire o gaps, blanda).
  ⚠️ **No** se usa `E-LAYER-OOB` acá: ese código ya está tomado por `schema.js`, que lo emite cuando
  la caja se sale del **lienzo** (tolerancia −0.06..1.06 para permitir full-bleed). Zona segura ≠
  lienzo; dos umbrales distintos no pueden compartir código de error.

### C5 · Alineación: máximo 2 ejes verticales
- **Regla**: cada capa se ancla a uno de **≤2 ejes** por escena (típico: `x=0.5` centro, o
  `x=0.10` eje izquierdo editorial). Tolerancia **±4px**. Prohibido "casi centrado".
- **A ojo**: imaginá una línea vertical por el borde de cada bloque; deben caer sobre 1 o 2 líneas, no 5.
- **Se mide** (algoritmo cerrado — clustering de enlace simple encadena y da falsos OK, así que se
  usa **líder fijo**):
```js
anclas = capas.map(L => L.align === 'center' ? (L.box[0]+L.box[2]/2)*W
                      : L.align === 'right'  ? (L.box[0]+L.box[2])*W
                      :                        L.box[0]*W)
anclas.sort((a,b) => a-b)
clusters = []                                   // líder = primer elemento del cluster, NO la media
for (const a of anclas) {
  const c = clusters.find(c => Math.abs(a - c.lider) <= 4)
  if (c) c.n++; else clusters.push({ lider: a, n: 1 })
}
// clusters.length <= 2
```
- **Falla** → `E-ALIGN`.

### C6 · Contraste (piso duro, heredado de los gates de urvid)
- **Regla** (WCAG **y** APCA, se exigen las dos; `apcaLc` y `contrast` se portan a
  `src/director/core/util.js` — ver la trampa de independencia de §0.1):

| Tipo de texto | WCAG mínimo | APCA (Lc absoluto) mínimo |
|---|---|---|
| Cuerpo `< 20px` | 4.5 | 60 |
| Sub/medio `20–40px`, peso ≥600 | 4.5 | 45 |
| Display `> 40px`, peso ≥800 | 3.0 | 30 |
| Texto sobre chip/placa de acento (`onAccent`) | 3.0 | 30 |

- El "size" de la fila es el `size` **lógico** (lienzo 405). En export ×2.6667 un N3 de 12px son 32px
  reales de 1080 — por eso los pisos APCA son más laxos que los de una web a distancia de lectura.
- **A ojo**: entrecerrá los ojos. Si una palabra "desaparece", falla. Ojo especial con texto sobre
  foto y con `dim` (alpha 0.45) sobre placa clara.
- **Se mide**, exactamente:
```js
// 1. sobre el frame FINAL (con finish: la viñeta oscurece hasta ~0.25 alpha en las esquinas y eso
//    ES parte del contraste real que ve el espectador — no se mide "antes del acabado").
// 2. sólo píxeles con mask.glifo (dRGB >= 160) DENTRO del bbox de la capa de texto.
// 3. par de colores por píxel: (full_p, bg_p) -> wcag(lum(full_p), lum(bg_p)) y apcaLc(hex(full_p), hex(bg_p)).
// 4. el PERCENTIL 1 manda, no el mínimo absoluto: un único píxel rebelde (esquina de glifo, borde de
//    grano) no puede reprobar una escena legible. p1 = valor bajo el cual cae el 1% peor de los px.
if (p1_wcag < pisoW(clase) || p1_apca < pisoLc(clase)) -> E-CONTRAST
// además se reporta %px_glifo bajo el piso; > 2% es señal de que el scrim está mal puesto, no ruido.
```
- **Falla** → `E-CONTRAST` (**dura** siempre).

### C7 · Restraint de color: UN acento
- **Regla**: **un solo** color de acento por video (`dna.palette.accent`). Superficie de acento
  `≤ 12%` del frame. Hues totales `≤ 2` (acento + a lo sumo `accent2` como neutro teñido) + neutros.
  `ΔH` dentro de un mismo gradiente `≤ 40°`.
  **Excepción**: placa de acento full-bleed intencional (`offer.flash`) → entonces **ninguna otra**
  capa de esa escena usa el acento, y es como máximo 1 escena por video.
- **A ojo**: contá los colores que no son blanco/negro/gris. Si son 3 o más, falla.
- **Se mide** (espacio **HSV** sobre sRGB, sin gamma; hue en grados 0..360 con wrap):
```js
// saturado(p): s >= 0.25 && v >= 0.12   (el segundo umbral evita que el ruido de un negro casi puro
//                                        genere hues fantasma: en v~0 el hue es basura numérica)
supAcento = #{p : saturado(p) && dHue(hue(p), hue(accent)) <= 20} / #px_total     // <= 0.12
// conteo de hues: bins de 30° (12 bins, con wrap). Un bin CUENTA sólo si concentra >= 0.5% del frame
// -> sin ese piso, el antialias de un borde de acento inventa 2-3 hues vecinos y todo reprueba.
hues = #{bin : share(bin) >= 0.005}                                              // <= 2
dHue(a,b) = min(|a-b|, 360-|a-b|)
```
  Las fotos (`kind:'photo'`) se **excluyen** del conteo de hues (una foto real trae los hues que trae;
  lo que se juzga es el color *dirigido*), pero **sí** cuentan para `supAcento` si la foto está teñida.
- **Falla** → `E-COLOR-EXCESO`. Severidad: acento `12–20%` ⇒ blanda (`B7`); acento `> 20%` **o**
  `hues ≥ 3` ⇒ **dura** (`D8`). Sin este segundo tramo, un frame con 40% de acento no tenía veredicto.

### C8 · Densidad de tinta y de texto
- **Regla**: tinta total `≤ 55%` del frame (`≤ 65%` si hay foto full-bleed); píxeles de **texto**
  `≤ 22%`. Longitud de línea: `≤ 26` caracteres en N1, `≤ 42` en N2.
- **A ojo**: si parece una diapositiva, falla.
- **Se mide**: tinta total con `mask.tinta` sobre el still completo. Densidad de texto = tercera
  pasada `only:'text'` (bg + sólo capas `kind:'text'`), contando `mask.glifo` — el núcleo sólido, no
  el halo AA; con `mask.tinta` el mismo texto mediría ~1.6× más y el umbral 22% no significaría nada.
- **Falla** → `E-DENSIDAD`. Severidad: texto `22–30%` ⇒ blanda (`B10`); texto `> 30%` **o** tinta
  total sobre el tope ⇒ **dura**.

### C9 · Cero colisiones, cero texto cortado
- **Regla**: solape de bboxes de tinta entre dos capas de texto = **0**. Texto sobre objeto/foto:
  solape permitido sólo si el objeto está en `z` menor **y** C6 se cumple sobre ese fondo.
  Ninguna palabra recortada por clip/máscara al final de su animación de entrada.
- **A ojo**: leé cada palabra completa. Si falta una letra o una palabra queda "detrás de", falla.
- **Se mide**: IoU de bboxes; telemetría de `text.js` (`fit` nunca desborda, `E-TXT-MIDWORD` si el
  corte cae dentro de palabra).
- **Falla** → `E-LAYER-COLLIDE`, `E-TXT-OVERFLOW`, `E-TXT-MIDWORD` (todas **duras**).

### C10 · Anclaje vertical: nada exactamente en el medio, siempre
- **Regla**: el centro vertical del bloque focal cae en una de **estas tres bandas semiabiertas, que
  cubren `[0.34, 0.70)` sin huecos ni solapes** (la v1 de esta doc dejaba `0.46` en dos bandas y
  `0.56–0.58` en ninguna: un focal en `y=0.57` no tenía banda y el gate tiraba excepción):

| id | rango | uso |
|---|---|---|
| `alta` | `y ∈ [0.34, 0.46)` | alto editorial |
| `centro` | `y ∈ [0.46, 0.57)` | centro |
| `baja` | `y ∈ [0.57, 0.70)` | bajo, para héroes con foto arriba |

  Fuera de `[0.34, 0.70)` sólo puede haber focal si la escena es `editorial-photo` full-bleed
  (el texto va en el tercio con scrim) — se declara con `look.banda='libre'`.
  En un video de N escenas, **como máximo `⌈N/2⌉`** usan la banda `centro`.
- **A ojo**: si todas las escenas del contact-sheet tienen el texto a la misma altura, falla.
- **Se mide**: `banda(y) = y < 0.46 ? 'alta' : y < 0.57 ? 'centro' : 'baja'`, con
  `y = box[1] + box[3]/2` del focal (el `L*` de C2). Histograma por video.
- **Falla** → `E-MONOTONIA` (blanda, se evalúa a nivel video, no still).

### C11 · Profundidad: 3 planos siempre presentes
- **Regla**: toda escena tiene (1) **atmósfera** (placa + halo + viñeta), (2) **sujeto** (el focal, con
  sombra de contacto si es un objeto), (3) **acabado** (grano + viñeta encima de todo).
  Prohibido el "objeto flotando sobre color plano sin sombra ni gradiente".
- **A ojo**: ¿el sujeto está *apoyado* en algo o *pegoteado* encima? Si no hay sombra ni cambio de
  luminancia del fondo, está pegoteado.
- **Se mide**, con los enums que **realmente existen** en `src/director/core/schema.js`:
  1. hay ≥1 capa `kind:'plate'` en la escena (`plate` **sí** está en `LAYER_KINDS`);
  2. el `finish` **no es una capa** y por lo tanto no se busca en el árbol: lo emite `render.js`
     después de la última capa, siempre, y no se puede desactivar por escena. Lo que se verifica es
     el resultado: en la pasada `bg`, `desvío estándar de lum > 0.01` (hay gradiente/halo, no color
     plano) **y** el campo de grano presente (comparar dos `t` del mismo frame ⇒ idéntico; de dos
     frames distintos ⇒ distinto);
  3. para cada `kind:'heroObj'`, que existan px de tinta **por debajo** del bbox del objeto
     (la sombra de contacto de `shadowUnder` cae fuera del path: banda de `0.072·lado` px bajo el
     borde inferior con `lum` menor que la del fondo local).
- **Falla** → `E-PLANO`.

### C12 · Una firma pequeña, no más
- **Regla**: **máximo 1** micro-detalle por escena (numeración `01/03`, `MMXXVI`, chip mono, línea de
  luz, anillo). No dos. No en las 4 esquinas.
- **A ojo**: contá los adornos que no son contenido. `>1` ⇒ falla.
- **Se mide** — ⚠️ **no existe** `role:'ornament'|'meta'`: `schema.js` valida `role` **sólo** para
  `kind:'text'` y su enum cerrado es
  `TEXT_ROLES = [kicker, title, subtitle, body, stat, statLabel, cta, mark, quote, step]`.
  La regla medible con el schema de HOY es:
```js
ornamentos = capas.filter(L =>
     (L.kind === 'text'  && L.role === 'mark')                    // firma tipográfica: 01/03, MMXXVI, chip mono
  || (L.kind === 'shape' && !L.matchKey && areaTinta(L) < 0.06)   // adorno gráfico: línea de luz, anillo, esquinas
).length                                                          // <= 1
// NO cuentan como ornamento: scrims y reglas estructurales, que son kind:'shape' pero se declaran
// con matchKey 'scrim'/'rule' (por eso el filtro exige !matchKey).
```
  Si más adelante el composer necesita distinguirlos de forma explícita, se agrega `role` a `shape`
  con enum `['ornament','scrim','connector','rule']` y se **bumpea `storyboard.v`** — hasta entonces,
  la fórmula de arriba es la definición operativa.
- **Falla** → `E-ORNAMENTO`.

---

## 2. LISTA NEGRA — lo que delata generación automática (S1–S18)

Cada ítem: **cómo se ve**, **por qué grita "IA"**, **antídoto implementable**.
El auditor cita `S<n>`; el composer los evita por construcción.

| # | El delator | Se ve así | Antídoto (implementable en `composer.js` / `kit/`) |
|---|---|---|---|
| **S1** | **Todo centrado, siempre** | cada escena con el bloque en `x=0.5, y=0.5` | Presupuesto de layout por video: `≤ 60%` de escenas con eje central; el resto usa eje izquierdo `x=0.10` o banda alta/baja (C10). El seed elige el reparto **antes** de componer, no escena por escena |
| **S2** | **Mismo esqueleto repetido** | 6 escenas = kicker arriba + título medio + CTA abajo | Regla dura: **nunca dos escenas de la misma familia de layout seguidas** (ya está en §4 del plan). Además, en `sheet-escenas` (§5.0), `≤ max(2, ⌊N/4⌋)` stills pueden compartir la clave de esqueleto de §5.4 |
| **S3** | **Gradiente arcoíris / multi-hue** | violeta→cyan→rosa de fondo | `ΔH ≤ 40°` dentro de un gradiente; rampa **por luminancia** del mismo hue. Todo gradiente de fondo se deriva de `dna.palette`, jamás de una constante bonita |
| **S4** | **Glow por todos lados** | halos alrededor de cada texto y cada icono | **Una** fuente de luz por video (§P2). Glow sólo sobre el focal, `alpha ≤ 0.18`, radio `≤ 0.35·H`. Cero glow en texto de cuerpo |
| **S5** | **Iconos genéricos y emojis** | cohete, bombilla, engranaje, ✅🚀🔥 | **Emoji prohibido** (regla de `ui-ux-pro-max` que sí adoptamos). Sólo objetos-héroe paramétricos del pool por rubro (`src/shared/objects.js`), con `hp[]` del seed variando proporciones |
| **S6** | **Texto que llena el frame** | 5 líneas de 3 tamaños distintos | C3 + C8: ≤12 palabras, texto `≤22%` de píxeles. Si el contenido no entra, se **parte en dos escenas**, nunca se achica la fuente por debajo del piso |
| **S7** | **Adornos simétricos tipo HUD** | esquinitas en las 4 esquinas + líneas decorativas + grilla punteada | C12: 1 ornamento por escena; el ornamento *de marca* (línea de luz / esquinas / puntos) aparece **sólo en apertura y cierre** del video |
| **S8** | **Sombras incoherentes** | drop-shadow en todo, cada una con distinta dirección | Vector de luz único: sombra siempre `offsetY > 0, offsetX = 0` (§P2). Sombra sólo bajo objetos elevados, nunca bajo texto (para texto se usa scrim, no sombra) |
| **S9** | **Datos falsos** | "+300% de ventas", testimonio inventado, countdown fake | Regla histórica del repo, es **dura**: una escena existe **sólo si su señal existe en el pagemodel** (`pruebas.stats`, `pruebas.testimonios`, `oferta.promo`). Sin señal ⇒ la escena no se genera. Jamás se inventa un número |
| **S10** | **Relleno genérico** | "Innovación · Calidad · Confianza", "El futuro es ahora" | Prohibido el pool de frases de relleno. Si `semantica.queHace` no da texto, la escena cae y el guion se acorta |
| **S11** | **Fondo animado en todas** | blobs/partículas/mesh derivando en cada escena | `≤ 1` escena con fondo activo por video; el resto lleva atmósfera **estática + grano** (§P4). El fondo nunca se mueve más de `3%` del frame por segundo |
| **S12** | **Tipografía monótona** | todo bold, todo mayúsculas, todo con tracking | 1 familia display + 1 de apoyo; `≤ 3` pesos por video; tracking sólo en N3 (kicker/mono, 3–7px) y en N1 sólo si `size ≥ 64` y ahí **negativo** (−1 a −3) |
| **S13** | **Glass gratuito** | panel blureado sobre un fondo plano | `glass` sólo si `dna.modernidad` lo incluye **y** hay contenido real detrás (foto o mesh). Sobre color plano, un panel translúcido es un rectángulo gris: se prohíbe |
| **S14** | **Simetría vertical exacta** | bloque perfectamente centrado en `y=0.5` en todas | C10: bandas y presupuesto por video |
| **S15** | **Todo entra a la vez** | en cualquier still hay 5 capas a medio camino (medio-fade) | En cualquier `t`, `≤ 2` capas en tránsito. Se logra con stagger ≥0.06s y ventanas escalonadas — se **verifica en still**, no sólo en video. **Definición de `progreso`** (sin ella el gate no es implementable): para la capa `L` con `life=[t0,t1]`, sea `E` la duración de su ventana de entrada (el `t` del último key de entrada − `t0`) y `S` la de salida; `progreso(L,t) = t < t0+E ? (t−t0)/E : t > t1−S ? 1−(t−(t1−S))/S : 1`. **En tránsito** ⇔ `0.05 < progreso < 0.95`. Si `E=0` (corte seco) la capa nunca está en tránsito |
| **S16** | **Bleed accidental** | un objeto cortado por el borde sin intención | Todo lo que sangra debe salir `≥ 20%` **de su propia dimensión en ese eje** fuera del frame (no 20% del frame). Formal: para el borde derecho, `overflow = (box.x+box.w−1)/box.w`; sangra bien si `overflow ≥ 0.20`, es accidente si `0.01 ≤ overflow < 0.20`. Idem para los 4 bordes, con su eje |
| **S17** | **Bento genérico** | 6 celdas iguales con iconito y dos líneas | Bento con jerarquía: `≤ 4` celdas, **1 celda dominante** de área `≥ 2×` la menor, gutter uniforme, sólo la dominante lleva objeto |
| **S18** | **Paleta que ignora la marca** | degradé violeta/azul "de IA" en un sitio verde | El acento SIEMPRE es `dna.palette.accent` de la página capturada. Las placas (`noir/carbon/tinta/crema`) son neutras; sólo `tinta` se tiñe, y con el **hue de la marca** |

---

## 3. QUÉ HACE QUE SE VEA "PREMIUM" (P1–P9) — con el cómo en canvas 2D

La vara es `public/demo-nova.js` (dirigida a mano) generalizada en
`src/urvid/libs/scenes/premium.js`. Los números de abajo están **ya calibrados** a 405×720.

### P1 · Profundidad = 3 planos, siempre en este orden
```
1. atmósfera : plate(ctx,t,accent,lk)      → gradiente vertical + halo radial que respira
2. sujeto    : capas ordenadas por z        → objeto/foto/texto (con sombra de contacto)
3. acabado   : finish(ctx,t,lk)             → grano + viñeta ENCIMA DE TODO
```
El acabado va **último, sin excepción**: el grano encima del sujeto es lo que funde los planos.
Un objeto sin sombra de contacto se lee como sticker (S8/C11).

### P2 · Una sola luz coherente
Vector de luz fijo del video: **desde arriba, levemente al frente**. Consecuencias mecánicas:
- **Sombra de contacto**: `shadowColor='rgba(0,0,0,0.8)'`, `shadowOffsetX = 0`.
  Lo que hay hoy en `src/shared/objects.js` es **constante**: `shadowBlur = 30`, `shadowOffsetY = 15`,
  calibrado para el ancho nominal del pool (los dibujantes miden `CW = 220 + hp[0]·40` ⇒ 220–260px).
  **No se toca**: urvid depende de que ese archivo quede byte-idéntico (gate `urvid1-test`).
  La forma **proporcional**, que es la que usa `kit/fx.js` cuando el director dibuja algo a otra
  escala, es `blur = 0.14·ladoMayor`, `offsetY = 0.072·ladoMayor`
  (verificado en `public/demo-nova.js`: tarjeta de 640px → blur 90, offsetY 46 ⇒ 0.1406 y 0.0719;
  y contra objects.js: 30/220 = 0.136, 15/220 = 0.068. Se adopta el par de nova, que es la pieza
  dirigida a mano; la diferencia con 0.068 es menor a 1px a tamaño de pool).
  > ⚠️ **Gotcha de canvas 2D, verificado en `@napi-rs/canvas` y por spec**: `shadowBlur`,
  > `shadowOffsetX/Y` **NO se transforman con la CTM**. Si dibujás un héroe dentro de un
  > `ctx.scale(s,s)`, la sombra sale en px de salida y a `s=2` queda a la mitad de lo que
  > corresponde. Por eso el valor se **calcula desde el lado ya escalado** y se setea fuera del
  > `scale`, o se compensa: `shadowBlur = 0.14·lado·s`, `shadowOffsetY = 0.072·lado·s`.
- **Canto de luz (rim)**: stroke con gradiente **lineal vertical** sobre el path del objeto:
  `0 → rgba(255,255,255,0.35)` · `0.25–0.30 → 0.06–0.07` · `1 → rgba(255,255,255,0.02)`;
  `lineWidth = 1`, path desplazado 0.5px hacia adentro para que el stroke caiga en el píxel.
  (nova usa la parada en 0.25/0.07 y `objects.js` en 0.30/0.06 — ambos válidos, es el rango.)
- **Halo de estudio** (en la placa): radial de radio `0.62·H` desde `(0.5·W, 0.46·H)` con
  `r0 = 0`, paradas `0 → rgba(accent, a)`, `0.55 → rgba(120,130,120,0.03)` (claro:
  `rgba(255,255,255,0.05)`), `1 → transparente`, con
  `a = (lk.dark ? 0.05 : 0.10) + 0.015·sin(0.7·t)` — respira sin llamar la atención (período
  `2π/0.7 ≈ 8.98s`). Determinista y seek-safe: depende sólo de `t`, sin estado.

### P3 · Materialidad: 4 capas por objeto, nunca un color plano
```js
// contrato REAL de src/shared/objects.js (verbatim): fn(ctx, t, sw, accent, fonts, brand, hp[, env])
// centrado en (0,0), ~240px de ancho lógico. sw = fase 0..1 del barrido. hp = [a,b,c] del seed.
// Las 4 deps del entorno se INYECTAN: createHeroObjects({ drawText, lighten, darken, rgba }).
1) sombra de contacto : shadowUnder(ctx, () => { path(); fill('#0c0d11') })
2) cuerpo             : createLinearGradient(0, y, 0, y+h) con 3 paradas
                        0 → '#2a2d36' (claro arriba) · 0.45 → '#181a20' · 1 → '#0e0f13'
3) canto de luz       : stroke rim (P2)
4) micro-textura      : 26 líneas HORIZONTALES de 1px, clipeadas al path, repartidas uniformemente
                        sobre el alto del objeto (paso = h/26), alternando #fff (pares) y #000
                        (impares) a globalAlpha 0.05. Determinista: sin PRNG, la posición i-ésima
                        es y + (i+0.5)*h/26. Va DESPUÉS del rim y ANTES del detalle de color.
```
La nota de color va en **un solo detalle** del objeto (el chip, el anillo, una barra): nunca en el cuerpo.

### P4 · Grano + viñeta (`finish`) — el sello de "no es un PowerPoint"
```js
// W, H son las constantes del lienzo lógico (405, 720) importadas de core/schema.js -> CANVAS.
// k = lk.dark ? 1 : 0.7   (0.05 de alpha en placa oscura, 0.035 en clara). Es el ÚNICO uso de k.
function finish(ctx, t, lk, k = lk.dark ? 1 : 0.7) {
  const r = mulberry32((1234 + Math.floor(t * 30)) >>> 0)   // seed = FRAME, no contador → seek-safe
  ctx.save(); ctx.globalAlpha = 0.05 * k
  ctx.fillStyle = lk.dark ? '#ffffff' : '#000000'
  for (let i = 0; i < 160; i++) ctx.fillRect(r() * W, r() * H, 1, 1)   // 160/291600 = 0.055% de cobertura
  ctx.restore()
  const v = ctx.createRadialGradient(W/2, H/2, H*0.36, W/2, H/2, H*0.78)
  v.addColorStop(0, 'rgba(0,0,0,0)')
  v.addColorStop(1, lk.dark ? 'rgba(0,0,0,0.5)' : 'rgba(60,50,40,0.22)')  // viñeta cálida en claro
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H)
}
```
**Clave de determinismo**: la semilla del grano es `floor(t·fps)`, **no** un contador de frames.
Un seek a `t` arbitrario reproduce exactamente el mismo campo de grano (gate de seek-en-frío).

**La parada `0.5` NO es el alpha de la esquina** — dato que hay que tener a mano al medir C6 y al
tentarse de "subir la viñeta": el gradiente llega a `0.5` recién a `r = 0.78·H = 561.6px`, y la
esquina del frame está a `√(202.5² + 360²) = 413px` del centro. Interpolación lineal:
`(413 − 259.2)/(561.6 − 259.2) = 0.509` ⇒ **alpha real en la esquina ≈ 0.25** (oscura) y `0.11`
(clara); en el medio del borde inferior (360px) es `0.17`. La viñeta efectiva es la mitad de lo que
sugiere el número. Ese 0.25 igual **sí** entra en la medición de contraste (C6 se mide post-`finish`).

### P5 · Tipografía dominante
Una decisión tipográfica manda por escena. `N1` a `fitFont(...)` con **pisos duros por nivel** — si el
texto no entra al piso, **se parte la escena en dos**, jamás se achica más:
`N1 ≥ 28px` · `N2 ≥ 13px` · `N3 ≥ 10px`. (Los pisos son menores que los mínimos de los rangos de C1
a propósito: el rango es de dónde arranca el composer, el piso es hasta dónde puede bajar el fit
antes de rendirse. Un N1 de 30px sigue siendo N1 mientras se cumplan los ratios de C1.)
Par de familias: **display** (800–900) + **mono/accent** para N3. Máximo 3 pesos por video. En N1 con
`size ≥ 64`, tracking negativo −1..−3. Interlineado: display `1.05–1.15`, cuerpo `1.35–1.50`.

### P6 · Silencio visual
**Al menos 1 escena de respiro por video** (aire ≥55%, 1 solo elemento, duración ≥1.2s). Es el ítem
que más separa "hecho a mano" de "generado": la IA nunca deja espacio vacío a propósito.
En la referencia del género (KINETIC-IA §1) el respiro dura ~2s y es un solo punto.

### P7 · Acento único y eléctrico
Un color, usado tres veces como mucho en todo el video y siempre en el mismo *rol semántico*
(p.ej. "la palabra que remata" + "el detalle del objeto" + "el CTA"). En NOVA es el lima `#c8ff4d`
sobre noir; en el motor es `dna.palette.accent`. Superficie `≤12%` (C7).

### P8 · Barrido especular (el gesto caro)
Firma real (`src/shared/objects.js`, verbatim): `specSweep(ctx, clipFn, sw, wBand, hSpan, alpha = 0.17)`
— `wBand` **no tiene default**; el valor típico que pasan los dibujantes es 46 (tarjeta), 24–40 en
objetos angostos. `hSpan` = ancho del objeto.
```js
function specSweep(ctx, clipFn, sw, wBand, hSpan, alpha = 0.17) {
  ctx.save(); clipFn(); ctx.clip()                       // clip al path del objeto
  const sx = lerp(-hSpan, hSpan, sw)                     // sw: fase 0..1 -> la banda cruza el objeto
  const g = ctx.createLinearGradient(sx - wBand, 0, sx + wBand, 0)
  g.addColorStop(0, 'rgba(255,255,255,0)')
  g.addColorStop(0.5, `rgba(255,255,255,${alpha})`)
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.save(); ctx.rotate(-0.32)                          // banda inclinada ~18.3°
  ctx.fillStyle = g; ctx.fillRect(-hSpan*2, -hSpan*2, hSpan*4, hSpan*4)
  ctx.restore(); ctx.restore()
}
// la FASE la calcula el llamador desde el tiempo local de la capa (lt = t - life[0]), no specSweep:
const sw = clamp((lt - 0.9) / (2.1 - 0.9), 0, 1)         // = win(lt, 0.9, 2.1) en nova/premium
```
Es decir: el barrido **empieza a los 0.9s de vida de la capa y dura 1.2s**, en rampa lineal
(el gesto es tan rápido que un ease no se percibe; se deja lineal a propósito para que sea
reproducible a ojo). Fuera de esa ventana `sw` queda clampeado en 0 o 1 y la banda está fuera del
clip ⇒ invisible. **Una vez por escena.** Dos barridos en la misma escena = S4.

### P9 · Micro-detalle honesto
Una firma chica por escena: numeración `01 / 03` (mono, tracking 4, alpha 0.45), año `MMXXVI`,
kicker de sección. Da la sensación de "sistema" — pero **una sola** (C12), y nunca inventa información.

---

## 4. MODERNIDAD 2026 — las 6 familias y cuándo se usa cada una

`dna.modernidad` es un array (§2 del plan). El composer **sesga** el catálogo con él; si viene vacío,
el default es `editorial` (bigtype + placa noir), que nunca se ve viejo.

### 4.1 `bento`
- **Qué es**: grilla asimétrica de celdas redondeadas con jerarquía interna.
- **Cuándo**: `dna.modernidad` incluye `bento` **y** `semantica.features.length ≥ 3`.
  ⚠️ MOTOR-DIRECTOR §4 habilita `features.bento` con **≥2** features. Acá se **estrecha a ≥3** a
  propósito: con 2 celdas no hay grilla, hay dos cajas — y la celda dominante `≥2×` no se distingue.
  Con exactamente 2 features la escena válida es `rafaga.beat`, no bento. Si algún día se relaja,
  que se relaje en los dos docs a la vez.
- **Parámetros**: `≤4` celdas · gutter **10px** · radius **14–20** · celda dominante con área `≥2×`
  la menor · fondo de celda = placa ±4% de luminancia · borde hairline `rgba(ink,0.10)` de 1px ·
  sólo la dominante lleva objeto-héroe; el resto, texto N2 + N3.
- **Relación con C4**: el gutter de 10px es la excepción declarada de C4 (separación interna de
  grilla), no una violación. Los 24/18px de C4 se miden entre el bento y los otros bloques de la escena.
- **Error típico**: 6 celdas iguales con iconito (S17).

### 4.2 `glass`
- **Qué es**: panel translúcido con el fondo desenfocado detrás.
- **Cuándo**: `dna.modernidad` incluye `glass` **y** la escena tiene foto o mesh detrás. Nunca sobre plano (S13).
- **Cómo en canvas 2D**. No hay `backdrop-filter`. Sobre `ctx.filter`: **la razón que daba la v1 de
  esta doc era falsa** — `ctx.filter='blur(4px)'` **sí** existe en `@napi-rs/canvas` (el runtime Node
  de nuestros gates; verificado: la propiedad acepta y conserva el valor). El motivo real para no
  usarlo es otro y sigue siendo válido: **la implementación del blur difiere entre Skia (Node) y el
  Canvas del browser**, y el export corre en el browser mientras la medición corre en Node ⇒ los
  stills del gate no serían los píxeles del mp4. Por eso el blur es **nuestro**, y es aritmética
  explícita, no un filtro del runtime:
```js
// Box blur separable de 3 pasadas ≈ gaussiano. Puro, entero, IDÉNTICO en Node y browser
// (sólo suma y divide enteros; no depende del sampler del runtime como sí depende un downscale).
// r = radio en px de salida. Trabaja sobre ImageData, no sobre canvases auxiliares.
function blurRegion(ctx, x, y, w, h, r = 6) {
  const img = ctx.getImageData(x, y, w, h)                 // 1 sola lectura
  for (let pass = 0; pass < 3; pass++) { boxH(img, r); boxV(img, r) }
  ctx.putImageData(img, x, y)
}
// boxH/boxV: ventana deslizante de ancho 2r+1 con acumulador por canal y clamp en los bordes.
// Costo: O(w·h) por pasada, independiente de r. A 405×720 en la región de un panel: ~1ms.
```
  > **Por qué NO el truco de downscale+upscale** (que proponía la v1): necesita un canvas auxiliar, y
  > crearlo implica `document.createElement('canvas')` (**DOM — prohibido en el motor**) u
  > `OffscreenCanvas` (**no existe en Node**: verificado, `typeof OffscreenCanvas === 'undefined'` con
  > `@napi-rs/canvas`). Además el remuestreo bilineal/mipmap es exactamente la parte que difiere entre
  > runtimes. Si aun así se quisiera un buffer, tendría que entrar **inyectado** (`env.makeCanvas`),
  > nunca creado por el kit. El box blur de arriba no necesita nada de eso.
```js
// luego: fill rgba(255,255,255,0.10) + stroke 1px rgba(255,255,255,0.28) + rim P2 en el borde superior
```
- **Piso de legibilidad**: el panel debe subir el contraste, no bajarlo → tras el blur, `fill` de
  `rgba(0,0,0,0.28)` (placa oscura) o `rgba(255,255,255,0.72)` (clara) **antes** del texto. C6 se mide igual.

### 4.3 `bigtype` (editorial)
- **Qué es**: la tipografía **es** la imagen. 1–3 palabras por línea a 64–120px.
- **Cuándo**: `bigtype` en `modernidad`, o `semantica.queHace` fuerte y sin imágenes usables. Es el default.
- **Parámetros**: eje izquierdo `x=0.10` (o centro, alternando por video) · `≤3` líneas · tracking −1..−3 ·
  **una** palabra en acento (la que remata) · interlineado 1.05–1.12 · nada más en el frame salvo un
  kicker N3 y el ornamento de apertura si corresponde.

### 4.4 `brutalist`
- **Qué es**: crudo, sin suavizado. Sin radius, sin sombra difusa, colores planos.
- **Cuándo**: `brutalist` en `modernidad`, o `mood.formalidad ≤ 0.3` + `energia ≥ 0.7`.
- **Parámetros**: `radius = 0` · bordes sólidos 2–3px · **offset shadow duro**
  (`fillRect` desplazado +6/+6 en negro puro, `shadowBlur = 0`) · grotesk/mono en mayúsculas ·
  grilla visible (líneas de 1px `rgba(ink,0.12)`) permitida — es la **única** familia donde la grilla
  visible no es S7 · prohibido gradiente en el cuerpo (contradice P3: en brutalist, el color plano
  ES la materialidad).

### 4.5 `gradient-mesh`
- **Qué es**: 2–4 blobs radiales de colores cercanos que derivan lento.
- **Cuándo**: `gradient-mesh` en `modernidad` **y** como máximo en 1 escena del video (S11).
- **Parámetros**: `2–4` blobs · `ΔH ≤ 40°` entre ellos · deriva `≤ 3%` del frame por segundo
  (`≤ 0.03·W = 12.15px/s` en x, `≤ 0.03·H = 21.6px/s` en y, medido sobre el centro de cada blob) ·
  **clamp de luminancia** obligatorio para no romper C6.
  `L` acá es la **luminancia relativa WCAG** de §0.1 (`lum(r,g,b)`, 0..1), **no** la `L` de HSL ni la
  de Lab — con HSL los rangos de abajo darían fondos completamente distintos:
  en placa oscura `L ∈ [0.06, 0.22]`, en clara `L ∈ [0.78, 0.94]`
  (patrón ya probado en `src/kinetic/libs/backgrounds.js`). El clamp se aplica al color **resuelto de
  cada blob antes de dibujarlo**, no al resultado compuesto.

### 4.6 `editorial-photo`
- **Qué es**: foto real de la página, full-bleed, con la tipografía encima.
- **Cuándo**: `editorial-photo` en `modernidad` o `assets.images` con una imagen `kind:'producto'|'ambiente'` de rank alto.
- **Parámetros**: foto cubre el frame con `cover` (nunca deformada) · **scrim obligatorio**:
  gradiente vertical `rgba(0,0,0,0) → rgba(0,0,0,0.65)` en el tercio donde va el texto ·
  el grano de `finish` va **encima de la foto** (es lo que la integra con el resto del video) ·
  parallax de escala 1.06→1.00 como máximo.

---

## 5. VEREDICTO DEL AUDITOR VISUAL

El auditor recibe: (a) el still PNG, (b) el `storyboard.json` de esa escena, (c) las métricas
computadas. Devuelve **un** veredicto por still y **uno** por video.

### 5.0 Los dos contact-sheets (no son el mismo, y la v1 de esta doc los mezclaba)

MOTOR-DIRECTOR §8.7 pide "grillas de 12 **por link**". Esa grilla son 12 muestras de `t` **dentro de
una transición** — sirven para S15, frame vacío y salto de objeto, y son casi idénticas entre sí: no
tiene ningún sentido pedirles variedad de esqueleto. Las reglas de composición se juzgan en el otro
sheet. Quedan así, con nombre propio:

| Sheet | Qué contiene | Qué reglas se evalúan ahí |
|---|---|---|
| **`sheet-escenas`** | **1 still por escena**, tomado en `t = inicio + 0.72·dur` (el hold tardío, con el texto ya revelado — mismo criterio que `legibility-probe.mjs`). Son **N** stills, N = cantidad de escenas (típico 6–10), **no 12** | C1–C9, C11, C12 y todo §5.3 (veredicto por still). Y sobre el conjunto: C10, S1, S2, P6 |
| **`sheet-link`** | 12 muestras equiespaciadas de un link `A→B`, `t ∈ [tA_fin − 0.1, tB_inicio + 0.1]` | S15 (≤2 en tránsito), `E-EMPTY-FRAME`, `E-OBJ-JUMP`, C6 en cada una de las 12 |

Todos los umbrales "por video" de §5.4 se expresan como **fracción de N**, nunca como "10 de 12".

### 5.0.1 Códigos de error — extensión de la taxonomía de MOTOR-DIRECTOR §8

§8 del plan define la taxonomía tipada del motor. Esta doc **agrega** los códigos de composición.
Todos ellos son nuevos y deben sumarse a la lista de §8 antes de que el primer gate los emita
(si no, `director-loop.mjs` los agrupa como desconocidos):

| Código nuevo | Regla | Severidad |
|---|---|---|
| `E-HIER` | C1 | blanda / dura (4+ clases o ratio <1.4) |
| `E-FOCUS` | C2 | blanda (`B1`) |
| `E-IDEA` | C3 | dura |
| `E-AIRE` | C4 (aire y gaps) | blanda (`B2`) |
| `E-SAFE-AREA` | C4 (zona segura) / `D3` | **dura** |
| `E-ALIGN` | C5 | blanda (`B3`) |
| `E-COLOR-EXCESO` | C7 | blanda 12–20% / dura >20% o 3+ hues |
| `E-DENSIDAD` | C8 | blanda 22–30% / dura >30% |
| `E-PLANO` | C11 | blanda (`B5`) |
| `E-ORNAMENTO` | C12 | blanda (`B6`) |
| `E-MONOTONIA` | C10 / S2 (nivel video) | blanda |
| `E-DATO-FALSO` | S9 / `D6` | **dura** |
| `E-EMOJI` | S5 / `D7` | **dura** |
| `E-BLEED` | S16 | blanda (`B9`) |
| `E-TRANSITO` | S15 | blanda (`B8`) |

Se **reutilizan** (mismo significado que en §8, no se redefinen): `E-CONTRAST` (C6/`D1`),
`E-TXT-OVERFLOW` y `E-TXT-MIDWORD` (C9/`D2`), `E-LAYER-COLLIDE` (C9/`D4`),
`E-EMPTY-FRAME` (`D5`), `E-LAYER-OOB` (fuera del **lienzo**, lo emite `schema.js`).

### 5.1 Faltas DURAS (una sola ⇒ `RECHAZADO`)

| ID | Falta | Umbral |
|---|---|---|
| `D1` | Contraste roto (`C6`) | cualquier glifo bajo el piso WCAG/APCA de su clase |
| `D2` | Texto cortado / desbordado / cortado a mitad de palabra | `E-TXT-OVERFLOW` / `E-TXT-MIDWORD` ≥1 |
| `D3` | Capa crítica fuera de zona segura | bbox de texto fuera de `[0.08,0.90]×[0.06,0.84]` |
| `D4` | Colisión de texto | IoU > 0 entre dos bboxes de texto |
| `D5` | Frame vacío o casi | `tinta < 4%` del frame en un `t` que no es corte declarado (`E-EMPTY-FRAME`) |
| `D6` | Dato inventado (`S9`) | cualquier número/testimonio sin origen en el pagemodel. **Medible**: todo string de una capa de texto con `role ∈ {stat, statLabel, quote}` debe aparecer (normalizado: minúsculas, sin espacios ni símbolos) como substring de un valor de `semantica.pruebas` / `semantica.oferta` del pagemodel. Si no aparece ⇒ `E-DATO-FALSO`. No es un juicio del auditor: es un `includes()` |
| `D7` | Emoji o icono genérico como contenido (`S5`) | ≥1. **Medible**: `/\p{Extended_Pictographic}/u.test(text)` sobre toda capa de texto ⇒ `E-EMOJI`. (Los objetos-héroe son paramétricos y no pasan por texto, así que el test alcanza) |
| `D8` | 4+ clases de tamaño (`C1`), o ratio de jerarquía < 1.4, o 3+ hues saturados o acento > 20% (`C7`), o texto > 30% (`C8`) | — |

### 5.2 Faltas BLANDAS (penalizan puntaje)

| ID | Falta | Penalización |
|---|---|---|
| `B1` | Sin punto focal claro (`C2`, ratio < 2.0) | −20 |
| `B2` | Aire < 35% (`C4`) | −15 |
| `B3` | >2 ejes de alineación (`C5`) | −15 |
| `B4` | Ratio de jerarquía 1.4–1.8 (`C1`) | −10 |
| `B5` | Sujeto sin sombra/gradiente (`C11`, `S8`) | −10 |
| `B6` | >1 ornamento (`C12`, `S7`) | −10 |
| `B7` | Acento entre 12% y 20% del frame (`C7`) | −10 |
| `B8` | >2 capas en tránsito en el mismo `t` (`S15`) | −8 |
| `B9` | Bleed accidental 1–19% (`S16`) | −8 |
| `B10` | Densidad de texto 22–30% (`C8`) | −8 |

### 5.3 Fórmula del veredicto — por STILL

```
score = 100 − Σ(penalizaciones blandas)          // cada blanda cuenta UNA vez por still,
                                                  // aunque la regla se viole en 3 capas distintas

RECHAZADO   si  ≥1 falta dura        O  score < 60
A-AJUSTAR   si  0 duras  y  60 ≤ score < 85
APROBADO    si  0 duras  y  score ≥ 85
```
(El "máximo 1 blanda" de la v1 era redundante: la penalización más chica es −8, así que dos blandas
ya dan ≤84. Se elimina para no tener dos criterios que puedan divergir si mañana se agrega una −5.)

### 5.4 Fórmula del veredicto — por VIDEO (sobre `sheet-escenas`, N stills)

`N` = cantidad de escenas del video. Primero las pruebas de conjunto:

| Prueba | Umbral | Falla ⇒ |
|---|---|---|
| **Monotonía de esqueleto** (`S2`) | `≤ max(2, ⌊N/4⌋)` stills comparten esqueleto. **Esqueleto** = la clave exacta `` `${nBloques}|${banda}|${nEjes}:${ejePrincipal.toFixed(2)}` `` (nBloques de C3, banda de C10, eje de C5) | A-AJUSTAR |
| **Reparto de bandas** (`C10`) | `≤ ⌈N/2⌉` escenas en la banda `centro` | A-AJUSTAR |
| **Presupuesto de eje** (`S1`) | `≤ 0.6·N` escenas con eje central (`|eje − 0.5·W| ≤ 4px`) | A-AJUSTAR |
| **Respiro** (`P6`) | `≥1` escena con aire ≥55%, 1 solo bloque y `dur ≥ 1.2s` | A-AJUSTAR |
| **Fondo animado** (`S11`) | `≤1` escena con `gradient-mesh` u otro fondo en movimiento | A-AJUSTAR |
| **Coherencia de look** | 1 sola placa, 1 solo acento, ≤3 pesos tipográficos, ≤2 familias en todo el video | RECHAZADO |
| **Prueba del vecino** (anti-fábrica) | dos seeds del mismo pagemodel difieren en `≥3` de estos 6 ejes: placa · objeto héroe dominante · (eje, banda) del focal de la escena 1 · `case` · tipo de ornamento · gramática elegida. Se compara el **vector de 6 strings** de cada video; difieren = distinto string | A-AJUSTAR |

Y el veredicto del video, explícito (la v1 lo dejaba implícito y no era computable):

```
RECHAZADO   si  ≥1 still RECHAZADO
            O   falla Coherencia de look
            O   #APROBADO / N < 0.80
A-AJUSTAR   si  no RECHAZADO  y  (falla ≥1 prueba de conjunto  O  #APROBADO / N < 1.0)
APROBADO    si  todos los stills APROBADO  y  0 pruebas de conjunto falladas
```
(El `≥ 10 de 12` de la v1 es exactamente el 0.80 de arriba, pero expresado sobre N.)

### 5.5 Prueba de los 3 segundos (para el auditor humano)
Mirá el still 3 segundos y contestá: **(1)** ¿qué se lee primero? **(2)** ¿de qué se trata?
**(3)** ¿qué sobra? Si la (1) tiene dos respuestas → `B1`. Si la (2) no tiene respuesta → `C3`.
Si la (3) tiene respuesta → sacálo y volvé a medir.

### 5.6 Formato de reporte (lo que el auditor devuelve)
```
still: sc3@2.10s   veredicto: A-AJUSTAR   score: 72
  B1  focal 1.4x el segundo (título vs objeto compiten)   → bajar objeto a 0.85 de escala
  B6  2 ornamentos (línea de luz + anillo)                → dejar sólo el anillo (C12)
  nota S14: 3ª escena consecutiva anclada en y=0.50
```

---

## 6. QUÉ NO APLICA A NOSOTROS (y por qué)

Honestidad primero: la skill de origen está escrita para **UI interactiva** en DOM / Compose / SwiftUI.
Buena parte de su superficie **no existe** en un mp4 vertical renderizado por `drawFrame(ctx,t)`.

### 6.1 Descartado por completo

| De la skill | Por qué no aplica |
|---|---|
| Estados `hover / focus / active / disabled`, `cursor-pointer`, focus rings, touch targets 44px | No hay puntero, ni foco, ni tap. Nuestra salida es un video: el espectador no interactúa |
| `AnimatePresence`, greps de `initial=`/`exit=`, "conditional renders" | Son del ciclo de vida del DOM/React. Nuestro equivalente es la **`life: [t0,t1]`** de la capa en la timeline: entrada y salida son keyframes, no un runtime que monta/desmonta |
| ARIA, `aria-hidden`, alt text, semántica HTML, lectores de pantalla | No hay árbol accesible en un canvas exportado a video |
| Breakpoints 375/768/1024/1440, responsive, `max-width`, scroll horizontal | Nuestro lienzo es **fijo 405×720 → 1080×1920**. No hay reflow. Lo que sí heredamos es el concepto de *safe area*, pero por la UI de las redes, no por el viewport |
| `will-change`, capas GPU, layout thrashing, "no animes width/height" | Son restricciones del compositor del navegador. En canvas 2D **no hay reflow**: animar `w/h` cuesta exactamente lo mismo que animar `x/y`, y de hecho `w,h` son props de primera clase de nuestra timeline (§6 del plan) |
| Bundle size, tamaño de Lottie/Rive/GSAP, `source-map-explorer` | El motor no importa librerías de animación (regla de independencia). El costo es 0 por definición |
| DPR / `devicePixelRatio` / `ResizeObserver` (de `canvas-generative`) | Renderizamos a resolución fija de export, no a un canvas en pantalla que hay que mantener nítido |
| `requestAnimationFrame`, `setTimeout`, loop con `dt`, pool de partículas mutable, double-buffer con "trail fade" | **Prohibidos en el motor**: `drawFrame(ctx,t)` es puro, sin estado entre frames y seek-safe. Un `dt` acumulado o un trail dependiente del frame anterior rompe determinismo y seek en frío. Cualquier "estela" se calcula analíticamente desde `t` (N copias con alpha decreciente), no acumulando |
| `prefers-reduced-motion` | No hay media query en un archivo mp4 |
| Three.js / R3F / shaders / AGSL / Metal / Liquid Glass | Sin GPU en el camino crítico. `glass` se emula (§4.2) |
| El CLI Python de `ui-ux-pro-max`, `MASTER.md`, el brainstorm interactivo de `/paint` (5 dominios, "una pregunta a la vez") | No hay humano en el loop en tiempo de generación. Nuestro "brainstorm" ya ocurrió: **es el `pagemodel`** (DNA + semántica extraídos de la página real). Lo que la skill obtiene preguntando, nosotros lo obtenemos midiendo |

### 6.2 Adaptado (la idea sirve, la implementación cambia)

| Idea de la skill | Nuestra traducción |
|---|---|
| "Rechazá el slop genérico: nada de rainbow gradients ni glassmorphism gratuito" (Iron Rule 3 de `cast`) | §2 completo, con umbrales medibles |
| Contraste 4.5:1 verificado en DevTools | `C6`, medido por píxel de glifo contra el fondo real, con WCAG **y** APCA (`core/util.js`), en Node, sin browser |
| "El texto animado debe ser legible en cada frame, también a mitad de transición" | C6 se evalúa en **12 puntos por link**, no sólo en el frame de reposo |
| Consistencia: "3–5 duraciones y 3–5 easings como máximo en todo el sistema" | Se traduce a: `≤3` pesos tipográficos, `≤2` familias, 1 placa y 1 acento por video (§5.4 coherencia de look). La parte de duraciones/easings vive en `MOTION-PRINCIPLES.md`, no acá |
| "Sin emojis como iconos, iconos de un set consistente, logos correctos" | `S5` — y el "set consistente" es nuestro pool de objetos-héroe paramétricos |
| Line-length 65–75 caracteres (web) | En 9:16 no aplica: `≤26` caracteres en display, `≤42` en cuerpo (`C8`) |
| "Reduced motion" / seguridad del movimiento | Se traduce a la única regla de seguridad que sí aplica a video: **máximo 3 destellos por segundo** (WCAG 2.3.1). Nuestro `flash-cut` dura 2 frames y hay **como máximo 1 por video** (§5 del plan) |
| Motion Gap Analysis por grep del código | Se traduce a los gates de stills/links (`director-storyboard-check`, `director-linker-check`): no buscamos animaciones faltantes en el código, medimos el resultado renderizado |

---

## 7. PSEUDOCÓDIGO DEL MEDIDOR (lo que implementa `director-storyboard-check.mjs`)

Todo lo anterior colapsa en una sola función. Si el ejecutor escribe esto, tiene los gates de
composición completos; ninguna regla de §1 queda a interpretación.

```js
import { createCanvas, GlobalFonts } from '@napi-rs/canvas'   // sólo en tools/, NUNCA en src/director/
import { CANVAS } from '../src/director/core/schema.js'        // { W:405, H:720, FPS:30 }
import { apcaLc } from '../src/director/core/util.js'          // COPIA propia, no la de urvid (§0.1)

const DSF = 1080 / CANVAS.W

function renderRGBA(video, t, mode) {            // mode: 'full' | 'bg' | 'text' | { onlyLayer: id }
  const cv = createCanvas(CANVAS.W * DSF, CANVAS.H * DSF)
  const ctx = cv.getContext('2d'); ctx.setTransform(DSF, 0, 0, DSF, 0, 0)
  drawDirectorFrame(ctx, t, video, { only: mode })              // mismo drawFrame del export: 1 sola verdad
  return ctx.getImageData(0, 0, CANVAS.W * DSF, CANVAS.H * DSF).data
}

function medirStill(video, t) {
  const capas = evalAt(video.timeline, t)                       // Map<layerId, props resueltos>
  const full = renderRGBA(video, t, 'full')
  const bg   = renderRGBA(video, t, 'bg')
  const txt  = renderRGBA(video, t, 'text')

  // --- máscaras (§1) ---
  const M = { tinta: 0, glifo: 0, acento: 0, n: full.length / 4, hueBins: new Array(12).fill(0) }
  let peorW = Infinity, peorLc = Infinity; const wcags = []
  for (let i = 0; i < full.length; i += 4) {
    const dRGB = Math.abs(full[i]-bg[i]) + Math.abs(full[i+1]-bg[i+1]) + Math.abs(full[i+2]-bg[i+2])
    const lf = lum(full[i], full[i+1], full[i+2]), lb = lum(bg[i], bg[i+1], bg[i+2])
    if (dRGB >= 12 || Math.abs(lf - lb) > 0.01) {
      M.tinta++
      const [h, s, v] = rgb2hsv(full[i], full[i+1], full[i+2])
      if (s >= 0.25 && v >= 0.12) {
        M.hueBins[Math.floor(h / 30) % 12]++
        if (dHue(h, hueAccent) <= 20) M.acento++
      }
    }
    if (dRGB >= 160) { M.glifo++; wcags.push(wcag(lf, lb)) }     // núcleo sólido: contraste
  }
  wcags.sort((a, b) => a - b)
  const p1W = wcags[Math.floor(wcags.length * 0.01)] ?? Infinity  // percentil 1 (C6)

  const aire      = 1 - M.tinta / M.n
  const densTexto = contarGlifo(txt, bg) / M.n
  const supAcento = M.acento / M.n
  const hues      = M.hueBins.filter(c => c / M.n >= 0.005).length

  // --- reglas geométricas: sobre `capas`, no sobre píxeles ---
  const bloques = [...capas.values()].filter(L => BLOQUE_KINDS.has(L.kind))
  const clases  = agruparTamanos(bloques.filter(L => L.kind === 'text'), 1.15)     // C1
  const ejes    = clusterEjes(bloques, 4)                                          // C5
  const focal   = rankPeso(video, t, bloques)[0]                                    // C2
  const banda   = focal.y < 0.46 ? 'alta' : focal.y < 0.57 ? 'centro' : 'baja'      // C10
  const enTransito = bloques.filter(L => { const p = progreso(L, t); return p > 0.05 && p < 0.95 })

  return {
    t, aire, densTexto, supAcento, hues, p1W, clases, ejes: ejes.length, banda,
    enTransito: enTransito.length,
    esqueleto: `${bloques.length}|${banda}|${ejes.length}:${ejes[0].lider.toFixed(2)}`,
    errores: [ /* aplicar los umbrales de §1 y §5, cada uno con su código de §5.0.1 */ ]
  }
}
```

**Determinismo del medidor**: `renderRGBA` no comparte canvas entre llamadas y `drawDirectorFrame`
es puro ⇒ medir el mismo `(video, t)` dos veces da el mismo objeto. El gate compara el JSON de
métricas contra el baseline; un cambio de composición se ve como diff de números, no "a ojo".

---

## 8. Resumen de números (tarjeta de referencia)

```
LIENZO       405×720 (→1080×1920, DSF 2.6667)  safe comp [0.06,0.94]×[0.05,0.90]  safe texto [0.08,0.90]×[0.06,0.84]
             grilla vertical 6px (y = round(y·120)/120)
MÁSCARAS     tinta: dRGB≥12 o dLum>0.01 (aire/densidad/acento/peso) · glifo: dRGB≥160 (SÓLO contraste)
             pasadas: full · bg(placa+finish) · text ; el grano se cancela porque va en las dos
JERARQUÍA    3 niveles   N1 44–96/w800-900 · N2 20–34/w600-700 · N3 10–14/w400-600 tr3-7
             ratios MANDAN sobre los rangos: n2=clamp(n1/1.8,20,34), n3=clamp(n2/1.6,10,14)
             misma clase si max/min<1.15 · focal ≥2.0× el segundo (alpha se multiplica UNA vez)
TEXTO        ≤12 palabras (sin kicker/mark) · ≤3 bloques · ≤3 líneas N1 · ≤26 car N1 / ≤42 N2 · ≤22% px glifo
AIRE         ≥35% (respiro ≥55%)   gap 24px vert / 18px horiz (10px dentro de bento)   margen 32px
EJES         ≤2 por escena (±4px, cluster por líder fijo)   bandas y: [.34,.46) [.46,.57) [.57,.70)   centro ≤⌈N/2⌉
COLOR        1 acento ≤12% frame (>20% ⇒ DURA) · ≤2 hues (bin 30°, piso 0.5% del frame, HSV s≥.25 v≥.12) · ΔH≤40°
CONTRASTE    <20px: 4.5 & Lc60 · 20–40px: 4.5 & Lc45 · >40px: 3.0 & Lc30 · onAccent: 3.0 & Lc30
             medido POST-finish, sobre mask.glifo, percentil 1 (no el mínimo absoluto)
LUZ          sombra blur=0.14·lado · offsetY=0.072·lado · offsetX=0 (objects.js usa 30/15 fijos)
             ⚠ shadowBlur/Offset NO se escalan con la CTM: multiplicar por s si dibujás dentro de scale(s)
             rim 0.35 → 0.06–0.07 @0.25–0.30 → 0.02
ACABADO      grano 160px 1×1 @alpha .05·k (k=dark?1:0.7) seed=floor(t·30) · viñeta r 0.36H→0.78H
             parada .5/.22 PERO alpha real en esquina ≈.25/.11 (la esquina está a 413px, no a 561)
GLASS        box blur separable ×3 sobre ImageData — NO ctx.filter (existe en napi-rs pero difiere
             de Skia↔browser), NO downscale (necesita canvas auxiliar = DOM u OffscreenCanvas)
ORNAMENTO    ≤1 por escena = #(text role='mark') + #(shape sin matchKey, área<6%) · marca sólo en apertura/cierre
TRÁNSITO     ≤2 capas con 0.05<progreso<0.95 en cualquier t · sweep 1 por escena, win(lt,0.9,2.1), alpha .17, rot −0.32
SHEETS       sheet-escenas: 1 still/escena en t=inicio+0.72·dur (composición) · sheet-link: 12 muestras (transición)
VEREDICTO    dura⇒RECHAZADO · score=100−Σblandas · ≥85 APROBADO · 60–84 A-AJUSTAR · <60 RECHAZADO
             video: RECHAZADO si ≥1 still rechazado, o look incoherente, o APROBADO/N < 0.80
```
