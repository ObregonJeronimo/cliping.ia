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

- **7 rápidas (~8 s), en cada cambio del motor:** `verificar.mjs`, `guion-check`, `encuadre-check`,
  `adn-check`, `testimonios-check`, `tira-check` (la página del cliente no se deforma) y
  `heroes-check` (un héroe no se ofrece si no tiene con qué).
- **Guard completo (~30 min), sólo antes de pushear:** `npm run gates:guard`. Tiene que dar 31 OK /
  0 FAIL. Nunca correr dos guards a la vez.

## Dónde vive el motor

`render3d/demo/` (escenas, héroes, kit, guion) + `backend/motor.py` y `backend/render3d.py`.
No es `src/urvid` (canvas 2D) ni `remotion/`.
