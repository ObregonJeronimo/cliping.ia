# CATÁLOGO DE GESTOS — FRENTE "LO QUE HACE QUE SE VEA CARO"
### (detalle de segundo orden: acuse, anticipación, arrastre, sobrepaso, obturador, micro-movimiento, acabado)

---

## 0. CÓMO LEER ESTE CATÁLOGO — dos cosas antes

### 0.1 La tabla de conversión influencia ↔ cubic-bezier (verificada en este repo)

Todas las curvas que doy abajo están en **influencia de AE** y en **cubic-bezier**, y la equivalencia no es una analogía: es la misma curva en otras coordenadas. La fórmula ya está implementada y probada en `C:\Users\Thiago\Documents\cliping.ia\tools\ae\curvas.mjs`:

```
x1 = i_salida/100                    y1 = v_salida · (dt/dv) · x1
x2 = 1 − i_entrada/100               y2 = 1 − v_entrada · (dt/dv) · (i_entrada/100)
```

**Atajo que uso en todo el catálogo:** cuando la velocidad es 0 en los dos keyframes (el caso del 90% del motion design), queda simplemente `cubic-bezier(i_sal/100, 0, 1 − i_ent/100, 1)`.

| nombre de oficio | influencia sal/ent | cubic-bezier | para qué |
|---|---|---|---|
| Easy Ease (el de AE) | 33 / 33 | `0.333, 0, 0.667, 1` | genérico, ya se nota "de fábrica" |
| **20/85 — "el ease de motion"** | 20 / 85 | `0.20, 0, 0.15, 1` | entradas. Sale rápido, aterriza suave. **El caballo de batalla.** |
| **10/90 — llegada de peso** | 10 / 90 | `0.10, 0, 0.10, 1` | algo pesado que se posa |
| **Whip / latigazo** | 85 / 85 | `0.85, 0, 0.15, 1` | tránsitos que cruzan la pantalla |
| Salida rápida | 90 / 15 | `0.90, 0, 0.85, 1` | **salidas** — arranca lento, se va disparado |
| Casi lineal (deriva) | 0 / 0 | `0, 0, 1, 1` | derivas largas de cámara y escala |

**Consecuencia dura para el sobrepaso, y conviene saberla antes de animar:** un tramo con velocidad 0 en ambos extremos **no puede sobrepasar** — `y` queda dentro de [0,1]. El sobrepaso sale de dos lugares: (1) velocidad de salida mayor que la media del tramo, que la fórmula sí representa con `y1 > 1`; o (2) **un keyframe extra explícito**. La opción (2) es la que sobrevive la conversión sin discusión y la que recomiendo en cada gesto de abajo.

### 0.2 matchNames — qué afirmo y qué no

**Confirmados** (los usa la documentación de scripting de Adobe, y varios ya los ejercita el exportador de este repo):
`ADBE Transform Group`, `ADBE Anchor Point`, `ADBE Position`, `ADBE Position_0` / `_1` / `_2` (dimensiones separadas), `ADBE Scale`, `ADBE Rotate X` / `Y` / `Z`, `ADBE Orientation`, `ADBE Opacity`, `ADBE Camera Options Group`, `ADBE Camera Zoom`, `ADBE Camera Focus Distance`, `ADBE Camera Aperture`, `ADBE Blur Level`, `ADBE Text Properties`, `ADBE Text Document`, `ADBE Effect Parade`.

**Confirmados como atributos de objeto (no matchNames)**, y ya leídos por `tools/ae/sondas/exportar.jsx:120-124`:
`comp.motionBlur` (bool), `comp.shutterAngle` (0–720), `comp.shutterPhase` (−360–360), `comp.motionBlurSamplesPerFrame` (2–64), `comp.motionBlurAdaptiveSampleLimit` (16–256), `layer.motionBlur` (bool, por capa), `layer.comment`, `layer.parent`, `layer.stretch`, `layer.inPoint/outPoint`.

**NO CONFIRMADOS — los cito sólo donde hace falta y los marco cada vez.** No los uses sin verificar contra AE con `app.project.item(1).layer(1).property("...").matchName`:
`ADBE Text Animators`, `ADBE Text Animator`, `ADBE Text Selectors`, `ADBE Text Range Selector`, `ADBE Text Percent Start/End/Offset`, `ADBE Text Tracking Amount`, `ADBE Text Position 3D`, `ADBE Text Opacity`, `ADBE Glo2` (Glow), `ADBE Gaussian Blur 2`, `ADBE Echo`, `ADBE Layer Styles`, `ADBE Noise`, `ADBE Vector Blur`. Un matchName inventado no falla ruidosamente: devuelve `null` y el script muere sin decir dónde.

**API de curvas — confirmada:** `KeyframeEase(velocidad, influencia)`, `prop.setTemporalEaseAtKey(i, [inEase], [outEase])`, `prop.setInterpolationTypeAtKey(i, KeyframeInterpolationType.BEZIER|LINEAR|HOLD)`, `prop.dimensionsSeparated = true`.

---
---

# LOS GESTOS

Todos los tiempos en **cuadros a 30 fps**. `(a)` = se puede hoy con transformaciones/emparentado/apilado/tapas. `(b)` = exige agregar algo al exportador. `(c)` = todavía no vale la pena.

---

## G01 · ACUSE DE GOLPE — *Recoil / Impact reaction / Secondary displacement*
**ES:** acuse, retroceso por impacto, reacción secundaria

**QUÉ ES.** Algo entra y lo que ya estaba **se corre un poco y vuelve**. El espectador no lo lee como "se movió el panel": lo lee como *que la cosa que entró pesa*. Es probablemente el gesto que más separa "funciona" de "se ve caro", porque establece que los objetos de la escena **se enteran uno del otro**.

**CÓMO SE HACE EN AE.** El elemento que acusa se emparenta a un **nulo** propio (`layer.parent`), y se anima el nulo, no el elemento — así el acuse no ensucia la animación propia del elemento y se puede reutilizar. En el nulo: 3 keyframes de `ADBE Position` (o `ADBE Position_1` si separaste dimensiones, para que el acuse viva sólo en Y).

- k0 en el cuadro del impacto: 0
- k1 en impacto+2: desplazamiento **en la dirección del golpe**
- k2 en impacto+9: vuelta a 0

Amplitud: **4–12 px** a 1080p para un panel; 2–4 px para tipografía; hasta 25 px si lo que golpea es enorme. Regla de dedo: ~1,5–3% del ancho del elemento que acusa, nunca del que golpea.

**TIEMPOS Y CURVAS.**
- salida del golpe (k0→k1): **2 cuadros**, casi lineal o `0/20` → `cubic-bezier(0, 0, 0.80, 1)`. Tiene que ser **brusco**: un acuse con ease de entrada no es un golpe, es un empujón.
- vuelta (k1→k2): **7–9 cuadros**, `85/10` → `cubic-bezier(0.85, 0, 0.90, 1)`. Vuelve lento. La asimetría 2:8 **es el gesto**.
- Si hay varios elementos alrededor del impacto, escaloná el acuse **1 cuadro por elemento** desde el punto de contacto hacia afuera (onda). No más de 4 elementos.

**CLASIFICACIÓN: (a) — SE PUEDE HOY.**
Receta: nulo padre + `ADBE Position_1` con 3 keys, ease asimétrico. Cero funciones nuevas. **Es el gesto de mejor relación calidad/costo de todo este catálogo para tu problema concreto** ("los paneles eran utilería quieta"): un acuse de 3 keyframes por panel convierte utilería en escenografía reactiva.

**DÓNDE SE VE.** Es la gramática entera de los *product films* de Apple y de las piezas de Buck: cada tarjeta que aterriza mueve un poco a sus vecinas. En el video de Gemini que admira el usuario, es exactamente el mecanismo por el que "las cosas hacen cosas" sin que la cámara se mueva.

---

## G02 · ANTICIPACIÓN — *Anticipation*
**ES:** anticipación, contra-movimiento previo

**QUÉ ES.** Antes de ir hacia allá, va un poco hacia acá. Carga el gesto. Sin anticipación un movimiento *empieza*; con anticipación un movimiento **se decide**.

**CÓMO SE HACE EN AE.** Un keyframe extra **antes** del arranque, en la propiedad que va a moverse (`ADBE Position`, `ADBE Scale`, `ADBE Rotate Z`).

- k0 (reposo) → k1 (anticipación, **contrario**) → k2 (destino)
- Magnitud de la anticipación: **8–15% del recorrido total** en posición; **−2 a −4%** en escala (o sea 100 → 97 → 130); **−4° a −8°** en rotación.

**TIEMPOS Y CURVAS.** **3–5 cuadros** de anticipación para un gesto rápido, **6–8** para uno pesado. Nunca más de 8: pasando eso deja de leerse como carga y se lee como un movimiento aparte.
- entrada a la anticipación: `20/70` → `cubic-bezier(0.20, 0, 0.30, 1)`
- salida de la anticipación al destino: **influencia 0 de salida** → arranca a máxima velocidad. `cubic-bezier(0, 0, 0.15, 1)`. Este keyframe **no lleva ease de salida**: la anticipación se paga con velocidad.

**Cuándo NO.** En elementos de interfaz que representan una superficie física fija (una barra de progreso no se echa para atrás). En cifras y datos. En cualquier cosa que ya esté en pantalla y sólo cambie de estado.

**CLASIFICACIÓN: (a) — SE PUEDE HOY.** Un keyframe más por gesto. Es la mejora más barata que existe.

**DÓNDE SE VE.** Universal — está en los 12 principios de Disney y sobrevivió a todo. En motion moderno se ve reducidísima: 3 cuadros y 10%, casi subliminal.

---

## G03 · ARRASTRE — *Drag / Lag / Follow-through*
**ES:** arrastre, retardo, remolque

**QUÉ ES.** Una parte llega **después** que la otra, porque la sigue. El elemento hijo repite el movimiento del padre desplazado unos cuadros. Es lo que hace que un grupo de objetos parezca tener una articulación en vez de ser un bloque pegado.

**CÓMO SE HACE EN AE.** Dos caminos, y para tu cadena **sólo uno sirve**:
1. *(el que usa el oficio)* expresión `valueAtTime(time − n/fps)` sobre la propiedad del hijo. School of Motion enseña **2–3 cuadros** de retardo como estándar.
2. **(el que te sirve)** copiar los keyframes del padre al hijo y **desplazarlos n cuadros**. Idéntico resultado, sin expresiones, y viaja por tu exportador tal cual.

Estructura: `layer.parent` **no** sirve para esto — el emparentado es instantáneo, no retardado. El arrastre exige keyframes duplicados y corridos, o un nulo intermedio con keys corridos.

**TIEMPOS Y CURVAS.** **2–4 cuadros** de retardo. A 30 fps: 2 cuadros para elementos livianos y rígidos; 3–4 para lo que debería sentirse blando o lejano. Más de 5 cuadros ya no es arrastre, es un segundo evento. La curva es **la misma del padre** — no la cambies, el arrastre está en el tiempo, no en la forma.

**CLASIFICACIÓN: (a) — SE PUEDE HOY**, por el camino 2 (keyframes copiados y corridos). Nota honesta: si alguna vez querés el camino 1, es **(b)** y caro — el exportador tendría que **hornear** la expresión a keyframes (`curvas.mjs` ya declara en su cabecera que las expresiones "se hornean o se reescriben", que es exactamente esto).

**DÓNDE SE VE.** [School of Motion, "Automatic Follow Through"](https://schoolofmotion.com/blog/automatic-follow-through-after-effects) — Joey Korenman usa 2–3 cuadros y lo demuestra sobre una cabeza con orejas.

---

## G04 · SOLAPAMIENTO — *Overlapping action*
**ES:** solapamiento, superposición

**QUÉ ES.** Primo hermano de G03, pero distinto: acá las partes no sólo llegan tarde, **empiezan y terminan en momentos distintos y por eso se pisan**. Nunca hay un cuadro donde todo esté quieto entre dos gestos.

**CÓMO SE HACE EN AE.** Regla operativa: **el gesto B arranca cuando A va por el 60–70% de su recorrido**, no cuando A terminó. En el timeline eso es: si A dura 12 cuadros desde el 0, B arranca en el cuadro 7–8.

Se implementa moviendo bloques de keyframes, no tocando curvas. Con `layer.startTime` si el gesto vive en una precomposición.

**TIEMPOS Y CURVAS.** Solape del **30–40%** de la duración del gesto anterior. Si solapás menos del 20% se ve secuencial y contable; si solapás más del 60% se ve simultáneo y se pierde la jerarquía.

**CLASIFICACIÓN: (a) — SE PUEDE HOY.** Es puro reacomodo de tiempos. **Cuesta cero y probablemente sea la mitad de tu problema de "muerto y lento"**: una pieza donde cada cosa espera que la anterior termine se siente exactamente así.

**DÓNDE SE VE.** Es la diferencia audible entre una lista que "carga" y una lista que "aparece".

---

## G05 · ESCALONADO — *Stagger / Cascade / Offset*
**ES:** escalonado, cascada, desfase

**QUÉ ES.** N elementos iguales entran uno tras otro con un retardo fijo. Convierte una grilla muerta en una ola.

**CÓMO SE HACE EN AE.** Seleccionar las capas y `Animation > Keyframe Assistant > Sequence Layers`, o por script: recorrer las capas y sumar `i · delta` a los tiempos de cada keyframe.

**TIEMPOS Y CURVAS.** Acá los números están bastante consensuados y coinciden entre el mundo AE y el mundo UI:
- **retardo por elemento: 30–80 ms ≈ 1–2,5 cuadros a 30 fps.** El valor por defecto que rara vez falla es **50 ms ≈ 1,5 cuadros** (usá 2).
- **el total del escalonado no debería pasar de ~800 ms (24 cuadros).**
- **no escalones más de 10–15 elementos** con delta fijo; con más, o agrupás, o usás delta decreciente (2, 2, 2, 1, 1, 1, …).
- Curva de cada elemento: la misma para todos, `20/85` → `cubic-bezier(0.20, 0, 0.15, 1)`.
- **Variante cara:** escalonar **desde el centro hacia afuera** o **desde el punto donde estaba mirando el ojo**, en vez de arriba-abajo. Mismo costo, se ve mucho mejor.

**CLASIFICACIÓN: (a) — SE PUEDE HOY.** Reacomodo de tiempos.

**DÓNDE SE VE.** En todos lados; los rangos de 30–80 ms están documentados en las guías de motion para UI y en las de GSAP/Motion.dev.

---

## G06 · SOBREPASO Y ASENTAMIENTO — *Overshoot & settle*
**ES:** sobrepaso, pasada y asentamiento

**QUÉ ES.** Llega, se pasa un poco, vuelve. Comunica energía y elasticidad.

**CÓMO SE HACE EN AE.** **Con un keyframe extra**, no con una curva mágica:
- k1 (origen) → k2 (**destino + sobrepaso**) → k3 (destino)
- Sobrepaso: **6–12% del recorrido** en posición; **+3 a +6%** en escala (100 → 106 → 100); **+3° a +6°** en rotación.

**TIEMPOS Y CURVAS.**
- k1→k2: la duración principal, **8–14 cuadros**, `20/85`.
- k2→k3 (el asentamiento): **5–8 cuadros**, `70/20` → `cubic-bezier(0.70, 0, 0.80, 1)`. El asentamiento es **la mitad o menos** de la duración principal. Si dura lo mismo se ve gomoso.
- Equivalente de una sola curva: `easeOutBack` = `cubic-bezier(0.34, 1.56, 0.64, 1)`. **Ojo:** `y1 = 1.56` sale de [0,1]; tu conversor lo produce sólo si el keyframe tiene **velocidad de salida mayor que la media del tramo**. Si querés fidelidad garantizada, **usá el keyframe extra**.

**CUÁNDO NO USARLO — y esto es la mitad del oficio:**
1. **Texto de lectura.** Un párrafo que sobrepasa es un párrafo que no se lee. La tipografía entra y **para**.
2. **Cifras y datos.** Un número que se pasa y vuelve se lee como *dato inestable*. Mata la credibilidad de un dashboard.
3. **Masas grandes o pesadas.** Un panel de pantalla completa que rebota parece de cartón. A mayor masa, menos sobrepaso — a partir de ~40% del cuadro, cero.
4. **Salidas.** Lo que se va no sobrepasa: acelera y desaparece.
5. **Cuando el elemento entrega el turno.** Si algo entra para que el ojo pase inmediatamente a otra cosa, el sobrepaso **retiene el ojo** y roba el beat.
6. **Todo a la vez.** Sobrepaso en los 12 elementos de una grilla = gelatina.
7. **Marcas serias.** Bancos, salud, legal, lujo: sobrepaso 0–3%, o ninguno. El lujo se mueve **desacelerando**, no rebotando.

**CLASIFICACIÓN: (a) — SE PUEDE HOY.** El proyecto ya declara "sobrepaso real con dimensiones separadas" verificado.

**DÓNDE SE VE.** Mt. Mograph lo trata como *el* truco de bounce/overshoot que todo motion designer debería tener.

---

## G07 · REBOTE AMORTIGUADO — *Damped bounce / Elastic settle*
**ES:** rebote amortiguado, oscilación decreciente

**QUÉ ES.** No un sobrepaso sino **varios**, cada uno más chico. Es el gesto "juguetón" por antonomasia, y el que más rápido delata a un amateur cuando está mal calibrado.

**CÓMO SE HACE EN AE.** Cadena de keyframes con amplitud y período decrecientes. La progresión que funciona:

| oscilación | amplitud | duración |
|---|---|---|
| 1ª (sobrepaso) | 100% (= 8–12% del recorrido) | 6 cuadros |
| 2ª (contra) | 35–40% de la 1ª | 4 cuadros |
| 3ª | 12–15% de la 1ª | 3 cuadros |
| 4ª | ≤5% — **normalmente se corta acá o antes** | 2 cuadros |

Razón de amortiguación ~**0,35** por oscilación, período ~**0,7×** el anterior. Tres oscilaciones es lo normal; cuatro es ya decorativo; cinco es juguete.

**TIEMPOS Y CURVAS.** Total 13–17 cuadros después del impacto. Cada cruce por el valor de reposo va **lineal o casi** (`influencia ≤ 15`); los extremos van con ease alto (`80/80`). Es al revés de la intuición: lo suave está en los picos, no en el medio.

**CLASIFICACIÓN: (a) — SE PUEDE HOY.** 7–9 keyframes por gesto.

**DÓNDE SE VE.** Piezas de marca "amigable" (fintech joven, apps de consumo). **Aviso de criterio:** es el gesto que más rápido envejece una pieza. Usalo con intención, no por defecto.

---

## G08 · ESTIRAR Y APLASTAR POR ESCALA SEPARADA — *Squash & stretch*
**ES:** estirar y aplastar

**QUÉ ES.** El objeto se alarga en la dirección del movimiento y se achata al frenar. En motion graphics moderno es **sutilísimo** — 3–7%, no de dibujo animado.

**CÓMO SE HACE EN AE.** Desactivar el candado de proporción de `ADBE Scale` y animar X e Y por separado, **conservando volumen aproximado**: si X va a 106, Y va a ~94.
- El **anclaje manda**: `ADBE Anchor Point` en el lado que "toca". Un panel que aterriza se aplasta desde su borde inferior, no desde el centro.
- En movimiento horizontal rápido: estirar en X 4–8% durante los cuadros de mayor velocidad, volver a 100 al frenar.

**TIEMPOS Y CURVAS.** El estiramiento vive **2–4 cuadros**, exactamente los de máxima velocidad. El aplastado del aterrizaje: 2 cuadros para llegar al máximo, 5–7 para volver. Curva del retorno: `75/15`.

**CLASIFICACIÓN: (a) — SE PUEDE HOY.** `ADBE Scale` es vectorial y ya viaja; el anclaje también. **No** requiere `dimensionsSeparated` (basta con un valor `[x, y]` distinto por eje), aunque separarlas facilita el guionado.

**DÓNDE SE VE.** Ordinary Folk, Oddfellows. Ojo: en tipografía **no se usa** — deformar una tipografía es un pecado de diseño, no un gesto de animación. Ahí el squash se aplica al **contenedor**, no a las letras.

---

## G09 · PESO — *Weight through asymmetry*
**ES:** peso, masa, inercia

**QUÉ ES.** No es un gesto: es una **regla que gobierna todos los demás**. Dos objetos de tamaños distintos que se mueven con la misma duración y la misma curva pesan lo mismo, y eso es lo que hace que una escena se vea de plástico.

**CÓMO SE HACE EN AE.** Tres perillas, y hay que mover las tres juntas:

| | liviano (etiqueta, ícono) | medio (tarjeta) | pesado (panel, fondo) |
|---|---|---|---|
| duración | 6–9 cuadros | 10–14 cuadros | 16–24 cuadros |
| curva | `15/80` snappy | `20/85` | `10/92` — arranque perezoso, llegada larguísima |
| sobrepaso | 8–12% | 4–6% | 0–2% |
| anticipación | 2 cuadros | 3–4 cuadros | 5–7 cuadros |
| arrastre de hijos | 2 cuadros | 3 cuadros | 4 cuadros |

**El error que delata:** aplicar Easy Ease (33/33) a todo. Todo pesa igual y todo pesa poco.

**CLASIFICACIÓN: (a) — SE PUEDE HOY.** Es criterio de autoría, no capacidad técnica. **Codificalo en el generador**: que cada capa lleve una clase de peso y que las duraciones y curvas salgan de una tabla, no de la mano.

---

## G10 · CONTRAGOLPE DE CÁMARA — *Camera counter-move / Impact settle*
**ES:** contragolpe, asentamiento de cámara

**QUÉ ES.** Cuando algo grande llega, **la cámara acusa**: 3–6 px de desplazamiento y vuelta, o un micro-empuje en Z. Es el único movimiento de cámara que hace falta en una pieza donde "las cosas hacen cosas", y es exactamente lo que hace la referencia de Gemini.

**CÓMO SE HACE EN AE.** Cámara emparentada a un nulo (`layer.parent`), y el **nulo** lleva el contragolpe — así la cámara conserva su encuadre y su punto de interés intactos.
- `ADBE Position` del nulo: 0 → **3–8 px** en dirección **contraria** al impacto → 0.
- Variante en Z: `ADBE Position_2` −6 a −15 unidades y vuelta, o `ADBE Camera Zoom` +0,5%. La de Z se siente más cara y menos "temblor de videojuego".

**TIEMPOS Y CURVAS.** Ida **1–2 cuadros** (lineal, influencia 0). Vuelta **8–12 cuadros** con `88/10`. **Una sola oscilación.** Un contragolpe de cámara que rebota es un terremoto de plantilla gratis.

**CLASIFICACIÓN: (a) — SE PUEDE HOY.** Cámara 3D con punto de interés y emparentado ya están verificados a 0,043 px.

**DÓNDE SE VE.** Todo el título de Marvel, todo *sports graphics*, y las piezas de producto de Google/Gemini en su versión sutil.

---

## G11 · DERIVA SOSTENIDA — *Slow drift / Slow push / Ken Burns*
**ES:** deriva, empuje lento, respiración de plano

**QUÉ ES.** En un plano que se sostiene, **algo grande se mueve muy despacio y constante**. El espectador no lo ve; ve que el plano "no está congelado". Es literalmente el antídoto contra "el video está como muerto" en los tramos de lectura.

**CÓMO SE HACE EN AE.** Dos keyframes, principio y fin del plano.
- **Empuje de escala:** 100 → **102–105%** a lo largo de 3–5 s (90–150 cuadros). O sea **0,5–1,2% por segundo**. Más de 2%/s ya se ve como zoom.
- **Deriva de cámara en Z:** −20 a −60 unidades sobre el mismo tramo.
- **Paralaje:** capas a distinta Z derivando con la misma cámara — el fondo se mueve menos que el frente **por geometría, gratis**. Esto es lo que hace que la deriva se vea de 3D y no de After Effects 2D.
- **Dirección:** empujar (acercarse) tensa; alejarse resuelve. Un plano final que se aleja lentamente cierra la pieza sin necesidad de ningún gesto.

**TIEMPOS Y CURVAS.** **Casi lineal**: influencia 0/0 → `cubic-bezier(0, 0, 1, 1)`, o a lo sumo `10/10`. Una deriva con ease se lee como un movimiento con intención, y arruina el efecto: la deriva tiene que ser **indiferente**.

**Regla de convivencia:** deriva y micro-movimiento (G12) **no van en el mismo eje con amplitudes parecidas**. Se pelean y producen un temblor sin carácter. Deriva en escala/Z, micro-movimiento en X/Y y rotación.

**CLASIFICACIÓN: (a) — SE PUEDE HOY.** Dos keyframes por plano.

**DÓNDE SE VE.** Todo documental, todo *brand film*. En motion graphics, es la razón por la que una pieza de Apple nunca tiene un cuadro estático.

---

## G12 · MICRO-MOVIMIENTO HORNEADO — *Idle noise / Float / Breathing*
**ES:** micro-movimiento, flotación, respiración

**QUÉ ES.** **Nada queda completamente quieto.** Cada elemento tiene una deriva de amplitud imperceptible y período largo. Es el gesto más invisible del catálogo y probablemente el que más contribuye a la sensación de "caro", porque la quietud perfecta es una firma digital: en el mundo físico no existe.

**CUÁNTO ES "CASI QUIETO"** — los números importan más que el concepto:

| propiedad | amplitud | período |
|---|---|---|
| posición X/Y | **±1 a ±3 px** a 1080p | 40–90 cuadros |
| escala | **±0,4 a ±1,0%** | 60–120 cuadros |
| rotación Z | **±0,15° a ±0,4°** | 50–100 cuadros |
| posición Z (3D) | ±5 a ±15 unidades | 70–140 cuadros |

**El umbral:** si podés *ver* que se mueve mirándolo fijo, es el doble de lo que debería ser. Si tapás la pantalla, la volvés a mirar y "algo cambió", está bien.

**CÓMO SE HACE EN AE.** El oficio usa `wiggle(freq, amp)`. **Tu cadena no tiene expresiones**, así que hay que **hornear**: un script que escribe keyframes cada **5–8 cuadros** con valores de un ruido suave (dos senos de períodos incomensurables, p.ej. 43 y 67 cuadros, sumados) y `setTemporalAutoBezierAtKey` o influencia 50/50 en todos.

Presupuesto: un plano de 5 s (150 cuadros) son ~25 keyframes por propiedad y capa. Con 10 capas y 2 propiedades son 500 keyframes. **Es mucho pero es plano** — y es la diferencia entre una escena viva y una lámina.

**Desfasá la fase por capa** (`i · 13` cuadros): si todas laten juntas se ve como un temblor de cámara, no como vida.

**CLASIFICACIÓN: (a) — SE PUEDE HOY**, horneando. **Pero es el mejor candidato a (b) del catálogo:** si el exportador aceptara una declaración `ruido: amplitud, período, semilla` en el `layer.comment` — el mismo canal que ya usás para el resplandor, `exportar.jsx:239-254` — el motor web lo generaría en tiempo real con **un dato en vez de 500 keyframes**. Es determinista, es barato, y no rompe nada de lo que ya viaja.

**DÓNDE SE VE.** Idle loops de videojuegos (un personaje sin respiración "lee como estatua congelada"), y toda pieza de estudio con objetos 3D flotando.

---

## G13 · JERARQUÍA DE ESCALAS DE MOVIMIENTO — *Motion hierarchy / Macro-meso-micro*
**ES:** jerarquía de movimiento

**QUÉ ES.** En un cuadro caro hay **siempre tres escalas de movimiento conviviendo**: un gesto grande, dos o tres medianos, y micro-movimiento en todo lo demás. Una pieza donde todo se mueve igual de mucho se ve caótica; una donde todo se mueve igual de poco se ve muerta. **Tu diagnóstico ("animé la cámara y nada más") es exactamente una jerarquía con un solo nivel.**

**CÓMO SE HACE EN AE.** Regla numérica, por plano:

| escala | recorrido | duración | cuántos a la vez |
|---|---|---|---|
| **macro** | 200–1500 px, o entrada/salida de cuadro | 12–24 cuadros | **1** — nunca dos |
| **meso** | 20–80 px, escala ±10% | 6–14 cuadros | 2–4 |
| **micro** | 1–8 px, escala ±1% | 3–8 cuadros, o continuo | todo lo demás |

Factor entre niveles: **3× a 8×** en amplitud. Si el micro está a menos de 3× del meso, se confunden y el cuadro se ensucia.

**Corolario:** el macro define **de qué trata el plano**. Si no podés nombrar cuál es el gesto macro de un plano, el plano no tiene tema.

**CLASIFICACIÓN: (a) — SE PUEDE HOY**, y es una regla de generación, no de animación: cada plano declara qué capa lleva el macro.

---

## G14 · EL OBTURADOR COMO DECISIÓN — *Shutter angle & phase*
**ES:** obturador, ángulo y fase

**QUÉ ES.** No es un interruptor "desenfoque sí/no": es **cuánto tiempo estuvo abierto el obturador**, y comunica cosas distintas.

**CÓMO SE HACE EN AE.** `comp.shutterAngle` (0–720) y `comp.shutterPhase` (−360–360). Confirmados y **ya leídos por tu exportador** (`exportar.jsx:120-124`).

| ángulo | qué comunica | cuándo |
|---|---|---|
| **0–45°** | nítido, digital, seco, "de máquina" | glitch, datos, interfaz, stop-motion |
| **90°** | crujiente, tenso | acción con lectura, deporte |
| **180°** — *el de cine, el que AE trae* | natural. **El default correcto.** | casi todo |
| **270°** | onírico, lujoso, líquido | lujo, belleza, cámara lenta |
| **360°** | estela pura, el objeto es un borrón | títulos estilizados, deporte, transiciones de latigazo |
| **>360°** | irreal, arrastre | efecto, no realismo |

**La fase es la perilla que casi nadie toca y es la que se ve cara.** `shutterPhase = −ángulo/2` (o sea **−90° con ángulo 180**) centra el desenfoque **alrededor** de la posición del cuadro. Con fase 0 (el default de AE), el borrón sale **hacia adelante** del objeto: el objeto va adelantado respecto de su estela, y a alta velocidad se lee como que la cosa "va antes que ella misma". **−90° con 180° es la configuración que iguala el comportamiento de una cámara real.**

**TIEMPOS.** No aplica — pero sí una regla: **si el objeto recorre más de ~1,5× su propio ancho en un cuadro, con 180° se convierte en una franja de color.** Ahí, o bajás el ángulo, o alargás el gesto, o aceptás que ese tramo es una transición y no un objeto.

**CLASIFICACIÓN: (a) — SE PUEDE HOY, por completo.** Ángulo y fase son de composición; el `layer.motionBlur` por capa también viaja (`exportar.jsx:391`). **Limitación real de AE, no tuya:** el ángulo es **uno por composición** — AE no permite ángulos distintos por capa. Si querés eso, es precomposiciones o **(b)**: agregar un `obturador: N` por capa en el `comment` y que el motor web sub-muestree distinto por capa. Lo veo como una extensión legítima pero de prioridad media.

**DÓNDE SE VE.** El estándar de 180° viene del cine (obturador abierto la mitad del intervalo de cuadro). 270–360° es la firma de los títulos deportivos y los *sports graphics*.

---

## G15 · DESENFOQUE SELECTIVO — *Per-layer motion blur as an accent*
**ES:** desenfoque por capa, apagar el borrón

**QUÉ ES.** Decidir **qué capas se borronean y cuáles no**, en la misma escena. El fondo con desenfoque y la tipografía sin él es el truco por el que un título ilegible se vuelve legible sin frenar la pieza.

**CÓMO SE HACE EN AE.** `layer.motionBlur = true/false`, capa por capa. Confirmado y exportado.

**Reglas:**
- **La tipografía de lectura casi nunca lleva desenfoque.** Un texto que entra rápido y borroneado no se lee en su primer tercio, que es justo cuando el ojo lo busca.
- **Sí lo lleva** la tipografía que es *gesto* (una palabra que cruza como transición).
- Los elementos de fondo **siempre** lo llevan: son los que venden la velocidad.
- Un elemento que se mueve **sin** desenfoque en una escena donde todo lo tiene se lee como *más cercano y más importante*. Es un recurso de jerarquía, gratis.

**CLASIFICACIÓN: (a) — SE PUEDE HOY.**

---

## G16 · ESTELA POR DUPLICADOS — *Echo / Trail / Onion skin*
**ES:** estela, eco, calco

**QUÉ ES.** Copias del elemento retrasadas en el tiempo y con opacidad decreciente. Da velocidad y "cuerpo" a un movimiento sin ser desenfoque.

**CÓMO SE HACE EN AE.** El oficio usa el efecto **Echo** (matchName `ADBE Echo` — **no confirmado por mí**). Pero **no lo necesitás**: se arma con lo que ya tenés.
- Duplicar la capa 3–5 veces, **desplazar los keyframes** 2, 4, 6, 8 cuadros hacia atrás, y poner `ADBE Opacity` en 45, 28, 16, 8.
- Todas las copias van **debajo** de la original en el orden de apilado (que ya viaja).

**TIEMPOS Y CURVAS.** Retardo entre copias: **2 cuadros** para estela compacta, **3–4** para estela larga. Opacidad decreciente con razón ~0,58. La estela **debe morir antes** de que el objeto frene: si el objeto ya se detuvo y todavía hay copias moviéndose, se ve como un error de render, no como velocidad.

**CLASIFICACIÓN: (a) — SE PUEDE HOY.** Duplicados + opacidad + apilado, cero funciones nuevas. Costo: multiplica capas por 4–6, y en 3D las copias necesitan la misma Z o se ven como objetos separados.

**Con modos de fusión sería mejor** (`add`/`screen` hace que la estela sume luz en vez de taparse) — pero los modos de fusión no viajan, así que **la versión con opacidad es la que hay**, y funciona sobre fondos oscuros.

---

## G17 · BARRIDO DE BRILLO — *Sheen / Specular sweep / Glint*
**ES:** barrido, brillo, destello de pasada

**QUÉ ES.** Una banda de luz que cruza un objeto en diagonal, rápido, una sola vez. Es un cliché — y es un cliché **porque funciona**: le da material a una superficie plana.

**CÓMO SE HACE EN AE.** Normalmente: máscara + degradado. **Sin máscaras, con tu vocabulario:**
- Un sólido angosto (60–120 px de ancho), rotado 15–25°, del color del acento o blanco, **emparentado al objeto** para que lo acompañe.
- Encima, **dos tapas** del color del fondo que recortan la banda a la caja del objeto (una arriba, una abajo, o cuatro para recortar la caja completa). El apilado hace el trabajo de la máscara.
- El sólido cruza la caja con `ADBE Position_0`.
- Si lo querés más sutil: sólido a `ADBE Opacity` 12–25%, no 100.

**TIEMPOS Y CURVAS.** **6–10 cuadros** para cruzar. Lineal o `10/10` — un barrido con ease se ve como un objeto, no como luz. **Una sola vez** por aparición. Un barrido que se repite en bucle es la firma más rápida de plantilla barata.

**CLASIFICACIÓN: (a) — SE PUEDE HOY** con sólidos + tapas + emparentado. Es el ejemplo de manual de "el apilado ES el efecto".

---

## G18 · REVELADO CON TAPA RETRASADA — *Wipe reveal with lagging mask*
**ES:** revelado con tapa, borrado con retardo

**QUÉ ES.** El refinamiento de segundo orden del revelado por tapa. La versión barata: la tapa se corre y aparece el texto. La versión cara: **el texto también se mueve, un poco, y con retardo respecto de la tapa**. El texto parece *arrastrado por* el borde de la tapa en vez de estar esperando debajo.

**CÓMO SE HACE EN AE.**
- Tapa: `ADBE Position_0` recorriendo el ancho del bloque, curva `15/85`, **10–14 cuadros**.
- El contenido revelado: `ADBE Position_0` de **+10 a +25 px** hasta 0, con los keyframes **desplazados 2 cuadros después** de los de la tapa, y **la misma curva**.
- Extra de tercer orden: el borde de la tapa lleva un sólido de 2–4 px del color de acento que se queda **1 cuadro más** que la tapa. Lee como filo.

**TIEMPOS Y CURVAS.** Tapa 10–14 cuadros con `15/85`. Contenido: idéntico, +2 cuadros. Nunca al revés — si el contenido se adelanta a la tapa, se rompe la ilusión y se ve el truco.

**CLASIFICACIÓN: (a) — SE PUEDE HOY.** Es la combinación tapa + arrastre (G03), y es probablemente el gesto de entrada de texto con mejor relación calidad/complejidad de todo tu vocabulario, porque **evita el sobrepaso en tipografía** (prohibido por G06) y aún así se ve vivo.

---

## G19 · SOMBRA DESFASADA — *Reactive offset shadow*
**ES:** sombra desfasada, sombra que reacciona

**QUÉ ES.** Un duplicado oscuro debajo del elemento que **no se mueve solidariamente con él**: se retrasa 1–2 cuadros y su desplazamiento es un 10–20% mayor. Da separación de plano y peso sin ningún efecto.

**CÓMO SE HACE EN AE.** El oficio usa Drop Shadow o Layer Styles (`ADBE Layer Styles` — **no confirmado**). Sin efectos:
- Duplicar la capa (o un sólido de su caja), ponerla **debajo** en el apilado, color = tinta del fondo, `ADBE Opacity` 15–30%.
- Desplazarla 6–14 px en la dirección de la luz.
- **Keyframes copiados y corridos 1–2 cuadros** (G03), con recorrido 1,1–1,2× el del original.

**TIEMPOS.** Retardo **1–2 cuadros**. Con 3 o más ya se ve como una segunda capa despegada.
**Refinamiento:** cuando el elemento "aterriza", la sombra se **encoge** un 8–12% en los 2 cuadros del contacto y vuelve. Eso es lo que dice *tocó*.

**CLASIFICACIÓN: (a) — SE PUEDE HOY** con duplicados, opacidad y apilado. **Con una salvedad honesta:** sin desenfoque, la sombra tiene borde duro y se lee como *long shadow* gráfico, no como sombra fotográfica. Es una estética válida y coherente — pero **no es lo mismo**. La sombra difusa es **(b)**: exigiría un desenfoque por capa declarado en el `comment`, en la misma familia que el resplandor que ya resolviste así.

---

## G20 · CORTE SECO Y CUADRO DE REPOSO — *Snap cut & rest beat*
**ES:** corte seco, cambio en un cuadro, tiempo de reposo

**QUÉ ES.** Dos cosas emparentadas, y las dos son **ausencia de animación**:
1. **El corte seco:** un cambio de estado en **1 cuadro**, sin transición (keyframes HOLD). En medio de una pieza toda con ease, un corte seco es un acento.
2. **El reposo (*rest beat*):** **4–10 cuadros donde no pasa nada** entre dos gestos. Es lo que hace que el gesto siguiente pegue.

**QUÉ ARREGLA DE TU PROBLEMA.** "Es muy lento y no tiene el beat" **rara vez se arregla acelerando todo**. Se arregla con contraste: gestos **más rápidos** (8–12 cuadros en vez de 20–30) separados por **reposos**. Una pieza donde todo se mueve todo el tiempo a velocidad media se siente lenta aunque nada dure mucho, porque no hay pulso.

**CÓMO SE HACE EN AE.** `setInterpolationTypeAtKey(i, KeyframeInterpolationType.HOLD)`. Confirmado.
**Ritmo:** a 120 BPM, un beat son **15 cuadros** a 30 fps. Poné los **inicios** de los gestos macro en la grilla de 15 cuadros (o de 7,5 para el medio tiempo). Los meso pueden caer fuera. Esto solo, sin tocar nada más, le pone beat a una pieza.

**CLASIFICACIÓN: (a) — SE PUEDE HOY.** HOLD ya viaja (declarado: "HOLD / LINEAL / BEZIER encadenados").

---

## G21 · APERTURA DE INTERLETRA — *Tracking-in / Letter-spacing reveal*
**ES:** apertura de interletra, tracking

**QUÉ ES.** El texto entra con las letras separadas y **se cierra** al valor final (o al revés). Es el gesto tipográfico más elegante que existe y **no deforma la tipografía** (a diferencia de escalarla).

**CÓMO SE HACE EN AE.** El oficio lo hace con un **animador de texto** (`ADBE Text Animators` → `ADBE Text Animator` → `ADBE Text Tracking Amount` — **matchNames NO confirmados por mí**), que además permite un selector de rango para que la apertura recorra la palabra.

**TIEMPOS Y CURVAS.** De **+8 a +20** de tracking hasta el valor final, en **14–20 cuadros**, curva `10/92` → `cubic-bezier(0.10, 0, 0.08, 1)`. Es un gesto que **debe** terminar de asentarse antes de que empiece la lectura. Combinado con opacidad 0→100 en los primeros 8 cuadros.

**CLASIFICACIÓN: (b) — EXIGE AGREGAR ALGO AL EXPORTADOR.** Tu cadena exporta la interletra como **valor estático** de la capa de texto. Para animarla hacen falta dos cosas, y **la barata es suficiente**:
- **Camino barato (recomendado):** exportar `interletra` como **propiedad animable con keyframes**, aunque en AE se la anime con un animador de texto y el exportador la **muestree por cuadro** o extraiga sólo el valor de `ADBE Text Tracking Amount`. Es un número por cuadro. **Lo que ya no viaja gratis es la CAJA**: `sourceRectAtTime` cambia con el tracking, así que hay que muestrear la caja por keyframe también, o dejar que el motor web recalcule el ancho (y ahí perdés la garantía de <1% que hoy tenés).
- **Camino caro:** animadores de texto completos con selectores de rango. Eso es **(c) — no vale la pena todavía**: es un subsistema entero (selectores, modos, rangos, *wiggly*, *expression selector*) para un puñado de gestos que en gran medida se pueden imitar con capas por palabra + escalonado (G05) + tapas (G18).

**DÓNDE SE VE.** Todo título de lujo, todo *end card* de moda.

---

## G22 · ACABADO — *Finishing pass: grain, vignette, aberration, bloom*
**ES:** acabado, grano, viñeteado, aberración

**QUÉ ES.** La capa final que unifica todo. Cuáles importan de verdad, en orden:

| recurso | veredicto | cómo |
|---|---|---|
| **Grano / ruido** | **IMPORTA MUCHO.** Es lo que rompe el degradado bandeado y le da "material" a los planos lisos. Es el que más rinde. | ruido monocromático **1–3%**, animado por cuadro. Nunca estático (un grano congelado se lee como suciedad de pantalla). |
| **Viñeteado** | **IMPORTA, chico.** Centra la mirada. | oscurecimiento de **5–12%** en las esquinas, radio muy grande. Si se ve el borde del viñeteado, está mal. |
| **Bloom / resplandor** | **IMPORTA** y **ya lo tenés** (declarado por comentario de capa, resuelto como bloom selectivo). Es lo que hace que un acento "emita" en vez de "estar pintado". | selectivo, por capa. Nunca global. |
| **Aberración cromática** | **MODA, y peligrosa.** Sirve **por cuadro y por gesto** —2–4 px sólo en los cuadros de máxima velocidad— y arruina la pieza si está siempre activa. Los foros son bastante unánimes: casi nadie la implementa sutil. | ≤2 px, sólo durante tránsitos. |
| **Halation / glow difuso** | opcional, muy dependiente de la marca. | |
| **Barridos de "luz de lente"** | **MODA.** Envejece rapidísimo. | |

**CLASIFICACIÓN: (b), pero en el motor web y no en AE — y es barato.** Grano, viñeteado y aberración son **post-proceso de pantalla completa**: no tienen nada que ver con capas ni con transformaciones, y por eso **no hay que exportarlos desde AE**. El exportador tendría que llevar sólo un bloque `acabado { grano: 0.02, vignette: 0.08, aberracion: 0 }` a nivel de **composición** — el mismo mecanismo que ya usás para el obturador. El motor web hace el resto con un shader de pasada final.

**Es la extensión de mejor relación costo/beneficio de todo este catálogo**, porque son ~5 números y se aplican a la pieza entera. Y hay un argumento adicional fuerte: el bloom ya viaja por comentario, así que **la infraestructura conceptual está probada**.

**Aviso de fidelidad, importante:** si el grano y el viñeteado sólo existen en el motor web, la comparación a nivel de píxel contra AE **deja de dar cero** en esos pasos. Hay que dejarlos **fuera del canal de verificación** (comparar antes del acabado) o el pipeline empieza a reportar defectos que no lo son.

---

## G23 · EL SONIDO IMPLÍCITO — *Sound-implied timing*
**ES:** el sonido implícito, animar para el golpe

**QUÉ ES.** Aunque no tengas audio, **el timing tiene que estar escrito como si lo tuviera**. Una animación diseñada para sonido se ve mejor en silencio que una que no lo fue, y eso no es místico: el sonido obliga a decisiones de timing que la vista sola no obliga.

**QUÉ TE OBLIGA A HACER, concretamente:**
1. **Un acento tiene que caer en UN cuadro identificable.** Si no podés señalar el cuadro exacto donde "suena", el gesto está difuso. Un aterrizaje con 6 cuadros de desaceleración blanda no tiene cuadro de golpe.
2. **El golpe necesita silencio antes.** 2–4 cuadros de quietud o de movimiento muy lento inmediatamente antes del impacto. Es G02 (anticipación) visto desde el audio.
3. **La estructura pide 3 tipos de evento**, y una pieza que sólo tiene uno se siente plana:
   - **golpes** (1 cuadro): cortes, aterrizajes, apariciones
   - **barridos** (6–12 cuadros): tránsitos, cosas que cruzan
   - **zumbidos/sostenidos** (30+ cuadros): derivas, micro-movimiento, presencia
   Si tu pieza no tiene sostenidos, se siente entrecortada. Si no tiene golpes, se siente muerta. **"Muerto y sin beat" = todo barridos.**
4. **La grilla de tiempo:** ver G20. Inicios de macro en múltiplos de 15 cuadros (120 BPM).
5. **Un golpe cada 15–45 cuadros.** Menos de uno cada 45 cuadros y el ritmo se pierde; más de uno cada 10 y se vuelve ruido.

**CLASIFICACIÓN: (a) — SE PUEDE HOY.** Es una regla de guionado del generador: la pieza declara su BPM y el planificador cuantiza los inicios de los gestos macro.

---
---

# ERRORES QUE DELATAN A UN AMATEUR — con su corrección

Ordenados por cuánto daño hacen.

| # | error | por qué se ve mal | corrección |
|---|---|---|---|
| **1** | **Sólo se mueve la cámara.** Los objetos son utilería quieta. | El cerebro lee "una foto filmada", no "un mundo". Es tu diagnóstico, y es el error #1 de este catálogo. | Fijá la cámara (o dejale sólo deriva, G11) y **animá los objetos**: G01 acuse, G03 arrastre, G05 escalonado, G12 micro-movimiento. |
| **2** | **Keyframes lineales.** | Nada en el mundo se mueve a velocidad constante. Se ve robótico y se ve *gratis*. | Nunca lineal en posición/escala/rotación de un objeto. Mínimo `20/85`. Lineal **sí** en: derivas (G11), barridos de luz (G17), y cruces por el reposo en un rebote (G07). |
| **3** | **Easy Ease en todo (33/33).** | Todo pesa lo mismo y se siente blando. Es el segundo error más común y el más difícil de ver porque "parece bien". | Tabla de peso de G09. Casi nunca 33/33: para entradas 20/85, para pesados 10/92. |
| **4** | **Todo entra al mismo tiempo.** | Chaos plano. No hay jerarquía y el ojo no sabe adónde ir. | G04 solapamiento (30–40%) + G05 escalonado (2 cuadros) + G13 jerarquía (un solo macro). |
| **5** | **Nada acusa nada.** Los objetos se ignoran. | Se ve como capas de Photoshop moviéndose, no como una escena. | G01, en cada aterrizaje. Es 3 keyframes. |
| **6** | **Sobrepaso en todo, incluido texto y datos.** | Gelatina. Y el texto no se lee. | G06, lista de "cuándo NO". |
| **7** | **Quietud perfecta.** Elementos con cero movimiento entre gestos. | La quietud perfecta es una firma digital: delata que es software. | G12, ±2 px / ±0,5% / ±0,25°. |
| **8** | **Movimientos todos de duración parecida** (20–30 cuadros). | Se siente lento aunque nada dure mucho, porque no hay contraste. **Es literalmente "es muy lento y no tiene el beat".** | Gestos macro **más rápidos** (10–16 cuadros) + reposos (G20). Velocidad = contraste, no aceleración global. |
| **9** | **Fase de obturador en 0.** | El borrón sale hacia adelante del objeto. Casi nadie lo nota conscientemente; todos lo notan como "raro". | `comp.shutterPhase = −comp.shutterAngle / 2` (−90 con 180). Una línea. |
| **10** | **Desenfoque de movimiento global encendido, incluido el texto.** | El primer tercio de cada texto es ilegible. | G15: `layer.motionBlur = false` en tipografía de lectura. |
| **11** | **Anclajes en el centro por defecto.** | Todo escala y rota desde el medio. Nada tiene contacto ni apoyo. | `ADBE Anchor Point` en el **borde que toca**: un panel que sube crece desde abajo, una barra crece desde su origen. Corrección de un valor, cambio enorme. |
| **12** | **Salidas simétricas a las entradas.** | Lo que se va con la misma curva con la que vino se siente indeciso y come tiempo. | Salidas **más cortas** (60% de la entrada) y con curva invertida: `90/15`. Y sin sobrepaso. |
| **13** | **Escalar tipografía como gesto de entrada.** | 0→100% de escala en texto deforma la percepción del peso tipográfico y en los primeros cuadros es una mancha. | G18 (tapa con arrastre) o G21 (interletra) o simplemente opacidad + 15 px de posición. |
| **14** | **Escalonar 30 elementos con delta fijo.** | 30 × 2 cuadros = 60 cuadros = 2 s de espera. | Máximo 10–15, total ≤24 cuadros, o delta decreciente. |
| **15** | **Aberración cromática y grano fuertes y permanentes.** | Grita "le puse un preset". | Grano 1–3% animado; aberración ≤2 px y **sólo** en cuadros de alta velocidad. |
| **16** | **Micro-movimiento en fase en todas las capas.** | Se lee como temblor de cámara, no como vida. | Desfase de fase por capa (`i · 13` cuadros) y períodos incomensurables. |
| **17** | **Rebote de 5+ oscilaciones.** | Juguete. | Máximo 3, razón 0,35. |
| **18** | **Deriva de cámara *y* micro-movimiento en el mismo eje.** | Se pelean; queda un temblor sin carácter. | Deriva en escala/Z, micro en X/Y/rotación. |

---
---

# RESUMEN OPERATIVO PARA EL PROYECTO

**De los 23 gestos: 18 son (a) — se hacen HOY, sin tocar el exportador.** Todo lo de segundo orden que hace que una pieza se vea cara ya está a tu alcance con transformaciones, emparentado, apilado y tapas. Lo que faltaba no era capacidad: era vocabulario y criterio de tiempos.

**Los cuatro (b), en orden de rendimiento por esfuerzo:**
1. **G22 acabado** (grano + viñeteado a nivel de composición) — ~5 números, misma vía que el obturador. **Máximo rendimiento visual por línea de código.** Con la salvedad de sacarlo del canal de verificación de píxel.
2. **G12 micro-movimiento declarativo** (`ruido: amp, período, semilla` en el `comment`) — reemplaza ~500 keyframes por una línea, y es determinista.
3. **G19 sombra difusa** (desenfoque por capa declarado) — la sombra dura ya funciona, esto la vuelve fotográfica.
4. **G21 interletra animada** (muestreo de tracking + caja por keyframe) — el único que **compromete la garantía del 1% de ancho** y por eso el que más hay que pensar.

**Los (c) que descarto explícitamente:** animadores de texto con selectores de rango completos, trim paths, y modos de fusión para estelas. Los tres tienen sustituto razonable en el vocabulario actual (capas por palabra + escalonado; formas rasterizadas + tapas; estela por opacidad).

**Y el cambio que más va a mover la aguja en tu pieza, si tuviera que elegir tres:** G01 (acuse), G04+G20 (solapamiento y reposos, o sea el ritmo) y G12 (micro-movimiento). Los tres son (a), los tres son baratos, y los tres atacan directamente "está muerto, es lento y no tiene beat".

---

**Sources:**
- [School of Motion — How to Create Automatic Follow Through in After Effects](https://schoolofmotion.com/blog/automatic-follow-through-after-effects)
- [School of Motion — Common 2D Character Animation Mistakes](https://schoolofmotion.com/blog/new-to-2d-character-animation-here-are-the-most-common-mistakes-and-how-to-avoid-them)
- [Mt. Mograph — The Bounce and Overshoot Animation Trick](https://mtmograph.com/blogs/tools/the-bounce-and-overshoot-animation-trick-every-motion-designer-should-know)
- [ProVideo Coalition — Create Cinematic Motion Blur in After Effects (Mark Christiansen)](https://www.provideocoalition.com/tip_create_cinematic_motion_blur_in_after_effects_and_in_life/)
- [Wipster — Debunking the 180-degree shutter rule](https://www.wipster.io/blog/debunking-the-180-degree-shutter-rule)
- [Creative COW — Motion Blur: Shutter Angle & Phase](https://creativecow.net/forums/thread/motion-blur-shutter-angle-phase/)
- [Creative COW — AE Motion Blur "samples"](https://creativecow.net/forums/thread/ae-motion-blur-samples/)
- [After Effects Scripting Guide — CompItem](https://ae-scripting.docsforadobe.dev/item/compitem/)
- [After Effects Scripting Guide — AVLayer](https://ae-scripting.docsforadobe.dev/layer/avlayer/)
- [Motion.dev — stagger docs](https://motion.dev/docs/stagger)
- [SVGator — Offset and Delay in Motion Design](https://www.svgator.com/blog/offset-delay-motion-design/)
- [Superfiles — 12 Motion Design Rules for UI Designers](https://superfiles.in/motion-design-principles-for-ui.php)
- [Cursa — Polish Pass: Overlap, Secondary Motion, and Subtle Texture](https://cursa.app/en/page/polish-pass-overlap-secondary-motion-and-subtle-texture)
- [MoCap Online — Idle Animation Guide](https://mocaponline.com/blogs/mocap-news/idle-animation-loop)
- [OlafMotion — How to Use Graph Editor in After Effects](https://olafmotion.com/tutorials/how-to-use-graph-editor/)
- [ResetEra — Film Grain + Chromatic Aberration discussion](https://www.resetera.com/threads/film-grain-chromatic-aberration-ruining-game-visuals.644346/)

Fuentes locales verificadas: `C:\Users\Thiago\Documents\cliping.ia\tools\ae\curvas.mjs` (fórmula influencia↔bezier), `C:\Users\Thiago\Documents\cliping.ia\tools\ae\sondas\exportar.jsx` (líneas 105-125 obturador de composición, 233-254 comentario de capa, 391 `motionBlur` por capa, 493 dimensiones separadas).