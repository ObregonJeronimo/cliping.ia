# RUMBO — qué falta para que el motor produzca piezas de calibre ANTHEM

Auditoría adversarial de cuatro ángulos independientes, cada uno con experimentos propios. Veredictos:
tres **con reservas** y uno **techo serio**. Todo lo de acá está medido, no opinado.

## Lo que ya está bien, y es la mitad difícil

- **El eje temporal es independiente del contenido.** 12 juegos de datos adversariales × 6 escenas =
  **72 builds, 0 fallos**, y las 12 métricas quedan planas contra ANTHEM: `ritmo_en_beat` 0.875 vs
  0.85–0.875, `mov_frac` 0.226 vs 0.233–0.249, quietud máxima 0.10 s (la referencia es la *peor*).
  Beats, staggers, flash de corte y retorno de cámara son **arquitectura, no decorado**.
- **El aire funciona como abstracción.** Cambiar de aire repinta el **97.48%** de los píxeles; cambiar
  el seed, el 0.57%. Las seis escenas leen `LOOK`/`BEAT`/`E` por binding vivo y ninguna sabe que el
  concepto existe.
- **El piso de calidad no depende de la página.** El contenido explica sólo 2.4–8.4% de la varianza de
  las métricas. Le tires la página que le tires, la calidad de movimiento no baja.
- **El guionista 2D ya resuelve la diversidad**: 14–34 secuencias distintas por página, 70 en la unión
  de 7 páginas, 4–8 gramáticas. La maquinaria existe — está en el otro motor.

## Bloqueantes

### 1. Fugas anti-invención — ARREGLADO

`frase()` rellenaba con el copy de ANTHEM (**46 de 84 slots**) y `tarjetas` caía a las cifras de la
demo (**7 de 12 fixtures**). El video de Stripe decía "ANIMA" y "CADA PÁGINA"; el de una página 404
salía 17 segundos diciendo **"300 MARCAS · 96 CIUDADES · 24 PREMIOS"**.

El archivo declaraba la regla en un comentario largo y la violaba tres líneas más abajo. Un fallback
que rellena con contenido **ajeno** no es robustez: es el defecto que la regla existe para impedir. Un
hueco vacío es un problema de composición — se ve, se arregla. Una frase ajena es un problema de
veracidad, y no se ve nunca.

Gate nuevo **E-INVENCION**: se construye cada escena con datos marcados con un centinela y se
intercepta `fillText` para auditar **todo lo que la escena escribe**. Si aparece una frase o una cifra
de ANTHEM, falla. Comprobado devolviendo la fuga.

### 2. La composición no aguanta contenido que no sea el de la demo

La banda segura de la marca en `apertura` es de **5 a 9 letras**. Con `"Q"` la letra mide 14.31
unidades en un cuadro de 10 (**143%**); con ≥10 letras el nombre **se trunca en silencio**
("CONSTRUCCIONES DEL SUR" → "CONSTRUCC"). Con 2–3 letras, el rótulo y el claim quedan sobreimpresos
sobre los glifos.

La causa es que todo encaje tipográfico es de **un solo eje**. El patrón correcto **ya existe en el
repo** — `apertura.js:92` hace encaje de dos ejes con guarda de `ar` degenerado, y por eso el rótulo y
el claim nunca se rompieron. Los cinco encajes que revientan son los cinco que no lo usan.

## Alta

| | evidencia |
|---|---|
| **El bloom detona los recortes reales** | El 50.7% de los píxeles opacos de los recortes está sobre el umbral; varios al 96–99%. Inyectados en la escena salen como **una mancha blanca**. Es estructural: las páginas son blancas y el look está calibrado para geometría oscura que brilla sobre negro. Hay que componerlos **después** del bloom, o excluirlos con `layers`. |
| **El transcode de ffmpeg es el 53.6% del tiempo y encima infla el archivo 2.27×** | VP9 12 Mbps pesa 37.29 MB → el H.264 que sale de ahí pesa 84.81 MB: recomprime lossy sobre lossy. `avc1.640033` **sí** está soportado por WebCodecs (mi prueba anterior usó `avc1.42E01F`, baseline, que no lo está). Codificando H.264 directo y remuxeando con `-c:v copy`: **22.9 s → 9.25 s** y **84 MB → 23.9 MB**, con tiras visualmente idénticas. |
| **84 MB para 17 s (38.8 Mbps) es inviable** | El objetivo para un reel 1080×1920 es 5–8 Mbps: está 5–8× por encima. Ningún ajuste de crf por el camino actual llega. Con H.264 directo el bitrate pasa a ser un parámetro real. |
| **La duración no es un parámetro** | Pedí `dur: 30` en las 4 corridas y salieron 17.42 s en las 4: `render3d.py` pisa el valor. La duración la fija el aire (36 beats ÷ bpm): deportivo 15.4 s, lujo 28.4 s. No hay forma de pedir 15 s ni 30 s, que son los dos formatos que pide el mercado. |
| **La diversidad real es 9, no cientos** | `aireDe` no toma seed: una página tiene **exactamente 1 video posible**. Dos empresas distintas con el mismo aire dan **20 de 20 cortes en el mismo instante**, la misma duración al centésimo y sólo 4.65% de píxeles distintos. |

## Media

- **Dos aires son código muerto.** `bienestar` y `deportivo` no son alcanzables desde ningún
  pagemodel: `schema.js` mapea *fitness* y *salud* a `servicio-local`, y eso cae en `gastronomico`. Un
  gimnasio y una clínica reciben el aire cálido de una panadería mientras los dos aires escritos para
  ellos no se usan. El cuello no es `aireDe` sino el enum `TIPO_NEGOCIO`: 9 valores para 11
  personalidades.
- **La paleta real de la marca se mide y se tira.** Stripe es violeta sobre blanco y sale azul
  institucional sobre navy. 9 de los 11 aires tienen luminancia de fondo < 0.10 y la web real es
  abrumadoramente blanca: casi toda marca va a recibir un video oscuro que no se parece a su sitio.
  El aire debería aportar la **estructura** y el acento venir de `dna.palette.accent`.
- **ANTHEM tira los 52 recortes reales.** `D.elementos`, `D.pie` y `D.dominio` tienen **0 usos** en las
  escenas. Los 7 fixtures traen 52 recortes con PNG en disco y ninguno entra al video: el logo, el
  producto y la captura del sitio nunca se ven. Es el eje de diversidad más barato que queda sin usar,
  y el que da credibilidad.
- **El chrome de la demo se imprime en el video de cualquier marca, y a veces miente.**
  "CAPITULO 01 — APERTURA", "124 BPM" (falso en los 10 aires que no corren a 124), y sobre todo
  "CINCO INDICADORES · UNA MISMA HISTORIA" mostrado sobre **una sola** tarjeta. `rotulo` imprime el
  enum interno: "STRIPE · SAAS", "スタジオ · SERVICIO-LOCAL".
- **`seedFor` colapsa a seed 0 con cualquier seed string.** `mulberry32((seed ^ hashStr(ns)) >>> 0)`
  con `seed` string hace `ToInt32(NaN) = 0`: `seedFor('abc', ns)` y `seedFor('zzz', ns)` dan la misma
  secuencia. Hoy no está roto porque todos los callers pasan números — es una mina para el próximo.
- **La regla de independencia dice una cosa y el repo hace otra.** `docs/MOTOR-DIRECTOR.md` §10
  descarta three/GSAP explícitamente; ANTHEM son 8660 líneas construidas sobre three + GSAP. El gate
  sólo camina `src/director`, así que el invariante quedó fuera de alcance **por geografía, no por
  decisión**. Hay que decidirlo y escribirlo.

## La decisión de arquitectura: el Director es el tronco

El argumento es medible. El **mismo** timeline de linear-app renderizado en canvas 2D queda
perceptualmente congelado **8.4 s de 15.74 s** (251 de 472 frames cambian menos del 0.1% de la
pantalla) y el gate `E-DEADAIR` no lo ve porque compara hashes exactos y ninguna pareja de frames es
byte-idéntica. El mismo timeline por `escena.js` da **0 intervalos congelados** y 84% de la pantalla
cambiando cada 0.4 s.

Al revés no funciona: ANTHEM tiene 6 escenas fijas, **803 tweens imperativos de los cuales 0 son
editables** (ninguno tiene id de capa ni prop del set cerrado, así que el estudio direcciona 0),
ignora los recortes reales y no tiene camino a producción.

**Y el costo del merge está acotado y medido:** de 1104 animaciones, **699 (63%) ya caben en
timeline.v1**. Las 405 que no son una lista **cerrada**: uniformes de shader 172, `z` 122, rotación en
x/y 52, color 42, escalares 17. O sea **timeline v2 = 4–5 props nuevas** (`z`, `rotX`, `rotY`, `color`
y un `prog` genérico), con migrador, tocando evaluador + `edits.js` + Inspector + 3 gates.

### El orden

1. Meter `verificar.mjs` en `npm run gates` y matar los fallbacks. *(el gate ya existe; falta la cadena)*
2. Arreglar `escena.js`: tratamiento de película por aire, y enseñarle `reveal` y las capas `plate`
   — hoy lee 5 de las 9 props e ignora los 116 keys de `reveal`, que es **el** gesto de texto del
   motor, y descarta el fondo compuesto de cada escena.
3. H.264 directo por WebCodecs + remux (2.5× más rápido, 3.5× más chico).
4. Mover los 11 aires a `kit/look.js` como una capa sobre el look ya derivado del DNA, y que `aireDe`
   viva en el scriptwriter con el seed eligiendo entre válidos.
5. Reescribir las 6 escenas de ANTHEM como compositores del Director que emiten capas + tracks, **una
   por vez, cada una entrando con su gate**.

Lo que **nunca** hay que hacer es al revés: mover el guionista, los elementos reales, los edits y los
27 gates adentro de ANTHEM.
