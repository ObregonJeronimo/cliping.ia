// Hoja de contacto de los elementos extraidos de una pagina real.
//
// El extractor puede reportar "17/17 capturados" y estar entregando basura: recortes en blanco,
// fondos que se colaron, un logo cortado al medio. La unica forma de saberlo es MIRARLOS. Va sobre
// damero a proposito: el damero se ve donde hay alfa 0, asi que un elemento que deberia estar
// recortado y trae fondo salta a la vista.
//
// Uso:  node tools/elementos-sheet.mjs stripe-com
import { createCanvas, loadImage } from '@napi-rs/canvas'
import fs from 'node:fs'
import path from 'node:path'

const host = process.argv[2] || 'stripe-com'
const dir = path.join('tools', 'out', 'elementos', host)
const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'))

const CEL = 300, PAD = 12, ROT = 30, COLS = Math.min(5, Math.max(1, meta.length))
const filas = Math.ceil(meta.length / COLS)
const W = COLS * CEL, H = filas * (CEL + ROT)
const cv = createCanvas(W, H)
const c = cv.getContext('2d')
c.fillStyle = '#1a1a1e'; c.fillRect(0, 0, W, H)

for (let i = 0; i < meta.length; i++) {
  const cx = (i % COLS) * CEL, cy = Math.floor(i / COLS) * (CEL + ROT)
  // damero: sin esto un PNG con fondo blanco y uno transparente se ven identicos
  for (let y = 0; y < CEL; y += 10) for (let x = 0; x < CEL; x += 10) {
    c.fillStyle = ((x / 10 + y / 10) % 2) ? '#3a3a42' : '#2a2a30'
    c.fillRect(cx + x, cy + ROT + y, 10, 10)
  }
  const m = meta[i]
  try {
    const img = await loadImage(path.join(dir, m.file))
    const k = Math.min((CEL - PAD * 2) / img.width, (CEL - PAD * 2) / img.height)
    const w = img.width * k, h = img.height * k
    c.drawImage(img, cx + (CEL - w) / 2, cy + ROT + (CEL - h) / 2, w, h)
  } catch (e) {
    c.fillStyle = '#f66'; c.font = '13px sans-serif'
    c.fillText('NO CARGA', cx + 16, cy + ROT + CEL / 2)
  }
  c.fillStyle = '#0d0d10'; c.fillRect(cx, cy, CEL, ROT)
  c.fillStyle = '#8ce'; c.font = 'bold 13px sans-serif'
  c.fillText(`${m.rol}`, cx + 8, cy + 20)
  c.fillStyle = '#999'; c.font = '11px sans-serif'
  c.fillText(`${m.w}x${m.h} ${m.kb}kb tinta ${m.tinta} tex ${m.textura}${m.minPx ? ' min ' + m.minPx + 'px' : ''}`, cx + 8 + c.measureText(m.rol).width + 20, cy + 20)
  c.strokeStyle = '#000'; c.strokeRect(cx + 0.5, cy + 0.5, CEL - 1, CEL + ROT - 1)
}
const out = path.join('tools', 'out', `elementos-${host}.png`)
fs.writeFileSync(out, cv.toBuffer('image/png'))
console.log(`${out}  (${meta.length} elementos)`)
