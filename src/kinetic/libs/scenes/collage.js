// kin.scene.collage — tecnica 11: 3-4 polaroids del sitio VUELAN con overshoot+rotacion (stagger),
// dispersas alrededor de una frase corta central. Posiciones deterministas del seed de escena.
import { spring, win, stagger, wobble } from '../../core/motion.js'
import { drawText } from '../../core/text.js'
import { range } from '../../core/prng.js'
import { applyCase } from '../fonts.js'

export default {
  id: 'kin.scene.collage', lib: 'scenes', kind: ['photo'], weight: 1, needs: { photos: 3 },
  render(ctx, ts, env) {
    const { W, H, dna, ink } = env
    const r = env.rng('collage')                               // generador FRESCO por llamada (seek-safe)
    const n = Math.min(4, env.images.length)
    // slots dispersos (golden-angle-ish) lejos del centro: el texto vive en el tercio medio
    const slots = []
    for (let i = 0; i < n; i++) {
      const ang = i * 2.399 + range(r, -0.3, 0.3)
      const rad = range(r, 0.30, 0.40)
      let cy = H / 2 + Math.sin(ang) * H * rad * 0.78
      // la franja central es del TEXTO: si la foto cae ahi, se empuja fuera (arriba o abajo)
      if (Math.abs(cy - H / 2) < H * 0.16) cy = H / 2 + Math.sign(cy - H / 2 || 1) * H * 0.16 * range(r, 1.05, 1.35)
      slots.push({
        cx: W / 2 + Math.cos(ang) * W * rad * 1.15,
        cy, side: W * range(r, 0.2, 0.3), rot: range(r, -0.28, 0.28), url: env.images[i],
      })
    }
    const p = win(ts, 0.05, Math.min(env.dur * 0.6, 1.4))
    slots.forEach((s, i) => {
      const lp = stagger(p, i, n, 0.55)
      if (lp <= 0) return
      const e = Math.min(spring(lp, dna.z * 0.85, dna.w) * dna.overshoot, dna.overshoot)
      const img = env.getImg(s.url)
      const pad = dna.photoStyle === 'raw' ? 0 : s.side * 0.06
      ctx.save()
      ctx.translate(s.cx, s.cy)
      ctx.rotate(s.rot + wobble(lp, 2, 5) * 0.1)
      ctx.scale(e, e)
      if (pad > 0) {
        ctx.fillStyle = '#ffffff'
        ctx.shadowColor = 'rgba(0,0,0,0.32)'; ctx.shadowBlur = 9; ctx.shadowOffsetY = 3
        ctx.fillRect(-s.side / 2 - pad, -s.side / 2 - pad, s.side + pad * 2, s.side + pad * 2 + (dna.photoStyle === 'polaroid' ? s.side * 0.2 : 0))
        ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0
      }
      if (img) {
        const iw = img.width, ih = img.height, sc = Math.max(s.side / iw, s.side / ih)
        const sw = s.side / sc, sh = s.side / sc
        ctx.beginPath(); ctx.rect(-s.side / 2, -s.side / 2, s.side, s.side); ctx.clip()
        ctx.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, -s.side / 2, -s.side / 2, s.side, s.side)
      } else {
        ctx.fillStyle = dna.accent
        ctx.fillRect(-s.side / 2, -s.side / 2, s.side, s.side)
      }
      ctx.restore()
    })
    // frase central encima
    if (env.text) drawText(ctx, applyCase(env.text, dna.caseMode), W / 2, H / 2, {
      size: Math.round(W * 0.1), weight: dna.dw, family: dna.display, maxW: W - env.margin * 2,
      color: ink, alpha: Math.min(1, win(ts, 0.35, 0.9) * 1.6), tracking: dna.trackingBias,
      shadow: env.dark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)', shadowBlur: 12,
    })
  },
}
