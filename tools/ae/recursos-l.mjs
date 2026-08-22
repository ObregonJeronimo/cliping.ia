// LOS RECURSOS DE LA PIEZA-L. Son cinco, y son pocos a proposito.
//
// LA IDEA QUE LOS ORDENA: el punto que entra al principio ES LA TAPA IZQUIERDA de la pildora en la que
// se convierte. No hay morphing falso ni cambio de textura — el mismo objeto cambia de rol. Por eso la
// pildora no es un recurso: son DOS circulos y una barra lisa entre ellos, y las mitades interiores de
// los circulos quedan tapadas por la barra.
//
// Y POR ESO LA PILDORA NO SE HACE ESTIRANDO UN PLANO. Un rectangulo redondeado escalado x4 aplasta sus
// esquinas y se ve al primer cuadro; medido en la referencia, la pildora va de 342 a 1533 de ancho, o
// sea x4,48. La forma correcta es geometria: las dos tapas se SEPARAN y la barra crece entre ellas, con
// el radio intacto siempre.
//
// LA SOMBRA ES DURA Y VA EN CAPA APARTE. En los proyectos medidos la sombra tiene suavizado 0 —o sea es
// un desplazamiento, no un desenfoque— asi que se resuelve con una copia oscura corrida, que ademas
// puede MOVERSE con el objeto. Hornearla adentro del PNG la dejaria clavada.
//
// USO
//   node tools/ae/recursos-l.mjs

import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { createCanvas } from '@napi-rs/canvas'

const DESTINO = process.env.RECURSOS_L || 'C:/ae-probe/recursos-l'
if (!existsSync(DESTINO)) mkdirSync(DESTINO, { recursive: true })

const guardar = (n, cv) => {
  writeFileSync(`${DESTINO}/${n}.png`, cv.toBuffer('image/png'))
  return `${n}.png ${cv.width}x${cv.height}`
}
const lienzo = (w, h, k) => { const cv = createCanvas(w * k, h * k); const g = cv.getContext('2d'); g.scale(k, k); return [cv, g] }
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

const P = {
  fondoA: '#F6F7FA', fondoB: '#E7EAF2', fondoC: '#DADEEA',
  tinta: '#101216',
  azul: '#2F6BFF', azulHondo: '#1B49C4', azulClaro: '#7EA6FF',
  sombra: '#252B3D',
}

const hechos = []
const K = 3   // los circulos llegan a ocupar medio cuadro: con k=2 quedan en 1,4x y Q2 pide 2x

// ---------------------------------------------------------------- el fondo
// NUNCA UN SOLIDO PLANO — es el reclamo que ya costo una pieza. Radial descentrado, viñeta eliptica y
// una barrida diagonal muy suave. Y va con GRANO encima en la pieza, que es lo que disuelve el bandeado
// de un degradado de 8 bits sobre superficie grande.
{
  const W = 2600, H = 1600
  const [cv, g] = lienzo(W, H, 1)
  const base = g.createLinearGradient(0, 0, W * 0.3, H)
  base.addColorStop(0, P.fondoA); base.addColorStop(1, P.fondoB)
  g.fillStyle = base; g.fillRect(0, 0, W, H)
  // el foco, elipse: createRadialGradient solo hace circulos, asi que se achata el sistema de ejes
  g.save(); g.translate(W * 0.5, H * 0.34); g.scale(1, 0.62)
  const foco = g.createRadialGradient(0, 0, 0, 0, 0, W * 0.42)
  foco.addColorStop(0, rgba('#FFFFFF', 0.85)); foco.addColorStop(1, rgba('#FFFFFF', 0))
  g.fillStyle = foco; g.fillRect(-W, -H, W * 2, H * 2); g.restore()
  // la viñeta, en azul grisado y no en negro: sobre un fondo frio el negro ensucia
  g.save(); g.translate(W / 2, H / 2); g.scale(1, H / W)
  const vig = g.createRadialGradient(0, 0, W * 0.30, 0, 0, W * 0.78)
  vig.addColorStop(0, rgba(P.fondoC, 0)); vig.addColorStop(1, rgba(P.fondoC, 0.62))
  g.fillStyle = vig; g.fillRect(-W, -W, W * 2, W * 2); g.restore()
  hechos.push(guardar('fondo', cv))
}

// ---------------------------------------------------------------- grano
// tres cuadros que se ciclan cada dos: con uno solo el grano queda congelado y se lee como suciedad de
// la lente en vez de como grano
for (const [n, semilla] of [[1, 7], [2, 5443], [3, 90211]]) {
  const W = 1920, H = 1080
  const [cv, g] = lienzo(W, H, 1)
  const img = g.createImageData(W, H)
  let s = semilla >>> 0
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    s = (s * 1664525 + 1013904223) >>> 0
    const v = (s / 4294967296 * 255) | 0
    d[i] = d[i + 1] = d[i + 2] = v
    d[i + 3] = 26
  }
  g.putImageData(img, 0, 0)
  hechos.push(guardar('grano-' + n, cv))
}

// ---------------------------------------------------------------- el punto / la tapa
// Un circulo pleno con un degradado corto para que no se lea como una calcomania. Se usa TRES veces: el
// punto que entra, y las dos tapas de la pildora.
{
  const D = 260
  const [cv, g] = lienzo(D, D, K)
  // EL DEGRADADO VA VERTICAL, NO DIAGONAL, Y ESO NO ES ESTETICA: ES EMPALME. Un circulo con degradado
  // diagonal sobre SU PROPIA caja tiene su lado claro a la izquierda, y como las dos tapas usan el mismo
  // PNG, la de la DERECHA tambien lo tiene a la izquierda — o sea en el medio de la pildora. Se ve un
  // disco mas claro pegado al centro, que delata que la pildora son tres piezas.
  //
  // Vertical, las tres piezas comparten la misma direccion de luz y el empalme desaparece. La regla
  // general: cuando una forma se arma con partes que se repiten, el degradado tiene que depender de una
  // coordenada que NO cambie entre las partes.
  const gr = g.createLinearGradient(0, 0, 0, D)
  gr.addColorStop(0, P.azulClaro); gr.addColorStop(0.5, P.azul); gr.addColorStop(1, P.azulHondo)
  g.beginPath(); g.arc(D / 2, D / 2, D / 2, 0, Math.PI * 2); g.fillStyle = gr; g.fill()
  hechos.push(guardar('punto', cv))
}

// la sombra del punto: la MISMA figura en oscuro, para ir corrida en una capa aparte
{
  const D = 260
  const [cv, g] = lienzo(D, D, K)
  g.beginPath(); g.arc(D / 2, D / 2, D / 2, 0, Math.PI * 2)
  g.fillStyle = rgba(P.sombra, 1); g.fill()
  hechos.push(guardar('punto-sombra', cv))
}

// ---------------------------------------------------------------- la barra del centro de la pildora
// Lisa y sin esquinas: los extremos los tapan los dos circulos. Por eso puede estirarse todo lo que
// haga falta sin deformar nada — no tiene ninguna curva que aplastar.
//
// MIDE 460 DE ANCHO Y NO 200 POR UNA COMPUERTA, no por diseno: la barra llega a dibujarse 640 px en
// pantalla, y con 200 logicos (600 nativos a k=3) queda en 0,94x — `lectura-check` Q2 pide 2x y marca
// BORRO. A 460 son 1380 nativos, o sea 2,16x. Estirar una barra lisa es gratis en calidad SOLO si tiene
// pixeles de sobra; si no, es exactamente el mismo defecto que estirar un panel con esquinas.
{
  const W = 460, H = 260
  const [cv, g] = lienzo(W, H, K)
  // misma direccion y MISMAS paradas que el circulo, para que el empalme no se vea
  const gr = g.createLinearGradient(0, 0, 0, H)
  gr.addColorStop(0, P.azulClaro); gr.addColorStop(0.5, P.azul); gr.addColorStop(1, P.azulHondo)
  g.fillStyle = gr; g.fillRect(0, 0, W, H)
  hechos.push(guardar('centro', cv))
}
{
  const W = 200, H = 260
  const [cv, g] = lienzo(W, H, K)
  g.fillStyle = rgba(P.sombra, 1); g.fillRect(0, 0, W, H)
  hechos.push(guardar('centro-sombra', cv))
}

// ---------------------------------------------------------------- la placa de la pila
// Se duplica N veces y se despliega en profundidad. Blanca con un borde finito: lo que tiene que leerse
// es el ESCALONADO, no el contenido de cada una.
{
  const W = 520, H = 340
  const [cv, g] = lienzo(W, H, 2)
  ruta(g, 6, 6, W - 12, H - 12, 34)
  g.fillStyle = '#FFFFFF'; g.fill()
  ruta(g, 7.5, 7.5, W - 15, H - 15, 32.5)
  g.strokeStyle = rgba('#101216', 0.10); g.lineWidth = 3; g.stroke()
  // una banda azul arriba, para que el escalonado tenga un borde que seguir con el ojo
  g.save(); ruta(g, 6, 6, W - 12, H - 12, 34); g.clip()
  const b = g.createLinearGradient(6, 6, W - 6, 6)
  b.addColorStop(0, P.azul); b.addColorStop(1, P.azulClaro)
  g.fillStyle = b; g.fillRect(6, 6, W - 12, 14)
  g.restore()
  hechos.push(guardar('placa', cv))
}

console.log(`\nrecursos-l -> ${DESTINO}`)
for (const h of hechos) console.log('  ' + h)
console.log(`  ${hechos.length} recurso(s)`)
