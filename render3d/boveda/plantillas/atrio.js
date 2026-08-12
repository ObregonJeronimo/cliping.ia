// PLANTILLA "atrio" — vuelo frontal sin frenos por una columnata de vidrio.
//
// ESTA ES LA PLANTILLA DE REFERENCIA DE BOVEDA. Si vas a escribir una nueva, leela entera primero: no
// por su composicion —que es una entre muchas posibles— sino por COMO esta armada, que es lo que las
// demas tienen que compartir.
//
// LO QUE UNA PLANTILLA APORTA, Y LO QUE NO
//
// Aporta TRES COSAS y ninguna mas: un ESPACIO (aca, una columnata de vidrio), un VUELO (aca, avance
// frontal) y un RITMO (cuando entra y sale cada cosa). Todo lo demas ya esta resuelto:
//
//     `bloques.js`      compone los seis tiempos y los MIDE. La plantilla no arma el nombre de la
//                       marca ni parte el claim en renglones: los pide y los coloca.
//     `movimiento.js`   los vuelos, las entradas, las salidas, el paralaje y la respiracion.
//     `nucleo.js`       texto, vidrio, luz, camas, el panel de la pagina.
//
// La primera version de este archivo hacia las tres cosas a la vez y tenia trescientas lineas, de las
// cuales unas cincuenta eran su idea. Con el reparto de arriba son cien, y las cien son la idea.
//
// LAS TRES REGLAS QUE LA HACEN VERSE COMO UNA TEMPLATE Y NO COMO UNA ESCENA 3D
//
//   1. LA CAMARA NO PARA NUNCA. Avanza los 40 beats. En el pedido baja la velocidad, no llega a cero.
//      La primera version frenaba en seco y el ultimo tercio se leia como diapositiva.
//   2. NADA APARECE POR ENCENDIDO. Cada bloque ENTRA —volando desde un costado, desde el fondo, desde
//      abajo— y SALE hacia otro lado. Un elemento que se prende en su sitio es un cartel.
//   3. HAY TRES CAPAS A DISTINTAS VELOCIDADES: las columnas cercanas, las lejanas y el polvo. Sin eso,
//      volar por un espacio vacio es indistinguible de un zoom.
//
// LOS SEIS TIEMPOS (beats sobre 40)
//   0   ESPACIO   la camara ya viene entrando; columnas pasando, piso reflejando, polvo derivando.
//   5   MARCA     el nombre llega desde el fondo y se planta; el rotulo entra detras.
//   12  PROMESA   el claim entra por la izquierda en tres renglones y sale por la derecha.
//   18  PRUEBA    la pagina del cliente entra girada desde el costado y la camara la rodea al pasar.
//   26  RAZONES   las cifras pasan por los costados, una por columna, entrando desde el borde.
//   33  PEDIDO    la camara baja a velocidad de lectura; el CTA llega desde el fondo y late.
//
// SIN MATERIAL: sin tira, PRUEBA usa el recorte mas grande; sin recortes, el tiempo se compone vacio y
// la columnata se queda sola. Lo que no hay, no se anuncia.

import { THREE, vidrio, metal, luz, barra, iluminar, domo, polvo } from '../nucleo.js'
import { vueloAvance, entra, sale, paralaje, respirar, juntar, anchoConDeriva } from '../movimiento.js'
import { bloqueMarca, bloquePromesa, bloquePrueba, bloquesCifra, bloquesFrase, bloquePedido } from '../bloques.js'
import { LOOK, nivel, E, b } from '../../demo/kit.js'

export const meta = {
  id: 'atrio',
  nombre: 'Atrio de vidrio',
  familia: 'arquitectura',
  necesita: ['nada'],
  beats: 40,
  tiempos: { espacio: 0, marca: 5, promesa: 12, prueba: 18, razones: 26, pedido: 33 },
  pitch: 'Vuelo frontal sin frenos por una columnata de vidrio. Arquitectónico, de marca grande.',
}

const SEP = 7.4

export function build(ctx) {
  const { escena, pagina, camara, tl, mundoW, distBase } = ctx
  const uso = {}
  const respiraciones = []

  iluminar(escena, { key: 1.05, relleno: 0.5 })
  const uDomo = domo(escena, { fuerza: 0.26 })
  const motas = polvo(escena, 1200, 40)

  // EL VUELO PRIMERO. Todo lo demas se cuelga de el: en una pieza que avanza, la posicion de un objeto
  // no es una decision de composicion sino una consecuencia de cuando tiene que leerse.
  const DERIVA = 0.55
  const vuelo = vueloAvance(camara, tl, {
    distBase, beats: meta.beats, largo: SEP * 11, desde: 0.85, deriva: DERIVA,
  })
  const zEn = vuelo.zEn
  // Todo lo que se compone al ancho se mide contra ESTO y no contra `mundoW`: la camara deriva, asi que
  // el cuadro util es mas angosto que el de reposo — y mas todavia para lo que esta cerca.
  const UTIL = (k) => anchoConDeriva(mundoW, DERIVA, k)

  // ---------------------------------------------------------------- el espacio: la columnata
  //
  // DOS CAPAS A DISTINTAS VELOCIDADES, y esa es la mitad del efecto. Las cercanas pasan rapido y las
  // lejanas apenas se corren: el ojo reconstruye la profundidad solo. Con una sola capa, el mismo vuelo
  // se lee como un zoom sobre un decorado plano.
  const X = mundoW * 0.60
  const ALTO = 30
  const matCol = vidrio(LOOK.acento, { rug: 0.06, trans: 0.72, grosor: 2.4, opacidad: 0.92 })
  const matCanto = luz(LOOK.acento2 || LOOK.acento, 0.5)
  const columna = (esc, xs) => {
    const g = new THREE.Group()
    g.add(new THREE.Mesh(new THREE.BoxGeometry(1.15 * esc, ALTO, 1.15 * esc), matCol))
    const canto = new THREE.Mesh(new THREE.PlaneGeometry(0.055, ALTO * 0.92), matCanto)
    canto.position.set(-xs * 0.60 * esc, 0, 0.58 * esc)
    g.add(canto)
    return g
  }
  const cerca = new THREE.Group(), lejos = new THREE.Group()
  escena.add(cerca); escena.add(lejos)
  const Z_TOPE = distBase * 0.85
  for (let i = 0; i < 16; i++) {
    for (const s of [-1, 1]) {
      const a = columna(1, s); a.position.set(s * X, 0, Z_TOPE - i * SEP); cerca.add(a)
      const c = columna(1.9, s); c.position.set(s * X * 2.35, -2, Z_TOPE - i * SEP * 1.7 - 12); lejos.add(c)
    }
  }
  // Piso oscuro con una banda de acento bajo el eje. Un reflejo real costaria un render por cuadro.
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(X * 6, 400), metal(nivel(0.04), 0.22))
  piso.rotation.x = -Math.PI / 2
  piso.position.set(0, -ALTO / 2, -100)
  escena.add(piso)
  const brillo = barra(2.4, 400, LOOK.acento, 0.5)
  brillo.material.transparent = true
  brillo.material.opacity = 0.16
  brillo.material.depthWrite = false
  brillo.rotation.x = -Math.PI / 2
  brillo.position.set(0, -ALTO / 2 + 0.02, -100)
  escena.add(brillo)

  // ---------------------------------------------------------------- los bloques, pedidos y colocados
  const marca = bloqueMarca({ alto: 1.5, anchoMax: UTIL(0.92) * 0.94 })
  const promesa = bloquePromesa({ alto: 0.60, anchoMax: UTIL(0.95) * 0.92 })
  const prueba = bloquePrueba(ctx, { ancho: mundoW * 0.58, ar: 1.6 })
  const cifras = bloquesCifra(3, { alto: 0.95, anchoMax: UTIL(0.78) * 0.42 })
  const frases = bloquesFrase(2, { alto: 0.30, anchoMax: UTIL(0.78) * 0.86 })
  const pedido = bloquePedido({ alto: 0.34, anchoMax: UTIL(0.82) * 0.66 })

  // ---------------------------------------------------------------- 2 · MARCA
  //
  // Llega desde el fondo, se planta, y sale hacia arriba ANTES de que la camara la cruce. Esa ultima
  // parte no es estetica: en un vuelo, lo que se queda te lo comes.
  if (marca) {
    marca.g.position.set(0, 0.35, zEn(6.6, distBase * 0.92))
    escena.add(marca.g)
    entra(marca.g, tl, 5, { desde: 'fondo', dist: 7, dur: 1.9 })
    marca.escribir(tl, 5.4, 1.5)
    marca.borrar(tl, 10.2)
    sale(marca.g, tl, 10.4, { hacia: 'arriba', dist: 6, dur: 1.1 })
    uso.marca = true
  }

  // ---------------------------------------------------------------- 3 · PROMESA
  // Entra por la izquierda y sale por la derecha: el claim CRUZA el cuadro en vez de posarse en el.
  if (promesa) {
    promesa.g.position.set(0, 0.1, zEn(12.6, distBase * 0.95))
    escena.add(promesa.g)
    entra(promesa.g, tl, 11.2, { desde: 'izq', dist: 7.5, dur: 1.8 })
    promesa.escribir(tl, 11.6, 1.0)
    promesa.borrar(tl, 16.4)
    sale(promesa.g, tl, 16.6, { hacia: 'der', dist: 8, dur: 1.2 })
    uso.claim = true
    uso.claimRecortado = promesa.recortado
  }

  // ---------------------------------------------------------------- 4 · PRUEBA
  // Entra girada y la camara la rodea al pasar. EL GIRO ES LO QUE LA VUELVE OBJETO: un plano de frente
  // con una captura encima es una textura pegada; el mismo plano girando es una pantalla en un espacio.
  if (prueba) {
    prueba.g.position.set(0, 0, zEn(20, distBase))
    prueba.g.rotation.y = 0.62
    // El marco metalico va DETRAS del panel y es de la plantilla, no del bloque: es lo que la ata a
    // este espacio, donde todo lo demas tambien es vidrio y metal.
    const marco = new THREE.Mesh(new THREE.PlaneGeometry(prueba.ancho + 0.18, prueba.alto + 0.18), metal(nivel(0.20), 0.28))
    marco.position.z = -0.02
    prueba.g.add(marco)
    pagina.add(prueba.g)
    entra(prueba.g, tl, 18, { desde: 'der', dist: 6.5, dur: 2.2 })
    prueba.escribir(tl, 18.2, 1.2)
    prueba.recorrer(tl, 19, 6.2, 0.9)
    tl.to(prueba.g.rotation, { y: -0.28, duration: b(7.5), ease: 'none' }, b(18.6))
    sale(prueba.g, tl, 25.2, { hacia: 'izq', dist: 7, dur: 1.3 })
    respiraciones.push(respirar(prueba.g, { amp: 0.14, giro: 0.03, fase: 1.1 }))
    uso.pagina = prueba.fuente
  }

  // ---------------------------------------------------------------- 5 · RAZONES
  // Cada cifra entra por SU borde, el mismo al que esta pegada; las frases suben desde abajo. Las dos
  // familias se cruzan a proposito: razones es el unico tiempo que puede tener dos cosas a la vez.
  cifras.forEach((c, i) => {
    const s = i % 2 === 0 ? -1 : 1
    // 0.42 y no 0.62: a 0.62 la cifra quedaba pegada al borde y la deriva se le comia el primer digito
    // — el `10X` de basecamp salio como `0X`.
    // 0.28 del semiancho y no 0.42, y LEJOS (0.95) en vez de cerca (0.78). Los dos por lo mismo: un
    // objeto pegado al borde y cerca del lente se va de cuadro solo mientras la camara avanza, asi que
    // su ventana de lectura dura menos que su propia animacion. Medido: a 0.42 y 0.78 las cifras
    // quedaban encendidas y fuera del encuadre dos beats enteros.
    c.g.position.set(s * X * 0.28, 0.5 - i * 0.2, zEn(26.4 + i * 2.4, distBase * 0.95))
    c.g.rotation.y = s * 0.34
    escena.add(c.g)
    const t0 = 26 + i * 2.4
    entra(c.g, tl, t0, { desde: s < 0 ? 'izq' : 'der', dist: 5.5, dur: 1.3 })
    c.escribir(tl, t0 + 0.3, 0.8)
    sale(c.g, tl, t0 + 2.4, { hacia: s < 0 ? 'izq' : 'der', dist: 6, dur: 1.0 })
  })
  uso.cifras = cifras.length

  frases.forEach((f, i) => {
    f.g.position.set(0, -2.0, zEn(27.6 + i * 2.8, distBase * 0.88))
    escena.add(f.g)
    const t0 = 27.2 + i * 2.8
    entra(f.g, tl, t0, { desde: 'abajo', dist: 4.5, dur: 1.4 })
    f.escribir(tl, t0 + 0.4, 0.9)
    f.borrar(tl, t0 + 2.3)
    sale(f.g, tl, t0 + 2.5, { hacia: 'abajo', dist: 5, dur: 1.0 })
  })
  uso.frases = frases.length

  // ---------------------------------------------------------------- 6 · PEDIDO
  // Llega desde el fondo y LATE. La camara no se detiene: baja a velocidad de lectura y sigue.
  let latido = null
  if (pedido) {
    pedido.g.position.set(0, 0.2, zEn(meta.beats - 1.2, distBase * 0.82))
    escena.add(pedido.g)
    entra(pedido.g, tl, 33, { desde: 'fondo', dist: 6, dur: 2.0 })
    pedido.escribir(tl, 33.4, 0.9)
    latido = pedido.latir(0.03)
    uso.cta = pedido.tieneCta
    // Un empujon de bloom en el pedido. Es el unico sitio de la pieza donde la luz sube: el ojo lo lee
    // como que algo se resolvio, y cuesta un tween.
    tl.to(ctx.bloom, { strength: (ctx.bloom.strength || 0.5) * 1.7, duration: b(2.2), ease: E.frena(2) }, b(33))
  }

  // ---------------------------------------------------------------- lo continuo
  //
  // Va aca y no en tweens porque tiene que evaluarse en CADA submuestra del obturador: un movimiento
  // continuo escrito como tween se muestrea una vez por cuadro y sale a saltos justo donde el obturador
  // deberia barrerlo.
  const capas = paralaje([
    { grupo: cerca, vel: 0, largo: SEP * 16 },
    { grupo: lejos, vel: 0.9, largo: SEP * 1.7 * 16, z0: 0 },
  ])
  const alSeek = juntar(vuelo.alSeek, capas, latido, (t) => {
    uDomo.uT.value = t
    motas.rotation.y = t * 0.02
    motas.position.z = camara.position.z
  }, ...respiraciones)

  return { dur: b(meta.beats), alSeek, uso }
}
