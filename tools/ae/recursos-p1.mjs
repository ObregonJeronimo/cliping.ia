// RECURSOS DE LA PIEZA-P, planos 1 a 5 — el mundo oscuro y el revelado de marca.
//
// LA PIEZA-P RECREA UNA REFERENCIA CON LICENCIA CC-BY:
//   "SaaS Product Promo After Effects Template" · canal "AE Template & Premiere Pro Template"
//   Creative Commons Attribution license (reuse allowed) — verificado en los metadatos de YouTube.
// La licencia habilita adaptar y redistribuir con atribucion, que va escrita en la cabecera de la pieza.
//
// LO QUE ORDENA ESTE ARCHIVO: cada texto se entrega PARTIDO EN PIEZAS, no como un bloque.
//
// Es la correccion mas importante que dio el usuario, y vale mas que cualquier numero de la medicion:
//
//   "una diferencia grande es poner un texto entero que dure 2 segundos que aparece de la nada, a usar
//    una animacion que muestra 'tu video' y luego otra animacion que se junta con 'tu video' y queda el
//    texto entero, eso si esta bien, POR BUENA COREOGRAFIA"
//
// Un rotulo que aparece completo no tiene coreografia: tiene una entrada. Un rotulo que se ARMA —una
// parte llega, se asienta, y la siguiente se le suma— tiene tantos tiempos como partes. Por eso aca
// ninguna frase sale como un solo PNG: salen las palabras sueltas, y la pieza decide cuando entra cada
// una y como se junta con la anterior.
//
// USO
//   node tools/ae/recursos-p1.mjs

import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { createCanvas } from '@napi-rs/canvas'

const DESTINO = process.env.RECURSOS_P || 'C:/ae-probe/recursos-p'
if (!existsSync(DESTINO)) mkdirSync(DESTINO, { recursive: true })

const W = 1920, H = 1080
const FUENTE = 'Segoe UI'
const hechos = []

const lienzo = (w, h, k = 1) => {
  const cv = createCanvas(Math.round(w * k), Math.round(h * k))
  const g = cv.getContext('2d')
  g.scale(k, k)
  return [cv, g]
}
function guardar (n, cv, nota) {
  writeFileSync(`${DESTINO}/${n}.png`, cv.toBuffer('image/png'))
  hechos.push(`${n.padEnd(20)} ${String(cv.width).padStart(5)}x${String(cv.height).padEnd(5)} ${nota}`)
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

// LA FUENTE SE COMPRUEBA CONTRA LA SUSTITUTA. Skia acepta cualquier cadena en `g.font` y dibuja con la
// sustituta sin decir nada: medido, "Helvetica" NO existe en esta maquina y devuelve exactamente el
// mismo ancho que una familia inventada.
{
  const g = createCanvas(10, 10).getContext('2d')
  const an = (f, p = '') => { g.font = `${p}100px "${f}"`; return g.measureText('Handgloves 123').width }
  if (Math.abs(an(FUENTE) - an('__no-existe__')) < 0.01) {
    throw new Error(`"${FUENTE}" no existe en Skia: mide igual que una familia inventada.`)
  }
}

// ================================================================ 1 · el suelo oscuro con su resplandor
//
// El mundo de los planos 1, 2, 3 y 12 es NEGRO con una luz que sube desde abajo. No es un degradado de
// arriba a abajo: es una fuente puntual baja, que es lo que hace que el negro de arriba se lea como
// PROFUNDIDAD y no como un fondo plano.
function suelo (nombre, manchas, nota) {
  const [cv, g] = lienzo(W, H, 1)
  g.fillStyle = '#030308'
  g.fillRect(0, 0, W, H)
  for (const m of manchas) {
    const d = g.createRadialGradient(m.x * W, m.y * H, 0, m.x * W, m.y * H, m.r * W)
    d.addColorStop(0.00, `rgba(${m.c},${m.a})`)
    d.addColorStop(0.45, `rgba(${m.c},${m.a * 0.34})`)
    d.addColorStop(1.00, `rgba(${m.c},0)`)
    g.fillStyle = d
    g.fillRect(0, 0, W, H)
  }
  guardar(nombre, cv, nota)
}

suelo('p-suelo', [
  { x: 0.50, y: 1.06, r: 0.52, c: '92,66,255', a: 0.95 },
  { x: 0.16, y: 1.02, r: 0.34, c: '236,96,54',  a: 0.55 },
  { x: 0.86, y: 1.00, r: 0.32, c: '196,72,220', a: 0.50 },
  { x: 0.50, y: 0.72, r: 0.42, c: '58,40,170',  a: 0.35 },
], 'negro con la luz subiendo desde abajo: fuente puntual, no degradado')

suelo('p-suelo-cierre', [
  { x: 0.50, y: 1.10, r: 0.40, c: '92,66,255', a: 0.70 },
  { x: 0.50, y: 0.52, r: 0.16, c: '128,88,255', a: 0.55 },
], 'el mismo suelo, mas cerrado, para el plano 12')

// ================================================================ 2 · la malla clara del plano 4
{
  const [cv, g] = lienzo(W, H, 1)
  g.fillStyle = '#F4F2FB'
  g.fillRect(0, 0, W, H)
  const manchas = [
    { x: 0.22, y: 0.30, r: 0.46, c: '198,188,252', a: 0.85 },
    { x: 0.74, y: 0.20, r: 0.40, c: '226,220,255', a: 0.80 },
    { x: 0.30, y: 0.86, r: 0.52, c: '124,96,246',  a: 0.62 },
    { x: 0.86, y: 0.74, r: 0.44, c: '166,138,250', a: 0.55 },
    { x: 0.54, y: 0.52, r: 0.30, c: '255,255,255', a: 0.70 },
  ]
  for (const m of manchas) {
    const d = g.createRadialGradient(m.x * W, m.y * H, 0, m.x * W, m.y * H, m.r * W)
    d.addColorStop(0.00, `rgba(${m.c},${m.a})`)
    d.addColorStop(0.50, `rgba(${m.c},${m.a * 0.4})`)
    d.addColorStop(1.00, `rgba(${m.c},0)`)
    g.fillStyle = d
    g.fillRect(0, 0, W, H)
  }
  guardar('p-malla-clara', cv, 'la malla lila del plano 4')
}

// ================================================================ 3 · LA TIPOGRAFIA, PARTIDA EN PALABRAS
//
// Cada palabra es su propio PNG. La pieza las hace entrar por separado y se juntan en el aire — que es
// exactamente la coreografia que el usuario pidio y la que un bloque unico no puede dar.
//
// El degradado va sobre el ancho de CADA palabra pero con las paradas corridas segun su lugar en la
// frase, asi que cuando las palabras terminan de juntarse el degradado corre CONTINUO a lo largo de
// toda la linea. Si cada palabra tuviera su propio degradado completo, la frase armada se leeria como
// tres cosas pegadas.
function palabras (base, frase, cuerpo, opciones = {}) {
  const peso = opciones.peso || '700 '
  const k = opciones.k || 2
  const gm = createCanvas(10, 10).getContext('2d')
  gm.font = `${peso}${cuerpo}px "${FUENTE}"`

  const trozos = frase.split(' ')
  const anchos = trozos.map(t => gm.measureText(t).width)
  const espacio = gm.measureText(' ').width
  const total = anchos.reduce((a, b) => a + b, 0) + espacio * (trozos.length - 1)

  let acum = 0
  const salida = []
  trozos.forEach((t, i) => {
    const margen = Math.ceil(cuerpo * 0.28)
    const [cv, g] = lienzo(Math.ceil(anchos[i]) + margen * 2, Math.ceil(cuerpo * 1.5) + margen * 2, k)
    const ch = cv.height / k
    g.font = `${peso}${cuerpo}px "${FUENTE}"`
    g.textBaseline = 'middle'
    if (opciones.plano) {
      g.fillStyle = opciones.color || '#111'
    } else {
      // el degradado de la FRASE ENTERA, recortado en la ventana que le toca a esta palabra
      const d = g.createLinearGradient(margen - acum, 0, margen - acum + total, 0)
      d.addColorStop(0.00, opciones.c0 || '#FFFFFF')
      d.addColorStop(0.50, opciones.c1 || '#D9C8FF')
      d.addColorStop(1.00, opciones.c2 || '#7C4DFF')
      g.fillStyle = d
    }
    g.fillText(t, margen, ch / 2)
    guardar(`${base}-${i + 1}`, cv, `"${t}" · ${cuerpo}px · ${Math.round(anchos[i])} px de tinta`)
    salida.push({ palabra: t, ancho: anchos[i], desde: acum })
    acum += anchos[i] + espacio
  })
  // la pieza necesita saber donde va cada palabra para armarlas: se imprime la tabla
  console.log(`\n  ${base} — "${frase}" · ${cuerpo}px · linea de ${Math.round(total)} px`)
  salida.forEach((s, i) => {
    const centro = s.desde + s.ancho / 2 - total / 2
    console.log(`    ${base}-${i + 1}  "${s.palabra}"  ancho ${Math.round(s.ancho)}  centro relativo ${Math.round(centro)}`)
  })
  return salida
}

// PLANOS 1-2 · la tipografia cinetica gigante. 300 px de cuerpo: en la referencia las letras son mas
// altas que medio cuadro, y esa escala es la mitad del efecto.
palabras('p-k', 'Construido para equipos', 300, { c0: '#FFFFFF', c1: '#CBB6FF', c2: '#6B3BFF' })

// PLANO 4 · sobre la malla clara, tipografia oscura
palabras('p-claro', 'Dale a tu equipo', 118, { plano: true, color: '#1A1030', peso: '600 ' })

// PLANO 5 · la cifra del centro. LLEVA SU ROTULO PEGADO: un numero sin sujeto no es un dato, es la
// forma de un dato — la regla que la PIEZA-M rompio con su "100%" suelto.
palabras('p-cifra', '10x mas rapido', 104, { plano: true, color: '#3B2A8C', peso: '700 ' })

// ================================================================ 4 · el isotipo facetado
//
// Un rombo partido en cuatro caras con luces distintas. Las facetas son lo que lo hace leer como un
// objeto con volumen y no como una silueta: cada una recibe la luz en otro angulo.
{
  const L = 520, k = 3
  const [cv, g] = lienzo(L, L, k)
  const cx = L / 2, cy = L / 2, R = L * 0.44
  const cara = (pts, c0, c1) => {
    g.beginPath()
    pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])))
    g.closePath()
    const d = g.createLinearGradient(pts[0][0], pts[0][1], pts[2] ? pts[2][0] : pts[1][0], pts[2] ? pts[2][1] : pts[1][1])
    d.addColorStop(0, c0); d.addColorStop(1, c1)
    g.fillStyle = d; g.fill()
  }
  const T = [cx, cy - R], B = [cx, cy + R], I = [cx - R * 0.78, cy], D = [cx + R * 0.78, cy]
  const M = [cx, cy]
  cara([T, D, M], '#B79BFF', '#6B3BFF')
  cara([D, B, M], '#7C4DFF', '#3A1FB0')
  cara([B, I, M], '#5B2FE0', '#2A1590')
  cara([I, T, M], '#9B7BFF', '#5426D8')
  // el filo especular: una linea clara sobre la arista superior derecha, que es lo que hace que se lea
  // como una superficie dura y no como un degradado
  g.strokeStyle = 'rgba(255,255,255,0.92)'; g.lineWidth = L * 0.018; g.lineCap = 'round'
  g.beginPath(); g.moveTo(T[0], T[1]); g.lineTo(D[0], D[1]); g.stroke()
  guardar('p-iso', cv, 'el isotipo: cuatro caras con luces distintas y un filo especular')
}

// las letras fantasma del fondo del plano 3
{
  const [cv, g] = lienzo(W, H, 1)
  g.font = `700 760px "${FUENTE}"`
  g.fillStyle = 'rgba(255,255,255,0.030)'
  g.textBaseline = 'middle'
  g.textAlign = 'center'
  g.fillText('nodo', W / 2, H * 0.42)
  guardar('p-fantasma', cv, 'las letras gigantes del fondo, al 3% — llenan sin competir')
}

// ================================================================ 5 · los anillos del plano 5
//
// TRES ANILLOS EN CAPAS SEPARADAS Y NO UNA IMAGEN CON LOS TRES. Es la ley L23: un PNG plano tiene UN
// estado. Con los tres horneados juntos no se pueden escalonar, y el gesto de este plano ES el
// escalonado — se expanden de adentro hacia afuera, uno atras del otro.
for (let i = 0; i < 3; i++) {
  const L = 1500, k = 2
  const [cv, g] = lienzo(L, L * 0.62, k)
  const w = L * (0.30 + i * 0.20), h = L * 0.62 * (0.30 + i * 0.22)
  ruta(g, (L - w) / 2, (L * 0.62 - h) / 2, w, h, h / 2)
  g.strokeStyle = `rgba(108,80,240,${0.95 - i * 0.24})`
  g.lineWidth = L * 0.030
  g.stroke()
  guardar(`p-anillo-${i + 1}`, cv, `anillo ${i + 1} de 3, EN CAPA APARTE para poder escalonarlos`)
}

console.log(`\nrecursos-p1 -> ${DESTINO}\n`)
for (const h of hechos) console.log('  ' + h)
console.log(`\n  ${hechos.length} recursos`)
