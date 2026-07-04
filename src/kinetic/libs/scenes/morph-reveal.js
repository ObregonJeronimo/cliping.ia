// kin.scene.morph-reveal — LA APERTURA DEL REEL (tecnicas 5+6): un blob organico del acento entra desde
// un borde, MORFEA a rombo al centro con la frase encima, y al final EXPANDE a full-bleed (la placa
// "se vuelve" acento). 3 fases continuas por prog; blob/armonicos/borde del seed de escena.
import { polarShapePath, blobHarmonics, morphBlobToDiamond } from '../../core/shapes.js'
import { drawKinetic, wrapFit } from '../../core/text.js'
import { win, cubicInOut, quintOut } from '../../core/motion.js'
import { applyCase } from '../fonts.js'
import { lerp } from '../../core/util.js'

export default {
  id: 'kin.scene.morph-reveal', lib: 'scenes', kind: ['hook', 'line'], weight: 0.9, hookWeight: 1.5,
  render(ctx, ts, env) {
    const { W, H, dna } = env
    const r = env.rng('morph')
    const harm = blobHarmonics(r, 0.10)                        // amplitud baja: la forma siempre cubre el texto
    const fromLeft = r() < 0.5
    const p = env.prog

    // fase A (0..0.32): el blob entra desde el borde y crece · fase B (0.32..0.6): morph a rombo al centro
    // fase C (0.78..1): expande a full-bleed
    const pA = cubicInOut(win(p, 0, 0.32))
    const pB = win(p, 0.32, 0.6)
    const pC = quintOut(win(p, 0.78, 1))
    const k = morphBlobToDiamond(cubicInOut(pB))
    const cx = lerp(fromLeft ? -W * 0.2 : W * 1.2, W / 2, pA)
    const cy = H * 0.5
    const baseR = lerp(W * 0.22, W * 0.42, pA)
    const rad = lerp(baseR, Math.hypot(W, H) * 0.75, pC)      // full-bleed sobrado al final
    ctx.save()
    ctx.fillStyle = dna.accent
    polarShapePath(ctx, cx, cy, rad, k, harm, p * 0.7)
    ctx.fill()
    ctx.restore()

    // la frase aparece SOBRE la forma cuando ya esta asentada al centro (tinta legible sobre acento).
    // ENVUELVE a <=2 lineas DENTRO del rombo (maxW achicado a lo que el rombo banca en +-lineH/2):
    // el texto jamas se sale de la forma acento -> jamas cae inkOnAccent sobre la placa (contraste roto).
    const tp = win(p, 0.42, 0.72)
    if (tp > 0 && env.text) {
      const text = applyCase(env.text, dna.caseMode)
      const wr = wrapFit(ctx, text, Math.round(W * 0.12), W * 0.46, 12, dna.dw, dna.display, 2, dna.trackingBias)
      const lineH = wr.size * 1.12
      wr.lines.forEach((ln, i) => {
        const lp = wr.lines.length === 1 ? tp : win(tp, i / wr.lines.length, (i + 1) / wr.lines.length)
        drawKinetic(ctx, ln, W / 2, cy + (i - (wr.lines.length - 1) / 2) * lineH, lp, {
          size: wr.size, weight: dna.dw, family: dna.display, maxW: W * 0.46, min: 12,
          color: dna.inkOnAccent, mode: 'settle', overlap: dna.staggerOverlap, tracking: dna.trackingBias,
          z: dna.z, w: dna.w,
        })
      })
    }
  },
}
