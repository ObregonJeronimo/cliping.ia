// urvid 1.0 · ANIM · concepto MEDIA / CONTENIDO — micro-animaciones VECTORIALES line-art (play, video, camara, audio,
// fotos, mic, volumen, broadcast, reel, galeria). render(ctx, t, env). PURAS + DETERMINISTAS (solo `t`; cero
// Math.random/Date.now). Color SIEMPRE de env.pal (tinta = pal.ink, accion/highlight = pal.accent, texto-sobre-acento
// = pal.onAccent). LOOPEAN suave (periodo propio via loop()) -> vida continua, sin costura. Centradas en (CX,CY) ~R.
// Un archivo de concepto; no importa nada de otros archivos de anim/ (solo los helpers compartidos).
import { register } from '../../core/registry.js'
import { W, H, TAU, rgba, clamp, inv, lerp, eOutCubic, eInOutCubic, eOutBack, spring } from '../../core/util.js'
import { CX, CY, R, LW, loop, pulse, ink, spark, rr, starShape, polyShape } from './_shared.js'

// =============================================================================
// PLAY — reproducir / dar play
// =============================================================================
register({
  id: 'anim.media.play', lib: 'anim', category: 'media', tones: ['dark', 'light'],
  rubros: ['*'], weight: 1, tags: ['play', 'reproducir', 'video', 'boton'],
  register: 'friendly', intensity: 'medium', concept: 'play', describe: 'Un triangulo de play dentro de un anillo que late y emite un aro.',
  render(ctx, t, env) {
    const { pal } = env, per = 2.6, p = loop(t, per)
    const ring = R * 1.0
    // aro que se expande y desvanece (emision al "darle play")
    const w = clamp(inv(p, 0.0, 0.55), 0, 1)
    if (w > 0 && w < 1) { ctx.save(); ctx.globalAlpha = (1 - w) * 0.8; ctx.strokeStyle = pal.accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(CX, CY, ring + w * R * 0.7, 0, TAU); ctx.stroke(); ctx.restore() }
    // anillo base que late
    const beat = 1 + 0.05 * pulse(t, per, 1)
    ink(ctx, pal, LW * 1.1); ctx.strokeStyle = pal.ink
    ctx.beginPath(); ctx.arc(CX, CY, ring * beat, 0, TAU); ctx.stroke()
    // triangulo de play (acento), con un pop sutil al inicio del loop
    const pop = 1 + 0.12 * (1 - clamp(inv(p, 0.0, 0.3), 0, 1))
    ctx.save(); ctx.translate(CX, CY); ctx.scale(pop, pop)
    ctx.fillStyle = pal.accent; ctx.beginPath()
    const tr = R * 0.5
    ctx.moveTo(-tr * 0.52, -tr * 0.62); ctx.lineTo(tr * 0.72, 0); ctx.lineTo(-tr * 0.52, tr * 0.62); ctx.closePath()
    ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.lineWidth = LW * 1.2; ctx.strokeStyle = pal.accent; ctx.fill(); ctx.stroke()
    ctx.restore()
  },
})

// =============================================================================
// VIDEO — tira de film / metraje
// =============================================================================
register({
  id: 'anim.media.film-strip', lib: 'anim', category: 'media', tones: ['dark', 'light'],
  rubros: ['*'], weight: 1, tags: ['video', 'film', 'cine', 'metraje', 'cuadros'],
  register: 'editorial', intensity: 'soft', concept: 'video', describe: 'Una tira de film cuyos cuadros corren en loop, con un fotograma en acento.',
  render(ctx, t, env) {
    const { pal } = env, per = 3.0, p = loop(t, per)
    const sw = R * 2.4, sh = R * 1.2, x0 = CX - sw / 2, y0 = CY - sh / 2
    // marco de la tira
    ink(ctx, pal, LW); ctx.strokeStyle = pal.ink
    rr(ctx, x0, y0, sw, sh, R * 0.12); ctx.stroke()
    // bandas de perforacion (arriba y abajo) con cuadritos que se desplazan
    const pitch = sw / 4, off = p * pitch
    ctx.save(); rr(ctx, x0, y0, sw, sh, R * 0.12); ctx.clip()
    ctx.fillStyle = rgba(pal.ink, 0.5)
    for (let i = -1; i < 6; i++) {
      const px = x0 + i * pitch + off + pitch * 0.28
      rr(ctx, px, y0 + sh * 0.10, pitch * 0.42, sh * 0.13, 2); ctx.fill()
      rr(ctx, px, y0 + sh * 0.77, pitch * 0.42, sh * 0.13, 2); ctx.fill()
    }
    // ventana de fotograma central + el que pasa por el centro se pinta de acento
    const fw = sw * 0.42, fh = sh * 0.52, fx = CX - fw / 2, fy = CY - fh / 2
    const glow = clamp(inv(p, 0.3, 0.5), 0, 1) * (1 - clamp(inv(p, 0.5, 0.7), 0, 1))
    ctx.fillStyle = rgba(pal.accent, 0.18 + 0.55 * glow)
    rr(ctx, fx, fy, fw, fh, R * 0.07); ctx.fill()
    ctx.restore()
    ctx.strokeStyle = rgba(pal.ink, 0.7); ctx.lineWidth = 2
    rr(ctx, fx, fy, fw, fh, R * 0.07); ctx.stroke()
  },
})

// =============================================================================
// CAMERA — obturador / disparo + flash
// =============================================================================
register({
  id: 'anim.media.shutter', lib: 'anim', category: 'media', tones: ['dark', 'light'],
  rubros: ['default', 'moda', 'belleza', 'gastronomia', 'eventos', 'inmobiliaria'], weight: 1, tags: ['camara', 'foto', 'obturador', 'disparo', 'flash'],
  register: 'editorial', intensity: 'medium', concept: 'camera', describe: 'El obturador de una camara se cierra, dispara un flash y se reabre.',
  render(ctx, t, env) {
    const { pal } = env, per = 2.8, p = loop(t, per)
    const rad = R * 0.95
    // apertura: 0 abierto, 1 cerrado (cierra y reabre dentro del loop)
    const close = clamp(inv(p, 0.18, 0.42), 0, 1) * (1 - clamp(inv(p, 0.5, 0.78), 0, 1))
    const k = eInOutCubic(close)
    // flash al cierre maximo
    const flash = clamp(inv(p, 0.4, 0.5), 0, 1) * (1 - clamp(inv(p, 0.5, 0.62), 0, 1))
    if (flash > 0) { ctx.save(); ctx.globalAlpha = flash; ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.arc(CX, CY, rad * 1.5, 0, TAU); ctx.fill(); ctx.restore() }
    // aro exterior
    ink(ctx, pal, LW * 1.1); ctx.strokeStyle = pal.ink
    ctx.beginPath(); ctx.arc(CX, CY, rad, 0, TAU); ctx.stroke()
    // 6 hojas del obturador (triangulos que rotan hacia el centro al cerrar)
    const blades = 6, hole = rad * (1 - 0.78 * k)
    ctx.save(); ctx.beginPath(); ctx.arc(CX, CY, rad - 1, 0, TAU); ctx.clip()
    for (let i = 0; i < blades; i++) {
      const a0 = i / blades * TAU, a1 = (i + 1) / blades * TAU
      ctx.fillStyle = rgba(pal.ink, (i % 2 ? 0.16 : 0.26))
      ctx.beginPath()
      ctx.moveTo(CX + Math.cos(a0) * hole, CY + Math.sin(a0) * hole)
      ctx.lineTo(CX + Math.cos(a0) * rad, CY + Math.sin(a0) * rad)
      ctx.lineTo(CX + Math.cos(a1) * rad, CY + Math.sin(a1) * rad)
      ctx.closePath(); ctx.fill()
    }
    ctx.restore()
    // ojo central de acento cuando abierto
    const open = 1 - k
    if (open > 0.05) { ctx.save(); ctx.globalAlpha = open; ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.arc(CX, CY, hole * 0.55, 0, TAU); ctx.fill(); ctx.restore() }
  },
})

// =============================================================================
// WAVEFORM — ecualizador / audio
// =============================================================================
register({
  id: 'anim.media.equalizer', lib: 'anim', category: 'media', tones: ['dark', 'light'],
  rubros: ['*'], weight: 1, tags: ['audio', 'ecualizador', 'sonido', 'musica', 'barras'],
  register: 'playful', intensity: 'bold', concept: 'waveform', describe: 'Barras de ecualizador que ondulan al ritmo, la central en acento.',
  render(ctx, t, env) {
    const { pal } = env, per = 2.4, n = 7, bw = R * 0.26, gap = R * 0.16
    const totW = n * bw + (n - 1) * gap, x0 = CX - totW / 2, baseY = CY + R * 1.0, maxH = R * 1.9
    const mid = (n - 1) / 2
    for (let i = 0; i < n; i++) {
      // onda continua: cada barra con su fase -> seamless (depende solo de seno de loop)
      const ph = i * 0.55
      const a = 0.5 + 0.5 * Math.sin(loop(t, per) * TAU - ph)
      const fall = 1 - 0.12 * Math.abs(i - mid)           // perfil de campana (centro mas alto)
      const h = maxH * (0.18 + 0.82 * a) * fall
      const x = x0 + i * (bw + gap)
      const isMid = i === Math.round(mid)
      ctx.fillStyle = isMid ? pal.accent : rgba(pal.ink, pal.tone === 'light' ? 0.82 : 0.9)
      rr(ctx, x, baseY - h, bw, h, bw * 0.5); ctx.fill()
    }
    // linea base sutil
    ink(ctx, pal); ctx.strokeStyle = rgba(pal.ink, 0.25); ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(x0 - R * 0.15, baseY); ctx.lineTo(x0 + totW + R * 0.15, baseY); ctx.stroke()
  },
})

// =============================================================================
// IMAGE — pila de fotos que se abanica
// =============================================================================
register({
  id: 'anim.media.photo-fan', lib: 'anim', category: 'media', tones: ['dark', 'light'],
  rubros: ['default', 'moda', 'belleza', 'eventos', 'inmobiliaria', 'gastronomia'], weight: 1, tags: ['fotos', 'imagen', 'galeria', 'pila', 'abanico'],
  register: 'friendly', intensity: 'soft', concept: 'image', describe: 'Una pila de fotos se abre en abanico; la de adelante se pinta de acento.',
  render(ctx, t, env) {
    const { pal } = env, per = 3.0, p = loop(t, per)
    const cw = R * 1.3, ch = R * 1.0
    // abanico 0..1..0 (abre y cierra suave)
    const open = 0.5 - 0.5 * Math.cos(loop(t, per) * TAU)
    const fan = eInOutCubic(open)
    const cards = 3
    for (let i = cards - 1; i >= 0; i--) {
      const k = cards === 1 ? 0 : i / (cards - 1)          // 0 atras .. 1 adelante (dibuja atras primero)
      const idx = cards - 1 - i                            // 0 = mas atras
      const ang = lerp(0, (idx - 1) * 0.42, fan)
      const dx = lerp(0, (idx - 1) * R * 0.55, fan)
      const dy = -idx * R * 0.04
      ctx.save(); ctx.translate(CX + dx, CY + dy); ctx.rotate(ang)
      const front = idx === cards - 1
      ctx.fillStyle = front ? pal.accent : (pal.tone === 'light' ? '#ffffff' : '#f3f2ee')
      ctx.strokeStyle = pal.ink; ctx.lineWidth = LW; ctx.lineJoin = 'round'
      rr(ctx, -cw / 2, -ch / 2, cw, ch, R * 0.12); ctx.fill(); ctx.stroke()
      // mini "paisaje" dentro (montana + sol) en tinta o sobre-acento
      const fg = front ? (pal.onAccent || '#fff') : pal.ink
      ctx.save(); rr(ctx, -cw / 2, -ch / 2, cw, ch, R * 0.12); ctx.clip()
      ctx.fillStyle = rgba(front ? (pal.onAccent || '#000') : pal.ink, 0.85)
      ctx.beginPath(); ctx.moveTo(-cw / 2, ch / 2); ctx.lineTo(-cw * 0.1, -ch * 0.08); ctx.lineTo(cw * 0.16, ch * 0.18); ctx.lineTo(cw * 0.5, -ch * 0.18); ctx.lineTo(cw / 2, ch / 2); ctx.closePath(); ctx.fill()
      ctx.fillStyle = rgba(fg, 0.9); ctx.beginPath(); ctx.arc(cw * 0.24, -ch * 0.22, R * 0.13, 0, TAU); ctx.fill()
      ctx.restore()
      ctx.restore()
    }
  },
})

// =============================================================================
// MIC — microfono + ondas
// =============================================================================
register({
  id: 'anim.media.mic-waves', lib: 'anim', category: 'media', tones: ['dark', 'light'],
  rubros: ['*'], weight: 0.95, tags: ['microfono', 'voz', 'podcast', 'grabar', 'audio'],
  register: 'friendly', intensity: 'medium', concept: 'mic', describe: 'Un microfono con arcos de sonido que salen y se desvanecen.',
  render(ctx, t, env) {
    const { pal } = env, per = 2.6
    // arcos de sonido a la derecha (3 ondas en bucle, fase desfasada)
    const cx = CX - R * 0.15, cy = CY - R * 0.1
    for (let i = 0; i < 3; i++) {
      const w = loop(t, per, i / 3 * per)
      const al = (1 - w) * 0.85
      if (al <= 0.02) continue
      ctx.save(); ctx.globalAlpha = al; ctx.strokeStyle = pal.accent; ctx.lineWidth = 2.4; ctx.lineCap = 'round'
      const rr2 = R * (0.55 + w * 0.95)
      ctx.beginPath(); ctx.arc(cx + R * 0.55, cy - R * 0.2, rr2, -0.5, 0.5); ctx.stroke(); ctx.restore()
    }
    // cuerpo del micro (capsula)
    ink(ctx, pal, LW * 1.1); ctx.strokeStyle = pal.ink
    const mw = R * 0.62, mh = R * 1.1, mx = cx - mw / 2, my = cy - mh * 0.62
    rr(ctx, mx, my, mw, mh, mw / 2); ctx.stroke()
    // rejilla
    ctx.strokeStyle = rgba(pal.ink, 0.45); ctx.lineWidth = 1.6
    for (let g = 1; g <= 2; g++) { const yy = my + mh * (g / 3); ctx.beginPath(); ctx.moveTo(mx + 2, yy); ctx.lineTo(mx + mw - 2, yy); ctx.stroke() }
    // soporte en U + pie
    ctx.strokeStyle = pal.ink; ctx.lineWidth = LW * 1.1
    ctx.beginPath(); ctx.arc(cx, my + mh * 0.5, mw * 0.95, 0.25 * Math.PI, 0.75 * Math.PI); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(cx, my + mh * 0.5 + mw * 0.95); ctx.lineTo(cx, cy + R * 1.05); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(cx - R * 0.4, cy + R * 1.05); ctx.lineTo(cx + R * 0.4, cy + R * 1.05); ctx.stroke()
  },
})

// =============================================================================
// VOLUME — volumen / ondas que crecen
// =============================================================================
register({
  id: 'anim.media.volume', lib: 'anim', category: 'media', tones: ['dark', 'light'],
  rubros: ['*'], weight: 0.9, tags: ['volumen', 'sonido', 'altavoz', 'audio'],
  register: 'neutral', intensity: 'soft', concept: 'volume', describe: 'Un altavoz cuyas ondas de volumen crecen y decrecen en bucle.',
  render(ctx, t, env) {
    const { pal } = env, per = 2.6
    // nivel 0..1..0 -> cuantas ondas estan activas (la 1ra nunca se apaga del todo)
    const lvl = 0.5 - 0.5 * Math.cos(loop(t, per) * TAU)
    const sx = CX - R * 0.7, sy = CY
    // cono del altavoz (tinta, agrandado y centrado a la pieza)
    ink(ctx, pal, LW * 1.1); ctx.strokeStyle = pal.ink; ctx.fillStyle = pal.ink
    ctx.beginPath()
    ctx.moveTo(sx - R * 0.6, sy - R * 0.42); ctx.lineTo(sx - R * 0.22, sy - R * 0.42); ctx.lineTo(sx + R * 0.24, sy - R * 0.78); ctx.lineTo(sx + R * 0.24, sy + R * 0.78); ctx.lineTo(sx - R * 0.22, sy + R * 0.42); ctx.lineTo(sx - R * 0.6, sy + R * 0.42); ctx.closePath()
    ctx.fill()
    // ondas de volumen (3 arcos), se encienden segun nivel; la 1ra mantiene un piso visible (sin blank/seam)
    for (let i = 0; i < 3; i++) {
      const thr = i / 3
      const base = i === 0 ? 0.4 : 0
      const on = clamp((lvl - thr) / 0.34 + base, 0, 1)
      if (on <= 0.02) continue
      ctx.save(); ctx.globalAlpha = on; ctx.strokeStyle = pal.accent; ctx.lineWidth = 2.8; ctx.lineCap = 'round'
      const rr2 = R * (0.55 + i * 0.45) * (0.85 + 0.15 * on)
      ctx.beginPath(); ctx.arc(sx + R * 0.26, sy, rr2, -0.62, 0.62); ctx.stroke(); ctx.restore()
    }
  },
})

// =============================================================================
// BROADCAST — antena que emite
// =============================================================================
register({
  id: 'anim.media.broadcast', lib: 'anim', category: 'media', tones: ['dark', 'light'],
  rubros: ['tech', 'default', 'eventos', 'educacion'], weight: 0.9, tags: ['broadcast', 'antena', 'señal', 'emitir', 'vivo'],
  register: 'corporate', intensity: 'medium', concept: 'broadcast', describe: 'Una antena emite arcos de señal que se expanden hacia arriba.',
  render(ctx, t, env) {
    const { pal } = env, per = 2.4
    const bx = CX, by = CY + R * 1.05
    // ondas concentricas que suben desde la cima
    const top = CY - R * 0.9
    for (let i = 0; i < 3; i++) {
      const w = loop(t, per, i / 3 * per)
      const al = (1 - w) * 0.8
      if (al <= 0.02) continue
      ctx.save(); ctx.globalAlpha = al; ctx.strokeStyle = pal.accent; ctx.lineWidth = 2.6; ctx.lineCap = 'round'
      const rr2 = R * (0.3 + w * 1.0)
      ctx.beginPath(); ctx.arc(bx, top, rr2, -0.85 * Math.PI, -0.15 * Math.PI); ctx.stroke()
      ctx.restore()
    }
    // mastil de la antena (triangulo/torre)
    ink(ctx, pal, LW * 1.1); ctx.strokeStyle = pal.ink
    ctx.beginPath(); ctx.moveTo(bx - R * 0.5, by); ctx.lineTo(bx, top); ctx.lineTo(bx + R * 0.5, by); ctx.stroke()
    // travesanos
    ctx.strokeStyle = rgba(pal.ink, 0.55); ctx.lineWidth = 2
    for (let g = 1; g <= 3; g++) { const k = g / 4; const yy = lerp(by, top, k), hw = lerp(R * 0.5, 0, k); ctx.beginPath(); ctx.moveTo(bx - hw, yy); ctx.lineTo(bx + hw, yy); ctx.stroke() }
    // punto emisor en la cima
    spark(ctx, pal, bx, top, R * 0.12, 0.7 + 0.3 * pulse(t, per))
  },
})

// =============================================================================
// REEL — carrete que gira
// =============================================================================
register({
  id: 'anim.media.reel', lib: 'anim', category: 'media', tones: ['dark', 'light'],
  rubros: ['*'], weight: 0.95, tags: ['reel', 'carrete', 'video', 'pelicula', 'rebobinar'],
  register: 'editorial', intensity: 'soft', concept: 'reel', describe: 'Un carrete de pelicula gira en bucle, con un radio en acento.',
  render(ctx, t, env) {
    const { pal } = env, per = 3.0
    const rot = loop(t, per) * TAU                          // giro continuo -> seamless en t=per
    const rad = R * 1.0
    ink(ctx, pal, LW * 1.1); ctx.strokeStyle = pal.ink
    // aro exterior + cubo central
    ctx.beginPath(); ctx.arc(CX, CY, rad, 0, TAU); ctx.stroke()
    ctx.beginPath(); ctx.arc(CX, CY, rad * 0.2, 0, TAU); ctx.fillStyle = pal.ink; ctx.fill()
    // 5 agujeros del carrete (giran)
    const holes = 5
    for (let i = 0; i < holes; i++) {
      const a = rot + i / holes * TAU
      const hx = CX + Math.cos(a) * rad * 0.6, hy = CY + Math.sin(a) * rad * 0.6
      ctx.fillStyle = (i === 0) ? pal.accent : 'transparent'
      ctx.strokeStyle = (i === 0) ? pal.accent : pal.ink; ctx.lineWidth = LW * 0.9
      ctx.beginPath(); ctx.arc(hx, hy, rad * 0.17, 0, TAU)
      if (i === 0) ctx.fill(); ctx.stroke()
      // radio al cubo
      ctx.save(); ctx.strokeStyle = rgba(pal.ink, 0.4); ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(CX + Math.cos(a) * rad * 0.24, CY + Math.sin(a) * rad * 0.24); ctx.lineTo(CX + Math.cos(a) * rad * 0.4, CY + Math.sin(a) * rad * 0.4); ctx.stroke(); ctx.restore()
    }
  },
})

// =============================================================================
// GALLERY — grilla de imagenes escalonada
// =============================================================================
register({
  id: 'anim.media.gallery', lib: 'anim', category: 'media', tones: ['dark', 'light'],
  rubros: ['default', 'moda', 'belleza', 'eventos', 'inmobiliaria', 'gastronomia'], weight: 0.95, tags: ['galeria', 'grilla', 'fotos', 'portfolio', 'mosaico'],
  register: 'editorial', intensity: 'soft', concept: 'gallery', describe: 'Una grilla 2x2 de imagenes que entran escalonadas, una en acento.',
  render(ctx, t, env) {
    const { pal } = env, per = 3.2, p = loop(t, per)
    const g = R * 1.7, cell = (g - R * 0.18) / 2, x0 = CX - g / 2, y0 = CY - g / 2
    const order = [0, 1, 3, 2]                               // diagonal -> sensacion de cascada
    for (let i = 0; i < 4; i++) {
      const col = i % 2, row = (i / 2) | 0
      const oi = order.indexOf(i)
      // entra (scale+fade) escalonado y SALE al final del loop con el mismo escalonado -> seamless
      const inK = spring(clamp(inv(p, 0.0 + oi * 0.07, 0.32 + oi * 0.07), 0, 1), { zeta: 0.6, freq: 1.8 })
      const outK = clamp(inv(p, 0.8 + oi * 0.035, 0.97 + oi * 0.035), 0, 1)
      const k = inK * (1 - outK)
      if (k <= 0.01) continue
      const cx = x0 + col * (cell + R * 0.18) + cell / 2
      const cy = y0 + row * (cell + R * 0.18) + cell / 2
      ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k); ctx.globalAlpha = clamp(k, 0, 1)
      const hot = i === 1                                    // celda destacada
      ctx.fillStyle = hot ? pal.accent : (pal.tone === 'light' ? '#ffffff' : '#f3f2ee')
      ctx.strokeStyle = pal.ink; ctx.lineWidth = LW; ctx.lineJoin = 'round'
      rr(ctx, -cell / 2, -cell / 2, cell, cell, R * 0.1); ctx.fill(); ctx.stroke()
      // glifo de imagen (montaña + sol) dentro
      ctx.save(); rr(ctx, -cell / 2, -cell / 2, cell, cell, R * 0.1); ctx.clip()
      const fg = hot ? (pal.onAccent || '#fff') : pal.ink
      ctx.fillStyle = rgba(fg, 0.85)
      ctx.beginPath(); ctx.moveTo(-cell / 2, cell / 2); ctx.lineTo(-cell * 0.08, 0); ctx.lineTo(cell * 0.14, cell * 0.2); ctx.lineTo(cell / 2, -cell * 0.12); ctx.lineTo(cell / 2, cell / 2); ctx.closePath(); ctx.fill()
      ctx.beginPath(); ctx.arc(cell * 0.22, -cell * 0.2, cell * 0.12, 0, TAU); ctx.fill()
      ctx.restore()
      ctx.restore()
    }
  },
})
