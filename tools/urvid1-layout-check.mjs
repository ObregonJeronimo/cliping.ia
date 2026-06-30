// urvid1-layout-check.mjs - GATE no-solape del SOLVER de layout. arrange() ubica los slots semanticos en BANDAS
// verticales (mismo x/ancho, y += h + gapPx; gapPx = H*gap > 0) -> sin solape por construccion. Este gate lo VERIFICA
// (puro: no renderiza, no consume PRNG, no toca palette/fit/typography/render -> determinismo/prefit/apca/qa/keep intactos).
// Corre los 6 presets reales x 3 formatos x varios sets de slots y ASSERT que ningun par de cajas se solapa y que cada
// caja queda dentro de _block. Gate de REGRESION: hoy pasa por construccion; defiende contra un cambio futuro en
// arrange() que meta gapPx negativo, altura<=0, anchor mal anclado, o un _block que no contenga las bandas.
//
// DRIFT WARNING: los 6 PRESETS de abajo son COPIA MANUAL de src/urvid/libs/layouts/index.js (verificados identicos al
// crear este gate). Si cambian alla y no aca, el gate verifica presets viejos -> mantener en sync.
import { arrange } from '../src/urvid/core/layout.js'
import { setFormat } from '../src/urvid/core/util.js'

const PRESETS = {
  'stack.center':    { align: 'center', anchor: 'center', side: 0.1,  gap: 0.035 },
  'editorial.left':  { align: 'left',   anchor: 'center', side: 0.1,  gap: 0.04  },
  'poster.top':      { align: 'left',   anchor: 'top',    side: 0.1,  gap: 0.045 },
  'anchored.bottom': { align: 'center', anchor: 'bottom', side: 0.11, gap: 0.03  },
  'tight.center':    { align: 'center', anchor: 'center', side: 0.14, gap: 0.026 },
  'air.spread':      { align: 'center', anchor: 'top',    side: 0.1,  gap: 0.06  },
}
const FORMATS = ['9:16', '4:5', '1:1']
// kinds reales del KIND map de core/layout.js (kicker/title/subtitle/body/list/stat/media/cta/mark/footnote).
const SETS = [
  [['t', 'title']],
  [['k', 'kicker'], ['t', 'title']],
  [['k', 'kicker'], ['t', 'title'], ['b', 'body']],
  [['k', 'kicker'], ['t', 'title'], ['b', 'body'], ['c', 'cta']],
  [['t', 'title'], ['l', 'list']],
  [['k', 'kicker'], ['t', 'title'], ['l', 'list'], ['c', 'cta']],
  [['s', 'stat'], ['b', 'body']],
  [['k', 'kicker'], ['s', 'stat'], ['b', 'body'], ['c', 'cta']],
  [['md', 'media'], ['t', 'title'], ['c', 'cta']],
  [['k', 'kicker'], ['t', 'title'], ['sub', 'subtitle'], ['b', 'body'], ['c', 'cta'], ['m', 'mark']],
  [['k', 'kicker'], ['t', 'title'], ['sub', 'subtitle'], ['b', 'body'], ['l', 'list'], ['c', 'cta'], ['m', 'mark'], ['f', 'footnote']],
]
const EPS = 0.5
const overlap = (a, b) => (a.x < b.x + b.w - EPS) && (b.x < a.x + a.w - EPS) && (a.y < b.y + b.h - EPS) && (b.y < a.y + a.h - EPS)

let fails = 0, checked = 0
const die = (m) => { console.error('FAIL  ' + m); fails++ }
for (const fmt of FORMATS) {
  setFormat(fmt)
  for (const pn in PRESETS) {
    for (const set of SETS) {
      const ids = set.map(s => s[0])
      if (new Set(ids).size !== ids.length) { die(`set con ids duplicados: [${ids.join(',')}]`); continue }   // un id repetido enmascararia overlap (out[id] overwrite)
      const req = set.map(([id, kind]) => ({ id, kind }))
      const L = arrange(req, PRESETS[pn])
      const tag = `${fmt}/${pn}/[${req.map(r => r.kind).join(',')}]`
      checked++
      let bad = false
      for (const r of req) { const bx = L[r.id]; if (!bx || ![bx.x, bx.y, bx.w, bx.h].every(Number.isFinite)) { die(`${tag}: slot '${r.id}' sin box valida`); bad = true } }
      if (bad) continue
      const boxes = req.map(r => ({ id: r.id, ...L[r.id] }))
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        if (overlap(boxes[i], boxes[j])) die(`${tag}: slots '${boxes[i].id}' y '${boxes[j].id}' se solapan`)
      }
      const blk = L._block
      for (const bx of boxes) {
        if (bx.x < blk.x - EPS || bx.x + bx.w > blk.x + blk.w + EPS || bx.y < blk.y - EPS || bx.y + bx.h > blk.y + blk.h + EPS)
          die(`${tag}: slot '${bx.id}' fuera de _block`)
      }
    }
  }
}
console.log(`LAYOUT: ${checked} arrange() chequeados (${FORMATS.length} formatos x ${Object.keys(PRESETS).length} presets x ${SETS.length} sets)`)
if (fails) { console.error(`\nGATE LAYOUT FALLO (${fails} solapes/desbordes).`); process.exit(1) }
console.log('GATE LAYOUT OK (ningun par de slots se solapa; cada slot dentro de _block).')
