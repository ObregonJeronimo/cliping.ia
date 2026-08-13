// PLANTILLA "seda" — una superficie de tela iridiscente que ondula y llena el cuadro.
//
// EL GESTO
// Una sola superficie grande, que ocupa casi toda la pantalla, ondulando muy despacio. No es agua
// —`marea` ya es eso, y es opaca y oscura— sino TELA: fina, translucida, con una pelicula que le tiñe
// los pliegues segun como caiga la luz. El texto se apoya delante y la tela pasa por detras.
//
// Es la pieza mas cara de producir de todo el catalogo y la que menos objetos tiene, y esas dos cosas
// van juntas: cuando hay un solo elemento, todo depende de que ese elemento este bien hecho. Una tela
// con cuatro pliegues y un material barato se ve como un mantel; la misma tela con la ondulacion bien
// resuelta y vidrio iridiscente encima se ve como una pieza de marca.
//
// DE DONDE SALE LA ONDULACION, que es la unica decision tecnica del archivo:
//
// Tres senos cruzados sobre los ~12000 vertices de un plano segmentado, evaluados en `alSeek`. Es caro
// —12000 vertices por submuestra de obturador, cuatro por cuadro— y es el unico sitio del motor donde
// vale la pena: la ondulacion ES la plantilla. Las normales se recalculan ANALITICAMENTE, con las
// derivadas de los mismos senos, y no con `computeVertexNormals()`: esa funcion recorre las caras una
// por una y a este tamaño cuesta mas que todo lo demas junto.
//
// LOS SEIS TIEMPOS (beats sobre 38)
//   0   ESPACIO   la tela sola, ondulando. El iris le corre por los pliegues.
//   5   MARCA     el nombre se apoya delante; la tela se aquieta un poco para dejarlo leer.
//   12  PROMESA   la ondulacion se hace mas larga y el claim ocupa el centro.
//   18  PRUEBA    la tela se abre en el medio y la pagina del cliente aparece en el hueco.
//   26  RAZONES   cada cifra llega con una onda que la cruza.
//   32  PEDIDO    la tela se calma casi del todo y el CTA queda al frente.

import { THREE, campoDegradado, iridiscente, luz, iluminar } from '../nucleo.js'
import { entra, sale, juntar, anchoADistancia } from '../movimiento.js'
import { bloqueMarca, bloquePromesa, bloquePrueba, bloquesCifra, bloquesFrase, bloquePedido } from '../bloques.js'
import { colorDePeso, grisDePeso, aclarar } from '../recetas.js'
import { LOOK, nivel, E, b } from '../../demo/kit.js'

export const meta = {
  id: 'seda',
  nombre: 'Seda',
  familia: 'superficie',
  necesita: ['nada'],
  beats: 38,
  tiempos: { espacio: 0, marca: 5, promesa: 12, prueba: 18, razones: 26, pedido: 32 },
  pitch: 'Una tela iridiscente que ondula y llena el cuadro. Contenida y muy trabajada: de marca premium.',
}

export function build(ctx) {
  const { escena, pagina, camara, tl, mundoW, mundoH, distBase } = ctx
  const uso = {}

  const R = ctx.recetas || { velocidad: 1, capas: 3, dureza: 0.75, margen: 0.88, cifras: 3, frases: 2,
    acentoMasa: false, vacio: 0.5, movimientos: 4, paleta: [], medido: false }
  uso.retrato = !!R.medido
  const medio = (v) => 1 + (v - 1) * 0.5

  // Luz fuerte y rasante. Una tela se lee por sus pliegues, y un pliegue solo existe si hay una fuente
  // lo bastante direccional como para que una cara quede iluminada y la de al lado no.
  iluminar(escena, { key: 2.35, relleno: 0.45 })
  if (ctx.bloom) ctx.bloom.strength = Math.max(ctx.bloom.strength || 0.5, 0.58)

  const Z_CAM = distBase * 0.88
  const DERIVA = 0.14
  const RECORRIDO = 1.7 * medio(R.velocidad)
  const est = { k: 0 }
  tl.fromTo(est, { k: 0 }, { k: 1, duration: b(meta.beats), ease: 'none' }, 0)
  const UTIL = anchoADistancia(mundoW, distBase, Z_CAM, DERIVA)

  // ---------------------------------------------------------------- el campo, detras de la tela
  //
  // La tela es TRANSLUCIDA, asi que lo que se ve a traves de ella importa tanto como ella: sin un campo
  // detras, la transmision devuelve el gris del domo y el material se lee como plastico esmerilado.
  const CROMA = colorDePeso(R, LOOK.acento, 0.18)
  const uCampo = campoDegradado(escena, {
    camara,
    colores: [nivel(0.06), aclarar(CROMA, 1.25), grisDePeso(R, nivel(0.20)), CROMA],
    vel: 0.038 * medio(R.velocidad),
    foco: 1.24,
    vineta: 0.22,
  })

  // ---------------------------------------------------------------- la tela
  const ANCHO_T = UTIL * 2.2
  const ALTO_T = mundoH * 1.9
  const SEGX = 110, SEGY = 90
  const geo = new THREE.PlaneGeometry(ANCHO_T, ALTO_T, SEGX, SEGY)
  const pos = geo.attributes.position
  const nor = geo.attributes.normal
  const tela = new THREE.Mesh(geo, iridiscente(nivel(0.03), {
    rug: 0.16, trans: 0.72, grosor: 1.1, iris: 1.0, ior: 1.36, rango: [200, 560],
  }))
  tela.material.side = THREE.DoubleSide
  tela.position.z = -1.6
  escena.add(tela)

  // Las coordenadas de reposo se guardan una vez: `alSeek` las necesita en cada submuestra y leerlas
  // del atributo ya desplazado acumularia el desplazamiento sobre si mismo — la misma trampa que
  // `movimiento.js:respirar` documenta, en otra forma.
  const X0 = new Float32Array(pos.count), Y0 = new Float32Array(pos.count)
  for (let i = 0; i < pos.count; i++) { X0[i] = pos.getX(i); Y0[i] = pos.getY(i) }

  // AMPLITUD Y CALMA. `amp` es cuanto ondula y `calma` un factor que la pieza baja en MARCA y en PEDIDO
  // para que el texto se pueda leer: una tela que ondula fuerte detras de un renglon lo vuelve ilegible
  // aunque el contraste sea correcto, porque el ojo sigue el movimiento.
  const AMP = (0.55 + 0.55 * (1 - R.vacio)) * medio(R.velocidad)
  const est2 = { calma: 1 }

  // ---------------------------------------------------------------- los bloques
  const CAJA = UTIL * R.margen * 0.90
  const marca = bloqueMarca({ alto: mundoH * 0.115, anchoMax: CAJA, margen: R.margen })
  const promesa = bloquePromesa({ alto: mundoH * 0.048, anchoMax: CAJA, cama: false, maxLineas: 3, margen: R.margen })
  const prueba = bloquePrueba(ctx, { ancho: UTIL * 0.54, ar: 1.5 })
  const cifras = bloquesCifra(Math.min(3, R.cifras), { alto: mundoH * 0.125, anchoMax: CAJA * 0.7, margen: R.margen })
  const frases = bloquesFrase(R.frases, { alto: mundoH * 0.030, anchoMax: CAJA * 0.9, cama: false, margen: R.margen })
  const pedido = bloquePedido({ alto: mundoH * 0.030, anchoMax: CAJA * 0.62, margen: R.margen })

  // El texto va DELANTE de la tela, no detras. Es al reves que en `aurora` y es a proposito: alli el
  // vidrio es una lente y deformar el texto es el gesto; aca la tela es opaca a medias y el texto
  // detras se perderia. Lo que se busca es que la tela pase POR DETRAS del renglon.
  const poner = (blk, y, padre) => {
    blk.g.position.set(0, y * mundoH, distBase * 0.16)
    ;(padre || escena).add(blk.g)
    return blk.g
  }

  const calmar = (t0, a, dur) => tl.to(est2, { calma: a, duration: b(dur), ease: E.vaiven(2) }, b(t0))

  // ---------------------------------------------------------------- 2 · MARCA
  if (marca) {
    poner(marca, 0.03)
    calmar(4.4, 0.45, 2.0)
    entra(marca.g, tl, 5, { desde: 'abajo', dist: 1.1, dur: 2.1, ease: E.frena(2.5) })
    marca.escribir(tl, 5.5, 1.7)
    marca.borrar(tl, 9.8)
    sale(marca.g, tl, 10.0, { hacia: 'arriba', dist: 1.1, dur: 1.4 })
    calmar(10.2, 1.0, 2.0)
    uso.marca = true
  }

  // ---------------------------------------------------------------- 3 · PROMESA
  if (promesa) {
    poner(promesa, -0.02)
    calmar(11.4, 0.40, 2.0)
    entra(promesa.g, tl, 12, { desde: 'abajo', dist: 1.0, dur: 2.0, ease: E.frena(2.6) })
    promesa.escribir(tl, 12.5, 1.4)
    promesa.borrar(tl, 16.4)
    sale(promesa.g, tl, 16.6, { hacia: 'arriba', dist: 1.0, dur: 1.3 })
    calmar(16.8, 1.0, 2.0)
    uso.claim = true
    uso.claimRecortado = promesa.recortado
  }

  // ---------------------------------------------------------------- 4 · PRUEBA
  //
  // La tela se aparta hacia atras en vez de abrirse: abrir un agujero en una malla ondulada pide mover
  // vertices por region y eso hace que el borde del hueco se vea recortado. Correrla en z resuelve lo
  // mismo —dejar ver la pagina— sin un solo vertice extra, y ademas da profundidad.
  if (prueba) {
    poner(prueba, 0, pagina)
    calmar(17.2, 0.30, 2.2)
    tl.to(tela.position, { z: -4.2, duration: b(2.6), ease: E.vaiven(2) }, b(17.2))
    entra(prueba.g, tl, 18, { desde: 'fondo', dist: 2.0, dur: 2.2, ease: E.frena(2.4) })
    prueba.escribir(tl, 18.4, 1.5)
    prueba.recorrer(tl, 19.4, 5.0, 0.9)
    sale(prueba.g, tl, 24.0, { hacia: 'fondo', dist: 2.0, dur: 1.4 })
    tl.to(tela.position, { z: -1.6, duration: b(2.4), ease: E.vaiven(2) }, b(24.2))
    calmar(24.4, 1.0, 2.0)
    uso.pagina = prueba.fuente
  }

  // ---------------------------------------------------------------- 5 · RAZONES
  cifras.forEach((c, i) => {
    const t0 = 26 + i * 2.0
    poner(c, 0.02)
    calmar(t0 - 0.4, 0.55, 1.2)
    entra(c.g, tl, t0, { desde: 'abajo', dist: 0.9, dur: 1.6, ease: E.frena(2.4) })
    c.escribir(tl, t0 + 0.35, 1.0)
    c.borrar(tl, t0 + 1.7)
    sale(c.g, tl, t0 + 1.9, { hacia: 'arriba', dist: 0.9, dur: 1.2 })
    calmar(t0 + 1.9, 1.0, 1.2)
  })
  uso.cifras = cifras.length

  frases.forEach((f, i) => {
    const t0 = 26.8 + i * 2.4
    poner(f, -0.30)
    entra(f.g, tl, t0, { desde: 'abajo', dist: 0.8, dur: 1.6, ease: E.frena(2.4) })
    f.escribir(tl, t0 + 0.4, 1.0)
    f.borrar(tl, t0 + 2.0)
    sale(f.g, tl, t0 + 2.2, { hacia: 'abajo', dist: 0.8, dur: 1.2 })
  })
  uso.frases = frases.length

  // ---------------------------------------------------------------- 6 · PEDIDO
  let latido = null
  if (pedido) {
    poner(pedido, 0)
    calmar(31.2, 0.22, 2.6)
    entra(pedido.g, tl, 32, { desde: 'fondo', dist: 1.5, dur: 2.0, ease: E.frena(2.6) })
    pedido.escribir(tl, 32.5, 1.2)
    latido = pedido.latir(0.020)
    uso.cta = pedido.tieneCta
    tl.to(ctx.bloom, { strength: (ctx.bloom.strength || 0.58) * 1.3, duration: b(2.6), ease: E.frena(2) }, b(32))
  }

  // ---------------------------------------------------------------- lo continuo: la ondulacion
  //
  // NORMALES ANALITICAS, no `computeVertexNormals()`. Esa funcion recorre las 19800 caras del plano
  // sumando normales por vertice, y a cuatro submuestras de obturador por cuadro cuesta mas que todo el
  // resto de la pieza junta. Las derivadas parciales de tres senos son seis multiplicaciones por
  // vertice y dan el mismo resultado exacto — no una aproximacion.
  //
  //   z  = A·sin(ax + by + t) + B·sin(cx - dy + t) + C·sin(ex + fy + t)
  //   dz/dx y dz/dy son los mismos cosenos, y la normal es normalize(-dz/dx, -dz/dy, 1).
  const alSeek = juntar(latido, (t) => {
    uCampo.uT.value = t
    const k = est.k
    camara.position.set(Math.sin(t * 0.12) * DERIVA, Math.sin(t * 0.091 + 1.4) * DERIVA * 0.7,
      Z_CAM + RECORRIDO * 0.5 - RECORRIDO * k)
    camara.rotation.set(0, 0, Math.sin(t * 0.065) * 0.004)

    const A = AMP * est2.calma, B = A * 0.62, C = A * 0.24
    // Frecuencias inconmensurables entre si: la tela nunca vuelve a la misma forma.
    const a = 0.44, bb = 0.21, c = 0.29, d = 0.53, e = 0.83, f = 0.67
    const w1 = t * 0.55, w2 = t * 0.37, w3 = t * 0.79
    for (let i = 0; i < pos.count; i++) {
      const x = X0[i], y = Y0[i]
      const s1 = a * x + bb * y + w1
      const s2 = c * x - d * y + w2
      const s3 = e * x + f * y + w3
      pos.setZ(i, A * Math.sin(s1) + B * Math.sin(s2) + C * Math.sin(s3))
      const dzdx = A * a * Math.cos(s1) + B * c * Math.cos(s2) + C * e * Math.cos(s3)
      const dzdy = A * bb * Math.cos(s1) - B * d * Math.cos(s2) + C * f * Math.cos(s3)
      const inv = 1 / Math.sqrt(dzdx * dzdx + dzdy * dzdy + 1)
      nor.setXYZ(i, -dzdx * inv, -dzdy * inv, inv)
    }
    pos.needsUpdate = true
    nor.needsUpdate = true
  })

  return { dur: b(meta.beats), alSeek, uso }
}
