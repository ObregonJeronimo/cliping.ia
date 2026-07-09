// aemotion 0.1 · MORPH — morphing de formas con correspondencia de puntos (el algoritmo de flubber,
// reimplementado chico y sin dependencias): (1) resamplear ambos contornos a N vertices uniformes por
// perimetro, (2) igualar el sentido de giro (area con signo), (3) rotar el anillo destino al offset
// que minimiza la suma de distancias² (los puntos viajan lo menos posible), (4) interpolar lineal.
// pathMorph devuelve un INTERPOLADOR PURO f(t)->cmds: mismo t, mismo resultado, seek gratis.
// Limite documentado (igual que flubber): compound paths no — se usa el subpath MAS LARGO de cada uno.
import { clamp, lerp } from './util.js'
import { measure, fromPoints } from './path.js'

// anillo de n vertices uniformes por perimetro del subpath mas largo (cerrado, sin punto duplicado)
export function ringOf(cmds, n = 96) {
  const m = measure(cmds)
  if (!m.subs.length) return []
  let sub = m.subs[0]
  for (const s of m.subs) if (s.len > sub.len) sub = s
  const pts = new Array(n)
  for (let i = 0; i < n; i++) {
    const ls = (i / n) * sub.len
    const { pts: pp, cum } = sub
    let lo = 0, hi = pp.length - 1
    while (lo < hi - 1) { const mid = (lo + hi) >> 1; if (cum[mid] <= ls) lo = mid; else hi = mid }
    const segLen = cum[hi] - cum[lo] || 1, f = clamp((ls - cum[lo]) / segLen, 0, 1)
    pts[i] = { x: pp[lo].x + (pp[hi].x - pp[lo].x) * f, y: pp[lo].y + (pp[hi].y - pp[lo].y) * f }
  }
  return pts
}

const signedArea = pts => {
  let a = 0
  for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p.x * q.y - q.x * p.y }
  return a / 2
}

// rotar el anillo B al offset que minimiza sum(|A_i - B_(i+k)|²) — fuerza bruta O(n²), n<=~200
function bestOffset(A, B) {
  const n = A.length
  let best = 0, bestD = Infinity
  for (let k = 0; k < n; k++) {
    let d = 0
    for (let i = 0; i < n; i++) {
      const a = A[i], b = B[(i + k) % n]
      const dx = a.x - b.x, dy = a.y - b.y
      d += dx * dx + dy * dy
      if (d >= bestD) break
    }
    if (d < bestD) { bestD = d; best = k }
  }
  return best
}

// interpolador de morph: f(t)->cmds (t 0..1; fuera de rango clampeado). opts.n = vertices (suavidad).
export function pathMorph(cmdsA, cmdsB, opts = {}) {
  const n = Math.max(24, Math.min(240, opts.n || 120))
  const A = ringOf(cmdsA, n)
  let B = ringOf(cmdsB, n)
  if (!A.length || !B.length) return () => (A.length ? fromPoints(A, true) : fromPoints(B, true))
  if (signedArea(A) * signedArea(B) < 0) B = B.slice().reverse()      // mismo sentido de giro
  const k = bestOffset(A, B)
  const Bal = A.map((_, i) => B[(i + k) % n])                          // B alineado a A
  return t => {
    const u = clamp(t, 0, 1)
    if (u <= 0) return fromPoints(A, true)
    if (u >= 1) return fromPoints(Bal, true)
    const pts = A.map((a, i) => ({ x: lerp(a.x, Bal[i].x, u), y: lerp(a.y, Bal[i].y, u) }))
    return fromPoints(pts, true)
  }
}
