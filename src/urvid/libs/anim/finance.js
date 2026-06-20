// urvid 1.0 · ANIM · FINANZAS / DINERO — micro-animaciones vectoriales line-art (monedas, torta, $, alcancia, escudo,
// %, banco, billetera, velas de trading, factura). render(ctx, t, env). PURAS + DETERMINISTAS (solo `t`; cero
// Math.random/Date.now). Color SIEMPRE de env.pal (ink/accent/onAccent/bg0/tone). Loopean suave sin costura.
import { register } from '../../core/registry.js'
import { W, H, TAU, rgba, clamp, inv, lerp, eOutCubic, eInOutCubic, eOutBack, spring } from '../../core/util.js'
import { CX, CY, R, LW, loop, pulse, ink, spark, rr, starShape, polyShape } from './_shared.js'

// =============================================================================
// COINS — monedas que se apilan una sobre otra
// =============================================================================
register({
  id: 'anim.finance.coins', lib: 'anim', category: 'finance', tones: ['dark', 'light'],
  rubros: ['finanzas', 'default', 'inmobiliaria', 'educacion'], weight: 1, tags: ['monedas', 'dinero', 'ahorro', 'apilar', 'efectivo'],
  register: 'corporate', intensity: 'medium', concept: 'coins', describe: 'Tres monedas caen y se apilan una sobre otra, la de arriba en acento.',
  render(ctx, t, env) {
    const { pal } = env, per = 2.8, p = loop(t, per)
    const cw = R * 1.15, ch = R * 0.34, baseY = CY + R * 1.05, n = 3
    // dibuja una moneda eliptica (canto + tapa) en (cx, cy)
    function coin(cx, cy, top) {
      ctx.save()
      // canto
      ctx.fillStyle = top ? rgba(pal.accent, 0.9) : rgba(pal.ink, pal.tone === 'light' ? 0.16 : 0.22)
      ctx.beginPath(); ctx.ellipse(cx, cy, cw / 2, ch / 2, 0, 0, Math.PI); ctx.lineTo(cx - cw / 2, cy); ctx.closePath()
      ctx.beginPath()
      ctx.moveTo(cx - cw / 2, cy); ctx.lineTo(cx - cw / 2, cy - ch * 0.5)
      ctx.ellipse(cx, cy - ch * 0.5, cw / 2, ch / 2, 0, Math.PI, 0, true)
      ctx.lineTo(cx + cw / 2, cy); ctx.ellipse(cx, cy, cw / 2, ch / 2, 0, 0, Math.PI); ctx.closePath(); ctx.fill()
      // tapa
      ctx.fillStyle = top ? pal.accent : rgba(pal.ink, pal.tone === 'light' ? 0.9 : 0.92)
      ctx.beginPath(); ctx.ellipse(cx, cy - ch * 0.5, cw / 2, ch / 2, 0, 0, TAU); ctx.fill()
      // ranurita de la tapa
      ink(ctx, pal, LW * 0.7); ctx.strokeStyle = top ? (pal.onAccent || pal.bg0) : pal.bg0
      ctx.beginPath(); ctx.moveTo(cx - cw * 0.12, cy - ch * 0.5); ctx.lineTo(cx + cw * 0.12, cy - ch * 0.5); ctx.stroke()
      ctx.restore()
    }
    // las 3 caen escalonadas y se asientan
    for (let i = 0; i < n; i++) {
      const drop = eOutBack(clamp(inv(p, 0.06 + i * 0.22, 0.46 + i * 0.22), 0, 1))
      const restY = baseY - i * ch * 0.95
      const cy = lerp(restY - R * 1.5, restY, drop)
      const a = clamp(inv(p, 0.06 + i * 0.22, 0.3 + i * 0.22), 0, 1)
      ctx.save(); ctx.globalAlpha = a; coin(CX, cy, i === n - 1 && drop > 0.96); ctx.restore()
      if (i === n - 1 && drop > 0.97) spark(ctx, pal, CX, cy - ch * 0.5, R * 0.07, pulse(t, 1.6))
    }
  },
})

// =============================================================================
// PIE — grafico de torta que se rellena girando
// =============================================================================
register({
  id: 'anim.finance.pie', lib: 'anim', category: 'finance', tones: ['dark', 'light'],
  rubros: ['finanzas', 'tech', 'default', 'educacion'], weight: 1, tags: ['torta', 'porcentaje', 'distribucion', 'datos', 'grafico'],
  register: 'corporate', intensity: 'soft', concept: 'pie', describe: 'Un grafico de torta se rellena de acento girando y vuelve.',
  render(ctx, t, env) {
    const { pal } = env, per = 3.0, p = loop(t, per), rad = R * 1.05, a0 = -Math.PI / 2
    // fraccion: sube y baja suave (sin costura)
    const f = 0.5 - 0.5 * Math.cos(loop(t, per) * TAU)
    const frac = lerp(0.12, 0.96, eInOutCubic(f))
    // disco base (anillo en tinta tenue)
    ctx.save()
    ctx.fillStyle = rgba(pal.ink, pal.tone === 'light' ? 0.1 : 0.16)
    ctx.beginPath(); ctx.arc(CX, CY, rad, 0, TAU); ctx.fill()
    // sector de acento
    ctx.fillStyle = pal.accent
    ctx.beginPath(); ctx.moveTo(CX, CY); ctx.arc(CX, CY, rad, a0, a0 + TAU * frac); ctx.closePath(); ctx.fill()
    // contorno
    ink(ctx, pal, LW); ctx.strokeStyle = pal.ink
    ctx.beginPath(); ctx.arc(CX, CY, rad, 0, TAU); ctx.stroke()
    // lineas de los dos cortes
    ctx.beginPath(); ctx.moveTo(CX, CY); ctx.lineTo(CX + Math.cos(a0) * rad, CY + Math.sin(a0) * rad)
    ctx.moveTo(CX, CY); ctx.lineTo(CX + Math.cos(a0 + TAU * frac) * rad, CY + Math.sin(a0 + TAU * frac) * rad); ctx.stroke()
    // chispa que recorre el borde del sector
    const ea = a0 + TAU * frac
    spark(ctx, pal, CX + Math.cos(ea) * rad, CY + Math.sin(ea) * rad, R * 0.08, 0.6 + 0.4 * pulse(t, 1.5))
    ctx.restore()
  },
})

// =============================================================================
// DOLLAR — signo $ que late con glow de acento
// =============================================================================
register({
  id: 'anim.finance.dollar', lib: 'anim', category: 'finance', tones: ['dark', 'light'],
  rubros: ['finanzas', 'default', 'inmobiliaria', 'gastronomia', 'moda'], weight: 1, tags: ['dinero', 'precio', 'dolar', 'peso', 'valor'],
  register: 'corporate', intensity: 'medium', concept: 'dollar', describe: 'Un signo $ dentro de un circulo late con un glow de acento.',
  render(ctx, t, env) {
    const { pal } = env, per = 2.4
    const beat = 1 + 0.06 * pulse(t, per, 1)
    const glow = 0.4 + 0.6 * pulse(t, per, 1)
    const rad = R * 1.0
    ctx.save(); ctx.translate(CX, CY); ctx.scale(beat, beat)
    // halo de acento detras
    ctx.save(); ctx.globalAlpha = 0.25 * glow; ctx.fillStyle = pal.accent
    ctx.shadowColor = pal.accent; ctx.shadowBlur = R * 0.7
    ctx.beginPath(); ctx.arc(0, 0, rad, 0, TAU); ctx.fill(); ctx.restore()
    // anillo en tinta
    ink(ctx, pal, LW * 1.2); ctx.strokeStyle = pal.ink
    ctx.beginPath(); ctx.arc(0, 0, rad, 0, TAU); ctx.stroke()
    // signo $ (S de dos curvas + barra vertical) en acento
    ctx.strokeStyle = pal.accent; ctx.lineWidth = LW * 1.5
    const sH = rad * 0.62, sW = rad * 0.42
    ctx.beginPath()
    ctx.moveTo(sW * 0.85, -sH * 0.55)
    ctx.bezierCurveTo(sW * 0.2, -sH * 0.95, -sW * 0.95, -sH * 0.7, -sW * 0.55, -sH * 0.12)
    ctx.bezierCurveTo(-sW * 0.2, sH * 0.32, sW * 0.95, sH * 0.18, sW * 0.55, sH * 0.55)
    ctx.bezierCurveTo(sW * 0.2, sH * 0.92, -sW * 0.85, sH * 0.78, -sW * 0.85, sH * 0.45)
    ctx.stroke()
    // barra vertical del $
    ctx.beginPath(); ctx.moveTo(0, -sH * 0.95); ctx.lineTo(0, sH * 0.95); ctx.stroke()
    ctx.restore()
  },
})

// =============================================================================
// SAVINGS — alcancia donde cae una moneda
// =============================================================================
register({
  id: 'anim.finance.savings', lib: 'anim', category: 'finance', tones: ['dark', 'light'],
  rubros: ['finanzas', 'default', 'educacion', 'inmobiliaria'], weight: 1, tags: ['ahorro', 'alcancia', 'chancho', 'guardar', 'moneda'],
  register: 'friendly', intensity: 'medium', concept: 'savings', describe: 'Una moneda cae en una alcancia y la ranura brilla en acento.',
  render(ctx, t, env) {
    const { pal } = env, per = 2.8, p = loop(t, per)
    const bx = CX, by = CY + R * 0.2, bw = R * 1.7, bh = R * 1.2
    // moneda que cae a la ranura
    const slotX = bx - bw * 0.12, slotY = by - bh * 0.5
    const fall = clamp(inv(p, 0.05, 0.42), 0, 1)
    const drop = eInOutCubic(fall)
    if (p < 0.5) {
      const my = lerp(slotY - R * 1.3, slotY - R * 0.05, drop)
      ctx.save(); ctx.fillStyle = pal.accent
      ctx.beginPath(); ctx.ellipse(slotX, my, R * 0.26, R * 0.26, 0, 0, TAU); ctx.fill()
      ctx.fillStyle = pal.onAccent || pal.bg0; ctx.font = `bold ${Math.round(R * 0.3)}px Inter, sans-serif`
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('$', slotX, my + R * 0.01); ctx.restore()
    }
    ink(ctx, pal, LW)
    // cuerpo (elipse) del chanchito
    ctx.strokeStyle = pal.ink; ctx.fillStyle = rgba(pal.ink, pal.tone === 'light' ? 0.06 : 0.1)
    ctx.beginPath(); ctx.ellipse(bx, by, bw / 2, bh / 2, 0, 0, TAU); ctx.fill(); ctx.stroke()
    // patitas
    for (const px of [bx - bw * 0.26, bx + bw * 0.26]) { ctx.beginPath(); ctx.moveTo(px, by + bh * 0.46); ctx.lineTo(px, by + bh * 0.6); ctx.stroke() }
    // orejita
    ctx.beginPath(); ctx.moveTo(bx + bw * 0.2, by - bh * 0.42); ctx.lineTo(bx + bw * 0.34, by - bh * 0.6); ctx.lineTo(bx + bw * 0.36, by - bh * 0.38); ctx.closePath(); ctx.stroke()
    // ojo
    ctx.beginPath(); ctx.arc(bx + bw * 0.3, by - bh * 0.08, R * 0.06, 0, TAU); ctx.fillStyle = pal.ink; ctx.fill()
    // hociquito
    ctx.beginPath(); ctx.ellipse(bx + bw * 0.46, by + bh * 0.05, R * 0.16, R * 0.13, 0, 0, TAU); ctx.stroke()
    ctx.beginPath(); ctx.arc(bx + bw * 0.46, by + bh * 0.05, R * 0.03, 0, TAU); ctx.fillStyle = pal.ink; ctx.fill()
    // ranura (brilla cuando entra la moneda)
    const lit = clamp(inv(p, 0.36, 0.5), 0, 1) * (1 - clamp(inv(p, 0.6, 0.85), 0, 1))
    ctx.strokeStyle = lit > 0.05 ? pal.accent : pal.ink; ctx.lineWidth = LW * 1.2
    ctx.beginPath(); ctx.moveTo(slotX - bw * 0.12, slotY + bh * 0.02); ctx.lineTo(slotX + bw * 0.12, slotY + bh * 0.02); ctx.stroke()
    if (lit > 0.05) { ctx.save(); ctx.globalAlpha = lit; spark(ctx, pal, slotX, slotY + bh * 0.02, R * 0.1); ctx.restore() }
  },
})

// =============================================================================
// SHIELD — escudo con un tilde (protegido)
// =============================================================================
register({
  id: 'anim.finance.shield', lib: 'anim', category: 'finance', tones: ['dark', 'light'],
  rubros: ['finanzas', 'tech', 'salud', 'default', 'inmobiliaria'], weight: 1, tags: ['proteccion', 'seguro', 'garantia', 'escudo', 'confianza'],
  register: 'corporate', intensity: 'soft', concept: 'shield', describe: 'Un escudo se traza y un tilde aparece adentro con un destello.',
  render(ctx, t, env) {
    const { pal } = env, per = 2.8, p = loop(t, per)
    const w = R * 1.6, h = R * 2.0, topY = CY - h * 0.5
    // path del escudo (centrado)
    function shieldPath() {
      ctx.beginPath()
      ctx.moveTo(CX, topY)
      ctx.lineTo(CX + w * 0.5, topY + h * 0.18)
      ctx.lineTo(CX + w * 0.5, topY + h * 0.55)
      ctx.quadraticCurveTo(CX + w * 0.5, topY + h * 0.9, CX, topY + h)
      ctx.quadraticCurveTo(CX - w * 0.5, topY + h * 0.9, CX - w * 0.5, topY + h * 0.55)
      ctx.lineTo(CX - w * 0.5, topY + h * 0.18)
      ctx.closePath()
    }
    // relleno tenue + asentamiento (spring de entrada)
    const grow = spring(clamp(inv(p, 0.05, 0.55), 0, 1), { zeta: 0.6, freq: 1.6 })
    ctx.save(); ctx.translate(CX, CY); ctx.scale(grow, grow); ctx.translate(-CX, -CY)
    shieldPath(); ctx.fillStyle = rgba(pal.ink, pal.tone === 'light' ? 0.07 : 0.12); ctx.fill()
    ink(ctx, pal, LW * 1.2); ctx.strokeStyle = pal.ink; shieldPath(); ctx.stroke()
    ctx.restore()
    // tilde de acento que entra despues
    const ck = clamp(inv(p, 0.5, 0.82), 0, 1), s = spring(ck, { zeta: 0.5, freq: 2 })
    if (ck > 0) {
      ctx.save(); ctx.translate(CX, CY + h * 0.02); ctx.scale(s, s)
      ink(ctx, pal, LW * 1.5); ctx.strokeStyle = pal.accent
      ctx.beginPath(); ctx.moveTo(-R * 0.42, 0); ctx.lineTo(-R * 0.1, R * 0.34); ctx.lineTo(R * 0.5, -R * 0.4); ctx.stroke()
      ctx.restore()
      if (s > 0.95) spark(ctx, pal, CX, CY, R * 0.09, 1 - clamp(inv(p, 0.84, 1), 0, 1))
    }
  },
})

// =============================================================================
// PERCENT — signo % que sube
// =============================================================================
register({
  id: 'anim.finance.percent', lib: 'anim', category: 'finance', tones: ['dark', 'light'],
  rubros: ['finanzas', 'default', 'tech', 'moda', 'gastronomia'], weight: 1, tags: ['descuento', 'tasa', 'oferta', 'porcentaje', 'rendimiento'],
  register: 'corporate', intensity: 'medium', concept: 'percent', describe: 'Un signo % sube flotando; la diagonal y los circulos en acento.',
  render(ctx, t, env) {
    const { pal } = env, per = 3.0, p = loop(t, per)
    // sube y vuelve (sin costura): seno suave
    const rise = Math.sin(loop(t, per) * TAU) * R * 0.32
    const sz = R * 1.7
    ctx.save(); ctx.translate(CX, CY - rise)
    // diagonal grande en acento
    ink(ctx, pal, LW * 1.4); ctx.strokeStyle = pal.accent
    ctx.beginPath(); ctx.moveTo(-sz * 0.42, sz * 0.5); ctx.lineTo(sz * 0.42, -sz * 0.5); ctx.stroke()
    // dos circulos (arriba-izq tinta, abajo-der acento)
    const cr = sz * 0.2
    ctx.lineWidth = LW * 1.3; ctx.strokeStyle = pal.ink
    ctx.beginPath(); ctx.arc(-sz * 0.27, -sz * 0.3, cr, 0, TAU); ctx.stroke()
    ctx.strokeStyle = pal.accent
    ctx.beginPath(); ctx.arc(sz * 0.27, sz * 0.3, cr, 0, TAU); ctx.stroke()
    // flechita "sube" arriba (pulsa)
    const ar = 0.5 + 0.5 * pulse(t, per * 0.5, 1)
    ctx.save(); ctx.globalAlpha = 0.5 + 0.5 * ar; ctx.strokeStyle = pal.accent; ctx.lineWidth = LW
    ctx.beginPath(); ctx.moveTo(sz * 0.5, -sz * 0.34); ctx.lineTo(sz * 0.5, -sz * 0.58)
    ctx.moveTo(sz * 0.5 - R * 0.12, -sz * 0.48); ctx.lineTo(sz * 0.5, -sz * 0.6); ctx.lineTo(sz * 0.5 + R * 0.12, -sz * 0.48); ctx.stroke(); ctx.restore()
    ctx.restore()
  },
})

// =============================================================================
// BANK — edificio de banco con columnas que aparece
// =============================================================================
register({
  id: 'anim.finance.bank', lib: 'anim', category: 'finance', tones: ['dark', 'light'],
  rubros: ['finanzas', 'default', 'inmobiliaria', 'educacion'], weight: 1, tags: ['banco', 'institucion', 'columnas', 'edificio', 'credito'],
  register: 'corporate', intensity: 'soft', concept: 'bank', describe: 'Un edificio de banco: el fronton y las columnas aparecen escalonados.',
  render(ctx, t, env) {
    const { pal } = env, per = 3.0, p = loop(t, per)
    const w = R * 2.0, bx = CX - w / 2, topY = CY - R * 0.95
    ink(ctx, pal, LW)
    // base
    const baseY = CY + R * 1.0
    const baseG = eOutCubic(clamp(inv(p, 0.05, 0.3), 0, 1))
    ctx.save(); ctx.globalAlpha = baseG; ctx.fillStyle = rgba(pal.ink, pal.tone === 'light' ? 0.9 : 0.92)
    rr(ctx, bx - R * 0.16, baseY, w + R * 0.32, R * 0.2, 3); ctx.fill(); ctx.restore()
    // columnas (4) que crecen de abajo hacia arriba
    const colTop = topY + R * 0.55, colH = baseY - colTop, cw = w * 0.13, nC = 4
    for (let i = 0; i < nC; i++) {
      const g = eOutCubic(clamp(inv(p, 0.32 + i * 0.1, 0.62 + i * 0.1), 0, 1))
      if (g <= 0) continue
      const x = bx + w * 0.08 + i * (w - w * 0.16 - cw) / (nC - 1)
      ctx.save(); ctx.globalAlpha = g; ctx.fillStyle = rgba(pal.ink, pal.tone === 'light' ? 0.82 : 0.86)
      const h = colH * 0.9
      ctx.fillRect(x, baseY - h * g, cw, h * g); ctx.restore()
    }
    // arquitrabe (barra horizontal bajo el techo)
    const archG = eOutCubic(clamp(inv(p, 0.62, 0.8), 0, 1))
    ctx.save(); ctx.globalAlpha = archG; ctx.fillStyle = rgba(pal.ink, 0.92)
    ctx.fillRect(bx - R * 0.08, colTop - R * 0.08, w + R * 0.16, R * 0.16); ctx.restore()
    // fronton triangular (en acento) que baja desde arriba
    const pedG = eOutBack(clamp(inv(p, 0.75, 1), 0, 1))
    ctx.save(); ctx.globalAlpha = clamp(inv(p, 0.75, 0.86), 0, 1)
    const dy = (1 - pedG) * R * 0.4
    ctx.fillStyle = pal.accent
    ctx.beginPath()
    ctx.moveTo(CX, topY - dy); ctx.lineTo(bx - R * 0.12, colTop - R * 0.08 - dy); ctx.lineTo(bx + w + R * 0.12, colTop - R * 0.08 - dy); ctx.closePath(); ctx.fill()
    ctx.restore()
    if (pedG > 0.96) spark(ctx, pal, CX, topY + R * 0.05, R * 0.07, pulse(t, 1.6))
  },
})

// =============================================================================
// WALLET — billetera que se abre y asoma una tarjeta
// =============================================================================
register({
  id: 'anim.finance.wallet', lib: 'anim', category: 'finance', tones: ['dark', 'light'],
  rubros: ['finanzas', 'default', 'moda', 'gastronomia', 'tech'], weight: 1, tags: ['billetera', 'tarjeta', 'pago', 'wallet', 'medio-de-pago'],
  register: 'friendly', intensity: 'medium', concept: 'wallet', describe: 'Una billetera se abre y asoma una tarjeta de acento por arriba.',
  render(ctx, t, env) {
    const { pal } = env, per = 2.8, p = loop(t, per)
    const w = R * 2.0, h = R * 1.35, x = CX - w / 2, y = CY - h * 0.25
    // tarjeta que sube y baja (asoma)
    const peek = clamp(inv(p, 0.1, 0.5), 0, 1) * (1 - clamp(inv(p, 0.62, 0.92), 0, 1))
    const cardLift = eInOutCubic(peek) * h * 0.72
    // tarjeta (detras del cuerpo frontal)
    ctx.save()
    const cw = w * 0.74, ch = h * 0.66, cx = CX - cw / 2, cy = y - cardLift + h * 0.2
    ctx.fillStyle = pal.accent; rr(ctx, cx, cy, cw, ch, 6); ctx.fill()
    // banda + chip de la tarjeta
    ctx.fillStyle = pal.onAccent || pal.bg0
    rr(ctx, cx + cw * 0.1, cy + ch * 0.24, cw * 0.18, ch * 0.2, 2); ctx.fill()
    ctx.globalAlpha = 0.7; rr(ctx, cx + cw * 0.1, cy + ch * 0.58, cw * 0.7, ch * 0.1, 2); ctx.fill()
    ctx.restore()
    // cuerpo frontal de la billetera (tapa el grueso de la tarjeta)
    ink(ctx, pal, LW)
    ctx.fillStyle = rgba(pal.ink, pal.tone === 'light' ? 0.9 : 0.92)
    rr(ctx, x, y, w, h, R * 0.16); ctx.fill()
    // solapa + broche
    ctx.strokeStyle = pal.ink
    rr(ctx, x, y, w, h, R * 0.16); ctx.stroke()
    // banda de la solapa
    ctx.fillStyle = rgba(pal.ink, pal.tone === 'light' ? 0.7 : 0.78)
    rr(ctx, x, y + h * 0.5, w, h * 0.5, R * 0.16); ctx.fill()
    // broche redondo (en acento) a la derecha
    const clip = x + w - R * 0.42
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.arc(clip, y + h * 0.5, R * 0.18, 0, TAU); ctx.fill()
    ctx.strokeStyle = pal.bg0; ctx.lineWidth = LW * 0.7; ctx.beginPath(); ctx.arc(clip, y + h * 0.5, R * 0.08, 0, TAU); ctx.stroke()
    if (peek > 0.85) spark(ctx, pal, CX, cy, R * 0.07, pulse(t, 1.5))
  },
})

// =============================================================================
// CANDLES — velas de trading que suben escalonadas
// =============================================================================
register({
  id: 'anim.finance.candles', lib: 'anim', category: 'finance', tones: ['dark', 'light'],
  rubros: ['finanzas', 'tech', 'default'], weight: 1, tags: ['trading', 'velas', 'mercado', 'bolsa', 'inversion'],
  register: 'corporate', intensity: 'medium', concept: 'candles', describe: 'Velas japonesas de trading suben escalonadas, la ultima alcista en acento.',
  render(ctx, t, env) {
    const { pal } = env, per = 3.0, p = loop(t, per), n = 5
    const cw = R * 0.36, gap = R * 0.34, totW = n * cw + (n - 1) * gap, x0 = CX - totW / 2
    const midY = CY + R * 0.2
    // tendencia general ascendente (cada vela mas arriba) + mecha
    const cfg = [
      { cy: 0.7, half: 0.5, wick: 0.85, up: true },
      { cy: 0.35, half: 0.6, wick: 0.95, up: true },
      { cy: 0.5, half: 0.42, wick: 0.7, up: false },
      { cy: 0.1, half: 0.55, wick: 0.9, up: true },
      { cy: -0.35, half: 0.7, wick: 1.05, up: true },
    ]
    const unit = R * 1.0
    for (let i = 0; i < n; i++) {
      const g = eOutCubic(clamp(inv(p, 0.08 + i * 0.12, 0.5 + i * 0.12), 0, 1))
      if (g <= 0) continue
      const c = cfg[i], cx = x0 + cw / 2 + i * (cw + gap)
      const cy = midY - c.cy * unit
      const half = c.half * unit * g, wick = c.wick * unit * g
      const last = i === n - 1
      ctx.save(); ctx.globalAlpha = clamp(inv(p, 0.08 + i * 0.12, 0.28 + i * 0.12), 0, 1)
      // mecha
      ink(ctx, pal, LW * 0.8); ctx.strokeStyle = last ? pal.accent : (c.up ? rgba(pal.ink, 0.9) : rgba(pal.ink, 0.5))
      ctx.beginPath(); ctx.moveTo(cx, cy - wick); ctx.lineTo(cx, cy + wick); ctx.stroke()
      // cuerpo
      if (last) { ctx.fillStyle = pal.accent } else if (c.up) { ctx.fillStyle = rgba(pal.ink, pal.tone === 'light' ? 0.88 : 0.9) } else { ctx.fillStyle = rgba(pal.ink, pal.tone === 'light' ? 0.2 : 0.28) }
      rr(ctx, cx - cw / 2, cy - half, cw, half * 2, 2)
      ctx.fill()
      if (!c.up && !last) { ctx.strokeStyle = rgba(pal.ink, 0.6); ctx.lineWidth = LW * 0.7; rr(ctx, cx - cw / 2, cy - half, cw, half * 2, 2); ctx.stroke() }
      ctx.restore()
      if (last && g > 0.96) spark(ctx, pal, cx, cy - wick, R * 0.07, pulse(t, 1.6))
    }
    // base
    ctx.save(); ctx.strokeStyle = rgba(pal.ink, 0.3); ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(x0 - R * 0.16, midY + unit * 0.95); ctx.lineTo(x0 + totW + R * 0.16, midY + unit * 0.95); ctx.stroke(); ctx.restore()
  },
})

// =============================================================================
// INVOICE — factura con sello "pagado"
// =============================================================================
register({
  id: 'anim.finance.invoice', lib: 'anim', category: 'finance', tones: ['dark', 'light'],
  rubros: ['finanzas', 'default', 'gastronomia', 'tech', 'inmobiliaria'], weight: 1, tags: ['factura', 'pagado', 'recibo', 'cobro', 'sello'],
  register: 'corporate', intensity: 'medium', concept: 'invoice', describe: 'Una factura aparece y un sello circular "PAGADO" cae con un golpe.',
  render(ctx, t, env) {
    const { pal } = env, per = 3.0, p = loop(t, per)
    const w = R * 1.7, h = R * 2.2, x = CX - w / 2, y = CY - h / 2
    // papel (entra con leve sube)
    const inG = eOutCubic(clamp(inv(p, 0.04, 0.28), 0, 1))
    ctx.save(); ctx.globalAlpha = inG
    // borde inferior dentado (factura)
    const teeth = 7, tw = w / teeth
    ctx.fillStyle = pal.tone === 'light' ? '#ffffff' : '#f3f2ee'
    ctx.beginPath()
    ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + h - R * 0.16)
    for (let i = teeth; i > 0; i--) { ctx.lineTo(x + (i - 0.5) * tw, y + h); ctx.lineTo(x + (i - 1) * tw, y + h - R * 0.16) }
    ctx.closePath(); ctx.fill()
    ink(ctx, pal, LW * 0.9); ctx.strokeStyle = rgba(pal.ink, 0.5); ctx.stroke()
    // lineas de texto (renglones)
    ctx.strokeStyle = rgba(pal.ink, pal.tone === 'light' ? 0.32 : 0.4); ctx.lineWidth = LW * 0.7
    for (let i = 0; i < 4; i++) {
      const ly = y + h * 0.2 + i * h * 0.13, lwid = i === 0 ? w * 0.5 : w * 0.66
      ctx.beginPath(); ctx.moveTo(x + w * 0.14, ly); ctx.lineTo(x + w * 0.14 + lwid, ly); ctx.stroke()
    }
    // total (barra de acento)
    ctx.fillStyle = rgba(pal.accent, 0.85); rr(ctx, x + w * 0.14, y + h * 0.2 + 4.2 * h * 0.13, w * 0.4, h * 0.07, 3); ctx.fill()
    ctx.restore()
    // sello "PAGADO" circular que cae con golpe (eOutBack) y rebota
    const stG = clamp(inv(p, 0.4, 0.62), 0, 1)
    if (stG > 0) {
      const settle = eOutBack(stG, 2.4)
      const sc = lerp(2.2, 1, clamp(settle, 0, 1))
      const sx = x + w * 0.62, sy = y + h * 0.6, sr = R * 0.62
      const fade = 1 - clamp(inv(p, 0.86, 1), 0, 1)
      ctx.save(); ctx.globalAlpha = clamp(inv(p, 0.4, 0.5), 0, 1) * fade
      ctx.translate(sx, sy); ctx.rotate(-0.32); ctx.scale(sc, sc)
      ink(ctx, pal, LW * 1.3); ctx.strokeStyle = pal.accent
      ctx.beginPath(); ctx.arc(0, 0, sr, 0, TAU); ctx.stroke()
      ctx.beginPath(); ctx.arc(0, 0, sr * 0.78, 0, TAU); ctx.stroke()
      ctx.fillStyle = pal.accent; ctx.font = `bold ${Math.round(R * 0.3)}px Inter, sans-serif`
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('OK', 0, R * 0.01)
      ctx.restore()
      if (settle > 0.9 && p < 0.7) spark(ctx, pal, sx, sy, R * 0.1, (1 - clamp(inv(p, 0.55, 0.72), 0, 1)))
    }
  },
})
