// NOVA — pieza de marketing dirigida a mano (demo de craft, autor: Fable).
// Marca ficticia de tarjeta premium. 1080x1920 @ 30fps, ~16s. Canvas 2D puro, cero dependencias.
// drawFrame(ctx, t) es PURO y determinista -> corre igual en browser y en Node (napi) para verificarlo frame a frame.

export const W = 1080, H = 1920, DUR = 16.0, FPS = 30

// ---------- kit de movimiento ----------
const clamp = (v, a, b) => v < a ? a : v > b ? b : v
const lerp = (a, b, t) => a + (b - a) * t
const eo = t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)                    // expo out
const ei = t => t <= 0 ? 0 : Math.pow(2, 10 * (t - 1))                   // expo in
const eio = t => t < 0.5 ? ei(t * 2) / 2 : 0.5 + eo(t * 2 - 1) / 2
const win = (t, a, b) => clamp((t - a) / (b - a), 0, 1)
function spring(t, z = 0.55, w = 13) {                                    // settle con rebote, forma cerrada
  if (t <= 0) return 0; if (t >= 1) return 1
  const wd = w * Math.sqrt(1 - z * z), e = Math.exp(-z * w * t)
  return 1 - e * (Math.cos(wd * t) + (z * w / wd) * Math.sin(wd * t))
}
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let x = Math.imul(a ^ (a >>> 15), 1 | a); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296 } }

// ---------- paleta / tipografia ----------
const INK = '#f2f0ea'          // hueso calido
const DIM = 'rgba(242,240,234,0.42)'
const BG0 = '#0a0a0d', BG1 = '#101016'
const LIME = '#c8ff4d'         // EL acento (uno solo, electrico)
const PAPER = '#f4f2ec'
const F = 'Archivo', FM = 'Space Mono'

function text(ctx, str, x, y, o = {}) {
  const { size = 60, weight = 900, family = F, align = 'center', color = INK, alpha = 1, tr = 0, baseline = 'middle' } = o
  if (alpha <= 0) return
  ctx.save()
  ctx.globalAlpha *= clamp(alpha, 0, 1)
  ctx.font = `${weight} ${size}px "${family}"`
  ctx.letterSpacing = tr + 'px'
  ctx.textAlign = align; ctx.textBaseline = baseline; ctx.fillStyle = color
  ctx.fillText(str, x, y)
  ctx.restore()
}
// linea con MASK-REVEAL clasico de AE: la linea sube desde atras de una mascara invisible
function maskLine(ctx, str, cx, y, size, p, o = {}) {
  if (p <= 0) return
  const e = eo(p)
  ctx.save()
  ctx.beginPath(); ctx.rect(0, y - size * 0.78, W, size * 1.56); ctx.clip()
  text(ctx, str, cx, y + size * 1.1 * (1 - e), { size, ...o })
  ctx.restore()
}

// ---------- atmosfera ----------
function bgBase(ctx, t) {
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, BG1); g.addColorStop(0.55, BG0); g.addColorStop(1, '#07070a')
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
  // halo central MUY sutil que respira (la "luz de estudio")
  const r = H * 0.62, a = 0.05 + 0.015 * Math.sin(t * 0.7)
  const rg = ctx.createRadialGradient(W / 2, H * 0.46, 0, W / 2, H * 0.46, r)
  rg.addColorStop(0, `rgba(200,255,77,${a})`); rg.addColorStop(0.55, 'rgba(120,140,120,0.03)'); rg.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H)
}
function grainVignette(ctx, t, strength = 1) {
  // grano de pelicula (campo por frame -> vive, alpha bajo -> elegante)
  const r = rng(1234 + Math.floor(t * FPS))
  ctx.save(); ctx.globalAlpha = 0.05 * strength; ctx.fillStyle = '#ffffff'
  for (let i = 0; i < 420; i++) { const x = r() * W, y = r() * H; ctx.fillRect(x, y, 2, 2) }
  ctx.restore()
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.36, W / 2, H / 2, H * 0.78)
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.5)')
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H)
}

// ---------- LA TARJETA (procedural) ----------
function roundedPath(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
}
// pose: {cx, cy, s, rot} · sweepT: fase del barrido de luz 0..1 · glow: intensidad del rim
function drawCard(ctx, pose, t, sweepT, glow = 1) {
  const CW = 640, CH = 404, R = 44
  ctx.save()
  ctx.translate(pose.cx, pose.cy); ctx.rotate(pose.rot || 0); ctx.scale(pose.s, pose.s)
  const x = -CW / 2, y = -CH / 2
  // sombra/piso: glow frio debajo
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 90; ctx.shadowOffsetY = 46
  roundedPath(ctx, x, y, CW, CH, R); ctx.fillStyle = '#0c0d11'; ctx.fill(); ctx.restore()
  // cuerpo titanio: gradiente vertical frio
  const body = ctx.createLinearGradient(0, y, 0, y + CH)
  body.addColorStop(0, '#2a2d36'); body.addColorStop(0.45, '#181a20'); body.addColorStop(1, '#0e0f13')
  roundedPath(ctx, x, y, CW, CH, R); ctx.fillStyle = body; ctx.fill()
  // barrido especular (diagonal) clipeado a la tarjeta + fantasma lima (aberracion sutil)
  ctx.save(); roundedPath(ctx, x, y, CW, CH, R); ctx.clip()
  const sx = lerp(x - CW * 0.7, x + CW * 1.3, sweepT)
  const sw = ctx.createLinearGradient(sx - 130, 0, sx + 130, 0)
  sw.addColorStop(0, 'rgba(255,255,255,0)'); sw.addColorStop(0.5, 'rgba(255,255,255,0.16)'); sw.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.save(); ctx.rotate(-0.32); ctx.fillStyle = sw; ctx.fillRect(x - CW, y - CH, CW * 3, CH * 3); ctx.restore()
  const sg = ctx.createLinearGradient(sx - 150, 0, sx - 90, 0)
  sg.addColorStop(0, 'rgba(200,255,77,0)'); sg.addColorStop(0.5, 'rgba(200,255,77,0.06)'); sg.addColorStop(1, 'rgba(200,255,77,0)')
  ctx.save(); ctx.rotate(-0.32); ctx.fillStyle = sg; ctx.fillRect(x - CW, y - CH, CW * 3, CH * 3); ctx.restore()
  // micro-textura brushed (lineas horizontales tenues)
  ctx.globalAlpha = 0.05
  for (let i = 0; i < 26; i++) { ctx.fillStyle = i % 2 ? '#ffffff' : '#000000'; ctx.fillRect(x, y + (i / 26) * CH, CW, 1) }
  ctx.globalAlpha = 1
  ctx.restore()
  // borde luminoso (rim light arriba, caida abajo)
  roundedPath(ctx, x + 1, y + 1, CW - 2, CH - 2, R - 1)
  const rim = ctx.createLinearGradient(0, y, 0, y + CH)
  rim.addColorStop(0, `rgba(255,255,255,${0.35 * glow})`); rim.addColorStop(0.25, 'rgba(255,255,255,0.07)'); rim.addColorStop(1, 'rgba(255,255,255,0.02)')
  ctx.strokeStyle = rim; ctx.lineWidth = 2; ctx.stroke()
  // chip (lima, la unica nota de color)
  const chx = x + 64, chy = y + 140
  roundedPath(ctx, chx, chy, 92, 68, 12)
  const chg = ctx.createLinearGradient(0, chy, 0, chy + 68)
  chg.addColorStop(0, '#d9ff7a'); chg.addColorStop(1, '#9fd530')
  ctx.fillStyle = chg; ctx.fill()
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1.4
  ctx.beginPath(); ctx.moveTo(chx + 30, chy + 6); ctx.lineTo(chx + 30, chy + 62); ctx.moveTo(chx + 62, chy + 6); ctx.lineTo(chx + 62, chy + 62); ctx.moveTo(chx + 6, chy + 34); ctx.lineTo(chx + 86, chy + 34); ctx.stroke()
  // NFC
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 3; ctx.lineCap = 'round'
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(chx + 150, chy + 34, 12 + i * 11, -0.6, 0.6); ctx.stroke() }
  // wordmark + numero
  text(ctx, 'NOVA', x + 64, y + 74, { size: 44, weight: 900, align: 'left', tr: 10, color: 'rgba(255,255,255,0.92)' })
  text(ctx, '••••  ••••  ••••  4021', x + 64, y + CH - 96, { size: 30, weight: 400, family: FM, align: 'left', color: 'rgba(255,255,255,0.55)', tr: 2 })
  text(ctx, 'J. OBREGON', x + 64, y + CH - 46, { size: 24, weight: 600, align: 'left', color: 'rgba(255,255,255,0.4)', tr: 6 })
  text(ctx, 'TITANIO', x + CW - 60, y + CH - 46, { size: 22, weight: 600, family: FM, align: 'right', color: 'rgba(200,255,77,0.8)', tr: 6 })
  ctx.restore()
}
// reflejo en el piso
function cardReflection(ctx, pose, t, sweepT) {
  ctx.save()
  ctx.translate(pose.cx, pose.cy + 404 * pose.s * 0.5 + 8)
  ctx.scale(1, -1)
  ctx.translate(-pose.cx, -(pose.cy - 404 * pose.s * 0.5) + 8)
  ctx.globalAlpha = 0.14
  drawCard(ctx, pose, t, sweepT, 0.4)
  ctx.restore()
  const fade = ctx.createLinearGradient(0, pose.cy + 404 * pose.s * 0.5, 0, pose.cy + 404 * pose.s * 1.35)
  fade.addColorStop(0, 'rgba(10,10,13,0)'); fade.addColorStop(1, BG0)
  ctx.fillStyle = fade; ctx.fillRect(0, pose.cy + 404 * pose.s * 0.5 - 4, W, 404 * pose.s)
}

// ---------- ESCENAS ----------
// S1 0.0-1.7 · apertura: linea de luz + wordmark chico (restraint)
function s1(ctx, t) {
  bgBase(ctx, t)
  const lp = eo(win(t, 0.15, 1.0))
  const lw = W * 0.5 * lp
  const grd = ctx.createLinearGradient(W / 2 - lw, 0, W / 2 + lw, 0)
  grd.addColorStop(0, 'rgba(200,255,77,0)'); grd.addColorStop(0.5, 'rgba(200,255,77,0.9)'); grd.addColorStop(1, 'rgba(200,255,77,0)')
  ctx.fillStyle = grd; ctx.fillRect(W / 2 - lw, H * 0.5 - 1, lw * 2, 2)
  text(ctx, 'N O V A', W / 2, H * 0.5 - 64, { size: 40, weight: 600, tr: 26, alpha: win(t, 0.55, 1.15), color: INK })
  text(ctx, 'MMXXVI', W / 2, H * 0.5 + 58, { size: 24, weight: 400, family: FM, tr: 14, alpha: win(t, 0.8, 1.4) * 0.5, color: DIM })
}
// S2 1.7-4.1 · statement kinetico con mask-reveal
function s2(ctx, t) {
  bgBase(ctx, t + 2)
  const lt = t - 1.7
  maskLine(ctx, 'Tu dinero', W / 2, H * 0.42, 150, win(lt, 0.0, 0.62), { weight: 900, tr: -3 })
  maskLine(ctx, 'se mueve', W / 2, H * 0.52, 150, win(lt, 0.16, 0.78), { weight: 900, tr: -3 })
  maskLine(ctx, 'rápido.', W / 2, H * 0.62, 150, win(lt, 0.32, 0.94), { weight: 900, tr: -3, color: LIME })
  text(ctx, 'TU TARJETA TAMBIÉN DEBERÍA', W / 2, H * 0.72, { size: 30, weight: 600, family: FM, tr: 8, alpha: win(lt, 1.15, 1.7) * 0.75, color: DIM })
}
// S3 4.1-7.0 · hero de LA TARJETA
function s3(ctx, t) {
  bgBase(ctx, t)
  const lt = t - 4.1
  const en = spring(win(lt, 0.05, 1.0), 0.6, 11)
  const idle = Math.sin(lt * 1.4) * 10
  const pose = { cx: W / 2, cy: H * 0.42 + (1 - en) * H * 0.5 + idle, s: 1.16, rot: -0.05 + Math.sin(lt * 0.9) * 0.012 }
  const sweep = win(lt, 0.9, 2.1)
  cardReflection(ctx, pose, t, sweep)
  drawCard(ctx, pose, t, sweep)
  text(ctx, 'CONOCÉ NOVA', W / 2, H * 0.735, { size: 32, weight: 600, family: FM, tr: 12, alpha: win(lt, 1.5, 2.0) * 0.85, color: DIM })
  maskLine(ctx, 'Titanio. Sin peso muerto.', W / 2, H * 0.795, 52, win(lt, 1.7, 2.3), { weight: 600 })
}
// S4 7.0-9.2 · punch "0%"
function s4(ctx, t) {
  bgBase(ctx, t)
  const lt = t - 7.0
  const e = spring(win(lt, 0.05, 0.75), 0.5, 12)
  ctx.save()
  ctx.translate(W / 2, H * 0.46)
  ctx.scale(0.7 + 0.3 * e, 0.7 + 0.3 * e)
  text(ctx, '0%', 0, 0, { size: 520, weight: 900, tr: -14, alpha: clamp(e * 1.6, 0, 1), color: LIME })
  ctx.restore()
  // anillo dashed que se traza alrededor
  const rp = eo(win(lt, 0.5, 1.5))
  if (rp > 0) {
    ctx.save(); ctx.strokeStyle = 'rgba(242,240,234,0.3)'; ctx.lineWidth = 2; ctx.setLineDash([3, 14])
    ctx.beginPath(); ctx.arc(W / 2, H * 0.46, 400, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * rp); ctx.stroke(); ctx.restore()
  }
  maskLine(ctx, 'comisiones.', W / 2, H * 0.685, 96, win(lt, 0.55, 1.15), { weight: 900 })
  maskLine(ctx, 'para siempre.', W / 2, H * 0.745, 60, win(lt, 0.8, 1.4), { weight: 600, color: DIM })
}
// S5 9.2-11.1 · rafaga de placas B/N al beat (montaje de marca)
function s5(ctx, t) {
  const lt = t - 9.2
  const CUT = 0.633                                             // ~beat a 95bpm
  const i = Math.min(2, Math.floor(lt / CUT))
  const cutT = lt - i * CUT
  const dark = i % 2 === 0
  ctx.fillStyle = dark ? BG0 : PAPER; ctx.fillRect(0, 0, W, H)
  if (cutT < 0.066) { ctx.fillStyle = dark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.14)'; ctx.fillRect(0, 0, W, H) }   // flash de 2 frames
  const words = ['Sin letra chica.', 'Sin sorpresas.', 'Sin esperas.']
  const e = spring(win(cutT, 0.02, 0.42), 0.62, 15)
  ctx.save()
  ctx.translate(W / 2, H * 0.5)
  ctx.scale(0.94 + 0.06 * e, 0.94 + 0.06 * e)
  text(ctx, words[i], 0, 0, { size: 116, weight: 900, tr: -2, color: dark ? INK : '#111114', alpha: clamp(e * 2, 0, 1) })
  ctx.restore()
  text(ctx, `0${i + 1} / 03`, W / 2, H * 0.5 + 130, { size: 26, weight: 400, family: FM, tr: 8, color: dark ? DIM : 'rgba(17,17,20,0.45)', alpha: win(cutT, 0.15, 0.4) })
}
// S6 11.1-13.4 · macro diagonal de la tarjeta + specs
function s6(ctx, t) {
  bgBase(ctx, t)
  const lt = t - 11.1
  const drift = eo(win(lt, 0, 2.3))
  const pose = { cx: W * 0.6 - drift * 60, cy: H * 0.38 + drift * 30, s: 2.35, rot: -0.42 }
  drawCard(ctx, pose, t, win(lt, 0.35, 1.5))
  // panel de specs estilo keynote
  const sp = win(lt, 0.7, 1.35)
  const items = [['TITANIO G5', 'cuerpo'], ['12 g', 'peso'], ['NFC + chip', 'contacto']]
  items.forEach(([v, k], i) => {
    const p = win(sp, i * 0.18, i * 0.18 + 0.6)
    const y = H * 0.66 + i * 118
    const e = eo(p)
    ctx.save(); ctx.globalAlpha = clamp(p * 1.8, 0, 1)
    ctx.fillStyle = 'rgba(200,255,77,0.9)'; ctx.fillRect(W * 0.14, y - 2, 34 * e, 3)
    text(ctx, v, W * 0.14 + 56 * 1, y - 16, { size: 54, weight: 900, align: 'left', tr: 0, alpha: 1 })
    text(ctx, k.toUpperCase(), W * 0.14 + 56, y + 34, { size: 24, weight: 400, family: FM, align: 'left', tr: 6, color: DIM })
    ctx.restore()
  })
}
// S7 13.4-16.0 · cierre: wordmark grande + CTA
function s7(ctx, t) {
  bgBase(ctx, t)
  const lt = t - 13.4
  const lp = eo(win(lt, 0.05, 0.7))
  const lw = W * 0.36 * lp
  const grd = ctx.createLinearGradient(W / 2 - lw, 0, W / 2 + lw, 0)
  grd.addColorStop(0, 'rgba(200,255,77,0)'); grd.addColorStop(0.5, 'rgba(200,255,77,0.9)'); grd.addColorStop(1, 'rgba(200,255,77,0)')
  ctx.fillStyle = grd; ctx.fillRect(W / 2 - lw, H * 0.36 - 1, lw * 2, 2)
  maskLine(ctx, 'NOVA', W / 2, H * 0.45, 220, win(lt, 0.2, 0.9), { weight: 900, tr: 6 })
  text(ctx, 'LA TARJETA QUE VA PRIMERO', W / 2, H * 0.54, { size: 30, weight: 600, family: FM, tr: 10, alpha: win(lt, 0.7, 1.2) * 0.8, color: DIM })
  // CTA pill con halo
  const cp = spring(win(lt, 0.9, 1.6), 0.55, 12)
  if (cp > 0) {
    const bw = 380, bh = 108, cy = H * 0.66
    ctx.save()
    ctx.translate(W / 2, cy); ctx.scale(0.85 + 0.15 * cp, 0.85 + 0.15 * cp)
    const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, 260)
    halo.addColorStop(0, `rgba(200,255,77,${0.15 + 0.04 * Math.sin(lt * 2)})`); halo.addColorStop(1, 'rgba(200,255,77,0)')
    ctx.globalAlpha = clamp(cp * 1.5, 0, 1)
    ctx.fillStyle = halo; ctx.fillRect(-340, -340, 680, 680)
    roundedPath(ctx, -bw / 2, -bh / 2, bw, bh, bh / 2)
    const bg = ctx.createLinearGradient(0, -bh / 2, 0, bh / 2)
    bg.addColorStop(0, '#d6ff85'); bg.addColorStop(1, '#b7ef39')
    ctx.fillStyle = bg; ctx.fill()
    text(ctx, 'Pedila hoy', 0, 3, { size: 44, weight: 900, color: '#0c0e07' })
    ctx.restore()
  }
  text(ctx, 'SIN COMISIONES · SIN LETRA CHICA · ARGENTINA 2026', W / 2, H * 0.80, { size: 22, weight: 400, family: FM, tr: 4, alpha: win(lt, 1.5, 2.1) * 0.45, color: DIM })
}

// ---------- compositor con transiciones ----------
const SCENES = [
  { at: 0.0, end: 1.7, fn: s1 },
  { at: 1.7, end: 4.1, fn: s2 },
  { at: 4.1, end: 7.0, fn: s3 },
  { at: 7.0, end: 9.2, fn: s4 },
  { at: 9.2, end: 11.1, fn: s5 },
  { at: 11.1, end: 13.4, fn: s6 },
  { at: 13.4, end: 16.0, fn: s7 },
]
export function drawFrame(ctx, t) {
  t = clamp(t, 0, DUR - 0.001)
  ctx.save()
  ctx.fillStyle = BG0; ctx.fillRect(0, 0, W, H)
  let idx = SCENES.length - 1
  for (let i = 0; i < SCENES.length; i++) if (t >= SCENES[i].at && t < SCENES[i].end) { idx = i; break }
  const sc = SCENES[idx]
  sc.fn(ctx, t)
  // dip-to-black cortito en cada frontera (excepto la rafaga S5, que corta seco)
  const XD = 0.14
  if (idx > 0 && idx !== 4 && t - sc.at < XD) { ctx.fillStyle = BG0; ctx.globalAlpha = 1 - eo((t - sc.at) / XD); ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1 }
  if (idx < SCENES.length - 1 && idx !== 3 && sc.end - t < XD) { ctx.fillStyle = BG0; ctx.globalAlpha = 1 - eo((sc.end - t) / XD); ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1 }
  grainVignette(ctx, t, idx === 4 ? 0.5 : 1)
  ctx.restore()
}
