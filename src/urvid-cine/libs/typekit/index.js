// urvid 1.0 · biblioteca TYPEKIT — efectos de TEXTO CINETICO (entrada por letra/palabra, draw-on, typewriter, pop).
// Cada modulo: make() -> { draw(ctx,str,x,y,opts), drawWrapped(...) }. El director elige UNO -> env.typekit.
// Las escenas pasan opts.reveal (su progreso de entrada [0..1]); cuando reveal>=1 el efecto delega a drawText
// EXACTO (estado final limpio, no-desborde garantizado). PURO + DETERMINISTA (todo por reveal; sin Math.random).
// REGLA: el texto SIEMPRE se fitea antes (core/text), asi ninguna letra se sale de la caja. Color = el que pasa la escena.
import { register } from '../../core/registry.js'
import { drawText, drawWrapped as drawWrappedCore, fitFont, clip, wrap } from '../../core/text.js'
import { fontStr, clamp, eOutCubic } from '../../core/util.js'

// fitea una linea a opts (igual criterio que drawText) -> { s (tamano), txt (clipeado) }. Setea ctx.font.
function fitLine(ctx, str, opts) {
  const { size = 40, weight = 700, family = 'Inter', maxW = 0, min = 14 } = opts
  let s = size
  if (maxW > 0) s = fitFont(ctx, String(str), size, maxW, min, weight, family)
  ctx.font = fontStr(weight, s, family)
  const txt = maxW > 0 ? clip(ctx, String(str), maxW) : String(str)
  return { s, txt }
}

// factory: un efecto define SOLO lineFn(ctx, txt, x, y, s, opts, reveal). El factory arma draw (1 linea) y
// drawWrapped (N lineas con reveal escalonado por linea). reveal>=1 -> delega a core (identico, settled).
function mk(id, lineFn, meta = {}) {
  register({
    id, lib: 'typekit', category: meta.category || 'kinetic',
    tones: meta.tones || ['dark', 'light'], rubros: meta.rubros || ['*'], weight: meta.weight || 1, tags: meta.tags || [],
    make() {
      const draw = (ctx, str, x, y, opts = {}) => {
        const reveal = opts.reveal != null ? clamp(opts.reveal, 0, 1) : 1
        if (reveal >= 1) return drawText(ctx, str, x, y, opts)
        const { s, txt } = fitLine(ctx, str, opts)
        ctx.save(); ctx.globalAlpha *= clamp(opts.alpha != null ? opts.alpha : 1, 0, 1)
        lineFn(ctx, txt, x, y, s, opts, reveal)
        ctx.restore()
        return s
      }
      const drawWrapped = (ctx, str, x, y, opts = {}) => {
        const reveal = opts.reveal != null ? clamp(opts.reveal, 0, 1) : 1
        if (reveal >= 1) return drawWrappedCore(ctx, str, x, y, opts)
        const { size = 40, weight = 700, family = 'Inter', maxW = 300, min = 16, maxLines = 2, lh = 1.2 } = opts
        const w = wrap(ctx, str, size, maxW, min, weight, family, maxLines)
        const lineH = w.size * lh, total = (w.lines.length - 1) * lineH
        ctx.save(); ctx.globalAlpha *= clamp(opts.alpha != null ? opts.alpha : 1, 0, 1)
        w.lines.forEach((ln, i) => {
          const lr = clamp(reveal * (w.lines.length + 0.5) - i, 0, 1)   // cada linea entra escalonada
          lineFn(ctx, ln, x, y - total / 2 + i * lineH, w.size, opts, lr)
        })
        ctx.restore()
        return total + w.size
      }
      return { id, draw, drawWrapped }
    },
  })
}

// helper: posicion x inicial segun alineacion para una linea de ancho total tw centrada en x.
function startX(x, tw, align) { return align === 'left' ? x : align === 'right' ? x - tw : x - tw / 2 }
function setShadow(ctx, opts) { if (opts.shadow) { ctx.shadowColor = opts.shadow; ctx.shadowBlur = opts.shadowBlur || 6 } }

// ---- efectos (lineFn) ----

// entrada por LETRA: cada glifo sube y aparece, escalonado de izq a der.
mk('typekit.effect.char-rise', (ctx, txt, x, y, s, opts, reveal) => {
  const { weight = 700, family = 'Inter', align = 'center', baseline = 'middle', color = '#fff' } = opts
  ctx.font = fontStr(weight, s, family); ctx.textAlign = 'left'; ctx.textBaseline = baseline
  const chars = [...txt], ws = chars.map(c => ctx.measureText(c).width), tw = ws.reduce((a, b) => a + b, 0)
  let cx = startX(x, tw, align), n = chars.length
  for (let i = 0; i < n; i++) {
    const local = eOutCubic(clamp((reveal - (i / n) * 0.6) / 0.4, 0, 1))
    ctx.save(); ctx.globalAlpha *= local; ctx.fillStyle = color; setShadow(ctx, opts)
    ctx.fillText(chars[i], cx, y + (1 - local) * s * 0.45); ctx.restore()
    cx += ws[i]
  }
}, { tags: ['letra', 'stagger', 'entrada'], weight: 1.1 })

// POP por letra: cada glifo escala desde chico, escalonado (energico).
mk('typekit.effect.char-pop', (ctx, txt, x, y, s, opts, reveal) => {
  const { weight = 700, family = 'Inter', align = 'center', baseline = 'middle', color = '#fff' } = opts
  ctx.font = fontStr(weight, s, family); ctx.textBaseline = baseline
  const chars = [...txt], ws = chars.map(c => ctx.measureText(c).width), tw = ws.reduce((a, b) => a + b, 0)
  let cx = startX(x, tw, align), n = chars.length
  for (let i = 0; i < n; i++) {
    const local = eOutCubic(clamp((reveal - (i / n) * 0.55) / 0.45, 0, 1)), sc = 0.55 + 0.45 * local
    const gx = cx + ws[i] / 2
    ctx.save(); ctx.globalAlpha *= local; ctx.fillStyle = color; setShadow(ctx, opts)
    ctx.translate(gx, y); ctx.scale(sc, sc); ctx.textAlign = 'center'; ctx.fillText(chars[i], 0, 0); ctx.restore()
    cx += ws[i]
  }
}, { tags: ['letra', 'pop', 'energico'], weight: 0.95 })

// DRAW-ON: el texto se revela por una mascara que barre de izq a der (como escrito al vuelo).
mk('typekit.effect.draw-on', (ctx, txt, x, y, s, opts, reveal) => {
  const { weight = 700, family = 'Inter', align = 'center', baseline = 'middle', color = '#fff' } = opts
  ctx.font = fontStr(weight, s, family)
  const tw = ctx.measureText(txt).width, lx = startX(x, tw, align)
  ctx.save(); ctx.beginPath(); ctx.rect(lx - 4, y - s, tw * reveal + 4, s * 2); ctx.clip()
  ctx.textAlign = align; ctx.textBaseline = baseline; ctx.fillStyle = color; setShadow(ctx, opts)
  ctx.fillText(txt, x, y); ctx.restore()
}, { tags: ['draw-on', 'barrido', 'editorial'], weight: 1 })

// TYPEWRITER: aparecen N letras segun reveal + un cursor de bloque al final.
mk('typekit.effect.typewriter', (ctx, txt, x, y, s, opts, reveal) => {
  const { weight = 700, family = 'Inter', align = 'center', baseline = 'middle', color = '#fff' } = opts
  ctx.font = fontStr(weight, s, family); ctx.textAlign = align; ctx.textBaseline = baseline; ctx.fillStyle = color; setShadow(ctx, opts)
  const chars = [...txt], k = Math.max(0, Math.min(chars.length, Math.ceil(reveal * chars.length)))
  const shown = chars.slice(0, k).join('')
  ctx.fillText(shown, x, y)
  // cursor: bloque al final del texto mostrado
  const tw = ctx.measureText(shown).width, full = ctx.measureText(txt).width
  const cxEnd = startX(x, full, align) + Math.min(tw, full)
  ctx.globalAlpha *= 0.7; ctx.fillRect(cxEnd + 2, y - s * 0.36, s * 0.1, s * 0.72)
}, { tags: ['typewriter', 'mono', 'tech'], weight: 0.85, rubros: ['*', 'tech', 'startup'] })

// entrada por PALABRA: cada palabra sube y aparece, escalonada.
mk('typekit.effect.word-rise', (ctx, txt, x, y, s, opts, reveal) => {
  const { weight = 700, family = 'Inter', align = 'center', baseline = 'middle', color = '#fff' } = opts
  ctx.font = fontStr(weight, s, family); ctx.textAlign = 'left'; ctx.textBaseline = baseline
  const words = txt.split(' '), sp = ctx.measureText(' ').width
  const ww = words.map(w => ctx.measureText(w).width), tw = ww.reduce((a, b) => a + b, 0) + sp * (words.length - 1)
  let cx = startX(x, tw, align), n = words.length
  for (let i = 0; i < n; i++) {
    const local = eOutCubic(clamp((reveal - (i / n) * 0.6) / 0.4, 0, 1))
    ctx.save(); ctx.globalAlpha *= local; ctx.fillStyle = color; setShadow(ctx, opts)
    ctx.fillText(words[i], cx, y + (1 - local) * s * 0.4); ctx.restore()
    cx += ww[i] + sp
  }
}, { tags: ['palabra', 'stagger', 'entrada'], weight: 1.05 })

// SLIDE suave: la linea entra desplazada en x y se asienta (sutil, una sola pieza).
mk('typekit.effect.line-slide', (ctx, txt, x, y, s, opts, reveal) => {
  const { weight = 700, family = 'Inter', align = 'center', baseline = 'middle', color = '#fff' } = opts
  const e = eOutCubic(reveal)
  ctx.save(); ctx.globalAlpha *= e; ctx.font = fontStr(weight, s, family); ctx.textAlign = align; ctx.textBaseline = baseline
  ctx.fillStyle = color; setShadow(ctx, opts)
  ctx.fillText(txt, x + (1 - e) * s * 0.6, y); ctx.restore()
}, { tags: ['slide', 'suave', 'sutil'], weight: 1 })
