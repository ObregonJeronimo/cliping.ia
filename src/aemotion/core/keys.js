// aemotion 0.1 · KEYS — keyframes con speed graph estilo After Effects, evaluados en forma cerrada.
// key = { t, v, out:{speed,influence}, in:{speed,influence}, interp:'bezier'|'linear'|'hold' }
//  · speed en unidades/segundo (la pendiente del valor), CON signo — igual que el dialogo
//    Keyframe Velocity de AE. Easy Ease = speed 0 + influence 33.33 (exacto, doc oficial de Adobe).
//  · influence en % [0.1..100] del tramo hacia el vecino (cuanto "alcanza" el handle temporal).
// Conversion a bezier en el espacio (tiempo, valor) para el tramo k1->k2 con dt=t2-t1:
//   P1 = (t1 + dt·i1/100 , v1 + s1·dt·i1/100)   ·   P2 = (t2 - dt·i2/100 , v2 - s2·dt·i2/100)
// El eje tiempo es monotono (influences <= 100) -> se resuelve u(x) con Newton y se evalua el valor.
// track(keys) devuelve un EVALUADOR PURO f(t) -> valor (numero o array): mismo t, mismo valor, seek gratis.
import { clamp, lerp } from './util.js'
import { xSolver, cubicVal, EASY } from './ease.js'

const normEase = e => ({ speed: e && Number.isFinite(e.speed) ? e.speed : EASY.speed, influence: clamp((e && e.influence) || EASY.influence, 0.1, 100) })

export function track(keys) {
  if (!Array.isArray(keys) || !keys.length) throw new Error('track: sin keys')
  const ks = keys.map(k => ({ t: +k.t, v: k.v, interp: k.interp || 'bezier', out: normEase(k.out), in: normEase(k.in) }))
    .sort((a, b) => a.t - b.t)
  const isVec = Array.isArray(ks[0].v)
  const dims = isVec ? ks[0].v.length : 1

  // precomputo por segmento: solver del eje tiempo + puntos de control del eje valor (por dimension)
  const segs = []
  for (let i = 0; i < ks.length - 1; i++) {
    const k1 = ks[i], k2 = ks[i + 1], dt = Math.max(1e-9, k2.t - k1.t)
    if (k1.interp === 'hold') { segs.push({ hold: true }); continue }
    if (k1.interp === 'linear') { segs.push({ linear: true, dt }); continue }
    const f1 = k1.out.influence / 100, f2 = k2.in.influence / 100
    const solver = xSolver(f1, 1 - f2)
    const c1 = [], c2 = []
    for (let d = 0; d < dims; d++) {
      const v1 = isVec ? k1.v[d] : k1.v, v2 = isVec ? k2.v[d] : k2.v
      c1.push(v1 + k1.out.speed * f1 * dt)
      c2.push(v2 - k2.in.speed * f2 * dt)
    }
    segs.push({ solver, c1, c2, dt })
  }

  const evalSeg = (i, t) => {
    const k1 = ks[i], k2 = ks[i + 1], s = segs[i]
    if (s.hold) return k1.v
    const x = clamp((t - k1.t) / s.dt, 0, 1)
    if (s.linear) {
      if (!isVec) return lerp(k1.v, k2.v, x)
      return k1.v.map((v, d) => lerp(v, k2.v[d], x))
    }
    const u = s.solver(x)
    if (!isVec) return cubicVal(u, k1.v, s.c1[0], s.c2[0], k2.v)
    return k1.v.map((v, d) => cubicVal(u, v, s.c1[d], s.c2[d], k2.v[d]))
  }

  const f = t => {
    if (ks.length === 1 || t <= ks[0].t) return ks[0].v
    if (t >= ks[ks.length - 1].t) return ks[ks.length - 1].v
    let i = 0
    while (i < ks.length - 2 && t >= ks[i + 1].t) i++
    return evalSeg(i, t)
  }
  f.keys = ks
  f.start = ks[0].t
  f.end = ks[ks.length - 1].t
  return f
}

// resolver un parametro animable: numero/array fijo, track/funcion (t)=>v — la moneda comun de shapes
export const val = (p, t) => (typeof p === 'function' ? p(t) : p)

// velocidad de cualquier evaluador puro por diferencia central (determinista: f es pura, dt fijo).
// Para springs usar la derivada analitica de motion.js (mas barata y exacta).
export function velOf(fn, t, dt = 1 / 120) {
  const a = fn(t - dt), b = fn(t + dt)
  if (Array.isArray(a)) return a.map((v, d) => (b[d] - v) / (2 * dt))
  return (b - a) / (2 * dt)
}
