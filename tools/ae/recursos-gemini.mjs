// LOS RECURSOS DEL ESTILO "CINEMATICA OSCURA CON LUZ DE BORDE" — el del video de referencia.
//
// Salen de mirar el video a resolucion completa, no de la descripcion. Lo que hace ese estilo son
// cinco cosas, y cuatro se hornean:
//
//   1. LUZ DE BORDE (rim light). El canto del panel tiene una franja azul->violeta encendida. Es la
//      firma: sin eso un panel en perspectiva es un rectangulo en perspectiva, con eso es un objeto
//      con materia. Se hornea en el PNG del panel.
//   2. CONTORNOS QUE BRILLAN. Las pildoras y los botones tienen un trazo con degradado y un halo
//      alrededor. Tambien horneado.
//   3. NEGRO PURO ALREDEDOR, con manchas grandes y suaves de luz de color detras de los objetos.
//   4. CONTENIDO DE VERDAD a resolucion enorme: la camara se acerca tanto que el texto de la interfaz
//      se lee gigante. Una captura de 900 px no sirve; hacen falta 2400.
//   5. PROFUNDIDAD DE CAMPO. Esta es la unica que NO se puede hornear bien, porque depende de donde
//      esta la camara en cada cuadro. Es B1 y no esta construido. Lo que si se puede es prehornear el
//      desenfoque en una capa que siempre esta lejos — y hay que decir que es eso, no profundidad de
//      campo de verdad.
//
// USO
//   node tools/ae/recursos-gemini.mjs [carpeta]

import { writeFileSync, mkdirSync, existsSync } from 'node:fs'

const DESTINO = process.argv[2] || 'C:/ae-probe/recursos-g'
if (!existsSync(DESTINO)) mkdirSync(DESTINO, { recursive: true })
const { createCanvas, loadImage } = await import('@napi-rs/canvas')

const P = {
  negro: '#000000', casi: '#05060a',
  chapa0: '#141821', chapa1: '#0a0d14',
  tinta: '#e8ecf5', suave: '#9aa4bb',
  azul: '#4a9eff', violeta: '#a06bff', cian: '#3fd8ff',
  verde: '#5ee39a', naranja: '#ff8a4a', rosa: '#ff5c9e',
}
const guardar = (n, cv) => { writeFileSync(`${DESTINO}/${n}.png`, cv.toBuffer('image/png')); return n }
const lienzo = (w, h) => { const cv = createCanvas(w, h); return [cv, cv.getContext('2d')] }
function ruta(g, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2)
  g.beginPath()
  g.moveTo(x + rr, y)
  g.lineTo(x + w - rr, y); g.arcTo(x + w, y, x + w, y + rr, rr)
  g.lineTo(x + w, y + h - rr); g.arcTo(x + w, y + h, x + w - rr, y + h, rr)
  g.lineTo(x + rr, y + h); g.arcTo(x, y + h, x, y + h - rr, rr)
  g.lineTo(x, y + rr); g.arcTo(x, y, x + rr, y, rr)
  g.closePath()
}
const rgba = (hex, a) => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))
  return `rgba(${r},${g},${b},${a})`
}

// ---------------------------------------------------------------- EL PANEL CON LUZ DE BORDE
//
// El margen es grande a proposito: el halo de la luz de borde vive AFUERA del panel, y si el lienzo
// termina donde termina la chapa el halo se corta y se ve el corte. Es el mismo cuidado que ya costo
// un borde recortado en los paneles anteriores, con mas margen porque el halo es mas grande.
function panelLuz(nombre, w, h, opciones) {
  const o = opciones || {}
  // EL MARGEN SE CALCULA CONTRA EL DESENFOQUE, no se elige. Un `shadowBlur` de 70 aplicado dos veces
  // tiene cola bastante mas alla de 70 px; con 90 de margen la caida se CORTA contra el borde del
  // lienzo y queda un rectangulo visible alrededor del halo — que es exactamente lo que se ve en el
  // video como "se nota donde termina el bloom". Tres veces el desenfoque deja la cola llegar a cero
  // adentro del PNG.
  const DESENFOQUE = 70
  const M = DESENFOQUE * 3
  const r = o.radio === undefined ? 26 : o.radio
  const [cv, g] = lienzo(w + M * 2, h + M * 2)
  const x = M, y = M

  // 1. el halo exterior, que es lo que hace que el panel "emita" en vez de "estar pegado"
  const halo = g.createLinearGradient(x, y, x + w * 0.4, y + h)
  halo.addColorStop(0, rgba(o.luzA || P.azul, 0.55))
  halo.addColorStop(0.55, rgba(o.luzB || P.violeta, 0.34))
  halo.addColorStop(1, rgba(o.luzB || P.violeta, 0.0))
  g.save()
  g.shadowColor = rgba(o.luzA || P.azul, 0.9)
  g.shadowBlur = DESENFOQUE
  ruta(g, x - 2, y - 2, w + 4, h + 4, r + 2)
  g.fillStyle = halo
  g.fill()
  g.shadowBlur = DESENFOQUE * 0.55
  g.fill()
  g.restore()

  // 2. la chapa: casi negra, con un degradado muy sutil para que no sea plana
  const chapa = g.createLinearGradient(x, y, x + w * 0.6, y + h)
  chapa.addColorStop(0, o.chapaA || P.chapa0)
  chapa.addColorStop(1, o.chapaB || P.chapa1)
  ruta(g, x, y, w, h, r); g.fillStyle = chapa; g.fill()

  // 3. LA LUZ DE BORDE. Un trazo de 3 px con degradado a lo largo del canto, mas brillante en el borde
  // que mira a la fuente de luz. Es lo que se ve en el video como una franja azul en el canto izquierdo.
  const borde = g.createLinearGradient(x, y, x + w, y + h)
  borde.addColorStop(0, o.luzA || P.azul)
  borde.addColorStop(0.5, o.luzB || P.violeta)
  borde.addColorStop(1, rgba(o.luzB || P.violeta, 0.25))
  ruta(g, x + 1.5, y + 1.5, w - 3, h - 3, r - 1.5)
  g.strokeStyle = borde; g.lineWidth = 3; g.stroke()

  // 4. EL CONTENIDO VA ADENTRO DEL MISMO RECURSO, y esto no es comodidad: es haber eliminado una
  // ambiguedad que ya costo dos vueltas.
  //
  // Tener el chasis y la pantalla como dos capas emparentadas parecia mejor —la captura pasaba a ser
  // el parametro reemplazable de la plantilla— y trajo dos defectos seguidos. Primero, AE PRESERVA la
  // transformacion de mundo al asignar un padre, asi que la pantalla se quedo plana mientras el chasis
  // giraba 34 grados: las dos se cruzaban formando una X. Y despues, corregido eso, la posicion del
  // hijo no cayo donde la cuenta decia: medida, la pantalla proyectaba 1550 px donde la placa media
  // 1358.
  //
  // Compuesta adentro, no hay padre, no hay origen que interpretar y no hay dos capas que se puedan
  // desalinear. Y la plantilla no pierde nada: cambiar la captura es volver a generar el recurso, que
  // ya es un paso del build.
  if (o.contenido) {
    g.save()
    ruta(g, x, y, w, h, r); g.clip()
    g.drawImage(o.contenido, x, y, w, h)
    g.restore()
  }

  // 5. y el canto izquierdo encendido de verdad: una franja vertical que es la fuente. Va DESPUES del
  // contenido, porque es luz que cae sobre el, no debajo.
  g.save()
  ruta(g, x, y, w, h, r); g.clip()
  const canto = g.createLinearGradient(x, y, x + 26, y)
  canto.addColorStop(0, rgba(o.luzA || P.azul, 0.85))
  canto.addColorStop(1, rgba(o.luzA || P.azul, 0))
  g.fillStyle = canto; g.fillRect(x, y, 26, h)
  g.restore()
  return guardar(nombre, cv)
}

// ---------------------------------------------------------------- LA PILDORA QUE BRILLA
function pildoraLuz(nombre, w, h, etiqueta, opciones) {
  const o = opciones || {}
  const DESENFOQUE = 55
  const M = DESENFOQUE * 3          // el halo tiene que llegar a cero ADENTRO del lienzo
  const [cv, g] = lienzo(w + M * 2, h + M * 2)
  const x = M, y = M, r = h / 2

  g.save()
  g.shadowColor = rgba(o.luzA || P.azul, 0.95)
  g.shadowBlur = DESENFOQUE
  ruta(g, x, y, w, h, r)
  g.fillStyle = rgba(o.luzA || P.azul, 0.5)
  g.fill(); g.fill()
  g.restore()

  ruta(g, x, y, w, h, r)
  g.fillStyle = '#0e1119'; g.fill()

  const trazo = g.createLinearGradient(x, y, x + w, y + h)
  trazo.addColorStop(0, o.luzA || P.azul)
  trazo.addColorStop(1, o.luzB || P.violeta)
  ruta(g, x + 1.25, y + 1.25, w - 2.5, h - 2.5, r - 1.25)
  g.strokeStyle = trazo; g.lineWidth = 2.5; g.stroke()

  if (etiqueta) {
    g.fillStyle = P.tinta
    g.font = `${Math.round(h * 0.42)}px "Segoe UI"`
    g.textBaseline = 'middle'
    const anchoT = g.measureText(etiqueta).width
    g.fillText(etiqueta, x + (w - anchoT) / 2 + 14, y + h / 2 + 1)
    // el icono, un trazo simple a la izquierda del texto
    g.strokeStyle = P.cian; g.lineWidth = 2.5
    const ix = x + (w - anchoT) / 2 - 24, iy = y + h / 2
    g.beginPath(); g.moveTo(ix - 9, iy + 7); g.lineTo(ix + 7, iy - 9); g.stroke()
    g.beginPath(); g.moveTo(ix - 9, iy - 6); g.lineTo(ix - 5, iy - 2); g.stroke()
  }
  return guardar(nombre, cv)
}

// ---------------------------------------------------------------- MANCHA DE LUZ DE FONDO
// Grande y muy suave: es lo que separa el negro puro de un negro que tiene aire adentro.
function mancha(nombre, diam, colorA, colorB) {
  const [cv, g] = lienzo(diam, diam)
  const s = g.createRadialGradient(diam / 2, diam / 2, 0, diam / 2, diam / 2, diam / 2)
  s.addColorStop(0, rgba(colorA, 0.42))
  s.addColorStop(0.28, rgba(colorA, 0.20))
  s.addColorStop(0.6, rgba(colorB, 0.07))
  s.addColorStop(1, rgba(colorB, 0))
  g.fillStyle = s; g.fillRect(0, 0, diam, diam)
  return guardar(nombre, cv)
}

// ---------------------------------------------------------------- LAS PANTALLAS, EN GRANDE
//
// A 2400 px de ancho y no a 900: la camara de este estilo se acerca hasta que una linea de codigo
// ocupa un tercio del cuadro. Con una captura chica el texto se ve como una mancha, y eso es
// exactamente el defecto de nitidez que este repo mide con `nitidez-inventario`.
function pantallaCodigo(nombre) {
  const W = 2400, H = 1500
  const [cv, g] = lienzo(W, H)
  g.fillStyle = '#0b0e15'; g.fillRect(0, 0, W, H)

  // la barra de numeros de linea
  g.fillStyle = '#070910'; g.fillRect(0, 0, 110, H)
  g.fillStyle = '#3a4256'; g.font = '30px "Cascadia Mono", monospace'
  for (let i = 0; i < 34; i++) g.fillText(String(10 + i), 34, 70 + i * 42)

  const LINEAS = [
    [['const ', '#c792ea'], ['escena', '#e8ecf5'], [' = ', '#89ddff'], ['new ', '#c792ea'], ['THREE', '#ffcb6b'], ['.Scene();', '#89ddff']],
    [['const ', '#c792ea'], ['camara', '#e8ecf5'], [' = ', '#89ddff'], ['new ', '#c792ea'], ['THREE', '#ffcb6b'], ['.PerspectiveCamera(', '#89ddff']],
    [['  fov', '#82aaff'], [', ', '#89ddff'], ['ancho', '#e8ecf5'], [' / ', '#89ddff'], ['alto', '#e8ecf5'], [', ', '#89ddff'], ['1', '#f78c6c'], [', ', '#89ddff'], ['100000', '#f78c6c']],
    [[');', '#89ddff']],
    [['', '#e8ecf5']],
    [['// la matriz se arma en coordenadas de AE', '#546e7a']],
    [['const ', '#c792ea'], ['M', '#e8ecf5'], [' = ', '#89ddff'], ['trasladar', '#82aaff'], ['(pos)', '#89ddff']],
    [['  .', '#89ddff'], ['multiply', '#82aaff'], ['(rotX).', '#89ddff'], ['multiply', '#82aaff'], ['(rotY)', '#89ddff']],
    [['  .', '#89ddff'], ['multiply', '#82aaff'], ['(rotZ).', '#89ddff'], ['multiply', '#82aaff'], ['(escalar);', '#89ddff']],
    [['', '#e8ecf5']],
    [['malla', '#e8ecf5'], ['.matrix.', '#89ddff'], ['copy', '#82aaff'], ['(PHI).', '#89ddff'], ['multiply', '#82aaff'], ['(M);', '#89ddff']],
    [['', '#e8ecf5']],
    [['// medido contra After Effects: 0,014 px', '#546e7a']],
    [['export ', '#c792ea'], ['function ', '#c792ea'], ['proyectar', '#82aaff'], ['(capa, t) {', '#89ddff']],
    [['  return ', '#c792ea'], ['esquinas', '#82aaff'], ['(capa, t).', '#89ddff'], ['map', '#82aaff'], ['(aPantalla);', '#89ddff']],
    [['}', '#89ddff']],
  ]
  g.font = '34px "Cascadia Mono", monospace'
  LINEAS.forEach((linea, i) => {
    let x = 150
    for (const [txt, col] of linea) { g.fillStyle = col; g.fillText(txt, x, 78 + i * 44); x += g.measureText(txt).width }
  })

  // el bloque seleccionado, con el degradado azul->violeta del video
  const sel = g.createLinearGradient(150, 340, 1100, 560)
  sel.addColorStop(0, rgba(P.azul, 0.30)); sel.addColorStop(1, rgba(P.violeta, 0.30))
  g.fillStyle = sel; g.fillRect(150, 336, 950, 226)

  return guardar(nombre, cv)
}

function pantallaChat(nombre) {
  const W = 2000, H = 1400
  const [cv, g] = lienzo(W, H)
  g.fillStyle = '#0b0e15'; g.fillRect(0, 0, W, H)
  g.fillStyle = '#9aa4bb'; g.font = '34px "Segoe UI"'
  g.fillText('cliping.ia', 70, 80)
  g.fillStyle = '#3a4256'; g.font = '26px "Segoe UI"'
  g.fillText('motor 3D', 70, 124)

  const d = g.createLinearGradient(70, 380, 1300, 520)
  d.addColorStop(0, P.azul); d.addColorStop(1, P.violeta)
  g.fillStyle = d; g.font = '108px "Segoe UI Light"'
  g.fillText('Hola, Jero', 70, 470)

  // las burbujas de sugerencia
  const sug = ['una pieza de producto', 'datos que se leen', 'el remate']
  g.font = '30px "Segoe UI"'
  sug.forEach((t, i) => {
    const w = g.measureText(t).width + 70
    ruta(g, 70, 700 + i * 96, w, 74, 37)
    g.fillStyle = '#12161f'; g.fill()
    g.strokeStyle = '#232a38'; g.lineWidth = 1.5; g.stroke()
    g.fillStyle = '#9aa4bb'; g.fillText(t, 105, 748 + i * 96)
  })

  ruta(g, 70, H - 170, W - 140, 96, 48)
  g.fillStyle = '#10141d'; g.fill()
  g.strokeStyle = '#232a38'; g.lineWidth = 1.5; g.stroke()
  g.fillStyle = '#546e7a'; g.font = '32px "Segoe UI"'
  g.fillText('Pedile a cliping que arme la pieza', 120, H - 108)
  return guardar(nombre, cv)
}

const hechos = []
hechos.push(pantallaCodigo('pantalla-codigo'))
hechos.push(pantallaChat('pantalla-chat'))
const imgCodigo = await loadImage(`${DESTINO}/pantalla-codigo.png`)
const imgChat = await loadImage(`${DESTINO}/pantalla-chat.png`)
hechos.push(panelLuz('panel-codigo', 2400, 1500, { luzA: P.azul, luzB: P.violeta, radio: 30, contenido: imgCodigo }))
hechos.push(panelLuz('panel-chat', 2000, 1400, { luzA: P.cian, luzB: P.azul, radio: 30, contenido: imgChat }))
hechos.push(panelLuz('panel-chico', 1100, 700, { luzA: P.violeta, luzB: P.rosa, radio: 26 }))
// AL DOBLE, PORQUE ASI SE DIBUJAN. La compuerta de lectura las midio a 0,59x de su resolucion nativa
// en su peor cuadro: se estiraban un 70%, o sea que el trazo encendido y el texto de adentro llegaban
// borrosos. La regla Q2 pide entre 2x y 4x de lo dibujado, y el diagnostico que corrige es el mas
// comun: texto de interfaz borroso NO es profundidad de campo, es rasterizacion.
hechos.push(pildoraLuz('pildora-pedir', 1240, 240, 'Pedile a cliping', { luzA: P.azul, luzB: P.violeta }))
// SIN ETIQUETA HORNEADA. Con el texto adentro del PNG, las seis sugerencias decian todas "Medilo":
// una palabra repetida seis veces en pantalla. El texto va como capa de AE, que ademas lo vuelve un
// parametro de la plantilla.
hechos.push(pildoraLuz('pildora-chip', 1040, 220, null, { luzA: P.cian, luzB: P.azul }))
hechos.push(mancha('mancha-azul', 1800, P.azul, P.violeta))
hechos.push(mancha('mancha-violeta', 1600, P.violeta, P.rosa))
hechos.push(mancha('mancha-cian', 1400, P.cian, P.azul))


console.log(`${hechos.length} recursos -> ${DESTINO}`)
console.log(hechos.join(' · '))
