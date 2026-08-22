// RECURSOS DE LA PIEZA-P, plano 3 (la marca) y plano 6 (el tablero).
//
// LOS DOS PLANOS MAS LARGOS: 9,7 s y 16,3 s. Entre los dos son 26 de los 53 segundos de la pieza, y
// los dos tienen el mismo problema — sostener una imagen fija durante mucho tiempo es imposible, asi
// que lo que hay que entregar no es una imagen sino UN JUEGO DE PIEZAS QUE PUEDEN MOVERSE SOLAS.
//
// Es la ley L23 llevada al extremo: un PNG plano tiene UN estado. Si el tablero sale como una sola
// imagen, los dieciseis segundos son dieciseis segundos de una foto. Salen 22 piezas.
//
// USO
//   node tools/ae/recursos-p2.mjs

import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { createCanvas } from '@napi-rs/canvas'

const DESTINO = process.env.RECURSOS_P || 'C:/ae-probe/recursos-p'
if (!existsSync(DESTINO)) mkdirSync(DESTINO, { recursive: true })

const FUENTE = 'Segoe UI'
const hechos = []

// la paleta de la pieza, en un solo lugar
const TINTA_PANEL = '#0E0B1E'   // el cuerpo del tablero
const CAMPO       = '#151129'   // el area del grafico — PLANA A PROPOSITO (ver mas abajo)
const LINEA       = '#26204A'
const CLARO       = '#EDEAFB'
const GRIS        = '#8B85A8'
const VIOLETA     = '#7C4DFF'
const VIOLETA_CL  = '#B79BFF'
const NARANJA     = '#EC6036'
const VERDE       = '#3DD68C'

const lienzo = (w, h, k = 2) => {
  const cv = createCanvas(Math.round(w * k), Math.round(h * k))
  const g = cv.getContext('2d')
  g.scale(k, k)
  return [cv, g]
}
function guardar (n, cv, nota) {
  writeFileSync(`${DESTINO}/${n}.png`, cv.toBuffer('image/png'))
  hechos.push(`${n.padEnd(18)} ${String(cv.width).padStart(5)}x${String(cv.height).padEnd(5)} ${nota}`)
}
function ruta (g, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2)
  g.beginPath()
  g.moveTo(x + rr, y)
  g.lineTo(x + w - rr, y); g.arcTo(x + w, y, x + w, y + rr, rr)
  g.lineTo(x + w, y + h - rr); g.arcTo(x + w, y + h, x + w - rr, y + h, rr)
  g.lineTo(x + rr, y + h); g.arcTo(x, y + h, x, y + h - rr, rr)
  g.lineTo(x, y + rr); g.arcTo(x, y, x + rr, y, rr)
  g.closePath()
}

// ================================================================ 1 · EL LOGOTIPO, LETRA POR LETRA
//
// Cuatro PNGs, uno por letra. El plano 3 dura 9,7 s y el revelado de marca es su unico gesto: con el
// logotipo entero en una imagen ese gesto seria "aparece", que dura un cuadro y deja 9,4 s de nada.
// Con las letras sueltas la marca SE ESCRIBE — cada una llega con su retardo y se asienta.
//
// El interletrado se calcula aca y se imprime, porque la pieza necesita las posiciones exactas: una
// letra mal ubicada en un logotipo se ve al instante, mucho mas que en una frase.
{
  const MARCA = 'nodo'
  const CUERPO = 210
  const gm = createCanvas(10, 10).getContext('2d')
  gm.font = `700 ${CUERPO}px "${FUENTE}"`
  const anchos = [...MARCA].map(c => gm.measureText(c).width)
  // interletra negativa: un logotipo se aprieta, un parrafo no
  const APRIETE = -CUERPO * 0.035
  const total = anchos.reduce((a, b) => a + b, 0) + APRIETE * (MARCA.length - 1)

  let acum = 0
  console.log(`\n  logotipo "${MARCA}" · ${CUERPO}px · linea de ${Math.round(total)} px`)
  const letras = [...MARCA]
  for (let i = 0; i < letras.length; i++) {
    const ch = letras[i]
    const m = Math.ceil(CUERPO * 0.30)
    const [cv, g] = lienzo(Math.ceil(anchos[i]) + m * 2, Math.ceil(CUERPO * 1.5) + m * 2, 3)
    g.font = `700 ${CUERPO}px "${FUENTE}"`
    g.textBaseline = 'middle'
    const d = g.createLinearGradient(m - acum, 0, m - acum + total, 0)
    d.addColorStop(0, '#FFFFFF'); d.addColorStop(0.6, '#DACCFF'); d.addColorStop(1, VIOLETA_CL)
    g.fillStyle = d
    g.fillText(ch, m, (cv.height / 3) / 2)
    guardar(`p-w-${i + 1}`, cv, `letra "${ch}" del logotipo`)
    const centro = acum + anchos[i] / 2 - total / 2
    console.log(`    p-w-${i + 1}  "${ch}"  centro relativo ${Math.round(centro)}`)
    acum += anchos[i] + APRIETE
  }
}

// la linea de atribucion — la licencia CC-BY la exige y va en la pieza, no en un comentario
{
  const [cv, g] = lienzo(1100, 60, 3)
  g.font = `400 26px "${FUENTE}"`
  g.fillStyle = 'rgba(237,234,251,0.42)'
  g.textBaseline = 'middle'
  g.fillText('Recreacion de una plantilla de AE Template & Premiere Pro Template · CC BY', 0, 30)
  guardar('p-credito', cv, 'la atribucion que exige la licencia CC-BY del original')
}

// ================================================================ 2 · EL TABLERO, EN PIEZAS
const PW = 1180, PH = 720   // el tablero entero mide esto; cada pieza sale en su propio lienzo

// --- el cuerpo: marco, barra lateral y cabecera. Lo unico que NO se mueve.
{
  const [cv, g] = lienzo(PW, PH, 2)
  ruta(g, 0, 0, PW, PH, 26)
  g.fillStyle = TINTA_PANEL; g.fill()
  g.strokeStyle = 'rgba(124,77,255,0.30)'; g.lineWidth = 2; g.stroke()

  // barra lateral
  g.save(); ruta(g, 0, 0, PW, PH, 26); g.clip()
  g.fillStyle = '#0A0818'; g.fillRect(0, 0, 218, PH)
  g.strokeStyle = LINEA; g.lineWidth = 1
  g.beginPath(); g.moveTo(218, 0); g.lineTo(218, PH); g.stroke()
  g.beginPath(); g.moveTo(218, 74); g.lineTo(PW, 74); g.stroke()
  g.restore()

  // el punto de marca del panel
  g.fillStyle = VIOLETA
  ruta(g, 26, 24, 26, 26, 8); g.fill()
  g.font = `600 19px "${FUENTE}"`; g.fillStyle = CLARO; g.textBaseline = 'middle'
  g.fillText('nodo', 62, 38)

  // los items del menu — texto de verdad, no lineas grises: una tarjeta con parrafos falsos es
  // vocabulario de maqueta y no puede ser el sujeto de un plano
  const menu = ['Resumen', 'Proyectos', 'Entregas', 'Equipo', 'Ajustes']
  for (let i = 0; i < menu.length; i++) {
    const y = 112 + i * 52
    if (i === 0) { g.fillStyle = 'rgba(124,77,255,0.16)'; ruta(g, 16, y - 17, 186, 40, 10); g.fill() }
    g.font = `${i === 0 ? '600' : '400'} 17px "${FUENTE}"`
    g.fillStyle = i === 0 ? CLARO : GRIS
    g.fillText(menu[i], 40, y + 3)
  }

  // cabecera
  g.font = `600 21px "${FUENTE}"`; g.fillStyle = CLARO
  g.fillText('Resumen del equipo', 250, 38)
  g.font = `400 15px "${FUENTE}"`; g.fillStyle = GRIS
  g.fillText('ultimos 30 dias', 470, 39)

  // EL CAMPO DEL GRAFICO VA PLANO Y ESO ES DELIBERADO. La linea se dibuja sola con una tapa del color
  // exacto del fondo que se corre a la derecha (LEY 4). Si el campo tuviera un degradado, ningun color
  // de tapa lo igualaria y se veria el borde de la tapa cruzando la pantalla.
  ruta(g, 250, 108, 620, 300, 16)
  g.fillStyle = CAMPO; g.fill()

  // la grilla del grafico
  g.strokeStyle = 'rgba(38,32,74,0.9)'; g.lineWidth = 1
  for (let i = 1; i < 4; i++) {
    const y = 108 + (300 / 4) * i
    g.beginPath(); g.moveTo(266, y); g.lineTo(854, y); g.stroke()
  }
  g.font = `400 13px "${FUENTE}"`; g.fillStyle = 'rgba(139,133,168,0.75)'
  const dias = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom']
  for (let i = 0; i < dias.length; i++) g.fillText(dias[i], 276 + i * 84, 428)
  g.font = `500 15px "${FUENTE}"`; g.fillStyle = CLARO
  g.fillText('Entregas por dia', 268, 132)

  // el titulo de la columna de eventos
  g.font = `600 15px "${FUENTE}"`; g.fillStyle = CLARO
  g.fillText('Actividad', 900, 122)

  guardar('p-panel', cv, 'el cuerpo del tablero: marco, barra lateral, cabecera y el campo PLANO')
}

// --- la linea del grafico, en su propia capa para poder dibujarse
{
  const AW = 620, AH = 300
  const [cv, g] = lienzo(AW, AH, 2)
  const pts = [0.30, 0.44, 0.38, 0.58, 0.52, 0.74, 0.92]
  const px = i => 26 + i * 84
  const py = v => AH - 32 - v * (AH - 92)
  // el area bajo la linea
  g.beginPath(); g.moveTo(px(0), AH - 32)
  for (let i = 0; i < pts.length; i++) g.lineTo(px(i), py(pts[i]))
  g.lineTo(px(pts.length - 1), AH - 32); g.closePath()
  const d = g.createLinearGradient(0, py(0.92), 0, AH - 32)
  d.addColorStop(0, 'rgba(124,77,255,0.42)'); d.addColorStop(1, 'rgba(124,77,255,0)')
  g.fillStyle = d; g.fill()
  // la linea
  g.beginPath()
  for (let i = 0; i < pts.length; i++) {
    if (i) g.lineTo(px(i), py(pts[i])); else g.moveTo(px(i), py(pts[i]))
  }
  g.strokeStyle = VIOLETA_CL; g.lineWidth = 3.5; g.lineJoin = 'round'; g.lineCap = 'round'
  g.stroke()
  // los nodos
  for (let i = 0; i < pts.length; i++) {
    g.beginPath(); g.arc(px(i), py(pts[i]), 5, 0, Math.PI * 2)
    g.fillStyle = TINTA_PANEL; g.fill()
    g.strokeStyle = VIOLETA_CL; g.lineWidth = 3; g.stroke()
  }
  guardar('p-grafico', cv, 'la linea, en capa aparte: se dibuja con una tapa del color del campo')
}

// --- las tres cifras. CADA UNA CON SU ROTULO PEGADO: un numero sin sujeto no es un dato.
const CIFRAS = [
  ['128', 'entregas', VERDE, '+14%'],
  ['3,4 h', 'promedio', VIOLETA_CL, '-22%'],
  ['9', 'en curso', NARANJA, 'hoy'],
]
for (let i = 0; i < CIFRAS.length; i++) {
  const n = CIFRAS[i][0], rot = CIFRAS[i][1], col = CIFRAS[i][2], delta = CIFRAS[i][3]
  const W = 196, H = 116
  const [cv, g] = lienzo(W, H, 2)
  ruta(g, 0, 0, W, H, 16)
  g.fillStyle = CAMPO; g.fill()
  g.strokeStyle = LINEA; g.lineWidth = 1; g.stroke()
  g.textBaseline = 'middle'
  g.font = `400 14px "${FUENTE}"`; g.fillStyle = GRIS
  g.fillText(rot, 18, 26)
  g.font = `700 34px "${FUENTE}"`; g.fillStyle = CLARO
  g.fillText(n, 18, 64)
  g.font = `600 13px "${FUENTE}"`; g.fillStyle = col
  g.fillText(delta, 18, 95)
  guardar(`p-cifra-t${i + 1}`, cv, `tarjeta "${n} ${rot}" — la cifra lleva su rotulo pegado`)
}

// --- las cinco filas de actividad, una por capa: entran de a una y ESO es lo que sostiene el plano
const EVENTOS = [
  ['Ana M.', 'subio la revision final', VIOLETA],
  ['Bruno T.', 'aprobo tres entregas', VERDE],
  ['Cami R.', 'abrio un proyecto nuevo', NARANJA],
  ['Dario L.', 'dejo dos comentarios', VIOLETA_CL],
  ['Eva P.', 'cerro el sprint', VERDE],
]
for (let i = 0; i < EVENTOS.length; i++) {
  const quien = EVENTOS[i][0], que = EVENTOS[i][1], col = EVENTOS[i][2]
  const W = 258, H = 62
  const [cv, g] = lienzo(W, H, 2)
  ruta(g, 0, 0, W, H, 12)
  g.fillStyle = 'rgba(21,17,41,0.92)'; g.fill()
  g.beginPath(); g.arc(24, H / 2, 13, 0, Math.PI * 2); g.fillStyle = col; g.fill()
  g.font = `700 12px "${FUENTE}"`; g.fillStyle = TINTA_PANEL
  g.textAlign = 'center'; g.textBaseline = 'middle'
  g.fillText(quien[0], 24, H / 2 + 1)
  g.textAlign = 'left'
  g.font = `600 14px "${FUENTE}"`; g.fillStyle = CLARO
  g.fillText(quien, 48, 22)
  g.font = `400 13px "${FUENTE}"`; g.fillStyle = GRIS
  g.fillText(que, 48, 42)
  guardar(`p-ev-${i + 1}`, cv, `fila "${quien}" — capa propia para entrar sola`)
}

// --- el filo de luz del borde inclinado. Lo que hace que un plano inclinado se lea como un OBJETO
// con canto y no como una imagen deformada.
{
  const [cv, g] = lienzo(PW, 14, 3)
  const d = g.createLinearGradient(0, 0, PW, 0)
  d.addColorStop(0.00, 'rgba(124,77,255,0)')
  d.addColorStop(0.28, 'rgba(200,178,255,0.95)')
  d.addColorStop(0.62, 'rgba(255,255,255,0.85)')
  d.addColorStop(1.00, 'rgba(236,96,54,0)')
  g.fillStyle = d
  ruta(g, 0, 4, PW, 6, 3); g.fill()
  guardar('p-filo', cv, 'el canto luminoso del plano inclinado')
}

// --- el cursor que senala dentro del tablero
{
  const [cv, g] = lienzo(64, 93, 4)
  g.beginPath()
  g.moveTo(6, 4); g.lineTo(6, 62); g.lineTo(21, 48); g.lineTo(31, 71); g.lineTo(41, 66)
  g.lineTo(31, 44); g.lineTo(50, 43); g.closePath()
  g.fillStyle = '#FFFFFF'; g.fill()
  g.strokeStyle = 'rgba(10,8,24,0.55)'; g.lineWidth = 2.4; g.lineJoin = 'round'; g.stroke()
  guardar('p-puntero', cv, 'puntero — la punta esta en (6,4), ahi va el ancla')
}

console.log(`\nrecursos-p2 -> ${DESTINO}\n`)
for (const h of hechos) console.log('  ' + h)
console.log(`\n  ${hechos.length} recursos`)
