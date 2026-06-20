// urvid 1.0 · ANIM · concepto UBICACION / VIAJE — micro-animaciones VECTORIALES line-art (como las 12 base de index.js:
// cart-tap/check-pop/.../network). render(ctx, t, env). PURAS + DETERMINISTAS (solo `t`; cero Math.random/Date.now).
// Line-art en TINTA (pal.ink) con el highlight de ACCION en ACENTO (pal.accent). LOOPEAN suave (periodo propio) sin
// costura. Centradas en CX,CY a un radio base R -> el motor las reubica/escala. NO importa nada de otros conceptos.
import { register } from '../../core/registry.js'
import { W, H, TAU, rgba, clamp, inv, lerp, eOutCubic, eInOutCubic, eOutBack, spring } from '../../core/util.js'
import { CX, CY, R, LW, loop, pulse, ink, spark, rr, starShape, polyShape } from './_shared.js'

// helper local: dibuja un pin de mapa (gota) centrado en (px,py) con radio rad. arma el path; despues fill/stroke.
function pinShape(ctx, px, py, rad) {
  ctx.beginPath()
  // cuerpo circular de arriba + punta abajo
  ctx.arc(px, py - rad, rad, Math.PI * 0.78, Math.PI * 0.22)
  ctx.lineTo(px, py + rad * 0.95)
  ctx.closePath()
}

// =============================================================================
// PIN — un pin de mapa cae y hace ripple
// =============================================================================
register({
  id: 'anim.location.pin', lib: 'anim', category: 'location', tones: ['dark', 'light'],
  rubros: ['inmobiliaria', 'gastronomia', 'turismo', 'default'], weight: 1, tags: ['ubicacion', 'pin', 'mapa', 'lugar', 'aqui'],
  register: 'friendly', intensity: 'medium', concept: 'pin', describe: 'Un pin de mapa cae, se asienta con rebote y dispara un ripple en acento.',
  render(ctx, t, env) {
    const { pal } = env, per = 2.6, p = loop(t, per)
    const restY = CY + R * 0.55, dr = R * 0.5
    // caida con rebote (eOutBack)
    const drop = eOutBack(clamp(inv(p, 0.05, 0.5), 0, 1))
    const py = lerp(restY - R * 1.8, restY, drop)
    const landed = drop > 0.96
    // sombra/base elipse que crece al aterrizar
    ctx.save(); ctx.fillStyle = rgba(pal.ink, 0.18)
    const sh = clamp(inv(p, 0.4, 0.55), 0, 1)
    ctx.beginPath(); ctx.ellipse(CX, restY + dr * 0.55, dr * (0.5 + 0.45 * sh), dr * 0.2, 0, 0, TAU); ctx.fill(); ctx.restore()
    // ripple al tocar (acento), expande y se desvanece
    const rip = clamp(inv(p, 0.46, 0.85), 0, 1)
    if (rip > 0 && rip < 1) {
      ctx.save(); ctx.globalAlpha = 0.8 * (1 - rip); ctx.strokeStyle = pal.accent; ctx.lineWidth = LW
      ctx.beginPath(); ctx.ellipse(CX, restY + dr * 0.55, dr * (0.5 + rip * 1.4), dr * (0.18 + rip * 0.5), 0, 0, TAU); ctx.stroke(); ctx.restore()
    }
    // pin (cae con leve squash al aterrizar)
    const squash = landed ? 1 - 0.08 * pulse(t, per, 1) * 0 : 1
    ctx.save(); ink(ctx, pal, LW * 1.1); ctx.strokeStyle = pal.ink
    pinShape(ctx, CX, py, dr); ctx.fillStyle = pal.accent; ctx.fill(); ctx.stroke()
    // ojo del pin (blanco/onAccent)
    ctx.fillStyle = pal.onAccent || pal.bg0
    ctx.beginPath(); ctx.arc(CX, py - dr, dr * 0.36, 0, TAU); ctx.fill()
    ctx.restore()
    void squash
  },
})

// =============================================================================
// ROUTE — ruta punteada con un punto que la recorre
// =============================================================================
register({
  id: 'anim.location.route', lib: 'anim', category: 'location', tones: ['dark', 'light'],
  rubros: ['logistica', 'turismo', 'inmobiliaria', 'default'], weight: 1, tags: ['ruta', 'camino', 'recorrido', 'viaje', 'mapa'],
  register: 'neutral', intensity: 'soft', concept: 'route', describe: 'Una ruta punteada de A a B con un punto de acento que la recorre.',
  render(ctx, t, env) {
    const { pal } = env, per = 3.0, p = loop(t, per)
    // puntos de control de la ruta (curva tipo S)
    const A = [CX - R * 1.35, CY + R * 1.0], B = [CX + R * 1.35, CY - R * 1.0]
    const C1 = [CX + R * 0.2, CY + R * 1.0], C2 = [CX - R * 0.2, CY - R * 1.0]
    const bez = (u) => {
      const m = 1 - u
      const x = m * m * m * A[0] + 3 * m * m * u * C1[0] + 3 * m * u * u * C2[0] + u * u * u * B[0]
      const y = m * m * m * A[1] + 3 * m * m * u * C1[1] + 3 * m * u * u * C2[1] + u * u * u * B[1]
      return [x, y]
    }
    // ruta punteada (tinta tenue)
    ctx.save(); ctx.strokeStyle = rgba(pal.ink, 0.4); ctx.lineWidth = LW * 0.9; ctx.lineCap = 'round'; ctx.setLineDash([2, 7])
    ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.bezierCurveTo(C1[0], C1[1], C2[0], C2[1], B[0], B[1]); ctx.stroke(); ctx.setLineDash([]); ctx.restore()
    // rastro de acento recorrido
    const prog = eInOutCubic(p)
    ctx.save(); ctx.strokeStyle = pal.accent; ctx.lineWidth = LW * 1.1; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(A[0], A[1])
    for (let u = 0; u <= prog; u += 0.04) { const q = bez(u); ctx.lineTo(q[0], q[1]) }
    ctx.stroke(); ctx.restore()
    // pin de inicio (A) en tinta
    ctx.save(); ink(ctx, pal, LW); ctx.strokeStyle = pal.ink
    pinShape(ctx, A[0], A[1] - R * 0.05, R * 0.3); ctx.fillStyle = pal.bg0; ctx.fill(); ctx.stroke()
    ctx.fillStyle = pal.ink; ctx.beginPath(); ctx.arc(A[0], A[1] - R * 0.35, R * 0.1, 0, TAU); ctx.fill(); ctx.restore()
    // pin de destino (B) — se "ilumina" en acento al llegar
    const arr = clamp(inv(prog, 0.92, 1), 0, 1)
    ctx.save(); ink(ctx, pal, LW); ctx.strokeStyle = pal.ink
    pinShape(ctx, B[0], B[1] - R * 0.05, R * 0.34); ctx.fillStyle = arr > 0.5 ? pal.accent : pal.bg0; ctx.fill(); ctx.stroke()
    ctx.fillStyle = arr > 0.5 ? (pal.onAccent || pal.bg0) : pal.ink; ctx.beginPath(); ctx.arc(B[0], B[1] - R * 0.39, R * 0.11, 0, TAU); ctx.fill(); ctx.restore()
    // punto viajero
    const trav = bez(prog)
    spark(ctx, pal, trav[0], trav[1], R * 0.12, 1)
  },
})

// =============================================================================
// COMPASS — brujula cuya aguja gira y se asienta al norte
// =============================================================================
register({
  id: 'anim.location.compass', lib: 'anim', category: 'location', tones: ['dark', 'light'],
  rubros: ['turismo', 'default', 'educacion', 'tech'], weight: 0.95, tags: ['brujula', 'norte', 'direccion', 'orientacion', 'rumbo'],
  register: 'corporate', intensity: 'soft', concept: 'compass', describe: 'Una brujula: la aguja gira y se asienta apuntando al norte con un spring.',
  render(ctx, t, env) {
    const { pal } = env, per = 3.0, p = loop(t, per)
    const rad = R * 1.15
    // anillo exterior
    ink(ctx, pal, LW * 1.1); ctx.strokeStyle = pal.ink
    ctx.beginPath(); ctx.arc(CX, CY, rad, 0, TAU); ctx.stroke()
    // ticks cardinales
    ctx.save(); ctx.strokeStyle = rgba(pal.ink, 0.55); ctx.lineWidth = LW * 0.7
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * TAU, big = i % 3 === 0, ri = big ? rad * 0.78 : rad * 0.88
      ctx.beginPath(); ctx.moveTo(CX + Math.cos(a) * ri, CY + Math.sin(a) * ri); ctx.lineTo(CX + Math.cos(a) * rad * 0.96, CY + Math.sin(a) * rad * 0.96); ctx.stroke()
    }
    ctx.restore()
    // aguja: gira 2 vueltas enteras y se asienta al norte (spring). 2 vueltas (no 1.5) -> sin salto en la costura.
    const settle = spring(eInOutCubic(p), { zeta: 0.42, freq: 2.2 })
    const ang = -Math.PI / 2 + (1 - settle) * TAU * 2   // converge a -PI/2 (norte/arriba)
    const nr = rad * 0.7
    ctx.save(); ctx.translate(CX, CY); ctx.rotate(ang + Math.PI / 2)
    // mitad norte (acento)
    ctx.fillStyle = pal.accent
    ctx.beginPath(); ctx.moveTo(0, -nr); ctx.lineTo(nr * 0.22, 0); ctx.lineTo(-nr * 0.22, 0); ctx.closePath(); ctx.fill()
    // mitad sur (tinta)
    ctx.fillStyle = rgba(pal.ink, 0.85)
    ctx.beginPath(); ctx.moveTo(0, nr); ctx.lineTo(nr * 0.22, 0); ctx.lineTo(-nr * 0.22, 0); ctx.closePath(); ctx.fill()
    ctx.restore()
    // pivote central
    ctx.fillStyle = pal.ink; ctx.beginPath(); ctx.arc(CX, CY, R * 0.11, 0, TAU); ctx.fill()
    ctx.fillStyle = pal.bg0; ctx.beginPath(); ctx.arc(CX, CY, R * 0.05, 0, TAU); ctx.fill()
  },
})

// =============================================================================
// GLOBE — globo con meridianos que rota
// =============================================================================
register({
  id: 'anim.location.globe', lib: 'anim', category: 'location', tones: ['dark', 'light'],
  rubros: ['tech', 'educacion', 'turismo', 'default'], weight: 0.95, tags: ['globo', 'mundo', 'global', 'planeta', 'internacional'],
  register: 'corporate', intensity: 'calm', concept: 'globe', describe: 'Un globo con meridianos y paralelos que rota suave; un pin orbita en acento.',
  render(ctx, t, env) {
    const { pal } = env, per = 3.2, p = loop(t, per), rot = p * TAU
    const rad = R * 1.2
    ink(ctx, pal, LW * 1.05); ctx.strokeStyle = pal.ink
    // contorno
    ctx.beginPath(); ctx.arc(CX, CY, rad, 0, TAU); ctx.stroke()
    ctx.save(); ctx.beginPath(); ctx.arc(CX, CY, rad, 0, TAU); ctx.clip()
    // paralelos (lineas horizontales fijas)
    ctx.strokeStyle = rgba(pal.ink, 0.4); ctx.lineWidth = LW * 0.7
    for (const fy of [-0.6, -0.25, 0.1, 0.45, 0.78]) {
      const yy = CY + fy * rad, hw = Math.sqrt(Math.max(0, 1 - fy * fy)) * rad
      ctx.beginPath(); ctx.moveTo(CX - hw, yy); ctx.lineTo(CX + hw, yy); ctx.stroke()
    }
    // meridianos (elipses cuyo ancho varia con la rotacion -> sensacion de giro)
    for (let i = 0; i < 4; i++) {
      const ph = rot + i / 4 * Math.PI
      const ew = Math.abs(Math.sin(ph)) * rad
      ctx.save(); ctx.globalAlpha = 0.35 + 0.4 * Math.abs(Math.sin(ph))
      ctx.beginPath(); ctx.ellipse(CX, CY, ew, rad, 0, 0, TAU); ctx.stroke(); ctx.restore()
    }
    ctx.restore()
    // pin que orbita la superficie (acento) — visible solo en el hemisferio frontal
    const op = rot
    const ox = Math.cos(op), depth = Math.sin(op)   // depth>0 = frente
    if (depth > -0.1) {
      const gx = CX + ox * rad * 0.86, gy = CY - 0.35 * rad
      const sc = 0.7 + 0.3 * clamp(depth, 0, 1)
      ctx.save(); ctx.translate(gx, gy); ctx.scale(sc, sc); ink(ctx, pal, LW); ctx.strokeStyle = pal.ink
      pinShape(ctx, 0, 0, R * 0.26); ctx.fillStyle = pal.accent; ctx.fill(); ctx.stroke()
      ctx.fillStyle = pal.onAccent || pal.bg0; ctx.beginPath(); ctx.arc(0, -R * 0.26, R * 0.1, 0, TAU); ctx.fill(); ctx.restore()
    }
  },
})

// =============================================================================
// MARKER — marcador que pulsa sobre un mini-mapa
// =============================================================================
register({
  id: 'anim.location.marker', lib: 'anim', category: 'location', tones: ['dark', 'light'],
  rubros: ['inmobiliaria', 'gastronomia', 'salud', 'default'], weight: 1, tags: ['marcador', 'mapa', 'punto', 'aqui', 'sucursal'],
  register: 'friendly', intensity: 'soft', concept: 'marker', describe: 'Un marcador late sobre un mini-mapa con calles, emitiendo ondas de acento.',
  render(ctx, t, env) {
    const { pal } = env, per = 2.4, p = loop(t, per)
    // marco del mini-mapa
    const mw = R * 2.6, mh = R * 2.2, mx = CX - mw / 2, my = CY - mh / 2 + R * 0.1
    ctx.save(); ctx.strokeStyle = rgba(pal.ink, 0.55); ctx.lineWidth = LW
    rr(ctx, mx, my, mw, mh, R * 0.18); ctx.stroke()
    // recortar al mapa para que las calles no se salgan
    rr(ctx, mx, my, mw, mh, R * 0.18); ctx.clip()
    ctx.strokeStyle = rgba(pal.ink, 0.32); ctx.lineWidth = LW * 0.7
    // calles verticales y horizontales
    for (const fx of [0.3, 0.62]) { ctx.beginPath(); ctx.moveTo(mx + mw * fx, my); ctx.lineTo(mx + mw * fx, my + mh); ctx.stroke() }
    for (const fy of [0.34, 0.7]) { ctx.beginPath(); ctx.moveTo(mx, my + mh * fy); ctx.lineTo(mx + mw, my + mh * fy); ctx.stroke() }
    // una calle diagonal
    ctx.beginPath(); ctx.moveTo(mx, my + mh * 0.85); ctx.lineTo(mx + mw * 0.55, my + mh * 0.2); ctx.stroke()
    ctx.restore()
    // punto del marcador (cruce centro-izquierda)
    const px = mx + mw * 0.62, py = my + mh * 0.34
    // ondas que pulsan
    const wv = loop(t, per)
    for (let k = 0; k < 2; k++) {
      const w = (wv + k * 0.5) % 1
      ctx.save(); ctx.globalAlpha = 0.6 * (1 - w); ctx.strokeStyle = pal.accent; ctx.lineWidth = LW * 0.9
      ctx.beginPath(); ctx.arc(px, py, R * 0.15 + w * R * 0.7, 0, TAU); ctx.stroke(); ctx.restore()
    }
    // pin marcador
    const bob = -R * 0.05 * pulse(t, per, 1)
    ctx.save(); ink(ctx, pal, LW); ctx.strokeStyle = pal.ink
    pinShape(ctx, px, py + bob, R * 0.34); ctx.fillStyle = pal.accent; ctx.fill(); ctx.stroke()
    ctx.fillStyle = pal.onAccent || pal.bg0; ctx.beginPath(); ctx.arc(px, py + bob - R * 0.34, R * 0.12, 0, TAU); ctx.fill(); ctx.restore()
  },
})

// =============================================================================
// RADAR — barrido de radar circular
// =============================================================================
register({
  id: 'anim.location.radar', lib: 'anim', category: 'location', tones: ['dark', 'light'],
  rubros: ['tech', 'logistica', 'seguridad', 'default'], weight: 0.95, tags: ['radar', 'barrido', 'detectar', 'cerca', 'rastreo'],
  register: 'corporate', intensity: 'medium', concept: 'radar', describe: 'Un radar circular: el haz barre y enciende un blip de acento al pasar.',
  render(ctx, t, env) {
    const { pal } = env, per = 2.8, p = loop(t, per)
    const rad = R * 1.25, sweep = p * TAU - Math.PI / 2
    // anillos concentricos
    ctx.save(); ctx.strokeStyle = rgba(pal.ink, 0.4); ctx.lineWidth = LW * 0.7
    for (const fr of [0.4, 0.7, 1]) { ctx.beginPath(); ctx.arc(CX, CY, rad * fr, 0, TAU); ctx.stroke() }
    // cruz
    ctx.beginPath(); ctx.moveTo(CX - rad, CY); ctx.lineTo(CX + rad, CY); ctx.moveTo(CX, CY - rad); ctx.lineTo(CX, CY + rad); ctx.stroke(); ctx.restore()
    // sector de barrido (gradiente de acento que se desvanece hacia atras)
    ctx.save(); ctx.beginPath(); ctx.arc(CX, CY, rad, 0, TAU); ctx.clip()
    const steps = 22, span = 0.9
    for (let i = 0; i < steps; i++) {
      const a0 = sweep - (i / steps) * span, a1 = sweep - ((i + 1) / steps) * span
      ctx.beginPath(); ctx.moveTo(CX, CY); ctx.arc(CX, CY, rad, a0, a1, true); ctx.closePath()
      ctx.globalAlpha = 0.28 * (1 - i / steps); ctx.fillStyle = pal.accent; ctx.fill()
    }
    ctx.restore()
    // linea del haz
    ink(ctx, pal, LW); ctx.strokeStyle = pal.accent
    ctx.beginPath(); ctx.moveTo(CX, CY); ctx.lineTo(CX + Math.cos(sweep) * rad, CY + Math.sin(sweep) * rad); ctx.stroke()
    // blip fijo que se enciende cuando el haz pasa por su angulo
    const bAng = -Math.PI / 2 + TAU * 0.62, bR = rad * 0.62
    const bx = CX + Math.cos(bAng) * bR, by = CY + Math.sin(bAng) * bR
    let da = ((sweep - bAng) % TAU + TAU) % TAU   // tiempo desde que el haz paso por el blip
    const glow = clamp(1 - da / (TAU * 0.5), 0, 1)
    if (glow > 0.02) spark(ctx, pal, bx, by, R * 0.12 * (0.6 + 0.4 * glow), glow)
    // centro
    ctx.fillStyle = pal.ink; ctx.beginPath(); ctx.arc(CX, CY, R * 0.07, 0, TAU); ctx.fill()
  },
})

// =============================================================================
// PLANE-ROUTE — avion sobre un arco punteado
// =============================================================================
register({
  id: 'anim.location.plane-route', lib: 'anim', category: 'location', tones: ['dark', 'light'],
  rubros: ['turismo', 'logistica', 'default', 'tech'], weight: 1, tags: ['avion', 'vuelo', 'viaje', 'ruta', 'destino'],
  register: 'friendly', intensity: 'medium', concept: 'plane', describe: 'Un avion recorre un arco punteado entre dos pins, dejando rastro de acento.',
  render(ctx, t, env) {
    const { pal } = env, per = 3.0, p = loop(t, per)
    const A = [CX - R * 1.35, CY + R * 0.6], B = [CX + R * 1.35, CY + R * 0.6]
    const peak = CY - R * 1.1
    // posicion en una parabola A->B (control en el pico)
    const arc = (u) => {
      const m = 1 - u
      const x = m * m * A[0] + 2 * m * u * CX + u * u * B[0]
      const y = m * m * A[1] + 2 * m * u * peak + u * u * B[1]
      return [x, y]
    }
    // arco punteado completo (tinta tenue)
    ctx.save(); ctx.strokeStyle = rgba(pal.ink, 0.38); ctx.lineWidth = LW * 0.9; ctx.lineCap = 'round'; ctx.setLineDash([2, 7])
    ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.quadraticCurveTo(CX, peak, B[0], B[1]); ctx.stroke(); ctx.setLineDash([]); ctx.restore()
    // rastro de acento hasta el avion
    const prog = eInOutCubic(p)
    ctx.save(); ctx.strokeStyle = pal.accent; ctx.lineWidth = LW; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(A[0], A[1])
    for (let u = 0; u <= prog; u += 0.04) { const q = arc(u); ctx.lineTo(q[0], q[1]) }
    ctx.stroke(); ctx.restore()
    // pins origen y destino
    for (const [pt, dest] of [[A, false], [B, true]]) {
      ctx.save(); ink(ctx, pal, LW); ctx.strokeStyle = pal.ink
      const lit = dest && prog > 0.95
      ctx.fillStyle = lit ? pal.accent : pal.bg0
      ctx.beginPath(); ctx.arc(pt[0], pt[1], R * 0.16, 0, TAU); ctx.fill(); ctx.stroke()
      ctx.fillStyle = lit ? (pal.onAccent || pal.bg0) : pal.ink; ctx.beginPath(); ctx.arc(pt[0], pt[1], R * 0.06, 0, TAU); ctx.fill(); ctx.restore()
    }
    // avion orientado segun la tangente
    const here = arc(prog), nxt = arc(Math.min(1, prog + 0.01))
    const ang = Math.atan2(nxt[1] - here[1], nxt[0] - here[0])
    ctx.save(); ctx.translate(here[0], here[1]); ctx.rotate(ang); ctx.fillStyle = pal.ink
    const s = R * 0.5
    ctx.beginPath()
    ctx.moveTo(s * 0.55, 0); ctx.lineTo(-s * 0.1, -s * 0.16); ctx.lineTo(-s * 0.1, -s * 0.5); ctx.lineTo(-s * 0.28, -s * 0.5)
    ctx.lineTo(-s * 0.34, -s * 0.12); ctx.lineTo(-s * 0.5, -s * 0.12); ctx.lineTo(-s * 0.5, s * 0.12)
    ctx.lineTo(-s * 0.34, s * 0.12); ctx.lineTo(-s * 0.28, s * 0.5); ctx.lineTo(-s * 0.1, s * 0.5); ctx.lineTo(-s * 0.1, s * 0.16); ctx.closePath()
    ctx.fill(); ctx.restore()
  },
})

// =============================================================================
// SIGNPOST — cartel con flechas de direccion
// =============================================================================
register({
  id: 'anim.location.signpost', lib: 'anim', category: 'location', tones: ['dark', 'light'],
  rubros: ['turismo', 'default', 'educacion', 'inmobiliaria'], weight: 0.9, tags: ['cartel', 'direccion', 'flechas', 'rumbo', 'senal'],
  register: 'neutral', intensity: 'soft', concept: 'signpost', describe: 'Un poste con flechas de direccion que entran escalonadas; una resalta en acento.',
  render(ctx, t, env) {
    const { pal } = env, per = 3.0, p = loop(t, per)
    const postX = CX - R * 0.15, topY = CY - R * 1.25, botY = CY + R * 1.35
    // poste (mas grueso para presencia constante)
    ink(ctx, pal, LW * 1.6); ctx.strokeStyle = pal.ink
    ctx.beginPath(); ctx.moveTo(postX, topY); ctx.lineTo(postX, botY); ctx.stroke()
    // base
    ctx.beginPath(); ctx.moveTo(postX - R * 0.35, botY); ctx.lineTo(postX + R * 0.35, botY); ctx.stroke()
    // 3 flechas (alturas distintas, direcciones alternas)
    const signs = [
      { y: topY + R * 0.5, dir: 1, w: R * 1.5, accent: false },
      { y: topY + R * 1.25, dir: -1, w: R * 1.7, accent: true },
      { y: topY + R * 2.0, dir: 1, w: R * 1.2, accent: false },
    ]
    // la 1ra flecha arranca ya entrando en t=0 -> el frame nunca queda solo el poste
    signs.forEach((sg, i) => {
      const a = spring(clamp(inv(p, i * 0.16, 0.42 + i * 0.16), 0, 1), { zeta: 0.55, freq: 2 })
      if (a <= 0.01) return
      const h = R * 0.55, tip = R * 0.34
      ctx.save()
      // ancla en el poste, escala desde ahi
      ctx.translate(postX, sg.y); ctx.scale(sg.dir, 1); ctx.scale(a, a)
      ctx.fillStyle = sg.accent ? pal.accent : rgba(pal.ink, 0.9)
      ctx.beginPath()
      ctx.moveTo(0, -h / 2); ctx.lineTo(sg.w - tip, -h / 2); ctx.lineTo(sg.w, 0); ctx.lineTo(sg.w - tip, h / 2); ctx.lineTo(0, h / 2); ctx.closePath(); ctx.fill()
      ctx.restore()
    })
    // tornillo central donde cuelgan
    ctx.fillStyle = pal.ink; ctx.beginPath(); ctx.arc(postX, topY + R * 0.5, R * 0.07, 0, TAU); ctx.fill()
  },
})

// =============================================================================
// DISTANCE — una regla/medida que se extiende
// =============================================================================
register({
  id: 'anim.location.distance', lib: 'anim', category: 'location', tones: ['dark', 'light'],
  rubros: ['logistica', 'inmobiliaria', 'tech', 'default'], weight: 0.9, tags: ['distancia', 'medida', 'regla', 'cerca', 'lejos'],
  register: 'corporate', intensity: 'soft', concept: 'distance', describe: 'Dos pins y una linea de medida que se extiende entre ellos con topes.',
  render(ctx, t, env) {
    const { pal } = env, per = 2.8, p = loop(t, per)
    const y = CY + R * 0.3, x0 = CX - R * 1.3, x1 = CX + R * 1.3
    // pin de origen (fijo)
    ctx.save(); ink(ctx, pal, LW); ctx.strokeStyle = pal.ink
    pinShape(ctx, x0, y - R * 0.7, R * 0.3); ctx.fillStyle = pal.bg0; ctx.fill(); ctx.stroke()
    ctx.fillStyle = pal.ink; ctx.beginPath(); ctx.arc(x0, y - R * 0.7 - R * 0.3, R * 0.1, 0, TAU); ctx.fill(); ctx.restore()
    // extension de la medida
    const ext = eInOutCubic(clamp(inv(p, 0.08, 0.7), 0, 1))
    const xe = lerp(x0, x1, ext)
    // linea de medida (acento) con topes verticales
    ctx.save(); ink(ctx, pal, LW); ctx.strokeStyle = pal.accent
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(xe, y); ctx.stroke()
    const cap = R * 0.22
    ctx.beginPath(); ctx.moveTo(x0, y - cap); ctx.lineTo(x0, y + cap); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(xe, y - cap); ctx.lineTo(xe, y + cap); ctx.stroke()
    // ticks de regla a lo largo de lo medido
    ctx.lineWidth = LW * 0.6; ctx.strokeStyle = rgba(pal.ink, 0.45)
    for (let k = 1; k < 6; k++) { const tx = lerp(x0, x1, k / 6); if (tx <= xe) { ctx.beginPath(); ctx.moveTo(tx, y - cap * 0.5); ctx.lineTo(tx, y + cap * 0.5); ctx.stroke() } }
    ctx.restore()
    // pin destino (aparece al final)
    const arr = clamp(inv(ext, 0.95, 1), 0, 1)
    if (ext > 0.5) {
      const ds = 0.7 + 0.3 * clamp(inv(ext, 0.85, 1), 0, 1)
      ctx.save(); ink(ctx, pal, LW); ctx.strokeStyle = pal.ink
      pinShape(ctx, x1, y - R * 0.7, R * 0.3 * ds); ctx.fillStyle = arr > 0.5 ? pal.accent : pal.bg0; ctx.fill(); ctx.stroke()
      ctx.fillStyle = arr > 0.5 ? (pal.onAccent || pal.bg0) : pal.ink; ctx.beginPath(); ctx.arc(x1, y - R * 0.7 - R * 0.3 * ds, R * 0.1 * ds, 0, TAU); ctx.fill(); ctx.restore()
    }
    if (arr > 0.5) spark(ctx, pal, (x0 + x1) / 2, y - cap - R * 0.2, R * 0.09, pulse(t, 1.4))
  },
})

// =============================================================================
// GPS-LOCK — corchetes de target que hacen "lock" sobre un punto
// =============================================================================
register({
  id: 'anim.location.gps-lock', lib: 'anim', category: 'location', tones: ['dark', 'light'],
  rubros: ['tech', 'logistica', 'seguridad', 'default'], weight: 0.95, tags: ['gps', 'localizar', 'target', 'fijar', 'precision'],
  register: 'corporate', intensity: 'medium', concept: 'target', describe: 'Cuatro corchetes de target convergen y hacen lock sobre un punto en acento.',
  render(ctx, t, env) {
    const { pal } = env, per = 2.6, p = loop(t, per)
    // los corchetes entran de afuera y se asientan (eOutBack), luego un pequeno pulso al cerrar
    const close = eOutBack(clamp(inv(p, 0.1, 0.6), 0, 1))
    const far = R * 1.7, near = R * 0.95
    const d = lerp(far, near, close)
    const len = R * 0.4
    const locked = close > 0.95
    ink(ctx, pal, LW * 1.2); ctx.strokeStyle = locked ? pal.accent : pal.ink
    // 4 corchetes en esquinas (signo segun cuadrante)
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const cx = CX + sx * d, cy = CY + sy * d
      ctx.beginPath()
      ctx.moveTo(cx, cy + sy * len); ctx.lineTo(cx, cy); ctx.lineTo(cx + sx * len, cy)
      ctx.stroke()
    }
    // cruz central tenue
    ctx.save(); ctx.strokeStyle = rgba(pal.ink, 0.35); ctx.lineWidth = LW * 0.7
    ctx.beginPath(); ctx.moveTo(CX - R * 0.25, CY); ctx.lineTo(CX + R * 0.25, CY); ctx.moveTo(CX, CY - R * 0.25); ctx.lineTo(CX, CY + R * 0.25); ctx.stroke(); ctx.restore()
    // punto objetivo: aparece/late al lockear
    const lockP = clamp(inv(p, 0.55, 0.75), 0, 1)
    if (lockP > 0) {
      const bz = 1 + 0.25 * pulse(t, per, 1)
      const dr = R * 0.2 * lockP * (locked ? bz : 1)
      ctx.save(); ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.arc(CX, CY, dr, 0, TAU); ctx.fill(); ctx.restore()
    }
    // anillo de confirmacion que se expande y desvanece al cerrar
    const ring = clamp(inv(p, 0.6, 0.92), 0, 1)
    if (ring > 0 && ring < 1) {
      ctx.save(); ctx.globalAlpha = 0.7 * (1 - ring); ctx.strokeStyle = pal.accent; ctx.lineWidth = LW
      ctx.beginPath(); ctx.arc(CX, CY, near * (0.4 + ring * 0.9), 0, TAU); ctx.stroke(); ctx.restore()
    }
  },
})
