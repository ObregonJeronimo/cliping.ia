// aemotion-shot.mjs — "ver" el banco de pruebas del motor aemotion (demo F1). Determinista:
// contact-sheet de 12 frames -> tools/out/aemotion-shot.png (+ --mp4 opcional con ffmpeg).
// Uso: node tools/aemotion-shot.mjs [seed] [--mp4]
import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { drawDemoFrame, DEMO_DUR, W, H, setScratchFactory } from '../src/aemotion/index.js'

const HERE = dirname(fileURLToPath(import.meta.url)), OUT = join(HERE, 'out'); mkdirSync(OUT, { recursive: true })
try { GlobalFonts.loadFontsFromDir(join(HERE, 'fonts')) } catch { /* fuentes del sistema */ }
setScratchFactory((w, h) => createCanvas(w, h))   // OBLIGATORIO: sin esto el motion blur degrada a 1 muestra

const seed = Number(process.argv[2]) || 7

function frame(t, ss = 2) {
  const cv = createCanvas(W * ss, H * ss), ctx = cv.getContext('2d')
  ctx.setTransform(ss, 0, 0, ss, 0, 0)
  drawDemoFrame(ctx, t, seed)
  return cv
}

const n = 16, cols = 4, tileW = 232, tileH = Math.round(tileW * H / W), pad = 10, top = 28
const rows = Math.ceil(n / cols), cw = cols * tileW + (cols + 1) * pad, ch = top + rows * (tileH + 18) + (rows + 1) * pad
const sheet = createCanvas(cw, ch), sx = sheet.getContext('2d')
sx.fillStyle = '#0a0a0f'; sx.fillRect(0, 0, cw, ch); sx.fillStyle = '#fff'; sx.font = 'bold 14px sans-serif'
sx.fillText('AEMOTION testbed · seed ' + seed + ' · ' + DEMO_DUR.toFixed(1) + 's', pad, 18)
for (let i = 0; i < n; i++) {
  const t = (i + 0.5) * DEMO_DUR / n, r = (i / cols) | 0, c = i % cols
  const x = pad + c * (tileW + pad), y = top + pad + r * (tileH + 18 + pad)
  sx.drawImage(frame(t), x, y, tileW, tileH)
  sx.fillStyle = '#9aa'; sx.font = '11px sans-serif'; sx.fillText(t.toFixed(2) + 's', x + 2, y + tileH + 13)
}
writeFileSync(join(OUT, 'aemotion-shot.png'), sheet.toBuffer('image/png')); console.log('wrote tools/out/aemotion-shot.png')

if (process.argv.includes('--mp4')) {
  const fps = 30, MS = 2, total = Math.round(DEMO_DUR * fps), tmp = join(OUT, '_aeframes')
  rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true })
  for (let i = 0; i < total; i++) { const cv = frame((i + 0.5) / fps, MS); writeFileSync(join(tmp, `f${String(i).padStart(4, '0')}.png`), cv.toBuffer('image/png')) }
  try {
    execFileSync('ffmpeg', ['-y', '-framerate', String(fps), '-i', join(tmp, 'f%04d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', join(OUT, 'aemotion-shot.mp4')], { stdio: 'ignore' })
    console.log('wrote tools/out/aemotion-shot.mp4', `(${total} frames @ ${fps}fps)`)
  } catch { console.log('(mp4) ffmpeg no disponible') }
  rmSync(tmp, { recursive: true, force: true })
}
console.log('done.')
