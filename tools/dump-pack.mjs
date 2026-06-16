// dump-pack.mjs — renderiza un PACK de frames full-res (1080x1920) por ESCENA, en el hold, para varias marcas.
// Es el material que miran los agentes de QA/anti-sameness (sin API). Uso: node tools/dump-pack.mjs [marca1 marca2 ...]
// Default: 6 marcas diversas de tools/brands. Salida: tools/_pack/<archivo>_<i>_<tipo>.png
import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas'
import { readFileSync, mkdirSync, rmSync, readdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { drawFrame, setLogo, setPhotos } from '../src/pages/Animaciones/engineCore.js'

const HERE = dirname(fileURLToPath(import.meta.url))
try { GlobalFonts.loadFontsFromDir(join(HERE, 'fonts')) } catch { }
const BR = join(HERE, 'brands'), OUT = join(HERE, '_pack'), DSF = 1080 / 405
rmSync(OUT, { recursive: true, force: true }); mkdirSync(OUT, { recursive: true })

let names = process.argv.slice(2)
if (!names.length) {
  const all = readdirSync(BR).filter(f => f.endsWith('.json')).sort()
  const step = Math.max(1, Math.floor(all.length / 6))
  names = all.filter((_, i) => i % step === 0).slice(0, 6).map(f => f.replace('.json', ''))
}
let total = 0
for (const n of names) {
  let tl; try { tl = JSON.parse(readFileSync(join(BR, n + '.json'), 'utf8')) } catch { continue }
  try { if (tl.logo) setLogo(await loadImage(tl.logo)) } catch { }
  try { if (Array.isArray(tl.images) && tl.images.length) setPhotos(await Promise.all(tl.images.map(u => loadImage(u).catch(() => null)))) } catch { }
  let cur = 0
  ;(tl.scenes || []).forEach((sc, i) => {
    const d = Math.max(30, sc.durationInFrames || 120) / 30, t = cur + d * 0.72; cur += d
    const cv = createCanvas(405 * DSF, 720 * DSF); const ctx = cv.getContext('2d'); ctx.setTransform(DSF, 0, 0, DSF, 0, 0)
    drawFrame(ctx, t, tl)
    import('node:fs').then(fs => fs.writeFileSync(join(OUT, `${n}_${i}_${sc.type}.png`), cv.toBuffer('image/png')))
    total++
  })
  setLogo(null); setPhotos([])
}
console.log(`pack: ${total} frames de ${names.length} marcas en ${OUT}`)
