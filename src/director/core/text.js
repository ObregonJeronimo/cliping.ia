// director · TEXTO — primitivas con la GARANTIA nunca-desborda horneada (regla dura heredada de los
// dos motores previos, re-implementada limpia): SIEMPRE se fitea ANTES de dibujar, y el fitter
// ACHICA — jamas elide con "…" salvo ultimo recurso imposible. Ademas: telemetria propia para que
// los gates puedan auditar por CODIGO cada linea dibujada (texto cortado, desborde, tamanos dispares).

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
export const fontStr = (weight, size, family) => `${weight} ${size}px "${family}", sans-serif`

// ---------- TELEMETRIA (apagada por default: un if por llamada, costo ~0) ----------
let _tel = null
export function telStart() { _tel = []; return _tel }
export function telStop() { const t = _tel; _tel = null; return t }
export function telTag(tag) { if (_tel) _tel._tag = tag }
function _rec(ctx, drawn, raw, x, y, size, maxW, align, weight) {
  if (!_tel) return
  _tel.push({
    str: drawn, raw: String(raw), x, y, size, maxW, align, weight,
    w: ctx.measureText(drawn).width,
    ellip: drawn.indexOf('…') >= 0 && String(raw).indexOf('…') < 0,
    ...(_tel._tag || {}),
  })
}

// ---------- FIT ----------
// achica desde `base` hasta que entre en maxW (o toque `min`). Mide CON letterSpacing -> el ancho es el real.
export function fitFont(ctx, str, base, maxW, min, weight, family, tr = 0) {
  let s = base
  const prev = ctx.letterSpacing || '0px'
  ctx.letterSpacing = (tr || 0) + 'px'
  ctx.font = fontStr(weight, s, family)
  while (s > min && ctx.measureText(str).width > maxW) { s -= 1; ctx.font = fontStr(weight, s, family) }
  ctx.letterSpacing = prev
  return s
}
// el tamano que entra para TODOS los items (el del mas ancho) -> una lista se dibuja con UN tamano unico
export function fitUniform(ctx, items, base, maxW, min, weight, family, tr = 0) {
  let s = base
  for (const it of (items || [])) { const f = fitFont(ctx, String(it == null ? '' : it), s, maxW, min, weight, family, tr); if (f < s) s = f }
  return s
}
// UNIDADES DE CORTE — donde se puede partir una linea. En latino/cirilico/griego la unidad es la
// PALABRA; en japones, chino y coreano no hay espacios y la unidad es el CARACTER.
// Sin esto, una frase CJK entera era UNA sola "palabra" que no entraba en ningun ancho, el fitter
// llegaba al minimo sin poder cortar y la red de ultimo recurso elidia: "デザインとブランディ…".
// Una pagina japonesa daba un video con la frase mutilada, siempre.
const CJK = /[ᄀ-ᇿ⺀-〿぀-ヿ㐀-䶿一-鿿豈-﫿＀-￯]/
// no se puede empezar renglon con estos (paréntesis/puntuacion de cierre japonesa y occidental)
const NO_INICIO = new Set(['、', '。', '，', '．', '）', '」', '』', '］', '｝', '・', 'ー', '？', '！', ':', ';', ',', '.', ')', ']', '}', '»'])
function unidades(str) {
  const out = []
  let cur = null
  for (const c of Array.from(str)) {
    if (c === ' ') { cur = null; if (out.length) out[out.length - 1].sp = true; continue }
    if (CJK.test(c)) {
      // la puntuacion de cierre se pega a la unidad anterior en vez de abrir renglon
      if (NO_INICIO.has(c) && out.length && !out[out.length - 1].sp) out[out.length - 1].t += c
      else out.push({ t: c, sp: false })
      cur = null
      continue
    }
    if (cur) cur.t += c
    else { cur = { t: c, sp: false }; out.push(cur) }
  }
  return out
}

// envuelve a `maxW` a un tamano dado. Helper interno compartido por wrapFit y fitBlock.
function wrapAt(ctx, uds, s, maxW, weight, family, tr) {
  ctx.font = fontStr(weight, s, family); ctx.letterSpacing = (tr || 0) + 'px'
  const ls = []; let cur = '', sep = ''
  for (const u of uds) {
    const tt = cur ? cur + sep + u.t : u.t
    if (ctx.measureText(tt).width <= maxW || !cur) cur = tt
    else { ls.push(cur); cur = u.t }
    sep = u.sp ? ' ' : ''
  }
  if (cur) ls.push(cur)
  return { ls, over: ls.some(l => ctx.measureText(l).width > maxW + 0.5) }
}

// envuelve en <= maxLines ACHICANDO hasta que ninguna linea desborde. Devuelve { size, lines, over }.
// `over: true` significa que ni al minimo entra en maxLines y se RECORTARON lineas -> quien llama
// tiene que tratarlo como error, no como resultado normal. Preferir fitBlock cuando hay caja con alto.
export function wrapFit(ctx, str, base, maxW, min, weight, family, maxLines = 2, tr = 0) {
  str = String(str == null ? '' : str).replace(/\s+/g, ' ').trim()
  const uds = unidades(str)
  const prev = ctx.letterSpacing || '0px'
  let out = null
  for (let s = base; s >= min; s--) { const { ls, over } = wrapAt(ctx, uds, s, maxW, weight, family, tr); if (ls.length <= maxLines && !over) { out = { size: s, lines: ls, over: false }; break } }
  if (!out) { const { ls } = wrapAt(ctx, uds, min, maxW, weight, family, tr); out = { size: min, lines: ls.slice(0, maxLines), over: ls.length > maxLines } }
  ctx.letterSpacing = prev
  return out
}

// fitBlock — el fitter que usa el Director para TODO bloque de texto con caja: achica hasta que la
// frase COMPLETA entra en ancho Y en alto. Nunca descarta palabras.
//
// Por que existe: wrapFit acota por CANTIDAD DE LINEAS. Cuando la frase no entraba en esas lineas ni
// al tamano minimo, hacia `slice(0, maxLines)` y el video mostraba media oracion ("...listo para" en
// vez de "...listo para publicar"). Con caja, el limite natural es el ALTO: se puede usar una linea
// mas y bajar un punto, y la frase entra entera. El numero de lineas pasa a ser consecuencia, no ley.
export function fitBlock(ctx, str, maxW, maxH, base, min, weight, family, lh = 1.2, tr = 0) {
  str = String(str == null ? '' : str).replace(/\s+/g, ' ').trim()
  const uds = unidades(str)
  const prev = ctx.letterSpacing || '0px'
  let out = null
  // OJO con el recorrido: `base` casi siempre es fraccionario (49.3px), asi que `s--` nunca cae
  // exactamente en `min` y el fitter se rendia UN ESCALON ANTES de su propio piso. Con un texto al
  // limite, esa diferencia era exactamente la que separaba "entra" de "desborda". Se recorre en
  // enteros y despues se prueba el piso explicitamente.
  const tam = []
  for (let s = Math.floor(base); s > min; s--) tam.push(s)
  tam.push(min)
  for (const s of tam) {
    const { ls, over } = wrapAt(ctx, uds, s, maxW, weight, family, tr)
    if (!over && (ls.length - 1) * s * lh + s <= maxH + 0.5) { out = { size: s, lines: ls, over: false }; break }
  }
  if (!out) { const { ls } = wrapAt(ctx, uds, min, maxW, weight, family, tr); out = { size: min, lines: ls, over: true } }
  ctx.letterSpacing = prev
  return out
}
// recorta por PALABRA hasta entrar (nunca corta a mitad de palabra) y saca conectores colgando.
// Es la primera red del guion: el fit dibuja lo que quede. Determinista (solo mide texto).
const DANGLING = new Set(['y', 'e', 'o', 'u', 'de', 'del', 'la', 'el', 'los', 'las', 'a', 'al', 'en', 'con', 'para', 'por', 'que', 'tu', 'su', 'sus', 'un', 'una', 'mas', 'más', 'sin', 'se', 'lo', 'te', 'and', 'or', 'the', 'of', 'to', 'for', 'with', 'your'])
export function wordTrim(ctx, str, maxW, size, weight, family, tr = 0) {
  str = String(str == null ? '' : str).replace(/\s+/g, ' ').trim()
  const prev = ctx.letterSpacing || '0px'
  ctx.font = fontStr(weight, size, family); ctx.letterSpacing = (tr || 0) + 'px'
  let out = str
  while (out.indexOf(' ') > 0 && ctx.measureText(out).width > maxW) out = out.slice(0, out.lastIndexOf(' '))
  while (out.indexOf(' ') > 0 && DANGLING.has(out.slice(out.lastIndexOf(' ') + 1).toLowerCase().replace(/[.,:;!?]+$/, ''))) out = out.slice(0, out.lastIndexOf(' '))
  ctx.letterSpacing = prev
  return out
}
// red de ultimo recurso: elide al ancho actual del ctx.font
export function clip(ctx, str, maxW) {
  str = String(str == null ? '' : str)
  if (!(maxW > 0) || ctx.measureText(str).width <= maxW) return str
  let lo = 0, hi = str.length
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (ctx.measureText(str.slice(0, m).replace(/\s+$/, '') + '…').width <= maxW) lo = m; else hi = m - 1 }
  return (str.slice(0, lo).replace(/\s+$/, '') || str.slice(0, 1)) + '…'
}

// ---------- DIBUJO ----------
export function drawText(ctx, str, x, y, opts = {}) {
  const { size = 40, weight = 700, family = 'Inter', align = 'center', baseline = 'middle',
    maxW = 0, min = 12, color = '#fff', alpha = 1, tracking = 0, shadow = null, shadowBlur = 8 } = opts
  if (alpha <= 0) return size
  ctx.save(); ctx.globalAlpha *= clamp(alpha, 0, 1)
  let s = size
  if (maxW > 0) s = fitFont(ctx, String(str), size, maxW, min, weight, family, tracking)
  ctx.font = fontStr(weight, s, family); ctx.letterSpacing = tracking + 'px'
  ctx.textAlign = align; ctx.textBaseline = baseline; ctx.fillStyle = color
  if (shadow) { ctx.shadowColor = shadow; ctx.shadowBlur = shadowBlur }
  const drawn = maxW > 0 ? clip(ctx, String(str), maxW) : String(str)
  _rec(ctx, drawn, str, x, y, s, maxW, align, weight)
  ctx.fillText(drawn, x, y)
  ctx.restore()
  return s
}
export function drawWrapped(ctx, str, x, y, opts = {}) {
  const { size = 40, weight = 700, family = 'Inter', align = 'center', maxW = 300, min = 14,
    color = '#fff', maxLines = 2, lh = 1.2, alpha = 1, tracking = 0, shadow = null, shadowBlur = 8 } = opts
  if (alpha <= 0) return 0
  const w = wrapFit(ctx, str, size, maxW, min, weight, family, maxLines, tracking)
  const lineH = w.size * lh, total = (w.lines.length - 1) * lineH
  ctx.save(); ctx.globalAlpha *= clamp(alpha, 0, 1)
  ctx.font = fontStr(weight, w.size, family); ctx.letterSpacing = tracking + 'px'
  ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillStyle = color
  if (shadow) { ctx.shadowColor = shadow; ctx.shadowBlur = shadowBlur }
  w.lines.forEach((ln, i) => { const yy = y - total / 2 + i * lineH; _rec(ctx, ln, str, x, yy, w.size, maxW, align, weight); ctx.fillText(ln, x, yy) })
  ctx.restore()
  return total + w.size
}
// REVEAL por MASCARA (el gesto de AE): la linea sube desde atras de una mascara invisible.
// p 0..1 es el prop `reveal` del timeline -> editable como cualquier keyframe.
export function drawMaskLine(ctx, str, x, y, p, opts = {}) {
  if (p <= 0) return 0
  const { size = 60, family = 'Inter', weight = 800, maxW = 300, min = 13 } = opts
  const e = p >= 1 ? 1 : 1 - Math.pow(2, -10 * p)
  ctx.save()
  ctx.beginPath(); ctx.rect(x - maxW, y - size * 0.85, maxW * 2, size * 1.7); ctx.clip()
  const s = drawText(ctx, str, x, y + size * 1.1 * (1 - e), { ...opts, size, family, weight, maxW, min })
  ctx.restore()
  return s
}
// REVEAL por CARACTER (typewriter con settle gris->tinta). Fitea la linea COMPLETA primero: el ancho
// dibujado == el fiteado -> el contrato nunca-desborda se mantiene aunque dibujemos glifo por glifo.
export function drawKineticLine(ctx, str, cx, y, p, opts = {}) {
  const { size = 60, weight = 800, family = 'Inter', maxW = 300, min = 14, color = '#fff',
    dim = null, overlap = 0.55, tracking = 0, alpha = 1, z = 0.62, w: ww = 13, align = 'center' } = opts
  str = String(str == null ? '' : str)
  if (!str || p <= 0 || alpha <= 0) return 0
  ctx.save(); ctx.globalAlpha *= clamp(alpha, 0, 1)
  const s = fitFont(ctx, str, size, maxW, min, weight, family, tracking)
  ctx.font = fontStr(weight, s, family); ctx.letterSpacing = tracking + 'px'
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
  const chars = Array.from(str)
  const widths = chars.map(c => ctx.measureText(c).width)
  const total = widths.reduce((a, b) => a + b, 0) + tracking * Math.max(0, chars.length - 1)
  // RESPETA `align`. Antes centraba SIEMPRE sobre el x recibido, y el renderer le pasa el borde
  // IZQUIERDO de la caja cuando la capa es align:'left' -> media linea quedaba fuera del lienzo
  // ("Converti" salia "onverti"), y al llegar reveal=1 el dibujo saltaba al camino de drawText, que si
  // respeta align: un teletransporte de 250px en un frame. Pasaba en el titular del hook, que es la
  // frase que decide si el espectador sigue mirando.
  let x = align === 'left' ? cx : align === 'right' ? cx - total : cx - total / 2
  const n = chars.length
  const dimColor = dim || 'rgba(255,255,255,0.30)'
  for (let i = 0; i < n; i++) {
    const ch = chars[i], cw = widths[i]
    if (ch !== ' ') {
      const dur = 1 / (1 + (n - 1) * (1 - overlap))
      const lt = clamp((clamp(p, 0, 1) - i * dur * (1 - overlap)) / dur, 0, 1)
      if (lt > 0) {
        const zz = clamp(z, 0.05, 0.999), wd = ww * Math.sqrt(1 - zz * zz)
        const e = lt >= 1 ? 1 : 1 - Math.exp(-zz * ww * lt) * (Math.cos(wd * lt) + (zz * ww / wd) * Math.sin(wd * lt))
        ctx.save()
        ctx.globalAlpha *= clamp(0.15 + lt * 1.4, 0, 1)
        ctx.fillStyle = lt < 0.55 ? dimColor : color
        ctx.fillText(ch, x, y + s * 0.06 * (1 - e))
        ctx.restore()
      }
    }
    x += cw + tracking
  }
  _rec(ctx, str, str, cx, y, s, maxW, 'center', weight)
  ctx.restore()
  return s
}
