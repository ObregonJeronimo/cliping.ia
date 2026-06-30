// urvid 1.0 · biblioteca SCENE-LAYOUTS — plantillas de escena que dibujan el CONTENIDO. render(ctx, t, env).
// env = { pal, content, fonts, seed, energy, sceneDur }. content = { brand, tagline, claim, cta, ... }.
// Usan la PALETA + la primitiva de texto (no-desborde garantizado) + motion. REGLA: texto en tinta (ink/inkText),
// acento para DECO (barras/reglas). El director elige la escena segun el beat narrativo (hook/value/proof/close).
import { register, get } from '../../core/registry.js'
import { drawText, drawWrapped, fitUniform } from '../../core/text.js'
import { W, H, TAU, inv, lerp, clamp, eOutCubic, eOutBack, eInOutCubic, spring, smooth, rgba } from '../../core/util.js'
import { mulberry32 } from '../../core/prng.js'
import { defaultMotion } from '../../core/motion.js'
import { defaultTypekit } from '../../core/typekit.js'
import { place } from '../../core/layout.js'

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
// fallback '' = NO inventa: antes devolvia '100%'/'64%'/etc -> una cifra FALSA con la marca encima (riesgo en
// salud/finanzas, y desmiente el pitch "fiel a la pagina"). Los llamadores honestos pasan '' y degradan a texto.
function bigNumber(str, fallback = '') {
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
function statAt(content, i, fb = '') {
  const s = content && Array.isArray(content.stats) ? content.stats[i] : null
  if (s && (s.value || s.value === 0)) return { value: String(s.value), label: shortLabel(s.label || (content && content.tagline) || '', 3) }
  return { value: bigNumber((content && (content.claim || content.tagline)), fb), label: shortLabel((content && (content.tagline || content.brand)) || '', 3) }
}
// numFrom: el numero REAL a destacar (1ra stat real de la perception, o una cifra REAL del claim/tagline) o ''
// si no hay ninguno. NUNCA inventa -> el llamador, si recibe '', degrada a un gancho de TEXTO (bigText).
function numFrom(content) {
  const s = content && Array.isArray(content.stats) ? content.stats.find(x => x && (x.value || x.value === 0)) : null
  if (s) return String(s.value)
  return bigNumber(content && (content.claim || content.tagline), '')
}
// statLabel: la ETIQUETA real del dato (que SIGNIFICA el numero). La bajada de un "92%" deberia ser "satisfaccion",
// no el tagline suelto que no explica el numero (por eso una escena de dato "no decia nada", era cifra + frase aparte).
function statLabel(content) {
  const s = content && Array.isArray(content.stats) ? content.stats.find(x => x && (x.value || x.value === 0)) : null
  return (s && s.label) ? String(s.label) : ''
}
// proofFrom: SOLO el testimonio REAL de la perception ('' si no hay). NO recicla el claim como si fuera una resena.
function proofFrom(content) { return (content && content.proof) || '' }
// bigText: fallback honesto cuando no hay numero/dato real -> dibuja el gancho de texto en grande (el fitter achica).
function bigText(ctx, str, cx, cy, fonts, pal, alpha = 1) {
  drawWrapped(ctx, str || '', cx, cy, { size: 62, weight: 800, family: fonts.display, maxW: W * 0.84, color: pal.ink, maxLines: 3, lh: 1.12, alpha, shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.4)' : null })
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

// ============================================================================
// VIDA CONTINUA (helpers de fluidez) — micro-movimiento SECUNDARIO via t para que la DECO/acento NUNCA quede
// muerta-estatica tras la entrada. Sutil y CONTINUO (sin(t*0.5..1.4)). El TEXTO no se mueve: estos helpers son
// para barras/reglas/arcos/iconos/chips (acento). DETERMINISTA: solo t (cero random/Date.now).
// ============================================================================
// pulso suave 0..1 (respiracion): centrado en 1, amplitud `amp`, periodo via `sp` (rad/s), fase `ph`.
const breathe = (t, sp = 1.0, amp = 0.012, ph = 0) => 1 + amp * Math.sin(t * sp + ph)
// oscilacion -1..1 (deriva/parpadeo): amplitud `amp`, periodo via `sp`, fase `ph`.
const drift = (t, sp = 0.9, amp = 1, ph = 0) => amp * Math.sin(t * sp + ph)
// sheen: posicion 0..1 de un brillo que RECORRE de izq a der en loop (triangular suave, periodo `per` seg, fase `ph`).
function sheenPos(t, per = 3.0, ph = 0) { const u = (((t / per) + ph) % 1 + 1) % 1; return u }
// dibuja un SHEEN (banda de brillo) que recorre una barra/regla horizontal redondeada (x,y,w,h).
// color = el del acento; el brillo es un blanco translucido que se desplaza. CONTINUO via t. Sutil.
function rrSheen(ctx, x, y, w, h, t, { per = 3.2, ph = 0, strength = 0.5, tone = 'dark' } = {}) {
  if (w <= 2) return
  const u = sheenPos(t, per, ph), bandW = Math.max(18, w * 0.28), cxp = x - bandW + (w + bandW * 2) * u
  ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, w, h, Math.min(h / 2, h)); ctx.clip()
  const g = ctx.createLinearGradient(cxp - bandW / 2, 0, cxp + bandW / 2, 0)
  const a = strength * (tone === 'light' ? 0.5 : 1)
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, `rgba(255,255,255,${clamp(a, 0, 1)})`); g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h); ctx.restore()
}
// glow pulsante para un trazo (set shadow). Devuelve; el caller debe envolver en save/restore.
function pulseGlow(ctx, color, t, { sp = 1.1, base = 4, amp = 5, ph = 0 } = {}) {
  ctx.shadowColor = color; ctx.shadowBlur = base + amp * (0.5 + 0.5 * Math.sin(t * sp + ph))
}
// punto de brillo que ORBITA un arco (cx,cy,R) recorriendo el rango [a0, a0+span] en loop (continuo via t).
// Para dar vida a anillos/donuts/dials/gauges ya dibujados. dotR pequeno, blanco/acento translucido.
function arcSheenDot(ctx, cx, cy, R, a0, span, t, { per = 4.0, dotR = 3.2, color = '#fff', tone = 'dark' } = {}) {
  const u = sheenPos(t, per), ang = a0 + span * u
  ctx.save(); ctx.globalAlpha = tone === 'light' ? 0.6 : 0.9; ctx.fillStyle = color
  ctx.shadowColor = color; ctx.shadowBlur = 6
  ctx.beginPath(); ctx.arc(cx + Math.cos(ang) * R, cy + Math.sin(ang) * R, dotR, 0, TAU); ctx.fill(); ctx.restore()
}

register({
  id: 'scene.hero.center', lib: 'scene-layouts', category: 'openers/hero', tones: ['dark', 'light'], rubros: ['*'], weight: 1.3,
  register: 'neutral', intensity: 'medium', tags: ['apertura', 'tipografico', 'centrado'], beat: 'hook',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK
    // SLOTS: el solver de layout ubica la marca (titulo) y el tagline (subtitulo) llenando el area segura
    // segun el layout elegido (centrado/editorial/poster/anclado) y el formato. Antes era H*0.4 fijo.
    const L = place(env, [
      { id: 'brand', kind: 'title', text: content.brand || 'Marca' },
      content.tagline ? { id: 'tag', kind: 'subtitle', text: content.tagline } : null,
    ]), b = L.brand
    // wordmark con asentamiento spring, anclado a su slot
    const ap = M.settle(inv(t, 0.15, 1.1), { zeta: 0.5, freq: 2.0 }), sc = 0.92 + 0.08 * ap
    ctx.save(); ctx.globalAlpha = inv(t, 0.1, 0.4); ctx.translate(b.cx, b.cy); ctx.scale(sc, sc)
    drawText(ctx, content.brand || 'Marca', 0, 0, { size: b.size, weight: 800, family: fonts.display, maxW: b.w, align: b.align, color: pal.ink, shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.4)' : null })
    ctx.restore()
    // regla de acento bajo el wordmark (DECO) + VIDA: respira de ancho y un sheen la recorre en loop
    const ru = M.ease(inv(t, 0.5, 1.1)), rw = 80 * ru * breathe(t, 0.9, 0.02)
    const rx = b.align === 'left' ? b.x : b.cx - rw / 2, ry = b.y + b.h + 6
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(rx, ry, rw, 5, 2.5); ctx.fill()
    if (ru > 0.9) rrSheen(ctx, rx, ry, rw, 5, t, { per: 3.0, strength: 0.55, tone: pal.tone })
    // tagline en su slot
    if (content.tagline && L.tag) drawWrapped(ctx, content.tagline, L.tag.cx, L.tag.cy, { size: Math.min(L.tag.size, 26), weight: 600, family: fonts.text, maxW: L.tag.w, align: L.tag.align, color: pal.dim, alpha: inv(t, 0.7, 1.3), maxLines: 2 })
  },
})

// SHOWCASE A SANGRE (slot-media) — ESPEJO de src/urvid. Foto real cover-crop + scrim + brand/claim/cta blanco. weight:0
// (nunca sorteada; entra por ruteo-por-presencia de assemble). Sin foto DEGRADA a hero.center (hero tipografico valido).
register({
  id: 'scene.showcase.fullbleed', lib: 'scene-layouts', category: 'openers/hero', tones: ['dark', 'light'], rubros: ['*'], weight: 0,
  register: 'editorial', intensity: 'bold', tags: ['apertura', 'foto', 'full-bleed'], beat: 'hook',
  render(ctx, t, env) {
    const { content, fonts, pal } = env
    const img = (env.getImg && env.mediaImage) ? env.getImg(env.mediaImage) : null
    if (!img) { const h = get('scene.hero.center'); if (h && h.render !== this.render) return h.render(ctx, t, env); return }
    const ar = (img.width || 1) / (img.height || 1), vr = W / H
    let dw, dh; if (ar > vr) { dh = H; dw = H * ar } else { dw = W; dh = W / ar }
    const kb = 1.05 - 0.05 * eOutCubic(inv(t, 0, 1.4)); dw *= kb; dh *= kb
    ctx.save(); ctx.globalAlpha = inv(t, 0, 0.45); ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh); ctx.restore()
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, 'rgba(0,0,0,0.30)'); g.addColorStop(0.40, 'rgba(0,0,0,0.05)'); g.addColorStop(0.66, 'rgba(0,0,0,0.36)'); g.addColorStop(1, 'rgba(0,0,0,0.76)')
    ctx.save(); ctx.globalAlpha = inv(t, 0.1, 0.55); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore()
    const sh = 'rgba(0,0,0,0.6)', mx = W * 0.08, maxW = W * 0.84
    drawText(ctx, (content.brand || 'Marca').toUpperCase(), mx, H * 0.645, { size: 18, weight: 700, family: fonts.accent || fonts.text, maxW, align: 'left', color: '#ffffff', alpha: inv(t, 0.3, 0.7), shadow: sh })
    const rise = spring(inv(t, 0.35, 1.1), { zeta: 0.6, freq: 2.0 })
    ctx.save(); ctx.translate(0, (1 - rise) * 28)
    drawWrapped(ctx, content.claim || content.tagline || 'Un mensaje claro', mx, H * 0.74, { size: 46, weight: 800, family: fonts.display, maxW, align: 'left', color: '#ffffff', maxLines: 3, lh: 1.07, alpha: inv(t, 0.35, 0.78), shadow: sh })
    ctx.restore()
    if (content.cta) {
      const ca = inv(t, 0.6, 1.0); if (ca > 0) {
        const cy = H * 0.875, ch = 46, pad = 22
        ctx.save(); ctx.font = `700 20px "${fonts.text}"`
        const cw = Math.min(ctx.measureText(content.cta).width + pad * 2, maxW)
        ctx.globalAlpha = ca; ctx.fillStyle = (pal && pal.accent) || '#ffffff'; ctx.beginPath(); ctx.roundRect(mx, cy - ch / 2, cw, ch, ch / 2); ctx.fill()
        ctx.restore()
        drawText(ctx, content.cta, mx + cw / 2, cy, { size: 20, weight: 700, family: fonts.text, maxW: cw - pad, align: 'center', color: (pal && pal.onAccent) || '#000000', alpha: ca })
      }
    }
  },
})

register({
  id: 'scene.statement.editorial', lib: 'scene-layouts', category: 'statements/editorial', tones: ['dark', 'light'], rubros: ['moda', 'belleza', 'inmobiliaria', 'default'], weight: 1,
  register: 'editorial', intensity: 'medium', tags: ['claim', 'editorial', 'izquierda'], beat: 'value',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK
    // SLOT: el claim como titular, ubicado por el layout (llena + se adapta; antes ax=W*0.12 / H*0.46 fijos)
    const L = place(env, [{ id: 'claim', kind: 'title', text: content.claim || content.tagline || 'Un mensaje claro' }]), c = L.claim
    // barra de acento SOBRE el titular (DECO) + VIDA: respira de ancho y un sheen la recorre
    const mr = M.ease(inv(t, 0.05, 0.5)), mbw = 66 * mr * breathe(t, 1.0, 0.022)
    const bx = c.align === 'left' ? c.x : c.cx - mbw / 2, by = c.y - c.h / 2 - 16
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(bx, by, mbw, 6, 3); ctx.fill()
    if (mr > 0.9) rrSheen(ctx, bx, by, mbw, 6, t, { per: 2.8, strength: 0.55, tone: pal.tone })
    // claim en su slot, envuelto, con slide-in
    ctx.save(); ctx.globalAlpha = inv(t, 0.15, 0.6); ctx.translate((1 - M.ease(inv(t, 0.15, 0.7))) * 24, 0)
    drawWrapped(ctx, content.claim || content.tagline || 'Un mensaje claro', c.cx, c.cy, { size: c.size, weight: 800, family: fonts.display, maxW: c.w, color: pal.ink, align: c.align, maxLines: 4, lh: 1.16, shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.5)' : null })
    ctx.restore()
  },
})

register({
  id: 'scene.outro.cta', lib: 'scene-layouts', category: 'closers/outro', tones: ['dark', 'light'], rubros: ['*'], weight: 1.2,
  register: 'neutral', intensity: 'medium', tags: ['cierre', 'cta', 'chevron'], beat: 'close',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK
    // SLOTS: marca (titulo) + cta ubicados por el layout (antes cx / cy=H*0.42 + offsets fijos)
    const L = place(env, [
      { id: 'brand', kind: 'title', text: content.brand || 'Marca' },
      content.cta ? { id: 'cta', kind: 'cta', text: content.cta } : null,
    ]), b = L.brand
    drawText(ctx, content.brand || 'Marca', b.cx, b.cy, { size: Math.min(b.size, 54), weight: 800, family: fonts.display, maxW: b.w, color: pal.ink, align: b.align, alpha: inv(t, 0.2, 0.9) })
    // regla de acento bajo la marca + VIDA: respira + sheen
    const barY = b.y + b.h + 6, bar = M.ease(inv(t, 0.5, 1.1)), bw = 120 * bar * breathe(t, 0.85, 0.02)
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(b.cx - bw / 2, barY, bw, 5, 3); ctx.fill()
    if (bar > 0.9) rrSheen(ctx, b.cx - bw / 2, barY, bw, 5, t, { per: 3.0, strength: 0.55, tone: pal.tone })
    // CTA: texto en TINTA-acento (legible) + subrayado en acento (DECO) + chevron, en su slot
    const cta = inv(t, 1.0, 1.6)
    if (cta > 0 && content.cta && L.cta) {
      const ct = L.cta, sc = M.settle(cta, { zeta: 0.5, freq: 2.0 })
      ctx.save(); ctx.translate(ct.cx, ct.cy); ctx.scale(0.94 + 0.06 * sc, 0.94 + 0.06 * sc)
      const fs = drawText(ctx, content.cta, 0, 0, { size: Math.min(ct.size, 28), weight: 800, family: fonts.display, maxW: ct.w, color: pal.inkText })
      ctx.font = `800 ${fs}px "${fonts.display}"`; const tw = Math.min(ct.w, ctx.measureText(content.cta).width)
      const up = M.ease(inv(t, 1.3, 1.9))
      ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(-tw / 2, fs * 0.62, tw * up, 5, 2.5); ctx.fill()
      if (inv(t, 1.6, 2.0) > 0) { ctx.save(); ctx.strokeStyle = pal.accent; ctx.lineWidth = 4; ctx.lineCap = 'round'; pulseGlow(ctx, pal.accent, t, { sp: 1.3, base: 2, amp: 6 }); const ay = fs * 0.62 + 22 + drift(t, 1.1, 1.2); ctx.beginPath(); ctx.moveTo(-13, ay); ctx.lineTo(0, ay + 11); ctx.lineTo(13, ay); ctx.stroke(); ctx.restore() }
      ctx.restore()
    }
  },
})

// ============================================================================
// EXPANSION (ronda fill) — mas openers, statements, lists, data, social, closers.
// ============================================================================

// ---- openers/hero ----------------------------------------------------------

register({
  id: 'scene.hero.stacked', lib: 'scene-layouts', category: 'openers/hero', tones: ['dark', 'light'], rubros: ['moda', 'belleza', 'inmobiliaria', 'default'], weight: 1.1,
  register: 'editorial', intensity: 'bold', tags: ['apertura', 'editorial', 'masivo', 'izquierda'], beat: 'hook',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK
    // SLOTS: kicker (marca) + claim (titular) ubicados por el layout (llena + se adapta; antes ax fijo / H*0.3/0.46)
    const claimSrc = content.claim || content.tagline || content.brand || 'Una idea grande'
    const L = place(env, [
      { id: 'kick', kind: 'kicker', text: content.brand || 'Marca' },
      { id: 'claim', kind: 'title', text: claimSrc },
    ]), k = L.kick, c = L.claim
    // marca chica arriba (kicker en acento), en su slot
    drawText(ctx, (content.brand || 'Marca').toUpperCase(), k.cx, k.cy, { size: Math.min(k.size, 18), weight: 700, family: fonts.accent || fonts.text, maxW: k.w, color: pal.inkText, align: k.align, alpha: inv(t, 0.05, 0.4) })
    // claim grande, en su slot, en 2-3 lineas, stagger por subida
    const rise = M.settle(inv(t, 0.2, 0.95), 1.3)
    ctx.save(); ctx.globalAlpha = inv(t, 0.2, 0.7); ctx.translate(0, (1 - rise) * 40)
    drawWrapped(ctx, claimSrc, c.cx, c.cy, { size: Math.min(c.size, 50), weight: 800, family: fonts.display, maxW: c.w, color: pal.ink, align: c.align, maxLines: 3, lh: 1.08, shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.45)' : null })
    ctx.restore()
    // regla inferior que barre, anclada bajo el slot del claim + VIDA: sheen recorriendola en loop
    const rx = c.x, ry = c.y + c.h + 8, ru = M.ease(inv(t, 0.7, 1.3)), rw = c.w * ru
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(rx, ry, rw, 5, 2.5); ctx.fill()
    if (ru > 0.9) rrSheen(ctx, rx, ry, rw, 5, t, { per: 3.4, strength: 0.5, tone: pal.tone })
  },
})

register({
  id: 'scene.hero.framed', lib: 'scene-layouts', category: 'openers/hero', tones: ['dark', 'light'], rubros: ['moda', 'belleza', 'inmobiliaria', 'default'], weight: 1,
  register: 'editorial', intensity: 'medium', tags: ['apertura', 'marco', 'premium', 'centrado'], beat: 'hook',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2, cy = H * 0.42
    // marco rectangular que se dibuja (draw-on por perimetro)
    const m = 46, x0 = m, y0 = H * 0.24, x1 = W - m, y1 = H * 0.6
    const dp = M.ease(inv(t, 0.1, 0.9)), perim = 2 * ((x1 - x0) + (y1 - y0)), seg = perim * dp
    ctx.save(); ctx.strokeStyle = pal.accent; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'
    if (dp > 0.95) pulseGlow(ctx, pal.accent, t, { sp: 1.0, base: 2, amp: 5 })   // VIDA: glow que respira en el marco ya cerrado
    ctx.beginPath()
    let rem = seg
    const edges = [[x0, y0, x1, y0], [x1, y0, x1, y1], [x1, y1, x0, y1], [x0, y1, x0, y0]]
    ctx.moveTo(x0, y0)
    for (const [ax, ay, bx, by] of edges) { const len = Math.hypot(bx - ax, by - ay); const f = clamp(rem / len, 0, 1); ctx.lineTo(lerp(ax, bx, f), lerp(ay, by, f)); rem -= len; if (rem <= 0) break }
    ctx.stroke(); ctx.restore()
    // VIDA: un punto de brillo que recorre el perimetro del marco en loop continuo (DECO)
    if (dp > 0.95) {
      const u = sheenPos(t, 5.0), edges2 = [[x0, y0, x1, y0], [x1, y0, x1, y1], [x1, y1, x0, y1], [x0, y1, x0, y0]]
      let acc = u * perim, dx = x0, dy = y0
      for (const [ax, ay, bx, by] of edges2) { const len = Math.hypot(bx - ax, by - ay); if (acc <= len) { const f = acc / len; dx = lerp(ax, bx, f); dy = lerp(ay, by, f); break } acc -= len }
      ctx.save(); ctx.fillStyle = pal.accent; pulseGlow(ctx, pal.accent, t, { sp: 1.0, base: 4, amp: 4 })
      ctx.beginPath(); ctx.arc(dx, dy, 3.2, 0, TAU); ctx.fill(); ctx.restore()
    }
    // marca centrada dentro
    drawText(ctx, content.brand || 'Marca', cx, cy - 8, { size: 46, weight: 800, family: fonts.display, maxW: (x1 - x0) - 24, color: pal.ink, alpha: inv(t, 0.45, 0.95) })
    if (content.tagline) drawWrapped(ctx, content.tagline, cx, cy + 34, { size: 18, weight: 600, family: fonts.text, maxW: (x1 - x0) - 30, color: pal.dim, alpha: inv(t, 0.7, 1.2), maxLines: 2 })
  },
})

// ---- openers/hook ----------------------------------------------------------

register({
  id: 'scene.hook.question', lib: 'scene-layouts', category: 'openers/hook', tones: ['dark', 'light'], rubros: ['*'], weight: 1.2,
  register: 'friendly', intensity: 'medium', tags: ['hook', 'pregunta', 'gancho'], beat: 'hook',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2
    // SLOT: la pregunta como titulo, ubicada por el layout (antes H*0.5 fijo); el "?" y el cursor se anclan a ella
    const qSrc = content.tagline || content.claim || '¿Y si fuera mas facil?'
    const L = place(env, [{ id: 'q', kind: 'title', text: qSrc }]), q = L.q
    // signo de pregunta gigante de fondo (DECO en acento tenue) centrado sobre el slot + VIDA: respira de escala/opacidad
    ctx.save(); ctx.globalAlpha = (pal.tone === 'light' ? 0.07 : 0.12) * inv(t, 0.0, 0.5) * breathe(t, 0.7, 0.12)
    const qScale = lerp(0.9, 1, M.ease(inv(t, 0, 0.8))) * breathe(t, 0.6, 0.012)
    drawText(ctx, '?', q.cx, q.cy - q.h * 0.32, { size: 300 * qScale, weight: 800, family: fonts.display, color: pal.accent })
    ctx.restore()
    // pregunta real, envuelta, en tinta, en su slot
    ctx.save(); ctx.globalAlpha = inv(t, 0.25, 0.75)
    TK.drawWrapped(ctx, qSrc, q.cx, q.cy, { reveal: inv(t, 0.25, 1.05), size: Math.min(q.size, 38), weight: 800, family: fonts.display, maxW: q.w, color: pal.ink, align: q.align, maxLines: 3, lh: 1.14, shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.5)' : null })
    ctx.restore()
    // cursor/linea de respuesta que parpadea por t (determinista) bajo el slot — pulso SUAVE (no on/off abrupto)
    const cuX = q.align === 'left' ? q.x + 26 : q.cx, cuY = q.y + q.h + 18
    const blink = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 4.2))
    ctx.fillStyle = pal.accent; ctx.globalAlpha = inv(t, 0.9, 1.2) * blink
    ctx.beginPath(); ctx.roundRect(cuX - 26, cuY, 52, 4, 2); ctx.fill(); ctx.globalAlpha = 1
  },
})

register({
  id: 'scene.hook.bignum', lib: 'scene-layouts', category: 'openers/hook', tones: ['dark', 'light'], rubros: ['tech', 'finanzas', 'fitness', 'default'], weight: 1,
  register: 'neutral', intensity: 'bold', tags: ['hook', 'dato', 'impacto', 'numero'], beat: 'hook',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2
    const num = numFrom(content); if (!num) { bigText(ctx, content.tagline || content.claim || content.brand, cx, H * 0.42, fonts, pal, inv(t, 0.1, 0.5)); return }
    // SLOTS: numero gigante (stat) + contexto (subtitulo) ubicados por el layout (antes H*0.4/0.58 fijos)
    const ctxSrc = content.tagline || content.claim || 'el cambio que importa'
    const L = place(env, [
      { id: 'num', kind: 'stat', text: num },
      { id: 'ctx', kind: 'subtitle', text: ctxSrc },
    ]), nS = L.num, cS = L.ctx
    // numero gigante: entra con spring de escala y luego queda PIXEL-ESTABLE (sin breathe -> no shimmer en el glifo);
    // la vida continua la da la regla de acento de abajo (DECO que respira + sheen)
    const sp = M.settle(inv(t, 0.1, 1.0), { zeta: 0.45, freq: 2.1 }), sc = 0.7 + 0.3 * sp
    ctx.save(); ctx.globalAlpha = inv(t, 0.05, 0.4); ctx.translate(nS.cx, nS.cy); ctx.scale(sc, sc)
    drawText(ctx, num, 0, 0, { size: Math.min(nS.size, 150), weight: 800, family: fonts.display, maxW: nS.w, color: pal.inkText, align: nS.align, shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.5)' : null })
    ctx.restore()
    // VIDA: regla de acento bajo el numero, respira + sheen (DECO, continua)
    const rcx = nS.cx, ru = M.ease(inv(t, 0.45, 1.0)), rw = 70 * ru * breathe(t, 0.9, 0.025), ry = nS.y + nS.h + 2
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(rcx - rw / 2, ry, rw, 5, 2.5); ctx.fill()
    if (ru > 0.9) rrSheen(ctx, rcx - rw / 2, ry, rw, 5, t, { per: 3.0, strength: 0.5, tone: pal.tone })
    // contexto debajo, en su slot
    drawWrapped(ctx, ctxSrc, cS.cx, cS.cy, { size: Math.min(cS.size, 24), weight: 700, family: fonts.text, maxW: cS.w, color: pal.ink, align: cS.align, alpha: inv(t, 0.5, 1.0), maxLines: 2 })
  },
})

// ---- statements/editorial --------------------------------------------------

register({
  id: 'scene.statement.quoted', lib: 'scene-layouts', category: 'statements/editorial', tones: ['dark', 'light'], rubros: ['moda', 'belleza', 'inmobiliaria', 'default'], weight: 1,
  register: 'editorial', intensity: 'medium', tags: ['claim', 'cita', 'editorial'], beat: 'value',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK
    // SLOTS: claim (titular) + firma (footnote) ubicados por el layout (antes ax=W*0.14 / H*0.49 fijos)
    const claimSrc = content.claim || content.tagline || 'Lo simple escala'
    const L = place(env, [
      { id: 'claim', kind: 'title', text: claimSrc },
      content.brand ? { id: 'sig', kind: 'footnote', text: '— ' + content.brand } : null,
    ]), c = L.claim
    // comilla gigante de apertura (DECO), anclada arriba-izq del slot del claim + VIDA: respira de escala/opacidad continua
    ctx.save(); ctx.globalAlpha = (pal.tone === 'light' ? 0.16 : 0.22) * inv(t, 0.0, 0.5) * breathe(t, 0.7, 0.08)
    ctx.translate(c.x + 4, c.cy - c.h / 2 - 8); ctx.scale(breathe(t, 0.6, 0.015), breathe(t, 0.6, 0.015))
    drawText(ctx, '“', 0, 0, { size: 150, weight: 800, family: fonts.display, color: pal.accent, align: 'left' })
    ctx.restore()
    // claim en su slot, reveal por linea (mascara que sube)
    ctx.save(); ctx.globalAlpha = inv(t, 0.2, 0.7); ctx.translate((1 - M.ease(inv(t, 0.2, 0.85))) * 22, 0)
    drawWrapped(ctx, claimSrc, c.cx, c.cy, { size: Math.min(c.size, 40), weight: 800, family: fonts.display, maxW: c.w, color: pal.ink, align: c.align, maxLines: 4, lh: 1.18 })
    ctx.restore()
    // firma de marca, en su slot
    if (content.brand && L.sig) drawText(ctx, '— ' + content.brand, L.sig.cx, L.sig.cy, { size: Math.min(L.sig.size, 18), weight: 700, family: fonts.accent || fonts.text, color: pal.inkText, align: L.sig.align, maxW: L.sig.w, alpha: inv(t, 0.7, 1.2) })
  },
})

register({
  id: 'scene.statement.boxed', lib: 'scene-layouts', category: 'statements/editorial', tones: ['dark', 'light'], rubros: ['*'], weight: 0.9,
  register: 'neutral', intensity: 'medium', tags: ['claim', 'panel', 'destacado'], beat: 'value',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2
    // panel surface centrado que crece
    const gp = M.ease(inv(t, 0.1, 0.8)), pw = W * 0.78, ph = H * 0.3, py = H * 0.36
    ctx.save(); ctx.translate(cx, py + ph / 2); ctx.scale(lerp(0.9, 1, gp), lerp(0.9, 1, gp)); ctx.translate(-cx, -(py + ph / 2))
    ctx.globalAlpha = gp
    ctx.fillStyle = pal.tone === 'light' ? 'rgba(20,16,24,0.04)' : 'rgba(255,255,255,0.05)'
    ctx.beginPath(); ctx.roundRect(cx - pw / 2, py, pw, ph, 18); ctx.fill()
    // borde de acento a la izquierda del panel + VIDA: glow que respira en el borde
    ctx.save(); if (gp > 0.9) pulseGlow(ctx, pal.accent, t, { sp: 1.0, base: 2, amp: 5 })
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(cx - pw / 2, py, 6, ph, 3); ctx.fill(); ctx.restore()
    ctx.restore()
    // VIDA: punto de brillo que recorre el borde de acento de arriba a abajo en loop (DECO)
    if (gp > 0.95) { const u = sheenPos(t, 3.6), dy = py + 8 + (ph - 16) * u; ctx.save(); ctx.fillStyle = 'rgba(255,255,255,' + (pal.tone === 'light' ? 0.5 : 0.85) + ')'; ctx.beginPath(); ctx.arc(cx - pw / 2 + 3, dy, 2.6, 0, TAU); ctx.fill(); ctx.restore() }
    // claim dentro
    TK.drawWrapped(ctx, content.claim || content.tagline || 'Tu mensaje, claro', cx, py + ph / 2, { reveal: inv(t, 0.4, 1.05), size: 32, weight: 800, family: fonts.display, maxW: pw - 48, color: pal.ink, maxLines: 4, lh: 1.16, alpha: inv(t, 0.4, 0.9) })
  },
})

// ---- lists/checklist -------------------------------------------------------

register({
  id: 'scene.checklist.ticks', lib: 'scene-layouts', category: 'lists/checklist', tones: ['dark', 'light'], rubros: ['*'], weight: 1.2,
  register: 'neutral', intensity: 'medium', tags: ['lista', 'checklist', 'beneficios'], beat: 'value',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK
    const items = listFrom(content, 'Rapido · Simple · Confiable', 4)
    // SLOTS: kicker (marca) arriba + region de lista; los items se centran en la region (antes y0/ax fijos)
    const L = place(env, [
      content.brand ? { id: 'kick', kind: 'kicker', text: content.brand } : null,
      { id: 'list', kind: 'list', text: items.join(' · ') },
    ])
    if (content.brand && L.kick) drawText(ctx, (content.brand || '').toUpperCase(), L.kick.cx, L.kick.cy, { size: Math.min(L.kick.size, 18), weight: 700, family: fonts.accent || fonts.text, color: pal.inkText, align: L.kick.align, maxW: L.kick.w, alpha: inv(t, 0.05, 0.35) })
    const lr = L.list, ax = lr.x, n = Math.max(1, items.length)
    const gap = Math.min(78, lr.h / n), y0 = lr.cy - (n - 1) * gap / 2
    const fs = fitUniform(ctx, items, 26, lr.w - 48, 14, 700, fonts.text)   // UN tamano para toda la lista (no disparejo)
    items.forEach((it, i) => {
      const tin = inv(t, 0.2 + i * 0.18, 0.7 + i * 0.18)
      if (tin <= 0) return
      const y = y0 + i * gap
      // circulo de check + VIDA: respiracion suave del disco de acento (fase por item)
      ctx.save(); ctx.globalAlpha = tin
      const cr = 17, pb = breathe(t, 1.1, 0.03, i * 1.3)
      ctx.translate(ax + cr, y); ctx.scale(pb, pb)
      ctx.fillStyle = rgba(pal.accent, pal.tone === 'light' ? 0.16 : 0.22); ctx.beginPath(); ctx.arc(0, 0, cr, 0, TAU); ctx.fill()
      tick(ctx, 0, 0, cr, M.ease(tin), pal.inkText, 3.2)
      ctx.restore()
      // texto del item
      ctx.save(); ctx.globalAlpha = tin; ctx.translate((1 - M.ease(tin)) * 16, 0)
      drawText(ctx, it, ax + cr * 2 + 14, y, { size: fs, weight: 700, family: fonts.text, maxW: lr.w - (cr * 2 + 14), color: pal.ink, align: 'left' })
      ctx.restore()
    })
  },
})

register({
  id: 'scene.checklist.numbered', lib: 'scene-layouts', category: 'lists/checklist', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  register: 'neutral', intensity: 'medium', tags: ['lista', 'pasos', 'numerada'], beat: 'value',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, ax = W * 0.13
    const items = listFrom(content, 'Conecta · Configura · Lanza', 4)
    drawText(ctx, content.brand ? (content.brand + '').toUpperCase() : 'COMO FUNCIONA', ax, H * 0.25, { size: 16, weight: 700, family: fonts.accent || fonts.text, color: pal.inkText, align: 'left', maxW: W * 0.74, alpha: inv(t, 0.05, 0.35) })
    const y0 = H * 0.35, gap = Math.min(82, (H * 0.48) / Math.max(1, items.length))
    const fs = fitUniform(ctx, items, 25, W - (ax + 50) - W * 0.08, 14, 700, fonts.text)   // UN tamano para toda la lista
    items.forEach((it, i) => {
      const tin = inv(t, 0.2 + i * 0.2, 0.7 + i * 0.2)
      if (tin <= 0) return
      const y = y0 + i * gap, sp = M.settle(tin, { zeta: 0.5, freq: 2 })
      // numero en pildora de acento + VIDA: la pildora respira (fase por item), el numero no se mueve
      ctx.save(); ctx.globalAlpha = tin; ctx.translate(ax + 20, y)
      ctx.save(); ctx.scale((0.8 + 0.2 * sp) * breathe(t, 1.0, 0.03, i * 1.1), (0.8 + 0.2 * sp) * breathe(t, 1.0, 0.03, i * 1.1))
      ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.arc(0, 0, 20, 0, TAU); ctx.fill(); ctx.restore()
      ctx.scale(0.8 + 0.2 * sp, 0.8 + 0.2 * sp)
      drawText(ctx, String(i + 1), 0, 1, { size: 22, weight: 800, family: fonts.display, color: pal.onAccent })
      ctx.restore()
      ctx.save(); ctx.globalAlpha = tin; ctx.translate((1 - M.ease(tin)) * 16, 0)
      drawText(ctx, it, ax + 50, y, { size: fs, weight: 700, family: fonts.text, maxW: W - (ax + 50) - W * 0.08, color: pal.ink, align: 'left' })
      ctx.restore()
    })
  },
})

// ---- lists/comparison ------------------------------------------------------

register({
  id: 'scene.comparison.vs', lib: 'scene-layouts', category: 'lists/comparison', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  register: 'neutral', intensity: 'medium', tags: ['comparacion', 'antes-despues', 'vs'], beat: 'value',
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
    ctx.save(); ctx.translate(midX, H * 0.45)
    // VIDA: el disco "vs" respira + glow pulsante (el texto "vs" queda fijo)
    ctx.save(); ctx.scale(vp * breathe(t, 1.1, 0.035), vp * breathe(t, 1.1, 0.035)); if (vp > 0.9) pulseGlow(ctx, pal.accent, t, { sp: 1.2, base: 3, amp: 6 })
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.arc(0, 0, 22, 0, TAU); ctx.fill(); ctx.restore()
    ctx.scale(vp, vp)
    drawText(ctx, 'vs', 0, 1, { size: 18, weight: 800, family: fonts.display, color: pal.onAccent })
    ctx.restore()
  },
})

// ---- data/single -----------------------------------------------------------

register({
  id: 'scene.data.single', lib: 'scene-layouts', category: 'data/single', tones: ['dark', 'light'], rubros: ['tech', 'finanzas', 'fitness', 'default'], weight: 1.1,
  register: 'corporate', intensity: 'medium', tags: ['dato', 'numero', 'kpi', 'anillo'], beat: 'data',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2
    const num = numFrom(content); if (!num) { bigText(ctx, content.tagline || content.claim || content.brand, cx, H * 0.42, fonts, pal, inv(t, 0.1, 0.5)); return }
    // anillo de acento que se dibuja alrededor del numero + VIDA: glow pulsante + punto que orbita el arco
    const ringP = M.ease(inv(t, 0.2, 1.1)), R = 118
    ctx.save(); ctx.translate(cx, H * 0.42)
    ctx.strokeStyle = rgba(pal.ink, 0.1); ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.stroke()
    ctx.save(); ctx.strokeStyle = pal.accent; ctx.lineWidth = 9; ctx.lineCap = 'round'
    if (ringP > 0.95) pulseGlow(ctx, pal.accent, t, { sp: 1.0, base: 2, amp: 6 })
    ctx.beginPath(); ctx.arc(0, 0, R, -TAU / 4, -TAU / 4 + TAU * ringP); ctx.stroke(); ctx.restore()
    if (ringP > 0.95) arcSheenDot(ctx, 0, 0, R, -TAU / 4, TAU * ringP, t, { per: 4.5, color: pal.tone === 'light' ? pal.accent : '#fff', tone: pal.tone })
    ctx.restore()
    // numero grande centrado (count-style: aparece con escala)
    const sp = M.settle(inv(t, 0.25, 1.0), { zeta: 0.5, freq: 2 })
    ctx.save(); ctx.translate(cx, H * 0.42); ctx.scale(0.8 + 0.2 * sp, 0.8 + 0.2 * sp)
    drawText(ctx, num, 0, 0, { size: 86, weight: 800, family: fonts.display, maxW: R * 1.8, color: pal.ink })
    ctx.restore()
    // etiqueta debajo
    drawWrapped(ctx, statLabel(content) || content.tagline || content.brand || 'resultado', cx, H * 0.66, { size: 22, weight: 700, family: fonts.text, maxW: W * 0.74, color: pal.dim, maxLines: 2, alpha: inv(t, 0.6, 1.1) })
  },
})

// ---- data/multi ------------------------------------------------------------

register({
  id: 'scene.data.multi', lib: 'scene-layouts', category: 'data/multi', tones: ['dark', 'light'], rubros: ['tech', 'finanzas', 'fitness', 'default'], weight: 1,
  register: 'corporate', intensity: 'medium', tags: ['datos', 'stats', 'kpis', 'columnas'], beat: 'data',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK
    // SOLO datos REALES: las stats de la perception (hasta 3), o si no hay, UN numero real del claim. Antes
    // fabricaba 3 columnas con mulberry32 ('+47','3x','99%') -> grafico FALSO. Sin datos reales -> degrada a texto.
    const realStats = (Array.isArray(content.stats) ? content.stats : []).filter(s => s && (s.value || s.value === 0)).slice(0, 3)
    let pairs = realStats.map(s => ({ num: String(s.value), label: shortLabel(s.label || '', 3) }))
    if (!pairs.length) { const n0 = numFrom(content); if (n0) pairs = [{ num: n0, label: shortLabel(content.tagline || content.brand || '', 3) }] }
    if (!pairs.length) { bigText(ctx, content.claim || content.tagline || content.brand, W / 2, H * 0.44, fonts, pal, inv(t, 0.1, 0.5)); return }
    const labels = pairs.map(p => p.label), nums = pairs.map(p => p.num)
    const n = pairs.length, cy = H * 0.44, colW = W / n
    // titulo opcional
    if (content.brand) drawText(ctx, (content.brand || '').toUpperCase(), W / 2, H * 0.24, { size: 16, weight: 700, family: fonts.accent || fonts.text, color: pal.inkText, maxW: W * 0.8, alpha: inv(t, 0.05, 0.35) })
    for (let i = 0; i < n; i++) {
      const tin = inv(t, 0.25 + i * 0.18, 0.8 + i * 0.18); if (tin <= 0) continue
      // el numero entra con spring y queda PIXEL-ESTABLE (sin breathe -> no shimmer); el separador da la vida (DECO)
      const x = colW * (i + 0.5), sp = M.settle(tin, { zeta: 0.5, freq: 2 })
      ctx.save(); ctx.globalAlpha = tin; ctx.translate(x, cy); ctx.scale(0.85 + 0.15 * sp, 0.85 + 0.15 * sp)
      drawText(ctx, nums[i] || '—', 0, -8, { size: 52, weight: 800, family: fonts.display, maxW: colW - 16, color: pal.ink })
      ctx.restore()
      drawWrapped(ctx, labels[i] || '', x, cy + 44, { size: 16, weight: 700, family: fonts.text, maxW: colW - 18, color: pal.dim, maxLines: 2, alpha: tin })
      // separador vertical entre columnas + VIDA: punto de acento que recorre el separador (DECO)
      if (i < n - 1) {
        const dh = M.ease(inv(t, 0.2, 0.9)), sepX = colW * (i + 1), y0 = cy - 40 * dh, y1 = cy + 50 * dh
        ctx.save(); ctx.strokeStyle = rgba(pal.ink, 0.12); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(sepX, y0); ctx.lineTo(sepX, y1); ctx.stroke(); ctx.restore()
        if (dh > 0.95) { const u = sheenPos(t, 3.2, i * 0.3); ctx.save(); ctx.fillStyle = pal.accent; ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.arc(sepX, lerp(y0, y1, u), 2.4, 0, TAU); ctx.fill(); ctx.restore() }
      }
    }
  },
})

// ---- social/proof ----------------------------------------------------------

register({
  id: 'scene.social.proof', lib: 'scene-layouts', category: 'social/proof', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  register: 'friendly', intensity: 'medium', tags: ['prueba-social', 'cita', 'estrellas', 'rating'], beat: 'proof',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2
    // 5 estrellas que se llenan de izq a der (DECO) + VIDA: titilan (escala+glow, fase por estrella)
    const fillP = M.ease(inv(t, 0.2, 1.0)) * 5, sr = 15, gap = 40, x0 = cx - gap * 2
    for (let i = 0; i < 5; i++) {
      const f = clamp(fillP - i, 0, 1), tw = f >= 1 ? breathe(t, 1.4, 0.05, i * 1.7) : 1
      ctx.save(); ctx.translate(x0 + i * gap, H * 0.32); ctx.scale(tw, tw)
      if (f >= 1) pulseGlow(ctx, pal.accent, t, { sp: 1.4, base: 1, amp: 4, ph: i * 1.7 })
      star(ctx, 0, 0, sr, f, pal.accent, rgba(pal.ink, 0.14)); ctx.restore()
    }
    // cita/testimonio en tinta
    ctx.save(); ctx.globalAlpha = inv(t, 0.35, 0.85)
    TK.drawWrapped(ctx, proofFrom(content) || content.claim || content.tagline || '', cx, H * 0.5, { reveal: inv(t, 0.35, 1.05), size: 30, weight: 700, family: fonts.display, maxW: W * 0.8, color: pal.ink, maxLines: 4, lh: 1.2 })
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
  register: 'neutral', intensity: 'medium', tags: ['cierre', 'marca', 'lockup', 'monograma'], beat: 'close',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2, cy = H * 0.44
    // monograma: inicial de la marca en un cuadro de acento
    const init = (content.brand || 'M').trim().charAt(0).toUpperCase()
    const sp = M.settle(inv(t, 0.1, 0.9), { zeta: 0.5, freq: 2 }), s = 0.8 + 0.2 * sp
    ctx.save(); ctx.globalAlpha = inv(t, 0.05, 0.4); ctx.translate(cx, cy - 40); ctx.scale(s, s)
    // VIDA: el cuadro de acento respira + glow pulsante (la inicial queda fija)
    ctx.save(); ctx.scale(breathe(t, 0.9, 0.02), breathe(t, 0.9, 0.02)); if (sp > 0.9) pulseGlow(ctx, pal.accent, t, { sp: 1.0, base: 2, amp: 6 })
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(-34, -34, 68, 68, 16); ctx.fill(); ctx.restore()
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
  register: 'friendly', intensity: 'medium', tags: ['cierre', 'cta', 'pildora'], beat: 'close',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK
    // SLOTS: marca (titulo) + cta (pildora) + tagline (footnote) ubicados por el layout (antes H*0.4/0.52/0.66 fijos)
    const cta = content.cta || 'Sumate hoy'
    const L = place(env, [
      { id: 'brand', kind: 'title', text: content.brand || 'Marca' },
      { id: 'cta', kind: 'cta', text: cta },
      content.tagline ? { id: 'tag', kind: 'footnote', text: content.tagline } : null,
    ]), b = L.brand, ct = L.cta
    drawText(ctx, content.brand || 'Marca', b.cx, b.cy, { size: Math.min(b.size, 46), weight: 800, family: fonts.display, maxW: b.w, color: pal.ink, align: b.align, alpha: inv(t, 0.15, 0.7) })
    // pildora CTA rellena de acento que crece, centrada en su slot
    const gp = M.settle(inv(t, 0.5, 1.2), { zeta: 0.5, freq: 2 })
    ctx.save(); ctx.font = `800 26px "${fonts.display}"`
    const tw = Math.min(ct.w, ctx.measureText(cta).width), pw = tw + 56, ph = 56
    ctx.translate(ct.cx, ct.cy); ctx.scale(0.85 + 0.15 * gp, 0.85 + 0.15 * gp); ctx.globalAlpha = inv(t, 0.5, 0.9)   // entra y queda quieta (sheen = vida; sin breathe -> el CTA no shimmerea)
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(-pw / 2, -ph / 2, pw, ph, ph / 2); ctx.fill()
    // VIDA: sheen recorre la pildora (DECO, continuo)
    if (gp > 0.9) rrSheen(ctx, -pw / 2, -ph / 2, pw, ph, t, { per: 3.4, strength: 0.4, tone: pal.tone })
    drawText(ctx, cta, 0, 1, { size: 26, weight: 800, family: fonts.display, maxW: pw - 36, color: pal.onAccent })
    ctx.restore()
    if (content.tagline && L.tag) drawText(ctx, content.tagline, L.tag.cx, L.tag.cy, { size: Math.min(L.tag.size, 18), weight: 600, family: fonts.text, maxW: L.tag.w, color: pal.dim, align: L.tag.align, alpha: inv(t, 0.8, 1.3) })
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
  register: 'neutral', intensity: 'medium', tags: ['transicion', 'bisagra', 'una-palabra'], beat: 'context',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK
    const word = firstStrong(content.tagline || content.claim || content.cta, 'ASI').toUpperCase()
    // SLOT: la palabra de bisagra como titulo, ubicada por el layout (antes cx/cy=H*0.42 fijos)
    const L = place(env, [{ id: 'word', kind: 'title', text: word }]), wS = L.word, cx = wS.cx, cy = wS.cy
    // dos reglas de acento que cierran como parentesis hacia la palabra (DECO), ancladas a su centro
    const cl = M.ease(inv(t, 0.05, 0.7)), gap = lerp(W * 0.42, 18, cl)
    ctx.save(); ctx.fillStyle = pal.accent; ctx.globalAlpha = inv(t, 0.05, 0.4)
    ctx.beginPath(); ctx.roundRect(cx - gap - 46, cy - 2.5, 46, 5, 2.5); ctx.fill()
    ctx.beginPath(); ctx.roundRect(cx + gap, cy - 2.5, 46, 5, 2.5); ctx.fill(); ctx.restore()
    // palabra: entra con spring de escala + leve respiracion por t (determinista)
    const sp = M.settle(inv(t, 0.2, 1.0), { zeta: 0.5, freq: 2.1 })
    const breath = 1 + 0.012 * Math.sin(t * 1.6)
    const sc = (0.78 + 0.22 * sp) * breath
    ctx.save(); ctx.globalAlpha = inv(t, 0.12, 0.5); ctx.translate(cx, cy); ctx.scale(sc, sc)
    drawText(ctx, word, 0, 0, { size: Math.min(wS.size, 62), weight: 800, family: fonts.display, maxW: wS.w, color: pal.ink, align: wS.align, shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.45)' : null })
    ctx.restore()
  },
})

register({
  id: 'scene.interstitial.sweep', lib: 'scene-layouts', category: 'connectors/interstitial', tones: ['dark', 'light'], rubros: ['*'], weight: 0.9,
  register: 'neutral', intensity: 'medium', tags: ['transicion', 'barrido', 'kicker'], beat: 'context',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK
    const word = firstStrong(content.tagline || content.claim, 'LISTO').toUpperCase()
    // SLOTS: kicker (marca) + palabra (titulo) ubicados por el layout (antes cy=H*0.44 / H*0.32 fijos); la banda barre tras la palabra
    const L = place(env, [
      content.brand ? { id: 'kick', kind: 'kicker', text: content.brand } : null,
      { id: 'word', kind: 'title', text: word },
    ]), wS = L.word, wx = wS.align === 'left' ? wS.x : wS.cx, cy = wS.cy
    // banda de acento que barre de izq a der detras de la palabra (DECO), anclada a su centro + VIDA: respira + sheen
    const sw = M.ease(inv(t, 0.1, 0.85)), bh = 64
    ctx.save(); ctx.globalAlpha = (pal.tone === 'light' ? 0.14 : 0.2) * inv(t, 0.05, 0.4) * breathe(t, 0.7, 0.08)
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.rect(0, cy - bh / 2, W * sw, bh); ctx.fill()
    if (sw > 0.95) { ctx.globalAlpha = 0.4; rrSheen(ctx, 0, cy - bh / 2, W * sw, bh, t, { per: 3.6, strength: 0.3, tone: pal.tone }) }
    ctx.restore()
    // palabra en su slot, entra desde la izquierda con la banda
    const enter = M.ease(inv(t, 0.25, 0.9))
    ctx.save(); ctx.globalAlpha = inv(t, 0.2, 0.6); ctx.translate((1 - enter) * -30, 0)
    drawText(ctx, word, wS.align === 'center' ? wS.cx : wS.x, cy, { size: Math.min(wS.size, 52), weight: 800, family: fonts.display, maxW: wS.w, color: pal.ink, align: wS.align, shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.4)' : null })
    ctx.restore()
    // numero/kicker de paso opcional arriba (si la marca existe), en su slot, en mono-acento
    if (content.brand && L.kick) drawText(ctx, (content.brand || '').toUpperCase(), L.kick.align === 'center' ? L.kick.cx : L.kick.x, L.kick.cy, { size: Math.min(L.kick.size, 15), weight: 700, family: fonts.accent || fonts.text, color: pal.inkText, align: L.kick.align, maxW: L.kick.w, alpha: inv(t, 0.0, 0.35) })
  },
})

register({
  id: 'scene.interstitial.count', lib: 'scene-layouts', category: 'connectors/interstitial', tones: ['dark', 'light'], rubros: ['*'], weight: 0.85,
  register: 'editorial', intensity: 'soft', tags: ['transicion', 'capitulo', 'indice'], beat: 'context',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2
    // indice de capitulo gigante de fondo (DECO en acento tenue) + palabra de bisagra
    const r = mulberry32((env.seed >>> 0) ^ 0x21a)
    const idx = '0' + (1 + ((r() * 3) | 0))   // 01..03, estable por seed
    const word = firstStrong(content.tagline || content.claim || content.brand, 'PARTE').toUpperCase()
    // SLOT: la palabra como titulo, ubicada por el layout (antes H*0.52 fijo); el indice de fondo + regla se anclan a ella
    const L = place(env, [{ id: 'word', kind: 'title', text: word }]), wS = L.word, wcx = wS.cx, wcy = wS.cy
    const sc = lerp(0.94, 1, M.ease(inv(t, 0.05, 0.8))) * breathe(t, 0.6, 0.01)   // VIDA: el indice de fondo respira
    ctx.save(); ctx.globalAlpha = (pal.tone === 'light' ? 0.08 : 0.14) * inv(t, 0.0, 0.5) * breathe(t, 0.5, 0.1); ctx.translate(wcx, wcy - 24); ctx.scale(sc, sc)
    drawText(ctx, idx, 0, 0, { size: 240, weight: 800, family: fonts.display, color: pal.accent })
    ctx.restore()
    // palabra en tinta encima, sube y se asienta, en su slot
    const rise = M.settle(inv(t, 0.25, 1.0), 1.2)
    ctx.save(); ctx.globalAlpha = inv(t, 0.25, 0.7); ctx.translate(0, (1 - rise) * 26)
    drawText(ctx, word, wcx, wcy, { size: Math.min(wS.size, 46), weight: 800, family: fonts.display, maxW: wS.w, color: pal.ink, align: wS.align })
    ctx.restore()
    // regla corta bajo la palabra + VIDA: respira + sheen
    const ry = wS.y + wS.h + 6, ru = M.ease(inv(t, 0.5, 1.1)), crw = 60 * ru * breathe(t, 0.9, 0.03)
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(wcx - crw / 2, ry, crw, 4, 2); ctx.fill()
    if (ru > 0.9) rrSheen(ctx, wcx - crw / 2, ry, crw, 4, t, { per: 3.0, strength: 0.5, tone: pal.tone })
  },
})

// ---- spec/slots ------------------------------------------------------------
// Ficha de especificacion: pares clave/valor o atributos. Ideal para producto,
// inmueble, plan: "3 amb · 80 m2 · USD 120k". Lee items separados del claim.

register({
  id: 'scene.spec.feature', lib: 'scene-layouts', category: 'spec/slots', tones: ['dark', 'light'], rubros: ['inmobiliaria', 'tech', 'default'], weight: 1.1,
  register: 'corporate', intensity: 'medium', tags: ['ficha', 'specs', 'atributos', 'inmueble'], beat: 'data',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK
    const items = listFrom(content, 'Calidad · Confianza · Cercania · Compromiso', 4)
    // titulo / marca arriba
    drawText(ctx, content.brand ? (content.brand + '').toUpperCase() : 'FICHA', W * 0.12, H * 0.22, { size: 16, weight: 700, family: fonts.accent || fonts.text, color: pal.inkText, align: 'left', maxW: W * 0.76, alpha: inv(t, 0.0, 0.3) })
    const x0 = W * 0.12, x1 = W * 0.88, y0 = H * 0.32, gap = Math.min(74, (H * 0.5) / Math.max(1, items.length))
    items.forEach((it, i) => {
      const tin = inv(t, 0.18 + i * 0.16, 0.68 + i * 0.16); if (tin <= 0) return
      const y = y0 + i * gap
      // separa "valor : etiqueta" si hay numero; si no, item plano con marca de acento
      const num = (it.match(/([+\-]?\$?\s?\d[\d.,]*\s?[%xXmMkK²m2]*)/) || [])[1]
      ctx.save(); ctx.globalAlpha = tin
      // marca de slot: cuadradito de acento a la izquierda (DECO) + VIDA: respira (fase por fila)
      const mk = M.ease(tin), mkb = tin >= 1 ? breathe(t, 1.1, 0.06, i * 1.3) : 1, mkS = 14 * mk * mkb
      ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(x0 + (14 - mkS) / 2, y - mkS / 2, mkS, mkS, 3); ctx.fill()
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
  id: 'scene.spec.detail', lib: 'scene-layouts', category: 'spec/slots', tones: ['dark', 'light'], rubros: ['inmobiliaria', 'tech', 'default'], weight: 0.95,
  register: 'corporate', intensity: 'medium', tags: ['ficha', 'destacado', 'precio', 'spec-grid'], beat: 'data',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK
    // grilla 2x2 de chips de spec; cada chip = panel surface con valor en tinta
    const items = listFrom(content, 'Calidad · Confianza · Cercania · Compromiso', 4)
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
      // VIDA: sheen recorre la barra de acento del chip (fase por celda, continuo)
      if (sp > 0.9) rrSheen(ctx, cellX, cellY, cw, 4, t, { per: 3.2, ph: i * 0.25, strength: 0.5, tone: pal.tone })
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
  register: 'neutral', intensity: 'loud', tags: ['hook', 'estadistica', 'shock', 'dato'], beat: 'hook',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2
    const num = numFrom(content); if (!num) { bigText(ctx, content.tagline || content.claim || content.brand, cx, H * 0.4, fonts, pal, inv(t, 0.0, 0.4)); return }
    // SLOTS: numero gigante (stat) + contexto explicativo (body) ubicados por el layout (antes H*0.36/0.6 fijos)
    const ctxSrc = content.tagline || content.claim || 'de la gente se rinde antes de empezar'
    const L = place(env, [
      { id: 'num', kind: 'stat', text: num },
      { id: 'ctx', kind: 'body', text: ctxSrc },
    ]), nS = L.num, cS = L.ctx
    // numero gigante que "cuenta" hacia su tamano (escala desde abajo) + reveal por mascara que sube
    const grow = eOutExpoLocal(inv(t, 0.05, 0.85))
    ctx.save(); ctx.globalAlpha = inv(t, 0.0, 0.35); ctx.translate(nS.cx, nS.cy); ctx.scale(0.6 + 0.4 * grow, 0.6 + 0.4 * grow)
    drawText(ctx, num, 0, 0, { size: Math.min(nS.size, 172), weight: 800, family: fonts.display, maxW: nS.w, color: pal.inkText, align: nS.align, shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.5)' : null })
    ctx.restore()
    // regla de acento bajo el numero + VIDA: respira + sheen
    const rcx = nS.cx, ru = M.ease(inv(t, 0.45, 1.0)), srw = 92 * ru * breathe(t, 0.9, 0.022), sry = nS.y + nS.h + 2
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(rcx - srw / 2, sry, srw, 5, 2.5); ctx.fill()
    if (ru > 0.9) rrSheen(ctx, rcx - srw / 2, sry, srw, 5, t, { per: 3.0, strength: 0.55, tone: pal.tone })
    // contexto que explica la estadistica (lo que la vuelve shock), en su slot
    drawWrapped(ctx, ctxSrc, cS.cx, cS.cy, { size: Math.min(cS.size, 25), weight: 700, family: fonts.text, maxW: cS.w, color: pal.ink, align: cS.align, maxLines: 3, lh: 1.18, alpha: inv(t, 0.55, 1.05) })
  },
})

register({
  id: 'scene.hook.binary', lib: 'scene-layouts', category: 'openers/hook', tones: ['dark', 'light'], rubros: ['*'], weight: 0.95,
  register: 'friendly', intensity: 'bold', tags: ['hook', 'pregunta', 'binaria', 'eleccion'], beat: 'hook',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2
    // pregunta arriba, en tinta
    ctx.save(); ctx.globalAlpha = inv(t, 0.1, 0.5)
    drawWrapped(ctx, content.tagline || content.claim || '¿Seguis perdiendo tiempo?', cx, H * 0.32, { size: 32, weight: 800, family: fonts.display, maxW: W * 0.82, color: pal.ink, maxLines: 3, lh: 1.14, shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.45)' : null })
    ctx.restore()
    // dos opciones tipo "si / no" como chips contrapuestos (uno acento, uno dim)
    let labels = splitItems(content.claim || content.tagline || '', 2)
    if (labels.length < 2) labels = ['Antes', 'Ahora']   // sin un contraste real en el texto -> framing generico antes/ahora
    const a = labels[0], b = labels[1]
    const cw = W * 0.34, ch = 64, gap = 18, totW = cw * 2 + gap, x0 = cx - totW / 2, y = H * 0.56
    const fs = fitUniform(ctx, [a, b], 22, cw - 24, 12, 700, fonts.display)   // mismo tamano en ambos chips, sin elidir
    const inA = M.settle(inv(t, 0.35, 1.0), { zeta: 0.5, freq: 2 }), inB = M.settle(inv(t, 0.5, 1.15), { zeta: 0.5, freq: 2 })
    // chip izquierdo (la opcion vieja, dim, contorno)
    ctx.save(); ctx.globalAlpha = inv(t, 0.35, 0.8); ctx.translate(x0 + cw / 2, y + ch / 2); ctx.scale(0.9 + 0.1 * inA, 0.9 + 0.1 * inA); ctx.translate(-(x0 + cw / 2), -(y + ch / 2))
    ctx.strokeStyle = rgba(pal.ink, 0.28); ctx.lineWidth = 1.8; ctx.beginPath(); ctx.roundRect(x0, y, cw, ch, 14); ctx.stroke()
    drawWrapped(ctx, a, x0 + cw / 2, y + ch / 2, { size: fs, min: 12, weight: 700, family: fonts.display, color: pal.dim, maxW: cw - 20, maxLines: 2, lh: 1.05 })
    ctx.restore()
    // chip derecho (la opcion buena, acento relleno) + VIDA: el sheen lo recorre (sin breathe -> el texto del chip no shimmerea)
    const bsc = 0.88 + 0.12 * inB
    ctx.save(); ctx.globalAlpha = inv(t, 0.5, 0.95); ctx.translate(x0 + cw + gap + cw / 2, y + ch / 2); ctx.scale(bsc, bsc); ctx.translate(-(x0 + cw + gap + cw / 2), -(y + ch / 2))
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(x0 + cw + gap, y, cw, ch, 14); ctx.fill()
    if (inB > 0.9) rrSheen(ctx, x0 + cw + gap, y, cw, ch, t, { per: 3.6, strength: 0.4, tone: pal.tone })
    drawWrapped(ctx, b, x0 + cw + gap + cw / 2, y + ch / 2, { size: fs, min: 12, weight: 800, family: fonts.display, color: pal.onAccent, maxW: cw - 20, maxLines: 2, lh: 1.05 })
    ctx.restore()
  },
})

// ---- statements/editorial (mas) --------------------------------------------

register({
  id: 'scene.statement.panel', lib: 'scene-layouts', category: 'statements/editorial', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  register: 'editorial', intensity: 'bold', tags: ['claim', 'panel', 'full-bleed', 'editorial'], beat: 'value',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2
    // panel de acento full-width que baja desde arriba; claim en color onAccent encima
    const drop = M.ease(inv(t, 0.05, 0.8)), ph = H * 0.34, py = H * 0.33
    ctx.save(); ctx.globalAlpha = inv(t, 0.0, 0.4)
    ctx.fillStyle = pal.accent
    ctx.beginPath(); ctx.rect(0, py, W, ph * drop); ctx.fill(); ctx.restore()
    // VIDA: sheen suave que cruza el panel de acento (DECO continuo, no toca el texto)
    if (drop > 0.95) { ctx.save(); ctx.globalAlpha = 0.45; rrSheen(ctx, 0, py, W, ph, t, { per: 4.2, strength: 0.3, tone: pal.tone }); ctx.restore() }
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
  register: 'editorial', intensity: 'loud', tags: ['claim', 'mega-tipografia', 'masivo', 'impacto'], beat: 'value',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK
    // mega-tipografia: claim a maxima escala posible, reveal por linea (stagger). SLOT title ubica el bloque.
    const src = content.claim || content.tagline || content.brand || 'Hacelo simple'
    const L = place(env, [{ id: 'claim', kind: 'title', text: src }]), c = L.claim
    const ax = c.x, baseSize = Math.min(64, Math.round(c.size * 1.3))
    // calculamos wrap a un tamano grande (capado al slot) y dibujamos linea por linea con stagger
    const lines = wrapLinesLocal(ctx, src, baseSize, c.w, 30, 800, fonts.display, 4)
    const lineH = lines.size * 1.04, blockH = lines.lines.length * lineH, y0 = c.cy - blockH / 2 + lines.size / 2
    lines.lines.forEach((ln, i) => {
      const tin = inv(t, 0.12 + i * 0.14, 0.6 + i * 0.14); if (tin <= 0) return
      const e = M.ease(tin)
      ctx.save(); ctx.globalAlpha = tin; ctx.translate((1 - e) * -26, 0)
      ctx.font = `800 ${lines.size}px "${fonts.display}"`; ctx.textAlign = c.align === 'center' ? 'center' : 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = pal.ink
      if (pal.tone === 'dark') { ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 6 }
      ctx.fillText(ln, c.align === 'center' ? c.cx : ax, y0 + i * lineH)
      ctx.restore()
    })
    // ultima palabra/regla en acento bajo el bloque + VIDA: respira + sheen
    const ru = M.ease(inv(t, 0.6, 1.2)), mrw = 92 * ru * breathe(t, 0.85, 0.022), mry = y0 + blockH - lineH / 2 + 26
    const mrx = c.align === 'center' ? c.cx - mrw / 2 : ax
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(mrx, mry, mrw, 6, 3); ctx.fill()
    if (ru > 0.9) rrSheen(ctx, mrx, mry, mrw, 6, t, { per: 3.0, strength: 0.55, tone: pal.tone })
  },
})

// ---- closers/outro (mas) ---------------------------------------------------

register({
  id: 'scene.outro.bigtype', lib: 'scene-layouts', category: 'closers/outro', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  register: 'editorial', intensity: 'bold', tags: ['cierre', 'mega-tipografia', 'marca'], beat: 'close',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK
    // SLOTS: marca a maxima escala (titulo) + sub (cta/tagline) ubicados por el layout (antes H*0.42/0.55/0.62 fijos)
    const sub = content.cta || content.tagline
    const L = place(env, [
      { id: 'brand', kind: 'title', text: content.brand || 'Marca' },
      sub ? { id: 'sub', kind: 'cta', text: sub } : null,
    ]), b = L.brand
    const sp = M.settle(inv(t, 0.1, 1.0), { zeta: 0.5, freq: 2.0 }), sc = 0.86 + 0.14 * sp
    ctx.save(); ctx.globalAlpha = inv(t, 0.05, 0.45); ctx.translate(b.cx, b.cy); ctx.scale(sc, sc); ctx.translate(-b.cx, -b.cy)
    drawWrapped(ctx, content.brand || 'Marca', b.cx, b.cy, { size: Math.min(b.size, 72), weight: 800, family: fonts.display, maxW: b.w, color: pal.ink, align: b.align, maxLines: 2, lh: 1.0, shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.45)' : null })
    ctx.restore()
    // regla ancha de acento bajo la marca + VIDA: respira + sheen
    const ry = b.y + b.h + 10, ru = M.ease(inv(t, 0.5, 1.1)), brw = 140 * ru * breathe(t, 0.85, 0.02)
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(b.cx - brw / 2, ry, brw, 6, 3); ctx.fill()
    if (ru > 0.9) rrSheen(ctx, b.cx - brw / 2, ry, brw, 6, t, { per: 3.2, strength: 0.55, tone: pal.tone })
    // cta o tagline debajo, en su slot, en mono-acento
    if (sub && L.sub) drawText(ctx, sub, L.sub.cx, L.sub.cy, { size: Math.min(L.sub.size, 22), weight: 700, family: fonts.text, maxW: L.sub.w, color: pal.inkText, align: L.sub.align, alpha: inv(t, 0.75, 1.25) })
  },
})

register({
  id: 'scene.outro.diagonal', lib: 'scene-layouts', category: 'closers/outro', tones: ['dark', 'light'], rubros: ['*'], weight: 0.9,
  register: 'playful', intensity: 'bold', tags: ['cierre', 'diagonal', 'dinamico', 'cta'], beat: 'close',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2, cy = H * 0.42
    // banda diagonal de acento que barre la pantalla (DECO) — energia de cierre + VIDA: respira de opacidad
    const sw = M.ease(inv(t, 0.05, 0.8))
    ctx.save(); ctx.globalAlpha = (pal.tone === 'light' ? 0.16 : 0.22) * inv(t, 0.0, 0.4) * breathe(t, 0.7, 0.1)
    ctx.translate(cx, cy); ctx.rotate(-0.18)
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.rect(-W * 0.7, -42, W * 1.4 * sw, 84); ctx.fill()
    if (sw > 0.95) { ctx.globalAlpha = 0.5; rrSheen(ctx, -W * 0.7, -42, W * 1.4, 84, t, { per: 4.0, strength: 0.3, tone: pal.tone }) }
    ctx.restore()
    // marca centrada en tinta
    drawText(ctx, content.brand || 'Marca', cx, cy, { size: 50, weight: 800, family: fonts.display, maxW: W * 0.84, color: pal.ink, alpha: inv(t, 0.2, 0.75), shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.4)' : null })
    // pildora CTA en acento que entra desde abajo en diagonal
    const cta = content.cta || 'Escribinos hoy'
    const gp = M.settle(inv(t, 0.5, 1.2), { zeta: 0.5, freq: 2 })
    ctx.save(); ctx.font = `800 24px "${fonts.display}"`
    const tw = Math.min(W * 0.7, ctx.measureText(cta).width), pw = tw + 50, ph = 52, py = cy + 96
    ctx.translate(cx, py + ph / 2); ctx.scale(0.85 + 0.15 * gp, 0.85 + 0.15 * gp); ctx.globalAlpha = inv(t, 0.5, 0.95)   // entra y queda quieta (sheen = vida; sin breathe -> el CTA no shimmerea)
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(-pw / 2, -ph / 2, pw, ph, ph / 2); ctx.fill()
    if (gp > 0.9) rrSheen(ctx, -pw / 2, -ph / 2, pw, ph, t, { per: 3.4, strength: 0.4, tone: pal.tone })
    drawText(ctx, cta, 0, 1, { size: 24, weight: 800, family: fonts.display, maxW: pw - 34, color: pal.onAccent })
    ctx.restore()
  },
})

// ---- lists/comparison (mas) ------------------------------------------------

register({
  id: 'scene.comparison.split', lib: 'scene-layouts', category: 'lists/comparison', tones: ['dark', 'light'], rubros: ['*'], weight: 0.95,
  register: 'neutral', intensity: 'bold', tags: ['comparacion', 'split', 'mitad-mitad', 'antes-despues'], beat: 'value',
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
    // panel inferior: banda de acento + VIDA: sheen suave cruzandola
    ctx.save(); ctx.globalAlpha = dB; ctx.translate(0, (1 - dB) * 20)
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.rect(0, botY, W, halfH); ctx.fill()
    if (dB > 0.95) { ctx.save(); ctx.globalAlpha = 0.4; rrSheen(ctx, 0, botY, W, halfH, t, { per: 4.2, strength: 0.28, tone: pal.tone }); ctx.restore() }
    drawText(ctx, 'AHORA', W * 0.12, botY + 30, { size: 14, weight: 700, family: fonts.accent || fonts.text, color: pal.onAccent, align: 'left', maxW: W * 0.7 })
    drawWrapped(ctx, right, W / 2, botY + halfH / 2 + 8, { size: 30, weight: 800, family: fonts.display, maxW: W * 0.8, color: pal.onAccent, maxLines: 3, lh: 1.16 })
    ctx.restore()
    // flecha que cruza el limite (DECO) + VIDA: el disco respira + flecha deriva sutil vertical
    const ap = M.settle(inv(t, 0.55, 1.2), { zeta: 0.5, freq: 2 })
    ctx.save(); ctx.translate(W / 2, botY); ctx.scale(ap * breathe(t, 1.1, 0.03), ap * breathe(t, 1.1, 0.03))
    if (ap > 0.9) pulseGlow(ctx, pal.accent, t, { sp: 1.2, base: 2, amp: 5 })
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.arc(0, 0, 22, 0, TAU); ctx.fill(); ctx.shadowBlur = 0
    const ady = ap >= 1 ? drift(t, 1.3, 1.0) : 0
    ctx.strokeStyle = pal.onAccent; ctx.lineWidth = 3.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    ctx.beginPath(); ctx.moveTo(0, -8 + ady); ctx.lineTo(0, 8 + ady); ctx.moveTo(-7, 1 + ady); ctx.lineTo(0, 9 + ady); ctx.lineTo(7, 1 + ady); ctx.stroke()
    ctx.restore()
  },
})

// ---- data/single (mas) -----------------------------------------------------

register({
  id: 'scene.data.bar', lib: 'scene-layouts', category: 'data/single', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  register: 'corporate', intensity: 'medium', tags: ['dato', 'barra', 'progreso', 'kpi'], beat: 'data',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2
    const num = numFrom(content); if (!num) { bigText(ctx, content.tagline || content.claim || content.brand, cx, H * 0.42, fonts, pal, inv(t, 0.05, 0.4)); return }
    // numero grande arriba
    const sp = M.settle(inv(t, 0.15, 0.95), { zeta: 0.5, freq: 2 })
    ctx.save(); ctx.globalAlpha = inv(t, 0.05, 0.4); ctx.translate(cx, H * 0.38); ctx.scale(0.85 + 0.15 * sp, 0.85 + 0.15 * sp)
    drawText(ctx, num, 0, 0, { size: 96, weight: 800, family: fonts.display, maxW: W * 0.9, color: pal.ink, shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.45)' : null })
    ctx.restore()
    // barra de progreso horizontal que se llena segun el % del numero (o un default)
    const pct = (() => { const m = num.match(/(\d[\d.,]*)/); let v = m ? parseFloat(m[1].replace(/,/g, '')) : 75; if (num.indexOf('%') < 0) v = clamp(v, 0, 100); return clamp(v / 100, 0.08, 1) })()
    const fill = M.ease(inv(t, 0.3, 1.2)) * pct
    const bw = W * 0.76, bx = (W - bw) / 2, by = H * 0.52, bh = 18, fw = bw * fill
    ctx.save()
    ctx.fillStyle = rgba(pal.ink, 0.12); ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, bh / 2); ctx.fill()
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(bx, by, fw, bh, bh / 2); ctx.fill()
    ctx.restore()
    // VIDA: sheen recorre la parte llena de la barra (DECO continuo)
    if (fill > pct * 0.95 && fw > 24) rrSheen(ctx, bx, by, fw, bh, t, { per: 2.8, strength: 0.5, tone: pal.tone })
    // etiqueta debajo
    drawWrapped(ctx, statLabel(content) || content.tagline || content.brand || 'resultado medido', cx, H * 0.62, { size: 22, weight: 700, family: fonts.text, maxW: W * 0.78, color: pal.dim, maxLines: 2, alpha: inv(t, 0.6, 1.1) })
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
  register: 'editorial', intensity: 'medium', tags: ['apertura', 'editorial', 'asimetrico', 'rotulo-vertical'], beat: 'hook',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, mx = W * 0.13
    // regla vertical de acento en el margen + rotulo de marca girado + VIDA: punto que recorre la regla
    const vu = M.ease(inv(t, 0.05, 0.7)), vh = (H * 0.4) * vu, vry = H * 0.28
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(mx - 18, vry, 5, vh, 2.5); ctx.fill()
    if (vu > 0.95) { const u = sheenPos(t, 3.4), dy = vry + 6 + (vh - 12) * u; ctx.save(); ctx.fillStyle = 'rgba(255,255,255,' + (pal.tone === 'light' ? 0.5 : 0.85) + ')'; ctx.beginPath(); ctx.arc(mx - 15.5, dy, 2.6, 0, TAU); ctx.fill(); ctx.restore() }
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
  register: 'editorial', intensity: 'bold', tags: ['apertura', 'highlight', 'masivo', 'editorial'], beat: 'hook',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, mx = W * 0.1
    drawText(ctx, (content.brand || 'Marca').toUpperCase(), mx, H * 0.26, { size: 17, weight: 700, family: fonts.accent || fonts.text, color: pal.inkText, align: 'left', maxW: W * 0.8, alpha: inv(t, 0.05, 0.4) })
    const src = content.claim || content.tagline || content.brand || 'Mas claro imposible'
    const L = wrapLinesLocal(ctx, src, 56, W - 2 * mx, 30, 800, fonts.display, 3)
    const lineH = L.size * 1.06, y0 = H * 0.42
    // highlight de acento detras de la 1ra linea (crece de izq a der)
    ctx.font = `800 ${L.size}px "${fonts.display}"`
    const w0 = Math.min(W - 2 * mx, ctx.measureText(L.lines[0] || '').width)
    const hl = M.ease(inv(t, 0.25, 0.95)), hlw = (w0 + 12) * hl, hlx = mx - 6, hly = y0 - L.size * 0.62, hlh = L.size * 1.12
    ctx.save(); ctx.globalAlpha = (pal.tone === 'light' ? 0.18 : 0.26) * inv(t, 0.2, 0.5) * breathe(t, 0.8, 0.1)
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(hlx, hly, hlw, hlh, 6); ctx.fill(); ctx.restore()
    // VIDA: sheen sutil recorre el highlight (DECO continuo)
    if (hl > 0.95) { ctx.save(); ctx.globalAlpha = 0.5; rrSheen(ctx, hlx, hly, hlw, hlh, t, { per: 4.0, strength: 0.35, tone: pal.tone }); ctx.restore() }
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
  register: 'editorial', intensity: 'bold', tags: ['hook', 'tachado', 'contraste', 'gancho'], beat: 'hook',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, mx = W * 0.12
    const parts = splitItems(content.claim || content.tagline || 'No mas planillas · Solo resultados', 2)
    const bad = parts[0] || 'No mas vueltas', good = parts[1] || 'Solo resultados'
    // NOTA: NO migrado a slots — bad/good necesitan quedar PEGADOS (tachado -> chevron -> idea buena lee como
    // una sola unidad narrativa); el slot-fill los separa a extremos opuestos y deja el chevron huerfano (regresion).
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
    // chevron de acento que apunta a la idea buena + VIDA: deriva + glow pulsante (continuo)
    const chp = M.ease(inv(t, 0.5, 0.95))
    ctx.save(); if (chp > 0.95) pulseGlow(ctx, pal.accent, t, { sp: 1.5, base: 1, amp: 5 })
    chevron(ctx, mx + 12 + (chp >= 1 ? drift(t, 1.4, 2.2) : 0), H * 0.47, 16, pal.accent, 4.5, chp); ctx.restore()
  },
})

// hook "marginalia": numero/dato gigante recortado al margen derecho + pregunta a la
// izquierda. Composicion de tapa: la cifra invade el borde, el texto la confronta.
register({
  id: 'scene.hook.marginnum', lib: 'scene-layouts', category: 'openers/hook', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  register: 'editorial', intensity: 'bold', tags: ['hook', 'dato', 'recorte', 'asimetrico'], beat: 'hook',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, mx = W * 0.1
    const num = numFrom(content); if (!num) { bigText(ctx, content.tagline || content.claim || content.brand, W / 2, H * 0.42, fonts, pal, inv(t, 0.0, 0.4)); return }
    // numero gigante anclado al margen derecho, dominante arriba (recorte editorial)
    const grow = eOutExpoLocal(inv(t, 0.05, 0.85))
    ctx.save(); ctx.globalAlpha = inv(t, 0.0, 0.4); ctx.translate(W * 0.96, H * 0.38); ctx.scale(0.7 + 0.3 * grow, 0.7 + 0.3 * grow)
    drawText(ctx, num, 0, 0, { size: 140, weight: 800, family: fonts.display, maxW: W * 1.04, color: pal.inkText, align: 'right', shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.5)' : null })
    ctx.restore()
    // barra vertical de acento separando la cifra del texto + VIDA: punto que la recorre
    const vu = M.ease(inv(t, 0.3, 0.9)), vbh = (H * 0.22) * vu, vby = H * 0.5
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(mx - 4, vby, 5, vbh, 2.5); ctx.fill()
    if (vu > 0.95) { const u = sheenPos(t, 3.0), dy = vby + 5 + (vbh - 10) * u; ctx.save(); ctx.fillStyle = 'rgba(255,255,255,' + (pal.tone === 'light' ? 0.5 : 0.85) + ')'; ctx.beginPath(); ctx.arc(mx - 1.5, dy, 2.4, 0, TAU); ctx.fill(); ctx.restore() }
    // texto/pregunta abajo-izquierda, confronta la cifra
    drawWrapped(ctx, content.tagline || content.claim || 'el resto se queda atras', mx + 12, H * 0.62, { size: 27, weight: 700, family: fonts.display, maxW: W * 0.66, color: pal.ink, align: 'left', maxLines: 3, lh: 1.16, alpha: inv(t, 0.5, 1.0) })
  },
})

// ---- statements/editorial (mas · OLA3) -------------------------------------

// statement "index": el claim como bloque, con un indice de seccion (numero romano/00)
// arriba en acento y una regla larga que cruza. Aire editorial, mucho margen.
register({
  id: 'scene.statement.index', lib: 'scene-layouts', category: 'statements/editorial', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  register: 'editorial', intensity: 'soft', tags: ['claim', 'editorial', 'indice', 'aire'], beat: 'value',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, mx = W * 0.12
    // indice de seccion estable por seed (00..04) en acento, arriba-izquierda
    const r = mulberry32((env.seed >>> 0) ^ 0x9e1)
    const idx = '0' + ((r() * 5) | 0)
    drawText(ctx, idx, mx, H * 0.24, { size: 30, weight: 800, family: fonts.display, color: pal.inkText, align: 'left', maxW: W * 0.3, alpha: inv(t, 0.05, 0.4) })
    // regla larga horizontal que cruza desde el indice hasta el margen derecho
    const ru = M.ease(inv(t, 0.15, 0.85)), rx0 = mx + 56, rx1 = W * 0.88, rxe = rx0 + (rx1 - rx0) * ru
    ctx.save(); ctx.strokeStyle = rgba(pal.ink, 0.22); ctx.lineWidth = 1.4
    ctx.beginPath(); ctx.moveTo(rx0, H * 0.24); ctx.lineTo(rxe, H * 0.24); ctx.stroke(); ctx.restore()
    // VIDA: punto de acento que recorre la regla en loop continuo
    if (ru > 0.95) { const u = sheenPos(t, 3.6); ctx.save(); ctx.fillStyle = pal.accent; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.arc(lerp(rx0, rx1, u), H * 0.24, 2.6, 0, TAU); ctx.fill(); ctx.restore() }
    // tic de acento al final de la regla + VIDA: respira + glow
    if (ru > 0.9) { ctx.save(); pulseGlow(ctx, pal.accent, t, { sp: 1.3, base: 1, amp: 4 }); ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.arc(rx1, H * 0.24, 4 * breathe(t, 1.3, 0.1), 0, TAU); ctx.fill(); ctx.restore() }
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
  register: 'neutral', intensity: 'medium', tags: ['lista', 'grilla', 'beneficios', 'dos-columnas'], beat: 'value',
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
      // marca: pildora de acento con tilde + VIDA: respira (fase por celda)
      const gpb = breathe(t, 1.1, 0.03, i * 1.4)
      ctx.save(); ctx.globalAlpha = tin; ctx.translate(x + 14, y); ctx.scale((0.8 + 0.2 * sp) * gpb, (0.8 + 0.2 * sp) * gpb)
      ctx.fillStyle = rgba(pal.accent, pal.tone === 'light' ? 0.16 : 0.24); ctx.beginPath(); ctx.arc(0, 0, 15, 0, TAU); ctx.fill()
      tick(ctx, 0, 0, 15, M.ease(tin), pal.inkText, 3)
      ctx.restore()
      // texto del item (envuelto a 2 lineas dentro de su columna)
      ctx.save(); ctx.globalAlpha = tin; ctx.translate((1 - M.ease(tin)) * 12, 0)
      drawWrapped(ctx, it, x + 38, y, { size: 21, min: 12, weight: 700, family: fonts.text, maxW: colW - 52, color: pal.ink, align: 'left', maxLines: 3, lh: 1.08 })
      ctx.restore()
    })
  },
})

// ---- lists/comparison (mas · OLA3) -----------------------------------------

// comparison "scale": balanza conceptual — item bueno pesa mas (cae), item viejo sube.
// Dos platos unidos por un fiel; el plato del lado bueno baja con spring. DECO en acento.
register({
  id: 'scene.comparison.scale', lib: 'scene-layouts', category: 'lists/comparison', tones: ['dark', 'light'], rubros: ['*'], weight: 0.9,
  register: 'editorial', intensity: 'medium', tags: ['comparacion', 'balanza', 'peso', 'editorial'], beat: 'value',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2
    const parts = splitItems(content.claim || content.tagline || 'Lo de siempre · Lo nuevo', 2)
    const left = parts[0] || 'Antes', right = parts[1] || 'Ahora'
    const pivX = cx, pivY = H * 0.34
    // inclinacion: el plato derecho baja (gana peso)
    const tilt = lerp(0, 0.16, M.ease(inv(t, 0.25, 1.0))) * (M.settle(inv(t, 0.3, 1.1), { zeta: 0.4, freq: 2.2 }))
    // VIDA: balanceo continuo MUY sutil del brazo/platos tras asentarse (la balanza "respira"); las etiquetas
    // se anclan al tilt ASENTADO (no al visual) -> el texto no se mueve, solo el brazo/bandejas de acento.
    const settled = inv(t, 0.3, 1.3), tiltVisual = tilt + drift(t, 0.9, 0.012) * settled
    // poste central
    ctx.save(); ctx.strokeStyle = rgba(pal.ink, 0.3); ctx.lineWidth = 3; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(pivX, pivY); ctx.lineTo(pivX, H * 0.7); ctx.stroke(); ctx.restore()
    // brazo (rota desde el pivote)
    const armW = W * 0.34
    ctx.save(); ctx.translate(pivX, pivY); ctx.rotate(tiltVisual); ctx.globalAlpha = inv(t, 0.1, 0.5)
    ctx.strokeStyle = pal.accent; ctx.lineWidth = 4; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(-armW, 0); ctx.lineTo(armW, 0); ctx.stroke()
    // platos (bandejas) colgando de cada punta: cuelgan rectos hacia abajo del brazo
    const tray = (px, full) => {
      ctx.save(); ctx.translate(px, 0); ctx.rotate(-tiltVisual)   // la bandeja cuelga vertical (compensa la inclinacion)
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
  register: 'corporate', intensity: 'medium', tags: ['dato', 'gauge', 'semicirculo', 'kpi'], beat: 'data',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2, cy = H * 0.5
    const num = numFrom(content); if (!num) { bigText(ctx, content.tagline || content.claim || content.brand, cx, H * 0.42, fonts, pal, inv(t, 0.05, 0.4)); return }
    const pct = (() => { const m = num.match(/(\d[\d.,]*)/); let v = m ? parseFloat(m[1].replace(/,/g, '')) : 75; if (num.indexOf('%') < 0) v = clamp(v, 0, 100); return clamp(v / 100, 0.06, 1) })()
    const R = 130, lw = 16
    // track del semicirculo (180°, de izq a der por arriba)
    ctx.save(); ctx.lineCap = 'round'
    ctx.strokeStyle = rgba(pal.ink, 0.12); ctx.lineWidth = lw
    ctx.beginPath(); ctx.arc(cx, cy, R, Math.PI, TAU); ctx.stroke()
    // relleno de acento segun pct + VIDA: glow pulsante
    const fill = M.ease(inv(t, 0.25, 1.2)) * pct
    if (fill > pct * 0.95) pulseGlow(ctx, pal.accent, t, { sp: 1.0, base: 2, amp: 5 })
    ctx.strokeStyle = pal.accent; ctx.lineWidth = lw
    ctx.beginPath(); ctx.arc(cx, cy, R, Math.PI, Math.PI + Math.PI * fill); ctx.stroke()
    ctx.restore()
    // VIDA: punto de brillo que recorre el arco lleno en loop
    if (fill > pct * 0.95) arcSheenDot(ctx, cx, cy, R, Math.PI, Math.PI * fill, t, { per: 4.5, dotR: 3, color: pal.tone === 'light' ? pal.accent : '#fff', tone: pal.tone })
    // aguja chica al final del relleno (DECO) + VIDA: respira
    const ang = Math.PI + Math.PI * fill, ndb = fill > pct * 0.95 ? breathe(t, 1.4, 0.08) : 1
    ctx.save(); ctx.fillStyle = pal.inkText
    ctx.beginPath(); ctx.arc(cx + Math.cos(ang) * R, cy + Math.sin(ang) * R, 7 * ndb, 0, TAU); ctx.fill(); ctx.restore()
    // numero grande dentro del arco
    const sp = M.settle(inv(t, 0.3, 1.0), { zeta: 0.5, freq: 2 })
    ctx.save(); ctx.translate(cx, cy - 22); ctx.scale(0.85 + 0.15 * sp, 0.85 + 0.15 * sp)
    drawText(ctx, num, 0, 0, { size: 72, weight: 800, family: fonts.display, maxW: R * 1.7, color: pal.ink, alpha: inv(t, 0.2, 0.7) })
    ctx.restore()
    // etiqueta debajo del arco
    drawWrapped(ctx, statLabel(content) || content.tagline || content.brand || 'completado', cx, cy + 50, { size: 21, weight: 700, family: fonts.text, maxW: W * 0.74, color: pal.dim, maxLines: 2, alpha: inv(t, 0.6, 1.1) })
  },
})

// ---- data/multi (mas · OLA3) -----------------------------------------------

// data "bars": mini grafico de barras verticales (3) con etiquetas; alturas estables
// por seed, la "ganadora" en acento. Editorial dashboard, distinto a data.multi (cifras).
register({
  id: 'scene.data.bars', lib: 'scene-layouts', category: 'data/multi', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  register: 'corporate', intensity: 'medium', tags: ['datos', 'barras', 'grafico', 'comparativa'], beat: 'data',
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
      const settledB = grow > 1.0 || tin > 0.95, lifeB = i === win && settledB ? breathe(t, 1.0, 0.02) : 1
      const bx = gx + slot * (i + 0.5) - bw / 2, bh = maxH * hs[i] * clamp(grow, 0, 1) * lifeB
      ctx.save(); ctx.globalAlpha = tin
      if (i === win && settledB) pulseGlow(ctx, pal.accent, t, { sp: 1.1, base: 2, amp: 5 })
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
  register: 'corporate', intensity: 'soft', tags: ['prueba-social', 'logos', 'confianza', 'cascada'], beat: 'proof',
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
    // regla de acento bajo la franja + VIDA: respira + sheen
    const ru = M.ease(inv(t, 0.6, 1.2)), lrw = 100 * ru * breathe(t, 0.9, 0.025)
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(cx - lrw / 2, H * 0.62, lrw, 4, 2); ctx.fill()
    if (ru > 0.9) rrSheen(ctx, cx - lrw / 2, H * 0.62, lrw, 4, t, { per: 3.0, strength: 0.5, tone: pal.tone })
    if (content.brand) drawText(ctx, (content.brand || '').toUpperCase(), cx, H * 0.68, { size: 15, weight: 700, family: fonts.accent || fonts.text, color: pal.inkText, maxW: W * 0.7, alpha: inv(t, 0.75, 1.25) })
  },
})

// social "rating": una nota grande (ej 4.9) a la izquierda + estrellas y conteo a la
// derecha. Layout asimetrico de rating, distinto a social.proof (estrellas centradas).
register({
  id: 'scene.social.rating', lib: 'scene-layouts', category: 'social/proof', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  register: 'friendly', intensity: 'medium', tags: ['prueba-social', 'rating', 'nota', 'asimetrico'], beat: 'proof',
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
    // 5 estrellas en fila bajo la nota + VIDA: titilan (escala+glow, fase por estrella)
    const fillP = M.ease(inv(t, 0.35, 1.1)) * 5, sr = 13, gap = 34
    for (let i = 0; i < 5; i++) {
      const f = clamp(fillP - i, 0, 1), tw = f >= 1 ? breathe(t, 1.4, 0.05, i * 1.7) : 1
      ctx.save(); ctx.translate(mx + 13 + i * gap, H * 0.56); ctx.scale(tw, tw)
      if (f >= 1) pulseGlow(ctx, pal.accent, t, { sp: 1.4, base: 1, amp: 3.5, ph: i * 1.7 })
      star(ctx, 0, 0, sr, f, pal.accent, rgba(pal.ink, 0.14)); ctx.restore()
    }
    // testimonio/conteo a la derecha-abajo
    drawWrapped(ctx, content.tagline || content.brand || 'sobre miles de opiniones reales', mx, H * 0.66, { size: 20, weight: 700, family: fonts.text, maxW: W * 0.74, color: pal.dim, align: 'left', maxLines: 2, alpha: inv(t, 0.55, 1.05) })
  },
})

// ---- closers/outro (mas · OLA3) --------------------------------------------

// outro "split": pantalla partida vertical — bloque de acento a la izquierda con el
// monograma, marca + CTA a la derecha. Cierre editorial asimetrico.
register({
  id: 'scene.outro.split', lib: 'scene-layouts', category: 'closers/outro', tones: ['dark', 'light'], rubros: ['*'], weight: 0.95,
  register: 'editorial', intensity: 'bold', tags: ['cierre', 'split', 'asimetrico', 'cta'], beat: 'close',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK
    // panel de acento que entra desde la izquierda (ocupa ~38% del ancho)
    const pw = W * 0.38, slide = M.ease(inv(t, 0.05, 0.75))
    ctx.save(); ctx.globalAlpha = inv(t, 0.0, 0.4); ctx.translate((1 - slide) * -pw, 0)
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.rect(0, 0, pw, H); ctx.fill()
    // VIDA: sheen vertical-ish suave que cruza el panel de acento (DECO continuo)
    if (slide > 0.95) { ctx.save(); ctx.globalAlpha = 0.4; rrSheen(ctx, 0, 0, pw, H, t, { per: 4.4, strength: 0.28, tone: pal.tone }); ctx.restore() }
    // monograma en onAccent dentro del panel
    const init = (content.brand || 'M').trim().charAt(0).toUpperCase()
    drawText(ctx, init, pw / 2, H * 0.46, { size: 96, weight: 800, family: fonts.display, color: pal.onAccent, maxW: pw - 20, alpha: inv(t, 0.3, 0.8) })
    ctx.restore()
    // lado derecho: marca + cta, alineado a izquierda dentro del area
    const rx = pw + W * 0.07
    drawWrapped(ctx, content.brand || 'Marca', rx, H * 0.4, { size: 38, weight: 800, family: fonts.display, maxW: W - rx - W * 0.06, color: pal.ink, align: 'left', maxLines: 2, lh: 1.04, alpha: inv(t, 0.4, 0.9) })
    // regla de acento + VIDA: respira + sheen
    const ru = M.ease(inv(t, 0.55, 1.1)), srw = 70 * ru * breathe(t, 0.9, 0.025)
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(rx, H * 0.5, srw, 5, 2.5); ctx.fill()
    if (ru > 0.9) rrSheen(ctx, rx, H * 0.5, srw, 5, t, { per: 3.0, strength: 0.5, tone: pal.tone })
    const cta = content.cta || content.tagline
    if (cta) {
      drawWrapped(ctx, cta, rx, H * 0.58, { size: 22, weight: 700, family: fonts.text, maxW: W - rx - W * 0.06, color: pal.inkText, align: 'left', maxLines: 2, lh: 1.16, alpha: inv(t, 0.7, 1.2) })
      const chp = M.ease(inv(t, 0.9, 1.4))
      ctx.save(); if (chp > 0.95) pulseGlow(ctx, pal.accent, t, { sp: 1.5, base: 1, amp: 4 })
      chevron(ctx, rx + 6 + (chp >= 1 ? drift(t, 1.5, 1.8) : 0), H * 0.66, 13, pal.accent, 4, chp); ctx.restore()
    }
  },
})

// ---- connectors/interstitial (mas · OLA3) ----------------------------------

// interstitial "rule": una palabra de bisagra alineada a izquierda con un NUMERO de
// capitulo gigante y una regla larga que la subraya cruzando la pantalla. Editorial.
register({
  id: 'scene.interstitial.rule', lib: 'scene-layouts', category: 'connectors/interstitial', tones: ['dark', 'light'], rubros: ['*'], weight: 0.9,
  register: 'editorial', intensity: 'soft', tags: ['transicion', 'capitulo', 'regla', 'editorial'], beat: 'context',
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
    // regla larga de acento que cruza bajo la palabra + VIDA: respira + sheen
    const ru = M.ease(inv(t, 0.45, 1.1)), irw = (W * 0.9 - mx) * ru * breathe(t, 0.85, 0.015)
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(mx, H * 0.57, irw, 5, 2.5); ctx.fill()
    if (ru > 0.9) rrSheen(ctx, mx, H * 0.57, irw, 5, t, { per: 3.2, strength: 0.5, tone: pal.tone })
  },
})

// interstitial "arrows": tres chevrones de acento que avanzan en cascada con una
// palabra de transicion centrada. Sensacion de "seguimos" / "siguiente". DECO en acento.
register({
  id: 'scene.interstitial.arrows', lib: 'scene-layouts', category: 'connectors/interstitial', tones: ['dark', 'light'], rubros: ['*'], weight: 0.85,
  register: 'neutral', intensity: 'medium', tags: ['transicion', 'flechas', 'avance', 'bisagra'], beat: 'context',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK
    const word = firstStrong(content.tagline || content.claim || content.cta, 'SEGUIMOS').toUpperCase()
    // SLOT: la palabra como titulo, ubicada por el layout (antes cx/cy=H*0.42 fijos); los chevrones se anclan a ella
    const L = place(env, [{ id: 'word', kind: 'title', text: word }]), wS = L.word, cx = wS.cx, cy = wS.cy
    // palabra centrada que entra con spring, en su slot
    const sp = M.settle(inv(t, 0.15, 1.0), { zeta: 0.5, freq: 2.1 }), sc = 0.82 + 0.18 * sp
    ctx.save(); ctx.globalAlpha = inv(t, 0.1, 0.5); ctx.translate(cx, cy); ctx.scale(sc, sc)
    drawText(ctx, word, 0, 0, { size: Math.min(wS.size, 50), weight: 800, family: fonts.display, color: pal.ink, maxW: wS.w, align: wS.align, shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.4)' : null })
    ctx.restore()
    // tres chevrones bajo la palabra, en cascada (cada uno con su delay)
    // VIDA: tras entrar, una onda de brillo "avanza" recorriendo los chevrones en loop (sensacion de seguir)
    const gx = cx - 28, gap = 28, by = wS.y + wS.h / 2 + 70
    for (let i = 0; i < 3; i++) {
      const tin = inv(t, 0.4 + i * 0.14, 0.9 + i * 0.14); if (tin <= 0) continue
      const settled = tin >= 1
      const wave = settled ? 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(t * 2.4 - i * 1.1)) : (0.5 + 0.5 * i / 2)
      ctx.save(); ctx.globalAlpha = tin * wave
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
  register: 'editorial', intensity: 'medium', tags: ['apertura', 'kicker', 'linea-tiempo', 'editorial'], beat: 'hook',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, mx = W * 0.1
    const kp = M.settle(inv(t, 0.05, 0.7), { zeta: 0.5, freq: 2 })
    const label = (content.brand || 'Marca').toUpperCase()
    ctx.save(); ctx.font = `700 14px "${fonts.accent || fonts.text}"`
    const lw = Math.min(W * 0.6, ctx.measureText(label).width), pw = lw + 28
    ctx.globalAlpha = inv(t, 0.05, 0.4); ctx.translate(mx + pw / 2, H * 0.26); ctx.scale(0.85 + 0.15 * kp, 0.85 + 0.15 * kp)
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(-pw / 2, -16, pw, 32, 16); ctx.fill()
    if (kp > 0.9) rrSheen(ctx, -pw / 2, -16, pw, 32, t, { per: 3.4, strength: 0.4, tone: pal.tone })   // VIDA: sheen en el kicker
    drawText(ctx, label, 0, 1, { size: 14, weight: 700, family: fonts.accent || fonts.text, color: pal.onAccent, maxW: lw })
    ctx.restore()
    const rise = M.settle(inv(t, 0.2, 1.0), 1.2)
    ctx.save(); ctx.globalAlpha = inv(t, 0.2, 0.7); ctx.translate(0, (1 - rise) * 32)
    drawWrapped(ctx, content.claim || content.tagline || content.brand || 'Empeza distinto', mx, H * 0.5, { size: 48, weight: 800, family: fonts.display, maxW: W * 0.8, color: pal.ink, align: 'left', maxLines: 3, lh: 1.08, shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.45)' : null })
    ctx.restore()
    const ty = H * 0.72, x1 = W - mx, lu = M.ease(inv(t, 0.5, 1.15))
    ctx.save(); ctx.strokeStyle = rgba(pal.ink, 0.2); ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(mx, ty); ctx.lineTo(mx + (x1 - mx) * lu, ty); ctx.stroke(); ctx.restore()
    // VIDA: punto de acento que recorre la linea de tiempo en loop
    if (lu > 0.95) { const u = sheenPos(t, 3.8); ctx.save(); ctx.fillStyle = pal.accent; ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.arc(lerp(mx, x1, u), ty, 2.6, 0, TAU); ctx.fill(); ctx.restore() }
    for (let i = 0; i < 3; i++) {
      const nx = mx + (x1 - mx) * (i / 2), np = M.settle(inv(t, 0.7 + i * 0.12, 1.2 + i * 0.12), { zeta: 0.5, freq: 2 })
      if (np <= 0) continue
      const isAcc = i === 2, nb = isAcc && np > 0.9 ? breathe(t, 1.2, 0.06) : 1   // VIDA: el nodo de acento late
      ctx.save(); ctx.translate(nx, ty); ctx.scale(np * nb, np * nb)
      if (isAcc && np > 0.9) pulseGlow(ctx, pal.accent, t, { sp: 1.2, base: 1, amp: 5 })
      ctx.fillStyle = isAcc ? pal.accent : rgba(pal.ink, 0.4); ctx.beginPath(); ctx.arc(0, 0, isAcc ? 7 : 5, 0, TAU); ctx.fill(); ctx.restore()
    }
  },
})

// ---- openers/hook (mas · OLA5) ---------------------------------------------

// hook "redacted": frase de contexto + palabra clave revelada (barra de acento que se
// desliza para descubrirla). Gancho de intriga, distinto a strike/marginnum.
register({
  id: 'scene.hook.redacted', lib: 'scene-layouts', category: 'openers/hook', tones: ['dark', 'light'], rubros: ['*'], weight: 0.9,
  register: 'editorial', intensity: 'bold', tags: ['hook', 'intriga', 'revelado', 'gancho'], beat: 'hook',
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
    const ru = M.ease(inv(t, 0.9, 1.4)), rdw = tw * ru * breathe(t, 0.9, 0.02)
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(cx - rdw / 2, H * 0.62, rdw, 4, 2); ctx.fill()
    if (ru > 0.9) rrSheen(ctx, cx - rdw / 2, H * 0.62, rdw, 4, t, { per: 3.0, strength: 0.5, tone: pal.tone })
  },
})

// ---- statements/editorial (mas · OLA5) -------------------------------------

// statement "dropcap": capitular gigante (1ra letra) en acento a la izquierda, resto
// del claim envuelto a su derecha. Editorial de revista, distinto a quoted/index.
register({
  id: 'scene.statement.dropcap', lib: 'scene-layouts', category: 'statements/editorial', tones: ['dark', 'light'], rubros: ['*'], weight: 0.95,
  register: 'editorial', intensity: 'medium', tags: ['claim', 'capitular', 'editorial', 'revista'], beat: 'value',
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
    // VIDA: la capitular de acento respira suave + glow pulsante (es DECO; el cuerpo no se mueve)
    const capB = sp > 0.9 ? breathe(t, 0.7, 0.012) : 1
    ctx.save(); ctx.globalAlpha = inv(t, 0.05, 0.45); ctx.translate(capX + capW / 2, capY + capSize * 0.34); ctx.scale((0.8 + 0.2 * sp) * capB, (0.8 + 0.2 * sp) * capB)
    if (sp > 0.9) pulseGlow(ctx, pal.accent, t, { sp: 0.8, base: 0, amp: 6 })
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
  register: 'editorial', intensity: 'medium', tags: ['claim', 'subrayado', 'marcador', 'centrado'], beat: 'value',
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
    const uw = (lw + 8) * hu, ux = cx - lw / 2 - 4, uy = y0 + (L.lines.length - 1) * lineH + L.size * 0.2, uh = L.size * 0.42
    ctx.save(); ctx.globalAlpha = (pal.tone === 'light' ? 0.22 : 0.3) * breathe(t, 0.8, 0.06)
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(ux, uy, uw, uh, 4); ctx.fill(); ctx.restore()
    // VIDA: sheen recorre la banda-marcador (DECO continuo, detras del texto)
    if (hu > 0.95) { ctx.save(); ctx.globalAlpha = 0.5; rrSheen(ctx, ux, uy, uw, uh, t, { per: 3.4, strength: 0.3, tone: pal.tone }); ctx.restore() }
  },
})

// ---- lists/checklist (mas · OLA5) ------------------------------------------

// checklist "timeline": items en linea vertical con nodos numerados de acento y rieles.
// Layout de "pasos en linea de tiempo", distinto a ticks/numbered/grid.
register({
  id: 'scene.checklist.timeline', lib: 'scene-layouts', category: 'lists/checklist', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  register: 'neutral', intensity: 'medium', tags: ['lista', 'pasos', 'linea-tiempo', 'proceso'], beat: 'value',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, mx = W * 0.14
    const items = listFrom(content, 'Conecta · Configura · Lanza · Crece', 4)
    if (content.brand) drawText(ctx, (content.brand || '').toUpperCase(), mx, H * 0.22, { size: 16, weight: 700, family: fonts.accent || fonts.text, color: pal.inkText, align: 'left', maxW: W * 0.74, alpha: inv(t, 0.05, 0.35) })
    const y0 = H * 0.34, gap = Math.min(96, (H * 0.5) / Math.max(1, items.length)), railX = mx + 2
    const rail = M.ease(inv(t, 0.2, 1.0)), railBot = y0 + (items.length - 1) * gap * rail
    if (items.length > 1) {
      ctx.save(); ctx.strokeStyle = rgba(pal.ink, 0.18); ctx.lineWidth = 2.5
      ctx.beginPath(); ctx.moveTo(railX, y0); ctx.lineTo(railX, railBot); ctx.stroke(); ctx.restore()
      // VIDA: pulso de acento que baja por el riel en loop (sensacion de proceso vivo)
      if (rail > 0.95) { const u = sheenPos(t, 4.0), dy = y0 + (railBot - y0) * u; ctx.save(); ctx.fillStyle = pal.accent; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.arc(railX, dy, 3, 0, TAU); ctx.fill(); ctx.restore() }
    }
    items.forEach((it, i) => {
      const tin = inv(t, 0.2 + i * 0.16, 0.72 + i * 0.16); if (tin <= 0) return
      const y = y0 + i * gap, sp = M.settle(tin, { zeta: 0.5, freq: 2 }), nb = tin >= 1 ? breathe(t, 1.0, 0.025, i * 1.2) : 1
      ctx.save(); ctx.globalAlpha = tin; ctx.translate(railX, y)
      ctx.save(); ctx.scale((0.8 + 0.2 * sp) * nb, (0.8 + 0.2 * sp) * nb)
      ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.arc(0, 0, 16, 0, TAU); ctx.fill(); ctx.restore()
      ctx.scale(0.8 + 0.2 * sp, 0.8 + 0.2 * sp)
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
  register: 'corporate', intensity: 'medium', tags: ['comparacion', 'tabla', 'features', 'check-cruz'], beat: 'value',
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
      const tb = cp >= 1 ? breathe(t, 1.1, 0.035, i * 1.3) : 1   // VIDA: el disco-tilde respira (fase por fila)
      ctx.save(); ctx.globalAlpha = tin; ctx.translate(c2, y); ctx.scale(tb, tb)
      ctx.fillStyle = rgba(pal.accent, pal.tone === 'light' ? 0.16 : 0.24); ctx.beginPath(); ctx.arc(0, 0, 14, 0, TAU); ctx.fill()
      tick(ctx, 0, 0, 14, cp, pal.inkText, 3)
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
  register: 'corporate', intensity: 'medium', tags: ['dato', 'donut', 'porcentaje', 'kpi'], beat: 'data',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2, cy = H * 0.42
    const num = numFrom(content); if (!num) { bigText(ctx, content.tagline || content.claim || content.brand, cx, H * 0.42, fonts, pal, inv(t, 0.05, 0.4)); return }
    const pct = (() => { const m = num.match(/(\d[\d.,]*)/); let v = m ? parseFloat(m[1].replace(/,/g, '')) : 60; if (num.indexOf('%') < 0) v = clamp(v, 0, 100); return clamp(v / 100, 0.05, 1) })()
    const R = 116, lw = 30
    ctx.save(); ctx.lineCap = 'butt'
    ctx.strokeStyle = rgba(pal.ink, 0.1); ctx.lineWidth = lw
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke()
    const fill = M.ease(inv(t, 0.2, 1.2)) * pct
    if (fill > pct * 0.95) pulseGlow(ctx, pal.accent, t, { sp: 1.0, base: 2, amp: 6 })
    ctx.strokeStyle = pal.accent; ctx.lineWidth = lw
    ctx.beginPath(); ctx.arc(cx, cy, R, -TAU / 4, -TAU / 4 + TAU * fill); ctx.stroke()
    ctx.restore()
    // VIDA: punto de brillo que recorre el segmento de acento en loop
    if (fill > pct * 0.95) arcSheenDot(ctx, cx, cy, R, -TAU / 4, TAU * fill, t, { per: 4.5, dotR: 4, color: pal.tone === 'light' ? '#fff' : '#fff', tone: pal.tone })
    const sp = M.settle(inv(t, 0.3, 1.0), { zeta: 0.5, freq: 2 })
    ctx.save(); ctx.translate(cx, cy); ctx.scale(0.85 + 0.15 * sp, 0.85 + 0.15 * sp)
    drawText(ctx, num, 0, 0, { size: 64, weight: 800, family: fonts.display, maxW: (R - lw) * 1.7, color: pal.ink, alpha: inv(t, 0.25, 0.7) })
    ctx.restore()
    drawWrapped(ctx, statLabel(content) || content.tagline || content.brand || 'del total', cx, H * 0.68, { size: 22, weight: 700, family: fonts.text, maxW: W * 0.74, color: pal.dim, maxLines: 2, alpha: inv(t, 0.6, 1.1) })
  },
})

// ---- data/multi (mas · OLA5) -----------------------------------------------

// data "stack": una barra horizontal apilada en N segmentos (proporciones estables por
// seed) + leyenda con porcentajes. Distinto a multi (cifras) y bars (verticales).
register({
  id: 'scene.data.stack', lib: 'scene-layouts', category: 'data/multi', tones: ['dark', 'light'], rubros: ['*'], weight: 0.95,
  register: 'corporate', intensity: 'medium', tags: ['datos', 'apilado', 'distribucion', 'grafico'], beat: 'data',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK
    const labels = splitItems(content.claim || content.tagline || 'Ventas · Soporte · Marketing', 3).map(l => shortLabel(l, 2))
    const n = Math.min(3, Math.max(2, labels.length || 3))
    const r = mulberry32((env.seed >>> 0) ^ 0x57a)
    const raw = []; for (let i = 0; i < n; i++) raw.push(0.4 + 0.6 * r()); const sum = raw.reduce((a, b) => a + b, 0)
    const props = raw.map(v => v / sum), win = props.indexOf(Math.max(...props))
    if (content.brand) drawText(ctx, (content.brand || '').toUpperCase(), W / 2, H * 0.26, { size: 16, weight: 700, family: fonts.accent || fonts.text, color: pal.inkText, maxW: W * 0.8, alpha: inv(t, 0.05, 0.35) })
    const bw = W * 0.8, bx = (W - bw) / 2, by = H * 0.44, bh = 44, grow = M.ease(inv(t, 0.25, 1.15))
    let cur = bx, winX = bx, winW = 0
    ctx.save()
    for (let i = 0; i < n; i++) {
      const segW = bw * props[i] * grow
      ctx.fillStyle = i === win ? pal.accent : rgba(pal.ink, 0.16 + 0.08 * i)
      const rad = i === 0 ? [bh / 2, 0, 0, bh / 2] : (i === n - 1 ? [0, bh / 2, bh / 2, 0] : 0)
      const drawW = Math.max(0, segW - (i < n - 1 ? 2 : 0))
      ctx.beginPath(); ctx.roundRect(cur, by, drawW, bh, rad); ctx.fill()
      if (i === win) { winX = cur; winW = drawW }
      cur += bw * props[i] * grow
    }
    ctx.restore()
    // VIDA: sheen recorre el segmento ganador (acento) en loop continuo
    if (grow > 0.95 && winW > 24) rrSheen(ctx, winX, by, winW, bh, t, { per: 3.2, strength: 0.45, tone: pal.tone })
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
  register: 'friendly', intensity: 'soft', tags: ['prueba-social', 'testimonio', 'tarjeta', 'avatar'], beat: 'proof',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2
    const gp = M.settle(inv(t, 0.1, 0.9), { zeta: 0.5, freq: 2 })
    const pw = W * 0.8, ph = H * 0.42, px = cx - pw / 2, py = H * 0.28
    ctx.save(); ctx.globalAlpha = inv(t, 0.05, 0.45); ctx.translate(cx, py + ph / 2); ctx.scale(0.9 + 0.1 * gp, 0.9 + 0.1 * gp); ctx.translate(-cx, -(py + ph / 2))
    ctx.fillStyle = pal.tone === 'light' ? 'rgba(20,16,24,0.05)' : 'rgba(255,255,255,0.06)'
    ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 18); ctx.fill()
    ctx.restore()
    // VIDA: la comilla de acento respira de escala/opacidad (DECO continuo)
    ctx.save(); ctx.globalAlpha = inv(t, 0.05, 0.45) * breathe(t, 0.7, 0.07); const qb = gp > 0.9 ? breathe(t, 0.6, 0.02) : 1
    ctx.translate(px + 28, py + 30); ctx.scale(qb, qb)
    drawText(ctx, '“', 0, 0, { size: 70, weight: 800, family: fonts.display, color: pal.accent, align: 'left', maxW: 80 })
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
  register: 'friendly', intensity: 'medium', tags: ['prueba-social', 'avatares', 'comunidad', 'fila'], beat: 'proof',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2
    const r = mulberry32((env.seed >>> 0) ^ 0xa11)
    const n = 5, rad = 26, overlap = rad * 1.3, rowW = (n - 1) * overlap + rad * 2
    avatarRow(ctx, cx - rowW / 2 + rad, H * 0.36, rad, n, r, M, t, pal, fonts, 0.2, 0.09)
    drawWrapped(ctx, content.claim || content.tagline || 'Miles ya se sumaron esta semana', cx, H * 0.54, { size: 28, weight: 800, family: fonts.display, maxW: W * 0.82, color: pal.ink, maxLines: 2, lh: 1.14, alpha: inv(t, 0.45, 0.95), shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.4)' : null })
    // 5 estrellas + VIDA: titilan (escala+glow, fase por estrella)
    const fillP = M.ease(inv(t, 0.65, 1.25)) * 5, sr = 11, gap = 30, x0 = cx - gap * 2
    for (let i = 0; i < 5; i++) {
      const f = clamp(fillP - i, 0, 1), tw = f >= 1 ? breathe(t, 1.4, 0.06, i * 1.7) : 1
      ctx.save(); ctx.translate(x0 + i * gap, H * 0.64); ctx.scale(tw, tw)
      if (f >= 1) pulseGlow(ctx, pal.accent, t, { sp: 1.4, base: 1, amp: 3, ph: i * 1.7 })
      star(ctx, 0, 0, sr, f, pal.accent, rgba(pal.ink, 0.14)); ctx.restore()
    }
    if (content.brand) drawText(ctx, (content.brand || '').toUpperCase(), cx, H * 0.71, { size: 15, weight: 700, family: fonts.accent || fonts.text, color: pal.inkText, maxW: W * 0.7, alpha: inv(t, 0.8, 1.3) })
  },
})

// ---- closers/outro (mas · OLA5) --------------------------------------------

// outro "stamp": marca centrada dentro de un sello circular (anillo doble de acento)
// que entra rotando y se asienta. Cierre tipo "garantia/sello". Distinto a lockup/split.
register({
  id: 'scene.outro.stamp', lib: 'scene-layouts', category: 'closers/outro', tones: ['dark', 'light'], rubros: ['*'], weight: 0.9,
  register: 'editorial', intensity: 'medium', tags: ['cierre', 'sello', 'garantia', 'marca'], beat: 'close',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2, cy = H * 0.42
    const sp = M.settle(inv(t, 0.1, 1.0), { zeta: 0.45, freq: 2.1 })
    const R = 118, entered = inv(t, 0.1, 1.0)
    // VIDA: tras entrar, el sello gira muy lento de forma continua (idle) + glow pulsante (anillo simetrico -> el giro no afecta legibilidad)
    const rot = (1 - M.ease(inv(t, 0.1, 0.9))) * -0.12 + drift(t, 0.18, 0.05) * entered
    ctx.save(); ctx.globalAlpha = inv(t, 0.05, 0.45); ctx.translate(cx, cy); ctx.rotate(rot); ctx.scale((0.8 + 0.2 * sp) * (entered > 0.9 ? breathe(t, 0.8, 0.01) : 1), (0.8 + 0.2 * sp) * (entered > 0.9 ? breathe(t, 0.8, 0.01) : 1))
    if (entered > 0.9) pulseGlow(ctx, pal.accent, t, { sp: 0.9, base: 2, amp: 5 })
    ctx.strokeStyle = pal.accent; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.stroke()
    ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, R - 12, 0, TAU); ctx.stroke()
    ctx.restore()
    ctx.save(); ctx.translate(cx, cy)
    drawWrapped(ctx, content.brand || 'Marca', 0, -6, { size: 40, weight: 800, family: fonts.display, maxW: R * 1.5, color: pal.ink, maxLines: 2, lh: 1.02, alpha: inv(t, 0.35, 0.85) })
    const sub = content.cta || content.tagline
    // sub-label chico dentro del sello: min bajo -> si el texto es largo ACHICA en vez de cortar con "..." (un CTA
    // corto queda a 15px; uno largo baja hasta 9px pero se ve COMPLETO). maxW un poco mas ancho que el disco interior.
    if (sub) drawText(ctx, sub, 0, 34, { size: 15, min: 9, weight: 700, family: fonts.accent || fonts.text, color: pal.inkText, maxW: R * 1.55, alpha: inv(t, 0.6, 1.1) })
    ctx.restore()
    const stp = M.ease(inv(t, 0.6, 1.2))
    if (stp > 0.4) {
      // VIDA: las estrellas laterales titilan (escala+glow, en contrafase)
      for (const [sx2, ph] of [[cx - R - 4, 0], [cx + R + 4, Math.PI]]) {
        const sb = stp >= 1 ? breathe(t, 1.3, 0.08, ph) : 1
        ctx.save(); ctx.translate(sx2, cy); ctx.scale(sb, sb); if (stp >= 1) pulseGlow(ctx, pal.accent, t, { sp: 1.3, base: 0, amp: 3, ph })
        star(ctx, 0, 0, 9, 1, pal.accent, rgba(pal.ink, 0.1)); ctx.restore()
      }
    }
  },
})

// ---- connectors/interstitial (mas · OLA5) ----------------------------------

// interstitial "dots": palabra de bisagra centrada + fila de dots de progreso (uno de
// acento "activo", alargado). Sensacion de "paso N". Distinto a word/sweep/count/rule/arrows.
register({
  id: 'scene.interstitial.dots', lib: 'scene-layouts', category: 'connectors/interstitial', tones: ['dark', 'light'], rubros: ['*'], weight: 0.85,
  register: 'neutral', intensity: 'soft', tags: ['transicion', 'progreso', 'dots', 'bisagra'], beat: 'context',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK
    const word = firstStrong(content.tagline || content.claim || content.brand, 'AHORA').toUpperCase()
    // SLOT: la palabra como titulo, ubicada por el layout (antes cx/cy=H*0.42 fijos); los dots se anclan a ella
    const L = place(env, [{ id: 'word', kind: 'title', text: word }]), wS = L.word, cx = wS.cx, cy = wS.cy
    const sp = M.settle(inv(t, 0.15, 1.0), { zeta: 0.5, freq: 2.1 }), sc = 0.82 + 0.18 * sp
    ctx.save(); ctx.globalAlpha = inv(t, 0.1, 0.5); ctx.translate(cx, cy); ctx.scale(sc, sc)
    drawText(ctx, word, 0, 0, { size: Math.min(wS.size, 52), weight: 800, family: fonts.display, color: pal.ink, maxW: wS.w, align: wS.align, shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.4)' : null })
    ctx.restore()
    const r = mulberry32((env.seed >>> 0) ^ 0xd07)
    const total = 4, active = (r() * total) | 0
    const gap = 26, x0 = cx - gap * (total - 1) / 2, dy = wS.y + wS.h / 2 + 64
    for (let i = 0; i < total; i++) {
      const tin = inv(t, 0.4 + i * 0.08, 0.9 + i * 0.08); if (tin <= 0) continue
      const settled = tin >= 1
      ctx.save(); ctx.globalAlpha = tin
      if (i === active) {
        // VIDA: el dot activo respira de largo + glow pulsante
        if (settled) pulseGlow(ctx, pal.accent, t, { sp: 1.2, base: 1, amp: 4 })
        const aw = 18 * M.ease(tin) * (settled ? breathe(t, 1.1, 0.08) : 1)
        ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(x0 + i * gap - aw / 2, dy - 4, aw, 8, 4); ctx.fill()
      } else {
        // VIDA: los dots inactivos parpadean en secuencia (onda sutil)
        ctx.globalAlpha = tin * (settled ? 0.7 + 0.3 * (0.5 + 0.5 * Math.sin(t * 2.0 - i * 0.9)) : 1)
        ctx.fillStyle = rgba(pal.ink, 0.28); ctx.beginPath(); ctx.arc(x0 + i * gap, dy, 4, 0, TAU); ctx.fill()
      }
      ctx.restore()
    }
  },
})

// interstitial "marquee": dos bandas de acento (arriba y abajo) que barren en sentidos
// opuestos enmarcando una palabra. Energia de "ultimo momento". Distinto a sweep.
register({
  id: 'scene.interstitial.marquee', lib: 'scene-layouts', category: 'connectors/interstitial', tones: ['dark', 'light'], rubros: ['*'], weight: 0.8,
  register: 'playful', intensity: 'bold', tags: ['transicion', 'bandas', 'noticia', 'energia'], beat: 'context',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK
    const word = firstStrong(content.tagline || content.claim || content.cta, 'ATENCION').toUpperCase()
    // SLOT: la palabra como titulo, ubicada por el layout (antes cx/cy=H*0.42 fijos); las bandas la enmarcan
    const L = place(env, [{ id: 'word', kind: 'title', text: word }]), wS = L.word, cx = wS.cx, cy = wS.cy
    const bh = 18, byT = cy - 58, byB = cy + 40
    const su = M.ease(inv(t, 0.05, 0.7)), sd = M.ease(inv(t, 0.15, 0.8))
    ctx.save(); ctx.globalAlpha = inv(t, 0.05, 0.4) * breathe(t, 0.8, 0.06); ctx.fillStyle = pal.accent
    ctx.beginPath(); ctx.rect(0, byT, W * su, bh); ctx.fill()
    ctx.beginPath(); ctx.rect(W * (1 - sd), byB, W * sd, bh); ctx.fill()
    ctx.restore()
    // VIDA: sheen recorre cada banda en sentidos opuestos (energia continua de noticiero)
    if (su > 0.95) rrSheen(ctx, 0, byT, W * su, bh, t, { per: 2.6, strength: 0.45, tone: pal.tone })
    if (sd > 0.95) rrSheen(ctx, W * (1 - sd), byB, W * sd, bh, t, { per: 2.6, ph: 0.5, strength: 0.45, tone: pal.tone })
    const sp = M.settle(inv(t, 0.3, 1.05), { zeta: 0.5, freq: 2.1 }), sc = 0.85 + 0.15 * sp
    ctx.save(); ctx.globalAlpha = inv(t, 0.25, 0.65); ctx.translate(cx, cy); ctx.scale(sc, sc)
    drawText(ctx, word, 0, 0, { size: Math.min(wS.size, 48), weight: 800, family: fonts.display, color: pal.ink, maxW: wS.w, align: wS.align, shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.4)' : null })
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
  register: 'corporate', intensity: 'medium', tags: ['apertura', 'grilla', 'blueprint', 'tecnico'], beat: 'hook',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2
    // grilla de fondo: lineas verticales+horizontales que aparecen en cascada (DECO tinta tenue)
    const gp = M.ease(inv(t, 0.0, 0.7)), cols = 5, rowsN = 8
    // VIDA: la grilla de fondo respira de opacidad muy sutil (blueprint que late)
    ctx.save(); ctx.strokeStyle = rgba(pal.ink, (pal.tone === 'light' ? 0.06 : 0.08) * breathe(t, 0.5, 0.14)); ctx.lineWidth = 1
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
    // cruz de registro de acento bajo el claim (DECO) + VIDA: gira lentisimo + glow pulsante
    const cu = M.ease(inv(t, 0.6, 1.2))
    if (cu > 0) { ctx.save(); const cyx = H * 0.62, r = 10 * cu * (cu >= 1 ? breathe(t, 1.0, 0.05) : 1); ctx.translate(cx, cyx); ctx.rotate(cu >= 1 ? drift(t, 0.4, 0.18) : 0); ctx.strokeStyle = pal.accent; ctx.lineWidth = 3; ctx.lineCap = 'round'; if (cu >= 1) pulseGlow(ctx, pal.accent, t, { sp: 1.1, base: 1, amp: 4 }); ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.moveTo(0, -r); ctx.lineTo(0, r); ctx.stroke(); ctx.restore() }
  },
})

// hero "corner": marca/kicker anclado arriba-derecha + claim gigante anclado abajo-izq,
// con un angulo de acento (esquina) en la esquina inferior izquierda. Composicion de poster.
register({
  id: 'scene.hero.corner', lib: 'scene-layouts', category: 'openers/hero', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  register: 'editorial', intensity: 'bold', tags: ['apertura', 'poster', 'esquina', 'asimetrico'], beat: 'hook',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, mx = W * 0.1
    // kicker arriba-derecha
    drawText(ctx, (content.brand || 'Marca').toUpperCase(), W - mx, H * 0.18, { size: 16, weight: 700, family: fonts.accent || fonts.text, color: pal.inkText, align: 'right', maxW: W * 0.7, alpha: inv(t, 0.05, 0.45) })
    // angulo de acento en la esquina inferior izquierda (dos trazos en L que crecen) + VIDA: glow + punto que recorre la L
    const lu = M.ease(inv(t, 0.1, 0.8)), len = 64 * lu, ex = mx - 6, ey = H * 0.86
    ctx.save(); ctx.strokeStyle = pal.accent; ctx.lineWidth = 5; ctx.lineCap = 'round'
    if (lu > 0.95) pulseGlow(ctx, pal.accent, t, { sp: 1.0, base: 1, amp: 5 })
    ctx.beginPath(); ctx.moveTo(ex, ey - len); ctx.lineTo(ex, ey); ctx.lineTo(ex + len, ey); ctx.stroke(); ctx.restore()
    if (lu > 0.95) {
      const u = sheenPos(t, 3.2), seg = u * (2 * len)   // recorre el vertical (bajada) y luego el horizontal (salida)
      const dx = seg <= len ? ex : ex + (seg - len), dy = seg <= len ? ey - len + seg : ey
      ctx.save(); ctx.fillStyle = 'rgba(255,255,255,' + (pal.tone === 'light' ? 0.55 : 0.9) + ')'; ctx.beginPath(); ctx.arc(dx, dy, 3, 0, TAU); ctx.fill(); ctx.restore()
    }
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
  register: 'friendly', intensity: 'medium', tags: ['hook', 'completar', 'blanco', 'gancho'], beat: 'hook',
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
    const blw = (tw + 12) * blankU * breathe(t, 0.9, 0.018), blx = cx - blw / 2
    ctx.save(); ctx.fillStyle = pal.accent; ctx.globalAlpha = inv(t, 0.25, 0.55)
    ctx.beginPath(); ctx.roundRect(blx, by + 32, blw, 6, 3); ctx.fill(); ctx.restore()
    // VIDA: sheen recorre la raya/blanco de acento (DECO continuo)
    if (blankU > 0.95) rrSheen(ctx, blx, by + 32, blw, 6, t, { per: 3.0, strength: 0.5, tone: pal.tone })
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
  register: 'editorial', intensity: 'medium', tags: ['claim', 'corchetes', 'centrado', 'editorial'], beat: 'value',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2
    const src = content.claim || content.tagline || content.brand || 'Sin vueltas'
    const L = wrapLinesLocal(ctx, src, 40, W * 0.8, 24, 800, fonts.display, 4)
    const lineH = L.size * 1.18, blockH = (L.lines.length - 1) * lineH, cyc = H * 0.46, y0 = cyc - blockH / 2
    // regla superior e inferior de acento que crecen desde el centro + VIDA: respira + sheen (contrafase)
    const ru = M.ease(inv(t, 0.05, 0.65)), rw = W * 0.42 * ru * breathe(t, 0.85, 0.02)
    const byT = y0 - L.size * 0.85, byB = y0 + blockH + L.size * 0.85
    ctx.save(); ctx.fillStyle = pal.accent
    ctx.beginPath(); ctx.roundRect(cx - rw / 2, byT, rw, 5, 2.5); ctx.fill()
    ctx.beginPath(); ctx.roundRect(cx - rw / 2, byB, rw, 5, 2.5); ctx.fill(); ctx.restore()
    if (ru > 0.9) { rrSheen(ctx, cx - rw / 2, byT, rw, 5, t, { per: 3.2, strength: 0.5, tone: pal.tone }); rrSheen(ctx, cx - rw / 2, byB, rw, 5, t, { per: 3.2, ph: 0.5, strength: 0.5, tone: pal.tone }) }
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
  register: 'editorial', intensity: 'medium', tags: ['claim', 'marcador', 'barra-lateral', 'editorial'], beat: 'value',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, mx = W * 0.12
    const src = content.claim || content.tagline || 'Esto cambia todo'
    const bodyX = mx + 20
    const L = wrapLinesLocal(ctx, src, 40, W - bodyX - W * 0.08, 26, 800, fonts.display, 4)
    const lineH = L.size * 1.18, blockH = (L.lines.length - 1) * lineH, cyc = H * 0.46, y0 = cyc - blockH / 2
    // barra vertical de acento que crece desde arriba (alto del bloque) + VIDA: punto que la recorre + glow
    const bu = M.ease(inv(t, 0.05, 0.7)), bh = (blockH + L.size * 1.2), bvy = y0 - L.size * 0.6, bvh = bh * bu
    ctx.save(); if (bu > 0.95) pulseGlow(ctx, pal.accent, t, { sp: 0.9, base: 1, amp: 4 })
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(mx, bvy, 6, bvh, 3); ctx.fill(); ctx.restore()
    if (bu > 0.95) { const u = sheenPos(t, 3.6), dy = bvy + 6 + (bvh - 12) * u; ctx.save(); ctx.fillStyle = 'rgba(255,255,255,' + (pal.tone === 'light' ? 0.5 : 0.85) + ')'; ctx.beginPath(); ctx.arc(mx + 3, dy, 2.6, 0, TAU); ctx.fill(); ctx.restore() }
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
  register: 'friendly', intensity: 'medium', tags: ['lista', 'badges', 'pildoras', 'wrap'], beat: 'value',
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
        // VIDA: un brillo de acento recorre el borde inferior del badge (fase por badge, continuo)
        if (tin >= 1) {
          const u = sheenPos(t, 3.4, ci * 0.18), dx = cxx + 8 + (w - 16) * u
          ctx.save(); ctx.globalAlpha = 0.6; ctx.fillStyle = pal.accent
          ctx.beginPath(); ctx.roundRect(dx - 7, cyr + chipH - 4, 14, 3, 1.5); ctx.fill(); ctx.restore()
        }
        // tilde de acento (DECO) a la izquierda + VIDA: respira (fase por badge)
        const tkb = tin >= 1 ? breathe(t, 1.2, 0.1, ci * 1.3) : 1
        ctx.save(); ctx.translate(cxx + padX + 4, cyr + chipH / 2); ctx.scale(tkb, tkb)
        if (tin >= 1) pulseGlow(ctx, pal.accent, t, { sp: 1.3, base: 0, amp: 3, ph: ci * 1.3 })
        tick(ctx, 0, 0, 9, M.ease(tin), pal.accent, 3); ctx.restore()
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
  register: 'neutral', intensity: 'medium', tags: ['comparacion', 'slider', 'antes-despues', 'revelado'], beat: 'value',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2
    const parts = splitItems(content.claim || content.tagline || 'Antes · Despues', 2)
    const left = parts[0] || 'Antes', right = parts[1] || 'Despues'
    const bw = W * 0.78, bx = (W - bw) / 2, by = H * 0.4, bh = H * 0.2, rad = 18
    // VIDA: tras asentar, el handle oscila MUY sutil de izq a der (el slider "vive"); las etiquetas son fijas
    const settledSl = inv(t, 0.2, 1.15), slide = clamp(M.ease(inv(t, 0.2, 1.05)) + drift(t, 0.7, 0.02) * settledSl, 0.04, 0.98), hx = bx + bw * slide
    // base: panel viejo (surface tenue, todo el ancho)
    ctx.save(); ctx.globalAlpha = inv(t, 0.05, 0.4)
    ctx.fillStyle = pal.tone === 'light' ? 'rgba(20,16,24,0.06)' : 'rgba(255,255,255,0.07)'
    ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, rad); ctx.fill(); ctx.restore()
    // panel nuevo (acento) recortado hasta el handle + VIDA: sheen recorre el area revelada
    ctx.save(); ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, rad); ctx.clip()
    ctx.globalAlpha = inv(t, 0.15, 0.5); ctx.fillStyle = pal.accent; ctx.fillRect(bx, by, bw * slide, bh)
    if (settledSl > 0.95) { ctx.globalAlpha = 0.4; rrSheen(ctx, bx, by, bw * slide, bh, t, { per: 3.6, strength: 0.3, tone: pal.tone }) }
    ctx.restore()
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
  register: 'corporate', intensity: 'medium', tags: ['dato', 'contador', 'delta', 'tendencia', 'kpi'], beat: 'data',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2
    const num = numFrom(content); if (!num) { bigText(ctx, content.tagline || content.claim || content.brand, cx, H * 0.42, fonts, pal, inv(t, 0.05, 0.4)); return }
    const down = /^-/.test(num.trim())
    // numero grande centrado con asentamiento
    const sp = M.settle(inv(t, 0.1, 0.95), { zeta: 0.5, freq: 2 })
    ctx.save(); ctx.globalAlpha = inv(t, 0.05, 0.4); ctx.translate(cx, H * 0.4); ctx.scale(0.82 + 0.18 * sp, 0.82 + 0.18 * sp)
    drawText(ctx, num, 0, 0, { size: 104, weight: 800, family: fonts.display, maxW: W * 0.9, color: pal.ink, shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.45)' : null })
    ctx.restore()
    // chip de delta: pildora de acento con flecha (arriba si sube, abajo si baja)
    const dp = M.settle(inv(t, 0.45, 1.1), { zeta: 0.5, freq: 2 })
    if (dp > 0) {
      const cw = 64, ch = 36, dy = H * 0.55, settledD = dp > 0.9
      ctx.save(); ctx.globalAlpha = inv(t, 0.45, 0.9); ctx.translate(cx, dy); ctx.scale((0.8 + 0.2 * dp) * (settledD ? breathe(t, 1.0, 0.02) : 1), (0.8 + 0.2 * dp) * (settledD ? breathe(t, 1.0, 0.02) : 1))
      ctx.fillStyle = rgba(pal.accent, pal.tone === 'light' ? 0.18 : 0.26); ctx.beginPath(); ctx.roundRect(-cw / 2, -ch / 2, cw, ch, ch / 2); ctx.fill()
      // triangulo (DECO en acento) + VIDA: bob continuo en su sentido (sube si crece, baja si cae) + glow
      const bob = settledD ? drift(t, 1.6, 1.4) * (down ? 1 : -1) : 0
      if (settledD) pulseGlow(ctx, pal.accent, t, { sp: 1.4, base: 0, amp: 3 })
      ctx.fillStyle = pal.accent; const ar = 8
      ctx.beginPath()
      if (down) { ctx.moveTo(-ar, -ar * 0.6 + bob); ctx.lineTo(ar, -ar * 0.6 + bob); ctx.lineTo(0, ar * 0.8 + bob) } else { ctx.moveTo(-ar, ar * 0.6 + bob); ctx.lineTo(ar, ar * 0.6 + bob); ctx.lineTo(0, -ar * 0.8 + bob) }
      ctx.closePath(); ctx.fill(); ctx.restore()
    }
    drawWrapped(ctx, statLabel(content) || content.tagline || content.brand || 'vs el mes pasado', cx, H * 0.65, { size: 22, weight: 700, family: fonts.text, maxW: W * 0.78, color: pal.dim, maxLines: 2, alpha: inv(t, 0.6, 1.1) })
  },
})

// ---- data/multi (mas · OLA6) -----------------------------------------------

// data "pictograph": grilla de puntos (ej 10x5) donde una fraccion (del % del numero) se
// pinta en acento. "X de cada Y". Distinto a multi/bars/stack.
register({
  id: 'scene.data.pictograph', lib: 'scene-layouts', category: 'data/multi', tones: ['dark', 'light'], rubros: ['*'], weight: 0.95,
  register: 'corporate', intensity: 'medium', tags: ['datos', 'pictografo', 'puntos', 'fraccion'], beat: 'data',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2
    const num = numFrom(content); if (!num) { bigText(ctx, content.tagline || content.claim || content.brand, cx, H * 0.44, fonts, pal, inv(t, 0.05, 0.4)); return }
    const pct = (() => { const m = num.match(/(\d[\d.,]*)/); let v = m ? parseFloat(m[1].replace(/,/g, '')) : 70; if (num.indexOf('%') < 0) v = clamp(v, 0, 100); return clamp(v / 100, 0.04, 1) })()
    const cols = 10, rowsN = 5, total = cols * rowsN, on = Math.round(total * pct)
    const dotR = 9, gx = W * 0.13, gw = W * 0.74, gy = H * 0.32, gh = H * 0.34
    const sx = gw / (cols - 1), sy = gh / (rowsN - 1)
    if (content.brand) drawText(ctx, (content.brand || '').toUpperCase(), cx, H * 0.24, { size: 16, weight: 700, family: fonts.accent || fonts.text, color: pal.inkText, maxW: W * 0.78, alpha: inv(t, 0.05, 0.35) })
    // los puntos aparecen en cascada por indice; los "on" en acento, el resto tinta tenue
    const prog = M.ease(inv(t, 0.2, 1.15))
    const settledP = prog >= 1
    for (let i = 0; i < total; i++) {
      const r = Math.floor(i / cols), c = i % cols
      const x = gx + c * sx, y = gy + r * sy
      const ap = clamp(prog * total - i, 0, 1); if (ap <= 0) continue
      // VIDA: onda de brillo que recorre los puntos "on" en acento (continua); el resto queda quieto
      const isOn = i < on, life = isOn && settledP ? 1 + 0.12 * Math.sin(t * 2.2 - i * 0.35) : 1
      ctx.save(); ctx.globalAlpha = ap * (isOn && settledP ? 0.85 + 0.15 * Math.sin(t * 2.2 - i * 0.35) : 1)
      ctx.fillStyle = isOn ? pal.accent : rgba(pal.ink, 0.16)
      ctx.beginPath(); ctx.arc(x, y, dotR * (0.6 + 0.4 * ap) * life, 0, TAU); ctx.fill(); ctx.restore()
    }
    // caption con el numero
    drawWrapped(ctx, statLabel(content) || content.tagline || (num + ' lo logra'), cx, H * 0.78, { size: 22, weight: 700, family: fonts.text, maxW: W * 0.8, color: pal.dim, maxLines: 2, alpha: inv(t, 0.7, 1.2) })
  },
})

// ---- social/proof (mas · OLA6) ---------------------------------------------

// social "quotemark": cita grande centrada SIN tarjeta, entre comillas de acento gigantes
// (apertura arriba-izq, cierre abajo-der) + atribucion. Distinto a quotecard (panel).
register({
  id: 'scene.social.quotemark', lib: 'scene-layouts', category: 'social/proof', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  register: 'editorial', intensity: 'medium', tags: ['prueba-social', 'cita', 'comillas', 'testimonio'], beat: 'proof',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2
    // SLOTS: cita (titulo) + atribucion (footnote) ubicadas por el layout (antes H*0.48/0.71 fijos); las comillas se anclan
    const quoteSrc = proofFrom(content) || content.claim || content.tagline || ''
    const L = place(env, [
      { id: 'q', kind: 'title', text: quoteSrc },
      content.brand ? { id: 'attr', kind: 'footnote', text: '— ' + content.brand } : null,
    ]), q = L.q
    const qTopY = q.cy - q.h / 2 - 16, qBotY = q.cy + q.h / 2 + 16
    // comillas de acento gigantes en diagonal (DECO) ancladas a las esquinas del slot + VIDA: respiran en contrafase
    const qa = (pal.tone === 'light' ? 0.16 : 0.22) * inv(t, 0.0, 0.5)
    ctx.save(); ctx.globalAlpha = qa * breathe(t, 0.7, 0.1, 0)
    ctx.translate(q.x + W * 0.06, qTopY); ctx.scale(breathe(t, 0.6, 0.02, 0), breathe(t, 0.6, 0.02, 0))
    drawText(ctx, '“', 0, 0, { size: 150, weight: 800, family: fonts.display, color: pal.accent, align: 'left', maxW: 120 }); ctx.restore()
    ctx.save(); ctx.globalAlpha = qa * breathe(t, 0.7, 0.1, Math.PI)
    ctx.translate(q.x + q.w - W * 0.06, qBotY); ctx.scale(breathe(t, 0.6, 0.02, Math.PI), breathe(t, 0.6, 0.02, Math.PI))
    drawText(ctx, '”', 0, 0, { size: 150, weight: 800, family: fonts.display, color: pal.accent, align: 'right', maxW: 120 }); ctx.restore()
    // cita en su slot, en tinta
    ctx.save(); ctx.globalAlpha = inv(t, 0.25, 0.8)
    TK.drawWrapped(ctx, quoteSrc, q.cx, q.cy, { reveal: inv(t, 0.25, 1.05), size: Math.min(q.size, 32), weight: 700, family: fonts.display, maxW: q.w, color: pal.ink, align: q.align, maxLines: 4, lh: 1.22, shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.4)' : null })
    ctx.restore()
    // atribucion: regla de acento + marca, en su slot
    if (content.brand && L.attr) {
      const a = L.attr, acx = a.align === 'left' ? a.x + 18 : a.cx, ap = inv(t, 0.7, 1.2)
      ctx.fillStyle = pal.accent; ctx.globalAlpha = ap
      ctx.beginPath(); ctx.roundRect(acx - 18, a.cy - a.h / 2 - 6, 36 * M.ease(ap), 3, 1.5); ctx.fill(); ctx.globalAlpha = 1
      drawText(ctx, '— ' + content.brand, a.cx, a.cy, { size: Math.min(a.size, 18), weight: 700, family: fonts.accent || fonts.text, color: pal.dim, align: a.align, maxW: a.w, alpha: ap })
    }
  },
})

// social "metric": metrica de comunidad gigante (ej "+10k") + etiqueta, con un cluster de
// puntos de acento (DECO). "miembros / usuarios / descargas". Distinta a avatars/rating.
register({
  id: 'scene.social.metric', lib: 'scene-layouts', category: 'social/proof', tones: ['dark', 'light'], rubros: ['*'], weight: 0.95,
  register: 'friendly', intensity: 'bold', tags: ['prueba-social', 'metrica', 'comunidad', 'numero'], beat: 'proof',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2
    const num = numFrom(content); if (!num) { bigText(ctx, content.proof || content.tagline || content.claim || content.brand, cx, H * 0.46, fonts, pal, inv(t, 0.15, 0.5)); return }
    // SLOTS: numero gigante (stat) + etiqueta (subtitulo) ubicados por el layout (antes H*0.48/0.63 fijos); el cluster se ancla arriba del numero
    const labelSrc = content.tagline || content.brand || 'personas ya confian'
    const L = place(env, [
      { id: 'num', kind: 'stat', text: num },
      { id: 'lbl', kind: 'subtitle', text: labelSrc },
    ]), nS = L.num, lS = L.lbl, ncx = nS.cx
    // cluster de puntos de acento arriba del numero (DECO, estable por seed)
    const clusterY = nS.y - 6
    const r = mulberry32((env.seed >>> 0) ^ 0xb16)
    const cu = M.ease(inv(t, 0.1, 0.8))
    const settledM = cu >= 1
    for (let i = 0; i < 7; i++) {
      const ang = r() * TAU, rad = 20 + r() * 56, px = ncx + Math.cos(ang) * rad, py = clusterY + Math.sin(ang) * rad * 0.7
      const baseR = 2 + r() * 3
      const ap = clamp(cu * 7 - i, 0, 1); if (ap <= 0) continue
      // VIDA: cada punto del cluster titila (escala+opacidad, fase por indice) de forma continua
      const tw = settledM ? breathe(t, 1.3, 0.18, i * 1.9) : 1, ta = settledM ? 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(t * 1.6 + i * 1.9)) : 0.8
      ctx.save(); ctx.globalAlpha = ap * ta; ctx.fillStyle = pal.accent
      ctx.beginPath(); ctx.arc(px, py, baseR * ap * tw, 0, TAU); ctx.fill(); ctx.restore()
    }
    // numero gigante en su slot
    const sp = M.settle(inv(t, 0.2, 1.0), { zeta: 0.45, freq: 2.1 })
    ctx.save(); ctx.globalAlpha = inv(t, 0.15, 0.5); ctx.translate(nS.cx, nS.cy); ctx.scale(0.78 + 0.22 * sp, 0.78 + 0.22 * sp)
    drawText(ctx, num, 0, 0, { size: Math.min(nS.size, 116), weight: 800, family: fonts.display, maxW: nS.w, color: pal.ink, align: nS.align, shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.45)' : null })
    ctx.restore()
    // etiqueta debajo, en su slot
    drawWrapped(ctx, labelSrc, lS.cx, lS.cy, { size: Math.min(lS.size, 24), weight: 700, family: fonts.text, maxW: lS.w, color: pal.dim, align: lS.align, maxLines: 2, alpha: inv(t, 0.55, 1.05) })
  },
})

// ---- closers/outro (mas · OLA6) --------------------------------------------

// outro "arrowcta": marca arriba + CTA a la derecha con una flecha larga de acento que
// barre desde la izquierda hasta apuntarla. Cierre con direccion. Distinto a cta/handle/diagonal.
register({
  id: 'scene.outro.arrowcta', lib: 'scene-layouts', category: 'closers/outro', tones: ['dark', 'light'], rubros: ['*'], weight: 0.95,
  register: 'neutral', intensity: 'bold', tags: ['cierre', 'cta', 'flecha', 'direccion'], beat: 'close',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2
    // marca centrada arriba
    drawWrapped(ctx, content.brand || 'Marca', cx, H * 0.36, { size: 48, weight: 800, family: fonts.display, maxW: W * 0.86, color: pal.ink, maxLines: 2, lh: 1.04, alpha: inv(t, 0.15, 0.7), shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.4)' : null })
    const cta = content.cta || content.tagline || 'Empeza hoy'
    // flecha larga de acento que barre y termina apuntando a la pildora del CTA
    const ay = H * 0.56, arrP = M.ease(inv(t, 0.4, 1.0))
    // VIDA: la punta de la flecha "empuja" hacia la pildora de forma continua (deriva sutil) tras llegar
    const arrEnd = W * 0.46 + (arrP >= 1 ? drift(t, 1.2, 4) : 0)
    arrowH(ctx, W * 0.12, arrEnd, ay, pal.accent, 5, arrP)
    // pildora CTA a la derecha de la flecha, entra con spring + VIDA: respira + sheen
    const gp = M.settle(inv(t, 0.6, 1.25), { zeta: 0.5, freq: 2 }), settledC = gp > 0.9
    ctx.save(); ctx.font = `800 24px "${fonts.display}"`
    const tw = Math.min(W * 0.44, ctx.measureText(cta).width), pw = tw + 44, ph = 50, px = W * 0.5
    ctx.translate(px + pw / 2, ay); ctx.scale((0.8 + 0.2 * gp) * (settledC ? breathe(t, 0.9, 0.012) : 1), (0.8 + 0.2 * gp) * (settledC ? breathe(t, 0.9, 0.012) : 1)); ctx.globalAlpha = inv(t, 0.6, 1.0)
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(-pw / 2, -ph / 2, pw, ph, ph / 2); ctx.fill()
    if (settledC) rrSheen(ctx, -pw / 2, -ph / 2, pw, ph, t, { per: 3.4, strength: 0.4, tone: pal.tone })
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
  register: 'editorial', intensity: 'medium', tags: ['transicion', 'capitulo', 'anillo', 'bisagra'], beat: 'context',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2, cy = H * 0.4
    const r = mulberry32((env.seed >>> 0) ^ 0x4e2)
    const idx = String(1 + ((r() * 5) | 0))
    const word = firstStrong(content.tagline || content.claim || content.brand, 'PARTE').toUpperCase()
    const R = 70
    // anillo de acento que se dibuja + VIDA: glow pulsante + punto que orbita
    const ringP = M.ease(inv(t, 0.1, 1.0))
    ctx.save(); ctx.strokeStyle = rgba(pal.ink, 0.1); ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke()
    ctx.strokeStyle = pal.accent; ctx.lineWidth = 5; ctx.lineCap = 'round'
    if (ringP > 0.95) pulseGlow(ctx, pal.accent, t, { sp: 1.0, base: 2, amp: 5 })
    ctx.beginPath(); ctx.arc(cx, cy, R, -TAU / 4, -TAU / 4 + TAU * ringP); ctx.stroke(); ctx.restore()
    if (ringP > 0.95) arcSheenDot(ctx, cx, cy, R, -TAU / 4, TAU, t, { per: 4.5, dotR: 3, color: pal.tone === 'light' ? pal.accent : '#fff', tone: pal.tone })
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
  id: 'scene.spec.pricetag', lib: 'scene-layouts', category: 'spec/slots', tones: ['dark', 'light'], rubros: ['inmobiliaria', 'default'], weight: 0.95,
  register: 'corporate', intensity: 'medium', tags: ['ficha', 'precio', 'etiqueta', 'tag', 'producto'], beat: 'data',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2
    const items = splitItems(content.claim || content.tagline || 'Calidad · Confianza · Cercania · Compromiso', 4)
    let priceIdx = items.findIndex(it => /\$|usd|ars|€|\d/i.test(it)); if (priceIdx < 0) priceIdx = 0
    const price = (items[priceIdx] || items[0] || 'Consultar').trim()
    const subs = items.filter((_, i) => i !== priceIdx).slice(0, 3)
    if (content.brand) drawText(ctx, (content.brand || '').toUpperCase(), cx, H * 0.22, { size: 16, weight: 700, family: fonts.accent || fonts.text, color: pal.inkText, maxW: W * 0.78, alpha: inv(t, 0.05, 0.35) })
    // forma de tag (rectangulo con muesca triangular a la izquierda + agujero), entra con spring + leve giro
    const sp = M.settle(inv(t, 0.1, 1.0), { zeta: 0.45, freq: 2.1 })
    const tw = W * 0.7, th = 120, tx = cx - tw / 2, ty = H * 0.33, notch = 34
    // VIDA: tras entrar, la etiqueta cuelga y se balancea MUY sutil desde su agujero (price + tag se mueven juntos)
    const enteredT = inv(t, 0.1, 1.0)
    const rot = (1 - M.ease(inv(t, 0.1, 0.9))) * -0.06 + drift(t, 0.8, 0.014) * enteredT
    const pivX = tx + notch + 18, pivY = ty + th / 2   // pivote en el agujero del tag
    ctx.save(); ctx.globalAlpha = inv(t, 0.05, 0.45); ctx.translate(pivX, pivY); ctx.rotate(rot); ctx.scale(0.85 + 0.15 * sp, 0.85 + 0.15 * sp); ctx.translate(-pivX, -pivY)
    ctx.fillStyle = pal.accent; ctx.beginPath()
    ctx.moveTo(tx + notch, ty); ctx.lineTo(tx + tw, ty); ctx.lineTo(tx + tw, ty + th); ctx.lineTo(tx + notch, ty + th); ctx.lineTo(tx, ty + th / 2); ctx.closePath(); ctx.fill()
    if (enteredT > 0.9) rrSheen(ctx, tx + notch, ty, tw - notch, th, t, { per: 3.6, strength: 0.35, tone: pal.tone })   // VIDA: sheen recorre el tag
    // agujero del tag
    ctx.fillStyle = pal.tone === 'light' ? '#ffffff' : (pal.bg1 || '#161018'); ctx.beginPath(); ctx.arc(pivX, pivY, 8, 0, TAU); ctx.fill()
    // precio en onAccent dentro del tag (dentro del grupo que se balancea -> queda solidario)
    ctx.globalAlpha = inv(t, 0.35, 0.85)
    drawText(ctx, price, cx + notch / 2, pivY, { size: 46, weight: 800, family: fonts.display, maxW: tw - notch - 60, color: pal.onAccent })
    ctx.restore()
    // sub-specs como linea de items separados por punto, debajo
    if (subs.length) drawWrapped(ctx, subs.join('  ·  '), cx, H * 0.6, { size: 22, weight: 700, family: fonts.text, maxW: W * 0.82, color: pal.ink, maxLines: 2, lh: 1.2, alpha: inv(t, 0.6, 1.1) })
  },
})

// spec "cards": fila de N tarjetas (panel surface) cada una con un valor grande en tinta
// + etiqueta; barra de acento arriba de cada card. Distinto a detail (grilla 2x2) y feature (filas).
register({
  id: 'scene.spec.cards', lib: 'scene-layouts', category: 'spec/slots', tones: ['dark', 'light'], rubros: ['inmobiliaria', 'tech', 'default'], weight: 1,
  register: 'corporate', intensity: 'medium', tags: ['ficha', 'tarjetas', 'fila', 'specs', 'producto'], beat: 'data',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2
    const items = splitItems(content.claim || content.tagline || 'Calidad · Confianza · Cercania', 3)
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
      // VIDA: sheen recorre la barra de acento de la card (fase por card, continuo)
      if (sp > 0.9) rrSheen(ctx, cxx, cy, cw, 4, t, { per: 3.2, ph: i * 0.3, strength: 0.5, tone: pal.tone })
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
  id: 'scene.spec.ribbon', lib: 'scene-layouts', category: 'spec/slots', tones: ['dark', 'light'], rubros: ['inmobiliaria', 'default'], weight: 1,
  register: 'corporate', intensity: 'medium', tags: ['ficha', 'cinta', 'chips', 'precio', 'inmueble', 'producto'], beat: 'data',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, M = env.motion || _DM, TK = env.typekit || _DTK, cx = W / 2
    const items = splitItems(content.claim || content.tagline || 'Calidad · Confianza · Cercania · Compromiso · Resultados', 5)
    let priceIdx = items.findIndex(it => /\$|usd|ars|€/i.test(it))
    if (priceIdx < 0) priceIdx = 0
    const price = items[priceIdx] || items[0] || ''
    const chips = items.filter((_, i) => i !== priceIdx).slice(0, 4)
    if (content.brand) drawText(ctx, (content.brand || '').toUpperCase(), cx, H * 0.22, { size: 16, weight: 700, family: fonts.accent || fonts.text, color: pal.inkText, maxW: W * 0.78, alpha: inv(t, 0.05, 0.35) })
    const sp = M.settle(inv(t, 0.1, 0.95), { zeta: 0.5, freq: 2 })
    ctx.save(); ctx.globalAlpha = inv(t, 0.05, 0.45); ctx.translate(cx, H * 0.36); ctx.scale(0.85 + 0.15 * sp, 0.85 + 0.15 * sp)
    drawText(ctx, price.trim(), 0, 0, { size: 56, weight: 800, family: fonts.display, maxW: W * 0.86, color: pal.ink, shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.4)' : null })
    ctx.restore()
    const ru = M.ease(inv(t, 0.4, 1.0)), rrw = 100 * ru * breathe(t, 0.9, 0.025)
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(cx - rrw / 2, H * 0.45, rrw, 4, 2); ctx.fill()
    if (ru > 0.9) rrSheen(ctx, cx - rrw / 2, H * 0.45, rrw, 4, t, { per: 3.0, strength: 0.5, tone: pal.tone })
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
        // VIDA: el punto de acento del chip late (fase por chip)
        const dotB = cpsp > 0.9 ? breathe(t, 1.3, 0.18, ci * 1.4) : 1
        ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.arc(cxx + 14, cy2 + chipH / 2, 4 * dotB, 0, TAU); ctx.fill()
        ctx.restore()
        drawText(ctx, c, cxx + w / 2 + 6, cy2 + chipH / 2, { size: 18, weight: 700, family: fonts.text, color: pal.ink, maxW: w - padX * 2 })
        cxx += w + gap
      })
    })
  },
})
