// urvid1-textstill.mjs — DIAGNOSTICO de ESTABILIDAD del texto. Para cada escena, en una ventana YA ASENTADA
// (pasada la entrada), renderiza dos frames CONSECUTIVOS (t y t+1/FPS) y los DIFIERE. Si el texto se re-rasteriza
// cuadro a cuadro (ken-burns / breathe sobre el glifo), los BORDES del texto se ENCIENDEN en el diff y la metrica
// de la "banda central de texto" sube. Texto pixel-estable => banda central oscura (~0). La DECO (barras/sheen/glow)
// y el fondo SI pueden moverse (eso es vida) -> aparecen en el diff pero NO en la banda de texto si el texto esta quieto.
// Uso: node tools/urvid1-textstill.mjs [seed ...]   (default: 7 3 11 19)
import { createCanvas, GlobalFonts, ImageData } from '@napi-rs/canvas'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { makeVideo, drawFrame, FPS } from '../src/urvid/index.js'
import { setScratchFactory } from '../src/urvid/core/render.js'
import { W, H } from '../src/urvid/core/util.js'

const HERE = dirname(fileURLToPath(import.meta.url)), OUT = join(HERE, 'out'); mkdirSync(OUT, { recursive: true })
try { GlobalFonts.loadFontsFromDir(join(HERE, 'fonts')) } catch {}
setScratchFactory((w, h) => createCanvas(w, h))

const SEEDS = (process.argv.slice(2).map(s => Number(s) >>> 0)).filter(n => Number.isFinite(n))
const seeds = SEEDS.length ? SEEDS : [7, 3, 11, 19]
const FOCUS = process.env.FOCUS || ''   // si se setea, filtra escenas cuyo id incluya FOCUS y agranda los tiles (ver text edges)
const STRIP = process.env.STRIP === '1' // anula fondo/sub/atm/mark/post -> diff = SOLO contenido (texto + su deco). Aisla el glifo del ruido del fondo.
const SS = 2                          // supersample: revela shimmer sub-pixel
const dt = 1 / FPS                    // un cuadro
const TEXT_BAND = { x0: 0.10, x1: 0.90, y0: 0.24, y1: 0.78 }   // donde vive el texto focal (proxy)

const brief = seed => ({
  brand: 'Nodo', rubro: 'tech', tone: 'dark', brandColor: '#22e06a', seed,
  content: { tagline: 'Automatiza lo aburrido y enfocate en lo que importa', claim: 'Menos tareas repetitivas, mas resultados reales', cta: 'Probalo gratis', stats: [{ value: '600', label: 'horas ahorradas por ano' }, { value: '3x', label: 'mas rapido que antes' }] },
})

function renderAt(video, t) {
  const cv = createCanvas(W * SS, H * SS), c = cv.getContext('2d'); c.setTransform(SS, 0, 0, SS, 0, 0)
  drawFrame(c, t, video)
  return cv.getContext('2d').getImageData(0, 0, W * SS, H * SS).data
}

// diff: max abs por canal. Devuelve {buf(Uint8 amplificado), meanAll, meanBand}
function diff(a, b) {
  const w = W * SS, h = H * SS, out = new Uint8ClampedArray(w * h * 4)
  const bx0 = (TEXT_BAND.x0 * w) | 0, bx1 = (TEXT_BAND.x1 * w) | 0, by0 = (TEXT_BAND.y0 * h) | 0, by1 = (TEXT_BAND.y1 * h) | 0
  let sumAll = 0, sumBand = 0, nBand = 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]))
      const amp = Math.min(255, d * 8)
      out[i] = amp; out[i + 1] = amp; out[i + 2] = amp; out[i + 3] = 255
      sumAll += d
      if (x >= bx0 && x < bx1 && y >= by0 && y < by1) { sumBand += d; nBand++ }
    }
  }
  return { out, w, h, meanAll: sumAll / (w * h), meanBand: sumBand / Math.max(1, nBand) }
}

const rows = []   // {seed, scene, t, meanAll, meanBand, frameCv, diffCv}
for (const seed of seeds) {
  let video = makeVideo(brief(seed))
  if (STRIP) video = { ...video, bgId: null, subId: null, atmId: null, markId: null, postId: null }
  for (const sc of video.scenes) {
    if (FOCUS && !sc.sceneId.includes(FOCUS)) continue
    // ventana asentada: pasada la entrada (~0.85s) y antes del final / de la transicion
    const settled = Math.min(sc.start + Math.max(0.95, sc.dur * 0.55), sc.start + sc.dur - 0.25)
    const a = renderAt(video, settled), b = renderAt(video, settled + dt)
    const d = diff(a, b)
    // miniaturas
    const frameCv = createCanvas(W * SS, H * SS); frameCv.getContext('2d').putImageData(new ImageData(a, W * SS, H * SS), 0, 0)
    const diffCv = createCanvas(d.w, d.h); diffCv.getContext('2d').putImageData(new ImageData(d.out, d.w, d.h), 0, 0)
    rows.push({ seed, scene: sc.sceneId, t: settled, meanAll: d.meanAll, meanBand: d.meanBand, frameCv, diffCv })
  }
}

// contact-sheet: una fila por escena -> [frame] [diff x8] + labels
const tileW = FOCUS ? 360 : 150, tileH = Math.round(tileW * H / W), pad = 8, labH = 26, rowH = tileH + labH
const cols = 2, cw = cols * tileW + (cols + 1) * pad + 220, ch = rows.length * (rowH + pad) + pad
const sheet = createCanvas(cw, ch), s = sheet.getContext('2d')
s.fillStyle = '#0a0a0f'; s.fillRect(0, 0, cw, ch)
rows.forEach((r, i) => {
  const y = pad + i * (rowH + pad)
  s.drawImage(r.frameCv, pad, y, tileW, tileH)
  s.drawImage(r.diffCv, pad * 2 + tileW, y, tileW, tileH)
  s.fillStyle = '#fff'; s.font = 'bold 11px sans-serif'
  s.fillText(`${r.scene}`, pad, y + tileH + 12)
  s.fillStyle = r.meanBand > 0.6 ? '#ff5a7a' : (r.meanBand > 0.25 ? '#ffd23f' : '#7CFF9B')
  s.font = '10px sans-serif'
  s.fillText(`seed ${r.seed}  band=${r.meanBand.toFixed(3)}  all=${r.meanAll.toFixed(3)}`, pad, y + tileH + 24)
})
writeFileSync(join(OUT, 'textstill.png'), sheet.toBuffer('image/png'))

// resumen consola
const band = rows.map(r => r.meanBand)
const avgBand = band.reduce((a, b) => a + b, 0) / band.length
const worst = [...rows].sort((a, b) => b.meanBand - a.meanBand).slice(0, 6)
console.log(`escenas=${rows.length}  AVG band(text)=${avgBand.toFixed(3)}  AVG all=${(rows.reduce((a, r) => a + r.meanAll, 0) / rows.length).toFixed(3)}`)
console.log('PEORES (band = movimiento residual del texto, mas alto = mas tosco):')
for (const r of worst) console.log(`  ${r.scene.padEnd(28)} seed ${r.seed}  band=${r.meanBand.toFixed(3)}  all=${r.meanAll.toFixed(3)}`)
console.log('wrote tools/out/textstill.png')
