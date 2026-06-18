// urvid 1.0 · biblioteca BACKGROUNDS — pintores de fondo full-canvas. Cada modulo: render(ctx, t, env).
// env = { pal, content, seed, energy, sceneDur }. Puro + determinista (mulberry32(env.seed) para layout estable,
// t para motion). Consume la PALETA (no hardcodea color). El director elige uno por video segun tono/rubro.
// ESTE archivo es la PLANTILLA que los agentes siguen para llenar las ~11 categorias con cientos de modulos.
import { register } from '../../core/registry.js'
import { mulberry32, range, seedFor } from '../../core/prng.js'
import { W, H, TAU, rgba, lighten, darken, clamp, lerp, mix, hexToHsl, hslToHex } from '../../core/util.js'

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

// ============================================================================
// OLA 2
// ============================================================================
// Helpers compartidos de Ola 2 (no pisan los de arriba). rampBg/makeNoise ya existen.

// scrim de legibilidad reutilizable: oscurece (dark) o aclara (light) el centro/borde para que el texto respire.
function scrim(ctx, pal, { centerClear = 0.34, strength = null } = {}) {
  const s = strength == null ? (pal.tone === 'light' ? 0.22 : 0.42) : strength
  const v = ctx.createRadialGradient(W / 2, H * 0.46, H * centerClear, W / 2, H * 0.5, H * 0.82)
  v.addColorStop(0, 'rgba(0,0,0,0)')
  v.addColorStop(1, pal.tone === 'light' ? `rgba(255,255,255,${s})` : `rgba(0,0,0,${s})`)
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H)
}

// ============================================================================
// chrome-y2k — cromo liquido / frutiger-glass / holografico
// ============================================================================

register({
  id: 'bg.chromey2k.liquidchrome', lib: 'backgrounds', category: 'chrome-y2k', tones: ['dark', 'light'], rubros: ['*', 'tech', 'gaming', 'arte', 'moda'], weight: 0.8,
  tags: ['y2k', 'cromo', 'metalico', 'premium'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'chrome')
    // base oscura/clara
    rampBg(ctx, pal)
    // bandas horizontales de "cromo": rampa de luz que sube-baja (sky/horizon clasico Y2K),
    // tintada con los acentos de marca para no ser plata generica.
    const cyc = (v) => 0.5 + 0.5 * Math.sin(v)
    const ph = r() * TAU
    const rows = 26, rh = H / rows
    for (let i = 0; i < rows; i++) {
      const u = i / (rows - 1)
      // perfil de reflexion: dos lobulos (cielo arriba, suelo abajo) que se mueven lento
      const refl = cyc(u * 7.5 + Math.sin(t * CLK * 0.3 + ph) * 1.1 + ph)
      const hot = Math.pow(refl, 2.2)
      // mezcla acento<->acento2 segun banda, brillo segun reflexion
      const base = i % 2 ? pal.accent : pal.accent2
      const col = pal.tone === 'light' ? darken(base, 0.1 + (1 - hot) * 0.35) : lighten(base, hot * 0.7)
      const a = pal.tone === 'light' ? 0.16 + hot * 0.34 : 0.1 + hot * 0.5
      ctx.fillStyle = rgba(col, a)
      ctx.fillRect(0, i * rh, W, rh + 1)
    }
    // linea de horizonte especular (donde cielo y suelo se tocan)
    const hy = H * (0.5 + Math.sin(t * CLK * 0.3 + ph) * 0.05)
    const hg = ctx.createLinearGradient(0, hy - 26, 0, hy + 26)
    hg.addColorStop(0, rgba(pal.accent, 0)); hg.addColorStop(0.5, rgba(pal.tone === 'light' ? '#ffffff' : lighten(pal.accent, 0.6), pal.tone === 'light' ? 0.5 : 0.55)); hg.addColorStop(1, rgba(pal.accent, 0))
    ctx.fillStyle = hg; ctx.fillRect(0, hy - 26, W, 52)
    scrim(ctx, pal, { strength: pal.tone === 'light' ? 0.18 : 0.34 })
  },
})

register({
  id: 'bg.chromey2k.frutigerglass', lib: 'backgrounds', category: 'chrome-y2k', tones: ['dark', 'light'], rubros: ['*', 'tech', 'salud', 'moda'], weight: 0.85,
  tags: ['y2k', 'frutiger', 'glass', 'aqua', 'optimista'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'frut')
    // cielo aqua suave (frutiger aero): rampa fria luminosa
    const g = ctx.createLinearGradient(0, 0, 0, H)
    if (pal.tone === 'light') { g.addColorStop(0, lighten(pal.accent, 0.78)); g.addColorStop(0.55, pal.bg0); g.addColorStop(1, lighten(pal.accent2, 0.5)) }
    else { g.addColorStop(0, darken(pal.accent, 0.55)); g.addColorStop(0.5, pal.bg0); g.addColorStop(1, darken(pal.accent2, 0.35)) }
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    // burbujas de vidrio (orbs) con highlight especular y borde claro
    const M = 5
    const orbs = Array.from({ length: M }, (_, i) => {
      const ph = r() * TAU, sp = range(r, 0.15, 0.45)
      return {
        x: W * (0.18 + r() * 0.64) + Math.cos(t * CLK * sp + ph) * 24,
        y: H * (0.14 + r() * 0.72) + Math.sin(t * CLK * sp * 0.8 + ph) * 30,
        rad: H * (0.07 + r() * 0.1), col: i % 2 ? pal.accent : pal.accent2,
      }
    })
    for (const o of orbs) {
      // cuerpo translucido
      const body = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.rad)
      body.addColorStop(0, rgba(lighten(o.col, 0.4), pal.tone === 'light' ? 0.32 : 0.4))
      body.addColorStop(0.7, rgba(o.col, pal.tone === 'light' ? 0.18 : 0.24))
      body.addColorStop(1, rgba(o.col, 0))
      ctx.fillStyle = body; ctx.beginPath(); ctx.arc(o.x, o.y, o.rad, 0, TAU); ctx.fill()
      // borde de vidrio
      ctx.strokeStyle = rgba(pal.tone === 'light' ? '#ffffff' : lighten(o.col, 0.5), 0.4); ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.arc(o.x, o.y, o.rad * 0.92, 0, TAU); ctx.stroke()
      // highlight especular arriba-izquierda
      const hl = ctx.createRadialGradient(o.x - o.rad * 0.32, o.y - o.rad * 0.4, 0, o.x - o.rad * 0.32, o.y - o.rad * 0.4, o.rad * 0.5)
      hl.addColorStop(0, 'rgba(255,255,255,0.55)'); hl.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = hl; ctx.beginPath(); ctx.arc(o.x - o.rad * 0.32, o.y - o.rad * 0.4, o.rad * 0.5, 0, TAU); ctx.fill()
    }
    // bloom de cielo arriba
    const bl = ctx.createLinearGradient(0, 0, 0, H * 0.4)
    bl.addColorStop(0, rgba('#ffffff', pal.tone === 'light' ? 0.3 : 0.12)); bl.addColorStop(1, rgba('#ffffff', 0))
    ctx.fillStyle = bl; ctx.fillRect(0, 0, W, H * 0.4)
  },
})

register({
  id: 'bg.chromey2k.holofoil', lib: 'backgrounds', category: 'chrome-y2k', tones: ['dark', 'light'], rubros: ['*', 'arte', 'moda', 'gaming', 'eventos'], weight: 0.75,
  tags: ['y2k', 'holografico', 'iridiscente', 'foil'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'holo')
    // base: gris cromo neutro oscuro/claro para que el iris de color destaque (no se mezcla con un bg del mismo hue)
    if (pal.tone === 'light') { ctx.fillStyle = '#e9ecf1'; ctx.fillRect(0, 0, W, H) }
    else { ctx.fillStyle = '#0d0e14'; ctx.fillRect(0, 0, W, H) }
    // foil iridiscente: arco de hue alrededor de la marca, barrido en franjas diagonales gruesas y nitidas.
    const h0 = hexToHsl(pal.accent).h, h1 = hexToHsl(pal.accent2).h
    const hc = (h0 + h1) / 2
    const ang = Math.PI / 4, ux = Math.cos(ang), uy = Math.sin(ang)
    const span = W * ux + H * uy
    const perpx = -uy, perpy = ux
    const L = Math.max(W, H) * 1.6
    const stripe = 30
    const shift = t * CLK * 0.6 + r() * TAU
    for (let p = -span; p < span * 1.2; p += stripe) {
      const u = (p + span) / (2 * span)
      // hue recorre un arco amplio alrededor del centro de marca (+-80) -> iridiscencia clara, anclada
      const hue = hc + Math.sin(u * 7 + shift) * 80 + (h1 - h0) * 0.5 * Math.sin(u * 3 + shift * 0.7)
      const lum = pal.tone === 'light' ? 0.62 : 0.56
      const col = hslToHex(hue, 0.82, lum)
      const a = pal.tone === 'light' ? 0.55 : 0.6
      const px = p * ux, py = p * uy
      ctx.fillStyle = rgba(col, a)
      ctx.beginPath()
      ctx.moveTo(px - perpx * L, py - perpy * L)
      ctx.lineTo(px + perpx * L, py + perpy * L)
      ctx.lineTo(px + perpx * L + ux * stripe, py + perpy * L + uy * stripe)
      ctx.lineTo(px - perpx * L + ux * stripe, py - perpy * L + uy * stripe)
      ctx.closePath(); ctx.fill()
    }
    // brillo especular diagonal que barre (sheen de foil) + ligero highlight blanco
    const sheen = ((t * CLK * 0.12) % 1)
    const sx = lerp(-0.3, 1.3, sheen) * span
    ctx.globalCompositeOperation = 'screen'
    const sgx = sx * ux, sgy = sx * uy
    const sg = ctx.createLinearGradient(sgx - perpx, sgy - perpy, sgx + ux * 120, sgy + uy * 120)
    sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,0.3)'); sg.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H)
    ctx.globalCompositeOperation = 'source-over'
    scrim(ctx, pal, { strength: pal.tone === 'light' ? 0.32 : 0.42 })
  },
})

// ============================================================================
// morph-protagonist — gran silueta del rubro anclada al borde, que morfea; scrim cuida el texto
// ============================================================================

// silueta parametrica del rubro: devuelve una funcion radio(theta) ya morfeada por t, centrada en (cx,cy).
// formas simples y robustas (superellipse / lobulos) que se leen como "objeto del rubro" sin ser literales.
function rubroBlob(ctx, cx, cy, baseR, rubro, t, r, phase) {
  const seedPh = r() * TAU
  // parametros por rubro (lobulos + redondez) -> silueta distinta y reconocible-ish, nunca un blob random
  const profiles = {
    inmobiliaria: { lobes: 4, sharp: 0.55, squash: 1.0 },   // casi cuadrado/casa
    gastronomia: { lobes: 6, sharp: 0.2, squash: 0.92 },    // redondo/plato
    tech: { lobes: 6, sharp: 0.7, squash: 1.0 },            // hexagonal/chip
    salud: { lobes: 4, sharp: 0.15, squash: 1.0 },          // gota/celula
    finanzas: { lobes: 5, sharp: 0.5, squash: 1.0 },        // escudo/pentagono
    moda: { lobes: 3, sharp: 0.25, squash: 1.1 },           // organico estilizado
    default: { lobes: 5, sharp: 0.35, squash: 1.0 },
  }
  const p = profiles[rubro] || profiles.default
  const N = 90
  ctx.beginPath()
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * TAU
    // base lobulada (estrella suave) + morph lento por t
    const lobe = 1 + p.sharp * 0.18 * Math.cos(a * p.lobes + phase + Math.sin(t * CLK * 0.4 + seedPh) * 0.6)
    const wob = 1 + 0.05 * Math.sin(a * 3 + t * CLK * 0.5 + seedPh) + 0.04 * Math.sin(a * 2 - t * CLK * 0.3)
    const rad = baseR * lobe * wob
    const x = cx + Math.cos(a) * rad
    const y = cy + Math.sin(a) * rad * p.squash
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
  }
  ctx.closePath()
}

register({
  id: 'bg.morphhero.cornerblob', lib: 'backgrounds', category: 'morph-protagonist', tones: ['dark', 'light'], rubros: ['*', 'inmobiliaria', 'gastronomia', 'tech', 'salud', 'finanzas', 'moda'], weight: 1,
  tags: ['protagonista', 'morph', 'silueta', 'editorial'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'morphhero')
    const rubro = (env.content && env.content.rubro) || (env.rubro) || 'default'
    rampBg(ctx, pal)
    // silueta protagonista anclada a una esquina (sembrada), grande, que sale del borde
    const corner = (r() * 4) | 0
    const corners = [[0, 0], [W, 0], [W, H], [0, H]]
    const [ax, ay] = corners[corner]
    const baseR = H * 0.42
    const cx = ax + (ax === 0 ? 1 : -1) * baseR * 0.45
    const cy = ay + (ay === 0 ? 1 : -1) * baseR * 0.45
    // relleno con gradiente de marca, opacidad contenida (no compite con el texto)
    const g = ctx.createRadialGradient(cx, cy, baseR * 0.2, cx, cy, baseR * 1.2)
    g.addColorStop(0, rgba(pal.accent, pal.tone === 'light' ? 0.28 : 0.42))
    g.addColorStop(0.7, rgba(pal.accent2, pal.tone === 'light' ? 0.16 : 0.26))
    g.addColorStop(1, rgba(pal.accent2, 0))
    rubroBlob(ctx, cx, cy, baseR, rubro, t, r, 0)
    ctx.fillStyle = g; ctx.fill()
    // contorno fino para definir la silueta
    rubroBlob(ctx, cx, cy, baseR, rubro, t, mulberry32(env.seed ^ 0x1111), 0)
    ctx.strokeStyle = rgba(pal.tone === 'light' ? darken(pal.accent, 0.1) : lighten(pal.accent, 0.3), 0.3); ctx.lineWidth = 2; ctx.stroke()
    // scrim que protege el centro (donde va el texto)
    scrim(ctx, pal, { centerClear: 0.28, strength: pal.tone === 'light' ? 0.16 : 0.3 })
  },
})

register({
  id: 'bg.morphhero.duoblob', lib: 'backgrounds', category: 'morph-protagonist', tones: ['dark', 'light'], rubros: ['*', 'tech', 'finanzas', 'arte', 'moda'], weight: 0.85,
  tags: ['protagonista', 'morph', 'duotono', 'contorno'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'duoblob')
    const rubro = (env.content && env.content.rubro) || (env.rubro) || 'default'
    rampBg(ctx, pal)
    // dos siluetas: una grande arriba (relleno) y una de contorno abajo, ambas saliendo de bordes opuestos
    const topX = W * (0.3 + r() * 0.4), topY = -H * 0.06
    const botX = W * (0.3 + r() * 0.4), botY = H * 1.04
    const R1 = H * 0.34, R2 = H * 0.28
    // arriba: relleno
    rubroBlob(ctx, topX, topY, R1, rubro, t, mulberry32(env.seed ^ 0x2222), 0.4)
    const g1 = ctx.createRadialGradient(topX, topY, 0, topX, topY, R1 * 1.3)
    g1.addColorStop(0, rgba(pal.accent, pal.tone === 'light' ? 0.24 : 0.36)); g1.addColorStop(1, rgba(pal.accent, 0))
    ctx.fillStyle = g1; ctx.fill()
    // abajo: solo contorno (lineas concentricas, "eco")
    for (let k = 0; k < 3; k++) {
      rubroBlob(ctx, botX, botY, R2 - k * 18, rubro, t, mulberry32(env.seed ^ 0x3333), -0.3)
      ctx.strokeStyle = rgba(k % 2 ? pal.accent2 : pal.accent, (pal.tone === 'light' ? 0.26 : 0.34) * (1 - k * 0.22)); ctx.lineWidth = 1.6
      ctx.stroke()
    }
    scrim(ctx, pal, { centerClear: 0.3, strength: pal.tone === 'light' ? 0.14 : 0.28 })
  },
})

// ============================================================================
// light-substrate-paper — familia CLARA: crema editorial, magazine-spread, corporate cards, papel con fibra
// ============================================================================

register({
  id: 'bg.lightpaper.creameditorial', lib: 'backgrounds', category: 'light-substrate-paper', tones: ['light'], rubros: ['*', 'moda', 'arte', 'gastronomia', 'inmobiliaria', 'educacion'], weight: 1.1,
  tags: ['claro', 'editorial', 'crema', 'minimal', 'serio'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'cream')
    // papel crema calido (no blanco puro): toma el hue de marca a baja saturacion, alta luminancia
    const hue = hexToHsl(pal.accent).h
    const paper = hslToHex(hue, 0.1, 0.955)
    ctx.fillStyle = paper; ctx.fillRect(0, 0, W, H)
    // vineta calida muy sutil a los bordes (sensacion de pagina)
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75)
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, rgba(darken(paper, 0.12), 0.5))
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H)
    // marco editorial fino + filete de acento (swiss)
    const m = 26
    ctx.strokeStyle = rgba(pal.ink, 0.18); ctx.lineWidth = 1
    ctx.strokeRect(m, m, W - m * 2, H - m * 2)
    // filete superior de acento que respira
    const breathe = 0.7 + 0.3 * (0.5 + 0.5 * Math.sin(t * CLK * 0.5))
    ctx.fillStyle = rgba(pal.accent, 0.85 * breathe)
    ctx.fillRect(m, m, (W - m * 2) * 0.34, 3)
    // grano de papel ligero (puntos sembrados, estaticos -> textura)
    ctx.fillStyle = rgba(pal.ink, 0.03)
    for (let i = 0; i < 380; i++) ctx.fillRect((r() * W) | 0, (r() * H) | 0, 1, 1)
  },
})

register({
  id: 'bg.lightpaper.magazinespread', lib: 'backgrounds', category: 'light-substrate-paper', tones: ['light'], rubros: ['*', 'moda', 'arte', 'eventos', 'gastronomia'], weight: 0.9,
  tags: ['claro', 'revista', 'spread', 'columnas', 'editorial'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'mag')
    const hue = hexToHsl(pal.accent).h
    const paper = hslToHex(hue, 0.08, 0.965)
    ctx.fillStyle = paper; ctx.fillRect(0, 0, W, H)
    // bloque de color de marca a un lado (spread de revista): columna que ocupa ~38%
    const left = r() < 0.5
    const cw = W * 0.4
    const bx = left ? 0 : W - cw
    const bg = ctx.createLinearGradient(bx, 0, bx + cw, 0)
    bg.addColorStop(0, rgba(pal.accent, left ? 0.16 : 0.06)); bg.addColorStop(1, rgba(pal.accent, left ? 0.06 : 0.16))
    ctx.fillStyle = bg; ctx.fillRect(bx, 0, cw, H)
    // linea de pliegue central (gutter) con sombra suave
    const gx = left ? cw : bx
    const gg = ctx.createLinearGradient(gx - 14, 0, gx + 14, 0)
    gg.addColorStop(0, rgba(pal.ink, 0)); gg.addColorStop(0.5, rgba(pal.ink, 0.08)); gg.addColorStop(1, rgba(pal.ink, 0))
    ctx.fillStyle = gg; ctx.fillRect(gx - 14, 0, 28, H)
    // lineas de "texto" tenues en la columna de papel (baseline grid) -> aire editorial
    const tx = left ? cw + 24 : 24, tw = W - cw - 48
    const baseY = H * 0.18, lineGap = 16
    ctx.fillStyle = rgba(pal.ink, 0.08)
    for (let i = 0; i < 18; i++) {
      const y = baseY + i * lineGap
      if (y > H * 0.85) break
      const w = tw * (0.55 + 0.4 * Math.abs(Math.sin(i * 1.3 + r() * 6)))
      ctx.fillRect(tx, y, w, 4)
    }
    // numero de folio que parpadea muy lento (vida minima)
    ctx.fillStyle = rgba(pal.accent, 0.5 + 0.2 * Math.sin(t * CLK * 0.4))
    ctx.fillRect(left ? W - 40 : 28, H - 34, 16, 3)
  },
})

register({
  id: 'bg.lightpaper.corpcards', lib: 'backgrounds', category: 'light-substrate-paper', tones: ['light'], rubros: ['*', 'finanzas', 'tech', 'inmobiliaria', 'salud', 'educacion'], weight: 0.95,
  tags: ['claro', 'corporativo', 'tarjetas', 'limpio', 'serio'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'cards')
    const hue = hexToHsl(pal.accent).h
    const bg = hslToHex(hue, 0.12, 0.945)
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)
    // tarjetas flotantes con sombra suave (estilo dashboard corporativo claro)
    const cards = [
      { x: 0.08, y: 0.1, w: 0.5, h: 0.16 },
      { x: 0.62, y: 0.12, w: 0.3, h: 0.3 },
      { x: 0.08, y: 0.34, w: 0.46, h: 0.34 },
      { x: 0.62, y: 0.5, w: 0.3, h: 0.2 },
      { x: 0.08, y: 0.74, w: 0.84, h: 0.16 },
    ]
    const float = Math.sin(t * CLK * 0.4) * 3
    cards.forEach((c, i) => {
      const x = c.x * W, y = c.y * H + Math.sin(t * CLK * 0.4 + i) * 2, w = c.w * W, h = c.h * H
      // sombra
      ctx.save()
      ctx.shadowColor = 'rgba(20,16,24,0.12)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 6
      roundRect(ctx, x, y, w, h, 12)
      ctx.fillStyle = '#ffffff'; ctx.fill()
      ctx.restore()
      // detalle en la tarjeta: barra de acento + lineas
      const accent = i % 3 === 0
      ctx.fillStyle = rgba(accent ? pal.accent : pal.accent2, accent ? 0.85 : 0.5)
      ctx.fillRect(x + 12, y + 12, accent ? 28 : 18, 6)
      ctx.fillStyle = rgba(pal.ink, 0.1)
      ctx.fillRect(x + 12, y + h - 18, w * 0.6, 4)
    })
  },
})

// helper de rect redondeado (despues de su 1er uso esta definido por hoisting de funcion)
function roundRect(ctx, x, y, w, h, rad) {
  const rr = Math.min(rad, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

register({
  id: 'bg.lightpaper.fiberkraft', lib: 'backgrounds', category: 'light-substrate-paper', tones: ['light'], rubros: ['*', 'gastronomia', 'arte', 'moda', 'eventos'], weight: 0.85,
  tags: ['claro', 'papel', 'fibra', 'kraft', 'organico'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'fiber')
    const hue = hexToHsl(pal.accent).h
    // papel kraft calido: hue de marca tirado a calido, saturacion baja
    const paper = hslToHex((hue + 20) % 360, 0.18, 0.9)
    ctx.fillStyle = paper; ctx.fillRect(0, 0, W, H)
    // fibras del papel: trazos cortos sembrados en direcciones variadas (estaticos -> textura)
    ctx.lineWidth = 1
    for (let i = 0; i < 520; i++) {
      const x = r() * W, y = r() * H, len = 4 + r() * 12, a = r() * TAU
      const dark = r() < 0.5
      ctx.strokeStyle = rgba(dark ? darken(paper, 0.18) : lighten(paper, 0.5), 0.18)
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); ctx.stroke()
    }
    // mancha de tinta de acento (sello) que respira muy leve
    const sx = W * (0.2 + r() * 0.6), sy = H * (0.15 + r() * 0.7), sr = 40 + r() * 30
    const breathe = 1 + 0.03 * Math.sin(t * CLK * 0.5)
    const st = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr * breathe)
    st.addColorStop(0, rgba(pal.accent, 0.14)); st.addColorStop(0.7, rgba(pal.accent, 0.06)); st.addColorStop(1, rgba(pal.accent, 0))
    ctx.fillStyle = st; ctx.beginPath(); ctx.arc(sx, sy, sr * breathe, 0, TAU); ctx.fill()
    // vineta de pagina
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, H * 0.78)
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, rgba(darken(paper, 0.2), 0.4))
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H)
  },
})

// ============================================================================
// spatial-depth — parallax / faux-3D / horizonte
// ============================================================================

register({
  id: 'bg.spatial.parallaxhills', lib: 'backgrounds', category: 'spatial-depth', tones: ['dark', 'light'], rubros: ['*', 'inmobiliaria', 'eventos', 'educacion'], weight: 0.9,
  tags: ['profundidad', 'parallax', 'horizonte', 'capas'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'hills')
    // cielo: rampa con horizonte
    const sky = ctx.createLinearGradient(0, 0, 0, H)
    if (pal.tone === 'light') { sky.addColorStop(0, lighten(pal.accent, 0.7)); sky.addColorStop(1, pal.bg0) }
    else { sky.addColorStop(0, pal.bg1); sky.addColorStop(1, darken(pal.accent, 0.5)) }
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H)
    // sol/luna detras de las capas
    const sunX = W * (0.3 + r() * 0.4), sunY = H * 0.34
    const sun = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 90)
    sun.addColorStop(0, rgba(pal.accent2, pal.tone === 'light' ? 0.4 : 0.5)); sun.addColorStop(1, rgba(pal.accent2, 0))
    ctx.fillStyle = sun; ctx.fillRect(0, 0, W, H)
    // capas de colinas: cada una mas oscura/clara y desplazada (parallax con t)
    const layers = 4
    for (let l = 0; l < layers; l++) {
      const depth = l / (layers - 1)              // 0 = lejos, 1 = cerca
      const baseY = H * (0.46 + depth * 0.32)
      const amp = 22 + depth * 30
      const drift = Math.sin(t * CLK * 0.18 * (1 + depth)) * (6 + depth * 16)
      const ph = r() * TAU, freq = 0.006 + depth * 0.004
      const col = pal.tone === 'light'
        ? darken(pal.accent, 0.1 + depth * 0.45)
        : lighten(pal.bg0, 0.04 + depth * 0.12)
      ctx.fillStyle = rgba(col, pal.tone === 'light' ? 0.55 + depth * 0.35 : 0.7)
      ctx.beginPath(); ctx.moveTo(0, H)
      for (let x = 0; x <= W; x += 8) {
        const y = baseY + Math.sin(x * freq + ph + drift * 0.02) * amp + Math.sin(x * freq * 2.3 + ph) * amp * 0.3
        ctx.lineTo(x, y)
      }
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill()
    }
    // bruma entre capas para acentuar profundidad
    const haze = ctx.createLinearGradient(0, H * 0.45, 0, H * 0.75)
    haze.addColorStop(0, rgba(pal.tone === 'light' ? '#ffffff' : pal.accent, pal.tone === 'light' ? 0.25 : 0.06)); haze.addColorStop(1, rgba('#ffffff', 0))
    ctx.fillStyle = haze; ctx.fillRect(0, H * 0.45, W, H * 0.3)
  },
})

register({
  id: 'bg.spatial.tunnel', lib: 'backgrounds', category: 'spatial-depth', tones: ['dark', 'light'], rubros: ['*', 'tech', 'gaming', 'finanzas'], weight: 0.85,
  tags: ['profundidad', 'tunel', 'faux-3d', 'punto-de-fuga'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'tunnel')
    rampBg(ctx, pal)
    // punto de fuga (sembrado, hacia el centro-alto donde NO va el texto principal)
    const vx = W * (0.42 + r() * 0.16), vy = H * (0.36 + r() * 0.1)
    // anillos rectangulares que se acercan (scroll con t) -> sensacion de avanzar
    const rings = 16
    const scroll = (t * CLK * 0.5) % 1
    ctx.lineWidth = 1.5
    for (let i = rings; i >= 0; i--) {
      const p = (i + scroll) / rings
      const e = p * p                       // espaciado perspectivo (denso al fondo)
      const w = lerp(8, W * 1.3, e), h = lerp(14, H * 1.3, e)
      const x = vx - w / 2, y = vy - h / 2
      const a = (pal.tone === 'light' ? 0.32 : 0.4) * (1 - p) + 0.05
      ctx.strokeStyle = rgba(i % 3 === 0 ? pal.accent2 : pal.accent, a)
      roundRect(ctx, x, y, w, h, lerp(2, 40, e))
      ctx.stroke()
    }
    // halo en el punto de fuga
    const gl = ctx.createRadialGradient(vx, vy, 0, vx, vy, 120)
    gl.addColorStop(0, rgba(pal.accent, pal.tone === 'light' ? 0.18 : 0.28)); gl.addColorStop(1, rgba(pal.accent, 0))
    ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H)
    scrim(ctx, pal, { centerClear: 0.3 })
  },
})

register({
  id: 'bg.spatial.floatcards', lib: 'backgrounds', category: 'spatial-depth', tones: ['dark', 'light'], rubros: ['*', 'tech', 'finanzas', 'inmobiliaria'], weight: 0.8,
  tags: ['profundidad', 'parallax', 'tarjetas', 'faux-3d'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'floatc')
    rampBg(ctx, pal)
    // tarjetas/paneles a distintas profundidades: las lejanas (chicas, tenues) driftan menos que las cercanas
    const M = 9
    const cards = Array.from({ length: M }, () => {
      const depth = r()                    // 0 lejos .. 1 cerca
      return { depth, x: r() * W, y: r() * H, ph: r() * TAU, w: lerp(40, 130, depth), col: r() < 0.5 ? pal.accent : pal.accent2 }
    }).sort((a, b) => a.depth - b.depth)   // dibujar de lejos a cerca
    for (const c of cards) {
      const par = lerp(6, 30, c.depth)
      const x = c.x + Math.sin(t * CLK * 0.3 + c.ph) * par
      const y = c.y + Math.cos(t * CLK * 0.25 + c.ph) * par * 0.6
      const w = c.w, h = w * 0.62
      const a = lerp(0.06, pal.tone === 'light' ? 0.18 : 0.24, c.depth)
      ctx.save()
      ctx.translate(x, y); ctx.rotate(Math.sin(c.ph) * 0.12)
      // sombra de profundidad (solo las cercanas)
      if (c.depth > 0.5 && pal.tone === 'dark') { ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 8 }
      roundRect(ctx, -w / 2, -h / 2, w, h, 10)
      ctx.fillStyle = rgba(c.col, a); ctx.fill()
      ctx.shadowColor = 'transparent'
      ctx.strokeStyle = rgba(c.col, a + 0.15); ctx.lineWidth = 1; ctx.stroke()
      ctx.restore()
    }
    scrim(ctx, pal, { centerClear: 0.32, strength: pal.tone === 'light' ? 0.16 : 0.3 })
  },
})

// ============================================================================
// generative-art (Ola 2) — truchet / packing tipo poisson / reaction-diffusion-lite
// ============================================================================

register({
  id: 'bg.generative.truchet', lib: 'backgrounds', category: 'generative-art', tones: ['dark', 'light'], rubros: ['*', 'tech', 'arte', 'educacion'], weight: 0.85,
  tags: ['generativo', 'truchet', 'laberinto', 'geometrico'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'truchet')
    rampBg(ctx, pal)
    // grilla de tiles de truchet (arcos de cuarto): cada celda gira 0 o 1 -> patron continuo de curvas.
    const cell = 45
    const cols = Math.ceil(W / cell), rows = Math.ceil(H / cell)
    // patron de orientaciones estable por celda (sembrado), con un lento "flip wave" por t
    ctx.lineCap = 'round'
    const lw = 3
    ctx.lineWidth = lw
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const x = i * cell, y = j * cell
      // bit estable + onda que invierte algunas celdas suavemente
      const base = mulberry32((env.seed ^ (i * 73856093) ^ (j * 19349663)) >>> 0)() < 0.5 ? 0 : 1
      const wave = Math.sin((i + j) * 0.6 + t * CLK * 0.5) > 0.86 ? 1 : 0  // pocas celdas parpadean
      const bit = base ^ wave
      const accent = ((i * 31 + j * 17) % 5 === 0)
      ctx.strokeStyle = rgba(accent ? pal.accent : (pal.tone === 'light' ? darken(pal.bg1, 0.35) : lighten(pal.bg0, 0.22)), accent ? (pal.tone === 'light' ? 0.5 : 0.55) : (pal.tone === 'light' ? 0.18 : 0.2))
      ctx.beginPath()
      if (bit === 0) {
        ctx.arc(x, y, cell / 2, 0, Math.PI / 2)
        ctx.arc(x + cell, y + cell, cell / 2, Math.PI, Math.PI * 1.5)
      } else {
        ctx.arc(x + cell, y, cell / 2, Math.PI / 2, Math.PI)
        ctx.arc(x, y + cell, cell / 2, Math.PI * 1.5, TAU)
      }
      ctx.stroke()
    }
    scrim(ctx, pal, { centerClear: 0.28 })
  },
})

register({
  id: 'bg.generative.poissondots', lib: 'backgrounds', category: 'generative-art', tones: ['dark', 'light'], rubros: ['*', 'tech', 'salud', 'arte'], weight: 0.8,
  tags: ['generativo', 'packing', 'constelacion', 'puntos'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'poisson')
    rampBg(ctx, pal)
    // packing tipo poisson (rechazo): puntos bien espaciados -> constelacion organica, no grilla.
    const pts = []
    const minD = 30, tries = 900
    for (let k = 0; k < tries && pts.length < 90; k++) {
      const x = r() * W, y = r() * H
      let ok = true
      for (const p of pts) { const dx = x - p.x, dy = y - p.y; if (dx * dx + dy * dy < minD * minD) { ok = false; break } }
      if (ok) pts.push({ x, y, ph: r() * TAU, big: r() < 0.18 })
    }
    // conexiones cortas entre vecinos (red)
    ctx.lineWidth = 1
    for (let a = 0; a < pts.length; a++) for (let b = a + 1; b < pts.length; b++) {
      const dx = pts[a].x - pts[b].x, dy = pts[a].y - pts[b].y, d2 = dx * dx + dy * dy
      if (d2 < (minD * 1.9) * (minD * 1.9)) {
        const al = (1 - Math.sqrt(d2) / (minD * 1.9)) * (pal.tone === 'light' ? 0.18 : 0.22)
        ctx.strokeStyle = rgba(pal.accent, al)
        ctx.beginPath(); ctx.moveTo(pts[a].x, pts[a].y); ctx.lineTo(pts[b].x, pts[b].y); ctx.stroke()
      }
    }
    // nodos con pulso (twinkle por t, fase propia)
    for (const p of pts) {
      const pulse = 0.5 + 0.5 * Math.sin(t * CLK * 0.8 + p.ph)
      const rad = (p.big ? 4 : 2) + pulse * 1.5
      ctx.fillStyle = rgba(p.big ? pal.accent2 : pal.accent, (p.big ? 0.7 : 0.45) * (0.6 + 0.4 * pulse))
      ctx.beginPath(); ctx.arc(p.x, p.y, rad, 0, TAU); ctx.fill()
    }
    scrim(ctx, pal, { centerClear: 0.3, strength: pal.tone === 'light' ? 0.18 : 0.3 })
  },
})

register({
  id: 'bg.generative.reactiondiff', lib: 'backgrounds', category: 'generative-art', tones: ['dark', 'light'], rubros: ['*', 'arte', 'salud', 'tech'], weight: 0.7,
  tags: ['generativo', 'reaction-diffusion', 'organico', 'coral'],
  render(ctx, t, env) {
    const { pal } = env
    rampBg(ctx, pal)
    // reaction-diffusion-LITE: en vez de simular (caro/no-determinista-friendly), sintetizamos el LOOK
    // (manchas tipo Turing/coral) con bandas de iso-nivel sobre un campo de ruido sembrado -> patron organico.
    const noise = makeNoise(env.seed ^ 0x7a17, 4)
    const noise2 = makeNoise(env.seed ^ 0x2b9d, 3)
    const bs = 6
    const drift = t * CLK * 0.05
    ctx.globalCompositeOperation = pal.tone === 'light' ? 'multiply' : 'screen'
    for (let y = 0; y < H; y += bs) for (let x = 0; x < W; x += bs) {
      // dos campos combinados -> bordes sinuosos tipo manchas
      const f = noise(x, y + drift * H) * 0.6 + noise2(x * 1.7, y * 1.7 - drift * H) * 0.4
      // funcion de banda: resalta los "bordes" del patron (donde f cruza umbrales) -> lineas de coral
      const band = Math.abs(((f * 6) % 1) - 0.5)   // 0 en el borde, 0.5 en el centro de banda
      const ink = band < 0.12
      if (!ink) continue
      const col = ((x + y) | 0) % 90 < 30 ? pal.accent2 : pal.accent
      const a = (pal.tone === 'light' ? 0.16 : 0.22) * (1 - band / 0.12)
      ctx.fillStyle = rgba(col, a)
      ctx.fillRect(x, y, bs, bs)
    }
    ctx.globalCompositeOperation = 'source-over'
    scrim(ctx, pal, { centerClear: 0.3 })
  },
})
