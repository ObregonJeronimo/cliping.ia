// urvid 1.0 · biblioteca ANIM — micro-animaciones VECTORIALES con ACCION (como markkit, pero cuentan algo: un carrito
// que se toca, un check que aparece, una flecha que sube). render(ctx, t, env). PURAS + DETERMINISTAS (solo `t` y
// mulberry32(env.seed); cero Math.random/Date.now). Line-art en TINTA con el highlight en ACENTO (consume env.pal,
// nunca hardcodea color). LOOPEAN suave (periodo propio) -> vida continua, fluidas (ver feedback-fluidity-motion-polish).
// Se dibujan CENTRADAS (CX,CY) a un radio base derivado de W -> el motor las reubica/escala segun el slot.
//
// METADATA EXTRA para el RUTEADOR (el director las elige por NECESIDAD, no al azar):
//   concept:  idea principal en 1 palabra-clave (cart/check/rating/growth/trend/chat/send/notify/search/secure/toggle/network...)
//   describe: que muestra, en una linea (para catalogos / Urvid Craft / depurar el ruteo).
// El contrato base (id/lib/category/tones/rubros/weight/tags/register/intensity/render) es el de siempre.
import { register } from '../../core/registry.js'
import { W, H, TAU, rgba, clamp, inv, lerp, eOutCubic, eInOutCubic, eOutBack, spring } from '../../core/util.js'

const CX = W / 2, CY = H / 2
const R = W * 0.17                    // radio base de la pieza (el director la escala)
const LW = Math.max(2.5, W * 0.013)   // grosor de linea base

// fase 0..1 de un loop de periodo `per` segundos (con offset opcional)
const loop = (t, per, off = 0) => (((t + off) % per) + per) % per / per
// pulso suave 0..1 (respiracion) centrado, amplitud amp
const pulse = (t, per, amp = 1, off = 0) => 0.5 + 0.5 * Math.sin((loop(t, per, off)) * TAU) * amp
// estilo de trazo comun (linea redondeada en tinta)
function ink(ctx, pal, w = LW) { ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = w; ctx.strokeStyle = pal.ink }
// brillo puntual de acento (glow suave) en (x,y)
function spark(ctx, pal, x, y, r, a = 1) { ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = pal.accent; ctx.shadowColor = pal.accent; ctx.shadowBlur = r * 2; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.restore() }
// rect redondeado helper
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r) }
// estrella de 5 puntas centrada en (cx,cy), radio rad -> arma el path (sin dibujar)
function starShape(ctx, cx, cy, rad) {
  ctx.beginPath()
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i / 10 * TAU, rr2 = i % 2 ? rad * 0.42 : rad; const px = cx + Math.cos(a) * rr2, py = cy + Math.sin(a) * rr2; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py) }
  ctx.closePath()
}

// =============================================================================
// COMMERCE — comprar / carrito / tienda
// =============================================================================
register({
  id: 'anim.commerce.cart-tap', lib: 'anim', category: 'commerce', tones: ['dark', 'light'],
  rubros: ['default', 'moda', 'belleza', 'gastronomia'], weight: 1, tags: ['comprar', 'carrito', 'tienda', 'tap'],
  register: 'friendly', intensity: 'medium', concept: 'cart', describe: 'Un carrito que un cursor toca y se llena de acento (+1).',
  render(ctx, t, env) {
    const { pal } = env, per = 2.6, p = loop(t, per)
    const x = CX - R * 0.7, y = CY - R * 0.5, s = R * 1.3
    ctx.save(); ink(ctx, pal)
    // cuerpo del carrito (canasto + asa) en tinta
    ctx.beginPath()
    ctx.moveTo(x, y); ctx.lineTo(x + s * 0.16, y); ctx.lineTo(x + s * 0.32, y + s * 0.5); ctx.lineTo(x + s * 0.86, y + s * 0.5); ctx.lineTo(x + s * 0.96, y + s * 0.16); ctx.lineTo(x + s * 0.26, y + s * 0.16)
    ctx.stroke()
    // ruedas
    for (const wx of [x + s * 0.42, x + s * 0.78]) { ctx.beginPath(); ctx.arc(wx, y + s * 0.66, s * 0.055, 0, TAU); ctx.stroke() }
    // "fill" de acento dentro del canasto cuando se toca (segunda mitad del loop)
    const fillP = clamp(inv(p, 0.45, 0.7), 0, 1)
    if (fillP > 0) { ctx.save(); ctx.globalAlpha = 0.9 * (1 - clamp(inv(p, 0.82, 1), 0, 1)); ctx.fillStyle = pal.accent; rr(ctx, x + s * 0.34, y + s * 0.22 + (1 - fillP) * s * 0.26, s * 0.5, fillP * s * 0.26, 3); ctx.fill(); ctx.restore() }
    // cursor que baja, toca y rebota (tap) -> ripple
    const tapT = eInOutCubic(clamp(inv(p, 0.0, 0.42), 0, 1))
    const cx = x + s * 0.6, cy = lerp(y - R * 0.5, y + s * 0.32, tapT)
    if (p < 0.5) {
      ctx.fillStyle = pal.inkText
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy + R * 0.34); ctx.lineTo(cx + R * 0.1, cy + R * 0.24); ctx.lineTo(cx + R * 0.2, cy + R * 0.34); ctx.lineTo(cx + R * 0.24, cy + R * 0.3); ctx.lineTo(cx + R * 0.14, cy + R * 0.2); ctx.lineTo(cx + R * 0.26, cy + R * 0.18); ctx.closePath(); ctx.fill()
    }
    const rip = clamp(inv(p, 0.4, 0.6), 0, 1)
    if (rip > 0 && rip < 1) { ctx.save(); ctx.globalAlpha = 1 - rip; ctx.strokeStyle = pal.accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x + s * 0.6, y + s * 0.32, rip * R * 0.5, 0, TAU); ctx.stroke(); ctx.restore() }
    ctx.restore()
  },
})

// =============================================================================
// FEEDBACK — listo / confirmado / check
// =============================================================================
register({
  id: 'anim.feedback.check-pop', lib: 'anim', category: 'feedback', tones: ['dark', 'light'],
  rubros: ['*'], weight: 1.1, tags: ['check', 'listo', 'confirmado', 'ok'],
  register: 'neutral', intensity: 'soft', concept: 'check', describe: 'Un circulo se traza y aparece un tilde con un pop.',
  render(ctx, t, env) {
    const { pal } = env, per = 2.4, p = loop(t, per)
    ctx.save(); ink(ctx, pal, LW * 1.1)
    // anillo que se traza (0..0.5)
    const ringP = eOutCubic(clamp(inv(p, 0, 0.5), 0, 1))
    ctx.strokeStyle = pal.ink; ctx.beginPath(); ctx.arc(CX, CY, R, -Math.PI / 2, -Math.PI / 2 + TAU * ringP); ctx.stroke()
    // tilde que entra con spring (0.4..0.8), en acento
    const ck = clamp(inv(p, 0.4, 0.8), 0, 1), s = spring(ck, { zeta: 0.5, freq: 2 })
    if (ck > 0) {
      ctx.save(); ctx.translate(CX, CY); ctx.scale(s, s); ctx.strokeStyle = pal.accent; ctx.lineWidth = LW * 1.3
      const a = R * 0.5, b = R * 0.2
      ctx.beginPath(); ctx.moveTo(-a * 0.55, 0.05 * R); ctx.lineTo(-b * 0.2, b * 1.2); ctx.lineTo(a * 0.7, -a * 0.55); ctx.stroke(); ctx.restore()
      if (s > 0.95) spark(ctx, pal, CX, CY, R * 0.08, 1 - clamp(inv(p, 0.82, 1), 0, 1))
    }
    ctx.restore()
  },
})

// =============================================================================
// RATING — estrellas / reseñas
// =============================================================================
register({
  id: 'anim.rating.stars-fill', lib: 'anim', category: 'rating', tones: ['dark', 'light'],
  rubros: ['default', 'gastronomia', 'moda', 'belleza', 'inmobiliaria', 'salud'], weight: 1, tags: ['rating', 'estrellas', 'resenas', 'valoracion'],
  register: 'friendly', intensity: 'medium', concept: 'rating', describe: 'Cinco estrellas se rellenan de acento de izquierda a derecha.',
  render(ctx, t, env) {
    const { pal } = env, per = 2.8, p = loop(t, per), n = 5, gap = R * 0.62, x0 = CX - gap * 2, sr = R * 0.26
    const fill = clamp(inv(p, 0.1, 0.8), 0, 1) * n
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = LW * 0.8
    for (let i = 0; i < n; i++) {
      const f = clamp(fill - i, 0, 1), x = x0 + i * gap, rad = sr * (f >= 1 ? 1 + 0.06 * pulse(t, 1.4, 1, i * 0.3) : 1)
      starShape(ctx, x, CY, rad); ctx.strokeStyle = pal.ink; ctx.stroke()
      if (f > 0) { ctx.save(); starShape(ctx, x, CY, rad); ctx.clip(); ctx.fillStyle = pal.accent; ctx.fillRect(x - rad, CY - rad, rad * 2 * f, rad * 2); ctx.restore() }
    }
  },
})

// =============================================================================
// GROWTH — crecimiento / metricas / resultados
// =============================================================================
register({
  id: 'anim.growth.bars-rise', lib: 'anim', category: 'growth', tones: ['dark', 'light'],
  rubros: ['tech', 'finanzas', 'default', 'educacion'], weight: 1, tags: ['crecimiento', 'barras', 'datos', 'resultados'],
  register: 'corporate', intensity: 'medium', concept: 'growth', describe: 'Tres barras crecen escalonadas, la ultima en acento, con un brillo arriba.',
  render(ctx, t, env) {
    const { pal } = env, per = 2.8, p = loop(t, per), n = 3, bw = R * 0.42, gap = R * 0.28
    const totW = n * bw + (n - 1) * gap, x0 = CX - totW / 2, baseY = CY + R * 0.85, maxH = R * 1.7
    const hs = [0.5, 0.78, 1]
    ink(ctx, pal); ctx.strokeStyle = rgba(pal.ink, 0.5); ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(x0 - R * 0.2, baseY); ctx.lineTo(x0 + totW + R * 0.2, baseY); ctx.stroke()
    for (let i = 0; i < n; i++) {
      const g = eOutCubic(clamp(inv(p, 0.1 + i * 0.13, 0.7 + i * 0.13), 0, 1)), h = maxH * hs[i] * g
      const x = x0 + i * (bw + gap), last = i === n - 1
      ctx.fillStyle = last ? pal.accent : rgba(pal.ink, pal.tone === 'light' ? 0.85 : 0.9)
      rr(ctx, x, baseY - h, bw, h, Math.min(bw * 0.3, 6)); ctx.fill()
      if (last && g > 0.95) spark(ctx, pal, x + bw / 2, baseY - h - 4, R * 0.07, pulse(t, 1.6))
    }
  },
})

register({
  id: 'anim.growth.arrow-trend', lib: 'anim', category: 'growth', tones: ['dark', 'light'],
  rubros: ['finanzas', 'tech', 'default', 'inmobiliaria'], weight: 1, tags: ['tendencia', 'subir', 'flecha', 'mejora'],
  register: 'corporate', intensity: 'soft', concept: 'trend', describe: 'Una linea de tendencia sube y una flecha viaja por ella dejando rastro.',
  render(ctx, t, env) {
    const { pal } = env, per = 3.0, p = loop(t, per)
    const pts = [[CX - R * 1.4, CY + R * 0.9], [CX - R * 0.5, CY + R * 0.2], [CX + R * 0.1, CY + R * 0.5], [CX + R * 1.2, CY - R * 0.9]]
    ink(ctx, pal); ctx.strokeStyle = rgba(pal.ink, 0.35); ctx.setLineDash([4, 5])
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const q of pts.slice(1)) ctx.lineTo(q[0], q[1]); ctx.stroke(); ctx.setLineDash([])
    // rastro de acento que avanza
    const prog = eInOutCubic(clamp(inv(p, 0.05, 0.85), 0, 1))
    const seg = prog * (pts.length - 1), si = Math.min(pts.length - 2, Math.floor(seg)), st = seg - si
    const cx = lerp(pts[si][0], pts[si + 1][0], st), cy = lerp(pts[si][1], pts[si + 1][1], st)
    ctx.strokeStyle = pal.accent; ctx.lineWidth = LW * 1.1; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1])
    for (let i = 1; i <= si; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.lineTo(cx, cy); ctx.stroke()
    // flecha en la punta
    const ang = Math.atan2(pts[si + 1][1] - pts[si][1], pts[si + 1][0] - pts[si][0])
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang); ctx.fillStyle = pal.accent
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-R * 0.22, -R * 0.12); ctx.lineTo(-R * 0.22, R * 0.12); ctx.closePath(); ctx.fill(); ctx.restore()
    if (prog > 0.98) spark(ctx, pal, pts[3][0], pts[3][1], R * 0.08, pulse(t, 1.5))
  },
})

// =============================================================================
// COMM — mensajes / chat / contacto
// =============================================================================
register({
  id: 'anim.comm.chat-pop', lib: 'anim', category: 'comm', tones: ['dark', 'light'],
  rubros: ['*'], weight: 1, tags: ['chat', 'mensaje', 'conversacion', 'contacto'],
  register: 'friendly', intensity: 'medium', concept: 'chat', describe: 'Dos globos de chat aparecen y el segundo muestra puntos de "escribiendo".',
  render(ctx, t, env) {
    const { pal } = env, per = 3.0, p = loop(t, per)
    // globo 1 (izq, tinta)
    const a1 = spring(clamp(inv(p, 0.05, 0.4), 0, 1), { zeta: 0.55, freq: 2 })
    bubble(CX - R * 0.55, CY - R * 0.35, R * 1.0, R * 0.66, a1, 'left', rgba(pal.ink, pal.tone === 'light' ? 0.9 : 0.92), pal)
    // globo 2 (der, acento) con dots de typing
    const a2 = spring(clamp(inv(p, 0.45, 0.8), 0, 1), { zeta: 0.55, freq: 2 })
    bubble(CX + R * 0.55, CY + R * 0.4, R * 1.0, R * 0.66, a2, 'right', pal.accent, pal)
    if (a2 > 0.9) { for (let i = 0; i < 3; i++) { const yy = CY + R * 0.4, xx = CX + R * 0.3 + i * R * 0.25; const b = pulse(t, 0.9, 1, i * 0.18); ctx.save(); ctx.globalAlpha = 0.4 + 0.6 * b; ctx.fillStyle = pal.onAccent || '#fff'; ctx.beginPath(); ctx.arc(xx, yy, R * 0.07, 0, TAU); ctx.fill(); ctx.restore() } }
    function bubble(cx, cy, w, h, a, dir, fill, pal) {
      if (a <= 0) return
      ctx.save(); ctx.globalAlpha = clamp(a, 0, 1); ctx.translate(cx, cy); ctx.scale(a, a); ctx.fillStyle = fill
      rr(ctx, -w / 2, -h / 2, w, h, h * 0.34); ctx.fill()
      ctx.beginPath(); const tx = dir === 'left' ? -w * 0.3 : w * 0.3
      ctx.moveTo(tx, h / 2 - 2); ctx.lineTo(tx + (dir === 'left' ? -h * 0.18 : h * 0.18), h / 2 + h * 0.28); ctx.lineTo(tx + (dir === 'left' ? h * 0.1 : -h * 0.1), h / 2 - 2); ctx.closePath(); ctx.fill()
      ctx.restore()
    }
  },
})

register({
  id: 'anim.comm.send-plane', lib: 'anim', category: 'comm', tones: ['dark', 'light'],
  rubros: ['*'], weight: 0.95, tags: ['enviar', 'avion', 'mensaje', 'rapido'],
  register: 'neutral', intensity: 'soft', concept: 'send', describe: 'Un avion de papel cruza dejando un rastro punteado en acento.',
  render(ctx, t, env) {
    const { pal } = env, per = 2.6, p = loop(t, per)
    const x = lerp(CX - R * 1.5, CX + R * 1.5, eInOutCubic(p)), y = CY + Math.sin(p * Math.PI) * -R * 0.5
    // rastro
    ctx.save(); ctx.strokeStyle = pal.accent; ctx.lineWidth = 2; ctx.setLineDash([3, 6]); ctx.globalAlpha = 0.7
    ctx.beginPath(); ctx.moveTo(CX - R * 1.5, CY); for (let q = 0; q <= p; q += 0.05) { const px = lerp(CX - R * 1.5, CX + R * 1.5, eInOutCubic(q)), py = CY + Math.sin(q * Math.PI) * -R * 0.5; ctx.lineTo(px, py) } ctx.stroke(); ctx.restore()
    // avion
    ctx.save(); ctx.translate(x, y); ctx.rotate(-0.25 + (p < 0.5 ? -0.1 : 0.1)); ctx.fillStyle = pal.ink
    ctx.beginPath(); ctx.moveTo(R * 0.5, 0); ctx.lineTo(-R * 0.45, -R * 0.3); ctx.lineTo(-R * 0.2, 0); ctx.lineTo(-R * 0.45, R * 0.3); ctx.closePath(); ctx.fill()
    ctx.strokeStyle = rgba(pal.tone === 'light' ? '#fff' : pal.bg0, 0.6); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-R * 0.2, 0); ctx.lineTo(R * 0.5, 0); ctx.stroke(); ctx.restore()
  },
})

// =============================================================================
// NOTIFY — aviso / novedad
// =============================================================================
register({
  id: 'anim.notify.bell-ring', lib: 'anim', category: 'notify', tones: ['dark', 'light'],
  rubros: ['*'], weight: 0.9, tags: ['notificacion', 'aviso', 'campana', 'novedad'],
  register: 'friendly', intensity: 'medium', concept: 'notify', describe: 'Una campana se balancea (ring) y un punto de aviso late en acento.',
  render(ctx, t, env) {
    const { pal } = env, per = 2.2, sw = Math.sin(t / per * TAU) * 0.18 * (0.6 + 0.4 * pulse(t, per * 2))
    ctx.save(); ctx.translate(CX, CY - R * 0.6); ctx.rotate(sw); ctx.translate(0, R * 0.6)
    ink(ctx, pal, LW * 1.1); ctx.strokeStyle = pal.ink
    // cuerpo campana
    ctx.beginPath(); ctx.moveTo(-R * 0.7, R * 0.5)
    ctx.quadraticCurveTo(-R * 0.7, -R * 0.5, 0, -R * 0.62); ctx.quadraticCurveTo(R * 0.7, -R * 0.5, R * 0.7, R * 0.5); ctx.closePath(); ctx.stroke()
    // badajo + base
    ctx.beginPath(); ctx.moveTo(-R * 0.85, R * 0.5); ctx.lineTo(R * 0.85, R * 0.5); ctx.stroke()
    ctx.beginPath(); ctx.arc(0, R * 0.62, R * 0.1, 0, TAU); ctx.fillStyle = pal.ink; ctx.fill()
    ctx.restore()
    // badge de acento
    const b = 0.85 + 0.25 * pulse(t, 1.0)
    ctx.save(); ctx.translate(CX + R * 0.55, CY - R * 0.95); ctx.scale(b, b); spark(ctx, pal, 0, 0, R * 0.16, 1); ctx.restore()
  },
})

// =============================================================================
// SEARCH — buscar / encontrar
// =============================================================================
register({
  id: 'anim.search.scan', lib: 'anim', category: 'search', tones: ['dark', 'light'],
  rubros: ['tech', 'default', 'inmobiliaria', 'educacion'], weight: 0.95, tags: ['buscar', 'lupa', 'encontrar', 'scan'],
  register: 'neutral', intensity: 'soft', concept: 'search', describe: 'Una lupa recorre una grilla y resalta una celda en acento.',
  render(ctx, t, env) {
    const { pal } = env, per = 3.0, p = loop(t, per)
    // grilla 3x3
    const g = R * 1.6, x0 = CX - g / 2, y0 = CY - g / 2, c = g / 3
    ctx.save(); ctx.strokeStyle = rgba(pal.ink, 0.3); ctx.lineWidth = 1.5
    for (let i = 0; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(x0 + i * c, y0); ctx.lineTo(x0 + i * c, y0 + g); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x0, y0 + i * c); ctx.lineTo(x0 + g, y0 + i * c); ctx.stroke() }
    // celda destacada (la del medio-derecha) cuando la lupa llega
    const hit = clamp(inv(p, 0.55, 0.7), 0, 1) * (1 - clamp(inv(p, 0.9, 1), 0, 1))
    if (hit > 0) { ctx.save(); ctx.globalAlpha = 0.85 * hit; ctx.fillStyle = pal.accent; ctx.fillRect(x0 + 2 * c + 1.5, y0 + 1 * c + 1.5, c - 3, c - 3); ctx.restore() }
    ctx.restore()
    // lupa que se mueve hacia la celda
    const lx = lerp(x0 + c * 0.5, x0 + 2.5 * c, eInOutCubic(clamp(inv(p, 0.05, 0.6), 0, 1)))
    const ly = lerp(y0 + c * 2.4, y0 + 1.5 * c, eInOutCubic(clamp(inv(p, 0.05, 0.6), 0, 1)))
    ink(ctx, pal, LW * 1.1); ctx.strokeStyle = pal.ink
    ctx.beginPath(); ctx.arc(lx, ly, R * 0.42, 0, TAU); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(lx + R * 0.3, ly + R * 0.3); ctx.lineTo(lx + R * 0.62, ly + R * 0.62); ctx.stroke()
  },
})

// =============================================================================
// SECURE — seguridad / proteccion
// =============================================================================
register({
  id: 'anim.secure.lock', lib: 'anim', category: 'secure', tones: ['dark', 'light'],
  rubros: ['finanzas', 'tech', 'salud', 'default'], weight: 0.9, tags: ['seguridad', 'candado', 'proteccion', 'privacidad'],
  register: 'corporate', intensity: 'soft', concept: 'secure', describe: 'Un candado: el arco baja y se cierra, con un destello de acento.',
  render(ctx, t, env) {
    const { pal } = env, per = 2.6, p = loop(t, per)
    const bw = R * 1.1, bh = R * 0.95, bx = CX - bw / 2, by = CY - bh * 0.1
    // arco (shackle) que baja y cierra
    const close = eOutBack(clamp(inv(p, 0.1, 0.55), 0, 1))
    const lift = (1 - close) * R * 0.45
    ink(ctx, pal, LW * 1.2); ctx.strokeStyle = pal.ink
    ctx.beginPath(); ctx.arc(CX, by - lift, bw * 0.34, Math.PI, TAU); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(CX - bw * 0.34, by - lift); ctx.lineTo(CX - bw * 0.34, by); ctx.moveTo(CX + bw * 0.34, by - lift); ctx.lineTo(CX + bw * 0.34, by); ctx.stroke()
    // cuerpo
    const lit = close > 0.95
    ctx.fillStyle = lit ? pal.accent : rgba(pal.ink, 0.9)
    rr(ctx, bx, by, bw, bh, bw * 0.16); ctx.fill()
    // ojo de cerradura
    ctx.fillStyle = lit ? (pal.onAccent || pal.bg0) : (pal.bg0)
    ctx.beginPath(); ctx.arc(CX, by + bh * 0.42, R * 0.13, 0, TAU); ctx.fill()
    ctx.fillRect(CX - R * 0.05, by + bh * 0.42, R * 0.1, bh * 0.28)
    if (lit) { ctx.save(); ctx.globalAlpha = 1 - clamp(inv(p, 0.55, 0.85), 0, 1); spark(ctx, pal, CX, by - lift, R * 0.1); ctx.restore() }
  },
})

// =============================================================================
// TOGGLE — activar / encender
// =============================================================================
register({
  id: 'anim.action.toggle-on', lib: 'anim', category: 'action', tones: ['dark', 'light'],
  rubros: ['tech', 'default', 'finanzas'], weight: 0.9, tags: ['activar', 'encender', 'switch', 'on'],
  register: 'neutral', intensity: 'soft', concept: 'toggle', describe: 'Un interruptor: el boton desliza a ON y el riel se pinta de acento.',
  render(ctx, t, env) {
    const { pal } = env, per = 2.4, p = loop(t, per)
    const tw = R * 2.0, th = R * 0.95, x = CX - tw / 2, y = CY - th / 2, on = eInOutCubic(clamp(inv(p, 0.15, 0.55), 0, 1)) * (1 - clamp(inv(p, 0.82, 1), 0, 1) * 0 /* mantiene ON el resto */)
    // riel
    ctx.fillStyle = rgba(pal.ink, pal.tone === 'light' ? 0.16 : 0.24); rr(ctx, x, y, tw, th, th / 2); ctx.fill()
    ctx.save(); rr(ctx, x, y, tw, th, th / 2); ctx.clip(); ctx.fillStyle = pal.accent; ctx.globalAlpha = on; ctx.fillRect(x, y, tw, th); ctx.restore()
    // knob
    const kr = th * 0.4, kx = lerp(x + th / 2, x + tw - th / 2, on)
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 1; ctx.fillStyle = pal.tone === 'light' ? '#fff' : '#f3f2ee'; ctx.beginPath(); ctx.arc(kx, CY, kr, 0, TAU); ctx.fill(); ctx.restore()
  },
})

// =============================================================================
// NETWORK — conectar / integraciones / equipo
// =============================================================================
register({
  id: 'anim.tech.network', lib: 'anim', category: 'network', tones: ['dark', 'light'],
  rubros: ['tech', 'default', 'educacion'], weight: 0.95, tags: ['conectar', 'red', 'integraciones', 'equipo', 'nodos'],
  register: 'corporate', intensity: 'medium', concept: 'network', describe: 'Tres nodos conectados; un pulso de acento viaja por los enlaces.',
  render(ctx, t, env) {
    const { pal } = env, per = 2.8
    const nodes = [[CX - R * 1.1, CY + R * 0.7], [CX + R * 1.1, CY + R * 0.5], [CX, CY - R * 1.0]]
    const edges = [[0, 1], [1, 2], [2, 0]]
    ink(ctx, pal); ctx.strokeStyle = rgba(pal.ink, 0.4); ctx.lineWidth = 2
    for (const [a, b] of edges) { ctx.beginPath(); ctx.moveTo(nodes[a][0], nodes[a][1]); ctx.lineTo(nodes[b][0], nodes[b][1]); ctx.stroke() }
    // pulso por los enlaces (recorre el ciclo)
    const tot = loop(t, per) * edges.length, ei = Math.floor(tot) % edges.length, et = tot - Math.floor(tot)
    const [a, b] = edges[ei]; const px = lerp(nodes[a][0], nodes[b][0], et), py = lerp(nodes[a][1], nodes[b][1], et)
    spark(ctx, pal, px, py, R * 0.1, 1)
    // nodos
    for (let i = 0; i < nodes.length; i++) { const beat = 1 + 0.08 * pulse(t, 1.5, 1, i * 0.4); ctx.save(); ctx.translate(nodes[i][0], nodes[i][1]); ctx.scale(beat, beat); ctx.fillStyle = pal.ink; ctx.beginPath(); ctx.arc(0, 0, R * 0.2, 0, TAU); ctx.fill(); ctx.fillStyle = pal.bg0; ctx.beginPath(); ctx.arc(0, 0, R * 0.09, 0, TAU); ctx.fill(); ctx.restore() }
  },
})
