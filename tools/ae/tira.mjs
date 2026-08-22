// UNA TIRA DE CUADROS PARA MIRAR LA PIEZA, a un tamaño en el que se pueda juzgar.
//
// POR QUE EXISTE. Iterar diseño exige VER, y yo no puedo ver un video: puedo abrir imagenes. Hasta
// ahora miraba la hoja de comparacion contra After Effects, que esta hecha para otra cosa — sus celdas
// miden 480 px de ancho sobre un cuadro de 1920, o sea 1:4, y a esa escala un texto de 44 px se vuelve
// ilegible y una regla de 6 px desaparece. Juzgar composicion con eso es exactamente el error que
// CLAUDE.md prohibe: mirar un recorte reescalado y opinar sobre el original.
//
// Esta tira reparte los cuadros sobre TODA la pieza —no sobre los primeros segundos— y deja elegir la
// escala. Con 3 columnas a 640 px cada una, la relacion es 1:3 y un texto chico todavia se lee.
//
// Y SIGUE SIN SER VER MOVIMIENTO, que hay que decirlo cada vez: una tira muestra la FORMA de un gesto,
// no su tacto. El tacto lo dan las mediciones (ritmo de corte y curva de movimiento, tools/mirar-video.py).
// La tira sirve para composicion: masa, jerarquia, que hay en el cuadro y que falta.
//
// USO
//   node tools/ae/tira.mjs                          9 cuadros de C:/ae-probe/render/MOTOR
//   node tools/ae/tira.mjs --de C:/ae-probe/render/PIEZA-A --cuadros 12 --cols 3 --ancho 640

import { existsSync, mkdirSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const arg = (n, x) => {
  const i = process.argv.indexOf('--' + n)
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : x
}

const DE = arg('de', 'C:/ae-probe/render/MOTOR')
const CUANTOS = +arg('cuadros', 9)
const COLS = +arg('cols', 3)
const CW = +arg('ancho', 640)
const DESTINO = arg('a', 'C:/ae-probe/render/salida/tira.png')

if (!existsSync(DE)) { console.error(`falta ${DE}`); process.exit(2) }
const pngs = readdirSync(DE).filter(f => /^f\d+\.png$/.test(f)).sort()
if (!pngs.length) { console.error(`no hay cuadros en ${DE}`); process.exit(2) }

const { createCanvas, loadImage } = await import('@napi-rs/canvas')
const primera = await loadImage(join(DE, pngs[0]))
const CH = Math.round(CW * primera.height / primera.width)
const FILAS = Math.ceil(CUANTOS / COLS)
const ETQ = 22

const cv = createCanvas(COLS * CW, FILAS * (CH + ETQ))
const g = cv.getContext('2d')
// el fondo de la tira es el de la pieza, no gris: sobre gris, un negro profundo se lee como "vacio"
// y sobre negro se lee como "espacio". Juzgar masa sobre el fondo equivocado da la conclusion opuesta.
g.fillStyle = '#0e0e12'
g.fillRect(0, 0, cv.width, cv.height)

for (let i = 0; i < CUANTOS; i++) {
  const idx = Math.round(i * (pngs.length - 1) / Math.max(CUANTOS - 1, 1))
  const x = (i % COLS) * CW
  const y = Math.floor(i / COLS) * (CH + ETQ)
  g.drawImage(await loadImage(join(DE, pngs[idx])), x, y, CW, CH)
  g.strokeStyle = 'rgba(255,255,255,.10)'
  g.strokeRect(x + .5, y + .5, CW - 1, CH - 1)
  g.fillStyle = '#8b90a0'
  g.font = '12px monospace'
  g.fillText(`${pngs[idx].replace(/\.png$/, '')}  ·  ${(idx / 30).toFixed(2)}s`, x + 6, y + CH + 15)
}

const dir = DESTINO.replace(/[\\/][^\\/]+$/, '')
if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
writeFileSync(DESTINO, cv.toBuffer('image/png'))
console.log(`${CUANTOS} de ${pngs.length} cuadros · escala 1:${(primera.width / CW).toFixed(1)} · ${DESTINO}`)
