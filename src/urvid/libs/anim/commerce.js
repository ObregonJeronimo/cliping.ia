// urvid 1.0 · ANIM · COMMERCE (familia RETAIL / COMPRAS) — micro-animaciones VECTORIALES con accion, line-art pro.
// Extiende la categoria commerce (sin repetir cart-tap). PURAS + DETERMINISTAS (solo `t`; cero Math.random/Date.now).
// Color SIEMPRE de env.pal: lineas/relleno principal en ink; el highlight/accion en accent; texto-sobre-acento onAccent.
// LOOPEAN suave (loop(t, per), el frame en t=per iguala t=0). Centradas en CX,CY a un radio ~R -> el motor reubica/escala.
import { register } from '../../core/registry.js'
import { W, H, TAU, rgba, clamp, inv, lerp, eOutCubic, eInOutCubic, eOutBack, spring } from '../../core/util.js'
import { CX, CY, R, LW, loop, pulse, ink, spark, rr, starShape, polyShape } from './_shared.js'

// =============================================================================
// TAG — etiqueta de precio que entra con spring
// =============================================================================
register({
  id: 'anim.commerce.tag', lib: 'anim', category: 'commerce', tones: ['dark', 'light'],
  rubros: ['default', 'moda', 'belleza', 'gastronomia', 'inmobiliaria'], weight: 1, tags: ['etiqueta', 'precio', 'tag', 'oferta'],
  register: 'friendly', intensity: 'medium', concept: 'tag', describe: 'Una etiqueta de precio entra con spring, se balancea y brilla el ojete.',
  render(ctx, t, env) {
    const { pal } = env, per = 2.8, p = loop(t, per)
    // entra desde arriba-izq con spring; queda colgada y oscila suave
    const inn = spring(clamp(inv(p, 0.0, 0.5), 0, 1), { zeta: 0.5, freq: 1.8 })
    const sway = Math.sin(loop(t, per) * TAU) * 0.06
    // punto de pivote (donde "cuelga" la etiqueta)
    const px = CX - R * 0.7, py = CY - R * 0.85
    ctx.save()
    ctx.translate(px, py)
    ctx.rotate((1 - inn) * -0.5 + sway)        // entra rotada, asienta y oscila
    ctx.translate((1 - inn) * -R * 0.4, (1 - inn) * -R * 0.4)
    ink(ctx, pal, LW * 1.05)
    // cuerpo de la etiqueta (rombo/penon clasico): esquina con ojete hacia el pivote
    const w = R * 1.7, h = R * 0.92, notch = h * 0.5
    ctx.beginPath()
    ctx.moveTo(notch, 0)
    ctx.lineTo(w, 0)
    ctx.lineTo(w, h)
    ctx.lineTo(notch, h)
    ctx.lineTo(0, h / 2)
    ctx.closePath()
    ctx.fillStyle = pal.accent; ctx.fill(); ctx.stroke()
    // ojete (agujero) con destello
    ctx.fillStyle = pal.bg0
    ctx.beginPath(); ctx.arc(notch * 0.78, h / 2, R * 0.13, 0, TAU); ctx.fill()
    ctx.strokeStyle = pal.ink; ctx.lineWidth = LW * 0.7; ctx.stroke()
    // "rayitas" de precio sobre el acento (texto-sobre-acento legible)
    ctx.strokeStyle = pal.onAccent || '#fff'; ctx.lineWidth = LW * 0.9
    for (let i = 0; i < 2; i++) { const ly = h * (0.38 + i * 0.26); ctx.beginPath(); ctx.moveTo(w * 0.46, ly); ctx.lineTo(w * 0.84, ly); ctx.stroke() }
    ctx.restore()
    // brillo en el ojete cuando termina de asentar
    if (inn > 0.96) spark(ctx, pal, px - R * 0.06, py, R * 0.07, 0.5 + 0.5 * pulse(t, 1.6))
  },
})

// =============================================================================
// DISCOUNT — sello de % que se estampa con rebote
// =============================================================================
register({
  id: 'anim.commerce.discount', lib: 'anim', category: 'commerce', tones: ['dark', 'light'],
  rubros: ['default', 'moda', 'gastronomia', 'belleza', 'tech'], weight: 1, tags: ['descuento', 'sello', 'porcentaje', 'rebaja', 'promo'],
  register: 'playful', intensity: 'bold', concept: 'discount', describe: 'Un sello de % cae y se estampa con rebote, soltando ondas de acento.',
  render(ctx, t, env) {
    const { pal } = env, per = 2.6, p = loop(t, per)
    // baja y golpea (eOutBack -> overshoot tipo sello), se queda quieto, repite
    const drop = clamp(inv(p, 0.02, 0.4), 0, 1)
    const sc = 1.7 - 0.7 * eOutBack(drop)      // viene grande, asienta a 1
    const land = drop >= 0.999
    ctx.save(); ctx.translate(CX, CY); ctx.scale(sc, sc)
    // disco festoneado (sello) en acento
    const n = 14, rad = R * 1.05
    ctx.beginPath()
    for (let i = 0; i <= n; i++) {
      const a = i / n * TAU
      const rr2 = rad * (i % 2 ? 0.9 : 1)
      const x = Math.cos(a) * rr2, y = Math.sin(a) * rr2
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
    }
    ctx.closePath()
    ctx.fillStyle = pal.accent; ctx.fill()
    ink(ctx, pal, LW); ctx.strokeStyle = rgba(pal.ink, 0.55); ctx.stroke()
    // simbolo "%" dibujado a mano (sobre el acento)
    ctx.strokeStyle = pal.onAccent || '#fff'; ctx.lineWidth = LW * 1.25; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(R * 0.42, -R * 0.42); ctx.lineTo(-R * 0.42, R * 0.42); ctx.stroke()
    ctx.lineWidth = LW * 1.1
    ctx.beginPath(); ctx.arc(-R * 0.34, -R * 0.34, R * 0.2, 0, TAU); ctx.stroke()
    ctx.beginPath(); ctx.arc(R * 0.34, R * 0.34, R * 0.2, 0, TAU); ctx.stroke()
    ctx.restore()
    // ondas de impacto al estampar
    if (land) {
      const wv = clamp(inv(p, 0.4, 0.72), 0, 1)
      if (wv > 0 && wv < 1) {
        ctx.save(); ctx.globalAlpha = 1 - wv; ctx.strokeStyle = pal.accent; ctx.lineWidth = LW * 0.9
        ctx.beginPath(); ctx.arc(CX, CY, R * (1.1 + wv * 0.7), 0, TAU); ctx.stroke(); ctx.restore()
      }
    }
  },
})

// =============================================================================
// GIFT — caja de regalo cuya tapa se abre y sale un brillo
// =============================================================================
register({
  id: 'anim.commerce.gift', lib: 'anim', category: 'commerce', tones: ['dark', 'light'],
  rubros: ['default', 'moda', 'belleza', 'gastronomia', 'eventos'], weight: 1, tags: ['regalo', 'caja', 'sorpresa', 'gift', 'premio'],
  register: 'friendly', intensity: 'medium', concept: 'gift', describe: 'Una caja de regalo abre la tapa y sale un destello de acento.',
  render(ctx, t, env) {
    const { pal } = env, per = 3.0, p = loop(t, per)
    const bw = R * 1.6, bh = R * 1.15, bx = CX - bw / 2, by = CY - bh * 0.15
    // tapa se levanta (0.2..0.55), se mantiene, vuelve a cerrar al final (0.78..0.98) -> loop sin costura
    const open = eOutCubic(clamp(inv(p, 0.2, 0.55), 0, 1)) * (1 - eInOutCubic(clamp(inv(p, 0.78, 0.98), 0, 1)))
    const lift = open * R * 0.55
    const tilt = open * -0.18
    // cuerpo de la caja
    ink(ctx, pal, LW)
    ctx.fillStyle = rgba(pal.ink, pal.tone === 'light' ? 0.06 : 0.12)
    rr(ctx, bx, by, bw, bh, R * 0.1); ctx.fill(); ctx.strokeStyle = pal.ink; ctx.stroke()
    // cinta vertical de la caja (acento)
    ctx.fillStyle = pal.accent
    ctx.fillRect(CX - R * 0.16, by, R * 0.32, bh)
    // destello que sale cuando esta abierta
    if (open > 0.15) {
      const sa = clamp((open - 0.15) / 0.85, 0, 1)
      ctx.save(); ctx.globalAlpha = sa
      starShape(ctx, CX, by - lift - R * 0.1, R * (0.3 + 0.1 * pulse(t, 0.9)))
      ctx.fillStyle = pal.accent; ctx.fill(); ctx.restore()
      spark(ctx, pal, CX, by - lift - R * 0.1, R * 0.1, sa)
    }
    // TAPA (se levanta e inclina sobre el borde izquierdo)
    ctx.save()
    ctx.translate(bx, by)
    ctx.rotate(tilt)
    ctx.translate(0, -lift)
    const lh = R * 0.4
    ctx.fillStyle = pal.accent
    rr(ctx, -R * 0.06, -lh, bw + R * 0.12, lh + 2, R * 0.1); ctx.fill()
    ctx.strokeStyle = pal.ink; ctx.lineWidth = LW; ctx.stroke()
    // moño sobre la tapa
    ctx.strokeStyle = pal.ink; ctx.lineWidth = LW
    const knX = bw / 2 + R * 0.03, knY = -lh
    ctx.beginPath()
    ctx.moveTo(knX, knY); ctx.quadraticCurveTo(knX - R * 0.45, knY - R * 0.42, knX - R * 0.1, knY - R * 0.05)
    ctx.moveTo(knX, knY); ctx.quadraticCurveTo(knX + R * 0.45, knY - R * 0.42, knX + R * 0.1, knY - R * 0.05)
    ctx.stroke()
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.arc(knX, knY - R * 0.04, R * 0.1, 0, TAU); ctx.fill(); ctx.strokeStyle = pal.ink; ctx.stroke()
    ctx.restore()
  },
})

// =============================================================================
// PAY — tarjeta que desliza y aparece un tilde
// =============================================================================
register({
  id: 'anim.commerce.pay', lib: 'anim', category: 'commerce', tones: ['dark', 'light'],
  rubros: ['default', 'finanzas', 'tech', 'gastronomia', 'moda'], weight: 1, tags: ['pago', 'tarjeta', 'cobro', 'aprobado', 'checkout'],
  register: 'corporate', intensity: 'medium', concept: 'pay', describe: 'Una tarjeta desliza por el lector y aparece un tilde de aprobado.',
  render(ctx, t, env) {
    const { pal } = env, per = 3.0, p = loop(t, per)
    // terminal/lector (ranura horizontal)
    const tw = R * 2.1, th = R * 0.36, ty = CY + R * 0.45
    ctx.fillStyle = rgba(pal.ink, pal.tone === 'light' ? 0.14 : 0.22)
    rr(ctx, CX - tw / 2, ty, tw, th, th / 2); ctx.fill()
    // tarjeta que entra desde la izq, cruza la ranura, sale por la der
    const slide = eInOutCubic(clamp(inv(p, 0.05, 0.5), 0, 1))
    const cw = R * 1.5, ch = R * 0.92
    const cx = lerp(CX - tw / 2 - cw, CX + tw / 2 + cw * 0.2, slide)
    const cy = CY - R * 0.25
    if (slide < 0.999 || p < 0.5) {
      ctx.save()
      // clip a "sobre la ranura" para que parezca que entra al lector
      ctx.fillStyle = pal.accent
      rr(ctx, cx, cy, cw, ch, R * 0.14); ctx.fill()
      ink(ctx, pal, LW * 0.85); ctx.strokeStyle = rgba(pal.ink, 0.5); ctx.stroke()
      // banda magnetica + chip
      ctx.fillStyle = rgba(pal.ink, 0.55); ctx.fillRect(cx, cy + ch * 0.2, cw, ch * 0.18)
      ctx.fillStyle = pal.onAccent || '#fff'
      rr(ctx, cx + cw * 0.12, cy + ch * 0.55, cw * 0.2, ch * 0.24, 2); ctx.fill()
      ctx.restore()
    }
    // tilde de aprobado que aparece tras pasar la tarjeta
    const ok = clamp(inv(p, 0.55, 0.85), 0, 1)
    if (ok > 0) {
      const s = spring(ok, { zeta: 0.5, freq: 2 })
      ctx.save(); ctx.translate(CX, CY - R * 0.35); ctx.scale(s, s)
      ctx.strokeStyle = pal.accent; ctx.lineWidth = LW * 1.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
      const a = R * 0.5, b = R * 0.22
      ctx.beginPath(); ctx.moveTo(-a * 0.55, 0.06 * R); ctx.lineTo(-b * 0.2, b * 1.3); ctx.lineTo(a * 0.75, -a * 0.6); ctx.stroke()
      ctx.restore()
      if (s > 0.95) spark(ctx, pal, CX, CY - R * 0.35, R * 0.08, 1 - clamp(inv(p, 0.86, 1), 0, 1))
    }
  },
})

// =============================================================================
// RECEIPT — ticket que se imprime hacia abajo
// =============================================================================
register({
  id: 'anim.commerce.receipt', lib: 'anim', category: 'commerce', tones: ['dark', 'light'],
  rubros: ['default', 'gastronomia', 'finanzas', 'tech'], weight: 0.95, tags: ['ticket', 'recibo', 'factura', 'comprobante', 'imprimir'],
  register: 'neutral', intensity: 'soft', concept: 'receipt', describe: 'Un ticket se imprime hacia abajo, renglon por renglon, con un total en acento.',
  render(ctx, t, env) {
    const { pal } = env, per = 3.2, p = loop(t, per)
    const w = R * 1.5, x = CX - w / 2
    // "boca" de la impresora arriba
    const slotY = CY - R * 1.35
    ctx.fillStyle = rgba(pal.ink, pal.tone === 'light' ? 0.16 : 0.26)
    rr(ctx, x - R * 0.2, slotY - R * 0.18, w + R * 0.4, R * 0.22, R * 0.06); ctx.fill()
    // el papel sale (largo crece) y al final se "corta" -> vuelve a 0 (loop)
    const grow = eOutCubic(clamp(inv(p, 0.05, 0.7), 0, 1))
    const maxH = R * 2.5
    const ph = maxH * grow
    const top = slotY
    ctx.save()
    // papel
    ctx.fillStyle = pal.tone === 'light' ? '#ffffff' : '#f3f2ee'
    ctx.beginPath()
    ctx.moveTo(x, top)
    ctx.lineTo(x + w, top)
    ctx.lineTo(x + w, top + ph)
    // borde zig-zag inferior (corte de ticket)
    const teeth = 7
    for (let i = teeth; i >= 0; i--) { const zx = x + (i / teeth) * w; const zy = top + ph + (i % 2 ? -R * 0.07 : 0); ctx.lineTo(zx, zy) }
    ctx.closePath()
    ctx.fill()
    ink(ctx, pal, LW * 0.7); ctx.strokeStyle = rgba(pal.ink, 0.35); ctx.stroke()
    // clip al papel y dibujar renglones que aparecen segun crece
    ctx.beginPath(); ctx.rect(x, top, w, ph); ctx.clip()
    const lines = 5
    ctx.strokeStyle = rgba(pal.ink, 0.5); ctx.lineWidth = LW * 0.6; ctx.lineCap = 'round'
    for (let i = 0; i < lines; i++) {
      const ly = top + R * 0.4 + i * R * 0.36
      if (ly > top + ph - R * 0.1) continue
      const lw2 = w * (0.7 - (i % 3) * 0.12)
      ctx.beginPath(); ctx.moveTo(x + w * 0.14, ly); ctx.lineTo(x + w * 0.14 + lw2 * 0.5, ly); ctx.stroke()
      // "monto" a la derecha
      ctx.beginPath(); ctx.moveTo(x + w * 0.7, ly); ctx.lineTo(x + w * 0.86, ly); ctx.stroke()
    }
    // total en acento (ultimo renglon, mas grueso)
    const totY = top + R * 0.4 + lines * R * 0.36
    if (totY < top + ph - R * 0.05) {
      ctx.strokeStyle = pal.accent; ctx.lineWidth = LW * 1.3
      ctx.beginPath(); ctx.moveTo(x + w * 0.14, totY); ctx.lineTo(x + w * 0.5, totY); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(x + w * 0.66, totY); ctx.lineTo(x + w * 0.86, totY); ctx.stroke()
    }
    ctx.restore()
  },
})

// =============================================================================
// DELIVERY — camioncito que avanza y llega (check)
// =============================================================================
register({
  id: 'anim.commerce.delivery', lib: 'anim', category: 'commerce', tones: ['dark', 'light'],
  rubros: ['default', 'gastronomia', 'tech', 'moda'], weight: 1, tags: ['envio', 'delivery', 'camion', 'entrega', 'reparto'],
  register: 'friendly', intensity: 'medium', concept: 'delivery', describe: 'Una camioneta avanza hasta el destino y aparece un tilde de entregado.',
  render(ctx, t, env) {
    const { pal } = env, per = 3.0, p = loop(t, per)
    const roadY = CY + R * 0.95
    // ruta punteada
    ctx.save(); ctx.strokeStyle = rgba(pal.ink, 0.3); ctx.lineWidth = 2; ctx.setLineDash([5, 6])
    ctx.beginPath(); ctx.moveTo(CX - R * 1.7, roadY); ctx.lineTo(CX + R * 1.7, roadY); ctx.stroke(); ctx.restore()
    // pin de destino (a la derecha)
    const destX = CX + R * 1.25
    ink(ctx, pal, LW * 0.9); ctx.strokeStyle = rgba(pal.ink, 0.6)
    ctx.beginPath(); ctx.arc(destX, roadY - R * 0.55, R * 0.22, Math.PI * 0.75, Math.PI * 0.25); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(destX - R * 0.16, roadY - R * 0.42); ctx.lineTo(destX, roadY - R * 0.16); ctx.lineTo(destX + R * 0.16, roadY - R * 0.42); ctx.stroke()
    // camioneta avanza de izq al destino; "rebota" al frenar
    const drive = eInOutCubic(clamp(inv(p, 0.08, 0.62), 0, 1))
    const bx = lerp(CX - R * 1.55, destX - R * 0.95, drive)
    const bob = Math.sin(loop(t, per) * TAU * 4) * R * 0.02 * (drive < 0.98 ? 1 : 0)
    const ty = roadY - R * 0.5 + bob
    ctx.save(); ctx.translate(bx, ty)
    // caja de carga + cabina (line-art relleno suave)
    ink(ctx, pal, LW)
    ctx.fillStyle = pal.accent
    rr(ctx, 0, -R * 0.42, R * 0.9, R * 0.42, R * 0.06); ctx.fill(); ctx.strokeStyle = pal.ink; ctx.stroke()       // caja
    ctx.fillStyle = rgba(pal.ink, pal.tone === 'light' ? 0.85 : 0.9)
    ctx.beginPath()
    ctx.moveTo(R * 0.9, -R * 0.42); ctx.lineTo(R * 1.28, -R * 0.42); ctx.lineTo(R * 1.42, -R * 0.12); ctx.lineTo(R * 1.42, 0); ctx.lineTo(R * 0.9, 0); ctx.closePath()
    ctx.fill(); ctx.stroke()                                                                                       // cabina
    // ventanilla
    ctx.fillStyle = pal.bg0; ctx.beginPath(); ctx.moveTo(R * 0.98, -R * 0.36); ctx.lineTo(R * 1.22, -R * 0.36); ctx.lineTo(R * 1.3, -R * 0.14); ctx.lineTo(R * 0.98, -R * 0.14); ctx.closePath(); ctx.fill()
    // ruedas
    ctx.fillStyle = pal.ink
    for (const wx of [R * 0.26, R * 1.12]) { ctx.beginPath(); ctx.arc(wx, 0, R * 0.16, 0, TAU); ctx.fill(); ctx.fillStyle = pal.bg0; ctx.beginPath(); ctx.arc(wx, 0, R * 0.06, 0, TAU); ctx.fill(); ctx.fillStyle = pal.ink }
    ctx.restore()
    // tilde "entregado" sobre el pin al llegar
    const ok = clamp(inv(p, 0.66, 0.9), 0, 1)
    if (ok > 0) {
      const s = spring(ok, { zeta: 0.5, freq: 2 })
      ctx.save(); ctx.translate(destX, roadY - R * 0.95); ctx.scale(s, s)
      ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.arc(0, 0, R * 0.26, 0, TAU); ctx.fill()
      ctx.strokeStyle = pal.onAccent || '#fff'; ctx.lineWidth = LW; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
      ctx.beginPath(); ctx.moveTo(-R * 0.12, 0); ctx.lineTo(-R * 0.03, R * 0.1); ctx.lineTo(R * 0.14, -R * 0.11); ctx.stroke()
      ctx.restore()
    }
  },
})

// =============================================================================
// COUPON — cupon con linea punteada que se "corta"
// =============================================================================
register({
  id: 'anim.commerce.coupon', lib: 'anim', category: 'commerce', tones: ['dark', 'light'],
  rubros: ['default', 'gastronomia', 'moda', 'belleza', 'eventos'], weight: 0.95, tags: ['cupon', 'voucher', 'descuento', 'canje', 'promo'],
  register: 'friendly', intensity: 'medium', concept: 'coupon', describe: 'Un cupon con tijera que recorre la linea punteada y separa el talon.',
  render(ctx, t, env) {
    const { pal } = env, per = 3.0, p = loop(t, per)
    const w = R * 2.4, h = R * 1.3, x = CX - w / 2, y = CY - h / 2
    // linea de corte (a 0.66 del ancho)
    const cutX = x + w * 0.66
    // progreso del corte: la tijera baja por la linea -> el talon derecho se separa
    const cut = eInOutCubic(clamp(inv(p, 0.2, 0.62), 0, 1))
    const gap = cut * R * 0.22
    // muescas (notches) en los extremos de la linea de corte
    function panel(px, pw, fill, shift) {
      ctx.save(); ctx.translate(shift, 0)
      ctx.fillStyle = fill
      rr(ctx, px, y, pw, h, R * 0.12); ctx.fill()
      ink(ctx, pal, LW); ctx.strokeStyle = pal.ink; ctx.stroke()
      ctx.restore()
    }
    // panel izquierdo (cuerpo, ink suave) y derecho (talon, acento)
    panel(x, w * 0.66, rgba(pal.ink, pal.tone === 'light' ? 0.06 : 0.12), 0)
    panel(cutX, w * 0.34, pal.accent, gap)
    // contenido del cuerpo: "%" grande + renglones
    ctx.save()
    ctx.strokeStyle = pal.accent; ctx.lineWidth = LW * 1.3; ctx.lineCap = 'round'
    const gx = x + w * 0.18, gy = CY
    ctx.beginPath(); ctx.moveTo(gx + R * 0.22, gy - R * 0.3); ctx.lineTo(gx - R * 0.22, gy + R * 0.3); ctx.stroke()
    ctx.lineWidth = LW
    ctx.beginPath(); ctx.arc(gx - R * 0.18, gy - R * 0.18, R * 0.12, 0, TAU); ctx.stroke()
    ctx.beginPath(); ctx.arc(gx + R * 0.18, gy + R * 0.18, R * 0.12, 0, TAU); ctx.stroke()
    // renglones a la derecha del %
    ctx.strokeStyle = rgba(pal.ink, 0.5); ctx.lineWidth = LW * 0.7
    for (let i = 0; i < 2; i++) { const ly = gy - R * 0.16 + i * R * 0.32; ctx.beginPath(); ctx.moveTo(x + w * 0.34, ly); ctx.lineTo(x + w * 0.56, ly); ctx.stroke() }
    // estrellita en el talon (acento)
    ctx.restore()
    starShape(ctx, cutX + w * 0.17 + gap, CY, R * 0.2)
    ctx.fillStyle = pal.onAccent || '#fff'; ctx.fill()
    // linea de corte punteada (entre paneles)
    ctx.save(); ctx.strokeStyle = rgba(pal.ink, 0.5); ctx.lineWidth = LW * 0.8; ctx.setLineDash([3, 5])
    ctx.beginPath(); ctx.moveTo(cutX, y + R * 0.1); ctx.lineTo(cutX, y + h - R * 0.1); ctx.stroke(); ctx.restore()
    // tijera que baja por la linea durante el corte
    if (cut > 0.001 && cut < 0.999) {
      const sy = lerp(y - R * 0.1, y + h + R * 0.1, cut)
      ctx.save(); ctx.translate(cutX, sy)
      ink(ctx, pal, LW * 0.9); ctx.strokeStyle = pal.ink
      // dos aros + hojas de la tijera
      const open = 0.1 + 0.06 * Math.sin(loop(t, per) * TAU * 8)
      ctx.beginPath(); ctx.arc(-R * 0.16, R * 0.18, R * 0.1, 0, TAU); ctx.stroke()
      ctx.beginPath(); ctx.arc(R * 0.16, R * 0.18, R * 0.1, 0, TAU); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(-R * 0.1, R * 0.12); ctx.lineTo(R * (0.06 + open), -R * 0.22); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(R * 0.1, R * 0.12); ctx.lineTo(-R * (0.06 + open), -R * 0.22); ctx.stroke()
      ctx.restore()
    }
  },
})

// =============================================================================
// BASKET — canasta que se llena de a poco
// =============================================================================
register({
  id: 'anim.commerce.basket', lib: 'anim', category: 'commerce', tones: ['dark', 'light'],
  rubros: ['default', 'gastronomia', 'belleza', 'moda'], weight: 1, tags: ['canasta', 'compras', 'super', 'productos', 'cesta'],
  register: 'friendly', intensity: 'medium', concept: 'basket', describe: 'Una canasta de compras se llena con productos que caen de a uno.',
  render(ctx, t, env) {
    const { pal } = env, per = 3.0, p = loop(t, per)
    const bw = R * 1.9, bh = R * 1.0, bx = CX - bw / 2, by = CY + R * 0.1
    // 3 items que caen escalonados dentro de la canasta
    const items = [
      { dx: -bw * 0.22, t0: 0.05, hue: 'accent', shape: 'circle' },
      { dx: 0, t0: 0.22, hue: 'ink', shape: 'square' },
      { dx: bw * 0.22, t0: 0.4, hue: 'accent', shape: 'tri' },
    ]
    for (const it of items) {
      const fall = eOutCubic(clamp(inv(p, it.t0, it.t0 + 0.32), 0, 1))
      const sx = bx + bw / 2 + it.dx
      const sy = lerp(by - R * 1.3, by - R * 0.12, fall)
      const settle = 1 + (fall > 0.92 ? Math.sin((fall - 0.92) / 0.08 * Math.PI) * 0.12 : 0)  // squash al asentar
      ctx.save(); ctx.translate(sx, sy); ctx.scale(1 + (1 - settle) * 0.4, settle)
      ctx.fillStyle = it.hue === 'accent' ? pal.accent : rgba(pal.ink, pal.tone === 'light' ? 0.85 : 0.9)
      if (it.shape === 'circle') { ctx.beginPath(); ctx.arc(0, 0, R * 0.26, 0, TAU); ctx.fill() }
      else if (it.shape === 'square') { rr(ctx, -R * 0.24, -R * 0.24, R * 0.48, R * 0.48, R * 0.07); ctx.fill() }
      else { polyShape(ctx, 0, R * 0.06, R * 0.32, 3, 0); ctx.fill() }
      ctx.restore()
    }
    // canasta por DELANTE (tapa los items abajo) — trapecio + rejilla + asa
    ink(ctx, pal, LW * 1.05); ctx.strokeStyle = pal.ink
    ctx.fillStyle = rgba(pal.ink, pal.tone === 'light' ? 0.05 : 0.1)
    ctx.beginPath()
    ctx.moveTo(bx, by)
    ctx.lineTo(bx + bw, by)
    ctx.lineTo(bx + bw - R * 0.22, by + bh)
    ctx.lineTo(bx + R * 0.22, by + bh)
    ctx.closePath(); ctx.fill(); ctx.stroke()
    // rejilla vertical de la canasta
    ctx.strokeStyle = rgba(pal.ink, 0.45); ctx.lineWidth = LW * 0.6
    for (let i = 1; i < 5; i++) { const fx = i / 5; const tx = bx + bw * fx; const bxx = bx + R * 0.22 + (bw - R * 0.44) * fx; ctx.beginPath(); ctx.moveTo(tx, by); ctx.lineTo(bxx, by + bh); ctx.stroke() }
    // borde superior
    ctx.strokeStyle = pal.ink; ctx.lineWidth = LW * 1.1
    ctx.beginPath(); ctx.moveTo(bx - R * 0.06, by); ctx.lineTo(bx + bw + R * 0.06, by); ctx.stroke()
    // asa
    ctx.beginPath(); ctx.arc(CX, by, R * 0.5, Math.PI * 1.12, Math.PI * 1.88); ctx.stroke()
  },
})

// =============================================================================
// BAG — bolsa de shopping con asa que rebota
// =============================================================================
register({
  id: 'anim.commerce.bag', lib: 'anim', category: 'commerce', tones: ['dark', 'light'],
  rubros: ['default', 'moda', 'belleza', 'eventos'], weight: 1, tags: ['bolsa', 'shopping', 'compra', 'tienda', 'paquete'],
  register: 'friendly', intensity: 'soft', concept: 'bag', describe: 'Una bolsa de shopping baja con un rebote suave y el asa oscila.',
  render(ctx, t, env) {
    const { pal } = env, per = 2.8, p = loop(t, per)
    // baja con spring y queda flotando con un bob continuo (loop suave)
    const drop = spring(clamp(inv(p, 0.0, 0.55), 0, 1), { zeta: 0.45, freq: 1.6 })
    const float = Math.sin(loop(t, per) * TAU) * R * 0.05
    const cy = lerp(CY - R * 0.5, CY, drop) + float
    const bw = R * 1.4, bh = R * 1.5, bx = CX - bw / 2, by = cy - bh * 0.3
    // asas (dos arcos limpios que salen del borde superior; rebotan un toque distinto al cuerpo)
    const sway = Math.sin(loop(t, per) * TAU + 0.5) * 0.04
    ink(ctx, pal, LW * 1.1); ctx.strokeStyle = pal.ink
    ctx.save(); ctx.translate(CX, by); ctx.rotate(sway)
    for (const hx of [-bw * 0.24, bw * 0.24]) { ctx.beginPath(); ctx.arc(hx, 0, R * 0.3, Math.PI * 1.02, Math.PI * 1.98); ctx.stroke() }
    ctx.restore()
    // cuerpo de la bolsa
    ctx.fillStyle = pal.accent
    ctx.beginPath()
    ctx.moveTo(bx, by)
    ctx.lineTo(bx + bw, by)
    ctx.lineTo(bx + bw + R * 0.08, by + bh)
    ctx.lineTo(bx - R * 0.08, by + bh)
    ctx.closePath()
    ctx.fill(); ctx.strokeStyle = pal.ink; ctx.lineWidth = LW * 1.05; ctx.stroke()
    // pliegue superior (borde de la bolsa)
    ctx.strokeStyle = rgba(pal.ink, 0.55); ctx.lineWidth = LW * 0.7
    ctx.beginPath(); ctx.moveTo(bx + R * 0.05, by + R * 0.16); ctx.lineTo(bx + bw - R * 0.05, by + R * 0.16); ctx.stroke()
    // emblema (estrellita) sobre el acento, late suave
    const beat = 1 + 0.08 * pulse(t, 1.6)
    ctx.save(); ctx.translate(CX, by + bh * 0.62); ctx.scale(beat, beat)
    starShape(ctx, 0, 0, R * 0.26)
    ctx.fillStyle = pal.onAccent || '#fff'; ctx.fill(); ctx.restore()
  },
})

// =============================================================================
// PRICE-DOWN — etiqueta con flecha que baja (oferta)
// =============================================================================
register({
  id: 'anim.commerce.price-down', lib: 'anim', category: 'commerce', tones: ['dark', 'light'],
  rubros: ['default', 'moda', 'gastronomia', 'tech', 'inmobiliaria'], weight: 1, tags: ['oferta', 'rebaja', 'precio', 'baja', 'descuento'],
  register: 'corporate', intensity: 'medium', concept: 'price-down', describe: 'Una etiqueta de precio con una flecha que baja: el precio cae (oferta).',
  render(ctx, t, env) {
    const { pal } = env, per = 2.8, p = loop(t, per)
    // etiqueta-marco arriba (precio viejo, tachado) y abajo el nuevo
    const w = R * 1.55, h = R * 0.7, x = CX - w / 2
    const oldY = CY - R * 0.95
    // precio viejo (renglon tachado, ink atenuado)
    ink(ctx, pal, LW * 0.9); ctx.strokeStyle = rgba(pal.ink, 0.55)
    rr(ctx, x, oldY - h / 2, w, h, R * 0.1); ctx.fillStyle = rgba(pal.ink, pal.tone === 'light' ? 0.05 : 0.1); ctx.fill(); ctx.stroke()
    ctx.strokeStyle = rgba(pal.ink, 0.6); ctx.lineWidth = LW * 0.8
    ctx.beginPath(); ctx.moveTo(x + w * 0.2, oldY); ctx.lineTo(x + w * 0.8, oldY); ctx.stroke()       // numeros (placeholder)
    // tachado del precio viejo (se dibuja diagonal animado)
    const strike = eOutCubic(clamp(inv(p, 0.1, 0.4), 0, 1))
    ctx.strokeStyle = pal.accent; ctx.lineWidth = LW
    ctx.beginPath(); ctx.moveTo(x + w * 0.15, oldY + h * 0.18); ctx.lineTo(x + w * (0.15 + 0.7 * strike), oldY - h * 0.18); ctx.stroke()
    // FLECHA que baja desde la etiqueta vieja hacia la nueva
    const arr = eInOutCubic(clamp(inv(p, 0.35, 0.72), 0, 1))
    const ax = CX, ayTop = oldY + h / 2 + R * 0.1, ayBot = CY + R * 0.32
    const ayHead = lerp(ayTop, ayBot, arr)
    ctx.strokeStyle = pal.accent; ctx.lineWidth = LW * 1.2; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(ax, ayTop); ctx.lineTo(ax, ayHead); ctx.stroke()
    // punta de flecha
    ctx.fillStyle = pal.accent
    ctx.beginPath(); ctx.moveTo(ax, ayHead + R * 0.18); ctx.lineTo(ax - R * 0.18, ayHead - R * 0.06); ctx.lineTo(ax + R * 0.18, ayHead - R * 0.06); ctx.closePath(); ctx.fill()
    // etiqueta-precio NUEVO (acento) aparece abajo cuando llega la flecha
    const show = clamp(inv(p, 0.62, 0.85), 0, 1)
    if (show > 0) {
      const s = spring(show, { zeta: 0.5, freq: 2 })
      const newY = CY + R * 0.95
      ctx.save(); ctx.translate(CX, newY); ctx.scale(s, s)
      ctx.fillStyle = pal.accent
      rr(ctx, -w / 2, -h / 2, w, h, R * 0.12); ctx.fill()
      ctx.strokeStyle = pal.ink; ctx.lineWidth = LW; ctx.stroke()
      // numeros del precio nuevo (sobre acento)
      ctx.strokeStyle = pal.onAccent || '#fff'; ctx.lineWidth = LW * 0.9; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(-w * 0.28, 0); ctx.lineTo(w * 0.1, 0); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(w * 0.2, -h * 0.18); ctx.lineTo(w * 0.32, -h * 0.18); ctx.stroke()
      ctx.restore()
      if (s > 0.96) spark(ctx, pal, CX + w * 0.32, newY, R * 0.07, 0.6 * pulse(t, 1.4))
    }
  },
})
