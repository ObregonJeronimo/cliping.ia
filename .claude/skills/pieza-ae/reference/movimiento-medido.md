# Cómo se mueve un titular de verdad — medido cuadro a cuadro, no recordado

> ## ⚠ LEER PRIMERO `gramatica-del-genero.md`
>
> Todo lo que hay en ESTE archivo sale de medir **una sola** referencia (el aviso de Gemini) a 30 fps.
> Después se midieron **ocho**, y el barrido mostró que ese aviso es **el más extremo del grupo en las
> dos puntas**: entra a 1,98× cuando los otros siete entran entre 1,00× y 1,29×, y sale a 6,07× cuando
> la mediana del género es 1,04×.
>
> **Lo que sigue siendo válido de acá:** la FORMA de la curva (freno brutal, quieto, salida acelerando),
> el cometa de escritura, el contenido teñido que se asienta, y los números de cascada.
>
> **Lo que quedó corregido allá:** las MAGNITUDES. Un rótulo entra entre 1,00× y 1,30×; el gesto de 3×
> a 25× existe pero vive en las transiciones y en los objetos de producto, no en la entrada de un
> titular, y pasa una a tres veces por pieza — no once.

Todo lo que hay acá sale de **medir la referencia a 30 fps**: extraer el tramo completo con ffmpeg y
calcular, en cada cuadro, la caja de tinta del texto (`tools/ae/medir-titular.mjs`). No de mirar. No de
acordarse. Los números son reproducibles.

---

## Primero: el error que hace falta no repetir

Yo afirmé que la referencia cambia el tamaño de sus titulares **con corte duro**, en tres estados, y lo
construí así en la PIEZA-H (`ubicar()` con claves `HOLD`). El usuario, mirando el video a velocidad
real, dijo que se veía raro: *"aparecen, pasa unos milisegundos y de la nada se hacen más grandes como
que avanzan hacia adelante… de un salto"*.

Tenía razón, y lo importante es **de dónde salió mi error**: yo había estudiado la referencia con
**120 cuadros extraídos a 2 por segundo**. A esa cadencia, un corte duro y un acercamiento de medio
segundo se ven **exactamente igual** — entre una muestra y la siguiente el texto es más grande, y nada
más. Mi evidencia no podía distinguir las dos hipótesis y yo elegí una igual, y después la escribí en
la skill como si fuera un hallazgo.

Es la nota 93 del cuaderno —*"una prueba que las dos hipótesis pasan no es una prueba"*— cometida sobre
una referencia en vez de sobre una compuerta.

> **La regla:** antes de copiar un comportamiento de una referencia, preguntarse **a qué cadencia lo
> observé**. Para juzgar una transición hay que muestrear a la cadencia del video. Dos por segundo
> alcanza para el mapa de escenas y **no alcanza para nada que dure menos de un segundo**.

---

## La forma real de un titular: entra frenando, se queda quieto, sale acelerando

Medido sobre "Reimagined for better", cuadros 205-248. La columna es la **altura de tinta en píxeles**:

```
entrada   205: 171   206: 85   207: 74   208: 68   209: 66   210: 63   211: 61   212: 61
          213: 60    216: 60   217: 59   219: 58   224: 58
quieto    225-245: 57  (veintiún cuadros sin mover un píxel)
salida    246: 60    247: 79   248: 167  → se va del cuadro
```

Tres tramos, y las proporciones importan más que los números absolutos:

| tramo | cuadros | qué hace |
|---|---|---|
| **entrada** | 20 (45 %) | aparece a **3× su tamaño final** y frena |
| **quieto** | 21 (48 %) | **no se mueve** |
| **salida** | 3 (7 %) | **acelera** hacia la cámara hasta salirse |

### La entrada es un freno brutal, no un ease suave

El 75 % del recorrido pasa **en un solo cuadro**:

```
cuadro 1 →  75 % del camino
cuadro 3 →  90 %
cuadro 5 →  95 %
cuadro 14 → 99 %
cuadro 20 → asentado
```

Eso no es `C1` ni `C2`. Es una **caída exponencial**: un golpe y una cola larguísima. En influencias de
AE hay que ir a algo como `[2, 96]`, y aun así la cola queda corta. La forma honesta de conseguirlo en
este motor es **partirlo en dos tramos**:

```
[c0,   3.0 × final, "C2"]      // el golpe: 6-7 cuadros, casi todo el recorrido
[c0+7, 1.06 × final, "C4"]     // la cola: 13 cuadros, los últimos 6 %
[c0+20, 1.0 × final, "C5"]     // asentado
```

**Y no hay opacidad en ninguna parte.** El titular no aparece con un fundido: aparece **grande y
desenfocado por el obturador**, y el desenfoque es lo que hace de fundido. Un fundido de opacidad sobre
un texto que además crece se lee como dos cosas a la vez.

### El quieto es quieto de verdad

Veintiún cuadros con **cero** cambio. Esto contradice algo que yo agregué en la PIEZA-H —una deriva
lenta de acercamiento durante todo el tiempo del titular, para "que el cuadro no esté muerto"— y explica
por qué se sentía raro: **la referencia sí se queda quieta, y el contraste con la entrada violenta es
justamente lo que da el ritmo.** Lo que nunca se queda quieto es el **fondo**: las manchas de luz y los
paneles. La figura para, el fondo no.

### La salida es hacia la cámara, no un fundido

Tres cuadros: 57 → 60 → 79 → 167 y afuera. Y en el titular de pago —"collaboration"— la salida es la
estrella del plano: **30 cuadros acelerando de 56 a 453 px**, o sea **8× el tamaño final**, terminando
enorme y desenfocada.

```
56 57 57 58 58 58 59 59 60 61 61 62 64 66 67 70 73 75 81 85 92 102 115 132 142 157 182 232 352 453
   +1 +1 +1 +2 +3 +5 +6 +9 +13 +17 +25 +50 +120 +101
```

Aceleración pura (`C3`, o mejor `C7 [0.1, 80]`). Un titular que se va **fundiéndose** desperdicia el
único momento en que puede tener fuerza.

### Y entre dos titulares hay UN cuadro vacío

Medido: el cuadro 204 no tiene tinta. El anterior se fue, el siguiente todavía no llegó. **Un cuadro.**
No es un cruce ni un fundido encadenado: es un corte con un respiro de 33 ms.

---

## El "destello" no es un barrido: es un COMETA DE ESCRITURA

Yo puse una elipse blanca y difusa cruzando el panel. La referencia hace otra cosa, y el cuadro 158 lo
muestra sin ambigüedad:

- Un **núcleo blanco reventado** de ~200 px, elipsoidal.
- Una **cola en cuña** de ~450 px que se abre hacia atrás y va de blanco a lavanda a transparente.
- Apoyado **sobre la línea de base del texto**, centrado a su altura.
- Viaja de izquierda a derecha **a la velocidad a la que se escribe el texto**.
- **El texto aparece detrás de él**: en el cuadro 158 se lee "Your AI assistant" y "from Google" todavía
  no existe. El cometa está exactamente donde iría la próxima palabra.
- Dura **6-9 cuadros** y deja un resplandor de color que se apaga en otros 6.

O sea: **no es una transición sobre un panel, es el mecanismo de revelado del texto.** El cometa es la
punta del lápiz.

### Y en este motor ya está construido, sólo que con otro nombre

El revelado por posición del cometa **es exactamente el tecleo**: una capa por carácter con opacidad en
`HOLD`, encendiéndose cuando el cometa pasa por su `x`. La posición del cometa sale de la **misma
medición de prefijos** que ya usa el cursor de tipeo (`anchoTexto(cadena.substring(0, i))`). Cambiar la
barra fina por un PNG de cometa y acelerarlo da el revelado de la referencia, sin agrandar el motor.

**Lo que sí falta es la fusión ADITIVA.** Un cometa de luz *suma* luz; dibujado en modo normal se lee
como pintura blanca, que es exactamente lo que se veía mal. Y hoy no viaja: `exportar.jsx` marca
cualquier modo de fusión distinto de `NORMAL` como `NOSOP` (línea ~449) y deja el documento incompleto,
aunque **`comp.mjs` ya PARSEA el campo `fusion`** (línea 131) y el reproductor ya tiene un material
aditivo armado para el resplandor (`comp3d.html:490`). *(Corregido: escribí "transporta" y era falso —
`documentoDe` no lo copia al objeto que devuelve, así que no llega a `comp.json`. Ver
`vocabulario-pendiente.md` §1.1.)* Está a muy poco de funcionar y desbloquea toda la
familia de luz: cometas, destellos, halos, reflejos.

> **Y por eso "usá CC Light Sweep" no es la respuesta**, aunque la intuición detrás sea correcta. Los
> efectos de AE **no cruzan** al documento: se verían en la previsualización de AE y desaparecerían en
> el render real, que lo hace el motor web. La respuesta correcta a "esto debería ser un efecto de
> verdad" en esta arquitectura es siempre una de dos: **hornearlo en un PNG** (viaja bit a bit) o
> **agrandar el vocabulario del documento y del reproductor** (y decir qué campo y qué líneas).

---

## Lo que representa contenido generado TIENE que verse generarse

Medido en los cuadros 575-593: el documento **se escribe solo**, y cada cuadro tiene más texto que el
anterior. Y hay un detalle que es la mitad del efecto:

> **La porción recién llegada aparece teñida con el color de acento y después se asienta al color
> normal.** El texto nuevo entra azul/violeta; un cuadro después ya es blanco y lo azul es la línea
> siguiente.

Eso es lo que lo hace leer como *generándose* en vez de como una captura de pantalla. Un bloque de texto
terminado que aparece de golpe **contradice el mensaje de la pieza**: si la pieza dice "pedile que
escriba", mostrar el resultado ya escrito es mostrar el después sin el durante.

**La regla:** cualquier elemento que represente algo que el producto *produce* —una respuesta, una
sugerencia, un documento, un comentario— aparece **progresivamente**, nunca de una. Y si la pieza tiene
un cursor o un cometa, la aparición va **enganchada** a él.

En este motor: una capa por línea (o por palabra) con opacidad `HOLD` escalonada, y **dos capas de texto
superpuestas por línea** —una en acento y otra en tinta— intercambiadas con `HOLD` unos cuadros después.
Cuesta el doble de capas y es la diferencia entre demostrar y afirmar.

---

## La cascada: tres números, no uno

Esto no sale de medir la referencia sino de una investigación sobre sistemas de diseño y bibliotecas de
animación reales (Material 3, Carbon, GSAP, Motion, Framer, Anime.js). Lo pongo acá porque es lo que
convierte "escalonar un poco" en un número que se puede escribir.

**Una cascada son TRES números independientes, y casi siempre se confunden en uno solo:**

1. **el desfasaje** entre una unidad y la siguiente,
2. **la duración** de la entrada de cada unidad,
3. **la ventana total**, de la primera unidad a la última.

| unidad | desfasaje | a 30 fps |
|---|---|---|
| carácter | 15-40 ms (centro 25) | **1 cuadro** |
| palabra | 40-80 ms | **2 cuadros** |
| línea | 80-120 ms | **3 cuadros** |

Duración de entrada de cada unidad: **400-600 ms (12-18 cuadros)** para caracteres.

### El número que de verdad manda: desfasaje ÷ duración

```
0,03 – 0,12   una OLA que cruza la frase   ← es esto lo que se lee como "smooth"
0,17          al borde de dejar de leerse como ola
≥ 1,00        una MÁQUINA DE ESCRIBIR (las unidades ya no se solapan)
```

Equivale a preguntar **cuántas unidades están en vuelo a la vez** (`duración ÷ desfasaje`): una ola tiene
entre 8 y 30. Con desfasaje de 2 cuadros y entrada de 12, hay 6 en vuelo y la razón da 0,17 — se lee
como letras entrando de a una. Con 1 cuadro: 12 en vuelo, razón 0,083, centro de la banda.

### La ventana total tiene techo

Carbon: una secuencia escalonada entera **dentro de 500 ms**. Material 3: no más de 20 ms entre
entradas. Para un titular publicitario: ventana **250-600 ms**, revelado completo (ventana + duración de
la última unidad) **≤ 1000-1200 ms**.

**Y por eso un titular largo no usa desfasaje fijo.** Con 40 caracteres a 1 cuadro la ventana son 40
cuadros = 1,33 s: se pasa. GSAP lo resuelve con `amount` (tiempo total repartido) en vez de `each`
(hueco fijo), y acá es una línea de aritmética:

```javascript
var cuadroDe = Math.round(VENTANA * i / (n - 1));   // ventana constante, no importa el largo
```

### El recorrido depende de si hay tapa

- **Sin tapa:** 0,15-0,40 de la altura de mayúscula. Más que eso y la letra flota en vez de entrar.
- **Con tapa:** 100-115 % de la caja de línea, porque tiene que salir de abajo del borde.

Confundir los dos regímenes es el error caro: 110 % sin tapa se ve como que la letra viene de otro lado.

### Traducción de las curvas del repo

Con velocidad cero de los dos lados, las influencias `[i1, i2]` equivalen a
`cubic-bezier(i1/100, 0, 1 − i2/100, 1)`:

| repo | cubic-bezier | equivale a |
|---|---|---|
| `C1 [20,85]` | `(0.20, 0, 0.15, 1)` | quart.out — **la correcta para la entrada de un carácter** |
| `C2 [10,92]` | `(0.10, 0, 0.08, 1)` | más agresiva, expo.out |
| `C7 [0.1,80]` | `(0.001, 0, 0.20, 1)` | velocidad máxima desde el primer cuadro: acuses, **no texto** |

Y las de referencia, por si hace falta otra: Material 3 estándar `(0.2,0,0,1)`, énfasis-desacelerado
`(0.05,0.7,0.1,1)`; Vercel/Emil Kowalski `(0.23,1,0.32,1)`.

---

## Resumen operativo

| lo que hacía | lo que mide la referencia |
|---|---|
| tres escalas con salto `HOLD` | entrada frenando desde 3×, quieto, salida acelerando a 8× |
| entrada con fundido de opacidad | entrada por **escala**, sin opacidad; el obturador hace de fundido |
| deriva lenta durante todo el titular | **quieto de verdad**; lo que se mueve es el fondo |
| salida con fundido | salida **hacia la cámara**, fuera de cuadro |
| cruce entre titulares | **un cuadro vacío** entre uno y otro |
| elipse difusa cruzando un panel | **cometa de escritura** sobre la línea de base, revelando el texto |
| tarjeta que aparece escrita | contenido **escribiéndose**, con la parte nueva teñida de acento |
