// PLANTILLA "deriva" — laminas de vidrio flotando sin orden, y la camara pasando entre ellas.
//
// EL GESTO
// Ni columnata ni anillo ni muro: NADA esta alineado. Cuarenta laminas finas, cada una en su angulo,
// derivando despacio en una niebla, y la camara abriendose paso. Es la mas "atmosferica" de la boveda
// y la que mejor le queda a una marca que no quiere verse corporativa — un estudio creativo, una
// marca de autor, un producto artesanal.
//
// LO QUE LA HACE DISTINTA DE `atrio`, que tambien avanza de frente: alli la regularidad es el efecto —
// una columna, otra columna, otra— y aca el efecto es que no hay dos iguales. Un espacio regular se
// lee como institucional; uno disperso, como hecho a mano. Mismo vuelo, dos marcas distintas.
//
// LA DERIVA DE CAMARA ES EL DOBLE que en el resto (0.95 contra 0.55) y eso es parte de la idea: la
// camara no viaja por un eje sino que serpentea. El precio se paga en el ancho util, que baja mucho —
// por eso los bloques de aca son mas angostos que en las otras plantillas y no es un descuido.
//
// LOS SEIS TIEMPOS (beats sobre 42)
//   0   ESPACIO   laminas pasando en todos los angulos, niebla, polvo. Nada de texto.
//   6   MARCA     el nombre llega desde el fondo entre dos laminas que lo enmarcan por casualidad.
//   13  PROMESA   el claim entra desde abajo y se va hacia arriba, como si flotara el tambien.
//   19  PRUEBA    la pagina entra como una lamina mas y se endereza al llegar al eje.
//   28  RAZONES   las cifras aparecen apoyadas contra laminas, a distintas alturas.
//   35  PEDIDO    las laminas se abren, la niebla baja y el CTA queda solo en el eje.

import { THREE, vidrio, metal, luz, iluminar, domo, polvo } from '../nucleo.js'
import { vueloAvance, entra, sale, paralaje, respirar, juntar, anchoConDeriva } from '../movimiento.js'
import { bloqueMarca, bloquePromesa, bloquePrueba, bloquesCifra, bloquesFrase, bloquePedido } from '../bloques.js'
import { LOOK, nivel, E, b } from '../../demo/kit.js'

export const meta = {
  id: 'deriva',
  nombre: 'Deriva de láminas',
  familia: 'atmosfera',
  necesita: ['nada'],
  beats: 42,
  tiempos: { espacio: 0, marca: 6, promesa: 13, prueba: 19, razones: 28, pedido: 35 },
  pitch: 'Láminas de vidrio flotando sin orden y la cámara serpenteando entre ellas. Atmosférico, de autor.',
}

export function build(ctx) {
  const { escena, pagina, camara, tl, mundoW, mundoH, distBase } = ctx
  const uso = {}
  const respiraciones = []

  // Key alta para una plantilla oscura, y no es una contradiccion: lo que la hace atmosferica es la
  // NIEBLA del domo, no la falta de luz. Con key 0.85 las laminas de vidrio oscuro quedaban en negro
  // plano y la pieza se veia como una pantalla apagada con un texto encima.
  iluminar(escena, { key: 1.30, relleno: 0.95 })
  const uDomo = domo(escena, { fuerza: 0.38 })
  const motas = polvo(escena, 1800, 26)

  const DERIVA = 0.95
  const LARGO = distBase * 4.6
  const vuelo = vueloAvance(camara, tl, {
    distBase, beats: meta.beats, largo: LARGO, desde: 0.9, deriva: DERIVA,
  })
  const zEn = vuelo.zEn
  const UTIL = (k) => anchoConDeriva(mundoW, DERIVA, k)

  // ---------------------------------------------------------------- el espacio: las laminas
  //
  // LA DISPERSION TIENE QUE SER DETERMINISTA. Con `Math.random` cada corrida daria otro dibujo y dos
  // renders de la misma pagina no se parecerian — que es exactamente lo que un cliente no espera de
  // "elegi esta plantilla". Semilla fija, propia de la plantilla.
  let sem = 771103
  const az = () => { sem = (sem * 1664525 + 1013904223) >>> 0; return sem / 4294967296 }

  const matVidrio = vidrio(LOOK.acento, { rug: 0.08, trans: 0.80, grosor: 2.0, opacidad: 0.88 })
  const matVidrio2 = vidrio(LOOK.acento2 || LOOK.acento, { rug: 0.14, trans: 0.70, grosor: 1.6, opacidad: 0.82 })
  const matMate = metal(nivel(0.30), 0.44)

  // TRES CAPAS, otra vez, y aca la del medio es la que trabaja. La de adelante son laminas grandes que
  // cruzan el cuadro en un beat —el "wipe" gratis que hace que un corte no se note— y la del fondo son
  // siluetas sin detalle que solo dan escala.
  const cerca = new THREE.Group(), medio = new THREE.Group(), lejos = new THREE.Group()
  escena.add(cerca); escena.add(medio); escena.add(lejos)

  const lamina = (w, h, mat) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.09), mat)
    m.rotation.set((az() - 0.5) * 0.5, (az() - 0.5) * 1.5, (az() - 0.5) * 0.6)
    return m
  }
  for (let i = 0; i < 46; i++) {
    const r = az()
    const m = lamina(mundoW * (0.5 + az() * 0.9), mundoH * (0.35 + az() * 0.7),
      r < 0.5 ? matVidrio : (r < 0.82 ? matVidrio2 : matMate))
    // Se evita el corredor central: una lamina en el eje se cruza de frente y tapa el cuadro entero.
    // No es una regla estetica sino de legibilidad — el corredor es donde van a caer todos los textos.
    const lado = az() < 0.5 ? -1 : 1
    m.position.set(lado * mundoW * (0.55 + az() * 1.1), (az() - 0.5) * mundoH * 1.5,
      distBase * 0.7 - az() * LARGO * 1.05)
    medio.add(m)
  }
  // LA CAPA CERCANA ES UN BARRIDO, NO UNA CORTINA — y en la primera version era una cortina.
  //
  // Diez laminas de 2.2 x 1.6 del mundo, a entre 0.15 y 0.5 de `distBase`, tapaban el cuadro entero de
  // forma permanente: la foto del beat 19 es una masa negra con un filo azul. Una lamina a esa
  // distancia ocupa varias veces la pantalla, asi que "de vez en cuando pasa una" se convirtio en
  // "siempre hay una encima".
  //
  // Cinco, mas chicas, mas lejos, y con el canto en emisivo: asi cuando cruzan se leen como un objeto
  // que pasa —que es el barrido gratis que se buscaba— en vez de como un fundido a negro.
  for (let i = 0; i < 5; i++) {
    const m = lamina(mundoW * 0.85, mundoH * 0.75, matVidrio2)
    // FUERA DEL CORREDOR CENTRAL, igual que la capa del medio y por una razon mas fuerte: una lamina a
    // 0.34 de `distBase` tapa varias pantallas, asi que si cae en el eje no oscurece el cuadro — lo
    // BORRA. En la foto del beat 39.9 el CTA no aparecia por esto, y un CTA tapado es la pieza entera
    // desperdiciada.
    const lado = az() < 0.5 ? -1 : 1
    m.position.set(lado * mundoW * (0.95 + az() * 0.9), (az() - 0.5) * mundoH * 1.8, distBase * (0.34 + az() * 0.22))
    const filo = new THREE.Mesh(new THREE.BoxGeometry(0.05, mundoH * 0.75, 0.11), luz(LOOK.acento2 || LOOK.acento, 1.5))
    filo.position.x = mundoW * 0.42
    m.add(filo)
    cerca.add(m)
  }
  for (let i = 0; i < 30; i++) {
    const m = lamina(mundoW * (1.6 + az() * 2), mundoH * (1.2 + az() * 1.5), matMate)
    m.position.set((az() - 0.5) * mundoW * 6, (az() - 0.5) * mundoH * 3, -LARGO * (0.5 + az() * 0.9))
    lejos.add(m)
  }

  // ---------------------------------------------------------------- los bloques
  const marca = bloqueMarca({ alto: 1.3, anchoMax: UTIL(0.9) * 0.92 })
  const promesa = bloquePromesa({ alto: 0.54, anchoMax: UTIL(0.95) * 0.90 })
  const prueba = bloquePrueba(ctx, { ancho: mundoW * 0.52, ar: 1.6 })
  const cifras = bloquesCifra(3, { alto: 0.80, anchoMax: UTIL(0.85) * 0.46 })
  const frases = bloquesFrase(2, { alto: 0.29, anchoMax: UTIL(0.85) * 0.82 })
  const pedido = bloquePedido({ alto: 0.33, anchoMax: UTIL(0.85) * 0.64 })

  // ---------------------------------------------------------------- 2 · MARCA
  if (marca) {
    marca.g.position.set(0, 0.4, zEn(7.8, distBase * 0.9))
    escena.add(marca.g)
    entra(marca.g, tl, 6, { desde: 'fondo', dist: 8, dur: 2.1 })
    marca.escribir(tl, 6.5, 1.4)
    marca.borrar(tl, 11.2)
    sale(marca.g, tl, 11.4, { hacia: 'izq', dist: 7, dur: 1.1 })
    respiraciones.push(respirar(marca.g, { amp: 0.06, giro: 0.02, fase: 0.3 }))
    uso.marca = true
  }

  // ---------------------------------------------------------------- 3 · PROMESA
  if (promesa) {
    promesa.g.position.set(0, 0, zEn(14.6, distBase * 0.95))
    escena.add(promesa.g)
    entra(promesa.g, tl, 13, { desde: 'abajo', dist: 6.5, dur: 1.7 })
    promesa.escribir(tl, 13.4, 1.0)
    promesa.borrar(tl, 17.6)
    sale(promesa.g, tl, 17.8, { hacia: 'arriba', dist: 7, dur: 1.2 })
    respiraciones.push(respirar(promesa.g, { amp: 0.05, giro: 0.012, fase: 2.7 }))
    uso.claim = true
    uso.claimRecortado = promesa.recortado
  }

  // ---------------------------------------------------------------- 4 · PRUEBA
  // ENTRA COMO UNA LAMINA MAS Y SE ENDEREZA. Es el gesto que define esta plantilla: la pagina no llega
  // como un cartel sino como un objeto que ya estaba flotando ahi y que se acomoda al pasar la camara.
  if (prueba) {
    prueba.g.position.set(0, 0, zEn(21.6, distBase * 1.0))
    prueba.g.rotation.set(0.18, 0.85, -0.12)
    pagina.add(prueba.g)
    entra(prueba.g, tl, 19, { desde: 'der', dist: 7, dur: 2.3 })
    prueba.escribir(tl, 19.3, 1.2)
    prueba.recorrer(tl, 20, 6.4, 0.92)
    tl.to(prueba.g.rotation, { x: 0, y: -0.22, z: 0, duration: b(4.6), ease: E.frena(2.4) }, b(20.2))
    sale(prueba.g, tl, 26.4, { hacia: 'izq', dist: 7.5, dur: 1.3 })
    respiraciones.push(respirar(prueba.g, { amp: 0.13, giro: 0.028, fase: 1.4 }))
    uso.pagina = prueba.fuente
  }

  // ---------------------------------------------------------------- 5 · RAZONES
  cifras.forEach((c, i) => {
    const s = i % 2 === 0 ? -1 : 1
    const t0 = 28 + i * 2.3
    c.g.position.set(s * mundoW * 0.26, 1.0 - i * 0.9, zEn(t0 + 1.0, distBase * 0.94))
    c.g.rotation.y = s * 0.26
    escena.add(c.g)
    entra(c.g, tl, t0, { desde: s < 0 ? 'izq' : 'der', dist: 5.5, dur: 1.4 })
    c.escribir(tl, t0 + 0.3, 0.78)
    sale(c.g, tl, t0 + 2.4, { hacia: 'fondo', dist: 5, dur: 1.1 })
    respiraciones.push(respirar(c.g, { amp: 0.05, giro: 0.02, fase: i * 1.9 }))
  })
  uso.cifras = cifras.length

  frases.forEach((f, i) => {
    const t0 = 28.8 + i * 2.9
    f.g.position.set(0, -1.85, zEn(t0 + 1.0, distBase * 0.88))
    escena.add(f.g)
    entra(f.g, tl, t0, { desde: 'abajo', dist: 4.5, dur: 1.4 })
    f.escribir(tl, t0 + 0.4, 0.85)
    f.borrar(tl, t0 + 2.4)
    sale(f.g, tl, t0 + 2.6, { hacia: 'abajo', dist: 5, dur: 1.0 })
  })
  uso.frases = frases.length

  // ---------------------------------------------------------------- 6 · PEDIDO
  //
  // LA NIEBLA BAJA. Es el unico cambio de atmosfera de toda la pieza y esta puesto justo donde hace
  // falta leer: una plantilla que se apoya en la niebla tiene que sacarla para el CTA, o el ultimo
  // bloque —el unico que el espectador tiene que poder tipear— compite con el efecto que la vendio.
  let latido = null
  if (pedido) {
    pedido.g.position.set(0, 0.1, zEn(meta.beats - 1.0, distBase * 0.8))
    escena.add(pedido.g)
    entra(pedido.g, tl, 35, { desde: 'fondo', dist: 6, dur: 2.1 })
    pedido.escribir(tl, 35.5, 0.9)
    latido = pedido.latir(0.033)
    uso.cta = pedido.tieneCta
    // `domo()` devuelve los UNIFORMS, asi que lo que se tuena es `uFuerza.value`. Tuenear `uDomo.fuerza`
    // compila, corre y no hace nada: crea una propiedad nueva en el objeto de uniforms y el shader
    // nunca la mira. Es la familia de defecto mas cara que tiene este motor — el codigo dice que pasa
    // algo y en el video no pasa.
    tl.to(uDomo.uFuerza, { value: 0.14, duration: b(2.4), ease: E.frena(2) }, b(34.6))
    tl.to(ctx.bloom, { strength: (ctx.bloom.strength || 0.5) * 1.6, duration: b(2.4), ease: E.frena(2) }, b(35))
  }

  // ---------------------------------------------------------------- lo continuo
  //
  // LAS LAMINAS GIRAN, CADA UNA A SU RITMO. Es lo que separa "flotando" de "colgadas": con las laminas
  // quietas, el mismo vuelo se lee como pasar por un deposito. Cada una tiene su velocidad y su fase,
  // sacadas del indice, asi que no hay dos sincronizadas y el conjunto nunca se percibe en bucle.
  const giratorias = medio.children.map((m, i) => ({ m, v: 0.012 + (i % 7) * 0.004, f: i * 1.37 }))
  const capas = paralaje([
    { grupo: cerca, vel: 2.4, largo: distBase * 1.6 },
    { grupo: lejos, vel: 0.35, largo: LARGO * 1.4 },
  ])
  const alSeek = juntar(vuelo.alSeek, capas, latido, (t) => {
    uDomo.uT.value = t
    for (const g of giratorias) {
      g.m.rotation.y += 0
      g.m.rotation.z = Math.sin(t * g.v * 6 + g.f) * 0.09
      g.m.position.y += 0
    }
    medio.rotation.z = Math.sin(t * 0.07) * 0.006
    motas.position.z = camara.position.z
    motas.rotation.y = t * 0.03
  }, ...respiraciones)

  return { dur: b(meta.beats), alSeek, uso }
}
