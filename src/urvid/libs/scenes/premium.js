// urvid · DIRECCION DE ARTE "PREMIUM" — el lenguaje de la pieza NOVA generalizado al motor, con VARIACION
// MASIVA determinista: 4 placas de look (noir/carbon/tinta-de-marca/crema) x 14 objetos heroe parametricos
// en pools POR RUBRO x case/tracking/anillo/ornamento por seed x 33 tipografias x acento de MARCA continua.
// El look de CADA video se decide UNA vez (video.lookPrem, estampado por assemble en cada escena via
// sc.look) -> coherencia interna total, y dos seeds del mismo brief salen con direcciones DISTINTAS.
// Se activa con brief.style='premium' (weight 0: jamas en el pool normal; cero impacto en gates).
import { register } from '../../core/registry.js'
import { drawText, drawWrapped, fitFont } from '../../core/text.js'
import { W, H, TAU, inv, lerp, clamp, rgba, lighten, darken, hexToHsl, hslToHex } from '../../core/util.js'
import { mulberry32 } from '../../core/prng.js'
import { createHeroObjects } from '../../../shared/objects.js'

const eo = t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)
const win = (t, a, b) => clamp((t - a) / (b - a), 0, 1)
function spring(t, z = 0.55, w = 13) {
  if (t <= 0) return 0; if (t >= 1) return 1
  const wd = w * Math.sqrt(1 - z * z), e = Math.exp(-z * w * t)
  return 1 - e * (Math.cos(wd * t) + (z * w / wd) * Math.sin(wd * t))
}
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
}

// ---------- LOOK: placas + tintas (elegidas por video via sc.look; fallback noir) ----------
const PLATES = {
  noir: { bg0: '#0a0a0d', bg1: '#101016', ink: '#f2f0ea', dim: 'rgba(242,240,234,0.45)', dark: true },
  carbon: { bg0: '#0d0b09', bg1: '#161210', ink: '#f4efe6', dim: 'rgba(244,239,230,0.45)', dark: true },
  tinta: { bg0: null, bg1: null, ink: '#f2f0ea', dim: 'rgba(242,240,234,0.48)', dark: true },   // teñida al hue de marca
  crema: { bg0: '#f2efe8', bg1: '#e9e4da', ink: '#161310', dim: 'rgba(22,19,16,0.5)', dark: false },
}
function lookOf(env) {
  const lk = (env.look && PLATES[env.look.plate]) ? { ...PLATES[env.look.plate] } : { ...PLATES.noir }
  if (env.look && env.look.plate === 'tinta') {
    const h = hexToHsl(env.pal.accent).h
    lk.bg0 = hslToHex(h, 0.26, 0.075); lk.bg1 = hslToHex(h, 0.3, 0.115)
  }
  lk.o = env.look || { case: 'upper', track: 6, ring: 'dash', orn: 'line', heroIdx: 0, hp: [0.5, 0.5, 0.5] }
  return lk
}
const caseTxt = (s, mode) => mode === 'upper' ? String(s).toUpperCase() : String(s)
function plate(ctx, t, accent, lk) {
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, lk.bg1); g.addColorStop(0.55, lk.bg0); g.addColorStop(1, lk.dark ? '#07070a' : '#e2dccf')
  ctx.fillStyle = g; ctx.fillRect(-8, -8, W + 16, H + 16)
  const a = (lk.dark ? 0.05 : 0.10) + 0.015 * Math.sin(t * 0.7)
  const rg = ctx.createRadialGradient(W / 2, H * 0.46, 0, W / 2, H * 0.46, H * 0.62)
  rg.addColorStop(0, rgba(accent, a)); rg.addColorStop(0.55, lk.dark ? 'rgba(120,130,120,0.03)' : 'rgba(255,255,255,0.05)'); rg.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H)
}
function finish(ctx, t, lk, k = 1) {
  const r = mulberry32((1234 + Math.floor(t * 30)) >>> 0)
  ctx.save(); ctx.globalAlpha = 0.05 * k; ctx.fillStyle = lk.dark ? '#ffffff' : '#000000'
  for (let i = 0; i < 160; i++) ctx.fillRect(r() * W, r() * H, 1, 1)
  ctx.restore()
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.36, W / 2, H / 2, H * 0.78)
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, lk.dark ? 'rgba(0,0,0,0.5)' : 'rgba(60,50,40,0.22)')
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H)
}
// ornamento de apertura/cierre segun look: linea de luz | esquinas finas | fila de puntos
function ornament(ctx, cy, p, accent, lk, wMax = W * 0.5) {
  const e = eo(p); if (e <= 0) return
  if (lk.o.orn === 'corners') {
    ctx.save(); ctx.strokeStyle = rgba(accent, 0.85); ctx.lineWidth = 2; const s = 26 * e, mx = W * 0.16, my = cy - 92
    const c = (x, y, dx, dy) => { ctx.beginPath(); ctx.moveTo(x + dx * s, y); ctx.lineTo(x, y); ctx.lineTo(x, y + dy * s); ctx.stroke() }
    c(mx, my, 1, 1); c(W - mx, my, -1, 1); c(mx, my + 184, 1, -1); c(W - mx, my + 184, -1, -1)
    ctx.restore()
  } else if (lk.o.orn === 'dots') {
    ctx.save(); ctx.fillStyle = rgba(accent, 0.9)
    const n = 5; for (let i = 0; i < n; i++) { const px = W / 2 + (i - (n - 1) / 2) * 26; ctx.globalAlpha = clamp(e * n - i, 0, 1) * 0.9; ctx.beginPath(); ctx.arc(px, cy, 3, 0, TAU); ctx.fill() }
    ctx.restore()
  } else {
    const lw = wMax * e
    const g = ctx.createLinearGradient(W / 2 - lw, 0, W / 2 + lw, 0)
    g.addColorStop(0, rgba(accent, 0)); g.addColorStop(0.5, rgba(accent, 0.9)); g.addColorStop(1, rgba(accent, 0))
    ctx.fillStyle = g; ctx.fillRect(W / 2 - lw, cy - 1, lw * 2, 2)
  }
}
function maskLine(ctx, str, cx, y, size, p, o = {}) {
  if (p <= 0) return
  const e = eo(p)
  ctx.save(); ctx.beginPath(); ctx.rect(0, y - size * 0.8, W, size * 1.6); ctx.clip()
  drawText(ctx, str, cx, y + size * 1.1 * (1 - e), { size, maxW: o.maxW || W * 0.9, min: 13, ...o })
  ctx.restore()
}

// ---------- OBJETOS HEROE: biblioteca COMPARTIDA (src/shared/objects.js) ----------
// Los 16 dibujantes vivian aca; se extrajeron a src/shared/objects.js para que el motor Director
// (storyboard-first) los use sin depender de urvid. La factory INYECTA las 4 funciones del entorno
// -> el dibujo sale byte-identico al de antes (verificado con tools/premium-hash.mjs).
const HERO = createHeroObjects({ drawText, lighten, darken, rgba })
const POOLS = HERO.pools

// ---------- ESCENAS ----------
register({
  id: 'scene.prem.open', lib: 'scene-layouts', category: 'openers/hero', tones: ['dark', 'light'], rubros: ['*'], weight: 0,
  register: 'editorial', intensity: 'soft', tags: ['premium', 'apertura'], beat: 'hook',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, lk = lookOf(env)
    plate(ctx, t, pal.accent, lk)
    ornament(ctx, H * 0.5, win(t, 0.1, 0.85), pal.accent, lk)
    drawText(ctx, caseTxt(content.brand || 'MARCA', lk.o.case), W / 2, H * 0.5 - 34, { size: 24, weight: 700, family: fonts.display, maxW: W * 0.85, tracking: lk.o.track, alpha: win(t, 0.5, 1.1), color: lk.ink })
    drawText(ctx, 'MMXXVI', W / 2, H * 0.5 + 30, { size: 12, weight: 400, family: fonts.num || fonts.accent, tracking: 7, alpha: win(t, 0.75, 1.3) * 0.5, color: lk.dim, maxW: W * 0.5 })
    finish(ctx, t, lk)
  },
})
register({
  id: 'scene.prem.statement', lib: 'scene-layouts', category: 'statements/editorial', tones: ['dark', 'light'], rubros: ['*'], weight: 0,
  register: 'editorial', intensity: 'loud', tags: ['premium', 'mask-reveal'], beat: 'value',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, lk = lookOf(env)
    plate(ctx, t, pal.accent, lk)
    const words = String(content.claim || content.tagline || 'Hecho para durar').split(' ')
    const cut1 = Math.ceil(words.length / 3), cut2 = Math.ceil(words.length * 2 / 3)
    const l1 = words.slice(0, cut1).join(' '), l2 = words.slice(cut1, cut2).join(' '), l3 = words.slice(cut2).join(' ')
    const sz = 56
    maskLine(ctx, caseTxt(l1, lk.o.case === 'upper' ? 'title' : lk.o.case), W / 2, H * 0.42, sz, win(t, 0.05, 0.65), { weight: 800, family: fonts.display, color: lk.ink })
    if (l2) maskLine(ctx, l2, W / 2, H * 0.42 + sz * 1.22, sz, win(t, 0.2, 0.8), { weight: 800, family: fonts.display, color: lk.ink })
    if (l3) maskLine(ctx, l3, W / 2, H * 0.42 + sz * 2.44, sz, win(t, 0.35, 0.95), { weight: 800, family: fonts.display, color: pal.accent })
    if (content.tagline && content.claim) drawText(ctx, String(content.tagline).toUpperCase(), W / 2, H * 0.68, { size: 13, weight: 600, family: fonts.num || fonts.accent, upper: true, tracking: 4, maxW: W * 0.85, alpha: win(t, 1.1, 1.6) * 0.75, color: lk.dim })
    finish(ctx, t, lk)
  },
})
register({
  id: 'scene.prem.hero', lib: 'scene-layouts', category: 'statements/editorial', tones: ['dark', 'light'], rubros: ['*'], weight: 0,
  register: 'editorial', intensity: 'medium', tags: ['premium', 'objeto-heroe'], beat: 'value',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, lk = lookOf(env)
    plate(ctx, t, pal.accent, lk)
    const pool = POOLS[env.rubro] || POOLS.default
    const hR = lk.o.heroR != null ? lk.o.heroR : 0
    // FOTO REAL de la pagina como heroe (adaptacion maxima) ~45% de las veces cuando existe
    const usePhoto = env.mediaImage && hR < 0.45
    const hero = usePhoto ? oPhoto : pool[(hR * pool.length) | 0]
    const mode = lk.o.heroMode || 'solo'
    const en = spring(win(t, 0.05, 1.0), 0.6, 11)
    ctx.save()
    ctx.translate(W / 2, H * 0.4 + (1 - en) * H * 0.45 + Math.sin(t * 1.4) * 4)
    if (mode === 'orbit') {
      const op = win(t, 0.7, 1.8)
      ctx.save(); ctx.strokeStyle = rgba(pal.accent, 0.4); ctx.lineWidth = 1.4; ctx.setLineDash([3, 10])
      ctx.rotate(t * 0.12)
      ctx.beginPath(); ctx.ellipse(0, 0, 175 * eo(op), 66 * eo(op), -0.3, 0, TAU); ctx.stroke(); ctx.restore()
    }
    ctx.rotate(-0.03 + Math.sin(t * 0.9) * 0.012)
    const mScale = mode === 'macro' ? 1.75 : 1.2
    if (mode === 'macro') ctx.translate(26, -16)
    ctx.scale(mScale, mScale)
    hero(ctx, t, win(t, 0.9, 2.1), pal.accent, fonts, content.brand, lk.o.hp, env)
    ctx.restore()
    drawText(ctx, ('CONOCÉ ' + (content.brand || '')).toUpperCase(), W / 2, H * 0.7, { size: 13, weight: 600, family: fonts.num || fonts.accent, upper: true, tracking: 5, maxW: W * 0.8, alpha: win(t, 1.4, 1.9) * 0.85, color: lk.dim })
    maskLine(ctx, content.tagline || content.claim || '', W / 2, H * 0.77, 24, win(t, 1.6, 2.2), { weight: 600, family: fonts.display, color: lk.ink, maxW: W * 0.86 })
    finish(ctx, t, lk)
  },
})
register({
  id: 'scene.prem.punch', lib: 'scene-layouts', category: 'data/single', tones: ['dark', 'light'], rubros: ['*'], weight: 0,
  register: 'editorial', intensity: 'loud', tags: ['premium', 'punch'], beat: 'proof',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, lk = lookOf(env)
    plate(ctx, t, pal.accent, lk)
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
    if (rp > 0 && lk.o.ring !== 'none') {
      ctx.save(); ctx.strokeStyle = rgba(lk.ink, 0.3); ctx.lineWidth = 1.4
      if (lk.o.ring === 'dash') ctx.setLineDash([2, 9])
      ctx.beginPath(); ctx.arc(W / 2, H * 0.45, 150, -Math.PI / 2, -Math.PI / 2 + TAU * rp); ctx.stroke(); ctx.restore()
    }
    maskLine(ctx, sub, W / 2, H * 0.65, 34, win(t, 0.55, 1.15), { weight: 800, family: fonts.display, color: lk.ink, maxW: W * 0.85 })
    finish(ctx, t, lk)
  },
})
register({
  id: 'scene.prem.rafaga', lib: 'scene-layouts', category: 'lists/checklist', tones: ['dark', 'light'], rubros: ['*'], weight: 0,
  register: 'editorial', intensity: 'loud', tags: ['premium', 'rafaga', 'beat'], beat: 'value',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, lk = lookOf(env)
    const items = (content.bullets && content.bullets.length >= 2 ? content.bullets : String(content.claim || 'Rapido · Simple · Real').split(/[·,]/)).slice(0, 3).map(s => String(s).trim())
    const n = Math.max(2, items.length)
    const CUT = (env.sceneDur || 2.4) / n
    const i = Math.min(n - 1, Math.floor(t / CUT))
    const ct = t - i * CUT
    const dark = lk.dark ? i % 2 === 0 : i % 2 === 1
    ctx.fillStyle = dark ? (lk.bg0 || '#0a0a0d') : '#f4f2ec'; ctx.fillRect(-8, -8, W + 16, H + 16)
    if (ct < 0.066) { ctx.fillStyle = dark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.14)'; ctx.fillRect(0, 0, W, H) }
    const e = spring(win(ct, 0.02, 0.42), 0.62, 15)
    ctx.save()
    ctx.translate(W / 2, H * 0.5); ctx.scale(0.94 + 0.06 * e, 0.94 + 0.06 * e)
    drawWrapped(ctx, items[i] || '', 0, 0, { size: 44, min: 16, weight: 900, family: fonts.display, maxW: W * 0.8, maxLines: 2, lh: 1.1, color: dark ? '#f2f0ea' : '#111114', alpha: clamp(e * 2, 0, 1) })
    ctx.restore()
    drawText(ctx, `0${i + 1} / 0${n}`, W / 2, H * 0.5 + 92, { size: 11, weight: 400, family: fonts.num || fonts.accent, tracking: 4, color: dark ? 'rgba(242,240,234,0.45)' : 'rgba(17,17,20,0.45)', alpha: win(ct, 0.15, 0.4), maxW: W * 0.4 })
    finish(ctx, t, lk, 0.5)
  },
})
register({
  id: 'scene.prem.outro', lib: 'scene-layouts', category: 'closers/outro', tones: ['dark', 'light'], rubros: ['*'], weight: 0,
  register: 'editorial', intensity: 'medium', tags: ['premium', 'cierre'], beat: 'close',
  render(ctx, t, env) {
    const { pal, content, fonts } = env, lk = lookOf(env)
    plate(ctx, t, pal.accent, lk)
    ornament(ctx, H * 0.34, win(t, 0.05, 0.7), pal.accent, lk, W * 0.36)
    const bs = fitFont(ctx, caseTxt(content.brand || 'MARCA', 'upper'), 92, W * 0.86, 34, 900, fonts.display)
    maskLine(ctx, caseTxt(content.brand || 'MARCA', 'upper'), W / 2, H * 0.42, bs, win(t, 0.18, 0.85), { weight: 900, family: fonts.display, color: lk.ink, tracking: 2 })
    if (content.tagline) drawText(ctx, String(content.tagline).toUpperCase(), W / 2, H * 0.5, { size: 12.5, weight: 600, family: fonts.num || fonts.accent, upper: true, tracking: 4, maxW: W * 0.84, alpha: win(t, 0.65, 1.15) * 0.8, color: lk.dim })
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
    finish(ctx, t, lk)
  },
})
