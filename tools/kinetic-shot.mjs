// kinetic-shot.mjs — "ver" un video del motor KINETIC. Como el motor es DETERMINISTA, regenera el video
// exacto de un brief+seed -> contact-sheet (tools/out/kinetic-shot.png) + MP4 opcional (kinetic-shot.mp4).
// Uso:
//   node tools/kinetic-shot.mjs '{"brand":"Acme","rubro":"tech","claim":"...","seed":7}'
//   node tools/kinetic-shot.mjs --url https://sitio.com [seed]   -> FLUJO COMPLETO: captura+percepcion
//       reales (backend/e2e_probe.py) -> brief -> video. El testeo canonico de "grandes avances".
//   ... --mp4        -> ademas exporta el MP4 con ffmpeg
import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas'
import { writeFileSync, mkdirSync, rmSync, readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { makeKinetic, drawKineticFrame, beatAt, setScratchFactory, setImageLoader } from '../src/kinetic/index.js'

const HERE = dirname(fileURLToPath(import.meta.url)), OUT = join(HERE, 'out'); mkdirSync(OUT, { recursive: true })
try { GlobalFonts.loadFontsFromDir(join(HERE, 'fonts')) } catch { /* fuentes del sistema */ }
setScratchFactory((w, h) => createCanvas(w, h))               // OBLIGATORIO: sin esto las transiciones caen a corte seco

let brief
const arg = process.argv[2]
if (arg === '--url' && process.argv[3]) {
  // FLUJO REAL pagina -> brief: corre el probe del backend (captura Playwright + perception Claude) y
  // levanta el JSON que deja en tools/out/e2e_<host>.json (incluye images[] para polaroids/collage).
  const url = process.argv[3]
  const host = new URL(url).hostname.replace('www.', '').split('.')[0]
  console.log('e2e: capturando y analizando', url, '…')
  execFileSync('python', ['e2e_probe.py', url], { cwd: join(HERE, '..', 'backend'), stdio: 'inherit' })
  brief = JSON.parse(readFileSync(join(OUT, `e2e_${host}.json`), 'utf-8'))
  if (brief.content && typeof brief.content === 'object') brief = { ...brief, ...brief.content }   // aplanar
  const s = Number(process.argv[4]); if (Number.isFinite(s) && s > 0) brief.seed = s >>> 0
} else if (arg && arg.trim().startsWith('{')) {
  brief = JSON.parse(arg)
} else {
  console.error('Uso: node tools/kinetic-shot.mjs \'{"brand":...}\'  |  --url https://sitio.com [seed]')
  process.exit(1)
}
const seed = (brief.seed >>> 0) || 0

// pre-cargar imagenes del brief (napi: el motor las recibe YA decodificadas via setImageLoader)
const imgs = new Map()
for (const u of (brief.images || []).slice(0, 8)) {
  try { imgs.set(u, await loadImage(u)); console.log('img ok:', String(u).slice(0, 80)) }
  catch (e) { console.log('img FALLO:', String(u).slice(0, 80), e.message) }
}
if (brief.logo) { try { imgs.set(brief.logo, await loadImage(brief.logo)) } catch { /* sin logo */ } }
setImageLoader(src => imgs.get(src) || null)

const video = makeKinetic(brief, { seed: seed || undefined })
console.log('KINETIC ·', brief.brand, '· seed:', video.seed)
console.log('DNA:', JSON.stringify({ pair: video.dna.pairId, case: video.dna.caseMode, color: video.dna.colorFamily, garnish: video.dna.garnishDialect, tex: video.dna.texture, cta: video.dna.ctaVariant, bpm: +video.dna.bpm.toFixed(1), z: +video.dna.z.toFixed(2), w: +video.dna.w.toFixed(1) }))
console.log('GUION:', video.script.templateId, '·', video.scenes.map(s => `${s.role}:${s.sceneId.replace('kin.scene.', '')}(${s.polarity})`).join(' > '))
console.log('CORTES:', video.cuts.map(c => `${c.at.toFixed(1)}s ${c.id.replace('kin.xf.', '')}`).join(' · '), '· dur:', video.duration.toFixed(1) + 's')

function frame(t, ss = 2) { const cv = createCanvas(video.W * ss, video.H * ss), ctx = cv.getContext('2d'); ctx.setTransform(ss, 0, 0, ss, 0, 0); drawKineticFrame(ctx, t, video); return cv }
const n = 16, cols = 4, tileW = 232, tileH = Math.round(tileW * video.H / video.W), pad = 10, top = 28
const rows = Math.ceil(n / cols), cw = cols * tileW + (cols + 1) * pad, ch = top + rows * (tileH + 18) + (rows + 1) * pad
const sheet = createCanvas(cw, ch), sx = sheet.getContext('2d')
sx.fillStyle = '#0a0a0f'; sx.fillRect(0, 0, cw, ch); sx.fillStyle = '#fff'; sx.font = 'bold 14px sans-serif'
sx.fillText('KINETIC · ' + (brief.brand || '') + ' · ' + video.dna.pairId + '/' + video.dna.colorFamily + '/' + video.script.templateId + ' · seed ' + video.seed, pad, 18)
for (let i = 0; i < n; i++) {
  const t = (i + 0.5) * video.duration / n, r = (i / cols) | 0, c = i % cols
  const x = pad + c * (tileW + pad), y = top + pad + r * (tileH + 18 + pad)
  sx.drawImage(frame(t), x, y, tileW, tileH)
  sx.fillStyle = '#9aa'; sx.font = '11px sans-serif'; sx.fillText(`${t.toFixed(1)}s · ${beatAt(t, video)}`.slice(0, 36), x + 2, y + tileH + 13)
}
writeFileSync(join(OUT, 'kinetic-shot.png'), sheet.toBuffer('image/png')); console.log('wrote tools/out/kinetic-shot.png')

if (process.argv.includes('--mp4')) {
  const fps = 30, MS = 2, total = Math.round(video.duration * fps), tmp = join(OUT, '_kinframes')
  rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true })
  for (let i = 0; i < total; i++) { const cv = frame((i + 0.5) / fps, MS); writeFileSync(join(tmp, `f${String(i).padStart(4, '0')}.png`), cv.toBuffer('image/png')) }
  try {
    execFileSync('ffmpeg', ['-y', '-framerate', String(fps), '-i', join(tmp, 'f%04d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', join(OUT, 'kinetic-shot.mp4')], { stdio: 'ignore' })
    console.log('wrote tools/out/kinetic-shot.mp4', `(${total} frames @ ${fps}fps)`)
  } catch { console.log('(mp4) ffmpeg no disponible') }
  rmSync(tmp, { recursive: true, force: true })
}
console.log('done.')
