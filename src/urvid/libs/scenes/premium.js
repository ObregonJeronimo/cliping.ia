// urvid · DIRECCION DE ARTE "PREMIUM NOIR" — el lenguaje de la pieza NOVA generalizado al motor:
// negro profundo + UNA nota de acento (el de la MARCA, via pal.accent ya anclado), tipografia del pairing
// del video (33 voces), objeto HEROE procedural POR RUBRO, mask-reveals, rafaga al beat con flash, cierre
// con halo. Cada escena pinta su PROPIA placa noir + acabado (grano/vineta) -> el look es consistente
// aunque el fondo global sea otro. Se activa con brief.style='premium' (opt-in, cero impacto en gates).
import { register } from '../../core/registry.js'
import { drawText, drawWrapped, fitFont } from '../../core/text.js'
import { W, H, TAU, inv, lerp, clamp, rgba, lighten, darken } from '../../core/util.js'
import { mulberry32 } from '../../core/prng.js'

const eo = t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)
const win = (t, a, b) => clamp((t - a) / (b - a), 0, 1)
function spring(t, z = 0.55, w = 13) {
  if (t <= 0) return 0; if (t >= 1) return 1
  const wd = w * Math.sqrt(1 - z * z), e = Math.exp(-z * w * t)
  return 1 - e * (Math.cos(wd * t) + (z * w / wd) * Math.sin(wd * t))
}

// ---------- placa + acabado del look ----------
const NOIR0 = '#0a0a0d', NOIR1 = '#101016'
const INK = '#f2f0ea', DIM = 'rgba(242,240,234,0.45)'
function plate(ctx, t, accent) {
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, NOIR1); g.addColorStop(0.55, NOIR0); g.addColorStop(1, '#07070a')
  ctx.fillStyle = g; ctx.fillRect(-8, -8, W + 16, H + 16)
  const a = 0.05 + 0.015 * Math.sin(t * 0.7)
  const rg = ctx.createRadialGradient(W / 2, H * 0.46, 0, W / 2, H * 0.46, H * 0.62)
  rg.addColorStop(0, rgba(accent, a)); rg.addColorStop(0.55, 'rgba(120,130,120,0.03)'); rg.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H)
}
function finish(ctx, t, k = 1) {
  const r = mulberry32((1234 + Math.floor(t * 30)) >>> 0)
  ctx.save(); ctx.globalAlpha = 0.05 * k; ctx.fillStyle = '#ffffff'
  for (let i = 0; i < 160; i++) ctx.fillRect(r() * W, r() * H, 1, 1)
  ctx.restore()
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.36, W / 2, H / 2, H * 0.78)
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.5)')
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H)
}
function lightLine(ctx, cy, p, accent, wMax = W * 0.5) {
  const lw = wMax * eo(p); if (lw <= 0) return
  const g = ctx.createLinearGradient(W / 2 - lw, 0, W / 2 + lw, 0)
  g.addColorStop(0, rgba(accent, 0)); g.addColorStop(0.5, rgba(accent, 0.9)); g.addColorStop(1, rgba(accent, 0))
  ctx.fillStyle = g; ctx.fillRect(W / 2 - lw, cy - 1, lw * 2, 2)
}
function maskLine(ctx, str, cx, y, size, p, o = {}) {
  if (p <= 0) return
  const e = eo(p)
  ctx.save(); ctx.beginPath(); ctx.rect(0, y - size * 0.8, W, size * 1.6); ctx.clip()
  drawText(ctx, str, cx, y + size * 1.1 * (1 - e), { size, maxW: o.maxW || W * 0.9, min: 13, ...o })
  ctx.restore()
}
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
}

// ---------- OBJETOS HEROE por rubro (procedurales, con barrido especular + reflejo) ----------
// contrato: draw(ctx, t, sweepT, accent, fonts, brand) centrado en (0,0), ~240 de ancho logico
function heroCard(ctx, t, sw, accent, fonts, brand) {
  const CW = 240, CH = 152, R = 17, x = -CW / 2, y = -CH / 2
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 34; ctx.shadowOffsetY = 17
  rr(ctx, x, y, CW, CH, R); ctx.fillStyle = '#0c0d11'; ctx.fill(); ctx.restore()
  const body = ctx.createLinearGradient(0, y, 0, y + CH)
  body.addColorStop(0, '#2a2d36'); body.addColorStop(0.45, '#181a20'); body.addColorStop(1, '#0e0f13')
  rr(ctx, x, y, CW, CH, R); ctx.fillStyle = body; ctx.fill()
  ctx.save(); rr(ctx, x, y, CW, CH, R); ctx.clip()
  const sx = lerp(x - CW * 0.7, x + CW * 1.3, sw)
  const swg = ctx.createLinearGradient(sx - 48, 0, sx + 48, 0)
  swg.addColorStop(0, 'rgba(255,255,255,0)'); swg.addColorStop(0.5, 'rgba(255,255,255,0.17)'); swg.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.save(); ctx.rotate(-0.32); ctx.fillStyle = swg; ctx.fillRect(x - CW, y - CH, CW * 3, CH * 3); ctx.restore()
  ctx.restore()
  rr(ctx, x + 0.5, y + 0.5, CW - 1, CH - 1, R)
  const rim = ctx.createLinearGradient(0, y, 0, y + CH)
  rim.addColorStop(0, 'rgba(255,255,255,0.35)'); rim.addColorStop(0.3, 'rgba(255,255,255,0.06)'); rim.addColorStop(1, 'rgba(255,255,255,0.02)')
  ctx.strokeStyle = rim; ctx.lineWidth = 1; ctx.stroke()
  const chx = x + 24, chy = y + 52
  rr(ctx, chx, chy, 34, 25, 5)
  const chg = ctx.createLinearGradient(0, chy, 0, chy + 25)
  chg.addColorStop(0, lighten(accent, 0.18)); chg.addColorStop(1, darken(accent, 0.1))
  ctx.fillStyle = chg; ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.2; ctx.lineCap = 'round'
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(chx + 56, chy + 12, 4 + i * 4, -0.6, 0.6); ctx.stroke() }
  drawText(ctx, (brand || 'MARCA').toUpperCase(), x + 24, y + 28, { size: 16, weight: 800, family: fonts.display, align: 'left', maxW: CW - 48, color: 'rgba(255,255,255,0.92)', tracking: 3 })
  drawText(ctx, '••••  ••••  4021', x + 24, y + CH - 34, { size: 11, weight: 400, family: fonts.num || fonts.accent, align: 'left', maxW: CW - 48, color: 'rgba(255,255,255,0.5)' })
}
function heroPlate(ctx, t, sw, accent) {           // gastronomia: plato + vapor
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 14
  ctx.fillStyle = '#14151a'; ctx.beginPath(); ctx.ellipse(0, 10, 118, 34, 0, 0, TAU); ctx.fill(); ctx.restore()
  const g = ctx.createRadialGradient(0, -6, 10, 0, 0, 118)
  g.addColorStop(0, '#23252c'); g.addColorStop(0.72, '#181a20'); g.addColorStop(1, '#101116')
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, 118, 40, 0, 0, TAU); ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1.2
  ctx.beginPath(); ctx.ellipse(0, -3, 100, 32, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke()
  ctx.fillStyle = accent; ctx.beginPath(); ctx.ellipse(0, -6, 34, 12, 0, 0, TAU); ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.ellipse(-8, -9, 12, 4, -0.4, 0, TAU); ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; ctx.lineCap = 'round'
  for (let i = 0; i < 3; i++) {
    const ph = t * 1.1 + i * 2.1, xx = -26 + i * 26
    ctx.save(); ctx.globalAlpha = 0.35 + 0.15 * Math.sin(ph * 2)
    ctx.beginPath()
    for (let k = 0; k <= 8; k++) { const yy = -26 - k * 9, dx = Math.sin(ph + k * 0.7) * 7; k === 0 ? ctx.moveTo(xx + dx, yy) : ctx.lineTo(xx + dx, yy) }
    ctx.stroke(); ctx.restore()
  }
}
function heroBottle(ctx, t, sw, accent) {          // belleza: frasco
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 26; ctx.shadowOffsetY = 14
  rr(ctx, -52, -70, 104, 150, 20); ctx.fillStyle = '#12131a'; ctx.fill(); ctx.restore()
  const g = ctx.createLinearGradient(-52, 0, 52, 0)
  g.addColorStop(0, '#20222b'); g.addColorStop(0.5, '#171922'); g.addColorStop(1, '#101218')
  rr(ctx, -52, -70, 104, 150, 20); ctx.fillStyle = g; ctx.fill()
  rr(ctx, -20, -108, 40, 34, 7)
  const cap = ctx.createLinearGradient(0, -108, 0, -74)
  cap.addColorStop(0, lighten(accent, 0.15)); cap.addColorStop(1, darken(accent, 0.12))
  ctx.fillStyle = cap; ctx.fill()
  const sx = lerp(-90, 90, sw)
  ctx.save(); rr(ctx, -52, -70, 104, 150, 20); ctx.clip()
  const swg = ctx.createLinearGradient(sx - 26, 0, sx + 26, 0)
  swg.addColorStop(0, 'rgba(255,255,255,0)'); swg.addColorStop(0.5, 'rgba(255,255,255,0.2)'); swg.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = swg; ctx.fillRect(-60, -80, 120, 170); ctx.restore()
  rr(ctx, -52 + 0.5, -70 + 0.5, 103, 149, 19.5); ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1; ctx.stroke()
  ctx.fillStyle = rgba(accent, 0.9); ctx.fillRect(-26, -18, 52, 3)
}
function heroWindow(ctx, t, sw, accent) {          // tech/saas: ventana de app
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 15
  rr(ctx, -120, -84, 240, 168, 14); ctx.fillStyle = '#101117'; ctx.fill(); ctx.restore()
  rr(ctx, -120, -84, 240, 168, 14); ctx.fillStyle = '#14161d'; ctx.fill()
  rr(ctx, -120 + 0.5, -84 + 0.5, 239, 167, 13.5); ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.lineWidth = 1; ctx.stroke()
  for (let i = 0; i < 3; i++) { ctx.fillStyle = i === 2 ? accent : 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.arc(-104 + i * 14, -68, 3.4, 0, TAU); ctx.fill() }
  ctx.fillStyle = 'rgba(255,255,255,0.09)'
  rr(ctx, -104, -46, 130, 10, 5); ctx.fill()
  rr(ctx, -104, -26, 88, 10, 5); ctx.fill()
  const bars = [0.5, 0.8, 0.62, 0.95]
  bars.forEach((b, i) => {
    const bh = 54 * b * eo(win(t, 0.4 + i * 0.12, 1.1 + i * 0.12))
    ctx.fillStyle = i === 3 ? accent : 'rgba(255,255,255,0.2)'
    rr(ctx, -96 + i * 52, 62 - bh, 30, bh, 4); ctx.fill()
  })
  const sx = lerp(-150, 150, sw)
  ctx.save(); rr(ctx, -120, -84, 240, 168, 14); ctx.clip()
  const swg = ctx.createLinearGradient(sx - 40, 0, sx + 40, 0)
  swg.addColorStop(0, 'rgba(255,255,255,0)'); swg.addColorStop(0.5, 'rgba(255,255,255,0.1)'); swg.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = swg; ctx.fillRect(-130, -94, 260, 190); ctx.restore()
}
function heroTicket(ctx, t, sw, accent, fonts, brand) {   // eventos: ticket
  ctx.save(); ctx.rotate(-0.06)
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 26; ctx.shadowOffsetY = 13
  rr(ctx, -118, -60, 236, 120, 14); ctx.fillStyle = '#12131a'; ctx.fill(); ctx.restore()
  const g = ctx.createLinearGradient(0, -60, 0, 60)
  g.addColorStop(0, '#1e2029'); g.addColorStop(1, '#12141b')
  rr(ctx, -118, -60, 236, 120, 14); ctx.fillStyle = g; ctx.fill()
  ctx.setLineDash([4, 6]); ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.4
  ctx.beginPath(); ctx.moveTo(44, -60); ctx.lineTo(44, 60); ctx.stroke(); ctx.setLineDash([])
  ctx.fillStyle = NOIR0
  ctx.beginPath(); ctx.arc(44, -60, 9, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(44, 60, 9, 0, TAU); ctx.fill()
  drawText(ctx, (brand || 'EVENTO').toUpperCase(), -100, -22, { size: 20, weight: 800, family: fonts.display, align: 'left', maxW: 130, color: INK, tracking: 2 })
  drawText(ctx, 'ADMIT ONE', -100, 10, { size: 10, weight: 600, family: fonts.num || fonts.accent, align: 'left', maxW: 130, color: DIM, tracking: 3 })
  ctx.fillStyle = accent; ctx.fillRect(-100, 26, 74, 3)
  for (let i = 0; i < 9; i++) { ctx.fillStyle = 'rgba(255,255,255,0.65)'; ctx.fillRect(58 + i * 6, -30, i % 3 === 0 ? 3 : 1.6, 60) }
  rr(ctx, -117.5, -59.5, 235, 119, 13.5); ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1; ctx.stroke()
  ctx.restore()
}
const HEROES = {
  finanzas: heroCard, tech: heroWindow, default: heroWindow, educacion: heroWindow,
  gastronomia: heroPlate, belleza: heroBottle, moda: heroBottle, salud: heroBottle,
  eventos: heroTicket, fitness: heroWindow, inmobiliaria: heroCard,
}

// ---------- ESCENAS del look ----------
register({
  id: 'scene.prem.open', lib: 'scene-layouts', category: 'openers/hero', tones: ['dark', 'light'], rubros: ['*'], weight: 0,
  register: 'editorial', intensity: 'soft', tags: ['premium', 'noir', 'apertura'], beat: 'hook',
  render(ctx, t, env) {
    const { pal, content, fonts } = env
    plate(ctx, t, pal.accent)
    lightLine(ctx, H * 0.5, win(t, 0.1, 0.85), pal.accent)
    drawText(ctx, (content.brand || 'MARCA').toUpperCase(), W / 2, H * 0.5 - 34, { size: 24, weight: 600, family: fonts.display, maxW: W * 0.85, upper: true, tracking: 10, alpha: win(t, 0.5, 1.1), color: INK })
    drawText(ctx, 'MMXXVI', W / 2, H * 0.5 + 30, { size: 12, weight: 400, family: fonts.num || fonts.accent, tracking: 7, alpha: win(t, 0.75, 1.3) * 0.5, color: DIM, maxW: W * 0.5 })
    finish(ctx, t)
  },
})
register({
  id: 'scene.prem.statement', lib: 'scene-layouts', category: 'statements/editorial', tones: ['dark', 'light'], rubros: ['*'], weight: 0,
  register: 'editorial', intensity: 'loud', tags: ['premium', 'noir', 'mask-reveal'], beat: 'value',
  render(ctx, t, env) {
    const { pal, content, fonts } = env
    plate(ctx, t, pal.accent)
    const words = String(content.claim || content.tagline || 'Hecho para durar').split(' ')
    const l1 = words.slice(0, Math.ceil(words.length / 3)).join(' ')
    const l2 = words.slice(Math.ceil(words.length / 3), Math.ceil(words.length * 2 / 3)).join(' ')
    const l3 = words.slice(Math.ceil(words.length * 2 / 3)).join(' ')
    const sz = 56
    maskLine(ctx, l1, W / 2, H * 0.42, sz, win(t, 0.05, 0.65), { weight: 800, family: fonts.display, color: INK })
    if (l2) maskLine(ctx, l2, W / 2, H * 0.42 + sz * 1.22, sz, win(t, 0.2, 0.8), { weight: 800, family: fonts.display, color: INK })
    if (l3) maskLine(ctx, l3, W / 2, H * 0.42 + sz * 2.44, sz, win(t, 0.35, 0.95), { weight: 800, family: fonts.display, color: pal.accent })
    if (content.tagline && content.claim) drawText(ctx, content.tagline.toUpperCase(), W / 2, H * 0.68, { size: 13, weight: 600, family: fonts.num || fonts.accent, upper: true, tracking: 4, maxW: W * 0.85, alpha: win(t, 1.1, 1.6) * 0.75, color: DIM })
    finish(ctx, t)
  },
})
register({
  id: 'scene.prem.hero', lib: 'scene-layouts', category: 'statements/editorial', tones: ['dark', 'light'], rubros: ['*'], weight: 0,
  register: 'editorial', intensity: 'medium', tags: ['premium', 'noir', 'objeto-heroe'], beat: 'value',
  render(ctx, t, env) {
    const { pal, content, fonts } = env
    plate(ctx, t, pal.accent)
    const en = spring(win(t, 0.05, 1.0), 0.6, 11)
    const rubro = env.rubro || 'default'
    const hero = HEROES[rubro] || HEROES.default
    ctx.save()
    ctx.translate(W / 2, H * 0.4 + (1 - en) * H * 0.45 + Math.sin(t * 1.4) * 4)
    ctx.rotate(-0.03 + Math.sin(t * 0.9) * 0.012)
    ctx.scale(1.15, 1.15)
    hero(ctx, t, win(t, 0.9, 2.1), pal.accent, fonts, content.brand)
    ctx.restore()
    drawText(ctx, ('CONOCÉ ' + (content.brand || '')).toUpperCase(), W / 2, H * 0.7, { size: 13, weight: 600, family: fonts.num || fonts.accent, upper: true, tracking: 5, maxW: W * 0.8, alpha: win(t, 1.4, 1.9) * 0.85, color: DIM })
    maskLine(ctx, content.tagline || content.claim || '', W / 2, H * 0.77, 24, win(t, 1.6, 2.2), { weight: 600, family: fonts.display, color: INK, maxW: W * 0.86 })
    finish(ctx, t)
  },
})
register({
  id: 'scene.prem.punch', lib: 'scene-layouts', category: 'data/single', tones: ['dark', 'light'], rubros: ['*'], weight: 0,
  register: 'editorial', intensity: 'loud', tags: ['premium', 'noir', 'punch'], beat: 'proof',
  render(ctx, t, env) {
    const { pal, content, fonts } = env
    plate(ctx, t, pal.accent)
    const st = (content.stats || [])[0]
    const big = st ? String(st.value) : (String(content.cta || 'HOY').split(' ')[0])
    const sub = st ? String(st.label || '') : String(content.cta || '')
    const e = spring(win(t, 0.05, 0.75), 0.5, 12)
    ctx.save()
    ctx.translate(W / 2, H * 0.45); ctx.scale(0.7 + 0.3 * e, 0.7 + 0.3 * e)
    const bs = fitFont(ctx, big, 190, W * 0.8, 60, 900, fonts.display)
    drawText(ctx, big, 0, 0, { size: bs, weight: 900, family: fonts.display, color: pal.accent, alpha: clamp(e * 1.6, 0, 1), maxW: W * 0.82 })
    ctx.restore()
    const rp = eo(win(t, 0.5, 1.5))
    if (rp > 0) { ctx.save(); ctx.strokeStyle = 'rgba(242,240,234,0.3)'; ctx.lineWidth = 1.4; ctx.setLineDash([2, 9]); ctx.beginPath(); ctx.arc(W / 2, H * 0.45, 150, -Math.PI / 2, -Math.PI / 2 + TAU * rp); ctx.stroke(); ctx.restore() }
    maskLine(ctx, sub, W / 2, H * 0.65, 34, win(t, 0.55, 1.15), { weight: 800, family: fonts.display, color: INK, maxW: W * 0.85 })
    finish(ctx, t)
  },
})
register({
  id: 'scene.prem.rafaga', lib: 'scene-layouts', category: 'lists/checklist', tones: ['dark', 'light'], rubros: ['*'], weight: 0,
  register: 'editorial', intensity: 'loud', tags: ['premium', 'rafaga', 'beat'], beat: 'value',
  render(ctx, t, env) {
    const { pal, content, fonts } = env
    const items = (content.bullets && content.bullets.length >= 2 ? content.bullets : String(content.claim || 'Rapido · Simple · Real').split(/[·,]/)).slice(0, 3).map(s => String(s).trim())
    const n = Math.max(2, items.length)
    const CUT = (env.sceneDur || 2.4) / n
    const i = Math.min(n - 1, Math.floor(t / CUT))
    const ct = t - i * CUT
    const dark = i % 2 === 0
    ctx.fillStyle = dark ? NOIR0 : '#f4f2ec'; ctx.fillRect(-8, -8, W + 16, H + 16)
    if (ct < 0.066) { ctx.fillStyle = dark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.14)'; ctx.fillRect(0, 0, W, H) }
    const e = spring(win(ct, 0.02, 0.42), 0.62, 15)
    ctx.save()
    ctx.translate(W / 2, H * 0.5); ctx.scale(0.94 + 0.06 * e, 0.94 + 0.06 * e)
    drawWrapped(ctx, items[i] || '', 0, 0, { size: 44, min: 16, weight: 900, family: fonts.display, maxW: W * 0.8, maxLines: 2, lh: 1.1, color: dark ? INK : '#111114', alpha: clamp(e * 2, 0, 1) })
    ctx.restore()
    drawText(ctx, `0${i + 1} / 0${n}`, W / 2, H * 0.5 + 92, { size: 11, weight: 400, family: fonts.num || fonts.accent, tracking: 4, color: dark ? DIM : 'rgba(17,17,20,0.45)', alpha: win(ct, 0.15, 0.4), maxW: W * 0.4 })
    finish(ctx, t, 0.5)
  },
})
register({
  id: 'scene.prem.outro', lib: 'scene-layouts', category: 'closers/outro', tones: ['dark', 'light'], rubros: ['*'], weight: 0,
  register: 'editorial', intensity: 'medium', tags: ['premium', 'noir', 'cierre'], beat: 'close',
  render(ctx, t, env) {
    const { pal, content, fonts } = env
    plate(ctx, t, pal.accent)
    lightLine(ctx, H * 0.34, win(t, 0.05, 0.7), pal.accent, W * 0.36)
    const bs = fitFont(ctx, (content.brand || 'MARCA').toUpperCase(), 92, W * 0.86, 34, 900, fonts.display)
    maskLine(ctx, (content.brand || 'MARCA').toUpperCase(), W / 2, H * 0.42, bs, win(t, 0.18, 0.85), { weight: 900, family: fonts.display, color: INK, tracking: 2 })
    if (content.tagline) drawText(ctx, content.tagline.toUpperCase(), W / 2, H * 0.5, { size: 12.5, weight: 600, family: fonts.num || fonts.accent, upper: true, tracking: 4, maxW: W * 0.84, alpha: win(t, 0.65, 1.15) * 0.8, color: DIM })
    const cp = spring(win(t, 0.85, 1.55), 0.55, 12)
    if (cp > 0 && content.cta) {
      ctx.save()
      ctx.translate(W / 2, H * 0.63); ctx.scale(0.85 + 0.15 * cp, 0.85 + 0.15 * cp)
      const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, 100)
      halo.addColorStop(0, rgba(pal.accent, 0.16 + 0.04 * Math.sin(t * 2))); halo.addColorStop(1, rgba(pal.accent, 0))
      ctx.globalAlpha = clamp(cp * 1.5, 0, 1)
      ctx.fillStyle = halo; ctx.fillRect(-130, -130, 260, 260)
      ctx.font = `800 17px "${fonts.display}"`
      let cta = String(content.cta)
      while (cta.indexOf(' ') > 0 && ctx.measureText(cta).width > W * 0.5) cta = cta.slice(0, cta.lastIndexOf(' '))
      const tw = Math.min(W * 0.5, ctx.measureText(cta).width), bw = tw + 46, bh = 42
      rr(ctx, -bw / 2, -bh / 2, bw, bh, bh / 2)
      const bgb = ctx.createLinearGradient(0, -bh / 2, 0, bh / 2)
      bgb.addColorStop(0, lighten(pal.accent, 0.12)); bgb.addColorStop(1, darken(pal.accent, 0.06))
      ctx.fillStyle = bgb; ctx.fill()
      drawText(ctx, cta, 0, 1.5, { size: 17, weight: 800, family: fonts.display, color: pal.onAccent, maxW: bw - 30 })
      ctx.restore()
    }
    finish(ctx, t)
  },
})
