// PLANTILLA "nucleo" — anillos concentricos girando alrededor de un centro de luz.
//
// EL GESTO
// Un sistema: un punto de luz en el centro y seis anillos de distinto radio, inclinacion y velocidad
// girando a su alrededor. La camara orbita por fuera y va entrando. Los bloques de texto viajan EN los
// anillos, asi que cada tiempo llega girando y se va girando.
//
// Es la plantilla de plataforma: un producto que conecta cosas, un marketplace, una red, una API. La
// metafora esta en la geometria y no hay que explicarla — se entiende antes de leer una palabra.
//
// LO QUE LA DISTINGUE DE `monolito`, que tambien es orbita alrededor de un objeto: alli el objeto es
// solido y la camara lo rodea; aca el objeto es HUECO y la camara entra. Las dos usan `vueloOrbita` y
// se ven completamente distintas, que es la prueba de que el vuelo no es la plantilla.
//
// LOS SEIS TIEMPOS (beats sobre 38)
//   0   ESPACIO   los anillos girando, el nucleo latiendo, el polvo cayendo hacia adentro.
//   5   MARCA     el nombre llega desde afuera del sistema, montado en el anillo mayor.
//   11  PROMESA   el claim gira con el anillo del medio.
//   17  PRUEBA    la pagina entra por el eje, atravesando los anillos.
//   26  RAZONES   las cifras salen del nucleo hacia afuera, una por anillo.
//   32  PEDIDO    los anillos se alinean, el nucleo se abre y el CTA queda en el centro.

import { THREE, vidrio, metal, luz, iluminar, domo, polvo } from '../nucleo.js'
import { vueloOrbita, entra, sale, respirar, juntar, anchoADistancia } from '../movimiento.js'
import { bloqueMarca, bloquePromesa, bloquePrueba, bloquesCifra, bloquesFrase, bloquePedido } from '../bloques.js'
import { colorDePeso, grisDePeso } from '../recetas.js'
import { LOOK, nivel, E, b } from '../../demo/kit.js'

export const meta = {
  id: 'nucleo',
  nombre: 'Núcleo',
  familia: 'objeto',
  necesita: ['nada'],
  beats: 38,
  tiempos: { espacio: 0, marca: 5, promesa: 11, prueba: 17, razones: 26, pedido: 32 },
  pitch: 'Anillos concentricos girando alrededor de un centro de luz. De plataforma, marketplace o API.',
}

export function build(ctx) {
  const { escena, pagina, camara, tl, mundoW, mundoH, distBase } = ctx
  const uso = {}

  // ---------------------------------------------------------------- LO QUE LA PAGINA DECIDE
  //
  // `ctx.recetas` sale de `backend/retrato.py`, que mide la tira, el DOM y los recortes de ESTA pagina.
  // Sin retrato devuelve los valores neutros y la plantilla compone como se componia antes: no hay una
  // rama distinta ni un caso especial. Lo que se modula es el GRADO, nunca la idea.
  //
  // La explicacion larga de cada receta esta en `render3d/boveda/recetas.js`, y la de por que existe
  // este mecanismo, en `atrio.js`.
  const R = ctx.recetas || { velocidad: 1, capas: 3, dureza: 0.75, margen: 0.88, cifras: 3, frases: 2,
    acentoMasa: false, vacio: 0.5, movimientos: 4, paleta: [], medido: false }
  uso.retrato = !!R.medido
  const respiraciones = []

  iluminar(escena, { key: 1.0, relleno: 0.95 })
  const uDomo = domo(escena, { fuerza: 0.32 })
  const motas = polvo(escena, 1600, 24)

  const vuelo = vueloOrbita(camara, tl, {
    distBase, beats: meta.beats, radio0: 1.5, radio1: 0.55, vueltas: 0.44, alto0: 2.2, alto1: 0.4, miraY: 0,
  })
  const puntoEn = vuelo.puntoEn

  // ---------------------------------------------------------------- el espacio: el sistema
  const R0 = mundoW * 0.55
  const gSis = new THREE.Group()
  escena.add(gSis)

  const nucleoLuz = new THREE.Mesh(new THREE.IcosahedronGeometry(R0 * 0.34, 2), luz(LOOK.acento2 || LOOK.acento, 1.6))
  gSis.add(nucleoLuz)
  const jaula = new THREE.Mesh(new THREE.IcosahedronGeometry(R0 * 0.52, 1),
    vidrio(colorDePeso(R, LOOK.acento, 0.20), { rug: 0.05, trans: 0.9, grosor: 1.2, opacidad: 0.5 }))
  gSis.add(jaula)

  // SEIS ANILLOS, cada uno con su inclinacion, su radio y su velocidad. La regla que los hace parecer
  // un sistema y no un adorno: NINGUNA VELOCIDAD ES MULTIPLO DE OTRA. Con periodos conmensurables el
  // conjunto vuelve a alinearse cada tantos segundos y el ojo lo detecta como bucle.
  const anillos = []
  const VEL = [0.31, -0.19, 0.13, -0.44, 0.23, -0.29]
  for (let i = 0; i < 6; i++) {
    const r = R0 * (0.9 + i * 0.52)
    const g = new THREE.Group()
    g.rotation.set(0.42 + i * 0.31, i * 0.77, i * 0.23)
    const aro = new THREE.Mesh(new THREE.TorusGeometry(r, 0.028 + i * 0.004, 8, 96),
      i % 2 ? luz(LOOK.acento, 1.25) : metal(nivel(0.28), 0.32))
    g.add(aro)
    // Un nodo por anillo: una cuenta que corre por el aro. Es lo que da la SENSACION DE FLUJO — sin
    // algo que recorra el anillo, un aro girando sobre si mismo es indistinguible de un aro quieto.
    const nodo = new THREE.Mesh(new THREE.SphereGeometry(0.075 + i * 0.012, 12, 10), luz(LOOK.acento2 || LOOK.acento, 1.7))
    g.add(nodo)
    gSis.add(g)
    anillos.push({ g, nodo, r, v: VEL[i], fase: i * 1.1, y0: g.rotation.y })
  }

  // ---------------------------------------------------------------- los bloques
  // Mismo criterio que `vitral` y `monolito`: el ancho sale de la distancia, no de `mundoW`. Aca el
  // radio se cierra de 1.5 a 0.55, o sea que un bloque del final queda a menos de la mitad de lente que
  // uno del principio y con el mismo numero se veria al doble de tamano.
  const DONDE = {
    marca: [6.8, 0.34, 0.9], promesa: [12.6, 0.32, -0.2], prueba: [20.4, 0.20, 0.0],
    cifra: [26.8, 0.28, 0], frase: [27.4, 0.26, -1.5], pedido: [meta.beats - 0.6, 0.22, 0.0],
  }
  const anchoDe = (que, margen) => {
    const d = DONDE[que]
    return anchoADistancia(mundoW, distBase, puntoEn(d[0], d[1]).dist, 0) * margen
  }
  const marca = bloqueMarca({ alto: 1.15, anchoMax: anchoDe('marca', 0.86) , margen: R.margen })
  const promesa = bloquePromesa({ alto: 0.48, anchoMax: anchoDe('promesa', 0.86) , margen: R.margen })
  const prueba = bloquePrueba(ctx, { ancho: anchoDe('prueba', 0.56), ar: 1.55 })
  const cifras = bloquesCifra(R.cifras, { alto: 0.70, anchoMax: anchoDe('cifra', 0.48) , margen: R.margen })
  const frases = bloquesFrase(R.frases, { alto: 0.27, anchoMax: anchoDe('frase', 0.82) , margen: R.margen })
  const pedido = bloquePedido({ alto: 0.31, anchoMax: anchoDe('pedido', 0.66) , margen: R.margen })

  const plantar = (blk, beat, frac, y, padre) => {
    const p = puntoEn(beat, frac, y)
    const gExt = new THREE.Group()
    gExt.position.copy(p.pos)
    gExt.rotation.y = p.yaw
    gExt.add(blk.g)
    ;(padre || escena).add(gExt)
    return gExt
  }

  // ---------------------------------------------------------------- 2 · MARCA
  if (marca) {
    plantar(marca, DONDE.marca[0], DONDE.marca[1], DONDE.marca[2])
    entra(marca.g, tl, 5, { desde: 'frente', dist: 5, dur: 1.7 })
    marca.escribir(tl, 5.4, 1.25)
    marca.borrar(tl, 9.4)
    sale(marca.g, tl, 9.6, { hacia: 'arriba', dist: 5, dur: 1.0 })
    uso.marca = true
  }

  // ---------------------------------------------------------------- 3 · PROMESA
  if (promesa) {
    plantar(promesa, DONDE.promesa[0], DONDE.promesa[1], DONDE.promesa[2])
    entra(promesa.g, tl, 11, { desde: 'izq', dist: 5.5, dur: 1.6 })
    promesa.escribir(tl, 11.4, 0.92)
    promesa.borrar(tl, 15.4)
    sale(promesa.g, tl, 15.6, { hacia: 'der', dist: 6, dur: 1.1 })
    uso.claim = true
    uso.claimRecortado = promesa.recortado
  }

  // ---------------------------------------------------------------- 4 · PRUEBA
  // ENTRA POR EL EJE Y ATRAVIESA LOS ANILLOS. Se planta muy cerca del centro (0.20) por las dos
  // razones a la vez: dura mas en cuadro, y ademas queda literalmente dentro del sistema, que es lo
  // que hace que la pagina del cliente se lea como el CONTENIDO de la plataforma y no como un cartel.
  if (prueba) {
    plantar(prueba, DONDE.prueba[0], DONDE.prueba[1], DONDE.prueba[2], pagina)
    entra(prueba.g, tl, 17, { desde: 'fondo', dist: 6, dur: 2.2 })
    prueba.escribir(tl, 17.2, 1.2)
    prueba.recorrer(tl, 18, 6.0, 0.92)
    sale(prueba.g, tl, 23.6, { hacia: 'frente', dist: 5.5, dur: 1.3 })
    respiraciones.push(respirar(prueba.g, { amp: 0.08, giro: 0.02, fase: 1.7 }))
    uso.pagina = prueba.fuente
  }

  // ---------------------------------------------------------------- 5 · RAZONES
  cifras.forEach((c, i) => {
    const t0 = 26 + i * 1.9
    const s = i % 2 === 0 ? 1 : -1
    plantar(c, t0 + 0.8, DONDE.cifra[1], s * 1.05)
    entra(c.g, tl, t0, { desde: 'fondo', dist: 4, dur: 1.2 })
    c.escribir(tl, t0 + 0.25, 0.7)
    sale(c.g, tl, t0 + 2.0, { hacia: s > 0 ? 'arriba' : 'abajo', dist: 4.5, dur: 0.9 })
  })
  uso.cifras = cifras.length

  frases.forEach((f, i) => {
    const t0 = 26.6 + i * 2.5
    plantar(f, t0 + 0.8, DONDE.frase[1], DONDE.frase[2])
    entra(f.g, tl, t0, { desde: 'abajo', dist: 4, dur: 1.3 })
    f.escribir(tl, t0 + 0.35, 0.78)
    f.borrar(tl, t0 + 2.1)
    sale(f.g, tl, t0 + 2.3, { hacia: 'abajo', dist: 4.5, dur: 0.9 })
  })
  uso.frases = frases.length

  // ---------------------------------------------------------------- 6 · PEDIDO
  //
  // LOS ANILLOS SE ALINEAN. Durante treinta beats cada uno giro por su cuenta; en el ultimo tiempo
  // todos van a la misma inclinacion y el sistema se lee como una sola forma. Es la unica resolucion
  // visual de la pieza y por eso esta guardada hasta el final.
  let latido = null
  if (pedido) {
    plantar(pedido, DONDE.pedido[0], DONDE.pedido[1], DONDE.pedido[2])
    entra(pedido.g, tl, 32, { desde: 'fondo', dist: 4.5, dur: 1.8 })
    pedido.escribir(tl, 32.4, 0.88)
    latido = pedido.latir(0.03)
    uso.cta = pedido.tieneCta
    anillos.forEach((a, i) => {
      tl.to(a.g.rotation, { x: 0.16, z: 0, duration: b(2.8), ease: E.frena(2.2) }, b(31.4 + i * 0.09))
    })
    tl.to(nucleoLuz.scale, { x: 1.9, y: 1.9, z: 1.9, duration: b(2.8), ease: E.frena(2.4) }, b(31.4))
    tl.to(ctx.bloom, { strength: (ctx.bloom.strength || 0.5) * 1.9, duration: b(2.8), ease: E.frena(2) }, b(31.4))
  }

  // ---------------------------------------------------------------- lo continuo
  const alSeek = juntar(vuelo.alSeek, latido, (t) => {
    uDomo.uT.value = t
    for (const a of anillos) {
      // SE ASIGNA SOBRE UNA BASE GUARDADA, no se suma. Sumar parecia lo correcto —es lo que documenta
      // `respirar`— y aca es un defecto, porque las dos situaciones no son la misma:
      //
      //   `respirar` suma un OFFSET a una propiedad que la linea de tiempo vuelve a escribir en cada
      //   seek. El tween restablece el valor, la suma lo desplaza, y no se acumula nada.
      //
      //   Aca NO hay tween sobre `rotation.y` —los del pedido son sobre `x` y `z`—, asi que nadie lo
      //   restablece: cada llamada sumaba encima de la anterior. Con cuatro submuestras de obturador
      //   por cuadro y 594 cuadros, los anillos giraban varias veces mas rapido de lo escrito, y la
      //   velocidad dependia de cuantas veces se hubiera llamado a `alSeek` — o sea que el motor
      //   dejaba de ser determinista.
      //
      // La regla, entonces, no es "sumar siempre" sino: SUMAR si la linea de tiempo escribe esa misma
      // propiedad, ASIGNAR sobre una base si no la escribe nadie. Lo caza `boveda-check`.
      a.g.rotation.y = a.y0 + t * a.v
      const ang = t * a.v * 1.7 + a.fase
      a.nodo.position.set(Math.cos(ang) * a.r, Math.sin(ang) * a.r, 0)
    }
    // El nucleo late al doble de la velocidad de los anillos: es el pulso de la pieza.
    const p = 1 + Math.sin(t * 2.2) * 0.07
    jaula.scale.setScalar(p)
    jaula.rotation.y = -t * 0.09
    motas.rotation.y = t * 0.02
  }, ...respiraciones)

  return { dur: b(meta.beats), alSeek, uso }
}
