// Hoja de contacto de un VIDEO compuesto con los elementos reales de la pagina. Una fila por seed,
// N frames repartidos a lo largo del video.
//
// Es la herramienta que decide si esto funciona. Los gates prueban que el objeto no se deforma, que
// entra en su caja y que contrasta contra el fondo — ninguna de las tres cosas dice si el video se ve
// como la marca, que es el unico motivo por el que existe el extractor.
//
// Uso:  node tools/director-elementos-shot.mjs [fixture] [seeds] [frames]
import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas'
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { normalizePageModel, CANVAS } from '../src/director/core/schema.js'
import { buildGuion } from '../src/director/core/scriptwriter.js'
import { composeStoryboard } from '../src/director/core/composer.js'
import { deriveLook } from '../src/director/kit/look.js'
import { compile } from '../src/director/core/timeline.js'
import { drawFrame } from '../src/director/render/video.js'
import { corpusHero } from '../src/director/render/draw.js'

const HERE = dirname(fileURLToPath(import.meta.url))
try { GlobalFonts.loadFontsFromDir(join(HERE, 'fonts')) } catch {}
const DIR = join(HERE, 'fixtures', 'director', 'elementos')
const OUT = join(HERE, 'out')
mkdirSync(OUT, { recursive: true })

const soloUno = process.argv[2]
const SEEDS = Number(process.argv[3]) || 2
const COLS = Number(process.argv[4]) || 6
const casos = readdirSync(DIR).filter(f => f.endsWith('.json') && (!soloUno || f.startsWith(soloUno)))

const ESC = 0.26
const W = Math.round(CANVAS.W * ESC), H = Math.round(CANVAS.H * ESC)
const makeCanvas = (w, h) => createCanvas(w, h)

for (const f of casos) {
  const raw = JSON.parse(readFileSync(join(DIR, f), 'utf-8'))
  const nombre = f.replace('.json', '')
  const imgs = new Map()
  for (const el of raw.assets.elementos) {
    try { imgs.set(el.url, await loadImage(join(DIR, el.url))) } catch {}
  }
  const pm = normalizePageModel(raw)
  const corpus = corpusHero(pm)

  const ROT = 22
  const hoja = createCanvas(COLS * (W + 6) + 6, SEEDS * (H + ROT + 6) + 6)
  const hc = hoja.getContext('2d')
  hc.fillStyle = '#0d0d10'; hc.fillRect(0, 0, hoja.width, hoja.height)

  const cv = createCanvas(W, H), ctx = cv.getContext('2d')
  for (let s = 1; s <= SEEDS; s++) {
    const seed = (s * 3266489917) >>> 0
    const look = deriveLook(pm, seed)
    const tl = compile(composeStoryboard(pm, buildGuion(pm, seed), look, seed), seed)
    for (let i = 0; i < COLS; i++) {
      // se saltea el primer y el ultimo 4% del video: el arranque y el cierre son fundidos, y una
      // hoja llena de cuadros a medio aparecer no deja juzgar la composicion
      const t = tl.dur * (0.04 + (i / (COLS - 1)) * 0.92)
      const rep = drawFrame(ctx, tl, t, { W, H, makeCanvas, brand: pm.brand, corpus, images: imgs })
      const x = 6 + i * (W + 6), y = 6 + (s - 1) * (H + ROT + 6)
      hc.drawImage(cv, x, y + ROT)
      hc.fillStyle = '#8ce'; hc.font = 'bold 11px sans-serif'
      const nEl = (rep.elementos || []).length
      hc.fillText(`#${s} ${t.toFixed(1)}s`, x + 4, y + 14)
      if (nEl) { hc.fillStyle = '#7d7'; hc.fillText(`· ${nEl} real${nEl > 1 ? 'es' : ''}`, x + 62, y + 14) }
      if ((rep.faltantes || []).length) { hc.fillStyle = '#f77'; hc.fillText('· FALTA', x + 120, y + 14) }
    }
  }
  const out = join(OUT, `elvideo-${nombre}.png`)
  writeFileSync(out, hoja.toBuffer('image/png'))
  console.log(`${out}`)
}
