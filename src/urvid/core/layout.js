// urvid 1.0 · LAYOUT — el SOLVER de composicion (la pieza que mas sube el techo, segun el audit). Antes cada escena
// hardcodeaba coordenadas absolutas (H*0.42...) -> texto flotando en un cuadro ~60% vacio, y nada se adaptaba al
// formato. Ahora una escena PIDE SLOTS semanticos (kicker/title/body/stat/media/cta/...) y el solver los ubica
// LLENANDO el area segura, sin solape, adaptado al W/H actual (multi-formato). DETERMINISTA (cero random/Date.now).
//
// Uso desde una escena:
//   const L = place(env, [{ id:'t', kind:'title', text: content.tagline }, { id:'b', kind:'body', text: content.claim }])
//   drawWrapped(ctx, content.tagline, L.t.cx, L.t.cy, { maxW: L.t.w, size: L.t.size, align: L.t.align, ... })
// El DIRECTOR elige UN layout por video (lib 'layouts') -> env.layout; sin layout cae al default (stack centrado).
import { W, H, clamp } from './util.js'
import { get } from './registry.js'

// peso visual (cuanto alto se lleva), tamano base de fuente y lineas tipicas por tipo de slot.
const KIND = {
  kicker:   { w: 0.55, min: 16, base: 22,  lines: 1 },   // marca/etiqueta chica arriba
  title:    { w: 2.7,  min: 30, base: 64,  lines: 3 },   // titular display (el protagonista)
  subtitle: { w: 1.1,  min: 18, base: 30,  lines: 2 },
  body:     { w: 1.3,  min: 16, base: 26,  lines: 3 },
  list:     { w: 2.2,  min: 16, base: 26,  lines: 5 },   // checklist/items
  stat:     { w: 3.2,  min: 56, base: 150, lines: 1 },   // numero gigante
  media:    { w: 3.0,  min: 80, base: 200, lines: 0 },   // region para imagen/chart (futuro)
  cta:      { w: 0.8,  min: 16, base: 24,  lines: 1 },
  mark:     { w: 0.5,  min: 14, base: 18,  lines: 1 },
  footnote: { w: 0.5,  min: 13, base: 18,  lines: 1 },
}

// ARRANGER generico: apila los slots en una columna dentro del area segura, repartiendo el alto por peso para LLENAR.
// preset = { align:'left'|'center'|'right', anchor:'top'|'center'|'bottom', side, gap, topPad, botPad }. Puro.
export function arrange(request, preset = {}) {
  const { align = 'center', anchor = 'center', side = 0.1, gap = 0.035, topPad = 0.12, botPad = 0.13, reelBias = 1 } = preset
  const tall = clamp((H / W - 1) / (16 / 9 - 1), 0, 1) * reelBias
  const botBias = 0.07 * tall
  const topBias = 0.02 * tall
  const sideM = W * side, topM = H * (topPad + topBias), botM = H * (botPad + botBias)
  const availW = W - sideM * 2, availH = H - topM - botM
  const slots = (request || []).filter(Boolean)
  const n = slots.length || 1
  const gapPx = H * gap, totalGap = gapPx * (n - 1)
  const wsum = slots.reduce((s, r) => s + ((KIND[r.kind] || KIND.body).w), 0) || 1
  // alto por slot: proporcional al peso, con un minimo legible por tipo.
  let heights = slots.map(r => { const k = KIND[r.kind] || KIND.body; return Math.max(k.min * (k.lines || 1) * 1.3, (availH - totalGap) * k.w / wsum) })
  let blockH = heights.reduce((a, b) => a + b, 0) + totalGap
  if (blockH > availH && blockH > totalGap) { const k = (availH - totalGap) / (blockH - totalGap); heights = heights.map(h => h * k); blockH = availH }
  let y = anchor === 'top' ? topM : anchor === 'bottom' ? (H - botM - blockH) : (topM + (availH - blockH) / 2)
  const out = { _block: { x: sideM, y, w: availW, h: blockH } }
  for (let i = 0; i < slots.length; i++) {
    const r = slots[i], h = heights[i], k = KIND[r.kind] || KIND.body
    const cx = align === 'center' ? W / 2 : align === 'right' ? (W - sideM) : sideM
    const size = clamp(Math.min(k.base, (h / (k.lines || 1)) * 0.82), k.min, k.base * 1.3)
    out[r.id] = { x: sideM, y, w: availW, h, cx, cy: y + h / 2, size, align, kind: r.kind }
    y += h + gapPx
  }
  return out
}

export function defaultLayout() {
  return { id: 'layout.default', arrange: (req) => arrange(req, { align: 'center', anchor: 'center' }) }
}

const _cache = new WeakMap()   // memo NO-mutante por video
export function resolveLayout(video) {
  if (!video) return defaultLayout()
  const hit = _cache.get(video); if (hit) return hit
  let l = null
  try { const mod = video.layoutId ? get(video.layoutId) : null; if (mod && typeof mod.make === 'function') l = mod.make() } catch { l = null }
  l = l || defaultLayout()
  _cache.set(video, l); return l
}

// place: lo que llaman las escenas. Resuelve el layout del video (env.layout) o cae al default y ubica los slots.
export function place(env, request) { return ((env && env.layout) || defaultLayout()).arrange(request) }
