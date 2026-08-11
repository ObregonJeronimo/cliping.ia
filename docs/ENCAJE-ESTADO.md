# Clasificación de `encaja` — estado y cómo seguir

Esto existe para que el trabajo no dependa de la memoria de nadie. Es la tarea mecánica y larga que
quedó del pendiente #3: **que cada malla que muestra una imagen declare si tiene que entrar entera en
el cuadro o si puede sangrar**, y que la compuerta falle sobre la malla sin clasificar en vez de sobre
la geometría.

## El número, y por qué no coincide con el que estaba anotado

El pendiente decía *"hoy sólo 16 de 161 mallas con textura declaran si tienen que entrar enteras"*.
Acá decía que **ese 161 no se pudo reproducir con ningún método** y que el censo propio daba **71
mallas con imagen** — con la decisión, correcta en su momento, de no forzar que coincidieran.

### Se reprodujo: son 161 exactas, y el que estaba mal era el censo

El censo decidía *"esta malla muestra una imagen"* preguntando por `material.map`. **19 de las 20
escenas dibujan su texto con `materialMascara`** —o con el `matWipe` de `tipografia`—, que son
`ShaderMaterial` escritos a mano y llevan la textura en `uniforms.map.value`. Lo mismo la tira en
`telefono`, `ventana` y `portatil`. Nada de eso entraba.

Con la búsqueda ampliada a los uniforms: **161 mallas con imagen, exacto**. El número del pendiente era
correcto desde el principio.

**Y eso mueve el estado real de la tarea:** no hay 0 sin clasificar, hay **71**. La compuerta daba
verde porque el censo del que se alimenta sale filtrado por ese mismo criterio (`filas: conImagen`) —
o sea que una compuerta cuyo trabajo entero es cazar mallas sin declarar estaba ciega justo a ellas.

El trinquete vuelve a 71. **No es un retroceso del motor: no se rompió ni una escena.** Es el número
verdadero sustituyendo a uno que era mentira.

| archivo | sin clasificar |
|---|---|
| `tarjetas` | 21 |
| `pantalla` | 8 |
| `toro` | 7 |
| `apertura` | 6 |
| `destello` | 6 |
| `cierre` | 5 |
| `tipografia` | 5 |
| `columna`, `mesa`, `ventana` | 2 c/u |
| `cita`, `marquesina`, `portatil`, `sello`, `telefono`, `titular`, `vitrina` | 1 c/u |

### Antes de bajarlo: una de las 71 NO es un olvido

Barridas las 20 escenas buscando decisiones escritas, aparece exactamente una — y es de las grandes,
el título de `tarjetas` (línea 246):

> *"**NO SE DECLARA `encaja`, Y LA DECISIÓN ESTÁ MEDIDA.** Al marcarlo, E-ENCAJE-REAL lo puso en rojo:
> el título llega a 1.415 en coordenadas de recorte en el aire `nocturno`, 62 de sus 83 cuadros. Eso NO
> lo causa el largo de la marca —pasa con "ANTHEM", de seis letras— sino el empuje de cámara de esta
> escena."*

Y sigue: para que entrara en todo instante habría que bajar el ancho útil a 0,50 de `mundoW`, lo que
achicaría el título al **67% de su tamaño diseñado en TODA pieza**, incluidas las que hoy componen
bien. *"Reencuadrar una composición calibrada para poner una compuerta en verde es cambiar el producto
para satisfacer a la herramienta."* Está remitido a `docs/AUDITORIA-MOTOR.md` para decidirlo mirando el
cuadro.

**Y apareció una segunda, en `destello`.** Ahí la decisión no es "no declarar" sino **declarar por
caso**: `if (tocaLaMarca) { mArriba.userData.encaja = true; ... }`, con el motivo al lado — *"cuando NO
lleva la marca no se marca nada, así que la escena puede seguir sangrando sin que nadie la acuse — que
es justo para lo que se hizo declarativo el chequeo."* Declarar `encaja` en su fábrica de texto pisa esa
condición y convierte una decisión por caso en una regla ciega. Probado: da 2.461 en las mitades.

**No las toques sin esa conversación.** Las otras sí son mallas que nadie vio nunca — no porque
alguien las salteara, sino porque el censo no las mostraba.

**Y esto destapa un hueco en el vocabulario:** `SIN CLASIFICAR` significa hoy dos cosas que no son la
misma, *"nadie lo miró"* y *"se decidió, se midió y está escrito por qué"*. Mientras sean
indistinguibles, bajar el trinquete corre el riesgo de pisar una decisión creyendo que corrige un
descuido. Un cuarto valor —algo como `tolera`, con el motivo obligatorio— resolvería las dos cosas a la
vez: saca a los casos decididos de la cuenta y deja la cuenta significando lo que dice.

```bash
node tools/encaja-inventario.mjs
```

Mide 37 escenas/héroes × 8 juegos de datos, recorriendo 31 instantes de cada línea de tiempo y
guardando el peor juego de cada escena. Con `--detalle` lista malla por malla y con `--json` lo
escupe para otra herramienta.

## Cómo se clasifica

Sobre la malla, en la escena:

| declaración | qué significa |
|---|---|
| `userData.encaja = true` | tiene que entrar **entera**. `encuadre-check` se lo va a exigir. |
| `userData.sangra = true` | puede cruzar el borde **a propósito** (cintas, ornamentos, fondos). |
| `userData.encajaEntre = [a, b]` | entra entera **entre esas fracciones** de la escena. Para las que vuelan hasta su lugar. |
| `userData.encajaEje = 'x' \| 'y'` | entra entera **sólo en ese eje**. Para feeds y cintas, que sangran en el otro por definición. |

`encajaEntre` tiene guardarraíl: el tramo debe llegar al menos a **0.90** y cubrir el **25%**. La razón
está en `encuadre-check`: lo que separa "vuela y después se compone" de "me mido donde me conviene" no
es cuánto dura el tramo, sino dónde termina — una rendija en el medio deja sin mirar justo el tramo
donde la composición está quieta y el espectador la lee.

**El tramo se deriva, no se calibra.** En `mosaico` la primera versión puso `[0.25, 0.95]` midiendo un
solo caso y falló con otro aire, porque el momento de asentarse depende del aire y de cuántas piezas
hay. Sale del propio tween de entrada de la escena.

## El trinquete

`tools/encaja-check.mjs` está en la cadena del guard. Arrancó en lo medido y **sólo podía bajar**:
poner el piso en 0 el primer día habría dejado la cadena roja con 59 casos y nadie podría pushear
hasta terminar todo.

**Estuvo en 0 el 2026-08-06 y ese cero era falso** — el censo no veía 71 mallas (ver arriba). Volvió al
número verdadero y se está bajando de nuevo, ahora sobre las 161 reales.

Cuando clasifiques una tanda, la compuerta te dice el número nuevo. **Bajalo al medido, no a uno
redondo.**

| fecha | sin clasificar | qué se hizo |
|---|---|---|
| 2026-08-06 | 59 de 71 | estado inicial medido |
| 2026-08-06 | 40 de 71 | `marquesina` (10) y `mosaico` (9) |
| 2026-08-06 | 32 de 71 | `columna` (8), primer caso de `encajaEje` |
| 2026-08-06 | 28 de 71 | `mesa`, `titular`, `contraste`, `vitrina` (1 cada uno) |
| 2026-08-06 | 21 de 71 | `rafaga` (7) |
| 2026-08-06 | 15 de 71 | `apertura`, sólo el contador (6) |
| 2026-08-06 | 7 de 71 | `apertura`, sus 8 letras (arreglado el dimensionado) |
| 2026-08-06 | **0 de 71** | `tipografia` — se creyó cerrado, y el censo estaba ciego |
| 2026-08-08 | **71 de 161** | el censo aprende a ver los `ShaderMaterial`: el 161 del pendiente era correcto |
| 2026-08-08 | 66 de 161 | `cita`, `marquesina`, `sello`, `titular` (pies y rótulos) y el espejo de `vitrina` |
| 2026-08-08 | 64 de 161 | el helper `chico()` de `mesa` |
| 2026-08-08 | 63 de 161 | el eco de `tarjetas` (sangra) |
| 2026-08-08 | 55 de 161 | `pantalla` entera: 7 bandas sangran, el pie encaja |
| 2026-08-08 | 53 de 161 | `columna`: no se declaró, se **arregló** el ancla con `cuadroMasAngosto` + órbita |
| 2026-08-08 | 52 de 161 | `ventana` (sangra: mide 1.02 del cuadro por diseño) |
| 2026-08-08 | **39 de 161** | `toro` (7) y `apertura` (6), sus fábricas de texto, sin un solo fallo |

## Lo que falta, por archivo

**31 de 161.** Y no es una lista de tareas: **26 de las 31 son las dos decisiones ya documentadas.**

| archivo | faltan | qué es |
|---|---|---|
| `tarjetas` | 20 | **la pregunta reservada.** Su cámara "agranda el cuadro cerca del doble" — medido, declarar en su fábrica da hasta 2.065, y el contador ya se acota al ancho de su tarjeta |
| `destello` | 6 | **decisión por caso ya tomada** (`if (tocaLaMarca)`). No declarar en la fábrica |
| `cierre` | 1 | el texto del CTA. Escala de mundo 1.124–1.317 con pico a mitad de escena; descartados la marca, las tres del pie y el rebote elástico |
| `tipografia` | 1 | `w4`. El arreglo del margen no la movió, así que no es el acercamiento |
| `telefono` | 1 | 3.122 → **1.031** con la ventana legible; el resto es su encuadre declarado |
| `portatil` | 1 | 1.963 → **1.211**; el resto sale de la apertura de la tapa |
| `ventana` | 1 | su carcasa ya es `sangra`; queda otra malla del mismo archivo |

**Los cinco sueltos tienen el número separado en gesto y encuadre**, que era el trabajo caro. Ninguno
está esperando que alguien "lo haga": están esperando una decisión de arte o un último descarte.

### El patrón que apareció tres veces en un día

`columna`, `tipografia` y (parcialmente) `tarjetas` fallaron por lo mismo: **medir contra el cuadro en
reposo cuando la escena mueve la cámara**. El kit ya tiene `cuadroMasAngosto` para eso desde que `toro`
lo necesitó, y las tres lo desconocían — `tipografia` incluso lo tenía resuelto para su `ANCHO` y no
para sus márgenes.

Y en `columna` hacía falta **sumarle la órbita**: `cuadroMasAngosto` cubre que el cuadro se angoste,
no que la cámara se corra de costado y se lleve puesto lo que esté pegado al margen.

## El límite conocido de `encajaEntre`, medido

`encajaEntre` se diseñó para mallas que viven **toda** la escena y vuelan hasta su lugar, como las de
`mosaico`. Las mitades de `tipografia` no son eso: entran desde ±5.0, se componen, y salen en el beat
1.5 de una escena de 8 porque son la **primera de tres frases que se suceden**. Derivado de sus tweens
(líneas 405-412): la entrada termina en `b(0.85)` y la salida arranca en `sal(1.5)`, o sea una ventana
compuesta de **[0.11, 0.19] — el 8% de la escena**.

El guardarraíl la rechaza (pide llegar a 0.90 y cubrir 25%) **y hace bien**: con la escena entera como
referencia, un tramo así es indistinguible de una rendija puesta para esquivar la compuerta.

Lo que falta para cubrir este caso es medir el tramo sobre **la vida visible de la malla** en vez de
sobre la escena: "entra entera durante el último 80% del tiempo en que se la ve". Eso sí distingue una
malla efímera y bien compuesta de una rendija conveniente. No está hecho — se deja anotado en vez de
forzar `tipografia` con un tramo que el guardarraíl tendría que dejar pasar por excepción, que es
justamente como se rompen las compuertas.

## `apertura`: el defecto que destapó la clasificación, y cómo se arregló

Declarar `encaja` en las letras del nombre puso en rojo las dos compuertas. **Y el primer diagnóstico
que escribí estaba mal**, así que conviene dejar las dos versiones:

> *Lo que anoté primero:* "con marcas de 1-2 letras la letra se sale 0.22 del cuadro".

Falso. Con la marca `Q`, el borde del **glifo** cae en −2.65 y el semiancho del cuadro es 2.815: el
glifo entra. Lo que cruzaba el borde es el **aire transparente** que `texto()` deja alrededor
(`AIRE = 0.3 / 1.34`), y `verificar.mjs` mide la caja de la malla, no la tinta.

Los defectos reales eran **tres**, y hacían falta los tres:

1. **La palabra se centraba por el ancho deseado, no por el real.** `cursor` arrancaba en `-OBJ / 2`.
   Cuando `ALTO_MAX` topea la letra —lo que pasa con nombres de 1-2 letras— el ancho real queda menor
   que `OBJ` y la palabra se corre a la izquierda. Medido con `Q`: la letra sentada en **x = −1.61**
   en un cuadro que va de −2.82 a 2.82. Una marca de una letra pegada al margen izquierdo, en el
   cuadro más grande de la pieza.
2. **El reparto no contaba el aire del glifo.** `unidad` es `ar − AIRE` (sólo el glifo) pero la malla
   se dibuja con el `ar` completo, así que la palabra medía siempre `AIRE * ALTO` más de lo pedido.
   Se reparte dividiendo por `suma + AIRE`.
3. **`OBJ` estaba en unidades de mundo y el dolly achica el cuadro.** Es el patrón que ya costó `toro`
   y `mesa`. La cámara se acerca hasta `dolly(distBase, −0.55)` y el dolly lo pone el aire (0.4 a
   1.55): medido, hasta **1.128 anchos de cuadro** con el aire técnico. Ahora sale de
   `cuadroMasAngosto`, y el acercamiento se declara **una sola vez** y lo usan la cámara y el ancho.

Arreglado: las 8 letras declaran `encaja` y las dos compuertas quedan verdes sobre las 407
construcciones. Trinquete **15 → 7**.

## Cómo clasificar sin romper nada — el orden que funcionó

1. **Leer la cabecera de la escena antes de tocarla.** Las dos que se clasificaron ya tenían la
   decisión tomada y escrita; lo único que faltaba era declararla en la malla. `mosaico` dice "Y
   SANGRA" en mayúsculas sobre su banda, y `marquesina` explica que su cinta es un bucle.
2. **Declarar, y después correr `encuadre-check`.** Declarar `encaja` es pedirle a la compuerta que lo
   exija: si aparecen fallos, son reales y estaban tapados por la falta de clasificación.
3. **Si falla, medir cuándo se sale antes de decidir.** En `mosaico` los fallos eran el vuelo de
   entrada (0.00–0.22) y la salida (0.96–1.00), con el 74% del medio limpio — no un defecto de
   composición. Eso es lo que motivó `encajaEntre`.
4. **Correr también `verificar.mjs`**, que tiene su propia comprobación de `encaja`: mide en
   coordenadas de mundo y en un instante, sin noción de tramo. Encontró un caso que `encuadre-check`
   no ve.
5. **Bajar el trinquete** y dejar la medición escrita.

## Trampas ya pisadas en este censo, para no repetirlas

- **Medir en un instante.** Varias escenas crean mallas dentro de la línea de tiempo: contó 68 en vez
  de las 71 reales.
- **Deduplicar por nombre de malla.** Casi ninguna tiene `name`: el censo se derrumbó de 736 a 57 y el
  número parecía plausible. Se deduplica por identidad de objeto.
- **Escribir la justificación antes de medirla.** Dos comentarios resultaron falsos al comprobarlos:
  "el aire no cambia qué mallas existen" (el total se mueve entre 726 y 796) y "el censo escala con el
  material" (con 5 recortes y con 12 da lo mismo).
- **Calibrar un umbral con un solo caso.** Pasó dos veces el mismo día: el tramo de `mosaico` y el
  guardarraíl de cobertura.

## `portatil` (1 malla) — intentada y REVERTIDA: la compuerta y el render se contradicen

Es la que parecía más fácil de las 29, porque su propio archivo dice qué corresponde: *"Lo que
corresponde es `encaja` + `encajaEntre` con la ventana derivada del tween"*. Se hizo exactamente eso y
**no se pudo cerrar**. Queda escrito para que el próximo empiece de acá y no de cero.

**Lo que se hizo.** La ventana sale de los tweens, no de calibrar: la tapa termina de abrirse en
`b0.9 + b1.5 = b2.4` y la salida arranca en `b8 − b0.9 = b7.1`, o sea `[0.30, 0.8875]` sobre los 8
beats. Declarado `encaja` + `encajaEntre [0.32, 0.88]`.

**Primer aviso, legítimo y corregido:** E-ENCAJE-TRAMO pide que el tramo llegue al menos a 0.90.
Ampliado a `[0.32, 0.92]` — y no es hacer trampa: la salida usa `E.acelera(3)`, así que a 0.92 el
equipo recorrió el 0,01% de su salida. El aviso desapareció. **Importante para el próximo:** con el
tramo RECHAZADO la compuerta no lo ignora, cae a exigir la malla en *todos* los cuadros, entrada
incluida. Los dos avisos eran el mismo problema.

**Segundo aviso, sin resolver.** E-ENCAJE-REAL sigue dando **1,206 a 1,223** dentro del tramo
compuesto, en cinco combinaciones aire × datos. Y eso choca de frente con los píxeles:

- Renderizado `--hero portatil` en **`tecnico`** y en **`nocturno`** (una de las que acusa), 8 cuadros
  abiertos entre el 35% y el 88% del tramo: **la notebook entra entera y con margen visible**. Nada
  cortado, ni pantalla ni carcasa.
- Ampliar la ventana de 0.88 a 0.92 **subió** los cuadros en falta (39 → 43), o sea que el tramo sí se
  está aplicando y el desborde está *adentro*, no en la salida.

**Dos hipótesis probadas y descartadas:**

1. *La caja alineada a los ejes exagera con una malla inclinada.* La sonda la respalda —`giro 24°`, y
   su propia ayuda dice "si `giro` es alto… el número exagera"—. Se reescribió `entraEntera` para
   proyectar la caja **local orientada** en vez de la envolvente del mundo: **los números salieron
   idénticos** hasta el tercer decimal. Revertido, porque un arreglo que no mueve la medición no se
   queda.
2. *Es el gesto de salida.* La sonda marca el peor caso en `t = 1.00`, pero el tramo ya lo excluye y
   el desborde persiste adentro.

**Y el eje SÍ se aisló, que es lo que deja el hilo listo para cerrar.** Instrumentando `entraEntera`
para imprimir los dos ejes por separado (`ENCUADRE_EJES=1`, ya revertido):

```
EJE x=0.181 y=1.059      EJE x=0.223 y=1.045      EJE x=0.304 y=1.084
EJE x=0.188 y=1.019      EJE x=0.277 y=1.029      EJE x=1.015 y=0.554
```

**El desborde es vertical y chico: entre 2% y 8%.** En ancho la malla va holgadísima —0,18 a 0,30 de
un límite de 1,0—. Eso descarta de plano que la pantalla sea demasiado ancha, que era la lectura
natural del "1,22" y la que habría llevado a achicarla.

Y encaja con la geometría: la pantalla cuelga de un `pivote` que la inclina 24° en **profundidad**. La
envolvente alineada a los ejes de un plano inclinado tiene PROFUNDIDAD, y al proyectarla en
perspectiva su esquina inferior *cercana* cae más abajo que el borde real del plano. Un 2-8% es
exactamente el orden de magnitud de ese error a 24°.

**Y la hipótesis de la caja quedó MUERTA con evidencia, no descartada por sospecha.** Instrumentando
`entraEntera` para imprimir las dos cajas sobre la misma malla y el mismo instante:

```
2CAJAS alineada y=1.019  orientada y=1.019  (x 0.188 / 0.188)  localZ=0.000
2CAJAS alineada y=1.084  orientada y=1.084  (x 0.304 / 0.304)  localZ=0.000
```

Idénticas hasta el tercer decimal, y `localZ=0.000`: la geometría del plano no tiene profundidad
propia, así que las dos cajas describen lo mismo. El intento anterior no tenía un bug — la hipótesis
era falsa.

**Y del lado de los píxeles el caso también quedó cerrado.** Detectando el equipo por su COLOR (azul
`#15171c` y aluminio `#8b919c`, para no confundirlo con la cuña del fondo, que ya arruinó dos
mediciones antes) sobre los 105 cuadros del tramo:

| | |
|---|---|
| borde superior más alto | y = **357** |
| borde inferior más bajo | y = **1884** de 1920 |
| margen mínimo | **357 px arriba, 36 px abajo** |

**La notebook no sale del cuadro en ningún cuadro del tramo.** La compuerta afirma que la pantalla
llega a 1,084, o sea 161 px afuera — y la pantalla es la parte de ARRIBA del equipo, cuyo margen
superior nunca baja de 357 px.

**Estado: sin clasificar, y el pendiente ya no es de la escena sino de la compuerta.** Lo que hay que
averiguar es por qué la `y` proyectada de `pantalla` en `entraEntera` no se corresponde con dónde esa
malla aparece en el render. Las tres explicaciones fáciles están descartadas con medición: no es el
ancho, no es la caja, y no es que la escena corte algo.

## 2026-08-11 — de 29 a 22, y lo que queda NO es trabajo pendiente

Tres bajadas, cada una con su razón, y ninguna consistió en declarar por declarar:

| escena | de | a | qué pasó |
|---|---|---|---|
| `destello` | 6 | **0** | cuatro capas se pudieron declarar por fin; las dos mitades del hero tenían la rama positiva del `if (tocaLaMarca)` escrita y la negativa no |
| `portatil` | 1 | **0** | `sangra`, con el costo medido sobre píxeles |

**Y en el camino apareció un defecto real que estaba escondido detrás de un número viejo.** La cabecera
de la fábrica `capa` de `destello` justificaba no declarar diciendo *"la etiqueta llega a 1.082 y el
caption a 1.064"*. Ese número se tomó **antes** de que `encuadre-check` aprendiera a saltear las mallas
apagadas por su shader: el golpe de cámara de esa escena dura UN cuadro y cae durante el flash, cuando
esas capas no dibujan un píxel. La compuerta las acusaba de salirse de un cuadro en el que no estaban.
Con eso corregido y las cuatro declaradas, quedó a la vista **la que sí se salía**: el titular `L1`,
dimensionado en `mundoW * 0.945` contra el cuadro **en reposo**, llegaba a 1.086 en tres aires. Ahora
se mide contra `cuadroMasAngosto`, igual que `mesa` y `columna`.

### Las 22 que quedan, y por qué ninguna es una tarea

- **`tarjetas` 20 — la pregunta reservada.** Su cámara "a su máximo agranda el cuadro cerca del doble",
  así que en esa escena *ninguna* malla puede prometer contención en todo instante: no por cómo está
  compuesta sino por cómo se filma. Es una decisión de producto y está parkeada.
- **`telefono` 1 — parkeada en `docs/AUDITORIA-MOTOR.md`**, que es de Thiago. El trabajo caro ya está
  hecho: separar cuánto del exceso es gesto y cuánto es encuadre — 3.122 gesto, 1.031 encuadre.
- **`tipografia` 1 — límite documentado de `encajaEntre`.** La ventana legible de esa frase mide el 2%
  de la escena contra un guardarraíl que exige 25%, y el guardarraíl tiene razón: si no, cualquiera
  declara una rendija y esquiva el chequeo.

**O sea que 22 es el piso de lo que se puede clasificar sin tomar decisiones que son de otro.**
