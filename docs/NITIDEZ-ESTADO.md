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

## Estado: 11 escenas/héroes con imagen del cliente, ninguna por encima de 2x

| escena | aumento | dibujado | nativo | nota |
|---|---|---|---|---|
| `mosaico` | 1,69x | 433 px | 256 | el destaque de escala 1,13 — declarado |
| `hero` / `cubo` | 1,60x | 192 px | 120 | girada 64° en el tumbo: la caja mide de más |
| `telefono` | 1,59x | 1143 px | 720 | girada 30° |
| `columna` | 1,58x | 404 px | 256 | |
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

## Deuda conocida

Cuatro escenas dibujan material del cliente **sin declarar `tipoImagen`**: `portatil`, `telefono`,
`vitrina` y `contraste`. No afecta a esta tabla —la marca las alcanza igual— pero **sí a cualquier
otra herramienta que filtre por ahí**. Ya pasó: `heroes-audit` informaba `muestra: no` para `cubo`
cuando cubo muestra, y por eso `cubo` ahora declara.

## El filtro que se declara con su número

No se juzga una pieza **en fundido**: una que se está desvaneciendo no se está ofreciendo para leer.
La salida dice cuántas muestras descarta por eso (≈3960). Un filtro que baja los resultados y no se
anuncia es la forma más cómoda de que una herramienta diga lo que uno quería oír.
