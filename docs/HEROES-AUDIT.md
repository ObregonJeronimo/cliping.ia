# Auditoría de héroes — estado, y qué creer de cada número

Esto existe porque la pregunta *"¿por qué muchos héroes no se pueden usar?"* tenía una respuesta que no
era la que parecía, y porque auditar héroes tiene una trampa en cada paso.

## Lo primero: no era falta de material

De los 18 héroes, **12 declaran `necesita: ['nada']`** y funcionan con cualquier página. Sólo 6 dependen
de material: 3 de `elementos` (cubo, mosaico, vitrina) y 3 de `tira` (portátil, teléfono, ventana).

Los que no aparecían eran **los 3 de `tira`, y no se ofrecían en NINGUNA página**: `normalizePageModel`
valida contra el schema del director y devuelve sólo lo que el schema conoce, así que `_tira` —que
empieza con guion bajo— se perdía, y `tira: !!pm._tira` daba `false` siempre. Arreglado en
`anthem-datos.mjs`, rescatando el dato del JSON crudo.

**Medido: héroes disponibles 15/18 → 18/18** sobre las 8 páginas reales.

Lo que esto NO arregla, y está bien que no lo haga: una página que de verdad no da recortes ni tira
sigue en 12 de 18. Un héroe sin material que finge tenerlo dibuja rectángulos con la paleta de la
marca, que es lo que `mosaico` prohíbe en su cabecera. Ahí el camino es **subir la tasa de
extracción**, no relajar el requisito. Dato para eso: de 16 páginas cosechadas, 3 dieron 0 recortes.

## La auditoría geométrica

```bash
node tools/heroes-audit.mjs
```

Construye los 17 sobre las 7 páginas reales, 25 instantes cada una. **Son proxies geométricos, no
píxeles del video**: no hay shaders, ni bloom, ni grano. Sirven para comparar héroes entre sí y
encontrar extremos, no para dar una nota de calidad.

### Tres cosas que el instrumento midió mal antes de servir

Se listan porque cada una parecía un hallazgo sólido:

1. **Texturas de prueba de 64 px.** Es lo que usan las otras compuertas, que miden geometría. Acá
   importa: varios héroes topean el tamaño dibujado con `topeNitido` para no pixelar el recorte del
   cliente, así que con 64 px lo dibujan diminuto. `mosaico` daba **0.044** de cobertura, la peor de
   las 17 y diez veces menos que la siguiente. Con 700 px da **0.383**.
2. **`muestra` preguntaba por `tipoImagen === 'recorte'`**, que lo declara `planoRecorte`. Decía "no"
   para `cubo`, que arma sus caras a mano. Ahora se reconoce la textura.
3. **El movimiento medido en CPU no ve a los que deforman en el vertex shader.** `gota` daba **0.0029**
   —cuarenta veces menos que el resto— y no estaba quieta: su movimiento vive entero en la GPU. **Son
   10 de 17.** La columna ahora dice `(gpu)` en vez de un cero que se leería como diapositiva.

### La cobertura NO predice calidad visual

`pulso` tenía la cobertura más baja de los 17 (**0.401**) con 48,7 mallas, y en el render se ve lleno:
son trazos finos, y la cobertura mide áreas de caja. Una composición de líneas siempre va a puntuar
bajo aunque llene el cuadro. **La tabla sirve para elegir dónde mirar, no para decidir qué está mal.**

### Límite que queda

`telefono`, `ventana` y `portatil` dan `muestra: no` aunque dibujan la tira. Es del instrumento, no de
los héroes — **confirmado con render**: `telefono` muestra la página de basecamp.com entera y legible
en un móvil (cuadro 500).

## Auditado con render de verdad

El único que ve contraste, shaders y bloom. **Siempre mirar el `plan.json` antes que los cuadros.**
`--hero X` falla de DOS maneras distintas, y las dos ya pasaron en la misma sesión:

1. **No fuerza que la escena `hero` entre.** Un render pedido con `--hero gota` salió con
   `heroes: []` — el guion no eligió esa escena. Ese video no contenía gota.
2. **No garantiza el héroe pedido.** Un render pedido con `--hero pulso` salió con
   `heroes: ['telefono']`: si el pedido no es elegible para esa página y ese aire, el registro elige
   otro. El video es válido, pero **no es el héroe que se quería auditar**.

Sin mirar el plan, en los dos casos se audita otra cosa y se reporta con confianza.

| héroe | render | cuadros abiertos | resultado |
|---|---|---|---|
| `calibre` | stripe.com, seed 3, aire editorial | 260, 320 | **defecto real**: rótulo a 2.41:1 |
| `mosaico` | stripe.com, seed 5, aire corporativo | 250 | bien — muestra logo, editor, recibo, QR |
| `gota` | linear.app, seed 3, aire editorial | 440 | bien — se mueve 1.27–1.91 por píxel |
| `telefono` | basecamp.com, seed 26 | 500 | bien — muestra la página real, texto nítido |
| `pulso` | stripe.com, seed 5, aire corporativo | 220, 280 | bien — rótulo a 9,24 y 9,65:1 |

### El defecto encontrado, y por qué el arreglo no es para `calibre`

El rótulo del héroe (`hero.js`, vía `rotular`) salía a **2.41:1** de contraste — por debajo hasta del
umbral flexible de WCAG (3.0:1; el normal es 4.5:1). La causa: `nivelTexto` elige el tono contra el
**fondo del mundo** y no puede saber que el héroe le puso un bloque atrás. Y el comentario que ubica el
rótulo dice que va *"fuera del eje donde vive el objeto"*, cierto sólo mientras el héroe sea un objeto
centrado — `calibre` apoya su base a lo ancho de todo el cuadro.

Por eso el arreglo es una **cama** detrás del rótulo: sea cual sea el héroe, detrás del texto hay una
superficie conocida. **Medido: 2.41:1 → 5.15:1**, y confirmado en mundo oscuro con `gota`.

### Dos falsos positivos míos, para no repetirlos

- **`mosaico` con contraste 1.05:1** — no es texto ilegible, es que **no hay texto en esa banda**. Un
  contraste de ~1.0 sobre una franja uniforme significa "acá no hay nada que medir".
- **La silueta de `gota` se ve facetada** — falso. Usa `IcosahedronGeometry(R, 5)`, 5.120 triángulos, y
  su cabecera explica por qué no alcanza detail 4. Lo que se lee como facetas son los reflejos
  especulares del material físico sobre una superficie deformada.

## Por qué `fondo-check` no puede cazar el contraste del rótulo del héroe

Se persiguió hasta el fondo y la respuesta es **estructural**, no un ajuste pendiente. Eran dos causas:

**1. Era ciega a la geometría 3D.** `caja()` devolvía `null` para todo lo que no declarara
`parameters.width` — su comentario decía *"sólo planos: es lo que llevan texto y camas en este
motor"*, cierto para escenas y falso para héroes, que son cilindros, poliedros y extrusiones. Todo eso
quedaba fuera de `tapas` y la compuerta concluía que detrás del rótulo estaba el fondo del mundo (en
stripe, blanco → contraste excelente → verde). **Arreglado** con bounding box real.

**2. Mide el color DECLARADO, y el defecto vive en el píxel ILUMINADO.** Medido:

| | color | luminancia |
|---|---|---|
| declarado (`mat.color` del cuerpo de `calibre`) | `#989389` beige gris | 0.2935 |
| píxel real detrás del rótulo, en el render | `rgb(85, 93, 146)` violeta | 0.1186 |

El píxel real es **2,5× más oscuro** y de otro tono. Los héroes usan `MeshPhysicalMaterial` con el
estudio PMREM: lo que se ve es el color declarado **después** de la luz, los reflejos y el bloom.
`fondo-check` no renderiza, así que no puede saberlo — no por un descuido, sino por lo que es.

**Consecuencia:** este defecto pertenece a la familia que sólo caza una compuerta que mire PÍXELES.
Esa familia ya existe (`imagen-check.py`, que renderiza de verdad). El camino es medir ahí el
contraste del rótulo contra su fondo real, no seguir afinando `fondo-check`.

Probado: quitando la cama a mano —el defecto original— `fondo-check` sigue en verde aun con la
geometría 3D ya visible. Por eso la cama es el arreglo correcto: **garantiza el fondo en vez de
depender de medirlo**.

## Auditoría con render de LOS 17 — `tools/heroes-render.py`

```bash
npm run pesado -- python tools/heroes-render.py
```

Renderiza una pieza por héroe y mide sobre los cuadros de su tramo. **Cero hallazgos sobre los 17.**
El contraste más bajo es `columnata` con 3,80:1 (piso 3,0) y el movimiento más bajo `vitrina` con
0,306 — 61 veces el ruido del códec (0,005).

| héroe | contraste | movimiento | tinta |
|---|---|---|---|
| `columnata` | 4,28:1 | 0,751 | 0,270 |
| `telefono` | 7,04:1 | 4,905 | 0,737 |
| `brote` | 8,55:1 | 1,318 | 0,380 |
| `gota` | 8,69:1 | 0,456 | 0,575 |
| `telar` | 8,70:1 | 1,865 | 0,545 |
| `farol` | 9,52:1 | 0,514 | 0,386 |
| `cinta` | 10,58:1 | 4,506 | 0,472 |
| `biela` | 10,69:1 | 4,208 | 0,783 |
| `calibre` | 11,07:1 | 0,844 | 0,396 |
| `prisma` | 11,18:1 | 1,161 | 0,388 |
| `enjambre` | 11,19:1 | 1,372 | 0,315 |
| `pulso` | 11,19:1 | 3,343 | 0,357 |
| `cubo`, `portatil`, `ventana`, `vitrina` | sin rótulo | 0,30–2,38 | 0,33–0,68 |
| `mosaico` | banda con composición | 1,426 | 0,439 |

### La cama del rótulo, afinada con esta misma tabla

El peor caso era `columnata` con **3,80:1** — pasaba el piso de texto grande (3,0) pero no el de texto
normal (4,5). Se ve por qué: la cama tenía opacidad 0,86 y dejaba pasar las dos columnas claras que
tiene detrás. Dos cambios, medidos de a uno:

| cambio | `columnata` |
|---|---|
| original (opacidad 0,86, `nivel(0.04)`) | 3,80:1 |
| opacidad 0,94 | 4,04:1 |
| + color de fondo puro `nivel(0.0)` | **4,28:1** |

Se paró ahí a propósito: llegar a 4,5 exigía una cama **opaca**, y que se vea algo detrás es lo que la
integra a la escena en vez de parecer una etiqueta pegada.

**Y el cambio se verificó sobre los 17, no sobre el que se estaba arreglando: ninguno bajó y los doce
con rótulo subieron.** Ocho pasaron a superar el umbral de texto normal.

### Tres trampas que la herramienta ya trae resueltas

1. **Comprueba el plan.** `--hero X` no garantiza el héroe (el REGISTRO filtra por aire) ni que la
   escena `hero` entre. Auditar sin verificarlo es medir un héroe creyendo que es otro.
2. **Exige una cama, no cualquier cosa con bordes duros.** La banda del rótulo es una posición fija, y
   cuando el héroe llena el cuadro con recortes ahí cae contenido del cliente — en `mosaico`, el
   recibo de "Quiet Fire Yoga". Se mide la dispersión del fondo: 37,4 es composición, 1–2 es cama.
3. **Informa los que no pudo medir.** Un héroe que no salió en ningún caso **no está bien: no se
   midió.** Hicieron falta 6 casos —dos con el aire forzado— para cubrir a `cinta` y `farol`.

**Y el aire cambia el guion**, no sólo la paleta: forzar `artesanal` sobre basecamp/26 da un plan sin
la escena `hero`. Hace falta un par (página, semilla) cuyo guion además la elija.

## Lo que falta

- **14 héroes sin auditar con render.** El orden sugerido sale de la tabla de `heroes-audit`: los de
  cobertura más baja primero (`calibre` ya está, sigue `pulso` 0.401 y `columnata` 0.442).
- **Llevar la medición de contraste del rótulo a `imagen-check.py`**, que es la única que ve píxeles.
