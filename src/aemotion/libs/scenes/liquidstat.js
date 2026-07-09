// am.scene.liquidstat — el stat como LIQUIDO + CONTADOR: el numero CUENTA hasta su valor (gesto
// premium clasico) mientras gotas con glow se funden por membrana metaball y quedan respirando.
import { drawText } from '../../core/text.js'
import { drawShape } from '../../core/shapes.js'
import { circlePath } from '../../core/path.js'
import { metaballPath } from '../../core/liquid.js'
import { spring, win, cubicOut, expoOut } from '../../core/motion.js'
import { idle, exitP, applyExit, drawFloaters, drawEyebrow } from '../polish.js'
import { rgba, clamp, TAU } from '../../core/util.js'
import { trackPx } from '../fonts.js'
import { seedFor } from '../../core/prng.js'

// contador determinista: "98%" -> "0%".."98%" · "+400" -> "+0".."+400" (la parte numerica cuenta)
function countUp(text, p) {
  const m = String(text).match(/^(\D*)(\d+(?:[.,]\d+)?)(.*)$/)
  if (!m) return text
  const num = parseFloat(m[2].replace(',', '.'))
  if (!Number.isFinite(num)) return text
  const dec = (m[2].split(/[.,]/)[1] || '').length
  const v = (num * clamp(p, 0, 1)).toFixed(dec)
  return m[1] + (m[2].includes(',') ? v.replace('.', ',') : v) + m[3]
}

export default {
  id: 'am.scene.liquidstat', lib: 'scenes', kind: ['stat'], weight: 1.1,
  famBias: { liquidpop: 1.6, orbita: 1.1, editorial: 0.7 },
  render(ctx, ts, env) {
    const { W, H, dna, ink, acc, outP } = env
    const r = env.rng('liquid')
    const cy = H * 0.55
    const glow = env.dark ? dna.glowK : 0

    drawFloaters(ctx, env, ts, win(ts, 0.4, 1.3), exitP(outP, 2, 3))
    drawEyebrow(ctx, env, env.video.brand, cy - W * 0.22, win(ts, 0.08, 0.65), exitP(outP, 0, 3))

    // gotas con glow: la principal late; dos satelites llegan y se funden
    const yD = H * 0.29
    const xM = W * (0.42 + r() * 0.16)
    const rM = 25 + r() * 8 + 1.8 * Math.sin(ts * TAU * 0.2)
    const epD = exitP(outP, 2, 3)
    ctx.save()
    ctx.globalAlpha *= (1 - epD * epD)
    if (glow > 0.05) { ctx.shadowColor = acc; ctx.shadowBlur = 24 * glow }
    const sats = []
    for (let i = 0; i < 2; i++) {
      const from = xM + (i ? 1 : -1) * (W * (0.3 + r() * 0.1))
      const e = spring(win(ts, 0.3 + i * 0.5, 1.25 + i * 0.5), dna.z, dna.w * 0.85)
      const x = from + (xM + (i ? 1 : -1) * rM * 0.9 - from) * e
      sats.push({ x, y: yD + (i ? -1 : 1) * 7 * (1 - e), r: (10 + r() * 5) * clamp(0.3 + e, 0, 1) })
    }
    drawShape(ctx, ts, { path: circlePath(xM, yD, rM), fill: acc })
    for (const s of sats) {
      if (s.r < 1) continue
      drawShape(ctx, ts, { path: circlePath(s.x, s.y, s.r), fill: acc })
      const mem = metaballPath(xM, yD, rM, s.x, s.y, s.r, { v: 0.55 })
      if (mem) drawShape(ctx, ts, { path: mem, fill: acc })
    }
    ctx.restore()

    // el numero: CUENTA hasta el valor con expo (rapido al principio, clava al final) + idle + salida
    const cp = expoOut(clamp(win(ts, 0.35, 1.7), 0, 1))
    const idN = idle(ts, 2.2, 2.2, 6.5)
    const epN = exitP(outP, 1, 3)
    ctx.save()
    ctx.translate(idN.dx, idN.dy)
    let aN = 1
    if (epN > 0) aN = applyExit(ctx, epN, W / 2, cy, -1)
    ctx.globalAlpha *= aN
    if (aN > 0.01) {
      const e = expoOut(clamp(win(ts, 0.2, 0.9), 0, 1))
      ctx.save()
      ctx.globalAlpha *= clamp(e * 1.4, 0, 1)
      ctx.translate(W / 2, cy); ctx.scale(0.82 + 0.18 * e, 0.82 + 0.18 * e); ctx.translate(-W / 2, -cy)
      drawText(ctx, countUp(env.text, cp), W / 2, cy, { size: Math.round(W * 0.31), weight: dna.dw, family: dna.display, maxW: W - env.margin * 2, color: ink, tracking: trackPx(dna, Math.round(W * 0.31)) })
      ctx.restore()
      if (env.sub) drawText(ctx, env.sub, W / 2, cy + W * 0.19, {
        size: 15.5, weight: dna.sw, family: dna.support, maxW: W - env.margin * 2.5, color: ink,
        alpha: 0.68 * cubicOut(clamp(win(ts, 0.7, 1.3), 0, 1)),
      })
    }
    ctx.restore()
  },
}
