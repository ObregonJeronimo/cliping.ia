// nova-shot.mjs — verificacion visual de la pieza NOVA (demo de craft): grillas de 12 frames por escena
// (regla de Jero) para iterar la direccion + mp4 final con ffmpeg. node tools/nova-shot.mjs [--mp4]
import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { drawFrame, DUR, W, H, FPS } from '../public/demo-nova.js'

const HERE = dirname(fileURLToPath(import.meta.url)), OUT = join(HERE, 'out', 'nova')
mkdirSync(OUT, { recursive: true })
try { GlobalFonts.loadFontsFromDir(join(HERE, 'fonts')) } catch { /* sistema */ }

const SS = 0.5   // grillas a media resolucion (1080 -> 540) para leer rapido
function frame(t, ss = SS) {
  const cv = createCanvas(Math.round(W * ss), Math.round(H * ss)), ctx = cv.getContext('2d')
  ctx.setTransform(ss, 0, 0, ss, 0, 0); drawFrame(ctx, t); return cv
}
const SPANS = [[0, 1.7], [1.7, 4.1], [4.1, 7.0], [7.0, 9.2], [9.2, 11.1], [11.1, 13.4], [13.4, 16.0]]
SPANS.forEach(([a, b], i) => {
  const n = 12, cols = 4, tw = 216, th = Math.round(tw * H / W), pad = 6, top = 22
  const cw = cols * tw + 5 * pad, ch = top + 3 * (th + 14) + 4 * pad
  const sheet = createCanvas(cw, ch), sx = sheet.getContext('2d')
  sx.fillStyle = '#000'; sx.fillRect(0, 0, cw, ch)
  sx.fillStyle = '#fff'; sx.font = 'bold 12px sans-serif'; sx.fillText(`ESCENA ${i + 1}  [${a}s - ${b}s]`, pad, 15)
  for (let k = 0; k < n; k++) {
    const t = a + (b - a) * k / (n - 1) * 0.999
    const r = (k / cols) | 0, c = k % cols
    const x = pad + c * (tw + pad), y = top + pad + r * (th + 14 + pad)
    sx.drawImage(frame(t), x, y, tw, th)
    sx.fillStyle = '#8a8'; sx.font = '10px sans-serif'; sx.fillText(t.toFixed(2) + 's', x + 2, y + th + 11)
  }
  writeFileSync(join(OUT, `esc${i + 1}.png`), sheet.toBuffer('image/png'))
  console.log(`wrote nova/esc${i + 1}.png`)
})
if (process.argv.includes('--mp4')) {
  const tmp = join(OUT, '_f'); rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true })
  const total = Math.round(DUR * FPS)
  for (let i = 0; i < total; i++) { writeFileSync(join(tmp, `f${String(i).padStart(4, '0')}.png`), frame((i + 0.5) / FPS, 1).toBuffer('image/png')) }
  execFileSync('ffmpeg', ['-y', '-framerate', String(FPS), '-i', join(tmp, 'f%04d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-movflags', '+faststart', join(OUT, 'nova.mp4')], { stdio: 'ignore' })
  rmSync(tmp, { recursive: true, force: true })
  console.log('wrote nova/nova.mp4 (' + total + ' frames @ ' + FPS + 'fps, 1080x1920)')
}
console.log('done.')
