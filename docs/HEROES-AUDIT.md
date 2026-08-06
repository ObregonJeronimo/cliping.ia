# Auditoría de héroes — estado, y qué creer de cada número

Esto existe porque la pregunta *"¿por qué muchos héroes no se pueden usar?"* tenía una respuesta que no
era la que parecía, y porque auditar héroes tiene una trampa en cada paso.

## Lo primero: no era falta de material

De los 18 héroes, **12 declaran `necesita: ['nada']`** y funcionan con cualquier página. Sólo 6 dependen
de material: 3 de `elementos` (cubo, mosaico, vitrina) y 3 de `tira` (portátil, teléfono, ventana).

Los que no aparecían eran **los 3 de `tira`, y no se ofrecían en NINGUNA página**: `normalizePageModel`
valida contra el schema del director y devuelve sólo lo que el schema conoce, así que `_tira` —que
empieza con guion bajo— se perdía, y `tira: !!pm._tira` daba `false` siempre. Arreglado en
`anthem-datos.mjs`, rescatando el dato del JSON crudo.

**Medido: héroes disponibles 15/18 → 18/18** sobre las 8 páginas reales.

Lo que esto NO arregla, y está bien que no lo haga: una página que de verdad no da recortes ni tira
sigue en 12 de 18. Un héroe sin material que finge tenerlo dibuja rectángulos con la paleta de la
marca, que es lo que `mosaico` prohíbe en su cabecera. Ahí el camino es **subir la tasa de
extracción**, no relajar el requisito. Dato para eso: de 16 páginas cosechadas, 3 dieron 0 recortes.

## La auditoría geométrica

```bash
node tools/heroes-audit.mjs
```

Construye los 17 sobre las 7 páginas reales, 25 instantes cada una. **Son proxies geométricos, no
píxeles del video**: no hay shaders, ni bloom, ni grano. Sirven para comparar héroes entre sí y
encontrar extremos, no para dar una nota de calidad.

### Tres cosas que el instrumento midió mal antes de servir

Se listan porque cada una parecía un hallazgo sólido:

1. **Texturas de prueba de 64 px.** Es lo que usan las otras compuertas, que miden geometría. Acá
   importa: varios héroes topean el tamaño dibujado con `topeNitido` para no pixelar el recorte del
   cliente, así que con 64 px lo dibujan diminuto. `mosaico` daba **0.044** de cobertura, la peor de
   las 17 y diez veces menos que la siguiente. Con 700 px da **0.383**.
2. **`muestra` preguntaba por `tipoImagen === 'recorte'`**, que lo declara `planoRecorte`. Decía "no"
   para `cubo`, que arma sus caras a mano. Ahora se reconoce la textura.
3. **El movimiento medido en CPU no ve a los que deforman en el vertex shader.** `gota` daba **0.0029**
   —cuarenta veces menos que el resto— y no estaba quieta: su movimiento vive entero en la GPU. **Son
   10 de 17.** La columna ahora dice `(gpu)` en vez de un cero que se leería como diapositiva.

### Límite que queda

`telefono`, `ventana` y `portatil` dan `muestra: no` aunque dibujan la tira. Es del instrumento, no de
los héroes.

## Auditado con render de verdad

El único que ve contraste, shaders y bloom. **Siempre mirar el `plan.json` antes que los cuadros**:
`--hero X` elige *cuál* héroe usar si la escena `hero` entra, pero **no fuerza que entre**. Pasó: un
render pedido con `--hero gota` salió con `heroes: []` y ese video no contenía gota.

| héroe | render | cuadros abiertos | resultado |
|---|---|---|---|
| `calibre` | stripe.com, seed 3, aire editorial | 260, 320 | **defecto real**: rótulo a 2.41:1 |
| `mosaico` | stripe.com, seed 5, aire corporativo | 250 | bien — muestra logo, editor, recibo, QR |
| `gota` | linear.app, seed 3, aire editorial | 440 | bien — se mueve 1.27–1.91 por píxel |

### El defecto encontrado, y por qué el arreglo no es para `calibre`

El rótulo del héroe (`hero.js`, vía `rotular`) salía a **2.41:1** de contraste — por debajo hasta del
umbral flexible de WCAG (3.0:1; el normal es 4.5:1). La causa: `nivelTexto` elige el tono contra el
**fondo del mundo** y no puede saber que el héroe le puso un bloque atrás. Y el comentario que ubica el
rótulo dice que va *"fuera del eje donde vive el objeto"*, cierto sólo mientras el héroe sea un objeto
centrado — `calibre` apoya su base a lo ancho de todo el cuadro.

Por eso el arreglo es una **cama** detrás del rótulo: sea cual sea el héroe, detrás del texto hay una
superficie conocida. **Medido: 2.41:1 → 5.15:1**, y confirmado en mundo oscuro con `gota`.

### Dos falsos positivos míos, para no repetirlos

- **`mosaico` con contraste 1.05:1** — no es texto ilegible, es que **no hay texto en esa banda**. Un
  contraste de ~1.0 sobre una franja uniforme significa "acá no hay nada que medir".
- **La silueta de `gota` se ve facetada** — falso. Usa `IcosahedronGeometry(R, 5)`, 5.120 triángulos, y
  su cabecera explica por qué no alcanza detail 4. Lo que se lee como facetas son los reflejos
  especulares del material físico sobre una superficie deformada.

## Lo que falta

- **14 héroes sin auditar con render.** El orden sugerido sale de la tabla de `heroes-audit`: los de
  cobertura más baja primero (`calibre` ya está, sigue `pulso` 0.401 y `columnata` 0.442).
- **`fondo-check` no caza el contraste del rótulo** ni con el par escena+hero ya barrido. Sospecha con
  más peso: compone en su propio cuadro (fov 42, distancia 9) y el render real usa fov 30 y distancia
  18.66 — otro encuadre, otras superposiciones, otro fondo detrás del texto. **Medir esa diferencia es
  el paso siguiente**; hasta saberlo, cualquier arreglo de color es a ciegas.
