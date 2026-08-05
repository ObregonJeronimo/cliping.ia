# Contexto completo — el MOTOR 3D (render3d/demo)

> **Thiago: esto es lo primero que tenes que leer, y despues de hacer `git pull`.**
> Hay un motor nuevo que no esta en tu copia. Todo lo que dice `THIAGO-IA-CONTEXTO.md` sobre
> `src/urvid` (canvas) sigue siendo cierto **para ese motor**, pero el trabajo de las ultimas semanas
> esta en otro lado y no se parece en nada. Pegale este archivo entero a tu IA como primer mensaje.

```bash
git pull
```

---

## 0. Los tres motores, y cual importa

| motor | donde | que es | estado |
|---|---|---|---|
| **urvid canvas** | `src/urvid/` | el que corre en el navegador, `/studio`. Determinista, $0, MediaRecorder. | vivo, no lo toques para esto |
| **urvid-cine** | `src/urvid-cine/` | fork para Cine IA (video fal.ai de fondo) | vivo, aparte |
| **MOTOR 3D / director** | `render3d/demo/` + `backend/motor.py` | **Three.js + GSAP, renderiza en tu PC a mp4.** Es donde esta todo el trabajo nuevo. | **este** |

Y ojo con dos carpetas que mienten: `remotion/` y `backend/template_director.py` son **legacy**, y la
skill `.claude/skills/cliping-ia` describe un mundo que ya no existe. No te guies por ninguno.

El motor 3D nacio de **ANTHEM**, una pieza hecha a mano en Three.js+GSAP que usamos como referencia de
calidad. La pregunta que gobierna todo el proyecto es: *¿un video generado se banca al lado del hecho
a mano?* Hoy la respuesta esta medida, y esta mas abajo.

---

## 1. Correlo antes de leer nada mas

Necesitas Python (con Playwright instalado) y Node.

```bash
python backend/motor.py https://stripe.com --dur 20
```

Eso hace **URL -> mp4** solo, de punta a punta: captura la pagina, la interpreta, elige el aire, arma
el guion, renderiza y remuxea. Sale en `tools/out/motor/<dominio>/`.

Los argumentos que importan:

```bash
python backend/motor.py <url> --dur 30 --seed 3 --hero mosaico --aire editorial
python backend/motor.py --heroes          # lista los 9 heroes y que material necesita cada uno
python backend/motor.py <url> --recapturar   # vuelve a bajar la pagina
```

`--seed` es la perilla mas util: **mismo brief + otra seed = otra version del mismo video**. Si dos
seeds dan la misma pieza, hay un bug.

Y lo que corres **siempre** antes de pushear:

```bash
npm run gates:guard
```

**Nunca `npm run gates` pelado.** El wrapper existe porque una vez un script se comio 28 GB y tiro la
PC abajo; `gates:guard` mide el pico y aborta. Hoy da **36 OK / 0 FAIL, pico ~6.5 GB**, y tarda
**~30 minutos**: no son tests de unidad, renderizan miles de cuadros. Para el dia a dia alcanzan las
**siete rapidas** (`verificar.mjs`, `guion-check`, `encuadre-check`, `adn-check`, `testimonios-check`,
`tira-check` y `heroes-check`), que juntas tardan **8 segundos**. El guard entero, solo antes de
pushear.

Y OJO CON EL NUMERO: el contador del guard cuenta apariciones de `OK (`, no compuertas. `RUBRO`,
`ADN` y `ENCUADRE` pasan y nunca se contaron. Es un proxy, no un inventario.

Dos herramientas mas, para mirar y para medir:

```bash
node render3d/demo/verificar.mjs
```
```bash
python tools/medir-video.py tools/out/motor/stripe-com/video.mp4
```

`medir-video.py` lee solo el `<video>.plan.json` que el render deja al lado del mp4, asi que ademas de
las 12 metricas globales te da el desglose **por escena** (con `--tramos`).

---

## 2. Que pasa entre la URL y el mp4

```
URL
 └─ backend/site_capture.py      Playwright: DOM + screenshots + RECORTES de elementos reales
     └─ backend/semantica_gratis.py   que dice la pagina, sin pagar nada de IA
         └─ pagemodel + brief
             └─ tools/anthem-datos.mjs   traduce el brief a DATOS (el guion de texto)
                 └─ render3d/demo/       Three.js + GSAP arma la pieza y la seekea frame a frame
                     └─ backend/render3d.py   H.264 directo por WebCodecs + remux ffmpeg
                         └─ video.mp4 + video.plan.json
```

Dos cosas de esa cadena no son obvias:

**El pagemodel se reconstruye en cada corrida.** El cache guarda la captura cruda, no la
interpretacion. Esto pico tres veces: cambias `semantica_gratis.py`, corres, y ves el resultado viejo.
Ya esta arreglado — pero si alguna vez tocas el cache, acordate de por que es asi.

**Los recortes son pixeles de verdad de la pagina.** No son ilustraciones: son el logo, la tarjeta, el
boton, recortados del screenshot. Por eso el motor puede mostrar *el sitio* y no una maqueta de un
sitio.

---

## 3. El vocabulario

### AIRES — la personalidad de la pieza
`render3d/demo/aires/`: `artesanal, bienestar, corporativo, deportivo, editorial, gastronomico,
inmobiliario, jugueton, lujo, nocturno, tecnico`.

Un aire declara `bpm, paleta, fuentes, gesto, camara, pelicula` y — lo mas nuevo — **`mobiliario`**:

| fondo | que dice | para |
|---|---|---|
| `fuga` | espacio, tecnologia, velocidad | tecnico, corporativo |
| `puntos` | superficie, papel; no promete profundidad | editorial, artesanal |
| `ondas` | respira, nada tiene esquinas | gastronomico, bienestar |
| `rayas` | no deja respirar; la unica que no se desvanece en los bordes | deportivo, nocturno |
| `bloques` | celdas que se encienden EN EL BEAT | jugueton |
| `nada` | solo el degrade: lo caro se vende con AIRE | lujo, inmobiliario |

mas `esquinas` (los corchetes de encuadre, que dicen "camara") y `hud` (la ficha tecnica de formato y
dominio). **El mueble es la mitad de la identidad de una pieza**: sin esto, una panaderia recibia el
HUD de una herramienta de ingenieria con otra tipografia y listo.

Los aires viajan por *bindings vivos* de ES modules (`export let LOOK/BEAT/E/MOB/CLARO` en `kit.js`),
que `configurar(aire)` reasigna. Por eso una escena escribe `LOOK.acento` y ya esta.

### DATOS — lo que la pieza DICE
Perpendicular al aire: **el aire es como se ve y como se mueve, los datos son que dice.** Forma real
(de `datos.json`):

```json
{ "marca": "LINEAR", "rotulo": "LINEAR · OTRO",
  "claim": "PURPOSE-BUILT FOR PLANNING AND BUILDING PRODUCTS WITH AI",
  "frases": ["...", "..."], "bloque": {"titulo": "...", "bajada": "..."},
  "datos": [], "golpe": "PURPOSE-BUILT FOR PLANNING", "cta": "GET STARTED",
  "pie": ["linear.app"], "dominio": "linear.app", "elementos": [], "tira": false }
```

Y al lado viaja el **DNA** (paleta real del sitio, tipografia, forma, densidad, mood) — de ahi salen
los colores, no de una lista nuestra.

### ANTI-INVENCION — la regla mas dura del repo
**Nunca inventes lo que la pieza DICE.** Ni una estadistica, ni un copy, ni un CTA, ni un
testimonio. Si un slot esta vacio, la escena **no se elige**; no se rellena. Hay una compuerta
(`E-PROCEDENCIA`) que exige que todo texto renderizado sea rastreable a DATOS, y otra (`E-INVENCION`).
Esto no es una preferencia de estilo: es lo que separa la herramienta de un generador de mentiras
sobre el negocio de otra persona.

### Determinismo
Nada de `Math.random`, `Date.now`, `requestAnimationFrame` ni timers. Aleatoriedad por `mulberry32`
sembrado. Las timelines de GSAP se crean `paused: true` y se **seekean** con `.time(t, false)`.
Rasterizado con SwiftShader para que el mismo frame de ayer sea el mismo frame de hoy.

---

## 4. El contrato de escena

Una escena es un archivo en `render3d/demo/escenas/` que exporta exactamente esto:

```js
export const meta = { id: 'cita', beats: 6 }

export function build(ctx) {
  const { THREE, gsap, look, W, H, mundoW, mundoH, camera, distBase, rnd,
          BEAT, b, fondo, pelicula, bloom, real, spec, texturas,
          datosEls, repeticion, claro } = ctx

  const g  = new THREE.Group()   // escena normal: PASA por el bloom
  const gr = new THREE.Group()   // post-bloom: TODO recorte de pagina va aca, o se quema
  const tl = gsap.timeline({ paused: true })

  // SIN MATERIAL, LA ESCENA SE RINDE. No rellena, no inventa: se declara vacia y el
  // secuenciador la saltea. Es la anti-invencion hecha codigo, y es lo primero que
  // escribis en una escena nueva.
  if (!loQueNecesito.length) return { g, gr, tl, vacia: true }

  // ... duracion total <= b(meta.beats)
  return { g, gr, tl }
}
```

`gr` es opcional (una escena sin recortes devuelve solo `{ g, tl }`), y `hero` devuelve ademas
`heroUsado`. Pero **`vacia: true` no es opcional en la practica**: cualquier escena que dependa de un
dato que la pagina puede no tener lo necesita. Mira `columna.js:76`, `pantalla.js:70` o
`tarjetas.js:123` — las tres son el mismo gesto, y las seis escenas nuevas lo van a necesitar (`cita`
sin testimonios, `lista` sin lista, `titular` sin titulares).

Las escenas de hoy son DIECISEIS: `apertura, hero, toro, tipografia, rafaga, pantalla, columna,
tarjetas, destello, cierre` (las diez originales) y las seis del punto 8, ya hechas: `cita, lista,
titular, partida, contraste, sello`. Los heroes (lo que protagoniza `hero`): `telefono, portatil, ventana, mosaico, vitrina,
prisma, cinta, enjambre, orbital` — en ese orden, que es orden de preferencia (primero los que
muestran la pagina, ultimo la geometria pura).

`render3d/demo/guion.js` decide **que escenas y en que orden**, con `REQUISITOS` por escena (que datos
necesita para poder elegirse), cuatro ordenes distintos, y un ajuste de duracion con tope de 0.15.

---

## 5. Las compuertas, y que protege cada una

Todas colgadas de `npm run gates:guard`:

| compuerta | protege |
|---|---|
| `render3d/demo/verificar.mjs` | el contrato entero: timeline dentro de sus beats, camara vuelve a `(0,0,distBase)`, nada quieto mas de un beat (sobre `matrixWorld`, no local), determinismo, `E-INVENCION`, `E-PROCEDENCIA`, `E-VACIO`, `E-LUZ`, `E-ENCAJE`, y que la pieza **construya con una pagina POBRE** |
| `tools/encuadre-check.mjs` | lo que se anima tiene que **verse**: interseccion con el frustum, no contencion de vertices |
| `tools/adn-check.mjs` | contraste WCAG, saturacion, polaridad |
| `tools/guion-check.mjs` | que el guion no repita ni deje huecos |
| `tools/rubro-check.py` | que un ecommerce, un estudio y un medio no salgan iguales |
| `tools/medir-video.py` | 12 metricas del mp4 terminado, con `--tramos` por escena |
| `tools/testimonios-check.py` | que la firma de un testimonio LLEGUE cuando la pagina la da, y que NUNCA se invente cuando no |

Y dos reglas que las compuertas hacen cumplir y que vas a chocar: **`nivel(k)` nunca `LOOK.tinta` para
texto** (esta prohibido por regex), y **nada de grises hardcodeados** — todo color sale del DNA o de
`nivel()`.

---

## 6. Las trampas que ya costaron tiempo

No son teoria: cada una se comio una tarde.

1. **`modifiers` de GSAP no corre si la propiedad no esta tambien en `vars`.** Cuatro heroes
   simplemente nunca flotaron, en silencio.
2. **Los hijos de una timeline renderizan por orden de start-time**, no de creacion. La sincronizacion
   de `gr` leia transforms viejos. Va colgada de `tl.eventCallback('onUpdate', ...)`, que corre
   despues de todos los hijos.
3. **`nivel()` tiene que interpolar en sRGB, no en lineal.** `THREE.Color.lerp` es lineal y daba
   luminancia 0.707 contra un umbral de bloom de 0.62: **todo el texto display salia reventado de
   blanco**. Hay una compuerta (`E-LUZ`) por esto.
4. **Presupuesto de luz:** `UnrealBloomPass` no atenua. Un pixel esta debajo del umbral (0.62 en
   tecnico) o **florece entero**. La tipografia display tiene que vivir debajo.
5. **La sangria de un recorte tiene que ser 1.00 exacto.** Con 1.24 salia "vidia, Microsoft / unch
   open AI"; con 1.06 todavia se comia la primera letra.
6. **`timeScale` no es seekear.** Ajustar la escala y despues `.time(t)` deja la cola congelada.
7. **`updateMatrixWorld` no actualiza `matrixWorldInverse`** — costo 29 acusaciones falsas de la
   compuerta de encuadre. Una compuerta que acusa en falso cuesta mas que no tener compuerta.
8. **`mov_frac` cuenta pixeles que cruzan un umbral de luma entre frames.** Una masa grande y plana
   que se mueve cambia solo sus BORDES. Lo que mueve la aguja son **eventos duros**, no deriva suave.
   Esto se repitio cuatro veces.
9. **`encuadre-check` NO caza un texto que se sale del cuadro.** Verifica INTERSECCION con el
   frustum, no contencion, y ademas saltea las mallas con `materialMascara` porque no exponen
   `material.map`. En este trabajo dos escenas salieron con el texto cortado por la derecha y la
   compuerta dijo OK las dos veces. Mientras siga asi: el ancho de un renglon se MIDE contra
   `mundoW` y se achica el bloque entero si no entra. No lo adivines por cantidad de caracteres —
   el ancho lo decide la fuente que eligio el aire, y cambia por pieza.
10. **Una escena que no figura en ninguna de las cuatro `ORDENES` no se elige JAMAS**, aunque exista,
    este registrada y cumpla sus `REQUISITOS`. Y si va ULTIMA en la lista tampoco entra: el
    presupuesto de beats se agota antes. `sello` estuvo escrito, verde y ausente de diez semillas
    seguidas por esto.
11. **`uProg` de `materialMascara` no termina en 1.0**, termina en `1 + uSuave`. Con 1.0 la banda
    suave cae exactamente en el canto y la ultima letra de cada renglon queda lavada para siempre.
    `pantalla.js` y `destello.js` ya lo sabian (1.11 y 1.10) y las escenas nuevas no.
12. **Una propiedad, un solo escritor.** Si la deriva continua y una entrada animan las dos
    `fondo.position.x`, la escena deja de ser determinista y la compuerta la caza con "dos
    construcciones con la misma semilla dan escenas distintas". Si hacen falta dos movimientos,
    hacen falta dos objetos (un contenedor y su hijo).
13. **`immediateRender: false` tambien fuera de las escenas.** Los `fromTo` de las transiciones iban
    sin el y escribian su valor inicial AL CREARSE: el video entero salia con el cuadro corrido y una
    franja de acento pegada a un costado, desde el segundo cero. Ninguna compuerta lo vio; lo delato
    mirar una tira de cuadros consecutivos.
14. **Un recorte de pagina es un PNG CON TRANSPARENCIA.** Apilar dos y barrer uno sobre otro no tapa
    nada: se leen mezclados. La mascara recorta el PNG, no lo vuelve opaco — hace falta un respaldo
    que barra con el.
15. **Cinco veces una version gano la metrica y se veia peor**, y las cinco gano la que se veia mejor.
   Mirar le gana a leer: todos los defectos serios salieron de mirar hojas de contacto, ninguno de
   leer codigo.

---

## 7. Donde esta parado hoy

Medido sobre Stripe 30s (mundo claro) contra ANTHEM, la referencia hecha a mano:

| metrica | motor | ANTHEM |
|---|---|---|
| cortes/min | 70 | 55 |
| ocupacion | 0.431 | 0.317 |
| contraste | 0.180 | 0.178 |
| movimiento | 0.146 | 0.226 |

El movimiento parece el agujero, y **no lo es**: comparar piezas claras contra una referencia oscura
era un artefacto. Sobre material oscuro comparable el motor **empata o gana** en quietud maxima,
cortes sobre el beat, frames casi quietos, saturacion y shutter. La misma pieza con solo la polaridad
invertida va de 0.104 a 0.215 de movimiento: **la mitad del movimiento de una pieza oscura es
resplandor**, y un diseño claro no puede tenerlo. Esta contestado, no pendiente. Todo el historial
esta en `docs/director/RUMBO.md` (siete vueltas, con lo que se probo y se tiro).

---

## 8. LA TAREA — mas variedad, y de TIPO, no de color  ·  **HECHA**

> Los tres frentes estan cerrados y pusheados. Lo que sigue en esta seccion es el diagnostico
> original, que se deja porque explica POR QUE cada escena existe. Lo que quedo pendiente esta al
> final, en "lo que sigue".

**(a) Seis escenas nuevas** — `cita` (la unica que habla con otra voz), `lista` (bandera a la
izquierda, numerada), `titular` (la foto de la pagina como fondo sobre el que se escribe), `partida`
(el cuadro partido en dos), `contraste` (la primera comparacion del motor) y `sello` (la unica que
compone con vacio, para `lujo` e `inmobiliario`).

**(b) Transiciones** — antes TODO corte era duro + flash, siempre. Ahora hay corte, flash, barrido y
empuje, elegidos por corte con el PRNG sembrado y sin repetir el mismo gesto dos veces seguidas. Van
en el PASE DE POST y no en la escena 3D: un barrido "de verdad" pide las dos escenas visibles a la
vez, y ahi las dos animarian la MISMA camara. El aire opina con el campo `transiciones`.

**(c) `testimonios`** — se llena, viaja hasta DATOS y tiene compuerta propia.

### Lo que sigue
- Regenerar los fixtures: `linear-app.json` firma sus tres citas como "Linear customer", un rotulo
  que no esta en la pagina. La pagina SI dice quien las dijo y ahora la captura lo trae; los fixtures
  son de antes del arreglo. Se rehacen con `python backend/test_pagemodel.py --write`.
- `encuadre-check` tiene un punto ciego (ver trampa 12): no vio ninguno de los dos textos que se
  salieron del cuadro en este trabajo.
- El diagnostico original, para contexto:

## 8-bis. El diagnostico que abrio este trabajo

Este es el trabajo que quedo abierto y el que sigue. El diagnostico, textual:

> **hoy toda escena es centrada, todo corte es duro, y hay material capturado que no se usa nunca.**

Cambiar la paleta ya funciona. Lo que hace que dos videos se parezcan es que la **composicion** es
siempre la misma. Tres frentes:

### a) Seis escenas nuevas, de tipos que no existen

| escena | que es | por que |
|---|---|---|
| `partida` | pantalla dividida | ninguna escena parte el cuadro |
| `cita` | un testimonio, tratado como cita | **`content.testimonials` se captura y NUNCA se usa** |
| `lista` | lista numerada alineada a la izquierda | ninguna escena esta alineada a la izquierda |
| `contraste` | barrido A\|B entre dos recortes | no hay ninguna comparacion |
| `sello` | construccion geometrica de una marca | lujo e inmobiliario no tienen escena propia |
| `titular` | titular editorial a sangre sobre un recorte foto | los medios traen `titulares` y se usan chiquitos |

Cada una: contrato del punto 4, `REQUISITOS` en `guion.js` (si el dato no esta, la escena no se
elige — **no se rellena**), y las compuertas en verde.

### b) Sistema de transiciones en `main.js`
Hoy **todo corte es duro + flash de 2 frames**, siempre. Necesita elegir por corte entre corte duro,
barrido, empuje y flash. El aire deberia poder opinar (una pieza de lujo no hace el mismo corte que
una de deporte).

### c) Llenar `testimonios`
`backend/semantica_gratis.py` linea ~470 escribe `"testimonios": []` fijo. El material ya viene en
`content.testimonials`. Sin esto, `cita` no se puede elegir nunca.

---

## 9. Como trabajar

- **Antes de tocar `main`: `git pull`.** Al terminar: commit + push. Nunca los dos el mismo dia
  (arreglen el calendario con Jero).
- **Ningun push con una compuerta en rojo.** `npm run gates:guard`, siempre el guard.
- **Cada arreglo termina en una compuerta, y cada compuerta se prueba A/B.** Si arreglas algo y no
  dejas una compuerta, vuelve.
- **Mira los videos.** Renderiza con dos o tres seeds y mira. Es literalmente de donde salio cada
  defecto serio de este proyecto.
- **Medi antes de optimizar.**
- **Un artefacto es un defecto SOLO si ninguna linea lo quiso.** Antes de arreglar cualquier cosa que
  se vea rara en un cuadro, rastrea el pixel hasta la linea que lo dibuja. Si aparece una declaracion
  deliberada —con nombre propio, con comentario— es DISEÑO, no defecto, y "arreglarlo" es romper la
  pieza. Paso de verdad: un auditor reporto "un rectangulo blanco solido y VACIO" en `destello` y era
  `barraUna = barra(2.95, 0.56, 'der')`, del mismo lenguaje que las otras barras del cuadro.

### Auditar el video con agentes: para que sirve y para que no

Mirar el video es lo que encuentra los defectos, asi que repartir esa mirada entre varios agentes
—uno por tramo— cubre mucho mas terreno que mirarlo uno solo. Pero conviene saber que se compra:

- **Un tercio de lo que reportan es falso.** Medido en la unica auditoria que se hizo asi: de siete
  hallazgos verificados uno por uno, dos no existian (un "subtitulo duplicado" que aparecia una sola
  vez, y la barra de arriba). NUNCA se toca codigo por un hallazgo sin confirmarlo en el cuadro.
- **Los dos peores defectos del video los encontro el usuario, no los agentes** (el telefono ilegible
  y el CTA pixelado). El agente amplia cobertura; no reemplaza a alguien mirando la pieza entera.
- **El error de base es facil de cometer: darles solo imagenes.** Un agente que ve un cuadro y no
  puede leer el codigo NO PUEDE distinguir un artefacto de un elemento intencional — se le esta
  pidiendo un juicio que su informacion no permite. Si se los audita con imagenes, hay que exigirles
  que reporten OBSERVACION ("hay un rectangulo blanco de 300x80 en tal coordenada del segundo N") y
  no CONCLUSION ("hay un rectangulo huerfano"), y que digan explicitamente cuando no pudieron
  encontrar que lo origina. La conclusion la saca quien puede leer las dos cosas.
- **El falso NEGATIVO no se cierra con esto.** Un agente que no ve un defecto no deja rastro, asi que
  la unica defensa sigue siendo mirar el video terminado — y que lo mire tambien alguien que no
  escribio el codigo.

### Seguridad — sin excepciones
- **Nunca subas `backend/.env` al repo.** Pedile las keys a Jero por un canal privado.
- El authtoken de ngrok igual: **"Nunca lo subas al repo ni lo pegues en chats"**.
- No pegues secretos en el chat de tu IA tampoco.
- Jero: rota la `FAL_KEY` antes de compartir el `.env`.

---

## 10. Mapa rapido

```
render3d/demo/
  main.js        el secuenciador: arma la pieza, seekea, emite el plan
  kit.js         el vocabulario: nivel(), texto(), fondoVivo(), recortes, PATRONES, MOB
  adn.js         DNA -> paleta (hue y polaridad del sitio, estructura del aire)
  guion.js       que escenas, en que orden, con que ajuste de duracion
  verificar.mjs  la compuerta grande
  aires/         11 personalidades
  escenas/       10 escenas
  heroes/        9 protagonistas
backend/
  motor.py            URL -> mp4 en un comando
  site_capture.py     Playwright: DOM, screenshots, recortes, titulares, CTA por apariencia
  semantica_gratis.py que dice la pagina, gratis (marca, features, titulares, CTA, stats, rubro)
  render3d.py         H.264 directo + remux; escribe <video>.plan.json
tools/
  medir-video.py, adn-check.mjs, guion-check.mjs, encuadre-check.mjs, rubro-check.py, gates-guard.mjs
docs/director/RUMBO.md    el historial: que se probo, que gano, que se tiro y por que
```

Si vas a leer un solo archivo mas despues de este, que sea `docs/director/RUMBO.md`.
