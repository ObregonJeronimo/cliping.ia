// templates · RENDER — el reproductor. drawTemplateFrame(ctx, t, rv) reproduce un template resuelto
// como funcion PURA de t, usando las primitivas de aemotion. Cada escena: fondo -> capas en orden.
// Soporta: texto (fijo/slot/cascada), formas (relleno solido o DEGRADADO + glow), OBJETOS animados
// (objects.js), imagenes, y KEYFRAMES por propiedad (x/y/scale/rot/opacity via el speed-graph de aemotion).
import {
  drawShape, circlePath, rectPath, starPath, linePath, polygonPath, tracePath,
  drawAnimatedText, wrapFit, drawText, fitFont, track,
  clamp, lerp, rgba, fontStr, TAU, win, expoOut, spring, backOut,
} from '../aemotion/index.js'
import { resolveColor } from './palette.js'
import { animState, cubicOut } from './anim.js'
import { drawObject } from './objects.js'
import { drawFX } from './fx.js'
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
  } else if (layer.type === 'fx') {
    drawFX(ctx, layer.fxId || 'blob-respira', ts, sc.dur, { x, y, pal, params: layer.params })
  } else if (layer.type === 'shape') {
    const s = layer.shapeStyle || {}
    const path = (SHAPES[layer.shape] || SHAPES.circle)(x, y, s)
    if (s.glow > 0.03) { ctx.save(); ctx.shadowColor = resolveColor(s.glowColor || (s.fill && s.fill.gradient ? s.fill.gradient[0] : s.fill) || 'accent', pal); ctx.shadowBlur = 30 * s.glow }
    if (s.fill) { tracePath(ctx, path); ctx.fillStyle = fillStyleOf(ctx, s.fill, pal, x, y, s.r || s.w || 60); ctx.fill() }
    if (s.glow > 0.03) ctx.restore()
    if (s.stroke) { tracePath(ctx, path); ctx.strokeStyle = resolveColor(s.stroke, pal); ctx.lineWidth = s.width || 3; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke() }
  } else if (layer.type === 'image') {
    const img = rv.getImg ? rv.getImg(layer.imageUrl || (rv.brief && rv.brief.mediaImage) || (rv.brief && (rv.brief.images || [])[0])) : null
    const s = layer.shapeStyle || {}, w = s.w || W * 0.6, h = s.h || w * 1.2, A = layer.anim || {}
    // rotacion 3D en Y: flip3d (entrada, de canto a frente) + wobble3d (idle, falsa profundidad)
    let angY = 0
    if (A.in === 'flip3d') angY += (1 - cubicOut(st.enterP)) * (Math.PI * 0.6)
    if (A.idle === 'wobble3d') angY += Math.sin(ts * 0.8 + (layer._i || 0)) * 0.11 * (st.enterP >= 0.99 ? 1 : 0)
    ctx.save()
    if (Math.abs(angY) > 0.001) { const sX = Math.max(Math.cos(angY), 0.04); ctx.translate(x, y); ctx.transform(sX, 0, 0, 1, 0, 0); ctx.translate(-x, -y) }
    ctx.save()
    const rectP = () => rectPath(x - w / 2, y - h / 2, w, h, s.r || 8)
    if (img) {
      tracePath(ctx, rectP()); ctx.clip()
      const iw = img.width || 1, ih = img.height || 1, k = Math.max(w / iw, h / ih)
      ctx.drawImage(img, (iw - w / k) / 2, (ih - h / k) / 2, w / k, h / k, x - w / 2, y - h / 2, w, h)
    } else if (s.placeholder === 'video') {
      const g = ctx.createLinearGradient(x - w / 2, y - h / 2, x + w / 2, y + h / 2); g.addColorStop(0, resolveColor('accent', pal)); g.addColorStop(1, resolveColor('accent2', pal))
      tracePath(ctx, rectP()); ctx.fillStyle = g; ctx.fill(); tracePath(ctx, rectP()); ctx.clip()
      const R = Math.min(w, h) * 0.15
      ctx.fillStyle = rgba('#ffffff', 0.92); ctx.beginPath(); ctx.arc(x, y - h * 0.06, R, 0, TAU); ctx.fill()
      ctx.fillStyle = resolveColor('bg', pal); ctx.beginPath(); ctx.moveTo(x - R * 0.35, y - h * 0.06 - R * 0.5); ctx.lineTo(x + R * 0.6, y - h * 0.06); ctx.lineTo(x - R * 0.35, y - h * 0.06 + R * 0.5); ctx.closePath(); ctx.fill()
      ctx.fillStyle = rgba('#ffffff', 0.85); tracePath(ctx, rectPath(x - w * 0.32, y + h * 0.2, w * 0.42, h * 0.09, 3)); ctx.fill()
      ctx.fillStyle = rgba('#ffffff', 0.4); tracePath(ctx, rectPath(x - w * 0.32, y + h * 0.33, w * 0.62, h * 0.06, 3)); ctx.fill()
    } else { tracePath(ctx, rectP()); ctx.fillStyle = resolveColor('surface', pal); ctx.fill(); ctx.strokeStyle = rgba(resolveColor('ink', pal), 0.2); ctx.lineWidth = 2; ctx.stroke() }
    if (Math.abs(angY) > 0.02) { const dir = Math.sin(angY), sg = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0); sg.addColorStop(0, rgba('#000000', Math.max(0, dir) * 0.45)); sg.addColorStop(0.5, rgba('#000000', 0)); sg.addColorStop(1, rgba('#000000', Math.max(0, -dir) * 0.45)); tracePath(ctx, rectP()); ctx.fillStyle = sg; ctx.fill() }
    ctx.restore()
    tracePath(ctx, rectP()); ctx.strokeStyle = rgba(resolveColor('ink', pal), 0.16); ctx.lineWidth = 1.5; ctx.stroke()
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

  const inKind = (layer.anim && layer.anim.in) || ''
  // KINETIC: revelado por PALABRA (bloques golpeados que entran desde la izquierda + leve zoom)
  if (inKind === 'kinetic') {
    const wr = wrapFit(ctx, String(val), sty.size || Math.round(W * 0.12), maxW, 14, weight, family, sty.maxLines || 3, tracking)
    const lineH = wr.size * (sty.leading || 1.16), y0 = y - ((wr.lines.length - 1) / 2) * lineH
    const delay = (layer.anim.delay || 0), stag = layer.anim.stagger || 0.14
    ctx.font = fontStr(weight, wr.size, family); ctx.letterSpacing = tracking + 'px'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'
    let wi = 0
    wr.lines.forEach((ln, li) => {
      const parts = ln.split(' '), lw = ctx.measureText(ln).width
      let cx = align === 'left' ? x - maxW / 2 : x - lw / 2
      parts.forEach((word, k) => {
        const seg = word + (k < parts.length - 1 ? ' ' : ''), sw = ctx.measureText(seg).width
        const rt = win(ts, delay + wi * stag, delay + wi * stag + 0.34)
        const e = expoOut(rt), al = clamp(rt * 2.4, 0, 1), scl = 1 + 0.12 * (1 - e), dx = (1 - e) * -24
        if (al > 0.003) {
          const ly = y0 + li * lineH, ax = cx + ctx.measureText(word).width / 2 + dx
          ctx.save(); ctx.globalAlpha *= al; ctx.translate(ax, ly); ctx.scale(scl, scl); ctx.translate(-ax, -ly)
          ctx.fillStyle = color; ctx.fillText(word, cx + dx, ly); ctx.restore()
        }
        cx += sw; wi++
      })
    })
    return
  }
  // TYPEWRITER: tipeo char-por-char con cursor parpadeante
  if (inKind === 'typewriter') {
    const full = String(val), size = fitFont(ctx, full, sty.size || Math.round(W * 0.1), maxW, 14, weight, family, tracking)
    ctx.font = fontStr(weight, size, family); ctx.letterSpacing = tracking + 'px'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'
    const cps = layer.anim.cps || 18, delay = layer.anim.delay || 0
    const n = Math.floor(clamp((ts - delay) * cps, 0, full.length)), shown = full.slice(0, n)
    const tw = ctx.measureText(full).width, x0 = x - tw / 2
    ctx.fillStyle = color; ctx.fillText(shown, x0, y)
    const cw = ctx.measureText(shown).width, done = n >= full.length
    if (done ? (Math.sin(ts * 6) > 0) : true) { ctx.fillStyle = resolveColor('accent', pal); ctx.fillRect(x0 + cw + 4, y - size * 0.44, Math.max(2, size * 0.06), size * 0.88) }
    return
  }
  // MASK-REVEAL: cada línea nace desde atrás de un borde (clip fijo + sube de +112% a 0 con expoOut),
  // leading APRETADO por cap-height, y motion-blur por-línea gateado por velocidad (research: "animá la
  // entrada, después asentá y congelá; nada se mueve al leer"). El texto va PINNED (sin cámara).
  if (inKind === 'mask-reveal') {
    const A = layer.anim || {}
    const mr = wrapFit(ctx, String(val), sty.size || Math.round(W * 0.12), maxW, 14, weight, family, sty.maxLines || 3, tracking)
    ctx.font = fontStr(weight, mr.size, family); ctx.letterSpacing = tracking + 'px'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'
    const cm = ctx.measureText('Hg'); const capH = cm.actualBoundingBoxAscent || mr.size * 0.72, desc = cm.actualBoundingBoxDescent || mr.size * 0.2
    const lineStep = mr.size * (sty.leading == null ? 1.02 : sty.leading)   // APRETADO (display), no 1.2+
    const n = mr.lines.length, y0 = y - ((n - 1) * lineStep) / 2 + capH * 0.32   // centrado óptico sobre la tinta
    const delay = A.delay || 0, stag = A.stagger || 0.1, rdur = A.revealDur || 0.7, boxH = capH + desc + 3
    const dfr = (1 / 30) / rdur   // paso de localT por frame (para la velocidad del blur)
    mr.lines.forEach((ln, i) => {
      const baseline = y0 + i * lineStep, t0 = delay + i * stag
      const localT = clamp(win(ts, t0, t0 + rdur), 0, 1)
      const dyOf = lt => (1 - expoOut(clamp(lt, 0, 1))) * boxH * 1.12
      const dy = dyOf(localT), dyPrev = dyOf(localT - dfr), vpx = Math.abs(dy - dyPrev)
      ctx.save(); ctx.beginPath(); ctx.rect(x - maxW / 2, baseline - capH - 2, maxW, boxH); ctx.clip(); ctx.fillStyle = color
      const N = clamp(Math.round(vpx / 2.2), 1, 4)   // ~1 sub-muestra cada 2px de estela; nítido en reposo
      if (N > 1) { for (let s = 0; s < N; s++) { const dg = lerp(dyPrev, dy, s / (N - 1)); ctx.save(); ctx.globalAlpha *= 1 / N; ctx.fillText(ln, x, baseline + dg); ctx.restore() } }
      else ctx.fillText(ln, x, baseline + dy)
      ctx.restore()
    })
    return
  }
  const wr = wrapFit(ctx, String(val), sty.size || Math.round(W * 0.13), maxW, 14, weight, family, sty.maxLines || 3, tracking)
  const lineH = wr.size * (sty.leading || 1.06)
  if (inKind === 'cascade') {
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

// CAMARA de escena: movimiento cinematico sobre TODAS las capas (el fondo queda fijo). Da el "la
// camara nunca se queda quieta". kind: push (zoom in) / push-out / pan-up / pan-down / kinetic (vivo).
function sceneCamera(cfg, ts, dur) {
  if (!cfg || !cfg.kind || cfg.kind === 'none') return null
  const p = clamp(ts / Math.max(0.1, dur), 0, 1), e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2
  const amt = cfg.amt == null ? 1 : cfg.amt
  let z = 1, dx = 0, dy = 0
  if (cfg.kind === 'push') z = 1 + 0.08 * amt * e
  else if (cfg.kind === 'push-out') z = 1 + 0.08 * amt * (1 - e)
  else if (cfg.kind === 'pan-up') { dy = 40 * amt * e; z = 1 + 0.03 * amt }
  else if (cfg.kind === 'pan-down') { dy = -40 * amt * e; z = 1 + 0.03 * amt }
  else if (cfg.kind === 'kinetic') { z = 1 + 0.05 * amt * e + 0.012 * Math.sin(ts * 0.9); dy = Math.sin(ts * 0.6) * 6 * amt }
  return { z, dx, dy }
}

export function drawTemplateFrame(ctx, t, rv) {
  const W = rv.W, H = rv.H
  t = clamp(t, 0, Math.max(0.001, rv.duration - 0.0001))
  try { ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high' } catch { /* noop */ }
  const sc = sceneAt(rv, t)
  const ts = Math.max(0, t - sc.t0)
  paintTemplateBackground(ctx, sc.background, ts, rv.palette, W, H)
  const cam = sceneCamera(sc.camera, ts, sc.dur)
  const layers = sc.layers || []
  // Cámara por-capa: las capas PINNED (texto de lectura) ignoran la cámara y quedan clavadas en
  // pantalla; solo las no-pinned (fondo/objetos) paralajan. Desacople texto↔cámara (research).
  for (let i = 0; i < layers.length; i++) {
    const l = layers[i]; l._i = i
    ctx.save()
    if (cam && !l.pinned) { ctx.translate(W / 2, H / 2); ctx.scale(cam.z, cam.z); ctx.translate(-W / 2 + cam.dx, -H / 2 + cam.dy) }
    try { renderLayer(ctx, l, ts, sc, rv) } catch { /* capa problematica no rompe el frame */ }
    ctx.restore()
  }
}

// extensión aproximada de una capa en PIXELES (medio-ancho/medio-alto), para hit-test y para dibujar
// el recuadro de selección ajustado a la capa (no una caja fija). Estimación por tipo/tamaño.
export function layerExtent(rv, l) {
  const W = rv.W, H = rv.H
  const sc = (typeof l.scale === 'number' ? l.scale : 1)
  if (l.type === 'object') { const sz = ((l.params && (l.params.size || l.params.r)) || 70) * sc; return { hw: Math.max(46, sz * 0.95), hh: Math.max(46, sz * 0.95) } }
  if (l.type === 'shape') { const s = l.shapeStyle || {}; const w = (s.w || (s.r ? s.r * 2 : 100)) * sc, h = (s.h || (s.r ? s.r * 2 : 60)) * sc; return { hw: Math.max(24, w / 2), hh: Math.max(18, h / 2) } }
  if (l.type === 'image') { const s = l.shapeStyle || {}; const w = (s.w || W * 0.6) * sc, h = (s.h || w * 1.2) * sc; return { hw: w / 2, hh: h / 2 } }
  const size = ((l.style && l.style.size) || 60) * sc; const lines = (l.slot && l.slot.maxLines) || 2; return { hw: W * 0.44, hh: Math.max(size * 0.7, size * lines * 0.62) }
}

// hit-test: capa (id) bajo un punto normalizado. Recorre de arriba (última dibujada, la que se ve
// encima) hacia abajo y devuelve la PRIMERA cuyo bounding-box contiene el punto; si ninguna, la de
// centro más cercano dentro de un radio. Así seleccionás lo que realmente ves, no el fondo.
export function hitTest(rv, sceneIdx, nx, ny) {
  const sc = rv.scenes[sceneIdx]; if (!sc) return null
  const layers = sc.layers || []
  let fb = null, fbd = 1e9
  for (let i = layers.length - 1; i >= 0; i--) {
    const l = layers[i]
    const lx = (typeof l.x === 'number' ? l.x : 0.5), ly = (typeof l.y === 'number' ? l.y : 0.5)
    const { hw, hh } = layerExtent(rv, l)
    if (Math.abs(nx - lx) * rv.W <= hw && Math.abs(ny - ly) * rv.H <= hh) return l.id
    const d = (lx - nx) ** 2 + (ly - ny) ** 2
    if (d < fbd) { fbd = d; fb = l }
  }
  return fbd < 0.05 ? (fb && fb.id) : null   // fallback: centro más cercano dentro de ~0.22 normalizado
}
