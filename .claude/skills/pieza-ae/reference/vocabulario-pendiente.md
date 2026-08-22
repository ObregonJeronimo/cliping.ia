# Lo que el motor todavía no sabe hacer — y cuánto cuesta cada cosa

> ## YA NO ESTÁN PENDIENTES (construidos y verificados con sonda)
>
> | | qué desbloquea | cómo se verificó |
> |---|---|---|
> | **fusión aditiva** por capa | cometas de escritura, destellos, halos, reflejos — toda la familia de la luz | `sondas/fusion.jsx`: dos discos idénticos, uno normal y uno sumando, sobre una franja clara. El de la suma se aclara donde cruza; el normal la tapa |
> | **interletra bien medida** | toda la tipografía con tracking, y se va un falso positivo permanente de `comp-check` | misma sonda: el texto con interletra 200 se dibuja entero. Sin el arreglo el navegador medía ~1012 contra 1347 de AE, o sea 25 % de desvío |
> | **recorte por matte de pista rectangular** | revelado por máscara, barrido, scroll dentro de un marco, píldora que se abre | `sondas/recorte.jsx`: el mismo texto subiendo, con y sin recorte. Con recorte no existe hasta cruzar el borde |
>
> Y dos más, verificadas igual: **profundidad de campo por capa** (`sondas/profundidad2.jsx`, cuatro
> paneles y el foco viajando) y **arco que crece** (`sondas/arco.jsx`, 25/60/100 % y uno animado).
>
> El recorte se declara con un **matte de pista de AE**, no con una capa apagada que sólo mire el motor:
> así la previsualización de AE muestra lo mismo que el render.
>
> ### Y el recorte está ACOTADO — leer esto antes de usarlo
>
> Sólo funciona con la matte **coplanar con la capa recortada y sin girar en X ni en Y**. El exportador
> rechaza el resto por nombre y pone el documento en INCOMPLETO.
>
> El motivo: el matte de pista de AE es **alfa de pantalla**, o sea que lo que vale es el cuadrilátero
> *proyectado*. Cuatro planos de recorte equivalen a esa proyección sólo en el caso coplanar. Con la
> matte girada 42° y la capa a otra Z, medido, el recorte sale angosto y la capa casi desaparece.
>
> Intenté la versión general —una pirámide desde el ojo— y los cuatro planos dieron **residuo cero
> contra el ojo** (o sea: bien armados) y el recorte igual salió mal, porque el ojo y las esquinas no
> terminan en el mismo espacio. Eso hay que medirlo, no adivinarlo. **Una función acotada que dice dónde
> termina es útil; una que anda en la sonda y falla en la pieza, no.**
>
> ### Y lo que se DESAPROBÓ después de aprobarlo
>
> **Pantalla y Aclarar volvieron a ser `NOSOP`.** Los había aprobado colapsándolos en el mismo nombre
> que Añadir — tres párrafos después de escribir que aprobar algo en silencio dando otra operación es
> peor que rechazarlo. No son la misma cuenta: sobre un fondo de 217 con una capa de 77, AE en Aclarar
> dibuja **217** (la capa es invisible) y el motor daba 255.
>
> **Y algo que el barrido dijo que NO hay que construir:** las curvas con sobrepaso. Ninguno de los ocho
> avisos usa rebote ni overshoot. Estaban primeras en la lista de desbloqueo por costo, y la medición
> las bajó a último lugar — no por caras, por innecesarias para este género.

Sale de una investigación de catorce agentes sobre las diez técnicas que pidió Thiago (tipografía
cinética, revelado por máscara, cascada, fuentes variables, morfeo de interfaz, cursor, resortes,
curvas, desenfoque, escalonado), cruzada con una auditoría del exportador, del reproductor y del
documento.

**Está separado en dos partes a propósito.** Lo primero lo verifiqué yo leyendo el código y midiendo
contra `comp.json`; lo segundo lo propuso la investigación y **no está comprobado**. Mezclarlos sería
presentar una propuesta como un hecho, que es la clase de error que este repo paga caro.

---

## PARTE 1 — Verificado por mí, leyendo el código

### 1.1 · `fusion` e `id` se parsean y se tiran a la basura

`comp.mjs:131` los lee del volcado. `documentoDe` (`comp.mjs:277-286`) devuelve el objeto de capa **sin
incluirlos**. Comprobado sobre el `comp.json` de la PIEZA-H: los campos que llegan son
`indice, nombre, tipo, visible, entra, sale, padre, es3D, texto, solido, origen, alfa, brillo,
comentario, raster, caja, separadas, desenfoque, camara, transformacion` — **`fusion` no está, `id`
tampoco**.

Esto corrige algo que yo afirmé: dije que el documento "ya transporta el campo `fusion`". Se parsea y se
descarta, que a efectos prácticos es no transportarlo.

| desbloquea | cómo |
|---|---|
| **fusión aditiva** → cometa de escritura, destellos, reflejos, toda la familia de luz | ~6 líneas en `comp.mjs` + ~2 en `comp3d.html` (el material ya existe: `matSuma`, línea 490) |
| **identidad estable de capa** → `parametros[].capa` deja de ser inservible y una pieza pasa a ser una plantilla de verdad | las mismas 6 líneas |

Es el cambio con mejor relación desbloqueo/trabajo de todo el motor.

### 1.2 · La interletra se mide sin interletra

`comp3d.html:167-169` crea el medidor, le pone `font` y llama `measureText`. **Nunca le pone
`letterSpacing`** — recién se aplica en la línea 188, al contexto de DIBUJO. O sea que el lienzo se
dimensiona con el ancho sin trackear y el texto trackeado se dibuja encima: **las últimas letras se
cortan**.

Y hay una segunda copia del mismo error en `window.__cajas()` (~línea 656), que es lo que `comp-check`
compara contra AE. El exportador **sí** exporta el tracking (`exportar.jsx:539` → `comp.mjs:214`), así
que la comparación es "caja de AE con interletra" contra "caja del navegador sin interletra":
**divergencia permanente en toda capa con tracking.**

Son 2 líneas. Todavía no mordió porque ninguna pieza usó tracking — es un defecto latente que espera a
la primera que lo haga.

### 1.3 · LEY: brillo y tapa son incompatibles

`comp3d.html:533-534`, dentro del bucle de resplandor:

```js
for (const c of capas) c.malla.visible = antes[i] && delGrupo.has(c.capa.indice)
comp.render()
```

Durante la pasada de resplandor **sólo existen las capas de ese grupo**. La tapa opaca que esconde una
letra no se dibuja, y el resultado se suma aditivamente al final: **una capa con `brillo` escondida
detrás de una tapa brilla a través de ella.**

No da error, no emite `NOSOP`, ninguna compuerta lo mira. Vale para cualquier capa con brillo detrás de
un sólido. **Si una técnica usa revelado por tapa, esa capa no puede llevar brillo.**

### 1.4 · LEY: una capa de texto es UNA línea, y el salto de línea desaparece en silencio

`limpio()` (`exportar.jsx:50-58`) convierte `\n` y `\r` en **espacio**. Y `texturaDeTexto`
(`comp3d.html:189`) hace un único `fillText`. Resultado de escribir un párrafo como una sola capa
multilínea: el documento sale `completo: true`, todas las compuertas dan verde, y el video muestra las
líneas corridas una atrás de otra.

Un párrafo son N capas, una por línea, con la Y calculada a mano (`base + i * 1.2 * cuerpo`) — porque
`texto.interlinea` también viaja y **no lo lee nadie**.

### 1.5 · El enfoque de cámara ya cruzó la frontera y nadie lo usa

`comp.json` trae `camara: {zoom, enfoque, apertura, apuntaAlPunto}`. Medido en la PIEZA-H:
`enfoque: 2666.67`, `apertura: 25.31`. **Cero lectores** en `comp3d.html` y en `cinematica.mjs`.

La profundidad de campo es la única cosa de la lista cuyo dato ya está del lado del reproductor: falta
sólo qué hacer con él.

### 1.6 · El defecto que introduje escribiendo esta misma sesión

`capturar-comp.py` borraba la carpeta de salida mirando **sólo** si le habían pedido `--solo-cajas`. Yo
agregué `--cuadros` y la lectura de esa bandera quedó 130 líneas más abajo, así que **pedir doce cuadros
para mirar borraba el render completo que hubiera al lado**. La cabecera de ese archivo documenta
exactamente ese accidente ("una corrección de MEDICIÓN se llevó puesto un render de diecisiete
minutos") y yo lo repetí.

> **La regla generalizada: cada modo nuevo hay que agregarlo a la bifurcación que protege el disco.**
> Una guarda escrita para dos modos no protege del tercero, y el que agrega el tercero es el que ya
> leyó la advertencia.

Arreglado y probado: pedir 2 cuadros pasó la carpeta de 15 a 17 archivos, sin borrar.

---

## PARTE 2 — Propuesto por la investigación, NO comprobado

Ordenado por cuántas técnicas desbloquea sobre cuánto trabajo cuesta. Los números de líneas son
estimaciones de los agentes; **verificar antes de prometer**.

| # | cambio | dónde | desbloquea |
|---|---|---|---|
| 1 | curvas con **velocidad distinta de cero** (`aplicarCurvaV` + C9/C10/C11) | ~20 líneas, **sólo el `.jsx`**, cero motor | sobrepaso, anticipación, `easeOutBack`, y es prerrequisito del resorte horneado |
| 2 | copiar los campos que ya se parsean (§1.1) | ~6 líneas, `comp.mjs` | fusión aditiva + identidad de capa |
| 3 | medir con `letterSpacing` (§1.2) | 2 líneas | toda la tipografía con tracking |
| 4 | despachador genérico de directivas del comentario (hoy hay **una** regex fija, `comp.mjs:178`) | ~8 líneas | cada técnica futura cuesta sólo el lado del reproductor |
| 5 | ampliar la rasterización a cualquier capa marcada (hoy `if (tipo === 'forma')`) | ~10 líneas, `exportar.jsx` | convierte **efectos y máscaras** de rojo a "viaja como imagen": desenfoque gaussiano, sombras, estilos de capa |
| 6 | `clippingPlanes` + `localClippingEnabled` | ~43 líneas, `comp3d.html` | recorte real, barrido, scroll de una pantalla dentro de un marco, píldora que se abre |

El 1→2→3 son **28 líneas en total** y desbloquean más que el 6, que cuesta 43.

**El ítem 5 no salió de ninguna de las diez técnicas** y es el de mejor relación del exportador: hoy un
efecto de AE es un `NOSOP` rojo; rasterizado, viaja bit a bit como cualquier PNG.

---

## Trampas que la investigación anticipó y conviene tener a mano

- **El resorte horneado se muere en `claves()`.** `aplicarCurva` escribe `new KeyframeEase(0, ...)` —
  velocidad **cero** en todas las claves. Un resorte con velocidad cero en cada clave deja de ser un
  resorte y se convierte en una cadena de arcos. Y no falla: AE lo previsualiza, el exportador dice
  COMPLETO, no hay un solo `NOSOP`.
- **La velocidad de una curva NO es una constante de la curva**: está en unidades del valor por segundo.
  La misma curva sobre una posición que recorre 169 unidades pide 1938; sobre una escala que va de 80 a
  100 pide 229. Copiar el número de una propiedad a otra da otra curva, en silencio.
- **`C9`/`C10` están definidos de tres formas distintas** en los veredictos de esta investigación. Antes
  de implementar dos de ellos hay que renombrar: el choque **no falla ruidosamente**, sale otra curva.
- **El desfasaje curvo se rompe a 30 fps con muchos caracteres.** Doce arranques con `power2.out` en una
  ventana de 400 ms redondean a los cuadros 0,2,4,6,7,8,10,10,11,12,12,12: **las últimas cuatro letras
  caen en el mismo cuadro** y la cola se vuelve un golpe. Desfasaje curvo para 4-8 unidades (palabras,
  líneas, tarjetas); **lineal para caracteres**.
- **El desfasaje se indexa por la cascada, no por la cadena.** `porCaracter` saltea los espacios pero
  nombra las capas con el índice del string: quedan `letra-0..4` y `letra-6..11`, sin `letra-5`. Usar
  ese índice para el retardo mete un hueco de un cuadro donde iba el espacio.
- **Rasterizar el texto una sola vez tiene consecuencias.** `comp3d.html:194` usa `minFilter =
  LinearFilter` **sin mipmaps** (las imágenes sí los usan). Un texto que se achica mucho no filtra bien:
  el corte de encaje que reduce una palabra al tamaño de una etiqueta hay que hacerlo con **dos capas**
  y un intercambio, no escalando una.
