// PLANTILLA "pliegue" — un plano que se dobla, y el doblez es el corte entre tiempos.
//
// EL GESTO, Y LA IDEA QUE LO ORDENA TODO
//
// Un plano grande y liso ocupa el cuadro. Cuando termina un tiempo, el plano SE DOBLA por una linea que
// cruza la pantalla: la cara que estaba se va girando y la cara nueva llega girando. El doblez no es un
// adorno entre escenas — ES la transicion, y por eso no hay ninguna otra.
//
// Eso resuelve el problema mas dificil de una plantilla callada: como pasar de un tiempo al siguiente
// sin un corte duro ni un fundido. Un corte duro rompe el registro; un fundido no es motion graphics.
// Un doblez es un movimiento fisico, se lee como intencion y no cuesta un solo objeto mas.
//
// EN QUE SE DIFERENCIA DE `folio`, que tambien es papel:
//
//   `folio`    hay UNA hoja en un cuarto, y la camara la mira. El sujeto es el objeto.
//   `pliegue`  no hay cuarto ni objeto: el plano ES el cuadro. El sujeto es la SUPERFICIE.
//
// LAS TRES REGLAS, en su version mas callada:
//   1. La camara deriva 0.9 unidades en toda la pieza. Lo que se mueve es el papel.
//   2. Nada aparece por encendido: cada bloque llega con su cara, girando desde el doblez.
//   3. Capas a distintas velocidades: la cara de adelante, la de atras y la sombra del doblez.
//
// LOS SEIS TIEMPOS (beats sobre 36)
//   0   ESPACIO   el plano liso, con la luz corriendole por encima. Nada de texto.
//   5   MARCA     primer doblez: el nombre llega con la cara nueva.
//   11  PROMESA   segundo doblez, en el otro sentido.
//   17  PRUEBA    el doblez deja ver la pagina del cliente en la cara que baja.
//   24  RAZONES   dos dobleces cortos, uno por cifra.
//   30  PEDIDO    el plano se aplana del todo y el CTA queda en el centro.

import { THREE, mate, barra, iluminar, domo } from '../nucleo.js'
import { entra, sale, juntar, anchoADistancia } from '../movimiento.js'
import { bloqueMarca, bloquePromesa, bloquePrueba, bloquesCifra, bloquesFrase, bloquePedido } from '../bloques.js'
import { colorDePeso, grisDePeso } from '../recetas.js'
import { LOOK, nivel, E, b } from '../../demo/kit.js'

export const meta = {
  id: 'pliegue',
  nombre: 'Pliegue',
  familia: 'sobrio',
  necesita: ['nada'],
  beats: 36,
  tiempos: { espacio: 0, marca: 5, promesa: 11, prueba: 17, razones: 24, pedido: 30 },
  pitch: 'Un plano que se dobla, y el doblez es la transición. Callada y precisa: de producto y de sistema.',
}

export function build(ctx) {
  const { escena, pagina, camara, tl, mundoW, mundoH, distBase } = ctx
  const uso = {}

  // ---------------------------------------------------------------- LO QUE LA PAGINA DECIDE
  const R = ctx.recetas || { velocidad: 1, capas: 3, dureza: 0.75, margen: 0.88, cifras: 3, frases: 2,
    acentoMasa: false, vacio: 0.5, movimientos: 4, paleta: [], medido: false }
  uso.retrato = !!R.medido
  const medio = (v) => 1 + (v - 1) * 0.45

  // LUZ DIRECCIONAL, no pareja — y es lo contrario de lo que pide el registro sobrio en general.
  //
  // `folio` y `halo` usan luz blanda porque su sujeto es un objeto contra un fondo: lo que tiene que
  // leerse es el BORDE. Aca el sujeto es una superficie que se dobla, o sea que lo que tiene que leerse
  // es el ANGULO — y un angulo solo se ve si la luz cambia cuando la cara gira.
  //
  // Con key 0.95 y relleno 0.90 un doblez de 46 grados cambiaba el sombreado un 6%: el papel se doblaba
  // y en pantalla no pasaba nada. Con 1.9 contra 0.25 el mismo doblez cambia un 40%, que es lo que el
  // ojo necesita para leerlo como un movimiento fisico y no como un degradado.
  iluminar(escena, { key: 1.90, relleno: 0.25 })
  const uDomo = domo(escena, { fuerza: 0.05 })
  if (ctx.bloom) ctx.bloom.strength = Math.min(ctx.bloom.strength || 0.5, 0.16)

  const Z_CAM = distBase * 0.90
  const DERIVA = 0.11
  const RECORRIDO = 0.9 * medio(R.velocidad)
  const est = { k: 0 }
  tl.fromTo(est, { k: 0 }, { k: 1, duration: b(meta.beats), ease: 'none' }, 0)
  const UTIL = anchoADistancia(mundoW, distBase, Z_CAM, DERIVA)

  // ---------------------------------------------------------------- el espacio: dos caras y un doblez
  //
  // EL DOBLEZ ES UNA BISAGRA, o sea dos planos que comparten una arista. La cara de ARRIBA cuelga de la
  // bisagra hacia arriba y la de ABAJO hacia abajo, y girar la de arriba alrededor de la arista es
  // exactamente doblar un papel.
  //
  // La bisagra esta en el CENTRO del cuadro y no en un tercio: un doblez descentrado se lee como una
  // esquina levantada, y lo que se busca es que la pantalla entera se de vuelta.
  const ANCHO_P = UTIL * 1.6      // mas ancho que el cuadro: el borde lateral no tiene que verse nunca
  const ALTO_P = mundoH * 1.05

  const gArriba = new THREE.Group()
  const gAbajo = new THREE.Group()
  escena.add(gArriba); escena.add(gAbajo)

  // La geometria se corre media altura para que su ORIGEN quede en la arista y no en su centro: girar
  // un plano centrado lo hace pivotar por el medio, que no es un doblez sino un molinete.
  const caraDe = (color, haciaArriba) => {
    const g = new THREE.PlaneGeometry(ANCHO_P, ALTO_P / 2)
    g.translate(0, (haciaArriba ? 1 : -1) * ALTO_P / 4, 0)
    const m = new THREE.Mesh(g, mate(color, 0.98))
    // DOBLE CARA, y sin esto la mitad de la pieza no existe: cuando el plano pasa de los 90 grados se lo
    // ve por detras, y un `FrontSide` ahi es un agujero.
    m.material.side = THREE.DoubleSide
    return m
  }
  // LAS DOS CARAS TIENEN QUE SEPARARSE DE VERDAD. `nivel(0.02)` y `nivel(0.055)` se parecen poco en el
  // hex y mucho en pantalla: la iluminacion fisica del motor devuelve alrededor de un tercio del albedo
  // y esa compresion junta todo lo que estaba cerca. Con las dos caras en el mismo valor el doblez no
  // se ve — y el doblez es la plantilla entera.
  //
  // 0.02 contra 0.22 es un salto que sobrevive a la compresion sin volverse dramatico: sigue siendo
  // papel de dos tonos, no blanco contra negro.
  // Y AHORA LAS DOS CARAS SON DEL MISMO COLOR. Con la luz direccional, lo que separa una cara de la
  // otra es el ANGULO, que es lo correcto: dos tonos distintos de papel se leen como dos papeles, y lo
  // que se quiere es UNA hoja doblada. El pigmento igual, la luz distinta.
  const CLARO = nivel(0.04)
  const APENAS = nivel(0.04)
  gArriba.add(caraDe(CLARO, true))
  gAbajo.add(caraDe(APENAS, false))

  // LA LINEA DEL DOBLEZ, en acento. Es el unico color de la pieza hasta el CTA, y esta exactamente
  // donde el ojo ya esta mirando — que es lo que la vuelve suficiente.
  const COL = colorDePeso(R, LOOK.acento, 0.18)
  const linea = barra(ANCHO_P, 0.020, COL, 1.0)
  linea.position.z = 0.012
  escena.add(linea)

  // La sombra que proyecta la cara que se levanta sobre la que se queda. Es una malla, no un shadowMap,
  // por lo mismo que en `folio`: una pasada de sombras por submuestra de obturador son cuatro por
  // cuadro, y para una sombra blanda de un plano sobre otro plano una mancha alcanza.
  const sombra = new THREE.Mesh(new THREE.PlaneGeometry(ANCHO_P, ALTO_P / 2),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(nivel(0.20)), transparent: true, opacity: 0, depthWrite: false }))
  sombra.geometry.translate(0, -ALTO_P / 4, 0)
  sombra.position.z = 0.006
  escena.add(sombra)

  // Y el fondo mas oscuro que las dos caras, por lo mismo: si el papel y lo que hay detras comparten
  // valor, el borde del papel deja de existir y la pieza se lee como un degradado.
  const fondo = new THREE.Mesh(new THREE.PlaneGeometry(mundoW * 6, mundoH * 6), mate(nivel(0.48), 1.0))
  fondo.position.z = -4
  escena.add(fondo)

  // ---------------------------------------------------------------- los bloques
  const CAJA = UTIL * R.margen * 0.92
  const marca = bloqueMarca({ alto: mundoH * 0.115, anchoMax: CAJA, filete: false, margen: R.margen })
  const promesa = bloquePromesa({ alto: mundoH * 0.050, anchoMax: CAJA, cama: false, maxLineas: 3, margen: R.margen })
  const prueba = bloquePrueba(ctx, { ancho: UTIL * 0.62, ar: 1.5, marco: false })
  const cifras = bloquesCifra(Math.min(2, R.cifras), { alto: mundoH * 0.115, anchoMax: CAJA * 0.8, margen: R.margen })
  const frases = bloquesFrase(1, { alto: mundoH * 0.030, anchoMax: CAJA, cama: false, margen: R.margen })
  const pedido = bloquePedido({ alto: mundoH * 0.030, anchoMax: CAJA * 0.7, margen: R.margen })

  // Un bloque vive EN una cara: se cuelga de su grupo, asi que gira con ella. Es lo que hace que el
  // texto llegue doblandose en vez de aparecer sobre un plano que ya se doblo.
  const enCara = (blk, cara, y, padre) => {
    blk.g.position.set(0, y, 0.02)
    ;(padre || (cara === 'arriba' ? gArriba : gAbajo)).add(blk.g)
    return blk.g
  }

  // EL DOBLEZ. Una funcion, porque la pieza entera son cinco dobleces y escribir el mismo tween cinco
  // veces es como se consigue que el tercero tenga otra duracion sin que nadie lo note.
  //
  // `grados` positivo dobla la cara de arriba hacia el espectador; negativo, hacia atras. Se alternan a
  // proposito: dos dobleces seguidos para el mismo lado se leen como un tic.
  const doblar = (t0, grados, dur) => {
    const rad = grados * Math.PI / 180
    tl.to(gArriba.rotation, { x: rad, duration: b(dur), ease: E.vaiven(2) }, b(t0))
    // La sombra crece con el angulo: es lo unico que informa CUANTO se doblo, porque una cara girando
    // hacia el espectador se ve casi igual a 20 que a 40 grados.
    tl.to(sombra.material, { opacity: Math.min(0.22, Math.abs(grados) / 180), duration: b(dur * 0.6), ease: E.frena(2) }, b(t0))
    tl.to(sombra.material, { opacity: 0, duration: b(dur * 0.6), ease: E.acelera(2) }, b(t0 + dur * 0.5))
  }

  // ---------------------------------------------------------------- 2 · MARCA
  if (marca) {
    enCara(marca, 'arriba', ALTO_P * 0.17)
    doblar(4.4, -46, 2.4)
    doblar(6.4, 0, 2.2)
    marca.escribir(tl, 5.8, 1.8)
    marca.borrar(tl, 9.6)
    uso.marca = true
  }

  // ---------------------------------------------------------------- 3 · PROMESA
  // El claim vive en la cara de ABAJO, o sea la que no se mueve. Alternar de cara entre un tiempo y el
  // siguiente es lo que hace que el doblez se lea como un cambio de pagina y no como un temblor.
  if (promesa) {
    enCara(promesa, 'abajo', -ALTO_P * 0.14)
    doblar(10.4, 40, 2.4)
    doblar(12.6, 0, 2.2)
    promesa.escribir(tl, 11.8, 1.5)
    promesa.borrar(tl, 15.8)
    uso.claim = true
    uso.claimRecortado = promesa.recortado
  }

  // ---------------------------------------------------------------- 4 · PRUEBA
  //
  // La pagina va a `ctx.pagina`, que se dibuja despues del bloom y sin la profundidad de la escena: no
  // puede colgarse de una cara porque se veria igual cuando la cara mira para el otro lado. Va suelta,
  // centrada, y el doblez ocurre DETRAS — que es lo que la presenta.
  if (prueba) {
    prueba.g.position.set(0, 0, 0.05)
    pagina.add(prueba.g)
    doblar(16.4, -34, 2.6)
    doblar(18.6, 0, 2.4)
    entra(prueba.g, tl, 17.2, { desde: 'fondo', dist: 1.4, dur: 2.2, ease: E.frena(2.4) })
    prueba.escribir(tl, 17.6, 1.4)
    prueba.recorrer(tl, 18.6, 4.2, 0.9)
    sale(prueba.g, tl, 22.4, { hacia: 'fondo', dist: 1.4, dur: 1.4 })
    uso.pagina = prueba.fuente
  }

  // ---------------------------------------------------------------- 5 · RAZONES
  // Un doblez corto por cifra, alternando el sentido. Las cifras van en la cara de arriba, que es la
  // que se mueve: la cifra llega con el papel.
  cifras.forEach((c, i) => {
    const t0 = 23.8 + i * 2.8
    enCara(c, 'arriba', ALTO_P * 0.15)
    doblar(t0, i % 2 === 0 ? -30 : 30, 1.9)
    doblar(t0 + 1.7, 0, 1.7)
    c.escribir(tl, t0 + 0.9, 1.1)
    c.borrar(tl, t0 + 2.4)
  })
  uso.cifras = cifras.length

  frases.forEach((f) => {
    const t0 = 25.2
    enCara(f, 'abajo', -ALTO_P * 0.30)
    entra(f.g, tl, t0, { desde: 'abajo', dist: 0.5, dur: 1.6, ease: E.frena(2.4) })
    f.escribir(tl, t0 + 0.4, 1.0)
    f.borrar(tl, t0 + 3.0)
    sale(f.g, tl, t0 + 3.2, { hacia: 'abajo', dist: 0.5, dur: 1.2 })
  })
  uso.frases = frases.length

  // ---------------------------------------------------------------- 6 · PEDIDO
  //
  // EL PLANO SE APLANA DEL TODO Y NO SE VUELVE A DOBLAR. Es el cierre: durante treinta beats el papel
  // se movio, y en los ultimos seis se queda quieto. En una pieza callada, quedarse quieto ES el
  // remate — no hace falta nada mas.
  let latido = null
  if (pedido) {
    enCara(pedido, 'abajo', -ALTO_P * 0.08)
    doblar(29.2, 0, 2.0)
    entra(pedido.g, tl, 30, { desde: 'abajo', dist: 0.7, dur: 1.9, ease: E.frena(2.6) })
    pedido.escribir(tl, 30.6, 1.2)
    latido = pedido.latir(0.014)
    uso.cta = pedido.tieneCta
  }

  // ---------------------------------------------------------------- lo continuo
  //
  // La linea del doblez SIGUE a la cara que se levanta: cuando el plano se dobla, la arista se corre
  // hacia el espectador. Sin esto la linea queda flotando donde estaba y el doblez se ve despegado de
  // su propia bisagra.
  //
  // Se ASIGNA porque ningun tween toca `linea.position` ni `linea.scale`, y sumar sobre algo que nadie
  // restablece acumula en cada submuestra del obturador.
  const alSeek = juntar(latido, (t) => {
    uDomo.uT.value = t
    const k = est.k
    camara.position.set(Math.sin(t * 0.10) * DERIVA, Math.sin(t * 0.079 + 0.9) * DERIVA * 0.6,
      Z_CAM + RECORRIDO * 0.5 - RECORRIDO * k)
    camara.rotation.set(0, 0, Math.sin(t * 0.055) * 0.003)
    const ang = gArriba.rotation.x
    linea.position.z = 0.012 + Math.abs(Math.sin(ang)) * 0.10
    // La linea se acorta un poco al doblarse: es la proyeccion de la arista, y sin ese acortamiento el
    // doblez se lee plano por mas que la cara gire.
    linea.scale.x = 1 - Math.abs(Math.sin(ang)) * 0.06
    // Y una luz que corre por la superficie, lentisima. Es lo unico que pasa durante los cinco beats de
    // ESPACIO, y es lo que impide que un plano liso se lea como una pantalla apagada.
    gAbajo.position.x = Math.sin(t * 0.041) * 0.05
  })

  return { dur: b(meta.beats), alSeek, uso }
}
