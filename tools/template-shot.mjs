// template-shot.mjs — "ver" un template autorado reproducido con un brief. Determinista.
// Uso: node tools/template-shot.mjs '{"brand":"Nodo",...}'   (usa el 1er EXAMPLE_TEMPLATE)
import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { makeTemplateVideo, drawTemplateFrame, EXAMPLE_TEMPLATES } from '../src/templates/index.js'

const HERE = dirname(fileURLToPath(import.meta.url)), OUT = join(HERE, 'out'); mkdirSync(OUT, { recursive: true })
try { GlobalFonts.loadFontsFromDir(join(HERE, 'fonts')) } catch { /* fuentes del sistema */ }

const brief = process.argv[2] && process.argv[2].trim().startsWith('{')
  ? JSON.parse(process.argv[2])
  : { brand: 'Nodo', rubro: 'tech', brandColor: '#22e06a', tagline: 'Automatiza lo aburrido', claim: 'Menos tareas repetitivas, mas resultados', cta: 'Probalo gratis', bullets: ['Rapido de integrar', 'Reportes en vivo', 'Soporte 24/7'], stats: [{ value: '+400', label: 'equipos lo usan' }] }

const video = makeTemplateVideo(EXAMPLE_TEMPLATES[0], brief)
console.log('TEMPLATE ·', video.name, '· brand:', brief.brand, '· dur:', video.duration.toFixed(1) + 's')
console.log('ESCENAS:', video.scenes.map(s => s.id + '@' + s.t0.toFixed(1) + 's').join(' > '))
console.log('SLOTS RESUELTOS:')
for (const sc of video.scenes) for (const l of sc.layers) if (l.slot) console.log('  ', sc.id, l.slot.kind, '=>', JSON.stringify(l.resolved))

function frame(t, ss = 2) { const cv = createCanvas(video.W * ss, video.H * ss), ctx = cv.getContext('2d'); ctx.setTransform(ss, 0, 0, ss, 0, 0); drawTemplateFrame(ctx, t, video); return cv }

// determinismo: mismo t -> mismo PNG
let det = true
for (const t of [0.4, video.duration * 0.35, video.duration * 0.7]) { if (!frame(t).toBuffer('image/png').equals(frame(t).toBuffer('image/png'))) det = false }
console.log('DETERMINISMO:', det ? 'OK (byte-identico)' : 'FALLA')

const n = 12, cols = 4, tileW = 232, tileH = Math.round(tileW * video.H / video.W), pad = 10, top = 28
const rows = Math.ceil(n / cols), cw = cols * tileW + (cols + 1) * pad, ch = top + rows * (tileH + 18) + (rows + 1) * pad
const sheet = createCanvas(cw, ch), sx = sheet.getContext('2d')
sx.fillStyle = '#0a0a0f'; sx.fillRect(0, 0, cw, ch); sx.fillStyle = '#fff'; sx.font = 'bold 14px sans-serif'
sx.fillText('TEMPLATE · ' + video.name + ' · ' + brief.brand + ' · ' + video.duration.toFixed(1) + 's', pad, 18)
for (let i = 0; i < n; i++) {
  const t = (i + 0.5) * video.duration / n, r = (i / cols) | 0, c = i % cols
  const x = pad + c * (tileW + pad), y = top + pad + r * (tileH + 18 + pad)
  sx.drawImage(frame(t), x, y, tileW, tileH)
  sx.fillStyle = '#9aa'; sx.font = '11px sans-serif'; sx.fillText(t.toFixed(2) + 's', x + 2, y + tileH + 13)
}
writeFileSync(join(OUT, 'template-shot.png'), sheet.toBuffer('image/png')); console.log('wrote tools/out/template-shot.png')
