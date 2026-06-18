# 🎥 Cómo analizar VIDEOS correctamente (sin gastar) — método para agentes

> Plan operativo para auditar el MOVIMIENTO de los reels de Urvid desde una sesión de agente.
> Derivado de experimentos reales (jun 18): ver el "LOG" al final. Fuente de verdad del estado: `ARBOL.md`.
> **Regla madre:** un agente NO reproduce video ni percibe movimiento. Esto maximiza lo que se puede
> ENTENDER del movimiento por token, no PERCIBIRLO. La fluidez real (suavidad a 30fps, micro-judder)
> la juzga el USUARIO reproduciendo el MP4. No afirmar fluidez desde frames.

## Por qué el método (3 hechos medidos, no opinión)
1. **Leo CAMBIO, no playback.** Reconstruyo el movimiento comparando cuadros consecutivos e infiriendo
   la trayectoria de las DIFERENCIAS. Necesito que dos frames difieran lo suficiente para leer qué se movió.
2. **Más fps me EMPEORA.** A 30 fps en un tramo corto los cuadros son casi idénticos → delta por debajo de
   lo que distingo → quedo ciego al movimiento (medido: a 30fps no pude ni confirmar una convergencia que a
   8fps era obvia). El punto justo para ENTENDER el movimiento es **~6-10 fps sobre el tramo con acción**.
   El alto fps (24-30) solo sirve para UNA cosa: cazar un flicker/glitch de 1 frame.
3. **El costo son IMÁGENES, no frames ni fps.** Cada PNG cuesta ~lo mismo (≈ área en píxeles) tenga 1 o 24
   frames adentro. Las grillas/estelas meten muchos frames en 1 imagen → esa es la palanca de eficiencia.
   El movimiento además es RÁFAGA: casi todo el reel es "hold" estático; solo unos pocos instantes cambian.

## El método en capas (de gratis a quirúrgico)

### Capa 0 — Mapa de movimiento  ·  `node tools/render.mjs motionmap <json> [fps=24]`  ·  **0 tokens de visión**
Renderiza el timeline a baja resolución, mide el diff de píxeles entre frames y devuelve un **sparkline** +
las **ventanas calientes** (con el comando `window` ya armado para cada una). SIEMPRE correr esto PRIMERO:
te dice los ~3-5 instantes donde gastar imágenes; el resto es hold y no se mira.
- Caveat verificado: rankea CAMBIO CRUDO de píxeles → los cortes/wipes de pantalla completa dominan el top.
  Las entradas/asentamientos (partículas, texto que entra) salen como ráfagas MÁS CHICAS → mirar también esas,
  no solo el pico. El pico 100% suele ser una transición (útil igual: ahí viven los artefactos de cross-fade).

### Capa 1 — Overview  ·  `node tools/render.mjs video <json> <name> 12`  ·  **1 imagen**
Contact sheet de 12 frames repartidos en todo el reel (~1 fps en 12s). Da estructura/paleta/legibilidad del
estado ASENTADO, alma, bugs de layout, blobs sobre títulos. NO sirve para juzgar movimiento (sub-muestrea).

### Capa 2 — Sonda por ráfaga (1 imagen c/u, SOLO en las ventanas que marcó la Capa 0)
Elegir UNA por ráfaga según el tipo de movimiento:
- **Tira densa**  ·  `node tools/render.mjs window <json> probe <t0> <t1>`  (12 frames → fps = 12/(t1-t0))
  Apuntar a **~6-10 fps** (ventana de 1.2-2.0s). Preserva el TIMING/easing → "¿el arco del movimiento funciona?"
  + caza transitorios. Es el caballo de batalla (lo que destrabó ESPN/educ.ar en la auditoría de 9 páginas).
- **Estela / long-exposure**  ·  `node tools/render.mjs trail <json> <name> <t0> <t1> [K=7]`  (**1 imagen**)
  Compone K frames: lo que se mueve deja RASTRO, lo quieto queda nítido. Colapsa la trayectoria de la ráfaga
  en un golpe de vista → "¿qué se movió y hacia dónde?". **~6-8 ecos** es el punto justo (más = puré).
  - Brilla con movimiento ESPACIAL (texto que se desliza, forma que morfea, convergencia con dirección).
  - Mediocre con: partículas (ya son nube → mushy) y fades de pura opacidad (no hay desplazamiento → no estela).

### Capa 3 — Caza-flicker (opcional)  ·  `window <json> <name> <t> <t+0.3>`
Solo si se sospecha un glitch de 1 frame: micro-tira a ~30 fps sobre ese instante exacto. Único uso del alto fps.

### Recorte a la acción (multiplica resolución sin pagar lienzo vacío)
Para leer detalle fino (letterforms del wordmark, un artefacto), conviene renderizar/mirar SOLO la zona del
hero, no los 9:16 enteros. (Hoy `window`/`trail` rinden el cuadro completo; el recorte es mejora futura — por
ahora, encuadrar mentalmente o pedir un crop puntual.)

## Disciplina de presupuesto (lo que evita el gasto)
- **Default por video:** Capa 0 (gratis) + Capa 1 (1 img) + **≤3-4 sondas** dirigidas = **~4-5 imágenes** para
  una auditoría de movimiento COMPLETA. Comparar con barrer uniforme a 30fps = ~30 imágenes y peor resultado.
- **Nunca** barrer un reel entero a fps alto. **Nunca** leer 1 imagen por frame. **Nunca** subir fps "para ver
  mejor" (empeora). Si una ráfaga necesita más, **bajá** el fps (ensanchá la ventana), no lo subas.
- Para varios videos: Capa 0 de todos (gratis) → decidir cuáles ameritan sondas. El overview a ~1fps de muchos
  es barato (en la auditoría fueron 9 sin drama).

## Bonus de Urvid (determinista)
No hace falta grabar un MP4 y extraer frames: el motor (`drawFrame`) renderiza CUALQUIER t/región/composición
on-demand y exacto. Se puede aislar UN elemento (solo partículas, solo texto) para ver su movimiento limpio —
imposible con un MP4 ya grabado. El motion map y la estela son exactos, no muestreos aproximados.

## Para un MP4 REAL del usuario (no determinista — verificar Skia↔Chromium)
- Mapa de movimiento: `ffmpeg` (signalstats / select scene) o `tools/video-frames.mjs` a baja densidad.
- Sondas: `tools/video-frames.mjs <mp4> [fps] [cols] [rows] [t0] [t1]` → contact sheets de un tramo (ya existe).
- Útil además para cazar diferencias de fuente/render que el visor Skia no muestra.

## Flujo recomendado (checklist)
1. `motionmap` (gratis) → anotar las ventanas calientes.  2. `video ... 12` → overview (1 img).
3. Por cada ventana caliente relevante: `window` (timing) o `trail` (trayectoria) — elegir por tipo de movimiento.
4. Reportar SOLO lo que se ve en estado asentado + trayectorias; marcar lo de fluidez como "a verificar en MP4 (juez = usuario)".

## LOG de validación (jun 18)
- Medido que >5fps NO acerca a "ver el video" y de hecho lo empeora (5/8/15/30fps; 8fps fue el mejor para ENTENDER,
  30fps el peor: cuadros casi idénticos). Las 4 densidades dieron perceives_continuity=false y feels_like_video=false.
- `motionmap` validado en France24/Last.fm: aísla 3-5 ráfagas reales y marca todo el resto como hold (caveat: cuts
  dominan el pico). `trail` validado: claro con texto/convergencia espacial, mushy con partículas, plano con fades.
- Tooling agregado a `render.mjs`: modos `motionmap` y `trail` (+ `window`/`video` ya existían).
