# EL VOCABULARIO — catálogo consolidado, orden de construcción, reglas de coreografía y tres piezas

Verifiqué contra el código antes de escribir. Lo que sigue corrige el catálogo donde el repo contradice a la investigación, y agrega lo que ningún frente cubrió. Archivos leídos: `C:\Users\Thiago\Documents\cliping.ia\tools\ae\sondas\exportar.jsx`, `C:\Users\Thiago\Documents\cliping.ia\tools\ae\motor\comp3d.html`, `C:\Users\Thiago\Documents\cliping.ia\tools\ae\curvas.mjs`, `C:\Users\Thiago\Documents\cliping.ia\tools\ae\motor\capturar-comp.py`.

---

# PARTE 0 — LO QUE HAY QUE SABER ANTES DE AUTORAR UNA LÍNEA

## 0.1 Las siete leyes del motor (no son consejos: son cómo dibuja)

**LEY 1 — EL APILADO MANDA SIEMPRE. LA Z NO OCLUYE NUNCA.**
`comp3d.html:267-272`: `depthTest = false`, `depthWrite = false`, `renderOrder = capas.length − indice`. AE ordena las 3D por distancia a la cámara; el motor las ordena por posición en la lista. **Coinciden sólo si vos los hacés coincidir.**
Regla de autoría, obligatoria: en cada plano, el orden de apilado tiene que ser el mismo que el orden por Z visto desde la cámara, **en todos los cuadros**. Dos capas no se cruzan en Z dentro de un plano. Si el guion pide un cruce, es un corte (una sale, la otra entra, mismo cuadro), no un cruce.
Corolario que simplifica: una **tapa** va 1 unidad más cerca de la cámara **y** inmediatamente arriba en el apilado. Los dos criterios apuntan al mismo lado, así que AE y el motor coinciden por partida doble.

**LEY 2 — LAS CAPAS 2D SE DIBUJAN DESPUÉS DE TODO EL MUNDO 3D.**
`comp3d.html:446-453`. En una comp con cámara, una capa 2D está siempre encima de todo, sin importar el apilado. Regla: en un plano con cámara, **todo es 3D**, salvo rótulos de pantalla completa y tapas de cuadro entero que van a propósito arriba de todo.

**LEY 3 — EL TEXTO ES UNA SOLA LÍNEA, UN SOLO `fillText`.**
`comp3d.html:174`. No hay multilínea, y el trazo del texto se exporta pero no se dibuja. Una capa por línea, siempre. Y el `letterSpacing` del canvas agrega espacio **después del último carácter**, cosa que AE no hace: **texto con interletra ≠ 0 se alinea a la izquierda**, o compensás la posición media interletra.

**LEY 4 — EL FONDO DE LA COMP NO EXISTE HASTA EL CODIFICADO.**
`capturar-comp.py:159-171` captura con `omit_background=True`. El "fondo plano" que toda la familia de tapas necesita tiene que ser un **sólido real**, capa de la comp, al fondo del apilado. Y las tapas son opacas sobre transparencia: contaminan cualquier métrica de cobertura por alfa del arnés.

**LEY 5 — EL OBTURADOR MULTIPLICA EL RENDER POR EL NÚMERO DE MUESTRAS.**
`capturar-comp.py:166-176` hace una captura por sub-muestra. 16 muestras × 10 s × 30 fps = 4800 capturas ≈ 17 min. **El obturador se enciende por pieza, no por gesto** (AE lo tiene por composición y el arnés lo lee una vez). Presupuesto: si la pieza lleva obturador, el render es 16× — decidilo al planificar, no al final.

**LEY 6 — EL DESENFOQUE DE MOVIMIENTO NO ES SELECTIVO.**
El arnés promedia el cuadro entero. `layer.motionBlur` viaja pero no cambia nada. La regla "la tipografía no lleva borrón" **no se puede cumplir hoy**. Sustituto: **la tipografía de lectura nunca supera 8 px/cuadro**. Si necesitás que un texto cruce rápido, es un gesto de tránsito, no de lectura.

**LEY 7 — LAS FORMAS SE RASTERIZAN A t=0 EN UNA COMP TEMPORAL DE 1 s.**
`exportar.jsx:306-329`. Riesgo abierto: una forma con `inPoint > 0` puede rasterizar vacía. **No esperes la prueba: autorá todas las capas de forma con `inPoint = 0` y ocultalas con opacidad**, no con el tiempo de entrada. Cuesta nada y esquiva el problema entero. (Y para el corte duro sí querés `inPoint`: usá opacidad con claves HOLD, que da el mismo cuadro exacto.)

## 0.2 Lo que sale NOSOP (pone el veredicto en rojo)

Animadores de texto (`exportar.jsx:477`), texto de origen con claves (`:474`), máscaras, matas de pista, modos de fusión, capas de ajuste, efectos, remapeo de tiempo, expresiones. **No son "no soportado": son error.** Todo lo de abajo está escrito para no tocar ninguno.

Y un agujero **mudo**, que es peor: `autoOrient` en una capa AV no se exporta ni avisa. No la uses hasta que emita NOSOP (ver B0).

## 0.3 El vocabulario de curvas — ocho, y ninguna más

`curvas.mjs` está verificado contra AE 26.3x87. Con velocidad 0 en ambos extremos: `cubic-bezier(i_sal/100, 0, 1 − i_ent/100, 1)`.

| id | nombre | influencia sal/ent | cubic-bezier | para qué |
|---|---|---|---|---|
| **C1** | ENTRADA | 20 / 85 | `0.20, 0, 0.15, 1` | el 60% de todo. Entra rápido, aterriza |
| **C2** | PESADA | 10 / 92 | `0.10, 0, 0.08, 1` | paneles grandes, fondos, cosas con masa |
| **C3** | SALIDA | 90 / 15 | `0.90, 0, 0.85, 1` | todo lo que se va. Arranca lento, se dispara |
| **C4** | LATIGAZO | 85 / 85 | `0.85, 0, 0.15, 1` | tránsitos que cruzan el cuadro |
| **C5** | DERIVA | 0 / 0 | `0, 0, 1, 1` (lineal) | derivas, bucles, barridos de luz, odómetros |
| **C6** | TRASLADO | 70 / 70 | `0.70, 0, 0.30, 1` | A→B con reposo en los dos extremos |
| **C7** | GOLPE | 0 / 80 | `0, 0, 0.20, 1` | acuses, impactos: arranca a máxima velocidad |
| **C8** | ASENTAMIENTO | 70 / 20 | `0.70, 0, 0.80, 1` | el tramo de vuelta de un sobrepaso |

**Nunca uses Easy Ease (33/33).** Es la firma de "plantilla" y hace que todo pese igual.
**El sobrepaso NO es una curva**: es un keyframe extra. `easeOutBack` tiene `y1 = 1.56` y sale del rango; sólo se consigue con velocidad de salida mayor que la media del tramo, o sea con una cuenta por tramo. Usá tres claves y listo.

## 0.4 La corrección que va en la otra dirección

El frente tridimensional clasificó **zoom animable de cámara como (b)**. Es falso: `exportar.jsx:356` vuelca `ADBE Camera Zoom` con sus claves y `comp3d.html:445` lo consume (`if (T.zoom) zoom = propEn(...)`). **Zoom puro y dolly zoom son (a) hoy.** Nadie miró el repo.

---

# PARTE 1 — EL CATÁLOGO

Formato fijo: **QUÉ VE** · **RECETA** · **CUADROS** (a 30 fps) · **CURVA** · **PILA**.
Pila **(a)** = hoy · **(b)** = exige agregar algo · **(c)** = descartado, con motivo.

---

## FAMILIA T — TEXTO

**Infraestructura que desbloquea 11 de los 14: la partición medida.** Se crea una capa de texto de trabajo, se le escribe `"H"`, se mide `sourceRectAtTime`; se le escribe `"HO"`, se mide; la diferencia es el avance de la `O` **con el par de kerning ya aplicado**. Iterando sobre la cadena entera salen los orígenes X reales. Es una función, no una capacidad del exportador. **Partí por la unidad más grande que produzca el gesto**: línea si alcanza, palabra si no, carácter sólo cuando el gesto es literalmente por carácter. Techo práctico: 25 glifos simultáneos.

---

**T01 · ESCALONADO TIPOGRÁFICO** — (a)
QUÉ VE: las letras/palabras/líneas hacen lo mismo, una detrás de otra.
RECETA: N capas iguales, mismo par de claves, `inPoint` desplazado i×retardo. (Con inPoint no hay riesgo de la LEY 7: es texto, no forma.)
CUADROS: retardo **1,5 por carácter · 3 por palabra · 4 por línea**. Gesto individual 10–12. Techo: la cascada entera ≤ 24 cuadros. Con más de 15 unidades, retardo decreciente (2,2,2,1,1,1…).
CURVA: C1 en cada unidad.

**T02 · SUBIDA POR CARÁCTER TRAS TAPA** — (a) · *el gesto insignia*
QUÉ VE: cada letra emerge de detrás de una línea invisible, en cascada.
RECETA: una capa por carácter posicionada por T-infra; **una sola tapa** (sólido del color del fondo) que cubre toda la banda por debajo de la línea de base, 1 unidad más cerca de la cámara y arriba en el apilado. Las letras van de `y = +altura_cuerpo` a `y = 0`.
CUADROS: 12 por letra, retardo 1,5. Total de 8 letras: 22.
CURVA: C1.

**T03 · REVELADO DE LÍNEA TRAS TAPA** — (a)
QUÉ VE: la línea se descubre de un lado al otro, o sube desde el borde.
RECETA: idem T02 pero la unidad es la línea entera. Variante barrido: la tapa cubre la línea y se corre en X hasta salir (ancho de tapa ≥ 2× el recorrido).
CUADROS: 12–16 por línea, retardo entre líneas 4.
CURVA: C1.

**T04 · REVELADO CON TAPA RETRASADA** — (a) · *la versión cara de T03*
QUÉ VE: el texto parece arrastrado por el borde de la tapa, no esperando debajo.
RECETA: T03 + el texto se desplaza **+18 px → 0** en X con los mismos keyframes **corridos 2 cuadros después** que los de la tapa, misma curva. Nunca al revés.
CUADROS: tapa 12, texto 12 desde el cuadro +2.
CURVA: C1 en las dos.
*Es el gesto de entrada de texto de mejor relación calidad/costo: se ve vivo y no viola la prohibición de sobrepaso en tipografía.*

**T05 · MÁQUINA DE ESCRIBIR** — (a)
QUÉ VE: los caracteres aparecen de golpe, uno por uno, con cursor.
RECETA: una capa por carácter, `inPoint = i×2`, **sin animación ninguna**. Cursor = sólido con posición en claves HOLD saltando de posición a posición, y opacidad en claves HOLD.
CUADROS: **2 por carácter** = UI · **3** = tipeo humano. Cursor: parpadeo cada 15 cuadros, **y no parpadea mientras se escribe** — ese detalle es la mitad de la credibilidad.
CURVA: ninguna. Lineal o HOLD. Cualquier suavizado arruina el gesto.

**T06 · GOLPE CON SOBREPASO POR CARÁCTER** — (a)
QUÉ VE: cada letra aparece agrandándose de golpe, se pasa y vuelve.
RECETA: capa por carácter con el **anclaje en el centro de su propia caja medida**. Escala 0 → 112 → 100.
CUADROS: 0→112 en 6, 112→100 en 5. Retardo 1.
CURVA: C1 en la subida, C8 en la vuelta.
*No usar en texto de lectura. Sólo en una palabra suelta y grande.*

**T07 · VOLTEO 3D POR CARÁCTER** — (a)
QUÉ VE: cada letra gira como una tarjeta.
RECETA: capa por carácter en 3D, `ADBE Rotate Y` de −90° a 0°, anclaje al centro. Sin cara trasera (ver X08).
CUADROS: 10 por letra, retardo 2.
CURVA: C1.

**T08 · INTERLETRA QUE SE CIERRA** — (a) · *obliga a partir*
QUÉ VE: el texto entra abierto y se acomoda.
RECETA: capa por carácter. Cada X interpola de su posición abierta (tracking +18, medido) a la cerrada (tracking final, medido). **Las dos posiciones se miden, así que queda exacto** — y esquiva el defecto de la LEY 3.
CUADROS: 18, opacidad 0→100 en los primeros 8.
CURVA: C2.

**T09 · ONDULACIÓN / FLOTACIÓN TIPOGRÁFICA** — (a) horneada
QUÉ VE: las letras vibran o flotan cada una por su lado.
RECETA: capa por carácter; claves cada 4 cuadros con `A·sin(2πf·t + φ_i)`, **fase `φ_i = i · 0.7 rad`, semilla fija escrita en el guion**.
CUADROS: amplitud posición ±4 px, rotación ±3°, escala ±4%; período 12–20 cuadros para nervio, 90–150 para flotación.
CURVA: influencia 50/50 en todas las claves.

**T10 · TEXTO SOBRE TRAZADO** — (a) con la receta escrita
QUÉ VE: la frase corre sobre una curva.
RECETA (la parte que faltaba): (1) la curva es una bezier cúbica declarada en el guion por sus 4 puntos; (2) se samplea a **200 puntos** y se acumula la longitud de arco `L[k]`; (3) por T-infra sale el avance acumulado `a_j` de cada carácter **en píxeles de ancho**; (4) se busca el `k` tal que `L[k] ≈ a_j` (interpolación lineal entre muestras); (5) la capa-carácter se coloca en `P(k)` con `rotación = atan2(tangente)`. Animar = rehornear con `a_j + desplazamiento(t)`.
LÍMITE: radio mínimo **4× el cuerpo**, o las letras se separan visiblemente.
CUADROS: recorrido completo 60–120.
CURVA: C5.

**T11 · TEXTO CORTADO / MITADES DESFASADAS** — (a)
QUÉ VE: la palabra parece cortada y las mitades se desplazan en sentidos opuestos.
RECETA: dos copias del texto; a cada una una tapa que le come la mitad que no le toca. **La tapa puede estar rotada** → corte diagonal, que es la versión que se usa.
CUADROS: 12, desplazamiento 15–30 px por mitad. Versión glitch: 2–3 cuadros con claves HOLD.
CURVA: C1 (elegante) / HOLD (glitch).

**T12 · SCRAMBLE / DECODE** — (a), por flipbook de capas
QUÉ VE: un revoltijo de glifos que se resuelve en la palabra.
RECETA: **una capa de texto por estado, `inPoint`/`outPoint` de 2 cuadros**. 10 caracteres × 8 estados = 80 capas de vida corta. El reproductor decide visibilidad con `t >= entra && t <= sale` (`comp3d.html:502`): 80 capas efímeras no le cuestan nada.
*Corrección al catálogo: "texto de origen con claves HOLD" NO es la salida barata. `comp3d.html:147-183` construye una textura de canvas por capa en el armado y dimensiona el plano con esas métricas — cambiar la cadena por cuadro obliga a rehacer textura y geometría en cada cuadro y en cada sub-muestra del obturador. El flipbook es lo barato.*
CUADROS: 2–3 por carácter de resolución; el revoltijo cambia cada 2.
CURVA: ninguna. HOLD.

**T13 · PALABRA POR BEAT** — (a)
QUÉ VE: una palabra sola, grande, reemplazada al golpe.
RECETA: capas con `inPoint`/`outPoint` sobre la grilla de beats + un gesto de entrada por palabra. Variar tamaño y posición para acentuar la palabra importante.
CUADROS: a 120 bpm, **15 por beat**. Palabra clave = 2 beats; relleno = 1. **La entrada ocupa como máximo el 40% del beat (6 de 15)**: si ocupa más, la palabra nunca se lee quieta y ahí nace "es lento".
CURVA: C1.

**T14 · RELEVO DE PALABRA** — (a)
QUÉ VE: una palabra sale por arriba mientras la siguiente sube desde abajo, mismo renglón.
RECETA: dos tapas (arriba y abajo de la caja medida), dos capas de texto con tiempos contiguos.
CUADROS: saliente 8 (acelerando), entrante 12 (desacelerando), **4 de superposición**.
CURVA: C3 la saliente, C1 la entrante.

**FUERA DE ESTA FAMILIA, y por qué:**
- **Barrido de resalte / karaoke** → **(c)**. La receta del catálogo no funciona: pide que una copia se vea *dentro* del rectángulo y otra *fuera*, y eso son regiones complementarias, o sea una mata. Una tapa oculta todo lo que está debajo en el apilado, incluida la copia que hay que conservar. Ninguna de las tres ordenaciones cierra. Vuelve con B3 (recorte rectangular).
- **Texto que recorta una imagen (knockout)** → **(c)**. Es mata de alfa. No hay truco de apilado.
- **Texto calado como imagen** → **(c) por trampa nombrada**: exige convertir a contornos y restar con Merge Paths, o sea un comando de menú, y este repo ya se quemó con `findMenuCommandId` devolviendo 0 por la interfaz en español. Si hace falta, entra como PNG de la biblioteca, no como paso del autor.
- **Interletra animada como propiedad** → **(c)**. Es el único agregado que **compromete la garantía del 1% de ancho**, porque `sourceRectAtTime` cambia con el tracking. T08 lo da exacto por partición.
- **Contador con texto animado** → **(c)**. Reemplazado por U07 (odómetro), que es transform puro.
- **Write-on / trazo escrito a mano** → **(c)**. El pedido correcto no es "trim paths" sino trazado SVG con dashoffset. Es un frente aparte, no un agregado.

---

## FAMILIA F — FORMAS Y OBJETOS

**Lo primero, porque cambia la cuenta de todos:** el exportador rasteriza **una capa = un PNG** (`exportar.jsx:326-329`). "El repetidor expandido cuesta bytes una sola vez" es **falso**: 40 copias son 40 rasterizaciones, 40 PNG y 40 texturas. Techos duros que fijo acá: **grilla ≤ 36 celdas · ráfaga ≤ 16 rayos · extrusión ≤ 16 rodajas · partículas ≤ 20**.

**F01 · CRECER DESDE EL BORDE** — (a)
QUÉ VE: una barra o una línea nace de cero desde una punta.
RECETA: anclaje en el borde de origen, escala X (o Y) 0→100.
CUADROS: 12–16. Escalonado entre barras: 3.
CURVA: C1.
TRAMPA: **sólo sirve para contenido uniforme.** Escalar texto o una imagen la deforma, no la revela. Es el error de criterio más común.

**F02 · BARRA QUE SE LLENA CON PUNTA REDONDA** — (a)
QUÉ VE: la barra crece y su extremo de avance sigue siendo redondo.
RECETA: F01 aplasta el casquete y una tapa deslizante lo deja cuadrado. La receta que coincide con AE son **tres capas**: barra completa quieta + tapa que se desliza + **un PNG circular del diámetro del trazo emparentado a la tapa**, viajando en el borde.
CUADROS: 18–30.
CURVA: C1.

**F03 · ANILLO DE PROGRESO** — (a) *con condición*
QUÉ VE: un arco que se completa alrededor de un círculo.
RECETA: anillo completo al fondo del apilado local; **dos medias-lunas-tapa** (PNG semicirculares del color del fondo) emparentadas a un nulo que gira 0→360°; al 50% se intercambia cuál está encima con claves HOLD de opacidad. Más el casquete viajero de F02 emparentado al nulo, a radio R.
CUADROS: vuelta completa 30–45.
CURVA: C1 si es un dato, C5 si es un cargador en bucle.
LÍMITE: fondo plano. Sobre imagen o degradado → B4.

**F04 · SEGMENTO QUE PERSIGUE (gusano)** — (a) sólo en círculo
QUÉ VE: un pedazo de línea corre por un contorno, en bucle.
RECETA: PNG de arco emparentado a un nulo que gira linealmente. El arco gira con la tangente gratis.
CUADROS: 45–60 por ciclo.
CURVA: C5, siempre. Cualquier ease delata el bucle.

**F05 · HORMIGAS QUE MARCHAN** — (a) *exacta en círculo*
QUÉ VE: un contorno punteado cuyos guiones corren.
RECETA: rasterizar el aro punteado completo y **rotarlo 360/N grados en bucle**. Coincidencia perfecta, un solo valor animado. En recto: tira punteada larga trasladada exactamente un período (guion+hueco), con tapas en las puntas.
CUADROS: un período cada 8–15.
CURVA: C5.
LÍMITE: el rectángulo no cierra en las esquinas. Ahí no hay receta: no lo uses.

**F06 · ECUALIZADOR** — (a) · *el antídoto directo contra "está muerto"*
QUÉ VE: una fila de barras que suben y bajan a distinto ritmo.
RECETA: N barras (≤ 12), anclaje al borde inferior, escala Y con claves horneadas y **fase distinta por barra** (`φ_i = i·0.9 rad`, semilla escrita).
CUADROS: al beat, **golpe en 2–3 cuadros y caída en 8–12**. Esa asimetría *es* lo que se lee como beat.
CURVA: C7 la subida, C1 la caída.

**F07 · ONDAS CONCÉNTRICAS** — (a) exacta
QUÉ VE: aros que nacen de un punto, se expanden y se desvanecen.
RECETA: tres capas del mismo PNG de aro. Escala 0→300%, opacidad 100→0 empezando al 40% del recorrido. Escalonado 10 cuadros. **`inPoint = 0` en las tres, visibilidad por opacidad** (LEY 7).
CUADROS: 20–35 por aro.
CURVA: escala C1, opacidad C5.

**F08 · RÁFAGA RADIAL** — (a)
QUÉ VE: rayos que salen disparados de un centro.
RECETA: ≤16 capas del mismo PNG, cada una rotada su ángulo, todas escalando desde el centro.
CUADROS: 8–12. Escalonado 0 (impacto) o 1 (barrido). Desvanecido en el último 40%.
CURVA: C1.

**F09 · GRILLA QUE SE ARMA** — (a), ≤36 celdas
QUÉ VE: una matriz de elementos que aparece en cascada.
RECETA: N capas del mismo PNG en las posiciones de la grilla, `inPoint` escalonado. **Escalonar en diagonal** (`retardo = (fila+columna)×2`), no por filas: se lee como ola, no como lista.
CUADROS: 10–14 por celda, retardo 2 (mecánico) o 3–4 (orgánico).
CURVA: C1 + sobrepaso 108 si son ≤9 celdas; sin sobrepaso si son más (gelatina).

**F10 · ESPIRAL / ARREGLO GIRATORIO** — (a)
RECETA: N capas con rotación y escala acumuladas, todas hijas de un nulo que gira. El emparentado hace la matemática.
CUADROS: 90–180 por vuelta. Es fondo, no evento.
CURVA: C5.

**F11 · BORDE QUE HIERVE (boil)** — (a) por tira de estados
QUÉ VE: el contorno tiembla como dibujo a mano.
RECETA: **tres copias de la capa de forma en AE, cada una con `ADBE Vector Random Seed` distinto en un `ADBE Vector Filter - Roughen`**, rasterizadas a tres PNG. Se alternan con opacidad HOLD cada 3 cuadros, en bucle. Las tres con `inPoint = 0`.
CUADROS: un estado cada 2–3 (≈10–12 Hz).
CURVA: HOLD.
*No es una aproximación: es cómo se hace de verdad en animación 2D.*

**F12 · SQUASH & STRETCH** — (a)
QUÉ VE: el objeto se alarga al moverse y se achata al frenar.
RECETA: escala no uniforme conservando volumen (X 106 → Y 94). **El anclaje va en el punto de contacto**, no en el centro.
CUADROS: estiramiento durante los 2–4 cuadros de máxima velocidad; aplastado 2 al máximo, 6 de vuelta. Magnitud 8–20% en objetos, 3–7% en paneles.
CURVA: C7 al impacto, C8 a la vuelta.
*Es también el sustituto de pucker & bloat: da la misma lectura de "es blando" y es gratis.*

**F13 · FALSO EXTRUIDO** — (a) *dentro de ±35° de giro*
RECETA: ≤16 copias en 3D separadas 1 px en Z, emparentadas a la delantera, las traseras más oscuras.
LÍMITE REAL: **por la LEY 1, funciona sólo mientras el orden de apilado coincida con el orden por Z visto desde la cámara.** Al pasar el perfil, AE invierte por profundidad y el motor no. O sea: se ve bien hasta que gira mucho, que es justo para lo que existe. Tope de giro ±35°.
CUADROS: el giro 20–30.
CURVA: C6.

**F14 · NINE-SLICE (panel redondeado que cambia de tamaño)** — (a) · *nadie lo dijo y es el primer defecto que aparece*
QUÉ VE: un panel con esquinas redondeadas crece sin que las esquinas se deformen.
RECETA: **nueve capas**: cuatro esquinas de tamaño fijo, cuatro bordes que escalan en un solo eje con anclaje al borde interior, y un centro que escala en dos. Todas hijas del mismo nulo.
CUADROS: 14–20.
CURVA: C2.
*Escalar un rectángulo redondeado rasterizado deforma el radio y se ve. Si el panel no cambia de tamaño, una sola capa; si cambia, nueve o ninguna.*

**FUERA:** morphing de trazado, zigzag animado, pucker & bloat animado, twist, merge/metaball, offset paths animado, esquinas que se redondean, taper con onda animada, campos densos de partículas. Motivo común: **deforman contenido, que es exactamente lo que la rasterización congela**, y sus sustitutos (F12, escala, PNG estático rotando) son visualmente indistinguibles a 8 de cada 10 usos. El único que volvería a mirar es el **morph**, y su respuesta correcta es B5 (secuencia de PNG), no vectores: un morph dura 12–20 cuadros = 20 PNG de un ícono chico = kilobytes.

---

## FAMILIA E — ENTRADAS Y SALIDAS

**Esta familia existe porque el catálogo original tenía ~140 fichas y UNA frase sobre salidas.** Una pieza con 40 entradas resueltas y 40 salidas por opacidad se siente exactamente igual de muerta.

**REGLA DE FAMILIA: la salida dura el 60% de la entrada, redondeado a par, y nunca sobrepasa.**

**E01 · DESLIZAMIENTO CON DESVANECIDO** — (a)
RECETA: posición 40–80 px + opacidad. **La opacidad termina antes que la posición** (a los 8–10 de 14–18). Ese desfase es la mitad del oficio.
CUADROS: 14. CURVA: C1.

**E02 · ENTRADA CON SOBREPASO** — (a)
RECETA: tres claves. Posición: excedente 8–14 px. Escala: 0 → 106 → 100.
CUADROS: 10–14 al pico, 5–7 de vuelta (**la vuelta es la mitad o menos**, o se ve gomoso).
CURVA: C1 + C8.
**CUÁNDO NO** (esto es la mitad del oficio): texto de lectura · cifras y datos · masas que ocupan >40% del cuadro · **cualquier salida** · cuando el elemento entrega el turno al siguiente · en más de 3 elementos a la vez · marcas serias (banco, salud, lujo: 0–3% o nada).

**E03 · ANTICIPACIÓN** — (a)
RECETA: una clave extra antes del arranque, en sentido contrario.
CUADROS: 3–5 (rápido) / 6–8 (pesado), nunca más de 8. Magnitud **8–15%** del recorrido en posición, **−3%** en escala, **−6°** en rotación.
CURVA: C1 hacia la anticipación, y **la clave de anticipación no lleva ease de salida** (influencia 0): la carga se paga con velocidad.
NO en: barras de progreso, cifras, y cualquier cosa que ya esté en pantalla y sólo cambie de estado.

**E04 · REBOTE AMORTIGUADO** — (a), con tope
RECETA: tres oscilaciones, razón **0,35**, período **0,7×** el anterior. 100% (6 cuadros) → 37% (4) → 13% (3) → fin.
CURVA: los cruces por el reposo van casi lineales (influencia ≤15), los extremos con 80/80. Al revés de la intuición.
*Máximo 3. Cuatro es decorativo, cinco es juguete. Es el gesto que más rápido envejece una pieza.*

**E05 · VOLTEO DE UNA CARA** — (a)
RECETA: capa 3D, `ADBE Rotate Y` de −90° a 0°, anclaje al centro (giro) o al borde (puerta).
CUADROS: 16–20, con sobrepaso de 5° resuelto con tercera clave.
CURVA: C1 + C8.
*Una cara. Dos caras es X08 y es (b).*

**E06 · SALIDA POR COLAPSO AL ORIGEN** — (a)
QUÉ VE: el elemento se chupa hacia el punto de donde salió.
RECETA: escala 100→0 con el anclaje en el punto de fuga elegido. Con dimensiones separadas se puede aplastar sólo en Y (lee como persiana que cae).
CUADROS: 6–8, **acelerando** (se va rápido al final).
CURVA: C3. Sin sobrepaso.

**E07 · SALIDA BARRIDA POR TAPA** — (a)
RECETA: la tapa vuelve a cruzar en la dirección contraria a la que reveló. El elemento se queda quieto y desaparece detrás.
CUADROS: 8–10.
CURVA: C3.
*Es la salida que menos ruido hace y la que mejor encadena con la entrada del siguiente.*

**E08 · SALIDA POR DESARME** — (a)
QUÉ VE: las partes se van escalonadas, **en orden inverso al que entraron**.
RECETA: mismo retardo que la entrada, invertido (`retardo_i = (n−1−i)×paso`), cada parte con E06 o E01.
CUADROS: 6 por parte, retardo 2. Total ≤ 20.
CURVA: C3.

**E09 · SALIDA HACIA LA CÁMARA** — (a)
QUÉ VE: el panel se viene encima y se sale de cuadro.
RECETA: Z de su valor a `z_cámara + 200`, escala compensada nada (la perspectiva hace el trabajo), opacidad 100→0 en los últimos 4 cuadros.
CUADROS: 8–10.
CURVA: C3. Con obturador es el gesto donde más se paga el 16×.

**E10 · SALIDA POR EMPUJE DEL SIGUIENTE** — (a)
RECETA: los dos elementos hijos del mismo nulo, separados un ancho de cuadro; se anima **un solo** valor del nulo.
CUADROS: 16–20.
CURVA: C4.
*El gesto más barato del catálogo y el más difícil de que salga mal. Y funciona sobre cualquier fondo, porque no hay tapa.*

**E11 · SALIDA A DESTIEMPO** — (a) · *criterio, no técnica*
QUÉ VE: el elemento se va **antes** de que uno termine de mirarlo, y eso empuja el ritmo.
RECETA: la salida arranca cuando el siguiente lleva el 30% de su entrada. No es un gesto: es dónde ponés el `outPoint`.
*Contraindicado en texto: ahí manda la regla de legibilidad (§3.4).*

**E12 · CORTE SECO** — (a)
RECETA: claves HOLD de opacidad. Cero cuadros de transición.
*En medio de una pieza toda con ease, un corte seco es un acento.* Cae **exacto** en el beat: a un cuadro del beat se siente mal y nadie sabe por qué.
CUIDADO: con obturador encendido, el reproductor decide visibilidad en **cada sub-muestra** (`comp3d.html:502-505`), así que un corte dentro de la ventana del obturador sale a media opacidad. **Poné los cortes en cuadro entero y con fase de obturador −90°**, o desactivá el obturador en piezas con muchos cortes.

---

## FAMILIA X — TRANSICIONES

**X01 · BARRIDO POR TAPA** — (a) · fondo plano
RECETA: sólido del color del fondo, ≥2× el recorrido, arriba en el apilado y 1 unidad más cerca. Se anima su posición. Diagonal = tapa rotada 15–30° emparentada a un nulo que se mueve en la perpendicular.
CUADROS: 8–14. CURVA: C1.

**X02 · TAPA VISIBLE (bloque de color)** — (a) · **funciona sobre cualquier fondo**
QUÉ VE: un bloque de color de marca cubre, se corre, y detrás cambió todo.
RECETA: idem X01 pero la tapa se ve a propósito. Entra por un lado, sale por el otro.
CUADROS: 8 de entrada, 2 de retención, 10 de salida.
CURVA: entrada C3 invertida (ease-in duro), salida C1.
*Junto con E10, el salvavidas para fondos no lisos.*

**X03 · OBJETO QUE BARRE EL CUADRO** — (a) · *el más "producción" por menos trabajo*
RECETA: objeto más ancho que la comp cruzando de `−w` a `+w`. El cambio de contenido en el cuadro central. Cobertura total 2–4 cuadros.
CUADROS: 8–12 el cruce.
CURVA: **C5 en el centro**. Sin ease dentro del cuadro: si desacelera adentro, se lee como objeto, no como transición. La aceleración vive fuera de cuadro.

**X04 · VENTANA DE CUATRO TAPAS** — (a) · *la infraestructura, con las cuentas que faltaban*
Una máscara rectangular animada = cuatro tapas emparentadas a un nulo.
RECETA EXACTA: para una ventana de `(cx, cy, w, h)` en el espacio del nulo, con tapas de tamaño `W × H` (donde `W, H ≥ 3×` la diagonal del contenido):
- **superior**: anclaje en `(W/2, H)` [borde inferior], posición `(cx, cy − h/2)`
- **inferior**: anclaje en `(W/2, 0)` [borde superior], posición `(cx, cy + h/2)`
- **izquierda**: anclaje en `(W, H/2)`, posición `(cx − w/2, cy)`
- **derecha**: anclaje en `(0, H/2)`, posición `(cx + w/2, cy)`
Ninguna escala; **la ventana se anima moviendo las cuatro posiciones**. Rotar el nulo rota la ventana entera sin que se despeguen, porque las cuatro son hijas del mismo nulo.
LÍMITE: fondo plano. Y ojo con el obturador: los cuatro bordes se desenfocan al moverse.

**X05 · IRIS CON TAPA-DONA** — (a)
RECETA: PNG de anillo (agujero al centro) del color del fondo, construido **al tamaño máximo** y escalado **hacia abajo**, con 3–4× de margen para que a escala mínima siga cubriendo el cuadro. Escalar hacia arriba pixela el borde — es el mismo defecto que caza `nitidez-inventario`.
CUADROS: apertura 18–24, cierre 12.
CURVA: apertura C1, cierre C3.

**X06 · TELÓN / PERSIANA** — (a)
RECETA: 2 tapas (telón) o ≤12 tapas de `alto/N` con retardo (persiana).
CUADROS: 10–14 el telón; persiana 10–12 por franja con retardo 1,5–3.
CURVA: cierre ease-in, apertura C1. **Las dos mitades del telón con 2 cuadros de desfase** entre sí: la simetría exacta se lee como muerta.

**X07 · LATIGAZO** — (a) · *pero con presupuesto*
RECETA: todo el contenido emparentado a un nulo que sale `−2,5× ancho` en 4 cuadros; la escena nueva entra desde `+2,5× ancho` en 5. **Desplazamiento mínimo 1,5 anchos de pantalla** o el borrón no tapa.
CUADROS: 8–10 en total, 4+4 con 1 de solape.
CURVA: C4. Obturador **270–360°**, fase −½ ángulo.
COSTO: LEY 5. Un latigazo obliga a obturador en toda la pieza. Decidilo al planificar.

**X08 · VOLTEO DE TARJETA CON DOS CARAS** — **(b)** *— corregido*
El catálogo lo dio como (a) diciendo "la Z conmuta sola". **La Z no conmuta nada** (LEY 1): dos capas coplanares separadas 1 unidad se dibujan siempre en orden de apilado y la de arriba gana en toda la superposición, gire lo que gire el nulo. Vuelve con B0 sólo si se agregara prueba de profundidad — que no está en el plan. **Sustituto hoy: E05 (una cara) + corte seco al perfil exacto.**

**X09 · ATRAVESAR (push-through)** — **(b)** *— corregido*
Mismo motivo: la capa que queda detrás sigue dibujándose según su índice, para siempre. Y `near = 1` recorta distinto que AE. **Sustituto hoy: opacidad HOLD en el cuadro del cruce**, o sea es un corte disfrazado — que funciona y hay que llamarlo por su nombre.

**X10 · DESTELLO** — (a)
RECETA: sólido de color arriba de todo, opacidad 0→100→0. **Con resplandor declarado en el comentario** no sube a blanco plano: se derrama, que es lo que hace un blow-out real.
CUADROS: subida 2–3 **lineal** (sin ease de entrada), bajada 6–10. El contenido cambia en el pico.
CURVA: C5 subiendo, C1 bajando.
*Es el sustituto legítimo de la transición por luminancia, que no tenemos.*

**X11 · MATCH CUT CALCULADO** — (a), y es gratis
QUÉ VE: un objeto se convierte en otro porque ocupan el mismo lugar en el cuadro del cambio.
RECETA: en el cuadro N, saliente y entrante con la misma caja. El saliente termina en N, el entrante empieza en N. **Nada se anima durante la transición.** Y la continuidad manda: si el objeto venía girando a X°/cuadro, el entrante sigue a X°/cuadro desde ese ángulo.
VENTAJA PROPIA: `sourceRectAtTime` deja **calcular** la escala a la que un panel coincide con el ancho de una palabra, en vez de emparejarlo a ojo.

**X12 · SUSTITUCIÓN BAJO TAPA** — (a) · *el mecanismo mejor soportado y peor aprovechado*
QUÉ VE: no hubo corte, pero cambió.
RECETA: mientras una tapa (o X03) cubre una región, el contenido de esa región se sustituye con opacidad HOLD. La tapa se va y hay otra cosa.

---

## FAMILIA C — ESPACIO Y CÁMARA

**C00 · LA MATEMÁTICA, para que nada se corra**
`zoom_px = focal_mm × ancho_px / 36`. A 1920 con 50 mm → **2666,67**. La cámara nace en `z = −zoom` con POI en `[w/2, h/2, 0]`, y ahí una capa 3D en z=0 se ve exactamente como una 2D al 100%. El motor usa **fov vertical**: `2·atan(alto/(2·zoom))` (`comp3d.html:456`) → 22,90° a 1080. Escala aparente a distancia d: `(zoom/d)×100 %`. Para conservar tamaño al alejar: escalá `(d/zoom)×100`.

**C01 · PUSH IN / PULL OUT** — (a)
RECETA: dos claves en Z de la cámara. **No es lo mismo que animar el zoom**: el push cambia el paralaje, el zoom aplana.
CUADROS: **deriva de fondo 90–300** con recorrido de 5–12% de la distancia; **remate narrativo 20–35**.
CURVA: deriva C5; remate C1. El pull out con freno largo (C2) para "aterrizar".

**C02 · ZOOM PURO / DOLLY ZOOM** — **(a)** *— corregido: el zoom animable YA se exporta*
RECETA: claves en `ADBE Camera Zoom`. Dolly zoom: Z y zoom en sentidos opuestos con `zoom(t) = zoom₀·d(t)/d₀`, **la misma curva en los dos** o el sujeto respira.
CUADROS: zoom puro 30–60, o remate de 8–12. Dolly zoom 45–90.
CURVA: C6.

**C03 · TRUCK / PEDESTAL** — (a), **pero movelo como nulo del mundo**
Trasladar el mundo con un nulo padre es indistinguible de un truck de cámara, más fácil de encuadrar y sin riesgo de interpolación espacial. Reservá la cámara para lo que el nulo no puede: cambiar la perspectiva.
CUADROS: 60–150, casi lineal (C5).

**C04 · PAN / TILT / ROLL** — **(b) — ES UN AGUJERO MUDO DEL EXPORTADOR**
`exportar.jsx:230-231` hace `es3D = capa.threeDLayer`, y `threeDLayer` no existe en `CameraLayer` (es de AVLayer): queda `false`, y el bloque `if (es3D)` de `:505-509` **nunca vuelca `ADBE Orientation`, `ADBE Rotate X` ni `ADBE Rotate Y` de una cámara**. Encima `comp3d.html:294` sólo lee `orientacion` y **no aplica `Rotate X/Y/Z` de cámara en ninguna rama**. Traducción: **paneo, inclinación y balanceo de cámara salen del documento en cero, sin NOSOP y sin aviso.** La cámara de dos nodos funciona sólo porque el apuntado se recalcula del POI.
Es lo primero de la parte 2. **Hoy: no animes rotaciones de cámara.** Un paneo se finge moviendo el POI (que sí viaja como `ADBE Anchor Point`, `exportar.jsx:488`).

**C05 · ÓRBITA** — (a) *sólo por la receta del nulo*
RECETA: nulo 3D en el centro del objeto, cámara emparentada al nulo desplazada en Z, se anima **la rotación Y del nulo**. Un escalar, dos claves, cero riesgo espacial. La receta de POI + arco de posición exige hornear cada 2° (46 claves para 90°) y no vale la pena.
CUADROS: 60–150 para 30–90°. Órbitas de 360° casi nunca: se leen como salvapantallas.
CURVA: C6.
CRITERIO: la órbita se gana con un objeto que la merezca. Sobre paneles planos delata que son planos.

**C06 · GRÚA** — (a)
RECETA: dimensiones separadas. Y con freno largo (C2), Z casi lineal (C5). Curvas distintas por eje es lo que evita que parezca una diagonal recta.
CUADROS: 75–150.
*Si el arco es pronunciado, hornear cada 3 cuadros con tangentes espaciales lineales forzadas: `setSpatialAutoBezierAtKey(i,false)` + `setSpatialTangentsAtKey(i,[0,0,0],[0,0,0])`. Error contra el círculo ideal: `R·(1−cos(Δθ/2))` — a R=2000, cada 2° da 0,30 px.*

**C07 · CONTRAGOLPE DE CÁMARA** — (a) · *el único movimiento de cámara que hace falta la mayoría del tiempo*
RECETA: cámara emparentada a un nulo; **el nulo** lleva el gesto. 3–8 px en dirección contraria al impacto, o −6 a −15 en Z (esta se siente más cara y menos "temblor de videojuego").
CUADROS: ida 1–2 (lineal), vuelta 8–12. **Una sola oscilación.**
CURVA: C5 la ida, C2 la vuelta.

**C08 · CÁMARA COMO PUNTUACIÓN** — (a) · *la mecánica de la referencia que admirás*
RECETA: empujones de 6–12 cuadros sobre beats concretos, y quieta 30–60 cuadros entre ellos. 3–8% de distancia aparente por empujón.
*Es lo contrario de lo que hiciste, y es la corrección de fondo.*

**C09 · CORTE DE CÁMARA** — (a) · *el más barato de todos*
RECETA: claves HOLD en posición y POI. Seis claves HOLD son seis planos.
CUADROS: planos de 45–120 (producto) o 20–45 (ritmo alto).
*Una pieza de 14 s con un solo plano es lenta por definición, por mucho que se mueva adentro.*

**C10 · DERIVA SOSTENIDA** — (a)
RECETA: dos claves, principio y fin del plano. Escala 100→102–105% en 90–150 cuadros, o Z −20 a −60.
CURVA: **C5, casi lineal**. Una deriva con ease se lee como intención y arruina el efecto: la deriva tiene que ser indiferente.
REGLA DE CONVIVENCIA: deriva y micro-movimiento **no van en el mismo eje**. Deriva en escala/Z, micro en X/Y/rotación.

**C11 · MULTIPLANO** — (a)
RECETA: con zoom 2666: fondo z=+1500, medio z=+400, sujeto z=0, adelanto z=−600. **Separación entre planos vecinos ≥15% del zoom** o el paralaje no se percibe. Compensar escala con `(d/zoom)×100`.
*Y por la LEY 1: el orden de apilado tiene que ser fondo → medio → sujeto → adelanto, de abajo hacia arriba, siempre.*

**C12 · NUBE DE PANELES** — (a) · *el gesto que arregla tu problema concreto*
RECETA: 8–14 paneles 3D en grilla **perturbada** (la grilla pura se lee como pared), todos hijos de un nulo rotado 15–25° en Y. **Cada panel con deriva propia en Z de ±20–40 px, período 4–7 s, fase desfasada** (`φ_i = i·1,1 rad`).
CUADROS: entrada escalonada 2–4 entre paneles, 12–18 cada uno.
CURVA: C1.
*La nube hace cosas mientras la cámara casi no se mueve. Es literalmente la respuesta al diagnóstico.*

**C13 · ESCALONADO EN PROFUNDIDAD** — (a) · *mejor relación resultado/costo del frente*
RECETA: cada capa entra desde `z + 400` a su z final con opacidad 0→100; `retardo = (z_max − z_capa)/z_max × retardo_total`. El ojo lee una ola que avanza.
CUADROS: 12–18 por capa, retardo 2–4. Ola de 10 elementos: 40–55.
CURVA: C1.

**C14 · SOMBRA DE CONTACTO** — (a) *con las cuentas escritas*
RECETA: PNG de óvalo difuso, capa 3D acostada (rotación X 90°), emparentada al objeto. Especificación que faltaba: **ancho de la sombra = 1,15 × ancho del objeto** en contacto; degradado radial que llega a 0 al 100% del radio; **opacidad base 26%**. Ligadura a la altura, horneada con los mismos cuadros que el objeto:
`opacidad(h) = 26 · (1 − h/H)` y `escala(h) = 100 + 45·(h/H)`, con `H` = altura de la que cae.
*Al aterrizar, la sombra se encoge 10% en los 2 cuadros de contacto y vuelve. Eso es lo que dice "tocó".*
LÍMITE HONESTO: sin desenfoque el borde es duro y se lee como *long shadow* gráfico, no fotográfico. Es una estética válida; no es lo mismo. Se arregla con B1.

**FUERA:** rack focus / profundidad de campo real **(c)** — el desenfoque de AE y el de three no van a coincidir al 1% nunca, y la receta de "doble copia nítida/desenfocada hecha en AE" resuelve el gesto sin romper la fidelidad, así que no hace falta capacidad nueva. **Luces (c)** — un modelo de iluminación entero para replicar; C14 cuesta un PNG y da el 90%. **Auto-orientación de capas AV (c)** hasta que emita NOSOP.

---

## FAMILIA D — DETALLE DE SEGUNDO ORDEN

**D01 · ACUSE DE GOLPE** — (a) · *si tuviera que elegir uno solo, este*
QUÉ VE: algo entra y lo que ya estaba se corre un poco y vuelve. Establece que los objetos **se enteran uno del otro**.
RECETA: nulo propio por elemento que acusa (así el acuse no ensucia su animación). Tres claves de posición: 0 → desplazamiento en la dirección del golpe → 0.
CUADROS: ida **2**, vuelta **8**. La asimetría 2:8 *es* el gesto.
MAGNITUD: 4–12 px en un panel, 2–4 px en tipografía, hasta 25 px si lo que golpea es enorme. ≈1,5–3% del ancho **del que acusa**, no del que golpea.
CURVA: C7 la ida, C2 la vuelta.
CASCADA: escalonar 1 cuadro por elemento desde el punto de contacto hacia afuera, máximo 4 elementos.

**D02 · ARRASTRE** — (a)
RECETA: **claves del padre copiadas al hijo y corridas 2–4 cuadros**, misma curva. `layer.parent` no sirve: el emparentado es instantáneo.
CUADROS: 2 (rígido/liviano), 3–4 (blando/lejano). Más de 5 ya es un segundo evento.
MAGNITUD: 15–30% del movimiento del padre. La rotación es lo más barato: ±4 a ±10°.

**D03 · SOLAPAMIENTO** — (a) · *cuesta cero y es la mitad del problema*
REGLA: **el gesto B arranca cuando A va por el 65% de su recorrido.** Si A dura 12 desde el 0, B arranca en el 8.
*Menos de 20% de solape se ve secuencial y contable; más de 60% se ve simultáneo y se pierde la jerarquía.*

**D04 · ESCALONADO GENERAL** — (a)
FÓRMULA: `retardo = clamp(round(2·duración/(n−1)), 1, 6)`. El presupuesto total de una cascada **no pasa de 2× la duración de un gesto**.
*Variante que cuesta lo mismo y se ve mucho mejor: escalonar desde el centro hacia afuera, o desde donde estaba mirando el ojo, en vez de arriba-abajo.*

**D05 · MICRO-MOVIMIENTO HORNEADO** — (a) · *y se hornea, punto*
QUÉ VE: nada. Y por eso funciona: la quietud perfecta es una firma digital.
ESPECIFICACIÓN COMPLETA (esto faltaba): para la capa `i` y la propiedad `p`,
`v(t) = A_p · [ 0,6·sin(2πt/T1 + φ) + 0,4·sin(2πt/T2 + 1,7φ) ]`
con `T1 = 43` cuadros, `T2 = 67` cuadros, `φ = (i·2,39 + p·0,87) rad`. Claves cada **6 cuadros**, influencia 50/50. Determinista y reproducible: la única entrada es el índice de capa.
AMPLITUDES: posición ±1 a ±3 px · escala ±0,4 a ±1,0% · rotación Z ±0,15 a ±0,4° · Z ±5 a ±15.
UMBRAL: si podés *ver* que se mueve mirándolo fijo, es el doble de lo que debería ser.
COSTO: ~25 claves por propiedad por capa en 5 s. 10 capas × 2 propiedades = 500 claves. **Es el precio correcto** (ver Parte 2, por qué la vía declarativa está descartada).

**D06 · JERARQUÍA DE ESCALAS** — (a) · regla, no gesto
| escala | recorrido | duración | cuántos a la vez |
|---|---|---|---|
| **macro** | 200–1500 px, o entra/sale de cuadro | 16–24 | **1. nunca dos** |
| **meso** | 20–80 px, escala ±10% | 8–14 | 2–4 |
| **micro** | 1–8 px, escala ±1% | 3–8 o continuo | todo lo demás |
Factor entre niveles: **3× a 8×**. Si el micro está a menos de 3× del meso, se confunden y el cuadro se ensucia.
**Si no podés nombrar cuál es el gesto macro de un plano, el plano no tiene tema.**

**D07 · PESO** — (a) · tabla, no intuición
| | liviano | medio | pesado |
|---|---|---|---|
| duración | 6–9 | 10–14 | 16–24 |
| curva | 15/80 | **C1** (20/85) | **C2** (10/92) |
| sobrepaso | 8–12% | 4–6% | 0–2% |
| anticipación | 2 | 3–4 | 5–7 |
| arrastre de hijos | 2 | 3 | 4 |
*Codificalo en el generador: cada capa declara su clase de peso y las duraciones salen de la tabla, no de la mano.*

**D08 · ANCLAJES** — (a) · el error de un valor que cambia todo
**El anclaje va en el borde que toca**, no en el centro. Un panel que sube crece desde abajo; una barra crece desde su origen; algo que aterriza se aplasta desde su base. Anclaje al centro por defecto = nada tiene contacto ni apoyo.

**D09 · ESTELA POR DUPLICADOS** — (a)
RECETA: 3–4 copias **debajo** en el apilado, claves corridas 2 cuadros, opacidad 45 / 28 / 16 / 8 (razón ≈0,58).
REGLA: **la estela debe morir antes de que el objeto frene.** Copias moviéndose después de que el objeto se detuvo se lee como error de render.
COSTO: ×4 capas. En 3D las copias van a la misma Z o se ven como objetos separados — y por la LEY 1, contiguas en el apilado.

**D10 · BARRIDO DE BRILLO** — (a)
RECETA: sólido angosto (60–120 px), rotado 15–25°, emparentado al objeto, cruzando su caja; **dos tapas** del color del fondo recortando a la caja. Opacidad 12–25% si lo querés sutil.
CUADROS: 6–10 el cruce.
CURVA: C5. Con ease se ve como objeto, no como luz.
**Una sola vez por aparición.** En bucle es la firma más rápida de plantilla barata.

**D11 · SOMBRA DESFASADA** — (a)
RECETA: duplicado debajo en el apilado, color tinta del fondo, opacidad 15–30%, desplazado 6–14 px. Claves copiadas y corridas **1–2 cuadros**, recorrido 1,1–1,2× el del original.
*Con 3 cuadros o más se ve como una segunda capa despegada.*

**D12 · OBTURADOR COMO DECISIÓN** — (a) por pieza
| ángulo | comunica | cuándo |
|---|---|---|
| 0–45° | seco, digital | glitch, datos, interfaz |
| 90° | crujiente | acción con lectura |
| **180°** | natural — **el default correcto** | casi todo |
| 270° | onírico, lujoso | belleza, lujo |
| 360° | estela pura | títulos, latigazos |
**LA FASE ES LA PERILLA QUE NADIE TOCA Y ES LA QUE SE VE CARA: `shutterPhase = −ángulo/2`** (−90 con 180). Con fase 0, el borrón sale hacia adelante del objeto y a alta velocidad se lee como que la cosa va antes que ella misma. Es una línea.
REGLA: si el objeto recorre más de 1,5× su propio ancho en un cuadro, con 180° se convierte en una franja de color.
COSTO: LEY 5.

**FUERA:** desenfoque de movimiento selectivo por capa **(c)** — el arnés promedia el cuadro entero, no hay forma. Sustituto: LEY 6. **Cuadros de deformación (smear)** **(c)** — el obturador da el 85% por cero costo. **Aberración cromática** **(c)** — sale bien sólo 2–4 px y sólo en los cuadros de máxima velocidad; permanente arruina la pieza y casi nadie la implementa sutil.

---

## FAMILIA U — INTERFAZ Y DATOS

*Esta familia no la reclamó ningún frente y es exactamente lo que este repo produce.*

**U01 · CURSOR Y CLIC** — (a)
QUÉ VE: un puntero entra, se posa, hace clic, y la interfaz responde.
RECETA: PNG de cursor + posición; aro (PNG de anillo) que escala 0→200% y opacidad 80→0 desde el punto del clic; acuse D01 de 2 px en el botón.
CUADROS, y esto es convención dura: **el cursor llega 6–8 cuadros antes del clic y desacelera** hasta 0; el aro dura 10–14; **la interfaz reacciona 2 cuadros DESPUÉS del clic**, nunca en el mismo.
CURVA: llegada C1, aro C1 la escala y C5 la opacidad.

**U02 · RECORRIDO DE PÁGINA (scroll)** — (a) · *el gesto que más directamente sirve al producto*
QUÉ VE: la captura larga se desplaza detrás de la ventana del dispositivo.
RECETA: `tira.png` como capa hija de un nulo; la ventana es X04 o el marco del dispositivo (U03). El nulo se mueve en Y.
CUADROS: tramo de scroll **20–28 cuadros**, meseta **40–70**. Recorrido por tramo: **una altura de ventana como máximo**.
CURVA: C1 — nunca lineal ni Easy Ease. Un scroll con Easy Ease se lee como cinta transportadora.
REGLA: **un salto de más de 3 alturas de ventana no se hace con scroll, se hace con corte** (E12). Un scroll de 4000 px se lee como un error.

**U03 · MOCKUP DE DISPOSITIVO** — (a)
RECETA: marco como PNG con sombras y brillos ya horneados (el marco no cambia nunca); pantalla como capa aparte **1 unidad más cerca de la cámara y arriba en el apilado** (LEY 1). Tres vistas ensambladas sólo si el giro se mantiene dentro de **±35°** — fuera de ahí Classic 3D no intersecta y se rompe, y le pasa a AE también.
CUADROS: entrada con el nulo 15–20, sobrepaso de rotación 3–5° con tercera clave.

**U04 · LLAMADA / ANOTACIÓN (callout)** — (a) · *con la trampa nombrada*
QUÉ VE: una línea sale de un punto de la interfaz hasta una etiqueta.
RECETA: punto pulsante (F07 chico) + línea + etiqueta.
**LA TRAMPA:** una línea acodada en L **no se puede hacer con una escala X** — se deforma. Son **dos segmentos**, cada uno con F01 y anclaje en su propio origen, el segundo arrancando cuando el primero termina.
CUADROS: punto 8, segmento 1 en 8, segmento 2 en 6, etiqueta entra desde la línea a los +2 con E01 de 10. Total 26.
CURVA: C1 en todo; **la etiqueta arranca 3–5 cuadros después de que la línea llegó**, nunca a la vez.

**U05 · REORDENAMIENTO / CARRERA DE BARRAS** — (a) · *máxima lectura por costo*
QUÉ VE: los elementos intercambian posiciones porque el dato cambió el orden.
RECETA: cada fila es un nulo; se anima su Y a la posición nueva. **El que sube pasa por delante** — y por la LEY 1 eso significa reordenar el apilado, lo cual sólo se puede hacer en un cuadro: usá **claves HOLD de opacidad en dos copias** de la fila que adelanta (una en cada posición del apilado), intercambiadas en el cuadro del cruce.
CUADROS: el intercambio **16–20**, escalonado 2 entre filas que se mueven.
CURVA: C6.
ACOMPAÑA: el eje que se re-escala (escala X de todas las barras a la vez, misma curva) y la etiqueta emparentada a la punta de su barra.

**U06 · CIFRA QUE SUBE** — (a) sólo como U07. Como texto animado, **(c)**.

**U07 · ODÓMETRO** — (a) · *entera, sin agregar nada*
QUÉ VE: cada dígito rueda verticalmente como un cuentakilómetros.
RECETA: una capa de texto por posición de dígito con la cadena `"0123456789012"` en vertical — **pero la LEY 3 dice que el texto es de una sola línea**, así que cada columna es **una tira de PNG** rasterizada, o **13 capas de texto** con posición fija y todas hijas del mismo nulo que se mueve en Y. Ventana: X04 con dos tapas (arriba y abajo) del alto de un dígito.
CUADROS: unidades una vuelta cada 8–10; cada posición a la izquierda 10× más lento. Frenada con C1 y **medio sobrepaso** (se pasa 15% de un dígito y vuelve) — ese detalle es lo que lo hace mecánico en vez de digital.
CURVA: C5 en el giro, C1 + C8 en la frenada.
*Si querés un contador ya, hacelo odómetro.*

**U08 · CAMBIO DE COLOR DE UN ELEMENTO** — (a), caro
RECETA: dos copias apiladas del mismo elemento en los dos colores, cruzadas por opacidad. **Coste: ×2 capas y ×2 rasterizaciones.**
CUADROS: 4–6 al beat.
CURVA: C5.
*Úsalo en el acento, no como sistema.*

**U09 · ENSAMBLADO / DESARMADO** — (a)
QUÉ VE: las partes convergen desde afuera y forman el logo o el ícono.
RECETA: cada parte entra desde su posición final + un vector radial de 120–300 px, con **retardo inverso al radio** (las de afuera arrancan primero).
CUADROS: 14 por parte, retardo 2, total ≤ 30.
CURVA: C1 + sobrepaso 105 en las 3 últimas.

**U10 · CIERRE DE CICLO (bucle perfecto)** — (a) · regla, no gesto
El último keyframe idéntico al primero **y la velocidad en los dos extremos igual**, o el bucle late. Práctica: poné la clave final con influencia y velocidad **copiadas** de la inicial, no "parecidas".

---

# PARTE 2 — ORDEN DE CONSTRUCCIÓN DE LA PILA (b)

Ordenado por retorno sobre esfuerzo. Cada uno: qué exporta AE, qué hace el motor, qué desbloquea.

---

## B0 — LAS ROTACIONES DE CÁMARA. *No es una función: es un defecto.*
**Esfuerzo: horas. Prioridad: antes que todo lo demás.**
- **Exportador**: cambiar `exportar.jsx:230-231`. Hoy `es3D = capa.threeDLayer`, que en `CameraLayer` no existe. Reemplazar por `es3D = (tipo === "camara") || capa.threeDLayer`. Con eso `:505-509` vuelca `ADBE Orientation`, `ADBE Rotate X` y `ADBE Rotate Y` de la cámara.
- **Motor**: `comp3d.html:294` lee sólo `orientacion`. Aplicar además `rotacionX/Y/rotacion` de cámara, en el orden de composición de AE, en las dos ramas (un nodo y dos nodos: en dos nodos las rotaciones se **suman** al look-at).
- **Desbloquea**: C04 entero (paneo, inclinación, **balanceo/dutch**, que ningún frente listó), la variante de X07 con cámara, y cierra una divergencia que hoy **falla en silencio**.

**B0-bis, en el mismo commit, tres líneas cada uno:**
1. **NOSOP para `autoOrient` de una capa AV.** Hoy se exporta rotación en cero sin aviso. Un fallo mudo es peor que una capacidad faltante.
2. **NOTA cuando dos capas 3D se cruzan en Z** dentro de un plano. Es la LEY 1 hecha compuerta: se calcula sobre el documento, sin renderizar, comparando el orden por Z proyectada contra el orden de apilado cuadro a cuadro.
3. **NOTA si `shutterPhase ≠ −shutterAngle/2`.** El default de AE es 0 y está mal en el 100% de los casos.

---

## B1 — DESENFOQUE GAUSSIANO POR CAPA
**Esfuerzo: bajo. La maquinaria ya está construida.**
- **Exportador**: un `Gaussian Blur` real en AE (`ADBE Gaussian Blur 2`) sobre la capa, y volcar su `Blurriness` con claves. Es una clave nueva del canal que ya existe, igual que el resplandor.
- **Motor**: `comp3d.html:386-410` ya agrupa capas, oculta las demás, renderiza el grupo a un `WebGLRenderTarget` y compone — eso es exactamente lo que hace falta para el bloom. Un desenfoque por capa es **la misma pasada con otro filtro** (separable, dos direcciones).
- **Desbloquea**: revelado por desenfoque (hoy sólo se puede fingir con escala 108→100), **D11 con sombra fotográfica en vez de gráfica**, y la receta de rack focus por doble copia deja de necesitar assets extra.
- **Ojo de fidelidad**: el gaussiano de AE y el de three no van a coincidir al 1%. Hay que **declarar la tolerancia de esa propiedad aparte**, no fingir que da cero.

---

## B2 — ACABADO DE COMPOSICIÓN (grano + viñeteado)
**Esfuerzo: bajo. Máximo rendimiento visual por línea.**
- **Exportador**: un bloque a nivel de composición, `acabado { grano: 0.02, granoPx: 1.5, vignette: 0.08 }`. Cinco números, mismo mecanismo que el obturador.
- **Motor**: **NO va en la página.** `capturar-comp.py:166-176` promedia 16 sub-cuadros: un grano generado en la página se promedia 16 veces y desaparece. Va en el **compositor**, después del promediado, al codificar. Grano monocromático 1–3%, patrón nuevo por cuadro (nunca estático: un grano congelado se lee como suciedad de pantalla). Viñeteado 5–12% en las esquinas con radio muy grande.
- **Desbloquea**: es lo que rompe el bandeado de los degradados y le da material a los planos lisos. Es el paso que más "caro" agrega por menos trabajo.
- **Ojo de fidelidad**: **queda fuera del canal de verificación de píxel.** Se compara antes del acabado, o el pipeline empieza a reportar defectos que no lo son.

---

## B3 — RECORTE RECTANGULAR POR CAPA
**Esfuerzo: medio. El bloqueo no es el motor.**
- **Exportador**: cuatro números animables en espacio de capa. **El trabajo real es del lado de AE**: si el autor lo expresa con una máscara, `exportar.jsx:265-268` emite NOSOP y el documento sale rojo. Hay que decidir cómo se declara (mi recomendación: en el comentario de la capa, `recorte: L,T,R,B`, con la máscara rectangular real en AE para que la fidelidad se siga midiendo, **y una excepción explícita en el inventario de NOSOP para máscaras rectangulares no rotadas**). Esa decisión es el trabajo; el shader es la parte fácil.
- **Motor**: cuatro uniformes y un `discard` en el fragment.
- **Desbloquea**: **todos los revelados dejan de depender de fondo plano**, que es el techo real de la tapa. Y desbloquea T-karaoke (el barrido de resalte), que es el formato de subtítulo más usado que existe y que hoy es (c). Baja el conteo de capas de X04 de 4 a 0.

---

## B4 — RECORTE POLAR (cuña)
**Esfuerzo: bajo, encima de B3.** Dos números: ángulo inicio, ángulo fin.
- **Desbloquea**: F03 (anillo de progreso) sobre cualquier fondo, revelado en cuña/reloj, y elimina la receta de dos medias-lunas con HOLD al 50%, que es la más frágil del catálogo.

---

## B5 — SECUENCIA DE PNG POR CAPA
**Esfuerzo: medio (bytes, no arquitectura). El último que haría.**
- **Exportador**: rasterizar la capa cuadro a cuadro dentro de su rango, `forma-<i>-<f>.png`.
- **Motor**: cambiar la textura por cuadro. El plano ya está dimensionado.
- **Desbloquea**: la familia entera de deformadores y el **morphing**. Para un morph de 12–20 cuadros es la respuesta **correcta**, no un parche: congela exactamente lo que AE calculó, incluidos los retorcimientos, así que la fidelidad es perfecta por construcción.
- **Sólo cuando aparezca la necesidad concreta.** No lo construyas por completitud.

---

## LO QUE DECIDO NO CONSTRUIR, y por qué

**Micro-movimiento declarativo en el comentario.** El comentario se aceptó para el resplandor porque **ahí la identidad de píxel se declaró imposible** (`exportar.jsx:239-247`: el efecto de AE vive antes de la transformación 3D, el bloom del motor es post-proceso). El micro-movimiento **sí puede ser idéntico**. Declararlo en el comentario significa que AE muestra una cosa y el motor otra **por construcción**, y eso rompe la única regla que sostiene el proyecto. Los 500 keyframes horneados de D05 no son el camino caro: son el único honesto.

**Texto de origen con claves HOLD.** El catálogo lo puso como la adición de mejor retorno. En este motor no lo es: `comp3d.html:147-183` construye una textura de canvas por capa **en el armado** y dimensiona el plano con esas métricas. Cambiar la cadena por cuadro obliga a rehacer textura y geometría en cada cuadro y en cada sub-muestra. Y el sustituto ya funciona y es **más barato para el reproductor**: T12, capas de vida corta, que es exactamente para lo que existe `t >= entra && t <= sale`.

**Interletra animada como propiedad.** Es el único agregado que compromete la garantía del 1% de ancho, y T08 lo da exacto por partición medida.

**Trazado vectorial + trim (E5).** Sólo aparecería si hiciera falta trim sobre trazados curvos arbitrarios: firmas, mapas, íconos complejos que se trazan solos. No está en ninguna de las tres piezas que siguen, ni en el producto. Si aparece, es un frente propio.

**Matas de pista, máscaras generales, modos de fusión, animadores de texto, capas de ajuste, remapeo de tiempo, prueba de profundidad.** Cada uno abre un sistema entero. Los tres gestos que perdemos (X08, X09, knockout) tienen sustituto declarado.

---

# PARTE 3 — REGLAS DE COREOGRAFÍA

**Tu métrica no detectó el error porque medía el PROMEDIO. Estas están diseñadas para que "moverlo todo un poquito" falle.**

## 3.1 Cuántas cosas animan a la vez

- **Exactamente UN macro por plano.** Nunca dos. Si dos elementos recorren más de 200 px en el mismo tramo, uno de los dos está mal.
- **2 a 4 meso** simultáneos, al 20–40% de la magnitud del macro (acción secundaria).
- **Todo lo demás en micro**, siempre. Nada perfectamente quieto.
- **`N_activos` ≤ 5**, contando elementos con energía > 20% del máximo del cuadro.
- **Mínimo 3 elementos con energía > 0 en todo cuadro.** Uno solo moviéndose = utilería + cámara = tu pieza.

## 3.2 Duración por escala

| escala | cuadros | qué |
|---|---|---|
| acento | 3–6 | golpe, destello, acuse, tick |
| latigazo | 2–4 | tránsito violento |
| gesto liviano | 6–9 | ícono, etiqueta |
| **gesto estándar** | **10–14** | tarjeta, texto que sube |
| macro | 16–24 | panel entero, columna |
| traslado | 24–40 | empuje, scroll, viaje corto |
| meseta | 45–120 | lectura, respiración |

**Salida = 60% de la entrada, redondeado a par.** Invertirlo es el motivo más común de que algo se sienta lento.

## 3.3 Silencio, y qué hace la cámara durante el silencio

- **6–12 cuadros** sin protagonista = coma. Es puntuación y se lee como intención.
- **15–20** = punto, en frontera de sección.
- **>20 cuadros sin onset nuevo = muerto**, salvo que sea la resolución final.
- **Nunca hay silencio de movimiento**, sólo silencio de protagonista: el micro (D05) y la deriva (C10) siguen corriendo.
- **La cámara durante el silencio: DERIVA PURA o QUIETA.** ≤0,6 px/cuadro de desplazamiento aparente, curva C5. **La cámara no arranca ni frena junto con un evento de elemento**: desfasá 4–8 cuadros, o el ojo lee una sola cosa y perdés los dos gestos.

## 3.4 Legibilidad — el único número duro publicado

**El texto se queda INMÓVIL 1 segundo por cada 13 caracteres.** Un claim de 30 caracteres necesita **69 cuadros quietos**, no 30. Esto manda sobre E11 y sobre cualquier gana de acelerar.

## 3.5 La grilla

`cuadros/beat = 1800 / BPM`. **120 bpm = 15 cuadros exactos** a 30 fps; usá 120 salvo motivo.
- Subdivisión **8 cuadros** (corchea, redondeando 7,5) para meso y escalonados internos.
- **15** (negra) para macro y acentos fuertes.
- **60** (compás) para cambios de sección.
**Las duraciones quedan libres. Lo que cae en la grilla es el ARRANQUE.** Un gesto de 22 cuadros que arranca en el 45 está bien; uno de 15 que arranca en el 19 está mal.
**Síncopa**: 1 de cada 4 acentos en el contratiempo (beat + 7), para que la cuantización no se vuelva metrónomo.

## 3.6 La proporción cámara / objetos

- **La cámara aporta ≤20% de la energía total de la pieza**, y ≤35% en cualquier ventana de 30 cuadros.
- **La cámara aporta 2–3 px/cuadro** de desplazamiento aparente en z=0. El elemento más rápido del plano aporta 25–30. **Factor ~10.** Cuando esa relación se invierte, el espectador lee "me están paseando por una maqueta".
- **La cámara es continua, los elementos son discretos.** Si invertís los roles —cámara a saltos, elementos a la deriva— la pieza se siente inestable y sin foco.
- **En ninguna ventana de 30 cuadros la cámara puede ser el elemento de máxima energía durante más de 12 cuadros.**
- **Regla del 10%**: en un plano de 60–150 cuadros, el desplazamiento aparente que produce la cámara sobre un punto en z=0 no pasa del 5–12% del ancho de cuadro. Lo que exceda deja de ser "el plano está vivo" y es un gesto narrativo, y entonces dura 6–18 cuadros, no 90.

---

## 3.7 LA MÉTRICA — seis números, ninguno satisfacible moviendo todo un poquito

Se calcula **sobre el documento exportado, sin renderizar**, reusando la matriz que `comp3d.html` ya construye por capa y cuadro.

**Definiciones.** Para la capa `i` en el cuadro `f`:
- `área_i(f)` = área del cuadrilátero que resulta de **proyectar las cuatro esquinas del plano de la capa** con `PHI · M_i(f)` y la matriz de la cámara. Esto contesta la objeción de la crítica: el peso visual **sí** es computable, y es el área proyectada, no el tamaño declarado.
- `peso_i(f) = min(1, área_i(f) / área_cuadro)`
- `E_i(f) = peso_i(f) · ( |Δpos_proyectada|/diagonal + |Δescala|/100 + |Δrot|/180 + |Δopac|/100 )`, con Δ por cuadro.
- `E_cam(f)` = desplazamiento aparente, en el cuadro `f`, de un punto fijo en z=0 al centro, dividido por la diagonal.
- `E_total(f) = Σ E_i(f) + E_cam(f)`
- **onset de la capa i** = cuadro donde `E_i` pasa de estar por debajo del 5% de su propio pico a estar por encima del 25%, habiendo estado ≥6 cuadros por debajo del 5%.

**LAS SEIS COMPUERTAS:**

| # | métrica | umbral | por qué no se puede engañar |
|---|---|---|---|
| **M1** | **onsets por segundo** | **≥1,2**, y ≥30 en 12 s | Una pieza que deriva sin parar tiene energía continua y **cero cruces por cero**: 0 onsets. Falla aunque se mueva todo el tiempo. |
| **M2** | **factor de cresta de `E_total`**: `pico / mediana` | **≥4,0** | **Esta es la anti-trampa.** Mover todo un poquito todo el tiempo da cresta ≈1,2. Sólo pasa una pieza que alterna quietud y golpes. |
| **M3** | **dominancia** `max E_i / E_total` | entre **0,45 y 0,85** en ≥70% de los cuadros con `E_total > 5% del pico` | <0,45 = papilla (todo se mueve igual, nada se lee). >0,85 con `E_total` baja = **exactamente tu caso**: una sola cosa moviéndose y nada acompañando. |
| **M4** | **cuantización** | ≥80% de los onsets en múltiplos de 8; ≥90% de los onsets **macro** en múltiplos de 15 | El "beat" es esto, no cantidad de movimiento. |
| **M5** | **cuota de cámara** | `Σ E_cam / Σ E_total ≤ 0,20`; ≤0,35 en toda ventana de 30 cuadros; la cámara no es el máximo `E_i` más de 12 cuadros en ninguna ventana de 30 | Es el diagnóstico convertido en número. |
| **M6** | **silencio** | al menos un tramo de ≥6 cuadros con `E_total < 5% del pico` cada 90 cuadros; **nunca** >20 cuadros seguidos sin onset (salvo el último tramo de la pieza) | Sin esto, M2 se podría pasar con un solo golpe enorme al final. |

**Y una séptima que no es de ritmo pero es de fidelidad:** **M7 — cruces en Z.** Para cada par de capas 3D del mismo plano, comparar el orden por Z proyectada contra el orden de apilado, cuadro a cuadro. Cualquier inversión es un FAIL, porque AE y el motor van a mostrar cosas distintas (LEY 1). Es la única de las siete que caza un defecto de píxel y no de estilo.

Ninguna necesita renderizar. Se calculan en milisegundos.

---

# PARTE 4 — TRES PIEZAS, GESTO POR GESTO

Todas: **30 fps · 120 bpm · beat = 15 cuadros · subdivisión = 8**. Curvas por su id de §0.3. Todas las capas de forma con `inPoint = 0` y visibilidad por opacidad (LEY 7). Fondo = sólido real al fondo del apilado (LEY 4). Apilado = orden por Z (LEY 1).

---

## PIEZA A — PRODUCTO · 420 cuadros (14,0 s) · 28 beats
*Paneles de interfaz. Cámara casi quieta; la nube hace cosas.*

**Obturador: 180°, fase −90°.** Render ×16. Presupuestado.
**Espacio (C11):** fondo z=+1500 · nube de paneles z=+400 · panel héroe z=0 · rótulo z=−600. Zoom 2666,67.
**Cámara:** un solo nodo, tres posiciones con claves HOLD (C09) en los cuadros 0, 150 y 300. Entre cortes, deriva en Z de −40 unidades (C10, C5). **Cero rotaciones** (C04 es (b)).
**Micro-movimiento (D05) en las 12 capas desde el cuadro 0 hasta el final**, amplitudes de reposo.

| cuadro | dur | capa | gesto | detalle |
|---|---|---|---|---|
| 0 | — | fondo | sólido, opaco | — |
| 0 | 150 | cámara | C10 deriva Z | −40 unidades, C5 |
| **0** | 18 | panel héroe | **C13 escalonado en profundidad** | de z=+400 a z=0, opacidad 0→100, C1 |
| **15** | 12 | rótulo-1 (línea) | **T03 revelado tras tapa** | tapa fija bajo la línea base, texto de y=+52 a 0, C1 |
| **15** | 2+8 | panel héroe | **D01 acuse** | +6 px en Y, C7/C2 (acusa la llegada del rótulo) |
| **30** | 14 | tarjeta A | **E01 desliz + fade** | 60 px desde la izquierda; opacidad termina en el cuadro 39 |
| **34** | 14 | tarjeta B | E01 | idem, retardo 4 (D04) |
| **38** | 14 | tarjeta C | E01 | idem |
| **45** | 4 | rótulo-1 | **D01 acuse** | −3 px, acusa a las tarjetas |
| 52 | 68 | — | **meseta / lectura** | sólo micro + deriva. **M6: silencio de protagonista** |
| **120** | 10 | cursor | **U01 llegada** | entra desde fuera, desacelera a 0 sobre tarjeta B, C1 |
| **130** | 0 | cursor | **U01 clic** | HOLD |
| **130** | 12 | aro | U01 | escala 0→200%, opacidad 80→0, C1/C5 |
| **132** | 2+8 | tarjeta B | **D01 acuse** | +4 px, C7/C2. **2 cuadros DESPUÉS del clic** |
| **135** | 16 | tarjeta B | **U03 → pantalla** | escala 100→118% y z 400→150, C1 |
| **135** | 8 | tarjetas A y C | **E06 colapso** | escala →0 con anclaje al centro de B, C3 |
| **150** | 0 | cámara | **C09 corte** | HOLD a la posición 2 |
| **150** | 300 | cámara | C10 deriva | −40 en Z, C5 |
| **152** | 1+10 | cámara | **C07 contragolpe** | −8 en Z y vuelta, C5/C2 |
| **165** | 20 | tira.png | **U02 scroll** | una altura de ventana, C1 |
| **195** | 50 | — | meseta | |
| **240** | 20 | tira.png | U02 scroll | segundo tramo |
| **248** | 26 | callout-1 | **U04** | punto 8 · segmento1 8 · segmento2 6 · etiqueta desde 261, E01 de 10 |
| **270** | 26 | callout-2 | U04 | idem, retardo 22 (medio beat + acento) |
| **300** | 0 | cámara | **C09 corte** a plano 3 | HOLD |
| **300** | 10 | nube (8 paneles) | **C12 + C13** | z de +900 a +400, escalonado 3, C1. Deriva propia desde el 310 |
| **300** | 24 | rótulo final L1 | **T02 subida por carácter** | 12 por letra, retardo 1,5, una tapa |
| **330** | 20 | rótulo final L2 | T03 | C1 |
| **345** | 8 | acento | **X10 destello** | opacidad 0→100→0, pico en 348 |
| **352** | 10 | nube | **D01 acuse en cascada** | 4 paneles, retardo 1 desde el centro |
| **360** | 60 | — | **resolución** | todo quieto salvo micro + deriva. 30 caracteres de claim → **69 cuadros mínimos: entran justos** |

**Chequeo de métrica:** 19 onsets → 1,36/s ✔ M1. Picos en 0/15/30/130/165/248/300/345 con mesetas entre medio → cresta ≈5,2 ✔ M2. Cámara: dos derivas de 40 unidades y un contragolpe = 11% de la energía ✔ M5. Arranques: 0,15,30,34,38,45,120,130,135,150,165,240,248,270,300,330,345,352,360 → 15 de 19 en múltiplos de 8 o 15 = 79%… **corregir 34→32 y 38→40** para llegar a 89% ✔ M4.

---

## PIEZA B — TIPOGRÁFICA · 390 cuadros (13,0 s) · 26 beats
*La palabra es la pieza. Sin obturador (0°) — render ×1, y el corte seco es el gesto.*

**Espacio:** todo 2D salvo el bloque final. Fondo sólido. Cámara fija, **cero movimiento** salvo un contragolpe. Aquí la cámara aporta ~4% ✔ M5 con margen.
Palabras: `"NO"` / `"ES"` / `"LO QUE"` / `"HACÉS"` / `"ES CUÁNDO"` / logo.

| cuadro | dur | capa | gesto | detalle |
|---|---|---|---|---|
| 0 | 45 | — | **arranque en frío** | negro, nada |
| **45** | 12 | "NO" | **T06 golpe por carácter** | 2 letras, escala 0→112→100 (6+5), retardo 1, anclaje al centro de cada caja |
| **60** | 0 | "NO" | **E12 corte seco** | HOLD, desaparece exacto en el beat 4 |
| **60** | 12 | "ES" | T06 | idem |
| **75** | 0 | "ES" | E12 | |
| **75** | 22 | "LO QUE" | **T02 subida tras tapa** | 6 letras, 12 c/u, retardo 1,5 |
| **97** | 8 | subrayado | **F01 crecer desde el borde** | escala X 0→100, anclaje izquierdo, C1. **Arranca 4 cuadros después de que el texto terminó**, nunca a la vez |
| 105 | 15 | — | **retención** | punto. M6 |
| **120** | 8 | "LO QUE" | **E07 salida barrida** | la tapa vuelve, C3 |
| **120** | 10 | "HACÉS" | **X07 latigazo**… | **no.** Sin obturador el latigazo se ve roto. **→ T14 relevo de palabra**: saliente 8 con C3, entrante 12 con C1, 4 de solape |
| **135** | 12 | "HACÉS" | **T08 interletra que se cierra** | tracking +18→0 por partición medida, opacidad 0→100 en los primeros 8, C2 |
| **150** | 26 | fondo-2 | **X02 tapa visible** | bloque de color de marca: entra 8 (ease-in), retiene 2, sale 10 (C1). **Debajo, X12: cambió todo** |
| **158** | 0 | "HACÉS" | E12 corte bajo la tapa | |
| **158** | 0 | "ES CUÁNDO" | E12 entrada bajo la tapa | |
| **180** | 20 | "CUÁNDO" | **T11 texto cortado diagonal** | dos copias, dos tapas rotadas 12°, mitades ±22 px, C1 |
| **200** | 12 | "CUÁNDO" | **T09 flotación** | ±3 px, período 16, fases desfasadas — sólo mientras se lee |
| 200 | 60 | — | **meseta de lectura** | 10 caracteres → mínimo 23 cuadros quietos; hay 60 ✔ |
| **255** | 10 | palabra puente | **X11 match cut calculado** | "CUÁNDO" se queda, viaja a la posición del bloque final: escala calculada con `sourceRectAtTime` para coincidir con el ancho del claim, C6 de 24 cuadros desde 255 |
| **270** | 8 | resto de la frase | **E08 salida por desarme** | orden inverso al de entrada, retardo 2, C3 |
| **285** | 24 | claim L1 | **T04 revelado con tapa retrasada** | tapa 12 C1; texto +18→0 corrido 2 cuadros |
| **300** | 24 | claim L2 | T04 | retardo 15 (un beat entero: acento, no cascada) |
| **315** | 1+10 | cámara | **C07 contragolpe** | −6 px en Y, C5/C2 — el único movimiento de cámara de la pieza |
| **315** | 6 | claim | **D01 acuse** | +3 px |
| **330** | 30 | logo | **U09 ensamblado** | 5 partes, radio 180 px, retardo inverso al radio 2, C1 + sobrepaso 105 en las 3 últimas |
| **360** | 30 | — | **resolución** | quieto. Sólo D05 |

**Chequeo:** 17 onsets en 13 s = 1,31/s ✔. Cortes secos en 60, 75, 158 → picos altísimos contra mesetas de 60 cuadros: cresta ≈7 ✔✔ M2. Cámara 4% ✔ M5. Todos los arranques en múltiplos de 15 salvo 97, 105, 135, 255 → 13/17 = 76%… **mover 97→96 y 255→256** (múltiplos de 8) → 88% ✔ M4.

---

## PIEZA C — DATOS · 450 cuadros (15,0 s) · 30 beats
*Cifras, barras, progreso. Sin sobrepaso en ningún dato (E02, prohibición 2). Obturador 90° (crujiente, lectura) — render ×16 sólo si se decide; recomiendo **0°** y ahorrarlo, porque no hay un solo gesto de velocidad.*

**Espacio:** panel de fondo z=+200, barras z=0, cifras z=−100, rótulos z=−300. Cámara fija con deriva en escala 100→103% en 450 cuadros (C10, C5). Aporte de cámara: ~6%.

| cuadro | dur | capa | gesto | detalle |
|---|---|---|---|---|
| **0** | 18 | panel base | **F14 nine-slice** | crece de 40% a 100% del alto, 9 capas, C2. (Nueve o ninguna) |
| **15** | 12 | título | **T03 revelado tras tapa** | C1 |
| **30** | 45 | 6 barras | **F01 crecer desde el borde** | 14 cuadros c/u, anclaje inferior, **retardo 3** (D04: `clamp(2·14/5,1,6)=6`→ uso 3 porque son sólo 6), C1. **Sin sobrepaso.** |
| **30** | 45 | 6 etiquetas | E01 desliz+fade | emparentadas a la punta de su barra, **retardo de arrastre 2** (D02) respecto de la barra |
| **48** | 6 | panel base | **D01 acuse** | +4 px al aterrizar la última barra |
| **60** | 40 | cifra grande | **U07 odómetro** | 4 dígitos; unidades una vuelta cada 8, decenas cada 80; frenada C1 + medio sobrepaso de dígito (15% y vuelve). Ventana = X04 |
| 100 | 50 | — | **meseta de lectura** | M6 |
| **150** | 45 | eje + 6 barras | **U05 reordenamiento** | intercambio 18 cuadros, escalonado 2 entre filas; **el que adelanta usa dos copias con HOLD de opacidad** en el cuadro del cruce (LEY 1). Eje re-escala con la misma curva, C6 |
| **150** | 45 | etiquetas | viajan con sus barras | D02, retardo 2 |
| **195** | 8 | barra ganadora | **U08 cambio de color** | dos copias cruzadas por opacidad, C5, sobre el beat 13 |
| **195** | 4 | barra ganadora | **D01 acuse** | +5 px |
| **210** | 45 | anillo | **F03 anillo de progreso** | dos medias-lunas-tapa sobre nulo que gira 0→360°, HOLD de intercambio al 50% (cuadro 232), casquete viajero. C1 |
| **210** | 45 | cifra del anillo | U07 odómetro | sincronizada con el anillo, misma curva |
| **240** | 35 | 3 aros | **F07 ondas concéntricas** | escala 0→300%, opacidad desde el 40%, escalonado 10. Nacen del centro del anillo |
| **255** | 60 | — | meseta | |
| **300** | 30 | 9 celdas | **F09 grilla escalonada** | 3×3, `retardo = (fila+col)×2`, 12 c/u, C1, **sin sobrepaso** (más de 9 = gelatina; con 9 justos, 105 en las 3 de la diagonal) |
| **330** | 26 | callout | **U04** | punto 8 · segmento1 8 · segmento2 6 · etiqueta desde 343 |
| **360** | 20 | 6 barras | **F06 ecualizador** | escala Y al beat: **golpe 2 cuadros (C7), caída 10 (C1)**, fases desfasadas 0,9 rad. Dos pulsos: 360 y 375 |
| **375** | 6 | cifra grande | **D-acento** | escala 100→106→100, 2+4, C7/C8 |
| **390** | 18 | todo el tablero | **E08 salida por desarme** | orden inverso, retardo 2, C3 |
| **390** | 24 | claim final | **T04 revelado con tapa retrasada** | C1 |
| **414** | 36 | — | **resolución** | quieto. 26 caracteres → 60 cuadros mínimos… **son 36: alargar la pieza a 474 o cortar el claim a 15 caracteres.** Elijo cortar el claim. |

**Chequeo:** 18 onsets en 15 s = 1,2/s ✔ M1 (justo). Mesetas de 50 y 60 cuadros contra picos en 30/150/210/360 → cresta ≈4,8 ✔ M2. Dominancia: en 30–75 el macro son las barras (0,62), en 150–195 el reordenamiento (0,71), en 210–255 el anillo (0,58) ✔ M3. Cámara 6% ✔ M5. Arranques: 0,15,30,48,60,150,195,210,240,300,330,360,375,390 → **todos múltiplos de 15 salvo 48** = 93% ✔ M4.

---

# LO QUE HARÍA MAÑANA, EN ORDEN

1. **Arreglar B0** (rotaciones de cámara + los tres NOSOP/NOTA). Es un defecto silencioso en una capacidad que el brief da por existente.
2. **Escribir la partición medida por substrings acumulados.** Una función. Desbloquea 11 gestos de texto.
3. **Construir la compuerta de §3.7.** Seis números sobre el documento, sin render. Convierte "está como muerto" en un FAIL con nombre. **Y la séptima (cruces en Z), que caza un defecto de píxel que hoy no caza nada.**
4. **Autorar la PIEZA A** tal como está escrita arriba, sin inventar nada, y pasarle la compuerta.
5. Recién después, **B1 (desenfoque por capa)** y **B2 (acabado)**.

Y las cinco pruebas de un cuadro contra AE por `tools/ae/llamar.mjs`, que resuelven clasificaciones hoy escritas por deducción: `threeDLayer` en cámara · `copyToComp` con una forma que empieza en el segundo 3 · dos capas 3D cruzándose en Z · una tapa sobre una capa con `brillo` declarado (anticipo la respuesta leyendo `comp3d.html:443`: la mezcla es **aditiva sobre el render base**, así que el halo se suma **encima** de la tapa y la tapa no lo apaga — **no pongas tapas sobre capas con resplandor**) · un corte en el medio de la ventana del obturador.