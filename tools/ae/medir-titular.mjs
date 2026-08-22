// ¿UN TITULAR SALTA DE TAMAÑO O SE ACERCA? — medido cuadro a cuadro sobre los pixeles.
//
// POR QUE EXISTE. Yo afirme que la referencia cambia el tamaño de sus titulares con CORTE DURO, y lo
// deduje de cuadros muestreados a 2 por segundo. A esa cadencia un corte duro y un acercamiento de
// medio segundo se ven EXACTAMENTE IGUAL: entre una muestra y la siguiente el texto es mas grande, y
// nada mas. O sea que mi evidencia no podia distinguir las dos hipotesis, y yo elegi una igual.
//
// Es el mismo error que este repo ya tiene anotado con otro nombre (nota 93: "una prueba que las dos
// hipotesis pasan no es una prueba"), cometido por mi, sobre una referencia, y trasladado a la skill
// como si fuera un hallazgo.
//
// COMO SE SEPARAN LAS DOS HIPOTESIS. Se extrae el tramo a CADENCIA COMPLETA y se mide, en cada cuadro,
// la caja de la tinta clara sobre el fondo oscuro. Con corte duro el ancho da un escalon entre dos
// cuadros consecutivos; con acercamiento da una rampa de varios cuadros, y la FORMA de esa rampa
// ademas dice que curva de aceleracion se uso.
//
// LO QUE ESTA MEDICION NO DICE: si el texto ademas se movio, cambio de color o cambio de contenido. Es
// una caja de tinta, no un reconocimiento. Sirve para la pregunta que contesta y para ninguna otra.
//
// USO
//   ffmpeg -i ref.mp4 -vf "select='between(n,140,235)'" -vsync 0 -frame_pts 1 f/n%04d.png
//   node tools/ae/medir-titular.mjs C:/ae-probe/gemini30/f [umbral]

import { readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { leerPNG } from './png.mjs'

const DIR = process.argv[2] || 'C:/ae-probe/gemini30/f'
const UMBRAL = +(process.argv[3] || 150)
if (!existsSync(DIR)) { console.error(`falta ${DIR}`); process.exit(2) }

const archivos = readdirSync(DIR).filter(f => /^n\d+\.png$/.test(f)).sort()
if (!archivos.length) { console.error(`no hay cuadros en ${DIR}`); process.exit(2) }

// LA BANDA CENTRAL, no el cuadro entero: arriba y abajo viven la interfaz y los bordes encendidos del
// panel, que son claros y meterian su propio ancho en la medicion. El titular vive en el medio.
const filas = [0.30, 0.72]

const medidas = []
for (const f of archivos) {
  const im = leerPNG(join(DIR, f))
  const y0 = Math.round(im.alto * filas[0]), y1 = Math.round(im.alto * filas[1])
  let xMin = im.ancho, xMax = -1, yMin = im.alto, yMax = -1, tinta = 0
  for (let y = y0; y < y1; y++) {
    for (let x = 0; x < im.ancho; x++) {
      const i = (y * im.ancho + x) * 4
      // luminancia perceptual sobre el hex, que es como se mide en este repo — nunca sobre canales
      // de un THREE.Color, que salen en lineal
      const L = 0.2126 * im.datos[i] + 0.7152 * im.datos[i + 1] + 0.0722 * im.datos[i + 2]
      if (L < UMBRAL) continue
      tinta++
      if (x < xMin) xMin = x
      if (x > xMax) xMax = x
      if (y < yMin) yMin = y
      if (y > yMax) yMax = y
    }
  }
  const n = +f.match(/\d+/)[0]
  medidas.push({ n, ancho: xMax - xMin, alto: yMax - yMin, cx: (xMin + xMax) / 2, tinta })
}

// los saltos de numeracion parten el informe en tramos: dos rangos de ffmpeg son dos escenas distintas
const tramos = []
let actual = [medidas[0]]
for (let i = 1; i < medidas.length; i++) {
  if (medidas[i].n === medidas[i - 1].n + 1) actual.push(medidas[i])
  else { tramos.push(actual); actual = [medidas[i]] }
}
tramos.push(actual)

console.log(`MEDIR TITULAR — ${archivos.length} cuadros · umbral de luminancia ${UMBRAL} · banda ${filas[0]}-${filas[1]} del alto\n`)

for (const t of tramos) {
  console.log(`  tramo ${t[0].n}-${t[t.length - 1].n}`)
  console.log(`  cuadro   ancho   alto    dAncho   tinta      barra`)
  const maxA = Math.max(...t.map(m => m.ancho))
  for (let i = 0; i < t.length; i++) {
    const m = t[i]
    const d = i ? m.ancho - t[i - 1].ancho : 0
    if (m.tinta < 40) { console.log(`  ${String(m.n).padStart(6)}   (sin tinta)`); continue }
    const barra = '#'.repeat(Math.max(0, Math.round(m.ancho / maxA * 44)))
    console.log(`  ${String(m.n).padStart(6)} ${String(m.ancho).padStart(7)} ${String(m.alto).padStart(6)} ` +
      `${(d > 0 ? '+' : '') + d}`.padStart(9) + ` ${String(m.tinta).padStart(7)}   ${barra}`)
  }
  // EL VEREDICTO, que es el punto de todo esto. Un salto duro concentra TODO el cambio en un solo
  // cuadro; un acercamiento lo reparte. Se mide contando en cuantos cuadros consecutivos el ancho se
  // movio de verdad alrededor del cambio mas grande.
  let mayor = 0, dondeMayor = 0
  for (let i = 1; i < t.length; i++) {
    const d = Math.abs(t[i].ancho - t[i - 1].ancho)
    if (t[i].tinta > 40 && t[i - 1].tinta > 40 && d > mayor) { mayor = d; dondeMayor = i }
  }
  if (mayor > 8) {
    let rampa = 1
    for (let i = dondeMayor - 1; i > 0 && Math.abs(t[i].ancho - t[i - 1].ancho) > 2; i--) rampa++
    for (let i = dondeMayor + 1; i < t.length && Math.abs(t[i].ancho - t[i - 1].ancho) > 2; i++) rampa++
    console.log(`\n    cambio mas grande: ${mayor} px entre los cuadros ${t[dondeMayor - 1].n} y ${t[dondeMayor].n}`)
    console.log(`    ese cambio se reparte en ${rampa} cuadro(s) consecutivo(s)`)
    console.log(`    -> ${rampa <= 2 ? 'CORTE DURO' : 'ACERCAMIENTO de ' + rampa + ' cuadros (' + (rampa / 30 * 1000).toFixed(0) + ' ms)'}\n`)
  } else {
    console.log(`\n    sin cambios de ancho relevantes en este tramo\n`)
  }
}
