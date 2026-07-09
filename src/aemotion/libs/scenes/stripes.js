// am.scene.stripes — POSTER: bloques/franjas duras que entran con stagger + squash y el texto gigante
// encima. Composicion brutal de alto contraste (la familia poster vive de esto).
import { wrapFit } from '../../core/text.js'
import { drawShape } from '../../core/shapes.js'
import { rectPath } from '../../core/path.js'
import { spring, springVel, stagger, win } from '../../core/motion.js'
import { applyCase } from '../fonts.js'
import { rgba, clamp, fontStr } from '../../core/util.js'

export default {
  id: 'am.scene.stripes', lib: 'scenes', kind: ['hook', 'line'], weight: 0.7, hookWeight: 0.9,
  famBias: { poster: 1.9, liquidpop: 1.2, editorial: 0.4, orbita: 0.6 },
  render(ctx, ts, env) {
    const { W, H, dna, ink, acc } = env
    const r = env.rng('stripes')
    const n = 3 + ((r() * 2) | 0)
    const p = clamp(win(ts, 0.02, 0.85), 0, 1)
    const hS = H / n
    for (let i = 0; i < n; i++) {
      const lp = stagger(p, i, n, dna.staggerOverlap)
      if (lp <= 0) continue
      const e = spring(lp, dna.z, dna.w)
      const sv = springVel(lp, dna.z, dna.w)
      const dir = i % 2 ? 1 : -1
      const x = dir * W * (1 - e)
      const stretch = 1 + clamp(Math.abs(sv) * 0.02, 0, 0.18)
      const alpha = i % 2 ? 0.1 : 0.16
      ctx.save()
      ctx.translate(x, 0)
      ctx.translate(W / 2, i * hS + hS / 2); ctx.scale(stretch, 1 / stretch); ctx.translate(-W / 2, -(i * hS + hS / 2))
      drawShape(ctx, ts, { path: rectPath(0, i * hS + 2, W, hS - 4, dna.radius), fill: rgba(acc, alpha) })
      ctx.restore()
    }

    // texto gigante encima (entra despues de las franjas)
    const text = applyCase(env.text, dna.caseMode)
    const maxW = W - env.margin * 2
    const wr = wrapFit(ctx, text, Math.round(W * 0.17), maxW, 20, dna.dw, dna.display, 3, dna.trackingBias)
    const lineH = wr.size * 1.06
    const e = spring(win(ts, 0.35, 0.9), dna.z * 0.85, dna.w * 1.1)
    ctx.save()
    ctx.globalAlpha *= clamp(e * 1.6, 0, 1)
    ctx.font = fontStr(dna.dw, wr.size, dna.display); ctx.letterSpacing = dna.trackingBias + 'px'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = ink
    const y0 = H * 0.5 - ((wr.lines.length - 1) / 2) * lineH
    wr.lines.forEach((ln, i) => {
      const dx = (i % 2 ? 1 : -1) * (1 - e) * 30
      ctx.fillText(ln, W / 2 + dx, y0 + i * lineH)
    })
    ctx.restore()
  },
}
