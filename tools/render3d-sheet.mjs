// Hoja de contacto de los frames que dejo render3d. Es la unica forma de juzgar si el render WebGL
// mejora al de canvas 2D o solo lo complica: los numeros de la consola no dicen nada de eso.
import { createCanvas, loadImage } from '@napi-rs/canvas'
import fs from 'node:fs'
import path from 'node:path'
const dir = process.argv[2] || path.join('tools', 'out', 'render3d', 'frames')
const files = fs.readdirSync(dir).filter(f => f.endsWith('.png')).sort()
const COLS = Math.min(6, files.length), CEL = 240, ROT = 18
const filas = Math.ceil(files.length / COLS)
const cv = createCanvas(COLS * CEL, filas * (CEL * 16 / 9 + ROT))
const c = cv.getContext('2d')
c.fillStyle = '#0d0d10'; c.fillRect(0, 0, cv.width, cv.height)
const AH = CEL * 16 / 9
for (let i = 0; i < files.length; i++) {
  const img = await loadImage(path.join(dir, files[i]))
  const x = (i % COLS) * CEL, y = Math.floor(i / COLS) * (AH + ROT)
  c.drawImage(img, x, y + ROT, CEL, AH)
  c.fillStyle = '#8ce'; c.font = 'bold 11px sans-serif'
  c.fillText(files[i].replace('.png', ''), x + 4, y + 13)
}
const out = path.join('tools', 'out', `render3d-sheet.png`)
fs.writeFileSync(out, cv.toBuffer('image/png'))
console.log(`${out}  (${files.length} frames)`)
