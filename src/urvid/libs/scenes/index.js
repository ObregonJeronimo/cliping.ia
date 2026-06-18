// urvid 1.0 · biblioteca SCENE-LAYOUTS — plantillas de escena que dibujan el CONTENIDO. render(ctx, t, env).
// env = { pal, content, fonts, seed, energy, sceneDur }. content = { brand, tagline, claim, cta, ... }.
// Usan la PALETA + la primitiva de texto (no-desborde garantizado) + motion. REGLA: texto en tinta (ink/inkText),
// acento para DECO (barras/reglas). El director elige la escena segun el beat narrativo (hook/value/proof/close).
import { register } from '../../core/registry.js'
import { drawText, drawWrapped } from '../../core/text.js'
import { W, H, TAU, inv, eOutCubic, spring, rgba } from '../../core/util.js'

register({
  id: 'scene.hero.center', lib: 'scene-layouts', category: 'openers/hero', tones: ['dark', 'light'], rubros: ['*'], weight: 1.3,
  tags: ['apertura', 'tipografico'], beat: 'hook',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, cx = W / 2
    // wordmark con asentamiento spring
    const ap = spring(inv(t, 0.15, 1.1), { zeta: 0.5, freq: 2.0 })
    const sc = 0.92 + 0.08 * ap
    ctx.save(); ctx.globalAlpha = inv(t, 0.1, 0.4); ctx.translate(cx, H * 0.4); ctx.scale(sc, sc)
    drawText(ctx, content.brand || 'Marca', 0, 0, { size: 64, weight: 800, family: fonts.display, maxW: W * 0.86, color: pal.ink, shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.4)' : null })
    ctx.restore()
    // regla de acento que crece (DECO en acento)
    const ru = eOutCubic(inv(t, 0.5, 1.1)), rw = 80 * ru
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(cx - rw / 2, H * 0.4 + 50, rw, 5, 2.5); ctx.fill()
    // tagline
    if (content.tagline) drawWrapped(ctx, content.tagline, cx, H * 0.47, { size: 24, weight: 600, family: fonts.text, maxW: W * 0.7, color: pal.dim, alpha: inv(t, 0.7, 1.3), maxLines: 2 })
  },
})

register({
  id: 'scene.statement.editorial', lib: 'scene-layouts', category: 'statements/editorial', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['claim', 'editorial'], beat: 'value',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, ax = W * 0.12
    // barra de acento sobre el titular (DECO)
    const mr = eOutCubic(inv(t, 0.05, 0.5))
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(ax, H * 0.34, 66 * mr, 6, 3); ctx.fill()
    // claim, izquierda, en tinta, envuelto
    ctx.save(); ctx.globalAlpha = inv(t, 0.15, 0.6); ctx.translate((1 - eOutCubic(inv(t, 0.15, 0.7))) * 24, 0)
    drawWrapped(ctx, content.claim || content.tagline || 'Un mensaje claro', ax, H * 0.46, { size: 42, weight: 800, family: fonts.display, maxW: W * 0.78, color: pal.ink, align: 'left', maxLines: 4, lh: 1.16, shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.5)' : null })
    ctx.restore()
  },
})

register({
  id: 'scene.outro.cta', lib: 'scene-layouts', category: 'closers/outro', tones: ['dark', 'light'], rubros: ['*'], weight: 1.2,
  tags: ['cierre', 'cta'], beat: 'close',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, cx = W / 2, cy = H * 0.42
    drawText(ctx, content.brand || 'Marca', cx, cy, { size: 54, weight: 800, family: fonts.display, maxW: W * 0.82, color: pal.ink, alpha: inv(t, 0.2, 0.9) })
    const bar = eOutCubic(inv(t, 0.5, 1.1))
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(cx - 60 * bar, cy + 42, 120 * bar, 5, 3); ctx.fill()
    // CTA: texto en TINTA-acento (legible) + subrayado en acento (DECO) + chevron
    const cta = inv(t, 1.0, 1.6)
    if (cta > 0 && content.cta) {
      const sc = spring(cta, { zeta: 0.5, freq: 2.0 })
      ctx.save(); ctx.translate(cx, cy + 108); ctx.scale(0.94 + 0.06 * sc, 0.94 + 0.06 * sc)
      const fs = drawText(ctx, content.cta, 0, 0, { size: 28, weight: 800, family: fonts.display, maxW: W * 0.7, color: pal.inkText })
      ctx.font = `800 ${fs}px "${fonts.display}"`; const tw = Math.min(W * 0.7, ctx.measureText(content.cta).width)
      const up = eOutCubic(inv(t, 1.3, 1.9))
      ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(-tw / 2, fs * 0.62, tw * up, 5, 2.5); ctx.fill()
      if (inv(t, 1.6, 2.0) > 0) { ctx.strokeStyle = pal.accent; ctx.lineWidth = 4; ctx.lineCap = 'round'; const ay = fs * 0.62 + 22; ctx.beginPath(); ctx.moveTo(-13, ay); ctx.lineTo(0, ay + 11); ctx.lineTo(13, ay); ctx.stroke() }
      ctx.restore()
    }
  },
})
