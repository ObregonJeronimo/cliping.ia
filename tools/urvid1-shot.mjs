// urvid1-shot.mjs — "ver" un video que el usuario genero en urvid 1.0. Lee tools/urvid-shared.json (lo escribe el
// boton "Compartir con Claude" del estudio via /api/urvid/share) y, como el motor es DETERMINISTA, REGENERA el video
// EXACTO -> contact-sheet (tools/out/urvid1-shared.png) + MP4 (urvid1-shared.mp4). Asi Claude lo abre y lo ve.
// Uso:
//   node tools/urvid1-shot.mjs           -> el ultimo compartido (entrada 0)
//   node tools/urvid1-shot.mjs 2         -> la entrada #2 de la lista
//   node tools/urvid1-shot.mjs '{"brand":"X","rubro":"tech",...}'  -> un brief pegado a mano (sin el archivo)
import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
import { writeFileSync, mkdirSync, readFileSync, rmSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { makeVideo, drawFrame, beatAt } from '../src/urvid/index.js'
import { W, H } from '../src/urvid/core/util.js'

const HERE = dirname(fileURLToPath(import.meta.url)), OUT = join(HERE, 'out'); mkdirSync(OUT, { recursive: true })
try { GlobalFonts.loadFontsFromDir(join(HERE, 'fonts')) } catch {}

const arg = process.argv[2]
let brief, seed = 0, note = '', ts = ''
if (arg && arg.trim().startsWith('{')) {
  brief = JSON.parse(arg); seed = (brief.seed >>> 0) || 0
} else {
  const path = join(HERE, 'urvid-shared.json')
  if (!existsSync(path)) { console.error('No hay tools/urvid-shared.json. Toca "Compartir con Claude" en el estudio (con el backend prendido).'); process.exit(1) }
  const list = JSON.parse(readFileSync(path, 'utf-8'))
  if (!Array.isArray(list) || !list.length) { console.error('urvid-shared.json esta vacio.'); process.exit(1) }
  const idx = arg && /^\d+$/.test(arg) ? Math.min(Number(arg), list.length - 1) : 0
  const e = list[idx]; brief = e.brief; seed = (e.seed >>> 0) || 0; note = e.note || ''; ts = e.ts || ''
  console.log(`compartidos: ${list.length} · mostrando #${idx}${ts ? ' (' + ts + ')' : ''}`)
}

const video = makeVideo({ ...brief, seed: seed || undefined })
console.log('MARCA:', brief.brand, '· seed:', seed || '(auto)', note ? '· nota: ' + note : '')
console.log('BRIEF:', JSON.stringify({ rubro: brief.rubro, tone: brief.tone, brandColor: brief.brandColor, tagline: brief.tagline, claim: brief.claim, cta: brief.cta, bullets: brief.bullets, stats: brief.stats, proof: brief.proof }))
console.log('CARTA:', JSON.stringify(video.recipe))

function frame(t, ss = 2) { const cv = createCanvas(W * ss, H * ss), ctx = cv.getContext('2d'); ctx.setTransform(ss, 0, 0, ss, 0, 0); drawFrame(ctx, t, video); return cv }
const n = 12, cols = 4, tileW = 232, tileH = Math.round(tileW * H / W), pad = 10, top = 28
const rows = Math.ceil(n / cols), cw = cols * tileW + (cols + 1) * pad, ch = top + rows * (tileH + 18) + (rows + 1) * pad
const sheet = createCanvas(cw, ch), sx = sheet.getContext('2d')
sx.fillStyle = '#0a0a0f'; sx.fillRect(0, 0, cw, ch); sx.fillStyle = '#fff'; sx.font = 'bold 14px sans-serif'
sx.fillText('urvid 1.0 · ' + (brief.brand || '') + ' · ' + JSON.stringify(video.recipe).slice(0, 120), pad, 18)
for (let i = 0; i < n; i++) {
  const t = (i + 0.5) * video.duration / n, r = (i / cols) | 0, c = i % cols
  const x = pad + c * (tileW + pad), y = top + pad + r * (tileH + 18 + pad)
  sx.drawImage(frame(t), x, y, tileW, tileH)
  sx.fillStyle = '#9aa'; sx.font = '11px sans-serif'; sx.fillText(`${t.toFixed(1)}s · ${beatAt(t, video)}`.slice(0, 34), x + 2, y + tileH + 13)
}
writeFileSync(join(OUT, 'urvid1-shared.png'), sheet.toBuffer('image/png')); console.log('wrote tools/out/urvid1-shared.png')

const fps = 30, MS = 2, total = Math.round(video.duration * fps), tmp = join(OUT, '_shotframes')
rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true })
for (let i = 0; i < total; i++) { const cv = frame((i + 0.5) / fps, MS); writeFileSync(join(tmp, `f${String(i).padStart(4, '0')}.png`), cv.toBuffer('image/png')) }
try {
  execFileSync('ffmpeg', ['-y', '-framerate', String(fps), '-i', join(tmp, 'f%04d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', join(OUT, 'urvid1-shared.mp4')], { stdio: 'ignore' })
  console.log('wrote tools/out/urvid1-shared.mp4', `(${total} frames @ ${fps}fps)`)
} catch (e) { console.log('(mp4) ffmpeg no disponible — quedo el contact-sheet PNG') }
rmSync(tmp, { recursive: true, force: true })
console.log('done.')
