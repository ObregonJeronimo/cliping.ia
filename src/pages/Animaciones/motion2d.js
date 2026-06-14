// motion2d.js — libreria de MOTION PREMIUM nativa para el motor Canvas (POC 2).
//
// Entrega el VALOR de la avenida "GSAP" (easings premium, motion-path, morph entre formas
// arbitrarias, stagger) PERO sin la dependencia: todo es JS puro y DETERMINISTA -> se renderiza igual
// en el preview y en el MP4 de Remotion (frame a frame, sin reloj propio ni DOM), y lo puedo
// rasterizar/ver offline. Es el mismo principio que engineCore: funciones puras de (t, params).
//
// Por que nativo y no gsap: gsap esta orientado a DOM/SVG y partiria el render en dos pipelines
// (rompiendo el single-source-of-truth de engineCore y mi capacidad de ver los frames). Estas
// primitivas cubren lo que mas suma (easings ricos + paths + morph libre) y quedan dentro del Canvas.

export const TAU = Math.PI * 2
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
export const lerp = (a, b, t) => a + (b - a) * t

// ---------- EASINGS premium (t en [0,1] -> [0,1]; algunos con overshoot) ----------
const c1 = 1.70158, c2 = c1 * 1.525, c3 = c1 + 1, c4 = (2 * Math.PI) / 3, c5 = (2 * Math.PI) / 4.5
function bounceOut(t) {
  const n = 7.5625, d = 2.75
  if (t < 1 / d) return n * t * t
  if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75
  if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375
  return n * (t -= 2.625 / d) * t + 0.984375
}
export const EASES = {
  linear: t => t,
  inQuad: t => t * t,
  outQuad: t => 1 - (1 - t) * (1 - t),
  inOutQuad: t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  inCubic: t => t ** 3,
  outCubic: t => 1 - Math.pow(1 - t, 3),
  inOutCubic: t => t < 0.5 ? 4 * t ** 3 : 1 - Math.pow(-2 * t + 2, 3) / 2,
  inQuart: t => t ** 4,
  outQuart: t => 1 - Math.pow(1 - t, 4),
  inOutQuart: t => t < 0.5 ? 8 * t ** 4 : 1 - Math.pow(-2 * t + 2, 4) / 2,
  outQuint: t => 1 - Math.pow(1 - t, 5),
  inOutQuint: t => t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2,
  inExpo: t => t === 0 ? 0 : Math.pow(2, 10 * t - 10),
  outExpo: t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  inOutExpo: t => t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
  outSine: t => Math.sin((t * Math.PI) / 2),
  inOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
  outCirc: t => Math.sqrt(1 - Math.pow(t - 1, 2)),
  inBack: t => c3 * t ** 3 - c1 * t * t,
  outBack: t => 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2),
  inOutBack: t => t < 0.5
    ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
    : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2,
  outElastic: t => t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1,
  inOutElastic: t => t === 0 ? 0 : t === 1 ? 1 : t < 0.5
    ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2
    : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1,
  outBounce: bounceOut,
}
export function ease(name, t) {
  const f = EASES[name] || EASES.outCubic
  return f(clamp(t, 0, 1))
}

// ---------- STAGGER: arranque escalonado de N elementos ----------
// Devuelve el progreso local [0,1] del elemento i dado el progreso global, cuanto tarda cada uno
// (span) y el solape (overlap 0..1). amount=tiempo total de la cascada.
export function staggerProgress(i, n, globalT, { each = 0.08, dur = 0.5, from = 'start' } = {}) {
  let order = i
  if (from === 'end') order = n - 1 - i
  else if (from === 'center') order = Math.abs(i - (n - 1) / 2)
  const start = order * each
  return clamp((globalT - start) / dur, 0, 1)
}

// ---------- MOTION PATH: spline Catmull-Rom + muestreo por longitud de arco ----------
// points: [[x,y],...]. Construye una curva suave y permite samplear a velocidad CONSTANTE.
function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t
  const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3)
  return [f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]
}
export function buildPath(points, samplesPerSeg = 40) {
  const P = [points[0], ...points, points[points.length - 1]]
  const pts = []
  for (let i = 0; i < P.length - 3; i++) {
    for (let s = 0; s < samplesPerSeg; s++) pts.push(catmull(P[i], P[i + 1], P[i + 2], P[i + 3], s / samplesPerSeg))
  }
  pts.push(points[points.length - 1])
  const cum = [0]; let len = 0
  for (let i = 1; i < pts.length; i++) { len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); cum.push(len) }
  return { pts, cum, len: len || 1 }
}
export function samplePath(path, prog) {
  const target = clamp(prog, 0, 1) * path.len
  let i = 1
  while (i < path.cum.length - 1 && path.cum[i] < target) i++
  const a = path.pts[i - 1], b = path.pts[i]
  const seg = (path.cum[i] - path.cum[i - 1]) || 1
  const f = (target - path.cum[i - 1]) / seg
  return { x: lerp(a[0], b[0], f), y: lerp(a[1], b[1], f), angle: Math.atan2(b[1] - a[1], b[0] - a[0]) }
}

// ---------- MORPH entre formas ARBITRARIAS (supera las 15 formas fijas del motor) ----------
// Representamos cada forma como radio en funcion del angulo (N slots), asi el morph entre CUALQUIER
// par no se tuerce (slot i de una mapea al slot i de la otra) y es un simple lerp de radios.
export const MORPH_N = 96
function regularPoly(a, sides) {
  const seg = TAU / sides
  const m = ((a % seg) + seg) % seg
  return Math.cos(Math.PI / sides) / Math.cos(m - seg / 2)
}
function rOf(name, a) {
  switch (name) {
    case 'circle': return 1
    case 'square': return 1 / Math.max(Math.abs(Math.cos(a)), Math.abs(Math.sin(a)))
    case 'triangle': return regularPoly(a - Math.PI / 2, 3)
    case 'pentagon': return regularPoly(a - Math.PI / 2, 5)
    case 'hexagon': return regularPoly(a, 6)
    case 'star': { const k = Math.cos(Math.PI / 5) / Math.cos(((a * 5) % TAU + TAU) % (TAU / 5) - TAU / 10); return 0.5 + 0.5 * (((Math.floor(a / (Math.PI / 5))) % 2 === 0) ? regularPoly(a, 5) : 0.45) }
    case 'star5': { const p = ((a * 5 / TAU) % 1); const tip = Math.abs(p - 0.5) * 2; return lerp(0.46, 1, tip) }
    case 'flower': return 0.62 + 0.38 * Math.abs(Math.cos(a * 3))
    case 'heart': { const tt = a; const x = 16 * Math.pow(Math.sin(tt), 3); const y = 13 * Math.cos(tt) - 5 * Math.cos(2 * tt) - 2 * Math.cos(3 * tt) - Math.cos(4 * tt); return Math.hypot(x, y) / 17 }
    case 'drop': return 0.7 + 0.5 * Math.cos(a - Math.PI / 2) * (Math.cos(a - Math.PI / 2) > 0 ? 1 : 0.2)
    case 'blob': return 0.78 + 0.12 * Math.sin(a * 3 + 0.6) + 0.08 * Math.sin(a * 5 - 1.1)
    case 'gear': return 0.82 + 0.18 * Math.sign(Math.cos(a * 8))
    default: return 1
  }
}
export function shapeRadii(name) {
  const out = new Array(MORPH_N)
  for (let i = 0; i < MORPH_N; i++) out[i] = rOf(name, (i / MORPH_N) * TAU)
  return out
}
export function morphRadii(ra, rb, prog) {
  const out = new Array(MORPH_N)
  for (let i = 0; i < MORPH_N; i++) out[i] = lerp(ra[i], rb[i], prog)
  return out
}
// dibuja una forma (radios normalizados) centrada en (cx,cy) a escala r, con rotacion rot (rad).
export function radiiToPoints(radii, cx, cy, r, rot = 0) {
  const pts = new Array(radii.length)
  for (let i = 0; i < radii.length; i++) {
    const a = (i / radii.length) * TAU + rot
    pts[i] = [cx + Math.cos(a) * radii[i] * r, cy + Math.sin(a) * radii[i] * r]
  }
  return pts
}
export function tracePolygon(ctx, pts) {
  ctx.beginPath()
  ctx.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1])
  ctx.closePath()
}
