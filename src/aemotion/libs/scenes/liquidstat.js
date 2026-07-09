// am.scene.liquidstat — el stat como LIQUIDO: el numero gigante entra con spring y 2 gotas satelite
// llegan, se FUNDEN con la principal por membrana metaball y quedan respirando. La firma liquid.
import { drawText } from '../../core/text.js'
import { drawShape } from '../../core/shapes.js'
import { circlePath } from '../../core/path.js'
import { metaballPath } from '../../core/liquid.js'
import { spring, win, cubicOut } from '../../core/motion.js'
import { rgba, clamp, TAU } from '../../core/util.js'

export default {
  id: 'am.scene.liquidstat', lib: 'scenes', kind: ['stat'], weight: 1.1,
  famBias: { liquidpop: 1.6, orbita: 1.1, editorial: 0.7 },
  render(ctx, ts, env) {
    const { W, H, dna, ink, acc } = env
    const r = env.rng('liquid')
    const cy = H * 0.56

    // gotas: la principal late; dos satelites llegan con spring y se funden
    const yD = H * 0.3
    const xM = W * (0.42 + r() * 0.16)
    const rM = 26 + r() * 8 + 1.6 * Math.sin(ts * TAU * 0.22)
    const sats = []
    for (let i = 0; i < 2; i++) {
      const from = xM + (i ? 1 : -1) * (W * (0.3 + r() * 0.1))
      const e = spring(win(ts, 0.25 + i * 0.45, 1.05 + i * 0.45), dna.z, dna.w * 0.9)
      const x = from + (xM + (i ? 1 : -1) * rM * 0.9 - from) * e
      sats.push({ x, y: yD + (i ? -1 : 1) * 6 * (1 - e), r: (11 + r() * 5) * clamp(0.3 + e, 0, 1) })
    }
    drawShape(ctx, ts, { path: circlePath(xM, yD, rM), fill: acc })
    for (const s of sats) {
      if (s.r < 1) continue
      drawShape(ctx, ts, { path: circlePath(s.x, s.y, s.r), fill: acc })
      const mem = metaballPath(xM, yD, rM, s.x, s.y, s.r, { v: 0.55 })
      if (mem) drawShape(ctx, ts, { path: mem, fill: acc })
    }

    // el numero
    const e = spring(win(ts, 0.15, 0.7), dna.z * 0.9, dna.w)
    ctx.save()
    ctx.globalAlpha *= clamp(e * 1.5, 0, 1)
    ctx.translate(W / 2, cy); ctx.scale(0.75 + 0.25 * e, 0.75 + 0.25 * e); ctx.translate(-W / 2, -cy)
    drawText(ctx, env.text, W / 2, cy, { size: Math.round(W * 0.3), weight: dna.dw, family: dna.display, maxW: W - env.margin * 2, color: ink, tracking: dna.trackingBias })
    ctx.restore()
    if (env.sub) drawText(ctx, env.sub, W / 2, cy + W * 0.19, {
      size: 16, weight: dna.sw, family: dna.support, maxW: W - env.margin * 2.5, color: ink, alpha: 0.65 * cubicOut(win(ts, 0.5, 1)),
    })
  },
}
