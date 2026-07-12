// urvid 1.0 · TEXTO — primitiva de dibujo de texto con la GARANTIA de no-desborde horneada (fit -> clip/wrap).
// Toda la biblioteca de tipografia/escenas dibuja texto por aca -> ningun texto se sale de su caja, nunca (regla dura).
import { fontStr, clamp } from './util.js'

// TELEMETRIA opcional para el GATE de QA visual (tools/urvid1-qa.mjs): cuando esta prendida, registra cada linea de
// texto dibujada (string, caja, tamano, ancho medido) -> el gate detecta por CODIGO defectos como tamanos disparejos
// en una lista, desborde/ellipsis, o texto fuera del cuadro. Apagada (default) = un solo if por llamada, costo ~0.
let _tel = null
export function telStart() { _tel = []; return _tel }
export function telStop() { const t = _tel; _tel = null; return t }
export function telTag(tag) { if (_tel) _tel._tag = tag }
function _rec(ctx, drawn, raw, x, y, s, maxW, align, baseline, weight) {
  if (!_tel) return
  _tel.push({ str: drawn, raw: String(raw), x, y, size: s, maxW, align, baseline, weight, w: ctx.measureText(drawn).width, ellip: drawn.indexOf('…') >= 0 && String(raw).indexOf('…') < 0, ...(_tel._tag || {}) })
}

// TRACKING (letter-spacing) por ROL: display pesado+grande = mas APRETADO (negativo); kicker/label en MAYUS = mas
// ABIERTO (opts.upper -> positivo); body = neutro (0). Solo deriva de weight/size/opts -> DETERMINISTA. px absolutos.
// Default conservador: solo NEGATIVO (mas angosto -> mas margen, nunca peor para el fit). El positivo SOLO con opts.upper.
export function trackFor(weight, size, opts) {
  if (opts && opts.tracking != null) return opts.tracking
  if (opts && opts.upper) return Math.max(0.5, size * 0.04)
  if (weight >= 800 && size >= 44) return -(size * 0.018)
  if (weight >= 700 && size >= 60) return -(size * 0.012)
  return 0
}
// tr (px, fijo durante el fit) se aplica como ctx.letterSpacing -> measureText lo INCLUYE -> el fit mide el ancho REAL.
export function fitFont(ctx, str, base, maxW, min, weight, family, tr = 0) {
  let s = base; ctx.font = fontStr(weight, s, family)
  const _ls = ctx.letterSpacing || '0px'; ctx.letterSpacing = (tr || 0) + 'px'
  while (s > min && ctx.measureText(str).width > maxW) { s -= 1; ctx.font = fontStr(weight, s, family) }
  ctx.letterSpacing = _ls
  return s
}
// fitUniform: el tamano de fuente que entra para TODOS los items (el del mas ancho) -> una lista se dibuja con UN
// tamano unico, no cada item fiteado por su cuenta (eso daba items de tamanos distintos en la misma lista).
export function fitUniform(ctx, items, base, maxW, min, weight, family, tr = 0) {
  let s = base
  for (const it of (items || [])) { const f = fitFont(ctx, String(it == null ? '' : it), s, maxW, min, weight, family, tr); if (f < s) s = f }
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
export function wrap(ctx, str, base, maxW, min, weight, family, maxLines = 2, tr = 0) {
  str = String(str == null ? '' : str).replace(/\s+/g, ' ').trim()
  const words = str.split(' ')
  const _ls = ctx.letterSpacing || '0px'
  // arma las lineas a tamano s y reporta si ALGUNA linea aun desborda maxW. Mide CON el tracking (letterSpacing) para
  // que el ancho refleje el real -> el achique compensa el spacing y nunca desborda.
  const at = s => {
    ctx.font = fontStr(weight, s, family); ctx.letterSpacing = (tr || 0) + 'px'
    const ls = []; let cur = ''
    for (const w of words) { const tt = cur ? cur + ' ' + w : w; if (ctx.measureText(tt).width <= maxW || !cur) cur = tt; else { ls.push(cur); cur = w } }
    if (cur) ls.push(cur)
    const overflow = ls.some(l => ctx.measureText(l).width > maxW + 0.5)
    return { ls, overflow }
  }
  // acepta un tamano SOLO si entra en <=maxLines lineas Y ninguna linea desborda -> achica en vez de cortar con "...".
  for (let s = base; s >= min; s--) { const { ls, overflow } = at(s); if (ls.length <= maxLines && !overflow) { ctx.letterSpacing = _ls; return { size: s, lines: ls } } }
  // ultimo recurso (ni en el min entra): arma al min, junta el sobrante en la ultima linea y deja que clip elida.
  const { ls } = at(min), kept = ls.slice(0, maxLines); if (kept.length) kept[kept.length - 1] = ls.slice(maxLines - 1).join(' ')
  const out = { size: min, lines: (kept.length ? kept : [str]).map(l => clip(ctx, l, maxW)) }
  ctx.letterSpacing = _ls
  return out
}

// dibuja UNA linea fiteada+clipeada. Devuelve el tamano usado.
// Si el caller pide maxLines>1 (con maxW), delega a drawWrapped -> ENVUELVE en vez de clipear con "…"
// (varias escenas pasaban maxLines:2 esperando wrap; drawText lo ignoraba y elidia). Fix transversal.
export function drawText(ctx, str, x, y, opts = {}) {
  if (opts.maxLines > 1 && opts.maxW > 0) return drawWrapped(ctx, str, x, y, opts)
  const { size = 40, weight = 700, family = 'Inter', align = 'center', baseline = 'middle', maxW = 0, min = 14, color = '#fff', shadow, alpha = 1 } = opts
  ctx.save(); ctx.globalAlpha *= clamp(alpha, 0, 1)
  const tr = trackFor(weight, size, opts)
  let s = size
  if (maxW > 0) s = fitFont(ctx, String(str), size, maxW, min, weight, family, tr)
  ctx.font = fontStr(weight, s, family); ctx.letterSpacing = (tr || 0) + 'px'; ctx.textAlign = align; ctx.textBaseline = baseline; ctx.fillStyle = color
  if (shadow) { ctx.shadowColor = shadow; ctx.shadowBlur = opts.shadowBlur || 6 }
  const drawn = maxW > 0 ? clip(ctx, String(str), maxW) : String(str)
  _rec(ctx, drawn, str, x, y, s, maxW, align, baseline, weight)
  ctx.fillText(drawn, x, y)
  ctx.restore()
  return s
}
// dibuja un parrafo envuelto centrado en y. Devuelve la altura del bloque.
export function drawWrapped(ctx, str, x, y, opts = {}) {
  const { size = 40, weight = 700, family = 'Inter', align = 'center', maxW = 300, min = 16, color = '#fff', maxLines = 2, lh = 1.2, alpha = 1, shadow } = opts
  const tr = trackFor(weight, size, opts)
  const w = wrap(ctx, str, size, maxW, min, weight, family, maxLines, tr)
  const lineH = w.size * lh, total = (w.lines.length - 1) * lineH
  ctx.save(); ctx.globalAlpha *= clamp(alpha, 0, 1)
  ctx.font = fontStr(weight, w.size, family); ctx.letterSpacing = (tr || 0) + 'px'; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillStyle = color
  if (shadow) { ctx.shadowColor = shadow; ctx.shadowBlur = opts.shadowBlur || 6 }
  w.lines.forEach((ln, i) => { const yy = y - total / 2 + i * lineH; _rec(ctx, ln, str, x, yy, w.size, maxW, align, 'middle', weight); ctx.fillText(ln, x, yy) })
  ctx.restore()
  return total + w.size
}
