// PANTALLAS SINTETICAS para los paneles de la pieza.
//
// Los paneles de una pieza como la de Gemini muestran INTERFAZ, no rectangulos. Sin contenido adentro,
// un panel en perspectiva es un rectangulo en perspectiva.
//
// Se generan en vez de tomarse de algun lado por dos razones: no se redistribuye material ajeno, y
// —mas importante para lo que estamos midiendo— se sabe EXACTAMENTE que hay en cada pixel. Cuando el
// reproductor y AE difieran en algo, la pregunta "¿sera la imagen?" ya esta contestada.
//
// USO
//   node tools/ae/pantallas.mjs [carpeta]

import { writeFileSync, mkdirSync, existsSync } from 'node:fs'

const DESTINO = process.argv[2] || 'C:/ae-probe/recursos'
if (!existsSync(DESTINO)) mkdirSync(DESTINO, { recursive: true })

const { createCanvas } = await import('@napi-rs/canvas')

const W = 900, H = 560
const FONDO = '#12141c', LINEA = '#232734', HUESO = '#f2f1ec'
const GRIS = '#7c8496', ACENTO = '#f24026', CIAN = '#26bdf2'

function base(titulo) {
  const cv = createCanvas(W, H)
  const g = cv.getContext('2d')
  g.fillStyle = FONDO; g.fillRect(0, 0, W, H)
  // la barra de titulo, que es lo que hace que se lea como "una pantalla" y no como "un rectangulo"
  g.fillStyle = '#0d0f15'; g.fillRect(0, 0, W, 62)
  g.fillStyle = LINEA; g.fillRect(0, 61, W, 1)
  for (let i = 0; i < 3; i++) {
    g.fillStyle = ['#f24026', '#e8c04a', '#4ac06a'][i]
    g.beginPath(); g.arc(30 + i * 24, 31, 6.5, 0, 7); g.fill()
  }
  g.fillStyle = GRIS; g.font = '600 19px sans-serif'
  g.fillText(titulo, 118, 38)
  return { cv, g }
}

// ---------------------------------------------------------------- 1. barras
{
  const { cv, g } = base('rendimiento')
  const datos = [0.42, 0.68, 0.55, 0.86, 0.74, 0.95, 0.61]
  const x0 = 70, y0 = 130, ancho = W - 140, alto = H - 220
  g.strokeStyle = LINEA; g.lineWidth = 1
  for (let i = 0; i <= 4; i++) {
    const y = y0 + alto * i / 4
    g.beginPath(); g.moveTo(x0, y + 0.5); g.lineTo(x0 + ancho, y + 0.5); g.stroke()
  }
  const bw = ancho / datos.length * 0.52
  datos.forEach((v, i) => {
    const x = x0 + ancho * (i + 0.5) / datos.length - bw / 2
    const h = alto * v
    g.fillStyle = i === 5 ? ACENTO : '#2c3242'
    g.fillRect(x, y0 + alto - h, bw, h)
  })
  g.fillStyle = HUESO; g.font = '700 56px sans-serif'
  g.fillText('94,2%', 70, H - 34)
  g.fillStyle = GRIS; g.font = '500 20px sans-serif'
  g.fillText('sobre 12 400 piezas', 250, H - 40)
  writeFileSync(`${DESTINO}/pantalla-1.png`, cv.toBuffer('image/png'))
}

// ---------------------------------------------------------------- 2. lista
{
  const { cv, g } = base('capas exportadas')
  const filas = [
    ['texto', 'completo', CIAN], ['solido', 'completo', CIAN],
    ['forma', 'rasterizada', '#e8c04a'], ['imagen', 'completo', CIAN],
    ['camara 3D', 'completo', CIAN], ['efecto', 'no viaja', ACENTO],
  ]
  filas.forEach(([que, estado, color], i) => {
    const y = 112 + i * 68
    g.fillStyle = i % 2 ? '#151824' : 'transparent'
    if (i % 2) g.fillRect(40, y - 26, W - 80, 56)
    g.fillStyle = color
    g.beginPath(); g.arc(70, y, 7, 0, 7); g.fill()
    g.fillStyle = HUESO; g.font = '600 24px sans-serif'
    g.fillText(que, 98, y + 8)
    g.fillStyle = GRIS; g.font = '500 21px sans-serif'
    g.fillText(estado, W - 240, y + 8)
  })
  writeFileSync(`${DESTINO}/pantalla-2.png`, cv.toBuffer('image/png'))
}

// ---------------------------------------------------------------- 3. cifra
{
  const { cv, g } = base('fidelidad medida')
  g.fillStyle = HUESO; g.font = '700 190px sans-serif'
  g.fillText('0,017', 60, 300)
  g.fillStyle = ACENTO; g.fillRect(62, 340, 300, 10)
  g.fillStyle = GRIS; g.font = '500 26px sans-serif'
  g.fillText('pixeles de error contra After Effects', 62, 400)
  g.fillStyle = '#2c3242'; g.font = '500 22px sans-serif'
  g.fillText('geometria · tipografia · color', 62, 452)
  writeFileSync(`${DESTINO}/pantalla-3.png`, cv.toBuffer('image/png'))
}

console.log(`tres pantallas de ${W}x${H} -> ${DESTINO}`)
