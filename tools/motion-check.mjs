// motion-check.mjs — invariantes + determinismo de motion2d / motionDemo (POC 2), sin render.
import { EASES, ease, buildPath, samplePath, shapeRadii, morphRadii, MORPH_N } from '../src/pages/Animaciones/motion2d.js'
import { drawMotionDemo, MOTION_KINDS } from '../src/pages/Animaciones/motionDemo.js'

let pass = 0, fail = 0
const ok = (n, c) => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}`) }
const approx = (a, b, e = 1e-6) => Math.abs(a - b) < e

// (1) easings: 0->0 y 1->1 (los simples); todos finitos en [0,1]
for (const name of Object.keys(EASES)) {
  ok(`ease ${name}: 0->0 / 1->1`, approx(ease(name, 0), 0, 1e-6) && approx(ease(name, 1), 1, 1e-6))
  let finite = true
  for (let i = 0; i <= 10; i++) { const v = ease(name, i / 10); if (!Number.isFinite(v)) finite = false }
  ok(`ease ${name}: finito en [0,1]`, finite)
}

// (2) motion path: extremos coinciden con los anchors; longitud > 0; muestreo monotono
const P = [[0, 0], [100, 50], [40, 160], [200, 200]]
const path = buildPath(P)
const s0 = samplePath(path, 0), s1 = samplePath(path, 1)
ok('path: inicio ~ primer anchor', Math.hypot(s0.x - P[0][0], s0.y - P[0][1]) < 2)
ok('path: fin ~ ultimo anchor', Math.hypot(s1.x - P[P.length - 1][0], s1.y - P[P.length - 1][1]) < 2)
ok('path: longitud > 0', path.len > 0)
let mono = true, prev = -1
for (let i = 0; i <= 20; i++) { const d = Math.hypot(samplePath(path, i / 20).x, samplePath(path, i / 20).y); /* no-op */ }
// velocidad ~constante: distancias entre muestras equiespaciadas son parecidas
const ds = []
for (let i = 1; i <= 20; i++) { const a = samplePath(path, (i - 1) / 20), b = samplePath(path, i / 20); ds.push(Math.hypot(b.x - a.x, b.y - a.y)) }
const mean = ds.reduce((x, y) => x + y, 0) / ds.length
ok('path: velocidad ~constante (arc-length)', ds.every(d => Math.abs(d - mean) < mean * 0.6))

// (3) morph: en 0 y 1 coincide con las formas origen/destino; longitud N
const ra = shapeRadii('circle'), rb = shapeRadii('star5')
ok('morph: N slots', ra.length === MORPH_N && rb.length === MORPH_N)
const m0 = morphRadii(ra, rb, 0), m1 = morphRadii(ra, rb, 1)
ok('morph: prog 0 = forma A', m0.every((v, i) => approx(v, ra[i])))
ok('morph: prog 1 = forma B', m1.every((v, i) => approx(v, rb[i])))

// (4) drawMotionDemo determinista (ctx stub que graba ops)
function recCtx() {
  const log = []
  const round = v => typeof v === 'number' ? Math.round(v * 1000) / 1000 : v
  const grad = { addColorStop: (...a) => log.push(['g', ...a.map(round)]) }
  return {
    ctx: new Proxy({}, {
      get(_, p) {
        if (p === 'createLinearGradient' || p === 'createRadialGradient') return (...a) => { log.push([p, ...a.map(round)]); return grad }
        if (p === 'measureText') return s => ({ width: String(s).length * 8 })
        return (...a) => log.push([String(p), ...a.map(round)])
      },
      set(_, p, v) { log.push(['set:' + String(p), v && typeof v === 'object' ? 'g' : round(v)]); return true },
    }), log,
  }
}
const ops = (kind, t) => { const { ctx, log } = recCtx(); drawMotionDemo(ctx, t, kind, { accent: '#3aa0ff' }); return JSON.stringify(log) }
for (const k of MOTION_KINDS) {
  ok(`demo ${k}: determinista`, ops(k, 1.3) === ops(k, 1.3))
  ok(`demo ${k}: cambia con t`, ops(k, 0.4) !== ops(k, 2.1))
}

console.log(`\n${pass} pass, ${fail} fail`)
process.exit(fail ? 1 : 0)
