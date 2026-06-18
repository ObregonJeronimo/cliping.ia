// urvid1-variety.mjs — prueba la UNICIDAD: mismo brief, 9 semillas -> 9 videos distintos (bg/sub/atm/escenas).
import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'; import { dirname, join } from 'node:path'
import { makeVideo, drawFrame } from '../src/urvid/index.js'
import { W, H } from '../src/urvid/core/util.js'
const HERE = dirname(fileURLToPath(import.meta.url)), OUT = join(HERE, 'out'); mkdirSync(OUT, { recursive: true })
try { GlobalFonts.loadFontsFromDir(join(HERE, 'fonts')) } catch {}

const brief = { brand: 'Nodo', rubro: 'tech', tone: 'dark', brandColor: '#22e06a', content: { tagline: 'Automatiza lo aburrido', claim: 'Menos tareas repetitivas, mas resultados', cta: 'Probalo gratis' } }
const tileW = 232, tileH = Math.round(tileW * H / W), cols = 3, rows = 3, pad = 10, top = 24
const cw = cols * tileW + (cols + 1) * pad, ch = top + rows * (tileH + 16) + (rows + 1) * pad
const cv = createCanvas(cw, ch), sx = cv.getContext('2d')
sx.fillStyle = '#0a0a0f'; sx.fillRect(0, 0, cw, ch); sx.fillStyle = '#fff'; sx.font = 'bold 14px sans-serif'; sx.fillText('urvid 1.0 · UNICIDAD · mismo brief, 9 semillas', pad, 17)
for (let i = 0; i < 9; i++) {
  const seed = (i + 1) * 0x9e3779b1 >>> 0
  const v = makeVideo({ ...brief, seed })
  const f = createCanvas(W * 2, H * 2), fc = f.getContext('2d'); fc.setTransform(2, 0, 0, 2, 0, 0); drawFrame(fc, 1.6, v)
  const r = (i / cols) | 0, c = i % cols, x = pad + c * (tileW + pad), y = top + pad + r * (tileH + 16 + pad)
  sx.drawImage(f, x, y, tileW, tileH)
  sx.fillStyle = '#9aa'; sx.font = '10px sans-serif'; sx.fillText((v.recipe.bg || '').replace('bg.', '') + ' / ' + (v.recipe.sub || '-').replace('sub.', ''), x + 2, y + tileH + 12)
  console.log(`seed ${i + 1}:`, v.recipe.bg, '+', v.recipe.sub || '-', '+', v.recipe.atm || '-', '·', v.recipe.scenes.map(s => s.replace('scene.', '')).join(','))
}
writeFileSync(join(OUT, 'urvid1-variety.png'), cv.toBuffer('image/png')); console.log('wrote tools/out/urvid1-variety.png')
