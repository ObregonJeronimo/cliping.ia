// am.scene.orbit — anillos concentricos que se DIBUJAN (trim paths staggered) y rotan lento alrededor
// del contenido central (texto o stat). El look "orbital" del template de referencia.
import { wrapFit, drawText } from '../../core/text.js'
import { drawShape } from '../../core/shapes.js'
import { circlePath } from '../../core/path.js'
import { win, stagger, cubicOut } from '../../core/motion.js'
import { applyCase } from '../fonts.js'
import { rgba, clamp, fontStr } from '../../core/util.js'
import { seedFor } from '../../core/prng.js'

export default {
  id: 'am.scene.orbit', lib: 'scenes', kind: ['line', 'stat'], weight: 0.9,
  famBias: { orbita: 1.6, blueprint: 1.35, poster: 0.5 },
  render(ctx, ts, env) {
    const { W, H, dna, ink, acc } = env
    const r = env.rng('orbit')
    const cy = H * 0.48
    const nR = 2 + ((r() * 2) | 0)
    const base = Math.min(W, H) * (0.3 + r() * 0.06)
    const p = clamp(win(ts, 0.05, 1.3), 0, 1)
    for (let i = 0; i < nR; i++) {
      const lp = stagger(p, i, nR, 0.55)
      if (lp <= 0) continue
      const R = base + i * (26 + r() * 10)
      const dir = i % 2 ? 1 : -1
      drawShape(ctx, ts, {
        path: circlePath(W / 2, cy, R),
        stroke: { color: rgba(acc, 0.65 - i * 0.16), width: 2.5 - i * 0.5 },
        trim: { start: 0, end: cubicOut(lp) * (0.72 + r() * 0.28), offset: dir * ts * 0.02 + r() },
      })
    }
    // satelite: un punto que orbita el anillo interior (vida continua, cerrada en t)
    const aSat = ts * 0.55 + r() * 6.28
    ctx.save(); ctx.globalAlpha *= p
    ctx.fillStyle = acc
    ctx.beginPath(); ctx.arc(W / 2 + Math.cos(aSat) * base, cy + Math.sin(aSat) * base, 4, 0, 6.283); ctx.fill()
    ctx.restore()

    // contenido central
    if (env.sc.role === 'stat') {
      const val = applyCase(env.text, 'upper')
      const e = clamp(win(ts, 0.25, 0.8), 0, 1)
      ctx.save(); ctx.globalAlpha *= e
      drawText(ctx, val, W / 2, cy - 8, { size: Math.round(W * 0.19), weight: dna.dw, family: dna.display, maxW: base * 1.6, color: ink, tracking: dna.trackingBias })
      if (env.sub) drawText(ctx, env.sub, W / 2, cy + Math.round(W * 0.19) * 0.62, { size: 15, weight: dna.sw, family: dna.support, maxW: base * 1.7, color: ink, alpha: 0.65 })
      ctx.restore()
    } else {
      const text = applyCase(env.text, dna.caseMode)
      const wr = wrapFit(ctx, text, Math.round(W * 0.105), base * 1.55, 15, dna.dw, dna.display, 3, dna.trackingBias)
      const lineH = wr.size * 1.16
      const e = clamp(win(ts, 0.3, 0.9), 0, 1)
      ctx.save(); ctx.globalAlpha *= e
      ctx.font = fontStr(dna.dw, wr.size, dna.display); ctx.letterSpacing = dna.trackingBias + 'px'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = ink
      wr.lines.forEach((ln, i) => ctx.fillText(ln, W / 2, cy + (i - (wr.lines.length - 1) / 2) * lineH))
      ctx.restore()
    }
  },
}
