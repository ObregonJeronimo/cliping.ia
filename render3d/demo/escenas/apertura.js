// ANTHEM · apertura — 6 beats (2.90 s). La pieza abre en seco.
//
// La apertura es el único lugar donde el espectador decide si sigue mirando, así que acá no hay
// fundido de entrada. Hay un filete que cruza el cuadro pasándose de largo y volviendo, un rótulo que
// se ESCRIBE por máscara, un contador que acelera hacia el corte — y en el beat 1.5 todo colapsa en
// tres frames mientras la grilla del fondo se prende de golpe. Recién ahí entra ANTHEM, letra por
// letra, desde z = -13.
//
// Tres decisiones sostienen la escena:
//   · el corte cae en el beat 1.5 EXACTO. El ojo ya lo está esperando; un corte a los "2.3 segundos"
//     se lee como que el video se movió, no como que alguien lo cortó.
//   · la palabra mide ~94% del ancho del cuadro. Un titular al 40% se lee tímido: en un reel la
//     tipografía es la imagen, no un rótulo sobre la imagen.
//   · después del beat 3 nada descansa. La palabra deriva y respira, las letras flotan desfasadas,
//     una barra de progreso avanza abajo y el fondo late una vez por beat.
//
// LO QUE FALTABA, MEDIDO. "Nada descansa" resultó ser la mitad del trabajo. Entre el beat 3 y el 6 el
// cuadro se movía todo el tiempo y no PASABA nada: deriva, respiración y flotación son movimiento
// CONTINUO, y el ojo no cuenta como corte algo que no cambia de golpe. Contra la pieza hecha a mano el
// motor daba 44 cortes por minuto y la referencia 55, con 40 de piso — y la cola de esta escena era
// justo el tramo donde entran tres rótulos sobre un cuadro casi congelado. Ahora la cola tiene golpes:
// la regla de abajo se dibuja POR TRAMOS que se apuran hacia el beat 4, el nombre se desplaza por
// LETRAS en el 4 y en el 5, y los corchetes de encuadre PARPADEAN dos frames sobre esos mismos beats.
// Ninguno de los tres agrega un elemento al cuadro: son los que ya estaban, moviéndose cuando toca.
// Esta escena es la primera impresión de la pieza y ese fue el límite de todo lo que se probó acá:
// nada que desplace la composición, nada que ensucie el nombre.
//
// TODOS LOS GOLPES CAEN EN LA GRILLA — beats, medios, cuartos y dieciseisavos. No es purismo: una
// pieza que se corta contra una música que no está sólo se lee a montaje si los cortes caen donde el
// oído los espera, y un valor elegido a ojo se delata igual que un corte "a los 2.3 segundos".
//
// El overshoot vive en la ROTACIÓN y en la escala de cada letra, no en z: con la palabra ocupando el
// 94% del ancho, un back.out sobre la profundidad la empujaba fuera del cuadro en el rebote.

import { E, LOOK, MOB, b, BPM, planoTexto, texto, materialMascara, filete, hex, nivel, marco, dolly, orbita } from '../kit.js'
// El COPY sale de los DATOS. Lo que queda escrito aca es CHROME de la pieza (rotulos de
// capitulo, indicadores tecnicos): eso es direccion de arte y no cambia con el contenido.
// Lo que la marca DICE — su nombre, sus cifras, su claim, su CTA — sale de los datos o NO SALE.
import { D, marca, sello } from '../datos.js'

export const meta = { id: 'apertura', beats: 6 }

// QUE PALABRA DE LA MARCA VA EN EL CUADRO MAS GRANDE DE LA PIEZA.
//
// Se EXPORTA porque la compuerta E-ENCAJE tiene que comprobar que esa palabra se dibuje entera, y
// antes la deducia por su cuenta con una copia de la regla. Cuando la regla cambio, las dos versiones
// divergieron y la compuerta empezo a exigir una palabra que la escena ya no dibujaba. Es el mismo
// defecto que hizo que la firma de determinismo, duplicada a mano, dejara de comparar nada: una regla
// escrita dos veces es una regla que en algun momento se contradice.
//
// LA REGLA: la primera palabra con peso, no la mas larga. Elegir la mas larga es correcto sobre el
// ancho y falso sobre la MARCA — "MERCADO LIBRE ARGENTINA" abria diciendo "ARGENTINA", que no es el
// nombre de nadie. Se saltea el articulo inicial ("The Verge" -> VERGE) y una primera palabra de una
// o dos letras, porque ninguno de los dos identifica nada. El espacio nunca entra: la escena reparte
// las letras a lo ancho del cuadro y un espacio abre un hueco del tamano de una letra.
const ARTICULO = new Set(['THE', 'EL', 'LA', 'LOS', 'LAS', 'UN', 'UNA', 'A', 'AN'])
export function palabraDeMarca(marca) {
  const pal = String(marca || 'ANTHEM').toUpperCase().trim().split(/\s+/).filter(Boolean)
  const util = pal.filter((w, i) => !(i === 0 && (ARTICULO.has(w) || w.length <= 2)))
  return util[0] || pal[0] || 'ANTHEM'
}

// `texto()` rasteriza el glifo en un lienzo que mide 1.34·size de alto y le deja 0.3·size de aire
// lateral. Traducido a mundo: por cada unidad de ALTO del plano, AIRE es aire y (ar - AIRE) es glifo.
// Sin descontarlo, "ANTHEM" se arma con seis agujeros adentro y nunca llega al borde del cuadro.
const AIRE = 0.3 / 1.34

// El bloom del pase final tiene umbral 0.62 y pasa el color ENTERO apenas lo cruza — no hay medio
// florecer. Un rótulo blanco de 200 px lo cruza y queda lindo; "ANTHEM" a 1000 px de ancho lo cruza y
// se convierte en un rectángulo blanco que se come el cuadro. La palabra grande va apenas por debajo
// del umbral: nítida, con contraste total sobre el negro, y sin halo.
// Era '#c3cbdb': un gris claro calibrado contra fondo negro, invisible sobre blanco. `nivel` lo
// resuelve en el mundo que toque. Es funcion y no constante porque LOOK todavia no existe cuando
// este archivo se importa — ver el comentario de `nivel` en kit.js.
const TIPO_GRANDE = () => nivel(0.78)

const ANTON = () => ({ fuente: 'Anton', size: 200, color: TIPO_GRANDE() })
// FUNCIONES POR EL MISMO MOTIVO QUE `TIPO_GRANDE`, y durante un tiempo no lo fueron: eran objetos
// literales, y `LOOK.tinta` se leia AL IMPORTAR el archivo — antes de que `configurar()` reasigne la
// paleta. Que LOOK sea un binding vivo no salva a nadie acá: lo que queda congelado es el VALOR ya
// copiado adentro del objeto. Medido con un aire de pagina clara (tinta #101216 sobre fondo #f4f6fa),
// los CINCO rotulos que salen de CHICA se pintaban #f2f4f8 — la tinta casi blanca de la DEMO, sobre
// blanco, o sea invisibles — mientras que los tres que pisan el color adentro de build() salian bien.
// Mismo archivo, mismo helper: la unica diferencia era DONDE se leyo LOOK. Es el defecto de la regla 9
// entrando por la puerta de al lado, sin un solo hexadecimal escrito a mano.
// Los rotulos chicos tampoco van en LOOK.tinta: son chicos, pero el bloom no mide tamanos — mide
// luminancia por pixel. Un rotulo de ocho pixeles por encima del umbral florece igual y se convierte
// en una mancha ilegible, que en un rotulo es peor que en un titular porque no queda ni la silueta.
const CHICA = () => ({ fuente: 'DMSans', peso: 500, size: 200, tracking: 0.24, color: nivel(0.80) })
const CIFRA = () => ({ fuente: 'Bricolage', peso: 800, size: 200, tracking: 0.06, color: nivel(0.80) })

export function build(ctx) {
  const { THREE, gsap, mundoW, mundoH, camera, distBase, rnd, fondo, pelicula, bloom } = ctx

  const g = new THREE.Group()
  const tl = gsap.timeline({ paused: true })

  const F = 1 / 30                 // un frame: la unidad en la que se mide un corte duro
  const BX = mundoW / 2            // borde del cuadro en x  (2.8125)
  const MX = BX * 0.87             // margen de composición   (2.447)
  const bloomBase = (bloom && bloom.strength) || 0.85

  // fromTo con immediateRender apagado: el valor de partida queda declarado en la timeline y no
  // depende de en qué estado encuentre el objeto el primer seek. Es lo que hace que scrubbear hacia
  // atrás devuelva exactamente el mismo frame.
  const de = (obj, desde, hasta, t) => tl.fromTo(obj, desde, { ...hasta, immediateRender: false }, t)

  // ---------------------------------------------------------------- helpers de esta escena
  // Nada de esto escribe ni testea profundidad: las letras cruzan el cuadro viajando desde z -13 y una
  // línea de 3 cm les cortaba un pedazo en pleno vuelo.
  const sinZ = (m, orden = 2) => { m.material.depthWrite = false; m.material.depthTest = false; m.renderOrder = orden; return m }

  // El `filete` del kit nace a 3.2× de intensidad: cruza el umbral del bloom y florece. Es justo lo
  // que se quiere para UN elemento heroico sobre negro — y justo lo que no se quiere para las veinte
  // líneas que estructuran el cuadro, porque veinte neones juntos lavan el frame entero. `raya` es la
  // misma geometría por debajo del umbral: línea nítida, sin halo.
  const raya = (w, h, color = LOOK.acento, k = 1.5) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({
      color: hex(color).multiplyScalar(k), toneMapped: false,
    }))
    return sinZ(m)
  }
  // Anclada por un extremo: escalando x crece hacia un lado en vez de abrirse desde el centro.
  const rayaDesde = (w, h, color, k, dir) => {
    const m = raya(w, h, color, k)
    m.geometry.translate(dir * w / 2, 0, 0)
    return m
  }

  const tenue = (w, h, op, c = LOOK.tinta) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({
      color: hex(c).multiplyScalar(0.5), transparent: true, opacity: op, toneMapped: false,
    }))
    return sinZ(m, 1)
  }

  // Rótulo revelado por máscara. Se le pasa siempre un color: el uniform uTinte del kit nace en null
  // y three intenta subirlo igual, así que un rótulo "sin tinte" revienta al primer render WebGL.
  const rotulo = (str, altoMax, anchoMax, o) => {
    const t = texto(str, o)
    const alto = t.ar > 0.01 ? Math.min(altoMax, anchoMax / t.ar) : altoMax
    const mat = materialMascara(t.tex, o.color || nivel(0.80))
    mat.uniforms.uSuave.value = 0.05
    const m = new THREE.Mesh(new THREE.PlaneGeometry(alto * t.ar, alto), mat)
    m.userData.ancho = alto * t.ar
    m.userData.prog = mat.uniforms.uProg
    m.renderOrder = 6
    m.position.z = 0.1
    return m
  }
  const izq = (m, x, y) => { m.position.set(x + m.userData.ancho / 2, y, m.position.z); return m }
  const der = (m, x, y) => { m.position.set(x - m.userData.ancho / 2, y, m.position.z); return m }

  // Un objeto con escala 0.001 NO es un objeto invisible: es una línea de un píxel. Sobre el negro de
  // la apertura esas astillas se leen como suciedad en el cuadro — y la que peor queda es la que
  // encima florece. Todo lo que entra después se apaga de verdad hasta su beat.
  const apagadoHasta = (o, t) => {
    o.visible = false
    tl.set(o, { visible: false }, 0)
    tl.set(o, { visible: true }, t)
    return o
  }

  // ================================================================ estado inicial explícito
  // Todo nace donde la timeline lo va a encontrar. Un objeto que arranca en su posición final y sólo
  // se corrige al primer tween produce un frame 0 distinto al resto de los renders.
  tl.set(fondo.uGrilla, { value: 0 }, 0)
  tl.set(fondo.uPulso, { value: 0 }, 0)
  tl.set(pelicula.uFlash, { value: 0 }, 0)
  tl.set(camera.position, { x: 0, y: 0, z: distBase }, 0)
  tl.set(camera.rotation, { x: 0, y: 0, z: 0 }, 0)

  // ================================================================ 0 · LA CORTINA
  // La pieza abria con un beat y medio de cuadro CASI VACIO: la grilla del fondo esta en cero hasta
  // b(1.5) y lo unico que se anima antes son filetes de un pixel de alto. Medido sobre el video: 0.60 s
  // seguidos sin que cambie NADA, y 0.695 de los cuadros de la escena practicamente quietos. La
  // referencia hecha a mano abre con 0.10 s. Seis veces mas quieta, y en el peor lugar posible: los
  // primeros dos segundos son los que deciden si alguien sigue mirando.
  //
  // El vacio era una decision de direccion y se respeta. La quietud no. La diferencia entre las dos
  // cosas es que un vacio se puede REVELAR: una cortina del color de la marca que cubre el cuadro
  // entero y se retira en diagonal deja exactamente el mismo cuadro vacio, pero llegando a el con un
  // gesto. Ademas el primer cuadro de la pieza pasa a ser una pantalla solida con el color del
  // cliente, que es como abre la mitad de los reels de marca que funcionan.
  //
  // Va en `g` y sin textura, asi que E-ENCAJE la saltea (mide tipografia y recortes, no masas).
  const cortina = new THREE.Mesh(
    new THREE.PlaneGeometry(mundoW * 3.2, mundoH * 2.2),
    new THREE.MeshBasicMaterial({ color: hex(LOOK.acento), toneMapped: false }))
  cortina.position.set(0, 0, 2.6)
  cortina.rotation.z = -0.62                      // la misma diagonal que la cuña del fondo claro
  g.add(cortina)
  // Se retira acelerando: una cortina que sale frenando se lee como que le costo, y esta tiene que
  // leerse como que la corrieron de un tiron. Termina en b(1.35), justo antes de que la grilla se
  // prenda en b(1.5) — el cuadro queda un instante desnudo y ahi cae el golpe.
  // LA DURACION SE ACORTO CUANDO EL EASE SE ARREGLO, y es una leccion sobre no cambiar una curva sin
  // mirar el cuadro. `acelera` producia un ease invalido y GSAP caia a power1.out —una DESACELERACION—,
  // asi que la cortina salia disparada en el primer frame y despues se arrastraba. Al arreglarlo empezo
  // a acelerar de verdad... y con 1.35 beats de recorrido eso significa que la primera mitad del tiempo
  // no recorre casi nada: medido sobre el render, 32 cuadros seguidos —un segundo entero— con el cuadro
  // tapado por una pared de color plana. Justo el segundo en que el espectador decide si sigue mirando,
  // que es lo que el encabezado de este archivo dice que hay que proteger.
  //
  // Con 0.8 beats la cortina despeja a los 0.23 s en vez de 0.41 y el gesto sigue siendo el correcto:
  // arranca lenta y se va acelerando. La curva estaba bien; el tiempo estaba calibrado para la otra.
  // SEGUNDA CORRECCION, Y ESTA VEZ SOBRE EL EXPONENTE. Bajar 1.35 a 0.8 beats mejoro el sintoma pero
  // no la causa: con `acelera(2.4)` la cortina recorre el 40% del camino recien al 68% del tiempo, asi
  // que la fraccion tapada NO depende de la duracion — se achica todo junto y sigue siendo la misma
  // proporcion. Medido sobre el render de basecamp con 0.8 beats: NUEVE cuadros seguidos, 0.30 s, con
  // el cuadro liso del color del acento. Un corte en seco son dos o tres cuadros; un tercio de segundo
  // es tiempo muerto, y justo en el segundo que este archivo dice que hay que proteger.
  //
  // EL EXPONENTE NO SE PUEDE TOCAR: `acelera(k)` se compone con la curva del aire y no todo valor da
  // una potencia entera. Con 1.6 el aire nocturno produce "power3.6.in", que GSAP no parsea y resuelve
  // en silencio a power1.out — una DESACELERACION, o sea el movimiento al reves del pedido. Lo caza
  // E-EASE-VALIDO, y es exactamente el bug que este mismo bloque documenta haber sufrido antes.
  //
  // Asi que se ataca por los dos lados que si son libres: menos tiempo y ARRANQUE ADELANTADO. La
  // cortina ya empieza con el 14% del camino hecho, que en el primer cuadro no se nota —sigue tapando
  // el cuadro entero, que es lo que se busca— y le saca de encima la parte de la curva donde no
  // recorre nada.
  de(cortina.position, { x: mundoW * 0.35, y: mundoH * 0.21 }, { x: mundoW * 2.5, y: mundoH * 1.5, duration: b(0.5), ease: E.acelera(2.4) }, 0)
  tl.set(cortina, { visible: false }, b(0.95))

  // ================================================================ A · el filete cruza el cuadro
  // beat 0.0-0.5. Negro casi total: la grilla está apagada y lo único que existe es una línea de
  // acento que se abre desde el centro, se pasa de los bordes y vuelve. Acá SÍ va el neón del kit:
  // es el único objeto del cuadro y todo el trabajo de atracción recae sobre él.
  const gAp = new THREE.Group()
  g.add(gAp)

  const fil = sinZ(filete(mundoW * 1.02, 0.05, LOOK.acento), 3)
  fil.position.set(0, 0, -0.35)
  fil.scale.set(0.001, 2.4, 1)
  gAp.add(fil)

  de(fil.scale, { x: 0.001 }, { x: 1, duration: b(0.44), ease: E.llega(2.4) }, 0)
  de(fil.scale, { y: 2.4 }, { y: 1, duration: b(0.62), ease: E.frena(5) }, 0)

  // Marcas de tiempo sobre el filete: cuatro rayitas verticales de alturas alternadas, escalonadas.
  // El stagger es lo que las convierte en una regla y no en cuatro palitos.
  const marcas = []
  ;[[-1.98, 0.38], [-0.72, 0.24], [0.72, 0.24], [1.98, 0.38]].forEach(([x, h]) => {
    const m = raya(0.04, h, LOOK.acento, 2.6)
    m.position.set(x, 0, -0.34)
    m.scale.y = 0.001
    gAp.add(m)
    marcas.push(m)
  })
  marcas.forEach((m, i) => {
    de(m.scale, { y: 0.001 }, { y: 1, duration: b(0.34), ease: E.llega(2.8) }, b(0.14) + i * 0.045)
  })

  // Cruz vertical y dos hairlines: el cuadro tiene que estar lleno incluso cuando está casi negro.
  const cruz = tenue(0.016, 3.8, 0.5)
  cruz.position.set(0, 0, -0.4)
  cruz.scale.y = 0.001
  gAp.add(cruz)
  de(cruz.scale, { y: 0.001 }, { y: 1, duration: b(0.55), ease: E.frena(5) }, b(0.26))

  ;[1.62, -1.62].forEach((y, i) => {
    const h = tenue(mundoW * 0.74, 0.01, 0.42)
    h.position.set(0, y, -0.4)
    h.scale.x = 0.001
    gAp.add(h)
    de(h.scale, { x: 0.001 }, { x: 1, duration: b(0.6), ease: E.frena(5) }, b(0.12) + i * 0.07)
  })

  // ================================================================ marco de esquinas (sobrevive al corte)
  // Las escuadras salen disparadas desde el centro hacia sus esquinas: son lo único que cruza el corte
  // duro sin romperse, y esa continuidad es lo que hace que el corte se lea como montaje y no como que
  // el video empezó de nuevo.
  // LOS CORCHETES SON DEL AIRE, no de la escena. Dicen 'camara', 'tecnico', 'capturado': son
  // perfectos para software y para deporte, y sobre una joyeria o una panaderia dicen exactamente
  // lo que no hay que decir. Un aire que no los pide compone el cuadro sin ellos y el resto de la
  // escena no se entera. Ver MOB en kit.js.
  // La FORMA la elige el aire, no la escena: un pasepartu de galeria para lujo, ticks de acotacion
  // para arquitectura, dos filetes para una pieza impresa. Antes esto era un booleano y por eso todas
  // las piezas se veian iguales por el borde. Ver MARCOS en kit.js.
  const mrc = marco(mundoW, mundoH)
  const esquinas = mrc ? mrc.piezas : []
  if (mrc) g.add(mrc.g)
  // SALEN DISPARADAS DESDE EL CENTRO, y eso hay que escribirlo. Antes el grupo del marco vivia en el
  // origen con los brazos en posiciones ABSOLUTAS, asi que escalarlo de 0 a 1 los mandaba volando del
  // centro a su esquina: el vuelo era un efecto lateral de la estructura. Ahora cada pieza vive EN su
  // esquina —lo necesita el metronomo, que la empuja hacia afuera— y el vuelo hay que pedirlo.
  //
  // Posicion y escala con la MISMA curva dan pos = base x escala en todo momento, que es exactamente
  // lo que hacia la estructura vieja. Y ahora sirve para las cinco familias: los ticks entran desde el
  // centro igual que las escuadras, sin que la escena sepa cual le toco.
  const K0 = 0.001
  esquinas.forEach((e, i) => {
    const bs = e.userData.base
    e.scale.set(K0, K0, 1)
    e.position.set(bs.x * K0, bs.y * K0, e.position.z)
    const t0 = b(0.30) + i * 0.05
    de(e.scale, { x: K0, y: K0 }, { x: 1, y: 1, duration: b(0.42), ease: E.llega(2.0) }, t0)
    de(e.position, { x: bs.x * K0, y: bs.y * K0 }, { x: bs.x, y: bs.y, duration: b(0.42), ease: E.llega(2.0) }, t0)
  })

  // ================================================================ B · el rótulo y el contador
  // beat 0.5-1.0. Tipografía chica con tracking alto revelada por MÁSCARA: el texto se escribe de
  // izquierda a derecha. Un fundido acá sería la transición de quien no eligió ninguna.
  const rot = izq(rotulo(D.rotulo, 0.16, mundoW * 0.62, CHICA()), -MX, 0.44)
  gAp.add(rot)
  const rotX = rot.position.x
  rot.userData.prog.value = 0
  de(rot.userData.prog, { value: 0 }, { value: 1.08, duration: b(0.52), ease: E.vaiven(2) }, b(0.5))
  de(rot.position, { x: rotX - 0.16 }, { x: rotX, duration: b(0.7), ease: E.frena(3) }, b(0.5))

  // El micro-rotulo decia `REC · 124 BPM`: jerga del motor, en el video de un cliente. El dominio de
  // la propia pagina ocupa el mismo lugar, mide parecido y ademas es cierto.
  // EL HUD TAMBIEN. Estos dos rotulos —el dominio y el formato del archivo— son una FICHA TECNICA:
  // le quedan bien a una pieza que quiere parecer un instrumento y le sobran a una que quiere
  // parecer una revista. El aire decide si el cuadro lleva ficha.
  if (MOB.hud) {
    const micro = izq(rotulo(sello(0), 0.115, mundoW * 0.4, { ...CHICA(), tracking: 0.3, color: LOOK.acento2 }), -MX, -0.45)
    gAp.add(micro)
    micro.userData.prog.value = 0
    de(micro.userData.prog, { value: 0 }, { value: 1.08, duration: b(0.4), ease: E.frena(2) }, b(0.82))

    const formato = der(rotulo('1080 · 1920', 0.105, mundoW * 0.4, { ...CHICA(), tracking: 0.3 }), MX, -0.45)
    formato.material.uniforms.uDir.value = 1
    gAp.add(formato)
    formato.userData.prog.value = 0
    de(formato.userData.prog, { value: 0 }, { value: 1.08, duration: b(0.4), ease: E.frena(2) }, b(0.95))
  }

  // El contador NO interpola texto: son seis planos distintos que se prenden y se apagan. Los dos
  // primeros caen en medios beats y después acelera hacia el corte — un readout que se apura es lo que
  // avisa al ojo que algo va a pasar en el 1.5.
  const CNT = [['00', 0.25], ['05', 0.5], ['11', 1.0], ['17', 1.25], ['21', 1.375], ['24', 1.4375]]
  CNT.forEach(([txt, beat], i) => {
    const m = planoTexto(txt, 0.30, CIFRA())
    m.position.set(MX - (0.30 * m.userData.ar) / 2, 0.44, 0.1)
    m.renderOrder = 6
    m.visible = false
    gAp.add(m)
    const t0 = b(beat)
    const t1 = i + 1 < CNT.length ? b(CNT[i + 1][1]) : b(1.5) + 3 * F
    tl.set(m, { visible: true }, t0)
    tl.set(m, { visible: false }, t1)
    de(m.scale, { x: 1.16, y: 1.16 }, { x: 1, y: 1, duration: b(0.22), ease: E.llega(3.2) }, t0)
  })

  // Testigo de grabación: parpadea en cuartos de beat. Nada descansa, ni siquiera un cuadrado de 8 cm.
  const testigo = raya(0.08, 0.08, LOOK.calido, 2.6)
  testigo.position.set(MX - 0.72, 0.44, -0.3)
  testigo.visible = false
  gAp.add(testigo)
  for (let k = 0; k < 3; k++) {
    tl.set(testigo, { visible: true }, b(0.25 + k * 0.5))
    tl.set(testigo, { visible: false }, b(0.5 + k * 0.5))
  }

  // ================================================================ C · beat 1.5 — CORTE DURO
  const T = b(1.5)

  // El rótulo y el filete no se van: se aplastan. Escala en y a cero en tres frames, con un tirón de
  // 6% en x para que el colapso tenga dirección.
  de(gAp.scale, { y: 1 }, { y: 0.001, duration: 3 * F, ease: E.acelera(3) }, T)
  de(gAp.scale, { x: 1 }, { x: 1.06, duration: 3 * F, ease: E.acelera(2) }, T)
  tl.set(gAp, { visible: true }, 0)
  tl.set(gAp, { visible: false }, T + 3 * F)

  // La grilla se prende pasándose (1.15) y se asienta en 0.82. Un uniform que va del 0 a su valor y
  // frena ahí se lee a interruptor; pasarse y volver se lee a golpe.
  de(fondo.uGrilla, { value: 0 }, { value: 1.15, duration: 2 * F, ease: E.frena(2) }, T)
  de(fondo.uGrilla, { value: 1.15 }, { value: 0.82, duration: b(0.5), ease: E.frena(2) }, T + 2 * F)

  de(fondo.uPulso, { value: 0 }, { value: 0.55, duration: 2 * F, ease: E.frena(2) }, T)
  de(fondo.uPulso, { value: 0.55 }, { value: 0, duration: b(0.55), ease: E.frena(3) }, T + 2 * F)

  de(pelicula.uFlash, { value: 0.32 }, { value: 0, duration: 2 * F, ease: E.acelera(2) }, T)
  de(bloom, { strength: bloomBase * 1.45 }, { strength: bloomBase, duration: b(0.6), ease: E.frena(3) }, T)

  // Las escuadras entran de golpe un 10% afuera y vuelven: el marco "acusa" el corte.
  if (mrc) de(mrc.g.scale, { x: 1.10, y: 1.06 }, { x: 1, y: 1, duration: b(0.55), ease: E.llega(2.2) }, T)

  // Rieles laterales y sus marcas: aparecen con la grilla y le arman al cuadro una caja que sostiene
  // la palabra enorme que está por entrar.
  //
  // SON PARTE DEL MARCO Y NO PREGUNTABAN. Dos verticales de 7.6 unidades —1459 px de 1920— en color de
  // acento, pegadas a ±MX, en los once aires. Ese es el "recuadro en los cuatro costados" que se ve en
  // todas las piezas: no lo dibujaba el marco del aire, lo dibujaba esta escena por su cuenta. Y era
  // peor que redundante: un aire que eligio 'reglas' —dos filetes ABIERTOS a los lados, a proposito—
  // recibia los lados igual, o sea que la escena contradecia la decision del aire.
  //
  // Los rieles son el vocabulario de 'escuadras': el HUD de camara de ANTHEM, donde la caja cerrada es
  // justamente el punto. En las otras familias sobran, y sacarlos es lo que deja ver el marco elegido.
  const hudLateral = !!(mrc && mrc.tipo === 'escuadras')
  const gRiel = new THREE.Group()
  if (hudLateral) { g.add(gRiel); apagadoHasta(gRiel, T) }
  if (hudLateral) [-1, 1].forEach((sx, i) => {
    const r = tenue(0.012, 7.6, 0.55, LOOK.acento)
    r.position.set(sx * MX, 0, -0.4)
    r.scale.y = 0.001
    gRiel.add(r)
    de(r.scale, { y: 0.001 }, { y: 1, duration: b(0.55), ease: E.frena(5) }, T + i * 0.05)
    ;[3.0, 1.5, -1.5, -3.0].forEach((y, k) => {
      const t = rayaDesde(0.14, 0.016, LOOK.acento, 1.6, -sx)
      t.position.set(sx * MX, y, -0.3)
      t.scale.x = 0.001
      gRiel.add(t)
      de(t.scale, { x: 0.001 }, { x: 1, duration: b(0.3), ease: E.llega(2.6) }, T + b(0.18) + (k * 2 + i) * 0.04)
    })
  })

  // ================================================================ D · beat 1.5-3.0 — LA PALABRA
  // Cada letra es su propio plano. Se miden todas con el mismo tamaño de fuente, se les descuenta el
  // aire del lienzo y recién ahí se calcula el ALTO que hace que la palabra entera mida 94% del ancho
  // del cuadro. Es la única forma de que "ANTHEM" toque los bordes sin dejar huecos entre letras.
  // LA PALABRA ES LA MARCA. Estaba escrita letra por letra y el video de cualquier página abría
  // diciendo "ANTHEM" — el nombre de la demo, en el cuadro más grande de la pieza.
  //
  // Se cae a una sola línea sin espacios: la escena reparte las letras a lo ancho del cuadro, y con un
  // espacio en el medio el reparto abre un hueco del tamaño de una letra. Una marca de dos palabras se
  // compone por su palabra más larga, que es la que de verdad manda el ancho.
  const LETRAS = (() => {
    const m = String(D.marca || 'ANTHEM').toUpperCase().trim()
    const pal = m.split(/\s+/).filter(Boolean)
    // LA PRIMERA PALABRA CON PESO, no la mas larga.
    //
    // Esto elegia la palabra MAS LARGA, con el argumento de que es la que manda el ancho. Y es cierto
    // sobre el ancho y falso sobre la MARCA: "MERCADO LIBRE ARGENTINA" abria diciendo "ARGENTINA", que
    // no es el nombre de nadie. El cuadro mas grande de la pieza mostrando la palabra equivocada es el
    // error mas caro que puede cometer una apertura — es lo unico que el espectador se lleva si deja
    // de mirar a los dos segundos.
    //
    // Una marca lidera con su nombre, asi que va la primera palabra. Se saltea el articulo inicial
    // ("The Verge" -> VERGE) porque un articulo solo no identifica nada, y se saltea una primera
    // palabra de una o dos letras por la misma razon. El espacio no entra en ningun caso: la escena
    // reparte las letras a lo ancho del cuadro y un espacio abre un hueco del tamano de una letra.
    const elegida = palabraDeMarca(m)
    // NO SE TRUNCA. Antes iba `.slice(0, 9)` y "CONSTRUCCIONES DEL SUR" salía "CONSTRUCC": el video de
    // un cliente abría con su nombre cortado a la mitad, en el cuadro más grande de la pieza, y sin
    // que nada avisara. Una marca larga se compone MÁS CHICA — de eso se encarga el reparto de abajo,
    // que ya divide el ancho disponible entre la suma de las proporciones.
    return elegida.split('')
  })()
  const TRACK = 0.016
  const OBJ = mundoW * 0.94
  const unidad = LETRAS.map(L => Math.max(0.05, texto(L, ANTON()).ar - AIRE))
  const suma = unidad.reduce((a, c) => a + c, 0)
  // ENCAJE DE DOS EJES. El reparto original sólo miraba el ANCHO: repartía el 94% del cuadro entre la
  // suma de proporciones y sacaba el alto de ahí. Con muchas letras funciona —la palabra se achica
  // sola—, pero con pocas explota: una marca de UNA letra da una suma de ~0.55 y el alto salía 9.6
  // unidades en un cuadro de 10, o sea la letra al 143% del alto útil, comiéndose el rótulo, el claim
  // y las esquinas. Con dos o tres letras el titular quedaba tan alto que se superponía con la
  // cabecera.
  //
  // Es el mismo defecto de un solo eje que ya está resuelto unas líneas más arriba para el rótulo
  // (`Math.min(altoMax, anchoMax / t.ar)`), y por eso el rótulo nunca se rompió y el titular sí.
  //
  // El tope es 0.34 del alto de mundo: es el punto donde la palabra sigue siendo el objeto dominante
  // del cuadro pero deja respirar arriba y abajo. El piso es 0.55, porque por debajo de eso el glifo
  // en Anton se afina tanto que el bloom le rellena los contrapunzones y el nombre deja de leerse.
  const ALTO_MAX = mundoH * 0.34
  const ALTO_MIN = 0.55
  const porAncho = suma > 0.05 ? (OBJ - TRACK * (LETRAS.length - 1)) / suma : 2.2
  // El piso NO se aplica si haría desbordar el cuadro: entre un nombre chico y un nombre cortado por
  // el borde, gana el chico. Un titular que se sale se lee como un error de render; uno pequeño se
  // lee como una marca de nombre largo, que es lo que es.
  const conPiso = Math.max(ALTO_MIN, Math.min(ALTO_MAX, porAncho))
  const cabe = suma * conPiso + TRACK * (LETRAS.length - 1) <= mundoW * 0.98
  const ALTO = cabe ? conPiso : Math.min(ALTO_MAX, porAncho)

  // `texto()` dibuja con textBaseline 'middle', y en Anton el centro óptico de la caja de mayúsculas
  // queda ~0.093·ALTO por encima del centro del plano. Sin corregirlo la palabra se sienta alta y le
  // come el aire a la cabecera — medido sobre el render, no deducido de la métrica de la fuente.
  const gPal = new THREE.Group()
  gPal.position.set(0, 0.26 - ALTO * 0.093, 0)
  g.add(gPal)

  const letras = []
  let cursor = -OBJ / 2
  LETRAS.forEach((L, i) => {
    const w = unidad[i] * ALTO
    const m = planoTexto(L, ALTO, ANTON())
    m.position.set(cursor + w / 2, 0, -13)
    m.rotation.x = -1.35
    m.rotation.z = (rnd() - 0.5) * 0.16
    m.scale.set(0.86, 0.86, 1)
    m.material.opacity = 0
    m.renderOrder = 4
    gPal.add(m)
    letras.push(m)
    cursor += w + TRACK
  })

  const DUR = b(0.95)
  // EL TERCER STAGGER QUE SE SUMABA, y el más grande de los tres. Los otros dos (el desfase del
  // flotado y el del pateo) ya reparten un techo entre las letras; éste seguía siendo 50 ms FIJOS por
  // letra, que con la palabra entrando desde z -13 es el que más empuja: a partir de 36 letras la
  // última arranca tan tarde que la escena se pasa de sus seis beats y se come la siguiente. Medido:
  // con 40 letras la timeline daba 3.136 s contra un techo de 2.903. Nadie lo veía porque la duración
  // se mide con "ANTHEM" y el gate de encaje llega hasta "TRANSPORTES INTERNACIONALES" (15 de corrido).
  // El techo de 1.55 beats está elegido para que hasta quince letras el paso siga siendo exactamente
  // 0.05 y la entrada de siempre no se mueva ni un frame; recién de dieciséis en adelante el abanico
  // se comprime en vez de desbordar.
  const pasoEntrada = Math.min(0.05, b(1.55) / Math.max(1, letras.length))
  letras.forEach((m, i) => {
    const t0 = T + i * pasoEntrada                // el ojo lee intención, no un grupo
    tl.set(m.material, { opacity: 0 }, 0)
    tl.set(m.material, { opacity: 1 }, t0)
    de(m.position, { z: -13 }, { z: 0, duration: DUR, ease: E.frena(3) }, t0)
    de(m.position, { y: -0.55 }, { y: 0, duration: DUR, ease: E.llega(2.0) }, t0)
    de(m.rotation, { x: -1.35 }, { x: 0, duration: DUR, ease: E.llega(2.2) }, t0)
    de(m.rotation, { z: m.rotation.z }, { z: 0, duration: DUR, ease: E.llega(1.8) }, t0)
    de(m.scale, { x: 0.86, y: 0.86 }, { x: 1, y: 1, duration: DUR, ease: E.llega(2.6) }, t0)
  })

  // Empuje de cámara mientras las letras llegan, y una inclinación mínima que se resuelve sola. El
  // empuje se frena en -0.55 porque con la palabra al 94% del ancho, medio metro más la recorta.
  de(camera.position, { z: dolly(distBase, 0.85) }, { z: dolly(distBase, -0.55), duration: b(1.6), ease: E.frena(2) }, T)
  de(camera.rotation, { z: orbita(0.016) }, { z: 0, duration: b(1.4), ease: E.frena(2) }, T)

  // Filete de acento debajo de la palabra: dispara de izquierda a derecha y llena el hueco que deja la
  // tipografía mientras todavía está aterrizando.
  const filD = rayaDesde(MX * 2, 0.02, LOOK.acento2, 1.2, 1)
  filD.position.set(-MX, -0.78, -0.35)
  filD.scale.x = 0.001
  g.add(filD)
  apagadoHasta(filD, b(1.9))
  de(filD.scale, { x: 0.001 }, { x: 1, duration: b(0.55), ease: E.frena(5) }, b(1.9))

  // Cabecera sobre la palabra: rótulo centrado con dos filetes que crecen hacia afuera desde su borde.
  const CAB_Y = 1.62
  const cab = rotulo(D.rotulo, 0.135, mundoW * 0.42, { ...CHICA(), tracking: 0.3 })
  cab.position.set(0, CAB_Y, 0.1)
  g.add(cab)
  cab.userData.prog.value = 0
  de(cab.userData.prog, { value: 0 }, { value: 1.08, duration: b(0.6), ease: E.vaiven(2) }, b(2.15))
  ;[-1, 1].forEach((sx, i) => {
    const f = rayaDesde(0.46, 0.018, LOOK.acento, 1.9, sx)
    f.position.set(sx * (cab.userData.ancho / 2 + 0.28), CAB_Y, -0.3)
    f.scale.x = 0.001
    g.add(f)
    apagadoHasta(f, b(2.05) + i * 0.06)
    de(f.scale, { x: 0.001 }, { x: 1, duration: b(0.4), ease: E.llega(2.4) }, b(2.05) + i * 0.06)
  })

  // ================================================================ E · beat 3.0-6.0 — la palabra vive
  // Queda, pero no quieta: deriva lentísimo en x, respira 1.2% en escala y cada letra flota en z con
  // su propio período. Tres movimientos casi imperceptibles que juntos son la diferencia entre una
  // palabra puesta y una palabra viva.
  de(gPal.position, { x: 0.07 }, { x: -0.07, duration: b(2.9), ease: E.vaiven() }, b(3.0))
  de(gPal.scale, { x: 1, y: 1 }, { x: 1.012, y: 1.012, duration: b(1.42), ease: E.vaiven(), yoyo: true, repeat: 1 }, b(3.0))
  // El desfase de período por letra tenía el mismo defecto de "se suma" que los pateos de acá abajo, y
  // este SÍ se estaba pasando: el tween arranca en el 3.0, va y vuelve (yoyo), así que su período no
  // puede pasar de beat y medio o la escena termina después de sus seis beats y se come la siguiente.
  // Con 0.02 fijos la letra 13 pedía 1.56 y la timeline duraba 2.961 s en un lugar de 2.903 — o sea que
  // toda marca de doce letras para arriba pisaba a la escena de al lado, en silencio. No lo cazaba
  // nadie porque la duración se mide con "ANTHEM", que tiene seis. El incremento se REPARTE: con seis
  // letras da exactamente lo de antes, y con quince comprime el abanico en vez de desbordarlo.
  const desfase = Math.min(0.02, 0.18 / Math.max(1, letras.length))
  letras.forEach((m, i) => {
    const amp = (i % 2 ? 0.055 : -0.045) - i * 0.004
    de(m.position, { z: 0 }, { z: amp, duration: b(1.30 + i * desfase), ease: E.vaiven(), yoyo: true, repeat: 1 }, b(3.0))
  })

  // ---- el nombre PATEA en el 4 y en el 5
  // La deriva y la respiración de arriba mueven píxeles y no cuentan un evento: son continuas, y lo
  // continuo el ojo lo lee como que la imagen está viva, no como que algo pasó. Acá el nombre se
  // DESPLAZA por letras: cada una salta a su desfase en un frame —eso es el evento— y vuelve pasándose.
  //
  // EL SALTO VA EN Y, NO EN X. Las letras están a 1.6 cm una de otra: un desplazamiento horizontal las
  // encima y el nombre de la marca sale pisado en el cuadro más grande de la pieza. Eso es un defecto,
  // no un gesto. En vertical el reparto a lo ancho no se toca y la palabra sigue siendo legible en
  // todos los frames del salto.
  //
  // El segundo golpe es más chico y arranca por el lado contrario (el `+ k` invierte la alternancia):
  // dos golpes idénticos separados por un beat se leen a metrónomo.
  //
  // EL STAGGER SE REPARTE, NO SE SUMA. Con 25 ms fijos por letra, una marca de quince letras empuja el
  // último tween 0.35 s más allá del arranque y la escena se pasa de sus seis beats — se come la que
  // sigue. El techo es fijo y el paso sale de dividirlo.
  const paso = Math.min(0.028, b(0.42) / Math.max(1, letras.length))
  ;[[4.0, 0.10, b(0.34)], [5.0, 0.062, b(0.28)]].forEach(([beat, amp, dur], k) => {
    letras.forEach((m, i) => {
      const off = ((i + k) % 2 ? 1 : -1) * ALTO * amp
      de(m.position, { y: off }, { y: 0, duration: dur, ease: E.llega(2.4) }, b(beat) + i * paso)
    })
  })

  // Segunda línea, revelada por máscara. Dice para qué existe la pieza.
  const sub = rotulo(D.claim, 0.165, mundoW * 0.86, { ...CHICA(), tracking: 0.18 })
  sub.position.set(0, -1.24, 0.1)
  g.add(sub)
  sub.userData.prog.value = 0
  de(sub.userData.prog, { value: 0 }, { value: 1.08, duration: b(0.9), ease: E.vaiven(2) }, b(3.05))

  // Decia '6 ESCENAS · 0 PLANTILLAS' — autopromocion del motor metida en la pieza de otro. El claim
  // de la pagina es lo que corresponde en ese renglon, y si la pagina no dio ninguno no va nada.
  const sub2 = rotulo(D.claim || '', 0.11, mundoW * 0.6, { ...CHICA(), tracking: 0.34, color: LOOK.acento2 })
  sub2.position.set(0, -1.66, 0.1)
  g.add(sub2)
  sub2.userData.prog.value = 0
  de(sub2.userData.prog, { value: 0 }, { value: 1.08, duration: b(0.7), ease: E.frena(2) }, b(4.1))

  // Fila de metadatos en el tercio inferior. El aire es una decisión, no un sobrante: sin esto la
  // mitad de abajo del cuadro queda como grilla vacía durante tres beats, que es exactamente el rato
  // en que el espectador decide si desliza.
  // El renglón se dibujaba DE UNA: una barra que barría de punta a punta en 0.7 beats. Eso es
  // movimiento, no es un evento — un barrido lento no lo cuenta ni el ojo ni el analizador. Ahora se
  // dibuja POR TRAMOS, y los tramos SE APURAN. Es exactamente el gesto del contador del arranque, que
  // se acelera hacia el corte del 1.5; acá la regla termina de cerrarse en el 3.875 y el nombre patea
  // en el 4.0, así que los cinco golpes se leen como una entrada.
  //
  // LOS TIEMPOS SON SEMICORCHEAS, NO NÚMEROS LINDOS. Iban en 3.30, 3.52, 3.68, 3.79 y 3.86: valores
  // que no son ni beats ni medios ni cuartos ni dieciseisavos de nada, elegidos a ojo para que la
  // separación se achicara. El gesto era el correcto y el resultado en pantalla es el MISMO —los cinco
  // caen en los frames 48, 52, 54, 56 y 57 con una lista y con la otra—, pero una escena que se
  // sincroniza con una música que no está no puede tener eventos fuera de la grilla: el contador de
  // acá arriba usa 0.25, 0.5, 1.0, 1.25, 1.375 y 1.4375, o sea cuartos, octavos y dieciseisavos, y es
  // el vocabulario del archivo. Además 3.79 caía a 0.5 ms del borde del frame 55: de qué lado de la
  // línea aterrizaba dependía del quinto decimal del BPM.
  //
  // Los tramos dejan 6 cm de aire entre sí — el 1% del largo. Alcanza para que durante el dibujado se
  // vean CINCO piezas y no una barra a saltos, y en el estado final se lee como lo que dice ser: una
  // regla graduada, no un filete partido.
  const REGLA_Y = -2.64
  const REGLA_T = [3.25, 3.5625, 3.6875, 3.8125, 3.875]
  const anchoT = (MX * 2) / REGLA_T.length
  // Anclado por el borde izquierdo, como `rayaDesde`, para que cada tramo CREZCA hacia la derecha en
  // vez de abrirse desde su centro: abriéndose desde el centro, cinco tramos a la vez parpadean como
  // guiones y no como una línea que se está trazando.
  const regla = REGLA_T.map((beat, i) => {
    const t = tenue(anchoT - 0.06, 0.006, 0.35)
    t.geometry.translate((anchoT - 0.06) / 2, 0, 0)
    t.position.set(-MX + i * anchoT, REGLA_Y, -0.4)
    t.scale.x = 0.001
    g.add(t)
    apagadoHasta(t, b(beat))
    de(t.scale, { x: 0.001 }, { x: 1, duration: 3 * F, ease: E.frena(3) }, b(beat))
    return t
  })
  // Y se retira EN SENTIDO CONTRARIO justo antes del corte, un tramo cada dos frames. Nada salía de
  // esta escena: terminaba entera y el corte la encontraba llena, que es lo que hace que un corte se
  // lea como que el video se movió. La regla replegándose mientras el testigo de la barra de progreso
  // termina su recorrido hacia el otro lado son cinco eventos más en el tramo más muerto de la cola.
  // El arranque del repliegue va en el 5.25 —un cuarto de beat— por lo mismo que la lista de arriba:
  // el 5.30 no era nada. Los cinco tramos se apagan en los mismos frames (77, 79, 81, 83 y 85) y
  // sobran dos frames más de aire antes del corte.
  regla.forEach((t, i) => tl.set(t, { visible: false }, b(5.25) + (regla.length - 1 - i) * 2 * F))

  // 'CAPITULO 01 — APERTURA' era el nombre INTERNO de la escena impreso en el cuadro: no solo estaba
  // en castellano en la pieza de una marca inglesa, delataba la plantilla. Un indice puro compone
  // igual y no dice nada que pueda ser falso.
  const metaL = izq(rotulo(marca(1, 6), 0.10, mundoW * 0.5, { ...CHICA(), tracking: 0.32 }), -MX, -2.44)
  g.add(metaL)
  metaL.userData.prog.value = 0
  de(metaL.userData.prog, { value: 0 }, { value: 1.08, duration: b(0.5), ease: E.frena(2) }, b(3.6))

  const metaR = der(rotulo(sello(1), 0.10, mundoW * 0.42, { ...CHICA(), tracking: 0.32, color: LOOK.acento2 }), MX, -2.44)
  metaR.material.uniforms.uDir.value = 1
  g.add(metaR)
  metaR.userData.prog.value = 0
  de(metaR.userData.prog, { value: 0 }, { value: 1.08, duration: b(0.5), ease: E.frena(2) }, b(3.85))

  // Barra de progreso abajo: avanza sin ease durante los últimos tres beats, con un testigo que la
  // recorre. Es el reloj visible de la escena.
  const riel = tenue(MX * 2, 0.008, 0.4)
  riel.position.set(0, -4.35, -0.4)
  g.add(riel)
  apagadoHasta(riel, b(3.0))
  const prog = rayaDesde(MX * 2, 0.024, LOOK.acento, 1.8, 1)
  prog.position.set(-MX, -4.35, -0.3)
  prog.scale.x = 0.001
  g.add(prog)
  apagadoHasta(prog, b(3.0))
  de(prog.scale, { x: 0.001 }, { x: 1, duration: b(2.7), ease: 'none' }, b(3.0))
  const punto = raya(0.055, 0.14, LOOK.tinta, 1.15)
  punto.position.set(-MX, -4.35, -0.28)
  punto.renderOrder = 3
  g.add(punto)
  apagadoHasta(punto, b(3.0))
  de(punto.position, { x: -MX }, { x: MX, duration: b(2.7), ease: 'none' }, b(3.0))

  // Pulso del fondo: un latido por beat, corto y suave. El fondo respira con la música que no está.
  for (let k = 3; k <= 5; k++) {
    de(fondo.uPulso, { value: 0 }, { value: 0.32, duration: b(0.14), ease: E.frena(2) }, b(k))
    de(fondo.uPulso, { value: 0.32 }, { value: 0, duration: b(0.62), ease: E.frena(3) }, b(k) + b(0.14))
  }
  // Y el marco late con él, un 0.8%: casi no se ve, pero si se apaga el cuadro se muere.
  if (mrc) de(mrc.g.scale, { x: 1, y: 1 }, { x: 1.008, y: 1.008, duration: b(0.5), ease: E.vaiven(), yoyo: true, repeat: 3 }, b(3.0))

  // ---- los corchetes PARPADEAN sobre el beat
  // Ese latido del 0.8% se VE pero no se CUENTA: el ojo registra que el marco respira, no que pasó
  // algo. Sobre los beats de la cola los cuatro corchetes se apagan DOS FRAMES y vuelven. Es el gesto
  // de un visor —66 ms, sin desplazar un milímetro de la composición— y es lo más barato que hay para
  // poner un golpe seco donde no había ninguno: no entra ningún objeto nuevo al cuadro.
  //
  // Se apaga cada esquina un frame después de la anterior, así el parpadeo RECORRE el marco en vez de
  // apagarlo entero: apagado entero se lee a error de reproducción, escalonado se lee a intención.
  //
  // El del 4.5 va a CONTRATIEMPO y sólo con la diagonal. Dos golpes iguales separados por un beat
  // exacto se leen a metrónomo; el impar en el medio es lo que los convierte en un ritmo.
  //
  // Se apaga la MALLA y no el grupo de la esquina a propósito: el grupo se apaga igual de bien en
  // pantalla, pero la firma con la que se mide "nada descansa" mira malla por malla y un parpadeo
  // hecho sobre el padre no figura en ninguna medición.
  //
  // El parpadeo es de INSTRUMENTO: sobre escuadras o ticks se lee como un aparato que mide, y sobre
  // un pasepartu o dos filetes es un fogonazo. Cada familia acepta los gestos que le corresponden.
  const parpadean = mrc && (mrc.tipo === 'escuadras' || mrc.tipo === 'ticks')
  // Una pieza puede ser un grupo de dos brazos (escuadras) o una malla suelta (ticks): se apaga la
  // MALLA en los dos casos, nunca el padre.
  const mallasDe = e => (e.children.length ? e.children : [e])
  if (parpadean) {
    esquinas.forEach(e => mallasDe(e).forEach(m => tl.set(m, { visible: true }, 0)))
    ;[[4.0, [0, 1, 2, 3]], [4.5, [0, 3]], [5.0, [0, 1, 2, 3]]].forEach(([beat, cuales]) => {
      cuales.forEach((c, k) => {
        const t0 = b(beat) + k * F
        mallasDe(esquinas[c % esquinas.length]).forEach(m => {
          tl.set(m, { visible: false }, t0)
          tl.set(m, { visible: true }, t0 + 2 * F)
        })
      })
    })
  }

  // ================================================================ devolver la cámara
  // Si la escena no deja la cámara donde la encontró, la que sigue arranca desde otro punto de vista y
  // la pieza se desarma. El tween la trae y el set la clava.
  de(camera.position, { z: dolly(distBase, -0.55) }, { z: distBase, duration: b(1.9), ease: E.vaiven() }, b(3.1))
  de(fondo.uGrilla, { value: 0.82 }, { value: 0.58, duration: b(1.6), ease: 'none' }, b(4.2))
  tl.set(camera.position, { x: 0, y: 0, z: distBase }, b(5.2))
  tl.set(camera.rotation, { x: 0, y: 0, z: 0 }, b(5.2))

  // El secuenciador cuelga esta timeline de la maestra con `tl.add()`. Una timeline PAUSADA anidada en
  // otra NO se renderiza nunca: GSAP la saltea y encima aporta duración 0, así que la pieza sale con
  // la escena congelada en el estado en que la dejó build() y sin un solo error en consola. Nace en
  // pausa —como pide el contrato, para que no corra sola mientras se la construye— y se despausa al
  // entregarla. El reloj lo sigue poniendo el driver, que es lo que el contrato realmente protege.
  tl.pause(0)
  tl.paused(false)

  return { g, tl }
}
