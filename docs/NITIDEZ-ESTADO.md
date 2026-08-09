# Nitidez de los recortes del cliente — estado y qué creer de cada número

```bash
node tools/nitidez-inventario.mjs
```

Barato: construye, no renderiza. ~30 s, ~400 MB. **No está en el guard** — es un inventario, como
`encaja-inventario`: primero el mapa, después se decide dónde poner el trinquete.

## Por qué existe

`CLAUDE.md` nombra esta familia como la más barata de cazar al construir:

> *"Un recorte pixelado no es un problema de render: es una imagen de 120 px dibujada a 900. Se mide
> comparando los píxeles reales del elemento contra el tamaño con que se dibuja, sin renderizar."*

Existía `topeNitido` en el kit haciendo ese tope, y **nada que comprobara quién lo usa**.

## El riesgo, medido sobre el material real

Leyendo la cabecera IHDR de los **77 recortes** que hay en `tools/out/motor/*/elementos/`, de 9 sitios:

| | ancho nativo |
|---|---|
| mínimo | **100 px** |
| p10 | 206 px |
| mediana | 637 px |
| p90 / máximo | 1400 px |

**31 de 77 por debajo de 400 px.** Y los más chicos son todos `el0`/`el1`, o sea **los logos**: stripe
120×50, linear 176×44, pentagram 206×37, basecamp 200×60. El logo es justo lo que una escena quiere
mostrar grande, y estirarlo es el defecto que su dueño ve antes que ninguno.

## Estado: 13 escenas/héroes con imagen del cliente, ninguna por encima de 2x

| escena | aumento | dibujado | nativo | nota |
|---|---|---|---|---|
| `pantalla` | 1,76x | 1265 px | 720 | sus bandas van **a sangre** por diseño (`mundoW * 1.06`) |
| `mosaico` | 1,69x | 433 px | 256 | el destaque de escala 1,13 — declarado |
| `hero` / `cubo` | 1,60x | 192 px | 120 | girada 64° en el tumbo: la caja mide de más |
| `telefono` | 1,59x | 1143 px | 720 | girada 30° |
| `columna` | 1,58x | 404 px | 256 | el foco del centro, declarado |
| `ventana` | 1,56x | 1121 px | 720 | mide 1.02 del cuadro por diseño |
| `rafaga` | 1,48x | 379 px | 256 | |
| `vitrina` | 1,47x | 176 px | 120 | |
| `contraste` | 1,33x | 850 px | 637 | |
| `mesa` | 1,32x | 948 px | 720 | girada 49° |
| `portatil` | 1,27x | 913 px | 720 | girada 72° |
| `titular` | 0,82x | 1145 px | 1400 | se dibuja MÁS CHICO que su archivo |

`topeNitido` topea en 1,4x, así que **un valor cercano a 1,4 es la prueba de que funciona**, no un
hallazgo. Lo que pasa de ahí tiene causa nombrada en la columna de la derecha.

Los dos héroes que muestran la **página entera** —`telefono` y `portatil`— la muestran a resolución
sana. Coincide con lo único que había antes sobre esto, que era una inspección visual: *"telefono
sobre basecamp.com, cuadro 500, muestra la página real, texto nítido"*. Ahora está medido.

## El techo de 1,4 es sobre lo CONSTRUIDO, no sobre lo que se ve

Esto no es un defecto de ninguna escena: es una propiedad del diseño que conviene saber antes de leer
la tabla. `topeNitido` topea el ancho con el que se **construye** la malla. Lo que pasa después
—una escala de énfasis, la cámara acercándose— multiplica encima. Sondeado escena por escena, con la
cuenta cerrando al segundo decimal:

| escena | medido | = 1,4 × | qué lo multiplica |
|---|---|---|---|
| `mosaico` | 1,69 | ×1,17 | el destaque de escala 1,13 más el rebote de su *ease* (línea 361) |
| `columna` | 1,58 | ×1,15 | el foco del centro: `1 + FOCO * exp(-y²/2σ²)` (línea 300) |
| `rafaga` | 1,48 | ×1,05 | escala 1,052 |
| `vitrina` | 1,47 | ×1,02 | la cámara, que se acerca 0,45 unidades |
| `cubo` / `telefono` | 1,60 / 1,59 | — | giro de 64° y 30°: la caja alineada a los ejes mide de más |

**Las dos escalas están declaradas y comentadas en su propio archivo.** Son decisiones de arte: la
pieza que la escena señala crece.

Es la misma familia que ya obligó a escribir `cuadroMasAngosto` —*"un ancho declarado en unidades de
MUNDO no dice lo que se ve"*— y `magnificaInclinado`. La diferencia: aquellas dos se arreglaron porque
el efecto era que algo **se salía del cuadro**, que es binario. Acá el efecto es que el máximo
entregado llega a **1,69x contra el 1,4 declarado**, un 21% por encima, y sólo en el instante del
énfasis y sobre la pieza destacada.

**Queda como decisión de producto, no técnica.** Si se quisiera que el 1,4 valga sobre lo VISTO,
`topeNitido` tendría que recibir la escala máxima que la escena va a aplicar, y las piezas se
construirían ~13% más chicas para llegar a 1,4 justo en el foco. Eso cambia la composición de cuatro
escenas, así que no se hace sin decidirlo.

## Falsos positivos ya comprobados — no volver a investigarlos

### El 1,86x de `mosaico` era su gesto de salida

Costó refutar **tres hipótesis** antes de dar con la causa, y dos habían llegado a un commit como
"causa abierta". Se dejan escritas porque las tres parecían sensatas:

| hipótesis | cómo cayó |
|---|---|
| el vuelo de **entrada** | el pico está en t=0,95, no en 0,05 |
| el **dolly** de la cámara | al instante del pico ya volvió a reposo: 18,62 contra 18,66 → aporta **1,001x** |
| la **construcción** | `geomW` 0,875 y `permitido` 0,875 — exacto, sin un decimal de error |

Lo que era: la pieza estaba en **z = 4,6**, un 25% más cerca que el plano z=0 contra el que
`topeNitido` mide, porque la escena la manda ahí al final. Su línea 366 lo declara: *"SALEN HACIA LA
CÁMARA, escalonadas. El corte siguiente se siente ganado."* La cuenta cierra: `1,4 × (18,62/14,03) =
1,858` contra 1,86 medido.

**No se tocó `mosaico`.** Hace lo que declara; lo que estaba mal era el instrumento, que medía un
instante que la escena nunca ofrece para leer.

### Una caja alineada a los ejes sobre una malla girada mide de más

`cubo` gira 64° en su tumbo y `portatil` 72°. El ancho sale de la caja alineada a los ejes, así que
sobreestima. Por eso la tabla informa el giro: para poder descontarlo a ojo en vez de creerle al
número.

## Tres cosas que el instrumento midió mal antes de servir

1. **Texturas de prueba de 64 px.** Las demás compuertas las usan porque miden geometría; en un censo
   de nitidez acusarían absolutamente todo. Es el mismo error que dio el falso positivo de `mosaico`
   con cobertura 0,044. Acá los tamaños salen de la distribución real de arriba.
2. **La rotación se leía de `o.rotation`, que es la propia.** La cara de `cubo` no rota: rota el grupo
   que la contiene. Con el dato malo, su 1,63x no tenía explicación.
3. **No veía las texturas que viven en un uniform de shader** — y ahí estaban `telefono`, `ventana`,
   `portatil` y `pantalla`, o sea los que muestran la página entera. No aparecían ni medidos ni en la
   lista de faltantes: un agujero en el mecanismo que existe para que no haya agujeros silenciosos.

## Cómo sabe qué es material del cliente

No lo deduce: **lo marca al fabricarlo**. Las texturas del cliente las arma la propia herramienta, así
que llevan una marca y la pregunta deja de ser una inferencia.

Hacen falta **dos criterios** y se aprendió a los golpes: con la marca sola se cayeron `mesa` y
`titular`, que toman su textura por `texturaDe` del kit y no por el mapa de la herramienta. La marca
cubre una vía; la declaración `userData.tipoImagen === 'recorte'` cubre la otra.

## La deuda quedó cerrada

Eran cuatro escenas dibujando material del cliente **sin declarar `tipoImagen`** — `portatil`,
`telefono`, `vitrina` y `contraste`—. No afectaba a esta tabla, porque la marca las alcanza igual,
pero **sí a cualquier otra herramienta que filtre por ahí**: `heroes-audit` informaba `muestra: no`
para `cubo` cuando cubo muestra.

**Las cuatro declaran.** Hoy toda malla del motor que dibuja la imagen del cliente lo dice, así que
una herramienta nueva puede confiar en `tipoImagen` sin necesitar la marca del censo.

El censo pasó de 7 escenas medidas a **13**.

## El filtro que se declara con su número

No se juzga una pieza **en fundido**: una que se está desvaneciendo no se está ofreciendo para leer.
La salida dice cuántas muestras descarta por eso (≈3960). Un filtro que baja los resultados y no se
anuncia es la forma más cómoda de que una herramienta diga lo que uno quería oír.
