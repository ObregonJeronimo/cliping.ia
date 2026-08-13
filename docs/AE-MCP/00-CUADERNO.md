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
