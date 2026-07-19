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
function specSweep(ctx, clipFn, sw, wBand, hSpan, alpha = 0.17) {
  ctx.save(); clipFn()
  ctx.clip()
  const sx = lerp(-hSpan, hSpan, sw)
  const g = ctx.createLinearGradient(sx - wBand, 0, sx + wBand, 0)
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, `rgba(255,255,255,${alpha})`); g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.save(); ctx.rotate(-0.32); ctx.fillStyle = g; ctx.fillRect(-hSpan * 2, -hSpan * 2, hSpan * 4, hSpan * 4); ctx.restore()
  ctx.restore()
}
const shadowUnder = (ctx, fn) => { ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 15; fn(); ctx.restore() }

// ---------- BIBLIOTECA DE OBJETOS HEROE (14 dibujantes parametricos) ----------
// contrato: fn(ctx, t, sw, accent, fonts, brand, hp) centrado en (0,0), ~240 ancho. hp = [a,b,c] floats 0..1
// del seed del video -> proporciones/detalles DISTINTOS entre videos aun con el mismo objeto.
function oCard(ctx, t, sw, ac, fonts, brand, hp) {
  const CW = 220 + hp[0] * 40, CH = CW * (0.6 + hp[1] * 0.06), R = 14 + hp[2] * 8, x = -CW / 2, y = -CH / 2
  shadowUnder(ctx, () => { rr(ctx, x, y, CW, CH, R); ctx.fillStyle = '#0c0d11'; ctx.fill() })
  const body = ctx.createLinearGradient(0, y, 0, y + CH)
  body.addColorStop(0, '#2a2d36'); body.addColorStop(0.45, '#181a20'); body.addColorStop(1, '#0e0f13')
  rr(ctx, x, y, CW, CH, R); ctx.fillStyle = body; ctx.fill()
  specSweep(ctx, () => rr(ctx, x, y, CW, CH, R), sw, 46, CW)
  rr(ctx, x + 0.5, y + 0.5, CW - 1, CH - 1, R)
  const rim = ctx.createLinearGradient(0, y, 0, y + CH)
  rim.addColorStop(0, 'rgba(255,255,255,0.35)'); rim.addColorStop(0.3, 'rgba(255,255,255,0.06)'); rim.addColorStop(1, 'rgba(255,255,255,0.02)')
  ctx.strokeStyle = rim; ctx.lineWidth = 1; ctx.stroke()
  const chx = x + 22, chy = y + CH * 0.34
  rr(ctx, chx, chy, 32, 24, 5)
  const chg = ctx.createLinearGradient(0, chy, 0, chy + 24)
  chg.addColorStop(0, lighten(ac, 0.18)); chg.addColorStop(1, darken(ac, 0.1))
  ctx.fillStyle = chg; ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.2; ctx.lineCap = 'round'
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(chx + 52, chy + 12, 4 + i * 4, -0.6, 0.6); ctx.stroke() }
  drawText(ctx, caseTxt(brand || 'MARCA', 'upper'), x + 22, y + 26, { size: 15, weight: 800, family: fonts.display, align: 'left', maxW: CW - 44, color: 'rgba(255,255,255,0.92)', tracking: 3 })
  drawText(ctx, '••••  ••••  4021', x + 22, y + CH - 26, { size: 10, weight: 400, family: fonts.num || fonts.accent, align: 'left', maxW: CW - 44, color: 'rgba(255,255,255,0.5)' })
}
function oWindow(ctx, t, sw, ac, fonts, brand, hp) {
  const CW = 230 + hp[0] * 30, CH = CW * 0.68, x = -CW / 2, y = -CH / 2
  shadowUnder(ctx, () => { rr(ctx, x, y, CW, CH, 13); ctx.fillStyle = '#101117'; ctx.fill() })
  rr(ctx, x, y, CW, CH, 13); ctx.fillStyle = '#14161d'; ctx.fill()
  rr(ctx, x + 0.5, y + 0.5, CW - 1, CH - 1, 12.5); ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.lineWidth = 1; ctx.stroke()
  for (let i = 0; i < 3; i++) { ctx.fillStyle = i === 2 ? ac : 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.arc(x + 16 + i * 13, y + 15, 3.2, 0, TAU); ctx.fill() }
  ctx.fillStyle = 'rgba(255,255,255,0.09)'
  rr(ctx, x + 16, y + 34, CW * 0.52, 9, 4.5); ctx.fill()
  rr(ctx, x + 16, y + 52, CW * 0.36, 9, 4.5); ctx.fill()
  const nB = 3 + Math.round(hp[1] * 2)
  for (let i = 0; i < nB; i++) {
    const bhv = (0.35 + ((i * 2654435761 >>> 8) % 100) / 160) * (CH * 0.4)
    const bh = bhv * eo(win(t, 0.4 + i * 0.1, 1.1 + i * 0.1))
    ctx.fillStyle = i === nB - 1 ? ac : 'rgba(255,255,255,0.2)'
    const bw = (CW - 44) / nB - 10
    rr(ctx, x + 20 + i * ((CW - 44) / nB), y + CH - 16 - bh, bw, bh, 3.5); ctx.fill()
  }
  specSweep(ctx, () => rr(ctx, x, y, CW, CH, 13), sw, 40, CW, 0.1)
}
function oPlate(ctx, t, sw, ac, fonts, brand, hp) {
  const RX = 108 + hp[0] * 22, RY = RX * 0.34
  shadowUnder(ctx, () => { ctx.fillStyle = '#14151a'; ctx.beginPath(); ctx.ellipse(0, 10, RX, RY, 0, 0, TAU); ctx.fill() })
  const g = ctx.createRadialGradient(0, -6, 10, 0, 0, RX)
  g.addColorStop(0, '#23252c'); g.addColorStop(0.72, '#181a20'); g.addColorStop(1, '#101116')
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, RX, RY, 0, 0, TAU); ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1.2
  ctx.beginPath(); ctx.ellipse(0, -3, RX * 0.85, RY * 0.8, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke()
  ctx.fillStyle = ac; ctx.beginPath(); ctx.ellipse(0, -6, RX * 0.29, RY * 0.3, 0, 0, TAU); ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.ellipse(-8, -9, RX * 0.1, 4, -0.4, 0, TAU); ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; ctx.lineCap = 'round'
  const nV = 2 + Math.round(hp[1])
  for (let i = 0; i < nV; i++) {
    const ph = t * 1.1 + i * 2.1, xx = -26 + i * (52 / Math.max(1, nV - 1))
    ctx.save(); ctx.globalAlpha = 0.35 + 0.15 * Math.sin(ph * 2)
    ctx.beginPath()
    for (let k = 0; k <= 8; k++) { const yy = -26 - k * 9, dx = Math.sin(ph + k * 0.7) * (5 + hp[2] * 5); k === 0 ? ctx.moveTo(xx + dx, yy) : ctx.lineTo(xx + dx, yy) }
    ctx.stroke(); ctx.restore()
  }
}
function oCup(ctx, t, sw, ac, fonts, brand, hp) {
  const CW = 92 + hp[0] * 22, CH = CW * 1.14, x = -CW / 2, y = -CH / 2
  shadowUnder(ctx, () => { rr(ctx, x, y, CW, CH, 12); ctx.fillStyle = '#12131a'; ctx.fill() })
  const g = ctx.createLinearGradient(x, 0, x + CW, 0)
  g.addColorStop(0, '#22242c'); g.addColorStop(0.5, '#181a21'); g.addColorStop(1, '#111318')
  rr(ctx, x, y, CW, CH, 12); ctx.fillStyle = g; ctx.fill()
  rr(ctx, x - 3, y + 10, CW + 6, 15, 7); ctx.fillStyle = darken(ac, 0.05); ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 6; ctx.lineCap = 'round'
  ctx.beginPath(); ctx.arc(x + CW + 12, 4, 20, -1.2, 1.2); ctx.stroke()
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2
  for (let i = 0; i < 2; i++) {
    const ph = t * 1.2 + i * 2.4
    ctx.save(); ctx.globalAlpha = 0.4
    ctx.beginPath()
    for (let k = 0; k <= 7; k++) { const yy = y - 8 - k * 8, dx = Math.sin(ph + k * 0.8) * 6; k === 0 ? ctx.moveTo(-10 + i * 22 + dx, yy) : ctx.lineTo(-10 + i * 22 + dx, yy) }
    ctx.stroke(); ctx.restore()
  }
  specSweep(ctx, () => rr(ctx, x, y, CW, CH, 12), sw, 26, CW, 0.14)
}
function oBottle(ctx, t, sw, ac, fonts, brand, hp) {
  const BW = 92 + hp[0] * 26, BH = BW * (1.35 + hp[1] * 0.25), x = -BW / 2, y = -BH / 2 + 12
  shadowUnder(ctx, () => { rr(ctx, x, y, BW, BH, 16 + hp[2] * 14); ctx.fillStyle = '#12131a'; ctx.fill() })
  const g = ctx.createLinearGradient(x, 0, x + BW, 0)
  g.addColorStop(0, '#20222b'); g.addColorStop(0.5, '#171922'); g.addColorStop(1, '#101218')
  rr(ctx, x, y, BW, BH, 16 + hp[2] * 14); ctx.fillStyle = g; ctx.fill()
  const capW = BW * 0.38
  rr(ctx, -capW / 2, y - 32, capW, 30, 6)
  const cap = ctx.createLinearGradient(0, y - 32, 0, y - 2)
  cap.addColorStop(0, lighten(ac, 0.15)); cap.addColorStop(1, darken(ac, 0.12))
  ctx.fillStyle = cap; ctx.fill()
  specSweep(ctx, () => rr(ctx, x, y, BW, BH, 16 + hp[2] * 14), sw, 24, BW, 0.2)
  rr(ctx, x + 0.5, y + 0.5, BW - 1, BH - 1, 15.5 + hp[2] * 14); ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1; ctx.stroke()
  ctx.fillStyle = rgba(ac, 0.9); ctx.fillRect(-BW * 0.25, y + BH * 0.42, BW * 0.5, 2.5)
  drawText(ctx, caseTxt(brand || 'MARCA', 'upper'), 0, y + BH * 0.56, { size: 11, weight: 700, family: fonts.display, maxW: BW * 0.8, color: 'rgba(255,255,255,0.7)', tracking: 2 })
}
function oTicket(ctx, t, sw, ac, fonts, brand, hp) {
  const TW = 220 + hp[0] * 30, TH = TW * 0.5, x = -TW / 2, y = -TH / 2
  ctx.save(); ctx.rotate(-0.06 + hp[1] * 0.05)
  shadowUnder(ctx, () => { rr(ctx, x, y, TW, TH, 13); ctx.fillStyle = '#12131a'; ctx.fill() })
  const g = ctx.createLinearGradient(0, y, 0, y + TH)
  g.addColorStop(0, '#1e2029'); g.addColorStop(1, '#12141b')
  rr(ctx, x, y, TW, TH, 13); ctx.fillStyle = g; ctx.fill()
  const div = x + TW * 0.68
  ctx.setLineDash([4, 6]); ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.4
  ctx.beginPath(); ctx.moveTo(div, y); ctx.lineTo(div, y + TH); ctx.stroke(); ctx.setLineDash([])
  drawText(ctx, caseTxt(brand || 'EVENTO', 'upper'), x + 18, y + TH * 0.32, { size: 17, weight: 800, family: fonts.display, align: 'left', maxW: TW * 0.56, color: '#f2f0ea', tracking: 2 })
  drawText(ctx, 'ADMIT ONE', x + 18, y + TH * 0.6, { size: 9, weight: 600, family: fonts.num || fonts.accent, align: 'left', maxW: TW * 0.5, color: 'rgba(242,240,234,0.5)', tracking: 3 })
  ctx.fillStyle = ac; ctx.fillRect(x + 18, y + TH * 0.74, TW * 0.3, 2.5)
  for (let i = 0; i < 8; i++) { ctx.fillStyle = 'rgba(255,255,255,0.65)'; ctx.fillRect(div + 10 + i * 6, y + TH * 0.24, i % 3 === 0 ? 3 : 1.5, TH * 0.52) }
  rr(ctx, x + 0.5, y + 0.5, TW - 1, TH - 1, 12.5); ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1; ctx.stroke()
  ctx.restore()
}
function oDumbbell(ctx, t, sw, ac, fonts, brand, hp) {
  const L = 190 + hp[0] * 40, ph2 = 34 + hp[1] * 14
  ctx.save(); ctx.rotate(-0.16)
  shadowUnder(ctx, () => { rr(ctx, -L / 2, -7, L, 14, 7); ctx.fillStyle = '#101116'; ctx.fill() })
  const bar = ctx.createLinearGradient(0, -7, 0, 7)
  bar.addColorStop(0, '#3a3d47'); bar.addColorStop(0.5, '#20222a'); bar.addColorStop(1, '#14161c')
  rr(ctx, -L / 2, -7, L, 14, 7); ctx.fillStyle = bar; ctx.fill()
  for (const s of [-1, 1]) {
    for (let i = 0; i < 2; i++) {
      const px = s * (L / 2 - 18 - i * 24)
      const g = ctx.createLinearGradient(0, -ph2, 0, ph2)
      g.addColorStop(0, i === 0 ? lighten(ac, 0.08) : '#262933'); g.addColorStop(1, i === 0 ? darken(ac, 0.14) : '#14161c')
      rr(ctx, px - 9, -ph2, 18, ph2 * 2, 8); ctx.fillStyle = g; ctx.fill()
      rr(ctx, px - 9 + 0.5, -ph2 + 0.5, 17, ph2 * 2 - 1, 7.5); ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1; ctx.stroke()
    }
  }
  ctx.restore()
}
function oRing(ctx, t, sw, ac, fonts, brand, hp) {
  const R = 86 + hp[0] * 20
  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 13 + hp[1] * 5
  ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.stroke()
  const p = 0.62 + hp[2] * 0.3
  const prog = eo(win(t, 0.35, 1.6)) * p
  const g = ctx.createLinearGradient(-R, 0, R, 0)
  g.addColorStop(0, darken(ac, 0.08)); g.addColorStop(1, lighten(ac, 0.12))
  ctx.strokeStyle = g; ctx.lineCap = 'round'
  ctx.beginPath(); ctx.arc(0, 0, R, -Math.PI / 2, -Math.PI / 2 + TAU * prog); ctx.stroke()
  drawText(ctx, Math.round(prog * 100) + '%', 0, 2, { size: R * 0.52, weight: 900, family: fonts.display, color: '#f2f0ea', maxW: R * 1.4 })
  ctx.restore()
}
function oHouse(ctx, t, sw, ac, fonts, brand, hp) {
  const S = 190 + hp[0] * 30
  ctx.save()
  shadowUnder(ctx, () => { rr(ctx, -S / 2, -S * 0.1, S, S * 0.52, 10); ctx.fillStyle = '#101116'; ctx.fill() })
  const body = ctx.createLinearGradient(0, -S * 0.1, 0, S * 0.42)
  body.addColorStop(0, '#22242d'); body.addColorStop(1, '#13151b')
  rr(ctx, -S / 2, -S * 0.1, S, S * 0.52, 10); ctx.fillStyle = body; ctx.fill()
  ctx.beginPath(); ctx.moveTo(-S * 0.58, -S * 0.08); ctx.lineTo(0, -S * 0.42); ctx.lineTo(S * 0.58, -S * 0.08); ctx.closePath()
  const roof = ctx.createLinearGradient(0, -S * 0.42, 0, -S * 0.08)
  roof.addColorStop(0, '#2c2f3a'); roof.addColorStop(1, '#191b23')
  ctx.fillStyle = roof; ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1.4
  ctx.beginPath(); ctx.moveTo(-S * 0.58, -S * 0.08); ctx.lineTo(0, -S * 0.42); ctx.lineTo(S * 0.58, -S * 0.08); ctx.stroke()
  rr(ctx, -S * 0.09, S * 0.1, S * 0.18, S * 0.32, 5)
  const door = ctx.createLinearGradient(0, S * 0.1, 0, S * 0.42)
  door.addColorStop(0, lighten(ac, 0.1)); door.addColorStop(1, darken(ac, 0.12))
  ctx.fillStyle = door; ctx.fill()
  ctx.fillStyle = 'rgba(255,255,240,0.75)'
  const wg = eo(win(t, 0.6, 1.3))
  for (const s of [-1, 1]) { ctx.save(); ctx.globalAlpha = 0.15 + 0.6 * wg; rr(ctx, s * S * 0.3 - S * 0.07, S * 0.14, S * 0.14, S * 0.14, 4); ctx.fill(); ctx.restore() }
  ctx.restore()
}
function oBook(ctx, t, sw, ac, fonts, brand, hp) {
  const BW = 170 + hp[0] * 30, BH = BW * 1.32, x = -BW / 2, y = -BH / 2
  ctx.save(); ctx.rotate(-0.05)
  shadowUnder(ctx, () => { rr(ctx, x, y, BW, BH, 8); ctx.fillStyle = '#101116'; ctx.fill() })
  const g = ctx.createLinearGradient(x, 0, x + BW, 0)
  g.addColorStop(0, '#262932'); g.addColorStop(0.12, '#1b1d25'); g.addColorStop(1, '#12141b')
  rr(ctx, x, y, BW, BH, 8); ctx.fillStyle = g; ctx.fill()
  ctx.fillStyle = rgba(ac, 0.95); ctx.fillRect(x, y, 10, BH)
  ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(x + BW - 7, y + 6, 3, BH - 12)
  drawText(ctx, caseTxt(brand || 'MARCA', 'upper'), x + BW * 0.55, y + BH * 0.3, { size: 17, weight: 800, family: fonts.display, maxW: BW * 0.68, color: '#f2f0ea', tracking: 2 })
  ctx.fillStyle = rgba(ac, 0.9); ctx.fillRect(x + BW * 0.3, y + BH * 0.42, BW * 0.5, 2.5)
  drawText(ctx, 'VOL. ' + (1 + Math.round(hp[1] * 8)), x + BW * 0.55, y + BH * 0.78, { size: 10, weight: 600, family: fonts.num || fonts.accent, maxW: BW * 0.6, color: 'rgba(242,240,234,0.5)', tracking: 3 })
  specSweep(ctx, () => rr(ctx, x, y, BW, BH, 8), sw, 30, BW, 0.12)
  ctx.restore()
}
function oCapsule(ctx, t, sw, ac, fonts, brand, hp) {
  const L = 150 + hp[0] * 30, R = 34 + hp[1] * 8
  ctx.save(); ctx.rotate(-0.5)
  shadowUnder(ctx, () => { rr(ctx, -L / 2, -R, L, R * 2, R); ctx.fillStyle = '#101116'; ctx.fill() })
  ctx.save(); rr(ctx, -L / 2, -R, L, R * 2, R); ctx.clip()
  const g1 = ctx.createLinearGradient(0, -R, 0, R)
  g1.addColorStop(0, '#262932'); g1.addColorStop(1, '#14161d')
  ctx.fillStyle = g1; ctx.fillRect(-L / 2, -R, L / 2, R * 2)
  const g2 = ctx.createLinearGradient(0, -R, 0, R)
  g2.addColorStop(0, lighten(ac, 0.14)); g2.addColorStop(1, darken(ac, 0.1))
  ctx.fillStyle = g2; ctx.fillRect(0, -R, L / 2, R * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.beginPath(); ctx.ellipse(-L * 0.26, -R * 0.45, L * 0.16, R * 0.22, 0.1, 0, TAU); ctx.fill()
  ctx.restore()
  rr(ctx, -L / 2 + 0.5, -R + 0.5, L - 1, R * 2 - 1, R - 0.5); ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1; ctx.stroke()
  ctx.restore()
}
function oBag(ctx, t, sw, ac, fonts, brand, hp) {
  const BW = 160 + hp[0] * 30, BH = BW * 1.2, x = -BW / 2, y = -BH / 2 + 14
  shadowUnder(ctx, () => { rr(ctx, x, y, BW, BH, 6); ctx.fillStyle = '#101116'; ctx.fill() })
  const g = ctx.createLinearGradient(x, 0, x + BW, 0)
  g.addColorStop(0, '#22242d'); g.addColorStop(0.5, '#17191f'); g.addColorStop(1, '#101218')
  rr(ctx, x, y, BW, BH, 6); ctx.fillStyle = g; ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 5; ctx.lineCap = 'round'
  ctx.beginPath(); ctx.arc(0, y + 4, BW * 0.26, Math.PI, 0); ctx.stroke()
  ctx.fillStyle = rgba(ac, 0.95); ctx.fillRect(x, y + BH * 0.62, BW, 3)
  drawText(ctx, caseTxt(brand || 'MARCA', 'upper'), 0, y + BH * 0.4, { size: 16, weight: 800, family: fonts.display, maxW: BW * 0.8, color: '#f2f0ea', tracking: 4 })
  specSweep(ctx, () => rr(ctx, x, y, BW, BH, 6), sw, 30, BW, 0.13)
}
function oTag(ctx, t, sw, ac, fonts, brand, hp) {
  const TW = 190 + hp[0] * 30, TH = TW * 0.46, x = -TW / 2, y = -TH / 2
  ctx.save(); ctx.rotate(0.10 - hp[1] * 0.2)
  shadowUnder(ctx, () => {
    ctx.beginPath(); ctx.moveTo(x + 26, y); ctx.lineTo(x + TW, y); ctx.arcTo(x + TW + 10, y + TH / 2, x + TW, y + TH, 12); ctx.lineTo(x + 26, y + TH); ctx.lineTo(x, y + TH / 2); ctx.closePath(); ctx.fillStyle = '#101116'; ctx.fill()
  })
  ctx.beginPath(); ctx.moveTo(x + 26, y); ctx.lineTo(x + TW, y); ctx.arcTo(x + TW + 10, y + TH / 2, x + TW, y + TH, 12); ctx.lineTo(x + 26, y + TH); ctx.lineTo(x, y + TH / 2); ctx.closePath()
  const g = ctx.createLinearGradient(0, y, 0, y + TH)
  g.addColorStop(0, '#22242d'); g.addColorStop(1, '#14161d')
  ctx.fillStyle = g; ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1; ctx.stroke()
  ctx.fillStyle = rgba(ac, 0.95); ctx.beginPath(); ctx.arc(x + 15, y + TH / 2, 5, 0, TAU); ctx.fill()
  drawText(ctx, caseTxt(brand || 'MARCA', 'upper'), x + 34, y + TH * 0.38, { size: 15, weight: 800, family: fonts.display, align: 'left', maxW: TW - 60, color: '#f2f0ea', tracking: 3 })
  drawText(ctx, 'NUEVA TEMPORADA', x + 34, y + TH * 0.72, { size: 8.5, weight: 600, family: fonts.num || fonts.accent, align: 'left', maxW: TW - 60, color: 'rgba(242,240,234,0.5)', tracking: 2 })
  ctx.restore()
}
function oChart(ctx, t, sw, ac, fonts, brand, hp) {
  const S = 200 + hp[0] * 30
  ctx.save()
  shadowUnder(ctx, () => { rr(ctx, -S / 2, -S * 0.36, S, S * 0.72, 14); ctx.fillStyle = '#101117'; ctx.fill() })
  rr(ctx, -S / 2, -S * 0.36, S, S * 0.72, 14); ctx.fillStyle = '#14161d'; ctx.fill()
  rr(ctx, -S / 2 + 0.5, -S * 0.36 + 0.5, S - 1, S * 0.72 - 1, 13.5); ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.lineWidth = 1; ctx.stroke()
  const p = eo(win(t, 0.4, 1.5))
  const pts = [[-0.38, 0.2], [-0.18, 0.05], [0.0, 0.12], [0.16, -0.1], [0.38, -0.24]]
  ctx.strokeStyle = ac; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  ctx.beginPath()
  const nSeg = Math.max(1, Math.floor(p * (pts.length - 1) * 100) / 100)
  for (let i = 0; i <= Math.min(pts.length - 1, Math.ceil(nSeg)); i++) {
    let [px, py] = pts[i]
    if (i > nSeg) { const f = nSeg - Math.floor(nSeg); const [ax, ay] = pts[i - 1]; px = lerp(ax, px, f); py = lerp(ay, py, f) }
    i === 0 ? ctx.moveTo(px * S, py * S) : ctx.lineTo(px * S, py * S)
  }
  ctx.stroke()
  const last = pts[pts.length - 1]
  if (p >= 1) { ctx.fillStyle = ac; ctx.beginPath(); ctx.arc(last[0] * S, last[1] * S, 6 + Math.sin(t * 3) * 1.4, 0, TAU); ctx.fill() }
  drawText(ctx, '+ ' + (18 + Math.round(hp[1] * 60)) + '%', S * 0.24, -S * 0.26, { size: 22, weight: 900, family: fonts.display, color: '#f2f0ea', maxW: S * 0.5 })
  ctx.restore()
}
function oShield(ctx, t, sw, ac, fonts, brand, hp) {
  const S = 108 + hp[0] * 22
  ctx.save()
  shadowUnder(ctx, () => {
    ctx.beginPath(); ctx.moveTo(0, -S); ctx.lineTo(S * 0.82, -S * 0.6); ctx.lineTo(S * 0.7, S * 0.35); ctx.lineTo(0, S); ctx.lineTo(-S * 0.7, S * 0.35); ctx.lineTo(-S * 0.82, -S * 0.6); ctx.closePath(); ctx.fillStyle = '#101116'; ctx.fill()
  })
  ctx.beginPath(); ctx.moveTo(0, -S); ctx.lineTo(S * 0.82, -S * 0.6); ctx.lineTo(S * 0.7, S * 0.35); ctx.lineTo(0, S); ctx.lineTo(-S * 0.7, S * 0.35); ctx.lineTo(-S * 0.82, -S * 0.6); ctx.closePath()
  const g = ctx.createLinearGradient(0, -S, 0, S)
  g.addColorStop(0, '#262932'); g.addColorStop(1, '#13151b')
  ctx.fillStyle = g; ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1.4; ctx.stroke()
  const tp = eo(win(t, 0.5, 1.2))
  ctx.strokeStyle = ac; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  ctx.beginPath()
  const seg = [[-S * 0.3, 0], [-S * 0.06, S * 0.26], [S * 0.36, -S * 0.3]]
  const tot = 2, cur = tp * tot
  ctx.moveTo(seg[0][0], seg[0][1])
  if (cur > 0) { const f = Math.min(1, cur); ctx.lineTo(lerp(seg[0][0], seg[1][0], f), lerp(seg[0][1], seg[1][1], f)) }
  if (cur > 1) { const f = Math.min(1, cur - 1); ctx.lineTo(lerp(seg[1][0], seg[2][0], f), lerp(seg[1][1], seg[2][1], f)) }
  ctx.stroke()
  ctx.restore()
}
function oPhoto(ctx, t, sw, ac, fonts, brand, hp, env) {
  const img = env && env.getImg && env.mediaImage ? env.getImg(env.mediaImage) : null
  if (!img) { oCard(ctx, t, sw, ac, fonts, brand, hp); return }
  const PW = 210 + hp[0] * 40, PH = PW * (1.1 + hp[1] * 0.25), x = -PW / 2, y = -PH / 2
  ctx.save(); ctx.rotate(-0.04 + hp[2] * 0.08)
  shadowUnder(ctx, () => { rr(ctx, x - 8, y - 8, PW + 16, PH + 16, 10); ctx.fillStyle = '#0e0f13'; ctx.fill() })
  rr(ctx, x - 8, y - 8, PW + 16, PH + 16, 10); ctx.fillStyle = '#14151b'; ctx.fill()
  ctx.save(); rr(ctx, x, y, PW, PH, 4); ctx.clip()
  const iw = img.width, ih = img.height, sc = Math.max(PW / iw, PH / ih)
  ctx.drawImage(img, (iw - PW / sc) / 2, (ih - PH / sc) / 2, PW / sc, PH / sc, x, y, PW, PH)
  const dk = ctx.createLinearGradient(0, y, 0, y + PH)
  dk.addColorStop(0, 'rgba(0,0,0,0)'); dk.addColorStop(1, 'rgba(0,0,0,0.35)')
  ctx.fillStyle = dk; ctx.fillRect(x, y, PW, PH)
  ctx.restore()
  specSweep(ctx, () => rr(ctx, x - 8, y - 8, PW + 16, PH + 16, 10), sw, 40, PW, 0.14)
  rr(ctx, x - 7.5, y - 7.5, PW + 15, PH + 15, 9.5); ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1; ctx.stroke()
  ctx.fillStyle = rgba(ac, 0.95); ctx.fillRect(x, y + PH + 12, PW * 0.34, 2.5)
  ctx.restore()
}
// pools POR RUBRO (el heroIdx del look elige adentro; hp varia las proporciones)
const POOLS = {
  finanzas: [oCard, oChart, oShield, oRing, oHouse, oCapsule],
  tech: [oWindow, oChart, oShield, oRing, oCard, oCapsule],
  default: [oShield, oRing, oChart, oWindow, oTicket, oBook],
  educacion: [oBook, oShield, oWindow, oRing, oTicket, oCup],
  gastronomia: [oPlate, oCup, oTicket, oTag, oBag, oRing],
  belleza: [oBottle, oTag, oCapsule, oRing, oBag, oCup],
  moda: [oBag, oTag, oBottle, oTicket, oRing, oShield],
  salud: [oCapsule, oShield, oRing, oBottle, oBook, oWindow],
  eventos: [oTicket, oCup, oBag, oRing, oTag, oShield],
  fitness: [oDumbbell, oRing, oShield, oWindow, oCapsule, oChart],
  inmobiliaria: [oHouse, oCard, oShield, oChart, oWindow, oRing],
}

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
