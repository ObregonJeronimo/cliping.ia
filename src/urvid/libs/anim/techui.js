// urvid 1.0 · ANIM · familia TECH / UI — micro-animaciones vectoriales line-art (engranajes, sync de nube, wifi,
// codigo, spinner, base de datos, enchufe, terminal, api, escudo). PURAS + DETERMINISTAS (solo `t`; cero
// Math.random/Date.now). Color SIEMPRE de env.pal (ink/accent/onAccent + rgba(ink,a)); el knob/papel blanco segun
// pal.tone (unica excepcion). Centradas en CX,CY a un radio ~R. LOOPEAN suave (loop(t, per)) sin costura.
import { register } from '../../core/registry.js'
import { W, H, TAU, rgba, clamp, inv, lerp, eOutCubic, eInOutCubic, eOutBack, spring } from '../../core/util.js'
import { CX, CY, R, LW, loop, pulse, ink, spark, rr, starShape, polyShape } from './_shared.js'

// helper local: dibuja UN engranaje (corona dentada + cubo) centrado en (cx,cy), radio rad, n dientes, rotacion ang.
function gear(ctx, cx, cy, rad, teeth, ang, pal, w = LW) {
  const inner = rad * 0.72, tip = rad, hub = rad * 0.32
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang)
  ink(ctx, pal, w); ctx.strokeStyle = pal.ink
  ctx.beginPath()
  const steps = teeth * 2
  for (let i = 0; i <= steps; i++) {
    const a = i / steps * TAU
    // dentado: alterna entre tip y inner suavizando el flanco (forma de diente trapezoidal redondeada)
    const edge = (i % 2) ? inner : tip
    const px = Math.cos(a) * edge, py = Math.sin(a) * edge
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)
  }
  ctx.closePath(); ctx.stroke()
  // cubo central
  ctx.beginPath(); ctx.arc(0, 0, hub, 0, TAU); ctx.stroke()
  ctx.restore()
}

// =============================================================================
// GEAR — engranajes / configuracion / automatizacion
// =============================================================================
register({
  id: 'anim.techui.gear', lib: 'anim', category: 'techui', tones: ['dark', 'light'],
  rubros: ['tech', 'default', 'servicios'], weight: 1, tags: ['engranaje', 'configuracion', 'ajustes', 'automatizacion', 'mecanismo'],
  register: 'corporate', intensity: 'soft', concept: 'gear', describe: 'Dos engranajes que engranan y giran en sentidos opuestos.',
  render(ctx, t, env) {
    const { pal } = env, per = 3.0, ph = loop(t, per) * TAU
    const r1 = R * 0.72, r2 = R * 0.5
    // posiciones: el grande arriba-izq, el chico abajo-der, tangentes en los dientes
    const c1x = CX - R * 0.5, c1y = CY - R * 0.36
    const c2x = CX + R * 0.55, c2y = CY + R * 0.5
    // engranan: si uno gira +, el otro gira - a velocidad proporcional al radio inverso
    const speed = 1.0
    const a1 = ph * speed
    const a2 = -ph * speed * (r1 / r2) + Math.PI / 12   // offset para que los dientes calcen
    gear(ctx, c1x, c1y, r1, 9, a1, pal, LW)
    gear(ctx, c2x, c2y, r2, 7, a2, pal, LW * 0.92)
    // chispa de acento en el punto de engrane (late suave)
    const mx = (c1x + c2x) / 2 + (c1x - c2x) * 0.06, my = (c1y + c2y) / 2 + (c1y - c2y) * 0.06
    spark(ctx, pal, mx, my, R * 0.075, 0.55 + 0.45 * pulse(t, 1.5))
  },
})

// =============================================================================
// CLOUD-SYNC — nube / respaldo / sincronizacion
// =============================================================================
register({
  id: 'anim.techui.cloud-sync', lib: 'anim', category: 'techui', tones: ['dark', 'light'],
  rubros: ['tech', 'default', 'servicios', 'educacion'], weight: 1, tags: ['nube', 'sincronizar', 'respaldo', 'backup', 'sync'],
  register: 'corporate', intensity: 'soft', concept: 'cloud', describe: 'Una nube con dos flechas circulares de sincronizacion que giran.',
  render(ctx, t, env) {
    const { pal } = env, per = 2.8, p = loop(t, per)
    // nube (contorno line-art limpio): base recta + tres lobulos circulares tangentes
    const cy = CY - R * 0.55
    const baseY = cy + R * 0.5, baseL = CX - R * 1.0, baseR = CX + R * 1.05
    ink(ctx, pal, LW); ctx.strokeStyle = pal.ink
    ctx.beginPath()
    ctx.moveTo(baseL, baseY)
    // lobulo izquierdo (chico)
    ctx.arc(CX - R * 0.62, baseY - R * 0.04, R * 0.42, Math.PI * 0.9, Math.PI * 1.5)
    // lobulo central (grande)
    ctx.arc(CX - R * 0.02, cy - R * 0.06, R * 0.6, Math.PI * 1.18, Math.PI * 1.92)
    // lobulo derecho (mediano)
    ctx.arc(CX + R * 0.62, baseY - R * 0.18, R * 0.48, Math.PI * 1.6, Math.PI * 0.5)
    ctx.lineTo(baseL, baseY)
    ctx.closePath(); ctx.stroke()
    // dos flechas circulares de sync (giran juntas) centradas DENTRO de la nube, en acento
    const scx = CX, scy = cy + R * 0.02, rad = R * 0.52, rot = p * TAU
    ctx.save(); ctx.strokeStyle = pal.accent; ctx.lineWidth = LW * 1.0; ctx.lineCap = 'round'
    for (let k = 0; k < 2; k++) {
      const base = rot + k * Math.PI
      const a0 = base + 0.42, a1 = base + Math.PI * 0.82
      ctx.beginPath(); ctx.arc(scx, scy, rad, a0, a1); ctx.stroke()
      // cabeza de flecha tangente al final del arco (apunta en sentido de giro)
      const ax = scx + Math.cos(a1) * rad, ay = scy + Math.sin(a1) * rad
      const tang = a1 + Math.PI / 2
      ctx.save(); ctx.translate(ax, ay); ctx.rotate(tang); ctx.fillStyle = pal.accent
      ctx.beginPath(); ctx.moveTo(R * 0.02, 0); ctx.lineTo(-R * 0.2, -R * 0.13); ctx.lineTo(-R * 0.2, R * 0.13); ctx.closePath(); ctx.fill()
      ctx.restore()
    }
    ctx.restore()
  },
})

// =============================================================================
// WIFI — señal / conexion / cobertura
// =============================================================================
register({
  id: 'anim.techui.wifi', lib: 'anim', category: 'techui', tones: ['dark', 'light'],
  rubros: ['tech', 'default', 'servicios', 'hoteleria'], weight: 0.95, tags: ['wifi', 'señal', 'conexion', 'cobertura', 'internet'],
  register: 'neutral', intensity: 'soft', concept: 'wifi', describe: 'Arcos de wifi que pulsan emanando del punto de adentro hacia afuera.',
  render(ctx, t, env) {
    const { pal } = env, per = 2.4, p = loop(t, per)
    const ox = CX, oy = CY + R * 0.95   // origen (el punto), abajo-centro
    const arcs = 3, gap = R * 0.62
    ctx.lineCap = 'round'
    for (let i = 0; i < arcs; i++) {
      // onda que viaja: cada arco "enciende" en acento cuando el pulso lo cruza
      const wave = clamp(inv((p - i * 0.18 + 1) % 1, 0, 0.32), 0, 1) * (1 - clamp(inv((p - i * 0.18 + 1) % 1, 0.32, 0.6), 0, 1))
      const rad = gap * (i + 1)
      ctx.lineWidth = LW * 1.15
      ctx.strokeStyle = wave > 0.04 ? pal.accent : rgba(pal.ink, 0.32)
      ctx.globalAlpha = wave > 0.04 ? 0.45 + 0.55 * wave : 1
      ctx.beginPath(); ctx.arc(ox, oy, rad, Math.PI * 1.25, Math.PI * 1.75); ctx.stroke()
      ctx.globalAlpha = 1
    }
    // el punto base (siempre en acento, late suave)
    const b = 0.8 + 0.3 * pulse(t, per / 2)
    spark(ctx, pal, ox, oy, R * 0.14 * b, 1)
  },
})

// =============================================================================
// CODE — programar / desarrollo / web
// =============================================================================
register({
  id: 'anim.techui.code', lib: 'anim', category: 'techui', tones: ['dark', 'light'],
  rubros: ['tech', 'default', 'educacion', 'servicios'], weight: 1, tags: ['codigo', 'programar', 'desarrollo', 'web', 'software'],
  register: 'editorial', intensity: 'soft', concept: 'code', describe: 'Corchetes angulares </> con un cursor que parpadea entre ellos.',
  render(ctx, t, env) {
    const { pal } = env, per = 2.6, p = loop(t, per)
    const reach = clamp(inv(p, 0.0, 0.4), 0, 1)   // los corchetes se "abren" al entrar
    const open = eOutBack(reach)
    const aw = R * 0.62 * open, ah = R * 0.62
    ink(ctx, pal, LW * 1.15); ctx.strokeStyle = pal.ink
    // corchete izquierdo <
    const lx = CX - R * 0.78
    ctx.beginPath(); ctx.moveTo(lx + aw, CY - ah); ctx.lineTo(lx, CY); ctx.lineTo(lx + aw, CY + ah); ctx.stroke()
    // corchete derecho >
    const rx = CX + R * 0.78
    ctx.beginPath(); ctx.moveTo(rx - aw, CY - ah); ctx.lineTo(rx, CY); ctx.lineTo(rx - aw, CY + ah); ctx.stroke()
    // slash central (en acento)
    ctx.strokeStyle = pal.accent; ctx.lineWidth = LW * 1.1
    ctx.beginPath(); ctx.moveTo(CX + R * 0.16, CY - ah * 0.78); ctx.lineTo(CX - R * 0.16, CY + ah * 0.78); ctx.stroke()
    // cursor que parpadea (caret), aparece tras abrir
    if (reach > 0.95) {
      const blink = pulse(t, 0.9) > 0.5 ? 1 : 0.12
      ctx.save(); ctx.globalAlpha = blink; ctx.strokeStyle = pal.accent; ctx.lineWidth = LW * 0.9
      ctx.beginPath(); ctx.moveTo(CX + R * 0.42, CY - ah * 0.5); ctx.lineTo(CX + R * 0.42, CY + ah * 0.5); ctx.stroke(); ctx.restore()
    }
  },
})

// =============================================================================
// LOADING — cargar / procesar / esperar
// =============================================================================
register({
  id: 'anim.techui.loading', lib: 'anim', category: 'techui', tones: ['dark', 'light'],
  rubros: ['*'], weight: 0.95, tags: ['cargar', 'procesar', 'esperar', 'spinner', 'progreso'],
  register: 'neutral', intensity: 'soft', concept: 'loading', describe: 'Un spinner circular: un arco de acento que gira fluido sobre un anillo tenue.',
  render(ctx, t, env) {
    const { pal } = env, per = 2.4, p = loop(t, per)
    // anillo de fondo tenue
    ctx.save(); ctx.lineCap = 'round'
    ctx.strokeStyle = rgba(pal.ink, 0.18); ctx.lineWidth = LW * 1.3
    ctx.beginPath(); ctx.arc(CX, CY, R, 0, TAU); ctx.stroke()
    // arco que gira: la longitud "respira" (estilo material) y el barrido avanza suave
    const rot = eInOutCubic(p) * TAU * 1   // un giro completo por periodo, ease suave (cierra sin salto: eInOutCubic(0)=0, (1)=1 -> mismo angulo TAU=0)
    const head = rot
    const len = (0.18 + 0.5 * (0.5 + 0.5 * Math.sin(p * TAU))) * TAU   // largo del arco oscila
    ctx.strokeStyle = pal.accent; ctx.lineWidth = LW * 1.3
    ctx.beginPath(); ctx.arc(CX, CY, R, head, head + len); ctx.stroke()
    // punto guia en la cabeza
    const hx = CX + Math.cos(head + len) * R, hy = CY + Math.sin(head + len) * R
    spark(ctx, pal, hx, hy, R * 0.085, 1)
    ctx.restore()
  },
})

// =============================================================================
// DATABASE — datos / almacenamiento / registros
// =============================================================================
register({
  id: 'anim.techui.database', lib: 'anim', category: 'techui', tones: ['dark', 'light'],
  rubros: ['tech', 'finanzas', 'default', 'servicios'], weight: 0.95, tags: ['base de datos', 'datos', 'almacenamiento', 'registros', 'servidor'],
  register: 'corporate', intensity: 'soft', concept: 'database', describe: 'Cilindros de base de datos apilados; un pulso de acento sube entre capas.',
  render(ctx, t, env) {
    const { pal } = env, per = 2.8, p = loop(t, per)
    const rw = R * 1.1, eh = R * 0.3   // radio x del cilindro, alto de la elipse
    const layers = 3, lh = R * 0.62    // separacion vertical entre tapas
    const topY = CY - R * 0.92
    ink(ctx, pal, LW); ctx.strokeStyle = pal.ink
    // dibuja de abajo hacia arriba para que las tapas tapen los costados
    for (let i = layers - 1; i >= 0; i--) {
      const y = topY + i * lh
      // laterales
      ctx.beginPath()
      ctx.moveTo(CX - rw, y); ctx.lineTo(CX - rw, y + lh)
      ctx.ellipse(CX, y + lh, rw, eh, 0, Math.PI, 0, true)
      ctx.lineTo(CX + rw, y); ctx.stroke()
      // tapa elipse
      ctx.beginPath(); ctx.ellipse(CX, y, rw, eh, 0, 0, TAU); ctx.stroke()
    }
    // pulso de acento: una capa se ilumina (rota por las capas con el tiempo)
    const litLayer = Math.floor(p * layers) % layers
    const glow = 1 - clamp(inv((p * layers) % 1, 0.55, 1), 0, 1)
    const ly = topY + litLayer * lh
    ctx.save(); ctx.globalAlpha = 0.85 * glow
    ctx.fillStyle = pal.accent
    ctx.beginPath(); ctx.ellipse(CX, ly, rw, eh, 0, 0, TAU); ctx.fill()
    ctx.restore()
  },
})

// =============================================================================
// PLUG — conectar / integrar / energia
// =============================================================================
register({
  id: 'anim.techui.plug', lib: 'anim', category: 'techui', tones: ['dark', 'light'],
  rubros: ['tech', 'default', 'servicios', 'energia'], weight: 0.95, tags: ['enchufe', 'conectar', 'integrar', 'energia', 'plugin'],
  register: 'friendly', intensity: 'medium', concept: 'plug', describe: 'Un enchufe se acerca al tomacorriente, se conecta y suelta un glow de acento.',
  render(ctx, t, env) {
    const { pal } = env, per = 2.8, p = loop(t, per)
    const y = CY
    // el enchufe (izq) se acerca al tomacorriente (der, fijo). join 0..1 = conectado.
    const join = eInOutCubic(clamp(inv(p, 0.12, 0.5), 0, 1)) * (1 - clamp(inv(p, 0.8, 1), 0, 1))
    const gap = lerp(R * 0.9, 0, join)
    ink(ctx, pal, LW); ctx.strokeStyle = pal.ink
    // --- tomacorriente (derecha): bloque redondeado grande con dos ranuras ---
    const sbW = R * 0.95, sbH = R * 1.7, sbX = CX + R * 0.42, sbY = y - sbH / 2
    rr(ctx, sbX, sbY, sbW, sbH, R * 0.22); ctx.stroke()
    // ranuras del tomacorriente (donde entran las patas)
    ctx.lineWidth = LW * 0.95
    for (const off of [-R * 0.42, R * 0.42]) {
      ctx.beginPath(); ctx.moveTo(sbX + R * 0.16, y + off); ctx.lineTo(sbX + R * 0.5, y + off); ctx.stroke()
    }
    // cable del tomacorriente (a la pared)
    ctx.lineWidth = LW
    ctx.beginPath(); ctx.moveTo(sbX + sbW, y); ctx.lineTo(sbX + sbW + R * 0.55, y); ctx.stroke()
    // --- enchufe (izquierda): cuerpo redondeado + dos patas + cable ---
    const pbW = R * 0.95, pbH = R * 1.4
    const pbX = CX - R * 0.42 - pbW - gap, pbY = y - pbH / 2
    rr(ctx, pbX, pbY, pbW, pbH, R * 0.2); ctx.stroke()
    // patas (prongs) que avanzan hacia las ranuras
    ctx.lineWidth = LW * 0.95
    const pinTip = pbX + pbW + gap + R * 0.18
    for (const off of [-R * 0.42, R * 0.42]) {
      ctx.beginPath(); ctx.moveTo(pbX + pbW, y + off); ctx.lineTo(pinTip, y + off); ctx.stroke()
    }
    // cable del enchufe
    ctx.lineWidth = LW
    ctx.beginPath(); ctx.moveTo(pbX, y); ctx.lineTo(pbX - R * 0.55, y); ctx.stroke()
    // glow + chispas al conectar
    if (join > 0.88) {
      const a = 1 - clamp(inv(p, 0.5, 0.78), 0, 1)
      spark(ctx, pal, sbX, y, R * 0.2, a)
      ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = pal.accent; ctx.lineWidth = LW * 0.8; ctx.lineCap = 'round'
      for (let k = 0; k < 5; k++) { const ang = -Math.PI / 2 + (k - 2) * (Math.PI / 4); const r0 = R * 0.34, r1 = R * 0.56; ctx.beginPath(); ctx.moveTo(sbX + Math.cos(ang) * r0, y + Math.sin(ang) * r0); ctx.lineTo(sbX + Math.cos(ang) * r1, y + Math.sin(ang) * r1); ctx.stroke() }
      ctx.restore()
    }
  },
})

// =============================================================================
// TERMINAL — consola / comando / script
// =============================================================================
register({
  id: 'anim.techui.terminal', lib: 'anim', category: 'techui', tones: ['dark', 'light'],
  rubros: ['tech', 'default', 'educacion'], weight: 0.95, tags: ['terminal', 'consola', 'comando', 'script', 'codigo'],
  register: 'editorial', intensity: 'soft', concept: 'terminal', describe: 'Una ventana de consola: un prompt escribe una linea y el cursor parpadea.',
  render(ctx, t, env) {
    const { pal } = env, per = 3.0, p = loop(t, per)
    const ww = R * 2.0, wh = R * 1.5, x = CX - ww / 2, y = CY - wh / 2
    // marco de la ventana
    ink(ctx, pal, LW); ctx.strokeStyle = pal.ink
    rr(ctx, x, y, ww, wh, R * 0.16); ctx.stroke()
    // barra de titulo + 3 botones
    const barY = y + wh * 0.22
    ctx.beginPath(); ctx.moveTo(x, barY); ctx.lineTo(x + ww, barY); ctx.stroke()
    for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(x + R * 0.22 + k * R * 0.24, y + wh * 0.11, R * 0.06, 0, TAU); ctx.fillStyle = k === 0 ? pal.accent : rgba(pal.ink, 0.5); ctx.fill() }
    // prompt ">" en acento
    const pyTop = barY + wh * 0.24
    ctx.strokeStyle = pal.accent; ctx.lineWidth = LW * 0.95
    ctx.beginPath(); ctx.moveTo(x + R * 0.24, pyTop - R * 0.1); ctx.lineTo(x + R * 0.42, pyTop); ctx.lineTo(x + R * 0.24, pyTop + R * 0.1); ctx.stroke()
    // linea que se "escribe": una barra de tinta que crece de izq a der
    const typed = eInOutCubic(clamp(inv(p, 0.1, 0.7), 0, 1))
    const lineX0 = x + R * 0.56, lineMax = ww - R * 0.9
    ctx.strokeStyle = rgba(pal.ink, 0.85); ctx.lineWidth = LW * 0.85
    ctx.beginPath(); ctx.moveTo(lineX0, pyTop); ctx.lineTo(lineX0 + lineMax * typed, pyTop); ctx.stroke()
    // cursor (bloque) al final del texto, parpadea cuando termina de escribir
    const cx = lineX0 + lineMax * typed + R * 0.12
    const blink = (typed > 0.98) ? (pulse(t, 0.8) > 0.5 ? 1 : 0.15) : 1
    ctx.save(); ctx.globalAlpha = blink; ctx.fillStyle = pal.accent
    rr(ctx, cx, pyTop - R * 0.13, R * 0.1, R * 0.26, 2); ctx.fill(); ctx.restore()
    // segunda linea (de salida) tenue, aparece tras escribir
    if (typed > 0.99) {
      ctx.strokeStyle = rgba(pal.ink, 0.4); ctx.lineWidth = LW * 0.8
      ctx.beginPath(); ctx.moveTo(x + R * 0.24, pyTop + wh * 0.28); ctx.lineTo(x + R * 0.24 + lineMax * 0.7, pyTop + wh * 0.28); ctx.stroke()
    }
  },
})

// =============================================================================
// API — intercambio / endpoints / integraciones
// =============================================================================
register({
  id: 'anim.techui.api', lib: 'anim', category: 'techui', tones: ['dark', 'light'],
  rubros: ['tech', 'default', 'servicios'], weight: 0.95, tags: ['api', 'intercambio', 'endpoint', 'integracion', 'datos'],
  register: 'corporate', intensity: 'medium', concept: 'api', describe: 'Dos bloques con paquetes de acento que van y vienen entre ellos.',
  render(ctx, t, env) {
    const { pal } = env, per = 2.8, p = loop(t, per)
    const bw = R * 0.82, bh = R * 1.15
    const lx = CX - R * 1.02, rx = CX + R * 1.02
    ink(ctx, pal, LW); ctx.strokeStyle = pal.ink
    // bloque izquierdo + lineas internas (representa endpoints)
    rr(ctx, lx - bw / 2, CY - bh / 2, bw, bh, R * 0.12); ctx.stroke()
    rr(ctx, rx - bw / 2, CY - bh / 2, bw, bh, R * 0.12); ctx.stroke()
    ctx.lineWidth = LW * 0.6; ctx.strokeStyle = rgba(pal.ink, 0.5)
    for (let k = 0; k < 2; k++) {
      const yy = CY - bh * 0.18 + k * bh * 0.36
      ctx.beginPath(); ctx.moveTo(lx - bw * 0.28, yy); ctx.lineTo(lx + bw * 0.28, yy); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(rx - bw * 0.28, yy); ctx.lineTo(rx + bw * 0.28, yy); ctx.stroke()
    }
    // dos canales: arriba (izq->der) y abajo (der->izq), paquetes de acento que cruzan
    const x0 = lx + bw / 2, x1 = rx - bw / 2
    const topY = CY - bh * 0.22, botY = CY + bh * 0.22
    ctx.save(); ctx.fillStyle = pal.accent
    // paquete ida (arriba)
    const goP = eInOutCubic(loop(t, per))
    const gx = lerp(x0, x1, goP)
    rr(ctx, gx - R * 0.14, topY - R * 0.11, R * 0.28, R * 0.22, 3); ctx.fill()
    // paquete vuelta (abajo), desfasado medio periodo
    const backP = eInOutCubic(loop(t, per, per / 2))
    const bx = lerp(x1, x0, backP)
    rr(ctx, bx - R * 0.14, botY - R * 0.11, R * 0.28, R * 0.22, 3); ctx.fill()
    ctx.restore()
    // guias tenues de los canales
    ctx.strokeStyle = rgba(pal.ink, 0.22); ctx.lineWidth = 1.5; ctx.setLineDash([3, 4])
    ctx.beginPath(); ctx.moveTo(x0, topY); ctx.lineTo(x1, topY); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(x0, botY); ctx.lineTo(x1, botY); ctx.stroke()
    ctx.setLineDash([])
  },
})

// =============================================================================
// SHIELD-SCAN — proteccion / antivirus / analisis de seguridad
// =============================================================================
register({
  id: 'anim.techui.shield-scan', lib: 'anim', category: 'techui', tones: ['dark', 'light'],
  rubros: ['tech', 'finanzas', 'salud', 'default'], weight: 0.95, tags: ['escudo', 'seguridad', 'antivirus', 'analisis', 'proteccion'],
  register: 'corporate', intensity: 'soft', concept: 'shield', describe: 'Un escudo con una linea de escaneo de acento que lo recorre de arriba a abajo.',
  render(ctx, t, env) {
    const { pal } = env, per = 2.8, p = loop(t, per)
    const sw = R * 1.3, sh = R * 1.9
    const topY = CY - sh * 0.5, botY = CY + sh * 0.5
    // forma del escudo (path reutilizable)
    function shieldPath() {
      ctx.beginPath()
      ctx.moveTo(CX, topY)
      ctx.lineTo(CX + sw / 2, topY + sh * 0.18)
      ctx.lineTo(CX + sw / 2, topY + sh * 0.5)
      ctx.quadraticCurveTo(CX + sw / 2, botY - sh * 0.06, CX, botY)
      ctx.quadraticCurveTo(CX - sw / 2, botY - sh * 0.06, CX - sw / 2, topY + sh * 0.5)
      ctx.lineTo(CX - sw / 2, topY + sh * 0.18)
      ctx.closePath()
    }
    ink(ctx, pal, LW); ctx.strokeStyle = pal.ink
    shieldPath(); ctx.stroke()
    // linea de escaneo: viaja de arriba a abajo y vuelve (ping-pong suave, sin salto en costura)
    const tri = 0.5 - 0.5 * Math.cos(p * TAU)   // 0->1->0 suave (cos), cierra perfecto
    const scanY = lerp(topY + sh * 0.08, botY - sh * 0.1, tri)
    ctx.save()
    shieldPath(); ctx.clip()
    // banda de acento (con leve degrade simulado por dos lineas)
    ctx.strokeStyle = pal.accent; ctx.lineWidth = LW * 1.1
    ctx.beginPath(); ctx.moveTo(CX - sw / 2, scanY); ctx.lineTo(CX + sw / 2, scanY); ctx.stroke()
    ctx.globalAlpha = 0.25; ctx.lineWidth = R * 0.34
    ctx.beginPath(); ctx.moveTo(CX - sw / 2, scanY); ctx.lineTo(CX + sw / 2, scanY); ctx.stroke()
    ctx.restore()
    // tilde de acento que aparece al terminar un barrido (centro)
    const okA = clamp(inv(tri, 0.85, 1), 0, 1)
    if (okA > 0) {
      ctx.save(); ctx.globalAlpha = okA; ctx.strokeStyle = pal.accent; ctx.lineWidth = LW * 1.2; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(CX - R * 0.26, CY + R * 0.05); ctx.lineTo(CX - R * 0.05, CY + R * 0.26); ctx.lineTo(CX + R * 0.32, CY - R * 0.22); ctx.stroke(); ctx.restore()
    }
  },
})
