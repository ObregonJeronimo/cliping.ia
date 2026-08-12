// PLANTILLA "atrio" — la camara AVANZA por una columnata de vidrio y los datos cuelgan del espacio.
//
// EL GESTO, Y POR QUE ES ESTE
// Un vuelo frontal continuo es el plano mas caro de fingir y el mas barato de hacer bien en 3D: la
// perspectiva hace todo el trabajo. Lo que lo vuelve una pieza y no una demo tecnica es que el
// espectador tenga contra que medir el avance — por eso hay columnas a los costados a intervalos
// regulares, polvo suspendido y un piso que refleja. Sin eso, avanzar y estar quieto se ven igual.
//
// LA COLUMNATA ES DE VIDRIO Y NO DE PIEDRA a proposito: el vidrio deja pasar la luz del fondo, asi que
// la profundidad se lee por CAPAS y no por oclusion. Con columnas opacas el cuadro se cierra y la
// pieza pasa de "un lugar" a "un pasillo".
//
// LOS SEIS TIEMPOS (beats sobre 40)
//   0   ESPACIO   la camara ya viene entrando; las columnas pasan y el piso refleja. Nada de texto.
//   5   MARCA     el nombre aparece SUSPENDIDO entre dos columnas, a la altura de los ojos.
//   11  PROMESA   el claim cruza el cuadro en una placa ancha mientras la camara sigue avanzando.
//   17  PRUEBA    la pagina del cliente, colgada como un panel vertical que la camara rodea.
//   25  RAZONES   las cifras aparecen en placas laterales, una por columna, a medida que se pasan.
//   33  PEDIDO    la camara frena, el atrio se abre y queda el CTA con el dominio debajo.
//
// LO QUE HACE SI FALTA MATERIAL
// Sin tira, el tiempo de PRUEBA muestra el recorte mas grande que haya en un marco del mismo tamaño;
// sin recortes tampoco, la columnata se cierra sobre si misma y el tiempo se acorta. Nunca queda un
// hueco vacio: lo que no hay, no se anuncia.

import { THREE, letras, cama, vidrio, metal, luz, barra, iluminar, domo, polvo, panelPagina } from '../nucleo.js'
import { LOOK, hex, nivel, nivelTexto, E, b, recortesDe, planoRecorte, topeNitido } from '../../demo/kit.js'
import { D, sello, repartirFrases } from '../../demo/datos.js'

export const meta = {
  id: 'atrio',
  nombre: 'Atrio de vidrio',
  familia: 'arquitectura',
  necesita: ['nada'],
  beats: 40,
  tiempos: { espacio: 0, marca: 5, promesa: 11, prueba: 17, razones: 25, pedido: 33 },
  // Para el estudio: que se ve, en una linea.
  pitch: 'Vuelo frontal por una columnata de vidrio. Sobrio, arquitectonico, de marca grande.',
}

const SEP = 7.2          // separacion entre pares de columnas, en unidades de mundo
const PARES = 14         // cuantos pares hay: el vuelo recorre `PARES * SEP` y sobra fondo

// DONDE PONER ALGO PARA QUE LA CAMARA LO LEA EN UN BEAT DADO.
//
// Esta funcion existe por un defecto que costo el primer render entero de Boveda. Coloque la marca, el
// claim y las cifras en z A OJO —"a dos columnas", "un poco mas alla"— y despues escribi sus tiempos en
// beats, tambien a ojo. A la velocidad del vuelo la camara pasaba la marca en el beat 1 y el texto se
// escribia en el 5: cuando aparecia, ya estaba detras. El video salio sin una sola palabra visible.
//
// El error de fondo no fue el numero, fue el METODO: en un vuelo continuo la posicion y el tiempo son
// la MISMA variable, y elegirlos por separado garantiza que no coincidan. Aca se elige el tiempo —que
// es lo que la narracion pide— y la posicion se deriva.
//
// `lectura` es a que distancia de la camara queda el objeto cuando le toca. Un valor cerca de
// `distBase` lo deja del tamaño con que fue compuesto; mas grande, mas chico y mas lejos.
function hacerZEn(Z0, ZF, beatsVuelo) {
  return (beat, lectura) => Z0 + (ZF - Z0) * (Math.min(beat, beatsVuelo) / beatsVuelo) - lectura
}

export function build(ctx) {
  const { escena, pagina, camara, tl, rnd, mundoW, distBase, texturas, datosEls } = ctx
  const uso = {}

  iluminar(escena, { key: 1.15, relleno: 0.55 })
  const uDomo = domo(escena, { fuerza: 0.26 })
  polvo(escena, 1100, 40)

  // EL VUELO SE DEFINE PRIMERO Y TODO LO DEMAS SE CUELGA DE EL. Ver `hacerZEn`: en una pieza que
  // avanza sin parar, la posicion de un objeto no es una decision de composicion sino una consecuencia
  // de cuando tiene que leerse.
  const BEATS_VUELO = 33
  const Z0 = distBase * 0.9
  const ZF = Z0 - SEP * (PARES - 2)
  const zEn = hacerZEn(Z0, ZF, BEATS_VUELO)

  // ---------------------------------------------------------------- el atrio
  //
  // Las columnas van EN PARES a los costados del eje de vuelo. El ancho del pasillo sale del cuadro y
  // no de un numero elegido: si fuera mas angosto que `mundoW` la camara las atravesaria.
  const X = mundoW * 0.62
  const ALTO = 26
  const gAtrio = new THREE.Group()
  escena.add(gAtrio)

  const matCol = vidrio(LOOK.acento, { rug: 0.06, trans: 0.72, grosor: 2.4, opacidad: 0.92 })
  // 0.55 y no 1.35: con el bloom encima, un emisivo fuerte convierte la columna entera en una
  // mancha blanca. Se vio en el primer render — las seis columnas salieron como losas de luz.
  const matCanto = luz(LOOK.acento2 || LOOK.acento, 0.55)
  const columnas = []
  for (let i = 0; i < PARES; i++) {
    for (const s of [-1, 1]) {
      const g = new THREE.Group()
      const col = new THREE.Mesh(new THREE.BoxGeometry(1.15, ALTO, 1.15), matCol)
      g.add(col)
      // Un canto de luz vertical sobre la cara interna. Es lo que hace que la columna se LEA al pasar:
      // el vidrio solo, a esta velocidad, es una sombra.
      const canto = new THREE.Mesh(new THREE.PlaneGeometry(0.055, ALTO * 0.92), matCanto)
      canto.position.set(-s * 0.60, 0, 0.58)
      g.add(canto)
      g.position.set(s * X, 0, Z0 - distBase * 0.4 - i * SEP)
      gAtrio.add(g)
      columnas.push(g)
    }
  }

  // El piso: un plano oscuro con un reflejo falso — una banda de acento que corre bajo el eje. Un
  // reflejo de verdad costaria un segundo render por cuadro y no se ve mas.
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(X * 4, PARES * SEP + 60),
    new THREE.MeshPhysicalMaterial({ color: hex(nivel(0.04)), roughness: 0.22, metalness: 0.55 }))
  piso.rotation.x = -Math.PI / 2
  piso.position.set(0, -ALTO / 2, -PARES * SEP * 0.45)
  escena.add(piso)
  const brillo = new THREE.Mesh(new THREE.PlaneGeometry(2.2, PARES * SEP + 60),
    new THREE.MeshBasicMaterial({ color: hex(LOOK.acento), transparent: true, opacity: 0.16, toneMapped: false, depthWrite: false }))
  brillo.rotation.x = -Math.PI / 2
  brillo.position.set(0, -ALTO / 2 + 0.02, -PARES * SEP * 0.45)
  escena.add(brillo)

  // ---------------------------------------------------------------- 2 · MARCA
  const gMarca = new THREE.Group()
  gMarca.position.set(0, 0.35, zEn(6.4, distBase * 0.92))
  escena.add(gMarca)
  const marca = letras(D.marca || 'MARCA', 1.55, nivelTexto(0.92), { fuente: 'Anton', tracking: 0.02, anchoMax: mundoW * 0.86 })
  gMarca.add(marca)
  uso.marca = !!D.marca
  // Un filete debajo, del ancho del nombre: ancla la palabra al espacio en vez de dejarla flotando.
  const fileteMarca = barra(marca.userData.ancho, 0.035, LOOK.acento, 1.6)
  fileteMarca.position.y = -1.15
  fileteMarca.scale.x = 0.0001
  gMarca.add(fileteMarca)
  const rot = String(D.rotulo || sello(0) || '').trim()
  let rotM = null
  if (rot) {
    rotM = letras(rot, 0.21, nivelTexto(0.66), { fuente: 'DMSans', tracking: 0.30, anchoMax: mundoW * 0.7 })
    rotM.position.y = -1.62
    gMarca.add(rotM)
  }

  // ---------------------------------------------------------------- 3 · PROMESA
  const claim = String(D.claim || '').trim()
  const gClaim = new THREE.Group()
  gClaim.position.set(0, 0.1, zEn(12.6, distBase * 0.95))
  escena.add(gClaim)
  let claimM = null
  if (claim) {
    claimM = letras(claim, 0.72, nivelTexto(0.90), { fuente: 'Bricolage', tracking: 0.01, anchoMax: mundoW * 0.92, upper: false })
    // CAMA SIEMPRE en esta plantilla, y no por medicion sino por construccion: detras del claim pasan
    // columnas de vidrio iluminadas, o sea que el fondo del texto CAMBIA mientras se lee. Garantizar el
    // fondo es la unica forma de que el contraste no dependa de en que columna cayo la palabra.
    const cm = cama(claimM.userData.ancho, claimM.userData.alto, { opacidad: 0.90, color: nivel(0.02) })
    gClaim.add(cm)
    gClaim.add(claimM)
    uso.claim = true
  }

  // ---------------------------------------------------------------- 4 · PRUEBA (la pagina)
  const gPagina = new THREE.Group()
  gPagina.position.set(0, 0, zEn(19.5, distBase * 1.02))
  pagina.add(gPagina)
  const ANCHO_P = mundoW * 0.60, ALTO_P = ANCHO_P * 1.62
  let panel = panelPagina(texturas.get('tira'), ANCHO_P, ALTO_P)
  if (!panel) {
    // Sin tira, el recorte mas grande que haya. `topeNitido` evita dibujarlo mas grande que sus pixeles.
    for (const e of recortesDe(datosEls, ['foto', 'tarjeta', 'logo'], 1)) {
      const t = texturas.get(e.url)
      if (!t || !t.image) continue
      const ar = (t.image.width || 1) / (t.image.height || 1)
      const w = Math.min(ANCHO_P, topeNitido(t.image, ctx.W, mundoW, 1.4))
      panel = planoRecorte(t, w / Math.max(0.05, ar))
      break
    }
  }
  if (panel) {
    panel.userData.encaja = true
    gPagina.add(panel)
    uso.pagina = true
    // Marco de metal: separa la pagina del espacio. Sin el, una captura blanca sobre un fondo claro
    // flota sin borde y se lee como un error de composicion.
    const marco = new THREE.Mesh(new THREE.PlaneGeometry(ANCHO_P + 0.16, ALTO_P + 0.16), metal(nivel(0.20), 0.28))
    marco.position.z = -0.02
    gPagina.add(marco)
  }

  // ---------------------------------------------------------------- 5 · RAZONES
  //
  // Las cifras van en placas LATERALES, alternando lado, una por par de columnas. Que aparezcan al
  // costado y no de frente es lo que aprovecha el vuelo: se leen porque la camara las pasa.
  const cifras = ((D.datos || []).filter(d => d && d.valor)).slice(0, 3)
  const placas = []
  cifras.forEach((c, i) => {
    const s = i % 2 === 0 ? -1 : 1
    const g = new THREE.Group()
    g.position.set(s * X * 0.66, 0.5 - i * 0.15, zEn(25.8 + i * 1.9, distBase * 0.80))
    g.rotation.y = s * 0.42
    escena.add(g)
    const val = letras(String(c.valor), 0.92, hex(LOOK.acento2 || LOOK.acento), { fuente: 'Anton', anchoMax: 3.4 })
    g.add(val)
    const et = letras(String(c.etiqueta || ''), 0.17, nivelTexto(0.70), { fuente: 'DMSans', tracking: 0.26, anchoMax: 3.4 })
    et.position.y = -0.72
    g.add(et)
    const fil = barra(2.2, 0.02, LOOK.acento, 1.4)
    fil.position.y = -0.5
    fil.scale.x = 0.0001
    g.add(fil)
    placas.push({ g, val, et, fil })
  })
  uso.cifras = cifras.length

  // Las frases del sitio, en el tramo de razones, sobre el eje.
  const frases = repartirFrases(2).filter(Boolean)
  const gFrases = []
  frases.forEach((f, i) => {
    const g = new THREE.Group()
    g.position.set(0, -1.9 - i * 0.05, zEn(27.2 + i * 2.4, distBase * 0.90))
    escena.add(g)
    const m = letras(String(f).replace(/\n/g, ' '), 0.30, nivelTexto(0.84), { fuente: 'DMSans', tracking: 0.04, anchoMax: mundoW * 0.82, upper: false })
    const cm = cama(m.userData.ancho, m.userData.alto, { opacidad: 0.86, color: nivel(0.02) })
    g.add(cm); g.add(m)
    gFrases.push({ g, m })
  })
  uso.frases = frases.length

  // ---------------------------------------------------------------- 6 · PEDIDO
  const gCTA = new THREE.Group()
  gCTA.position.set(0, 0.2, zEn(BEATS_VUELO, distBase * 0.86))
  escena.add(gCTA)
  const ctaTxt = String(D.cta || '').trim()
  let pill = null, ctaM = null
  if (ctaTxt) {
    ctaM = letras(ctaTxt, 0.34, hex(LOOK.bg), { fuente: 'DMSans', tracking: 0.10, anchoMax: mundoW * 0.6 })
    const w = ctaM.userData.ancho + 1.1, h = 0.92
    pill = new THREE.Mesh(new THREE.PlaneGeometry(w, h), luz(LOOK.acento, 1.0))
    pill.renderOrder = -1
    gCTA.add(pill); gCTA.add(ctaM)
    uso.cta = true
  }
  const dom = String(D.dominio || D.marca || '').trim()
  let domM = null
  if (dom) {
    domM = letras(dom, 0.22, nivelTexto(0.88), { fuente: 'DMSans', tracking: 0.22, anchoMax: mundoW * 0.7 })
    domM.position.y = ctaTxt ? -1.0 : 0
    // El dominio es lo que uno tipea despues de ver el video: cama, siempre. Es la leccion mas cara
    // que dejo el otro motor — su pie media 1.02:1 y era una mancha.
    const cd = cama(domM.userData.ancho, domM.userData.alto, { opacidad: 0.92, color: nivel(0.0) })
    cd.position.y = domM.position.y
    gCTA.add(cd); gCTA.add(domM)
    uso.dominio = true
  }

  // ================================================================ TIEMPO
  //
  // LA CAMARA AVANZA SIN PARAR de 0 a 33 y FRENA en el pedido. Que no pare nunca antes es lo que
  // sostiene la pieza: cada tiempo aparece porque la camara LLEGA, no porque algo se encienda.
  tl.fromTo(camara.position, { z: Z0 }, { z: ZF, duration: b(BEATS_VUELO), ease: 'none' }, 0)
  // Y FRENA. Los ultimos siete beats la camara casi no se mueve: el pedido es lo unico de la pieza que
  // el espectador tiene que poder leer sin apuro, y un CTA que pasa volando no se tipea.
  tl.to(camara.position, { z: ZF - 0.7, duration: b(7), ease: E.frena(2) }, b(BEATS_VUELO))
  // Una deriva lateral minima, para que el vuelo no sea un riel. Amplitud chica a proposito: mas que
  // esto y el atrio se lee torcido.
  tl.to(camara.position, { x: 0.42, duration: b(20), ease: E.vaiven() }, 0)
  tl.to(camara.position, { x: 0, duration: b(20), ease: E.vaiven() }, b(20))

  // 2 · MARCA — se escribe cuando la camara esta a dos columnas de distancia.
  marca.userData.u.uProg.value = 0
  tl.to(marca.userData.u.uProg, { value: 1.04, duration: b(1.6), ease: E.frena(2) }, b(5))
  tl.to(fileteMarca.scale, { x: 1, duration: b(1.1), ease: E.frena(3) }, b(6.1))
  if (rotM) {
    rotM.userData.u.uProg.value = 0
    tl.to(rotM.userData.u.uProg, { value: 1.04, duration: b(0.9), ease: E.frena(2) }, b(6.6))
  }
  // Y se apaga antes de que la camara la atraviese: un texto que pasa AL LADO de la camara se lee como
  // un error, no como un plano.
  tl.set(marca.userData.u.uDir, { value: 1 }, b(9.6))
  tl.to(marca.userData.u.uProg, { value: 0, duration: b(0.8), ease: E.acelera(2) }, b(9.6))
  if (rotM) {
    tl.set(rotM.userData.u.uDir, { value: 1 }, b(9.7))
    tl.to(rotM.userData.u.uProg, { value: 0, duration: b(0.7), ease: E.acelera(2) }, b(9.7))
  }
  tl.to(fileteMarca.scale, { x: 0.0001, duration: b(0.6), ease: E.acelera(3) }, b(9.8))

  if (claimM) {
    claimM.userData.u.uProg.value = 0
    gClaim.scale.setScalar(0.92)
    tl.to(claimM.userData.u.uProg, { value: 1.04, duration: b(2.2), ease: E.frena(2) }, b(11))
    tl.to(gClaim.scale, { x: 1, y: 1, z: 1, duration: b(3.0), ease: E.frena(2) }, b(11))
    tl.set(claimM.userData.u.uDir, { value: 1 }, b(15.6))
    tl.to(claimM.userData.u.uProg, { value: 0, duration: b(0.9), ease: E.acelera(2) }, b(15.6))
  }

  // 4 · PRUEBA — el panel gira un poco al pasar: es lo que lo convierte en OBJETO y no en cartel.
  if (panel) {
    gPagina.rotation.y = 0.55
    gPagina.scale.setScalar(0.86)
    tl.to(gPagina.rotation, { y: -0.16, duration: b(7.5), ease: 'none' }, b(16.5))
    tl.to(gPagina.scale, { x: 1, y: 1, z: 1, duration: b(2.4), ease: E.frena(2) }, b(17))
  }

  // 5 · RAZONES
  placas.forEach((p, i) => {
    const t0 = b(25 + i * 1.9)
    p.val.userData.u.uProg.value = 0
    p.et.userData.u.uProg.value = 0
    tl.to(p.val.userData.u.uProg, { value: 1.04, duration: b(0.8), ease: E.frena(3) }, t0)
    tl.to(p.fil.scale, { x: 1, duration: b(0.7), ease: E.frena(3) }, t0 + b(0.2))
    tl.to(p.et.userData.u.uProg, { value: 1.04, duration: b(0.7), ease: E.frena(2) }, t0 + b(0.35))
  })
  gFrases.forEach((f, i) => {
    const t0 = b(26.5 + i * 2.4)
    f.m.userData.u.uProg.value = 0
    tl.to(f.m.userData.u.uProg, { value: 1.04, duration: b(1.3), ease: E.frena(2) }, t0)
    tl.set(f.m.userData.u.uDir, { value: 1 }, t0 + b(2.0))
    tl.to(f.m.userData.u.uProg, { value: 0, duration: b(0.6), ease: E.acelera(2) }, t0 + b(2.0))
  })

  // 6 · PEDIDO
  if (pill) {
    pill.scale.set(0.0001, 1, 1)
    ctaM.userData.u.uProg.value = 0
    tl.to(pill.scale, { x: 1, duration: b(0.9), ease: E.frena(3) }, b(34))
    tl.to(ctaM.userData.u.uProg, { value: 1.04, duration: b(0.9), ease: E.frena(2) }, b(34.5))
    // Un latido en el beat, para que el CTA no quede quieto los ultimos seis beats.
    for (const bt of [36.5, 38.5]) {
      tl.to(gCTA.scale, { x: 1.035, y: 1.035, duration: b(0.16), ease: E.frena(2) }, b(bt))
      tl.to(gCTA.scale, { x: 1, y: 1, duration: b(0.5), ease: 'elastic.out(1, 0.5)' }, b(bt) + b(0.16))
    }
  }
  if (domM) {
    domM.userData.u.uProg.value = 0
    tl.to(domM.userData.u.uProg, { value: 1.04, duration: b(1.0), ease: E.frena(2) }, b(35.4))
  }

  // El bloom respira con el pedido: la pieza cierra con mas luz de la que empezo.
  tl.to(ctx.bloom, { strength: 1.25, duration: b(2.0), ease: E.frena(2) }, b(33))

  // ---- lo continuo, fuera de la timeline
  // El domo gira y el polvo deriva. Va en `alSeek` y no en tweens porque tiene que evaluarse en CADA
  // submuestra del obturador: un movimiento continuo escrito como tween se muestrea una vez por cuadro
  // y sale a saltos justo donde el obturador deberia barrerlo.
  const alSeek = (t) => {
    uDomo.uT.value = t
    gAtrio.position.y = Math.sin(t * 0.31) * 0.06
    if (panel) gPagina.position.y = Math.sin(t * 0.44 + 1.1) * 0.10
  }

  return { dur: b(meta.beats), alSeek, uso }
}
