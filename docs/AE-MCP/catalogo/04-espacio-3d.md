# CATÁLOGO DE GESTOS — FRENTE: EL ESPACIO Y LA CÁMARA

## 0. Tres hallazgos que gobiernan todo el frente

**(1) El agujero real no es la cámara: son las TRAYECTORIAS ESPACIALES.** Tu cadena soporta las seis transformaciones con curvas temporales por dimensión, así que *cualquier* movimiento de cámara con nombre propio ya es expresable — salvo uno: el que describe un **arco** en el espacio (órbita, grúa, curva de acercamiento). AE interpola la posición espacialmente con **Auto-Bezier por defecto**, no linealmente: dos keyframes de posición en AE no dan una recta, dan una curva suave. Si tu exportador lee sólo valores + curvas temporales, **AE y el motor divergen en cuanto haya tres o más keyframes de posición**, y divergen en silencio.

La salida no es agregar curvas espaciales al formato. Es **hornear** (bake): keyframes cada N cuadros con **interpolación espacial LINEAL forzada** en el propio AE. Así los dos lados renderizan el mismo polígono y la fidelidad se mantiene por construcción. El error contra el círculo ideal es:

```
error_px ≈ R · (1 − cos(Δθ/2))
```

Con R = 2000 px: cada 6° → 2,7 px (visible). Cada 2° → **0,30 px**. Cada 1° → 0,076 px. Una órbita de 90° en 90 cuadros horneada **cada 2 cuadros** (2°/segmento) queda en 0,3 px: por debajo de lo que se ve, con 46 keyframes. Ese es el número.

En scripting, forzar lineal espacial: `prop.setSpatialAutoBezierAtKey(i, false)` y `prop.setSpatialTangentsAtKey(i, [0,0,0], [0,0,0])`. *Nombres de alta confianza, verificalos imprimiendo el objeto antes de confiar.*

**(2) "Mover la cámara" y "mover el mundo" son intercambiables, y el mundo es más barato.** Un null 3D padre de todo, animado en X/Y, es indistinguible de un truck de cámara — y ya lo soportás al 100% con emparentado. Reservá la cámara animada para lo que el null no puede: cambiar la **perspectiva** (push in real, órbita). Todo lo demás es más controlable como movimiento del mundo, porque el encuadre no se te escapa.

**(3) En 3D, el orden de apilado deja de mandar: manda la Z.** Tu recurso de la TAPA funciona distinto acá. AE ordena las capas 3D por distancia a la cámara, no por el stack (el stack sólo desempata coplanares). Una tapa 3D tiene que estar **más cerca en Z**, no sólo arriba en la lista. Y coplanar exacto = z-fighting en three.js igual que en AE. Regla operativa: **toda tapa a −1 unidad de Z respecto de lo que tapa**, siempre, aunque parezca redundante.

---

## 1. La matemática de la cámara AE → three.js (esto es previo a los gestos)

Sin esto, ningún gesto de cámara coincide a nivel de píxel.

```
zoom_px = focal_mm · ancho_comp_px / film_size_mm        (film_size por defecto = 36 mm)
1920 px, 50 mm  →  zoom = 2666,67 px
```

- **La cámara nueva de AE nace en `z = −zoom`** y con el punto de interés en el centro de la comp (`[w/2, h/2, 0]`). A esa distancia una capa 3D en z=0 se ve **exactamente igual que una capa 2D al 100%**. Ese es el ancla de fidelidad: si tu motor no reproduce eso, todo lo demás está corrido.
- **A three.js:** `fov_vertical_deg = 2·atan(alto_comp_px / (2·zoom)) · 180/π`. Para 1080 y zoom 2666,67 → **22,90°**.
- **Escala aparente:** una capa a distancia d de la cámara se ve al `(zoom/d)·100 %`. Corolario útil: para que algo mantenga el tamaño aparente al alejarlo en Z, escalá `(d/zoom)·100`.
- **Ojo documentado:** hay una ambigüedad real entre ángulo de visión horizontal / vertical / diagonal en cómo AE presenta el dato. La relación horizontal con film size 36 mm es la que reproduce el 2666,67 empírico; la fórmula diagonal de Zwar (`zoom = diagonal/(2·tan(AOV/2))`) es la que aparece en la interfaz. Si exportás el ángulo en vez del zoom, **exportá también sobre qué eje está medido**.
- **AE resetea el film size a 36×24 cada vez que elegís un preset de lente**, aunque hayas puesto un valor propio. Si tu script toca presets, releé el film size después.

---

## 2. EL CATÁLOGO

### — MOVIMIENTOS DE CÁMARA CON NOMBRE PROPIO —

---

**01. PUSH IN / DOLLY IN — "empuje", "acercamiento"**
**QUÉ ES.** La cámara avanza sobre su eje hacia el sujeto. Crece todo el encuadre, y con perspectiva los objetos cercanos crecen más que los lejanos.
**CÓMO SE HACE EN AE.** Dos keyframes en `Position` de la cámara, sólo Z. Con cámara de dos nodos, dejar el POI quieto. **No es lo mismo que animar `Zoom`**: el zoom aplana, el push in cambia el paralaje. Ésa es toda la diferencia y es la que se ve.
`ADBE Camera Layer` → `ADBE Transform Group` → `ADBE Position` (o `ADBE Position_2` con dimensiones separadas).
**TIEMPOS Y CURVAS.** El push in "vivo" de fondo: **90–300 cuadros**, recorrido chico (5–12% de la distancia inicial), curva casi lineal — influencia 10–20% de cada lado → `cubic-bezier(0.15, 0, 0.85, 1)`. El push in narrativo (un remate): **20–35 cuadros**, `cubic-bezier(0.16, 0, 0.2, 1)` con velocidad de entrada distinta de cero. Nunca los dos en el mismo plano.
**CLASIFICACIÓN. (a) SE PUEDE HOY.** Dos keyframes, un eje, es una recta: no hay problema espacial. Receta: cámara en `z = −2666,67`, keyframe 0; `z = −2350`, keyframe 120; influencia 15/15.
**DÓNDE SE VE.** Es el movimiento por defecto de todo film de producto de Apple y de casi todo el género. Es también el "slow push in" que la literatura de cinematografía señala como el movimiento motivado más eficiente que existe.

---

**02. PULL OUT / DOLLY OUT — "retroceso", "revelado hacia atrás"**
**QUÉ ES.** La cámara se aleja y aparece el contexto: lo que era el todo resulta ser una parte.
**CÓMO SE HACE EN AE.** Igual que el 01 con el signo invertido. El truco del oficio: el pull out **no vale nada si no hay nada nuevo que revelar** — hay que poblar el borde del cuadro con capas que estaban fuera de campo.
**TIEMPOS Y CURVAS.** **45–90 cuadros**. Curva con freno largo: `cubic-bezier(0.2, 0, 0.1, 1)` (influencia de salida ~20%, de entrada ~90%). El frenado largo es lo que da la sensación de "aterrizar" en la composición final.
**CLASIFICACIÓN. (a) SE PUEDE HOY.**
**DÓNDE SE VE.** Cierre canónico de piezas de producto: se aleja y el dispositivo queda chiquito con el logo. También el revelado de "nube de paneles" (ver gesto 14).

---

**03. TRUCK / TRACKING LATERAL — "travelling lateral"**
**QUÉ ES.** La cámara se traslada de costado sin girar. Las capas cercanas barren rápido, las lejanas apenas: es el paralaje puro.
**CÓMO SE HACE EN AE.** Cámara de **un nodo** (`autoOrient = AutoOrientType.NO_AUTO_ORIENT`), keyframes sólo en X. Con dos nodos hay que mover POI y posición en paralelo o la cámara gira la cabeza mientras se traslada (que es otro gesto, el 06).
**TIEMPOS Y CURVAS.** **60–150 cuadros**, prácticamente lineal (influencia 5–10%). Un truck con easy-ease fuerte se lee como "arranque y frenada de auto" y llama la atención sobre sí mismo.
**CLASIFICACIÓN. (a) SE PUEDE HOY** — y con la alternativa mejor: **movelo como null padre del mundo**, no como cámara. Idéntico en pantalla, más fácil de encuadrar, cero riesgo de interpolación espacial.
**DÓNDE SE VE.** El desplazamiento lateral de galerías de capturas de pantalla, en prácticamente todo film de app.

---

**04. PEDESTAL / BOOM — "pedestal"**
**QUÉ ES.** La cámara sube o baja sin inclinarse. El horizonte se mantiene; el encuadre se corre.
**CÓMO SE HACE EN AE.** Cámara de un nodo, keyframes sólo en Y. Con dos nodos: mover `Position.y` **y** `POI.y` la misma cantidad — si movés sólo uno, es un tilt.
**TIEMPOS Y CURVAS.** **60–120 cuadros**, casi lineal. Es el movimiento de recorrido vertical de una página larga o de una pila de tarjetas.
**CLASIFICACIÓN. (a) SE PUEDE HOY.** Con dos nodos: dos keyframes, mismo delta, misma curva, en cámara y POI.
**DÓNDE SE VE.** Recorridos de "cómo funciona" con pasos apilados verticalmente.

---

**05. CRANE / GRÚA — "grúa"**
**QUÉ ES.** Descenso o ascenso combinado con avance: la cámara baja *y* se acerca en un solo arco. Es el movimiento más "producción cara" del repertorio.
**CÓMO SE HACE EN AE.** Es un arco en Y-Z. Nulo 3D padre de la cámara, o `Position` de la cámara con keyframes intermedios. **Con dimensiones separadas es donde brilla**: Y con freno largo, Z casi lineal — curvas distintas por eje es lo que hace que no parezca una diagonal recta.
**TIEMPOS Y CURVAS.** **75–150 cuadros**. Y: `cubic-bezier(0.25, 0, 0.1, 1)`. Z: `cubic-bezier(0.1, 0, 0.9, 1)`.
**CLASIFICACIÓN. (a) SE PUEDE HOY, con dimensiones separadas y 3–5 keyframes por eje.** Si el arco es pronunciado, hornear cada 3 cuadros. **Comprobar que el exportador fuerza lineal espacial** o el arco de AE no será el arco del motor.
**DÓNDE SE VE.** Aperturas de piezas corporativas; el plano establishing de un escenario de paneles.

---

**06. ORBIT / ÓRBITA — "órbita", "arco"**
**QUÉ ES.** La cámara gira alrededor de un objeto que se mantiene centrado. Revela el volumen: es la prueba de que algo es 3D.
**CÓMO SE HACE EN AE.** **El caso canónico de la cámara de dos nodos.** POI fijo en el objeto; posición de cámara recorriendo un arco. La otra receta, que muchos profesionales prefieren: nulo 3D en el centro del objeto, cámara emparentada al nulo desplazada en Z, y se anima **la rotación Y del nulo** — un solo valor, sin trayectoria espacial ninguna.
**TIEMPOS Y CURVAS.** **60–150 cuadros** para 30–90° de arco. Órbitas de 360° casi nunca: se leen como salvapantallas. `cubic-bezier(0.3, 0, 0.3, 1)`.
**CLASIFICACIÓN. (a) SE PUEDE HOY — pero SÓLO por la receta del nulo rotado.** Emparentado + rotación Y de un nulo es una única propiedad escalar animada: exacta, dos keyframes, cero riesgo espacial. La receta de POI + arco de posición exige hornear cada 2°.
**Advertencia del oficio, encontrada en foros:** los principiantes orbitan de más. El consenso profesional es que la órbita se gana con un objeto que la merezca (un dispositivo, un logo con volumen) y que en escenas de paneles planos delata que los paneles son planos.
**DÓNDE SE VE.** Revelados de producto físico y de logotipos extruidos.

---

**07. PAN / TILT DESDE TRÍPODE — "paneo", "inclinación"**
**QUÉ ES.** La cámara gira sin trasladarse. **No hay paralaje**: todo el plano se corre en bloque. Se distingue del truck justamente en eso, y ésa es la razón para elegir uno u otro.
**CÓMO SE HACE EN AE.** Cámara de **un nodo**, animar `ADBE Rotate Y` (pan) / `ADBE Rotate X` (tilt). Con dos nodos: mover el POI dejando la posición quieta.
**TIEMPOS Y CURVAS.** **30–90 cuadros** para 10–30°. Ojo con el gran angular: un pan de 30° con zoom bajo distorsiona los bordes de forma muy visible.
**CLASIFICACIÓN. (a) SE PUEDE HOY.** Trivial: una rotación, dos keyframes.
**DÓNDE SE VE.** Recorridos por murales/timelines horizontales.

---

**08. WHIP PAN / SWISH PAN — "paneo látigo"**
**QUÉ ES.** Un giro brutalmente rápido que emborrona todo y sirve de corte encubierto entre dos escenas. Es la transición de más energía que hay.
**CÓMO SE HACE EN AE.** Dos formas. (i) **Con cámara:** rotación Y de 40–90° en pocos cuadros, con obturador alto. (ii) **Con capas:** todo el bloque A sale de cuadro en X mientras el bloque B entra, obturador alto. La receta más citada en tutoriales pone los keyframes **repartidos alrededor del corte**: para un látigo de 10 cuadros, keyframe 5 cuadros antes del corte y 5 después.
**TIEMPOS Y CURVAS.** **6–12 cuadros en total.** Salida de A acelerando (`cubic-bezier(0.5, 0, 1, 1)`), entrada a B frenando (`cubic-bezier(0, 0, 0.4, 1)`) — leídas juntas dan una campana. **Obturador 180° no alcanza: para látigo se sube a 270–360°.** Con audio (un "whoosh") es donde el gesto realmente funciona; sin audio se lee como un error.
**CLASIFICACIÓN. (a) SE PUEDE HOY,** y es de los pocos gestos donde tu obturador con ángulo y fase es la pieza indispensable. **Comprobar:** que el motor pueda subir el ángulo a 360 por plano y no sólo por pieza. Si el ángulo es global, esto es **(b): exponer ángulo de obturador variable en el tiempo** (en AE el ángulo es de la comp, no de la capa — así que si querés 180 general y 360 en el látigo, necesitás un mecanismo propio).
**DÓNDE SE VE.** Omnipresente en piezas de ritmo alto y en todo lo publicado para redes.

---

**09. PUSH-THROUGH / ATRAVESAR — "atravesar", "cruzar el plano"**
**QUÉ ES.** La cámara avanza y **pasa a través** de un plano — entre dos paneles, por una abertura, o directamente atravesando una capa que se abre. Es un push in que además cambia de escena.
**CÓMO SE HACE EN AE.** Push in rápido en Z que cruza el z de la capa frontal. Como en Classic 3D las capas no se intersectan y desaparecen al quedar detrás, la transición ocurre sola. Se suele acompañar con la capa frontal escalando y separándose (dos mitades que se abren).
**TIEMPOS Y CURVAS.** **10–18 cuadros** el cruce, con aceleración fuerte: `cubic-bezier(0.55, 0, 0.9, 1)`. Obturador 270°.
**CLASIFICACIÓN. (a) SE PUEDE HOY.** **Pero verificá una cosa en tu motor**: qué hace three.js cuando la cámara cruza el plano de una malla — el `near` de la cámara y el recorte. En AE la capa simplemente deja de verse; en three.js vas a ver el recorte del near plane, que es distinto. Si no coincide, es **(b): declarar el plano cercano de la cámara y su equivalencia con el comportamiento de AE.**
**DÓNDE SE VE.** Transición estándar de piezas de tecnología: se entra "dentro" del producto.

---

**10. DOLLY ZOOM / VÉRTIGO — "efecto Vértigo", "contra-zoom"**
**QUÉ ES.** La cámara avanza mientras el zoom se abre (o al revés). El sujeto conserva el tamaño y **el fondo se deforma**. Es un gesto de inquietud, no de elegancia.
**CÓMO SE HACE EN AE.** Animar `ADBE Position` en Z y `ADBE Camera Zoom` en sentidos opuestos. Para que el sujeto no se mueva un pelo: `zoom(t) = zoom₀ · d(t)/d₀`.
**TIEMPOS Y CURVAS.** **45–90 cuadros**, ambos ejes con la MISMA curva o el sujeto "respira".
**CLASIFICACIÓN. (b) EXIGE AGREGAR ALGO AL EXPORTADOR: el zoom / distancia focal de la cámara como propiedad animable.** Tu cadena declara cámara con perspectiva y POI, pero no dice que exporte zoom variable en el tiempo. Es un solo escalar por keyframe (`ADBE Camera Zoom` → `fov` de three.js con la fórmula de la sección 1). Es de las incorporaciones más baratas del catálogo y habilita también el gesto 11.
**DÓNDE SE VE.** Poco en producto, mucho en piezas de marca con tensión.

---

**11. ZOOM PURO — "zoom óptico"**
**QUÉ ES.** Cambia la distancia focal sin mover la cámara. **Aplana** la escena: el paralaje no cambia. Se lee distinto del push in y por eso conviene tenerlo.
**CÓMO SE HACE EN AE.** `ADBE Camera Zoom` con dos keyframes.
**TIEMPOS Y CURVAS.** 30–60 cuadros. En motion graphics se usa poco solo y mucho como remate rápido de 8–12 cuadros.
**CLASIFICACIÓN. (b) MISMA ADICIÓN QUE EL 10.** Sin ella, sustituís por un push in (que no es lo mismo) o por escalar el mundo con un null (que sí se le parece bastante si las capas están casi coplanares — receta de reemplazo válida hoy).

---

**12. RACK FOCUS / CAMBIO DE FOCO — "cambio de foco"**
**QUÉ ES.** El foco viaja de un plano de profundidad a otro. La atención se muda sin que nada se mueva.
**CÓMO SE HACE EN AE.** Activar `ADBE Camera Depth of Field`, y animar `ADBE Camera Focus Distance`. `ADBE Camera Aperture` fija la agresividad, `ADBE Camera Blur Level` la intensidad. AE ofrece "Set Focus to Layer" y "Link Focus Distance to Layer" para no calcular la distancia a mano.
**TIEMPOS Y CURVAS.** **12–25 cuadros**, `cubic-bezier(0.4, 0, 0.2, 1)`. Aperturas útiles: en una comp 1920, entre 20 y 80 px de apertura ya da un desenfoque legible sin volverse sopa.
**CLASIFICACIÓN. (c) NO VALE LA PENA TODAVÍA como profundidad de campo real** — exige un desenfoque por profundidad, que es un efecto, y eso rompe tu regla de fidelidad medida a nivel de píxel (el desenfoque de AE y el de three.js no van a coincidir nunca al 1%).
**PERO HAY UNA RECETA (a) QUE SÍ CIERRA:** **doble copia**. Exportá cada capa candidata dos veces como PNG — nítida y desenfocada, la desenfocada **hecha en AE**, o sea con los píxeles reales de AE. Las apilás con 1 unidad de Z de diferencia y hacés un cruce de opacidad de 15 cuadros. Los píxeles vienen de AE, así que la fidelidad se conserva por definición, y el gesto queda disponible sin tocar el exportador. Cuesta assets, no arquitectura.
**CUÁNDO APORTA.** Cuando hay dos planos de profundidad claramente separados y querés mudar la atención sin mover nada. Con una sola capa plana el desenfoque no aporta nada y encima delata que es plana.

---

**13. TREPIDACIÓN / CÁMARA EN MANO — "camera shake", "handheld"**
**QUÉ ES.** Un temblor mínimo y continuo. No se percibe como movimiento: se percibe como que el plano **está vivo**. Es la diferencia entre "render" y "filmado".
**CÓMO SE HACE EN AE.** Todo el mundo lo hace con `wiggle()`, y el consenso del oficio es que **el wiggle se nota**: es demasiado parejo. La receta manual que se recomienda en su lugar: mover a mano cada 2–3 cuadros, ±10–20 px en X y ±5–15 px en Y sobre 1920, keyframes en Bezier, y **obturador a 360** para que el desenfoque acompañe.
**TIEMPOS Y CURVAS.** Continuo. Para producto, la mitad de esos valores: **±3–8 px**, cada 3–4 cuadros. Más que eso ya es "acción".
**CLASIFICACIÓN. (a) SE PUEDE HOY, horneado.** Un `wiggle` no se exporta, pero **un wiggle horneado a keyframes sí** — y es exactamente el mismo pipeline que necesitás para el gesto 06. Anotalo como estrategia general: **cualquier expresión se convierte en keyframes por cuadro y tu formato ya la soporta.** Poné el temblor en un nulo padre, no en la cámara, así lo podés apagar por plano.
**DÓNDE SE VE.** Debajo de casi todo lo que parece caro.

---

**14. CORTE DE CÁMARA — "camera cut", "snap"**
**QUÉ ES.** La cámara salta instantáneamente a otra posición. No es un movimiento: es un **corte**, y en una pieza de 25 s es lo que le da estructura de montaje.
**CÓMO SE HACE EN AE.** Keyframes **HOLD** en posición/POI/rotación. Una cámara con seis keyframes HOLD son seis planos.
**TIEMPOS Y CURVAS.** 0 cuadros. Los planos entre cortes: **45–120 cuadros** en piezas de producto, **20–45** en piezas de ritmo alto.
**CLASIFICACIÓN. (a) SE PUEDE HOY** — tu formato ya soporta HOLD explícitamente. **Este es el gesto que probablemente más te faltaba y el más barato de todos.** "El video es muy lento y no tiene beat" se ataca antes con cortes que con animación: un plano que dura 25 segundos es lento por definición, por mucho que se mueva adentro.
**DÓNDE SE VE.** Todo. Es la base del montaje.

---

### — CONSTRUCCIÓN DEL ESPACIO —

---

**15. MULTIPLANO / PARALAJE — "multiplane", "paralaje"**
**QUÉ ES.** Capas repartidas en Z que al moverse la cámara se desplazan a velocidades distintas. Es la única forma de que un montón de planos se lea como un espacio.
**CÓMO SE HACE EN AE.** Interruptor 3D en cada capa, repartir Z, **y re-escalar para compensar** con `escala% = (d/zoom)·100`. Si no compensás, alejar una capa la achica y perdés la composición.
**Números que la literatura no da y acá van como criterio operativo (inferencia mía, no medición):** con zoom 2666, un reparto útil es **fondo z=+1500, medio z=+400, sujeto z=0, adelanto z=−600**. La regla es que la separación entre planos vecinos sea **≥15% del zoom** o el paralaje no se percibe. Menos que eso es ruido de subpíxel.
**TIEMPOS Y CURVAS.** No tiene tiempos propios: es una disposición, no una animación. Los tiempos los pone el movimiento de cámara que la recorre.
**CLASIFICACIÓN. (a) SE PUEDE HOY, entero.**
**DÓNDE SE VE.** Es la base de todo. El consejo profesional recurrente: **"dolly lento + separación fuerte en Z" gana a "orbitar"**, y los principiantes hacen lo contrario.

---

**16. NUBE DE PANELES / GALERÍA EN EL ESPACIO — "floating panels", "card wall"**
**QUÉ ES.** Doce, veinte tarjetas o capturas de pantalla flotando a distintas profundidades y desplazamientos. Es *el* recurso de las piezas de producto de software.
**CÓMO SE HACE EN AE.** Cada panel es una capa 3D. Se dispone en una grilla con **perturbación**: la grilla pura se lee como pared, la grilla perturbada se lee como espacio. Todos emparentados a un nulo 3D que orienta el conjunto (típico: rotación Y de 15–25° para que la pared no sea frontal).
**Lo que separa una nube viva de una utilería quieta:** los paneles **no están quietos**. Cada uno tiene una deriva propia en Z de ±20–40 px con período de 4–7 segundos, desfasada panel a panel. Es imperceptible individualmente y transforma el plano.
**TIEMPOS Y CURVAS.** Entrada de la nube: escalonado de **2–4 cuadros** entre paneles, cada panel 12–18 cuadros, `cubic-bezier(0.16, 0, 0.2, 1)`. La deriva: horneada, sinusoidal, continua.
**CLASIFICACIÓN. (a) SE PUEDE HOY.** Emparentado + transformaciones + horneado de la deriva. **Éste es el gesto que arregla tu problema concreto**: la nube hace cosas mientras la cámara casi no se mueve.
**DÓNDE SE VE.** Films de lanzamiento de casi cualquier producto de software.

---

**17. MOCKUP DE DISPOSITIVO CON CAPAS PLANAS — "device mockup"**
**QUÉ ES.** Un teléfono o una laptop armados con planos, no con un modelo 3D.
**CÓMO SE HACE EN AE.** El método clásico documentado: **tres vistas** (frente, canto, lateral) ensambladas como capas 3D rotadas 90° entre sí, todas emparentadas a un nulo que es "el teléfono". La pantalla es una capa aparte a **−1 unidad de Z** respecto del marco (si es coplanar, parpadea). Un caso más simple y muy usado: **sólo el frente**, con el canto fingido por el gesto 18.
**Y una decisión estructural:** el marco del dispositivo puede ser un PNG con sombras y brillos ya horneados. No perdés nada — el marco no cambia de contenido nunca.
**TIEMPOS Y CURVAS.** El dispositivo entra con el nulo: 15–20 cuadros, con un sobrepaso de rotación de 3–5° (3 keyframes, no una curva).
**CLASIFICACIÓN. (a) SE PUEDE HOY.** Capas de forma rasterizadas + emparentado + rotaciones 3D. **Con un límite honesto: Classic 3D de AE no intersecta capas.** Un armado de tres vistas se ve bien en un rango de ángulos y se rompe fuera de él — le pasa a AE también, no es un límite tuyo. Mantené la rotación dentro de ±35°.
**DÓNDE SE VE.** Todas las plantillas comerciales de app promo hacen exactamente esto.

---

**18. FALSA EXTRUSIÓN POR APILADO — "faux 3D extrusion", "extrusión falsa"**
**QUÉ ES.** Un logo o una letra con espesor, hechos con copias apiladas.
**CÓMO SE HACE EN AE.** Duplicar la capa N veces, cada copia **1 px atrás en Z** (con expresión, `index-1`). N copias = N píxeles de espesor. Las copias traseras suelen ir más oscuras. El consejo de los foros: sumar una luz o un bisel a las copias traseras para vender el volumen.
**Refinamiento que casi nadie hace y se nota:** cada "rodaja" debería desplazarse hacia el punto de fuga escalando con la profundidad, no sólo offsetear en Z ortogonalmente.
**TIEMPOS Y CURVAS.** No tiene: es una construcción. Se anima girando el nulo padre 15–30° en Y, 20–30 cuadros.
**CLASIFICACIÓN. (a) SE PUEDE HOY,** y con una nota de costo: 40 copias de una capa son 40 capas en tu documento y 40 mallas en three.js. Para un logo, aceptable. Para texto largo, no.
**ALTERNATIVA (b) si se vuelve central:** rasterizar la extrusión completa a PNG desde una vista fija — pero pierde el giro, que es justo para lo que sirve. Yo la dejaría en (a) con tope de ~24 copias.
**Contexto:** el renderizador **CINEMA 4D** de AE hace extrusión real de texto y formas, y desde AE 2023 existe el renderizador **Advanced 3D** con modelos, sombras y profundidad de campo reales. Ninguno de los dos te sirve — no exportan a tu formato — pero si algún día alguien abre tu proyecto en AE y cambia el renderizador, todo cambia. Fijá `Classic 3D` explícitamente desde el script.

---

**19. GIRO DE TARJETA — "card flip"**
**QUÉ ES.** Un panel gira sobre su eje vertical y muestra la otra cara (otro contenido, otro dato).
**CÓMO SE HACE EN AE.** Dos capas coplanares con 1 unidad de Z entre ellas, ambas emparentadas a un nulo; el nulo gira 180° en Y. La cara trasera está pre-rotada 180° para no verse espejada. La conmutación de cuál se ve la hace **la Z**, sola.
**TIEMPOS Y CURVAS.** **14–20 cuadros** para 180°. `cubic-bezier(0.35, 0, 0.15, 1)`, más un sobrepaso de 6–10° resuelto con un tercer keyframe (0° → 186° en cuadro 15 → 180° en cuadro 20).
**CLASIFICACIÓN. (a) SE PUEDE HOY.** **Verificá una cosa**: qué hace tu motor con una capa vista de canto exacto (rotación 90°) y con la cara trasera. AE muestra la capa espejada por detrás; three.js con `side: FrontSide` la haría desaparecer. Es una decisión de material que hay que fijar y documentar, no un defecto.
**DÓNDE SE VE.** Revelado de estadísticas, cambio de estado en interfaces.

---

**20. ESCALONADO EN PROFUNDIDAD — "z-stagger", "entrada en profundidad"**
**QUÉ ES.** Los elementos entran desde el fondo hacia adelante (o al revés), uno tras otro, **y el escalonado sigue la Z, no el orden de la lista**. El ojo lee una ola que avanza hacia él.
**CÓMO SE HACE EN AE.** Cada capa entra desde `z + 400` hasta su z final, con opacidad 0→100. El retardo se calcula por profundidad: `retardo = (z_max − z_capa) / z_max · retardo_total`.
**TIEMPOS Y CURVAS.** Cada capa: **12–18 cuadros**. Retardo entre vecinas: **2–4 cuadros**. Total de una ola de 10 elementos: 40–55 cuadros. `cubic-bezier(0.16, 0, 0.2, 1)`.
**CLASIFICACIÓN. (a) SE PUEDE HOY, entero.** Es el gesto de mejor relación resultado/costo del catálogo entero, y es exactamente lo contrario de "utilería quieta".

---

**21. SOMBRA DE CONTACTO FALSA — "fake contact shadow"**
**QUÉ ES.** La mancha oscura debajo de un panel flotante. Sin ella, todo flota en el vacío y el espacio no se lee.
**CÓMO SE HACE EN AE con luces:** una luz, `Casts Shadows` en la capa, `Accepts Shadows` en el suelo, ajustar `Shadow Darkness` y `Shadow Diffusion`.
**SIN LUCES, que es tu caso:** un PNG de mancha difusa (un óvalo con degradado, hecho una vez), capa 3D acostada (rotación X 90°), emparentada al objeto, con la opacidad **ligada a la altura**: cuanto más alto el objeto, más tenue y más grande la sombra. Como no tenés expresiones: se hornea, o directamente se anima la opacidad y la escala de la sombra con los mismos keyframes que la altura del objeto.
**TIEMPOS Y CURVAS.** Los mismos que el objeto que la produce, siempre. Una sombra desfasada del objeto es peor que ninguna.
**CLASIFICACIÓN. (a) SE PUEDE HOY** — con un PNG en la biblioteca de recursos.
**Y aprovechá esto:** las luces son de las cosas que **no vale la pena agregar al exportador** (c). Una luz de AE es un modelo de iluminación entero que tendrías que replicar en three.js con exactitud de píxel. La sombra falsa cuesta un PNG y da el 90% del resultado. La contra honesta: la sombra falsa no reacciona a rotaciones ni a otros objetos.

---

**22. BAÑO DE LUZ / CAMA CLARA — "light wash"**
**QUÉ ES.** Un gradiente de luz que barre una superficie, o una cara del objeto más clara que la otra. Es lo que hace que un plano blanco no parezca un plano blanco.
**CÓMO SE HACE EN AE SIN LUCES.** Un sólido del color de la luz, en modo Add… **que no tenés**. La versión que sí podés: un **PNG con degradado** (blanco a transparente) puesto sobre la capa, opacidad 20–40%, y movido/rotado. Es la TAPA, pero al revés: en vez de ocultar, aclara.
**TIEMPOS Y CURVAS.** El barrido: 20–40 cuadros, `cubic-bezier(0.3, 0, 0.3, 1)`. Se usa como acento en una entrada, no como estado permanente.
**CLASIFICACIÓN. (a) SE PUEDE HOY con un PNG,** aunque con una pérdida real: sin modos de fusión, el degradado se compone por opacidad y no "quema". Sobre fondos oscuros la diferencia se nota.
**Y acá sí valdría la pena mirar (b):** el modo de fusión **Add / Screen** es de lejos el modo más rentable de agregar al exportador. Es un solo enum por capa, three.js lo soporta nativamente (`AdditiveBlending`), y desbloquea baños de luz, destellos, reflejos y estelas. Es la adición de mejor retorno de todo mi frente después del zoom animable.

---

## 3. LA PROPORCIÓN — dónde fallaste

Ésta es la parte que más te importa, así que separo con cuidado **lo que encontré publicado** de **lo que estoy infiriendo**.

### Lo que está publicado

- **"Animá los objetos O la cámara, no los dos."** Es el consejo que aparece repetido en la comunidad de Adobe como principio de trabajo. No es una regla estética: es que mezclar las dos animaciones en el mismo momento vuelve el resultado impredecible y difícil de controlar.
- **"Los principiantes se enfocan en rotar la cámara; los profesionales usan dollys lentos con separación fuerte en Z."** Aparece formulado casi textualmente en material de enseñanza. Traducción: el trabajo está en **armar el espacio**, no en recorrerlo.
- **Movimiento motivado.** Regla de cinematografía, plenamente aplicable: la cámara se mueve porque algo lo pide — un revelado, un cambio de atención, una transición emocional. Cuando el movimiento es motivado se lee natural; cuando no, se lee decorativo. Y para motion graphics específicamente: **"movimientos elaborados en escenas simples se sienten excesivos"**.
- **Google, sobre el sistema de movimiento de Gemini** (la referencia que admira tu usuario — el film de lanzamiento lo hizo el estudio Ordinary Folk): el movimiento "no es meramente decorativo"; **cada animación tiene un principio y un final definidos**; hay una **secuencia contextual donde "una cosa lleva a la siguiente"**; la velocidad produce **anticipación y después soltura**. Todo eso son afirmaciones sobre **elementos**, no sobre cámara. En la descripción oficial de su propio sistema de movimiento, la cámara ni aparece.

Ahí está tu diagnóstico confirmado desde la fuente misma de la referencia: **la pieza que admira no tiene una filosofía de cámara, tiene una filosofía de coreografía.**

### Lo que NO encontré

**No encontré ningún desglose publicado que dé porcentajes**: cuántos segundos de cámara sobre cuántos de pieza, cuánto desplazamiento. Los estudios publican piezas, no hojas de cálculo. Lo que sigue es **mi síntesis**, formulada para que la puedas encodear y medir — no es una cita.

### El presupuesto de movimiento (inferencia mía, para probar)

**1 — Regla del 10%.** En un plano de 60–150 cuadros, el desplazamiento aparente que produce la cámara sobre un punto del plano z=0 no debería pasar de **5–12% del ancho de cuadro**. Es medible en tu motor sin renderizar: proyectás un punto en el primer y el último cuadro del plano y restás. Todo lo que exceda eso deja de ser "el plano está vivo" y pasa a ser un **gesto narrativo**, y entonces tiene que durar poco: 6–18 cuadros, no 90.

**2 — Regla del reparto.** En cualquier ventana de **30 cuadros** tiene que haber **al menos 2 o 3 eventos de elemento**: una entrada, un giro, una tapa que corre, un número que salta, un panel que cambia. Si en 30 cuadros el único evento es la cámara, ese plano está muerto. Ésa es literalmente la definición operativa de lo que te dijo tu usuario, y es una compuerta: contá eventos por ventana sobre el documento exportado, sin renderizar nada.

**3 — Regla de la no coincidencia.** La cámara **no arranca ni frena junto con un evento de elemento**. Se solapan. Si la cámara acelera justo cuando entra el panel, el ojo lee una sola cosa y perdés los dos gestos. Desfasá 4–8 cuadros. Esto también es verificable sobre el documento.

**4 — Continua contra discreta.** La cámara es **continua** (deriva lenta, casi lineal, atraviesa los cortes). Los elementos son **discretos** (entran, hacen, paran, se quedan quietos). Si invertís los roles —cámara a saltos y elementos a la deriva— la pieza se siente inestable y sin foco.

**5 — La proporción, en una frase.** *La cámara aporta menos movimiento aparente que el elemento más rápido del plano, por un factor de alrededor de 10.* Un panel que entra recorre 400 px en 15 cuadros (27 px/cuadro). La cámara en ese mismo plano debería estar aportando del orden de **2–3 px/cuadro**. Cuando esa relación se invierte —que es lo que pasó en tu pieza— el espectador lee "me están paseando por una maqueta", que es exactamente "está muerto, no tiene coreografía".

**6 — Y el arreglo más barato no es de cámara: es de montaje.** Una pieza de 25 s con **un solo plano** es lenta por definición. Seis keyframes HOLD en la cámara (gesto 14) la convierten en seis planos de ~4 s. Eso solo, sin animar un elemento más, ya cambia el pulso. El "beat" que falta se construye con **cortes**, y los cortes en tu cadena ya funcionan hoy y cuestan seis keyframes.

---

## 4. matchNames — confirmados, no confirmados, y uno que casi invento

**CONFIRMADOS** contra la guía de scripting de AE (docsforadobe):

```
ADBE Camera Layer
  ADBE Camera Options Group
    ADBE Camera Zoom
    ADBE Camera Depth of Field
    ADBE Camera Focus Distance
    ADBE Camera Aperture
    ADBE Camera Blur Level
    ADBE Iris Shape / ADBE Iris Rotation / ADBE Iris Roundness /
    ADBE Iris Aspect Ratio / ADBE Iris Diffraction Fringe /
    ADBE Iris Highlight Gain / ADBE Iris Highlight Threshold /
    ADBE Iris Hightlight Saturation      <-- el error de tipeo "Hightlight" ESTÁ EN LA API. No lo corrijas.

ADBE Transform Group
  ADBE Anchor Point · ADBE Position · ADBE Position_0 / _1 / _2 (X/Y/Z separadas)
  ADBE Scale · ADBE Orientation · ADBE Rotate X / Y / Z · ADBE Opacity
```

**NO CONFIRMADO — y es el que más te puede morder:** el matchName del **Punto de Interés** de la cámara. La creencia general del oficio es que es `ADBE Anchor Point` (el POI ocupa la ranura del punto de anclaje en capas de cámara y luz), pero **no lo pude confirmar en fuente oficial en esta sesión**. No lo uses a ciegas: accedelo por la propiedad tipada `cameraLayer.property("ADBE Transform Group").property("Point of Interest")` o directamente imprimí `.matchName` de cada hija del grupo Transform de una cámara real antes de escribir la línea. Un matchName equivocado te devuelve `null` y el script muere tres líneas después, en otro lado.

**UNO QUE CASI INVENTO, y lo cuento porque es exactamente el modo de fallar que me advertiste.** Busqué `AutoOrientType.ORIENT_TOWARDS_POINT_OF_INTEREST` porque *suena* como debería llamarse. **No existe.** El enum real es:

```
AutoOrientType.CAMERA_OR_POINT_OF_INTEREST   → cámara de DOS NODOS
AutoOrientType.NO_AUTO_ORIENT                → cámara de UN NODO
AutoOrientType.ALONG_PATH                    → orientar según la trayectoria
```

Un mismo enum sirve para "mirar a la cámara activa" (capas AV) y "mirar al punto de interés" (cámaras y luces). Adobe confirma la equivalencia: **hacer que una cámara sea de dos nodos es exactamente poner su auto-orientación en "Orientar hacia el punto de interés"** — no son dos tipos de objeto, es un ajuste.

**OTROS, alta confianza pero verificalos:** `LayerCollection.addCamera(name, centerPoint)` (confirmado como el método de creación), `layer.threeDLayer`, `comp.shutterAngle`, `comp.shutterPhase`, `comp.motionBlurSamplesPerFrame`, `comp.motionBlurAdaptiveSampleLimit`, `comp.renderer`. El obturador es **de la composición, no de la capa** — sólo el interruptor de activación es por capa. Si querés 180° general y 360° en un látigo, en AE no se puede sin partir en comps, así que eso es una decisión de diseño de tu formato, no una traducción.

---

## 5. Resumen de las adiciones al exportador que recomiendo, por retorno

1. **Modo de fusión Add / Screen por capa** — un enum, nativo en three.js, desbloquea luz, destellos, estelas, baños. (gesto 22)
2. **Zoom / distancia focal de la cámara animable** — un escalar por keyframe, fórmula de conversión ya resuelta en la sección 1. Desbloquea zoom y dolly zoom. (gestos 10, 11)
3. **Plano cercano de la cámara declarado** — no es una capacidad nueva, es cerrar una divergencia silenciosa entre AE y three.js al atravesar planos. (gesto 09)
4. **Ángulo de obturador variable por tramo** — no existe en AE; es una extensión tuya. Sólo si el látigo se vuelve central. (gesto 08)

Y dos cosas que recomiendo **no** agregar: **luces** (se fingen con PNG por una fracción del costo, gesto 21) y **profundidad de campo real** (la receta de doble copia da el gesto sin romper la fidelidad medida, gesto 12).

---

**Fuentes:**
- [Working with Cameras in After Effects — School of Motion](https://schoolofmotion.com/blog/cameras-after-effects)
- [Inside the After Effects camera — Chris Zwar, ProVideo Coalition](https://www.provideocoalition.com/inside-the-after-effects-camera/)
- [Camera Control, Part 2: Graph Editor & Dolly Rigs — Chris & Trish Meyer, ProVideo Coalition](https://www.provideocoalition.com/camera_control_2/)
- [Camera Control, Part 1: Auto-Orient & Orbit — ProVideo Coalition](https://www.provideocoalition.com/camera-control-1/)
- [One node VS two node camera: Best uses — Creative COW](https://creativecow.net/forums/thread/one-node-vs-two-node-camera-best-uses/)
- [About camera moving technique — Adobe Community](https://community.adobe.com/t5/after-effects-discussions/about-camera-moving-technique/m-p/10087856)
- [Cameras, lights, and points of interest — Adobe Help](https://helpx.adobe.com/after-effects/using/cameras-lights-points-interest.html)
- [After Effects Scripting Guide — matchNames de capa de cámara](https://ae-scripting.docsforadobe.dev/matchnames/layer/cameralayer/)
- [After Effects Scripting Guide — matchNames de AVLayer](https://ae-scripting.docsforadobe.dev/matchnames/layer/avlayer/)
- [After Effects Scripting Guide — CameraLayer](https://ae-scripting.docsforadobe.dev/layer/cameralayer/)
- [Essential Camera Controls and Movements in After Effects — MJ Behroozi](https://medium.com/@mj.behroozi/essential-camera-controls-and-movements-in-after-effects-a-motion-designers-guide-to-cinematic-af27f8f9f205)
- [Whip (swish) pans in After Effects & Premiere — ProVideo Coalition](https://www.provideocoalition.com/whip-swish-pans-in-after-effects-premiere/)
- [Create Seamless Transitions Using the Whip Pan — PremiumBeat](https://www.premiumbeat.com/blog/create-seamless-transitons-whip-pan/)
- [Cinematography Tip: Working with Motivated Camera Movement — PremiumBeat](https://www.premiumbeat.com/blog/cinematography-tip-motivated-camera-movement/)
- [How to Simulate Camera Shake in After Effects — School of Motion](https://schoolofmotion.com/blog/how-to-simulate-camera-shake-adobe-after-effects)
- [Creating Handheld Camera Shake — Pixflow](https://pixflow.net/blog/creating-handheld-camera-shake-after-effects-and-premiere/)
- [Fake 3D Shape layers with "perspective" — Creative COW](https://creativecow.net/forums/thread/fake-3d-shape-layers-with-perspective/)
- [How to 'thicken' a 3D layer/object in AE? — Creative COW](https://creativecow.net/forums/thread/how-to-thicken-a-3d-layerobject-in-aeae/)
- [Parallax Effect in After Effects — Motion Design School](https://motiondesign.school/blog/parallax-in-after-effects/)
- [Tutorial: Create a 3D Scene from a Photo — School of Motion](https://schoolofmotion.com/blog/3d-photo-after-effects)
- [3D Device Animations After Effects Tutorial — Sickboat](https://sickboat.com/blogs/blog/3d-device-animations-after-effects-tutorial)
- [Gemini AI Visual Design — Google Design](https://design.google/library/gemini-ai-visual-design)
- [How to Design for Animation with Ordinary Folk — School of Motion](https://schoolofmotion.com/blog/how-to-design-for-animation-with-ordinary-folk)
- [Calculate default camera zoom angle from comp resolution — Creative COW](https://creativecow.net/forums/thread/calculate-default-camera-zoom-angle-from-comp-reso/)