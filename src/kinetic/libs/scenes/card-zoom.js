// kin.scene.card-zoom — tecnica 9 del reel: la compo "se aleja" y queda como una CARD con borde flotando
// sobre la placa de polaridad opuesta. Adentro: la frase + una barrita de acento. Zoom-out con settle.
import { drawText, wrapFit } from '../../core/text.js'
import { spring, win } from '../../core/motion.js'
import { fontStr } from '../../core/util.js'
import { applyCase } from '../fonts.js'

export default {
  id: 'kin.scene.card-zoom', lib: 'scenes', kind: ['line'], weight: 0.9,
  render(ctx, ts, env) {
    const { W, H, dna, ink } = env
    // card de polaridad INVERSA a la placa (contraste garantizado por el DNA)
    const cardBg = env.dark ? dna.paperLight : dna.paperDark
    const cardInk = env.dark ? dna.inkLight : dna.inkDark
    const e = spring(win(ts, 0.06, 0.7), dna.z * 0.9, dna.w * 0.85)
    const sc = 1.18 - 0.36 * e                                 // 1.18 -> 0.82: zoom-OUT con settle
    const cw = W * 0.78, chh = H * 0.44
    ctx.save()
    const a0 = ctx.globalAlpha                                 // alpha ambiente (whip/velo): componer, no pisar
    ctx.translate(W / 2, H / 2)
    ctx.scale(sc, sc)
    ctx.globalAlpha = a0 * Math.min(1, e * 2.5)
    // sombra + card + borde fino
    ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6
    ctx.fillStyle = cardBg
    ctx.beginPath(); ctx.roundRect(-cw / 2, -chh / 2, cw, chh, dna.radius + 4); ctx.fill()
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0
    ctx.strokeStyle = ink; ctx.lineWidth = 1.4; ctx.globalAlpha *= 0.9
    ctx.beginPath(); ctx.roundRect(-cw / 2 - 7, -chh / 2 - 7, cw + 14, chh + 14, dna.radius + 8); ctx.stroke()
    // contenido: barrita de acento + frase envuelta
    const barP = win(ts, 0.35, 0.8)
    ctx.globalAlpha = a0 * Math.min(1, e * 2.5)
    ctx.fillStyle = dna.accent
    ctx.fillRect(-cw / 2 + 22, -chh / 2 + 26, (cw * 0.22) * spring(barP, 0.8, 9), 5)
    const text = applyCase(env.text, dna.caseMode)
    ctx.font = fontStr(dna.dw, Math.round(W * 0.1), dna.display)
    const wr = wrapFit(ctx, text, Math.round(W * 0.1), cw - 44, 16, dna.dw, dna.display, 2, dna.trackingBias)
    const lineH = wr.size * 1.14
    ctx.font = fontStr(dna.dw, wr.size, dna.display); ctx.letterSpacing = dna.trackingBias + 'px'
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = cardInk
    ctx.globalAlpha *= Math.min(1, win(ts, 0.28, 0.75) * 1.8)
    wr.lines.forEach((ln, i) => ctx.fillText(ln, -cw / 2 + 22, 6 + (i - (wr.lines.length - 1) / 2) * lineH))
    ctx.restore()
    // kicker de marca chiquito abajo de la card (en la placa)
    if (env.video.brand) drawText(ctx, applyCase(env.video.brand, 'upper'), W / 2, H / 2 + chh * 0.62 + 16, {
      size: 11, weight: dna.sw, family: dna.support, maxW: W * 0.7, color: ink, alpha: 0.5 * win(ts, 0.55, 1), tracking: 2.2,
    })
  },
}
