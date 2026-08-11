# Auditoría de escenas con render — estado y qué creer de cada número

```bash
npm run pesado -- python tools/escenas-render.py
```

Renderiza 16 piezas (12 de 20 s y 4 de 30 s) y mide **cada tramo por separado**, sobre píxeles. Es lo
que faltaba: `imagen-check.py` mide la **pieza** —cuánto se congela y cuánta ocupación tiene en
total— y eso deja pasar el caso que importa, una escena floja dentro de una pieza sana. Un video de
20 s lleva seis escenas y un solo héroe.

No cuesta render extra: el `plan.json` dice dónde empieza y termina cada tramo.

## Estado: las 18 escenas ACTIVAS medidas, cero defectos

(Las otras 2 del catálogo están dormidas a propósito — ver abajo.)

| escena | veces | movimiento | tinta |
|---|---|---|---|
| `bandera` | 2 | 0,644 | **0,036** |
| `cita` | 10 | 0,767 | 0,222 |
| `sello` | 4 | 0,784 | 0,169 |
| `lista` | 4 | 0,914 | 0,258 |
| `marquesina` | 2 | 1,052 | 0,420 |
| `hero` | 13 | 1,257 | 0,355 |
| `gancho` | 10 | 1,441 | 0,152 |
| `titular` | 5 | 1,577 | 0,390 |
| `cierre` | 16 | 1,635 | 0,221 |
| `apertura` | 11 | 2,370 | 0,252 |
| `rafaga` | 4 | 2,815 | 0,205 |
| `mesa` | 7 | 2,957 | 0,502 |
| `tarjetas` | 3 | 3,147 | 0,378 |
| `toro` | 7 | 4,271 | 0,246 |
| `tipografia` | 4 | 8,915 | 0,228 |
| `destello` | 7 | 10,524 | 0,093 |
| `pantalla` | 4 | 12,779 | 0,267 |

Referencias medidas en este repo: **0,005** es el ruido del códec sobre una imagen congelada y
**0,370** la escena más quieta. El movimiento más bajo de la tabla (0,644) es 128× el ruido.

## Mirar la columna `veces` antes de concluir

Pasó **dos veces en dos horas**, y las dos veces saqué una conclusión de un promedio de una muestra:

| escena | con n=1 | con más muestras |
|---|---|---|
| `rafaga` | 0,060 → marcada | **0,250** con n=3 → no queda |
| `sello` | 0,051 → marcada | **0,169** con n=4 → no queda |

Un promedio de una muestra no es un promedio.

## Las que van a quedar bajo el piso para siempre, y por qué

No las vuelvas a investigar: las tres son diseño declarado en su propia cabecera.

- **`bandera`** (0,036) — *"un campo de color liso ocupando el cuadro entero, el nombre calado
  adentro. Sin marco, sin HUD, sin contador."* Un campo liso hace que la tinta sea baja por
  definición: casi todo el cuadro es el mismo color.
- **`sello`** — *"un emblema chico y tres cuartos de cuadro sin nada."* Registrado en 0,042 de
  ocupación.
- **`gancho`** — es una placa de texto que hay que poder **leer**, así que su quietud es inherente.

**Límite estructural que esto revela:** la métrica de tinta penaliza a las escenas que componen con
campos lisos, y eso es una decisión de arte válida. La herramienta dice **dónde mirar**; la cabecera
de la escena dice si eso estaba buscado.

## El defecto que encontró: `pantalla` cortaba el texto del cliente

Se llegó por un camino que conviene repetir: se abrió un cuadro de la escena con **más movimiento**
(12,78) sospechando que se leyera como caos. No era eso — el defecto estaba quieto en el cuadro.

Medido en basecamp.com, cuadro 412 de 600: se leía *"ver 2.7 billion comments"* donde dice **"Over"**
y *"decade"* donde dice **"decades"**. El texto de la página cortado por los dos costados.

La causa era una constante, y **la regla ya estaba escrita en otro archivo del repo**: `mosaico` usa
1.06 y explica por qué — *"un recorte de página lleva su contenido adentro y sangrarlo se lo come"*.
`rafaga` usa lo mismo por lo mismo. `pantalla` usaba **1.10**, y es la escena que más texto de la
página muestra.

Con 1.06 se lee *"Over 2.7 billion comments have been posted."* y *"that spans decades."* completos.
La imagen sigue tocando los dos bordes: **a sangre quiere decir que la imagen llega al borde, no que
las palabras se corten.**

### Y se barrió el patrón entero

`pantalla` era el único caso. Los demás multiplicadores sobre 1.06 son ornamentos o campos de color
—`bandera` 1.25, `marquesina` 1.3, `destello` 1.20, `sello` 1.2, `partida` 1.2— y ninguno lleva
textura de página. `titular` usa **1.02** para su foto, que es correcto.

## Lo que falta

**`columna` y `contraste` están DORMIDAS a propósito** — registradas, verdes en las compuertas y fuera
del sorteo por decisión de producto, con la cita que la motivó en el Set `DORMIDAS` de `guion.js`. No
son material sin auditar: son material apagado. La herramienta ahora las informa aparte.

**`partida` ya está auditada.** Cayó al ampliar el barrido a 22 piezas con páginas que nunca se habían
probado (`pentagram.com`, `theverge.com`) y semillas nuevas. Mide **movimiento 0,933 y tinta 0,837 —
la más alta de las 18**, o sea el cuadro más lleno del catálogo. Ninguna señal de defecto.

**Con la salvedad de que tiene n=1**, y en este mismo documento hay dos casos de conclusiones sacadas
de una sola muestra que se cayeron con más datos. Su lectura es preliminar hasta que aparezca en más
piezas.

### Cómo NO buscarla, que costó dos renders

Antes de ampliar el barrido se intentó **predecir** una semilla que la produjera, corriendo `guionDe`
fuera del motor. Falló dos veces, y las dos por la misma razón de fondo: **el simulador no reproducía
al motor**.

| intento | qué se usó | por qué falló |
|---|---|---|
| 1º | el fixture `tools/fixtures/director/elementos/*.json` | el motor usa `tools/out/motor/*/datos.json`, que sale de la captura y trae otras frases |
| 2º | los datos reales, pero con una tabla de bpm **inventada** | `lujo` declara **bpm 76** y el render usó **78**; se simuló con **85** |

Las dos veces la predicción decía que `partida` entraba y el plan real salió sin ella. **El "10,8% de
las veces" que se reportó en un commit anterior sale de ese mismo simulador y no es un dato
confiable.** Lo que funcionó fue lo caro y honesto: **renderizar de verdad y mirar el plan.**

## La cuña del mundo claro pasa por detrás del texto en 11 de las 20 escenas

Encontrado por un cuadro y confirmado por un barrido. En `toro` el titular del cliente —"ENABLE ANY
BILLING MODEL", copy real de stripe.com— cruza la diagonal violeta del fondo y se parte en dos
legibilidades: **3,15:1** la mitad sobre el fondo claro y **1,11:1** la mitad sobre la cuña. 1,11:1 no
es poco contraste, es texto que no se lee.

La cuña declara en su propio comentario (`kit.js`) que *"LA DIAGONAL VA POR DEBAJO DE LA BANDA DE
TIPOGRAFIA"* y que su borde *"queda entre el 9% y el 39% del alto"*. O sea que asume que los titulares
viven arriba del 39% contado desde abajo. Barridas las 20 escenas midiendo dónde cae cada malla de
texto, **11 ponen texto adentro de esa zona**:

| escena | textos en la zona |
|---|---|
| `tarjetas` | 9 |
| `toro` | 6 |
| `apertura`, `cierre`, `marquesina` | 4 c/u |
| `destello`, `tipografia` | 2 c/u |
| `cita`, `hero`, `lista`, `partida` | 1 c/u |

**40 no son 40 defectos, y eso hay que decirlo antes de que alguien lo lea como una lista de tareas.**
La cuña sólo existe en mundo CLARO, varios de esos textos ya tienen cama —el pie de `toro` la tiene y
se lee perfecto en el mismo cuadro donde el titular no— y otros pueden estar en tonos que aguanten. El
barrido dice **dónde mirar**.

**Y no se puede verificar sin renderizar**, que es lo que hace a esta familia cara: el texto viaja por
`materialMascara` (invisible para `fondo-check`) y el fondo es un shader (que `esTapa` descarta a
propósito). Los dos puntos ciegos, sobre la misma frase. Ver `docs/HEROES-AUDIT.md`.

**Arreglado en `toro`** con una cama, que es la solución que este repo ya eligió para el rótulo del
héroe: *"garantiza el fondo en vez de depender de medirlo"*. Después en `cierre` (1,77:1) y en `mesa`
(**1,02:1**, el peor de los tres).

### Y ahora la lista se ordena sola — `tools/cuna-inventario.mjs`

Barrer las once escenas a ojo era el problema: cada verificación cuesta un render y el barrido no decía
por cuál empezar. La herramienta cruza dos cosas sin renderizar nada —qué textos caen en la franja donde
la cuña puede llegar, y cuáles **no tienen una cama detrás**— y ordena por **cuánto se mete** el texto.
Ese orden es el que sirve: los tres defectos confirmados estaban al 5%, 8% y 22% del alto.

Tres cosas que aprendió a los golpes y que quedan escritas en el archivo, porque cada una la hizo mentir:

- **La franja es un SOBRE, no la cuña.** Reproducir el shader —con su `donde` saltando entre cuatro
  valores cada dos beats— sería copiar una cuenta que se desincroniza. Se toma la posición más alta que
  la cuña puede alcanzar. Lo que **no** aparece en la lista está a salvo; lo que aparece hay que mirarlo.
- **Se mide con la escena montada y en tres instantes.** En `t=0` los textos por máscara tienen `uProg`
  en 0 y las camas animadas están colapsadas: la de `cierre` arranca en `scale.x = 0.0001` a propósito,
  así que **la herramienta acusaba el arreglo que se acababa de verificar sobre píxeles**. Con un solo
  instante tampoco alcanzaba — el pie de `cierre` aterriza al 53% del tramo.
- **Las dormidas se marcan.** `columna` salió primera del ranking, con texto al 0% del alto, y no sale
  en ninguna pieza: está en `DORMIDAS`. Se descubrió buscándole una semilla y no encontrándola en 120
  guiones. Se lee de `guion.js`, no se copia.

Estado al cerrar: **224 textos sin cama en escenas que se despachan**, encabezados por `tipografia` (7%
del alto), `titular` (12%) y `tarjetas` (21%).

> **Ese 224 quedó viejo y hay que volver a correr la herramienta.** Se le corrigió después un falso
> positivo: la prueba de "tiene cama" exigía que la cama contuviera la caja ENTERA del texto, así que
> cualquier renglón más ancho que el cuadro salía acusado aunque estuviera cubierto de punta a punta.
> Lo destapó `marquesina` — sus dos cintas son camas opacas, y su propio archivo cuenta que se pusieron
> para arreglar un **1,05:1** medido sobre 55 de 77 combinaciones. La herramienta le marcaba 22 textos
> sin cama a una escena ya arreglada. Ahora las dos cajas se recortan al cuadro antes de compararlas,
> que es el mismo criterio que `encuadre-check` documenta al revés: la pregunta es sobre lo que se ve,
> no sobre la geometría completa. El número baja; cuánto, hay que medirlo.

#### `tipografia` — verificada sobre píxeles y NO se le pone cama

Es la primera de la lista, así que se rindió. Semilla 2 sobre basecamp, aire `editorial`, cuadro 70 del
tramo: el epígrafe de abajo —`D.rotulo || sello(0)`, o sea **el nombre de la marca del cliente**— cruza
la diagonal y se parte, igual que el titular de `toro`. Medido a los dos lados del corte:

| mitad | contraste |
|---|---|
| izquierda, sobre el fondo claro | **9,05:1** |
| derecha, sobre la cuña | **2,86:1** |

**Y aun así no se toca, que es la parte que importa.** 2,86:1 es prácticamente el mismo número que da el
rótulo de `mesa` con este método (2,96:1), y ese rótulo se lee perfecto en el cuadro — o sea que está en
la banda del texto chico que este motor produce normalmente. Los tres que sí se arreglaron medían 1,02,
1,11 y 1,77: un orden de magnitud peor, y en el cuadro se ven como manchas, no como texto.

Ponerle cama a un caso limítrofe tiene un costo que el propio comentario de la cuña anticipa —*"un
bloque sólido detrás de una frase le come el contraste"*— y cuatro camas seguidas empiezan a convertir
el diseño en una fila de cajas. La regla que queda escrita: **se pone cama cuando el texto no se lee, no
cuando la herramienta lo nombra.** El sobre dice dónde mirar; el cuadro dice si hay defecto.

#### El techo sobre la cuña es 2,74:1 — ningún tinte llega al piso de 3,2

Esto reordena el problema entero, y sale de aritmética de color, sin renderizar.

**La paleta la pone la PÁGINA, no el aire, y equivocarse en eso da la cuña de otro color.** La primera
versión de esta tabla usó `LOOK.bg` y `LOOK.acento` del aire y calculó una cuña `#ca6b62`, terracota.
La de los cuadros abiertos es azul. El motor lo dice en su propia salida — *"mundo CLARO (#ffffff /
acento #2377d2)"*—: bajo un mundo claro el fondo y el acento salen del sitio del cliente. Con la paleta
correcta la cuña calculada da **`#6e95d9`** contra un medido de `#618ccc`, que ya es la misma cuña.

Contra ese azul, los tintes:

| tinte | color | vs fondo blanco | vs la cuña |
|---|---|---|---|
| la tinta más oscura | `#14110d` | 20,81:1 | **2,74:1** |
| `nivel(0.55)` | `#77726a` | 14,08:1 | 1,85:1 |
| el acento de la página | `#2377d2` | 10,76:1 | **1,41:1** |

**El modelo se valida contra píxeles:** predice 1,85:1 para el tinte del pie de `cierre`, que **midió
1,77:1**. (La versión anterior predecía 1,74 y parecía acertar igual: era casualidad, con la cuña de
otro color.)

Tres conclusiones que dejan de ser opinión:

1. **Oscurecer el texto no arregla nada.** La tinta más negra del motor no pasa de 2,74:1 ahí: el piso
   de 3,2 es inalcanzable sobre la cuña con cualquier tinte. La cama no es "una solución más" — es la
   única, junto con mover el texto fuera de la franja. Justifica a posteriori no haber tocado el tinte
   del pie de `mesa` cuando midió 2,59 y la tentación era darle más tinta.
2. **El acento sobre la cuña sería lo peor posible: 1,41:1** — acento sobre acento. Conté los usos de
   `LOOK.acento` por grep y salían doce en `tipografia`, nueve en `tarjetas`, ocho en `apertura`, y de
   ahí saqué que había que mirar eso primero. **Era falso.** Midiendo el rol del tinte de cada texto
   marcado, en `editorial` **no hay un solo texto en acento dentro de la franja**: esos usos son barras,
   filetes y marcas, no letras. El grep contaba apariciones del símbolo, no textos.
3. **Recalibra el criterio.** Pedir 3,2 sobre la cuña es pedir lo imposible; el corte real es "está
   debajo de lo que la cuña permite". Los tres defectos confirmados medían 1,02, 1,11 y 1,77.

De paso valida no haber tocado `tipografia`: sus 2,86:1 medidos están **por encima** del techo de 2,74,
o sea que ese texto no estaba del todo sobre la cuña. Es el caso de la palabra partida, no el de la
palabra tapada — que es exactamente lo que se ve en el cuadro.

#### `titular` — la predicción NO se cumplió: 3,06:1, está sobre el lado claro

Su pie es **el mismo patrón exacto** que los dos defectos confirmados: `D.dominio || D.marca` —el
dominio del cliente—, tinte `nivelTexto(0.55)`, pegado al margen izquierdo y sin cama. Es el mismo
tinte que usa el pie de `mesa`, que midió **1,02:1** sobre píxeles. Y cae al 12% del alto sobre la
izquierda, donde la cuña llega hasta el 15,7%.

La cuña es `mix(col, acento, 0.86)`, así que el contraste se puede calcular sin renderizar. Con
`editorial`:

| | contraste |
|---|---|
| `nivel(0.55)` contra el fondo blanco | **14,08:1** |
| `nivel(0.55)` contra la cuña | **1,85:1** |

Con la paleta de la página, que es la que vale (ver arriba). Predice 1,85 para el mismo tinte que en
`cierre` **midió 1,77 sobre píxeles**.

**Y el render lo desmintió.** `python backend/motor.py https://basecamp.com --escena titular --aire
editorial`: el pie sale en 29 de los 99 cuadros y mide **3,10:1 de mediana, 3,06:1 en el peor** — por
encima de la referencia de texto legible (2,96:1) y por encima del techo de la cuña (2,74:1), que es la
prueba de que **no está sobre la cuña** sino sobre el triángulo claro. Se ve en el cuadro: `BASECAMP.COM`
queda a la izquierda de la diagonal, limpio.

La predicción no estaba mal: decía qué pasaría *si* el texto cayera sobre la cuña. Lo que faltaba era la
geometría, y la geometría lo salva. Es exactamente para lo que la franja se declaró un SOBRE.

*Límite honesto:* esos 29 cuadros son ~1 s, o sea que la cuña no recorre sus cuatro posiciones dentro de
la ventana en que el pie está en pantalla. Con otra semilla podría no coincidir igual.

**Y tres mediciones falsas antes de la buena, que valen como advertencia.** El mismo recuadro dio 1,15,
1,17 y 1,15:1 con tres criterios distintos, y las tres veces el número era basura:

1. tomando la mediana del recuadro como "fondo" — con texto grande la mediana cae SOBRE una letra;
2. cambiándola por el percentil 90 — sigue midiendo los cuadros donde el renglón **todavía no entró**;
3. filtrando esos cuadros por el spread — el degradado del fondo tiene spread propio y no los filtra.

Lo que funcionó: detectar glifos por su presencia (una fracción del recuadro *muy* por debajo del fondo)
y recién ahí medir. La señal de alarma estuvo siempre a la vista y la ignoré dos veces: el script decía
"99 de 99 cuadros con el renglón escrito" cuando yo había visto el recuadro vacío a mitad de escena.

**Lo que ese cálculo NO puede decir, y es la mitad del resultado.** Se corrió sobre los once aires
forzando `claro: true`, y los otros diez dan números que no hay que creer: salen entre 1,67:1 y 2,26:1
*contra el fondo*, cuando el texto sobre el fondo se lee perfecto. La causa es que `claro` no es una
propiedad del aire —lo inyecta el motor junto con la paleta de la página—, así que forzarlo sobre una
paleta oscura da un mundo que el motor nunca produce. Sólo la fila de `editorial` es coherente, y es
la única que se usa acá.

#### El barrido completo, corrido de a un aire

Con la máquina ocupada (un juego abierto) el barrido entero no se puede lanzar de una: son 220
construcciones. Pero **de a un aire cuesta nada** — medido, un aire completo movió el disponible de
1238 a 1232 MB, que es ruido. Así que la herramienta acepta `CUNA_AIRE` y `CUNA_ESCENA` y los once se
corrieron uno por uno, en procesos separados, con un piso que aborta si baja de 700 MB.

| escena | en la franja | sin cama | en acento | el más hondo | en cuántos aires |
|---|---|---|---|---|---|
| `columna` *(dormida)* | 11 | 11 | — | 0% | 11/11 |
| `tipografia` | 48 | 48 | — | 7% | 11/11 |
| `titular` | 11 | 11 | — | 12% | 11/11 |
| `tarjetas` | 38 | 34 | — | 21% | 11/11 |
| `apertura` | 43 | 43 | — | 24% | 11/11 |
| `destello` | 33 | 23 | — | 25% | 11/11 |
| `rafaga` | 21 | 21 | — | 34% | 11/11 |
| `gancho` | 11 | 11 | — | 35% | 11/11 |
| `toro`, `cierre`, `mesa`, `marquesina`, `partida` | 165 | **0** | — | — | 0/11 |

**202 sin cama**, no los 224 de antes: la diferencia son los 22 falsos positivos de `marquesina`.

Dos cosas que el barrido completo confirma y que antes eran de un solo aire:

- **Cinco escenas están limpias en los once aires**, incluidas las tres que se arreglaron esta vuelta.
- **No hay un solo texto en acento dentro de la franja, en ninguna escena y en ningún aire.** El
  peligro del 1,41:1 existe en la teoría del color y no se materializa en el motor.

`titular` da exactamente 1 por aire — es el pie, el mismo que la aritmética de color predice en 1,85:1.

#### `tarjetas` — dos hallazgos y sólo uno es de la cuña

| qué | dónde | contraste |
|---|---|---|
| `2 0 2 6`, marca de año | **sobre la cuña**, 34 de 99 cuadros | **1,62:1** |
| `BASECAMP.COM`, el dominio | sobre el lado claro, 55 de 99 cuadros | **2,08:1** |

El `2026` es el caso de la cuña, y es real — pero es un ornamento, no un dato que la página escribió, así
que no tiene la prioridad del dominio ni la del titular.

El dominio **no es un problema de la cuña**: cae sobre el lado claro. Lo que pasa es que su tinte es
pálido — 2,08:1 contra los 2,96:1 de un rótulo que se lee cómodo, y contra los 3,06:1 que mide el mismo
dominio en `titular`. Es una decisión de tinte de esta escena, no la diagonal del fondo, y por eso no se
arregla con cama.

**Y el umbral que hace confiable la detección quedó calibrado: 0,18.** Buscando si había texto en el
recuadro, con una brecha de 0,12 respecto del fondo el detector daba 60 cuadros y 1,39:1 — contaba el
borde de la banda azul como si fuera una letra. Con 0,18 y con 0,25 da lo mismo (55 cuadros, 2,08:1),
que es la señal de que ahí ya está midiendo glifos y no el degradado.

Confirmado mirando el cuadro, no sólo midiendo: el `2 0 2 6` del pie derecho queda sobre la cuña en 34
de 99 cuadros y mide **1,62:1**. Es real y está por debajo del techo. Pero es una marca decorativa de
año, no un dato que la página escribió: la prioridad no es la del dominio ni la del titular.

#### Lo que hace falta para que este ciclo deje de dar números falsos

Cinco mediciones seguidas dieron basura en esta tanda, todas por la misma causa de fondo: **no saber
exactamente dónde está el texto en el cuadro que se está midiendo.** Los tres eslabones quedaron arreglados:

- ✅ **`CUNA_CAJAS=1`** — la construcción emite la caja en píxeles de cada texto sin cama. Se acabó
  sacar coordenadas a ojo de una tira reescalada, que fue lo que produjo 1,15 / 1,17 / 1,21 / 1,85:1
  sobre recuadros que abiertos no tenían una letra adentro.
- ✅ **`CUNA_PAGINA=basecamp-com`** — construye con los datos de la misma captura que va a usar el
  render. Sin esto las cajas son de otra escena: el dominio pasó de `x=226..744` con ANTHEM a
  `x=389..580` con basecamp, y medir la primera es medir fondo.
- ✅ **el umbral de presencia, en 0,18.** Con la caja correcta ya no hace falta emparejar el instante:
  se barren todos los cuadros y se miden sólo aquellos donde hay glifos de verdad. Lo que faltaba era
  que el criterio de "hay glifos" no confundiera el borde de una banda de color con una letra.

Aun con los tres, la regla sigue siendo la de siempre y esta tanda la confirma cinco veces: **el número
no vale hasta que se abre el recuadro y se ve la letra adentro.**

#### Las cuatro que faltaban, verificadas con `--escena`

| escena | qué se midió | resultado |
|---|---|---|
| `apertura` | la línea del claim, partida por la diagonal | **2,92:1** en la mitad clara → **2,42:1** sobre la cuña |
| `destello` | el dominio | **10,01:1** — *la cuña no aplica*, ver abajo |
| `rafaga` | las frases | quedan **arriba** de la cuña; no se pudo medir con banda fija |
| `gancho` | — | **no emite una sola caja** con los datos de basecamp: no hay candidato |

**`apertura` es el único que queda en zona gris.** La línea del claim —la promesa que la marca escribió—
cruza la diagonal y pierde medio punto: de 2,92 a 2,42:1. Se lee: en el recorte se ve "TRUSTED BY
MILLIONS, BASECAMP PUTS EVERYTHING YOU NEED TO GET WORK DONE IN ONE PLACE." entera, con la última parte
más pálida. No es el caso de `mesa` (1,02:1, una mancha). **No se le pone cama**, por consistencia con
`tipografia`: los tres arreglados medían ≤1,77 y se veían rotos; estos dos se leen. Queda anotado como
el peor de los legibles, para que una pasada de diseño decida con el número a la vista.

**`destello` es un falso positivo del inventario, y de una clase nueva: se oscurece el mundo a
propósito.** Su cabecera lo dice —*"vuelta a oscuro. Obligatorio: la escena siguiente cuenta con el
fondo negro"*— y `cierre` depende de eso. La cuña sólo se dibuja con `uClaro`, así que ahí no existe.
Sus 23 marcas salen de que el inventario fuerza `claro: true` en las veinte escenas. El dominio mide
10,01:1, blanco sobre azul profundo.

**`rafaga` no se dejó medir con una banda fija y eso también es un dato:** alterna recorte de página y
frase en el mismo lugar, así que la banda mide una captura de la UI de Basecamp la mitad del tiempo. El
"peor cuadro" resultó ser un pantallazo, no un texto. La tira sí es concluyente: las frases viven arriba
de la diagonal.

Las restantes siguen sin verificar — son candidatos, no defectos. Y con `tipografia` medida en
2,86:1 al 7% del alto, las que siguen están **menos** hondas (`titular` 12%, `tarjetas` 21%, `apertura`
24%…), o sea que la expectativa es que midan mejor. Eso es una inferencia, no una medición: hay que
rendirlas igual, sólo que la urgencia bajó.

**Para rendirlas, una trampa que cuesta un render cada vez que se cae en ella.** No se puede elegir la
semilla corriendo `guionDe` por afuera: el BPM que usa el motor NO es el del aire. Configurando
`editorial` a mano sale 100, y el render de esa misma página salió en **108** — la página modula el
tempo (el plan lo guarda en `bpm` y `bpmAire`, que son distintos). Un plan predicho con el BPM
equivocado trae otras escenas. Lo barato es rendir una vez y leer `plan.json`, no adivinar.

**Y una trampa de medición que hay que conocer antes de perseguir un número.** El pie de `mesa` pasó de
1,02:1 a 2,59:1, o sea todavía por debajo del piso de 3,2. Es un artefacto: el tinte real es `#77726a`,
que contra la placa blanca da **13:1**. Lo que baja el número es que el texto es CHICO y antialiaseado,
así que ningún percentil llega al núcleo del glifo. Calibrado contra el rótulo de la misma escena, que
se lee perfecto y mide **2,96:1** con el mismo método. Darle más tinta al pie para llegar a 3,2 habría
sido arreglar el instrumento, no el video — y de paso habría invertido la jerarquía tipográfica.

## Los 11 aires, comparados entre sí — `tools/aires-render.py`

```bash
npm run pesado -- python tools/aires-render.py
```

Renderiza la **misma página con la misma semilla** en los once aires. Las compuertas los barren
*rotando* (cada escena ve uno distinto), lo que da cobertura pero **no comparación**: si un aire
compusiera peor que los otros diez, quedaría diluido en el promedio.

Había motivo para sospechar: el dolly va de **0,4 (`bienestar`) a 1,55 (`inmobiliario`)**, casi 4×, y
ese rango ya produjo defectos reales — `toro` se salía del cuadro **sólo** con dolly 1,55.

**Resultado: los once sanos, ninguno por debajo de los pisos.**

| aire | bpm | escenas | movimiento | tinta |
|---|---|---|---|---|
| `editorial` | 114 | 6 | 0,899 | 0,347 |
| `artesanal` | 114 | 6 | 0,955 | 0,328 |
| `corporativo` | 114 | 6 | 1,081 | 0,338 |
| `gastronomico` | 114 | 6 | 1,142 | 0,325 |
| `bienestar` | 96 | 5 | 1,184 | 0,282 |
| `inmobiliario` | 108 | 6 | 2,099 | 0,327 |
| `deportivo` | 150 | 8 | 2,780 | 0,337 |
| `tecnico` | 132 | 7 | 3,354 | 0,311 |
| `nocturno` | 144 | 8 | 4,787 | 0,279 |
| `jugueton` | 132 | 7 | 9,033 | 0,350 |
| `lujo` | 84 | 5 | 11,157 | 0,591 |

### El tempo NO predice el movimiento

Es lo contrario de lo que se esperaría: **`lujo`, el aire más lento del catálogo (bpm declarado 76),
produce la pieza que más se mueve (11,157)**, y `editorial` la más quieta con bpm efectivo 114.

La razón es que **el aire cambia el guion, no sólo la cámara**: con otra semilla-aire entra otro
conjunto de escenas, y el movimiento de una pieza depende mucho más de *qué escenas la componen* que
del tempo. Comparar aires por movimiento sin mirar su plan lleva a la conclusión inversa a la real.

### El bpm efectivo no es el declarado, y es diseño

Los once corren más rápido de lo que declaran, con ratios distintos (5,6% a 14%):

| | declara | usa |
|---|---|---|
| `editorial` | 100 | 114 |
| `lujo` | 76 | 84 |
| `deportivo` | 140 | 150 |

No es un factor fijo: es el **ajuste de tempo para que el guion calce en la duración pedida**, que
`guion-check` ya declara (`ajusteDe`, `TOPE_AJUSTE`). Conviene saberlo antes de comparar contra el
número del archivo del aire — como pasó al intentar predecir semillas, donde simular con el bpm
declarado dio planes que el motor nunca produjo.
