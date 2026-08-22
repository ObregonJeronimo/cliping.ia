# El animador de texto de After Effects, medido

Esta es la especificación del selector de rango, **medida contra AE 26.3**, no leída de la
documentación. Todo lo que dice "exacto" se verificó al cuarto o quinto decimal con las sondas
`tools/ae/sondas/animador{,2,3,4,5,6,7,8}.jsx`. Lo que no cerró está en la última sección y **se rechaza en el
exportador**, con nombre y motivo.

## Por qué esto importa más que cualquier otra capacidad

La escritura por carácter aparece en **8 de 8** referencias del género. Hoy se falsea con **una capa
por carácter** — quince capas escritas a mano para "Tu marca, en video" en la PIEZA-I. Mientras cada
gesto cueste una capa, las piezas van a salir ralas: es la causa real del fallo M1 de `ritmo.mjs`
(1,03 gestos/segundo contra un piso de 1,20 sacado de las referencias). Las referencias son densas
porque su densidad **sale gratis del animador**.

## Cómo se midió, porque el método es reusable

AE **no expone la caja de cada carácter** (`doc.value.boxText` es un booleano). El truco:

1. El animador anima la **interletra**. El ancho total de la capa crece con la **suma** de los factores
   de todos los caracteres, y `sourceRectAtTime` lo devuelve sin dibujar nada.
2. Un **segundo selector** por índice aísla un carácter, compuesto en modo **intersección**. El
   resultado es `f(k)` para ese carácter y cero para los demás, así que el ancho lo entrega directo.
3. El peso de cada carácter **no es uniforme**: la interletra se reparte entre los **huecos** (N−1),
   mitad antes y mitad después de cada carácter, así que el primero y el último pesan la mitad. Hay que
   dividir por ese peso, no por una constante.

Medir en vez de renderizar: la sonda entera corre en menos de un segundo.

## Enums, medidos uno por uno

```
ADBE Text Range Units       1 = porcentaje   2 = índice
ADBE Text Selector Mode     1 = suma  2 = resta  3 = INTERSECCIÓN  4 = mínimo  5 = máximo  6 = diferencia
ADBE Text Range Shape       1 = cuadrada  2 = rampa arriba  3 = rampa abajo
                            4 = triángulo  5 = redonda  6 = suave
ADBE Text Range Type2       la BASE (caracteres / sin espacios / palabras / líneas) — NO es la forma
```

**Trampa 1:** los dos juegos de propiedades son **excluyentes**. Con unidades en índice, las de
porcentaje quedan **ocultas** y `setValue` muere con *"la propiedad o una propiedad primaria está
oculta"*. El documento tiene que llevar las unidades o los otros tres números no significan nada.

**Trampa 2:** **cambiar las unidades invalida las referencias de propiedad que ya tenías en la mano.**
AE rehace el grupo y toda referencia guardada muere con *"El objeto no es válido"* — treinta líneas más
abajo del cambio que lo causó. **No cachear propiedades del selector: volver a buscarlas por matchName.**

## La función

Todo se cuenta en **unidades de carácter**. En porcentaje, el 100% son `N` caracteres:

```
esc = (unidades == índice) ? 1 : N/100
ini = (Start + Offset) * esc
fin = (End   + Offset) * esc          si ini > fin, se intercambian
```

El desplazamiento **corre inicio y fin**; no deforma nada. Después, tres bases:

| base | fórmula | antes del inicio | después del final |
|---|---|---|---|
| **cuadrada** | `clamp(min(fin, k+1) − max(ini, k), 0, 1)` — cobertura de la celda `[k, k+1]` | 0 | 0 |
| **rampa arriba** | `u`, con `u = ((k+0.5) − ini)/(fin − ini)` | 0 | **1** |
| **rampa abajo** | `1 − u` | **1** | 0 |
| **triángulo** | `1 − abs(2u − 1)` | 0 | 0 |

Las otras tres bases miran el **centro** del carácter (`k + 0.5`); sólo la cuadrada mide cobertura.

**El comportamiento fuera del rango es la parte que nadie deduciría, y es la que rompe media frase si se
asume mal.** Sólo las dos rampas *sostienen* su valor: pasando el final, la rampa arriba vale **1**, no
0. Deducir "0 en los dos lados" deja sin animar a todos los caracteres posteriores.

`MaxAmount` es un multiplicador lineal al final, y **admite negativos**: −50 da factor −0,5.

## Las seis formas son TRES bases y UNA Bézier

Este archivo decía antes que `redonda` y `suave` no tenían fórmula cerrada y se resolvían por tabla de
40 muestras, y que el **ease negativo** era irresoluble y se rechazaba. **Las dos cosas eran falsas**, y
por el mismo motivo: yo estaba tratando ocho fenómenos separados donde hay **un solo mecanismo**.

```
redonda = triángulo con ease(bajo = -50, alto = +50)
suave   = triángulo con ease(bajo = +50, alto = +50)
```

Contrastado contra 40 muestras por forma medidas en AE: desvío **4,8e-6** y **2,9e-6** — la resolución
de la medición. No es un ajuste elegante, es la respuesta.

Y el mapeo del ease que lo hace funcionar cubre también los negativos. **La asimetría es la clave:**

```
si bajo > 0  ->  x1 = bajo/100        si no  ->  y1 = -bajo/100
si alto > 0  ->  x2 = 1 - alto/100    si no  ->  y2 = 1 + alto/100
```

Los positivos mueven la **X** del punto de control hacia adentro; **los negativos mueven la Y**. Con la
regla equivocada ("los negativos son la X más allá del borde") la predicción daba 0,5502 donde AE mide
0,6464. Con esta, los ocho casos negativos cierran a 5e-6.

*El modelo vino de una revisión en paralelo que ajustó la Bézier por búsqueda en grilla sobre otro juego
de datos; se verificó después contra estas mediciones, que son más finas. Vale decirlo: yo tenía los
datos buenos y el modelo malo.*

## La cuadrada es COBERTURA DE CELDA, y eso es el tecleo

```
f = clamp( min(fin, k+1) - max(inicio, k),  0, 1 )
```

en unidades de carácter. **No es muestreo del centro**, y la diferencia *es* el caso de uso principal:
un tecleo anima el final del rango con el tiempo, o sea pasa por todos los valores fraccionarios. Con
muestreo del centro cada letra aparece de golpe; con cobertura, cada letra se cubre a lo largo de un
paso. Medido: con el rango terminando a medio carácter el factor da **0,50**, y el muestreo del centro
sólo puede dar 0 o 1.

Ninguna medición anterior lo distinguía porque todos los rangos caían en bordes enteros de carácter.

## La suavidad, que cambia cómo se autora

`ADBE Text Selector Smoothness` **existe sólo para la forma cuadrada** — con cualquier otra AE la oculta
y `setValue` falla. Y **viene en 100 por defecto**, que es la identidad: el corte seco del tecleo **no es
lo que sale de fábrica**, hay que pedir suavidad 0.

```
sm = suavidad / 100
si sm = 0   ->  f = (f > 0.5) ? 1 : 0          ESCALÓN EXACTO EN 0,5
si no       ->  umbral = 0.5 - sm/2
                f = (f <= umbral) ? 0 : min((f - umbral) / sm, 1)
```

Medido y discriminado con pasos de un cuarto de carácter:

| cobertura | suavidad 100 | suavidad 50 | suavidad 0 |
|---|---|---|---|
| 0,25 | 0,25 | 0 | 0 |
| 0,50 | 0,50 | 0,50 | **0** |
| 0,75 | 0,75 | 1,00 | 1,00 |

**El escalón hay que escribirlo como escalón.** La primera implementación usaba `sm || 1e-8` para no
dividir por cero, y con eso el umbral daba 0,49999999: una cobertura de exactamente 0,5 quedaba por
encima y el factor salía 1 donde AE mide 0. Lo cazó la compuerta en 2 de 88 configuraciones, y las dos
eran del tecleo — el caso de uso principal, roto por un epsilon.

## El pivote de cada carácter

Toda transformación por carácter necesita un punto fijo, y ponerlo "donde parece" da un resultado que
se ve *casi* bien y diverge de AE de una forma que no se puede señalar con el dedo. Medido con
`animador8.jsx`, por dos caminos independientes:

```
pivote = ( centro del AVANCE del carácter ,  línea de base )
```

- **Escala 200% sobre una "H"**: `−17,139 = 2·9,180 − px` → px = 35,499. El avance de la H medido con
  tres letras es 70,996; su mitad, **35,498**. Y `−140,039 = 2·(−70,020) − py` → py = **0,000**.
- **Rotación 90°** sobre la misma letra: la caja rotada arranca exactamente en 35,498 y alto y ancho se
  intercambian clavados — un segundo camino, mismo punto.
- **Una "y" con descendente**: py vuelve a dar **0**. O sea que **no** es el centro de la tinta, que
  estaría por debajo de la base.

Y el ancla del animador (`ADBE Text Anchor Point 3D`) desplaza el **origen**, no el destino:

```
p' = pivote + S · ( p − pivote − ancla )
```

Con ancla 50 predice −117,138 contra **−117,139** medido. Las dos alternativas razonables dan −67,1 y
+32,9, así que el dato discrimina de sobra.

## El orden de aplicación

```
base(forma) -> ease(Bézier) -> suavidad (sólo cuadrada) -> cantidad máxima
```

## Verificado

`tools/ae/selector-check.mjs` reconstruye **88 configuraciones medidas en AE** y las compara contra
`tools/ae/selector.mjs`. Peor desvío **4,9e-5** con tolerancia 1e-4. El control negativo —romper la
regla de que la rampa sostiene 1 fuera del rango— pone 12 de 88 en rojo.

## Cómo viaja

El exportador vuelca el árbol declarativo y **sólo las propiedades que el autor agregó**:

```
ANIMADOR|<capa>|<n>|<nombre>|<selectores>|<propiedades>
ANIMSEL |<capa>|<n>|<s>|<unidades>|<forma>|<modo>|<base>|<suavidad>|<aleatorio>
ANIMPROP|<capa>|<n>|<matchName>|<dims>
```

Los valores animables **no** van ahí: viajan por las líneas `PROP`/`KEY` de siempre, con espacio de
nombres (`anim1sel1.fin`, `anim1.val.ADBE Text Opacity`). Así reusan el mismo conversor de curvas que
todo lo demás — un canal aparte sería una segunda implementación de la misma cuenta, y esas divergen en
silencio.

**`ADBE Text Animator Properties` expone SIEMPRE las 103 propiedades posibles**, existan o no en la
interfaz. La primera versión del exportador recorría las 103 y emitía un rechazo por cada una que el
motor no aplica: **96 líneas de rechazo falso por animador**. El discriminador es `isModified` (medido:
las agregadas dan `true`, las no agregadas `false`), reforzado con `numKeys > 0` porque `isModified`
significa "difiere de su valor por defecto" y no "el autor la agregó". Quedó en 2 rechazos verdaderos.

## Lo que sigue sin resolverse, y se rechaza

- **Orden aleatorio** (`ADBE Text Randomize Order` + `Random Seed`): es el PRNG propio de AE.
- **Selector de expresión**: otra familia entera.

## Y lo que todavía no se midió

Se dice para que nadie lo dé por cubierto:

- cómo se componen **varios animadores** sobre la misma capa (uno solo está medido)
- la **base** del selector (`Range Type2`): caracteres sin espacios, palabras, líneas
- si el factor se aplica igual a propiedades **no aditivas** (opacidad, color) que a las aditivas: sólo
  se verificó con interletra
- el **selector de expresión**, que es otra familia entera
