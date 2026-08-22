# CATÁLOGO DE GESTOS — FRENTE: APARECER, DESAPARECER Y TAPAR

Todo lo que sigue está pensado contra nuestra cadena real (transformaciones + emparentado + apilado + sólidos + PNG rasterizados + cámara 3D + obturador + curvas). El hallazgo central va primero porque cambia el resto:

**LA MATA ESTÁTICA ES GRATIS. LO QUE CUESTA ES LA MATA QUE CAMBIA DE FORMA.**
Nuestro exportador rasteriza capas de forma a PNG con alfa exacto. Eso significa que *cualquier forma de mata* —un círculo, un texto calado, una diagonal, un logo— puede viajar como **una tapa con agujero**: una placa opaca del color del fondo con la forma recortada en su alfa. Con eso, todo revelado cuya mata sea una **forma fija que se mueve, escala o rota** se resuelve HOY con transformaciones puras. Lo único que de verdad exige matas o máscaras es: (1) la mata que **cambia de forma** cuadro a cuadro, (2) el borde **suave o degradado**, y (3) el fondo que **no es liso** y no admite placa limpia.

De 24 gestos catalogados: **18 se pueden hoy**, **5 exigen agregar algo**, **1 no vale la pena**. Y de los 5 que exigen, **3 los compra una sola función** (ver "Lo que hay que agregar", al final).

---

## PARTE 0 — LOS DOS MODELOS QUE HAY QUE ENTENDER ANTES

### Matas de pista (track mattes)

Cuatro modos: **Alfa**, **Alfa invertida**, **Luma**, **Luma invertida**. La mata aporta la transparencia; la capa de abajo aporta el color. Luma usa la luminancia (blanco = opaco, negro = transparente), y por eso el patrón clásico es un sólido negro con una forma blanca encima, precompuesto.

**Qué cambió en AE 2023 (23.0)** — verificado en la documentación de Adobe y en el hilo de la beta:
- Antes, la mata era **obligatoriamente la capa inmediatamente superior**, y AE le apagaba el interruptor de video.
- Desde 23.0 hay un **desplegable de mata de pista** con selector de capa: la mata puede estar **en cualquier lugar del apilado**, puede **seguir siendo visible**, y **varias capas pueden compartir la misma mata**. Sigue habiendo **una sola mata por capa**.

**Scripting (confirmado):**
```javascript
capa.setTrackMatte(capaMata, TrackMatteType.ALPHA);   // ALPHA, ALPHA_INVERTED, LUMA, LUMA_INVERTED, NO_TRACK_MATTE
capa.removeTrackMatte();
capa.trackMatteLayer   // solo lectura
capa.trackMatteType    // sigue existiendo
```
**Trampa documentada por Adobe:** escribir `trackMatteType` solo, sin haber fijado capa de mata, **dispara el comportamiento viejo** (toma la capa de arriba). La propia guía dice que no se recomienda para scripts nuevos. Si algún día leemos matas del proyecto, hay que leer `trackMatteLayer`, no deducir "la de arriba".

**Primos que conviene conocer:** los modos de fusión **Stencil Alpha / Stencil Luma / Silhouette Alpha / Silhouette Luma** hacen lo mismo pero **contra TODAS las capas de abajo** (una mata global, no de a una); Silhouette es el Stencil invertido. Y el efecto **Set Matte** (`ADBE Set Matte3`, confirmado) toma el canal de otra capa como mata sin restricción de apilado — era la forma pre-2023 de reusar una mata.

### Máscaras

Viven **dentro** de la capa y en **espacio de capa**: si la capa se mueve, la máscara se mueve con ella. Esa es la diferencia operativa con la mata, que es una capa aparte con su propia transformación (por eso una "mata viajera" se anima sola sin arrastrar el contenido).

- **Modos:** Suma, Resta, Intersección, Aclarar, Oscurecer, Diferencia, Ninguno (`MaskMode.ADD / SUBTRACT / INTERSECT / LIGHTEN / DARKEN / DIFFERENCE / NONE`).
- **Interruptor Invertida**, por máscara.
- **Cuatro propiedades animables:** Trazado, Difuminado (x/y), Opacidad, **Expansión** (px; positiva engorda el trazado sin tocar los puntos — es lo que se usa para "crecer" una mata sin animar el trazado).
- **Herramienta Difuminado de máscara** (Mask Feather Tool): difuminado **variable a lo largo del trazado**, con puntos propios. No es una propiedad simple; es otro modelo de datos.

**MatchNames de máscara — lo que sé y lo que no.** `ADBE Mask Parade` (el grupo) y `ADBE Mask Atom` (una máscara) están **confirmados** en la guía; `ADBE Mask Shape` (el trazado) aparece **confirmado en uso** en scripts públicos. **NO pude confirmar** `ADBE Mask Feather`, `ADBE Mask Opacity` ni `ADBE Mask Offset` (expansión) — los cito como plausibles pero **no verificados**; en la práctica se accede por índice o por nombre visible. La propia guía advierte además que **no hay que referirse a un hijo por matchName cuando puede haber varios con el mismo** (varias máscaras son todas `ADBE Mask Atom`): se usa `propertyIndex`.

### MatchNames confirmados hoy (útiles para este frente)
`ADBE Linear Wipe` · `ADBE Radial Wipe` · `ADBE Venetian Blinds` · `ADBE Block Dissolve` · `ADBE Fill` · `ADBE Set Matte3` · `ADBE Box Blur2` (Desenfoque de cuadro rápido) · `ADBE Gaussian Blur 2` · `ADBE Vector Filter - Trim` con `ADBE Vector Trim Start` / `End` / `Offset` · `ADBE Transform Group`, `ADBE Anchor Point`, `ADBE Position` (+ `_0/_1/_2`), `ADBE Scale`, `ADBE Orientation`, `ADBE Rotate X/Y/Z`, `ADBE Opacity`.

**Aviso de tipografía que mata scripts:** medio internet escribe `"ADBE Vector Filter – Trim"` con **raya** porque el blog le aplicó autocorrección. El matchName real lleva **guión ASCII**. Un matchName mal copiado no falla ruidosamente: devuelve `null` y el script muere tres líneas después.
**No confirmados:** los subíndices de propiedad de `ADBE Linear Wipe` (se los suele escribir `ADBE Linear Wipe-0001`, no lo verifiqué — usar índice 1/2/3 o nombre visible), y los matchNames de animadores de texto.

---

## PARTE 1 — EL CATÁLOGO

### FAMILIA A — TAPAS (el apilado ES el efecto)

---

**1. BARRIDO DE BORDE — *edge wipe / linear wipe***
**QUÉ ES.** El contenido aparece desde un borde, como si una línea lo destapara.
**EN AE.** Tres formas: (a) máscara rectangular con Trazado animado; (b) efecto Linear Wipe (`ADBE Linear Wipe`: Transition Completion, Wipe Angle, Feather); (c) **un sólido tapa que se desliza fuera de cuadro**.
**TIEMPOS.** 14–18 cuadros. Curva fuerte de salida: `cubic-bezier(0.16, 1, 0.3, 1)` ≈ influencia de salida ~84%, entrada 0, velocidad 0 en ambos extremos.
**CLASIFICACIÓN. (a) SE PUEDE HOY.** Receta: tapa del color del fondo, ancho ≥ 2× el del contenido, apilada encima; anima Posición X de `0` a `+ancho`. Si el barrido es diagonal, se rota la tapa y se anima en su eje local vía nulo emparentado.
**DÓNDE SE VE.** Es el revelado por defecto del rótulo inferior de cualquier informativo.

---

**2. TAPA QUE SE VA — *block reveal / cover slide-off***
**QUÉ ES.** Un bloque de color sólido cubre el texto, se corre, y el texto queda.
**EN AE.** Igual que arriba, pero la tapa es **de un color de marca, no del fondo**: se la ve. Suele entrar y salir por lados opuestos (entra por izquierda, sale por derecha).
**TIEMPOS.** 8 cuadros de entrada, 2 de retención, 10 de salida. Entrada `cubic-bezier(0.7, 0, 0.84, 0)` (ease-in duro), salida `(0.16, 1, 0.3, 1)`.
**CLASIFICACIÓN. (a) SE PUEDE HOY**, y es el mejor negocio del catálogo: **no depende del color del fondo** porque la tapa es visible a propósito. Es el revelado que hay que usar cuando el fondo NO es liso.
**DÓNDE SE VE.** Todo el paquete gráfico deportivo moderno; es el gesto firma de los rótulos de Sky Sports / ESPN.

---

**3. BLOQUE QUE PASA — *block transition / bar swipe***
**QUÉ ES.** Una barra cruza la pantalla; detrás de ella el contenido ya cambió.
**EN AE.** Una barra ancha viaja de A a B con velocidad constante en el medio; el cambio de contenido es un corte (keyframe HOLD de opacidad) al cuadro exacto en que la barra tapa la zona.
**TIEMPOS.** 12–16 cuadros de punta a punta, `cubic-bezier(0.83, 0, 0.17, 1)`. El corte va en el cuadro central ±1.
**CLASIFICACIÓN. (a) SE PUEDE HOY.** Necesita HOLD (lo tenemos) y obturador (lo tenemos: la barra desenfocada por movimiento es lo que vende el gesto).
**DÓNDE SE VE.** Transición estándar de las piezas de Buck y Gunner; es la base de casi todo "kinetic type" publicitario.

---

**4. VENTANA DE CUATRO TAPAS — *rect mask emulada*** ⭐
**QUÉ ES.** No es un gesto sino **el motor de la mitad de este catálogo**: cualquier máscara rectangular animada (posición y tamaño en los dos ejes) equivale a cuatro tapas —arriba, abajo, izquierda, derecha— emparentadas a un nulo.
**EN AE.** Cuatro sólidos oversized; cada uno con el **anclaje en el borde que da a la ventana**; escala y posición animadas. Rotar el nulo rota la ventana entera.
**TIEMPOS.** Los de cada gesto que la use.
**CLASIFICACIÓN. (a) SE PUEDE HOY.** Sin esto habría que pedir máscaras al exportador; con esto, **toda máscara rectangular ya está soportada**, incluida la que se mueve, crece, se achica y gira. Y la mayoría de las máscaras reales de un video de datos o de UI son rectangulares.
**LÍMITE.** El fondo tiene que ser liso o tener placa limpia. Y ojo con el obturador: los cuatro bordes se desenfocan al moverse.

---

**5. GAVETA — *drawer / slide-behind***
**QUÉ ES.** La tapa está quieta y **el contenido se mueve por detrás**. Un texto entra por debajo de una línea y se detiene.
**EN AE.** Tapa fija cubriendo la mitad inferior; el texto anima Posición Y de `+altura` a `0`.
**TIEMPOS.** 12–16 cuadros, `cubic-bezier(0.22, 1, 0.36, 1)`. Escalonado entre líneas: **3 cuadros**.
**CLASIFICACIÓN. (a) SE PUEDE HOY**, y es más barato que el barrido: la tapa no tiene ni un keyframe.
**DÓNDE SE VE.** El revelado de títulos por renglón: es literalmente cómo se hace en toda la tipografía cinética editorial.

---

**6. TELÓN / CORTINA — *curtain close / shutter***
**QUÉ ES.** Dos tapas entran desde lados opuestos y se juntan en el medio, cerrando la escena. O al revés, se abren.
**EN AE.** Dos sólidos simétricos. Variante vertical (párpado) y variante de cuatro (cierre en cruz).
**TIEMPOS.** 10–14 cuadros. Cierre con ease-in `(0.55, 0, 1, 0.45)` para que golpee; apertura con ease-out.
**CLASIFICACIÓN. (a) SE PUEDE HOY.**
**DÓNDE SE VE.** Cierres de bloque en piezas de marca; el "obturador" de las intros de cámara.

---

**7. PERSIANAS — *venetian blinds / slat wipe***
**QUÉ ES.** N franjas paralelas que se abren o cierran a la vez, o con retardo.
**EN AE.** Efecto `ADBE Venetian Blinds` (confirmado), o **N sólidos tapa** con el anclaje en su propio borde superior y Escala Y de 100 a 0.
**TIEMPOS.** 16–20 cuadros; retardo entre franjas **1–2 cuadros** (más que eso deja de leerse como un solo objeto). 8–14 franjas es el rango que funciona.
**CLASIFICACIÓN. (a) SE PUEDE HOY** con N tapas. Costo: N capas, y el escalonado hay que escribirlo (no tenemos animadores). Con 12 franjas son 12 capas y 24 keyframes: barato.
**DÓNDE SE VE.** Gráfica broadcast de los 90 que volvió como cita retro; y en versión sutil (3 franjas gruesas), en presentaciones de producto.

---

**8. TAPA CON AGUJERO / IRIS — *iris wipe / matte hole***
**QUÉ ES.** Un círculo (u otra forma) se abre y el contenido aparece adentro. O al revés, se cierra hasta el punto.
**EN AE.** Máscara elíptica con Expansión animada, o mata de pista con una elipse escalando. **Nuestra versión:** una placa opaca con el agujero recortado en el alfa, rasterizada a PNG, y **Escala** animada.
**TIEMPOS.** 18–24 cuadros para un iris de pantalla completa; `cubic-bezier(0.16, 1, 0.3, 1)`. El iris que cierra va más rápido: 12.
**CLASIFICACIÓN. (a) SE PUEDE HOY**, con **dos advertencias de nuestro propio oficio**:
  1. La placa se escala, así que **hay que construirla al tamaño máximo y escalar HACIA ABAJO, nunca hacia arriba** — un agujero de 120 px dibujado a 900 pixela el borde, que es exactamente lo que caza `nitidez-inventario`.
  2. La placa a escala mínima tiene que seguir cubriendo el cuadro entero: construirla con 3–4× de margen.
**DÓNDE SE VE.** Transiciones de Apple en keynote; el iris es también el gesto de "foco" en explicativos tipo Kurzgesagt.

---

**9. TEXTO CALADO — *knockout text / text cut out of a block***
**QUÉ ES.** Un bloque de color sólido tiene el texto recortado (se ve el fondo a través de las letras) y el bloque se corre, dejando el texto normal.
**EN AE.** Mata de pista **Alfa invertida** con la capa de texto matando al bloque. En 2023+ se puede además dejar la capa de texto visible.
**CLASIFICACIÓN. (a) SE PUEDE HOY** si el texto es **fijo**: se rasteriza "bloque con letras caladas" a un solo PNG y se lo trata como tapa. Deja de poder si el texto tiene que salir del documento como **texto medido** (nuestra capacidad estrella) — ahí el calado obliga a mata real. Decisión de producción: calado = imagen, texto vivo = sin calado.
**TIEMPOS.** 16–20 cuadros de recorrido del bloque.
**DÓNDE SE VE.** Portadas editoriales animadas, titulares de moda.

---

**10. CORTE ESCONDIDO — *hidden cut / whip-hide***
**QUÉ ES.** Un objeto pasa delante, y cuando termina de pasar la escena es otra. El espectador no vio el corte.
**EN AE.** Cualquier objeto que cubra el 100% del cuadro por al menos 1–2 cuadros; el cambio es un HOLD.
**TIEMPOS.** El objeto tarda 10–14 cuadros; la ventana de cobertura total dura 2–3. Con obturador a 180° el borde se disuelve solo.
**CLASIFICACIÓN. (a) SE PUEDE HOY.** Es el gesto más barato de todo el catálogo y el que más "producción" aparenta.
**DÓNDE SE VE.** Todo el trabajo de Oddfellows y Ordinary Folk vive de esto.

---

**11. BARRIDO RADIAL / RELOJ — *radial wipe / clock wipe***
**QUÉ ES.** El contenido se revela girando como la aguja de un reloj.
**EN AE.** `ADBE Radial Wipe` (confirmado): Transition Completion, Start Angle, Wipe (clockwise/counter/both), Feather.
**CLASIFICACIÓN. (a) SE PUEDE HOY, con una receta que no es obvia.** Dos semiplanos tapa, ambos con el **anclaje en el centro del reloj**:
  - Fase 1 (0→50%): tapa B fija cubriendo media pantalla; tapa A rota de 0° a 180°, destapando la primera mitad.
  - Al cuadro del 50%, HOLD de opacidad: A se apaga, B toma el relevo.
  - Fase 2 (50→100%): B rota de 180° a 360°.
  Necesita anclaje + rotación + HOLD, los tres los tenemos. Y el obturador le regala el borde suave.
**TIEMPOS.** 20–30 cuadros para la vuelta entera; lineal o `cubic-bezier(0.65,0,0.35,1)` si el reloj tiene que "arrancar".
**DÓNDE SE VE.** Barras de progreso circulares, contadores, y la gráfica de datos deportiva.

---

### FAMILIA B — TRANSFORMACIÓN PURA (sin tapa, sin nada)

---

**12. CRECER DESDE EL BORDE — *scale from anchored edge / grow-on***
**QUÉ ES.** Una barra, una línea o un panel nace de cero desde uno de sus bordes.
**EN AE.** Anclaje movido al borde; Escala X (o Y) de 0 a 100.
**TIEMPOS.** 12–16 cuadros, `cubic-bezier(0.22, 1, 0.36, 1)`. Escalonado entre barras de un gráfico: **2–3 cuadros**.
**CLASIFICACIÓN. (a) SE PUEDE HOY.** Es exacto y sin tapas.
**TRAMPA.** Sólo sirve para contenido **uniforme** (una barra lisa, una línea). Escalar texto o una imagen no la revela: **la deforma**. Para texto hay que ir a la tapa (gesto 1 o 5). Este es el error de criterio más común del oficio.
**DÓNDE SE VE.** Todo gráfico de barras animado desde que existen los gráficos de barras animados.

---

**13. ESCALONADO DE OPACIDAD — *opacity cascade / stagger fade***
**QUÉ ES.** Una lista, una grilla o un párrafo aparece elemento por elemento.
**EN AE.** Opacidad 0→100 por capa, con desfase de tiempo. En texto se hace con animador de opacidad + Range Selector.
**TIEMPOS.** 8–12 cuadros por elemento; retardo **2–4 cuadros** (grilla) o **3–5** (renglones). Curva `(0.33, 0, 0.67, 1)` — la opacidad casi nunca quiere una curva agresiva.
**CLASIFICACIÓN. (a) SE PUEDE HOY** por capa. **Por carácter NO**: no soportamos animadores de texto. Aproximación aceptable: partir la frase en capas por palabra (barato) y aceptar que por letra no lo tenemos.
**DÓNDE SE VE.** Toda interfaz de producto animada: Linear, Stripe, Vercel.

---

**14. ENTRADA CON SOBREPASO — *pop-in / overshoot***
**QUÉ ES.** El objeto entra pasándose de largo y vuelve. Es lo que hace que algo se sienta **vivo** en vez de "traducido".
**EN AE.** Escala 0 → 106 → 100, o Posición con un excedente de 8–14 px.
**TIEMPOS.** 10–14 cuadros al pico, 5–7 de vuelta.
**AVISO IMPORTANTE Y CONCRETO.** `easeOutBack` = `cubic-bezier(0.34, 1.56, 0.64, 1)` **no se puede expresar con influencia de AE**: la influencia vive en [0,100] y no produce y>1. El sobrepaso en AE hay que **autorarlo con tres keyframes** (0 → 106 → 100) o con dimensiones separadas. Nuestra cadena ya hace "sobrepaso real con dimensiones separadas", así que el gesto está soportado — pero hay que escribirlo como tres claves, no como una curva.
**CLASIFICACIÓN. (a) SE PUEDE HOY.**
**DÓNDE SE VE.** Duolingo, y en general todo el lenguaje de movimiento de producto móvil.

---

**15. DESLIZAMIENTO CON DESVANECIDO — *slide + fade***
**QUÉ ES.** El elemento entra desplazado 40–80 px y desvaneciendo.
**EN AE.** Posición + Opacidad, ambas 0→1.
**TIEMPOS.** 14–18 cuadros. La **opacidad tiene que terminar antes que la posición** (a los 8–10) o el elemento parece llegar tarde. Ese desfase es la mitad del oficio.
**CLASIFICACIÓN. (a) SE PUEDE HOY.**

---

**16. EMPUJE — *push***
**QUÉ ES.** Lo nuevo entra empujando lo viejo fuera de cuadro. No hay tapa: hay dos contenidos emparentados a un nulo que se corre.
**EN AE.** Un nulo con las dos capas hijas; se anima el nulo un ancho de pantalla.
**TIEMPOS.** 16–20 cuadros, `cubic-bezier(0.83, 0, 0.17, 1)`.
**CLASIFICACIÓN. (a) SE PUEDE HOY**, y **funciona sobre cualquier fondo** porque no hay tapa que dependa del color. Junto al gesto 2, es el otro salvavidas para fondos no lisos.

---

**17. VOLTEO — *flip-in / card flip***
**QUÉ ES.** El panel gira sobre su eje vertical y aparece de canto.
**EN AE.** Capa 3D, Rotación Y de -90° a 0°, con el anclaje donde corresponda (centro = giro; borde = puerta).
**TIEMPOS.** 16–20 cuadros; `cubic-bezier(0.34, 1.2, 0.64, 1)` con un pequeño sobrepaso de 4–6°.
**CLASIFICACIÓN. (a) SE PUEDE HOY** — 3D con cámara está medido a 0,043 px. Es un "aparecer" que no gasta ninguna tapa.
**DÓNDE SE VE.** Revelados de tarjeta en fintech y en toda la gráfica de "producto que se presenta".

---

**18. CONTADOR DE RODILLO — *odometer / number roll***
**QUÉ ES.** Las cifras suben dentro de una ventanita, como el cuentakilómetros.
**EN AE.** Una tira vertical con los dígitos 0–9 y una máscara rectangular de la altura de un dígito.
**TIEMPOS.** 20–40 cuadros para el número entero; **cada columna con retardo de 2–3 cuadros** y las de la derecha girando más vueltas.
**CLASIFICACIÓN. (a) SE PUEDE HOY** con el gesto 4 (ventana de cuatro tapas) + una tira de texto rasterizada o de texto vivo. Es de lo más "Gemini" que hay: la cosa **hace** algo, la cámara no se mueve.
**DÓNDE SE VE.** Todo dashboard animado; los contadores de las piezas de datos.

---

### FAMILIA C — LOS QUE PIDEN ALGO NUEVO

---

**19. REVELADO POR DESENFOQUE — *blur reveal / defocus-in***
**QUÉ ES.** El elemento entra desenfocado y se enfoca. Suele ir con escala 104→100.
**EN AE.** `ADBE Box Blur2` o `ADBE Gaussian Blur 2` (ambos confirmados), Blurriness de 20–40 a 0.
**TIEMPOS.** 12–16 cuadros, `cubic-bezier(0.16, 1, 0.3, 1)`.
**CLASIFICACIÓN. (b) EXIGE AGREGAR ALGO.** Concretamente: **un desenfoque por capa** — una uniforme de radio en el material de la capa, y un pase de desenfoque separable sobre esa capa antes de componerla. En three.js es barato porque ya tenemos un pase de bloom selectivo: la infraestructura de "render de capa a textura" ya existe. Es el agregado con mejor relación costo/beneficio del frente.
**APROXIMACIÓN ACEPTABLE MIENTRAS TANTO:** escala 108→100 + opacidad. Se parece de lejos y no cuesta nada.

---

**20. BARRIDO DE BORDE SUAVE — *soft wipe / feathered wipe***
**QUÉ ES.** Lo mismo que el gesto 1, pero el borde del barrido es una degradación de 40–200 px en vez de un filo.
**EN AE.** Linear Wipe con Feather, o máscara con Difuminado.
**CLASIFICACIÓN. (b) EXIGE.** Ver "la función que compra tres" más abajo.
**APROXIMACIÓN ACEPTABLE:** subir el ángulo del obturador durante el barrido. El desenfoque de movimiento suaviza el filo de la tapa de forma proporcional a la velocidad — no es lo mismo (el suavizado depende de la velocidad, no es controlable), pero en un barrido rápido nadie nota la diferencia.

---

**21. BARRIDO POR DEGRADADO — *gradient wipe / luma wipe***
**QUÉ ES.** El contenido aparece siguiendo un patrón: manchas, vetas, ondas, ruido. Es la disolución "orgánica".
**EN AE.** Efecto Gradient Wipe con una capa de degradado/ruido de referencia, o mata de luma con un degradado animado. (MatchName **no confirmado**.)
**TIEMPOS.** 20–30 cuadros, lineal o con ease-out suave.
**CLASIFICACIÓN. (b) EXIGE.** Y es el caso general del que 19, 20, 21, 1 y 11 son casos particulares.

---

**22. DIBUJADO DE TRAZO — *trim path draw-on***
**QUÉ ES.** Una línea, un subrayado, un círculo o una firma se dibujan solos.
**EN AE.** `ADBE Vector Filter - Trim` (confirmado) con `ADBE Vector Trim Start` / `End` / `Offset` (confirmados), 0→100. Se agrega al grupo: `capa.content.addProperty("ADBE Vector Filter - Trim")`.
**TIEMPOS.** 18–24 cuadros, `cubic-bezier(0.65, 0, 0.35, 1)`. Con Start e Inicio desfasados 6 cuadros se consigue el "gusano" (la línea que se dibuja y se borra).
**CLASIFICACIÓN. Partida.**
  - **Trazo RECTO: (a) SE PUEDE HOY** — es exactamente el gesto 12 (crecer desde el borde) sobre un rectángulo delgado. Idéntico, no aproximado. **La mayoría de los trim paths de un video corporativo son subrayados rectos.**
  - **Arco / círculo (anillo de progreso): (a) SE PUEDE HOY** con la receta del gesto 11 aplicada a un PNG de anillo. Dos semiplanos tapa rotando sobre el centro. Funciona sobre fondo liso.
  - **Trazado arbitrario (una firma, un mapa, un garabato): (b) EXIGE** geometría de trazado en el documento y un material de línea con recorte por longitud de arco. Es caro: hay que exportar las bezier, no un PNG. Yo lo dejaría para después de todo lo demás.
**DÓNDE SE VE.** Explicativos, mapas animados, subrayados de énfasis (Ben Marriott lo enseña como gesto de base).

---

**23. MATA VIAJERA CON FORMA CAMBIANTE — *morphing matte reveal***
**QUÉ ES.** La forma que revela **cambia de forma** mientras viaja: una gota que se estira, un blob, un charco que crece irregular.
**EN AE.** Trazado de máscara con keyframes, o forma con puntos animados, como mata.
**CLASIFICACIÓN. (b) EXIGE, y es la exigencia real de este frente.** Todo lo demás lo emula la tapa; esto no. Requiere trazado animado en el documento **y** un motor de interpolación de trazados (correspondencia de puntos, que es un problema con dientes). **Recomendación honesta: no lo pidas todavía.** Cuando haga falta un blob, lo barato es exportar la forma como **secuencia de PNG** (ya rasterizamos formas; hacerlo N veces es más de lo mismo) y reproducirla como flipbook. Feo de decir, pero es exacto y es una tarde de trabajo.

---

**24. DISOLUCIÓN EN BLOQUES — *block dissolve / dither dissolve***
**QUÉ ES.** El elemento se deshace en cuadraditos aleatorios.
**EN AE.** `ADBE Block Dissolve` (confirmado).
**CLASIFICACIÓN. (c) NO VALE LA PENA.** Es un gesto con fecha (lee a 2011), depende de ruido y semilla que habría que reproducir bit a bit para que la fidelidad de píxel siga siendo cierta, y **el gesto 21 con un mapa de ruido en cuadrícula lo cubre** si algún día hace falta. Cero prioridad.

---

## PARTE 2 — EL MAPA (la respuesta al ejercicio central)

**SE RESUELVE HOY, EXACTO, SIN MATAS NI MÁSCARAS (18):**
barrido de borde · tapa que se va · bloque que pasa · ventana de cuatro tapas · gaveta · telón · persianas · iris con tapa agujereada · texto calado (si es imagen) · corte escondido · barrido radial · crecer desde el borde · escalonado de opacidad · sobrepaso · deslizamiento con desvanecido · empuje · volteo 3D · contador de rodillo. **Más el trim path recto y el anillo de progreso.**

**APROXIMACIÓN ACEPTABLE (2):**
borde suave (con obturador alto) · desenfoque de entrada (con escala + opacidad).

**LO EXIGE DE VERDAD (3, y sólo 3):**
1. **Borde suave / degradado controlado** (gestos 20, 21).
2. **Desenfoque por capa** (gesto 19).
3. **Mata que cambia de forma** (gesto 23) y **trazado arbitrario** (gesto 22 general).

**NO VALE LA PENA (1):** disolución en bloques. Y con ella toda la familia de "wipes" con textura procedural: CC Glass Wipe, CC Grid Wipe, herramienta de difuminado variable de máscara, rotoscopia.

### La función que compra tres de una

En vez de implementar máscaras, matas, Linear Wipe con feather, Radial Wipe y Gradient Wipe por separado: **revelado por umbral sobre un mapa de luminancia**. Un PNG en escala de grises horneado en el exportador + dos uniformes (`umbral`, `suavidad`) + un `smoothstep` en el fragment shader:

```glsl
alpha *= smoothstep(umbral, umbral + suavidad, textura(mapa, uv).r);
```

Con eso salen, **con el mismo código y sin ninguna capa nueva**: barrido lineal con difuminado en cualquier ángulo, barrido radial suave, iris suave, persianas, barrido por degradado, disolución orgánica y cualquier forma de mata estática con borde controlado. El mapa lo genera el exportador rasterizando lo que ya sabe rasterizar. **Un campo en el documento (`mapaRevelado`) y una propiedad animable (`umbral`)** — nada más. Si de este informe sale una sola tarea, que sea esta.

---

## PARTE 3 — DÓNDE SE ROMPE LA TAPA (y qué se hace)

La tapa asume **fondo liso, quieto y opaco**. Se rompe en seis casos, y cinco tienen salida:

**1. Fondo con degradado o imagen.** La tapa es de un color; el fondo no.
→ **Placa limpia.** Se hornea en la textura de la tapa **el pedazo de fondo que le toca cubrir**, alineado. Es exacto mientras el fondo esté quieto **en espacio de pantalla**. Es lo mismo que hace un compositor con un clean plate, y sale gratis porque las imágenes ya viajan bit a bit.

**2. Fondo que se mueve (paralaje, cámara, video).** La placa limpia deja de alinear al primer cuadro.
→ **Cambiar de gesto.** Acá se usan los gestos **2 (tapa visible de color de marca)**, **16 (empuje)** o **17 (volteo)**, que no dependen del fondo. O se emparenta la tapa al mismo nulo que mueve el fondo, si el movimiento es rígido.

**3. Escenas 3D con cámara en movimiento.** La tapa es un plano en el espacio: si no está en el mismo plano Z que lo que tapa, el paralaje descubre la costura.
→ **Coplanar y emparentada.** Misma Z que el contenido, mismo nulo padre, y sobredimensionada al menos 2× el recorrido. Y si la cámara gira mucho, la tapa se convierte en un problema de encaje, no de revelado.

**4. Resplandor / bloom.** Si el bloom se calcula **por capa** antes de la composición, poner una tapa encima **no apaga el halo**: la capa tapada sigue derramando luz por los bordes de la tapa. Es un fantasma que aparece justo en el cuadro donde el elemento debería estar oculto.
→ **Animar la opacidad de la capa que resplandece además de taparla**, o excluirla del pase de bloom mientras esté cubierta. **Esto hay que verificarlo en el motor antes de confiar en ninguna tapa sobre una capa con resplandor declarado.** No lo di por hecho: es una pregunta abierta para quien conozca el pase.

**5. Obturador.** La tapa en movimiento se desenfoca en su borde; en un barrido rápido el contenido **se filtra** por el borde blando durante 1–2 cuadros.
→ Normalmente es lo que uno quiere (suaviza gratis, ver gesto 20). Si molesta, se baja el ángulo del obturador de esa tapa o se le suma solape.

**6. Contenido semitransparente.** Una tapa opaca sobre una capa al 60% no da "medio revelado": da un rectángulo de color.
→ No tiene arreglo por apilado. Ese caso **sí** es mata.

**Y una regla de higiene:** la tapa se dimensiona con **2× el recorrido, mínimo**, y se la deja fuera de cuadro. Una tapa que "justo alcanza" es un cuadro con una línea de fondo asomando, y ese defecto aparece una sola vez en 750 cuadros — o sea, es de los que se escapan.

---

## PARTE 4 — LO QUE ESTE FRENTE APORTA AL DIAGNÓSTICO ("no tiene beat")

Los revelados **son** el instrumento rítmico de una pieza. Tres números concretos:

- A 120 bpm, un tiempo son **15 cuadros** a 30 fps; medio tiempo, **7 u 8**. Un revelado que dura 14–16 cuadros y **termina** sobre el tiempo se siente en el beat; uno de 24 se siente muerto. La queja "es muy lento" casi siempre es esto: gestos de 30–40 cuadros con curvas suaves en los dos extremos.
- **Retardo de escalonado**: 2–3 cuadros lee como *ondulación* de un solo objeto; 7–8 lee como *ritmo* (una cosa por medio tiempo). Son dos gestos distintos y elegir mal es la diferencia entre "coreografía" y "todo junto".
- **El ataque manda.** Curva con `x1` alto y `y1 = 1` (`0.16, 1, 0.3, 1`): arranca a toda velocidad y frena. Es lo que produce el golpe. La curva simétrica de AE por defecto (Easy Ease, 33/33) es exactamente la que hace que todo se sienta "muerto".

Y el criterio que ordena el frente entero: **para que la cosa haga algo en vez de que la cámara la mire, el revelado tiene que ocurrirle al objeto**. Los gestos 2, 5, 10, 12, 14, 16, 17 y 18 son todos "el objeto hace" y **todos están soportados hoy, sin tocar el exportador**.

---

## HONESTIDAD — qué verifiqué y qué no

- **Verificado en documentación/fuentes hoy:** el modelo de matas 2023+ y su API (`setTrackMatte`, `removeTrackMatte`, `trackMatteLayer`, los cinco `TrackMatteType`, la advertencia de Adobe sobre escribir `trackMatteType` solo); los matchNames listados en "MatchNames confirmados"; el comportamiento de Stencil/Silhouette contra todas las capas de abajo; que Trim Paths es `ADBE Vector Filter - Trim` con Start/End/Offset.
- **NO verificado, dicho como tal:** `ADBE Mask Feather`, `ADBE Mask Opacity`, `ADBE Mask Offset`; los sub-índices de `ADBE Linear Wipe`; el matchName de Gradient Wipe; los matchNames de animadores de texto; el orden exacto de índices de las sub-propiedades de máscara.
- **Inferencia mía, no documentación:** las recetas de emulación (ventana de cuatro tapas, reloj de dos semiplanos, iris con placa agujereada). Están razonadas contra las capacidades que el brief declara medidas, pero **ninguna la probé contra AE**. La del reloj de dos semiplanos es la que más merece una prueba antes de confiar en ella.
- **Los tiempos y curvas** son práctica de oficio consolidada, no cifras publicadas por Adobe. Son puntos de partida, no verdades.