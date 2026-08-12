// PLANTILLA "monolito" — un solo objeto en el centro y la camara girando alrededor.
//
// EL GESTO
// Al reves que todas las demas: aca no hay espacio, hay OBJETO. Un prisma alto de vidrio oscuro en el
// medio de la nada, girando sobre su eje, y la camara orbitandolo mientras baja. Los bloques de texto
// van montados SOBRE SUS CARAS, asi que cada tiempo aparece cuando la vuelta trae la cara que le toca.
//
// Es la plantilla de producto unico: una app, un lanzamiento, una marca con una sola cosa que decir.
// Su fuerza es la misma que su limite — todo pasa en un metro cuadrado, asi que si la marca tiene
// mucho que contar, esta no es.
//
// EL OBJETO GIRA Y LA CAMARA TAMBIEN, en el mismo sentido pero a distinta velocidad. Es lo que hace
// que las caras desfilen mas rapido que la orbita sola: cuatro caras y una vuelta de camara alcanzan
// para seis tiempos porque el monolito ayuda. Con el objeto quieto habria que dar mas vueltas, y mas
// vueltas es volver a ver lo mismo.
//
// LOS SEIS TIEMPOS (beats sobre 34)
//   0   ESPACIO   el monolito girando en el vacio, el reflejo del piso, el polvo. Nada de texto.
//   4   MARCA     la cara frontal llega y el nombre se planta sobre ella.
//   9   PROMESA   media vuelta despues, el claim ocupa la cara siguiente.
//   15  PRUEBA    la pagina se despega de una cara y flota delante del monolito.
//   22  RAZONES   las cifras salen de los cantos, una por arista.
//   28  PEDIDO    la orbita se cierra, el monolito se abre en luz y el CTA queda al frente.

import { THREE, vidrio, metal, luz, barra, iluminar, domo, polvo } from '../nucleo.js'
import { vueloOrbita, entra, sale, respirar, juntar } from '../movimiento.js'
import { bloqueMarca, bloquePromesa, bloquePrueba, bloquesCifra, bloquesFrase, bloquePedido } from '../bloques.js'
import { LOOK, nivel, E, b } from '../../demo/kit.js'

export const meta = {
  id: 'monolito',
  nombre: 'Monolito',
  familia: 'objeto',
  necesita: ['nada'],
  beats: 34,
  tiempos: { espacio: 0, marca: 4, promesa: 9, prueba: 15, razones: 22, pedido: 28 },
  pitch: 'Un prisma de vidrio girando en el vacío y la cámara orbitándolo. De producto único, de lanzamiento.',
}

export function build(ctx) {
  const { escena, pagina, camara, tl, mundoW, mundoH, distBase } = ctx
  const uso = {}
  const respiraciones = []

  iluminar(escena, { key: 1.35, relleno: 0.75 })
  const uDomo = domo(escena, { fuerza: 0.28 })
  const motas = polvo(escena, 1000, 22)

  // Vueltas bajas por la razon de siempre —la ventana de lectura— y ademas porque el monolito gira en
  // el mismo sentido: entre los dos ya desfilan las caras suficientes.
  const vuelo = vueloOrbita(camara, tl, {
    distBase, beats: meta.beats, radio0: 1.25, radio1: 0.78, vueltas: 0.40, alto0: 3.4, alto1: -0.2, miraY: 0.0,
  })
  const puntoEn = vuelo.puntoEn

  // ---------------------------------------------------------------- el espacio: el objeto
  const ANCHO = mundoW * 0.62
  const ALTO = mundoH * 1.35
  const gMono = new THREE.Group()
  escena.add(gMono)
  const cuerpo = new THREE.Mesh(new THREE.BoxGeometry(ANCHO, ALTO, ANCHO),
    vidrio(LOOK.acento, { rug: 0.045, trans: 0.78, grosor: 3.4, opacidad: 0.94 }))
  gMono.add(cuerpo)
  // UN NUCLEO EMISIVO ADENTRO. Es lo que convierte un prisma de vidrio en un objeto que vale la pena
  // rodear: sin algo que refractar, el vidrio se ve como plastico gris desde cualquier angulo.
  const nucleoLuz = new THREE.Mesh(new THREE.BoxGeometry(ANCHO * 0.24, ALTO * 0.86, ANCHO * 0.24),
    luz(LOOK.acento2 || LOOK.acento, 1.25))
  gMono.add(nucleoLuz)
  // Los cuatro cantos verticales en emisivo: dan la ARISTA, que es lo que se lee como volumen cuando el
  // objeto gira. Un prisma sin cantos marcados parece una silueta plana en cada instante.
  for (const [sx, sz] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.035, ALTO * 1.005, 0.035), luz(LOOK.acento, 1.5))
    c.position.set(sx * ANCHO / 2, 0, sz * ANCHO / 2)
    gMono.add(c)
  }
  const base = new THREE.Mesh(new THREE.CylinderGeometry(ANCHO * 1.5, ANCHO * 1.8, 0.3, 40), metal(nivel(0.10), 0.30))
  base.position.y = -ALTO / 2 - 0.15
  escena.add(base)
  const piso = new THREE.Mesh(new THREE.CircleGeometry(distBase * 3, 56), metal(nivel(0.05), 0.18))
  piso.rotation.x = -Math.PI / 2
  piso.position.y = -ALTO / 2 - 0.3
  escena.add(piso)
  // Anillos concentricos en el piso: son lo unico que da ESCALA a un objeto flotando en el vacio, y
  // ademas marcan el avance de la orbita mientras la camara baja.
  for (let i = 1; i <= 5; i++) {
    const a = new THREE.Mesh(new THREE.RingGeometry(ANCHO * (0.9 + i * 0.85), ANCHO * (0.92 + i * 0.85), 64),
      luz(LOOK.acento, 0.35 - i * 0.05))
    a.rotation.x = -Math.PI / 2
    a.position.y = -ALTO / 2 - 0.28
    escena.add(a)
  }

  // ---------------------------------------------------------------- los bloques
  const marca = bloqueMarca({ alto: 1.15, anchoMax: mundoW * 0.82 })
  const promesa = bloquePromesa({ alto: 0.48, anchoMax: mundoW * 0.80, maxLineas: 3 })
  const prueba = bloquePrueba(ctx, { ancho: mundoW * 0.46, ar: 1.5 })
  const cifras = bloquesCifra(3, { alto: 0.72, anchoMax: mundoW * 0.42 })
  const frases = bloquesFrase(2, { alto: 0.28, anchoMax: mundoW * 0.70 })
  const pedido = bloquePedido({ alto: 0.32, anchoMax: mundoW * 0.58 })

  // El patron de los dos grupos que documenta `vitral`: el externo lo planta `puntoEn` mirando a la
  // camara, y `entra` mueve el interno en coordenadas ya alineadas con el cuadro.
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
    plantar(marca, 5.4, 0.34, 0.35)
    entra(marca.g, tl, 4, { desde: 'fondo', dist: 4.5, dur: 1.6 })
    marca.escribir(tl, 4.4, 1.2)
    marca.borrar(tl, 7.8)
    sale(marca.g, tl, 8.0, { hacia: 'arriba', dist: 4.5, dur: 0.9 })
    uso.marca = true
  }

  // ---------------------------------------------------------------- 3 · PROMESA
  if (promesa) {
    plantar(promesa, 10.6, 0.36, 0.0)
    entra(promesa.g, tl, 9, { desde: 'izq', dist: 5, dur: 1.5 })
    promesa.escribir(tl, 9.4, 0.9)
    promesa.borrar(tl, 13.4)
    sale(promesa.g, tl, 13.6, { hacia: 'der', dist: 5.5, dur: 1.0 })
    uso.claim = true
    uso.claimRecortado = promesa.recortado
  }

  // ---------------------------------------------------------------- 4 · PRUEBA
  // SE DESPEGA DE UNA CARA. Se planta mas cerca del eje que el resto —0.26— porque tiene que durar
  // siete beats y en una orbita la duracion es una funcion de la distancia al eje.
  if (prueba) {
    plantar(prueba, 18.0, 0.26, 0.0, pagina)
    entra(prueba.g, tl, 15, { desde: 'fondo', dist: 5, dur: 2.0 })
    prueba.escribir(tl, 15.2, 1.1)
    prueba.recorrer(tl, 16, 5.4, 0.92)
    sale(prueba.g, tl, 20.8, { hacia: 'frente', dist: 5, dur: 1.2 })
    respiraciones.push(respirar(prueba.g, { amp: 0.08, giro: 0.02, fase: 1.2 }))
    uso.pagina = prueba.fuente
  }

  // ---------------------------------------------------------------- 5 · RAZONES
  cifras.forEach((c, i) => {
    const t0 = 22 + i * 1.9
    const s = i % 2 === 0 ? 1 : -1
    plantar(c, t0 + 0.8, 0.30, s * 1.1)
    entra(c.g, tl, t0, { desde: s > 0 ? 'arriba' : 'abajo', dist: 4, dur: 1.1 })
    c.escribir(tl, t0 + 0.25, 0.7)
    sale(c.g, tl, t0 + 2.0, { hacia: s > 0 ? 'arriba' : 'abajo', dist: 4.5, dur: 0.9 })
  })
  uso.cifras = cifras.length

  frases.forEach((f, i) => {
    const t0 = 22.6 + i * 2.4
    plantar(f, t0 + 0.8, 0.28, -1.55)
    entra(f.g, tl, t0, { desde: 'der', dist: 4.5, dur: 1.2 })
    f.escribir(tl, t0 + 0.35, 0.78)
    f.borrar(tl, t0 + 2.1)
    sale(f.g, tl, t0 + 2.3, { hacia: 'izq', dist: 5, dur: 0.9 })
  })
  uso.frases = frases.length

  // ---------------------------------------------------------------- 6 · PEDIDO
  //
  // EL MONOLITO SE ABRE EN LUZ: el nucleo emisivo crece hasta casi llenar el prisma. Es el unico gesto
  // del objeto en toda la pieza, y esta guardado para el final a proposito — un objeto que hace cosas
  // todo el tiempo no tiene con que rematar.
  let latido = null
  if (pedido) {
    plantar(pedido, meta.beats - 0.6, 0.24, 0.0)
    entra(pedido.g, tl, 28, { desde: 'fondo', dist: 4.5, dur: 1.7 })
    pedido.escribir(tl, 28.4, 0.85)
    latido = pedido.latir(0.032)
    uso.cta = pedido.tieneCta
    tl.to(nucleoLuz.scale, { x: 3.4, z: 3.4, duration: b(2.6), ease: E.frena(2.5) }, b(27.6))
    tl.to(ctx.bloom, { strength: (ctx.bloom.strength || 0.5) * 1.9, duration: b(2.6), ease: E.frena(2) }, b(27.6))
  }

  // ---------------------------------------------------------------- lo continuo
  const alSeek = juntar(vuelo.alSeek, latido, (t) => {
    uDomo.uT.value = t
    gMono.rotation.y = t * 0.16
    // Una inclinacion minima que oscila: un prisma perfectamente vertical girando se lee como un render
    // de catalogo. Dos grados de vaiven bastan para que se lea como filmado.
    gMono.rotation.z = Math.sin(t * 0.21) * 0.028
    motas.rotation.y = -t * 0.03
  }, ...respiraciones)

  return { dur: b(meta.beats), alSeek, uso }
}
