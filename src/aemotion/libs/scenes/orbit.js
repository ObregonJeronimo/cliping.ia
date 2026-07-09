// am.scene.orbit — anillos concentricos con GLOW que se dibujan (trim staggered) y rotan lento, con
// satelites vivos y el contenido central respirando. Salida coreografiada. El look orbital premium.
import { wrapFit, drawText } from '../../core/text.js'
import { drawShape } from '../../core/shapes.js'
import { circlePath } from '../../core/path.js'
import { win, stagger, cubicOut, expoOut } from '../../core/motion.js'
import { idle, exitP, applyExit, drawFloaters, glowStroke, glowFill } from '../polish.js'
import { applyCase, trackPx } from '../fonts.js'
import { rgba, clamp, fontStr, TAU } from '../../core/util.js'

export default {
  id: 'am.scene.orbit', lib: 'scenes', kind: ['line', 'stat'], weight: 0.9,
  famBias: { orbita: 1.6, blueprint: 1.35, poster: 0.5 },
  render(ctx, ts, env) {
    const { W, H, dna, ink, acc, outP } = env
    const r = env.rng('orbit')
    const cy = H * 0.48
    const glow = env.dark ? dna.glowK : 0
    const nR = 2 + ((r() * 2) | 0)
    const base = Math.min(W, H) * (0.3 + r() * 0.06)
    const p = clamp(win(ts, 0.05, 1.4), 0, 1)

    drawFloaters(ctx, env, ts, win(ts, 0.3, 1.2), exitP(outP, 2, 3))

    // anillos con glow, rotacion continua y salida (se desdibujan acelerando)
    const epR = exitP(outP, 1, 3)
    ctx.save()
    ctx.globalAlpha *= (1 - epR * epR)
    for (let i = 0; i < nR; i++) {
      const lp = stagger(p, i, nR, 0.55)
      if (lp <= 0) continue
      const R = base + i * (26 + r() * 10)
      const dir = i % 2 ? 1 : -1
      const seg = 0.72 + r() * 0.26
      ctx.save()
      if (glow > 0.05 && i === 0) { ctx.shadowColor = acc; ctx.shadowBlur = 16 * glow }
      drawShape(ctx, ts, {
        path: circlePath(W / 2, cy, R),
        stroke: { color: rgba(acc, 0.62 - i * 0.15), width: 2.4 - i * 0.5 },
        trim: { start: 0, end: expoOut(lp) * seg, offset: dir * ts * 0.022 + r() },
      })
      ctx.restore()
    }
    // dos satelites orbitando a velocidades distintas (vida continua)
    for (let s = 0; s < 2; s++) {
      const aSat = ts * (0.4 + s * 0.28) * (s ? -1 : 1) + r() * TAU
      const Rs = base + (s ? 26 + r() * 10 : 0)
      const a = p * (s ? 0.7 : 1)
      if (a <= 0.02) continue
      ctx.save(); ctx.globalAlpha *= a
      glowFill(ctx, c => { c.beginPath(); c.arc(W / 2 + Math.cos(aSat) * Rs, cy + Math.sin(aSat) * Rs, s ? 2.6 : 4, 0, TAU) }, acc, glow)
      ctx.restore()
    }
    ctx.restore()

    // contenido central con idle + salida propia
    const idC = idle(ts, 1.3, 2.2, 6)
    const epC = exitP(outP, 0, 3)
    ctx.save()
    ctx.translate(idC.dx, idC.dy)
    let aC = 1
    if (epC > 0) aC = applyExit(ctx, epC, W / 2, cy, -1)
    ctx.globalAlpha *= aC
    if (aC > 0.01) {
      if (env.sc.role === 'stat') {
        const val = applyCase(env.text, 'upper')
        const e = expoOut(clamp(win(ts, 0.3, 1.15), 0, 1))
        ctx.save(); ctx.globalAlpha *= clamp(e * 1.3, 0, 1)
        drawText(ctx, val, W / 2, cy - 8, { size: Math.round(W * 0.2), weight: dna.dw, family: dna.display, maxW: base * 1.6, color: ink, tracking: trackPx(dna, Math.round(W * 0.2)) })
        if (env.sub) drawText(ctx, env.sub, W / 2, cy + Math.round(W * 0.2) * 0.6, { size: 14.5, weight: dna.sw, family: dna.support, maxW: base * 1.7, color: ink, alpha: 0.65 })
        ctx.restore()
      } else {
        const text = applyCase(env.text, dna.caseMode)
        const tr = trackPx(dna, Math.round(W * 0.11))
        const wr = wrapFit(ctx, text, Math.round(W * 0.11), base * 1.56, 15, dna.dw, dna.display, 3, tr)
        const lineH = wr.size * Math.max(dna.leading, 1.05)   // texto chico en anillo pide aire
        ctx.font = fontStr(dna.dw, wr.size, dna.display); ctx.letterSpacing = tr + 'px'
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        wr.lines.forEach((ln, i) => {
          const le = expoOut(clamp(win(ts, 0.3 + i * 0.12, 1.1 + i * 0.12), 0, 1))
          ctx.save()
          ctx.globalAlpha *= clamp(le * 1.3, 0, 1)
          ctx.fillStyle = wr.lines.length > 1 && i === wr.lines.length - 1 ? acc : ink
          ctx.fillText(ln, W / 2, cy + (i - (wr.lines.length - 1) / 2) * lineH + (1 - le) * 14)
          ctx.restore()
        })
      }
    }
    ctx.restore()
  },
}
