// motionDemo.js — demos PUROS y deterministas que ejercen motion2d (POC 2).
// Los usa la seccion "Motion (lab)" del sidebar Y mi renderer offline (tools/render.mjs), asi lo que
// veo en PNG es lo mismo que se ve en la app. drawMotionDemo(ctx, t, kind, {accent}) dibuja en el
// espacio logico 405x720 (igual que engineCore).
import { EASES, ease, buildPath, samplePath, shapeRadii, morphRadii, radiiToPoints, tracePolygon, staggerProgress, TAU, lerp } from './motion2d.js'

const W = 405, H = 720
export const MOTION_KINDS = ['eases', 'path', 'morph', 'stagger']

function rgba(hex, a) {
  if (typeof hex !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(hex)) return `rgba(90,160,255,${a})`
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}
function bg(ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#0e1017'); g.addColorStop(1, '#06070c')
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
}

const EASE_DEMO = ['linear', 'outQuad', 'outCubic', 'outQuint', 'outExpo', 'outBack', 'outElastic', 'outBounce']
function drawEases(ctx, t, accent) {
  ctx.fillStyle = '#e8ecf5'; ctx.font = 'bold 17px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
  ctx.fillText('Easings premium', 24, 38)
  const cycle = 2.8, local = t % cycle, p = ease('linear', Math.min(local / 1.7, 1))
  const top = 78, bottom = H - 40, n = EASE_DEMO.length, gap = (bottom - top) / (n - 1)
  const x0 = 150, x1 = W - 36
  EASE_DEMO.forEach((name, i) => {
    const y = top + i * gap
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke()
    ctx.fillStyle = '#9aa3b2'; ctx.font = '13px sans-serif'; ctx.textAlign = 'left'
    ctx.fillText(name, 20, y)
    const x = lerp(x0, x1, ease(name, p))
    ctx.beginPath(); ctx.fillStyle = rgba(accent, 0.25); ctx.arc(x, y, 13, 0, TAU); ctx.fill()
    ctx.beginPath(); ctx.fillStyle = rgba(accent, 1); ctx.arc(x, y, 7, 0, TAU); ctx.fill()
  })
}

const PATH_PTS = [[58, 130], [338, 210], [70, 360], [346, 470], [110, 612], [330, 648]]
function drawPath(ctx, t, accent) {
  const path = buildPath(PATH_PTS)
  ctx.fillStyle = '#e8ecf5'; ctx.font = 'bold 17px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
  ctx.fillText('Motion path (recorrido por curva)', 24, 38)
  // traza la curva tenue
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 2; ctx.beginPath()
  path.pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke()
  const prog = ease('inOutCubic', (t % 4) / 4)
  // estela
  for (let k = 14; k >= 1; k--) {
    const tp = prog - k * 0.014
    if (tp < 0) continue
    const s = samplePath(path, tp)
    ctx.beginPath(); ctx.fillStyle = rgba(accent, 0.04 + 0.05 * (1 - k / 14)); ctx.arc(s.x, s.y, 10 - k * 0.4, 0, TAU); ctx.fill()
  }
  const h = samplePath(path, prog)
  ctx.beginPath(); ctx.fillStyle = rgba(accent, 0.22); ctx.arc(h.x, h.y, 22, 0, TAU); ctx.fill()
  ctx.beginPath(); ctx.fillStyle = rgba(accent, 1); ctx.arc(h.x, h.y, 11, 0, TAU); ctx.fill()
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(h.x - Math.cos(h.angle) * 0, h.y, 3.5, 0, TAU); ctx.fill()
}

const MORPH_SEQ = ['circle', 'square', 'star5', 'heart', 'flower', 'hexagon', 'blob']
function drawMorph(ctx, t, accent) {
  ctx.fillStyle = '#e8ecf5'; ctx.font = 'bold 17px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
  ctx.fillText('Morph entre formas arbitrarias', 24, 38)
  const per = 1.15, tt = t / per, idx = Math.floor(tt) % MORPH_SEQ.length, nxt = (idx + 1) % MORPH_SEQ.length
  const local = ease('inOutCubic', tt % 1)
  const radii = morphRadii(shapeRadii(MORPH_SEQ[idx]), shapeRadii(MORPH_SEQ[nxt]), local)
  const cx = W / 2, cy = H * 0.44, R = 156
  const pts = radiiToPoints(radii, cx, cy, R, t * 0.18)
  const g = ctx.createRadialGradient(cx - 30, cy - 30, 10, cx, cy, R * 1.2)
  g.addColorStop(0, rgba(accent, 0.95)); g.addColorStop(1, rgba(accent, 0.45))
  ctx.save(); ctx.shadowColor = rgba(accent, 0.5); ctx.shadowBlur = 40
  tracePolygon(ctx, pts); ctx.fillStyle = g; ctx.fill(); ctx.restore()
  ctx.fillStyle = '#9aa3b2'; ctx.font = '14px sans-serif'; ctx.textAlign = 'center'
  ctx.fillText(`${MORPH_SEQ[idx]} -> ${MORPH_SEQ[nxt]}`, cx, H - 70)
}

function drawStagger(ctx, t, accent) {
  ctx.fillStyle = '#e8ecf5'; ctx.font = 'bold 17px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
  ctx.fillText('Stagger (cascada con overshoot)', 24, 38)
  const n = 7, cycle = 3.2, gt = t % cycle
  const baseY = H * 0.72, maxH = 300, bw = 34, gap = 14
  const totalW = n * bw + (n - 1) * gap, x0 = (W - totalW) / 2
  for (let i = 0; i < n; i++) {
    const p = staggerProgress(i, n, gt, { each: 0.09, dur: 0.7, from: 'start' })
    const hgt = ease('outBack', p) * maxH * (0.5 + 0.5 * ((i % 3) + 1) / 3)
    const x = x0 + i * (bw + gap)
    ctx.fillStyle = rgba(accent, 0.5 + 0.5 * p)
    ctx.beginPath(); ctx.roundRect(x, baseY - hgt, bw, hgt, 8); ctx.fill()
  }
}

export function drawMotionDemo(ctx, t, kind, opts = {}) {
  const accent = opts.accent || '#5aa0ff'
  bg(ctx)
  if (kind === 'path') return drawPath(ctx, t, accent)
  if (kind === 'morph') return drawMorph(ctx, t, accent)
  if (kind === 'stagger') return drawStagger(ctx, t, accent)
  return drawEases(ctx, t, accent)
}
