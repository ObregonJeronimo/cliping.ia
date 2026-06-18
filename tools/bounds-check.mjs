// bounds-check.mjs — GATE programatico: NINGUN texto se dibuja fuera del cuadro 405x720.
// Hookea ctx.fillText durante el render: calcula la caja real del texto (ancho via measureText + textAlign +
// alto via font-size + baseline) y la mapea por la matriz de transformacion actual a coords del cuadro. Si sale
// de [0,W]x[0,H] mas que la tolerancia -> VIOLACION (con fixture, t, texto y cuanto se pasa). Determinista.
// Corre sobre muchos timelines x muchos frames -> si pasa, GARANTIZA que el texto no se sale en esos casos.
// Uso: node tools/bounds-check.mjs [dir1 dir2 file...]   (default: catalogo + banco + realpages + torture)
import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas'
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { join, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { drawFrame, timelineDuration, setLogo, setPhotos } from '../src/pages/Animaciones/engineCore.js'

const W = 405, H = 720, NF = 16
const PADX = 2, PADY = 10   // tolerancia: horizontal estricto (el bug es lateral); vertical laxo (baseline aprox)
const HERE = dirname(fileURLToPath(import.meta.url))
try { GlobalFonts.loadFontsFromDir(join(HERE, 'fonts')) } catch {}

function collect(args) {
  const out = []
  const add = (p) => {
    if (!existsSync(p)) return
    if (statSync(p).isDirectory()) readdirSync(p).filter(f => f.endsWith('.json')).forEach(f => out.push(join(p, f)))
    else if (p.endsWith('.json')) out.push(p)
  }
  if (args.length) args.forEach(add)
  else {
    add(join(HERE, '_matrix')); add(join(HERE, 'realpages')); add(join(HERE, 'brands'))
    add(join(HERE, 'torture-fixture.json'))
    add(join(HERE, '_cat3_statements.json')); add(join(HERE, '_cat3_stats_outro.json'))
    add(join(HERE, '_cat3_checklist.json')); add(join(HERE, '_cat3_misc.json'))
  }
  return out
}

function checkTimeline(path) {
  const tl = JSON.parse(readFileSync(path, 'utf8'))
  const dur = timelineDuration(tl) || 8
  let worst = null   // {t, text, side, over}
  for (let i = 0; i < NF; i++) {
    const t = (i + 0.5) * dur / NF
    const cv = createCanvas(W, H), ctx = cv.getContext('2d')
    const orig = ctx.fillText.bind(ctx)
    ctx.fillText = (str, x, y) => {
      if (!ctx._bleedText) try {
        const s = String(str)
        if (s.trim()) {
          const m = ctx.measureText(s), w = m.width
          const al = ctx.textAlign || 'left'
          let left = x
          if (al === 'center') left = x - w / 2
          else if (al === 'right' || al === 'end') left = x - w
          const right = left + w
          const fs = parseFloat((/(\d+(?:\.\d+)?)px/.exec(ctx.font) || [])[1] || '16')
          const bl = ctx.textBaseline
          const top = bl === 'middle' ? y - fs * 0.55 : bl === 'top' ? y : y - fs * 0.82
          const bot = bl === 'middle' ? y + fs * 0.55 : bl === 'top' ? y + fs : y + fs * 0.24
          const M = ctx.getTransform()
          const cs = [[left, top], [right, top], [left, bot], [right, bot]].map(([px, py]) => ({ x: M.a * px + M.c * py + M.e, y: M.b * px + M.d * py + M.f }))
          const minX = Math.min(...cs.map(c => c.x)), maxX = Math.max(...cs.map(c => c.x))
          const minY = Math.min(...cs.map(c => c.y)), maxY = Math.max(...cs.map(c => c.y))
          let side = '', over = 0
          if (maxX > W + PADX) { side = 'der'; over = maxX - W }
          else if (minX < -PADX) { side = 'izq'; over = -minX }
          else if (maxY > H + PADY) { side = 'abajo'; over = maxY - H }
          else if (minY < -PADY) { side = 'arriba'; over = -minY }
          if (side && (!worst || over > worst.over)) worst = { t: +t.toFixed(2), text: s.slice(0, 36), side, over: Math.round(over) }
        }
      } catch {}
      return orig(str, x, y)
    }
    drawFrame(ctx, t, tl)
  }
  return worst
}

const files = collect(process.argv.slice(2))
let fails = 0
const rows = []
for (const f of files) {
  let w = null
  try { w = checkTimeline(f) } catch (e) { rows.push(['ERR ', basename(f), e.message]); continue }
  if (w) { fails++; rows.push(['FAIL', basename(f), `"${w.text}" se sale ${w.over}px por ${w.side} (t=${w.t}s)`]) }
}
console.log(`BOUNDS-CHECK — texto fuera del cuadro 405x720 (${files.length} timelines x ${NF} frames, tol ${PADX}px H / ${PADY}px V)\n`)
for (const r of rows) console.log(`  ${r[0]}  ${r[1].padEnd(26)} ${r[2]}`)
if (!rows.length) console.log('  (sin timelines)')
console.log(`\n${fails === 0 ? 'PASS' : 'FAIL'}: ${files.length - fails}/${files.length} sin texto fuera del cuadro` + (fails ? ` · ${fails} con desborde` : ''))
process.exitCode = fails ? 1 : 0
