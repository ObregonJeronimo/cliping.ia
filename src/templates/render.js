// templates · RENDER — el reproductor. drawTemplateFrame(ctx, t, rv) reproduce un template resuelto
// como funcion PURA de t, usando las primitivas de aemotion. Cada escena: fondo -> capas en orden.
// Soporta: texto (fijo/slot/cascada), formas (relleno solido o DEGRADADO + glow), OBJETOS animados
// (objects.js), imagenes, y KEYFRAMES por propiedad (x/y/scale/rot/opacity via el speed-graph de aemotion).
import {
  drawShape, circlePath, rectPath, starPath, linePath, polygonPath, tracePath,
  drawAnimatedText, wrapFit, drawText, fitFont, track,
  clamp, rgba, fontStr, TAU, win, expoOut,
} from '../aemotion/index.js'
import { resolveColor } from './palette.js'
import { animState } from './anim.js'
import { drawObject } from './objects.js'
import { paintTemplateBackground } from './backgrounds.js'

function sceneAt(rv, t) { const ss = rv.scenes; for (let i = ss.length - 1; i >= 0; i--) if (t >= ss[i].t0) return ss[i]; return ss[0] }

// KEYFRAMES: una propiedad puede ser un numero o { keys:[{t,v}...] } (tiempo local de escena). track()
// de aemotion la evalua con speed-graph (Easy Ease por defecto). Cachea el evaluador en la prop.
function kf(prop, ts, deflt) {
  if (prop == null) return deflt
  if (typeof prop === 'object' && Array.isArray(prop.keys)) { if (!prop._trk) prop._trk = track(prop.keys); return prop._trk(ts) }
  return prop
}

const SHAPES = {
  rect: (x, y, s) => rectPath(x - (s.w || 100) / 2, y - (s.h || 60) / 2, s.w || 100, s.h || 60, s.r || 0),
  circle: (x, y, s) => circlePath(x, y, s.r || 40),
  star: (x, y, s) => starPath(x, y, s.r || 50, (s.r || 50) * 0.44, s.points || 5),
  poly: (x, y, s) => polygonPath(x, y, s.r || 50, s.sides || 6),
  line: (x, y, s) => linePath(x - (s.w || 100) / 2, y, x + (s.w || 100) / 2, y),
}
function fillStyleOf(ctx, fill, pal, x, y, r) {
  if (fill && fill.gradient) { const a = (fill.angle || 45) * Math.PI / 180; const g = ctx.createLinearGradient(x - Math.cos(a) * r, y - Math.sin(a) * r, x + Math.cos(a) * r, y + Math.sin(a) * r); g.addColorStop(0, resolveColor(fill.gradient[0], pal)); g.addColorStop(1, resolveColor(fill.gradient[1], pal)); return g }
  return resolveColor(fill, pal)
}

function renderLayer(ctx, layer, ts, sc, rv) {
  const { W, H, palette: pal } = rv
  const isLast = sc === rv.scenes[rv.scenes.length - 1]
  const st = animState(ts, sc.dur, layer, isLast)
  const opacity = kf(layer.opacity, ts, 1)
  const alpha = st.alpha * opacity
  if (alpha <= 0.004) return
  const x = kf(layer.x, ts, 0.5) * W, y = kf(layer.y, ts, 0.5) * H
  const scale = st.scale * kf(layer.scale, ts, 1)
  const rot = st.rot + kf(layer.rot, ts, 0)

  ctx.save()
  ctx.globalAlpha *= clamp(alpha, 0, 1)
  ctx.translate(x + st.dx, y + st.dy)
  if (rot) ctx.rotate(rot)
  if (scale !== 1) ctx.scale(scale, scale)
  ctx.translate(-x, -y)

  if (layer.type === 'object') {
    drawObject(ctx, layer.objectId || 'spin', ts, sc.dur, { x, y, pal, params: layer.params })
  } else if (layer.type === 'shape') {
    const s = layer.shapeStyle || {}
    const path = (SHAPES[layer.shape] || SHAPES.circle)(x, y, s)
    if (s.glow > 0.03) { ctx.save(); ctx.shadowColor = resolveColor(s.glowColor || (s.fill && s.fill.gradient ? s.fill.gradient[0] : s.fill) || 'accent', pal); ctx.shadowBlur = 30 * s.glow }
    if (s.fill) { tracePath(ctx, path); ctx.fillStyle = fillStyleOf(ctx, s.fill, pal, x, y, s.r || s.w || 60); ctx.fill() }
    if (s.glow > 0.03) ctx.restore()
    if (s.stroke) { tracePath(ctx, path); ctx.strokeStyle = resolveColor(s.stroke, pal); ctx.lineWidth = s.width || 3; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke() }
  } else if (layer.type === 'image') {
    const img = rv.getImg ? rv.getImg(layer.imageUrl || (rv.brief && rv.brief.mediaImage) || (rv.brief && (rv.brief.images || [])[0])) : null
    const s = layer.shapeStyle || {}, w = s.w || W * 0.6, h = s.h || w * 1.2
    ctx.save()
    if (img) {
      const p = rectPath(x - w / 2, y - h / 2, w, h, s.r || 8); tracePath(ctx, p); ctx.clip()
      const iw = img.width || 1, ih = img.height || 1, k = Math.max(w / iw, h / ih)
      ctx.drawImage(img, (iw - w / k) / 2, (ih - h / k) / 2, w / k, h / k, x - w / 2, y - h / 2, w, h)
    } else { tracePath(ctx, rectPath(x - w / 2, y - h / 2, w, h, s.r || 8)); ctx.fillStyle = resolveColor('surface', pal); ctx.fill(); ctx.strokeStyle = rgba(resolveColor('ink', pal), 0.2); ctx.lineWidth = 2; ctx.stroke() }
    ctx.restore()
  } else {
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
  paintTemplateBackground(ctx, sc.background, ts, rv.palette, W, H)
  const layers = sc.layers || []
  for (let i = 0; i < layers.length; i++) { const l = layers[i]; l._i = i; try { renderLayer(ctx, l, ts, sc, rv) } catch { /* capa problematica no rompe el frame */ } }
}

// hit-test: capa (id) mas cercana a un punto normalizado (para seleccionar en el lienzo)
export function hitTest(rv, sceneIdx, nx, ny) {
  const sc = rv.scenes[sceneIdx]; if (!sc) return null
  let best = null, bd = 1e9
  for (const l of sc.layers) { const lx = (typeof l.x === 'number' ? l.x : 0.5), ly = (typeof l.y === 'number' ? l.y : 0.5); const d = (lx - nx) ** 2 + (ly - ny) ** 2; if (d < bd) { bd = d; best = l } }
  return bd < 0.04 ? best?.id : null   // dentro de ~0.2 normalizado
}
