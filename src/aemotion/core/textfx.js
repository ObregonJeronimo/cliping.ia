// aemotion 0.1 · TEXTFX — text animators estilo After Effects: la seleccion es una FUNCION pura
// f(charIndex, t) -> peso [0,1] (range selector con Start/End/Offset y 6 formas de falloff, spec
// oficial de Adobe) y las propiedades del animator se aplican POR PESO: final = base + w·delta.
// Randomize Order = permutacion seedeada (AE tambien usa seed explicito -> replicable determinista).
// Layout por caracter: se mide char a char (como AE al animar per-char, el kerning cruzado se pierde).
import { clamp, lerp, TAU, fontStr } from './util.js'
import { seedFor } from './prng.js'
import { val } from './keys.js'

// las 6 formas de falloff del range selector de AE (u = posicion relativa dentro de la ventana [0,1])
export const SEL_SHAPES = {
  square: u => (u >= 0 && u <= 1 ? 1 : 0),
  rampUp: u => clamp(u, 0, 1),
  rampDown: u => 1 - clamp(u, 0, 1),
  triangle: u => 1 - Math.abs(2 * clamp(u, 0, 1) - 1),
  round: u => { const c = 2 * clamp(u, 0, 1) - 1; return Math.sqrt(Math.max(0, 1 - c * c)) },
  smooth: u => { const w = 1 - Math.abs(2 * clamp(u, 0, 1) - 1); return w * w * (3 - 2 * w) },
}

// permutacion seedeada de n indices (Randomize Order de AE) — misma para el mismo seed+ns
export function randomOrder(n, seed, ns = 'am-textorder') {
  const r = seedFor((seed ?? 1) >>> 0, ns)
  const idx = Array.from({ length: n }, (_, i) => i)
  for (let i = n - 1; i > 0; i--) { const j = (r() * (i + 1)) | 0; const tmp = idx[i]; idx[i] = idx[j]; idx[j] = tmp }
  return idx
}

// peso del caracter i de n para un selector en el tiempo t.
// sel = { start, end, offset (animables, [0,1] del texto), shape, easeHigh, easeLow, randomSeed, ns }
export function rangeAmount(i, n, sel, t, order = null) {
  const idx = order ? order[i] : i
  const p = n <= 1 ? 0.5 : (idx + 0.5) / n
  const start = clamp(val(sel.start ?? 0, t), 0, 1)
  const end = clamp(val(sel.end ?? 1, t), 0, 1)
  const off = val(sel.offset ?? 0, t) || 0
  const a = Math.min(start, end) + off, b = Math.max(start, end) + off
  if (b - a < 1e-6) return 0
  const u = (p - a) / (b - a)
  let w = (SEL_SHAPES[sel.shape] || SEL_SHAPES.square)(u)
  // Ease High/Low de AE (aproximacion por gamma asimetrica): >0 suaviza ese borde, <0 lo endurece
  const eh = clamp(sel.easeHigh || 0, -1, 1), el = clamp(sel.easeLow || 0, -1, 1)
  if (eh || el) {
    const g = w >= 0.5 ? 1 + eh : 1 - el
    w = Math.pow(clamp(w, 0, 1), Math.pow(2, g - 1))
  }
  return clamp(w, 0, 1)
}

// layout por caracter: posiciones x del CENTRO de cada char (mide con la font ya aplicada al ctx)
export function layoutChars(ctx, text, x, align = 'center', tracking = 0) {
  const chars = [...String(text)]
  const widths = chars.map(ch => ctx.measureText(ch).width)
  const total = widths.reduce((s, w) => s + w, 0) + tracking * Math.max(0, chars.length - 1)
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x
  const out = chars.map((ch, i) => {
    const c = { ch, x: cx + widths[i] / 2, w: widths[i] }
    cx += widths[i] + tracking
    return c
  })
  return { chars: out, total }
}

// dibuja un texto con animators. spec = {
//   text, x, y, size, weight=800, family='Arial', fill='#fff', align='center', tracking=0,
//   glow: { color, blur },                                    // glow POR CARACTER (sigue la revelacion)
//   animators: [{ sel, props: { x, y, rot, scale, alpha, tracking } }]   // props animables (deltas)
// }
// Cada animator suma su delta pesado por su selector; alpha/scale interpolan desde 1 (como AE).
export function drawAnimatedText(ctx, t, spec) {
  const size = val(spec.size, t) || 24
  ctx.save()
  ctx.font = fontStr(spec.weight || 800, size, spec.family || 'Arial')
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  const baseTrack = val(spec.tracking ?? 0, t) || 0
  const { chars } = layoutChars(ctx, spec.text, spec.x, spec.align || 'center', baseTrack)
  const n = chars.length
  const anims = (spec.animators || []).map(a => ({
    ...a,
    order: a.sel && a.sel.randomSeed != null ? randomOrder(n, a.sel.randomSeed, a.sel.ns) : null,
  }))
  for (let i = 0; i < n; i++) {
    const c = chars[i]
    if (c.ch === ' ') continue
    let dx = 0, dy = 0, rot = 0, scale = 1, alpha = 1
    for (const a of anims) {
      const w = rangeAmount(i, n, a.sel || {}, t, a.order)
      if (w <= 0) continue
      const p = a.props || {}
      dx += w * (val(p.x, t) || 0)
      dy += w * (val(p.y, t) || 0)
      rot += w * (val(p.rot, t) || 0)
      if (p.scale != null) scale *= lerp(1, val(p.scale, t), w)
      if (p.alpha != null) alpha *= lerp(1, clamp(val(p.alpha, t), 0, 1), w)
    }
    if (alpha <= 0.004) continue
    ctx.save()
    ctx.globalAlpha *= clamp(alpha, 0, 1)
    ctx.translate(c.x + dx, spec.y + dy)
    if (rot) ctx.rotate(rot)
    if (scale !== 1) ctx.scale(scale, scale)
    ctx.fillStyle = val(spec.fill, t) || '#fff'
    if (spec.glow && spec.glow.blur > 1 && alpha > 0.05) { ctx.shadowColor = spec.glow.color; ctx.shadowBlur = spec.glow.blur }
    ctx.fillText(c.ch, 0, 0)
    ctx.restore()
  }
  ctx.restore()
}
