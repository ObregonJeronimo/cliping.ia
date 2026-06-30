// urvid1-motion-check.mjs — GATE de la biblioteca MOTION. Verifica el CONTRATO de cada personalidad:
//   make() devuelve { ease, settle, smooth, stagger, enter{dx,dy,scale,rotate}, enterDur, ambient }.
//   - ease y smooth MONOTONICOS y acotados en [0,1] (no se pasan: barras/reglas no deben overshoot-ear)
//   - ease/smooth(0)~0, (1)~1 ; settle(0)~0, settle(1)~1 (overshoot permitido SOLO en el medio)
//   - stagger>0, enterDur>0, enter con campos numericos, ambient(t,seed) devuelve {x,y,scale,rot} numericos
//   - DETERMINISMO: make() dos veces -> mismas muestras de curva
// Uso: node tools/urvid1-motion-check.mjs
import '../src/urvid/libs/index.js'
import { query } from '../src/urvid/core/registry.js'

const mods = query('motion')
console.log('MOTION: ' + mods.length + ' personalidades')
const fails = []
const near = (a, b, eps = 0.02) => Math.abs(a - b) <= eps
const SAMPLES = 24

for (const m of mods) {
  if (typeof m.make !== 'function') { fails.push(`${m.id}: sin make()`); continue }
  const M = m.make()
  for (const fn of ['ease', 'settle', 'smooth']) if (typeof M[fn] !== 'function') fails.push(`${m.id}: falta ${fn}()`)
  if (!(M.stagger > 0)) fails.push(`${m.id}: stagger invalido (${M.stagger})`)
  if (!(M.enterDur > 0)) fails.push(`${m.id}: enterDur invalido (${M.enterDur})`)
  for (const k of ['dx', 'dy', 'scale', 'rotate']) if (M.enter == null || typeof M.enter[k] !== 'number') fails.push(`${m.id}: enter.${k} no numerico`)
  // bordes
  if (M.ease && !near(M.ease(0), 0)) fails.push(`${m.id}: ease(0)=${M.ease(0).toFixed(3)} != 0`)
  if (M.ease && !near(M.ease(1), 1)) fails.push(`${m.id}: ease(1)=${M.ease(1).toFixed(3)} != 1`)
  if (M.smooth && !near(M.smooth(0), 0)) fails.push(`${m.id}: smooth(0) != 0`)
  if (M.smooth && !near(M.smooth(1), 1)) fails.push(`${m.id}: smooth(1) != 1`)
  if (M.settle && !near(M.settle(0), 0, 0.03)) fails.push(`${m.id}: settle(0) != 0`)
  if (M.settle && !near(M.settle(1), 1, 0.03)) fails.push(`${m.id}: settle(1) != 1`)
  // monotonia + acotacion de ease/smooth
  for (const fn of ['ease', 'smooth']) {
    if (typeof M[fn] !== 'function') continue
    let prev = -1
    for (let i = 0; i <= SAMPLES; i++) {
      const p = i / SAMPLES, v = M[fn](p)
      if (v < -0.001 || v > 1.001) { fails.push(`${m.id}: ${fn}(${p.toFixed(2)})=${v.toFixed(3)} fuera de [0,1]`); break }
      if (v < prev - 0.001) { fails.push(`${m.id}: ${fn} NO monotonico en p=${p.toFixed(2)}`); break }
      prev = v
    }
  }
  // ambient: forma + numeros
  if (typeof M.ambient === 'function') {
    const a = M.ambient(1.0, 12345)
    for (const k of ['x', 'y', 'scale', 'rot']) if (a == null || typeof a[k] !== 'number') fails.push(`${m.id}: ambient.${k} no numerico`)
  }
  // determinismo: dos make() -> mismas muestras
  const M2 = m.make()
  for (let i = 0; i <= 8; i++) { const p = i / 8; if (M.ease(p) !== M2.ease(p) || M.settle(p) !== M2.settle(p)) { fails.push(`${m.id}: NO determinista`); break } }
}

// DISCRIMINANTE: ninguna personalidad debe ser casi-clon de otra (cada una le ofrece un FEEL distinto al publico).
// Para cada par contamos en cuantos ejes de feel difieren significativamente; <3 ejes = casi-clon = FALLO.
const sumAbs = (a, b) => a.reduce((s, v, i) => s + Math.abs(v - b[i]), 0)
const feats = (M) => ({
  ease: [M.ease(0.25), M.ease(0.5), M.ease(0.75)],
  settle: [M.settle(0.3), M.settle(0.5), M.settle(0.7), M.settle(0.85)],   // muestrea el overshoot
  stagger: M.stagger, enterDur: M.enterDur, life: M.life != null ? M.life : 0.6,
  dx: M.enter.dx, dy: M.enter.dy, scale: M.enter.scale, rotate: M.enter.rotate,
})
const DIMS = [
  ['ease', (a, b) => sumAbs(a.ease, b.ease) > 0.05],
  ['settle', (a, b) => sumAbs(a.settle, b.settle) > 0.08],
  ['stagger', (a, b) => Math.abs(a.stagger - b.stagger) > 0.025],
  ['enterDur', (a, b) => Math.abs(a.enterDur - b.enterDur) > 0.05],
  ['dy', (a, b) => Math.abs(a.dy - b.dy) > 5],
  ['dx', (a, b) => Math.abs(a.dx - b.dx) > 8],
  ['scale', (a, b) => Math.abs(a.scale - b.scale) > 0.012],
  ['rotate', (a, b) => Math.abs(a.rotate - b.rotate) > 0.01],
  ['life', (a, b) => Math.abs(a.life - b.life) > 0.1],
]
const MIN_DIMS = 3
const F = mods.map(m => ({ id: m.id, f: feats(m.make()) }))
for (let i = 0; i < F.length; i++) for (let j = i + 1; j < F.length; j++) {
  const diff = DIMS.filter(([, fn]) => fn(F[i].f, F[j].f)).map(([n]) => n)
  if (diff.length < MIN_DIMS) fails.push(`${F[i].id} ~= ${F[j].id}: casi-clon (solo difieren en ${diff.length} eje(s): [${diff.join(',')}])`)
}

if (fails.length) {
  console.log('\nFALLOS (' + fails.length + '):')
  for (const f of fails) console.log('  - ' + f)
  process.exit(1)
}
console.log('GATE MOTION OK: ' + mods.length + ' personalidades, contrato valido (ease/smooth monotonicos, settle acotado en bordes, determinista).')
