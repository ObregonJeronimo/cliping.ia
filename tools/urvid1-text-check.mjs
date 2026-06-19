// urvid1-text-check.mjs — GATE del fitter de texto: verifica que wrap() ACHICA en vez de elidir.
// Tortura: palabras largas inquebrables + claims largos a anchos tipo hero. Asierta: ninguna linea desborda maxW
// (salvo el caso imposible real), cero "..." cuando hay tamano que entra, y DETERMINISMO. Uso: node tools/urvid1-text-check.mjs
import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { wrap } from '../src/urvid/core/text.js'
import { fontStr } from '../src/urvid/core/util.js'

const HERE = dirname(fileURLToPath(import.meta.url))
try { GlobalFonts.loadFontsFromDir(join(HERE, 'fonts')) } catch {}
const ctx = createCanvas(1080, 1920).getContext('2d')
const W = 405

// casos: [texto, maxW, maxLines]. Incluye la palabra del demo que se elidio ("Automatiza...") y peores.
const CASES = [
  ['Automatizacion', W * 0.86, 2],
  ['Automatiza lo aburrido y enfocate en lo que importa', W * 0.82, 3],
  ['Supercalifragilisticoexpialidoso', W * 0.7, 2],
  ['Menos tareas repetitivas, mas resultados reales', W * 0.74, 4],
  ['INMOBILIARIAAAAAAAAAAAAAAAA', W * 0.8, 2],
  ['Tu piel en su mejor version posible hoy', W * 0.82, 3],
]
let fail = 0
for (const [str, maxW, maxLines] of CASES) {
  const r = wrap(ctx, str, 64, maxW, 14, 800, 'Inter', maxLines)
  // mide cada linea al size devuelto
  ctx.font = fontStr(800, r.size, 'Inter')
  const widths = r.lines.map(l => ctx.measureText(l).width)
  const over = widths.some(w => w > maxW + 1)
  const elided = r.lines.some(l => l.includes('…'))
  // determinismo: misma entrada -> mismo resultado
  const r2 = wrap(ctx, str, 64, maxW, 14, 800, 'Inter', maxLines)
  const det = JSON.stringify(r) === JSON.stringify(r2)
  const ok = !over && !elided && det
  if (!ok) fail++
  console.log(`${ok ? 'OK ' : 'XX '} size=${r.size} lines=${r.lines.length} over=${over} elided=${elided} det=${det} | "${str.slice(0, 28)}" -> ${JSON.stringify(r.lines)}`)
}
console.log(fail === 0 ? '\nGATE TEXTO OK: el fitter ACHICA, no elide (cero ellipsis, cero desborde, determinista).' : `\nGATE TEXTO FALLA: ${fail} caso(s).`)
process.exit(fail === 0 ? 0 : 1)
