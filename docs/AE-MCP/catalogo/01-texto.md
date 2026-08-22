# CATÁLOGO DE GESTOS — FRENTE: TEXTO

## 0. Dos cosas que gobiernan todo lo que sigue

**(0.1) El modelo de animadores de texto de AE, en una pantalla.** Una capa de texto tiene un grupo `Animators`. Cada **animador** contiene dos cosas: un juego de **propiedades** (posición, escala, rotación, opacidad, sesgo, color de relleno, color/grosor de trazo, interletra, interlínea, desplazamiento de carácter, valor de carácter, desenfoque) y un juego de **selectores**, que deciden *cuánto* de esas propiedades le toca a cada carácter. El selector devuelve un número de 0 a 1 por carácter; la propiedad se multiplica por ese número. Todo el repertorio del oficio sale de animar el selector, no la propiedad.

Hay tres selectores:

- **De rango (Range):** Inicio / Fin / Desplazamiento, en % o en índice. En *Avanzado*: **Unidades** (% o índice), **Basado en** (caracteres / caracteres sin espacios / palabras / líneas), **Modo** (suma, resta, intersección…), **Cantidad**, **Forma** (cuadrada, rampa arriba, rampa abajo, triángulo, redonda, suave), **Suavidad**, **Facilidad alta / Facilidad baja**, **Orden aleatorio + Semilla**. La barra de herramientas real del oficio son *Forma* y *Facilidad*: la forma cuadrada por defecto es lo que hace que un revelado se vea barato, y `rampa abajo` + facilidad alta ~50 es la receta que repiten todos los tutoriales.
- **Ondulado (Wiggly):** ruido temporal por carácter — Cantidad máx/mín, Fluctuaciones por segundo, Correlación (qué tan parecidos entre sí se mueven los vecinos), Bloqueo de dimensiones, Semilla.
- **De expresión (Expression):** una expresión evaluada **una vez por carácter**, con tres variables que solo existen ahí: `textIndex`, `textTotal`, `selectorValue`. La expresión por defecto es `selectorValue * textIndex/textTotal`. Es el selector más potente y el menos usado.

**(0.2) La regla que decide todo el catálogo: el gesto hay que AUTORARLO como se va a EXPORTAR.** Nuestro exportador no lleva animadores. Entonces no sirve "hacerlo con un animador en AE y después aproximarlo": la fidelidad se mide contra AE, y AE mostraría otra cosa. Cuando abajo digo *(a) se puede hoy*, quiero decir: **el script arma en AE una capa por carácter (o por palabra), con transformaciones, emparentado, apilado y tapas — y AE y el motor web muestran exactamente lo mismo porque es exactamente la misma estructura.** El animador de texto queda como referencia de vocabulario y de números, no como implementación.

---

## 1. La pregunta clave: ¿qué se consigue con una capa por carácter?

Respondo esto primero porque es lo que decide 20 de los 24 gestos.

### Lo que NO se pierde (y creo que es lo que te preocupaba)

**El kerning se recupera exacto, con lo que ya tenemos.** No hace falta pedirle a AE la tabla de kerning ni la posición interna de cada glifo. Se mide por **substrings acumulados**: se crea una capa de texto de trabajo, se le pone `"H"`, se mide `sourceRectAtTime`; se le pone `"HO"`, se mide; el avance de la `O` —**con el par de kerning H→O ya aplicado**— es la diferencia de anchos. Iterando sobre la cadena entera sale el origen X de cada carácter dentro de la línea real, no de cada carácter medido solo. Como ya tenemos la caja medida por debajo del 1% y la interletra como propiedad de capa, esto cierra.

Y hay un premio: la capa por carácter da **más** control que el animador, no menos. Cada letra puede tener su propio ancla, su propio padre, su propio lugar en el orden de apilado, su propia tapa, su propia Z real frente a la cámara. Un animador mueve los caracteres en Z pero no les da jerarquía ni les cambia el apilado.

### Lo que sí se pierde

| Se pierde | Por qué | Salida |
|---|---|---|
| **Ligaduras** (fi, ffl) y alternativas contextuales / swashes de OpenType | Partir la cadena rompe la sustitución de glifos | Desactivar ligaduras en la fuente, o tratar la ligadura como un "carácter" de dos letras |
| **Escrituras con unión** (árabe, devanagari) | La forma del glifo depende de sus vecinos | No partir; ahí el animador es insustituible |
| **Texto que cambia de largo** (contadores, scramble, texto de origen animado) | El layout está horneado; si la cadena cambia de ancho, el layout miente | Cifras tabulares / monoespaciada, o rehornear por cuadro |
| **Texto de párrafo justificado y reflujo** | El corte de línea depende del bloque entero | Partir por línea ya cortada, nunca por bloque |
| **Selección parcial de un carácter** (Cantidad 50% aplica medio efecto a un carácter a medio seleccionar) | La partición cuantiza a carácter entero | Irrelevante en la práctica: podés poner la curva que quieras por capa |
| **Color / trazo / desenfoque por carácter animados** | Nuestras capas llevan color estático | Dos copias apiladas del mismo texto en dos colores, cruzadas por opacidad. Cuesta el doble de capas |

### Cuándo vale la pena y cuándo no

**Vale:** títulos, claims, cifras, cualquier cosa de menos de ~25 glifos visibles a la vez. Es el 95% de lo que aparece en una pieza de este tipo.
**No vale:** párrafos. Una frase de 40 caracteres con cross-fade de color son 120 capas; con desenfoque falso por copias, 400. Ahí se anima **por palabra** (5-8 capas) o **por línea** (2-3 capas) y se acabó — que además suele verse mejor, porque carácter por carácter en texto largo satura.

**Regla operativa:** partir por **la unidad más grande que produzca el gesto**. Por línea si alcanza, por palabra si no, por carácter solo cuando el gesto es literalmente por carácter.

---

## 2. Los tres principios de ritmo que faltaban en tu pieza

Antes del catálogo, porque son transversales y son la respuesta directa a "está muerto, no tiene beat":

1. **Retardo de escalonado (stagger delay).** Es el parámetro que crea vida. Por carácter: **1–2 cuadros**. Por palabra: **2–4**. Por línea: **3–6**. Entre bloques distintos de la pantalla: **4–8**. Nunca 0 (todo junto = muerto), nunca >3 por carácter en una frase larga (se hace eterno).
2. **Nada perfectamente quieto.** Cada elemento que ya entró debe conservar una deriva de reposo (ver gesto #21). Es la diferencia entre "utilería" y "cosa viva".
3. **Sobrepaso, y ojo con cómo se hornea.** Nuestro conversor pasa velocidad+influencia de AE a cubic-bezier. Un `easeOutBack` (`cubic-bezier(0.34, 1.56, 0.64, 1)`) **no es representable** como una clave de AE, porque el punto de control sale del rango 0..1. **El sobrepaso en AE se hace con una tercera clave** (0 → 108% → 100%), que es justamente lo que ya soportamos ("sobrepaso real con dimensiones separadas"). No intentes meterlo en la curva.

Notación de curvas de acá en adelante: doy influencia de AE (`sal X% / ent Y%`) y el cubic-bezier equivalente.
- **Salida fuerte** (lo más usado en revelados): `sal 0% / ent 85%`, velocidad 0 ≈ `cubic-bezier(0.16, 1, 0.30, 1)`
- **Estándar de movimiento**: `sal 40% / ent 60%` ≈ `cubic-bezier(0.65, 0, 0.35, 1)`
- **Latigazo**: `sal 15% / ent 95%` ≈ `cubic-bezier(0.85, 0, 0.15, 1)`
- **Lineal** para máquina de escribir y odómetros mecánicos.

---

## 3. EL CATÁLOGO

---

### 1. ESCALONADO TIPOGRÁFICO — *stagger / cascade / offset*
**QUÉ ES.** No es un gesto: es el motor de todos los demás. Los caracteres, palabras o líneas hacen lo mismo con un retardo constante entre sí.
**EN AE.** Un animador con la propiedad que sea, un selector de rango, y se anima **Desplazamiento** de -100% a 100% (o Inicio de 0 a 100). La *Forma* del selector controla el perfil del solapamiento: `cuadrada` = corte seco (típico de máquina de escribir), `rampa abajo` = el estándar de la industria, `triángulo` = onda que pasa. *Facilidad alta/baja* redondea las puntas.
**TIEMPOS.** Frase de 12 caracteres: total **16–22 cuadros**, retardo 1,5/carácter. Por palabra: 3/palabra. Curva del Desplazamiento: casi lineal, `sal 20% / ent 20%` — la curva bonita va en cada capa, no en el barrido.
**CLASIFICACIÓN. (a) SE PUEDE HOY.** Receta: una capa por unidad, misma animación en todas, `inPoint` desplazado i×retardo. Para replicar la *Forma* del selector, se modula la **duración**, no la posición: rampa abajo ≈ las primeras unidades tardan un 20% más.
**DÓNDE SE VE.** Todo. Es la firma de Apple, de Stripe, del video de Gemini.

---

### 2. REVELADO POR CARACTER CON DESPLAZAMIENTO — *animate in / slide-up reveal*
**QUÉ ES.** Cada letra aparece subiendo unos píxeles y ganando opacidad, en cascada.
**EN AE.** Animador con `Posición` (0, 30, 0) + `Opacidad` 0%, selector de rango, Desplazamiento animado. matchNames: `ADBE Text Animator` → `ADBE Text Animator Properties` → `ADBE Text Position 3D`, `ADBE Text Opacity` (confirmados).
**TIEMPOS.** Por letra: **10–14 cuadros**, desplazamiento inicial 25–40% del cuerpo de la fuente. Curva `sal 0% / ent 80%`. Retardo 1,5.
**CLASIFICACIÓN. (a) SE PUEDE HOY.** Capa por carácter, posición Y + opacidad, `inPoint` escalonado.
**DÓNDE SE VE.** Genérico de plataforma; el estándar de los presets "Animate In" de AE.

---

### 3. MÁQUINA DE ESCRIBIR — *typewriter / typeon*
**QUÉ ES.** Los caracteres aparecen de golpe, uno por uno, con un cursor que parpadea.
**EN AE.** Animador de `Opacidad` a 0, selector de rango con **Unidades: Índice**, **Basado en: Caracteres**, Forma **cuadrada**, sin facilidad, y se anima `Fin` de 0 al número de caracteres, **lineal**. (Cualquier suavizado arruina el gesto: el corte seco es el gesto.)
**TIEMPOS.** **2 cuadros por carácter** = rápido/UI. **3 cuadros** = ritmo de tipeo humano (≈10 car/s). Cursor: bloque parpadeando cada **15 cuadros** con claves HOLD, y que **deje de parpadear mientras se escribe** — ese detalle es la mitad de la credibilidad.
**CLASIFICACIÓN. (a) SE PUEDE HOY.** Es el caso más limpio: una capa por carácter, `inPoint` = i×2, sin animación ninguna. El cursor es un sólido con posición en claves HOLD saltando de posición de carácter en posición de carácter, y opacidad en claves HOLD.
**DÓNDE SE VE.** Terminales, títulos de documental técnico, la intro de casi todo producto de developer tools.

---

### 4. REVELADO DE LÍNEA TRAS TAPA — *masked line reveal / box wipe*
**QUÉ ES.** La línea aparece como si un borde invisible la fuera destapando de izquierda a derecha; suele ir con la línea subiendo desde debajo del borde.
**EN AE.** El oficio lo hace con una máscara en una precomposición. **Nosotros lo hacemos mejor con tapa**: el sólido del color del fondo, encima de la línea en el apilado, y se anima el sólido o el texto.
**TIEMPOS.** **12–18 cuadros** por línea, curva `sal 0% / ent 85%`. Con dos líneas, retardo de 4.
**CLASIFICACIÓN. (a) SE PUEDE HOY, y es nuestro gesto insignia.** Dos variantes:
  - *Barrido lateral:* una tapa cubre la línea entera y se corre en X hasta salir.
  - *Subida:* el texto sube desde abajo mientras una tapa fija tapa todo lo que queda por debajo de su línea de base. El texto empieza fuera del área visible del renglón y termina dentro.
  Se combinan: dos tapas (una arriba, una abajo) dan la "ventana" clásica.
  **Detalle que ya nos puede morder:** la tapa tiene que ser del color exacto del fondo *en ese punto*. Sobre un fondo con degradado o con textura no funciona, y ahí sí hace falta máscara → **(b)** o rediseñar el fondo detrás del texto como un bloque plano.
**DÓNDE SE VE.** Editorial, títulos de Netflix, todo el catálogo de Ben Marriott.

---

### 5. SUBIDA POR CARACTER TRAS TAPA — *character rise / cascading window reveal*
**QUÉ ES.** El #4 pero por letra: cada letra emerge de detrás de la misma línea invisible, escalonada.
**EN AE.** Animador de `Posición` Y grande (más que la altura del cuerpo) + **una máscara** en la precomposición. Sin máscara no existe: el animador solo no lo hace, porque las letras se verían salir de la nada.
**TIEMPOS.** 12 cuadros por letra, retardo **1,5–2**. Curva `sal 0% / ent 85%`.
**CLASIFICACIÓN. (a) SE PUEDE HOY.** Capa por carácter + **una sola tapa** para toda la línea (el sólido tapa la banda entera por debajo de la línea de base; las letras entran desde ahí abajo). Una tapa, N capas: barato.
**DÓNDE SE VE.** Es el gesto del video de Gemini y de casi toda la publicidad de producto de los últimos cinco años.

---

### 6. TEXTO QUE SE ARMA DESDE EL DESENFOQUE — *blur in / focus in*
**QUÉ ES.** El texto entra borroso y va enfocando, normalmente con un poco de escala.
**EN AE.** Animador con la propiedad `Desenfoque` (matchName `ADBE Text Blur`, confirmado) — es una propiedad **del animador**, así que se puede escalonar por carácter, que es lo que la hace valiosa. Valores 40–80 px iniciales.
**TIEMPOS.** **14–20 cuadros**, curva `sal 0% / ent 90%`. Con escala de 108%→100% en paralelo. Retardo 2.
**CLASIFICACIÓN. (b) EXIGE AGREGAR ALGO.** Concretamente: **desenfoque gaussiano por capa, con claves, declarado en el comentario de la capa igual que ya declaramos el resplandor** — y aplicado *de verdad* en AE con un Gaussian Blur, para que la fidelidad se siga midiendo. Es la misma extensión del canal de comentario que ya existe; el exportador no aprende un efecto nuevo, aprende una clave nueva del comentario.
*Aproximación (a) si no se agrega:* 4 copias de la capa desplazadas ±2 px con opacidad 25% que convergen. Se ve parecido en movimiento y **no** se ve parecido en cuadro fijo. Es un truco, y hay que llamarlo truco.
**DÓNDE SE VE.** Aperturas de moda, títulos de Apple.

---

### 7. GOLPE CON SOBREPASO POR CARACTER — *pop / punch-in / scale bounce*
**QUÉ ES.** Cada letra aparece agrandándose de golpe, se pasa un poco y vuelve.
**EN AE.** Animador de `Escala` (`ADBE Text Scale 3D`, confirmado) de 0% a 100%, **con tres claves**: 0 → 112 → 100. `Ancla` del grupo en el centro del carácter (More Options → Anchor Point Grouping: **Character**; matchName no confirmado, ver §4).
**TIEMPOS.** Subida **6 cuadros** curva `sal 0/ent 70`, rebote **5 cuadros** `sal 60/ent 0`. Retardo **1**.
**CLASIFICACIÓN. (a) SE PUEDE HOY.** Requiere que el ancla de cada capa-carácter esté en el centro de su propia caja: lo tenemos, es `sourceRectAtTime`.
**DÓNDE SE VE.** Lo alegre: música, redes, deportivo.

---

### 8. VOLTEO 3D POR CARACTER — *flip in / card flip letters*
**QUÉ ES.** Cada letra gira sobre su eje X o Y como una tarjeta, apareciendo.
**EN AE.** Animador con `Rotación X/Y` (necesita la capa en 3D) de -90° a 0°, ancla por carácter, y la cámara con perspectiva real para que se vea el escorzo.
**TIEMPOS.** **9–12 cuadros** por letra, curva `sal 10% / ent 75%`, retardo **2**. Con el obturador abierto, imprescindible.
**CLASIFICACIÓN. (a) SE PUEDE HOY.** Tenemos rotación 3D, ancla, cámara con perspectiva y punto de interés, y obturador. Es literalmente nuestra caja de herramientas.
**DÓNDE SE VE.** Tableros de aeropuerto (split-flap), marcadores deportivos.

---

### 9. ONDULACIÓN / TEMBLOR — *wiggly selector / jitter type*
**QUÉ ES.** Las letras vibran o flotan cada una por su lado, sin llegar a moverse de sitio.
**EN AE.** El **selector ondulado**, no una expresión wiggle. Parámetros clave: `Fluctuaciones por segundo` **2–4** para flotación, **10–14** para nervio; `Correlación` **50–70%** (a 100% se mueven todas igual y no sirve; a 0% es ruido puro).
**TIEMPOS.** Continuo. Amplitudes: posición ±4 px, rotación ±3°, escala ±4%.
**CLASIFICACIÓN. (a) SE PUEDE HOY, con horneado.** El ondulado es ruido continuo; nosotros exportamos claves. Se hornean claves cada **3–4 cuadros** con bezier suave. A 2 fluctuaciones/s eso es sobremuestreo de sobra. Coste: ~10 claves/segundo/capa. **Ojo:** la fase del ruido hay que fijarla por semilla para que sea determinista, igual que en el resto del repo.
**DÓNDE SE VE.** Estética "hand-made", lyric videos, el temblor sutil de las UIs de Framer.

---

### 10. TEXTO QUE SE RESUELVE DESDE CARACTERES ALEATORIOS — *scramble / decode / hacker text*
**QUÉ ES.** Un revoltijo de glifos que se va resolviendo en la palabra real, de izquierda a derecha.
**EN AE.** Dos propiedades de animador poco conocidas: **Desplazamiento de carácter** (suma N al valor Unicode: "HELLO" con 2 → "JGNNQ") y **Valor de carácter** (lo reemplaza por un glifo fijo). Con un `Rango de caracteres` a *Preservar mayúsculas y dígitos* se queda dentro del alfabeto. Se combina un selector de rango que avanza (lo ya resuelto) con un selector **ondulado** de alta frecuencia sobre el desplazamiento (lo que aún baila).
**TIEMPOS.** **2–3 cuadros por carácter** de resolución; el revoltijo cambia cada **1–2 cuadros**. Lineal, siempre lineal.
**CLASIFICACIÓN. (b) EXIGE AGREGAR ALGO — y es la adición de mejor relación coste/beneficio de todo el frente: TEXTO DE ORIGEN CON CLAVES *HOLD*.** O sea: que una capa de texto pueda llevar una lista `[{cuadro, cadena}]` en vez de una cadena fija. Es un cambio chico (el motor ya sabe dibujar texto; solo tiene que elegir cuál) y desbloquea de un saque el gesto #10, el #11 y medio #12.
*Sin eso*, la vía (a) es un flipbook de capas (una capa por estado, `inPoint`/`outPoint` de 2 cuadros). Para 10 caracteres × 8 estados son 80 capas de vida corta. Funciona; es caro y feo de generar.
**DÓNDE SE VE.** Todo lo que quiera parecer un sistema: Mission Impossible, dashboards, la estética "AI thinking".

---

### 11. CONTADOR / CIFRA QUE SUBE — *number counter*
**QUÉ ES.** Un número que corre de 0 a su valor mientras la barra o el gráfico crecen con él.
**EN AE.** Nadie usa el efecto `Numbers` (no respeta la fuente ni los separadores). Se hace con un **Slider Control** animado y una expresión en el Texto de origen con `toFixed()` y una función de comas. La legibilidad se maneja formateando: cifras tabulares para que no baile el ancho.
**TIEMPOS.** **20–45 cuadros**. Curva **fuerte de salida** (`sal 0 / ent 90`): el número tiene que *llegar* antes de que uno se aburra, y los últimos dígitos frenan. Nunca lineal — un contador lineal se siente como una barra de carga.
**CLASIFICACIÓN. (b) EXIGE LO MISMO QUE EL #10** (texto de origen con claves HOLD). Además: el exportador tendría que **hornear** la expresión, o sea evaluarla cuadro a cuadro en AE y escribir la lista de cadenas. Eso es bueno: no metemos expresiones en el formato, metemos su resultado.
**Y una advertencia de layout:** si el número cambia de ancho (9 → 10) y el texto está centrado, **todo se corre**. Con capa por carácter esto es un error visible. Solución: dígitos de ancho fijo, uno por posición.
**DÓNDE SE VE.** Todo dashboard, todo video de resultados trimestrales.

---

### 12. ODÓMETRO — *number roll / slot machine digits*
**QUÉ ES.** Cada dígito rueda verticalmente como un cuentakilómetros; el de las unidades gira rápido, el de las decenas lento.
**EN AE.** Una columna de texto "0 1 2 3 4 5 6 7 8 9 0" por posición de dígito, animada en Y detrás de una máscara del alto de un dígito.
**TIEMPOS.** El dígito de unidades: una vuelta cada **8–10 cuadros**. Cada posición a la izquierda, 10× más lento. Frenada final con `sal 0 / ent 85` y **medio sobrepaso** (se pasa 15% de un dígito y vuelve) — ese detalle es lo que lo hace mecánico en vez de digital.
**CLASIFICACIÓN. (a) SE PUEDE HOY, entera y sin agregar nada.** Es puro transform + tapa: una capa de texto larga moviéndose en Y, con dos tapas (arriba y abajo) recortando la ventana. **Y no necesita texto animado**, que es justo lo que la hace preferible al #11 mientras no tengamos claves de texto. Si querés un contador *ya*, hacelo odómetro.
**DÓNDE SE VE.** Precios, marcadores, el clásico de Sonduck y de mil plantillas de Envato.

---

### 13. PALABRA POR BEAT — *word swap / kinetic typography*
**QUÉ ES.** Una palabra sola en pantalla, grande, reemplazada por la siguiente al golpe de la música. Es *el* género.
**EN AE.** Nada exótico: capas con `inPoint`/`outPoint` sobre marcadores de beat, más un gesto de entrada por palabra (escala, empuje, volteo) y variación de tamaño y posición para acentuar la palabra importante.
**TIEMPOS.** A **120 bpm son 15 cuadros por beat**; a 100 bpm, 18. La palabra clave se queda **2 beats**, las de relleno **1**. La entrada ocupa **el 40% del beat como máximo** (6 cuadros de 15): si ocupa más, la palabra nunca se lee quieta y el video se siente lento — que es exactamente el diagnóstico que te dieron.
**CLASIFICACIÓN. (a) SE PUEDE HOY.** Lo único que hace falta es **una grilla de beats en el guion**, no una capacidad nueva del exportador. Si tuviera que apostar dónde estaba el problema de "no tiene el beat", apuesto acá: no había una grilla, había duraciones sueltas.
**DÓNDE SE VE.** El género entero: lyric videos, Squarespace, el "manifiesto" de cualquier marca.

---

### 14. TEXTO EMPUJADO POR OTRO — *push out / push replace*
**QUÉ ES.** La palabra nueva entra desde un lado y empuja físicamente a la vieja, que sale por el otro. Se leen como una sola cosa que se desplaza.
**EN AE.** Dos capas de texto emparentadas a un **nulo**; se anima el nulo el ancho de una palabra; una máscara del tamaño de la ventana recorta.
**TIEMPOS.** **8–12 cuadros**, curva `sal 20% / ent 80%`. Con obturador. Nunca más de 12: el empuje es un gesto de fuerza.
**CLASIFICACIÓN. (a) SE PUEDE HOY.** Emparentado (lo tenemos) + dos tapas laterales (lo tenemos). El nulo se mueve, las dos capas viajan con él, las tapas comen lo que sale por los costados.
**DÓNDE SE VE.** UI de apps, transiciones de listas, Framer/Rive.

---

### 15. LATIGAZO — *whip / whip pan text swap*
**QUÉ ES.** El texto sale disparado y borroso hacia un lado y entra otro desde el mismo lado, como si la cámara hubiera latigueado. La transición vive en el desenfoque.
**EN AE.** Posición con curva extrema y **obturador a 180° o más** (hasta 360° para el latigazo declarado). Fase del obturador -90°.
**TIEMPOS.** Salida **4 cuadros**, entrada **5**, con **1 cuadro de solape** en que no se lee nada. Curva `sal 15% / ent 95%` (≈ `cubic-bezier(0.85, 0, 0.15, 1)`). Desplazamiento: **al menos 1,5 anchos de pantalla** — corto no lo logra.
**CLASIFICACIÓN. (a) SE PUEDE HOY.** Tenemos obturador con ángulo y fase, que es la pieza rara. Es de los gestos donde nuestra cadena ya está por encima de lo esperable.
**DÓNDE SE VE.** Deportivo, ESPN, el vocabulario de Video Copilot.

---

### 16. TEXTO SOBRE TRAZADO — *text on a path*
**QUÉ ES.** La frase corre sobre una curva; y animando el margen, se desliza a lo largo de ella.
**EN AE.** `Path Options`: se le asigna una máscara como trazado y se animan **Primer margen** / **Último margen**. También `Invertir trazado`, `Perpendicular al trazado`, `Alinear forzado`. matchNames confirmados: `ADBE Text Path Options`, `ADBE Text First Margin`, `ADBE Text Last Margin`, `ADBE Text Reverse Path`, `ADBE Text Perpendicular To Path`.
**TIEMPOS.** Un recorrido completo, **60–120 cuadros**, casi lineal (`sal 25 / ent 25`), o continuo en bucle.
**CLASIFICACIÓN. (a) SE PUEDE HOY, con horneado — pero la receta es nuestra, no la de AE.** El script calcula la curva paramétrica él mismo, samplea el avance acumulado de cada carácter (§1) y coloca cada capa-carácter en su punto con `rotación = tangente`. Animarla es rehornear las posiciones. **Importante:** no se puede autorar con Path Options de AE y exportar, porque el exportador no lee trazados; el AE que ve el diseñador tiene que ser ya el AE de las capas partidas.
*Lo que sí se pierde:* el texto no se "estira" en la curva como en AE, y en curvas de radio chico frente a un cuerpo grande las letras se separan visiblemente. Radio mínimo ≈ 4× el cuerpo.
**DÓNDE SE VE.** Sellos circulares, packaging, el revival de tipografía en arco de los últimos años.

---

### 17. INTERLETRA QUE SE CIERRA — *tracking in / letterspacing collapse*
**QUÉ ES.** El texto empieza muy abierto (o muy apretado) y se acomoda a su interletra final mientras aparece.
**EN AE.** Animador de `Interletra` (`ADBE Text Tracking Amount`, confirmado) de 40 a 0, con el selector cubriendo todo. Un solo animador, sin escalonar: es un gesto de **conjunto**, no de caracteres.
**TIEMPOS.** **20–30 cuadros**, curva `sal 0% / ent 90%`, con opacidad entrando en los primeros 10. De 40 a 0 en un cuerpo grande; en cuerpo chico, de 15 a 0.
**CLASIFICACIÓN. (a) SE PUEDE HOY, pero OBLIGA a partir.** Nuestra interletra es propiedad estática de capa: en una capa entera no se puede animar. Con capa por carácter es trivial (cada X interpola desde su posición abierta a la cerrada) y además queda **exacto**, porque las dos posiciones se miden.
**DÓNDE SE VE.** Títulos de lujo y de moda; es *el* gesto "premium" barato.

---

### 18. SUBRAYADO / TACHADO QUE SE DIBUJA — *underline draw / strikethrough*
**QUÉ ES.** Una línea que crece de un extremo al otro debajo (o encima) de la palabra.
**EN AE.** Casi siempre con una capa de forma y **Trim Paths**, que no soportamos.
**TIEMPOS.** **8–12 cuadros**, curva `sal 0% / ent 80%`. Empieza **3–5 cuadros después** de que el texto terminó de entrar, nunca a la vez.
**CLASIFICACIÓN. (a) SE PUEDE HOY, sin trim paths.** Un sólido del ancho final (que medimos con `sourceRectAtTime` del texto) y una **tapa** que lo destapa corriéndose. O, más simple: escala X del sólido de 0 a 1 con el ancla en el extremo izquierdo — idéntico a trim paths para un trazo recto. El tachado es lo mismo a media altura. Una línea de doble punta (crece desde el centro) es escala X con ancla al centro.
**D�ois SE VE.** Editorial, enfatizado en explainers, Jake In Motion.

---

### 19. TEXTO CORTADO / MITADES DESFASADAS — *sliced text / split text*
**QUÉ ES.** La palabra parece cortada por una línea horizontal y las dos mitades se desplazan en sentidos opuestos, o entran por separado.
**EN AE.** Dos copias de la capa, cada una con una máscara que muestra media letra.
**TIEMPOS.** **10–14 cuadros**, desplazamiento de 15–30 px por mitad, curva `sal 0% / ent 85%`. En glitch: 2–3 cuadros con claves HOLD.
**CLASIFICACIÓN. (a) SE PUEDE HOY.** Dos copias del texto; a cada una una **tapa** que le come la mitad que no le toca. La tapa puede estar **rotada** — con eso el corte deja de ser horizontal y se consiguen cortes diagonales, que son la versión que se usa de verdad. Es el caso donde "el apilado ES el efecto" rinde mejor.
**DÓNDE SE VE.** Glitch, cyber, carátulas de música electrónica; también en versión elegante como corte a 12° en títulos de moda.

---

### 20. BARRIDO DE RESALTE — *highlight sweep / karaoke*
**QUÉ ES.** Un bloque de color barre la frase palabra por palabra y el texto que va tocando cambia de color.
**EN AE.** Un sólido con máscara animada detrás del texto, más un animador de `Color de relleno` con el mismo selector.
**TIEMPOS.** A ritmo de habla: **6–9 cuadros por palabra**. El resalte y el cambio de color tienen que ir **exactamente sincronizados** o se ve el desfase.
**CLASIFICACIÓN. (a) SE PUEDE HOY, cara pero limpia.** El bloque de resalte es un sólido creciendo por escala X (ancla a la izquierda). El cambio de color son **dos copias apiladas del texto en los dos colores**, y la copia de arriba se destapa con la **misma** tapa/sólido que hace de resalte — así el sincronismo es estructural, no de tiempos. Precio: 2× capas de texto.
**DÓNDE SE VE.** Subtítulos de redes sociales (el formato dominante de TikTok/Reels), karaoke, podcasts en video.

---

### 21. FLOTACIÓN DE REPOSO — *idle float / breathing*
**QUÉ ES.** Lo que ya está en pantalla nunca se queda del todo quieto: deriva un par de píxeles, respira un 1% de escala, con periodos largos y desfasados entre elementos.
**EN AE.** Un ondulado de baja frecuencia, o una expresión wiggle suave. Nadie lo enseña como "gesto" y es lo que separa una pieza viva de un PDF animado.
**TIEMPOS.** Periodo **90–150 cuadros** (3–5 s), amplitud posición **2–5 px**, escala **±0,8%**, rotación **±0,4°**. Cada elemento con **fase distinta**, si no respiran todos juntos y se nota.
**CLASIFICACIÓN. (a) SE PUEDE HOY.** Se hornean 3–4 claves por ciclo con bezier suave. Coste ridículo: ~1 clave/segundo/capa.
**DÓNDE SE VE.** En todo lo bueno, y por eso no se ve. Es la respuesta directa a "está muerto".

---

### 22. FALSO EXTRUIDO — *fake 3D extrude / stacked text*
**QUÉ ES.** El texto tiene cuerpo: al girar se le ve el canto.
**EN AE.** Capas duplicadas y desplazadas en Z (o el extruido real de Cinema 4D Renderer).
**TIEMPOS.** El giro, **20–40 cuadros**, curva `sal 20 / ent 70`. Nunca demasiado rápido: el volumen se lee con lentitud.
**CLASIFICACIÓN. (a) SE PUEDE HOY.** N copias en 3D separadas 0,5–1 px en Z, todas emparentadas a la delantera, con las traseras en un color más oscuro. Con nuestra cámara con perspectiva real, funciona. **Coste alto**: 20 copias × 8 letras = 160 capas. Reservar para una palabra sola y grande.
**DÓNDE SE VE.** Retro-3D, títulos deportivos, la estética "chunky" de los 2020s.

---

### 23. TRAZO ESCRITO A MANO — *write-on / handwriting*
**QUÉ ES.** La letra se dibuja como si una pluma la estuviera escribiendo, siguiendo el trazo real del glifo.
**EN AE.** Contornos del texto → capa de forma → **Trim Paths**, o un pincel con Write-On.
**CLASIFICACIÓN. (c) NO VALE LA PENA TODAVÍA.** Nuestras capas de forma se **rasterizan a PNG con el contenido congelado**: un trim path es exactamente "el contenido cambia cada cuadro". La única vía sería rasterizar un PNG por cuadro (60 PNG por palabra), lo cual técnicamente funciona y arquitectónicamente es una secuencia de imágenes disfrazada de animación. Y el equivalente con tapas no existe, porque el trazo de una letra no es un rectángulo.
*Si algún día se quiere de verdad*, el pedido correcto no es "soportar trim paths" sino **"soportar trazado SVG con dashoffset animado por capa"**, que el motor web hace nativo y AE puede espejar con Trim Paths. Es un frente propio, no un agregado.

---

### 24. TEXTO QUE RECORTA UNA IMAGEN — *text as matte / knockout type*
**QUÉ ES.** El video o la imagen se ve **dentro** de las letras.
**EN AE.** Mate de pista alfa: el texto arriba como mate, la imagen debajo.
**CLASIFICACIÓN. (c) NO VALE LA PENA TODAVÍA.** Es literalmente "matas de pista", que está en la lista de lo no soportado, y no hay ningún truco de apilado que lo emule: la tapa oculta con un color plano, no revela una capa de más abajo con la forma de otra.
*Si se quiere*, el pedido es acotado y probablemente barato en three.js: **mate de alfa por capa, declarado en el comentario** ("mi alfa la da la capa N"), igual que el resplandor. Lo dejo en (c) porque abre la puerta a todo el sistema de mates y eso es una decisión de arquitectura, no un gesto.
**DÓNDE SE VE.** Aperturas de documental, portadas, todo el trabajo de estudios tipo Buck.

---

## 4. HONESTIDAD SOBRE LOS matchNames

Esto importa porque, como decís, un matchName inventado no falla ruidosamente.

**CONFIRMADOS** (aparecen textualmente en la referencia oficial de scripting o en código de terceros verificable):
`ADBE Text Properties`, `ADBE Text Document`, `ADBE Text Path Options`, `ADBE Text More Options`, `ADBE Text Animators`, `ADBE Text Animator`, `ADBE Text Animator Properties`, `ADBE Text Selectors`, `ADBE Text Selector`, `ADBE Text Percent Start` / `End` / `Offset`, `ADBE Text Index Start` / `End` / `Offset`, `ADBE Text Anchor Point 3D`, `ADBE Text Position 3D`, `ADBE Text Scale 3D`, `ADBE Text Rotation`, `ADBE Text Opacity`, `ADBE Text Skew`, `ADBE Text Skew Axis`, `ADBE Text Fill Color`, `ADBE Text Stroke Color`, `ADBE Text Stroke Width`, `ADBE Text Tracking Amount`, `ADBE Text Line Spacing`, `ADBE Text Blur`, `ADBE Text Reverse Path`, `ADBE Text Perpendicular To Path`, `ADBE Text First Margin`, `ADBE Text Last Margin`.

**PROBABLES, NO CONFIRMADOS DEL TODO:** `ADBE Text Wiggly Selector` (aparece en varias fuentes, no en la tabla oficial); `ADBE Text Range Type2` (= "Basado en", según el mapeo de DuAEF).

**NO CONFIRMADOS — NO LOS ESCRIBAS DE MEMORIA.** Los tengo en la cabeza con esta forma, y esa forma es exactamente el tipo de dato que suena bien y mata un script: `ADBE Text Range Advanced`, `ADBE Text Range Units`, `ADBE Text Selector Mode`, `ADBE Text Selector Max Amount`, `ADBE Text Range Shape`, `ADBE Text Selector Smoothness`, `ADBE Text Levels Max Ease` / `Min Ease`, `ADBE Text Randomize Order`, `ADBE Text Random Seed`, `ADBE Text Character Offset`, `ADBE Text Character Value`, `ADBE Text Character Change Type`, `ADBE Text Character Range`, `ADBE Text Tracking Type`, `ADBE Text Line Anchor`, `ADBE Text Anchor Point Option` (agrupación de ancla), `ADBE Text Group Alignment`, `ADBE Text Render Order`, `ADBE Text Inter-Char Blending`, los hijos del ondulado (`ADBE Text Temporal Freq`, `ADBE Text Wiggly Max Amount` / `Min Amount`, `ADBE Text Character Correlation`, `ADBE Text Wiggly Lock Dim`, `ADBE Text Wiggly Random Seed`) y el selector de expresión entero.

**Y no hace falta adivinar ninguno, porque tenemos canal vivo a AE.** Una sola llamada por `tools/ae/llamar.mjs` con una capa de texto que tenga a mano un animador con todas las propiedades agregadas, un selector de rango con Avanzado abierto y un ondulado, y esto los escupe todos con su ruta:

```jsx
function volcar(g, ruta) {
  var s = "";
  for (var i = 1; i <= g.numProperties; i++) {
    var p = g.property(i);
    s += ruta + " > " + p.name + "  ==  " + p.matchName + "\n";
    if (p.numProperties) s += volcar(p, ruta + "/" + p.matchName);
  }
  return s;
}
volcar(app.project.activeItem.selectedLayers[0].property("ADBE Text Properties"), "");
```

Un minuto de AE contra media hora de arqueología en foros. Yo lo correría antes de escribir una línea del autor de texto.

---

## 5. RESUMEN EJECUTIVO PARA PRIORIZAR

**Se puede hoy, sin tocar el exportador (18 de 24):** 1, 2, 3, 4, 5, 7, 8, 9, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22. Todo eso sale de **una capa por carácter/palabra/línea posicionada por medición de substrings acumulados**, más tapas. Es una sola pieza de infraestructura que desbloquea el 75% del catálogo.

**Vale la pena agregar, por orden de retorno:**
1. **Texto de origen con claves HOLD** (`[{cuadro, cadena}]`). Chico. Desbloquea scramble (#10) y contadores (#11) enteros.
2. **Desenfoque por capa declarado en el comentario**, con Gaussian Blur real en AE. Mismo patrón que el resplandor. Desbloquea #6, que hoy solo se puede fingir.
3. **Mate de alfa por capa declarado en el comentario.** Más grande y con implicancias de arquitectura; desbloquea #24 y una familia entera.

**Descartado por ahora:** #23 (write-on) — el pedido correcto sería trazado SVG con dashoffset, no trim paths, y es un frente aparte.

**Y el diagnóstico de ritmo, que no cuesta una línea de exportador:** falta una **grilla de beats** en el guion (#13), falta **retardo de escalonado** en todos los revelados (#1: 1,5 cuadros por carácter, 3 por palabra), y falta **flotación de reposo** (#21). Sospecho que esas tres solas cambian más la percepción de "está muerto" que cualquier gesto nuevo.

---

**Fuentes:**
[Text Layer Match Names — After Effects Scripting Guide](https://ae-scripting.docsforadobe.dev/matchnames/layer/textlayer/) · [Animating text in After Effects — Adobe](https://helpx.adobe.com/after-effects/using/animating-text.html) · [The Text Selector Expression — Creative COW](https://creativecow.net/the-text-selector-expression-is-arguably-the-most-elusive-adobe-after-effects-feature-and-yet-its-its-most-powerful-text-feature/) · [ae-text-expression-selector — GitHub](https://github.com/simonipiponi/ae-text-expression-selector) · [Deeper Modes of Expression, Part 12: Expressive Text — Chris & Trish Meyer, ProVideo Coalition](https://www.provideocoalition.com/deeper_modes_of_expression_part12_text/) · [Animating Type with Text Animators — School of Motion](https://schoolofmotion.com/blog/text-animators-after-effects) · [Kinetic Typography in After Effects Part 1 — School of Motion](https://schoolofmotion.com/blog/kinetic-typography-after-effects-part-1) · [Wiggly text with the Wiggly Selector — Motion Design School](https://motiondesign.school/blog/wiggly-text-with-wiggly-selector/) · [Kinetic Typography Techniques — Angie Taylor](https://angietaylor.co.uk/kinetic-typography-techniques-for-after-effects/) · [Adding an animator via ExtendScript — Adobe Community](https://community.adobe.com/questions-529/how-to-add-text-animator-to-text-layer-in-script-29401) · [Add Range Selector by Script — Adobe Community](https://community.adobe.com/questions-529/add-range-selector-in-text-by-script-59127) · [TextExploder V3 — aescripts](https://aescripts.com/textexploder/) · [Split Text — Jake In Motion](https://www.jakeinmotion.com/split-text) · [Number Counter with Separators — Plainly](https://www.plainlyvideos.com/after-effects-expressions-library/number-counter) · [Animated Number Counter With Commas — aeexpressions](https://aeexpressions.com/expressions/math/animated-number-counter-with-commas) · [Wiggly Selector project file — ECAbrams](https://ecabrams.gumroad.com/l/hFel) · [Character Offset Text Scramble — Mike Murphy](https://www.youtube.com/watch?v=sx9G0hjSmMY) · [Controlling stagger/overlap with a text animator — Creative COW](https://creativecow.net/forums/thread/controlling-staggeroverlap-when-animating-text-usi/) · [5 Text Animation Secrets — Demotion](https://trydemotion.com/blog/text-animation-secrets)