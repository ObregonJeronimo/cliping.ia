// urvid1-cuts.mjs — QA DE MOVIMIENTO: los contact-sheets estaticos NO muestran cortes/transiciones/
// reveals. Esta herramienta renderiza GRILLAS DE 12 FRAMES (4x3, regla de Jero: mas de 12 no se ven)
// centradas en cada VENTANA DE TRANSICION (t = B.start-0.35s .. +0.45s) + una grilla del FIN de cada
// escena (para cazar textos a medio revelar tipo "Ejemplo Palabr"). Un Read por grilla = ver el corte.
// Uso:
//   node tools/urvid1-cuts.mjs '{"brand":"X","rubro":"tech",...,"seed":11}'
//   -> tools/out/cuts/cut_01.png, cut_02.png... + end_01.png (fines de escena, 12 escenas max)
import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { makeVideo, drawFrame } from '../src/urvid/index.js'
import { setScratchFactory } from '../src/urvid/core/render.js'

const HERE = dirname(fileURLToPath(import.meta.url)), OUT = join(HERE, 'out', 'cuts')
rmSync(OUT, { recursive: true, force: true }); mkdirSync(OUT, { recursive: true })
try { GlobalFonts.loadFontsFromDir(join(HERE, 'fonts')) } catch { /* fuentes del sistema */ }
setScratchFactory((w, h) => createCanvas(w, h))   // sin esto las transiciones caen a corte seco

const arg = process.argv[2]
if (!arg || !arg.trim().startsWith('{')) { console.error('Uso: node tools/urvid1-cuts.mjs \'{"brand":...}\''); process.exit(1) }
const brief = JSON.parse(arg)
const video = makeVideo({ ...brief, seed: (brief.seed >>> 0) || undefined })
console.log('CUTS ·', brief.brand, '· seed', brief.seed, '· xf', video.xf, '· escenas:', video.scenes.map(s => s.sceneId.replace('scene.', '')).join(' > '))

const SS = 1.6
function frame(t) {
  const cv = createCanvas(Math.round(video.W * SS), Math.round(video.H * SS))
  const ctx = cv.getContext('2d'); ctx.setTransform(SS, 0, 0, SS, 0, 0)
  drawFrame(ctx, Math.max(0, Math.min(t, video.duration - 0.001)), video)
  return cv
}
// grilla 4x3 de 12 frames en [t0..t1] con labels de tiempo
function grid(name, t0, t1, title) {
  const n = 12, cols = 4, tw = 210, th = Math.round(tw * video.H / video.W), pad = 6, top = 24
  const rows = 3, cw = cols * tw + (cols + 1) * pad, ch = top + rows * (th + 14) + (rows + 1) * pad
  const sheet = createCanvas(cw, ch), sx = sheet.getContext('2d')
  sx.fillStyle = '#0a0a0f'; sx.fillRect(0, 0, cw, ch)
  sx.fillStyle = '#fff'; sx.font = 'bold 12px sans-serif'; sx.fillText(title, pad, 16)
  for (let i = 0; i < n; i++) {
    const t = t0 + (t1 - t0) * i / (n - 1)
    const r = (i / cols) | 0, c = i % cols
    const x = pad + c * (tw + pad), y = top + pad + r * (th + 14 + pad)
    sx.drawImage(frame(t), x, y, tw, th)
    sx.fillStyle = '#9aa'; sx.font = '10px sans-serif'; sx.fillText(t.toFixed(2) + 's', x + 2, y + th + 11)
  }
  writeFileSync(join(OUT, name + '.png'), sheet.toBuffer('image/png'))
  console.log('wrote cuts/' + name + '.png  ' + title)
}

// una grilla por TRANSICION (ventana real de xf, con aire antes/despues)
const xf = video.xf || 0.5
video.scenes.slice(1).forEach((sc, i) => {
  const b = sc.start
  grid(`cut_${String(i + 1).padStart(2, '0')}`, b - 0.35, b + xf + 0.25,
    `CORTE ${i + 1}: ${video.scenes[i].sceneId.replace('scene.', '')} -> ${sc.sceneId.replace('scene.', '')}  (B.start=${b.toFixed(2)}s, xf=${xf})`)
})
// una grilla del FIN de cada escena (ultimo 1.1s): caza reveals incompletos y holds muertos
video.scenes.forEach((sc, i) => {
  const e = sc.start + sc.dur
  grid(`end_${String(i + 1).padStart(2, '0')}`, Math.max(sc.start, e - 1.1), e - 0.03,
    `FIN ${i + 1}: ${sc.sceneId.replace('scene.', '')}  (dur=${sc.dur.toFixed(1)}s)`)
})
console.log('done.')
