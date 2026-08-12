# BÓVEDA — el motor de plantillas completas

## Qué es, y en qué se diferencia del otro motor

El repo ya tenía un motor 3D: elegís un **héroe** —el objeto protagónico— y el motor **sortea un guion**
a su alrededor con una biblioteca de escenas. Dos renders de la misma página con el mismo héroe dan dos
videos parecidos pero distintos.

Bóveda es lo contrario, y es a propósito: elegís una **plantilla** y recibís una **pieza entera, compuesta
de punta a punta**. La misma página con otra plantilla da un video completamente distinto con los mismos
datos. No es una biblioteca de pasos: es un catálogo de piezas terminadas.

```bash
python backend/boveda.py https://basecamp.com --plantilla atrio
python backend/boveda.py https://basecamp.com                    # elige una elegible con la semilla
```

Desde la web: `start.bat` → **Bóveda IA** en el menú lateral.

## Los seis tiempos — el contrato

Toda plantilla cuenta **lo mismo, en el mismo orden**. No es una convención estética: es lo que hace que
dieciocho piezas distintas le sirvan a la misma marca. El espectador ve dieciocho videos; el cliente ve
la misma historia contada de dieciocho maneras.

| # | tiempo | qué entra |
|---|---|---|
| 1 | **espacio** | se establece el lugar. Sin marca todavía: hay que entender dónde se está parado antes de que te hablen. Es el único tiempo sin datos. |
| 2 | **marca** | el nombre, grande y solo. Es lo único que se repite al final. |
| 3 | **promesa** | el claim de la página — la frase que la marca escribió para presentarse. |
| 4 | **prueba** | la **página del cliente**, de verdad, mostrada como objeto. Es lo único que ninguna plantilla genérica puede fingir, y por eso ninguna se lo saltea. |
| 5 | **razones** | las frases y las cifras. Cuántas entran lo decide la plantilla; cuáles, el mostrador. |
| 6 | **pedido** | el CTA y el dominio. Si la página no dio CTA, va el dominio solo — **nunca inventado**. |

Cada plantilla declara en `meta.tiempos` en qué beat arranca cada uno. `tools/boveda-check.mjs` comprueba
que los seis existan, estén en orden, entren en la pieza y que PEDIDO tenga al menos 3 beats de aire.

## Las tres reglas de movimiento

Están en `render3d/boveda/movimiento.js` y son lo que separa una template de "escenas 3D con texto
encima". Las tres salieron de que las dos primeras plantillas quedaron por debajo de la vara:

1. **La cámara no se detiene nunca.** Puede frenar para el pedido, pero frenar es llegar a una velocidad
   baja, no a cero. Un cuadro con la cámara quieta se lee como diapositiva por buena que sea la tipografía.
2. **Nada aparece por encendido.** Un elemento que pasa de invisible a visible en su sitio es un cartel;
   uno que entra volando, girando o barriendo es motion graphics. La diferencia cuesta cuatro líneas.
3. **El espacio tiene capas a distintas velocidades.** Sin paralaje, volar por un espacio vacío es
   indistinguible de un zoom.

## El retrato: qué mide de la página, y qué hace con eso

Bóveda no compone el mismo espacio para todos. `backend/retrato.py` mide la página **para un motor 3D**
y devuelve *recetas*: números que las plantillas leen para decidir el grado de cada cosa.

La fuente más rica es la que nadie miraba: **`tira.png`**, la página entera en píxeles. De ahí salen el
ritmo de las secciones, cuánto aire respira el diseño, dónde vive el acento y cuál es la paleta real
con sus pesos. Nada de eso está en el DOM.

| receta | de dónde sale | qué cambia en el video |
|---|---|---|
| `velocidad` | energía del ánimo + falta de aire | cuánto camino recorre la cámara en los mismos beats |
| `capas` | densidad de la tira | 2, 3 o 4 capas de paralaje |
| `dureza` | `shape.radiusRatio` y `pill` | **la sección de los objetos: de cuadrada a cilíndrica** |
| `margen` | fracción de fondo liso | cuánto ancho puede ocupar un bloque de texto |
| `beats` | cuánto material hay | 30 a 44 |
| `cifras` / `frases` | lo que la página dio | cuántos bloques se piden |
| `acentoMasa` | peso cromático sumado de la paleta | el espacio se construye en color, o el color va en filetes |
| `movimientos` | cortes de luminancia en la tira | cuántos cambios de espacio pide la pieza |
| `paleta` | cuantización de los píxeles | el color de los materiales, vía `colorDePeso` / `grisDePeso` |

**Todo pasa por `render3d/boveda/recetas.js`**, que es el único traductor. Devuelve siempre las mismas
claves, con valores **neutros** cuando no hay retrato — y neutro no es inventado: es exactamente con lo
que se compusieron las doce primeras plantillas.

```bash
python backend/retrato.py https://tusitio.com      # la tabla de una página
python tools/retrato-barrido.py                    # todas las capturas + si cada receta discrimina
```

### Calibrar sobre una página no es calibrar

`retrato.py` se escribió mirando basecamp.com y parecía correcto. Pasado por las doce capturas del repo
aparecieron tres defectos invisibles en una sola: `capas` daba 3 en once de doce, `movimientos` daba 6
en once de doce, y `vacio` daba 7% en el sitio más aireado del conjunto porque confiaba en el `bgLum`
del DOM (tailwindcss declara 0.002 y su tira mide 0.98). Por eso existe `retrato-barrido.py`: marca la
receta que casi no varía. **Una receta que da el mismo valor en once de doce sitios no está midiendo.**

### Y avisa cuando la captura no es la página

Dos de las doce capturas del repo —despegar y El Corte Inglés— dan cero titulares, cero imágenes y cero
peso cromático: son muros de cookies guardados como si fueran el sitio. Las recetas de un muro son
perfectamente calculables y producirían un video correcto sobre nada.

## Cómo está partido el motor

```
retrato.py      QUÉ ES LA MARCA    la página medida: ritmo, aire, paleta, forma, contenido
recetas.js      CUÁNTO DE CADA     el único traductor de esa medición a números de plantilla
nucleo.js       CÓMO SE DIBUJA     texto, vidrio, metal, luz, camas, el panel de la página, el domo
bloques.js      QUÉ SE CUENTA      los seis tiempos, ya compuestos y MEDIDOS
movimiento.js   CÓMO SE MUEVE      vuelos, entradas, salidas, paralaje, respiración
plantillas/*    DÓNDE PASA         el espacio, los materiales, el ritmo — LA IDEA
```

**Esta división es la que hace posible llegar a cientas.** `atrio` salió bien y costó caro: de sus
trescientas líneas originales, unas cincuenta eran su idea y el resto era la cocina de siempre —medir el
nombre contra el cuadro útil, partir el claim en renglones, elegir el recorte más grande cuando no hay
tira, quedarse con dos cifras y no con cinco. Nada de eso es de `atrio`: es de Bóveda. Si la plantilla
trece lo repite, cuesta lo mismo que la primera y nunca hay trece.

Una plantilla nueva es: **inventar un espacio, elegir un vuelo y colocar los bloques.** Cien líneas con
una idea adentro.

### Escribir la plantilla trece

1. Copiá la cabecera de `atrio.js` y leela entera — no por su composición sino por cómo está armada.
2. Elegí un vuelo: `vueloAvance`, `vueloDesliz`, `vueloOrbita`, o escribí uno (`cinta` y `bandada` lo hacen).
3. Construí el espacio en dos o tres capas y pasalas por `paralaje` (o movelas en `alSeek` si el eje no es Z).
4. Pedí los bloques a `bloques.js` y colocalos contra `zEn` / `xEn` / `puntoEn`, **nunca a ojo**.
5. Corré `node tools/boveda-check.mjs` y `node tools/boveda-sonda.mjs <id>`. Después, las fotos.

## Las dieciocho

| id | familia | beats | espacio · vuelo |
|---|---|---|---|
| `atrio` | arquitectura | 40 | columnata de vidrio · avance frontal |
| `reticula` | arquitectura | 36 | muro de baldosas · desliz lateral |
| `pasillo` | arquitectura | 38 | arcos de luz · avance frontal |
| `vitral` | luz | 38 | anillo de paneles a contraluz · órbita interior |
| `deriva` | atmosfera | 42 | láminas sueltas en niebla · avance serpenteante |
| `tectonica` | escala | 36 | dos masas cruzándose · desliz lateral |
| `monolito` | objeto | 34 | prisma girando · órbita exterior |
| `nucleo` | objeto | 38 | anillos concéntricos · órbita que entra |
| `eclipse` | grafico | 36 | disco a contraluz · avance que lo atraviesa |
| `cardumen` | multitud | 40 | 420 instancias que se abren · avance |
| `cinta` | recorrido | 40 | banda que serpentea · vuelo sobre curva |
| `bandada` | energia | 34 | cascada cayendo · vuelo vertical **en contra** |
| `escalera` | arquitectura | 38 | escalinata monumental · ascenso diagonal |
| `telar` | trama | 38 | cables tensos cruzados · avance que abre la trama |
| `marea` | atmosfera | 38 | plano líquido que ondula · vuelo al ras |
| `prisma` | luz | 38 | haz que se abre en bandas · órbita que sigue el abanico |
| `archivo` | objeto | 38 | cajones que se extienden solos · desliz lateral |
| `torre` | escala | 38 | losas apiladas girando · espiral ascendente |

Que dos usen el mismo vuelo y se vean distintas es la prueba de que **el vuelo no es la plantilla**:
`monolito` y `nucleo` son las dos órbitas y en una el objeto es sólido y la cámara lo rodea, en la otra
es hueco y la cámara entra.

## Los tres instrumentos, y por qué hacen falta los tres

| herramienta | qué dice | cuesta |
|---|---|---|
| `node tools/boveda-check.mjs` | **sí o no**: el contrato se cumple. Corre en el guard. | ~4 s, no renderiza |
| `node tools/boveda-sonda.mjs <id> [aire]` | cuántos beats quedan **sin contenido**, y dónde | ~2 s, no renderiza |
| `python backend/boveda_foto.py <id> --tira` | los **píxeles** de seis beats repartidos | ~40 s, renderiza cuadros sueltos |
| `python backend/boveda.py <url> --plantilla <id>` | la pieza entera, con obturador y ritmo | 1-3 min |

**Ninguno reemplaza a otro.** La compuerta no puede decir si la pieza se ve bien. La sonda no ve píxeles.
Las fotos no muestran el obturador ni el ritmo. Y el video no dice *por qué* algo salió mal.

Los cuatro dan entre 24% y 33% de beats sin texto en las doce, y esos son el tiempo de ESPACIO —que va
sin texto a propósito— más las transiciones.

## Lo que este motor no hace

- **No inventa.** Si no hay cifras, no hay tiempo de cifras: se compone sin él. Un hueco se ve; un dato
  falso firmado por la marca del cliente es otra cosa.
- **No recorta la pieza a una duración pedida.** Cada plantilla dura lo que dura su composición. Por eso
  el estudio de Bóveda no tiene selector de duración y el de Motor 3D sí.
- **La semilla no cambia la composición**, cambia *qué* frases y cifras entran. Para otro video, otra
  plantilla.

## Defectos que ya costaron caro (no volver a descubrirlos)

Todos están comentados en el archivo donde viven; acá está el índice.

| defecto | síntoma | dónde |
|---|---|---|
| el domo pintaba último | pieza en blanco, sin una sola letra, y **cero errores** | `nucleo.js:domo` |
| `peso: undefined` derrotaba el default de `texto()` | la marca medía 0.62 de alto en vez de 1.5 | `nucleo.js:opsTexto` |
| `repartirFrases(n, 150)` | el 2º parámetro es un **booleano**; devolvía cero frases, sin error | `bloques.js:bloquesFrase` |
| `respirar` **escribía** la posición | anulaba entradas y giros; la página quedaba quieta | `movimiento.js:respirar` |
| `anchoUtil` ya existía en `kit.js` con otro significado | dos nombres iguales en un archivo que importa de los dos | `movimiento.js:anchoConDeriva` |
| medir el ancho sin la profundidad | `BASECAMP` cortado después de "arreglarlo" | `movimiento.js:anchoConDeriva` |
| la ventana de lectura de una órbita es `16/(vueltas·360/beats)` | bloques encendidos y fuera de cuadro | `vitral.js` |
| un objeto quieto en un desliz dura `mundoW/velocidad` beats | la página desaparecía a mitad de su tiempo | `movimiento.js:acompanar` |
| montar los bloques donde la cámara **está** y no donde **mira** | 80% de beats mudos | `cinta.js` |
| `tl.to(uDomo, {fuerza})` en vez de `uDomo.uFuerza.value` | compila, corre y no hace nada | `deriva.js` |
| `metal()` con `metalness: 1.0` | **media Bóveda salía negra**; se perdieron tres arreglos en las luces | `nucleo.js:metal` |
| `colorDePeso` elegía por croma e ignoraba la luminancia | devolvía `#103030` (lum 0.02) como material | `recetas.js` |
| `acentoComoMasa` miraba un solo color | Stripe, el sitio más colorido, daba "sin masa de color" | `retrato.py` |
| el retrato calibrado sobre una sola página | tres recetas saturadas, ninguna daba error | `retrato-barrido.py` |
| la sonda medía "delante" contra -z del mundo | 87% de beats mudos informados sobre una plantilla sana | `boveda-sonda.mjs` |
| la sonda contaba `uProg` sin mirar `visible` | llamaba defecto a `sale()` funcionando | `boveda-sonda.mjs` |

El patrón que comparten casi todos: **el código dice que pasa algo y en el video no pasa**, sin una sola
excepción ni un aviso. Por eso los tres instrumentos, y por eso la compuerta se valida rompiéndola.
