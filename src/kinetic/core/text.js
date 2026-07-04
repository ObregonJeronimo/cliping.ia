// kinetic 1.0 · TEXTO — primitivas con la GARANTIA nunca-desborda (regla heredada de urvid, re-implementada
// limpia): SIEMPRE se fitea ANTES de dibujar; el dibujo por caracter avanza con anchos MEDIDOS, asi el total
// dibujado == el total fiteado. drawKinetic es la primitiva estrella: typewriter/settle por caracter calibre AE.
import { fontStr, clamp } from './util.js'
import { stagger, spring } from './motion.js'

// --- fit (mismo contrato que urvid: achicar hasta entrar, nunca elidir salvo ultimo recurso) ---
export function fitFont(ctx, str, base, maxW, min, weight, family, tr = 0) {
  let s = base; ctx.font = fontStr(weight, s, family)
  const _ls = ctx.letterSpacing || '0px'; ctx.letterSpacing = (tr || 0) + 'px'
  while (s > min && ctx.measureText(str).width > maxW) { s -= 1; ctx.font = fontStr(weight, s, family) }
  ctx.letterSpacing = _ls
  return s
}

// envuelve en <= maxLines achicando hasta que TODO entre (sin elipsis; el guionista ya corta frases largas)
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
  if (!out) out = { size: min, lines: at(min).ls.slice(0, maxLines) }   // ultimo recurso: no deberia pasar (guion corto)
  ctx.letterSpacing = _ls
  return out
}

// --- dibujo simple (CTA, tags, labels) ---
export function drawText(ctx, str, x, y, opts = {}) {
  const { size = 40, weight = 700, family = 'Inter', align = 'center', baseline = 'middle', maxW = 0, min = 12, color = '#fff', alpha = 1, tracking = 0, shadow = null } = opts
  ctx.save(); ctx.globalAlpha *= clamp(alpha, 0, 1)
  let s = size
  if (maxW > 0) s = fitFont(ctx, String(str), size, maxW, min, weight, family, tracking)
  ctx.font = fontStr(weight, s, family); ctx.letterSpacing = tracking + 'px'
  ctx.textAlign = align; ctx.textBaseline = baseline; ctx.fillStyle = color
  if (shadow) { ctx.shadowColor = shadow; ctx.shadowBlur = opts.shadowBlur || 8 }
  ctx.fillText(String(str), x, y)
  ctx.restore()
  return s
}

// --- layout por caracter (medido una vez por frame; el ctx.font ya debe estar seteado) ---
// devuelve [{ch, x}] con x = borde IZQUIERDO de cada char, para un string centrado en cx.
function charLayout(ctx, str, cx, tracking) {
  const chs = Array.from(String(str))
  const widths = chs.map(c => ctx.measureText(c).width)
  const total = widths.reduce((a, b) => a + b, 0) + tracking * Math.max(0, chs.length - 1)
  let x = cx - total / 2
  return chs.map((ch, i) => { const o = { ch, x, w: widths[i] }; x += widths[i] + tracking; return o })
}

// drawKinetic — typewriter/settle POR CARACTER. p = progreso de la revelacion [0,1].
// mode: 'settle' (gris->tinta con caida suave, el look "Every story" del reel)
//       'drop'   (la letra aparece chica arriba y cae a su lugar, el look "ITS MOTION")
//       'type'   (aparicion seca por caracter, maquina de escribir pura)
// SIEMPRE: fitea la linea COMPLETA primero -> el ancho final es el fiteado, nada desborda jamas.
export function drawKinetic(ctx, str, cx, cy, p, opts = {}) {
  const { size = 90, weight = 800, family = 'Inter', maxW = 400, min = 20, color = '#111', dimColor = null,
    mode = 'settle', overlap = 0.55, tracking = 0, alpha = 1, z = 0.66, w = 13 } = opts
  str = String(str == null ? '' : str)
  if (!str) return { size: 0 }
  ctx.save(); ctx.globalAlpha *= clamp(alpha, 0, 1)
  const s = fitFont(ctx, str, size, maxW, min, weight, family, tracking)
  ctx.font = fontStr(weight, s, family)
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
  const chars = charLayout(ctx, str, cx, tracking)
  const n = chars.length
  for (let i = 0; i < n; i++) {
    const c = chars[i]
    if (c.ch === ' ') continue
    const lt = stagger(clamp(p, 0, 1), i, n, overlap)
    if (lt <= 0) continue
    const e = spring(lt, z, w)
    ctx.save()
    if (mode === 'drop') {
      // aparece a 0.4x arriba-derecha y cae con settle (el "superindice que cae" del reel)
      const sc = 0.4 + 0.6 * e
      const dy = -s * 0.55 * (1 - e)
      ctx.globalAlpha *= clamp(lt * 3, 0, 1)
      ctx.translate(c.x + c.w / 2, cy + dy)
      ctx.scale(sc, sc)
      ctx.fillStyle = color
      ctx.fillText(c.ch, -c.w / 2, 0)
    } else if (mode === 'type') {
      ctx.fillStyle = color
      if (lt > 0.001) ctx.fillText(c.ch, c.x, cy)
    } else {
      // settle: entra desde gris tenue con caida minima -> se asienta en la tinta final
      const dim = dimColor || (color === '#fff' || color === '#ffffff' ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.22)')
      ctx.globalAlpha *= clamp(0.15 + lt * 1.4, 0, 1)
      ctx.fillStyle = lt < 0.55 ? dim : color
      ctx.fillText(c.ch, c.x, cy + s * 0.06 * (1 - e))
    }
    ctx.restore()
  }
  ctx.restore()
  return { size: s }
}

// drawWordReveal — palabra-por-palabra con FUTURAS atenuadas (tecnica 2 del reel: "Every frame deliberate.")
// p [0,1] revela n palabras; las no-reveladas se dibujan en dimColor (presentes pero apagadas).
export function drawWordReveal(ctx, str, cx, cy, p, opts = {}) {
  const { size = 54, weight = 600, family = 'Inter', maxW = 400, min = 16, color = '#fff', dimAlpha = 0.28, alpha = 1, tracking = 0 } = opts
  str = String(str == null ? '' : str).replace(/\s+/g, ' ').trim()
  if (!str) return { size: 0 }
  ctx.save(); ctx.globalAlpha *= clamp(alpha, 0, 1)
  const s = fitFont(ctx, str, size, maxW, min, weight, family, tracking)
  ctx.font = fontStr(weight, s, family); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
  const words = str.split(' ')
  const sp = ctx.measureText(' ').width + tracking
  const widths = words.map(w2 => ctx.measureText(w2).width)
  const total = widths.reduce((a, b) => a + b, 0) + sp * (words.length - 1)
  let x = cx - total / 2
  const n = words.length
  for (let i = 0; i < n; i++) {
    const lt = stagger(clamp(p, 0, 1), i, n, 0.25)
    const on = lt > 0.35
    ctx.save()
    ctx.globalAlpha *= on ? 1 : dimAlpha
    ctx.fillStyle = color
    ctx.fillText(words[i], x, cy + (on ? 0 : s * 0.02))
    ctx.restore()
    x += widths[i] + sp
  }
  ctx.restore()
  return { size: s }
}
