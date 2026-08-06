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
| 2026-08-06 | **40 de 71** | `marquesina` (10) y `mosaico` (9) |

## Lo que falta, por archivo

```
apertura    14   texto
columna      8   recorte
rafaga       7   4 sin tipo + 3 recorte
tipografia   7   2 sin tipo + 5 texto
contraste    1   recorte
mesa         1   sin tipo
titular      1   sin tipo
vitrina      1   recorte
```

`tipoImagen` lo declaran `planoTexto` y `planoRecorte` en el kit; las que dicen "sin tipo" son mallas
que la escena arma por su cuenta con `new THREE.Mesh`, y conviene que también lo declaren al pasar.

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
