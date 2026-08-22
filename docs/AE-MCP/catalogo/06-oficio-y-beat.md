# LA MECÁNICA DEL BEAT — catálogo de gestos

## 0. EL HALLAZGO QUE ORDENA TODO LO DEMÁS

Tres cosas salieron de la investigación, y las tres apuntan al mismo lado:

**(1) "Beat" no es cantidad de movimiento. Es ONSETS CUANTIZADOS.** Lo que el ojo lee como ritmo no es que haya cosas moviéndose — es que las cosas *empiezan* a moverse en instantes alineados a una grilla. La duración de cada gesto puede ser cualquiera; lo que tiene que caer en la grilla es el **arranque**. Una pieza con 40 gestos de duraciones caprichosas pero todos arrancando en múltiplos de 15 cuadros suena a música. La misma pieza con arranques en 7, 19, 43, 61 suena a ruido aunque tenga más movimiento.

**(2) Tu pieza no tenía poco movimiento: tenía 100% AMBIENTE y 0% PROTAGONISTA.** La literatura de *staging* dice esto en cualitativo ("no animes todo a la vez", "una acción por vez") y nadie publica un número. Pero la distinción que importa es esta: en cualquier cuadro hay **un protagonista** (el delta grande, el que se lee), **2 a 5 de apoyo** (deltas chicos), y **0 a 2 ambientes** (deriva continua que nunca resuelve). Una cámara que viaja lento durante 12 s es *ambiente puro*. Ambiente sin protagonista = "muerto". No te faltaba movimiento, te faltaba **jerarquía temporal**.

**(3) El silencio existe, pero es la ausencia de PROTAGONISTA, no la ausencia de movimiento.** En piezas profesionales casi nunca hay un cuadro totalmente congelado — hay una deriva de fondo. Lo que se apaga entre gestos es el protagonista, 6 a 12 cuadros, como puntuación.

Y una consecuencia práctica enorme para vos: **casi todo el vocabulario del beat es (a) — se hace hoy, con transformaciones, emparentado, apilado, tapas y keyframes con curvas.** El beat no exige exportador nuevo. Exige un planificador de tiempos. De los 21 gestos de abajo, 16 son (a), 4 son (b) y 1 es (c).

---

## 1. LOS NÚMEROS (respuestas directas a tus preguntas)

### 1.1 Duración de un gesto, a 30 fps

Material Design 3 es la fuente publicada con números duros más cercana, y sus tokens convertidos a cuadros dan un mapa sorprendentemente parecido a la práctica de motion graphics:

| escala del gesto | ms (M3) | **cuadros @30** | qué es |
|---|---|---|---|
| micro-acento / pulso | 50–150 | **2–5** | un latido, un destello, un tick |
| latigazo (whip) | 66–130 | **2–4** | traslado violento, exige obturador |
| gesto estándar de un elemento | 250–400 | **8–12** | una tarjeta entra, un texto sube |
| gesto grande / grupo | 450–600 | **14–18** | un panel entero, una columna |
| transición de escena | 700–1000 | **21–30** | cambia todo lo que hay en cuadro |

**Práctica, no documentada:** la **salida dura 60–70% de la entrada**. Un elemento que entra en 12 cuadros sale en 7–8. Invertirlo es uno de los motivos más comunes de que algo "se sienta lento".

### 1.2 Curvas

**El Easy Ease de AE es el enemigo.** Documentado: aplicar Easy Ease deja velocidad 0 e **influencia 33,33%** de los dos lados. Eso es exactamente `cubic-bezier(0.333, 0, 0.667, 1)` — una curva **simétrica**, y la simetría es lo que se lee como "muerto". Ninguna cosa física acelera y desacelera igual.

El repertorio real es **asimétrico**:

| nombre | influencia AE (sale / entra) | cubic-bezier | uso |
|---|---|---|---|
| Easy Ease (por defecto) | 33 / 33 | `(0.333, 0, 0.667, 1)` | **evitar** |
| desacelerado enfático | vel. saliente alta / 90 | `(0.05, 0.7, 0.1, 1)` | entradas — el caballo de batalla |
| acelerado enfático | 30 / vel. entrante alta | `(0.3, 0, 0.8, 0.15)` | salidas |
| estándar M3 | 20 / 100 | `(0.2, 0, 0, 1)` | movimientos neutros |
| golpe seco | 5 / 85 | `(0.05, 0, 0.15, 1)` | acentos, impactos |

Los cuatro `cubic-bezier` son tokens publicados de Material Design 3 (`emphasized-decelerate`, `emphasized-accelerate`, `standard`). La columna de influencia AE es **mi traducción**: la `x` del primer punto de control es la influencia saliente de la clave 1, y la `x` del segundo es `1 − influencia entrante` de la clave 2. El `0.7` en `y` del desacelerado enfático **no se consigue con velocidad 0** — necesitás velocidad saliente alta en la primera clave. Tu exportador ya convierte velocidad+influencia a cubic-bezier, así que esto ya lo podés expresar; es cuestión de dejar de pedir Easy Ease.

### 1.3 Escalonado (stagger)

Rango de la práctica, a 30 fps:

| retardo | cuándo |
|---|---|
| **1 cuadro** | letras de una palabra corta, muy apretado |
| **2 cuadros** | letras, palabras — el valor por defecto de kinetic typography |
| **3 cuadros** | ítems de lista, tarjetas. Equivale a `stagger(0.1)`, el ejemplo canónico de motion.dev |
| **4–6 cuadros** | paneles, bloques grandes |
| **8–15 cuadros** | ya no es escalonado, son **beats separados** |

**Y sí cambia según cuántos elementos hay.** La regla que uso y que te propongo como fórmula implementable (esto es **mi síntesis**, no práctica publicada, pero está calibrada contra el rango de arriba):

```
retardo = clamp( round( (2 × duracionDelGesto) / (n − 1) ), 1, 6 )
```

El presupuesto total de la cascada no debería pasar de **2× la duración de un gesto individual**. Con 8 tarjetas de 10 cuadros: `20/7 = 3` cuadros → la cascada dura 21 + 10 = 31 cuadros ≈ 1 s. Con 20 letras: `20/19 = 1` cuadro. Sin el `clamp`, 20 letras a 3 cuadros son 67 cuadros de cascada y la palabra tarda 2,2 s en existir: eso es exactamente "lento".

### 1.4 La grilla del beat, con y sin música

Con música, la conversión es exacta: **cuadros por beat = 1800 / BPM** a 30 fps. Los tempos que caen en cuadros enteros:

| BPM | cuadros/beat @30 |
|---|---|
| 60 | 30 |
| 72 | 25 |
| 75 | 24 |
| **90** | **20** |
| 100 | 18 |
| **120** | **15** |
| 150 | 12 |
| 180 | 10 |

(120 BPM a 30 fps = 15 cuadros exactos está confirmado en varias fuentes; es la razón por la que los músicos de motion escriben a 120.)

**Sin música la grilla no desaparece — se vuelve implícita, y ahí está tu problema.** Elegí una subdivisión y cuantizá los arranques:

- **negra = 15 cuadros (0,5 s)** — el pulso base
- **corchea = 8 cuadros** (7,5 redondeado) — acentos, escalonados internos
- **blanca = 30 cuadros (1 s)** — cambios de sección
- **compás = 60 cuadros (2 s)** — estructura

Regla operativa: **≥80% de los arranques de gesto caen en múltiplos de 8 cuadros; los acentos fuertes en múltiplos de 15.** Las duraciones quedan libres.

### 1.5 Estructura de una pieza de 12 s (360 cuadros)

Práctica, no documentada. Grilla de 15 cuadros, 24 beats:

| cuadros | beats | sección | densidad |
|---|---|---|---|
| 0–15 | 1 | **arranque en frío**: UN elemento, solo | 1 onset |
| 15–90 | 2–6 | **apertura**: se establece el espacio | 1 onset cada 30 c |
| 90–270 | 7–18 | **desarrollo**: el cuerpo | 1 onset cada 8–15 c |
| 270–330 | 19–22 | **cierre / remate** | pico de densidad, luego corte |
| 330–360 | 23–24 | **resolución**: logo o claim, quieto | 0 onsets nuevos |

El último tramo tiene un número duro que sí está documentado: **el texto tiene que quedarse INMÓVIL 1 segundo por cada 13 caracteres** (norma de legibilidad para texto animado). Un claim de 30 caracteres necesita **2,3 s = 69 cuadros quietos**, no 30. Los estándares de subtítulo lo corroboran: BBC 2–5 s, Netflix 1–7 s, 12–20 caracteres/segundo.

### 1.6 Silencio

- Un hueco de **6–12 cuadros** sin protagonista = puntuación, se lee como intención.
- Un hueco de **más de 20 cuadros (0,67 s)** sin nada nuevo = se lee como muerto, **salvo** que haya un ambiente derivando.
- Un hueco de **más de 45 cuadros** = muerto siempre.

### 1.7 Anticipación, sobrepaso, arrastre — con números

**Anticipación:** 2–4 cuadros de contramovimiento, magnitud **5–15%** del movimiento principal y en sentido opuesto. Regla proporcional: `anticipación ≈ duración/4`, tope 5 cuadros. *Práctica ampliamente enseñada; no encontré una cifra de cuadros publicada en fuente citable.*

**Sobrepaso:** documentado en dos formas que coinciden.
- La secuencia de ejemplo que circula en el oficio es **120 → 90 → 105 → 97,5 → 101,25 → 100**: cada oscilación es **la mitad** de la anterior.
- Dan Ebberts (motionscript.com), que es la referencia matemática del asunto, usa amortiguación `amp·sin(t·f·2π)/exp(t·decay)` con **frecuencia 3 Hz y decaimiento 5**. A 30 fps: una oscilación completa = **10 cuadros**, y con decaimiento 5 la amplitud cae a 19% al cuadro 10 y a ~4% al cuadro 20. **El bamboleo está visualmente muerto a los 12–15 cuadros.**
- Para rebote real (no oscilación) usa **elasticidad 0,7**, gravedad 5000, máximo 9 rebotes.

Traducido a claves reales (que es lo que tu exportador necesita):
- *pop* fuerte: `0c → 100%` · `10c → 112%` · `16c → 100%`
- *asentamiento* sutil: `0c → 100%` · `12c → 104%` · `18c → 100%`
- con contra-oscilación: `0c` · `10c → 112%` · `15c → 96%` · `20c → 100%`

**Arrastre / seguimiento (follow through):** el hijo arranca **2–4 cuadros después** que el padre y **termina 3–6 cuadros después**. Es el mismo gesto desfasado, no un gesto distinto.

**Acción secundaria:** el elemento secundario se mueve **20–40% de la magnitud** del principal, con el mismo arranque o 1–2 cuadros después.

### 1.8 La regla de cuántas cosas animan a la vez — y la compuerta

**No existe una regla publicada con número.** Lo que hay es cualitativo: *staging* dice "no animes todo a la vez"; los sistemas de UI dicen que el movimiento simultáneo satura. Nadie da una cifra. Lo que sigue es **mi síntesis**, y la doy en forma medible a propósito, porque en este repo lo que se mide es lo que se puede defender.

Definí para cada elemento `i` y cada cuadro `f`:

```
E_i(f) = pesoVisual_i × ( |Δpos|/diagonal + |Δescala|/100 + |Δrot|/180 + |Δopac|/100 )
```
con `pesoVisual` = fracción del área de pantalla que ocupa (un panel grande moviéndose 5 px pesa más que un punto moviéndose 5 px), y `Δ` = delta por cuadro.

Después, por cuadro:
- `E_total(f) = Σ E_i(f)`
- `dominancia(f) = max(E_i) / E_total`
- `N_activos(f) = #{ i : E_i > 0,2 · max(E_i) }`

Y las cinco compuertas que propongo:

1. **Densidad de arranques: ≥1 onset nuevo por segundo.** En 12 s, mínimo 12; una pieza viva tiene **30 a 60**. *Mi estimación: tu pieza, con sólo la cámara animada, probablemente tenía 5 a 8. Ése es el hueco, cuantificado.*
2. **Dominancia entre 0,45 y 0,85** en ≥70% de los cuadros con energía. Debajo de 0,45 es papilla (todo se mueve igual, nada se lee). Arriba de 0,85 con `E_total` baja es exactamente tu caso: una sola cosa moviéndose y nada acompañando.
3. **`N_activos` ≤ 5.** Más de cinco elementos con energía comparable en el mismo cuadro es ruido.
4. **Cuantización: ≥80% de los onsets en múltiplos de la subdivisión** (8 o 15 cuadros).
5. **Silencio: `E_total ≈ 0` en ≤15% de los cuadros, y nunca más de 20 cuadros seguidos.**

Ninguna de las cinco necesita renderizar. Se calculan sobre el documento exportado, en milisegundos.

---

## 2. CATÁLOGO DE GESTOS

> **Sobre matchNames.** Todo lo de este frente vive en transformaciones. Los que uso y considero confiables: `ADBE Transform Group`, `ADBE Anchor Point`, `ADBE Position`, `ADBE Scale`, `ADBE Rotate Z`, `ADBE Opacity`. Para dimensiones separadas, `ADBE Position_0/_1/_2` — **alta confianza, pero no lo verifiqué contra documentación en esta sesión**. La API de curvas sí la doy con confianza: `new KeyframeEase(velocidad, influencia)` con influencia en 0,1–100; `prop.setTemporalEaseAtKey(i, [inEase], [outEase])`; `prop.setInterpolationTypeAtKey(i, KeyframeInterpolationType.HOLD)`; `prop.dimensionsSeparated = true`. `comp.motionBlurShutterAngle` / `comp.motionBlurShutterPhase` los creo correctos pero **no confirmados esta sesión**.
>
> **Y algo que te libera de la mitad del problema:** vos generás la pieza *por script*, así que todo lo que en AE a mano se resuelve con expresiones (`valueAtTime`, `loopOut`, wiggle, inercia) lo podés **escribir directamente como claves**. Nada de este catálogo necesita expresiones.

---

### 1. ESCALONADO — *stagger / cascade / offset*
**QUÉ ES.** N elementos hacen el mismo gesto, cada uno arrancando unos cuadros después del anterior. Es el gesto más rentable del oficio: convierte una lista muerta en una frase rítmica.
**CÓMO SE HACE EN AE.** El mismo par de claves en los N elementos, y se corre `layer.startTime` de cada uno. Correr `startTime` desplaza **todas** las claves de la capa a la vez — es el escalonado más barato de escribir. Alternativa nativa a mano: *Animation → Keyframe Assistant → Sequence Layers* con Overlap; con duración **negativa** deja huecos entre capas.
**TIEMPOS Y CURVAS.** Retardo 2–3 cuadros por defecto; fórmula de §1.3. Gesto individual 8–12 cuadros. Curva `(0.05, 0.7, 0.1, 1)`.
**CLASIFICACIÓN. (a)** — `startTime` por capa. Receta: gesto base de 10 c con desacelerado enfático, retardo `clamp(20/(n−1),1,6)`.
**DÓNDE SE VE.** Universal. Cualquier lista, grilla de tarjetas o título por letras en piezas de producto (Apple, Stripe, Linear).

---

### 2. ESCALONADO DESDE EL CENTRO — *stagger from center*
**QUÉ ES.** La cascada nace en el medio y se abre hacia los dos lados, en vez de barrer de izquierda a derecha.
**CÓMO SE HACE EN AE.** Igual que arriba, pero el retardo es `|i − centro| × paso` en vez de `i × paso`.
**TIEMPOS Y CURVAS.** Retardo 2–4 c. Como la cascada se parte al medio, **dura la mitad** que la lineal para el mismo n — por eso sirve cuando n es grande.
**CLASIFICACIÓN. (a).** Motion.dev documenta `from: "center"` / `"last"` / índice numérico; la lógica es una línea de aritmética en tu generador.
**DÓNDE SE VE.** Aperturas de logo simétricas, ecualizadores, títulos centrados.

---

### 3. ESCALONADO CURVADO — *eased stagger*
**QUÉ ES.** El retardo no es constante: los primeros elementos entran muy juntos y los últimos se van espaciando (o al revés). Se siente como un objeto físico, no como un metrónomo.
**CÓMO SE HACE EN AE.** Retardo `i` = `paso × n × ease(i/n)`. Con `ease = easeOut` los primeros se apelotonan.
**TIEMPOS Y CURVAS.** Distribución `cubic-bezier(.32,.23,.4,.9)` — motion.dev documenta exactamente esta idea de "easing sobre la distribución del stagger", separada del easing de cada animación.
**CLASIFICACIÓN. (a).**
**DÓNDE SE VE.** Transiciones de grilla en piezas de producto; se nota sobre todo con n>10.

---

### 4. ANTICIPACIÓN — *anticipation / contramovimiento*
**QUÉ ES.** Antes de ir a la derecha, el objeto se corre un poco a la izquierda. Prepara al ojo y hace que el movimiento principal se lea aunque sea de 3 cuadros.
**CÓMO SE HACE EN AE.** Tres claves en la misma propiedad: `0c` valor base, `3c` valor base − 8% del recorrido, `15c` destino. Sale con HOLD nunca; sale con lineal en el primer tramo y desacelerado en el segundo.
**TIEMPOS Y CURVAS.** Anticipación **2–4 cuadros**, magnitud **5–15%** del recorrido, en sentido opuesto. Regla proporcional: `dur/4`, tope 5 c. El tramo de anticipación va **acelerando** (influencia saliente baja), el principal desacelerando.
**CLASIFICACIÓN. (a)** — tres claves en una propiedad que ya exportás.
**DÓNDE SE VE.** Es el principio 2 de Disney; en motion graphics está en cualquier entrada de personaje o de objeto con masa.
**HONESTIDAD.** Los 2–4 cuadros son práctica de oficio; no encontré una cifra publicada citable.

---

### 5. SOBREPASO Y ASENTAMIENTO — *overshoot & settle*
**QUÉ ES.** El objeto pasa de largo su destino y vuelve. Es la diferencia entre "un valor cambió" y "algo llegó".
**CÓMO SE HACE EN AE.** Tres o cuatro claves: destino, sobrepaso, retorno. Con dimensiones separadas (`prop.dimensionsSeparated = true`) podés sobrepasar sólo en Y y no en X, que es lo que hace que se sienta gravedad.
**TIEMPOS Y CURVAS.** Magnitud **8–20%** para un pop, **3–6%** para un asentamiento sutil. Cada oscilación siguiente es **la mitad**: 120 → 90 → 105 → 97,5 → 100. A 3 Hz una oscilación completa son **10 cuadros**; con decaimiento 5 está muerta a los **12–15**. Recetas concretas en §1.7.
**CLASIFICACIÓN. (a)** — es literalmente lo que tu brief llama "sobrepaso real con dimensiones separadas". Ya lo tenés.
**DÓNDE SE VE.** Todo. Es el gesto que separa motion graphics de una presentación.

---

### 6. REBOTE — *bounce*
**QUÉ ES.** Distinto del sobrepaso: los rebotes son **arcos parabólicos** con altura decreciente y frecuencia **creciente**. Un sobrepaso oscila con período constante; un rebote se acelera.
**CÓMO SE HACE EN AE.** Claves calculadas: velocidad de impacto `v`, elasticidad `e`, duración del segmento `2v/g`. Después de cada impacto, `v *= e` **y** `dur *= e`.
**TIEMPOS Y CURVAS.** Ebberts: **elasticidad 0,7**, gravedad 5000, máximo 9 rebotes. Con e=0,7 el segundo rebote llega a 49% de altura y dura 70% del tiempo. En la práctica se cortan a **3–4 rebotes**; el resto no se ve. Cada segmento arranca y termina con velocidad no nula (lineal en el impacto, no ease) — **poner Easy Ease en el punto de impacto mata el rebote**.
**CLASIFICACIÓN. (a)** — claves calculadas por tu generador. No necesitás la expresión, necesitás la fórmula.
**DÓNDE SE VE.** Íconos de app, notificaciones, cualquier cosa con "personalidad" en piezas de marca amable.

---

### 7. ARRASTRE / SEGUIMIENTO — *follow through / overlap / drag*
**QUÉ ES.** Cuando el padre frena, el hijo sigue un cachito y después se acomoda. Es lo que hace que un grupo se lea como un objeto con partes y no como un bloque rígido.
**CÓMO SE HACE EN AE.** Emparentado + desfase: el hijo tiene su **propia** animación (posición o rotación local) desplazada 2–4 cuadros respecto de la del padre. A mano se hace con `valueAtTime(time − 0.1)`; vos lo escribís como claves.
**TIEMPOS Y CURVAS.** Desfase de arranque **2–4 cuadros**; el hijo termina **3–6 cuadros después** que el padre. Magnitud del arrastre 15–30% del movimiento del padre. La rotación es la propiedad más barata: ±4° a ±10°.
**CLASIFICACIÓN. (a)** — tenés emparentado y las seis transformaciones. Receta: padre `0→12c`; hijo, rotación local `0c: 0°` → `8c: −6°` → `18c: 0°`.
**DÓNDE SE VE.** Principio 5 de Disney. En motion graphics, cualquier tarjeta con contenido adentro que se mueve.

---

### 8. ACCIÓN SECUNDARIA — *secondary action*
**QUÉ ES.** Mientras el protagonista hace lo suyo, un elemento distinto hace un gesto chico que lo apoya. No compite; refuerza.
**CÓMO SE HACE EN AE.** Un segundo elemento con el mismo instante de arranque (o +1/+2 cuadros) y magnitud reducida.
**TIEMPOS Y CURVAS.** Magnitud **20–40%** de la del principal. Misma curva. Mismo arranque o +1–2 c.
**CLASIFICACIÓN. (a).** Y es la mitad de la cura de tu problema: sube `E_total` sin bajar la dominancia por debajo de 0,45.
**DÓNDE SE VE.** Universal. Es la razón por la que un cuadro profesional tiene 3–5 cosas moviéndose y aun así se lee.

---

### 9. GOLPE / ACENTO — *hit / accent / pop*
**QUÉ ES.** Un elemento ya presente pega un salto de escala u opacidad de 4–6 cuadros y vuelve. Marca el beat sin agregar información.
**CÓMO SE HACE EN AE.** `ADBE Scale`, tres claves: `100 → 106 → 100`. Sobre texto se usa interletra o peso; sobre un sólido, escala.
**TIEMPOS Y CURVAS.** **4–8 cuadros total**. Subida 1–2 c casi lineal, bajada 3–6 c desacelerada. Magnitud 4–8% en escala. Sobre opacidad: 100 → 100 nunca; se hace con una capa de brillo encima, 0 → 60 → 0.
**CLASIFICACIÓN. (a).** Además, con el resplandor declarado por comentario que ya soportás, un acento de bloom es gratis.
**DÓNDE SE VE.** Piezas musicales, lyric videos, VJ. Es el gesto que más directamente resuelve "no tiene el beat".

---

### 10. LATIGAZO — *whip / snap / dash*
**QUÉ ES.** Un traslado tan rápido que sólo se ve el borrón. El ojo no sigue el objeto: registra que desapareció de un lado y apareció del otro.
**CÓMO SE HACE EN AE.** Dos claves de posición separadas **2–4 cuadros** con un recorrido de 1 a 3 anchos de pantalla, y **obturador obligatorio**.
**TIEMPOS Y CURVAS.** 2–4 cuadros. Obturador **180°** para un latigazo normal, hasta **360°** para uno extremo (más ángulo = más estela). Curva: acelerado enfático saliendo, `(0.3, 0, 0.8, 0.15)`; o lineal si va a cortar en negro.
**CLASIFICACIÓN. (a)** — tenés obturador con ángulo y fase. **Sin obturador esto se ve roto, no rápido.** Es el gesto donde tu soporte de motion blur se paga solo.
**DÓNDE SE VE.** Transiciones de latigazo en piezas deportivas y de música; también en el corte entre secciones de piezas de producto.

---

### 11. RETENCIÓN — *hold / dwell / la pausa*
**QUÉ ES.** El protagonista se apaga. Nada nuevo arranca. Es lo que convierte una secuencia de gestos en una **frase**.
**CÓMO SE HACE EN AE.** No hacer nada, deliberadamente — o `KeyframeInterpolationType.HOLD` para congelar duro.
**TIEMPOS Y CURVAS.** **6–12 cuadros** = coma. **15–20** = punto. **>20 sin ambiente** = muerto. Y el número duro documentado: texto animado necesita **1 s inmóvil cada 13 caracteres**; una línea de 30 caracteres necesita **2,3 s = 69 cuadros quietos**. Los estándares de subtítulo dan el mismo orden (12–20 caracteres/s; BBC 2–5 s por bloque).
**CLASIFICACIÓN. (a)** — es ausencia de claves.
**DÓNDE SE VE.** El remate de cualquier pieza publicitaria. La pausa antes del logo.

---

### 12. DERIVA AMBIENTE — *idle / drift / breathing*
**QUÉ ES.** Un movimiento continuo, lentísimo, que nunca resuelve, en el fondo o en elementos de apoyo. Su función es que el cuadro no se congele durante las retenciones.
**CÓMO SE HACE EN AE.** Claves lentas de posición/escala/rotación en elementos de fondo, con recorridos chicos y períodos largos. En vez de `wiggle`, escribís 3–4 claves distribuidas en toda la pieza.
**TIEMPOS Y CURVAS.** Amplitud **<1,5% de escala** o **<15 px de posición** en toda la pieza. Período 4–10 s. Curva suave, casi lineal, o auto-bezier.
**CLASIFICACIÓN. (a).** **Advertencia, y es tu diagnóstico:** esto por sí solo NO es beat. Es el piso, no el edificio. Tu pieza era esto y nada más.
**DÓNDE SE VE.** Fondos de piezas de tecnología; el paralaje lento detrás de un título.

---

### 13. RELEVO — *baton pass / handoff*
**QUÉ ES.** La salida de un elemento **provoca** la entrada del siguiente: se van solapando 2–4 cuadros y la energía nunca cae a cero. Es lo que hace que una pieza fluya en vez de ser diapositivas.
**CÓMO SE HACE EN AE.** El `outPoint` del gesto A y el arranque del gesto B se solapan. En Sequence Layers es exactamente la opción **Overlap** con duración positiva.
**TIEMPOS Y CURVAS.** Solape **2–5 cuadros**. Si el solape es 0, hay corte; si es >8, se pisan y se pierde la dominancia.
**CLASIFICACIÓN. (a).**
**DÓNDE SE VE.** Explainers, piezas de onboarding. Es la estructura estándar de una pieza de 30 s con varios mensajes.

---

### 14. CORTE A TIEMPO — *beat cut / hard cut*
**QUÉ ES.** No hay transición: en el cuadro N hay una cosa y en el N+1 hay otra. Es el gesto más fuerte del repertorio y el más barato.
**CÓMO SE HACE EN AE.** `inPoint` / `outPoint` de capas, o tapas que aparecen con claves HOLD de opacidad. Con `KeyframeInterpolationType.HOLD` no hay interpolación y el cambio es de un cuadro al otro.
**TIEMPOS Y CURVAS.** **0 cuadros de transición.** El corte tiene que caer **exacto** en el beat (múltiplo de 15). Un corte a 1 cuadro del beat se siente mal y nadie sabe por qué.
**CLASIFICACIÓN. (a)** — HOLD + apilado + tiempos de entrada/salida. Todo soportado.
**DÓNDE SE VE.** Todas las piezas rítmicas. Es la herramienta principal de sincronía con música.

---

### 15. BARRIDO CON TAPA — *wipe reveal*
**QUÉ ES.** Un sólido del color del fondo se corre y va destapando lo que hay debajo. Sin máscaras.
**CÓMO SE HACE EN AE.** Tapa encima en el orden de apilado; se anima `ADBE Position` de la tapa. Un texto se revela con la tapa saliendo hacia el mismo lado que la dirección de lectura.
**TIEMPOS Y CURVAS.** **8–14 cuadros** para una línea de texto; 14–18 para un bloque. Desacelerado enfático `(0.05, 0.7, 0.1, 1)`. Escalonado entre líneas: 3–4 cuadros.
**CLASIFICACIÓN. (a)** — es exactamente el recurso de la tapa que ya usás. **Es tu sustituto de trim paths y de matas de pista para el 80% de los casos.**
**DÓNDE SE VE.** Títulos de documental, tercios inferiores, cualquier revelado tipográfico editorial.

---

### 16. BARRIDO CONTRARIO — *counter-wipe / split reveal*
**QUÉ ES.** El texto entra hacia un lado mientras la tapa sale hacia el otro. El elemento parece emerger de detrás del borde, no aparecer.
**CÓMO SE HACE EN AE.** Dos animaciones opuestas: la tapa se corre +X y el texto de debajo va de −20 px a 0 en X, en el mismo tramo de tiempo.
**TIEMPOS Y CURVAS.** Mismo tramo, 10–14 cuadros. El texto recorre **15–25% de lo que recorre la tapa** — si recorre lo mismo, no se lee el paralaje.
**CLASIFICACIÓN. (a).**
**DÓNDE SE VE.** Kinetic typography editorial; el estándar de tercios inferiores en piezas de marca.

---

### 17. APLASTAMIENTO Y ESTIRAMIENTO — *squash & stretch*
**QUÉ ES.** El objeto se alarga en la dirección del movimiento y se achata al impactar. Le da masa.
**CÓMO SE HACE EN AE.** `ADBE Scale` con las dimensiones desacopladas: en la caída, `X 92 / Y 108`; en el impacto, `X 115 / Y 85`; después vuelve a 100/100 con sobrepaso. El **anclaje tiene que estar en el punto de contacto**, no en el centro, o el aplastamiento flota.
**TIEMPOS Y CURVAS.** El estiramiento dura lo que dura el traslado. El aplastamiento **2–3 cuadros**, y la recuperación 6–10 con sobrepaso. Magnitud 8–20%.
**CLASIFICACIÓN. (a)** — escala no uniforme + anclaje, las dos exportadas. Notar que sí necesitás poder animar escala X e Y por separado.
**DÓNDE SE VE.** Principio 1 de Disney. En motion graphics, íconos y elementos "amables".

---

### 18. PULSO SINCRÓNICO — *pulse / beat sync*
**QUÉ ES.** Varios elementos laten juntos exactamente sobre el beat. Es la forma más literal de "tener beat", y por eso hay que usarla poco.
**CÓMO SE HACE EN AE.** Un acento (gesto 9) repetido cada N cuadros, con N = cuadros por beat. Los elementos pueden latir en el beat (todos juntos) o alternados: pares en el beat, impares en el contratiempo.
**TIEMPOS Y CURVAS.** Cada 15 cuadros a 120 BPM. Duración del pulso 4–6 c, magnitud 3–6%. En contratiempo, desplazado 7 u 8 cuadros.
**CLASIFICACIÓN. (a).**
**DÓNDE SE VE.** Visuales de música, lyric videos, VJ loops. En piezas corporativas se usa muy diluido (magnitud 2–3%) para que el fondo "respire" a tempo.

---

### 19. SÍNCOPA — *offbeat accent*
**QUÉ ES.** Un acento que cae **entre** dos beats, no encima. Es lo que evita que la cuantización se vuelva un metrónomo.
**CÓMO SE HACE EN AE.** Arranque en `beat + 7` u `8` cuadros (la corchea) en vez de en el beat.
**TIEMPOS Y CURVAS.** Desplazamiento de media subdivisión: 7–8 cuadros a 120 BPM. Proporción sugerida: **1 de cada 4 o 5 acentos** en contratiempo. *Esta proporción es mía, no es práctica publicada.*
**CLASIFICACIÓN. (a).**
**DÓNDE SE VE.** Cualquier pieza montada sobre música con groove; el contraste contra el pulso recto es el efecto.

---

### 20. CÁMARA COMO PUNTUACIÓN — *camera as accent, not as show*
**QUÉ ES.** La cámara no viaja: pega empujones cortos sobre beats concretos y se queda quieta el resto. Es lo contrario de lo que hiciste.
**CÓMO SE HACE EN AE.** Claves de posición de cámara en tramos de 6–12 cuadros con HOLD (o simplemente sin claves) en el medio. Un empujón de 3–8% de distancia focal aparente basta.
**TIEMPOS Y CURVAS.** Empujón **6–12 cuadros**, acelerado-desacelerado. Entre empujones, **quieta 30–60 cuadros**. Presupuesto: la cámara no debería aportar más del **~20% de `E_total`** de la pieza.
**CLASIFICACIÓN. (a)** — cámara 3D con perspectiva y punto de interés, ya soportada con 0,043 px de error.
**DÓNDE SE VE.** Es la mecánica de la referencia que admirás: la cámara casi no se mueve y las cosas hacen cosas. Cuando se mueve, es para puntuar.

---

### 21. PARALAJE ESCALONADO — *depth stagger*
**QUÉ ES.** El mismo gesto en tres planos de profundidad distintos, cada plano con magnitud y retardo distintos. El movimiento se lee como espacio, no como capas.
**CÓMO SE HACE EN AE.** Tres grupos en Z distintas, emparentados a un nulo que se traslada. La perspectiva de la cámara les da la diferencia de recorrido gratis; el retardo se lo ponés vos.
**TIEMPOS Y CURVAS.** Retardo **2–3 cuadros por plano**, del fondo al frente (el frente arranca **primero** si querés sensación de velocidad; el fondo primero si querés sensación de profundidad que se abre). Recorrido relativo lo resuelve la cámara.
**CLASIFICACIÓN. (a)** — 3D + emparentado + cámara, todo soportado.
**DÓNDE SE VE.** Aperturas de piezas de tecnología; el género entero de "interfaz flotando en el espacio".

---

## 3. LO QUE EXIGE TOCAR EL EXPORTADOR — clase (b)

### B1. GRILLA DE BEATS EN EL DOCUMENTO
**QUÉ FALTA.** El documento no lleva el tempo. Exportar `comp.markerProperty` (marcadores de composición) y/o un campo `beatGrid: { bpm, offset, subdivision }`.
**POR QUÉ VALE LA PENA.** Es lo más barato de todo el frente y habilita: cuantización verificable, la compuerta 4 de §1.8, y que el motor web pueda sincronizar con audio más adelante. **Costo: un campo.** Es la primera cosa que haría.

### B2. REMAPEO DE TIEMPO POR GRUPO — *time remap / freeze*
**QUÉ FALTA.** Poder congelar, ralentizar o pisar el tiempo de un **grupo entero** (`ADBE Time Remapping` sobre una precomposición). Sin esto, un congelamiento en el impacto obliga a duplicar claves en cada capa del grupo.
**POR QUÉ VALE LA PENA.** El *freeze frame* sobre el beat es un gesto de primera línea y hoy es carísimo de escribir. **Media.**

### B3. TASA DE PASOS POR CAPA — *step rate / animar "en 2s"*
**QUÉ FALTA.** Un campo `stepFps` por capa para que el motor muestree su animación a 12 o 15 fps en vez de 30.
**POR QUÉ VALE LA PENA.** Animar "en doses" es un recurso rítmico deliberado (y muy de moda), y hoy lo tendrías que emular con una clave HOLD cada dos cuadros — técnicamente clase (a), pero duplica el tamaño del documento. **Baja-media.**

### B4. ESTELA / ECO TEMPORAL — *echo / trail*
**QUÉ FALTA.** Repetición de una capa con retardo y opacidad decreciente. Se puede emular con N copias desfasadas (clase (a), N capas), pero un `echo: {copias, retardo, decaimiento}` lo haría gratis.
**POR QUÉ VALE LA PENA.** Es la forma clásica de que un latigazo o un acento "suene" más fuerte. **Baja** — con 3 copias desfasadas ya tenés el 90%.

---

## 4. LO QUE NO VALE LA PENA — clase (c)

### C1. CUADROS DE DEFORMACIÓN — *smear frames*
Un cuadro o dos de deformación extrema dibujada a mano en el pico de velocidad. Exigiría exportar una secuencia de imágenes por gesto. **Tu obturador con ángulo y fase ya te da el 85% de la lectura, por cero costo adicional.** No lo tocaría.

---

## 5. HONESTIDAD — qué está documentado y qué es mío

**Documentado y verificado en esta sesión:**
- Easy Ease = velocidad 0, **influencia 33,33%** de ambos lados (Adobe/Creative COW/van Dijk) → `cubic-bezier(0.333,0,0.667,1)`.
- Tokens de curva de Material Design 3: `emphasized (0.2,0,0,1)`, `emphasized-decelerate (0.05,0.7,0.1,1)`, `emphasized-accelerate (0.3,0,0.8,0.15)`, `standard-decelerate (0,0,0,1)`, `standard-accelerate (0.3,0,1,1)`.
- **120 BPM a 30 fps = 15 cuadros por beat**, exacto.
- Ebberts: sobrepaso `amp·sin(t·f·2π)/exp(t·decay)` con **f=3, decay=5**; rebote con **elasticidad 0,7**, gravedad 5000, nMax 9; `segDur = 2v/g`, y `v *= e` **y** `segDur *= e` por rebote.
- Secuencia de sobrepaso 120/90/105/97,5/101,25/100 — **cada oscilación es la mitad de la anterior**.
- Legibilidad: **1 s inmóvil cada 13 caracteres** para texto animado; 30 caracteres → 2,3 s. Subtítulos 12–20 CPS, BBC 2–5 s, Netflix 1–7 s.
- Motion.dev: el stagger es un incremento que vos elegís (ejemplo canónico 0,1 s = 3 cuadros @30), con `from: first/center/last/índice` y easing sobre la distribución.
- Sequence Layers con Overlap: duración positiva solapa, **negativa deja huecos**.
- Los tokens de **duración** de M3 sólo los pude confirmar parcialmente (50/100/250/300/450/500 ms). La escala completa (short1-4 50–200, medium1-4 250–400, long1-4 450–600, extra-long1-4 700–1000) la doy **de memoria, no confirmada esta sesión**.

**No documentado — práctica de oficio que doy como tal:**
- Duraciones típicas por escala de gesto en cuadros.
- Salida = 60–70% de la entrada.
- Anticipación 2–4 cuadros, 5–15% de magnitud. **Busqué específicamente una cifra publicada de cuadros de anticipación y no la encontré.**
- Rangos de escalonado 1–6 cuadros.
- Desfase de arrastre 2–4 cuadros, magnitud 15–30%.
- Acción secundaria 20–40% de magnitud.

**Mío, síntesis, no práctica establecida — decilo si lo publicás:**
- La fórmula `retardo = clamp(2·dur/(n−1), 1, 6)`.
- Toda la §1.8: la métrica de energía, dominancia, `N_activos`, y las cinco compuertas. **La literatura de *staging* dice "no animes todo a la vez" y no da ningún número. Nadie publica una cifra.** Los umbrales (dominancia 0,45–0,85, `N_activos` ≤ 5, ≥1 onset por segundo, 30–60 onsets en 12 s) son mi calibración y hay que validarlos midiendo piezas reales antes de tratarlos como verdad.
- La estimación de que tu pieza tenía 5–8 onsets: es inferencia desde tu diagnóstico, no una medición.
- La proporción "1 de cada 4–5 acentos en contratiempo".
- La traducción influencia AE ↔ cubic-bezier de la tabla de §1.2 (la matemática es correcta y estándar; las columnas de influencia recomendadas son mías).

**matchNames.** Confirmo con confianza `ADBE Transform Group`, `ADBE Anchor Point`, `ADBE Position`, `ADBE Scale`, `ADBE Rotate Z`, `ADBE Opacity`, y la API `KeyframeEase(velocidad, influencia)` / `setTemporalEaseAtKey` / `setInterpolationTypeAtKey` / `dimensionsSeparated`. **No confirmados esta sesión:** `ADBE Position_0/_1/_2` (alta confianza), `ADBE Time Remapping` (alta confianza), `comp.motionBlurShutterAngle` / `comp.motionBlurShutterPhase` (media-alta). **No inventé ninguno**: los que no verifiqué van marcados.

---

## 6. SI TUVIERAS QUE HACER TRES COSAS

1. **Cuantizar los arranques.** Elegí subdivisión 8 cuadros, acento 15. Mové cada arranque de gesto al múltiplo más cercano. Cero código nuevo, cambio inmediato.
2. **Poner un protagonista por beat y bajar la cámara a puntuación.** La cámara deja de viajar; se queda quieta 30–60 cuadros y pega empujones de 6–12. En cada beat, un elemento con delta grande y 2–4 de apoyo al 20–40%.
3. **Construir la compuerta de §1.8.** Se calcula sobre el documento exportado, sin render, en milisegundos. Cinco números: onsets por segundo, dominancia, `N_activos`, % de arranques cuantizados, y racha máxima de silencio. Es lo que convierte "está como muerto" en un número que se puede fallar.

**Sources:**
- [Keyframe velocity / Easy Ease 33.33% — Sander van Dijk](http://www.sandervandijk.tv/after-effects-features/keyframes)
- [Apply and control speed changes — Adobe After Effects Help](https://helpx.adobe.com/after-effects/desktop/animate-in-after-effects/speed-between-keyframes/speed.html)
- [Bounce and Overshoot — Dan Ebberts, MotionScript](https://motionscript.com/articles/bounce-and-overshoot.html)
- [The Bounce and Overshoot Animation Trick — Mt. Mograph](https://mtmograph.com/blogs/tools/the-bounce-and-overshoot-animation-trick-every-motion-designer-should-know)
- [stagger() — Motion.dev docs](https://motion.dev/docs/stagger)
- [Easing and duration tokens — Material Design 3](https://m3.material.io/styles/motion/easing-and-duration/tokens-specs)
- [Rules for text in videos — legibility.info](https://legibility.info/rules-for-text-in-videos)
- [Subtitle Timing standards — subtitling.net](https://subtitling.net/standards/subtitle-timing)
- [Frame Rate to BPM Calculator](https://bchillmix.com/pages/frame-rate-bpm)
- [Syncing Motion Graphics to Music — Richard Harrington](https://www.richardharrington.com/blog/2025/1/13/syncing-motion-graphics-to-music-in-after-effects-tap-out-the-beat)
- [How to Create a Staggered Layer Sequence in After Effects — Frame.io](https://blog.frame.io/2023/12/13/insider-tips-how-to-create-a-staggered-layer-sequence-in-after-effects/)
- [Selecting and arranging layers (Sequence Layers) — Adobe](https://helpx.adobe.com/after-effects/using/selecting-arranging-layers.html)
- [Staging in Animation — VSQUAD](https://vsquad.art/blog/what-is-staging-in-animation-a-complete-beginners-guide)
- [Anticipation Principle — School of Motion](https://www.schoolofmotion.com/blog/anticipation-principle-quick-tip)
- [Oscillations — School of Motion Animation Bootcamp (archive.org)](https://archive.org/stream/SchoolOfMotionAnimationBootcamp/Week%203/Day%2011/Oscillations_djvu.txt)