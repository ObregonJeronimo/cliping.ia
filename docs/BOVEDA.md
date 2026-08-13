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

### La regla de `alSeek`, que es sutil y ya me equivoqué con ella

`seek(t)` corre `tl.time(t)` **primero** y `alSeek(t)` **después**. De ahí salen dos casos opuestos, y
confundirlos produce defectos que no dan síntoma:

- **Si la línea de tiempo anima esa clave → SUMAR (`+=`).** El tween restablece el valor en cada seek y
  la suma lo desplaza. Es lo que hace `respirar`. Asignar ahí **anula el tween**: en `atrio` la página
  tenía una entrada volando y un giro de 7 beats, y los dos quedaban en nada.
- **Si no la anima nadie → ASIGNAR sobre una base guardada.** Sumar acá acumula: `nucleo` hacía
  `rotation.y += t * v` sin tween sobre ese eje, así que con cuatro submuestras de obturador por cuadro
  los anillos giraban varias veces más rápido de lo escrito **y la velocidad dependía de cuántas veces
  se hubiera llamado a `alSeek`**.

La única excepción es la **cámara**: todos los vuelos tunean su eje principal y escriben los otros dos
en `alSeek` — eso es la deriva, y es lo que impide que un vuelo se lea como un riel.

`boveda-check` lo verifica solo, eje por eje, en los seis tiempos.

### Escribir la plantilla trece

1. Copiá la cabecera de `atrio.js` y leela entera — no por su composición sino por cómo está armada.
2. Elegí un vuelo: `vueloAvance`, `vueloDesliz`, `vueloOrbita`, o escribí uno (`cinta` y `bandada` lo hacen).
3. Construí el espacio en dos o tres capas y pasalas por `paralaje` (o movelas en `alSeek` si el eje no es Z).
4. Pedí los bloques a `bloques.js` y colocalos contra `zEn` / `xEn` / `puntoEn`, **nunca a ojo**.
5. Corré `node tools/boveda-check.mjs` y `node tools/boveda-sonda.mjs <id>`. Después, las fotos.

## Las treinta y una

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
| `panal` | trama | 36 | túnel de celdas hexagonales · avance |
| `pendulo` | objeto | 38 | masas colgando en onda · desliz |
| `imprenta` | arquitectura | 38 | tipos móviles que componen una línea · desliz |
| `orbita` | escala | 38 | horizonte curvo de un cuerpo grande · órbita rasante |
| `vitrina` | objeto | 38 | hilera de vitrinas iluminadas · desliz |
| `duna` | atmosfera | 40 | desierto con contraluz · vuelo bajo propio |
| `escalera` | arquitectura | 38 | escalinata monumental · ascenso diagonal |
| `telar` | trama | 38 | cables tensos cruzados · avance que abre la trama |
| `marea` | atmosfera | 38 | plano líquido que ondula · vuelo al ras |
| `prisma` | luz | 38 | haz que se abre en bandas · órbita que sigue el abanico |
| `archivo` | objeto | 38 | cajones que se extienden solos · desliz lateral |
| `torre` | escala | 38 | losas apiladas girando · espiral ascendente |

### El registro contenido — y una corrección de rumbo

La primera vez que se pidieron plantillas "menos potentes", con la referencia de los videos que los
estudios de motion hacen para marcas como Google o Gemini, se entendió **austeras**. Salieron `folio`,
`halo`, `pliegue` y `hilo`: un objeto sobre un fondo plano. El veredicto sobre `hilo` fue *"qué es esa
cagada"*, y era correcto — una línea azul sobre un gris plano no se ve sobria, se ve **sin terminar**.

La referencia no es austera. Es **contenida pero densa**:

| | |
|---|---|
| contenida | la cámara casi no se mueve, hay dos o tres elementos, no hay cortes duros, la tipografía manda |
| **densa** | la **superficie** es rica: degradados que fluyen, vidrio que refracta y tiñe los bordes, luz que se dobla |

**Lo que faltaba no era menos, era mejor terminado.** De ahí salieron dos primitivas:

- **`campoDegradado()`** — cuatro manchas de color de la página que orbitan y se funden. Períodos
  inconmensurables (con múltiplos el conjunto vuelve a su posición y el ojo lo lee como bucle), mezcla
  **por distancia y no por capas** (apilar con `mix` deja bordes donde una tapa a la otra), y un dither
  de 1/255 — un degradado suave en 8 bits *siempre* tiene bandas.
- **`iridiscente()`** — vidrio con la película que tiñe el borde según el ángulo. Lo que importa no es
  activar el efecto sino el **rango de espesor**: el de fábrica (100–400 nm) da el arcoíris entero y se
  ve a juguete; 180–520 da azules y magentas.

`hilo` quedó fuera del catálogo; las otras tres se reescribieron sobre el vocabulario nuevo.

### El registro sobrio

Las primeras veinticuatro son todas **intensas**, y un catálogo que grita igual en las veinticuatro no
le sirve a una marca sobria — que son justamente las que más video piden. Estas tres son el registro de
las piezas que un estudio de motion presenta cuando le muestra su trabajo a una marca como Google: casi
todo blanco, un objeto, la cámara moviéndose poco, la tipografía de protagonista y un solo acento.

**Las tres reglas siguen valiendo, en otra escala:** la cámara no se detiene, pero recorre 0,9 a 1,6
unidades en toda la pieza en vez de ochenta; nada aparece por encendido, pero los bloques entran desde
0,7 unidades y con el doble de duración; y hay capas a distintas velocidades, sólo que son la hoja y su
sombra.

| id | familia | beats | espacio · vuelo |
|---|---|---|---|
| `folio` | sobrio | 34 | una hoja en un cuarto vacío · deriva de 1,6 unidades |
| `halo` | sobrio | 36 | un anillo de luz sobre campo claro · casi sin vuelo |
| `pliegue` | sobrio | 36 | un plano que se dobla, y **el doblez es la transición** |
| `aurora` | superficie | 38 | campo que fluye + lente de vidrio iridiscente; el texto pasa **por detrás** |
| `seda` | superficie | 38 | una tela iridiscente que ondula y llena el cuadro |

Tres decisiones que definen el registro y que conviene copiar al escribir la cuarta:

- **Bajan el bloom del aire a mano.** Viene calibrado para piezas con emisivos; sin uno grande, sólo
  levanta el blanco del fondo y lo lava.
- **El retrato se aplica con la mitad del rango.** Una pieza callada que acelera 45% porque la página es
  enérgica deja de ser callada.
- **El contraste hay que ponerlo a mano.** La iluminación física devuelve ~⅓ del albedo, y esa
  compresión junta todo lo que estaba cerca: `nivel(0.02)` contra `nivel(0.09)` se parecen poco en el
  hex y mucho en pantalla. En una plantilla con veinte objetos no importa; acá es la única herramienta.
- **Y el fondo va al lado OPUESTO DEL SUJETO, que no siempre es el mismo.** Es el error que más veces
  cometí en este registro, en las dos direcciones:
  - `folio`: el sujeto es una **hoja clara** → el cuarto tiene que ir oscuro.
  - `hilo`: el sujeto es la **tipografía**, que `nivelTexto` pinta oscura → el campo tiene que ir claro.

  Copiar la corrección de una en la otra da el defecto inverso. `nivelTexto` garantiza contraste contra
  la **paleta de la página**, nunca contra lo que la plantilla resolvió poner detrás — eso es siempre
  responsabilidad de la plantilla.

| id | familia | beats | espacio · vuelo |
|---|---|---|---|
| `hilo` | sobrio | 36 | una línea que se dibuja sola, seis formas · casi sin vuelo |

Que dos usen el mismo vuelo y se vean distintas es la prueba de que **el vuelo no es la plantilla**:
`monolito` y `nucleo` son las dos órbitas y en una el objeto es sólido y la cámara lo rodea, en la otra
es hueco y la cámara entra.

### El registro medido — `vortice`, y la primera plantilla que no se escribió de memoria

Las veintinueve anteriores salieron de mi idea del género. Esta salió de **medir una referencia**: un
reel de motion graphics corriendo en pantalla, pasado por `tools/ref-analisis.py` recortando el
análisis a la zona del monitor y al tramo de los gráficos. La tabla, y lo que cada renglón obligó:

| medido | valor | qué obliga |
|---|---|---|
| cámara quieta | 75% del tiempo, 0.0146 del ancho/s | **no se vuela**: el empuje es un décimo del de cualquier otra |
| cortes | cada 0.23 s, sin cambio de encuadre | lo que corta es el **campo**, no el plano |
| campo | simetría angular 0.743, perfil 0.60 → 0.33 | radial, con núcleo, y viñeta fuerte |
| pendiente espectral | −4.20 | campo liso: nada de grano ni de detalle duro |
| halo de altas luces | 0.067 del ancho | bloom fuerte y umbral bajo |
| tipografía | una palabra, 0.49 del ancho, trazo 0.019 | **una sola** palabra centrada por golpe, y pesada |
| tono | violeta → azul → celeste en 3 s | el color **gira**, escalonado |

| id | familia | beats | espacio · vuelo |
|---|---|---|---|
| `vortice` | grafico | 32 | remolino de color a cuadro completo · **encuadre fijo** |
| `pulso` | grafico | 30 | anillos que salen del centro en cada golpe · **encuadre fijo** |

**`pulso` es la hermana clara, y la variación que le sirve a un catálogo no es otro fondo bonito: es
otra REGLA.** De la medición quedaron tres cosas que son el género —encuadre fijo, el golpe cada medio
beat, una palabra gigante por golpe— y una cuarta que era sólo esa pieza: el suelo oscuro. Confundirlas
es como se hacen treinta plantillas que se ven igual.

`vortice` construye su propio suelo y por eso tiene que hacerse cargo de la tinta; `pulso` se apoya en
el fondo del mundo y saca toda su intensidad de lo que **emite**. Sobre la misma página blanca, una da
una pieza nocturna y la otra una pieza de papel, con la misma gramática. Y `pulso` **no tiene shader
nuevo**: los anillos son toros de verdad que se escalan, y eso no es economía — un anillo 3D se
desalinea del campo plano cuando la cámara empuja un décimo, y esa desalineación es la única pista de
que hay volumen.

Dos correcciones que costaron fotos también acá: **todo lo que emite va detrás del texto** (la primera
foto tenía un aro cruzando la marca y el núcleo tapando el CTA), y **tres de los cuatro colores del
campo tienen que ser casi el fondo** — con dos manchas de color el campo se vuelve un lavado parejo y
los anillos quedan del mismo valor que el suelo.

**Y el ritmo cae solo.** La referencia corta cada 0,23 s; el motor trabaja a 124 BPM, o sea 0,484 s por
beat, y su **medio beat** mide 0,242 s. El golpe del género es el contratiempo de la grilla que ya
existe: no hubo que forzar nada.

Cuatro cosas de esta plantilla son nuevas en el motor y sirven para la treinta y uno:

- **`campoVortice()`** (`nucleo.js`). Un remolino a pantalla completa. Lo que lo hace fluido y no una
  textura girando es la **rotación diferencial** —el ángulo se desplaza en proporción a 1/r, así que el
  centro da vueltas mucho más rápido que el borde— más **deformación de dominio**: un fbm desplaza las
  coordenadas de otro fbm.
- **La banda** (`uBanda`). Cómo se pone texto encima de un campo denso **sin ponerle una placa**: una
  franja horizontal donde el campo se mezcla hacia el fondo, con bordes suaves. Donde vive la palabra
  el fondo vuelve a ser el fondo, y la garantía de `nivelTexto` vuelve a valer.
- **`op.tinta` en los seis bloques** (`bloques.js`). Una plantilla que construye **su propio suelo** se
  hace cargo también de la tinta. Por omisión no cambia nada. Es la primera vez que hacía falta y está
  explicado ahí: `vortice` es oscura y saturada **siempre**, también sobre una página blanca, porque
  eso es lo que se midió del género.
- **Todo el movimiento vive en `alSeek` y es función pura de `t`.** En las otras veintinueve `alSeek`
  acompaña al vuelo; acá es el gesto principal, porque la cámara no hace nada. Sin estado acumulado,
  las cuatro submuestras del obturador dan lo mismo que daría una — y el escalón de color, en vez de
  saltar, sale con un cuadro de transición que parece intencional.

### Y después, medir la réplica con el mismo instrumento

Esto es lo que hace que la plantilla no sea otra vez una opinión. Renderizado el video, se lo pasa por
`ref-analisis.py` igual que a la referencia y se comparan las medidas que son independientes de escala
—las otras no son comparables, porque la referencia se midió sobre un recorte 16:9 de 3,4 s y la
réplica sobre el cuadro 9:16 entero—:

| medida | referencia | réplica 1ª | réplica final | lectura |
|---|---|---|---|---|
| cámara quieta | 75% | 75% | 75% | ✔ |
| fondo | campo radial | campo radial | campo radial | ✔ |
| simetría angular | 0.743 | — | 0.752 | ✔ |
| brillo del contenido | 0.476 | 0.16 | **0.425** | ✔ |
| saturación | 0.531 | 0.72 | **0.436** | ✔ |
| pendiente espectral | −4.20 | −3.43 | −3.79 | ~ |
| viñeta (borde/centro) | 0.54 | 0.29 | 0.34 | ~ |
| detalle | 0.038 | — | 0.080 | ✘ las vetas siguen duras |
| halo de altas luces | 0.067 | 0.008 | 0.009 | ✘ ver abajo |

**Y LA PRIMERA COMPARACIÓN ERA INVÁLIDA**, que es la parte que conviene no repetir: la referencia se
midió sobre un recorte 16:9 y la réplica sobre el cuadro 9:16 entero. La viñeta, el perfil radial y el
halo se calculan sobre la geometría del cuadro, así que comparar los dos era comparar dos encuadres, no
dos piezas. La tabla de arriba mide la réplica **con el mismo `--recorte` que la referencia**; sin eso,
el brillo daba 0.16 contra 0.44 y parecía un defecto enorme donde había, en parte, un encuadre distinto.

**El halo es el único que sigue lejos, y el número no lo aísla.** Se calcula como área del anillo sobre
perímetro del núcleo: en la referencia el núcleo es la palabra sola; en la réplica el bloom quema
también parte del campo, así que el perímetro crece y el cociente baja aunque el resplandor sea mayor.
Subiendo el piso de bloom a 0.34 el número mejoraba y **las letras empezaban a fundirse entre sí**.
Entre el número y la legibilidad manda la legibilidad, y eso se decide mirando. Quedó en 0.24.

Los tres defectos apuntaban al mismo lado y la causa se ve en los cuadros: **el núcleo era una bola de
niebla grande y blanda**, que nunca pasa el umbral del bloom. Un núcleo se hace chico y quemado, no
grande y tibio — la caída pasó de `r²·5.5` a `r²·16` y se le agregó un término **aditivo**, porque
mezclar hacia un color claro no puede superar a ese color y por lo tanto no puede florecer.

Y una advertencia sobre el propio instrumento: en este material el detector de texto por trazos **cuenta
los filamentos del remolino como tipografía**, así que su métrica de texto no sirve acá. Lo que hay que
mirar para eso son los cuadros.

**Lo que costó llegar, en cuatro tandas de fotos, y no repetirlo:**

1. `R.paleta` **no es una lista de colores**: es una lista de `{hex, peso, croma, lum}`. Indexarla y
   usar el elemento como color da `[object Object]`, que `THREE.Color` acepta sin chistar y pinta
   **blanco**. Un campo blanco a pantalla completa más bloom da una **pantalla blanca perfecta**: seis
   fotos con valor 255 exacto en todos los píxeles y cero errores en la consola. El accesor es
   `colorDePeso()`.
2. El halo medido es un **absoluto**, no un factor. Aplicarlo como `bloom × 1.85` funciona sobre
   `editorial` (0,14) y revienta sobre `nocturno` (1,15): la marca sale convertida en una mancha. Va
   con techo.
3. El segundo acento del aire **puede ser de otra familia** (en basecamp sale un caqui). El núcleo del
   remolino es el mismo tono del campo subido de valor, no `LOOK.acento2`.
4. Un anillo luminoso se hace con **poco cuerpo y mucho halo**, no con espesor. Con un tubo de 0,075
   del radio quedó un aro opaco pintado encima de las seis fotos, idéntico en todas.

## Los tres instrumentos, y por qué hacen falta los tres

| herramienta | qué dice | cuesta |
|---|---|---|
| `node tools/boveda-check.mjs` | **sí o no**: el contrato se cumple. Corre en el guard. | ~4 s, no renderiza |
| `node tools/boveda-obturador-check.mjs` | **sí o no**: ninguna plantilla acumula entre submuestras del obturador. Corre en el guard. | ~2 min, no renderiza |
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
| `+=` en `alSeek` sobre un eje **sin** tween | acumula en cada submuestra: el motor deja de ser determinista | `nucleo.js` |
| la sonda medía "delante" contra -z del mundo | 87% de beats mudos informados sobre una plantilla sana | `boveda-sonda.mjs` |
| la sonda contaba `uProg` sin mirar `visible` | llamaba defecto a `sale()` funcionando | `boveda-sonda.mjs` |
| `+=` / `*=` en `alSeek` fuera de la ventana de su tween | **las 31 plantillas** divergían de 1,4 a 38,3 unidades de mundo | `movimiento.js:sumador` |
| `respirar` escribía la misma propiedad que un `to()` posterior | el tween capturaba su arranque contaminado, distinto según la submuestra | `movimiento.js:respirar` |
| el instrumento rebobinaba para comparar | 12 falsos FAIL: gsap recaptura al retroceder | `boveda-obturador-check.mjs` |
| `R.paleta[1]` usado como color | `[object Object]` → **blanco**: seis fotos en 255 exacto, sin un error | `vortice.js` · `recetas.js:colorDePeso` |
| el halo medido aplicado como **factor** del bloom del aire | sobre `nocturno` la marca queda sin contorno | `vortice.js` |
| `transmission` no refracta lo transparente | el texto y la tela **desaparecen** detrás del vidrio | `nucleo.js:iridiscente` |

El patrón que comparten casi todos: **el código dice que pasa algo y en el video no pasa**, sin una sola
excepción ni un aviso. Por eso los tres instrumentos, y por eso la compuerta se valida rompiéndola.
