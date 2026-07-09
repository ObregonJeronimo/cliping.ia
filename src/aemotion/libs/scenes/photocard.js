// am.scene.photocard — la FOTO real del sitio como hero: card con cover-fit que entra con spring +
// squash, sombra en capas (claro) o borde con glow (oscuro), caption con eyebrow, marco del dialecto.
// Sin imagen cargada (Node pelado / URL caida) degrada a titular tipografico — nunca un hueco.
import { wrapFit } from '../../core/text.js'
import { drawShape } from '../../core/shapes.js'
import { rectPath, circlePath } from '../../core/path.js'
import { spring, springVel, win, expoOut } from '../../core/motion.js'
import { idle, exitP, applyExit, drawFloaters, drawEyebrow, drawSupport } from '../polish.js'
import { applyCase, trackPx } from '../fonts.js'
import { rgba, clamp, fontStr } from '../../core/util.js'

// cover-fit: recorta la imagen para llenar el rect destino sin deformar
function coverDraw(ctx, img, x, y, w, h) {
  const iw = img.width || 1, ih = img.height || 1
  const s = Math.max(w / iw, h / ih)
  const sw = w / s, sh = h / s
  ctx.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, x, y, w, h)
}

export default {
  id: 'am.scene.photocard', lib: 'scenes', kind: ['photo'], weight: 1,
  anchor(sc, video) { return { x: video.W / 2, y: video.H * 0.42, r: 5 } },
  render(ctx, ts, env) {
    const { W, H, dna, ink, acc, outP } = env
    const r = env.rng('photo')
    const url = env.images[(r() * env.images.length) | 0]
    const img = url ? env.getImg(url) : null

    drawFloaters(ctx, env, ts, win(ts, 0.4, 1.3), exitP(outP, 2, 3))
    drawEyebrow(ctx, env, env.video.brand, H * 0.42 - H * 0.24 - 26, win(ts, 0.05, 0.6), exitP(outP, 0, 3))

    if (!img) {
      // degradacion honesta: hero tipografico con el texto del beat
      const text = applyCase(env.text || env.video.brand, dna.caseMode)
      const base = Math.round(W * 0.17)
      const tr = trackPx(dna, base)
      const wr = wrapFit(ctx, text, base, W - env.margin * 2, 18, dna.dw, dna.display, 2, tr)
      const lineH = wr.size * dna.leading
      const e = spring(win(ts, 0.15, 0.7), dna.z, dna.w)
      const epT = exitP(outP, 1, 3)
      ctx.save()
      let aT = 1
      if (epT > 0) aT = applyExit(ctx, epT, W / 2, H * 0.47, -1)
      ctx.globalAlpha *= clamp(e * 1.5, 0, 1) * aT
      ctx.font = fontStr(dna.dw, wr.size, dna.display); ctx.letterSpacing = tr + 'px'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = ink
      wr.lines.forEach((ln, i) => ctx.fillText(ln, W / 2, H * 0.47 + (i - (wr.lines.length - 1) / 2) * lineH))
      ctx.restore()
      return
    }

    // card: 4:5 centrada, entra desde abajo con spring + squash por velocidad, rota apenas (polaroid)
    const cw = W * (0.62 + r() * 0.08), chh = cw * 1.25
    const cx = W / 2, cy = H * 0.42
    const rot = (r() - 0.5) * 0.06
    const tIn = win(ts, 0.12, 0.85)
    const e = spring(tIn, dna.z * 0.9, dna.w)
    const sv = springVel(tIn, dna.z * 0.9, dna.w)
    const stretch = 1 + clamp(Math.abs(sv) * 0.018, 0, 0.16)
    const idC = idle(ts, 1.4, 2.6, 6.8)
    const epC = exitP(outP, 1, 3)
    ctx.save()
    ctx.translate(idC.dx, idC.dy + (1 - e) * H * 0.3)
    let aC = 1
    if (epC > 0) aC = applyExit(ctx, epC, cx, cy, 1)
    ctx.globalAlpha *= clamp(e * 1.4, 0, 1) * aC
    ctx.translate(cx, cy)
    ctx.rotate(rot * (1 - e * 0.4))
    ctx.scale(1 / stretch, stretch)
    ctx.translate(-cx, -cy)
    // sombra (claro) / glow del acento (oscuro) bajo la card
    if (env.dark && dna.glowK > 0.05) { ctx.shadowColor = acc; ctx.shadowBlur = 26 * dna.glowK }
    else { ctx.shadowColor = 'rgba(10,14,12,0.35)'; ctx.shadowBlur = 26; ctx.shadowOffsetY = 12 }
    const rad = Math.max(6, dna.radius)
    drawShape(ctx, ts, { path: rectPath(cx - cw / 2, cy - chh / 2, cw, chh, rad), fill: env.dark ? '#0a0d12' : '#ffffff' })
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0
    // la foto (clip redondeado, inset finito tipo marco)
    const inset = 5
    ctx.save()
    drawShape(ctx, ts, { path: rectPath(cx - cw / 2 + inset, cy - chh / 2 + inset, cw - inset * 2, chh - inset * 2, Math.max(2, rad - 3)) })
    // drawShape sin fill/stroke no pinta: trazamos el clip a mano
    ctx.beginPath()
    const p = rectPath(cx - cw / 2 + inset, cy - chh / 2 + inset, cw - inset * 2, chh - inset * 2, Math.max(2, rad - 3))
    for (const s of p) {
      if (s.c === 'M') ctx.moveTo(s.x, s.y)
      else if (s.c === 'L') ctx.lineTo(s.x, s.y)
      else if (s.c === 'C') ctx.bezierCurveTo(s.x1, s.y1, s.x2, s.y2, s.x, s.y)
      else if (s.c === 'Z') ctx.closePath()
    }
    ctx.clip()
    coverDraw(ctx, img, cx - cw / 2 + inset, cy - chh / 2 + inset, cw - inset * 2, chh - inset * 2)
    // velo del acento muy tenue (integra la foto a la paleta)
    ctx.globalAlpha *= 0.08
    ctx.fillStyle = acc
    ctx.fillRect(cx - cw / 2, cy - chh / 2, cw, chh)
    ctx.restore()
    // esquina del dialecto: un tick de acento sobre la card
    drawShape(ctx, ts, { path: circlePath(cx + cw / 2 - 14, cy - chh / 2 + 14, 4), fill: acc, alpha: 0.9 })
    ctx.restore()

    // caption bajo la card
    if (env.text) drawSupport(ctx, env, env.text, cy + chh / 2 + 30, win(ts, 0.6, 1.2), exitP(outP, 0, 3))
  },
}
