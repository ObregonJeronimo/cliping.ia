# Auditoria del MOTOR 3D

**Como se cuenta.** Una fila `- [ ] **archivo:linea**` es UN hallazgo y se cuenta. Una fila que
empieza con `- SEGUIMIENTO` NO es un hallazgo: es una nota sobre el estado de otro, y no se cuenta.

**Y EL TOTAL NO SE ESCRIBE, SE CALCULA:** `node tools/auditoria-conteo.mjs`. Ademas del total da el
desglose, que es lo que hace falta para contestar 'cuanto falta': mas de la mitad de los abiertos son
objeciones de los criticos al PLAN de la auditoria, compuertas propuestas y los dos temas EXTRA.
La distincion existe porque el contador ya mintio una vez — se tildaron 6 casillas para 5 trabajos,
porque una nota de seguimiento tenia el mismo formato que un hallazgo y se sumo aparte.

# Auditoría del MOTOR 3D — plan de trabajo

Salida de una auditoría de 12 agentes sobre el motor entero (lectura, no render), disparada por
una observación del dueño: *"de 5 videos, 2 salían con errores y 3 salían dentro de todo bien,
siento que el motor es impredecible e inestable"*.

**Cómo usar este documento:** cada hallazgo tiene una casilla. Se marca cuando está arreglado *y*
verificado. Los que se cierren sin arreglar (falsos positivos, decisiones deliberadas) se marcan
igual y se anota el motivo en la línea de abajo.

| | |
|---|---|
| Hallazgos únicos | **76** (76 crudos, 0 duplicados entre lectores) |
| Rompen la pieza | **20** |
| Se notan | **38** |
| Menores | **18** |
| Sin ninguna compuerta que los cace | **57 de 76** |

### Archivos con más hallazgos

- `render3d/demo/kit.js` — 7
- `render3d/demo/guion.js` — 6
- `render3d/demo/verificar.mjs` — 5
- `render3d/demo/heroes/mosaico.js` — 4
- `tools/guion-check.mjs` — 4
- `tools/encuadre-check.mjs` — 4
- `render3d/demo/heroes/portatil.js` — 3
- `render3d/demo/heroes/vitrina.js` — 3
- `render3d/demo/escenas/tipografia.js` — 3
- `render3d/demo/escenas/toro.js` — 3
- `render3d/demo/escenas/tarjetas.js` — 3
- `render3d/demo/escenas/cierre.js` — 3

---

## El diagnóstico

## 1. La hipótesis se sostiene, y el patrón tiene nombre

**Cada malla se dimensiona por un solo eje contra una constante propia, y nadie mide el resultado contra el cuadro.** No es una metáfora: de los ~46 hallazgos de los ocho lectores, **30 son literalmente esa frase en 26 archivos distintos**. Los otros 16 se agrupan en cuatro familias chicas y separables (shader propio sin matriz UV, ramas de fondo muertas, el mostrador de frases, `marquesina` sin requisito).

Los dos reclamos textuales de Thiago caen exactos adentro del patrón. "Imágenes muy apretadas" = `mesa.js:78` (clampea la fracción visible pero no corrige el plano: una tarjeta 1400×845 sale estirada 2.5× a lo alto), `portatil.js:142` (18.9×), `titular.js:130`. "Textos tan grandes que se cortan a los costados" = `tarjetas.js:191` (marca de 23 letras → 143% del ancho), `cierre.js:273`, `rafaga.js:210`, `tipografia.js:234`.

Y el reverso del mismo patrón explica el "3 de 5 salen bien": donde sí hay tope, no hay **piso**. `encaje()` (kit.js:968) resuelve el desborde achicando sin límite inferior, así que el cuerpo tipográfico de nueve escenas es una función inversa del largo del copy: gancho 169→84 px, partida 119→33, `sello` con una marca larga a 29 px cuando el hero de al lado declara `ALTO_MIN = 0.55` por escrito (apertura.js:459). La pieza no falla: se degrada monótonamente con el contenido. Contenido promedio → medio del rango → sale bien. Contenido en el extremo → revienta. Eso es exactamente la sensación de "impredecible".

## 2. La causa estructural: tres decisiones

**(a) El kit da vocabulario de dibujo, no de encaje.** Verificado con grep: `topeNitido` (kit.js:146) tiene un comentario que dice "vive acá y lo usan todas" y lo importa **un solo archivo** (columna.js:134) de los **siete** que llaman a `planoRecorte`. `encaje()` es de un eje y sin piso, así que **siete** composiciones se escribieron su propio *contain* al lado — y `contraste.js:58` llegó a pisar el nombre importado con otra firma. Cuando siete autores descartan la función compartida, el vocabulario está permitiendo equivocarse.

**(b) La unidad de composición es la malla, no el cuadro, y declararse es opcional.** `userData.encaja` aparece **13 veces en 21 escenas y cero veces en los 18 heroes**. Todo lo no declarado cae en el heurístico de `verificar.mjs:404-411`, que se queda con **una** malla (la más alta) y le tolera `mundoW * 2.2` de ancho: un titular ancho y bajo —la forma típica del texto que se corta— nunca llega a ser `peor`, y su ancho jamás se mide.

**(c) Las compuertas barren 11 aires × 1 contenido.** ANTHEM es el mejor caso (frases de 4 a 19 caracteres) y la "página pobre" es el vacío. El eje que rompe el motor —largo del texto, resolución del recorte, proporción de la imagen, semilla, polaridad— no está barrido. Y hay agujeros concretos: `tejidoFalso` genera texturas de 64 px de alto (columna nunca se construye a tamaño real, 3-18× de diferencia) y **siempre** inyecta tira (la rama de respaldo de `mesa` no se construye jamás); `verificar.mjs:315` prueba las marcas largas con `datos: []`, que apaga `tarjetas` justo en el gate que la necesitaba; ninguna compuerta arma un hero en mundo claro. **Están verdes porque miden el único contenido que no las rompe.**

## 3. El plan

**Paso 0 — hoy, riesgo cero.** `kit.js:1554, 1587, 1621, 1657, 1702`: cinco `} else if` duplicados con cuerpo vacío que se comen el rango y dejan el cuerpo real como código muerto. Verificado leyendo el archivo. Cinco fondos de 27 (roseta, celosía, costura, espigas, engranaje) salen como cuadro liso en 11 aires, según la semilla — la misma página da textura o no la da. Entró con HEAD. Se borran cinco líneas.

**Paso 1 — la compuerta, antes de tocar una escena.** Barrido de **contenido**, no de aire: marcas de 1/2/14/26/32 caracteres, claims de 20/40/84, frases largas y cortas, cifras con unidad, dominio de 4 y de 37, testimonio con URL, recortes de 120×50 / 1400×845 / 864×960 / 720×8192, 10 semillas, polaridad clara y oscura, y **con `datos` completos**. Encima, cuatro aserciones:
- **E-CONTENCIÓN-TOTAL**: todo vértice de toda malla visible dentro del clip, sin opt-in, muestreado por beat y en los overshoots (hoy se mide un solo instante, 0.72). Mata: cierre:240, tarjetas:191, destello:169, toro:356/397, rafaga:210, prisma:35, gota:130, brote:180, cierre:273, tipografia:234.
- **E-CUERPO-MÍNIMO**: altura de mayúscula ≥ ~30 px de 1920. Mata todo lo que `encaje` achica hasta ilegible (sello, hero, cita, gancho, titular, lista, marquesina, partida).
- **E-NITIDEZ**: ancho dibujado en px / `img.width` ≤ 1.4. Mata vitrina:71 (3.4×), mosaico:103 (5.8×) y :123 (8.1×), cubo:108 (4.3×), contraste:58. Se caza sin renderizar, como pide CLAUDE.md.
- **E-PROPORCIÓN**: ar del plano vs. ar de la porción de textura, ±2%. Mata `mesa:78` y `portatil:142` de un saque — el defecto que ya costó `pantalla` dos veces.

Esto no arregla nada: pone en rojo 20-30 sitios y entrega la lista real, medida. Riesgo sobre el producto: cero.

**Paso 2 — el vocabulario.** `caber(alto, ar, anchoUtil, altoMax, {pisoPx})` en el kit: dos ejes, con piso y techo. `planoRecorte` aplica `topeNitido` por dentro. Migrar los ~30 sitios en tandas chicas, con el barrido del paso 1 como criterio de aceptación; se borran los siete *contain* caseros. Riesgo medio (cambia composiciones que hoy se ven bien) — por eso va después, para que la compuerta diga cuál cambió.

**Paso 3 — lo que ninguna compuerta de encuadre puede ver.** `portatil.js:142` (shader propio que nunca aplica `uvTransform`: página aplastada 18.9× *y* los cinco saltos de scroll animan un valor que nadie lee); `marquesina` sin clave en REQUISITOS —verificado: 19 claves para 20 escenas—, entra siempre y se declara vacía: 2.9-4.2 s de fondo pelado; el pozo de frases (`datos.js:196` devuelve repetidos en vez de menos, `repetidas` se exporta y no lo lee nadie, y el golpe se descuenta del pozo pero `guion.js:320` lo cuenta: 42% de las piezas de stripe con una frase repetida en dos escenas).

## 4. Lo que NO hay que hacer

- **`titular.js:185` no es el defecto**, es el síntoma. La rama inalcanzable prueba que el autor esperaba fotos verticales; borrarla no tapa el hueco de 363 px que produce la línea 130.
- **`pantalla.js:79` y `kit.js:996` son caminos muertos.** Deuda de coherencia. No gastar riesgo ahí.
- **`pulso`, `biela` y `calibre` no son defectos**: entran con los 11 aires y 10 semillas. Son riesgo latente, y lo cubre el paso 1, no una reescritura.
- **No calibrar el heurístico de `verificar.mjs:410`.** Es estructuralmente incorrecto (una malla, la más alta, y se mide su ancho). Se reemplaza, no se afloja ni se aprieta.
- **No unificar los márgenes vía `marco()`.** El X/Y que devuelve no lo lee nadie, pero los anchos útiles van de 0.56 a 1.10 de `mundoW` y varios están puestos a propósito. Unificarlos a ciegas re-encuadra 20 escenas para arreglar cero defectos medidos.
- **No tocar `mosaico:259/278` ni `ventana:388` antes del paso 1**: son defectos de movimiento, compiten por el mismo ojo y el mismo riesgo.

---

## Hallazgos

## Rompen la pieza (20)

- [x] **render3d/demo/heroes/portatil.js:142**
  - ✅ **HECHO** — e28eacd — matriz de textura a mano: uRep/uOff apuntando a los Vector2 propios de la textura. Arregla el aplastamiento de 7-19x Y revive el scroll, que animaba un valor que nadie leia.
  - **Síntoma:** La página ENTERA se dibuja dentro de la pantalla de la notebook. El plano mide pw/ph = (ANCHO*0.935)/(ALTO_P*0.90) = 1.6622 de proporción y la textura trae 720/8192 = 0.0879: la página sale APLASTADA 18.9 veces a lo alto (3.6 veces con una tira de 1560). No se lee una sola palabra, es una textura de ruido gris con franjas de color. Y el scroll tampoco existe: los 5 saltos de las líneas 213-220 (`t
  - **Lo dispara:** CUALQUIER página cuya tira supere la pantalla del portátil, o sea todas. Medido sobre los 7 tira.png reales del repo (tools/out/motor/*/tira.png): 4 son 720x8192 (linear, stripe, basecamp, duolingo) y 3 son 720x1560. El shader es propio y NUNCA aplica la matriz de textura: las líneas 123-124 (`tira.
  - **Compuerta:** NINGUNA, y está dicho por qué en render3d/demo/verificar.mjs:87-89: «Los heroes solo leen image.width/height para decidir la composicion, asi que un canvas de 4 px alcanza... lo que se esta probando es la GEOMETRIA de la grilla, no los pixeles». Este
  - `vec3 c = texture2D(map, vUv).rgb;`

- [x] **render3d/demo/heroes/vitrina.js:71**
  - **Síntoma:** El logo de stripe (120 px de ancho) se dibuja a 605 px: 5.0x su resolución. El de linear, 3.4x. El de ghost, 2.9x. Sale con los bordes deshechos y las curvas escalonadas — y es LO ÚNICO que hay en el cuadro, centrado sobre un pedestal, quieto, durante los 8 beats enteros de la escena, con la cámara además acercándose (línea 360-361). Es el hero donde más se mira el defecto y el que menos lo tolera
  - **Lo dispara:** Un logo de pocos píxeles, que es lo normal: medidos los PNG reales de tools/fixtures/director/elementos/, stripe-com__el0-logo.png son 120x50, linear-app__el0-logo.png 176x44, ghost-org__el0-logo.png 211x69. El alto se elige por el lado que limita (correcto para la proporción) pero NADA mira la reso
  - **Compuerta:** Ninguna. Pero el instrumento YA EXISTE y no se usa: kit.js:146 `topeNitido(img, W, mundoW, mag = 1.4)`, escrito exactamente para esto («el logo de linear.app se captura con 176 px de ancho y `columna` lo mostraba ocupando 624 px del cuadro — TRES VEC
  - `const altoLogo = Math.min(ALTO_MAX, ANCHO_MAX / ar)`

- [x] **render3d/demo/heroes/mosaico.js:123**
  - **Síntoma:** Con stripe-com__el0-logo.png (120x50, ar 2.40): altoBanda = min(8*0.46, 5.34/2.40) = 2.2266, alto = 2.1153, ancho = 5.077 unidades = 975 px de cuadro. Un PNG de 120x50 estirado a 975x406 — 8.1x su resolución — cruzando la parte de arriba del cuadro durante seis beats. Con linear (176x44) da 5.5x y con tailwind (317x40) 3.1x. Es peor que el defecto de `columna` que ya se arregló (3.5x). Las celdas 
  - **Lo dispara:** Que la pieza destacada (`piezas[0]`, la banda ancha de arriba) sea un logo chico. ROLES pone 'logo' primero (línea 32), así que es el caso por defecto en toda página que dé logo. Para la banda, `anchoCelda` es ANCHO_UTIL = mundoW entero (línea 120), sin ningún tope por resolución.
  - **Compuerta:** Ninguna. Mismo caso que vitrina: `topeNitido` existe en kit.js:146 y mosaico.js no lo importa (su import de la línea 21 no lo incluye). Ninguna compuerta abre los píxeles de un recorte.
  - `const hPorAncho = (anchoCelda * AIRE) / Math.max(0.05, p.ar)`

- [x] **render3d/demo/escenas/titular.js:130 (y 133)**
  - **Síntoma:** La foto queda CENTRADA en la banda, no anclada arriba: medido, con 16:9 y 1 renglon quedan 3.78 de hueco repartido, o sea 363 px de fondo pelado en el borde SUPERIOR del cuadro y otros 363 px entre el pie de la foto y la barra de acento. La barra y el titular se dibujan en BANDA_Y (el pie de la BANDA, no el de la foto), asi que el titular flota despegado de la imagen en la que se supone que se apo
  - **Lo dispara:** Cualquier foto APAISADA. La banda mide BANDA_H (7.00 / 6.00 / 5.00 segun cuantos renglones tenga el titular) y el alto de la foto sale de ANCHO_FOTO/arFoto = 5.7375/arFoto. En cuanto arFoto > 5.7375/BANDA_H (0.82 con 1 renglon, 0.96 con 2, 1.15 con 3) la foto es MAS BAJA que su banda. Un hero 16:9 c
  - **Compuerta:** NINGUNA. Un hueco de fondo no es ni desborde ni pieza fuera de cuadro, asi que E-ENCAJE y E-ENCUADRE no aplican. Y encuadre-check no puede verlo ni por casualidad: su fixture (tools/encuadre-check.mjs:180) entrega rol 'foto' -> 'f2', que tejidoFalso 
  - `new THREE.PlaneGeometry(ANCHO_FOTO, Math.min(BANDA_H, altoNativo)) // ... foto.position.set(0, FOTO_Y, -0.2) con FOTO_Y = mundoH * 0.5 - BANDA_H / 2`

- [x] **render3d/demo/escenas/rafaga.js:210-212 contra el contrato declarado en 144-148**
  - **Síntoma:** Con el plano ya a ancho completo, el offset horizontal (0.30 a 0.52) y la escala hasta 1.06 llevan el borde a 3.107 al entrar y 3.163 al salir, contra un semicuadro de 2.8125 en reposo y 2.7424 con la camara en su punto mas cerca (dolly 1.55). Medido: entre 40 y 81 px de contenido cortados de un costado, en TODOS los cuadros del slot. Es exactamente el defecto que la linea 145 dice haber arreglado
  - **Lo dispara:** Cualquier recorte APAISADO de 771 px de ancho o mas (una tarjeta, un hero, una captura de seccion: el caso normal). Ahi anchoNativo = imgW*1.4/1080*mundoW supera ANCHO_MAX, el plano se compone exactamente a mundoW*1.0 = 5.625, y no le queda un solo pixel de margen para absorber el desplazamiento ni 
  - **Compuerta:** NINGUNA, y por dos motivos independientes. (1) planoRecorte (kit.js:1964) no pone userData.encaja, y rafaga.js no lo pone en ningun lado, asi que E-ENCAJE nunca mira estas mallas — E-ENCUADRE solo pregunta si la caja CRUZA el frustum y una pieza a sa
  - `m.position.set(lado * desde, (rnd() - 0.5) * 0.5, 0) // desde = 0.30 + rnd() * 0.22 tl.fromTo(m.scale, { x: 0.92, y: 0.92, z: 1 }, { x: 1.06, y: 1.06, z: 1, ... })`

- [x] **render3d/demo/escenas/tipografia.js:128-133**
  - **Síntoma:** El ancho es SIEMPRE la constante que se le pasa; el alto es la variable dependiente y no tiene piso. Medido con las fuentes reales sobre m1 = medida(fr(0), ANTON, 5.10, 3.1): 'MIDE' sale a 3.100 de alto (595 px de 1920) y 'Trusted by millions, Basecamp puts everything you need to get work done in one place' sale a 0.192 (37 px). Dieciseis veces mas chico. La escena que lleva el mensaje, y que adem
  - **Lo dispara:** Un encabezado real de pagina de 35 caracteres o mas. La escena ademas APLANA los saltos de linea (linea 195: `String(mias[i % NF] || '').replace(/\n/g, ' ')`), asi que un titulo de dos renglones llega como una sola linea larguisima y el ar se dispara. El fixture ANTHEM tiene frases de 4 a 19 caracte
  - **Compuerta:** NINGUNA. tipografia.js no tiene una sola marca userData.encaja (verificado por grep), asi que E-ENCAJE no la audita; y de todos modos E-ENCAJE solo mide CONTENCION (|x|,|y| <= 1.015), nunca un cuerpo minimo. No existe compuerta de tamano de texto par
  - `function medida(str, op, ancho, altoMax) { const t = texto(str, op) let a = ancho, h = ancho / t.ar if (h > altoMax) { h = altoMax; a = altoMax * t.ar } return { str, op, ancho: a, alto: h, tex: t.tex`

- [x] **render3d/demo/kit.js:968 leido junto con tools/encuadre-check.mjs:166**
  - **Síntoma:** Medido con las fuentes reales, cuerpo del renglon en un cuadro de 1920 px, fixture ANTHEM contra claims reales: gancho 169 -> 84 px (basecamp, 84 ch), titular 163 -> 88, cita 138 -> 109, partida 119 -> 33 (frase de 63 ch), marquesina 135 -> 36, lista 96 -> 35. Con el fixture las seis escenas componen carteles; con una pagina de verdad componen pies de foto. Es la mecanica exacta detras de 'de 5 vi
  - **Lo dispara:** El largo del copy real. encaje resuelve el desborde bajando el alto SIN PISO, asi que el cuerpo tipografico de seis escenas es una funcion inversa de cuantos caracteres escribio la marca. La compuerta que podria notarlo construye siempre con configurarDatos(ANTHEM), cuyo pozo son frases de 4 a 19 ca
  - **Compuerta:** NINGUNA mide el cuerpo resultante. E-ENCAJE (encuadre-check.mjs:140-151) solo comprueba que la malla ENTRE entera; achicar hasta lo ilegible es justamente como encaje consigue que entre, asi que la compuerta se pone MAS verde cuanto peor se ve. Adema
  - `export const encaje = (altoBase, arMax, anchoUtil) => altoBase * arMax > anchoUtil ? anchoUtil / arMax : altoBase`
- SEGUIMIENTO de kit.js:968 (2026-08-04): **medido el dano real, y es mucho mas chico de lo que dice la
  ficha: UNA escena de seis, y por un 8%.**
  - Se construyeron las seis escenas sedientas con los 7 juegos de datos REALES x los 11 aires, y se
    midio la caja de texto mas chica de cada una en pixeles de alto sobre 1920:

    | escena | peor cuerpo | contra el piso |
    |---|---|---|
    | `gancho` | **35 px** | **-8%, DEBAJO** |
    | `marquesina` | 46 px | +21% |
    | `cita` | 50 px | +32% |
    | `partida` | 54 px | +42% |
    | `lista` | 58 px | +53% |

  - **El piso no lo invente: lo declara el propio repo.** `hero.js` pone `PISO = mundoH * 0.020` — 38
    px — y lo justifica como 'el limite donde el propio hallazgo dice que la cosa deja de leerse'. Es
    la misma medida (alto de la malla de texto), asi que la comparacion es directa.
  - `titular` **no se pudo medir**: necesita texturas de recorte y el arnes no las carga. Queda como el
    unico hueco de esta medicion.
  - **Que cambia esto para la decision.** La ficha describe seis escenas que 'con el fixture componen
    carteles y con una pagina de verdad componen pies de foto'. Medido, cuatro de las cinco que se
    pudieron construir quedan entre 21% y 53% POR ENCIMA del piso que el repo se puso, y solo `gancho`
    cae debajo — por 3 px. O sea que el arreglo grande (poner piso al `encaje`, con su trampa conocida
    de cambiar 'ilegible' por 'cortado a los costados' en seis escenas) no esta justificado por estos
    numeros: lo que hay es un caso, no una familia.
  - **HECHO el caso, 2026-08-04: `gancho` adapta sus renglones.** Se prueban 3, 4 y 5 y se toma el
    PRIMERO que pase el piso. Una pagina de claim corto no se entera —tres renglones ya le sobran— y
    solo cambian de forma las que hoy salen ilegibles.
  - **Medido antes y despues, mismos 4 claims reales x 11 aires:** el peor cuerpo de la escena pasa de
    **35 px** (tailwindcss con el aire nocturno, debajo del piso de 38) a **41 px**. De las cuatro
    paginas, solo tailwindcss pasa a cuatro renglones; las otras tres siguen en tres.
  - El piso es el MISMO numero y la misma medida que usa `hero.js`, no uno nuevo: si algun dia se decide
    que 38 px no es el limite, se cambia en un lugar y las dos escenas lo siguen.
  - **Lo que NO se hizo, y es el fondo de la ficha:** poner piso al `encaje` del kit. No hace falta:
    medidas las otras cuatro escenas, quedan entre 21% y 53% por encima del piso. La trampa que el
    handoff documenta —un piso sin techo de ancho cambia 'ilegible' por 'cortado a los costados'— no se
    paga por un problema que tenia una sola escena.
  - **CERRADO 2026-08-04. `titular` tambien se midio, cargando los PNG reales del disco con `loadImage`**
    —que es lo unico que hace disparar el veto de laminas— y construye en **11/11 aires** en las cuatro
    paginas con recortes, con un peor cuerpo de **46 px**, 21% por encima del piso. Era el ultimo hueco
    de esta medicion y no cambia la conclusion: la sostiene.
  - **Las seis escenas, medidas:** `gancho` 35 -> 41 px (arreglado), `marquesina` 46, `titular` 46,
    `cita` 50, `partida` 54, `lista` 58. Piso declarado por `hero.js`: 38 px.
  - El `encaje` del kit **no se toca**: la ficha describia una familia y lo que habia era un caso.

- [x] **render3d/demo/escenas/mesa.js:78**
  - ✅ **HECHO** — commit de mesa — se achica el PLANO hasta la proporcion real cuando la imagen es mas corta que la ventana, en vez de clampear `visible` y estirar. Verificado renderizando.
  - **Síntoma:** La imagen sale ESTIRADA A LO ALTO. Medido construyendo la escena (arnes de solo lectura con el bootstrap de encuadre-check): plano 5.96 x 8.89 (ar 0.671) con repeat.y = 1.000, o sea la textura entera metida en una caja de otra proporcion. Tarjeta 1400x845 -> x2.47; captura cuadrada 1200x1200 -> x1.49; banner 1600x400 -> x5.96. Solo una imagen mas alta que 1:1.49 sale sin deformar. Es literalmente 
  - **Lo dispara:** `mesa` construida SIN tira. guion.js:66 la habilita con solo tener elementos (`mesa: (d) => !!d.tira || (d.elementos || []).some(e => e && e.url)`) y motor.py:123-126 declara que una captura de tira fallida NO aborta. Ahi mesa.js:56-59 cae al recorte y `arMapa` pasa a ser el de un recorte. La cuenta
  - **Compuerta:** Ninguna, y por una razon concreta: `tejidoFalso` SIEMPRE inyecta la tira (encuadre-check.mjs:99-101 y verificar.mjs:99-101 hacen `tira.image = { width: 720, height: 6240 }` y `m.set('tira', tira)`), asi que la rama de respaldo de mesa.js:56-59 no se 
  - `let visible = (ALTO / ANCHO) * arMapa if (visible > 1) visible = 1`

- [x] **render3d/demo/escenas/toro.js:356**
  - **Síntoma:** El titular se dispara de tamaño. Medido con las fuentes reales (registrarFuentes + la aritmetica exacta de kit.js:892-920): 'CADA OBJETO ES REAL' (el fixture, 4 palabras) da ALTO_PAL 0.753; 'Analytics' da 1.546; 'Pricing' 2.025; 'Speed' 2.513; una palabra de dos letras tipo 'AI' da 6.324 — una caja de 6.3 unidades de alto en un mundo de 10. Desde 'Pricing' hacia abajo la caja de la palabra baja de
  - **Lo dispara:** Un `bloque.titulo` de UNA palabra corta. El slot se llena en tools/anthem-datos.mjs:178-183 con el primer feature cuyo titulo tenga CUATRO PALABRAS O MENOS ('necesita ELEGIR un titulo que ya tenga cuatro palabras o menos'), asi que un feature titulado 'Speed', 'Pricing', 'Security' o 'Analytics' ent
  - **Compuerta:** Ninguna. (a) Todas las compuertas construyen con `configurarDatos(ANTHEM)` y ANTHEM trae `bloque: { titulo: 'CADA OBJETO ES REAL' }` (datos.js:28), o sea 4 palabras, el caso mejor. (b) El unico caso adverso que existe es la PAGINA POBRE de verificar.
  - `const ars = PAL.map(p => texto(p, optPal).ar) const sumaAr = ars.reduce((a, v) => a + v, 0) const ALTO_PAL = ANCHO / sumaAr`

- [x] **render3d/demo/escenas/tarjetas.js:157 (sitio de llamada: 290)**
  - **Síntoma:** Construido con datos ['99%','10x','500K'] el espia de fillText devuelve como texto numerico dibujado: 500K (la heroe) y '0'. Las otras dos tarjetas dicen CERO. En el video: 0 UPTIME y 0 MAS RAPIDO en la pieza de una pagina que publica 99% y 10x. No es un problema de encaje: es una cifra falsa, justo lo que la regla anti-invencion existe para impedir.
  - **Lo dispara:** Cualquier cifra que no sea digitos puros en una tarjeta que NO es la heroe. tarjetas.js:56 pone `n = null` cuando `/^\d+$/` falla, y backend/semantica_gratis.py:68-70 (_CIFRA) EXIGE unidad — %, x, K, M, B, mil/millones — asi que en el camino sin brief NINGUNA cifra real es de digitos puros. Con `val
  - **Compuerta:** Ninguna. E-PROCEDENCIA (verificar.mjs:296) descarta todo texto sin letras — '0' no tiene — y E-INVENCION (verificar.mjs:268) solo compara cadenas de 3 caracteres o mas. El caso POBRE del verificador (verificar.mjs:232) manda UNA sola cifra con valor 
  - `for (let k = 0; k <= PASOS; k++) texs.push(texto(String(Math.round(valorFinal * k / PASOS)), { fuente: 'Anton', size }))`

- [x] **render3d/demo/escenas/tarjetas.js:191**
  - **Síntoma:** El nombre de la marca, centrado en x=0 y a 1.05 de alto, sobresale 1.2 y 1.9 unidades por CADA lado de un cuadro de 5.625: sale cortado contra los dos bordes. Es literalmente el reclamo textual de Thiago ('textos tan grandes que en los costados se cortan'). Medido con Box3: pieza de 9.38x1.05 centrada en (0.00, 3.10).
  - **Lo dispara:** Una marca larga. El plano se dimensiona SOLO por alto (planoTexto hace PlaneGeometry(alto*ar, alto)) y el ancho sale de la proporcion, sin tope. Medido: desde 15 letras el ancho ya pasa mundoW. 'MERCADO LIBRE ARGENTINA' -> 8.05 de ancho (143% del cuadro); 'TRANSPORTES INTERNACIONALES' -> 9.38 (167%)
  - **Compuerta:** Ninguna, por dos motivos encadenados. (1) E-ENCAJE nunca llega a construir esta escena con marcas largas — ver el hallazgo de verificar.mjs:315. (2) Aunque la construyera: `titulo` no declara `userData.encaja`, y el heuristico `peor` (verificar.mjs:4
  - `const titulo = txt(D.marca, 1.05, { fuente: 'Anton', size: 110 }, C_TIT(), 0)`

- [x] **render3d/demo/escenas/cierre.js:240**
  - **Síntoma:** Medido con Box3 al 72% de la escena: 'ANTHEM' da 4.34x1.71 (17% del alto del cuadro, glifo 226 px de 1920) — que es la composicion pensada. 'Q' da 4.34x7.22: 72% del alto, glifo de 952 px, y se sale por abajo del anillo que la escena declara que la contiene (aro R=2.55 centrado en y=1.35 -> borde inferior -1.20; el glifo baja hasta -1.37). 'GO' da 4.50 de alto (45%). Al otro extremo, 'TRANSPORTES 
  - **Lo dispara:** Una marca muy corta o muy larga. `textoMascara(D.marca, 1, ...)` deja un plano de ar x 1, y despues se le aplica una escala UNIFORME calculada solo con el ANCHO, asi que el alto final es 4.34/ar y nadie lo mira. Ademas usa D.marca entero (no `palabraDeMarca`), asi que el espacio y las palabras secun
  - **Compuerta:** Ninguna, y no es por falta de intento: E-ENCAJE prueba EXACTAMENTE 'Q' y 'TRANSPORTES INTERNACIONALES' (verificar.mjs:314). Pasa porque el unico umbral de alto es `peor.y <= mundoH * 0.85` (verificar.mjs:410), o sea 8.50, y el caso peor medido es 7.2
  - `marca.scale.setScalar(4.34 / ancho(marca)) // 77% del ancho del cuadro`

- [x] **render3d/demo/kit.js:1554**
  - CERRADO POR COMPROBACION, no por parche: el defecto ya no esta. Barrido el shader entero buscando
    (a) pares consecutivos `} else if (uPatron < X)` con el MISMO umbral y (b) ramas con el cuerpo
    vacio: cero de cada una. Los cinco pares duplicados que reportaba el hallazgo se cerraron en el
    "paso 0". Verificado leyendo el shader, NO renderizando: la comprobacion de que los cinco fondos
    DIBUJAN sigue pendiente y es lo que propone la compuerta E-PATRON-DIBUJA.
  - **Síntoma:** El fondo sale como 'nada': solo el degrade, sin trama. La MISMA pagina y el MISMO aire dan a veces un fondo con textura y a veces un cuadro liso, segun la semilla — que es literalmente 'el motor es impredecible'. Se repite identico en 1587/1588 (celosia), 1621/1622 (costura), 1657/1658 (espigas) y 1702/1703 (engranaje): en los cinco casos la rama VACIA va primera en la cadena else-if y se queda co
  - **Lo dispara:** Cualquier pieza cuyo aire liste uno de los CINCO fondos nuevos en `fondos` y cuya semilla lo elija (kit.js:836-837 `const fondo = elegir(mo.fondos, 0x9e37)`). Estan declarados hoy: roseta en bienestar.js:118 y lujo.js:98; celosia en inmobiliario.js:114, lujo.js:98 y nocturno.js:110; costura en artes
  - **Compuerta:** Ninguna. E-SHADER-ENTERO (verificar.mjs:631-645) solo comprueba que el literal de fragmentShader llegue a gl_FragColor; E-COMPOSITOR-PARSEA corre `node --check`, y esto es JS y GLSL sintacticamente validos. tools/bg-check.mjs mide el fondo de src/pag
  - `} else if (uPatron < 22.5) { } else if (uPatron < 22.5) {`

- [x] **render3d/demo/escenas/cierre.js:240**
  - **Síntoma:** Medido construyendo la escena y tomando el Box3 de la malla (misma cuenta que E-ENCAJE, verificar.mjs:359-390): 'Q' -> 4.34 x 7.22 (72% del alto del cuadro); 'GO' -> 4.34 x 4.50 (45%); 'ANTHEM' -> 4.34 x 1.71 (17%); 'CONSTRUCCIONES' -> 4.34 x 0.86 (9%); 'TRANSPORTES INTERNACIONALES' -> 4.34 x 0.47 (5%). Quince veces de rango en el mismo slot. Con una marca de una o dos letras la letra llena el ani
  - **Lo dispara:** El LARGO del nombre de la marca. `ancho(marca)` (cierre.js:150) devuelve el width de la PlaneGeometry, que con planoTexto(D.marca, 1) es exactamente el `ar` de la textura; el escalar es uniforme, asi que el ALTO final sale 4.34/ar y nadie lo mira.
  - **Compuerta:** No, y la compuerta que existe para esto la mira y la deja pasar. E-ENCAJE (verificar.mjs:315) construye cierre con la marca 'Q' — el caso exacto — pero (a) la malla no declara `userData.encaja`, asi que E-ENCAJE-ENTERO (verificar.mjs:395) no la evalu
  - `marca.scale.setScalar(4.34 / ancho(marca)) // 77% del ancho del cuadro`

- [x] **render3d/demo/guion.js:266 (y la ausencia de la clave en el objeto de las lineas 28-111)**
  - ✅ **HECHO** — 8b893f2 — requisito de marquesina agregado (>=2 frases, umbral leido de MIN_FRASES en la escena).
  - **Síntoma:** marquesina.js:37-40 se declara `vacia: true` y main.js no mira ese campo (main.js:480-501 la cuelga igual): la pieza se queda los 6 beats con el fondo y nada mas — 2.90 s a 124 bpm, 4.24 s a 85. Medido con el fixture 404 sobre 180 guiones: entra en 146 y sale vacia en los 146. A 15 s es la unica escena del medio: `gancho > apertura > marquesina > cierre`, o sea entre el 19% y el 28% de la pieza en
  - **Lo dispara:** `marquesina` es la UNICA de las 20 escenas registradas en escenas/index.js que no tiene clave en REQUISITOS, asi que ese `: true` la deja entrar siempre. Ademas esta en SEDIENTAS (guion.js:319) y la primera sedienta entra aunque el pozo no la banque (guion.js:353: `if (sobreviven.size && pide > pozo
  - **Compuerta:** Ninguna. `marquesina` no esta en el CAT de tools/guion-check.mjs:27-34, asi que no aparece en ningun guion del gate, ni en E-GUION-ESCENA-MUERTA (recorre CAT.keys()) ni en E-FAMILIA-DECLARADA (idem). Corri el gate: imprime OK sobre 324 guiones.
  - `const puede = (id) => escenas.has(id) && (REQUISITOS[id] ? REQUISITOS[id](d) : true)`

- [ ] **render3d/demo/guion.js:82-83 contra render3d/demo/escenas/titular.js:88-91**
  - **Síntoma:** titular.js:92 `if (!txt || !tex)` cae en `vacia: true` y main.js la cuelga igual: 6 beats de cuadro liso (2.90 s a 124 bpm). Medido: `titular` entra en 110 de 180 guiones de linear-app (61%). El mismo mecanismo degrada la rafaga en esa pagina: su pozo son las dos laminas vetadas mas el logo, asi que muestra el MISMO logo dos veces.
  - **Lo dispara:** El requisito cuenta elementos por ROL; la escena necesita una TEXTURA que sobreviva a `texturaDe` (kit.js:2039: `if (SIN_LAMINAS && e.rol !== 'logo' && esLamina(t.image)) return null`), y ese veto lo enciende `configurarDatos` (datos.js:91) en cuanto la pagina publico testimonios. Fixture linear-app
  - **Compuerta:** Ninguna. `titular` no esta en la copia de requisitos del gate, y aunque estuviera, el gate no carga imagenes: `esLamina` mide pixeles y solo corre en el navegador al construir. No re-medi los PNG — me apoyo en la tabla de medicion que el propio kit.j
  - `titular: (d) => (d.elementos || []).some(e => e && ['foto', 'hero', 'tarjeta'].includes(e.rol)) && (d.frases || []).filter(Boolean).length >= 1,`
- SEGUIMIENTO de guion.js:82-83 (2026-08-04): **la primera mitad ya estaba arreglada; la segunda no se
  puede reproducir en esta maquina, y el mecanismo SI quedo demostrado.**
  - **Ya arreglado:** 'main.js la cuelga igual, 6 beats de cuadro liso' no ocurre. `main.js:526` lee
    `r.vacia`, mata la timeline y hace `continue` SIN avanzar el beat, con un comentario que describe
    exactamente este defecto. La pieza sale mas corta en vez de tener un agujero.
  - **Medido, 0 escenas fantasma:** construidas 105 piezas con los 7 fixtures reales, **0 de 787**
    escenas programadas se declaran vacias.
  - **PERO ese 0 hay que leerlo con cuidado, y la primera medicion decia 100%.** El arnes llenaba el
    Map de texturas con claves 'f0'..'f4' mientras `datosEls` trae las urls del fixture, asi que ningun
    recorte resolvia y `titular` se caia siempre. Corregido en `tools/eco-check.mjs`: las texturas se
    crean con las URLs REALES de cada pagina.
  - **El veto de laminas SI se puede probar, y esto es nuevo:** cargando los PNG de verdad con
    `loadImage` de @napi-rs/canvas, `esLamina` funciona en Node y dispara sobre **13 de los 53 recortes
    reales del repo (25%)** — entre ellos 3 de linear-app. O sea que el punto ciego que este documento
    nombra dos veces ('los heroes se prueban con lienzos de 4 px porque lo que se audita es la
    GEOMETRIA, no los pixeles') **tiene salida**: alcanza con leer los archivos que ya estan en disco.
  - **Por que no se reproduce igual:** de las 6 capturas cacheadas, las que publican testimonios
    —o sea las que encienden el veto— hoy dan CERO elementos (linear-app, stripe, mercadolibre), y las
    que traen elementos (tailwindcss 4/4 en rol, pentagram 6/7, theverge 8/8) no publican testimonios.
    Falta una captura que tenga las dos cosas a la vez.
  - **REPRODUCIDO el 2026-08-04.** Se recapturo linear.app y ahora da **7 elementos y 3 testimonios**,
    o sea el veto ENCENDIDO — que es justo la combinacion que faltaba. Cargando sus PNG con `loadImage`
    y corriendo `esLamina` de verdad:

    | rol | tamano | veredicto |
    |---|---|---|
    | logo | 176x44 | pasa |
    | cta | 256x90 | pasa |
    | cta | 290x90 | **LAMINA, vetada** |
    | cta | 172x66 | pasa |
    | tarjeta | 1400x845 | **LAMINA, vetada** |
    | tarjeta | 864x960 | **LAMINA, vetada** |
    | foto | 1400x782 | pasa |

  - **La cuenta que hace el requisito contra la que hace la escena:**
    - `titular` (roles foto/hero/tarjeta): el requisito cuenta **3**, sobrevive **1**.
    - `cubo` (logo/tarjeta/foto/hero): cuenta **4**, sobreviven **2**.
    - `mesa` (foto/tarjeta/logo): cuenta **4**, sobreviven **2**.
  - O sea que el requisito **sobrecuenta 3x** en esta pagina. En este caso `titular` igual se salva
    porque le queda 1, asi que NO cae en `vacia` — la ficha decia que si, y con este material no pasa.
    Pero con un recorte menos caeria, y `cubo` ya queda por debajo de su `CARAS_MINIMAS = 4`.
  - **El arreglo esta localizado y es viable:** el requisito tendria que contar los que SOBREVIVEN al
    veto, no los que tienen el rol. Y se puede: verificado en `main.js` que las texturas se cargan
    ANTES de `construir()` (linea 824 contra 806-816), y el guion corre adentro (linea 427), asi que en
    el momento en que `REQUISITOS` decide, las imagenes YA estan. Lo que falta es pasarle las texturas
    a `REQUISITOS`, que hoy solo recibe `datos`.
  - **SE PROBO EL ARREGLO Y SE SACO, con la medicion escrita.** Se implemento entero: `guionDe` acepta
    un predicado `sirve` —un PREDICADO y no las texturas, para no romper la independencia de `guion.js`
    respecto de `kit.js`, que es la que deja a `guion-check` cargarlo sin montar un DOM—, los cinco
    requisitos que dependen de recortes (`mesa` x2, `rafaga`, `columna`, `titular`, `contraste`) pasaron
    a contar por ese predicado, y `main.js` lo pasa consultando `texturaDe` con las texturas ya cargadas.
  - **Y el plan no cambia: 0 de 144.** Medido con las 4 capturas reales que traen elementos, cargando
    sus PNG de verdad, sobre 3 duraciones x 12 semillas cada una. Los umbrales de esos requisitos son
    lo bastante bajos como para que el veto no de vuelta ninguno: en linear.app —la unica con el veto
    encendido— sobreviven 4 de 7 recortes, y `columna` pide 2, `titular` 1 y `mesa` 1.
  - Se revirtio, por la regla que este documento ya aplico al cupo de la frase del hero: **un arreglo
    que no mueve la medicion no se deja puesto.** Queda ABIERTO con el numero, y con el codigo probado
    —es media hora de trabajo el dia que una pagina real haga saltar alguno de esos umbrales.
  - **Lo que SI se dejo** es el caso hermano donde la medicion si se movio: `cubo.meta.puede`, que con
    linear.app pasa de ofrecerse a no ofrecerse. Mismo arreglo, distinto resultado, distinta decision.

- [x] **render3d/demo/heroes/portatil.js:142**
  - ✅ **HECHO** — e28eacd — matriz de textura a mano: uRep/uOff apuntando a los Vector2 propios de la textura. Arregla el aplastamiento de 7-19x Y revive el scroll, que animaba un valor que nadie leia.
  - **Síntoma:** La pantalla de la notebook muestra la pagina ENTERA aplastada 7 a 10 veces a lo alto: letras anchas y chatas, ruido gris donde tendria que leerse el sitio del cliente. Y el scroll de cinco saltos —que se agrego justamente porque la escena daba 0.072 de movimiento y 61% de cuadros casi quietos, segun su propio comentario— no desplaza nada: anima un valor que el shader nunca lee. Es defecto #1 palab
  - **Lo dispara:** Cualquier pagina con captura movil (`tira`) que elija el hero `portatil` — es el SEGUNDO en el orden de preferencia de heroes/index.js:53 y no tiene restriccion en REGISTRO, o sea que le queda a los 11 aires. La escena hace `tira.repeat.set(1, visible)` y `tira.offset.set(0, 1 - visible)` en portati
  - **Compuerta:** NINGUNA. encuadre-check construye portatil y le mide cajas (no cambia ni un decimal con la textura mal); verificar le comprueba contrato, duracion, camara devuelta, determinismo y quietud, y pasa porque gEq rota y la camara hace dolly. E-SHADER-ENTER
  - `vec3 c = texture2D(map, vUv).rgb;`

- [ ] **tools/encuadre-check.mjs:217**
  - **Síntoma:** Un renglon cortado por el margen derecho, una marca que pierde su ultima letra, un titular que se come el pie — con la compuerta en verde. Es literalmente el caso del destello al 112%: la regla que lo cazaria existe y no se le aplica.
  - **Lo dispara:** Que una escena se olvide de declarar —o decida no declarar— `userData.encaja`. Medido construyendo las 37 escenas y heroes con los datos de ANTHEM: 799 mallas, 16 declaradas (2.0%); 161 con textura (tipografia y recortes reales, o sea todo lo que se puede cortar), 16 declaradas y 145 sin cubrir. Cer
  - **Compuerta:** Ninguna, por construccion: la contencion es declarativa y la unica regla que corre sobre TODO es `enCuadro` (linea 129), que es `intersectsBox` — verdadera si UN pixel toca el cuadro. La contraparte en verificar.mjs:395 tiene la misma condicion, asi 
  - `if (o.userData && o.userData.encaja) {`
- SEGUIMIENTO de encuadre-check.mjs:217 (2026-08-03): **medido, y el arreglo que la ficha sugiere no
  sirve.** Se aplico la contencion (`entraEntera`) a TODA malla con textura, declarada o no, sobre las
  407 construcciones y en los 4 instantes que ya se muestrean:
  - **38.432 de 148.054 muestras no entran enteras, y las 38.432 estan sin declarar.** O sea que
    exigir contencion universal produciria decenas de miles de acusaciones.
  - **Y son deliberadas.** Los peores: `enjambre` llega a x=177252 (particulas dispersas a proposito),
    `marquesina` a 5.57 (una cinta ES mas ancha que el cuadro, o no hay bucle), `tipografia` a 4.63,
    `destello` a 2.46 (su golpe de escala).
  - **Tampoco se separa por magnitud**, que era la salida elegante: la banda mas suave (1.02-1.10, o
    sea 'roza el borde') tiene 5.452 muestras repartidas en **16 de las 37 escenas**, entre ellas
    `apertura`, `cierre`, `pantalla`, `portatil` y `mosaico` — todas escenas que sangran por decision
    de composicion. Un umbral ahi acusa lo correcto junto con lo incorrecto.
  - Conclusion: el 2% declarado NO es un descuido, es la unica formulacion tratable. '¿esto tiene que
    entrar entero?' es una intencion de composicion y no se puede deducir de la geometria. Coincide con
    la objecion de los criticos sobre E-CONTENCION-TOTAL sin opt-in, verificada ahora por medicion
    propia. Queda ABIERTO: lo que falta no es aplicar la regla a todo, sino DECLARAR mas mallas.

  - **AVANCE 2026-08-04: se declararon las que se pudo, medidas.** Si la contencion no se puede
    automatizar, lo que queda es declarar mas mallas — y eso se puede hacer con evidencia en vez de a
    ojo. Se instrumento `encuadre-check` para listar las mallas con textura que **SIEMPRE** entran
    enteras en las 407 construcciones (11 aires x 8 juegos de datos reales) y no estaban declaradas:
    salieron cuatro grupos, y los cuatro con margen holgado.
  - Declaradas: `cita` (peor 0.807 del semicuadro), `contraste` (0.839), `sello` (0.511) y la lamina de
    `cubo` (0.660). No cambian nada hoy —por eso se eligieron— y convierten en FALLO cualquier cambio
    futuro que las saque del cuadro.
  - Quedan 18 grupos sin declarar que alguna vez se salen: esos NO se pueden declarar sin decidir antes
    si su desborde es deliberado, que es la parte que sigue necesitando criterio de composicion.
- [x] **tools/encuadre-check.mjs:166**
  - **Síntoma:** Textos que se salen por los costados en la pagina del cliente y nunca en la demo — que es exactamente el reclamo ("algunos textos son tan grandes que en los costados se cortan"). Y ramas enteras sin ejercitar: el techo de alto de destello (destello.js:232-233, el arreglo del defecto #2) solo se activa con una linea CORTA, y el golpe de ANTHEM (`UNA PLANTILLA`, proporcion ~4.6) nunca lo activa; el 
  - **Lo dispara:** Contenido en los extremos. La compuerta barre 11 aires (y lo documenta con orgullo en las lineas 72-77) pero UN SOLO juego de datos, dentro del bucle, en las 407 construcciones. Medido: ANTHEM da frase mas larga 19 caracteres y palabra mas larga 9. Convirtiendo los 7 pagemodels REALES que ya estan e
  - **Compuerta:** Ninguna: verificar.mjs es la unica que varia contenido y solo varia la MARCA (linea 314), nunca frase, golpe, claim ni etiqueta de dato. Los 7 fixtures reales estan en disco, adn-check ya los lee, y ni encuadre-check ni verificar los tocan.
  - `configurarDatos(ANTHEM)`
  - **CERRADO 2026-08-03, con la premisa corregida.** La cobertura se agrego: los 7 pagemodels reales
    se convierten con `datosDe()` —el mismo camino que usa produccion— y rotan por aire, asi que ahora
    se barren 8 juegos de contenido en vez de 1. **Cuesta lo mismo**: rotando en vez de multiplicar,
    407 construcciones y ~7 s (el producto cartesiano serian 3256 y ~55 s, y esta es una de las
    rapidas). La frase mas larga pasa de 19 caracteres a 121.
  - **Pero el contenido real NO cambia el veredicto, y eso hay que decirlo.** Medido: los 7 juegos
    reales pasan los 7, y el conteo de mallas con textura que no entran enteras se mueve un 2% (38432
    con ANTHEM, 39241 con stripe). No puede ser de otra manera — esta compuerta pregunta si la caja
    CRUZA el cuadro, no si entra entera, asi que el largo del copy no tiene por donde hacerla fallar.
    La ficha esperaba que el contenido real destapara desbordes y no los destapa: **para eso hace falta
    la regla de contencion, o sea el hallazgo `:217`**. Los dos estaban acoplados y no se veia.
  - Queda entonces como cobertura para el dia que alguien toque el encaje, no como arreglo de un
    defecto de hoy.

- [x] **render3d/demo/verificar.mjs:631**
  - **Síntoma:** El shader llega mutilado al navegador —sin main, sin salida— y el objeto simplemente no se dibuja. Sin error en ninguna consola, sin FAIL en ninguna compuerta: el hero aparece vacio o la pantalla del aparato sale negra, y el diagnostico arranca de cero.
  - **Lo dispara:** Una comilla invertida dentro de un comentario de shader escrito en una escena o un hero. E-SHADER-ENTERO existe porque eso paso CUATRO veces en este repo (su propio comentario, lineas 621-630) y lee dos archivos. Contados: 22 literales `fragmentShader: \`` viven en escenas/ y heroes/ (cierre 2, pant
  - **Compuerta:** Ninguna. `node --check` (E-COMPOSITOR-PARSEA, verificar.mjs:655) no ayuda: el caso peligroso es el que sigue siendo JavaScript valido, y ademas esa lista tampoco incluye escenas ni heroes. El import de cada escena (verificar.mjs:189) tampoco: el modu
  - `for (const arch of ['main.js', 'kit.js']) {`
  - **CERRADO 2026-08-03**, y con una correccion a la ficha. La lista de archivos ahora se arma leyendo
    `escenas/` y `heroes/` —modismo que ya usaba E-EASE-VALIDO, asi que no hay que acordarse de
    actualizarla— y ademas mira las DOS formas de declarar un shader: el literal directo y el asignado
    por variable (`ventana.js` escribe `fragmentShader: FRAG`, con FRAG definido antes; buscando solo la
    forma directa, los dos shaders mas largos del motor quedaban afuera justo por estar bien escritos).
    De 4 shaders en 2 archivos se paso a **32 en 41**.
  - **La ficha atribuye el valor al caso equivocado, y conviene dejarlo escrito.** Se inyecto una comilla
    invertida en un comentario del shader de `ventana` y fallan las dos versiones con el MISMO mensaje
    (`no importa — Unexpected identifier 'q'`): el import revienta antes y E-SHADER-ENTERO ni corre. No
    se pudo construir el caso 'sigue siendo JavaScript valido' que la ficha describe.
  - **Lo que la extension SI cierra, demostrado:** un fragmentShader de una escena que parsea
    perfectamente y nunca escribe su salida. Quitandole el `gl_FragColor` a `pantalla.js`, la compuerta
    vieja dice 'VERIFICAR OK' y la nueva lo acusa por archivo y por clave.


## Se notan (38)

- [x] **render3d/demo/heroes/portatil.js:122**
  - **Síntoma:** Aunque se arregle el shader (hallazgo 1), la página sale ESTIRADA 1.87 veces a lo ancho: letras anchas y chatas. Es el defecto que dos archivos hermanos documentan a los golpes y que este no aplicó — escenas/pantalla.js:82-88 («Con la misma cuenta, la pagina del cliente sale estirada un 22% a lo ancho — el defecto que su dueño ve antes que ninguno») y ventana.js:148-153 («Y NO ALCANZA CON LA CUENT
  - **Lo dispara:** Es la cuenta del teléfono copiada a una superficie que NO tiene la proporción del viewport capturado. Con la tira real de 720x8192 y tiraViewport 1560 da visible = 0.099, o sea 811 px de página metidos en un plano de proporción 1.6622. La proporción que no deforma sería (720/8192)/1.6622 = 0.0529, o
  - **Compuerta:** Ninguna. Hoy además está tapado por el hallazgo 1 (el shader ni siquiera lee `visible`), así que arreglar sólo el shader cambia un defecto por otro más chico en vez de arreglar la escena.
  - `const visible = Math.min(1, (altoVP / altoTira) * 0.52)`
  - **CERRADO 2026-08-03.** Confirmado por aritmetica independiente antes de tocar nada: con la tira
    real de 720x8192, `uAR = pw/ph = 1.6622`, visible 0.09902 contra 0.05288 -> **1.873x**, o sea el
    1.87 que decia el hallazgo. La cuenta nueva no se invento: sale de pedir que la densidad de pixeles
    por unidad de mundo sea igual en los dos ejes, que es lo que ya estaba escrito en `pantalla.js:82-88`
    y `ventana.js:148-153`. `visible = anchoTira * ph / (altoTira * pw)`.
  - **Y la cuenta estaba DOS VECES** —aca y en el bloque del scroll, con la misma expresion copiada—,
    asi que arreglar una sola dejaba el recorrido dimensionado sobre una ventana que ya no existia.
    Ahora hay una sola definicion (`PANT_W`/`PANT_H`/`VISIBLE`).
  - **Destapo un segundo defecto, y era el mismo que `ventana.js:388`.** Con la ventana correcta (433 px
    en vez de 811) el recorrido —que se medi­a sobre la tira ENTERA— paso de 1.00 a **1.97 ventanas por
    salto**: entre dos reposos no quedaba un pixel en comun. Acotado con la aritmetica de SU bucle
    (SALTOS = 5, exponente 0.78 -> el primer salto vale `recorrido * 0.285`; pidiendo que no pase del 85%
    de una ventana queda `recorrido <= visible * 2.98`). Los cinco saltos miden ahora 0.85, 0.61, 0.54,
    0.50 y 0.48 ventanas. Sin esto, el arreglo cambiaba un defecto por otro — que es literalmente lo que
    la ficha advertia.
  - **Compuerta nueva: `tools/tira-check.mjs`** (E-PAGINA-SIN-DEFORMAR). Mide px/unidad en los dos ejes
    sobre los seis lugares que pegan la pagina en un plano, con las tres tiras reales del repo y los 11
    aires. Corrida contra el codigo VIEJO acusa `portatil` 1.873x y da 1.0000 en los otros cuatro;
    contra el nuevo, 1.0000 en los cinco. Verificado tambien mirando 8 cuadros a resolucion completa
    (f300 y f335 con cada version, mas f262 y f364).

- [x] **render3d/demo/heroes/cubo.js:108**
  - **Síntoma:** El logo de stripe (120 px) se dibuja a 512 px en la cara: 4.3x. El de linear, 2.9x. La cara que está en reposo mirando a cámara es justo la que el espectador MIRA quieta —el tumbo se detiene en cada peldaño a propósito, líneas 168-189— así que el remuestreo se ve en el instante en que la escena pide que se lea.
  - **Lo dispara:** Cualquier recorte más angosto que 366 px, que son casi todos los logos y CTA reales (stripe logo 120, linear logo 176, ghost logo 211, stripe cta 168x80). UTIL = LADO*0.86 = 2.666 unidades = 512 px de cuadro, y el recorte se estira hasta llenarlo sin mirar cuántos píxeles tiene.
  - **Compuerta:** Ninguna. `topeNitido` tampoco está en el import de la línea 25.
  - `const w = ar >= 1 ? UTIL : UTIL * ar`

- [x] **render3d/demo/heroes/ventana.js:388**
  - **Síntoma:** Cada salto mueve MÁS de una pantalla entera de página: 2.88, 2.00, 1.75, 1.59, 1.48 y 1.54 ventanas. Entre dos posiciones de reposo no queda un solo píxel en común, así que no se lee como un scroll sino como seis recortes al azar de la página — el gesto que el comentario de las líneas 383-387 dice estar haciendo («se leen como una mano usando el aparato») es justo el que no ocurre. Y arranca en el
  - **Lo dispara:** Una página larga, o sea el caso normal: 4 de las 7 tiras reales del repo son de 8192 px. La ventana es apaisada, así que sólo muestra 5.2% de la tira (visible = (720*3.408)/(8192*5.7375) = 0.0522 → 428 px de página). El recorrido, en cambio, es el 62% de TODA la tira restante = 4814 px, repartido en
  - **Compuerta:** Ninguna. Las compuertas construyen la tira con un canvas de 4x4 al que se le sobreescriben `width/height` (verificar.mjs:99-101 y encuadre-check.mjs:92-94), así que no hay contenido de página que medir; y ninguna compara el tamaño del salto contra el
  - `const recorrido = Math.max(0, 1 - visible) * 0.62`

- [x] **render3d/demo/heroes/cubo.js:104**
  - **Síntoma:** Las seis caras del cubo muestran las MISMAS dos imágenes, tres veces cada una. El tumbo va parando cara por cara para que se lean, y lo que se lee es la misma foto una y otra vez. Es literalmente el reclamo ya registrado en kit.js:2043-2049: «vuelven a aparecer las mismas imagenes que aparecieron en escenas atras, no innovan nada». El archivo se cubre sólo del caso cero (líneas 20-21, 56-59), no d
  - **Lo dispara:** Una página que da pocos recortes de los roles que el cubo pide (ROLES = ['logo','tarjeta','foto','hero']). Con el fixture real de basecamp.com hay 5 elementos y sólo DOS caen en esos roles (basecamp-com__el4-foto.png y __el5-foto.png; los otros tres son 'cta', que el cubo no pide). Además `recortesD
  - **Compuerta:** No. `recortesDe` cuenta las repeticiones en `recortesRepetidos` (kit.js:2055) pero nadie lo lee como condición de fallo, y el hero se ofrece con que exista UN solo elemento (escenas/hero.js:17: `if (datosEls && datosEls.length) disponible.add('elemen
  - `const tex = texs[i % texs.length]`
  - **ARREGLO DEL ARREGLO, 2026-08-04.** El `CARAS_MINIMAS = 4` que cerro este hallazgo contaba por
    ROL, y eso no protege del caso que importa: el veto de laminas (`texturaDe`) saca recortes mirando
    sus PIXELES, y saca DESPUES de que el cupo dijo que si.
  - **Medido con linear.app recapturado** (7 elementos, 3 testimonios, veto encendido): el cubo cuenta
    **4 por rol** y solo **2 sobreviven**. O sea que se ofrecia igual y mostraba dos imagenes repetidas
    tres veces cada una — exactamente el defecto que el cupo vino a cerrar.
  - Ahora `meta.puede(datosEls, texturas)` cuenta los que sobreviven y `hero.js` le pasa las texturas.
    Verificado cargando los 7 PNG reales: contando por rol el cubo se ofrece, contando lo que vive no.
  - Y queda escrito en `tools/heroes-check.mjs` lo que esa compuerta NO cubre —sus casos llaman a
    `elegibles` sin texturas, asi que cuentan por rol— con la receta para cubrirlo el dia que haya
    fixtures de recortes versionados.
  - **CERRADO 2026-08-03.** No se toco el reparto de caras: el defecto no esta en `i % texs.length`
    —repartir seis caras entre las imagenes que hay es lo correcto— sino en que el hero se OFRECIA con
    dos. `necesita: ['elementos']` es un booleano y con UN recorte ya alcanzaba.
  - **El numero sale de las seis caras, no de un gusto:** con N imagenes distintas cada una aparece
    ceil(6/N) veces; con N = 4 quedan cuatro caras nuevas y dos repetidas —dos tercios del cubo dice
    algo que el espectador no vio— y con N = 3 cada imagen tiene su gemela y la mitad del cuerpo es eco.
    `CARAS_MINIMAS = 4`, declarado en `meta.puede(datosEls)` y filtrado por `elegibles` ANTES de
    construir: `recortesDe` consume del reparto compartido, asi que construir un hero para descartarlo
    le sacaria recortes a la escena siguiente.
  - **Y no cuesta material real.** Medido sobre las seis capturas del repo: tres dan CERO elementos (ahi
    el cubo ya no se ofrecia) y las otras dan 5, 8 y 9 en rol. El unico caso que pierde el cubo es
    exactamente aquel en el que se veia mal, y `elegibles` entrega el hero siguiente.
  - **Compuerta nueva: `tools/heroes-check.mjs`** (E-HERO-ELEGIBLE). Declara el REQUISITO, no lee el
    mecanismo: la primera version recorria los heroes con `meta.puede` y contra el codigo viejo daba
    verde porque no habia ninguno —cero revisados, cero fallos, el defecto intacto—. Corregida, da
    ROJO contra el codigo viejo y verde contra el nuevo, y ademas cuida que el cupo no borre el hero
    del catalogo ni deje una escena sin sujeto.

- [x] **render3d/demo/heroes/vitrina.js:53**
  - **Síntoma:** La vitrina exhibe una CAPTURA de una reseña como si fuera el logo de la marca: un JPG de tipografía ajena, encima magnificado (hallazgo 2), sobre el pedestal, cuatro segundos. Es el reclamo textual citado tres veces en kit.js:1985 («las reseñas se deben de mostrar EN TEXTO, NO UNA IMAGEN»). mosaico.js:55 tiene exactamente la misma línea y el mismo agujero. Los cuatro consumidores que sí usan `text
  - **Lo dispara:** Una página que publicó testimonios Y cuyo bloque de reseña se extrajo como 'tarjeta' o 'foto' — que es lo que pasa en linear.app (llega como 'tarjeta') y en basecamp.com (el bloque de estrellas llega como 'foto'), documentado en kit.js:1991-1993. `datos.js:91` prende `vetarLaminas` en ese caso, pero
  - **Compuerta:** No. tools/testimonios-check.py mide sólo el pipeline de TEXTO (que la firma sea literal, que no se invente autor); no sabe nada de qué imagen dibuja una escena.
  - `const t = texturas && texturas.get(e.url)`

- [x] **render3d/demo/escenas/marquesina.js:80 (dentro del `for (const f of orden)` que abre en la 72)**
  - **Síntoma:** El encaje se aplica FRASE POR FRASE y no a la tira, asi que cada frase sale de un cuerpo distinto. Medido en una sola cinta: 'Precios' a 135 px y 'Todo lo que necesitas para vender online sin comisiones' a 55 px — dos veces y media — desfilando por la MISMA cama de 259 px de alto: una llena la banda y la siguiente flota en el medio. Es exactamente lo que kit.js:960-967 advierte ('achicar solo la q
  - **Lo dispara:** Una tira que mezcla rotulos cortos de navegacion con titulos completos, que es lo que devuelve repartirFrases en cualquier pagina real ('Precios' junto a 'Todo lo que necesitas para vender online sin comisiones').
  - **Compuerta:** NINGUNA. marquesina.js no declara userData.encaja en ninguna malla (solo userData.relleno en cola y cabeza), asi que E-ENCAJE no la audita; y una escala tipografica inconsistente no es un problema de encuadre, con lo cual ninguna de las cinco compuer
  - `const a = encaje(alto, t.ar, ANCHO_UTIL)`

- [x] **render3d/demo/escenas/titular.js:185-189**
  - **Síntoma:** Las dos tapas que segun el comentario de la linea 168 tienen que cortar la foto 'con filo arriba y abajo o se lee como una imagen suelta flotando' no se crean jamas. Ademas es la prueba de que quien escribio esto esperaba altoNativo >= BANDA_H (foto que DESBORDA la banda), condicion que solo se cumple con imagenes en retrato: es el mismo defecto del hallazgo 1 visto desde el otro lado, y explica p
  - **Lo dispara:** Nada: la rama es inalcanzable por aritmetica. Math.min(x, BANDA_H) - BANDA_H es <= 0 para todo x, asi que sobra vale exactamente 0 siempre y el `if` no entra nunca.
  - **Compuerta:** NINGUNA. No hay compuerta de codigo muerto, y las de encuadre solo miran mallas que existen — estas dos no llegan a construirse.
  - `const sobra = Math.max(0, (Math.min(BANDA_H, altoNativo) - BANDA_H) / 2) if (sobra > 0.001) {`

- [x] **render3d/demo/escenas/tipografia.js:234 y 238**
  - **Síntoma:** El unico margen que salva la palabra es el relleno transparente que texto() le pone al canvas (0.3 * size), que no tiene ninguna relacion con el cuadro: con una palabra corta ese relleno es el 13% del ancho y tapa el problema, con una frase larga es el 1.5% y no tapa nada. Medido en el beat 4, que es cuando w5 esta en pantalla: 'MIDE' llega a 2.455 (entra), 'Move work forward across teams and agen
  - **Lo dispara:** Una frase de mas de ~30 caracteres. Con ar > 4.8/3.2 = 1.5 el tope de alto no dispara y el plano queda fijo en 4.8; el 4.8 y el 1.18 son constantes que no salen de mundoW. 4.8 * 1.18 = 5.664 sobre un mundo de 5.625, o sea que YA sangra en reposo, antes de que la camara se acerque.
  - **Compuerta:** NINGUNA. Sin userData.encaja en el archivo, E-ENCAJE no la mira, y E-ENCUADRE da por buena cualquier malla que cruce el frustum. Con el fixture ANTHEM ('MIDE', 'ANIMA') el tope de alto dispara y la pieza entra, asi que la compuerta ni siquiera podria
  - `const m5 = medida(fr(4), ANCHA, 4.8, 3.2) w5.position.set(0, 0.25 - 0.22, 0); w5.rotation.x = Math.PI / 2; w5.scale.set(1.18, 1.18, 1)`

- [x] **render3d/demo/escenas/lista.js:71-72**
  - **Síntoma:** ALTO_ITEM es el alto del BLOQUE de textura, no el del renglon, y texto() hace crecer el canvas con la cantidad de lineas. Como todos los items comparten el mismo ALTO_ITEM, el item de dos renglones reparte ese alto entre dos y el de uno se lo queda entero. Medido sobre un bloque de tres: los items de una linea salen a 66 px de cuerpo y el de dos a 39 px, en el mismo bloque y contra el mismo riel —
  - **Lo dispara:** Una lista que mezcla frases de uno y de dos renglones. Es el caso ESPERADO: la linea 49 llama repartirFrases(MAX_ITEMS) SIN el flag soloUnaLinea (partida.js:35 si lo pasa), y el comentario de cabecera (lineas 22-25) dice que las frases de dos renglones se admiten a proposito porque el extractor entr
  - **Compuerta:** NINGUNA. Las mallas si tienen userData.encaja (linea 112), asi que E-ENCAJE comprueba que entren — y entran, porque el problema es que sobra alto, no que falte ancho. Ninguna compuerta compara el cuerpo de dos items entre si.
  - `const ALTO_ITEM = encaje(ALTO_BASE, Math.max(...texs.map(t => t.ar)), ANCHO_UTIL) const PASO = Math.max(ALTO_ITEM, ALTO_BASE * 0.62) * 1.95`

- [x] **render3d/demo/escenas/columna.js:86**
  - **Síntoma:** La tarjeta se corta contra el costado derecho. Proyectado cuadro a cuadro con la camara que mueve la propia escena, en los ONCE aires: el |x| peor en coordenadas de recorte va de 1.180 a 1.196 (el limite es 1.0), o sea 97 a 106 px fuera de pantalla por costado, en 130-253 de 227-421 mediciones pieza-cuadro. El archivo ya sabia de este choque: columna.js:289-294 quito el crecimiento del 20% de la d
  - **Lo dispara:** Un recorte de >=694 px de ancho y proporcion >=1.4 — o sea cualquier tarjeta o captura real: linear.app da 1400x845 (ar 1.657) y 1400x782 (ar 1.790). A esa resolucion `topeNitido` deja pasar 10.2 unidades y el tope que gana es ANCHO_MAX = 5.063, o sea 0.90 del cuadro. Encima, al cruzar el centro `fo
  - **Compuerta:** Ninguna, y la razon es el fixture: `tejidoFalso` genera texturas de 64 px de ALTO (encuadre-check.mjs:86, `const h = 64`), asi que `topeNitido` (kit.js:146) clampea cada pieza de prueba a 0.28-1.59 unidades contra un ANCHO_MAX de 5.063. La compuerta 
  - `const ANCHO_MAX = mundoW * 0.90 ... const anchoTope = Math.min(ANCHO_MAX, topeNitido(tex.image, ctx.W || 1080, mundoW)) ... const foco = 1 + FOCO * Math.exp(-(y * y) / (2 * SIGMA * SIGMA)) const s = f`

- [x] **render3d/demo/escenas/contraste.js:161**
  - **Síntoma:** Medido construyendo la escena: con dos verticales (800x1200 arriba) la pieza mide 2.545 y BOX_W 4.275; el filo de acento se despega del borde real del barrido 83 px en p=0.25 y 0.75, y 166 px al final. Con dos cuadradas, 26 px. Se ve como una barra de acento con bloom flotando sola sobre la cama, mientras el corte que dice estar dibujando esta en otro lado — que es justo lo que contraste.js:12-13 
  - **Lo dispara:** Que la pieza DE ARRIBA sea mas angosta que la caja. `encaje` es contain: solo llena BOX_W si su proporcion es >= BOX_W/BOX_H = 1.0688. Cualquier pieza mas vertical que eso —un logo cuadrado, una foto de retrato, la captura 864x960 (ar 0.900) de linear.app— sale con `caja.w` menor que BOX_W, mientras
  - **Compuerta:** Ninguna. El fixture SI ejerce el caso —tejidoFalso trae ar 0.6 y 1.0, las dos por debajo de 1.0688— pero no existe ninguna asercion que relacione la posicion del filo con el borde de la mascara: encuadre-check solo cuenta cuadros dentro/fuera del fru
  - `const encaje = (ar) => { const h = Math.min(BOX_H, BOX_W / Math.max(0.08, ar)); return { h, w: h * ar } } ... const ANCHO_MAX = BOX_W ... filo.position.x = -ANCHO_MAX / 2 + ANCHO_MAX * p respaldo.scal`

- [x] **render3d/demo/escenas/toro.js:397**
  - **Síntoma:** Medido con las fuentes reales: 'GEOMETRÍA, NO UN DIBUJO' (el fixture) da alto 0.303; 'GRATIS' da 1.107 (x3.7) con la caja bajando a y=-4.03; 'HOY' da 1.835 con la caja en y=-4.40; con la cadena vacia el plano mide 3.83 x 17.11 unidades. El piso real del cuadro de esta escena esta en y=-3.53 (toro.js:442), asi que con seis caracteres o menos la bajada se corta contra el borde inferior. No es un hal
  - **Lo dispara:** Una bajada corta. Sale de tools/anthem-datos.mjs:183 como `corto(det && det.detalle, 34)`, sin minimo: un feature con detalle de una o dos palabras entra tal cual, y uno SIN detalle entra como cadena vacia. `lineaMasc` dimensiona por ANCHO fijo (mundoW*0.68) y deriva el alto de `ancho / T.ar`, asi q
  - **Compuerta:** Ninguna. ANTHEM trae una bajada de 23 caracteres (datos.js:28) y la pagina pobre de verificar.mjs:231 pone `bloque: null`, con lo cual sub recibe cadena vacia y no dibuja un pixel — el caso que rompe (bajada corta PERO no vacia) no lo construye nadie
  - `const m = new THREE.Mesh(new THREE.PlaneGeometry(ancho, ancho / T.ar), mat) ... const sub = lineaMasc((D.bloque ? D.bloque.bajada : ''), mundoW * 0.68, { fuente: 'DMSans', size: 120, tracking: 0.16, a`

- [x] **render3d/demo/escenas/toro.js:405**
  - **Síntoma:** Medido: 'MIDOMINIO.COM.AR' da alto 0.300, 'BASECAMP.COM' 0.370, 'LINEAR.APP' 0.502, 'UP.AR' 0.971, 'X.CO' 1.134. Un dominio de cuatro caracteres sale TRES VECES Y MEDIA mas grande que uno de dieciseis en el mismo hueco: el rotulo chico de esquina se convierte en un segundo titular que compite con el titular. Aparte, el comentario de toro.js:421-423 dice que el anclaje 'se calcula desde el ancho re
  - **Lo dispara:** Un dominio corto. Mismo mecanismo que `sub`: `lineaMasc` fija el ANCHO en mundoW*0.5 y saca el alto de la proporcion del texto, asi que el tamaño de la 'lectura tecnica' depende de cuantos caracteres tiene el dominio del cliente.
  - **Compuerta:** Ninguna. `sello(0)` en el fixture es el dominio de ANTHEM y no se barre ningun largo alternativo; no hay compuerta de tamaño de tipografia para el motor 3D (tools/legibility-check.mjs mide otro motor, importa src/pages/Animaciones/engineCore.js). Tam
  - `const lectura = lineaMasc(sello(0), mundoW * 0.5, { fuente: 'DMSans', size: 110, tracking: 0.18, alineado: 'left', color: TIPO_BAJA() }, 0, 0.12) ... lectura.position.set(mundoW * 0.44 - (lectura.geom`

- [x] **render3d/demo/escenas/tarjetas.js:162**
  - **Síntoma:** Medido: '500K' da 1.04 y entra; '+3 mil' da 1.27, '500 mil' 1.57 y '1.250.000' 1.87 — el numero sobresale de su propia tarjeta (1.24 de ancho) hasta un 50%, pisando el borde de acento y el canto. El eco gigante del fondo, con la misma cifra, mide 7.81 / 9.60 / 11.49 contra los 7.80 de ancho visible que hay en z=-7.2: se corta contra los dos costados. Con una cifra de 12 digitos (que el tope de 10 
  - **Lo dispara:** Una cifra de mas de ~5 caracteres. El contador tambien se dimensiona SOLO por alto (0.62 en la tarjeta, 3.8 en el eco de fondo) y el ancho sale de arFin sin comparar contra el ancho de la tarjeta (CW = 1.24) ni contra el cuadro. `_limpio(valor, 10)` en backend/semantica_gratis.py:429 admite hasta 10
  - **Compuerta:** Ninguna. Las cifras no forman parte de lo que E-ENCAJE varia — su bucle solo cambia la marca y ademas manda `datos: []`. El caso POBRE usa una sola cifra de 3 caracteres ('4.9'). Y el heuristico `peor` acepta hasta mundoW*2.2 de ancho.
  - `const malla = new THREE.Mesh(new THREE.PlaneGeometry(alto * arFin, alto), mat)`

- [x] **render3d/demo/escenas/destello.js:169 (el helper, en 106-110)**
  - **Síntoma:** Medido con golpes reales: 'BE UP AND RUNNING' -> L1 'BE UP' con caja 5.32x2.31 (23% del alto del cuadro, por encima del techo de 2.00 que la propia escena se puso para el hero); 'THINK DIFFERENT' -> 2.14; 'AI FOR EVERYONE' -> 2.09; 'GO PRO' -> L1 'GO' con 4.17 (42% del cuadro). L1 vive en y=1.45, asi que a 2.31 su banda de glifos baja hasta y=0.66 y se pisa con `barraUna` (0.14 a 0.70, lineas 188-
  - **Lo dispara:** Un golpe cuyo PRIMER renglon es corto. `lineasGolpe()` parte el golpe por la mitad de las palabras, y `capa()` dimensiona por ancho: el alto sale de dividir. Es el mismo defecto que las lineas 210-233 documentan y ARREGLAN veinte lineas mas abajo — pero el techo `TECHO_HERO = mundoH * 0.20` se le pu
  - **Compuerta:** Ninguna. Peor: la propia compuerta lo construye y no lo ve — verificar.mjs:315 pone `golpe: marca`, asi que con la marca 'Q' destello se arma con L1 de 5.32x6.88 (69% del alto del cuadro) y el gate reporta OK, porque 6.88 < mundoH*0.85 = 8.50.
  - `const L1 = capa(lineasGolpe()[0], mundoW * 0.945) // capa(): new THREE.PlaneGeometry(ancho, ancho / ar)`

- [x] **render3d/demo/verificar.mjs:315**
  - **Síntoma:** La compuerta cuyo encabezado dice 'la composicion tiene que aguantar nombres que no midan lo que mide ANTHEM' no mide UNA SOLA malla de `tarjetas`, que es la escena que dibuja D.marca tres veces (titulo linea 191, pieI linea 229) y una de ellas sin ningun tope de ancho. Lo mismo le pasa a cualquier escena que se apague por falta de material: el gate de marcas largas y el gate de pagina pobre se an
  - **Lo dispara:** El propio bucle E-ENCAJE. `datos: []` hace que `datosDeLaPagina()` devuelva vacio y que `esDemo` sea false (datos.js:93, porque el objeto no es ANTHEM), asi que tarjetas.js:131 sale por `return { g, tl, vacia: true }`. Comprobado construyendo la escena con la config exacta del gate: con 'Q', 'CONSTR
  - **Compuerta:** Es la compuerta. El agujero es que las cuatro marcas de prueba viajan con `datos: []` y `cta: null`, o sea con la pagina mas pobre posible, cuando lo que se quiere probar es el nombre.
  - `configurarDatos({ ...ANTHEM, marca, frases: [marca], datos: [], cta: null, golpe: marca })`
  - **CERRADO 2026-08-03, y la ficha estaba en parte VENCIDA.** La linea que cita ya no existe: el gate
    hoy manda `datos: ANTHEM.datos` y un dominio derivado del nombre. Comprobado midiendo que escenas ve
    el bucle E-ENCAJE: son 15, y `tarjetas` y `cierre` estan entre ellas — o sea que el sintoma central
    ('no mide UNA SOLA malla de tarjetas') ya no ocurre.
  - **Quedaba el `cta: null`**, que era el ultimo pedazo. Puesto un CTA real, el peor ancho de `cierre`
    con la marca 'Q' pasa de 1.56 a 1.59 unidades: es la pildora entrando en la cuenta. Es poco, y esa
    es justamente la prueba de que antes no estaba — si no hubiera movido nada, se sacaba.

- [x] **render3d/demo/escenas/cierre.js:273**
  - **Síntoma:** Medido: desde 33 caracteres de dominio la pildora mide 5.72 en un cuadro de 5.625 y se corta contra los dos bordes; con 'construccionesdelsurpatagonico.com.ar' (37) da 6.18, un 10% de sangrado por lado sobre el unico elemento de la pieza que pide una accion. Con 'VER EL MOTOR' da 2.74 y entra sobrado. El mismo archivo SI acota la fila de marcas del pie veinte lineas antes: `if (total > 4.9) gMarca
  - **Lo dispara:** Que la pagina no tenga CTA. `ctaTxt` (linea 264) cae al dominio, y el dominio viaja SIN tope: tools/anthem-datos.mjs:231 lo saca crudo de `new URL(pm.url).hostname`, mientras que el CTA de verdad si esta capado a 20 caracteres (anthem-datos.mjs:228). La pildora se construye a la medida del texto y e
  - **Compuerta:** Ninguna. E-ENCAJE pasa `cta: null` en las cuatro marcas (verificar.mjs:315) y ANTHEM.dominio es cadena vacia, asi que `hayCta` queda en false y la pildora NI SE AGREGA al grupo durante todo el bucle de marcas. El caso POBRE tambien manda `cta: null` 
  - `const pillW = ancho(cta) + 1.15`

- [x] **render3d/demo/heroes/prisma.js:35 y :96**
  - **Síntoma:** Los dos anillos exteriores salen cortados por los dos costados durante practicamente toda la escena. Medido vertice a vertice en el tramo sostenido: el exterior llega a x=1.313 en coordenadas de recorte (31% pasado el borde) y esta cortado en 60 de sus 75 cuadros; el del medio llega a 1.121 y esta cortado en 71 de 76. El interior (0.913) entra entero siempre. O sea que de las tres referencias que 
  - **Lo dispara:** Cualquier pieza que caiga en prisma — es el hero de respaldo cuando la captura fallo, el sitio bloqueo al bot o la pagina esta detras de login. No depende del contenido: depende de la FORMA del cuadro. El radio sale de mundoH (10) en un encuadre 9:16 donde lo que recorta es mundoW (5.625). Los tres 
  - **Compuerta:** NINGUNA. E-ENCAJE-REAL (tools/encuadre-check.mjs:217) solo mide contencion en mallas marcadas `userData.encaja`, y prisma no marca ninguna. E-ENCUADRE-NUNCA/CASI usa `_frustum.intersectsBox` (encuadre-check.mjs:129): un anillo MAS GRANDE que el cuadr
  - `const R = mundoH * 0.17 ... new THREE.TorusGeometry(R * (1.45 + i * 0.30), R * 0.011, 8, 96)`

- [x] **render3d/demo/heroes/gota.js:130 (con el radio de :47)**
  - **Síntoma:** Una de las dos motas se anima entera fuera del cuadro. Medido vertice a vertice: en artesanal/semilla 17 la mota esta COMPLETAMENTE invisible en el 100% de los cuadros del tramo sostenido (93 de 93) y llega a x=1.332; la otra, 86%. En al menos 7 de las 50 combinaciones (aire x semilla) probadas hay una mota invisible mas de la mitad de la escena. El comentario de gota.js:121-122 dice que existen p
  - **Lo dispara:** La SEMILLA del spec, en cualquier pagina. El radio de orbita queda entre 2.87 y 3.52 contra un semiancho de 2.8125 (2.71 con el dolly 1.25 de jugueton), y la fase inicial `m.userData.f = rnd() * 6.28` decide donde arranca la mota. En 8 beats la orbita solo recorre 1.2-2.0 radianes, asi que una mota 
  - **Compuerta:** NINGUNA, y por dos motivos a la vez. (1) La regla por objeto de encuadre-check.mjs:281 exige `Math.max(tam.x, tam.y) >= mundoW * 0.12 = 0.675` y la mota mide entre 0.28 y 0.46 de diametro: queda por debajo del umbral que existe para no acusar a las m
  - `m.userData.r = R * (1.55 + rnd() * 0.35) // con const R = mundoH * 0.185`

- [x] **render3d/demo/heroes/prisma.js:145-147**
  - **Síntoma:** Sobre una pagina blanca el hero de respaldo pinta todo el cuadro de un velo lavanda que no baja nunca. Es la misma familia del defecto ya documentado en enjambre.js:263-273 ("la escena salia COMPLETAMENTE VACIA") pero al reves: en vez de desaparecer, invade. Y es una inconsistencia dentro del propio catalogo, no una opinion: los otros tres heroes con halo SI lo bajan a la mitad en claro — cinta.js
  - **Lo dispara:** Una pagina CLARA, o sea con `bgLum > 0.42` (adn.js:105) — main.js:474 dice que son cinco de cada siete paginas reales. El halo no tiene rama de polaridad: los tres valores (0.36 / 0.20 / 0.34) son fijos. El plano mide R*9 = 15.3 unidades (prisma.js:108), 2.7 veces el ancho del cuadro, y el `smoothst
  - **Compuerta:** NINGUNA, y el agujero es estructural: NINGUNA compuerta construye un hero en mundo claro. verificar.mjs:222 y encuadre-check.mjs:182 pasan `claro: false` fijo, y ninguno de los once aires declara `claro` (lo pone `personalizar()` desde el ADN de la p
  - `tl.to(halo.material.uniforms.uF, { value: 0.36, duration: b(1.4), ease: E.frena(2) }, b(0.5))`

- [x] **render3d/demo/heroes/vitrina.js:71**
  - **Síntoma:** ANCHO_MAX = mundoW * 0.56 = 3.150 unidades = 605 px de pantalla. Un logo de 176 px se dibuja a 605: x3.44, muy por encima del techo de 1.4x que el propio kit fija en kit.js:146 y explica en kit.js:144-145. Y es el peor lugar posible para que pase: el hero deja el logo centrado, quieto y con reflejo durante la escena entera, o sea el objeto que mas se mira. vitrina NO llama a topeNitido — de los se
  - **Lo dispara:** Un logo capturado chico. kit.js:138 documenta el caso medido: el logo de linear.app se captura con 176 px de ancho. vitrina pide ROLES = ['logo', 'tarjeta', 'foto'] (vitrina.js:28) y toma el PRIMERO que cargue, asi que el logo es su entrada tipica.
  - **Compuerta:** Ninguna. E-ENCAJE mide TAMAÑO contra el cuadro, nunca resolucion contra tamaño; encuadre-check.mjs solo pregunta si el objeto se cruza con el frustum. No existe compuerta de ampliacion en tools/ (busque topeNitido y MAG_MAX en tools/*.mjs: cero resul
  - `const altoLogo = Math.min(ALTO_MAX, ANCHO_MAX / ar)`

- [x] **render3d/demo/heroes/mosaico.js:103**
  - **Síntoma:** ANCHO_UTIL * AIRE = mundoW * 0.95 = 5.344 unidades = 1026 px de pantalla. Un logo de 176 px sale a 1026: x5.83 sobre su resolucion, cuatro veces por encima del techo de 1.4x del kit. La banda es la pieza mas grande de la composicion y la unica que identifica a la marca, o sea la que peor aguanta los bordes deshechos. Ninguna de las dos llamadas a planoRecorte del hero (mosaico.js:125 y :206) pasa 
  - **Lo dispara:** Lo mismo: un logo chico. mosaico pide ROLES = ['logo', 'tarjeta', 'foto', 'cta'] (mosaico.js:32) y la 'banda destacada' es piezas[0] — el comentario de mosaico.js:196 lo dice, 'El relevo NUNCA toca la banda destacada (el logo)'. La banda cruza el ancho entero.
  - **Compuerta:** Ninguna, por la misma razon que vitrina: no hay compuerta de resolucion en el motor. Ademas ningun hero declara `userData.encaja` (0 apariciones en heroes/ contra 13 en escenas/), asi que los 18 heroes solo tienen encima el heuristico suelto de verif
  - `? Math.min(ALTO_UTIL * 0.46, (ANCHO_UTIL * AIRE) / arBanda)`

- [x] **render3d/demo/kit.js:968**
  - **Síntoma:** Es la unica funcion del kit que responde '¿entra?' y responde por UN SOLO EJE: solo baja el alto hasta que el ancho quepa en `anchoUtil`, y no existe ninguna hermana que encaje contra el cuadro entero. Consecuencia comprobable: SIETE composiciones se escribieron su propio 'contain' de dos ejes al lado — contraste.js:58 (`const encaje = (ar) => { const h = Math.min(BOX_H, BOX_W / Math.max(0.08, ar)
  - **Lo dispara:** Nada de una pagina real lo rompe HOY, y lo digo asi a proposito: los nueve que la usan (bandera.js:60, cita.js:100, gancho.js:98, hero.js:84, lista.js:71, marquesina.js:80, partida.js:83, sello.js:83, titular.js:211) acotan el eje vertical por su cuenta con constantes (MAX_LINEAS = 3 en gancho y tit
  - **Compuerta:** Parcialmente E-ENCAJE-ENTERO (verificar.mjs:395), pero solo sobre las mallas que se declaran: 13 declaraciones de `userData.encaja` en 21 escenas y CERO en los 18 heroes. Lo demas queda con el heuristico, que ademas es flojo (ver el renglon de verifi
  - `export const encaje = (altoBase, arMax, anchoUtil) => altoBase * arMax > anchoUtil ? anchoUtil / arMax : altoBase`

- [ ] **render3d/demo/kit.js:805**
  - **Síntoma:** `marco()` calcula en kit.js:488 el rectangulo util del aire (`const X = mundoW / 2 * m[0], Y = mundoH / 2 * m[1]`) y lo DEVUELVE — y ninguna escena lee X ni Y. Las dos unicas que llaman a marco() (apertura.js:280, cierre.js:210) usan solo `.piezas` y `.tipo`. El ancho util del CONTENIDO sigue escrito a mano y distinto en cada escena: mundoW por 0.80 (hero, partida), 0.84 (bandera, gancho), 0.86 (c
  - **Lo dispara:** Hoy no lo dispara ningun contenido: ningun aire declara `margen`, asi que MOB.margen es siempre [0.87, 0.85] (kit.js:469). Lo dispararia el dia que un aire lo declare, y ese es justo el parametro que el aire existe para tener.
  - **Compuerta:** Ninguna, y no es un caso que una compuerta pueda cazar mirando un cuadro: es un parametro declarado que ningun consumidor lee, la misma clase de defecto que kit.js:34-39 documenta para `camara` y kit.js:448-451 para `transiciones`.
  - `return { g, piezas, X, Y, tipo }`
- SEGUIMIENTO de kit.js:805 (2026-08-04): **confirmado que X/Y no los lee nadie, medido que hoy no
  produce un defecto visible, y aparecio una inconsistencia entre las dos escenas que si dibujan marco.**
  - `margen` NO esta muerto: `marco()` lo usa para colocar sus piezas. Lo que nadie lee es el
    rectangulo DEVUELTO, o sea la referencia para el CONTENIDO. Son dos cosas distintas y la ficha las
    junta.
  - **Medido construyendo las dos escenas que llaman a `marco()` en los 11 aires** (9 dibujan marco;
    `bienestar` y `jugueton` declaran `marco: 'nada'`), comparando el ancho de su tipografia y sus
    recortes contra el X del rectangulo:
    - `cierre` **lo respeta** en los 9: 2.20 a 2.37 contra X = 2.45.
    - `apertura` **lo cruza en los 9**: 2.87 a 2.98, o sea entre **17% y 22% mas ancho** que el
      rectangulo que su propio marco dibuja.
  - **Y no se ve como un error.** Mirado el cuadro 55 de un render real de tailwindcss y medido en
    pixeles: el nombre va de x=42 a x=1062 sobre 1080, o sea **42 px de margen a la izquierda y 17 a la
    derecha** — apretado y asimetrico, pero NO cortado. Se pasa de la regla del marco 27 px por
    izquierda y 52 por derecha, y eso se lee como tipografia grande POR ENCIMA del marco, no como un
    desborde.
  - Queda ABIERTO como lo que es: un valor devuelto que nadie consume y dos consumidores que tratan el
    mismo rectangulo distinto. No hay parche que aplicar hoy —cablear el contenido al rectangulo
    cambiaria el ancho de las 25 composiciones escritas a mano, que es un cambio de diseno— y el dia
    que un aire declare `margen` la inconsistencia se vuelve visible en `apertura` y no en `cierre`.

- [ ] **render3d/demo/verificar.mjs:410**
  - **Síntoma:** El heuristico que deberia atrapar 'una pieza se come el cuadro' tiene dos huecos medibles. (1) El umbral de ancho es mundoW * 2.2 = 12.38 unidades: un renglon que sangra el 120% del cuadro por los dos lados pasa. (2) verificar.mjs:404 (`if (!peor || t.y > peor.y) peor = { x: t.x, y: t.y }`) se queda con UNA sola pieza, la mas ALTA, y despues comprueba SU ancho — asi que una linea ancha y baja, que
  - **Lo dispara:** Cualquier tipografia o recorte que se pase del cuadro sin llegar a esos umbrales: hasta 12.38 unidades de ancho (2376 px en un cuadro de 1080, o sea 220% del cuadro) y 8.50 de alto pasan en verde.
  - **Compuerta:** Es la compuerta. Y por eso los dos renglones de arriba (cierre 7.22 de alto, y cualquier recorte ampliado) le pasan por debajo.
  - `ok(peor.y <= mundoH * 0.85 && peor.x <= mundoW * 2.2,`
- SEGUIMIENTO de verificar.mjs:410 (2026-08-04): **E-ENCAJE ahora rota aires, y el tope NO se baja.**
  - El chequeo barria cuatro marcas con UN SOLO aire, y la cara display es el factor mas grande del
    ancho (39% entre una angosta y una ancha sobre el mismo texto). Ahora el aire rota con la marca: el
    eje pasa de 1 a 11 al mismo costo, con el mismo modismo que ya se uso en `encuadre-check`.
  - **Es un intercambio, no una mejora pura, y queda escrito en el codigo:** cada combinacion (escena,
    marca) se mide ahora con UN aire en vez de siempre el mismo. Medido: el ancho maximo que ve la
    compuerta pasa de 8.25 a 7.80 u, porque la combinacion que daba 8.25 corre bajo otro aire. Se
    elige la amplitud porque la contencion con el producto cartesiano completo ya la cubre
    `encuadre-check` con sus 407 construcciones.
  - **El tope de ancho sigue en 2.2 y no se baja**, porque el 2.33 de `destello` quedo confirmado como
    transitorio deliberado (su malla mide 0.96 del cuadro y un tween la escala 2.429x).
  - **Y esto destapo un no-op que estaba en el repo desde antes:** `configurar(null)` hacia
    `if (!aire) return`, o sea NADA, y tres lugares lo llamaban creyendo que restauraba el vocabulario
    —`verificar.mjs:708` con el comentario 'se deja el vocabulario como estaba' y `adn-check.mjs:282`—.
    No molestaba porque los dos lo hacen al final de su archivo, pero al rotar aires en el medio el
    BEAT del ultimo se filtraba al chequeo siguiente: **29 escenas fallando por 'se come la escena
    siguiente' con timelines perfectamente bien**, y el sintoma apareciendo en la escena de DESPUES de
    la que rotaba. Ahora `configurar(null)` restaura BPM, BEAT, LOOK, CLARO, AIRE y MOB de fabrica.
- SEGUIMIENTO de verificar.mjs:410 (2026-08-03): **el hueco (2) esta cerrado, el (1) NO, y a proposito.**
  - El hueco de los EJES —guardar una sola pieza, la mas alta, y despues comprobar SU ancho— esta
    arreglado: ahora se guarda el peor de cada eje por separado. Probado por inyeccion: una malla con
    textura de 12.50 x 0.50 metida en `tarjetas` (que ya tiene otra de 3.80 de alto) pasa en VERDE con la
    compuerta vieja y falla con la nueva.
  - El tope de ancho **no se bajo**, y no por olvido. Medido barriendo los 11 aires y 4 marcas (748
    combinaciones): con el aire por omision el maximo real es 1.47 cuadros, pero `destello` llega a
    **2.33 cuadros** en deportivo, jugueton y nocturno. O sea que el 2.2 no es tan holgado como dice la
    ficha, y bajarlo a ojo rompe una escena. Ademas aparecio algo que la ficha no menciona: **E-ENCAJE
    corre con UN SOLO aire** (`configurar()` solo se llama en E-EASE), asi que si barriera aires ya
    estaria en rojo hoy. Los 13.12 u de `destello` son un TRANSITORIO de su golpe de escala —la escena
    compone a `mundoW * 0.945`— o sea que hay que decidir si ese golpe es legitimo antes de tocar el
    numero. Queda abierto con la medicion escrita, que es lo que pide el metodo: un tope que no se puede
    derivar no se elige a ojo.

- [x] **render3d/demo/datos.js:196-206 (repartirFrases)**
  - **Síntoma:** La falta de material no sale como escena vacia (que se ve y se arregla) sino como TEXTO REPETIDO dentro de la misma escena: la lista enumera A/B/A, las dos mitades de `partida` dicen lo mismo, las dos cintas de la marquesina cruzan la misma frase. Ademas el comentario de datos.js:203-204 dice que el cursor avanza por el pozo COMPLETO y el codigo avanza por el FILTRADO (`_cursor += Math.min(cuantas
  - **Lo dispara:** El mostrador devuelve SIEMPRE exactamente `cuantas` items mientras quede un solo elegible: si se piden 5 y hay 2, devuelve 5 = [A,B,A,B,A] y suma 3 a `repetidas`. Entonces las guardas propias de las escenas —lista.js:50 `if (items.length < MIN_ITEMS)`, partida.js:36 `if (fr.length < 2)`, marquesina.
  - **Compuerta:** Ninguna. `repetidas` se exporta en datos.js:162 y —grep en todo el repo— NADIE la lee; lo mismo `recortesRepetidos` (kit.js:2055). El comentario de datos.js:159-160 dice 'avisa por `repetidas` para que una compuerta pueda medirlo' y esa compuerta no 
  - `if (!elegibles.length) return [] const out = [] for (let k = 0; k < cuantas; k++) { const i = (_cursor + k) % elegibles.length if (_cursor + k >= elegibles.length) repetidas++ out.push(elegibles[i]) }`
  - **CERRADO 2026-08-03.** El archivo se contradecia a si mismo: `datos.js:173` documenta que
    '`cuantas` es un maximo: si hay menos, devuelve menos, y la escena decide si le alcanza' —que es el
    contrato contra el que estan escritas `lista.js:50` y `partida.js:36`— y el codigo devolvia SIEMPRE
    exactamente lo pedido. Gana el comentario.
  - **Y no contradice el 'dar la vuelta' de las lineas 157-160**, que son dos situaciones distintas
    resueltas con el mismo codigo: (a) el CURSOR paso del final porque las escenas anteriores se
    llevaron las frases —repetir ahi es deliberado y sigue igual— y (b) se piden mas de las que hay, que
    mete la misma frase dos veces EN LA MISMA ESCENA. Ahora el largo se limita a `elegibles.length`, asi
    que (b) no puede pasar y (a) no cambio.
  - **Medido antes y despues.** Con 2 frases y un pedido de 5: el codigo viejo devuelve
    `[Alfa, Beta, Alfa, Beta, Alfa]` (5 items, 2 distintos) y el nuevo devuelve `[Alfa, Beta]`, con lo
    cual la guarda de la escena por fin se cumple y la escena se declara vacia. Con pagina rica, los dos
    devuelven lo mismo.
  - **Compuerta nueva: E-SIN-ECO**, anexada a `tools/guion-check.mjs` — que es la que el comentario de
    `datos.js:159-160` prometia ('avisa por `repetidas` para que una compuerta pueda medirlo') y no
    existia. Exige el invariante, no la implementacion: 4 paginas x 4 pedidos, y lo que entra en una
    escena no puede tener eco. Contra el codigo viejo da ROJO en 14 casos.

- [x] **render3d/demo/guion.js:320 contra render3d/demo/datos.js:193**
  - **Síntoma:** El cupo cree que hay una frase mas de las que hay y deja entrar una sedienta de mas; el mostrador no se niega, da la vuelta, y dos escenas dicen la misma linea. Medido sobre stripe-com, 180 guiones, SIN contar lo que bebe el hero: 75 piezas (42%) tienen una frase repetida en dos escenas distintas. Ejemplo exacto: seed5/20s da `gancho>apertura>rafaga>partida>cierre` y 'Global payment acceptance' sa
  - **Lo dispara:** El cupo reparte el pozo con `nFr`, pero el mostrador saca del pozo la frase que el golpe ya va a decir: `const sinGolpe = golpe ? pozo.filter(f => _norm(f) !== golpe) : pozo`. Y el golpe SE ELIGE de los mismos titulos de feature que las frases (tools/anthem-datos.mjs:222-226), asi que casi siempre E
  - **Compuerta:** Ninguna. guion-check no simula el mostrador: solo mira que escena entra, nunca que texto le toca. E-GUION-MATERIAL (guion-check.mjs:128-132) compara contra una COPIA a mano de seis requisitos (lineas 73-80) que es subconjunto del REQUISITOS real, asi
  - `const nFr = (d.frases || []).filter(Boolean).length`

- [ ] **render3d/demo/escenas/hero.js:76 contra render3d/demo/guion.js:319 y 334**
  - **Síntoma:** Medido sobre awwwards-com, 180 guiones: la misma frase aparece en dos escenas distintas en 93 piezas (52%) si el hero bebe, y en 0 si no bebe. O sea que TODA la repeticion de texto de esa pagina la produce el rotulo del hero. Ejemplo: seed20/20s da `gancho>marquesina>destello>hero>cierre` y 'Submit your website' sale en la marquesina y otra vez debajo del objeto. En una pagina pobre a 30 s el plan
  - **Lo dispara:** `hero` bebe una frase del mostrador cuando el objeto es de geometria pura (hero.js:74-78, solo los `necesita: ['nada']`, que son 12 de los 18 del registro), y NO figura en SEDIENTAS ni en APETITO: el cupo reparte el pozo entre cinco escenas ignorando a la que mas veces aparece. Encima es el relleno 
  - **Compuerta:** Ninguna. El gate no construye escenas, asi que no ve el consumo; y el unico contador que existiria —`repetidas`— no lo lee nadie.
  - `const fr = (repartirFrases(1) || [])[0]`
- SEGUIMIENTO de hero.js:76 (2026-08-03): **la atribucion de la ficha no se reproduce, y el culpable
  real era otro.** Se construyeron 105 piezas con los 7 fixtures reales (compuerta nueva
  `tools/eco-check.mjs`), midiendo que frases se lleva cada escena del mostrador:
  - **`hero` aparece 89 veces y bebe CERO.** `rotular` solo bebe cuando el objeto elegido es de
    geometria pura, y con paginas que traen material gana casi siempre un hero que muestra la pagina.
    La ficha midio awwwards-com, que no esta entre los fixtures; el mecanismo existe, pero su peso es
    mucho menor de lo que dice.
  - **El que bebia sin que nadie lo contara era `titular`:** 75 apariciones, 2 frases cada vez = 150
    frases, mas que ninguna otra escena (marquesina 126, tipografia 90). Y peor: **pedia 2 y mostraba
    1** —las pedia para elegir la mas larga— asi que tiraba 75 frases de un pozo que en una landing
    real tiene cuatro.
  - **Medido antes y despues:** la misma frase en dos escenas pasa de **40.0% a 12.4%** de las piezas
    con solo hacer que `titular` pida una, y sin mover una sola aparicion de ninguna escena.
  - **Lo que se probo y NO se dejo puesto:** meter `titular` en el cupo de `guion.js` baja el eco a
    1.9%, pero `marquesina` cae de 42 apariciones a 2 — se cambia un defecto que se lee por una escena
    que desaparece. Y 'corregir' el apetito de `marquesina` de 4 a 3 (su consumo real) SUBE el eco a
    18.1%: la frase de mas que reservaba funcionaba como margen. Las dos cosas quedan medidas en el
    codigo para que la decision se tome con numeros.
  - Queda ABIERTO el hallazgo original (el hero sigue bebiendo sin contarse), con el trinquete de
    `eco-check` en 13% para que el numero no pueda subir.

- [x] **render3d/demo/guion.js:87**
  - **Síntoma:** `repartirFrases(2, true)` devuelve ['Submit your website', 'Submit your website'] y la guarda de partida.js:36 no se dispara porque el mostrador nunca devuelve de menos: el cuadro partido muestra la MISMA linea arriba y abajo. Es exactamente lo que el encabezado de la escena declara imposible (partida.js:18-19: 'SIN DOS FRASES NO HAY PAR ... Se declara vacia'). Medido: 16 de 180 guiones de awwward
  - **Lo dispara:** El requisito cuenta las frases de una linea sobre `d.frases` ENTERO; la escena pide `repartirFrases(2, true)` (partida.js:35) y ahi las de una linea se cuentan sobre el pozo YA sin la frase igual al golpe (datos.js:193-195). Fixture awwwards-com: frases = ['Site of the Day', 'Submit your website', '
  - **Compuerta:** Ninguna. `partida` ni siquiera esta en la copia de requisitos de guion-check.mjs:73-80, y el gate no simula el mostrador.
  - `partida: (d) => (d.frases || []).filter(f => f && !/\n/.test(String(f))).length >= 2,`

- [x] **render3d/demo/guion.js:53 contra render3d/demo/escenas/tipografia.js:187**
  - **Síntoma:** La escena de mensaje mas larga del catalogo (8 beats, el doble que las otras) no se elige jamas en esas paginas. Medido: `tipografia` aparece en 0 de 180 guiones de no-latina, y tambien en 0 de 180 de una pagina sintetica con 3 frases y material de sobra (cifras, recorte, testimonio, tira). Los beats se los queda el relleno hero/toro/sello. Es el mismo defecto que ya tuvieron `pantalla` y `lista`:
  - **Lo dispara:** El comentario que justifica el 4 (guion.js:40-52) describe una escena que ya no existe: decia que tipografia.js:151-201 pedia `frase(0)` hasta `frase(6)` y dejaba tres slots vacios, y que el arreglo era que la escena se compusiera con las frases que hay. La escena YA hace eso: `const mias = repartir
  - **Compuerta:** No. guion-check tiene `tipografia` en su copia de requisitos (guion-check.mjs:74) con el MISMO numero copiado a mano, asi que mide la misma creencia; y sus tres paginas de prueba dan 4, 4 y 1 frases — ninguna cae en el escalon de 3, que es justo dond
  - `tipografia: (d) => (d.frases || []).filter(Boolean).length >= 4,`

- [x] **tools/guion-check.mjs:27-34**
  - **Síntoma:** El gate corre 324 guiones sobre un catalogo que no es el del motor: `marquesina` nunca entra en un plan del gate (por eso su requisito faltante es invisible) y `gancho` tampoco, aunque en produccion es fija y se come 4 beats del presupuesto — o sea que las mediciones de E-GUION-DURACION y E-GUION-VERSIONES no describen a la pieza que se renderiza. El gate imprime 'GUION OK'.
  - **Lo dispara:** La tabla escrita a mano quedo en 18 escenas y el catalogo real (escenas/index.js:39) tiene 20: faltan `marquesina` y `gancho`. Es exactamente la desincronizacion contra la que avisa el comentario de guion-check.mjs:23-26 ('ESTA LISTA SE DESINCRONIZO UNA VEZ Y NADIE SE ENTERO'), ocurrida por segunda 
  - **Compuerta:** Se caza sola y no lo hace: E-GUION-ESCENA-MUERTA y E-FAMILIA-DECLARADA recorren CAT.keys(), asi que una escena ausente de CAT es invisible para las dos comprobaciones que existen justamente para cazar escenas olvidadas.
  - `const CAT = new Map([ ['apertura', { beats: 6 }], ['hero', { beats: 8 }], ['toro', { beats: 6 }], ... ['cierre', { beats: 6 }], ['mesa', { beats: 6 }], ['bandera', { beats: 6 }], ])`

- [x] **render3d/demo/escenas/destello.js:244**
  - **Síntoma:** Medido reproduciendo el arnes de encuadre-check y aplicando `entraEntera` a las dos mitades del hero: |x| llega a 1.182 en los cuadros 2-5 (18% pasado el borde, con la mascara ya revelando el 41% desde la izquierda, o sea con las primeras letras dibujadas y cortadas) y se sostiene en 1.025-1.034 DIEZ cuadros seguidos (30-39, beats 2.07-2.69) por el desplazamiento x de +/-0.15 del segundo golpe (li
  - **Lo dispara:** La declaracion queda apagada salvo que la SEGUNDA linea del golpe contenga el nombre de la marca. Con ANTHEM —lo unico que usa encuadre-check— marca='ANTHEM' y lineaHero='UNA PLANTILLA': falso. Con las cuatro marcas de verificar.mjs:314, `golpe: marca` hace que lineasGolpe() devuelva ['Q',''], ['GO'
  - **Compuerta:** E-ENCAJE-REAL (encuadre-check.mjs:252) las cazaria a las dos —pide mas de 2 cuadros fuera y hay 4 y 10— pero solo corre sobre mallas declaradas, y la declaracion esta detras de una condicion que ningun fixture puede encender. La compuerta esta armada
  - `if (tocaLaMarca) { mArriba.userData.encaja = true; mAbajo.userData.encaja = true }`

- [x] **render3d/demo/datos.js:170**
  - **Síntoma:** Verificado ejecutando el mismo orden: con el reparto sucio `titular` escribe ['NO ES UNA','PLANTILLA','ANTHEM'] (2 renglones); con el reparto limpio escribe ['HECHO A MANO','PARA MEDIR A','LA MÁQUINA','ANTHEM'] (3 renglones del claim, la cadena de copy MAS LARGA del sistema). O sea que la rama del claim de titular.js:52 —la que compone tres renglones y es la que mas riesgo tiene de no entrar— no s
  - **Lo dispara:** encuadre-check.mjs no llama nunca a esta funcion ni a `reiniciarRecortes()`: construye los 37 modulos x 11 aires seguidos con el mostrador sucio (verificar.mjs si las llama, en 239, 326 y 441; main.js en 451-452; el comentario de kit.js:2052 afirma que 'los arneses' lo hacen antes de cada construcci
  - **Compuerta:** Ninguna. Ademas el `_cursor` de frases queda a la deriva a lo largo de las 407 construcciones, asi que el contenido que recibe cada escena depende de su posicion en el bucle: el mensaje de fallo dice '[aire X]' para que se pueda reproducir, y reprodu
  - `export const reiniciarReparto = () => { _cursor = 0; repetidas = 0; _claimUsado = false }`

- [x] **tools/guion-check.mjs:27**
  - **Síntoma:** Un modo estructural entero sin cobertura — justo el que guion.js:365 llama 'EL CAMBIO QUE MAS SE VE DE TODO EL GUION' — y una escena de texto que puede salir al video pegada a su gemela sin que E-GUION-FAMILIA lo mire. La cifra que la compuerta imprime como respuesta al reclamo ('208 estructuras distintas') tambien esta mal: con el catalogo real da 234.
  - **Lo dispara:** El catalogo copiado a mano volvio a desincronizarse: tiene 18 escenas y `render3d/demo/escenas/` exporta 20 metas. Faltan `gancho` (beats 4) y `marquesina` (beats 6). Como `guionDe` recibe ESE Map, `puede('gancho')` es falso -> gancho nunca entra en FIJAS -> la rama `sinApertura` de guion.js:392 (sa
  - **Compuerta:** Ninguna, y es la segunda vez: el archivo documenta en sus lineas 23-26 que ya midio 10 escenas cuando habia 16, y advierte que el sintoma seria este mismo mensaje con un numero viejo. El arreglo estable es leer `meta.beats` de los archivos como hace 
  - `const CAT = new Map([`

- [x] **tools/guion-check.mjs:61**
  - **Síntoma:** El gancho, `sinApertura` y la interaccion claim/titular del reparto quedan sin medir. E-GUION-ESCENA-MUERTA no puede avisar de nada de esto porque `presencia` se arma sobre las claves del CAT (linea 169), que no incluye gancho.
  - **Lo dispara:** Ninguna de las tres PAGINAS de prueba declara `claim`, y REQUISITOS.gancho (guion.js:31) es `(d) => !!String(d.claim || '').trim()`. Medido agregando gancho al catalogo: sigue apareciendo en el 0.0% de los guiones. O sea que la escena que el guion define como la unica capaz de abrir un reel en un fe
  - **Compuerta:** E-GUION-ESCENA-MUERTA lo diria (mide 0.0% < 1%) en cuanto gancho entre al CAT — pero mientras no este, la regla no puede ni mirarlo. Faltan las dos cosas: la escena en el catalogo y un `claim` en al menos una pagina de prueba.
  - `pobre: { marca: 'Q', frases: ['a'], datos: [], golpe: null },`

- [x] **render3d/demo/verificar.mjs:330**
  - **Síntoma:** Un texto que se corta en los costados durante su entrada y despues se acomoda: exactamente lo que se ve en el video y no en una captura. Y el barrido de aires no lo tapa, porque verificar nunca llama `configurar(aire)` en su bucle de escenas: mide con UN vocabulario tipografico de 11 (su propio comentario en encuadre-check.mjs:48-50 mide Oswald-700 en 837 y Archivo-900 en 1167 sobre el mismo texto
  - **Lo dispara:** Todo lo que sobresale en la ENTRADA o en la SALIDA. E-ENCAJE mide UN solo instante (72% de la escena), asi que un overshoot de entrada o un crecimiento de salida no existen para el. En destello el heroWrap arranca en scale 1.10 (destello.js:340) sobre un ancho pedido al 96% y termina en 2.40 (linea 
  - **Compuerta:** Solo encuadre-check barre tiempo (30 fps) Y aires Y proyecta con la camara — pero unicamente sobre las 16 mallas declaradas. El cruce que hace falta (contenido extremo x 11 aires x todos los cuadros) no lo cubre ninguna de las dos.
  - `rm.tl.time(mod.meta.beats * BEAT * 0.72, false) // ya asentada, antes de la salida`

- [x] **tools/encuadre-check.mjs:311**
  - **Síntoma:** Vuelve a pasar la pauta del toro: seis eventos animados que el espectador no ve, con la compuerta verde. Solo se caza si la pieza no roza el cuadro en ninguno de los ~60 cuadros y ademas esta sola en su grupo o todo el grupo esta afuera.
  - **Lo dispara:** Una pieza fuera de cuadro que tenga UN hermano bien colocado en el mismo grupo. El grupo se juzga por el MAXIMO de sus hijos, no por la suma ni por el peor: si un hermano esta en cuadro el 100% del tiempo, frac = 1 y ni E-ENCUADRE-NUNCA ni E-ENCUADRE-CASI dicen nada aunque los otros veinte hermanos 
  - **Compuerta:** La propia E-ENCUADRE, degradada. Ninguna otra mira si algo animado se ve.
  - `g.dentro = Math.max(g.dentro, e.dentro)`
  - **CERRADO 2026-08-03.** Regla nueva **E-ENCUADRE-MUDOS**: no reemplaza el `Math.max` —que sigue
    sirviendo para las dos reglas de arriba— sino que agrega la pregunta que faltaba, cuantos miembros
    del grupo NO entran en el cuadro ni una vez.
  - **El umbral sale de la medicion.** Barriendo las 407 construcciones, los unicos grupos con miembros
    mudos son `columna` (1 de 19 juzgables = 0.053) y `tipografia` (3 de 43 = 0.070). Se pide mitad o
    mas del grupo, que esta siete veces por encima del peor caso legitimo de hoy, y un minimo de 2
    mudos —uno grande ya lo caza la regla por malla, y uno chico es un borde, no un defecto.
  - **Probado por inyeccion, y la primera prueba no servia.** Se metio en `tarjetas` un grupo de 6 con
    5 muy afuera, pero con piezas de 0.6 que la regla POR MALLA ya cazaba: no aislaba nada. Repetido
    con piezas de 0.30 —por debajo de `LADO_MIN = mundoW * 0.12`, que es justo el hueco que la regla de
    grupo tenia que cubrir— la compuerta VIEJA dice 'ENCUADRE OK' y la nueva acusa en los 11 aires.
  - Quedan sin reportar, y se deja escrito: 1 de 19 en `columna` y 3 de 43 en `tipografia` estan por
    debajo del umbral. No se comprobo si son legitimos.

- [x] **tools/encuadre-check.mjs:84**
  - **Síntoma:** Un rectangulo de bloques de color ocupando medio cuadro, en el video de un cliente. Lo encontro el dueño, no las compuertas.
  - **Lo dispara:** Cualquier defecto que viva en los PIXELES del recorte y no en su proporcion. Las dos compuertas que construyen escenas alimentan canvas de 64 px de alto con solo `image.width/height` seteados (encuadre-check.mjs:84-96, verificar.mjs:90-103). El LQIP del defecto #3 —archivo de 959x1400 con el conteni
  - **Compuerta:** Ninguna de las cuatro, y ninguna del motor 3D: el filtro esta en backend/motor.py:223 (`_es_placeholder`, corrida de pixeles > 8 y >= 8 tonos), en Python, en el camino de captura, sin ningun test. Si se rompe, las cinco rapidas siguen en verde. La co
  - `function tejidoFalso(relaciones) {`
  - **CERRADO 2026-08-03**, y no alimentando pixeles a `tejidoFalso` —que seguiria sin poder cazar
    esto— sino poniendo bajo compuerta el filtro que SI decide: `_es_placeholder`, que estaba anidado
    dentro de `datos_de` y por eso ninguna prueba podia importarlo. Extraido a `motor.es_placeholder`.
  - **Compuerta nueva: `tools/placeholder-check.py`** (E-PLACEHOLDER), en la cadena. Comprueba que los
    53 recortes reales del repo sobrevivan los 53, que dos LQIP fabricados se descarten, que un texto
    nitido y un logo plano se conserven, que el limite declarado (pocos tonos no se detecta) siga
    donde esta, y que un archivo ilegible no tire el recorte.
  - **Se rompio a proposito en las dos direcciones.** Con el detector apagado la compuerta acusa los 2
    LQIP; con el umbral de tonos bajado a 2 acusa 9 cosas, entre ellas 6 recortes reales de linear y el
    logo plano — que es exactamente lo que la nota de limite predice, asi que la nota quedo verificada
    y no es una excusa.
  - **Medicion que vale registrar:** de los 53 recortes reales, CERO se marcan como placeholder, y se
    ve por que la conjuncion funciona — corrida alta viene siempre con tonos 1-4 (logos, botones) y
    tonos altos con corrida 1.7-3.3 (fotos nitidas). Un LQIP cae en el unico cuadrante libre.
  - **Un cuidado que casi se cuela:** `tools/out/` esta en .gitignore, asi que en un clon nuevo hay
    CERO recortes reales y ese caso pasaria sobre nada, informando '0 conservados' como si hubiera
    comprobado algo. La compuerta ahora lo dice en la salida en vez de esconderlo en un numero.


## Menores (18)

- [x] **render3d/demo/heroes/mosaico.js:278**
  - **Síntoma:** Dos de los cinco acentos por beat le pegan a una pieza que ya está apagada: en el beat 4 el destaque escala mallas[2] justo en el instante en que el relevo la pone en `visible: false`, y en el beat 6 escala mallas[3], apagada desde el beat 5. Esos beats se quedan sin su evento. Y las piezas que ENTRAN (`c.m`) no reciben ni oscilación (no se les pone `userData.osc`) ni destaque, así que a partir de
  - **Lo dispara:** Una página con más de 5 recortes útiles, o sea que haya relevos. Con las 5 piezas de formación y 4 relevos: los relevos ocultan mallas[1],[2],[3],[4] en los beats 3, 4, 5 y 6 (líneas 199-224), y el destaque pide mallas[1],[4],[2],[0],[3] en los beats 2, 3, 4, 5 y 6.
  - **Compuerta:** No exactamente. verificar.mjs tiene un chequeo de «nada descansa más de un beat», pero mide la escena entera y el mosaico sigue teniendo tweens corriendo (la banda, el filete, la cámara), así que pasa en verde.
  - `const m = mallas[(i * 3) % mallas.length]`

- [x] **render3d/demo/heroes/mosaico.js:259**
  - **Síntoma:** El barrido del conjunto (líneas 242-243, `tl.to(gM.rotation, { y: 0.20 ... })`) no traslada las piezas: cada recorte gira sobre su propio centro y se queda donde está. Una pieza en x=1.4, z=0.35 tendría que desplazarse ~0.28 en z al rotar el grupo 0.20 rad, y no se desplaza. El comentario de la línea 240-241 dice «Con 0.20 y un desplazamiento lateral, el paralaje de las profundidades se hace visib
  - **Lo dispara:** Siempre. Los recortes viven en `gr` colgados directo de la escena (línea 143, `gr.add(m)`), no de `gM`, y el onUpdate copia SÓLO la rotación.
  - **Compuerta:** No. Es un movimiento que falta, no un objeto fuera de cuadro ni una timeline mal medida.
  - `m.rotation.y = gM.rotation.y`

- [x] **render3d/demo/escenas/cita.js:43-51 (constante en la 38)**
  - **Síntoma:** Esa linea unica es la que gana el Math.max(...texs.map(t => t.ar)) de la linea 100, asi que encaje achica LAS CUATRO lineas de la cita para que entre ella. Medido: una cita normal de 4 renglones sale a 109 px de cuerpo; agregandole un token de 50 caracteres sin espacios la cita entera cae a 56 px — la mitad, por una sola palabra. POR_LINEA = 26 tampoco es un ancho: con el ar real de una linea de 2
  - **Lo dispara:** Un testimonio con un token que no se puede cortar por espacios: una URL, un handle, un mail, un compuesto con guiones. enLineas solo parte por /\s+/ y nunca dentro de una palabra, asi que ese token queda como una linea de largo arbitrario.
  - **Compuerta:** E-ENCAJE si mira estas mallas (userData.encaja en la linea 140) y por eso NO hay desborde: el defecto es el remedio de la compuerta llevado al extremo. Achicar es como encaje logra que entre, asi que la compuerta queda verde justo cuando el texto se 
  - `const POR_LINEA = 26 // ... if ((actual + ' ' + p).length <= porLinea) actual += ' ' + p else { lineas.push(actual); actual = p }`

- [x] **render3d/demo/escenas/tipografia.js:83-84, 90, 270-278, 286-292, 318, 330**
  - **Síntoma:** El comentario de la linea 86-89 justifica el 5.05 diciendo que es 'el ancho que sigue entrando con la camara en su punto mas cerca', pero esa cuenta esta hecha con dolly = 1 y hoy CAM.dolly es un parametro del aire que llega a 1.55. Medido: con dolly 1.55 el semicuadro en el punto mas cerca baja a 2.6022, y la columna de 24 marcas del HUD, clavada en x = 2.62, queda FUERA del cuadro. Con dolly 1 (
  - **Lo dispara:** El dolly del aire. tipografia es la unica de las ocho que tiene su mueble entero escrito en unidades absolutas en vez de en mundoW/mundoH (XI y XD si salen de mundoW, todo lo demas no), y a la vez es la que mas acerca la camara: dolly(distBase, -0.9), que con CAM.dolly = 1.55 son -1.395.
  - **Compuerta:** E-ENCUADRE-NUNCA/CASI si barre los 11 aires (encuadre-check.mjs:155) pero no puede acusar a las marcas: la regla por objeto exige lado > mundoW*0.12 (linea 272) y cada marca mide 0.10-0.26, y la regla por grupo usa g.dentro = Math.max(...) sobre todo
  - `const ANCHO = 5.05 // ... FIL = [{ bt: 0, x: -1.65, y: -1.75, l: 3.30, gr: 0.075, ... }] ... barV.position.set(-2.70, -3.55, -0.2) ... mk.position.set(2.62, -6.2 + i * 0.55, -0.3)`
  - **CERRADO 2026-08-04, y el escenario de la ficha NO puede ocurrir.** Dice que con `dolly = 1.55` la
    columna de marcas queda fuera del cuadro. El unico aire con ese dolly es `inmobiliario`, y declara
    **`hud: false`**: no construye ninguna marca. Los dos que si las construyen —`tecnico` (1.0) y
    `corporativo` (0.7)— tienen dolly bajo. Verificado sobre los once aires.
  - **Lo que si ocurre es por el otro eje.** La columna arranca en y = -6.2 con paso 0.55 y **SUBE**
    1.68 durante la escena (el comentario decia 'baja' y el codigo suma en y). Las tres ultimas marcas
    empiezan en 5.35, 5.90 y 6.45 contra un semicuadro de 5, y terminan en 7.03, 7.58 y 8.13: medido
    construyendo la escena, **encendidas los 31 instantes muestreados y dentro del cuadro en ninguno**.
  - **El numero sale de la geometria, no se eligio:** una marca que arranca por encima del borde no
    entra nunca porque la columna solo sube, asi que `MK_N = floor((semicuadro - Y0) / paso) + 1 = 21`.
    Y el recorrido pasa a ser la MISMA constante que dimensiona la columna: escrito dos veces, algun
    dia dejan de coincidir y vuelven las marcas invisibles.
  - Medido antes y despues: **de 3 mallas encendidas que nunca entran, a 0**, con la escena
    construyendo tres mallas menos.
  - **Por que ninguna compuerta lo veia, que es la parte reutilizable:** la regla por malla pide lado >
    `mundoW * 0.12` y estas miden 0.12-0.21; y `E-ENCUADRE-MUDOS` —la que agregue en esta misma
    sesion— se conforma con que 3 de 24 sean invisibles, o sea 12.5% contra el umbral de 50% que
    derive. El umbral que medi y defendi deja pasar este caso, y queda dicho aca en vez de escondido.

- [x] **render3d/demo/escenas/pantalla.js:79**
  - **Síntoma:** La proporcion usada para calcular `visible` puede errar hasta 5.3x (720/1560 = 0.4615 contra 720/8192 = 0.0879): la escena mostraria 83% de lo que cree que es la pagina cuando en realidad son 6840 px de captura apretados en el cuadro. En la practica no se llega a ver porque una textura cargada siempre trae medidas — lo reporto porque el encargo pide justo esto (si la cuenta usa medidas reales o un
  - **Lo dispara:** Una textura de tira cuyo `image.height` llegue en 0/undefined (la guarda de pantalla.js:69 solo comprueba que `tira.image` exista, no sus medidas). El respaldo mezcla DOS magnitudes distintas: `spec.tiraViewport` es la altura del VIEWPORT, no la de la tira — backend/motor.py:283 lo llena con `(pm.ge
  - **Compuerta:** Ninguna, pero tampoco hace falta: el camino esta practicamente muerto. Lo dejo anotado como deuda de coherencia, no como defecto visible — los dos respaldos de mesa.js para el mismo dato (1560 y 1) no pueden ser los dos correctos.
  - `const anchoTira = tira.image.width || 720 const altoTira = tira.image.height || (spec && spec.tiraViewport) || 1560`

- [x] **render3d/demo/escenas/hero.js:84**
  - **Síntoma:** Medido con el copy real de linear.app: 'Plan and build with AI agents' queda en ALTO 0.367 (~37 px de altura de mayuscula sobre 1920), pero el claim completo 'The product development system for teams and agents' cae a ALTO 0.195 — unos 20 px de mayuscula, en el borde de lo legible en un reel vertical. Es el unico de los seis archivos que hace la cuenta bien (usa `encaje`, mide el `ar` real, y adem
  - **Lo dispara:** Una frase larga en una sola linea. hero.js:77 aplana los saltos de linea (`.split(String.fromCharCode(10)).join(' ')`), asi que una frase pensada en dos renglones duplica su proporcion y `encaje` le baja el alto a la mitad. No hay piso: `encaje` (kit.js:968) solo achica.
  - **Compuerta:** E-ENCAJE-REAL de encuadre-check.mjs:217 SI mira esta malla (es la unica de las seis escenas que se declara), pero solo verifica que ENTRE, no que se lea: no existe una compuerta de tamaño minimo de tipografia para el motor 3D.
  - `const t = texto(linea, { fuente: 'DMSans', peso: 700, size: 130, tracking: 0.01, upper: true }) const ALTO = encaje(mundoH * 0.040, t.ar, ANCHO)`

- [x] **render3d/demo/escenas/sello.js:83**
  - **Síntoma:** Medido: 'ANTHEM' sale con el glifo a 73 px de 1920; 'CONSTRUCCIONES' a 60; 'TRANSPORTES INTERNACIONALES' a 33; una marca de 31 caracteres (el tope es 32) a 29 px. apertura.js:459 declara un PISO para el mismo tipo de letra y el mismo bloom — `const ALTO_MIN = 0.55` — y su comentario de las lineas 456-457 dice por que: 'por debajo de eso el glifo en Anton se afina tanto que el bloom le rellena los 
  - **Lo dispara:** Una marca larga. Aca el encaje es de dos ejes y por eso NADA se corta — el defecto es el otro extremo: `encaje` baja el alto todo lo que haga falta y no hay piso. ALTO_BASE es mundoH*0.055 = 0.55 y ANCHO_UTIL es R*1.42 = 2.40.
  - **Compuerta:** Ninguna, y por diseño: E-ENCAJE solo comprueba que la pieza ENTRE y que no falte ninguna letra (verificar.mjs:407 y 425). Un nombre entero e ilegible cumple las dos cosas. bandera.js:60 tiene el mismo encaje sin piso, pero parte de mundoH*0.155 y con
  - `const alto = encaje(ALTO_BASE, t.ar, ANCHO_UTIL)`

- [x] **render3d/demo/heroes/brote.js:180 (con la linea de tierra de :142)**
  - **Síntoma:** La yema —lo unico de color puro del hero, y el sujeto del gesto de crecer— roza o corta el borde de arriba justo cuando termina de crecer y abre a escala 1.5. Medido: dentro de su registro llega a y=1.007 (jugueton/semilla 5), o sea margen cero; con un aire de mas dolly llega a 1.020 (inmobiliario/semilla 5) y la yema sale mordida. No es hipotetico que le toque un aire de esos: `elegibles()` devue
  - **Lo dispara:** Una semilla que saque el sorteo cerca del tope (rnd cerca de 0.26) junto con un `dz` positivo (brote.js:181, `(rnd() - 0.5) * mundoW * 0.28`, o sea hasta +0.79 hacia la camara, que achica el semialto util). La punta cae en mundoH*0.46 = 4.6 contra un semialto de 5: quedan 8 centesimos de margen y el
  - **Compuerta:** NINGUNA. Otra vez E-ENCAJE-REAL solo mira mallas con `userData.encaja` y brote no marca ninguna; el resto de encuadre-check pregunta interseccion, y un tallo que asoma por arriba sigue intersectando el cuadro. La compuerta ademas corre con una sola s
  - `const alto = mundoH * (0.60 + rnd() * 0.26) // sobre const Y0 = -mundoH * 0.40`

- [x] **render3d/demo/heroes/pulso.js:48-67 (mismo patron en biela.js:51-57,91 y calibre.js:42-55)**
  - CERRADO SIN TOCAR NADA: el propio hallazgo dice "Ninguno todavia, y por eso lo pongo como riesgo y
    no como defecto", y que medidos los tres con todos sus aires y las diez semillas ENTRAN ENTEROS en
    el tramo sostenido. No hay defecto que arreglar. Lo que describe es una constante sin atar (4.30 y
    las bandas en 3.05) que se romperia si cambiara MUNDO_H o la relacion de aspecto — o sea una deuda
    de diseno, no un sintoma. Cambiar tres heroes que hoy entran, para protegerlos de un cambio que no
    esta planeado, es tocar producto sin motivo medido.
  - **Síntoma:** Ninguno todavia, y por eso lo pongo como riesgo y no como defecto. El margen es delgado y no esta atado a nada: la banda de arriba de pulso llega a 4.10 sobre un semialto de 5 (82%), el carter de biela baja a -4.01 (biela.js:143 con SUBIR de :91), el volante de calibre sube a 3.92 (calibre.js:197). Los tres comentarios ADMITEN la dependencia por escrito —biela.js:340, calibre.js:365 y pulso.js:331
  - **Lo dispara:** Hoy, nada: medidos los tres con todos los aires de su registro y las diez semillas, entran enteros en el tramo sostenido. Lo que los dispararia es un cambio de `MUNDO_H` (main.js:183) o de la relacion de aspecto, o un aire nuevo con dolly por encima de 1.55 — porque estos tres heroes son los unicos 
  - **Compuerta:** Ninguna de forma preventiva. encuadre-check las construye con los once aires (encuadre-check.mjs:155) y hoy pasan, pero solo pregunta interseccion, no contencion, salvo en mallas marcadas `encaja` — que ninguno de los tres marca. Si mañana uno se pas
  - `const ANCHO = 4.30 ... const BANDAS = [{ y: 3.05, semi: 1.05, ... }, { y: 0.00, semi: 1.75, ... }, { y: -3.05, semi: 1.05, ... }]`

- [x] **render3d/demo/escenas/contraste.js:58**
  - REFUTADO (ffeea91) - no es defecto. contraste.js:21 NO importa `encaje` del kit, asi que no tapa nada: es reuso de nombre entre archivos. Nadie puede creer que llama al del kit porque el del kit no esta en el alcance del modulo.
  - **Síntoma:** Dos cosas a la vez. (a) Este `encaje` local TAPA el `encaje` del kit dentro del modulo con una firma distinta —recibe un `ar` y devuelve {h, w}— asi que el mismo nombre significa dos cosas segun el archivo: en el kit 'baja el alto para que quepa el ancho', aca 'contain en una caja'. Es el nombre correcto para la funcion equivocada. (b) BOX_W = mundoW * 0.76 = 4.275 unidades = 821 px, y tampoco pas
  - **Lo dispara:** Un logo capturado chico que llegue a esta escena: ROLES = ['foto', 'tarjeta', 'hero', 'logo'] (contraste.js:29), o sea el logo es la cuarta prioridad, y solo entra cuando la pagina no dio foto/tarjeta/hero suficientes.
  - **Compuerta:** Ninguna para la ampliacion; para la colision de nombres tampoco, y no es cazable por compuerta — se arregla dandole al kit la funcion de dos ejes que falta y borrando las siete copias.
  - `const encaje = (ar) => { const h = Math.min(BOX_H, BOX_W / Math.max(0.08, ar)); return { h, w: h * ar } }`

- [x] **render3d/demo/kit.js:147**
  - REFUTADO (ffeea91) - el numero es cierto y no llega a la pantalla. topeNitido(null,1080,5.625) = 7.875 unidades = 140% del cuadro, pero los TRES llamadores lo pasan por un Math.min contra un tope mas chico (columna 0.90*mundoW, vitrina 0.56, mosaico por celda), asi que el fallback nunca ensancha nada.
  - **Síntoma:** Con `img` nulo o de ancho 0 la funcion cae al fallback `W` (1080) y devuelve 1.4 * mundoW = 7.875 unidades = 1512 px, o sea el 140% del ancho del cuadro. Una funcion que se llama `topeNitido` devuelve, cuando no puede medir, un tope MAS GRANDE que el cuadro: deja de acotar exactamente en el caso en que hace falta que acote. columna.js:134 se salva sola porque escribe `Math.min(ANCHO_MAX, topeNitid
  - **Lo dispara:** Una textura cuya `.image` todavia no cargo o llego con ancho 0 — el caso que cargarRecortes() (kit.js:1971-1978) resuelve con `() => res()` en el callback de error, o sea que un PNG roto igual resuelve la promesa y la escena construye.
  - **Compuerta:** Ninguna. Y el fallback nunca se ejecuta en las compuertas porque verificar.mjs y encuadre-check construyen con `texturas` vacio, asi que las escenas se declaran `vacia: true` antes de llegar aca.
  - `((img && img.width ? img.width : W) * mag / (W || 1080)) * mundoW`

- [x] **render3d/demo/kit.js:284**
  - **Síntoma:** `escalones()` (kit.js:278) no recibe el alto de la ventana, asi que no puede acotar donde corresponde: acota el TECHO de la ventana a p.H en vez de a p.H - altoVentana. `ventanaLegible` si lo hace bien en kit.js:340 (`Math.min(p.H - altoVentana, ...)`) porque ella si recibe `altoVentana`. Las dos funciones resuelven lo mismo con criterios distintos y una tiene los datos y la otra no. Efecto real h
  - **Lo dispara:** Una pagina cuyo ultimo peldaño del scroll cae cerca del pie de la tira y `alHueco` encuentra el renglon vacio mas cercano HACIA ABAJO: el radio de busqueda es medio peldaño (`paso * 0.5`), asi que el ultimo destino puede quedar hasta recorrido/(2n) por debajo de y0 + recorrido.
  - **Compuerta:** Ninguna. No hay compuerta sobre el recorrido del scroll; es cazable sin renderizar comparando el ultimo escalon contra p.H - altoVentana.
  - `out.push(p ? Math.max(0, Math.min(p.H, alHueco(p, y, paso * 0.5))) : y)`

- [x] **render3d/demo/kit.js:996**
  - **Síntoma:** El comentario afirma un invariante que ya es falso: columna.js:333 (`if (matIdx.uniforms.map.value !== ix.tex) matIdx.uniforms.map.value = ix.tex`) y tarjetas.js:166 (`mat.uniforms.map.value = t.tex`) reemplazan la textura de un `materialMascara` en caliente, y ninguna reapunta `uRep`/`uOff` (kit.js:997-998), que siguen colgados de los Vector2 de la textura ORIGINAL. Es exactamente el mecanismo qu
  - **Lo dispara:** Nada de una pagina real lo rompe hoy, y por eso va como menor: las dos escenas que reemplazan la textura solo intercambian texturas de `texto()`, que nunca tocan repeat ni offset (quedan en 1,1 y 0,0), asi que los Vector2 viejos a los que apuntan uRep/uOff tienen el mismo valor. Lo rompería el dia q
  - **Compuerta:** Ninguna. Es cazable sin render: recorrer los materiales creados por materialMascara y comprobar `mat.uniforms.uRep.value === mat.uniforms.map.value.repeat`.
  - `// reapuntar estos dos; ninguna escena lo hace y por eso no se paga esa complejidad.)`

- [x] **render3d/demo/guion.js:59 y 66**
  - **Síntoma:** La rafaga se queda sin piezas y devuelve `return { g, gr, tl }` (rafaga.js:93) — ojo, SIN el campo `vacia`, al reves que las otras nueve escenas — o sea 6 beats con dos filetes y el indice '03 / 06' y nada mas, y ademas ningun arnes la puede saltear. `mesa` cae en `vacia: true` (mesa.js:63) con el mismo gatillo. No lo vi disparado por ningun fixture: los cuatro que no tienen frases tampoco tienen 
  - **Lo dispara:** El requisito cuenta elementos de CUALQUIER rol; la escena solo consume `const ROLES = ['tarjeta', 'foto', 'logo']` (rafaga.js:40), asi que los de rol 'cta' y 'hero' inflan la cuenta y nunca se usan (stripe tiene 3 'cta', linear 3, basecamp 3). Lo mismo `mesa` en guion.js:66 (`(d.elementos || []).som
  - **Compuerta:** No. La copia del gate (guion-check.mjs:75) tiene el MISMO requisito con la misma cuenta ciega de roles, y su pagina 'rica' declara un elemento 'cta' que ninguna escena puede usar (guion-check.mjs:47) — o sea que el gate ya esta contando material inut
  - `rafaga: (d) => ((d.elementos || []).length + (d.frases || []).filter(Boolean).length) >= 3,`

- [x] **render3d/demo/main.js:434 contra render3d/demo/datos.js:98-105**
  - **Síntoma:** Una cifra sin etiqueta o un elemento sin url hacen pasar el requisito y despues la escena se declara vacia (tarjetas.js:131) — otros 6 beats de cuadro liso. Ninguno de los 13 fixtures lo dispara hoy: medi la columna 'sin etiqueta' y da 0 en todos, y todos los elementos traen url. Queda como asimetria estructural entre lo que el guion mide y lo que la escena lee, no como defecto observado.
  - **Lo dispara:** Los REQUISITOS se evaluan sobre `spec.datos` CRUDO, mientras que las escenas leen `D`, que `configurarDatos` filtra: `D.datos = d.datos.filter(x => x && x.etiqueta)`, `D.elementos = d.elementos.filter(e => e && e.url)`. Dos de los requisitos no repiten ese filtro: `tarjetas` cuenta `(d.datos || []).
  - **Compuerta:** No, y no puede: el gate le pasa a guionDe su propio objeto de datos y nunca corre `configurarDatos`, asi que la diferencia entre el crudo y el filtrado no existe dentro del gate.
  - `datos: { ...this.spec.datos, tira: !!this.spec.tira },`

- [x] **render3d/demo/verificar.mjs:530**
  - **Síntoma:** Doble filo. Una escena que se mueve solo por uniforms puede acusarse en falso de diapositiva, y —peor— una que anima un uniform de forma no determinista o que no se mueve donde dice moverse pasa en verde. En portatil las dos cosas se juntan: el scroll de cinco saltos no mueve nada (el shader ignora offset) y la compuerta no puede confirmarlo ni desmentirlo porque tampoco lee offset.
  - **Lo dispara:** Una escena cuyo movimiento vive en uniforms que no se llamen `uProg`. La firma de 'NADA DESCANSA' y la de DETERMINISMO son la misma funcion y registran matrixWorld + visible + opacity + uProg, nada mas. Quedan afuera `tira.offset` (el scroll de portatil.js:216-217, telefono, ventana, pantalla y mesa
  - **Compuerta:** Ninguna. Agregar los uniforms escalares y vec2 del material a `firmaDe`, y aceptar isLine/isLineSegments/isSprite en los tres filtros, cierra las dos cosas sin cambiar los umbrales.
  - `+ `${(o.material && o.material.uniforms && o.material.uniforms.uProg ? o.material.uniforms.uProg.value : 0).toFixed(3)};``
  - **CERRADO 2026-08-03.** `firmaDe` ahora registra TODOS los uniforms escalares, vectoriales y de
    color del material (ordenados por nombre, salteando texturas y matrices), y acepta ademas
    `isLine`, `isLineSegments` e `isSprite` — las aristas encendidas de un cubo y los filetes eran
    movimiento que la firma no veia.
  - **Probado por inyeccion, en los dos sentidos.** Se le puso a `portatil` un uniform cuyo valor
    cambia en cada build (`uPrueba: ++contador`): con la firma NUEVA la compuerta falla
    ('dos construcciones con la misma semilla dan escenas distintas'); con la VIEJA, exactamente el
    mismo defecto, dice 'determinista' y sale en verde. El hueco era real y esta cerrado.
  - Nota: sumar informacion a la firma no puede inventar un fallo de QUIETUD —solo puede revelar
    movimiento donde antes se veia una diapositiva— y en cambio hace mas estricto el DETERMINISMO,
    que es lo que se le pedia.

- [x] **tools/guion-check.mjs:73**
  - **Síntoma:** Un fallo en falso de duracion (que se aprende a ignorar, y despues no se ve el de verdad) o, al reves, una divergencia entre los requisitos del motor y los de la compuerta que nadie detecta en 13 de 19 escenas.
  - **Lo dispara:** La compuerta duplica a mano 6 de los 19 REQUISITOS que declara guion.js:28-111 (tipografia, rafaga, pantalla, columna, tarjetas, destello). Para las otras 13 —gancho, apertura, bandera, hero, mesa, cita, lista, titular, partida, contraste, sello, toro, cierre— E-GUION-MATERIAL (linea 129) es un no-o
  - **Compuerta:** Ninguna. Se cierra importando REQUISITOS de guion.js en vez de copiarlo — es la misma leccion que el propio archivo saco con el CAT y que adn-check ya aplico importando MARCOS y MONTAJES del kit.
  - `const REQ = {`

- [x] **tools/adn-check.mjs:78**
  - **Síntoma:** Un pie o un rotulo gris ilegible sobre un fondo que no es el que se midio, sin que ninguna cifra se mueva. Es la misma familia que E-ADN existe para cazar —lo medido no llega a la pantalla— entrando por la puerta de al lado: aca la paleta llega bien y lo que no se mide es lo que la escena pinta con ella.
  - **Lo dispara:** Texto pintado con algo que no sea uno de esos cuatro colores declarados, o sobre algo que no sea `P.bg`. Las escenas escriben sus textos secundarios con la escala `nivel(k)` del kit —destello.js:36 `GRIS = () => nivel(0.62)`, y los rotulos, pies y captions de media docena de escenas— y esos grises n
  - **Compuerta:** Ninguna. adn-check nunca construye una escena (no importa three ni arma un grupo), asi que solo puede juzgar la DECLARACION; y las dos que si construyen no miran color.
  - `const chequeos = [['tinta', P.tinta, 6.5], ['acento', P.acento, piso],`
  - **CERRADO 2026-08-04, y en el orden correcto: primero las 88, despues la compuerta.**
  - **Las 88 se cerraron de raiz, no una por una.** El agujero no eran 88 colores mal elegidos: era que
    `forzarContraste` empujaba contra `bg` mientras `fondoVivo` mezcla `bg` y `bg2` por distancia. Se
    agrego `forzarContraste2`, que empuja hasta que el PEOR de los dos fondos llegue al objetivo, y se
    aplica a los tres acentos. Un cambio, 88 casos.
  - **Medido:** 88 -> 0 sobre los 7 pagemodels reales x los 11 aires, sin colisiones de paleta entre
    paginas (la variedad que E-ADN-VARIEDAD protege sigue intacta).
  - **Y la compuerta se afilo despues.** `adn-check` ahora mide contra los dos fondos y se queda con el
    peor. Verificado que puede ponerse roja: revirtiendo `adn.js` acusa **exactamente 88**
    E-ADN-LEGIBLE, que es el numero que esta ficha documentaba.
  - Las 88 se repartian `calido` 47 y `acento2` 41, en los once aires — o sea que era estructural del
    derivado de la paleta y no de un aire en particular.
  - **LA FICHA TENIA DOS MITADES Y YO CERRE UNA.** Lo de arriba arregla los cuatro roles de la paleta.
    La otra mitad esta escrita en el propio sintoma —*"las escenas escriben sus textos secundarios con
    la escala `nivel(k)` del kit"*— y quedo sin tocar. La destapo un cuadro renderizado, no un
    razonamiento: el 184 de linear.app, con el pie a **1.09:1**.
  - **CERRADA LA SEGUNDA MITAD 2026-08-04.** Medido primero, sobre los mismos 7 pagemodels x 11 aires:

    | sitio | k | por debajo del piso | peor |
    |---|---|---|---|
    | `columna.js:250` pie | 0.48 | 55/77 | 1.93:1 |
    | `sello.js:127` pie | 0.52 | 55/77 | 2.13:1 |
    | `marquesina.js:165` rotulo | 0.55 | 44/77 | 2.30:1 |
    | `titular.js:263` pie | 0.55 | 44/77 | 2.30:1 |
    | `cita.js:176` firma | 0.58 | 33/77 | 2.49:1 |
    | `columna.js:234` indice | 0.62 | 33/77 | 2.78:1 |

  - **Un numero que descarte a proposito:** el primer barrido midio *todos* los `nivel(k)` y dio
    **1364 de 2310 (59%)**. No significa nada: `nivel(0.05)` es un tono de relleno de una tarjeta y
    exigirle legibilidad de texto seria acusar en falso. Lo que decide no es el valor, es el USO.
  - **El arreglo camina por la misma rampa**, no por HSL: `nivelTexto(k)` sube `k` hacia `tinta` hasta
    que el peor de `bg`/`bg2` llega al piso. Conserva la intencion (un pie sigue siendo mas apagado
    que su titular) y no puede irse de mano porque el techo es `tinta`, ya forzada a 7:1.
  - **Medido: 264 de 462 colores se movieron, 0 quedan por debajo.**
  - **Y se comprobo que no reabre el defecto del "ladrillo blanco".** `rafaga.js:191` documenta que su
    0.78 se eligio para quedar DEBAJO del umbral de bloom; subir contraste en mundo oscuro es subir
    luminancia, o sea empujar justo hacia ese umbral. Medido contra `pelicula.umbral` de cada aire
    (0.58 a 0.97, la clave correcta — la primera medicion leyo `bloomUmbral`, que no existe):
    **0 de 693 cruzan el umbral por el arreglo.**
  - **La compuerta E-ADN-TEXTO tiene dos partes, y hacen falta las dos.** La ESTRUCTURAL prohibe pintar
    texto con `nivel()` pelado (si no, una escena nueva reabre el agujero y la parte numerica ni se
    entera, porque solo mira los sitios que ya usan `nivelTexto`); la NUMERICA verifica los 18 sitios
    en las 77 combinaciones.
  - **Y cubre DOS vias, no una.** La primera version buscaba solo `materialMascara(tex, color)` y daba
    verde sobre `apertura` y `rafaga`, que colorean las letras en el canvas: `texto(str, { fuente,
    color })`. El cuadro que destapo todo esto venia justo de esa via. Se reconoce por `fuente:`, que
    es lo que distingue un estilo tipografico de un relleno.
  - **Verificado que puede ponerse roja:** revirtiendo un sitio de cada via, acusa los dos.
  - **Y verificado en pixeles renderizados**, que es de donde salio: basecamp.com 25 s semilla 26,
    cuadro 410 (`marquesina`, mundo claro, piso 3.2), el rotulo "01 / 06" pasa de **2.59:1 a 3.78:1**.
    El cuadro de `cita` medido entero da 6.97:1 antes y despues — esa medicion la domina el resto de la
    composicion y no dice nada sobre la firma; se anota como lo que es, no como confirmacion.


---

## Correcciones de los críticos

Tres críticos adversarios revisaron el diagnóstico. **Dos lo sostienen, uno no** — y su objeción
cambia el plan, así que va primero. *(Dos de los tres corrieron sin el clasificador de seguridad
disponible; sus afirmaciones hay que verificarlas a mano antes de actuar sobre ellas.)*

### Lo sostiene, con reparos

- [ ] **El defecto MAS GRAVE del corpus no es de encaje, y el plan lo deja huerfano. `tarjetas.js:290` llama `const num = contador(0.62, d.n, esHero ? 130 : 80, C_NUM(), esHero ? heroTexs : null, ...)`. Para toda tarjeta que NO es la heroe pasa `texsPrestadas = null`, asi que se ejecuta `tarjetas.js:157`: `for (let k = 0; k <=**
  - **Por qué cambia la decisión:** El plan lo saca de la fila entera: no esta en Paso 0, no lo caza ninguna de las 4 aserciones del Paso 1, no lo toca la migracion a `caber` del Paso 2, y no figura en los tres items del Paso 3. Es la unica regla que el propio repo llama 'la mentira mas cara que puede cometer este 
  - **Corrección:** Subirlo a Paso 0, al lado de los cinco `else if`. El arreglo es aplicar en `contador` la misma guarda que ya existe para la heroe: cuando `valorFinal == null`, repetir la textura de `d.txt` en vez de contar (el codigo de `tarjetas.js:178` es el molde). Y en Paso 1 agregar una quinta asercion, E-CIFR

- [ ] **El umbral de E-CUERPO-MINIMO no caza lo que el plan dice que caza, medido con los numeros de la propia sintesis. El plan fija 'altura de mayuscula >= ~30 px de 1920' y afirma: 'Mata todo lo que `encaje` achica hasta ilegible (sello, hero, cita, gancho, titular, lista, marquesina, partida)'. Pero las mediciones que la e**
  - **Por qué cambia la decisión:** El entregable del Paso 1 es 'poner en rojo 20-30 sitios y entregar la lista real, medida'. Con 30 px la familia entera de degradacion —que es la mitad de la tesis y la que explica el '3 de 5 salen bien'— sale VERDE, y el Paso 2 se queda sin criterio de aceptacion justo para los ~
  - **Corrección:** Sacar el umbral de la referencia declarada en el repo, no de un numero redondo: calibrar contra `apertura.js:459` (~106 px de plano) y contra el cuerpo con que hoy se ven bien gancho (84) y titular (88), no contra el minimo teorico de legibilidad. Y reportarlo escalonado (rojo / amarillo) en vez de 

- [ ] **E-CUERPO-MINIMO y E-CONTENCION-TOTAL son conjuntamente insatisfacibles para copy largo, y `caber(alto, ar, anchoUtil, altoMax, {pisoPx})` no puede resolverlo — porque un piso solo dice 'deja de achicar', y el texto tiene que ir a algun lado. El repo YA resolvio este conflicto y lo resolvio al reves de como lo propone e**
  - **Por qué cambia la decisión:** Rompe el Paso 2 tal como esta especificado. Si el piso es duro, los sitios de copy largo migrados a `caber` van a fallar E-CONTENCION-TOTAL; si cede, E-CUERPO-MINIMO no aprueba nunca y el Paso 1 entrega una lista de rojos que nadie puede cerrar. Ademas viola la regla del CLAUDE.m
  - **Corrección:** Escribir E-CUERPO-MINIMO con dos ramas, calcadas del `cabe` de apertura: cuerpo >= piso, O BIEN el piso se rechazo y esta declarado que se rechazo porque aplicarlo desbordaba. Y re-alcanzar el Paso 2: `caber` mas una escalera de respaldo por escena (re-flow a mas renglones -> tracking -> truncado/de

- [ ] **E-CONTENCION-TOTAL 'sin opt-in' invierte el problema en vez de resolverlo. El plan justifica quitar el opt-in con que `userData.encaja` aparece 13 veces en 21 escenas y 0 en 18 heroes — lo verifique por grep y es exacto (bandera 2, cita 2, destello 1, gancho 1, hero 1, lista 2, partida 1, sello 1, titular 2; cero en he**
  - **Por qué cambia la decisión:** Con opt-in hacen falta ~13 declaraciones y se escapan los no declarados; sin opt-in hacen falta N declaraciones de EXENCION y el Paso 1 arranca con decenas de falsos positivos sobre elementos que estan bien. El plan presupuesta cero trabajo para eso y promete 'riesgo sobre el pro
  - **Corrección:** Mantener universal la MEDICION y explicita la EXCEPCION: medir todo vertice de toda malla sin opt-in (eso es correcto y es lo que arregla el heuristico de verificar.mjs:404-411), pero exigir una marca de sangrado deliberado (`userData.sangra` con motivo) para las piezas que hoy ya lo declaran en com

- [ ] **La tesis se sostiene pero el grano es mas grueso de lo que dice el titular, y eso parte el Paso 2 en dos. (a) 'Cada malla se dimensiona por un solo eje' no describe a los ~9 sitios que usan `encaje` (kit.js:968): `altoBase * arMax > anchoUtil ? anchoUtil / arMax : altoBase` SI mide el `ar` real y SI compara contra un a**
  - **Por qué cambia la decisión:** El Paso 2 esta presupuestado como una migracion homogenea de '~30 sitios en tandas chicas' con un solo criterio de aceptacion. En realidad son dos frentes con riesgo y entregable distintos: el de desborde no acotado (tarjetas:191, cierre:240/273, destello:169, rafaga:210, toro:35
  - **Corrección:** Partir el Paso 2 en 2A (techo: sitios de un solo eje sin acotar, criterio E-CONTENCION) y 2B (piso + escalera de ajuste: sitios `encaje`, criterio E-CUERPO-MINIMO de dos ramas), con la migracion de `planoRecorte`/`topeNitido` como 2C independiente. Y agregar al Paso 1 una asercion E-BANDA-LLENA: cua


### Lo sostiene, con reparos

- [x] **El plan trata la falta de clave de `marquesina` en REQUISITOS como la causa del aire muerto (Paso 3). Es una de dieciocho puertas a la misma sala, y la que menos importa. La bandera `vacia` NO LA LEE NADIE EN PRODUCCION. Grep sobre render3d/, tools/ y backend/: `r.vacia` se lee en UN solo lugar, render3d/demo/verificar**
  - ✅ **HECHO** — 8b893f2 — confirmado y arreglado: ahora main.js lo lee y saltea la escena sin avanzar el beat.
  - **Por qué cambia la decisión:** Cambia QUE se arregla y en que orden, en las dos direcciones. (1) En el video: arreglar `marquesina` deja las otras diecisiete puertas abiertas. Una linea en main.js que respete `vacia` —saltear o encoger el slot— cierra las dieciocho y es mas barata que la clave de REQUISITOS. (
  - **Corrección:** Antes del Paso 1, dos lineas: (a) que main.js honre `vacia` (saltear la escena o dejar el hueco medido, no reproducirlo); (b) que verificar.mjs:461 deje de `continue`-ar en seco — que registre 'vacia' como resultado auditable y siga midiendo lo que se pueda, o al menos que el barrido de marcas de la

- [ ] **El Paso 1 define E-CONTENCION-TOTAL con el parentesis '(hoy se mide un solo instante, 0.72)'. Eso es cierto para verificar.mjs (linea 330: `rm.tl.time(mod.meta.beats * BEAT * 0.72, false)`) y FALSO para encuadre-check.mjs, que ya muestrea todos los cuadros. Verificado: tools/encuadre-check.mjs:209-210 `const N = Math.m**
  - **Por qué cambia la decisión:** Cambia el costo y la forma del Paso 1, que es el paso del que cuelga todo lo demas. Escrito como esta, el plan manda construir un tercer arnes de proyeccion cuadro-a-cuadro cuando ya hay uno correcto —y uno que costo caro: el comentario de encuadre-check.mjs:229-233 cuenta que la
  - **Corrección:** E-CONTENCION-TOTAL no se escribe: se destapa. Sacar el `if (o.userData.encaja)` de encuadre-check.mjs:218 y correr `entraEntera` sobre TODA malla visible (con la lista de excepciones declaradas que ya existe — `userData.relleno`, y una nueva `userData.sangra` para lo que sangra a proposito, que es m

- [ ] **El diagnostico §2(a) apoya 'el kit permite equivocarse' en tres patas y una no existe: 'contraste.js:58 llego a pisar el nombre importado con otra firma'. No pisa nada. render3d/demo/escenas/contraste.js:21 importa `{ LOOK, b, E, nivel, matAcento, materialMascara, planoRecorte, recortesDe, finMascara, deriva, dolly, or**
  - **Por qué cambia la decisión:** No cambia el Paso 2 —las otras dos patas si estan verificadas: `topeNitido` lo importa UN archivo (columna.js:30) de NUEVE que llaman a `planoRecorte`, y `encaje` (kit.js:968) es de un eje y sin piso—. Cambia que el argumento se presenta con un dato falsificable adentro. En un re
  - **Corrección:** Borrar la frase del shadow. La pata que si aguanta y que ademas es mas fuerte: nueve archivos llaman a `planoRecorte`, uno solo (columna.js:134) usa `topeNitido`, y `rafaga.js:163` se escribio su propia copia del mismo tope (`const MAG_MAX = 1.4`). Cuando un autor reimplementa una funcion del kit qu

- [ ] **El Paso 2 dimensiona la migracion en 'los ~30 sitios' y §2(a) habla de 'los SIETE que llaman a planoRecorte' y 'siete composiciones se escribieron su propio contain'. Los llamadores de `planoRecorte` son NUEVE, no siete: columna, contraste, mesa, pantalla, rafaga, titular (escenas) + mosaico, ventana, vitrina (heroes).**
  - **Por qué cambia la decisión:** Es una correccion de alcance del unico paso de riesgo medio del plan. Si el Paso 2 se planifica en tandas contra una lista de siete y son nueve, dos sitios de llamada quedan fuera de la tanda y sin criterio de aceptacion — y `pantalla` y `ventana`, los dos que faltan en la cuenta
  - **Corrección:** Fijar la lista de migracion por grep y no por memoria: nueve llamadores de `planoRecorte`, siete sin tope de resolucion (contraste, mesa, pantalla, titular, mosaico, ventana, vitrina). Meter `topeNitido` DENTRO de `planoRecorte` (kit.js:1964, que hoy termina en `new THREE.PlaneGeometry(alto * ar, al


### NO sostiene el plan

- [ ] **E-CONTENCIÓN-TOTAL «sin opt-in» es la versión que este repo YA probó y descartó, y la medí: no marca 20-30 sitios, marca 251. Construí las 37 escenas con el arnés de encuadre-check (mismo bootstrap, mismo fixture ANTHEM, un aire) y apliqué la regla propuesta —los 8 vértices de toda malla visible dentro de |1.015|, más **
  - **Por qué cambia la decisión:** El paso 1 tiene DOS papeles en el plan y son incompatibles: nace en rojo («pone en rojo 20-30 sitios») y a la vez es «el criterio de aceptación» de la migración del paso 2. Una compuerta que arranca en rojo no detecta regresiones: después de migrar tandera por tanda, la señal es 
  - **Corrección:** Mantener la declaración e INVERTIR el default: cada malla se declara `encaja` o `sangra`, y lo que falla la compuerta es la malla SIN CLASIFICAR, no la geometría. Eso convierte 251 acusaciones en una tarea mecánica y revisable archivo por archivo, y deja la regla con dientes después. Y partir el pas

- [ ] **E-CUERPO-MÍNIMO y `caber(..., {pisoPx})` son insatisfacibles contra la caja LOCAL, y el defecto que producen no lo ve ninguna de las cuatro aserciones propuestas. `encaje` devuelve `anchoUtil / arMax` cuando desborda (kit.js:968); poner un piso P significa `alto = max(P, anchoUtil/arMax)`, y en cuanto P gana, el ancho **
  - **Por qué cambia la decisión:** El paso 2 se vende como «cambia composiciones que hoy se ven bien, por eso va después, para que la compuerta diga cuál cambió». Pero con estas cuatro aserciones la compuerta NO puede decirlo: el modo de falla que introduce el piso —texto legible pero encimado dentro de su propia 
  - **Corrección:** Antes del paso 2, tomar la decisión de producto que falta: qué pasa con el texto que no entra — renglones adaptativos (elegir la cantidad de líneas que MAXIMIZA el cuerpo sujeto a que entre, en vez de MAX_LINEAS fijo), truncado en el extractor, o apagar la escena. `caber()` implementa esa política; 

- [ ] **«`planoRecorte` aplica `topeNitido` por dentro» no es un arreglo de nitidez: es un cambio de composición en 7 sitios que VACÍA huecos de grilla. topeNitido (kit.js:146) devuelve `img.width * 1.4 / 1080 * mundoW`; para el logo real de stripe (120x50, tools/fixtures/director/elementos/) eso da 0.875 unidades. En mosaico **
  - **Por qué cambia la decisión:** El plan clasifica el paso 2 como riesgo medio «porque cambia composiciones que hoy se ven bien», pero esta parte no es un cambio de encaje: es dejar agujeros donde hoy hay imagen, en los tres heroes de recortes, y por una regla automática que nadie va a poder desactivar caso por 
  - **Corrección:** topeNitido sigue siendo opt-in por escena; lo que se unifica es la MEDICIÓN, no la corrección. Para las grillas hace falta una política de slot (rellenar con marco/letterbox, elegir otra fuente, o rechazar el recorte para ese slot) antes de capar nada. Y E-NITIDEZ se parte en dos: recortes (umbral 1

- [ ] **El barrido del paso 1 no entra en ningún presupuesto de compuerta, y el plan no da ninguno. Medido recién: `node render3d/demo/verificar.mjs` = 4.1 s (37 escenas), `node tools/encuadre-check.mjs` = 9.3 s para 407 construcciones (37 x 11 aires), o sea ~23 ms por construcción incluyendo el barrido a 30 fps. El barrido de**
  - **Por qué cambia la decisión:** El valor entero del paso 1 es ser el criterio de aceptación de las tandas del paso 2. Una compuerta de horas no se corre por tanda: se corre una vez, se rompe, y la migración termina haciéndose sin red — que es el escenario que el plan dice estar evitando. Cambia el diseño del pa
  - **Corrección:** Escribir el barrido como SUMA de ejes y no como producto: se varía un eje por vez con el resto clavado en el fixture (≈20 contenidos x 37 escenas = 740 construcciones ≈ 17 s, que sí entra en las compuertas rápidas), y los ejes aire/semilla se dejan donde ya están, en el pase de 11 aires que corre en

- [x] **`marquesina` está tercera en la cola y es el arreglo más barato y más grave del documento. Confirmado: REQUISITOS (guion.js:28) tiene 19 claves —apertura, bandera, cierre, cita, columna, contraste, destello, gancho, hero, lista, mesa, pantalla, partida, rafaga, sello, tarjetas, tipografia, titular, toro— y en escenas/ **
  - ✅ **HECHO** — 8b893f2 — hecho como pidio el critico: no solo la clave que falta, sino que main.js HONRE `vacia` (saltear la escena sin avanzar el beat). Cubre las otras cuatro escenas que tambien pueden declararse vacias.
  - **Por qué cambia la decisión:** Es 6 beats de fondo pelado en una pieza de 25 s, disparado por el material y no por el aire: es literalmente «el video salió mal» en la boca del dueño, y es lo que sostiene la impresión de «impredecible» tanto como el encaje. Cuesta una línea y no depende de nada del paso 1 ni de
  - **Corrección:** Subirlo al paso 0, junto con los cinco `else if`. Y hacerlo de la forma que impide la recaída: que el consumidor HONRE `vacia` (descartar la escena y replanificar) en vez de agregar sólo la clave que falta en REQUISITOS. Hoy hay dos fuentes de verdad —el requisito y la guarda de la escena— y ya dive

- [ ] **El paso 0 no es «riesgo cero», y el diagnóstico tiene una imprecisión que conviene corregir antes de tocarlo. Lo verificado: los cinco pares duplicados existen (kit.js:1554/1555, 1587/1588, 1621/1622, 1657/1658, 1702/1703), el primero de cada par tiene cuerpo vacío y `float linea = 0.0` está declarado antes de la caden**
  - **Por qué cambia la decisión:** No cambia el orden —sigue siendo lo primero— pero cambia el contenido del paso y su etiqueta. Presentado como «riesgo cero, se borran cinco líneas» se hace sin la medición de contraste, y la historia del repo dice que esa medición no es opcional: es el mismo error que ya se pagó 
  - **Corrección:** Paso 0 = borrar los cinco `else if` vacíos + repetir sobre los cinco la medición de contraste de trama de 4b680c8, en mundo claro y oscuro, antes de dar el paso por cerrado. Y anotar la compuerta que falta: que cada entrada de PATRONES produzca un cuadro NO liso y distinto de sus vecinos. Esa compue


---

## Ya cerrado

- [x] **kit.js:1554/1587/1621/1657/1702 — cinco `else if` duplicados con cuerpo vacío.**
  Los cinco fondos nuevos (roseta, celosía, costura, espigas, engranaje) salían como cuadro liso.
  Error de integración propio: los agentes devolvieron el envoltorio a pesar del contrato y el
  script de integración agregó el suyo. Arreglado y verificado renderizando un cuadro de cada uno.
  Commit `4b7e...` (ver `git log --grep="salian LISOS"`).

- [x] **Multiplicador de calibración fuera de la cadena (×4,5 global).** Mismo archivo, misma
  clase de error, dos días antes. Lo cazó una tarea sugerida del harness, no las compuertas.
  Commit `e63e331`.

> Las dos veces el síntoma fue invisible para las compuertas (corren en Node y **no compilan
> GLSL**) y para el ojo (un degradé liso sigue pareciendo un fondo). Es el argumento más fuerte
> del documento a favor de una compuerta que ejecute el shader.

---

## Añadido al plan: una compuerta que EJECUTE el shader

**Por qué falta.** Las cinco compuertas rápidas corren en Node, que no tiene GPU ni WebGL. Construyen
las escenas con un THREE de mentira y miden cajas, timelines y planes — pero nunca ejecutan el código
del shader. Y un shader, del lado de JavaScript, es apenas un **string** adentro del archivo: puede
decir cualquier cosa, o nada, y el archivo sigue siendo JS válido.

Los dos errores que llegaron a producción esta semana viven exactamente ahí, y las compuertas dieron
verde las dos veces:

- un multiplicador de calibración que quedó **fuera** de la cadena `if/else` y afectaba a los 22
  patrones (`e63e331`);
- cinco `else if` duplicados con cuerpo vacío que dejaban los cinco fondos nuevos como cuadro liso
  (`c2c8419`).

Ninguno era visible al ojo tampoco: un degradé sin trama sigue pareciendo un fondo legítimo.

**Qué mide.** Un cuadro por patrón (27) en el Chromium headless, contra dos aserciones:

- [x] **E-PATRON-DIBUJA** — el patrón produce una trama distinguible del degradé pelado. Se compara
  cada patrón contra un render de referencia con `fondo: nada`, en la misma escena y semilla. Caza
  rama muerta, rama vacía, shader que no compila, y patrón invisible por contraste.
- [x] **E-PATRON-AISLADO** — cambiar el patrón A no cambia el render del patrón B. Caza cualquier
  - **ESCRITAS 2026-08-04 en una sola compuerta: `tools/patron-check.py` (E-PATRON-DIBUJA).** Es la
    PRIMERA del motor 3D que EJECUTA el shader: levanta el server del render, abre Chromium con
    SwiftShader, dibuja `fondoVivo` con cada valor de `uPatron` y lee los pixeles.
  - **La comparacion es EXACTA y sin umbral, y esa fue la leccion.** La primera version exigia 1.5x la
    desviacion espacial de `nada` y acusaba a `estelas` (1.17x), `panal` (1.18x) y `recuento` (1.44x).
    Leido el shader, los tres DIBUJAN —`recuento` pone palotes en el 44% de las celdas con trazos de
    0.03— o sea que un patron discreto no es un patron roto y el umbral acusaba en falso. Lo que si
    detecta el defecto documentado es que una rama vacia produce **pixel por pixel** la misma imagen
    que `nada`.
  - **Probada vaciando la rama de `celosia`** —sintacticamente valida, JS y GLSL correctos—: la
    compuerta la caza. `E-SHADER-ENTERO` no puede por construccion, porque el literal sigue llegando a
    `gl_FragColor`, y `node --check` tampoco.
  - **El bug original ya no esta:** las 26 ramas del else-if escriben en `linea` y los 28 patrones estan
    cubiertos. Ahora hay quien lo note si vuelve.
  - **Y el instrumento tuvo DOS defectos antes de servir**, los dos anotados en el archivo: la camara
    ortografica no llegaba al plano del fondo (z = -14) y renderizaba NEGRO, con lo cual los 28
    patrones daban 'la misma imagen' con toda seguridad; y la firma muestreaba 1 de cada 997 pixeles,
    que sobre una trama dispersa no tocaba una sola marca.
  cosa que se escape de su rama, que es la forma exacta del bug del ×4,5.

**Costo medido en este repo:** arrancar Chromium ~4 s, dibujar un cuadro 12-24 ms. 27 cuadros ≈ 5-8 s.
Entra en las compuertas rápidas (hoy 7 s).

**Riesgo:** ninguno sobre el producto — es sólo lectura y no toca el motor. El riesgo real es un falso
rojo por umbral mal puesto, que se corrige aflojando el umbral y no el motor.

**Nota de método.** Esto generaliza más allá de los fondos: la misma idea —una compuerta que RENDERICE
en vez de sólo construir— es lo único que puede cerrar la familia entera de defectos que hoy son
invisibles para las cinco rápidas. Vale la pena pensarla como la primera de una clase, no como un
parche para los fondos.


---

## Diferido a proposito: tools/adn-check.mjs:81

El parche esta medido y es correcto -- la compuerta mide el contraste contra un fondo que NO es el
que se dibuja (`fondoVivo` mezcla uA/uB por distancia y el cuadro cubre 1/1.49 del plano), asi que
un rotulo ilegible pasa sin que ninguna cifra se mueva.

NO se aplico, y el motivo es que **deja la compuerta en ROJO con 88 combinaciones reales**. No son
falsos positivos: son colores que de verdad se pintan sobre el fondo que de verdad se ve. Pero
aplicarlo sin cerrar antes esas 88 rompe una de las 5 rapidas para todo el mundo, y una compuerta
roja que se aprende a ignorar es peor que la que mide mal.

El orden correcto es al reves: primero se cierran las 88, despues se afila la compuerta.

**HECHO el 2026-08-04, en ese orden.** Las 88 se cerraron de raiz con `forzarContraste2` en `adn.js`
—empuja contra el peor de los dos fondos que el shader mezcla, un cambio para los 88 casos— y recien
despues se afilo `adn-check`. Medido 88 -> 0, sin colisiones de paleta, y verificado que la compuerta
nueva acusa exactamente 88 si se revierte el arreglo.

---

## Dos hallazgos nuevos, vistos renderizando el 2026-07-31 (NO son de los parches de hoy)

- [ ] **render3d/demo/escenas/toro.js:342 — el ancho se declara en unidades de mundo y la camara lo agranda**
  - **Sintoma:** El renglon de abajo llega al borde del cuadro. Medido en pixeles sobre el render de
    pentagram.com (cuadro 355): 'SEE LATEST PROJECTS' va de **x = 3 a x = 1075** sobre 1080, o sea 3 y
    4 px de margen. No esta cortado, pero ninguna otra escena compone asi: todas usan entre 0.84 y 0.96
    del cuadro.
  - **Lo dispara:** El dolly del aire. Proyectando los ocho vertices contra la camara que la escena
    mueve, sobre los 7 juegos de datos reales x los 11 aires, `toro` llega a **|x| = 1.030** —o sea que
    SE SALE un 3%— con linear-app y el aire `inmobiliario`, que es el de dolly mas alto (1.55).
  - **Y es la MISMA causa que `mesa`:** la escena declara `ANCHO = mundoW * 0.86` en unidades de MUNDO
    y el ancho proyectado depende de cuanto se acerque la camara. Medido en mundo, la malla mas ancha
    de `toro` es 0.680 del cuadro y parece sobrarle margen; en pantalla llega a 1.030. Es un patron, no
    un caso: **un ancho util declarado en unidades de mundo no dice lo que se ve.**
  - **Compuerta:** Ninguna. `encuadre-check` pregunta si la caja CRUZA el cuadro (cruza), y E-ENCAJE
    solo exige contencion a las mallas que declaran `userData.encaja`, que `toro` no declara. Se midio
    con el barrido propio de esta sesion, proyectando.
  - **Verificado que las escenas hermanas NO tienen el problema:** `sello` 0.512, `bandera` 0.873,
    `gancho` 0.912. `destello` llega a 1.623 y ya esta confirmado como transitorio deliberado (su malla
    mide 0.96 del cuadro y un tween la escala 2.429x).
  - No se parcheo: bajar el ANCHO de `toro` cambia su composicion en los once aires para arreglar el
    que tiene dolly 1.55, y eso es la misma decision que quedo abierta en `mesa`.

- [x] **render3d/demo/escenas/destello.js — FALSO POSITIVO MIO, retirado el 2026-08-04**
  - Lo abri diciendo que con copy real y un aire de tipografia ancha el titular se salia del cuadro por
    los dos lados, a partir de mirar el cuadro 490 de un render. **Estaba equivocado, y lo prueban dos
    mediciones que hice despues.**
  - **En el cuadro, con pixeles y no a ojo:** 'BUILT FOR THE' va de x=69 a x=1015 y 'MODERN WEB.' de
    x=48 a x=1031 sobre 1080 de ancho. Son **48 a 69 px de margen a cada lado**: el texto no toca el
    borde. Lo que si llega a la columna 1079 es el arco decorativo, que sangra a proposito.
  - **Construyendo la escena, asentada:** la malla con textura mas ancha cuya escala ya se asento mide
    entre **0.993 y 1.005 anchos de cuadro en los ONCE aires** — parejo, y sin desborde.
  - **Y el 2.33 que disparo todo esto SI es un transitorio deliberado:** la malla mide 5.40 u (0.96 del
    cuadro, correcto) y un tween la escala **2.429x** a t=1.48 s. Es el golpe de ampliacion de la
    escena, no un error de dimensionado. Se identifico imprimiendo la geometria y la escala mundial de
    la malla culpable, en vez de deducirlo del tamano final.
  - **Consecuencia para `verificar.mjs:410`:** la pregunta que quedo abierta ahi —¿el 2.33 es legitimo?—
    se contesta que **SI**, al reves de lo que escribi. El tope de ancho **no** se puede bajar apoyandose
    en esto, y sigue valiendo lo que ya estaba anotado: hay que decidir que se hace con el golpe de
    escala antes de tocar el numero.
  - **Por que me equivoque, que es lo unico que sirve de esto:** lei un cuadro a ojo y confie en la
    lectura. Un titular tenso contra el margen con aberracion cromatica en los cantos se ve cortado y no
    lo esta. CLAUDE.md ya lo dice —'verlo en el cuadro completo', 'si una metrica da fuera de rango eso
    prueba que hay algo que explicar, no que hay un defecto'— y lo que faltaba era medir los pixeles del
    cuadro que estaba mirando, que cuesta cinco lineas.
- [x] **render3d/demo/escenas/apertura.js — el sosten de la cortina se mide en beats y el tiempo muerto se percibe en segundos**
  - **CORRECCION DE COMO LO ABRI.** Lo escribi como 'la pieza abre con medio segundo de NADA'. Es
    falso: lo que hay es LA CORTINA —una pared del color de la marca que tapa el cuadro y se corre en
    diagonal—, y esta puesta A PROPOSITO para arreglar un defecto anterior. Su razonamiento esta en el
    archivo (`apertura.js`, bloque '0 · LA CORTINA'). No confirme que ninguna linea lo pidiera adrede
    antes de escribir el hallazgo, que es justo lo que CLAUDE.md manda hacer.
  - **Lo que si es un defecto, medido:** en el render de theverge.com a 102 bpm el cuadro queda **100%
    tapado por el color del acento durante 16-17 cuadros, 0.53-0.57 s** (medido en RGB sobre los tres
    canales; en gris no se distingue de un cuadro vacio). El propio archivo llama tiempo muerto a un
    tercio de segundo, y reporta 9 cuadros (0.30 s) como resultado de su segunda correccion.
  - **La causa es la unidad, no la duracion.** La cortina ya fue acortada DOS veces —1.35 -> 0.8 -> 0.5
    beats, las dos documentadas en el archivo— y las dos midieron en UNA pieza. Pero `b()` depende del
    bpm del aire: los mismos 0.5 beats son 0.242 s a 124 bpm y 0.312 s a 96, y el apagado pasa de 0.460
    a 0.594 s. El tiempo muerto se percibe en segundos y estaba escrito en beats.
  - **Arreglo:** tope en SEGUNDOS derivado de lo que el archivo ya declaro (un tercio de segundo es
    tiempo muerto): `T_CORTINA = min(b(0.5), 0.24)` y `T_APAGA = min(b(0.95), 0.45)`. Es un `Math.min`,
    o sea que **solo puede acortar**: a 124 bpm y mas rapido no cambia nada, y por debajo recorta.
  - **LO QUE NO PUDE DEMOSTRAR, y queda dicho:** no logre reproducir en video el render original de 102
    bpm — desde entonces cambio la clasificacion de rubro y theverge ahora cae en un aire de 108, y sus
    planes abren con `gancho`, asi que la cortina de `apertura` ni entra. Se probaron 6 renders (semillas
    2, 5, 7, 11 y el aire `bienestar` forzado) y en todos el ANTES ya daba 0 cuadros lisos. O sea que el
    arreglo esta respaldado por la aritmetica del tope y por la medicion del render viejo, no por un
    antes/despues en video.
- [x] **tools/anthem-datos.mjs:164 — el rotulo imprimia el valor de reserva del clasificador**
  - **Sintoma:** La pieza escribe en pantalla, pegado a la marca, la categoria del negocio: 'TAILWIND
    CSS · OTRO', 'LINEAR · OTRO'. Y `otro` no es una categoria: es lo que el sistema pone cuando NO
    SABE — `semantica_gratis.py:521` lo dice textual, "o 'otro' si no hay evidencia suficiente".
  - **Lo dispara:** Cualquier pagina que el clasificador gratuito no logre ubicar. Medido sobre las 6
    capturas reales del repo: **2 de 6 (33%)** salen asi, y las dos son sitios de herramientas para
    desarrolladores.
  - Es primo de la anti-invencion y del mismo lado: la pieza afirma de la marca algo que la pagina
    nunca dijo. Sin categoria, el rotulo es la marca sola, que es verdad y alcanza.
  - **Encontrado MIRANDO un cuadro** (el 425 del render de tailwindcss), no leyendo codigo — igual que
    los otros dos de esta seccion.
  - **CERRADO 2026-08-04** + compuerta **E-SIN-RESERVA** en `tools/guion-check.mjs`.
  - **Y la compuerta nacio sin poder ponerse roja, otra vez.** Barria los 7 pagemodels del repo, que
    traen `tipoNegocio` real ('saas', 'ecommerce') porque se armaron cuando ese campo lo llenaba un
    LLM: el 'otro' nace en el camino GRATUITO, que los fixtures saltean. Daba verde con el defecto
    delante. Corregida probando los 6 valores de reserva a mano; ahora contra el codigo viejo acusa
    `PANADERIA DEL SUR · OTRO`.

- [x] **backend/site_capture.py — nada verifica que lo capturado sea la pagina**
  - **Sintoma:** El motor construyo 20 s enteros sobre una pagina de error de CloudFront. En el cuadro
    87 se lee "Request blocked. We can't connect to the server for..." con el Request ID impreso en
    pantalla. La pieza se entrego sin una sola queja.
  - **Lo dispara:** Cualquier captura que devuelva un error del CDN o una pantalla anti-bot. De las 7
    capturas cacheadas del repo, DOS estan podridas: www-sweetgreen-com da 0 frases (es el error de
    CloudFront) y www-sothebysrealty-com tiene de marca "HUMAN VERIFICA" (una pantalla de verificacion).
    O sea 2 de 7, un 29%.
  - **La senal existe y nadie la lee:** el propio log del render imprime "0 frases - 0 cifras - cta
    NINGUNO". Una pagina real no da eso nunca. Es una compuerta de una linea que no esta escrita.
  - **Compuerta:** Ninguna. `_es_placeholder` (motor.py) mira los recortes LQIP, no la pagina.
  - **CERRADO 2026-08-03.** `motor.pagina_sospechosa(datos)` devuelve el MOTIVO en texto —no un
    booleano— porque la salida correcta ante esto no es adivinar sino volver a capturar, y para eso hay
    que poder decir por que. Dos reglas independientes: SIN MATERIAL (0 frases y 0 cifras y sin CTA) y
    VOCABULARIO DE MURO (la marca o los textos dicen lo que dice un muro, comparado sin tildes).
  - **El piso sale de medir las 6 capturas reales que quedan.** La peor —mercadolibre— trae 2 frases,
    1 cifra y claim de 54 caracteres, asi que exigir 'algo, lo que sea' deja margen de sobra y no puede
    acusar a una pagina pobre pero legitima.
  - **El motor ahora CORTA.** Sin `--forzar` imprime el motivo y sale con codigo 2 sin construir un solo
    mp4; con `--forzar` avisa y sigue. Verificado en los dos caminos.
  - **Compuerta nueva: `tools/captura-check.py`** (E-CAPTURA-REAL), en la cadena: 6 capturas reales
    aceptadas, 4 muros rechazados, 3 paginas pobres aceptadas, y dos marcas desafortunadas ('Just a
    Moment Cafe', 'Acceso Humano') que NO se rechazan — el falso positivo es el riesgo real de este
    detector, porque no entregar un video es peor que entregar uno feo.
  - **Rota a proposito en las dos direcciones:** apagado el detector, acusa los 4 muros; exigiendo 5
    frases, acusa 4 capturas reales.
  - Los dos muros originales ya no estan en el repo, asi que las fixtures son RECONSTRUCCIONES de lo
    que la ficha registro de cada uno. Queda dicho aca para que nadie las lea como los archivos
    originales.

- [ ] **render3d/demo/heroes/cubo.js — las caras salen VACIAS (NO se reproduce en el arnes)**
  - Intento de reproduccion del 2026-07-31: construida la escena en Node con un fixture tipo stripe
    (logo + 3 cta + 4 tarjetas), con y sin testimonios (o sea con y sin el veto de laminas), da 6
    laminas de 4 imagenes DISTINTAS y 2 o 3 visibles por cuadro — que es lo correcto para un cubo. La
    cara azul oscura que se ve en el video es el NUCLEO (`BoxGeometry` con material #0d1020,
    cubo.js:70), o sea que lo que falla es que las laminas no se dibujan encima, no que falten.
  - Como NO se reproduce con material sintetico, hace falta el material REAL del render: hay que
    correrlo con los recortes de tools/out/motor/stripe-com y mirar cuantas texturas sobreviven a
    `texturaDe` (el veto de `esLamina` inspecciona pixeles, y con recortes sinteticos nunca dispara).
  - **Sintoma:** Cuadro 429 del render de stripe.com: el cubo ocupa el centro del cuadro con las dos
    caras visibles planas (una azul oscura, la otra gris), sin una sola imagen. Es el hero de la pieza y
    dura 8 beats, el doble que una escena normal.
  - **Lo dispara:** Sin determinar. La pagina SI trae material: 12 elementos (1 logo, 3 cta, 4 tarjetas
    y mas), y cubo.js:36 declara ROLES ['logo','tarjeta','foto','hero'] con recortesDe(..., 6), asi que
    deberia tener con que llenar las seis caras.
  - **NO es de los parches del 2026-07-31, verificado:** los unicos cambios no-comentario que esos
    parches metieron en kit.js son `alHueco` y `escalones` (el escalonado del scroll), y cubo.js no
    importa ninguna de las dos (su import de la linea 25 trae LOOK, b, E, hex, matAcento, nivel,
    recortesDe, texturaDe, dolly, orbita, deslizFijo).
  - **Compuerta:** Ninguna. Es el mismo punto ciego que documenta verificar.mjs:87-89 — los heroes se
    prueban con lienzos de 4 px porque lo que se audita es la GEOMETRIA, no los pixeles.
- SEGUIMIENTO de cubo.js caras vacias (2026-08-04): **no se reproduce con material real, y dos de las
  causas candidatas quedan descartadas por lectura de codigo.**
  - Renderizado tailwindcss.com con `--hero cubo` (la captura de stripe que hay hoy da 0 elementos, asi
    que el cubo ni se ofrece). Mirados 3 cuadros a resolucion completa —f170, f220 y f120— y **el cubo
    dibuja bien**: logo de la marca en una cara y una foto de la pagina en otra, con las laminas por
    encima del nucleo.
  - **Descartado que la causa sea una textura que no carga**: si `TextureLoader` falla, la url no entra
    en el Map, `texturaDe` devuelve null y `cubo.js:52-54` la filtra — con todas fallando `texs` queda
    vacio y el hero se declara `vacia: true`, o sea que NO dibujaria caras en blanco, no dibujaria
    nada. El sintoma descrito (caras planas sobre el nucleo) no sale por ahi.
  - **Descartado que sea material insuficiente**: eso da la MISMA imagen repetida, no caras vacias, y
    ademas desde el cupo de `CARAS_MINIMAS = 4` el hero ni se ofrece en ese caso.
  - Queda ABIERTO. La causa mas probable que sobrevive es que los recortes de esa pagina fueran
    regiones planas (un area lisa capturada como elemento), que es pariente del hallazgo de
    `_es_placeholder` y hoy tiene compuerta propia.
  - **Y salio de aca un defecto propio, ese si arreglado:** el informe del render devolvia
    `texturas: 0, faltan: []` FIJOS —un campo que siempre dice lo mismo no informa, tranquiliza— y
    `motor.py` ademas llama al render con `log=lambda *a: None`, o sea que el unico aviso sobre
    recortes que no cargan no se veia desde la entrada principal. Ahora se cuentan, viajan en el
    `.plan.json` y `motor.py` los imprime. Verificado rompiendo las URLs a proposito: avisa **6
    recortes no cargaron** y los nombra. Esa es exactamente la clase de defecto que ya costo TODOS los
    videos de produccion una vez (`el_captura_el0.png` contra `captura_el0.png`).

- [ ] **render3d/demo/escenas/mesa.js — el respaldo del recorte deja el tercio de arriba vacio**
  - **Sintoma:** Medido en 9 cuadros repartidos por toda la escena (228 a 296 del render de stripe.com
    con la tira cedida a `pantalla`): el tercio superior del cuadro esta plano entre 63.0% y 70.6%. No
    es transitorio, dura la escena entera.
  - **Lo dispara:** Que `mesa` componga con un RECORTE en vez de la tira, cosa que hasta el 2026-07-31
    casi no pasaba porque la tira estaba siempre disponible. Al darle la tira a `pantalla` (ver DUENO en
    guion.js) este camino pasa a ser el normal. La escena esta calibrada para un sujeto ALTO —la tira
    mide 720x8192— y un recorte apaisado le deja el hueco.
  - **La tension a resolver:** mesa.js:24 declara "El plano se compone ANCHO y se recorta por UV: la
    pagina no se estira nunca", pero el arreglo del estiramiento (mesa.js:78) achica el PLANO cuando la
    imagen es mas corta que la ventana. Para la tira eso es correcto; para un recorte apaisado habria
    que recortar por UV y no achicar. Son dos casos distintos con una sola rama.
  - **Compuerta:** Ninguna. Un hueco de fondo no es desborde ni pieza fuera de cuadro, asi que ni
    E-ENCAJE ni E-ENCUADRE aplican. Es el mismo punto ciego que titular.js:130.
- SEGUIMIENTO de mesa.js (2026-08-04): **el sintoma descrito no se reproduce; el que SI se ve es otro.**
  - Renderizado tailwindcss.com a 30 s, semilla 13, con un plan que pone `pantalla` ANTES que `mesa`
    —o sea con la tira ya cedida y `mesa` componiendo con un recorte, que es la condicion que la ficha
    pide—. Medido el tercio superior en 10 cuadros de la escena y comparado contra las otras 8 escenas
    de la MISMA pieza: `mesa` da 85.2% de planitud y es de las **menos** planas — `apertura` 95.6%,
    `destello` 96.1%, `cierre` 96.1%, `hero` 94.2%. El tercio de arriba no esta vacio: lleva el rotulo
    y su regla.
  - **Lo que si se ve mirando el cuadro 425 a resolucion completa:** el recorte de abajo sale CORTADO
    POR LOS DOS COSTADOS — se lee 'ors' donde dice 'Colors' y 'alette now uses more vibrant wide gamut
    colo' con la palabra partida a izquierda y derecha. O sea que la tension que la ficha describe
    (`mesa.js:24` promete recortar por UV y el arreglo del estiramiento achica el plano) se manifiesta
    como TEXTO CORTADO, no como hueco. Es la misma rama, con otro sintoma, y el sintoma que hay que
    buscar al arreglarla.
  - **Cuanto se pierde, medido:** construida `mesa` con una tarjeta apaisada real (1400x845) y
    proyectados los ocho vertices del plano contra la camara en 25 instantes y 3 aires, el recorte
    llega a **x = 1.164** del cuadro (1.000 es el borde), o sea que **se pierde el 13-14% de su ancho**.
    La escena declara sangrar 6% (`ANCHO = mundoW * 1.06`, 3% por lado): el efectivo es **cuatro veces
    y media** el declarado.
  - **La causa NO es la camara** —en esta escena no hay dolly ni orbita, solo una deriva de 0.008 del
    ancho—: es que el plano esta **INCLINADO 49 grados** (`INCLINA = -0.86`), asi que su borde cercano
    queda mas cerca de la camara y se magnifica. El ancho se eligio como si el plano fuera plano.
  - **Y el comentario que justifica ese ancho esta vencido:** dice 'un plano inclinado 35 grados ocupa
    cos(0.62) del alto que declara, o sea el 81%'. La constante es 0.86 rad = 49.3 grados y el codigo
    usa `Math.cos(INCLINA)` = 0.652, o sea 65%. El texto describe una escena que ya no es esta.
  - **La direccion del arreglo, derivada:** para que el borde CERCANO sangre lo declarado haria falta
    `ANCHO = mundoW * 0.965`. Pero ahi el borde LEJANO deja de cubrir el cuadro — y eso puede estar
    bien, porque la composicion de esta escena ya reserva la banda de arriba para el texto (ver la nota
    de la linea 20). Hay que verlo renderizado antes de dejarlo puesto: es un cambio de composicion, no
    una cuenta.
  - **SE PROBO EL ARREGLO DERIVADO Y SE SACO, con el render al lado.** Se corrigio `ANCHO` por la
    magnificacion del borde cercano (`distBase / (distBase - z)`, con z = (ALTO/2)·sin(-INCLINA)) y se
    renderizo la misma pieza, misma semilla, mismo cuadro 425:
    - **La superficie principal deja de perder pagina:** el recorte pasa de llegar a x = 1.164 a x =
      0.93-0.94, o sea de perder 13-14% de su ancho a no perder nada. En el video, la tarjeta del
      cliente entra ENTERA y con margenes, legible.
    - **Pero el sintoma que la ficha nombra NO desaparece:** el recorte de ABAJO —otra malla de la
      escena, no la superficie— sigue cortado por los dos costados. Mejora ('colors wit' donde antes
      se leia 'colo') y sigue estando.
    - **Y cambia la composicion:** al no sangrar, la mesa deja ver el fondo a los costados. La escena
      declara `mundoW * 1.06` justamente para sangrar.
  - Son DOS intenciones declaradas en conflicto —'sangrar 6%' contra 'la pagina no se estira nunca'— y
    elegir entre ellas es una decision de diseno, no una cuenta. Se revierte y queda ABIERTO con el
    arreglo probado y el numero: quien decida sangrar menos tiene el cambio hecho y medido.
  - **De paso, una precision util para quien lo retome:** la derivacion es CIRCULAR y por eso este
    intento sobrecorrige. La magnificacion depende del ALTO, y para un recorte apaisado el ALTO final
    sale de `ANCHO / arMapa` — o sea del propio ancho que se esta calculando. Hace falta dos pasadas o
    resolver la cuadratica; calcularlo con el alto PROVISIONAL da 0.93 en vez de 1.06.

- SEGUIMIENTO (abierto, pertenece a hero.js:76) — **intentado por el lado del cupo y no demostrado**
  - Se probo contar en el cupo la frase que bebe el hero (restarle 1 a `nFr`). El plan salio IDENTICO:
    0.44 sedientas y 0.41 heroes por pieza a 20 s, 0.69 y 0.86 a 30 s, los mismos numeros con y sin el
    cambio sobre 180 guiones. En las duraciones que se usan el cupo no es la restriccion que ata —ata el
    presupuesto de beats— asi que el cambio se saco. Queda ABIERTO: la repeticion existe, pero el
    arreglo por el lado del cupo no la toca y hay que buscarla en otro lado.

- SEGUIMIENTO (cerrado) — **mosaico.js:224, regresion propia**
  - El parche del relevo (de la tanda de 31 del 2026-07-31) creo un SEGUNDO sitio de dimensionado que
    nacio sin el tope de resolucion que se le habia puesto al primero diez lineas antes. Medido: la
    banda volvio a 4.28x la resolucion del archivo con la cota puesta a diez lineas de distancia.
  - **La leccion, que vale mas que el arreglo:** el tamano se calcula en DOS lugares del mismo archivo,
    asi que arreglar uno no arregla el otro Y la medicion de uno tapa al otro. Y se colo porque los
    parches se aplicaron en lote sin volver a medir cada uno.

---

- SEGUIMIENTO (abierto, pertenece a verificar.mjs:315) — **el fixture sigue sin construir la pildora**
  - Se le paso `datos: ANTHEM.datos` y un `dominio` largo derivado del nombre, y ademas se marco la
    pildora con `userData.encaja`. La compuerta SIGUIO EN VERDE contra la version de `cierre` sin tope,
    o sea que el fixture todavia no llega a construir la pildora. El fixture quedo mejor (ahora si
    construye `tarjetas`, que antes salia por `vacia`), pero el objetivo no se cumplio.
  - Falta averiguar por que `dominio` no llega a `ctaTxt`. Es una linea, pero hay que encontrarla.

- SEGUIMIENTO (cerrado) — **prisma.js:35 y gota.js:130**
  - Se ato el radio al lado que recorta (el ANCHO, no mundoH): en prisma el anillo mayor pasa de 3.485
    a 2.478 contra un semiancho de 2.8125, y en gota la orbita se capa en mundoW*0.42 = 2.36 en vez de
    quedar entre 2.87 y 3.52. La aritmetica EN REPOSO es inequivoca y por eso el cambio se deja puesto.
  - Pero la comprobacion propia dio 1.381 y 1.204 en coordenadas de recorte, o sea "se sale". Esa
    medicion usa CAJAS ENVOLVENTES, y la caja de un toro rotado es mucho mas grande que el toro: es
    exactamente el error de medir un proxy en vez de la cosa contra el que advierte CLAUDE.md. No
    prueba ni que este bien ni que este mal.
  - **Lo que falta:** medir VERTICE A VERTICE, como dice el hallazgo original, y con el dolly de cada
    aire puesto (deportivo es el que peor da). Hasta entonces esto NO esta cerrado.

# EXTRA — para charlar despues, NO hacer ahora

Estos dos NO son hallazgos de la auditoria: son temas que Thiago quiere discutir cuando la lista de
arriba este terminada. Van al final a proposito. **No empezar ninguno de los dos sin hablarlo antes.**

- [ ] **EXTRA 1 — Que hacer cuando la pagina nos bloquea**
  - Paso el 2026-07-31 con sweetgreen.com: el CDN devolvio "Request blocked. We can't connect to the
    server for..." y el motor construyo 20 s enteros sobre esa pantalla de error, con el Request ID
    impreso en el video. De las 7 capturas cacheadas del repo, DOS estan asi: sweetgreen (CloudFront) y
    sothebysrealty, cuya marca capturada es "HUMAN VERIFICA" (una pantalla anti-bot).
  - Lo que HAY que decidir hablandolo, porque son politicas y no bugs: si se reintenta, si se avisa al
    usuario que esa pagina no se puede capturar, si hay un camino de respaldo (composicion sin captura),
    o si simplemente se rechaza el pedido. Cada opcion cambia que ve el cliente.
  - NO confundir con el hallazgo tecnico que ya esta anotado mas arriba ("nada verifica que lo capturado
    sea la pagina"), que es la DETECCION. Este pendiente es que hacer DESPUES de detectarlo.

- [ ] **EXTRA 2 — Elegir a mano que imagenes van en los heroes**
  - Hoy el motor elige solo que recortes entran en los objetos 3D que giran (cubo, mosaico, vitrina,
    prisma, ventana...) a partir de los ROLES que declara cada hero y del orden en que la pagina los
    entrego. El usuario no tiene voz.
  - La idea es poder seleccionar las imagenes. Hay que definir hablandolo: donde se elige (el estudio,
    el editor de timeline), que pasa si la elegida no le sirve al hero que toco, si la eleccion sobrevive
    a cambiar la semilla, y como convive con el reparto que evita repetir imagenes entre escenas.

