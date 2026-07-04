// kin.scene.wordcascade — tecnica 2: reveal palabra-por-palabra con futuras ATENUADAS (firma del genero).
import { drawWordReveal } from '../../core/text.js'
import { win } from '../../core/motion.js'
import { applyCase } from '../fonts.js'

export default {
  id: 'kin.scene.wordcascade', lib: 'scenes', kind: ['line'], weight: 1.2,
  render(ctx, ts, env) {
    const { W, H, dna, ink } = env
    const text = applyCase(env.text, dna.caseMode === 'upper' ? 'sentence' : dna.caseMode)  // cascade respira mejor sin caja alta
    const p = win(ts, 0.1, Math.min(env.dur * 0.7, 1.5))
    drawWordReveal(ctx, text, W / 2, H * 0.5, p, {
      size: Math.round(W * 0.13), weight: dna.dw, family: dna.display,
      maxW: W - env.margin * 2, color: ink, dimAlpha: 0.22, tracking: dna.trackingBias * 0.5,
    })
  },
}
