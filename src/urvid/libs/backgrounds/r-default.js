// urvid 1.0 · BACKGROUNDS — tanda rubro DEFAULT (archivo propio, no pisa index.js ni otros agentes).
// Fondos universales/versatiles: gradientes, geometrico sutil, organico, lineas, texturas. Sirven para
// cualquier marca. Contrato: render(ctx, t, env) full-canvas, usa env.pal (bg0/bg1 base + accent/accent2
// detalle), DETERMINISTA (mulberry32(env.seed)/seedFor; motion solo por t), centro SUAVE (no mata el texto).
import { register } from '../../core/registry.js'
import { mulberry32, range, seedFor } from '../../core/prng.js'
import { W, H, TAU, rgba, lighten, darken, clamp, lerp } from '../../core/util.js'

const CLK = 0.6

// rampa base bg0->bg1 (compartida, no la repetimos en cada modulo)
function rampV(ctx, pal) {
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, pal.bg0); g.addColorStop(1, pal.bg1)
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
}
// scrim de legibilidad: oscurece (dark) o aclara (light) hacia los bordes, centro limpio.
function centerScrim(ctx, pal, edge = 1) {
  const v = ctx.createRadialGradient(W / 2, H * 0.46, H * 0.28, W / 2, H * 0.5, H * 0.82)
  v.addColorStop(0, 'rgba(0,0,0,0)')
  v.addColorStop(1, pal.tone === 'light' ? `rgba(255,255,255,${0.2 * edge})` : `rgba(0,0,0,${0.42 * edge})`)
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H)
}

// ============================================================================
// gradient-fields — degrades suaves, universales
// ============================================================================

// 1) Degrade diagonal sereno con un velo de acento muy tenue en una esquina.
register({
  id: 'bg.default.softdiagonal', lib: 'backgrounds', category: 'gradient-fields',
  tones: ['dark', 'light'], rubros: ['default', 'default'], weight: 1.1,
  register: 'neutral', intensity: 'calm', tags: ['gradiente', 'universal', 'calmo', 'diagonal'],
  render(ctx, t, env) {
    const { pal } = env
    const drift = Math.sin(t * CLK * 0.18) * 0.04
    const g = ctx.createLinearGradient(0, 0, W, H)
    g.addColorStop(0, pal.bg0)
    g.addColorStop(clamp(0.55 + drift, 0.4, 0.7), pal.tone === 'light' ? lighten(pal.bg1, 0.02) : pal.bg1)
    g.addColorStop(1, pal.tone === 'light' ? pal.bg1 : darken(pal.bg1, 0.12))
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    // velo de acento en la esquina inferior, respira lento
    const br = 0.5 + 0.5 * Math.sin(t * CLK * 0.3)
    const gr = ctx.createRadialGradient(W * 0.85, H * 0.9, 0, W * 0.85, H * 0.9, H * 0.55)
    gr.addColorStop(0, rgba(pal.accent, (pal.tone === 'light' ? 0.07 : 0.12) * (0.7 + 0.3 * br)))
    gr.addColorStop(1, rgba(pal.accent, 0))
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H)
  },
})

// 2) Dos halos de acento opuestos que respiran (mesh minimalista, centro libre).
register({
  id: 'bg.default.twinhalo', lib: 'backgrounds', category: 'gradient-fields',
  tones: ['dark', 'light'], rubros: ['default', 'default'], weight: 1.0,
  register: 'neutral', intensity: 'soft', tags: ['gradiente', 'halo', 'suave', 'universal'],
  render(ctx, t, env) {
    const { pal } = env
    rampV(ctx, pal)
    ctx.save(); ctx.globalCompositeOperation = pal.tone === 'light' ? 'multiply' : 'lighter'
    const spots = [
      { x: 0.18, y: 0.16, col: pal.accent, ph: 0 },
      { x: 0.82, y: 0.86, col: pal.accent2, ph: Math.PI },
    ]
    for (const s of spots) {
      const breathe = 0.86 + 0.14 * Math.sin(t * CLK * 0.34 + s.ph)
      const rad = H * 0.5 * breathe
      const bx = W * s.x + Math.sin(t * CLK * 0.2 + s.ph) * 16
      const by = H * s.y + Math.cos(t * CLK * 0.16 + s.ph) * 14
      const gr = ctx.createRadialGradient(bx, by, 0, bx, by, rad)
      gr.addColorStop(0, rgba(s.col, pal.tone === 'light' ? 0.12 : 0.18))
      gr.addColorStop(1, rgba(s.col, 0))
      ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H)
    }
    ctx.restore()
    centerScrim(ctx, pal, 0.7)
  },
})

// 3) Velo vertical tipo "amanecer": banda de acento horizontal baja que se asienta abajo.
register({
  id: 'bg.default.horizonveil', lib: 'backgrounds', category: 'gradient-fields',
  tones: ['dark', 'light'], rubros: ['default', 'default'], weight: 0.95,
  register: 'editorial', intensity: 'calm', tags: ['gradiente', 'horizonte', 'editorial', 'sereno'],
  render(ctx, t, env) {
    const { pal } = env
    rampV(ctx, pal)
    const hy = H * (0.72 + Math.sin(t * CLK * 0.12) * 0.015)
    const band = ctx.createLinearGradient(0, hy - H * 0.28, 0, hy + H * 0.2)
    band.addColorStop(0, rgba(pal.accent, 0))
    band.addColorStop(0.6, rgba(pal.accent, pal.tone === 'light' ? 0.08 : 0.13))
    band.addColorStop(1, rgba(pal.accent2, pal.tone === 'light' ? 0.05 : 0.08))
    ctx.fillStyle = band; ctx.fillRect(0, hy - H * 0.28, W, H * 0.48)
    // linea-horizonte fina
    ctx.strokeStyle = rgba(pal.accent, pal.tone === 'light' ? 0.18 : 0.26); ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(0, hy); ctx.lineTo(W, hy); ctx.stroke()
  },
})

// ============================================================================
// geometric-graphic — sutil, swiss, neutro
// ============================================================================

// 4) Lineas verticales finas de paso variable (ritmo tipografico), drift horizontal lento.
register({
  id: 'bg.default.pinstripes', lib: 'backgrounds', category: 'geometric-graphic',
  tones: ['dark', 'light'], rubros: ['default', 'default'], weight: 0.95,
  register: 'editorial', intensity: 'calm', tags: ['geometrico', 'lineas', 'swiss', 'ritmo'],
  render(ctx, t, env) {
    const { pal } = env, r = mulberry32(env.seed)
    rampV(ctx, pal)
    const base = 26 + (r() * 8 | 0)
    const off = (t * CLK * 5) % base
    const col = pal.tone === 'light' ? '#000' : '#fff'
    for (let i = 0, x = -off; x < W + base; x += base, i++) {
      // las del centro mas tenues (cuidan el texto), las de los bordes mas marcadas
      const edge = clamp(Math.abs((x - W / 2) / (W / 2)), 0, 1)
      const a = (pal.tone === 'light' ? 0.03 : 0.05) + edge * (pal.tone === 'light' ? 0.05 : 0.07)
      ctx.strokeStyle = rgba(col, a)
      ctx.lineWidth = i % 5 === 0 ? 1.6 : 1
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke()
    }
  },
})

// 5) Marco de regla / encuadre editorial con ticks que respiran (minimal, bordes).
register({
  id: 'bg.default.framerule', lib: 'backgrounds', category: 'geometric-graphic',
  tones: ['dark', 'light'], rubros: ['default', 'default'], weight: 0.9,
  register: 'corporate', intensity: 'calm', tags: ['geometrico', 'marco', 'editorial', 'minimal'],
  render(ctx, t, env) {
    const { pal } = env
    rampV(ctx, pal)
    const m = 26
    const line = pal.tone === 'light' ? darken(pal.bg1, 0.45) : lighten(pal.bg1, 0.5)
    ctx.strokeStyle = rgba(line, pal.tone === 'light' ? 0.3 : 0.34); ctx.lineWidth = 1.2
    ctx.strokeRect(m, m, W - m * 2, H - m * 2)
    // ticks que recorren el borde superior e inferior (vida)
    const span = W - m * 2, n = 16
    const slide = (t * CLK * 0.08) % (span / n)
    ctx.strokeStyle = rgba(pal.accent, pal.tone === 'light' ? 0.4 : 0.5)
    for (let i = 0; i <= n; i++) {
      const x = m + (i * span / n + slide) % span
      ctx.beginPath(); ctx.moveTo(x, m); ctx.lineTo(x, m + 7); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(x, H - m); ctx.lineTo(x, H - m - 7); ctx.stroke()
    }
    // crucetas en las esquinas
    ctx.strokeStyle = rgba(pal.accent2, pal.tone === 'light' ? 0.45 : 0.55)
    const cross = (cx, cy) => { ctx.beginPath(); ctx.moveTo(cx - 5, cy); ctx.lineTo(cx + 5, cy); ctx.moveTo(cx, cy - 5); ctx.lineTo(cx, cy + 5); ctx.stroke() }
    cross(m, m); cross(W - m, m); cross(m, H - m); cross(W - m, H - m)
  },
})

// 6) Arcos concentricos suaves anclados en una esquina (geometria amable).
register({
  id: 'bg.default.cornerarcs', lib: 'backgrounds', category: 'geometric-graphic',
  tones: ['dark', 'light'], rubros: ['default', 'default'], weight: 0.9,
  register: 'friendly', intensity: 'soft', tags: ['geometrico', 'arcos', 'amable', 'universal'],
  render(ctx, t, env) {
    const { pal } = env, r = mulberry32(env.seed)
    rampV(ctx, pal)
    // ancla en la esquina superior izquierda o inferior derecha (estable por seed)
    const topLeft = r() < 0.5
    const cx = topLeft ? -W * 0.1 : W * 1.1, cy = topLeft ? -H * 0.06 : H * 1.06
    const n = 7
    const pulse = (t * CLK * 0.12) % 1
    for (let i = 0; i < n; i++) {
      const k = (i + pulse) / n
      const rad = H * (0.2 + k * 1.1)
      const col = i % 2 ? pal.accent2 : pal.accent
      ctx.strokeStyle = rgba(col, (pal.tone === 'light' ? 0.16 : 0.2) * (1 - k * 0.7))
      ctx.lineWidth = 1.6
      ctx.beginPath(); ctx.arc(cx, cy, rad, 0, TAU); ctx.stroke()
    }
    centerScrim(ctx, pal, 0.55)
  },
})

// 7) Mosaico de cuadros tenues (tile suizo) con uno de acento que "viaja".
register({
  id: 'bg.default.quietmosaic', lib: 'backgrounds', category: 'geometric-graphic',
  tones: ['dark', 'light'], rubros: ['default', 'default'], weight: 0.85,
  register: 'corporate', intensity: 'calm', tags: ['geometrico', 'mosaico', 'grilla', 'sutil'],
  render(ctx, t, env) {
    const { pal } = env
    rampV(ctx, pal)
    const cell = 48
    const cols = Math.ceil(W / cell), rows = Math.ceil(H / cell)
    const stroke = pal.tone === 'light' ? '#000' : '#fff'
    ctx.lineWidth = 1
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const edge = clamp(Math.abs((i * cell + cell / 2 - W / 2) / (W / 2)), 0, 1)
      ctx.strokeStyle = rgba(stroke, (pal.tone === 'light' ? 0.025 : 0.04) + edge * 0.03)
      ctx.strokeRect(i * cell, j * cell, cell, cell)
    }
    // celda de acento que recorre la grilla en orden estable
    const total = cols * rows
    const idx = Math.floor((t * CLK * 0.5) % total)
    const ix = idx % cols, iy = Math.floor(idx / cols) % rows
    ctx.fillStyle = rgba(pal.accent, pal.tone === 'light' ? 0.1 : 0.14)
    ctx.fillRect(ix * cell + 2, iy * cell + 2, cell - 4, cell - 4)
  },
})

// ============================================================================
// generative-art / lineas — organico controlado
// ============================================================================

// ruido suave determinista (suma de senos sembrados) -> campo escalar en [0,1]
function noiseField(seed, oct = 2) {
  const r = mulberry32(seed)
  const waves = []
  for (let i = 0; i < oct; i++) waves.push({ fx: range(r, 0.5, 1.8) * (i + 1) / W, fy: range(r, 0.5, 1.8) * (i + 1) / H, ph: r() * TAU, a: 1 / (i + 1) })
  let norm = 0; for (const w of waves) norm += w.a
  return (x, y) => { let s = 0; for (const w of waves) s += w.a * Math.sin(x * w.fx * TAU + y * w.fy * TAU + w.ph); return 0.5 + 0.5 * (s / norm) }
}

// 8) Lineas horizontales onduladas (topografia tranquila), comprimidas hacia los bordes.
register({
  id: 'bg.default.calmwaves', lib: 'backgrounds', category: 'generative-art',
  tones: ['dark', 'light'], rubros: ['default', 'default'], weight: 0.95,
  register: 'editorial', intensity: 'soft', tags: ['lineas', 'ondas', 'organico', 'sereno'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'cw')
    rampV(ctx, pal)
    const lines = 26, ampBase = 10 + r() * 8
    const phase = t * CLK * 0.5
    for (let i = 0; i < lines; i++) {
      const y0 = (i / (lines - 1)) * H
      // amplitud crece hacia arriba/abajo, casi nula en el centro (texto seguro)
      const centerDist = Math.abs(y0 - H / 2) / (H / 2)
      const amp = ampBase * (0.25 + centerDist * 0.9)
      const col = i % 4 === 0 ? pal.accent : (pal.tone === 'light' ? darken(pal.bg1, 0.5) : lighten(pal.bg1, 0.6))
      ctx.strokeStyle = rgba(col, (pal.tone === 'light' ? 0.16 : 0.2) * (0.4 + centerDist * 0.8))
      ctx.lineWidth = i % 4 === 0 ? 1.4 : 1
      ctx.beginPath()
      for (let x = 0; x <= W; x += 10) {
        const y = y0 + Math.sin(x * 0.012 + i * 0.4 + phase) * amp + Math.sin(x * 0.03 + i) * amp * 0.3
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
  },
})

// 9) Flowfield tenue: trazos cortos que siguen un campo de ruido, densidad baja en el centro.
register({
  id: 'bg.default.driftstrokes', lib: 'backgrounds', category: 'generative-art',
  tones: ['dark', 'light'], rubros: ['default', 'default'], weight: 0.85,
  register: 'neutral', intensity: 'soft', tags: ['generativo', 'flowfield', 'lineas', 'organico'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'ds')
    rampV(ctx, pal)
    const field = noiseField(env.seed ^ 0x2c1a, 2)
    const N = 46, steps = 22, dt = 6
    ctx.lineCap = 'round'
    ctx.globalCompositeOperation = pal.tone === 'light' ? 'multiply' : 'screen'
    for (let i = 0; i < N; i++) {
      let x = r() * W, y = r() * H
      const col = i % 3 === 0 ? pal.accent2 : pal.accent
      ctx.strokeStyle = rgba(col, pal.tone === 'light' ? 0.16 : 0.22)
      ctx.lineWidth = 1.2
      ctx.beginPath(); ctx.moveTo(x, y)
      for (let s = 0; s < steps; s++) {
        const ang = field(x, y) * TAU * 2 + t * CLK * 0.2
        x += Math.cos(ang) * dt; y += Math.sin(ang) * dt
        if (x < -10 || x > W + 10 || y < -10 || y > H + 10) break
        ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    ctx.globalCompositeOperation = 'source-over'
    centerScrim(ctx, pal, 0.85)
  },
})

// 10) Constelacion: nodos sembrados con lineas a vecinos cercanos (red sutil).
register({
  id: 'bg.default.constellation', lib: 'backgrounds', category: 'generative-art',
  tones: ['dark', 'light'], rubros: ['default', 'default'], weight: 0.9,
  register: 'corporate', intensity: 'soft', tags: ['red', 'nodos', 'conexion', 'tech-neutro'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'cn')
    rampV(ctx, pal)
    const M = 18
    const pts = Array.from({ length: M }, () => ({ x: r() * W, y: r() * H, ph: r() * TAU, sp: range(r, 0.2, 0.6) }))
    const now = pts.map(p => ({
      x: p.x + Math.cos(t * CLK * p.sp + p.ph) * 14,
      y: p.y + Math.sin(t * CLK * p.sp * 0.8 + p.ph) * 14,
    }))
    // aristas a vecinos cercanos
    ctx.lineWidth = 1
    for (let i = 0; i < M; i++) for (let j = i + 1; j < M; j++) {
      const dx = now[i].x - now[j].x, dy = now[i].y - now[j].y
      const d = Math.hypot(dx, dy)
      if (d > H * 0.2) continue
      const a = (1 - d / (H * 0.2)) * (pal.tone === 'light' ? 0.14 : 0.18)
      ctx.strokeStyle = rgba(pal.accent, a)
      ctx.beginPath(); ctx.moveTo(now[i].x, now[i].y); ctx.lineTo(now[j].x, now[j].y); ctx.stroke()
    }
    // nodos
    for (let i = 0; i < M; i++) {
      ctx.fillStyle = rgba(i % 4 === 0 ? pal.accent2 : pal.accent, pal.tone === 'light' ? 0.4 : 0.5)
      ctx.beginPath(); ctx.arc(now[i].x, now[i].y, i % 4 === 0 ? 3 : 2, 0, TAU); ctx.fill()
    }
    centerScrim(ctx, pal, 0.6)
  },
})

// ============================================================================
// atmospheric-organic — luz / niebla / particulas suaves
// ============================================================================

// 11) Bruma suave: capas de niebla que se deslizan (premium, calmo).
register({
  id: 'bg.default.softhaze', lib: 'backgrounds', category: 'atmospheric-organic',
  tones: ['dark', 'light'], rubros: ['default', 'default'], weight: 1.0,
  register: 'editorial', intensity: 'calm', tags: ['atmosferico', 'niebla', 'premium', 'calmo'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'hz')
    rampV(ctx, pal)
    ctx.globalCompositeOperation = pal.tone === 'light' ? 'multiply' : 'screen'
    const layers = 4
    for (let i = 0; i < layers; i++) {
      const ph = r() * TAU
      const y = H * (0.2 + i * 0.2) + Math.sin(t * CLK * 0.18 + ph) * 24
      const h = H * 0.32
      const col = i % 2 ? pal.accent2 : pal.accent
      const g = ctx.createLinearGradient(0, y - h, 0, y + h)
      g.addColorStop(0, rgba(col, 0))
      g.addColorStop(0.5, rgba(col, pal.tone === 'light' ? 0.05 : 0.08))
      g.addColorStop(1, rgba(col, 0))
      ctx.fillStyle = g; ctx.fillRect(0, y - h, W, h * 2)
    }
    ctx.globalCompositeOperation = 'source-over'
    centerScrim(ctx, pal, 0.5)
  },
})

// 12) Bokeh / particulas flotantes desenfocadas (vida ambiental, bordes).
register({
  id: 'bg.default.floatmotes', lib: 'backgrounds', category: 'atmospheric-organic',
  tones: ['dark', 'light'], rubros: ['default', 'default'], weight: 0.85,
  register: 'friendly', intensity: 'soft', tags: ['atmosferico', 'particulas', 'bokeh', 'amable'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'fm')
    rampV(ctx, pal)
    ctx.globalCompositeOperation = pal.tone === 'light' ? 'multiply' : 'lighter'
    const N = 22
    for (let i = 0; i < N; i++) {
      const bx0 = r() * W, by0 = r() * H, sz = range(r, 6, 26), ph = r() * TAU, sp = range(r, 0.1, 0.4)
      const bx = bx0 + Math.cos(t * CLK * sp + ph) * 18
      const by = (by0 - t * CLK * sp * 24) % (H + 60)
      const y = by < -30 ? by + H + 60 : by
      const col = i % 3 === 0 ? pal.accent2 : pal.accent
      const g = ctx.createRadialGradient(bx, y, 0, bx, y, sz)
      g.addColorStop(0, rgba(col, pal.tone === 'light' ? 0.1 : 0.14))
      g.addColorStop(1, rgba(col, 0))
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, y, sz, 0, TAU); ctx.fill()
    }
    ctx.globalCompositeOperation = 'source-over'
    centerScrim(ctx, pal, 0.55)
  },
})

// 13) Spotlight central calido que respira (escenario neutro, centro luminoso suave).
register({
  id: 'bg.default.gentlespot', lib: 'backgrounds', category: 'atmospheric-organic',
  tones: ['dark', 'light'], rubros: ['default', 'default'], weight: 0.9,
  register: 'editorial', intensity: 'calm', tags: ['atmosferico', 'spotlight', 'escenario', 'sereno'],
  render(ctx, t, env) {
    const { pal } = env
    const cx = W / 2 + Math.sin(t * CLK * 0.2) * 14, cy = H * 0.44
    rampV(ctx, pal)
    const breathe = 0.92 + 0.08 * Math.sin(t * CLK * 0.4)
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, H * 0.7 * breathe)
    if (pal.tone === 'light') {
      g.addColorStop(0, rgba('#ffffff', 0.4)); g.addColorStop(0.5, rgba('#ffffff', 0.12)); g.addColorStop(1, 'rgba(255,255,255,0)')
    } else {
      g.addColorStop(0, rgba(lighten(pal.bg0, 0.25), 0.5)); g.addColorStop(0.5, rgba(lighten(pal.bg0, 0.08), 0.2)); g.addColorStop(1, 'rgba(0,0,0,0)')
    }
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    // tinte de acento muy leve en el halo
    const gl = ctx.createRadialGradient(cx, cy, 0, cx, cy, H * 0.3)
    gl.addColorStop(0, rgba(pal.accent, pal.tone === 'light' ? 0.05 : 0.08)); gl.addColorStop(1, rgba(pal.accent, 0))
    ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H)
    // vineta de borde para encajonar
    const v = ctx.createRadialGradient(W / 2, H * 0.5, H * 0.4, W / 2, H * 0.5, H * 0.9)
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, pal.tone === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.42)')
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H)
  },
})

// ============================================================================
// texturas — grano / papel sutil
// ============================================================================

// 14) Textura de puntos finos en degrade diagonal (grano impreso suave, neutro).
register({
  id: 'bg.default.finegrain', lib: 'backgrounds', category: 'texture-surface',
  tones: ['dark', 'light'], rubros: ['default', 'default'], weight: 0.85,
  register: 'corporate', intensity: 'calm', tags: ['textura', 'grano', 'puntos', 'sutil'],
  render(ctx, t, env) {
    const { pal } = env
    rampV(ctx, pal)
    const step = 9
    const ux = Math.cos(Math.PI / 5), uy = Math.sin(Math.PI / 5)
    const drift = t * CLK * 0.15
    const dotCol = pal.tone === 'light' ? '#000' : '#fff'
    for (let y = 0; y < H + step; y += step) for (let x = 0; x < W + step; x += step) {
      const px = x + ((y / step) % 2) * (step / 2)
      const proj = (px * ux + y * uy) / (W * ux + H * uy)
      const dens = clamp(0.5 + 0.5 * Math.sin(proj * Math.PI * 1.3 - drift), 0, 1)
      // centro mas limpio
      const edge = clamp(Math.abs((px - W / 2) / (W / 2)), 0, 1)
      const rad = dens * (step * 0.22) * (0.5 + edge * 0.8)
      if (rad < 0.4) continue
      ctx.fillStyle = rgba(dotCol, (pal.tone === 'light' ? 0.05 : 0.07) * (0.5 + edge * 0.7))
      ctx.beginPath(); ctx.arc(px, y, rad, 0, TAU); ctx.fill()
    }
  },
})

// 15) Bandas suaves apiladas (layers tipo papel doblado), centro plano.
register({
  id: 'bg.default.papershelf', lib: 'backgrounds', category: 'texture-surface',
  tones: ['dark', 'light'], rubros: ['default', 'default'], weight: 0.85,
  register: 'editorial', intensity: 'calm', tags: ['textura', 'capas', 'bandas', 'editorial'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'ps')
    rampV(ctx, pal)
    const n = 6
    const slide = Math.sin(t * CLK * 0.1) * 6
    for (let i = 0; i < n; i++) {
      const y = (i / n) * H + slide * (i % 2 ? 1 : -1)
      const h = H / n
      const lift = pal.tone === 'light' ? (i % 2 ? 0.012 : -0.01) : (i % 2 ? 0.04 : -0.03)
      const c = lift >= 0 ? lighten(pal.bg0, lift) : darken(pal.bg0, -lift)
      ctx.fillStyle = c; ctx.fillRect(0, y, W, h + 1)
      // borde-sombra fino entre capas
      ctx.fillStyle = pal.tone === 'light' ? 'rgba(0,0,0,0.035)' : 'rgba(0,0,0,0.18)'
      ctx.fillRect(0, y, W, 1.5)
    }
    // acento en el borde de una capa (estable por seed)
    const ai = 1 + (r() * (n - 2) | 0)
    ctx.fillStyle = rgba(pal.accent, pal.tone === 'light' ? 0.5 : 0.6)
    ctx.fillRect(0, (ai / n) * H, W * 0.18, 2.5)
    centerScrim(ctx, pal, 0.35)
  },
})
