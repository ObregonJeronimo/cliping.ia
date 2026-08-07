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
// UN SOLO LIENZO PARA LOS 360 CUADROS, y no es microoptimizacion: era la compuerta mas cara de todo
// el guard y nadie lo sabia. Creando uno nuevo por cuadro, este bucle llegaba a 1713 MB de memoria
// COMPROMETIDA (medido con el evento de Windows, el unico numero que ve los buffers nativos), y el 7
// de agosto de 2026 hizo que el vigilante cortara `npm run gates` en la compuerta 3.
//
// Y NO ERA UNA FUGA, aunque tenga toda la forma de la que este repo ya sufrio seis veces. Medido: 60
// lienzos llevan el commit de 73 a 701 MB, y un `gc()` lo devuelve a 78 — o sea que la memoria SI se
// libera. El problema es CUANDO: los pixeles de @napi-rs/canvas viven fuera del monton de JavaScript,
// asi que V8 no los cuenta al decidir si le hace falta recolectar y el bucle se recorre entero sin
// una sola recoleccion. 360 lienzos de 4,4 MB apilados como basura no recogida: 1,9 GB proyectados
// contra 1713 MB reales. La distincion importa porque cambia el arreglo — una fuga hay que liberarla,
// esto solo hay que dejar de generarlo.
//
// PROBADO ANTES DE CAMBIARLO, porque reusar el lienzo cambiaria la salida si arrastrara estado: 32
// cuadros comparados entre los dos caminos —incluidos los arranques de escena, que es donde vive el
// crossfade con buffers offscreen— dieron los 32 IDENTICOS BYTE A BYTE, y reusar dos veces el mismo
// instante tambien. `ctx.reset()` existe en @napi-rs/canvas y deja el contexto como recien creado.
const fps = 30, MS = 2, total = Math.round(video.duration * fps), tmp = join(OUT, '_u1frames')
rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true })
const lienzo = createCanvas(W * MS, H * MS), lctx = lienzo.getContext('2d')
for (let i = 0; i < total; i++) {
  lctx.reset()
  lctx.setTransform(MS, 0, 0, MS, 0, 0)
  drawFrame(lctx, (i + 0.5) / fps, video)
  writeFileSync(join(tmp, `f${String(i).padStart(4, '0')}.png`), lienzo.toBuffer('image/png'))
}
try {
  execFileSync('ffmpeg', ['-y', '-framerate', String(fps), '-i', join(tmp, 'f%04d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', join(OUT, 'urvid1-demo.mp4')], { stdio: 'ignore' })
  console.log('wrote tools/out/urvid1-demo.mp4', `(${total} frames @ ${fps}fps, ${(W * MS)}x${(H * MS)})`)
} catch (e) { console.log('(mp4) ffmpeg fallo:', e.message) }
rmSync(tmp, { recursive: true, force: true })
console.log('done.')
