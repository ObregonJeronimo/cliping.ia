// am.scene.cascade — la escena insignia, ahora con PUESTA EN ESCENA completa:
//   eyebrow (kicker) -> titular GIGANTE en cascada per-char con contraste por linea (ultima linea en
//   acento con glow) -> garnish del dialecto -> flotantes en profundidad. NADA queda quieto (idle
//   universal) y todo SE DESPIDE antes del corte seco (stagger inverso, ease-in). Timing pro:
//   entrada ~1s solapada (eyebrow 0.05s -> titulo 0.2s -> resto), overshoot sutil.
import { wrapFit } from '../../core/text.js'
import { drawAnimatedText } from '../../core/textfx.js'
import { drawShape } from '../../core/shapes.js'
import { circlePath, linePath, rectPath } from '../../core/path.js'
import { metaballPath } from '../../core/liquid.js'
import { win, cubicOut, expoOut } from '../../core/motion.js'
import { idle, exitP, applyExit, drawEyebrow, drawFloaters, glowText, glowStroke, glowFill } from '../polish.js'
import { applyCase, trackPx } from '../fonts.js'
import { rgba, clamp, fontStr } from '../../core/util.js'

export default {
  id: 'am.scene.cascade', lib: 'scenes', kind: ['hook', 'line'], weight: 1.2,
  famBias: { orbita: 1.3, editorial: 1.2, blueprint: 1.1 },
  anchor(sc, video) { return { x: video.W / 2, y: video.H * 0.62, r: 5 } },
  render(ctx, ts, env) {
    const { W, H, dna, ink, acc, outP } = env
    const text = applyCase(env.text, dna.caseMode)
    const maxW = W - env.margin * 2
    // tipografia PROTAGONISTA: grande, tracking en EM y leading del DNA (micro-craft del research)
    const base = Math.round(W * 0.19)
    const tr = trackPx(dna, base)
    const wr = wrapFit(ctx, text, base, maxW, 20, dna.dw, dna.display, 2, tr)
    const lineH = wr.size * dna.leading
    const y0 = H * 0.485 - ((wr.lines.length - 1) / 2) * lineH
    const glow = env.dark ? dna.glowK : 0

    // flotantes en profundidad (siempre vivos, entran solapados)
    drawFloaters(ctx, env, ts, win(ts, 0.15, 1), exitP(outP, 2, 3))

    // eyebrow: entra PRIMERO (0.05s), sale primero
    drawEyebrow(ctx, env, (env.idx + 1 < 10 ? '0' : '') + (env.idx + 1) + ' · ' + (env.video.brand || ''), y0 - lineH * 0.95, win(ts, 0.05, 0.6), exitP(outP, 0, 3))

    // titular en cascada, con idle de bloque (deriva sutil continua) y salida coreografiada
    const id8 = idle(ts, env.idx * 1.7, 2.4, 6.5)
    ctx.save()
    ctx.translate(id8.dx, id8.dy)
    const epT = exitP(outP, 1, 3)
    let aT = 1
    if (epT > 0) aT = applyExit(ctx, epT, W / 2, y0 + lineH * 0.5, -1)
    ctx.globalAlpha *= aT
    if (aT > 0.01) wr.lines.forEach((ln, i) => {
      const isAccLine = wr.lines.length > 1 && i === wr.lines.length - 1
      const off = -0.6 + win(ts, 0.2 + i * 0.24, 1.35 + i * 0.24) * 1.75
      drawAnimatedText(ctx, ts, {
        text: ln, x: W / 2, y: y0 + i * lineH + wr.size * 0.35, size: wr.size, weight: dna.dw, family: dna.display,
        fill: isAccLine ? acc : ink, tracking: tr,
        glow: isAccLine && glow > 0.05 ? { color: acc, blur: 22 * glow } : null,   // glow POR char revelado
        animators: [{ sel: { start: 0, end: 0.42, offset: off, shape: 'rampUp' }, props: { y: wr.size * 0.42, alpha: 0, rot: 0.08, scale: 0.88 } }],
      })
    })
    ctx.restore()

    // garnish del dialecto (entra ultimo, vive con idle, sale despues del titulo)
    const g = clamp(win(ts, 0.85, 1.7), 0, 1)
    if (g <= 0) return
    const epG = exitP(outP, 2, 3)
    const idG = idle(ts, 3.1, 3, 5.2)
    const yG = y0 + (wr.lines.length - 0.5) * lineH + 30
    ctx.save()
    ctx.translate(idG.dx, idG.dy)
    ctx.globalAlpha *= (1 - epG * epG)
    if (dna.shapeDialect === 'anillos') {
      drawShape(ctx, ts, {
        path: circlePath(W * 0.5, H * 0.485, Math.min(W, H) * 0.46),
        stroke: { color: rgba(acc, 0.5), width: 1.6 },
        trim: { start: 0, end: expoOut(g), offset: 0.12 + ts * 0.008 },
      })
    } else if (dna.shapeDialect === 'subrayados') {
      const uw = Math.min(maxW * 0.5, 170)
      drawShape(ctx, ts, {
        path: linePath(W / 2 - uw / 2, yG, W / 2 + uw / 2, yG),
        stroke: { color: acc, width: 4 },
        trim: { start: 0, end: expoOut(g) },
      })
    } else if (dna.shapeDialect === 'gotas') {
      const e = cubicOut(g)
      const x1 = W / 2 - 15, x2 = W / 2 - 15 + 30 * e, yD = yG + 4
      const r1 = 8, r2 = 5.5
      const paint = c => {
        drawShape(c, ts, { path: circlePath(x1, yD, r1), fill: acc })
        drawShape(c, ts, { path: circlePath(x2, yD, r2), fill: acc })
        const mem = metaballPath(x1, yD, r1, x2, yD, r2, { v: 0.5 })
        if (mem) drawShape(c, ts, { path: mem, fill: acc })
      }
      if (glow > 0.05) { ctx.save(); ctx.shadowColor = acc; ctx.shadowBlur = 20 * glow; paint(ctx); ctx.restore() }
      else paint(ctx)
    } else if (dna.shapeDialect === 'grid') {
      const n = 5
      for (let i = 0; i < n; i++) {
        const p = clamp(g * n - i, 0, 1)
        if (p <= 0) continue
        const x = W / 2 + (i - (n - 1) / 2) * 17
        glowStroke(ctx, c => { c.beginPath(); c.moveTo(x, yG - 5 * p); c.lineTo(x, yG + 5 * p) }, rgba(acc, 0.85), 2, glow * 0.6)
      }
    } else {
      const bw = Math.min(maxW * 0.36, 130) * cubicOut(g)
      drawShape(ctx, ts, { path: rectPath(W / 2 - bw / 2, yG - 4, bw, 8, dna.radius ? 4 : 0), fill: acc })
    }
    ctx.restore()
  },
}
