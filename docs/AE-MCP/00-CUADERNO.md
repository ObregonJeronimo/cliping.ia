# Cuaderno: un MCP para After Effects

Notas de estudio, escritas mientras aprendo. **No es documentación de algo que funciona** — es el
registro de qué voy entendiendo, qué no, y qué se probó y falló. Si algo acá está marcado como
`[ABIERTO]` significa que todavía no lo sé, no que sea opcional.

Arrancado el 2026-08-06.

---

## 1. Qué se quiere construir, en una frase

Que yo pueda construir escenas de motion graficos dentro del After Effects de la PC de Thiago, que
esas escenas salgan a un formato que la web pueda reproducir y editar, y que el video final se
produzca **sin After Effects**.

### El flujo, en cuatro pasos

```
1. AUTORÍA      Claude ──MCP──► After Effects (PC de Thiago).  Offline, una vez por plantilla.
2. EXPORTE      AE ──?──► un documento de escena
3. EDICIÓN      La web lee ese documento. El usuario cambia textos, colores, imágenes,
                y encadena escenas.
4. RENDER       Un motor propio produce el MP4. AE no participa.
```

**El paso 2 es el que decide si esto existe o no.** Los pasos 1, 3 y 4 son trabajo; el 2 es una
pregunta abierta.

---

## 2. Lo que ya está decidido (y por qué)

**AE no puede estar en el camino del usuario.** La licencia de Creative Cloud no permite correr AE en
un servidor para dar render como servicio a terceros — por eso existen nexrender y Plainly, y por eso
te obligan a poner tu propia licencia. Además, AE renderiza a 10-100× tiempo real, lo cual mata la
promesa de "pegás una URL y tenés el video". Ya lo evaluamos antes de esta conversación.

**El problema no es la falta de motor.** Ya hay uno en `render3d/demo` (three.js + WebCodecs), y esta
semana recreé a mano dos referencias profesionales con HTML/CSS y con three.js + bloom. La tecnología
alcanza. **Lo que falta es la artesanía del movimiento** — el timing, el escalonado, el encuadre. Esa
es exactamente la razón para traer AE: no como motor, como **mesa de diseño**.

---

## 3. Lo que ya medimos y sirve de vara

De `tools/mirar-video.py` sobre las tres referencias que trajo Thiago:

| | duración | cortes duros | un corte cada | movimiento medio |
|---|---|---|---|---|
| FireFit (promo de app) | 23 s | 2 | 11.5 s | 28.6 |
| referencia 2 | 19 s | 3 | 6.3 s | 37.3 |
| Gemini Canvas | 60 s | 1 | 60.0 s | 14.1 |
| **motor actual** | 20 s | **8** | **2.5 s** | **45.0** |
| mi recreación de FireFit | 23 s | 1 | 23 s | **10.9** |

Dos lecturas: **no cortan, viajan** — la cámara recorre y el viaje es la transición. Y nuestro motor
**se mueve más** que las tres referencias mientras corta entre 3 y 24 veces más seguido.

Mi recreación se pasó para el otro lado: quedó por debajo de todas.

---

## 4. Las preguntas abiertas, en orden de cuánto deciden

### `[ABIERTO]` P1 — ¿Cómo le habla un proceso externo a un AE que ya está abierto?

Es el cuello de botella. El MCP corre en Node o Python; AE es otra aplicación. Los caminos que conozco
de nombre y hay que evaluar:

| camino | lo que hay que averiguar |
|---|---|
| `AfterFX.exe -r script.jsx` | ¿usa la instancia abierta o abre otra? ¿devuelve algo? |
| Panel CEP + WebSocket | ¿CEP sigue vivo en 2026? ¿un panel puede quedar escuchando? |
| UXP | ¿ya soporta AE o sigue siendo sólo Photoshop/InDesign? |
| BridgeTalk | ¿existe todavía? |
| Archivos `.jsx` + polling | feo pero puede que sea lo único que funcione |

**Si ninguno da un canal bidireccional confiable, el proyecto cambia de forma.**

### `[ABIERTO]` P2 — ¿Cuánta fidelidad sobrevive al salir de AE?

Tres caminos, y ninguno es obviamente ganador:

- **Hornear el movimiento** — exportar la transformación de cada capa cuadro por cuadro. Conserva el
  timing exacto. No conserva los efectos.
- **Transpilar** — leer keyframes con sus manijas y reconstruir la curva en el motor. Ojo: **las
  manijas de AE son de velocidad e influencia, no cubic-bezier de CSS.** La conversión puede no ser
  exacta, y hay que saber cuánto se pierde.
- **Lottie** — conserva la editabilidad y **descarta justo lo caro**: cámaras 3D reales, bloom,
  profundidad de campo. Ya lo sabemos en general; falta el detalle de qué exactamente.

### `[ABIERTO]` P3 — ¿MOGRT nos ahorra inventar el formato?

Adobe **ya tiene** un formato de plantilla con propiedades editables: **MOGRT**, del panel Essential
Graphics. Se exponen propiedades (texto, color, punto, deslizador) y se empaqueta. Las preguntas: ¿se
puede exponer por script o sólo a mano? ¿el `.mogrt` se puede leer fuera de Adobe? Y si no, ¿sirve
igual como **modelo** de cómo declarar qué es editable?

### `[ABIERTO]` P4 — El texto que no mide lo que medía

Este ya nos mordió y va a volver: si la plantilla se diseñó con "ACME" y el usuario pone
"Construcciones del Sur Patagónico", la animación asumía un ancho que ya no existe. **Es el mismo
problema que `encaje()` sin piso** que la auditoría del motor viene cerrando hace una semana, sólo que
heredado de AE. Hay que decidir cómo se declara cuánto texto aguanta un hueco **antes** de autorar
plantillas, no después.

---

## 5. Trampas que ya conozco y quiero anotadas antes de pisarlas

- **Adobe rompe el scripting entre versiones.** Cualquier cosa que construyamos tiene que decir contra
  qué versión de AE fue probada.
- **Adobe Fonts.** Si una plantilla usa una tipografía de Adobe Fonts, puede que no se pueda usar el
  resultado en la web. Trampa clásica, hay que saberlo antes de diseñar nada.
- **`aerender` puede necesitar que AE esté cerrado.** Si es así, el flujo "diseñar y previsualizar en
  la misma sesión" se complica.
- **El espacio de color.** Recién me pasó recreando Gemini: un canvas 2D ya entrega sRGB y three lo
  volvía a convertir, así que los negros salían grises. Cualquier puente AE → web va a tener la misma
  clase de problema, y se ve como "los colores no son los mismos".

---

## 6. Bitácora

**2026-08-06** — Lanzada la investigación: 10 frentes en paralelo más un crítico adversarial. Los
frentes: cómo se construye un MCP, el modelo de objetos de AE, cómo conectarse a un AE abierto, MOGRT,
cómo sacar la animación, qué existe ya, los efectos de las referencias, el motor web que consuma,
`aerender` y la salida, y riesgos y costos.

Lo que le pedí explícitamente al crítico: que diga si P1 quedó respondida, si P2 tiene una respuesta
honesta, **qué se está subestimando**, y **cuál es el camino más corto a una prueba real de un día**.

---

## 7. Cómo pienso usar este cuaderno

Cada vez que aprenda algo que cambie una decisión, va acá con la fecha. Cada vez que algo falle, va
acá **con el error textual** — los errores enseñan más que los aciertos y se olvidan más rápido. Y
cada `[ABIERTO]` se cierra escribiendo la respuesta debajo, no borrando la pregunta: quiero poder
releer por qué creíamos lo que creíamos.

---

## 8. Cosas que traigo yo, que nadie pidió

Anotadas el 2026-08-06, antes de que vuelva la investigación. Son leads que conozco de nombre y que
hay que **verificar** — están acá para que se busquen, no como hechos.

### 8.1 `sourceRectAtTime()` — puede ser la respuesta a P4

AE tiene un método, `layer.sourceRectAtTime(tiempo, incluirExtensiones)`, que devuelve **la caja real
medida** de una capa de texto o forma en un momento dado: `top`, `left`, `width`, `height`.

Esto importa muchísimo y quiero explicar por qué. **Es exactamente el primitivo que nuestra auditoría
identificó como la cura**: los ~100 hallazgos del motor son casi todos el mismo pecado — dimensionar
contra una constante sin medir el resultado. Y es el mismo contrato que Raylight publica en su MCP
(*"MEASURED rendered footprint… never guess sizes"*).

Si AE nos da la medida real del texto, entonces **el exportador puede escribir en el documento de
escena cuánto mide cada hueco de verdad**, y el runtime web puede decidir con eso en vez de adivinar.
P4 deja de ser un problema abierto y pasa a ser una cuenta.

`[VERIFICAR]` que exista con esa firma en la versión actual y que funcione con capas de texto con
animadores aplicados.

### 8.2 Responsive Design y Protected Regions — Adobe ya resolvió P4

Adobe tiene dos features que apuntan justo a esto:

- **Responsive Design – Position**: se ancla una capa a otra o al borde de la comp, de modo que
  **cuando el texto cambia de largo, lo de al lado se acomoda solo**.
- **Protected Regions**: se marca un tramo de la línea de tiempo como "no estirable", y el resto se
  estira cuando la plantilla cambia de duración.

Si esto se puede leer por script, no sólo resolvemos P4: **nos llevamos el modelo mental completo de
cómo una plantilla se adapta**, que es el problema difícil del producto entero.

### 8.3 `.aepx` — el proyecto de AE en XML

El `.aep` es binario, pero AE puede guardar como **`.aepx`, que es XML**. Si es así, el proyecto se
puede **leer sin AE**: el exportador podría parsear el archivo directamente en vez de pedirle todo por
scripting.

Eso cambiaría la arquitectura del paso 2: en vez de un script que recorre y serializa desde adentro,
un parser afuera. Más robusto, y no depende de que AE esté abierto.

`[VERIFICAR]` si el `.aepx` es XML legible de verdad o un blob binario envuelto en XML — sospecho que
puede tener partes codificadas, y eso definiría si sirve.

### 8.4 Master Properties — el mecanismo de "escenas que se encadenan"

Cuando anidás una composición dentro de otra, AE deja **exponer propiedades de la comp hija como
"Master Properties" en la capa padre**. O sea: una escena empaquetada con sus perillas afuera.

Eso es *exactamente* la pieza que falta para lo que pediste — "que la gente conecte escenas y arme un
video completo". Cada escena sería una comp con sus Master Properties expuestas, y encadenar sería
ponerlas en una comp padre.

### 8.5 Una regla de diseño que hay que decidir YA: nada de expresiones

Las **expresiones** de AE son código que corre en cada cuadro. Son potentísimas y **no se transpilan**:
no son datos, son un programa.

Si autoramos plantillas usando expresiones, el paso 2 se vuelve imposible salvo horneando cuadro por
cuadro. Propongo la regla ahora, antes de diseñar nada: **las plantillas se autoran con keyframes, no
con expresiones**. Se pierde comodidad al diseñar y se gana que el resultado sea portable.

Es la misma clase de decisión que el contrato de escena del motor: una restricción que duele un poco
al escribir y salva el sistema entero.

### 8.6 El MCP tiene que poder VER, desde el día uno

De la investigación de Raylight sacamos que su agente expone `render_stills` y `render_filmstrip` —
herramientas para que **el agente mire cuadros reales de su propio trabajo**. Y nuestro `CLAUDE.md`
exige lo mismo a mano.

El MCP de AE tiene que nacer con eso: una herramienta que renderice N cuadros de la comp y me los
devuelva como imagen. **Sin eso voy a estar diseñando a ciegas**, que es exactamente cómo salió mal el
prototipo de "recorrido" esta semana.

Y ya tenemos con qué cerrar el círculo: `tools/mirar-video.py` puede medir el render de AE y el render
del motor web **con la misma vara** — ritmo de corte, curva de movimiento, quietud. Eso convierte
"¿se parece?" en un número, y es la compuerta de fidelidad del paso 2.

### 8.7 Trampas chicas que cuestan una tarde cada una

- **Los keyframes de AE se indexan desde 1**, no desde 0. Clásico error de bucle.
- **El tiempo es en segundos con decimales**, no en cuadros. Convertir mal da desfases de un cuadro que
  se ven como un tirón.
- **`app.beginUndoGroup()` / `endUndoGroup()`**: sin eso, cada cosa que haga el MCP es imposible de
  deshacer a mano. Si Thiago va a mirar y corregir lo que hago, es imprescindible.
- **AE puede abrir diálogos modales** (fuente faltante, archivo no encontrado) que **cuelgan el
  script** esperando un clic. Un MCP que se cuelga sin decir por qué es peor que uno que falla.
