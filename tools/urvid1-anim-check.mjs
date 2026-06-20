// urvid1-anim-check.mjs — GATE de la lib ANIM. Por cada animacion: la renderiza en dark+light a varios `t`, chequea
// DETERMINISMO (mismo frame 2 veces = identico), que NO este en blanco y que no tire error. Arma un contact-sheet
// (cada anim x 3 frames) para ojear el movimiento. Uso: node tools/urvid1-anim-check.mjs
import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { query, get, derivePalette } from '../src/urvid/index.js'
import { W, H, setFormat } from '../src/urvid/core/util.js'

const HERE = dirname(fileURLToPath(import.meta.url)), OUT = join(HERE, 'out'); mkdirSync(OUT, { recursive: true })
try { GlobalFonts.loadFontsFromDir(join(HERE, 'fonts')) } catch {}
setFormat('9:16')

const TS = [0.35, 1.1, 1.9]
const content = { brand: 'Marca', tagline: 'Mensaje', claim: 'Mensaje claro', cta: 'Probalo' }

function renderTile(mod, t, tone, ss = 1) {
  const pal = derivePalette('#4285F4', { tone, rubro: 'tech', seed: 7 })
  const cv = createCanvas(W * ss, H * ss), c = cv.getContext('2d'); c.setTransform(ss, 0, 0, ss, 0, 0)
  c.fillStyle = pal.bg0; c.fillRect(0, 0, W, H)
  mod.render(c, t, { pal, content, energy: 1, seed: 7 })
  return cv
}
function nonBlank(cv) {
  const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data
  const set = new Set(); for (let i = 0; i < d.length; i += 4 * 113) set.add((d[i] >> 4) + '-' + (d[i + 1] >> 4) + '-' + (d[i + 2] >> 4))
  return set.size > 2   // mas de un par de colores = dibujo algo encima del fondo
}

const anims = query('anim', { tone: 'dark' }).map(m => m.id)
// asegura ambos tonos (algun anim podria declarar solo uno)
const allIds = Array.from(new Set([...query('anim', { tone: 'dark' }), ...query('anim', { tone: 'light' })].map(m => m.id)))

const fails = []
let checked = 0
for (const id of allIds) {
  const mod = get(id)
  for (const tone of ['dark', 'light']) {
    if (mod.tones.indexOf(tone) < 0) continue
    for (const t of TS) {
      try {
        const a = renderTile(mod, t, tone), b = renderTile(mod, t, tone)
        checked++
        // determinismo
        if (Buffer.compare(a.toBuffer('image/png'), b.toBuffer('image/png')) !== 0) fails.push(`${id} [${tone}] t=${t}: NO determinista`)
        if (!nonBlank(a)) fails.push(`${id} [${tone}] t=${t}: en BLANCO`)
      } catch (e) { fails.push(`${id} [${tone}] t=${t}: ERROR ${e.message}`) }
    }
  }
}

// contact-sheet (dark): cada anim una fila de 3 frames
const tileW = 120, tileH = Math.round(tileW * H / W), pad = 6, labW = 150
const cols = TS.length, cw = labW + cols * tileW + (cols + 1) * pad, ch = allIds.length * (tileH + pad) + pad
const sheet = createCanvas(cw, ch), s = sheet.getContext('2d')
s.fillStyle = '#0a0a0f'; s.fillRect(0, 0, cw, ch)
allIds.forEach((id, r) => {
  const y = pad + r * (tileH + pad)
  s.fillStyle = '#cfe'; s.font = '10px sans-serif'; s.fillText(id.replace(/^anim\./, ''), 4, y + 14)
  const mod = get(id), tone = mod.tones.indexOf('dark') >= 0 ? 'dark' : 'light'
  TS.forEach((t, i) => { const cv = renderTile(mod, t, tone, 1.2); s.drawImage(cv, labW + pad + i * (tileW + pad), y, tileW, tileH) })
})
writeFileSync(join(OUT, 'anim-check.png'), sheet.toBuffer('image/png'))

console.log(`ANIM: ${allIds.length} animaciones · ${checked} renders chequeados`)
console.log(`${fails.length === 0 ? 'OK ' : 'XX '} fallos: ${fails.length}`)
for (const f of fails.slice(0, 20)) console.log('   - ' + f)
console.log('wrote tools/out/anim-check.png')
process.exit(fails.length === 0 ? 0 : 1)
