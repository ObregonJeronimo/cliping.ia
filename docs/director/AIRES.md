# AIRES — cómo se llega a cientos de formatos sin escribir cientos de videos

## El problema

ANTHEM (`render3d/demo/`) fija el **estándar de calidad**: qué tan bien y qué tan fluido tiene que
verse una pieza. Pero su estética — oscura, HUD, acento eléctrico — sirve para software y no para un
asador. Hay miles de rubros y, dentro de cada uno, distintos públicos, intenciones y fuerzas.

Escribir un video por combinación no escala. La salida es **combinatoria**:

```
(N arquetipos de escena)  ×  (M aires)  ×  (variación por seed)
```

Cada combinación es coherente porque **el aire gobierna todo a la vez** — paleta, tipografía, ritmo,
gesto, cámara y tratamiento — en vez de dejar que cada decisión se elija por separado.

## Las métricas se parten en dos familias

Esta es la idea que hace que "cientos de formatos" sea medible en vez de una opinión.
`tools/medir-video.py` devuelve doce métricas, y se leen en dos grupos:

**CALIDAD — piso común, no negociable en ningún estilo.**

| métrica | piso |
|---|---|
| píxeles en movimiento | ≥ 0.15 |
| frames casi quietos | ≤ 0.15 |
| quietud máxima | ≤ un beat |
| ocupación del cuadro | ≥ 0.18 |
| cortes sobre el beat | ≥ 0.70 |
| movimiento vs nitidez | < 0 (si no, no hay obturador) |

**PERSONALIDAD — tiene que DIFERIR.** bpm, saturación, contraste, ocupación, intervalo entre cortes,
energía de cámara, clase tipográfica, familia de gestos.

> Una pieza de lujo se mueve **todo el tiempo** — lento, pero nunca quieta. Confundir "lento" con
> "quieto" es el error que convierte una marca cara en una diapositiva. Por eso el piso de movimiento
> es igual para los doce aires y lo que cambia es el BPM.

## Qué define un aire

```js
export default {
  id, bpm,
  paleta:   { tinta, bg, bg2, acento, acento2, calido },
  fuentes:  { display, apoyo },          // stems de tools/fonts
  gesto:    { llega, frena, acelera, vaiven },
  camara:   { dolly, orbita },
  pelicula: { bloom, umbral, radio, grano, vinieta, aberr },
}
```

Las seis escenas **no cambian ni una línea**. El kit exporta `LOOK`, `BEAT` y `E` con `let`, y los
módulos ES exportan *bindings vivos*: reasignarlos en `configurar(aire)` cambia lo que ven las seis
escenas sin que ninguna sepa que existe el concepto de aire.

### El gesto es la mitad de la personalidad

Y casi nadie lo mira. El **mismo** movimiento se lee distinto según la curva:

| curva | lectura |
|---|---|
| `back.out(2.2)` | decidido |
| `back.out(4.0)` | físico, con fuerza |
| `elastic.out(1, 0.4)` | juguetón |
| `power4.out` | costoso — se posa, no rebota |
| `steps(3)` | hecho a mano, stop-motion |

Las 319 curvas literales de las escenas pasaron a pedir un **gesto** (`llega`, `frena`, `acelera`,
`vaiven`) y el aire decide con qué curva se resuelve. El aire base devuelve exactamente las curvas
originales: cambiar de familia es una decisión, no un efecto secundario del refactor.

### El tratamiento es del aire, no del arnés

Un bloom calibrado sobre un acento azul **revienta** sobre un amarillo flúor: el amarillo ya entra al
pase con dos canales cerca de 1.0, así que florece el glifo entero y el texto sale como una mancha
blanca ilegible. Cada aire trae su propia exposición porque cada paleta pega distinto contra el mismo
pase. Un acento claro o muy saturado pide umbral 0.80–0.92 y fuerza baja; uno apagado admite lo
contrario.

## Prueba

Las mismas seis escenas, tres aires:

| | técnico | lujo | deportivo |
|---|---|---|---|
| duración | 17.4s | **28.4s** | **15.4s** |
| bpm | 124 | 76 | 140 |
| intervalo entre cortes | 0.86s | 1.17s | 0.93s |
| píxeles en movimiento | 0.235 | 0.194 | 0.278 |
| frames casi quietos | 0.073 | 0.103 | 0.058 |
| ocupación del cuadro | 0.332 | **0.225** | **0.421** |
| contraste | 0.186 | 0.142 | 0.193 |
| cortes sobre el beat *(cada uno a SU bpm)* | 0.882 | 0.857 | 0.929 |

Los tres pasan el piso. Los tres ocupan puntos distintos del espacio de personalidad. Y la duración
cambia sola porque las escenas se miden en **beats**, no en segundos.

> Medir los tres contra 124 BPM daba un "cortes sobre el beat" sin sentido para los que corren a 76 y
> a 140. Cada aire se mide contra **su** tempo.

## Cómo se agrega un aire

1. `render3d/demo/aires/<id>.js` con el descriptor.
2. Renderizarlo: `grabar_mp4` con `spec.aire = '<id>'`.
3. Medirlo: `python tools/medir-video.py tools/out/AIRE-<id>.mp4 --bpm <su bpm>`.
4. **Mirarlo.** El analizador dice si la pieza se mueve; no dice si se ve bien. Para eso hay que abrir
   la tira de cuadros.

## Lo que falta

El aire todavía se elige a mano. El paso siguiente es que lo elija el **pagemodel**: el rubro
detectado, el mood medido, la formalidad y el público declarado seleccionan el aire, y el seed varía
dentro de él. Ahí es donde esto se conecta con el motor generativo y deja de ser una demo.
