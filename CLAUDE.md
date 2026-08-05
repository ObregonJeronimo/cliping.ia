# cliping.ia — instrucciones del workspace

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

## Compuertas

- **10 rápidas (~12 s), en cada cambio del motor:** `verificar.mjs`, `guion-check`, `encuadre-check`,
  `adn-check`, `testimonios-check`, `tira-check` (la página del cliente no se deforma),
  `heroes-check` (un héroe no se ofrece si no tiene con qué), `placeholder-check` (el recorte que se
  muestra es la imagen del cliente, no su borrador) `captura-check` (no se construye un video sobre
  un muro anti-bot o un error del CDN) y `eco-check` (la misma frase no sale en dos escenas).
- **Guard completo (~30 min), sólo antes de pushear:** `npm run gates`. Tiene que dar 36 OK / 0 FAIL.

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
