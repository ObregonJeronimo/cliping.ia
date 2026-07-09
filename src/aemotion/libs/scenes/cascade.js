// am.scene.cascade — la firma del motor: el texto entra en CASCADA per-caracter (text animator con
// range selector que barre) + garnish del dialecto de la familia (anillo trim / subrayado / gotas /
// ticks de grid / bloque). La misma escena se ve distinta en cada familia.
import { wrapFit } from '../../core/text.js'
import { drawAnimatedText } from '../../core/textfx.js'
import { drawShape } from '../../core/shapes.js'
import { circlePath, linePath, rectPath } from '../../core/path.js'
import { metaballPath } from '../../core/liquid.js'
import { win, cubicOut } from '../../core/motion.js'
import { applyCase } from '../fonts.js'
import { rgba, clamp } from '../../core/util.js'

export default {
  id: 'am.scene.cascade', lib: 'scenes', kind: ['hook', 'line'], weight: 1.2,
  famBias: { orbita: 1.3, editorial: 1.2, blueprint: 1.1 },
  render(ctx, ts, env) {
    const { W, H, dna, ink, acc } = env
    const text = applyCase(env.text, dna.caseMode)
    const maxW = W - env.margin * 2
    const wr = wrapFit(ctx, text, Math.round(W * 0.155), maxW, 18, dna.dw, dna.display, 2, dna.trackingBias)
    const lineH = wr.size * 1.14
    const y0 = H * 0.5 - ((wr.lines.length - 1) / 2) * lineH

    // cascada: la ventana del selector barre cada linea (staggered por linea)
    wr.lines.forEach((ln, i) => {
      const off = -0.6 + win(ts, 0.08 + i * 0.22, 1.15 + i * 0.22) * 1.75
      drawAnimatedText(ctx, ts, {
        text: ln, x: W / 2, y: y0 + i * lineH, size: wr.size, weight: dna.dw, family: dna.display,
        fill: ink, tracking: dna.trackingBias,
        animators: [{ sel: { start: 0, end: 0.42, offset: off, shape: 'rampUp' }, props: { y: wr.size * 0.5, alpha: 0, rot: 0.1, scale: 0.86 } }],
      })
    })

    // garnish por dialecto (aparece despues del texto, tenue)
    const g = clamp(win(ts, 0.7, 1.5), 0, 1)
    if (g <= 0) return
    const yG = y0 + (wr.lines.length - 0.5) * lineH + 22
    if (dna.shapeDialect === 'anillos') {
      drawShape(ctx, ts, {
        path: circlePath(W * 0.5, H * 0.5, Math.min(W, H) * 0.42),
        stroke: { color: rgba(acc, 0.55), width: 2 },
        trim: { start: 0, end: g, offset: 0.12 },
      })
    } else if (dna.shapeDialect === 'subrayados') {
      const uw = Math.min(maxW * 0.6, 180)
      drawShape(ctx, ts, {
        path: linePath(W / 2 - uw / 2, yG, W / 2 + uw / 2, yG),
        stroke: { color: acc, width: 4 },
        trim: { start: 0, end: g },
      })
    } else if (dna.shapeDialect === 'gotas') {
      const e = cubicOut(g)
      const x1 = W * 0.18, x2 = x1 + 26 * e, yD = yG + 6
      drawShape(ctx, ts, { path: circlePath(x1, yD, 9), fill: rgba(acc, 0.9) })
      drawShape(ctx, ts, { path: circlePath(x2, yD, 6), fill: rgba(acc, 0.9) })
      const mem = metaballPath(x1, yD, 9, x2, yD, 6, { v: 0.5 })
      if (mem) drawShape(ctx, ts, { path: mem, fill: rgba(acc, 0.9) })
    } else if (dna.shapeDialect === 'grid') {
      const n = 5
      for (let i = 0; i < n; i++) {
        const p = clamp(g * n - i, 0, 1)
        if (p <= 0) continue
        const x = W / 2 + (i - (n - 1) / 2) * 16
        drawShape(ctx, ts, { path: linePath(x, yG - 4 * p, x, yG + 4 * p), stroke: { color: rgba(acc, 0.8), width: 2 } })
      }
    } else {
      // bloques: barra de acento que crece bajo el texto
      const bw = Math.min(maxW * 0.4, 140) * cubicOut(g)
      drawShape(ctx, ts, { path: rectPath(W / 2 - bw / 2, yG - 5, bw, 10, dna.radius ? 5 : 0), fill: acc })
    }
  },
}
