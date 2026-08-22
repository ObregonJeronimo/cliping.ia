import { readdirSync, writeFileSync } from 'node:fs'
const { createCanvas, loadImage } = await import('@napi-rs/canvas')
const D = process.argv[2] || 'C:/ae-probe/recursos-h'
const f = readdirSync(D).filter(n => n.endsWith('.png')).sort()
const COL = 6, CEL = 440, FIL = Math.ceil(f.length / COL)
const cv = createCanvas(COL * CEL, FIL * (CEL + 34)); const g = cv.getContext('2d')
g.fillStyle = '#101216'; g.fillRect(0, 0, cv.width, cv.height)
for (let i = 0; i < f.length; i++) {
  const im = await loadImage(`${D}/${f[i]}`)
  const x = (i % COL) * CEL, y = Math.floor(i / COL) * (CEL + 34)
  const s = Math.min((CEL - 24) / im.width, (CEL - 24) / im.height)
  g.drawImage(im, x + (CEL - im.width * s) / 2, y + (CEL - im.height * s) / 2, im.width * s, im.height * s)
  g.fillStyle = '#7d879b'; g.font = '19px "Segoe UI"'; g.fillText(f[i].replace('.png', ''), x + 10, y + CEL + 22)
}
writeFileSync(`${D}/_hoja.jpg`, cv.toBuffer('image/jpeg', { quality: 88 }))
console.log(cv.width + 'x' + cv.height, f.length)
