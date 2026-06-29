// urvid 1.0 · BACKGROUNDS — rubro TECH (archivo propio, no pisa a otros agentes).
// Fondos full-canvas, deterministas (mulberry32(env.seed) para layout, t para vida), tono dark+light desde env.pal.
// Vibe tech: circuitos, mesh, grillas de precision, lineas de datos, blueprint sutil, holografico moderno (sobrio).
// Regla dura: centro SUAVE (no matar el contraste del texto); detalle hacia los bordes. Cero Math.random/Date.now.
import { register } from '../../core/registry.js'
import { mulberry32, range, irange, seedFor } from '../../core/prng.js'
import { W, H, TAU, rgba, lighten, darken, clamp, lerp, mix } from '../../core/util.js'

const CLK = 0.6   // reloj base de vida (mismo que el resto de la biblioteca)

// ---- helpers locales (este archivo es standalone: no importa privados de index.js) ----
// rampa vertical bg0->bg1 (base comun)
function rampBg(ctx, pal) {
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, pal.bg0); g.addColorStop(1, pal.bg1)
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
}
// scrim de legibilidad: aclara/oscurece los bordes, deja el centro limpio para el texto
function scrim(ctx, pal, { centerClear = 0.34, strength = null } = {}) {
  const s = strength == null ? (pal.tone === 'light' ? 0.2 : 0.4) : strength
  const v = ctx.createRadialGradient(W / 2, H * 0.46, H * centerClear, W / 2, H * 0.5, H * 0.85)
  v.addColorStop(0, 'rgba(0,0,0,0)')
  v.addColorStop(1, pal.tone === 'light' ? `rgba(255,255,255,${s})` : `rgba(0,0,0,${s})`)
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H)
}
// tinta de detalle neutra-tech segun tono (lineas finas que no roban protagonismo al acento).
// En CLARO el fondo es casi blanco -> la tinta debe ser bastante mas opaca para leerse (azul tinta oscuro).
function hairline(pal, aLight = 0.12, aDark = 0.08) {
  return rgba(pal.tone === 'light' ? '#1a2740' : '#9fb6e6', pal.tone === 'light' ? aLight : aDark)
}
// alpha tono-aware corto
const ta = (pal, l, d) => (pal.tone === 'light' ? l : d)
// acento listo para DETALLE segun tono: en claro el fondo es casi blanco -> oscurecemos el acento para que las
// lineas/nodos finos tengan contraste real (sin un azul oscuro, el detalle se lava); en oscuro lo aclaramos un poco.
const accDetail = pal => (pal.tone === 'light' ? darken(pal.accent, 0.32) : lighten(pal.accent, 0.12))
const acc2Detail = pal => (pal.tone === 'light' ? darken(pal.accent2, 0.32) : lighten(pal.accent2, 0.12))

// ============================================================================
// circuitry — placas / trazas / nodos (el ADN visual del rubro)
// ============================================================================

register({
  id: 'bg.tech.tracecircuit', lib: 'backgrounds', category: 'circuitry', tones: ['dark', 'light'], rubros: ['tech', 'default'], weight: 1.0,
  register: 'corporate', intensity: 'soft', temp: 'cool', tags: ['tech', 'circuito', 'trazas', 'pcb', 'preciso'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'trace')
    rampBg(ctx, pal)
    // trazas tipo PCB: caminos en angulos de 45/90, mas densos hacia los bordes (centro limpio)
    const N = 26
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    for (let i = 0; i < N; i++) {
      const edge = r() < 0.5 ? 0 : 1
      let x = edge ? W : 0
      let y = r() * H
      const segs = irange(r, 3, 6)
      const dir = edge ? -1 : 1
      const col = i % 5 === 0 ? accDetail(pal) : hairline(pal, 0.5, 0.5)
      const aBase = i % 5 === 0 ? ta(pal, 0.42, 0.34) : ta(pal, 0.14, 0.09)
      ctx.strokeStyle = rgba(col, aBase)
      ctx.lineWidth = i % 5 === 0 ? 1.4 : 1
      ctx.beginPath(); ctx.moveTo(x, y)
      for (let s = 0; s < segs; s++) {
        const len = range(r, 26, 70)
        const diag = r() < 0.4
        x += dir * len
        if (diag) y += (r() < 0.5 ? -1 : 1) * len
        else if (r() < 0.6) y += (r() < 0.5 ? -1 : 1) * range(r, 20, 60)
        ctx.lineTo(x, y)
      }
      ctx.stroke()
      // pad/nodo al final, que pulsa suave (vida)
      if (i % 3 === 0) {
        const pulse = 0.5 + 0.5 * Math.sin(t * CLK * 1.2 + i)
        ctx.fillStyle = rgba(accDetail(pal), ta(pal, 0.5, 0.3) * (0.5 + pulse * 0.5))
        ctx.beginPath(); ctx.arc(x, y, 2.4 + pulse * 1.2, 0, TAU); ctx.fill()
      }
    }
    scrim(ctx, pal, { centerClear: 0.3, strength: ta(pal, 0.16, 0.34) })
  },
})

register({
  id: 'bg.tech.chipdie', lib: 'backgrounds', category: 'circuitry', tones: ['dark', 'light'], rubros: ['tech', 'default'], weight: 0.85,
  register: 'corporate', intensity: 'calm', temp: 'cool', tags: ['tech', 'chip', 'die', 'silicio', 'simetrico'],
  render(ctx, t, env) {
    const { pal } = env
    rampBg(ctx, pal)
    // un "die" central tenue con anillos de pines alrededor; centro queda casi vacio (para el texto)
    const cx = W / 2, cy = H * 0.5
    const ring = (rad, count, sz, a) => {
      for (let i = 0; i < count; i++) {
        const ang = (i / count) * TAU
        const px = cx + Math.cos(ang) * rad, py = cy + Math.sin(ang) * rad
        const pulse = 0.5 + 0.5 * Math.sin(t * CLK * 0.9 + i * 0.6)
        ctx.fillStyle = rgba(accDetail(pal), a * (0.5 + pulse * 0.5))
        ctx.fillRect(px - sz / 2, py - sz / 2, sz, sz)
      }
    }
    // contorno del die (rect redondeado simple) bien tenue
    ctx.strokeStyle = hairline(pal, 0.1, 0.12); ctx.lineWidth = 1.2
    const dw = W * 0.5, dh = dw
    ctx.strokeRect(cx - dw / 2, cy - dh / 2, dw, dh)
    ring(dw * 0.78, 28, 4, ta(pal, 0.24, 0.2))
    ring(dw * 1.02, 40, 3, ta(pal, 0.16, 0.12))
    // grilla micro dentro del die (muy suave)
    ctx.save(); ctx.beginPath(); ctx.rect(cx - dw / 2, cy - dh / 2, dw, dh); ctx.clip()
    ctx.strokeStyle = hairline(pal, 0.05, 0.07); ctx.lineWidth = 1
    for (let g = cx - dw / 2; g <= cx + dw / 2; g += 18) { ctx.beginPath(); ctx.moveTo(g, cy - dh / 2); ctx.lineTo(g, cy + dh / 2); ctx.stroke() }
    for (let g = cy - dh / 2; g <= cy + dh / 2; g += 18) { ctx.beginPath(); ctx.moveTo(cx - dw / 2, g); ctx.lineTo(cx + dw / 2, g); ctx.stroke() }
    ctx.restore()
    scrim(ctx, pal, { centerClear: 0.36, strength: ta(pal, 0.18, 0.34) })
  },
})

// ============================================================================
// data-lines — flujo de datos / lineas de telemetria / waveforms
// ============================================================================

register({
  id: 'bg.tech.datastream', lib: 'backgrounds', category: 'data-lines', tones: ['dark', 'light'], rubros: ['tech', 'default'], weight: 1.0,
  register: 'corporate', intensity: 'soft', temp: 'cool', tags: ['tech', 'datos', 'flujo', 'lineas', 'paquetes'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'stream')
    rampBg(ctx, pal)
    // carriles horizontales con "paquetes" (segmentos brillantes) que se desplazan -> sensacion de transferencia
    const lanes = 13
    for (let i = 0; i < lanes; i++) {
      const y = ((i + 0.5) / lanes) * H
      const speed = 18 + (i % 4) * 9
      const dir = i % 2 ? 1 : -1
      // linea base muy tenue
      ctx.strokeStyle = hairline(pal, 0.05, 0.06); ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
      // paquetes
      const pk = 3 + (i % 3)
      for (let p = 0; p < pk; p++) {
        const ph = r() * W
        const x = (((t * CLK * speed * dir) + ph + p * (W / pk)) % (W + 120) + (W + 120)) % (W + 120) - 60
        const len = range(r, 26, 64)
        const col = i % 4 === 0 ? acc2Detail(pal) : accDetail(pal)
        const grad = ctx.createLinearGradient(x, 0, x + len * dir, 0)
        grad.addColorStop(0, rgba(col, 0)); grad.addColorStop(0.5, rgba(col, ta(pal, 0.4, 0.3))); grad.addColorStop(1, rgba(col, 0))
        ctx.strokeStyle = grad; ctx.lineWidth = 2
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len * dir, y); ctx.stroke()
      }
    }
    scrim(ctx, pal, { centerClear: 0.3, strength: ta(pal, 0.2, 0.4) })
  },
})

register({
  id: 'bg.tech.telemetry', lib: 'backgrounds', category: 'data-lines', tones: ['dark', 'light'], rubros: ['tech', 'default'], weight: 0.85,
  register: 'neutral', intensity: 'soft', temp: 'cool', tags: ['tech', 'telemetria', 'onda', 'señal', 'oscilo'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'telem')
    rampBg(ctx, pal)
    // 3 trazas de osciloscopio que ondulan, ancladas a los bordes (sup/inf) para no invadir el centro
    const traces = [
      { yBase: H * 0.14, amp: H * 0.06, col: accDetail(pal), fr: 0.018, sp: 0.5 },
      { yBase: H * 0.86, amp: H * 0.06, col: acc2Detail(pal), fr: 0.024, sp: 0.42 },
      { yBase: H * 0.08, amp: H * 0.03, col: accDetail(pal), fr: 0.04, sp: 0.7 },
    ]
    for (let ti = 0; ti < traces.length; ti++) {
      const tr = traces[ti]
      const ph = r() * TAU
      ctx.strokeStyle = rgba(tr.col, ta(pal, ti === 2 ? 0.22 : 0.4, ti === 2 ? 0.16 : 0.34))
      ctx.lineWidth = ti === 2 ? 1 : 1.6
      ctx.beginPath()
      for (let x = 0; x <= W; x += 4) {
        const y = tr.yBase + Math.sin(x * tr.fr + t * CLK * tr.sp + ph) * tr.amp + Math.sin(x * tr.fr * 2.3 + ph) * tr.amp * 0.3
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    // grilla de oscilo muy tenue (solo verticales finas)
    ctx.strokeStyle = hairline(pal, 0.04, 0.05); ctx.lineWidth = 1
    for (let x = 0; x <= W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
  },
})

// ============================================================================
// mesh-network — nodos conectados / constelacion de red
// ============================================================================

register({
  id: 'bg.tech.nodemesh', lib: 'backgrounds', category: 'mesh-network', tones: ['dark', 'light'], rubros: ['tech', 'default'], weight: 1.0,
  register: 'corporate', intensity: 'soft', temp: 'cool', tags: ['tech', 'red', 'nodos', 'malla', 'conexiones'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'mesh')
    rampBg(ctx, pal)
    const M = 26
    const nodes = Array.from({ length: M }, () => ({ x: r() * W, y: r() * H, ph: r() * TAU, sp: range(r, 0.15, 0.4) }))
    const pos = nodes.map(n => ({
      x: n.x + Math.cos(t * CLK * n.sp + n.ph) * 16,
      y: n.y + Math.sin(t * CLK * n.sp * 0.9 + n.ph) * 16,
    }))
    // aristas entre nodos cercanos (alpha cae con la distancia)
    const maxD = 120
    ctx.lineWidth = 1
    for (let i = 0; i < M; i++) for (let j = i + 1; j < M; j++) {
      const dx = pos[i].x - pos[j].x, dy = pos[i].y - pos[j].y
      const d = Math.hypot(dx, dy)
      if (d > maxD) continue
      const a = (1 - d / maxD) * ta(pal, 0.32, 0.13)
      ctx.strokeStyle = rgba(accDetail(pal), a)
      ctx.beginPath(); ctx.moveTo(pos[i].x, pos[i].y); ctx.lineTo(pos[j].x, pos[j].y); ctx.stroke()
    }
    // nodos
    for (let i = 0; i < M; i++) {
      const pulse = 0.5 + 0.5 * Math.sin(t * CLK * 1.0 + i)
      ctx.fillStyle = rgba(i % 4 === 0 ? acc2Detail(pal) : accDetail(pal), ta(pal, 0.6, 0.42) * (0.6 + pulse * 0.4))
      ctx.beginPath(); ctx.arc(pos[i].x, pos[i].y, 1.8 + (i % 4 === 0 ? 1 : 0), 0, TAU); ctx.fill()
    }
    scrim(ctx, pal, { centerClear: 0.32, strength: ta(pal, 0.2, 0.4) })
  },
})

register({
  id: 'bg.tech.constellation', lib: 'backgrounds', category: 'mesh-network', tones: ['dark', 'light'], rubros: ['tech', 'default'], weight: 0.8,
  register: 'editorial', intensity: 'calm', temp: 'cool', tags: ['tech', 'constelacion', 'red', 'puntos', 'orbital'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'const')
    rampBg(ctx, pal)
    // hubs orbitales: pocos centros con satelites enlazados -> red mas estructurada y aireada
    const hubs = 3
    for (let h = 0; h < hubs; h++) {
      const hx = W * (0.2 + h * 0.3) + Math.sin(t * CLK * 0.2 + h) * 12
      const hy = H * (h % 2 ? 0.22 : 0.78) + Math.cos(t * CLK * 0.18 + h) * 12
      const sat = 6 + h
      for (let s = 0; s < sat; s++) {
        const ang = (s / sat) * TAU + t * CLK * 0.1 * (h % 2 ? 1 : -1)
        const rad = 36 + s * 8
        const sx = hx + Math.cos(ang) * rad, sy = hy + Math.sin(ang) * rad
        ctx.strokeStyle = rgba(accDetail(pal), ta(pal, 0.22, 0.09)); ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(sx, sy); ctx.stroke()
        ctx.fillStyle = rgba(accDetail(pal), ta(pal, 0.55, 0.34)); ctx.beginPath(); ctx.arc(sx, sy, 1.6, 0, TAU); ctx.fill()
      }
      // hub
      const gl = ctx.createRadialGradient(hx, hy, 0, hx, hy, 26)
      gl.addColorStop(0, rgba(pal.accent2, ta(pal, 0.18, 0.22))); gl.addColorStop(1, rgba(pal.accent2, 0))
      ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(hx, hy, 26, 0, TAU); ctx.fill()
      ctx.fillStyle = rgba(acc2Detail(pal), ta(pal, 0.7, 0.55)); ctx.beginPath(); ctx.arc(hx, hy, 3.2, 0, TAU); ctx.fill()
    }
    scrim(ctx, pal, { centerClear: 0.34, strength: ta(pal, 0.16, 0.32) })
  },
})

// ============================================================================
// blueprint — planos tecnicos / cotas / ejes (sobrio, papel azul)
// ============================================================================

register({
  id: 'bg.tech.blueprintgrid', lib: 'backgrounds', category: 'blueprint', tones: ['dark', 'light'], rubros: ['tech', 'default'], weight: 0.9,
  register: 'corporate', intensity: 'calm', temp: 'cool', tags: ['tech', 'blueprint', 'plano', 'grilla', 'cad'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'blue')
    rampBg(ctx, pal)
    // grilla doble (fina + gruesa) tipo papel milimetrado de ingenieria, drift lentisimo
    const minor = 18, off = (t * CLK * 2) % minor
    ctx.strokeStyle = hairline(pal, 0.04, 0.05); ctx.lineWidth = 1
    for (let x = -off; x < W; x += minor) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
    for (let y = -off; y < H; y += minor) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }
    const major = minor * 5
    ctx.strokeStyle = rgba(accDetail(pal), ta(pal, 0.22, 0.1)); ctx.lineWidth = 1
    for (let x = -off; x < W; x += major) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
    for (let y = -off; y < H; y += major) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }
    // cruces de cota en algunos cruces mayores (hacia los bordes)
    ctx.strokeStyle = rgba(accDetail(pal), ta(pal, 0.38, 0.28)); ctx.lineWidth = 1.2
    for (let i = 0; i < 7; i++) {
      const gx = Math.round(range(r, 1, W / major - 1)) * major
      const gy = Math.round(range(r, 1, H / major - 1)) * major
      // evitar la franja central
      if (gy > H * 0.34 && gy < H * 0.66) continue
      ctx.beginPath(); ctx.moveTo(gx - 6, gy); ctx.lineTo(gx + 6, gy); ctx.moveTo(gx, gy - 6); ctx.lineTo(gx, gy + 6); ctx.stroke()
    }
  },
})

register({
  id: 'bg.tech.schematic', lib: 'backgrounds', category: 'blueprint', tones: ['dark', 'light'], rubros: ['tech', 'default'], weight: 0.8,
  register: 'editorial', intensity: 'calm', temp: 'cool', tags: ['tech', 'esquematico', 'circulos', 'cad', 'tecnico'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'schem')
    rampBg(ctx, pal)
    // anillos de mira/encuadre tecnicos en las esquinas + un gran arco que respira (centro vacio)
    function reticle(cx, cy, rad) {
      ctx.strokeStyle = rgba(accDetail(pal), ta(pal, 0.32, 0.22)); ctx.lineWidth = 1
      ctx.beginPath(); ctx.arc(cx, cy, rad, 0, TAU); ctx.stroke()
      ctx.beginPath(); ctx.arc(cx, cy, rad * 0.6, 0, TAU); ctx.stroke()
      ctx.strokeStyle = hairline(pal, 0.08, 0.1)
      ctx.beginPath(); ctx.moveTo(cx - rad * 1.3, cy); ctx.lineTo(cx + rad * 1.3, cy); ctx.moveTo(cx, cy - rad * 1.3); ctx.lineTo(cx, cy + rad * 1.3); ctx.stroke()
    }
    reticle(W * 0.12, H * 0.12, 30)
    reticle(W * 0.88, H * 0.9, 38)
    // dos arcos concentricos sobre el eje VERTICAL (arriba y abajo del centro) -> visibles en pantalla y dejan
    // la franja de texto libre. Barren su angulo lento (vida) y respiran de a poco.
    const breaths = 0.95 + 0.05 * Math.sin(t * CLK * 0.5)
    const sweep = Math.sin(t * CLK * 0.35) * 0.55   // giro lento
    const big = H * 0.42 * breaths
    const drawArc = (centerAng) => {
      ctx.strokeStyle = rgba(acc2Detail(pal), ta(pal, 0.38, 0.18)); ctx.lineWidth = 1.4
      ctx.beginPath(); ctx.arc(W / 2, H / 2, big, centerAng - 0.7, centerAng + 0.7); ctx.stroke()
      for (let a = -0.6; a <= 0.6; a += 0.12) {
        const ang = centerAng + a + sweep * 0.4
        const x1 = W / 2 + Math.cos(ang) * big, y1 = H / 2 + Math.sin(ang) * big
        const x2 = W / 2 + Math.cos(ang) * (big + 7), y2 = H / 2 + Math.sin(ang) * (big + 7)
        ctx.strokeStyle = rgba(acc2Detail(pal), ta(pal, 0.44, 0.26))
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
      }
    }
    drawArc(-Math.PI / 2 + sweep)   // arco superior
    drawArc(Math.PI / 2 - sweep)    // arco inferior
  },
})

// ============================================================================
// gradient-mesh — campos holograficos / mesh moderno (sobrio, no y2k)
// ============================================================================

register({
  id: 'bg.tech.hologrid', lib: 'backgrounds', category: 'gradient-mesh', tones: ['dark', 'light'], rubros: ['tech', 'default'], weight: 1.0,
  register: 'corporate', intensity: 'medium', temp: 'cool', tags: ['tech', 'holografico', 'mesh', 'perspectiva', 'moderno'],
  render(ctx, t, env) {
    const { pal } = env
    rampBg(ctx, pal)
    // plano en perspectiva (piso de grilla) con neblina de acento hacia el horizonte; horizonte en el tercio sup
    const hz = H * 0.34
    // glow de horizonte
    const hg = ctx.createLinearGradient(0, hz - H * 0.18, 0, hz + H * 0.12)
    hg.addColorStop(0, rgba(pal.accent, 0)); hg.addColorStop(0.6, rgba(pal.accent, ta(pal, 0.14, 0.12))); hg.addColorStop(1, rgba(pal.accent, 0))
    ctx.fillStyle = hg; ctx.fillRect(0, hz - H * 0.18, W, H * 0.3)
    // lineas que convergen al punto de fuga (verticales en perspectiva)
    const vp = W / 2
    ctx.strokeStyle = rgba(accDetail(pal), ta(pal, 0.28, 0.13)); ctx.lineWidth = 1
    for (let i = -8; i <= 8; i++) {
      const fx = vp + i * (W / 10)
      ctx.beginPath(); ctx.moveTo(vp + i * 6, hz); ctx.lineTo(fx, H); ctx.stroke()
    }
    // lineas horizontales que se densifican hacia el horizonte + scroll por t
    const scroll = (t * CLK * 0.25) % 1
    for (let k = 0; k < 16; k++) {
      const f = (k + scroll) / 16
      const y = hz + Math.pow(f, 2.2) * (H - hz)
      const a = ta(pal, 0.2, 0.08) * (0.4 + f)
      ctx.strokeStyle = rgba(accDetail(pal), a); ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
    }
    scrim(ctx, pal, { centerClear: 0.3, strength: ta(pal, 0.18, 0.36) })
  },
})

register({
  id: 'bg.tech.spectrumwash', lib: 'backgrounds', category: 'gradient-mesh', tones: ['dark', 'light'], rubros: ['tech', 'default'], weight: 0.9,
  register: 'neutral', intensity: 'soft', temp: 'cool', tags: ['tech', 'mesh', 'gradiente', 'aurora', 'suave'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'spec')
    rampBg(ctx, pal)
    // lavado de gradientes de acento que respiran en las esquinas (mesh suave), centro despejado
    ctx.save(); ctx.globalCompositeOperation = pal.tone === 'light' ? 'multiply' : 'screen'
    const corners = [[0.08, 0.1], [0.92, 0.12], [0.1, 0.9], [0.9, 0.88]]
    for (let i = 0; i < corners.length; i++) {
      const ph = r() * TAU
      const bx = W * corners[i][0] + Math.sin(t * CLK * 0.3 + ph) * 20
      const by = H * corners[i][1] + Math.cos(t * CLK * 0.26 + ph) * 20
      const rad = H * (0.4 + 0.05 * Math.sin(t * CLK * 0.4 + ph))
      const col = i % 2 ? pal.accent2 : pal.accent
      const gr = ctx.createRadialGradient(bx, by, 0, bx, by, rad)
      gr.addColorStop(0, rgba(col, ta(pal, 0.12, 0.18))); gr.addColorStop(1, rgba(col, 0))
      ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H)
    }
    ctx.restore()
    // micro-grilla de puntos sutil encima (textura tech)
    ctx.fillStyle = hairline(pal, 0.05, 0.06)
    for (let y = 0; y < H; y += 26) for (let x = ((y / 26) % 2) * 13; x < W; x += 26) { ctx.beginPath(); ctx.arc(x, y, 0.9, 0, TAU); ctx.fill() }
    scrim(ctx, pal, { centerClear: 0.34, strength: ta(pal, 0.12, 0.28) })
  },
})

// ============================================================================
// geometric — precision geometrica (iso, hex, particiones)
// ============================================================================

register({
  id: 'bg.tech.hexlattice', lib: 'backgrounds', category: 'geometric', tones: ['dark', 'light'], rubros: ['tech', 'default'], weight: 0.9,
  register: 'corporate', intensity: 'calm', temp: 'cool', tags: ['tech', 'hexagonos', 'panal', 'lattice', 'geometrico'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'hex')
    rampBg(ctx, pal)
    // panal de hexagonos contorno fino; algunos se encienden y respiran (vida), centro tenue
    const R = 26, hwid = Math.sqrt(3) * R, vstep = R * 1.5
    ctx.lineWidth = 1
    const lit = new Set()
    for (let k = 0; k < 7; k++) lit.add(`${irange(r, 0, 20)}:${irange(r, 0, 20)}`)
    let row = 0
    for (let cy = 0; cy < H + R; cy += vstep, row++) {
      const xoff = (row % 2) * (hwid / 2)
      let col = 0
      for (let cx = -hwid; cx < W + hwid; cx += hwid, col++) {
        const x = cx + xoff
        // distancia normalizada al centro -> alpha (centro mas tenue)
        const dc = Math.hypot((x - W / 2) / W, (cy - H / 2) / H)
        const baseA = ta(pal, 0.07, 0.055) + dc * ta(pal, 0.09, 0.06)
        ctx.strokeStyle = rgba(pal.tone === 'light' ? '#1a2740' : '#9fb6e6', baseA)
        ctx.beginPath()
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 6) + i * (TAU / 6)
          const px = x + Math.cos(a) * R, py = cy + Math.sin(a) * R
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
        }
        ctx.closePath(); ctx.stroke()
        if (lit.has(`${row}:${col}`)) {
          const pulse = 0.5 + 0.5 * Math.sin(t * CLK * 1.1 + row + col)
          ctx.fillStyle = rgba(accDetail(pal), ta(pal, 0.2, 0.18) * pulse)
          ctx.fill()
        }
      }
    }
    scrim(ctx, pal, { centerClear: 0.36, strength: ta(pal, 0.14, 0.3) })
  },
})

register({
  id: 'bg.tech.isoblocks', lib: 'backgrounds', category: 'geometric', tones: ['dark', 'light'], rubros: ['tech', 'default'], weight: 0.8,
  register: 'corporate', intensity: 'soft', temp: 'cool', tags: ['tech', 'isometrico', 'cubos', 'datacenter', '3d'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'iso')
    rampBg(ctx, pal)
    // campo isometrico de cubos finos (servers/bloques de datos) hacia los bordes, alguno se ilumina
    const s = 22
    function cube(cx, cy, hgt, a, lit) {
      const tp = pal.tone === 'light' ? '#1a2740' : '#9fb6e6'
      // cara top (rombo)
      ctx.beginPath()
      ctx.moveTo(cx, cy - hgt)
      ctx.lineTo(cx + s, cy - hgt + s * 0.5)
      ctx.lineTo(cx, cy - hgt + s)
      ctx.lineTo(cx - s, cy - hgt + s * 0.5)
      ctx.closePath()
      ctx.fillStyle = rgba(lit ? accDetail(pal) : tp, a * (lit ? (pal.tone === 'light' ? 2.4 : 1.6) : 0.5)); ctx.fill()
      // caras laterales
      ctx.beginPath(); ctx.moveTo(cx - s, cy - hgt + s * 0.5); ctx.lineTo(cx, cy - hgt + s); ctx.lineTo(cx, cy + s); ctx.lineTo(cx - s, cy + s * 0.5 - hgt + hgt); ctx.lineTo(cx - s, cy + s * 0.5); ctx.closePath()
      ctx.fillStyle = rgba(tp, a * 0.7); ctx.fill()
      ctx.beginPath(); ctx.moveTo(cx + s, cy - hgt + s * 0.5); ctx.lineTo(cx, cy - hgt + s); ctx.lineTo(cx, cy + s); ctx.lineTo(cx + s, cy + s * 0.5); ctx.closePath()
      ctx.fillStyle = rgba(tp, a * 0.4); ctx.fill()
    }
    // grilla diagonal de posiciones
    for (let gy = -1; gy < 14; gy++) for (let gx = -1; gx < 10; gx++) {
      const cx = gx * s * 2 + (gy % 2) * s
      const cy = gy * s
      const dc = Math.hypot((cx - W / 2) / W, (cy - H / 2) / H)
      if (dc < 0.34) continue   // centro vacio
      const hgt = 6 + (r() * 18 | 0)
      const lit = r() < 0.08
      const a = ta(pal, 0.1, 0.06) + dc * ta(pal, 0.08, 0.05)
      const pulse = lit ? (0.5 + 0.5 * Math.sin(t * CLK * 1.0 + gx + gy)) : 1
      cube(cx, cy, hgt, a * pulse, lit)
    }
    scrim(ctx, pal, { centerClear: 0.34, strength: ta(pal, 0.16, 0.32) })
  },
})

// ============================================================================
// scanlines — texturas de pantalla / scan / dot-matrix (sutiles)
// ============================================================================

register({
  id: 'bg.tech.scanfield', lib: 'backgrounds', category: 'scanlines', tones: ['dark', 'light'], rubros: ['tech', 'default'], weight: 0.85,
  register: 'editorial', intensity: 'soft', temp: 'cool', tags: ['tech', 'scan', 'pantalla', 'barrido', 'hud'],
  render(ctx, t, env) {
    const { pal } = env
    rampBg(ctx, pal)
    // scanlines finas + una banda de "barrido" que recorre vertical lento (sweep), centro respetado
    ctx.strokeStyle = hairline(pal, 0.11, 0.05); ctx.lineWidth = 1
    for (let y = 0; y < H; y += 4) { ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); ctx.stroke() }
    // banda sweep
    const sweepY = ((t * CLK * 0.12) % 1) * (H + 160) - 80
    const sg = ctx.createLinearGradient(0, sweepY - 70, 0, sweepY + 70)
    sg.addColorStop(0, rgba(accDetail(pal), 0)); sg.addColorStop(0.5, rgba(accDetail(pal), ta(pal, 0.16, 0.1))); sg.addColorStop(1, rgba(accDetail(pal), 0))
    ctx.fillStyle = sg; ctx.fillRect(0, sweepY - 70, W, 140)
    // marcas de regla en el borde izquierdo (HUD)
    ctx.strokeStyle = rgba(accDetail(pal), ta(pal, 0.32, 0.22))
    for (let y = 0; y < H; y += 20) { const long = (y % 100 === 0); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(long ? 12 : 6, y); ctx.stroke() }
    scrim(ctx, pal, { centerClear: 0.3, strength: ta(pal, 0.12, 0.26) })
  },
})

register({
  id: 'bg.tech.dotmatrix', lib: 'backgrounds', category: 'scanlines', tones: ['dark', 'light'], rubros: ['tech', 'default'], weight: 0.8,
  register: 'neutral', intensity: 'calm', temp: 'cool', tags: ['tech', 'matriz', 'puntos', 'led', 'display'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'dot')
    rampBg(ctx, pal)
    // matriz de puntos tipo LED: brillo ondula en olas diagonales lentas; centro mas apagado
    const step = 16
    for (let y = step / 2; y < H; y += step) for (let x = step / 2; x < W; x += step) {
      const dc = Math.hypot((x - W / 2) / W, (y - H / 2) / H)
      const wave = 0.5 + 0.5 * Math.sin((x + y) * 0.02 + t * CLK * 0.6 + r() * 0.0)
      // jitter de fase estable por celda
      const a = (ta(pal, 0.13, 0.06) + dc * ta(pal, 0.15, 0.08)) * (0.5 + wave * 0.5)
      const hot = ((x / step | 0) + (y / step | 0)) % 13 === 0
      const col = hot ? accDetail(pal) : (pal.tone === 'light' ? '#1a2740' : '#9fb6e6')
      ctx.fillStyle = rgba(col, hot ? a * 1.8 : a)
      ctx.beginPath(); ctx.arc(x, y, 1.3, 0, TAU); ctx.fill()
    }
    scrim(ctx, pal, { centerClear: 0.36, strength: ta(pal, 0.12, 0.26) })
  },
})

// ============================================================================
// particles — flujo de particulas/ascenso de datos (organico-tech)
// ============================================================================

register({
  id: 'bg.tech.datarise', lib: 'backgrounds', category: 'particles', tones: ['dark', 'light'], rubros: ['tech', 'default'], weight: 0.85,
  register: 'editorial', intensity: 'soft', temp: 'cool', tags: ['tech', 'particulas', 'ascenso', 'datos', 'upload'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'rise')
    rampBg(ctx, pal)
    // particulas que ascienden en carriles (subida de datos / procesamiento), parallax por tamaño
    const N = 70
    for (let i = 0; i < N; i++) {
      const lane = r()
      const x = lane * W
      const sz = 0.6 + (i % 5 === 0 ? 1.4 : r() * 0.9)
      const sp = 12 + sz * 14
      const ph = r() * H
      const y = (((H - (t * CLK * sp + ph)) % (H + 40)) + (H + 40)) % (H + 40) - 20
      const drift = Math.sin(t * CLK * 0.5 + ph) * 6
      const a = ta(pal, 0.5, 0.26) * (0.4 + sz * 0.3)
      ctx.fillStyle = rgba(i % 6 === 0 ? acc2Detail(pal) : accDetail(pal), a)
      ctx.beginPath(); ctx.arc(x + drift, y, sz, 0, TAU); ctx.fill()
    }
    scrim(ctx, pal, { centerClear: 0.32, strength: ta(pal, 0.16, 0.34) })
  },
})

// ============================================================================
// glass-panels — superficies de cristal/UI flotante (frosted, moderno)
// ============================================================================

register({
  id: 'bg.tech.glasspanels', lib: 'backgrounds', category: 'glass-panels', tones: ['dark', 'light'], rubros: ['tech', 'default'], weight: 0.8,
  register: 'corporate', intensity: 'calm', temp: 'cool', tags: ['tech', 'cristal', 'paneles', 'ui', 'glassmorphism'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'glass')
    rampBg(ctx, pal)
    // tarjetas/paneles de UI flotantes hacia los bordes, con borde de acento y leve flotacion por t
    const panels = 5
    for (let i = 0; i < panels; i++) {
      const onLeft = i % 2 === 0
      const pw = range(r, 70, 130), ph = range(r, 40, 80)
      const px = onLeft ? range(r, -20, W * 0.18) : range(r, W * 0.82 - pw + 20, W - pw + 20)
      const py = range(r, 0, H - ph) + Math.sin(t * CLK * 0.4 + i) * 6
      // mantener fuera de la franja central de texto verticalmente si caen al medio en X
      // relleno frosted: en claro un tinte azul tenue (sino el panel blanco no se ve sobre fondo blanco)
      ctx.fillStyle = pal.tone === 'light' ? rgba(pal.accent, 0.06) : 'rgba(255,255,255,0.04)'
      ctx.beginPath(); ctx.rect(px, py, pw, ph); ctx.fill()
      // borde de acento
      ctx.strokeStyle = rgba(accDetail(pal), ta(pal, 0.34, 0.26)); ctx.lineWidth = 1
      ctx.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1)
      // lineas de "contenido" dentro del panel
      ctx.strokeStyle = hairline(pal, 0.14, 0.12)
      for (let l = 0; l < 3; l++) { const ly = py + 12 + l * 12; if (ly < py + ph - 6) { ctx.beginPath(); ctx.moveTo(px + 8, ly); ctx.lineTo(px + pw - (l === 0 ? 14 : 24), ly); ctx.stroke() } }
      // punto de acento (header del panel)
      ctx.fillStyle = rgba(acc2Detail(pal), ta(pal, 0.7, 0.6)); ctx.beginPath(); ctx.arc(px + 10, py + 8, 2, 0, TAU); ctx.fill()
    }
    scrim(ctx, pal, { centerClear: 0.3, strength: ta(pal, 0.16, 0.34) })
  },
})
