# La gramática del género — medida sobre ocho avisos, no sobre uno

Ocho referencias del mismo género (Apple, Figma, Google, Linear, NeuraFlow, Notion, Numtera y el de
Gemini que ya se había recreado), bajadas y medidas con la misma herramienta
(`tools/ae/medir-referencia.mjs`), más un inventario visual de ocho agentes que abrieron las hojas de
contacto y sacaron cuadros a resolución completa.

**Existe porque medir UNA referencia no distingue la regla del género de la manía de un aviso**: con una
sola muestra las dos hipótesis dan exactamente el mismo dato. Es la lección que el CLAUDE.md ya tenía
escrita sobre `retrato.py` —*"calibrar sobre una página no es calibrar; una receta que no varía no está
midiendo"*— un nivel más arriba.

**Todo en segundos.** Las cadencias van de 23,976 a 60 fps y comparar cuentas de cuadros entre ellas
inventaría diferencias del 150 % que no existen.

---

## LA CORRECCIÓN PRINCIPAL: el gesto grande de escala NO va en el titular

Esto reemplaza lo que decía `movimiento-medido.md`, que estaba sacado de una sola referencia.

| | entra mediana | entra p90 |
|---|---|---|
| apple · figma · linear · neuraflow · notion · numtera · google | **1,00 – 1,29** | 1,16 – 3,44 |
| gemini | 1,98 | 3,74 |

**La mediana es la ley: un rótulo entra entre 1,00× y 1,30× de su tamaño final.** Siete de ocho. Los
agentes lo verificaron rótulo por rótulo y ninguno encontró una excepción — el de Google lo escribió
así: *"entra p90 3,44 se lee como que usa gestos grandes de escala en los titulares. Ni uno. Todos
entran entre 1,0× y 1,3×."*

**El p90 alto no viene de la tipografía.** En los cinco avisos donde se dispara, los agentes rastrearon
de dónde salía y en los cinco salió de otro lado: el triángulo-cortina de Google, el teléfono de Notion
que retrocede, la placa de Numtera que se come la cámara, la palabra de Gemini atravesando la lente, la
salida de Apple. **Son transiciones y objetos de producto, no entradas de rótulo.**

Y con 8 a 15 rótulos por pieza, un p90 **es literalmente uno o dos rótulos**. El gesto grande no es el
estilo: es un evento que pasa una a tres veces en toda la pieza.

### Las tres reglas que salen de ahí

1. **ENTRADA: 1,00× a 1,30×.** Y la entrada típica ni siquiera es una escala — es **traslación corta**
   (Notion: una interlínea, ~11 % del alto, con desenfoque direccional los primeros 4-5 cuadros),
   **disolvencia a tamaño casi final** (Numtera, 4 cuadros), **entrada por foco** (Linear) o
   **contracción desde un bloque padre** (Gemini). La escala es el recurso *menos* usado de los cuatro.
2. **SALIDA: más libre que la entrada.** Mediana 1,04, pero el p90 de salida (2,41) supera al de entrada
   (1,98) y en dos casos lo triplica. **Se entra medido y se sale roto** — al que se va nadie tiene que
   leerlo. Y la salida tampoco es siempre escala: Apple se va por traslación diagonal fuera de cuadro.
3. **El gesto de 3× a 25× va en la transición, en la cámara o en un objeto de producto.** Nunca en la
   caja de tinta de un rótulo. Una a tres veces por pieza.

> **Lo que hice mal en la PIEZA-H:** apliqué el tratamiento dramático a los once titulares. Aunque los
> hubiera hecho suaves en vez de con saltos, once seguidos creciendo se leen como un tic. Tomé la
> excepción por norma porque la medí en un solo aviso — y encima en el más extremo del grupo.

---

## Lo que hacen todos, con la evidencia

- **La transición es siempre un objeto que ya estaba en escena. 0/8 usan cortinilla genérica.** El
  triángulo del icono (Google), cuatro discos (NeuraFlow), un sólido de color que escala en 4 cuadros
  (Notion), la palabra atravesando la lente (Apple, Gemini), la placa que se come la cámara (Numtera).
- **Nadie usa foto ni video a pantalla completa de fondo. 0/8.** Hay metraje real en dos piezas y en
  las dos está neutralizado: fuera de foco (Google) o iluminado para caer a negro en los bordes y
  siempre dentro del marco de un aparato (Apple). Cero planos de gente sonriendo usando el producto.
- **Tipeo letra por letra en 8/8.** Y **entra en este motor**: una capa de texto por carácter con
  opacidad escalonada más una barra cuya X salta al ancho acumulado. Cuatro de los ocho agentes lo
  resolvieron así solos.
- **La tipografía es frontal. 8/8.** Siete de ocho usan 3D o paralaje al menos una vez, pero el rótulo
  va plano. Numtera lo deja explícito: la placa rotada −3,7° en Z y el titular sin inclinarse. *(Las
  únicas rotaciones de texto del lote son letras de Apple sobre una tangente y un botón "SEND" de Figma
  puesto en vertical — un botón, no un titular.)*
- **Un solo acento cromático por cuadro. 7/8.** La excepción documentada es el magenta de NeuraFlow, que
  convive con el azul y es dirección de arte, no interfaz.
- **Un rótulo no dura más de ~2,5 s.** Las dos excepciones aparentes son un chiste (Figma) y una
  medición que agarró texto de interfaz (Linear).
- **La cadencia pisada ("a doses") es un recurso POR BLOQUE, no un ajuste de la pieza.** Notion corre
  0-10 % en su tercio tipográfico y 44-66 % en el de producto; Figma usa tres cadencias distintas según
  el acto (24 limpio · a doses · 1 de cada 6, que es 20 fps conformado a 24). Los otros seis corren
  limpio. **Se activa por escena.**

---

## Lo que vale la pena robar (barato y reproducible con transformaciones)

- **NeuraFlow — la marca es el HUECO.** Cuatro discos oscuros iguales entran desde las esquinas al
  centro; el espacio *entre* los cuatro círculos ES una estrella cóncava. Nunca se dibuja la estrella:
  se dibuja lo que la rodea. Cuatro traslaciones y una escala. La mejor relación costo/efecto del lote.
- **Notion — carrusel vertical de píldoras como objeto de la frase.** "Una herramienta para" fijo a la
  izquierda; a la derecha, con el borde **izquierdo clavado**, una columna de píldoras de ancho variable
  que sube 170 px por paso. Ciclo medido: **~7 cuadros de viaje + 3 a 5 de quietud absoluta = 12 cuadros
  (0,5 s) por píldora.** Es la mejor máquina de "listar capacidades" de las ocho.
- **Gemini — relevo por sílabas con rampa en orden de lectura.** Ocho a diez capas de dos o tres
  caracteres, cada una con relleno **plano** tomado de una rampa muestreada *en orden de lectura*, cada
  una con su arranque propio, aterrizando pegadas. La costura se ve a propósito.
- **Gemini — la línea siguiente nace dentro del hueco de una "o".** Anclaje en el centro de la
  contraforma, escala hasta >10× en 12 cuadros con el hueco clavado en el centro del cuadro, y adentro
  la línea siguiente al 8 %.
- **Numtera — corchetes que abrazan el titular y se abren.** Dos capas de texto `[` y `]` de tres veces
  la altura del titular, colocadas mucho más afuera que el ancho del texto, con la X animada hacia
  afuera. Literal, dos capas.
- **Linear — dos gramáticas de tipeo en la misma pieza.** La humana: ~11,5 car/s, cursor sólido que **no
  parpadea** mientras se escribe. La de máquina: 30-34 car/s, sin cursor, con los últimos 2-4 caracteres
  teñidos y enfriándose en ~0,25 s — un borde caliente corriendo adelante.
- **Apple — el acento tiñe 2 a 4 glifos, nunca la palabra.** "rm" de Perform, "ri" de Write. El color
  marca **dónde** está pasando la cosa, no que la frase sea de color.
- **Apple — un panel de interfaz encajado como si fuera una palabra**, apoyado en la misma línea de base
  y con las palabras vecinas separadas para dejarle el hueco.

---

## Lo que NO sobrevivió al crítico — y por qué importa saberlo

Un crítico adversario revisó la síntesis contra los inventarios crudos. Esto se cayó, y queda anotado
para que nadie lo reescriba:

- **"Cursor como personaje, 8/8"** → son **4/8**. Los otros cuatro son un **cursor de texto**, que es
  otro objeto. La regla juntaba dos cosas distintas para llegar a ocho.
- **"Cero rebote ni overshoot, 8/8"** → **4/8 declarado y 4/8 de silencio**. *Ausencia de reporte no es
  reporte de ausencia.* Sigue siendo una buena apuesta —ningún agente vio un rebote— pero no es un 8/8.
- **"Un sujeto nuevo cada 3 a 4 s"** → construido sobre una columna que la propia síntesis había
  declarado inválida tres párrafos antes, mezclando conteo de sujetos con tasa de cortes.
- **"El tipeo se agrupa en 11,5 y 20-34 car/s"** → los tres números salen de **dos piezas**. Con n=2 no
  hay agrupamiento que declarar.
- **"El rótulo está en movimiento entre el 55 % y el 80 % de su vida"** → una regla con dos decimales
  sobre una columna que cuatro de ocho agentes declararon que medía otra cosa.

---

## Tres defectos de mi propia herramienta, encontrados por el barrido

1. **El detector de cortes tenía un piso fijo de 0,10 y quedaba ciego en las piezas oscuras.** Linear
   informó *"0 cortes en 55 s, plano mediano 54,85 s"* — con autoridad y todo. Sus ocho cortes reales
   tienen picos de 0,014 a 0,082, los ocho por debajo del piso: en una pieza 85 % negra un corte duro
   sólo mueve el 3-8 % de la luminancia. Corregido con umbral **local** (6× la mediana del vecindario) y
   exigiendo que el pico sea máximo local.
2. **Lo que la columna llamaba "escalonado" no era escalonado.** Medía **cadencia pisada** (cuadros
   repetidos); el escalonado (stagger) aparece en 7/8 y la columna daba 0 % en cinco. Dos fenómenos
   distintos compartiendo un nombre en mi herramienta, y de ahí salió una conclusión falsa.
3. **El detector de titulares agarra muebles de interfaz.** Cuatro de ocho agentes lo refutaron:
   `titular_dur` en Figma medía tarjetas, en Linear texto de UI, en NeuraFlow el logotipo de apertura.
   Las columnas `titular_dur` y `titular_quieto` **no son confiables**; `entra`/`sale` sí, porque son
   razones dentro de un mismo tramo y no dependen de que el tramo sea un titular.

Y una limitación que **no es un defecto sino el género**: la diferencia entre cuadros no puede separar
un corte duro de una transición veloz que llena el cuadro — porque en estas ocho piezas la transición
está hecha *a propósito* para leerse como un corte. Por eso la métrica ahora se llama **cambios
abruptos**, no cortes.

---

## M6 ESTÁ MAL CALIBRADA, Y LO REFUTAN LAS NUEVE REFERENCIAS

`ritmo.mjs` M6 exige **ningún hueco sin arranque de más de 20 cuadros** — 0,67 s. Medido sobre las nueve
referencias del corpus (las ocho originales más *SaaS Product Demo Video*, de Motion Swell, 21 s):

| referencia | duración | silencios | el más largo | cuadros repetidos |
|---|---|---|---|---|
| neuraflow | 20,0 s | 8 | **2,13 s** | 17 % |
| numtera | 95,3 s | 60 | 2,20 s | 27 % |
| gemini | 60,0 s | 35 | 2,40 s | 33 % |
| notion | 56,6 s | 54 | 2,96 s | 85 % |
| motion-swell | 21,0 s | 10 | 3,17 s | 42 % |
| google | 86,7 s | 49 | 3,34 s | 26 % |
| figma | 95,0 s | 36 | 3,83 s | 40 % |
| apple | 35,0 s | 16 | 4,96 s | 32 % |
| linear | 54,9 s | 16 | **8,18 s** | 85 % |

**Mediana del silencio más largo: 3,17 s. Mínimo: 2,13 s. Ninguna de las nueve baja de eso.** La
compuerta pide 0,67, así que **las nueve la reprobarían, por entre 3× y 12×**.

Y el otro número dice lo mismo desde otro lado: entre el **17 % y el 85 %** de los cuadros de una pieza
del género son **idénticos al anterior** (mediana 33 %). Un tercio del video está literalmente quieto.

> **La quietud no es un defecto del género: es parte de su gramática.** Un rótulo que entra y se queda
> 0,6 s quieto para poder leerse produce, por definición, medio segundo sin ningún arranque. Pedir un
> arranque cada 20 cuadros es pedir que nada se pueda leer.

**De dónde salía el número equivocado:** M6 se escribió contra la PIEZA-A y la PIEZA-B, que el usuario
describió como *"muertas, sin beat, muy lentas"*. El diagnóstico era correcto y la corrección se pasó de
largo: aquellas piezas no tenían **nada** pasando, y la respuesta fue exigir un arranque cada 20 cuadros
en vez de exigir que los tramos con energía la tuvieran de verdad.

**Lo que hay que medir en su lugar** — y esto todavía no está construido, así que es una propuesta con
su evidencia, no una compuerta:

- **la densidad de los tramos activos**, no la distancia entre arranques
- **el silencio más largo contra la banda 2,1–8,2 s**, reprobando por arriba de ~8 s y no por arriba de
  0,67
- y sobre todo **cuántas cosas hay en pantalla**, que es lo que ninguna compuerta mira y lo que hundió
  a la PIEZA-J y a la PIEZA-M

**Mientras tanto, y esto es lo operativo:** los huecos que informa M6 se contrastan contra la energía
real del tramo (`C:/ae-probe/mov.mjs` o equivalente) antes de tocar la pieza. En la PIEZA-M los tres
huecos que M6 marcó tenían entre el 50 % y el 86 % de la densidad del acto más cargado — o sea que
ninguno era un hueco, y perseguirlos costó media sesión.

---

## LA DENSIDAD DEL CUADRO, que es lo que separa una pieza rala de una del género

Medido abriendo cuadros a resolución completa de la referencia de Motion Swell:

- **El cuadro típico tiene 4 o más elementos**, no dos. En el plano de producto: tres o cuatro paneles
  de interfaz en perspectiva sobre un fondo de color a sangre.
- **Uno solo es legible; el resto es profundidad.** Los paneles de atrás están girados, recortados por
  el borde y fuera de foco: no se leen y no tienen que leerse. Ocupan el cuadro, que es su trabajo.
- **El fondo nunca es neutro.** O es un degradado saturado a sangre, o es una **capa de palabra repetida
  al ~4 % de contraste** que llena la pantalla sin competir con nada.

Ese último recurso es el más barato de todos y resuelve exactamente el reproche de la PIEZA-J
(*"está como muy vacío el video también, el fondo es demasiado simple"*): una sola capa de texto
repetido, casi del color del fondo, convierte un vacío teñido en una superficie.

---

## Los rangos, para escribir parámetros con banda en vez de números únicos

| parámetro | rango observado | centro |
|---|---|---|
| duración de la pieza | 20 – 95 s | tres racimos: 20-30 · 55-60 · 87-95 |
| cambios abruptos | 0,20 – 0,69 /s | ~0,40 |
| tramo entre cambios | 1,07 – 4,45 s | ~1,7 s |
| entrada de rótulo | **1,00 – 1,30×** | 1,08 |
| salida de rótulo | 1,00 – 1,64× (p90 hasta 6,3) | 1,04 |
| gesto grande de escala | 3× – 25× | 1 a 3 veces por pieza |
| cadencia pisada | 0 % o 44-66 % **según el bloque** | binaria, no continua |
