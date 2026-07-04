// kin.scene.polaroid-inline — tecnica 3 (la joya del reel): una FOTO ADENTRO de la frase, que hace pop
// con wobble y va CICLANDO imagenes del sitio. Layout: [antes] [token] [despues] medidos y centrados como
// UNA linea (fit del conjunto: nunca desborda). Sin imagen decodeada -> swatch del acento (degrade limpio).
import { spring, win, wobble, stagger } from '../../core/motion.js'
import { fontStr, clamp } from '../../core/util.js'
import { applyCase } from '../fonts.js'

function drawToken(ctx, env, x, cy, side, e, ts) {
  const { dna } = env
  const rot = wobble(win(ts, 0.1, 1.4), 2.2, 4) * 0.12 + (dna.photoStyle === 'polaroid' ? -0.06 : 0)
  const idx = Math.floor(ts / 0.7) % Math.max(1, env.images.length)   // cicla al ~beat (determinista)
  const img = env.getImg(env.images[idx]) || env.getImg(env.images[0])
  ctx.save()
  ctx.translate(x + side / 2, cy)
  ctx.rotate(rot)
  ctx.scale(e, e)
  const pad = dna.photoStyle === 'polaroid' ? side * 0.08 : dna.photoStyle === 'card' ? side * 0.04 : 0
  if (pad > 0) {
    ctx.fillStyle = '#ffffff'
    ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3
    ctx.fillRect(-side / 2 - pad, -side / 2 - pad, side + pad * 2, side + pad * 2 + (dna.photoStyle === 'polaroid' ? side * 0.22 : 0))
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0
  }
  if (img) {
    // cover-crop cuadrado
    const iw = img.width, ih = img.height, s = Math.max(side / iw, side / ih)
    const sw = side / s, sh = side / s
    ctx.save()
    ctx.beginPath(); ctx.rect(-side / 2, -side / 2, side, side); ctx.clip()
    ctx.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, -side / 2, -side / 2, side, side)
    ctx.restore()
  } else {
    ctx.fillStyle = env.dna.accent
    ctx.fillRect(-side / 2, -side / 2, side, side)
  }
  ctx.restore()
}

export default {
  id: 'kin.scene.polaroid-inline', lib: 'scenes', kind: ['photo'], weight: 1.2, needs: { photos: 1 },
  render(ctx, ts, env) {
    const { W, H, dna, ink } = env
    const text = applyCase(env.text, dna.caseMode === 'upper' ? 'sentence' : dna.caseMode)
    const words = text.split(' ')
    const cutAt = Math.max(1, Math.ceil(words.length / 2))
    const before = words.slice(0, cutAt).join(' '), after = words.slice(cutAt).join(' ')
    const maxW = W - env.margin * 2
    // fit del CONJUNTO: texto + hueco del token
    let size = Math.round(W * 0.105), side = 0, total = Infinity
    for (; size >= 13; size--) {
      ctx.font = fontStr(dna.dw, size, dna.display)
      side = size * 1.5
      total = ctx.measureText(before).width + side + size * 0.55 + (after ? ctx.measureText(after).width : 0)
      if (total <= maxW) break
    }
    ctx.font = fontStr(dna.dw, size, dna.display)
    const bw = ctx.measureText(before).width
    const gap = size * 0.27
    let x = W / 2 - total / 2
    const cy = H * 0.5
    // reveal por bloques: antes -> token -> despues (stagger)
    const p = win(ts, 0.08, Math.min(env.dur * 0.55, 1.2))
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left'
    const p1 = stagger(p, 0, 3, 0.35), p2 = stagger(p, 1, 3, 0.35), p3 = stagger(p, 2, 3, 0.35)
    ctx.save()
    ctx.fillStyle = ink; ctx.font = fontStr(dna.dw, size, dna.display)
    ctx.globalAlpha = clamp(p1 * 2, 0, 1)
    ctx.fillText(before, x, cy + (1 - spring(p1, dna.z, dna.w)) * 8)
    ctx.restore()
    x += bw + gap
    const e = spring(p2, dna.z * 0.8, dna.w * 1.1) * dna.overshoot
    if (p2 > 0) drawToken(ctx, env, x, cy, side, Math.min(e, dna.overshoot), ts)
    x += side + gap
    if (after) {
      ctx.save()
      ctx.fillStyle = ink; ctx.font = fontStr(dna.dw, size, dna.display)
      ctx.globalAlpha = clamp(p3 * 2, 0, 1)
      ctx.fillText(after, x, cy + (1 - spring(p3, dna.z, dna.w)) * 8)
      ctx.restore()
    }
  },
}
