// kin.scene.statement — tecnicas 8+16: o un RESPIRO (forma sola ~2s, silencio visual) o una frase
// que entra con SLAM+ghost. El respiro es la pausa dramatica del genero (esfera->punto del reel).
import { drawText, wrapFit } from '../../core/text.js'
import { spring, win, ghost, wobble } from '../../core/motion.js'
import { polarShapePath, blobHarmonics } from '../../core/shapes.js'
import { applyCase } from '../fonts.js'
import { fontStr } from '../../core/util.js'

export default {
  id: 'kin.scene.statement', lib: 'scenes', kind: ['breath', 'hook', 'line'], weight: 1, hookWeight: 0.45,
  render(ctx, ts, env) {
    const { W, H, dna, ink } = env
    if (!env.text) {
      // RESPIRO: una forma del DNA que encoge a punto con ease larguisimo (tecnica 8)
      const r = env.rng('breath')
      const harm = blobHarmonics(r, 0.12)
      const p = win(ts, 0, env.dur)
      const sz = (1 - Math.pow(p, 0.32)) * W * 0.16 + 2.2      // decae rapido al principio, cola larga
      ctx.save()
      ctx.fillStyle = dna.accent
      polarShapePath(ctx, W / 2, H / 2, sz, { blob: 0.6, diamond: 0, square: 0 }, harm, p * 0.9)
      ctx.fill()
      ctx.restore()
      return
    }
    // SLAM: frase que golpea con overshoot + ghost (motion blur fake) + micro-wobble. Envuelve a 2 lineas
    // GRANDES (el genero es tipografia enorme: mejor 2 lineas gigantes que 1 chica) + drift sutil de idle.
    const text = applyCase(env.text, dna.caseMode)
    const maxW = W - env.margin * 2
    const inDur = 0.34
    const e = spring(win(ts, 0.05, 0.05 + inDur), dna.z * 0.82, dna.w * 1.15)
    const sc = 0.6 + 0.4 * e * dna.overshoot - (e >= 1 ? (dna.overshoot - 1) * 0.4 : 0)
    const rot = wobble(win(ts, 0.05, 1.1), 2, 5) * 0.04
    const wr = wrapFit(ctx, text, Math.round(W * 0.16), maxW / dna.overshoot, 18, dna.dw, dna.display, 2, dna.trackingBias)
    const lineH = wr.size * 1.12
    const idle = 1 + Math.sin(ts * 0.9) * 0.006                // respiracion sutil: la escena nunca esta muerta
    ctx.save()
    ctx.translate(W / 2, H * 0.5); ctx.rotate(rot); ctx.scale(Math.min(sc, dna.overshoot) * idle, Math.min(sc, dna.overshoot) * idle)
    const vy = (1 - e) * 26
    ghost(ctx, c => {
      c.font = fontStr(dna.dw, wr.size, dna.display); c.letterSpacing = dna.trackingBias + 'px'
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = ink
      c.globalAlpha *= Math.min(1, e * 2)
      wr.lines.forEach((ln, i) => c.fillText(ln, 0, (i - (wr.lines.length - 1) / 2) * lineH))
    }, 0, vy, ts < 0.5 ? dna.ghostK : 0)
    ctx.restore()
    // sub chico (si vino)
    if (env.sub) drawText(ctx, env.sub, W / 2, H * 0.5 + (wr.lines.length * lineH) * 0.75 + 8, {
      size: Math.max(11, wr.size * 0.22), weight: dna.sw, family: dna.support, maxW: maxW * 0.85,
      color: ink, alpha: 0.6 * win(ts, 0.4, 0.9),
    })
  },
}
