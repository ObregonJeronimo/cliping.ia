// urvid 1.0 · biblioteca MARKKIT — graficos/formas/iconos/decoradores que una escena COLOCA. render(ctx, t, env).
// env = { pal, content, fonts, seed, energy }. Cada modulo dibuja un ADORNO (no full-bg): forma que late, icono
// vectorial, divisor/conector, marco/contenedor, decorador (comillas/chevron/sparkle), sustrato (grilla/puntos).
// PURO + DETERMINISTA: mulberry32(env.seed) para azar estable, t para movimiento. Consume la PALETA (cero hardcode
// de color). Se compone CENTRADO en el lienzo (W/2,H/2 por defecto) a una escala derivada de W/H -> el director lo
// reubica/escala segun el slot. Texto (cuando hay) via core/text.js -> nunca desborda.
import { register } from '../../core/registry.js'
import { mulberry32, range, pick } from '../../core/prng.js'
import { drawText } from '../../core/text.js'
import { W, H, TAU, rgba, lighten, darken, clamp, inv, eOutCubic, eOutBack, spring, lerp } from '../../core/util.js'

const CX = W / 2, CY = H / 2

// ---------- helpers locales (puros) ----------
// poligono regular de n lados centrado en (cx,cy), radio rad, rotacion rot. Devuelve sin dibujar (para path custom).
function polyPath(ctx, cx, cy, rad, n, rot = 0) {
  ctx.beginPath()
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * TAU - Math.PI / 2
    const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
  }
  ctx.closePath()
}
// superellipse / blob organico: radio modulado por armonicos estables (amp/freq desde prng) + latido por t.
function blobPath(ctx, cx, cy, rad, r, t, { lobes = 6, wob = 0.16, speed = 0.5 } = {}) {
  const ph = []; const am = []
  for (let k = 0; k < 3; k++) { ph.push(r() * TAU); am.push(0.5 + r() * 0.5) }
  ctx.beginPath()
  const STEP = 48
  for (let i = 0; i <= STEP; i++) {
    const a = (i / STEP) * TAU
    let rr = 1
    rr += wob * am[0] * Math.sin(a * lobes + ph[0] + t * speed)
    rr += wob * 0.6 * am[1] * Math.sin(a * (lobes + 2) - ph[1] + t * speed * 0.7)
    rr += wob * 0.4 * am[2] * Math.sin(a * (lobes - 1) + ph[2] - t * speed * 1.3)
    const x = cx + Math.cos(a) * rad * rr, y = cy + Math.sin(a) * rad * rr
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
  }
  ctx.closePath()
}
// estrella de m puntas (sparkle de 4 por defecto), concavidad k (0..1, menor = mas afilada)
function starPath(ctx, cx, cy, rad, m = 4, k = 0.38, rot = 0) {
  ctx.beginPath()
  for (let i = 0; i < m * 2; i++) {
    const a = rot + (i / (m * 2)) * TAU - Math.PI / 2
    const rr = i % 2 ? rad * k : rad
    const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
  }
  ctx.closePath()
}

// ============================================================================
// CATEGORIA: formas/morphs (geometricas/organicas que laten)
// ============================================================================

register({
  id: 'mark.morph.blob', lib: 'markkit', category: 'formas-morphs', tones: ['dark', 'light'], rubros: ['*'], weight: 1.1,
  tags: ['organico', 'latido', 'acento'],
  render(ctx, t, env) {
    const { pal } = env, r = mulberry32(env.seed ^ 0x10a)
    const rad = W * 0.26, breathe = 1 + 0.04 * Math.sin(t * 1.1)
    const ap = eOutBack(inv(t, 0.0, 0.7))
    ctx.save(); ctx.translate(CX, CY); ctx.scale(ap * breathe, ap * breathe); ctx.translate(-CX, -CY)
    // relleno con gradiente radial accent->accent2
    blobPath(ctx, CX, CY, rad, r, t, { lobes: 5, wob: 0.18, speed: 0.6 })
    const g = ctx.createRadialGradient(CX - rad * 0.3, CY - rad * 0.3, rad * 0.1, CX, CY, rad * 1.25)
    g.addColorStop(0, pal.accent); g.addColorStop(1, pal.accent2 || pal.accent)
    ctx.fillStyle = g; ctx.fill()
    // brillo especular interno
    ctx.globalCompositeOperation = 'lighter'
    blobPath(ctx, CX - rad * 0.18, CY - rad * 0.2, rad * 0.4, r, t, { lobes: 4, wob: 0.2, speed: 0.9 })
    ctx.fillStyle = rgba('#ffffff', pal.tone === 'light' ? 0.18 : 0.28); ctx.fill()
    ctx.restore()
  },
})

register({
  id: 'mark.morph.ring-pulse', lib: 'markkit', category: 'formas-morphs', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['anillo', 'pulso', 'tech'],
  render(ctx, t, env) {
    const { pal } = env
    ctx.save(); ctx.translate(CX, CY)
    // anillo principal con grosor que respira
    const rad = W * 0.22, lw = 10 + 4 * Math.sin(t * 1.4)
    const ap = eOutCubic(inv(t, 0, 0.6))
    ctx.globalAlpha = ap
    ctx.strokeStyle = pal.accent; ctx.lineWidth = lw; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.arc(0, 0, rad, -Math.PI / 2, -Math.PI / 2 + TAU * ap); ctx.stroke()
    // ondas concentricas que se expanden y desvanecen (3, desfasadas)
    for (let i = 0; i < 3; i++) {
      const ph = (t * 0.5 + i / 3) % 1
      ctx.globalAlpha = ap * (1 - ph) * 0.5
      ctx.lineWidth = 2
      ctx.strokeStyle = pal.accent2 || pal.accent
      ctx.beginPath(); ctx.arc(0, 0, rad + ph * rad * 0.9, 0, TAU); ctx.stroke()
    }
    ctx.globalAlpha = ap
    // nucleo
    ctx.fillStyle = pal.accent2 || pal.accent; ctx.beginPath(); ctx.arc(0, 0, rad * 0.16, 0, TAU); ctx.fill()
    ctx.restore()
  },
})

register({
  id: 'mark.morph.poly-spin', lib: 'markkit', category: 'formas-morphs', tones: ['dark', 'light'], rubros: ['tech', 'finanzas', 'default', 'industria'], weight: 0.9,
  tags: ['geometrico', 'rotacion', 'tech'],
  render(ctx, t, env) {
    const { pal } = env, r = mulberry32(env.seed ^ 0x5e1)
    const n = 3 + (r() * 4 | 0)  // 3..6 lados, estable por seed
    const rad = W * 0.22, ap = spring(inv(t, 0, 0.9), { zeta: 0.55, freq: 1.8 })
    ctx.save(); ctx.translate(CX, CY); ctx.rotate(t * 0.4); ctx.scale(ap, ap)
    // poligono exterior relleno suave
    polyPath(ctx, 0, 0, rad, n, 0)
    ctx.fillStyle = rgba(pal.accent, pal.tone === 'light' ? 0.14 : 0.2); ctx.fill()
    ctx.strokeStyle = pal.accent; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.stroke()
    // poligono interior girando al reves
    ctx.rotate(-t * 0.7)
    polyPath(ctx, 0, 0, rad * 0.5, n, Math.PI / n)
    ctx.strokeStyle = pal.accent2 || pal.accent; ctx.lineWidth = 2; ctx.stroke()
    ctx.restore()
  },
})

// ============================================================================
// CATEGORIA: iconos vectoriales simples por dominio
// ============================================================================

register({
  id: 'mark.icon.home', lib: 'markkit', category: 'iconos-rubro', tones: ['dark', 'light'], rubros: ['inmobiliaria', 'construccion', 'default'], weight: 1.1,
  tags: ['icono', 'inmobiliaria', 'casa'],
  render(ctx, t, env) {
    const { pal } = env
    const s = W * 0.2, ap = spring(inv(t, 0, 0.8), { zeta: 0.5, freq: 2.0 })
    const drawn = eOutCubic(inv(t, 0.1, 1.0))
    ctx.save(); ctx.translate(CX, CY); ctx.scale(ap, ap)
    ctx.strokeStyle = pal.accent; ctx.lineWidth = 6; ctx.lineJoin = 'round'; ctx.lineCap = 'round'
    // techo + cuerpo
    ctx.beginPath()
    ctx.moveTo(-s, -s * 0.05); ctx.lineTo(0, -s * 0.85); ctx.lineTo(s, -s * 0.05)
    ctx.lineTo(s, s * 0.8); ctx.lineTo(-s, s * 0.8); ctx.closePath()
    ctx.stroke()
    // puerta que "crece" desde el piso
    const dh = s * 0.6 * drawn
    ctx.fillStyle = rgba(pal.accent2 || pal.accent, 0.85)
    ctx.beginPath(); ctx.rect(-s * 0.22, s * 0.8 - dh, s * 0.44, dh); ctx.fill()
    ctx.restore()
  },
})

register({
  id: 'mark.icon.chat', lib: 'markkit', category: 'iconos-rubro', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['icono', 'mensaje', 'contacto', 'whatsapp'],
  render(ctx, t, env) {
    const { pal } = env
    const s = W * 0.2, ap = eOutBack(inv(t, 0, 0.7))
    ctx.save(); ctx.translate(CX, CY); ctx.scale(ap, ap)
    // burbuja redondeada con cola
    ctx.fillStyle = pal.accent
    ctx.beginPath(); ctx.roundRect(-s, -s * 0.8, s * 2, s * 1.35, s * 0.32); ctx.fill()
    ctx.beginPath(); ctx.moveTo(-s * 0.45, s * 0.5); ctx.lineTo(-s * 0.75, s * 0.95); ctx.lineTo(-s * 0.1, s * 0.5); ctx.closePath(); ctx.fill()
    // 3 puntos que aparecen en secuencia (typing)
    const onAcc = pal.onAccent || (pal.tone === 'light' ? '#fff' : '#0a0a0f')
    for (let i = 0; i < 3; i++) {
      const pop = clamp(Math.sin(t * 3 - i * 0.6) * 0.5 + 0.7, 0.3, 1)
      ctx.globalAlpha = pop
      ctx.fillStyle = rgba(onAcc, 0.95)
      ctx.beginPath(); ctx.arc((i - 1) * s * 0.42, -s * 0.12, s * 0.13, 0, TAU); ctx.fill()
    }
    ctx.restore()
  },
})

register({
  id: 'mark.icon.spark-idea', lib: 'markkit', category: 'iconos-rubro', tones: ['dark', 'light'], rubros: ['educacion', 'tech', 'creatividad', 'default'], weight: 0.9,
  tags: ['icono', 'idea', 'bombilla'],
  render(ctx, t, env) {
    const { pal } = env
    const s = W * 0.16, ap = spring(inv(t, 0, 0.8), { zeta: 0.5, freq: 2.0 })
    const glow = 0.5 + 0.5 * Math.sin(t * 2.2)
    ctx.save(); ctx.translate(CX, CY); ctx.scale(ap, ap)
    // halo pulsante
    const g = ctx.createRadialGradient(0, -s * 0.2, 0, 0, -s * 0.2, s * 2)
    g.addColorStop(0, rgba(pal.accent, 0.25 * glow)); g.addColorStop(1, rgba(pal.accent, 0))
    ctx.fillStyle = g; ctx.fillRect(-s * 2.5, -s * 2.5, s * 5, s * 5)
    // bulbo
    ctx.strokeStyle = pal.accent; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    ctx.fillStyle = rgba(pal.accent, 0.16)
    ctx.beginPath(); ctx.arc(0, -s * 0.2, s, 0, TAU); ctx.fill(); ctx.stroke()
    // base/rosca
    ctx.beginPath(); ctx.moveTo(-s * 0.45, s * 0.85); ctx.lineTo(s * 0.45, s * 0.85)
    ctx.moveTo(-s * 0.32, s * 1.15); ctx.lineTo(s * 0.32, s * 1.15); ctx.stroke()
    // filamento (acento2)
    ctx.strokeStyle = pal.accent2 || pal.accent; ctx.lineWidth = 3
    ctx.beginPath(); ctx.moveTo(-s * 0.25, -s * 0.2); ctx.lineTo(0, -s * 0.5); ctx.lineTo(s * 0.25, -s * 0.2); ctx.stroke()
    ctx.restore()
  },
})

register({
  id: 'mark.icon.tag-price', lib: 'markkit', category: 'iconos-rubro', tones: ['dark', 'light'], rubros: ['retail', 'inmobiliaria', 'finanzas', 'default'], weight: 0.9,
  tags: ['icono', 'precio', 'etiqueta', 'oferta'],
  render(ctx, t, env) {
    const { pal } = env
    const s = W * 0.18, ap = eOutBack(inv(t, 0, 0.7)), sway = Math.sin(t * 1.6) * 0.08
    ctx.save(); ctx.translate(CX, CY); ctx.rotate(sway); ctx.scale(ap, ap)
    // cuerpo de la etiqueta (pentagono/tag)
    ctx.beginPath()
    ctx.moveTo(-s, -s * 0.7); ctx.lineTo(s * 0.45, -s * 0.7); ctx.lineTo(s * 1.05, 0)
    ctx.lineTo(s * 0.45, s * 0.7); ctx.lineTo(-s, s * 0.7); ctx.closePath()
    ctx.fillStyle = pal.accent; ctx.fill()
    // agujero
    const onAcc = pal.onAccent || (pal.tone === 'light' ? '#fff' : '#0a0a0f')
    ctx.fillStyle = pal.bg0 || onAcc; ctx.beginPath(); ctx.arc(s * 0.55, 0, s * 0.16, 0, TAU); ctx.fill()
    ctx.strokeStyle = rgba(onAcc, 0.5); ctx.lineWidth = 2; ctx.stroke()
    ctx.restore()
  },
})

register({
  id: 'mark.icon.pin-loc', lib: 'markkit', category: 'iconos-rubro', tones: ['dark', 'light'], rubros: ['inmobiliaria', 'turismo', 'gastronomia', 'default'], weight: 0.9,
  tags: ['icono', 'ubicacion', 'mapa', 'pin'],
  render(ctx, t, env) {
    const { pal } = env
    const s = W * 0.16
    const drop = eOutBack(inv(t, 0, 0.7)), bob = Math.sin(t * 1.8) * s * 0.08
    ctx.save(); ctx.translate(CX, CY - s * 0.4 + (1 - drop) * -s * 1.2 + bob)
    // sombra elipse en el "piso"
    ctx.globalAlpha = 0.25 * drop
    ctx.fillStyle = pal.tone === 'light' ? '#000' : '#000'
    ctx.beginPath(); ctx.ellipse(0, s * 1.7, s * 0.5 * drop, s * 0.16 * drop, 0, 0, TAU); ctx.fill()
    ctx.globalAlpha = 1
    // gota del pin
    ctx.fillStyle = pal.accent
    ctx.beginPath()
    ctx.arc(0, 0, s, Math.PI * 0.75, Math.PI * 0.25)
    ctx.lineTo(0, s * 1.6); ctx.closePath(); ctx.fill()
    // circulo central
    ctx.fillStyle = pal.bg0 || '#fff'; ctx.beginPath(); ctx.arc(0, 0, s * 0.4, 0, TAU); ctx.fill()
    ctx.restore()
  },
})

register({
  id: 'mark.icon.check-seal', lib: 'markkit', category: 'iconos-rubro', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['icono', 'check', 'aprobado', 'confianza'],
  render(ctx, t, env) {
    const { pal } = env
    const s = W * 0.2, ap = spring(inv(t, 0, 0.8), { zeta: 0.45, freq: 2.2 })
    ctx.save(); ctx.translate(CX, CY); ctx.scale(ap, ap)
    // disco
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.arc(0, 0, s, 0, TAU); ctx.fill()
    // tilde dibujado por progreso (draw-on)
    const onAcc = pal.onAccent || (pal.tone === 'light' ? '#fff' : '#0a0a0f')
    const dp = eOutCubic(inv(t, 0.35, 1.0))
    ctx.strokeStyle = onAcc; ctx.lineWidth = s * 0.16; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    const p0 = [-s * 0.42, s * 0.02], p1 = [-s * 0.1, s * 0.36], p2 = [s * 0.46, -s * 0.36]
    ctx.beginPath(); ctx.moveTo(p0[0], p0[1])
    if (dp < 0.5) { const k = dp / 0.5; ctx.lineTo(lerp(p0[0], p1[0], k), lerp(p0[1], p1[1], k)) }
    else { const k = (dp - 0.5) / 0.5; ctx.lineTo(p1[0], p1[1]); ctx.lineTo(lerp(p1[0], p2[0], k), lerp(p1[1], p2[1], k)) }
    ctx.stroke()
    ctx.restore()
  },
})

// ============================================================================
// CATEGORIA: divisores/conectores (reglas, lineas)
// ============================================================================

register({
  id: 'mark.divider.rule-grow', lib: 'markkit', category: 'divisores-conectores', tones: ['dark', 'light'], rubros: ['*'], weight: 1.2,
  tags: ['regla', 'divisor', 'minimal'],
  render(ctx, t, env) {
    const { pal } = env
    const full = W * 0.62, grow = eOutCubic(inv(t, 0.1, 0.9)), w = full * grow
    ctx.save(); ctx.translate(CX, CY)
    // regla central
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.roundRect(-w / 2, -3, w, 6, 3); ctx.fill()
    // dos diamantes en las puntas (aparecen al final)
    const dp = eOutBack(inv(t, 0.7, 1.1))
    ctx.save(); ctx.scale(dp, dp)
    for (const sx of [-1, 1]) { polyPath(ctx, sx * (full / 2 / dp + 10), 0, 9, 4, Math.PI / 4); ctx.fillStyle = pal.accent2 || pal.accent; ctx.fill() }
    ctx.restore()
    ctx.restore()
  },
})

register({
  id: 'mark.divider.dotted-flow', lib: 'markkit', category: 'divisores-conectores', tones: ['dark', 'light'], rubros: ['tech', 'logistica', 'default', 'educacion'], weight: 0.9,
  tags: ['conector', 'puntos', 'flujo'],
  render(ctx, t, env) {
    const { pal } = env
    const span = W * 0.66, n = 11, gap = span / (n - 1)
    ctx.save(); ctx.translate(CX - span / 2, CY)
    for (let i = 0; i < n; i++) {
      const ph = (t * 0.6 - i * 0.08)
      const on = inv(t, i * 0.05, i * 0.05 + 0.3)
      const pulse = 0.6 + 0.4 * Math.sin(ph * TAU)
      ctx.globalAlpha = on
      ctx.fillStyle = i === n - 1 ? (pal.accent2 || pal.accent) : pal.accent
      const rad = (i === n - 1 ? 6 : 3.2) * (0.8 + 0.4 * pulse)
      ctx.beginPath(); ctx.arc(i * gap, 0, rad, 0, TAU); ctx.fill()
    }
    ctx.restore()
  },
})

register({
  id: 'mark.connector.arrow', lib: 'markkit', category: 'divisores-conectores', tones: ['dark', 'light'], rubros: ['*'], weight: 0.9,
  tags: ['flecha', 'direccion', 'cta'],
  render(ctx, t, env) {
    const { pal } = env
    const full = W * 0.5, grow = eOutCubic(inv(t, 0.1, 0.85)), w = full * grow
    ctx.save(); ctx.translate(CX - full / 2, CY)
    ctx.strokeStyle = pal.accent; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    // linea
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w, 0); ctx.stroke()
    // punta (aparece cuando la linea casi termino)
    const hp = eOutBack(inv(t, 0.7, 1.05))
    ctx.save(); ctx.translate(full, 0); ctx.scale(hp, hp)
    ctx.beginPath(); ctx.moveTo(-22, -16); ctx.lineTo(2, 0); ctx.lineTo(-22, 16); ctx.stroke()
    ctx.restore()
    ctx.restore()
  },
})

// ============================================================================
// CATEGORIA: marcos/contenedores (cards, brackets)
// ============================================================================

register({
  id: 'mark.frame.brackets', lib: 'markkit', category: 'marcos-contenedores', tones: ['dark', 'light'], rubros: ['*'], weight: 1.1,
  tags: ['marco', 'corchetes', 'foco', 'editorial'],
  render(ctx, t, env) {
    const { pal } = env
    const bw = W * 0.62, bh = H * 0.42, len = Math.min(bw, bh) * 0.32
    const ap = eOutCubic(inv(t, 0.1, 0.8))
    const x0 = CX - bw / 2, y0 = CY - bh / 2, x1 = CX + bw / 2, y1 = CY + bh / 2
    ctx.save()
    ctx.strokeStyle = pal.accent; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    ctx.globalAlpha = ap
    const L = len * ap
    const corner = (cx, cy, dx, dy) => { ctx.beginPath(); ctx.moveTo(cx + dx * L, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + dy * L); ctx.stroke() }
    corner(x0, y0, 1, 1); corner(x1, y0, -1, 1); corner(x0, y1, 1, -1); corner(x1, y1, -1, -1)
    ctx.restore()
  },
})

register({
  id: 'mark.frame.card-rise', lib: 'markkit', category: 'marcos-contenedores', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['card', 'contenedor', 'superficie'],
  render(ctx, t, env) {
    const { pal } = env
    const cw = W * 0.66, ch = H * 0.4
    const ap = spring(inv(t, 0, 0.9), { zeta: 0.6, freq: 1.8 })
    const ry = (1 - ap) * 40
    ctx.save(); ctx.translate(CX, CY + ry); ctx.globalAlpha = clamp(inv(t, 0, 0.5), 0, 1)
    // sombra
    ctx.save(); ctx.shadowColor = rgba('#000', pal.tone === 'light' ? 0.18 : 0.5); ctx.shadowBlur = 28; ctx.shadowOffsetY = 14
    ctx.fillStyle = pal.surface || lighten(pal.bg0 || '#1a1a22', pal.tone === 'light' ? -0.02 : 0.08)
    ctx.beginPath(); ctx.roundRect(-cw / 2, -ch / 2, cw, ch, 20); ctx.fill()
    ctx.restore()
    // borde sutil + barra de acento arriba
    ctx.strokeStyle = rgba(pal.ink || '#fff', 0.08); ctx.lineWidth = 1
    ctx.beginPath(); ctx.roundRect(-cw / 2, -ch / 2, cw, ch, 20); ctx.stroke()
    ctx.fillStyle = pal.accent
    ctx.beginPath(); ctx.roundRect(-cw / 2 + 18, -ch / 2 + 18, 54, 7, 3.5); ctx.fill()
    ctx.restore()
  },
})

register({
  id: 'mark.frame.badge-pill', lib: 'markkit', category: 'marcos-contenedores', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['badge', 'pill', 'etiqueta', 'kicker'],
  render(ctx, t, env) {
    const { pal, content, fonts } = env
    const label = (content && (content.kicker || content.cta || content.tagline)) ? String(content.kicker || content.cta || content.tagline) : 'NOVEDAD'
    const ap = eOutBack(inv(t, 0, 0.7))
    ctx.save(); ctx.translate(CX, CY); ctx.scale(ap, ap)
    const fam = (fonts && fonts.text) || 'Inter'
    ctx.font = `700 22px "${fam}"`
    const txt = label.toUpperCase().slice(0, 22)
    const tw = Math.min(W * 0.7, ctx.measureText(txt).width)
    const padX = 22, padY = 13, w = tw + padX * 2, h = 22 + padY * 2
    // pill relleno acento
    ctx.fillStyle = pal.accent
    ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, h / 2); ctx.fill()
    // punto vivo a la izquierda
    const onAcc = pal.onAccent || (pal.tone === 'light' ? '#fff' : '#0a0a0f')
    drawText(ctx, txt, 0, 1, { size: 22, weight: 700, family: fam, maxW: tw + 2, color: onAcc })
    ctx.restore()
  },
})

// ============================================================================
// CATEGORIA: decoradores/acentos (comillas, chevrons, sparkles)
// ============================================================================

register({
  id: 'mark.accent.quote', lib: 'markkit', category: 'decoradores-acentos', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['comillas', 'cita', 'editorial'],
  render(ctx, t, env) {
    const { pal, fonts } = env
    const ap = eOutBack(inv(t, 0, 0.6)), drift = Math.sin(t * 1.2) * 4
    ctx.save(); ctx.translate(CX, CY + drift); ctx.scale(ap, ap)
    const fam = (fonts && fonts.display) || 'Inter'
    ctx.fillStyle = pal.accent
    // comilla tipografica grande, semitransparente, mas un acento solido
    ctx.globalAlpha = 0.9
    drawText(ctx, '“', 0, 0, { size: 180, weight: 800, family: fam, color: pal.accent })
    ctx.restore()
  },
})

register({
  id: 'mark.accent.chevrons', lib: 'markkit', category: 'decoradores-acentos', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['chevron', 'avanzar', 'ritmo'],
  render(ctx, t, env) {
    const { pal } = env
    ctx.save(); ctx.translate(CX, CY)
    ctx.strokeStyle = pal.accent; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    const N = 3, s = 26, gap = 30
    for (let i = 0; i < N; i++) {
      // cada chevron pulsa en secuencia (onda hacia la derecha)
      const a = clamp(Math.sin(t * 3 - i * 0.7) * 0.5 + 0.6, 0.2, 1)
      ctx.globalAlpha = a
      const x = (i - (N - 1) / 2) * gap
      ctx.beginPath(); ctx.moveTo(x - s * 0.5, -s); ctx.lineTo(x + s * 0.5, 0); ctx.lineTo(x - s * 0.5, s); ctx.stroke()
    }
    ctx.restore()
  },
})

register({
  id: 'mark.accent.sparkles', lib: 'markkit', category: 'decoradores-acentos', tones: ['dark', 'light'], rubros: ['*'], weight: 0.9,
  tags: ['sparkle', 'destello', 'magia', 'premium'],
  render(ctx, t, env) {
    const { pal } = env, r = mulberry32(env.seed ^ 0x59a)
    ctx.save(); ctx.translate(CX, CY)
    const spk = [
      { x: 0, y: 0, s: 1.0, ph: 0 },
      { x: -W * 0.18, y: -H * 0.05, s: 0.5, ph: 0.4 },
      { x: W * 0.16, y: H * 0.06, s: 0.62, ph: 0.7 },
      { x: W * 0.12, y: -H * 0.08, s: 0.4, ph: 0.2 },
    ]
    for (const sp of spk) {
      const tw = 0.5 + 0.5 * Math.sin(t * 2.4 + sp.ph * TAU)
      const rad = 34 * sp.s * (0.7 + 0.3 * tw)
      ctx.globalAlpha = 0.5 + 0.5 * tw
      starPath(ctx, sp.x, sp.y, rad, 4, 0.22, 0)
      const g = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, rad)
      g.addColorStop(0, pal.accent2 || pal.accent); g.addColorStop(1, pal.accent)
      ctx.fillStyle = g; ctx.fill()
    }
    ctx.restore()
  },
})

register({
  id: 'mark.accent.underline-swash', lib: 'markkit', category: 'decoradores-acentos', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['subrayado', 'enfasis', 'trazo'],
  render(ctx, t, env) {
    const { pal } = env
    const w = W * 0.56, dp = eOutCubic(inv(t, 0.1, 0.9))
    ctx.save(); ctx.translate(CX - w / 2, CY)
    ctx.strokeStyle = pal.accent; ctx.lineWidth = 12; ctx.lineCap = 'round'
    // trazo tipo marcador con leve curva, dibujado por progreso
    ctx.beginPath()
    const STEP = 40, end = Math.max(1, Math.round(STEP * dp))
    for (let i = 0; i <= end; i++) {
      const k = i / STEP
      const x = k * w
      const y = Math.sin(k * Math.PI) * 6 - 2
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
    }
    ctx.stroke()
    ctx.restore()
  },
})

// ============================================================================
// CATEGORIA: sustratos/grillas (texturas que un mark coloca, no full-bg pintor)
// ============================================================================

register({
  id: 'mark.substrate.dot-matrix', lib: 'markkit', category: 'sustratos-grillas', tones: ['dark', 'light'], rubros: ['tech', 'finanzas', 'default', 'industria'], weight: 0.8,
  tags: ['puntos', 'grilla', 'tech', 'sustrato'],
  render(ctx, t, env) {
    const { pal } = env
    const bw = W * 0.7, bh = H * 0.46, step = 26
    const cols = Math.floor(bw / step), rows = Math.floor(bh / step)
    const ox = CX - (cols - 1) * step / 2, oy = CY - (rows - 1) * step / 2
    ctx.save()
    for (let r0 = 0; r0 < rows; r0++) for (let c0 = 0; c0 < cols; c0++) {
      const x = ox + c0 * step, y = oy + r0 * step
      // onda diagonal recorre la matriz
      const d = (c0 + r0) / (cols + rows)
      const w0 = 0.5 + 0.5 * Math.sin(t * 1.6 - d * 6)
      ctx.globalAlpha = 0.22 + 0.55 * w0
      ctx.fillStyle = w0 > 0.8 ? (pal.accent2 || pal.accent) : pal.accent
      ctx.beginPath(); ctx.arc(x, y, 1.6 + 2.2 * w0, 0, TAU); ctx.fill()
    }
    ctx.restore()
  },
})

register({
  id: 'mark.substrate.concentric', lib: 'markkit', category: 'sustratos-grillas', tones: ['dark', 'light'], rubros: ['*'], weight: 0.8,
  tags: ['concentrico', 'radar', 'foco', 'sustrato'],
  render(ctx, t, env) {
    const { pal } = env
    ctx.save(); ctx.translate(CX, CY)
    const N = 7, maxR = W * 0.42
    for (let i = 0; i < N; i++) {
      const base = (i + 1) / N
      const rad = maxR * base
      const fade = 1 - base
      ctx.globalAlpha = (0.1 + 0.35 * fade)
      ctx.strokeStyle = i % 2 ? (pal.accent2 || pal.accent) : pal.accent
      ctx.lineWidth = 1.5 + 1.5 * fade
      ctx.beginPath(); ctx.arc(0, 0, rad, 0, TAU); ctx.stroke()
    }
    // barrido tipo radar
    ctx.globalAlpha = 0.5
    const ang = t * 0.9
    const g = ctx.createLinearGradient(0, 0, Math.cos(ang) * maxR, Math.sin(ang) * maxR)
    g.addColorStop(0, rgba(pal.accent, 0.0)); g.addColorStop(1, rgba(pal.accent, 0.45))
    ctx.strokeStyle = g; ctx.lineWidth = 3
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(ang) * maxR, Math.sin(ang) * maxR); ctx.stroke()
    ctx.restore()
  },
})

// ============================================================================
// OLA 2 — mas iconos por dominio + iconos-animados + morphs anti-blob + marcos + decoradores
// ============================================================================

// helper local: superquadric (squircle) path centrado, exponente n controla cuan "cuadrado" es el ovalo.
function squirclePath(ctx, cx, cy, rx, ry, n = 4) {
  ctx.beginPath()
  const STEP = 64
  for (let i = 0; i <= STEP; i++) {
    const a = (i / STEP) * TAU
    const ca = Math.cos(a), sa = Math.sin(a)
    const x = cx + Math.sign(ca) * Math.pow(Math.abs(ca), 2 / n) * rx
    const y = cy + Math.sign(sa) * Math.pow(Math.abs(sa), 2 / n) * ry
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
  }
  ctx.closePath()
}

// ---------- formas/morphs (anti-blob: deliberadas, geometricas-organicas) ----------

register({
  id: 'mark.morph.squircle-morph', lib: 'markkit', category: 'formas-morphs', tones: ['dark', 'light'], rubros: ['tech', 'finanzas', 'default', 'retail'], weight: 1,
  tags: ['squircle', 'morph', 'geometrico', 'premium'],
  render(ctx, t, env) {
    const { pal } = env
    const ap = spring(inv(t, 0, 0.85), { zeta: 0.55, freq: 1.9 })
    // exponente morfea suave entre circulo (n=2) y cuadrado redondeado (n=6) -> deliberado, no gota
    const n = 3.2 + 2.4 * (0.5 + 0.5 * Math.sin(t * 0.9))
    const rad = W * 0.24, spin = Math.sin(t * 0.6) * 0.12
    ctx.save(); ctx.translate(CX, CY); ctx.rotate(spin); ctx.scale(ap, ap)
    squirclePath(ctx, 0, 0, rad, rad, n)
    // gradiente tono-seguro: accent -> variante clara del MISMO accent (sin mezcla muddy accent/accent2)
    const g = ctx.createLinearGradient(-rad, -rad, rad, rad)
    g.addColorStop(0, lighten(pal.accent, 0.22)); g.addColorStop(1, darken(pal.accent, pal.tone === 'light' ? 0.12 : 0.0))
    ctx.fillStyle = g; ctx.fill()
    // contorno interior desfasado (mismo morph, mas chico) = profundidad
    squirclePath(ctx, 0, 0, rad * 0.66, rad * 0.66, n + 1)
    ctx.strokeStyle = rgba(pal.onAccent || (pal.tone === 'light' ? '#fff' : '#0a0a0f'), 0.5); ctx.lineWidth = 2.5; ctx.stroke()
    ctx.restore()
  },
})

register({
  id: 'mark.morph.petal-rosette', lib: 'markkit', category: 'formas-morphs', tones: ['dark', 'light'], rubros: ['salud', 'belleza', 'gastronomia', 'default', 'creatividad'], weight: 0.9,
  tags: ['rosetón', 'petalos', 'organico', 'rotacion'],
  render(ctx, t, env) {
    const { pal } = env, r = mulberry32(env.seed ^ 0x9e7)
    const petals = 5 + (r() * 3 | 0)  // 5..7, estable por seed
    const rad = W * 0.2, ap = eOutBack(inv(t, 0, 0.75))
    ctx.save(); ctx.translate(CX, CY); ctx.rotate(t * 0.35); ctx.scale(ap, ap)
    // petalos como lentes (interseccion de arcos), laten levemente
    const breathe = 1 + 0.06 * Math.sin(t * 1.6)
    for (let i = 0; i < petals; i++) {
      const a = (i / petals) * TAU
      ctx.save(); ctx.rotate(a)
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.quadraticCurveTo(rad * 0.5 * breathe, -rad * 0.42, 0, -rad * breathe)
      ctx.quadraticCurveTo(-rad * 0.5 * breathe, -rad * 0.42, 0, 0)
      ctx.closePath()
      ctx.fillStyle = rgba(i % 2 ? (pal.accent2 || pal.accent) : pal.accent, 0.82); ctx.fill()
      ctx.restore()
    }
    // nucleo
    ctx.fillStyle = pal.accent2 || pal.accent; ctx.beginPath(); ctx.arc(0, 0, rad * 0.2, 0, TAU); ctx.fill()
    ctx.restore()
  },
})

register({
  id: 'mark.morph.wave-bars', lib: 'markkit', category: 'formas-morphs', tones: ['dark', 'light'], rubros: ['musica', 'podcast', 'tech', 'default'], weight: 0.9,
  tags: ['ondas', 'ecualizador', 'audio', 'latido'],
  render(ctx, t, env) {
    const { pal } = env, r = mulberry32(env.seed ^ 0xa17)
    const N = 7, gap = W * 0.07, ph = []
    for (let i = 0; i < N; i++) ph.push(r() * TAU)
    const ap = eOutCubic(inv(t, 0, 0.6))
    ctx.save(); ctx.translate(CX, CY)
    ctx.globalAlpha = ap
    for (let i = 0; i < N; i++) {
      const x = (i - (N - 1) / 2) * gap
      const amp = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 3 + ph[i]))
      const h = W * 0.32 * amp
      const w = gap * 0.5
      ctx.fillStyle = i === (N >> 1) ? (pal.accent2 || pal.accent) : pal.accent
      ctx.beginPath(); ctx.roundRect(x - w / 2, -h / 2, w, h, w / 2); ctx.fill()
    }
    ctx.restore()
  },
})

// ---------- iconos por dominio (nuevos rubros) ----------

register({
  id: 'mark.icon.calendar', lib: 'markkit', category: 'iconos-rubro', tones: ['dark', 'light'], rubros: ['eventos', 'educacion', 'servicios', 'default'], weight: 0.9,
  tags: ['icono', 'calendario', 'fecha', 'agenda'],
  render(ctx, t, env) {
    const { pal } = env
    const s = W * 0.18, ap = spring(inv(t, 0, 0.8), { zeta: 0.5, freq: 2.0 })
    ctx.save(); ctx.translate(CX, CY); ctx.scale(ap, ap)
    const onAcc = pal.onAccent || (pal.tone === 'light' ? '#fff' : '#0a0a0f')
    // cuerpo
    ctx.fillStyle = pal.accent
    ctx.beginPath(); ctx.roundRect(-s, -s * 0.75, s * 2, s * 1.7, s * 0.18); ctx.fill()
    // franja superior
    ctx.fillStyle = pal.accent2 || pal.accent
    ctx.beginPath(); ctx.roundRect(-s, -s * 0.75, s * 2, s * 0.42, [s * 0.18, s * 0.18, 0, 0]); ctx.fill()
    // anillas
    ctx.fillStyle = onAcc
    for (const sx of [-0.5, 0.5]) { ctx.beginPath(); ctx.roundRect(sx * s - s * 0.07, -s * 0.95, s * 0.14, s * 0.3, s * 0.07); ctx.fill() }
    // dia marcado (check que aparece)
    const dp = eOutBack(inv(t, 0.4, 0.95))
    ctx.save(); ctx.translate(0, s * 0.18); ctx.scale(dp, dp)
    ctx.strokeStyle = onAcc; ctx.lineWidth = s * 0.16; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    ctx.beginPath(); ctx.moveTo(-s * 0.3, 0); ctx.lineTo(-s * 0.05, s * 0.26); ctx.lineTo(s * 0.38, -s * 0.26); ctx.stroke()
    ctx.restore()
    ctx.restore()
  },
})

register({
  id: 'mark.icon.cart', lib: 'markkit', category: 'iconos-rubro', tones: ['dark', 'light'], rubros: ['retail', 'ecommerce', 'gastronomia', 'default'], weight: 0.9,
  tags: ['icono', 'carrito', 'compra', 'tienda'],
  render(ctx, t, env) {
    const { pal } = env
    const s = W * 0.16, ap = eOutBack(inv(t, 0, 0.7)), roll = Math.sin(t * 1.8) * s * 0.06
    ctx.save(); ctx.translate(CX + roll, CY); ctx.scale(ap, ap)
    ctx.strokeStyle = pal.accent; ctx.lineWidth = 5.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    // mango + canasta
    ctx.beginPath()
    ctx.moveTo(-s * 1.2, -s * 0.9); ctx.lineTo(-s * 0.75, -s * 0.9)
    ctx.lineTo(-s * 0.45, s * 0.45); ctx.lineTo(s * 0.85, s * 0.45)
    ctx.lineTo(s * 1.1, -s * 0.45); ctx.lineTo(-s * 0.6, -s * 0.45)
    ctx.stroke()
    // ruedas que aparecen
    const wp = eOutBack(inv(t, 0.45, 1.0))
    ctx.fillStyle = pal.accent2 || pal.accent
    for (const wx of [-0.3, 0.7]) { ctx.save(); ctx.translate(wx * s, s * 0.85); ctx.scale(wp, wp); ctx.beginPath(); ctx.arc(0, 0, s * 0.18, 0, TAU); ctx.fill(); ctx.restore() }
    ctx.restore()
  },
})

register({
  id: 'mark.icon.gear', lib: 'markkit', category: 'iconos-rubro', tones: ['dark', 'light'], rubros: ['tech', 'industria', 'servicios', 'logistica', 'default'], weight: 0.9,
  tags: ['icono', 'engranaje', 'ajustes', 'mecanico'],
  render(ctx, t, env) {
    const { pal } = env
    const teeth = 9, s = W * 0.18, ap = spring(inv(t, 0, 0.8), { zeta: 0.5, freq: 1.9 })
    ctx.save(); ctx.translate(CX, CY); ctx.rotate(t * 0.5); ctx.scale(ap, ap)
    // engranaje como anillo con dientes
    ctx.fillStyle = pal.accent
    ctx.beginPath()
    const ro = s, ri = s * 0.78
    for (let i = 0; i < teeth * 2; i++) {
      const a = (i / (teeth * 2)) * TAU
      const rr = i % 2 ? ro : ri
      const x = Math.cos(a) * rr, y = Math.sin(a) * rr
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
    }
    ctx.closePath(); ctx.fill()
    // cuerpo + hueco central
    ctx.beginPath(); ctx.arc(0, 0, s * 0.62, 0, TAU); ctx.fill()
    ctx.fillStyle = pal.bg0 || (pal.tone === 'light' ? '#fff' : '#0a0a0f')
    ctx.beginPath(); ctx.arc(0, 0, s * 0.3, 0, TAU); ctx.fill()
    ctx.restore()
  },
})

register({
  id: 'mark.icon.shield', lib: 'markkit', category: 'iconos-rubro', tones: ['dark', 'light'], rubros: ['seguros', 'finanzas', 'legal', 'salud', 'default'], weight: 0.9,
  tags: ['icono', 'escudo', 'seguridad', 'confianza'],
  render(ctx, t, env) {
    const { pal } = env
    const s = W * 0.18, ap = spring(inv(t, 0, 0.8), { zeta: 0.48, freq: 2.1 })
    ctx.save(); ctx.translate(CX, CY); ctx.scale(ap, ap)
    // escudo
    ctx.beginPath()
    ctx.moveTo(0, -s * 1.1)
    ctx.lineTo(s * 0.85, -s * 0.7)
    ctx.lineTo(s * 0.85, s * 0.15)
    ctx.quadraticCurveTo(s * 0.85, s * 0.95, 0, s * 1.25)
    ctx.quadraticCurveTo(-s * 0.85, s * 0.95, -s * 0.85, s * 0.15)
    ctx.lineTo(-s * 0.85, -s * 0.7)
    ctx.closePath()
    ctx.fillStyle = pal.accent; ctx.fill()
    // tilde draw-on
    const onAcc = pal.onAccent || (pal.tone === 'light' ? '#fff' : '#0a0a0f')
    const dp = eOutCubic(inv(t, 0.35, 1.0))
    ctx.strokeStyle = onAcc; ctx.lineWidth = s * 0.16; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    const p0 = [-s * 0.38, s * 0.05], p1 = [-s * 0.08, s * 0.38], p2 = [s * 0.42, -s * 0.32]
    ctx.beginPath(); ctx.moveTo(p0[0], p0[1])
    if (dp < 0.5) { const k = dp / 0.5; ctx.lineTo(lerp(p0[0], p1[0], k), lerp(p0[1], p1[1], k)) }
    else { const k = (dp - 0.5) / 0.5; ctx.lineTo(p1[0], p1[1]); ctx.lineTo(lerp(p1[0], p2[0], k), lerp(p1[1], p2[1], k)) }
    ctx.stroke()
    ctx.restore()
  },
})

register({
  id: 'mark.icon.key', lib: 'markkit', category: 'iconos-rubro', tones: ['dark', 'light'], rubros: ['inmobiliaria', 'seguros', 'servicios', 'default'], weight: 0.85,
  tags: ['icono', 'llave', 'acceso', 'entrega'],
  render(ctx, t, env) {
    const { pal } = env
    const s = W * 0.16, ap = eOutBack(inv(t, 0, 0.7)), sway = Math.sin(t * 1.5) * 0.1
    ctx.save(); ctx.translate(CX, CY); ctx.rotate(-Math.PI / 4 + sway * 0.2); ctx.scale(ap, ap)
    ctx.strokeStyle = pal.accent; ctx.fillStyle = pal.accent; ctx.lineWidth = s * 0.28; ctx.lineCap = 'round'
    // cabeza (anillo)
    ctx.beginPath(); ctx.arc(-s * 0.6, 0, s * 0.55, 0, TAU); ctx.stroke()
    ctx.save(); ctx.fillStyle = pal.bg0 || (pal.tone === 'light' ? '#fff' : '#0a0a0f')
    ctx.beginPath(); ctx.arc(-s * 0.6, 0, s * 0.22, 0, TAU); ctx.fill(); ctx.restore()
    // vastago + dientes
    ctx.lineWidth = s * 0.22
    ctx.beginPath(); ctx.moveTo(-s * 0.1, 0); ctx.lineTo(s * 1.3, 0); ctx.stroke()
    ctx.lineWidth = s * 0.18
    ctx.beginPath(); ctx.moveTo(s * 0.9, 0); ctx.lineTo(s * 0.9, s * 0.4); ctx.moveTo(s * 1.2, 0); ctx.lineTo(s * 1.2, s * 0.5); ctx.stroke()
    ctx.restore()
  },
})

// ---------- iconos-animados (laten/giran como protagonistas) ----------

register({
  id: 'mark.anim.heart-beat', lib: 'markkit', category: 'iconos-animados', tones: ['dark', 'light'], rubros: ['salud', 'belleza', 'social', 'gastronomia', 'default'], weight: 1,
  tags: ['icono', 'corazon', 'latido', 'me-gusta'],
  render(ctx, t, env) {
    const { pal } = env
    const s = W * 0.16, ap = eOutBack(inv(t, 0, 0.6))
    // latido en dos tiempos (lub-dub) por segundo, estable por t
    const ph = t % 1
    const beat = 1 + 0.14 * Math.exp(-Math.pow((ph - 0.1) / 0.08, 2)) + 0.09 * Math.exp(-Math.pow((ph - 0.28) / 0.08, 2))
    ctx.save(); ctx.translate(CX, CY); ctx.scale(ap * beat, ap * beat)
    // halo pulsante
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 2.4)
    g.addColorStop(0, rgba(pal.accent, 0.22 * (beat - 1) * 6)); g.addColorStop(1, rgba(pal.accent, 0))
    ctx.fillStyle = g; ctx.fillRect(-s * 3, -s * 3, s * 6, s * 6)
    // corazon
    ctx.beginPath()
    ctx.moveTo(0, s * 0.95)
    ctx.bezierCurveTo(-s * 1.5, -s * 0.15, -s * 0.55, -s * 1.15, 0, -s * 0.4)
    ctx.bezierCurveTo(s * 0.55, -s * 1.15, s * 1.5, -s * 0.15, 0, s * 0.95)
    ctx.closePath()
    const gr = ctx.createLinearGradient(0, -s, 0, s)
    gr.addColorStop(0, pal.accent2 || pal.accent); gr.addColorStop(1, pal.accent)
    ctx.fillStyle = gr; ctx.fill()
    ctx.restore()
  },
})

register({
  id: 'mark.anim.bell-ring', lib: 'markkit', category: 'iconos-animados', tones: ['dark', 'light'], rubros: ['eventos', 'social', 'servicios', 'retail', 'default'], weight: 0.9,
  tags: ['icono', 'campana', 'notificacion', 'aviso'],
  render(ctx, t, env) {
    const { pal } = env
    const s = W * 0.16, ap = eOutBack(inv(t, 0, 0.7))
    // balanceo con decaimiento dentro de cada ciclo de 1.4s
    const cyc = (t / 1.4) % 1
    const swing = Math.sin(cyc * TAU * 3) * Math.exp(-cyc * 3) * 0.32
    ctx.save(); ctx.translate(CX, CY - s * 0.3); ctx.scale(ap, ap)
    ctx.save(); ctx.translate(0, -s * 0.9); ctx.rotate(swing); ctx.translate(0, s * 0.9)
    ctx.fillStyle = pal.accent
    // cuerpo de campana
    ctx.beginPath()
    ctx.moveTo(-s * 0.75, s * 0.55)
    ctx.quadraticCurveTo(-s * 0.75, -s * 0.7, 0, -s * 0.95)
    ctx.quadraticCurveTo(s * 0.75, -s * 0.7, s * 0.75, s * 0.55)
    ctx.closePath(); ctx.fill()
    // borde inferior
    ctx.beginPath(); ctx.roundRect(-s * 0.9, s * 0.5, s * 1.8, s * 0.22, s * 0.1); ctx.fill()
    // mango arriba
    ctx.beginPath(); ctx.arc(0, -s * 1.0, s * 0.16, 0, TAU); ctx.fill()
    // badajo
    ctx.fillStyle = pal.accent2 || pal.accent
    ctx.beginPath(); ctx.arc(0, s * 0.78, s * 0.16, 0, TAU); ctx.fill()
    ctx.restore()
    ctx.restore()
  },
})

register({
  id: 'mark.anim.rocket-launch', lib: 'markkit', category: 'iconos-animados', tones: ['dark', 'light'], rubros: ['tech', 'startup', 'finanzas', 'educacion', 'default'], weight: 0.9,
  tags: ['icono', 'cohete', 'lanzamiento', 'crecimiento'],
  render(ctx, t, env) {
    const { pal } = env
    const s = W * 0.15, ap = eOutBack(inv(t, 0, 0.6))
    const hover = Math.sin(t * 2.2) * s * 0.1
    ctx.save(); ctx.translate(CX, CY + hover); ctx.rotate(-Math.PI / 8); ctx.scale(ap, ap)
    const onAcc = pal.onAccent || (pal.tone === 'light' ? '#fff' : '#0a0a0f')
    // llama parpadeante (debajo)
    const fl = 0.6 + 0.4 * Math.sin(t * 9)
    ctx.beginPath()
    ctx.moveTo(-s * 0.32, s * 0.95); ctx.quadraticCurveTo(0, s * (1.5 + 0.6 * fl), s * 0.32, s * 0.95); ctx.closePath()
    const gf = ctx.createLinearGradient(0, s * 0.95, 0, s * 1.9)
    gf.addColorStop(0, pal.accent2 || pal.accent); gf.addColorStop(1, rgba(pal.accent2 || pal.accent, 0))
    ctx.fillStyle = gf; ctx.fill()
    // cuerpo
    ctx.beginPath()
    ctx.moveTo(0, -s * 1.3)
    ctx.quadraticCurveTo(s * 0.7, -s * 0.3, s * 0.55, s * 0.95)
    ctx.lineTo(-s * 0.55, s * 0.95)
    ctx.quadraticCurveTo(-s * 0.7, -s * 0.3, 0, -s * 1.3)
    ctx.closePath()
    ctx.fillStyle = pal.accent; ctx.fill()
    // ventana
    ctx.fillStyle = onAcc; ctx.beginPath(); ctx.arc(0, -s * 0.35, s * 0.26, 0, TAU); ctx.fill()
    // aletas
    ctx.fillStyle = pal.accent2 || pal.accent
    ctx.beginPath(); ctx.moveTo(-s * 0.5, s * 0.4); ctx.lineTo(-s * 0.95, s * 0.95); ctx.lineTo(-s * 0.45, s * 0.95); ctx.closePath(); ctx.fill()
    ctx.beginPath(); ctx.moveTo(s * 0.5, s * 0.4); ctx.lineTo(s * 0.95, s * 0.95); ctx.lineTo(s * 0.45, s * 0.95); ctx.closePath(); ctx.fill()
    ctx.restore()
  },
})

register({
  id: 'mark.anim.star-rate', lib: 'markkit', category: 'iconos-animados', tones: ['dark', 'light'], rubros: ['retail', 'gastronomia', 'turismo', 'servicios', 'default'], weight: 0.95,
  tags: ['icono', 'estrellas', 'rating', 'prueba-social'],
  render(ctx, t, env) {
    const { pal } = env
    const N = 5, gap = W * 0.15, s = W * 0.06
    ctx.save(); ctx.translate(CX, CY)
    for (let i = 0; i < N; i++) {
      const x = (i - (N - 1) / 2) * gap
      // se "encienden" en secuencia con un pop
      const on = spring(inv(t, i * 0.12, i * 0.12 + 0.5), { zeta: 0.4, freq: 2.4 })
      const filled = i < N - 0   // todas llenas; la ultima titila
      const twinkle = i === N - 1 ? (0.85 + 0.15 * Math.sin(t * 4)) : 1
      ctx.save(); ctx.translate(x, 0); ctx.scale(on * twinkle, on * twinkle)
      starPath(ctx, 0, 0, s * 1.6, 5, 0.42, 0)
      ctx.fillStyle = filled ? pal.accent : rgba(pal.accent, 0.25); ctx.fill()
      ctx.restore()
    }
    ctx.restore()
  },
})

// ---------- marcos/contenedores ----------

register({
  id: 'mark.frame.ticket', lib: 'markkit', category: 'marcos-contenedores', tones: ['dark', 'light'], rubros: ['eventos', 'retail', 'turismo', 'default'], weight: 0.9,
  tags: ['marco', 'ticket', 'cupon', 'oferta'],
  render(ctx, t, env) {
    const { pal } = env
    const cw = W * 0.66, ch = H * 0.26
    const ap = spring(inv(t, 0, 0.85), { zeta: 0.6, freq: 1.8 }), ry = (1 - ap) * 30
    ctx.save(); ctx.translate(CX, CY + ry); ctx.globalAlpha = clamp(inv(t, 0, 0.5), 0, 1)
    // cuerpo del ticket con muescas a los lados (perforado)
    const notch = 14
    ctx.fillStyle = pal.surface || lighten(pal.bg0 || '#1a1a22', pal.tone === 'light' ? -0.02 : 0.09)
    ctx.beginPath(); ctx.roundRect(-cw / 2, -ch / 2, cw, ch, 14); ctx.fill()
    // muescas (recortan con color de fondo)
    ctx.fillStyle = pal.bg0 || (pal.tone === 'light' ? '#fff' : '#0a0a0f')
    ctx.beginPath(); ctx.arc(-cw / 2 + cw * 0.66, -ch / 2, notch, 0, TAU); ctx.fill()
    ctx.beginPath(); ctx.arc(-cw / 2 + cw * 0.66, ch / 2, notch, 0, TAU); ctx.fill()
    // linea perforada vertical
    ctx.strokeStyle = rgba(pal.ink || '#fff', 0.25); ctx.lineWidth = 2; ctx.setLineDash([5, 6])
    ctx.beginPath(); ctx.moveTo(-cw / 2 + cw * 0.66, -ch / 2 + notch); ctx.lineTo(-cw / 2 + cw * 0.66, ch / 2 - notch); ctx.stroke()
    ctx.setLineDash([])
    // sello de acento (stub izquierdo)
    ctx.fillStyle = pal.accent
    ctx.beginPath(); ctx.roundRect(-cw / 2 + 16, -10, 40, 20, 5); ctx.fill()
    ctx.restore()
  },
})

register({
  id: 'mark.frame.tab-window', lib: 'markkit', category: 'marcos-contenedores', tones: ['dark', 'light'], rubros: ['tech', 'educacion', 'default', 'servicios'], weight: 0.9,
  tags: ['marco', 'ventana', 'browser', 'card', 'tech'],
  render(ctx, t, env) {
    const { pal } = env
    const cw = W * 0.66, ch = H * 0.36, bar = 26
    const ap = spring(inv(t, 0, 0.9), { zeta: 0.6, freq: 1.8 }), ry = (1 - ap) * 34
    ctx.save(); ctx.translate(CX, CY + ry); ctx.globalAlpha = clamp(inv(t, 0, 0.45), 0, 1)
    // ventana con barra superior tipo navegador
    ctx.save(); ctx.shadowColor = rgba('#000', pal.tone === 'light' ? 0.16 : 0.5); ctx.shadowBlur = 26; ctx.shadowOffsetY = 12
    ctx.fillStyle = pal.surface || lighten(pal.bg0 || '#1a1a22', pal.tone === 'light' ? -0.02 : 0.08)
    ctx.beginPath(); ctx.roundRect(-cw / 2, -ch / 2, cw, ch, 16); ctx.fill()
    ctx.restore()
    // barra superior con acento
    ctx.fillStyle = pal.accent
    ctx.beginPath(); ctx.roundRect(-cw / 2, -ch / 2, cw, bar, [16, 16, 0, 0]); ctx.fill()
    // 3 botones (semaforo) que aparecen en secuencia
    const onAcc = pal.onAccent || (pal.tone === 'light' ? '#fff' : '#0a0a0f')
    for (let i = 0; i < 3; i++) {
      const pop = eOutBack(inv(t, 0.3 + i * 0.08, 0.7 + i * 0.08))
      ctx.globalAlpha = clamp(inv(t, 0, 0.45), 0, 1) * pop
      ctx.fillStyle = rgba(onAcc, 0.92)
      ctx.beginPath(); ctx.arc(-cw / 2 + 22 + i * 20, -ch / 2 + bar / 2, 5.5, 0, TAU); ctx.fill()
    }
    ctx.globalAlpha = clamp(inv(t, 0, 0.45), 0, 1)
    // lineas de contenido fantasma
    ctx.fillStyle = rgba(pal.ink || '#fff', 0.14)
    for (let i = 0; i < 3; i++) { const w = cw * (0.7 - i * 0.16); ctx.beginPath(); ctx.roundRect(-cw / 2 + 20, -ch / 2 + bar + 24 + i * 22, w, 9, 4.5); ctx.fill() }
    ctx.restore()
  },
})

// ---------- decoradores/acentos ----------

register({
  id: 'mark.accent.highlight-marker', lib: 'markkit', category: 'decoradores-acentos', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['resaltador', 'marcador', 'enfasis', 'editorial'],
  render(ctx, t, env) {
    const { pal } = env
    const w = W * 0.58, h = 38, dp = eOutCubic(inv(t, 0.1, 0.85))
    ctx.save(); ctx.translate(CX - w / 2, CY)
    // trazo de resaltador (rectangulo translucido con bordes irregulares) que crece de izq a der
    ctx.globalAlpha = pal.tone === 'light' ? 0.5 : 0.42
    ctx.fillStyle = pal.accent
    const cw = w * dp
    ctx.beginPath()
    ctx.moveTo(0, -h / 2 + 3)
    ctx.lineTo(cw, -h / 2 - 2)
    ctx.lineTo(cw, h / 2 + 2)
    ctx.lineTo(0, h / 2 - 3)
    ctx.closePath(); ctx.fill()
    ctx.restore()
  },
})

register({
  id: 'mark.accent.tick-burst', lib: 'markkit', category: 'decoradores-acentos', tones: ['dark', 'light'], rubros: ['*'], weight: 0.85,
  tags: ['destello', 'rayos', 'celebracion', 'enfasis'],
  render(ctx, t, env) {
    const { pal } = env, r = mulberry32(env.seed ^ 0xb33)
    const N = 12, len0 = []
    for (let i = 0; i < N; i++) len0.push(0.7 + r() * 0.5)
    ctx.save(); ctx.translate(CX, CY); ctx.rotate(t * 0.25)
    // estallido de rayos que salen del centro (pop una vez, luego respira)
    const burst = eOutBack(inv(t, 0, 0.6))
    const breathe = 1 + 0.08 * Math.sin(t * 2.5)
    ctx.lineCap = 'round'
    for (let i = 0; i < N; i++) {
      const a = (i / N) * TAU
      const r0 = W * 0.08 * burst, r1 = W * 0.08 * burst + W * 0.13 * len0[i] * burst * breathe
      ctx.strokeStyle = i % 3 === 0 ? (pal.accent2 || pal.accent) : pal.accent
      ctx.lineWidth = i % 2 ? 3 : 5
      ctx.globalAlpha = 0.7 + 0.3 * Math.sin(t * 3 + i)
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); ctx.stroke()
    }
    // nucleo
    ctx.globalAlpha = 1
    ctx.fillStyle = pal.accent2 || pal.accent
    ctx.beginPath(); ctx.arc(0, 0, W * 0.05 * burst, 0, TAU); ctx.fill()
    ctx.restore()
  },
})
