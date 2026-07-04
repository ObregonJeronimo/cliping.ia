// kin.scene.cta — cierre: CTA en la VARIANTE del DNA (pildora auto-dibujada / subrayado kinetico /
// palabra gigante / boton) + marca + logo. Nada fijo entre videos (anti-fingerprint).
import { fitFont, drawText } from '../../core/text.js'
import { spring, win } from '../../core/motion.js'
import { fontStr } from '../../core/util.js'
import { applyCase } from '../fonts.js'

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
}

export default {
  id: 'kin.scene.cta', lib: 'scenes', kind: ['cta'], weight: 1,
  render(ctx, ts, env) {
    const { W, H, dna, ink } = env
    const cta = applyCase(env.text, dna.caseMode === 'upper' ? 'upper' : 'sentence')
    const brand = env.sub || env.video.brand
    const maxW = W - env.margin * 2
    const e = spring(win(ts, 0.12, 0.6), dna.z, dna.w)
    const onAccentPlate = env.sc.polarity === 'accent'
    const cy = H * 0.5

    if (dna.ctaVariant === 'giant') {
      const size = fitFont(ctx, cta, Math.round(W * 0.19), maxW / dna.overshoot, 20, dna.dw, dna.display, dna.trackingBias)
      ctx.save()
      ctx.translate(W / 2, cy); ctx.scale(Math.min(0.6 + 0.4 * e * dna.overshoot, dna.overshoot), Math.min(0.6 + 0.4 * e * dna.overshoot, dna.overshoot))
      ctx.font = fontStr(dna.dw, size, dna.display); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillStyle = onAccentPlate ? dna.inkOnAccent : dna.accent
      ctx.globalAlpha = Math.min(1, e * 2)
      ctx.fillText(cta, 0, 0)
      ctx.restore()
    } else {
      // pill / button / underline comparten la base texto-mediano
      const size = fitFont(ctx, cta, Math.round(W * 0.085), maxW * 0.72, 14, dna.sw >= 600 ? dna.sw : 700, dna.support, 0.5)
      ctx.font = fontStr(dna.sw >= 600 ? dna.sw : 700, size, dna.support)
      const tw = ctx.measureText(cta).width
      const padX = size * 0.85, padY = size * 0.62
      const bw = tw + padX * 2, bh = size + padY * 2
      const x = W / 2 - bw / 2, y = cy - bh / 2
      const drawP = spring(win(ts, 0.1, 0.75), 0.8, 9)         // el contorno/relleno se auto-dibuja
      ctx.save()
      if (dna.ctaVariant === 'pill') {
        ctx.strokeStyle = onAccentPlate ? dna.inkOnAccent : ink; ctx.lineWidth = 1.8
        const per = 2 * (bw + bh)
        ctx.setLineDash([per * drawP, per])
        roundRect(ctx, x, y, bw, bh, bh / 2); ctx.stroke()
        ctx.setLineDash([])
      } else if (dna.ctaVariant === 'button') {
        ctx.globalAlpha = Math.min(1, drawP * 1.6)
        ctx.fillStyle = onAccentPlate ? dna.inkOnAccent : dna.accent
        roundRect(ctx, x, y, bw, bh, dna.radius || bh / 2); ctx.fill()
      }
      ctx.globalAlpha = Math.min(1, win(ts, 0.3, 0.7) * 1.8)
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillStyle = dna.ctaVariant === 'button' ? (onAccentPlate ? dna.accent : dna.inkOnAccent) : (onAccentPlate ? dna.inkOnAccent : ink)
      ctx.fillText(cta, W / 2, cy + 1)
      if (dna.ctaVariant === 'underline') {
        ctx.strokeStyle = dna.accent; ctx.lineWidth = 2.4
        ctx.beginPath(); ctx.moveTo(W / 2 - tw / 2, cy + size * 0.75); ctx.lineTo(W / 2 - tw / 2 + tw * drawP, cy + size * 0.75); ctx.stroke()
      }
      ctx.restore()
    }

    // marca + logo abajo (fade tardio)
    const bp = win(ts, 0.55, 1.0)
    if (brand) drawText(ctx, applyCase(brand, 'upper'), W / 2, H * 0.5 + H * 0.16, {
      size: 13, weight: dna.sw, family: dna.support, maxW: maxW * 0.8,
      color: onAccentPlate ? dna.inkOnAccent : ink, alpha: 0.62 * bp, tracking: 2.4,
    })
    const logo = env.video.logo ? env.getImg(env.video.logo) : null
    if (logo) {
      const lw = 30, lh = lw * (logo.height / Math.max(1, logo.width))
      ctx.save(); ctx.globalAlpha = 0.9 * bp
      ctx.drawImage(logo, W / 2 - lw / 2, H * 0.5 + H * 0.205, lw, Math.min(lh, 30))
      ctx.restore()
    }
  },
}
