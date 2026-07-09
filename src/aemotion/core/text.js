// aemotion 0.1 · TEXTO — fit con la garantia nunca-desborda (regla heredada de urvid/kinetic,
// copia independiente): SIEMPRE se fitea ANTES de dibujar. Las animaciones per-char las hace
// textfx.js; aca viven las primitivas de medida y el dibujo simple.
import { fontStr, clamp } from './util.js'

// achicar hasta entrar (nunca elidir)
export function fitFont(ctx, str, base, maxW, min, weight, family, tr = 0) {
  let s = base; ctx.font = fontStr(weight, s, family)
  const _ls = ctx.letterSpacing || '0px'; ctx.letterSpacing = (tr || 0) + 'px'
  while (s > min && ctx.measureText(str).width > maxW) { s -= 1; ctx.font = fontStr(weight, s, family) }
  ctx.letterSpacing = _ls
  return s
}

// envuelve en <= maxLines achicando hasta que TODO entre (sin elipsis; el guionista ya corta)
export function wrapFit(ctx, str, base, maxW, min, weight, family, maxLines = 2, tr = 0) {
  str = String(str == null ? '' : str).replace(/\s+/g, ' ').trim()
  const words = str.split(' ')
  const _ls = ctx.letterSpacing || '0px'
  const at = s => {
    ctx.font = fontStr(weight, s, family); ctx.letterSpacing = (tr || 0) + 'px'
    const ls = []; let cur = ''
    for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width <= maxW || !cur) cur = t; else { ls.push(cur); cur = w } }
    if (cur) ls.push(cur)
    return { ls, over: ls.some(l => ctx.measureText(l).width > maxW + 0.5) }
  }
  let out = null
  for (let s = base; s >= min; s--) { const { ls, over } = at(s); if (ls.length <= maxLines && !over) { out = { size: s, lines: ls }; break } }
  if (!out) out = { size: min, lines: at(min).ls.slice(0, maxLines) }
  ctx.letterSpacing = _ls
  return out
}

export function drawText(ctx, str, x, y, opts = {}) {
  const { size = 40, weight = 700, family = 'Inter', align = 'center', baseline = 'middle', maxW = 0, min = 12, color = '#fff', alpha = 1, tracking = 0 } = opts
  ctx.save(); ctx.globalAlpha *= clamp(alpha, 0, 1)
  let s = size
  if (maxW > 0) s = fitFont(ctx, String(str), size, maxW, min, weight, family, tracking)
  ctx.font = fontStr(weight, s, family); ctx.letterSpacing = tracking + 'px'
  ctx.textAlign = align; ctx.textBaseline = baseline; ctx.fillStyle = color
  ctx.fillText(String(str), x, y)
  ctx.restore()
  return s
}
