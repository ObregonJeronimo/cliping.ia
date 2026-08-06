# Clasificación de `encaja` — estado y cómo seguir

Esto existe para que el trabajo no dependa de la memoria de nadie. Es la tarea mecánica y larga que
quedó del pendiente #3: **que cada malla que muestra una imagen declare si tiene que entrar entera en
el cuadro o si puede sangrar**, y que la compuerta falle sobre la malla sin clasificar en vez de sobre
la geometría.

## El número, y por qué no coincide con el que estaba anotado

El pendiente decía *"hoy sólo 16 de 161 mallas con textura declaran si tienen que entrar enteras"*.
**Ese 161 no se pudo reproducir con ningún método.** El censo propio da **71 mallas con imagen**, y
arrancó con **12 clasificadas**. Queda dicho así en vez de forzar que coincidan: el método de este
censo está declarado, es repetible y cualquiera puede correrlo.

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

`tools/encaja-check.mjs` está en la cadena del guard. Arranca en lo medido y **sólo puede bajar**:
poner el piso en 0 dejaría la cadena roja con 59 casos y nadie podría pushear hasta terminar todo.

Cuando clasifiques una tanda, la compuerta te dice el número nuevo. **Bajalo al medido, no a uno
redondo.**

| fecha | sin clasificar | qué se hizo |
|---|---|---|
| 2026-08-06 | 59 de 71 | estado inicial medido |
| 2026-08-06 | 40 de 71 | `marquesina` (10) y `mosaico` (9) |
| 2026-08-06 | 32 de 71 | `columna` (8), primer caso de `encajaEje` |
| 2026-08-06 | 28 de 71 | `mesa`, `titular`, `contraste`, `vitrina` (1 cada uno) |
| 2026-08-06 | 21 de 71 | `rafaga` (7) |
| 2026-08-06 | **15 de 71** | `apertura`, sólo el contador (6) |

## Lo que falta, por archivo

```
apertura    14   texto
tipografia   7   2 sin tipo + 5 texto
```

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
- `apertura` — quedan sus **8 letras**, y no por olvido: declararlas `encaja` destapa un defecto real.

## Defecto encontrado y NO arreglado: `apertura` con marcas de una o dos letras

Medido con `verificar.mjs` el 2026-08-06, al declarar `encaja` en las letras del nombre:

| marca | aire | malla | centro x |
|---|---|---|---|
| `Q` (1 letra) | artesanal | 2.83 × 3.42 | −1.62 |
| `GO` (2 letras) | bienestar | 2.51 × 3.32 | −1.76 |

El cuadro mide 5.63 de ancho (semiancho 2.815) y el borde izquierdo de esa primera letra cae en
**−3.03: se sale 0.22**. La causa es que el reparto agranda cada letra para que la *palabra* llegue al
94% del ancho, y con una o dos letras una sola letra no entra aunque la palabra sí.

**Son dos causas, no una** — y conviene saberlo antes de tocar, porque arreglar sólo la primera deja
el defecto vivo:

1. **El centrado usa el ancho deseado, no el real.** `cursor` arranca en `-OBJ / 2` con
   `OBJ = mundoW * 0.94`. Cuando `ALTO_MAX = mundoH * 0.34` topea la letra —que es lo que pasa con
   nombres de 1-2 letras— el ancho real de la palabra queda **menor** que `OBJ`, y la palabra se
   corre a la izquierda la mitad de esa diferencia en vez de quedar centrada.
2. **El avance y el dibujo no miden lo mismo.** El cursor avanza `unidad[i] * ALTO`, pero la malla se
   crea con `planoTexto(L, ALTO, …)`, cuyo ancho sale del `ar` de su textura. Si el `ar` es mayor que
   `unidad[i]`, la malla sobresale de la celda que el cursor le reservó. Es la familia de defectos que
   este repo ya conoce: *dos lugares que calculan el mismo tamaño y se desincronizan* (pasó con
   `toro`, con `mesa` y con `rafaga`).

El chequeo `cabe` no lo caza porque pregunta por la **palabra** (`suma * conPiso + TRACK * (n-1)`), y
con una sola letra la palabra entra aunque la malla no.

**Cómo verificarlo cuando se arregle:** declarar `encaja` en las letras y correr `verificar.mjs`, que
es la que lo acusó. Las marcas que lo disparan son de 1-2 letras — el barrido las genera solo.

No se arregló de apuro porque el dimensionado de `apertura` es la primera impresión de la pieza y su
cabecera enumera todo lo que ya se probó ahí. Cuando se arregle, las 8 letras se declaran `encaja` y el
trinquete baja a 7.

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
