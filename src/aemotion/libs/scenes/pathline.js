// am.scene.pathline — el texto se subraya con un TRAZO CURVO que se dibuja (trim path sobre bezier)
// mientras un dot con MOTION BLUR real viaja en la punta (follow-path + multi-sample). El gesto
// "dibujado a mano" de los templates AE.
import { wrapFit } from '../../core/text.js'
import { drawShape } from '../../core/shapes.js'
import { parsePath, measure, pointAt } from '../../core/path.js'
import { motionBlur } from '../../core/blur.js'
import { win, cubicInOut } from '../../core/motion.js'
import { applyCase } from '../fonts.js'
import { rgba, clamp, fontStr } from '../../core/util.js'

const _cache = new Map()
function rutaFor(seed, W, H, yBase, rng) {
  const key = seed + '|' + Math.round(yBase)
  let e = _cache.get(key)
  if (!e) {
    const amp = 10 + rng() * 16
    const x0 = W * 0.14, x1 = W * 0.86
    const d = `M ${x0} ${yBase} C ${W * 0.38} ${yBase - amp}, ${W * 0.6} ${yBase + amp}, ${x1} ${yBase - amp * 0.3}`
    const cmds = parsePath(d)
    e = { cmds, m: measure(cmds) }
    if (_cache.size > 64) _cache.clear()
    _cache.set(key, e)
  }
  return e
}

export default {
  id: 'am.scene.pathline', lib: 'scenes', kind: ['line'], weight: 0.9,
  famBias: { editorial: 1.5, blueprint: 1.25, poster: 0.6 },
  render(ctx, ts, env) {
    const { W, H, dna, ink, acc } = env
    const text = applyCase(env.text, dna.caseMode)
    const maxW = W - env.margin * 2
    const wr = wrapFit(ctx, text, Math.round(W * 0.14), maxW, 18, dna.dw, dna.display, 2, dna.trackingBias)
    const lineH = wr.size * 1.14
    const cy = H * 0.46
    const e = clamp(win(ts, 0.05, 0.6), 0, 1)
    ctx.save()
    ctx.globalAlpha *= e
    ctx.font = fontStr(dna.dw, wr.size, dna.display); ctx.letterSpacing = dna.trackingBias + 'px'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = ink
    wr.lines.forEach((ln, i) => ctx.fillText(ln, W / 2, cy + (i - (wr.lines.length - 1) / 2) * lineH - (1 - e) * 14))
    ctx.restore()

    // el trazo que subraya (se dibuja con easing marcado) + dot viajero con blur
    const yBase = cy + (wr.lines.length - 0.5) * lineH + 26
    const ruta = rutaFor(env.sc.seed, W, H, yBase, env.rng('ruta'))
    const p = cubicInOut(clamp(win(ts, 0.45, 1.5), 0, 1))
    if (p <= 0.001) return
    drawShape(ctx, ts, {
      path: ruta.cmds,
      stroke: { color: acc, width: 3.5 },
      trim: { start: 0, end: p },
    })
    if (p < 0.999 && dna.shutterK > 0.1) {
      motionBlur(ctx, ts, { samples: 6, shutter: 240 * dna.shutterK, fps: 30 }, (c, ti) => {
        const pp = cubicInOut(clamp(win(ti, 0.45, 1.5), 0, 1))
        const pt = pointAt(ruta.m, pp * ruta.m.length)
        c.fillStyle = acc
        c.beginPath(); c.arc(pt.x, pt.y, 5, 0, 6.283); c.fill()
      })
    } else if (p < 0.999) {
      const pt = pointAt(ruta.m, p * ruta.m.length)
      ctx.fillStyle = acc
      ctx.beginPath(); ctx.arc(pt.x, pt.y, 5, 0, 6.283); ctx.fill()
    }
  },
}
