// aemotion-shot.mjs — "ver" el motor aemotion. Modos:
//   node tools/aemotion-shot.mjs '{"brand":"Acme","rubro":"tech","claim":"...","seed":7}'   -> VIDEO real
//   node tools/aemotion-shot.mjs '{...}' --strip 0        -> 12 frames DENSOS de la escena 0 (coreografia)
//   node tools/aemotion-shot.mjs --demo [seed]            -> testbed F1/F2
// Determinista: contact-sheet (tools/out/aemotion-shot.png) + MP4 opcional (--mp4, ffmpeg).
import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas'
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { makeMotionVideo, drawMotionFrame, beatAt, drawDemoFrame, DEMO_DUR, W as DW, H as DH, setScratchFactory, setImageLoader } from '../src/aemotion/index.js'

const HERE = dirname(fileURLToPath(import.meta.url)), OUT = join(HERE, 'out'); mkdirSync(OUT, { recursive: true })
try { GlobalFonts.loadFontsFromDir(join(HERE, 'fonts')) } catch { /* fuentes del sistema */ }
setScratchFactory((w, h) => createCanvas(w, h))   // OBLIGATORIO: sin esto blur degrada y transiciones caen a corte seco

const arg = process.argv[2]
const demoMode = !arg || arg === '--demo'

let video = null, W, H, DUR, title, drawFn
if (demoMode) {
  const seed = Number(process.argv[3]) || 7
  W = DW; H = DH; DUR = DEMO_DUR; title = 'AEMOTION testbed · seed ' + seed
  drawFn = (ctx, t) => drawDemoFrame(ctx, t, seed)
} else {
  const brief = JSON.parse(arg)
  const seed = (brief.seed >>> 0) || undefined
  // pre-cargar imagenes del brief (napi: el motor las recibe YA decodificadas via setImageLoader)
  const imgs = new Map()
  for (const u of (brief.images || []).slice(0, 8)) {
    try { imgs.set(u, await loadImage(u)); console.log('img ok:', String(u).slice(0, 80)) }
    catch (e) { console.log('img FALLO:', String(u).slice(0, 80), e.message) }
  }
  setImageLoader(src => imgs.get(src) || null)
  video = makeMotionVideo(brief, { seed })
  W = video.W; H = video.H; DUR = video.duration
  const d = video.dna
  console.log('AEMOTION ·', brief.brand, '· seed:', video.seed)
  console.log('DNA:', JSON.stringify({ familia: d.familia, pair: d.pairId, dialecto: d.shapeDialect, cta: d.ctaKind, case: d.caseMode, bpm: +d.bpm.toFixed(1), accent: d.accent }))
  console.log('GUION:', video.script.templateId, '·', video.scenes.map(s => `${s.role}:${s.sceneId.replace('am.scene.', '')}(${s.polarity})`).join(' > '))
  console.log('CORTES:', video.cuts.map(c => `${c.at.toFixed(1)}s ${c.id.replace('am.xf.', '')}`).join(' · '), '· dur:', DUR.toFixed(1) + 's')
  title = 'AEMOTION · ' + (brief.brand || '') + ' · ' + d.familia + '/' + d.pairId + '/' + video.script.templateId + ' · seed ' + video.seed
  drawFn = (ctx, t) => drawMotionFrame(ctx, t, video)
}

function frame(t, ss = 2) {
  const cv = createCanvas(W * ss, H * ss), ctx = cv.getContext('2d')
  ctx.setTransform(ss, 0, 0, ss, 0, 0)
  drawFn(ctx, t)
  return cv
}

// --strip <i>: 12 frames densos dentro de la ventana de la escena i (para juzgar la coreografia)
let stripWin = null
const stripIx = process.argv.indexOf('--strip')
if (stripIx > 0 && video) {
  const si = Number(process.argv[stripIx + 1]) || 0
  const sc = video.scenes[Math.min(si, video.scenes.length - 1)]
  stripWin = [sc.t0, sc.t0 + sc.dur]
  console.log('STRIP escena', si, sc.sceneId, sc.polarity, '·', stripWin[0].toFixed(2) + 's ->', stripWin[1].toFixed(2) + 's')
}

const n = 16, cols = 4, tileW = 232, tileH = Math.round(tileW * H / W), pad = 10, top = 28
const rows = Math.ceil(n / cols), cw = cols * tileW + (cols + 1) * pad, ch = top + rows * (tileH + 18) + (rows + 1) * pad
const sheet = createCanvas(cw, ch), sx = sheet.getContext('2d')
sx.fillStyle = '#0a0a0f'; sx.fillRect(0, 0, cw, ch); sx.fillStyle = '#fff'; sx.font = 'bold 14px sans-serif'
sx.fillText(title + ' · ' + DUR.toFixed(1) + 's', pad, 18)
for (let i = 0; i < n; i++) {
  const t = stripWin ? stripWin[0] + (i + 0.5) * (stripWin[1] - stripWin[0]) / n : (i + 0.5) * DUR / n
  const r = (i / cols) | 0, c = i % cols
  const x = pad + c * (tileW + pad), y = top + pad + r * (tileH + 18 + pad)
  sx.drawImage(frame(t), x, y, tileW, tileH)
  sx.fillStyle = '#9aa'; sx.font = '11px sans-serif'
  sx.fillText((t.toFixed(2) + 's ' + (video ? beatAt(t, video).replace('am.scene.', '') : '')).slice(0, 38), x + 2, y + tileH + 13)
}
writeFileSync(join(OUT, 'aemotion-shot.png'), sheet.toBuffer('image/png')); console.log('wrote tools/out/aemotion-shot.png')

if (process.argv.includes('--mp4')) {
  const fps = 30, MS = 2, total = Math.round(DUR * fps), tmp = join(OUT, '_aeframes')
  rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true })
  for (let i = 0; i < total; i++) { const cv = frame((i + 0.5) / fps, MS); writeFileSync(join(tmp, `f${String(i).padStart(4, '0')}.png`), cv.toBuffer('image/png')) }
  try {
    execFileSync('ffmpeg', ['-y', '-framerate', String(fps), '-i', join(tmp, 'f%04d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', join(OUT, 'aemotion-shot.mp4')], { stdio: 'ignore' })
    console.log('wrote tools/out/aemotion-shot.mp4', `(${total} frames @ ${fps}fps)`)
  } catch { console.log('(mp4) ffmpeg no disponible') }
  rmSync(tmp, { recursive: true, force: true })
}
console.log('done.')
