// am.scene.morphmark — una FORMA del dialecto morfea en loop detras/junto al texto (morphing real con
// correspondencia de puntos). breath = la forma sola, en silencio. El texto entra con slam + squash
// guiado por la derivada del spring.
import { wrapFit } from '../../core/text.js'
import { drawShape } from '../../core/shapes.js'
import { pathMorph } from '../../core/morph.js'
import { circlePath, starPath, polygonPath, rectPath } from '../../core/path.js'
// (circlePath tambien arma el anillo del brand sting)
import { spring, springVel, win, expoOut } from '../../core/motion.js'
import { idle, exitP, applyExit, drawFloaters } from '../polish.js'
import { applyCase, trackPx } from '../fonts.js'
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
  anchor(sc, video) { return { x: video.W / 2, y: sc.text ? video.H * 0.34 : video.H * 0.5, r: 6 } },
  render(ctx, ts, env) {
    const { W, H, dna, ink, acc, outP } = env
    const isBreath = !env.text
    const R = isBreath ? W * 0.16 : W * 0.3
    const cy = isBreath ? H * 0.5 : H * 0.34
    const glow = env.dark ? dna.glowK : 0
    const interp = morphFor(env.sc.seed, dna.shapeDialect, W / 2, cy, R)
    // ping-pong suave del morph a lo largo de la escena
    const mp = 0.5 - 0.5 * Math.cos(clamp(ts / env.dur, 0, 1) * TAU * (isBreath ? 1 : 0.75))
    const enter = spring(win(ts, 0, 0.6), dna.z, dna.w)
    if (!isBreath) drawFloaters(ctx, env, ts, win(ts, 0.5, 1.4), exitP(outP, 2, 3))

    const idS = idle(ts, 0.8, 3, 7)
    const epS = exitP(outP, 1, 3)
    ctx.save()
    ctx.translate(idS.dx, idS.dy)
    ctx.globalAlpha *= (1 - epS * epS)
    if (glow > 0.05) { ctx.shadowColor = acc; ctx.shadowBlur = 26 * glow }
    drawShape(ctx, ts, {
      path: interp(mp),
      fill: isBreath ? acc : rgba(acc, 0.14),
      stroke: isBreath ? null : { color: rgba(acc, 0.85), width: 2.5 },
      at: { scale: 0.2 + 0.8 * enter, ax: W / 2, ay: cy },    // escala ANCLADA al centro de la forma
      alpha: clamp(enter * 1.5, 0, 1),
    })
    ctx.restore()
    if (isBreath) {
      // BRAND STING: el respiro no es una forma vacia — es el momento de marca. La marca aparece
      // con tracking ancho bajo la forma (per-char, sobria) + anillo fino que se dibuja alrededor.
      const brand = String(env.video.brand || '').toUpperCase()
      if (brand) {
        const epB = exitP(outP, 0, 2)
        const eB = expoOut(clamp(win(ts, 0.22, 0.75), 0, 1))   // rapido: el sting dura ~1.3s
        ctx.save()
        ctx.globalAlpha *= clamp(eB * 1.3, 0, 1) * (1 - epB * epB)
        ctx.font = fontStr(dna.sw, 16, dna.support)
        ctx.letterSpacing = '6px'
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillStyle = ink
        ctx.fillText(brand, W / 2, cy + R + 44 + (1 - eB) * 12)
        ctx.restore()
        drawShape(ctx, ts, {
          path: circlePath(W / 2, cy, R * 1.45),
          stroke: { color: rgba(ink, 0.4), width: 1.4 },
          trim: { start: 0, end: expoOut(clamp(win(ts, 0.12, 0.95), 0, 1)) * 0.85, offset: 0.1 + ts * 0.015 },
          alpha: 1 - epS * epS,
        })
      }
      return
    }

    // texto slam con squash (derivada del spring) + idle + salida
    const text = applyCase(env.text, dna.caseMode)
    const maxW = W - env.margin * 2
    const tIn = win(ts, 0.3, 0.85)
    const e = spring(tIn, dna.z * 0.85, dna.w * 1.1)
    const sv = springVel(tIn, dna.z * 0.85, dna.w * 1.1)
    const base = Math.round(W * 0.155)
    const tr = trackPx(dna, base)
    const wr = wrapFit(ctx, text, base, maxW, 18, dna.dw, dna.display, 2, tr)
    const lineH = wr.size * dna.leading
    const yT = H * 0.62
    const stretch = 1 + clamp(Math.abs(sv) * 0.02, 0, 0.2)
    const idT = idle(ts, 2.6, 2.2, 6)
    const epT = exitP(outP, 0, 3)
    ctx.save()
    ctx.translate(idT.dx, idT.dy)
    let aT = 1
    if (epT > 0) aT = applyExit(ctx, epT, W / 2, yT, -1)
    ctx.globalAlpha *= clamp(e * 1.6, 0, 1) * aT
    ctx.translate(W / 2, yT); ctx.scale((0.7 + 0.3 * e) / stretch, (0.7 + 0.3 * e) * stretch); ctx.translate(-W / 2, -yT)
    ctx.font = fontStr(dna.dw, wr.size, dna.display); ctx.letterSpacing = tr + 'px'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    wr.lines.forEach((ln, i) => {
      ctx.fillStyle = wr.lines.length > 1 && i === wr.lines.length - 1 ? acc : ink
      ctx.fillText(ln, W / 2, yT + (i - (wr.lines.length - 1) / 2) * lineH)
    })
    ctx.restore()
  },
}
