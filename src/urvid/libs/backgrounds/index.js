// urvid 1.0 · biblioteca BACKGROUNDS — pintores de fondo full-canvas. Cada modulo: render(ctx, t, env).
// env = { pal, content, seed, energy, sceneDur }. Puro + determinista (mulberry32(env.seed) para layout estable,
// t para motion). Consume la PALETA (no hardcodea color). El director elige uno por video segun tono/rubro.
// ESTE archivo es la PLANTILLA que los agentes siguen para llenar las ~11 categorias con cientos de modulos.
import { register } from '../../core/registry.js'
import { mulberry32, range, seedFor } from '../../core/prng.js'
import { W, H, TAU, rgba, lighten, darken, clamp, lerp, mix } from '../../core/util.js'

const CLK = 0.6

register({
  id: 'bg.gradient.mesh', lib: 'backgrounds', category: 'gradient-fields', tones: ['dark', 'light'], rubros: ['*'], weight: 1.4,
  tags: ['calmo', 'universal'],
  render(ctx, t, env) {
    const { pal } = env, r = mulberry32(env.seed)
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, pal.bg0); g.addColorStop(1, pal.bg1)
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    // 4 blobs de acento a la deriva (armonicos de CLK -> no batan), opacidad contenida
    ctx.save(); ctx.globalCompositeOperation = pal.tone === 'light' ? 'multiply' : 'lighter'
    for (let i = 0; i < 4; i++) {
      const ph = r() * TAU, rad = H * (0.34 + r() * 0.22)
      const bx = W * (0.2 + r() * 0.6) + Math.sin(t * CLK * 0.7 + ph) * 26
      const by = H * (0.18 + r() * 0.6) + Math.cos(t * CLK * 0.5 + ph) * 22
      const col = i % 2 ? pal.accent2 : pal.accent
      const gr = ctx.createRadialGradient(bx, by, 0, bx, by, rad)
      gr.addColorStop(0, rgba(col, pal.tone === 'light' ? 0.14 : 0.2)); gr.addColorStop(1, rgba(col, 0))
      ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H)
    }
    ctx.restore()
    // vineta tone-aware (cuida el texto en el centro)
    const v = ctx.createRadialGradient(W / 2, H * 0.46, H * 0.3, W / 2, H * 0.5, H * 0.75)
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, pal.tone === 'light' ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.5)')
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H)
  },
})

register({
  id: 'bg.spotlight.stage', lib: 'backgrounds', category: 'gradient-fields', tones: ['dark'], rubros: ['*'], weight: 1,
  tags: ['editorial', 'dramatico'],
  render(ctx, t, env) {
    const { pal } = env
    ctx.fillStyle = pal.bg1; ctx.fillRect(0, 0, W, H)
    const cx = W / 2 + Math.sin(t * CLK * 0.4) * 24, cy = H * 0.4
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, H * 0.7)
    g.addColorStop(0, lighten(pal.bg0, 0.18)); g.addColorStop(0.5, pal.bg0); g.addColorStop(1, pal.bg1)
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    const gl = ctx.createRadialGradient(cx, cy, 0, cx, cy, 230)
    gl.addColorStop(0, rgba(pal.accent, 0.12)); gl.addColorStop(1, rgba(pal.accent, 0))
    ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H)
  },
})

register({
  id: 'bg.geometric.grid', lib: 'backgrounds', category: 'geometric-graphic', tones: ['dark', 'light'], rubros: ['tech', 'finanzas', 'inmobiliaria', 'educacion', 'default'], weight: 0.9,
  tags: ['tecnico', 'swiss'],
  render(ctx, t, env) {
    const { pal } = env, r = mulberry32(env.seed)
    const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, pal.bg0); g.addColorStop(1, pal.bg1)
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    const step = 34 + (r() * 10 | 0), off = (t * CLK * 6) % step
    ctx.strokeStyle = rgba(pal.tone === 'light' ? '#000' : pal.accent, pal.tone === 'light' ? 0.05 : 0.07); ctx.lineWidth = 1
    for (let x = -off; x < W; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
    for (let y = -off; y < H; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }
    // un nodo de acento que recorre la grilla (vida)
    const nx = Math.round(((0.3 + 0.4 * (0.5 + 0.5 * Math.sin(t * CLK * 0.5))) * W) / step) * step
    const ny = Math.round(((0.3 + 0.4 * (0.5 + 0.5 * Math.cos(t * CLK * 0.4))) * H) / step) * step
    ctx.fillStyle = rgba(pal.accent, 0.6); ctx.beginPath(); ctx.arc(nx, ny, 3, 0, TAU); ctx.fill()
  },
})

// ============================================================================
// generative-art — campos algoritmicos (flowfield / contornos / voronoi / atractor)
// ============================================================================

// fondo base comun para las generativas: rampa vertical bg0->bg1 (no repetir en cada modulo)
function rampBg(ctx, pal) {
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, pal.bg0); g.addColorStop(1, pal.bg1)
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
}
// ruido de gradiente determinista (suma de senos sembrados) -> campo escalar suave en [0,1]
function makeNoise(seed, oct = 3) {
  const r = mulberry32(seed)
  const waves = []
  for (let i = 0; i < oct; i++) waves.push({ fx: range(r, 0.6, 2.4) * (i + 1) / W, fy: range(r, 0.6, 2.4) * (i + 1) / H, ph: r() * TAU, a: 1 / (i + 1) })
  let norm = 0; for (const w of waves) norm += w.a
  return (x, y) => { let s = 0; for (const w of waves) s += w.a * Math.sin(x * w.fx * TAU + y * w.fy * TAU + w.ph); return 0.5 + 0.5 * (s / norm) }
}

register({
  id: 'bg.generative.flowfield', lib: 'backgrounds', category: 'generative-art', tones: ['dark', 'light'], rubros: ['*'], weight: 0.8,
  tags: ['generativo', 'organico', 'lineas'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'flow')
    rampBg(ctx, pal)
    const noise = makeNoise(env.seed ^ 0x9e37, 2)
    const N = 60, steps = 40, dt = 7
    ctx.lineCap = 'round'
    ctx.globalCompositeOperation = pal.tone === 'light' ? 'multiply' : 'screen'
    for (let i = 0; i < N; i++) {
      let x = r() * W, y = r() * H
      const col = i % 3 === 0 ? pal.accent2 : pal.accent
      ctx.lineWidth = pal.tone === 'light' ? 1.6 : 1.4
      ctx.strokeStyle = rgba(col, pal.tone === 'light' ? 0.32 : 0.4)
      ctx.beginPath(); ctx.moveTo(x, y)
      for (let s = 0; s < steps; s++) {
        const ang = noise(x, y) * TAU * 2 + t * CLK * 0.25
        x += Math.cos(ang) * dt; y += Math.sin(ang) * dt
        if (x < -10 || x > W + 10 || y < -10 || y > H + 10) break
        ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    ctx.globalCompositeOperation = 'source-over'
    // scrim de legibilidad al centro (suave -> no borra el campo)
    const v = ctx.createRadialGradient(W / 2, H * 0.46, H * 0.3, W / 2, H * 0.5, H * 0.82)
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, pal.tone === 'light' ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.3)')
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H)
  },
})

register({
  id: 'bg.generative.contours', lib: 'backgrounds', category: 'generative-art', tones: ['dark', 'light'], rubros: ['*', 'inmobiliaria', 'finanzas', 'tech'], weight: 0.9,
  tags: ['generativo', 'topografico', 'mapa'],
  render(ctx, t, env) {
    const { pal } = env
    rampBg(ctx, pal)
    const noise = makeNoise(env.seed ^ 0x51ed, 3)
    const cols = 46, rows = 80, cw = W / cols, ch = H / rows
    // muestrea el campo en una grilla, dibuja iso-lineas por umbral (marching-ish: cruces por celda)
    const drift = t * CLK * 0.08
    const field = []
    for (let j = 0; j <= rows; j++) { const row = []; for (let i = 0; i <= cols; i++) row.push(noise(i * cw, j * ch + drift * H)); field.push(row) }
    const levels = 9
    ctx.lineWidth = 1.3
    for (let l = 1; l < levels; l++) {
      const thr = l / levels
      const k = l / levels
      ctx.strokeStyle = rgba(l % 3 === 0 ? pal.accent : (pal.tone === 'light' ? darken(pal.bg1, 0.4) : lighten(pal.accent, 0.25)), pal.tone === 'light' ? 0.3 + k * 0.18 : 0.34 + k * 0.3)
      ctx.beginPath()
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const a = field[j][i], b = field[j][i + 1], c = field[j + 1][i]
        const x0 = i * cw, y0 = j * ch
        if ((a < thr) !== (b < thr)) { const tt = (thr - a) / (b - a); ctx.moveTo(x0 + tt * cw, y0); ctx.lineTo(x0 + tt * cw, y0 + ch * 0.5) }
        if ((a < thr) !== (c < thr)) { const tt = (thr - a) / (c - a); ctx.moveTo(x0, y0 + tt * ch); ctx.lineTo(x0 + cw * 0.5, y0 + tt * ch) }
      }
      ctx.stroke()
    }
  },
})

register({
  id: 'bg.generative.voronoi', lib: 'backgrounds', category: 'generative-art', tones: ['dark', 'light'], rubros: ['*', 'tech', 'arte'], weight: 0.7,
  tags: ['generativo', 'celdas', 'cristal'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'voro')
    rampBg(ctx, pal)
    const M = 12
    const pts = Array.from({ length: M }, () => ({ x: r() * W, y: r() * H, ph: r() * TAU, sp: range(r, 0.2, 0.6) }))
    // movimiento lento orbital de cada sitio
    const sites = pts.map(p => ({ x: p.x + Math.cos(t * CLK * p.sp + p.ph) * 22, y: p.y + Math.sin(t * CLK * p.sp * 0.8 + p.ph) * 22 }))
    // celdas por muestreo grueso (sin libreria): pintar bloques con tinte segun sitio mas cercano
    const bs = 9
    ctx.globalCompositeOperation = pal.tone === 'light' ? 'multiply' : 'screen'
    for (let y = 0; y < H; y += bs) for (let x = 0; x < W; x += bs) {
      let best = 0, bd = 1e9, second = 1e9
      for (let k = 0; k < sites.length; k++) { const dx = x - sites[k].x, dy = y - sites[k].y, d = dx * dx + dy * dy; if (d < bd) { second = bd; bd = d; best = k } else if (d < second) second = d }
      // bordes: cuando dist al 1ro y 2do sitio son parecidas -> linea
      const edge = clamp(1 - (Math.sqrt(second) - Math.sqrt(bd)) / 14, 0, 1)
      const tint = (best % 2 ? pal.accent : pal.accent2)
      ctx.fillStyle = rgba(tint, (pal.tone === 'light' ? 0.05 : 0.06) + edge * (pal.tone === 'light' ? 0.18 : 0.22))
      ctx.fillRect(x, y, bs, bs)
    }
    ctx.globalCompositeOperation = 'source-over'
  },
})

// NOTA: bg.generative.attractor (de Jong) descartado: rinde hermoso para ~la mitad de las semillas pero
// colapsa a un punto/lazo vacio para la otra mitad (verificado con bg-attr-seeds.png: seeds 1/42/5/88 vacias).
// Un fondo debe verse bien para CUALQUIER semilla -> no pasa el gate. Reincorporable si se acota el espacio de
// parametros a la region "densa" (ej |a|,|c| in [1.2,2.4]) y se verifica de nuevo por semilla.

// ============================================================================
// atmospheric-organic — aurora / godrays / niebla fluida
// ============================================================================

register({
  id: 'bg.atmospheric.aurora', lib: 'backgrounds', category: 'atmospheric-organic', tones: ['dark'], rubros: ['*'], weight: 1.1,
  tags: ['atmosferico', 'premium', 'aurora'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'aur')
    ctx.fillStyle = pal.bg1; ctx.fillRect(0, 0, W, H)
    // cintas verticales de luz que ondulan (suma de senos en x), screen sobre oscuro
    ctx.globalCompositeOperation = 'screen'
    const bands = 5
    for (let i = 0; i < bands; i++) {
      const baseX = W * (0.15 + (i / (bands - 1)) * 0.7) + range(r, -30, 30)
      const ph = r() * TAU, col = i % 2 ? pal.accent : pal.accent2
      const grad = ctx.createLinearGradient(0, 0, 0, H)
      grad.addColorStop(0, rgba(col, 0)); grad.addColorStop(0.35, rgba(col, 0.16)); grad.addColorStop(0.7, rgba(col, 0.1)); grad.addColorStop(1, rgba(col, 0))
      ctx.fillStyle = grad
      ctx.beginPath()
      const wblob = 36 + r() * 26
      ctx.moveTo(baseX, -20)
      for (let y = -20; y <= H + 20; y += 18) {
        const sway = Math.sin(y * 0.012 + t * CLK * 0.5 + ph) * 30 + Math.sin(y * 0.026 + ph * 2) * 14
        ctx.lineTo(baseX + sway - wblob / 2, y)
      }
      for (let y = H + 20; y >= -20; y -= 18) {
        const sway = Math.sin(y * 0.012 + t * CLK * 0.5 + ph) * 30 + Math.sin(y * 0.026 + ph * 2) * 14
        ctx.lineTo(baseX + sway + wblob / 2, y)
      }
      ctx.closePath(); ctx.fill()
    }
    ctx.globalCompositeOperation = 'source-over'
    // bruma inferior
    const g = ctx.createLinearGradient(0, H * 0.55, 0, H)
    g.addColorStop(0, rgba(pal.bg1, 0)); g.addColorStop(1, rgba(pal.bg0, 0.5))
    ctx.fillStyle = g; ctx.fillRect(0, H * 0.55, W, H * 0.45)
  },
})

register({
  id: 'bg.atmospheric.godrays', lib: 'backgrounds', category: 'atmospheric-organic', tones: ['dark', 'light'], rubros: ['*'], weight: 0.85,
  tags: ['atmosferico', 'dramatico', 'luz'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'god')
    rampBg(ctx, pal)
    const ox = W * (0.3 + r() * 0.4), oy = -H * 0.12   // origen arriba
    const rays = 14
    ctx.globalCompositeOperation = pal.tone === 'light' ? 'multiply' : 'screen'
    const baseA = r() * TAU
    for (let i = 0; i < rays; i++) {
      const spread = Math.PI * 0.9
      const ang = (Math.PI / 2) - spread / 2 + (i / (rays - 1)) * spread
      const wob = Math.sin(t * CLK * 0.3 + i) * 0.012
      const a1 = ang + wob - 0.018, a2 = ang + wob + 0.018
      const L = H * 1.4
      const col = i % 5 === 0 ? pal.accent : (pal.tone === 'light' ? darken(pal.accent, 0.15) : lighten(pal.accent, 0.2))
      const alpha = (pal.tone === 'light' ? 0.1 : 0.06) * (0.5 + 0.5 * Math.sin(i * 1.7 + baseA))
      const grad = ctx.createLinearGradient(ox, oy, ox + Math.cos(ang) * L, oy + Math.sin(ang) * L)
      grad.addColorStop(0, rgba(col, alpha * 2)); grad.addColorStop(1, rgba(col, 0))
      ctx.fillStyle = grad
      ctx.beginPath(); ctx.moveTo(ox, oy)
      ctx.lineTo(ox + Math.cos(a1) * L, oy + Math.sin(a1) * L)
      ctx.lineTo(ox + Math.cos(a2) * L, oy + Math.sin(a2) * L)
      ctx.closePath(); ctx.fill()
    }
    ctx.globalCompositeOperation = 'source-over'
    // halo en el origen
    const gl = ctx.createRadialGradient(ox, oy, 0, ox, oy, H * 0.5)
    gl.addColorStop(0, rgba(pal.accent, pal.tone === 'light' ? 0.1 : 0.16)); gl.addColorStop(1, rgba(pal.accent, 0))
    ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H)
  },
})

register({
  id: 'bg.atmospheric.fluid', lib: 'backgrounds', category: 'atmospheric-organic', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['atmosferico', 'fluido', 'organico'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'fluid')
    rampBg(ctx, pal)
    // metaballs suaves a la deriva: radiales acumulados con blend, plumas grandes
    ctx.globalCompositeOperation = pal.tone === 'light' ? 'multiply' : 'screen'
    const M = 6
    for (let i = 0; i < M; i++) {
      const ph = r() * TAU, sp = range(r, 0.18, 0.5)
      const bx = W * (0.2 + r() * 0.6) + Math.cos(t * CLK * sp + ph) * 60
      const by = H * (0.15 + r() * 0.7) + Math.sin(t * CLK * sp * 0.9 + ph) * 70
      const rad = H * (0.22 + r() * 0.22)
      const col = i % 2 ? pal.accent2 : pal.accent
      const gr = ctx.createRadialGradient(bx, by, 0, bx, by, rad)
      gr.addColorStop(0, rgba(col, pal.tone === 'light' ? 0.12 : 0.16)); gr.addColorStop(0.6, rgba(col, pal.tone === 'light' ? 0.05 : 0.06)); gr.addColorStop(1, rgba(col, 0))
      ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H)
    }
    ctx.globalCompositeOperation = 'source-over'
    const v = ctx.createRadialGradient(W / 2, H * 0.5, H * 0.32, W / 2, H * 0.5, H * 0.78)
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, pal.tone === 'light' ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.4)')
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H)
  },
})

// ============================================================================
// retro-print — riso/halftone / sunburst 70s / ben-day
// ============================================================================

register({
  id: 'bg.retroprint.halftone', lib: 'backgrounds', category: 'retro-print', tones: ['dark', 'light'], rubros: ['*', 'arte', 'gastronomia'], weight: 0.9,
  tags: ['retro', 'print', 'puntos'],
  render(ctx, t, env) {
    const { pal } = env
    // fondo plano de papel/tinta
    ctx.fillStyle = pal.tone === 'light' ? pal.bg0 : pal.bg1; ctx.fillRect(0, 0, W, H)
    // gradiente diagonal de densidad: puntos crecen de una esquina a la otra (riso duotono)
    const step = 13, drift = t * CLK * 1.4
    const ang = Math.PI / 5
    const ux = Math.cos(ang), uy = Math.sin(ang)
    ctx.fillStyle = rgba(pal.accent, pal.tone === 'light' ? 0.5 : 0.55)
    for (let y = 0; y < H + step; y += step) for (let x = 0; x < W + step; x += step) {
      const px = x + ((y / step) % 2) * (step / 2)
      // densidad por proyeccion sobre el eje diagonal -> degrade limpio
      const proj = ((px * ux + y * uy) / (W * ux + H * uy))
      const dens = clamp(0.5 + 0.5 * Math.sin(proj * Math.PI * 1.4 - drift * 0.2), 0, 1)
      const rad = dens * (step * 0.52)
      if (rad < 0.5) continue
      ctx.beginPath(); ctx.arc(px, y, rad, 0, TAU); ctx.fill()
    }
    // segundo color desfasado (duotono)
    ctx.fillStyle = rgba(pal.accent2, pal.tone === 'light' ? 0.32 : 0.34)
    for (let y = step / 2; y < H + step; y += step) for (let x = step / 2; x < W + step; x += step) {
      const proj = ((x * ux + y * uy) / (W * ux + H * uy))
      const dens = clamp(0.5 + 0.5 * Math.sin(proj * Math.PI * 1.4 - drift * 0.2 + 2.2), 0, 1)
      const rad = dens * (step * 0.34)
      if (rad < 0.5) continue
      ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.fill()
    }
  },
})

register({
  id: 'bg.retroprint.sunburst', lib: 'backgrounds', category: 'retro-print', tones: ['dark', 'light'], rubros: ['*', 'gastronomia', 'eventos'], weight: 0.85,
  tags: ['retro', '70s', 'rayos'],
  render(ctx, t, env) {
    const { pal } = env
    const cx = W / 2, cy = H * 0.42
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, H * 0.9)
    g.addColorStop(0, pal.tone === 'light' ? lighten(pal.bg0, 0.3) : pal.bg0); g.addColorStop(1, pal.bg1)
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    // cuna de rayos alternados girando muy lento
    const wedges = 24, rot = t * CLK * 0.06
    const R = H * 1.3
    for (let i = 0; i < wedges; i++) {
      if (i % 2) continue
      const a0 = rot + (i / wedges) * TAU, a1 = rot + ((i + 1) / wedges) * TAU
      ctx.fillStyle = rgba(pal.accent, pal.tone === 'light' ? 0.14 : 0.12)
      ctx.beginPath(); ctx.moveTo(cx, cy)
      ctx.lineTo(cx + Math.cos(a0) * R, cy + Math.sin(a0) * R)
      ctx.lineTo(cx + Math.cos(a1) * R, cy + Math.sin(a1) * R)
      ctx.closePath(); ctx.fill()
    }
    // sol central
    const sun = ctx.createRadialGradient(cx, cy, 0, cx, cy, H * 0.16)
    sun.addColorStop(0, rgba(pal.accent2, pal.tone === 'light' ? 0.3 : 0.34)); sun.addColorStop(1, rgba(pal.accent2, 0))
    ctx.fillStyle = sun; ctx.fillRect(0, 0, W, H)
  },
})

register({
  id: 'bg.retroprint.benday', lib: 'backgrounds', category: 'retro-print', tones: ['light'], rubros: ['*', 'arte'], weight: 0.7,
  tags: ['retro', 'comic', 'benday'],
  render(ctx, t, env) {
    const { pal } = env
    ctx.fillStyle = pal.bg0; ctx.fillRect(0, 0, W, H)
    // pop-art ben-day: puntos parejos densos + barra diagonal de acento que barre
    const step = 11
    ctx.fillStyle = rgba(pal.accent, 0.5)
    for (let y = 0; y < H + step; y += step) for (let x = 0; x < W + step; x += step) {
      const px = x + ((y / step) % 2) * (step / 2)
      ctx.beginPath(); ctx.arc(px, y, step * 0.28, 0, TAU); ctx.fill()
    }
    // banda diagonal que cruza (movimiento)
    const sweep = ((t * CLK * 40) % (W + H + 400)) - 200
    ctx.save()
    ctx.translate(sweep, 0); ctx.rotate(-0.5)
    const bw = 120
    const gb = ctx.createLinearGradient(0, 0, bw, 0)
    gb.addColorStop(0, rgba(pal.accent2, 0)); gb.addColorStop(0.5, rgba(pal.accent2, 0.22)); gb.addColorStop(1, rgba(pal.accent2, 0))
    ctx.fillStyle = gb; ctx.fillRect(0, -H, bw, H * 3)
    ctx.restore()
  },
})

// ============================================================================
// tech-hud — cyber-grid / hud-frame / blueprint / CRT
// ============================================================================

register({
  id: 'bg.techhud.cybergrid', lib: 'backgrounds', category: 'tech-hud', tones: ['dark'], rubros: ['tech', 'finanzas', 'gaming', 'default', '*'], weight: 0.9,
  tags: ['tech', 'cyber', 'perspectiva'],
  render(ctx, t, env) {
    const { pal } = env
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, pal.bg1); g.addColorStop(0.5, pal.bg0); g.addColorStop(1, darken(pal.bg1, 0.2))
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    // grilla en perspectiva hacia el horizonte (piso synthwave)
    const horizon = H * 0.5, vp = W / 2
    ctx.strokeStyle = rgba(pal.accent, 0.4); ctx.lineWidth = 1
    // lineas que convergen
    for (let i = -10; i <= 10; i++) {
      ctx.beginPath(); ctx.moveTo(vp, horizon); ctx.lineTo(vp + i * (W / 6), H); ctx.stroke()
    }
    // lineas horizontales que se acercan (scroll con t)
    const scroll = (t * CLK * 0.6) % 1
    for (let j = 0; j < 14; j++) {
      const p = (j + scroll) / 14
      const y = horizon + (H - horizon) * (p * p)
      ctx.strokeStyle = rgba(pal.accent, 0.4 * (1 - p) + 0.08)
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
    }
    // resplandor del horizonte
    const gl = ctx.createLinearGradient(0, horizon - 60, 0, horizon + 30)
    gl.addColorStop(0, rgba(pal.accent2, 0)); gl.addColorStop(1, rgba(pal.accent2, 0.22))
    ctx.fillStyle = gl; ctx.fillRect(0, horizon - 60, W, 90)
    // sol/anillo arriba
    const sun = ctx.createRadialGradient(vp, horizon - 70, 0, vp, horizon - 70, 80)
    sun.addColorStop(0, rgba(pal.accent, 0.3)); sun.addColorStop(1, rgba(pal.accent, 0))
    ctx.fillStyle = sun; ctx.fillRect(0, 0, W, horizon)
  },
})

register({
  id: 'bg.techhud.hud', lib: 'backgrounds', category: 'tech-hud', tones: ['dark'], rubros: ['tech', 'gaming', 'default', '*'], weight: 0.8,
  tags: ['tech', 'hud', 'interfaz'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'hud')
    ctx.fillStyle = pal.bg1; ctx.fillRect(0, 0, W, H)
    // grilla fina de fondo
    ctx.strokeStyle = rgba(pal.accent, 0.05); ctx.lineWidth = 1
    for (let x = 0; x < W; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
    for (let y = 0; y < H; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }
    const m = 22
    ctx.strokeStyle = rgba(pal.accent, 0.55); ctx.lineWidth = 1.5
    // esquinas tipo visor
    const corner = (cx, cy, sx, sy) => { const L = 30; ctx.beginPath(); ctx.moveTo(cx + sx * L, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + sy * L); ctx.stroke() }
    corner(m, m, 1, 1); corner(W - m, m, -1, 1); corner(m, H - m, 1, -1); corner(W - m, H - m, -1, -1)
    // anillo de escaneo rotando
    const cx = W / 2, cy = H * 0.44, R = H * 0.2
    ctx.strokeStyle = rgba(pal.accent, 0.3)
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke()
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.7, 0, TAU); ctx.stroke()
    const sweep = t * CLK
    const sg = ctx.createConicGradient ? null : null
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, sweep, sweep + 0.9); ctx.lineTo(cx, cy); ctx.closePath()
    ctx.fillStyle = rgba(pal.accent2, 0.18); ctx.fill(); ctx.restore()
    // ticks alrededor
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * TAU
      const r0 = R + 6, r1 = R + (i % 3 === 0 ? 14 : 9)
      ctx.strokeStyle = rgba(pal.accent, i % 3 === 0 ? 0.5 : 0.25)
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); ctx.stroke()
    }
  },
})

register({
  id: 'bg.techhud.blueprint', lib: 'backgrounds', category: 'tech-hud', tones: ['dark', 'light'], rubros: ['inmobiliaria', 'tech', 'construccion', 'default', '*'], weight: 0.85,
  tags: ['tech', 'plano', 'blueprint'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'blue')
    // fondo tipo plano: en dark un azul de marca; en light papel
    if (pal.tone === 'light') { ctx.fillStyle = pal.bg0; ctx.fillRect(0, 0, W, H) }
    else { ctx.fillStyle = darken(pal.bg0, 0.1); ctx.fillRect(0, 0, W, H) }
    const lineCol = pal.tone === 'light' ? darken(pal.accent, 0.1) : lighten(pal.accent, 0.15)
    // grilla mayor/menor
    const minor = 16, major = 80
    ctx.lineWidth = 1
    ctx.strokeStyle = rgba(lineCol, pal.tone === 'light' ? 0.1 : 0.12)
    for (let x = 0; x <= W; x += minor) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
    for (let y = 0; y <= H; y += minor) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }
    ctx.strokeStyle = rgba(lineCol, pal.tone === 'light' ? 0.22 : 0.28)
    for (let x = 0; x <= W; x += major) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
    for (let y = 0; y <= H; y += major) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }
    // un par de "figuras tecnicas": circulos con cruz + rectangulos acotados, en posiciones sembradas
    ctx.strokeStyle = rgba(lineCol, pal.tone === 'light' ? 0.4 : 0.5); ctx.lineWidth = 1.4
    const drift = Math.sin(t * CLK * 0.2) * 4
    for (let i = 0; i < 3; i++) {
      const cx = W * (0.2 + r() * 0.6), cy = H * (0.15 + r() * 0.7) + drift, rad = 26 + r() * 30
      ctx.beginPath(); ctx.arc(cx, cy, rad, 0, TAU); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(cx - rad - 8, cy); ctx.lineTo(cx + rad + 8, cy); ctx.moveTo(cx, cy - rad - 8); ctx.lineTo(cx, cy + rad + 8); ctx.stroke()
    }
    for (let i = 0; i < 2; i++) {
      const x = W * (0.1 + r() * 0.5), y = H * (0.2 + r() * 0.6), w = 50 + r() * 60, h = 36 + r() * 40
      ctx.strokeRect(x, y, w, h)
    }
  },
})

register({
  id: 'bg.techhud.crt', lib: 'backgrounds', category: 'tech-hud', tones: ['dark'], rubros: ['*', 'tech', 'gaming', 'arte'], weight: 0.7,
  tags: ['tech', 'crt', 'scanlines', 'retro'],
  render(ctx, t, env) {
    const { pal } = env
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.1, W / 2, H / 2, H * 0.8)
    g.addColorStop(0, lighten(pal.bg0, 0.08)); g.addColorStop(1, pal.bg1)
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    // tinte fosforo
    ctx.fillStyle = rgba(pal.accent, 0.05); ctx.fillRect(0, 0, W, H)
    // scanlines horizontales
    ctx.fillStyle = 'rgba(0,0,0,0.28)'
    for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1.4)
    // barra de roll que baja lento (brillo)
    const roll = (t * CLK * 30) % (H + 160) - 80
    const rg = ctx.createLinearGradient(0, roll, 0, roll + 160)
    rg.addColorStop(0, rgba(pal.accent, 0)); rg.addColorStop(0.5, rgba(pal.accent, 0.06)); rg.addColorStop(1, rgba(pal.accent, 0))
    ctx.fillStyle = rg; ctx.fillRect(0, roll, W, 160)
    // vineta CRT (esquinas redondeadas oscuras)
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.62)
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.6)')
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H)
  },
})

// ============================================================================
// broadcast-news — lower-third / ticker (sustratos de noticiero)
// ============================================================================

register({
  id: 'bg.broadcast.lowerthird', lib: 'backgrounds', category: 'broadcast-news', tones: ['dark', 'light'], rubros: ['*', 'finanzas', 'deportes', 'default'], weight: 0.8,
  tags: ['broadcast', 'noticiero', 'lower-third'],
  render(ctx, t, env) {
    const { pal } = env
    rampBg(ctx, pal)
    // sutil grilla diagonal de fondo
    ctx.strokeStyle = rgba(pal.accent, 0.04); ctx.lineWidth = 1
    for (let i = -H; i < W; i += 26) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + H, H); ctx.stroke() }
    // panel lower-third que entra desde abajo-izquierda
    const slide = clamp(t * CLK * 1.2, 0, 1)
    const ease = 1 - Math.pow(1 - slide, 3)
    const py = H * 0.7, ph = 96, pad = 18
    const pw = (W - pad * 2) * ease
    // barra de acento gruesa
    ctx.fillStyle = pal.accent
    ctx.fillRect(pad, py, 8, ph)
    // panel translucido
    ctx.fillStyle = rgba(pal.tone === 'light' ? '#ffffff' : pal.bg0, 0.82)
    ctx.fillRect(pad + 8, py, Math.max(0, pw - 8), ph)
    // linea fina inferior de acento2
    ctx.fillStyle = rgba(pal.accent2, 0.9)
    ctx.fillRect(pad + 8, py + ph - 4, Math.max(0, pw - 8), 4)
    // brillo que recorre la barra
    const sh = (t * CLK * 90) % (pw + 120) - 60
    if (pw > 20) {
      ctx.save(); ctx.beginPath(); ctx.rect(pad + 8, py, Math.max(0, pw - 8), ph); ctx.clip()
      const sg = ctx.createLinearGradient(pad + sh, 0, pad + sh + 60, 0)
      sg.addColorStop(0, rgba(pal.accent, 0)); sg.addColorStop(0.5, rgba(pal.accent, 0.12)); sg.addColorStop(1, rgba(pal.accent, 0))
      ctx.fillStyle = sg; ctx.fillRect(pad, py, pw, ph); ctx.restore()
    }
  },
})

register({
  id: 'bg.broadcast.ticker', lib: 'backgrounds', category: 'broadcast-news', tones: ['dark', 'light'], rubros: ['*', 'finanzas', 'deportes', 'default'], weight: 0.7,
  tags: ['broadcast', 'ticker', 'cinta'],
  render(ctx, t, env) {
    const { pal } = env
    rampBg(ctx, pal)
    // viñeta superior para asentar el contenido
    const v = ctx.createLinearGradient(0, 0, 0, H * 0.5)
    v.addColorStop(0, pal.tone === 'light' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.3)'); v.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H * 0.5)
    // cinta inferior (ticker) con marcas que se desplazan
    const ty = H - 56, th = 40
    ctx.fillStyle = rgba(pal.bg0, pal.tone === 'light' ? 0.0 : 0.6)
    ctx.fillStyle = pal.accent; ctx.fillRect(0, ty, W, 4)
    ctx.fillStyle = rgba(pal.tone === 'light' ? '#ffffff' : '#000000', pal.tone === 'light' ? 0.5 : 0.5); ctx.fillRect(0, ty + 4, W, th)
    // bloque "EN VIVO" a la izquierda
    ctx.fillStyle = pal.accent2; ctx.fillRect(0, ty + 4, 70, th)
    // segmentos que se desplazan
    const scroll = (t * CLK * 60) % 90
    ctx.fillStyle = rgba(pal.accent, 0.5)
    for (let x = 80 - scroll; x < W; x += 90) ctx.fillRect(x, ty + 16, 46, 6)
    ctx.fillStyle = rgba(pal.tone === 'light' ? pal.ink : pal.dim, 0.4)
    for (let x = 80 - scroll + 50; x < W; x += 90) ctx.fillRect(x, ty + 16, 26, 6)
    // segunda cinta mas fina arriba
    const ty2 = ty - 14
    ctx.fillStyle = rgba(pal.accent, 0.18)
    const scroll2 = (t * CLK * 40) % 60
    for (let x = -scroll2; x < W; x += 60) ctx.fillRect(x, ty2, 30, 3)
  },
})
