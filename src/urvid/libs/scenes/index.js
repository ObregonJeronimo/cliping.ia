// urvid 1.0 · biblioteca SCENE-LAYOUTS — plantillas de escena que dibujan el CONTENIDO. render(ctx, t, env).
// env = { pal, content, fonts, seed, energy, sceneDur }. content = { brand, tagline, claim, cta, ... }.
// Usan la PALETA + la primitiva de texto (no-desborde garantizado) + motion. REGLA: texto en tinta (ink/inkText),
// acento para DECO (barras/reglas). El director elige la escena segun el beat narrativo (hook/value/proof/close).
import { register } from '../../core/registry.js'
import { drawText, drawWrapped } from '../../core/text.js'
import { W, H, TAU, inv, lerp, clamp, eOutCubic, eOutBack, eInOutCubic, spring, smooth, rgba } from '../../core/util.js'
import { mulberry32 } from '../../core/prng.js'
import { defaultMotion } from '../../core/motion.js'
import { defaultTypekit } from '../../core/typekit.js'

// Motion: cada escena usa env.motion (la personalidad elegida por el director) en lugar de eases hardcodeados:
// M.ease = monotonico (reglas/barras/reveals), M.settle = overshoot (pops/escala). _DM = fallback si se renderiza
// una escena suelta sin env.motion (ej en un test aislado). El feel del default == el de antes del cableado.
// Typekit: TK = env.typekit -> TK.draw/TK.drawWrapped dibujan el TITULO con efecto cinetico cuando se les pasa
// opts.reveal (el progreso de entrada de la escena); sin reveal o reveal>=1 == drawText (estado final identico).
const _DM = defaultMotion()
const _DTK = defaultTypekit()

// helper local: divide un texto largo en frases/items por separadores comunes (·, •, |, /, coma, salto).
// devuelve hasta `max` items limpios; si no hay separador, cae a 1 item con el string entero.
function splitItems(str, max = 4) {
  const s = String(str == null ? '' : str).trim()
  if (!s) return []
  let parts = s.split(/\s*[·•|\/\n]\s*|\s*,\s+/).map(p => p.trim()).filter(Boolean)
  if (parts.length < 2) parts = [s]
  return parts.slice(0, max)
}
// helper: extrae el primer numero "grande" de un texto (ej claim "Ahorra hasta 40% de tiempo" -> "40%").
function bigNumber(str, fallback = '100%') {
  const m = String(str == null ? '' : str).match(/([+\-]?\$?\s?\d[\d.,]*\s?[%xX+kKmM]?)/)
  return m ? m[1].replace(/\s/g, '') : fallback
}
// helper: recorta un item a una etiqueta corta (<= maxWords palabras, sin numeros ni conectores) para captions de stats.
const STOP = new Set(['de', 'en', 'la', 'el', 'los', 'las', 'un', 'una', 'y', 'o', 'a', 'del', 'al', 'que', 'hasta', 'con', 'por'])
function shortLabel(str, maxWords = 2) {
  const raw = String(str == null ? '' : str).trim().split(/\s+/)
  const words = raw.filter(w => !/^[+\-$]?\d/.test(w) && w.length > 1 && !STOP.has(w.toLowerCase()))
  return (words.length ? words : raw).slice(0, maxWords).join(' ')
}
// SELECCION de contenido: usa el material REAL que la perception extrajo (bullets/stats/proof) si viene;
// si no, cae a la heuristica sobre el claim/tagline. Asi las listas/datos del video son fieles a la pagina.
function listFrom(content, fb, max = 4) {
  const b = content && content.bullets
  if (Array.isArray(b) && b.length) return b.slice(0, max)
  return splitItems((content && (content.claim || content.tagline)) || fb, max)
}
function statAt(content, i, fb) {
  const s = content && Array.isArray(content.stats) ? content.stats[i] : null
  if (s && (s.value || s.value === 0)) return { value: String(s.value), label: shortLabel(s.label || (content && content.tagline) || '', 3) }
  return { value: bigNumber((content && (content.claim || content.tagline)), fb), label: shortLabel((content && (content.tagline || content.brand)) || '', 3) }
}
function proofFrom(content, fb) { return (content && content.proof) || (content && (content.claim || content.tagline)) || fb }
// helper: dibuja un check de tilde (DECO) en (cx,cy) con radio r y progreso p [0..1].
function tick(ctx, cx, cy, r, p, color, lw = 3.4) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  const a = { x: cx - r * 0.45, y: cy + r * 0.02 }, b = { x: cx - r * 0.08, y: cy + r * 0.38 }, c = { x: cx + r * 0.5, y: cy - r * 0.34 }
  ctx.beginPath(); ctx.moveTo(a.x, a.y)
  if (p < 0.5) { const q = p / 0.5; ctx.lineTo(lerp(a.x, b.x, q), lerp(a.y, b.y, q)) }
  else { ctx.lineTo(b.x, b.y); const q = (p - 0.5) / 0.5; ctx.lineTo(lerp(b.x, c.x, q), lerp(b.y, c.y, q)) }
  ctx.stroke(); ctx.restore()
}
// helper: estrella de 5 puntas en (cx,cy) radio r, rellena `fill` de su area (0..1) con color, resto en track.
function star(ctx, cx, cy, r, fill, color, track) {
  const pts = []
  for (let i = 0; i < 10; i++) { const ang = -TAU / 4 + i * TAU / 10, rad = i % 2 ? r * 0.44 : r; pts.push([cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad]) }
  const path = () => { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath() }
  ctx.save(); path(); ctx.fillStyle = track; ctx.fill()
  if (fill > 0) { ctx.save(); path(); ctx.clip(); ctx.fillStyle = color; ctx.fillRect(cx - r, cy - r, r * 2 * clamp(fill, 0, 1), r * 2); ctx.restore() }
  ctx.restore()
}

register({
  id: 'scene.hero.center', lib: 'scene-layouts', category: 'openers/hero', tones: ['dark', 'light'], rubros: ['*'], weight: 1.3,
  tags: ['apertura', 'tipografico'], beat: 'hook',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2
    // wordmark con asentamiento spring
    const ap = M.settle(inv(t, 0.15, 1.1), { zeta: 0.5, freq: 2.0 })
    const sc = 0.92 + 0.08 * ap
    ctx.save(); ctx.globalAlpha = inv(t, 0.1, 0.4); ctx.translate(cx, H * 0.4); ctx.scale(sc, sc)
    drawText(ctx, content.brand || 'Marca', 0, 0, { size: 64, weight: 800, family: fonts.display, maxW: W * 0.86, color: pal.ink, shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.4)' : null })
    ctx.restore()
    // regla de acento que crece (DECO en acento)
    const ru = M.ease(inv(t, 0.5, 1.1)), rw = 80 * ru
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(cx - rw / 2, H * 0.4 + 50, rw, 5, 2.5); ctx.fill()
    // tagline
    if (content.tagline) drawWrapped(ctx, content.tagline, cx, H * 0.47, { size: 24, weight: 600, family: fonts.text, maxW: W * 0.7, color: pal.dim, alpha: inv(t, 0.7, 1.3), maxLines: 2 })
  },
})

register({
  id: 'scene.statement.editorial', lib: 'scene-layouts', category: 'statements/editorial', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['claim', 'editorial'], beat: 'value',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, ax = W * 0.12
    // barra de acento sobre el titular (DECO)
    const mr = M.ease(inv(t, 0.05, 0.5))
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(ax, H * 0.34, 66 * mr, 6, 3); ctx.fill()
    // claim, izquierda, en tinta, envuelto
    ctx.save(); ctx.globalAlpha = inv(t, 0.15, 0.6); ctx.translate((1 - M.ease(inv(t, 0.15, 0.7))) * 24, 0)
    drawWrapped(ctx, content.claim || content.tagline || 'Un mensaje claro', ax, H * 0.46, { size: 42, weight: 800, family: fonts.display, maxW: W * 0.78, color: pal.ink, align: 'left', maxLines: 4, lh: 1.16, shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.5)' : null })
    ctx.restore()
  },
})

register({
  id: 'scene.outro.cta', lib: 'scene-layouts', category: 'closers/outro', tones: ['dark', 'light'], rubros: ['*'], weight: 1.2,
  tags: ['cierre', 'cta'], beat: 'close',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2, cy = H * 0.42
    drawText(ctx, content.brand || 'Marca', cx, cy, { size: 54, weight: 800, family: fonts.display, maxW: W * 0.82, color: pal.ink, alpha: inv(t, 0.2, 0.9) })
    const bar = M.ease(inv(t, 0.5, 1.1))
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(cx - 60 * bar, cy + 42, 120 * bar, 5, 3); ctx.fill()
    // CTA: texto en TINTA-acento (legible) + subrayado en acento (DECO) + chevron
    const cta = inv(t, 1.0, 1.6)
    if (cta > 0 && content.cta) {
      const sc = M.settle(cta, { zeta: 0.5, freq: 2.0 })
      ctx.save(); ctx.translate(cx, cy + 108); ctx.scale(0.94 + 0.06 * sc, 0.94 + 0.06 * sc)
      const fs = drawText(ctx, content.cta, 0, 0, { size: 28, weight: 800, family: fonts.display, maxW: W * 0.7, color: pal.inkText })
      ctx.font = `800 ${fs}px "${fonts.display}"`; const tw = Math.min(W * 0.7, ctx.measureText(content.cta).width)
      const up = M.ease(inv(t, 1.3, 1.9))
      ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(-tw / 2, fs * 0.62, tw * up, 5, 2.5); ctx.fill()
      if (inv(t, 1.6, 2.0) > 0) { ctx.strokeStyle = pal.accent; ctx.lineWidth = 4; ctx.lineCap = 'round'; const ay = fs * 0.62 + 22; ctx.beginPath(); ctx.moveTo(-13, ay); ctx.lineTo(0, ay + 11); ctx.lineTo(13, ay); ctx.stroke() }
      ctx.restore()
    }
  },
})

// ============================================================================
// EXPANSION (ronda fill) — mas openers, statements, lists, data, social, closers.
// ============================================================================

// ---- openers/hero ----------------------------------------------------------

register({
  id: 'scene.hero.stacked', lib: 'scene-layouts', category: 'openers/hero', tones: ['dark', 'light'], rubros: ['*'], weight: 1.1,
  tags: ['apertura', 'editorial', 'masivo'], beat: 'hook',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, ax = W * 0.1
    // marca chica arriba (kicker en acento)
    drawText(ctx, (content.brand || 'Marca').toUpperCase(), ax, H * 0.3, { size: 18, weight: 700, family: fonts.accent || fonts.text, maxW: W * 0.8, color: pal.inkText, align: 'left', alpha: inv(t, 0.05, 0.4) })
    // claim grande, izquierda, en 2-3 lineas, stagger por subida
    const rise = M.settle(inv(t, 0.2, 0.95), 1.3)
    ctx.save(); ctx.globalAlpha = inv(t, 0.2, 0.7); ctx.translate(0, (1 - rise) * 40)
    drawWrapped(ctx, content.claim || content.tagline || content.brand || 'Una idea grande', ax, H * 0.46, { size: 50, weight: 800, family: fonts.display, maxW: W * 0.82, color: pal.ink, align: 'left', maxLines: 3, lh: 1.08, shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.45)' : null })
    ctx.restore()
    // regla inferior que barre
    const ru = M.ease(inv(t, 0.7, 1.3))
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(ax, H * 0.62, (W - 2 * ax) * ru, 5, 2.5); ctx.fill()
  },
})

register({
  id: 'scene.hero.framed', lib: 'scene-layouts', category: 'openers/hero', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['apertura', 'marco', 'premium'], beat: 'hook',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2, cy = H * 0.42
    // marco rectangular que se dibuja (draw-on por perimetro)
    const m = 46, x0 = m, y0 = H * 0.24, x1 = W - m, y1 = H * 0.6
    const dp = M.ease(inv(t, 0.1, 0.9)), perim = 2 * ((x1 - x0) + (y1 - y0)), seg = perim * dp
    ctx.save(); ctx.strokeStyle = pal.accent; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'
    ctx.beginPath()
    let rem = seg
    const edges = [[x0, y0, x1, y0], [x1, y0, x1, y1], [x1, y1, x0, y1], [x0, y1, x0, y0]]
    ctx.moveTo(x0, y0)
    for (const [ax, ay, bx, by] of edges) { const len = Math.hypot(bx - ax, by - ay); const f = clamp(rem / len, 0, 1); ctx.lineTo(lerp(ax, bx, f), lerp(ay, by, f)); rem -= len; if (rem <= 0) break }
    ctx.stroke(); ctx.restore()
    // marca centrada dentro
    drawText(ctx, content.brand || 'Marca', cx, cy - 8, { size: 46, weight: 800, family: fonts.display, maxW: (x1 - x0) - 24, color: pal.ink, alpha: inv(t, 0.45, 0.95) })
    if (content.tagline) drawWrapped(ctx, content.tagline, cx, cy + 34, { size: 18, weight: 600, family: fonts.text, maxW: (x1 - x0) - 30, color: pal.dim, alpha: inv(t, 0.7, 1.2), maxLines: 2 })
  },
})

// ---- openers/hook ----------------------------------------------------------

register({
  id: 'scene.hook.question', lib: 'scene-layouts', category: 'openers/hook', tones: ['dark', 'light'], rubros: ['*'], weight: 1.2,
  tags: ['hook', 'pregunta', 'gancho'], beat: 'hook',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2
    // signo de pregunta gigante de fondo (DECO en acento tenue)
    ctx.save(); ctx.globalAlpha = (pal.tone === 'light' ? 0.07 : 0.12) * inv(t, 0.0, 0.5)
    const qScale = lerp(0.9, 1, M.ease(inv(t, 0, 0.8)))
    drawText(ctx, '?', cx, H * 0.34, { size: 300 * qScale, weight: 800, family: fonts.display, color: pal.accent })
    ctx.restore()
    // pregunta real, envuelta, en tinta
    ctx.save(); ctx.globalAlpha = inv(t, 0.25, 0.75)
    TK.drawWrapped(ctx, content.tagline || content.claim || '¿Y si fuera mas facil?', cx, H * 0.5, { reveal: inv(t, 0.25, 1.05), size: 38, weight: 800, family: fonts.display, maxW: W * 0.82, color: pal.ink, maxLines: 3, lh: 1.14, shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.5)' : null })
    ctx.restore()
    // cursor/linea de respuesta que parpadea por t (determinista)
    const blink = (Math.sin(t * 6) > 0) ? 1 : 0.25
    ctx.fillStyle = pal.accent; ctx.globalAlpha = inv(t, 0.9, 1.2) * blink
    ctx.beginPath(); ctx.roundRect(cx - 26, H * 0.66, 52, 4, 2); ctx.fill(); ctx.globalAlpha = 1
  },
})

register({
  id: 'scene.hook.bignum', lib: 'scene-layouts', category: 'openers/hook', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['hook', 'dato', 'impacto'], beat: 'hook',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2
    const num = statAt(content, 0, '3x').value
    // numero gigante que entra con spring de escala
    const sp = M.settle(inv(t, 0.1, 1.0), { zeta: 0.45, freq: 2.1 }), sc = 0.7 + 0.3 * sp
    ctx.save(); ctx.globalAlpha = inv(t, 0.05, 0.4); ctx.translate(cx, H * 0.4); ctx.scale(sc, sc)
    drawText(ctx, num, 0, 0, { size: 150, weight: 800, family: fonts.display, maxW: W * 0.9, color: pal.inkText, shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.5)' : null })
    ctx.restore()
    // contexto debajo
    drawWrapped(ctx, content.tagline || content.claim || 'el cambio que importa', cx, H * 0.57, { size: 24, weight: 700, family: fonts.text, maxW: W * 0.78, color: pal.ink, alpha: inv(t, 0.5, 1.0), maxLines: 2 })
  },
})

// ---- statements/editorial --------------------------------------------------

register({
  id: 'scene.statement.quoted', lib: 'scene-layouts', category: 'statements/editorial', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['claim', 'cita', 'editorial'], beat: 'value',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, ax = W * 0.14
    // comilla gigante de apertura (DECO)
    ctx.save(); ctx.globalAlpha = (pal.tone === 'light' ? 0.16 : 0.22) * inv(t, 0.0, 0.5)
    drawText(ctx, '“', ax + 4, H * 0.3, { size: 150, weight: 800, family: fonts.display, color: pal.accent, align: 'left' })
    ctx.restore()
    // claim, izquierda, reveal por linea (mascara que sube)
    ctx.save(); ctx.globalAlpha = inv(t, 0.2, 0.7); ctx.translate((1 - M.ease(inv(t, 0.2, 0.85))) * 22, 0)
    drawWrapped(ctx, content.claim || content.tagline || 'Lo simple escala', ax, H * 0.49, { size: 38, weight: 800, family: fonts.display, maxW: W * 0.74, color: pal.ink, align: 'left', maxLines: 4, lh: 1.18 })
    ctx.restore()
    // firma de marca
    if (content.brand) drawText(ctx, '— ' + content.brand, ax, H * 0.66, { size: 18, weight: 700, family: fonts.accent || fonts.text, color: pal.inkText, align: 'left', maxW: W * 0.7, alpha: inv(t, 0.7, 1.2) })
  },
})

register({
  id: 'scene.statement.boxed', lib: 'scene-layouts', category: 'statements/editorial', tones: ['dark', 'light'], rubros: ['*'], weight: 0.9,
  tags: ['claim', 'panel', 'destacado'], beat: 'value',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2
    // panel surface centrado que crece
    const gp = M.ease(inv(t, 0.1, 0.8)), pw = W * 0.78, ph = H * 0.3, py = H * 0.36
    ctx.save(); ctx.translate(cx, py + ph / 2); ctx.scale(lerp(0.9, 1, gp), lerp(0.9, 1, gp)); ctx.translate(-cx, -(py + ph / 2))
    ctx.globalAlpha = gp
    ctx.fillStyle = pal.tone === 'light' ? 'rgba(20,16,24,0.04)' : 'rgba(255,255,255,0.05)'
    ctx.beginPath(); ctx.roundRect(cx - pw / 2, py, pw, ph, 18); ctx.fill()
    // borde de acento a la izquierda del panel
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(cx - pw / 2, py, 6, ph, 3); ctx.fill()
    ctx.restore()
    // claim dentro
    TK.drawWrapped(ctx, content.claim || content.tagline || 'Tu mensaje, claro', cx, py + ph / 2, { reveal: inv(t, 0.4, 1.05), size: 32, weight: 800, family: fonts.display, maxW: pw - 48, color: pal.ink, maxLines: 4, lh: 1.16, alpha: inv(t, 0.4, 0.9) })
  },
})

// ---- lists/checklist -------------------------------------------------------

register({
  id: 'scene.checklist.ticks', lib: 'scene-layouts', category: 'lists/checklist', tones: ['dark', 'light'], rubros: ['*'], weight: 1.2,
  tags: ['lista', 'checklist', 'beneficios'], beat: 'value',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, ax = W * 0.13
    const items = listFrom(content, 'Rapido · Simple · Confiable', 4)
    if (content.brand) drawText(ctx, (content.brand || '').toUpperCase(), ax, H * 0.26, { size: 16, weight: 700, family: fonts.accent || fonts.text, color: pal.inkText, align: 'left', maxW: W * 0.74, alpha: inv(t, 0.05, 0.35) })
    const y0 = H * 0.36, gap = Math.min(78, (H * 0.46) / Math.max(1, items.length))
    items.forEach((it, i) => {
      const tin = inv(t, 0.2 + i * 0.18, 0.7 + i * 0.18)
      if (tin <= 0) return
      const y = y0 + i * gap
      // circulo de check
      ctx.save(); ctx.globalAlpha = tin
      const cr = 17
      ctx.fillStyle = rgba(pal.accent, pal.tone === 'light' ? 0.16 : 0.22); ctx.beginPath(); ctx.arc(ax + cr, y, cr, 0, TAU); ctx.fill()
      tick(ctx, ax + cr, y, cr, M.ease(tin), pal.inkText, 3.2)
      ctx.restore()
      // texto del item
      ctx.save(); ctx.globalAlpha = tin; ctx.translate((1 - M.ease(tin)) * 16, 0)
      drawText(ctx, it, ax + cr * 2 + 14, y, { size: 26, weight: 700, family: fonts.text, maxW: W - (ax + cr * 2 + 14) - W * 0.08, color: pal.ink, align: 'left' })
      ctx.restore()
    })
  },
})

register({
  id: 'scene.checklist.numbered', lib: 'scene-layouts', category: 'lists/checklist', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['lista', 'pasos', 'numerada'], beat: 'value',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, ax = W * 0.13
    const items = listFrom(content, 'Conecta · Configura · Lanza', 4)
    drawText(ctx, content.brand ? (content.brand + '').toUpperCase() : 'COMO FUNCIONA', ax, H * 0.25, { size: 16, weight: 700, family: fonts.accent || fonts.text, color: pal.inkText, align: 'left', maxW: W * 0.74, alpha: inv(t, 0.05, 0.35) })
    const y0 = H * 0.35, gap = Math.min(82, (H * 0.48) / Math.max(1, items.length))
    items.forEach((it, i) => {
      const tin = inv(t, 0.2 + i * 0.2, 0.7 + i * 0.2)
      if (tin <= 0) return
      const y = y0 + i * gap, sp = M.settle(tin, { zeta: 0.5, freq: 2 })
      // numero en pildora de acento
      ctx.save(); ctx.globalAlpha = tin; ctx.translate(ax + 20, y); ctx.scale(0.8 + 0.2 * sp, 0.8 + 0.2 * sp)
      ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.arc(0, 0, 20, 0, TAU); ctx.fill()
      drawText(ctx, String(i + 1), 0, 1, { size: 22, weight: 800, family: fonts.display, color: pal.onAccent })
      ctx.restore()
      ctx.save(); ctx.globalAlpha = tin; ctx.translate((1 - M.ease(tin)) * 16, 0)
      drawText(ctx, it, ax + 50, y, { size: 25, weight: 700, family: fonts.text, maxW: W - (ax + 50) - W * 0.08, color: pal.ink, align: 'left' })
      ctx.restore()
    })
  },
})

// ---- lists/comparison ------------------------------------------------------

register({
  id: 'scene.comparison.vs', lib: 'scene-layouts', category: 'lists/comparison', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['comparacion', 'antes-despues', 'vs'], beat: 'value',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK
    const parts = splitItems(content.claim || content.tagline || 'Antes · Despues', 2)
    const left = parts[0] || 'Antes', right = parts[1] || 'Despues'
    const midX = W / 2, colX = W * 0.25, colW = W * 0.3
    // dos columnas que entran desde los lados
    const la = M.ease(inv(t, 0.15, 0.7)), ra = M.ease(inv(t, 0.3, 0.85))
    // panel izquierdo (dim/tachado conceptual)
    ctx.save(); ctx.globalAlpha = la; ctx.translate((1 - la) * -40, 0)
    drawText(ctx, 'ANTES', colX, H * 0.32, { size: 15, weight: 700, family: fonts.accent || fonts.text, color: pal.dim, maxW: colW })
    drawWrapped(ctx, left, colX, H * 0.46, { size: 24, weight: 700, family: fonts.display, maxW: colW, color: pal.dim, maxLines: 4, lh: 1.16 })
    ctx.restore()
    // panel derecho (ink/acento)
    ctx.save(); ctx.globalAlpha = ra; ctx.translate((1 - ra) * 40, 0)
    drawText(ctx, 'DESPUES', W - colX, H * 0.32, { size: 15, weight: 700, family: fonts.accent || fonts.text, color: pal.inkText, maxW: colW })
    drawWrapped(ctx, right, W - colX, H * 0.46, { size: 26, weight: 800, family: fonts.display, maxW: colW, color: pal.ink, maxLines: 4, lh: 1.16 })
    ctx.restore()
    // divisor central con pildora "vs"
    const dh = M.ease(inv(t, 0.1, 0.8))
    ctx.save(); ctx.strokeStyle = rgba(pal.ink, 0.18); ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(midX, H * 0.3 + (1 - dh) * 60); ctx.lineTo(midX, H * 0.6 - (1 - dh) * 60); ctx.stroke(); ctx.restore()
    const vp = M.settle(inv(t, 0.4, 1.1), { zeta: 0.5, freq: 2 })
    ctx.save(); ctx.translate(midX, H * 0.45); ctx.scale(vp, vp)
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.arc(0, 0, 22, 0, TAU); ctx.fill()
    drawText(ctx, 'vs', 0, 1, { size: 18, weight: 800, family: fonts.display, color: pal.onAccent })
    ctx.restore()
  },
})

// ---- data/single -----------------------------------------------------------

register({
  id: 'scene.data.single', lib: 'scene-layouts', category: 'data/single', tones: ['dark', 'light'], rubros: ['*'], weight: 1.1,
  tags: ['dato', 'numero', 'kpi'], beat: 'data',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2
    const num = statAt(content, 0, '100%').value
    // anillo de acento que se dibuja alrededor del numero
    const ringP = M.ease(inv(t, 0.2, 1.1)), R = 118
    ctx.save(); ctx.translate(cx, H * 0.42)
    ctx.strokeStyle = rgba(pal.ink, 0.1); ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.stroke()
    ctx.strokeStyle = pal.accent; ctx.lineWidth = 9; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.arc(0, 0, R, -TAU / 4, -TAU / 4 + TAU * ringP); ctx.stroke()
    ctx.restore()
    // numero grande centrado (count-style: aparece con escala)
    const sp = M.settle(inv(t, 0.25, 1.0), { zeta: 0.5, freq: 2 })
    ctx.save(); ctx.translate(cx, H * 0.42); ctx.scale(0.8 + 0.2 * sp, 0.8 + 0.2 * sp)
    drawText(ctx, num, 0, 0, { size: 86, weight: 800, family: fonts.display, maxW: R * 1.8, color: pal.ink })
    ctx.restore()
    // etiqueta debajo
    drawWrapped(ctx, content.tagline || content.brand || 'resultado', cx, H * 0.66, { size: 22, weight: 700, family: fonts.text, maxW: W * 0.74, color: pal.dim, maxLines: 2, alpha: inv(t, 0.6, 1.1) })
  },
})

// ---- data/multi ------------------------------------------------------------

register({
  id: 'scene.data.multi', lib: 'scene-layouts', category: 'data/multi', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['datos', 'stats', 'kpis'], beat: 'data',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK
    // genera 3 stats a partir del contenido (numero de claim/tagline + items para etiquetas)
    const r = mulberry32((env.seed >>> 0) ^ 0x515)
    const stats = Array.isArray(content.stats) ? content.stats.slice(0, 3) : []
    const labels = stats.length ? stats.map(s => shortLabel(s.label || '', 3)) : splitItems(content.claim || content.tagline || 'Clientes · Proyectos · Anos', 3).map(l => shortLabel(l, 3))
    const nums = stats.length ? stats.map(s => String(s.value)) : [bigNumber(content.claim, ''), '', ''].map((n, i) => n || ['+' + (10 + ((r() * 90) | 0)), (1 + ((r() * 9) | 0)) + 'x', '99%'][i])
    const n = Math.min(3, labels.length || 3), cy = H * 0.44, colW = W / n
    // titulo opcional
    if (content.brand) drawText(ctx, (content.brand || '').toUpperCase(), W / 2, H * 0.24, { size: 16, weight: 700, family: fonts.accent || fonts.text, color: pal.inkText, maxW: W * 0.8, alpha: inv(t, 0.05, 0.35) })
    for (let i = 0; i < n; i++) {
      const tin = inv(t, 0.25 + i * 0.18, 0.8 + i * 0.18); if (tin <= 0) continue
      const x = colW * (i + 0.5), sp = M.settle(tin, { zeta: 0.5, freq: 2 })
      ctx.save(); ctx.globalAlpha = tin; ctx.translate(x, cy); ctx.scale(0.85 + 0.15 * sp, 0.85 + 0.15 * sp)
      drawText(ctx, nums[i] || '—', 0, -8, { size: 52, weight: 800, family: fonts.display, maxW: colW - 16, color: pal.ink })
      ctx.restore()
      drawWrapped(ctx, labels[i] || '', x, cy + 44, { size: 16, weight: 700, family: fonts.text, maxW: colW - 18, color: pal.dim, maxLines: 2, alpha: tin })
      // separador vertical entre columnas
      if (i < n - 1) { const dh = M.ease(inv(t, 0.2, 0.9)); ctx.save(); ctx.strokeStyle = rgba(pal.ink, 0.12); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(colW * (i + 1), cy - 40 * dh); ctx.lineTo(colW * (i + 1), cy + 50 * dh); ctx.stroke(); ctx.restore() }
    }
  },
})

// ---- social/proof ----------------------------------------------------------

register({
  id: 'scene.social.proof', lib: 'scene-layouts', category: 'social/proof', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['prueba-social', 'cita', 'estrellas', 'rating'], beat: 'proof',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2
    // 5 estrellas que se llenan de izq a der (DECO)
    const fillP = M.ease(inv(t, 0.2, 1.0)) * 5, sr = 15, gap = 40, x0 = cx - gap * 2
    for (let i = 0; i < 5; i++) { const f = clamp(fillP - i, 0, 1); star(ctx, x0 + i * gap, H * 0.32, sr, f, pal.accent, rgba(pal.ink, 0.14)) }
    // cita/testimonio en tinta
    ctx.save(); ctx.globalAlpha = inv(t, 0.35, 0.85)
    TK.drawWrapped(ctx, proofFrom(content, 'Cambio como trabajamos'), cx, H * 0.5, { reveal: inv(t, 0.35, 1.05), size: 30, weight: 700, family: fonts.display, maxW: W * 0.8, color: pal.ink, maxLines: 4, lh: 1.2 })
    ctx.restore()
    // atribucion
    if (content.brand) {
      const ap = inv(t, 0.7, 1.2)
      ctx.fillStyle = pal.accent; ctx.globalAlpha = ap
      ctx.beginPath(); ctx.roundRect(cx - 16, H * 0.64, 32 * M.ease(ap), 3, 1.5); ctx.fill(); ctx.globalAlpha = 1
      drawText(ctx, content.brand, cx, H * 0.68, { size: 18, weight: 700, family: fonts.accent || fonts.text, color: pal.dim, maxW: W * 0.7, alpha: ap })
    }
  },
})

// ---- closers/outro ---------------------------------------------------------

register({
  id: 'scene.outro.lockup', lib: 'scene-layouts', category: 'closers/outro', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['cierre', 'marca', 'lockup'], beat: 'close',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2, cy = H * 0.44
    // monograma: inicial de la marca en un cuadro de acento
    const init = (content.brand || 'M').trim().charAt(0).toUpperCase()
    const sp = M.settle(inv(t, 0.1, 0.9), { zeta: 0.5, freq: 2 }), s = 0.8 + 0.2 * sp
    ctx.save(); ctx.globalAlpha = inv(t, 0.05, 0.4); ctx.translate(cx, cy - 40); ctx.scale(s, s)
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(-34, -34, 68, 68, 16); ctx.fill()
    drawText(ctx, init, 0, 2, { size: 44, weight: 800, family: fonts.display, color: pal.onAccent })
    ctx.restore()
    // marca
    drawText(ctx, content.brand || 'Marca', cx, cy + 36, { size: 36, weight: 800, family: fonts.display, maxW: W * 0.84, color: pal.ink, alpha: inv(t, 0.35, 0.85) })
    // tagline o cta
    const sub = content.cta || content.tagline
    if (sub) drawText(ctx, sub, cx, cy + 78, { size: 20, weight: 700, family: fonts.text, maxW: W * 0.8, color: pal.inkText, alpha: inv(t, 0.6, 1.1) })
  },
})

register({
  id: 'scene.outro.handle', lib: 'scene-layouts', category: 'closers/outro', tones: ['dark', 'light'], rubros: ['*'], weight: 0.9,
  tags: ['cierre', 'cta', 'pildora'], beat: 'close',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2
    drawText(ctx, content.brand || 'Marca', cx, H * 0.4, { size: 46, weight: 800, family: fonts.display, maxW: W * 0.84, color: pal.ink, alpha: inv(t, 0.15, 0.7) })
    // pildora CTA rellena de acento que crece
    const cta = content.cta || 'Sumate hoy'
    const gp = M.settle(inv(t, 0.5, 1.2), { zeta: 0.5, freq: 2 })
    ctx.save(); ctx.font = `800 26px "${fonts.display}"`
    const tw = Math.min(W * 0.7, ctx.measureText(cta).width), pw = tw + 56, ph = 56, py = H * 0.52
    ctx.translate(cx, py + ph / 2); ctx.scale(0.85 + 0.15 * gp, 0.85 + 0.15 * gp); ctx.globalAlpha = inv(t, 0.5, 0.9)
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(-pw / 2, -ph / 2, pw, ph, ph / 2); ctx.fill()
    drawText(ctx, cta, 0, 1, { size: 26, weight: 800, family: fonts.display, maxW: pw - 36, color: pal.onAccent })
    ctx.restore()
    if (content.tagline) drawText(ctx, content.tagline, cx, H * 0.66, { size: 18, weight: 600, family: fonts.text, maxW: W * 0.78, color: pal.dim, alpha: inv(t, 0.8, 1.3) })
  },
})

// ============================================================================
// EXPANSION (ronda fill · OLA 2) — connectors/interstitial + spec/slots + mas
// openers/hook (estadistica de shock, pregunta binaria), statements (panel,
// mega-tipografia), closers (bigtype, diagonal), comparacion y data extra.
// ============================================================================

// helper local: primera "palabra fuerte" de un texto (para interstitials de 1 palabra).
// salta conectores; cae a la 1ra palabra util o un fallback.
function firstStrong(str, fallback = 'AHORA') {
  const raw = String(str == null ? '' : str).trim().split(/\s+/)
  const w = raw.find(x => x.length > 2 && !STOP.has(x.toLowerCase())) || raw[0] || fallback
  return w.replace(/[.,;:!?"“”]/g, '')
}

// ---- connectors/interstitial -----------------------------------------------
// Transicion narrativa: una sola palabra grande que entra y "respira", sin claim
// largo. Sirve de bisagra entre beats (hook -> value, value -> proof).

register({
  id: 'scene.interstitial.word', lib: 'scene-layouts', category: 'connectors/interstitial', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['transicion', 'bisagra', 'una-palabra'], beat: 'context',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2, cy = H * 0.42
    const word = firstStrong(content.tagline || content.claim || content.cta, 'ASI').toUpperCase()
    // dos reglas de acento que cierran como parentesis hacia la palabra (DECO)
    const cl = M.ease(inv(t, 0.05, 0.7)), gap = lerp(W * 0.42, 18, cl)
    ctx.save(); ctx.fillStyle = pal.accent; ctx.globalAlpha = inv(t, 0.05, 0.4)
    ctx.beginPath(); ctx.roundRect(cx - gap - 46, cy - 2.5, 46, 5, 2.5); ctx.fill()
    ctx.beginPath(); ctx.roundRect(cx + gap, cy - 2.5, 46, 5, 2.5); ctx.fill(); ctx.restore()
    // palabra: entra con spring de escala + leve respiracion por t (determinista)
    const sp = M.settle(inv(t, 0.2, 1.0), { zeta: 0.5, freq: 2.1 })
    const breathe = 1 + 0.012 * Math.sin(t * 1.6)
    const sc = (0.78 + 0.22 * sp) * breathe
    ctx.save(); ctx.globalAlpha = inv(t, 0.12, 0.5); ctx.translate(cx, cy); ctx.scale(sc, sc)
    drawText(ctx, word, 0, 0, { size: 62, weight: 800, family: fonts.display, maxW: W * 0.74, color: pal.ink, shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.45)' : null })
    ctx.restore()
  },
})

register({
  id: 'scene.interstitial.sweep', lib: 'scene-layouts', category: 'connectors/interstitial', tones: ['dark', 'light'], rubros: ['*'], weight: 0.9,
  tags: ['transicion', 'barrido', 'kicker'], beat: 'context',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cy = H * 0.44
    const word = firstStrong(content.tagline || content.claim, 'LISTO').toUpperCase()
    // banda de acento que barre de izq a der detras de la palabra (DECO)
    const sw = M.ease(inv(t, 0.1, 0.85)), bh = 64
    ctx.save(); ctx.globalAlpha = (pal.tone === 'light' ? 0.14 : 0.2) * inv(t, 0.05, 0.4)
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.rect(0, cy - bh / 2, W * sw, bh); ctx.fill(); ctx.restore()
    // palabra alineada a izquierda, entra desde la izquierda con la banda
    const enter = M.ease(inv(t, 0.25, 0.9))
    ctx.save(); ctx.globalAlpha = inv(t, 0.2, 0.6); ctx.translate((1 - enter) * -30, 0)
    drawText(ctx, word, W * 0.1, cy, { size: 52, weight: 800, family: fonts.display, maxW: W * 0.8, color: pal.ink, align: 'left', shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.4)' : null })
    ctx.restore()
    // numero/kicker de paso opcional arriba (si la marca existe), en mono-acento
    if (content.brand) drawText(ctx, (content.brand || '').toUpperCase(), W * 0.1, H * 0.32, { size: 15, weight: 700, family: fonts.accent || fonts.text, color: pal.inkText, align: 'left', maxW: W * 0.78, alpha: inv(t, 0.0, 0.35) })
  },
})

register({
  id: 'scene.interstitial.count', lib: 'scene-layouts', category: 'connectors/interstitial', tones: ['dark', 'light'], rubros: ['*'], weight: 0.85,
  tags: ['transicion', 'capitulo', 'indice'], beat: 'context',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2
    // indice de capitulo gigante de fondo (DECO en acento tenue) + palabra de bisagra
    const r = mulberry32((env.seed >>> 0) ^ 0x21a)
    const idx = '0' + (1 + ((r() * 3) | 0))   // 01..03, estable por seed
    const word = firstStrong(content.tagline || content.claim || content.brand, 'PARTE').toUpperCase()
    const sc = lerp(0.94, 1, M.ease(inv(t, 0.05, 0.8)))
    ctx.save(); ctx.globalAlpha = (pal.tone === 'light' ? 0.08 : 0.14) * inv(t, 0.0, 0.5); ctx.translate(cx, H * 0.4); ctx.scale(sc, sc)
    drawText(ctx, idx, 0, 0, { size: 240, weight: 800, family: fonts.display, color: pal.accent })
    ctx.restore()
    // palabra en tinta encima, sube y se asienta
    const rise = M.settle(inv(t, 0.25, 1.0), 1.2)
    ctx.save(); ctx.globalAlpha = inv(t, 0.25, 0.7); ctx.translate(0, (1 - rise) * 26)
    drawText(ctx, word, cx, H * 0.52, { size: 46, weight: 800, family: fonts.display, maxW: W * 0.78, color: pal.ink })
    ctx.restore()
    // regla corta bajo la palabra
    const ru = M.ease(inv(t, 0.5, 1.1))
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(cx - 30 * ru, H * 0.58, 60 * ru, 4, 2); ctx.fill()
  },
})

// ---- spec/slots ------------------------------------------------------------
// Ficha de especificacion: pares clave/valor o atributos. Ideal para producto,
// inmueble, plan: "3 amb · 80 m2 · USD 120k". Lee items separados del claim.

register({
  id: 'scene.spec.feature', lib: 'scene-layouts', category: 'spec/slots', tones: ['dark', 'light'], rubros: ['*'], weight: 1.1,
  tags: ['ficha', 'specs', 'atributos', 'inmueble', 'producto'], beat: 'data',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK
    const items = listFrom(content, '3 ambientes · 80 m2 · Cochera · Apto credito', 4)
    // titulo / marca arriba
    drawText(ctx, content.brand ? (content.brand + '').toUpperCase() : 'FICHA', W * 0.12, H * 0.22, { size: 16, weight: 700, family: fonts.accent || fonts.text, color: pal.inkText, align: 'left', maxW: W * 0.76, alpha: inv(t, 0.0, 0.3) })
    const x0 = W * 0.12, x1 = W * 0.88, y0 = H * 0.32, gap = Math.min(74, (H * 0.5) / Math.max(1, items.length))
    items.forEach((it, i) => {
      const tin = inv(t, 0.18 + i * 0.16, 0.68 + i * 0.16); if (tin <= 0) return
      const y = y0 + i * gap
      // separa "valor : etiqueta" si hay numero; si no, item plano con marca de acento
      const num = (it.match(/([+\-]?\$?\s?\d[\d.,]*\s?[%xXmMkK²m2]*)/) || [])[1]
      ctx.save(); ctx.globalAlpha = tin
      // marca de slot: cuadradito de acento a la izquierda (DECO)
      const mk = M.ease(tin)
      ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(x0, y - 7, 14 * mk, 14, 3); ctx.fill()
      ctx.restore()
      // valor (en tinta, fuerte) + etiqueta (dim) si se pudo partir
      ctx.save(); ctx.globalAlpha = tin; ctx.translate((1 - M.ease(tin)) * 14, 0)
      if (num) {
        const label = shortLabel(it.replace(num, ''), 3)
        drawText(ctx, num.trim(), x0 + 26, y, { size: 27, weight: 800, family: fonts.display, color: pal.ink, align: 'left', maxW: W * 0.4 })
        if (label) drawText(ctx, label, x1, y, { size: 19, weight: 700, family: fonts.text, color: pal.dim, align: 'right', maxW: W * 0.42 })
      } else {
        drawText(ctx, it, x0 + 26, y, { size: 24, weight: 700, family: fonts.text, color: pal.ink, align: 'left', maxW: W * 0.7 })
      }
      ctx.restore()
      // regla divisoria fina bajo cada slot (DECO en tinta tenue)
      if (i < items.length - 1) { const dl = M.ease(inv(t, 0.2 + i * 0.16, 0.9 + i * 0.16)); ctx.save(); ctx.strokeStyle = rgba(pal.ink, 0.12); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, y + gap / 2); ctx.lineTo(x0 + (x1 - x0) * dl, y + gap / 2); ctx.stroke(); ctx.restore() }
    })
  },
})

register({
  id: 'scene.spec.detail', lib: 'scene-layouts', category: 'spec/slots', tones: ['dark', 'light'], rubros: ['*'], weight: 0.95,
  tags: ['ficha', 'destacado', 'precio', 'spec-grid'], beat: 'data',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK
    // grilla 2x2 de chips de spec; cada chip = panel surface con valor en tinta
    const items = listFrom(content, '80 m2 · 3 amb · 2 banos · Cochera', 4)
    while (items.length < Math.min(4, Math.max(2, items.length))) items.push('')
    const n = Math.min(4, items.length)
    const cols = n <= 2 ? n : 2, rows = Math.ceil(n / cols)
    const gw = W * 0.76, gx = (W - gw) / 2, cellW = gw / cols, cellH = 92, gy = H * (rows > 1 ? 0.3 : 0.4)
    if (content.brand) drawText(ctx, (content.brand || '').toUpperCase(), W / 2, H * 0.2, { size: 16, weight: 700, family: fonts.accent || fonts.text, color: pal.inkText, maxW: W * 0.78, alpha: inv(t, 0.0, 0.3) })
    for (let i = 0; i < n; i++) {
      const it = items[i]; if (!it) continue
      const r = Math.floor(i / cols), c = i % cols
      const cellX = gx + c * cellW + 6, cellY = gy + r * (cellH + 12), cw = cellW - 12
      const tin = inv(t, 0.18 + i * 0.12, 0.7 + i * 0.12); if (tin <= 0) continue
      const sp = M.settle(tin, { zeta: 0.5, freq: 2 })
      ctx.save(); ctx.globalAlpha = tin
      ctx.translate(cellX + cw / 2, cellY + cellH / 2); ctx.scale(0.9 + 0.1 * sp, 0.9 + 0.1 * sp); ctx.translate(-(cellX + cw / 2), -(cellY + cellH / 2))
      ctx.fillStyle = pal.tone === 'light' ? 'rgba(20,16,24,0.05)' : 'rgba(255,255,255,0.06)'
      ctx.beginPath(); ctx.roundRect(cellX, cellY, cw, cellH, 14); ctx.fill()
      // barra de acento arriba del chip
      ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(cellX, cellY, cw, 4, 2); ctx.fill()
      ctx.restore()
      const num = (it.match(/([+\-]?\$?\s?\d[\d.,]*\s?[%xXmMkK²m2]*)/) || [])[1]
      const label = shortLabel(num ? it.replace(num, '') : it, 2)
      ctx.save(); ctx.globalAlpha = tin
      drawText(ctx, (num || it).trim(), cellX + cw / 2, cellY + cellH * 0.42, { size: 28, weight: 800, family: fonts.display, color: pal.ink, maxW: cw - 18 })
      if (num && label) drawText(ctx, label, cellX + cw / 2, cellY + cellH * 0.74, { size: 15, weight: 700, family: fonts.text, color: pal.dim, maxW: cw - 16 })
      ctx.restore()
    }
  },
})

// ---- openers/hook (mas) ----------------------------------------------------

register({
  id: 'scene.hook.shockstat', lib: 'scene-layouts', category: 'openers/hook', tones: ['dark', 'light'], rubros: ['*'], weight: 1.1,
  tags: ['hook', 'estadistica', 'shock', 'dato'], beat: 'hook',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2
    const num = statAt(content, 0, '73%').value
    // numero gigante que "cuenta" hacia su tamano (escala desde abajo) + reveal por mascara que sube
    const grow = eOutExpoLocal(inv(t, 0.05, 0.85))
    ctx.save(); ctx.globalAlpha = inv(t, 0.0, 0.35); ctx.translate(cx, H * 0.36); ctx.scale(0.6 + 0.4 * grow, 0.6 + 0.4 * grow)
    drawText(ctx, num, 0, 0, { size: 172, weight: 800, family: fonts.display, maxW: W * 0.94, color: pal.inkText, shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.5)' : null })
    ctx.restore()
    // regla de acento bajo el numero
    const ru = M.ease(inv(t, 0.45, 1.0))
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(cx - 46 * ru, H * 0.49, 92 * ru, 5, 2.5); ctx.fill()
    // contexto que explica la estadistica (lo que la vuelve shock)
    drawWrapped(ctx, content.tagline || content.claim || 'de la gente se rinde antes de empezar', cx, H * 0.6, { size: 25, weight: 700, family: fonts.text, maxW: W * 0.82, color: pal.ink, maxLines: 3, lh: 1.18, alpha: inv(t, 0.55, 1.05) })
  },
})

register({
  id: 'scene.hook.binary', lib: 'scene-layouts', category: 'openers/hook', tones: ['dark', 'light'], rubros: ['*'], weight: 0.95,
  tags: ['hook', 'pregunta', 'binaria', 'eleccion'], beat: 'hook',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2
    // pregunta arriba, en tinta
    ctx.save(); ctx.globalAlpha = inv(t, 0.1, 0.5)
    drawWrapped(ctx, content.tagline || content.claim || '¿Seguis perdiendo tiempo?', cx, H * 0.32, { size: 32, weight: 800, family: fonts.display, maxW: W * 0.82, color: pal.ink, maxLines: 3, lh: 1.14, shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.45)' : null })
    ctx.restore()
    // dos opciones tipo "si / no" como chips contrapuestos (uno acento, uno dim)
    const labels = splitItems(content.claim || 'Antes · Ahora', 2)
    const a = labels[0] || 'NO', b = labels[1] || 'SI'
    const cw = W * 0.34, ch = 64, gap = 18, totW = cw * 2 + gap, x0 = cx - totW / 2, y = H * 0.56
    const inA = M.settle(inv(t, 0.35, 1.0), { zeta: 0.5, freq: 2 }), inB = M.settle(inv(t, 0.5, 1.15), { zeta: 0.5, freq: 2 })
    // chip izquierdo (la opcion vieja, dim, contorno)
    ctx.save(); ctx.globalAlpha = inv(t, 0.35, 0.8); ctx.translate(x0 + cw / 2, y + ch / 2); ctx.scale(0.9 + 0.1 * inA, 0.9 + 0.1 * inA); ctx.translate(-(x0 + cw / 2), -(y + ch / 2))
    ctx.strokeStyle = rgba(pal.ink, 0.28); ctx.lineWidth = 1.8; ctx.beginPath(); ctx.roundRect(x0, y, cw, ch, 14); ctx.stroke()
    drawText(ctx, a, x0 + cw / 2, y + ch / 2, { size: 22, weight: 700, family: fonts.display, color: pal.dim, maxW: cw - 20 })
    ctx.restore()
    // chip derecho (la opcion buena, acento relleno)
    ctx.save(); ctx.globalAlpha = inv(t, 0.5, 0.95); ctx.translate(x0 + cw + gap + cw / 2, y + ch / 2); ctx.scale(0.88 + 0.12 * inB, 0.88 + 0.12 * inB); ctx.translate(-(x0 + cw + gap + cw / 2), -(y + ch / 2))
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(x0 + cw + gap, y, cw, ch, 14); ctx.fill()
    drawText(ctx, b, x0 + cw + gap + cw / 2, y + ch / 2, { size: 23, weight: 800, family: fonts.display, color: pal.onAccent, maxW: cw - 20 })
    ctx.restore()
  },
})

// ---- statements/editorial (mas) --------------------------------------------

register({
  id: 'scene.statement.panel', lib: 'scene-layouts', category: 'statements/editorial', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['claim', 'panel', 'full-bleed', 'editorial'], beat: 'value',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2
    // panel de acento full-width que baja desde arriba; claim en color onAccent encima
    const drop = M.ease(inv(t, 0.05, 0.8)), ph = H * 0.34, py = H * 0.33
    ctx.save(); ctx.globalAlpha = inv(t, 0.0, 0.4)
    ctx.fillStyle = pal.accent
    ctx.beginPath(); ctx.rect(0, py, W, ph * drop); ctx.fill(); ctx.restore()
    // kicker chico arriba del panel
    if (content.brand) drawText(ctx, (content.brand || '').toUpperCase(), cx, py - 22, { size: 15, weight: 700, family: fonts.accent || fonts.text, color: pal.inkText, maxW: W * 0.8, alpha: inv(t, 0.0, 0.35) })
    // claim dentro del panel en onAccent (alto contraste garantizado por la paleta)
    if (drop > 0.35) {
      ctx.save(); ctx.globalAlpha = inv(t, 0.4, 0.9)
      TK.drawWrapped(ctx, content.claim || content.tagline || 'Una idea que no se discute', cx, py + ph / 2, { reveal: inv(t, 0.45, 1.05), size: 34, weight: 800, family: fonts.display, maxW: W * 0.82, color: pal.onAccent, maxLines: 4, lh: 1.16 })
      ctx.restore()
    }
  },
})

register({
  id: 'scene.statement.mega', lib: 'scene-layouts', category: 'statements/editorial', tones: ['dark', 'light'], rubros: ['*'], weight: 1.05,
  tags: ['claim', 'mega-tipografia', 'masivo', 'impacto'], beat: 'value',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, ax = W * 0.09
    // mega-tipografia: claim a maxima escala posible, izquierda, reveal por linea (stagger).
    const src = content.claim || content.tagline || content.brand || 'Hacelo simple'
    // calculamos wrap a un tamano grande y dibujamos linea por linea con stagger
    const lines = wrapLinesLocal(ctx, src, 64, W - 2 * ax, 30, 800, fonts.display, 4)
    const lineH = lines.size * 1.04, blockH = lines.lines.length * lineH, y0 = H * 0.5 - blockH / 2 + lines.size / 2
    lines.lines.forEach((ln, i) => {
      const tin = inv(t, 0.12 + i * 0.14, 0.6 + i * 0.14); if (tin <= 0) return
      const e = M.ease(tin)
      ctx.save(); ctx.globalAlpha = tin; ctx.translate((1 - e) * -26, 0)
      ctx.font = `800 ${lines.size}px "${fonts.display}"`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = pal.ink
      if (pal.tone === 'dark') { ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 6 }
      ctx.fillText(ln, ax, y0 + i * lineH)
      ctx.restore()
    })
    // ultima palabra/regla en acento bajo el bloque
    const ru = M.ease(inv(t, 0.6, 1.2))
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(ax, y0 + blockH - lineH / 2 + 26, 92 * ru, 6, 3); ctx.fill()
  },
})

// ---- closers/outro (mas) ---------------------------------------------------

register({
  id: 'scene.outro.bigtype', lib: 'scene-layouts', category: 'closers/outro', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['cierre', 'mega-tipografia', 'marca'], beat: 'close',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2
    // marca a maxima escala (1-2 lineas), centrada, con asentamiento spring + regla acento
    const sp = M.settle(inv(t, 0.1, 1.0), { zeta: 0.5, freq: 2.0 }), sc = 0.86 + 0.14 * sp
    ctx.save(); ctx.globalAlpha = inv(t, 0.05, 0.45); ctx.translate(cx, H * 0.42); ctx.scale(sc, sc); ctx.translate(-cx, -H * 0.42)
    drawWrapped(ctx, content.brand || 'Marca', cx, H * 0.42, { size: 72, weight: 800, family: fonts.display, maxW: W * 0.88, color: pal.ink, maxLines: 2, lh: 1.0, shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.45)' : null })
    ctx.restore()
    // regla ancha de acento
    const ru = M.ease(inv(t, 0.5, 1.1))
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(cx - 70 * ru, H * 0.55, 140 * ru, 6, 3); ctx.fill()
    // cta o tagline debajo, en mono-acento
    const sub = content.cta || content.tagline
    if (sub) drawText(ctx, sub, cx, H * 0.62, { size: 22, weight: 700, family: fonts.text, maxW: W * 0.82, color: pal.inkText, alpha: inv(t, 0.75, 1.25) })
  },
})

register({
  id: 'scene.outro.diagonal', lib: 'scene-layouts', category: 'closers/outro', tones: ['dark', 'light'], rubros: ['*'], weight: 0.9,
  tags: ['cierre', 'diagonal', 'dinamico', 'cta'], beat: 'close',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2, cy = H * 0.42
    // banda diagonal de acento que barre la pantalla (DECO) — energia de cierre
    const sw = M.ease(inv(t, 0.05, 0.8))
    ctx.save(); ctx.globalAlpha = (pal.tone === 'light' ? 0.16 : 0.22) * inv(t, 0.0, 0.4)
    ctx.translate(cx, cy); ctx.rotate(-0.18)
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.rect(-W * 0.7, -42, W * 1.4 * sw, 84); ctx.fill()
    ctx.restore()
    // marca centrada en tinta
    drawText(ctx, content.brand || 'Marca', cx, cy, { size: 50, weight: 800, family: fonts.display, maxW: W * 0.84, color: pal.ink, alpha: inv(t, 0.2, 0.75), shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.4)' : null })
    // pildora CTA en acento que entra desde abajo en diagonal
    const cta = content.cta || 'Escribinos hoy'
    const gp = M.settle(inv(t, 0.5, 1.2), { zeta: 0.5, freq: 2 })
    ctx.save(); ctx.font = `800 24px "${fonts.display}"`
    const tw = Math.min(W * 0.7, ctx.measureText(cta).width), pw = tw + 50, ph = 52, py = cy + 96
    ctx.translate(cx, py + ph / 2); ctx.scale(0.85 + 0.15 * gp, 0.85 + 0.15 * gp); ctx.globalAlpha = inv(t, 0.5, 0.95)
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(-pw / 2, -ph / 2, pw, ph, ph / 2); ctx.fill()
    drawText(ctx, cta, 0, 1, { size: 24, weight: 800, family: fonts.display, maxW: pw - 34, color: pal.onAccent })
    ctx.restore()
  },
})

// ---- lists/comparison (mas) ------------------------------------------------

register({
  id: 'scene.comparison.split', lib: 'scene-layouts', category: 'lists/comparison', tones: ['dark', 'light'], rubros: ['*'], weight: 0.95,
  tags: ['comparacion', 'split', 'mitad-mitad', 'antes-despues'], beat: 'value',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK
    const parts = splitItems(content.claim || content.tagline || 'Lento y caro · Rapido y simple', 2)
    const left = parts[0] || 'Antes', right = parts[1] || 'Ahora'
    // mitad superior (problema, dim) baja desde arriba; mitad inferior (solucion, acento) sube
    const topY = H * 0.18, botY = H * 0.52, halfH = H * 0.34
    const dT = M.ease(inv(t, 0.1, 0.75)), dB = M.ease(inv(t, 0.25, 0.9))
    // panel superior: surface tenue
    ctx.save(); ctx.globalAlpha = dT
    ctx.fillStyle = pal.tone === 'light' ? 'rgba(20,16,24,0.04)' : 'rgba(255,255,255,0.04)'
    ctx.beginPath(); ctx.rect(0, topY, W, halfH); ctx.fill(); ctx.restore()
    ctx.save(); ctx.globalAlpha = dT; ctx.translate(0, (1 - dT) * -20)
    drawText(ctx, 'ANTES', W * 0.12, topY + 30, { size: 14, weight: 700, family: fonts.accent || fonts.text, color: pal.dim, align: 'left', maxW: W * 0.7 })
    drawWrapped(ctx, left, W / 2, topY + halfH / 2 + 8, { size: 27, weight: 700, family: fonts.display, maxW: W * 0.78, color: pal.dim, maxLines: 3, lh: 1.16 })
    ctx.restore()
    // panel inferior: banda de acento
    ctx.save(); ctx.globalAlpha = dB; ctx.translate(0, (1 - dB) * 20)
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.rect(0, botY, W, halfH); ctx.fill()
    drawText(ctx, 'AHORA', W * 0.12, botY + 30, { size: 14, weight: 700, family: fonts.accent || fonts.text, color: pal.onAccent, align: 'left', maxW: W * 0.7 })
    drawWrapped(ctx, right, W / 2, botY + halfH / 2 + 8, { size: 30, weight: 800, family: fonts.display, maxW: W * 0.8, color: pal.onAccent, maxLines: 3, lh: 1.16 })
    ctx.restore()
    // flecha que cruza el limite (DECO en acento sobre el panel claro de arriba)
    const ap = M.settle(inv(t, 0.55, 1.2), { zeta: 0.5, freq: 2 })
    ctx.save(); ctx.translate(W / 2, botY); ctx.scale(ap, ap)
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.arc(0, 0, 22, 0, TAU); ctx.fill()
    ctx.strokeStyle = pal.onAccent; ctx.lineWidth = 3.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(0, 8); ctx.moveTo(-7, 1); ctx.lineTo(0, 9); ctx.lineTo(7, 1); ctx.stroke()
    ctx.restore()
  },
})

// ---- data/single (mas) -----------------------------------------------------

register({
  id: 'scene.data.bar', lib: 'scene-layouts', category: 'data/single', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['dato', 'barra', 'progreso', 'kpi'], beat: 'data',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2
    const num = statAt(content, 0, '80%').value
    // numero grande arriba
    const sp = M.settle(inv(t, 0.15, 0.95), { zeta: 0.5, freq: 2 })
    ctx.save(); ctx.globalAlpha = inv(t, 0.05, 0.4); ctx.translate(cx, H * 0.38); ctx.scale(0.85 + 0.15 * sp, 0.85 + 0.15 * sp)
    drawText(ctx, num, 0, 0, { size: 96, weight: 800, family: fonts.display, maxW: W * 0.9, color: pal.ink, shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.45)' : null })
    ctx.restore()
    // barra de progreso horizontal que se llena segun el % del numero (o un default)
    const pct = (() => { const m = num.match(/(\d[\d.,]*)/); let v = m ? parseFloat(m[1].replace(/,/g, '')) : 75; if (num.indexOf('%') < 0) v = clamp(v, 0, 100); return clamp(v / 100, 0.08, 1) })()
    const fill = M.ease(inv(t, 0.3, 1.2)) * pct
    const bw = W * 0.76, bx = (W - bw) / 2, by = H * 0.52, bh = 18
    ctx.save()
    ctx.fillStyle = rgba(pal.ink, 0.12); ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, bh / 2); ctx.fill()
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(bx, by, bw * fill, bh, bh / 2); ctx.fill()
    ctx.restore()
    // etiqueta debajo
    drawWrapped(ctx, content.tagline || content.brand || 'resultado medido', cx, H * 0.62, { size: 22, weight: 700, family: fonts.text, maxW: W * 0.78, color: pal.dim, maxLines: 2, alpha: inv(t, 0.6, 1.1) })
  },
})

// helper local OLA2: easing exponencial out (algunas escenas lo usan sin importarlo de util).
function eOutExpoLocal(t) { return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t) }
// helper local OLA2: wrap a un tamano dado devolviendo {size, lines} para dibujar linea por linea
// con stagger (la primitiva drawWrapped dibuja todo el bloque de una; aca queremos por-linea).
function wrapLinesLocal(ctx, str, base, maxW, min, weight, family, maxLines) {
  str = String(str == null ? '' : str).replace(/\s+/g, ' ').trim()
  const words = str.split(' ')
  const at = s => { ctx.font = `${weight} ${s}px "${family}"`; const ls = []; let cur = ''; for (const w of words) { const tt = cur ? cur + ' ' + w : w; if (ctx.measureText(tt).width <= maxW || !cur) cur = tt; else { ls.push(cur); cur = w } } if (cur) ls.push(cur); return ls }
  for (let s = base; s >= min; s--) { const ls = at(s); if (ls.length <= maxLines) return { size: s, lines: ls } }
  const full = at(min); return { size: min, lines: full.slice(0, maxLines) }
}

// ============================================================================
// EXPANSION (ronda fill · OLA 3) — composiciones EDITORIALES y ASIMETRICAS.
// Mas variantes de hero/hook/statement/checklist/comparison/data/social/outro/
// interstitial, con layouts distintos a las olas previas: rotulos verticales,
// esquina-a-esquina, numeros gigantes recortados, grilla de revista, marginalia.
// Mantienen el contrato: texto en tinta, acento solo DECO; PURO + DETERMINISTA
// (mulberry32(seed); t solo motion) + PARAMETRIZADO; tone-aware honesto.
// ============================================================================

// helper local OLA3: chevron/flecha derecha (DECO) en (x,y), tamano s, progreso de trazo p.
function chevron(ctx, x, y, s, color, lw = 4, p = 1) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  const top = { x: x - s * 0.4, y: y - s * 0.5 }, mid = { x: x + s * 0.45, y }, bot = { x: x - s * 0.4, y: y + s * 0.5 }
  ctx.beginPath(); ctx.moveTo(top.x, top.y)
  const q = clamp(p, 0, 1)
  if (q < 0.5) { const k = q / 0.5; ctx.lineTo(lerp(top.x, mid.x, k), lerp(top.y, mid.y, k)) }
  else { ctx.lineTo(mid.x, mid.y); const k = (q - 0.5) / 0.5; ctx.lineTo(lerp(mid.x, bot.x, k), lerp(mid.y, bot.y, k)) }
  ctx.stroke(); ctx.restore()
}
// helper local OLA3: rotulo vertical (texto girado 90°) en (x,y) hacia arriba — para etiquetas de margen editorial.
function vLabel(ctx, str, x, y, opts = {}) {
  const { size = 14, weight = 700, family = 'Inter', color = '#fff', maxW = 260, alpha = 1, up = true } = opts
  ctx.save(); ctx.translate(x, y); ctx.rotate(up ? -Math.PI / 2 : Math.PI / 2)
  drawText(ctx, String(str), 0, 0, { size, weight, family, color, maxW, align: 'left', alpha })
  ctx.restore()
}

// ---- openers/hero (mas · OLA3) ---------------------------------------------

// hero asimetrico: rotulo vertical de marca pegado al margen izquierdo + claim grande
// a la derecha, anclado abajo. Composicion editorial tipo tapa de revista.
register({
  id: 'scene.hero.sidebar', lib: 'scene-layouts', category: 'openers/hero', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['apertura', 'editorial', 'asimetrico', 'rotulo-vertical'], beat: 'hook',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, mx = W * 0.13
    // regla vertical de acento en el margen + rotulo de marca girado
    const vu = M.ease(inv(t, 0.05, 0.7))
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(mx - 18, H * 0.28, 5, (H * 0.4) * vu, 2.5); ctx.fill()
    vLabel(ctx, (content.brand || 'Marca').toUpperCase(), mx - 26, H * 0.68, { size: 16, weight: 800, family: fonts.accent || fonts.text, color: pal.inkText, maxW: H * 0.36, alpha: inv(t, 0.2, 0.6) })
    // claim grande, izquierda, anclado abajo (sube y se asienta)
    const rise = M.settle(inv(t, 0.2, 1.0), 1.2)
    ctx.save(); ctx.globalAlpha = inv(t, 0.2, 0.7); ctx.translate(0, (1 - rise) * 36)
    drawWrapped(ctx, content.claim || content.tagline || content.brand || 'Una idea con peso', mx, H * 0.56, { size: 52, weight: 800, family: fonts.display, maxW: W * 0.8, color: pal.ink, align: 'left', maxLines: 3, lh: 1.06, shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.45)' : null })
    ctx.restore()
    // tagline chico bajo el claim
    if (content.tagline && content.claim) drawWrapped(ctx, content.tagline, mx, H * 0.74, { size: 18, weight: 600, family: fonts.text, maxW: W * 0.74, color: pal.dim, align: 'left', maxLines: 2, alpha: inv(t, 0.7, 1.2) })
  },
})

// hero "punch": marca chica arriba-izquierda + claim gigante de 1-2 lineas anclado
// con un bloque de acento detras de la primera linea (highlight tipo marcador).
register({
  id: 'scene.hero.punch', lib: 'scene-layouts', category: 'openers/hero', tones: ['dark', 'light'], rubros: ['*'], weight: 1.05,
  tags: ['apertura', 'highlight', 'masivo', 'editorial'], beat: 'hook',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, mx = W * 0.1
    drawText(ctx, (content.brand || 'Marca').toUpperCase(), mx, H * 0.26, { size: 17, weight: 700, family: fonts.accent || fonts.text, color: pal.inkText, align: 'left', maxW: W * 0.8, alpha: inv(t, 0.05, 0.4) })
    const src = content.claim || content.tagline || content.brand || 'Mas claro imposible'
    const L = wrapLinesLocal(ctx, src, 56, W - 2 * mx, 30, 800, fonts.display, 3)
    const lineH = L.size * 1.06, y0 = H * 0.42
    // highlight de acento detras de la 1ra linea (crece de izq a der)
    ctx.font = `800 ${L.size}px "${fonts.display}"`
    const w0 = Math.min(W - 2 * mx, ctx.measureText(L.lines[0] || '').width)
    const hl = M.ease(inv(t, 0.25, 0.95))
    ctx.save(); ctx.globalAlpha = (pal.tone === 'light' ? 0.18 : 0.26) * inv(t, 0.2, 0.5)
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(mx - 6, y0 - L.size * 0.62, (w0 + 12) * hl, L.size * 1.12, 6); ctx.fill(); ctx.restore()
    // lineas en tinta con stagger
    L.lines.forEach((ln, i) => {
      const tin = inv(t, 0.2 + i * 0.14, 0.7 + i * 0.14); if (tin <= 0) return
      ctx.save(); ctx.globalAlpha = tin; ctx.translate((1 - M.ease(tin)) * -22, 0)
      ctx.font = `800 ${L.size}px "${fonts.display}"`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = pal.ink
      if (pal.tone === 'dark') { ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 5 }
      ctx.fillText(ln, mx, y0 + i * lineH)
      ctx.restore()
    })
  },
})

// ---- openers/hook (mas · OLA3) ---------------------------------------------

// hook "tachado": una palabra/idea negada (tachada en acento) seguida de la idea buena.
// Editorial, alto contraste conceptual. Lee 2 items del claim ("no esto · si aquello").
register({
  id: 'scene.hook.strike', lib: 'scene-layouts', category: 'openers/hook', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['hook', 'tachado', 'contraste', 'gancho'], beat: 'hook',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, mx = W * 0.12
    const parts = splitItems(content.claim || content.tagline || 'No mas planillas · Solo resultados', 2)
    const bad = parts[0] || 'No mas vueltas', good = parts[1] || 'Solo resultados'
    // idea negada arriba, en dim, con tachado de acento que se traza
    const ba = inv(t, 0.1, 0.55)
    ctx.save(); ctx.globalAlpha = ba
    drawWrapped(ctx, bad, mx, H * 0.36, { size: 30, weight: 700, family: fonts.display, maxW: W * 0.76, color: pal.dim, align: 'left', maxLines: 2, lh: 1.12 })
    ctx.restore()
    ctx.font = `700 30px "${fonts.display}"`
    const bw = Math.min(W * 0.76, ctx.measureText(bad).width)
    const st = M.ease(inv(t, 0.3, 0.8))
    ctx.save(); ctx.strokeStyle = pal.accent; ctx.lineWidth = 4; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(mx, H * 0.36); ctx.lineTo(mx + bw * st, H * 0.36); ctx.stroke(); ctx.restore()
    // idea buena abajo, en tinta, fuerte, sube
    const ga = inv(t, 0.55, 1.05), rise = M.settle(ga, 1.2)
    ctx.save(); ctx.globalAlpha = ga; ctx.translate(0, (1 - rise) * 26)
    drawWrapped(ctx, good, mx, H * 0.56, { size: 42, weight: 800, family: fonts.display, maxW: W * 0.8, color: pal.ink, align: 'left', maxLines: 3, lh: 1.08, shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.45)' : null })
    ctx.restore()
    // chevron de acento que apunta a la idea buena
    chevron(ctx, mx + 12, H * 0.47, 16, pal.accent, 4.5, M.ease(inv(t, 0.5, 0.95)))
  },
})

// hook "marginalia": numero/dato gigante recortado al margen derecho + pregunta a la
// izquierda. Composicion de tapa: la cifra invade el borde, el texto la confronta.
register({
  id: 'scene.hook.marginnum', lib: 'scene-layouts', category: 'openers/hook', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['hook', 'dato', 'recorte', 'asimetrico'], beat: 'hook',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, mx = W * 0.1
    const num = statAt(content, 0, '9/10').value
    // numero gigante anclado al margen derecho, dominante arriba (recorte editorial)
    const grow = eOutExpoLocal(inv(t, 0.05, 0.85))
    ctx.save(); ctx.globalAlpha = inv(t, 0.0, 0.4); ctx.translate(W * 0.96, H * 0.38); ctx.scale(0.7 + 0.3 * grow, 0.7 + 0.3 * grow)
    drawText(ctx, num, 0, 0, { size: 140, weight: 800, family: fonts.display, maxW: W * 1.04, color: pal.inkText, align: 'right', shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.5)' : null })
    ctx.restore()
    // barra vertical de acento separando la cifra del texto
    const vu = M.ease(inv(t, 0.3, 0.9))
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(mx - 4, H * 0.5, 5, (H * 0.22) * vu, 2.5); ctx.fill()
    // texto/pregunta abajo-izquierda, confronta la cifra
    drawWrapped(ctx, content.tagline || content.claim || 'el resto se queda atras', mx + 12, H * 0.62, { size: 27, weight: 700, family: fonts.display, maxW: W * 0.66, color: pal.ink, align: 'left', maxLines: 3, lh: 1.16, alpha: inv(t, 0.5, 1.0) })
  },
})

// ---- statements/editorial (mas · OLA3) -------------------------------------

// statement "index": el claim como bloque, con un indice de seccion (numero romano/00)
// arriba en acento y una regla larga que cruza. Aire editorial, mucho margen.
register({
  id: 'scene.statement.index', lib: 'scene-layouts', category: 'statements/editorial', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['claim', 'editorial', 'indice', 'aire'], beat: 'value',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, mx = W * 0.12
    // indice de seccion estable por seed (00..04) en acento, arriba-izquierda
    const r = mulberry32((env.seed >>> 0) ^ 0x9e1)
    const idx = '0' + ((r() * 5) | 0)
    drawText(ctx, idx, mx, H * 0.24, { size: 30, weight: 800, family: fonts.display, color: pal.inkText, align: 'left', maxW: W * 0.3, alpha: inv(t, 0.05, 0.4) })
    // regla larga horizontal que cruza desde el indice hasta el margen derecho
    const ru = M.ease(inv(t, 0.15, 0.85))
    ctx.save(); ctx.strokeStyle = rgba(pal.ink, 0.22); ctx.lineWidth = 1.4
    ctx.beginPath(); ctx.moveTo(mx + 56, H * 0.24); ctx.lineTo(mx + 56 + (W * 0.88 - mx - 56) * ru, H * 0.24); ctx.stroke(); ctx.restore()
    // tic de acento al final de la regla
    if (ru > 0.9) { ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.arc(W * 0.88, H * 0.24, 4, 0, TAU); ctx.fill() }
    // claim grande, izquierda, mucho aire arriba
    ctx.save(); ctx.globalAlpha = inv(t, 0.25, 0.75); ctx.translate((1 - M.ease(inv(t, 0.25, 0.9))) * 20, 0)
    drawWrapped(ctx, content.claim || content.tagline || 'La claridad gana', mx, H * 0.52, { size: 40, weight: 800, family: fonts.display, maxW: W * 0.78, color: pal.ink, align: 'left', maxLines: 4, lh: 1.18 })
    ctx.restore()
    // firma de marca abajo
    if (content.brand) drawText(ctx, (content.brand || '').toUpperCase(), mx, H * 0.78, { size: 15, weight: 700, family: fonts.accent || fonts.text, color: pal.dim, align: 'left', maxW: W * 0.7, alpha: inv(t, 0.7, 1.2) })
  },
})

// ---- lists/checklist (mas · OLA3) ------------------------------------------

// checklist "cols": dos columnas de items con marca de acento; reparte 4 items en 2x2.
// Layout de grilla, distinto a la lista vertical clasica. Cada item entra por su celda.
register({
  id: 'scene.checklist.grid', lib: 'scene-layouts', category: 'lists/checklist', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['lista', 'grilla', 'beneficios', 'dos-columnas'], beat: 'value',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, mx = W * 0.1
    const items = listFrom(content, 'Rapido · Seguro · Simple · Sin limites', 4)
    if (content.brand) drawText(ctx, (content.brand || '').toUpperCase(), mx, H * 0.22, { size: 16, weight: 700, family: fonts.accent || fonts.text, color: pal.inkText, align: 'left', maxW: W * 0.78, alpha: inv(t, 0.05, 0.35) })
    const cols = 2, colW = (W - 2 * mx) / cols, rowH = 96, y0 = H * 0.34
    items.forEach((it, i) => {
      const tin = inv(t, 0.2 + i * 0.14, 0.7 + i * 0.14); if (tin <= 0) return
      const r = Math.floor(i / cols), c = i % cols
      const x = mx + c * colW, y = y0 + r * rowH
      const sp = M.settle(tin, { zeta: 0.5, freq: 2 })
      // marca: pildora de acento con tilde
      ctx.save(); ctx.globalAlpha = tin; ctx.translate(x + 14, y); ctx.scale(0.8 + 0.2 * sp, 0.8 + 0.2 * sp)
      ctx.fillStyle = rgba(pal.accent, pal.tone === 'light' ? 0.16 : 0.24); ctx.beginPath(); ctx.arc(0, 0, 15, 0, TAU); ctx.fill()
      tick(ctx, 0, 0, 15, M.ease(tin), pal.inkText, 3)
      ctx.restore()
      // texto del item (envuelto a 2 lineas dentro de su columna)
      ctx.save(); ctx.globalAlpha = tin; ctx.translate((1 - M.ease(tin)) * 12, 0)
      drawWrapped(ctx, it, x + 38, y, { size: 21, weight: 700, family: fonts.text, maxW: colW - 52, color: pal.ink, align: 'left', maxLines: 2, lh: 1.1 })
      ctx.restore()
    })
  },
})

// ---- lists/comparison (mas · OLA3) -----------------------------------------

// comparison "scale": balanza conceptual — item bueno pesa mas (cae), item viejo sube.
// Dos platos unidos por un fiel; el plato del lado bueno baja con spring. DECO en acento.
register({
  id: 'scene.comparison.scale', lib: 'scene-layouts', category: 'lists/comparison', tones: ['dark', 'light'], rubros: ['*'], weight: 0.9,
  tags: ['comparacion', 'balanza', 'peso', 'editorial'], beat: 'value',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2
    const parts = splitItems(content.claim || content.tagline || 'Lo de siempre · Lo nuevo', 2)
    const left = parts[0] || 'Antes', right = parts[1] || 'Ahora'
    const pivX = cx, pivY = H * 0.34
    // inclinacion: el plato derecho baja (gana peso)
    const tilt = lerp(0, 0.16, M.ease(inv(t, 0.25, 1.0))) * (M.settle(inv(t, 0.3, 1.1), { zeta: 0.4, freq: 2.2 }))
    // poste central
    ctx.save(); ctx.strokeStyle = rgba(pal.ink, 0.3); ctx.lineWidth = 3; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(pivX, pivY); ctx.lineTo(pivX, H * 0.7); ctx.stroke(); ctx.restore()
    // brazo (rota desde el pivote)
    const armW = W * 0.34
    ctx.save(); ctx.translate(pivX, pivY); ctx.rotate(tilt); ctx.globalAlpha = inv(t, 0.1, 0.5)
    ctx.strokeStyle = pal.accent; ctx.lineWidth = 4; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(-armW, 0); ctx.lineTo(armW, 0); ctx.stroke()
    // platos (bandejas) colgando de cada punta: cuelgan rectos hacia abajo del brazo
    const tray = (px, full) => {
      ctx.save(); ctx.translate(px, 0); ctx.rotate(-tilt)   // la bandeja cuelga vertical (compensa la inclinacion)
      ctx.strokeStyle = rgba(pal.ink, 0.3); ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 22); ctx.stroke()
      ctx.lineWidth = full ? 4 : 2.5; ctx.strokeStyle = full ? pal.accent : rgba(pal.ink, 0.32)
      ctx.beginPath(); ctx.arc(0, 30, 18, 0.12 * Math.PI, 0.88 * Math.PI); ctx.stroke()
      ctx.restore()
    }
    tray(-armW, false); tray(armW, true)
    ctx.restore()
    // fulcro
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.moveTo(pivX - 12, pivY); ctx.lineTo(pivX + 12, pivY); ctx.lineTo(pivX, pivY - 16); ctx.closePath(); ctx.fill()
    // etiquetas bajo cada bandeja: izquierda (dim, opcion vieja) y derecha (tinta, la que pesa)
    const ly = pivY - Math.sin(tilt) * armW + 78, ry = pivY + Math.sin(tilt) * armW + 78
    ctx.save(); ctx.globalAlpha = inv(t, 0.45, 0.95)
    drawWrapped(ctx, left, pivX - armW, ly, { size: 19, weight: 700, family: fonts.display, maxW: W * 0.38, color: pal.dim, maxLines: 2, lh: 1.12 })
    drawWrapped(ctx, right, pivX + armW, ry, { size: 22, weight: 800, family: fonts.display, maxW: W * 0.38, color: pal.ink, maxLines: 2, lh: 1.12 })
    ctx.restore()
    // caption inferior con la marca
    if (content.brand) drawText(ctx, (content.brand || '').toUpperCase(), cx, H * 0.78, { size: 15, weight: 700, family: fonts.accent || fonts.text, color: pal.inkText, maxW: W * 0.8, alpha: inv(t, 0.7, 1.2) })
  },
})

// ---- data/single (mas · OLA3) ----------------------------------------------

// data "dial": semicirculo (gauge) que se llena segun el % del numero. Editorial,
// distinto al anillo completo y a la barra. Numero centrado bajo el arco.
register({
  id: 'scene.data.dial', lib: 'scene-layouts', category: 'data/single', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['dato', 'gauge', 'semicirculo', 'kpi'], beat: 'data',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2, cy = H * 0.5
    const num = statAt(content, 0, '85%').value
    const pct = (() => { const m = num.match(/(\d[\d.,]*)/); let v = m ? parseFloat(m[1].replace(/,/g, '')) : 75; if (num.indexOf('%') < 0) v = clamp(v, 0, 100); return clamp(v / 100, 0.06, 1) })()
    const R = 130, lw = 16
    // track del semicirculo (180°, de izq a der por arriba)
    ctx.save(); ctx.lineCap = 'round'
    ctx.strokeStyle = rgba(pal.ink, 0.12); ctx.lineWidth = lw
    ctx.beginPath(); ctx.arc(cx, cy, R, Math.PI, TAU); ctx.stroke()
    // relleno de acento segun pct
    const fill = M.ease(inv(t, 0.25, 1.2)) * pct
    ctx.strokeStyle = pal.accent; ctx.lineWidth = lw
    ctx.beginPath(); ctx.arc(cx, cy, R, Math.PI, Math.PI + Math.PI * fill); ctx.stroke()
    ctx.restore()
    // aguja chica al final del relleno (DECO)
    const ang = Math.PI + Math.PI * fill
    ctx.save(); ctx.fillStyle = pal.inkText
    ctx.beginPath(); ctx.arc(cx + Math.cos(ang) * R, cy + Math.sin(ang) * R, 7, 0, TAU); ctx.fill(); ctx.restore()
    // numero grande dentro del arco
    const sp = M.settle(inv(t, 0.3, 1.0), { zeta: 0.5, freq: 2 })
    ctx.save(); ctx.translate(cx, cy - 22); ctx.scale(0.85 + 0.15 * sp, 0.85 + 0.15 * sp)
    drawText(ctx, num, 0, 0, { size: 72, weight: 800, family: fonts.display, maxW: R * 1.7, color: pal.ink, alpha: inv(t, 0.2, 0.7) })
    ctx.restore()
    // etiqueta debajo del arco
    drawWrapped(ctx, content.tagline || content.brand || 'completado', cx, cy + 50, { size: 21, weight: 700, family: fonts.text, maxW: W * 0.74, color: pal.dim, maxLines: 2, alpha: inv(t, 0.6, 1.1) })
  },
})

// ---- data/multi (mas · OLA3) -----------------------------------------------

// data "bars": mini grafico de barras verticales (3) con etiquetas; alturas estables
// por seed, la "ganadora" en acento. Editorial dashboard, distinto a data.multi (cifras).
register({
  id: 'scene.data.bars', lib: 'scene-layouts', category: 'data/multi', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['datos', 'barras', 'grafico', 'comparativa'], beat: 'data',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK
    const labels = splitItems(content.claim || content.tagline || 'Lun · Mar · Mie', 3).map(l => shortLabel(l, 2))
    const n = Math.min(3, Math.max(2, labels.length || 3))
    const r = mulberry32((env.seed >>> 0) ^ 0x6a7)
    // alturas relativas estables; la ultima (o la mayor) es la ganadora -> acento
    const hs = []; for (let i = 0; i < n; i++) hs.push(0.45 + 0.5 * r())
    const win = hs.indexOf(Math.max(...hs))
    if (content.brand) drawText(ctx, (content.brand || '').toUpperCase(), W * 0.5, H * 0.22, { size: 16, weight: 700, family: fonts.accent || fonts.text, color: pal.inkText, maxW: W * 0.8, alpha: inv(t, 0.05, 0.35) })
    const baseY = H * 0.66, maxH = H * 0.32, gw = W * 0.7, gx = (W - gw) / 2, slot = gw / n, bw = slot * 0.5
    // linea base
    const bu = M.ease(inv(t, 0.1, 0.7))
    ctx.save(); ctx.strokeStyle = rgba(pal.ink, 0.2); ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(gx, baseY); ctx.lineTo(gx + gw * bu, baseY); ctx.stroke(); ctx.restore()
    for (let i = 0; i < n; i++) {
      const tin = inv(t, 0.25 + i * 0.15, 0.85 + i * 0.15); if (tin <= 0) continue
      const grow = M.settle(tin, 1.1)
      const bx = gx + slot * (i + 0.5) - bw / 2, bh = maxH * hs[i] * clamp(grow, 0, 1)
      ctx.save(); ctx.globalAlpha = tin
      ctx.fillStyle = i === win ? pal.accent : rgba(pal.ink, 0.18)
      ctx.beginPath(); ctx.roundRect(bx, baseY - bh, bw, bh, 6); ctx.fill(); ctx.restore()
      // etiqueta bajo la barra
      drawText(ctx, labels[i] || '', gx + slot * (i + 0.5), baseY + 22, { size: 16, weight: 700, family: fonts.text, color: i === win ? pal.ink : pal.dim, maxW: slot - 6, alpha: tin })
    }
  },
})

// ---- social/proof (mas · OLA3) ---------------------------------------------

// social "logos": franja de "marcas que confian" — N chips/placeholders con iniciales
// que entran en cascada, sobre una linea. Prueba social tipo wall-of-logos, sin foto.
register({
  id: 'scene.social.logos', lib: 'scene-layouts', category: 'social/proof', tones: ['dark', 'light'], rubros: ['*'], weight: 0.9,
  tags: ['prueba-social', 'logos', 'confianza', 'cascada'], beat: 'proof',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2
    // titular de confianza
    drawWrapped(ctx, content.claim || content.tagline || 'Equipos que ya confian', cx, H * 0.3, { size: 30, weight: 800, family: fonts.display, maxW: W * 0.82, color: pal.ink, maxLines: 2, lh: 1.14, alpha: inv(t, 0.1, 0.6) })
    // N chips con iniciales estables por seed (placeholders de logo). El ancho del chip
    // se deriva de la banda disponible para que SIEMPRE entre dentro del cuadro.
    const r = mulberry32((env.seed >>> 0) ^ 0x10c0)
    const LET = 'ABCDEFGHKLMNPRSTVZ'
    const n = 4, band = W * 0.84, gap = 14, cw = (band - (n - 1) * gap) / n, chH = cw * 0.66, x0 = cx - band / 2, y = H * 0.5
    for (let i = 0; i < n; i++) {
      const tin = inv(t, 0.3 + i * 0.1, 0.8 + i * 0.1); if (tin <= 0) continue
      const sp = M.settle(tin, { zeta: 0.5, freq: 2 })
      const cxch = x0 + i * (cw + gap) + cw / 2
      ctx.save(); ctx.globalAlpha = tin; ctx.translate(cxch, y); ctx.scale(0.8 + 0.2 * sp, 0.8 + 0.2 * sp)
      ctx.fillStyle = rgba(pal.ink, pal.tone === 'light' ? 0.06 : 0.08); ctx.beginPath(); ctx.roundRect(-cw / 2, -chH / 2, cw, chH, 12); ctx.fill()
      const a = LET[(r() * LET.length) | 0], b = LET[(r() * LET.length) | 0]
      drawText(ctx, a + b, 0, 1, { size: 22, weight: 800, family: fonts.display, color: pal.dim, maxW: cw - 14 })
      ctx.restore()
    }
    // regla de acento bajo la franja
    const ru = M.ease(inv(t, 0.6, 1.2))
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(cx - 50 * ru, H * 0.62, 100 * ru, 4, 2); ctx.fill()
    if (content.brand) drawText(ctx, (content.brand || '').toUpperCase(), cx, H * 0.68, { size: 15, weight: 700, family: fonts.accent || fonts.text, color: pal.inkText, maxW: W * 0.7, alpha: inv(t, 0.75, 1.25) })
  },
})

// social "rating": una nota grande (ej 4.9) a la izquierda + estrellas y conteo a la
// derecha. Layout asimetrico de rating, distinto a social.proof (estrellas centradas).
register({
  id: 'scene.social.rating', lib: 'scene-layouts', category: 'social/proof', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['prueba-social', 'rating', 'nota', 'asimetrico'], beat: 'proof',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, mx = W * 0.12
    // nota grande (extrae numero decimal del claim, o 4.9)
    const note = (() => { const m = String(content.claim || content.tagline || '').match(/(\d(?:[.,]\d)?)/); return m ? m[1].replace(',', '.') : '4.9' })()
    const sp = M.settle(inv(t, 0.15, 1.0), { zeta: 0.5, freq: 2 })
    ctx.save(); ctx.globalAlpha = inv(t, 0.05, 0.45); ctx.translate(mx, H * 0.42); ctx.scale(0.85 + 0.15 * sp, 0.85 + 0.15 * sp)
    drawText(ctx, note, 0, 0, { size: 96, weight: 800, family: fonts.display, color: pal.ink, align: 'left', maxW: W * 0.5, shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.45)' : null })
    ctx.restore()
    // "de 5" chico al lado
    drawText(ctx, '/5', mx + W * 0.28, H * 0.46, { size: 26, weight: 700, family: fonts.text, color: pal.dim, align: 'left', maxW: W * 0.2, alpha: inv(t, 0.4, 0.9) })
    // 5 estrellas en fila bajo la nota
    const fillP = M.ease(inv(t, 0.35, 1.1)) * 5, sr = 13, gap = 34
    for (let i = 0; i < 5; i++) { const f = clamp(fillP - i, 0, 1); star(ctx, mx + 13 + i * gap, H * 0.56, sr, f, pal.accent, rgba(pal.ink, 0.14)) }
    // testimonio/conteo a la derecha-abajo
    drawWrapped(ctx, content.tagline || content.brand || 'sobre miles de opiniones reales', mx, H * 0.66, { size: 20, weight: 700, family: fonts.text, maxW: W * 0.74, color: pal.dim, align: 'left', maxLines: 2, alpha: inv(t, 0.55, 1.05) })
  },
})

// ---- closers/outro (mas · OLA3) --------------------------------------------

// outro "split": pantalla partida vertical — bloque de acento a la izquierda con el
// monograma, marca + CTA a la derecha. Cierre editorial asimetrico.
register({
  id: 'scene.outro.split', lib: 'scene-layouts', category: 'closers/outro', tones: ['dark', 'light'], rubros: ['*'], weight: 0.95,
  tags: ['cierre', 'split', 'asimetrico', 'cta'], beat: 'close',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK
    // panel de acento que entra desde la izquierda (ocupa ~38% del ancho)
    const pw = W * 0.38, slide = M.ease(inv(t, 0.05, 0.75))
    ctx.save(); ctx.globalAlpha = inv(t, 0.0, 0.4); ctx.translate((1 - slide) * -pw, 0)
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.rect(0, 0, pw, H); ctx.fill()
    // monograma en onAccent dentro del panel
    const init = (content.brand || 'M').trim().charAt(0).toUpperCase()
    drawText(ctx, init, pw / 2, H * 0.46, { size: 96, weight: 800, family: fonts.display, color: pal.onAccent, maxW: pw - 20, alpha: inv(t, 0.3, 0.8) })
    ctx.restore()
    // lado derecho: marca + cta, alineado a izquierda dentro del area
    const rx = pw + W * 0.07
    drawWrapped(ctx, content.brand || 'Marca', rx, H * 0.4, { size: 38, weight: 800, family: fonts.display, maxW: W - rx - W * 0.06, color: pal.ink, align: 'left', maxLines: 2, lh: 1.04, alpha: inv(t, 0.4, 0.9) })
    // regla de acento
    const ru = M.ease(inv(t, 0.55, 1.1))
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(rx, H * 0.5, 70 * ru, 5, 2.5); ctx.fill()
    const cta = content.cta || content.tagline
    if (cta) {
      drawWrapped(ctx, cta, rx, H * 0.58, { size: 22, weight: 700, family: fonts.text, maxW: W - rx - W * 0.06, color: pal.inkText, align: 'left', maxLines: 2, lh: 1.16, alpha: inv(t, 0.7, 1.2) })
      chevron(ctx, rx + 6, H * 0.66, 13, pal.accent, 4, M.ease(inv(t, 0.9, 1.4)))
    }
  },
})

// ---- connectors/interstitial (mas · OLA3) ----------------------------------

// interstitial "rule": una palabra de bisagra alineada a izquierda con un NUMERO de
// capitulo gigante y una regla larga que la subraya cruzando la pantalla. Editorial.
register({
  id: 'scene.interstitial.rule', lib: 'scene-layouts', category: 'connectors/interstitial', tones: ['dark', 'light'], rubros: ['*'], weight: 0.9,
  tags: ['transicion', 'capitulo', 'regla', 'editorial'], beat: 'context',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, mx = W * 0.1
    const r = mulberry32((env.seed >>> 0) ^ 0x3c4)
    const idx = '0' + (1 + ((r() * 4) | 0))
    const word = firstStrong(content.tagline || content.claim || content.brand, 'AHORA').toUpperCase()
    // numero de capitulo en acento, grande, izquierda
    drawText(ctx, idx, mx, H * 0.38, { size: 64, weight: 800, family: fonts.display, color: pal.inkText, align: 'left', maxW: W * 0.4, alpha: inv(t, 0.05, 0.45) })
    // palabra de bisagra debajo, en tinta, entra desde la izquierda
    const enter = M.ease(inv(t, 0.25, 0.9))
    ctx.save(); ctx.globalAlpha = inv(t, 0.2, 0.65); ctx.translate((1 - enter) * -28, 0)
    drawText(ctx, word, mx, H * 0.5, { size: 48, weight: 800, family: fonts.display, color: pal.ink, align: 'left', maxW: W * 0.8, shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.4)' : null })
    ctx.restore()
    // regla larga de acento que cruza bajo la palabra
    const ru = M.ease(inv(t, 0.45, 1.1))
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(mx, H * 0.57, (W * 0.9 - mx) * ru, 5, 2.5); ctx.fill()
  },
})

// interstitial "arrows": tres chevrones de acento que avanzan en cascada con una
// palabra de transicion centrada. Sensacion de "seguimos" / "siguiente". DECO en acento.
register({
  id: 'scene.interstitial.arrows', lib: 'scene-layouts', category: 'connectors/interstitial', tones: ['dark', 'light'], rubros: ['*'], weight: 0.85,
  tags: ['transicion', 'flechas', 'avance', 'bisagra'], beat: 'context',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2, cy = H * 0.42
    const word = firstStrong(content.tagline || content.claim || content.cta, 'SEGUIMOS').toUpperCase()
    // palabra centrada que entra con spring
    const sp = M.settle(inv(t, 0.15, 1.0), { zeta: 0.5, freq: 2.1 }), sc = 0.82 + 0.18 * sp
    ctx.save(); ctx.globalAlpha = inv(t, 0.1, 0.5); ctx.translate(cx, cy); ctx.scale(sc, sc)
    drawText(ctx, word, 0, 0, { size: 50, weight: 800, family: fonts.display, color: pal.ink, maxW: W * 0.78, shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.4)' : null })
    ctx.restore()
    // tres chevrones bajo la palabra, en cascada (cada uno con su delay)
    const gx = cx - 28, gap = 28, by = cy + 70
    for (let i = 0; i < 3; i++) {
      const tin = inv(t, 0.4 + i * 0.14, 0.9 + i * 0.14); if (tin <= 0) continue
      ctx.save(); ctx.globalAlpha = tin * (0.5 + 0.5 * i / 2)
      chevron(ctx, gx + i * gap, by, 14, pal.accent, 4.5, M.ease(tin))
      ctx.restore()
    }
  },
})

// ============================================================================
// EXPANSION (ronda fill · OLA 5) — layouts NUEVOS no vistos en olas previas:
// kicker con linea de tiempo, capitular (drop-cap), subrayado tipo marcador,
// lista en linea de tiempo, tabla de filas, donut con leyenda, barras apiladas,
// tarjeta de cita con avatar, fila de avatares, sello/stamp, dots de progreso,
// marquesina, cinta de specs. Contrato intacto: texto en tinta via core/text,
// acento SOLO DECO, PURO + DETERMINISTA (mulberry32(seed); t solo motion) +
// tone-aware honesto.
// ============================================================================

// helper local OLA5: dibuja N avatares (placeholders, iniciales estables por seed)
// solapados en fila desde x0; cada uno entra con su delay. Devuelve x final.
function avatarRow(ctx, x0, y, r, n, prng, M, t, pal, fonts, t0 = 0.3, step = 0.1) {
  const LET = 'ABCDEFGHKLMNPRSTVZ'
  const overlap = r * 1.3
  for (let i = 0; i < n; i++) {
    const tin = inv(t, t0 + i * step, t0 + 0.5 + i * step); if (tin <= 0) continue
    const sp = M.settle(tin, { zeta: 0.5, freq: 2 }), cx = x0 + i * overlap
    ctx.save(); ctx.globalAlpha = tin; ctx.translate(cx, y); ctx.scale(0.7 + 0.3 * sp, 0.7 + 0.3 * sp)
    ctx.fillStyle = pal.tone === 'light' ? '#ffffff' : (pal.bg1 || '#181018')
    ctx.beginPath(); ctx.arc(0, 0, r + 3, 0, TAU); ctx.fill()
    ctx.fillStyle = rgba(pal.ink, pal.tone === 'light' ? 0.1 : 0.14); ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill()
    drawText(ctx, LET[(prng() * LET.length) | 0], 0, 1, { size: r * 0.95, weight: 800, family: fonts.display, color: pal.dim, maxW: r * 1.5 })
    ctx.restore()
  }
  return x0 + (n - 1) * overlap + r
}

// ---- openers/hero (mas · OLA5) ---------------------------------------------

// hero "ticker": kicker de marca en pildora de acento arriba-izquierda + claim grande
// izquierda + linea de tiempo con 3 nodos abajo (DECO). Editorial dinamico.
register({
  id: 'scene.hero.ticker', lib: 'scene-layouts', category: 'openers/hero', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['apertura', 'kicker', 'linea-tiempo', 'editorial'], beat: 'hook',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, mx = W * 0.1
    const kp = M.settle(inv(t, 0.05, 0.7), { zeta: 0.5, freq: 2 })
    const label = (content.brand || 'Marca').toUpperCase()
    ctx.save(); ctx.font = `700 14px "${fonts.accent || fonts.text}"`
    const lw = Math.min(W * 0.6, ctx.measureText(label).width), pw = lw + 28
    ctx.globalAlpha = inv(t, 0.05, 0.4); ctx.translate(mx + pw / 2, H * 0.26); ctx.scale(0.85 + 0.15 * kp, 0.85 + 0.15 * kp)
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(-pw / 2, -16, pw, 32, 16); ctx.fill()
    drawText(ctx, label, 0, 1, { size: 14, weight: 700, family: fonts.accent || fonts.text, color: pal.onAccent, maxW: lw })
    ctx.restore()
    const rise = M.settle(inv(t, 0.2, 1.0), 1.2)
    ctx.save(); ctx.globalAlpha = inv(t, 0.2, 0.7); ctx.translate(0, (1 - rise) * 32)
    drawWrapped(ctx, content.claim || content.tagline || content.brand || 'Empeza distinto', mx, H * 0.5, { size: 48, weight: 800, family: fonts.display, maxW: W * 0.8, color: pal.ink, align: 'left', maxLines: 3, lh: 1.08, shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.45)' : null })
    ctx.restore()
    const ty = H * 0.72, x1 = W - mx, lu = M.ease(inv(t, 0.5, 1.15))
    ctx.save(); ctx.strokeStyle = rgba(pal.ink, 0.2); ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(mx, ty); ctx.lineTo(mx + (x1 - mx) * lu, ty); ctx.stroke(); ctx.restore()
    for (let i = 0; i < 3; i++) {
      const nx = mx + (x1 - mx) * (i / 2), np = M.settle(inv(t, 0.7 + i * 0.12, 1.2 + i * 0.12), { zeta: 0.5, freq: 2 })
      if (np <= 0) continue
      ctx.save(); ctx.translate(nx, ty); ctx.scale(np, np)
      ctx.fillStyle = i === 2 ? pal.accent : rgba(pal.ink, 0.4); ctx.beginPath(); ctx.arc(0, 0, i === 2 ? 7 : 5, 0, TAU); ctx.fill(); ctx.restore()
    }
  },
})

// ---- openers/hook (mas · OLA5) ---------------------------------------------

// hook "redacted": frase de contexto + palabra clave revelada (barra de acento que se
// desliza para descubrirla). Gancho de intriga, distinto a strike/marginnum.
register({
  id: 'scene.hook.redacted', lib: 'scene-layouts', category: 'openers/hook', tones: ['dark', 'light'], rubros: ['*'], weight: 0.9,
  tags: ['hook', 'intriga', 'revelado', 'gancho'], beat: 'hook',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2
    ctx.save(); ctx.globalAlpha = inv(t, 0.1, 0.5)
    drawWrapped(ctx, content.tagline || content.claim || 'El secreto no es trabajar mas', cx, H * 0.34, { size: 28, weight: 700, family: fonts.display, maxW: W * 0.82, color: pal.ink, maxLines: 3, lh: 1.16, shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.4)' : null })
    ctx.restore()
    const word = firstStrong(content.claim || content.brand || content.cta, 'SISTEMA').toUpperCase()
    const wa = inv(t, 0.4, 0.85)
    ctx.save(); ctx.globalAlpha = wa
    const fs = drawText(ctx, word, cx, H * 0.54, { size: 54, weight: 800, family: fonts.display, maxW: W * 0.84, color: pal.ink, shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.45)' : null })
    ctx.restore()
    ctx.font = `800 ${fs}px "${fonts.display}"`
    const tw = Math.min(W * 0.84, ctx.measureText(word).width)
    const rev = M.ease(inv(t, 0.45, 1.05))
    if (rev < 1) {
      ctx.save(); ctx.fillStyle = pal.accent
      const coverX = cx - tw / 2 + tw * rev
      ctx.beginPath(); ctx.roundRect(coverX, H * 0.54 - fs * 0.6, tw * (1 - rev), fs * 1.2, 6); ctx.fill(); ctx.restore()
    }
    const ru = M.ease(inv(t, 0.9, 1.4))
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(cx - (tw / 2) * ru, H * 0.62, tw * ru, 4, 2); ctx.fill()
  },
})

// ---- statements/editorial (mas · OLA5) -------------------------------------

// statement "dropcap": capitular gigante (1ra letra) en acento a la izquierda, resto
// del claim envuelto a su derecha. Editorial de revista, distinto a quoted/index.
register({
  id: 'scene.statement.dropcap', lib: 'scene-layouts', category: 'statements/editorial', tones: ['dark', 'light'], rubros: ['*'], weight: 0.95,
  tags: ['claim', 'capitular', 'editorial', 'revista'], beat: 'value',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, mx = W * 0.12
    const src = String(content.claim || content.tagline || 'Lo simple siempre gana al final').trim()
    const cap = (src.charAt(0) || 'L').toUpperCase()
    const rest = src.slice(1).replace(/^\s+/, '')
    const capSize = 132
    const sp = M.settle(inv(t, 0.1, 0.95), { zeta: 0.5, freq: 2 })
    const capX = mx, capY = H * 0.32
    // ancho real de la capitular (para que el cuerpo arranque SIEMPRE despues, sin solape)
    ctx.font = `800 ${capSize}px "${fonts.display}"`
    const capW = ctx.measureText(cap).width
    const bodyX = capX + capW + 16
    ctx.save(); ctx.globalAlpha = inv(t, 0.05, 0.45); ctx.translate(capX + capW / 2, capY + capSize * 0.34); ctx.scale(0.8 + 0.2 * sp, 0.8 + 0.2 * sp)
    drawText(ctx, cap, 0, 0, { size: capSize, weight: 800, family: fonts.display, color: pal.accent, maxW: capW + 4, baseline: 'middle' })
    ctx.restore()
    // cuerpo del claim arrancando a la derecha de la capitular, alineado a la altura de la cap
    ctx.save(); ctx.globalAlpha = inv(t, 0.3, 0.85); ctx.translate((1 - M.ease(inv(t, 0.3, 0.95))) * 18, 0)
    drawWrapped(ctx, rest, bodyX, capY + capSize * 0.32, { size: 30, weight: 700, family: fonts.display, maxW: W - bodyX - W * 0.08, color: pal.ink, align: 'left', maxLines: 5, lh: 1.18 })
    ctx.restore()
    if (content.brand) drawText(ctx, (content.brand || '').toUpperCase(), mx, H * 0.74, { size: 15, weight: 700, family: fonts.accent || fonts.text, color: pal.dim, align: 'left', maxW: W * 0.7, alpha: inv(t, 0.7, 1.2) })
  },
})

// statement "underline": claim centrado con la ULTIMA linea subrayada por una banda de
// acento tipo marcador. Distinto a mega (stagger izq) y panel (banda full).
register({
  id: 'scene.statement.underline', lib: 'scene-layouts', category: 'statements/editorial', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['claim', 'subrayado', 'marcador', 'centrado'], beat: 'value',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2
    const src = content.claim || content.tagline || content.brand || 'Resultados que se notan'
    const L = wrapLinesLocal(ctx, src, 42, W * 0.82, 26, 800, fonts.display, 4)
    const lineH = L.size * 1.16, blockH = (L.lines.length - 1) * lineH, y0 = H * 0.45 - blockH / 2
    L.lines.forEach((ln, i) => {
      const tin = inv(t, 0.15 + i * 0.12, 0.65 + i * 0.12); if (tin <= 0) return
      ctx.save(); ctx.globalAlpha = tin; ctx.translate(0, (1 - M.ease(tin)) * 14)
      ctx.font = `800 ${L.size}px "${fonts.display}"`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = pal.ink
      if (pal.tone === 'dark') { ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 5 }
      ctx.fillText(ln, cx, y0 + i * lineH)
      ctx.restore()
    })
    const last = L.lines[L.lines.length - 1] || ''
    ctx.font = `800 ${L.size}px "${fonts.display}"`
    const lw = Math.min(W * 0.82, ctx.measureText(last).width)
    const hu = M.ease(inv(t, 0.45 + (L.lines.length - 1) * 0.12, 1.1 + (L.lines.length - 1) * 0.12))
    ctx.save(); ctx.globalAlpha = (pal.tone === 'light' ? 0.22 : 0.3)
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(cx - lw / 2 - 4, y0 + (L.lines.length - 1) * lineH + L.size * 0.2, (lw + 8) * hu, L.size * 0.42, 4); ctx.fill(); ctx.restore()
  },
})

// ---- lists/checklist (mas · OLA5) ------------------------------------------

// checklist "timeline": items en linea vertical con nodos numerados de acento y rieles.
// Layout de "pasos en linea de tiempo", distinto a ticks/numbered/grid.
register({
  id: 'scene.checklist.timeline', lib: 'scene-layouts', category: 'lists/checklist', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['lista', 'pasos', 'linea-tiempo', 'proceso'], beat: 'value',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, mx = W * 0.14
    const items = listFrom(content, 'Conecta · Configura · Lanza · Crece', 4)
    if (content.brand) drawText(ctx, (content.brand || '').toUpperCase(), mx, H * 0.22, { size: 16, weight: 700, family: fonts.accent || fonts.text, color: pal.inkText, align: 'left', maxW: W * 0.74, alpha: inv(t, 0.05, 0.35) })
    const y0 = H * 0.34, gap = Math.min(96, (H * 0.5) / Math.max(1, items.length)), railX = mx + 2
    const rail = M.ease(inv(t, 0.2, 1.0))
    if (items.length > 1) {
      ctx.save(); ctx.strokeStyle = rgba(pal.ink, 0.18); ctx.lineWidth = 2.5
      ctx.beginPath(); ctx.moveTo(railX, y0); ctx.lineTo(railX, y0 + (items.length - 1) * gap * rail); ctx.stroke(); ctx.restore()
    }
    items.forEach((it, i) => {
      const tin = inv(t, 0.2 + i * 0.16, 0.72 + i * 0.16); if (tin <= 0) return
      const y = y0 + i * gap, sp = M.settle(tin, { zeta: 0.5, freq: 2 })
      ctx.save(); ctx.globalAlpha = tin; ctx.translate(railX, y); ctx.scale(0.8 + 0.2 * sp, 0.8 + 0.2 * sp)
      ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.arc(0, 0, 16, 0, TAU); ctx.fill()
      drawText(ctx, String(i + 1), 0, 1, { size: 18, weight: 800, family: fonts.display, color: pal.onAccent })
      ctx.restore()
      ctx.save(); ctx.globalAlpha = tin; ctx.translate((1 - M.ease(tin)) * 14, 0)
      drawWrapped(ctx, it, railX + 34, y, { size: 24, weight: 700, family: fonts.text, maxW: W - (railX + 34) - W * 0.08, color: pal.ink, align: 'left', maxLines: 2, lh: 1.1 })
      ctx.restore()
    })
  },
})

// ---- lists/comparison (mas · OLA5) -----------------------------------------

// comparison "table": tabla de filas con dos columnas (otros / nosotros), cruz vs tilde.
// Layout de tabla de features, distinto a vs/split/scale.
register({
  id: 'scene.comparison.table', lib: 'scene-layouts', category: 'lists/comparison', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['comparacion', 'tabla', 'features', 'check-cruz'], beat: 'value',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK
    const rows = listFrom(content, 'Sin comisiones · Soporte 24/7 · Setup en minutos', 3)
    const lx = W * 0.1, c1 = W * 0.66, c2 = W * 0.86, y0 = H * 0.32, gap = Math.min(84, (H * 0.46) / Math.max(1, rows.length))
    drawText(ctx, 'OTROS', c1, H * 0.24, { size: 14, weight: 700, family: fonts.accent || fonts.text, color: pal.dim, maxW: W * 0.18, alpha: inv(t, 0.05, 0.4) })
    drawText(ctx, (content.brand || 'NOSOTROS').toUpperCase(), c2, H * 0.24, { size: 14, weight: 700, family: fonts.accent || fonts.text, color: pal.inkText, maxW: W * 0.22, alpha: inv(t, 0.05, 0.4) })
    rows.forEach((it, i) => {
      const tin = inv(t, 0.2 + i * 0.16, 0.72 + i * 0.16); if (tin <= 0) return
      const y = y0 + i * gap
      ctx.save(); ctx.globalAlpha = tin; ctx.translate((1 - M.ease(tin)) * 12, 0)
      drawWrapped(ctx, shortLabel(it, 4) || it, lx, y, { size: 21, weight: 700, family: fonts.text, maxW: c1 - lx - W * 0.06, color: pal.ink, align: 'left', maxLines: 2, lh: 1.08 })
      ctx.restore()
      const cp = M.ease(tin)
      ctx.save(); ctx.globalAlpha = tin; ctx.strokeStyle = rgba(pal.ink, 0.34); ctx.lineWidth = 3; ctx.lineCap = 'round'
      const cr = 8 * cp
      ctx.beginPath(); ctx.moveTo(c1 - cr, y - cr); ctx.lineTo(c1 + cr, y + cr); ctx.moveTo(c1 + cr, y - cr); ctx.lineTo(c1 - cr, y + cr); ctx.stroke(); ctx.restore()
      ctx.save(); ctx.globalAlpha = tin
      ctx.fillStyle = rgba(pal.accent, pal.tone === 'light' ? 0.16 : 0.24); ctx.beginPath(); ctx.arc(c2, y, 14, 0, TAU); ctx.fill()
      tick(ctx, c2, y, 14, cp, pal.inkText, 3)
      ctx.restore()
      if (i < rows.length - 1) { const dl = M.ease(inv(t, 0.25 + i * 0.16, 0.95 + i * 0.16)); ctx.save(); ctx.strokeStyle = rgba(pal.ink, 0.1); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(lx, y + gap / 2); ctx.lineTo(lx + (W * 0.9 - lx) * dl, y + gap / 2); ctx.stroke(); ctx.restore() }
    })
  },
})

// ---- data/single (mas · OLA5) ----------------------------------------------

// data "donut": anillo grueso (donut) con segmento de acento que se llena + numero en
// el hueco central. Distinto a single (anillo fino) y dial (semicirculo).
register({
  id: 'scene.data.donut', lib: 'scene-layouts', category: 'data/single', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['dato', 'donut', 'porcentaje', 'kpi'], beat: 'data',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2, cy = H * 0.42
    const num = bigNumber(content.claim || content.tagline, '64%')
    const pct = (() => { const m = num.match(/(\d[\d.,]*)/); let v = m ? parseFloat(m[1].replace(/,/g, '')) : 60; if (num.indexOf('%') < 0) v = clamp(v, 0, 100); return clamp(v / 100, 0.05, 1) })()
    const R = 116, lw = 30
    ctx.save(); ctx.lineCap = 'butt'
    ctx.strokeStyle = rgba(pal.ink, 0.1); ctx.lineWidth = lw
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke()
    const fill = M.ease(inv(t, 0.2, 1.2)) * pct
    ctx.strokeStyle = pal.accent; ctx.lineWidth = lw
    ctx.beginPath(); ctx.arc(cx, cy, R, -TAU / 4, -TAU / 4 + TAU * fill); ctx.stroke()
    ctx.restore()
    const sp = M.settle(inv(t, 0.3, 1.0), { zeta: 0.5, freq: 2 })
    ctx.save(); ctx.translate(cx, cy); ctx.scale(0.85 + 0.15 * sp, 0.85 + 0.15 * sp)
    drawText(ctx, num, 0, 0, { size: 64, weight: 800, family: fonts.display, maxW: (R - lw) * 1.7, color: pal.ink, alpha: inv(t, 0.25, 0.7) })
    ctx.restore()
    drawWrapped(ctx, content.tagline || content.brand || 'del total', cx, H * 0.68, { size: 22, weight: 700, family: fonts.text, maxW: W * 0.74, color: pal.dim, maxLines: 2, alpha: inv(t, 0.6, 1.1) })
  },
})

// ---- data/multi (mas · OLA5) -----------------------------------------------

// data "stack": una barra horizontal apilada en N segmentos (proporciones estables por
// seed) + leyenda con porcentajes. Distinto a multi (cifras) y bars (verticales).
register({
  id: 'scene.data.stack', lib: 'scene-layouts', category: 'data/multi', tones: ['dark', 'light'], rubros: ['*'], weight: 0.95,
  tags: ['datos', 'apilado', 'distribucion', 'grafico'], beat: 'data',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK
    const labels = splitItems(content.claim || content.tagline || 'Ventas · Soporte · Marketing', 3).map(l => shortLabel(l, 2))
    const n = Math.min(3, Math.max(2, labels.length || 3))
    const r = mulberry32((env.seed >>> 0) ^ 0x57a)
    const raw = []; for (let i = 0; i < n; i++) raw.push(0.4 + 0.6 * r()); const sum = raw.reduce((a, b) => a + b, 0)
    const props = raw.map(v => v / sum), win = props.indexOf(Math.max(...props))
    if (content.brand) drawText(ctx, (content.brand || '').toUpperCase(), W / 2, H * 0.26, { size: 16, weight: 700, family: fonts.accent || fonts.text, color: pal.inkText, maxW: W * 0.8, alpha: inv(t, 0.05, 0.35) })
    const bw = W * 0.8, bx = (W - bw) / 2, by = H * 0.44, bh = 44, grow = M.ease(inv(t, 0.25, 1.15))
    let cur = bx
    ctx.save()
    for (let i = 0; i < n; i++) {
      const segW = bw * props[i] * grow
      ctx.fillStyle = i === win ? pal.accent : rgba(pal.ink, 0.16 + 0.08 * i)
      const rad = i === 0 ? [bh / 2, 0, 0, bh / 2] : (i === n - 1 ? [0, bh / 2, bh / 2, 0] : 0)
      ctx.beginPath(); ctx.roundRect(cur, by, Math.max(0, segW - (i < n - 1 ? 2 : 0)), bh, rad); ctx.fill()
      cur += bw * props[i] * grow
    }
    ctx.restore()
    const ly = H * 0.6, lgap = Math.min(56, (H * 0.3) / n)
    for (let i = 0; i < n; i++) {
      const tin = inv(t, 0.4 + i * 0.12, 0.9 + i * 0.12); if (tin <= 0) continue
      const y = ly + i * lgap, sx = bx
      ctx.save(); ctx.globalAlpha = tin
      ctx.fillStyle = i === win ? pal.accent : rgba(pal.ink, 0.16 + 0.08 * i)
      ctx.beginPath(); ctx.roundRect(sx, y - 7, 14, 14, 3); ctx.fill(); ctx.restore()
      drawText(ctx, labels[i] || '', sx + 24, y, { size: 18, weight: 700, family: fonts.text, color: i === win ? pal.ink : pal.dim, align: 'left', maxW: W * 0.45, alpha: tin })
      drawText(ctx, Math.round(props[i] * 100) + '%', bx + bw, y, { size: 18, weight: 800, family: fonts.display, color: i === win ? pal.ink : pal.dim, align: 'right', maxW: W * 0.2, alpha: tin })
    }
  },
})

// ---- social/proof (mas · OLA5) ---------------------------------------------

// social "quotecard": tarjeta de testimonio (panel surface) con cita + avatar y nombre.
// Distinto a proof (estrellas), logos (chips), rating (nota).
register({
  id: 'scene.social.quotecard', lib: 'scene-layouts', category: 'social/proof', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['prueba-social', 'testimonio', 'tarjeta', 'avatar'], beat: 'proof',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2
    const gp = M.settle(inv(t, 0.1, 0.9), { zeta: 0.5, freq: 2 })
    const pw = W * 0.8, ph = H * 0.42, px = cx - pw / 2, py = H * 0.28
    ctx.save(); ctx.globalAlpha = inv(t, 0.05, 0.45); ctx.translate(cx, py + ph / 2); ctx.scale(0.9 + 0.1 * gp, 0.9 + 0.1 * gp); ctx.translate(-cx, -(py + ph / 2))
    ctx.fillStyle = pal.tone === 'light' ? 'rgba(20,16,24,0.05)' : 'rgba(255,255,255,0.06)'
    ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 18); ctx.fill()
    drawText(ctx, '“', px + 28, py + 30, { size: 70, weight: 800, family: fonts.display, color: pal.accent, align: 'left', maxW: 80 })
    ctx.restore()
    ctx.save(); ctx.globalAlpha = inv(t, 0.35, 0.85)
    drawWrapped(ctx, content.claim || content.tagline || 'Cambio como trabajamos cada dia', cx, py + ph * 0.42, { size: 24, weight: 700, family: fonts.display, maxW: pw - 56, color: pal.ink, maxLines: 4, lh: 1.2 })
    ctx.restore()
    const r = mulberry32((env.seed >>> 0) ^ 0x9c1)
    const av = M.settle(inv(t, 0.55, 1.15), { zeta: 0.5, freq: 2 })
    if (av > 0) {
      const ay = py + ph - 38, axp = px + 30
      ctx.save(); ctx.globalAlpha = inv(t, 0.55, 1.0); ctx.translate(axp, ay); ctx.scale(0.7 + 0.3 * av, 0.7 + 0.3 * av)
      ctx.fillStyle = rgba(pal.ink, pal.tone === 'light' ? 0.1 : 0.14); ctx.beginPath(); ctx.arc(0, 0, 18, 0, TAU); ctx.fill()
      const LET = 'ABCDEFGHKLMNPRSTVZ'
      drawText(ctx, LET[(r() * LET.length) | 0], 0, 1, { size: 18, weight: 800, family: fonts.display, color: pal.dim, maxW: 26 })
      ctx.restore()
      drawText(ctx, content.brand || 'Cliente feliz', axp + 30, ay, { size: 18, weight: 700, family: fonts.text, color: pal.inkText, align: 'left', maxW: pw - 90, alpha: inv(t, 0.6, 1.05) })
    }
  },
})

// social "avatars": fila de avatares solapados + titular de comunidad + 5 estrellas.
// Prueba social tipo "community", distinta a quotecard/logos/rating.
register({
  id: 'scene.social.avatars', lib: 'scene-layouts', category: 'social/proof', tones: ['dark', 'light'], rubros: ['*'], weight: 0.9,
  tags: ['prueba-social', 'avatares', 'comunidad', 'fila'], beat: 'proof',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2
    const r = mulberry32((env.seed >>> 0) ^ 0xa11)
    const n = 5, rad = 26, overlap = rad * 1.3, rowW = (n - 1) * overlap + rad * 2
    avatarRow(ctx, cx - rowW / 2 + rad, H * 0.36, rad, n, r, M, t, pal, fonts, 0.2, 0.09)
    drawWrapped(ctx, content.claim || content.tagline || 'Miles ya se sumaron esta semana', cx, H * 0.54, { size: 28, weight: 800, family: fonts.display, maxW: W * 0.82, color: pal.ink, maxLines: 2, lh: 1.14, alpha: inv(t, 0.45, 0.95), shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.4)' : null })
    const fillP = M.ease(inv(t, 0.65, 1.25)) * 5, sr = 11, gap = 30, x0 = cx - gap * 2
    for (let i = 0; i < 5; i++) { const f = clamp(fillP - i, 0, 1); star(ctx, x0 + i * gap, H * 0.64, sr, f, pal.accent, rgba(pal.ink, 0.14)) }
    if (content.brand) drawText(ctx, (content.brand || '').toUpperCase(), cx, H * 0.71, { size: 15, weight: 700, family: fonts.accent || fonts.text, color: pal.inkText, maxW: W * 0.7, alpha: inv(t, 0.8, 1.3) })
  },
})

// ---- closers/outro (mas · OLA5) --------------------------------------------

// outro "stamp": marca centrada dentro de un sello circular (anillo doble de acento)
// que entra rotando y se asienta. Cierre tipo "garantia/sello". Distinto a lockup/split.
register({
  id: 'scene.outro.stamp', lib: 'scene-layouts', category: 'closers/outro', tones: ['dark', 'light'], rubros: ['*'], weight: 0.9,
  tags: ['cierre', 'sello', 'garantia', 'marca'], beat: 'close',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2, cy = H * 0.42
    const sp = M.settle(inv(t, 0.1, 1.0), { zeta: 0.45, freq: 2.1 })
    const R = 118, rot = (1 - M.ease(inv(t, 0.1, 0.9))) * -0.12
    ctx.save(); ctx.globalAlpha = inv(t, 0.05, 0.45); ctx.translate(cx, cy); ctx.rotate(rot); ctx.scale(0.8 + 0.2 * sp, 0.8 + 0.2 * sp)
    ctx.strokeStyle = pal.accent; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.stroke()
    ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, R - 12, 0, TAU); ctx.stroke()
    ctx.restore()
    ctx.save(); ctx.translate(cx, cy)
    drawWrapped(ctx, content.brand || 'Marca', 0, -6, { size: 40, weight: 800, family: fonts.display, maxW: R * 1.5, color: pal.ink, maxLines: 2, lh: 1.02, alpha: inv(t, 0.35, 0.85) })
    const sub = content.cta || content.tagline
    if (sub) drawText(ctx, sub, 0, 34, { size: 15, weight: 700, family: fonts.accent || fonts.text, color: pal.inkText, maxW: R * 1.4, alpha: inv(t, 0.6, 1.1) })
    ctx.restore()
    const stp = M.ease(inv(t, 0.6, 1.2))
    if (stp > 0.4) { star(ctx, cx - R - 4, cy, 9, 1, pal.accent, rgba(pal.ink, 0.1)); star(ctx, cx + R + 4, cy, 9, 1, pal.accent, rgba(pal.ink, 0.1)) }
  },
})

// ---- connectors/interstitial (mas · OLA5) ----------------------------------

// interstitial "dots": palabra de bisagra centrada + fila de dots de progreso (uno de
// acento "activo", alargado). Sensacion de "paso N". Distinto a word/sweep/count/rule/arrows.
register({
  id: 'scene.interstitial.dots', lib: 'scene-layouts', category: 'connectors/interstitial', tones: ['dark', 'light'], rubros: ['*'], weight: 0.85,
  tags: ['transicion', 'progreso', 'dots', 'bisagra'], beat: 'context',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2, cy = H * 0.42
    const word = firstStrong(content.tagline || content.claim || content.brand, 'AHORA').toUpperCase()
    const sp = M.settle(inv(t, 0.15, 1.0), { zeta: 0.5, freq: 2.1 }), sc = 0.82 + 0.18 * sp
    ctx.save(); ctx.globalAlpha = inv(t, 0.1, 0.5); ctx.translate(cx, cy); ctx.scale(sc, sc)
    drawText(ctx, word, 0, 0, { size: 52, weight: 800, family: fonts.display, color: pal.ink, maxW: W * 0.78, shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.4)' : null })
    ctx.restore()
    const r = mulberry32((env.seed >>> 0) ^ 0xd07)
    const total = 4, active = (r() * total) | 0
    const gap = 26, x0 = cx - gap * (total - 1) / 2, dy = cy + 64
    for (let i = 0; i < total; i++) {
      const tin = inv(t, 0.4 + i * 0.08, 0.9 + i * 0.08); if (tin <= 0) continue
      ctx.save(); ctx.globalAlpha = tin
      if (i === active) { ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(x0 + i * gap - 9, dy - 4, 18 * M.ease(tin), 8, 4); ctx.fill() }
      else { ctx.fillStyle = rgba(pal.ink, 0.28); ctx.beginPath(); ctx.arc(x0 + i * gap, dy, 4, 0, TAU); ctx.fill() }
      ctx.restore()
    }
  },
})

// interstitial "marquee": dos bandas de acento (arriba y abajo) que barren en sentidos
// opuestos enmarcando una palabra. Energia de "ultimo momento". Distinto a sweep.
register({
  id: 'scene.interstitial.marquee', lib: 'scene-layouts', category: 'connectors/interstitial', tones: ['dark', 'light'], rubros: ['*'], weight: 0.8,
  tags: ['transicion', 'bandas', 'noticia', 'energia'], beat: 'context',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2, cy = H * 0.42
    const word = firstStrong(content.tagline || content.claim || content.cta, 'ATENCION').toUpperCase()
    const bh = 18
    const su = M.ease(inv(t, 0.05, 0.7)), sd = M.ease(inv(t, 0.15, 0.8))
    ctx.save(); ctx.globalAlpha = inv(t, 0.05, 0.4); ctx.fillStyle = pal.accent
    ctx.beginPath(); ctx.rect(0, cy - 58, W * su, bh); ctx.fill()
    ctx.beginPath(); ctx.rect(W * (1 - sd), cy + 40, W * sd, bh); ctx.fill()
    ctx.restore()
    const sp = M.settle(inv(t, 0.3, 1.05), { zeta: 0.5, freq: 2.1 }), sc = 0.85 + 0.15 * sp
    ctx.save(); ctx.globalAlpha = inv(t, 0.25, 0.65); ctx.translate(cx, cy); ctx.scale(sc, sc)
    drawText(ctx, word, 0, 0, { size: 48, weight: 800, family: fonts.display, color: pal.ink, maxW: W * 0.84, shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.4)' : null })
    ctx.restore()
  },
})

// ---- spec/slots (mas · OLA5) -----------------------------------------------

// ============================================================================
// EXPANSION (ronda fill · OLA 6) — layouts NUEVOS no vistos en olas previas:
// hero con grilla de fondo + esquina anclada, hook de "completa el blanco",
// statement entre corchetes (bookend) y con barra-marcador lateral (callout),
// checklist de badges en wrap horizontal, comparacion tipo slider antes/despues,
// dato con delta (flecha sube/baja), pictografo de puntos (fraccion), cita
// centrada sin tarjeta + metrica de comunidad, cierre con flecha-CTA, bisagra
// con numero rotando, etiqueta de precio (pricetag) y fila de tarjetas de spec.
// Contrato intacto: texto en TINTA via core/text, acento SOLO DECO, PURO +
// DETERMINISTA (mulberry32(seed); t solo motion) + PARAMETRIZADO, tone-aware.
// ============================================================================

// helper local OLA6: flecha (linea + cabeza) horizontal de (x0,y) a (x1,y), trazo p [0..1].
function arrowH(ctx, x0, x1, y, color, lw = 4, p = 1) {
  const q = clamp(p, 0, 1), xe = lerp(x0, x1, q)
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(xe, y); ctx.stroke()
  if (q > 0.85) { const h = 9; ctx.beginPath(); ctx.moveTo(xe - h, y - h); ctx.lineTo(xe, y); ctx.lineTo(xe - h, y + h); ctx.stroke() }
  ctx.restore()
}

// ---- openers/hero (mas · OLA6) ---------------------------------------------

// hero "grid": claim grande centrado sobre una grilla tenue de fondo (DECO en tinta
// muy baja) que se dibuja en cascada + marca chica arriba. Aire de "blueprint/planos".
register({
  id: 'scene.hero.grid', lib: 'scene-layouts', category: 'openers/hero', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['apertura', 'grilla', 'blueprint', 'tecnico'], beat: 'hook',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2
    // grilla de fondo: lineas verticales+horizontales que aparecen en cascada (DECO tinta tenue)
    const gp = M.ease(inv(t, 0.0, 0.7)), cols = 5, rowsN = 8
    ctx.save(); ctx.strokeStyle = rgba(pal.ink, pal.tone === 'light' ? 0.06 : 0.08); ctx.lineWidth = 1
    for (let i = 1; i < cols; i++) { const x = (W / cols) * i; const up = clamp(gp * cols - i + 1, 0, 1); ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H * up); ctx.stroke() }
    for (let j = 1; j < rowsN; j++) { const y = (H / rowsN) * j; const up = clamp(gp * rowsN - j + 1, 0, 1); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W * up, y); ctx.stroke() }
    ctx.restore()
    // marca chica arriba en mono-acento
    drawText(ctx, (content.brand || 'Marca').toUpperCase(), cx, H * 0.3, { size: 17, weight: 700, family: fonts.accent || fonts.text, color: pal.inkText, maxW: W * 0.8, alpha: inv(t, 0.2, 0.55) })
    // claim grande centrado, sube y se asienta
    const rise = M.settle(inv(t, 0.25, 1.05), 1.2)
    ctx.save(); ctx.globalAlpha = inv(t, 0.25, 0.75); ctx.translate(0, (1 - rise) * 30)
    drawWrapped(ctx, content.claim || content.tagline || content.brand || 'Construilo bien', cx, H * 0.48, { size: 50, weight: 800, family: fonts.display, maxW: W * 0.84, color: pal.ink, maxLines: 3, lh: 1.08, shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.45)' : null })
    ctx.restore()
    // cruz de registro de acento bajo el claim (DECO)
    const cu = M.ease(inv(t, 0.6, 1.2))
    if (cu > 0) { ctx.save(); ctx.strokeStyle = pal.accent; ctx.lineWidth = 3; ctx.lineCap = 'round'; const cyx = H * 0.62, r = 10 * cu; ctx.beginPath(); ctx.moveTo(cx - r, cyx); ctx.lineTo(cx + r, cyx); ctx.moveTo(cx, cyx - r); ctx.lineTo(cx, cyx + r); ctx.stroke(); ctx.restore() }
  },
})

// hero "corner": marca/kicker anclado arriba-derecha + claim gigante anclado abajo-izq,
// con un angulo de acento (esquina) en la esquina inferior izquierda. Composicion de poster.
register({
  id: 'scene.hero.corner', lib: 'scene-layouts', category: 'openers/hero', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['apertura', 'poster', 'esquina', 'asimetrico'], beat: 'hook',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, mx = W * 0.1
    // kicker arriba-derecha
    drawText(ctx, (content.brand || 'Marca').toUpperCase(), W - mx, H * 0.18, { size: 16, weight: 700, family: fonts.accent || fonts.text, color: pal.inkText, align: 'right', maxW: W * 0.7, alpha: inv(t, 0.05, 0.45) })
    // angulo de acento en la esquina inferior izquierda (dos trazos en L que crecen)
    const lu = M.ease(inv(t, 0.1, 0.8)), len = 64 * lu, ex = mx - 6, ey = H * 0.86
    ctx.save(); ctx.strokeStyle = pal.accent; ctx.lineWidth = 5; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(ex, ey - len); ctx.lineTo(ex, ey); ctx.lineTo(ex + len, ey); ctx.stroke(); ctx.restore()
    // claim gigante anclado abajo-izquierda, lineas con stagger
    const src = content.claim || content.tagline || content.brand || 'Lo importante primero'
    const L = wrapLinesLocal(ctx, src, 54, W - 2 * mx, 30, 800, fonts.display, 3)
    const lineH = L.size * 1.05, y1 = H * 0.78, y0 = y1 - (L.lines.length - 1) * lineH
    L.lines.forEach((ln, i) => {
      const tin = inv(t, 0.25 + i * 0.14, 0.75 + i * 0.14); if (tin <= 0) return
      ctx.save(); ctx.globalAlpha = tin; ctx.translate((1 - M.ease(tin)) * -24, 0)
      ctx.font = `800 ${L.size}px "${fonts.display}"`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = pal.ink
      if (pal.tone === 'dark') { ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 6 }
      ctx.fillText(ln, mx, y0 + i * lineH)
      ctx.restore()
    })
  },
})

// ---- openers/hook (mas · OLA6) ---------------------------------------------

// hook "fillblank": frase con un "blanco" (raya de acento) que se rellena con la palabra
// clave. Gancho de "completa la frase". Distinto a redacted (tapa) y strike (tacha).
register({
  id: 'scene.hook.fillblank', lib: 'scene-layouts', category: 'openers/hook', tones: ['dark', 'light'], rubros: ['*'], weight: 0.95,
  tags: ['hook', 'completar', 'blanco', 'gancho'], beat: 'hook',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2
    // frase de contexto arriba
    ctx.save(); ctx.globalAlpha = inv(t, 0.1, 0.5)
    drawWrapped(ctx, content.tagline || content.claim || 'Lo que te falta es', cx, H * 0.34, { size: 28, weight: 700, family: fonts.display, maxW: W * 0.82, color: pal.ink, maxLines: 3, lh: 1.16, shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.4)' : null })
    ctx.restore()
    const word = firstStrong(content.claim || content.brand || content.cta, 'METODO').toUpperCase()
    // la raya/blanco aparece primero; luego la palabra "cae" sobre ella
    const blankU = M.ease(inv(t, 0.25, 0.6))
    ctx.font = `800 52px "${fonts.display}"`
    const tw = Math.min(W * 0.84, ctx.measureText(word).width), by = H * 0.56
    ctx.save(); ctx.fillStyle = pal.accent; ctx.globalAlpha = inv(t, 0.25, 0.55)
    ctx.beginPath(); ctx.roundRect(cx - tw / 2 - 6, by + 32, (tw + 12) * blankU, 6, 3); ctx.fill(); ctx.restore()
    const wa = inv(t, 0.55, 0.95), drop = M.settle(wa, { zeta: 0.5, freq: 2.1 })
    ctx.save(); ctx.globalAlpha = wa; ctx.translate(0, (1 - drop) * -26)
    drawText(ctx, word, cx, by, { size: 52, weight: 800, family: fonts.display, maxW: W * 0.84, color: pal.ink, shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.45)' : null })
    ctx.restore()
  },
})

// ---- statements/editorial (mas · OLA6) -------------------------------------

// statement "bookend": claim centrado enmarcado por dos reglas de acento (arriba/abajo)
// que se abren como corchetes horizontales. Distinto a panel/underline/index.
register({
  id: 'scene.statement.bookend', lib: 'scene-layouts', category: 'statements/editorial', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['claim', 'corchetes', 'centrado', 'editorial'], beat: 'value',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2
    const src = content.claim || content.tagline || content.brand || 'Sin vueltas'
    const L = wrapLinesLocal(ctx, src, 40, W * 0.8, 24, 800, fonts.display, 4)
    const lineH = L.size * 1.18, blockH = (L.lines.length - 1) * lineH, cyc = H * 0.46, y0 = cyc - blockH / 2
    // regla superior e inferior de acento que crecen desde el centro
    const ru = M.ease(inv(t, 0.05, 0.65)), rw = W * 0.42 * ru
    ctx.save(); ctx.fillStyle = pal.accent
    ctx.beginPath(); ctx.roundRect(cx - rw / 2, y0 - L.size * 0.85, rw, 5, 2.5); ctx.fill()
    ctx.beginPath(); ctx.roundRect(cx - rw / 2, y0 + blockH + L.size * 0.85, rw, 5, 2.5); ctx.fill(); ctx.restore()
    // claim centrado, lineas con stagger
    L.lines.forEach((ln, i) => {
      const tin = inv(t, 0.25 + i * 0.12, 0.78 + i * 0.12); if (tin <= 0) return
      ctx.save(); ctx.globalAlpha = tin; ctx.translate(0, (1 - M.ease(tin)) * 14)
      ctx.font = `800 ${L.size}px "${fonts.display}"`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = pal.ink
      if (pal.tone === 'dark') { ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 5 }
      ctx.fillText(ln, cx, y0 + i * lineH)
      ctx.restore()
    })
    if (content.brand) drawText(ctx, (content.brand || '').toUpperCase(), cx, H * 0.74, { size: 15, weight: 700, family: fonts.accent || fonts.text, color: pal.dim, maxW: W * 0.7, alpha: inv(t, 0.7, 1.2) })
  },
})

// statement "callout": barra-marcador de acento vertical a la izquierda (full-alto del
// bloque) + claim a su derecha, alineado izquierda. Distinto a editorial/boxed (panel).
register({
  id: 'scene.statement.callout', lib: 'scene-layouts', category: 'statements/editorial', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['claim', 'marcador', 'barra-lateral', 'editorial'], beat: 'value',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, mx = W * 0.12
    const src = content.claim || content.tagline || 'Esto cambia todo'
    const bodyX = mx + 20
    const L = wrapLinesLocal(ctx, src, 40, W - bodyX - W * 0.08, 26, 800, fonts.display, 4)
    const lineH = L.size * 1.18, blockH = (L.lines.length - 1) * lineH, cyc = H * 0.46, y0 = cyc - blockH / 2
    // barra vertical de acento que crece desde arriba (alto del bloque)
    const bu = M.ease(inv(t, 0.05, 0.7)), bh = (blockH + L.size * 1.2)
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(mx, y0 - L.size * 0.6, 6, bh * bu, 3); ctx.fill()
    // claim alineado a izquierda
    L.lines.forEach((ln, i) => {
      const tin = inv(t, 0.25 + i * 0.12, 0.78 + i * 0.12); if (tin <= 0) return
      ctx.save(); ctx.globalAlpha = tin; ctx.translate((1 - M.ease(tin)) * 16, 0)
      ctx.font = `800 ${L.size}px "${fonts.display}"`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = pal.ink
      if (pal.tone === 'dark') { ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 5 }
      ctx.fillText(ln, bodyX, y0 + i * lineH)
      ctx.restore()
    })
    if (content.brand) drawText(ctx, (content.brand || '').toUpperCase(), bodyX, y0 + blockH + L.size * 1.1, { size: 15, weight: 700, family: fonts.accent || fonts.text, color: pal.dim, align: 'left', maxW: W * 0.7, alpha: inv(t, 0.7, 1.2) })
  },
})

// ---- lists/checklist (mas · OLA6) ------------------------------------------

// checklist "badges": items como pildoras con tilde, fluyendo en filas centradas (wrap).
// Distinto a ticks/numbered (filas), grid (2x2), timeline (riel vertical).
register({
  id: 'scene.checklist.badges', lib: 'scene-layouts', category: 'lists/checklist', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['lista', 'badges', 'pildoras', 'wrap'], beat: 'value',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2
    const items = splitItems(content.claim || content.tagline || 'Rapido · Seguro · Simple · Sin limites', 5)
    if (content.brand) drawText(ctx, (content.brand || '').toUpperCase(), cx, H * 0.3, { size: 16, weight: 700, family: fonts.accent || fonts.text, color: pal.inkText, maxW: W * 0.78, alpha: inv(t, 0.05, 0.4) })
    // layout en filas: mide cada badge (tilde + texto) y los acomoda centrados con wrap
    ctx.font = `700 20px "${fonts.text}"`
    const chipH = 46, padX = 18, tickW = 26, gap = 12, maxRowW = W * 0.86
    const meas = items.map(it => Math.min(maxRowW - padX * 2 - tickW, ctx.measureText(it).width) + padX * 2 + tickW)
    const rowsArr = []; let row = [], rw = 0
    items.forEach((it, i) => { const w = meas[i]; if (rw + w + (row.length ? gap : 0) > maxRowW && row.length) { rowsArr.push({ row, rw }); row = []; rw = 0 } rw += w + (row.length ? gap : 0); row.push({ it, w }) })
    if (row.length) rowsArr.push({ row, rw })
    const totalH = rowsArr.length * chipH + (rowsArr.length - 1) * gap, y0 = H * 0.5 - totalH / 2
    let ci = 0
    rowsArr.forEach((rowObj, ri) => {
      let cxx = cx - rowObj.rw / 2
      const cyr = y0 + ri * (chipH + gap)
      rowObj.row.forEach(({ it, w }) => {
        const tin = inv(t, 0.25 + ci * 0.12, 0.78 + ci * 0.12); ci++
        if (tin <= 0) { cxx += w + gap; return }
        const sp = M.settle(tin, { zeta: 0.5, freq: 2 })
        ctx.save(); ctx.globalAlpha = tin; ctx.translate(cxx + w / 2, cyr + chipH / 2); ctx.scale(0.85 + 0.15 * sp, 0.85 + 0.15 * sp); ctx.translate(-(cxx + w / 2), -(cyr + chipH / 2))
        ctx.fillStyle = pal.tone === 'light' ? 'rgba(20,16,24,0.05)' : 'rgba(255,255,255,0.06)'
        ctx.beginPath(); ctx.roundRect(cxx, cyr, w, chipH, chipH / 2); ctx.fill()
        ctx.restore()
        // tilde de acento (DECO) a la izquierda
        tick(ctx, cxx + padX + 4, cyr + chipH / 2, 9, M.ease(tin), pal.accent, 3)
        drawText(ctx, it, cxx + padX + tickW, cyr + chipH / 2, { size: 20, weight: 700, family: fonts.text, color: pal.ink, align: 'left', maxW: w - padX * 2 - tickW, alpha: tin })
        cxx += w + gap
      })
    })
  },
})

// ---- lists/comparison (mas · OLA6) -----------------------------------------

// comparison "slider": una barra horizontal partida por un "handle" que se desliza,
// revelando el lado bueno (acento) sobre el viejo (dim). Distinto a vs/split/scale/table.
register({
  id: 'scene.comparison.slider', lib: 'scene-layouts', category: 'lists/comparison', tones: ['dark', 'light'], rubros: ['*'], weight: 0.95,
  tags: ['comparacion', 'slider', 'antes-despues', 'revelado'], beat: 'value',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2
    const parts = splitItems(content.claim || content.tagline || 'Antes · Despues', 2)
    const left = parts[0] || 'Antes', right = parts[1] || 'Despues'
    const bw = W * 0.78, bx = (W - bw) / 2, by = H * 0.4, bh = H * 0.2, rad = 18
    const slide = M.ease(inv(t, 0.2, 1.05)), hx = bx + bw * slide
    // base: panel viejo (surface tenue, todo el ancho)
    ctx.save(); ctx.globalAlpha = inv(t, 0.05, 0.4)
    ctx.fillStyle = pal.tone === 'light' ? 'rgba(20,16,24,0.06)' : 'rgba(255,255,255,0.07)'
    ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, rad); ctx.fill(); ctx.restore()
    // panel nuevo (acento) recortado hasta el handle
    ctx.save(); ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, rad); ctx.clip()
    ctx.globalAlpha = inv(t, 0.15, 0.5); ctx.fillStyle = pal.accent; ctx.fillRect(bx, by, bw * slide, bh); ctx.restore()
    // handle vertical (linea + circulo) en hx
    ctx.save(); ctx.strokeStyle = pal.tone === 'light' ? '#ffffff' : pal.ink; ctx.lineWidth = 3
    ctx.beginPath(); ctx.moveTo(hx, by); ctx.lineTo(hx, by + bh); ctx.stroke()
    ctx.fillStyle = pal.tone === 'light' ? '#ffffff' : pal.ink; ctx.beginPath(); ctx.arc(hx, by + bh / 2, 13, 0, TAU); ctx.fill()
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.arc(hx, by + bh / 2, 5, 0, TAU); ctx.fill(); ctx.restore()
    // etiquetas debajo: izquierda (dim, viejo) y derecha (tinta, nuevo)
    ctx.save(); ctx.globalAlpha = inv(t, 0.5, 1.0)
    drawWrapped(ctx, left, bx + bw * 0.25, by + bh + 44, { size: 20, weight: 700, family: fonts.display, maxW: bw * 0.46, color: pal.dim, maxLines: 2, lh: 1.12 })
    drawWrapped(ctx, right, bx + bw * 0.75, by + bh + 44, { size: 22, weight: 800, family: fonts.display, maxW: bw * 0.46, color: pal.ink, maxLines: 2, lh: 1.12 })
    ctx.restore()
    if (content.brand) drawText(ctx, (content.brand || '').toUpperCase(), cx, H * 0.74, { size: 15, weight: 700, family: fonts.accent || fonts.text, color: pal.inkText, maxW: W * 0.8, alpha: inv(t, 0.7, 1.2) })
  },
})

// ---- data/single (mas · OLA6) ----------------------------------------------

// data "counter": numero grande + chip de delta (flecha arriba/abajo segun signo) +
// caption. Distinto a single (anillo), bar, dial, donut. Para KPIs con tendencia.
register({
  id: 'scene.data.counter', lib: 'scene-layouts', category: 'data/single', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['dato', 'contador', 'delta', 'tendencia', 'kpi'], beat: 'data',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2
    const num = bigNumber(content.claim || content.tagline, '+128%')
    const down = /^-/.test(num.trim())
    // numero grande centrado con asentamiento
    const sp = M.settle(inv(t, 0.1, 0.95), { zeta: 0.5, freq: 2 })
    ctx.save(); ctx.globalAlpha = inv(t, 0.05, 0.4); ctx.translate(cx, H * 0.4); ctx.scale(0.82 + 0.18 * sp, 0.82 + 0.18 * sp)
    drawText(ctx, num, 0, 0, { size: 104, weight: 800, family: fonts.display, maxW: W * 0.9, color: pal.ink, shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.45)' : null })
    ctx.restore()
    // chip de delta: pildora de acento con flecha (arriba si sube, abajo si baja)
    const dp = M.settle(inv(t, 0.45, 1.1), { zeta: 0.5, freq: 2 })
    if (dp > 0) {
      const cw = 64, ch = 36, dy = H * 0.55
      ctx.save(); ctx.globalAlpha = inv(t, 0.45, 0.9); ctx.translate(cx, dy); ctx.scale(0.8 + 0.2 * dp, 0.8 + 0.2 * dp)
      ctx.fillStyle = rgba(pal.accent, pal.tone === 'light' ? 0.18 : 0.26); ctx.beginPath(); ctx.roundRect(-cw / 2, -ch / 2, cw, ch, ch / 2); ctx.fill()
      // triangulo (DECO en acento)
      ctx.fillStyle = pal.accent; const ar = 8
      ctx.beginPath()
      if (down) { ctx.moveTo(-ar, -ar * 0.6); ctx.lineTo(ar, -ar * 0.6); ctx.lineTo(0, ar * 0.8) } else { ctx.moveTo(-ar, ar * 0.6); ctx.lineTo(ar, ar * 0.6); ctx.lineTo(0, -ar * 0.8) }
      ctx.closePath(); ctx.fill(); ctx.restore()
    }
    drawWrapped(ctx, content.tagline || content.brand || 'vs el mes pasado', cx, H * 0.65, { size: 22, weight: 700, family: fonts.text, maxW: W * 0.78, color: pal.dim, maxLines: 2, alpha: inv(t, 0.6, 1.1) })
  },
})

// ---- data/multi (mas · OLA6) -----------------------------------------------

// data "pictograph": grilla de puntos (ej 10x5) donde una fraccion (del % del numero) se
// pinta en acento. "X de cada Y". Distinto a multi/bars/stack.
register({
  id: 'scene.data.pictograph', lib: 'scene-layouts', category: 'data/multi', tones: ['dark', 'light'], rubros: ['*'], weight: 0.95,
  tags: ['datos', 'pictografo', 'puntos', 'fraccion'], beat: 'data',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2
    const num = bigNumber(content.claim || content.tagline, '70%')
    const pct = (() => { const m = num.match(/(\d[\d.,]*)/); let v = m ? parseFloat(m[1].replace(/,/g, '')) : 70; if (num.indexOf('%') < 0) v = clamp(v, 0, 100); return clamp(v / 100, 0.04, 1) })()
    const cols = 10, rowsN = 5, total = cols * rowsN, on = Math.round(total * pct)
    const dotR = 9, gx = W * 0.13, gw = W * 0.74, gy = H * 0.32, gh = H * 0.34
    const sx = gw / (cols - 1), sy = gh / (rowsN - 1)
    if (content.brand) drawText(ctx, (content.brand || '').toUpperCase(), cx, H * 0.24, { size: 16, weight: 700, family: fonts.accent || fonts.text, color: pal.inkText, maxW: W * 0.78, alpha: inv(t, 0.05, 0.35) })
    // los puntos aparecen en cascada por indice; los "on" en acento, el resto tinta tenue
    const prog = M.ease(inv(t, 0.2, 1.15))
    for (let i = 0; i < total; i++) {
      const r = Math.floor(i / cols), c = i % cols
      const x = gx + c * sx, y = gy + r * sy
      const ap = clamp(prog * total - i, 0, 1); if (ap <= 0) continue
      ctx.save(); ctx.globalAlpha = ap
      ctx.fillStyle = i < on ? pal.accent : rgba(pal.ink, 0.16)
      ctx.beginPath(); ctx.arc(x, y, dotR * (0.6 + 0.4 * ap), 0, TAU); ctx.fill(); ctx.restore()
    }
    // caption con el numero
    drawWrapped(ctx, content.tagline || (num + ' lo logra'), cx, H * 0.78, { size: 22, weight: 700, family: fonts.text, maxW: W * 0.8, color: pal.dim, maxLines: 2, alpha: inv(t, 0.7, 1.2) })
  },
})

// ---- social/proof (mas · OLA6) ---------------------------------------------

// social "quotemark": cita grande centrada SIN tarjeta, entre comillas de acento gigantes
// (apertura arriba-izq, cierre abajo-der) + atribucion. Distinto a quotecard (panel).
register({
  id: 'scene.social.quotemark', lib: 'scene-layouts', category: 'social/proof', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['prueba-social', 'cita', 'comillas', 'testimonio'], beat: 'proof',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2
    // comillas de acento gigantes en diagonal (DECO)
    ctx.save(); ctx.globalAlpha = (pal.tone === 'light' ? 0.16 : 0.22) * inv(t, 0.0, 0.5)
    drawText(ctx, '“', W * 0.16, H * 0.32, { size: 150, weight: 800, family: fonts.display, color: pal.accent, align: 'left', maxW: 120 })
    drawText(ctx, '”', W * 0.84, H * 0.66, { size: 150, weight: 800, family: fonts.display, color: pal.accent, align: 'right', maxW: 120 })
    ctx.restore()
    // cita centrada en tinta
    ctx.save(); ctx.globalAlpha = inv(t, 0.25, 0.8)
    TK.drawWrapped(ctx, content.claim || content.tagline || 'La mejor decision del ano', cx, H * 0.48, { reveal: inv(t, 0.25, 1.05), size: 32, weight: 700, family: fonts.display, maxW: W * 0.74, color: pal.ink, maxLines: 4, lh: 1.22, shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.4)' : null })
    ctx.restore()
    // atribucion: regla de acento + marca
    if (content.brand) {
      const ap = inv(t, 0.7, 1.2)
      ctx.fillStyle = pal.accent; ctx.globalAlpha = ap
      ctx.beginPath(); ctx.roundRect(cx - 18, H * 0.66, 36 * M.ease(ap), 3, 1.5); ctx.fill(); ctx.globalAlpha = 1
      drawText(ctx, '— ' + content.brand, cx, H * 0.71, { size: 18, weight: 700, family: fonts.accent || fonts.text, color: pal.dim, maxW: W * 0.7, alpha: ap })
    }
  },
})

// social "metric": metrica de comunidad gigante (ej "+10k") + etiqueta, con un cluster de
// puntos de acento (DECO). "miembros / usuarios / descargas". Distinta a avatars/rating.
register({
  id: 'scene.social.metric', lib: 'scene-layouts', category: 'social/proof', tones: ['dark', 'light'], rubros: ['*'], weight: 0.95,
  tags: ['prueba-social', 'metrica', 'comunidad', 'numero'], beat: 'proof',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2
    const num = bigNumber(content.claim || content.tagline, '+10k')
    // cluster de puntos de acento arriba (DECO, estable por seed)
    const r = mulberry32((env.seed >>> 0) ^ 0xb16)
    const cu = M.ease(inv(t, 0.1, 0.8))
    for (let i = 0; i < 7; i++) {
      const ang = r() * TAU, rad = 20 + r() * 56, px = cx + Math.cos(ang) * rad, py = H * 0.28 + Math.sin(ang) * rad * 0.7
      const ap = clamp(cu * 7 - i, 0, 1); if (ap <= 0) continue
      ctx.save(); ctx.globalAlpha = ap * 0.8; ctx.fillStyle = pal.accent
      ctx.beginPath(); ctx.arc(px, py, (2 + r() * 3) * ap, 0, TAU); ctx.fill(); ctx.restore()
    }
    // numero gigante centrado
    const sp = M.settle(inv(t, 0.2, 1.0), { zeta: 0.45, freq: 2.1 })
    ctx.save(); ctx.globalAlpha = inv(t, 0.15, 0.5); ctx.translate(cx, H * 0.48); ctx.scale(0.78 + 0.22 * sp, 0.78 + 0.22 * sp)
    drawText(ctx, num, 0, 0, { size: 116, weight: 800, family: fonts.display, maxW: W * 0.9, color: pal.ink, shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.45)' : null })
    ctx.restore()
    // etiqueta debajo
    drawWrapped(ctx, content.tagline || content.brand || 'personas ya confian', cx, H * 0.63, { size: 24, weight: 700, family: fonts.text, maxW: W * 0.8, color: pal.dim, maxLines: 2, alpha: inv(t, 0.55, 1.05) })
  },
})

// ---- closers/outro (mas · OLA6) --------------------------------------------

// outro "arrowcta": marca arriba + CTA a la derecha con una flecha larga de acento que
// barre desde la izquierda hasta apuntarla. Cierre con direccion. Distinto a cta/handle/diagonal.
register({
  id: 'scene.outro.arrowcta', lib: 'scene-layouts', category: 'closers/outro', tones: ['dark', 'light'], rubros: ['*'], weight: 0.95,
  tags: ['cierre', 'cta', 'flecha', 'direccion'], beat: 'close',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2
    // marca centrada arriba
    drawWrapped(ctx, content.brand || 'Marca', cx, H * 0.36, { size: 48, weight: 800, family: fonts.display, maxW: W * 0.86, color: pal.ink, maxLines: 2, lh: 1.04, alpha: inv(t, 0.15, 0.7), shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.4)' : null })
    const cta = content.cta || content.tagline || 'Empeza hoy'
    // flecha larga de acento que barre y termina apuntando a la pildora del CTA
    const ay = H * 0.56
    arrowH(ctx, W * 0.12, W * 0.46, ay, pal.accent, 5, M.ease(inv(t, 0.4, 1.0)))
    // pildora CTA a la derecha de la flecha, entra con spring
    const gp = M.settle(inv(t, 0.6, 1.25), { zeta: 0.5, freq: 2 })
    ctx.save(); ctx.font = `800 24px "${fonts.display}"`
    const tw = Math.min(W * 0.44, ctx.measureText(cta).width), pw = tw + 44, ph = 50, px = W * 0.5
    ctx.translate(px + pw / 2, ay); ctx.scale(0.8 + 0.2 * gp, 0.8 + 0.2 * gp); ctx.globalAlpha = inv(t, 0.6, 1.0)
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(-pw / 2, -ph / 2, pw, ph, ph / 2); ctx.fill()
    drawText(ctx, cta, 0, 1, { size: 24, weight: 800, family: fonts.display, maxW: pw - 30, color: pal.onAccent })
    ctx.restore()
    if (content.tagline && content.cta) drawText(ctx, content.tagline, cx, H * 0.7, { size: 18, weight: 600, family: fonts.text, maxW: W * 0.8, color: pal.dim, alpha: inv(t, 0.85, 1.3) })
  },
})

// ---- connectors/interstitial (mas · OLA6) ----------------------------------

// interstitial "ringnum": numero de capitulo centrado dentro de un anillo de acento que
// se dibuja (draw-on) + palabra de bisagra debajo. Distinto a count/rule (planos).
register({
  id: 'scene.interstitial.ringnum', lib: 'scene-layouts', category: 'connectors/interstitial', tones: ['dark', 'light'], rubros: ['*'], weight: 0.85,
  tags: ['transicion', 'capitulo', 'anillo', 'bisagra'], beat: 'context',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2, cy = H * 0.4
    const r = mulberry32((env.seed >>> 0) ^ 0x4e2)
    const idx = String(1 + ((r() * 5) | 0))
    const word = firstStrong(content.tagline || content.claim || content.brand, 'PARTE').toUpperCase()
    const R = 70
    // anillo de acento que se dibuja
    const ringP = M.ease(inv(t, 0.1, 1.0))
    ctx.save(); ctx.strokeStyle = rgba(pal.ink, 0.1); ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke()
    ctx.strokeStyle = pal.accent; ctx.lineWidth = 5; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.arc(cx, cy, R, -TAU / 4, -TAU / 4 + TAU * ringP); ctx.stroke(); ctx.restore()
    // numero centrado con asentamiento
    const sp = M.settle(inv(t, 0.25, 1.0), { zeta: 0.5, freq: 2 })
    ctx.save(); ctx.translate(cx, cy); ctx.scale(0.8 + 0.2 * sp, 0.8 + 0.2 * sp)
    drawText(ctx, idx, 0, 0, { size: 64, weight: 800, family: fonts.display, maxW: R * 1.6, color: pal.ink, alpha: inv(t, 0.2, 0.6) })
    ctx.restore()
    // palabra de bisagra debajo
    const rise = M.settle(inv(t, 0.4, 1.1), 1.2)
    ctx.save(); ctx.globalAlpha = inv(t, 0.4, 0.85); ctx.translate(0, (1 - rise) * 22)
    drawText(ctx, word, cx, cy + R + 46, { size: 38, weight: 800, family: fonts.display, maxW: W * 0.8, color: pal.ink })
    ctx.restore()
  },
})

// ---- spec/slots (mas · OLA6) -----------------------------------------------

// spec "pricetag": etiqueta de precio (forma de tag con muesca + agujero) con el valor
// destacado + sub-spec. Para producto/inmueble/plan. Distinto a feature/detail/ribbon.
register({
  id: 'scene.spec.pricetag', lib: 'scene-layouts', category: 'spec/slots', tones: ['dark', 'light'], rubros: ['*'], weight: 0.95,
  tags: ['ficha', 'precio', 'etiqueta', 'tag', 'producto'], beat: 'data',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2
    const items = splitItems(content.claim || content.tagline || 'USD 120k · 3 amb · 80 m2 · Apto credito', 4)
    let priceIdx = items.findIndex(it => /\$|usd|ars|€|\d/i.test(it)); if (priceIdx < 0) priceIdx = 0
    const price = (items[priceIdx] || items[0] || 'Consultar').trim()
    const subs = items.filter((_, i) => i !== priceIdx).slice(0, 3)
    if (content.brand) drawText(ctx, (content.brand || '').toUpperCase(), cx, H * 0.22, { size: 16, weight: 700, family: fonts.accent || fonts.text, color: pal.inkText, maxW: W * 0.78, alpha: inv(t, 0.05, 0.35) })
    // forma de tag (rectangulo con muesca triangular a la izquierda + agujero), entra con spring + leve giro
    const sp = M.settle(inv(t, 0.1, 1.0), { zeta: 0.45, freq: 2.1 })
    const tw = W * 0.7, th = 120, tx = cx - tw / 2, ty = H * 0.33, notch = 34, rot = (1 - M.ease(inv(t, 0.1, 0.9))) * -0.06
    ctx.save(); ctx.globalAlpha = inv(t, 0.05, 0.45); ctx.translate(cx, ty + th / 2); ctx.rotate(rot); ctx.scale(0.85 + 0.15 * sp, 0.85 + 0.15 * sp); ctx.translate(-cx, -(ty + th / 2))
    ctx.fillStyle = pal.accent; ctx.beginPath()
    ctx.moveTo(tx + notch, ty); ctx.lineTo(tx + tw, ty); ctx.lineTo(tx + tw, ty + th); ctx.lineTo(tx + notch, ty + th); ctx.lineTo(tx, ty + th / 2); ctx.closePath(); ctx.fill()
    // agujero del tag
    ctx.fillStyle = pal.tone === 'light' ? '#ffffff' : (pal.bg1 || '#161018'); ctx.beginPath(); ctx.arc(tx + notch + 18, ty + th / 2, 8, 0, TAU); ctx.fill()
    ctx.restore()
    // precio en onAccent dentro del tag
    drawText(ctx, price, cx + notch / 2, ty + th / 2, { size: 46, weight: 800, family: fonts.display, maxW: tw - notch - 60, color: pal.onAccent, alpha: inv(t, 0.35, 0.85) })
    // sub-specs como linea de items separados por punto, debajo
    if (subs.length) drawWrapped(ctx, subs.join('  ·  '), cx, H * 0.6, { size: 22, weight: 700, family: fonts.text, maxW: W * 0.82, color: pal.ink, maxLines: 2, lh: 1.2, alpha: inv(t, 0.6, 1.1) })
  },
})

// spec "cards": fila de N tarjetas (panel surface) cada una con un valor grande en tinta
// + etiqueta; barra de acento arriba de cada card. Distinto a detail (grilla 2x2) y feature (filas).
register({
  id: 'scene.spec.cards', lib: 'scene-layouts', category: 'spec/slots', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['ficha', 'tarjetas', 'fila', 'specs', 'producto'], beat: 'data',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2
    const items = splitItems(content.claim || content.tagline || '3 amb · 80 m2 · 2 banos', 3)
    const n = Math.min(3, Math.max(2, items.length))
    if (content.brand) drawText(ctx, (content.brand || '').toUpperCase(), cx, H * 0.28, { size: 16, weight: 700, family: fonts.accent || fonts.text, color: pal.inkText, maxW: W * 0.78, alpha: inv(t, 0.05, 0.35) })
    const gw = W * 0.84, gx = (W - gw) / 2, gap = 12, cw = (gw - (n - 1) * gap) / n, ch = H * 0.26, cy = H * 0.38
    for (let i = 0; i < n; i++) {
      const it = items[i] || ''
      const tin = inv(t, 0.2 + i * 0.14, 0.74 + i * 0.14); if (tin <= 0) continue
      const cxx = gx + i * (cw + gap), sp = M.settle(tin, { zeta: 0.5, freq: 2 })
      ctx.save(); ctx.globalAlpha = tin; ctx.translate(cxx + cw / 2, cy + ch / 2); ctx.scale(0.88 + 0.12 * sp, 0.88 + 0.12 * sp); ctx.translate(-(cxx + cw / 2), -(cy + ch / 2))
      ctx.fillStyle = pal.tone === 'light' ? 'rgba(20,16,24,0.05)' : 'rgba(255,255,255,0.06)'
      ctx.beginPath(); ctx.roundRect(cxx, cy, cw, ch, 14); ctx.fill()
      // barra de acento arriba de la card
      ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(cxx, cy, cw, 4, 2); ctx.fill()
      ctx.restore()
      // valor (numero) + etiqueta
      const num = (it.match(/([+\-]?\$?\s?\d[\d.,]*\s?[%xXmMkK²m2]*)/) || [])[1]
      const label = shortLabel(num ? it.replace(num, '') : it, 2)
      ctx.save(); ctx.globalAlpha = tin
      drawText(ctx, (num || it).trim(), cxx + cw / 2, cy + ch * 0.42, { size: 30, weight: 800, family: fonts.display, color: pal.ink, maxW: cw - 16 })
      if (num && label) drawText(ctx, label, cxx + cw / 2, cy + ch * 0.72, { size: 15, weight: 700, family: fonts.text, color: pal.dim, maxW: cw - 14 })
      ctx.restore()
    }
  },
})

// spec "ribbon": precio/valor destacado arriba + cinta de chips (pildoras) de spec en
// filas centradas. Para inmueble/producto. Distinto a feature (filas) y detail (grilla 2x2).
register({
  id: 'scene.spec.ribbon', lib: 'scene-layouts', category: 'spec/slots', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['ficha', 'cinta', 'chips', 'precio', 'inmueble', 'producto'], beat: 'data',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2
    const items = splitItems(content.claim || content.tagline || 'USD 120k · 3 amb · 80 m2 · Cochera · Apto credito', 5)
    let priceIdx = items.findIndex(it => /\$|usd|ars|€/i.test(it))
    if (priceIdx < 0) priceIdx = 0
    const price = items[priceIdx] || items[0] || ''
    const chips = items.filter((_, i) => i !== priceIdx).slice(0, 4)
    if (content.brand) drawText(ctx, (content.brand || '').toUpperCase(), cx, H * 0.22, { size: 16, weight: 700, family: fonts.accent || fonts.text, color: pal.inkText, maxW: W * 0.78, alpha: inv(t, 0.05, 0.35) })
    const sp = M.settle(inv(t, 0.1, 0.95), { zeta: 0.5, freq: 2 })
    ctx.save(); ctx.globalAlpha = inv(t, 0.05, 0.45); ctx.translate(cx, H * 0.36); ctx.scale(0.85 + 0.15 * sp, 0.85 + 0.15 * sp)
    drawText(ctx, price.trim(), 0, 0, { size: 56, weight: 800, family: fonts.display, maxW: W * 0.86, color: pal.ink, shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.4)' : null })
    ctx.restore()
    const ru = M.ease(inv(t, 0.4, 1.0))
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(cx - 50 * ru, H * 0.45, 100 * ru, 4, 2); ctx.fill()
    ctx.font = `700 18px "${fonts.text}"`
    const chipH = 40, padX = 18, gap = 12, maxRowW = W * 0.86
    const meas = chips.map(c => Math.min(maxRowW - padX * 2, ctx.measureText(c).width) + padX * 2)
    const rowsArr = []; let row = [], rw = 0
    chips.forEach((c, i) => { const w = meas[i]; if (rw + w + (row.length ? gap : 0) > maxRowW && row.length) { rowsArr.push({ row, rw }); row = []; rw = 0 } row.push({ c, w: meas[i] }); rw += w + (row.length > 1 ? gap : 0) })
    if (row.length) rowsArr.push({ row, rw })
    const y0 = H * 0.56
    let ci = 0
    rowsArr.forEach((rowObj, ri) => {
      let cxx = cx - rowObj.rw / 2
      rowObj.row.forEach(({ c, w }) => {
        const tin = inv(t, 0.4 + ci * 0.1, 0.9 + ci * 0.1); ci++
        if (tin <= 0) { cxx += w + gap; return }
        const cy2 = y0 + ri * (chipH + gap), cpsp = M.settle(tin, { zeta: 0.5, freq: 2 })
        ctx.save(); ctx.globalAlpha = tin; ctx.translate(cxx + w / 2, cy2 + chipH / 2); ctx.scale(0.85 + 0.15 * cpsp, 0.85 + 0.15 * cpsp); ctx.translate(-(cxx + w / 2), -(cy2 + chipH / 2))
        ctx.fillStyle = pal.tone === 'light' ? 'rgba(20,16,24,0.05)' : 'rgba(255,255,255,0.06)'
        ctx.beginPath(); ctx.roundRect(cxx, cy2, w, chipH, chipH / 2); ctx.fill()
        ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.arc(cxx + 14, cy2 + chipH / 2, 4, 0, TAU); ctx.fill()
        ctx.restore()
        drawText(ctx, c, cxx + w / 2 + 6, cy2 + chipH / 2, { size: 18, weight: 700, family: fonts.text, color: pal.ink, maxW: w - padX * 2 })
        cxx += w + gap
      })
    })
  },
})
