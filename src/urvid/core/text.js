// urvid 1.0 · TEXTO — primitiva de dibujo de texto con la GARANTIA de no-desborde horneada (fit -> clip/wrap).
// Toda la biblioteca de tipografia/escenas dibuja texto por aca -> ningun texto se sale de su caja, nunca (regla dura).
import { fontStr, clamp } from './util.js'

export function fitFont(ctx, str, base, maxW, min, weight, family) {
  let s = base; ctx.font = fontStr(weight, s, family)
  while (s > min && ctx.measureText(str).width > maxW) { s -= 1; ctx.font = fontStr(weight, s, family) }
  return s
}
// recorta con ellipsis al ancho actual del ctx.font (red de seguridad cuando ni en el min entra)
export function clip(ctx, str, maxW) {
  str = String(str == null ? '' : str)
  if (!(maxW > 0) || ctx.measureText(str).width <= maxW) return str
  let lo = 0, hi = str.length
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (ctx.measureText(str.slice(0, m).replace(/\s+$/, '') + '…').width <= maxW) lo = m; else hi = m - 1 }
  return (str.slice(0, lo).replace(/\s+$/, '') || str.slice(0, 1)) + '…'
}
// envuelve en <= maxLines lineas. ACHICA el font hasta que entre SIN desborde horizontal (no elide); ellipsis solo
// como ultimo recurso si ni en el `min` entra. Devuelve {size, lines}.
export function wrap(ctx, str, base, maxW, min, weight, family, maxLines = 2) {
  str = String(str == null ? '' : str).replace(/\s+/g, ' ').trim()
  const words = str.split(' ')
  // arma las lineas a tamano s y reporta si ALGUNA linea aun desborda maxW (p.ej. una palabra inquebrable mas ancha
  // que la caja: el wrap la mete igual por `!cur`, pero entonces el tamano NO sirve y hay que seguir achicando).
  const at = s => {
    ctx.font = fontStr(weight, s, family)
    const ls = []; let cur = ''
    for (const w of words) { const tt = cur ? cur + ' ' + w : w; if (ctx.measureText(tt).width <= maxW || !cur) cur = tt; else { ls.push(cur); cur = w } }
    if (cur) ls.push(cur)
    const overflow = ls.some(l => ctx.measureText(l).width > maxW + 0.5)
    return { ls, overflow }
  }
  // acepta un tamano SOLO si entra en <=maxLines lineas Y ninguna linea desborda -> achica en vez de cortar con "...".
  for (let s = base; s >= min; s--) { const { ls, overflow } = at(s); if (ls.length <= maxLines && !overflow) return { size: s, lines: ls } }
  // ultimo recurso (ni en el min entra): arma al min, junta el sobrante en la ultima linea y deja que clip elida.
  const { ls } = at(min), kept = ls.slice(0, maxLines); if (kept.length) kept[kept.length - 1] = ls.slice(maxLines - 1).join(' ')
  return { size: min, lines: (kept.length ? kept : [str]).map(l => clip(ctx, l, maxW)) }
}

// dibuja UNA linea fiteada+clipeada. Devuelve el tamano usado.
export function drawText(ctx, str, x, y, opts = {}) {
  const { size = 40, weight = 700, family = 'Inter', align = 'center', baseline = 'middle', maxW = 0, min = 14, color = '#fff', shadow, alpha = 1 } = opts
  ctx.save(); ctx.globalAlpha *= clamp(alpha, 0, 1)
  let s = size
  if (maxW > 0) s = fitFont(ctx, String(str), size, maxW, min, weight, family)
  ctx.font = fontStr(weight, s, family); ctx.textAlign = align; ctx.textBaseline = baseline; ctx.fillStyle = color
  if (shadow) { ctx.shadowColor = shadow; ctx.shadowBlur = opts.shadowBlur || 6 }
  ctx.fillText(maxW > 0 ? clip(ctx, String(str), maxW) : String(str), x, y)
  ctx.restore()
  return s
}
// dibuja un parrafo envuelto centrado en y. Devuelve la altura del bloque.
export function drawWrapped(ctx, str, x, y, opts = {}) {
  const { size = 40, weight = 700, family = 'Inter', align = 'center', maxW = 300, min = 16, color = '#fff', maxLines = 2, lh = 1.2, alpha = 1, shadow } = opts
  const w = wrap(ctx, str, size, maxW, min, weight, family, maxLines)
  const lineH = w.size * lh, total = (w.lines.length - 1) * lineH
  ctx.save(); ctx.globalAlpha *= clamp(alpha, 0, 1)
  ctx.font = fontStr(weight, w.size, family); ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillStyle = color
  if (shadow) { ctx.shadowColor = shadow; ctx.shadowBlur = opts.shadowBlur || 6 }
  w.lines.forEach((ln, i) => ctx.fillText(ln, x, y - total / 2 + i * lineH))
  ctx.restore()
  return total + w.size
}
