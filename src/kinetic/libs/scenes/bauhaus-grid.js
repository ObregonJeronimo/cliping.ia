// kin.scene.bauhaus — tecnica 10 del reel: la frase arriba GRANDE + una fila de tiles geometricos que
// entran con stagger y CICLAN patrones al beat local. Ritmo visual puro; paleta = paper/accent del DNA.
import { drawKinetic, wrapFit } from '../../core/text.js'
import { spring, win, stagger } from '../../core/motion.js'
import { drawBauhausTile } from '../garnish.js'
import { applyCase } from '../fonts.js'
import { fontStr } from '../../core/util.js'

export default {
  id: 'kin.scene.bauhaus', lib: 'scenes', kind: ['line'], weight: 0.85,
  render(ctx, ts, env) {
    const { W, H, dna, ink } = env
    const r = env.rng('bau')
    const text = applyCase(env.text, dna.caseMode)
    const p = win(ts, 0.08, Math.min(env.dur * 0.55, 1.3))
    // envuelve a <=2 lineas (nunca desborda ni con pares anchos tipo Unbounded); cada linea re-fitea
    const maxW = W - env.margin * 2
    ctx.font = fontStr(dna.dw, Math.round(W * 0.14), dna.display)
    const wr = wrapFit(ctx, text, Math.round(W * 0.14), maxW, 14, dna.dw, dna.display, 2, dna.trackingBias)
    const lineH = wr.size * 1.12
    const ty = H * 0.34 - (wr.lines.length - 1) * lineH / 2
    wr.lines.forEach((ln, i) => {
      const lp = wr.lines.length === 1 ? p : win(p, i / wr.lines.length, (i + 1) / wr.lines.length)
      drawKinetic(ctx, ln, W / 2, ty + i * lineH, lp, {
        size: wr.size, weight: dna.dw, family: dna.display, maxW, min: 14,
        color: ink, mode: dna.z < 0.6 ? 'drop' : 'settle', overlap: dna.staggerOverlap,
        tracking: dna.trackingBias, z: dna.z, w: dna.w,
      })
    })
    // fila de 3 tiles: cada uno cicla su patron desfasado al beat (60/bpm) -> "vive" toda la escena
    const n = 3, s = W * 0.19, gap = W * 0.06
    const total = n * s + (n - 1) * gap
    const y = H * 0.56
    const beatDur = 60 / dna.bpm
    const off = (r() * 3) | 0                                  // desfase inicial estable por escena
    for (let i = 0; i < n; i++) {
      const lp = stagger(win(ts, 0.3, 1.1), i, n, 0.5)
      if (lp <= 0) continue
      const pop = spring(lp, dna.z * 0.85, dna.w)
      const phase = (off + i + Math.floor(ts / beatDur)) % 3
      ctx.save()
      ctx.translate(W / 2 - total / 2 + i * (s + gap) + s / 2, y + s / 2)
      ctx.scale(Math.min(pop * dna.overshoot, dna.overshoot), Math.min(pop * dna.overshoot, dna.overshoot))
      drawBauhausTile(ctx, -s / 2, -s / 2, s, phase, env.dark ? dna.paperLight : dna.paperDark, dna.accent)
      ctx.restore()
    }
  },
}
