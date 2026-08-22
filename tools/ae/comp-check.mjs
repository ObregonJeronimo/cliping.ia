// LA COMPOSICION ENTERA: After Effects contra el reproductor.
//
// Hasta acá se comparó un rectángulo moviéndose. Esto compara una composición con cinco capas — dos
// textos, dos sólidos y un nulo — con emparentado, punto de anclaje animado, rotación, escala y
// opacidad, y con orden de apilado.
//
// SE MIDEN TRES COSAS SEPARADAS, y la separación es el punto. Fallan por razones distintas y se
// arreglan distinto; con un solo número no se sabe cuál de las tres se rompió:
//
//   1. GEOMETRIA — lo que el reproductor CREE de cada capa contra lo que AE dice (`valueAtTime`).
//      Es la conversión de curvas y la composición de matrices, sin píxeles de por medio.
//   2. TIPOGRAFIA — la caja medida del texto en el navegador contra `sourceRectAtTime` de AE.
//      Son dos motores de texto distintos: NO van a coincidir, y lo que importa es cuánto.
//   3. PIXELES — la imagen completa contra la imagen completa.
//
// Un solo número mezclaría "la rotación está mal" con "la fuente mide distinto", que son un defecto y
// una limitación conocida. Es la misma razón por la que la Prueba 3 separó "AE dice" de "AE pinta", y
// ahí ya evitó mandar a arreglar una conversión que estaba sana.
//
// USO
//   node tools/ae/comp-check.mjs

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { leerPNG } from './png.mjs'

const MOTOR_DIR = 'C:/ae-probe/render/MOTOR'
const VOLCADO = 'C:/ae-probe/render.txt'
const DOC = 'C:/ae-probe/p3/motor/comp.json'
const SALIDA = 'C:/ae-probe/render/salida'

for (const r of [MOTOR_DIR, VOLCADO, DOC]) {
  if (!existsSync(r)) { console.error(`falta ${r}`); process.exit(2) }
}

const doc = JSON.parse(readFileSync(DOC, 'utf8'))

// LA CARPETA DE AE SALE DEL DOCUMENTO, NO DE UNA CONSTANTE — y esto costó una corrida entera.
// Estaba escrita a mano apuntando a la composición anterior, así que el reproductor renderizó PIEZA-A
// y se comparó contra los cuadros de ESCENA-LIMPIA. No falló: dio números. La geometría salió perfecta
// (venía del volcado correcto) y los píxeles dieron 1011% de diferencia de tinta, que a primera vista
// parecía un defecto del reproductor.
//
// Es la misma familia que las dos carreras del buzón: comparar contra algo viejo que existe y parece
// válido. Por eso además de derivar la ruta, abajo se COMPRUEBA que el volcado de AE sea de la misma
// composición y tenga la misma cantidad de cuadros. Derivar la ruta arregla este caso; la
// comprobación caza el próximo.
const AE_DIR = `C:/ae-probe/render/${doc.comp.nombre}`
if (!existsSync(AE_DIR)) {
  console.error(`falta ${AE_DIR} — After Effects no renderizó "${doc.comp.nombre}".`)
  process.exit(2)
}
const estados = JSON.parse(readFileSync(join(MOTOR_DIR, 'estados.json'), 'utf8'))
const { ancho, alto, fps } = doc.comp

// ---------------------------------------------------------------- lo que AE dice de cada capa
// VALOR|capa|cuadro|anclaje|posicion|escala|rotacion|opacidad
const deAE = new Map()
let compAE = null, cuadrosAE = null
for (const linea of readFileSync(VOLCADO, 'utf8').split('\n')) {
  const f = linea.trim().split('|')
  if (f[0] === 'COMP') { compAE = f[1]; continue }
  if (f[0] === 'PEDIDOS') { cuadrosAE = +f[1]; continue }
  if (f[0] !== 'VALOR') continue
  const nums = (s) => s.split(';').map(Number)
  deAE.set(`${f[1]}/${f[2]}`, {
    ax: nums(f[3])[0], ay: nums(f[3])[1],
    px: nums(f[4])[0], py: nums(f[4])[1],
    sx: nums(f[5])[0], sy: nums(f[5])[1],
    rot: +f[6], op: +f[7],
  })
}

// SE COMPRUEBA QUE LOS DOS LADOS SEAN LA MISMA PIEZA, antes de mirar un solo pixel. Comparar dos
// composiciones distintas no falla: da numeros, y los numeros parecen un defecto del reproductor.
if (compAE && compAE !== doc.comp.nombre) {
  console.error(`El volcado de After Effects es de "${compAE}" y el documento es de "${doc.comp.nombre}".`)
  console.error('Se estarian comparando dos piezas distintas. Volve a correr node tools/ae/pieza.mjs.')
  process.exit(2)
}
if (cuadrosAE !== null && cuadrosAE !== estados.cuadros.length) {
  console.error(`AE rindio ${cuadrosAE} cuadros y el reproductor ${estados.cuadros.length}. No son la misma corrida.`)
  process.exit(2)
}

console.log('LA COMPOSICION ENTERA — After Effects contra el reproductor')
console.log(`"${doc.comp.nombre}" ${ancho}x${alto} @ ${fps}fps · ${doc.capas.length} capas · ${estados.cuadros.length} cuadros\n`)

// ---------------------------------------------------------------- 1. geometria
console.log('1. GEOMETRIA — lo que el reproductor cree, contra lo que dice AE')
console.log('   capa                anclaje   posicion   escala   rotacion  opacidad')
console.log('   ' + '-'.repeat(68))
let peorGeo = 0
const nombres = new Map(doc.capas.map(c => [c.indice, `${c.indice} ${c.nombre}`]))
for (const capa of doc.capas) {
  const errs = { ax: 0, px: 0, sx: 0, rot: 0, op: 0 }
  let vistos = 0
  for (const cuadro of estados.cuadros) {
    const mio = cuadro.capas[capa.indice]
    const suyo = deAE.get(`${capa.indice}/${cuadro.k}`)
    if (!mio || !suyo) continue
    vistos++
    errs.ax = Math.max(errs.ax, Math.abs(mio.ax - suyo.ax), Math.abs(mio.ay - suyo.ay))
    errs.px = Math.max(errs.px, Math.abs(mio.px - suyo.px), Math.abs(mio.py - suyo.py))
    errs.sx = Math.max(errs.sx, Math.abs(mio.sx - suyo.sx), Math.abs(mio.sy - suyo.sy))
    errs.rot = Math.max(errs.rot, Math.abs(mio.rot - suyo.rot))
    errs.op = Math.max(errs.op, Math.abs(mio.op - suyo.op))
  }
  if (!vistos) { console.log(`   ${nombres.get(capa.indice).padEnd(20)}(sin datos)`); continue }
  peorGeo = Math.max(peorGeo, errs.ax, errs.px, errs.sx, errs.rot, errs.op)
  const f = (v) => (v < 1e-9 ? 'exacto' : v.toExponential(1)).padStart(9)
  console.log(`   ${nombres.get(capa.indice).padEnd(20)}${f(errs.ax)}${f(errs.px)}${f(errs.sx)}${f(errs.rot)}${f(errs.op)}`)
}
console.log(`   peor de todo: ${peorGeo < 1e-9 ? 'exacto' : peorGeo.toExponential(2)}\n`)

// ---------------------------------------------------------------- 2. tipografia
// SE COMPARA TINTA CONTRA TINTA, y esa correccion nacio de mirar los numeros en bruto.
// `sourceRectAtTime` de AE da la caja AJUSTADA A LA TINTA. `getBBox` de SVG da la caja de AVANCE, que
// incluye los espacios laterales de los glifos. Comparadas entre si daban un desvio que parecia de
// renderizado y era de DEFINICION — y se delataba solo: la diferencia era casi constante en pixeles
// absolutos (25 a 29 px) en vez de proporcional, asi que sobre "MOTION" (877 px) daba 3,3% y sobre
// "10" (254 px) daba 10,1%. Un error de escala da el mismo PORCENTAJE; uno de definicion, el mismo
// ABSOLUTO. `actualBoundingBoxLeft/Right` de un contexto 2D si son bordes de tinta.
const cajasInk = existsSync(join(MOTOR_DIR, '..', 'cajas.json'))
  ? JSON.parse(readFileSync(join(MOTOR_DIR, '..', 'cajas.json'), 'utf8')) : null

console.log('2. TIPOGRAFIA — el ancho del texto: navegador contra AE')
console.log(cajasInk
  ? '   TINTA contra TINTA (actualBoundingBox del navegador contra sourceRectAtTime de AE).'
  : '   OJO: sin cajas.json se compara la caja de AVANCE del navegador contra la de TINTA de AE, que\n' +
    '   miden cosas distintas. Corre: python tools/ae/motor/capturar-comp.py --solo-cajas')
let peorTexto = 0
for (const capa of doc.capas) {
  if (!capa.texto || !capa.caja) continue
  const mia = (cajasInk && cajasInk[capa.indice]) || estados.cajas[capa.indice]
  if (!mia) { console.log(`   ${nombres.get(capa.indice)}: el navegador no la midio`); continue }
  const ancho = mia.tinta ? mia.tinta.ancho : mia.ancho
  const dA = ancho - capa.caja.ancho
  const pct = 100 * Math.abs(dA) / capa.caja.ancho
  peorTexto = Math.max(peorTexto, pct)
  console.log(`   ${nombres.get(capa.indice).padEnd(20)}AE ${capa.caja.ancho.toFixed(1)} px  ` +
    `navegador ${ancho.toFixed(1)} px  diferencia ${dA >= 0 ? '+' : ''}${dA.toFixed(1)} px (${pct.toFixed(2)}%)` +
    (mia.tinta ? `   [avance ${mia.tinta.avance.toFixed(1)}]` : ''))
}
console.log(`   peor desvio de ancho: ${peorTexto.toFixed(2)}%`)

// ---------------------------------------------------------------- 3. pixeles
console.log('\n3. PIXELES — la imagen completa contra la imagen completa')
// COMPARAR CON EL MISMO OBTURADOR, O DECIRLO. Una captura sin desenfoque contra un render de AE con
// 16 muestras difiere mucho en todo cuadro con movimiento, y esa diferencia se lee como un defecto del
// reproductor. No es: es la prueba comparando cosas distintas.
const muestrasMotor = estados.muestras ?? null
const muestrasAE = doc.obturador?.activo ? doc.obturador.muestras : 1
if (muestrasMotor !== null && muestrasMotor !== muestrasAE) {
  console.log(`   OJO: el reproductor rindio con ${muestrasMotor} muestra(s) por cuadro y AE con ${muestrasAE}.`)
  console.log('   Los cuadros QUIETOS son comparables; los que se mueven van a diferir por el desenfoque,')
  console.log('   no por la geometria. Para un veredicto de pixeles hay que igualar el obturador.')
}
if (estados.pagina) console.log(`   reproductor: ${estados.pagina}`)
const n3 = (s) => String(s).padStart(3, '0')
const filas = []
for (let k = 0; k < estados.cuadros.length; k++) {
  const a = join(AE_DIR, `f${n3(k)}.png`)
  const b = join(MOTOR_DIR, `f${n3(k)}.png`)
  if (!existsSync(a) || !existsSync(b)) continue
  const A = leerPNG(a), B = leerPNG(b)
  if (A.ancho !== B.ancho || A.alto !== B.alto) {
    console.error(`   f${k}: ${A.ancho}x${A.alto} contra ${B.ancho}x${B.alto}`); process.exit(1)
  }
  // UN PNG COMPLETAMENTE OPACO SE GUARDA CON TRES CANALES, no cuatro: el codificador descarta un alfa
  // que vale 255 en todos lados. Indexar de a 4 bytes sobre una imagen de a 3 no falla — devuelve los
  // canales del pixel siguiente, o sea colores plausibles y completamente equivocados. Dio 49,75% de
  // pixeles distintos y NaN de promedio, y parecia un defecto del reproductor cuando el render estaba
  // perfecto. El ancho de pixel se lee del archivo, no se asume.
  const cA = A.canales, cB = B.canales
  let suma = 0, distintos = 0, masaA = 0, masaB = 0
  const total = A.ancho * A.alto
  for (let p = 0; p < total; p++) {
    const iA = p * cA, iB = p * cB
    // se compara sobre ALFA COMPUESTO contra negro: es lo que se ve, y evita que un pixel totalmente
    // transparente con basura en RGB cuente como diferencia
    const aa = cA === 4 ? A.datos[iA + 3] / 255 : 1
    const ba = cB === 4 ? B.datos[iB + 3] / 255 : 1
    masaA += aa; masaB += ba
    let d = 0
    for (let c = 0; c < 3; c++) d += Math.abs(A.datos[iA + c] * aa - B.datos[iB + c] * ba)
    d = d / 3
    suma += d
    if (d > 24) distintos++
  }
  filas.push({ k, medio: suma / total, distintos: distintos / total, masaA, masaB })
}
const peor = filas.reduce((x, y) => (y.medio > x.medio ? y : x))
const medioGlobal = filas.reduce((s, f) => s + f.medio, 0) / filas.length
console.log(`   diferencia media por cuadro: ${medioGlobal.toFixed(2)} de 255`)
console.log(`   peor cuadro: f${peor.k} con ${peor.medio.toFixed(2)} y ${(100 * peor.distintos).toFixed(2)}% de pixeles claramente distintos`)
const tinta = filas.reduce((s, f) => s + Math.abs(f.masaA - f.masaB) / Math.max(f.masaA, 1), 0) / filas.length
console.log(`   diferencia de TINTA (cuanta imagen hay, no donde): ${(100 * tinta).toFixed(2)}% en promedio`)

// ---------------------------------------------------------------- la hoja de contacto
const { createCanvas, loadImage } = await import('@napi-rs/canvas')
// las muestras se reparten sobre TODA la pieza: una lista fija se queda mirando los primeros tres
// segundos y una pieza de ocho no se ve nunca entera
const CUANTAS = 6
const N = estados.cuadros.length
const MUESTRAS = Array.from({ length: CUANTAS }, (_, i) => Math.round(i * (N - 1) / (CUANTAS - 1)))
const CW = 480, CH = 270, ETQ = 22
const cv = createCanvas(CW * 3, ETQ + MUESTRAS.length * (CH + ETQ))
const g = cv.getContext('2d')
g.fillStyle = '#0e0e12'; g.fillRect(0, 0, cv.width, cv.height)
g.fillStyle = '#e8e8ea'; g.font = 'bold 14px sans-serif'
g.fillText('AFTER EFFECTS', 10, 15)
g.fillText('EL REPRODUCTOR', CW + 10, 15)
g.fillText('LA DIFERENCIA (x6)', CW * 2 + 10, 15)

for (let r = 0; r < MUESTRAS.length; r++) {
  const k = MUESTRAS[r]
  const y = ETQ + r * (CH + ETQ)
  const A = leerPNG(join(AE_DIR, `f${n3(k)}.png`))
  const B = leerPNG(join(MOTOR_DIR, `f${n3(k)}.png`))
  g.drawImage(await loadImage(join(AE_DIR, `f${n3(k)}.png`)), 0, y, CW, CH)
  g.drawImage(await loadImage(join(MOTOR_DIR, `f${n3(k)}.png`)), CW, y, CW, CH)

  // la diferencia se calcula sobre los pixeles decodificados y se dibuja reducida, amplificada x6
  // para que algo de 4 niveles de gris sea visible sin inventar nada
  const img = g.createImageData(CW, CH)
  const paso = Math.round(ancho / CW)
  for (let yy = 0; yy < CH; yy++) {
    for (let xx = 0; xx < CW; xx++) {
      const p = ((yy * paso) * ancho + xx * paso) * 4
      const aa = A.datos[p + 3] / 255, ba = B.datos[p + 3] / 255
      let d = 0
      for (let c = 0; c < 3; c++) d += Math.abs(A.datos[p + c] * aa - B.datos[p + c] * ba)
      const v = Math.min(255, (d / 3) * 6)
      const q = (yy * CW + xx) * 4
      img.data[q] = v; img.data[q + 1] = v * 0.5; img.data[q + 2] = v * 0.35; img.data[q + 3] = 255
    }
  }
  g.putImageData(img, CW * 2, y)

  g.fillStyle = '#9aa0a6'; g.font = '11px monospace'
  const fila = filas.find(f => f.k === k)
  g.fillText(`cuadro ${k}  ·  t=${(k / fps).toFixed(3)}s  ·  diferencia media ${fila ? fila.medio.toFixed(2) : '?'}/255`, 10, y + CH + 15)
  g.strokeStyle = '#2a2a34'
  for (let c = 0; c < 3; c++) g.strokeRect(c * CW + .5, y + .5, CW - 1, CH - 1)
}
if (!existsSync(SALIDA)) mkdirSync(SALIDA, { recursive: true })
const png = join(SALIDA, 'comp.png')
writeFileSync(png, cv.toBuffer('image/png'))
console.log(`\nhoja de contacto: ${png}`)

// EL UMBRAL DE LA GEOMETRIA NO ES "EXACTO", Y PONERLO AHI ERA UN ERROR MIO.
// La conversion de curvas tiene un residuo YA CARACTERIZADO: 0,0001 a 0,018 px, y sale de como AE
// recorre una posicion vectorial por largo de arco (Parte V, seccion 28.2). Exigir exactitud absoluta
// hace que ese residuo conocido se informe como defecto nuevo — que es la forma mas rapida de que una
// compuerta se aprenda a ignorar. El umbral se pone donde el residuo conocido pasa y un defecto de
// verdad no: 0,05 px es tres veces el peor residuo medido y sigue siendo cincuenta veces menos que un
// pixel.
const UMBRAL_GEO = 0.05
console.log('\n' + '='.repeat(72))
if (peorGeo < UMBRAL_GEO) {
  console.log(`GEOMETRIA OK — peor desvio ${peorGeo.toExponential(2)} px, dentro del residuo ya medido de la\n` +
    `conversion de curvas (0,0001 a 0,018 px). El reproductor compone las matrices, el emparentado y\n` +
    `el punto de anclaje igual que After Effects.`)
} else {
  console.log(`GEOMETRIA CON ERROR de ${peorGeo.toExponential(2)} px, por encima del residuo conocido:\n` +
    `eso SI es un defecto de composicion, no una limitacion.`)
}
if (peorTexto > 2) {
  console.log(`\nOJO CON LA TIPOGRAFIA: ${peorTexto.toFixed(1)}% de desvio de ancho. Un texto que mide distinto\n` +
    `rompe cualquier composicion que dependa de donde termina — que es el problema P4 del cuaderno.`)
}
process.exit(peorGeo < UMBRAL_GEO ? 0 : 1)
