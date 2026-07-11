// templates · RENDER — el reproductor. drawTemplateFrame(ctx, t, rv) reproduce un template YA resuelto
// (slots rellenados + paleta derivada) como funcion PURA de t (determinismo/seek gratis), usando las
// primitivas de aemotion (texto animado, shapes, motion). Cada escena: fondo -> capas en orden.
import {
  drawShape, circlePath, rectPath, starPath, linePath, polygonPath,
  drawAnimatedText, wrapFit, drawText, fitFont,
  clamp, rgba, fontStr, TAU, win, expoOut, spring,
} from '../aemotion/index.js'
import { resolveColor } from './palette.js'
import { animState } from './anim.js'

function sceneAt(rv, t) { const ss = rv.scenes; for (let i = ss.length - 1; i >= 0; i--) if (t >= ss[i].t0) return ss[i]; return ss[0] }

function paintBackground(ctx, bg, ts, pal, W, H) {
  const kind = (bg && bg.kind) || 'solid'
  const c1 = resolveColor((bg && bg.color1) || 'bg', pal)
  const c2 = resolveColor((bg && bg.color2) || 'surface', pal)
  ctx.fillStyle = c1; ctx.fillRect(0, 0, W, H)
  if (kind === 'gradient') { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, c1); g.addColorStop(1, c2); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H) }
  else if (kind === 'glow') {
    const acc = resolveColor((bg && bg.accent) || 'accent', pal)
    const cx = W * 0.32, cy = H * 0.28
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.8)
    g.addColorStop(0, rgba(acc, 0.18)); g.addColorStop(0.55, rgba(acc, 0.05)); g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, H * 0.8); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.28)'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H)
  } else if (kind === 'grid') {
    ctx.save(); ctx.strokeStyle = rgba(resolveColor('ink', pal), 0.06); ctx.lineWidth = 1
    const step = (bg && bg.step) || 28
    ctx.beginPath(); for (let x = step; x < W; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, H) } for (let y = step; y < H; y += step) { ctx.moveTo(0, y); ctx.lineTo(W, y) } ctx.stroke(); ctx.restore()
  } else if (kind === 'accent') { ctx.fillStyle = resolveColor((bg && bg.accent) || 'accent', pal); ctx.fillRect(0, 0, W, H) }
}

const SHAPES = {
  rect: (x, y, s) => rectPath(x - s.w / 2, y - s.h / 2, s.w, s.h, s.r || 0),
  circle: (x, y, s) => circlePath(x, y, s.r || 40),
  star: (x, y, s) => starPath(x, y, s.r || 50, (s.r || 50) * 0.44, s.points || 5),
  poly: (x, y, s) => polygonPath(x, y, s.r || 50, s.sides || 6),
  line: (x, y, s) => linePath(x - (s.w || 100) / 2, y, x + (s.w || 100) / 2, y),
}

function renderLayer(ctx, layer, ts, sc, rv) {
  const { W, H, palette: pal } = rv
  const isLast = sc === rv.scenes[rv.scenes.length - 1]
  const st = animState(ts, sc.dur, layer, isLast)
  if (st.alpha <= 0.004) return
  const x = (layer.x == null ? 0.5 : layer.x) * W, y = (layer.y == null ? 0.5 : layer.y) * H

  ctx.save()
  ctx.globalAlpha *= clamp(st.alpha, 0, 1)
  ctx.translate(x + st.dx, y + st.dy)
  if (st.rot) ctx.rotate(st.rot)
  if (st.scale !== 1) ctx.scale(st.scale, st.scale)
  ctx.translate(-x, -y)

  if (layer.type === 'shape') {
    const s = layer.shapeStyle || {}
    const path = (SHAPES[layer.shape] || SHAPES.circle)(x, y, s)
    drawShape(ctx, ts, { path, fill: s.fill ? resolveColor(s.fill, pal) : null, stroke: s.stroke ? { color: resolveColor(s.stroke, pal), width: s.width || 3 } : null })
  } else if (layer.type === 'image') {
    const img = rv.getImg ? rv.getImg(layer.imageUrl || (rv.brief && rv.brief.mediaImage) || (rv.brief && (rv.brief.images || [])[0])) : null
    const s = layer.shapeStyle || {}, w = s.w || W * 0.6, h = s.h || w * 1.2
    ctx.save()
    if (img) {
      const p = rectPath(x - w / 2, y - h / 2, w, h, s.r || 8); ctx.beginPath()
      for (const seg of p) { if (seg.c === 'M') ctx.moveTo(seg.x, seg.y); else if (seg.c === 'L') ctx.lineTo(seg.x, seg.y); else if (seg.c === 'C') ctx.bezierCurveTo(seg.x1, seg.y1, seg.x2, seg.y2, seg.x, seg.y); else if (seg.c === 'Z') ctx.closePath() }
      ctx.clip()
      const iw = img.width || 1, ih = img.height || 1, k = Math.max(w / iw, h / ih)
      ctx.drawImage(img, (iw - w / k) / 2, (ih - h / k) / 2, w / k, h / k, x - w / 2, y - h / 2, w, h)
    } else { ctx.fillStyle = resolveColor('surface', pal); drawShape(ctx, ts, { path: rectPath(x - w / 2, y - h / 2, w, h, s.r || 8), fill: resolveColor('surface', pal), stroke: { color: rgba(resolveColor('ink', pal), 0.2), width: 2 } }) }
    ctx.restore()
  } else { // text
    renderText(ctx, layer, st, x, y, ts, sc, rv)
  }
  ctx.restore()
}

function renderText(ctx, layer, st, x, y, ts, sc, rv) {
  const { W, palette: pal } = rv
  const sty = layer.style || {}
  const color = resolveColor(sty.color || 'ink', pal)
  const weight = sty.weight || 800, family = sty.font || 'Arial', align = sty.align || 'center'
  const maxW = (sty.maxW || 0.86) * W, tracking = sty.tracking || 0
  const val = layer.resolved != null ? layer.resolved : (layer.text || '')

  // LISTA: cada item una linea (bullet + texto) alineada a la IZQUIERDA como bloque, revelado staggered
  if (Array.isArray(val)) {
    const dotX = x - maxW / 2 + 14, textX = x - maxW / 2 + 34, textMaxW = maxW - 40
    const longest = val.reduce((a, b) => (a.length > b.length ? a : b), '')
    const size = fitFont(ctx, longest, sty.size || Math.round(W * 0.09), textMaxW, 14, weight, family, tracking)
    const lh = size * 1.55
    val.forEach((ln, i) => {
      const yy = y + (i - (val.length - 1) / 2) * lh
      const e = expoOut(clamp(win(ts, 0.15 + i * 0.18, 0.9 + i * 0.18), 0, 1))
      ctx.save(); ctx.globalAlpha *= clamp(e * 1.3, 0, 1)
      ctx.fillStyle = resolveColor('accent', pal); ctx.beginPath(); ctx.arc(dotX + (1 - e) * -8, yy, 5, 0, TAU); ctx.fill()
      drawText(ctx, ln, textX, yy, { size, weight, family, color, align: 'left', maxW: textMaxW, tracking })
      ctx.restore()
    })
    return
  }

  const wr = wrapFit(ctx, String(val), sty.size || Math.round(W * 0.13), maxW, 14, weight, family, sty.maxLines || 3, tracking)
  const lineH = wr.size * (sty.leading || 1.06)
  // cascada per-caracter con el barrido de entrada
  if ((layer.anim && layer.anim.in) === 'cascade') {
    const y0 = y - ((wr.lines.length - 1) / 2) * lineH
    wr.lines.forEach((ln, i) => {
      const off = -0.6 + win(ts, (layer.anim.delay || 0) + i * 0.22, (layer.anim.delay || 0) + 1.2 + i * 0.22) * 1.75
      drawAnimatedText(ctx, ts, { text: ln, x, y: y0 + i * lineH + wr.size * 0.34, size: wr.size, weight, family, fill: color, tracking, align,
        animators: [{ sel: { start: 0, end: 0.42, offset: off, shape: 'rampUp' }, props: { y: wr.size * 0.42, alpha: 0, rot: 0.08, scale: 0.88 } }] })
    })
    return
  }
  ctx.font = fontStr(weight, wr.size, family); ctx.letterSpacing = tracking + 'px'
  ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillStyle = color
  const y0 = y - ((wr.lines.length - 1) / 2) * lineH
  wr.lines.forEach((ln, i) => ctx.fillText(ln, align === 'left' ? x - maxW / 2 : align === 'right' ? x + maxW / 2 : x, y0 + i * lineH))
}

export function drawTemplateFrame(ctx, t, rv) {
  const W = rv.W, H = rv.H
  t = clamp(t, 0, Math.max(0.001, rv.duration - 0.0001))
  try { ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high' } catch { /* noop */ }
  const sc = sceneAt(rv, t)
  const ts = Math.max(0, t - sc.t0)
  paintBackground(ctx, sc.background, ts, rv.palette, W, H)
  const layers = sc.layers || []
  for (let i = 0; i < layers.length; i++) { const l = layers[i]; l._i = i; renderLayer(ctx, l, ts, sc, rv) }
  // grain sutil (acabado)
  if (rv.grain !== false) { /* reservado */ }
}
