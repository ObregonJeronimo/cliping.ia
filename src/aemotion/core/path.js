// aemotion 0.1 · PATH — el modelo de paths que a los otros motores les falta. Los paths son DATOS
// (lista de comandos absolutos M/L/C/Q/Z), el dibujo es tracePath(ctx, cmds) — cero DOM, cero Path2D,
// identico en browser y @napi-rs/canvas. Sobre eso: flatten adaptativo (de Casteljau), tabla de
// longitudes (measure), punto+angulo a distancia s (pointAt -> follow-path), trim (sub-tramos) y
// resampleo uniforme (base del wiggle). Todo puro y determinista.
import { clamp, TAU } from './util.js'

// ---------- parseo SVG minimo (M L H V C S Q T Z + minusculas relativas) ----------
const TOKEN = /[MmLlHhVvCcSsQqTtZz]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g

export function parsePath(d) {
  const toks = String(d).match(TOKEN) || []
  const out = []
  let i = 0, cmd = '', x = 0, y = 0, sx = 0, sy = 0, pcx = null, pcy = null, plast = ''
  const num = () => +toks[i++]
  while (i < toks.length) {
    const tk = toks[i]
    if (/[a-zA-Z]/.test(tk)) { cmd = tk; i++ } // letra explicita; sino repite el comando anterior
    const rel = cmd === cmd.toLowerCase() && cmd !== 'Z' && cmd !== 'z'
    const C = cmd.toUpperCase()
    if (C === 'M') {
      const nx = num() + (rel ? x : 0), ny = num() + (rel ? y : 0)
      out.push({ c: 'M', x: nx, y: ny }); x = nx; y = ny; sx = nx; sy = ny
      cmd = rel ? 'l' : 'L'                                   // M con pares extra continua como lineTo
    } else if (C === 'L') {
      const nx = num() + (rel ? x : 0), ny = num() + (rel ? y : 0)
      out.push({ c: 'L', x: nx, y: ny }); x = nx; y = ny
    } else if (C === 'H') {
      const nx = num() + (rel ? x : 0)
      out.push({ c: 'L', x: nx, y }); x = nx
    } else if (C === 'V') {
      const ny = num() + (rel ? y : 0)
      out.push({ c: 'L', x, y: ny }); y = ny
    } else if (C === 'C' || C === 'S') {
      let x1, y1
      if (C === 'C') { x1 = num() + (rel ? x : 0); y1 = num() + (rel ? y : 0) }
      else { const refl = (plast === 'C' || plast === 'S') && pcx != null; x1 = refl ? 2 * x - pcx : x; y1 = refl ? 2 * y - pcy : y }
      const x2 = num() + (rel ? x : 0), y2 = num() + (rel ? y : 0)
      const nx = num() + (rel ? x : 0), ny = num() + (rel ? y : 0)
      out.push({ c: 'C', x1, y1, x2, y2, x: nx, y: ny })
      pcx = x2; pcy = y2; x = nx; y = ny
    } else if (C === 'Q' || C === 'T') {
      let x1, y1
      if (C === 'Q') { x1 = num() + (rel ? x : 0); y1 = num() + (rel ? y : 0) }
      else { const refl = (plast === 'Q' || plast === 'T') && pcx != null; x1 = refl ? 2 * x - pcx : x; y1 = refl ? 2 * y - pcy : y }
      const nx = num() + (rel ? x : 0), ny = num() + (rel ? y : 0)
      out.push({ c: 'Q', x1, y1, x: nx, y: ny })
      pcx = x1; pcy = y1; x = nx; y = ny
    } else if (C === 'Z') {
      out.push({ c: 'Z' }); x = sx; y = sy
    } else { i++ } // token inesperado: saltear
    plast = C
    if (C !== 'C' && C !== 'S' && C !== 'Q' && C !== 'T') { pcx = null; pcy = null }
  }
  return out
}

// ---------- builders de primitivas (todas devuelven cmds) ----------
const K = 0.5522847498307933 // kappa: cubica ~ cuarto de circulo

export function circlePath(cx, cy, r) {
  const k = K * r
  return [
    { c: 'M', x: cx + r, y: cy },
    { c: 'C', x1: cx + r, y1: cy + k, x2: cx + k, y2: cy + r, x: cx, y: cy + r },
    { c: 'C', x1: cx - k, y1: cy + r, x2: cx - r, y2: cy + k, x: cx - r, y: cy },
    { c: 'C', x1: cx - r, y1: cy - k, x2: cx - k, y2: cy - r, x: cx, y: cy - r },
    { c: 'C', x1: cx + k, y1: cy - r, x2: cx + r, y2: cy - k, x: cx + r, y: cy },
    { c: 'Z' },
  ]
}

export function rectPath(x, y, w, h, r = 0) {
  r = clamp(r, 0, Math.min(w, h) / 2)
  if (r <= 0) return [{ c: 'M', x, y }, { c: 'L', x: x + w, y }, { c: 'L', x: x + w, y: y + h }, { c: 'L', x, y: y + h }, { c: 'Z' }]
  const k = K * r
  return [
    { c: 'M', x: x + r, y },
    { c: 'L', x: x + w - r, y },
    { c: 'C', x1: x + w - r + k, y1: y, x2: x + w, y2: y + r - k, x: x + w, y: y + r },
    { c: 'L', x: x + w, y: y + h - r },
    { c: 'C', x1: x + w, y1: y + h - r + k, x2: x + w - r + k, y2: y + h, x: x + w - r, y: y + h },
    { c: 'L', x: x + r, y: y + h },
    { c: 'C', x1: x + r - k, y1: y + h, x2: x, y2: y + h - r + k, x, y: y + h - r },
    { c: 'L', x, y: y + r },
    { c: 'C', x1: x, y1: y + r - k, x2: x + r - k, y2: y, x: x + r, y },
    { c: 'Z' },
  ]
}

export function polygonPath(cx, cy, r, n, rot = -Math.PI / 2) {
  const out = []
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * TAU
    out.push({ c: i ? 'L' : 'M', x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r })
  }
  out.push({ c: 'Z' })
  return out
}

export function starPath(cx, cy, rOut, rIn, n = 5, rot = -Math.PI / 2) {
  const out = []
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i / (n * 2)) * TAU, r = i % 2 ? rIn : rOut
    out.push({ c: i ? 'L' : 'M', x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r })
  }
  out.push({ c: 'Z' })
  return out
}

export const linePath = (x0, y0, x1, y1) => [{ c: 'M', x: x0, y: y0 }, { c: 'L', x: x1, y: y1 }]

// polilinea -> cmds (para dibujar resultados de wiggle/trim como paths otra vez)
export function fromPoints(pts, closed = false) {
  const out = pts.map((p, i) => ({ c: i ? 'L' : 'M', x: p.x, y: p.y }))
  if (closed) out.push({ c: 'Z' })
  return out
}

// ---------- trazado directo al ctx (browser y napi identicos: solo la API estandar) ----------
export function tracePath(ctx, cmds) {
  ctx.beginPath()
  for (const s of cmds) {
    if (s.c === 'M') ctx.moveTo(s.x, s.y)
    else if (s.c === 'L') ctx.lineTo(s.x, s.y)
    else if (s.c === 'C') ctx.bezierCurveTo(s.x1, s.y1, s.x2, s.y2, s.x, s.y)
    else if (s.c === 'Q') ctx.quadraticCurveTo(s.x1, s.y1, s.x, s.y)
    else if (s.c === 'Z') ctx.closePath()
  }
}

export function tracePolys(ctx, polys) {
  ctx.beginPath()
  for (const sub of polys) {
    const pts = sub.pts
    if (!pts.length) continue
    ctx.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
    if (sub.closed) ctx.closePath()
  }
}

// trazado SUAVE de polilineas cerradas: curvas cuadraticas por los puntos medios (look liquido del
// wiggle — los vertices desplazados quedan como controles, la curva pasa por los midpoints)
export function traceSmoothClosed(ctx, polys) {
  ctx.beginPath()
  for (const sub of polys) {
    let pts = sub.pts
    if (pts.length < 3) { if (pts.length) { ctx.moveTo(pts[0].x, pts[0].y); for (const p of pts) ctx.lineTo(p.x, p.y) } continue }
    // si viene con el punto final duplicado (cerrado), sacarlo para el recorrido circular
    const n0 = pts.length
    if (Math.hypot(pts[0].x - pts[n0 - 1].x, pts[0].y - pts[n0 - 1].y) < 1e-9) pts = pts.slice(0, n0 - 1)
    const n = pts.length
    const mid = i => ({ x: (pts[i % n].x + pts[(i + 1) % n].x) / 2, y: (pts[i % n].y + pts[(i + 1) % n].y) / 2 })
    const m0 = mid(0)
    ctx.moveTo(m0.x, m0.y)
    for (let i = 1; i <= n; i++) {
      const p = pts[i % n], m = mid(i)
      ctx.quadraticCurveTo(p.x, p.y, m.x, m.y)
    }
    ctx.closePath()
  }
}

// ---------- flatten adaptativo (de Casteljau, tolerancia en px) ----------
function flatCubic(x0, y0, x1, y1, x2, y2, x3, y3, tol, out, depth) {
  const dx = x3 - x0, dy = y3 - y0
  const dd = dx * dx + dy * dy
  const d1 = Math.abs((x1 - x0) * dy - (y1 - y0) * dx)
  const d2 = Math.abs((x2 - x0) * dy - (y2 - y0) * dx)
  const flatEnough = dd > 1e-12
    ? (d1 + d2) * (d1 + d2) <= tol * tol * dd
    : (Math.hypot(x1 - x0, y1 - y0) + Math.hypot(x2 - x0, y2 - y0)) <= tol
  if (depth >= 18 || flatEnough) { out.push({ x: x3, y: y3 }); return }
  // split en 0.5
  const ax = (x0 + x1) / 2, ay = (y0 + y1) / 2, bx = (x1 + x2) / 2, by = (y1 + y2) / 2, cx = (x2 + x3) / 2, cy = (y2 + y3) / 2
  const abx = (ax + bx) / 2, aby = (ay + by) / 2, bcx = (bx + cx) / 2, bcy = (by + cy) / 2
  const mx = (abx + bcx) / 2, my = (aby + bcy) / 2
  flatCubic(x0, y0, ax, ay, abx, aby, mx, my, tol, out, depth + 1)
  flatCubic(mx, my, bcx, bcy, cx, cy, x3, y3, tol, out, depth + 1)
}

// flatten de cmds -> subpaths de polilineas [{pts:[{x,y}...], closed}]
export function flatten(cmds, tol = 0.25) {
  const subs = []
  let cur = null, x = 0, y = 0, sx = 0, sy = 0
  const push = p => { if (cur) cur.pts.push(p) }
  for (const s of cmds) {
    if (s.c === 'M') {
      cur = { pts: [{ x: s.x, y: s.y }], closed: false }; subs.push(cur)
      x = s.x; y = s.y; sx = s.x; sy = s.y
    } else if (s.c === 'L') {
      push({ x: s.x, y: s.y }); x = s.x; y = s.y
    } else if (s.c === 'C') {
      flatCubic(x, y, s.x1, s.y1, s.x2, s.y2, s.x, s.y, tol, cur ? cur.pts : [], 0); x = s.x; y = s.y
    } else if (s.c === 'Q') {
      // elevar Q a C: C1 = P0 + 2/3(Q1-P0), C2 = P2 + 2/3(Q1-P2)
      const c1x = x + (2 / 3) * (s.x1 - x), c1y = y + (2 / 3) * (s.y1 - y)
      const c2x = s.x + (2 / 3) * (s.x1 - s.x), c2y = s.y + (2 / 3) * (s.y1 - s.y)
      flatCubic(x, y, c1x, c1y, c2x, c2y, s.x, s.y, tol, cur ? cur.pts : [], 0); x = s.x; y = s.y
    } else if (s.c === 'Z') {
      if (cur) {
        const p0 = cur.pts[0]
        if (Math.hypot(x - p0.x, y - p0.y) > 1e-9) cur.pts.push({ x: p0.x, y: p0.y })
        cur.closed = true
      }
      x = sx; y = sy
    }
  }
  return subs.filter(sub => sub.pts.length > 1)
}

// ---------- measure: tabla de longitudes acumuladas ----------
// devuelve { subs:[{pts, cum, len, closed, off}], length } — cum[i] = distancia hasta pts[i];
// off = distancia total al arranque del subpath (los saltos M no suman longitud).
export function measure(cmds, tol = 0.25) {
  const subs = flatten(cmds, tol)
  let total = 0
  for (const sub of subs) {
    const cum = new Float64Array(sub.pts.length)
    let acc = 0
    for (let i = 1; i < sub.pts.length; i++) {
      acc += Math.hypot(sub.pts[i].x - sub.pts[i - 1].x, sub.pts[i].y - sub.pts[i - 1].y)
      cum[i] = acc
    }
    sub.cum = cum; sub.len = acc; sub.off = total
    total += acc
  }
  return { subs, length: total }
}

// punto + angulo tangente a distancia s del arranque (s en px sobre la longitud total) — follow-path
export function pointAt(m, s) {
  s = clamp(s, 0, m.length)
  for (const sub of m.subs) {
    if (s > sub.off + sub.len + 1e-9) continue
    const ls = clamp(s - sub.off, 0, sub.len)
    const { pts, cum } = sub
    let lo = 0, hi = pts.length - 1                       // busqueda binaria en cum
    while (lo < hi - 1) { const mid = (lo + hi) >> 1; if (cum[mid] <= ls) lo = mid; else hi = mid }
    const segLen = cum[hi] - cum[lo] || 1
    const f = (ls - cum[lo]) / segLen
    const a = pts[lo], b = pts[hi]
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, angle: Math.atan2(b.y - a.y, b.x - a.x) }
  }
  const last = m.subs[m.subs.length - 1]
  const p = last.pts[last.pts.length - 1], q = last.pts[last.pts.length - 2] || p
  return { x: p.x, y: p.y, angle: Math.atan2(p.y - q.y, p.x - q.x) }
}

// sub-tramos entre distancias absolutas [a,b] (px) -> polilineas abiertas (para trim/estelas)
export function trimmed(m, a, b) {
  a = clamp(a, 0, m.length); b = clamp(b, 0, m.length)
  if (b - a < 1e-9) return []
  const out = []
  for (const sub of m.subs) {
    const s0 = Math.max(a, sub.off), s1 = Math.min(b, sub.off + sub.len)
    if (s1 - s0 < 1e-9) continue
    const pts = []
    const P = ls => { // punto local a distancia ls dentro del subpath
      const { pts: pp, cum } = sub
      let lo = 0, hi = pp.length - 1
      while (lo < hi - 1) { const mid = (lo + hi) >> 1; if (cum[mid] <= ls) lo = mid; else hi = mid }
      const segLen = cum[hi] - cum[lo] || 1, f = (ls - cum[lo]) / segLen
      return { x: pp[lo].x + (pp[hi].x - pp[lo].x) * f, y: pp[lo].y + (pp[hi].y - pp[lo].y) * f, i: hi }
    }
    const pa = P(s0 - sub.off), pb = P(s1 - sub.off)
    pts.push({ x: pa.x, y: pa.y })
    for (let i = pa.i; i < pb.i; i++) pts.push(sub.pts[i])
    pts.push({ x: pb.x, y: pb.y })
    out.push({ pts, closed: false })
  }
  return out
}

// resampleo uniforme cada ~step px (base del wiggle: vertices parejos para desplazar)
export function resample(m, step = 8) {
  const out = []
  for (const sub of m.subs) {
    if (sub.len < 1e-9) continue
    const n = Math.max(3, Math.round(sub.len / step))
    const pts = []
    const count = sub.closed ? n : n + 1                  // cerrado: el punto final es el inicial
    for (let i = 0; i < count; i++) {
      const ls = (i / n) * sub.len
      const { pts: pp, cum } = sub
      let lo = 0, hi = pp.length - 1
      while (lo < hi - 1) { const mid = (lo + hi) >> 1; if (cum[mid] <= ls) lo = mid; else hi = mid }
      const segLen = cum[hi] - cum[lo] || 1, f = clamp((ls - cum[lo]) / segLen, 0, 1)
      pts.push({ x: pp[lo].x + (pp[hi].x - pp[lo].x) * f, y: pp[lo].y + (pp[hi].y - pp[lo].y) * f })
    }
    out.push({ pts, closed: sub.closed })
  }
  return out
}
