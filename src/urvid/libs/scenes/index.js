// urvid 1.0 · biblioteca SCENE-LAYOUTS — plantillas de escena que dibujan el CONTENIDO. render(ctx, t, env).
// env = { pal, content, fonts, seed, energy, sceneDur }. content = { brand, tagline, claim, cta, ... }.
// Usan la PALETA + la primitiva de texto (no-desborde garantizado) + motion. REGLA: texto en tinta (ink/inkText),
// acento para DECO (barras/reglas). El director elige la escena segun el beat narrativo (hook/value/proof/close).
import { register } from '../../core/registry.js'
import { drawText, drawWrapped } from '../../core/text.js'
import { W, H, TAU, inv, lerp, clamp, eOutCubic, eOutBack, eInOutCubic, spring, smooth, rgba } from '../../core/util.js'
import { mulberry32 } from '../../core/prng.js'

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

// ============================================================================
// EXPANSION (ronda fill) — mas openers, statements, lists, data, social, closers.
// ============================================================================

// ---- openers/hero ----------------------------------------------------------

register({
  id: 'scene.hero.stacked', lib: 'scene-layouts', category: 'openers/hero', tones: ['dark', 'light'], rubros: ['*'], weight: 1.1,
  tags: ['apertura', 'editorial', 'masivo'], beat: 'hook',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, ax = W * 0.1
    // marca chica arriba (kicker en acento)
    drawText(ctx, (content.brand || 'Marca').toUpperCase(), ax, H * 0.3, { size: 18, weight: 700, family: fonts.accent || fonts.text, maxW: W * 0.8, color: pal.inkText, align: 'left', alpha: inv(t, 0.05, 0.4) })
    // claim grande, izquierda, en 2-3 lineas, stagger por subida
    const rise = eOutBack(inv(t, 0.2, 0.95), 1.3)
    ctx.save(); ctx.globalAlpha = inv(t, 0.2, 0.7); ctx.translate(0, (1 - rise) * 40)
    drawWrapped(ctx, content.claim || content.tagline || content.brand || 'Una idea grande', ax, H * 0.46, { size: 50, weight: 800, family: fonts.display, maxW: W * 0.82, color: pal.ink, align: 'left', maxLines: 3, lh: 1.08, shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.45)' : null })
    ctx.restore()
    // regla inferior que barre
    const ru = eOutCubic(inv(t, 0.7, 1.3))
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(ax, H * 0.62, (W - 2 * ax) * ru, 5, 2.5); ctx.fill()
  },
})

register({
  id: 'scene.hero.framed', lib: 'scene-layouts', category: 'openers/hero', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['apertura', 'marco', 'premium'], beat: 'hook',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, cx = W / 2, cy = H * 0.42
    // marco rectangular que se dibuja (draw-on por perimetro)
    const m = 46, x0 = m, y0 = H * 0.24, x1 = W - m, y1 = H * 0.6
    const dp = eOutCubic(inv(t, 0.1, 0.9)), perim = 2 * ((x1 - x0) + (y1 - y0)), seg = perim * dp
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
    const { pal, content, fonts } = env, cx = W / 2
    // signo de pregunta gigante de fondo (DECO en acento tenue)
    ctx.save(); ctx.globalAlpha = (pal.tone === 'light' ? 0.07 : 0.12) * inv(t, 0.0, 0.5)
    const qScale = lerp(0.9, 1, eOutCubic(inv(t, 0, 0.8)))
    drawText(ctx, '?', cx, H * 0.34, { size: 300 * qScale, weight: 800, family: fonts.display, color: pal.accent })
    ctx.restore()
    // pregunta real, envuelta, en tinta
    ctx.save(); ctx.globalAlpha = inv(t, 0.25, 0.75)
    drawWrapped(ctx, content.tagline || content.claim || '¿Y si fuera mas facil?', cx, H * 0.5, { size: 38, weight: 800, family: fonts.display, maxW: W * 0.82, color: pal.ink, maxLines: 3, lh: 1.14, shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.5)' : null })
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
    const { pal, content, fonts } = env, cx = W / 2
    const num = bigNumber(content.claim || content.tagline, '3x')
    // numero gigante que entra con spring de escala
    const sp = spring(inv(t, 0.1, 1.0), { zeta: 0.45, freq: 2.1 }), sc = 0.7 + 0.3 * sp
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
    const { pal, content, fonts } = env, ax = W * 0.14
    // comilla gigante de apertura (DECO)
    ctx.save(); ctx.globalAlpha = (pal.tone === 'light' ? 0.16 : 0.22) * inv(t, 0.0, 0.5)
    drawText(ctx, '“', ax + 4, H * 0.3, { size: 150, weight: 800, family: fonts.display, color: pal.accent, align: 'left' })
    ctx.restore()
    // claim, izquierda, reveal por linea (mascara que sube)
    ctx.save(); ctx.globalAlpha = inv(t, 0.2, 0.7); ctx.translate((1 - eOutCubic(inv(t, 0.2, 0.85))) * 22, 0)
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
    const { pal, content, fonts } = env, cx = W / 2
    // panel surface centrado que crece
    const gp = eOutCubic(inv(t, 0.1, 0.8)), pw = W * 0.78, ph = H * 0.3, py = H * 0.36
    ctx.save(); ctx.translate(cx, py + ph / 2); ctx.scale(lerp(0.9, 1, gp), lerp(0.9, 1, gp)); ctx.translate(-cx, -(py + ph / 2))
    ctx.globalAlpha = gp
    ctx.fillStyle = pal.tone === 'light' ? 'rgba(20,16,24,0.04)' : 'rgba(255,255,255,0.05)'
    ctx.beginPath(); ctx.roundRect(cx - pw / 2, py, pw, ph, 18); ctx.fill()
    // borde de acento a la izquierda del panel
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(cx - pw / 2, py, 6, ph, 3); ctx.fill()
    ctx.restore()
    // claim dentro
    drawWrapped(ctx, content.claim || content.tagline || 'Tu mensaje, claro', cx, py + ph / 2, { size: 32, weight: 800, family: fonts.display, maxW: pw - 48, color: pal.ink, maxLines: 4, lh: 1.16, alpha: inv(t, 0.4, 0.9) })
  },
})

// ---- lists/checklist -------------------------------------------------------

register({
  id: 'scene.checklist.ticks', lib: 'scene-layouts', category: 'lists/checklist', tones: ['dark', 'light'], rubros: ['*'], weight: 1.2,
  tags: ['lista', 'checklist', 'beneficios'], beat: 'value',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, ax = W * 0.13
    const items = splitItems(content.claim || content.tagline || 'Rapido · Simple · Confiable', 4)
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
      tick(ctx, ax + cr, y, cr, eOutCubic(tin), pal.inkText, 3.2)
      ctx.restore()
      // texto del item
      ctx.save(); ctx.globalAlpha = tin; ctx.translate((1 - eOutCubic(tin)) * 16, 0)
      drawText(ctx, it, ax + cr * 2 + 14, y, { size: 26, weight: 700, family: fonts.text, maxW: W - (ax + cr * 2 + 14) - W * 0.08, color: pal.ink, align: 'left' })
      ctx.restore()
    })
  },
})

register({
  id: 'scene.checklist.numbered', lib: 'scene-layouts', category: 'lists/checklist', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['lista', 'pasos', 'numerada'], beat: 'value',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, ax = W * 0.13
    const items = splitItems(content.claim || content.tagline || 'Conecta · Configura · Lanza', 4)
    drawText(ctx, content.brand ? (content.brand + '').toUpperCase() : 'COMO FUNCIONA', ax, H * 0.25, { size: 16, weight: 700, family: fonts.accent || fonts.text, color: pal.inkText, align: 'left', maxW: W * 0.74, alpha: inv(t, 0.05, 0.35) })
    const y0 = H * 0.35, gap = Math.min(82, (H * 0.48) / Math.max(1, items.length))
    items.forEach((it, i) => {
      const tin = inv(t, 0.2 + i * 0.2, 0.7 + i * 0.2)
      if (tin <= 0) return
      const y = y0 + i * gap, sp = spring(tin, { zeta: 0.5, freq: 2 })
      // numero en pildora de acento
      ctx.save(); ctx.globalAlpha = tin; ctx.translate(ax + 20, y); ctx.scale(0.8 + 0.2 * sp, 0.8 + 0.2 * sp)
      ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.arc(0, 0, 20, 0, TAU); ctx.fill()
      drawText(ctx, String(i + 1), 0, 1, { size: 22, weight: 800, family: fonts.display, color: pal.onAccent })
      ctx.restore()
      ctx.save(); ctx.globalAlpha = tin; ctx.translate((1 - eOutCubic(tin)) * 16, 0)
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
    const { pal, content, fonts } = env
    const parts = splitItems(content.claim || content.tagline || 'Antes · Despues', 2)
    const left = parts[0] || 'Antes', right = parts[1] || 'Despues'
    const midX = W / 2, colX = W * 0.25, colW = W * 0.3
    // dos columnas que entran desde los lados
    const la = eOutCubic(inv(t, 0.15, 0.7)), ra = eOutCubic(inv(t, 0.3, 0.85))
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
    const dh = eOutCubic(inv(t, 0.1, 0.8))
    ctx.save(); ctx.strokeStyle = rgba(pal.ink, 0.18); ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(midX, H * 0.3 + (1 - dh) * 60); ctx.lineTo(midX, H * 0.6 - (1 - dh) * 60); ctx.stroke(); ctx.restore()
    const vp = spring(inv(t, 0.4, 1.1), { zeta: 0.5, freq: 2 })
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
    const { pal, content, fonts } = env, cx = W / 2
    const num = bigNumber(content.claim || content.tagline, '100%')
    // anillo de acento que se dibuja alrededor del numero
    const ringP = eOutCubic(inv(t, 0.2, 1.1)), R = 118
    ctx.save(); ctx.translate(cx, H * 0.42)
    ctx.strokeStyle = rgba(pal.ink, 0.1); ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.stroke()
    ctx.strokeStyle = pal.accent; ctx.lineWidth = 9; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.arc(0, 0, R, -TAU / 4, -TAU / 4 + TAU * ringP); ctx.stroke()
    ctx.restore()
    // numero grande centrado (count-style: aparece con escala)
    const sp = spring(inv(t, 0.25, 1.0), { zeta: 0.5, freq: 2 })
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
    const { pal, content, fonts } = env
    // genera 3 stats a partir del contenido (numero de claim/tagline + items para etiquetas)
    const labels = splitItems(content.claim || content.tagline || 'Clientes · Proyectos · Anos', 3).map(l => shortLabel(l, 3))
    const r = mulberry32((env.seed >>> 0) ^ 0x515)
    const nums = [bigNumber(content.claim, ''), '', ''].map((n, i) => n || ['+' + (10 + ((r() * 90) | 0)), (1 + ((r() * 9) | 0)) + 'x', '99%'][i])
    const n = Math.min(3, labels.length || 3), cy = H * 0.44, colW = W / n
    // titulo opcional
    if (content.brand) drawText(ctx, (content.brand || '').toUpperCase(), W / 2, H * 0.24, { size: 16, weight: 700, family: fonts.accent || fonts.text, color: pal.inkText, maxW: W * 0.8, alpha: inv(t, 0.05, 0.35) })
    for (let i = 0; i < n; i++) {
      const tin = inv(t, 0.25 + i * 0.18, 0.8 + i * 0.18); if (tin <= 0) continue
      const x = colW * (i + 0.5), sp = spring(tin, { zeta: 0.5, freq: 2 })
      ctx.save(); ctx.globalAlpha = tin; ctx.translate(x, cy); ctx.scale(0.85 + 0.15 * sp, 0.85 + 0.15 * sp)
      drawText(ctx, nums[i] || '—', 0, -8, { size: 52, weight: 800, family: fonts.display, maxW: colW - 16, color: pal.ink })
      ctx.restore()
      drawWrapped(ctx, labels[i] || '', x, cy + 44, { size: 16, weight: 700, family: fonts.text, maxW: colW - 18, color: pal.dim, maxLines: 2, alpha: tin })
      // separador vertical entre columnas
      if (i < n - 1) { const dh = eOutCubic(inv(t, 0.2, 0.9)); ctx.save(); ctx.strokeStyle = rgba(pal.ink, 0.12); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(colW * (i + 1), cy - 40 * dh); ctx.lineTo(colW * (i + 1), cy + 50 * dh); ctx.stroke(); ctx.restore() }
    }
  },
})

// ---- social/proof ----------------------------------------------------------

register({
  id: 'scene.social.proof', lib: 'scene-layouts', category: 'social/proof', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['prueba-social', 'cita', 'estrellas', 'rating'], beat: 'proof',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, cx = W / 2
    // 5 estrellas que se llenan de izq a der (DECO)
    const fillP = eOutCubic(inv(t, 0.2, 1.0)) * 5, sr = 15, gap = 40, x0 = cx - gap * 2
    for (let i = 0; i < 5; i++) { const f = clamp(fillP - i, 0, 1); star(ctx, x0 + i * gap, H * 0.32, sr, f, pal.accent, rgba(pal.ink, 0.14)) }
    // cita/testimonio en tinta
    ctx.save(); ctx.globalAlpha = inv(t, 0.35, 0.85)
    drawWrapped(ctx, content.claim || content.tagline || 'Cambio como trabajamos', cx, H * 0.5, { size: 30, weight: 700, family: fonts.display, maxW: W * 0.8, color: pal.ink, maxLines: 4, lh: 1.2 })
    ctx.restore()
    // atribucion
    if (content.brand) {
      const ap = inv(t, 0.7, 1.2)
      ctx.fillStyle = pal.accent; ctx.globalAlpha = ap
      ctx.beginPath(); ctx.roundRect(cx - 16, H * 0.64, 32 * eOutCubic(ap), 3, 1.5); ctx.fill(); ctx.globalAlpha = 1
      drawText(ctx, content.brand, cx, H * 0.68, { size: 18, weight: 700, family: fonts.accent || fonts.text, color: pal.dim, maxW: W * 0.7, alpha: ap })
    }
  },
})

// ---- closers/outro ---------------------------------------------------------

register({
  id: 'scene.outro.lockup', lib: 'scene-layouts', category: 'closers/outro', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['cierre', 'marca', 'lockup'], beat: 'close',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, cx = W / 2, cy = H * 0.44
    // monograma: inicial de la marca en un cuadro de acento
    const init = (content.brand || 'M').trim().charAt(0).toUpperCase()
    const sp = spring(inv(t, 0.1, 0.9), { zeta: 0.5, freq: 2 }), s = 0.8 + 0.2 * sp
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
    const { pal, content, fonts } = env, cx = W / 2
    drawText(ctx, content.brand || 'Marca', cx, H * 0.4, { size: 46, weight: 800, family: fonts.display, maxW: W * 0.84, color: pal.ink, alpha: inv(t, 0.15, 0.7) })
    // pildora CTA rellena de acento que crece
    const cta = content.cta || 'Sumate hoy'
    const gp = spring(inv(t, 0.5, 1.2), { zeta: 0.5, freq: 2 })
    ctx.save(); ctx.font = `800 26px "${fonts.display}"`
    const tw = Math.min(W * 0.7, ctx.measureText(cta).width), pw = tw + 56, ph = 56, py = H * 0.52
    ctx.translate(cx, py + ph / 2); ctx.scale(0.85 + 0.15 * gp, 0.85 + 0.15 * gp); ctx.globalAlpha = inv(t, 0.5, 0.9)
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(-pw / 2, -ph / 2, pw, ph, ph / 2); ctx.fill()
    drawText(ctx, cta, 0, 1, { size: 26, weight: 800, family: fonts.display, maxW: pw - 36, color: pal.onAccent })
    ctx.restore()
    if (content.tagline) drawText(ctx, content.tagline, cx, H * 0.66, { size: 18, weight: 600, family: fonts.text, maxW: W * 0.78, color: pal.dim, alpha: inv(t, 0.8, 1.3) })
  },
})
