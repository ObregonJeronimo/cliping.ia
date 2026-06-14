// bg-check.mjs — harness de DETERMINISMO del fondo fluido (POC 1), sin render ni navegador.
// Importa engineCore (ESM puro) y lo corre contra un ctx 2D SIMULADO que graba cada operacion de
// dibujo. Prueba: (a) misma (semilla,t) => misma secuencia de ops (pureza/determinismo); (b) semilla
// distinta o tema distinto => secuencia distinta (varianza = ataca el "todos iguales"); (c) no hay
// estado residual entre semillas; (d) drawFrame (frame completo con escenas) tambien es determinista.
// "Corre sin tirar + ops identicas" == BUNDLEA + ES DETERMINISTA. NO prueba que se vea lindo (eso es MP4).
import { drawBackground, drawFrame, DEMO_TIMELINE } from '../src/pages/Animaciones/engineCore.js'

const round = (v) => (typeof v === 'number' ? Math.round(v * 1000) / 1000 : v)

function recCtx() {
  const log = []
  const grad = { addColorStop: (...a) => log.push(['grad.addColorStop', ...a.map(round)]) }
  const proxy = new Proxy({}, {
    get(_, p) {
      if (p === 'createLinearGradient' || p === 'createRadialGradient') {
        return (...a) => { log.push([p, ...a.map(round)]); return grad }
      }
      if (p === 'measureText') return (s) => ({ width: String(s).length * 9 })
      return (...a) => log.push([String(p), ...a.map(round)])   // cualquier metodo de dibujo
    },
    set(_, p, v) {
      log.push(['set:' + String(p), v && typeof v === 'object' ? 'grad' : round(v)])
      return true
    },
  })
  return { ctx: proxy, log }
}

function bgOps(opts, t) {
  const { ctx, log } = recCtx()
  drawBackground(ctx, t, opts)
  return JSON.stringify(log)
}
function frameOps(tl, t) {
  const { ctx, log } = recCtx()
  drawFrame(ctx, t, tl)
  return JSON.stringify(log)
}

let pass = 0, fail = 0
const ok = (name, cond) => { cond ? pass++ : fail++; console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`) }

const A = { theme: 'ocean-deep', accent: '#3aa0ff', seed: 42 }

// (a) determinismo: misma (semilla,t) en dos corridas => identico, en varios t
for (const t of [0, 0.25, 1.0, 2.0, 3.7, 7.5, 13.99]) {
  ok(`determinista @ t=${t}`, bgOps(A, t) === bgOps(A, t))
}

// (b1) varianza por semilla: misma escena, distinta marca => fondo distinto
ok('varianza por semilla (42 != 99)', bgOps(A, 2.0) !== bgOps({ ...A, seed: 99 }, 2.0))
// (b2) varianza por tema
ok('varianza por tema (ocean != gold-lux)', bgOps(A, 2.0) !== bgOps({ ...A, theme: 'gold-lux' }, 2.0))
// (b3) varianza por acento
ok('varianza por acento', bgOps(A, 2.0) !== bgOps({ ...A, accent: '#19c37d' }, 2.0))
// (b4) movimiento: el fondo cambia con el tiempo
ok('movimiento (t=1 != t=5)', bgOps(A, 1.0) !== bgOps(A, 5.0))

// (c) sin estado residual: 42 -> 99 -> 42 vuelve a dar EXACTO el primer 42
const first42 = bgOps(A, 2.0)
bgOps({ ...A, seed: 99 }, 2.0)
bgOps({ ...A, seed: 7, theme: 'crimson-bold' }, 4.0)
ok('sin estado residual entre semillas', bgOps(A, 2.0) === first42)

// (d) frame completo (con escenas) determinista
for (const t of [0.4, 2.0, 6.0]) {
  ok(`drawFrame DEMO determinista @ t=${t}`, frameOps(DEMO_TIMELINE, t) === frameOps(DEMO_TIMELINE, t))
}
// (d2) dos timelines con seed explicito distinto => fondo distinto
const tlX = { ...DEMO_TIMELINE, seed: 1 }
const tlY = { ...DEMO_TIMELINE, seed: 2 }
ok('drawFrame varia con timeline.seed', frameOps(tlX, 0.4) !== frameOps(tlY, 0.4))

// info: cuanto laburo hace (no es un assert, solo contexto)
const { ctx, log } = recCtx()
drawBackground(ctx, 2.0, A)
console.log(`\n(info) ops de dibujo en un frame de fondo: ${log.length}`)

console.log(`\n${pass} pass, ${fail} fail`)
process.exit(fail ? 1 : 0)
