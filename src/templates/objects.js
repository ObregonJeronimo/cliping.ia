// templates · OBJETOS ANIMADOS (prefabs calibre AE). Cada objeto es una capa autocontenida con su
// PROPIA animacion interna (funcion de ts, el tiempo local de la escena): reusan las primitivas de
// aemotion (morph real de paths, trim paths, metaballs, springs). Determinista, puro. El editor los
// ofrece como "capa objeto"; yo (Claude) los autoro por id + params al construir escenas.
import {
  circlePath, rectPath, starPath, polygonPath, linePath, parsePath,
  tracePath, drawShape, pathMorph, metaballPath, measure, pointAt,
  spring, win, cubicOut, expoOut, TAU, clamp, rgba, seedFor,
} from '../aemotion/index.js'
import { resolveColor } from './palette.js'

const PI = Math.PI
// gota (teardrop): redonda abajo, punta arriba
export function dropPath(cx, cy, r) {
  return [
    { c: 'M', x: cx, y: cy - 1.5 * r },
    { c: 'C', x1: cx + 1.1 * r, y1: cy - 0.7 * r, x2: cx + r, y2: cy + 0.2 * r, x: cx + r * 0.72, y: cy + 0.7 * r },
    { c: 'C', x1: cx + 0.32 * r, y1: cy + 1.15 * r, x2: cx - 0.32 * r, y2: cy + 1.15 * r, x: cx - r * 0.72, y: cy + 0.7 * r },
    { c: 'C', x1: cx - r, y1: cy + 0.2 * r, x2: cx - 1.1 * r, y2: cy - 0.7 * r, x: cx, y: cy - 1.5 * r },
    { c: 'Z' },
  ]
}
const buildShape = (kind, cx, cy, r) => (
  kind === 'circle' ? circlePath(cx, cy, r) :
  kind === 'square' || kind === 'rect' ? rectPath(cx - r, cy - r, r * 2, r * 2, r * 0.14) :
  kind === 'star' ? starPath(cx, cy, r, r * 0.45, 5) :
  kind === 'triangle' ? polygonPath(cx, cy, r, 3) :
  kind === 'hexagon' ? polygonPath(cx, cy, r, 6) :
  kind === 'drop' ? dropPath(cx, cy, r * 0.8) :
  circlePath(cx, cy, r)
)

// fill que puede ser TOKEN, hex o GRADIENTE ({ gradient:['a','b'], angle })
function fillStyle(ctx, fill, pal, cx, cy, r) {
  if (fill && fill.gradient) {
    const a = (fill.angle || 45) * PI / 180
    const g = ctx.createLinearGradient(cx - Math.cos(a) * r, cy - Math.sin(a) * r, cx + Math.cos(a) * r, cy + Math.sin(a) * r)
    g.addColorStop(0, resolveColor(fill.gradient[0], pal)); g.addColorStop(1, resolveColor(fill.gradient[1], pal))
    return g
  }
  return resolveColor(fill || 'accent', pal)
}
function paintPath(ctx, path, { fill, stroke, width, glow, glowColor, pal, cx, cy, r }) {
  if (glow > 0.03) { ctx.save(); ctx.shadowColor = resolveColor(glowColor || (fill && fill.gradient ? fill.gradient[0] : fill) || 'accent', pal); ctx.shadowBlur = 34 * glow }
  if (fill) { tracePath(ctx, path); ctx.fillStyle = fillStyle(ctx, fill, pal, cx, cy, r); ctx.fill() }
  if (glow > 0.03) ctx.restore()
  if (stroke) { tracePath(ctx, path); ctx.strokeStyle = resolveColor(stroke, pal); ctx.lineWidth = width || 3; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke() }
}

const _morphCache = new Map()
function morphOf(from, to, cx, cy, r) {
  const k = from + '>' + to + '|' + Math.round(r)
  let f = _morphCache.get(k)
  if (!f) { f = pathMorph(buildShape(from, cx, cy, r), buildShape(to, cx, cy, r), { n: 140 }); if (_morphCache.size > 80) _morphCache.clear(); _morphCache.set(k, f) }
  return f
}

// catalogo (id -> label + params por defecto). El editor lo lista; yo lo referencio por id.
export const OBJECTS = [
  { id: 'spin', label: 'Forma que gira', params: { shape: 'square', size: 60, degPerSec: 90, fill: 'accent', stroke: '', width: 3, glow: 0.3 } },
  { id: 'morph', label: 'Morphing (forma a forma)', params: { from: 'square', to: 'drop', size: 62, degPerSec: 0, loop: true, fill: { gradient: ['accent', 'accent2'], angle: 60 }, glow: 0.7 } },
  { id: 'line-draw', label: 'Linea que se extiende', params: { len: 220, angle: 0, curve: 0, width: 5, color: 'accent', glow: 0.4, dur: 1.2 } },
  { id: 'pulse', label: 'Anillos que laten', params: { rings: 3, r: 40, color: 'accent', width: 2, period: 1.8 } },
  { id: 'orbit', label: 'Puntos en orbita', params: { count: 3, r: 70, dot: 6, color: 'accent', secPerTurn: 6, glow: 0.4 } },
  { id: 'blob', label: 'Blob organico (respira)', params: { r: 60, amp: 8, fill: { gradient: ['accent', 'accent2'], angle: 45 }, glow: 0.6 } },
  { id: 'metaball', label: 'Gotas que se funden', params: { r1: 34, r2: 24, gap: 70, color: 'accent', glow: 0.5, period: 3 } },
  { id: 'grow-bar', label: 'Barra que crece', params: { w: 220, h: 14, color: 'accent', dir: 'h', dur: 0.7 } },
  { id: 'ring-trim', label: 'Anillo que se dibuja', params: { r: 80, width: 4, color: 'accent', glow: 0.4, dur: 1.4, spinSec: 8 } },
]
export const OBJECT_IDS = OBJECTS.map(o => o.id)

// drawObject(ctx, objectId, ts, dur, { x, y, pal, params }) — dibuja el objeto centrado en (x,y)
export function drawObject(ctx, objectId, ts, dur, info) {
  const { x, y, pal } = info
  const p = { ...(OBJECTS.find(o => o.id === objectId)?.params || {}), ...(info.params || {}) }
  const spin = ts * (p.degPerSec || 0) * PI / 180
  ctx.save(); ctx.translate(x, y); ctx.rotate(spin); ctx.translate(-x, -y)

  if (objectId === 'spin') {
    paintPath(ctx, buildShape(p.shape, x, y, p.size), { fill: p.fill || null, stroke: p.stroke || null, width: p.width, glow: p.glow, pal, cx: x, cy: y, r: p.size })
  } else if (objectId === 'morph') {
    const interp = morphOf(p.from, p.to, x, y, p.size)
    const raw = clamp(ts / Math.max(0.6, dur * 0.7), 0, 1)
    const mp = p.loop ? (0.5 - 0.5 * Math.cos(raw * TAU)) : cubicOut(raw)
    paintPath(ctx, interp(mp), { fill: p.fill, glow: p.glow, pal, cx: x, cy: y, r: p.size })
  } else if (objectId === 'blob') {
    const r = seedFor(7, 'tpl.blob'); const N = 40; const path = []
    for (let i = 0; i <= N; i++) { const a = (i / N) * TAU; const rr = p.r * (1 + 0.06 * Math.sin(3 * a + ts * 0.9) + 0.04 * Math.sin(5 * a - ts * 0.6)) + Math.sin(ts * 0.4) * 0; path.push({ c: i ? 'L' : 'M', x: x + Math.cos(a) * rr, y: y + Math.sin(a) * rr }) }
    path.push({ c: 'Z' })
    paintPath(ctx, path, { fill: p.fill, glow: p.glow, pal, cx: x, cy: y, r: p.r })
  } else if (objectId === 'line-draw') {
    const e = expoOut(clamp(win(ts, 0.1, 0.1 + (p.dur || 1.2)), 0, 1))
    const a = (p.angle || 0) * PI / 180, L = p.len
    const path = p.curve ? parsePath(`M ${x - Math.cos(a) * L / 2} ${y - Math.sin(a) * L / 2} Q ${x} ${y - p.curve} ${x + Math.cos(a) * L / 2} ${y + Math.sin(a) * L / 2}`) : linePath(x - Math.cos(a) * L / 2, y - Math.sin(a) * L / 2, x + Math.cos(a) * L / 2, y + Math.sin(a) * L / 2)
    drawShape(ctx, ts, { path, stroke: { color: resolveColor(p.color, pal), width: p.width || 5 }, trim: { start: 0, end: e } })
    if (p.glow > 0.03) { ctx.save(); ctx.shadowColor = resolveColor(p.color, pal); ctx.shadowBlur = 20 * p.glow; drawShape(ctx, ts, { path, stroke: { color: resolveColor(p.color, pal), width: p.width || 5 }, trim: { start: 0, end: e } }); ctx.restore() }
  } else if (objectId === 'pulse') {
    for (let i = 0; i < (p.rings || 3); i++) { const ph = ((ts - i * (p.period || 1.8) / (p.rings || 3)) / (p.period || 1.8)) % 1; if (ph <= 0) continue; ctx.save(); ctx.globalAlpha *= (1 - ph) * 0.8; ctx.strokeStyle = resolveColor(p.color, pal); ctx.lineWidth = p.width || 2; ctx.beginPath(); ctx.arc(x, y, p.r + ph * p.r * 2, 0, TAU); ctx.stroke(); ctx.restore() }
  } else if (objectId === 'orbit') {
    for (let i = 0; i < (p.count || 3); i++) { const a = ts * TAU / (p.secPerTurn || 6) + i * TAU / (p.count || 3); const ox = x + Math.cos(a) * p.r, oy = y + Math.sin(a) * p.r; if (p.glow > 0.03) { ctx.save(); ctx.shadowColor = resolveColor(p.color, pal); ctx.shadowBlur = 16 * p.glow; ctx.fillStyle = resolveColor(p.color, pal); ctx.beginPath(); ctx.arc(ox, oy, p.dot || 6, 0, TAU); ctx.fill(); ctx.restore() } else { ctx.fillStyle = resolveColor(p.color, pal); ctx.beginPath(); ctx.arc(ox, oy, p.dot || 6, 0, TAU); ctx.fill() } }
  } else if (objectId === 'metaball') {
    const move = (0.5 - 0.5 * Math.cos((ts / (p.period || 3)) * TAU)) * p.gap
    const x1 = x - p.gap / 2 + move * 0.5, x2 = x + p.gap / 2 - move * 0.5
    const col = resolveColor(p.color, pal)
    if (p.glow > 0.03) { ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 24 * p.glow }
    ctx.fillStyle = col
    tracePath(ctx, circlePath(x1, y, p.r1)); ctx.fill(); tracePath(ctx, circlePath(x2, y, p.r2)); ctx.fill()
    const mem = metaballPath(x1, y, p.r1, x2, y, p.r2, { v: 0.5 }); if (mem) { tracePath(ctx, mem); ctx.fill() }
    if (p.glow > 0.03) ctx.restore()
  } else if (objectId === 'grow-bar') {
    const e = spring(win(ts, 0.05, 0.05 + (p.dur || 0.7)), 0.62, 13)
    const w = (p.dir === 'v' ? p.w : p.w) * (p.dir === 'v' ? 1 : e), h = (p.dir === 'v' ? p.h * e : p.h)
    ctx.fillStyle = resolveColor(p.color, pal); tracePath(ctx, rectPath(x - w / 2, y - h / 2, w, h, Math.min(w, h) / 2)); ctx.fill()
  } else if (objectId === 'ring-trim') {
    const e = expoOut(clamp(win(ts, 0.1, 0.1 + (p.dur || 1.4)), 0, 1))
    ctx.save(); ctx.translate(x, y); ctx.rotate(ts * TAU / (p.spinSec || 8)); ctx.translate(-x, -y)
    drawShape(ctx, ts, { path: circlePath(x, y, p.r), stroke: { color: resolveColor(p.color, pal), width: p.width || 4 }, trim: { start: 0, end: e * 0.82 } })
    if (p.glow > 0.03) { ctx.save(); ctx.shadowColor = resolveColor(p.color, pal); ctx.shadowBlur = 18 * p.glow; drawShape(ctx, ts, { path: circlePath(x, y, p.r), stroke: { color: resolveColor(p.color, pal), width: p.width || 4 }, trim: { start: 0, end: e * 0.82 } }); ctx.restore() }
    ctx.restore()
  }
  ctx.restore()
}
