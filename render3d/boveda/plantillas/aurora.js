// PLANTILLA "aurora" — un campo de degradado que fluye y una lente de vidrio iridiscente encima.
//
// POR QUE EXISTE: ES LA CORRECCION DE UN ERROR DE LECTURA
//
// Cuando se pidieron plantillas "menos potentes", con la referencia de los videos que los estudios de
// motion hacen para marcas como Google o Gemini, yo entendi AUSTERAS y salieron `folio`, `halo`,
// `pliegue` y `hilo`: un objeto, un fondo plano, una linea. El veredicto sobre `hilo` fue "que es esa
// cagada", y era correcto — una linea azul sobre un gris plano no se ve sobria, se ve sin terminar.
//
// La referencia no es austera. Es CONTENIDA PERO DENSA:
//
//   contenida  la camara casi no se mueve, hay dos o tres elementos, no hay cortes duros, no hay
//              nada que grite. El ritmo es lento y la tipografia manda.
//   densa      la SUPERFICIE es rica: degradados que fluyen, vidrio que refracta y tiñe los bordes,
//              luz que se dobla, profundidad. Es donde se demuestra la habilidad.
//
// Lo que faltaba no era menos, era MEJOR TERMINADO. De ahi salieron `campoDegradado()` e
// `iridiscente()` en `nucleo.js`, y esta plantilla es la primera que los usa.
//
// LOS TRES ELEMENTOS, y no hay un cuarto:
//   1. EL CAMPO — cuatro manchas de color de la pagina orbitando y fundiendose. Es el 90% del cuadro.
//   2. LA LENTE — un disco de vidrio iridiscente que flota sobre el campo, lo refracta y le tiñe el
//      borde. Es lo que convierte un fondo bonito en un objeto.
//   3. EL TEXTO — que pasa POR DETRAS de la lente en cada transicion, y por eso se ve deformado un
//      instante antes de acomodarse. Ese instante es la pieza entera.
//
// LOS SEIS TIEMPOS (beats sobre 38)
//   0   ESPACIO   el campo fluyendo y la lente derivando. Nada de texto.
//   5   MARCA     el nombre cruza por detras de la lente y queda a un costado.
//   12  PROMESA   el claim entra desde abajo; la lente sube para no taparlo.
//   18  PRUEBA    la lente se corre y la pagina del cliente ocupa su lugar.
//   26  RAZONES   las cifras pasan por detras de la lente, de a una.
//   32  PEDIDO    la lente se centra detras del CTA y le hace de halo.

import { THREE, campoDegradado, iridiscente, luz, iluminar } from '../nucleo.js'
import { entra, sale, respirar, juntar, anchoADistancia } from '../movimiento.js'
import { bloqueMarca, bloquePromesa, bloquePrueba, bloquesCifra, bloquesFrase, bloquePedido } from '../bloques.js'
import { colorDePeso, grisDePeso, aclarar } from '../recetas.js'
import { LOOK, nivel, E, b } from '../../demo/kit.js'

export const meta = {
  id: 'aurora',
  nombre: 'Aurora',
  familia: 'superficie',
  necesita: ['nada'],
  beats: 38,
  tiempos: { espacio: 0, marca: 5, promesa: 12, prueba: 18, razones: 26, pedido: 32 },
  pitch: 'Un campo de degradado que fluye y una lente de vidrio iridiscente encima. Contenida y cara: de software y de marca.',
}

export function build(ctx) {
  const { escena, pagina, camara, tl, mundoW, mundoH, distBase } = ctx
  const uso = {}
  const respiraciones = []

  const R = ctx.recetas || { velocidad: 1, capas: 3, dureza: 0.75, margen: 0.88, cifras: 3, frases: 2,
    acentoMasa: false, vacio: 0.5, movimientos: 4, paleta: [], medido: false }
  uso.retrato = !!R.medido
  const medio = (v) => 1 + (v - 1) * 0.5

  // LUZ FUERTE Y DIRECCIONAL, y no es una contradiccion con el registro contenido: el vidrio
  // iridiscente NO SE VE sin una luz que lo atraviese. Un cristal iluminado parejo es una mancha gris;
  // lo que dibuja su forma son las caustics del borde y el tinte de la pelicula, y las dos necesitan
  // una fuente definida.
  iluminar(escena, { key: 2.10, relleno: 0.55 })

  // El bloom se deja alto — mas que en cualquier otra sobria. Aca hay una lente que concentra luz en su
  // borde, y ese borde florecido es exactamente lo que se lee como vidrio caro. Sin bloom, el mismo
  // material se ve como plastico.
  if (ctx.bloom) ctx.bloom.strength = Math.max(ctx.bloom.strength || 0.5, 0.62)

  const Z_CAM = distBase * 0.92
  const DERIVA = 0.16
  const RECORRIDO = 1.9 * medio(R.velocidad)
  const est = { k: 0 }
  tl.fromTo(est, { k: 0 }, { k: 1, duration: b(meta.beats), ease: 'none' }, 0)
  const UTIL = anchoADistancia(mundoW, distBase, Z_CAM, DERIVA)

  // ---------------------------------------------------------------- 1 · el campo
  //
  // LOS CUATRO COLORES SALEN DE LA PAGINA, y la eleccion de cuales importa mas que en ninguna otra
  // plantilla porque el campo es el 90% del cuadro:
  //
  //   - el mas claro va primero y ocupa mas superficie, porque el texto tiene que poder leerse encima;
  //   - el cromatico de mas peso, ACLARADO, es el que da el caracter;
  //   - un gris intermedio evita que las dos manchas de color se toquen y hagan un tercer color sucio;
  //   - y el cromatico otra vez, mas saturado y en una esquina, para que el campo tenga un foco.
  const CROMA = colorDePeso(R, LOOK.acento, 0.18)
  const uCampo = campoDegradado(escena, {
    camara,
    colores: [nivel(0.03), aclarar(CROMA, 1.35), grisDePeso(R, nivel(0.16)), CROMA],
    // La velocidad del campo sale de la energia medida, pero con la mitad del rango: un fondo que fluye
    // rapido deja de ser fondo.
    vel: 0.040 * medio(R.velocidad),
    foco: 1.28,
    vineta: 0.20,
  })

  // ---------------------------------------------------------------- 2 · la lente
  //
  // Un disco grueso de vidrio iridiscente. `CylinderGeometry` con muchos lados y no `SphereGeometry`
  // porque lo que se busca es un CANTO: una esfera refracta parejo y se lee como una gota, y un disco
  // tiene un borde donde la luz se concentra — que es lo que da el aro brillante.
  const RAD = UTIL * 0.40
  const gLente = new THREE.Group()
  escena.add(gLente)
  const lente = new THREE.Mesh(new THREE.CylinderGeometry(RAD, RAD, RAD * 0.22, 96, 1),
    iridiscente(nivel(0.02), { rug: 0.06, trans: 0.94, grosor: RAD * 0.9, iris: 1.0 }))
  // Acostada: el cilindro de three crece en Y y aca tiene que mirar a la camara.
  lente.rotation.x = Math.PI / 2
  gLente.add(lente)
  // Un aro emisivo finisimo en el canto. El vidrio ya concentra luz ahi, y esto la lleva por encima del
  // umbral del bloom: es la diferencia entre un borde brillante y un borde que FLORECE.
  const aro = new THREE.Mesh(new THREE.TorusGeometry(RAD * 0.995, RAD * 0.007, 8, 128), luz(aclarar(CROMA, 1.6), 1.2))
  aro.material.transparent = true
  aro.material.opacity = 0.55
  gLente.add(aro)
  gLente.position.set(UTIL * 0.16, mundoH * 0.10, distBase * 0.30)

  // ---------------------------------------------------------------- los bloques
  //
  // El texto va DETRAS de la lente en z, que es la decision que define la plantilla: al cruzar, el
  // vidrio lo deforma un instante. Por eso ademas no lleva cama — una cama opaca detras del texto
  // taparia el campo justo donde el campo es el sujeto.
  const CAJA = UTIL * R.margen * 0.92
  const marca = bloqueMarca({ alto: mundoH * 0.115, anchoMax: CAJA, margen: R.margen })
  const promesa = bloquePromesa({ alto: mundoH * 0.048, anchoMax: CAJA, cama: false, maxLineas: 3, margen: R.margen })
  const prueba = bloquePrueba(ctx, { ancho: UTIL * 0.56, ar: 1.5 })
  const cifras = bloquesCifra(Math.min(3, R.cifras), { alto: mundoH * 0.125, anchoMax: CAJA * 0.7, margen: R.margen })
  const frases = bloquesFrase(R.frases, { alto: mundoH * 0.030, anchoMax: CAJA * 0.9, cama: false, margen: R.margen })
  const pedido = bloquePedido({ alto: mundoH * 0.030, anchoMax: CAJA * 0.62, margen: R.margen })

  // Z NEGATIVO: detras de la lente, que esta en +0.30 de distBase. La diferencia son unas cinco
  // unidades, suficiente para que la refraccion sea visible sin que el texto se vuelva ilegible.
  const poner = (blk, x, y, padre) => {
    blk.g.position.set(x * UTIL, y * mundoH, -distBase * 0.06)
    ;(padre || escena).add(blk.g)
    return blk.g
  }

  // ---------------------------------------------------------------- 2 · MARCA
  // Cruza de izquierda a derecha por detras de la lente y se para a un costado. El cruce dura 1.9 beats
  // y la lente esta a 0.16 del ancho: el nombre pasa por el vidrio alrededor del beat 6.
  if (marca) {
    poner(marca, -0.10, 0.04)
    entra(marca.g, tl, 5, { desde: 'izq', dist: UTIL * 0.9, dur: 2.1, ease: E.frena(2.4) })
    marca.escribir(tl, 5.5, 1.6)
    marca.borrar(tl, 10.0)
    sale(marca.g, tl, 10.2, { hacia: 'der', dist: UTIL * 0.9, dur: 1.5 })
    uso.marca = true
  }

  // ---------------------------------------------------------------- 3 · PROMESA
  // La lente SUBE para no taparlo. Es la unica vez que el objeto le hace lugar al texto, y por eso se
  // percibe como que la pieza esta compuesta y no como que las cosas caen donde caen.
  if (promesa) {
    poner(promesa, 0, -0.06)
    tl.to(gLente.position, { y: mundoH * 0.30, x: UTIL * 0.26, duration: b(2.6), ease: E.vaiven(2) }, b(11.4))
    entra(promesa.g, tl, 12, { desde: 'abajo', dist: 1.2, dur: 2.0, ease: E.frena(2.6) })
    promesa.escribir(tl, 12.5, 1.3)
    promesa.borrar(tl, 16.4)
    sale(promesa.g, tl, 16.6, { hacia: 'arriba', dist: 1.2, dur: 1.3 })
    uso.claim = true
    uso.claimRecortado = promesa.recortado
  }

  // ---------------------------------------------------------------- 4 · PRUEBA
  // La lente se corre del todo y la pagina ocupa su lugar. La pagina vive en `ctx.pagina`, que se
  // dibuja despues del bloom y sin la profundidad de la escena: si la lente se quedara donde estaba, la
  // pagina se veria ENCIMA del vidrio y el efecto se rompe. Correrla no es composicion: es necesario.
  if (prueba) {
    poner(prueba, 0, 0, pagina)
    tl.to(gLente.position, { x: -UTIL * 0.62, y: -mundoH * 0.16, duration: b(2.8), ease: E.vaiven(2) }, b(17.2))
    entra(prueba.g, tl, 18, { desde: 'fondo', dist: 2.2, dur: 2.2, ease: E.frena(2.4) })
    prueba.escribir(tl, 18.4, 1.5)
    prueba.recorrer(tl, 19.4, 5.0, 0.9)
    sale(prueba.g, tl, 24.0, { hacia: 'fondo', dist: 2.2, dur: 1.4 })
    respiraciones.push(respirar(prueba.g, { amp: 0.05, giro: 0.012, fase: 1.4 }))
    uso.pagina = prueba.fuente
  }

  // ---------------------------------------------------------------- 5 · RAZONES
  // Las cifras entran por el lado de la lente para que la crucen. Alternan de lado: una cifra que
  // siempre entra por la misma orilla se lee como una lista, y lo que se quiere es que cada una sea un
  // acontecimiento.
  cifras.forEach((c, i) => {
    const s = i % 2 === 0 ? -1 : 1
    const t0 = 26 + i * 2.0
    poner(c, 0, 0.02)
    tl.to(gLente.position, { x: s * UTIL * 0.34, y: mundoH * 0.04, duration: b(1.6), ease: E.vaiven(2) }, b(t0 - 0.6))
    entra(c.g, tl, t0, { desde: s < 0 ? 'izq' : 'der', dist: UTIL * 0.8, dur: 1.6, ease: E.frena(2.4) })
    c.escribir(tl, t0 + 0.35, 1.0)
    c.borrar(tl, t0 + 1.7)
    sale(c.g, tl, t0 + 1.9, { hacia: s < 0 ? 'der' : 'izq', dist: UTIL * 0.8, dur: 1.2 })
  })
  uso.cifras = cifras.length

  frases.forEach((f, i) => {
    const t0 = 26.8 + i * 2.4
    poner(f, 0, -0.30)
    entra(f.g, tl, t0, { desde: 'abajo', dist: 0.9, dur: 1.6, ease: E.frena(2.4) })
    f.escribir(tl, t0 + 0.4, 1.0)
    f.borrar(tl, t0 + 2.0)
    sale(f.g, tl, t0 + 2.2, { hacia: 'abajo', dist: 0.9, dur: 1.2 })
  })
  uso.frases = frases.length

  // ---------------------------------------------------------------- 6 · PEDIDO
  //
  // LA LENTE SE CENTRA DETRAS DEL CTA Y LE HACE DE HALO. Durante toda la pieza el vidrio y el texto se
  // esquivaron; que al final se superpongan a proposito es el unico momento en que los dos elementos
  // hacen la misma cosa, y eso cierra.
  let latido = null
  if (pedido) {
    poner(pedido, 0, 0)
    tl.to(gLente.position, { x: 0, y: 0, duration: b(3.0), ease: E.vaiven(2) }, b(31.2))
    tl.to(gLente.scale, { x: 1.18, y: 1.18, z: 1.18, duration: b(3.4), ease: E.frena(2.2) }, b(31.2))
    entra(pedido.g, tl, 32, { desde: 'fondo', dist: 1.6, dur: 2.0, ease: E.frena(2.6) })
    pedido.escribir(tl, 32.5, 1.2)
    latido = pedido.latir(0.020)
    uso.cta = pedido.tieneCta
    // Un ultimo empujon de bloom: el aro de la lente florece detras del CTA.
    tl.to(ctx.bloom, { strength: (ctx.bloom.strength || 0.62) * 1.35, duration: b(2.6), ease: E.frena(2) }, b(32))
  }

  // ---------------------------------------------------------------- lo continuo
  //
  // La lente gira despacio sobre dos ejes. Un disco de vidrio quieto es un circulo; girando, el canto
  // recorre el borde y el iris cambia de tinte segun el angulo — que es todo lo que hay que hacer para
  // que se lea como un objeto fisico y no como una forma.
  //
  // Se SUMA sobre la rotacion porque no hay tween sobre `gLente.rotation` —los tweens de la lente son
  // sobre posicion y escala— pero se ASIGNA sobre una base guardada por lo mismo: si no hay tween que
  // restablezca, sumar acumula en cada submuestra. Es la regla que verifica `boveda-check`.
  const rot0 = { x: gLente.rotation.x, y: gLente.rotation.y, z: gLente.rotation.z }
  const alSeek = juntar(latido, (t) => {
    uCampo.uT.value = t
    const k = est.k
    camara.position.set(Math.sin(t * 0.13) * DERIVA, Math.sin(t * 0.097 + 1.1) * DERIVA * 0.7,
      Z_CAM + RECORRIDO * 0.5 - RECORRIDO * k)
    camara.rotation.set(0, 0, Math.sin(t * 0.07) * 0.005)
    gLente.rotation.set(
      rot0.x + Math.sin(t * 0.19) * 0.14,
      rot0.y + Math.sin(t * 0.13 + 0.8) * 0.20,
      rot0.z + t * 0.035)
    // El aro late apenas. Es lo unico que se mueve durante ESPACIO ademas del campo, y es lo que hace
    // que la lente se lea encendida y no apagada.
    aro.material.opacity = 0.55 + Math.sin(t * 0.9) * 0.12
  }, ...respiraciones)

  return { dur: b(meta.beats), alSeek, uso }
}
