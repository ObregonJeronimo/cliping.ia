// PLANTILLA "eclipse" — un disco enorme a contraluz y la camara acercandose hasta atravesarlo.
//
// EL GESTO
// La mas grafica del catalogo: casi todo el cuadro es un circulo oscuro con un halo de luz alrededor,
// y todo el texto vive contra ese circulo. No hay perspectiva que resolver ni objetos que rodear —
// hay una FORMA, y el movimiento es que esa forma crece hasta tragarse el cuadro y despues queda
// atras.
//
// Es la plantilla de marca digital: fintech, software, cripto, un lanzamiento. Su valor es que el
// texto se lee perfecto siempre, porque el disco es una cama negra del tamano de la pantalla — y
// funciona igual con paleta clara, que es donde el resto de la boveda sufre.
//
// EL "ECLIPSE" SON TRES DISCOS, no uno. Uno mate que hace de cama, un anillo emisivo apenas mas grande
// que asoma por el borde, y un tercero muy grande y tenue detras que hace de corona. Con un solo disco
// negro el efecto es un agujero; con los tres es una fuente de luz tapada.
//
// LOS SEIS TIEMPOS (beats sobre 36)
//   0   ESPACIO   el disco lejos, girando la corona, el polvo cruzando el halo. Nada de texto.
//   4   MARCA     el nombre entra sobre el disco, del ancho del disco.
//   10  PROMESA   el claim baja en tres renglones mientras el disco crece.
//   16  PRUEBA    la pagina se recorta contra el disco, que ahora ocupa el cuadro entero.
//   24  RAZONES   las cifras giran alrededor del borde, como marcas de un reloj.
//   30  PEDIDO    la camara atraviesa el disco y el CTA queda contra la luz limpia del otro lado.

import { THREE, metal, luz, barra, iluminar, domo, polvo } from '../nucleo.js'
import { vueloAvance, entra, sale, respirar, juntar, anchoConDeriva } from '../movimiento.js'
import { bloqueMarca, bloquePromesa, bloquePrueba, bloquesCifra, bloquesFrase, bloquePedido } from '../bloques.js'
import { LOOK, nivel, E, b } from '../../demo/kit.js'

export const meta = {
  id: 'eclipse',
  nombre: 'Eclipse',
  familia: 'grafico',
  necesita: ['nada'],
  beats: 36,
  tiempos: { espacio: 0, marca: 4, promesa: 10, prueba: 16, razones: 24, pedido: 30 },
  pitch: 'Un disco a contraluz que crece hasta tragarse el cuadro. Gráfico, de fintech y software.',
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

  iluminar(escena, { key: 0.6, relleno: 0.5 })
  const uDomo = domo(escena, { fuerza: 0.30 })
  const motas = polvo(escena, 1500, 28)

  // Deriva chica: en una plantilla que se apoya en una forma centrada, una camara que serpentea saca la
  // forma del eje y arruina justamente lo que la vende.
  const DERIVA = 0.30
  const LARGO = distBase * 2.6
  const vuelo = vueloAvance(camara, tl, {
    distBase, beats: meta.beats, largo: (LARGO) * R.velocidad, desde: 1.0, deriva: DERIVA,
  })
  const zEn = vuelo.zEn
  const UTIL = (k) => anchoConDeriva(mundoW, DERIVA, k)

  // ---------------------------------------------------------------- el espacio: el eclipse
  //
  // El disco se planta al final del recorrido y la camara lo atraviesa en el beat 30. Colocarlo por
  // delante del final —y no exactamente en el— es lo que hace que el ultimo tiempo pase DEL OTRO LADO,
  // que es el remate de la plantilla.
  const Z_DISCO = zEn(30, 0)
  // RAD y no R: `R` es el nombre de las recetas de la pagina en las dieciocho plantillas, y tener el
  // mismo identificador significando dos cosas en un archivo es como se escriben los defectos que no
  // dan sintomas. Aca R era un radio, asi que se llama RAD.
  const RAD = mundoW * 1.35
  const gEcl = new THREE.Group()
  gEcl.position.z = Z_DISCO
  escena.add(gEcl)
  const disco = new THREE.Mesh(new THREE.CircleGeometry(RAD, 96), metal(nivel(0.03), 0.62))
  gEcl.add(disco)
  const anillo = new THREE.Mesh(new THREE.RingGeometry(RAD * 1.002, RAD * 1.045, 128), luz(LOOK.acento, 1.9))
  anillo.position.z = -0.02
  gEcl.add(anillo)
  const corona = new THREE.Mesh(new THREE.CircleGeometry(RAD * 2.6, 96), luz(LOOK.acento2 || LOOK.acento, 0.30))
  corona.material.transparent = true
  corona.material.opacity = 0.30
  corona.material.depthWrite = false
  corona.position.z = -0.6
  gEcl.add(corona)
  // Rayos: barras finas que salen del borde. Son lo que impide que la corona se lea como una mancha —
  // le dan estructura radial sin costar un shader.
  const rayos = new THREE.Group()
  gEcl.add(rayos)
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2
    const l = RAD * (0.5 + (i % 5) * 0.16)
    const r = barra(l, 0.035, LOOK.acento, 0.85)
    r.material.transparent = true
    r.material.opacity = 0.42
    r.material.depthWrite = false
    r.position.set(Math.cos(a) * (RAD + l / 2), Math.sin(a) * (RAD + l / 2), -0.4)
    r.rotation.z = a
    rayos.add(r)
  }

  // Y UN SEGUNDO ECLIPSE MAS CHICO Y MAS LEJOS, para que el espacio no sea un unico plano. Es la capa
  // lenta del paralaje: casi no se mueve, pero sin ella el vuelo hacia el disco grande no se percibe
  // como avance sino como un zoom.
  const gLejos = new THREE.Group()
  gLejos.position.set(mundoW * 0.9, mundoH * 0.5, Z_DISCO - distBase * 2.2)
  escena.add(gLejos)
  const d2 = new THREE.Mesh(new THREE.CircleGeometry(RAD * 0.5, 64), metal(nivel(0.05), 0.6))
  gLejos.add(d2)
  const a2 = new THREE.Mesh(new THREE.RingGeometry(RAD * 0.502, RAD * 0.525, 96), luz(LOOK.acento2 || LOOK.acento, 1.2))
  a2.position.z = -0.02
  gLejos.add(a2)

  // ---------------------------------------------------------------- los bloques
  //
  // SIN CAMA: es la unica plantilla de la boveda donde el claim no la lleva, y no es un descuido sino
  // el resultado de la construccion. El disco YA es una cama —un circulo mate del ancho del cuadro— y
  // apilarle otra encima le pone un rectangulo a una composicion que es toda curva.
  const marca = bloqueMarca({ alto: 1.25, anchoMax: Math.min(UTIL(0.95) * 0.92, RAD * 1.55) , margen: R.margen })
  const promesa = bloquePromesa({ alto: 0.52, anchoMax: Math.min(UTIL(0.95) * 0.9, RAD * 1.5), cama: false , margen: R.margen })
  const prueba = bloquePrueba(ctx, { ancho: mundoW * 0.5, ar: 1.55 })
  const cifras = bloquesCifra(R.cifras, { alto: 0.70, anchoMax: RAD * 0.8 , margen: R.margen })
  const frases = bloquesFrase(R.frases, { alto: 0.28, anchoMax: RAD * 1.3, cama: false , margen: R.margen })
  const pedido = bloquePedido({ alto: 0.32, anchoMax: UTIL(0.9) * 0.6 , margen: R.margen })

  // ---------------------------------------------------------------- 2 · MARCA
  if (marca) {
    marca.g.position.set(0, 0.3, zEn(5.6, distBase * 0.9))
    escena.add(marca.g)
    entra(marca.g, tl, 4, { desde: 'abajo', dist: 5.5, dur: 1.6 })
    marca.escribir(tl, 4.4, 1.3)
    marca.borrar(tl, 8.4)
    sale(marca.g, tl, 8.6, { hacia: 'arriba', dist: 6, dur: 1.0 })
    uso.marca = true
  }

  // ---------------------------------------------------------------- 3 · PROMESA
  if (promesa) {
    promesa.g.position.set(0, 0, zEn(11.6, distBase * 0.95))
    escena.add(promesa.g)
    entra(promesa.g, tl, 10, { desde: 'der', dist: 6.5, dur: 1.6 })
    promesa.escribir(tl, 10.4, 0.95)
    promesa.borrar(tl, 14.4)
    sale(promesa.g, tl, 14.6, { hacia: 'izq', dist: 7, dur: 1.1 })
    uso.claim = true
    uso.claimRecortado = promesa.recortado
  }

  // ---------------------------------------------------------------- 4 · PRUEBA
  if (prueba) {
    prueba.g.position.set(0, 0, zEn(19.0, distBase * 0.95))
    pagina.add(prueba.g)
    entra(prueba.g, tl, 16, { desde: 'fondo', dist: 7, dur: 2.1 })
    prueba.escribir(tl, 16.2, 1.2)
    prueba.recorrer(tl, 17, 5.6, 0.92)
    tl.to(prueba.g.rotation, { y: -0.30, duration: b(5.4), ease: 'none' }, b(16.8))
    sale(prueba.g, tl, 22.4, { hacia: 'der', dist: 7, dur: 1.2 })
    respiraciones.push(respirar(prueba.g, { amp: 0.09, giro: 0.02, fase: 2.0 }))
    uso.pagina = prueba.fuente
  }

  // ---------------------------------------------------------------- 5 · RAZONES
  //
  // LAS CIFRAS SE REPARTEN SOBRE EL BORDE DEL DISCO, como marcas de un reloj. Es la unica composicion
  // radial de la boveda y sale gratis: el disco ya define un centro y un radio.
  cifras.forEach((c, i) => {
    const t0 = 24 + i * 1.9
    const ang = -0.55 + i * 0.55
    c.g.position.set(Math.sin(ang) * RAD * 0.62, Math.cos(ang) * RAD * 0.42, zEn(t0 + 0.8, distBase * 0.85))
    escena.add(c.g)
    entra(c.g, tl, t0, { desde: i % 2 ? 'der' : 'izq', dist: 5, dur: 1.2 })
    c.escribir(tl, t0 + 0.28, 0.7)
    sale(c.g, tl, t0 + 2.0, { hacia: 'fondo', dist: 4.5, dur: 1.0 })
  })
  uso.cifras = cifras.length

  frases.forEach((f, i) => {
    const t0 = 24.6 + i * 2.5
    f.g.position.set(0, -RAD * 0.55, zEn(t0 + 0.8, distBase * 0.85))
    escena.add(f.g)
    entra(f.g, tl, t0, { desde: 'abajo', dist: 4.5, dur: 1.3 })
    f.escribir(tl, t0 + 0.35, 0.8)
    f.borrar(tl, t0 + 2.1)
    sale(f.g, tl, t0 + 2.3, { hacia: 'abajo', dist: 5, dur: 1.0 })
  })
  uso.frases = frases.length

  // ---------------------------------------------------------------- 6 · PEDIDO
  //
  // DEL OTRO LADO DEL DISCO. La camara lo atraviesa alrededor del beat 30, asi que el CTA se coloca
  // detras: durante toda la pieza el disco tapo la luz, y el ultimo tiempo es el unico que la ve.
  let latido = null
  if (pedido) {
    pedido.g.position.set(0, 0.05, Z_DISCO - distBase * 0.86)
    escena.add(pedido.g)
    entra(pedido.g, tl, 30.4, { desde: 'fondo', dist: 5, dur: 1.7 })
    pedido.escribir(tl, 30.8, 0.9)
    latido = pedido.latir(0.03)
    uso.cta = pedido.tieneCta
    tl.to(ctx.bloom, { strength: (ctx.bloom.strength || 0.5) * 2.1, duration: b(2.6), ease: E.frena(2) }, b(29.4))
  }

  // ---------------------------------------------------------------- lo continuo
  //
  // LA CORONA GIRA Y EL DISCO NO. Que la parte luminosa se mueva y la mate se quede quieta es lo que
  // hace que se lea como LUZ DETRAS de un cuerpo, y no como un dibujo de un eclipse. Cuesta una linea.
  const alSeek = juntar(vuelo.alSeek, latido, (t) => {
    uDomo.uT.value = t
    rayos.rotation.z = t * 0.055
    corona.rotation.z = -t * 0.03
    // El halo LATE, muy despacio y sin llegar nunca a apagarse. Un borde emisivo constante se percibe
    // como un contorno dibujado; uno que respira, como una fuente.
    anillo.material.color.copy(luz(LOOK.acento, 1.9 + Math.sin(t * 0.9) * 0.35).color)
    gLejos.rotation.z = t * 0.02
    motas.position.z = camara.position.z
    motas.rotation.y = t * 0.025
  }, ...respiraciones)

  return { dur: b(meta.beats), alSeek, uso }
}
