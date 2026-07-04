// kin.scene.stat — numero GIGANTE con overshoot (fiteado contra maxW/overshoot: el pico transitorio
// tampoco desborda) + label chico + anillo dashed que se auto-dibuja.
import { fitFont, drawText } from '../../core/text.js'
import { spring, win } from '../../core/motion.js'
import { fontStr, TAU } from '../../core/util.js'

export default {
  id: 'kin.scene.stat', lib: 'scenes', kind: ['stat'], weight: 1,
  render(ctx, ts, env) {
    const { W, H, dna, ink } = env
    const maxW = (W - env.margin * 2) / dna.overshoot
    const e = spring(win(ts, 0.1, 0.55), dna.z * 0.85, dna.w)
    const size = fitFont(ctx, env.text, Math.round(W * 0.34), maxW, 30, dna.dw, dna.display, dna.trackingBias)
    const sc = 0.5 + 0.5 * e * dna.overshoot
    ctx.save()
    ctx.translate(W / 2, H * 0.47)
    ctx.scale(Math.min(sc, dna.overshoot), Math.min(sc, dna.overshoot))
    ctx.font = fontStr(dna.dw, size, dna.display); ctx.letterSpacing = dna.trackingBias + 'px'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = dna.accent
    ctx.globalAlpha = Math.min(1, e * 2.2)
    ctx.fillText(env.text, 0, 0)
    ctx.restore()
    // anillo dashed que se traza alrededor (auto-dibujo, tecnica 13)
    const ringP = win(ts, 0.35, 1.1)
    if (ringP > 0) {
      ctx.save()
      ctx.strokeStyle = ink; ctx.globalAlpha = 0.35; ctx.lineWidth = 1.6
      ctx.setLineDash([4, 7])
      ctx.beginPath(); ctx.arc(W / 2, H * 0.47, size * 0.85, -Math.PI / 2, -Math.PI / 2 + TAU * spring(ringP, 0.85, 8))
      ctx.stroke(); ctx.restore()
    }
    if (env.sub) drawText(ctx, env.sub, W / 2, H * 0.47 + size * 0.72, {
      size: Math.max(12, size * 0.13), weight: dna.sw, family: dna.support, maxW: W - env.margin * 2,
      color: ink, alpha: 0.8 * win(ts, 0.45, 0.9), tracking: 1.4,
    })
  },
}
