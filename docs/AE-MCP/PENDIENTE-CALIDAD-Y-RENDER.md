# PENDIENTE · La calidad de render la elige el usuario, y el video lo hace SU máquina

> Estado: **DECIDIDO, SIN IMPLEMENTAR.** Decidido por Thiago el 16/8/2026.
> Documentado acá para que no se pierda, igual que `PLAN_NUBE.md`.

## La decisión de fondo

**El render lo hace la PC del usuario, en el navegador.** No hay servidor de render y no lo va a haber
por ahora: montar infraestructura es una inversión que hoy no se justifica. Todo lo que se construya
tiene que funcionar con esa premisa.

Eso **no cambia el motor**: es la misma página web corra donde corra. Pero sí cambia dos cosas del
producto — el usuario espera mirando, y la máquina que le toca no la elegimos nosotros.

## Los números que sostienen la decisión

Medido el 15-16/8/2026 sobre PIEZA-I (1920×1080, 39 capas, 900 cuadros = 30 s):

| | dibujar 1 cuadro | 900 cuadros con 16 submuestras |
|---|---|---|
| GTX 1660 Ti — **medido** | 7,7 ms | ~40 s |
| sin GPU (SwiftShader) — **medido** | 361 ms | ~29 min |
| notebook moderna (Iris Xe) — *estimado* | ~25-40 ms | **2 a 3,5 min** |
| notebook vieja (UHD 620) — *estimado* | ~60-90 ms | **5,5 a 8 min** |

**Sólo las dos primeras filas son medición.** Las otras salen de dónde caen esas GPU respecto de la
medida, y están sin verificar.

Y el dato que ordena todo: **el obturador es la única palanca real.** Pasar de 1 a 16 submuestras
multiplica el trabajo por **5,3×** (medido: 2,11 ms contra 11,19 ms sobre 50 capas). Encodear es
prácticamente gratis con WebCodecs porque los píxeles nunca salen de la GPU (`new VideoFrame(canvas)`
cuesta 0,1 ms: es un handle, no una copia).

## Lo que hay que construir

### 1 · Tres niveles de calidad, con 4 por defecto

| opción | submuestras | cómo se le presenta al usuario |
|---|---|---|
| baja | **1** | seleccionable, pero avisando que **la calidad es algo baja** |
| **normal** | **4** | **el valor por defecto** |
| máxima | **16** | con la advertencia de abajo |

La advertencia de máxima calidad, en el espíritu de: *"Máxima calidad — el video va a tardar
bastante más en renderizarse por el aumento de submuestras."*

**Por qué 4 y no 16.** El obturador es el desenfoque de movimiento: lo que hace que un objeto rápido
se vea con estela en vez de saltando. De 16 a 4 el tiempo cae a menos de la mitad y la diferencia
visual es chica salvo en los gestos muy rápidos — y en esta familia de piezas hay uno o dos por video.

### 2 · Barra de progreso con tiempo estimado

No un porcentaje pelado: **cuánto falta**. Y el estimado tiene que salir de cronometrar los primeros
cuadros de ESA máquina, no de una tabla.

### 3 · Medir la máquina en vez de adivinarla

**No existe forma de preguntarle al navegador si tiene GPU decente.** `hardwareAcceleration` es sólo
una sugerencia y no hay API que devuelva si te tocó hardware o software — está confirmado con la
documentación de MDN y con un pedido abierto en el W3C.

Lo único que se puede hacer, y alcanza: **cronometrar los primeros ~20 cuadros y decidir ahí.** Si va
rápido, dejar lo que el usuario pidió; si va lento, ofrecer bajar submuestras y decir por qué. Ese
mismo cronómetro alimenta el tiempo estimado de la barra.

## Detalles técnicos que ya están medidos y no hay que volver a averiguar

- **El códec.** `avc1.42001f` (Baseline 3.1) **NO funciona a 1080p** — el nivel topea en 720p, y es
  justo el string que más se cita como "el compatible con todo". Los que andan son
  **`avc1.4d0028` (Main 4.0)** y **`avc1.640028` (High 4.0)**, por hardware y por software.
- **Compatibilidad.** `VideoEncoder` está en Chrome 94+, Firefox 130+ y **Safari 16.4+** (marzo 2023).
  El "parcial" que muestra caniuse para Safari es por *Audio*Encoder, no por video. El único agujero
  duro es **Firefox en Android**, que no lo soporta en ninguna versión.
- **`MediaRecorder` no sirve, y no es por velocidad:** graba contra el reloj de pared, así que si un
  cuadro tarda 200 ms el video repite ese cuadro en vez de avanzar. Para una pieza determinista donde
  el cuadro 437 tiene que ser *el* cuadro 437, es incorrecto por construcción.
- **El camino que usa hoy `capturar-comp.py` es el lento:** un screenshot por cuadro encodea un PNG que
  después ffmpeg vuelve a decodificar. Medido en ~1025 ms por cuadro contra 4-7 ms de WebCodecs sobre
  el mismo canvas. *(Salvedad: ese ~1 s se midió con el panel oculto y huele a espera del compositor;
  hay que reconfirmarlo con la pestaña visible antes de citarlo como propiedad de Chrome.)*

## Lo que queda para investigar aparte

- **Qué pasa cuando el usuario cambia de pestaña.** El navegador frena el trabajo. Se resuelve o
  avisándole que no se vaya, o moviendo el render a un worker. **Decidido investigarlo después.**
- **La notebook enchufada y la misma a batería no son la misma máquina**: Windows y macOS bajan el
  reloj, puede ser el doble de lento. Conviene sugerir que enchufe.
- **Nadie midió una GPU integrada todavía.** Los números de Iris Xe y UHD 620 de la tabla son
  estimaciones. La primera notebook que aparezca hay que medirla.
