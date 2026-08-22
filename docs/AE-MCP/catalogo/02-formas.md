# CATÁLOGO DE GESTOS — CÓMO SE PASA DE UNA COSA A OTRA

24 gestos. Clasificación **(a)** se puede hoy · **(b)** exige exportador · **(c)** no vale la pena todavía.

---

## NOTA CERO: DOS HALLAZGOS QUE CAMBIAN LA CUENTA

Antes del catálogo, dos cosas que descubrí revisando qué soporta la cadena y que mueven ~8 gestos de (b) a (a):

**1. La TAPA no tiene por qué ser un rectángulo.** El exportador rasteriza capas de forma a PNG con aspecto exacto. Entonces una tapa puede ser **cualquier silueta congelada**: un círculo, un diagonal, un anillo (dona con agujero), una onda, un logo. Una tapa-anillo escalada de 0 a 400% es un **iris cerrando**, sin una sola máscara. Una tapa con borde en diagonal es un barrido diagonal. El "contenido congelado" no es una limitación acá, porque una tapa no necesita animar su forma: necesita moverse y escalar. **Todo el repertorio de wipes con forma se resuelve con PNG + las seis transformaciones.**

**2. El obturador nos regala el desenfoque de los latigazos.** El whip pan se enseña siempre como "movimiento + Directional Blur en capa de ajuste". Nosotros no tenemos ni efectos ni capas de ajuste — pero tenemos obturador con ángulo y fase, que es de dónde sale el smear de verdad. Un latigazo de 4 cuadros a 180° de obturador produce el borrón real, no el simulado. **El latigazo es (a) sin agregar nada.**

Y el modo de fallo #1 de las tapas, para anotarlo antes de que cueste caro: **una tapa sólo es invisible sobre fondo plano de su mismo color.** Sobre un degradado o una imagen se ve. Si el fondo no es plano, la tapa tiene que ser un **parche**: un PNG del pedazo de fondo que va a cubrir. Y con cámara 3D en movimiento hay que decidir a conciencia si la tapa es 2D (queda pegada al cuadro — correcto para barridos desde el borde) o 3D emparentada (queda pegada al mundo — correcto para tapar un objeto que viaja). Confundirlas hace que la tapa "patine" contra el fondo.

---

# FAMILIA 1 — TAPAS: OCULTAR ES EL EFECTO

### 1. BARRIDO LINEAL POR TAPA — *linear wipe / hard wipe*
**QUÉ ES.** Una arista recta cruza el cuadro; de un lado está el contenido viejo, del otro el nuevo. No hay borde suave: es un filo.
**CÓMO SE HACE EN AE.** Un sólido del color del fondo, más ancho y alto que la composición, apilado encima de la capa a tapar. Se anima sólo `ADBE Position` (o `ADBE Position_0` con dimensiones separadas) desde fuera de cuadro hasta cubrir. Para el barrido diagonal: el mismo sólido con `ADBE Rotate Z` fijo en 15°–30° y la posición animada en la perpendicular. Sin efectos, sin `ADBE Linear Wipe` (que existe como efecto pero no lo necesitamos y **no confirmé su matchName en esta sesión**).
**TIEMPOS Y CURVAS.** 8–14 cuadros. Influencia de salida alta (85%) y de entrada baja (10%): la tapa arranca lenta un cuadro, se dispara y frena seco. En cubic-bezier, `cubic-bezier(0.16, 1, 0.3, 1)`. Con Easy Ease pelado (33,33% de los dos lados, que es el valor por defecto de AE) el barrido queda blandito y es justo la sensación de "muerto" que hay que evitar.
**CLASIFICACIÓN. (a).** Receta: sólido bg-color, apilado sobre el grupo saliente, `Position` de A a B en 10 cuadros. El contenido nuevo entra con su tiempo de entrada justo en el cuadro en que la tapa lo cubre al 100%.
**DÓNDE SE VE.** Es el gesto base de los paquetes gráficos de deporte (ESPN, NBA) y de todo el motion editorial tipo Netflix bumper.

---

### 2. REVELADO DE TEXTO DETRÁS DE UNA BARRA — *block reveal / mask-off text*
**QUÉ ES.** Una palabra aparece como si emergiera desde detrás de una línea invisible: no aparece, se **descubre**. Es el revelado de tipografía más usado del oficio.
**CÓMO SE HACE EN AE.** Normalmente con máscara. Nosotros: la capa de texto sube (`Position` en Y) desde su altura de línea completa por debajo, y una **tapa** del color del fondo, apilada justo encima del texto, ocupa esa zona de abajo. El texto sube por detrás de la tapa. Acá está la ventaja del repo: **`sourceRectAtTime` nos da la caja medida del texto**, así que la tapa se dimensiona y se coloca por cálculo, no a ojo — `top`, `height`, `left`, `width` de la caja definen la tapa exacta con 2 px de margen.
**TIEMPOS Y CURVAS.** 10–14 cuadros por línea. Escalonado entre líneas: **2 a 4 cuadros**. Curva: influencia de salida 90%, entrada 5%. Nada de rebote acá — el rebote en tipografía se lee como error.
**CLASIFICACIÓN. (a).** Es probablemente el gesto de mayor rendimiento por línea de código de todo el catálogo, porque ya tenemos la caja medida.
**DÓNDE SE VE.** Todo el kinetic type de marca: Apple, Stripe, Linear, títulos de documental.

---

### 3. CORTINA / DOBLE TAPA — *barn doors / split wipe*
**QUÉ ES.** Dos mitades se abren hacia los lados y aparece lo de atrás; o se cierran y tapan.
**CÓMO SE HACE EN AE.** Dos sólidos del ancho de media composición, juntos por el centro, apilados encima. Se animan las dos `Position` en X en direcciones opuestas. Variante vertical, y variante "hoja de cuchillo" (una sola se va y la otra queda).
**TIEMPOS Y CURVAS.** 12–18 cuadros. Las dos mitades **no** deben salir con exactamente la misma curva: 2 cuadros de desfase entre una y otra rompe la simetría muerta y da carácter.
**CLASIFICACIÓN. (a).**
**DÓNDE SE VE.** Aperturas de noticiero, presentaciones de producto.

---

### 4. PERSIANA ESCALONADA — *blinds / slat wipe*
**QUÉ ES.** N barras horizontales (o verticales) barren el cuadro una detrás de otra con retardo. Se lee como una textura de movimiento, no como una sola forma.
**CÓMO SE HACE EN AE.** N sólidos del color del fondo, del alto de `comp.height / N`, todos apilados. Cada uno con la misma animación de `Position` en X y un **retardo creciente**. En AE a mano esto es un repetidor o el efecto Venetian Blinds; para nosotros es un `for` en el script que crea N capas. **Que no tengamos repetidores no importa: el repetidor es una comodidad de UI, y por script salen las N capas igual de baratas.**
**TIEMPOS Y CURVAS.** Cada barra 10–12 cuadros; retardo **1,5 a 3 cuadros** por barra. Con 8 barras y 2 de retardo el gesto total dura 26 cuadros. Si el retardo es mayor a 4 cuadros deja de leerse como una cosa y se lee como ocho cosas.
**CLASIFICACIÓN. (a).** Ojo con el conteo de capas: 12 barras por transición, por 6 transiciones, son 72 capas. Vale la pena que el script las nombre con prefijo (`tapa_persiana_03`) para que el documento exportado se pueda depurar.
**DÓNDE SE VE.** Paquetes de broadcast; el "card wipe" clásico es esta idea con vuelta en 3D (ver gesto 13).

---

### 5. IRIS / CÍRCULO QUE CRECE — *iris wipe / circle grow*
**QUÉ ES.** Un círculo se abre desde un punto y come el cuadro, o se cierra sobre un punto y lo aísla.
**CÓMO SE HACE EN AE.** Dos recetas, y conviene tener las dos:
- **Círculo lleno que crece:** capa de forma círculo, del color del *próximo* mundo, rasterizada a PNG, `Scale` de 0% a lo que haga falta para cubrir la diagonal del cuadro. Cuando termina, ese círculo **es** el fondo nuevo. Cero tapas.
- **Iris que cierra:** un PNG de **anillo** (dona) enorme, del color del fondo, con el agujero en el centro. Escalarlo hacia abajo hace que el agujero se cierre. Es un iris de cine sin una sola máscara. Esto sólo funciona porque rasterizamos formas.
**TIEMPOS Y CURVAS.** 16–24 cuadros. El crecimiento pide influencia de salida **muy** alta (90%+) o se lee como una burbuja de jabón. El cierre pide lo contrario: acelerar hacia el final (influencia de entrada alta) para que el último cuadro sea un golpe.
**CLASIFICACIÓN. (a).** Requisito de calidad: el PNG del anillo tiene que tener resolución nativa suficiente para el máximo de escala, o el borde queda pixelado — el mismo problema de nitidez que ya está documentado en el repo para los recortes.
**DÓNDE SE VE.** Looney Tunes lo canonizó; hoy se usa mucho en aperturas de marca y en piezas de fintech (el círculo del logo que se abre).

---

### 6. RANURA / BANDA QUE SE ABRE — *slit scan reveal*
**QUÉ ES.** Dos tapas dejan una franja delgada visible; la franja crece hasta descubrir todo. Se lee como algo que se abre, no como algo que aparece.
**CÓMO SE HACE EN AE.** Las dos tapas del gesto 3 pero arrancando **juntas** en el centro y separándose, sobre contenido que ya está ahí, quieto. La diferencia con la cortina es de intención: acá el contenido de abajo ya existía y no entra, sólo se descubre.
**TIEMPOS Y CURVAS.** 14–20 cuadros, ease-out fuerte. Se combina muy bien con un contenido que hace un **escalado de 104% a 100%** al mismo tiempo: el contenido "respira" mientras se descubre y el gesto deja de ser mecánico.
**CLASIFICACIÓN. (a).**
**DÓNDE SE VE.** Aperturas de moda y de arquitectura.

---

# FAMILIA 2 — ALGO CRUZA Y SE LLEVA EL CAMBIO

### 7. OBJETO QUE BARRE EL CUADRO — *object wipe / whoosh-by*
**QUÉ ES.** Un objeto (un panel, una barra gorda, una tarjeta, una mano) cruza el cuadro rapidísimo. En el cuadro en que lo cubre todo, atrás cambió todo.
**CÓMO SE HACE EN AE.** Es la **tapa con personalidad**: en vez de un sólido invisible del color del fondo, un objeto de color que sí se ve. Cruza el cuadro con `Position` en 8–12 cuadros y obturador encendido. En el cuadro de cobertura total, el grupo viejo llega a su tiempo de salida y el nuevo a su tiempo de entrada.
**TIEMPOS Y CURVAS.** Cruce total 8–12 cuadros. **Sin ease de entrada ni de salida en el medio del cruce**: el objeto debe entrar ya a velocidad máxima y salir a velocidad máxima; si desacelera adentro del cuadro, se lee como un objeto, no como una transición. Curva casi lineal en el centro, con la aceleración fuera de cuadro. La cobertura total dura entre 2 y 4 cuadros — más que eso y el espectador se da cuenta de que está esperando.
**CLASIFICACIÓN. (a).** Receta exacta: objeto (sólido o PNG) más ancho que la comp; `Position.x` de `-w` a `+w` en 10 cuadros, lineal; `motionBlur = true` en la capa; el cambio de contenido en el cuadro central. Este es, de todo el catálogo, el gesto que más "vida" agrega por menos trabajo.
**DÓNDE SE VE.** Es el corte invisible del cine (la técnica de bloquear el cuadro con un cuerpo) traducido a gráfica. Muy usado por Buck y por los paquetes deportivos.

---

### 8. LATIGAZO — *whip pan / swish pan*
**QUÉ ES.** Todo el cuadro se va de barrido para un lado y vuelve del otro con contenido nuevo. Se siente como girar la cabeza de golpe.
**CÓMO SE HACE EN AE.** Se enseña con Directional Blur en capa de ajuste; nosotros no lo necesitamos. **Todo el contenido de la escena emparentado a un nulo**, y ese nulo hace `Position.x` de 0 a `-2.5 × ancho` en 4 cuadros. La escena nueva, emparentada a otro nulo, entra desde `+2.5 × ancho` a 0 en otros 4. Con obturador a 180° eso ya es un borrón total. Variante 3D: mover la cámara en lugar del nulo, o rotarla en Y — cuidado, la rotación de cámara produce un smear más creíble que la traslación.
**TIEMPOS Y CURVAS.** **8–10 cuadros en total**, partidos 4+4 o 5+5. La salida acelera (influencia de entrada alta al final) y la entrada desacelera (influencia de salida alta). El cambio de contenido ocurre en el cuadro de máxima velocidad, donde nadie puede leer nada. Todo lo que dure más de 12 cuadros deja de ser latigazo y pasa a ser una panorámica.
**CLASIFICACIÓN. (a), y es el mejor argumento de que el obturador ya exportado vale oro.** La única condición es que la velocidad del cuadro central sea grande de verdad: si el desplazamiento por cuadro es menor a ~1 ancho de comp, el borrón no alcanza a tapar y se ve el salto.
**DÓNDE SE VE.** Edgar Wright lo hizo marca registrada; en motion es el recurso estándar para encadenar viñetas rápidas.

---

### 9. EMPUJE — *push / slide*
**QUÉ ES.** Lo nuevo entra empujando físicamente a lo viejo fuera del cuadro. Los dos se mueven juntos, pegados.
**CÓMO SE HACE EN AE.** Dos grupos (dos nulos con sus hijos), colocados uno al lado del otro con exactamente un ancho de comp de separación. Se anima **un solo** `Position` (el del nulo padre común, o el de un nulo abuelo del que cuelgan los dos). Un solo keyframe de un solo valor mueve las dos escenas: es el gesto más barato del catálogo y el más difícil de que salga mal.
**TIEMPOS Y CURVAS.** 14–20 cuadros. Influencia de salida 80–90%, entrada 10–15%. Y un detalle que separa lo bueno de lo mediocre: darle a los elementos de adentro de cada grupo un **retardo de paralaje** — el fondo del grupo se mueve al 100%, los paneles al 108%, la tipografía al 115%. Se consigue con tres nulos hijos con recorridos distintos. Eso convierte un empuje plano en un empuje con profundidad.
**CLASIFICACIÓN. (a).** Emparentado + posición. No hace falta nada más.
**DÓNDE SE VE.** Toda la UI de teléfono; en motion, los desgloses de features de producto.

---

### 10. TIRA / CARRUSEL — *conveyor / filmstrip*
**QUÉ ES.** Una fila larga de contenidos que se desplaza y se detiene en cada estación. No es una transición, es **la misma transición repetida**, y por eso genera ritmo.
**CÓMO SE HACE EN AE.** Un nulo padre con N escenas hijas dispuestas en X. Keyframes de `Position` del nulo con **HOLD entre estaciones y bezier en los tramos**, o mejor: pares de keyframes bezier con mesetas. Los tipos HOLD/LINEAL/BEZIER encadenados que ya exportamos son exactamente esto.
**TIEMPOS Y CURVAS.** Traslado 16–20 cuadros, meseta 30–60 cuadros. Lo que da el "beat" es que **las mesetas sean todas iguales** y los traslados también: la regularidad es el pulso. Un traslado más largo que los otros, puesto a propósito, es el momento de énfasis.
**CLASIFICACIÓN. (a).**
**DÓNDE SE VE.** Los videos de features de Figma, Notion, Linear.

---

# FAMILIA 3 — ESCALA, CÁMARA Y COINCIDENCIA

### 11. ZOOM INFINITO / ATRAVESAR — *infinite zoom / push-through*
**QUÉ ES.** La cámara entra en un elemento (un cuadradito, un punto, la contraforma de una letra) y del otro lado hay una escena nueva. El plano nunca corta.
**CÓMO SE HACE EN AE.** Con nuestra cadena hay dos caminos y el 3D es el bueno:
- **3D real:** las escenas están en distintos Z. La cámara viaja en Z. La escena vieja tiene un "portal" (un panel) y la nueva está detrás, más chica. Al atravesar el plano de la vieja, la vieja llega a su tiempo de salida. Como tenemos cámara con perspectiva verificada a 0,043 px, el crecimiento por perspectiva es correcto sin cuentas nuestras.
- **2D con escalas encadenadas:** cada escena es un nulo con `Scale` creciendo exponencialmente; se reciclan las capas cuando salen de cuadro. Más frágil.
**TIEMPOS Y CURVAS.** 20–40 cuadros por salto. La curva tiene que ser **exponencial, no ease-in-out**: en un zoom, la velocidad constante *percibida* exige velocidad creciente *real*, porque el tamaño aparente crece con el inverso de la distancia. Influencia de salida baja y de entrada alta (arranca despacio, termina disparado) es lo que da la sensación de caer.
**CLASIFICACIÓN. (a) con cámara 3D**, y aprovecha justo lo que ya está medido. Advertencia de nitidez: el panel-portal se agranda muchísimo; si es un PNG rasterizado va a pixelarse. Tiene que ser un sólido (color plano, escala infinita) o una imagen con muchos más píxeles nativos que los que ocupa al final.
**DÓNDE SE VE.** El recurso central de las piezas de "profundidad de producto" y de casi todo Kurzgesagt.

---

### 12. MATCH CUT DE FORMA — *graphic match*
**QUÉ ES.** Un objeto se convierte en otro porque los dos ocupan exactamente el mismo lugar, tamaño y silueta en el cuadro del cambio. El cerebro los une.
**CÓMO SE HACE EN AE.** No es una función, es **disciplina de autoría**. En el cuadro N, el objeto saliente y el entrante tienen la misma caja: misma posición, misma escala aparente, misma rotación. El saliente termina (tiempo de salida en N) y el entrante empieza (tiempo de entrada en N). Nada se anima *durante* la transición; la animación es la que viene antes y la que sigue después.
**TIEMPOS Y CURVAS.** El cambio es de 0 cuadros. Lo que importa es lo de alrededor: si el objeto venía girando a X grados por cuadro, el entrante tiene que **seguir girando a X grados por cuadro** desde ese mismo ángulo. School of Motion lo dice como regla de continuidad: si el gesto dura doce cuadros y cortás en el seis, el siguiente arranca en el siete — no en el uno.
**CLASIFICACIÓN. (a), y es gratis.** Y acá tenemos una ventaja que casi nadie tiene: `sourceRectAtTime` nos da la caja medida del texto, así que el script puede **calcular** la escala a la que un panel coincide con el ancho de una palabra, en vez de que alguien lo empareje a ojo. Un match cut calculado.
**DÓNDE SE VE.** 2001 (el hueso y la nave) es el ancestro; en motion es el gesto firma de Oddfellows y de Giant Ant.

---

### 13. VOLTEO DE TARJETA / CUBO — *card flip / cube rotate*
**QUÉ ES.** El plano gira sobre un eje y del otro lado hay contenido nuevo. La cara vieja se va escorzando hasta desaparecer de canto.
**CÓMO SE HACE EN AE.** Dos capas 3D emparentadas a un nulo 3D, una rotada 180° en Y respecto de la otra y separadas 1 px en Z. Se anima `ADBE Rotate Y` del nulo de 0° a 180°. Para el cubo: cuatro caras a 90° cada una, desplazadas en Z por el medio-ancho, todas hijas del mismo nulo, y `Rotate Y` de 0 a 90.
**TIEMPOS Y CURVAS.** 14–20 cuadros. Curva con **sobrepaso**: llegar a 184° y volver a 180° en 4 cuadros. El sobrepaso es lo que lo hace sentir físico; sin él parece una diapositiva de PowerPoint. Como exportamos sobrepaso real con dimensiones separadas, esto sale.
**CLASIFICACIÓN. (a).** Caveat honesto: en AE la cara de atrás de una capa 3D se ve espejada; hay que rotar el hijo de atrás 180° en Y **y** dejar que su propio contenido sea la versión correcta, o va a salir invertido. Y el motor web tiene que renderizar caras traseras igual que AE — vale una prueba de un cuadro antes de construir la pieza entera.
**DÓNDE SE VE.** El "card wipe" de los paquetes de broadcast es esto multiplicado por N tarjetas con retardo.

---

### 14. COLAPSO A CERO Y BROTE — *scale-out / pop-in*
**QUÉ ES.** Lo viejo se aplasta hasta desaparecer y lo nuevo brota del mismo punto. El cambio ocurre en un punto del cuadro, no en el cuadro entero.
**CÓMO SE HACE EN AE.** `Scale` de 100 a 0 con el anclaje puesto donde uno quiere que se chupe, y el entrante de 0 a 100 con anclaje en el mismo punto. Con **dimensiones separadas** se puede aplastar sólo en Y (se lee como un persiana que cae) o sólo en X.
**TIEMPOS Y CURVAS.** Salida 6–8 cuadros con aceleración (influencia de entrada alta: se va rápido al final). Entrada 12–16 cuadros con sobrepaso: 0 → 108 → 100. **Superponer 3 cuadros** los dos gestos; si se hacen en secuencia limpia hay un hueco y el hueco es lo que mata el ritmo.
**CLASIFICACIÓN. (a).** El anclaje ya está exportado y es la propiedad que hace todo el trabajo acá.
**DÓNDE SE VE.** Interfaz de iOS; en motion, cualquier pieza de app.

---

### 15. TRANSICIÓN INVISIBLE POR VIAJE DE CÁMARA — *the oner / continuous camera*
**QUÉ ES.** No hay transición: hay un solo movimiento de cámara larguísimo por un espacio que contiene todas las escenas. Se pasa de un tema al siguiente porque la cámara llega allá.
**CÓMO SE HACE EN AE.** Una cámara 3D, un "escenario" con las escenas dispuestas en el espacio (en una línea, en una espiral, en capas de Z). Se anima `Position` y punto de interés de la cámara con mesetas: la cámara **se queda quieta** mientras una escena hace lo suyo, y se traslada cuando toca cambiar.
**TIEMPOS Y CURVAS.** Traslados de 30–60 cuadros; mesetas de 60–150. Curva del traslado: ease-in-out largo con influencias de 70/70. Un traslado de cámara con Easy Ease por defecto se ve barato; con 70/70 se ve deliberado.
**CLASIFICACIÓN. (a), y ya lo tenemos hecho.**
**PERO ACÁ ESTÁ EL DIAGNÓSTICO.** Este es el gesto que la pieza rechazada usaba **como único recurso**. El problema no es el gesto: es que solo, no alcanza. La cámara continua es un **contenedor**, no una coreografía. En las referencias buenas la cámara casi no se mueve y las cosas hacen cosas. La regla práctica: **si la cámara se está moviendo, algo más también tiene que moverse**; y en las mesetas, el movimiento tiene que ser de los objetos. Una cámara que viaja sobre utilería quieta produce exactamente el "video muerto" del diagnóstico.
**DÓNDE SE VE.** *Rope*, *Birdman*, *1917* en cine; en motion, las piezas de tour de producto.

---

# FAMILIA 4 — LUZ, COLOR Y OPACIDAD

### 16. DESTELLO — *flash / blow-out*
**QUÉ ES.** El cuadro se lava a blanco (o al color de marca) por 2–4 cuadros y vuelve con contenido nuevo. Es el corte más honesto que existe: no disimula, acentúa.
**CÓMO SE HACE EN AE.** Sólido blanco o de color, arriba de todo, `Opacity` 0 → 100 → 0. Y acá aprovechamos algo propio: **el resplandor declarado por capa en el comentario**. Un sólido con bloom declarado no sube a blanco plano, se derrama sobre lo de abajo — que es exactamente lo que hace un blow-out real y lo que normalmente pide un efecto.
**TIEMPOS Y CURVAS.** Subida **2–3 cuadros, LINEAL o casi**; el destello no debe tener ease de entrada. Bajada 6–10 cuadros con ease-out. El contenido cambia en el pico. Total 10–13 cuadros.
**CLASIFICACIÓN. (a).** Y es el sustituto legítimo de la transición por luminancia (gesto 22), que sí nos falta.
**DÓNDE SE VE.** Videoclips, aperturas de deporte, cualquier cosa cortada al beat.

---

### 17. DISOLVENCIA CRUZADA — *cross dissolve*
**QUÉ ES.** Uno baja mientras el otro sube. Es el más viejo y el más peligroso.
**CÓMO SE HACE EN AE.** Dos `Opacity` cruzadas.
**TIEMPOS Y CURVAS.** 12–20 cuadros. Advertencia real del oficio: la disolvencia lineal tiene un **hundimiento en el medio** (los dos al 50% suman menos densidad de la esperada). Se arregla con curvas: el saliente con influencia de entrada alta (se queda arriba y cae tarde), el entrante con influencia de salida baja (sube temprano). El solapamiento visual queda parejo.
**CLASIFICACIÓN. (a).** Uso restringido: en motion graphics la disolvencia lee como "no tuve una idea". Sirve para atmósfera y para cambios de fondo, casi nunca para elementos.
**DÓNDE SE VE.** Documental, no gráfica.

---

### 18. CAMBIO DE MUNDO — *background swap / dip to color*
**QUÉ ES.** El fondo entero cambia de color. Sin que se mueva nada más, eso lee como **cambio de capítulo**. Es transición de tema sin ser transición de plano.
**CÓMO SE HACE EN AE.** Dos sólidos de fondo apilados; el de arriba entra por barrido (gesto 1), por iris (gesto 5) o por disolvencia (17). Si el color de sólido no se puede animar en nuestra cadena — y no consta que se pueda — esto es lo correcto igual: **el barrido de color es más lindo que el cambio de color**.
**TIEMPOS Y CURVAS.** 16–24 cuadros por barrido. Este es el gesto que más conviene sincronizar al beat: el filo del barrido debe cruzar el centro del cuadro **exactamente en el golpe**.
**CLASIFICACIÓN. (a).**
**DÓNDE SE VE.** Las piezas de marca de Google y de Spotify viven de esto.

---

# FAMILIA 5 — TIPOGRAFÍA

### 19. RELEVO DE PALABRA — *word swap / text baton*
**QUÉ ES.** Una palabra se va y otra ocupa su lugar, en el mismo renglón, con el mismo peso. La frase avanza sin que la composición cambie.
**CÓMO SE HACE EN AE.** Dos capas de texto en la misma posición con tiempos de entrada/salida contiguos, y una tapa por debajo de la línea base (gesto 2): la saliente sigue subiendo y se va por arriba mientras la entrante sube desde abajo. Tapas arriba y abajo de la caja medida.
**TIEMPOS Y CURVAS.** 10–12 cuadros, con **4 cuadros de superposición** entre la salida de una y la entrada de la otra. La palabra saliente sale más rápido (8 cuadros, acelerando) que la entrante (12, desacelerando).
**CLASIFICACIÓN. (a), y otra vez la caja medida es lo que lo hace posible sin adivinar.**
**DÓNDE SE VE.** Todo el kinetic typography de anuncio.

---

### 20. TEXTO QUE ENTREGA AL SIGUIENTE — *text hand-off*
**QUÉ ES.** Una palabra de la frase queda, se agranda o se mueve al lugar donde va a estar en la escena siguiente, y desde ahí crece el nuevo bloque. El texto es el puente.
**CÓMO SE HACE EN AE.** La palabra clave es **la misma capa** en las dos escenas (o dos capas que coinciden exactamente en el cuadro de relevo, como en el match cut). Se anima su `Position` y `Scale` mientras el resto de su frase original se va por tapas, y la frase nueva entra alrededor de ella.
**TIEMPOS Y CURVAS.** El viaje de la palabra 18–24 cuadros; el resto de la frase vieja se va en 8, escalonado 2. La frase nueva entra 6 cuadros **antes** de que la palabra puente termine su viaje — el solapamiento es lo que lo hace una transición y no dos animaciones.
**CLASIFICACIÓN. (a).**
**DÓNDE SE VE.** Es el motor de casi todo el motion editorial de marca.

---

### 21. ESCRITURA POR ESCALONADO DE LETRAS — *character stagger*
**QUÉ ES.** Las letras entran una por una. Es lo que en AE se hace con animadores de texto, que **no soportamos**.
**CÓMO SE HACE.** Sin animadores: una capa de texto **por carácter**, colocadas por cálculo. Y acá tenemos con qué, porque medimos la caja del texto: se puede medir el ancho acumulado carácter a carácter y colocar cada uno. Es caro en capas (30 letras = 30 capas) y frágil con interletra y kerning contextual.
**TIEMPOS Y CURVAS.** Retardo **1 a 2 cuadros** por carácter; cada carácter 8–10 cuadros. Una palabra de 8 letras dura ~24 cuadros.
**CLASIFICACIÓN. (b), y de las baratas.** Lo que hay que agregar no es una propiedad nueva del exportador sino una **utilidad de autoría**: una función que parta un texto en N capas midiendo cada prefijo con `sourceRectAtTime` y devuelva las posiciones. El riesgo es el kerning entre pares: medir "AV" separado no da lo mismo que medirlo junto. Se mide el **prefijo acumulado** (`"A"`, `"AV"`, `"AVE"`…) y se resta, que es como se resuelve bien.
**Alternativa (a) hoy:** escalonar por **palabras** en vez de por letras, que ya es una capa por palabra y no tiene el problema del kerning. El 80% del efecto por el 10% del trabajo.
**DÓNDE SE VE.** Títulos de todo tipo.

---

# FAMILIA 6 — LO QUE NO LLEGA

### 22. TRANSICIÓN POR LUMINANCIA — *luma wipe / gradient wipe*
**QUÉ ES.** Una textura en escala de grises decide qué píxel se revela primero. Da disoluciones orgánicas, de humo, de tinta.
**CÓMO SE HACE EN AE.** Efecto Gradient Wipe con una capa de degradado como referencia, o una mata de luminancia. **No confirmé el matchName del efecto en esta sesión y no lo voy a inventar.**
**CLASIFICACIÓN. (c) por ahora.** Exige matas de pista o efectos, que son dos de los agujeros grandes. El **sustituto** es el destello (16): un blow-out con bloom da la misma sensación de "se disolvió en luz" por una fracción del costo. Si algún día se agrega algo de esta familia, la mata de luminancia es más útil que el efecto, porque además destraba las máscaras animadas.

### 23. MORPH DE FORMAS — *shape morph*
**QUÉ ES.** Una silueta se convierte en otra deformándose, vértice a vértice.
**CÓMO SE HACE EN AE.** Keyframes sobre `ADBE Vector Shape` (confirmado como matchName de la propiedad Path) con el mismo número de vértices en las dos formas.
**CLASIFICACIÓN. (b) cara, o (c).** Rasterizamos formas a PNG, o sea que hoy el contenido está congelado por definición. Agregarlo significa exportar **datos de trayectoria vectorial con sus tangentes y animarlos en el motor web** — es la única cosa del catálogo que no se puede aproximar con transformaciones. Mi recomendación: **(c) por ahora**, porque el match cut (12) y el colapso-brote (14) cubren el 80% de lo que la gente quiere decir con "morph", y este es el ítem más caro de la lista.
**Excepción barata:** un morph entre dos formas **conocidas de antemano** se puede hornear como secuencia de PNG. Si un día hace falta un morph puntual y de marca, esa es la salida sin tocar el exportador.

### 24. TRANSICIÓN LÍQUIDA — *liquid / blob transition*
**QUÉ ES.** Una masa que se estira, gotea y se traga el cuadro. En AE se hace con metaballs, Turbulent Displace, o formas dibujadas cuadro a cuadro.
**CLASIFICACIÓN. (c).** Necesita efectos de distorsión o animación de trayectoria. **Sustituto útil hoy:** varios círculos-tapa (gesto 5) con retardos de 2–3 cuadros y escalas distintas dan una cobertura irregular que lee como "algo orgánico se comió el cuadro". No es líquido, pero no es geométrico tampoco, y sale con lo que hay.

---

# TIEMPOS: LA TABLA QUE FALTABA

El diagnóstico dice "muy lento y no tiene el beat". Eso casi nunca es un problema de las curvas: es que **todos los gestos duran lo mismo**. Un video con ritmo tiene una jerarquía de duraciones:

| clase | cuadros a 30 fps | para qué |
|---|---|---|
| acento | 2–6 | destello, golpe, aparición |
| gesto | 8–16 | la mayoría de las transiciones de este catálogo |
| traslado | 20–40 | empuje, zoom, viaje de cámara corto |
| sostenido | 60–150 | meseta, lectura, respiración |

Y el pulso: a **120 bpm son 15 cuadros por golpe** a 30 fps; a 100 bpm, 18. Un gesto de 15 o de 30 cuadros cae en la grilla; uno de 22 no cae en ninguna parte, y eso es lo que se siente como "no tiene el beat".

**Dónde va el golpe.** No al empezar el movimiento: al **terminarlo**. Con una curva de ease-out fuerte (influencia de salida 85–90%) el 70% del recorrido pasa en el primer 30% del tiempo, y el ojo lee el impacto en el asentamiento. El keyframe final es el que tiene que caer sobre el beat, no el inicial.

**Curvas, en influencia de AE.** El Easy Ease por defecto es 33,33% de los dos lados y es el sonido de "plantilla". Los valores del oficio:
- **Entrada de un objeto** (llega y se queda): salida 0%, entrada 80–90%. `cubic-bezier(0.16, 1, 0.3, 1)`.
- **Salida de un objeto** (se va): salida 40%, entrada 0%. Acelera y se va.
- **Traslado A→B** (los dos extremos son reposo): 70/70. `cubic-bezier(0.65, 0, 0.35, 1)`.
- **Latigazo**: 0/0 en el centro, la aceleración está fuera de cuadro. `cubic-bezier(0.85, 0, 0.15, 1)`.
- **Sobrepaso**: no es una curva, son **valores**. 0 → 108 → 100, con el tramo de vuelta de 4–6 cuadros. Y con dimensiones separadas, sobrepasar sólo en una: un panel que entra desde la izquierda sobrepasa en X y no en Y. Sobrepasar en las dos a la vez es lo que hace que un gesto parezca de goma.

**Escalonado.** Elementos hermanos: 2–3 cuadros. Líneas de texto: 3–4. Letras: 1–2. Barras de una persiana: 1,5–3. Más de 5 cuadros de retardo y el grupo deja de leerse como un grupo.

**Superposición.** Casi todo lo que se siente muerto es una secuencia sin superposición: A termina, empieza B. En una pieza con vida, B empieza cuando A lleva el 70% andado. **3 a 6 cuadros de solape** entre gestos consecutivos.

---

# LA PREGUNTA DE FONDO: ¿QUÉ HACE DE TRANSICIÓN EN UNA PIEZA SIN CORTES?

Esta es la parte que importa más, porque es la que describe la referencia que admiran. Respuesta corta: **en una pieza sin cortes la transición no es un efecto entre dos planos, es un relevo de la atención dentro de uno solo.** Hay cinco mecanismos, y los cinco son (a).

**1. Relevo de vector — *baton pass*.** El movimiento de salida del elemento viejo **es** el movimiento de entrada del nuevo. La barra que se va hacia la derecha en 10 cuadros, y en el cuadro 6 entra desde la derecha el panel que la reemplaza, con la misma velocidad. El ojo siguió una sola cosa. Ese solape de 4 cuadros es la transición entera.

**2. Reciclado de utilería.** El mismo objeto sirve para el tema siguiente. Una barra de datos se acuesta y se convierte en el eje de un diagrama; una tarjeta rota 90° y es un panel de fondo. No es morph — es la **misma capa** con otra transformación. Esto es lo que las seis propiedades hacen mejor, y es el gesto que más "inteligencia" transmite porque implica que el sistema es coherente.

**3. Reencuadre del conjunto.** No cambia el tema: cambia el **layout**. Todos los elementos son hijos de un nulo; el nulo escala al 60% y se corre, y al mismo tiempo los hijos se redistribuyen en una grilla nueva. Lo que era una cosa grande en el centro pasa a ser una fila de cosas chicas arriba, y abajo entra lo siguiente. Se lee como "zoom out conceptual". Es lo que hacen las piezas de producto para pasar de detalle a panorama.

**4. Sustitución bajo tapa.** Es el corte invisible, hecho a propósito, dentro de un plano continuo: mientras una tapa (o un objeto que cruza, gesto 7) cubre una región, el contenido de esa región se sustituye con tiempos de entrada/salida. La tapa se va y ahí hay otra cosa. **Este es literalmente el mecanismo que nuestra cadena soporta mejor y peor aprovechamos.** No hay corte, pero hubo cambio.

**5. Silencio.** Una pieza sin cortes necesita mesetas o se vuelve papilla. La transición también puede ser **que todo se detenga 20 cuadros** y después arranque otra cosa. El contraste entre densidad y quietud es una transición tan válida como un barrido, y es gratis.

Y la regla que explica el diagnóstico, dicha al derecho: **en una pieza sin cortes, la cámara es el escenario y los objetos son el reparto.** Si la cámara viaja y los objetos están quietos, hay escenario y no hay reparto — y eso, exactamente, se ve como un video muerto. La corrección no es agregar cortes: es que en cada meseta de cámara haya al menos un relevo de los mecanismos 1 a 4.

---

# RESUMEN OPERATIVO

**18 de 24 gestos son (a) hoy.** No hace falta agregar nada al exportador para tener un repertorio completo de transiciones. Lo que falta no es capacidad: es **autoría** — tapas de silueta arbitraria, obturador aprovechado, escalonados, solapamientos y sobrepasos.

**Lo (b) ordenado por rendimiento:**
1. **Utilidad de escalonado por carácter** (gesto 21). No es una propiedad nueva, es una función de medición sobre `sourceRectAtTime`. Barato, alto impacto tipográfico. *El escalonado por palabra ya es (a) y da la mayor parte del efecto.*
2. **Matas de luminancia** (gesto 22) — destraba luma wipes y máscaras animadas de un saque. Media.
3. **Trayectorias de forma con keyframes** (gesto 23) — el morph de verdad. Cara, y la última que haría.

**Lo (c), y por qué:** morph vectorial y transiciones líquidas. Los dos tienen sustitutos aceptables con lo que hay (match cut, colapso-brote, tapas circulares escalonadas), y su costo es desproporcionado frente a los 18 gestos que están sin usar.

**Honestidad sobre identificadores.** Confirmé contra la guía de scripting: `ADBE Transform Group`, `ADBE Anchor Point`, `ADBE Position`, `ADBE Position_0/_1/_2`, `ADBE Scale`, `ADBE Orientation`, `ADBE Rotate X/Y/Z`, `ADBE Opacity`, `ADBE Mask Parade`, `ADBE Effect Parade`, `ADBE Marker`, `ADBE Time Remapping`; y en formas `ADBE Vector Layer`, `ADBE Root Vectors Group`, `ADBE Vector Group`, `ADBE Vector Transform Group`, `ADBE Vector Shape - Rect`, `ADBE Vector Shape - Ellipse`, `ADBE Vector Shape - Group` (Path), `ADBE Vector Graphic - Fill/Stroke`, `ADBE Vector Filter - Trim/Repeater/Offset/Merge`, `ADBE Vector Anchor/Position/Scale/Rotation/Group Opacity`. También `KeyframeEase(speed, influence)` y `setTemporalEaseAtKey`. **No confirmé** los matchNames de los efectos de transición (Linear Wipe, Radial Wipe, Gradient Wipe, Card Wipe, Directional Blur) ni los de propiedades de cámara, así que no los escribí — y de todos modos ninguno hace falta para los 18 gestos (a).

**Fuentes:**
- [School of Motion — Six Essential Motion Design Transitions](https://schoolofmotion.com/blog/six-essential-motion-design-transitions-tutorial)
- [School of Motion — Match Cuts in Animation](https://schoolofmotion.com/blog/match-cuts)
- [After Effects Scripting Guide — Shape Layer Match Names](https://ae-scripting.docsforadobe.dev/matchnames/matchnames/layer/shapelayer/)
- [After Effects Scripting Guide — AV Layer Match Names](https://ae-scripting.docsforadobe.dev/matchnames/layer/avlayer/)
- [ProVideo Coalition — Whip (swish) pans in After Effects & Premiere](https://www.provideocoalition.com/whip-swish-pans-in-after-effects-premiere/)
- [PremiumBeat — Create Seamless Transitions Using the Whip Pan](https://www.premiumbeat.com/blog/create-seamless-transitons-whip-pan/)
- [Creative COW — Whip/Swish Pan in After Effects](https://creativecow.net/whip-swish-pan-in-after-effects/)
- [Adobe Community — Keyframe Velocity, Speed and Influence](https://community.adobe.com/t5/after-effects/keyframe-velocity-speed-and-influence-question/m-p/9624201)
- [Adobe — Apply and control speed changes](https://helpx.adobe.com/after-effects/using/speed.html)
- [Adobe — Transition effects in After Effects](https://helpx.adobe.com/after-effects/using/transition-effects.html)
- [Medium/Applaudience — Invisible Cuts](https://medium.com/applaudience/invisible-cuts-a-new-trend-in-video-editing-b858ede7403d)
- [StudioBinder — Match Cuts & Creative Transitions](https://www.studiobinder.com/blog/match-cuts-creative-transitions-examples/)
- [Material Design — Duration & easing](https://m3.material.io/styles/motion/easing-and-duration)