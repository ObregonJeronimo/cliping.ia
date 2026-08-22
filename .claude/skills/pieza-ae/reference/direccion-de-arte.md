# Dirección de arte de una pieza — se decide ANTES, no se descubre después

## Contenido
- Por qué existe este archivo
- Las huellas dactilares que hay que evitar (medidas sobre mi propia pieza)
- El paso obligatorio: la ficha de arte
- Las seis familias, con valores concretos
- Forma: el rectángulo recto es el defecto por defecto
- Luz: el resplandor es luz, no son líneas
- Profundidad: ocho paneles iguales no son profundidad
- Tipografía: una jerarquía, no un peso
- Color: cuántos, cuáles y dónde
- Lista de control con criterios comprobables

---

## Por qué existe este archivo

La PIEZA-C sacó **7/7 en ritmo** y **ESCENA OK**, y el usuario la describió como "una decepción
total". Las dos compuertas medían lo que sabían medir —que hubiera coreografía, y que el movimiento
llegara a la pantalla— y las dos tenían razón. Lo que no medía nadie es si valía la pena mirar lo que
se movía.

El diagnóstico, dicho sin adornos: **le puse coreografía a elementos que no valen la pena mirar.**

El catálogo ya tenía las herramientas. `F06 · ECUALIZADOR` está anotado como *"el antídoto directo
contra 'está muerto'"* y `F14 · NINE-SLICE` como *"el primer defecto que aparece"* — o sea, los
rectángulos de esquina dura. Usé **cero de las catorce técnicas de formas**. El conocimiento estaba;
lo que faltaba era el procedimiento que obliga a pasar por él.

---

## Las huellas dactilares que hay que evitar

Un modelo sin restricciones converge siempre a la misma pieza. Estas son las huellas **medidas sobre
mi propia salida**, no una lista teórica:

| huella | cómo se ve en la PIEZA-C | qué la produce |
|---|---|---|
| **gris sobre negro** | fondo `#0b0c10`, paneles `#232833`: contraste 1,4:1 | elegir "sobrio" en vez de elegir una paleta |
| **todo rectángulo recto** | 30 sólidos, radio 0, sin un solo borde tratado | los sólidos de AE nacen así y no se los toca |
| **el acento es una línea** | tres barras finas de color y nada más | el color entra como adorno, no como material |
| **una sola familia y un solo peso** | Arial Black para todo lo que importa | no elegir tipografía es elegir la de siempre |
| **paneles del mismo tamaño** | nube de ocho paneles de 300×190 idénticos | repetir en vez de jerarquizar |
| **el cuadro medio vacío** | negro en más de la mitad del área, planos 1 y 3 | componer alrededor de un objeto y no del cuadro |
| **nada que recordar** | ni marca, ni símbolo, ni un objeto que vuelva | la pieza es una lista de datos, no un relato |

**Regla:** si al terminar una pieza tres o más de estas descripciones le calzan, no está terminada.

---

## El paso obligatorio: la ficha de arte

**Antes de la primera clave**, se escribe al principio del `.jsx` una ficha con valores concretos. No
es documentación: es la restricción que impide converger a lo de siempre.

```js
// ---------------------------------------------------------------- FICHA DE ARTE
// FAMILIA      cinematica-oscura
// PALETA       fondo #070912 · lejos #101a33 · cerca #1b2b52 · tinta #f5f3ee
//              acento #ff5a2b (calido) · apoyo #38d9ff (frio) — DOS acentos, no tres
// LUZ          un solo foco desde arriba-izquierda. Todo lo que brilla es de la familia del acento.
// FORMA        radio 18 px en todo panel; barras con punta redonda; borde de 1 px al 12% de la tinta
// TIPOGRAFIA   titular Arial-Black 128 / bajada ArialMT 46 / dato Arial-Black 72 / etiqueta ArialMT 28
//              escala 1,7x entre niveles; el dato pesa MAS que el titular
// PROFUNDIDAD  tres planos con escala aparente 1 : 0,55 : 0,3. Nada del mismo tamaño que otra cosa.
// SIMBOLO      el anillo: aparece en el 0, cierra en el 360, y en el medio mide.
```

**Cada línea de esa ficha tiene que poder señalarse en un cuadro del video.** Una ficha que no se
puede verificar mirando es una declaración de intenciones, y esas no cambian nada.

---

## Las seis familias, con valores concretos

Elegir **una** y no mezclar. Los hex son puntos de partida verificados por contraste, no dogma.

### 1. Cinemática oscura — *la del video de referencia*
Gradientes profundos, tipografía sobredimensionada, movimiento al frente.
```
fondo    #070912   plano lejano #101a33   plano cercano #1b2b52
tinta    #f5f3ee   secundaria   #8a96b8
acento   #ff5a2b   apoyo        #38d9ff
```
- El fondo **no es plano**: va de `#070912` a `#101a33` en diagonal. Un fondo liso es lo que hace que
  todo lo demás se vea pegado.
- Titular ≥ 110 px sobre 1080 de alto. Si el titular entra cómodo, es chico.
- El resplandor es la fuente de luz de la escena, no una decoración de una barra.

### 2. Editorial clara
Neutros cálidos, mucho aire, una sola familia con dos pesos.
```
fondo #f7f4ee   panel #ffffff   tinta #1a1a18   secundaria #6b6560   acento #c8452a
```
- El aire ES el diseño: márgenes de 12% del ancho, mínimo.
- Sin resplandor. La luz acá es el papel.

### 3. Terminal
Monoespaciada, fósforo sobre negro, reglas finas.
```
fondo #0a0e0a   tinta #c8f5c8   acento #39ff88   apagado #2a4a2a
```
- Todo alineado a una grilla de caracteres. Nada centrado.
- El movimiento es escalonado y seco (C7, cortes), nunca suave.

### 4. Bloque saturado
Un solo color plano dominando el cuadro, tipografía enorme, cero degradado.
```
fondo #1b2ff0   tinta #ffffff   contra #ffe600   negro #06060a
```
- El fondo cambia de color en los cortes: **X02 · TAPA VISIBLE** es la transición nativa de esta familia.
- Sin profundidad falsa: es 2D a propósito.

### 5. Vidrio
Translucidez, desenfoque, degradados suaves, bordes de 1 px muy claros.
```
fondo #0d1220 -> #1e2a4a   panel rgba(255,255,255,0.06)   borde rgba(255,255,255,0.14)
tinta #eef2ff   acento #7c9dff
```
- **Ojo:** el desenfoque por capa (B1) todavía no está construido. Sin él esta familia queda a medias
  — se puede simular con un panel muy claro a baja opacidad, y hay que decir que es una simulación.

### 6. Dato denso
La cifra es la protagonista, tipografía condensada, paleta de tres tonos y un acento.
```
fondo #12141a   panel #1c2029   grilla #262c38   tinta #f0f2f5   acento #ffd23f
```
- Las cifras ocupan **más** que los títulos. `D06 · JERARQUÍA DE ESCALAS` con el dato arriba de todo.
- Es la familia natural para una pieza de producto con métricas.

---

## Forma: el rectángulo recto es el defecto por defecto

Un `addSolid` de AE es un rectángulo de esquina dura. Dejarlo así es no haber tomado ninguna decisión.

**Obligatorio en toda pieza:**
- **Radio.** Todo panel lleva esquina redondeada. La técnica es `F14 · NINE-SLICE` (catálogo
  `02-formas.md`): un panel redondeado que cambia de tamaño sin deformar el radio. Es la primera
  entrada que hay que leer y la que más cambia el resultado por línea escrita.
- **Punta redonda en las barras.** `F02 · BARRA QUE SE LLENA CON PUNTA REDONDA`. Una barra de punta
  cuadrada se lee como un rectángulo escalado, que es lo que es.
- **Borde o no-borde, decidido.** Un borde de 1 px al 10–15% de la tinta separa un panel del fondo sin
  agregar contraste de área. Si no hay borde, tiene que haber sombra de contacto (`C14`).
- **Sombra de contacto** en todo lo que flote sobre otra cosa. `C14 · SOMBRA DE CONTACTO` trae las
  cuentas escritas. Sin ella, dos planos a distinta profundidad se ven como dos rectángulos pegados.

**Contraste mínimo entre un panel y lo que tiene detrás: 1,8:1.** Medido en luminancia relativa sobre
el hex, nunca sobre `.r/.g/.b` de un `THREE.Color` (ver CLAUDE.md: vienen en lineal). La PIEZA-C tenía
**1,4:1** y las tarjetas existían sin verse.

---

## La trampa que aparece justo cuando el arte mejora

**El revelado por tapa invisible y un fondo con degradado son incompatibles**, y la incompatibilidad
aparece exactamente cuando uno arregla el fondo.

La tapa esconde el texto tras un rectángulo *del color del fondo*. Con un fondo negro plano es
invisible y el gesto se lee como un revelado. En cuanto el fondo pasa a tener degradado, foco y viñeta
—o sea, en cuanto deja de ser pobre— ese rectángulo plano ya no coincide con nada: se ve un recuadro
oscuro que aparece **antes** del texto y desaparece después. Es un defecto que el usuario detecta en la
primera pasada y que ninguna compuerta actual mide.

El catálogo lo tiene escrito como límite de la familia, bajo F03: *"fondo plano. Sobre imagen o
degradado → B4"*. B4 es el recorte polar y **no está construido**.

**La salida no es esconder mejor, es dejar de esconder.** `X02 · TAPA VISIBLE` — un bloque de color de
marca que se retrae y va destapando el texto — está anotado en el catálogo como *"funciona sobre
cualquier fondo"*. Se ve a propósito, no depende del fondo y se lee más caro.

Receta: el bloque va **anclado en su borde derecho** y escala en X de 100 a 0 con C3 (12–16 cuadros).
Al recogerse hacia la derecha, el texto aparece de izquierda a derecha, que es como se lee. El bloque
tiene que cubrir la tinta en su posición escondida **y** en la final: la cuenta va contra la tinta, no
contra el cuerpo.

**Regla general:** cualquier técnica cuya receta diga "del color del fondo" deja de funcionar en cuanto
el fondo tiene textura. Al elegir la familia estética, revisar qué técnicas del guion dependen de un
fondo plano.

## Luz: el resplandor es luz, no son líneas

En la PIEZA-C el resplandor estaba aplicado a tres barras finas. Eso no ilumina nada: hace tres líneas
de neón sobre negro.

- **Una sola fuente por plano.** Decidir de dónde viene la luz y que todo lo que brilla sea coherente
  con eso.
- **El objeto que brilla tiene que tener área.** Un panel con un borde encendido, una cifra grande, un
  anillo. Una línea de 5 px de alto no ilumina.
- **El fondo recibe la luz.** Si algo brilla y el fondo detrás sigue igual, el brillo se lee como un
  sticker. Un plano de fondo con un degradado que responde al foco cuesta una capa.
- **Umbral:** el resplandor se compara contra la luminancia **en lineal**, y el rojo y el cian no dan
  lo mismo. `#f24026` da 0,226 y `#26bdf2` da 0,417: con umbral 0,35 el rojo no desborda y sale plano.
  Cada capa declara el suyo en su comentario (`brillo <fuerza> <radio> <umbral>`).

---

## Profundidad: ocho paneles iguales no son profundidad

`C11 · MULTIPLANO` y `C13 · ESCALONADO EN PROFUNDIDAD` están en el catálogo (`04-espacio-3d.md`), y
`C13` está marcado como **la mejor relación resultado/costo de todo el frente 3D**.

- **Tres planos, con escala aparente distinta**: 1 : 0,55 : 0,3. Si dos cosas se ven del mismo tamaño,
  están en el mismo plano aunque tengan Z distinta.
- **Nada del mismo tamaño que otra cosa.** Una nube de ocho paneles idénticos se lee como un patrón,
  no como espacio. Que varíen al menos 1,5× entre el mayor y el menor.
- **El fondo hace paralaje.** Está medido: es lo único que puede acompañar a un elemento de pantalla
  completa sin que la dominancia se dispare (ver `ritmo.mjs`, M3).
- Las leyes duras del motor (nadie cruza a nadie en Z, la tapa va delante de su texto y detrás de todo
  lo demás) están en `docs/AE-MCP/00-CUADERNO.md`, partes XVI y anteriores.

---

## Tipografía: las que viajan, medidas

**No se elige una tipografía sin medirla.** AE acepta cualquier nombre PostScript y lo devuelve tal
cual aunque no tenga la fuente: sustituye por la de reserva y lo informa como éxito. La única prueba es
comparar la caja de AE contra la del navegador (`node tools/ae/pieza.mjs FUENTES --comparar --rapido`).

Medido en esta máquina, sobre la misma cadena y el mismo cuerpo:

| PostScript | desvío | rol |
|---|---|---|
| `CenturyGothic` | **0,20%** | display / titulares — geométrica, la más distinta de la de siempre |
| `SegoeUI` | **0,24%** | etiquetas, rótulos |
| `SegoeUI-Light` | **0,28%** | lectura, bajadas |
| `FranklinGothic-Medium` | **0,32%** | cifras y datos — gótica estrecha |
| ~~`BahnschriftCondensed`~~ | 10,73% | no viaja |
| ~~`SegoeUI-Black`~~ | 18,28% | no viaja |
| ~~`CascadiaMono`~~ | 29,38% | no viaja |
| ~~`SegoeUI-Semibold`~~ | **55,79%** | no viaja |
| ~~`Bahnschrift`~~ | **80,82%** | no viaja |
| ~~`BahnschriftSemiBoldCondensed`~~ | **102,85%** | no viaja |

**Las que fallan son casi todas variantes de peso o de ancho que en Windows viven como familia
aparte.** El traductor del documento convierte `SegoeUI-Semibold` en familia "Segoe UI" + peso 600, y
el navegador no resuelve eso a la misma fuente que usó AE.

**Y una trampa más fina:** `Bahnschrift-Light` y `Bahnschrift-SemiBold` dan **el mismo ancho** en el
navegador. Coinciden con AE porque en AE también miden casi igual — o sea que la compuerta de
tipografía, que compara ancho contra ancho, **es ciega al peso**. Un ancho que coincide no prueba que
el peso se haya aplicado.

**De ahí sale la regla de autoría: la jerarquía se construye con TAMAÑO y COLOR, no con peso.** Cuatro
familias para cuatro roles, cada una en su peso nativo, es más seguro y se lee mejor que una familia en
cuatro pesos.

## Cómo se construye esa jerarquía

- **Cuatro niveles como máximo**, con razón ≥ 1,6 entre niveles consecutivos. Ejemplo sobre 1080:
  dato 112 / titular 72 / bajada 40 / etiqueta 26.
- **El dato pesa más que el titular** en una pieza de producto. Si la cifra es el argumento, la cifra
  es lo más grande del cuadro.
- **Dos familias como máximo**, y que se distingan de verdad (una con carácter para titulares, una
  neutra para lectura). Una sola familia en dos pesos también funciona; una sola familia en un peso, no.
- **Alineación decidida**: todo centrado es la opción por defecto y se nota. Un eje a la izquierda con
  una regla vertical da estructura y cuesta una capa.
- Con tracking distinto de cero, el texto va alineado a la izquierda (LEY 3 del reproductor).
- El texto se queda inmóvil **1 segundo por cada 13 caracteres**. No es estilo: es tiempo de lectura.

---

## Color: cuántos, cuáles y dónde

- **Dos acentos como máximo**, uno cálido y uno frío, y que no compitan: uno manda y el otro apoya en
  proporción ~4:1 de área.
- **El acento no es para líneas decorativas.** Va en lo que hay que mirar: la cifra que importa, el
  objeto que llega, el borde que se enciende.
- **Tres tonos de fondo** (lejos, medio, cerca) en vez de uno: es lo que hace que el espacio se lea
  como espacio.
- **La aritmética reemplaza renders para descartar.** El contraste de un texto sobre un fondo se
  calcula con un `node -e`; confirmar sigue exigiendo abrir el cuadro. **Medir sobre el hex.**

---

## Lista de control con criterios comprobables

No se marca ninguna casilla "a ojo": cada una dice cómo se comprueba.

```
DIRECCION DE ARTE
- [ ] Hay una FICHA DE ARTE escrita arriba del .jsx, con familia, paleta, luz, forma, tipografia,
      profundidad y simbolo.                                    -> se lee el archivo
- [ ] Cada linea de la ficha se puede señalar en un cuadro.     -> abrir 3 cuadros y señalarla
- [ ] Ningun panel tiene radio 0.                               -> grep de F14/nine-slice en el .jsx
- [ ] Contraste panel/fondo >= 1,8:1.                           -> calcular sobre los hex
- [ ] Hay >= 2 tamaños de titulo con razon >= 1,6.              -> se leen los fontSize del .jsx
- [ ] El elemento que brilla tiene area, no es una linea.       -> alto >= 40 px de la capa que brilla
- [ ] Los tres planos tienen escala aparente distinta (1 / 0,55 / 0,3).
                                                                -> medir el area proyectada
- [ ] Hay un simbolo o un objeto que aparece al menos dos veces.-> se nombra cual y en que cuadros
- [ ] Menos de tres huellas de la tabla de arriba le calzan.    -> leerlas una por una
```

**Y el limite honesto de todo esto:** ninguna compuerta automatica dice si algo se ve BIEN. `ritmo.mjs`
dice si hay coreografia, `escena-check.mjs` dice si el movimiento llega a la pantalla, y esta lista
dice si se tomaron decisiones de arte. **Que esas decisiones sean buenas lo dice el ojo del usuario, y
por eso se le muestra temprano y en cuadros completos, no al final y en una tira reescalada.**
