# cliping.ia — instrucciones del workspace

## AVISAR ANTES DE CUALQUIER TRABAJO PESADO — y esperar el OK

Esto es una regla de convivencia, no una recomendación técnica. **Jero y Thiago comparten este repo
pero trabajan en dos PC distintas**, y ninguno puede adivinar cuándo el asistente está por ocuparle
media máquina. Sin aviso, abrir Photoshop o empezar a stremear en el momento equivocado cuelga el
equipo — y ya pasó: la noche del 4 de agosto de 2026 se colgó **tres veces**, con Photoshop y OBS
abiertos, mientras corrían las compuertas. El evento 2004 de Windows lo dejó por escrito: `node.exe`
pidiendo 42 GB en una máquina de 15.

**Qué cuenta como pesado:** `npm run gates`, un render de `backend/motor.py`, un barrido que construya
cientos de escenas, cualquier cosa lanzada con `npm run pesado`. **Qué no:** las 10 compuertas rápidas
(~12 s), leer archivos, editar código, medir sin renderizar. La regla es para lo que ocupa la máquina.

### Antes de eso: el trabajo se dimensiona a la máquina, solo

Todo lo demás de la red es **reactivo** — vigila y mata cuando la cosa ya se fue de mano. Eso no evita
que una herramienta *pida* 42 GB en una PC de 15; sólo evita que se los lleve puestos. Lo preventivo,
que no hay que invocar ni recordar:

- **Techo de memoria de Node calculado contra la RAM real de cada PC** (40%, mínimo 1 GB, máximo 6 GB).
  Al cruzarlo Node se muere solo, con un error claro, sin arrastrar la sesión. Se hereda: lo reciben
  todos los procesos hijos. *No cubre los buffers de píxeles, que viven fuera del montón de JavaScript
  — a esa familia la cazan `sin-fuga-check` y el vigilante. Son tres cosas distintas y hacen falta las
  tres.*
- **Si no entra, no arranca.** Antes de lanzar se compara lo que esa tarea pidió **en esta máquina** con
  lo que hay disponible. Si no queda al menos el piso libre, se niega y dice cuántos MB faltan. Media
  hora de compuertas que se sabe que no entran es media hora tirada y una PC colgada.
- **Prioridad baja y dos hilos libres**, para que la sesión siga respondiendo.

### Antes de largar, mirar tres cosas

1. **Cuánta RAM hay disponible ahora** y **cuánto pidió esa tarea en ESTA máquina**: `npm run costo`.
2. **Qué aplicaciones tiene abiertas la persona**, y cuánto ocupan. Se mide, no se supone.
3. Con eso, **cuánto le va a quedar libre mientras trabajás**.

Sobre el punto 2, un límite honesto: se puede ver **qué hay abierto ahora y cuánto ocupa**. "Qué venías
usando la última hora" no se puede saber sin inventarlo — y acá inventar un dato es exactamente lo que
no se hace. Decí lo que medís.

### Y después, elegir el tono según lo que encontraste

**Si hay aplicaciones pesadas abiertas** (Photoshop, OBS, Premiere, After Effects, DaVinci, Blender,
una VM, un juego), el aviso es completo y nombra la aplicación:

> Voy a empezar algo pesado: el guard completo, ~30 min. En esta máquina midió 4,8 GB en el peor caso
> y ahora hay 7,5 GB disponibles, así que te quedarían ~2,7 GB. Veo Photoshop abierto ocupando 8,5 GB
> y OBS — **no te recomiendo usarlos mientras corre esto**, podría congelarte la PC. ¿Te parece que
> arranque, o preferís que espere a que termines?

**Si sólo hay aplicaciones livianas** (el navegador, el editor, Spotify), el aviso es corto y pide un OK
que valga para todo el rato, en vez de interrumpir cada vez:

> Veo que estás sólo con el navegador, que consume poco — con eso no hay problema. Voy a seguir con
> trabajo pesado un rato largo. **¿Me das el OK para seguir sin parar?** Si en algún momento vas a abrir
> algo pesado (Photoshop, OBS, un juego), avisame y freno.

**Ese OK amplio dura mientras la situación no cambie.** No hay que volver a preguntar por cada tarea:
se pregunta de nuevo si la persona avisa que abrió algo pesado, si aparece una aplicación pesada
nueva, o si la RAM disponible cae tanto que la cuenta ya no cierra.

**Si la tarea nunca se corrió en esta máquina, `npm run costo` lo dice y hay que decirlo también.** Lo
medido en la PC de Jero **no predice nada** sobre la de Thiago: otra memoria, otros componentes. Dar el
número de la otra máquina como si fuera propio es un dato falso con cara de medición, y eso es peor que
decir "todavía no lo sé, es la primera vez que lo corro acá".

## Cómo se audita un video del MOTOR 3D

Esta sección existe porque se rompió la confianza en una frase. Decir "miré el video cuadro por
cuadro" cuando lo que se hizo fue abrir cuatro imágenes sueltas es mentir, y el costo lo paga el
usuario encontrando en cinco segundos defectos que el asistente juró haber buscado.

**La regla, sin vueltas:** nunca digas "cuadro por cuadro" salvo que lo hayas hecho. Decí cuántos
cuadros abriste y cuáles. "Miré los cuadros 45, 90, 300 y 460" es honesto y además es información
útil. "Lo revisé entero" sin haberlo hecho no es un atajo de redacción, es un dato falso.

### El procedimiento

Un video de 25 s a 30 fps son 750 cuadros. No entran en contexto ni cerca, así que mirarlos todos a
ojo no es una opción — y prometerlo es volver a mentir, sólo que más caro. Lo que sí funciona:

1. **Medir los 750 por programa.** Un script recorre todos los cuadros y calcula métricas por
   cuadro: nitidez, bloques de compresión / pixelado, contraste del texto, cuadros casi idénticos,
   movimiento entre cuadros. Eso no cuesta contexto: cuesta CPU, que sobra.
2. **Abrir entre 10 y 15 cuadros**, los que la medición marcó como sospechosos más algunos de
   control. Diez a quince, no cuatro: con menos se escapan justo los defectos que aparecen una vez.
3. **Abrirlos a resolución completa, de a uno.** Nunca en una tira `hstack` reescalada a 250 px de
   ancho: eso destruye exactamente el detalle donde viven el pixelado, el fantasma del obturador y
   el texto cortado. Las tiras sirven para comparar composición, no para auditar.
4. **Mirar también el plan**, no sólo los píxeles. `plan.json` dice qué escenas entraron y en qué
   orden. Una escena repetida dos veces en una pieza de 25 s se ve ahí antes que en ningún cuadro —
   y ya pasó: `toro` salió dos veces en un video y el plan estaba impreso en pantalla.

### Lo que NO se audita mirando cuadros

Antes de sacar una sola imagen, preguntarse si el defecto se puede cazar al construir. Casi siempre
sale más barato y más confiable:

- **Un recorte pixelado** no es un problema de render: es una imagen de 120 px dibujada a 900. Se
  mide comparando los píxeles reales del elemento contra el tamaño con que se dibuja, sin renderizar.
- **Una escena repetida** es una regla del guion.
- **Una forma que no le corresponde al rubro** (geometría técnica en una panadería) es una regla de
  selección, no algo que se vea en un cuadro.

Una compuerta corre en segundos sobre cientos de combinaciones; una inspección visual corre sobre
un video. Cuando las dos pueden cazar el mismo defecto, gana la compuerta.

### Diagnosticar antes de acusar

Está documentado a los golpes en el historial de este repo: revertir arreglos hechos sobre un
diagnóstico falso cuesta más que no haberlos hecho. Antes de declarar un defecto:

- Verlo en el **cuadro completo**, no en un recorte.
- Confirmar que **ninguna línea lo pidió a propósito** (mucho de lo que parece error está declarado
  y comentado en la escena).
- Leer el dato de la **clave correcta** — más de una vez el "defecto" fue leer el campo equivocado.
- Si una métrica da fuera de rango, eso prueba que hay **algo que explicar**, no que hay un defecto.

## Herramientas de auditoría — miden, no bloquean

Las compuertas dicen *sí o no* y corren en el guard. Estas **miden** y se corren a mano cuando hace
falta mirar algo: son caras (renderizan) y su salida es una tabla, no un veredicto. Todas van por
`npm run pesado`.

| herramienta | qué mide | dónde está el estado |
|---|---|---|
| `tools/encaja-inventario.mjs` | censo de mallas que muestran imagen y cuáles declaran si entran enteras | `docs/ENCAJE-ESTADO.md` |
| `tools/heroes-audit.mjs` | los 17 héroes por geometría: mallas, cobertura, movimiento (rápida, sin render) | `docs/HEROES-AUDIT.md` |
| `tools/heroes-render.py` | los 17 héroes **sobre píxeles**: contraste del rótulo, movimiento real, tinta | `docs/HEROES-AUDIT.md` |
| `tools/escenas-render.py` | cada escena por separado dentro de la pieza, sobre píxeles | `docs/ESCENAS-AUDIT.md` |
| `tools/aires-render.py` | los 11 aires comparados entre sí sobre la misma página y semilla | `docs/ESCENAS-AUDIT.md` |

Y dos modos que no son herramientas sino puertas traseras de una compuerta que ya existe:

```bash
# el producto cartesiano completo de encuadre-check (3256 construcciones en vez de 407).
# Partido por aire porque en un solo proceso revienta con "Create skia surface failed" — es la fuga
# de `texto()`, no un defecto. Se corre cuando se toca el encaje.
for a in artesanal bienestar corporativo deportivo editorial gastronomico inmobiliario jugueton lujo nocturno tecnico; do
  ENCUADRE_CARTESIANO=1 ENCUADRE_AIRE=$a node tools/encuadre-check.mjs
done
```

**LO QUE NINGUNA DE ESTAS PUEDE DECIR.** Un número bajo no es un defecto. Varias escenas componen así
a propósito —`sello` con el vacío, `bandera` con un campo liso, `gancho` con una placa que hay que
poder leer— y sus cabeceras lo explican. **La herramienta dice dónde mirar; el archivo dice si eso
estaba buscado.** Cada documento tiene su lista de falsos positivos ya comprobados, para no volver a
investigarlos.

## Compuertas

- **10 rápidas (~12 s), en cada cambio del motor:** `verificar.mjs`, `guion-check`, `encuadre-check`,
  `adn-check`, `testimonios-check`, `tira-check` (la página del cliente no se deforma),
  `heroes-check` (un héroe no se ofrece si no tiene con qué), `placeholder-check` (el recorte que se
  muestra es la imagen del cliente, no su borrador) `captura-check` (no se construye un video sobre
  un muro anti-bot o un error del CDN) y `eco-check` (la misma frase no sale en dos escenas).
- **Guard completo (~15 min), sólo antes de pushear:** `npm run gates`. Tiene que dar **44 OK / 0 FAIL**.

  **`npm run gates` ahora corre las compuertas DE A UNA** (`tools/gates-partido.mjs`), y eso no es una
  versión reducida: son las mismas 42, en el mismo orden, leídas del mismo `gates:crudo`. Lo único que
  cambia es el agrupamiento — la versión encadenada las mete a todas en un proceso de npm, así que la
  memoria se acumula hasta la última y el pico llega a **3001 MB**. De a una el pico es el de la
  compuerta más cara, y el sistema recupera la memoria al cerrar cada proceso. Medido con un juego
  abierto: nunca bajó de 3363 MB libres, y tarda **la mitad** (15 min contra 30).

  **Cuál es la más cara: acá decía `fondo-check`, 1052 MB, y era falso.** No estaba inventado —salía
  del máximo de `npm run costo`— pero esa tabla sólo tenía las cuatro o cinco compuertas que alguien
  había corrido a mano con `npm run pesado`; las otras 37 nunca se habían medido por separado. Se
  presentó *el máximo de lo medido* como *el máximo de todo*, que es el mismo error que este archivo
  advierte en otros tres lugares con otro nombre. Lo refutó una corrida real del 7/8/2026: cortó en
  `urvid1-test.mjs` —que no figuraba en la tabla— con el disponible cayendo de 3643 a 901 MB, o sea
  unos **2,7 GB**. Ahora **cada compuerta anota su costo al correr**, así que después de un guard
  completo `npm run costo` tiene las 42 y el número deja de ser una deducción.

  Mantiene el cerrojo, el techo de memoria de Node y el vigilante en vivo que mata el árbol si la
  memoria se desploma. Y si algo falla, las corre TODAS y te dice todo lo roto de una vez más cómo
  retomar (`--desde N`), en vez de cortarse en la primera.

  La encadenada sigue disponible como `npm run gates:mono`.

  **El número de referencia pasó de 36 a 44 y no aparecieron compuertas nuevas:** el guard contaba con
  `/OK \(|OK:/` y seis compuertas saludan con raya, así que informaba de menos. En la misma revisión
  apareció algo peor — el contador de FAIL exigía que la línea *empezara* con FAIL, y las compuertas
  escriben `GATE CAPTURA FAIL (2)`: el guard llegó a informar **"35 OK · 0 FAIL · exit 1"** con una
  compuerta fallando de verdad.

## La máquina no se cuelga más

Esta sección existe porque la PC de desarrollo se colgó **dos veces**: el 26 de julio de 2026 (una fuga
de `getImageData` que llegó a 28 GB en una máquina de 15) y el 4 de agosto de 2026, **con el guard
corriendo**. La segunda es la que importa, porque la protección ya existía y no sirvió.

Por qué no sirvió, leído del log y no supuesto:

1. **El vigilante se quedó ciego.** Muestreaba con `powershell ... ConvertTo-Json`, y bajo presión de
   memoria .NET no pudo cargar el ensamblado: `FileLoadException`, seis veces. Un `catch {}` se lo
   tragaba, así que el guard siguió **sin medir nada** mientras las compuertas seguían pidiendo RAM.
2. **Miraba sólo procesos `node`.** Chromium de Playwright —lo más pesado de la cadena— era invisible.
3. **El tope era por proceso (8 GB), no total.** Dos procesos de 7 GB en una máquina de 15 pasaban los
   dos.
4. **Nada impedía correr dos cosas pesadas a la vez.** La regla *"nunca dos guards"* estaba escrita
   acá, y una regla escrita la cumple quien la leyó. El cuelgue fue guard + renders de `motor.py`.

Lo que hay ahora, y **no hace falta acordarse de nada**:

- **`npm run gates` ES el camino vigilado.** La cadena cruda pasó a llamarse `gates:crudo`. Antes el
  comando más natural de tipear era justo el único sin protección.
- **`tools/lib/memoria.mjs`** vigila con `os.freemem()` —que no puede fallar por falta de memoria
  porque no reserva nada— cada 250 ms, mata el **árbol** de procesos, y si el muestreo falla **aborta**
  en vez de seguir a ciegas.
- **El piso se calcula contra lo que hay al arrancar** (35% del disponible, techo 20% del total, mínimo
  800 MB). Un piso fijo cortaría toda corrida en esta máquina, que trabaja con ~2,4 GB disponibles.
- **`tools/lib/cerrojo.mjs` + `backend/cerrojo.py`** son el mismo cerrojo para los dos lenguajes: un
  render y un guard a la vez ya no arrancan. El segundo dice quién lo tiene y desde cuándo.
- **Si hay menos de 1200 MB disponibles, el guard no arranca** y te dice que cierres aplicaciones.

### Era la memoria, y Windows lo tenía anotado todo el tiempo

Se colgó tres veces la noche del 4/8, y estuve dando vueltas entre fuente, temperatura y placa de video
antes de mirar donde había que mirar. Windows trae un **detector de agotamiento de recursos** que se
dispara solo y **nombra al culpable** (evento 2004, proveedor `Resource-Exhaustion-Detector`):

```
04/08 23:56:15  node.exe (23276) usó 42.155.171.840 bytes · Photoshop.exe 8.552.357.888
26/07 22:03:24  node.exe (9512)  usó 47.891.099.648 bytes
26/07 16:08:56  node.exe (10444) usó 48.150.077.440 bytes
```

**42 GB pedidos en una máquina de 15 GB con 22 de paginación**, tres minutos y medio antes del cuelgue
de las 23:59:52. Y esa vez el `node.exe` era la cadena de compuertas que había quedado **huérfana**
(ver abajo). Los diecisiete eventos del 25-26 de julio son todos `node.exe` a 47-48 GB: la fuga de
`getImageData`.

Descartados con datos, no por opinión: disco (NVMe sana, cero errores), EXPO (la RAM va a 4800, JEDEC),
hardware (**cero** eventos WHEA en 30 días) y pantalla azul (`BugcheckCode = 0` en los tres — la
máquina se colgó, no falló el kernel).

**La placa de video no era.** Estuvo en la lista de sospechosos porque el síntoma —la imagen se congela
y después la pantalla se va a negro— apunta ahí, y porque no hay ningún evento 4101/4104. Pero con
42 GB pedidos y Windows gritándolo en el log, no hace falta otra explicación.

Lo que descarta la medición: no es el disco (NVMe sana, sin errores) y no es EXPO (la RAM corre a
4800, JEDEC).

**Y una conclusión que estuvo escrita acá y era falsa:** se dedujo de los eventos de arranque que el
equipo venía de "6 días prendido sin un corte". Mentira. Windows tiene **Inicio rápido**
(`HiberbootEnabled = 1`), así que "Apagar" no apaga —hiberna el núcleo— y el reloj de arranque no se
reinicia. Jero apaga la máquina todas las noches; el dato decía lo contrario porque estaba mal leído.
Queda anotado porque una conclusión falsa sobre hardware manda a gastar plata en la pieza que no es.

Y el Inicio rápido no es sólo un error de medición: es **sospechoso**. Con él, el estado del kernel y
de los drivers —el de la placa incluido— nunca se reinicia del todo y se arrastra entre encendidos. Es
causa conocida de justo este síntoma: la imagen se congela, la pantalla pierde señal y no vuelve.

**`npm run informe` lo cuenta todo, y no hay NADA corriendo en segundo plano.** La primera versión de
esto era un proceso anotando cada 5 segundos; no hace falta, porque Windows ya lo anota solo. El
informe lee los cierres inesperados, los eventos 2004 con el culpable y los bytes, los del driver de
video, los WHEA, y lo cruza con el **cerrojo**: se escribe una vez al arrancar algo pesado y se borra al
terminar bien, así que si sobrevive a un cuelgue dice exactamente qué estaba corriendo. Costo en vivo:
un archivo al empezar y otro al terminar.

### Y se colgó una segunda vez esa misma noche, arreglándolo

El primer arreglo tenía un agujero, y lo abrió la **prueba de humo del propio guard**: se corrió
`timeout 70 node tools/gates-guard.mjs`, el timeout mató al guard, el guard soltó el cerrojo
ordenadamente... y `npm run gates:crudo` —con su node y su Chromium debajo— **siguió corriendo
huérfano**, sin vigilante y sin cerrojo. Cuatro minutos después la máquina no respondía.

En Windows un proceso no se lleva a sus hijos al morir. Está probado, no supuesto: matando sólo al
padre, `npm` y `node` sobreviven.

- **Si muere el guard, muere la cadena** — en cualquier muerte: Ctrl-C, timeout, cerrar la terminal, una
  excepción.
- **Barrido de huérfanos al arrancar.** Con el cerrojo en la mano, cualquier cadena viva es un huérfano
  de una corrida anterior; se mata y se informa.

**Y no se prueba un vigilante de memoria agotando la memoria de verdad.** La primera prueba lanzaba un
proceso que pedía 200 MB cada 150 ms y dejó el disponible en 626 MB: estuvo a un pelo de colgar la
máquina para comprobar que la máquina no se cuelga. Ahora el lector se inyecta y la caída se **simula**:
`node tools/memoria-test.mjs` corre en 5 segundos y no reserva un solo byte.

Todo esto está probado, no razonado — y la prueba corre sola, es la primera de `npm run gates`:
piso adaptativo, caída sostenida, pico que no debe disparar, caída crítica sin espera, muestreo roto que
aborta, huérfanos, cerrojo, y el guard entero de punta a punta con una cadena falsa de un segundo.

## Dónde vive el motor

`render3d/demo/` (escenas, héroes, kit, guion) + `backend/motor.py` y `backend/render3d.py`.
No es `src/urvid` (canvas 2D) ni `remotion/`.
