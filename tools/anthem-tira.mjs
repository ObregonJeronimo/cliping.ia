// Arma una tira horizontal con los frames que le pasen. Se mira con Read: es la unica forma de
// juzgar si una escena de motion graphics funciona.
import { createCanvas, loadImage } from '@napi-rs/canvas'
import fs from 'node:fs'
const [salida, ...frames] = process.argv.slice(2)
const CEL = 190, AH = Math.round(CEL * 16 / 9)
const cv = createCanvas(frames.length * CEL, AH + 16)
const c = cv.getContext('2d')
c.fillStyle = '#101014'; c.fillRect(0, 0, cv.width, cv.height)
for (let i = 0; i < frames.length; i++) {
  try {
    const im = await loadImage(frames[i])
    c.drawImage(im, i * CEL, 16, CEL, AH)
  } catch { c.fillStyle = '#f55'; c.fillText('x', i * CEL + 8, 40) }
  c.fillStyle = '#8ce'; c.font = 'bold 10px sans-serif'
  c.fillText(frames[i].split(/[\/]/).pop().replace('.png', ''), i * CEL + 4, 12)
}
fs.writeFileSync(salida, cv.toBuffer('image/png'))
console.log(salida)
