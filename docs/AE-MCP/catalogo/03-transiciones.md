# CATÁLOGO DE GESTOS — FRENTE: FORMAS

---

## 0. ANTES DEL CATÁLOGO: cuatro cosas que cambian todas las clasificaciones

**(0.1) La TAPA no es un rectángulo.** Es *cualquier PNG rasterizado relleno del color de fondo*. Un disco, una dona, una cuña, una media luna. Esto es lo que decide la mitad del catálogo: un anillo de progreso **sí se puede hoy** con dos medias-lunas-tapa girando. Tres límites duros que hay que escribir en la pared:

- Exige fondo **plano y conocido**. Sobre imagen o degradado la tapa no existe.
- La tapa oculta **todo lo que está debajo**, no sólo el objetivo. Regla: el objetivo va al fondo del apilado local, las tapas encima, y **todo el resto del contenido por encima de las tapas**.
- **Riesgo real con el resplandor:** si el bloom del motor es selectivo por capa y se compone después del apilado, una capa con resplandor puede *sangrar por encima de su tapa*. Hay que verificarlo antes de usar tapas sobre capas con resplandor. No lo di por sentado.

**(0.2) La TIRA DE ESTADOS.** Todo lo que rasterizamos congela el *contenido*, no el tiempo. Pero el tiempo se puede rebanar: rasterizar K estados de la misma forma y encadenarlos. Dos modos, muy distintos:
- **Corte duro** (puntos de entrada/salida, 2–3 cuadros por estado): es exactamente cómo el oficio hace el *boil* dibujado a mano. Fidelidad perfecta, se ve intencional.
- **Disolvencia por opacidad** (dos estados solapados): sirve sólo si la geometría cambia **poco**. Si cambia mucho da doble exposición, no morphing. No lo vendas como morph.

**(0.3) Los repetidores se pueden expandir EN EL AUTOR.** El repetidor es una construcción de armado, no de reproducción. Si el script que autora en AE emite N capas (o N grupos) en vez de un repetidor, el gesto entra hoy sin tocar el exportador. El mismo PNG se reutiliza en las N capas: cuesta bytes una sola vez. **El límite es el conteo de capas, no la técnica.**

**(0.4) LAS SEIS ADICIONES POSIBLES AL EXPORTADOR, ordenadas por desbloqueo/costo.** Las cito por sigla en cada ficha.

| | qué es | costo | qué desbloquea |
|---|---|---|---|
| **E0** | expandir repetidores en el autor (convención de scripting, **cero** cambios al exportador) | nulo | grillas, ráfagas radiales, ecualizadores, partículas |
| **E1** | **rasterizar por GRUPO en vez de por CAPA**, y emitir el árbol de transformaciones de grupo (`ADBE Vector Transform Group`) como nodos anidados | bajo — reusa **entero** el modelo de transformación + emparentado que ya existe; lo único nuevo es *skew*, que se puede omitir | escalonados internos, partes de un ícono que se mueven solas, repetidores nativos |
| **E2** | **recorte rectangular por capa** (4 números animables, en espacio de capa) | bajo | reemplaza ~80% de las tapas **y funciona sobre imagen y degradado** |
| **E3** | **recorte polar / cuña** (ángulo inicio, ángulo fin) | bajo | anillo de progreso verdadero sobre cualquier fondo |
| **E4** | **secuencia de PNG por capa** (sprite: rasterizar la capa cuadro a cuadro dentro de su rango) | medio — **bytes** | fuerza bruta: cubre *toda* la familia de deformadores de trazado, morphing, degradados animados, cónico, taper. Feo pero universal |
| **E5** | **trazado + trim como vectores** (puntos + start/end/offset, dibujado por el motor) | medio-alto | la familia trim entera, exacta, independiente de resolución, a bytes ridículos |

Mi recomendación de orden si hubiera que elegir: **E0 → E1 → E2/E3 → E5 → E4**. E1 es la de mejor relación desbloqueo/costo por lejos, porque no inventa un modelo de animación nuevo: usa el que ya está medido a 0,015 px.

---

## 1. NOMENCLATURA DE SCRIPTING — lo confirmado y lo que no

Tabla verificada contra la **AE Scripting Guide** (docsforadobe, página de Shape Layer Match Names). Copiada verbatim, con guion simple `-`, no rayas. **Ojo: los foros renderizan `-` como `–` y eso mata scripts.**

```
ADBE Root Vectors Group     ← contenido de la CAPA
ADBE Vector Group           ← un grupo
ADBE Vectors Group          ← el CONTENIDO de ese grupo (plural: trampa clásica)
ADBE Vector Transform Group ← transformación del grupo
  ADBE Vector Anchor / Position / Scale / Rotation / Skew / Skew Axis / Group Opacity

ADBE Vector Shape - Rect    → ADBE Vector Rect Size / Position / Roundness
ADBE Vector Shape - Ellipse → ADBE Vector Ellipse Size / Position
ADBE Vector Shape - Star    → ADBE Vector Star Type / Points / Position / Rotation
                              ADBE Vector Star Inner Radius / Outer Radius
                              ADBE Vector Star Inner Roundess / Outer Roundess   ← SÍ, "Roundess", falta la n. Es la grafía de Adobe.
ADBE Vector Shape - Group   → ADBE Vector Shape   (el trazado en sí)

ADBE Vector Graphic - Fill    → ADBE Vector Fill Rule / Fill Color / Fill Opacity
ADBE Vector Graphic - Stroke  → ADBE Vector Stroke Color / Opacity / Width
                                ADBE Vector Stroke Line Cap / Line Join / Miter Limit
ADBE Vector Stroke Dashes     → ADBE Vector Stroke Dash 1 / Gap 1 / Dash 2 / Gap 2 / Dash 3 / Gap 3
                                ADBE Vector Stroke Offset
ADBE Vector Stroke Taper      → ADBE Vector Taper Start Width / End Width / Start Length / End Length
                                ADBE Vector Taper Start Ease / End Ease / Length Units
ADBE Vector Stroke Wave       → ADBE Vector Taper Wave Amount / Wavelength / Wave Phase / Wave Units
ADBE Vector Graphic - G-Fill / G-Stroke → ADBE Vector Grad Type / Start Pt / End Pt
                                          ADBE Vector Grad HiLite Length / HiLite Angle / Grad Colors

ADBE Vector Filter - Trim     → ADBE Vector Trim Start / End / Offset / Type
ADBE Vector Filter - Repeater → ADBE Vector Repeater Copies / Offset / Order / Transform
ADBE Vector Filter - Roughen  → ← ESTE ES "WIGGLE PATHS" EN LA INTERFAZ. El nombre no coincide.
                                ADBE Vector Roughen Size / Detail / Points
                                ADBE Vector Temporal Freq / Correlation / Temporal Phase
                                ADBE Vector Spatial Phase / Random Seed
ADBE Vector Filter - Wiggler  → ← ESTE ES "WIGGLE TRANSFORM". Tampoco coincide.
                                ADBE Vector Xform Temporal Freq / ADBE Vector Wiggler Transform
ADBE Vector Filter - Zigzag   → ADBE Vector Zigzag Size / Detail / Points
ADBE Vector Filter - PB       → ADBE Vector PuckerBloat Amount        ("Pucker & Bloat")
ADBE Vector Filter - RC       → ADBE Vector RoundCorner Radius        ("Round Corners")
ADBE Vector Filter - Twist    → ADBE Vector Twist Angle / Twist Center
ADBE Vector Filter - Merge    → ADBE Vector Merge Type
ADBE Vector Filter - Offset   → ADBE Vector Offset Amount / Line Join / Miter Limit / Copies / Copy Offset
```

**NO CONFIRMADO — no lo uses sin probarlo contra AE:**
- Los **hijos** de `ADBE Vector Repeater Transform`. Un hilo de Creative COW usa `ADBE Vector Repeater Position` y funciona; el resto (`...Anchor`, `...Scale`, `...Rotation`, `...Start Opacity`, `...End Opacity`) los vi descritos en prosa, **nunca citados verbatim**. La tabla oficial no los enumera.
- Los **valores enumerados**: `ADBE Vector Trim Type` (creo 1=Simultáneamente, 2=Individualmente), `ADBE Vector Repeater Order` (1=Debajo, 2=Encima), `ADBE Vector Star Type` (1=estrella, 2=polígono), `ADBE Vector Merge Type`. **Todos sin confirmar.**
- El patrón de alta de guiones: `stroke.property("ADBE Vector Stroke Dashes").addProperty("ADBE Vector Stroke Dash 1")`. Así lo usa la comunidad; no lo verifiqué.
- `ADBE Vector Taper Wave Units` lo escribí por simetría con el resto. La tabla oficial lista `ADBE Vector Taper Wave Units` bajo Stroke Wave — pero el prefijo *Taper* en propiedades de *Wave* es raro y no lo pude cruzar con una segunda fuente.

---

## 2. CONVENCIONES DE TIEMPO Y CURVA (a 30 fps)

Base para todo el catálogo, para no repetirla en cada ficha:

- **Easy Ease de AE = influencia 33,33% con velocidad 0 en ambos lados** → `cubic-bezier(0.333, 0, 0.667, 1)`. La equivalencia general que ya deberían estar usando: para una clave con velocidad 0 e influencia *I*, el control de salida es `(I/100, 0)` y el de entrada `(1 - I/100, 1)`.
- **Entrada rápida ("snappy")**: salida con influencia ~10%, entrada con influencia ~80–90% → ≈ `cubic-bezier(0.16, 1, 0.3, 1)` (expo-out). Es *la* curva del oficio moderno.
- **Sobrepaso**: el catálogo lo pide como `cubic-bezier(0.34, 1.56, 0.64, 1)`, pero **ustedes ya lo hacen bien** con una clave intermedia real y dimensiones separadas. Seguí con clave real: sobrepaso al 105–112% en el cuadro ~60% del recorrido, asentado al 100%.
- **Escalonado (stagger)**: 2 cuadros = mecánico/apretado · 3–4 = orgánico · ≥5 se lee como *secuencia*, no como *grupo*. Es la diferencia entre "un grupo de barras aparece" y "aparecen barras de a una".
- **Duraciones típicas**: micro-pop 8–12 f · entrada estándar 12–18 f · trazo corto que se dibuja 15–25 f · logo/ícono que se dibuja 30–60 f · barrido de anillo completo 30–45 f · ciclo de persecución 45–60 f · *boil* 2–3 cuadros por estado (≈10–15 fps efectivos).

---

# EL CATÁLOGO

## FAMILIA TRIM PATHS (recortar trazados)

---

### 1. TRAZO QUE SE DIBUJA, recto — *line draw-on / write-on*
**QUÉ ES.** Una línea aparece dibujándose de una punta a la otra. El gesto más usado del oficio.
**CÓMO SE HACE EN AE.** `ADBE Vector Filter - Trim` sobre el grupo. `ADBE Vector Trim Start` fijo en 0%, `ADBE Vector Trim End` de 0% a 100%.
**TIEMPOS Y CURVAS.** 15–25 f. Clásico: Easy Ease en ambos extremos y después arrastrar la manija de salida a ~70% de influencia (arranca fuerte, se asienta).
**CLASIFICACIÓN. (a) SE PUEDE HOY.** Receta: rasterizar el trazo terminado, anclaje en el extremo de origen, `escala X` 0→100. **Sólo funciona si el trazo es recto**, porque escalar en X es escalar la línea entera, no recorrerla.
**LA FRONTERA.** Un trazo con quiebres o curvas: la escala lo deforma. Ahí pasa a **(b) → E2** (recorte rectangular viajero, si el trazado es monótono en un eje) o **E5** (si va y vuelve en X — ahí el largo de arco y el eje X ya no coinciden y *nada* de transformaciones lo salva).
**DONDE SE VE.** Subrayados, conectores de diagrama, líneas de tiempo. Omnipresente en explainers.

---

### 2. BARRA QUE SE LLENA — *progress bar / barra de progreso*
**QUÉ ES.** Una barra crece de izquierda a derecha hasta su valor.
**CÓMO SE HACE EN AE.** Trim End, o directamente `ADBE Vector Rect Size` con `ADBE Vector Rect Position` compensada. En un rectángulo el trim es lo elegante.
**TIEMPOS Y CURVAS.** 18–30 f. Expo-out `cubic-bezier(0.16, 1, 0.3, 1)` — el "llegar y frenar" es lo que la hace leer como dato y no como decoración.
**CLASIFICACIÓN. (a) SE PUEDE HOY.** `escala X` con anclaje en el borde izquierdo. Es el ejemplo canónico que ya identificaron.
**EL DETALLE QUE ARRUINA LA FIDELIDAD, y su receta.** Si la barra tiene **extremos redondeados** (`Line Cap: Round`), escalar en X **aplasta el casquete**, y una tapa deslizante deja el borde de avance **cuadrado** — mientras que AE con trim y cap redondo lo deja **redondo**. Receta que sí coincide: barra completa quieta + tapa que se desliza + **un PNG circular del diámetro del trazo, emparentado a la tapa**, viajando en el borde. Tres capas, coincidencia exacta.

---

### 3. ANILLO DE PROGRESO — *progress ring / radial loader*
**QUÉ ES.** Un arco que se completa alrededor de un círculo. El caso que ustedes marcaron como "no se puede".
**CÓMO SE HACE EN AE.** Elipse + `ADBE Vector Graphic - Stroke` sin relleno + Trim End 0→100. `ADBE Vector Star Rotation` no; se rota el grupo para que arranque a las 12.
**TIEMPOS Y CURVAS.** 30–45 f para la vuelta completa. Ease-out si es un dato; **lineal** si es un cargador que gira en bucle.
**CLASIFICACIÓN. (a) SE PUEDE HOY — con condición.** Y esto **contradice el supuesto del pedido.** Receta: anillo completo rasterizado al fondo del apilado; **dos medias-lunas-tapa** (PNG semicirculares del color de fondo) emparentadas a un nulo que gira 0→360°; se intercambia cuál está encima al 50%. Más el **casquete viajero** de la ficha 2: un punto emparentado al nulo giratorio, a radio R, que da el extremo redondo exacto.
**LA FRONTERA — y es la que importa.** Muere si el fondo detrás del anillo **no es plano**. Y muere si hay contenido cerca que las tapas también taparían. Sobre imagen o degradado: **(b) → E3** (recorte polar, dos números animables). E3 es barato y este gesto solo casi lo justifica.
**DONDE SE VE.** Anillos de actividad de Apple Watch, indicadores de carga de Material Design, todo panel de métricas.

---

### 4. SEGMENTO QUE PERSIGUE — *chase / worm / gusano*
**QUÉ ES.** Un pedazo corto de línea que corre por un contorno, en bucle. El cargador "serpiente".
**CÓMO SE HACE EN AE.** Trim con `Start` y `End` separados por un hueco fijo (ej. 15%) y **`ADBE Vector Trim Offset` animado 0→360** (el offset está en **grados**, no en %). Un solo valor animado, lineal, en bucle perfecto.
**TIEMPOS Y CURVAS.** 45–60 f por ciclo. **Lineal**, siempre — cualquier ease delata el bucle.
**CLASIFICACIÓN. (a) SE PUEDE HOY, sólo en círculo.** El segmento rasterizado como PNG de arco, emparentado a un nulo que gira linealmente. Perfecto, en bucle, y encima el arco **gira con la tangente solo**, gratis.
**LA FRONTERA.** Sobre un rectángulo redondeado, un camino arbitrario o un mapa: **(b) → E5**. No hay emparentado que recorra longitud de arco de un trazado cualquiera, y ustedes ya declararon que no soportan trayectorias espaciales curvas. Aproximar con claves de posición sobre tramos rectos funciona para polilíneas puras; en las esquinas curvas se rompe.
**DONDE SE VE.** Cargadores de UI, rutas de vuelo en publicidad de aerolíneas, diagramas de flujo de datos.

---

### 5. TRAZO QUE VIAJA — *travelling line / línea que dispara*
**QUÉ ES.** Un segmento que sale disparado desde un punto, se estira y se recoge en otro. Un latigazo.
**CÓMO SE HACE EN AE.** `Trim End` arranca primero, `Trim Start` arranca ~5–8 cuadros después. La brecha entre las dos curvas **es** el gesto: si van juntas no pasa nada.
**TIEMPOS Y CURVAS.** End: 12–15 f, expo-out. Start: retrasado 5–8 f, misma curva. En AE: salida influencia ~10%, entrada ~85%.
**CLASIFICACIÓN. (a) SE PUEDE HOY, si es recto.** Dos tapas, una en cada extremo, sobre la línea completa. La tapa trasera arranca 5–8 cuadros después que la delantera. Es el mismo gesto, hecho con apilado.
**LA FRONTERA.** Idéntica a la ficha 1: sólo recto, o monótono en un eje con E2.
**DONDE SE VE.** Transiciones de Kurzgesagt-style, barras de énfasis en títulos, "speed lines".

---

### 6. RECORTE INDIVIDUAL ESCALONADO — *Trim Multiple Shapes: Individually*
**QUÉ ES.** Varios trazados dentro de **un solo grupo** se dibujan uno tras otro, no todos juntos. Un ícono que se traza pieza por pieza.
**CÓMO SE HACE EN AE.** `ADBE Vector Trim Type` = *Individually* (valor **no confirmado**, creo 2). Con eso, un único par de claves Start/End se reparte por longitud entre los N trazados del grupo. Es una de las funciones con más retorno por clave de todo AE.
**TIEMPOS Y CURVAS.** 30–60 f total para 4–8 trazados. El escalonado lo reparte AE solo, proporcional a la longitud de cada trazado — **eso es lo que no se puede imitar a mano sin medir los largos**.
**CLASIFICACIÓN. (b) EXIGE E0 + E1.** Se resuelve **en el autor**: el script mide cada trazado, calcula su ventana temporal, y emite **un grupo rasterizado por trazado** con su propia tapa o escala. No hace falta E5. Pero sí hace falta E1 (rasterizado por grupo) para no explotar en capas sueltas, y el script tiene que saber calcular longitud de arco.
**DONDE SE VE.** Íconos que se dibujan solos, firmas manuscritas, sistemas de íconos animados tipo Lottie.

---

## FAMILIA TRAZO (stroke)

---

### 7. HORMIGAS QUE MARCHAN — *marching ants / dash offset*
**QUÉ ES.** Un contorno punteado cuyos guiones corren a lo largo del borde.
**CÓMO SE HACE EN AE.** `ADBE Vector Stroke Dashes` con `Dash 1` y `Gap 1`, y **`ADBE Vector Stroke Offset` animado**. Truco documentado del oficio: para puntos **perfectamente redondos**, `Dash = 0` + `Line Cap: Round` + `Gap = ancho de trazo × 2`. Con Dash 0 y cap redondo, AE dibuja círculos de diámetro igual al ancho del trazo.
**TIEMPOS Y CURVAS.** Lineal, siempre. Velocidad típica: un período (dash+gap) cada 8–15 cuadros.
**CLASIFICACIÓN. (a) SE PUEDE HOY — y en círculo sale EXACTO.** En un anillo: rasterizar el aro punteado completo y **rotarlo 360/N grados en bucle**. Coincidencia perfecta con AE, cero aproximación, un solo valor animado. En un borde recto: tira punteada larga trasladada exactamente un período (dash+gap) px, con tapas en las puntas.
**LA FRONTERA.** El **rectángulo** es el caso feo: cuatro tiras que se trasladan y **las esquinas no cierran**. Ahí: (b) → E2 (recorte rectangular por tira) resuelve el clipping pero no la continuidad de fase en la esquina; E5 lo resuelve entero.
**DONDE SE VE.** Selección de Photoshop (el origen del nombre), rutas de viaje, bordes de "recortar por aquí". Chris y Trish Meyer lo documentaron en *After Effects Hidden Gems Weekly: Dashed Lines* (ProVideo Coalition).

---

### 8. PULSO DE GROSOR — *stroke weight pulse*
**QUÉ ES.** El contorno engorda y adelgaza sin que la forma cambie de tamaño.
**CÓMO SE HACE EN AE.** `ADBE Vector Stroke Width` animado. Dos claves.
**TIEMPOS Y CURVAS.** 10–20 f de ida, igual de vuelta. Ease-in-out (`cubic-bezier(0.333, 0, 0.667, 1)`) si respira; expo-out si es un golpe.
**CLASIFICACIÓN. (b) — pero hay un (a) barato.** Escalar la capa **no sirve**: escala la geometría, o sea que un aro crece de radio en vez de engordar de trazo. El (a) barato: **dos rasterizaciones** (delgada y gruesa) cruzadas por opacidad. Funciona sorprendentemente bien porque la geometría subyacente es idéntica — no hay fantasma, sólo un borde que engorda. Para un barrido continuo de grosor: **(b) → E4**.
**DONDE SE VE.** Estados de foco en UI, énfasis rítmico al beat.

---

### 9. TRAZO CALIGRÁFICO / ONDULADO — *taper & wave*
**QUÉ ES.** Un trazo que nace fino, engorda al medio y muere fino (caligráfico), o que serpentea como cinta.
**CÓMO SE HACE EN AE.** `ADBE Vector Stroke Taper` (Start/End Width, Start/End Length, Start/End Ease) y `ADBE Vector Stroke Wave` (Amount, Wavelength, Phase). Función relativamente moderna de AE; no confirmé en qué versión entró.
**TIEMPOS Y CURVAS.** El taper suele ser **estático** (es estilo, no gesto) y se anima el **trim** encima. La fase de la onda sí se anima, lineal, 30–60 f por ciclo.
**CLASIFICACIÓN. (a) para el taper, (b) para la onda.** El taper estático **ya funciona hoy**: se rasteriza y listo, es aspecto congelado y el aspecto congelado es lo que sí sabemos exportar. Combinado con la ficha 1 o 3 da un trazo caligráfico que se dibuja. La **fase de onda animada** exige **E4**.
**DONDE SE VE.** Trazos manuscritos, cintas fluidas, ilustración animada tipo Giant Ant / Ordinary Folk.

---

## FAMILIA REPETIDOR

---

### 10. GRILLA QUE SE ARMA — *repeater grid build-in*
**QUÉ ES.** Una matriz de elementos que aparecen en cascada, en diagonal o en ola.
**CÓMO SE HACE EN AE.** `ADBE Vector Filter - Repeater` anidado dos veces (uno en X, otro en Y) — el patrón estándar para grillas 2D. `ADBE Vector Repeater Copies` + `ADBE Vector Repeater Transform` → `ADBE Vector Repeater Position`.
**TIEMPOS Y CURVAS.** 10–14 f por elemento, **escalonado 2 cuadros** (mecánico) o **3–4** (orgánico). Con sobrepaso: clave intermedia al 108%.
**CLASIFICACIÓN. (a) SE PUEDE HOY vía E0.** El autor expande el repetidor: emite N capas con el **mismo PNG**, en las posiciones que el repetidor habría calculado, con puntos de entrada escalonados. Cero cambios al exportador, un solo PNG en bytes. **Con E1 es más limpio todavía**: N grupos dentro de una capa.
**EL LÍMITE HONESTO.** Es conteo de capas. 100 celdas está bien; 2000 partículas no. Ahí: (c) por ahora.
**DONDE SE VE.** *Faking the C4D MoGraph Module in After Effects* de School of Motion es exactamente esta técnica. Estética Buck / Oddfellows.

---

### 11. RÁFAGA RADIAL — *radial burst / sunburst*
**QUÉ ES.** Rayos, chispas o pétalos que salen disparados desde un centro.
**CÓMO SE HACE EN AE.** Repetidor con `Repeater Transform → Rotation` = 360/copias, `Position` = 0, anclaje desplazado al centro.
**TIEMPOS Y CURVAS.** 8–12 f de expansión, expo-out fuerte. Escalonado 0 (todo junto = impacto) o 1 cuadro (= barrido). Suele terminar con desvanecido de opacidad en el último 40%.
**CLASIFICACIÓN. (a) SE PUEDE HOY vía E0.** N capas del mismo PNG, cada una rotada su ángulo, todas escalando desde el centro. Es literalmente lo que ya soportan: rotación + escala + emparentado.
**DONDE SE VE.** Impactos de cómic, celebraciones, transiciones de énfasis. Es pan de cada día en los packs de Video Copilot y Sonduck.

---

### 12. ECUALIZADOR — *equalizer bars / barras de audio*
**QUÉ ES.** Una fila de barras que suben y bajan a distinto ritmo. Vida pura, casi gratis.
**CÓMO SE HACE EN AE.** Repetidor + `ADBE Vector Filter - Wiggler` ("Wiggle Transform") sobre la escala. El Wiggler aleatoriza **cada copia por separado** — por eso va *después* del repetidor. Documentado en *Repeater and Wiggle Transform* de Motion Design School y en el tutorial de ecualizador dinámico de VDCI.
**TIEMPOS Y CURVAS.** 3–6 movimientos por segundo. Al beat: golpe en 2–3 f (expo-out durísimo) y caída en 8–12 f (ease-out suave). **Esa asimetría es lo que se lee como "tiene beat".**
**CLASIFICACIÓN. (a) SE PUEDE HOY, entera.** N barras, anclaje al borde inferior, `escala Y` con claves. No hace falta nada nuevo. **Este es el gesto que más rápido corrige el diagnóstico "el video está muerto"**: son transformaciones de capa puras, ya medidas a 0,015 px.
**LA ÚNICA PÉRDIDA.** El wiggle de AE es ruido continuo; nosotros tenemos que **hornear las claves** en el autor. Es una ventaja disfrazada: determinismo.
**DONDE SE VE.** Cualquier visualizador de podcast, resúmenes anuales tipo Spotify Wrapped, gráficos de barras en informes.

---

### 13. ESPIRAL / ARREGLO GIRATORIO — *repeater spiral*
**QUÉ ES.** Copias que giran y escalan a la vez formando una espiral que respira.
**CÓMO SE HACE EN AE.** Repetidor con Rotation **y** Scale (ej. 97%) en el Repeater Transform, y después se anima el grupo entero.
**TIEMPOS Y CURVAS.** Lineal en bucle, 90–180 f por vuelta. Lento — es fondo, no evento.
**CLASIFICACIÓN. (a) SE PUEDE HOY vía E0 + emparentado.** N capas, cada una con rotación y escala acumuladas, todas hijas de un nulo que gira. El emparentado hace toda la matemática. **Y encima queda mejor que en AE**: cada copia puede tener su propia curva.
**DONDE SE VE.** Fondos hipnóticos, transiciones de mandala. Estética Motion Design School.

---

### 14. CAMPO DE PARTÍCULAS — *particle field con repetidor*
**QUÉ ES.** Docenas de puntos flotando con deriva independiente.
**CÓMO SE HACE EN AE.** Repetidor de muchas copias + Wiggle Transform con `Correlation` baja para que se desincronicen.
**TIEMPOS Y CURVAS.** Deriva lentísima, 120–300 f por ciclo, curvas suaves casi senoidales (Easy Ease en cada extremo).
**CLASIFICACIÓN. (c) NO VALE LA PENA todavía — con matiz.** Técnicamente es (a) vía E0, pero 200 capas por un fondo es mal negocio: infla el documento y el motor sin que el espectador lo note. **El matiz:** 12–20 partículas grandes sí valen y sí se leen. La densidad alta que la gente asocia a "partículas" no se hace con repetidores ni en AE — se hace con plugins.

---

## FAMILIA DEFORMADORES DE TRAZADO

Aviso de familia: **todo esto deforma el contenido, que es exactamente lo que la rasterización congela.** Ninguna combinación de transformación, emparentado y tapa lo recupera. La respuesta es E4 (secuencia) o E5/vectores. Lo que cambia entre fichas es **cuánto duele perderlo**.

---

### 15. BORDE QUE HIERVE — *boil / wiggle paths / roughen*
**QUÉ ES.** El contorno tiembla como dibujo a mano cuadro a cuadro.
**CÓMO SE HACE EN AE.** `ADBE Vector Filter - Roughen` (¡la interfaz lo llama **Wiggle Paths**!). `Roughen Size` = amplitud, `Roughen Detail` = frecuencia espacial, `ADBE Vector Temporal Freq` = **cuántas veces por segundo cambia** — poner 8–12 para el look dibujado.
**TIEMPOS Y CURVAS.** Sin curvas: es ruido. La clave es `Temporal Freq` 8–12 Hz, o sea **un estado nuevo cada 2–3 cuadros a 30 fps**.
**CLASIFICACIÓN. (a) SE PUEDE HOY, con la TIRA DE ESTADOS por corte duro.** Y no es una aproximación: es **cómo se hace de verdad en animación 2D**. Rasterizar **3 estados** de la forma con distinta semilla (`ADBE Vector Random Seed`) y alternarlos con puntos de entrada/salida cada 2–3 cuadros, en bucle. Tres PNG, cero cambios al exportador, y el resultado es indistinguible porque el ojo no puede seguir 3 estados a 12 Hz.
**LA FRONTERA.** Si la **amplitud** se anima (de liso a rugoso), la tira de 3 no alcanza: **(b) → E4**.
**DONDE SE VE.** Todo lo que quiere parecer dibujado: Giant Ant, Ordinary Folk, la estética de Duolingo.

---

### 16. ZIG ZAG — *zig zag / dientes*
**QUÉ ES.** Un contorno liso se convierte en sierra o en estrella de muchas puntas.
**CÓMO SE HACE EN AE.** `ADBE Vector Filter - Zigzag`: `Zigzag Size` (amplitud), `Zigzag Points` (esquinas vs suaves), `Zigzag Detail` (cantidad).
**TIEMPOS Y CURVAS.** 12–20 f para el pasaje liso→dentado. Ease-out. En bucle, respiración de 40–60 f.
**CLASIFICACIÓN. (b) EXIGE E4.** La disolvencia por opacidad entre dos estados **no sirve acá**: un círculo y una estrella de 20 puntas superpuestos dan una mancha, no un morphing. Si el barrido es lento, 6–10 estados con corte duro pasan; si es rápido, hay que rasterizar la secuencia.
**LO QUE SÍ SE PUEDE HOY.** Un zigzag **estático** (rasterizado, congelado) rotando o pulsando por escala. Es el 80% del uso real: el zigzag suele ser textura, no evento.

---

### 17. GELATINA / GLOBO — *pucker & bloat*
**QUÉ ES.** La forma se infla en globo o se chupa hacia adentro en estrella cóncava.
**CÓMO SE HACE EN AE.** `ADBE Vector Filter - PB` → `ADBE Vector PuckerBloat Amount`. Positivo infla, negativo frunce. Sin tope: valores grandes dan caleidoscopio.
**TIEMPOS Y CURVAS.** 15–25 f. Ease-in-out con sobrepaso — el rebote es el gesto.
**CLASIFICACIÓN. (b) EXIGE E4.** Deformación por vértice pura.
**LO QUE SÍ SE PUEDE HOY, y es el 90% de lo que el espectador cree que está viendo.** El *squash & stretch* con **escala en dimensiones separadas**: 115/85 en el impacto, 92/108 en el rebote, 100/100 al asentar. No es pucker & bloat, pero da la **misma lectura de "es blando"** — y ustedes ya lo soportan con sobrepaso real. **Recomiendo esto antes que E4.**

---

### 18. ESQUINAS QUE SE REDONDEAN — *round corners*
**QUÉ ES.** Un cuadrado se ablanda hasta ser un círculo, o al revés.
**CÓMO SE HACE EN AE.** `ADBE Vector Filter - RC` → `ADBE Vector RoundCorner Radius`. Ojo: sólo actúa sobre vértices **en esquina**, no sobre los ya suaves.
**TIEMPOS Y CURVAS.** 10–18 f, ease-out.
**CLASIFICACIÓN. (c) NO VALE LA PENA todavía.** El cambio es de pocos píxeles en las esquinas. Rasterizado estático se ve bien y nadie extraña la transición. **Si de verdad hace falta**: 4–6 estados por disolvencia de opacidad funciona bien acá — el delta geométrico es chico, que es justo la condición donde la disolvencia no fantasmea. Costo casi nulo.

---

### 19. RETORCIDO — *twist / swirl*
**QUÉ ES.** La forma se enrosca sobre su centro, como un remolino.
**CÓMO SE HACE EN AE.** `ADBE Vector Filter - Twist` → `ADBE Vector Twist Angle` y `ADBE Vector Twist Center`.
**TIEMPOS Y CURVAS.** 20–40 f, ease-in-out. Suele ir a 180° o 360°.
**CLASIFICACIÓN. (c) NO VALE LA PENA.** Es un efecto de nicho, exige E4 entero, y **se confunde de lejos con una rotación de capa** — que es gratis. Hay gestos con mucho mejor retorno.

---

### 20. CONTORNO QUE ENGORDA — *offset paths*
**QUÉ ES.** La silueta crece o se encoge **hacia afuera del trazado**, no por escala. Dos formas concéntricas equidistantes.
**CÓMO SE HACE EN AE.** `ADBE Vector Filter - Offset` → `ADBE Vector Offset Amount`. `Offset Copies` + `Copy Offset` generan varias capas concéntricas de una sola vez.
**TIEMPOS Y CURVAS.** 12–20 f. Con `Copies` y escalonado, ondas concéntricas.
**CLASIFICACIÓN. (b) EXIGE E4 para el barrido — pero hay un (a) fuerte.** La diferencia entre *offset* y *escala* sólo se nota en formas **no convexas** o de proporciones muy desiguales. En un círculo, un cuadrado o un ícono compacto, **escalar la capa es visualmente idéntico** y es gratis. Receta hoy: rasterizar el contorno y escalar desde el centro.
**DONDE SE VE.** Halos concéntricos, "outline pop" de énfasis. Adobe lo documenta en *Use Offset Paths shape effect to alter shapes*.

---

### 21. MORPHING DE TRAZADO — *path morph / shape morph*
**QUÉ ES.** Un ícono se convierte en otro. El gesto más pedido y el peor entendido.
**CÓMO SE HACE EN AE.** Claves sobre `ADBE Vector Shape` (dentro de `ADBE Vector Shape - Group`). **Regla dura, documentada por Adobe:** AE numera los vértices desde el más alto de la primera clave y **interpola vértice N con vértice N**. Los dos trazados necesitan **la misma cantidad de vértices** y **el mismo primer vértice**, o el morph se retuerce. La receta del oficio: agregar vértices a 0°, 45°, 90°... hasta igualar, y fijar el primer vértice arriba al centro en ambos.
**TIEMPOS Y CURVAS.** 12–20 f. Ease-in-out. Más largo que eso y se ve la interpolación fea del medio.
**CLASIFICACIÓN. (b) EXIGE E4 — y acá E4 es la respuesta CORRECTA, no un parche.** Un morph dura 12–20 cuadros. Rasterizarlos todos son 20 PNG de un ícono chico: kilobytes. **No hace falta E5 para esto.** Y encima E4 le gana a nuestro propio motor vectorial hipotético en fidelidad, porque congela exactamente lo que AE calculó, incluidos los retorcimientos.
**DONDE SE VE.** Sistemas de íconos animados (menú↔cerrar, play↔pausa), transiciones de logo.

---

### 22. FUSIÓN DE BURBUJAS — *merge paths / metaball*
**QUÉ ES.** Dos círculos se acercan y se funden en una sola gota.
**CÓMO SE HACE EN AE.** `ADBE Vector Filter - Merge` en modo *Unite*, con los dos círculos en el mismo grupo, animando sus posiciones.
**TIEMPOS Y CURVAS.** 15–25 f de aproximación, ease-in-out.
**CLASIFICACIÓN. (c) NO VALE LA PENA — y una corrección honesta.** Dos círculos rasterizados que se solapan **ya se ven como una gota** hoy, si son del mismo color plano: la unión visual sale gratis del solapamiento, sin ningún merge. Lo único que Merge/Unite aporta de más es la **unión cóncava dura** en la junta. Y ojo: **el metaball con filete suave de verdad no se hace con Merge Paths** — se hace con Fast Blur + Levels, o sea con **efectos**, que están explícitamente fuera de nuestra cadena. No persigas este.

---

### 23. DESTELLO / BARRIDO DE DEGRADADO — *gradient sweep / shine*
**QUÉ ES.** Una banda de luz cruza un objeto. El "brillo" de botón, de logo metálico, de tarjeta.
**CÓMO SE HACE EN AE.** `ADBE Vector Graphic - G-Fill` con `ADBE Vector Grad Start Pt` y `ADBE Vector Grad End Pt` animados. O un degradado quieto y el objeto que se mueve por debajo.
**TIEMPOS Y CURVAS.** 15–25 f de cruce. **Lineal o ease-out muy suave** — un ease fuerte lo hace ver pegajoso.
**CLASIFICACIÓN. (a) SE PUEDE HOY, con condición fuerte.** La banda de luz como PNG diagonal aparte, trasladándose, con **tapas a los lados** para que no se salga del objeto. Funciona si el objeto es **rectangular** y el fondo **plano**. Y encima ustedes tienen **resplandor declarado por capa**: el destello puede ser opacidad + bloom, sin degradado ninguno.
**LA FRONTERA.** Objeto de silueta arbitraria, o fondo con imagen: **(b) → E2**. Este gesto solo casi justifica E2, porque el recorte rectangular en espacio de capa lo resuelve con cuatro números.

---

### 24. ONDAS CONCÉNTRICAS — *ripple / pulse rings*
**QUÉ ES.** Aros que nacen de un punto, se expanden y se desvanecen. Vida ambiental.
**CÓMO SE HACE EN AE.** Aro con trazo, escala 0→300%, opacidad 100→0, duplicado 3 veces con desfase temporal.
**TIEMPOS Y CURVAS.** 20–35 f por aro. Escala con **ease-out** (`cubic-bezier(0.16, 1, 0.3, 1)`), opacidad **lineal a 0** empezando al 40% del recorrido. Escalonado entre aros: 8–12 cuadros.
**CLASIFICACIÓN. (a) SE PUEDE HOY, entera y exacta.** Escala + opacidad + puntos de entrada escalonados. Tres capas del mismo PNG. Cero adiciones.
**EL DETALLE.** Escalar el aro **también engorda su trazo** — AE hace lo mismo si se escala la capa, así que la coincidencia es exacta. Si se quiere el trazo de grosor constante, ahí sí hace falta la ficha 8.
**DONDE SE VE.** Indicadores de escucha (Siri, Google Assistant), pings de mapa, latidos.

---

### 25. REVELADO POR FORMA — *shape mask reveal / iris*
**QUÉ ES.** El contenido aparece desde adentro de una forma que crece: un círculo que se abre, un diafragma, una barra que barre en diagonal.
**CÓMO SE HACE EN AE.** Máscara sobre la capa, o una capa de forma como matte de pista. **Las dos están fuera de nuestra cadena.**
**TIEMPOS Y CURVAS.** 15–25 f. Ease-out fuerte. En transiciones de escena: 10–14 f y lineal-ish.
**CLASIFICACIÓN. (a) SE PUEDE HOY — es literalmente para lo que existe la tapa.** Y con la observación 0.1 alcanza para más de lo que parece:
- **Barrido recto o diagonal**: tapa rectangular que se traslada, rotada para la diagonal.
- **Diafragma que se abre (iris in)**: tapa con forma de **dona** (agujero al centro) que se **escala hacia arriba** — el agujero crece y el contenido aparece.
- **Diafragma que se cierra**: la misma dona escalando hacia abajo.
- **Revelado en cuña / reloj**: dos medias-lunas-tapa girando (ficha 3).
**LA FRONTERA, y es la de toda la sección.** **Fondo plano y conocido, siempre.** Sobre imagen o degradado no hay tapa que valga: **(b) → E2** para revelados rectos, **E3** para los polares. **Esta es la razón número uno para construir E2.**
**DONDE SE VE.** Todas las transiciones de todos los explainers del mundo.

---

# RESUMEN EJECUTIVO

**Entran HOY, sin tocar el exportador (14 de 25):** trazo recto que se dibuja · barra que se llena · **anillo de progreso** (contradice el supuesto del pedido) · segmento que persigue en círculo · trazo que viaja · **hormigas que marchan en círculo, exactas** · grilla que se arma · ráfaga radial · **ecualizador** · espiral · **borde que hierve** (tira de 3 estados) · **ondas concéntricas** · revelado por forma con tapa de dona/cuña · taper estático.

**La conclusión que más importa:** el diagnóstico "animé la cámara y nada más" **no era una limitación de la cadena**. Ecualizador, ondas concéntricas, grillas escalonadas, ráfagas radiales, anillos de progreso y hormigas marchando son **escala, rotación, opacidad, emparentado y apilado escalonados en el tiempo** — exactamente las seis propiedades ya medidas a 0,015 px. La coreografía que falta no espera a ninguna adición al exportador; espera a que el autor **escalone los tiempos**.

**Lo que de verdad exige trabajo nuevo, en orden de retorno:**
1. **E1 — rasterizar por grupo y emitir el árbol de transformaciones de grupo.** La mejor relación desbloqueo/costo de todas: no inventa modelo de animación, reusa el existente. Vuelve nativos los repetidores y el escalonado interno.
2. **E2 — recorte rectangular por capa.** Cuatro números. Libera todos los revelados de la dependencia de fondo plano, que es el techo real de la tapa.
3. **E3 — recorte polar.** Dos números. Anillo de progreso sobre cualquier fondo.
4. **E4 — secuencia de PNG por capa.** Fuerza bruta, cubre la familia entera de deformadores y el morphing. Para morphs de 12–20 cuadros es la respuesta **correcta**, no un parche.
5. **E5 — trazado + trim como vectores.** Sólo si aparece la necesidad de trim sobre trazados curvos arbitrarios (mapas, firmas, íconos complejos que se trazan solos).

**Lo que recomiendo NO perseguir:** twist, merge paths/metaball, campos densos de partículas, y la animación de round corners. Costo alto, lectura baja, y en dos de los cuatro casos hay un sustituto gratis que el espectador no distingue.

**Sobre honestidad de scripting:** la tabla de matchNames de la sección 1 es verbatim de la guía oficial, **incluida la errata de Adobe** `ADBE Vector Star Inner Roundess` (falta la n) y los tres nombres que **no coinciden con la interfaz**: Wiggle Paths = `Roughen`, Wiggle Transform = `Wiggler`, Pucker & Bloat = `PB`. Lo que marqué como **no confirmado** —los hijos de `Repeater Transform`, todos los valores enumerados, el patrón de alta de guiones— hay que probarlo contra AE antes de meterlo en un script, porque falla en silencio.

---

**Fuentes:**
- [Shape Layer Match Names — After Effects Scripting Guide](https://ae-scripting.docsforadobe.dev/matchnames/layer/shapelayer/)
- [Paint and path operations, Shape attributes for shape layers — Adobe](https://helpx.adobe.com/after-effects/using/shape-attributes-paint-operations-path.html)
- [Managing and animating shape paths and masks — Adobe](https://helpx.adobe.com/after-effects/using/animating-shape-paths-masks.html)
- [Use Offset Paths shape effect to alter shapes — Adobe](https://helpx.adobe.com/after-effects/using/use-offset-paths.html)
- [How to taper shape strokes — Adobe](https://helpx.adobe.com/after-effects/using/taper-shape-strokes.html)
- [Add Trim Paths to any selected shape layers with a Script — Creative COW](https://creativecow.net/forums/thread/add-trim-paths-to-any-selected-shape-layers-with-a-script/)
- [How can I add trim paths to a shape layer via scripting? — Adobe Community](https://community.adobe.com/t5/after-effects/how-can-i-add-a-trim-paths-to-a-shape-layer-via-scripting/td-p/7206146)
- [How to add effects to shape groups with extendscript? — Creative COW](https://creativecow.net/forums/thread/how-to-add-effects-to-shape-groups-with-extendscri/)
- [Faking the C4D MoGraph Module in After Effects — School of Motion](https://schoolofmotion.com/blog/faking-c4d-mograph-module-after-effects)
- [Repeater and Wiggle Transform — Motion Design School](https://motiondesign.school/blog/repeater-and-wiggle-transform/)
- [Keyframe Velocity in After Effects — Motion Design School](https://motiondesign.school/blog/keyframe-velocity/)
- [Creating Dynamic Equalizer Graphs Using Shape Layer Effects — VDCI](https://vdci.edu/learn/after-effects/dynamic-equalizer-animation)
- [After Effects Hidden Gems Weekly: Dashed Lines — ProVideo Coalition](https://www.provideocoalition.com/after-effects-hidden-gems-weekly-dashed-lines/)
- [Animated Dotted Line Offset Issue — Adobe Community](https://community.adobe.com/t5/after-effects-discussions/animated-dotted-line-offset-issue/m-p/13568119)
- [Guide to After Effects Shape Layer Add Effects Menu — Motion Array](https://motionarray.com/learn/software/animatedshapes/)
- [Morphing one shape into another — Adobe Community](https://community.adobe.com/t5/after-effects/morphing-one-shape-into-another-never-takes-the-simplest-route/m-p/8809620)
- [Discover and master the After Effects Trim Paths — Motion Island](https://blog.motionisland.com/after-effects-trim-paths/)