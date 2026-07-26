# render3d — Three.js + GSAP dentro de Chrome headless

Un **backend de dibujo** para la timeline del Director, no un motor nuevo. El *qué* y el *cuándo*
siguen saliendo de `src/director` (medidos de la página del usuario, deterministas, editables en el
estudio). Acá se decide solamente **cómo se ve**.

```
pagemodel → guion → storyboard → timeline          (src/director, sin cambios)
                                     ↓
                    tools/render3d-spec.mjs        traduce, no re-decide
                                     ↓
              render3d/escena.js  ·  Three.js + GSAP
                                     ↓
                    Chrome headless (WebGL 2.0)
                                     ↓
                  WebCodecs VP9 → IVF → ffmpeg → MP4
```

`src/director` **no importa three ni gsap**: el gate `director-independence-check` sigue verde y el
motor sigue puro. La dependencia de WebGL vive acá afuera y consume el JSON de la timeline.

## Por qué WebGL y no canvas 2D

Canvas 2D no tiene cámara. Puede escalar y trasladar una imagen, pero no puede moverse *alrededor* de
ella. Sin cámara no hay paralaje real, no hay tarjeta que gire mostrando su canto, no hay bloom sobre
el acento de la marca y no hay desenfoque de movimiento. Esa es la distancia entre una plantilla
animada y una pieza de After Effects.

Lo que agrega, concretamente:

| | |
|---|---|
| **Profundidad real** | el `z` del storyboard deja de ser orden de pintado y pasa a ser distancia: el fondo casi no se mueve, el chip de marca se mueve mucho |
| **Gesto 3D de entrada** | la capa llega desde atrás y girada sobre su eje, y se resuelve en plano. En 2D un objeto solo puede crecer o deslizarse; acá **llega** |
| **Desenfoque de movimiento** | por ángulo de obturador, integrando submuestras dentro del frame: lo quieto queda nítido y lo que se mueve se arrastra, cada objeto según *su* velocidad |
| **Bloom / grano / viñeta / aberración** | sobre el acento medido de la marca |

## Determinismo

Es invariante del repo, no una preferencia.

- Nada de `requestAnimationFrame`: el driver llama `seek(t)` y después `render()`. El reloj es de afuera.
- Las timelines de GSAP nacen `paused: true` y se recorren con `.time(t)`.
- Nada de `Math.random`: PRNG con semilla, la misma familia que usa el Director.
- El grano recibe el tiempo como *uniform* — por eso hay un pase propio y no `FilmPass`, que lo anima
  con un reloj interno y daba dos granos distintos para el mismo `t`.
- **SwiftShader** (rasterizado por CPU) da el mismo frame en cualquier máquina. `gpu=True` es 3× más
  rápido pero depende del driver y de la placa: sirve para preview, nunca para un gate.

## El cuello de botella no era renderizar

Medido en este repo, a 1080×1920:

```
dibujar un frame (4 submuestras de obturador)      6 ms
dibujar un frame (1 muestra)                       3 ms
sacarle un PNG con Playwright                    530 ms   ← el 99%
getImageData en la página                         10 ms
```

Sacar los frames costaba 88× más que producirlos. Con **WebCodecs** el frame nunca sale del navegador:
se codifica ahí mismo y al final viaja un solo video. Un reel de 13.9 s (417 frames) pasó de **501 s
a 10 s**.

VP9 y no H.264 porque Chromium **no trae encoder de H.264** (`isConfigSupported` devuelve `false`
para `avc1`); sí trae libvpx. Los chunks crudos se meten en un **IVF** — 32 bytes de cabecera y 12 por
frame, el envase más simple que ffmpeg lee sin ambigüedad — y ffmpeg transcodifica a H.264, porque VP9
dentro de un MP4 casi no reproduce fuera de Chrome e Instagram lo rechaza.

## Dos cosas que se veían mal y por qué

- **Todo lavado.** `ACESFilmicToneMapping` sobre una paleta que ya es sRGB la trata como si fuera HDR
  y levanta los claros: el blanco de la marca dejaba de ser su blanco. Ahora no hay mapeo de tono
  salvo que el spec lo pida.
- **El tratamiento de película es un preset y no debería.** Bloom, viñeta y grano están pensados sobre
  negro. Con valores fijos sobre una landing de fondo casi blanco — la mitad de las landings — el
  cuadro entero superaba el umbral y florecía, la viñeta se leía como suciedad y el grano como ruido
  de escaneo. Ahora **todo cuelga de la luminancia del fondo medido**: sobre claro casi no se toca
  nada, sobre oscuro entra completo.

Y un tercero que era un error de unidades: los tamaños de texto del Director son **fracción del alto
total del cuadro**, así que rasterizar una capa dentro de un lienzo del tamaño de su caja dibujaba un
titular de 0.11 del cuadro a 0.11 de su propia caja — el nombre de la marca salía como una nota al
pie. Se dibuja a cuadro completo y se recorta con la transformación.

## Uso

```bash
node tools/render3d-spec.mjs stripe-com 1          # timeline -> spec + assets
python backend/render3d.py tools/out/render3d/spec-stripe-com-1.json \
       tools/out/render3d/assets tools/out/video.mp4
```

Desde Python:

```python
from render3d import grabar_mp4, render_frames
await grabar_mp4(spec, "salida.mp4", raiz_assets=..., gpu=True)   # camino rapido (WebCodecs)
await render_frames(spec, "frames/", cada=8)                      # PNG sueltos para mirar
```

`render_frames` sigue existiendo para hojas de contacto y para comparar contra el render 2D; es lento
por diseño (un PNG por frame) y no es el camino de producción.
