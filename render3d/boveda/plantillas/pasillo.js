// PLANTILLA "pasillo" — la camara atraviesa una sucesion de arcos de luz.
//
// EL GESTO
// Un tunel de arcos que se abren uno tras otro. Es el vuelo mas directo del genero y el que mejor
// sostiene una marca con nombre corto: cada arco que se cruza funciona como un latido, y el nombre cae
// justo cuando la camara pasa uno.
//
// LO QUE LO SEPARA DE `atrio`, que tambien es un avance frontal: aca el espacio es RITMICO. En `atrio`
// las columnas pasan de largo por los costados y la profundidad se lee como continua; aca los arcos se
// cruzan de a uno y marcan compas. Un mismo vuelo con dos espacios distintos da dos piezas distintas —
// y esa es exactamente la apuesta de la boveda.
//
// LOS SEIS TIEMPOS (beats sobre 38)
//   0   ESPACIO   los arcos abriendose, el polvo entrando por los costados. Nada de texto.
//   5   MARCA     el nombre llega desde el fondo, encuadrado por el arco que la camara esta cruzando.
//   11  PROMESA   el claim entra desde abajo y sale hacia arriba, como si el arco lo levantara.
//   17  PRUEBA    la pagina llega de frente y la camara la esquiva por un costado.
//   25  RAZONES   las cifras entran por los costados, apoyadas contra el borde de un arco.
//   32  PEDIDO    los arcos se abren mas y el CTA llega por el eje, latiendo.

import { THREE, vidrio, metal, luz, barra, iluminar, domo, polvo } from '../nucleo.js'
import { vueloAvance, entra, sale, paralaje, respirar, juntar, anchoConDeriva } from '../movimiento.js'
import { bloqueMarca, bloquePromesa, bloquePrueba, bloquesCifra, bloquesFrase, bloquePedido } from '../bloques.js'
import { LOOK, nivel, E, b } from '../../demo/kit.js'

export const meta = {
  id: 'pasillo',
  nombre: 'Pasillo de arcos',
  familia: 'arquitectura',
  necesita: ['nada'],
  beats: 38,
  tiempos: { espacio: 0, marca: 5, promesa: 11, prueba: 17, razones: 25, pedido: 32 },
  pitch: 'Túnel de arcos de luz que se abren uno tras otro. Rítmico, ceremonial, de marca corta.',
}

const SEP = 6.2

export function build(ctx) {
  const { escena, pagina, camara, tl, mundoW, mundoH, distBase } = ctx
  const uso = {}
  const respiraciones = []

  iluminar(escena, { key: 0.9, relleno: 0.65 })
  const uDomo = domo(escena, { fuerza: 0.30 })
  const motas = polvo(escena, 1400, 30)

  const DERIVA = 0.42
  const vuelo = vueloAvance(camara, tl, {
    distBase, beats: meta.beats, largo: SEP * 13, desde: 0.8, deriva: DERIVA,
  })
  const zEn = vuelo.zEn
  const UTIL = (k) => anchoConDeriva(mundoW, DERIVA, k)

  // ---------------------------------------------------------------- el espacio: los arcos
  //
  // Un arco es un toro aplastado y CORTADO: `thetaLength` menor que 2π deja la parte de abajo abierta,
  // que es lo que lo vuelve arco y no aro. El canto interior va en emisivo puro porque es lo unico que
  // el bloom convierte en luz — y sin ese halo, un tunel de arcos se ve como un tunel de tuberias.
  const R = mundoW * 0.82
  const matArco = metal(nivel(0.16), 0.30)
  const matBorde = luz(LOOK.acento, 1.15)
  const arco = (esc) => {
    const g = new THREE.Group()
    const t = new THREE.Mesh(new THREE.TorusGeometry(R * esc, R * esc * 0.055, 10, 64, Math.PI * 1.62), matArco)
    t.rotation.z = -Math.PI * 0.19
    g.add(t)
    const l = new THREE.Mesh(new THREE.TorusGeometry(R * esc * 0.94, R * esc * 0.012, 8, 64, Math.PI * 1.62), matBorde)
    l.rotation.z = -Math.PI * 0.19
    g.add(l)
    return g
  }
  const cerca = new THREE.Group(), lejos = new THREE.Group()
  escena.add(cerca); escena.add(lejos)
  const Z_TOPE = distBase * 0.8
  for (let i = 0; i < 15; i++) {
    const a = arco(1 + (i % 3) * 0.04)
    a.position.z = Z_TOPE - i * SEP
    cerca.add(a)
  }
  // La capa lejana son arcos MAS GRANDES y mas separados. Al ir mas lento y ser mayores, el ojo los lee
  // como el mismo pasillo continuando — no como una segunda fila de objetos.
  for (let i = 0; i < 10; i++) {
    const a = arco(2.3)
    a.position.set(0, -1.5, Z_TOPE - i * SEP * 2.4 - 30)
    lejos.add(a)
  }

  // Dos rieles de vidrio a los costados, al ras del piso: la unica linea continua de la pieza. Sin algo
  // continuo, un espacio hecho solo de repeticiones no dice a que velocidad se avanza.
  for (const s of [-1, 1]) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 300), vidrio(LOOK.acento2 || LOOK.acento, { trans: 0.55, rug: 0.08 }))
    r.position.set(s * R * 0.74, -mundoH * 0.44, -110)
    escena.add(r)
  }
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(R * 4, 400), metal(nivel(0.06), 0.26))
  piso.rotation.x = -Math.PI / 2
  piso.position.set(0, -mundoH * 0.46, -100)
  escena.add(piso)

  // ---------------------------------------------------------------- los bloques
  const marca = bloqueMarca({ alto: 1.4, anchoMax: UTIL(0.9) * 0.88 })
  const promesa = bloquePromesa({ alto: 0.56, anchoMax: UTIL(0.95) * 0.86 })
  const prueba = bloquePrueba(ctx, { ancho: mundoW * 0.52, ar: 1.6 })
  const cifras = bloquesCifra(3, { alto: 0.85, anchoMax: UTIL(0.8) * 0.44 })
  const frases = bloquesFrase(2, { alto: 0.30, anchoMax: UTIL(0.85) * 0.80 })
  const pedido = bloquePedido({ alto: 0.34, anchoMax: UTIL(0.85) * 0.62 })

  // ---------------------------------------------------------------- 2 · MARCA
  // Llega desde el fondo por el eje: el arco que la camara esta cruzando la encuadra sola.
  if (marca) {
    marca.g.position.set(0, 0.3, zEn(6.5, distBase * 0.9))
    escena.add(marca.g)
    entra(marca.g, tl, 5, { desde: 'fondo', dist: 8, dur: 2.0 })
    marca.escribir(tl, 5.5, 1.4)
    marca.borrar(tl, 9.4)
    sale(marca.g, tl, 9.6, { hacia: 'frente', dist: 5, dur: 1.0 })
    uso.marca = true
  }

  // ---------------------------------------------------------------- 3 · PROMESA
  if (promesa) {
    promesa.g.position.set(0, 0, zEn(12.4, distBase * 0.95))
    escena.add(promesa.g)
    entra(promesa.g, tl, 11, { desde: 'abajo', dist: 6, dur: 1.6 })
    promesa.escribir(tl, 11.4, 0.95)
    promesa.borrar(tl, 15.4)
    sale(promesa.g, tl, 15.6, { hacia: 'arriba', dist: 6.5, dur: 1.1 })
    uso.claim = true
    uso.claimRecortado = promesa.recortado
  }

  // ---------------------------------------------------------------- 4 · PRUEBA
  // Llega de frente y la camara la ESQUIVA: la pagina se corre a un costado mientras la camara avanza.
  // Es la unica maniobra de la pieza que no es simetrica, y por eso es la que se recuerda.
  if (prueba) {
    prueba.g.position.set(0, 0, zEn(19.4, distBase * 1.05))
    pagina.add(prueba.g)
    entra(prueba.g, tl, 17, { desde: 'fondo', dist: 9, dur: 2.2 })
    prueba.escribir(tl, 17.3, 1.2)
    prueba.recorrer(tl, 18, 5.8, 0.92)
    tl.to(prueba.g.position, { x: -mundoW * 0.42, duration: b(4.2), ease: E.frena(2) }, b(20.4))
    tl.to(prueba.g.rotation, { y: 0.55, duration: b(4.2), ease: E.frena(2) }, b(20.4))
    sale(prueba.g, tl, 23.4, { hacia: 'izq', dist: 7, dur: 1.2 })
    respiraciones.push(respirar(prueba.g, { amp: 0.11, giro: 0.03, fase: 2.2 }))
    uso.pagina = prueba.fuente
  }

  // ---------------------------------------------------------------- 5 · RAZONES
  cifras.forEach((c, i) => {
    const s = i % 2 === 0 ? -1 : 1
    const t0 = 25 + i * 2.2
    c.g.position.set(s * R * 0.30, 0.7 - i * 0.55, zEn(t0 + 0.9, distBase * 0.92))
    c.g.rotation.y = s * 0.30
    escena.add(c.g)
    entra(c.g, tl, t0, { desde: s < 0 ? 'izq' : 'der', dist: 5, dur: 1.3 })
    c.escribir(tl, t0 + 0.3, 0.75)
    sale(c.g, tl, t0 + 2.2, { hacia: s < 0 ? 'izq' : 'der', dist: 5.5, dur: 1.0 })
  })
  uso.cifras = cifras.length

  frases.forEach((f, i) => {
    const t0 = 25.6 + i * 2.7
    f.g.position.set(0, -1.9, zEn(t0 + 1.0, distBase * 0.86))
    escena.add(f.g)
    entra(f.g, tl, t0, { desde: 'abajo', dist: 4.2, dur: 1.4 })
    f.escribir(tl, t0 + 0.4, 0.85)
    f.borrar(tl, t0 + 2.3)
    sale(f.g, tl, t0 + 2.5, { hacia: 'abajo', dist: 5, dur: 1.0 })
  })
  uso.frases = frases.length

  // ---------------------------------------------------------------- 6 · PEDIDO
  let latido = null
  if (pedido) {
    pedido.g.position.set(0, 0.1, zEn(meta.beats - 1.0, distBase * 0.8))
    escena.add(pedido.g)
    entra(pedido.g, tl, 32, { desde: 'fondo', dist: 6.5, dur: 2.0 })
    pedido.escribir(tl, 32.4, 0.9)
    latido = pedido.latir(0.034)
    uso.cta = pedido.tieneCta
    tl.to(ctx.bloom, { strength: (ctx.bloom.strength || 0.5) * 1.8, duration: b(2.4), ease: E.frena(2) }, b(32))
  }

  // ---------------------------------------------------------------- lo continuo
  const capas = paralaje([
    { grupo: cerca, vel: 0, largo: SEP * 15 },
    { grupo: lejos, vel: 1.1, largo: SEP * 2.4 * 10, z0: 0 },
  ])
  const alSeek = juntar(vuelo.alSeek, capas, latido, (t) => {
    uDomo.uT.value = t
    motas.position.z = camara.position.z
    motas.rotation.z = t * 0.03
  }, ...respiraciones)

  return { dur: b(meta.beats), alSeek, uso }
}
