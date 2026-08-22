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

---

# PARTE II — lo que volvió de la investigación (2026-08-06)

10 frentes + crítico. **El crítico sólo recibió 4 de los 10** (el payload se cortó), así que sus
objeciones valen para esos cuatro; el resto lo leí yo.

---

## 9. Las preguntas abiertas, respondidas

### `[CERRADA A MEDIAS]` P1 — cómo hablarle a un AE abierto

**En el papel: resuelto.** `AfterFX.exe -r dispatcher.jsx` como **timbre**, más un **buzón de archivos
JSON** como canal de datos. La `-r` corre en la instancia abierta (y arranca una si no hay), pero en
Windows es **fire-and-forget**: no acepta argumentos, no devuelve nada, y su código de salida es ruido.
De ahí el buzón.

Y quedó bien cerrado lo de si Adobe lo está matando, que era mi miedo:

| camino | estado |
|---|---|
| **CEP** | **muerto** — Adobe declaró en 10/2024 que CEP 12 sería la última versión mayor |
| **UXP** | **no existe para AE** — Adobe no lo lista en su matriz de julio 2026 |
| **BridgeTalk** | fuera de la guía de scripting actual |
| **ExtendScript** | **vivo** — recibió API nueva en AE 26.0, 26.3 y 26.5, todas de 2026 |

O sea que el único camino disponible es además el único que no está sobre plataforma muerta. Eso es
suerte, no diseño, pero sirve.

**En la práctica: NO resuelto, y por un motivo que da vergüenza.** Cita del crítico:

> Nadie ejecutó `AfterFX.exe -r` ni una vez. **No hay AE en la máquina.** Dos frentes lo verificaron
> por separado y ninguno sacó la conclusión operativa: **el paso 0 del proyecto es instalar After
> Effects, y no está en el plan.** Diez frentes construidos sobre una herramienta que no existe.

Y lo que va a doler todos los días: **todos los modos de falla se ven igual desde afuera — un
timeout.** AE cerrado (arranca solo y tarda ~60 s), un diálogo modal abierto (bloquea el scripting **el
resto de la sesión**), la preferencia de escritura apagada, AE renderizando. Un agente iterando
animación hace cientos de llamadas: esto no es un caso borde.

### `[CERRADA]` P2 — cuánta fidelidad sobrevive

**Mejor de lo que temía en un punto, y peor en otro.**

**La conversión de curvas SÍ es exacta.** Yo había anotado que las manijas de AE son de velocidad e
influencia y que quizás no se pudieran convertir. Se puede: AE guarda un bezier cúbico, y velocidad e
influencia son ese mismo bezier en otras coordenadas. Un frente corrió la fórmula y da
`cubic-bezier(0.3333, 0, 0.6667, 1)` para el Easy Ease, que es la equivalencia canónica conocida. Y
otro comprobó que **GSAP 3.15 CustomEase la reproduce con error máximo 7.5e-4**, overshoot incluido.
Deja de ser exacta sólo en dos casos nombrables: posición espacial con trayectoria curva, y expresiones.

**Pero la frase del crítico es la que hay que llevarse:**

> **Viajan las curvas de velocidad; no viaja la imagen.**

Lo que se pierde, con nombre: los **efectos** (se lee *que* hay un Glow con radio 48; no se reproduce
el píxel del Glow de Adobe), los valores `CUSTOM_VALUE` (curvas de Curves, histograma de Levels), las
**expresiones**, el **motion blur** (se aproxima, no se iguala), el **renderer 3D** (luces, sombras,
materiales, DOF con iris de N lados), los **text animators**, y las **shape layers** — Trim Paths,
Repeater, Offset Paths, que son media animación gráfica moderna y **no los mencionó ni un frente**.

Y el corolario, que es la parte incómoda:

> Si el 80% de lo que hace que se vea caro son efectos + renderer + text animators, entonces el paso 2
> **no es una tarea de serialización: es reimplementar After Effects.** Ya existe un producto que hizo
> el subconjunto viable hace diez años y define empíricamente dónde está el techo: **Lottie**.

Nadie investigó Lottie como opción, sólo como cosa a descartar. Planear un exportador propio sin mirar
dónde se estrelló Lottie es planear repetir diez años de trabajo ajeno para llegar al mismo techo.

### `[CERRADA]` P3 — MOGRT

Un `.mogrt` es un **ZIP** con `definition.json` (la **declaración de controles, legible desde JS**) más
`project.aegraphic`, que contiene un `.aep` **RIFX binario** donde vive toda la animación. O sea: **se
puede leer qué es editable sin Adobe; no se puede leer el movimiento.**

Como modelo de qué es editable sirve y hay que copiarlo — pero conviene copiar el esquema del
**Describe API** de Adobe (público, limpio, versionado) y no el `definition.json` interno (no
documentado, con dos tablas de tipos que se contradicen).

Todo el autoring de MOGRT es scriptable desde AE 15.0. **Ojo con una trampa**: MOGRT soporta **sólo
Classic 3D**, así que el código de ejemplo que un frente propuso —que activa el renderer *Advanced 3D*
para tener profundidad de campo— **produce comps que no exportan**. Nadie verificó si Advanced 3D
exporta a MOGRT: la doc de Adobe dice que Cinema 4D y Ray-traced no, y **no dice nada de Advanced 3D**.
Está sin resolver, y es la diferencia entre tener DOF real o no tenerlo.

### `[CERRADA A MEDIAS]` P4 — el texto que no mide lo que medía

`sourceRectAtTime()` existe y es lo que yo esperaba. Y un frente **midió el problema en nuestro propio
repo**: el mismo hueco entrega **192 px de tipografía para ACME y 86 px para CONSTRUCCIONES DEL SUR
PATAGÓNICO — un 55 % menos**. `encaje()` garantiza que *entre*, no que siga siendo un titular.

La media solución ya está adentro: la compuerta `E-ENCAJE` construye cada escena con cuatro marcas de
largo distinto. **Falta el piso tipográfico**, que es exactamente la cláusula que hoy deja pasar los
86 px — y es un hallazgo que la auditoría ya tiene abierto (`kit.js:968`).

---

## 10. Lo que apareció y yo no sabía

### 10.1 Ya existe un MCP de AE que hace casi todo

`a-y-ibrahim/after-effects-mcp` — **MIT, 48 herramientas, último push el mismo día de la
investigación**. Tiene las dos piezas que importan:

- **`execute-script`**: ExtendScript arbitrario con timeout configurable. **Elimina el techo** de las
  APIs enlatadas.
- **`see-frame` / `contact-sheet` / `match-reference`**: el bucle visual para comparar contra una
  referencia y autocorregirse.

O sea: **lo que yo anoté en 8.6 como "el MCP tiene que poder ver desde el día uno" ya está
construido.** La mitad de la autoría se compra de la góndola.

El popular (Dakkshin, 546 estrellas) es el ancestro y es **peor** para esto: lista blanca de 19
comandos sin escape hatch, polling de 2000 ms, una sola ranura de comando.

Adobe lanzó su MCP oficial el 2026-04-28 junto con Anthropic, y **After Effects no está incluido**: no
hay camino oficial, pero tampoco riesgo de que Adobe pise a la comunidad.

### 10.2 Adobe renderiza AE en la nube por HTTP, y eso invalida un supuesto mío

**Dynamic Graphics Render API** (Firefly Services): renderiza `.mogrt` **y `.aep`** server-side, por
HTTP, **sin AE en tu infraestructura y sin licencia propia**.

Yo escribí arriba, como cosa decidida, que AE no puede estar en el camino del usuario. **Con DGR esa
afirmación es falsa.** Y si es viable, hace innecesario el 80 % del exportador y del runtime.

**Pero es el hallazgo con menos respaldo de todo el paquete**, y el crítico lo marca:

> Es el hallazgo etiquetado como que cambia la decisión, cambia la arquitectura completa, y está
> **100 % basado en leer developer.adobe.com**. Cero llamadas hechas. Cero token conseguido. **Cero
> precio.**

Es tier enterprise. Sin el precio no se puede decidir nada.

### 10.3 La trampa de pipeline que explica por qué el bloom porteado no se ve igual

**Todos los efectos de AE son 2D**: el glow se calcula sobre el ráster 2D de la capa **antes** de la
transformación 3D, así que **se deforma con el panel**. En three.js el bloom es post-proceso en espacio
de pantalla. **Son dos lugares distintos del pipeline**, y por eso el bloom porteado no se ve igual
aunque los números coincidan.

Esto lo viví ayer recreando Gemini, sin saber que tenía nombre.

### 10.4 Adobe Fonts es un bloqueo duro, no una molestia

Las cláusulas 3.4(E)(1), (7), (11) y (12) prohíben self-hostear el archivo de fuente, copiarlo de la
carpeta sincronizada de tu propia PC, hostearlo para tus clientes, y usarlo en una **Reseller
Platform** — que es **la definición literal de cliping.ia** si el usuario elige tipografía.

La licencia de AE **no** es el problema: diseñar y vender el resultado está permitido y retenés la
propiedad. **Las fuentes sí.** Regla operativa: las plantillas se autoran **sólo con tipografías de
licencia libre**, las que ya están en `tools/fonts/`.

### 10.5 ExtendScript es ES3, y eso necesita una compuerta

Sin `let`, sin `const`, sin arrow functions, sin `map`/`filter`/`forEach`/`indexOf`. **El modelo escribe
ES2020 por defecto.** Cada `const` que yo genere es un error de sintaxis dentro de AE que vuelve como
un **timeout ambiguo**.

El crítico propone la compuerta y tiene razón: **validar el JSX generado con `acorn` en
`ecmaVersion: 3` antes de mandarlo al buzón.** Es una tarde de trabajo y convierte una clase entera de
timeouts ambiguos en un error legible. Encaja exacto con la filosofía del repo: cazarlo al construir
sale más barato que verlo en un cuadro.

---

## 11. `[ABIERTO NUEVO]` P5 — la aritmética que nadie sumó, y que puede matar el bucle

Dos hallazgos de dos frentes distintos que nadie multiplicó:

- Un cuadro a 1024 px cuesta **~18k tokens**.
- Claude Code corta la salida de una herramienta en **25k tokens**.

O sea **un cuadro por llamada**. Y el `CLAUDE.md` de este repo exige **entre 10 y 15 cuadros** para
juzgar algo. Son 10-15 llamadas, **~200k tokens: una ventana de contexto entera para juzgar UNA
animación** — multiplicado por las decenas de iteraciones que necesita afinar un ease.

**Ése es el costo real del bucle de autoría, y hay que resolverlo antes de empezar.** Ideas: hojas de
contacto de 6-9 cuadros en UNA imagen (que es justo lo que hace `contact-sheet` del MCP que ya existe),
y medir por programa con `mirar-video.py` en vez de mirar, dejando los ojos para el veredicto final.

---

## 12. `[ABIERTO NUEVO]` P6 — la pregunta que ningún frente hizo

> Los cuatro frentes resolvieron cómo mandar un comando a AE y qué comandos existen. **Ninguno
> preguntó si el modelo puede escribir movimiento bueno.**

Y hay evidencia en este mismo repo de que no, sin ayuda: las 113 animaciones FX de calibre AE
necesitaron **32 arreglos manuales** después de una auditoría cuadro por cuadro. Esta semana mi
prototipo de `recorrido` falló por lo mismo: no por falta de capacidad, por falta de coreografía.

> **El problema nunca fue el transporte. AE no lo resuelve — AE es un lienzo más grande donde el mismo
> problema tiene más superficie para salir mal.**

Es la objeción más importante del informe entero y no tiene respuesta todavía.

---

## 13. El plan de un día, que es lo único que importa ahora

**Paso 0 — instalar After Effects.** No es programar y no estaba en el plan. **Decidir la versión antes
de descargar 30 GB**: si DGR entra en consideración es AE 2025, no 26 (DGR es compatible con MOGRTs de
AE 2025 o anterior). Y prender Preferences → Scripting & Expressions → *Allow Scripts to Write Files
and Access Network*.

**Lo que NO hay que hacer el día 1: escribir el servidor MCP.** Ya hay uno gratis y probado. Meterlo
primero pone una capa de indirección entre nosotros y el único experimento que importa.

**Prueba 1 · ¿suena el timbre? (30 min)** Un `.jsx` de cinco líneas que escriba un archivo, lanzado con
`AfterFX.exe -r`. Se mide: si aparece el archivo, **cuánto tarda** (esa es la latencia real por llamada,
el número que decide si el bucle es viable), y si el proceso vuelve antes o después. Resuelve de una la
contradicción entre frentes sobre si `-r` es síncrono.

**Prueba 2 · ¿los fallos son distinguibles? (30 min)** El mismo script con la preferencia apagada, con
un diálogo modal abierto, y con AE renderizando. **Es la prueba que nadie planeó y la que va a doler
todos los días.**

**Prueba 3 · LA QUE DECIDE (2 h).** Un texto que entra con *whip* —eases asimétricos, motion blur,
obturador 180°— renderizado en AE a 3 cuadros. Después **el mismo movimiento en nuestro motor**,
convirtiendo los eases a cubic-bezier. Los mismos 3 cuadros. Se miran los 6 a resolución completa, de a
uno, nunca en tira reescalada. Pregunta binaria: **¿son la misma imagen?**

> Si a los 3 cuadros del caso más simple posible las dos imágenes ya se ven distintas, **el paso 2 del
> plan está muerto**, y la decisión pasa a ser DGR o AE en el camino del render. Cuesta dos horas
> averiguarlo, no semanas.

**Prueba 4 · el precio de DGR (1 h, y no es código).** Preguntarle a Adobe el piso comercial de Firefly
Services. **Un solo número reordena toda la arquitectura**, y es lo único de la lista que no puedo
hacer yo.

---

## 14. La estimación, para que esté escrita

**16 a 29 semanas-persona (4 a 7 meses)** antes de tocar la UI web de edición. Y el costo **no está
donde parece**: el MCP es lo barato (hay más de seis implementaciones abiertas, una de un empleado de
Adobe); lo caro es el exportador, y que el runtime tenga que reimplementar la semántica de render de AE.

Con la frase que hay que releer antes de arrancar: **el subconjunto exportable es exactamente el
subconjunto que NO hace que se vea caro.**

---

# PARTE III — lo que se construyó y se verificó sin AE (2026-08-06)

Tres cosas, mientras After Effects no está instalado. Las tres verificadas corriendo, no razonadas.

## 15. `[HECHO]` La compuerta ES3 — `tools/ae/es3-check.mjs`

Caza JavaScript moderno antes de mandarlo a AE. Probada en las dos direcciones, que es lo que hace que
una compuerta valga:

- Un archivo escrito como lo escribiría yo por defecto: **16 defectos cazados**, salida 1.
- Un archivo en ES3 válido: **verde**, salida 0.

**El falso positivo que tuve que arreglar, porque es la lección.** La primera versión sacaba las
cadenas reemplazándolas por espacios, así que `["uno", "dos"]` quedaba como `[     ,      ]` y disparaba
la regla de coma final: **acusaba a código ES3 perfectamente válido.** Ahora reemplaza por `x`, que
conserva la estructura y pierde el contenido. Una compuerta que acusa en falso se aprende a ignorar, y
después no ve el defecto de verdad — es lo mismo que dejó escrito `encuadre-check` en su cabecera.

Es un **escáner, no un parser**, y está dicho en el archivo. Con `acorn` en `ecmaVersion: 3` sería
estrictamente mejor; no se hizo así porque no hay acorn en el repo y no se quiso agregar dependencia.

## 16. `[HECHO]` El conversor de curvas — `tools/ae/curvas.mjs`

**Es la pieza central del paso 2** y ahora está verificada.

La cuenta: influencia es el porcentaje del intervalo de tiempo que ocupa la manija (la X), y velocidad
por `dt/dv` es la pendiente (de ahí sale la Y). Son el mismo bezier en otras coordenadas.

```
x1 = i1/100                  y1 = (s1 · dt/dv) · x1
x2 = 1 − i2/100              y2 = 1 − (s2 · dt/dv) · (i2/100)
```

Lo que se midió corriendo:

| prueba | resultado |
|---|---|
| Easy Ease → bezier canónico `(0.3333, 0, 0.6667, 1)` | error **1.11e-16** |
| Mi evaluador contra **GSAP CustomEase**, 6 casos × 200 muestras | error máximo **5.8e-4** |
| Overshoot (velocidad 260 → `y1 = 1.04`) | reproducido |
| `dv = 0` | devuelve lineal y lo **marca** como degenerado |

**Qué significa: el motor web puede consumir curvas de AE sin escribir un interpolador propio.** Se le
pasa la cadena a `CustomEase` y listo.

Y queda escrito dónde deja de ser exacta: trayectorias espaciales curvas (ahí el ease gobierna el
avance por largo de arco, no por eje) y expresiones.

## 17. `[HECHO]` Auditoría de la dependencia — y cambia la recomendación

El crítico marcó que el plan iba a depender de un paquete que nadie miró. Miré los dos, con datos de
npm:

| | `@kumoproductions/mcp-aftereffects` | `after-effects-mcp` (a-y-ibrahim) |
|---|---|---|
| versión | 0.2.0 | **1.11.1** (8 versiones desde el 07/07) |
| **Node que pide** | **>= 24** | **>= 18** |
| SDK de MCP | `@modelcontextprotocol/sdk` ^1.29 | `~1.9.0` |
| última publicación | 2026-08-12 | **2026-08-13** |
| licencia | MIT | MIT |

**Las dos preguntas del crítico, contestadas:**

1. **¿Contra qué era del protocolo están escritos?** Los dos usan `@modelcontextprotocol/sdk` de la
   **línea v1**, que es la era *legacy*. Y el Claude Code de esta PC es un cliente legacy. **Legacy con
   legacy funciona**: no hay desajuste de protocolo. El riesgo que el crítico marcó como "verificación
   de dos minutos que nadie hizo" no existe.

2. **¿Node?** Acá está el dato que decide: tenemos **Node 20.16.0**. El de kumoproductions pide **>= 24**
   — no corre sin actualizar Node, y actualizar Node toca el motor 3D, Playwright y el build. El de
   a-y-ibrahim pide **>= 18**: **corre tal cual**.

**Recomendación, corregida respecto de lo que decía el informe:** `after-effects-mcp` de a-y-ibrahim.
No sólo tiene las herramientas que importan (`execute-script` para no tener techo, y
`see-frame`/`contact-sheet` para el bucle visual): además **es el que corre en el Node que tenemos** y
el que tiene ocho versiones publicadas en cinco semanas contra 0.2.0 del otro.

Queda un `[ABIERTO]` que sólo se puede cerrar con AE instalado: **si instala algo adentro de AE** y
cómo. Y una advertencia de método: "MIT y en npm" sigue sin ser "mantenido para siempre". Si el
proyecto avanza, esto se vendorea o se forkea.

---

## 18. Estado del tablero

| pieza | estado |
|---|---|
| Compuerta ES3 | **hecha y verificada** |
| Conversor de curvas | **hecho y verificado contra GSAP** |
| Auditoría de la dependencia | **hecha** — gana a-y-ibrahim, corre en nuestro Node |
| Instalar AE | **bloqueado — depende de Thiago.** Prueba de 7 días alcanza para las 4 pruebas |
| Precio de la API de Adobe en la nube | **bloqueado — sólo lo puede preguntar Thiago** |
| Pruebas 1 a 4 | esperando AE |

Las cuatro pruebas suman ~4 h. La de 7 días alcanza de sobra para correr **la que decide** antes de
poner un peso.

---

# PARTE IV — la primera vez que esto toca la realidad (2026-08-06)

After Effects **26.3x87** instalado en la PC de Thiago. Windows 10, que Adobe ya no soporta: el
instalador avisó que las futuras versiones no se van a poder instalar y que el rendimiento podría
verse afectado. **Queda anotado como primer sospechoso**: si AE se cuelga o va raro, es candidato
antes que un bug nuestro. Sin esta nota, un AE inestable se vería igual que un defecto propio, porque
los dos se manifiestan como un timeout mudo.

---

## 19. `[CERRADA CON EJECUCIÓN]` P1 — el canal existe y anda

La primera sonda: cinco líneas de ES3 que escriben un archivo con la versión de AE y la hora.

**El canal funciona.** `AfterFX.exe -r` llega a la instancia **que ya estaba abierta**, ejecuta el
script y escribe el archivo. Deja de ser "resuelto en el papel".

### La latencia, que es el número que decide si el bucle es viable

Cinco corridas seguidas, midiendo desde antes de lanzar hasta que el archivo cambia:

| corrida | lanzador | archivo | diferencia |
|---|---|---|---|
| 1 | 1066 ms | 1106 ms | 40 |
| 2 | 1015 | 1015 | 0 |
| 3 | 1014 | 1015 | 1 |
| 4 | 1026 | 1026 | 0 |
| 5 | 1013 | 1014 | 1 |

**Mediana 1015 ms. Muy estable: entre 1014 y 1106.**

Lo que significa en la práctica: **cien llamadas son casi dos minutos de puro transporte.** El segundo
entero es arranque de proceso, no ejecución — el script tarda 2 ms. Consecuencia de diseño: **hay que
agrupar operaciones en una sola llamada**, no mandarlas de a una. Es exactamente el argumento que hace
buena a la `apply_edits` de Raylight, que acepta hasta 50 operaciones por llamada.

### `-r` es ASÍNCRONO. Resuelto, y casi me equivoco

Los dos frentes de la investigación se contradecían: uno decía síncrono, otro fire-and-forget.

**Y en las cinco corridas de arriba no se puede distinguir**: el archivo aparece a los 0-1 ms de que
vuelve el lanzador. Estuve a punto de concluir "asíncrono" por los 40 ms de la primera corrida, que
son ruido de primera ejecución. **Con un script que tarda 2 ms, sync y async se ven idénticos.**

La prueba que sí lo distingue es un script LENTO — uno que duerme 3 segundos adentro de AE:

```
el lanzador VOLVIO a los   1096 ms
el script TERMINO a los    3502 ms
```

**El lanzador vuelve mientras el script sigue corriendo.** Es asíncrono, sin ambigüedad.

**Consecuencia dura: el buzón de archivos es obligatorio.** Leer el resultado apenas vuelve el proceso
devuelve un archivo a medio escribir — y eso no falla ruidosamente, falla con datos corruptos
intermitentes, que es la peor clase.

**Y la lección de método, que vale más que el dato:** medí lo correcto con el instrumento equivocado.
Un script rápido no puede responder una pregunta sobre sincronía. Es la misma familia de error que las
cajas envolventes contra los vértices de la semana pasada: el número era real y la conclusión habría
sido falsa.

## 20. `[CERRADA]` La preferencia de escritura: se lee, pero no bloquea lo que yo creía

La clave es `Pref_SCRIPTING_FILE_NETWORK_SECURITY` en `Main Pref Section`, y **se lee bien**: devolvió
`0` con la casilla desmarcada y `1` después de marcarla. O sea que **el MCP va a poder
autodiagnosticarse** — preguntarle a AE si la preferencia está puesta, en vez de adivinar.

**Pero con la preferencia en 0 el script escribió el archivo igual.** O sea que esa preferencia **no
gobierna `File.write()`** en AE 2026 — probablemente sólo el acceso a red.

Importa para el diagnóstico: uno de los cuatro modos de falla que el crítico listó como
indistinguibles (*"la preferencia apagada → timeout"*) **no es un modo de falla para escribir
archivos**. Queda por ver si lo es para red.

## 21. `[CERRADA CON EJECUCIÓN]` La primera autoría de verdad: keyframes escritos por mí en AE

Hasta acá AE sólo había escrito un archivo de texto. Esta sonda **crea una composición, una capa de
texto, keyframes de posición / escala / opacidad y les pone curvas**. Es la primera vez que el canal
se usa para lo que existe. Queda en `tools/ae/sondas/autoria.jsx`.

Costó cuatro corridas y tres diálogos modales, y cada uno enseñó algo que no estaba en ninguna
documentación que había leído.

### 21.1 El error que se come a sí mismo: `"" + excepción` es FATAL en ExtendScript

El más caro de los tres, y el que hay que grabar a fuego.

```js
try { escala.setTemporalEaseAtKey(1, [e], [e]); } catch (ex) { falla = "" + ex; }   // MATA EL SCRIPT
```

La llamada falla (era esperable, estaba probando aridades). El `catch` la agarra bien. Y entonces
**muere en el `"" + ex`**: ExtendScript se niega a convertir un `Error` a cadena de forma implícita y
tira *"Se encontró un objeto de tipo Error, donde se requiere un número, un conjunto o una
propiedad"*. Ese segundo error ya no lo agarra nadie.

**El manejo del error es lo que mata al script.** Es la peor forma posible de fallar para un MCP: el
fallo aparece exactamente cuando ya había algo que reportar, y borra el reporte. Y encima el diálogo
apunta a la línea del `try`, así que uno acusa a la llamada de AE — que era inocente — en vez del
`+`. Yo acusé primero al `catch` de pisar la variable; la sonda imprimió la variable después del
`catch` y estaba intacta. Hipótesis mía, refutada por medición.

La cura es una función:

```js
function texto(x) {
  if (x === null) { return "null"; }
  if (x === undefined) { return "undefined"; }
  try { return x.toString(); } catch (noSePudo) { return "<inconvertible>"; }
}
```

**Esto va derecho a la skill y además debería ser regla de la compuerta ES3**: prohibir concatenar
la variable de un `catch`.

### 21.2 El registro tiene que escribirse SOBRE LA MARCHA

La v2 juntaba todo en memoria y escribía el archivo al final. Murió en la línea 41 y **no dejó una
sola línea**: me enteré de lo que había pasado por una foto de la pantalla que sacó Thiago.

Un script que sólo deja rastro si termina bien no sirve justo el día que algo sale mal — y para un
MCP, "algo sale mal" es el caso de uso. La v3 abre y cierra el archivo en cada paso. Es lento y no
importa: la lentitud está del lado que sobra.

Con eso puesto, el mismo fallo pasó de *"no escribió nada, andá a mirar la pantalla"* a diez líneas
que decían exactamente hasta dónde llegó.

### 21.3 Cuántos eases quiere cada propiedad — la regla, con su excepción

La v1 murió pasándole tres eases a Position. En vez de parchear esa llamada, la sonda **prueba de 1 a
4 en cada propiedad y anota qué contesta AE**:

| propiedad | componentes del valor | eases que acepta |
|---|---|---|
| **Posición** | 3 | **1** |
| Escala | 3 | 3 |
| Opacidad | 1 | 1 |

La regla es *"un ease por componente"* — **y Posición es la excepción**, porque su curva no gobierna
cada eje sino el avance sobre la trayectoria. Es exactamente la limitación #1 que `curvas.mjs` ya
declaraba desde el papel; ahora está confirmada del otro lado, en la API.

**Y hay una forma de no depender de esta tabla nunca más:** `keyOutTemporalEase()` devuelve un
arreglo **de la longitud correcta** (1 para posición, 3 para escala, 1 para opacidad). O sea que el
código genérico no adivina — **lee primero, y escribe con la misma longitud que leyó.** Eso funciona
también para las propiedades que no probé.

### 21.4 La constante 33.333333, que estaba adivinada

`tools/ae/curvas.mjs` tenía `EASY_EASE = { influencia: 33.33 }`, sacada de la equivalencia publicada.
Nunca se la había preguntado a AE.

Primero comprobé que AE **guarda fiel**: le pedí `33.3333333333333` y me devolvió
`33.3333333333333`. Pero eso no prueba nada sobre el preset — sólo que no redondea lo que le dan.

Para la pregunta de verdad hay que ejecutar el comando de menú. Que trajo su propia lección:

```
menu 'Easy Ease'          -> id 0
menu 'Aceleración suave'  -> id 2511
```

**`findMenuCommandId` va por el nombre en el idioma de la interfaz.** Este AE está en español. Un MCP
que busque `"Easy Ease"` funciona en la máquina del que lo escribió y falla en la del cliente, con id
`0` y sin error — silencioso. Hay que probar una lista de nombres y anotar cuál respondió.

Con el comando real ejecutado, AE pisó mis trece decimales con los suyos:

```
EASY EASE DE VERDAD ('Aceleración suave'): salida influencia=33.333333  velocidad=0
```

**33.333333, seis decimales.** `curvas.mjs` ya dice eso, y dice de dónde salió el número. La
diferencia contra el `33.33` anterior es 3.3e-5 en el bezier — invisible. Pero ahora es un dato
medido y no una cita, que es la diferencia entre saber y acordarse.

*(Queda un cabo suelto honesto: el ease de ENTRADA del segundo keyframe quedó en 33.3333333333333,
o sea que el comando de menú no lo tocó. No sé si es porque `setSelectedAtKey` no dejó los dos
seleccionados a la vez o porque el comando escribe sólo de un lado. No afecta la constante — la
lectura del lado de salida es limpia — pero está sin explicar.)*

### 21.5 CORRECCIÓN: la "firma de los 20 segundos" no existe

En la parte IV anoté como hallazgo prometedor que un diálogo modal daba ~20 s de lanzador contra ~1 s
sano, y que eso serviría para detectar un AE trancado **midiendo el reloj**.

**Es falso.** En estas corridas hubo modal con lanzador de **1071 ms** y de **1100 ms** — indistinguible
de una corrida sana. La primera vez que vi 20 s fue coincidencia de otra cosa.

Lo que sí funciona es lo aburrido: **el buzón nunca recibe el centinela**. Por eso el script termina
con `anotar("--- fin ---")` y el lanzador espera esa marca, no la existencia del archivo — que con
escritura incremental aparece enseguida y no significa nada.

Me creí una señal con n=1. Es la misma familia de error que la caja envolvente contra los vértices, y
que el script rápido para medir sincronía: **una medición sola no distingue una firma de una
casualidad.**

### 21.6 Los mensajes de error de AE vienen traducidos

```
Error de After Effects: No se puede llamar a "setTemporalEaseAtKey" a causa del parámetro 2.
El conjunto de valores no tiene 3 elementos.
```

En español, y en UTF-8 (mi lector de PowerShell los mostró rotos hasta que le puse `-Encoding UTF8`).

Un MCP que decida qué hacer **leyendo el texto del error** funciona sólo en el idioma en que se
escribió. Los errores se pueden registrar y mostrar, pero no se pueden usar para ramificar lógica.

## 22. Lo que sigue

Prueba 3, la que decide: el mismo movimiento autorado en AE y reproducido en el motor, tres cuadros
de cada uno a resolución completa, ¿son la misma imagen?

Ya no falta nada para armarla — la sonda de autoría escribe keyframes y `curvas.mjs` convierte las
curvas con la constante medida.

### Notas acumuladas para la futura skill

1. **Agrupar operaciones.** El transporte cuesta 1015 ms y la ejecución 2 ms.
2. **Nunca `"" + excepción`.** Se usa `.toString()` adentro de su propio `try`.
3. **Escribir el registro paso a paso**, no al final. El rastro importa cuando el script muere.
4. **Un centinela de fin explícito.** La existencia del archivo no es señal de nada.
5. **Leer la aridad antes de escribirla** con `keyOutTemporalEase().length`, en vez de tablas.
6. **Los nombres de menú son del idioma de la interfaz.** Probar una lista; `id 0` falla mudo.
7. **No ramificar por el texto de un error de AE**: viene traducido.
8. **Toda sonda es idempotente**: borra su propia composición antes de crearla. Esto se corre cien
   veces, no una.

---

# PARTE V — LA PRUEBA 3, la que decidía si esto era viable (2026-08-13)

**Resultado: pasa.** La conversión temporal de After Effects viaja a nuestro lado con un error de
**0,0001 a 0,016 px** sobre 286 cuadros de 1920×1080 repartidos en nueve movimientos, contra un piso
de ruido del instrumento de **0,0014 px**.

Pero el resultado importa menos que cómo se llegó, porque **la primera versión de esta prueba daba
cinco verdes y tenía un falso positivo demostrable.** Esa historia es la parte útil.

Herramientas: `tools/ae/sondas/prueba3.jsx` (lado AE), `tools/ae/prueba3.mjs` (lado nuestro),
`tools/ae/png.mjs` (lector de PNG sin dependencias). Todo con `node tools/ae/prueba3.mjs --ae`.

## 23. La v1 pasaba y no probaba: el factor `dt` nunca se ejecutó

La v1 tenía cinco casos y un poder discriminante de 686 px contra la interpolación lineal. Se veía
contundente. Una crítica adversarial del diseño —lanzada antes de construirla, y leída después—
encontró esto:

> Cuatro de los cinco casos tenían **velocidad 0** en los dos lados. Con velocidad 0, la conversión
> `y1 = velocidad · (dt/dv) · x1` colapsa a `y1 = 0, y2 = 1` **sin importar cuánto valga `dt`**. El
> único caso con velocidad ≠ 0 tenía `dt = 1`, que es el neutro de la multiplicación.

Se comprobó antes de aceptarlo, y es cierto: **una conversión a la que le falte por completo el
factor `dt` da 0,0000 px de diferencia en los cinco casos de la v1.** Con `dt = 0,4` ese mismo error
vale 416 px.

O sea: el término más frágil de la fórmula —el que tiene unidades, donde vive un error de px/s contra
px/cuadro— no se había ejecutado ni una vez, y la prueba informaba éxito.

**La lección, que vale más que el arreglo: un caso que pasa no es un caso que prueba.**

## 24. La prueba de mutación reemplaza al control negativo

La v1 medía "cuánto se aparta nuestra curva de una interpolación lineal". Eso es un espantapájaros:
nadie iba a implementar interpolación lineal. Los errores que de verdad se cometen convirtiendo curvas
de AE son otros, y ahora se implementan **a propósito** para comprobar que el conjunto de casos los
mata:

| mutante | qué hace mal | peor error que produce |
|---|---|---|
| `intercambiado` | usa el ease de entrada donde va el de salida | **1280 px** |
| `sin-dt` | olvida el factor `dt` de la normalización | **1029 px** |
| `influencia-cruda` | trata la influencia como 0–1 en vez de 0–100 | **677 px** |
| `sin-complemento` | `x2 = i2/100` en vez de `1 − i2/100` | **581 px** |

Los cuatro mueren. Y el programa **exige que mueran**: un mutante que sobrevive es un agujero de la
prueba, no una victoria, y pone el veredicto en rojo.

`sin-dt` es el que cierra el falso positivo: en la v1 habría dado 0,0 px en todos los casos.

## 25. Tres columnas en vez de una: separar la conversión del instrumento

La sonda vuelca `valueAtTime` de cada cuadro. Es **una línea** y es lo que más devuelve de toda la
lista, porque separa dos preguntas que la v1 sumaba en un número solo:

| columna | compara | qué aísla |
|---|---|---|
| predicción vs `valueAtTime` | matemática contra matemática | **la conversión**, sin píxeles de por medio |
| `valueAtTime` vs centroide | la matemática de AE contra su render | **el instrumento** |
| predicción vs centroide | lo que la v1 tenía | el total |

Sirvió inmediatamente. El caso de la **escala** daba 0,125 px, doce veces peor que los de posición, y
la explicación fácil habría sido "la conversión falla con tres eases". Con las tres columnas se ve que
la conversión da **0,0001 px** y los 0,125 son del instrumento: AE remuestrea el sólido al escalarlo y
el perfil de alfa de un borde escalado no es una caja perfecta. Sin esta separación se habría gastado
trabajo arreglando algo que no estaba roto.

## 26. La influencia 0, que costó 0,6 px y era una defensa mía

Dos casos daban ~0,6 px de error de conversión — **425 veces el piso de ruido** — mientras el resto
estaba en 0,0001. Los dos tenían algo en común: un keyframe cuyo ease lo calculó **AE por su cuenta**
(el del medio de una cadena, y el lado que queda contra un tramo lineal).

Lo que AE devuelve en esos casos:

```
KEY|P3-E|pos|2|0.35|600;540;0|1|0;0|0;0        <- velocidad 0, INFLUENCIA 0
```

Y `aeACubicBezier` tenía esto:

```js
const i1 = Math.min(100, Math.max(0.1, salida.influencia))
```

**La documentación de Adobe dice que la influencia va de 0,1 a 100. AE devuelve 0.** El recorte
silencioso movía `x1` de 0 a 0,001 y eso eran los 0,6 px.

O sea que el defecto no estaba en la conversión sino en **una defensa contra un rango documentado que
el propio programa no respeta**. Corregido: E pasó de 0,5959 a **0,0156 px** e I de 0,6281 a
**0,0001 px**.

> **Cuando la documentación y el programa se contradicen, gana el programa.** Y un recorte silencioso
> convierte un dato real en uno inventado — después el error se le atribuye a la fórmula.

## 27. Un defecto real del conversor, encontrado por la prueba

Los tramos con tipo de interpolación **HOLD** daban 500 px de error en un solo cuadro. No era el
experimento: era el conversor.

```js
while (j < keys.length - 2 && t > keys[j + 1].t) j++     // con `>`, mal
```

Con `>`, un cuadro que cae **exactamente** sobre un keyframe se queda en el tramo anterior. Si ese
tramo era HOLD, devuelve el valor viejo. En producción sería un salto de un cuadro justo en el corte:
el defecto típico que se ve y no se sabe de dónde viene. La prueba lo caza porque los keyframes caen
en tiempos de cuadro exactos.

## 28. Dos cosas que AE hace y no están en ninguna documentación que leí

### 28.1 Un keyframe creado por script nace con interpolación espacial LINEAL

El caso de la trayectoria curva ponía tres keyframes con `y` distinta esperando que AE aplicara su
auto-bezier espacial, como hace cuando uno anima a mano. **No lo hace:** el volcado devolvió tangentes
`0;0;0` y `keySpatialAutoBezier = no`. Hay que pedirlo explícitamente con
`setSpatialAutoBezierAtKey(k, true)`.

Importa mucho más allá de esta prueba. **El MCP va a autorar por script, así que sus trayectorias van a
ser rectas por defecto y no se van a parecer a lo que un animador obtiene haciendo lo mismo en la
interfaz.** Es una diferencia silenciosa entre "lo que hace Claude" y "lo que hace una persona".

### 28.2 La posición 2D se convierte 100 veces peor que una dimensión separada

Un patrón que sale limpio de la tabla:

| tipo de propiedad | casos | error de conversión |
|---|---|---|
| Posición 2D/3D | A, B, E | 0,0084 – 0,0156 px |
| Dimensión **separada** (escalar) | C, D, G, I | 0,0001 – 0,0002 px |

Cien veces de diferencia, correlacionada exactamente con el tipo de propiedad y no con la dificultad
de la curva (el caso del sobrepaso, que es el más agresivo, está entre los mejores).

La explicación que propongo —y la marco como hipótesis, no como medición— es que para una Posición
vectorial AE recorre la trayectoria **por largo de arco**, y lo hace con una tabla discretizada
interna; una dimensión separada es un escalar puro y no pasa por ahí. Si es cierto, la consecuencia
práctica para el MCP es directa: **conviene autorar con dimensiones separadas**, que además es lo que
hace cualquier animador.

En términos absolutos los dos números son irrelevantes para el ojo. Importa como señal de dónde vive
la aproximación.

## 29. El piso de ruido, sin el cual ningún umbral significa nada

Un caso mide el sólido **quieto** en posiciones fraccionarias:

```
x pedida 300.25  ->  centroide 300.2510   error +0.0010 px
x pedida 300.37  ->  centroide 300.3686   error -0.0014 px
x pedida 300.63  ->  centroide 300.6314   error +0.0014 px
```

**Piso = 0,0014 px**, y de paso queda contestada una pregunta que estaba abierta: **AE rasteriza en
subpíxel**. Si cuantizara a píxel entero, el error sería una escalera de ±0,5 px que pasaría el umbral
de 1 px igual — y uno concluiría "la conversión es exacta a medio píxel" habiendo medido el redondeo
de AE, no la conversión.

Con el piso medido hay **dos umbrales** en vez de uno haciendo mal los dos trabajos:

- **perceptual, 1 px** — decide si esto es viable. Lo es, con 70× de margen.
- **de regresión, 0,007 px (5× el piso)** — protege el código de acá en adelante. Sin él, el error
  podría multiplicarse por setenta y la prueba seguiría en verde.

## 30. Cómo se mide una posición con precisión de milésima de píxel

**El peso es el alfa.** Un rectángulo en posición fraccionaria deja los píxeles del borde a medio
pintar. Contando con umbral ("alfa > 128 cuenta"), la posición saltaría de a un píxel entero y no se
podría distinguir un error de la conversión del redondeo del instrumento.

Para la escala se miden **ancho y alto por separado**, no `sqrt(área)`: para un rectángulo alineado a
ejes, una columna que cruza el interior suma exactamente `alto·255` y una fila `ancho·255`. `sqrt(área)`
promedia los dos ejes **por construcción**, con lo cual una escala que anima X e Y con curvas distintas
—un *squash and stretch*, lo más normal del mundo— sería invisible.

Y el instrumento se verifica **en cada cuadro**: que la huella mida lo que tiene que medir, que no
toque el borde del cuadro (si el objeto se sale, el centroide es el de su parte visible y se corre
hacia adentro, lo que se leería como "la conversión falla en la entrada"), y que el PNG tenga canal
alfa.

El lector de PNG es propio (`tools/ae/png.mjs`, `node:zlib`, cero dependencias) por dos razones: en
esta máquina `getImageData` ya llegó a 28 GB y la colgó, y **dibujar una imagen en un lienzo para
después leerla no es una lectura, es una composición** — pasa por el suavizado al escalar y por cómo el
lienzo interpreta el alfa, y cualquiera de las dos mueve un centroide de subpíxel.

## 31. `saveFrameToPng`: tres cosas que muerden

### 31.1 Respeta la resolución del VISOR

Con `resolutionFactor = [2,2]` el PNG de una comp de 400×200 sale **200×100**. El visor estaba en
"Mitad". Sin forzar `[1,1]`, cada posición habría salido dividida por dos y la conclusión habría sido
"la conversión de curvas está rota". El número real y la conclusión falsa, otra vez.

### 31.2 No se puede verificar desde adentro de AE, y falla mudo

`File.exists` devolvió **false** para cuatro PNG que estaban en disco medio milisegundo después. Y con
una carpeta destino inexistente **no tira excepción**: devuelve normal y el aviso sale como diálogo
modal **más tarde**, con el script ya terminado. O sea que `try/catch` no sirve. La verificación pasa
afuera y mira el contenido: `pngCompleto()` comprueba la firma y que el trozo `IEND` esté al final.

### 31.3 Es muy diferido

AE dejó el volcado de texto completo a los **4,9 s** y siguió escribiendo PNG durante **23 s más**. El
"listo" de un script no es el "listo" del trabajo.

## 32. La carrera que mordió dos veces, y la regla que la mata

1. La encuesta leyó el `--- fin ---` **de la corrida anterior**: el lanzador tarda ~1 s en llegar a AE
   y el archivo viejo seguía ahí.
2. Arreglado eso, un PNG estaba a medio escribir — y el verificador lo había dado por bueno, porque en
   ese instante lo que había en disco era **el archivo viejo, entero**. AE lo truncó después.

Las dos son **confiar en una señal que llegó antes que el trabajo**:

> **EL BUZÓN LO VACÍA EL QUE LLAMA, ANTES DE LLAMAR.** No lo puede vaciar el que contesta, porque
> cuando hay que vaciarlo el que contesta todavía no existe.

Y la sonda borra además los PNG de cada caso: si `saveFrameToPng` falla mudo en un cuadro, el archivo
de la corrida anterior queda ahí **completo, con su IEND, indistinguible de uno nuevo**.

## 33. Dos defectos de mi propio informe, del tipo que este repo ya tiene documentado

- **`Math.abs(null)` vale CERO.** El filtro estaba después del valor absoluto, así que "no hay dato
  para comparar" se convertía en "error perfecto de 0,0000 px". Un caso informó `0.0000 OK` sin haber
  medido una sola cosa.
- **El veredicto no leía la mitad de lo que calculaba.** En la v1, `discrimina` se computaba, se
  imprimía y **no entraba en `todoBien`**: los cinco casos podían decir `NO DISCRIMINA` y el programa
  imprimía "PRUEBA 3 OK" y salía con 0. Lo mismo los cuadros vacíos, y las `NOTA` que la sonda escribe
  cuando algo no sale como se pidió — se descartaban en silencio. Si `dimensionsSeparated` hubiera
  fallado, el caso del sobrepaso pasaba a ser una posición 2D donde el sobrepaso es geométricamente
  imposible, daba error chico y decía OK.

Es exactamente el patrón que CLAUDE.md documenta dos veces: **la salida dice una cosa y el código de
salida dice otra.**

## 34. Qué queda sin probar

Ahora la frontera está **medida** en vez de esquivada: el caso de trayectoria curva existe, tiene
tangentes espaciales no nulas, y el lector **se niega a convertirlo** con motivo, en vez de producir
algo parecido. Negarse es barato; "salió parecido" no se puede señalar con el dedo.

Sigue sin cubrirse:

- **Convertir trayectorias curvas** (hoy se rechazan, que es lo correcto, pero no se soportan).
- **Expresiones**: no son datos, son un programa. Se hornean o se reescriben.
- **Rotación** acumulando vueltas, y **opacidad**, donde AE recorta en 0–100 y un cubic-bezier con
  sobrepaso no — divergencia garantizada y es de lo primero que anima cualquiera.
- **Desenfoque de movimiento**, apagado a propósito, y es lo que más cambia la sensación.
- **fps no enteros** (29,97), 3D con cámara, efectos, modos de fusión.
- **La convención de muestreo del motor web**: esta prueba fija los valores en `t = k/30`; si el motor
  renderiza en el centro del cuadro queda medio cuadro corrido y esto no lo vería.
- **El motor web propiamente dicho.** Esta prueba compara los píxeles de AE contra un número calculado
  en Node. `curvas.mjs` valida su evaluador contra GSAP `CustomEase` a 5,8e-4, pero eso compara
  *funciones de easing*, no cuadros: no toca el reloj del motor, ni el origen, ni el orden de
  transformaciones. **La tercera columna —renderizar el mismo movimiento en el motor y medirlo con el
  mismo instrumento— es el próximo paso obvio.**

## 35. Qué significa para el proyecto

La afirmación que firmo con los datos que hay:

> La interpolación temporal de After Effects es, estructuralmente, un cubic-bezier en tiempo-valor
> normalizado, y nuestra conversión la reproduce con **0,0001 a 0,016 px** de error sobre trayectorias
> rectas, con dos y tres keyframes, ease simétrico y asimétrico, sobrepaso real, velocidades positivas
> y negativas, tipos HOLD / LINEAL / BEZIER encadenados, propiedades de uno y de tres eases, y en los
> dos ejes. Cuatro conversiones deliberadamente mal hechas producen entre 581 y 1280 px de error, o
> sea que la prueba discrimina con cinco órdenes de magnitud de margen.

Lo que **no** se firma todavía: que la animación portada se vea igual en el motor web. Eso es la
tercera columna y hoy no está medida.

### Notas acumuladas para la futura skill

1. **Agrupar operaciones.** El transporte cuesta 1015 ms y la ejecución 2 ms.
2. **Nunca `"" + excepción`.** ExtendScript no convierte un `Error` a cadena y ese error sí es fatal.
3. **Escribir el registro paso a paso**, no al final.
4. **Un centinela de fin explícito**, y el buzón lo vacía el que llama.
5. **Leer la aridad antes de escribirla** con `keyOutTemporalEase().length`.
6. **Los nombres de menú son del idioma de la interfaz**; `id 0` falla mudo.
7. **No ramificar por el texto de un error de AE**: viene traducido.
8. **Toda sonda es idempotente**, y borra también sus salidas viejas.
9. **Forzar `resolutionFactor = [1,1]`** antes de guardar cualquier cuadro.
10. **Pedir el auto-bezier espacial explícitamente**: por script no viene.
11. **Autorar con dimensiones separadas** cuando importe la fidelidad de la curva.
12. **Volcar SIEMPRE el tipo de interpolación y las tangentes espaciales.** Sin eso el formato no puede
    representar un corte, y una curva se convierte en una recta "parecida".
13. **Aceptar influencia 0.** La documentación dice 0,1–100 y AE devuelve 0.

---

# PARTE VI — LA TERCERA COLUMNA: ¿el motor web dibuja lo mismo? (2026-08-13)

**Sí, con 0,002 a 0,018 px de diferencia.** Y para llegar ahí hubo que encontrar tres trampas del
navegador y una de GSAP, ninguna de las cuales tiene que ver con After Effects.

La Parte V comparaba los píxeles de AE contra un número calculado en Node. Eso mide **un** eslabón de
dos:

```
AE ──(keyframes, curvas)──► documento de escena ──(GSAP + navegador)──► píxeles
      \_________ medido en la Parte V _________/   \___ no estaba medido ___/
```

Herramientas: `tools/ae/escena.mjs` (el documento), `tools/ae/motor/escena.html` (la página),
`tools/ae/motor/capturar.py` (Playwright), `tools/ae/motor-check.mjs` (la comparación).

## 36. El resultado, y de dónde viene el error que queda

| pieza | GSAP `CustomEase` | ease que **resuelve** el bezier | mejora |
|---|---|---|---|
| A · Easy Ease simétrico | 0,700 px | **0,0098 px** | 71× |
| B · influencia 80 vs 15 | 0,335 px | **0,0098 px** | 34× |
| C · sobrepaso, dt=0,4 | 0,382 px | **0,0020 px** | 194× |
| D · al revés, velocidad negativa | 0,516 px | **0,0020 px** | 262× |
| E · tres keyframes, medio auto | 0,598 px | **0,0176 px** | 34× |
| F · escala por eje | 0,369 px | 0,1255 px | 2,9× |
| G · movimiento en Y | 0,159 px | **0,0020 px** | 81× |
| I · HOLD + LINEAL + BEZIER | 0,104 px | **0,0020 px** | 53× |

**El residuo de `CustomEase` estaba predicho y nadie lo había leído así.** `curvas.mjs` mide desde el
primer día que su evaluador y `CustomEase` difieren en `5,51e-4`. Sobre el recorrido de 1300 px del
caso A eso son **0,72 px** — y el píxel midió **0,70**. La predicción de papel y la medición sobre
imagen coinciden.

Lo que estaba mal leído era la conclusión. `curvas.mjs` cerraba diciendo *"el motor web puede consumir
curvas de AE sin escribir un interpolador propio"*. Es cierto **y engañoso**: se puede, y cuesta entre
34 y 262 veces más error. Ya está corregido en el propio archivo.

> **Para producción: pasarle `evaluar` a GSAP como función de ease, no la cadena.** GSAP acepta una
> función; resolver el bezier con Newton es lo que hace el navegador con `cubic-bezier()` de CSS.

Y con eso, la columna `propio` reproduce **exactamente** los errores del lado de Node (A: 0,0090 en los
dos lados; E: 0,0155 contra 0,0156). O sea que el navegador no agrega error propio: lo que llega es lo
que nuestra conversión calculó.

Los 0,1255 px de F son el instrumento midiendo una huella escalada, ya identificados en la Parte V.

## 37. Tres trampas del navegador, ninguna de After Effects

### 37.1 `left`/`top` encajan a píxel entero

La primera versión de la página posicionaba con `left`, y el motor pintó **337.000, 800.000,
1484.000** — enteros exactos, con medio píxel de error constante en las ocho piezas. Con
`transform: translate()` el elemento se compone aparte y el navegador conserva la posición en
subpíxeles: la columna pasó de **0,47 px** a **0,003 px**.

Sin esto ninguna medición fina tiene sentido: el instrumento de AE mide milésimas y el motor sólo
puede contestar en enteros.

### 37.2 Un tween de GSAP captura su valor inicial de forma PEREZOSA

Las dos líneas de tiempo (una por modo de easing) compartían un objeto de estado. El capturador
recorre primero los 31 cuadros del modo `custom` —dejando el estado en el valor final— y recién
entonces empieza `propio`. Ahí los tweens de `propio` se inicializaron **desde el valor final** y
animaban de 1600 a 1600: **1300 px de error**, o sea el recorrido entero.

No falla al construir, falla al primer dibujado. Se arregla dos veces a propósito: estado propio por
modo, y `fromTo` en vez de `to`. El `fromTo` es además lo correcto por sí solo — el documento dice
`v1` **y** `v2`, así que el tween tiene que usar los dos y no lo que el objeto tenga puesto.

### 37.3 `steps(1)` no es un HOLD

Redondea, así que salta **a la mitad** del tramo. El HOLD de AE mantiene el valor hasta el final. Daba
500 px de error en un cuadro. Se hace con una función explícita: `p => (p < 1 ? 0 : 1)`.

## 38. Y dos formas de fallar en silencio que costaron dos corridas

### 38.1 `process` no existe en un navegador

`curvas.mjs` lo importan los dos lados —Node y la página— **a propósito**: si fueran dos
implementaciones, la prueba compararía dos cosas a la vez y no probaría ninguna. Pero el archivo
terminaba con `if (process.argv[1]?.endsWith(...))`, y en el navegador eso tira `ReferenceError`
**al evaluar el módulo**: ni siquiera llegan a definirse las funciones. La página se queda a medias
sin decir por qué.

### 38.2 Un `.mjs` servido con el tipo equivocado se rechaza sin ruido

`SimpleHTTPRequestHandler` adivina el tipo por la extensión y en Windows `.mjs` no está registrado,
así que sale como `application/octet-stream`. Chromium se niega a ejecutarlo por *strict MIME type
checking*, el `import` falla y la página no arranca.

**Las dos se veían igual: `la pagina no arranco (title = 'cargando')`.** Que es exactamente igual de
útil que un timeout — dice que algo salió mal y no qué. El capturador ahora escucha `console`,
`pageerror` y `requestfailed` y los imprime. Es el mismo pecado que vengo corrigiendo todo el día del
lado de AE, y me lo comí de nuevo del lado del navegador.

## 39. Lo que ahora sí se puede firmar

> El movimiento autorado en After Effects se reproduce en un navegador con **0,002 a 0,018 px** de
> diferencia sobre trayectorias rectas, con dos y tres keyframes, ease simétrico y asimétrico,
> sobrepaso real, velocidades positivas y negativas, tipos HOLD / LINEAL / BEZIER encadenados,
> propiedades de uno y de tres eases, y en los dos ejes. La cadena completa —AE, documento de escena,
> GSAP, navegador, píxeles— está medida punta a punta.

Sigue sin cubrirse lo mismo que enumera la sección 34, más una cosa que esta parte agrega: la página
de prueba mueve **un rectángulo**. Un motion graphic de verdad tiene texto que cambia de ancho,
imágenes que hay que encajar y capas que se tapan. Que el movimiento viaje no significa que la
composición viaje — y el problema del texto que no mide lo que medía (`P4` de la Parte I) sigue
abierto y sin tocar.

### Notas acumuladas para la futura skill (se suman a las de la Parte V)

14. **Posicionar con `transform`, nunca con `left`/`top`.** Encajan a píxel entero.
15. **`fromTo` y no `to`.** Un tween captura su inicio al primer dibujado, no al construirse.
16. **`steps(1)` no es un HOLD**; usar `p => (p < 1 ? 0 : 1)`.
17. **Pasarle `evaluar` a GSAP como función**, no la cadena de `CustomEase`: 34 a 262 veces más fiel.
18. **Un módulo compartido entre Node y el navegador no puede tocar `process`** en el cuerpo.
19. **Servir `.mjs` como `text/javascript`**, o el navegador lo rechaza sin decir nada.
20. **Todo capturador escucha `console`, `pageerror` y `requestfailed`.** Un "no arrancó" sin motivo
    es lo mismo que un timeout.

---

# PARTE VII — El exportador, el reproductor, y una composición entera (2026-08-13)

**De una composición de After Effects a un MP4, en un comando, sin After Effects en el render.**

```bash
node tools/ae/pieza.mjs ESCENA-LIMPIA --mp4 salida.mp4 --comparar
```

Contra una composición de cinco capas —dos textos, dos sólidos, un nulo— con emparentado, punto de
anclaje animado, rotación, escala, opacidad y orden de apilado:

| qué se mide | resultado |
|---|---|
| **geometría** (lo que el reproductor cree, contra `valueAtTime` de AE) | peor desvío **0,017 px** |
| **ancho del texto** (navegador contra `sourceRectAtTime`) | **0,8%** |
| **píxeles** (imagen completa contra imagen completa) | **0,30 de 255** de media · tinta **1,23%** |

Piezas: `tools/ae/sondas/exportar.jsx`, `tools/ae/comp.mjs`, `tools/ae/motor/comp.html`,
`tools/ae/sondas/render.jsx`, `tools/ae/motor/capturar-comp.py`, `tools/ae/comp-check.mjs`,
`tools/ae/pieza.mjs`.

## 40. La pieza central no es la conversión: es el inventario de lo que no viaja

El exportador emite una línea `NOSOP` por cada cosa que no puede exportar —efectos, máscaras,
expresiones, contenido de formas, matte de pista, modos de fusión— y el documento sale marcado
`incompleto`. `pieza.mjs` **se planta** ahí y no fabrica el video, salvo que se le pase `--igual`.

Probado contra una composición que tiene las tres cosas a propósito:

```
  LO QUE NO VIAJA:
    capa 1: capa de forma: su contenido no se exporta
    capa 2: efecto (Desenfoque gaussiano)
    capa 3: expresion en opacidad (wiggle(2, 10))

  ME PLANTO. Reproducir esto daria algo PARECIDO, que es peor que fallar.
```

Y hay **dos** composiciones de prueba a propósito, no una: la sucia ejercita el inventario, la limpia
permite comparar píxeles. Con una sola, o el inventario sale vacío y nunca se prueba, o la comparación
falla por cosas ya conocidas y ese fallo tapa cualquier defecto de verdad.

## 41. Las matrices se componen en JS, no anidando elementos

Lo tentador es meter el `div` del hijo adentro del `div` del padre y dejar que CSS componga las
transformaciones solo. Funciona para el movimiento **y rompe el orden de dibujado**: en el DOM un hijo
siempre se pinta sobre su padre, pero en After Effects el emparentado **no cambia el apilado** — eso lo
decide el orden de capas, y una capa hija puede estar debajo de su padre.

Anidando, esa composición sale dada vuelta y **no hay ningún número fuera de rango que lo delate**.

La fórmula, que es la definición de AE y conviene tenerla escrita:

```
M_capa  = Trasladar(posición) · Rotar(rotación) · Escalar(escala) · Trasladar(−anclaje)
M_mundo = M_mundo(padre) · M_capa
```

El **punto de anclaje aparece dos veces y con signos opuestos**: define el centro de giro y de
escalado, y además es el punto que aterriza en la posición. Perderlo no rompe nada — hace que la capa
gire alrededor del lugar equivocado.

Y la **opacidad no se hereda** del padre en AE, a diferencia de la transformación.

## 42. Tres defectos que encontró la propia prueba

### 42.1 El color de los sólidos no viajaba

`capa.source` de un sólido **no** es un `SolidSource`: es un `FootageItem` cuyo `mainSource` lo es. La
comparación contra `capa.source` nunca daba verdadero, así que los tres sólidos salían como genéricos
**sin color**. No fallaba: exportaba capas sin color que el reproductor habría pintado de algún
defecto.

### 42.2 Un `<svg>` de 0×0 no dibuja nada

Aunque tenga `overflow: visible`. El texto simplemente **faltaba**, sin error ni advertencia: la
diferencia de tinta era **47%** y la de píxeles 2,96/255. Con la caja del SVG bien dimensionada y el
origen en el medio —los ascendentes viven en `y` negativo— pasó a **1,23%** y **0,30/255**.

Acá se ve por qué las tres métricas van separadas: **la geometría decía "exacto" mientras la mitad de
la composición no se dibujaba.** Un solo número habría mezclado las dos cosas.

### 42.3 Y un defecto en mi propio juez

Puse el umbral de geometría en "exacto", y eso reportaba como defecto nuevo el residuo de 0,017 px que
ya está caracterizado desde la Parte V. Una compuerta que acusa lo que ya sabemos se aprende a
ignorar, y después no ve el defecto de verdad. El umbral ahora está donde el residuo conocido pasa y
un defecto no: 0,05 px, tres veces el peor residuo medido y cincuenta veces menos que un píxel.

## 43. Los altos de texto NO se comparan, a propósito

`sourceRectAtTime` de AE devuelve la caja **ajustada a la tinta**; `getBBox` del navegador devuelve la
caja **de la línea**, que incluye el alto de fuente entero. Miden cosas distintas: compararlas daría un
error inventado de 74 px sobre un título de 125.

El **ancho de avance**, en cambio, es la misma magnitud en los dos motores — y ahí la diferencia es de
**0,8%**, que es mucho menos de lo que esperaba de dos rasterizadores distintos.

Ese 0,8% es además el primer número duro sobre el problema `P4`: si una plantilla depende de dónde
termina un texto, ese es el margen con el que hay que trabajar.

## 44. Detalles de plomería que valen para la skill

- **Los parámetros llegan por archivo.** `AfterFX.exe -r` no acepta argumentos. Ninguno. Y el archivo
  se escribe **sin BOM**, o la comparación de nombres falla por un carácter invisible.
- **Los enums se preguntan, no se escriben a mano.** Que "7415 es centrado" hoy sea cierto no lo hace
  un hecho: es un número de una versión. Escrito a mano, el día que cambie no falla — alinea mal.
- **Cada atributo de un `TextDocument` en su propio `try`.** Pedir uno que no aplica (el color de trazo
  cuando no hay trazo) **tira**, y con un solo `try` alrededor de todos el primero que falla se lleva
  puestos los que venían después: el texto sale exportado a medias sin que nadie se entere.
- **Los PNG se guardan con fondo transparente y el color se compone en ffmpeg.** La medición pesa por
  alfa, así que los cuadros tienen que salir transparentes; un MP4 no tiene alfa. Componer al codificar
  deja las dos cosas *del mismo render*, no de dos corridas distintas.
- **Encadenar los pasos en un comando no es comodidad.** Cada paso manual es una oportunidad de correr
  uno con los datos del anterior — ya pasó: una captura leyó el documento de una corrida vieja y el
  resultado parecía bueno.

### Notas acumuladas para la futura skill (se suman a las de las partes V y VI)

21. **El inventario de lo que no viaja es la pieza central**, no la conversión.
22. **Dos composiciones de prueba**: una sucia para ejercitar el inventario, una limpia para comparar.
23. **Componer matrices a mano**; anidar elementos rompe el orden de apilado.
24. **El punto de anclaje entra dos veces en la matriz**, con signos opuestos.
25. **La opacidad no se hereda** del padre; la transformación sí.
26. **Un `<svg>` sin tamaño no dibuja**, aunque tenga `overflow: visible`.
27. **No comparar magnitudes que miden cosas distintas** (caja de tinta contra caja de línea).
28. **Un umbral que acusa lo ya conocido se aprende a ignorar.**

---

# PARTE VIII — La primera pieza autorada, y el obturador (2026-08-13)

## 45. PIEZA-A: sólo texto, sólidos y transformaciones

La restricción fue elegida: **nada de formas, efectos, máscaras ni expresiones** — o sea, exactamente
lo que el exportador se lleva entero. La pregunta era cuánta calidad se consigue con eso solo. Si
alcanza, nos ahorramos construir lo caro; si no alcanza, sabemos **qué** faltó en vez de adivinarlo.

Medida con la misma vara que las referencias (`tools/mirar-video.py`):

| | cortes | movimiento medio |
|---|---|---|
| Gemini | 1 en 60 s | 14,1 |
| FireFit | 2 en 23 s | 28,6 |
| **PIEZA-A** | **1 en 8 s** | **15,6** |
| nuestro motor viejo | 8 en 20 s | 45,0 |

Cae dentro de la banda. **No corta: viaja.**

### Los dos trucos que impone la restricción

- **El viaje sin cámara.** Todo cuelga de un nulo; mover el nulo mueve la escena entera. Reemplaza a
  la cámara 3D, que no viaja al exportador.
- **El revelado sin máscaras.** Un sólido del color del fondo tapa la zona de abajo y el texto **sube**
  desde atrás. Se ve igual que una máscara y es una capa más, que sí viaja. El **orden de apilado es
  el efecto**: la tapa tiene que estar arriba del texto que oculta y abajo del que no.

### Y la parte honesta

El ritmo lo acerté; **la composición es tímida**. Demasiado aire vacío, el bloque de color llega y no
hace nada, los datos son chicos y grises, todo en un solo plano. Se parece más a un esquema que a una
pieza. Las métricas de ritmo no miden diseño — eso hay que iterarlo mirando.

## 46. El obturador: un cuadro no es un instante

Es lo que más separa "se ve hecho" de "se ve caro", y no es un efecto: es **cómo se integra el
movimiento dentro de cada cuadro**. AE toma varias muestras dentro de la ventana en que el obturador
está abierto y las promedia. El reproductor ahora hace lo mismo.

**Los dos números que hay que respetar, y que se preguntan en vez de asumirse:**

```
OBTURADOR|1|180|-90|16|128        activo · ángulo 180° · fase -90 · 16 muestras · límite 128
```

- **ángulo** 360 = abierto todo el cuadro; 180 = medio cuadro, el de cine y el que AE trae.
- **fase** dónde empieza a abrirse. −90 con ángulo 180 **centra** la ventana en el cuadro. Sin la fase,
  el desenfoque aparece igual **y la imagen queda corrida medio cuadro** — el defecto se ve como "va
  adelantado", no como "está mal el desenfoque", y se busca en el lugar equivocado.

### Tres detalles que cambian el resultado

- **En AE se activa en DOS lugares**: el interruptor de la composición **y** el de cada capa. Prender
  sólo uno no da error — da una pieza sin desenfoque, de esas que uno mira diez veces sin ver qué le
  falta. Las **tapas también**, o sus bordes quedan duros contra un texto que sí se desenfoca.
- **Se promedia con alfa premultiplicado.** Promediar el color sin premultiplicar mezcla el color de
  los píxeles transparentes —que es basura— con el de los opacos, y el rastro sale con bordes sucios.
  Es el mismo cuidado que el centroide pesado por alfa.
- **Se muestrea en el CENTRO de cada franja**, no en su borde: con los bordes, la primera y la última
  muestra pesan la mitad y el promedio queda corrido.

### Lo que cuesta

| | cuadros | capturas | tiempo |
|---|---|---|---|
| sin obturador | 240 | 240 | ~25 s |
| con 8 muestras | 240 | **1920** | **399 s** |

El costo es lineal en las muestras. Es el precio de la calidad y hay que planificarlo: una pieza de
30 s con 16 muestras son ~14 400 capturas.

### El resultado

| | sin obturador | con obturador |
|---|---|---|
| diferencia media por cuadro | 0,17 / 255 | 0,23 / 255 |
| peor cuadro | 0,38 | **1,89** (f96, en pleno latigazo) |
| tinta | 0,07% | 0,16% |

El peor cuadro cae exactamente donde la cámara viaja más rápido, y la diferencia que queda es el
**conteo de muestras**: 8 nuestras contra las 16 adaptativas de AE. Es una diferencia de suavidad del
rastro, no de posición.

## 47. Un defecto del arnés que dio 1011% y parecía del reproductor

`comp-check.mjs` tenía la carpeta de los cuadros de AE **escrita a mano**, apuntando a la composición
anterior. Así que el reproductor renderizó PIEZA-A y se comparó contra los cuadros de ESCENA-LIMPIA.

**No falló: dio números.** La geometría salió perfecta —venía del volcado correcto— y los píxeles
dieron **1011% de diferencia de tinta**, que a primera vista parecía un defecto grave del reproductor.
Con la comparación bien hecha: **0,07%**.

Es la misma familia que las dos carreras del buzón: **comparar contra algo viejo que existe y parece
válido.** El arreglo fue doble a propósito — la ruta se deriva del documento, y además se comprueba
que el volcado de AE sea de la misma composición y tenga la misma cantidad de cuadros. Derivar la ruta
arregla este caso; la comprobación caza el próximo.

## 48. La tipografía depende de la fuente, y el margen es real

| fuente | ancho en AE | en el navegador | desvío |
|---|---|---|---|
| TimesNewRomanPSMT | 714,4 px | 719,9 px | 0,78% |
| **Arial-BoldMT** | 646,6 px | 671,9 px | **3,92%** |

O sea que el desvío no es una constante del sistema: **depende de la tipografía**. Casi 4% sobre un
título de 168 px son 25 px — una plantilla que dependa de dónde termina esa línea tiene ese margen
encima. Es el problema `P4` asomando con un número por primera vez.

Y hay un paso previo que hacía falta: AE guarda la tipografía por su **nombre PostScript**
(`Arial-BoldMT`), y CSS espera una **familia** más un **peso** aparte (`Arial` + `font-weight: 700`).
Pasarle el nombre PostScript directo funciona a veces y falla en silencio el resto — el navegador cae
en otra fuente y el texto mide otra cosa. `tipografia()` en `comp.mjs` lo traduce y manda las dos
cosas: el nombre PostScript primero, por si el navegador lo resuelve, y la familia deducida detrás.

### Notas acumuladas para la futura skill (se suman a las partes V, VI y VII)

29. **El obturador se activa en dos lugares** en AE: composición y capa. Y también en las tapas.
30. **Respetar la FASE del obturador**, no sólo el ángulo, o la imagen queda corrida medio cuadro.
31. **Promediar con alfa premultiplicado** y muestrear en el centro de cada franja.
32. **El costo del obturador es lineal en las muestras.** Planificarlo.
33. **Ninguna ruta de comparación se escribe a mano**: se deriva del documento, y además se comprueba.
34. **AE guarda la tipografía por nombre PostScript**; CSS quiere familia + peso.
35. **El desvío de ancho del texto depende de la fuente** (0,8% a 3,9% medidos). No es una constante.

---

# PARTE IX — Cuando el límite deja de ser técnico (2026-08-13)

La v1 de PIEZA-A **medía bien y se veía tímida**: ritmo 15,6 de movimiento medio y cero cortes, o sea
dentro de la banda de las referencias, y aun así parecía un esquema. **Las métricas de ritmo no miden
diseño.** Esta parte es sobre lo que pasó cuando el cuello de botella dejó de ser la plomería.

## 49. Un panel de diseño, y por qué el jurado importa más que las propuestas

Cuatro propuestas independientes para la misma pieza, cada una desde un ángulo distinto —editorial,
arquitectónico, energía, sobriedad— con la restricción dura escrita en el pedido. Después tres jurados
que las comparan **entre sí** desde tres lentes: si se puede construir, si el ritmo cae en la banda, y
si de verdad se ve caro o sólo reordena el vacío.

**El límite de sesión cortó cinco de los ocho agentes**: volvieron tres propuestas y se perdieron el
cuarto ángulo, los tres jurados y la síntesis. No se relanzó — hacer de jurado es trabajo propio, y
relanzar habría quemado el límite de nuevo. La síntesis se hizo a mano sobre lo que volvió.

Queda anotado como dato de operación: **un panel de ocho agentes a effort alto consume ~209 000
tokens**. Con el límite cerca, conviene lanzar menos agentes o menor effort.

## 50. Lo que se robó de cada propuesta

**De "PULSO" (energía) — la apertura, que es la mejor idea suelta de las tres.** El cuadro 0 es
**100% rojo** con el título *calado*: texto del color del fondo pintado **encima** del sólido. El rojo
se va de un latigazo **llevándose su propio calado**, y debajo queda el mismo título en hueso, en el
mismo lugar. Es un revelado real con dos capas de texto y un emparentado. De un gesto resuelve tres
críticas: abre en negro, no hay masa, y no hay un evento que uno recuerde.

**De "SECCIÓN" (arquitectónico) — dos cosas.** Que el rojo *"llega siendo todo y se retira convertido
en estructura"*: al despejar deja una banda de 56 px pegada al cuadro, que además es **la única
referencia fija** y es lo que vuelve legible el paralaje. Sin nada quieto, tres velocidades se leen
como una sola.

Y el hallazgo técnico, que vale por sí solo:

> Los tres nulos de paralaje llevan keyframes en los **mismos tiempos**, con las **mismas
> influencias** y **velocidad 0** en las dos manijas. Con velocidad 0, `y1 = velocidad·(dt/dv)·x1`
> colapsa a 0 sin importar `dt` ni `dv`, así que el avance normalizado es **idéntico** en los tres y la
> proporción 45 / 100 / 165 se cumple **en cada cuadro**, no sólo en los extremos.

Es el mismo hallazgo del factor `dt` de la Parte V, **dado vuelta y usado como técnica de diseño**. Si
alguna manija llevara velocidad distinta de cero habría que escalarla, y la desincronización no se
vería ni en el primer cuadro ni en el último: se vería justo en el medio, donde nadie mira.

**De "LA PÁGINA" (editorial) — el principio que da unidad:** el apilado es la máscara **a dos
escalas**. Una tapa de 300 px revela una línea; una de 1920 revela la pieza entera. El mismo recurso
en dos tamaños, y esa repetición es lo que hace que se lea como una sola mano.

**Lo que se descartó a propósito:** el viaje en L de tres páginas (dos travesías grandes en 10 s es
demasiado) y las 37 capas de "SECCIÓN" (la mayoría no llegarían a leerse). Tomar todo no es dirigir,
es acumular.

## 51. La herramienta que faltaba: mirar a la escala correcta

Estaba juzgando composición sobre la hoja de comparación contra AE, cuyas celdas van a **1:4**. A esa
escala un texto de 44 px es ilegible y una regla de 6 px desaparece. Es exactamente el error que
CLAUDE.md prohíbe: **opinar sobre un recorte reescalado**.

`tools/ae/tira.mjs` da 1:3 repartido sobre **toda** la pieza —no sobre los primeros segundos— y con el
fondo de la pieza, no gris: sobre gris un negro profundo se lee como "vacío" y sobre negro como
"espacio", y juzgar masa sobre el fondo equivocado da la conclusión opuesta.

Con esa tira, cinco defectos saltaron en un vistazo y ninguno se veía en los números:

1. Los **rótulos chocaban con las cifras**. Una cifra de 210 px en Arial Black ocupa ~150 px de tinta
   por encima de su línea de base; con las líneas separadas 210 px y el rótulo 52 px debajo, el rótulo
   caía dentro de la tinta de la cifra siguiente. Se ve como un defecto de exportación, no de layout.
2. El campo rojo **se comía la última cifra**. Una banda que tapa el dato que acaba de entrar no es una
   decisión de composición: es una colisión.
3. La tercera regla, de 190 px, **se leía como un muñón** — una barra tan corta parece un error. Con
   640/400/250 la razón entre una y la siguiente es constante (0,63) y se lee como una decisión.
4. El texto del campo arrancaba a **10 px del borde**.
5. Después del viaje había **un cuadro entero vacío** esperando a que llegaran las cifras. Llegar a un
   lugar donde no hay nada todavía se lee como "no hay nada", no como silencio.

## 52. El modo rápido, y por qué hizo falta un atajo explícito

El capturador **respeta el documento**: si la composición trae el obturador con 16 muestras, una pieza
de 10 s son **4800 capturas y ~17 minutos**. Está bien para el render final y **mata la iteración de
diseño**, que necesita ver la composición en treinta segundos. `--rapido` fuerza una muestra por
cuadro. El desenfoque no cambia una decisión de layout.

*(Y una que me mordió de nuevo: `node ... | Select-Object -Last 12` **almacena toda la salida hasta el
final**, así que el archivo de una tarea en segundo plano queda vacío y parece que no arrancó. Es la
misma familia que el `npm run gates | tail` que CLAUDE.md ya advierte.)*

## 53. Dónde está el límite ahora

La plomería dejó de ser el cuello de botella: la cadena AE → documento → navegador → MP4 cierra con
0,015 px de geometría y el obturador puesto, y el documento de esta pieza sale **completo** — 32 capas,
nada en el inventario de "lo que no viaja".

El límite es el **diseño**, y eso no se arregla midiendo: se arregla mirando y volviendo a autorar. La
diferencia entre la v1 y la v2 no está en una sola línea de código — está en cuatro principios
(masa desde el cuadro 0, un solo recurso a dos escalas, paralaje exacto, silencios medidos) y en cinco
colisiones que sólo se vieron a 1:3.

### Notas acumuladas para la futura skill

36. **Las métricas de ritmo no miden diseño.** Una pieza puede caer en la banda de las referencias y
    verse como un esquema.
37. **El paralaje exacto se consigue con velocidad 0** en todas las manijas y los mismos tiempos e
    influencias en todos los planos.
38. **Una referencia fija vuelve legible el paralaje.** Sin nada quieto, tres velocidades se leen como
    una.
39. **Un solo recurso a dos escalas da unidad**; dos recursos distintos dan ruido.
40. **Juzgar composición exige 1:3 o mejor**, y sobre el fondo real de la pieza.
41. **Calcular el interlineado contra la TINTA**, no contra el cuerpo: Arial Black ocupa ~0,72 del
    cuerpo por encima de la línea de base.
42. **Iterar sin obturador.** El desenfoque no cambia una decisión de layout y cuesta 40× el tiempo.

## 54. CORRECCIÓN: el desvío tipográfico era del instrumento, no del render

En la Parte VIII quedó escrito que el desvío de ancho del texto **depende de la fuente** (0,8% con un
serif, 3,9% con Arial Bold) y que ese era el margen del problema `P4`. **Es falso, y la pista estaba en
los números en bruto:**

| texto | AE | navegador | diferencia |
|---|---|---|---|
| "MOTION" 200 px | 876,8 | 905,7 | **+28,9** |
| "1015" 210 px | 534,9 | 560,3 | **+25,3** |
| "10" 210 px | 254,4 | 280,1 | **+25,7** |

La diferencia es casi **constante en píxeles absolutos**, no proporcional. Un error de escala da el
mismo *porcentaje*; uno de definición da el mismo *absoluto*. Sobre "MOTION" (877 px) esos 29 px son
3,3%; sobre "10" (254 px) los mismos 26 px son 10,1%.

La causa: `sourceRectAtTime` de AE devuelve la caja **ajustada a la tinta**, y `getBBox` de SVG
devuelve la caja de **avance**, que incluye los espacios laterales que cada glifo reserva a sus
costados. Son dos magnitudes distintas — la misma trampa que los altos, sólo que menos evidente porque
el número parecía plausible.

`actualBoundingBoxLeft/Right` de un contexto 2D sí son bordes de tinta. Midiendo tinta contra tinta:

| | peor desvío |
|---|---|
| avance contra tinta (lo que se informaba) | 10,12% |
| **tinta contra tinta** | **0,94%** |

La mayoría cae entre 0,2% y 0,7%. **El texto de After Effects y el del navegador coinciden por debajo
del 1%**, y no hay dependencia de la fuente. `P4` sigue siendo un problema real —el texto del cliente
mide distinto que el de la plantilla— pero el motor no le agrega un error propio.

### Y un defecto en el arreglo, que costó diecisiete minutos

El modo `--solo-cajas` se agregó para corregir la medición sin volver a pagar el render. Pero limpiaba
la carpeta de salida **antes** de mirar si se lo habían pedido, así que **un modo que sólo mide
destruyó un render de 4800 capturas**. El borrado ahora va después de la bifurcación.

> **Un modo de sólo lectura que borra algo no es un modo de sólo lectura.** Y no se descubre leyendo:
> se descubre cuando ya no está.

43. **Comparar sólo magnitudes con la misma definición.** Tinta contra tinta, avance contra avance.
44. **Diferencia constante en absoluto = error de definición; constante en porcentaje = error de escala.**
45. **Un modo que sólo mide no borra nada.** La bifurcación va antes que cualquier limpieza.

---

# PARTE X — El 3D de After Effects es una cámara de perspectiva estándar (2026-08-13)

**La pregunta que decidía la arquitectura del reproductor está contestada, y con margen.**

Lo que separa nuestra pieza del video de Gemini es, sobre todo, paneles en **perspectiva** con una
cámara moviéndose entre ellos. Eso no es un efecto: son transformaciones — el terreno donde ya hay
0,014 px de fidelidad demostrada. Pero si la proyección de AE no se pudiera reproducir, el reproductor
habría que rehacerlo igual y **sin saber si va a coincidir**.

## 55. El modelo, y los números

```
zoom = 2666,67 px = 1920 × 50/36        un 50 mm sobre película de 36 mm
campo vertical = 2·atan(1080 / (2·zoom)) = 22,895°
pantalla = centro + (mundo − cámara).xy × zoom / profundidad
tamaño   = lado × zoom / profundidad
```

| prueba | cuadros | error |
|---|---|---|
| posición del objeto (z de −300 a 1400) | 120 | **0,043 px** |
| tamaño aparente | 120 | **0,063 px** |
| área de una capa **rotada** (X, Y, Z) | 39 | **0,00 %** |
| centroide de una capa rotada | 39 | **0,004 px** |

**El reproductor puede pasar a three.js con una `PerspectiveCamera` de 22,895° y esperar la misma
fidelidad que ya tiene la transformación 2D.**

## 56. Tres decisiones de método que hicieron que la prueba sirviera

### 56.1 Se mide el TAMAÑO, no sólo dónde cayó

Una proyección con el zoom equivocado puede acertar el centro **en todos los cuadros** y errar la
escala en todos. Con sólo el centroide eso pasa por bueno, y el error aparece meses después como
*"los paneles se ven más chicos que en AE"*. Por eso la huella se mide siempre junto al centroide.

### 56.2 La cámara se centró a mano, y eso NO es hacer trampa

`addCamera` deja la cámara en `(0, 0, −zoom)` mirando a `(960, 540, 0)`: **descentrada**. Con esa
geometría la dirección de vista no es el eje Z, una capa plana se ve escorzada, y su huella deja de ser
un rectángulo. Mi instrumento mide el ancho como el máximo de las sumas por fila — exacto para un
rectángulo alineado a ejes, aproximado para cualquier otra cosa.

**Medir el caso difícil con un instrumento que sólo es exacto en el fácil da un error que no se sabe de
quién es.** Primero se verifica el modelo canónico; la cámara descentrada queda como prueba aparte.

### 56.3 Un eje de rotación por vez

AE aplica orientación y después las tres rotaciones, y **el orden en que las compone es justamente lo
que no quería adivinar**. Con un solo eje activo el orden no influye, así que la proyección se verifica
sin esa incógnita. El orden se determina después, con un caso que combine dos ejes.

### 56.4 Y la trampa que casi me come: el centroide de un cuadrilátero proyectado

Comparar el centroide medido contra **la proyección del centro** habría sido un error. La perspectiva
**no es afín**: el centro de un cuadrado no se proyecta al centro de su imagen cuando el plano está
inclinado. Hay que comparar contra el **centroide del polígono proyectado**, con la fórmula del cordón
de zapato sobre las cuatro esquinas ya proyectadas. Con el otro método el error habría dado varios
píxeles y se habría leído como "el modelo de AE no es estándar".

## 57. Lo que sigue sin probarse

- **El orden de composición** cuando hay más de un eje de rotación activo, y cómo se combina
  `orientación` con `rotationX/Y/Z`.
- **La cámara de dos nodos** (mirando a un punto de interés) y su matemática de *look-at*.
- **La cámara animada**: acá se movió el objeto, no la cámara.
- **Profundidad de campo** y el desenfoque por apertura, que es un efecto y no viaja.

Nada de eso invalida el resultado: lo acota. Lo demostrado es que **la proyección es estándar**, que es
lo que decidía si vale la pena rehacer el reproductor.

## 58. Y la decisión de arquitectura que esto habilita

> **After Effects autora la ESCENA y el MOVIMIENTO. El reproductor es dueño del ASPECTO.**

Sale de un hallazgo de la investigación que esta prueba vuelve accionable: **todos los efectos de AE
son 2D**, y el resplandor se calcula sobre el ráster de la capa **antes** de la transformación 3D, así
que se deforma con el panel. En three.js el bloom es post-proceso en espacio de pantalla. **Son dos
lugares distintos del pipeline**, y por eso portar los efectos de AE es perseguir una fidelidad que no
existe.

El documento declara *"esta capa brilla con intensidad X"* y el motor lo resuelve con la mejor
herramienta que tenga. Se exige identidad de píxel para geometría y movimiento —que ya está probada,
ahora también en 3D— y **no** para los efectos, donde es imposible por construcción.

46. **Medir tamaño junto con posición.** Un zoom equivocado acierta el centro y erra la escala.
47. **Verificar el caso canónico antes que el difícil**, y con un instrumento exacto para ese caso.
48. **Un eje por vez** cuando el orden de composición es una incógnita.
49. **La perspectiva no es afín**: comparar contra el centroide del polígono proyectado, no contra la
    proyección del centro.

## 59. Los tres huecos, cerrados

### 59.1 El orden de composición es XYZ, y no se adivinó

AE aplica orientación y después las tres rotaciones, y el orden no está en ninguna documentación que
haya leído. En vez de suponerlo, se rindió una vez con tres ángulos **distintos entre sí** —para que
cada orden dé una proyección diferente— y se probaron los seis, informando el residuo de todos:

| orden | rotaciones solas | orientación sola |
|---|---|---|
| **XYZ** | **0,93 px** | **0,54 px** |
| XZY | 9,4 | 23,7 |
| ZXY | 27,1 | 24,1 |
| YZX | 45,2 | 40,8 |
| YXZ | 51,6 | 23,2 |
| ZYX | 58,7 | 24,7 |

El ganador está a un factor de 10 del siguiente en un caso y de 43 en el otro. **No es una
interpretación: es el único que sobrevive.** `M = Rx · Ry · Rz`, y la orientación se compone igual.

*(El residuo de 0,93 px no es del modelo: la caja de la huella se mide en píxeles enteros y aporta
±0,5 px de cuantización. Los términos de centroide y área dan centésimas.)*

Y se separó el problema a propósito: primero los casos con orientación en cero —que determinan el
orden de las rotaciones— y después el de orientación sola. Mezclarlos desde el principio deja dos
incógnitas en una ecuación.

### 59.2 La cámara de dos nodos NO guarda su apuntado en ninguna propiedad

Este es el hallazgo que más vale de la parte, y es una trampa perfecta para un exportador.

La primera versión leyó la orientación de la cámara y armó la matriz con ella. **Falló por 1480 px** —
y el volcado dice por qué: en las seis posiciones AE informa **orientación (0,0,0) y rotaciones en
cero**, mientras el objeto sale siempre **centrado** en el cuadro.

Es una cámara de dos nodos: apunta a su punto de interés, y ese apuntado es **implícito**. Leer las
rotaciones devuelve cero, **no hay ningún error**, y la cámara del reproductor queda mirando a
cualquier lado. Hay que detectar `autoOrient` y calcular el *look-at*.

La convención, verificada contra el caso identidad y no supuesta —con orientación cero la cámara mira
a +Z y su "arriba" de pantalla es −Y del mundo, porque en AE la Y crece hacia abajo:

```
f = normalizar(puntoDeInterés − posición)
r = normalizar(f × (0, −1, 0))
u = f × r
```

Con eso, seis posiciones descentradas y a distintas distancias cierran en **0,028 px**.

### 59.3 Y volví a pisar la trampa que ya tenía escrita

Con el look-at puesto, el error bajó de 1480 px a 1,85 — pero quedaba un residuo que **crecía con lo
descentrada que estaba la cámara**. Ese patrón se lee fácil como "el modelo de cámara no cierra del
todo".

No era el modelo: estaba comparando el centroide medido contra **la proyección del centro**, cuando
con la cámara descentrada el cuadrado se ve escorzado y la perspectiva **no es afín**. Es exactamente
la nota 49 de este cuaderno, escrita dos horas antes, y la volví a pisar en la sección siguiente del
mismo archivo.

Comparando contra el centroide del polígono proyectado: **0,028 px**.

> Tener una lección escrita no impide repetirla. Lo que la caza es que el número tenga una **forma**
> —acá, crecer con el descentrado— y preguntarse qué explicación tiene esa forma antes de aceptar el
> número como veredicto.

## 60. El modelo 3D completo, para el reproductor

```
CÁMARA
  zoom en píxeles (AE lo da; por defecto ancho × 50/36)
  fov vertical = 2·atan(alto / (2·zoom))
  si autoOrient = CAMERA_OR_POINT_OF_INTEREST:  calcular look-at, NO leer rotaciones
      f = normalizar(POI − pos) · r = normalizar(f × (0,−1,0)) · u = f × r
  si no: componer orientación y rotaciones en XYZ

CAPA 3D
  M = trasladar(posición) · Rx · Ry · Rz · orientación(XYZ) · escalar · trasladar(−anclaje)
  proyección: pantalla = centro + (cámara⁻¹ · (mundo − posCámara)).xy × zoom / z
```

| verificado | muestras | error |
|---|---|---|
| posición y tamaño, cámara sobre el eje | 120 | 0,043 px / 0,063 px |
| rotación en X, Y, Z por separado | 39 | 0,00 % de área · 0,004 px |
| orden de composición | 4 combinaciones × 6 órdenes | ganador a 10× del siguiente |
| cámara descentrada y móvil | 6 | 0,028 px |

50. **Cuando el orden es una incógnita, probar TODOS los candidatos y publicar los residuos.** El
    ganador tiene que ganar por un factor, no por un pelo.
51. **La cámara de dos nodos no guarda su apuntado.** Detectar `autoOrient` y calcular el look-at;
    leer las rotaciones devuelve cero sin error.
52. **Un error que crece con un parámetro tiene una explicación estructural**, no es ruido. Buscarla
    antes de aceptar el número.

---

# PARTE XI — El reproductor pasa a three.js (2026-08-13)

`tools/ae/motor/comp3d.html`. La prueba de que la reescritura es correcta no es una escena 3D nueva:
es **PIEZA-A**, la pieza 2D que ya estaba medida, pasada por el camino nuevo.

| | reproductor DOM | reproductor three.js |
|---|---|---|
| geometría | 0,0141 px | **0,0101 px** |
| tinta | 0,00 % | **0,00 %** |
| píxeles, media | 0,17 / 255 | 0,28 / 255 * |

\* con una muestra por cuadro contra las 16 de AE — comparación válida sólo en los cuadros quietos.

**Verificar el reproductor 3D sólo con escenas 3D nuevas habría sido no tener contra qué comparar.**
Una reescritura sin regresión es una reescritura sin red.

## 61. La decisión que lo hace correcto por construcción

La tentación es reimplementar la transformación de AE directamente en coordenadas de three.js. **Es
donde se pierden los signos:** AE tiene la Y hacia abajo y la Z hacia adentro; three.js tiene la Y
arriba y la Z hacia el espectador. Dos ejes invertidos significa que cada rotación cambia de signo de
una forma que hay que razonar caso por caso — y un signo mal puesto no rompe: **espeja algo**, que
después se busca durante horas.

Acá no se reimplementa nada. La matriz se arma **en coordenadas de After Effects**, tal como quedó
medida, y se compone con un cambio de base **una sola vez**:

```
Φ(p) = (p.x − ancho/2,  −(p.y − alto/2),  −p.z)
malla.matrix = Φ · M_ae
```

La geometría del plano también se declara en coordenadas de AE. Así el único lugar donde vive la
conversión de ejes es esa línea, y todo lo demás es la fórmula ya verificada contra 120 cuadros y 39
rotaciones.

**Y todas las capas son un plano con una textura.** Un sólido, un texto, una imagen y una forma
rasterizada son la misma cosa con distinto contenido — así agregar imágenes y formas después es casi
gratis en vez de tres caminos separados que se desincronizan.

## 62. Tres defectos que costaron el diagnóstico, y ninguno era del render

### 62.1 Un PNG opaco se guarda con TRES canales

En el cuadro 0 la pieza es completamente roja, así que el codificador **descarta el canal alfa**.
Indexar de a 4 bytes sobre una imagen de a 3 no falla: devuelve los canales del píxel siguiente, o sea
colores plausibles y completamente equivocados. Dio **49,75 % de píxeles distintos y NaN de promedio**,
y parecía un defecto grave del reproductor nuevo.

Se descubrió mirando los valores crudos de cuatro píxeles: el color era **exacto** (242, 64, 38 =
`#F24026`) y sólo el alfa venía corrido. **El ancho de píxel se lee del archivo, no se asume.**

### 62.2 El estado se informa en las claves del reproductor anterior

A propósito. Un formato distinto habría dado NaN en la columna de geometría y habría parecido un
defecto del 3D. **Comparar una reescritura contra las mediciones que ya existen exige hablar el mismo
idioma que ellas.**

### 62.3 Y comparar con distinto obturador da un número que se lee mal

Una captura sin desenfoque contra un render de AE con 16 muestras difiere mucho en **todo cuadro con
movimiento**. El peor cuadro daba 5,45 y caía exactamente en medio del latigazo de apertura. No es un
defecto: es la prueba comparando cosas distintas. Ahora la captura anota con cuántas muestras se rindió
y el comparador **avisa** en vez de dejar el número suelto.

53. **Verificar una reescritura con la regresión, no con casos nuevos.**
54. **Componer el cambio de base una sola vez** en vez de reimplementar la fórmula en el otro sistema.
55. **El número de canales de un PNG se lee, no se asume.** Un cuadro opaco se guarda sin alfa.
56. **Una comparación entre distintos ajustes tiene que decirlo**, o el número se lee como defecto.

---

# PARTE XII — Las imágenes viajan bit por bit (2026-08-13)

| | media | peor píxel |
|---|---|---|
| **capa a escala 1:1** | **0,000** | **0** |
| capa escalada 70 % y rotada 32° en 3D | 0,892 | 94 |
| cuadro entero | 0,234 | 94 |

**Idéntica.** Una imagen atraviesa After Effects → documento → navegador sin que cambie un solo valor.

La diferencia de la capa 3D es de otra naturaleza y hay que decirlo: es el **filtrado al remuestrear**
una imagen rotada, no un error del camino. Y el patrón está diseñado para que sea el peor caso
posible — tiene líneas de un píxel, que es lo que más sufre al escalar.

## 63. Una imagen de prueba diseñada para delatar

Meter una imagen en la cadena puede fallar de cinco formas, y **cuatro no se ven con una fotografía**.
`tools/ae/patron.mjs` genera un patrón donde cada una tiene su detector:

| qué puede fallar | qué lo delata |
|---|---|
| espacio de color | una **rampa de grises con su valor escrito**: un 50 % que rinde 73 % se ve de una |
| alfa premultiplicado | una **mitad clara**: sobre fondo oscuro los dos modos se ven igual, sobre claro deja orla |
| resolución y filtrado | **líneas de un píxel**: se vuelven grises o desaparecen si hay escalado |
| orientación | una **L asimétrica** y las cuatro esquinas de colores distintos |
| recorte | un **marco de un píxel** en el perímetro |

Es la misma idea que el control negativo de la Prueba 3: **si el patrón no puede distinguir un fallo,
pasar la prueba no significa nada.**

Y la rampa cerró la pregunta que más me preocupaba: los ocho escalones dan **idénticos** en los dos
lados. Es la trampa que ya me comió una vez recreando Gemini —un lienzo 2D entrega sRGB y three lo
volvía a convertir, así que los negros salían grises— y esta vez estaba declarada explícitamente.

## 64. Dos decisiones del exportador que no son sobre imágenes

### 64.1 El medio se COPIA al lado del documento

Un documento que apunta a `C:/Users/Thiago/Escritorio/logo.png` no es un documento: es un documento
**más esa máquina**. Se rompe al mandarlo, al mover la carpeta y al abrirlo desde el servidor — y no se
rompe ruidosamente: se rompe con una capa que no aparece.

Copiando, el documento y sus medios son **una sola cosa que se puede mover entera**. Es lo mismo que
hace un `.aep` cuando se recopilan archivos, y la web lo va a necesitar igual.

### 64.2 El modo de alfa se pregunta, no se asume

Alfa **directo** y **premultiplicado** se ven idénticos sobre fondo oscuro y distintos sobre claro: el
borde queda con orla. Si el reproductor asume el modo equivocado, el defecto aparece **sólo en algunas
piezas** — las de fondo claro— y se atribuye a la imagen. AE lo informa (`mainSource.alphaMode`) y el
exportador lo lleva, con los valores del enum en la misma línea para no hardcodearlos.

## 65. Y la que casi se me pasa: esperar a que carguen

Un cargador de texturas es **asíncrono**. Sin esperar antes de declarar la página lista, los primeros
cuadros se capturan con la capa en blanco. No falla ni avisa: salen unos cuadros sin imagen al
principio, que es exactamente el tipo de defecto que uno mira diez veces sin ver.

## 66. Lo que esto habilita, y lo que falta

Las **formas** ya no necesitan portar el árbol de trazados de AE: casi ninguna forma necesita ser
editable en la web —lo editable es el texto, los colores y las imágenes—, así que el exportador puede
**rasterizar la capa de forma a PNG** y tratarla como una imagen. Se pierde la editabilidad de la
forma y se conserva el aspecto exacto. Eso colapsa el punto 3 en una variante del 2.

Falta el **resplandor**, que se declara en el documento y lo resuelve el reproductor — no se porta de
AE, porque los efectos de AE se calculan sobre el ráster 2D antes de la transformación 3D y el bloom
de three.js es post-proceso en espacio de pantalla. Dos lugares distintos del pipeline.

57. **Una imagen de prueba tiene que poder fallar.** Una fotografía esconde cuatro de los cinco modos.
58. **El medio se copia al lado del documento**, o el documento incluye una máquina.
59. **El modo de alfa se pregunta.** Los dos se ven igual sobre fondo oscuro.
60. **Esperar la carga antes de declarar listo.** Lo asíncrono no avisa: deja cuadros vacíos.

---

# PARTE XIII — El resplandor se declara, no se porta (2026-08-13)

Es **la única parte de la cadena donde no se exige identidad con After Effects**, y es a propósito: los
efectos de AE se calculan sobre el ráster 2D de la capa **antes** de la transformación 3D —un
resplandor se deforma junto con el panel— y el bloom de un motor web es post-proceso en espacio de
pantalla. Dos lugares distintos del pipeline. Perseguir identidad de píxel ahí es perseguir algo que no
existe.

Lo que viaja es la **intención**, escrita en el **comentario de la capa**:

```
brillo <fuerza> <radio> <umbral>        por ejemplo:  brillo 1.7 0.80 0.14
```

## 67. Por qué el comentario y no los parámetros del efecto Glow

Porque **los nombres de las propiedades de efecto están traducidos**, igual que los de menú — donde
`findMenuCommandId("Easy Ease")` devolvía `0` y el que existía era `"Aceleración suave"`. Un exportador
que busque `"Glow Intensity"` anda en inglés y **falla mudo** en español. El comentario es texto que
escribe el autor: no depende del idioma de la interfaz.

## 68. Y como no hay identidad que exigir, se exige otra cosa

**Con el resplandor apagado, el resultado tiene que ser exactamente el de antes.** Si la maquinaria de
bloom cambia un píxel cuando nadie la pidió, contamina todo lo que ya está medido. Verificado sobre
PIEZA-A: geometría `1,01e-2`, tinta `0,00 %`, media `0,28` — los mismos números que antes de que el
bloom existiera.

## 69. Cuatro defectos, y ninguno era del bloom

### 69.1 El código estaba mintiendo: una sola pasada para todos

La primera versión aplicaba **una** pasada con los parámetros de la **primera** capa que brillara. La
declaración por capa existía en el documento y **no llegaba al render**: dos capas con fuerzas
distintas salían con la misma. El documento decía una cosa y la imagen otra — la forma de fallar que
menos se nota, porque el resultado es plausible.

Se arregló agrupando por parámetros y corriendo una pasada por grupo. **La prueba de que ahora funciona
es visual y deliberada:** dos barras con parámetros distintos que salen con halos distintos. Si el
agrupamiento estuviera mal, saldrían iguales y nadie se enteraría.

### 69.2 `EffectComposer` saltea la conversión a sRGB

Y no se ve como un error: **se ve como que todo se oscureció**. El composer renderiza a un búfer
intermedio y omite la conversión que el renderizador aplica solo al dibujar directo a pantalla, así que
la imagen sale en lineal — los grises se hunden a negro. Hace falta un `OutputPass` al final.

**Y la prueba de no-regresión no lo cazó**, porque sin resplandor declarado el camino es
`render.render()` directo, que sí convierte. Dos caminos con distinta gestión de color y la regresión
cubría uno solo:

> **Una compuerta sólo protege lo que atraviesa.** Agregar un camino nuevo agrega un camino sin
> compuerta, aunque la compuerta siga en verde.

### 69.3 `autoClear` borraba cada grupo con el siguiente

Por defecto el renderizador limpia el destino antes de cada dibujo, así que la acumulación "aditiva" no
sumaba nada: quedaba sólo el último grupo. No falla — da un resplandor que existe y es el de una sola
capa.

### 69.4 Nombrar el búfer concreto en vez de `readBuffer`

`EffectComposer` intercambia sus dos búferes según cuántas pasadas haya y cuáles pidan intercambio
(`UnrealBloomPass` no lo pide). Usar `renderTarget2` acierta con una cantidad de pasadas y falla con
otra — leyendo un búfer vacío, sin error.

## 70. Y una cosa del bloom que hay que entender para usarlo

**El umbral se compara contra la luminancia en LINEAL, no contra "qué tan brillante se ve".** El rojo
`#F24026` parece intenso y en lineal su luminancia es **0,226**: por debajo de un umbral de 0,35 no
desborda y la capa sale plana. El cian `#26BDF2` da 0,417 y sí desborda.

Y **un texto blanco macizo está entero por encima de un umbral bajo**, así que no le brilla el borde:
le brilla todo, y el título sale como una mancha ilegible. El bloom trabaja sobre las altas luces
*dentro* de una imagen, no sobre formas planas — con el umbral casi al tope, sólo desborda lo que de
verdad satura y el resplandor queda como halo en vez de como capa de pintura.

61. **Lo que no se puede portar, se declara**, y se declara en un campo que no dependa del idioma.
62. **Cuando no hay identidad que exigir, exigir la no-regresión.**
63. **Una compuerta sólo protege lo que atraviesa.** Un camino nuevo nace sin compuerta.
64. **`EffectComposer` necesita `OutputPass`**, o toda la imagen queda en lineal.
65. **El umbral del bloom vive en lineal**, y un color saturado puede estar muy por debajo de lo que
    aparenta.

---

# PARTE XIV — Las formas se rasterizan (2026-08-13)

| | con el resplandor puesto | aislado |
|---|---|---|
| geometría | exacta | **exacta** |
| píxeles, media | 4,61 / 255 | **0,10 / 255** |
| tinta | 8,05 % | **0,01 %** |

Cuatro formas que **no se pueden hacer con sólidos** —tres rectángulos de esquinas redondeadas y una
elipse con contorno— exportadas, colocadas y renderizadas sin diferencia medible.

## 71. El intercambio: aspecto exacto a cambio de editabilidad

Portar el árbol de formas de After Effects —trazados, rellenos, trazos, grupos anidados, repetidores—
es el build más grande de todo el exportador. Y **casi ninguna forma necesita ser editable en la web**:
lo editable de una plantilla es el texto, los colores y las imágenes. Una esquina redondeada es
decoración.

Así que se rasteriza: se renderiza la forma sola a un PNG y se trata como una imagen. Se pierde la
editabilidad del trazado y se conserva el **aspecto exacto**. Es el intercambio correcto porque el
aspecto no se puede aproximar, y a nadie le hace falta editar los vértices de un rectángulo redondeado
desde un navegador.

**Y toda la ganancia estaba en una decisión tomada tres pasos antes:** que cada capa fuera *un plano con
una textura*. Con eso, soportar formas son **diez líneas** en el reproductor en vez de un camino nuevo.

## 72. No se toca la capa original

Lo directo sería neutralizar la transformación de la forma, renderizarla y restaurarla. Ahí se pierde
trabajo del usuario: si la transformación tiene keyframes hay que **borrarlos y reponerlos**, y
cualquier corte en el medio —un error, un cartel modal, un corte de luz— deja la capa rota.

Se copia a una composición temporal con `copyToComp`, se neutraliza **la copia**, y la temporal se
borra en un `finally` — también si algo falló, porque si no cada corrida deja una comp basura en el
proyecto y a la décima el panel es ilegible.

## 73. Lo que una rasterización congela, y hay que decirlo

Un trazado que se deforma con el tiempo sale **congelado** en el instante que se rindió. Si no se
avisara, la pieza saldría "parecida" — con la forma quieta donde debería moverse.

Detectarlo exigía recorrer el árbol de la forma, que es profundo y con nombres que cambian entre
versiones. Buscar propiedades concretas por nombre habría sido otra vez la trampa de los nombres
traducidos, así que se recorre **a ciegas** y se pregunta lo único universal: `numKeys`. Con un límite
de profundidad, que no es paranoia — una recursión sin techo en ExtendScript no da un error legible,
da una sesión colgada.

## 74. Y la lección de medición, otra vez

La primera corrida dio **4,61 de diferencia media y 8,05 % de tinta**, contra el 0,23 de las imágenes.
Parecía que la rasterización tenía un problema.

No lo tenía: una de las formas **declaraba resplandor**, y el resplandor no se porta —el reproductor lo
dibuja y AE no—. La hoja de comparación lo mostró de una: la columna de diferencia era una mancha
naranja alrededor de esa forma y **nada más**; los paneles, el anillo y el texto eran invisibles ahí.

Quitando la declaración, la misma escena da **0,10 y 0,01 %**.

> **Estaba midiendo dos cosas a la vez.** Una prueba que mezcla lo que se quiere verificar con algo que
> por diseño no coincide no da un número: da una discusión.

66. **Rasterizar lo que no necesita ser editable** es más barato que portarlo, y conserva el aspecto.
67. **Nunca modificar lo del usuario para medirlo**: copiar, medir sobre la copia, borrar la copia.
68. **Recorrer un árbol desconocido preguntando lo universal**, no buscando nombres que se traducen.
69. **Aislar antes de acusar.** Si la prueba incluye algo que por diseño difiere, el número no sirve.

---

# PARTE XV — La pieza falló, y el diagnóstico vale más que la pieza (2026-08-13)

La PIEZA-B usó las cuatro capacidades juntas —cámara 3D, imágenes, formas, resplandor— y **midió
bien**: 1 plano en 12 s, movimiento medio 28,3 (clavado en FireFit), 0 % de cuadros muertos.

Thiago la miró y dijo: *"está bastante errado, tiene bastantes errores"*, *"el video está como muerto,
no tiene una buena coreografía, es muy lento y no tiene el beat"*.

Tenía razón, y hay tres capas de error acá, cada una más profunda que la anterior.

## 75. Primera capa: la pieza habla de nosotros

`SIN AFTER EFFECTS` cruzando la pantalla durante diez de los doce segundos. Es una nota sobre **nuestro
proceso de ingeniería** metida adentro del producto. A quien la mira no le importa cómo la hicimos.

> **Puse el making-of adentro del video.** Una pieza tiene que ser sobre algo que le importe a quien la
> mira, no sobre cómo se construyó.

## 76. Segunda capa: animé la cámara y nada más

Los paneles, las barras, las pantallas y la tipografía son **utilería quieta**. Lo único que se mueve
en toda la pieza es el punto de vista.

En las referencias pasa lo contrario: en el video de Gemini **la cámara casi no se mueve y las cosas
hacen cosas** — el logo entra, gira, se lanza y vuelve, y al pasar por encima del texto lo va
borrando. Mi pieza es un paneo lento sobre un museo.

## 77. Tercera capa: mi métrica dijo que estaba bien

Y es la que más importa, porque es la que me habría dejado repetir el error.

**Movimiento medio 28,3, igual que FireFit. 0 % de cuadros casi idénticos.** Lo leí como *"ritmo
correcto, sin tiempo muerto"*. Es exactamente al revés:

- FireFit mide 28 porque **alterna quietud larga con viajes rápidos**.
- La mía mide 28 porque **se mueve un poquito todo el tiempo y no para nunca**.

Las dos dan el mismo promedio y son lo opuesto. Y el "0 % de cuadros casi idénticos", que leí como
virtud, decía en realidad *"nunca se queda quieta"* — que es el defecto.

> **Una métrica que se puede satisfacer de dos maneras opuestas no es una métrica: es un número.**
> Hace falta la DISTRIBUCIÓN del movimiento, no su promedio. Una pieza buena es bimodal —quieta o
> rápida—; la mía es una papilla uniforme.

**Pendiente concreto:** `tools/mirar-video.py` tiene que informar la distribución (histograma o al
menos la fracción de cuadros por debajo y por encima de umbrales), no sólo la media. Con el número
actual, una pieza muerta pasa.

## 78. Y la corrección de criterio, que Thiago hizo explícita

Después de que yo listara los tres gestos de su ejemplo que podía hacer y no hice:

> *"no quiero que sea algo situacional, no quiero que hagas solo esas animaciones porque te di el
> ejemplo ahora, quiero que hagas de todo. Que investigues de todo, foros, páginas, blogs, lo que creas
> que te puede servir para saber más qué tipos de cosas se hacen en AE — animaciones de todo tipo para
> formas, transiciones, textos, objetos 3D, etc."*

Es la diferencia entre resolver el ejemplo y **tener vocabulario**. El estudio que se lanzó el
2026-08-13 está demasiado dirigido a su ejemplo concreto; hay que ampliarlo a un **catálogo** del
repertorio, no a una lista de encargos.

### El pliego para retomar (el estudio ampliado)

Frentes que tiene que cubrir, cada uno buscando en documentación, foros, blogs y material de la
comunidad — no sólo en la referencia oficial:

1. **Texto** — animadores y selectores de rango, revelados por carácter/palabra/línea, escalonados,
   texto sobre trazado, contadores y cifras que suben, tipografía cinética.
2. **Formas** — trim paths, repetidores, guiones animados, wiggle/zigzag, morphing de trazados,
   barras que se llenan, anillos de progreso, ecualizadores, patrones generativos.
3. **Transiciones** — barridos, cortinas, objeto que cruza y arrastra, empujes, transiciones por
   forma, por luminancia, por escala, la "transición invisible" del viaje de cámara.
4. **Objetos 3D** — profundidad y capas 3D, cámaras y sus movimientos con nombre (dolly, órbita,
   crane, whip pan), luces, extrusión, cómo se arma un mockup de dispositivo.
5. **Revelados y matas** — todo el repertorio, y cuáles se pueden hacer sin matas.
6. **El oficio y el beat** — cuántos elementos animando a la vez, duración de un gesto, silencio entre
   gestos, la proporción entre cámara y objetos, escalonados típicos en cuadros.
7. **Lo que hace que se vea caro** — el detalle de segundo orden: sobrepaso, anticipación,
   secundario, arrastre, el elemento que acusa el golpe de otro.

Y para cada gesto del catálogo, la clasificación que decide el trabajo: **se puede hoy** con
transformaciones, apilado y tapas · **exige agregar algo al exportador** (diciendo qué) · **no vale la
pena todavía**.

76. **La pieza es sobre el espectador, no sobre cómo se hizo.**
77. **Si sólo se mueve la cámara, la pieza está muerta.** Las cosas tienen que hacer cosas.
78. **Una métrica satisfacible de dos maneras opuestas no mide nada.** Pedir la distribución.
79. **Resolver el ejemplo no es tener vocabulario.** El catálogo primero, el encargo después.

---

# PARTE XVI — Los defectos mudos, la métrica que sí ve, y la PIEZA-C (2026-08-14)

Esta parte tiene una forma distinta a las anteriores. Hasta acá cada sección salía de una pregunta que
yo me hacía. Estas salieron casi todas de **una herramienta que me contradijo**: la métrica de ritmo se
construyó para juzgar coreografía y terminó encontrando siete defectos de motor, cinco de ellos míos y
todos mudos — ninguno daba error, ninguno daba aviso, todos daban una imagen plausible y equivocada.

### 80. Una cámara no tiene `threeDLayer`, y por eso sus rotaciones nunca viajaron

`exportar.jsx:230` decidía si volcar orientación y rotaciones preguntando `capa.threeDLayer`. Una capa
de cámara vive en el espacio 3D por definición, así que AE ni le pone la propiedad: leerla devuelve
`undefined`, sin error. Resultado: **toda cámara se exportaba con las rotaciones en cero.** Un balanceo
—inclinar el horizonte, el *dutch*— se reproducía perfectamente horizontal.

Nunca lo noté porque sólo había usado posición y punto de interés. Es la misma familia que el color de
los sólidos: leer una propiedad que no existe y aceptar el cero como dato.

Medido: con la corrección, `B0-ROT-DOS` (cámara de dos nodos con balanceo animado más rotaciones en X e
Y) da **0,03 de 255** contra AE, y `B0-ROT-UNO` (un nodo) **0,02**. Y el control que hace que eso valga:
si se ignoraran las rotaciones —o sea, el comportamiento viejo— la marca peor caería a **772,5 px** de
donde va. La prueba podía fallar.

**Y las rotaciones se componen ENCIMA del apuntado, no en lugar de él.** En una cámara de dos nodos el
look-at da el marco y las rotaciones giran dentro de ese marco. Era una hipótesis y ahora es una
medición.

### 81. AE ordena las capas 3D por el EJE de la cámara, no por distancia al ojo

El reproductor dibuja con la prueba de profundidad apagada, así que el orden de dibujo ES el orden de
oclusión — y ese orden salía del apilado. AE ordena por profundidad. Coinciden sólo mientras uno los
haga coincidir.

Con eso arreglado quedaba una pregunta que la primera prueba **no podía contestar**: ¿profundidad medida
cómo? En `B0-PROF` las dos capas estaban sobre el eje y las dos definiciones dan el mismo orden — pasó
con 0,01 de 255 sin distinguir nada. *Una prueba que las dos hipótesis pasan no es una prueba.*

`B0-EJE` está construida para que las tres respuestas den colores distintos:

| | NARANJA (960, 540, 300) | AZUL (960, 1500, 250) |
|---|---|---|
| distancia al EJE | 2300 | **2250** ← gana |
| distancia al OJO | **2300** ← gana | 2446 |
| APILADO | **arriba** ← gana | abajo |

**AE pinta AZUL.** Las otras dos hipótesis quedan refutadas con el mismo cuadro, y la que gana es la que
desmiente mi implementación anterior. El apilado se dejó del lado de la euclídea a propósito: así el
único resultado limpio es también el más incómodo.

Por qué importa fuera del laboratorio: un rótulo puesto seis unidades **delante** de su tarjeta, pero más
abajo en el cuadro, está más lejos del ojo. Ordenando por distancia, **el rótulo desaparece detrás de su
propia tarjeta**. Lo cazó la compuerta M7 sobre la PIEZA-C antes de que llegara a un solo píxel.

### 82. Las capas 2D debajo del grupo 3D no van arriba: van debajo

Había una limitación declarada —"acá todas las 2D van arriba"— que rompía el caso más común que existe:
fondo plano abajo, contenido en 3D, rótulos planos encima. Con la regla vieja **el fondo se dibujaba
último y tapaba la composición entera**. No dio error: dio veinte cuadros del color del fondo, y la
comparación los reportó como "22,63% de píxeles distintos", que se lee como un problema de proyección.

Queda cubierto lo que importa (debajo de todo lo 3D, y encima) y declarado con precisión lo que no: una
capa 2D **intercalada** entre dos capas 3D se dibuja arriba. Y con resplandor el fondo plano no se
compone —la pasada final del compositor escribe la pantalla entera sin mezcla—, así que el reproductor
lo dice antes de renderizar en vez de dejar que se descubra mirando el video.

### 83. El punto de salida de AE es EXCLUSIVO

Una capa que sale en 4,80 s **no se ve** en el cuadro 144. Tratado como inclusivo, cada capa vivía un
cuadro dentro del plano siguiente, con la cámara ya cortada.

El síntoma no fue "sobra un cuadro". Fue **"faltan quince gestos"**: ese cuadro le daba a cada capa un
pico de energía enorme y falso, contra el cual su gesto real quedaba por debajo del umbral de detección
y dejaba de contar. La métrica encontraba 14 de los 29 gestos que la pieza tenía.

### 84. `AfterFX.exe -r` no resuelve rutas relativas, y no lo dice

Dos corridas de 300 s esperando un buzón que nunca iba a aparecer. AE no ejecuta el script, no abre
ningún cartel y no devuelve ningún código. Se descartó el contenido sin discusión: **el mismo archivo
copiado a `C:/ae-probe/` y llamado por ruta absoluta corrió en 447 ms.** Mismo contenido, otra ruta,
otro resultado.

De paso: `llamar.mjs` se tragaba en silencio los argumentos que no entendía. Una bandera que no existe
se rechaza, no se ignora.

### 85. El reproductor se elegía con una bandera opcional, y olvidarla daba un veredicto verde

`--3d` era opcional. Sin ella, una composición con cámara se reproducía en el motor 2D — que no sabe
proyectar — y la comparación salía **completa y plausible**: la columna de geometría daba "exacto" en
las cinco capas, porque la geometría se calcula igual en los dos. La única pista era una línea perdida
que decía "el reproductor NO pudo dibujar: capa 1 (camara)".

Ahora se decide leyendo el documento. La bandera que queda es la contraria (`--2d`), para forzar el caso
raro a propósito.

### 86. La métrica de ritmo: seis compuertas, y ninguna se pasa moviendo todo un poquito

Existe porque la anterior aprobó una pieza muerta. No falló la medición: falló **la pregunta**. Medir el
promedio de movimiento no distingue una pieza con golpes y silencios de una donde todo deriva despacio.

Se calcula sobre el documento exportado, **sin renderizar**, en milisegundos — o sea que se puede correr
en cada iteración de autoría y no una vez al final.

| | qué mide | por qué no se puede engañar |
|---|---|---|
| M1 | gestos por segundo mayor o igual a 1,2 | una pieza que deriva sin parar tiene energía continua y **cero** arranques |
| M2 | pico/mediana mayor o igual a 4,0 | mover todo un poquito todo el tiempo da cresta cercana a 1,2 |
| M3 | dominancia entre 0,45 y 0,85 | por arriba, una sola cosa moviéndose; por abajo, papilla |
| M4 | gestos en la grilla | el beat es esto, no cantidad de movimiento |
| M5 | cuota de cámara hasta 20% | es mi propio diagnóstico convertido en número |
| M6 | silencios y huecos | sin esto M2 se pasa con un solo golpe al final |
| M7 | empates de profundidad | la única que caza un defecto de píxel y no de estilo |

**La calibración contra la PIEZA-B es lo que hace que esto valga algo.** El usuario ya la había juzgado
—"muerta, sin coreografía, muy lenta, sin beat"— y la métrica lo reproduce número por número: 0,08
gestos por segundo, 48 cuadros seguidos sin que arranque nada, 61% de la energía en la cámara en su peor
ventana, y 1101 cuadros con paneles a menos de una unidad de profundidad (que es el "la imagen de atrás
queda cortada por la segunda" de la imagen 3).

### 87. Y la métrica se comprueba contra el motor, no contra sí misma

`ritmo.mjs` rehace en Node la cadena del reproductor —evaluar, componer la matriz, poner la cámara,
proyectar— porque eso es lo que la hace costar milisegundos. El riesgo de tener la cuenta escrita dos
veces es que diverjan **en silencio**: se estaría midiendo el ritmo de una pieza que no es la que se va a
ver, y las dos serían plausibles.

`capturar-comp.py --esquinas` deja las esquinas que proyectó el motor de verdad y `ritmo.mjs --contra`
las compara. La primera corrida informó **2200 px** de desvío: `PlaneGeometry` entrega las esquinas en
zigzag —las consume como dos triángulos— y mi cuenta las recorría por el borde. Corregido el orden:
**6,65e-13 px.** La comprobación hizo exactamente lo que tenía que hacer.

### 88. Cuatro correcciones a la métrica, y ninguna para que mi pieza aprobara

Cada una salió de un falso positivo, y las cuatro van documentadas porque la tentación de aflojar una
compuerta cuando la propia pieza no pasa es exactamente el error que este cuaderno persigue.

- **Un corte no es un gesto, es un límite.** Contado como energía se llevaba toda la escala: pico 1,74
  contra mediana 0,0002 — cresta 11.372 — y con eso todo lo demás quedaba invisible para las otras cinco
  compuertas. Tres fallaban por eso y no por la coreografía. Vale igual para el corte de cámara: dos
  cortes eran el 48% de la energía de su ventana.
- **Un escalonado es un gesto, no ocho.** Contados por separado, siete de los ocho arranques de una
  cascada caen fuera de la grilla: la métrica estaría **premiando que las cosas entren todas a la vez**,
  que es justo lo que el catálogo prohíbe.
- **El detector tenía un agujero que se tragaba una familia entera de gestos.** Preguntaba por el mismo
  cuadro dos cosas incompatibles: "supera el 25% del pico" para disparar, "supera el 5%" para dar por
  terminada la quietud. Una capa cuyo primer cuadro de movimiento cae entre esos dos números reseteaba
  el contador sin haber disparado y **no registraba arranque nunca**. Ocho capas de la PIEZA-C estaban
  en ese hueco, todas del mismo tipo: barras finas y puntos que crecen desde su borde.
- **Los cuatro términos de la energía no pesaban parejo.** Un desvanecido completo en diez cuadros daba
  0,100; un desplazamiento de un tercio de pantalla en diez cuadros, 0,033. Tres veces menos, y contra
  un panel grande hasta cincuenta. El efecto no era teórico: el gesto que mandaba en la pieza era
  siempre "algo que aparece", y un scroll de pantalla completa no llegaba a contar como gesto.

Y una que es un error de definición, no de umbral: **el tamaño de un gesto es el de su propio tramo, no
el de la capa.** Estaba guardando el pico de la capa, así que todos los gestos de una misma capa
heredaban el mayor de ellos — el primer scroll figuraba como "gesto que manda" sólo porque más adelante
esa misma capa hace uno mucho más grande. Con eso no había forma de conformar la compuerta salvo
**empeorando la pieza**.

### 89. Lo que la métrica me obligó a cambiar de la PIEZA-C, y tenía razón

- **Lo que entra en un corte no se desvanece: ya está ahí.** Un plano nuevo cuyo contenido aparece
  gradualmente no se lee como un corte sino como una transición floja. Y medido, ese desvanecido era el
  gesto más grande de toda la pieza. Sacarlo es a la vez mejor cine y mejor número.
- **Un acuse no alcanza para acompañar.** Concentra su energía en tres cuadros; el gesto al que acompaña
  dura doce, así que a partir del cuarto vuelve a estar solo. Un acompañamiento reparte el recorrido a lo
  largo de todo el gesto: se mueve menos por cuadro y está presente todo el tiempo.
- **Sólo el fondo puede contestarle a una imagen de pantalla completa.** Cuando una imagen así se
  desplaza, cualquier cosa chica que la acompañe pesa el 4% de lo que pesa ella: la dominancia se va
  arriba de 0,85 y la escena se lee, con razón, como una sola cosa moviéndose. El fondo ocupa todo, así
  que moviéndose tres o cuatro píxeles por cuadro —que nadie percibe— el cuadro entero deja de estar
  quieto detrás del gesto. Es paralaje, que es lo que un fondo hace en cualquier pieza cara.
- **Para cerrar un hueco tiene que pasar algo, no temblar algo.** Un acuse es chico por definición y por
  lo tanto no supera el umbral de detección de su propia capa. Los huecos se cierran con gestos.

### 90. El texto letra por letra sin perder el kerning

Animar una palabra carácter por carácter exige una capa por carácter, y ahí se pierde el kerning:
puestas una al lado de la otra por su ancho propio, "AV" queda separado y se ve amateur.

La salida no es estimar: **medir prefijos acumulados.** Se pone "M" y se mide; se pone "MI" y se mide; la
diferencia es el avance de la "I" con su par de kerning ya aplicado, porque lo calculó AE sobre la cadena
entera. Una sola capa temporal y tantas mediciones como letras, con `sourceRectAtTime`.

### 91. Dos trampas de autoría que no dan síntoma propio

- **El índice de una clave se pregunta por tiempo, no se deduce de la posición en la lista.** AE las
  numera por orden de tiempo sobre toda la propiedad. En cuanto una segunda llamada agrega claves
  anteriores —dos acuses sobre la misma Y, que es lo normal— los índices se corren y las curvas se
  aplican sobre las claves equivocadas. No falla ruidosamente: deja unos tramos con la curva de otro.
  Me enteré por una sola línea del exportador: "capa 31 posY: tipos mezclados".
- **Las dimensiones separadas no son comodidad.** Una posición 3D con curva bézier hace que AE le
  invente al camino una curvatura suave, y una trayectoria curva no se puede portar. Separadas, cada eje
  es un escalar y no hay camino que curvar. *Y hay que acordarse de leerlas también en la cámara* —
  estaba contemplado para las capas y no para ella, así que una cámara autorada con cuidado se leía como
  quieta los 450 cuadros.

---

## Lo que queda anotado para el que siga

92. **Un defecto mudo cuesta más que uno ruidoso.** Los siete de esta parte daban una imagen.
93. **Una prueba que las dos hipótesis pasan no es una prueba.** Construir el caso que las separa.
94. **Si la compuerta propia no pasa, primero sospechar de la pieza.** Cuatro veces fue la métrica y
    cinco la pieza, y las cuatro correcciones a la métrica se validaron contra un veredicto humano
    anterior. Una métrica que sólo mejora la pieza propia está torcida.
95. **La medición y el motor tienen que poder contradecirse.** Si la métrica reimplementa la cadena, hay
    que medir la divergencia, no confiarla.


---

# Parte XVII — La recreación 1:1: 34 tiempos, y lo que sólo se ve mirando

## Cómo se estudió la referencia (y por qué eso ya corrigió una regla mía)

No de memoria ni de una descripción: **120 cuadros extraídos a 2 por segundo, cinco hojas de contacto
de 6×4, y las cinco miradas.** De ahí salió el mapa de los treinta y cuatro tiempos con sus cuadros.

Y salió una corrección que no esperaba. Yo venía midiendo con M1/M6 "un gesto cada 8-16 cuadros". **La
referencia tiene un tiempo cada ~60.** No es que sea lenta: es que cada tiempo es una ESCENA ENTERA, no
un gesto. Mi métrica estaba calibrada para otra escala de pieza y yo no lo sabía porque nunca la había
medido contra algo que no fuera mío.

## Los tres defectos del motor que aparecieron construyendo

96. **Poner una influencia promueve la clave a bezier DE LOS DOS LADOS.** `setTemporalEaseAtKey` le
    devolvió la entrada a bezier a claves que un tramo `C5` acababa de dejar en lineal: **64 tramos**
    rechazados por "tipos mezclados". Los tipos hay que fijarlos *después* de las influencias. Fijarlos
    antes es escribir algo que la línea siguiente borra, sin error y sin síntoma hasta exportar.
97. **El centinela es la cadena literal `--- fin ---`.** Escribí "OK": la pieza se construyó entera en
    20 segundos y `llamar.mjs` informó fracaso a los 300, esperando una firma que nunca iba a llegar.
    El trabajo estaba hecho y el canal decía que no.
98. **`omit_background` sirve para medir y hace imposible mirar.** Los doce cuadros salieron **blancos
    de punta a punta** y estuve un rato diagnosticando "el reproductor no dibuja" — dibujaba perfecto.
    La captura tiene dos usos opuestos: la medición pesa por alfa y necesita el fondo fuera; la mirada
    necesita el fondo puesto. Ahora son dos banderas.

## El defecto que ninguna compuerta caza, y apareció cuatro veces

99. **El titular cae encima del texto del panel.** Cuadros 490, 650, 1510 y 1775. Las tres compuertas
    dan verde porque **las dos capas son legibles por separado**: `lectura-check` mide la altura de cada
    texto, `escena-check` mide si cada capa llega a la pantalla, `ritmo` mide cuándo se mueven. Ninguna
    pregunta si dos cosas legibles caen en el mismo lugar del cuadro.
    Se arregla en tres formas y en este orden: **cortar en seco** entre titular y titular (nunca
    cruzarlos), **atenuar el panel** al 55-72% cuando comparte tiempo con un rótulo, y **repartir en
    altura** cuando los dos tienen que estar. Queda como candidato claro a compuerta nueva.

## Y una compuerta que reprueba por el estilo puede seguir teniendo razón

100. M6 reprueba esta pieza de entrada: pide un arranque cada 20 cuadros y la pieza tiene escenas de 60.
     Pero **los tres huecos que nombró eran defectos de verdad** — el de 88 cuadros delataba que el
     estallido estaba hecho al revés (las letras aparecían ya dispersas y después derivaban, o sea que
     no había estallido en ninguna parte), y los otros dos que los paneles aterrizaban y se clavaban.
     Hay que mirar **qué señala**, no sólo si pasa. Por eso ahora imprime *dónde* caen los tres huecos
     más largos: "peor hueco 88 cuadros" sin ubicación manda a buscar a ciegas por toda la pieza.
101. **Y una que reprueba puede estar midiendo mal el fondo.** M3 cuenta las manchas de luz como un
     elemento que compite. Son lo contrario: un piso constante y suave. Al agrandarlas, "sin
     acompañamiento" bajó de 161 cuadros a 99 —hicieron exactamente lo que tenían que hacer— y M3 igual
     reprueba, ahora por "papilla". La métrica no distingue fondo de figura.

---

# Parte XVIII — Lo que se aprende cuando el usuario mira el video y uno midió mal

Thiago miró la PIEZA-H y marcó cuatro cosas. Pidió explícitamente **no arreglarlas** —son situacionales,
aplican a ese video— sino que alimenten la skill. Dos resultaron ser errores de método míos.

## El error de método: elegir una hipótesis que la evidencia no podía distinguir

102. **Yo afirmé que la referencia cambia el tamaño de sus titulares con corte duro, y lo deduje de
     cuadros muestreados a 2 por segundo.** A esa cadencia un corte duro y un acercamiento de medio
     segundo se ven **exactamente iguales**. Mi evidencia no podía separar las dos hipótesis y yo elegí
     una igual, la construí en la pieza (`ubicar()` con claves `HOLD`) y la escribí en la skill como
     hallazgo. Es la nota 93 —*"una prueba que las dos hipótesis pasan no es una prueba"*— cometida
     sobre una referencia en vez de sobre una compuerta.

     Medido a 30 fps con `tools/ae/medir-titular.mjs` (nuevo), "Reimagined for better":
     entra a **3× su tamaño final** y frena con el 75 % del recorrido en **un solo cuadro**; se queda
     **21 cuadros sin mover un píxel**; sale **acelerando** hacia la cámara. "collaboration" sale
     creciendo de 56 a 453 px de tinta en 30 cuadros — **8×**. Nunca hay un salto. Y entre dos titulares
     hay **exactamente un cuadro vacío**.

     De paso refuta otra cosa mía: yo le había agregado una deriva lenta a los titulares "para que el
     cuadro no esté muerto". La referencia **sí para**. Lo que nunca para es el fondo.

103. **El "destello" no era un barrido: era un cometa de escritura.** Núcleo blanco reventado con cola
     en cuña, apoyado sobre la línea de base, viajando a la velocidad a la que se escribe el texto —
     en el cuadro 158 se lee "Your AI assistant" y "from Google" todavía no existe. Es el mecanismo de
     revelado, no una transición. Y **en este repo ya estaba construido con otro nombre**: es el tecleo,
     una capa por carácter con opacidad en `HOLD` y la posición sacada de medir prefijos.

104. **"Usá el efecto nativo X de AE" nunca es la respuesta completa en esta arquitectura.** Los efectos
     no cruzan al documento: se verían en la previsualización y desaparecerían del render, que lo hace
     el motor web. Las respuestas válidas son dos: hornearlo en un PNG (viaja bit a bit) o agrandar el
     vocabulario del documento y del reproductor, diciendo qué campo y qué líneas.

105. **Lo que representa contenido generado tiene que verse generarse.** En la referencia el documento
     se escribe solo y **la porción recién llegada va teñida con el color de acento**, asentándose a
     tinta un cuadro después. Eso último es la mitad del efecto. Una pieza que dice "pedile que escriba"
     y muestra el resultado ya escrito se contradice sola.

## Y lo que apareció al auditar el motor contra las diez técnicas

Investigación de catorce agentes. Lo que verifiqué yo leyendo el código:

106. **`fusion` e `id` se parsean en `comp.mjs:131` y `documentoDe` no los copia.** Nunca llegan a
     `comp.json` — comprobado contra el archivo. Yo había dicho que el documento "ya transporta
     `fusion`"; se parsea y se descarta, que a efectos prácticos es no transportarlo. Son ~6 líneas y
     desbloquean la fusión aditiva (toda la familia de luz) y la identidad estable de capa.
107. **La interletra se mide sin interletra.** `comp3d.html:167-169` dimensiona el lienzo con
     `measureText` sin `letterSpacing`, que recién se aplica al contexto de dibujo en la 188: las
     últimas letras se cortan. Y `__cajas()` repite el error, así que `comp-check` compara la caja de AE
     **con** tracking contra una del navegador **sin** tracking. Dos líneas; latente hasta que una pieza
     use tracking.
108. **Brillo y tapa son incompatibles.** Durante la pasada de resplandor sólo existen las capas de ese
     grupo, y el resultado se suma al final: una capa con brillo escondida detrás de una tapa **brilla a
     través de ella**. Sin error y sin compuerta que lo mire.
109. **Una capa de texto es una línea.** `limpio()` convierte `\n` en espacio y el reproductor hace un
     único `fillText`: un párrafo multilínea sale `completo: true`, verde en todo, y con las líneas
     corridas una atrás de otra en el video.
110. **`camara.enfoque` y `camara.apertura` ya llegan a `comp.json` y no los lee nadie.** La profundidad
     de campo es lo único de la lista cuyo dato ya cruzó la frontera.

## Y el que me hice yo mismo esta sesión

111. **Cada modo nuevo hay que agregarlo a la guarda que protege el disco.** `capturar-comp.py` borraba
     la carpeta de salida mirando sólo `--solo-cajas`. Agregué `--cuadros` y dejé la lectura de esa
     bandera 130 líneas más abajo, así que pedir doce cuadros **borraba el render completo que hubiera
     al lado**. La cabecera de ese mismo archivo documenta exactamente ese accidente. Una guarda escrita
     para dos modos no protege del tercero, y el que agrega el tercero es el que ya leyó la advertencia.

---

# Parte XIX — Cinco cambios de motor en una tarde, y lo que encontró la revisión adversaria

Se agregaron cinco cosas al motor (fusión aditiva, interletra bien medida, recorte por matte,
profundidad de campo por capa, arco que crece), cada una verificada con una sonda y un cuadro. Antes de
construir una pieza de sesenta segundos encima se lanzó una **revisión adversaria de veinte agentes**,
dándoles como pista la lista de errores que yo mismo había cometido ese día. Encontró bastante.

## Lo que encontró, y era todo mudo

112. **Aprobé Pantalla y Aclarar colapsándolos en el mismo nombre que Añadir**, tres párrafos después de
     escribir en ese mismo bloque que aprobar algo en silencio dando otra operación es peor que
     rechazarlo. No son la misma cuenta: sobre un fondo de 217 con una capa de 77, AE en Aclarar dibuja
     **217** —la capa es invisible— y el motor daba 255. Volvieron a `NOSOP`.
113. **El recorte fallaba ABIERTO.** Los dos `return` tempranos dejaban los cuatro planos en su estado de
     constructor, que significa "mostrar toda la mitad derecha del cuadro". Entradas reales que caían
     ahí: una matte con escala 0 —o sea el cuadro 0 de cualquier barrido— y una matte que resulta ser una
     capa nula (`instanceof SolidSource` es verdadero para una nula, y el volcado la tipa "nula" y nunca
     emite su tamaño). **Un recorte que falla abierto es peor que uno que no existe**: se ve bien en la
     sonda y mal en la pieza.
114. **La guarda del caso degenerado corría DESPUÉS de `normalize()`**, donde el valor es 1 o 0 exacto:
     no podía dispararse nunca. Y el comentario que la acompañaba afirmaba que sí. Estaba mal el código
     y estaba mal lo que yo había escrito sobre el código.
115. **El canal de avisos estaba muerto.** El exportador emite `NOTA` cuando algo no salió como se pidió
     —por contrato eso pone el veredicto en rojo— y `comp.mjs` no tenía `case` ni `default`. Se
     evaporaban. Un canal de avisos que nadie lee es peor que no tenerlo: da la sensación de que hay red.
116. **El reproductor 2D era mudo para las cinco funciones nuevas**, y una imagen no caía en ninguna
     rama: no se dibujaba *y* no se declaraba. Antes eso no importaba porque el exportador las
     rechazaba; al quitarle el rechazo a la fusión se sacó la red y no se puso nada de ese lado.
117. **Había una TERCERA copia del defecto de interletra**, en ese mismo reproductor: el SVG dibuja con
     `letter-spacing` y el medidor medía sin él. 25,4 % de desvío, y `comp-check` salía con código 0.
118. **Arreglar la interletra corrió el origen del texto 8,6 px** — una regresión mía. El navegador
     cuenta un espaciado de más después del último carácter y el punto de alineación sale de ese avance;
     AE centra la tinta. El ANCHO queda exacto al 0,10 %, así que **ninguna compuerta lo ve**.
119. **La fusión aditiva ocurre en distinto espacio de color según haya o no resplandor.** Sin
     resplandor la suma va sobre sRGB (framebuffer); con resplandor, sobre lineal (destinos HalfFloat del
     compositor). Dos capas de 128 dan **255 sin brillo y 176 con brillo** — el mismo documento, y lo que
     lo cambia es que *otra* capa declare `brillo`. Se declaró incompatible; el arreglo de fondo cambia
     también el carácter del resplandor y hay que medirlo antes.

## La decisión sobre el recorte, que es la más importante

120. **El matte de pista de AE es alfa de PANTALLA**, o sea que lo que vale es el cuadrilátero
     *proyectado* de la matte. Yo armé un prisma infinito desde la normal del rectángulo, y eso coincide
     sólo si matte y capa son coplanares y la matte no está girada — **exactamente y sólo lo que probaba
     mi sonda**. Escribí la prueba para el caso que había implementado, no para el caso en que se va a
     usar. Con la matte girada 42° el recorte sale angosto y la capa casi desaparece.

     Intenté la versión general (pirámide desde el ojo): los cuatro planos dieron **residuo cero contra
     el ojo**, o sea bien armados, y el recorte igual salió mal porque el ojo y las esquinas no terminan
     en el mismo espacio. **Se acotó la función al caso probado y el exportador rechaza el resto por
     nombre.** Una función acotada que dice dónde termina es útil; una que anda en la sonda y falla en la
     pieza, no.

## Y tres errores de mis propias sondas

121. **Puse el fondo negro en 2D con capas 3D en escena.** Las 2D se dibujan encima: el cuadro salió sin
     tres capas. Es la LEY 7, escrita por mí.
122. **La copia visible del matte quedó más cerca de la cámara que su sujeto y lo tapaba.** Estuve
     buscando un defecto del motor que era la sonda ocultando lo que venía a mostrar.
123. **Exporté la composición equivocada.** El nombre vive en un archivo lateral que persiste entre
     corridas; me olvidé de cambiarlo después de la sonda anterior y diagnostiqué tres pasos sobre un
     volcado de otra cosa. La skill ya dice que ese paso es un solo comando encadenado, justo para eso.

## La compuerta que faltaba

124. **`reproductor-check.mjs`**: los dos reproductores son HTML con un `<script type="module">` adentro
     y nada los revisaba —`node --check` no lee HTML y el navegador recién se queja cuando ya se pagó una
     captura. En un solo día rompí la sintaxis **tres veces**: dos saltos de línea reales dentro de
     comillas simples, y un comentario con backticks adentro de un literal de plantilla. Los síntomas
     fueron un render **negro de punta a punta sin error visible** y un `missing ) after argument list`
     cuarenta líneas más abajo. La compuerta corre en milisegundos, no abre navegador, y está probada
     con un control negativo que reproduce los dos errores exactos.

---

# Parte XX — Tres defectos, una causa de fondo, y la regla que sale de ahí

## 125 · El usuario encontró en cinco segundos lo que cinco compuertas en verde no vieron

La PIEZA-I salió con `lectura`, `escena` y `colisión` en OK. Thiago abrió la previsualización de AE y
marcó tres cosas: el panel de "Hola, Thiago" cortado por arriba, el panel de la línea de tiempo
también muy arriba, y un conmutador con un cursor que hace click y **no cambia nada**. Pidió
explícitamente que no arregláramos sólo eso: *"necesito que sepas qué es lo que te genera que ocurran
estos errores… que descubras la causa y por qué te suceden y cómo solucionarlos"*.

## 126 · Los dos paneles eran UNA línea, y la línea era `addCamera`

`comp.layers.addCamera("camara", [960, 540])` **no coloca la cámara en (960, 540)**. Ese argumento es
el **punto de interés**. La posición queda en `[0, 0, -zoom]`. Medido, no deducido, en
`sondas/ejes-prueba.jsx`:

```
JUN|4-camara-recien-creada|0,0,-2666.6666666
POI|4-camara-recien-creada|960,540,0
JUN|5-camara-con-setValue|960,540,-1900          <- con setValue explicito, queda donde uno cree
SEP|1-despues-de-separar|x=700|y=520|z=900       <- separar dimensiones SI conserva los valores
```

Con la cámara en y=0 mirando a y=540 la vista queda **inclinada 17,1° hacia abajo**, y todo lo que
vive en z>0 sube en el cuadro. Medido sobre la pieza: los tres paneles centrados en **y = 0,26–0,29**
del cuadro en vez de 0,50, y 158–377 px fuera del borde superior.

**Y lo que hizo que durara: yo le había puesto claves a X y a Z.** Esas claves pisaron el
valor equivocado en esos dos ejes — o sea que arreglaron dos tercios del defecto sin querer y
escondieron el tercio que quedaba. **El único eje que quedó roto fue el único que no animé.** Un error
que se tapa solo en las partes que tocás es el que más dura.

**Corrección de algo que publiqué mal en esta misma nota.** Primero escribí que el defecto estaba en
seis piezas. Es falso, y lo verifiqué después: `pieza-b` fija la posición, `pieza-c`, `d` y `g` apagan
la auto-orientación y le ponen claves a Y, y `pieza-h` le pone claves a Y. **PIEZA-I era la única
rota.** El dato falso salió de un grep que sólo miraba tres líneas después de `addCamera` buscando un
`setValue` — no veía a las que lo resuelven de la otra forma. Instrumento nuevo, sin control negativo,
resultado creído; el mismo error que esta parte del cuaderno denuncia en otros tres lugares.

Y la versión correcta es más interesante: **PIEZA-I es la única pieza escrita de cero desde la
gramática medida, en vez de adaptando la anterior.** El arreglo de la cámara vivía únicamente en el
archivo previo, así que se heredaba copiándolo. Reescribir desde principios tiró todos los arreglos
acumulados que no estaban en ningún otro lado. **Ese es el costo real de no tener las leyes en la
skill: el conocimiento viaja pegado al archivo y sobrevive sólo mientras nadie empiece de nuevo.**

Una línea (`pos(cam).setValue([ANCHO/2, ALTO/2, -1900])`, antes de separar dimensiones) arregló
**cuatro de los cinco** encuadres rotos. El quinto era otra cosa: `panel-documento` ocupaba el 99% del
cuadro. El borde CERCANO de un plano girado 27° se proyecta 1,35×, así que un panel de 1114 unidades
de alto se dibuja de 1503 px en un cuadro de 1080. **Achicar sin mirar el borde cercano deja el panel
corto y cortado igual.**

## 127 · LA CAUSA DE FONDO: una limitación escrita como comentario no llega a la próxima pieza

Esto es lo que de verdad hay que llevarse. **Tres casos en una sola sesión**, idénticos:

| dónde estaba escrito | qué decía | qué pasó |
|---|---|---|
| `sondas/camara.jsx:103` | "`addCamera` la deja en (0,0,-zoom): DESCENTRADA. **La cámara se centra a mano**" | cinco piezas lo resolvían copiándose; la primera escrita de cero lo perdió |
| `motor/comp3d.html` | "diecisiete muestras en dos anillos… **el uso medido es la entrada por foco, no el fondo completamente fuera de foco**" | la PIEZA-I puso su panel a 32 px de círculo de confusión |
| `sondas/exportar.jsx` | el matte no coplanar se **rechaza por nombre** | **no falló nunca** |

El tercero enseña. No falló porque yo tuviera más cuidado: **estaba escrito como un rechazo de máquina
y no como prosa**. La prosa la lee quien ya abrió ese archivo; el rechazo lo choca quien no sabía que
existía.

> **Una limitación que no es una compuerta no existe.**

De ahí salieron tres compuertas, que son la versión de máquina de tres cosas que antes eran comentarios:
`marco-check.mjs` (encuadre + cámara torcida), `foco-check.mjs` (círculo de confusión contra lo que el
motor dibuja liso) y `gesto-check.mjs` (interacción sin consecuencia). Las tres con control negativo, y
las tres vistas fallar.

## 128 · El conmutador: el defecto estaba en el RECURSO, no en la coreografía

`conmutador()` dibujaba la pastilla **ya puesta sobre "Vista"** en un único mapa de bits. El cursor
entraba, hundía su escala en el cuadro 700 —el gesto universal del click— y no pasaba nada, porque el
estado final existía desde el primer cuadro. **No había arreglo posible animando:** un PNG plano tiene
un solo estado. Hubo que partirlo en cuatro piezas (pista, perilla, y los dos rótulos oscuros que se
turnan), dibujadas en **lienzos del mismo tamaño y las mismas coordenadas** para que alinearlas en AE
no fuera una cuenta sino una igualdad.

Por qué ninguna compuerta lo veía: las cinco preguntan por **propiedades de la imagen** y esto es una
propiedad de **la relación entre dos capas a lo largo del tiempo**. Cada cuadro suelto está perfecto.
Una interacción mimada se ve bien cuadro a cuadro y miente en conjunto.

## 129 · Dos defectos del motor que sólo aparecen mirando un cuadro a resolución nativa

La tira a 1:3 los escondió a los dos.

**(a) El desfase del arco no daba la vuelta.** `uDesde`/`uHasta` traen sumado el offset del recorte, así
que salen de [0,1) apenas se anima: con −274° el intervalo pasaba a [−0,761, −0,591] y `ang > uHasta`
era cierto para todo ángulo. **El arco desaparecía entero, sin error.** Sobrevivió porque la sonda que
estrenó la función usaba desfase cero — *una sonda escrita para el caso que implementaste no prueba el
caso en el que se va a usar*, por enésima vez.

**(b) Los objetos de uniform se creaban DENTRO de `onBeforeCompile`.** three llama a ese gancho en el
primer dibujo del material, no al crearlo, así que en **el primer cuadro de cada tanda** el bucle que
escribe los uniforms se salteaba entero y el shader arrancaba con sus valores por defecto: anillo
completo y **desenfoque cero**. Renderizá `555,530` y falla el 555; renderizá `530,555` y falla el otro.

Ese segundo casi me hace arreglar la función equivocada: vi el panel nítido después de tocar el shader
del desenfoque y **di por bueno un arreglo que no había hecho nada**. Lo que lo destapó fue que el arco
y la cabeza de luz *no coincidían entre sí* en el mismo cuadro.

## 130 · Y el desenfoque por capa: tres estados distintos del mismo defecto

1. **Dos anillos de ocho muestras** → el título del panel aparecía **tres veces**, corrido en horizontal.
   Con direcciones fijas, un texto que es una fila de trazos verticales se **replica** en vez de
   difuminarse.
2. **Espiral de ángulo áureo, 32 muestras** → se van las copias, queda una **retícula** de puntos.
3. **48 muestras + giro de la espiral por un hash del píxel** → liso. El error deja de estar
   correlacionado entre vecinos y se lee como grano fino. *La varianza sigue siendo la de 48 muestras:
   el desenfoque grande de verdad son dos pasadas separables, y eso no está escrito.*

Y arriba de todo eso, lo que `foco-check` dijo apenas existió: **después del cuadro 66 no había una
sola capa 3D en foco en toda la pieza.** El plano de enfoque quedaba clavado en 1900 y los paneles
viven a 2450–2600 de la cámara. No se lee como "está desenfocado", se lee como "se ve raro". El foco
ahora sigue al sujeto, tiempo por tiempo.

## 131 · Lo que encontró la revisión adversarial y yo no

Un refutador midió algo que se me había pasado entero: **el anillo era la única capa animada visible de
las 48 sin desenfoque de movimiento.** `img()`, `img2d()` y `rotulo()` lo encienden; mi helper `anillo()`
no. Y es el borde más rápido de la pieza — la punta del llenado hace un pico de **47,6 px/cuadro**, 2,4
veces su propio grosor de trazo, mientras todo lo demás arrastra ~24 px. Sin arrastre eso no se lee como
plano: se lee como **estroboscopio**.

De paso destapó una divergencia silenciosa: el interruptor de desenfoque por capa **viaja** de AE al
documento y **el motor no lo consulta nunca** — el obturador se aplica a la escena entera. Ahora el
reproductor lo **declara** en `sinSoporte` en vez de callarlo. Aplicar la regla de la nota 127 a sí
misma.

## 132 · Un control negativo que dispara por la rama equivocada tampoco prueba nada

`gesto-check` lo sufrió dos veces el mismo día. Congelé **una** capa y siguió en verde — con razón: el
click todavía tenía consecuencia en otra. Congelé **todas** y disparó por *"el click cae sobre el
vacío"*, porque congelar en la primera clave deja toda capa hecha con `vive()` en opacidad cero. Y al
arreglar eso apareció el defecto de fondo de la compuerta: **el desvanecimiento de salida de una capa
contaba como consecuencia del click.** Ahora el movimiento y la escala cuentan siempre, y una BAJADA de
opacidad sólo cuenta si ocurre lejos del final de la capa.

Un control tiene que apagar **todas** las salidas del caso y disparar **por la rama que se quiere
probar**.

---

# PARTE XXI · AE PUEDE DAR PIXELES, Y ESO CAMBIA COMO SE VERIFICA TODO

## 133 · `saveFrameToPng` existe, y apareció por necesidad

Todo este proyecto verifica el motor contra **números** que AE expone: `valueAtTime` para las curvas,
`sourceRectAtTime` para la tipografía y para los animadores de texto. Alcanzó durante meses.

Con las **máscaras** se acabó, y está medido: un sólido de 400×300 informa la misma caja `0;0;400;300`
con la máscara puesta, sin ella, en modo NINGUNO, invertida, con calado 30, con expansión 25, con
opacidad 50, y con una segunda máscara en los cinco modos restantes. **Trece configuraciones, el mismo
número.** `sourceRectAtTime` no refleja las máscaras. Sin un número que dependa de la máscara, no hay
compuerta.

Fui a buscar otra puerta y `comp.saveFrameToPng(tiempo, archivo)` **existe y anda**. Es **asíncrona**
—la llamada vuelve enseguida y el archivo aparece después, igual que `AfterFX.exe -r`, que ya estaba
anotado en la parte XIV— y escribe con **alfa real**: fuera de la máscara `a=0`. Cuatro cuadros en
0,5 s.

**No contradice la arquitectura.** AE sigue sin renderizar el video: renderiza un cuadro para **medir**,
que es la misma categoría que `valueAtTime`. Y ahora hay una verdad de referencia en píxeles para
cualquier función del motor, no sólo para máscaras.

`tools/ae/cuadro-ae.mjs` lo maneja y espera los archivos **hasta que dejan de crecer**: AE crea el PNG
y después lo llena, así que uno a medio escribir se lee corrupto o —peor— entero y con la mitad en
negro.

## 134 · Las máscaras: alfa por píxel en el espacio de la capa

La máscara de AE no es un volumen ni un recorte geométrico: es un **alfa por píxel en coordenadas de
capa**. El modelo fiel es una textura de alfa en ese mismo espacio, multiplicada en el fragmento.
Descartadas con motivo: planos de recorte (sólo convexos, y un rombo restado no lo es), stencil
(obliga a limpiar y dibujar por capa **y por submuestra**, y el obturador hace 16) y triangular el
trazado (no sabe hacer calado).

Este repo ya pagó caro haber modelado el matte de pista como un prisma **en el espacio equivocado**.

**Lo medido, que no se deduce:** los vértices vienen en coordenadas de capa y las **tangentes son
relativas al vértice** —una elipse de radio 110 devuelve tangentes de 60,753, que es 110 × 0,5523—; el
átomo tiene exactamente cuatro hijas; el modo y la inversión son **atributos del objeto** y no se
animan; el enum va de 6812 a 6818.

## 135 · AE no interpola trazados de forma reproducible, así que se muestrea

Entre un triángulo de 3 vértices y un cuadrado de 4, AE devuelve en el medio **cuatro** vértices: le
insertó uno al triángulo, y no en el punto medio del lado sino **en el 42%**. Con 4 contra 6 devuelve
seis. Hay una heurística de emparejamiento sin documentar, y reproducirla a ojo daría un morphing
*parecido*.

Pero `valueAtTime` **sí** entrega el trazado ya interpolado en cualquier instante, incluso en
sub-cuadro. Así que el exportador no reproduce la interpolación: **la muestrea**, un cuadro por vez.
Exacto por construcción, y el motor no necesita saber nada de cómo AE emparejó los vértices.

Y de paso: **el morphing sale gratis.** Era una de las dos cosas que el usuario había pedido, y no hubo
que implementar nada — AE ya lo calcula y sólo hay que leerlo.

## 136 · El recorte de trazados: por longitud de arco, y el desfase en GRADOS

Medido con figuras de longitud conocida y cuadros de AE, no leído:

| figura | recorte | medido |
|---|---|---|
| recta de 300 px | 0-50 | **150 px** |
| recta de 300 px | 25-75 | 150 px, arrancando en 75 |
| ELE de 300+100 | 0-50 | **200 px del tramo horizontal, nada del vertical** |
| ELE de 300+100 | 0-50, desfase 25 | corrió **28 px** |
| dos subtrazados de 140 | 0-50 | 0..69 **y** 180..249 |

La longitud corre sobre el **trazado entero**, no por segmento. Los subtrazados se recortan **cada uno
por su lado**. Y **el desfase está en grados**: 25/360 × 400 = 27,8 ≈ 28. Nadie deduce eso, y con ello
mal el trazo arranca en el lugar equivocado sin que nada falle.

## 137 · Tres defectos míos, y los tres del mismo tipo

**`vMapUv` no existe si no hay mapa.** Usé esa varying para muestrear la máscara. Un **sólido no tiene
`map`**, así que la varying no se declara, el shader no compila y el material no dibuja: las cuatro
capas enmascaradas salieron **invisibles**, y la única que se veía era justo aquella cuya máscara
estaba rechazada. Sin error en consola. Ahora la UV se calcula desde `position`, que ya está en
coordenadas de capa — así las dos cosas salen del mismo origen en vez de tener que coincidir.

**El `else if` de arriba se come al de abajo.** El exportador manda el árbol vectorial *y* el PNG
rasterizado. Sin un `&& !capa.forma`, la rama del raster agarraba la capa primero y la del vector no
corría nunca. Seis figuras en negro, sin un error.

**Un salto de línea real dentro de comillas simples**, por tercera vez en el día y en el mismo archivo.
Va en literal de plantilla y queda dicho por qué.

## 138 · Una sección de DIAGNÓSTICO no puede matar a la sonda que diagnostica

`sondas/trazo.jsx` terminaba con un volcado de estructura —puro diagnóstico— que falló dos veces por
motivos distintos: pedirle `.value` a un grupo, y usar una referencia que quedó inválida al agregar
otra propiedad al grupo (la misma trampa del selector de texto, nota 128). Cada vez se llevó puesta la
sonda **entera**, justo antes de crear la cámara. Sin cámara, el capturador elige el reproductor 2D,
que no dibuja formas vectoriales, **y todo salía en negro**.

Dos vueltas perdidas diagnosticando el motor por culpa del diagnóstico. El volcado va al final, en su
propio `try`, y si falla se informa como `ESTRUCTURA_FALLO`.

## 139 · Y lo que TODAVÍA no probé, dicho antes de que me lo encuentren

La compuerta de píxeles dio 0,007% en las máscaras y 0,003% en los trazos. Pero ejercitó **suma,
suma+resta y calado**. No ejercitó **intersección, aclarar, oscurecer, diferencia, invertida ni
expansión**, ni el caso en que la PRIMERA máscara es restar —donde el acumulador tiene que sembrarse
con la capa entera y no con vacío—, ni la expansión en una esquina.

O sea: **probé lo que implementé.** Es el mismo patrón que este cuaderno denuncia en otros tres lugares
con otro nombre. La sonda que lo cubre (`mascara3.jsx`, doce casos) está escrita y sin correr.

Y dos límites más, declarados: **AE desenfoca las máscaras con el obturador y el motor no** (el trazado
viaja muestreado por cuadro), y el **reproductor 2D** no dibuja ni máscaras ni formas vectoriales ni
animadores — ahora lo declara, porque el capturador lo elige justo en las composiciones más simples.


## 140 · El calado, medido: radio y centrado, y el borde falso del lienzo

Seis calados sobre la misma figura, un cuadro de AE, y la regla sale sola: el **ancho total de la rampa
es 2 × calado** (8→17, 16→33, 26→54, 40→82, 64→130) y **el cruce del 50% no se mueve** en ninguno. O
sea que el calado de AE es el **radio** y la rampa va **centrada en el trazado**, no hacia adentro.

La rampa de 5% a 95% mide 1,40 × calado; para una gaussiana eso es 3,29 σ, así que σ = **0,426 ×
calado**. Yo usaba 0,5 y el borde salía más blando de la cuenta: 20 px de rampa donde AE hace 15.
Ajustar contra un punto no habría servido — la relación se ve recién con el barrido.

**Y un defecto general que sólo aparece con calados grandes:** rasterizar la máscara justo en la caja de
la capa mete un **borde falso**, y el desenfoque chupa transparencia desde el filo del lienzo. Con
calado 64 sobre una capa de 90 px de alto la rampa pasó de 87 a **671 px**: el alfa no saturaba en
ningún lado. Con calado 26 el defecto existía y no se veía. El lienzo va con margen.

## 141 · Probé los modos que implementé, y lo dije antes de que me lo encontraran

La nota 139 quedó escrita reconociendo que la compuerta de máscaras había ejercitado **suma, suma+resta
y calado** y nada más. Los doce casos dieron dos cosas:

- **`calado + expansión` juntos fallaba al 1,770%**, y nadie los había probado juntos
- y quedó **medido** lo que yo había supuesto sin decirlo: una primera máscara en **restar** o
  **intersecar** sí siembra el acumulador con la capa entera. 8200 y 36000 píxeles, que son exactamente
  los números geométricos.

Después del arreglo, doce de doce entre 0,000% y 0,049%.

## 142 · Una carpeta por composición, o la compuerta compara piezas distintas

Los cuadros de AE iban todos a `ae-cuadros/` nombrados por número. Correr la compuerta sobre una
composición y después sobre otra compara **los cuadros de AE de la primera contra los del motor de la
segunda**. Acá lo cazó la diferencia de tamaño —800×660 contra 1200×800, salió con código 2— pero con
dos composiciones del mismo tamaño **habría dado verde sobre piezas distintas**.

Es el mismo error que el canal asíncrono: un archivo viejo que se lee como si fuera de esta corrida. Ya
estaba resuelto para el caso "AE no llegó a escribirlo" y no para el caso "lo escribió otra pieza".


---

# PARTE XXII · OBJETOS 3D: EL CAMINO ES OTRO, Y APARECIO UN DEFECTO VIEJO

## 143 · El motor Cinema 4D de AE no renderiza en esta máquina

`comp.renderer = "ADBE Ernst"` se acepta. Con él, una capa de texto 3D expone `ADBE Extrsn Depth`,
biseles y diecisiete propiedades de material, y la extrusión **se puede escribir** (la puse en 40 y lo
confirmó). La API dice además que **no se apaga nada**: fusión, mattes y máscaras siguen legibles y
escribibles con los dos motores.

Y al renderizar tira **`Cinema 4D: Error de procesamiento (5070 :: 0)`**. Escribió el cuadro del motor
clásico y no el suyo.

**Es la razón por la que había que mirar el píxel:** una función puede seguir declarada y dejar de
dibujarse, y eso en los números no se ve. El cartel además se saltó `beginSuppressDialogs` — un error
de render no es un diálogo suprimible.

Aunque anduviera, ese camino exigía sacar los contornos de los glifos, triangular, extruir, biselar y
portar el modelo de luces y materiales de Maxon, con las luces hoy rechazadas. Un proyecto entero para
algo que el género casi no usa.

## 144 · Casi todo lo que parece un objeto 3D son PLANOS

En los ocho avisos de referencia, el objeto sólido es una caja de seis planos, la tarjeta con peso es
una cara y cuatro cantos, y el carrusel es una rueda de paneles. El 3D Clásico lo previsualiza exacto,
el exportador ya lo lleva y el motor ya lo dibuja — **sin una línea nueva**.

Medido con `sondas/objeto3d.jsx` contra cuadros de AE:

| figura | desvío de área |
|---|---|
| caja de 6 caras girando | 0,20% – 2,26% |
| tarjeta con espesor de 14 px | 0,34% – 0,39% |
| rueda de 8 paneles | **2,47% – 7,21%** |

## 145 · El padre va PRIMERO y la posición después

Gasté dos mediciones buscando un defecto de orden de dibujo que no existía. En mi sonda ponía la
posición de cada cara y **después** el padre — y AE, al emparentar, **recalcula los valores del hijo
para conservar su posición en el mundo**. Las seis caras quedaron apiladas alrededor del origen de la
composición, o sea la esquina superior izquierda: al cuadro 0 la única tinta del cuadro estaba en
`y 0..21`.

## 146 · Y el defecto que quedó ABIERTO: la composición padre-hijo con rotación en X

La rueda seguía desviándose después de arreglar el emparentado, así que lo aislé en dos pasos.

**Primero, el orden de rotaciones de una capa suelta: está bien.** Nueve combinaciones —incluidas
`x40 y50 z60` y `x-35 y55 z-25`— coinciden con AE **caja por caja, al píxel**. Las diferencias de área
de 0,1% a 1% son el antialias del borde. Hipótesis descartada con datos.

**Después, lo mismo colgado de un padre rotado**, dos hijos a 120 unidades del origen del padre:

| rotación del padre | desvío |
|---|---|
| `y45` sola | **0,05%** |
| `x-14` | 6,55% |
| `x-14 y45` | 6,02% |
| `x-22 y60` | 12,77% |
| `x45 y45 z45` | **42,17%** — la caja pasa de 151 a 204 px de ancho |

**Con el padre rotado sólo en Y coincide perfecto; en cuanto entra la X, el hijo cae en otro lado.** Y
como una capa suelta con las mismas rotaciones sí coincide, no es el orden: es cómo se compone la
matriz del padre con la del hijo.

Está sin resolver. El repro es `sondas/rotpadre.jsx` + `cuadro-ae.mjs SONDA-ROTPADRE 0`, y afecta a
CUALQUIER pieza que use emparentado con rotación en X — que es la forma natural de armar un objeto 3D
con planos.


## 147 · La orientación va ENCIMA de las rotaciones, y AE la pone sola al emparentar

El defecto de la nota 146 quedó resuelto, y la causa no estaba donde la buscaba.

**Lo primero fue bisecarlo.** Un padre a `x45 y45 z45` y cuatro hijos:

| hijo | desvío |
|---|---|
| trasladado en X, **sin rotación propia** | **0,03%** |
| trasladado en Z, **sin rotación propia** | **0,00%** |
| en el origen, **con `ry=45`** | **53,8%** |
| trasladado **y** con `ry=90` | **388%** |

O sea: la traslación a través del padre era exacta y lo que fallaba era la rotación propia del hijo. Y
el motor la dibujaba **más de frente**, no más de perfil — al revés.

**La causa apareció mirando el documento, no la matriz.** El hijo tenía
`orientacion = [300,36 · 8,42 · 300,36]`, que yo nunca puse: **AE le asigna una orientación sola a
cualquier capa que se emparenta**, para conservar su orientación en el mundo. Exactamente el mismo
mecanismo que ya me había mordido con la posición (nota 145), y ni se me ocurrió que aplicara también
a la rotación.

Con eso a la vista, la hipótesis era otra: el motor componía `T · Rx·Ry·Rz · Ori` y AE hace
`T · Ori · Rx·Ry·Rz`. Contrastado contra dos casos independientes:

```
rotaciones y después orientación   ->   error de 30,3 y 39,8 px
orientación y después rotaciones   ->   error de  1,4 y  1,2 px
```

**Y el comentario del código decía "la fórmula MEDIDA, en el orden que quedó determinado probando los
seis candidatos".** Estaba medida, y estaba mal: esa medición nunca puso orientación y rotación **las
dos** distintas de cero, y con una sola de las dos los dos órdenes dan idéntico. Es el mismo patrón que
este cuaderno denuncia en otros cinco lugares, esta vez firmado por una medición que se creía completa.

Arreglado en las **dos** implementaciones —`cinematica.mjs` y `comp3d.html`, que tenían la misma
fórmula—. Resultado: la sonda que daba 388% ahora da 0,037%, y la de 42,17% da 0,118%.

## 148 · El antialias no es un defecto, y un umbral global lo trata como si lo fuera

Después del arreglo quedaba `objeto3d` apenas en rojo, y la pregunta era si sobraba un error real o
sobraba umbral. Se contesta separando **borde** de **interior**: de 1141 píxeles con el color distinto,
**1074 estaban en un borde y 67 adentro** — y esos 67 eran valores intermedios, o sea antialias en
costuras entre paneles.

AE y Chromium suavizan los bordes distinto, siempre. Esa diferencia es **irreducible y crece con el
detalle de la escena**: una rueda de ocho paneles superpuestos tiene cuatro veces más borde que una
caja de seis caras, así que con un umbral global la escena más detallada sale roja **por ser más
detallada**, no por estar peor.

La compuerta ahora parte las dos métricas —alfa y color— en borde e interior, con un vecindario de
**dos** píxeles (uno solo deja pasar el segundo píxel de la rampa como si fuera interior). El interior
reprueba con techo bajo; el borde se informa.

Resultado sobre las siete sondas: **interior 0,000% en todas** salvo objeto3d con 0,050%, y bordes de
0,00% a 1,70%. El control negativo dispara en 8,006%.
