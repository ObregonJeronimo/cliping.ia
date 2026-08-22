// RECURSOS DE LA PIEZA-P · la barra de busqueda, la marca y el tablero.
//
// LO QUE ESTE ARCHIVO CORRIGE, y sale de volver a mirar la referencia en color:
//
//   · LA BARRA existe y yo no la habia visto. Ocupa del segundo 4,2 al 7,2 y es el plano con mas
//     mecanica de la pieza: se dibuja sola empezando por un FILO de luz arriba, se escribe letra a
//     letra con cursor, se aleja de camara los cinco segundos enteros, le aparece una lupa a la
//     derecha, y llega un puntero que hace clic. Yo habia leido ese plano como "revelado de marca".
//
//   · EL TABLERO tiene otro reparto: cuatro tarjetas de cifra en fila arriba y un panel de grafico
//     grande abajo, no tres tarjetas y una columna de actividad. Y su titulo SE ESCRIBE.
//
//   · LA MARCA no es Nexus ni es Nodo. Pedido de Thiago: "cambiale el nombre a otra cosa, que no sea
//     Nodo". Va ARCO, con un simbolo que no se parece al del original — un arco de 3/4 con su punto,
//     en vez de los dos galones cruzados. El nombre y el simbolo son lo unico que se reemplaza: la
//     licencia CC-BY del original cubre su diseno, no su marca.
//
// USO
//   node tools/ae/recursos-p2.mjs

import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { createCanvas } from '@napi-rs/canvas'

const DESTINO = process.env.RECURSOS_P || 'C:/ae-probe/recursos-p'
if (!existsSync(DESTINO)) mkdirSync(DESTINO, { recursive: true })

const FUENTE = 'Segoe UI'
const hechos = []

const TINTA   = '#07060F'
const CAMPO   = '#101020'
const LINEA   = '#232238'
const CLARO   = '#EFECFB'
const GRIS    = '#8A85A0'
const VIOLETA = '#6B3BFF'
const VIOL_CL = '#B9A6FF'
const VERDE   = '#3DD68C'
const ROJO    = '#F2604A'
const AMBAR   = '#F5A524'

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

// EL RESPLANDOR SE HORNEA APILANDO TRAZOS, y esa es la unica forma que tiene este motor.
//
// No hay desenfoque gaussiano ni sombra con blur en el motor web, asi que un halo se construye
// dibujando el mismo contorno N veces con el trazo cada vez mas ancho y el alfa cada vez menor. Es una
// aproximacion, y es la buena: el perfil que sale es casi el de un gaussiano porque el area entre dos
// trazos consecutivos crece linealmente con el radio.
function halo (g, x, y, w, h, r, color, capas, anchoMax, alfaMax) {
  for (let i = capas; i >= 1; i--) {
    const t = i / capas
    ruta(g, x, y, w, h, r)
    g.strokeStyle = `rgba(${color},${alfaMax * Math.pow(1 - t, 2.1)})`
    g.lineWidth = anchoMax * t
    g.stroke()
  }
}

// ================================================================ 1 · LA BARRA DE BUSQUEDA
//
// Sale en TRES piezas y no en una, porque en el video hace tres cosas en tiempos distintos: primero
// aparece SOLO el filo de arriba, despues se completa el cuerpo con su halo, y la lupa llega al final
// cuando el texto ya casi termino. Horneadas juntas, las tres empezarian a existir en el mismo cuadro
// y el plano perderia sus dos primeros tiempos.
const BW = 1700, BH = 214

{
  const [cv, g] = lienzo(BW + 240, BH + 240, 2)
  const x = 120, y = 120
  halo(g, x, y, BW, BH, BH / 2, '108,64,255', 22, 78, 0.42)
  ruta(g, x, y, BW, BH, BH / 2)
  g.fillStyle = '#08060F'; g.fill()
  g.strokeStyle = 'rgba(150,110,255,0.95)'; g.lineWidth = 3; g.stroke()
  guardar('p-barra', cv, 'el cuerpo de la barra con su halo apilado')
}

{
  // el filo de arriba: el arco que en el video aparece SOLO, antes que el resto de la barra
  const [cv, g] = lienzo(BW + 240, 180, 3)
  const x = 120
  g.beginPath()
  g.moveTo(x + BH / 2, 90)
  g.arcTo(x + BW / 2, 40, x + BW - BH / 2, 90, 400)
  const d = g.createLinearGradient(x, 0, x + BW, 0)
  d.addColorStop(0.00, 'rgba(120,70,255,0)')
  d.addColorStop(0.30, 'rgba(196,150,255,0.95)')
  d.addColorStop(0.58, 'rgba(255,225,255,1)')
  d.addColorStop(1.00, 'rgba(255,120,190,0)')
  g.strokeStyle = d; g.lineWidth = 4; g.lineCap = 'round'
  g.stroke()
  guardar('p-barra-filo', cv, 'el filo de luz de arriba — aparece SOLO, antes que la barra')
}

{
  // la lupa
  const [cv, g] = lienzo(90, 90, 4)
  g.strokeStyle = 'rgba(210,200,240,0.85)'; g.lineWidth = 5; g.lineCap = 'round'
  g.beginPath(); g.arc(38, 38, 22, 0, Math.PI * 2); g.stroke()
  g.beginPath(); g.moveTo(54, 54); g.lineTo(74, 74); g.stroke()
  guardar('p-lupa', cv, 'la lupa del extremo derecho de la barra')
}

// el puntero. La punta esta en (6,4) del lienzo: ahi va el ancla, o el clic cae 30 px abajo y a la
// derecha de donde parece que apunta.
{
  const [cv, g] = lienzo(64, 93, 5)
  g.beginPath()
  g.moveTo(6, 4); g.lineTo(6, 62); g.lineTo(21, 48); g.lineTo(31, 71); g.lineTo(41, 66)
  g.lineTo(31, 44); g.lineTo(50, 43); g.closePath()
  const d = g.createLinearGradient(6, 4, 50, 71)
  d.addColorStop(0, '#E8E0FF'); d.addColorStop(1, '#9B7BFF')
  g.fillStyle = d; g.fill()
  g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 2; g.lineJoin = 'round'; g.stroke()
  guardar('p-puntero', cv, 'puntero — la punta esta en (6,4), ahi va el ancla')
}

// el anillo del clic
{
  const [cv, g] = lienzo(220, 220, 3)
  g.beginPath(); g.arc(110, 110, 92, 0, Math.PI * 2)
  g.strokeStyle = 'rgba(200,170,255,0.9)'; g.lineWidth = 7; g.stroke()
  guardar('p-clic', cv, 'el anillo del clic')
}

// ================================================================ 2 · LA MARCA — ARCO
//
// Un arco de 3/4 con su punto. NO se parece al simbolo del original (dos galones cruzados) y no tiene
// por que: la licencia CC-BY cubre el diseno de la plantilla, no la marca de nadie.
function isotipo (nombre, L, k) {
  const [cv, g] = lienzo(L, L, k)
  const cx = L / 2, cy = L / 2, R = L * 0.34, gr = L * 0.115
  // el arco, de -220 a +30 grados
  const d = g.createLinearGradient(cx - R, cy - R, cx + R, cy + R)
  d.addColorStop(0.00, '#C9B4FF')
  d.addColorStop(0.45, '#7C4DFF')
  d.addColorStop(1.00, '#4620C8')
  g.beginPath()
  g.arc(cx, cy, R, Math.PI * -1.22, Math.PI * 0.17)
  g.strokeStyle = d; g.lineWidth = gr; g.lineCap = 'round'
  g.stroke()
  // EL FILO ESPECULAR NO NECESITA RECORTE, Y EL INTENTO DE RECORTARLO PINTO EL SIMBOLO DE NEGRO.
  //
  // La primera version dibujaba el arco otra vez EN NEGRO para tener una base y componia el filo con
  // `source-atop`. Pero `source-atop` no borra la base: la deja debajo. El resultado fue un arco negro
  // sobre un fondo negro con una raya blanca encima — en el cuadro se veia una mancha.
  //
  // Y el recorte era innecesario desde el principio: el trazo principal ocupa la banda [R-gr/2,
  // R+gr/2], y un filo a radio R+0,28*gr con ancho 0,30*gr ocupa [R+0,13*gr, R+0,43*gr], que entra
  // entero adentro. Alcanza con dibujarlo.
  g.beginPath(); g.arc(cx, cy, R + gr * 0.28, Math.PI * -1.10, Math.PI * -0.62)
  g.strokeStyle = 'rgba(255,255,255,0.92)'; g.lineWidth = gr * 0.30; g.lineCap = 'butt'
  g.stroke()
  // el punto: cierra el arco y es lo que lo vuelve un simbolo en vez de una letra C
  g.beginPath(); g.arc(cx + R * 0.72, cy - R * 0.72, gr * 0.58, 0, Math.PI * 2)
  g.fillStyle = '#E4DAFF'; g.fill()
  guardar(nombre, cv, 'el isotipo: un arco de 3/4 con su punto')
}
isotipo('p-iso', 520, 3)

// el logotipo, LETRA POR LETRA: en el video la marca se escribe, no aparece
{
  const MARCA = 'Arco'
  const CUERPO = 200
  const gm = createCanvas(10, 10).getContext('2d')
  gm.font = `600 ${CUERPO}px "${FUENTE}"`
  const anchos = [...MARCA].map(c => gm.measureText(c).width)
  const total = anchos.reduce((a, b) => a + b, 0)
  let acum = 0
  console.log(`\n  logotipo "${MARCA}" · ${CUERPO}px · linea de ${Math.round(total)} px`)
  const letras = [...MARCA]
  for (let i = 0; i < letras.length; i++) {
    const m = Math.ceil(CUERPO * 0.30)
    const [cv, g] = lienzo(Math.ceil(anchos[i]) + m * 2, Math.ceil(CUERPO * 1.45) + m * 2, 3)
    g.font = `600 ${CUERPO}px "${FUENTE}"`
    g.textBaseline = 'middle'
    // el degradado corre a lo largo de la MARCA ENTERA y se recorta en la ventana de esta letra: asi,
    // cuando las cuatro terminan de juntarse, el degradado es continuo
    const d = g.createLinearGradient(m - acum, 0, m - acum + total, 0)
    d.addColorStop(0, '#FFFFFF'); d.addColorStop(0.55, '#DACCFF'); d.addColorStop(1, '#7C4DFF')
    g.fillStyle = d
    g.fillText(letras[i], m, (cv.height / 3) / 2)
    guardar(`p-w-${i + 1}`, cv, `letra "${letras[i]}" del logotipo`)
    console.log(`    p-w-${i + 1}  "${letras[i]}"  centro relativo ${Math.round(acum + anchos[i] / 2 - total / 2)}`)
    acum += anchos[i]
  }
}

// las letras fantasma gigantes del fondo del revelado
{
  const [cv, g] = lienzo(2400, 1350, 1.2)
  g.font = `700 1000px "${FUENTE}"`
  g.fillStyle = 'rgba(255,255,255,0.045)'
  g.textBaseline = 'middle'; g.textAlign = 'center'
  g.fillText('Arco', 1200, 640)
  guardar('p-fantasma', cv, 'las letras gigantes del fondo del revelado, al 4,5%')
}

// las particulas que suben debajo de la marca
{
  const [cv, g] = lienzo(1200, 420, 2)
  let s = 20260821
  const rnd = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648 }
  for (let i = 0; i < 90; i++) {
    const x = rnd() * 1200, y = rnd() * 420
    const r = 1 + rnd() * 2.4
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2)
    g.fillStyle = `rgba(200,180,255,${0.14 + rnd() * 0.5})`
    g.fill()
  }
  guardar('p-particulas', cv, 'las particulas del revelado — semilla fija, deterministas')
}

// la atribucion que exige la licencia CC-BY
{
  const [cv, g] = lienzo(1180, 60, 3)
  g.font = `400 25px "${FUENTE}"`
  g.fillStyle = 'rgba(230,226,250,0.40)'
  g.textBaseline = 'middle'
  g.fillText('Recreacion de una plantilla de AE Template & Premiere Pro Template · CC BY', 0, 30)
  guardar('p-credito', cv, 'la atribucion que exige la licencia CC-BY del original')
}

// ================================================================ 3 · EL TABLERO
//
// El reparto sale del video: cuatro tarjetas de cifra en fila arriba y un panel de grafico grande
// abajo. La version anterior tenia tres tarjetas y una columna de actividad — era otro tablero.
const PW = 1420, PH = 860
const SB = 236          // la barra lateral
const CAB = 78          // la cabecera

{
  const [cv, g] = lienzo(PW, PH, 2)
  ruta(g, 0, 0, PW, PH, 28)
  g.fillStyle = TINTA; g.fill()
  g.save(); ruta(g, 0, 0, PW, PH, 28); g.clip()

  // barra lateral
  g.fillStyle = '#050410'; g.fillRect(0, 0, SB, PH)
  g.strokeStyle = LINEA; g.lineWidth = 1
  g.beginPath(); g.moveTo(SB, 0); g.lineTo(SB, PH); g.stroke()
  g.beginPath(); g.moveTo(0, CAB); g.lineTo(PW, CAB); g.stroke()

  // la marca del panel: el mismo arco, chico
  g.save(); g.translate(34, 39)
  g.beginPath(); g.arc(0, 0, 11, Math.PI * -1.22, Math.PI * 0.17)
  g.strokeStyle = VIOLETA; g.lineWidth = 5; g.lineCap = 'round'; g.stroke()
  g.beginPath(); g.arc(11 * 0.72, -11 * 0.72, 2.6, 0, Math.PI * 2)
  g.fillStyle = VIOL_CL; g.fill()
  g.restore()
  g.font = `600 19px "${FUENTE}"`; g.fillStyle = CLARO; g.textBaseline = 'middle'
  g.fillText('Arco', 56, 39)

  // los grupos del menu
  const grupos = [['CORE', ['Overview', 'AI Models', 'Analytics']],
                  ['WORKSPACE', ['API Keys', 'Team', 'Settings']]]
  let y = CAB + 42
  for (const [tit, items] of grupos) {
    g.font = `600 11px "${FUENTE}"`; g.fillStyle = 'rgba(138,133,160,0.7)'
    g.fillText(tit, 26, y)
    y += 30
    for (const it of items) {
      g.font = `400 15px "${FUENTE}"`; g.fillStyle = GRIS
      g.fillText(it, 42, y)
      y += 40
    }
    y += 18
  }

  // la cabecera de la derecha: fecha, "Live" y el boton
  g.font = `400 12px "${FUENTE}"`
  ruta(g, PW - 344, 26, 118, 26, 13); g.fillStyle = CAMPO; g.fill()
  g.fillStyle = GRIS; g.fillText('May 09 · 2026', PW - 332, 39)
  ruta(g, PW - 214, 26, 66, 26, 13); g.fillStyle = 'rgba(61,214,140,0.14)'; g.fill()
  g.beginPath(); g.arc(PW - 200, 39, 3.6, 0, Math.PI * 2); g.fillStyle = VERDE; g.fill()
  g.fillStyle = VERDE; g.fillText('Live', PW - 190, 39)

  guardar('p-d-marco', cv, 'el tablero: marco, barra lateral y cabecera — lo unico que no se mueve')
  g.restore()
}

// el boton, en capa aparte porque en el video entra despues y acusa el golpe
{
  const [cv, g] = lienzo(158, 34, 4)
  ruta(g, 0, 0, 158, 34, 17)
  const d = g.createLinearGradient(0, 0, 158, 0)
  d.addColorStop(0, '#6B3BFF'); d.addColorStop(1, '#9B5BFF')
  g.fillStyle = d; g.fill()
  g.font = `600 13px "${FUENTE}"`; g.fillStyle = '#FFFFFF'
  g.textBaseline = 'middle'; g.textAlign = 'center'
  g.fillText('+ Deploy Model', 79, 18)
  guardar('p-d-boton', cv, 'el boton "+ Deploy Model", capa aparte para poder acusar el clic')
}

// EL TITULO DEL TABLERO, que en la primera version era un SOLIDO BLANCO y se veia como una barra.
// Fue una capa de relleno que puse "hasta escribir el texto de verdad" y quedo en el cuadro: un
// rectangulo blanco de 300 px en el lugar donde tiene que decir de que trata la pantalla.
{
  const [cv, g] = lienzo(560, 50, 3)
  g.font = `600 26px "${FUENTE}"`; g.fillStyle = CLARO; g.textBaseline = 'middle'
  g.fillText('AI Management Overview', 0, 25)
  guardar('p-d-titulo', cv, 'el titulo del tablero — se revela con una tapa, como si se escribiera')
}

// la bajada del titulo
{
  const [cv, g] = lienzo(560, 40, 3)
  g.font = `400 15px "${FUENTE}"`; g.fillStyle = GRIS; g.textBaseline = 'middle'
  g.fillText('Monitor models, requests & performance in real-time', 0, 20)
  guardar('p-d-bajada', cv, 'la bajada del titulo del tablero')
}

// LAS CUATRO TARJETAS DE CIFRA. Cada una lleva su rotulo pegado: un numero sin sujeto no es un dato.
// Y la linea de tendencia sale en capa APARTE, para que pueda dibujarse.
const TARJ = [
  ['REQUESTS', '2.4M',   '19.2%', VERDE, VIOLETA, '#7C4DFF'],
  ['ACCURACY', '98.4%',  '0.6%',  VERDE, VERDE,   '#3DD68C'],
  ['LATENCY',  '142ms',  '12ms',  ROJO,  ROJO,    '#F2604A'],
  ['COST / 1K', '$8,240', '3.1%', AMBAR, AMBAR,   '#F5A524'],
]
const TW = 252, TH = 148
for (let i = 0; i < TARJ.length; i++) {
  const [rot, cif, delta, colDelta, colIco] = TARJ[i]
  const [cv, g] = lienzo(TW, TH, 3)
  ruta(g, 0, 0, TW, TH, 16)
  g.fillStyle = CAMPO; g.fill()
  g.strokeStyle = LINEA; g.lineWidth = 1; g.stroke()
  g.textBaseline = 'middle'
  ruta(g, 18, 18, 28, 28, 9)
  g.fillStyle = `${colIco}22`; g.fill()
  g.beginPath(); g.arc(32, 32, 6, 0, Math.PI * 2); g.fillStyle = colIco; g.fill()
  g.font = `600 11px "${FUENTE}"`; g.fillStyle = 'rgba(138,133,160,0.85)'
  g.fillText(rot, 18, 66)
  g.font = `700 32px "${FUENTE}"`; g.fillStyle = CLARO
  g.fillText(cif, 18, 98)
  g.font = `600 12px "${FUENTE}"`; g.fillStyle = colDelta
  g.fillText((colDelta === ROJO ? '▼ ' : '▲ ') + delta, 18, 126)
  guardar(`p-d-t${i + 1}`, cv, `tarjeta "${cif} ${rot}"`)
}

// las cuatro lineas de tendencia, en capas propias
const CURVAS = [
  [0.20, 0.34, 0.28, 0.52, 0.46, 0.78],
  [0.40, 0.44, 0.52, 0.50, 0.62, 0.72],
  [0.72, 0.60, 0.66, 0.44, 0.40, 0.26],
  [0.30, 0.42, 0.38, 0.56, 0.60, 0.74],
]
for (let i = 0; i < CURVAS.length; i++) {
  const W = 96, H = 40
  const [cv, g] = lienzo(W, H, 4)
  g.beginPath()
  CURVAS[i].forEach((v, j) => {
    const x = (W / (CURVAS[i].length - 1)) * j, y = H - 4 - v * (H - 12)
    if (j) g.lineTo(x, y); else g.moveTo(x, y)
  })
  g.strokeStyle = TARJ[i][5]; g.lineWidth = 2.4; g.lineJoin = 'round'; g.lineCap = 'round'
  g.stroke()
  guardar(`p-d-s${i + 1}`, cv, `la tendencia de la tarjeta ${i + 1}, en capa propia para dibujarse`)
}

// EL PANEL DEL GRAFICO. El campo va PLANO a proposito: la linea se dibuja con una tapa del color
// exacto del fondo, y con un degradado ningun color de tapa lo igualaria.
const GW = 1112, GH = 300
{
  const [cv, g] = lienzo(GW, GH, 2)
  ruta(g, 0, 0, GW, GH, 18)
  g.fillStyle = CAMPO; g.fill()
  g.strokeStyle = LINEA; g.lineWidth = 1; g.stroke()
  g.textBaseline = 'middle'
  g.font = `600 15px "${FUENTE}"`; g.fillStyle = CLARO
  g.fillText('Request Volume', 22, 30)
  const tog = ['10', '30', '100']
  for (let i = 0; i < 3; i++) {
    const x = GW - 150 + i * 44
    if (i === 1) { ruta(g, x - 8, 18, 38, 24, 8); g.fillStyle = 'rgba(107,59,255,0.20)'; g.fill() }
    g.font = `500 12px "${FUENTE}"`; g.fillStyle = i === 1 ? VIOL_CL : GRIS
    g.fillText(tog[i], x, 30)
  }
  g.strokeStyle = 'rgba(35,34,56,0.9)'; g.lineWidth = 1
  for (let i = 1; i <= 3; i++) {
    const y = 56 + ((GH - 76) / 4) * i
    g.beginPath(); g.moveTo(22, y); g.lineTo(GW - 22, y); g.stroke()
  }
  guardar('p-d-grafico', cv, 'el panel del grafico con su campo PLANO')
}

{
  const [cv, g] = lienzo(GW - 44, GH - 76, 2)
  const W = GW - 44, H = GH - 76
  const pts = [0.12, 0.20, 0.17, 0.30, 0.26, 0.38, 0.34, 0.52, 0.48, 0.66, 0.62, 0.86]
  const px = i => (W / (pts.length - 1)) * i
  const py = v => H - 10 - v * (H - 30)
  g.beginPath(); g.moveTo(px(0), H - 10)
  pts.forEach((v, i) => g.lineTo(px(i), py(v)))
  g.lineTo(px(pts.length - 1), H - 10); g.closePath()
  const d = g.createLinearGradient(0, py(0.86), 0, H - 10)
  d.addColorStop(0, 'rgba(107,59,255,0.38)'); d.addColorStop(1, 'rgba(107,59,255,0)')
  g.fillStyle = d; g.fill()
  g.beginPath()
  pts.forEach((v, i) => (i ? g.lineTo(px(i), py(v)) : g.moveTo(px(i), py(v))))
  g.strokeStyle = VIOL_CL; g.lineWidth = 3; g.lineJoin = 'round'; g.lineCap = 'round'
  g.stroke()
  guardar('p-d-linea', cv, 'la linea del grafico, en capa aparte para dibujarse con una tapa')
}

// el filo de luz del canto inclinado
{
  const [cv, g] = lienzo(PW, 16, 3)
  const d = g.createLinearGradient(0, 0, PW, 0)
  d.addColorStop(0.00, 'rgba(150,110,255,0)')
  d.addColorStop(0.24, 'rgba(206,186,255,0.95)')
  d.addColorStop(0.60, 'rgba(255,255,255,0.9)')
  d.addColorStop(1.00, 'rgba(255,150,60,0)')
  g.fillStyle = d
  ruta(g, 0, 5, PW, 6, 3); g.fill()
  guardar('p-d-filo', cv, 'el canto luminoso del plano inclinado')
}

console.log(`\nrecursos-p2 -> ${DESTINO}\n`)
for (const h of hechos) console.log('  ' + h)
console.log(`\n  ${hechos.length} recursos`)
