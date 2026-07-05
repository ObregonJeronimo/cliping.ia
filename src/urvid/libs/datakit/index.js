// urvid 1.0 · biblioteca DATAKIT — data-viz animada y legible. render(ctx, t, env).
// env = { pal, content, fonts, seed, energy, sceneDur }. Puro + determinista (mulberry32(env.seed) para los
// VALORES de datos estables, t para la animacion de entrada). REGLA DURA: numeros en MONO via fonts.accent;
// en claro el numero va en TINTA (pal.ink) y el acento queda para la barra/regla/arco; en oscuro el numero
// puede ir en inkText. Acento = DECO (barra que se llena, arco, estrella). Sin Math.random/Date.now.
import { register } from '../../core/registry.js'
import { mulberry32, seedFor, range } from '../../core/prng.js'
import { drawText, drawWrapped } from '../../core/text.js'
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

// ---- DATOS REALES (item L152): los modulos MIGRADOS (real:true) leen content.stats y NUNCA fabrican. El selector ya
// los gatea por realStats>=needsStats (assemble.js); estos helpers son el seam + un doble-guard de honestidad. ----
// realStat(content,i): la i-esima stat REAL {value,label} de la perception, o null.
function realStat(content, i = 0) {
  const s = content && Array.isArray(content.stats) ? content.stats[i] : null
  return s && (s.value || s.value === 0) ? s : null
}
// parseStat: separa el value ('92%', '$1.2M', '4.9', '+218%') en {num, prefix, suffix, decimals} para animar el count-up
// mostrando el valor EXACTO. Si no hay numero parseable -> num=null (se muestra el string crudo, sin count-up).
function parseStat(v) {
  const raw = String(v == null ? '' : v).trim()
  const m = raw.match(/[-+]?\d[\d.,]*/)
  if (!m) return { raw, num: null, prefix: '', suffix: '', decimals: 0 }
  const norm = m[0].replace(/,(?=\d{3}\b)/g, '').replace(',', '.')   // 1,000->1000 ; 4,9->4.9
  const num = parseFloat(norm)
  return { raw, num: isFinite(num) ? num : null, prefix: raw.slice(0, m.index), suffix: raw.slice(m.index + m[0].length), decimals: Math.min((norm.split('.')[1] || '').length, 2) }
}
// formatea el numero animado (thousands sep para enteros; decimales fijos si el valor real los tenia).
function fmtNum(v, decimals) { return decimals > 0 ? (Math.round(v * 10 ** decimals) / 10 ** decimals).toFixed(decimals) : fmtInt(v) }
// statDisplay: el valor REAL con count-up en su parte numerica (o el string crudo si no es numerico). Determinista por t.
function statDisplay(st, t, t0, t1) { const p = parseStat(st.value); return p.num != null ? p.prefix + fmtNum(countTo(p.num, t, t0, t1), p.decimals) + p.suffix : p.raw }
// statPercent(content): la 1ra stat cuyo value es un PORCENTAJE real -> {pct:0..1, st}. null si ninguna es %. Para
// modulos que rellenan un arco/anillo por un valor 0..1 -> NUNCA fabrican el % (item L152): sin un % real, se auto-saltan.
function statPercent(content) {
  const arr = content && Array.isArray(content.stats) ? content.stats : []
  for (const s of arr) { if (!s || s.value == null) continue; const p = parseStat(s.value); if (p.num != null && /%/.test(String(s.value))) { const v = p.num / 100; if (v >= 0 && v <= 1.5) return { pct: Math.min(v, 1), st: s } } }
  return null
}
// statRating(content): la 1ra stat cuyo value es un RATING real 0..5 (sin '%') -> {score:0..5, st}. null si ninguna. Para
// modulos de estrellas -> el nro de estrellas sale de un dato real; sin rating real (ej '4.9') el modulo se auto-salta.
function statRating(content) { const arr = content && Array.isArray(content.stats) ? content.stats : []; for (const s of arr) { if (!s || s.value == null) continue; const p = parseStat(s.value); if (p.num != null && p.num >= 0 && p.num <= 5 && !/%/.test(String(s.value))) return { score: p.num, st: s } } return null }

// ---- VIDA CONTINUA (idle life) — helpers puros, deterministas (SOLO por t). Sutiles y suaves. ----
// Tras la entrada los datos se asientan; estos helpers le dan vida CONTINUA a la DECO (barras/arcos/
// puntos/agujas/reglas) sin cambiar el dato ni mover el texto de su lugar. Todo via Math.sin(t*w+phase).
// idleK: rampa 0->1 que arranca la vida idle DESPUES de que la entrada asento (evita pelear con el ease).
function idleK(t, t0 = 1.3, t1 = 1.9) { return eOutCubic(clamp((t - t0) / (t1 - t0), 0, 1)) }
// respiracion: factor de escala ~1 (amp en fraccion, ej 0.012 = ±1.2%). Por defecto periodo ~5s.
function breath(t, phase = 0, amp = 0.012, w = 1.05) { return 1 + Math.sin(t * w + phase) * amp }
// deriva: offset en px (±amp), lento. Para acentos/puntos/cabezas.
function drift(t, phase = 0, amp = 1.4, w = 0.8) { return Math.sin(t * w + phase) * amp }
// pulso 0..1 (para alpha/lightness/glow de un acento). 0.5 +- 0.5*sin.
function pulse01(t, phase = 0, w = 1.1) { return 0.5 + 0.5 * Math.sin(t * w + phase) }
// glow suave 0..1 acotado a [lo,hi] (para alpha de puntos-cabeza / halos).
function glow(t, phase = 0, lo = 0.55, hi = 1, w = 1.1) { return lo + (hi - lo) * pulse01(t, phase, w) }
// SHEEN: barre un brillo (banda diagonal clara) por dentro de un rect de barra ya pintado. Clipea al rect
// redondeado. period ~ s; offsetK para desfasar por barra. Suave (gradiente) y muy sutil.
function sheen(ctx, x, y, w, h, t, { period = 3.4, phase = 0, width = 0.34, strength = 0.16, r = h / 2 } = {}) {
  if (!(w > 4)) return
  const k = idleK(t)                                   // no brilla durante la entrada
  if (k <= 0.001) return
  const p = ((t / period + phase) % 1 + 1) % 1         // 0..1 recorre la barra
  const bandW = w * width
  const cxs = -bandW + p * (w + bandW * 2)             // centro de la banda, recorre de izq a der
  ctx.save()
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.clip()
  const g = ctx.createLinearGradient(x + cxs - bandW / 2, 0, x + cxs + bandW / 2, 0)
  g.addColorStop(0, 'rgba(255,255,255,0)')
  g.addColorStop(0.5, `rgba(255,255,255,${strength * k})`)
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.globalCompositeOperation = 'overlay'
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h)
  ctx.restore()
}
// SHEEN-V: brillo que SUBE por dentro de un rect (para columnas verticales). Clipea al rect.
function sheenV(ctx, x, y, w, h, t, { period = 3.6, phase = 0, band = 0.4, strength = 0.16, r = 6 } = {}) {
  if (!(h > 6)) return
  const k = idleK(t)
  if (k <= 0.001) return
  const p = 1 - (((t / period + phase) % 1 + 1) % 1)   // 1->0: sube (y decrece)
  const bandH = h * band
  const cyc = y + p * (h + bandH * 2) - bandH
  ctx.save()
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.clip()
  const g = ctx.createLinearGradient(0, cyc - bandH / 2, 0, cyc + bandH / 2)
  g.addColorStop(0, 'rgba(255,255,255,0)')
  g.addColorStop(0.5, `rgba(255,255,255,${strength * k})`)
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.globalCompositeOperation = 'overlay'
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h)
  ctx.restore()
}
// SHEEN-ARC: brillo que recorre un arco (para anillos/gauges). Pinta un tramo corto mas claro que orbita.
function sheenArc(ctx, cx, cy, rad, lw, t, col, { period = 4, phase = 0, span = 0.5, strength = 0.5 } = {}) {
  const k = idleK(t)
  if (k <= 0.001) return
  const a = ((t / period + phase) % 1 + 1) % 1 * TAU - TAU / 4
  ctx.save(); ctx.lineCap = 'round'; ctx.lineWidth = lw
  ctx.globalAlpha *= strength * k
  ctx.strokeStyle = lighten(col, 0.5)
  ctx.beginPath(); ctx.arc(cx, cy, rad, a - span / 2, a + span / 2); ctx.stroke()
  ctx.restore()
}

// ====================================================================== numeros-animados
register({
  id: 'data.number.bigcount', lib: 'datakit', category: 'numeros-animados', tones: ['dark', 'light'], rubros: ['finanzas', 'tech', 'default'], weight: 1.3,
  real: true, needsStats: 1,   // MIGRADO (item L152): lee la 1ra stat REAL; el selector solo lo elige con realStats>=1 (nunca fabrica).
  register: 'neutral', intensity: 'medium', tags: ['hero', 'stat', 'mono'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env
    const st = realStat(content, 0); if (!st) return   // honestidad: SOLO con stat real (el selector ya lo gatea; doble-guard)
    const cx = W / 2, cy = H * 0.44
    // numero grande en mono (el VALOR REAL con count-up), color por tono
    drawText(ctx, statDisplay(st, t, 0.1, 1.2), cx, cy, {
      size: 120, weight: 700, family: fonts.accent, maxW: W * 0.88, color: numColor(pal),
      shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.35)' : null,
    })
    // regla de acento que crece bajo el numero (DECO) + respiracion idle continua (ancho/glow)
    const ru = eOutCubic(inv(t, 0.5, 1.2)), rw = 96 * ru * breath(t, 0, 0.02)
    const ry = cy + 58 + drift(t, 1.2, 0.8)
    ctx.save(); ctx.globalAlpha = glow(t, 0, 0.78, 1)
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(cx - rw / 2, ry, rw, 6, 3); ctx.fill()
    ctx.restore()
    // etiqueta REAL del stat (o claim/tagline como fallback) debajo, en dim
    const label = st.label || content.claim || content.tagline || ''
    if (label) drawText(ctx, label, cx, cy + 94, { size: 22, weight: 600, family: fonts.text, maxW: W * 0.78, color: pal.dim, alpha: inv(t, 0.7, 1.2) })
  },
})

register({
  id: 'data.number.statgrid', lib: 'datakit', category: 'numeros-animados', tones: ['dark', 'light'], rubros: ['finanzas', 'tech', 'default'], weight: 1,
  real: true, needsStats: 2,   // MIGRADO (item L152): apila 2-3 stats REALES (valor + etiqueta); sin >=2 se auto-salta.
  register: 'neutral', intensity: 'medium', tags: ['stats', 'kpi', 'mono'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env
    // 2-3 KPIs REALES apilados: el VALOR real (con su prefijo/sufijo) en mono + su etiqueta.
    const rs = (content.stats || []).filter(s => s && (s.value || s.value === 0)).slice(0, 3)
    if (rs.length < 2) return   // honestidad: solo con >=2 stats reales (el selector ya lo gatea; doble-guard)
    const rows = rs.length, top = H * 0.26, gap = H * 0.17
    for (let i = 0; i < rows; i++) {
      const y = top + i * gap
      const ap = inv(t, 0.1 + i * 0.18, 0.7 + i * 0.18)
      ctx.save(); ctx.globalAlpha = ap
      // tick de acento a la izquierda (DECO) -> respira en alto + glow continuo, desfasado por fila
      const tickH = 36 * Math.min(1, ap * 1.3) * breath(t, i * 1.6, 0.035, 1.2)
      ctx.save(); ctx.globalAlpha = glow(t, i * 1.6, 0.7, 1)
      ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(W * 0.12, y - tickH / 2, 5, tickH, 2.5); ctx.fill()
      ctx.restore()
      drawText(ctx, statDisplay(rs[i], t, 0.1 + i * 0.18, 0.7 + i * 0.18), W * 0.2, y, { size: 72, weight: 700, family: fonts.accent, align: 'left', maxW: W * 0.34, color: numColor(pal) })
      // etiqueta REAL: drawWrapped -> ancha y hasta 2 lineas, achica antes de elidir -> etiquetas largas entran completas
      drawWrapped(ctx, rs[i].label || '', W * 0.58, y, { size: 18, min: 13, weight: 600, family: fonts.text, align: 'left', maxW: W * 0.38, maxLines: 2, color: pal.dim })
      ctx.restore()
    }
  },
})

// ====================================================================== barras
register({
  id: 'data.bars.hfill', lib: 'datakit', category: 'barras', tones: ['dark', 'light'], rubros: ['finanzas', 'tech', 'default'], weight: 1.2,
  register: 'neutral', intensity: 'medium', tags: ['barras', 'ranking'],
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
      const fillW = Math.max(bh, bw * raw[i] * ap)
      ctx.fillStyle = i === 0 ? pal.accent : rgba(pal.accent, 0.55)
      ctx.beginPath(); ctx.roundRect(x0, y, fillW, bh, bh / 2); ctx.fill()
      // sheen idle: un brillo recorre el relleno (mas marcado en el lider), desfasado por barra
      sheen(ctx, x0, y, fillW, bh, t, { period: 3.6, phase: i * 0.22, strength: i === 0 ? 0.18 : 0.1 })
      // valor % al final del riel, en mono tinta
      drawText(ctx, Math.round(raw[i] * 100 * ap) + '%', x0 + bw + 4, y + bh / 2, { size: 15, weight: 700, family: fonts.accent, align: 'left', maxW: W * 0.1, color: numColor(pal), alpha: ap })
    }
  },
})

register({
  id: 'data.bars.vgroup', lib: 'datakit', category: 'barras', tones: ['dark', 'light'], rubros: ['finanzas', 'tech', 'default'], weight: 1,
  register: 'neutral', intensity: 'medium', tags: ['barras', 'columnas', 'serie'],
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
      // sheen idle vertical que sube por cada columna (mas fuerte en el pico), desfasado
      sheenV(ctx, bx, base - bhh, bw, bhh, t, { period: 3.8, phase: i * 0.16, strength: i === peak ? 0.2 : 0.1 })
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
  id: 'data.ring.gauge', lib: 'datakit', category: 'anillos/radiales', tones: ['dark', 'light'], rubros: ['finanzas', 'tech', 'fitness'], weight: 1.2,
  real: true, needsStats: 1, needsType: 'percent',   // MIGRADO (item L152): rellena el arco con un % REAL (statPercent); el selector solo lo elige si hay un % real -> nunca escena vacia.
  register: 'neutral', intensity: 'medium', tags: ['gauge', 'porcentaje', 'anillo'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env
    const pr = statPercent(content); if (!pr) return   // honestidad: solo con un % real (ej '92%')
    const cx = W / 2, cy = H * 0.42, rad = W * 0.3, lw = 18
    const pct = pr.pct
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
    // sheen idle: un brillo orbita dentro del arco lleno (clipea al barrido)
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, rad + lw, start, start + sweep); ctx.arc(cx, cy, rad - lw, start + sweep, start, true); ctx.closePath(); ctx.clip()
    sheenArc(ctx, cx, cy, rad, lw, t, pal.accent, { period: 4.2, span: 0.6, strength: 0.45 })
    ctx.restore()
    // punto cabeza con glow idle (respira + brilla)
    const hx = cx + Math.cos(start + sweep) * rad, hy = cy + Math.sin(start + sweep) * rad
    ctx.save(); ctx.globalAlpha = glow(t, 0, 0.7, 1)
    ctx.fillStyle = lighten(pal.accent, 0.25); ctx.beginPath(); ctx.arc(hx, hy, lw * 0.42 * breath(t, 0, 0.06, 1.3), 0, TAU); ctx.fill()
    ctx.restore()
    // numero centrado en mono = el VALOR REAL con count-up
    drawText(ctx, statDisplay(pr.st, t, 0.1, 1.2), cx, cy - 2, { size: 84, weight: 700, family: fonts.accent, maxW: rad * 1.5, color: numColor(pal) })
    // etiqueta REAL del stat debajo
    const lab = pr.st.label || content.tagline || content.claim
    if (lab) drawText(ctx, lab, cx, cy + rad + 44, { size: 20, weight: 600, family: fonts.text, maxW: W * 0.74, color: pal.dim, alpha: inv(t, 0.7, 1.2) })
  },
})

register({
  id: 'data.ring.segments', lib: 'datakit', category: 'anillos/radiales', tones: ['dark', 'light'], rubros: ['finanzas', 'tech', 'default'], weight: 0.9,
  register: 'neutral', intensity: 'medium', tags: ['donut', 'proporcion', 'anillo'],
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
    // sheen idle: brillo que orbita el anillo entero (clipea al anillo para no salirse)
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, rad + lw / 2, 0, TAU); ctx.arc(cx, cy, rad - lw / 2, 0, TAU, true); ctx.clip()
    sheenArc(ctx, cx, cy, rad, lw, t, pal.accent, { period: 5, span: 0.7, strength: 0.4 })
    ctx.restore()
    // numero central = primer segmento en %
    drawText(ctx, Math.round(parts[0] * 100 * ap) + '%', cx, cy, { size: 48, weight: 700, family: fonts.accent, maxW: rad * 1.4, color: numColor(pal) })
    const lab = content.tagline || content.claim
    if (lab) drawText(ctx, lab, cx, cy + rad + 48, { size: 19, weight: 600, family: fonts.text, maxW: W * 0.72, color: pal.dim, alpha: inv(t, 0.7, 1.2) })
  },
})

// ====================================================================== series / tendencia
register({
  id: 'data.series.sparkline', lib: 'datakit', category: 'series/tendencia', tones: ['dark', 'light'], rubros: ['finanzas', 'tech', 'default'], weight: 1.1,
  register: 'neutral', intensity: 'medium', tags: ['sparkline', 'serie', 'tendencia'],
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
    // punto cabeza + halo idle que late (ping) de forma continua
    const hx = li < n - 1 ? lerp(pts[li].x, pts[li + 1].x, fr) : pts[n - 1].x
    const hy = li < n - 1 ? lerp(pts[li].y, pts[li + 1].y, fr) : pts[n - 1].y
    const ik = idleK(t)
    if (ik > 0.001) { const pp = ((t / 2.2) % 1 + 1) % 1; ctx.save(); ctx.globalAlpha = (1 - pp) * 0.5 * ik; ctx.strokeStyle = lighten(pal.accent, 0.3); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(hx, hy, 5 + pp * 12, 0, TAU); ctx.stroke(); ctx.restore() }
    ctx.save(); ctx.globalAlpha = glow(t, 0, 0.75, 1)
    ctx.fillStyle = lighten(pal.accent, 0.3); ctx.beginPath(); ctx.arc(hx, hy, 5 * breath(t, 0, 0.06, 1.4), 0, TAU); ctx.fill()
    ctx.restore()
    // delta % arriba
    const delta = Math.round((pts[n - 1].v - pts[0].v) * 100)
    drawText(ctx, '+' + Math.abs(delta) + '%', W / 2, H * 0.22, { size: 40, weight: 700, family: fonts.accent, maxW: W * 0.5, color: numColor(pal), alpha: inv(t, 0.4, 1) })
    const lab = content.tagline || content.claim
    if (lab) drawText(ctx, lab, W / 2, H * 0.66, { size: 19, weight: 600, family: fonts.text, maxW: W * 0.74, color: pal.dim, alpha: inv(t, 0.7, 1.2) })
  },
})

// ====================================================================== comparacion / proporcion
register({
  id: 'data.compare.duo', lib: 'datakit', category: 'comparacion/proporcion', tones: ['dark', 'light'], rubros: ['finanzas', 'fitness', 'default'], weight: 1.1,
  register: 'neutral', intensity: 'medium', tags: ['comparacion', 'antes-despues', 'barras'],
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
    sheenV(ctx, xA - bw / 2, base - hA, bw, hA, t, { period: 4, phase: 0, strength: 0.1 })
    // B (la "ganadora": sheen mas marcado)
    const hB = maxH * vB * apB
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(xB - bw / 2, base - hB, bw, hB, [8, 8, 0, 0]); ctx.fill()
    sheenV(ctx, xB - bw / 2, base - hB, bw, hB, t, { period: 4, phase: 0.5, strength: 0.2 })
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
  id: 'data.compare.split', lib: 'datakit', category: 'comparacion/proporcion', tones: ['dark', 'light'], rubros: ['finanzas', 'tech', 'default'], weight: 1,
  register: 'neutral', intensity: 'medium', tags: ['proporcion', 'split', 'share'],
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
    // sheen idle recorre la parte de acento
    sheen(ctx, x0, y, cut, bh, t, { period: 3.6, strength: 0.16, r: bh / 2 })
    // separador con glow idle suave
    ctx.save(); ctx.globalAlpha = glow(t, 0, 0.65, 1)
    ctx.strokeStyle = pal.bg0; ctx.lineWidth = 3
    ctx.beginPath(); ctx.moveTo(x0 + cut, y - 2); ctx.lineTo(x0 + cut, y + bh + 2); ctx.stroke()
    ctx.restore()
    // % grande de la parte de acento
    drawText(ctx, Math.round(share * 100 * ap) + '%', x0 + bw * 0.5, y - 44, { size: 56, weight: 700, family: fonts.accent, maxW: bw, color: numColor(pal), alpha: inv(t, 0.3, 0.9) })
    // etiqueta de cada lado
    drawText(ctx, (content.brand || 'Nosotros'), x0 + 6, y + bh + 22, { size: 16, weight: 700, family: fonts.text, align: 'left', maxW: bw * 0.5, color: numColor(pal), alpha: ap })
    drawText(ctx, 'Resto', x0 + bw - 6, y + bh + 22, { size: 16, weight: 600, family: fonts.text, align: 'right', maxW: bw * 0.4, color: pal.dim, alpha: ap })
  },
})

// ====================================================================== rating / prueba social
register({
  id: 'data.rating.stars', lib: 'datakit', category: 'rating/prueba-social', tones: ['dark', 'light'], rubros: ['gastronomia', 'belleza', 'default'], weight: 1.1,
  real: true, needsStats: 1, needsType: 'rating',   // MIGRADO (item L152): las estrellas salen de un RATING real 0..5 (statRating); el selector solo lo elige si hay un rating real -> nunca escena vacia.
  register: 'friendly', intensity: 'medium', tags: ['rating', 'estrellas', 'review'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env
    const rt = statRating(content); if (!rt) return   // honestidad: solo con un rating real 0..5 (ej '4.9')
    const cx = W / 2, cy = H * 0.42
    const score = rt.score                     // 0..5 REAL
    const filled = score                       // 0..5
    const n = 5, gap = W * 0.13, sr = W * 0.05
    const totalW = (n - 1) * gap
    for (let i = 0; i < n; i++) {
      const sx = cx - totalW / 2 + i * gap
      const ap = spring(inv(t, 0.15 + i * 0.1, 0.85 + i * 0.1), { zeta: 0.45, freq: 2.2 })
      const frac = clamp(filled - i, 0, 1)
      // titilar idle: las estrellas llenas respiran en escala (onda que recorre la fila)
      const tw = 1 + idleK(t) * Math.sin(t * 1.4 - i * 0.7) * 0.02
      const sc = (0.6 + 0.4 * ap) * tw
      ctx.save(); ctx.translate(sx, cy); ctx.scale(sc, sc)
      // estrella vacia (contorno)
      starPath(ctx, sr); ctx.strokeStyle = rgba(pal.tone === 'light' ? '#000' : '#fff', 0.18); ctx.lineWidth = 2; ctx.stroke()
      // relleno parcial (clip vertical-izq segun frac) en acento, con brillo idle desfasado
      if (frac > 0) {
        ctx.save(); ctx.beginPath(); ctx.rect(-sr * 1.3, -sr * 1.3, sr * 2.6 * frac, sr * 2.6); ctx.clip()
        starPath(ctx, sr); ctx.fillStyle = i < filled - 0.5 ? lighten(pal.accent, idleK(t) * pulse01(t, -i * 0.7, 1.4) * 0.25) : pal.accent; ctx.fill(); ctx.restore()
      }
      ctx.restore()
    }
    // numero del rating en mono = el VALOR REAL con count-up
    drawText(ctx, statDisplay(rt.st, t, 0.15, 1.1), cx, cy + sr + 56, { size: 52, weight: 700, family: fonts.accent, maxW: W * 0.5, color: numColor(pal), alpha: inv(t, 0.6, 1.1) })
    const lab = rt.st.label || content.tagline || content.claim || 'sobre 5 estrellas'
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
  id: 'data.timeline.steps', lib: 'datakit', category: 'timeline/proceso', tones: ['dark', 'light'], rubros: ['tech', 'educacion', 'default'], weight: 1.2,
  register: 'neutral', intensity: 'medium', tags: ['timeline', 'pasos', 'proceso'],
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
    const yProg = lerp(top, yEnd, prog)
    ctx.strokeStyle = pal.accent
    ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, yProg); ctx.stroke()
    // idle: una chispa de energia recorre la parte de acento de la linea, de arriba a abajo
    const ik = idleK(t)
    if (ik > 0.001 && yProg > top + 6) {
      const pp = ((t / 2.6) % 1 + 1) % 1, sy = lerp(top + 4, yProg - 4, pp)
      ctx.save(); ctx.globalAlpha = ik * (0.4 + 0.6 * Math.sin(pp * Math.PI)); ctx.fillStyle = lighten(pal.accent, 0.4)
      ctx.beginPath(); ctx.arc(x, sy, 4, 0, TAU); ctx.fill(); ctx.restore()
    }
    for (let i = 0; i < n; i++) {
      const y = top + i * gap
      const reach = inv(prog, i / (n - 1) - 0.02, i / (n - 1) + 0.12)   // 0..1 cuando el progreso pasa el nodo
      const ap = eOutBack01(reach)
      // halo idle que late en los nodos alcanzados (desfasado por nodo)
      if (reach > 0.5 && ik > 0.001) { const hp = ((t / 2.4 + i * 0.25) % 1 + 1) % 1; ctx.save(); ctx.globalAlpha = (1 - hp) * 0.35 * ik; ctx.strokeStyle = pal.accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, nodeR + hp * 9, 0, TAU); ctx.stroke(); ctx.restore() }
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
  id: 'data.timeline.flowh', lib: 'datakit', category: 'timeline/proceso', tones: ['dark', 'light'], rubros: ['tech', 'educacion', 'default'], weight: 1,
  register: 'neutral', intensity: 'medium', tags: ['proceso', 'flujo', 'horizontal'],
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
        // idle: una chispa fluye por la flecha hacia el siguiente chip (desfasada por tramo)
        const ik = idleK(t)
        if (ik > 0.001 && axe > ax0 + 4) { const pp = ((t / 1.8 + i * 0.4) % 1 + 1) % 1, dx = lerp(ax0, axe, pp); ctx.save(); ctx.globalAlpha = ik * Math.sin(pp * Math.PI) * 0.8; ctx.fillStyle = lighten(pal.accent, 0.4); ctx.beginPath(); ctx.arc(dx, cy, 3.5, 0, TAU); ctx.fill(); ctx.restore() }
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
  id: 'data.stack.trio', lib: 'datakit', category: 'numberStack', tones: ['dark', 'light'], rubros: ['finanzas', 'tech', 'default'], weight: 1.2,
  real: true, needsStats: 3,   // MIGRADO (item L152): apila 3 stats REALES (el del medio es el foco); sin 3 se auto-salta.
  register: 'neutral', intensity: 'medium', tags: ['kpi', 'stack', 'mono'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env
    // 3 datos REALES apilados con DESTACADO: el del medio mas grande (foco), divisores entre filas.
    const rs = (content.stats || []).filter(s => s && (s.value || s.value === 0)).slice(0, 3)
    if (rs.length < 3) return   // honestidad: solo con 3 stats reales (el layout foco-central necesita 3)
    const top = H * 0.24, gap = H * 0.18, cx = W / 2
    const sizes = [40, 64, 40]   // el del medio es el foco
    for (let i = 0; i < 3; i++) {
      const y = top + i * gap
      const ap = inv(t, 0.1 + i * 0.16, 0.7 + i * 0.16)
      // divisor superior (menos en la 1ra)
      if (i > 0) { ctx.strokeStyle = hairline(pal, 0.1); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(W * 0.2, y - gap / 2); ctx.lineTo(W * 0.8, y - gap / 2); ctx.stroke() }
      drawText(ctx, statDisplay(rs[i], t, 0.1 + i * 0.16, 0.7 + i * 0.16), cx, y - 8, { size: sizes[i], weight: 700, family: fonts.accent, maxW: W * 0.84, color: numColor(pal), alpha: clamp(ap * 1.3, 0, 1) })
      // marca de acento del foco (pildora bajo el numero del medio) -> respira ancho + glow idle
      if (i === 1) { const wu = eOutCubic(inv(t, 0.4, 1)), ww = 70 * wu * breath(t, 0, 0.025); ctx.save(); ctx.globalAlpha = glow(t, 0, 0.78, 1); ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(cx - ww / 2, y + 26, ww, 5, 2.5); ctx.fill(); ctx.restore() }
      drawText(ctx, shortLabel(rs[i].label, 3), cx, y + (i === 1 ? 46 : 24), { size: 16, weight: 600, family: fonts.text, maxW: W * 0.7, color: pal.dim, alpha: clamp(ap * 1.2, 0, 1) })
    }
  },
})

register({
  id: 'data.stack.rowduo', lib: 'datakit', category: 'numberStack', tones: ['dark', 'light'], rubros: ['finanzas', 'tech', 'default'], weight: 1,
  real: true, needsStats: 2,   // MIGRADO (item L152): 2 datos REALES lado a lado; sin >=2 se auto-salta.
  register: 'neutral', intensity: 'medium', tags: ['kpi', 'fila', 'mono'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env
    // 2 datos REALES lado a lado en una fila, separados por un divisor vertical de acento. Foco compartido.
    const rs = (content.stats || []).filter(s => s && (s.value || s.value === 0)).slice(0, 2)
    if (rs.length < 2) return   // honestidad: solo con >=2 stats reales
    const cy = H * 0.44, xA = W * 0.3, xB = W * 0.7
    const apA = inv(t, 0.12, 0.8), apB = inv(t, 0.3, 1)
    const titulo = content.tagline || content.claim
    if (titulo) drawText(ctx, titulo, W / 2, H * 0.26, { size: 21, weight: 700, family: fonts.display, maxW: W * 0.84, color: pal.ink, alpha: inv(t, 0.1, 0.55) })
    // divisor vertical de acento (DECO) que crece desde el centro -> respira alto + glow idle
    const dh = eOutCubic(inv(t, 0.3, 1)) * 64 * breath(t, 0, 0.03)
    ctx.save(); ctx.globalAlpha = glow(t, 0, 0.78, 1)
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(W / 2 - 2, cy - dh / 2, 4, dh, 2); ctx.fill()
    ctx.restore()
    drawText(ctx, statDisplay(rs[0], t, 0.12, 0.8), xA, cy - 6, { size: 50, weight: 700, family: fonts.accent, maxW: W * 0.34, color: numColor(pal), alpha: clamp(apA * 1.3, 0, 1) })
    drawText(ctx, statDisplay(rs[1], t, 0.3, 1), xB, cy - 6, { size: 50, weight: 700, family: fonts.accent, maxW: W * 0.34, color: numColor(pal), alpha: clamp(apB * 1.3, 0, 1) })
    drawText(ctx, shortLabel(rs[0].label, 2), xA, cy + 42, { size: 16, min: 12, weight: 600, family: fonts.text, maxW: W * 0.36, maxLines: 2, color: pal.dim, alpha: clamp(apA * 1.2, 0, 1) })
    drawText(ctx, shortLabel(rs[1].label, 2), xB, cy + 42, { size: 16, min: 12, weight: 600, family: fonts.text, maxW: W * 0.36, maxLines: 2, color: pal.dim, alpha: clamp(apB * 1.2, 0, 1) })
  },
})

// ====================================================================== barras (mas)
register({
  id: 'data.bars.stacked', lib: 'datakit', category: 'barras', tones: ['dark', 'light'], rubros: ['finanzas', 'tech', 'default'], weight: 1,
  register: 'corporate', intensity: 'medium', tags: ['barras', 'apiladas', 'composicion'],
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
      sheenV(ctx, bx, base - hL, bw, hL, t, { period: 4, phase: i * 0.2, strength: 0.16, r: 0 })
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
  id: 'data.bars.lollipop', lib: 'datakit', category: 'barras', tones: ['dark', 'light'], rubros: ['finanzas', 'tech', 'default'], weight: 0.9,
  register: 'neutral', intensity: 'soft', tags: ['barras', 'lollipop', 'ranking'],
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
      // cabeza con respiracion + glow idle (desfasada por fila; el lider mas marcado)
      ctx.save(); ctx.globalAlpha = glow(t, i * 0.8, i === 0 ? 0.75 : 0.6, 1)
      ctx.fillStyle = i === 0 ? pal.accent : rgba(pal.accent, 0.5)
      ctx.beginPath(); ctx.arc(Math.max(x0 + 6, ex), y, 14 * breath(t, i * 0.8, 0.05, 1.2), 0, TAU); ctx.fill()
      ctx.restore()
      // valor al lado de la cabeza
      drawText(ctx, Math.round(raw[i] * 100 * ap) + '%', Math.max(x0 + 6, ex) + 22, y, { size: 15, weight: 700, family: fonts.accent, align: 'left', maxW: W * 0.2, color: numColor(pal), alpha: ap })
    }
  },
})

// ====================================================================== anillos / radiales (mas)
register({
  id: 'data.ring.multi', lib: 'datakit', category: 'anillos/radiales', tones: ['dark', 'light'], rubros: ['finanzas', 'tech', 'fitness'], weight: 1.1,
  register: 'corporate', intensity: 'medium', tags: ['anillos', 'concentrico', 'multi'],
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
      const sweepM = TAU * pcts[i] * ap
      ctx.strokeStyle = cols[i]
      ctx.beginPath(); ctx.arc(cx, cy, rad, start, start + sweepM); ctx.stroke()
      // sheen idle orbita dentro de cada arco lleno (clip al barrido), desfasado por anillo
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, rad + lw, start, start + sweepM); ctx.arc(cx, cy, rad - lw, start + sweepM, start, true); ctx.closePath(); ctx.clip()
      sheenArc(ctx, cx, cy, rad, lw, t, cols[i], { period: 4.6 + i * 0.5, phase: i * 0.3, span: 0.6, strength: 0.4 })
      ctx.restore()
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
  id: 'data.donut.share', lib: 'datakit', category: 'donut', tones: ['dark', 'light'], rubros: ['finanzas', 'tech', 'default'], weight: 1.1,
  real: true, needsStats: 1, needsType: 'percent',   // MIGRADO (item L152): el share del donut es un % REAL (statPercent); el selector solo lo elige si hay un % real -> nunca escena vacia.
  register: 'neutral', intensity: 'medium', tags: ['donut', 'porcentaje', 'share'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env
    const pr = statPercent(content); if (!pr) return   // honestidad: solo con un % real
    // donut de 1 valor (share dominante) con el hueco grande y el % grande adentro. Limpio.
    const cx = W / 2, cy = H * 0.42, rad = W * 0.3, lw = 34
    const pct = pr.pct
    const ap = eOutCubic(inv(t, 0.1, 1.1)), start = -TAU / 4
    ctx.lineCap = 'butt'; ctx.lineWidth = lw
    // resto (riel tenue)
    ctx.strokeStyle = hairline(pal, 0.1); ctx.beginPath(); ctx.arc(cx, cy, rad, 0, TAU); ctx.stroke()
    // share de acento
    const sweepS = TAU * pct * ap
    ctx.strokeStyle = pal.accent; ctx.beginPath(); ctx.arc(cx, cy, rad, start, start + sweepS); ctx.stroke()
    // sheen idle recorre el share (clip al barrido)
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, rad + lw, start, start + sweepS); ctx.arc(cx, cy, rad - lw, start + sweepS, start, true); ctx.closePath(); ctx.clip()
    sheenArc(ctx, cx, cy, rad, lw, t, pal.accent, { period: 4.4, span: 0.6, strength: 0.4 })
    ctx.restore()
    // % central en mono (tinta en claro) = el VALOR REAL con count-up
    drawText(ctx, statDisplay(pr.st, t, 0.1, 1.1), cx, cy - 4, { size: 58, weight: 700, family: fonts.accent, maxW: rad * 1.4, color: numColor(pal) })
    drawText(ctx, shortLabel(pr.st.label, 3) || 'del mercado', cx, cy + 40, { size: 16, weight: 600, family: fonts.text, maxW: rad * 1.5, color: pal.dim, alpha: inv(t, 0.5, 1) })
    // etiqueta inferior (claim): drawWrapped -> envuelve en <=2 lineas y achica antes de elidir (claims largos entran completos)
    const lab = content.claim
    if (lab) drawWrapped(ctx, lab, cx, cy + rad + 56, { size: 19, min: 14, weight: 600, family: fonts.text, maxW: W * 0.78, maxLines: 2, color: pal.dim, alpha: inv(t, 0.7, 1.2) })
  },
})

register({
  id: 'data.donut.breakdown', lib: 'datakit', category: 'donut', tones: ['dark', 'light'], rubros: ['finanzas', 'tech', 'default'], weight: 1,
  register: 'corporate', intensity: 'medium', tags: ['donut', 'desglose', 'proporcion'],
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
    // sheen idle orbita el donut entero (clip al anillo)
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, rad + lw / 2, 0, TAU); ctx.arc(cx, cy, rad - lw / 2, 0, TAU, true); ctx.clip()
    sheenArc(ctx, cx, cy, rad, lw, t, pal.accent, { period: 5.2, span: 0.7, strength: 0.36 })
    ctx.restore()
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
  id: 'data.compare.beforeafter', lib: 'datakit', category: 'comparacion/proporcion', tones: ['dark', 'light'], rubros: ['finanzas', 'fitness', 'default'], weight: 1.1,
  register: 'neutral', intensity: 'medium', tags: ['antes-despues', 'comparacion', 'mejora'],
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
    const fwB = Math.max(bh, bw * vB * apB)
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(x0, yB, fwB, bh, bh / 2); ctx.fill()
    sheen(ctx, x0, yB, fwB, bh, t, { period: 3.6, strength: 0.18, r: bh / 2 })
    drawText(ctx, Math.round(vB * 100 * apB) + '%', x0 + bw + 12, yB + bh / 2, { size: 16, weight: 700, family: fonts.accent, align: 'left', maxW: W * 0.14, color: numColor(pal), alpha: apB })
    // delta de mejora (chip de acento)
    const dAp = inv(t, 0.7, 1.2)
    if (dAp > 0) {
      const delta = Math.round((vB - vA) / vA * 100)
      ctx.save(); ctx.globalAlpha = dAp
      const txt = '+' + delta + '% mejor'
      ctx.font = `700 18px "${fonts.accent}"`; const tw = ctx.measureText(txt).width
      const px = W / 2 - (tw + 36) / 2, py = H * 0.64
      ctx.save(); ctx.globalAlpha = dAp * glow(t, 0, 0.82, 1)
      ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(px, py, tw + 36, 38, 19); ctx.fill(); ctx.restore()
      drawText(ctx, txt, px + (tw + 36) / 2, py + 19, { size: 18, weight: 700, family: fonts.accent, maxW: tw + 30, color: pal.onAccent })
      ctx.restore()
    }
  },
})

register({
  id: 'data.compare.icongrid', lib: 'datakit', category: 'comparacion/proporcion', tones: ['dark', 'light'], rubros: ['salud', 'educacion', 'default'], weight: 0.9,
  register: 'friendly', intensity: 'medium', tags: ['proporcion', 'pictograma', 'fraccion'],
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
      // onda idle de respiracion que recorre la grilla (los llenos respiran + brillan)
      const wv = idleK(t) * Math.sin(t * 1.6 - i * 0.5)
      const sc = clamp(ap, 0, 1.1) * (1 + (i < filled ? wv * 0.04 : 0))
      ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc)
      if (i < filled) { ctx.save(); ctx.globalAlpha = glow(t, -i * 0.5, 0.78, 1); ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.arc(0, 0, dotR, 0, TAU); ctx.fill(); ctx.restore() }
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
  id: 'data.progress.checklist', lib: 'datakit', category: 'timeline/proceso', tones: ['dark', 'light'], rubros: ['tech', 'educacion', 'default'], weight: 1,
  register: 'friendly', intensity: 'medium', tags: ['checklist', 'proceso', 'completado'],
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
    const pfw = Math.max(8, pbw * prog)
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(pbx, pby, pfw, 8, 4); ctx.fill()
    sheen(ctx, pbx, pby, pfw, 8, t, { period: 3, strength: 0.2, r: 4 })
    drawText(ctx, Math.round(prog * 100) + '%', pbx + pbw + 10, pby + 4, { size: 14, weight: 700, family: fonts.accent, align: 'left', maxW: W * 0.12, color: numColor(pal) })
    for (let i = 0; i < n; i++) {
      const y = top + i * gap
      const done = prog > (i + 0.5) / n
      const ap = inv(t, 0.15 + i * 0.12, 0.75 + i * 0.12)
      // halo idle que late en el ultimo item completado
      if (done && i === n - 1 && idleK(t) > 0.001) { const hp = ((t / 2.4) % 1 + 1) % 1; ctx.save(); ctx.globalAlpha = (1 - hp) * 0.4 * idleK(t); ctx.strokeStyle = pal.accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x0 - boxR - hp * 6, y - boxR - hp * 6, (boxR + hp * 6) * 2, (boxR + hp * 6) * 2, 6 + hp * 4); ctx.stroke(); ctx.restore() }
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
  real: true, needsStats: 2,   // MIGRADO (item L152): 2-3 KPIs REALES en columna; sin >=2 se auto-salta.
  register: 'neutral', intensity: 'medium', tags: ['kpi', 'tablero', 'mono'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env
    // 2-3 KPIs REALES en columna (VALOR real + etiqueta). Tablero de metricas.
    const rs = (content.stats || []).filter(s => s && (s.value || s.value === 0)).slice(0, 3)
    if (rs.length < 2) return   // honestidad: solo con >=2 stats reales
    const n = rs.length, top = H * 0.26, gap = H * 0.18, xL = W * 0.14
    for (let i = 0; i < n; i++) {
      const y = top + i * gap
      const ap = inv(t, 0.1 + i * 0.15, 0.7 + i * 0.15)
      // etiqueta arriba
      drawText(ctx, shortLabel(rs[i].label, 3), xL, y - 26, { size: 14, weight: 600, family: fonts.text, align: 'left', maxW: W * 0.6, color: pal.dim, alpha: clamp(ap * 1.3, 0, 1) })
      // numero grande mono = el VALOR REAL con count-up
      drawText(ctx, statDisplay(rs[i], t, 0.1 + i * 0.15, 0.7 + i * 0.15), xL, y + 6, { size: 86, weight: 700, family: fonts.accent, align: 'left', maxW: W * 0.72, color: numColor(pal), alpha: clamp(ap * 1.2, 0, 1) })
      // (chip de DELTA '+X%' ELIMINADO: fabricaba una tendencia inventada por fila -> deshonesto.)
      // regla divisoria
      if (i < n - 1) { ctx.strokeStyle = hairline(pal, 0.08); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(xL, y + gap / 2); ctx.lineTo(W * 0.86, y + gap / 2); ctx.stroke() }
    }
  },
})

register({
  id: 'data.series.bars30', lib: 'datakit', category: 'series/tendencia', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  register: 'neutral', intensity: 'medium', tags: ['serie', 'columnas', 'tendencia'],
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
      sheenV(ctx, bx, base - bhh, bw, bhh, t, { period: 4, phase: i * 0.12, strength: i === peak ? 0.2 : 0.09, r: 3 })
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

// =====================================================================================================
// =================================== OLA 3 — mas data-viz ============================================
// =====================================================================================================
// Mismas REGLAS: numero en MONO via fonts.accent; en claro el numero va en TINTA (numColor); el acento queda
// para barra/arco/regla/aguja. Valores estables por seedFor(seed,'data'); t solo anima la entrada. Puro.
// Helpers nuevos (puros) abajo del bloque.

// ====================================================================== numeros-animados (mas)
register({
  id: 'data.number.unit', lib: 'datakit', category: 'numeros-animados', tones: ['dark', 'light'], rubros: ['*'], weight: 1.1,
  real: true, needsStats: 1,   // MIGRADO (item L152): lee la 1ra stat REAL; el selector solo lo elige con realStats>=1.
  register: 'neutral', intensity: 'bold', tags: ['hero', 'stat', 'unidad', 'mono'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env
    const st = realStat(content, 0); if (!st) return   // honestidad: solo con stat real (el selector ya lo gatea; doble-guard)
    // numero hero = el VALOR REAL (el value ya trae su prefijo/sufijo: '$2.4M','92%','28.725') con count-up en la parte numerica.
    const cx = W / 2, cy = H * 0.44
    drawText(ctx, statDisplay(st, t, 0.1, 1.2), cx, cy, { size: 100, weight: 700, family: fonts.accent, maxW: W * 0.82, color: numColor(pal), shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.35)' : null })
    // regla de acento bajo el numero -> respira ancho + glow idle
    const ru = eOutCubic(inv(t, 0.5, 1.2)), rw = 110 * ru * breath(t, 0, 0.02)
    ctx.save(); ctx.globalAlpha = glow(t, 0, 0.78, 1)
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(cx - rw / 2, cy + 62, rw, 6, 3); ctx.fill()
    ctx.restore()
    const label = st.label || content.tagline || content.claim || ''
    if (label) drawText(ctx, label, cx, cy + 100, { size: 21, weight: 600, family: fonts.text, maxW: W * 0.78, color: pal.dim, alpha: inv(t, 0.7, 1.2) })
  },
})

register({
  id: 'data.number.odometer', lib: 'datakit', category: 'numeros-animados', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  register: 'neutral', intensity: 'medium', tags: ['contador', 'odometro', 'mono'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env, r = seedFor(env.seed, 'data')
    // contador estilo odometro: cada digito en su "celda" con marco fino. Numero entero grande (ej visitas).
    const target = Math.round(range(r, 10000, 998000))
    const val = Math.round(countTo(target, t, 0.1, 1.3))
    const str = fmtInt(val)
    // medir celdas: digitos en celda, separadores (.) sin celda
    const cellW = 46, cellH = 70, gap = 6, sepW = 16, cy = H * 0.42
    let totalW = 0
    for (const ch of str) totalW += (ch === '.' ? sepW : cellW + gap)
    totalW -= gap
    let x = W / 2 - totalW / 2
    const ap = inv(t, 0.1, 0.6)
    let cellIdx = 0, nCells = 0; for (const ch of str) if (ch !== '.') nCells++
    const ik = idleK(t)
    for (const ch of str) {
      if (ch === '.') { x += sepW; continue }
      // celda
      ctx.save(); ctx.globalAlpha = clamp(ap * 1.4, 0, 1)
      ctx.fillStyle = pal.surface; ctx.beginPath(); ctx.roundRect(x, cy - cellH / 2, cellW, cellH, 8); ctx.fill()
      ctx.strokeStyle = hairline(pal, 0.16); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(x, cy - cellH / 2, cellW, cellH, 8); ctx.stroke()
      // brillo idle de acento que recorre las celdas (un marco se enciende por turno)
      if (ik > 0.001) { const wp = ((t / 2.6) % 1 + 1) % 1 * nCells; const near = clamp(1 - Math.abs(cellIdx - wp), 0, 1); if (near > 0) { ctx.save(); ctx.globalAlpha = near * 0.5 * ik; ctx.strokeStyle = pal.accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x, cy - cellH / 2, cellW, cellH, 8); ctx.stroke(); ctx.restore() } }
      // linea media del odometro (deco)
      ctx.strokeStyle = hairline(pal, 0.08); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 4, cy); ctx.lineTo(x + cellW - 4, cy); ctx.stroke()
      ctx.restore()
      drawText(ctx, ch, x + cellW / 2, cy, { size: 44, weight: 700, family: fonts.accent, maxW: cellW, color: numColor(pal), alpha: clamp(ap * 1.4, 0, 1) })
      x += cellW + gap; cellIdx++
    }
    // regla de acento debajo -> respira ancho + glow idle
    const rw = eOutCubic(inv(t, 0.5, 1.1)) * totalW * breath(t, 0, 0.015)
    ctx.save(); ctx.globalAlpha = glow(t, 0, 0.78, 1)
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(W / 2 - rw / 2, cy + cellH / 2 + 16, rw, 4, 2); ctx.fill()
    ctx.restore()
    const lab = content.tagline || content.claim
    if (lab) drawText(ctx, lab, W / 2, cy + cellH / 2 + 50, { size: 19, weight: 600, family: fonts.text, maxW: W * 0.8, color: pal.dim, alpha: inv(t, 0.7, 1.2) })
  },
})

// ====================================================================== barras (mas)
register({
  id: 'data.bars.progressrows', lib: 'datakit', category: 'barras', tones: ['dark', 'light'], rubros: ['*'], weight: 1.1,
  register: 'neutral', intensity: 'medium', tags: ['barras', 'progreso', 'skills'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env, r = seedFor(env.seed, 'data')
    // 4 barras de progreso etiqueta-arriba + % al final del riel (estilo "skills/cobertura"). Riel redondeado.
    const n = 4, x0 = W * 0.14, bw = W * 0.62, bh = 12, top = H * 0.3, gap = H * 0.12
    const labels = [content.brand, content.tagline, content.claim, content.cta]
    const def = ['Alcance', 'Interaccion', 'Mensajes', 'Cierres']
    const vals = Array.from({ length: n }, () => range(r, 0.45, 0.97))
    for (let i = 0; i < n; i++) {
      const y = top + i * gap
      const ap = eOutCubic(inv(t, 0.12 + i * 0.12, 0.9 + i * 0.12))
      drawText(ctx, shortLabel(labels[i], 2) || def[i], x0, y - 14, { size: 15, weight: 600, family: fonts.text, align: 'left', maxW: bw, color: pal.dim, alpha: ap })
      // riel
      ctx.fillStyle = hairline(pal, 0.09); ctx.beginPath(); ctx.roundRect(x0, y, bw, bh, bh / 2); ctx.fill()
      // relleno
      const fwR = Math.max(bh, bw * vals[i] * ap)
      ctx.fillStyle = i === 0 ? pal.accent : rgba(pal.accent, 0.6 + 0.1 * (n - i) / n)
      ctx.beginPath(); ctx.roundRect(x0, y, fwR, bh, bh / 2); ctx.fill()
      sheen(ctx, x0, y, fwR, bh, t, { period: 3.4, phase: i * 0.2, strength: i === 0 ? 0.18 : 0.1, r: bh / 2 })
      // % al final
      drawText(ctx, Math.round(vals[i] * 100 * ap) + '%', x0 + bw + 12, y + bh / 2, { size: 15, weight: 700, family: fonts.accent, align: 'left', maxW: W * 0.14, color: numColor(pal), alpha: ap })
    }
  },
})

register({
  id: 'data.bars.diverging', lib: 'datakit', category: 'barras', tones: ['dark', 'light'], rubros: ['*'], weight: 0.9,
  register: 'neutral', intensity: 'medium', tags: ['barras', 'divergente', 'balance'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env, r = seedFor(env.seed, 'data')
    // barras divergentes desde un eje central: positivo (acento, derecha) vs negativo (atenuado, izquierda).
    const n = 4, cxAxis = W * 0.52, top = H * 0.32, gap = H * 0.12, bh = 16, half = W * 0.32
    const labels = [content.brand, content.tagline, content.claim, content.cta]
    const def = ['Lun', 'Mar', 'Mie', 'Jue']
    const titulo = content.tagline || content.claim
    if (titulo) drawText(ctx, titulo, W / 2, H * 0.2, { size: 21, weight: 700, family: fonts.display, maxW: W * 0.84, color: pal.ink, alpha: inv(t, 0.1, 0.55) })
    // eje central
    ctx.strokeStyle = hairline(pal, 0.18); ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(cxAxis, top - 14); ctx.lineTo(cxAxis, top + (n - 1) * gap + bh + 14); ctx.stroke()
    for (let i = 0; i < n; i++) {
      const y = top + i * gap
      const ap = eOutCubic(inv(t, 0.12 + i * 0.1, 0.85 + i * 0.1))
      const pos = r() < 0.6                       // estable por seed
      const v = range(r, 0.35, 1)
      const len = half * v * ap
      ctx.fillStyle = pos ? pal.accent : rgba(pal.accent, 0.4)
      const bx = pos ? cxAxis : cxAxis - len
      if (pos) { ctx.beginPath(); ctx.roundRect(cxAxis, y, len, bh, [0, bh / 2, bh / 2, 0]); ctx.fill() }
      else { ctx.beginPath(); ctx.roundRect(cxAxis - len, y, len, bh, [bh / 2, 0, 0, bh / 2]); ctx.fill() }
      sheen(ctx, bx, y, len, bh, t, { period: 3.6, phase: i * 0.2, strength: pos ? 0.16 : 0.1, r: bh / 2 })
      // etiqueta del lado opuesto al valor
      drawText(ctx, shortLabel(labels[i], 1) || def[i], pos ? cxAxis - 10 : cxAxis + 10, y + bh / 2, { size: 13, weight: 600, family: fonts.text, align: pos ? 'right' : 'left', maxW: W * 0.16, color: pal.dim, alpha: ap })
      // valor en la punta
      const vx = pos ? cxAxis + len + 8 : cxAxis - len - 8
      drawText(ctx, (pos ? '+' : '-') + Math.round(v * 40 * ap), vx, y + bh / 2, { size: 13, weight: 700, family: fonts.accent, align: pos ? 'left' : 'right', maxW: W * 0.14, color: pos ? numColor(pal) : pal.dim, alpha: ap })
    }
  },
})

// ====================================================================== anillos / radiales (mas)
register({
  id: 'data.ring.dial', lib: 'datakit', category: 'anillos/radiales', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  real: true, needsStats: 1, needsType: 'percent',   // MIGRADO (item L152): la aguja barre un % REAL (statPercent); el selector solo lo elige si hay un % real -> nunca escena vacia.
  register: 'neutral', intensity: 'medium', tags: ['gauge', 'aguja', 'medidor'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env
    const pr = statPercent(content); if (!pr) return   // honestidad: solo con un % real
    // medidor de medio arco (180) con AGUJA que barre 0..max. Arco riel + arco de acento + aguja.
    const cx = W / 2, cy = H * 0.5, rad = W * 0.32, lw = 16
    const pct = pr.pct
    const ap = eOutCubic(inv(t, 0.1, 1.2))
    const a0 = Math.PI, a1 = TAU                    // semicirculo superior (de 180 a 360)
    ctx.lineCap = 'round'; ctx.lineWidth = lw
    // riel
    ctx.strokeStyle = hairline(pal, 0.1); ctx.beginPath(); ctx.arc(cx, cy, rad, a0, a1); ctx.stroke()
    // arco de acento
    const sweep = (a1 - a0) * pct * ap
    ctx.strokeStyle = pal.accent; ctx.beginPath(); ctx.arc(cx, cy, rad, a0, a0 + sweep); ctx.stroke()
    // aguja con micro-oscilacion idle (no cambia el dato: el % usa pct*ap, el angulo dibujado oscila ±)
    const na = a0 + sweep + idleK(t) * Math.sin(t * 1.3) * 0.018
    const nx = cx + Math.cos(na) * (rad - lw), ny = cy + Math.sin(na) * (rad - lw)
    ctx.strokeStyle = numColor(pal); ctx.lineWidth = 4; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(nx, ny); ctx.stroke()
    ctx.save(); ctx.globalAlpha = glow(t, 0, 0.8, 1); ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.arc(cx, cy, 9 * breath(t, 0, 0.05, 1.3), 0, TAU); ctx.fill(); ctx.restore()
    // numero (mono) bajo el centro = el VALOR REAL con count-up
    drawText(ctx, statDisplay(pr.st, t, 0.1, 1.2), cx, cy + 44, { size: 48, weight: 700, family: fonts.accent, maxW: rad * 1.6, color: numColor(pal) })
    const lab = pr.st.label || content.tagline || content.claim
    if (lab) drawText(ctx, lab, cx, cy + 92, { size: 18, weight: 600, family: fonts.text, maxW: W * 0.78, color: pal.dim, alpha: inv(t, 0.7, 1.2) })
  },
})

register({
  id: 'data.ring.dots', lib: 'datakit', category: 'anillos/radiales', tones: ['dark', 'light'], rubros: ['*'], weight: 0.9,
  real: true, needsStats: 1, needsType: 'percent',   // MIGRADO (item L152): N puntos llenos = un % REAL (statPercent); el selector solo lo elige si hay un % real -> nunca escena vacia.
  register: 'neutral', intensity: 'soft', tags: ['anillo', 'puntos', 'progreso'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env
    const pr = statPercent(content); if (!pr) return   // honestidad: solo con un % real
    // anillo de PUNTOS (24): N llenos de acento segun %, el resto en riel. Numero al centro.
    const cx = W / 2, cy = H * 0.42, rad = W * 0.3, nDots = 24
    const pct = pr.pct
    const ap = inv(t, 0.1, 1.1)
    const filled = nDots * pct
    for (let i = 0; i < nDots; i++) {
      const ang = -TAU / 4 + i * TAU / nDots
      const x = cx + Math.cos(ang) * rad, y = cy + Math.sin(ang) * rad
      const on = i < filled * ap
      const dap = spring(inv(t, 0.1 + i * 0.018, 0.6 + i * 0.018), { zeta: 0.5, freq: 2 })
      // cometa idle: una onda de brillo recorre los puntos llenos en circulo
      const wp = ((t / 2.8) % 1 + 1) % 1 * nDots
      const near = on ? clamp(1 - Math.abs(((i - wp + nDots) % nDots)) / 3, 0, 1) : 0
      const sc = clamp(dap, 0, 1.1) * (1 + idleK(t) * near * 0.18)
      ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc)
      if (on) { ctx.fillStyle = near > 0 ? lighten(pal.accent, idleK(t) * near * 0.4) : pal.accent; ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.fill() }
      else { ctx.fillStyle = hairline(pal, 0.16); ctx.beginPath(); ctx.arc(0, 0, 5, 0, TAU); ctx.fill() }
      ctx.restore()
    }
    drawText(ctx, statDisplay(pr.st, t, 0.1, 1.1), cx, cy - 2, { size: 50, weight: 700, family: fonts.accent, maxW: rad * 1.4, color: numColor(pal) })
    const lab = shortLabel(pr.st.label, 3) || 'completado'
    drawText(ctx, lab, cx, cy + 38, { size: 16, weight: 600, family: fonts.text, maxW: rad * 1.6, color: pal.dim, alpha: inv(t, 0.6, 1.1) })
  },
})

// ====================================================================== donut (mas)
register({
  id: 'data.donut.dual', lib: 'datakit', category: 'donut', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  register: 'neutral', intensity: 'medium', tags: ['donut', 'doble', 'comparacion'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env, r = seedFor(env.seed, 'data')
    // dos donuts chicos lado a lado (metrica A vs B), cada uno con su % y etiqueta. Comparacion compacta.
    const cyc = H * 0.42, rad = W * 0.16, lw = 18
    const cxs = [W * 0.3, W * 0.7]
    const pcts = [range(r, 0.5, 0.85), range(r, 0.55, 0.92)]
    const cols = [pal.accent, pal.accent2]
    const labs = [shortLabel(content.brand, 1) || 'Antes', shortLabel(content.cta, 1) || 'Ahora']
    const ap = eOutCubic(inv(t, 0.1, 1.1)), start = -TAU / 4
    const titulo = content.tagline || content.claim
    if (titulo) drawText(ctx, titulo, W / 2, H * 0.2, { size: 21, weight: 700, family: fonts.display, maxW: W * 0.84, color: pal.ink, alpha: inv(t, 0.1, 0.55) })
    for (let k = 0; k < 2; k++) {
      const cx = cxs[k]
      ctx.lineCap = 'round'; ctx.lineWidth = lw
      ctx.strokeStyle = hairline(pal, 0.1); ctx.beginPath(); ctx.arc(cx, cyc, rad, 0, TAU); ctx.stroke()
      const sweepD = TAU * pcts[k] * ap
      ctx.strokeStyle = cols[k]; ctx.beginPath(); ctx.arc(cx, cyc, rad, start, start + sweepD); ctx.stroke()
      // sheen idle orbita cada donut (clip al barrido), desfasado por donut
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cyc, rad + lw, start, start + sweepD); ctx.arc(cx, cyc, rad - lw, start + sweepD, start, true); ctx.closePath(); ctx.clip()
      sheenArc(ctx, cx, cyc, rad, lw, t, cols[k], { period: 4.2, phase: k * 0.4, span: 0.7, strength: 0.42 })
      ctx.restore()
      drawText(ctx, Math.round(pcts[k] * 100 * ap) + '%', cx, cyc, { size: 30, weight: 700, family: fonts.accent, maxW: rad * 1.6, color: numColor(pal) })
      drawText(ctx, labs[k], cx, cyc + rad + 30, { size: 16, weight: 600, family: fonts.text, maxW: W * 0.32, color: pal.dim, alpha: inv(t, 0.6, 1.1) })
    }
  },
})

// ====================================================================== series / tendencia (mas)
register({
  id: 'data.series.dualline', lib: 'datakit', category: 'series/tendencia', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  register: 'neutral', intensity: 'medium', tags: ['serie', 'doble-linea', 'comparacion'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env, r = seedFor(env.seed, 'data')
    // dos lineas (la nuestra en acento sube; la otra atenuada plana) -> contraste de tendencia. Leyenda abajo.
    const n = 12, x0 = W * 0.12, x1 = W * 0.88, yTop = H * 0.3, yBot = H * 0.56
    const mk = (slope, jitter) => { const p = []; for (let i = 0; i < n; i++) { const tr = i / (n - 1); const v = clamp(0.25 + tr * slope + (r() - 0.5) * jitter, 0.05, 1); p.push({ x: lerp(x0, x1, tr), y: lerp(yBot, yTop, v), v }) } return p }
    const a = mk(0.6, 0.16)      // la nuestra (sube fuerte)
    const b = mk(0.12, 0.14)     // la otra (casi plana)
    const draw = eOutCubic(inv(t, 0.1, 1.3))
    const drawLine = (pts, col, wlw) => {
      const shown = clamp(draw * (n - 1), 0, n - 1), li = Math.floor(shown), fr = shown - li
      ctx.strokeStyle = col; ctx.lineWidth = wlw; ctx.lineJoin = 'round'; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y)
      for (let i = 1; i <= li; i++) ctx.lineTo(pts[i].x, pts[i].y)
      if (li < n - 1) ctx.lineTo(lerp(pts[li].x, pts[li + 1].x, fr), lerp(pts[li].y, pts[li + 1].y, fr))
      ctx.stroke()
      return { hx: li < n - 1 ? lerp(pts[li].x, pts[li + 1].x, fr) : pts[n - 1].x, hy: li < n - 1 ? lerp(pts[li].y, pts[li + 1].y, fr) : pts[n - 1].y }
    }
    const titulo = content.tagline || content.claim
    if (titulo) drawText(ctx, titulo, W / 2, H * 0.2, { size: 21, weight: 700, family: fonts.display, maxW: W * 0.84, color: pal.ink, alpha: inv(t, 0.1, 0.55) })
    drawLine(b, rgba(pal.accent2 || pal.accent, 0.45), 2.5)
    const ha = drawLine(a, pal.accent, 3.5)
    if (idleK(t) > 0.001) { const pp = ((t / 2.2) % 1 + 1) % 1; ctx.save(); ctx.globalAlpha = (1 - pp) * 0.5 * idleK(t); ctx.strokeStyle = lighten(pal.accent, 0.3); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ha.hx, ha.hy, 5 + pp * 12, 0, TAU); ctx.stroke(); ctx.restore() }
    ctx.save(); ctx.globalAlpha = glow(t, 0, 0.75, 1); ctx.fillStyle = lighten(pal.accent, 0.3); ctx.beginPath(); ctx.arc(ha.hx, ha.hy, 5 * breath(t, 0, 0.06, 1.4), 0, TAU); ctx.fill(); ctx.restore()
    // leyenda abajo
    const lAp = inv(t, 0.7, 1.2)
    if (lAp > 0) {
      ctx.save(); ctx.globalAlpha = lAp
      const ly = H * 0.66, lx = W / 2 - 110
      ctx.strokeStyle = pal.accent; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + 22, ly); ctx.stroke()
      drawText(ctx, shortLabel(content.brand, 1) || 'Nosotros', lx + 30, ly, { size: 13, weight: 600, family: fonts.text, align: 'left', maxW: W * 0.24, color: pal.dim })
      ctx.strokeStyle = rgba(pal.accent2 || pal.accent, 0.45); ctx.beginPath(); ctx.moveTo(lx + 130, ly); ctx.lineTo(lx + 152, ly); ctx.stroke()
      drawText(ctx, 'Resto', lx + 160, ly, { size: 13, weight: 600, family: fonts.text, align: 'left', maxW: W * 0.2, color: pal.dim })
      ctx.restore()
    }
  },
})

// ====================================================================== comparacion / proporcion (mas)
register({
  id: 'data.compare.battery', lib: 'datakit', category: 'comparacion/proporcion', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  real: true, needsStats: 1, needsType: 'percent',   // MIGRADO (item L152): las celdas llenas = un % REAL (statPercent); el selector solo lo elige si hay un % real -> nunca escena vacia.
  register: 'neutral', intensity: 'medium', tags: ['proporcion', 'segmentos', 'meta'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env
    const pr = statPercent(content); if (!pr) return   // honestidad: solo con un % real
    // barra "bateria" segmentada (10 celdas): N llenas de acento = progreso hacia la meta. % grande arriba.
    const cells = 10, x0 = W * 0.12, bw = W * 0.76, bh = 44, y = H * 0.46
    const gap = 4, cw = (bw - gap * (cells - 1)) / cells
    const pct = pr.pct
    const ap = eOutCubic(inv(t, 0.1, 1.1))
    const filled = cells * pct * ap
    // % grande = el VALOR REAL con count-up
    drawText(ctx, statDisplay(pr.st, t, 0.1, 1.1), W / 2, y - 56, { size: 56, weight: 700, family: fonts.accent, maxW: bw, color: numColor(pal), alpha: inv(t, 0.3, 0.9) })
    for (let i = 0; i < cells; i++) {
      const cx = x0 + i * (cw + gap)
      const frac = clamp(filled - i, 0, 1)
      // celda riel
      ctx.fillStyle = hairline(pal, 0.09); ctx.beginPath(); ctx.roundRect(cx, y, cw, bh, 5); ctx.fill()
      if (frac > 0) {
        // pulso idle de carga: la ultima celda llena late; las demas brillan en onda
        const last = frac < 1 || i === Math.floor(filled - 0.0001)
        const gl = last ? glow(t, 0, 0.7, 1) : (1 - idleK(t) * 0.12 * pulse01(t, -i * 0.5))
        ctx.save(); ctx.globalAlpha = clamp(gl, 0, 1); ctx.beginPath(); ctx.roundRect(cx, y, cw, bh, 5); ctx.clip()
        ctx.fillStyle = pal.accent; ctx.fillRect(cx, y + bh * (1 - frac), cw, bh * frac)
        ctx.restore()
      }
    }
    // etiqueta REAL del stat
    drawText(ctx, shortLabel(pr.st.label, 4) || 'hacia la meta', W / 2, y + bh + 34, { size: 18, weight: 600, family: fonts.text, maxW: W * 0.8, color: pal.dim, alpha: inv(t, 0.6, 1.1) })
  },
})

register({
  id: 'data.compare.vsbar', lib: 'datakit', category: 'comparacion/proporcion', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  register: 'neutral', intensity: 'medium', tags: ['versus', 'comparacion', 'cuota'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env, r = seedFor(env.seed, 'data')
    // dos barras horizontales encontradas (A vs B) con un "VS" al medio. La nuestra (acento) gana.
    const cxc = W / 2, top = H * 0.4, gap = H * 0.13, bh = 30, maxL = W * 0.34
    const vA = range(r, 0.72, 1), vB = range(r, 0.35, 0.62)
    const apA = eOutCubic(inv(t, 0.15, 0.9)), apB = eOutCubic(inv(t, 0.3, 1.05))
    const titulo = content.tagline || content.claim
    if (titulo) drawText(ctx, titulo, W / 2, H * 0.22, { size: 21, weight: 700, family: fonts.display, maxW: W * 0.84, color: pal.ink, alpha: inv(t, 0.1, 0.55) })
    // A (arriba, acento, crece a la derecha desde el centro-izq)
    const yA = top
    const lA = maxL * vA * apA
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(cxc - lA, yA, lA, bh, [bh / 2, 0, 0, bh / 2]); ctx.fill()
    sheen(ctx, cxc - lA, yA, lA, bh, t, { period: 3.4, strength: 0.18, r: bh / 2 })
    drawText(ctx, shortLabel(content.brand, 2) || 'Nosotros', cxc - lA - 10, yA + bh / 2, { size: 14, weight: 700, family: fonts.text, align: 'right', maxW: W * 0.3, color: numColor(pal), alpha: apA })
    drawText(ctx, Math.round(vA * 100 * apA) + '%', cxc - 10, yA + bh / 2, { size: 16, weight: 700, family: fonts.accent, align: 'right', maxW: lA, color: pal.onAccent, alpha: apA })
    // B (abajo, atenuado, crece a la derecha)
    const yB = top + gap
    const lB = maxL * vB * apB
    ctx.fillStyle = rgba(pal.accent, 0.35); ctx.beginPath(); ctx.roundRect(cxc, yB, lB, bh, [0, bh / 2, bh / 2, 0]); ctx.fill()
    drawText(ctx, 'Resto', cxc + lB + 10, yB + bh / 2, { size: 14, weight: 600, family: fonts.text, align: 'left', maxW: W * 0.3, color: pal.dim, alpha: apB })
    drawText(ctx, Math.round(vB * 100 * apB) + '%', cxc + 10, yB + bh / 2, { size: 16, weight: 700, family: fonts.accent, align: 'left', maxW: lB, color: numColor(pal), alpha: apB })
    // VS al medio
    const vAp = spring(inv(t, 0.1, 0.7), { zeta: 0.45, freq: 2.2 })
    const vsB = breath(t, 0, 0.025, 1.1)
    ctx.save(); ctx.globalAlpha = clamp(vAp, 0, 1); ctx.translate(cxc, (yA + yB + bh) / 2); ctx.scale(clamp(vAp, 0, 1.1) * vsB, clamp(vAp, 0, 1.1) * vsB)
    ctx.fillStyle = pal.bg0; ctx.beginPath(); ctx.arc(0, 0, 22, 0, TAU); ctx.fill()
    ctx.save(); ctx.globalAlpha *= glow(t, 0, 0.7, 1); ctx.strokeStyle = pal.accent; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 0, 22, 0, TAU); ctx.stroke(); ctx.restore()
    drawText(ctx, 'VS', 0, 1, { size: 16, weight: 700, family: fonts.accent, maxW: 40, color: numColor(pal) })
    ctx.restore()
  },
})

// ====================================================================== rating / prueba-social (mas)
register({
  id: 'data.rating.bar', lib: 'datakit', category: 'rating/prueba-social', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  register: 'friendly', intensity: 'medium', tags: ['rating', 'distribucion', 'reviews'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env, r = seedFor(env.seed, 'data')
    // distribucion de reviews: filas de 5 a 1 estrellas, barra por fila (la de 5 domina). Score grande a la izq.
    const score = range(r, 4.3, 4.95)
    const reviews = Math.round(range(r, 120, 2400))
    // score + estrellitas a la izquierda
    drawText(ctx, score.toFixed(1), W * 0.24, H * 0.34, { size: 64, weight: 700, family: fonts.accent, maxW: W * 0.4, color: numColor(pal), alpha: inv(t, 0.2, 0.8) })
    const sAp = inv(t, 0.3, 0.9)
    for (let i = 0; i < 5; i++) {
      const sx = W * 0.12 + i * 22
      const on = i < Math.round(score)
      const tw = on ? 0.34 * (1 + idleK(t) * Math.sin(t * 1.5 - i * 0.6) * 0.04) : 0.34
      ctx.save(); ctx.translate(sx, H * 0.42); ctx.scale(tw, tw); ctx.globalAlpha = sAp
      starPath(ctx, W * 0.05); ctx.fillStyle = on ? lighten(pal.accent, idleK(t) * pulse01(t, -i * 0.6) * 0.2) : hairline(pal, 0.2); ctx.fill()
      ctx.restore()
    }
    drawText(ctx, fmtInt(reviews) + ' reviews', W * 0.24, H * 0.47, { size: 14, weight: 600, family: fonts.text, maxW: W * 0.4, color: pal.dim, alpha: inv(t, 0.5, 1) })
    // distribucion a la derecha
    const x0 = W * 0.5, bw = W * 0.32, bh = 9, top = H * 0.3, gap = H * 0.045
    const dist = [0.72, 0.18, 0.06, 0.02, 0.02]   // forma estable (5★ domina)
    for (let i = 0; i < 5; i++) {
      const y = top + i * gap
      const ap = eOutCubic(inv(t, 0.2 + i * 0.08, 0.9 + i * 0.08))
      drawText(ctx, String(5 - i), x0 - 16, y + bh / 2, { size: 12, weight: 700, family: fonts.accent, align: 'right', maxW: 16, color: pal.dim, alpha: ap })
      ctx.fillStyle = hairline(pal, 0.1); ctx.beginPath(); ctx.roundRect(x0, y, bw, bh, bh / 2); ctx.fill()
      const fwd = Math.max(bh, bw * dist[i] * ap)
      ctx.fillStyle = i === 0 ? pal.accent : rgba(pal.accent, 0.45)
      ctx.beginPath(); ctx.roundRect(x0, y, fwd, bh, bh / 2); ctx.fill()
      if (i === 0) sheen(ctx, x0, y, fwd, bh, t, { period: 3.2, strength: 0.2, r: bh / 2 })
    }
    const lab = content.tagline || content.claim
    if (lab) drawText(ctx, lab, W / 2, H * 0.62, { size: 18, weight: 600, family: fonts.text, maxW: W * 0.8, color: pal.dim, alpha: inv(t, 0.7, 1.2) })
  },
})

// ====================================================================== timeline / proceso (mas)
register({
  id: 'data.timeline.milestones', lib: 'datakit', category: 'timeline/proceso', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  register: 'neutral', intensity: 'medium', tags: ['timeline', 'hitos', 'horizontal'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env, r = seedFor(env.seed, 'data')
    // linea de tiempo HORIZONTAL con 4 hitos (punto + fecha-mono arriba + etiqueta abajo). La linea se dibuja.
    const n = 4, cy = H * 0.46, x0 = W * 0.14, x1 = W * 0.86, span = x1 - x0
    const labels = [content.brand, content.tagline, content.claim, content.cta]
    const def = ['Inicio', 'Prueba', 'Ajuste', 'Escala']
    const titulo = content.tagline || ''
    if (titulo) drawText(ctx, titulo, W / 2, H * 0.24, { size: 21, weight: 700, family: fonts.display, maxW: W * 0.84, color: pal.ink, alpha: inv(t, 0.1, 0.55) })
    // riel + progreso
    ctx.lineCap = 'round'; ctx.lineWidth = 4
    ctx.strokeStyle = hairline(pal, 0.12); ctx.beginPath(); ctx.moveTo(x0, cy); ctx.lineTo(x1, cy); ctx.stroke()
    const prog = eOutCubic(inv(t, 0.1, 1.1))
    const xProg = lerp(x0, x1, prog)
    ctx.strokeStyle = pal.accent; ctx.beginPath(); ctx.moveTo(x0, cy); ctx.lineTo(xProg, cy); ctx.stroke()
    // idle: chispa recorre la parte de acento de la linea
    const ik = idleK(t)
    if (ik > 0.001 && xProg > x0 + 6) { const pp = ((t / 2.6) % 1 + 1) % 1, dx = lerp(x0 + 4, xProg - 4, pp); ctx.save(); ctx.globalAlpha = ik * Math.sin(pp * Math.PI) * 0.85; ctx.fillStyle = lighten(pal.accent, 0.4); ctx.beginPath(); ctx.arc(dx, cy, 4, 0, TAU); ctx.fill(); ctx.restore() }
    for (let i = 0; i < n; i++) {
      const x = x0 + (span * i) / (n - 1)
      const reach = inv(prog, i / (n - 1) - 0.02, i / (n - 1) + 0.1)
      const ap = eOutBack01(reach)
      const week = (i + 1) * 2     // "Sem 2/4/6/8"
      // fecha-mono arriba
      drawText(ctx, 'Sem ' + week, x, cy - 38, { size: 13, weight: 700, family: fonts.accent, maxW: span / n, color: reach > 0.5 ? numColor(pal) : pal.dim, alpha: clamp(0.4 + ap * 0.6, 0, 1) })
      // halo idle que late en hitos alcanzados
      if (reach > 0.5 && ik > 0.001) { const hp = ((t / 2.4 + i * 0.22) % 1 + 1) % 1; ctx.save(); ctx.globalAlpha = (1 - hp) * 0.35 * ik; ctx.strokeStyle = pal.accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, cy, 11 + hp * 8, 0, TAU); ctx.stroke(); ctx.restore() }
      // nodo
      ctx.save(); ctx.translate(x, cy)
      ctx.fillStyle = pal.bg0; ctx.beginPath(); ctx.arc(0, 0, 11, 0, TAU); ctx.fill()
      ctx.lineWidth = 3; ctx.strokeStyle = reach > 0.5 ? pal.accent : hairline(pal, 0.25); ctx.beginPath(); ctx.arc(0, 0, 11, 0, TAU); ctx.stroke()
      if (reach > 0.5) { ctx.save(); ctx.globalAlpha = glow(t, i * 0.5, 0.7, 1); ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.arc(0, 0, 5 * clamp(ap, 0, 1) * breath(t, i * 0.5, 0.06, 1.2), 0, TAU); ctx.fill(); ctx.restore() }
      ctx.restore()
      // etiqueta abajo
      drawText(ctx, shortLabel(labels[i], 1) || def[i], x, cy + 38, { size: 14, weight: 600, family: fonts.text, maxW: span / n + 10, color: reach > 0.5 ? pal.ink : pal.dim, alpha: clamp(0.4 + ap * 0.6, 0, 1) })
    }
  },
})

// ====================================================================== progreso
register({
  id: 'data.progress.radialsteps', lib: 'datakit', category: 'progreso', tones: ['dark', 'light'], rubros: ['*'], weight: 1.1,
  register: 'neutral', intensity: 'medium', tags: ['progreso', 'anillo', 'pasos'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env, r = seedFor(env.seed, 'data')
    // anillo de progreso por PASOS (5 segmentos SEPARADOS): los completados en acento, el resto en riel.
    // target estable por seed (cuantos pasos van); t anima cuantos se "encienden". Paso N/5 al centro.
    const cx = W / 2, cy = H * 0.42, rad = W * 0.3, lw = 18, steps = 5
    const target = 3 + Math.floor(r() * 2)          // 3 o 4 de 5 (estable por seed)
    const prog = eOutCubic(inv(t, 0.1, 1.1))
    const lit = target * prog                         // 0..target, animado
    const start = -TAU / 4, segGap = 0.16             // hueco GRANDE entre segmentos -> stepping legible
    const segArc = (TAU - segGap * steps) / steps
    ctx.lineCap = 'round'; ctx.lineWidth = lw
    for (let i = 0; i < steps; i++) {
      const a0 = start + i * (segArc + segGap)
      // riel del segmento
      ctx.strokeStyle = hairline(pal, 0.1); ctx.beginPath(); ctx.arc(cx, cy, rad, a0, a0 + segArc); ctx.stroke()
      // relleno: completo si i<floor(lit), parcial si es el que esta encendiendo
      const fill = clamp(lit - i, 0, 1)
      if (fill > 0.02) {
        // glow idle por onda que recorre los segmentos encendidos
        ctx.save(); ctx.globalAlpha = glow(t, -i * 0.55, 0.78, 1)
        ctx.strokeStyle = i < target ? pal.accent : hairline(pal, 0.1); ctx.beginPath(); ctx.arc(cx, cy, rad, a0, a0 + segArc * fill); ctx.stroke()
        ctx.restore()
      }
    }
    // centro: paso actual / total (cuenta hasta target)
    const cur = Math.round(lit)
    drawText(ctx, cur + '/' + steps, cx, cy - 6, { size: 52, weight: 700, family: fonts.accent, maxW: rad * 1.4, color: numColor(pal) })
    drawText(ctx, 'pasos', cx, cy + 34, { size: 16, weight: 600, family: fonts.text, maxW: rad * 1.4, color: pal.dim, alpha: inv(t, 0.5, 1) })
    const lab = content.tagline || content.claim
    if (lab) drawText(ctx, lab, cx, cy + rad + 50, { size: 18, weight: 600, family: fonts.text, maxW: W * 0.8, color: pal.dim, alpha: inv(t, 0.7, 1.2) })
  },
})

register({
  id: 'data.progress.ringpct', lib: 'datakit', category: 'progreso', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  real: true, needsStats: 1, needsType: 'percent',   // MIGRADO (item L152): el anillo se llena por un % REAL (statPercent); el selector solo lo elige si hay un % real -> nunca escena vacia.
  register: 'neutral', intensity: 'soft', tags: ['progreso', 'anillo', 'porcentaje'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env
    const pr = statPercent(content); if (!pr) return   // honestidad: solo con un % real
    // anillo de progreso fino con punto-cabeza + numero grande contando. Limpio, foco en el %.
    const cx = W / 2, cy = H * 0.42, rad = W * 0.31, lw = 12
    const pct = pr.pct
    const ap = eOutCubic(inv(t, 0.1, 1.2))
    const start = -TAU / 4, sweep = TAU * pct * ap
    ctx.lineCap = 'round'; ctx.lineWidth = lw
    ctx.strokeStyle = hairline(pal, 0.1); ctx.beginPath(); ctx.arc(cx, cy, rad, 0, TAU); ctx.stroke()
    ctx.strokeStyle = pal.accent; ctx.beginPath(); ctx.arc(cx, cy, rad, start, start + sweep); ctx.stroke()
    // sheen idle recorre el arco lleno
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, rad + lw, start, start + sweep); ctx.arc(cx, cy, rad - lw, start + sweep, start, true); ctx.closePath(); ctx.clip()
    sheenArc(ctx, cx, cy, rad, lw, t, pal.accent, { period: 4.2, span: 0.55, strength: 0.45 })
    ctx.restore()
    // punto-cabeza con glow idle
    const hx = cx + Math.cos(start + sweep) * rad, hy = cy + Math.sin(start + sweep) * rad
    ctx.save(); ctx.globalAlpha = glow(t, 0, 0.75, 1)
    ctx.fillStyle = lighten(pal.accent, 0.3); ctx.beginPath(); ctx.arc(hx, hy, lw * 0.5 * breath(t, 0, 0.06, 1.3), 0, TAU); ctx.fill(); ctx.restore()
    ctx.fillStyle = pal.bg0; ctx.beginPath(); ctx.arc(hx, hy, lw * 0.2, 0, TAU); ctx.fill()
    // numero grande contando (mono) = el VALOR REAL con count-up
    drawText(ctx, statDisplay(pr.st, t, 0.1, 1.2), cx, cy - 2, { size: 60, weight: 700, family: fonts.accent, maxW: rad * 1.5, color: numColor(pal) })
    drawText(ctx, shortLabel(pr.st.label, 3) || 'logrado', cx, cy + 42, { size: 17, weight: 600, family: fonts.text, maxW: rad * 1.6, color: pal.dim, alpha: inv(t, 0.5, 1) })
    const lab = content.claim
    if (lab && lab !== content.tagline) drawWrapped(ctx, lab, cx, cy + rad + 52, { size: 18, min: 14, weight: 600, family: fonts.text, maxW: W * 0.8, maxLines: 2, color: pal.dim, alpha: inv(t, 0.7, 1.2) })
  },
})

// ---- helpers OLA 3 (puros) ----
// (sin helpers nuevos: reusa fmtInt, countTo, numColor, hairline, shortLabel, checkPath, eOutBack01, pick, starPath)

// =====================================================================================================
// =================================== OLA 5 — mas data-viz ============================================
// =====================================================================================================
// Mismas REGLAS DURAS: numero en MONO via fonts.accent; en claro el numero va en TINTA (numColor); el
// acento queda para barra/arco/regla/aguja/punto (DECO). Valores estables por seedFor(seed,'data'); t
// SOLO anima la entrada. Puro y determinista (cero Math.random/Date.now). Reusa los helpers existentes.
// Helper local nuevo (puro) al final del bloque: flechaUp (dibuja una flechita de tendencia).

// ====================================================================== numeros-animados (mas)
register({
  id: 'data.number.plusminus', lib: 'datakit', category: 'numeros-animados', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  real: true, needsStats: 1,   // MIGRADO (item L152): el numero hero es la 1ra stat REAL (el value ya trae su signo/sufijo, ej '+218%'); sin stat real se auto-salta.
  register: 'neutral', intensity: 'bold', tags: ['hero', 'delta', 'tendencia', 'mono'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env
    const st = realStat(content, 0); if (!st) return   // honestidad: solo con stat real
    // numero hero = el VALOR REAL con count-up (el value ya trae su prefijo/sufijo: '+218%','92%','$2.4M').
    const cx = W / 2, cy = H * 0.46
    // (chip 'vs mes anterior' ELIMINADO: aseveraba una comparacion temporal que no viene del dato -> deshonesto.)
    drawText(ctx, statDisplay(st, t, 0.1, 1.2), cx, cy, { size: 120, weight: 700, family: fonts.accent, maxW: W * 0.86, color: numColor(pal), shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.35)' : null })
    const ru = eOutCubic(inv(t, 0.5, 1.2)), rw = 110 * ru * breath(t, 0, 0.02)
    ctx.save(); ctx.globalAlpha = glow(t, 0, 0.78, 1)
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(cx - rw / 2, cy + 58, rw, 6, 3); ctx.fill(); ctx.restore()
    const label = st.label || content.tagline || content.claim || content.brand || ''
    if (label) drawText(ctx, label, cx, cy + 96, { size: 21, weight: 600, family: fonts.text, maxW: W * 0.8, color: pal.dim, alpha: inv(t, 0.7, 1.2) })
  },
})

register({
  id: 'data.number.fraction', lib: 'datakit', category: 'numeros-animados', tones: ['dark', 'light'], rubros: ['*'], weight: 0.9,
  register: 'neutral', intensity: 'bold', tags: ['hero', 'fraccion', 'ratio', 'mono'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env, r = seedFor(env.seed, 'data')
    // fraccion grande "N / M" (ej "9 / 10", "3 de cada 4"). Numerador grande de acento-tinta, barra divisoria.
    const cx = W / 2, cy = H * 0.44
    const den = pick(r, [5, 10, 4, 100])
    const num = Math.round(range(r, den * 0.55, den * 0.95))
    const ap = inv(t, 0.1, 0.8)
    const numShown = Math.round(num * eOutExpo(ap))
    // numerador grande
    drawText(ctx, String(numShown), cx - W * 0.14, cy, { size: 110, weight: 700, family: fonts.accent, align: 'right', maxW: W * 0.34, color: numColor(pal), alpha: clamp(ap * 1.3, 0, 1) })
    // barra "/" inclinada de acento (DECO) -> glow idle + leve respiracion de grosor
    const sAp = eOutCubic(inv(t, 0.3, 0.9))
    ctx.save(); ctx.strokeStyle = pal.accent; ctx.lineWidth = 7 * breath(t, 0, 0.04, 1.2); ctx.lineCap = 'round'; ctx.globalAlpha = sAp * glow(t, 0, 0.78, 1)
    ctx.beginPath(); ctx.moveTo(cx + 14, cy + 44); ctx.lineTo(cx - 14, cy - 44); ctx.stroke(); ctx.restore()
    // denominador
    drawText(ctx, String(den), cx + W * 0.14, cy + 8, { size: 56, weight: 700, family: fonts.accent, align: 'left', maxW: W * 0.3, color: pal.dim, alpha: inv(t, 0.4, 1) })
    const label = content.tagline || content.claim || 'lo recomiendan'
    drawText(ctx, label, cx, cy + 110, { size: 20, weight: 600, family: fonts.text, maxW: W * 0.82, color: pal.dim, alpha: inv(t, 0.7, 1.2) })
  },
})

// ====================================================================== barras (mas)
register({
  id: 'data.bars.racetrack', lib: 'datakit', category: 'barras', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  register: 'neutral', intensity: 'medium', tags: ['barras', 'pista', 'ranking', 'rotulo'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env, r = seedFor(env.seed, 'data')
    // 4 "pistas" (rieles full-width) con el rotulo DENTRO del riel a la izq + valor mono a la derecha del relleno.
    const n = 4, x0 = W * 0.1, bw = W * 0.8, bh = 38, top = H * 0.28, gap = bh + 20
    const labels = [content.brand, content.tagline, content.claim, content.cta]
    const def = ['Meta', 'Alcance', 'Clicks', 'Mensajes']
    const raw = Array.from({ length: n }, () => range(r, 0.4, 1)).sort((a, b) => b - a)
    for (let i = 0; i < n; i++) {
      const y = top + i * gap
      const ap = eOutCubic(inv(t, 0.1 + i * 0.12, 0.9 + i * 0.12))
      // riel
      ctx.fillStyle = hairline(pal, 0.08); ctx.beginPath(); ctx.roundRect(x0, y, bw, bh, bh / 2); ctx.fill()
      // relleno
      const fw = Math.max(bh, bw * raw[i] * ap)
      ctx.fillStyle = i === 0 ? pal.accent : rgba(pal.accent, 0.5); ctx.beginPath(); ctx.roundRect(x0, y, fw, bh, bh / 2); ctx.fill()
      sheen(ctx, x0, y, fw, bh, t, { period: 3.6, phase: i * 0.22, strength: i === 0 ? 0.16 : 0.09, r: bh / 2 })
      // rotulo DENTRO a la izq (color que contrasta con el relleno cuando esta sobre el)
      drawText(ctx, shortLabel(labels[i], 2) || def[i], x0 + 16, y + bh / 2, { size: 15, weight: 700, family: fonts.text, align: 'left', maxW: bw * 0.55, color: i === 0 ? pal.onAccent : numColor(pal), alpha: ap })
      // valor mono a la derecha
      drawText(ctx, Math.round(raw[i] * 100 * ap) + '%', x0 + bw - 14, y + bh / 2, { size: 16, weight: 700, family: fonts.accent, align: 'right', maxW: W * 0.16, color: numColor(pal), alpha: ap })
    }
  },
})

register({
  id: 'data.bars.target', lib: 'datakit', category: 'barras', tones: ['dark', 'light'], rubros: ['*'], weight: 0.9,
  register: 'neutral', intensity: 'soft', tags: ['barras', 'meta', 'bullet', 'kpi'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env, r = seedFor(env.seed, 'data')
    // bullet chart: 1 barra de avance + marcador de META (linea vertical) -> "vamos por X de la meta Y". Limpio.
    const x0 = W * 0.12, bw = W * 0.76, bh = 40, y = H * 0.46
    const cur = range(r, 0.55, 0.95), meta = clamp(cur + range(r, 0.06, 0.18), 0, 1)
    const ap = eOutCubic(inv(t, 0.1, 1.1))
    const titulo = content.tagline || content.claim
    if (titulo) drawText(ctx, titulo, W / 2, H * 0.24, { size: 22, weight: 700, family: fonts.display, maxW: W * 0.84, color: pal.ink, alpha: inv(t, 0.1, 0.55) })
    // riel
    ctx.fillStyle = hairline(pal, 0.09); ctx.beginPath(); ctx.roundRect(x0, y, bw, bh, 8); ctx.fill()
    // avance
    const afw = bw * cur * ap
    ctx.save(); ctx.beginPath(); ctx.roundRect(x0, y, bw, bh, 8); ctx.clip()
    ctx.fillStyle = pal.accent; ctx.fillRect(x0, y, afw, bh); ctx.restore()
    sheen(ctx, x0, y, afw, bh, t, { period: 3.4, strength: 0.16, r: 8 })
    // marcador de meta (linea vertical de tinta) -> glow idle suave
    const mAp = inv(t, 0.5, 1)
    if (mAp > 0) {
      const mx = x0 + bw * meta
      ctx.save(); ctx.globalAlpha = mAp * glow(t, 0, 0.7, 1); ctx.strokeStyle = numColor(pal); ctx.lineWidth = 3; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(mx, y - 12); ctx.lineTo(mx, y + bh + 12); ctx.stroke(); ctx.restore()
      drawText(ctx, 'meta ' + Math.round(meta * 100) + '%', mx, y - 24, { size: 14, weight: 700, family: fonts.accent, maxW: W * 0.4, color: numColor(pal), alpha: mAp })
    }
    // valor actual grande arriba-izq del riel
    drawText(ctx, Math.round(cur * 100 * ap) + '%', x0 + 4, y - 24, { size: 30, weight: 700, family: fonts.accent, align: 'left', maxW: bw * 0.5, color: numColor(pal), alpha: inv(t, 0.3, 0.9) })
    drawText(ctx, shortLabel(content.cta, 4) || 'logrado', W / 2, y + bh + 36, { size: 17, weight: 600, family: fonts.text, maxW: W * 0.8, color: pal.dim, alpha: inv(t, 0.6, 1.1) })
  },
})

// ====================================================================== anillos / radiales (mas)
register({
  id: 'data.ring.halfgauge', lib: 'datakit', category: 'anillos/radiales', tones: ['dark', 'light'], rubros: ['*'], weight: 1.1,
  real: true, needsStats: 1, needsType: 'percent',   // MIGRADO (item L152): el semiarco se llena por un % REAL (statPercent); el selector solo lo elige si hay un % real -> nunca escena vacia.
  register: 'neutral', intensity: 'medium', tags: ['gauge', 'semi', 'porcentaje', 'mono'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env
    const pr = statPercent(content); if (!pr) return   // honestidad: solo con un % real
    // medidor SEMICIRCULAR (180 abajo) con relleno grueso + numero grande en el hueco. Ticks finos de escala.
    const cx = W / 2, cy = H * 0.54, rad = W * 0.34, lw = 24
    const pct = pr.pct
    const ap = eOutCubic(inv(t, 0.1, 1.2))
    const a0 = Math.PI, a1 = TAU
    ctx.lineCap = 'round'; ctx.lineWidth = lw
    ctx.strokeStyle = hairline(pal, 0.1); ctx.beginPath(); ctx.arc(cx, cy, rad, a0, a1); ctx.stroke()
    const sweepHG = (a1 - a0) * pct * ap
    ctx.strokeStyle = pal.accent; ctx.beginPath(); ctx.arc(cx, cy, rad, a0, a0 + sweepHG); ctx.stroke()
    // sheen idle recorre el arco lleno (clip al barrido)
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, rad + lw, a0, a0 + sweepHG); ctx.arc(cx, cy, rad - lw, a0 + sweepHG, a0, true); ctx.closePath(); ctx.clip()
    // sheen lineal sobre el semiarco: usamos un barrido que va de a0 a a0+sweep
    { const k = idleK(t); if (k > 0.001) { const p = ((t / 4) % 1 + 1) % 1, sa = a0 + sweepHG * p; ctx.save(); ctx.lineCap = 'round'; ctx.lineWidth = lw; ctx.globalAlpha = 0.45 * k; ctx.strokeStyle = lighten(pal.accent, 0.5); ctx.beginPath(); ctx.arc(cx, cy, rad, sa - 0.25, sa + 0.25); ctx.stroke(); ctx.restore() } }
    ctx.restore()
    // ticks de escala (5) fuera del arco
    for (let i = 0; i <= 4; i++) {
      const a = a0 + (a1 - a0) * (i / 4)
      const r1 = rad + lw * 0.7, r2 = rad + lw * 0.95
      ctx.strokeStyle = hairline(pal, 0.2); ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2); ctx.stroke()
    }
    // numero grande en el hueco = el VALOR REAL con count-up
    drawText(ctx, statDisplay(pr.st, t, 0.1, 1.2), cx, cy - 18, { size: 64, weight: 700, family: fonts.accent, maxW: rad * 1.6, color: numColor(pal) })
    const lab = pr.st.label || content.tagline || content.claim
    if (lab) drawText(ctx, lab, cx, cy + 28, { size: 18, weight: 600, family: fonts.text, maxW: W * 0.74, color: pal.dim, alpha: inv(t, 0.7, 1.2) })
  },
})

// ====================================================================== donut (mas)
register({
  id: 'data.donut.legendrows', lib: 'datakit', category: 'donut', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  register: 'neutral', intensity: 'medium', tags: ['donut', 'leyenda', 'desglose', 'mono'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env, r = seedFor(env.seed, 'data')
    // donut de 3 segmentos a la IZQ + leyenda en filas a la DER (punto + etiqueta + % mono). Composicion clara.
    const cx = W * 0.34, cy = H * 0.44, rad = W * 0.2, lw = 30
    let parts = [range(r, 0.35, 0.55), range(r, 0.2, 0.38), range(r, 0.12, 0.25)]
    const sum = parts.reduce((a, b) => a + b, 0); parts = parts.map(p => p / sum)
    const cols = [pal.accent, lighten(pal.accent, 0.22), pal.accent2]
    const ap = eOutCubic(inv(t, 0.1, 1.1)), gap = 0.03
    let ang = -TAU / 4
    ctx.lineCap = 'butt'; ctx.lineWidth = lw
    for (let i = 0; i < parts.length; i++) {
      const seg = TAU * parts[i] * ap
      ctx.strokeStyle = cols[i]; ctx.beginPath(); ctx.arc(cx, cy, rad, ang + gap, ang + Math.max(gap + 0.001, seg - gap)); ctx.stroke()
      ang += seg
    }
    // sheen idle orbita el donut (clip al anillo)
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, rad + lw / 2, 0, TAU); ctx.arc(cx, cy, rad - lw / 2, 0, TAU, true); ctx.clip()
    sheenArc(ctx, cx, cy, rad, lw, t, pal.accent, { period: 5, span: 0.7, strength: 0.36 })
    ctx.restore()
    // % dominante al centro
    drawText(ctx, Math.round(parts[0] * 100 * ap) + '%', cx, cy, { size: 32, weight: 700, family: fonts.accent, maxW: rad * 1.4, color: numColor(pal) })
    // leyenda a la derecha
    const labels = [content.brand, content.claim, content.cta].map(s => shortLabel(s, 2))
    const def = ['Directo', 'Social', 'Otros']
    const lx = W * 0.6, ly0 = cy - 44, rowH = 46
    for (let i = 0; i < 3; i++) {
      const ly = ly0 + i * rowH
      const la = inv(t, 0.6 + i * 0.12, 1.1 + i * 0.12)
      ctx.save(); ctx.globalAlpha = la
      ctx.fillStyle = cols[i]; ctx.beginPath(); ctx.arc(lx, ly, 8, 0, TAU); ctx.fill()
      drawText(ctx, labels[i] || def[i], lx + 18, ly - 9, { size: 14, weight: 600, family: fonts.text, align: 'left', maxW: W * 0.3, color: pal.ink })
      drawText(ctx, Math.round(parts[i] * 100) + '%', lx + 18, ly + 12, { size: 20, weight: 700, family: fonts.accent, align: 'left', maxW: W * 0.3, color: numColor(pal) })
      ctx.restore()
    }
  },
})

// ====================================================================== series / tendencia (mas)
register({
  id: 'data.series.stepline', lib: 'datakit', category: 'series/tendencia', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  register: 'neutral', intensity: 'medium', tags: ['serie', 'escalonada', 'tendencia', 'mono'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env, r = seedFor(env.seed, 'data')
    // serie escalonada (step) ascendente con marcadores en cada nivel + valor final grande. Estilo "milestones".
    const n = 7, x0 = W * 0.12, x1 = W * 0.88, yTop = H * 0.34, yBot = H * 0.58
    const vals = []
    let acc = 0.18
    for (let i = 0; i < n; i++) { acc = clamp(acc + range(r, 0.02, 0.16), 0.08, 1); vals.push(acc) }
    const pts = vals.map((v, i) => ({ x: lerp(x0, x1, i / (n - 1)), y: lerp(yBot, yTop, v) }))
    const draw = eOutCubic(inv(t, 0.1, 1.3))
    const shown = clamp(draw * (n - 1), 0, n - 1), li = Math.floor(shown), fr = shown - li
    // linea escalonada
    ctx.strokeStyle = pal.accent; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i <= li; i++) { ctx.lineTo(pts[i].x, pts[i - 1].y); ctx.lineTo(pts[i].x, pts[i].y) }
    if (li < n - 1) { const nx = lerp(pts[li].x, pts[li + 1].x, fr); ctx.lineTo(nx, pts[li].y) }
    ctx.stroke()
    // marcadores
    for (let i = 0; i <= li; i++) {
      ctx.fillStyle = pal.bg0; ctx.beginPath(); ctx.arc(pts[i].x, pts[i].y, 5, 0, TAU); ctx.fill()
      ctx.strokeStyle = pal.accent; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(pts[i].x, pts[i].y, 5, 0, TAU); ctx.stroke()
    }
    // halo idle que late en el ultimo marcador (la cabeza de la serie)
    if (li >= 0 && idleK(t) > 0.001) { const hp = ((t / 2.2) % 1 + 1) % 1, last = pts[Math.min(li, n - 1)]; ctx.save(); ctx.globalAlpha = (1 - hp) * 0.5 * idleK(t); ctx.strokeStyle = lighten(pal.accent, 0.3); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(last.x, last.y, 5 + hp * 11, 0, TAU); ctx.stroke(); ctx.restore(); ctx.save(); ctx.globalAlpha = glow(t, 0, 0.7, 1); ctx.fillStyle = lighten(pal.accent, 0.3); ctx.beginPath(); ctx.arc(last.x, last.y, 4 * breath(t, 0, 0.06, 1.4), 0, TAU); ctx.fill(); ctx.restore() }
    // valor final grande arriba
    const delta = Math.round(vals[n - 1] * 100)
    drawText(ctx, delta + '%', W / 2, H * 0.24, { size: 42, weight: 700, family: fonts.accent, maxW: W * 0.5, color: numColor(pal), alpha: inv(t, 0.4, 1) })
    const lab = content.tagline || content.claim
    if (lab) drawText(ctx, lab, W / 2, H * 0.66, { size: 18, weight: 600, family: fonts.text, maxW: W * 0.78, color: pal.dim, alpha: inv(t, 0.7, 1.2) })
  },
})

// ====================================================================== comparacion / proporcion (mas)
register({
  id: 'data.compare.scalecols', lib: 'datakit', category: 'comparacion/proporcion', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  register: 'neutral', intensity: 'medium', tags: ['comparacion', 'columnas', 'escala', 'mono'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env, r = seedFor(env.seed, 'data')
    // 3 columnas a misma escala (chico/medio/grande) -> "X veces mas". El mayor en acento, valor mono encima.
    const n = 3, base = H * 0.7, maxH = H * 0.4, x0 = W * 0.16, span = W * 0.68
    const slot = span / n, bw = slot * 0.5
    const vals = [range(r, 0.25, 0.4), range(r, 0.5, 0.7), range(r, 0.85, 1)]
    const labels = [content.brand, content.claim, content.cta].map(s => shortLabel(s, 2))
    const def = ['Antes', 'Hoy', 'Meta']
    const titulo = content.tagline || ''
    if (titulo) drawText(ctx, titulo, W / 2, H * 0.2, { size: 22, weight: 700, family: fonts.display, maxW: W * 0.84, color: pal.ink, alpha: inv(t, 0.1, 0.55) })
    ctx.strokeStyle = hairline(pal, 0.12); ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(x0 - 6, base + 1); ctx.lineTo(x0 + span + 6, base + 1); ctx.stroke()
    for (let i = 0; i < n; i++) {
      const bx = x0 + i * slot + (slot - bw) / 2
      const ap = eOutBack01(inv(t, 0.12 + i * 0.14, 0.8 + i * 0.14))
      const hh = maxH * vals[i] * ap
      ctx.fillStyle = i === n - 1 ? pal.accent : rgba(pal.accent, 0.4)
      ctx.beginPath(); ctx.roundRect(bx, base - hh, bw, hh, [8, 8, 0, 0]); ctx.fill()
      sheenV(ctx, bx, base - hh, bw, hh, t, { period: 4, phase: i * 0.2, strength: i === n - 1 ? 0.2 : 0.1, r: 8 })
      // valor encima (mono)
      const vAp = inv(t, 0.5 + i * 0.12, 1 + i * 0.12)
      if (vAp > 0) drawText(ctx, Math.round(vals[i] * 100) + '', bx + bw / 2, base - hh - 16, { size: 18, weight: 700, family: fonts.accent, maxW: slot, color: i === n - 1 ? numColor(pal) : pal.dim, alpha: vAp })
      // etiqueta abajo
      drawText(ctx, labels[i] || def[i], bx + bw / 2, base + 22, { size: 14, weight: 600, family: fonts.text, maxW: slot + 6, color: i === n - 1 ? pal.ink : pal.dim, alpha: clamp(ap * 1.2, 0, 1) })
    }
  },
})

// ====================================================================== rating / prueba-social (mas)
register({
  id: 'data.rating.bignum', lib: 'datakit', category: 'rating/prueba-social', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  real: true, needsStats: 1, needsType: 'rating',   // MIGRADO (item L152): el score gigante + estrellas salen de un RATING real 0..5 (statRating); el selector solo lo elige si hay un rating real -> nunca escena vacia.
  register: 'friendly', intensity: 'bold', tags: ['rating', 'score', 'estrellas', 'mono'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env
    const rt = statRating(content); if (!rt) return   // honestidad: solo con un rating real 0..5 (ej '4.9')
    // score gigante REAL (ej "4.9") + fila de estrellas debajo + etiqueta. Prueba social directa.
    const cx = W / 2, cy = H * 0.4
    const score = rt.score
    const ap = inv(t, 0.1, 0.7)
    drawText(ctx, statDisplay(rt.st, t, 0.1, 0.7), cx, cy, { size: 120, weight: 700, family: fonts.accent, maxW: W * 0.7, color: numColor(pal), shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.3)' : null })
    // estrellas debajo
    const n = 5, gap = W * 0.08, sr = W * 0.034, totalW = (n - 1) * gap
    const sAp = inv(t, 0.4, 1)
    for (let i = 0; i < n; i++) {
      const sx = cx - totalW / 2 + i * gap
      const frac = clamp(score - i, 0, 1)
      const twk = frac > 0.5 ? 1 + idleK(t) * Math.sin(t * 1.5 - i * 0.6) * 0.04 : 1
      ctx.save(); ctx.translate(sx, cy + 88); ctx.scale(twk, twk); ctx.globalAlpha = sAp
      starPath(ctx, sr); ctx.strokeStyle = hairline(pal, 0.18); ctx.lineWidth = 2; ctx.stroke()
      if (frac > 0) { ctx.save(); ctx.beginPath(); ctx.rect(-sr * 1.3, -sr * 1.3, sr * 2.6 * frac, sr * 2.6); ctx.clip(); starPath(ctx, sr); ctx.fillStyle = frac > 0.5 ? lighten(pal.accent, idleK(t) * pulse01(t, -i * 0.6) * 0.2) : pal.accent; ctx.fill(); ctx.restore() }
      ctx.restore()
    }
    // etiqueta REAL del stat (o copy) -> SIN cantidad de reviews fabricada (era un numero inventado -> deshonesto)
    drawText(ctx, rt.st.label || content.tagline || content.claim || '', cx, cy + 140, { size: 18, weight: 600, family: fonts.text, maxW: W * 0.8, color: pal.dim, alpha: inv(t, 0.7, 1.2) })
  },
})

// ====================================================================== timeline / proceso (mas)
register({
  id: 'data.timeline.numbered', lib: 'datakit', category: 'timeline/proceso', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  register: 'neutral', intensity: 'medium', tags: ['proceso', 'pasos', 'numerado', 'mono'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env, r = seedFor(env.seed, 'data')
    // 3 pasos numerados en tarjetas verticales (numero grande mono + titulo + linea). Cada tarjeta entra en orden.
    const n = 3, x0 = W * 0.12, cardW = W * 0.76, cardH = 96, top = H * 0.24, gap = cardH + 20
    const labels = [content.tagline, content.claim, content.cta]
    const def = ['Conecta tu cuenta', 'Genera el anuncio', 'Mide y afina']
    for (let i = 0; i < n; i++) {
      const y = top + i * gap
      const ap = spring(inv(t, 0.12 + i * 0.18, 0.85 + i * 0.18), { zeta: 0.5, freq: 2 })
      ctx.save(); ctx.globalAlpha = clamp(ap, 0, 1)
      // tarjeta
      ctx.fillStyle = pal.surface; ctx.beginPath(); ctx.roundRect(x0, y, cardW, cardH, 16); ctx.fill()
      ctx.strokeStyle = hairline(pal, 0.16); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(x0, y, cardW, cardH, 16); ctx.stroke()
      // pildora de numero a la izq -> halo idle que late (onda por tarjeta)
      const pcx = x0 + 44, pcy = y + cardH / 2
      if (idleK(t) > 0.001) { const hp = ((t / 2.6 + i * 0.25) % 1 + 1) % 1; ctx.save(); ctx.globalAlpha = (1 - hp) * (i === 0 ? 0.4 : 0.22) * idleK(t); ctx.strokeStyle = pal.accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(pcx, pcy, 28 + hp * 9, 0, TAU); ctx.stroke(); ctx.restore() }
      ctx.save(); ctx.globalAlpha = i === 0 ? glow(t, i * 0.6, 0.82, 1) : 1
      ctx.fillStyle = i === 0 ? pal.accent : rgba(pal.accent, 0.16)
      ctx.beginPath(); ctx.arc(pcx, pcy, 28, 0, TAU); ctx.fill(); ctx.restore()
      drawText(ctx, String(i + 1), pcx, pcy, { size: 30, weight: 700, family: fonts.accent, maxW: 56, color: i === 0 ? pal.onAccent : numColor(pal) })
      // titulo a la derecha
      drawText(ctx, shortLabel(labels[i], 4) || def[i], x0 + 86, y + cardH / 2, { size: 18, weight: 600, family: fonts.text, align: 'left', maxW: cardW - 100, color: pal.ink })
      ctx.restore()
    }
  },
})

// ====================================================================== numberStack (mas)
register({
  id: 'data.stack.cards', lib: 'datakit', category: 'numberStack', tones: ['dark', 'light'], rubros: ['*'], weight: 1.1,
  real: true, needsStats: 2,   // MIGRADO (item L152): 2-4 KPIs REALES en grid; solo dibuja las tarjetas que tienen stat real; sin >=2 se auto-salta.
  register: 'neutral', intensity: 'medium', tags: ['kpi', 'tarjetas', 'grid', 'mono'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env
    // KPIs REALES en grid 2x2 de tarjetas (VALOR real + etiqueta). Dashboard compacto. La 1ra destacada.
    const rs = (content.stats || []).filter(s => s && (s.value || s.value === 0)).slice(0, 4)
    if (rs.length < 2) return   // honestidad: solo con >=2 stats reales
    const cols = 2, pad = W * 0.06, gx = W * 0.04, gy = H * 0.03
    const cardW = (W - pad * 2 - gx) / cols, cardH = (H * 0.48 - gy) / 2
    const ox = pad, oy = H * 0.28
    const titulo = content.tagline || ''
    if (titulo) drawText(ctx, titulo, W / 2, H * 0.2, { size: 22, weight: 700, family: fonts.display, maxW: W * 0.84, color: pal.ink, alpha: inv(t, 0.1, 0.55) })
    for (let i = 0; i < rs.length; i++) {
      const c = i % cols, ro = Math.floor(i / cols)
      const x = ox + c * (cardW + gx), y = oy + ro * (cardH + gy)
      const ap = spring(inv(t, 0.12 + i * 0.1, 0.8 + i * 0.1), { zeta: 0.5, freq: 2 })
      ctx.save(); ctx.globalAlpha = clamp(ap, 0, 1)
      // tarjeta (la 1ra con borde de acento -> borde con glow idle)
      ctx.fillStyle = pal.surface; ctx.beginPath(); ctx.roundRect(x, y, cardW, cardH, 14); ctx.fill()
      if (i === 0) { ctx.save(); ctx.globalAlpha *= glow(t, 0, 0.6, 1); ctx.strokeStyle = pal.accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x, y, cardW, cardH, 14); ctx.stroke(); ctx.restore() }
      else { ctx.strokeStyle = hairline(pal, 0.14); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(x, y, cardW, cardH, 14); ctx.stroke() }
      drawText(ctx, statDisplay(rs[i], t, 0.2 + i * 0.08, 0.9 + i * 0.08), x + cardW / 2, y + cardH * 0.4, { size: 38, weight: 700, family: fonts.accent, maxW: cardW * 0.86, color: numColor(pal) })
      drawText(ctx, shortLabel(rs[i].label, 2), x + cardW / 2, y + cardH * 0.74, { size: 14, weight: 600, family: fonts.text, maxW: cardW * 0.86, color: pal.dim })
      ctx.restore()
    }
  },
})

// ====================================================================== progreso (mas)
register({
  id: 'data.progress.barbig', lib: 'datakit', category: 'progreso', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  real: true, needsStats: 1, needsType: 'percent',   // MIGRADO (item L152): el % gigante + la barra salen de un % REAL (statPercent); el selector solo lo elige si hay un % real -> nunca escena vacia.
  register: 'neutral', intensity: 'bold', tags: ['progreso', 'barra', 'porcentaje', 'mono'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env
    const pr = statPercent(content); if (!pr) return   // honestidad: solo con un % real
    // % GIGANTE arriba + barra de progreso gruesa con punto-cabeza debajo. Foco maximo en el numero.
    const cx = W / 2, cy = H * 0.4
    const pct = pr.pct
    const ap = eOutCubic(inv(t, 0.1, 1.1))
    drawText(ctx, statDisplay(pr.st, t, 0.1, 1.1), cx, cy, { size: 110, weight: 700, family: fonts.accent, maxW: W * 0.8, color: numColor(pal), shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.3)' : null })
    // barra
    const x0 = W * 0.12, bw = W * 0.76, bh = 16, by = cy + 90
    ctx.fillStyle = hairline(pal, 0.1); ctx.beginPath(); ctx.roundRect(x0, by, bw, bh, bh / 2); ctx.fill()
    const fw = Math.max(bh, bw * pct * ap)
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(x0, by, fw, bh, bh / 2); ctx.fill()
    sheen(ctx, x0, by, fw, bh, t, { period: 3.2, strength: 0.2, r: bh / 2 })
    // punto-cabeza con glow idle
    ctx.save(); ctx.globalAlpha = glow(t, 0, 0.75, 1); ctx.fillStyle = lighten(pal.accent, 0.3); ctx.beginPath(); ctx.arc(x0 + fw, by + bh / 2, bh * 0.7 * breath(t, 0, 0.06, 1.3), 0, TAU); ctx.fill(); ctx.restore()
    const lab = pr.st.label || content.tagline || content.claim || 'completado'
    drawText(ctx, lab, cx, by + bh + 40, { size: 19, weight: 600, family: fonts.text, maxW: W * 0.82, color: pal.dim, alpha: inv(t, 0.6, 1.1) })
  },
})

register({
  id: 'data.progress.stepbar', lib: 'datakit', category: 'progreso', tones: ['dark', 'light'], rubros: ['*'], weight: 0.9,
  register: 'neutral', intensity: 'medium', tags: ['progreso', 'pasos', 'stepper', 'mono'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env, r = seedFor(env.seed, 'data')
    // stepper horizontal: 5 nodos numerados conectados; los completados en acento con tilde, el activo numerado.
    const steps = 5, x0 = W * 0.12, x1 = W * 0.88, cy = H * 0.46, nodeR = 18
    const span = x1 - x0
    const target = 2 + Math.floor(r() * 3)          // 2..4 completados (estable)
    const prog = eOutCubic(inv(t, 0.1, 1.1))
    const lit = target * prog
    const titulo = content.tagline || content.claim
    if (titulo) drawText(ctx, titulo, W / 2, H * 0.26, { size: 21, weight: 700, family: fonts.display, maxW: W * 0.84, color: pal.ink, alpha: inv(t, 0.1, 0.55) })
    // riel + progreso
    ctx.lineCap = 'round'; ctx.lineWidth = 4
    ctx.strokeStyle = hairline(pal, 0.12); ctx.beginPath(); ctx.moveTo(x0, cy); ctx.lineTo(x1, cy); ctx.stroke()
    const xProg = lerp(x0, x1, clamp(lit / (steps - 1), 0, 1))
    ctx.strokeStyle = pal.accent; ctx.beginPath(); ctx.moveTo(x0, cy); ctx.lineTo(xProg, cy); ctx.stroke()
    const ik = idleK(t)
    if (ik > 0.001 && xProg > x0 + 6) { const pp = ((t / 2.6) % 1 + 1) % 1, dx = lerp(x0 + 4, xProg - 4, pp); ctx.save(); ctx.globalAlpha = ik * Math.sin(pp * Math.PI) * 0.85; ctx.fillStyle = lighten(pal.accent, 0.4); ctx.beginPath(); ctx.arc(dx, cy, 4, 0, TAU); ctx.fill(); ctx.restore() }
    for (let i = 0; i < steps; i++) {
      const x = x0 + (span * i) / (steps - 1)
      const done = i < Math.floor(lit + 0.001)
      const ap = eOutBack01(inv(prog, i / target - 0.05, i / target + 0.1))
      // halo idle que late en nodos completados (onda)
      if (done && ik > 0.001) { const hp = ((t / 2.4 + i * 0.2) % 1 + 1) % 1; ctx.save(); ctx.globalAlpha = (1 - hp) * 0.3 * ik; ctx.strokeStyle = pal.accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, cy, nodeR + hp * 8, 0, TAU); ctx.stroke(); ctx.restore() }
      ctx.save(); ctx.translate(x, cy)
      ctx.fillStyle = done ? pal.accent : pal.bg0; ctx.beginPath(); ctx.arc(0, 0, nodeR, 0, TAU); ctx.fill()
      ctx.lineWidth = 3; ctx.strokeStyle = done ? pal.accent : hairline(pal, 0.25); ctx.beginPath(); ctx.arc(0, 0, nodeR, 0, TAU); ctx.stroke()
      if (done) { ctx.strokeStyle = pal.onAccent; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; checkPath(ctx, nodeR * 0.85); ctx.stroke() }
      else drawText(ctx, String(i + 1), 0, 1, { size: 16, weight: 700, family: fonts.accent, maxW: nodeR * 1.6, color: i === Math.floor(lit + 0.001) ? numColor(pal) : pal.dim })
      ctx.restore()
    }
    // contador X/N debajo
    drawText(ctx, Math.round(lit) + '/' + steps + ' pasos', W / 2, cy + 56, { size: 18, weight: 700, family: fonts.accent, maxW: W * 0.6, color: numColor(pal), alpha: inv(t, 0.5, 1) })
  },
})

// ====================================================================== comparacion / proporcion (mas)
register({
  id: 'data.compare.stack100', lib: 'datakit', category: 'comparacion/proporcion', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  register: 'neutral', intensity: 'medium', tags: ['proporcion', 'apilada', '100%', 'mono'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env, r = seedFor(env.seed, 'data')
    // barra horizontal 100% apilada (3 segmentos) con % DENTRO de cada segmento + leyenda debajo. Composicion.
    const x0 = W * 0.1, bw = W * 0.8, bh = 56, y = H * 0.44
    let parts = [range(r, 0.4, 0.6), range(r, 0.2, 0.35), range(r, 0.1, 0.2)]
    const sum = parts.reduce((a, b) => a + b, 0); parts = parts.map(p => p / sum)
    const cols = [pal.accent, lighten(pal.accent, 0.22), pal.accent2]
    const ap = eOutExpo(inv(t, 0.1, 1))
    const titulo = content.tagline || content.claim
    if (titulo) drawText(ctx, titulo, W / 2, H * 0.26, { size: 22, weight: 700, family: fonts.display, maxW: W * 0.84, color: pal.ink, alpha: inv(t, 0.1, 0.55) })
    // clip a la barra redondeada
    ctx.save(); ctx.beginPath(); ctx.roundRect(x0, y, bw, bh, 12); ctx.clip()
    // fondo riel (lo que aun no entro)
    ctx.fillStyle = hairline(pal, 0.08); ctx.fillRect(x0, y, bw, bh)
    let cxs = x0
    for (let i = 0; i < 3; i++) {
      const segW = bw * parts[i] * ap
      ctx.fillStyle = cols[i]; ctx.fillRect(cxs, y, segW, bh)
      // separador
      if (i < 2) { ctx.fillStyle = pal.bg0; ctx.fillRect(cxs + segW - 1.5, y, 3, bh) }
      cxs += segW
    }
    ctx.restore()
    // sheen idle recorre toda la barra apilada
    sheen(ctx, x0, y, bw * ap, bh, t, { period: 3.8, strength: 0.14, r: 12 })
    // % dentro de cada segmento (solo si entra; mono, color que contrasta)
    let cxs2 = x0
    for (let i = 0; i < 3; i++) {
      const segW = bw * parts[i] * ap
      if (segW > 36) drawText(ctx, Math.round(parts[i] * 100) + '%', cxs2 + segW / 2, y + bh / 2, { size: 17, weight: 700, family: fonts.accent, maxW: segW - 8, color: i === 0 ? pal.onAccent : numColor(pal), alpha: inv(t, 0.5, 1) })
      cxs2 += segW
    }
    // leyenda debajo (3 chips en fila)
    const labels = [content.brand, content.claim, content.cta].map(s => shortLabel(s, 1))
    const def = ['Directo', 'Social', 'Otros']
    const lAp = inv(t, 0.7, 1.2)
    if (lAp > 0) {
      ctx.save(); ctx.globalAlpha = lAp
      const ly = y + bh + 36, step = bw / 3
      for (let i = 0; i < 3; i++) {
        const lx = x0 + i * step
        ctx.fillStyle = cols[i]; ctx.beginPath(); ctx.roundRect(lx, ly - 7, 14, 14, 4); ctx.fill()
        drawText(ctx, labels[i] || def[i], lx + 22, ly, { size: 14, weight: 600, family: fonts.text, align: 'left', maxW: step - 30, color: pal.dim })
      }
      ctx.restore()
    }
  },
})

// ---- helpers OLA 5 (puros) ----
// flechita de tendencia (up) centrada en (cx,cy), tamano s, color dado.
function flechaUp(ctx, cx, cy, s, color) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  ctx.beginPath(); ctx.moveTo(cx, cy + s); ctx.lineTo(cx, cy - s)
  ctx.moveTo(cx - s * 0.7, cy - s * 0.3); ctx.lineTo(cx, cy - s); ctx.lineTo(cx + s * 0.7, cy - s * 0.3)
  ctx.stroke(); ctx.restore()
}

// =====================================================================================================
// =================================== OLA 6 — mas data-viz ============================================
// =====================================================================================================
// Mismas REGLAS DURAS: numero en MONO via fonts.accent; en claro el numero va en TINTA (numColor); el
// acento queda para barra/arco/regla/aguja/punto/marco (DECO). Valores estables por seedFor(seed,'data');
// t SOLO anima la entrada. Puro y determinista (cero Math.random/Date.now). Reusa helpers existentes
// (fmtInt, countTo, numColor, hairline, shortLabel, checkPath, eOutBack01, pick, starPath, flechaUp).
// Helpers nuevos (puros) al final del bloque: roundRectPath, chip.

// ====================================================================== numeros-animados (mas)
register({
  id: 'data.number.percentcircle', lib: 'datakit', category: 'numeros-animados', tones: ['dark', 'light'], rubros: ['*'], weight: 1.1,
  real: true, needsStats: 1, needsType: 'percent',   // MIGRADO (item L152): el % hero es un % REAL (statPercent); el selector solo lo elige si hay un % real -> nunca escena vacia.
  register: 'neutral', intensity: 'bold', tags: ['hero', 'porcentaje', 'marco', 'mono'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env
    const pr = statPercent(content); if (!pr) return   // honestidad: solo con un % real
    // % GRANDE centrado dentro de un MARCO circular fino de acento (deco), con dos rulos cortos a los lados.
    const cx = W / 2, cy = H * 0.42, rad = W * 0.36
    const ap = eOutCubic(inv(t, 0.1, 1.2))
    // marco circular tenue (riel)
    ctx.lineWidth = 2; ctx.strokeStyle = hairline(pal, 0.14)
    ctx.beginPath(); ctx.arc(cx, cy, rad, 0, TAU); ctx.stroke()
    // dos arcos cortos de acento arriba y abajo que crecen (deco) -> rotan lentisimo + respiran span (idle)
    const arcAp = eOutCubic(inv(t, 0.3, 1.1))
    const spin = idleK(t) * Math.sin(t * 0.4) * 0.22, span2 = 0.45 * arcAp * breath(t, 0, 0.06, 0.9)
    ctx.save(); ctx.globalAlpha = glow(t, 0, 0.8, 1)
    ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.strokeStyle = pal.accent
    ctx.beginPath(); ctx.arc(cx, cy, rad, -TAU / 4 + spin - span2, -TAU / 4 + spin + span2); ctx.stroke()
    ctx.beginPath(); ctx.arc(cx, cy, rad, TAU / 4 + spin - span2, TAU / 4 + spin + span2); ctx.stroke()
    ctx.restore()
    // numero grande = el VALOR REAL con count-up
    drawText(ctx, statDisplay(pr.st, t, 0.1, 1.2), cx, cy - 6, { size: 96, weight: 700, family: fonts.accent, maxW: rad * 1.7, color: numColor(pal), shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.3)' : null })
    // etiqueta corta REAL dentro del marco
    drawText(ctx, shortLabel(pr.st.label, 3) || 'de satisfaccion', cx, cy + 44, { size: 17, weight: 600, family: fonts.text, maxW: rad * 1.5, color: pal.dim, alpha: inv(t, 0.5, 1) })
    // claim debajo del marco: drawWrapped -> <=2 lineas, achica antes de elidir
    const lab = content.claim
    if (lab && lab !== content.tagline) drawWrapped(ctx, lab, cx, cy + rad + 50, { size: 18, min: 14, weight: 600, family: fonts.text, maxW: W * 0.8, maxLines: 2, color: pal.dim, alpha: inv(t, 0.7, 1.2) })
  },
})

register({
  id: 'data.number.cardstat', lib: 'datakit', category: 'numeros-animados', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  real: true, needsStats: 1,   // MIGRADO (item L152): lee la 1ra stat REAL; el selector solo lo elige con realStats>=1.
  register: 'neutral', intensity: 'medium', tags: ['hero', 'tarjeta', 'kpi', 'mono'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env
    const st = realStat(content, 0); if (!st) return   // honestidad: solo con stat real (el selector ya lo gatea; doble-guard)
    // numero hero DENTRO de una tarjeta de superficie con titulo arriba. Limpio.
    const cardX = W * 0.1, cardW = W * 0.8, cardY = H * 0.28, cardH = H * 0.42
    const cAp = spring(inv(t, 0.1, 0.8), { zeta: 0.55, freq: 1.8 })
    ctx.save(); ctx.globalAlpha = clamp(cAp, 0, 1)
    ctx.fillStyle = pal.surface; roundRectPath(ctx, cardX, cardY, cardW, cardH, 20); ctx.fill()
    ctx.strokeStyle = hairline(pal, 0.16); ctx.lineWidth = 1.5; roundRectPath(ctx, cardX, cardY, cardW, cardH, 20); ctx.stroke()
    // barra de acento superior (deco) + sheen idle que la recorre
    ctx.fillStyle = pal.accent; roundRectPath(ctx, cardX, cardY, cardW, 6, [20, 20, 0, 0]); ctx.fill()
    ctx.restore()
    sheen(ctx, cardX, cardY, cardW, 6, t, { period: 3.4, strength: 0.24, r: 3 })
    // titulo
    drawText(ctx, shortLabel(st.label, 3) || shortLabel(content.tagline, 3) || 'Este mes', W / 2, cardY + 46, { size: 16, weight: 600, family: fonts.text, maxW: cardW * 0.8, color: pal.dim, alpha: inv(t, 0.3, 0.9) })
    // numero grande = el VALOR REAL (item L152) con count-up sobre su parte numerica
    drawText(ctx, statDisplay(st, t, 0.2, 1.2), W / 2, cardY + cardH * 0.5, { size: 72, weight: 700, family: fonts.accent, maxW: cardW * 0.86, color: numColor(pal) })
    // (chip de delta '+X%' ELIMINADO: fabricaba un crecimiento inventado -> deshonesto. Sin una 2da stat real no se muestra.)
    // claim bajo la tarjeta: drawWrapped -> <=2 lineas, achica antes de elidir (claims largos entran completos)
    const lab = content.claim
    if (lab) drawWrapped(ctx, lab, W / 2, cardY + cardH + 40, { size: 18, min: 14, weight: 600, family: fonts.text, maxW: W * 0.82, maxLines: 2, color: pal.dim, alpha: inv(t, 0.7, 1.2) })
  },
})

// ====================================================================== barras (mas)
register({
  id: 'data.bars.range', lib: 'datakit', category: 'barras', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  register: 'neutral', intensity: 'soft', tags: ['barras', 'rango', 'min-max', 'flotante'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env, r = seedFor(env.seed, 'data')
    // 4 barras de RANGO (min..max flotantes) sobre un eje comun -> "de X a Y". Punto-marca en cada extremo.
    const n = 4, x0 = W * 0.16, span = W * 0.72, top = H * 0.32, gap = H * 0.11, bh = 14
    const labels = [content.brand, content.tagline, content.claim, content.cta]
    const def = ['Lun', 'Mar', 'Mie', 'Jue']
    const titulo = content.tagline || content.claim
    if (titulo) drawText(ctx, titulo, W / 2, H * 0.22, { size: 21, weight: 700, family: fonts.display, maxW: W * 0.84, color: pal.ink, alpha: inv(t, 0.1, 0.55) })
    for (let i = 0; i < n; i++) {
      const y = top + i * gap
      const lo = range(r, 0.08, 0.4), hi = clamp(lo + range(r, 0.25, 0.55), 0, 1)
      const ap = eOutCubic(inv(t, 0.12 + i * 0.1, 0.9 + i * 0.1))
      // etiqueta
      drawText(ctx, shortLabel(labels[i], 1) || def[i], x0 - 12, y + bh / 2, { size: 14, weight: 600, family: fonts.text, align: 'right', maxW: W * 0.12, color: pal.dim, alpha: ap })
      // eje tenue
      ctx.fillStyle = hairline(pal, 0.07); roundRectPath(ctx, x0, y + bh / 2 - 1, span, 2, 1); ctx.fill()
      // barra de rango (acento, crece desde lo hacia hi)
      const xLo = x0 + span * lo, xHi = x0 + span * (lo + (hi - lo) * ap), rw = Math.max(bh, xHi - xLo)
      ctx.fillStyle = i === 0 ? pal.accent : rgba(pal.accent, 0.55)
      roundRectPath(ctx, xLo, y, rw, bh, bh / 2); ctx.fill()
      sheen(ctx, xLo, y, rw, bh, t, { period: 3.6, phase: i * 0.2, strength: i === 0 ? 0.16 : 0.1, r: bh / 2 })
      // puntos en extremos con glow idle
      ctx.save(); ctx.globalAlpha = ap * glow(t, i * 0.6, 0.7, 1); ctx.fillStyle = numColor(pal)
      ctx.beginPath(); ctx.arc(xLo, y + bh / 2, 3.5 * breath(t, i * 0.6, 0.08, 1.2), 0, TAU); ctx.fill()
      ctx.beginPath(); ctx.arc(xHi, y + bh / 2, 3.5 * breath(t, i * 0.6 + Math.PI, 0.08, 1.2), 0, TAU); ctx.fill(); ctx.restore()
      // valor del rango a la derecha
      drawText(ctx, Math.round(hi * 100 * ap) + '', x0 + span + 14, y + bh / 2, { size: 15, weight: 700, family: fonts.accent, align: 'left', maxW: W * 0.1, color: numColor(pal), alpha: ap })
    }
  },
})

register({
  id: 'data.bars.heatcol', lib: 'datakit', category: 'barras', tones: ['dark', 'light'], rubros: ['*'], weight: 0.9,
  register: 'neutral', intensity: 'medium', tags: ['barras', 'columnas', 'intensidad', 'serie'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env, r = seedFor(env.seed, 'data')
    // 8 columnas cuya OPACIDAD de acento crece con el valor (intensidad) -> mapa de calor en columnas. Pico solido.
    const n = 8, base = H * 0.66, maxH = H * 0.36, x0 = W * 0.12, span = W * 0.76
    const slot = span / n, bw = slot * 0.66
    const vals = Array.from({ length: n }, () => range(r, 0.22, 1))
    let peak = 0; for (let i = 0; i < n; i++) if (vals[i] > vals[peak]) peak = i
    const titulo = content.tagline || content.claim
    if (titulo) drawText(ctx, titulo, W / 2, H * 0.2, { size: 21, weight: 700, family: fonts.display, maxW: W * 0.84, color: pal.ink, alpha: inv(t, 0.1, 0.55) })
    // base
    ctx.strokeStyle = hairline(pal, 0.1); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x0, base + 1); ctx.lineTo(x0 + span, base + 1); ctx.stroke()
    for (let i = 0; i < n; i++) {
      const ap = eOutBack01(inv(t, 0.1 + i * 0.06, 0.7 + i * 0.06))
      const bx = x0 + i * slot + (slot - bw) / 2
      const hh = maxH * vals[i] * ap
      // opacidad por intensidad (0.3..1) -> heat
      ctx.fillStyle = i === peak ? pal.accent : rgba(pal.accent, 0.3 + 0.55 * vals[i])
      roundRectPath(ctx, bx, base - hh, bw, hh, [5, 5, 0, 0]); ctx.fill()
      sheenV(ctx, bx, base - hh, bw, hh, t, { period: 4, phase: i * 0.14, strength: i === peak ? 0.2 : 0.09, r: 5 })
    }
    // valor pico
    const pAp = inv(t, 0.7, 1.1)
    if (pAp > 0) {
      const bx = x0 + peak * slot + slot / 2
      drawText(ctx, Math.round(vals[peak] * 100) + '', bx, base - maxH * vals[peak] - 14, { size: 16, weight: 700, family: fonts.accent, maxW: slot * 2, color: numColor(pal), alpha: pAp })
    }
    const lab = content.claim
    if (lab && lab !== content.tagline) drawText(ctx, lab, W / 2, base + 40, { size: 18, weight: 600, family: fonts.text, maxW: W * 0.8, color: pal.dim, alpha: inv(t, 0.7, 1.2) })
  },
})

// ====================================================================== anillos / radiales (mas)
register({
  id: 'data.ring.activity', lib: 'datakit', category: 'anillos/radiales', tones: ['dark', 'light'], rubros: ['*'], weight: 1.1,
  register: 'neutral', intensity: 'medium', tags: ['anillos', 'actividad', 'concentrico', 'mono'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env, r = seedFor(env.seed, 'data')
    // 2 anillos de ACTIVIDAD concentricos (estilo "rings") con cap redondeado; 2 metricas + leyenda debajo.
    const cx = W / 2, cy = H * 0.4, lws = 22
    const rads = [W * 0.3, W * 0.3 - lws - 8]
    const pcts = [range(r, 0.6, 0.98), range(r, 0.45, 0.85)]
    const cols = [pal.accent, pal.accent2]
    const start = -TAU / 4
    ctx.lineCap = 'round'
    for (let i = 0; i < 2; i++) {
      const ap = eOutCubic(inv(t, 0.1 + i * 0.14, 1.1 + i * 0.14))
      ctx.lineWidth = lws
      ctx.strokeStyle = hairline(pal, 0.09); ctx.beginPath(); ctx.arc(cx, cy, rads[i], 0, TAU); ctx.stroke()
      const sweepA = TAU * pcts[i] * ap
      ctx.strokeStyle = cols[i]; ctx.beginPath(); ctx.arc(cx, cy, rads[i], start, start + sweepA); ctx.stroke()
      // sheen idle orbita cada anillo (clip al barrido), desfasado
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, rads[i] + lws, start, start + sweepA); ctx.arc(cx, cy, rads[i] - lws, start + sweepA, start, true); ctx.closePath(); ctx.clip()
      sheenArc(ctx, cx, cy, rads[i], lws, t, cols[i], { period: 4.4 + i * 0.4, phase: i * 0.35, span: 0.6, strength: 0.42 })
      ctx.restore()
    }
    // numero principal (anillo externo) al centro
    drawText(ctx, Math.round(pcts[0] * 100 * eOutCubic(inv(t, 0.1, 1.1))) + '%', cx, cy, { size: 50, weight: 700, family: fonts.accent, maxW: rads[1] * 1.4, color: numColor(pal) })
    // leyenda debajo (2 filas: punto + etiqueta + %)
    const labs = [shortLabel(content.tagline, 2) || 'Alcance', shortLabel(content.claim, 2) || 'Interaccion']
    const ly0 = cy + rads[0] + 44, rowH = 38
    for (let i = 0; i < 2; i++) {
      const ly = ly0 + i * rowH
      const la = inv(t, 0.6 + i * 0.12, 1.1 + i * 0.12)
      ctx.save(); ctx.globalAlpha = la
      ctx.fillStyle = cols[i]; ctx.beginPath(); ctx.arc(W * 0.22, ly, 8, 0, TAU); ctx.fill()
      drawText(ctx, labs[i], W * 0.22 + 18, ly, { size: 15, weight: 600, family: fonts.text, align: 'left', maxW: W * 0.4, color: pal.ink })
      drawText(ctx, Math.round(pcts[i] * 100) + '%', W * 0.82, ly, { size: 18, weight: 700, family: fonts.accent, align: 'right', maxW: W * 0.18, color: numColor(pal) })
      ctx.restore()
    }
  },
})

// ====================================================================== donut (mas)
register({
  id: 'data.donut.gauge270', lib: 'datakit', category: 'donut', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  real: true, needsStats: 1, needsType: 'percent',   // MIGRADO (item L152): el arco 270 se llena por un % REAL (statPercent); el selector solo lo elige si hay un % real -> nunca escena vacia.
  register: 'neutral', intensity: 'medium', tags: ['donut', 'gauge', '270', 'porcentaje', 'mono'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env
    const pr = statPercent(content); if (!pr) return   // honestidad: solo con un % real
    // gauge de 270 grados (3/4 de vuelta, hueco abajo) con numero grande al centro y etiquetas min/max. Limpio.
    const cx = W / 2, cy = H * 0.44, rad = W * 0.32, lw = 22
    const pct = pr.pct
    const ap = eOutCubic(inv(t, 0.1, 1.2))
    const a0 = Math.PI * 0.75, total = Math.PI * 1.5   // 270 grados, hueco abajo
    ctx.lineCap = 'round'; ctx.lineWidth = lw
    ctx.strokeStyle = hairline(pal, 0.1); ctx.beginPath(); ctx.arc(cx, cy, rad, a0, a0 + total); ctx.stroke()
    const sweep270 = total * pct * ap
    ctx.strokeStyle = pal.accent; ctx.beginPath(); ctx.arc(cx, cy, rad, a0, a0 + sweep270); ctx.stroke()
    // sheen idle recorre el arco lleno (clip al barrido)
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, rad + lw, a0, a0 + sweep270); ctx.arc(cx, cy, rad - lw, a0 + sweep270, a0, true); ctx.closePath(); ctx.clip()
    { const k = idleK(t); if (k > 0.001) { const p = ((t / 4) % 1 + 1) % 1, sa = a0 + sweep270 * p; ctx.save(); ctx.lineCap = 'round'; ctx.lineWidth = lw; ctx.globalAlpha = 0.45 * k; ctx.strokeStyle = lighten(pal.accent, 0.5); ctx.beginPath(); ctx.arc(cx, cy, rad, sa - 0.25, sa + 0.25); ctx.stroke(); ctx.restore() } }
    ctx.restore()
    // punto cabeza con glow idle
    const ha = a0 + sweep270
    ctx.save(); ctx.globalAlpha = glow(t, 0, 0.75, 1); ctx.fillStyle = lighten(pal.accent, 0.3); ctx.beginPath(); ctx.arc(cx + Math.cos(ha) * rad, cy + Math.sin(ha) * rad, lw * 0.42 * breath(t, 0, 0.06, 1.3), 0, TAU); ctx.fill(); ctx.restore()
    // numero grande centro = el VALOR REAL con count-up
    drawText(ctx, statDisplay(pr.st, t, 0.1, 1.2), cx, cy - 4, { size: 64, weight: 700, family: fonts.accent, maxW: rad * 1.5, color: numColor(pal) })
    drawText(ctx, shortLabel(pr.st.label, 3) || 'del objetivo', cx, cy + 40, { size: 16, weight: 600, family: fonts.text, maxW: rad * 1.5, color: pal.dim, alpha: inv(t, 0.5, 1) })
    // min / max en las puntas inferiores
    const mAp = inv(t, 0.6, 1.1)
    drawText(ctx, '0', cx + Math.cos(a0) * (rad + 4), cy + Math.sin(a0) * (rad + 4) + 16, { size: 13, weight: 700, family: fonts.accent, maxW: 40, color: pal.dim, alpha: mAp })
    drawText(ctx, '100', cx + Math.cos(a0 + total) * (rad + 4), cy + Math.sin(a0 + total) * (rad + 4) + 16, { size: 13, weight: 700, family: fonts.accent, maxW: 50, color: pal.dim, alpha: mAp })
  },
})

// ====================================================================== series / tendencia (mas)
register({
  id: 'data.series.areaglow', lib: 'datakit', category: 'series/tendencia', tones: ['dark', 'light'], rubros: ['*'], weight: 1.1,
  register: 'neutral', intensity: 'medium', tags: ['serie', 'area', 'grilla', 'tendencia'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env, r = seedFor(env.seed, 'data')
    // serie de area suave con GRILLA de fondo (3 lineas h) + etiquetas de eje + valor final. Limpio "dashboard".
    const n = 10, x0 = W * 0.14, x1 = W * 0.9, yTop = H * 0.34, yBot = H * 0.62
    const pts = []
    let acc = 0.22
    for (let i = 0; i < n; i++) { acc = clamp(acc + range(r, -0.06, 0.18), 0.08, 1); pts.push({ x: lerp(x0, x1, i / (n - 1)), y: lerp(yBot, yTop, acc), v: acc }) }
    // grilla (3 lineas horizontales)
    for (let g = 0; g <= 2; g++) {
      const gy = lerp(yTop, yBot, g / 2)
      ctx.strokeStyle = hairline(pal, 0.07); ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(x0, gy); ctx.lineTo(x1, gy); ctx.stroke()
    }
    const draw = eOutCubic(inv(t, 0.1, 1.3))
    const shown = clamp(draw * (n - 1), 0, n - 1), li = Math.floor(shown), fr = shown - li
    const ex = li < n - 1 ? lerp(pts[li].x, pts[li + 1].x, fr) : pts[n - 1].x
    const ey = li < n - 1 ? lerp(pts[li].y, pts[li + 1].y, fr) : pts[n - 1].y
    // area
    ctx.save(); ctx.beginPath(); ctx.moveTo(pts[0].x, yBot)
    for (let i = 0; i <= li; i++) ctx.lineTo(pts[i].x, pts[i].y)
    ctx.lineTo(ex, ey); ctx.lineTo(ex, yBot); ctx.closePath()
    const ag = ctx.createLinearGradient(0, yTop, 0, yBot)
    ag.addColorStop(0, rgba(pal.accent, 0.3)); ag.addColorStop(1, rgba(pal.accent, 0))
    ctx.fillStyle = ag; ctx.fill(); ctx.restore()
    // linea
    ctx.strokeStyle = pal.accent; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i <= li; i++) ctx.lineTo(pts[i].x, pts[i].y)
    ctx.lineTo(ex, ey); ctx.stroke()
    // punto cabeza + halo idle que late
    if (idleK(t) > 0.001) { const pp = ((t / 2.2) % 1 + 1) % 1; ctx.save(); ctx.globalAlpha = (1 - pp) * 0.5 * idleK(t); ctx.strokeStyle = lighten(pal.accent, 0.3); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ex, ey, 5 + pp * 12, 0, TAU); ctx.stroke(); ctx.restore() }
    ctx.save(); ctx.globalAlpha = glow(t, 0, 0.75, 1); ctx.fillStyle = lighten(pal.accent, 0.3); ctx.beginPath(); ctx.arc(ex, ey, 5 * breath(t, 0, 0.06, 1.4), 0, TAU); ctx.fill(); ctx.restore()
    // valor final grande arriba
    drawText(ctx, Math.round(pts[n - 1].v * 100) + '%', W / 2, H * 0.24, { size: 42, weight: 700, family: fonts.accent, maxW: W * 0.5, color: numColor(pal), alpha: inv(t, 0.4, 1) })
    const lab = content.tagline || content.claim
    if (lab) drawText(ctx, lab, W / 2, H * 0.7, { size: 18, weight: 600, family: fonts.text, maxW: W * 0.8, color: pal.dim, alpha: inv(t, 0.7, 1.2) })
  },
})

register({
  id: 'data.series.candles', lib: 'datakit', category: 'series/tendencia', tones: ['dark', 'light'], rubros: ['*'], weight: 0.9,
  register: 'neutral', intensity: 'medium', tags: ['serie', 'velas', 'mercado', 'tendencia'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env, r = seedFor(env.seed, 'data')
    // mini-velas (8) estilo mercado: cuerpo + mecha; alcistas en acento, bajistas atenuadas. Tendencia al alza.
    const n = 8, x0 = W * 0.14, span = W * 0.72, base = H * 0.62, area = H * 0.32
    const slot = span / n, bw = slot * 0.46
    let lvl = 0.3
    const titulo = content.tagline || content.claim
    if (titulo) drawText(ctx, titulo, W / 2, H * 0.2, { size: 21, weight: 700, family: fonts.display, maxW: W * 0.84, color: pal.ink, alpha: inv(t, 0.1, 0.55) })
    for (let i = 0; i < n; i++) {
      const open = lvl
      const drift = range(r, -0.05, 0.2)               // sesgo al alza claro
      const close = clamp(open + drift, 0.08, 1)
      const hi = clamp(Math.max(open, close) + range(r, 0.03, 0.1), 0, 1)
      const lo = clamp(Math.min(open, close) - range(r, 0.03, 0.1), 0, 1)
      lvl = close
      const up = close >= open
      const ap = eOutCubic(inv(t, 0.1 + i * 0.08, 0.7 + i * 0.08))
      const cx = x0 + i * slot + slot / 2
      const yOf = v => base - area * v * ap
      // glow idle por onda que recorre las velas alcistas (las del alza laten)
      ctx.save(); if (up) ctx.globalAlpha = glow(t, -i * 0.55, 0.78, 1)
      // mecha
      ctx.strokeStyle = up ? pal.accent : rgba(pal.accent, 0.4); ctx.lineWidth = 2; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(cx, yOf(hi)); ctx.lineTo(cx, yOf(lo)); ctx.stroke()
      // cuerpo
      const yTopB = yOf(Math.max(open, close)), yBotB = yOf(Math.min(open, close))
      ctx.fillStyle = up ? pal.accent : rgba(pal.accent, 0.4)
      roundRectPath(ctx, cx - bw / 2, yTopB, bw, Math.max(3, yBotB - yTopB), 3); ctx.fill()
      ctx.restore()
    }
    // base
    ctx.strokeStyle = hairline(pal, 0.1); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x0, base + 1); ctx.lineTo(x0 + span, base + 1); ctx.stroke()
    // delta total
    const delta = Math.round((lvl - 0.3) * 100)
    drawText(ctx, (delta >= 0 ? '+' : '') + delta + '%', W / 2, H * 0.7, { size: 28, weight: 700, family: fonts.accent, maxW: W * 0.5, color: numColor(pal), alpha: inv(t, 0.7, 1.2) })
  },
})

// ====================================================================== comparacion / proporcion (mas)
register({
  id: 'data.compare.tugofwar', lib: 'datakit', category: 'comparacion/proporcion', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  register: 'neutral', intensity: 'medium', tags: ['comparacion', 'balance', 'cuota', 'mono'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env, r = seedFor(env.seed, 'data')
    // barra unica balance A|B con marcador que se asienta segun la cuota (la nuestra gana). % a cada lado.
    const x0 = W * 0.1, bw = W * 0.8, y = H * 0.46, bh = 46
    const share = range(r, 0.56, 0.8)                  // cuota de A (nosotros)
    const ap = eOutExpo(inv(t, 0.1, 1))
    const cut = bw * (0.5 + (share - 0.5) * ap)        // arranca al medio, se asienta en la cuota
    const titulo = content.tagline || content.claim
    if (titulo) drawText(ctx, titulo, W / 2, H * 0.26, { size: 22, weight: 700, family: fonts.display, maxW: W * 0.84, color: pal.ink, alpha: inv(t, 0.1, 0.55) })
    // lado B (resto, atenuado)
    ctx.fillStyle = rgba(pal.accent, 0.18); roundRectPath(ctx, x0, y, bw, bh, bh / 2); ctx.fill()
    // lado A (acento, clip a la barra)
    ctx.save(); roundRectPath(ctx, x0, y, bw, bh, bh / 2); ctx.clip()
    ctx.fillStyle = pal.accent; ctx.fillRect(x0, y, cut, bh); ctx.restore()
    // sheen idle recorre el lado de acento
    sheen(ctx, x0, y, cut, bh, t, { period: 3.6, strength: 0.16, r: bh / 2 })
    // marcador (linea + circulo) -> circulo respira + glow idle
    const mx = x0 + cut
    ctx.strokeStyle = pal.bg0; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(mx, y - 6); ctx.lineTo(mx, y + bh + 6); ctx.stroke()
    ctx.save(); ctx.globalAlpha = glow(t, 0, 0.78, 1); ctx.fillStyle = numColor(pal); ctx.beginPath(); ctx.arc(mx, y + bh / 2, 8 * breath(t, 0, 0.05, 1.2), 0, TAU); ctx.fill(); ctx.restore()
    // % a cada lado (dentro)
    drawText(ctx, Math.round(share * 100 * ap) + '%', x0 + 18, y + bh / 2, { size: 22, weight: 700, family: fonts.accent, align: 'left', maxW: cut - 24, color: pal.onAccent, alpha: inv(t, 0.4, 1) })
    drawText(ctx, Math.round((1 - share) * 100 * ap) + '%', x0 + bw - 18, y + bh / 2, { size: 20, weight: 700, family: fonts.accent, align: 'right', maxW: bw - cut - 24, color: numColor(pal), alpha: inv(t, 0.4, 1) })
    // etiquetas debajo
    const lAp = inv(t, 0.6, 1.1)
    drawText(ctx, shortLabel(content.brand, 2) || 'Nosotros', x0, y + bh + 26, { size: 15, weight: 700, family: fonts.text, align: 'left', maxW: bw * 0.5, color: numColor(pal), alpha: lAp })
    drawText(ctx, 'Resto', x0 + bw, y + bh + 26, { size: 15, weight: 600, family: fonts.text, align: 'right', maxW: bw * 0.4, color: pal.dim, alpha: lAp })
  },
})

register({
  id: 'data.compare.dumbbell', lib: 'datakit', category: 'comparacion/proporcion', tones: ['dark', 'light'], rubros: ['*'], weight: 0.9,
  register: 'neutral', intensity: 'soft', tags: ['comparacion', 'dumbbell', 'antes-despues', 'mono'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env, r = seedFor(env.seed, 'data')
    // filas "dumbbell": 2 puntos unidos por una linea (antes atenuado -> despues acento) -> brecha visible.
    const n = 4, x0 = W * 0.16, span = W * 0.62, top = H * 0.32, gap = H * 0.11
    const labels = [content.brand, content.tagline, content.claim, content.cta]
    const def = ['Q1', 'Q2', 'Q3', 'Q4']
    const titulo = content.tagline || content.claim
    if (titulo) drawText(ctx, titulo, W / 2, H * 0.22, { size: 21, weight: 700, family: fonts.display, maxW: W * 0.84, color: pal.ink, alpha: inv(t, 0.1, 0.55) })
    for (let i = 0; i < n; i++) {
      const y = top + i * gap
      const a = range(r, 0.15, 0.45), b = clamp(a + range(r, 0.2, 0.5), 0, 1)
      const ap = eOutCubic(inv(t, 0.12 + i * 0.1, 0.9 + i * 0.1))
      const xa = x0 + span * a, xb = x0 + span * (a + (b - a) * ap)
      // etiqueta
      drawText(ctx, shortLabel(labels[i], 1) || def[i], x0 - 12, y, { size: 14, weight: 600, family: fonts.text, align: 'right', maxW: W * 0.12, color: pal.dim, alpha: ap })
      // linea conectora
      ctx.strokeStyle = rgba(pal.accent, 0.4); ctx.lineWidth = 4; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(xa, y); ctx.lineTo(xb, y); ctx.stroke()
      // punto antes (atenuado, hueco)
      ctx.fillStyle = pal.bg0; ctx.beginPath(); ctx.arc(xa, y, 8, 0, TAU); ctx.fill()
      ctx.strokeStyle = rgba(pal.accent, 0.5); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(xa, y, 8, 0, TAU); ctx.stroke()
      // punto despues (acento, lleno) -> respira + glow idle (desfasado por fila)
      ctx.save(); ctx.globalAlpha = ap * glow(t, i * 0.7, 0.72, 1); ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.arc(xb, y, 9 * breath(t, i * 0.7, 0.06, 1.2), 0, TAU); ctx.fill(); ctx.restore()
      // valor despues a la derecha
      drawText(ctx, Math.round(b * 100 * ap) + '', x0 + span + 18, y, { size: 15, weight: 700, family: fonts.accent, align: 'left', maxW: W * 0.12, color: numColor(pal), alpha: ap })
    }
  },
})

// ====================================================================== rating / prueba-social (mas)
register({
  id: 'data.rating.nps', lib: 'datakit', category: 'rating/prueba-social', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  register: 'friendly', intensity: 'medium', tags: ['rating', 'nps', 'gauge', 'mono'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env, r = seedFor(env.seed, 'data')
    // medidor NPS: semicirculo de 3 tramos (detractores/pasivos/promotores) + aguja al score. Numero NPS al centro.
    const cx = W / 2, cy = H * 0.52, rad = W * 0.34, lw = 24
    const score = range(r, 0.55, 0.92)                 // posicion 0..1 en el arco
    const npsVal = Math.round(range(r, 42, 88))        // valor NPS mostrado
    const ap = eOutCubic(inv(t, 0.1, 1.2))
    const a0 = Math.PI, total = Math.PI                 // semicirculo superior
    // 3 tramos del arco
    const segs = [0.34, 0.33, 0.33]
    const cols = [rgba(pal.accent, 0.25), rgba(pal.accent, 0.5), pal.accent]
    ctx.lineCap = 'butt'; ctx.lineWidth = lw
    let aa = a0
    for (let i = 0; i < 3; i++) {
      const seg = total * segs[i]
      // el tramo de promotores (acento pleno) late suave
      ctx.save(); if (i === 2) ctx.globalAlpha = glow(t, 0, 0.8, 1)
      ctx.strokeStyle = cols[i]; ctx.beginPath(); ctx.arc(cx, cy, rad, aa + 0.015, aa + seg - 0.015); ctx.stroke(); ctx.restore()
      aa += seg
    }
    // aguja al score con micro-oscilacion idle (el numero NPS usa npsVal*ap; el angulo dibujado oscila ±)
    const na = a0 + total * score * ap + idleK(t) * Math.sin(t * 1.3) * 0.016
    const nx = cx + Math.cos(na) * (rad - 2), ny = cy + Math.sin(na) * (rad - 2)
    ctx.strokeStyle = numColor(pal); ctx.lineWidth = 4; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(nx, ny); ctx.stroke()
    ctx.save(); ctx.globalAlpha = glow(t, 0, 0.82, 1); ctx.fillStyle = numColor(pal); ctx.beginPath(); ctx.arc(cx, cy, 8 * breath(t, 0, 0.05, 1.2), 0, TAU); ctx.fill(); ctx.restore()
    // numero NPS bajo el centro
    drawText(ctx, 'NPS', cx, cy + 32, { size: 14, weight: 700, family: fonts.accent, maxW: rad, color: pal.dim, alpha: inv(t, 0.5, 1) })
    drawText(ctx, String(Math.round(npsVal * ap)), cx, cy + 70, { size: 56, weight: 700, family: fonts.accent, maxW: rad * 1.4, color: numColor(pal) })
    const lab = content.tagline || content.claim
    if (lab) drawText(ctx, lab, cx, cy + 120, { size: 17, weight: 600, family: fonts.text, maxW: W * 0.8, color: pal.dim, alpha: inv(t, 0.7, 1.2) })
  },
})

// ====================================================================== timeline / proceso (mas)
register({
  id: 'data.timeline.zigzag', lib: 'datakit', category: 'timeline/proceso', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  register: 'neutral', intensity: 'medium', tags: ['timeline', 'alternado', 'pasos', 'mono'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env, r = seedFor(env.seed, 'data')
    // timeline vertical ALTERNADO: linea central + nodos numerados; etiqueta a izq/der alternando. La linea se dibuja.
    const n = 4, cx = W / 2, top = H * 0.22, gap = H * 0.16, nodeR = 16
    const yEnd = top + (n - 1) * gap
    const labels = [content.brand, content.tagline, content.claim, content.cta]
    const def = ['Importas', 'Generas', 'Lanzas', 'Afinas']
    // riel + progreso
    ctx.lineCap = 'round'; ctx.lineWidth = 4
    ctx.strokeStyle = hairline(pal, 0.12); ctx.beginPath(); ctx.moveTo(cx, top); ctx.lineTo(cx, yEnd); ctx.stroke()
    const prog = eOutCubic(inv(t, 0.1, 1.1))
    const yProg = lerp(top, yEnd, prog)
    ctx.strokeStyle = pal.accent; ctx.beginPath(); ctx.moveTo(cx, top); ctx.lineTo(cx, yProg); ctx.stroke()
    // idle: chispa recorre la parte de acento de la linea central
    const ik = idleK(t)
    if (ik > 0.001 && yProg > top + 6) { const pp = ((t / 2.6) % 1 + 1) % 1, sy = lerp(top + 4, yProg - 4, pp); ctx.save(); ctx.globalAlpha = ik * Math.sin(pp * Math.PI) * 0.85; ctx.fillStyle = lighten(pal.accent, 0.4); ctx.beginPath(); ctx.arc(cx, sy, 4, 0, TAU); ctx.fill(); ctx.restore() }
    for (let i = 0; i < n; i++) {
      const y = top + i * gap
      const reach = inv(prog, i / (n - 1) - 0.02, i / (n - 1) + 0.12)
      const ap = eOutBack01(reach)
      const left = i % 2 === 0
      // conector corto al rotulo
      const cxe = left ? cx - nodeR - 8 : cx + nodeR + 8
      const lblX = left ? cx - nodeR - 18 : cx + nodeR + 18
      ctx.strokeStyle = reach > 0.5 ? rgba(pal.accent, 0.6) : hairline(pal, 0.14); ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(left ? cx - nodeR : cx + nodeR, y); ctx.lineTo(cxe, y); ctx.stroke()
      // halo idle que late en nodos alcanzados
      if (reach > 0.5 && ik > 0.001) { const hp = ((t / 2.4 + i * 0.22) % 1 + 1) % 1; ctx.save(); ctx.globalAlpha = (1 - hp) * 0.35 * ik; ctx.strokeStyle = pal.accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, y, nodeR + hp * 8, 0, TAU); ctx.stroke(); ctx.restore() }
      // nodo
      ctx.save(); ctx.translate(cx, y)
      ctx.fillStyle = reach > 0.5 ? pal.accent : pal.bg0; ctx.beginPath(); ctx.arc(0, 0, nodeR, 0, TAU); ctx.fill()
      ctx.lineWidth = 3; ctx.strokeStyle = reach > 0.5 ? pal.accent : hairline(pal, 0.25); ctx.beginPath(); ctx.arc(0, 0, nodeR, 0, TAU); ctx.stroke()
      drawText(ctx, String(i + 1), 0, 1, { size: 15, weight: 700, family: fonts.accent, maxW: nodeR * 1.6, color: reach > 0.5 ? pal.onAccent : pal.dim })
      ctx.restore()
      // rotulo alternado
      const lab = shortLabel(labels[i], 3) || def[i]
      drawText(ctx, lab, lblX, y, { size: 17, weight: 600, family: fonts.text, align: left ? 'right' : 'left', maxW: W * 0.34, color: reach > 0.5 ? pal.ink : pal.dim, alpha: clamp(0.4 + ap * 0.6, 0, 1) })
    }
  },
})

// ====================================================================== numberStack (mas)
register({
  id: 'data.stack.bigsmall', lib: 'datakit', category: 'numberStack', tones: ['dark', 'light'], rubros: ['*'], weight: 1.1,
  real: true, needsStats: 3,   // MIGRADO (item L152): 1 hero REAL (rs[0]) + 2 chicos REALES (rs[1..2]); sin 3 se auto-salta.
  register: 'neutral', intensity: 'bold', tags: ['kpi', 'hero', 'jerarquia', 'mono'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env
    // 1 numero HERO REAL arriba + 2 stats REALES chicos lado a lado debajo (jerarquia). Regla de acento separa.
    const rs = (content.stats || []).filter(s => s && (s.value || s.value === 0)).slice(0, 3)
    if (rs.length < 3) return   // honestidad: solo con 3 stats reales (hero + 2)
    const cx = W / 2
    // hero (el VALOR REAL, ya con su prefijo/sufijo)
    drawText(ctx, shortLabel(rs[0].label, 3) || 'Ingresos', cx, H * 0.24, { size: 16, weight: 600, family: fonts.text, maxW: W * 0.8, color: pal.dim, alpha: inv(t, 0.2, 0.8) })
    drawText(ctx, statDisplay(rs[0], t, 0.1, 1.1), cx, H * 0.36, { size: 84, weight: 700, family: fonts.accent, maxW: W * 0.86, color: numColor(pal), shadow: pal.tone === 'dark' ? 'rgba(0,0,0,0.3)' : null })
    // regla de acento -> respira ancho + glow idle
    const ru = eOutCubic(inv(t, 0.4, 1)), rw = 90 * ru * breath(t, 0, 0.02)
    ctx.save(); ctx.globalAlpha = glow(t, 0, 0.78, 1)
    ctx.fillStyle = pal.accent; roundRectPath(ctx, cx - rw / 2, H * 0.43, rw, 5, 2.5); ctx.fill(); ctx.restore()
    // 2 stats chicos REALES
    const xs = [W * 0.3, W * 0.7]
    for (let i = 0; i < 2; i++) {
      const ap = inv(t, 0.5 + i * 0.12, 1.1 + i * 0.12)
      drawText(ctx, statDisplay(rs[i + 1], t, 0.5 + i * 0.12, 1.1 + i * 0.12), xs[i], H * 0.56, { size: 40, weight: 700, family: fonts.accent, maxW: W * 0.34, color: numColor(pal), alpha: clamp(ap * 1.3, 0, 1) })
      drawText(ctx, shortLabel(rs[i + 1].label, 2), xs[i], H * 0.62, { size: 14, weight: 600, family: fonts.text, maxW: W * 0.34, color: pal.dim, alpha: clamp(ap * 1.2, 0, 1) })
    }
    // divisor vertical entre los 2 chicos
    const dh = eOutCubic(inv(t, 0.6, 1)) * 50
    ctx.fillStyle = hairline(pal, 0.18); roundRectPath(ctx, cx - 1, H * 0.56 - dh / 2, 2, dh, 1); ctx.fill()
  },
})

// ====================================================================== progreso (mas)
register({
  id: 'data.progress.dialarc', lib: 'datakit', category: 'progreso', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  real: true, needsStats: 1, needsType: 'percent',   // MIGRADO (item L152): el arco 3/4 + los ticks se llenan por un % REAL (statPercent); el selector solo lo elige si hay un % real -> nunca escena vacia.
  register: 'neutral', intensity: 'medium', tags: ['progreso', 'arco', 'escala', 'mono'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env
    const pr = statPercent(content); if (!pr) return   // honestidad: solo con un % real
    // arco de progreso (3/4) con ESCALA de puntos alrededor (12 ticks que se encienden) + numero central. Premium.
    const cx = W / 2, cy = H * 0.42, rad = W * 0.3, lw = 16, nTicks = 12
    const pct = pr.pct
    const ap = eOutCubic(inv(t, 0.1, 1.2))
    const a0 = Math.PI * 0.75, total = Math.PI * 1.5
    // arco riel + acento
    ctx.lineCap = 'round'; ctx.lineWidth = lw
    ctx.strokeStyle = hairline(pal, 0.1); ctx.beginPath(); ctx.arc(cx, cy, rad, a0, a0 + total); ctx.stroke()
    const sweepDA = total * pct * ap
    ctx.strokeStyle = pal.accent; ctx.beginPath(); ctx.arc(cx, cy, rad, a0, a0 + sweepDA); ctx.stroke()
    // sheen idle recorre el arco lleno (clip al barrido)
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, rad + lw, a0, a0 + sweepDA); ctx.arc(cx, cy, rad - lw, a0 + sweepDA, a0, true); ctx.closePath(); ctx.clip()
    { const k = idleK(t); if (k > 0.001) { const p = ((t / 4) % 1 + 1) % 1, sa = a0 + sweepDA * p; ctx.save(); ctx.lineCap = 'round'; ctx.lineWidth = lw; ctx.globalAlpha = 0.45 * k; ctx.strokeStyle = lighten(pal.accent, 0.5); ctx.beginPath(); ctx.arc(cx, cy, rad, sa - 0.22, sa + 0.22); ctx.stroke(); ctx.restore() } }
    ctx.restore()
    // ticks de escala fuera del arco (los encendidos laten en onda, sin cambiar cuales estan on)
    const litTicks = nTicks * pct * ap
    for (let i = 0; i <= nTicks; i++) {
      const a = a0 + total * (i / nTicks)
      const on = i < litTicks
      const r1 = rad + lw * 0.7, r2 = rad + lw * 0.95
      ctx.save(); ctx.globalAlpha = on ? glow(t, -i * 0.4, 0.7, 1) : 1
      ctx.strokeStyle = on ? pal.accent : hairline(pal, 0.18); ctx.lineWidth = on ? 3 : 2
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2); ctx.stroke(); ctx.restore()
    }
    // numero central = el VALOR REAL con count-up
    drawText(ctx, statDisplay(pr.st, t, 0.1, 1.2), cx, cy - 4, { size: 58, weight: 700, family: fonts.accent, maxW: rad * 1.4, color: numColor(pal) })
    drawText(ctx, shortLabel(pr.st.label, 3) || 'completado', cx, cy + 38, { size: 16, weight: 600, family: fonts.text, maxW: rad * 1.5, color: pal.dim, alpha: inv(t, 0.5, 1) })
    const lab = content.claim
    if (lab && lab !== content.tagline) drawText(ctx, lab, cx, cy + rad + 56, { size: 18, weight: 600, family: fonts.text, maxW: W * 0.8, color: pal.dim, alpha: inv(t, 0.7, 1.2) })
  },
})

// ---- helpers OLA 6 (puros) ----
// roundRect como PATH (sin fill/stroke) -> el caller decide; acepta radio numero o array [tl,tr,br,bl].
function roundRectPath(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r) }
