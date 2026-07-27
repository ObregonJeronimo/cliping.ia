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

---

# Sesión del 27-jul-2026 — qué se cerró y qué queda

Todo lo de acá está **medido y mirado**: cada cambio grande terminó en un render, una lámina de
contactos y, cuando aplica, una corrida de `tools/medir-video.py`.

## Lo que se cerró

| Defecto | Cómo se veía | Dónde está el arreglo |
|---|---|---|
| **La identidad medida se tiraba** | Stripe (violeta sobre blanco) salía azul institucional sobre azul marino, igual que Basecamp, igual que Ghost. **5 de 7 páginas reales son claras y las 7 salían oscuras.** | `render3d/demo/adn.js` + gate `tools/adn-check.mjs` |
| **Las escenas hablaban del motor** | El video de Stripe decía "SIETE ENTRADAS · NINGUNA IGUAL", "CAPÍTULO 01 — APERTURA", "SIN IA GENERATIVA" — copy de urvid, en castellano, en la pieza de una marca inglesa | las 7 escenas + gate `E-PROCEDENCIA` |
| **La escala de grises estaba calibrada contra negro** | `#c3cbdb` para el titular y `#0c1124` para las tarjetas: buenos valores **sobre negro**, un fantasma y un rectángulo azul marino sobre blanco | `nivel(k)` en `kit.js` |
| **Una página = un solo video posible** | Misma estructura, mismo orden, 17.42 s fijos, para todas | `render3d/demo/guion.js` — **55 estructuras** medidas |
| **Los metales salían negros** | Chasis de titanio y aluminio como dos siluetas oscuras, con tres luces encendidas. `metalness:1` no tiene componente difusa: sin `scene.environment` no refleja nada | `_estudio()` en `main.js` |
| **Los 52 recortes reales no se usaban** | Se medían, se recortaban, se guardaban y se tiraban | hero `mosaico` |
| **`modifiers` de GSAP no corría** | Cuatro heroes llegaban y se quedaban clavados. Sólo se aplica a propiedades declaradas en `vars`, y no había ninguna. Cero errores, cero avisos | los 4 heroes, con dos grupos |
| **El camino completo no se probaba nunca** | Cada pieza andaba sola | `backend/motor.py` |
| **Sin brief, la semántica quedaba vacía** | Linear en vivo: 0 frases, 0 cifras, sin CTA, marca `"LINEAR.APP"` | `backend/semantica_gratis.py` |

## Dónde sigue estando por debajo de ANTHEM

Medido sobre `G-s30a.mp4` (Stripe, 30 s) contra `ANTHEM.mp4`:

| métrica | ANTHEM | motor | lectura |
|---|---|---|---|
| píxeles en movimiento | 0.226 | 0.116 | **la mitad.** Es la brecha más grande y la más honesta |
| cortes por minuto | 55 | 26 | el piso de un reel moderno es 40 |
| saturación | 0.443 | 0.143 | ANTHEM es oscuro y saturado; una marca blanca nunca va a dar 0.44 |
| ocupación de cuadro | 0.317 | 0.237 | hay cuadros con demasiado aire |
| contraste | 0.178 | 0.158 | parejo |

**El diagnóstico del ritmo de corte, con el número al lado.** Las escenas del motor duran 4–8 beats y
cortan sólo en su frontera: 8 cortes en 30 s. ANTHEM corta **dentro** de la escena — su bloque de
tipografía cinética mete 7 entradas en 8 beats, cada una un reemplazo duro. No es que al motor le
falte ritmo: le faltan **eventos por escena**.

> `ritmo_en_beat` da 0.615 y no 0.875, pero eso es en buena parte artefacto: el analizador cuenta
> destellos internos como cortes. Los cortes de escena **sí** caen en la grilla (3.03 / 7.03 / 11.0 /
> 14.0 / 16.0 …, a 120 bpm el beat es 0.5 s).

## Lo próximo, en orden de impacto

1. **Más eventos por escena.** Es lo que cierra la brecha de movimiento y la de cortes a la vez. Un
   sub-corte cada 2 beats dentro de `tipografia` y `tarjetas` sube las dos métricas sin tocar el guion.
2. **Más escenas en el catálogo.** El gate lo dice solo: **72 de 324 guiones quedan cortos porque se
   acabó el catálogo** — siete escenas no llenan 30 s a tempo alto. Ahí el arreglo es material nuevo,
   no más tolerancia de tempo (hoy 15%).
3. **La interfaz.** `backend/motor.py --heroes` ya es el contrato que va a llamar la pantalla: el
   selector de hero es ese `--hero`, y la lista se lee de los módulos. Falta la ruta HTTP y la página.
4. **Más heroes.** Hay 5 y la idea son cientos. El contrato está y ahora el verificador los cubre:
   `render3d/demo/verificar.mjs` mira `escenas/` **y** `heroes/`.
5. **La tipografía del ADN no discrimina.** Las 7 páginas medidas dan `displayHint: grotesk` y
   `caseHint: sentence`. Hoy la variedad de fuentes la pone el aire; el ADN no aporta nada ahí.


---

# Segunda vuelta — densificacion, catalogo e interfaz

## Donde esta el motor ahora, medido

Pieza de 30 s de Stripe contra `ANTHEM.mp4`, cada una medida contra SU propia grilla de beats:

| metrica | ANTHEM | al empezar | ahora |
|---|---|---|---|
| **cortes por minuto** | 55.1 | 26 | **56.0** |
| **movimiento/nitidez** | −0.179 | −0.204 | **−0.174** |
| frames casi quietos | 0.126 | 0.284 | 0.160 |
| quietud maxima | 0.10 s | 0.60 s | 0.37 s |
| ocupacion de cuadro | 0.317 | 0.237 | 0.273 |
| pixeles en movimiento | 0.226 | 0.100 | 0.136 |
| cortes sobre el beat | — | 0.44 | 0.75 |

Dos metricas ya estan **en la referencia o por encima**: el ritmo de corte y el obturador. Las que
faltan son movimiento y ocupacion, y las dos tienen el mismo culpable identificado por el desglose
por escena (`tools/medir-video.py --tramos`, o automatico si el render dejo su `.plan.json`):

| escena | movimiento | ocupacion |
|---|---|---|
| columna | **0.255** | 0.334 |
| destello | 0.229 | 0.249 |
| tarjetas | 0.157 | 0.103 |
| pantalla | 0.147 | 0.321 |
| rafaga | 0.122 | 0.294 |
| hero | 0.109 | **0.875** |
| tipografia | 0.102 | 0.076 |
| cierre | 0.061 | 0.080 |
| **apertura** | **0.031** | 0.081 |

La apertura es el piso y lo sigue siendo despues de densificarla. Es tambien la unica escena donde
la quietud puede ser una decision —abre en seco— asi que subirla tiene un techo de diseno, no
tecnico. La siguiente palanca real es la ocupacion de `tipografia` (0.076): una escena de tipografia
cinetica que ocupa el 7.6% del cuadro esta pidiendo tipografia mas grande, no mas eventos.

## Lo que se cerro en esta vuelta

- **Cuatro escenas densificadas** y **dos escenas nuevas** (`pantalla`, la pagina a sangre en bandas;
  `columna`, un feed vertical de recortes reales). Catalogo de 8 a 10; una pieza de 30 s se llena con
  diez escenas DISTINTAS sin repetir hero.
- **Dos aires estaban muertos**: `bienestar` y `deportivo` no los elegia ninguna pagina posible. Un
  gimnasio recibia el aire de una panaderia. `E-ADN-AIRE-MUERTO` barre 630 combinaciones.
- **La interfaz existe**: `GET /api/motor3d/heroes`, `POST /api/motor3d/render` y la pantalla
  `/studio/motor3d` con selector de hero, duracion y semilla.

## Los cinco defectos que encontro la revision adversarial, y que ninguna compuerta veia

1. **La pauta del toro no se veia NUNCA** — fuera de cuadro del beat 0.25 al 4.25. Seis de sus
   diecisiete eventos pasaban abajo del borde. El error fue medir contra el cuadro EN REPOSO en la
   unica escena que orbita la camara.
2. **El "contratiempo" de las tarjetas caia 24 ms despues del tick**: el MISMO cuadro. La escena
   pagaba dos eventos y cobraba uno.
3. **La firma de movimiento miraba solo `r.g`**, nunca `gr`. Ahi vive TODO recorte real de la pagina
   — la parte mas valiosa del producto era la unica sin controlar. Arreglado, encontro al toque un
   problema de determinismo en los cuatro heroes.
4. **La cola congelada.** `timeScale` cambia a que velocidad AVANZA una timeline, no como se la
   BUSCA. Con el ajuste de tempo puesto, la pieza se congelaba en su ultimo cuadro durante los dos
   segundos finales. El video duraba lo pedido y el ultimo cuadro era el correcto; lo delato una sola
   metrica.
5. **`nivel(k)` mezclaba en espacio LINEAL** y subia la tipografia por encima del umbral de bloom: en
   un mundo oscuro el titular salia como un ladrillo blanco. Lo encontro un render en vivo, no una
   compuerta — por eso ahora hay una (`E-LUZ`).

## Lo proximo

1. **Ocupacion de `tipografia`** (0.076). Es la palanca de movimiento y de ocupacion a la vez.
2. **La semantica gratuita agarra copy que esta en la pagina pero no es de la marca.** En
   tailwindcss.com devolvio "Browse properties" y "Redefining real-time", que son titulos de
   plantillas de su galeria. No es invencion —esta literalmente en el DOM— pero se lee como si fuera
   el producto. Hace falta pesar los `<h2>` por su posicion en la pagina.
3. **Mas heroes.** Hay cinco y la idea son cientos. El contrato esta y el verificador ya los cubre.


---

# Tercera vuelta — donde esta el motor hoy

## Contra la pieza hecha a mano, sobre material comparable

`tailwindcss.com`, 30 s, hecha DE PUNTA A PUNTA desde la URL con `backend/motor.py`, mundo oscuro
(la misma polaridad que la referencia):

| metrica | ANTHEM (a mano) | motor en vivo | |
|---|---|---|---|
| quietud maxima | 0.10 s | **0.10 s** | igual |
| cortes sobre el beat | 0.875 | **0.875** | igual |
| frames casi quietos | 0.126 | **0.102** | mejor |
| saturacion | 0.443 | **0.606** | mejor |
| contraste | 0.178 | 0.175 | ≈ |
| obturador (mov/nitidez) | −0.179 | −0.165 | ≈ |
| ocupacion de cuadro | 0.317 | 0.283 | −11% |
| pixeles en movimiento | 0.226 | 0.190 | −16% |
| cortes por minuto | 55.1 | 48.0 | dentro de banda |

Y en mundo CLARO (Stripe, 30 s), donde la referencia no aplica porque su vocabulario es el glow:

| metrica | ANTHEM | al empezar la sesion | ahora |
|---|---|---|---|
| cortes por minuto | 55.1 | 26 | **70.0** |
| contraste | 0.178 | 0.151 | **0.178** |
| ocupacion | 0.317 | 0.237 | **0.394** |
| frames casi quietos | 0.126 | 0.284 | 0.159 |
| quietud maxima | 0.10 s | 0.60 s | 0.47 s |
| movimiento | 0.226 | 0.100 | 0.145 |

## El hallazgo que reordeno todo

La brecha de movimiento que se venia persiguiendo era en gran parte un ARTEFACTO DE COMPARACION.
Experimento: la misma pieza, los mismos datos, cambiando SOLO la polaridad, pasa de 0.104 a 0.215 de
movimiento y de 0.075 a 0.134 de ocupacion. No es el grano —a umbral 60, donde el grano no llega, la
brecha es de 6×— ni el largo de las frases. Es que **la mitad del movimiento de una pieza oscura la
pone el glow**: un halo de bloom desplazandose mueve cientos de pixeles alrededor de cada objeto.
Sobre blanco, sumar luz no hace nada.

De ahi salio el vocabulario propio del mundo claro: campos de color en movimiento (suben movimiento y
saturacion) y una **cuña de borde duro** (la unica que sube ocupacion — un degrade suave corre la
propia mediana del cuadro y por construccion no cuenta nunca).

## Estado del catalogo

- **10 escenas**: apertura, hero, toro, tipografia, rafaga, pantalla, columna, tarjetas, destello, cierre.
- **9 heroes**: telefono, portatil, ventana, mosaico, vitrina, prisma, cinta, enjambre, orbital.
- **11 aires**, los 11 alcanzables (antes 9).
- **71 estructuras** de guion distintas; 15/20/30 s clavados.

## Lo proximo

1. **El mosaico sobre paginas de recortes chicos.** Sobre Stripe da 0.518 de ocupacion; sobre Tailwind,
   0.158. La composicion bento asume tarjetas anchas; con recortes casi cuadrados el alto de celda
   manda y las piezas se achican. Hace falta que el bento elija su reparto SEGUN las relaciones de
   aspecto que tiene, no siempre igual.
2. **Ocupacion en mundo oscuro** (0.283 contra 0.317). Es la ultima metrica claramente por debajo.
3. **Las revisiones adversariales de los cuatro heroes nuevos quedaron sin correr** (el workflow se
   quedo sin sesion con 6 de 9 agentes). Las hice a mano y encontre uno grave —el enjambre invisible
   en claro— pero una revision con medicion propia encontraria mas.
4. **`cta` vacio en paginas que si tienen CTA.** Tailwind tiene "Get started" y la captura no lo
   devuelve en `ctas`; el regex imperativo no es el problema, el problema es que el boton no llega.


---

# Cuarta vuelta — no queda nada de la lista

## El motor, de punta a punta

    python backend/motor.py https://stripe.com --dur 30 --seed 4
    -> 50 segundos. 33 MB. Un reel de 30 s con la pagina real del cliente.

De esos 50 s, la mayoria es la captura del sitio. El render de 900 cuadros a 1080x1920 con
sobremuestreo de obturador tarda 12.

## Contra la pieza hecha a mano

Mundo OSCURO (tailwindcss.com, en vivo), que es la polaridad de la referencia:

| metrica | ANTHEM | motor | |
|---|---|---|---|
| quietud maxima | 0.10 s | 0.10 s | igual |
| cortes sobre el beat | 0.875 | 0.87 | igual |
| frames casi quietos | 0.126 | 0.102 | mejor |
| saturacion | 0.443 | 0.609 | mejor |
| obturador | −0.179 | −0.191 | mejor |
| contraste | 0.178 | 0.177 | ≈ |
| ocupacion | 0.317 | 0.277 | −13% |
| movimiento | 0.226 | 0.192 | −15% |

Mundo CLARO (stripe.com, en vivo): ocupacion 0.396, contraste 0.181, cortes/min 40, quietud 0.3 s.

## Lo que se cerro en esta vuelta

- **El bento del mosaico se adapta al material.** Reservaba 42% del alto para la banda destacada; un
  logo-tira de relacion 7.92 ocupa 0.78 y dejaba 2.6 unidades reservadas y vacias. Ahora la banda pide
  el alto que su pieza puede llenar. Tailwind 0.158 -> 0.272.
- **Un boton vacio en el cuadro final.** Con `D.cta` null se dibujaba la pildora igual, sin texto.
- **El presupuesto de luz, por tercera vez**, ahora como REGLA DE CODIGO: el verificador rechaza
  `color: LOOK.tinta` y `textoMascara(..., LOOK.tinta)`.
- **La lectura del DOM deja de traer copy ajeno.** Tailwind decia "Browse properties" y "Redefining
  real-time", que son titulos de plantillas de su galeria.
- **`corto()` mutilaba texto que no habia cortado.** El CTA de Stripe es "Sign in" y en el boton salia
  "SIGN", porque "in" esta en la lista de palabras que no pueden cerrar una frase. Esa lista existe
  para arreglar frases MUTILADAS por el recorte; aplicada a un texto entero es un censor.
- **H.264 directo.** Se codificaba VP9 y se transcodificaba con libx264: dos codificaciones con
  perdida encadenadas. Chromium codifica H.264 High (avc1.640033); ahora ffmpeg solo remuxea.
  112 MB -> 45 MB, minutos -> 12 s, metricas identicas.
- **`tools/encuadre-check.mjs`**, la compuerta que faltaba: lo que una escena anima tiene que entrar
  en el cuadro, proyectado a 30 fps contra la camara que la escena mueve.

## Lo que se probo y se descarto, con el numero

- **La cuña de color en el mundo oscuro.** Sube la ocupacion de 0.28 a 0.61 —por encima de la
  referencia— y la pieza queda peor: el azul profundo con neon encima se vuelve un diagonal celeste
  apagado y el contraste baja de 0.177 a 0.171. El 13% de ocupacion que le falta al mundo oscuro es
  una diferencia de estetica, no un defecto.
- **Paralaje por profundidad en el mosaico.** Repartir las piezas en z para que el dolly las separe
  subio el movimiento DOS MILESIMAS. Una tarjeta grande deslizandose cambia solo sus bordes.

## Lo que queda, y por que no se hizo

1. **El movimiento del mundo claro** (0.157 contra 0.226). Esta explicado y acotado: la mitad del
   movimiento de una pieza oscura la pone el glow. Cerrarlo pide inventar vocabulario claro nuevo, no
   ajustar parametros.
2. **Las revisiones adversariales de los cuatro heroes nuevos** quedaron sin correr (el workflow se
   quedo sin sesion). Se hicieron a mano y salio de ahi la compuerta de encuadre, pero una revision
   con medicion propia por hero encontraria mas.
3. **La captura no siempre trae el CTA.** En tailwindcss.com el boton "Get started" no llega a
   `content.ctas`; el problema esta en la extraccion del DOM, no en la interpretacion.
