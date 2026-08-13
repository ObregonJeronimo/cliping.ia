// PLANTILLA "folio" — una hoja en un cuarto vacio y claro. La mas callada del catalogo.
//
// POR QUE EXISTE, Y ES UNA CORRECCION DE RUMBO
//
// Las primeras veinticuatro plantillas de Boveda son todas INTENSAS: columnatas de vidrio, cascadas,
// prismas que abren la luz en bandas, panales, dunas. Cada una esta bien por separado y juntas son un
// catalogo que grita igual en las veinticuatro — y eso no le sirve a una marca sobria, que son
// justamente las que mas video piden.
//
// El registro que faltaba es el de las piezas que hacen los estudios de motion para mostrarle su
// trabajo a una marca como Google: casi todo blanco, un objeto, la camara moviendose poco, la
// tipografia de protagonista y un solo acento de color. La destreza no se demuestra con cantidad de
// objetos sino con TIMING y ENCAJE — que es mucho mas dificil, porque no hay nada detras donde
// esconder un error.
//
// LAS TRES REGLAS SIGUEN VALIENDO, y esa es la parte interesante:
//
//   1. LA CAMARA NO SE DETIENE. Pero aca recorre 1.6 unidades en toda la pieza en vez de ochenta. Es
//      una deriva, no un vuelo: el movimiento se percibe por el paralaje entre la hoja y su sombra,
//      no por el paisaje pasando.
//   2. NADA APARECE POR ENCENDIDO. Los bloques entran, pero desde MUY cerca de su sitio (0.9 unidades
//      en vez de siete) y con una duracion larga. Un gesto corto y lento se lee como caro; uno largo y
//      rapido, como una plantilla.
//   3. HAY CAPAS A DISTINTAS VELOCIDADES. Tres: la hoja, su sombra proyectada y el fondo. Que la
//      sombra se mueva un poco distinto que la hoja es TODO el efecto de profundidad de esta pieza.
//
// LO QUE ESTA PLANTILLA NO HACE, y es a proposito: no usa vidrio, no usa emisivos como masa, no sube
// el bloom y no tiene mas de un objeto. Si algo de eso aparece aca, esta mal.
//
// LOS SEIS TIEMPOS (beats sobre 34)
//   0   ESPACIO   la hoja sola, girando un grado y medio. El cuarto se lee por la sombra.
//   4   MARCA     el nombre se escribe SOBRE la hoja, alineado a su margen izquierdo.
//   10  PROMESA   el claim ocupa el cuerpo de la hoja, en tres renglones.
//   16  PRUEBA    la hoja se voltea y del otro lado esta la pagina del cliente.
//   23  RAZONES   las cifras entran por el pie de la hoja, una debajo de la otra.
//   29  PEDIDO    la hoja se endereza y el CTA queda en su tercio inferior.

import { THREE, mate, barra, iluminar, domo } from '../nucleo.js'
import { entra, sale, respirar, juntar, anchoADistancia } from '../movimiento.js'
import { bloqueMarca, bloquePromesa, bloquePrueba, bloquesCifra, bloquesFrase, bloquePedido } from '../bloques.js'
import { grisDePeso } from '../recetas.js'
import { LOOK, nivel, E, b } from '../../demo/kit.js'

export const meta = {
  id: 'folio',
  nombre: 'Folio',
  familia: 'sobrio',
  necesita: ['nada'],
  beats: 34,
  tiempos: { espacio: 0, marca: 4, promesa: 10, prueba: 16, razones: 23, pedido: 29 },
  pitch: 'Una hoja en un cuarto vacío y claro. Callada, tipográfica: para software, servicios y marcas sobrias.',
}

export function build(ctx) {
  const { escena, pagina, camara, tl, mundoW, mundoH, distBase } = ctx
  const uso = {}
  const respiraciones = []

  // ---------------------------------------------------------------- LO QUE LA PAGINA DECIDE
  //
  // En una plantilla sobria el retrato se lee IGUAL pero se aplica con la mitad de rango. Una pieza
  // callada que de golpe acelera un 45% porque la pagina es enerxica deja de ser callada — y el
  // registro es la promesa que le hace esta plantilla a quien la elige.
  const R = ctx.recetas || { velocidad: 1, capas: 3, dureza: 0.75, margen: 0.88, cifras: 3, frases: 2,
    acentoMasa: false, vacio: 0.5, movimientos: 4, paleta: [], medido: false }
  uso.retrato = !!R.medido
  const medio = (v) => 1 + (v - 1) * 0.45     // la mitad del desvio respecto del neutro

  // LUZ SUAVE Y PAREJA. Key baja, relleno alto: al reves que todas las demas. Lo que se busca es una
  // sombra larga y blanda, no un modelado dramatico.
  iluminar(escena, { key: 0.85, relleno: 0.95 })
  const uDomo = domo(escena, { fuerza: 0.06 })
  // EL BLOOM BAJA, y es la decision que define el registro. El aire trae un bloom pensado para piezas
  // con emisivos; aca no hay un solo emisivo grande, asi que ese bloom solo levanta el blanco del fondo
  // y lo lava. A 0.18 el borde de la hoja sigue teniendo un halo minimo y el blanco se queda quieto.
  if (ctx.bloom) ctx.bloom.strength = Math.min(ctx.bloom.strength || 0.5, 0.18)

  // ---------------------------------------------------------------- el vuelo: una deriva, no un viaje
  //
  // 1.6 unidades en 34 beats. La camara no viaja: respira. El movimiento se percibe por el paralaje
  // entre la hoja y su sombra —que estan a distinta profundidad— y no por el fondo, que casi no cambia.
  const Z_CAM = distBase * 0.92
  const RECORRIDO = 1.6 * medio(R.velocidad)
  const est = { k: 0 }
  tl.fromTo(est, { k: 0 }, { k: 1, duration: b(meta.beats), ease: 'none' }, 0)
  const DERIVA = 0.13
  // El cuadro util a la distancia de la hoja. Se calcula una vez porque la hoja no se mueve en z.
  const UTIL = anchoADistancia(mundoW, distBase, Z_CAM, DERIVA)

  // ---------------------------------------------------------------- el espacio: la hoja y su sombra
  //
  // PROPORCION DE PAPEL, no de pantalla. 1:1.414 es un A4, y el ojo lo reconoce aunque no sepa por que.
  // Un rectangulo 9:16 aca se leeria como un telefono, que es otra cosa.
  const ANCHO_H = UTIL * 0.86
  const ALTO_H = ANCHO_H * 1.414
  const gHoja = new THREE.Group()
  escena.add(gHoja)
  const hoja = new THREE.Mesh(new THREE.PlaneGeometry(ANCHO_H, ALTO_H), mate(nivel(0.02), 0.98))
  gHoja.add(hoja)
  // Un filete de acento en el canto izquierdo, del alto de la hoja. Es el UNICO color de la pieza hasta
  // el CTA, y por eso alcanza: un acento que aparece una vez pesa mas que uno que esta en todas partes.
  const canto = barra(0.022, ALTO_H, LOOK.acento, 1.0)
  canto.position.set(-ANCHO_H / 2 + 0.05, 0, 0.004)
  gHoja.add(canto)

  // LA SOMBRA ES UNA MALLA, no un shadowMap. Un mapa de sombras cuesta una pasada de render por cuadro
  // y por cuatro submuestras de obturador son cuatro; y para una sombra blanda de una sola hoja sobre
  // un fondo liso, una mancha oscura desenfocada da el mismo resultado. Va DETRAS y desplazada, y se
  // mueve un poco distinto que la hoja — de ahi sale toda la profundidad de esta pieza.
  const gSombra = new THREE.Group()
  escena.add(gSombra)
  const sombra = new THREE.Mesh(new THREE.PlaneGeometry(ANCHO_H * 1.06, ALTO_H * 1.04),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(nivel(0.16)), transparent: true, opacity: 0.16, depthWrite: false }))
  sombra.position.set(0.16, -0.20, -0.9)
  gSombra.add(sombra)
  const sombra2 = new THREE.Mesh(new THREE.PlaneGeometry(ANCHO_H * 1.16, ALTO_H * 1.10),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(nivel(0.10)), transparent: true, opacity: 0.10, depthWrite: false }))
  sombra2.position.set(0.30, -0.38, -1.5)
  gSombra.add(sombra2)

  // El fondo: un plano grande y liso, apenas mas oscuro que la hoja. No es el domo — el domo tine y
  // gira, y aca hace falta una pared quieta contra la que la hoja se recorte.
  const pared = new THREE.Mesh(new THREE.PlaneGeometry(mundoW * 6, mundoH * 6), mate(grisDePeso(R, nivel(0.09)), 1.0))
  pared.position.z = -6
  escena.add(pared)

  // ---------------------------------------------------------------- los bloques
  //
  // TODO SE COMPONE CONTRA LA HOJA, no contra el cuadro. Es lo que hace que la pieza se lea como un
  // documento y no como texto flotando: el margen del texto es el margen del papel.
  const MARGEN_H = ANCHO_H * (1 - R.margen) * 0.9 + ANCHO_H * 0.08
  const CAJA = ANCHO_H - MARGEN_H * 2
  const X_IZQ = -ANCHO_H / 2 + MARGEN_H

  const marca = bloqueMarca({ alto: ALTO_H * 0.105, anchoMax: CAJA, filete: false, margen: R.margen })
  const promesa = bloquePromesa({ alto: ALTO_H * 0.052, anchoMax: CAJA, cama: false, maxLineas: 3, margen: R.margen })
  const prueba = bloquePrueba(ctx, { ancho: ANCHO_H * 0.92, ar: 1.414, marco: false })
  const cifras = bloquesCifra(Math.min(2, R.cifras), { alto: ALTO_H * 0.070, anchoMax: CAJA * 0.8, margen: R.margen })
  const frases = bloquesFrase(1, { alto: ALTO_H * 0.030, anchoMax: CAJA, cama: false, margen: R.margen })
  const pedido = bloquePedido({ alto: ALTO_H * 0.030, anchoMax: CAJA * 0.8, margen: R.margen })

  // ALINEADO A LA IZQUIERDA, como un documento. `letras` y `parrafo` centran su malla en su propio
  // ancho, asi que para alinear el borde izquierdo hay que correr el grupo media anchura del bloque.
  // Sin esto los renglones quedan centrados y la hoja se lee como un poster, no como una pagina.
  const enHoja = (blk, y, alinea) => {
    const x = alinea === 'izq' ? X_IZQ + blk.ancho / 2 : 0
    blk.g.position.set(x, ALTO_H * y, 0.012)
    gHoja.add(blk.g)
    return blk.g
  }

  // ---------------------------------------------------------------- 2 · MARCA
  // Se escribe SOBRE la hoja. No entra volando desde afuera del cuadro: sube 0.9 unidades desde debajo
  // de su sitio, que a esta escala es un gesto de medio centimetro de papel.
  if (marca) {
    enHoja(marca, 0.30, 'izq')
    entra(marca.g, tl, 4, { desde: 'abajo', dist: 0.9, dur: 2.2, ease: E.frena(2.6) })
    marca.escribir(tl, 4.6, 1.7)
    marca.borrar(tl, 8.8)
    sale(marca.g, tl, 9.0, { hacia: 'arriba', dist: 0.9, dur: 1.4 })
    uso.marca = true
  }

  // ---------------------------------------------------------------- 3 · PROMESA
  if (promesa) {
    enHoja(promesa, 0.08, 'izq')
    entra(promesa.g, tl, 10, { desde: 'abajo', dist: 0.8, dur: 2.0, ease: E.frena(2.6) })
    promesa.escribir(tl, 10.6, 1.3)
    promesa.borrar(tl, 14.6)
    sale(promesa.g, tl, 14.8, { hacia: 'arriba', dist: 0.8, dur: 1.3 })
    uso.claim = true
    uso.claimRecortado = promesa.recortado
  }

  // ---------------------------------------------------------------- 4 · PRUEBA
  //
  // LA HOJA SE DA VUELTA Y DEL OTRO LADO ESTA LA PAGINA. Es el unico gesto grande de la pieza, y por
  // eso es el que se recuerda: en una plantilla donde nada se mueve mas de una unidad, un giro de 180
  // grados vale lo que en otra vale una explosion.
  //
  // La pagina va a `ctx.pagina`, que se dibuja en un pase posterior SIN la profundidad de la escena, o
  // sea que se veria a traves de la hoja. Se resuelve con visibilidad: aparece cuando el giro ya paso
  // los 90 grados, que es cuando la hoja muestra su dorso.
  if (prueba) {
    prueba.g.position.set(0, 0, 0.02)
    pagina.add(prueba.g)
    tl.set(prueba.g, { visible: false }, 0)
    tl.to(gHoja.rotation, { y: Math.PI, duration: b(2.6), ease: E.vaiven(2) }, b(16))
    tl.set(prueba.g, { visible: true }, b(17.4))
    prueba.escribir(tl, 17.4, 1.4)
    prueba.recorrer(tl, 18.4, 4.4, 0.9)
    // Y vuelve. El giro de vuelta se hace por el MISMO lado —de PI a 2PI y no de PI a 0— para que la
    // hoja no deshaga el gesto: una cosa que gira y vuelve por donde vino se lee como un error.
    tl.to(gHoja.rotation, { y: Math.PI * 2, duration: b(2.6), ease: E.vaiven(2) }, b(22.4))
    tl.set(prueba.g, { visible: false }, b(23.6))
    uso.pagina = prueba.fuente
  }

  // ---------------------------------------------------------------- 5 · RAZONES
  // Las cifras entran por el pie, una debajo de la otra, alineadas al mismo margen que todo lo demas.
  cifras.forEach((c, i) => {
    const t0 = 23.4 + i * 2.4
    enHoja(c, 0.10 - i * 0.17, 'izq')
    entra(c.g, tl, t0, { desde: 'abajo', dist: 0.7, dur: 1.6, ease: E.frena(2.4) })
    c.escribir(tl, t0 + 0.4, 1.0)
    c.borrar(tl, t0 + 2.0)
    sale(c.g, tl, t0 + 2.2, { hacia: 'abajo', dist: 0.7, dur: 1.2 })
  })
  uso.cifras = cifras.length

  frases.forEach((f, i) => {
    const t0 = 24.6
    enHoja(f, -0.30, 'izq')
    entra(f.g, tl, t0, { desde: 'abajo', dist: 0.6, dur: 1.5, ease: E.frena(2.4) })
    f.escribir(tl, t0 + 0.4, 1.0)
    f.borrar(tl, t0 + 2.4)
    sale(f.g, tl, t0 + 2.6, { hacia: 'abajo', dist: 0.6, dur: 1.2 })
  })
  uso.frases = frases.length

  // ---------------------------------------------------------------- 6 · PEDIDO
  let latido = null
  if (pedido) {
    enHoja(pedido, -0.26, 'izq')
    entra(pedido.g, tl, 29, { desde: 'abajo', dist: 0.8, dur: 1.9, ease: E.frena(2.6) })
    pedido.escribir(tl, 29.6, 1.1)
    // El latido va a la MITAD de lo habitual. En una pieza callada un pulso del 3% se lee como un
    // parpadeo; del 1.4%, como que el boton respira.
    latido = pedido.latir(0.014)
    uso.cta = pedido.tieneCta
  }

  // ---------------------------------------------------------------- lo continuo
  //
  // La hoja gira UN GRADO Y MEDIO en toda la pieza y la sombra la sigue con retraso. Ese desfase es lo
  // unico que da profundidad, y es tambien lo que hace que la pieza no se sienta congelada: el ojo
  // registra el movimiento relativo mucho antes que el absoluto.
  //
  // Se SUMA sobre la rotacion porque el tiempo de PRUEBA tuenea `gHoja.rotation.y`: asignar ahi
  // anularia el giro entero. Es la regla que verifica `boveda-check`, y aca cae del lado de sumar.
  const alSeek = juntar(latido, (t) => {
    uDomo.uT.value = t
    const k = est.k
    camara.position.set(Math.sin(t * 0.11) * DERIVA, Math.sin(t * 0.083 + 1.1) * DERIVA * 0.7,
      Z_CAM + RECORRIDO * 0.5 - RECORRIDO * k)
    camara.rotation.set(0, 0, Math.sin(t * 0.07) * 0.004)
    gHoja.rotation.x += Math.sin(t * 0.13) * 0.013
    gHoja.rotation.y += Math.sin(t * 0.09 + 0.7) * 0.010
    // La sombra sigue a la hoja con un 0.62 de ganancia y un desfase: mas que eso y parece pegada,
    // menos y parece de otro objeto.
    gSombra.rotation.x = gHoja.rotation.x * 0.62
    gSombra.rotation.y = gHoja.rotation.y * 0.62
    gSombra.position.x = Math.sin(t * 0.09 + 0.7) * 0.06
  }, ...respiraciones)

  return { dur: b(meta.beats), alSeek, uso }
}
