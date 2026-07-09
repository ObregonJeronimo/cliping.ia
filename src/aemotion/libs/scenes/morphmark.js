// am.scene.morphmark — una FORMA del dialecto morfea en loop detras/junto al texto (morphing real con
// correspondencia de puntos). breath = la forma sola, en silencio. El texto entra con slam + squash
// guiado por la derivada del spring.
import { wrapFit } from '../../core/text.js'
import { drawShape } from '../../core/shapes.js'
import { pathMorph } from '../../core/morph.js'
import { circlePath, starPath, polygonPath, rectPath } from '../../core/path.js'
import { spring, springVel, win } from '../../core/motion.js'
import { applyCase } from '../fonts.js'
import { rgba, clamp, TAU, fontStr } from '../../core/util.js'
import { seedFor } from '../../core/prng.js'

// interpolador memoizado por escena (idempotente: mismo seed -> mismo interp; seek-safe)
const _cache = new Map()
function morphFor(seed, dialect, cx, cy, R) {
  const key = seed + '|' + dialect + '|' + Math.round(R)
  let f = _cache.get(key)
  if (!f) {
    const r = seedFor(seed, 'am.morphmark')
    const builders = dialect === 'anillos' ? [() => circlePath(cx, cy, R), () => polygonPath(cx, cy, R, 6, r() * TAU)]
      : dialect === 'bloques' ? [() => rectPath(cx - R, cy - R * 0.7, R * 2, R * 1.4, R * 0.12), () => polygonPath(cx, cy, R, 4, r() * TAU)]
        : dialect === 'grid' ? [() => polygonPath(cx, cy, R, 3, r() * TAU), () => polygonPath(cx, cy, R, 6, r() * TAU)]
          : [() => starPath(cx, cy, R, R * 0.44, 5, r() * TAU), () => circlePath(cx, cy, R * 0.86)]
    f = pathMorph(builders[0](), builders[1](), { n: 120 })
    if (_cache.size > 64) _cache.clear()
    _cache.set(key, f)
  }
  return f
}

export default {
  id: 'am.scene.morphmark', lib: 'scenes', kind: ['hook', 'line', 'breath'], weight: 1, hookWeight: 0.7,
  famBias: { liquidpop: 1.3, orbita: 1.15 },
  render(ctx, ts, env) {
    const { W, H, dna, ink, acc } = env
    const isBreath = !env.text
    const R = isBreath ? W * 0.16 : W * 0.3
    const cy = isBreath ? H * 0.5 : H * 0.34
    const interp = morphFor(env.sc.seed, dna.shapeDialect, W / 2, cy, R)
    // ping-pong suave del morph a lo largo de la escena
    const mp = 0.5 - 0.5 * Math.cos(clamp(ts / env.dur, 0, 1) * TAU * (isBreath ? 1 : 0.75))
    const enter = spring(win(ts, 0, 0.5), dna.z, dna.w)
    drawShape(ctx, ts, {
      path: interp(mp),
      fill: isBreath ? acc : rgba(acc, 0.14),
      stroke: isBreath ? null : { color: rgba(acc, 0.8), width: 2.5 },
      at: { x: 0, y: 0, scale: 0.2 + 0.8 * enter },
      alpha: clamp(enter * 1.5, 0, 1),
    })
    if (isBreath) return

    // texto slam con squash (derivada del spring)
    const text = applyCase(env.text, dna.caseMode)
    const maxW = W - env.margin * 2
    const tIn = win(ts, 0.28, 0.75)
    const e = spring(tIn, dna.z * 0.85, dna.w * 1.1)
    const sv = springVel(tIn, dna.z * 0.85, dna.w * 1.1)
    const wr = wrapFit(ctx, text, Math.round(W * 0.14), maxW, 18, dna.dw, dna.display, 2, dna.trackingBias)
    const lineH = wr.size * 1.12
    const yT = H * 0.62
    const stretch = 1 + clamp(Math.abs(sv) * 0.02, 0, 0.2)
    ctx.save()
    ctx.globalAlpha *= clamp(e * 1.6, 0, 1)
    ctx.translate(W / 2, yT); ctx.scale((0.7 + 0.3 * e) / stretch, (0.7 + 0.3 * e) * stretch); ctx.translate(-W / 2, -yT)
    ctx.font = fontStr(dna.dw, wr.size, dna.display); ctx.letterSpacing = dna.trackingBias + 'px'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = ink
    wr.lines.forEach((ln, i) => ctx.fillText(ln, W / 2, yT + (i - (wr.lines.length - 1) / 2) * lineH))
    ctx.restore()
  },
}
