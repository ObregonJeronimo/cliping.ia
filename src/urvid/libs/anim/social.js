// urvid 1.0 · ANIM · familia SOCIAL / COMUNICACION — micro-animaciones vectoriales con ACCION social (like, share,
// follow, comment, thumbs, mention, megaphone, inbox, reactions, approve). Mismo contrato que las 12 de index.js:
// render(ctx, t, env), PURAS + DETERMINISTAS (solo `t`, cero Math.random/Date.now), line-art en TINTA con el
// highlight en ACENTO (consume env.pal, nunca hardcodea color). LOOPEAN suave (periodo propio) -> vida continua.
// CENTRADAS en (CX,CY) a un radio ~R; el motor las reubica/escala. Un archivo de concepto, no pisa a los demas.
import { register } from '../../core/registry.js'
import { W, H, TAU, rgba, clamp, inv, lerp, eOutCubic, eInOutCubic, eOutBack, spring } from '../../core/util.js'
import { CX, CY, R, LW, loop, pulse, ink, spark, rr, starShape, polyShape } from './_shared.js'

// =============================================================================
// LIKE — corazon que late + chispa
// =============================================================================
register({
  id: 'anim.social.like', lib: 'anim', category: 'social', tones: ['dark', 'light'],
  rubros: ['*'], weight: 1, tags: ['like', 'corazon', 'me gusta', 'favorito'],
  register: 'friendly', intensity: 'medium', concept: 'like', describe: 'Un corazon se traza, se rellena de acento y late con una chispa.',
  render(ctx, t, env) {
    const { pal } = env, per = 2.6, p = loop(t, per)
    // path de corazon centrado en (CX,CY), tamano s (lo recorre una sola funcion para clip + stroke)
    const s = R * 1.15
    function heartPath(scale) {
      const k = s * scale
      ctx.beginPath()
      ctx.moveTo(CX, CY + k * 0.62)
      ctx.bezierCurveTo(CX - k * 1.1, CY - k * 0.18, CX - k * 0.5, CY - k * 0.85, CX, CY - k * 0.32)
      ctx.bezierCurveTo(CX + k * 0.5, CY - k * 0.85, CX + k * 1.1, CY - k * 0.18, CX, CY + k * 0.62)
      ctx.closePath()
    }
    // late: comprimido al inicio del beat, vuelve y se asienta
    const beat = 1 + 0.12 * Math.sin(p * TAU) * (1 - eOutCubic(clamp(inv(p, 0.4, 1), 0, 1)))
    // relleno de acento que sube de abajo hacia arriba (0.1..0.6)
    const fillP = eOutCubic(clamp(inv(p, 0.1, 0.6), 0, 1))
    ctx.save()
    heartPath(beat); ctx.clip()
    ctx.fillStyle = pal.accent
    const top = CY - s * beat * 0.9, h = s * beat * 1.6
    ctx.fillRect(CX - s, top + (1 - fillP) * h, s * 2, h)
    ctx.restore()
    // contorno en tinta
    ink(ctx, pal, LW * 1.15); ctx.strokeStyle = pal.ink
    heartPath(beat); ctx.stroke()
    // chispa al completar el late
    if (fillP > 0.98) {
      const a = 1 - clamp(inv(p, 0.62, 0.95), 0, 1)
      spark(ctx, pal, CX + s * 0.55, CY - s * 0.75, R * 0.1, a)
    }
  },
})

// =============================================================================
// SHARE — 3 nodos con un punto que viaja por las lineas
// =============================================================================
register({
  id: 'anim.social.share', lib: 'anim', category: 'social', tones: ['dark', 'light'],
  rubros: ['*'], weight: 1, tags: ['compartir', 'share', 'difundir', 'red'],
  register: 'neutral', intensity: 'soft', concept: 'share', describe: 'Tres nodos de compartir; un punto de acento viaja del origen a las dos salidas.',
  render(ctx, t, env) {
    const { pal } = env, per = 2.8, p = loop(t, per)
    // nodo origen (izq) + dos nodos destino (arriba-der, abajo-der) = el icono share clasico
    const src = [CX - R * 0.95, CY], top = [CX + R * 0.9, CY - R * 0.95], bot = [CX + R * 0.9, CY + R * 0.95]
    // lineas de conexion
    ink(ctx, pal); ctx.strokeStyle = rgba(pal.ink, 0.45); ctx.lineWidth = LW * 0.85
    ctx.beginPath(); ctx.moveTo(src[0], src[1]); ctx.lineTo(top[0], top[1]); ctx.moveTo(src[0], src[1]); ctx.lineTo(bot[0], bot[1]); ctx.stroke()
    // punto que viaja: sale del origen y va a un destino (alterna por mitad del loop, sin salto en costura)
    const trip = p * 2, leg = Math.floor(trip) % 2, lt = eInOutCubic(trip - Math.floor(trip))
    const dst = leg === 0 ? top : bot
    const px = lerp(src[0], dst[0], lt), py = lerp(src[1], dst[1], lt)
    spark(ctx, pal, px, py, R * 0.11, 1)
    // nodos: origen en tinta, destinos se "encienden" al llegar
    const nr = R * 0.24
    function node(pt, lit) {
      ctx.save(); ctx.fillStyle = lit ? pal.accent : pal.ink
      ctx.beginPath(); ctx.arc(pt[0], pt[1], nr, 0, TAU); ctx.fill()
      if (!lit) { ctx.fillStyle = pal.bg0; ctx.beginPath(); ctx.arc(pt[0], pt[1], nr * 0.42, 0, TAU); ctx.fill() }
      ctx.restore()
    }
    const arrived = lt > 0.92
    node(src, false)
    node(top, leg === 0 && arrived)
    node(bot, leg === 1 && arrived)
  },
})

// =============================================================================
// FOLLOW — avatar con un + que se activa
// =============================================================================
register({
  id: 'anim.social.follow', lib: 'anim', category: 'social', tones: ['dark', 'light'],
  rubros: ['*'], weight: 1, tags: ['seguir', 'follow', 'perfil', 'sumar'],
  register: 'friendly', intensity: 'medium', concept: 'follow', describe: 'Un avatar con un boton + que entra con spring y se vuelve acento (seguir).',
  render(ctx, t, env) {
    const { pal } = env, per = 2.8, p = loop(t, per)
    // avatar (cabeza + hombros) en tinta, ligeramente a la izquierda
    const ax = CX - R * 0.35, ay = CY
    ink(ctx, pal, LW * 1.1); ctx.strokeStyle = pal.ink
    ctx.beginPath(); ctx.arc(ax, ay - R * 0.45, R * 0.5, 0, TAU); ctx.stroke()
    ctx.beginPath(); ctx.arc(ax, ay + R * 1.1, R * 0.95, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke()
    // boton + abajo-derecha: entra con spring y al asentarse se vuelve acento (sigue activado el resto del loop)
    const on = spring(clamp(inv(p, 0.15, 0.6), 0, 1), { zeta: 0.5, freq: 2.2 })
    const bx = ax + R * 0.85, by = ay + R * 0.55, br = R * 0.42 * clamp(on, 0, 1.05)
    const active = on > 0.85
    ctx.save(); ctx.fillStyle = active ? pal.accent : rgba(pal.ink, 0.85)
    ctx.beginPath(); ctx.arc(bx, by, br, 0, TAU); ctx.fill()
    // el signo +
    ctx.strokeStyle = active ? (pal.onAccent || pal.bg0) : pal.bg0; ctx.lineWidth = LW * 1.1; ctx.lineCap = 'round'
    const pl = br * 0.55
    ctx.beginPath(); ctx.moveTo(bx - pl, by); ctx.lineTo(bx + pl, by); ctx.moveTo(bx, by - pl); ctx.lineTo(bx, by + pl); ctx.stroke()
    ctx.restore()
    if (active) { const a = 1 - clamp(inv(p, 0.6, 0.85), 0, 1); spark(ctx, pal, bx, by, R * 0.09, a) }
  },
})

// =============================================================================
// COMMENT — globo con lineas de texto que aparecen
// =============================================================================
register({
  id: 'anim.social.comment', lib: 'anim', category: 'social', tones: ['dark', 'light'],
  rubros: ['*'], weight: 1, tags: ['comentar', 'comentario', 'opinion', 'responder'],
  register: 'friendly', intensity: 'soft', concept: 'comment', describe: 'Un globo de comentario aparece y se escriben dos lineas, la ultima en acento.',
  render(ctx, t, env) {
    const { pal } = env, per = 3.0, p = loop(t, per)
    const w = R * 2.1, h = R * 1.35, x = CX - w / 2, y = CY - h * 0.65
    // globo entra con spring
    const a = spring(clamp(inv(p, 0.05, 0.4), 0, 1), { zeta: 0.55, freq: 2 })
    ctx.save(); ctx.globalAlpha = clamp(a, 0, 1)
    ctx.translate(CX, y + h / 2); ctx.scale(a, a); ctx.translate(-CX, -(y + h / 2))
    ink(ctx, pal, LW * 1.1); ctx.strokeStyle = pal.ink
    rr(ctx, x, y, w, h, h * 0.28); ctx.stroke()
    // colita abajo-izquierda
    ctx.beginPath(); ctx.moveTo(x + w * 0.22, y + h - 1); ctx.lineTo(x + w * 0.12, y + h + h * 0.32); ctx.lineTo(x + w * 0.4, y + h - 1); ctx.closePath(); ctx.fillStyle = pal.bg0; ctx.fill(); ctx.stroke()
    ctx.restore()
    if (a < 0.6) return
    // lineas de texto que se escriben (largos distintos), la ultima en acento
    const lines = [{ y: y + h * 0.34, w: w * 0.72, s: 0.4, c: rgba(pal.ink, 0.6) },
                   { y: y + h * 0.56, w: w * 0.82, s: 0.55, c: rgba(pal.ink, 0.6) },
                   { y: y + h * 0.78, w: w * 0.5, s: 0.7, c: pal.accent }]
    ctx.lineCap = 'round'; ctx.lineWidth = LW * 0.9
    const lx = x + w * 0.16
    for (const ln of lines) {
      const g = eOutCubic(clamp(inv(p, ln.s, ln.s + 0.18), 0, 1))
      if (g <= 0) continue
      ctx.strokeStyle = ln.c
      ctx.beginPath(); ctx.moveTo(lx, ln.y); ctx.lineTo(lx + ln.w * g, ln.y); ctx.stroke()
    }
  },
})

// =============================================================================
// THUMBS — pulgar arriba que rebota
// =============================================================================
register({
  id: 'anim.social.thumbs', lib: 'anim', category: 'social', tones: ['dark', 'light'],
  rubros: ['*'], weight: 1, tags: ['pulgar', 'aprobar', 'me gusta', 'thumbs up'],
  register: 'friendly', intensity: 'medium', concept: 'thumbs', describe: 'Un pulgar arriba sube con rebote y suelta lineas de aprobacion en acento.',
  render(ctx, t, env) {
    const { pal } = env, per = 2.6, p = loop(t, per)
    // sube con eOutBack y baja suave (rebote), sin costura
    const up = p < 0.5 ? eOutBack(clamp(inv(p, 0.05, 0.5), 0, 1)) : 1 - eInOutCubic(clamp(inv(p, 0.6, 1), 0, 1))
    const dy = -R * 0.45 * up
    const tilt = -0.12 * up
    ctx.save(); ctx.translate(CX, CY + dy); ctx.rotate(tilt); ctx.translate(-CX, -CY)
    ink(ctx, pal, LW * 1.1); ctx.strokeStyle = pal.ink; ctx.fillStyle = pal.accent
    // puno (rect redondeado) + pulgar (curva) — escala con R
    const u = R
    const fistX = CX - u * 0.55, fistY = CY + u * 0.1, fw = u * 1.0, fh = u * 0.85
    // dedos (puno)
    rr(ctx, fistX, fistY, fw, fh, u * 0.16); ctx.save(); ctx.globalAlpha = 0.22; ctx.fill(); ctx.restore(); ctx.stroke()
    // lineas que separan los dedos
    ctx.strokeStyle = rgba(pal.ink, 0.5); ctx.lineWidth = LW * 0.6
    for (let i = 1; i < 3; i++) { const yy = fistY + fh * (i / 3); ctx.beginPath(); ctx.moveTo(fistX, yy); ctx.lineTo(fistX + fw, yy); ctx.stroke() }
    // pulgar levantado
    ctx.strokeStyle = pal.ink; ctx.lineWidth = LW * 1.1
    ctx.beginPath()
    ctx.moveTo(fistX, fistY + fh * 0.18)
    ctx.lineTo(fistX, fistY - fh * 0.05)
    ctx.quadraticCurveTo(fistX - u * 0.18, fistY - fh * 0.62, fistX + u * 0.18, fistY - fh * 0.62)
    ctx.quadraticCurveTo(fistX + u * 0.45, fistY - fh * 0.55, fistX + u * 0.4, fistY - fh * 0.05)
    ctx.lineTo(fistX + fw, fistY - fh * 0.05)
    ctx.stroke()
    ctx.restore()
    // lineas de aprobacion (rays) que salen al llegar arriba
    if (up > 0.9) {
      const a = clamp(inv(up, 0.9, 1), 0, 1)
      ctx.save(); ctx.strokeStyle = pal.accent; ctx.lineWidth = LW * 0.85; ctx.lineCap = 'round'; ctx.globalAlpha = a
      const ox = CX + R * 0.55, oy = CY + dy - R * 0.95
      for (let i = -1; i <= 1; i++) { const ang = -Math.PI / 2 + i * 0.5; ctx.beginPath(); ctx.moveTo(ox + Math.cos(ang) * R * 0.25, oy + Math.sin(ang) * R * 0.25); ctx.lineTo(ox + Math.cos(ang) * R * 0.55, oy + Math.sin(ang) * R * 0.55); ctx.stroke() }
      ctx.restore()
    }
  },
})

// =============================================================================
// MENTION — arroba (@) que pulsa
// =============================================================================
register({
  id: 'anim.social.mention', lib: 'anim', category: 'social', tones: ['dark', 'light'],
  rubros: ['*'], weight: 0.95, tags: ['mencion', 'arroba', 'etiquetar', 'usuario'],
  register: 'neutral', intensity: 'soft', concept: 'mention', describe: 'Un arroba (@) se traza, su anillo pulsa y un anillo de acento se expande.',
  render(ctx, t, env) {
    const { pal } = env, per = 2.8, p = loop(t, per)
    const ro = R * 0.95           // radio del anillo exterior
    const ri = R * 0.34           // radio del circulo interior (la "a")
    // anillo de acento que se expande y desvanece (1 pulso por loop)
    const ring = clamp(inv(p, 0.0, 0.55), 0, 1)
    if (ring > 0 && ring < 1) {
      ctx.save(); ctx.globalAlpha = (1 - ring) * 0.9; ctx.strokeStyle = pal.accent; ctx.lineWidth = LW * 0.9
      ctx.beginPath(); ctx.arc(CX, CY, ro * (1 + ring * 0.45), 0, TAU); ctx.stroke(); ctx.restore()
    }
    // pulso de respiracion suave del @
    const br = 1 + 0.03 * pulse(t, per, 1)
    ctx.save(); ctx.translate(CX, CY); ctx.scale(br, br); ctx.translate(-CX, -CY)
    ink(ctx, pal, LW * 1.1); ctx.strokeStyle = pal.ink
    // arco exterior abierto (cola del @) — se traza
    const draw = eOutCubic(clamp(inv(p, 0.1, 0.7), 0, 1))
    const start = -Math.PI * 0.28
    ctx.beginPath(); ctx.arc(CX, CY, ro, start, start + TAU * 0.92 * draw); ctx.stroke()
    // circulo interior (la a) en acento suave
    ctx.strokeStyle = pal.accent; ctx.lineWidth = LW * 1.15
    ctx.beginPath(); ctx.arc(CX - ri * 0.15, CY, ri, 0, TAU); ctx.stroke()
    // trazo de la "a" (palito derecho)
    ctx.strokeStyle = pal.ink; ctx.lineWidth = LW
    ctx.beginPath(); ctx.moveTo(CX + ri * 0.85, CY - ri); ctx.lineTo(CX + ri * 0.85, CY + ri); ctx.stroke()
    ctx.restore()
  },
})

// =============================================================================
// MEGAPHONE — megafono con ondas que salen
// =============================================================================
register({
  id: 'anim.social.megaphone', lib: 'anim', category: 'social', tones: ['dark', 'light'],
  rubros: ['*'], weight: 1, tags: ['anuncio', 'megafono', 'difundir', 'promocion'],
  register: 'playful', intensity: 'bold', concept: 'announce', describe: 'Un megafono emite ondas de acento que viajan y se desvanecen.',
  render(ctx, t, env) {
    const { pal } = env, per = 2.6
    // megafono inclinado, apuntando arriba-derecha, centrado
    ctx.save(); ctx.translate(CX - R * 0.25, CY + R * 0.1); ctx.rotate(-0.32)
    // leve "grito" (vibracion sutil, determinista)
    const shake = 0.02 * Math.sin(loop(t, per) * TAU * 2)
    ctx.rotate(shake)
    ink(ctx, pal, LW * 1.15); ctx.strokeStyle = pal.ink; ctx.fillStyle = rgba(pal.ink, 0.12)
    // cuerpo (cono) del megafono
    const u = R
    ctx.beginPath()
    ctx.moveTo(-u * 1.1, -u * 0.55)
    ctx.lineTo(u * 0.2, -u * 0.32)
    ctx.lineTo(u * 0.2, u * 0.32)
    ctx.lineTo(-u * 1.1, u * 0.55)
    ctx.closePath(); ctx.fill(); ctx.stroke()
    // mango
    ctx.beginPath(); ctx.moveTo(-u * 0.55, u * 0.5); ctx.lineTo(-u * 0.42, u * 0.95); ctx.stroke()
    // banda de la boca (en acento)
    ctx.strokeStyle = pal.accent; ctx.lineWidth = LW * 1.3
    ctx.beginPath(); ctx.moveTo(u * 0.2, -u * 0.32); ctx.lineTo(u * 0.2, u * 0.32); ctx.stroke()
    ctx.restore()
    // ondas que salen de la boca, viajando, escalonadas (3 anillos, loopean sin costura)
    const mx = CX - R * 0.25 + Math.cos(-0.32) * R * 0.2, my = CY + R * 0.1 + Math.sin(-0.32) * R * 0.2
    ctx.save(); ctx.strokeStyle = pal.accent; ctx.lineCap = 'round'
    for (let i = 0; i < 3; i++) {
      const ph = loop(t, per, -i / 3 * per)
      const rad = R * (0.35 + ph * 1.0)
      const a = Math.sin(ph * Math.PI)   // 0 -> 1 -> 0, suave en ambos extremos del loop
      ctx.globalAlpha = a * 0.85; ctx.lineWidth = LW * (1.1 - ph * 0.5)
      ctx.beginPath(); ctx.arc(mx, my, rad, -0.55, 0.55); ctx.stroke()
    }
    ctx.restore()
  },
})

// =============================================================================
// INBOX — bandeja de entrada donde cae un sobre
// =============================================================================
register({
  id: 'anim.social.inbox', lib: 'anim', category: 'social', tones: ['dark', 'light'],
  rubros: ['*'], weight: 0.95, tags: ['bandeja', 'recibir', 'correo', 'mensaje nuevo'],
  register: 'neutral', intensity: 'soft', concept: 'inbox', describe: 'Un sobre cae dentro de la bandeja de entrada con un rebote suave.',
  render(ctx, t, env) {
    const { pal } = env, per = 2.8, p = loop(t, per)
    const bw = R * 2.0, bh = R * 1.0, bx = CX - bw / 2, by = CY + R * 0.35
    // sobre que cae: baja con eOutBack (aterriza dentro), espera y luego se desvanece para reiniciar sin salto
    const fall = eOutBack(clamp(inv(p, 0.05, 0.5), 0, 1))
    const ey = lerp(by - R * 1.5, by - R * 0.05, fall)
    const ew = R * 1.1, eh = R * 0.72, ex = CX - ew / 2
    const landed = fall > 0.95
    const fade = clamp(inv(p, 0.78, 0.95), 0, 1)   // se va al final para que t=per iguale t=0
    ctx.save(); ctx.globalAlpha = 1 - fade
    ink(ctx, pal, LW * 0.95); ctx.strokeStyle = pal.ink
    ctx.fillStyle = landed ? pal.accent : rgba(pal.ink, 0.1)
    rr(ctx, ex, ey, ew, eh, eh * 0.16); ctx.fill(); ctx.stroke()
    // solapa del sobre
    ctx.strokeStyle = landed ? (pal.onAccent || pal.bg0) : pal.ink
    ctx.beginPath(); ctx.moveTo(ex, ey + eh * 0.12); ctx.lineTo(ex + ew / 2, ey + eh * 0.5); ctx.lineTo(ex + ew, ey + eh * 0.12); ctx.stroke()
    ctx.restore()
    // bandeja (la dibujamos encima de la parte baja del sobre para "contenerlo")
    ink(ctx, pal, LW * 1.15); ctx.strokeStyle = pal.ink
    // paredes laterales + base en U
    ctx.beginPath()
    ctx.moveTo(bx, by); ctx.lineTo(bx, by + bh * 0.55); ctx.lineTo(bx + bw * 0.28, by + bh)
    ctx.lineTo(bx + bw * 0.72, by + bh); ctx.lineTo(bx + bw, by + bh * 0.55); ctx.lineTo(bx + bw, by)
    ctx.stroke()
    // labio frontal de la bandeja (tapa el borde inferior del sobre)
    ctx.fillStyle = pal.bg0
    ctx.beginPath()
    ctx.moveTo(bx - LW, by + bh * 0.52); ctx.lineTo(bx + bw * 0.28, by + bh + LW)
    ctx.lineTo(bx + bw * 0.72, by + bh + LW); ctx.lineTo(bx + bw + LW, by + bh * 0.52)
    ctx.lineTo(bx + bw + LW, by + bh + LW * 2); ctx.lineTo(bx - LW, by + bh + LW * 2); ctx.closePath(); ctx.fill()
    ctx.beginPath()
    ctx.moveTo(bx, by + bh * 0.55); ctx.lineTo(bx + bw * 0.28, by + bh); ctx.lineTo(bx + bw * 0.72, by + bh); ctx.lineTo(bx + bw, by + bh * 0.55)
    ctx.stroke()
    // chispa al aterrizar
    if (landed && fade < 0.1) { const a = 1 - clamp(inv(p, 0.5, 0.72), 0, 1); spark(ctx, pal, CX + ew * 0.4, ey, R * 0.09, a) }
  },
})

// =============================================================================
// REACTIONS — fila de circulitos (reacciones) que entran escalonados
// =============================================================================
register({
  id: 'anim.social.reactions', lib: 'anim', category: 'social', tones: ['dark', 'light'],
  rubros: ['*'], weight: 1, tags: ['reacciones', 'emojis', 'interaccion', 'engagement'],
  register: 'playful', intensity: 'medium', concept: 'reactions', describe: 'Una fila de reacciones (corazon, like, estrella) entra escalonada con spring.',
  render(ctx, t, env) {
    const { pal } = env, per = 3.0, p = loop(t, per)
    const n = 4, gap = R * 0.78, x0 = CX - gap * (n - 1) / 2, rr2 = R * 0.3
    // pildora de fondo: relleno sutil + contorno en tinta (siempre presente -> nunca blanco)
    const padX = rr2 * 1.5, padY = rr2 * 1.4
    ctx.save()
    ctx.fillStyle = rgba(pal.ink, pal.tone === 'light' ? 0.08 : 0.16)
    rr(ctx, x0 - padX, CY - padY, gap * (n - 1) + padX * 2, padY * 2, padY); ctx.fill()
    ink(ctx, pal, LW * 0.7); ctx.strokeStyle = rgba(pal.ink, 0.5)
    rr(ctx, x0 - padX, CY - padY, gap * (n - 1) + padX * 2, padY * 2, padY); ctx.stroke()
    ctx.restore()
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    for (let i = 0; i < n; i++) {
      const s = spring(clamp(inv(p, 0.04 + i * 0.13, 0.5 + i * 0.13), 0, 1), { zeta: 0.5, freq: 2.2 })
      if (s <= 0.01) continue
      const x = x0 + i * gap
      // pequeno bob continuo (vida) tras entrar
      const bob = -R * 0.05 * pulse(t, 1.4, 1, i * 0.35) * clamp(inv(s, 0.9, 1), 0, 1)
      const y = CY + bob
      const sc = clamp(s, 0, 1.08)
      ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc)
      // circulo base en acento o tinta alternando
      const lit = i % 2 === 0
      ctx.fillStyle = lit ? pal.accent : rgba(pal.ink, pal.tone === 'light' ? 0.85 : 0.9)
      ctx.beginPath(); ctx.arc(0, 0, rr2, 0, TAU); ctx.fill()
      // glifo interno simple por indice (corazon / + / estrella / check)
      const fg = lit ? (pal.onAccent || pal.bg0) : pal.bg0
      ctx.strokeStyle = fg; ctx.fillStyle = fg; ctx.lineWidth = LW * 0.85
      const g = rr2 * 0.5
      if (i % 4 === 0) { // corazon
        ctx.beginPath(); ctx.moveTo(0, g * 0.85); ctx.bezierCurveTo(-g * 1.3, -g * 0.3, -g * 0.5, -g * 1.1, 0, -g * 0.35); ctx.bezierCurveTo(g * 0.5, -g * 1.1, g * 1.3, -g * 0.3, 0, g * 0.85); ctx.closePath(); ctx.fill()
      } else if (i % 4 === 1) { // mas
        ctx.beginPath(); ctx.moveTo(-g, 0); ctx.lineTo(g, 0); ctx.moveTo(0, -g); ctx.lineTo(0, g); ctx.stroke()
      } else if (i % 4 === 2) { // estrella
        starShape(ctx, 0, 0, g * 1.1); ctx.fill()
      } else { // check
        ctx.beginPath(); ctx.moveTo(-g * 0.7, 0); ctx.lineTo(-g * 0.1, g * 0.6); ctx.lineTo(g * 0.8, -g * 0.6); ctx.stroke()
      }
      ctx.restore()
    }
  },
})

// =============================================================================
// APPROVE — chispas / aprobacion alrededor de un punto (estrella central + burst)
// =============================================================================
register({
  id: 'anim.social.approve', lib: 'anim', category: 'social', tones: ['dark', 'light'],
  rubros: ['*'], weight: 1, tags: ['aprobar', 'destacado', 'viral', 'reconocimiento'],
  register: 'playful', intensity: 'bold', concept: 'approve', describe: 'Una estrella central late y dispara chispas radiales de acento (aprobado).',
  render(ctx, t, env) {
    const { pal } = env, per = 2.6, p = loop(t, per)
    // burst de chispas radiales (sparkles) — salen y vuelven, sin costura
    const burst = Math.sin(loop(t, per) * Math.PI)   // 0 -> 1 -> 0
    ctx.save(); ctx.strokeStyle = pal.accent; ctx.lineCap = 'round'; ctx.lineWidth = LW * 0.9
    const rays = 8
    for (let i = 0; i < rays; i++) {
      const ang = i / rays * TAU + p * TAU / rays   // rotacion que wrappea exacto en el loop (1/rays de vuelta)
      const r0 = R * (0.55 + burst * 0.18), r1 = R * (0.75 + burst * 0.55)
      ctx.globalAlpha = 0.4 + 0.6 * burst
      ctx.beginPath(); ctx.moveTo(CX + Math.cos(ang) * r0, CY + Math.sin(ang) * r0); ctx.lineTo(CX + Math.cos(ang) * r1, CY + Math.sin(ang) * r1); ctx.stroke()
    }
    // puntitos en las diagonales (twinkle)
    ctx.fillStyle = pal.accent
    for (let i = 0; i < 4; i++) {
      const ang = Math.PI / 4 + i / 4 * TAU
      const tw = pulse(t, per, 1, i * per / 4)
      const rr3 = R * (1.0 + 0.08 * burst)
      ctx.globalAlpha = 0.3 + 0.7 * tw
      ctx.beginPath(); ctx.arc(CX + Math.cos(ang) * rr3, CY + Math.sin(ang) * rr3, R * 0.06 * (0.6 + 0.6 * tw), 0, TAU); ctx.fill()
    }
    ctx.restore()
    // estrella central que late
    const beat = 1 + 0.1 * burst
    ctx.save(); ctx.translate(CX, CY); ctx.scale(beat, beat)
    starShape(ctx, 0, 0, R * 0.6)
    ctx.fillStyle = pal.accent; ctx.fill()
    ink(ctx, pal, LW * 1.0); ctx.strokeStyle = pal.ink; ctx.stroke()
    ctx.restore()
  },
})
