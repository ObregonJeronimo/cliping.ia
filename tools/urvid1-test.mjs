// urvid1-test.mjs — prueba la REBANADA VERTICAL del motor urvid 1.0 de punta a punta (sin la app):
// arma un video desde un brief -> render -> contact sheet + MP4 + chequeo de DETERMINISMO. Uso: node tools/urvid1-test.mjs
import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { makeVideo, drawFrame, beatAt, stats } from '../src/urvid/index.js'
import { setScratchFactory } from '../src/urvid/core/render.js'
import { W, H } from '../src/urvid/core/util.js'

const HERE = dirname(fileURLToPath(import.meta.url)), OUT = join(HERE, 'out'); mkdirSync(OUT, { recursive: true })
try { GlobalFonts.loadFontsFromDir(join(HERE, 'fonts')) } catch {}
// buffer offscreen para el crossfade de transicion (browser/Remotion usan OffscreenCanvas; en Node lo inyectamos)
setScratchFactory((w, h) => createCanvas(w, h))

const brief = {
  brand: 'Nodo', rubro: 'tech', tone: 'dark', brandColor: '#22e06a',
  content: { tagline: 'Automatiza lo aburrido y enfocate en lo que importa', claim: 'Menos tareas repetitivas, mas resultados reales', cta: 'Probalo gratis' },
}
const video = makeVideo(brief)
console.log('VIDEO armado:', JSON.stringify(video.recipe), '· dur', video.duration.toFixed(1) + 's')
console.log('REGISTRO:', JSON.stringify(stats().totalModules), 'modulos ·', Object.keys(stats().libraries).join(', '))

// ---- contact sheet (12 frames) ----
function frame(t, ss = 2) { const cv = createCanvas(W * ss, H * ss), ctx = cv.getContext('2d'); ctx.setTransform(ss, 0, 0, ss, 0, 0); drawFrame(ctx, t, video); return cv }
const n = 12, cols = 4, tileW = 232, tileH = Math.round(tileW * H / W), pad = 10, top = 26
const rows = Math.ceil(n / cols), cw = cols * tileW + (cols + 1) * pad, ch = top + rows * (tileH + 18) + (rows + 1) * pad
const sheet = createCanvas(cw, ch), sx = sheet.getContext('2d')
sx.fillStyle = '#0a0a0f'; sx.fillRect(0, 0, cw, ch); sx.fillStyle = '#fff'; sx.font = 'bold 14px sans-serif'; sx.fillText('urvid 1.0 · ' + brief.brand + ' · ' + JSON.stringify(video.recipe), pad, 18)
for (let i = 0; i < n; i++) {
  const t = (i + 0.5) * video.duration / n, r = Math.floor(i / cols), c = i % cols
  const x = pad + c * (tileW + pad), y = top + pad + r * (tileH + 18 + pad)
  sx.drawImage(frame(t), x, y, tileW, tileH)
  sx.fillStyle = '#9aa'; sx.font = '11px sans-serif'; sx.fillText(`${t.toFixed(1)}s · ${beatAt(t, video)}`.slice(0, 34), x + 2, y + tileH + 13)
}
writeFileSync(join(OUT, 'urvid1-demo.png'), sheet.toBuffer('image/png')); console.log('wrote tools/out/urvid1-demo.png')

// ---- determinismo: render del mismo frame dos veces -> buffers identicos ----
const a = frame(2.0).toBuffer('image/png'), b = frame(2.0).toBuffer('image/png')
console.log(a.equals(b) ? 'DETERMINISMO: OK (frame identico)' : 'DETERMINISMO: FALLA (frame difiere!)')
// determinismo DENTRO de la ventana de transicion (donde se usan los buffers offscreen + crossfade)
if (video.scenes[1]) {
  const tt = video.scenes[1].start + 0.2
  const ta = frame(tt).toBuffer('image/png'), tb = frame(tt).toBuffer('image/png')
  console.log(ta.equals(tb) ? 'DETERMINISMO (transicion/crossfade): OK' : 'DETERMINISMO (transicion): FALLA!')
}

// ---- MP4 (para ver la fluidez) ----
const fps = 30, MS = 2, total = Math.round(video.duration * fps), tmp = join(OUT, '_u1frames')
rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true })
for (let i = 0; i < total; i++) { const cv = frame((i + 0.5) / fps, MS); writeFileSync(join(tmp, `f${String(i).padStart(4, '0')}.png`), cv.toBuffer('image/png')) }
try {
  execFileSync('ffmpeg', ['-y', '-framerate', String(fps), '-i', join(tmp, 'f%04d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', join(OUT, 'urvid1-demo.mp4')], { stdio: 'ignore' })
  console.log('wrote tools/out/urvid1-demo.mp4', `(${total} frames @ ${fps}fps, ${(W * MS)}x${(H * MS)})`)
} catch (e) { console.log('(mp4) ffmpeg fallo:', e.message) }
rmSync(tmp, { recursive: true, force: true })
console.log('done.')
