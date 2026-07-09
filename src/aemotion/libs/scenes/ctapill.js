// am.scene.ctapill — cierre SIEMPRE: CTA con 4 variantes por DNA (pill trim draw-on / subrayado /
// bloque que entra con squash / texto gigante) + la marca abajo. La variante la fija dna.ctaKind.
import { drawText, fitFont } from '../../core/text.js'
import { drawShape } from '../../core/shapes.js'
import { rectPath, linePath } from '../../core/path.js'
import { spring, springVel, win, cubicOut, expoOut } from '../../core/motion.js'
import { idle, drawFloaters, drawEyebrow } from '../polish.js'
import { applyCase } from '../fonts.js'
import { rgba, clamp, fontStr, TAU } from '../../core/util.js'

export default {
  id: 'am.scene.ctapill', lib: 'scenes', kind: ['cta'], weight: 1,
  render(ctx, ts, env) {
    const { W, H, dna, ink, acc } = env
    const text = applyCase(env.text, dna.caseMode === 'sentence' ? 'title' : dna.caseMode)
    const cy = H * 0.47
    const maxW = W - env.margin * 2
    const glow = env.dark ? dna.glowK : 0

    // el cierre tambien VIVE: flotantes + eyebrow + pulso continuo del CTA
    drawFloaters(ctx, env, ts, win(ts, 0.5, 1.5), 0)
    drawEyebrow(ctx, env, env.video.brand, cy - W * 0.2, win(ts, 0.1, 0.7), 0)
    const pulse = 1 + 0.014 * Math.sin(ts * TAU * 0.42)
    const idC = idle(ts, 1.9, 2, 6.4)
    ctx.save()
    ctx.translate(idC.dx, idC.dy)
    ctx.translate(W / 2, cy); ctx.scale(pulse, pulse); ctx.translate(-W / 2, -cy)
    if (glow > 0.05) { ctx.shadowColor = acc; ctx.shadowBlur = 18 * glow }

    const kind = dna.ctaKind
    if (kind === 'pill') {
      const size = fitFont(ctx, text, Math.round(W * 0.085), maxW * 0.68, 15, dna.dw, dna.display, dna.trackingBias)
      ctx.font = fontStr(dna.dw, size, dna.display)
      const tw = ctx.measureText(text).width
      const pw = tw + size * 1.5, ph = size * 2.1
      const draw = clamp(win(ts, 0.1, 0.95), 0, 1)
      drawShape(ctx, ts, {
        path: rectPath(W / 2 - pw / 2, cy - ph / 2, pw, ph, ph / 2),
        stroke: { color: acc, width: 3 },
        trim: { start: 0, end: cubicOut(draw), offset: 0.62 },
      })
      const e = spring(win(ts, 0.55, 1.1), dna.z, dna.w)
      drawText(ctx, text, W / 2, cy, { size, weight: dna.dw, family: dna.display, color: ink, alpha: clamp(e * 1.5, 0, 1), tracking: dna.trackingBias })
    } else if (kind === 'underline') {
      const size = fitFont(ctx, text, Math.round(W * 0.115), maxW * 0.85, 18, dna.dw, dna.display, dna.trackingBias)
      const e = spring(win(ts, 0.1, 0.65), dna.z, dna.w)
      drawText(ctx, text, W / 2, cy - 8, { size, weight: dna.dw, family: dna.display, color: ink, alpha: clamp(e * 1.5, 0, 1), tracking: dna.trackingBias })
      ctx.font = fontStr(dna.dw, size, dna.display)
      const uw = Math.min(ctx.measureText(text).width, maxW * 0.85)
      drawShape(ctx, ts, {
        path: linePath(W / 2 - uw / 2, cy + size * 0.62, W / 2 + uw / 2, cy + size * 0.62),
        stroke: { color: acc, width: 5 },
        trim: { start: 0, end: cubicOut(clamp(win(ts, 0.5, 1.1), 0, 1)) },
      })
    } else if (kind === 'block') {
      const size = fitFont(ctx, text, Math.round(W * 0.09), maxW * 0.66, 15, dna.dw, dna.display, dna.trackingBias)
      ctx.font = fontStr(dna.dw, size, dna.display)
      const tw = ctx.measureText(text).width
      const pw = tw + size * 1.3, ph = size * 2
      const tIn = win(ts, 0.1, 0.7)
      const e = spring(tIn, dna.z * 0.85, dna.w)
      const sv = springVel(tIn, dna.z * 0.85, dna.w)
      const stretch = 1 + clamp(Math.abs(sv) * 0.02, 0, 0.2)
      const onAcc = env.sc.polarity === 'accent'
      ctx.save()
      ctx.translate(0, (1 - e) * H * 0.25)
      ctx.translate(W / 2, cy); ctx.scale(1 / stretch, stretch); ctx.translate(-W / 2, -cy)
      drawShape(ctx, ts, { path: rectPath(W / 2 - pw / 2, cy - ph / 2, pw, ph, dna.radius), fill: onAcc ? ink : acc })
      drawText(ctx, text, W / 2, cy, { size, weight: dna.dw, family: dna.display, color: onAcc ? (env.dark ? dna.paperDark : dna.paperLight) : dna.inkOnAccent, tracking: dna.trackingBias })
      ctx.restore()
    } else {
      // giant: el CTA como titular enorme con cascada corta
      const size = fitFont(ctx, text, Math.round(W * 0.15), maxW, 20, dna.dw, dna.display, dna.trackingBias)
      const e = spring(win(ts, 0.1, 0.7), dna.z * 0.8, dna.w * 1.15)
      ctx.save()
      ctx.translate(W / 2, cy); ctx.scale(0.7 + 0.3 * e, 0.7 + 0.3 * e); ctx.translate(-W / 2, -cy)
      drawText(ctx, text, W / 2, cy, { size, weight: dna.dw, family: dna.display, color: acc, alpha: clamp(e * 1.5, 0, 1), tracking: dna.trackingBias })
      ctx.restore()
    }

    ctx.restore()

    // marca (sub) abajo, sobria (fuera del pulso)
    if (env.sub) drawText(ctx, applyCase(env.sub, 'upper'), W / 2, H * 0.47 + W * 0.14, {
      size: 14, weight: dna.sw, family: dna.support, maxW: maxW * 0.7, color: ink,
      alpha: 0.62 * expoOut(clamp(win(ts, 0.85, 1.5), 0, 1)), tracking: 2.5,
    })
  },
}
