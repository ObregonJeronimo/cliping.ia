// legibility-check.mjs — GATE de legibilidad del CUERPO de texto (no particulas/barras/formas).
// Tecnica del bounds-check: hookea ctx.fillText para registrar la CAJA real de cada texto; luego mide el
// contraste WCAG de los pixeles de GLIFO (diff full vs bg-only) DENTRO de esas cajas -> excluye particulas,
// barras de acento, sombras y el aura (que el probe global contaba de mas). FALLA si el cuerpo de un texto
// queda por debajo del umbral WCAG. Determinista. Uso: node tools/legibility-check.mjs [dirs/files...]
import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas'
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { join, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { drawFrame, timelineDuration, setLogo, setPhotos } from '../src/pages/Animaciones/engineCore.js'

const W = 405, H = 720, SS = 2, NF = 8
const MIN_AA = 2.4          // umbral: por debajo de 2.4:1 el cuerpo se lee MAL (AA grande es 3.0; damos aire al glow/halo)
const MIN_PX = 30           // ignora cajas con muy pocos pixeles de glifo (ruido)
const HERE = dirname(fileURLToPath(import.meta.url))
try { GlobalFonts.loadFontsFromDir(join(HERE, 'fonts')) } catch {}

const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }
const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
const contrast = (a, b) => { const x = Math.max(a, b), y = Math.min(a, b); return (x + 0.05) / (y + 0.05) }

function collect(args) {
  const out = []
  const add = (p) => { if (!existsSync(p)) return; if (statSync(p).isDirectory()) readdirSync(p).filter(f => f.endsWith('.json')).forEach(f => out.push(join(p, f))); else if (p.endsWith('.json')) out.push(p) }
  if (args.length) args.forEach(add)
  else { add(join(HERE, 'realpages')); add(join(HERE, '_matrix')); add(join(HERE, '_stresslib')); add(join(HERE, 'torture-fixture.json')) }
  return out
}

function check(path) {
  const tl = JSON.parse(readFileSync(path, 'utf8'))
  const dur = timelineDuration(tl) || 8
  let worst = null
  for (let f = 0; f < NF; f++) {
    const t = (f + 0.5) * dur / NF
    const boxes = []
    const cv = createCanvas(W * SS, H * SS), ctx = cv.getContext('2d'); ctx.setTransform(SS, 0, 0, SS, 0, 0)
    const orig = ctx.fillText.bind(ctx)
    ctx.fillText = (str, x, y) => {
      if (!ctx._bleedText) try {
        const s = String(str)
        if (s.trim()) {
          const m = ctx.measureText(s), w = m.width
          const al = ctx.textAlign || 'left'; let left = x; if (al === 'center') left = x - w / 2; else if (al === 'right' || al === 'end') left = x - w
          const fs = parseFloat((/(\d+(?:\.\d+)?)px/.exec(ctx.font) || [])[1] || '16')
          const bl = ctx.textBaseline; const top = bl === 'middle' ? y - fs * 0.6 : bl === 'top' ? y : y - fs * 0.85, bot = bl === 'middle' ? y + fs * 0.6 : bl === 'top' ? y + fs : y + fs * 0.28
          const M = ctx.getTransform()   // incluye SS -> coords device
          const cs = [[left, top], [left + w, top], [left, bot], [left + w, bot]].map(([px, py]) => ({ x: M.a * px + M.c * py + M.e, y: M.b * px + M.d * py + M.f }))
          boxes.push({ s: s.slice(0, 30), x0: Math.min(...cs.map(c => c.x)), y0: Math.min(...cs.map(c => c.y)), x1: Math.max(...cs.map(c => c.x)), y1: Math.max(...cs.map(c => c.y)) })
        }
      } catch {}
      return orig(str, x, y)
    }
    drawFrame(ctx, t, tl)
    const full = ctx.getImageData(0, 0, W * SS, H * SS).data
    const cv2 = createCanvas(W * SS, H * SS), ctx2 = cv2.getContext('2d'); ctx2.setTransform(SS, 0, 0, SS, 0, 0)
    drawFrame(ctx2, t, tl, { bgOnly: true })
    const bg = ctx2.getImageData(0, 0, W * SS, H * SS).data
    const WD = W * SS, HD = H * SS
    for (const b of boxes) {
      const x0 = Math.max(0, Math.floor(b.x0)), x1 = Math.min(WD - 1, Math.ceil(b.x1)), y0 = Math.max(0, Math.floor(b.y0)), y1 = Math.min(HD - 1, Math.ceil(b.y1))
      let nGlyph = 0, sumC = 0, lowC = 1e9
      for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) {
        const i = (py * WD + px) * 4
        const dr = Math.abs(full[i] - bg[i]) + Math.abs(full[i + 1] - bg[i + 1]) + Math.abs(full[i + 2] - bg[i + 2])
        if (dr < 170) continue   // pixel de GLIFO solido (no AA/fondo)
        nGlyph++
        const c = contrast(lum(full[i], full[i + 1], full[i + 2]), lum(bg[i], bg[i + 1], bg[i + 2]))
        sumC += c; if (c < lowC) lowC = c
      }
      if (nGlyph >= MIN_PX) {
        const avg = sumC / nGlyph   // promedio del cuerpo (no el pixel peor, que puede ser un borde)
        if (!worst || avg < worst.avg) worst = { t: +t.toFixed(2), text: b.s, avg, nGlyph }
      }
    }
  }
  return worst
}

const files = collect(process.argv.slice(2))
let fails = 0
const rows = []
for (const f of files) {
  let w = null
  try { w = check(f) } catch (e) { rows.push(['ERR ', basename(f), e.message]); continue }
  if (w && w.avg < MIN_AA) { fails++; rows.push(['FAIL', basename(f), `"${w.text}" contraste cuerpo ${w.avg.toFixed(2)}:1 (t=${w.t}s)`]) }
  else if (w) rows.push(['ok  ', basename(f), `peor cuerpo ${w.avg.toFixed(2)}:1`])
}
console.log(`LEGIBILITY-CHECK — contraste WCAG del CUERPO de texto (${files.length} timelines x ${NF} frames, umbral ${MIN_AA}:1)\n`)
for (const r of rows) if (r[0] !== 'ok  ') console.log(`  ${r[0]}  ${r[1].padEnd(24)} ${r[2]}`)
const oks = rows.filter(r => r[0] === 'ok  ').length
console.log(`\n${fails === 0 ? 'PASS' : 'FAIL'}: ${oks}/${files.length} con el cuerpo de texto legible` + (fails ? ` · ${fails} por debajo de ${MIN_AA}:1` : ''))
process.exitCode = fails ? 1 : 0
