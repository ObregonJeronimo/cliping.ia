// kin.scene.typewriter — tecnica 1: el claim GIGANTE letra por letra con settle (el look "Every story").
// El modo de asentado deriva del DNA (funcion pura de la identidad -> consistente dentro del video).
import { drawKinetic, drawText, wrapFit } from '../../core/text.js'
import { win } from '../../core/motion.js'
import { applyCase } from '../fonts.js'
import { fontStr } from '../../core/util.js'

export default {
  id: 'kin.scene.typewriter', lib: 'scenes', kind: ['hook', 'line'], weight: 1.3,
  render(ctx, ts, env) {
    const { W, H, dna, ink } = env
    const text = applyCase(env.text, dna.caseMode)
    const maxW = W - env.margin * 2
    const mode = dna.z < 0.58 ? 'drop' : (dna.mood[1] > 0.6 ? 'settle' : 'type')
    // hasta 2 lineas: wrapFit decide tamano unico; cada linea revela en su ventana
    const base = Math.round(W * 0.24)
    ctx.font = fontStr(dna.dw, base, dna.display)
    const wr = wrapFit(ctx, text, base, maxW, 22, dna.dw, dna.display, 2, dna.trackingBias)
    const lineH = wr.size * 1.14
    const cy = H * (dna.align === 'left' ? 0.44 : 0.5) - (wr.lines.length - 1) * lineH / 2
    const p = win(ts, 0.08, Math.min(env.dur * 0.62, 1.6))
    wr.lines.forEach((ln, i) => {
      const lp = wr.lines.length === 1 ? p : win(p, i / wr.lines.length, (i + 1) / wr.lines.length)
      drawKinetic(ctx, ln, W / 2, cy + i * lineH, lp, {
        size: wr.size, weight: dna.dw, family: dna.display, maxW, color: ink,
        mode, overlap: dna.staggerOverlap, tracking: dna.trackingBias, z: dna.z, w: dna.w,
      })
    })
    // kicker chico arriba (marca) — posicion/presencia por DNA, no fija
    if (dna.align !== 'left' && env.video.brand && env.sc.role === 'hook') {
      drawText(ctx, applyCase(env.video.brand, 'upper'), W / 2, cy - lineH * 0.95, {
        size: Math.max(11, wr.size * 0.16), weight: dna.sw >= 600 ? dna.sw : 600, family: dna.support,
        maxW: maxW * 0.8, color: ink, alpha: 0.55 * win(ts, 0.3, 0.8), tracking: 2.2,
      })
    }
  },
}
