// kin.scene.badge — tecnica 13 del reel ("It's clarity."): una pildora que SE AUTO-DIBUJA (contorno
// dash-on) y la frase corta adentro con typewriter. Solo para lineas cortas (needs.maxChars).
import { fitFont, drawKinetic } from '../../core/text.js'
import { spring, win } from '../../core/motion.js'
import { fontStr } from '../../core/util.js'
import { applyCase } from '../fonts.js'

export default {
  id: 'kin.scene.badge', lib: 'scenes', kind: ['line'], weight: 0.8, needs: { maxChars: 18 },
  render(ctx, ts, env) {
    const { W, H, dna, ink } = env
    const text = applyCase(env.text, 'sentence')
    const size = fitFont(ctx, text, Math.round(W * 0.075), W * 0.6, 13, dna.sw >= 600 ? dna.sw : 700, dna.support, 0.4)
    ctx.font = fontStr(dna.sw >= 600 ? dna.sw : 700, size, dna.support)
    const tw = ctx.measureText(text).width
    const padX = size * 0.95, padY = size * 0.72
    const bw = tw + padX * 2, bh = size + padY * 2
    const cy = H * 0.5
    // contorno que se traza (dashOffset por progreso, con settle)
    const drawP = spring(win(ts, 0.08, 0.75), 0.82, 9)
    ctx.save()
    ctx.strokeStyle = ink; ctx.lineWidth = 1.7
    const per = 2 * (bw + bh)
    ctx.setLineDash([per * drawP, per])
    ctx.beginPath(); ctx.roundRect(W / 2 - bw / 2, cy - bh / 2, bw, bh, bh / 2); ctx.stroke()
    ctx.setLineDash([])
    ctx.restore()
    // texto typewriter adentro
    drawKinetic(ctx, text, W / 2, cy + 1, win(ts, 0.3, 1.0), {
      size, weight: dna.sw >= 600 ? dna.sw : 700, family: dna.support, maxW: bw - padX,
      color: ink, mode: 'type', overlap: 0.3, z: dna.z, w: dna.w,
    })
    // puntito de acento que orbita la pildora (vida continua)
    const a = ts * 1.4
    ctx.save()
    ctx.globalAlpha *= 0.85 * win(ts, 0.6, 1.1)
    ctx.fillStyle = dna.accent
    ctx.beginPath()
    ctx.arc(W / 2 + Math.cos(a) * (bw / 2 + 14), cy + Math.sin(a) * (bh / 2 + 14), 3.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  },
}
