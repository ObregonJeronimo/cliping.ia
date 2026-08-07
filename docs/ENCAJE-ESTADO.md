# Clasificación de `encaja` — estado y cómo seguir

Esto existe para que el trabajo no dependa de la memoria de nadie. Es la tarea mecánica y larga que
quedó del pendiente #3: **que cada malla que muestra una imagen declare si tiene que entrar entera en
el cuadro o si puede sangrar**, y que la compuerta falle sobre la malla sin clasificar en vez de sobre
la geometría.

## El número, y por qué no coincide con el que estaba anotado

El pendiente decía *"hoy sólo 16 de 161 mallas con textura declaran si tienen que entrar enteras"*.
Acá decía que **ese 161 no se pudo reproducir con ningún método** y que el censo propio daba **71
mallas con imagen** — con la decisión, correcta en su momento, de no forzar que coincidieran.

### Se reprodujo: son 161 exactas, y el que estaba mal era el censo

El censo decidía *"esta malla muestra una imagen"* preguntando por `material.map`. **19 de las 20
escenas dibujan su texto con `materialMascara`** —o con el `matWipe` de `tipografia`—, que son
`ShaderMaterial` escritos a mano y llevan la textura en `uniforms.map.value`. Lo mismo la tira en
`telefono`, `ventana` y `portatil`. Nada de eso entraba.

Con la búsqueda ampliada a los uniforms: **161 mallas con imagen, exacto**. El número del pendiente era
correcto desde el principio.

**Y eso mueve el estado real de la tarea:** no hay 0 sin clasificar, hay **71**. La compuerta daba
verde porque el censo del que se alimenta sale filtrado por ese mismo criterio (`filas: conImagen`) —
o sea que una compuerta cuyo trabajo entero es cazar mallas sin declarar estaba ciega justo a ellas.

El trinquete vuelve a 71. **No es un retroceso del motor: no se rompió ni una escena.** Es el número
verdadero sustituyendo a uno que era mentira.

| archivo | sin clasificar |
|---|---|
| `tarjetas` | 21 |
| `pantalla` | 8 |
| `toro` | 7 |
| `apertura` | 6 |
| `destello` | 6 |
| `cierre` | 5 |
| `tipografia` | 5 |
| `columna`, `mesa`, `ventana` | 2 c/u |
| `cita`, `marquesina`, `portatil`, `sello`, `telefono`, `titular`, `vitrina` | 1 c/u |

```bash
node tools/encaja-inventario.mjs
```

Mide 37 escenas/héroes × 8 juegos de datos, recorriendo 31 instantes de cada línea de tiempo y
guardando el peor juego de cada escena. Con `--detalle` lista malla por malla y con `--json` lo
escupe para otra herramienta.

## Cómo se clasifica

Sobre la malla, en la escena:

| declaración | qué significa |
|---|---|
| `userData.encaja = true` | tiene que entrar **entera**. `encuadre-check` se lo va a exigir. |
| `userData.sangra = true` | puede cruzar el borde **a propósito** (cintas, ornamentos, fondos). |
| `userData.encajaEntre = [a, b]` | entra entera **entre esas fracciones** de la escena. Para las que vuelan hasta su lugar. |
| `userData.encajaEje = 'x' \| 'y'` | entra entera **sólo en ese eje**. Para feeds y cintas, que sangran en el otro por definición. |

`encajaEntre` tiene guardarraíl: el tramo debe llegar al menos a **0.90** y cubrir el **25%**. La razón
está en `encuadre-check`: lo que separa "vuela y después se compone" de "me mido donde me conviene" no
es cuánto dura el tramo, sino dónde termina — una rendija en el medio deja sin mirar justo el tramo
donde la composición está quieta y el espectador la lee.

**El tramo se deriva, no se calibra.** En `mosaico` la primera versión puso `[0.25, 0.95]` midiendo un
solo caso y falló con otro aire, porque el momento de asentarse depende del aire y de cuántas piezas
hay. Sale del propio tween de entrada de la escena.

## El trinquete

`tools/encaja-check.mjs` está en la cadena del guard. Arrancó en lo medido y **sólo podía bajar**:
poner el piso en 0 el primer día habría dejado la cadena roja con 59 casos y nadie podría pushear
hasta terminar todo.

**Está en 0 desde el 2026-08-06, y en cero deja de ser un trinquete: es la regla.** Ninguna malla que
muestre una imagen puede entrar al motor sin declarar si tiene que entrar entera o si sangra a
propósito.

Cuando clasifiques una tanda, la compuerta te dice el número nuevo. **Bajalo al medido, no a uno
redondo.**

| fecha | sin clasificar | qué se hizo |
|---|---|---|
| 2026-08-06 | 59 de 71 | estado inicial medido |
| 2026-08-06 | 40 de 71 | `marquesina` (10) y `mosaico` (9) |
| 2026-08-06 | 32 de 71 | `columna` (8), primer caso de `encajaEje` |
| 2026-08-06 | 28 de 71 | `mesa`, `titular`, `contraste`, `vitrina` (1 cada uno) |
| 2026-08-06 | 21 de 71 | `rafaga` (7) |
| 2026-08-06 | 15 de 71 | `apertura`, sólo el contador (6) |
| 2026-08-06 | 7 de 71 | `apertura`, sus 8 letras (arreglado el dimensionado) |
| 2026-08-06 | **0 de 71** | `tipografia` — **CERRADO**, el trinquete pasa a ser la regla |

## Lo que falta, por archivo

Nada. Las 71 están clasificadas.

`tipoImagen` lo declaran `planoTexto` y `planoRecorte` en el kit; las que dicen "sin tipo" son mallas
que la escena arma por su cuenta con `new THREE.Mesh`, y conviene que también lo declaren al pasar.

**Lo que sé de las dos que faltan, para no arrancar de cero:**

- `tipografia` — las 5 de texto se componen contra `A_MAX = mundoW * 0.94` y `ANCHO = 5.05`, o sea que
  la intención es que entren. **Las 2 mitades no las cubre el mecanismo actual**, y esto es un límite
  real de `encajaEntre`, no una tarea pendiente de ejecutar (ver abajo).

## El límite conocido de `encajaEntre`, medido

`encajaEntre` se diseñó para mallas que viven **toda** la escena y vuelan hasta su lugar, como las de
`mosaico`. Las mitades de `tipografia` no son eso: entran desde ±5.0, se componen, y salen en el beat
1.5 de una escena de 8 porque son la **primera de tres frases que se suceden**. Derivado de sus tweens
(líneas 405-412): la entrada termina en `b(0.85)` y la salida arranca en `sal(1.5)`, o sea una ventana
compuesta de **[0.11, 0.19] — el 8% de la escena**.

El guardarraíl la rechaza (pide llegar a 0.90 y cubrir 25%) **y hace bien**: con la escena entera como
referencia, un tramo así es indistinguible de una rendija puesta para esquivar la compuerta.

Lo que falta para cubrir este caso es medir el tramo sobre **la vida visible de la malla** en vez de
sobre la escena: "entra entera durante el último 80% del tiempo en que se la ve". Eso sí distingue una
malla efímera y bien compuesta de una rendija conveniente. No está hecho — se deja anotado en vez de
forzar `tipografia` con un tramo que el guardarraíl tendría que dejar pasar por excepción, que es
justamente como se rompen las compuertas.

## `apertura`: el defecto que destapó la clasificación, y cómo se arregló

Declarar `encaja` en las letras del nombre puso en rojo las dos compuertas. **Y el primer diagnóstico
que escribí estaba mal**, así que conviene dejar las dos versiones:

> *Lo que anoté primero:* "con marcas de 1-2 letras la letra se sale 0.22 del cuadro".

Falso. Con la marca `Q`, el borde del **glifo** cae en −2.65 y el semiancho del cuadro es 2.815: el
glifo entra. Lo que cruzaba el borde es el **aire transparente** que `texto()` deja alrededor
(`AIRE = 0.3 / 1.34`), y `verificar.mjs` mide la caja de la malla, no la tinta.

Los defectos reales eran **tres**, y hacían falta los tres:

1. **La palabra se centraba por el ancho deseado, no por el real.** `cursor` arrancaba en `-OBJ / 2`.
   Cuando `ALTO_MAX` topea la letra —lo que pasa con nombres de 1-2 letras— el ancho real queda menor
   que `OBJ` y la palabra se corre a la izquierda. Medido con `Q`: la letra sentada en **x = −1.61**
   en un cuadro que va de −2.82 a 2.82. Una marca de una letra pegada al margen izquierdo, en el
   cuadro más grande de la pieza.
2. **El reparto no contaba el aire del glifo.** `unidad` es `ar − AIRE` (sólo el glifo) pero la malla
   se dibuja con el `ar` completo, así que la palabra medía siempre `AIRE * ALTO` más de lo pedido.
   Se reparte dividiendo por `suma + AIRE`.
3. **`OBJ` estaba en unidades de mundo y el dolly achica el cuadro.** Es el patrón que ya costó `toro`
   y `mesa`. La cámara se acerca hasta `dolly(distBase, −0.55)` y el dolly lo pone el aire (0.4 a
   1.55): medido, hasta **1.128 anchos de cuadro** con el aire técnico. Ahora sale de
   `cuadroMasAngosto`, y el acercamiento se declara **una sola vez** y lo usan la cámara y el ancho.

Arreglado: las 8 letras declaran `encaja` y las dos compuertas quedan verdes sobre las 407
construcciones. Trinquete **15 → 7**.

## Cómo clasificar sin romper nada — el orden que funcionó

1. **Leer la cabecera de la escena antes de tocarla.** Las dos que se clasificaron ya tenían la
   decisión tomada y escrita; lo único que faltaba era declararla en la malla. `mosaico` dice "Y
   SANGRA" en mayúsculas sobre su banda, y `marquesina` explica que su cinta es un bucle.
2. **Declarar, y después correr `encuadre-check`.** Declarar `encaja` es pedirle a la compuerta que lo
   exija: si aparecen fallos, son reales y estaban tapados por la falta de clasificación.
3. **Si falla, medir cuándo se sale antes de decidir.** En `mosaico` los fallos eran el vuelo de
   entrada (0.00–0.22) y la salida (0.96–1.00), con el 74% del medio limpio — no un defecto de
   composición. Eso es lo que motivó `encajaEntre`.
4. **Correr también `verificar.mjs`**, que tiene su propia comprobación de `encaja`: mide en
   coordenadas de mundo y en un instante, sin noción de tramo. Encontró un caso que `encuadre-check`
   no ve.
5. **Bajar el trinquete** y dejar la medición escrita.

## Trampas ya pisadas en este censo, para no repetirlas

- **Medir en un instante.** Varias escenas crean mallas dentro de la línea de tiempo: contó 68 en vez
  de las 71 reales.
- **Deduplicar por nombre de malla.** Casi ninguna tiene `name`: el censo se derrumbó de 736 a 57 y el
  número parecía plausible. Se deduplica por identidad de objeto.
- **Escribir la justificación antes de medirla.** Dos comentarios resultaron falsos al comprobarlos:
  "el aire no cambia qué mallas existen" (el total se mueve entre 726 y 796) y "el censo escala con el
  material" (con 5 recortes y con 12 da lo mismo).
- **Calibrar un umbral con un solo caso.** Pasó dos veces el mismo día: el tramo de `mosaico` y el
  guardarraíl de cobertura.
