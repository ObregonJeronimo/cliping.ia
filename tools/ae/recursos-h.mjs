// LA BIBLIOTECA DE LA PIEZA-H — recreacion 1:1 de la estructura del video de referencia.
//
// Sale de mirar el video entero: 120 cuadros extraidos a 2 por segundo, cinco hojas de contacto, y de
// ahi el mapa de los treinta tiempos. No es de memoria ni de la descripcion.
//
// LO QUE EL ESTILO NECESITA, y que se hornea porque el motor no lo da:
//   · luz de borde en cada panel (franja encendida + halo) — la firma del estilo
//   · contornos encendidos en pildoras y botones
//   · manchas grandes de luz muy suave sobre negro puro
//   · pantallas de interfaz a resolucion grande (la camara se acerca mucho)
//   · la ESTRELLA de cuatro puntas, que abre y cierra la pieza
//   · arcos de encuadre, que aparecen en el tramo de comentarios
//
// LO QUE NO SE PUEDE HORNEAR: la profundidad de campo real (B1, no construido) y el tipeo — que en el
// motor se resuelve con una capa por caracter y opacidad, no con animadores de texto (no viajan).
//
// USO
//   node tools/ae/recursos-h.mjs [carpeta]

import { writeFileSync, mkdirSync, existsSync } from 'node:fs'

const DESTINO = process.argv[2] || 'C:/ae-probe/recursos-h'
if (!existsSync(DESTINO)) mkdirSync(DESTINO, { recursive: true })
const { createCanvas, loadImage } = await import('@napi-rs/canvas')

export const P = {
  negro: '#000000',
  chapa0: '#1b1e26', chapa1: '#0e1116', chapaClara: '#2a2f3a',
  tinta: '#f1f3f7', suave: '#9aa3b5', tenue: '#5b6478',
  azul: '#5b8dff', azul2: '#8ab4ff', violeta: '#a97bff', cian: '#4fd8ff',
  verde: '#5ee39a', ambar: '#ffc46b', rosa: '#ff7ab8',
}
const guardar = (n, cv) => { writeFileSync(`${DESTINO}/${n}.png`, cv.toBuffer('image/png')); return n }
const lienzo = (w, h) => { const cv = createCanvas(w, h); return [cv, cv.getContext('2d')] }
const rgba = (hex, a) => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))
  return `rgba(${r},${g},${b},${a})`
}
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

// ---------------------------------------------------------------- chasis con luz de borde
// El margen es TRES VECES el desenfoque, no un numero elegido: con menos, la caida del halo se corta
// contra el borde del lienzo y queda un rectangulo visible alrededor. Ya lo pague una vez.
// `k` es el MULTIPLICADOR DE PIXELES NATIVOS: se dibuja en las mismas coordenadas logicas pero sobre un
// lienzo k veces mas grande, con `g.scale`. Existe porque Q2 pide entre 2x y 4x del tamano dibujado, y
// los objetos que en algun momento llenan el cuadro —el conmutador, la tarjeta— salian a 0,8x. Subir el
// numero aca es gratis; descubrirlo mirando un cuadro borroso, no.
function chasis(nombre, w, h, o) {
  o = o || {}
  const k = o.k || 1
  const DES = 70, M = DES * 3, r = o.radio === undefined ? 26 : o.radio
  const [cv, g] = lienzo((w + M * 2) * k, (h + M * 2) * k)
  g.scale(k, k)
  const x = M, y = M

  g.save()
  g.shadowColor = rgba(o.luzA || P.azul, 0.9); g.shadowBlur = DES
  ruta(g, x, y, w, h, r)
  const halo = g.createLinearGradient(x, y, x + w * 0.5, y + h)
  halo.addColorStop(0, rgba(o.luzA || P.azul, 0.5))
  halo.addColorStop(1, rgba(o.luzB || P.violeta, 0.28))
  g.fillStyle = halo; g.fill()
  g.shadowBlur = DES * 0.5; g.fill()
  g.restore()

  ruta(g, x, y, w, h, r)
  const chapaG = g.createLinearGradient(x, y, x + w * 0.6, y + h)
  chapaG.addColorStop(0, o.chapaA || P.chapa0)
  chapaG.addColorStop(1, o.chapaB || P.chapa1)
  g.fillStyle = chapaG; g.fill()

  if (o.contenido) {
    g.save(); ruta(g, x, y, w, h, r); g.clip()
    g.drawImage(o.contenido, x, y, w, h)
    g.restore()
  }

  // el trazo del canto, con degradado: es lo que se lee como "el objeto emite"
  const borde = g.createLinearGradient(x, y + h, x + w, y)
  borde.addColorStop(0, o.luzA || P.azul)
  borde.addColorStop(0.55, o.luzB || P.violeta)
  borde.addColorStop(1, rgba(o.luzA || P.azul, 0.2))
  ruta(g, x + 1.5, y + 1.5, w - 3, h - 3, r - 1.5)
  g.strokeStyle = borde; g.lineWidth = 3.5; g.stroke()

  // y el canto inferior encendido de verdad: en la referencia es el borde de abajo el que brilla
  g.save(); ruta(g, x, y, w, h, r); g.clip()
  const abajo = g.createLinearGradient(0, y + h, 0, y + h - 22)
  abajo.addColorStop(0, rgba(o.luzA || P.azul, 0.9))
  abajo.addColorStop(1, rgba(o.luzA || P.azul, 0))
  g.fillStyle = abajo; g.fillRect(x, y + h - 22, w, 22)
  g.restore()
  return guardar(nombre, cv)
}

function pildora(nombre, w, h, o) {
  o = o || {}
  const k = o.k || 1
  const DES = 55, M = DES * 3
  const [cv, g] = lienzo((w + M * 2) * k, (h + M * 2) * k)
  g.scale(k, k)
  const x = M, y = M, r = h / 2
  g.save()
  g.shadowColor = rgba(o.luzA || P.azul, 0.95); g.shadowBlur = DES
  ruta(g, x, y, w, h, r); g.fillStyle = rgba(o.luzA || P.azul, 0.45)
  g.fill(); g.fill()
  g.restore()
  ruta(g, x, y, w, h, r); g.fillStyle = o.relleno || '#12151c'; g.fill()
  const trazo = g.createLinearGradient(x, y, x + w, y + h)
  trazo.addColorStop(0, o.luzA || P.azul); trazo.addColorStop(1, o.luzB || P.violeta)
  ruta(g, x + 1.5, y + 1.5, w - 3, h - 3, r - 1.5)
  g.strokeStyle = trazo; g.lineWidth = 3; g.stroke()
  return guardar(nombre, cv)
}

function mancha(nombre, d, a, b, fuerza) {
  const [cv, g] = lienzo(d, d)
  const s = g.createRadialGradient(d / 2, d / 2, 0, d / 2, d / 2, d / 2)
  s.addColorStop(0, rgba(a, fuerza)); s.addColorStop(0.3, rgba(a, fuerza * 0.45))
  s.addColorStop(0.62, rgba(b, fuerza * 0.14)); s.addColorStop(1, rgba(b, 0))
  g.fillStyle = s; g.fillRect(0, 0, d, d)
  return guardar(nombre, cv)
}

// ---------------------------------------------------------------- LA ESTRELLA
// Cuatro puntas concavas. Abre la pieza sola sobre negro y la cierra dentro de la pildora: es el unico
// elemento que aparece dos veces, y por eso es el simbolo.
function estrella(nombre, d, color) {
  const M = Math.round(d * 0.35)
  const [cv, g] = lienzo(d + M * 2, d + M * 2)
  const c = d / 2 + M, R = d / 2, r = d * 0.11
  g.save()
  g.shadowColor = rgba(color, 0.85); g.shadowBlur = d * 0.28
  g.beginPath()
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 - Math.PI / 2
    const am = a + Math.PI / 4
    if (i === 0) g.moveTo(c + Math.cos(a) * R, c + Math.sin(a) * R)
    else g.lineTo(c + Math.cos(a) * R, c + Math.sin(a) * R)
    g.quadraticCurveTo(c + Math.cos(am) * r * 0.6, c + Math.sin(am) * r * 0.6,
                       c + Math.cos(a + Math.PI / 2) * R, c + Math.sin(a + Math.PI / 2) * R)
  }
  g.closePath()
  const relleno = g.createLinearGradient(c - R, c - R, c + R, c + R)
  relleno.addColorStop(0, P.azul2); relleno.addColorStop(1, color)
  g.fillStyle = relleno; g.fill(); g.fill()
  g.restore()
  return guardar(nombre, cv)
}

// ---------------------------------------------------------------- arcos de encuadre
// En la referencia aparecen arriba y abajo del cuadro en el tramo de comentarios: dan la sensacion de
// estar mirando a traves de algo.
function arco(nombre, w, h, color) {
  const [cv, g] = lienzo(w, h)
  for (let k = 0; k < 3; k++) {
    g.beginPath()
    g.ellipse(w / 2, h + h * 0.6, w * (0.34 + k * 0.14), h * (0.9 + k * 0.34), 0, Math.PI, Math.PI * 2)
    g.strokeStyle = rgba(k === 1 ? P.violeta : color, 0.55 - k * 0.14)
    g.lineWidth = 3 - k * 0.6
    g.stroke()
  }
  return guardar(nombre, cv)
}

// ---------------------------------------------------------------- destello de barrido
// El haz blanco que cruza el cuadro y revela el titular. Es una elipse muy estirada con caida suave.
function destello(nombre, w, h) {
  const [cv, g] = lienzo(w, h)
  const s = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2)
  s.addColorStop(0, 'rgba(255,255,255,0.95)')
  s.addColorStop(0.12, 'rgba(220,235,255,0.55)')
  s.addColorStop(0.4, 'rgba(120,170,255,0.16)')
  s.addColorStop(1, 'rgba(90,140,255,0)')
  g.save(); g.translate(w / 2, h / 2); g.scale(1, h / w); g.translate(-w / 2, -h / 2)
  g.fillStyle = s; g.fillRect(0, 0, w, w)
  g.restore()
  return guardar(nombre, cv)
}

// ================================================================ LAS PANTALLAS
// Grandes, porque la camara se acerca hasta que una linea ocupa un tercio del cuadro.

function base(w, h) {
  const [cv, g] = lienzo(w, h)
  g.fillStyle = '#0f1218'; g.fillRect(0, 0, w, h)
  return [cv, g]
}
function barraApp(g, w, titulo) {
  g.fillStyle = '#0a0c11'; g.fillRect(0, 0, w, 66)
  g.fillStyle = '#1c2029'; g.fillRect(0, 65, w, 1)
  g.fillStyle = P.suave; g.font = '26px "Segoe UI"'
  g.fillText(titulo, 34, 42)
}

function pantallaHola(nombre) {
  const W = 2200, H = 1400
  const [cv, g] = base(W, H)
  barraApp(g, W, 'cliping  ·  motor 3D')
  g.fillStyle = P.tenue; g.font = '26px "Segoe UI"'
  g.fillText('2.0 Flash', 34, 108)
  const d = g.createLinearGradient(W * 0.22, H / 2 - 80, W * 0.78, H / 2 + 60)
  d.addColorStop(0, P.azul2); d.addColorStop(1, P.violeta)
  g.fillStyle = d; g.font = '132px "Segoe UI Light"'
  const t = 'Hola, Thiago'
  g.fillText(t, (W - g.measureText(t).width) / 2, H / 2 + 36)
  ruta(g, W * 0.2, H - 180, W * 0.6, 92, 46)
  g.fillStyle = '#151922'; g.fill()
  g.strokeStyle = '#262c38'; g.lineWidth = 1.5; g.stroke()
  g.fillStyle = P.tenue; g.font = '28px "Segoe UI"'
  g.fillText('Pedile a cliping', W * 0.2 + 44, H - 122)
  return guardar(nombre, cv)
}

function pantallaDoc(nombre, conBarra) {
  const W = 2200, H = 1500
  const [cv, g] = base(W, H)
  barraApp(g, W, 'documento')
  g.fillStyle = P.tinta; g.font = '46px "Segoe UI"'
  g.fillText('Comunicacion: elegir el registro', 90, 176)
  const LIN = [
    ['Buen dia. La comunicacion es la base de la interaccion humana.', 0],
    ['Somos criaturas sociales: asi nos conectamos, compartimos y', 0],
    ['construimos relaciones. Desde lo mas basico hasta lo complejo,', 1],
    ['la comunicacion nos permite coordinar y entendernos.', 0],
    ['', 0],
    ['Los distintos registros cambian como se recibe un mensaje.', 0],
    ['La forma en que se dice —tono, lenguaje, gestos— se interpreta.', 1],
    ['Un mensaje dicho con firmeza no cae igual que uno dicho al pasar.', 0],
    ['Entender esa diferencia es lo que separa hablar de comunicar.', 0],
  ]
  g.font = '32px "Segoe UI Light"'
  LIN.forEach(([t, resaltado], i) => {
    const y = 268 + i * 52
    if (resaltado) {
      const an = g.measureText(t).width
      const s = g.createLinearGradient(88, y - 32, 88 + an, y + 8)
      s.addColorStop(0, rgba(P.azul, 0.30)); s.addColorStop(1, rgba(P.violeta, 0.30))
      g.fillStyle = s; g.fillRect(88, y - 32, an + 8, 44)
    }
    g.fillStyle = resaltado ? P.azul2 : P.suave
    g.fillText(t, 90, y)
  })
  if (conBarra) {
    // la barra flotante de herramientas de la derecha
    ruta(g, W - 150, 300, 96, 480, 48)
    g.fillStyle = '#171b24'; g.fill()
    g.strokeStyle = rgba(P.violeta, 0.5); g.lineWidth = 2; g.stroke()
    g.strokeStyle = P.suave; g.lineWidth = 2.5
    for (let i = 0; i < 4; i++) {
      const cy = 372 + i * 112
      g.strokeRect(W - 122, cy - 18, 40, 36)
    }
  }
  return guardar(nombre, cv)
}

function pantallaCodigo(nombre) {
  const W = 2400, H = 1500
  const [cv, g] = base(W, H)
  g.fillStyle = '#0a0c11'; g.fillRect(0, 0, 108, H)
  g.fillStyle = '#333a4a'; g.font = '30px "Cascadia Mono", monospace'
  for (let i = 0; i < 32; i++) g.fillText(String(10 + i), 30, 74 + i * 44)
  const L = [
    [['const ', '#c792ea'], ['escena', P.tinta], [' = ', '#89ddff'], ['new ', '#c792ea'], ['THREE', '#ffcb6b'], ['.Scene();', '#89ddff']],
    [['const ', '#c792ea'], ['camara', P.tinta], [' = ', '#89ddff'], ['new ', '#c792ea'], ['THREE', '#ffcb6b'], ['.PerspectiveCamera(', '#89ddff']],
    [['  fov', '#82aaff'], [', ', '#89ddff'], ['ancho', P.tinta], [' / ', '#89ddff'], ['alto', P.tinta], [', ', '#89ddff'], ['1', '#f78c6c'], [', ', '#89ddff'], ['100000', '#f78c6c'], [');', '#89ddff']],
    [['', P.tinta]],
    [['// la matriz se arma en coordenadas de AE', '#546e7a']],
    [['const ', '#c792ea'], ['M', P.tinta], [' = ', '#89ddff'], ['trasladar', '#82aaff'], ['(pos)', '#89ddff']],
    [['  .', '#89ddff'], ['multiply', '#82aaff'], ['(rotX).', '#89ddff'], ['multiply', '#82aaff'], ['(rotY)', '#89ddff']],
    [['  .', '#89ddff'], ['multiply', '#82aaff'], ['(rotZ).', '#89ddff'], ['multiply', '#82aaff'], ['(escalar);', '#89ddff']],
    [['', P.tinta]],
    [['malla', P.tinta], ['.matrix.', '#89ddff'], ['copy', '#82aaff'], ['(PHI).', '#89ddff'], ['multiply', '#82aaff'], ['(M);', '#89ddff']],
    [['', P.tinta]],
    [['// medido contra After Effects: 0,014 px', '#546e7a']],
    [['export ', '#c792ea'], ['function ', '#c792ea'], ['proyectar', '#82aaff'], ['(capa, t) {', '#89ddff']],
    [['  return ', '#c792ea'], ['esquinas', '#82aaff'], ['(capa, t).', '#89ddff'], ['map', '#82aaff'], ['(aPantalla);', '#89ddff']],
    [['}', '#89ddff']],
  ]
  g.font = '34px "Cascadia Mono", monospace'
  L.forEach((linea, i) => {
    let x = 150
    for (const [t, col] of linea) { g.fillStyle = col; g.fillText(t, x, 74 + i * 44); x += g.measureText(t).width }
  })
  const sel = g.createLinearGradient(150, 296, 1150, 500)
  sel.addColorStop(0, rgba(P.azul, 0.28)); sel.addColorStop(1, rgba(P.violeta, 0.28))
  g.fillStyle = sel; g.fillRect(150, 292, 1000, 200)
  return guardar(nombre, cv)
}

function pantallaLinea(nombre) {
  const W = 2200, H = 1400
  const [cv, g] = base(W, H)
  barraApp(g, W, 'linea de tiempo')
  const ANOS = ['1998', '1999', '2000', '2001', '2002']
  g.strokeStyle = '#2a3040'; g.lineWidth = 2
  g.beginPath(); g.moveTo(120, 520); g.lineTo(W - 120, 520); g.stroke()
  ANOS.forEach((a, i) => {
    const x = 180 + i * ((W - 400) / 4)
    g.fillStyle = '#1b2130'; ruta(g, x - 90, 560, 240, 74, 12); g.fill()
    g.strokeStyle = rgba(P.azul, 0.4); g.lineWidth = 1.5; g.stroke()
    g.fillStyle = P.suave; g.font = '30px "Segoe UI"'; g.fillText(a, x - 60, 608)
    g.fillStyle = i === 2 ? P.azul : '#39415a'
    g.beginPath(); g.arc(x, 520, 11, 0, 7); g.fill()
  })
  g.fillStyle = P.tinta; g.font = '40px "Segoe UI"'; g.fillText('Hitos del proyecto', 120, 300)
  g.fillStyle = P.tenue; g.font = '28px "Segoe UI Light"'
  g.fillText('cada version, con lo que cambio y por que', 120, 356)
  return guardar(nombre, cv)
}

function pantallaMapa(nombre) {
  const W = 2200, H = 1400
  const [cv, g] = base(W, H)
  barraApp(g, W, 'mapa en vivo')
  // una silueta de continentes hecha con manchas: no es un mapa real, es la lectura de "mapa"
  let semilla = 7
  const azar = () => { semilla = (semilla * 1103515245 + 12345) & 0x7fffffff; return semilla / 0x7fffffff }
  g.fillStyle = '#161b25'
  for (let i = 0; i < 240; i++) {
    const x = 140 + azar() * (W - 280), y = 220 + azar() * (H - 420)
    const r = 12 + azar() * 46
    g.beginPath(); g.arc(x, y, r, 0, 7); g.fill()
  }
  for (let i = 0; i < 30; i++) {
    const x = 160 + azar() * (W - 320), y = 240 + azar() * (H - 460)
    const r = 5 + azar() * 22
    g.fillStyle = rgba(i % 3 ? P.azul : P.rosa, 0.55)
    g.beginPath(); g.arc(x, y, r, 0, 7); g.fill()
  }
  ruta(g, W / 2 - 300, 130, 600, 76, 14); g.fillStyle = '#1a1f2b'; g.fill()
  g.strokeStyle = rgba(P.azul, 0.5); g.lineWidth = 1.5; g.stroke()
  g.fillStyle = P.tinta; g.font = '32px "Segoe UI"'
  g.fillText('Sismos en tiempo real', W / 2 - 190, 180)
  return guardar(nombre, cv)
}

function pantallaJuego(nombre) {
  const W = 2200, H = 1400
  const [cv, g] = base(W, H)
  g.fillStyle = '#05070c'; g.fillRect(0, 0, W, H)
  // bichos de pixel: dos formas alternadas en una grilla
  const dibujarBicho = (x, y, s, col, tipo) => {
    g.fillStyle = col
    const M = tipo
      ? [[0,0,1,0,0,0,1,0,0],[0,0,0,1,1,1,0,0,0],[0,0,1,1,1,1,1,0,0],[0,1,1,0,1,0,1,1,0],[1,1,1,1,1,1,1,1,1],[1,0,1,1,1,1,1,0,1],[1,0,1,0,0,0,1,0,1],[0,0,0,1,1,1,0,0,0]]
      : [[0,0,1,1,1,1,1,0,0],[0,1,1,1,1,1,1,1,0],[1,1,0,1,1,1,0,1,1],[1,1,1,1,1,1,1,1,1],[0,0,1,0,0,0,1,0,0],[0,1,0,1,1,1,0,1,0],[1,0,1,0,0,0,1,0,1],[0,0,0,0,0,0,0,0,0]]
    for (let r = 0; r < M.length; r++) for (let c = 0; c < M[r].length; c++) if (M[r][c]) g.fillRect(x + c * s, y + r * s, s, s)
  }
  for (let fila = 0; fila < 4; fila++) {
    for (let col = 0; col < 7; col++) {
      const s = 11 + fila * 3
      dibujarBicho(150 + col * 290 + fila * 24, 130 + fila * 250, s, fila % 2 ? P.azul : '#3d5fe0', fila % 2)
    }
  }
  // los disparos
  g.fillStyle = P.cian
  for (let i = 0; i < 9; i++) g.fillRect(240 + i * 230, 700 + (i % 4) * 90, 9, 70)
  // la nave
  dibujarBicho(W / 2 - 60, H - 240, 14, P.azul2, 0)
  return guardar(nombre, cv)
}

function pantallaCruci(nombre) {
  const W = 2000, H = 1300
  const [cv, g] = base(W, H)
  barraApp(g, W, 'crucigrama')
  const N = 9, celda = 88, x0 = 130, y0 = 180
  let semilla = 21
  const azar = () => { semilla = (semilla * 1103515245 + 12345) & 0x7fffffff; return semilla / 0x7fffffff }
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const negro = azar() < 0.22
    g.fillStyle = negro ? '#0b0e13' : '#1a1f29'
    g.fillRect(x0 + c * celda, y0 + r * celda, celda - 4, celda - 4)
    if (!negro && azar() < 0.3) {
      g.fillStyle = P.suave; g.font = '44px "Segoe UI"'
      g.fillText('ABCDEFGHIJKLMNOP'[Math.floor(azar() * 16)], x0 + c * celda + 28, y0 + r * celda + 60)
    }
  }
  g.fillStyle = P.tinta; g.font = '44px "Segoe UI"'; g.fillText('Crucigrama', W - 620, 250)
  g.fillStyle = P.tenue; g.font = '28px "Segoe UI Light"'
  for (let i = 0; i < 7; i++) g.fillText((i + 1) + '.  definicion de ejemplo', W - 620, 320 + i * 52)
  return guardar(nombre, cv)
}

function tarjetaElemento(nombre, k) {
  k = k || 1
  const W = 620, H = 620
  const [cv, g] = lienzo(W * k, H * k)
  g.scale(k, k)
  ruta(g, 10, 10, W - 20, H - 20, 40); g.fillStyle = '#0d1016'; g.fill()
  g.fillStyle = P.tenue; g.font = '38px "Segoe UI"'
  g.fillText('80', 54, 92)
  g.fillText('200,59', W - 220, 92)
  g.fillStyle = P.tinta; g.font = '220px "Segoe UI Light"'
  g.fillText('Hg', 150, 400)
  g.fillStyle = P.suave; g.font = '52px "Segoe UI"'
  g.fillText('Mercurio', 150, 490)
  return guardar(nombre, cv)
}

function conmutador(nombre, k) {
  k = k || 1
  const W = 700, H = 140, M = 120
  const [cv, g] = lienzo((W + M * 2) * k, (H + M * 2) * k)
  g.scale(k, k)
  const x = M, y = M
  g.save(); g.shadowColor = rgba(P.azul, 0.9); g.shadowBlur = 80
  ruta(g, x, y, W, H, H / 2); g.fillStyle = rgba(P.azul, 0.35); g.fill(); g.fill()
  g.restore()
  ruta(g, x, y, W, H, H / 2); g.fillStyle = '#12151c'; g.fill()
  g.strokeStyle = rgba(P.azul, 0.8); g.lineWidth = 3; g.stroke()
  // la mitad activa
  ruta(g, x + W / 2 + 6, y + 8, W / 2 - 14, H - 16, (H - 16) / 2)
  const act = g.createLinearGradient(x + W / 2, y, x + W, y + H)
  act.addColorStop(0, P.azul); act.addColorStop(1, P.azul2)
  g.fillStyle = act; g.fill()
  g.fillStyle = P.suave; g.font = '52px "Segoe UI"'; g.fillText('Codigo', x + 66, y + H / 2 + 18)
  g.fillStyle = '#08101f'; g.fillText('Vista', x + W / 2 + 82, y + H / 2 + 18)
  return guardar(nombre, cv)
}

// ---------------------------------------------------------------- EL CONMUTADOR, EN PIEZAS QUE SE MUEVEN
//
// POR QUE ESTA PARTIDO. La version de arriba —`conmutador()`— dibuja la pastilla YA PUESTA sobre
// "Vista" en un unico mapa de bits. En la PIEZA-I eso produjo un defecto que ninguna compuerta podia
// ver: un cursor entraba, hacia el gesto de click sobre "Vista"... y no pasaba nada, porque el
// conmutador ya estaba en su estado final desde el primer cuadro en que aparecio. La interaccion
// estaba MIMADA, no ejecutada.
//
// La causa no es el dibujo, es la ESTRUCTURA: un recurso plano no puede tener dos estados. Mientras el
// activo sea un pixel horneado, ninguna animacion puede moverlo. Se necesitan tantas piezas como
// cosas cambien: la pista se queda quieta, la perilla se desliza, y los dos rotulos se turnan el color.
//
// LAS CUATRO PIEZAS COMPARTEN GEOMETRIA A PROPOSITO. Los rotulos se dibujan en un lienzo del MISMO
// tamano que la pista y en las MISMAS coordenadas, asi que en AE van en la misma posicion y con la
// misma escala que ella: alinearlos deja de ser una cuenta que se puede errar y pasa a ser una
// igualdad. La perilla es la unica que se desplaza, y su recorrido es +-CONMU_DESLIZ unidades de
// diseno desde el centro.
const CONMU = { W: 700, H: 140, M: 120 }
export const CONMU_DESLIZ = CONMU.W / 4 - 1      // del centro a cada mitad: 174

function conmutadorPista(nombre, k) {
  k = k || 1
  const { W, H, M } = CONMU
  const [cv, g] = lienzo((W + M * 2) * k, (H + M * 2) * k)
  g.scale(k, k)
  const x = M, y = M
  g.save(); g.shadowColor = rgba(P.azul, 0.9); g.shadowBlur = 80
  ruta(g, x, y, W, H, H / 2); g.fillStyle = rgba(P.azul, 0.35); g.fill(); g.fill()
  g.restore()
  ruta(g, x, y, W, H, H / 2); g.fillStyle = '#12151c'; g.fill()
  g.strokeStyle = rgba(P.azul, 0.8); g.lineWidth = 3; g.stroke()
  // LOS DOS ROTULOS EN EL COLOR INACTIVO. El que este activo se tapa con su copia oscura.
  g.fillStyle = P.suave; g.font = '52px "Segoe UI"'
  g.fillText('Codigo', x + 66, y + H / 2 + 18)
  g.fillText('Vista', x + W / 2 + 82, y + H / 2 + 18)
  return guardar(nombre, cv)
}

function conmutadorPerilla(nombre, k) {
  k = k || 1
  const { W, H } = CONMU
  const pw = W / 2 - 14, ph = H - 16, M = 70
  const [cv, g] = lienzo((pw + M * 2) * k, (ph + M * 2) * k)
  g.scale(k, k)
  g.save(); g.shadowColor = rgba(P.azul, 0.75); g.shadowBlur = 46
  ruta(g, M, M, pw, ph, ph / 2); g.fillStyle = rgba(P.azul, 0.5); g.fill()
  g.restore()
  ruta(g, M, M, pw, ph, ph / 2)
  const act = g.createLinearGradient(M, M, M + pw, M + ph)
  act.addColorStop(0, P.azul); act.addColorStop(1, P.azul2)
  g.fillStyle = act; g.fill()
  return guardar(nombre, cv)
}

// el rotulo OSCURO, el que se lee sobre la perilla encendida. Mismo lienzo y mismas coordenadas que la
// pista: en AE van en la misma posicion, y la unica propiedad que se anima es la opacidad.
function conmutadorRotulo(nombre, cual, k) {
  k = k || 1
  const { W, H, M } = CONMU
  const [cv, g] = lienzo((W + M * 2) * k, (H + M * 2) * k)
  g.scale(k, k)
  g.fillStyle = '#08101f'; g.font = '52px "Segoe UI"'
  if (cual === 'codigo') g.fillText('Codigo', M + 66, M + H / 2 + 18)
  else g.fillText('Vista', M + W / 2 + 82, M + H / 2 + 18)
  return guardar(nombre, cv)
}

// ---------------------------------------------------------------- un punto de luz redondo
// Para la cabeza del anillo de progreso: va en modo Anadir, asi que se dibuja como luz —centro casi
// blanco, caida suave— y no como pintura del color del acento.
function punto(nombre, d, hex) {
  const [cv, g] = lienzo(d, d)
  const r = d / 2
  const gr = g.createRadialGradient(r, r, 0, r, r, r)
  gr.addColorStop(0.00, 'rgba(255,255,255,1)')
  gr.addColorStop(0.14, rgba(hex, 0.95))
  gr.addColorStop(0.38, rgba(hex, 0.42))
  gr.addColorStop(0.70, rgba(hex, 0.10))
  gr.addColorStop(1.00, rgba(hex, 0))
  g.fillStyle = gr
  g.beginPath(); g.arc(r, r, r, 0, Math.PI * 2); g.fill()
  return guardar(nombre, cv)
}

function tarjetaSugerencia(nombre, k) {
  k = k || 1
  const W = 900, H = 420, M = 90
  const [cv, g] = lienzo((W + M * 2) * k, (H + M * 2) * k)
  g.scale(k, k)
  const x = M, y = M
  g.save(); g.shadowColor = rgba(P.violeta, 0.85); g.shadowBlur = 60
  ruta(g, x, y, W, H, 26); g.fillStyle = rgba(P.violeta, 0.3); g.fill(); g.fill()
  g.restore()
  ruta(g, x, y, W, H, 26); g.fillStyle = '#12151c'; g.fill()
  g.strokeStyle = rgba(P.violeta, 0.75); g.lineWidth = 2.5; g.stroke()
  g.fillStyle = P.tinta; g.font = '30px "Segoe UI Light"'
  const TXT = ['Probá arrancar con un gancho mas', 'concreto. Por ejemplo: "un motor que', 'no se parece a After Effects: lo mide".', 'El resto de la nota puede seguir igual.']
  TXT.forEach((t, i) => g.fillText(t, x + 46, y + 132 + i * 52))
  return guardar(nombre, cv)
}

function barraPrompt(nombre, k) {
  k = k || 1
  const W = 1500, H = 190, M = 100
  const [cv, g] = lienzo((W + M * 2) * k, (H + M * 2) * k)
  g.scale(k, k)
  const x = M, y = M
  g.save(); g.shadowColor = rgba(P.violeta, 0.9); g.shadowBlur = 70
  ruta(g, x, y, W, H, 34); g.fillStyle = rgba(P.azul, 0.35); g.fill(); g.fill()
  g.restore()
  ruta(g, x, y, W, H, 34); g.fillStyle = '#0e1117'; g.fill()
  const tr2 = g.createLinearGradient(x, y, x + W, y + H)
  tr2.addColorStop(0, P.violeta); tr2.addColorStop(0.5, P.azul); tr2.addColorStop(1, P.cian)
  ruta(g, x + 1.75, y + 1.75, W - 3.5, H - 3.5, 32)
  g.strokeStyle = tr2; g.lineWidth = 3.5; g.stroke()
  // las dos pastillas de abajo
  g.font = '26px "Segoe UI"'
  ;['Investigacion', 'Lienzo'].forEach((t, i) => {
    const an = g.measureText(t).width + 62
    ruta(g, x + 40 + i * 230, y + H - 62, an, 44, 22)
    g.fillStyle = '#171b23'; g.fill()
    g.strokeStyle = '#282e3a'; g.lineWidth = 1.5; g.stroke()
    g.fillStyle = P.suave; g.fillText(t, x + 70 + i * 230, y + H - 32)
  })
  return guardar(nombre, cv)
}

// EL COMETA DE ESCRITURA — la punta del lapiz.
//
// Medido sobre la referencia (cuadro 158): nucleo blanco reventado de ~200 px con una cola en cuna de
// ~450 px que se abre hacia atras, de blanco a lavanda a transparente. Va apoyado sobre la linea de
// base y viaja a la velocidad a la que se escribe el texto, que es lo que lo hace leer como "esto se
// esta escribiendo" en vez de "paso un destello".
//
// SE DIBUJA PARA SUMARSE, no para taparse: los valores son luz, y la capa va en modo Anadir. En modo
// normal el mismo PNG se lee como pintura blanca — que es exactamente el defecto que se veia en la
// PIEZA-H y el motivo por el que hizo falta la fusion aditiva.
function cometa(nombre) {
  const W = 900, H = 320
  const [cv, g] = lienzo(W, H)
  const cx = W - 220, cy = H / 2
  // la cola: una cuna que se abre hacia atras, hecha con un degradado a lo largo
  g.save()
  const cola = g.createLinearGradient(cx - 470, 0, cx, 0)
  cola.addColorStop(0, 'rgba(140,120,255,0)')
  cola.addColorStop(0.55, 'rgba(150,130,255,0.30)')
  cola.addColorStop(0.85, 'rgba(210,205,255,0.70)')
  cola.addColorStop(1, 'rgba(255,255,255,0.95)')
  g.beginPath()
  g.moveTo(cx, cy - 96)
  g.quadraticCurveTo(cx - 240, cy - 34, cx - 470, cy - 6)
  g.quadraticCurveTo(cx - 240, cy + 34, cx, cy + 96)
  g.closePath()
  g.filter = 'blur(26px)'
  g.fillStyle = cola
  g.fill()
  g.restore()
  // el nucleo: reventado al blanco, con caida rapida
  const nuc = g.createRadialGradient(cx, cy, 0, cx, cy, 130)
  nuc.addColorStop(0, 'rgba(255,255,255,1)')
  nuc.addColorStop(0.22, 'rgba(255,255,255,0.92)')
  nuc.addColorStop(0.45, 'rgba(200,210,255,0.42)')
  nuc.addColorStop(1, 'rgba(120,140,255,0)')
  g.fillStyle = nuc
  g.beginPath(); g.ellipse(cx, cy, 130, 108, 0, 0, 7); g.fill()
  return guardar(nombre, cv)
}

// el cursor: en la referencia aparece siempre que algo se toca, y es lo que convierte una imagen de
// interfaz en una interfaz que alguien esta usando.
function cursor(nombre) {
  const [cv, g] = lienzo(120, 150)
  g.save()
  g.shadowColor = 'rgba(0,0,0,0.7)'; g.shadowBlur = 14; g.shadowOffsetY = 4
  g.beginPath()
  g.moveTo(18, 12); g.lineTo(18, 116); g.lineTo(44, 92); g.lineTo(60, 130)
  g.lineTo(80, 121); g.lineTo(64, 84); g.lineTo(98, 82)
  g.closePath()
  g.fillStyle = '#ffffff'; g.fill()
  g.restore()
  g.strokeStyle = '#0a0c11'; g.lineWidth = 3; g.stroke()
  return guardar(nombre, cv)
}

// EL GRANO — tres cuadros alternados con HOLD (receta F11). Un solo cuadro fijo se lee como suciedad
// en la lente; tres alternandose se leen como pelicula.
function grano(nombre, semillaInicial) {
  const W = 1920, H = 1080
  const [cv, g] = lienzo(W, H)
  const im = g.createImageData(W, H)
  let s = semillaInicial
  const azar = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff }
  for (let i = 0; i < W * H; i++) {
    const v = azar()
    im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = 128
    im.data[i * 4 + 3] = v < 0.5 ? 0 : Math.round((v - 0.5) * 34)
  }
  g.putImageData(im, 0, 0)
  return guardar(nombre, cv)
}

// ================================================================ el juego
const hechos = []
hechos.push(cursor('cursor'))
hechos.push(cometa('cometa'))
hechos.push(grano('grano1', 11), grano('grano2', 977), grano('grano3', 40503))
hechos.push(pantallaHola('ui-hola'))
hechos.push(pantallaDoc('ui-doc', false))
hechos.push(pantallaDoc('ui-doc-barra', true))
hechos.push(pantallaCodigo('ui-codigo'))
hechos.push(pantallaLinea('ui-linea'))
hechos.push(pantallaMapa('ui-mapa'))
hechos.push(pantallaJuego('ui-juego'))
hechos.push(pantallaCruci('ui-cruci'))

const cont = async (n) => await loadImage(`${DESTINO}/${n}.png`)
hechos.push(chasis('panel-hola', 2200, 1400, { luzA: P.azul, luzB: P.violeta, contenido: await cont('ui-hola') }))
hechos.push(chasis('panel-doc', 2200, 1500, { luzA: P.violeta, luzB: P.azul, contenido: await cont('ui-doc') }))
hechos.push(chasis('panel-doc-barra', 2200, 1500, { luzA: P.violeta, luzB: P.rosa, contenido: await cont('ui-doc-barra') }))
hechos.push(chasis('panel-codigo', 2400, 1500, { luzA: P.azul, luzB: P.violeta, contenido: await cont('ui-codigo') }))
hechos.push(chasis('panel-linea', 2200, 1400, { luzA: P.cian, luzB: P.azul, contenido: await cont('ui-linea') }))
hechos.push(chasis('panel-mapa', 2200, 1400, { luzA: P.azul, luzB: P.rosa, contenido: await cont('ui-mapa') }))
hechos.push(chasis('panel-juego', 2200, 1400, { luzA: P.azul, luzB: P.cian, contenido: await cont('ui-juego') }))
hechos.push(chasis('panel-cruci', 2000, 1300, { luzA: P.violeta, luzB: P.azul, contenido: await cont('ui-cruci') }))

hechos.push(tarjetaElemento('tarjeta-elemento', 2))
hechos.push(chasis('tarjeta-hg', 620, 620, { k: 2, luzA: P.azul, luzB: P.violeta, radio: 40, contenido: await cont('tarjeta-elemento') }))
hechos.push(tarjetaSugerencia('tarjeta-sugerencia', 2))
hechos.push(barraPrompt('barra-prompt', 2))
hechos.push(conmutador('conmutador', 3))
hechos.push(conmutadorPista('conmu-pista', 3))
hechos.push(conmutadorPerilla('conmu-perilla', 3))
hechos.push(conmutadorRotulo('conmu-codigo', 'codigo', 3))
hechos.push(conmutadorRotulo('conmu-vista', 'vista', 3))
hechos.push(punto('punto-azul', 420, P.azul2))
hechos.push(pildora('pildora-vacia', 620, 130, { k: 2, luzA: P.azul, luzB: P.violeta }))
hechos.push(pildora('pildora-ancha', 1100, 140, { k: 2, luzA: P.azul, luzB: P.violeta }))
hechos.push(pildora('burbuja', 1200, 130, { k: 2, luzA: P.violeta, luzB: P.azul, relleno: '#2a2350' }))
hechos.push(estrella('estrella', 520, P.azul))
hechos.push(arco('arcos', 2600, 700, P.azul))
hechos.push(destello('destello', 2400, 620))
hechos.push(mancha('luz-azul', 2000, P.azul, P.violeta, 0.40))
hechos.push(mancha('luz-violeta', 1800, P.violeta, P.rosa, 0.34))
hechos.push(mancha('luz-cian', 1600, P.cian, P.azul, 0.30))

console.log(`${hechos.length} recursos -> ${DESTINO}`)
