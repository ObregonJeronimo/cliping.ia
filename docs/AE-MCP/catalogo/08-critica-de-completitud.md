No resumí: abrí el exportador y el motor del repo y contrasté las clasificaciones contra el código. Buena parte de lo que los seis frentes dejaron como "verificar" ya está contestado ahí, y varias respuestas contradicen el catálogo.

Archivos que uso como evidencia:
`C:\Users\Thiago\Documents\cliping.ia\tools\ae\sondas\exportar.jsx`, `C:\Users\Thiago\Documents\cliping.ia\tools\ae\motor\comp3d.html`, `C:\Users\Thiago\Documents\cliping.ia\tools\ae\motor\capturar-comp.py`, `C:\Users\Thiago\Documents\cliping.ia\tools\ae\comp.mjs`, `C:\Users\Thiago\Documents\cliping.ia\tools\ae\curvas.mjs`.

---

# 1. GESTOS QUE NO CUBRIÓ NADIE

**1.1 · Las SALIDAS. El catálogo entero es de entradas.** Seis frentes, ~140 fichas, y hay exactamente una frase sobre cómo se va un elemento ("la salida dura 60–70% de la entrada"). No hay una sola ficha de salida con receta: salida por colapso al punto de origen, salida barrida por tapa, salida por empuje del siguiente, salida hacia la cámara (escala+Z con desenfoque), salida por desarme (las partes se van escalonadas en dirección contraria a como entraron), salida "a destiempo" (se va antes de que uno termine de leer, para forzar el ritmo). Una pieza con 40 entradas bien resueltas y 40 salidas por opacidad se siente exactamente igual de muerta. **Frente: oficio y revelados, los dos lo saltearon.**

**1.2 · REORDENAMIENTO / BAR CHART RACE.** Elementos que intercambian posiciones porque el dato cambió el orden. Es el gesto de video de datos con más lectura por costo y es transformación pura (posición + escalonado + el que sube pasa por delante). No está en formas, ni en oficio, ni en transiciones. Y con él, toda la familia "el eje se re-escala cuando llega un valor mayor" y "la etiqueta viaja pegada a la punta de la barra". **Frente: formas.**

**1.3 · CURSOR / TOQUE / INTERACCIÓN.** Un puntero que entra, se posa, hace clic, y la interfaz responde. Género entero del product film y del explainer de software — que es literalmente lo que este repo hace. Es un PNG + posición + un aro que escala y desvanece + un acuse de 2 px en el botón. Cero adiciones. Tiene convenciones duras que nadie escribió: el cursor llega 6–8 cuadros antes del clic y desacelera, el aro dura 10–14 cuadros, la interfaz reacciona 2 cuadros DESPUÉS del clic, nunca en el mismo cuadro. **Frente: ninguno lo reclamó; le correspondía a transiciones o a oficio.**

**1.4 · SCROLL DE PÁGINA / RECORRIDO DE UNA CAPTURA LARGA.** El repo captura páginas enteras (`tira.png`) y ningún frente listó el gesto de recorrerlas: la captura larga se desplaza detrás de la ventana del dispositivo, con paradas en las secciones. Es tapa + posición + mesetas, (a) puro, y es el gesto que más directamente sirve al producto. Con sus reglas: el scroll nunca es lineal ni easy-ease, es "arranca fuerte y frena" con mesetas de 30–60 cuadros; el salto entre secciones lejanas se hace con corte, no con scroll (un scroll de 4000 px se lee como un error). **Frente: tridimensional (mockup de dispositivo) lo rozó y no lo escribió.**

**1.5 · LLAMADAS Y ANOTACIONES (callouts).** Línea que se dibuja desde un punto de la interfaz hasta una etiqueta, punto pulsante en el origen, etiqueta que entra desde la línea. Columna vertebral del explainer. No está en revelados ni en formas. Y tiene una trampa concreta: la línea acodada (en L) no se puede hacer con una escala X — son dos segmentos con retardo, y ese detalle es lo que separa la versión que funciona de la que se deforma.

**1.6 · ROLL / CANTEO DE CÁMARA (dutch).** El frente tridimensional listó push, pull, truck, pedestal, crane, orbit, pan, tilt, whip, push-through, dolly zoom, zoom, rack focus, shake y corte — **y se olvidó de la rotación Z de la cámara**, que es la mitad de un latigazo bien hecho y todo el vocabulario de "inclinar el mundo" en títulos. Peor: es el caso donde el motor falla en silencio (ver 4.1).

**1.7 · AUTO-ORIENTACIÓN DE UNA CAPA (billboard / orientar según trayectoria).** Un rótulo 3D que siempre mira a la cámara mientras el mundo gira. En AE es `autoOrient` en una capa AV. Ningún frente lo nombró, y el exportador sólo lee `autoOrient` dentro de la rama de cámara (`exportar.jsx:351`): una capa AV auto-orientada exporta rotaciones en cero, sin NOSOP, y el reproductor la deja fija. Es un gesto faltante **y** un agujero mudo del exportador al mismo tiempo.

**1.8 · CAMBIO DE COLOR DE UN ELEMENTO.** El acento que cambia de color al golpe. Nadie lo catalogó como gesto propio (el frente texto lo trató sólo para color por carácter). No es trivial: nuestros colores de sólido y de texto son estáticos, así que es dos copias cruzadas por opacidad — con el costo de duplicar capas y, en formas, de duplicar rasterizaciones.

**1.9 · REDIMENSIONADO DE UN PANEL CON ESQUINAS REDONDEADAS (nine-slice).** Media docena de fichas dicen "el panel crece" y lo resuelven con escala. **Escalar un rectángulo redondeado rasterizado deforma las esquinas**, y se ve. La solución real es de nueve piezas (cuatro esquinas fijas, cuatro bordes que escalan en un eje, el centro que escala en dos) — nueve capas y nueve PNG. Nadie lo dijo, y es el error que aparece en el primer panel que cambie de tamaño.

**1.10 · CIERRE DE CICLO (loop perfecto).** El cuadro final igual al inicial, sin costura. Género completo (social, fondos, cargadores) y regla dura que no está escrita: el último keyframe tiene que ser idéntico al primero **y** la velocidad en los dos extremos tiene que coincidir, o el bucle late.

**1.11 · ENSAMBLADO / DESARMADO de un logo o un ícono desde sus partes.** Convergencia con retardo inverso al radio. Es (a) y no está.

---

# 2. LO QUE ESTÁ SUB-ESPECIFICADO

Marco sólo lo que hoy no se puede ejecutar sin inventar algo.

- **texto #16, texto sobre trazado.** "El script calcula la curva paramétrica él mismo y samplea el avance acumulado". No hay curva, no hay paso de muestreo, no hay cómo se convierte avance-de-carácter (que es ancho, no arco) en longitud de arco. Sin eso, la ficha es una intención.
- **formas #6, trim individual escalonado.** "El script mide cada trazado y calcula su ventana temporal". Medir la longitud de arco de una bezier es la mitad del trabajo de la ficha y no está ni esbozada. Y en AE hay que sacarla de `ADBE Vector Shape` → `.value.vertices/inTangents/outTangents`, que ningún frente escribió.
- **texto #20, barrido de resalte.** "El sincronismo es estructural, no de tiempos" — pero la receta no funciona (ver 4.5). Además no da el tiempo del cambio de color respecto del borde del resalte, que es lo único que importa del gesto.
- **tridimensional #21, sombra de contacto falsa.** "Opacidad ligada a la altura". No hay función, no hay rango, no hay especificación del PNG (relación tamaño-sombra/objeto, radio de degradado, opacidad base). Es la ficha más vaga del corpus y es un gesto que se usa en cada plano.
- **detalle-fino G12, micro-movimiento.** Da amplitudes y períodos (bien) pero no da la función de fase por propiedad ni la semilla, y este repo exige determinismo por escrito. "Dos senos de períodos incomensurables, 43 y 67" es un ejemplo, no una especificación: falta qué se hace con la tercera propiedad, con la segunda capa, y cómo se reproduce igual mañana.
- **detalle-fino G22, acabado.** Grano "1–3% animado". Falta el tamaño de grano en píxeles, la tasa (¿un patrón nuevo por cuadro? ¿en doses?) y —esto es lo grave— **dónde se aplica**: el arnés promedia 16 sub-cuadros por cuadro (`capturar-comp.py:166-172`). Un grano generado en la página se promedia 16 veces y desaparece. El acabado tiene que ir **después** del promediado, en el compositor. Ningún frente lo notó y es la diferencia entre que funcione y que no exista.
- **formas #15 / la "tira de estados".** "Rasterizar 3 estados y alternarlos con puntos de entrada/salida cada 2–3 cuadros". Falta: cómo se rasterizan tres estados distintos de la MISMA forma (hay que duplicar la capa y cambiar `ADBE Vector Random Seed` en cada copia) y qué pasa con el ciclo cuando la pieza dura más que 3 estados. Y colisiona con el defecto 3.5.
- **revelados #4, ventana de cuatro tapas.** Se presenta como "el motor de la mitad del catálogo" y no trae una sola cuenta: dónde va el anclaje de cada tapa, qué escala corresponde a qué borde de la ventana, cómo se rota el conjunto sin que las cuatro se despeguen. Es la pieza de infraestructura más citada y la menos escrita.
- **oficio §1.8, la compuerta de energía.** Es la mejor idea del corpus y está a mitad de camino: define `E_i` con `pesoVisual` = fracción de área de pantalla, pero el documento no tiene área de pantalla — tiene cajas de texto medidas, tamaños de sólido y cajas de ráster, y las capas 3D proyectan distinto según la cámara. O se define contra el área proyectada (y entonces hay que proyectar, que se puede: `motor/comp3d.html` ya calcula la matriz por capa) o el número no es computable. Tal como está, no se puede implementar.

---

# 3. LO QUE SE DIO POR SABIDO

**3.1 · Tres "no confirmados" que el repo ya tenía contestados desde antes de la investigación.** El frente tridimensional dejó como riesgo el matchName del punto de interés y el de `Position_0/_1/_2`, y el frente oficio dejó `comp.motionBlurShutterAngle/Phase` en "media-alta confianza". Los tres están en el código, en uso y medidos: `exportar.jsx:488` vuelca el POI como `ADBE Anchor Point` (y `comp3d.html:292` lo consume para el look-at), `exportar.jsx:493-497` usa `ADBE Position_0/_1/_2`, y `exportar.jsx:116-119` lee `comp.shutterAngle` / `comp.shutterPhase` / `comp.motionBlurSamplesPerFrame`. Nadie miró el repo antes de declarar incertidumbre. Eso no es honestidad, es investigación incompleta con cara de honestidad.

**3.2 · Toda la tabla de matchNames de FORMAS es irrelevante para el exportador y nadie lo dijo.** `exportar.jsx:288-336` rasteriza la capa de forma entera a PNG sin tocar el árbol; recorre a ciegas con `tieneClaves()` y sólo pregunta `numKeys`. Ningún `ADBE Vector *` viaja. Sirven para **construir** el aspecto, no para exportarlo — y esa distinción cambia el riesgo: un matchName mal escrito ahí rompe el autor, no el documento.

**3.3 · "Los animadores de texto quedan como referencia" — no, quedan como fallo.** `exportar.jsx:477-481` emite `NOSOP|animadores de texto` en cuanto haya uno, y una línea NOSOP pone el veredicto en rojo. La regla "autorar como se va a exportar" no es un consejo de estilo del frente texto: está impuesta por el exportador. Igual con el texto animado (`exportar.jsx:474`: cualquier clave en el texto de origen es NOSOP), con las máscaras, las matas, los modos de fusión, las capas de ajuste y el remapeo de tiempo.

**3.4 · `layer.copyToComp` y el instante del ráster: supuesto sin verificar y probablemente falso.** `exportar.jsx:306-327` crea una comp temporal de **1 segundo**, copia la capa y guarda **el cuadro 0**. `copyToComp` conserva el startTime de la capa. Entonces toda forma cuyo inPoint no sea 0 corre riesgo de rasterizar **vacía o fuera de su ventana** — y la caja se midió en `inPoint` mientras el render sale de t=0. Esto tumba, si se confirma, las tres recetas que dependen de formas escalonadas: la tira de estados del *boil*, la persiana de N tapas y las ondas concéntricas duplicadas. Es una prueba de un minuto y hay que hacerla antes de escribir una pieza.

**3.5 · "AE ordena las capas 3D por Z" es cierto para AE y falso para nuestro motor.** `comp3d.html:267-272`: `depthTest = false`, `depthWrite = false`, `renderOrder = numCapas - indice`. **El apilado manda siempre y la Z no ocluye nunca.** El frente tridimensional escribió la regla contraria como uno de sus tres hallazgos de cabecera ("toda tapa a −1 unidad de Z"). Consecuencia mayor: cualquier composición donde dos capas 3D se crucen en Z diverge de AE, y no hay nada que lo detecte. Falta una compuerta que compare el orden por Z contra el orden de apilado cuadro a cuadro y avise cuando se invierten.

**3.6 · Las capas 2D no se intercalan.** `comp3d.html:274-275` y `450-453`: si hay cámara, toda capa 2D va a una escena aparte que se dibuja **después** de todo el mundo 3D. Una tapa 2D está siempre encima de todo lo 3D, sin importar el apilado. La regla del frente formas ("el objetivo abajo, las tapas encima, y todo el resto del contenido por encima de las tapas") no se puede cumplir cruzando la frontera 2D/3D. Está declarado en un comentario del código y ningún frente lo recogió.

**3.7 · El texto se dibuja con UN solo `fillText`** (`comp3d.html:174`). No hay soporte de varias líneas, y el trazo del texto se exporta (`exportar.jsx:455-456`) pero **no se dibuja nunca** — ni siquiera se exporta su grosor. Todas las fichas que hablan de "escalonado entre líneas 3–4 cuadros" asumen una capa multilínea: hay que autorar una capa por línea, y hay que decirlo.

**3.8 · `letterSpacing` de canvas no es el tracking de AE.** `comp3d.html:173` traduce tracking a `letterSpacing`. CSS agrega espacio **también después del último carácter**; AE no. En texto centrado o alineado a la derecha eso corre el bloque medio paso de tracking. Es exactamente la clase de defecto que la garantía del 1% debería cazar y que nadie planteó.

**3.9 · El fondo de la comp no se dibuja en los cuadros.** `capturar-comp.py:159,171` capturan con `omit_background=True` y el color de fondo se compone recién al codificar (`:201-220`). Dos consecuencias que nadie previó: (i) la tapa del "color del fondo" es opaca sobre transparencia, así que funciona a la vista pero **convierte fondo transparente en masa opaca**, y el arnés de medición pesa por alfa (`capturar-comp.py:8-9`) — las tapas contaminan cualquier métrica de cobertura o centroide; (ii) el "fondo plano" que toda la familia de tapas exige tiene que ser un **sólido real**, no el color de composición.

**3.10 · `curvas.mjs` sí está verificado y hay que citarlo como tal.** La fórmula, `EASY_EASE = 33.333333` medido contra AE 26.3x87, y el caso de influencia 0. El frente oficio propuso una columna de "influencia AE" propia para los tokens de Material Design: esas traducciones no están verificadas y `y1 = 0.7` **no sale con velocidad 0** — hay que poner velocidad de salida, y ahí el valor depende de `dv/dt`, o sea que no es un preset, es una cuenta por tramo. Está dicho a medias y va a fallar la primera vez que alguien lo copie como número fijo.

---

# 4. CLASIFICACIONES MAL PUESTAS

## Dicen (a) y hoy no se puede

**4.1 · Paneo y balanceo de cámara — tridimensional #07, #08 (variante con cámara), #13. Es (b) y es un agujero del exportador.**
`exportar.jsx:231` hace `es3D = capa.threeDLayer`, y **`threeDLayer` no existe en `CameraLayer`** (es propiedad de AVLayer): devuelve `undefined`, `es3D` queda en falso, y el bloque `if (es3D)` de `exportar.jsx:505-509` **nunca vuelca `ADBE Orientation`, `ADBE Rotate X` ni `ADBE Rotate Y` de una cámara**. Encima, el reproductor sólo usa `orientacion` en la rama de un nodo (`comp3d.html:294,312-315`) y **no aplica `Rotate X/Y/Z` de cámara en ninguna de las dos ramas**. Traducción: paneo, inclinación, roll y latigazo-por-rotación de cámara salen del documento en cero, sin NOSOP, sin aviso. La cámara de dos nodos funciona sólo porque el apuntado se recalcula del POI. Esto es lo primero que hay que arreglar de todo el informe, y no es un gesto nuevo: es una capacidad que el brief da por existente.

**4.2 · Volteo de tarjeta con cara trasera — transiciones #13, tridimensional #19. Es (b).**
Las dos fichas dicen "la conmutación de cuál se ve la hace la Z, sola" y las dos cerraron con "verificá qué hace tu motor". El motor está en el repo y la respuesta es: **la Z no conmuta nada** (4.1 de arriba, `depthTest=false`). Dos capas coplanares separadas 1 unidad de Z se dibujan siempre en orden de apilado; la de arriba gana en toda la superposición, gire lo que gire el nulo. Hoy el volteo de dos caras no se puede. Lo que sí se puede es el volteo de **una** cara (revelados #17, rotación −90→0), que sigue siendo (a).

**4.3 · Atravesar / push-through — tridimensional #09. Es (b).**
Depende de que la capa que quedó detrás deje de verse. Con apilado fijo y sin prueba de profundidad, la capa "atravesada" sigue dibujándose encima o debajo según su índice, para siempre. Además el reproductor fija `near = 1` (`comp3d.html:281`) y AE recorta distinto. Se puede fingir con opacidad HOLD en el cuadro del cruce — pero eso es otra receta y hay que escribirla.

**4.4 · Falsa extrusión — tridimensional #18, texto #22. (a) sólo dentro de un rango de ángulo.**
N copias separadas en Z funcionan mientras el orden de apilado coincida con el orden en Z visto desde la cámara. Al pasar el perfil, AE invierte el orden por profundidad y el motor no. O sea: se ve bien hasta que gira, que es justo para lo que existe.

**4.5 · Barrido de resalte / karaoke — texto #20. Es (b), no (a).**
La receta pide que una copia se vea **dentro** del rectángulo y la otra **fuera**: son regiones complementarias, y eso es una mata, no una tapa. Una tapa oculta desde un borde todo lo que está debajo en el apilado, incluida la copia que se quiere conservar. Probé las tres ordenaciones posibles sobre el papel y ninguna cierra. Es el subtítulo de redes, o sea el formato más usado que existe: conviene que quede bien clasificado.

**4.6 · Desenfoque de movimiento selectivo por capa — detalle-fino G15. Es (b).**
`layer.motionBlur` se exporta (`exportar.jsx:390`) y el arnés **promedia el screenshot completo** (`capturar-comp.py:166-176`). No hay forma de que una capa quede nítida mientras las otras se borronean. Toda la regla "la tipografía de lectura no lleva desenfoque" no es aplicable hoy. Y por lo mismo, el ángulo de obturador por tramo (detalle-fino G14, tridimensional #08) no es sólo una limitación de AE: también lo es del arnés, que lee ángulo y fase una vez del documento.

**4.7 · El latigazo no es gratis.** Tres frentes lo venden como "la pieza rara que ya tenemos". Cierto en capacidad, falso en costo: con obturador activo el arnés hace **una captura por sub-muestra**; el propio comentario del código dice 16 muestras, 10 s = 4800 capturas ≈ 17 minutos. Cualquier plan que use obturador en toda la pieza multiplica el render por 16 y hay que decirlo al lado del gesto.

**4.8 · "El repetidor expandido cuesta bytes una sola vez" — formas §0.3. Falso.**
El exportador rasteriza **una capa, un PNG** (`exportar.jsx:326-329`, `forma-<i>.png`). Cuarenta copias son cuarenta rasterizaciones en AE, cuarenta PNG en disco y cuarenta texturas en el motor. La grilla de 100 celdas y la extrusión de 24 copias hay que recotizarlas.

**4.9 · Corte a tiempo con obturador encendido.** Oficio #14 y detalle-fino G20 dan el corte como (a) exacto. El reproductor decide visibilidad por `entra/sale` en **cada sub-muestra** (`comp3d.html:502-505`), así que un corte que cae dentro de la ventana del obturador sale como un cuadro fantasma a media opacidad. Puede ser lo correcto o no —depende de si AE recorta el inPoint a cuadro entero, que **no verifiqué**— pero es una divergencia posible en el gesto que los seis frentes recomiendan como el más barato para arreglar el ritmo. Prueba de un cuadro.

## Piden agregar algo cuando había salida más barata

**4.10 · Micro-movimiento declarativo en el comentario — detalle-fino G12, propuesta (b) #2. Hay que descartarla, y por fidelidad, no por costo.**
El comentario se aceptó para el resplandor porque ahí la identidad de píxel **se declaró imposible** (`exportar.jsx:239-247`: el efecto de AE vive antes de la transformación 3D, el bloom del motor es post-proceso). El micro-movimiento sí puede ser idéntico. Declararlo en el comentario significa que AE muestra una cosa y el motor otra **por construcción**, y rompe la única regla que sostiene el proyecto. Los 500 keyframes horneados no son el camino caro: son el único camino honesto.

**4.11 · Texto de origen con claves HOLD — texto #10 y #11, presentado como "chico" y de mejor retorno. No es chico en este motor.**
`comp3d.html:147-183` construye **una** textura de canvas por capa, en el armado, y el plano se dimensiona con esas métricas. Cambiar la cadena por cuadro obliga a rehacer la textura y la geometría en cada cuadro, y con obturador, en cada sub-muestra. La salida barata ya existe y el motor ya la soporta sin tocar nada: **N capas de vida corta**, que es exactamente lo que hace `dentro = t >= capa.entra && t <= capa.sale`. Ochenta capas de dos cuadros son gratis para el reproductor. La ficha las llamó "caras y feas de generar"; son lo más barato de las dos opciones.

**4.12 · Desenfoque por capa — revelados #19, detalle-fino G19. Confirmo que es barato, y más de lo que estimaron.**
La maquinaria que hace falta ya está construida para el resplandor: `comp3d.html:386-410` agrupa capas, **oculta las demás**, renderiza el grupo a un `WebGLRenderTarget` y compone. Un desenfoque por capa es esa misma pasada con otro filtro. Súbanlo de prioridad.

**4.13 · Recorte rectangular por capa (E2) — el bloqueo real no es el motor.** En three es un plano de recorte o cuatro uniformes; barato, como dijeron. Lo que nadie vio es el lado de AE: si el autor lo expresa con una **máscara**, `exportar.jsx:265-268` emite NOSOP y el documento sale en rojo. Antes de construir E2 hay que decidir cómo se declara del lado de AE sin romper el inventario, y modificar el inventario para que esa máscara concreta deje de contar como no soportada. Esa decisión es el trabajo; el shader es la parte fácil.

**4.14 · Texto calado — revelados #9, dado como (a) "se rasteriza a un solo PNG".** Se puede, pero sólo convirtiendo el texto a contornos y restando con Merge Paths para que quede una **capa de forma** (lo único que el exportador rasteriza). Eso pasa por un comando de menú, y este repo ya se quemó con eso: `findMenuCommandId("Easy Ease")` devolvía 0 porque la interfaz estaba en español. Es (a) con una trampa nombrada, no (a) liso.

---

## Lo que yo haría antes de escribir una línea de pieza

Cinco pruebas de un cuadro cada una, todas contra AE por `tools/ae/llamar.mjs`, que deciden clasificaciones que hoy están escritas por deducción: (1) `threeDLayer` en una cámara — decide 4.1; (2) `copyToComp` + `saveFrameToPng(0)` con una forma que empieza en el segundo 3 — decide 3.4; (3) dos capas 3D que se cruzan en Z, un cuadro en AE y uno en el motor — decide 4.2/4.3/4.4; (4) una tapa sobre una capa con `brillo` declarado — la respuesta la puedo anticipar leyendo `comp3d.html:414-425`: la mezcla es **aditiva sobre el render base**, así que el halo se suma **encima de la tapa** y la tapa no lo apaga; los dos frentes que dejaron esto como pregunta abierta ya tienen la respuesta, y es "no"; (5) un corte en el medio de la ventana del obturador — decide 4.9.