// urvid 1.0 · biblioteca DATAKIT — data-viz animada y legible. render(ctx, t, env).
// env = { pal, content, fonts, seed, energy, sceneDur }. Puro + determinista (mulberry32(env.seed) para los
// VALORES de datos estables, t para la animacion de entrada). REGLA DURA: numeros en MONO via fonts.accent;
// en claro el numero va en TINTA (pal.ink) y el acento queda para la barra/regla/arco; en oscuro el numero
// puede ir en inkText. Acento = DECO (barra que se llena, arco, estrella). Sin Math.random/Date.now.
import { register } from '../../core/registry.js'
import { mulberry32, seedFor, range } from '../../core/prng.js'
import { drawText } from '../../core/text.js'
import { W, H, TAU, clamp, inv, lerp, eOutCubic, eOutExpo, spring, rgba, lighten } from '../../core/util.js'

// ---- helpers locales (puros) ----
// formatea un numero entero con separador de miles (es-AR: punto) y sufijo opcional (% / k / etc).
function fmtInt(v, sep = '.') {
  const s = String(Math.round(v))
  let out = ''
  for (let i = 0; i < s.length; i++) { if (i > 0 && (s.length - i) % 3 === 0) out += sep; out += s[i] }
  return out
}
// numero animado: cuenta de 0 -> target con easing, devuelve el valor actual (determina por t).
function countTo(target, t, t0, t1) { return target * eOutExpo(inv(t, t0, t1)) }
// color del NUMERO segun tono: claro -> tinta; oscuro -> inkText (acento-como-texto, legible).
function numColor(pal) { return pal.tone === 'light' ? pal.ink : pal.inkText }

// ====================================================================== numeros-animados
register({
  id: 'data.number.bigcount', lib: 'datakit', category: 'numeros-animados', tones: ['dark', 'light'], rubros: ['*'], weight: 1.3,
  tags: ['hero', 'stat', 'mono'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env, r = seedFor(env.seed, 'data')
    const cx = W / 2, cy = H * 0.44
    // valor estable derivado de la semilla (3 a 5 cifras -> impacto)
    const target = Math.round(range(r, 1200, 98000))
    const val = countTo(target, t, 0.1, 1.2)
    const sufijo = pick(r, ['+', 'k', '', ''])
    // numero grande en mono, color por tono
    drawText(ctx, fmtInt(val) + sufijo, cx, cy, {
      size: 92, weight: 700, family: fonts.accent, maxW: W * 0.88, color: numColor(pal),
      shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.35)' : null,
    })
    // regla de acento que crece bajo el numero (DECO)
    const ru = eOutCubic(inv(t, 0.5, 1.2)), rw = 96 * ru
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(cx - rw / 2, cy + 58, rw, 6, 3); ctx.fill()
    // etiqueta (claim/tagline) debajo, en dim
    const label = content.claim || content.tagline || content.brand || ''
    if (label) drawText(ctx, label, cx, cy + 94, { size: 22, weight: 600, family: fonts.text, maxW: W * 0.78, color: pal.dim, alpha: inv(t, 0.7, 1.2) })
  },
})

register({
  id: 'data.number.statgrid', lib: 'datakit', category: 'numeros-animados', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['stats', 'kpi', 'mono'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env, r = seedFor(env.seed, 'data')
    // 3 KPIs apilados: numero mono + etiqueta corta. Valores estables, sufijos variados.
    const rows = 3, top = H * 0.26, gap = H * 0.17
    const units = ['%', 'k', '+']
    const labels = [content.tagline, content.claim, content.cta].map(s => (s || '').split(' ').slice(0, 3).join(' '))
    for (let i = 0; i < rows; i++) {
      const y = top + i * gap
      const ap = inv(t, 0.1 + i * 0.18, 0.7 + i * 0.18)
      const tgt = i === 0 ? range(r, 12, 98) : range(r, 120, 9800)
      const val = tgt * eOutExpo(ap)
      ctx.save(); ctx.globalAlpha = ap
      // tick de acento a la izquierda (DECO)
      ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(W * 0.12, y - 18, 5, 36 * Math.min(1, ap * 1.3), 2.5); ctx.fill()
      drawText(ctx, fmtInt(val) + units[i], W * 0.2, y, { size: 46, weight: 700, family: fonts.accent, align: 'left', maxW: W * 0.44, color: numColor(pal) })
      const lab = labels[i] || ['Crecimiento', 'Usuarios', 'Resultados'][i]
      drawText(ctx, lab, W * 0.66, y, { size: 18, weight: 600, family: fonts.text, align: 'left', maxW: W * 0.26, color: pal.dim })
      ctx.restore()
    }
  },
})

// ====================================================================== barras
register({
  id: 'data.bars.hfill', lib: 'datakit', category: 'barras', tones: ['dark', 'light'], rubros: ['*'], weight: 1.2,
  tags: ['barras', 'ranking'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env, r = seedFor(env.seed, 'data')
    const n = 4, top = H * 0.28, gap = H * 0.11, x0 = W * 0.12, bw = W * 0.76, bh = 16
    const labels = [content.brand, content.tagline, content.claim, content.cta]
    // valores ordenados desc (ranking) -> lectura clara
    const raw = Array.from({ length: n }, () => range(r, 0.32, 1)).sort((a, b) => b - a)
    for (let i = 0; i < n; i++) {
      const y = top + i * gap
      const ap = eOutCubic(inv(t, 0.1 + i * 0.12, 0.9 + i * 0.12))
      // etiqueta
      const lab = (labels[i] || ['Plan A', 'Plan B', 'Plan C', 'Plan D'][i] || '').split(' ').slice(0, 2).join(' ')
      drawText(ctx, lab, x0, y - 14, { size: 15, weight: 600, family: fonts.text, align: 'left', maxW: bw * 0.7, color: pal.dim, alpha: ap })
      // riel
      ctx.fillStyle = rgba(pal.tone === 'light' ? '#000' : '#fff', 0.07)
      ctx.beginPath(); ctx.roundRect(x0, y, bw, bh, bh / 2); ctx.fill()
      // relleno de acento (el de arriba en accent, los demas atenuados -> jerarquia)
      const fillW = bw * raw[i] * ap
      ctx.fillStyle = i === 0 ? pal.accent : rgba(pal.accent, 0.55)
      ctx.beginPath(); ctx.roundRect(x0, y, Math.max(bh, fillW), bh, bh / 2); ctx.fill()
      // valor % al final del riel, en mono tinta
      drawText(ctx, Math.round(raw[i] * 100 * ap) + '%', x0 + bw + 4, y + bh / 2, { size: 15, weight: 700, family: fonts.accent, align: 'left', maxW: W * 0.1, color: numColor(pal), alpha: ap })
    }
  },
})

register({
  id: 'data.bars.vgroup', lib: 'datakit', category: 'barras', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['barras', 'columnas', 'serie'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env, r = seedFor(env.seed, 'data')
    const n = 6, base = H * 0.7, maxH = H * 0.4, x0 = W * 0.14, span = W * 0.72
    const slot = span / n, bw = slot * 0.56
    const vals = Array.from({ length: n }, () => range(r, 0.28, 1))
    // linea base
    ctx.strokeStyle = rgba(pal.tone === 'light' ? '#000' : '#fff', 0.12); ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(x0, base + 1); ctx.lineTo(x0 + span, base + 1); ctx.stroke()
    let peak = 0; for (let i = 0; i < n; i++) if (vals[i] > vals[peak]) peak = i
    for (let i = 0; i < n; i++) {
      const ap = eOutBack01(inv(t, 0.1 + i * 0.08, 0.7 + i * 0.08))
      const bx = x0 + i * slot + (slot - bw) / 2
      const bhh = maxH * vals[i] * ap
      ctx.fillStyle = i === peak ? pal.accent : rgba(pal.accent, 0.45)
      ctx.beginPath(); ctx.roundRect(bx, base - bhh, bw, bhh, [6, 6, 0, 0]); ctx.fill()
    }
    // valor pico encima de su columna
    const apk = inv(t, 0.7, 1.1)
    if (apk > 0) {
      const bx = x0 + peak * slot + slot / 2
      drawText(ctx, Math.round(vals[peak] * 100) + '%', bx, base - maxH * vals[peak] - 16, { size: 18, weight: 700, family: fonts.accent, maxW: slot * 1.4, color: numColor(pal), alpha: apk })
    }
    // titulo
    const ti = content.tagline || content.claim
    if (ti) drawText(ctx, ti, W / 2, H * 0.2, { size: 22, weight: 700, family: fonts.display, maxW: W * 0.8, color: pal.ink, alpha: inv(t, 0.2, 0.7) })
  },
})

// ====================================================================== anillos / radiales
register({
  id: 'data.ring.gauge', lib: 'datakit', category: 'anillos/radiales', tones: ['dark', 'light'], rubros: ['*'], weight: 1.2,
  tags: ['gauge', 'porcentaje', 'anillo'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env, r = seedFor(env.seed, 'data')
    const cx = W / 2, cy = H * 0.42, rad = W * 0.3, lw = 18
    const pct = range(r, 0.42, 0.96)
    const ap = eOutCubic(inv(t, 0.1, 1.2))
    const sweep = TAU * pct * ap
    const start = -TAU / 4
    // riel
    ctx.lineCap = 'round'; ctx.lineWidth = lw
    ctx.strokeStyle = rgba(pal.tone === 'light' ? '#000' : '#fff', 0.08)
    ctx.beginPath(); ctx.arc(cx, cy, rad, 0, TAU); ctx.stroke()
    // arco de acento
    ctx.strokeStyle = pal.accent
    ctx.beginPath(); ctx.arc(cx, cy, rad, start, start + sweep); ctx.stroke()
    // punto cabeza
    const hx = cx + Math.cos(start + sweep) * rad, hy = cy + Math.sin(start + sweep) * rad
    ctx.fillStyle = lighten(pal.accent, 0.25); ctx.beginPath(); ctx.arc(hx, hy, lw * 0.42, 0, TAU); ctx.fill()
    // numero centrado en mono
    drawText(ctx, Math.round(pct * 100 * ap) + '%', cx, cy - 2, { size: 56, weight: 700, family: fonts.accent, maxW: rad * 1.5, color: numColor(pal) })
    // etiqueta debajo
    const lab = content.tagline || content.claim
    if (lab) drawText(ctx, lab, cx, cy + rad + 44, { size: 20, weight: 600, family: fonts.text, maxW: W * 0.74, color: pal.dim, alpha: inv(t, 0.7, 1.2) })
  },
})

register({
  id: 'data.ring.segments', lib: 'datakit', category: 'anillos/radiales', tones: ['dark', 'light'], rubros: ['*'], weight: 0.9,
  tags: ['donut', 'proporcion', 'anillo'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env, r = seedFor(env.seed, 'data')
    const cx = W / 2, cy = H * 0.42, rad = W * 0.28, lw = 26
    // 3 segmentos que reparten 360 (proporcion). Colores: accent, accent2, atenuado.
    let parts = [range(r, 0.3, 0.55), range(r, 0.2, 0.4), range(r, 0.1, 0.25)]
    const sum = parts.reduce((a, b) => a + b, 0); parts = parts.map(p => p / sum)
    const cols = [pal.accent, pal.accent2, rgba(pal.tone === 'light' ? '#000' : '#fff', 0.18)]
    const ap = eOutCubic(inv(t, 0.1, 1.1)), gap = 0.03
    let ang = -TAU / 4
    ctx.lineCap = 'butt'; ctx.lineWidth = lw
    for (let i = 0; i < parts.length; i++) {
      const seg = TAU * parts[i] * ap
      ctx.strokeStyle = cols[i]
      ctx.beginPath(); ctx.arc(cx, cy, rad, ang + gap, ang + Math.max(gap + 0.001, seg - gap)); ctx.stroke()
      ang += seg
    }
    // numero central = primer segmento en %
    drawText(ctx, Math.round(parts[0] * 100 * ap) + '%', cx, cy, { size: 48, weight: 700, family: fonts.accent, maxW: rad * 1.4, color: numColor(pal) })
    const lab = content.tagline || content.claim
    if (lab) drawText(ctx, lab, cx, cy + rad + 48, { size: 19, weight: 600, family: fonts.text, maxW: W * 0.72, color: pal.dim, alpha: inv(t, 0.7, 1.2) })
  },
})

// ====================================================================== series / tendencia
register({
  id: 'data.series.sparkline', lib: 'datakit', category: 'series/tendencia', tones: ['dark', 'light'], rubros: ['*'], weight: 1.1,
  tags: ['sparkline', 'serie', 'tendencia'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env, r = seedFor(env.seed, 'data')
    const n = 14, x0 = W * 0.12, x1 = W * 0.88, yTop = H * 0.32, yBot = H * 0.58
    // serie con tendencia ascendente + ruido estable
    const pts = []
    for (let i = 0; i < n; i++) {
      const tr = i / (n - 1)
      const v = clamp(0.18 + tr * 0.6 + (r() - 0.5) * 0.22, 0.04, 1)
      pts.push({ x: lerp(x0, x1, tr), y: lerp(yBot, yTop, v), v })
    }
    const draw = eOutCubic(inv(t, 0.1, 1.3))   // dibuja-on progresivo
    const shown = clamp(draw * (n - 1), 0, n - 1)
    // area bajo la curva (acento tenue)
    ctx.save(); ctx.beginPath(); ctx.moveTo(pts[0].x, yBot + 1)
    let li = 0
    for (let i = 0; i <= shown; i++) { ctx.lineTo(pts[i].x, pts[i].y); li = i }
    const fr = shown - li
    if (li < n - 1) { ctx.lineTo(lerp(pts[li].x, pts[li + 1].x, fr), lerp(pts[li].y, pts[li + 1].y, fr)) }
    ctx.lineTo(li + fr >= 0 ? lerp(pts[li].x, pts[Math.min(n - 1, li + 1)].x, fr) : pts[0].x, yBot + 1)
    ctx.closePath()
    const ag = ctx.createLinearGradient(0, yTop, 0, yBot)
    ag.addColorStop(0, rgba(pal.accent, 0.28)); ag.addColorStop(1, rgba(pal.accent, 0))
    ctx.fillStyle = ag; ctx.fill(); ctx.restore()
    // linea
    ctx.strokeStyle = pal.accent; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i <= shown; i++) ctx.lineTo(pts[i].x, pts[i].y)
    if (li < n - 1) ctx.lineTo(lerp(pts[li].x, pts[li + 1].x, fr), lerp(pts[li].y, pts[li + 1].y, fr))
    ctx.stroke()
    // punto cabeza
    const hx = li < n - 1 ? lerp(pts[li].x, pts[li + 1].x, fr) : pts[n - 1].x
    const hy = li < n - 1 ? lerp(pts[li].y, pts[li + 1].y, fr) : pts[n - 1].y
    ctx.fillStyle = lighten(pal.accent, 0.3); ctx.beginPath(); ctx.arc(hx, hy, 5, 0, TAU); ctx.fill()
    // delta % arriba
    const delta = Math.round((pts[n - 1].v - pts[0].v) * 100)
    drawText(ctx, '+' + Math.abs(delta) + '%', W / 2, H * 0.22, { size: 40, weight: 700, family: fonts.accent, maxW: W * 0.5, color: numColor(pal), alpha: inv(t, 0.4, 1) })
    const lab = content.tagline || content.claim
    if (lab) drawText(ctx, lab, W / 2, H * 0.66, { size: 19, weight: 600, family: fonts.text, maxW: W * 0.74, color: pal.dim, alpha: inv(t, 0.7, 1.2) })
  },
})

// ====================================================================== comparacion / proporcion
register({
  id: 'data.compare.duo', lib: 'datakit', category: 'comparacion/proporcion', tones: ['dark', 'light'], rubros: ['*'], weight: 1.1,
  tags: ['comparacion', 'antes-despues', 'barras'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env, r = seedFor(env.seed, 'data')
    // dos columnas: "antes" (atenuado) vs "despues" (acento, mas alto) -> mejora visible
    const base = H * 0.66, maxH = H * 0.36, bw = W * 0.22
    const xA = W * 0.3, xB = W * 0.7
    const vA = range(r, 0.3, 0.5), vB = range(r, 0.72, 1)
    const apA = eOutBack01(inv(t, 0.15, 0.8)), apB = eOutBack01(inv(t, 0.35, 1.1))
    // base line
    ctx.strokeStyle = rgba(pal.tone === 'light' ? '#000' : '#fff', 0.12); ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(W * 0.14, base + 1); ctx.lineTo(W * 0.86, base + 1); ctx.stroke()
    // A
    const hA = maxH * vA * apA
    ctx.fillStyle = rgba(pal.accent, 0.4); ctx.beginPath(); ctx.roundRect(xA - bw / 2, base - hA, bw, hA, [8, 8, 0, 0]); ctx.fill()
    // B
    const hB = maxH * vB * apB
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(xB - bw / 2, base - hB, bw, hB, [8, 8, 0, 0]); ctx.fill()
    // valores
    drawText(ctx, Math.round(vA * 100 * apA) + '%', xA, base - hA - 18, { size: 22, weight: 700, family: fonts.accent, maxW: bw * 1.6, color: pal.dim, alpha: apA })
    drawText(ctx, Math.round(vB * 100 * apB) + '%', xB, base - hB - 18, { size: 26, weight: 700, family: fonts.accent, maxW: bw * 1.6, color: numColor(pal), alpha: apB })
    // etiquetas bajo cada barra
    drawText(ctx, 'Antes', xA, base + 22, { size: 16, weight: 600, family: fonts.text, maxW: bw * 1.4, color: pal.dim, alpha: apA })
    drawText(ctx, content.cta ? content.cta.split(' ').slice(0, 2).join(' ') : 'Despues', xB, base + 22, { size: 16, weight: 700, family: fonts.text, maxW: bw * 1.6, color: numColor(pal), alpha: apB })
    // titulo
    const ti = content.tagline || content.claim
    if (ti) drawText(ctx, ti, W / 2, H * 0.2, { size: 22, weight: 700, family: fonts.display, maxW: W * 0.8, color: pal.ink, alpha: inv(t, 0.2, 0.7) })
  },
})

register({
  id: 'data.compare.split', lib: 'datakit', category: 'comparacion/proporcion', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['proporcion', 'split', 'share'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env, r = seedFor(env.seed, 'data')
    // barra unica partida en 2 proporciones (market share). accent vs atenuado.
    const x0 = W * 0.12, bw = W * 0.76, y = H * 0.46, bh = 40
    const share = range(r, 0.55, 0.82)
    const ap = eOutExpo(inv(t, 0.1, 1))
    const cut = bw * share * ap + bw * (1 - ap) * 0.5
    // fondo (la otra parte)
    ctx.fillStyle = rgba(pal.tone === 'light' ? '#000' : '#fff', 0.1)
    ctx.beginPath(); ctx.roundRect(x0, y, bw, bh, bh / 2); ctx.fill()
    // parte de acento (clip a la barra redondeada)
    ctx.save(); ctx.beginPath(); ctx.roundRect(x0, y, bw, bh, bh / 2); ctx.clip()
    ctx.fillStyle = pal.accent; ctx.fillRect(x0, y, cut, bh)
    ctx.restore()
    // separador
    ctx.strokeStyle = pal.bg0; ctx.lineWidth = 3
    ctx.beginPath(); ctx.moveTo(x0 + cut, y - 2); ctx.lineTo(x0 + cut, y + bh + 2); ctx.stroke()
    // % grande de la parte de acento
    drawText(ctx, Math.round(share * 100 * ap) + '%', x0 + bw * 0.5, y - 44, { size: 56, weight: 700, family: fonts.accent, maxW: bw, color: numColor(pal), alpha: inv(t, 0.3, 0.9) })
    // etiqueta de cada lado
    drawText(ctx, (content.brand || 'Nosotros'), x0 + 6, y + bh + 22, { size: 16, weight: 700, family: fonts.text, align: 'left', maxW: bw * 0.5, color: numColor(pal), alpha: ap })
    drawText(ctx, 'Resto', x0 + bw - 6, y + bh + 22, { size: 16, weight: 600, family: fonts.text, align: 'right', maxW: bw * 0.4, color: pal.dim, alpha: ap })
  },
})

// ====================================================================== rating / prueba social
register({
  id: 'data.rating.stars', lib: 'datakit', category: 'rating/prueba-social', tones: ['dark', 'light'], rubros: ['*'], weight: 1.1,
  tags: ['rating', 'estrellas', 'review'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env, r = seedFor(env.seed, 'data')
    const cx = W / 2, cy = H * 0.42
    const score = range(r, 4.2, 5)            // rating alto (prueba social)
    const filled = score                       // 0..5
    const n = 5, gap = W * 0.13, sr = W * 0.05
    const totalW = (n - 1) * gap
    for (let i = 0; i < n; i++) {
      const sx = cx - totalW / 2 + i * gap
      const ap = spring(inv(t, 0.15 + i * 0.1, 0.85 + i * 0.1), { zeta: 0.45, freq: 2.2 })
      const frac = clamp(filled - i, 0, 1)
      ctx.save(); ctx.translate(sx, cy); ctx.scale(0.6 + 0.4 * ap, 0.6 + 0.4 * ap)
      // estrella vacia (contorno)
      starPath(ctx, sr); ctx.strokeStyle = rgba(pal.tone === 'light' ? '#000' : '#fff', 0.18); ctx.lineWidth = 2; ctx.stroke()
      // relleno parcial (clip vertical-izq segun frac) en acento
      if (frac > 0) {
        ctx.save(); ctx.beginPath(); ctx.rect(-sr * 1.3, -sr * 1.3, sr * 2.6 * frac, sr * 2.6); ctx.clip()
        starPath(ctx, sr); ctx.fillStyle = pal.accent; ctx.fill(); ctx.restore()
      }
      ctx.restore()
    }
    // numero del rating en mono
    drawText(ctx, score.toFixed(1), cx, cy + sr + 56, { size: 52, weight: 700, family: fonts.accent, maxW: W * 0.5, color: numColor(pal), alpha: inv(t, 0.6, 1.1) })
    const lab = content.tagline || content.claim || 'sobre 5 estrellas'
    drawText(ctx, lab, cx, cy + sr + 98, { size: 18, weight: 600, family: fonts.text, maxW: W * 0.78, color: pal.dim, alpha: inv(t, 0.8, 1.3) })
  },
})

// ---- helpers de forma / pick / easing local (puros) ----
function pick(prng, arr) { return arr[(prng() * arr.length) | 0] }
function eOutBack01(t) { t = clamp(t, 0, 1); const s = 1.7; return 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2) }
// estrella de 5 puntas centrada en (0,0), radio externo R (radio interno = 0.42 R)
function starPath(ctx, R) {
  const ri = R * 0.42
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const ang = -TAU / 4 + i * TAU / 10
    const rad = i % 2 === 0 ? R : ri
    const x = Math.cos(ang) * rad, y = Math.sin(ang) * rad
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
  }
  ctx.closePath()
}
