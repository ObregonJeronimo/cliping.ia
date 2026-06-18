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

// =====================================================================================================
// =================================== OLA 2 — categorias faltantes =====================================
// =====================================================================================================
// Helpers locales extra (puros). hairline = color de riel/regla segun tono (negro tenue en claro, blanco
// tenue en oscuro). En claro el NUMERO siempre va en tinta (numColor); el acento queda para barra/arco/regla.

function hairline(pal, a = 0.1) { return rgba(pal.tone === 'light' ? '#000' : '#fff', a) }
// toma palabras de un texto de contenido, recorta a `n` palabras (etiqueta corta y prolija)
function shortLabel(s, n = 2) { return (s || '').replace(/\s+/g, ' ').trim().split(' ').slice(0, n).join(' ') }
// tilde (check) centrado en (0,0), tamano s. Trazo ya seteado por el caller.
function checkPath(ctx, s) {
  ctx.beginPath()
  ctx.moveTo(-s * 0.42, s * 0.02); ctx.lineTo(-s * 0.1, s * 0.36); ctx.lineTo(s * 0.46, -s * 0.34)
}

// ====================================================================== timeline / proceso
register({
  id: 'data.timeline.steps', lib: 'datakit', category: 'timeline/proceso', tones: ['dark', 'light'], rubros: ['*'], weight: 1.2,
  tags: ['timeline', 'pasos', 'proceso'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env, r = seedFor(env.seed, 'data')
    // 4 pasos verticales conectados por una linea que se "dibuja"; el nodo activo avanza con t.
    const n = 4, x = W * 0.2, top = H * 0.2, gap = H * 0.16, nodeR = 16
    const yEnd = top + (n - 1) * gap
    const labels = [content.brand, content.tagline, content.claim, content.cta]
    const defLab = ['Importas', 'Generamos', 'Probamos', 'Afinamos']
    // linea conectora (riel + progreso de acento)
    ctx.lineCap = 'round'; ctx.lineWidth = 4
    ctx.strokeStyle = hairline(pal, 0.12)
    ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, yEnd); ctx.stroke()
    const prog = eOutCubic(inv(t, 0.1, 1.1))
    ctx.strokeStyle = pal.accent
    ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, lerp(top, yEnd, prog)); ctx.stroke()
    for (let i = 0; i < n; i++) {
      const y = top + i * gap
      const reach = inv(prog, i / (n - 1) - 0.02, i / (n - 1) + 0.12)   // 0..1 cuando el progreso pasa el nodo
      const ap = eOutBack01(reach)
      // nodo: relleno de acento si alcanzado, anillo si no
      ctx.save(); ctx.translate(x, y)
      ctx.fillStyle = pal.bg0; ctx.beginPath(); ctx.arc(0, 0, nodeR, 0, TAU); ctx.fill()
      ctx.lineWidth = 3; ctx.strokeStyle = reach > 0.5 ? pal.accent : hairline(pal, 0.25)
      ctx.beginPath(); ctx.arc(0, 0, nodeR, 0, TAU); ctx.stroke()
      if (reach > 0.5) {
        // tilde en los completados, numero en el activo (ultimo alcanzado)
        const isLast = i === Math.min(n - 1, Math.floor(prog * (n - 1) + 0.0001))
        if (isLast && prog < 0.999) {
          drawText(ctx, String(i + 1), 0, 1, { size: 16, weight: 700, family: fonts.accent, maxW: nodeR * 1.6, color: numColor(pal) })
        } else {
          ctx.strokeStyle = pal.accent; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.lineCap = 'round'
          checkPath(ctx, nodeR * 0.85); ctx.stroke()
        }
      } else {
        drawText(ctx, String(i + 1), 0, 1, { size: 15, weight: 700, family: fonts.accent, maxW: nodeR * 1.6, color: pal.dim })
      }
      ctx.restore()
      // etiqueta a la derecha del nodo
      const lab = shortLabel(labels[i], 2) || defLab[i]
      drawText(ctx, lab, x + nodeR + 18, y, { size: 19, weight: 600, family: fonts.text, align: 'left', maxW: W - (x + nodeR + 18) - W * 0.08, color: reach > 0.5 ? pal.ink : pal.dim, alpha: clamp(0.35 + ap * 0.65, 0, 1) })
    }
  },
})

register({
  id: 'data.timeline.flowh', lib: 'datakit', category: 'timeline/proceso', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['proceso', 'flujo', 'horizontal'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env, r = seedFor(env.seed, 'data')
    // 3 etapas horizontales, chips conectados por flechas; cada chip aparece en secuencia.
    const n = 3, cy = H * 0.46, x0 = W * 0.1, x1 = W * 0.9, span = x1 - x0
    const slot = span / n, chipW = slot * 0.78, chipH = 86
    const labels = [content.brand, content.claim, content.cta].map(s => shortLabel(s, 2))
    const def = ['Captas', 'Lanzas', 'Cerras']
    const titulo = content.tagline || ''
    if (titulo) drawText(ctx, titulo, W / 2, H * 0.24, { size: 22, weight: 700, family: fonts.display, maxW: W * 0.84, color: pal.ink, alpha: inv(t, 0.15, 0.6) })
    for (let i = 0; i < n; i++) {
      const ap = spring(inv(t, 0.15 + i * 0.22, 0.85 + i * 0.22), { zeta: 0.5, freq: 2 })
      const cx = x0 + i * slot + slot / 2
      // flecha conectora hacia el siguiente
      if (i < n - 1) {
        const aArrow = inv(t, 0.35 + i * 0.22, 0.75 + i * 0.22)
        const ax0 = cx + chipW / 2 + 4, ax1 = cx + slot - chipW / 2 - 4
        const axe = lerp(ax0, ax1, eOutCubic(aArrow))
        ctx.strokeStyle = rgba(pal.accent, 0.7); ctx.lineWidth = 3; ctx.lineCap = 'round'
        ctx.beginPath(); ctx.moveTo(ax0, cy); ctx.lineTo(axe, cy); ctx.stroke()
        if (aArrow > 0.6) { ctx.fillStyle = rgba(pal.accent, 0.7); ctx.beginPath(); ctx.moveTo(axe, cy); ctx.lineTo(axe - 8, cy - 5); ctx.lineTo(axe - 8, cy + 5); ctx.closePath(); ctx.fill() }
      }
      ctx.save(); ctx.globalAlpha = clamp(ap, 0, 1); ctx.translate(cx, cy); ctx.scale(0.7 + 0.3 * clamp(ap, 0, 1), 0.7 + 0.3 * clamp(ap, 0, 1))
      // chip
      ctx.fillStyle = pal.surface; ctx.beginPath(); ctx.roundRect(-chipW / 2, -chipH / 2, chipW, chipH, 14); ctx.fill()
      ctx.strokeStyle = hairline(pal, 0.18); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(-chipW / 2, -chipH / 2, chipW, chipH, 14); ctx.stroke()
      // numero de paso (mono) + etiqueta
      drawText(ctx, String(i + 1), 0, -16, { size: 30, weight: 700, family: fonts.accent, maxW: chipW * 0.8, color: numColor(pal) })
      drawText(ctx, labels[i] || def[i], 0, 22, { size: 15, weight: 600, family: fonts.text, maxW: chipW * 0.9, color: pal.dim })
      ctx.restore()
    }
  },
})

// ====================================================================== numberStack
register({
  id: 'data.stack.trio', lib: 'datakit', category: 'numberStack', tones: ['dark', 'light'], rubros: ['*'], weight: 1.2,
  tags: ['kpi', 'stack', 'mono'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env, r = seedFor(env.seed, 'data')
    // 3 datos apilados con DESTACADO: el del medio mas grande (foco), divisores entre filas.
    const top = H * 0.24, gap = H * 0.18, cx = W / 2
    const units = ['%', 'k', '+']
    const labels = [shortLabel(content.tagline, 3), shortLabel(content.claim, 3), shortLabel(content.cta, 3)]
    const defLab = ['Satisfaccion', 'Clientes', 'Anos']
    const tgts = [range(r, 60, 99), range(r, 1.2, 9.8), range(r, 5, 40)]
    const sizes = [40, 64, 40]   // el del medio es el foco
    for (let i = 0; i < 3; i++) {
      const y = top + i * gap
      const ap = inv(t, 0.1 + i * 0.16, 0.7 + i * 0.16)
      const val = tgts[i] * eOutExpo(ap)
      const shown = i === 1 ? val.toFixed(1) : fmtInt(val)
      // divisor superior (menos en la 1ra)
      if (i > 0) { ctx.strokeStyle = hairline(pal, 0.1); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(W * 0.2, y - gap / 2); ctx.lineTo(W * 0.8, y - gap / 2); ctx.stroke() }
      drawText(ctx, shown + units[i], cx, y - 8, { size: sizes[i], weight: 700, family: fonts.accent, maxW: W * 0.84, color: numColor(pal), alpha: clamp(ap * 1.3, 0, 1) })
      // marca de acento del foco (pildora bajo el numero del medio)
      if (i === 1) { const wu = eOutCubic(inv(t, 0.4, 1)), ww = 70 * wu; ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(cx - ww / 2, y + 26, ww, 5, 2.5); ctx.fill() }
      drawText(ctx, labels[i] || defLab[i], cx, y + (i === 1 ? 46 : 24), { size: 16, weight: 600, family: fonts.text, maxW: W * 0.7, color: pal.dim, alpha: clamp(ap * 1.2, 0, 1) })
    }
  },
})

register({
  id: 'data.stack.rowduo', lib: 'datakit', category: 'numberStack', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['kpi', 'fila', 'mono'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env, r = seedFor(env.seed, 'data')
    // 2 datos lado a lado en una fila, separados por un divisor vertical de acento. Foco compartido.
    const cy = H * 0.44, xA = W * 0.3, xB = W * 0.7
    const tgtA = range(r, 120, 9800), tgtB = range(r, 12, 96)
    const apA = inv(t, 0.12, 0.8), apB = inv(t, 0.3, 1)
    const titulo = content.tagline || content.claim
    if (titulo) drawText(ctx, titulo, W / 2, H * 0.26, { size: 21, weight: 700, family: fonts.display, maxW: W * 0.84, color: pal.ink, alpha: inv(t, 0.1, 0.55) })
    // divisor vertical de acento (DECO) que crece desde el centro
    const dh = eOutCubic(inv(t, 0.3, 1)) * 64
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(W / 2 - 2, cy - dh / 2, 4, dh, 2); ctx.fill()
    drawText(ctx, fmtInt(tgtA * eOutExpo(apA)) + '+', xA, cy - 6, { size: 50, weight: 700, family: fonts.accent, maxW: W * 0.34, color: numColor(pal), alpha: clamp(apA * 1.3, 0, 1) })
    drawText(ctx, Math.round(tgtB * eOutExpo(apB)) + '%', xB, cy - 6, { size: 50, weight: 700, family: fonts.accent, maxW: W * 0.34, color: numColor(pal), alpha: clamp(apB * 1.3, 0, 1) })
    drawText(ctx, shortLabel(content.claim, 2) || 'Proyectos', xA, cy + 40, { size: 16, weight: 600, family: fonts.text, maxW: W * 0.3, color: pal.dim, alpha: clamp(apA * 1.2, 0, 1) })
    drawText(ctx, shortLabel(content.cta, 2) || 'Mejora', xB, cy + 40, { size: 16, weight: 600, family: fonts.text, maxW: W * 0.3, color: pal.dim, alpha: clamp(apB * 1.2, 0, 1) })
  },
})

// ====================================================================== barras (mas)
register({
  id: 'data.bars.stacked', lib: 'datakit', category: 'barras', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['barras', 'apiladas', 'composicion'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env, r = seedFor(env.seed, 'data')
    // 3 columnas apiladas (2 segmentos c/u): accent abajo, accent2/atenuado arriba -> composicion.
    const n = 3, base = H * 0.7, maxH = H * 0.42, x0 = W * 0.16, span = W * 0.68
    const slot = span / n, bw = slot * 0.5
    ctx.strokeStyle = hairline(pal, 0.12); ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(x0 - 6, base + 1); ctx.lineTo(x0 + span + 6, base + 1); ctx.stroke()
    const titulo = content.tagline || content.claim
    if (titulo) drawText(ctx, titulo, W / 2, H * 0.2, { size: 22, weight: 700, family: fonts.display, maxW: W * 0.84, color: pal.ink, alpha: inv(t, 0.15, 0.6) })
    const labs = ['Ene', 'Feb', 'Mar']
    for (let i = 0; i < n; i++) {
      const bx = x0 + i * slot + (slot - bw) / 2
      const lo = range(r, 0.25, 0.55), hi = range(r, 0.18, 0.4)
      const apL = eOutCubic(inv(t, 0.12 + i * 0.1, 0.7 + i * 0.1))
      const apH = eOutCubic(inv(t, 0.3 + i * 0.1, 0.95 + i * 0.1))
      const hL = maxH * lo * apL, hH = maxH * hi * apH
      // segmento inferior (acento)
      ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(bx, base - hL, bw, hL, [0, 0, 0, 0]); ctx.fill()
      // segmento superior (accent2)
      ctx.fillStyle = rgba(pal.accent2, 0.75); ctx.beginPath(); ctx.roundRect(bx, base - hL - hH, bw, hH, [6, 6, 0, 0]); ctx.fill()
      // total encima en mono
      const totAp = inv(t, 0.6 + i * 0.1, 1 + i * 0.1)
      if (totAp > 0) drawText(ctx, Math.round((lo + hi) * 100) + '', bx + bw / 2, base - hL - hH - 16, { size: 16, weight: 700, family: fonts.accent, maxW: slot, color: numColor(pal), alpha: totAp })
      drawText(ctx, labs[i], bx + bw / 2, base + 20, { size: 14, weight: 600, family: fonts.text, maxW: slot, color: pal.dim, alpha: clamp(apL * 1.2, 0, 1) })
    }
    // leyenda
    const lAp = inv(t, 0.7, 1.2)
    if (lAp > 0) {
      ctx.save(); ctx.globalAlpha = lAp
      const ly = base + 52, lx = W / 2 - 90
      ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(lx, ly - 6, 12, 12, 3); ctx.fill()
      drawText(ctx, shortLabel(content.brand, 1) || 'Base', lx + 18, ly, { size: 13, weight: 600, family: fonts.text, align: 'left', maxW: 70, color: pal.dim })
      ctx.fillStyle = rgba(pal.accent2, 0.75); ctx.beginPath(); ctx.roundRect(lx + 96, ly - 6, 12, 12, 3); ctx.fill()
      drawText(ctx, 'Extra', lx + 114, ly, { size: 13, weight: 600, family: fonts.text, align: 'left', maxW: 70, color: pal.dim })
      ctx.restore()
    }
  },
})

register({
  id: 'data.bars.lollipop', lib: 'datakit', category: 'barras', tones: ['dark', 'light'], rubros: ['*'], weight: 0.9,
  tags: ['barras', 'lollipop', 'ranking'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env, r = seedFor(env.seed, 'data')
    // ranking horizontal estilo "lollipop": linea fina + circulo al final, valor en el circulo. Mas aireado.
    const n = 4, top = H * 0.3, gap = H * 0.12, x0 = W * 0.14, span = W * 0.62
    const labels = [content.brand, content.tagline, content.claim, content.cta]
    const def = ['Norte', 'Sur', 'Este', 'Oeste']
    const raw = Array.from({ length: n }, () => range(r, 0.35, 1)).sort((a, b) => b - a)
    for (let i = 0; i < n; i++) {
      const y = top + i * gap
      const ap = eOutCubic(inv(t, 0.12 + i * 0.1, 0.85 + i * 0.1))
      const lab = shortLabel(labels[i], 2) || def[i]
      drawText(ctx, lab, x0, y - 13, { size: 14, weight: 600, family: fonts.text, align: 'left', maxW: span, color: pal.dim, alpha: ap })
      // tallo
      const ex = x0 + span * raw[i] * ap
      ctx.strokeStyle = i === 0 ? pal.accent : rgba(pal.accent, 0.5); ctx.lineWidth = 4; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(Math.max(x0 + 6, ex), y); ctx.stroke()
      // cabeza
      ctx.fillStyle = i === 0 ? pal.accent : rgba(pal.accent, 0.5)
      ctx.beginPath(); ctx.arc(Math.max(x0 + 6, ex), y, 14, 0, TAU); ctx.fill()
      // valor al lado de la cabeza
      drawText(ctx, Math.round(raw[i] * 100 * ap) + '%', Math.max(x0 + 6, ex) + 22, y, { size: 15, weight: 700, family: fonts.accent, align: 'left', maxW: W * 0.2, color: numColor(pal), alpha: ap })
    }
  },
})

// ====================================================================== anillos / radiales (mas)
register({
  id: 'data.ring.multi', lib: 'datakit', category: 'anillos/radiales', tones: ['dark', 'light'], rubros: ['*'], weight: 1.1,
  tags: ['anillos', 'concentrico', 'multi'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env, r = seedFor(env.seed, 'data')
    // 3 arcos concentricos (radial multi-metrica): cada anillo su % y su color, leyenda a la derecha.
    const cx = W * 0.38, cy = H * 0.44, lw = 14, gap = 22
    const pcts = [range(r, 0.55, 0.95), range(r, 0.4, 0.8), range(r, 0.25, 0.6)]
    const cols = [pal.accent, lighten(pal.accent, 0.22), pal.accent2]
    const start = -TAU / 4
    ctx.lineCap = 'round'
    for (let i = 0; i < 3; i++) {
      const rad = W * 0.28 - i * gap
      const ap = eOutCubic(inv(t, 0.1 + i * 0.12, 1.1 + i * 0.12))
      // riel
      ctx.lineWidth = lw; ctx.strokeStyle = hairline(pal, 0.08)
      ctx.beginPath(); ctx.arc(cx, cy, rad, 0, TAU); ctx.stroke()
      // arco
      ctx.strokeStyle = cols[i]
      ctx.beginPath(); ctx.arc(cx, cy, rad, start, start + TAU * pcts[i] * ap); ctx.stroke()
    }
    // leyenda a la derecha (3 filas: punto color + % mono)
    const lx = W * 0.7, lyc = cy
    const labs = [shortLabel(content.brand, 1) || 'A', shortLabel(content.claim, 1) || 'B', shortLabel(content.cta, 1) || 'C']
    for (let i = 0; i < 3; i++) {
      const ly = lyc - 44 + i * 44
      const ap = inv(t, 0.6 + i * 0.12, 1.1 + i * 0.12)
      ctx.save(); ctx.globalAlpha = ap
      ctx.fillStyle = cols[i]; ctx.beginPath(); ctx.arc(lx, ly, 7, 0, TAU); ctx.fill()
      drawText(ctx, Math.round(pcts[i] * 100) + '%', lx + 18, ly - 8, { size: 22, weight: 700, family: fonts.accent, align: 'left', maxW: W * 0.24, color: numColor(pal) })
      drawText(ctx, labs[i], lx + 18, ly + 12, { size: 12, weight: 600, family: fonts.text, align: 'left', maxW: W * 0.24, color: pal.dim })
      ctx.restore()
    }
  },
})

// ====================================================================== donut
register({
  id: 'data.donut.share', lib: 'datakit', category: 'donut', tones: ['dark', 'light'], rubros: ['*'], weight: 1.1,
  tags: ['donut', 'porcentaje', 'share'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env, r = seedFor(env.seed, 'data')
    // donut de 1 valor (share dominante) con el hueco grande y el % grande adentro. Limpio.
    const cx = W / 2, cy = H * 0.42, rad = W * 0.3, lw = 34
    const pct = range(r, 0.5, 0.88)
    const ap = eOutCubic(inv(t, 0.1, 1.1)), start = -TAU / 4
    ctx.lineCap = 'butt'; ctx.lineWidth = lw
    // resto (riel tenue)
    ctx.strokeStyle = hairline(pal, 0.1); ctx.beginPath(); ctx.arc(cx, cy, rad, 0, TAU); ctx.stroke()
    // share de acento
    ctx.strokeStyle = pal.accent; ctx.beginPath(); ctx.arc(cx, cy, rad, start, start + TAU * pct * ap); ctx.stroke()
    // % central en mono (tinta en claro)
    drawText(ctx, Math.round(pct * 100 * ap) + '%', cx, cy - 4, { size: 58, weight: 700, family: fonts.accent, maxW: rad * 1.4, color: numColor(pal) })
    drawText(ctx, shortLabel(content.tagline, 3) || 'del mercado', cx, cy + 40, { size: 16, weight: 600, family: fonts.text, maxW: rad * 1.5, color: pal.dim, alpha: inv(t, 0.5, 1) })
    // etiqueta inferior
    const lab = content.claim
    if (lab) drawText(ctx, lab, cx, cy + rad + 56, { size: 19, weight: 600, family: fonts.text, maxW: W * 0.78, color: pal.dim, alpha: inv(t, 0.7, 1.2) })
  },
})

register({
  id: 'data.donut.breakdown', lib: 'datakit', category: 'donut', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['donut', 'desglose', 'proporcion'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env, r = seedFor(env.seed, 'data')
    // donut de 4 segmentos (desglose) con leyenda en lista debajo. Total al centro.
    const cx = W / 2, cy = H * 0.36, rad = W * 0.24, lw = 30
    let parts = Array.from({ length: 4 }, () => range(r, 0.12, 0.4))
    const sum = parts.reduce((a, b) => a + b, 0); parts = parts.map(p => p / sum)
    const cols = [pal.accent, lighten(pal.accent, 0.2), pal.accent2, hairline(pal, 0.22)]
    const ap = eOutCubic(inv(t, 0.1, 1.1)), gap = 0.025
    let ang = -TAU / 4
    ctx.lineCap = 'butt'; ctx.lineWidth = lw
    for (let i = 0; i < parts.length; i++) {
      const seg = TAU * parts[i] * ap
      ctx.strokeStyle = cols[i]
      ctx.beginPath(); ctx.arc(cx, cy, rad, ang + gap, ang + Math.max(gap + 0.001, seg - gap)); ctx.stroke()
      ang += seg
    }
    // total al centro (numero estable grande)
    const total = Math.round(range(r, 1200, 9800))
    drawText(ctx, fmtInt(total * ap), cx, cy - 4, { size: 34, weight: 700, family: fonts.accent, maxW: rad * 1.3, color: numColor(pal) })
    drawText(ctx, 'total', cx, cy + 26, { size: 13, weight: 600, family: fonts.text, maxW: rad * 1.2, color: pal.dim, alpha: inv(t, 0.5, 1) })
    // leyenda en lista 2x2 debajo. Etiqueta de 1 palabra (tight) + % a la derecha de la columna sin colision.
    const labels = [content.brand, content.tagline, content.claim, content.cta].map(s => shortLabel(s, 1))
    const def = ['Directo', 'Social', 'Referido', 'Otros']
    const ly0 = H * 0.66, colX = [W * 0.16, W * 0.56], rowH = 38
    const pctRight = W * 0.34   // borde derecho del % dentro de la columna
    for (let i = 0; i < 4; i++) {
      const lAp = inv(t, 0.6 + i * 0.08, 1.1 + i * 0.08)
      const lx = colX[i % 2], ly = ly0 + Math.floor(i / 2) * rowH
      ctx.save(); ctx.globalAlpha = lAp
      ctx.fillStyle = cols[i]; ctx.beginPath(); ctx.roundRect(lx, ly - 7, 14, 14, 4); ctx.fill()
      // la etiqueta termina antes de donde arranca el % (gap de 8px)
      drawText(ctx, (labels[i] || def[i]), lx + 22, ly, { size: 14, weight: 600, family: fonts.text, align: 'left', maxW: pctRight - W * 0.1 - 22 - 8, color: pal.ink })
      drawText(ctx, Math.round(parts[i] * 100) + '%', lx + pctRight, ly, { size: 15, weight: 700, family: fonts.accent, align: 'right', maxW: W * 0.1, color: numColor(pal) })
      ctx.restore()
    }
  },
})

// ====================================================================== comparacion / proporcion (mas)
register({
  id: 'data.compare.beforeafter', lib: 'datakit', category: 'comparacion/proporcion', tones: ['dark', 'light'], rubros: ['*'], weight: 1.1,
  tags: ['antes-despues', 'comparacion', 'mejora'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env, r = seedFor(env.seed, 'data')
    // ANTES vs DESPUES en dos barras horizontales apiladas (misma escala) + delta de mejora destacado.
    const x0 = W * 0.16, bw = W * 0.6, bh = 26
    const yA = H * 0.36, yB = H * 0.52
    const vA = range(r, 0.28, 0.5), vB = range(r, 0.72, 1)
    const apA = eOutCubic(inv(t, 0.15, 0.85)), apB = eOutCubic(inv(t, 0.35, 1.05))
    const titulo = content.tagline || content.claim
    if (titulo) drawText(ctx, titulo, W / 2, H * 0.2, { size: 22, weight: 700, family: fonts.display, maxW: W * 0.84, color: pal.ink, alpha: inv(t, 0.1, 0.55) })
    // fila ANTES (atenuada)
    drawText(ctx, 'Antes', x0, yA - 22, { size: 14, weight: 600, family: fonts.text, align: 'left', maxW: bw, color: pal.dim, alpha: apA })
    ctx.fillStyle = hairline(pal, 0.08); ctx.beginPath(); ctx.roundRect(x0, yA, bw, bh, bh / 2); ctx.fill()
    ctx.fillStyle = rgba(pal.accent, 0.4); ctx.beginPath(); ctx.roundRect(x0, yA, Math.max(bh, bw * vA * apA), bh, bh / 2); ctx.fill()
    drawText(ctx, Math.round(vA * 100 * apA) + '%', x0 + bw + 12, yA + bh / 2, { size: 16, weight: 700, family: fonts.accent, align: 'left', maxW: W * 0.14, color: pal.dim, alpha: apA })
    // fila DESPUES (acento pleno)
    drawText(ctx, shortLabel(content.cta, 2) || 'Despues', x0, yB - 22, { size: 14, weight: 700, family: fonts.text, align: 'left', maxW: bw, color: numColor(pal), alpha: apB })
    ctx.fillStyle = hairline(pal, 0.08); ctx.beginPath(); ctx.roundRect(x0, yB, bw, bh, bh / 2); ctx.fill()
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(x0, yB, Math.max(bh, bw * vB * apB), bh, bh / 2); ctx.fill()
    drawText(ctx, Math.round(vB * 100 * apB) + '%', x0 + bw + 12, yB + bh / 2, { size: 16, weight: 700, family: fonts.accent, align: 'left', maxW: W * 0.14, color: numColor(pal), alpha: apB })
    // delta de mejora (chip de acento)
    const dAp = inv(t, 0.7, 1.2)
    if (dAp > 0) {
      const delta = Math.round((vB - vA) / vA * 100)
      ctx.save(); ctx.globalAlpha = dAp
      const txt = '+' + delta + '% mejor'
      ctx.font = `700 18px "${fonts.accent}"`; const tw = ctx.measureText(txt).width
      const px = W / 2 - (tw + 36) / 2, py = H * 0.64
      ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(px, py, tw + 36, 38, 19); ctx.fill()
      drawText(ctx, txt, px + (tw + 36) / 2, py + 19, { size: 18, weight: 700, family: fonts.accent, maxW: tw + 30, color: pal.onAccent })
      ctx.restore()
    }
  },
})

register({
  id: 'data.compare.icongrid', lib: 'datakit', category: 'comparacion/proporcion', tones: ['dark', 'light'], rubros: ['*'], weight: 0.9,
  tags: ['proporcion', 'pictograma', 'fraccion'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env, r = seedFor(env.seed, 'data')
    // pictograma: grilla de 10 puntos, N llenos de acento (fraccion "N de cada 10"). Lectura intuitiva.
    const filled = Math.round(range(r, 4, 9))
    const cols = 5, rows = 2, dotR = W * 0.045, gx = W * 0.135, gy = H * 0.14
    const gridW = (cols - 1) * gx, gridH = (rows - 1) * gy
    const ox = W / 2 - gridW / 2, oy = H * 0.36
    const titulo = content.tagline || content.claim
    if (titulo) drawText(ctx, titulo, W / 2, H * 0.2, { size: 21, weight: 700, family: fonts.display, maxW: W * 0.84, color: pal.ink, alpha: inv(t, 0.1, 0.55) })
    for (let i = 0; i < 10; i++) {
      const c = i % cols, ro = Math.floor(i / cols)
      const x = ox + c * gx, y = oy + ro * gy
      const ap = spring(inv(t, 0.12 + i * 0.05, 0.7 + i * 0.05), { zeta: 0.5, freq: 2.2 })
      ctx.save(); ctx.translate(x, y); ctx.scale(clamp(ap, 0, 1.1), clamp(ap, 0, 1.1))
      if (i < filled) { ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.arc(0, 0, dotR, 0, TAU); ctx.fill() }
      else { ctx.strokeStyle = hairline(pal, 0.22); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 0, dotR, 0, TAU); ctx.stroke() }
      ctx.restore()
    }
    // texto "N de cada 10"
    const tAp = inv(t, 0.7, 1.2)
    drawText(ctx, filled + ' de cada 10', W / 2, oy + gridH + H * 0.13, { size: 26, weight: 700, family: fonts.accent, maxW: W * 0.7, color: numColor(pal), alpha: tAp })
    const lab = shortLabel(content.cta, 4) || 'nos recomiendan'
    drawText(ctx, lab, W / 2, oy + gridH + H * 0.18, { size: 17, weight: 600, family: fonts.text, maxW: W * 0.8, color: pal.dim, alpha: inv(t, 0.8, 1.3) })
  },
})

register({
  id: 'data.progress.checklist', lib: 'datakit', category: 'timeline/proceso', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['checklist', 'proceso', 'completado'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env, r = seedFor(env.seed, 'data')
    // checklist de 4 items que se van tildando en secuencia (proceso completado). Barra de progreso arriba.
    const n = 4, x0 = W * 0.14, top = H * 0.34, gap = H * 0.12, boxR = 14
    const labels = [content.brand, content.tagline, content.claim, content.cta]
    const def = ['Cuenta lista', 'Cartera importada', 'Anuncio creado', 'Campana activa']
    const titulo = 'Tu progreso'
    drawText(ctx, titulo, W / 2, H * 0.2, { size: 22, weight: 700, family: fonts.display, maxW: W * 0.84, color: pal.ink, alpha: inv(t, 0.1, 0.5) })
    // barra de progreso global
    const prog = eOutCubic(inv(t, 0.1, 1.1))
    const pbw = W * 0.72, pbx = W / 2 - pbw / 2, pby = H * 0.26
    ctx.fillStyle = hairline(pal, 0.1); ctx.beginPath(); ctx.roundRect(pbx, pby, pbw, 8, 4); ctx.fill()
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(pbx, pby, Math.max(8, pbw * prog), 8, 4); ctx.fill()
    drawText(ctx, Math.round(prog * 100) + '%', pbx + pbw + 10, pby + 4, { size: 14, weight: 700, family: fonts.accent, align: 'left', maxW: W * 0.12, color: numColor(pal) })
    for (let i = 0; i < n; i++) {
      const y = top + i * gap
      const done = prog > (i + 0.5) / n
      const ap = inv(t, 0.15 + i * 0.12, 0.75 + i * 0.12)
      ctx.save(); ctx.translate(x0, y)
      if (done) {
        ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(-boxR, -boxR, boxR * 2, boxR * 2, 6); ctx.fill()
        ctx.strokeStyle = pal.onAccent; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.lineCap = 'round'
        checkPath(ctx, boxR * 0.95); ctx.stroke()
      } else {
        ctx.strokeStyle = hairline(pal, 0.25); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.roundRect(-boxR, -boxR, boxR * 2, boxR * 2, 6); ctx.stroke()
      }
      ctx.restore()
      const lab = shortLabel(labels[i], 3) || def[i]
      drawText(ctx, lab, x0 + boxR + 18, y, { size: 18, weight: done ? 700 : 600, family: fonts.text, align: 'left', maxW: W - (x0 + boxR + 18) - W * 0.08, color: done ? pal.ink : pal.dim, alpha: clamp(0.4 + ap * 0.6, 0, 1) })
    }
  },
})

register({
  id: 'data.stack.deltacol', lib: 'datakit', category: 'numberStack', tones: ['dark', 'light'], rubros: ['*'], weight: 0.9,
  tags: ['kpi', 'delta', 'tendencia'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env, r = seedFor(env.seed, 'data')
    // 3 KPIs en columna, cada uno con su DELTA (flecha arriba + % chico de acento). Tablero de metricas.
    const top = H * 0.26, gap = H * 0.18, xL = W * 0.14
    const units = ['', 'k', '%']
    const tgts = [range(r, 120, 980), range(r, 1.2, 48), range(r, 20, 95)]
    const deltas = [range(r, 4, 28), range(r, 6, 34), range(r, 3, 19)]
    const labels = [content.tagline, content.claim, content.cta].map(s => shortLabel(s, 3))
    const def = ['Visitas', 'Mensajes', 'Conversion']
    for (let i = 0; i < 3; i++) {
      const y = top + i * gap
      const ap = inv(t, 0.1 + i * 0.15, 0.7 + i * 0.15)
      const v = tgts[i] * eOutExpo(ap)
      const shown = i === 1 ? v.toFixed(1) : fmtInt(v)
      // etiqueta arriba
      drawText(ctx, labels[i] || def[i], xL, y - 26, { size: 14, weight: 600, family: fonts.text, align: 'left', maxW: W * 0.6, color: pal.dim, alpha: clamp(ap * 1.3, 0, 1) })
      // numero grande mono
      drawText(ctx, shown + units[i], xL, y + 6, { size: 46, weight: 700, family: fonts.accent, align: 'left', maxW: W * 0.5, color: numColor(pal), alpha: clamp(ap * 1.2, 0, 1) })
      // chip de delta a la derecha (flecha + %)
      const dAp = inv(t, 0.5 + i * 0.12, 1 + i * 0.12)
      if (dAp > 0) {
        ctx.save(); ctx.globalAlpha = dAp
        const dtxt = '+' + Math.round(deltas[i]) + '%'
        ctx.font = `700 15px "${fonts.accent}"`; const tw = ctx.measureText(dtxt).width
        const chipW = tw + 34, chipX = W * 0.86 - chipW, chipY = y - 14
        ctx.fillStyle = rgba(pal.accent, 0.16); ctx.beginPath(); ctx.roundRect(chipX, chipY, chipW, 28, 14); ctx.fill()
        // flechita
        ctx.strokeStyle = pal.accent; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
        const ax = chipX + 14, ay = chipY + 14
        ctx.beginPath(); ctx.moveTo(ax, ay + 5); ctx.lineTo(ax, ay - 5); ctx.moveTo(ax - 4, ay - 1); ctx.lineTo(ax, ay - 5); ctx.lineTo(ax + 4, ay - 1); ctx.stroke()
        drawText(ctx, dtxt, ax + 12, ay, { size: 15, weight: 700, family: fonts.accent, align: 'left', maxW: tw + 4, color: numColor(pal) })
        ctx.restore()
      }
      // regla divisoria
      if (i < 2) { ctx.strokeStyle = hairline(pal, 0.08); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(xL, y + gap / 2); ctx.lineTo(W * 0.86, y + gap / 2); ctx.stroke() }
    }
  },
})

register({
  id: 'data.series.bars30', lib: 'datakit', category: 'series/tendencia', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['serie', 'columnas', 'tendencia'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env, r = seedFor(env.seed, 'data')
    // mini-histograma de 12 columnas finas con tendencia ascendente (serie temporal). Pico destacado.
    const n = 12, base = H * 0.62, maxH = H * 0.32, x0 = W * 0.12, span = W * 0.76
    const slot = span / n, bw = slot * 0.62
    const vals = []
    for (let i = 0; i < n; i++) { const tr = i / (n - 1); vals.push(clamp(0.2 + tr * 0.55 + (r() - 0.5) * 0.28, 0.08, 1)) }
    let peak = 0; for (let i = 0; i < n; i++) if (vals[i] > vals[peak]) peak = i
    ctx.strokeStyle = hairline(pal, 0.1); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x0, base + 1); ctx.lineTo(x0 + span, base + 1); ctx.stroke()
    const draw = eOutCubic(inv(t, 0.1, 1.2))
    for (let i = 0; i < n; i++) {
      const local = clamp((draw * n - i) , 0, 1)
      const bx = x0 + i * slot + (slot - bw) / 2
      const bhh = maxH * vals[i] * local
      ctx.fillStyle = i === peak ? pal.accent : rgba(pal.accent, 0.4)
      ctx.beginPath(); ctx.roundRect(bx, base - bhh, bw, bhh, [3, 3, 0, 0]); ctx.fill()
    }
    // valor pico + delta total
    const pAp = inv(t, 0.7, 1.1)
    if (pAp > 0) {
      const bx = x0 + peak * slot + slot / 2
      drawText(ctx, Math.round(vals[peak] * 100) + '', bx, base - maxH * vals[peak] - 14, { size: 15, weight: 700, family: fonts.accent, maxW: slot * 2, color: numColor(pal), alpha: pAp })
    }
    const delta = Math.round((vals[n - 1] - vals[0]) * 100)
    drawText(ctx, '+' + Math.abs(delta) + '%', W / 2, H * 0.22, { size: 40, weight: 700, family: fonts.accent, maxW: W * 0.5, color: numColor(pal), alpha: inv(t, 0.4, 1) })
    const lab = content.tagline || content.claim
    if (lab) drawText(ctx, lab, W / 2, H * 0.72, { size: 18, weight: 600, family: fonts.text, maxW: W * 0.78, color: pal.dim, alpha: inv(t, 0.7, 1.2) })
  },
})
