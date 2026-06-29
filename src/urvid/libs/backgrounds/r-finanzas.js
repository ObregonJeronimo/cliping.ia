// urvid 1.0 · biblioteca BACKGROUNDS — fondos del rubro FINANZAS (sobrios, institucionales, confianza).
// Archivo PROPIO (no pisa index.js ni otros agentes). Cada modulo: render(ctx, t, env). Puro + determinista
// (mulberry32(env.seed)/seedFor para layout estable; t = unica fuente de movimiento). Consume env.pal (NUNCA
// hardcodea color de marca; gris/blanco neutro ok para detalle). Centro suave -> no mata el contraste del texto.
// Estetica: gradientes limpios, grillas finas, barras/columnas abstractas, lineas tipo grafico, geometrico calmo.
import { register } from '../../core/registry.js'
import { mulberry32, seedFor, range, irange } from '../../core/prng.js'
import { W, H, TAU, rgba, lighten, darken, clamp, lerp, mix } from '../../core/util.js'

const CLK = 0.6
const RUBROS = ['finanzas', 'default']

// rampa base bg0 -> bg1 (sirve para casi todos). Vertical = sobrio, institucional.
function rampBg(ctx, pal) {
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, pal.bg0); g.addColorStop(1, pal.bg1)
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
}
// scrim de legibilidad al centro: protege la franja del texto sin borrar el detalle de los bordes.
function centerScrim(ctx, pal, strDark = 0.34, strLight = 0.2) {
  const v = ctx.createRadialGradient(W / 2, H * 0.46, H * 0.28, W / 2, H * 0.5, H * 0.82)
  v.addColorStop(0, 'rgba(0,0,0,0)')
  v.addColorStop(1, pal.tone === 'light' ? `rgba(255,255,255,${strLight})` : `rgba(0,0,0,${strDark})`)
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H)
}
// color de "linea fina" neutro segun tono (grillas/ejes): no usa acento -> queda sobrio.
function hair(pal, aLight = 0.06, aDark = 0.08) {
  return pal.tone === 'light' ? rgba('#1c2230', aLight) : rgba('#cdd6e6', aDark)
}
// color de acento VISIBLE como detalle segun tono: en claro el accent2 brillante (cyan) desaparece sobre blanco,
// asi que en claro oscurecemos el acento; en oscuro lo aclaramos. Mantiene el detalle legible en AMBOS tonos.
function detail(pal, useAccent2 = false) {
  const base = useAccent2 ? pal.accent2 : pal.accent
  return pal.tone === 'light' ? darken(base, 0.42) : lighten(base, 0.12)
}

// ============================================================================
// gradient-fields — degrades limpios, sobrios, premium
// ============================================================================

register({
  id: 'bg.finanzas.ledgersheen', lib: 'backgrounds', category: 'gradient-fields', tones: ['dark', 'light'], rubros: RUBROS, weight: 1.0,
  register: 'corporate', intensity: 'calm', temp: 'cool', tags: ['finanzas', 'gradiente', 'sobrio', 'institucional'],
  render(ctx, t, env) {
    const { pal } = env
    rampBg(ctx, pal)
    // brillo lateral (sheen) muy lento que recorre de izquierda a derecha -> superficie premium viva pero quieta
    const sx = W * (0.5 + 0.42 * Math.sin(t * CLK * 0.16))
    const g = ctx.createLinearGradient(sx - W * 0.5, 0, sx + W * 0.5, H)
    g.addColorStop(0, rgba(pal.accent, 0))
    g.addColorStop(0.5, rgba(pal.accent, pal.tone === 'light' ? 0.05 : 0.07))
    g.addColorStop(1, rgba(pal.accent, 0))
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    // base de piso con un toque de accent2 (anclaje de color, hacia abajo donde no hay texto)
    const fg = ctx.createLinearGradient(0, H * 0.6, 0, H)
    fg.addColorStop(0, rgba(pal.accent2, 0)); fg.addColorStop(1, rgba(pal.accent2, pal.tone === 'light' ? 0.06 : 0.1))
    ctx.fillStyle = fg; ctx.fillRect(0, H * 0.6, W, H * 0.4)
    centerScrim(ctx, pal, 0.22, 0.12)
  },
})

register({
  id: 'bg.finanzas.cornerwedge', lib: 'backgrounds', category: 'gradient-fields', tones: ['dark', 'light'], rubros: RUBROS, weight: 0.95,
  register: 'corporate', intensity: 'soft', temp: 'cool', tags: ['finanzas', 'gradiente', 'diagonal', 'corporativo'],
  render(ctx, t, env) {
    const { pal } = env
    rampBg(ctx, pal)
    // cuna de acento anclada en la esquina inferior-derecha (lejos del texto) que respira
    const cx = W * 1.02, cy = H * 1.04
    const R = H * (0.64 + 0.03 * Math.sin(t * CLK * 0.3))
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R)
    g.addColorStop(0, rgba(pal.accent, pal.tone === 'light' ? 0.16 : 0.22))
    g.addColorStop(0.55, rgba(pal.accent2, pal.tone === 'light' ? 0.06 : 0.09))
    g.addColorStop(1, rgba(pal.accent, 0))
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    // contracuna tenue en la esquina superior-izquierda -> equilibrio diagonal
    const g2 = ctx.createRadialGradient(-W * 0.05, -H * 0.05, 0, -W * 0.05, -H * 0.05, H * 0.5)
    g2.addColorStop(0, rgba(pal.accent2, pal.tone === 'light' ? 0.07 : 0.1)); g2.addColorStop(1, rgba(pal.accent2, 0))
    ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H)
    centerScrim(ctx, pal, 0.2, 0.1)
  },
})

register({
  id: 'bg.finanzas.horizonband', lib: 'backgrounds', category: 'gradient-fields', tones: ['dark', 'light'], rubros: RUBROS, weight: 0.9,
  register: 'editorial', intensity: 'calm', temp: 'cool', tags: ['finanzas', 'gradiente', 'horizonte', 'minimal'],
  render(ctx, t, env) {
    const { pal } = env
    rampBg(ctx, pal)
    // banda de horizonte suave que sube/baja muy lento -> sensacion de "mercado estable"
    const hy = H * (0.7 + 0.02 * Math.sin(t * CLK * 0.22))
    const dcol = detail(pal)
    const g = ctx.createLinearGradient(0, hy - H * 0.2, 0, hy + H * 0.2)
    g.addColorStop(0, rgba(dcol, 0))
    g.addColorStop(0.5, rgba(dcol, pal.tone === 'light' ? 0.2 : 0.16))
    g.addColorStop(1, rgba(dcol, 0))
    ctx.fillStyle = g; ctx.fillRect(0, hy - H * 0.2, W, H * 0.4)
    // linea fina del horizonte (eje)
    ctx.strokeStyle = hair(pal, 0.22, 0.18); ctx.lineWidth = 1.2
    ctx.beginPath(); ctx.moveTo(0, hy); ctx.lineTo(W, hy); ctx.stroke()
    centerScrim(ctx, pal, 0.18, 0.06)
  },
})

// ============================================================================
// geometric-graphic — grillas, columnas, ejes, geometria institucional
// ============================================================================

register({
  id: 'bg.finanzas.columns', lib: 'backgrounds', category: 'geometric-graphic', tones: ['dark', 'light'], rubros: RUBROS, weight: 1.0,
  register: 'corporate', intensity: 'soft', temp: 'cool', tags: ['finanzas', 'barras', 'columnas', 'grafico'],
  render(ctx, t, env) {
    const { pal } = env, r = mulberry32(env.seed ^ 0x4f1a)
    rampBg(ctx, pal)
    // columnas abstractas tipo grafico de barras, ancladas al piso (no invaden el centro/arriba)
    const n = 9, gap = W / n
    const baseY = H * 0.98
    for (let i = 0; i < n; i++) {
      const x = i * gap + gap * 0.18, bw = gap * 0.64
      const ph = r() * TAU, base = 0.18 + r() * 0.5
      // cada barra respira suave con fase propia -> "datos vivos" sin distraer
      const h = (base + 0.05 * Math.sin(t * CLK * 0.4 + ph)) * H * 0.42
      const col = detail(pal, i % 3 !== 0)
      const g = ctx.createLinearGradient(0, baseY - h, 0, baseY)
      g.addColorStop(0, rgba(col, pal.tone === 'light' ? 0.24 : 0.22))
      g.addColorStop(1, rgba(col, pal.tone === 'light' ? 0.05 : 0.05))
      ctx.fillStyle = g; ctx.fillRect(x, baseY - h, bw, h)
    }
    // eje base
    ctx.strokeStyle = hair(pal, 0.14, 0.18); ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(0, baseY); ctx.lineTo(W, baseY); ctx.stroke()
    centerScrim(ctx, pal, 0.16, 0.06)
  },
})

register({
  id: 'bg.finanzas.finegrid', lib: 'backgrounds', category: 'geometric-graphic', tones: ['dark', 'light'], rubros: RUBROS, weight: 1.05,
  register: 'corporate', intensity: 'calm', temp: 'cool', tags: ['finanzas', 'grilla', 'swiss', 'tecnico'],
  render(ctx, t, env) {
    const { pal } = env
    rampBg(ctx, pal)
    // grilla fina tipo papel financiero: menores tenues + mayores cada 5
    const minor = 26, drift = (t * CLK * 4) % minor
    ctx.lineWidth = 1
    for (let i = 0, x = -drift; x < W + minor; x += minor, i++) {
      ctx.strokeStyle = (i % 5 === 0) ? hair(pal, 0.1, 0.13) : hair(pal, 0.045, 0.06)
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke()
    }
    for (let j = 0, y = -drift; y < H + minor; y += minor, j++) {
      ctx.strokeStyle = (j % 5 === 0) ? hair(pal, 0.1, 0.13) : hair(pal, 0.045, 0.06)
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
    }
    // velo de acento esquinado para que no sea solo gris
    const g = ctx.createRadialGradient(W, H, 0, W, H, H * 0.6)
    g.addColorStop(0, rgba(pal.accent, pal.tone === 'light' ? 0.08 : 0.12)); g.addColorStop(1, rgba(pal.accent, 0))
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    centerScrim(ctx, pal, 0.16, 0.07)
  },
})

register({
  id: 'bg.finanzas.pillars', lib: 'backgrounds', category: 'geometric-graphic', tones: ['dark', 'light'], rubros: RUBROS, weight: 0.85,
  register: 'corporate', intensity: 'soft', temp: 'cool', tags: ['finanzas', 'columnas', 'arquitectura', 'banca'],
  render(ctx, t, env) {
    const { pal } = env
    rampBg(ctx, pal)
    // pilares verticales anchos y tenues (fachada de banco) con leve parallax/sheen
    const n = 6, gap = W / n
    const slide = Math.sin(t * CLK * 0.18) * 6
    for (let i = 0; i < n; i++) {
      const cx = i * gap + gap * 0.5 + slide * (i % 2 ? 1 : -1) * 0.4
      const pw = gap * 0.5
      const g = ctx.createLinearGradient(cx - pw / 2, 0, cx + pw / 2, 0)
      // cada pilar respira con fase propia (brillo) -> vida perceptible a cualquier muestreo
      const breath = 0.82 + 0.18 * Math.sin(t * CLK * 0.5 + i * 0.9)
      const a = (pal.tone === 'light' ? 0.1 : 0.07) * breath
      const col = detail(pal, i % 2 === 0)
      g.addColorStop(0, rgba(col, 0))
      g.addColorStop(0.5, rgba(col, a))
      g.addColorStop(1, rgba(col, 0))
      ctx.fillStyle = g; ctx.fillRect(cx - pw / 2, 0, pw, H)
    }
    centerScrim(ctx, pal, 0.2, 0.09)
  },
})

register({
  id: 'bg.finanzas.dotmatrix', lib: 'backgrounds', category: 'geometric-graphic', tones: ['dark', 'light'], rubros: RUBROS, weight: 0.8,
  register: 'neutral', intensity: 'calm', temp: 'cool', tags: ['finanzas', 'puntos', 'matriz', 'minimal'],
  render(ctx, t, env) {
    const { pal } = env
    rampBg(ctx, pal)
    // matriz de puntos finos (papel de plano financiero); densidad decrece hacia el centro -> texto limpio
    const step = 22
    for (let y = step; y < H; y += step) for (let x = step; x < W; x += step) {
      const dx = (x - W / 2) / (W / 2), dy = (y - H * 0.46) / (H / 2)
      const d = Math.min(1, Math.sqrt(dx * dx + dy * dy))
      const a = (pal.tone === 'light' ? 0.22 : 0.16) * clamp(d * 1.2 - 0.15, 0, 1)
      if (a < 0.01) continue
      // pulso lento radial (onda que se expande) -> vida sutil
      const pulse = 0.85 + 0.15 * Math.sin(d * 6 - t * CLK * 0.8)
      ctx.fillStyle = hair(pal, a * pulse * 0.95, a * pulse)
      ctx.beginPath(); ctx.arc(x, y, pal.tone === 'light' ? 1.5 : 1.2, 0, TAU); ctx.fill()
    }
    centerScrim(ctx, pal, 0.14, 0.05)
  },
})

// ============================================================================
// chart-lines — lineas tipo grafico (la firma del rubro)
// ============================================================================

// linea de grafico determinista (random-walk sembrado) muestreada -> path suave creciente
function chartPath(r, points, baseY, amp) {
  const xs = [], ys = []
  let v = 0.5
  for (let i = 0; i < points; i++) {
    v = clamp(v + (r() - 0.42) * 0.22, 0.05, 0.95)   // sesgo leve al alza
    xs.push((i / (points - 1)) * W)
    ys.push(baseY - v * amp)
  }
  return { xs, ys }
}

register({
  id: 'bg.finanzas.uptrend', lib: 'backgrounds', category: 'chart-lines', tones: ['dark', 'light'], rubros: RUBROS, weight: 1.05,
  register: 'corporate', intensity: 'soft', temp: 'cool', tags: ['finanzas', 'grafico', 'linea', 'tendencia'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'up')
    rampBg(ctx, pal)
    const baseY = H * 0.92, amp = H * 0.5
    const { xs, ys } = chartPath(r, 16, baseY, amp)
    // area bajo la curva (relleno tenue) -> abajo, no toca el texto
    ctx.beginPath(); ctx.moveTo(0, baseY)
    for (let i = 0; i < xs.length; i++) ctx.lineTo(xs[i], ys[i] + Math.sin(t * CLK * 0.4 + i) * 1.5)
    ctx.lineTo(W, baseY); ctx.closePath()
    const dcol = detail(pal)
    const fill = ctx.createLinearGradient(0, baseY - amp, 0, baseY)
    fill.addColorStop(0, rgba(dcol, pal.tone === 'light' ? 0.16 : 0.14))
    fill.addColorStop(1, rgba(dcol, 0))
    ctx.fillStyle = fill; ctx.fill()
    // la linea
    ctx.strokeStyle = rgba(dcol, pal.tone === 'light' ? 0.55 : 0.5); ctx.lineWidth = 2; ctx.lineJoin = 'round'
    ctx.beginPath()
    for (let i = 0; i < xs.length; i++) { const y = ys[i] + Math.sin(t * CLK * 0.4 + i) * 1.5; i ? ctx.lineTo(xs[i], y) : ctx.moveTo(xs[i], y) }
    ctx.stroke()
    centerScrim(ctx, pal, 0.18, 0.08)
  },
})

register({
  id: 'bg.finanzas.candles', lib: 'backgrounds', category: 'chart-lines', tones: ['dark', 'light'], rubros: RUBROS, weight: 0.95,
  register: 'corporate', intensity: 'medium', temp: 'cool', tags: ['finanzas', 'velas', 'trading', 'mercado'],
  render(ctx, t, env) {
    const { pal } = env, r = mulberry32(env.seed ^ 0x9c3d)
    rampBg(ctx, pal)
    // velas japonesas abstractas, ancladas al piso, sobrias (verde=accent up / rojo=accent2-darken down? -> usamos pal)
    const n = 14, gap = W / n, baseY = H * 0.88, span = H * 0.46
    let prev = 0.5
    for (let i = 0; i < n; i++) {
      const cx = i * gap + gap * 0.5
      const o = prev
      const c = clamp(o + (r() - 0.5) * 0.34, 0.08, 0.92)
      const hi = Math.max(o, c) + r() * 0.1, lo = Math.min(o, c) - r() * 0.1
      prev = c
      const up = c >= o
      const col = detail(pal, !up)
      const wob = Math.sin(t * CLK * 0.5 + i) * 2
      const yO = baseY - o * span + wob, yC = baseY - c * span + wob
      const yHi = baseY - hi * span + wob, yLo = baseY - lo * span + wob
      ctx.strokeStyle = rgba(col, pal.tone === 'light' ? 0.42 : 0.42); ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(cx, yHi); ctx.lineTo(cx, yLo); ctx.stroke()
      ctx.fillStyle = rgba(col, pal.tone === 'light' ? 0.28 : 0.28)
      const top = Math.min(yO, yC), bh = Math.max(2, Math.abs(yC - yO))
      ctx.fillRect(cx - gap * 0.22, top, gap * 0.44, bh)
    }
    centerScrim(ctx, pal, 0.2, 0.1)
  },
})

register({
  id: 'bg.finanzas.pulseline', lib: 'backgrounds', category: 'chart-lines', tones: ['dark', 'light'], rubros: RUBROS, weight: 0.85,
  register: 'editorial', intensity: 'soft', temp: 'cool', tags: ['finanzas', 'pulso', 'linea', 'monitor'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'pulse')
    rampBg(ctx, pal)
    // dos lineas finas tipo "tape" que cruzan abajo, con un punto luminoso que viaja (cotizacion en vivo)
    for (let k = 0; k < 2; k++) {
      const baseY = H * (0.74 + k * 0.12)
      const ph = r() * TAU, freq = 0.014 + r() * 0.006, amp = H * (0.03 + k * 0.012)
      const lcol = detail(pal, k === 1)
      ctx.strokeStyle = rgba(lcol, pal.tone === 'light' ? 0.45 : 0.36)
      ctx.lineWidth = 1.6
      ctx.beginPath()
      for (let x = 0; x <= W; x += 6) {
        const y = baseY + Math.sin(x * freq + ph + t * CLK * 0.5) * amp + Math.sin(x * freq * 2.3 + ph) * amp * 0.4
        x ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
      }
      ctx.stroke()
      // punto que recorre (vida)
      const px = ((t * CLK * 60 + k * W * 0.4) % (W + 40)) - 20
      const py = baseY + Math.sin(px * freq + ph + t * CLK * 0.5) * amp + Math.sin(px * freq * 2.3 + ph) * amp * 0.4
      ctx.fillStyle = rgba(lcol, 0.85)
      ctx.beginPath(); ctx.arc(px, py, 2.6, 0, TAU); ctx.fill()
    }
    centerScrim(ctx, pal, 0.16, 0.06)
  },
})

// ============================================================================
// atmospheric-organic — niebla/bloom muy sobrio para variedad de tono
// ============================================================================

register({
  id: 'bg.finanzas.vaultglow', lib: 'backgrounds', category: 'atmospheric-organic', tones: ['dark', 'light'], rubros: RUBROS, weight: 0.85,
  register: 'editorial', intensity: 'soft', temp: 'cool', tags: ['finanzas', 'bloom', 'premium', 'oro'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'vault')
    rampBg(ctx, pal)
    // dos plumas suaves de luz hacia los bordes inferiores (riqueza contenida), respiran desfasadas
    ctx.globalCompositeOperation = pal.tone === 'light' ? 'multiply' : 'screen'
    for (let i = 0; i < 2; i++) {
      const ph = r() * TAU
      const bx = i ? W * 0.86 : W * 0.14
      const by = H * (0.78 + 0.04 * Math.sin(t * CLK * 0.3 + ph))
      const rad = H * (0.34 + 0.03 * Math.cos(t * CLK * 0.26 + ph))
      const col = pal.tone === 'light' ? detail(pal, i === 1) : (i ? pal.accent2 : pal.accent)
      const g = ctx.createRadialGradient(bx, by, 0, bx, by, rad)
      g.addColorStop(0, rgba(col, pal.tone === 'light' ? 0.22 : 0.16))
      g.addColorStop(1, rgba(col, 0))
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    }
    ctx.globalCompositeOperation = 'source-over'
    centerScrim(ctx, pal, 0.2, 0.1)
  },
})

// ============================================================================
// generative-art — campos finos pero sobrios (textura institucional)
// ============================================================================

register({
  id: 'bg.finanzas.guilloche', lib: 'backgrounds', category: 'generative-art', tones: ['dark', 'light'], rubros: RUBROS, weight: 0.8,
  register: 'editorial', intensity: 'soft', temp: 'cool', tags: ['finanzas', 'guilloche', 'billete', 'seguridad'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'guil')
    rampBg(ctx, pal)
    // patron guilloche (como en billetes/bonos): curvas de Lissajous concentricas, finisimas, hacia los bordes
    const cx = W / 2, cy = H * 0.5
    const a = 2 + (r() * 2 | 0), b = 3 + (r() * 2 | 0)
    const rings = 5
    ctx.lineWidth = 0.8
    for (let k = 0; k < rings; k++) {
      const R = H * (0.34 + k * 0.1)
      const col = detail(pal, k % 2 === 1)
      ctx.strokeStyle = rgba(col, pal.tone === 'light' ? 0.24 : 0.18)
      ctx.beginPath()
      for (let i = 0; i <= 220; i++) {
        const th = (i / 220) * TAU
        const rr = R + Math.sin(th * (a + k) + t * CLK * 0.12) * 14 + Math.cos(th * (b + k) - t * CLK * 0.1) * 10
        const x = cx + Math.cos(th) * rr, y = cy + Math.sin(th) * rr * 1.18
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
      }
      ctx.closePath(); ctx.stroke()
    }
    // scrim mas fuerte: el guilloche en el centro distrae -> proteger el texto
    centerScrim(ctx, pal, 0.36, 0.22)
  },
})

register({
  id: 'bg.finanzas.streamlines', lib: 'backgrounds', category: 'generative-art', tones: ['dark', 'light'], rubros: RUBROS, weight: 0.85,
  register: 'neutral', intensity: 'soft', temp: 'cool', tags: ['finanzas', 'flujo', 'lineas', 'capital'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'stream')
    rampBg(ctx, pal)
    // lineas de flujo horizontales y paralelas (flujo de capital) que ondulan suave: ordenadas, no caoticas
    const lines = 16
    ctx.lineWidth = 1.2
    ctx.globalCompositeOperation = pal.tone === 'light' ? 'multiply' : 'screen'
    for (let i = 0; i < lines; i++) {
      const baseY = (i / (lines - 1)) * H
      const ph = r() * TAU, amp = 8 + r() * 10
      const col = i % 4 === 0 ? detail(pal) : (i % 4 === 2 ? detail(pal, true) : null)
      ctx.strokeStyle = col ? rgba(col, pal.tone === 'light' ? 0.3 : 0.24) : hair(pal, 0.08, 0.07)
      ctx.beginPath()
      for (let x = 0; x <= W; x += 8) {
        const y = baseY + Math.sin(x * 0.01 + ph + t * CLK * 0.3) * amp
        x ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
      }
      ctx.stroke()
    }
    ctx.globalCompositeOperation = 'source-over'
    centerScrim(ctx, pal, 0.28, 0.16)
  },
})

register({
  id: 'bg.finanzas.coinscatter', lib: 'backgrounds', category: 'generative-art', tones: ['dark', 'light'], rubros: RUBROS, weight: 0.75,
  register: 'friendly', intensity: 'soft', temp: 'cool', tags: ['finanzas', 'monedas', 'circulos', 'ahorro'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'coin')
    rampBg(ctx, pal)
    // discos finos (monedas) dispersos hacia los bordes, en deriva lenta -> friendly pero sobrio
    const M = 22
    for (let i = 0; i < M; i++) {
      const ph = r() * TAU
      const ex = r()   // posicion base
      const bx = ex * W
      const by = r() * H
      // empujar lejos del centro horizontal (deja la columna del texto limpia)
      const push = bx < W / 2 ? -1 : 1
      const x = clamp(bx + push * (1 - Math.abs(ex - 0.5) * 2) * W * 0.18, 6, W - 6) + Math.cos(t * CLK * 0.2 + ph) * 8
      const y = (by + t * CLK * 6) % (H + 30) - 15 + Math.sin(t * CLK * 0.25 + ph) * 6
      const rad = 4 + r() * 12
      const col = detail(pal, i % 3 !== 0)
      ctx.strokeStyle = rgba(col, pal.tone === 'light' ? 0.28 : 0.2); ctx.lineWidth = 1.4
      ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.stroke()
      ctx.fillStyle = rgba(col, pal.tone === 'light' ? 0.08 : 0.06)
      ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.fill()
    }
    centerScrim(ctx, pal, 0.22, 0.12)
  },
})

// ============================================================================
// tech-hud — tablero de datos sobrio (variante mas "fintech")
// ============================================================================

register({
  id: 'bg.finanzas.tickerwall', lib: 'backgrounds', category: 'tech-hud', tones: ['dark', 'light'], rubros: RUBROS, weight: 0.8,
  register: 'neutral', intensity: 'medium', temp: 'cool', tags: ['finanzas', 'ticker', 'fintech', 'tablero'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'tick')
    rampBg(ctx, pal)
    // filas de "ticks" tipo tablero de cotizaciones que se desplazan (arriba y abajo, no en el centro)
    const rows = [H * 0.1, H * 0.18, H * 0.82, H * 0.9]
    for (let ri = 0; ri < rows.length; ri++) {
      const y = rows[ri]
      const dir = ri % 2 ? -1 : 1
      const speed = (12 + ri * 4) * CLK
      const off = (t * speed * dir) % 64
      ctx.font = '600 11px monospace'
      for (let x = -64 + off; x < W + 64; x += 64) {
        const up = ((x * 13 + ri * 7) % 100) > 50
        const col = detail(pal, !up)
        ctx.fillStyle = rgba(col, pal.tone === 'light' ? 0.4 : 0.36)
        // marca abstracta (no texto real): un guion + triangulo
        ctx.fillRect(x, y - 1, 16, 2)
        ctx.beginPath()
        if (up) { ctx.moveTo(x + 22, y + 4); ctx.lineTo(x + 27, y - 4); ctx.lineTo(x + 32, y + 4) }
        else { ctx.moveTo(x + 22, y - 4); ctx.lineTo(x + 27, y + 4); ctx.lineTo(x + 32, y - 4) }
        ctx.closePath(); ctx.fill()
      }
    }
    centerScrim(ctx, pal, 0.16, 0.06)
  },
})
