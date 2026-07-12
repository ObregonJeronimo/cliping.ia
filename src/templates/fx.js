// templates · FX — catálogo de ANIMACIONES calibre AE (motion graphics), función PURA de ts,
// determinista (PRNG con semilla fija, sin Math.random/Date.now). Cada una se dibuja centrada en
// (x,y) con la paleta de la marca (tokens accent/accent2/ink/...). Nacieron del prototipo de
// "despegue gelatinoso" (metaball tangente) y se extendieron con 5 familias: líquidas, elásticas,
// partículas, revelado y cinéticas. Se muestran en la Biblioteca y luego se podrán usar como objetos
// del editor de templates (mismo contrato que objects.js: drawFX(ctx, id, ts, dur, {x,y,pal,params})).
import {
  circlePath, rectPath, starPath, polygonPath, linePath, tracePath,
  spring, cubicOut, expoOut, backOut, TAU, clamp, lerp, rgba, mulberry32,
} from '../aemotion/index.js'
import { resolveColor } from './palette.js'

const PI = Math.PI, HALF_PI = PI / 2
const sm = t => t * t * (3 - 2 * t)
const easeInCubic = t => t * t * t
const R = (c, p) => resolveColor(c, p)

// gradiente lineal accent->accent2 (o el que se pase) sobre un radio r centrado en (x,y)
function grad(ctx, x, y, r, pal, a = 'accent', b = 'accent2', ang = 55) {
  const t = ang * PI / 180, g = ctx.createLinearGradient(x - Math.cos(t) * r, y - Math.sin(t) * r, x + Math.cos(t) * r, y + Math.sin(t) * r)
  g.addColorStop(0, R(a, pal)); g.addColorStop(1, R(b, pal)); return g
}
function glow(ctx, color, blur, fn) { ctx.save(); ctx.shadowColor = color; ctx.shadowBlur = blur; fn(); ctx.restore() }
function dropPath(cx, cy, r) {
  return [
    { c: 'M', x: cx, y: cy - 1.5 * r },
    { c: 'C', x1: cx + 1.1 * r, y1: cy - 0.7 * r, x2: cx + r, y2: cy + 0.2 * r, x: cx + r * 0.72, y: cy + 0.7 * r },
    { c: 'C', x1: cx + 0.32 * r, y1: cy + 1.15 * r, x2: cx - 0.32 * r, y2: cy + 1.15 * r, x: cx - r * 0.72, y: cy + 0.7 * r },
    { c: 'C', x1: cx - r, y1: cy + 0.2 * r, x2: cx - 1.1 * r, y2: cy - 0.7 * r, x: cx, y: cy - 1.5 * r },
    { c: 'Z' },
  ]
}
// metaball tangente entre dos círculos -> traza en el path actual (unión gooey suave). false si se corta.
function metaball(ctx, r1, r2, c1, c2, handle = 2.6, v = 0.5) {
  const dx = c2[0] - c1[0], dy = c2[1] - c1[1], d = Math.hypot(dx, dy), maxD = r1 + r2 * 2.8
  if (r1 <= 0 || r2 <= 0 || d > maxD || d <= Math.abs(r2 - r1)) return false
  let u1, u2
  if (d < r1 + r2) { u1 = Math.acos((r1 * r1 + d * d - r2 * r2) / (2 * r1 * d)); u2 = Math.acos((r2 * r2 + d * d - r1 * r1) / (2 * r2 * d)) } else { u1 = 0; u2 = 0 }
  const ab = Math.atan2(dy, dx), mx = Math.acos((r1 - r2) / d)
  const a1 = ab + u1 + (mx - u1) * v, a2 = ab - u1 - (mx - u1) * v
  const a3 = ab + PI - u2 - (PI - u2 - mx) * v, a4 = ab - PI + u2 + (PI - u2 - mx) * v
  const P = (c, an, r) => [c[0] + r * Math.cos(an), c[1] + r * Math.sin(an)]
  const p1 = P(c1, a1, r1), p2 = P(c1, a2, r1), p3 = P(c2, a3, r2), p4 = P(c2, a4, r2)
  const tot = r1 + r2, d2 = Math.min(v * handle, Math.hypot(p1[0] - p3[0], p1[1] - p3[1]) / tot) * Math.min(1, d * 2 / (r1 + r2))
  const h1 = P(p1, a1 - HALF_PI, r1 * d2), h2 = P(p2, a2 + HALF_PI, r1 * d2), h3 = P(p3, a3 + HALF_PI, r2 * d2), h4 = P(p4, a4 - HALF_PI, r2 * d2)
  ctx.moveTo(p1[0], p1[1])
  ctx.bezierCurveTo(h1[0], h1[1], h3[0], h3[1], p3[0], p3[1]); ctx.arc(c2[0], c2[1], r2, a3, a4, true)
  ctx.bezierCurveTo(h4[0], h4[1], h2[0], h2[1], p2[0], p2[1]); ctx.arc(c1[0], c1[1], r1, a2, a1, true)
  return true
}
// blob orgánico (círculo perturbado con ruido determinista) -> path suave cerrado
function blobPath(x, y, r, ts, amp, seed = 0) {
  const N = 46, pts = []
  for (let i = 0; i < N; i++) { const a = (i / N) * TAU; const rr = r * (1 + amp * (Math.sin(3 * a + ts * 0.9 + seed) * 0.6 + Math.sin(5 * a - ts * 0.6 + seed) * 0.4)); pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]) }
  return pts
}
function tracePts(ctx, pts, close = true) { ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); if (close) ctx.closePath() }
// curva cerrada suave a través de N puntos (cada punto es control, los puntos medios son anclas)
function smoothClosed(ctx, pts) { const n = pts.length; ctx.moveTo((pts[0][0] + pts[n - 1][0]) / 2, (pts[0][1] + pts[n - 1][1]) / 2); for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2) } ctx.closePath() }

// nubes de partículas deterministas (se calculan UNA vez al importar)
function cloud(seed, n) { const rnd = mulberry32(seed); const a = []; for (let i = 0; i < n; i++) { let hx, hy; do { hx = rnd() * 2 - 1; hy = rnd() * 2 - 1 } while (hx * hx + hy * hy > 1); a.push({ hx, hy, a: rnd() * TAU, rr: rnd(), ph: rnd() * TAU, sz: 0.6 + rnd() * 0.8, k: rnd() }) } return a }
const CLOUD = cloud(9337, 240), SPARKS = cloud(4242, 60)
const hashN = (i) => { const s = Math.sin(i * 12.9898) * 43758.5453; return s - Math.floor(s) }
const MGLYPH = '01<>[]{}/|=+*#'

// ============================ ANIMACIONES ============================
// cada fn(ctx, ts, dur, x, y, pal, p) — ts en tiempo local (loop sobre dur). p = params.
const FN = {}

// ---- LÍQUIDAS ----
FN['despegue-gelatina'] = (ctx, ts, dur, x, y, pal, p) => {
  const R0 = p.size || 62, reach = R0 * 2.1, u = (ts % dur) / dur
  // out (0.1..0.5) · hold (.5..0.75) · retract (.75..1)
  let P
  if (u < 0.1) P = 0
  else if (u < 0.5) { const k = (u - 0.1) / 0.4; P = k < 0.8 ? 0.8 * Math.pow(k / 0.8, 1.4) : 0.8 + 0.2 * backOut((k - 0.8) / 0.2) }
  else if (u < 0.75) P = 1
  else P = 1 - easeInCubic((u - 0.75) / 0.25)
  const ax = x - reach * 0.5, bx = ax + P * reach, snap = P >= 0.8
  const uu = clamp((u - 0.1) / 0.4, 0, 1), wob = snap ? Math.exp(-4 * (uu - 0.9) * 4) * Math.cos(9 * (uu - 0.9) * 4) * (uu > 0.9 ? 1 : 0) : 0
  const rB = R0 * (0.5 + 0.5 * sm(clamp(P * 1.25, 0, 1))), rA = R0 * (0.9 - 0.8 * clamp(P / 0.8, 0, 1))
  const sx = 1 + wob * 0.22, sy = 1 - wob * 0.22, gd = grad(ctx, bx, y, rB, pal)
  glow(ctx, rgba(R('accent', pal), 0.6), R0 * 0.7, () => {
    ctx.fillStyle = gd
    if (P > 0.02 && P < 0.8) { ctx.beginPath(); ctx.arc(ax, y, rA, 0, TAU); ctx.fill(); ctx.beginPath(); if (metaball(ctx, rA, rB, [ax, y], [bx, y], 2.6, lerp(0.55, 0.2, clamp(P / 0.8, 0, 1)))) ctx.fill() }
    ctx.beginPath(); ctx.ellipse(bx, y, rB * sx, rB * sy, 0, 0, TAU); ctx.fill()
  })
}
FN['gota-cae'] = (ctx, ts, dur, x, y, pal, p) => {
  const R0 = p.size || 46, top = y - R0 * 2.2, u = (ts % dur) / dur
  const gd = grad(ctx, x, y, R0, pal)
  glow(ctx, rgba(R('accent', pal), 0.55), R0 * 0.6, () => {
    ctx.fillStyle = gd
    // fuente arriba
    ctx.beginPath(); ctx.arc(x, top, R0 * 0.7, 0, TAU); ctx.fill()
    if (u < 0.42) { // se estira y forma la gota colgando
      const s = sm(u / 0.42), cy = top + s * R0 * 1.3, rr = R0 * (0.35 + 0.35 * s)
      ctx.beginPath(); if (metaball(ctx, R0 * 0.7, rr, [x, top], [x, cy], 2.4, lerp(0.5, 0.15, s))) ctx.fill()
      ctx.beginPath(); ctx.ellipse(x, cy, rr, rr * (1 + 0.15 * s), 0, 0, TAU); ctx.fill()
    } else { // cae y aterriza con squash
      const k = (u - 0.42) / 0.58, fall = easeInCubic(clamp(k / 0.6, 0, 1)), cy = top + R0 * 1.9 + fall * (y - top - R0 * 1.9 + R0)
      const land = clamp((k - 0.55) / 0.2, 0, 1), sq = 1 + 0.5 * Math.sin(land * PI) * (k > 0.55 ? 1 : 0)
      const yy = Math.min(cy, y + R0 * 0.2)
      tracePath(ctx, dropPath(x, yy, R0 * 0.62)); ctx.save(); ctx.translate(x, yy); ctx.scale(sq, 1 / Math.sqrt(sq)); ctx.translate(-x, -yy); ctx.fill(); ctx.restore()
    }
  })
}
FN['blob-fusion'] = (ctx, ts, dur, x, y, pal, p) => {
  const R0 = p.size || 44, u = (ts % dur) / dur, phase = 0.5 - 0.5 * Math.cos(u * TAU)
  const gap = lerp(R0 * 2.4, R0 * 0.2, phase), x1 = x - gap / 2, x2 = x + gap / 2
  glow(ctx, rgba(R('accent', pal), 0.55), R0 * 0.6, () => {
    ctx.fillStyle = grad(ctx, x, y, R0 * 1.6, pal)
    ctx.beginPath(); ctx.arc(x1, y, R0 * 0.9, 0, TAU); ctx.fill()
    ctx.beginPath(); ctx.arc(x2, y, R0 * 0.9, 0, TAU); ctx.fill()
    ctx.beginPath(); if (metaball(ctx, R0 * 0.9, R0 * 0.9, [x1, y], [x2, y], 2.6, 0.5)) ctx.fill()
  })
}
FN['blob-respira'] = (ctx, ts, dur, x, y, pal, p) => {
  const R0 = p.size || 60, br = 1 + 0.05 * Math.sin(ts / dur * TAU * 2)
  glow(ctx, rgba(R('accent', pal), 0.5), R0 * 0.55, () => { ctx.fillStyle = grad(ctx, x, y, R0, pal); ctx.beginPath(); tracePts(ctx, blobPath(x, y, R0 * br, ts, 0.07)); ctx.fill() })
}
FN['metamorfosis'] = (ctx, ts, dur, x, y, pal, p) => {
  const R0 = p.size || 56, shapes = ['square', 'circle', 'star', 'drop'], u = (ts % dur) / dur, seg = u * shapes.length, i = Math.floor(seg) % shapes.length
  const path = shapeOf(shapes[i], x, y, R0), rot = ts * 0.5
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.translate(-x, -y)
  glow(ctx, rgba(R('accent', pal), 0.5), R0 * 0.5, () => { ctx.fillStyle = grad(ctx, x, y, R0, pal); tracePath(ctx, path); ctx.fill() })
  ctx.restore()
}
FN['mancha-tinta'] = (ctx, ts, dur, x, y, pal, p) => {
  const R0 = p.size || 58, u = (ts % dur) / dur, gr = u < 0.7 ? backOut(u / 0.7) : 1, fade = u > 0.85 ? 1 - (u - 0.85) / 0.15 : 1
  ctx.save(); ctx.globalAlpha = fade
  glow(ctx, rgba(R('accent', pal), 0.45), R0 * 0.5, () => {
    ctx.fillStyle = grad(ctx, x, y, R0, pal); ctx.beginPath(); tracePts(ctx, blobPath(x, y, R0 * gr, ts * 0.4, 0.16)); ctx.fill()
    for (let i = 0; i < 4; i++) { const a = i * TAU / 4 + 0.6, dd = R0 * (1.4 + 0.2 * i) * gr, rr = R0 * 0.13 * gr; ctx.beginPath(); ctx.arc(x + Math.cos(a) * dd, y + Math.sin(a) * dd, rr, 0, TAU); ctx.fill() }
  })
  ctx.restore()
}

// ---- ELÁSTICAS ----
FN['pop-elastico'] = (ctx, ts, dur, x, y, pal, p) => {
  const R0 = p.size || 58, u = (ts % dur) / dur, s = u < 0.75 ? spring(clamp(u / 0.55, 0, 1), 0.5, 12) : 1, fade = u > 0.85 ? 1 - (u - 0.85) / 0.15 : 1
  const sq = 1 + (1 - Math.min(1, s)) * 0.0
  ctx.save(); ctx.globalAlpha = clamp(u < 0.1 ? u / 0.1 : fade, 0, 1); ctx.translate(x, y); ctx.scale(s, s); ctx.translate(-x, -y)
  glow(ctx, rgba(R('accent', pal), 0.5), R0 * 0.5, () => { ctx.fillStyle = grad(ctx, x, y, R0, pal); tracePath(ctx, shapeOf(p.shape || 'circle', x, y, R0)); ctx.fill() })
  ctx.restore()
}
FN['rebote-squash'] = (ctx, ts, dur, x, y, pal, p) => {
  const R0 = p.size || 40, u = (ts % dur) / dur, floor = y + R0 * 2.2, top = y - R0 * 2.4
  const bt = u % 0.5 / 0.5, h = Math.abs(Math.sin(bt * PI)), cy = lerp(floor, top, h)
  const impact = clamp(1 - Math.abs(cy - floor) / (R0 * 0.8), 0, 1), sx = 1 + impact * 0.4, sy = 1 - impact * 0.35
  glow(ctx, rgba(R('accent', pal), 0.45), R0 * 0.5, () => { ctx.fillStyle = grad(ctx, x, cy, R0, pal); ctx.beginPath(); ctx.ellipse(x, Math.min(cy, floor), R0 * sx, R0 * sy, 0, 0, TAU); ctx.fill() })
  ctx.strokeStyle = rgba(R('ink', pal), 0.12); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - R0 * 1.6, floor + R0); ctx.lineTo(x + R0 * 1.6, floor + R0); ctx.stroke()
}
FN['gelatina-cubo'] = (ctx, ts, dur, x, y, pal, p) => {
  const R0 = p.size || 54, w = ts / dur * TAU * 2, c = R0 * 0.85
  const jelly = (px, py) => { const dx = (px - x) / R0, dy = (py - y) / R0; return [px + Math.sin(w + dy * 3.2) * R0 * 0.11, py + Math.cos(w + dx * 3.2) * R0 * 0.11] }
  const base = [[-c, -c], [0, -c * 1.04], [c, -c], [c * 1.04, 0], [c, c], [0, c * 1.04], [-c, c], [-c * 1.04, 0]]
  const pts = base.map(([a, b]) => jelly(x + a, y + b))
  glow(ctx, rgba(R('accent', pal), 0.5), R0 * 0.5, () => { ctx.fillStyle = grad(ctx, x, y, R0, pal); ctx.beginPath(); smoothClosed(ctx, pts); ctx.fill() })
}
FN['banda-elastica'] = (ctx, ts, dur, x, y, pal, p) => {
  const R0 = p.size || 50, u = (ts % dur) / dur
  let sx
  if (u < 0.4) sx = 1 + sm(u / 0.4) * 1.2               // se estira
  else sx = 1 + 1.2 * (1 - spring(clamp((u - 0.4) / 0.5, 0, 1), 0.4, 10))  // snap con rebote
  const sy = 1 / Math.sqrt(sx)
  glow(ctx, rgba(R('accent', pal), 0.5), R0 * 0.5, () => { ctx.fillStyle = grad(ctx, x, y, R0, pal); ctx.beginPath(); ctx.ellipse(x, y, R0 * sx, R0 * sy, 0, 0, TAU); ctx.fill() })
}
FN['latido'] = (ctx, ts, dur, x, y, pal, p) => {
  const R0 = p.size || 48, u = (ts % dur) / dur, b = Math.exp(-6 * (u % 0.5)) + 0.8 * Math.exp(-6 * ((u + 0.18) % 0.5)), s = 1 + 0.14 * b
  glow(ctx, rgba(R('accent', pal), 0.5), R0 * 0.6 * (1 + b * 0.4), () => { ctx.fillStyle = grad(ctx, x, y, R0, pal); ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.translate(-x, -y); tracePath(ctx, heartPath(x, y, R0)); ctx.fill(); ctx.restore() })
}
FN['sacudida'] = (ctx, ts, dur, x, y, pal, p) => {
  const R0 = p.size || 52, u = (ts % dur) / dur, amp = Math.exp(-5 * u) * (u < 0.9 ? 1 : 0), dx = Math.sin(ts * 40) * R0 * 0.3 * amp, rot = Math.sin(ts * 34) * 0.3 * amp
  ctx.save(); ctx.translate(x + dx, y); ctx.rotate(rot); ctx.translate(-x, -y)
  glow(ctx, rgba(R('accent', pal), 0.5), R0 * 0.5, () => { ctx.fillStyle = grad(ctx, x, y, R0, pal); tracePath(ctx, shapeOf(p.shape || 'square', x, y, R0)); ctx.fill() })
  ctx.restore()
}

// ---- PARTÍCULAS ----
FN['ensamble'] = (ctx, ts, dur, x, y, pal, p) => {
  const R0 = p.size || 66, u = (ts % dur) / dur, e = expoOut(clamp(u / 0.65, 0, 1)), fade = u > 0.85 ? 1 - (u - 0.85) / 0.15 : 1
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  for (const d of CLOUD) { const tx = x + d.hx * R0, ty = y + d.hy * R0, sx = x + Math.cos(d.a) * R0 * 3 * (1 - e), sy = y + Math.sin(d.a) * R0 * 3 * (1 - e); const px = lerp(sx, tx, e), py = lerp(sy, ty, e); ctx.globalAlpha = 0.85 * fade; ctx.fillStyle = R(d.k > 0.5 ? 'accent' : 'accent2', pal); ctx.beginPath(); ctx.arc(px, py, R0 * 0.03 * d.sz, 0, TAU); ctx.fill() }
  ctx.restore()
}
FN['desintegra'] = (ctx, ts, dur, x, y, pal, p) => {
  const R0 = p.size || 66, u = (ts % dur) / dur, e = easeInCubic(clamp((u - 0.2) / 0.7, 0, 1))
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  for (const d of CLOUD) { const hxx = x + d.hx * R0, hyy = y + d.hy * R0, fx = hxx + Math.cos(d.a) * R0 * 3 * e, fy = hyy + Math.sin(d.a) * R0 * 3 * e + e * e * R0; ctx.globalAlpha = (1 - e) * 0.9; ctx.fillStyle = R(d.k > 0.5 ? 'accent' : 'accent2', pal); ctx.beginPath(); ctx.arc(fx, fy, R0 * 0.03 * d.sz, 0, TAU); ctx.fill() }
  ctx.restore()
}
FN['confeti'] = (ctx, ts, dur, x, y, pal, p) => {
  const R0 = p.size || 60, u = (ts % dur) / dur, cols = ['accent', 'accent2', 'ink']
  for (const d of CLOUD) { const sp = 0.4 + d.rr * 0.9, e = clamp(u / sp, 0, 1); const px = x + Math.cos(d.a) * R0 * 2.6 * expoOut(e); const py = y + Math.sin(d.a) * R0 * 2.0 * expoOut(e) + easeInCubic(e) * R0 * 2.4; const fade = 1 - clamp((u - 0.7) / 0.3, 0, 1); const rot = d.ph + ts * 6 * d.sz; ctx.save(); ctx.globalAlpha = fade; ctx.translate(px, py); ctx.rotate(rot); ctx.fillStyle = R(cols[Math.floor(d.k * 3) % 3], pal); ctx.fillRect(-R0 * 0.05, -R0 * 0.03, R0 * 0.1, R0 * 0.06); ctx.restore() }
}
FN['chispas'] = (ctx, ts, dur, x, y, pal, p) => {
  const R0 = p.size || 60
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  for (const d of SPARKS) { const ph = (ts / dur + d.k) % 1, tw = Math.max(0, Math.sin(ph * PI)); const px = x + (d.hx) * R0 * 1.4, py = y + (d.hy) * R0 * 1.4, r = R0 * 0.09 * tw * d.sz; ctx.globalAlpha = tw; ctx.fillStyle = R('ink', pal); glow(ctx, R('accent', pal), 12, () => { ctx.beginPath(); ctx.moveTo(px, py - r * 2); ctx.lineTo(px + r * 0.5, py); ctx.lineTo(px, py + r * 2); ctx.lineTo(px - r * 0.5, py); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(px - r * 2, py); ctx.lineTo(px, py + r * 0.5); ctx.lineTo(px + r * 2, py); ctx.lineTo(px, py - r * 0.5); ctx.closePath(); ctx.fill() }) }
  ctx.restore()
}
FN['polvo-orbital'] = (ctx, ts, dur, x, y, pal, p) => {
  const R0 = p.size || 70
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  for (const d of CLOUD) { const a = d.a + ts * (0.6 + d.rr * 0.8) * (d.k > 0.5 ? 1 : -1), rad = R0 * (0.5 + d.rr * 0.7), px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad * 0.5; ctx.globalAlpha = 0.5 + 0.5 * d.sz; ctx.fillStyle = R(d.k > 0.5 ? 'accent' : 'accent2', pal); glow(ctx, R('accent', pal), 8, () => { ctx.beginPath(); ctx.arc(px, py, R0 * 0.026 * d.sz, 0, TAU); ctx.fill() }) }
  ctx.restore()
}
FN['enjambre'] = (ctx, ts, dur, x, y, pal, p) => {
  const R0 = p.size || 64
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  for (const d of CLOUD) { const nx = Math.sin(ts * 0.8 + d.ph) * 0.5 + Math.sin(ts * 1.3 + d.a * 2) * 0.5, ny = Math.cos(ts * 0.7 + d.ph * 1.4) * 0.5; const px = x + (d.hx + nx * 0.4) * R0, py = y + (d.hy + ny * 0.4) * R0; ctx.globalAlpha = 0.8; ctx.fillStyle = R(d.k > 0.5 ? 'accent' : 'accent2', pal); ctx.beginPath(); ctx.arc(px, py, R0 * 0.028 * d.sz, 0, TAU); ctx.fill() }
  ctx.restore()
}

// ---- REVELADO / TRAZO ----
FN['trazo-circulo'] = (ctx, ts, dur, x, y, pal, p) => {
  const R0 = p.size || 62, u = (ts % dur) / dur, e = expoOut(clamp(u / 0.7, 0, 1))
  ctx.save(); ctx.translate(x, y); ctx.rotate(ts * 0.4); ctx.translate(-x, -y)
  glow(ctx, rgba(R('accent', pal), 0.5), R0 * 0.4, () => { ctx.strokeStyle = R('accent', pal); ctx.lineWidth = R0 * 0.14; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(x, y, R0, -HALF_PI, -HALF_PI + TAU * e); ctx.stroke() })
  ctx.restore()
}
FN['contador-arco'] = (ctx, ts, dur, x, y, pal, p) => {
  const R0 = p.size || 62, u = (ts % dur) / dur, e = sm(clamp(u / 0.8, 0, 1))
  ctx.strokeStyle = rgba(R('ink', pal), 0.12); ctx.lineWidth = R0 * 0.13; ctx.beginPath(); ctx.arc(x, y, R0, 0, TAU); ctx.stroke()
  glow(ctx, rgba(R('accent', pal), 0.5), R0 * 0.4, () => { ctx.strokeStyle = grad(ctx, x, y, R0, pal); ctx.lineWidth = R0 * 0.13; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(x, y, R0, -HALF_PI, -HALF_PI + TAU * e); ctx.stroke() })
  const a = -HALF_PI + TAU * e; ctx.fillStyle = R('ink', pal); ctx.beginPath(); ctx.arc(x + Math.cos(a) * R0, y + Math.sin(a) * R0, R0 * 0.09, 0, TAU); ctx.fill()
}
FN['barrido'] = (ctx, ts, dur, x, y, pal, p) => {
  const R0 = p.size || 60, u = (ts % dur) / dur, e = sm(clamp(u / 0.6, 0, 1)), fade = u > 0.82 ? 1 - (u - 0.82) / 0.18 : 1
  ctx.save(); ctx.globalAlpha = fade; ctx.beginPath(); ctx.rect(x - R0 * 1.3, y - R0, (R0 * 2.6) * e, R0 * 2); ctx.clip()
  glow(ctx, rgba(R('accent', pal), 0.4), R0 * 0.4, () => { ctx.fillStyle = grad(ctx, x, y, R0, pal); tracePath(ctx, rectPath(x - R0 * 1.2, y - R0 * 0.9, R0 * 2.4, R0 * 1.8, R0 * 0.3)); ctx.fill() })
  ctx.restore()
  // borde del barrido
  ctx.save(); ctx.globalAlpha = fade * (1 - e); ctx.fillStyle = R('ink', pal); ctx.fillRect(x - R0 * 1.3 + R0 * 2.6 * e, y - R0, 3, R0 * 2); ctx.restore()
}
FN['iris'] = (ctx, ts, dur, x, y, pal, p) => {
  const R0 = p.size || 66, u = (ts % dur) / dur, e = backOut(clamp(u / 0.7, 0, 1)), fade = u > 0.85 ? 1 - (u - 0.85) / 0.15 : 1
  ctx.save(); ctx.globalAlpha = fade; ctx.beginPath(); ctx.arc(x, y, R0 * e, 0, TAU); ctx.clip()
  ctx.fillStyle = grad(ctx, x, y, R0, pal); ctx.fillRect(x - R0, y - R0, R0 * 2, R0 * 2)
  ctx.restore()
  glow(ctx, rgba(R('accent', pal), 0.4), R0 * 0.3, () => { ctx.strokeStyle = rgba(R('ink', pal), 0.5 * fade); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, R0 * e, 0, TAU); ctx.stroke() })
}

// ---- CINÉTICAS ----
FN['onda-choque'] = (ctx, ts, dur, x, y, pal, p) => {
  const R0 = p.size || 70
  for (let i = 0; i < 3; i++) { const u = ((ts / dur) + i / 3) % 1, rr = R0 * (0.2 + u * 1.1), a = 1 - u; ctx.save(); ctx.globalAlpha = a * a; glow(ctx, rgba(R('accent', pal), 0.5), 14, () => { ctx.strokeStyle = R('accent', pal); ctx.lineWidth = R0 * 0.1 * (1 - u); ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); ctx.stroke() }); ctx.restore() }
  glow(ctx, rgba(R('accent', pal), 0.6), R0 * 0.4, () => { ctx.fillStyle = R('accent', pal); ctx.beginPath(); ctx.arc(x, y, R0 * 0.16, 0, TAU); ctx.fill() })
}
FN['rayos-estallido'] = (ctx, ts, dur, x, y, pal, p) => {
  const R0 = p.size || 68, u = (ts % dur) / dur, e = expoOut(clamp(u / 0.5, 0, 1)), fade = 1 - clamp((u - 0.55) / 0.45, 0, 1), N = p.count || 12
  ctx.save(); ctx.translate(x, y); ctx.rotate(ts * 0.3); ctx.globalAlpha = fade
  glow(ctx, rgba(R('accent', pal), 0.5), 10, () => { ctx.strokeStyle = R('accent', pal); ctx.lineWidth = R0 * 0.06; ctx.lineCap = 'round'; for (let i = 0; i < N; i++) { const a = i * TAU / N; ctx.beginPath(); ctx.moveTo(Math.cos(a) * R0 * 0.3, Math.sin(a) * R0 * 0.3); ctx.lineTo(Math.cos(a) * R0 * (0.4 + e), Math.sin(a) * R0 * (0.4 + e)); ctx.stroke() } })
  ctx.restore()
}
FN['pulso-anillos'] = (ctx, ts, dur, x, y, pal, p) => {
  const R0 = p.size || 66
  glow(ctx, rgba(R('accent', pal), 0.5), R0 * 0.3, () => { ctx.fillStyle = grad(ctx, x, y, R0 * 0.4, pal); ctx.beginPath(); ctx.arc(x, y, R0 * 0.3 * (1 + 0.06 * Math.sin(ts * 4)), 0, TAU); ctx.fill() })
  for (let i = 0; i < 3; i++) { const u = ((ts / dur) + i / 3) % 1; ctx.save(); ctx.globalAlpha = (1 - u) * 0.7; ctx.strokeStyle = R('accent', pal); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, y, R0 * (0.35 + u * 0.65), 0, TAU); ctx.stroke(); ctx.restore() }
}
FN['giro-estela'] = (ctx, ts, dur, x, y, pal, p) => {
  const R0 = p.size || 60, rad = R0 * 0.92, head = ts * 2.4, segs = 26, span = PI * 1.15
  for (let i = segs; i >= 0; i--) { const f = i / segs, a = head - f * span; ctx.save(); ctx.globalAlpha = (1 - f) * 0.9; ctx.strokeStyle = R(f < 0.35 ? 'accent2' : 'accent', pal); ctx.lineWidth = R0 * 0.17 * (1 - f * 0.55); ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(x, y, rad, a - 0.05, a); ctx.stroke(); ctx.restore() }
  const hx = x + Math.cos(head) * rad, hy = y + Math.sin(head) * rad
  glow(ctx, R('accent', pal), 16, () => { ctx.fillStyle = R('ink', pal); ctx.beginPath(); ctx.arc(hx, hy, R0 * 0.13, 0, TAU); ctx.fill() })
}
FN['ondas-agua'] = (ctx, ts, dur, x, y, pal, p) => {
  const R0 = p.size || 68
  for (let i = 0; i < 4; i++) { const u = ((ts / dur) * 1 + i / 4) % 1, rr = R0 * u, a = (1 - u) * 0.8; ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = R('accent', pal); ctx.lineWidth = 2 * (1 - u) + 0.5; ctx.beginPath(); ctx.ellipse(x, y, rr, rr * 0.42, 0, 0, TAU); ctx.stroke(); ctx.restore() }
  glow(ctx, rgba(R('accent', pal), 0.5), 10, () => { ctx.fillStyle = R('accent2', pal); ctx.beginPath(); ctx.ellipse(x, y, R0 * 0.12, R0 * 0.06, 0, 0, TAU); ctx.fill() })
}

// ---- PREMIUM (de la investigación de tendencias) ----
FN['taffy'] = (ctx, ts, dur, x, y, pal, p) => {
  const R0 = p.size || 42, u = (ts % dur) / dur
  const s = u < 0.5 ? sm(u / 0.5) : 1 - spring(clamp((u - 0.5) / 0.5, 0, 1), 0.4, 10)   // estira y snap-back elástico
  const gap = lerp(R0 * 0.5, R0 * 2.6, s), r = lerp(R0 * 1.05, R0 * 0.72, s), ang = (p.angle || -20) * PI / 180
  const c1 = [x - Math.cos(ang) * gap / 2, y - Math.sin(ang) * gap / 2], c2 = [x + Math.cos(ang) * gap / 2, y + Math.sin(ang) * gap / 2]
  glow(ctx, rgba(R('accent', pal), 0.55), R0 * 0.55, () => {
    ctx.fillStyle = grad(ctx, x, y, R0 * 1.6, pal)
    ctx.beginPath(); ctx.arc(c1[0], c1[1], r, 0, TAU); ctx.fill()
    ctx.beginPath(); ctx.arc(c2[0], c2[1], r, 0, TAU); ctx.fill()
    ctx.beginPath(); if (metaball(ctx, r, r, c1, c2, 2.6, lerp(0.55, 0.18, s))) ctx.fill()
  })
}
FN['llenado-liquido'] = (ctx, ts, dur, x, y, pal, p) => {
  const R0 = p.size || 62, u = (ts % dur) / dur, level = u < 0.8 ? sm(u / 0.8) : (u < 0.95 ? 1 : 1 - (u - 0.95) / 0.05 * 0)
  const top = y + R0 - level * 2 * R0
  ctx.strokeStyle = rgba(R('ink', pal), 0.22); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, R0, 0, TAU); ctx.stroke()
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, R0 - 1, 0, TAU); ctx.clip()
  glow(ctx, rgba(R('accent', pal), 0.4), R0 * 0.3, () => {
    ctx.fillStyle = grad(ctx, x, y, R0, pal); ctx.beginPath(); ctx.moveTo(x - R0, y + R0)
    for (let px = -R0; px <= R0; px += 5) { const wy = top + Math.sin(px / R0 * 3 + ts * 3) * R0 * 0.07 * (1 - level * 0.55); ctx.lineTo(x + px, wy) }
    ctx.lineTo(x + R0, y + R0); ctx.closePath(); ctx.fill()
  })
  ctx.restore()
}
FN['luz-barrido'] = (ctx, ts, dur, x, y, pal, p) => {
  const R0 = p.size || 64, u = (ts % dur) / dur, path = shapeOf(p.shape || 'rect', x, y, R0)
  glow(ctx, rgba(R('accent', pal), 0.5), R0 * 0.4, () => { ctx.fillStyle = grad(ctx, x, y, R0, pal); tracePath(ctx, path); ctx.fill() })
  ctx.save(); tracePath(ctx, path); ctx.clip(); ctx.globalCompositeOperation = 'lighter'
  const sweep = lerp(x - R0 * 1.5, x + R0 * 1.5, sm(clamp(u / 0.7, 0, 1)))
  const g = ctx.createLinearGradient(sweep - R0 * 0.55, y - R0, sweep + R0 * 0.55, y + R0)
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g; ctx.fillRect(x - R0 * 1.5, y - R0 * 1.5, R0 * 3, R0 * 3); ctx.restore()
}
FN['resplandor'] = (ctx, ts, dur, x, y, pal, p) => {
  const R0 = p.size || 44, pulse = 0.5 + 0.5 * Math.sin(ts / dur * TAU * 2)
  const rg = ctx.createRadialGradient(x, y, 0, x, y, R0 * 2.6)
  rg.addColorStop(0, rgba(R('accent', pal), 0.45 + 0.3 * pulse)); rg.addColorStop(0.4, rgba(R('accent2', pal), 0.14)); rg.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = rg; ctx.fillRect(x - R0 * 2.6, y - R0 * 2.6, R0 * 5.2, R0 * 5.2)
  const s = 1 + 0.06 * pulse
  glow(ctx, rgba(R('accent', pal), 0.6), R0 * 0.6, () => { ctx.fillStyle = grad(ctx, x, y, R0, pal); ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.translate(-x, -y); tracePath(ctx, shapeOf(p.shape || 'circle', x, y, R0)); ctx.fill(); ctx.restore() })
}
FN['aberracion'] = (ctx, ts, dur, x, y, pal, p) => {
  const R0 = p.size || 54, u = ts / dur, d = (0.32 + 0.68 * Math.abs(Math.sin(u * TAU))) * R0 * 0.2, sh = p.shape || 'circle'
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  const gh = (o, c) => { ctx.fillStyle = c; tracePath(ctx, shapeOf(sh, x + o, y, R0)); ctx.fill() }
  gh(-d, 'rgba(255,40,90,0.95)'); gh(0, 'rgba(40,230,120,0.8)'); gh(d, 'rgba(60,120,255,0.95)')   // split RGB real
  ctx.restore()
}

// ==================== NUEVAS (research profundo: líquido avanzado, 3D, glitch, naturaleza, UI) ====================
// ---- LÍQUIDAS AVANZADAS ----
FN['cromo-liquido'] = (ctx, ts, dur, x, y, pal, p) => {
  const R0 = p.size || 62, u = ts / dur, br = 1 + 0.03 * Math.sin(4 * PI * u), pts = []
  for (let i = 0; i < 64; i++) { const a = i / 64 * TAU, r = R0 * br * (1 + 0.06 * Math.sin(3 * a + TAU * u) + 0.04 * Math.sin(5 * a - 2 * TAU * u)); pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]) }
  const phi = TAU * u, g = ctx.createLinearGradient(x - Math.cos(phi) * R0, y - Math.sin(phi) * R0, x + Math.cos(phi) * R0, y + Math.sin(phi) * R0)
  g.addColorStop(0, '#171d2b'); g.addColorStop(0.34, '#cfd8ec'); g.addColorStop(0.5, R('accent2', pal)); g.addColorStop(0.66, '#eaeef7'); g.addColorStop(1, '#171d2b')
  glow(ctx, rgba(R('accent', pal), 0.35), R0 * 0.4, () => { ctx.fillStyle = g; ctx.beginPath(); smoothClosed(ctx, pts); ctx.fill() })
}
FN['lampara-lava'] = (ctx, ts, dur, x, y, pal, p) => {
  const R0 = p.size || 40, u = ts / dur
  const b = [[x - R0 * 0.5, y + Math.sin(TAU * u) * R0 * 1.3, R0 * 0.95], [x + R0 * 0.45, y + Math.sin(TAU * u * 0.7 + 2) * R0 * 1.5, R0 * 0.8], [x - R0 * 0.05, y + Math.sin(TAU * u * 1.3 + 4) * R0 * 1.1, R0 * 0.6]]
  glow(ctx, rgba(R('accent', pal), 0.5), R0 * 0.5, () => {
    ctx.fillStyle = grad(ctx, x, y, R0 * 2, pal)
    for (const q of b) { ctx.beginPath(); ctx.arc(q[0], q[1], q[2], 0, TAU); ctx.fill() }
    for (let i = 0; i < b.length; i++) for (let j = i + 1; j < b.length; j++) { ctx.beginPath(); if (metaball(ctx, b[i][2], b[j][2], [b[i][0], b[i][1]], [b[j][0], b[j][1]], 2.6, 0.5)) ctx.fill() }
  })
}
FN['remolino-drenaje'] = (ctx, ts, dur, x, y, pal, p) => {
  const R0 = p.size || 66, u = ts / dur
  ctx.save(); ctx.translate(x, y); ctx.rotate(TAU * u)
  glow(ctx, rgba(R('accent', pal), 0.4), R0 * 0.3, () => { for (let m = 0; m < 5; m++) { const off = m / 5 * TAU; ctx.strokeStyle = R(m % 2 ? 'accent2' : 'accent', pal); ctx.lineWidth = R0 * 0.09; ctx.lineCap = 'round'; ctx.beginPath(); for (let s = 0; s <= 40; s++) { const f = s / 40, r = R0 * (0.12 + f * 0.9), th = off + f * 6, px = Math.cos(th) * r, py = Math.sin(th) * r; s ? ctx.lineTo(px, py) : ctx.moveTo(px, py) } ctx.stroke() } })
  ctx.restore()
  const rg = ctx.createRadialGradient(x, y, 0, x, y, R0 * 0.42); rg.addColorStop(0, '#05070d'); rg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(x, y, R0 * 0.42, 0, TAU); ctx.fill()
}
FN['rebote-tension'] = (ctx, ts, dur, x, y, pal, p) => {
  const R0 = p.size || 58, u = (ts % dur) / dur, dec = Math.exp(-u * 3), modes = [[2, 0.18, 7], [3, 0.12, 13], [4, 0.09, 20]], pts = []
  for (let i = 0; i <= 96; i++) { const th = i / 96 * TAU; let r = R0; for (const [k, a, w] of modes) r += R0 * a * dec * Math.cos(k * th) * Math.cos(w * u * 4); pts.push([x + Math.cos(th) * r, y + Math.sin(th) * r]) }
  glow(ctx, rgba(R('accent', pal), 0.5), R0 * 0.5, () => { ctx.fillStyle = grad(ctx, x, y, R0, pal); ctx.beginPath(); tracePts(ctx, pts); ctx.fill() })
}
FN['ondas-interferencia'] = (ctx, ts, dur, x, y, pal, p) => {
  const R0 = p.size || 70, u = ts / dur, ss = [[x - R0 * 0.5, y], [x + R0 * 0.5, y]]
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  for (const s of ss) for (let n = 0; n < 6; n++) { const r = ((n + u) % 6) / 6 * R0 * 1.4; ctx.globalAlpha = (1 - r / (R0 * 1.4)) * 0.55; ctx.strokeStyle = R('accent', pal); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s[0], s[1], r + R0 * 0.1, 0, TAU); ctx.stroke() }
  ctx.restore()
}
// ---- 3D / PROFUNDIDAD ----
FN['card-flip'] = (ctx, ts, dur, x, y, pal, p) => {
  const R0 = p.size || 60, u = ts / dur, sxv = Math.cos(u * TAU), front = sxv >= 0
  ctx.save(); ctx.translate(x, y); ctx.scale(Math.max(0.02, Math.abs(sxv)), 1); ctx.translate(-x, -y)
  glow(ctx, rgba(R('accent', pal), 0.35), R0 * 0.35, () => { ctx.fillStyle = front ? grad(ctx, x, y, R0, pal) : R('surface', pal); tracePath(ctx, rectPath(x - R0, y - R0 * 0.7, R0 * 2, R0 * 1.4, R0 * 0.16)); ctx.fill() })
  if (!front) { ctx.strokeStyle = rgba(R('accent', pal), 0.6); ctx.lineWidth = 3; tracePath(ctx, rectPath(x - R0, y - R0 * 0.7, R0 * 2, R0 * 1.4, R0 * 0.16)); ctx.stroke() }
  ctx.restore()
}
FN['coin-spin'] = (ctx, ts, dur, x, y, pal, p) => {
  const R0 = p.size || 56, u = ts / dur, ry = Math.max(0.05, Math.abs(Math.cos(u * TAU))) * R0
  glow(ctx, rgba(R('accent', pal), 0.4), R0 * 0.4, () => { const g = ctx.createLinearGradient(x, y - ry, x, y + ry); g.addColorStop(0, R('accent2', pal)); g.addColorStop(0.5, '#e2e9f7'); g.addColorStop(1, R('accent', pal)); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, R0, ry, 0, 0, TAU); ctx.fill() })
}
FN['iso-extrude'] = (ctx, ts, dur, x, y, pal, p) => {
  const R0 = p.size || 46, u = (ts % dur) / dur, h = (u < 0.7 ? Math.max(0, backOut(u / 0.7)) : 1) * R0 * 1.3, w = R0, d = R0 * 0.5
  const bS = [x, y + d], bE = [x + w, y], bW = [x - w, y], tN = [x, y - d - h], tE = [x + w, y - h], tS = [x, y + d - h], tW = [x - w, y - h]
  const face = (pp, col, al) => { ctx.fillStyle = rgba(R(col, pal), al); ctx.beginPath(); pp.forEach((pt, i) => i ? ctx.lineTo(pt[0], pt[1]) : ctx.moveTo(pt[0], pt[1])); ctx.closePath(); ctx.fill() }
  glow(ctx, rgba(R('accent', pal), 0.3), R0 * 0.3, () => { face([bW, bS, tS, tW], 'accent', 0.85); face([bE, bS, tS, tE], 'accent2', 0.95); face([tN, tE, tS, tW], 'ink', 0.92) })
}
FN['depth-pop'] = (ctx, ts, dur, x, y, pal, p) => {
  const R0 = p.size || 54, u = (ts % dur) / dur
  let s; if (u < 0.15) s = 0; else if (u < 0.6) s = Math.max(0, backOut((u - 0.15) / 0.45)); else if (u < 0.85) s = 1; else s = 1 - easeInCubic((u - 0.85) / 0.15)
  ctx.save(); ctx.globalAlpha = 0.3 * s; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(x, y + R0 * 1.15, R0 * 0.8 * s, R0 * 0.2 * s, 0, 0, TAU); ctx.fill(); ctx.restore()
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.translate(-x, -y)
  glow(ctx, rgba(R('accent', pal), 0.5), R0 * 0.5, () => { ctx.fillStyle = grad(ctx, x, y, R0, pal); tracePath(ctx, shapeOf(p.shape || 'circle', x, y, R0)); ctx.fill() }); ctx.restore()
}
FN['flag-ondea'] = (ctx, ts, dur, x, y, pal, p) => {
  const R0 = p.size || 62, u = ts / dur, W = R0 * 1.9, H = R0 * 1.2
  ctx.save(); ctx.beginPath()
  for (let i = 0; i <= 24; i++) { const f = i / 24, px = x - W / 2 + f * W, wy = Math.sin(f * 6 - u * TAU) * R0 * 0.15; i ? ctx.lineTo(px, y - H / 2 + wy) : ctx.moveTo(px, y - H / 2 + wy) }
  for (let i = 24; i >= 0; i--) { const f = i / 24, px = x - W / 2 + f * W, wy = Math.sin(f * 6 - u * TAU) * R0 * 0.15; ctx.lineTo(px, y + H / 2 + wy) }
  ctx.closePath(); ctx.fillStyle = grad(ctx, x, y, R0, pal); glow(ctx, rgba(R('accent', pal), 0.3), R0 * 0.3, () => ctx.fill())
  ctx.clip(); ctx.globalCompositeOperation = 'multiply'
  for (let i = 0; i <= 24; i++) { const f = i / 24, px = x - W / 2 + f * W, sh = 0.5 + 0.5 * Math.cos(f * 6 - u * TAU); ctx.globalAlpha = (1 - sh) * 0.4; ctx.fillStyle = '#000'; ctx.fillRect(px - W / 48, y - H, W / 24 + 1, H * 2) }
  ctx.restore()
}
FN['ribbon-twist'] = (ctx, ts, dur, x, y, pal, p) => {
  const R0 = p.size || 60, u = ts / dur, W = R0 * 1.9, n = 30
  for (let i = 0; i < n; i++) { const f = i / (n - 1), px = x - W / 2 + f * W, c = Math.cos(f * 8 + u * TAU), h = Math.abs(c) * R0 * 0.6 + 2; ctx.fillStyle = c >= 0 ? R('accent', pal) : R('accent2', pal); ctx.globalAlpha = 0.5 + 0.5 * Math.abs(c); ctx.fillRect(px - W / (2 * n), y - h, W / n + 1, h * 2) }
  ctx.globalAlpha = 1
}
// ---- GLITCH / DIGITAL ----
FN['rgb-tear'] = (ctx, ts, dur, x, y, pal, p) => {
  const R0 = p.size || 54, u = ts / dur, gate = Math.pow(Math.abs(Math.sin(u * TAU)), 4), sh = p.shape || 'rect'
  const nb = 9, bh = R0 * 2 / nb, off = 2 + gate * 5, gd = grad(ctx, x, y, R0, pal)
  for (let i = 0; i < nb; i++) { const by = y - R0 + i * bh, dx = (hashN(i + Math.floor(u * 12) * 7) - 0.5) * R0 * 0.75 * gate
    ctx.save(); ctx.beginPath(); ctx.rect(x - R0 * 1.7, by, R0 * 3.4, bh + 0.6); ctx.clip()
    ctx.fillStyle = gd; tracePath(ctx, shapeOf(sh, x + dx, y, R0)); ctx.fill()                       // franja desplazada (tear)
    ctx.globalCompositeOperation = 'lighter'
    ctx.fillStyle = 'rgba(255,55,110,0.75)'; tracePath(ctx, shapeOf(sh, x + dx - off, y, R0)); ctx.fill()
    ctx.fillStyle = 'rgba(70,130,255,0.75)'; tracePath(ctx, shapeOf(sh, x + dx + off, y, R0)); ctx.fill()
    ctx.restore()
  }
}
FN['crt-scan'] = (ctx, ts, dur, x, y, pal, p) => {
  const R0 = p.size || 64, u = ts / dur, W = R0 * 1.8, H = R0 * 1.4
  glow(ctx, rgba(R('accent', pal), 0.3), R0 * 0.3, () => { ctx.fillStyle = grad(ctx, x, y, R0, pal); tracePath(ctx, rectPath(x - W / 2, y - H / 2, W, H, R0 * 0.2)); ctx.fill() })
  ctx.save(); tracePath(ctx, rectPath(x - W / 2, y - H / 2, W, H, R0 * 0.2)); ctx.clip()
  ctx.fillStyle = 'rgba(0,0,0,0.32)'; for (let sy = -H / 2; sy < H / 2; sy += 4) ctx.fillRect(x - W / 2, y + sy, W, 2)
  ctx.fillStyle = 'rgba(255,255,255,0.11)'; ctx.fillRect(x - W / 2, y - H / 2 + (u % 1) * H, W, H * 0.14)
  ctx.restore()
}
FN['matrix-rain'] = (ctx, ts, dur, x, y, pal, p) => {
  const R0 = p.size || 64, u = ts / dur, W = R0 * 1.7, H = R0 * 1.7, cols = 11, cw = W / cols, fs = cw * 1.05
  ctx.save(); ctx.beginPath(); ctx.rect(x - W / 2, y - H / 2, W, H); ctx.clip(); ctx.font = `${fs}px ui-monospace, monospace`; ctx.textAlign = 'center'
  for (let c = 0; c < cols; c++) { const cx = x - W / 2 + (c + 0.5) * cw, v = 0.5 + hashN(c) * 0.9, head = ((u * v + hashN(c * 3)) % 1) * (H + cw * 6) - cw * 3; for (let k = 0; k < 7; k++) { const gy = y - H / 2 + head - k * cw; if (gy < y - H / 2 - cw || gy > y + H / 2) continue; const g = MGLYPH[Math.floor(hashN(c * 13 + Math.floor((head - k * cw) / cw) + Math.floor(u * 8)) * MGLYPH.length) % MGLYPH.length]; ctx.fillStyle = k === 0 ? '#e6fff0' : `rgba(60,220,110,${1 - k / 7})`; ctx.fillText(g || '0', cx, gy) } }
  ctx.restore()
}
FN['holograma'] = (ctx, ts, dur, x, y, pal, p) => {
  const R0 = p.size || 58, u = ts / dur, fl = 0.72 + 0.28 * hashN(Math.floor(u * 20)), d = 1.6, sh = p.shape || 'hexagon'
  ctx.save(); ctx.globalAlpha = fl; ctx.globalCompositeOperation = 'lighter'
  ctx.fillStyle = 'rgba(80,220,255,0.75)'; tracePath(ctx, shapeOf(sh, x - d, y, R0)); ctx.fill()
  ctx.fillStyle = 'rgba(120,160,255,0.65)'; tracePath(ctx, shapeOf(sh, x + d, y, R0)); ctx.fill()
  ctx.restore()
  ctx.save(); tracePath(ctx, shapeOf(sh, x, y, R0)); ctx.clip()
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; for (let sy = -R0; sy < R0; sy += 3) ctx.fillRect(x - R0, y + sy, R0 * 2, 1.4)
  ctx.fillStyle = 'rgba(180,240,255,0.22)'; ctx.fillRect(x - R0, y - R0 + (u % 1) * R0 * 2, R0 * 2, R0 * 0.2)
  ctx.restore()
}
FN['pixel-dissolve'] = (ctx, ts, dur, x, y, pal, p) => {
  const R0 = p.size || 60, u = (ts % dur) / dur, prog = 0.5 - 0.5 * Math.cos(u * TAU), n = 10, cs = R0 * 1.8 / n, g = grad(ctx, x, y, R0, pal)
  ctx.fillStyle = g
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { if (hashN(i * 17 + j * 131) < prog) { ctx.fillRect(x - R0 * 0.9 + i * cs + 1, y - R0 * 0.9 + j * cs + 1, cs - 2, cs - 2) } }
}
// ---- NATURALEZA / FÍSICA ----
FN['llama-vela'] = (ctx, ts, dur, x, y, pal, p) => {
  const R0 = p.size || 50, u = ts / dur, tip = Math.sin(u * TAU * 3) * R0 * 0.12 + Math.sin(u * TAU * 7) * R0 * 0.05, fl = 0.85 + 0.15 * Math.sin(u * TAU * 9)
  const flame = (r, col) => { ctx.beginPath(); ctx.moveTo(x, y + r * 1.1); ctx.quadraticCurveTo(x + r * 0.9, y + r * 0.2, x + r * 0.35, y - r * 0.4); ctx.quadraticCurveTo(x + tip + r * 0.1, y - r * 1.1, x + tip, y - r * 1.5); ctx.quadraticCurveTo(x + tip - r * 0.1, y - r * 1.1, x - r * 0.35, y - r * 0.4); ctx.quadraticCurveTo(x - r * 0.9, y + r * 0.2, x, y + r * 1.1); ctx.fillStyle = col; ctx.fill() }
  glow(ctx, 'rgba(255,150,40,0.6)', R0 * 0.7 * fl, () => { flame(R0 * 0.7, '#ff7a1a'); flame(R0 * 0.42, '#ffd24a') })
  flame(R0 * 0.2, '#6a9bff')
}
FN['rayo'] = (ctx, ts, dur, x, y, pal, p) => {
  const R0 = p.size || 60, n = 3, seg = Math.floor((ts / dur) * n), life = ((ts / dur) * n) % 1, steps = 8, pts = [[x, y - R0 * 1.4]]
  for (let i = 1; i < steps; i++) { const f = i / steps, off = (hashN(seg * 31 + i) - 0.5) * R0 * 0.9 * (1 - Math.abs(f - 0.5)); pts.push([x + off, y - R0 * 1.4 + f * R0 * 2.8]) }
  pts.push([x, y + R0 * 1.4])
  const a = Math.exp(-life * 4)
  ctx.save(); ctx.globalAlpha = a; ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  ctx.strokeStyle = rgba(R('accent2', pal), 0.5); ctx.lineWidth = R0 * 0.18; ctx.beginPath(); tracePts(ctx, pts, false); ctx.stroke()
  ctx.strokeStyle = '#eaf0ff'; ctx.lineWidth = R0 * 0.05; ctx.beginPath(); tracePts(ctx, pts, false); ctx.stroke()
  ctx.globalAlpha = a * 0.25; ctx.fillStyle = rgba(R('accent2', pal), 0.4); ctx.fillRect(x - R0 * 1.4, y - R0 * 1.6, R0 * 2.8, R0 * 3.2)
  ctx.restore()
}
FN['brasas'] = (ctx, ts, dur, x, y, pal, p) => {
  const R0 = p.size || 64
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 90; i++) { const d = CLOUD[i], life = ((ts / dur) * (0.5 + d.rr) + d.k) % 1, py = y + R0 - life * R0 * 2.2, px = x + d.hx * R0 * 0.5 + Math.sin(ts * 2 + d.ph) * R0 * 0.12, al = (1 - life) * (0.6 + 0.4 * Math.sin(ts * 8 + d.ph)); ctx.globalAlpha = Math.max(0, al); glow(ctx, '#ff7a1a', 8, () => { ctx.fillStyle = i % 3 ? '#ff8a2a' : '#ffd24a'; ctx.beginPath(); ctx.arc(px, py, R0 * 0.026 * d.sz, 0, TAU); ctx.fill() }) }
  ctx.restore()
}
FN['nieve'] = (ctx, ts, dur, x, y, pal, p) => {
  const R0 = p.size || 66
  for (let i = 0; i < 70; i++) { const d = CLOUD[i + 20], life = ((ts / dur) * (0.4 + d.rr * 0.5) + d.k) % 1, py = y - R0 + life * R0 * 2.2, px = x + d.hx * R0 + Math.sin(ts * 1.2 + d.ph) * R0 * 0.18; ctx.globalAlpha = 0.5 + 0.5 * d.sz; ctx.fillStyle = R('ink', pal); ctx.beginPath(); ctx.arc(px, py, R0 * 0.03 * d.sz, 0, TAU); ctx.fill() }
  ctx.globalAlpha = 1
}
FN['burbujas'] = (ctx, ts, dur, x, y, pal, p) => {
  const R0 = p.size || 64
  for (let i = 0; i < 40; i++) { const d = CLOUD[i * 3], life = ((ts / dur) * (0.4 + d.rr * 0.6) + d.k) % 1, py = y + R0 - life * R0 * 2.2, px = x + d.hx * R0 * 0.8 + Math.sin(ts * 1.5 + d.ph) * R0 * 0.16, r = R0 * 0.06 * d.sz * (0.6 + life * 0.6); ctx.globalAlpha = 0.55 * (1 - life * 0.3); const rg = ctx.createRadialGradient(px - r * 0.3, py - r * 0.3, 0, px, py, r); rg.addColorStop(0, 'rgba(255,255,255,0.05)'); rg.addColorStop(0.8, rgba(R('accent', pal), 0.12)); rg.addColorStop(1, rgba(R('accent2', pal), 0.6)); ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(px, py, r, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(px - r * 0.35, py - r * 0.35, r * 0.18, 0, TAU); ctx.fill() }
  ctx.globalAlpha = 1
}
FN['aurora'] = (ctx, ts, dur, x, y, pal, p) => {
  const R0 = p.size || 70, u = ts / dur, W = R0 * 2.2, H = R0 * 2
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  for (let band = 0; band < 3; band++) { const col = band === 0 ? R('accent', pal) : band === 1 ? R('accent2', pal) : '#3ad6a0'; ctx.beginPath(); ctx.moveTo(x - W / 2, y + H / 2); for (let i = 0; i <= 30; i++) { const f = i / 30, px = x - W / 2 + f * W, top = y - H * 0.1 + Math.sin(f * 4 + u * TAU + band) * R0 * 0.35 + Math.sin(f * 9 - u * TAU * 0.6 + band) * R0 * 0.15; ctx.lineTo(px, top) } ctx.lineTo(x + W / 2, y + H / 2); ctx.closePath(); const g = ctx.createLinearGradient(0, y - H * 0.4, 0, y + H / 2); g.addColorStop(0, rgba(col, 0.5)); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fill() }
  ctx.restore()
}
// ---- UI / DATA / ACENTOS ----
FN['eq-barras'] = (ctx, ts, dur, x, y, pal, p) => {
  const R0 = p.size || 58, u = ts / dur, n = 9, bw = R0 * 1.8 / n, gap = bw * 0.3
  for (let i = 0; i < n; i++) { const h = R0 * (0.2 + 0.8 * Math.abs(Math.sin(TAU * u * (1 + i * 0.3) + i))), bx = x - R0 * 0.9 + i * bw; glow(ctx, rgba(R('accent', pal), 0.3), 6, () => { ctx.fillStyle = grad(ctx, x, y, R0, pal); tracePath(ctx, rectPath(bx + gap / 2, y + R0 * 0.9 - h, bw - gap, h, (bw - gap) / 2)); ctx.fill() }); ctx.fillStyle = R('ink', pal); ctx.fillRect(bx + gap / 2, y + R0 * 0.9 - h - 4, bw - gap, 3) }
}
FN['barras-crecen'] = (ctx, ts, dur, x, y, pal, p) => {
  const R0 = p.size || 58, u = (ts % dur) / dur, n = 5, bw = R0 * 1.7 / n, gap = bw * 0.28, hs = [0.5, 0.85, 0.62, 1, 0.75]
  for (let i = 0; i < n; i++) { const pr = clamp((u - i * 0.08) / 0.42, 0, 1), e = pr < 1 ? backOut(pr) : 1, h = R0 * 1.7 * hs[i] * e, bx = x - R0 * 0.85 + i * bw; if (h <= 0) continue; ctx.fillStyle = grad(ctx, x, y, R0, pal); tracePath(ctx, rectPath(bx + gap / 2, y + R0 * 0.9 - h, bw - gap, h, (bw - gap) * 0.25)); ctx.fill() }
}
FN['spinner-gusano'] = (ctx, ts, dur, x, y, pal, p) => {
  const R0 = p.size || 60, u = ts / dur, start = u * TAU * 2, sweep = 0.7 + PI * 1.6 * (0.5 - 0.5 * Math.cos(u * TAU * 2))
  glow(ctx, rgba(R('accent', pal), 0.4), R0 * 0.3, () => { ctx.strokeStyle = grad(ctx, x, y, R0, pal); ctx.lineWidth = R0 * 0.16; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(x, y, R0, start, start + sweep); ctx.stroke() })
}
FN['check-draw'] = (ctx, ts, dur, x, y, pal, p) => {
  const R0 = p.size || 58, u = (ts % dur) / dur, pop = u < 0.4 ? Math.max(0, backOut(u / 0.4)) : 1, fade = u > 0.9 ? 1 - (u - 0.9) / 0.1 : 1
  ctx.save(); ctx.globalAlpha = fade; ctx.translate(x, y); ctx.scale(pop, pop); ctx.translate(-x, -y)
  glow(ctx, rgba(R('accent', pal), 0.5), R0 * 0.4, () => { ctx.fillStyle = grad(ctx, x, y, R0, pal); ctx.beginPath(); ctx.arc(x, y, R0, 0, TAU); ctx.fill() })
  const p0 = [x - R0 * 0.42, y + R0 * 0.02], p1 = [x - R0 * 0.1, y + R0 * 0.34], p2 = [x + R0 * 0.44, y - R0 * 0.3], cu = clamp((u - 0.4) / 0.4, 0, 1)
  ctx.strokeStyle = R('onAccent', pal); ctx.lineWidth = R0 * 0.14; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(p0[0], p0[1])
  if (cu < 0.5) { const f = cu / 0.5; ctx.lineTo(lerp(p0[0], p1[0], f), lerp(p0[1], p1[1], f)) } else { ctx.lineTo(p1[0], p1[1]); const f = (cu - 0.5) / 0.5; ctx.lineTo(lerp(p1[0], p2[0], f), lerp(p1[1], p2[1], f)) }
  ctx.stroke(); ctx.restore()
}
FN['radar'] = (ctx, ts, dur, x, y, pal, p) => {
  const R0 = p.size || 66, u = ts / dur, ang = u * TAU
  ctx.strokeStyle = rgba(R('ink', pal), 0.12); ctx.lineWidth = 1.5; for (let r = 1; r <= 3; r++) { ctx.beginPath(); ctx.arc(x, y, R0 * r / 3, 0, TAU); ctx.stroke() }
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let k = 0; k < 20; k++) { const a = ang - k * 0.05; ctx.globalAlpha = (1 - k / 20) * 0.22; ctx.fillStyle = R('accent', pal); ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, R0, a - 0.03, a); ctx.closePath(); ctx.fill() } ctx.restore()
  glow(ctx, R('accent', pal), 8, () => { ctx.strokeStyle = R('accent2', pal); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(ang) * R0, y + Math.sin(ang) * R0); ctx.stroke() })
  for (const [ba, br] of [[0.6, 1.2], [2.1, 0.7], [4.0, 0.9]]) { const dd = ((ang - ba) % TAU + TAU) % TAU, gv = Math.exp(-dd * 3); ctx.globalAlpha = gv; ctx.fillStyle = R('ink', pal); ctx.beginPath(); ctx.arc(x + Math.cos(ba) * R0 * br, y + Math.sin(ba) * R0 * br, R0 * 0.04, 0, TAU); ctx.fill() }
  ctx.globalAlpha = 1
}

// helpers de forma
function shapeOf(kind, x, y, r) {
  return kind === 'circle' ? circlePath(x, y, r)
    : kind === 'square' || kind === 'rect' ? rectPath(x - r, y - r, r * 2, r * 2, r * 0.16)
      : kind === 'star' ? starPath(x, y, r, r * 0.45, 5)
        : kind === 'triangle' ? polygonPath(x, y, r, 3)
          : kind === 'hexagon' ? polygonPath(x, y, r, 6)
            : kind === 'drop' ? dropPath(x, y, r * 0.8)
              : circlePath(x, y, r)
}
function heartPath(cx, cy, r) {
  const s = r / 16
  return [
    { c: 'M', x: cx, y: cy + 10 * s },
    { c: 'C', x1: cx - 16 * s, y1: cy - 4 * s, x2: cx - 14 * s, y2: cy - 15 * s, x: cx, y: cy - 6 * s },
    { c: 'C', x1: cx + 14 * s, y1: cy - 15 * s, x2: cx + 16 * s, y2: cy - 4 * s, x: cx, y: cy + 10 * s },
    { c: 'Z' },
  ]
}

// ============================ CATÁLOGO ============================
export const FX_CATS = [
  { key: 'liquido', title: 'Líquidas', note: 'Deformación gooey/gelatina con puentes metaball, morph y ruido.' },
  { key: 'elastico', title: 'Elásticas', note: 'Squash & stretch, resortes con overshoot, rebote y jiggle (12 principios).' },
  { key: 'particulas', title: 'Partículas', note: 'Cientos de puntos que ensamblan, se dispersan, orbitan o estallan.' },
  { key: 'reveal', title: 'Revelado', note: 'Trazos que se dibujan, barridos, iris y contadores.' },
  { key: 'kinetico', title: 'Cinéticas', note: 'Energía: ondas de choque, anillos, rayos, estelas y ripples.' },
  { key: 'profundidad', title: 'Profundidad 3D', note: 'Volteos, giros de moneda, extrusión isométrica y ondeo — 3D fingido con escala/skew.' },
  { key: 'glitch', title: 'Glitch / Digital', note: 'RGB tear, scanlines CRT, lluvia matrix, holograma y disolución en píxeles.' },
  { key: 'naturaleza', title: 'Naturaleza', note: 'Llama, rayo, brasas, nieve, burbujas y auroras — física con senos y ruido semilla.' },
  { key: 'ui', title: 'UI / Data', note: 'Ecualizador, barras que crecen, spinner, check y radar — motion de producto.' },
]
export const FX = [
  { id: 'despegue-gelatina', cat: 'liquido', label: 'Despegue gelatina', dur: 2.6, params: { size: 62 } },
  { id: 'gota-cae', cat: 'liquido', label: 'Gota que cae', dur: 2.4, params: { size: 46 } },
  { id: 'blob-fusion', cat: 'liquido', label: 'Blobs que se funden', dur: 2.8, params: { size: 44 } },
  { id: 'blob-respira', cat: 'liquido', label: 'Blob que respira', dur: 3.0, params: { size: 60 } },
  { id: 'metamorfosis', cat: 'liquido', label: 'Metamorfosis de formas', dur: 4.0, params: { size: 56 } },
  { id: 'mancha-tinta', cat: 'liquido', label: 'Mancha de tinta', dur: 2.6, params: { size: 58 } },
  { id: 'pop-elastico', cat: 'elastico', label: 'Pop elástico', dur: 2.0, params: { size: 58, shape: 'circle' } },
  { id: 'rebote-squash', cat: 'elastico', label: 'Rebote con squash', dur: 2.0, params: { size: 40 } },
  { id: 'gelatina-cubo', cat: 'elastico', label: 'Cubo de gelatina', dur: 2.4, params: { size: 54 } },
  { id: 'banda-elastica', cat: 'elastico', label: 'Banda elástica', dur: 2.2, params: { size: 50 } },
  { id: 'latido', cat: 'elastico', label: 'Latido', dur: 2.0, params: { size: 48 } },
  { id: 'sacudida', cat: 'elastico', label: 'Sacudida', dur: 2.0, params: { size: 52, shape: 'square' } },
  { id: 'ensamble', cat: 'particulas', label: 'Ensamble de partículas', dur: 2.6, params: { size: 66 } },
  { id: 'desintegra', cat: 'particulas', label: 'Desintegración', dur: 2.6, params: { size: 66 } },
  { id: 'confeti', cat: 'particulas', label: 'Confeti', dur: 2.4, params: { size: 60 } },
  { id: 'chispas', cat: 'particulas', label: 'Chispas', dur: 2.6, params: { size: 60 } },
  { id: 'polvo-orbital', cat: 'particulas', label: 'Polvo orbital', dur: 4.0, params: { size: 70 } },
  { id: 'enjambre', cat: 'particulas', label: 'Enjambre', dur: 4.0, params: { size: 64 } },
  { id: 'trazo-circulo', cat: 'reveal', label: 'Trazo de círculo', dur: 2.4, params: { size: 62 } },
  { id: 'contador-arco', cat: 'reveal', label: 'Contador de arco', dur: 2.6, params: { size: 62 } },
  { id: 'barrido', cat: 'reveal', label: 'Barrido', dur: 2.4, params: { size: 60 } },
  { id: 'iris', cat: 'reveal', label: 'Iris', dur: 2.4, params: { size: 66 } },
  { id: 'onda-choque', cat: 'kinetico', label: 'Onda de choque', dur: 2.4, params: { size: 70 } },
  { id: 'rayos-estallido', cat: 'kinetico', label: 'Rayos estallido', dur: 2.2, params: { size: 68, count: 12 } },
  { id: 'pulso-anillos', cat: 'kinetico', label: 'Pulso de anillos', dur: 2.4, params: { size: 66 } },
  { id: 'giro-estela', cat: 'kinetico', label: 'Giro con estela', dur: 3.0, params: { size: 50 } },
  { id: 'ondas-agua', cat: 'kinetico', label: 'Ondas de agua', dur: 3.0, params: { size: 68 } },
  { id: 'taffy', cat: 'liquido', label: 'Taffy (caramelo)', dur: 2.4, params: { size: 42 } },
  { id: 'llenado-liquido', cat: 'liquido', label: 'Llenado líquido', dur: 3.0, params: { size: 62 } },
  { id: 'luz-barrido', cat: 'reveal', label: 'Barrido de luz', dur: 2.6, params: { size: 64, shape: 'rect' } },
  { id: 'resplandor', cat: 'kinetico', label: 'Resplandor (bloom)', dur: 2.4, params: { size: 44, shape: 'circle' } },
  { id: 'aberracion', cat: 'kinetico', label: 'Aberración cromática', dur: 2.2, params: { size: 54, shape: 'circle' } },
  { id: 'cromo-liquido', cat: 'liquido', label: 'Cromo líquido', dur: 4.0, params: { size: 62 } },
  { id: 'lampara-lava', cat: 'liquido', label: 'Lámpara de lava', dur: 5.0, params: { size: 40 } },
  { id: 'remolino-drenaje', cat: 'liquido', label: 'Remolino / drenaje', dur: 3.0, params: { size: 66 } },
  { id: 'rebote-tension', cat: 'liquido', label: 'Tensión superficial', dur: 2.6, params: { size: 58 } },
  { id: 'ondas-interferencia', cat: 'liquido', label: 'Interferencia', dur: 3.0, params: { size: 70 } },
  { id: 'card-flip', cat: 'profundidad', label: 'Volteo de tarjeta', dur: 3.0, params: { size: 60 } },
  { id: 'coin-spin', cat: 'profundidad', label: 'Moneda que gira', dur: 2.4, params: { size: 56 } },
  { id: 'iso-extrude', cat: 'profundidad', label: 'Extrusión isométrica', dur: 2.6, params: { size: 46 } },
  { id: 'depth-pop', cat: 'profundidad', label: 'Salto de profundidad', dur: 2.4, params: { size: 54, shape: 'circle' } },
  { id: 'flag-ondea', cat: 'profundidad', label: 'Bandera que ondea', dur: 3.0, params: { size: 62 } },
  { id: 'ribbon-twist', cat: 'profundidad', label: 'Cinta que se retuerce', dur: 3.0, params: { size: 60 } },
  { id: 'rgb-tear', cat: 'glitch', label: 'RGB tear', dur: 2.4, params: { size: 54, shape: 'rect' } },
  { id: 'crt-scan', cat: 'glitch', label: 'Scanlines CRT', dur: 2.6, params: { size: 64 } },
  { id: 'matrix-rain', cat: 'glitch', label: 'Lluvia matrix', dur: 3.0, params: { size: 64 } },
  { id: 'holograma', cat: 'glitch', label: 'Holograma', dur: 2.6, params: { size: 58, shape: 'hexagon' } },
  { id: 'pixel-dissolve', cat: 'glitch', label: 'Disolución en píxeles', dur: 2.6, params: { size: 60 } },
  { id: 'llama-vela', cat: 'naturaleza', label: 'Llama de vela', dur: 2.4, params: { size: 50 } },
  { id: 'rayo', cat: 'naturaleza', label: 'Rayo', dur: 2.4, params: { size: 60 } },
  { id: 'brasas', cat: 'naturaleza', label: 'Brasas', dur: 3.0, params: { size: 64 } },
  { id: 'nieve', cat: 'naturaleza', label: 'Nieve', dur: 4.0, params: { size: 66 } },
  { id: 'burbujas', cat: 'naturaleza', label: 'Burbujas', dur: 4.0, params: { size: 64 } },
  { id: 'aurora', cat: 'naturaleza', label: 'Aurora', dur: 4.0, params: { size: 70 } },
  { id: 'eq-barras', cat: 'ui', label: 'Ecualizador', dur: 2.4, params: { size: 58 } },
  { id: 'barras-crecen', cat: 'ui', label: 'Barras que crecen', dur: 2.4, params: { size: 58 } },
  { id: 'spinner-gusano', cat: 'ui', label: 'Spinner gusano', dur: 2.0, params: { size: 60 } },
  { id: 'check-draw', cat: 'ui', label: 'Check animado', dur: 2.4, params: { size: 58 } },
  { id: 'radar', cat: 'ui', label: 'Radar', dur: 3.0, params: { size: 66 } },
]
export const FX_IDS = FX.map(f => f.id)
const BY_ID = new Map(FX.map(f => [f.id, f]))

// drawFX(ctx, id, ts, dur, { x, y, pal, params }) — mismo contrato que drawObject
export function drawFX(ctx, id, ts, dur, info) {
  const fn = FN[id]; if (!fn) return
  const def = BY_ID.get(id) || {}
  const p = { ...(def.params || {}), ...(info.params || {}) }
  fn(ctx, ts, dur || def.dur || 2.5, info.x, info.y, info.pal, p)
}
