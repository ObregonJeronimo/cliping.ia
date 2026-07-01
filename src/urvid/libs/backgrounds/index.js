// urvid 1.0 · biblioteca BACKGROUNDS — pintores de fondo full-canvas. Cada modulo: render(ctx, t, env).
// env = { pal, content, seed, energy, sceneDur }. Puro + determinista (mulberry32(env.seed) para layout estable,
// t para motion). Consume la PALETA (no hardcodea color). El director elige uno por video segun tono/rubro.
// ESTE archivo es la PLANTILLA que los agentes siguen para llenar las ~11 categorias con cientos de modulos.
import { register } from '../../core/registry.js'
import { mulberry32, range, seedFor } from '../../core/prng.js'
import { W, H, TAU, rgba, lighten, darken, clamp, lerp, mix, hexToHsl, hslToHex, hexToOklch, oklchToHex, eOutCubic, eInOutCubic } from '../../core/util.js'
import { getScratch } from '../../core/render.js'   // factory de canvas portatil (para hornear el tile de dither); call diferido a runtime -> sin ciclo
// FONDOS POR RUBRO (jun 2026): +155 fondos especificos por rubro (x2 tonos), un archivo por rubro -> el director
// los prefiere por fit (rubroAffinity) sobre los genericos, asi cada rubro tiene su identidad de fondo en dark Y light.
import './r-tech.js'
import './r-finanzas.js'
import './r-inmobiliaria.js'
import './r-salud.js'
import './r-educacion.js'
import './r-gastronomia.js'
import './r-moda.js'
import './r-belleza.js'
import './r-fitness.js'
import './r-default.js'

const CLK = 0.6

register({
  id: 'bg.gradient.mesh', lib: 'backgrounds', category: 'gradient-fields', tones: ['dark', 'light'], rubros: ['*'], weight: 1.4,
  register: 'neutral', intensity: 'calm', tags: ['calmo', 'universal', 'gradiente'],
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
  register: 'editorial', intensity: 'soft', tags: ['editorial', 'dramatico', 'spotlight'],
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
  register: 'corporate', intensity: 'calm', tags: ['tecnico', 'swiss', 'grilla'],
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
// ANTI-BANDING: un tile Bayer 8x8 (horneado UNA vez, module-cached) que se suma 0..2/255 sobre el gradiente -> rompe
// los escalones visibles en oscuros sin grano perceptible. DETERMINISTA (Bayer fijo, sin t/PRNG). Tamano 64x64 (el motor
// NUNCA pide ese tamano para transiciones -> no colisiona con el cache de scratch). null-safe (Node pelado -> no-op).
const BAYER8 = [0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21]
let _dith = null, _dithTried = false
function ditherTile() {
  if (_dithTried) return _dith; _dithTried = true
  const S = 64, cv = getScratch(S, S); if (!cv) return (_dith = null)
  const c = cv.getContext && cv.getContext('2d'); if (!c) return (_dith = null)
  const img = c.createImageData(S, S), d = img.data
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const v = Math.round((BAYER8[(y & 7) * 8 + (x & 7)] / 63) * 2)   // 0..2 aditivo
    const i = (y * S + x) * 4; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255
  }
  c.putImageData(img, 0, 0); return (_dith = cv)
}
function dither(ctx) {
  const tile = ditherTile(); if (!tile) return
  const pat = ctx.createPattern(tile, 'repeat'); if (!pat) return
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'           // aditivo 0..2/255: rompe bandas en oscuros
  ctx.setTransform(1, 0, 0, 1, 0, 0)                 // device-space: cubre todo el backing pese al bgPush; tile estatico (no shimmer)
  ctx.fillStyle = pat; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  ctx.restore()                                       // restaura transform del bgPush + composite default
}
// STOPS en OKLCH (item L148/L463 Stage 2): interpola c0->c1 en el espacio PERCEPTUAL (L,C,h con hue por camino angular corto)
// y emite N+1 stops sRGB -> la rampa progresa PAREJO a la vista. El canvas interpola entre stops en sRGB, pero al ser densos
// y ya perceptualmente espaciados, el resultado sigue el arco OKLCH. Para c0~c1 (misma familia) es sutil pero elimina el leve
// desnivel de lightness del sRGB directo; para colores de hue distinto evita el "medio embarrado". Puro/determinista.
function oklchStops(g, c0, c1, steps = 8) {
  const a = hexToOklch(c0), b = hexToOklch(c1)
  let dh = b.h - a.h; if (dh > Math.PI) dh -= 2 * Math.PI; else if (dh < -Math.PI) dh += 2 * Math.PI   // hue por el camino angular corto
  for (let i = 0; i <= steps; i++) { const t = i / steps; g.addColorStop(t, oklchToHex(a.L + (b.L - a.L) * t, a.C + (b.C - a.C) * t, a.h + dh * t)) }
}
function rampBg(ctx, pal) {
  const g = ctx.createLinearGradient(0, 0, 0, H)
  oklchStops(g, pal.bg0, pal.bg1)   // rampa bg0->bg1 interpolada en OKLCH (antes: 2 stops sRGB directos)
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
  dither(ctx)   // rompe banding del gradiente base (rampBg corre PRIMERO en cada modulo -> el tile queda bajo strokes/blobs)
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
  register: 'neutral', intensity: 'soft', tags: ['generativo', 'organico', 'lineas'],
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
  id: 'bg.generative.contours', lib: 'backgrounds', category: 'generative-art', tones: ['dark', 'light'], rubros: ['inmobiliaria', 'finanzas', 'tech'], weight: 0.9,
  register: 'corporate', intensity: 'soft', tags: ['generativo', 'topografico', 'mapa'],
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
  id: 'bg.generative.voronoi', lib: 'backgrounds', category: 'generative-art', tones: ['dark', 'light'], rubros: ['tech', 'moda'], weight: 0.7,
  register: 'neutral', intensity: 'soft', tags: ['generativo', 'celdas', 'cristal', 'facetado'],
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
  register: 'editorial', intensity: 'soft', tags: ['atmosferico', 'premium', 'aurora'],
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
  register: 'editorial', intensity: 'medium', tags: ['atmosferico', 'dramatico', 'luz'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'god')
    rampBg(ctx, pal)
    // origen que deriva lento -> los rayos barren el plano (no quedan clavados)
    const ox = W * (0.3 + r() * 0.4) + Math.sin(t * CLK * 0.14) * 26, oy = -H * 0.12
    const rays = 14
    ctx.globalCompositeOperation = pal.tone === 'light' ? 'multiply' : 'screen'
    const baseA = r() * TAU
    for (let i = 0; i < rays; i++) {
      const spread = Math.PI * 0.9
      const ang = (Math.PI / 2) - spread / 2 + (i / (rays - 1)) * spread
      // abanico de rayos que se abre/cierra suave (oscilacion mayor y perceptible, pero tenue)
      const wob = Math.sin(t * CLK * 0.4 + i * 0.5) * 0.05
      const a1 = ang + wob - 0.018, a2 = ang + wob + 0.018
      const L = H * 1.4
      const col = i % 5 === 0 ? pal.accent : (pal.tone === 'light' ? darken(pal.accent, 0.15) : lighten(pal.accent, 0.2))
      // brillo de cada rayo respira con fase propia -> luz volumetrica que titila lento
      const flick = 0.5 + 0.5 * Math.sin(i * 1.7 + baseA + t * CLK * 0.6)
      const alpha = (pal.tone === 'light' ? 0.1 : 0.06) * flick
      const grad = ctx.createLinearGradient(ox, oy, ox + Math.cos(ang) * L, oy + Math.sin(ang) * L)
      grad.addColorStop(0, rgba(col, alpha * 2)); grad.addColorStop(1, rgba(col, 0))
      ctx.fillStyle = grad
      ctx.beginPath(); ctx.moveTo(ox, oy)
      ctx.lineTo(ox + Math.cos(a1) * L, oy + Math.sin(a1) * L)
      ctx.lineTo(ox + Math.cos(a2) * L, oy + Math.sin(a2) * L)
      ctx.closePath(); ctx.fill()
    }
    ctx.globalCompositeOperation = 'source-over'
    // halo en el origen que respira con la luz
    const haloR = H * 0.5 * (0.94 + 0.06 * Math.sin(t * CLK * 0.6))
    const gl = ctx.createRadialGradient(ox, oy, 0, ox, oy, haloR)
    gl.addColorStop(0, rgba(pal.accent, pal.tone === 'light' ? 0.1 : 0.16)); gl.addColorStop(1, rgba(pal.accent, 0))
    ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H)
  },
})

register({
  id: 'bg.atmospheric.fluid', lib: 'backgrounds', category: 'atmospheric-organic', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  register: 'friendly', intensity: 'soft', tags: ['atmosferico', 'fluido', 'organico'],
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
  id: 'bg.retroprint.halftone', lib: 'backgrounds', category: 'retro-print', tones: ['dark', 'light'], rubros: ['moda', 'gastronomia', 'arte'], weight: 0.9,
  register: 'playful', intensity: 'bold', tags: ['retro', 'print', 'puntos', 'duotono'],
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
  id: 'bg.retroprint.sunburst', lib: 'backgrounds', category: 'retro-print', tones: ['dark', 'light'], rubros: ['gastronomia', 'default', 'moda'], weight: 0.85,
  register: 'playful', intensity: 'medium', tags: ['retro', '70s', 'rayos'],
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
  id: 'bg.retroprint.benday', lib: 'backgrounds', category: 'retro-print', tones: ['light'], rubros: ['moda', 'arte', 'default'], weight: 0.7,
  register: 'playful', intensity: 'bold', tags: ['retro', 'comic', 'benday', 'pop'],
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
  id: 'bg.techhud.cybergrid', lib: 'backgrounds', category: 'tech-hud', tones: ['dark'], rubros: ['tech', 'moda', 'gaming'], weight: 0.9,
  register: 'playful', intensity: 'bold', tags: ['tech', 'cyber', 'perspectiva', 'synthwave'],
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
  id: 'bg.techhud.hud', lib: 'backgrounds', category: 'tech-hud', tones: ['dark'], rubros: ['tech', 'gaming'], weight: 0.8,
  register: 'playful', intensity: 'medium', tags: ['tech', 'hud', 'interfaz'],
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
  id: 'bg.techhud.blueprint', lib: 'backgrounds', category: 'tech-hud', tones: ['dark', 'light'], rubros: ['inmobiliaria', 'tech', 'construccion'], weight: 0.85,
  register: 'corporate', intensity: 'soft', tags: ['tech', 'plano', 'blueprint'],
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
    // VIDA: linea de medicion que recorre el plano de arriba a abajo (escaneo de blueprint), tinte de acento2
    const scanY = ((t * CLK * 0.12) % 1) * H
    ctx.strokeStyle = rgba(pal.accent2, pal.tone === 'light' ? 0.3 : 0.4); ctx.lineWidth = 1
    ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(0, scanY); ctx.lineTo(W, scanY); ctx.stroke(); ctx.setLineDash([])
    // un par de "figuras tecnicas": circulos con cruz giratoria + rectangulos acotados, posiciones sembradas
    ctx.strokeStyle = rgba(lineCol, pal.tone === 'light' ? 0.4 : 0.5); ctx.lineWidth = 1.4
    const drift = Math.sin(t * CLK * 0.2) * 4
    for (let i = 0; i < 3; i++) {
      const cx = W * (0.2 + r() * 0.6), cy = H * (0.15 + r() * 0.7) + drift, rad = 26 + r() * 30
      ctx.beginPath(); ctx.arc(cx, cy, rad, 0, TAU); ctx.stroke()
      // cruz que rota muy lento (idle continuo) + marcador angular en el anillo
      const rot = t * CLK * 0.12 * (i % 2 ? 1 : -1)
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot)
      ctx.beginPath(); ctx.moveTo(-rad - 8, 0); ctx.lineTo(rad + 8, 0); ctx.moveTo(0, -rad - 8); ctx.lineTo(0, rad + 8); ctx.stroke()
      const mAng = t * CLK * 0.5 + i
      ctx.fillStyle = rgba(pal.accent2, pal.tone === 'light' ? 0.5 : 0.6)
      ctx.beginPath(); ctx.arc(Math.cos(mAng) * rad, Math.sin(mAng) * rad, 2.4, 0, TAU); ctx.fill()
      ctx.restore()
    }
    for (let i = 0; i < 2; i++) {
      const x = W * (0.1 + r() * 0.5), y = H * (0.2 + r() * 0.6) + drift * 0.6, w = 50 + r() * 60, h = 36 + r() * 40
      ctx.strokeRect(x, y, w, h)
    }
  },
})

register({
  id: 'bg.techhud.crt', lib: 'backgrounds', category: 'tech-hud', tones: ['dark'], rubros: ['tech', 'gaming', 'moda'], weight: 0.7,
  register: 'playful', intensity: 'bold', tags: ['tech', 'crt', 'scanlines', 'retro'],
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
  register: 'corporate', intensity: 'medium', tags: ['broadcast', 'noticiero', 'lower-third'],
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
  register: 'corporate', intensity: 'medium', tags: ['broadcast', 'ticker', 'cinta'],
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
  register: 'playful', intensity: 'loud', tags: ['y2k', 'cromo', 'metalico', 'premium'],
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
  register: 'playful', intensity: 'bold', tags: ['y2k', 'frutiger', 'glass', 'aqua', 'optimista'],
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
  register: 'playful', intensity: 'loud', tags: ['y2k', 'holografico', 'iridiscente', 'foil'],
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
  register: 'editorial', intensity: 'medium', tags: ['protagonista', 'morph', 'silueta', 'editorial'],
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
  register: 'editorial', intensity: 'medium', tags: ['protagonista', 'morph', 'duotono', 'contorno'],
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
  register: 'editorial', intensity: 'calm', tags: ['claro', 'editorial', 'crema', 'minimal', 'serio'],
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
    // VIDA: luz de pagina que recorre suave en diagonal (sheen tenue de papel, soft-light) -> el plano nunca esta muerto
    const sweep = 0.5 + 0.5 * Math.sin(t * CLK * 0.18)
    const lx = lerp(-W * 0.2, W * 1.2, sweep)
    ctx.save(); ctx.globalCompositeOperation = 'soft-light'
    const sg = ctx.createLinearGradient(lx - 200, 0, lx + 200, H)
    sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,0.5)'); sg.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H); ctx.restore()
    // marco editorial fino + filete de acento (swiss)
    const m = 26
    ctx.strokeStyle = rgba(pal.ink, 0.18); ctx.lineWidth = 1
    ctx.strokeRect(m, m, W - m * 2, H - m * 2)
    // filete superior de acento: su ANCHO crece/decrece suave (eInOutCubic) -> movimiento real, no solo alpha
    const fw = (W - m * 2)
    const grow = eInOutCubic(0.5 + 0.5 * Math.sin(t * CLK * 0.4))
    ctx.fillStyle = rgba(pal.accent, 0.85)
    ctx.fillRect(m, m, fw * (0.22 + grow * 0.2), 3)
    // punto de acento que se desliza por el filete (vida puntual continua)
    const dotX = m + fw * (0.5 + 0.42 * Math.sin(t * CLK * 0.5))
    ctx.fillStyle = rgba(pal.accent2, 0.7); ctx.beginPath(); ctx.arc(dotX, H - m, 2.6, 0, TAU); ctx.fill()
    // grano de papel ligero (puntos sembrados, estaticos -> textura)
    ctx.fillStyle = rgba(pal.ink, 0.03)
    for (let i = 0; i < 380; i++) ctx.fillRect((r() * W) | 0, (r() * H) | 0, 1, 1)
  },
})

register({
  id: 'bg.lightpaper.magazinespread', lib: 'backgrounds', category: 'light-substrate-paper', tones: ['light'], rubros: ['*', 'moda', 'arte', 'eventos', 'gastronomia'], weight: 0.9,
  register: 'editorial', intensity: 'soft', tags: ['claro', 'revista', 'spread', 'columnas', 'editorial'],
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
    // VIDA: luz de pagina que baja suave por la columna de color (sheen vertical lento)
    ctx.save(); ctx.globalCompositeOperation = pal.tone === 'light' ? 'soft-light' : 'screen'
    const ly = (0.5 + 0.5 * Math.sin(t * CLK * 0.2)) * H
    const cg = ctx.createLinearGradient(0, ly - 180, 0, ly + 180)
    cg.addColorStop(0, 'rgba(255,255,255,0)'); cg.addColorStop(0.5, rgba('#ffffff', 0.4)); cg.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = cg; ctx.fillRect(bx, 0, cw, H); ctx.restore()
    // lineas de "texto" tenues en la columna de papel (baseline grid) -> aire editorial.
    // VIDA: una onda de "lectura" baja por las lineas (cada linea resalta al pasar) -> movimiento continuo sutil.
    const tx = left ? cw + 24 : 24, tw = W - cw - 48
    const baseY = H * 0.18, lineGap = 16
    const readHead = ((t * CLK * 0.4) % 1.4) * 18   // posicion de la onda en indice de linea
    for (let i = 0; i < 18; i++) {
      const y = baseY + i * lineGap
      if (y > H * 0.85) break
      const w = tw * (0.55 + 0.4 * Math.abs(Math.sin(i * 1.3 + r() * 6)))
      const near = clamp(1 - Math.abs(i - readHead) / 2.5, 0, 1)
      ctx.fillStyle = rgba(near > 0.05 ? pal.accent : pal.ink, 0.08 + near * 0.12)
      ctx.fillRect(tx, y, w, 4)
    }
    // numero de folio: parpadeo lento + leve deriva horizontal (vida continua)
    const folX = (left ? W - 40 : 28) + Math.sin(t * CLK * 0.4) * 3
    ctx.fillStyle = rgba(pal.accent, 0.5 + 0.2 * Math.sin(t * CLK * 0.4))
    ctx.fillRect(folX, H - 34, 16, 3)
  },
})

register({
  id: 'bg.lightpaper.corpcards', lib: 'backgrounds', category: 'light-substrate-paper', tones: ['light'], rubros: ['*', 'finanzas', 'tech', 'inmobiliaria', 'salud', 'educacion'], weight: 0.95,
  register: 'corporate', intensity: 'calm', tags: ['claro', 'corporativo', 'tarjetas', 'limpio', 'serio'],
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
    // sheen suave que recorre el dashboard en diagonal -> luz viva sobre las tarjetas
    const shY = ((t * CLK * 0.16) % 1.3 - 0.15) * H
    cards.forEach((c, i) => {
      // flote mas perceptible y con deriva horizontal leve (parallax suave entre tarjetas)
      const bob = Math.sin(t * CLK * 0.4 + i * 0.9)
      const x = c.x * W + Math.cos(t * CLK * 0.3 + i) * 3, y = c.y * H + bob * 5, w = c.w * W, h = c.h * H
      // sombra que respira con el flote (mas alta = sombra mas larga -> sensacion de profundidad)
      ctx.save()
      ctx.shadowColor = 'rgba(20,16,24,0.12)'; ctx.shadowBlur = 14 + bob * 5; ctx.shadowOffsetY = 6 + bob * 3
      roundRect(ctx, x, y, w, h, 12)
      ctx.fillStyle = '#ffffff'; ctx.fill()
      ctx.restore()
      // brillo de luz que cruza la tarjeta cuando la franja pasa por su altura
      const near = clamp(1 - Math.abs((y + h / 2) - shY) / (H * 0.4), 0, 1)
      if (near > 0.02) {
        ctx.save(); roundRect(ctx, x, y, w, h, 12); ctx.clip()
        const lg = ctx.createLinearGradient(x, y, x + w, y + h)
        lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, rgba(pal.accent, 0.06 * near)); lg.addColorStop(1, 'rgba(255,255,255,0)')
        ctx.fillStyle = lg; ctx.fillRect(x, y, w, h); ctx.restore()
      }
      // detalle: barra de acento que se alarga suave (vida) + lineas
      const accent = i % 3 === 0
      const barPulse = 0.85 + 0.15 * Math.sin(t * CLK * 0.6 + i)
      ctx.fillStyle = rgba(accent ? pal.accent : pal.accent2, accent ? 0.85 : 0.5)
      ctx.fillRect(x + 12, y + 12, (accent ? 28 : 18) * barPulse, 6)
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
  register: 'friendly', intensity: 'soft', tags: ['claro', 'papel', 'fibra', 'kraft', 'organico'],
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
    // VIDA: cono de luz calida que recorre el papel lento (sol entrando por la ventana) -> el plano respira
    const lsx = W * (0.5 + 0.45 * Math.sin(t * CLK * 0.16)), lsy = H * (0.4 + 0.2 * Math.cos(t * CLK * 0.13))
    ctx.save(); ctx.globalCompositeOperation = 'soft-light'
    const lg = ctx.createRadialGradient(lsx, lsy, 0, lsx, lsy, H * 0.6)
    lg.addColorStop(0, 'rgba(255,244,220,0.55)'); lg.addColorStop(1, 'rgba(255,244,220,0)')
    ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H); ctx.restore()
    // mancha de tinta de acento (sello): respira + deriva suave (la tinta "vive" en el papel)
    const sx = W * (0.2 + r() * 0.6) + Math.sin(t * CLK * 0.3) * 5, sy = H * (0.15 + r() * 0.7) + Math.cos(t * CLK * 0.26) * 4, sr = 40 + r() * 30
    const breathe = 1 + 0.05 * Math.sin(t * CLK * 0.5)
    const st = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr * breathe)
    st.addColorStop(0, rgba(pal.accent, 0.14 + 0.04 * Math.sin(t * CLK * 0.5))); st.addColorStop(0.7, rgba(pal.accent, 0.06)); st.addColorStop(1, rgba(pal.accent, 0))
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
  register: 'editorial', intensity: 'soft', tags: ['profundidad', 'parallax', 'horizonte', 'capas'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'hills')
    // cielo: rampa con horizonte
    const sky = ctx.createLinearGradient(0, 0, 0, H)
    if (pal.tone === 'light') { sky.addColorStop(0, lighten(pal.accent, 0.7)); sky.addColorStop(1, pal.bg0) }
    else { sky.addColorStop(0, pal.bg1); sky.addColorStop(1, darken(pal.accent, 0.5)) }
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H)
    // sol/luna detras de las capas: brillo que respira lento (vida en el cielo)
    const sunX = W * (0.3 + r() * 0.4), sunY = H * 0.34
    const sunBr = 0.92 + 0.08 * Math.sin(t * CLK * 0.4)
    const sun = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 90 * sunBr)
    sun.addColorStop(0, rgba(pal.accent2, (pal.tone === 'light' ? 0.4 : 0.5) * sunBr)); sun.addColorStop(1, rgba(pal.accent2, 0))
    ctx.fillStyle = sun; ctx.fillRect(0, 0, W, H)
    // capas de colinas: cada una se DESPLAZA horizontal a distinta velocidad (parallax real y continuo) + leve sube/baja
    const layers = 4
    for (let l = 0; l < layers; l++) {
      const depth = l / (layers - 1)              // 0 = lejos, 1 = cerca
      const scrollX = t * CLK * (3 + depth * 11)  // las cercanas corren mas -> profundidad
      const bob = Math.sin(t * CLK * 0.22 * (1 + depth)) * (3 + depth * 7)
      const baseY = H * (0.46 + depth * 0.32) + bob
      const amp = 22 + depth * 30
      const ph = r() * TAU, freq = 0.006 + depth * 0.004
      const col = pal.tone === 'light'
        ? darken(pal.accent, 0.1 + depth * 0.45)
        : lighten(pal.bg0, 0.04 + depth * 0.12)
      ctx.fillStyle = rgba(col, pal.tone === 'light' ? 0.55 + depth * 0.35 : 0.7)
      ctx.beginPath(); ctx.moveTo(0, H)
      for (let x = 0; x <= W; x += 8) {
        const xs = x + scrollX
        const y = baseY + Math.sin(xs * freq + ph) * amp + Math.sin(xs * freq * 2.3 + ph) * amp * 0.3
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
  register: 'playful', intensity: 'bold', tags: ['profundidad', 'tunel', 'faux-3d', 'punto-de-fuga'],
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
  register: 'corporate', intensity: 'soft', tags: ['profundidad', 'parallax', 'tarjetas', 'faux-3d'],
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
  register: 'neutral', intensity: 'medium', tags: ['generativo', 'truchet', 'laberinto', 'geometrico'],
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
  register: 'neutral', intensity: 'soft', tags: ['generativo', 'packing', 'constelacion', 'puntos'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'poisson')
    rampBg(ctx, pal)
    // packing tipo poisson (rechazo): puntos bien espaciados -> constelacion organica, no grilla.
    const pts = []
    const minD = 30, tries = 900
    for (let k = 0; k < tries && pts.length < 90; k++) {
      const bx = r() * W, by = r() * H
      let ok = true
      for (const p of pts) { const dx = bx - p.bx, dy = by - p.by; if (dx * dx + dy * dy < minD * minD) { ok = false; break } }
      // cada punto deriva en una pequena orbita (la constelacion respira y las lineas se re-tejen) -> vida continua
      if (ok) pts.push({ bx, by, ph: r() * TAU, sp: range(r, 0.3, 0.7), orb: 4 + r() * 7, big: r() < 0.18, x: 0, y: 0 })
    }
    for (const p of pts) { p.x = p.bx + Math.cos(t * CLK * p.sp + p.ph) * p.orb; p.y = p.by + Math.sin(t * CLK * p.sp * 0.85 + p.ph) * p.orb }
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
  register: 'editorial', intensity: 'medium', tags: ['generativo', 'reaction-diffusion', 'organico', 'coral'],
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

// ============================================================================
// Ola 3 — MAS variedad en cada categoria existente + seasonal/event opt-in.
// Todo reusa rampBg/scrim/roundRect/makeNoise (en scope). Puro + determinista.
// ============================================================================

// ---- gradient-fields ----

register({
  id: 'bg.gradient.duotonesweep', lib: 'backgrounds', category: 'gradient-fields', tones: ['dark', 'light'], rubros: ['*', 'moda', 'arte', 'tech'], weight: 1.1,
  register: 'editorial', intensity: 'soft', tags: ['calmo', 'duotono', 'editorial', 'sweep'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'duosweep')
    // base duotono en diagonal: acento -> acento2 mezclados con los fondos del tono
    const ang = range(r, -0.5, 0.5)
    const dx = Math.cos(ang), dy = Math.sin(ang)
    const g = ctx.createLinearGradient(W / 2 - dx * H, H / 2 - dy * H, W / 2 + dx * H, H / 2 + dy * H)
    const a0 = pal.tone === 'light' ? lighten(pal.accent, 0.62) : darken(pal.accent, 0.42)
    const a1 = pal.tone === 'light' ? lighten(pal.accent2, 0.58) : darken(pal.accent2, 0.38)
    g.addColorStop(0, a0); g.addColorStop(0.5, pal.tone === 'light' ? pal.bg0 : pal.bg1); g.addColorStop(1, a1)
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    // banda de luz suave que barre lento en diagonal (sheen premium)
    const sweep = ((t * CLK * 0.16) % 1.4) - 0.2     // -0.2 .. 1.2
    const cx = lerp(-W * 0.3, W * 1.3, sweep), cy = H * 0.5
    ctx.save(); ctx.globalCompositeOperation = pal.tone === 'light' ? 'soft-light' : 'screen'
    const band = ctx.createLinearGradient(cx - 140, cy - 140, cx + 140, cy + 140)
    band.addColorStop(0, rgba('#ffffff', 0)); band.addColorStop(0.5, rgba('#ffffff', pal.tone === 'light' ? 0.5 : 0.12)); band.addColorStop(1, rgba('#ffffff', 0))
    ctx.fillStyle = band; ctx.fillRect(0, 0, W, H)
    ctx.restore()
    scrim(ctx, pal, { centerClear: 0.34, strength: pal.tone === 'light' ? 0.14 : 0.34 })
  },
})

register({
  id: 'bg.gradient.radialbloom', lib: 'backgrounds', category: 'gradient-fields', tones: ['dark', 'light'], rubros: ['*', 'salud', 'educacion', 'eventos'], weight: 1,
  register: 'friendly', intensity: 'soft', tags: ['calmo', 'radial', 'bloom', 'concentrico', 'sereno'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'rbloom')
    rampBg(ctx, pal)
    // centro de floracion sembrado (arriba del centro -> deja respirar el texto abajo)
    const cx = W * (0.4 + r() * 0.2), cy = H * (0.3 + r() * 0.12)
    // anillos concentricos de acento que respiran (escala lenta), opacidad decreciente
    const rings = 6
    ctx.save(); ctx.globalCompositeOperation = pal.tone === 'light' ? 'multiply' : 'lighter'
    for (let i = rings; i >= 0; i--) {
      const breathe = 0.5 + 0.5 * Math.sin(t * CLK * 0.4 + i * 0.6)
      const rad = H * (0.12 + i * 0.11) * (0.94 + breathe * 0.08)
      const col = i % 2 ? pal.accent2 : pal.accent
      const gr = ctx.createRadialGradient(cx, cy, rad * 0.7, cx, cy, rad)
      const a = (pal.tone === 'light' ? 0.09 : 0.14) * (1 - i / (rings + 1))
      gr.addColorStop(0, rgba(col, 0)); gr.addColorStop(0.85, rgba(col, a)); gr.addColorStop(1, rgba(col, 0))
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(cx, cy, rad, 0, TAU); ctx.fill()
    }
    ctx.restore()
    // nucleo calido
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, H * 0.16)
    core.addColorStop(0, rgba(pal.accent, pal.tone === 'light' ? 0.16 : 0.24)); core.addColorStop(1, rgba(pal.accent, 0))
    ctx.fillStyle = core; ctx.fillRect(0, 0, W, H)
    scrim(ctx, pal, { centerClear: 0.36, strength: pal.tone === 'light' ? 0.12 : 0.3 })
  },
})

// ---- geometric-graphic ----

register({
  id: 'bg.geometric.isogrid', lib: 'backgrounds', category: 'geometric-graphic', tones: ['dark', 'light'], rubros: ['*', 'tech', 'inmobiliaria', 'finanzas', 'gaming'], weight: 0.85,
  register: 'corporate', intensity: 'medium', tags: ['tecnico', 'isometrico', 'cubos', '3d-falso'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'iso')
    rampBg(ctx, pal)
    // grilla isometrica de rombos; algunas celdas se "encienden" (cubo de acento) con ritmo sembrado
    const s = 34
    const ux = s, uy = s * 0.5                 // vector iso
    const lineCol = pal.tone === 'light' ? 'rgba(0,0,0,0.06)' : rgba(pal.accent, 0.08)
    ctx.strokeStyle = lineCol; ctx.lineWidth = 1
    // dibujar rombos cubriendo el canvas con offset
    const cols = Math.ceil(W / ux) + 2, rows = Math.ceil(H / uy) + 4
    for (let j = -2; j < rows; j++) for (let i = -1; i < cols; i++) {
      const cx = i * ux + (j % 2 ? ux / 2 : 0)
      const cy = j * uy
      ctx.beginPath()
      ctx.moveTo(cx, cy - uy); ctx.lineTo(cx + ux / 2, cy); ctx.lineTo(cx, cy + uy); ctx.lineTo(cx - ux / 2, cy); ctx.closePath()
      ctx.stroke()
      // encender celda: hash determinista por (i,j) + fase temporal
      const lit = (Math.sin((i * 12.9 + j * 7.3) + t * CLK * 0.6) > 0.86)
      if (lit) {
        ctx.fillStyle = rgba((i + j) % 2 ? pal.accent2 : pal.accent, pal.tone === 'light' ? 0.16 : 0.22)
        ctx.fill()
      }
    }
    scrim(ctx, pal, { centerClear: 0.3, strength: pal.tone === 'light' ? 0.18 : 0.34 })
  },
})

register({
  id: 'bg.geometric.bauhaus', lib: 'backgrounds', category: 'geometric-graphic', tones: ['dark', 'light'], rubros: ['*', 'arte', 'educacion', 'moda', 'eventos'], weight: 0.8,
  register: 'editorial', intensity: 'bold', tags: ['swiss', 'bauhaus', 'formas', 'primario', 'editorial'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'bauhaus')
    ctx.fillStyle = pal.tone === 'light' ? pal.bg0 : pal.bg1; ctx.fillRect(0, 0, W, H)
    // composicion de formas primarias (circulo / semicirculo / triangulo / barra) ancladas a bordes,
    // grandes y planas, con un respiro central para el texto. Rotacion idle muy leve.
    const cols = [pal.accent, pal.accent2, pal.tone === 'light' ? darken(pal.accent, 0.4) : lighten(pal.accent2, 0.3)]
    const shapes = ['circle', 'half', 'tri', 'bar']
    const anchors = [[0.0, 0.0], [1.0, 0.0], [0.0, 1.0], [1.0, 1.0], [0.5, 0.0], [0.5, 1.0]]
    const N = 4
    const used = shuffledLocal(r, anchors).slice(0, N)
    for (let i = 0; i < N; i++) {
      const [ax, ay] = used[i]
      const col = cols[(r() * cols.length) | 0]
      const sh = shapes[(r() * shapes.length) | 0]
      const size = H * (0.18 + r() * 0.12)
      const baseRot = range(r, 0, TAU)
      const rotSpd = range(r, 0.05, 0.12) * (r() < 0.5 ? 1 : -1)   // rotacion idle lenta por forma (sembrada)
      const phase = r() * TAU
      // deriva sutil hacia/desde la esquina + respiracion de escala (cada forma vive distinto)
      const drift = Math.sin(t * CLK * 0.3 + phase) * 6
      const cx = ax * W + (ax === 0 ? size * 0.2 : ax === 1 ? -size * 0.2 : 0) + (ax === 0.5 ? drift : 0)
      const cy = ay * H + (ay === 0 ? size * 0.2 : ay === 1 ? -size * 0.2 : 0) + (ay === 0 ? drift : ay === 1 ? -drift : 0)
      const scl = 1 + 0.025 * Math.sin(t * CLK * 0.4 + phase)
      const a = pal.tone === 'light' ? 0.9 : 0.82
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(baseRot + t * CLK * rotSpd); ctx.scale(scl, scl)
      ctx.fillStyle = rgba(col, a)
      ctx.beginPath()
      if (sh === 'circle') { ctx.arc(0, 0, size * 0.5, 0, TAU) }
      else if (sh === 'half') { ctx.arc(0, 0, size * 0.5, 0, Math.PI); ctx.closePath() }
      else if (sh === 'tri') { ctx.moveTo(0, -size * 0.55); ctx.lineTo(size * 0.5, size * 0.4); ctx.lineTo(-size * 0.5, size * 0.4); ctx.closePath() }
      else { ctx.rect(-size * 0.6, -size * 0.12, size * 1.2, size * 0.24) }
      ctx.fill(); ctx.restore()
    }
    scrim(ctx, pal, { centerClear: 0.32, strength: pal.tone === 'light' ? 0.16 : 0.3 })
  },
})

// shuffled local (no toca prng.js): Fisher-Yates con un prng en scope
function shuffledLocal(r, arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = (r() * (i + 1)) | 0;[a[i], a[j]] = [a[j], a[i]] } return a }

// ---- atmospheric-organic ----

register({
  id: 'bg.atmospheric.starfield', lib: 'backgrounds', category: 'atmospheric-organic', tones: ['dark'], rubros: ['*', 'tech', 'gaming', 'eventos', 'arte'], weight: 0.85,
  register: 'editorial', intensity: 'soft', tags: ['atmosfera', 'estrellas', 'profundidad', 'noche', 'particulas'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'stars')
    // cielo nocturno: rampa profunda hacia el acento oscuro
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, darken(pal.accent, 0.62)); g.addColorStop(0.5, pal.bg1); g.addColorStop(1, darken(pal.bg1, 0.25))
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    // nebulosa tenue de acento
    const nx = W * (0.3 + r() * 0.4), ny = H * (0.25 + r() * 0.3)
    const neb = ctx.createRadialGradient(nx, ny, 0, nx, ny, H * 0.5)
    neb.addColorStop(0, rgba(pal.accent, 0.16)); neb.addColorStop(0.6, rgba(pal.accent2, 0.06)); neb.addColorStop(1, rgba(pal.accent2, 0))
    ctx.fillStyle = neb; ctx.fillRect(0, 0, W, H)
    // 3 capas de estrellas: las cercanas mas grandes/brillan, drift de parallax lento por t
    const layers = [{ n: 90, sz: 0.7, par: 4, tw: 0.0 }, { n: 50, sz: 1.2, par: 9, tw: 1.0 }, { n: 22, sz: 1.9, par: 16, tw: 1.0 }]
    for (let li = 0; li < layers.length; li++) {
      const L = layers[li]
      for (let i = 0; i < L.n; i++) {
        const bx = r() * W, by = r() * H, ph = r() * TAU
        const x = (bx + Math.sin(t * CLK * 0.12 + ph) * L.par + W) % W
        const y = by
        const tw = L.tw ? 0.55 + 0.45 * Math.sin(t * CLK * 1.1 + ph) : 0.85
        ctx.fillStyle = rgba(i % 7 === 0 ? pal.accent : '#ffffff', (0.5 + li * 0.18) * tw)
        ctx.beginPath(); ctx.arc(x, y, L.sz * (0.7 + tw * 0.5), 0, TAU); ctx.fill()
      }
    }
  },
})

register({
  id: 'bg.atmospheric.smoke', lib: 'backgrounds', category: 'atmospheric-organic', tones: ['dark', 'light'], rubros: ['*', 'moda', 'arte', 'gastronomia'], weight: 0.75,
  register: 'editorial', intensity: 'soft', tags: ['atmosfera', 'humo', 'niebla', 'volumetrico', 'organico'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'smoke')
    rampBg(ctx, pal)
    const noise = makeNoise(env.seed ^ 0x51a0, 3)
    // wisps de humo: blobs radiales suaves a lo largo de columnas, ondulando con ruido + t
    ctx.save(); ctx.globalCompositeOperation = pal.tone === 'light' ? 'multiply' : 'screen'
    const wisps = 7
    for (let i = 0; i < wisps; i++) {
      const baseX = (i + 0.5) / wisps * W + range(r, -30, 30)
      const ph = r() * TAU
      const col = i % 3 === 0 ? pal.accent2 : pal.accent
      const puffs = 8
      for (let j = 0; j < puffs; j++) {
        const fy = j / (puffs - 1)
        const y = H * (1.05 - fy * 1.1)          // sube de abajo hacia arriba
        const sway = (noise(baseX, y * 0.5) - 0.5) * 120 + Math.sin(t * CLK * 0.3 + ph + fy * 3) * 40
        const x = baseX + sway
        const rad = lerp(50, 150, fy)
        const a = (pal.tone === 'light' ? 0.14 : 0.16) * (1 - fy * 0.45)
        const gr = ctx.createRadialGradient(x, y, 0, x, y, rad)
        gr.addColorStop(0, rgba(col, a)); gr.addColorStop(0.6, rgba(col, a * 0.5)); gr.addColorStop(1, rgba(col, 0))
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.fill()
      }
    }
    ctx.restore()
    scrim(ctx, pal, { centerClear: 0.32, strength: pal.tone === 'light' ? 0.14 : 0.28 })
  },
})

// ---- retro-print ----

register({
  id: 'bg.retroprint.risoribbon', lib: 'backgrounds', category: 'retro-print', tones: ['dark', 'light'], rubros: ['*', 'arte', 'eventos', 'gastronomia', 'moda'], weight: 0.8,
  register: 'playful', intensity: 'bold', tags: ['retro', 'riso', 'duotono', 'ondas', 'misregister'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'riso')
    // papel plano
    ctx.fillStyle = pal.tone === 'light' ? pal.bg0 : pal.bg1; ctx.fillRect(0, 0, W, H)
    // bandas onduladas tipo cinta riso en dos tintas, con leve "misregister" (offset entre planchas)
    function ribbons(col, offX, offY, phBias, alpha) {
      ctx.save(); ctx.globalCompositeOperation = pal.tone === 'light' ? 'multiply' : 'screen'
      ctx.fillStyle = rgba(col, alpha)
      const bands = 5, bh = H / bands
      for (let b = 0; b < bands; b++) {
        const ph = r() * TAU + phBias
        const baseY = b * bh + bh * 0.5 + offY
        ctx.beginPath(); ctx.moveTo(-10, baseY)
        for (let x = -10; x <= W + 10; x += 10) {
          const y = baseY + Math.sin(x * 0.012 + ph + t * CLK * 0.25) * (bh * 0.32) + Math.sin(x * 0.03 + ph) * 8 + offX * 0
          ctx.lineTo(x + offX, y)
        }
        for (let x = W + 10; x >= -10; x -= 10) {
          const y = baseY + bh * 0.42 + Math.sin(x * 0.012 + ph + t * CLK * 0.25) * (bh * 0.32)
          ctx.lineTo(x + offX, y)
        }
        ctx.closePath(); ctx.fill()
      }
      ctx.restore()
    }
    ribbons(pal.accent, 0, 0, 0, pal.tone === 'light' ? 0.4 : 0.42)
    ribbons(pal.accent2, 4, 6, 1.3, pal.tone === 'light' ? 0.3 : 0.32)   // plancha desfasada (misregister)
    // textura de grano de print
    ctx.fillStyle = rgba(pal.tone === 'light' ? '#000' : '#fff', 0.025)
    for (let i = 0; i < 700; i++) { const x = r() * W, y = r() * H; ctx.fillRect(x, y, 1, 1) }
  },
})

// ---- tech-hud ----

register({
  id: 'bg.techhud.radar', lib: 'backgrounds', category: 'tech-hud', tones: ['dark'], rubros: ['*', 'tech', 'finanzas', 'gaming', 'salud'], weight: 0.8,
  register: 'playful', intensity: 'bold', tags: ['tech', 'radar', 'hud', 'concentrico', 'barrido'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'radar')
    const g = ctx.createRadialGradient(W / 2, H * 0.5, 0, W / 2, H * 0.5, H * 0.7)
    g.addColorStop(0, lighten(pal.bg0, 0.05)); g.addColorStop(1, darken(pal.bg1, 0.18))
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    const cx = W / 2, cy = H * 0.46, R = H * 0.42
    // anillos concentricos + cruz
    ctx.strokeStyle = rgba(pal.accent, 0.22); ctx.lineWidth = 1
    for (let i = 1; i <= 4; i++) { ctx.beginPath(); ctx.arc(cx, cy, R * i / 4, 0, TAU); ctx.stroke() }
    ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R); ctx.stroke()
    // barrido: cuna de luz que rota (con estela)
    const sweep = t * CLK * 0.6
    ctx.save(); ctx.translate(cx, cy)
    const segs = 30, arc = 0.9
    for (let s = 0; s < segs; s++) {
      const a0 = sweep - (s / segs) * arc
      ctx.beginPath(); ctx.moveTo(0, 0)
      ctx.arc(0, 0, R, a0, a0 + arc / segs + 0.02)
      ctx.closePath()
      ctx.fillStyle = rgba(pal.accent, 0.16 * (1 - s / segs))
      ctx.fill()
    }
    ctx.restore()
    // "contactos" (puntos sembrados) que parpadean cuando el barrido pasa cerca
    for (let i = 0; i < 7; i++) {
      const ang = r() * TAU, dist = r() * R * 0.92
      const px = cx + Math.cos(ang) * dist, py = cy + Math.sin(ang) * dist
      let da = ((sweep - ang) % TAU + TAU) % TAU
      const fresh = da < 1.2 ? 1 - da / 1.2 : 0
      ctx.fillStyle = rgba(i % 2 ? pal.accent2 : pal.accent, 0.25 + 0.6 * fresh)
      ctx.beginPath(); ctx.arc(px, py, 2.5 + 2 * fresh, 0, TAU); ctx.fill()
    }
    scrim(ctx, pal, { centerClear: 0.34, strength: 0.32 })
  },
})

register({
  id: 'bg.techhud.dataflow', lib: 'backgrounds', category: 'tech-hud', tones: ['dark', 'light'], rubros: ['*', 'tech', 'finanzas', 'educacion'], weight: 0.8,
  register: 'corporate', intensity: 'medium', tags: ['tech', 'circuito', 'datos', 'paquetes', 'lineas'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'dataflow')
    rampBg(ctx, pal)
    // trazas tipo circuito: caminos ortogonales (manhattan) sembrados; paquetes de acento que corren por ellos
    const lanes = 7
    const paths = []
    for (let i = 0; i < lanes; i++) {
      const horiz = r() < 0.5
      const fixed = horiz ? (0.1 + r() * 0.8) * H : (0.1 + r() * 0.8) * W
      const bendAt = 0.25 + r() * 0.5
      const bendTo = horiz ? (0.1 + r() * 0.8) * H : (0.1 + r() * 0.8) * W
      paths.push({ horiz, fixed, bendAt, bendTo, ph: r() })
    }
    // dibujar trazas tenues
    ctx.lineWidth = 1.4; ctx.lineCap = 'round'
    const traceCol = pal.tone === 'light' ? 'rgba(0,0,0,0.08)' : rgba(pal.accent, 0.12)
    for (const p of paths) {
      ctx.strokeStyle = traceCol; ctx.beginPath()
      if (p.horiz) {
        const bx = p.bendAt * W
        ctx.moveTo(0, p.fixed); ctx.lineTo(bx, p.fixed); ctx.lineTo(bx, p.bendTo); ctx.lineTo(W, p.bendTo)
      } else {
        const by = p.bendAt * H
        ctx.moveTo(p.fixed, 0); ctx.lineTo(p.fixed, by); ctx.lineTo(p.bendTo, by); ctx.lineTo(p.bendTo, H)
      }
      ctx.stroke()
    }
    // paquetes que corren (posicion por fase + t), con glow
    ctx.save(); ctx.globalCompositeOperation = pal.tone === 'light' ? 'source-over' : 'lighter'
    for (let i = 0; i < paths.length; i++) {
      const p = paths[i]
      const prog = ((t * CLK * 0.12 + p.ph) % 1)
      let x, y
      if (p.horiz) {
        const bx = p.bendAt * W
        if (prog < p.bendAt) { x = prog * W; y = p.fixed }
        else { const seg = (prog - p.bendAt); x = bx; y = p.fixed + (p.bendTo - p.fixed) * Math.min(1, seg * 3); if (seg > 0.33) { x = bx + (W - bx) * ((prog - (p.bendAt + 0.11)) / (1 - p.bendAt - 0.11)); y = p.bendTo } }
      } else {
        const by = p.bendAt * H
        if (prog < p.bendAt) { y = prog * H; x = p.fixed }
        else { const seg = (prog - p.bendAt); y = by; x = p.fixed + (p.bendTo - p.fixed) * Math.min(1, seg * 3); if (seg > 0.33) { y = by + (H - by) * ((prog - (p.bendAt + 0.11)) / (1 - p.bendAt - 0.11)); x = p.bendTo } }
      }
      const col = i % 2 ? pal.accent2 : pal.accent
      const gr = ctx.createRadialGradient(x, y, 0, x, y, 10)
      gr.addColorStop(0, rgba(col, pal.tone === 'light' ? 0.7 : 0.9)); gr.addColorStop(1, rgba(col, 0))
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, 10, 0, TAU); ctx.fill()
    }
    ctx.restore()
    scrim(ctx, pal, { centerClear: 0.3, strength: pal.tone === 'light' ? 0.14 : 0.3 })
  },
})

// ---- broadcast-news ----

register({
  id: 'bg.broadcast.scoreboard', lib: 'backgrounds', category: 'broadcast-news', tones: ['dark', 'light'], rubros: ['*', 'eventos', 'gaming', 'finanzas'], weight: 0.75,
  register: 'playful', intensity: 'bold', tags: ['broadcast', 'deportes', 'marco', 'tira', 'en-vivo'],
  render(ctx, t, env) {
    const { pal } = env
    rampBg(ctx, pal)
    // marco de transmision: barra superior + tira inferior con bloques de acento (estilo scoreboard)
    const topH = 54, botH = 70
    // top bar
    const tg = ctx.createLinearGradient(0, 0, W, 0)
    tg.addColorStop(0, rgba(pal.accent, 0.9)); tg.addColorStop(1, rgba(pal.accent2, 0.9))
    ctx.fillStyle = tg; ctx.fillRect(0, 0, W, topH)
    // sheen que recorre la barra superior (brillo de transmision en vivo)
    const topShx = ((t * CLK * 0.5) % 1.4 - 0.2) * W
    const tsh = ctx.createLinearGradient(topShx - 50, 0, topShx + 50, 0)
    tsh.addColorStop(0, 'rgba(255,255,255,0)'); tsh.addColorStop(0.5, 'rgba(255,255,255,0.22)'); tsh.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = tsh; ctx.fillRect(0, 0, W, topH)
    // bloque "LIVE" pulsante (con halo que late)
    const pulse = 0.55 + 0.45 * Math.sin(t * CLK * 1.4)
    const lh = ctx.createRadialGradient(22, topH / 2, 0, 22, topH / 2, 14)
    lh.addColorStop(0, rgba('#ff3b30', 0.4 * pulse)); lh.addColorStop(1, rgba('#ff3b30', 0))
    ctx.fillStyle = lh; ctx.beginPath(); ctx.arc(22, topH / 2, 14, 0, TAU); ctx.fill()
    ctx.fillStyle = rgba('#ff3b30', 0.5 + 0.5 * pulse); ctx.beginPath(); ctx.arc(22, topH / 2, 6, 0, TAU); ctx.fill()
    ctx.fillStyle = rgba('#ffffff', 0.18); ctx.fillRect(40, topH / 2 - 9, 70, 18)
    // bottom strip
    ctx.fillStyle = pal.tone === 'light' ? 'rgba(20,16,24,0.9)' : 'rgba(0,0,0,0.7)'
    ctx.fillRect(0, H - botH, W, botH)
    // filete de acento sobre la tira
    ctx.fillStyle = rgba(pal.accent, 0.95); ctx.fillRect(0, H - botH - 3, W, 3)
    // bloques tipo "marcador" en la tira: un glint recorre los bloques en secuencia (vida continua)
    const blocks = 3
    const glintT = (t * CLK * 0.4) % blocks
    for (let i = 0; i < blocks; i++) {
      const bw = (W - 40) / blocks, x = 20 + i * bw
      ctx.fillStyle = rgba(i === 1 ? pal.accent2 : pal.accent, 0.85)
      roundRect(ctx, x + 6, H - botH + 16, bw - 12, botH - 32, 6); ctx.fill()
      const lit = clamp(1 - Math.abs(glintT - i), 0, 1)
      if (lit > 0.02) { ctx.fillStyle = rgba('#ffffff', 0.18 * lit); roundRect(ctx, x + 6, H - botH + 16, bw - 12, botH - 32, 6); ctx.fill() }
    }
    // dos tickers que se deslizan en la zona media-baja (sutil, distintas velocidades)
    const tickerY = H - botH - 22
    ctx.fillStyle = rgba(pal.accent, 0.4)
    const seg = 60, off = (t * CLK * 26) % seg
    for (let x = -off; x < W; x += seg) ctx.fillRect(x, tickerY, seg * 0.5, 3)
    ctx.fillStyle = rgba(pal.accent2, 0.25)
    const off2 = (t * CLK * 40) % 44
    for (let x = -off2 + 30; x < W; x += 44) ctx.fillRect(x, tickerY + 8, 20, 2)
  },
})

// ---- chrome-y2k ----

register({
  id: 'bg.chromey2k.aurorafoil', lib: 'backgrounds', category: 'chrome-y2k', tones: ['dark', 'light'], rubros: ['*', 'moda', 'arte', 'tech', 'eventos'], weight: 0.8,
  register: 'playful', intensity: 'loud', tags: ['y2k', 'aurora', 'holografico', 'iridiscente', 'premium'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'aurora')
    rampBg(ctx, pal)
    // cintas de aurora iridiscente: gradientes diagonales animados que mezclan acento/acento2 + tintes de hue rotado
    const accHsl = hexToHsl(pal.accent)
    ctx.save(); ctx.globalCompositeOperation = pal.tone === 'light' ? 'soft-light' : 'screen'
    const ribbons = 5
    for (let i = 0; i < ribbons; i++) {
      const ph = r() * TAU
      const cy = H * ((i + 0.5) / ribbons) + Math.sin(t * CLK * 0.3 + ph) * 60
      const hueShift = (i - ribbons / 2) * 36
      const c1 = hslToHex(accHsl.h + hueShift, clamp(accHsl.s + 0.15, 0.4, 0.95), pal.tone === 'light' ? 0.62 : 0.58)
      const c2 = hslToHex(accHsl.h + hueShift + 60, clamp(accHsl.s + 0.1, 0.4, 0.95), pal.tone === 'light' ? 0.66 : 0.6)
      const g = ctx.createLinearGradient(0, cy - 120, W, cy + 120)
      g.addColorStop(0, rgba(c1, 0)); g.addColorStop(0.5, rgba(c1, pal.tone === 'light' ? 0.4 : 0.34)); g.addColorStop(0.5, rgba(c2, pal.tone === 'light' ? 0.4 : 0.34)); g.addColorStop(1, rgba(c2, 0))
      ctx.fillStyle = g
      ctx.beginPath(); ctx.moveTo(0, cy - 150)
      for (let x = 0; x <= W; x += 12) ctx.lineTo(x, cy - 80 + Math.sin(x * 0.02 + ph + t * CLK * 0.4) * 50)
      for (let x = W; x >= 0; x -= 12) ctx.lineTo(x, cy + 80 + Math.sin(x * 0.02 + ph + t * CLK * 0.4) * 50)
      ctx.closePath(); ctx.fill()
    }
    ctx.restore()
    // sheen especular fino que cruza
    const sx = ((t * CLK * 0.2) % 1.3 - 0.15) * W
    const sh = ctx.createLinearGradient(sx - 60, 0, sx + 60, H)
    sh.addColorStop(0, rgba('#ffffff', 0)); sh.addColorStop(0.5, rgba('#ffffff', pal.tone === 'light' ? 0.3 : 0.14)); sh.addColorStop(1, rgba('#ffffff', 0))
    ctx.fillStyle = sh; ctx.fillRect(0, 0, W, H)
    scrim(ctx, pal, { centerClear: 0.34, strength: pal.tone === 'light' ? 0.14 : 0.3 })
  },
})

// ---- morph-protagonist ----

register({
  id: 'bg.morphhero.ribbonband', lib: 'backgrounds', category: 'morph-protagonist', tones: ['dark', 'light'], rubros: ['*', 'moda', 'arte', 'eventos', 'tech'], weight: 0.8,
  register: 'editorial', intensity: 'medium', tags: ['protagonista', 'cinta', 'flujo', 'editorial', 'duotono'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'ribbon')
    rampBg(ctx, pal)
    // una cinta protagonista que cruza el canvas en diagonal, con grosor variable y degrade de marca.
    // ancla sembrada (sube de izq-abajo a der-arriba, o al reves) -> deja un lado libre para el texto.
    const flip = r() < 0.5 ? 1 : -1
    const y0 = flip > 0 ? H * 0.82 : H * 0.18
    const y1 = flip > 0 ? H * 0.18 : H * 0.82
    const ph = r() * TAU
    const steps = 48
    // borde superior e inferior de la cinta (banda con grosor que ondula). Gruesa -> protagonista.
    const top = [], bot = []
    for (let i = 0; i <= steps; i++) {
      const f = i / steps
      const x = f * W
      const yc = lerp(y0, y1, f) + Math.sin(f * 5 + ph + t * CLK * 0.3) * 30
      const thick = lerp(95, 190, 0.5 + 0.5 * Math.sin(f * 3 + ph))
      top.push([x, yc - thick]); bot.push([x, yc + thick])
    }
    const g = ctx.createLinearGradient(0, y0, W, y1)
    g.addColorStop(0, rgba(pal.accent, pal.tone === 'light' ? 0.3 : 0.4))
    g.addColorStop(1, rgba(pal.accent2, pal.tone === 'light' ? 0.3 : 0.4))
    ctx.fillStyle = g
    ctx.beginPath(); ctx.moveTo(top[0][0], top[0][1])
    for (const p of top) ctx.lineTo(p[0], p[1])
    for (let i = bot.length - 1; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1])
    ctx.closePath(); ctx.fill()
    // contorno fino superior (define la cinta)
    ctx.strokeStyle = rgba(pal.tone === 'light' ? darken(pal.accent, 0.15) : lighten(pal.accent, 0.35), 0.4); ctx.lineWidth = 1.5
    ctx.beginPath(); top.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke()
    scrim(ctx, pal, { centerClear: 0.3, strength: pal.tone === 'light' ? 0.14 : 0.28 })
  },
})

// ---- light-substrate-paper ----

register({
  id: 'bg.lightpaper.blueprintlight', lib: 'backgrounds', category: 'light-substrate-paper', tones: ['light'], rubros: ['*', 'inmobiliaria', 'tech', 'educacion', 'finanzas'], weight: 0.85,
  register: 'corporate', intensity: 'soft', tags: ['claro', 'blueprint', 'tecnico', 'arquitectura', 'serio'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'bplight')
    // papel tecnico claro (azulado muy leve)
    const hue = hexToHsl(pal.accent).h
    const paper = hslToHex(hue, 0.08, 0.96)
    ctx.fillStyle = paper; ctx.fillRect(0, 0, W, H)
    // grilla de ingenieria: fina + gruesa cada 5
    const step = 22
    for (let pass = 0; pass < 2; pass++) {
      const major = pass === 1
      ctx.strokeStyle = rgba(pal.accent, major ? 0.18 : 0.08); ctx.lineWidth = major ? 1.2 : 0.7
      const gs = major ? step * 5 : step
      ctx.beginPath()
      for (let x = 0; x <= W; x += gs) { ctx.moveTo(x, 0); ctx.lineTo(x, H) }
      for (let y = 0; y <= H; y += gs) { ctx.moveTo(0, y); ctx.lineTo(W, y) }
      ctx.stroke()
    }
    // un "plano" tecnico: rectangulos con cotas, sembrados, dibujados con linea de acento
    ctx.strokeStyle = rgba(darken(pal.accent, 0.1), 0.4); ctx.lineWidth = 1.5
    const px = W * (0.12 + r() * 0.1), py = H * (0.14 + r() * 0.1)
    const pw = W * (0.4 + r() * 0.2), ph2 = H * (0.2 + r() * 0.15)
    ctx.strokeRect(px, py, pw, ph2)
    // lineas de cota
    ctx.beginPath(); ctx.moveTo(px, py - 12); ctx.lineTo(px + pw, py - 12)
    ctx.moveTo(px, py - 16); ctx.lineTo(px, py - 8); ctx.moveTo(px + pw, py - 16); ctx.lineTo(px + pw, py - 8)
    ctx.stroke()
    // VIDA: linea de escaneo que recorre TODO el plano de izq a der (vaiven suave eased), tinta de acento tenue
    const scan = eInOutCubic(0.5 + 0.5 * Math.sin(t * CLK * 0.2)) * W
    const sgrad = ctx.createLinearGradient(scan - 30, 0, scan + 30, 0)
    sgrad.addColorStop(0, rgba(pal.accent, 0)); sgrad.addColorStop(0.5, rgba(pal.accent, 0.08)); sgrad.addColorStop(1, rgba(pal.accent, 0))
    ctx.fillStyle = sgrad; ctx.fillRect(scan - 30, 0, 60, H)
    // nodo de acento que "barre" el eje del plano (vida tecnica) + cabezal pulsante
    const sweepX = px + ((t * CLK * 0.1) % 1) * pw
    ctx.strokeStyle = rgba(pal.accent2, 0.5); ctx.beginPath(); ctx.moveTo(sweepX, py); ctx.lineTo(sweepX, py + ph2); ctx.stroke()
    const np = 0.6 + 0.4 * Math.sin(t * CLK * 1.0)
    ctx.fillStyle = rgba(pal.accent2, 0.5 + 0.4 * np); ctx.beginPath(); ctx.arc(sweepX, py, 2 + np * 1.5, 0, TAU); ctx.fill()
    // marco editorial
    const m = 24
    ctx.strokeStyle = rgba(pal.ink, 0.16); ctx.lineWidth = 1; ctx.strokeRect(m, m, W - m * 2, H - m * 2)
  },
})

// ---- spatial-depth ----

register({
  id: 'bg.spatial.gridfloor', lib: 'backgrounds', category: 'spatial-depth', tones: ['dark', 'light'], rubros: ['*', 'tech', 'gaming', 'finanzas', 'eventos'], weight: 0.85,
  register: 'playful', intensity: 'bold', tags: ['profundidad', 'piso', 'perspectiva', 'horizonte', 'synthwave'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'gridfloor')
    const horizon = H * 0.44
    // cielo arriba del horizonte
    const sky = ctx.createLinearGradient(0, 0, 0, horizon)
    if (pal.tone === 'light') { sky.addColorStop(0, lighten(pal.bg0, 0.2)); sky.addColorStop(1, lighten(pal.accent, 0.5)) }
    else { sky.addColorStop(0, darken(pal.bg1, 0.2)); sky.addColorStop(1, darken(pal.accent, 0.35)) }
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, horizon)
    // glow del horizonte (sol detras)
    const sunX = W * (0.35 + r() * 0.3)
    const hg = ctx.createRadialGradient(sunX, horizon, 0, sunX, horizon, H * 0.4)
    hg.addColorStop(0, rgba(pal.accent2, pal.tone === 'light' ? 0.35 : 0.5)); hg.addColorStop(1, rgba(pal.accent2, 0))
    ctx.fillStyle = hg; ctx.fillRect(0, 0, W, H)
    // piso abajo del horizonte
    ctx.fillStyle = pal.tone === 'light' ? pal.bg1 : darken(pal.bg1, 0.3); ctx.fillRect(0, horizon, W, H - horizon)
    const vp = W / 2
    ctx.strokeStyle = rgba(pal.accent, pal.tone === 'light' ? 0.3 : 0.42); ctx.lineWidth = 1
    // lineas que convergen al punto de fuga
    for (let i = -8; i <= 8; i++) {
      ctx.beginPath(); ctx.moveTo(vp, horizon); ctx.lineTo(vp + i * (W / 4), H); ctx.stroke()
    }
    // lineas horizontales que se acercan (scroll perspectivo con t)
    const scroll = (t * CLK * 0.5) % 1
    for (let j = 0; j < 16; j++) {
      const p = (j + scroll) / 16
      const y = horizon + (H - horizon) * (p * p)
      ctx.strokeStyle = rgba(pal.accent, (pal.tone === 'light' ? 0.3 : 0.42) * (1 - p) + 0.04)
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
    }
    scrim(ctx, pal, { centerClear: 0.32, strength: pal.tone === 'light' ? 0.16 : 0.3 })
  },
})

// ---- generative-art ----

register({
  id: 'bg.generative.wovenlines', lib: 'backgrounds', category: 'generative-art', tones: ['dark', 'light'], rubros: ['*', 'arte', 'moda', 'educacion', 'tech'], weight: 0.8,
  register: 'neutral', intensity: 'soft', tags: ['generativo', 'lineas', 'tejido', 'lattice', 'sinusoidal'],
  render(ctx, t, env) {
    const { pal } = env
    rampBg(ctx, pal)
    const noise = makeNoise(env.seed ^ 0x4f1d, 2)
    // dos familias de lineas (horizontales onduladas + verticales onduladas) que se "tejen" -> celosia organica
    ctx.save(); ctx.globalCompositeOperation = pal.tone === 'light' ? 'multiply' : 'screen'
    ctx.lineWidth = 1.3
    const rows = 16, cols = 11
    for (let i = 0; i < rows; i++) {
      const baseY = (i + 0.5) / rows * H
      const col = i % 3 === 0 ? pal.accent2 : pal.accent
      ctx.strokeStyle = rgba(col, pal.tone === 'light' ? 0.22 : 0.28)
      ctx.beginPath()
      for (let x = 0; x <= W; x += 8) {
        const amp = 10 + noise(x, baseY) * 24
        const y = baseY + Math.sin(x * 0.02 + i * 0.5 + t * CLK * 0.2) * amp
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    for (let i = 0; i < cols; i++) {
      const baseX = (i + 0.5) / cols * W
      ctx.strokeStyle = rgba(pal.accent, pal.tone === 'light' ? 0.14 : 0.18)
      ctx.beginPath()
      for (let y = 0; y <= H; y += 8) {
        const amp = 8 + noise(baseX, y) * 18
        const x = baseX + Math.cos(y * 0.018 + i * 0.6 - t * CLK * 0.18) * amp
        y === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    ctx.restore()
    scrim(ctx, pal, { centerClear: 0.32, strength: pal.tone === 'light' ? 0.2 : 0.34 })
  },
})

// ---- seasonal / event (opt-in: rubros explicitos, NO '*' -> el director no lo elige por defecto) ----

register({
  id: 'bg.seasonal.confetti', lib: 'backgrounds', category: 'seasonal-event', tones: ['dark', 'light'], rubros: ['eventos', 'gastronomia', 'educacion', 'moda'], weight: 0.6,
  register: 'playful', intensity: 'bold', tags: ['seasonal', 'celebracion', 'confeti', 'festivo', 'opt-in'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'confetti')
    rampBg(ctx, pal)
    // halo festivo suave
    const gl = ctx.createRadialGradient(W / 2, H * 0.4, 0, W / 2, H * 0.4, H * 0.6)
    gl.addColorStop(0, rgba(pal.accent, pal.tone === 'light' ? 0.1 : 0.16)); gl.addColorStop(1, rgba(pal.accent, 0))
    ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H)
    // confeti cayendo: piezas rectangulares que rotan y derivan, loop temporal por pieza (determinista)
    const N = 70
    const cols = [pal.accent, pal.accent2, pal.tone === 'light' ? darken(pal.accent, 0.3) : lighten(pal.accent2, 0.3), '#ffffff']
    for (let i = 0; i < N; i++) {
      const x0 = r() * W
      const speed = 0.06 + r() * 0.1
      const sway = 20 + r() * 40
      const ph = r() * TAU
      const fall = (t * CLK * speed + r()) % 1            // 0..1 de arriba a abajo
      const y = fall * (H + 40) - 20
      const x = x0 + Math.sin(fall * TAU * 1.5 + ph) * sway
      const sz = 4 + r() * 6
      const rot = ph + t * CLK * (1 + r()) + fall * 8
      const col = cols[(r() * cols.length) | 0]
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot)
      ctx.fillStyle = rgba(col, pal.tone === 'light' ? 0.85 : 0.9)
      ctx.fillRect(-sz / 2, -sz / 4, sz, sz * 0.5)
      ctx.restore()
    }
    scrim(ctx, pal, { centerClear: 0.34, strength: pal.tone === 'light' ? 0.12 : 0.28 })
  },
})

// ============================================================================
// OLA 5 — fondos nuevos. Reusa rampBg/makeNoise/scrim/CLK ya definidos arriba.
// ============================================================================

// ---- gradient-fields ----

register({
  id: 'bg.gradient.cornerglow', lib: 'backgrounds', category: 'gradient-fields', tones: ['dark', 'light'], rubros: ['*'], weight: 1.1,
  register: 'neutral', intensity: 'calm', tags: ['calmo', 'universal', 'esquinas', 'suave'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'cglow')
    // base diagonal
    const g = ctx.createLinearGradient(0, 0, W, H)
    g.addColorStop(0, pal.bg0); g.addColorStop(1, pal.bg1)
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    // dos resplandores anclados a esquinas OPUESTAS (sembradas), respirando lento -> textura limpia para texto
    const pair = (r() * 2) | 0
    const corners = pair === 0 ? [[0, 0], [W, H]] : [[W, 0], [0, H]]
    const cols = [pal.accent, pal.accent2]
    ctx.save(); ctx.globalCompositeOperation = pal.tone === 'light' ? 'multiply' : 'lighter'
    for (let i = 0; i < 2; i++) {
      const [cx, cy] = corners[i]
      const breath = 0.85 + 0.15 * Math.sin(t * CLK * 0.4 + i * Math.PI)
      const rad = H * 0.66 * breath
      const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad)
      gr.addColorStop(0, rgba(cols[i], pal.tone === 'light' ? 0.16 : 0.24)); gr.addColorStop(1, rgba(cols[i], 0))
      ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H)
    }
    ctx.restore()
    scrim(ctx, pal, { centerClear: 0.4, strength: pal.tone === 'light' ? 0.1 : 0.22 })
  },
})

register({
  id: 'bg.gradient.bandlayers', lib: 'backgrounds', category: 'gradient-fields', tones: ['dark', 'light'], rubros: ['*', 'moda', 'arte', 'eventos'], weight: 0.9,
  register: 'editorial', intensity: 'soft', tags: ['bandas', 'capas', 'horizonte', 'editorial'],
  render(ctx, t, env) {
    const { pal } = env
    rampBg(ctx, pal)
    // tres franjas horizontales suaves con bordes difusos que se deslizan vertical muy lento (paisaje abstracto)
    const drift = (t * CLK * 6)
    const stops = [
      { y: 0.3, h: 0.22, col: pal.accent },
      { y: 0.55, h: 0.26, col: pal.accent2 },
      { y: 0.82, h: 0.2, col: pal.accent },
    ]
    ctx.save(); ctx.globalCompositeOperation = pal.tone === 'light' ? 'multiply' : 'screen'
    for (let i = 0; i < stops.length; i++) {
      const s = stops[i]
      const cy = ((s.y * H + Math.sin(t * CLK * 0.3 + i) * 10 + drift) % (H + 200)) - 100
      const half = s.h * H
      const g = ctx.createLinearGradient(0, cy - half, 0, cy + half)
      g.addColorStop(0, rgba(s.col, 0)); g.addColorStop(0.5, rgba(s.col, pal.tone === 'light' ? 0.16 : 0.22)); g.addColorStop(1, rgba(s.col, 0))
      ctx.fillStyle = g; ctx.fillRect(0, cy - half, W, half * 2)
    }
    ctx.restore()
    scrim(ctx, pal, { centerClear: 0.36, strength: pal.tone === 'light' ? 0.14 : 0.26 })
  },
})

// ---- geometric-graphic ----

register({
  id: 'bg.geometric.chevrons', lib: 'backgrounds', category: 'geometric-graphic', tones: ['dark', 'light'], rubros: ['*', 'moda', 'deportes', 'eventos'], weight: 0.85,
  register: 'playful', intensity: 'bold', tags: ['geometrico', 'chevron', 'flechas', 'movimiento'],
  render(ctx, t, env) {
    const { pal } = env
    rampBg(ctx, pal)
    // filas de chevrones (>>>) que avanzan; alternan acento/acento2; sutiles para no competir con el texto
    const rowH = 56, half = rowH / 2
    const cw = 40
    const scroll = (t * CLK * 14) % (cw * 2)
    ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    let row = 0
    for (let y = -rowH; y < H + rowH; y += rowH, row++) {
      const dir = row % 2 ? 1 : -1
      const col = row % 2 ? pal.accent2 : pal.accent
      ctx.strokeStyle = rgba(col, pal.tone === 'light' ? 0.26 : 0.2)
      const off = dir * scroll
      for (let x = -cw * 2 + off; x < W + cw; x += cw * 2) {
        ctx.beginPath()
        ctx.moveTo(x, y + half - 12)
        ctx.lineTo(x + cw * 0.5 * dir, y + half)
        ctx.lineTo(x, y + half + 12)
        ctx.stroke()
      }
    }
    scrim(ctx, pal, { centerClear: 0.34, strength: pal.tone === 'light' ? 0.18 : 0.3 })
  },
})

register({
  id: 'bg.geometric.concentric', lib: 'backgrounds', category: 'geometric-graphic', tones: ['dark', 'light'], rubros: ['*', 'tech', 'arte', 'eventos'], weight: 0.8,
  register: 'playful', intensity: 'bold', tags: ['geometrico', 'anillos', 'concentrico', 'radar', 'hipnotico'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'conc')
    rampBg(ctx, pal)
    // anillos concentricos desde una esquina sembrada, expandiendose lento (ondas)
    const anchors = [[0, 0], [W, 0], [W, H], [0, H], [W / 2, H * 0.5]]
    const [cx, cy] = anchors[(r() * anchors.length) | 0]
    const gap = 34
    const grow = (t * CLK * 5) % gap
    const maxR = Math.hypot(W, H) * 1.05
    ctx.lineWidth = 2
    for (let rad = grow + gap; rad < maxR; rad += gap) {
      const k = rad / maxR
      const col = (Math.round(rad / gap) % 3 === 0) ? pal.accent2 : pal.accent
      ctx.strokeStyle = rgba(col, (pal.tone === 'light' ? 0.14 : 0.2) * (1 - k * 0.6))
      ctx.beginPath(); ctx.arc(cx, cy, rad, 0, TAU); ctx.stroke()
    }
    scrim(ctx, pal, { centerClear: 0.34, strength: pal.tone === 'light' ? 0.16 : 0.28 })
  },
})

register({
  id: 'bg.geometric.diamondtile', lib: 'backgrounds', category: 'geometric-graphic', tones: ['dark', 'light'], rubros: ['*', 'moda', 'gastronomia', 'arte'], weight: 0.8,
  register: 'neutral', intensity: 'medium', tags: ['geometrico', 'rombos', 'argyle', 'mosaico'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'diam')
    rampBg(ctx, pal)
    // grilla de rombos; algunos rellenos (sembrados) con leve titileo de brillo -> patron argyle/mosaico
    const cw = 52, chh = 46
    ctx.lineWidth = 1
    for (let gy = -1, j = 0; gy * chh < H + chh; gy++, j++) {
      for (let gx = -1, i = 0; gx * cw < W + cw; gx++, i++) {
        const cx = gx * cw + (j % 2 ? cw / 2 : 0)
        const cy = gy * chh
        const seed = ((i * 73856093) ^ (j * 19349663)) >>> 0
        const filled = (seed % 5) === 0
        ctx.beginPath()
        ctx.moveTo(cx, cy - chh / 2); ctx.lineTo(cx + cw / 2, cy); ctx.lineTo(cx, cy + chh / 2); ctx.lineTo(cx - cw / 2, cy); ctx.closePath()
        if (filled) {
          const tw = 0.5 + 0.5 * Math.sin(t * CLK * 0.8 + seed * 0.01)
          const col = (seed % 2) ? pal.accent2 : pal.accent
          ctx.fillStyle = rgba(col, (pal.tone === 'light' ? 0.1 : 0.14) + tw * (pal.tone === 'light' ? 0.08 : 0.12))
          ctx.fill()
        } else {
          ctx.strokeStyle = rgba(pal.accent, pal.tone === 'light' ? 0.07 : 0.1); ctx.stroke()
        }
      }
    }
    scrim(ctx, pal, { centerClear: 0.36, strength: pal.tone === 'light' ? 0.16 : 0.28 })
  },
})

// ---- generative-art ----

register({
  id: 'bg.generative.flowribbons', lib: 'backgrounds', category: 'generative-art', tones: ['dark', 'light'], rubros: ['*', 'arte', 'moda', 'tech'], weight: 0.8,
  register: 'editorial', intensity: 'soft', tags: ['generativo', 'flowfield', 'cintas', 'organico'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'fribbon')
    rampBg(ctx, pal)
    const noise = makeNoise(env.seed ^ 0x77a3, 2)
    // pocas cintas anchas que siguen el campo (no lineas finas): trazos gruesos translucidos -> fluido elegante
    const N = 10, steps = 46, dt = 9
    ctx.save(); ctx.globalCompositeOperation = pal.tone === 'light' ? 'multiply' : 'screen'
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    for (let i = 0; i < N; i++) {
      let x = r() * W, y = r() * H * 0.4 - 20
      const col = i % 3 === 0 ? pal.accent2 : pal.accent
      ctx.lineWidth = 8 + r() * 12
      ctx.strokeStyle = rgba(col, pal.tone === 'light' ? 0.16 : 0.14)
      ctx.beginPath(); ctx.moveTo(x, y)
      for (let s = 0; s < steps; s++) {
        const ang = noise(x, y) * TAU * 1.6 + Math.PI * 0.5 + t * CLK * 0.12
        x += Math.cos(ang) * dt; y += Math.sin(ang) * dt + 2
        if (y > H + 20) break
        ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    ctx.restore()
    scrim(ctx, pal, { centerClear: 0.34, strength: pal.tone === 'light' ? 0.16 : 0.3 })
  },
})

register({
  id: 'bg.generative.cellpack', lib: 'backgrounds', category: 'generative-art', tones: ['dark', 'light'], rubros: ['*', 'tech', 'salud', 'educacion'], weight: 0.75,
  register: 'neutral', intensity: 'soft', tags: ['generativo', 'celdas', 'circulos', 'packing', 'organico'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'cellp')
    rampBg(ctx, pal)
    // circulos sembrados de varios radios (circle-packing aproximado) que laten suave; algunos rellenos, otros aro
    const M = 38
    ctx.save(); ctx.globalCompositeOperation = pal.tone === 'light' ? 'multiply' : 'screen'
    for (let i = 0; i < M; i++) {
      const x = r() * W, y = r() * H
      const base = 8 + r() * 36
      const pulse = 1 + 0.08 * Math.sin(t * CLK * 0.6 + i * 0.9)
      const rad = base * pulse
      const col = i % 3 === 0 ? pal.accent2 : pal.accent
      if (r() < 0.45) {
        const gr = ctx.createRadialGradient(x, y, 0, x, y, rad)
        gr.addColorStop(0, rgba(col, pal.tone === 'light' ? 0.12 : 0.16)); gr.addColorStop(1, rgba(col, 0))
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.fill()
      } else {
        ctx.lineWidth = 1.4; ctx.strokeStyle = rgba(col, pal.tone === 'light' ? 0.16 : 0.22)
        ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.stroke()
      }
    }
    ctx.restore()
    scrim(ctx, pal, { centerClear: 0.34, strength: pal.tone === 'light' ? 0.16 : 0.3 })
  },
})

// ---- atmospheric-organic ----

register({
  id: 'bg.atmospheric.bokeh', lib: 'backgrounds', category: 'atmospheric-organic', tones: ['dark', 'light'], rubros: ['*', 'eventos', 'moda', 'gastronomia'], weight: 0.9,
  register: 'friendly', intensity: 'soft', tags: ['atmosferico', 'bokeh', 'luces', 'desenfoque', 'festivo'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'bokeh')
    rampBg(ctx, pal)
    // circulos de luz desenfocados (bokeh) flotando lento, distintos tamanos/profundidad
    const M = 22
    ctx.save(); ctx.globalCompositeOperation = pal.tone === 'light' ? 'screen' : 'lighter'
    for (let i = 0; i < M; i++) {
      const ph = r() * TAU, sp = range(r, 0.1, 0.4)
      const depth = r()
      const rad = (10 + depth * 46)
      const bx = r() * W + Math.cos(t * CLK * sp + ph) * 18
      const by = (r() * H + t * CLK * (4 + depth * 8)) % (H + 120) - 60
      const col = i % 3 === 0 ? pal.accent2 : pal.accent
      const a = (pal.tone === 'light' ? 0.08 : 0.12) * (0.4 + depth * 0.6)
      const gr = ctx.createRadialGradient(bx, by, 0, bx, by, rad)
      gr.addColorStop(0, rgba(col, a * 1.6)); gr.addColorStop(0.7, rgba(col, a * 0.5)); gr.addColorStop(1, rgba(col, 0))
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(bx, by, rad, 0, TAU); ctx.fill()
    }
    ctx.restore()
    scrim(ctx, pal, { centerClear: 0.38, strength: pal.tone === 'light' ? 0.12 : 0.24 })
  },
})

register({
  id: 'bg.atmospheric.mistlayers', lib: 'backgrounds', category: 'atmospheric-organic', tones: ['dark', 'light'], rubros: ['*', 'inmobiliaria', 'salud', 'arte'], weight: 0.95,
  register: 'editorial', intensity: 'calm', tags: ['atmosferico', 'niebla', 'capas', 'calmo', 'montanas'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'mist')
    rampBg(ctx, pal)
    // capas de niebla/cordillera apiladas que se deslizan horizontal a distintas velocidades (parallax suave)
    const layers = 5
    ctx.save(); ctx.globalCompositeOperation = pal.tone === 'light' ? 'multiply' : 'screen'
    for (let l = 0; l < layers; l++) {
      const u = l / (layers - 1)
      // sube/baja lento por capa (la niebla respira en vertical) + scroll horizontal mas vivo
      const baseY = H * (0.45 + u * 0.5) + Math.sin(t * CLK * 0.18 + l * 0.8) * (4 + u * 8)
      const amp = 14 + u * 30
      const sp = (0.12 + u * 0.16)               // mas rapido -> deriva perceptible (sigue calmo)
      const off = t * CLK * sp * 30 + r() * 100
      const col = l % 2 ? pal.accent2 : pal.accent
      ctx.fillStyle = rgba(col, pal.tone === 'light' ? 0.08 + u * 0.06 : 0.1 + u * 0.08)
      ctx.beginPath(); ctx.moveTo(0, H)
      for (let x = 0; x <= W; x += 12) {
        const y = baseY + Math.sin((x + off) * 0.012 + l) * amp + Math.sin((x + off) * 0.03 + l * 2) * (amp * 0.4)
        ctx.lineTo(x, y)
      }
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill()
    }
    ctx.restore()
    scrim(ctx, pal, { centerClear: 0.36, strength: pal.tone === 'light' ? 0.12 : 0.24 })
  },
})

// ---- retro-print ----

register({
  id: 'bg.retroprint.checker', lib: 'backgrounds', category: 'retro-print', tones: ['dark', 'light'], rubros: ['*', 'gastronomia', 'eventos', 'arte'], weight: 0.75,
  register: 'playful', intensity: 'bold', tags: ['retro', 'damero', 'perspectiva', 'print'],
  render(ctx, t, env) {
    const { pal } = env
    rampBg(ctx, pal)
    // damero en perspectiva que se aleja hacia el horizonte y scrollea (piso retro/diner)
    const horizon = H * 0.42
    ctx.fillStyle = rgba(pal.accent, pal.tone === 'light' ? 0.12 : 0.16)
    const rows = 18
    const scroll = (t * CLK * 0.5) % 1
    for (let j = 0; j < rows; j++) {
      const p0 = (j + scroll) / rows, p1 = (j + 1 + scroll) / rows
      const y0 = horizon + (H - horizon) * (p0 * p0)
      const y1 = horizon + (H - horizon) * (p1 * p1)
      const cells = 8
      const cellW = W / cells
      for (let c = 0; c < cells; c++) {
        if ((c + j) % 2) continue
        ctx.beginPath(); ctx.moveTo(c * cellW, y0); ctx.lineTo((c + 1) * cellW, y0); ctx.lineTo((c + 1) * cellW, y1); ctx.lineTo(c * cellW, y1); ctx.closePath(); ctx.fill()
      }
    }
    // bruma del horizonte
    const hg = ctx.createLinearGradient(0, horizon - 40, 0, horizon + 30)
    hg.addColorStop(0, rgba(pal.bg0, 0)); hg.addColorStop(1, rgba(pal.accent2, pal.tone === 'light' ? 0.2 : 0.28))
    ctx.fillStyle = hg; ctx.fillRect(0, horizon - 40, W, 70)
    scrim(ctx, pal, { centerClear: 0.3, strength: pal.tone === 'light' ? 0.14 : 0.26 })
  },
})

// ---- tech-hud ----

register({
  id: 'bg.techhud.waveform', lib: 'backgrounds', category: 'tech-hud', tones: ['dark', 'light'], rubros: ['*', 'tech', 'gaming', 'arte', 'educacion'], weight: 0.8,
  register: 'playful', intensity: 'bold', tags: ['tech', 'audio', 'onda', 'ecualizador', 'datos'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'wform')
    rampBg(ctx, pal)
    // grilla fina + dos ondas tipo osciloscopio/ecualizador, deterministas por sumas de senos sembradas
    ctx.strokeStyle = rgba(pal.accent, pal.tone === 'light' ? 0.05 : 0.07); ctx.lineWidth = 1
    for (let y = 0; y < H; y += 36) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }
    const drawWave = (yc, amp, fr, ph, col, a, lw) => {
      ctx.strokeStyle = rgba(col, a); ctx.lineWidth = lw; ctx.lineCap = 'round'
      ctx.beginPath()
      for (let x = 0; x <= W; x += 5) {
        const env1 = 0.5 + 0.5 * Math.sin(x * 0.012 + ph)
        const y = yc + Math.sin(x * fr + t * CLK * 0.9 + ph) * amp * env1 + Math.sin(x * fr * 2.3 + ph * 2) * amp * 0.3 * env1
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    drawWave(H * 0.34, 34, 0.05 + r() * 0.02, r() * TAU, pal.accent, pal.tone === 'light' ? 0.4 : 0.55, 2)
    drawWave(H * 0.66, 30, 0.06 + r() * 0.02, r() * TAU, pal.accent2, pal.tone === 'light' ? 0.32 : 0.45, 1.6)
    // barras de ecualizador abajo
    const bars = 28, bw = W / bars
    for (let i = 0; i < bars; i++) {
      const h = (0.2 + 0.8 * Math.abs(Math.sin(i * 0.7 + t * CLK * 1.2 + r() * 0.0))) * 60
      ctx.fillStyle = rgba(i % 2 ? pal.accent2 : pal.accent, pal.tone === 'light' ? 0.16 : 0.22)
      ctx.fillRect(i * bw + 2, H - h, bw - 4, h)
    }
    scrim(ctx, pal, { centerClear: 0.34, strength: pal.tone === 'light' ? 0.14 : 0.28 })
  },
})

register({
  id: 'bg.techhud.terminal', lib: 'backgrounds', category: 'tech-hud', tones: ['dark', 'light'], rubros: ['*', 'tech', 'educacion', 'finanzas'], weight: 0.7,
  register: 'corporate', intensity: 'medium', tags: ['tech', 'terminal', 'codigo', 'matrix', 'consola'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'term')
    // fondo consola
    if (pal.tone === 'light') { ctx.fillStyle = pal.bg0 } else { ctx.fillStyle = darken(pal.bg0, 0.15) }
    ctx.fillRect(0, 0, W, H)
    // "lineas de codigo": rectangulos de ancho variable (tokens) sembrados, indentados, que aparecen de a poco
    const lineH = 22, pad = 24
    const reveal = (t * CLK * 0.5) % 1.2
    let li = 0
    for (let y = pad; y < H - pad; y += lineH, li++) {
      const indent = pad + ((li * 2654435761 >>> 0) % 4) * 16
      const tokens = 2 + ((li * 40503 >>> 0) % 4)
      let x = indent
      const appear = clamp((reveal * (H - pad * 2) / lineH) - li + 6, 0, 1)
      if (appear <= 0) continue
      for (let k = 0; k < tokens; k++) {
        const w = 18 + ((((li * 31 + k * 17) * 2246822519) >>> 0) % 60)
        if (x + w > W - pad) break
        const isKw = ((li * 7 + k) % 5) === 0
        const col = isKw ? pal.accent2 : (k === 0 ? pal.accent : (pal.tone === 'light' ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.16)'))
        ctx.fillStyle = typeof col === 'string' && col.startsWith('rgba') ? col : rgba(col, pal.tone === 'light' ? 0.4 : 0.5)
        ctx.fillRect(x, y, w * appear, 8)
        x += w + 8
      }
    }
    // cursor parpadeante al final de una linea
    const blink = (Math.sin(t * CLK * 6) > 0) ? 1 : 0
    if (blink) { ctx.fillStyle = rgba(pal.accent, 0.7); ctx.fillRect(pad, H - pad - lineH, 9, 14) }
    scrim(ctx, pal, { centerClear: 0.34, strength: pal.tone === 'light' ? 0.14 : 0.3 })
  },
})

// ---- spatial-depth ----

register({
  id: 'bg.spatial.starwarp', lib: 'backgrounds', category: 'spatial-depth', tones: ['dark'], rubros: ['*', 'tech', 'gaming', 'eventos'], weight: 0.8,
  register: 'playful', intensity: 'loud', tags: ['profundidad', 'estrellas', 'warp', 'hiperespacio', 'velocidad'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'warp')
    // campo de estrellas saliendo desde el centro (efecto warp), trazos radiales segun profundidad
    ctx.fillStyle = darken(pal.bg1, 0.2); ctx.fillRect(0, 0, W, H)
    const cx = W / 2, cy = H * 0.46
    const N = 90
    ctx.lineCap = 'round'
    for (let i = 0; i < N; i++) {
      const ang = r() * TAU
      const speed = 0.1 + r() * 0.5
      const z = (t * CLK * speed + r()) % 1            // 0 centro -> 1 borde
      const ez = z * z
      const maxD = Math.hypot(W, H) * 0.6
      const d = ez * maxD
      const d2 = Math.max(0, d - (8 + ez * 26))
      const x1 = cx + Math.cos(ang) * d, y1 = cy + Math.sin(ang) * d
      const x2 = cx + Math.cos(ang) * d2, y2 = cy + Math.sin(ang) * d2
      const col = i % 7 === 0 ? pal.accent2 : (i % 3 === 0 ? pal.accent : '#ffffff')
      ctx.strokeStyle = rgba(col, 0.15 + ez * 0.6)
      ctx.lineWidth = 0.6 + ez * 2
      ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x1, y1); ctx.stroke()
    }
    // nucleo brillante
    const gl = ctx.createRadialGradient(cx, cy, 0, cx, cy, H * 0.3)
    gl.addColorStop(0, rgba(pal.accent, 0.2)); gl.addColorStop(1, rgba(pal.accent, 0))
    ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H)
    scrim(ctx, pal, { centerClear: 0.3, strength: 0.34 })
  },
})

register({
  id: 'bg.spatial.layeredpanes', lib: 'backgrounds', category: 'spatial-depth', tones: ['dark', 'light'], rubros: ['*', 'inmobiliaria', 'tech', 'finanzas'], weight: 0.85,
  register: 'corporate', intensity: 'soft', tags: ['profundidad', 'paneles', 'glass', 'parallax', 'capas'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'panes')
    rampBg(ctx, pal)
    // paneles redondeados translucidos apilados a distintas profundidades, deriva con parallax -> tarjetas de vidrio
    const M = 6
    const panes = Array.from({ length: M }, (_, i) => {
      const depth = (i + 1) / M
      return { depth, x: range(r, 0.1, 0.7) * W, y: range(r, 0.1, 0.7) * H, w: range(r, 0.3, 0.5) * W, h: range(r, 0.18, 0.34) * H, ph: r() * TAU, col: i % 2 ? pal.accent2 : pal.accent }
    }).sort((a, b) => a.depth - b.depth)
    const rr = (x, y, w, h, rad) => { ctx.beginPath(); ctx.moveTo(x + rad, y); ctx.arcTo(x + w, y, x + w, y + h, rad); ctx.arcTo(x + w, y + h, x, y + h, rad); ctx.arcTo(x, y + h, x, y, rad); ctx.arcTo(x, y, x + w, y, rad); ctx.closePath() }
    for (const p of panes) {
      const dx = Math.sin(t * CLK * 0.3 + p.ph) * (8 + p.depth * 16)
      const dy = Math.cos(t * CLK * 0.25 + p.ph) * (6 + p.depth * 12)
      const x = p.x + dx, y = p.y + dy
      rr(x, y, p.w, p.h, 16)
      ctx.fillStyle = rgba(p.col, (pal.tone === 'light' ? 0.06 : 0.08) * (0.5 + p.depth))
      ctx.fill()
      ctx.lineWidth = 1.2; ctx.strokeStyle = rgba(pal.tone === 'light' ? darken(p.col, 0.1) : lighten(p.col, 0.3), (pal.tone === 'light' ? 0.16 : 0.22) * (0.5 + p.depth))
      ctx.stroke()
    }
    scrim(ctx, pal, { centerClear: 0.36, strength: pal.tone === 'light' ? 0.14 : 0.26 })
  },
})

// ---- chrome-y2k ----

register({
  id: 'bg.chromey2k.lavalamp', lib: 'backgrounds', category: 'chrome-y2k', tones: ['dark', 'light'], rubros: ['*', 'moda', 'arte', 'gaming', 'eventos'], weight: 0.75,
  register: 'playful', intensity: 'bold', tags: ['y2k', 'metaballs', 'gradient', 'lava', 'organico'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'lava')
    // base con rampa fria/calida segun marca
    const g = ctx.createLinearGradient(0, 0, 0, H)
    if (pal.tone === 'light') { g.addColorStop(0, lighten(pal.accent2, 0.6)); g.addColorStop(1, lighten(pal.accent, 0.55)) }
    else { g.addColorStop(0, darken(pal.accent2, 0.5)); g.addColorStop(1, darken(pal.accent, 0.55)) }
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    // gotas grandes que suben/bajan lento con halo brillante (lava lamp y2k)
    const M = 6
    ctx.save(); ctx.globalCompositeOperation = pal.tone === 'light' ? 'screen' : 'lighter'
    for (let i = 0; i < M; i++) {
      const ph = r() * TAU, sp = range(r, 0.12, 0.34)
      const bx = W * (0.2 + r() * 0.6) + Math.sin(t * CLK * sp + ph) * 30
      const cycle = (t * CLK * sp * 0.5 + r()) % 1
      const by = H * (0.1 + 0.8 * (0.5 - 0.5 * Math.cos(cycle * TAU)))
      const rad = H * (0.1 + r() * 0.12)
      const col = i % 2 ? pal.accent2 : pal.accent
      const gr = ctx.createRadialGradient(bx, by, 0, bx, by, rad)
      gr.addColorStop(0, rgba(lighten(col, 0.4), pal.tone === 'light' ? 0.28 : 0.4))
      gr.addColorStop(0.6, rgba(col, pal.tone === 'light' ? 0.16 : 0.22))
      gr.addColorStop(1, rgba(col, 0))
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(bx, by, rad, 0, TAU); ctx.fill()
    }
    ctx.restore()
    scrim(ctx, pal, { centerClear: 0.36, strength: pal.tone === 'light' ? 0.18 : 0.3 })
  },
})

// ============================================================================
// OLA 6 — mas fondos full-canvas nuevos. Reusa rampBg/makeNoise/scrim/roundRect/shuffledLocal/CLK (ya en scope).
// Categorias: gradient-fields, geometric-graphic, generative-art, retro-print, tech-hud, spatial-depth,
// atmospheric-organic, chrome-y2k. Todos puros + deterministas (mulberry32/seedFor + t). Sutiles (texto encima).
// ============================================================================

// ---- gradient-fields ----

register({
  id: 'bg.gradient.silkfold', lib: 'backgrounds', category: 'gradient-fields', tones: ['dark', 'light'], rubros: ['*', 'moda', 'arte', 'salud'], weight: 1,
  register: 'editorial', intensity: 'soft', tags: ['calmo', 'seda', 'pliegues', 'premium', 'editorial'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'silk')
    rampBg(ctx, pal)
    // pliegues de seda: franjas diagonales de luz/sombra moduladas por suma de senos -> tela tornasolada suave.
    const ang = range(r, -0.6, 0.6), ux = Math.cos(ang), uy = Math.sin(ang)
    const span = Math.abs(W * ux) + Math.abs(H * uy)
    const ph = r() * TAU
    // en claro 'multiply' (oscurece los valles -> pliegues VISIBLES); en oscuro 'screen' (brillo en crestas)
    ctx.save(); ctx.globalCompositeOperation = pal.tone === 'light' ? 'multiply' : 'screen'
    const step = 6
    for (let p = -span; p <= span; p += step) {
      const u = (p + span) / (2 * span)
      // perfil de pliegue: varias frecuencias -> tela.
      const fold = 0.5 + 0.5 * Math.sin(u * 22 + Math.sin(u * 5 + ph) * 1.4 + t * CLK * 0.25 + ph)
      const col = (u + 0.5 * Math.sin(u * 3)) % 1 < 0.5 ? pal.accent : pal.accent2
      // claro: pintar los VALLES (1-hot) con tinte oscuro -> contraste; oscuro: pintar CRESTAS (hot) con tinte claro.
      const hot = Math.pow(fold, 2.4)
      const amt = pal.tone === 'light' ? Math.pow(1 - fold, 1.8) : hot
      const a = (pal.tone === 'light' ? 0.24 : 0.18) * amt
      ctx.fillStyle = rgba(pal.tone === 'light' ? darken(col, 0.25) : lighten(col, 0.4), a)
      const cx = (W / 2) + (p) * ux
      const cy = (H / 2) + (p) * uy
      // dibujar una banda perpendicular ancha que cubre el canvas
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang + Math.PI / 2)
      ctx.fillRect(-span, -step, span * 2, step + 1)
      ctx.restore()
    }
    ctx.restore()
    scrim(ctx, pal, { centerClear: 0.4, strength: pal.tone === 'light' ? 0.1 : 0.24 })
  },
})

register({
  id: 'bg.gradient.glowmesh', lib: 'backgrounds', category: 'gradient-fields', tones: ['dark', 'light'], rubros: ['*', 'tech', 'salud', 'educacion'], weight: 1.05,
  register: 'neutral', intensity: 'soft', tags: ['calmo', 'mesh', 'gradiente', 'universal', 'moderno'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'gmesh')
    rampBg(ctx, pal)
    // mesh-gradient moderno: 5 nodos de color en una grilla irregular, blobs radiales grandes que se mecen
    // muy lento -> degrade rico tipo Stripe/Linear. Opacidad contenida + scrim central.
    const nodes = []
    const gx = [0.16, 0.84, 0.5, 0.2, 0.8], gy = [0.16, 0.2, 0.5, 0.84, 0.82]
    for (let i = 0; i < 5; i++) {
      const ph = r() * TAU
      nodes.push({ x: gx[i] * W + Math.sin(t * CLK * 0.22 + ph) * 28, y: gy[i] * H + Math.cos(t * CLK * 0.19 + ph) * 30, col: i % 2 ? pal.accent2 : pal.accent })
    }
    ctx.save(); ctx.globalCompositeOperation = pal.tone === 'light' ? 'multiply' : 'lighter'
    for (const n of nodes) {
      const rad = H * (0.4 + r() * 0.18)
      const gr = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, rad)
      gr.addColorStop(0, rgba(n.col, pal.tone === 'light' ? 0.13 : 0.2)); gr.addColorStop(1, rgba(n.col, 0))
      ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H)
    }
    ctx.restore()
    scrim(ctx, pal, { centerClear: 0.42, strength: pal.tone === 'light' ? 0.08 : 0.2 })
  },
})

// ---- geometric-graphic ----

register({
  id: 'bg.geometric.stripewave', lib: 'backgrounds', category: 'geometric-graphic', tones: ['dark', 'light'], rubros: ['*', 'moda', 'eventos', 'deportes'], weight: 0.85,
  register: 'playful', intensity: 'bold', tags: ['geometrico', 'rayas', 'onda', 'movimiento', 'optico'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'stripew')
    rampBg(ctx, pal)
    // rayas verticales gruesas cuya base ondula horizontal (efecto op-art suave). Alternan acento/fondo translucido.
    const cols = 16, cw = W / cols
    const ph = r() * TAU
    ctx.save(); ctx.globalCompositeOperation = pal.tone === 'light' ? 'multiply' : 'screen'
    for (let i = 0; i < cols; i++) {
      if (i % 2) continue
      const col = (i / 2) % 3 === 0 ? pal.accent2 : pal.accent
      ctx.fillStyle = rgba(col, pal.tone === 'light' ? 0.14 : 0.16)
      ctx.beginPath()
      const x0 = i * cw
      ctx.moveTo(x0, -10)
      for (let y = -10; y <= H + 10; y += 14) {
        const sway = Math.sin(y * 0.012 + i * 0.5 + t * CLK * 0.4 + ph) * 12
        ctx.lineTo(x0 + sway, y)
      }
      for (let y = H + 10; y >= -10; y -= 14) {
        const sway = Math.sin(y * 0.012 + i * 0.5 + t * CLK * 0.4 + ph) * 12
        ctx.lineTo(x0 + cw + sway, y)
      }
      ctx.closePath(); ctx.fill()
    }
    ctx.restore()
    scrim(ctx, pal, { centerClear: 0.36, strength: pal.tone === 'light' ? 0.16 : 0.28 })
  },
})

register({
  id: 'bg.geometric.triangulation', lib: 'backgrounds', category: 'geometric-graphic', tones: ['dark', 'light'], rubros: ['*', 'tech', 'finanzas', 'arte'], weight: 0.8,
  register: 'neutral', intensity: 'medium', tags: ['geometrico', 'lowpoly', 'triangulos', 'facetado', 'cristal'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'trig')
    rampBg(ctx, pal)
    // malla low-poly: grilla de vertices jiggleados (deterministas) -> triangulos planos con tinte variable.
    const cols = 7, rows = 12
    const cw = W / cols, ch = H / rows
    // posiciones de vertices estables + un leve idle por t (mismo offset por vertice)
    const vx = (i, j) => i * cw + (i > 0 && i < cols ? (mulberry32((env.seed ^ (i * 73856093) ^ (j * 19349663)) >>> 0)() - 0.5) * cw * 0.6 + Math.sin(t * CLK * 0.2 + i + j) * 3 : 0)
    const vy = (i, j) => j * ch + (j > 0 && j < rows ? (mulberry32((env.seed ^ (i * 19349663) ^ (j * 83492791)) >>> 0)() - 0.5) * ch * 0.6 + Math.cos(t * CLK * 0.2 + i - j) * 3 : 0)
    ctx.lineWidth = 1
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const ax = vx(i, j), ay = vy(i, j)
      const bx = vx(i + 1, j), by = vy(i + 1, j)
      const cx = vx(i, j + 1), cy = vy(i, j + 1)
      const dx = vx(i + 1, j + 1), dy = vy(i + 1, j + 1)
      const tone1 = ((i * 7 + j * 13) % 6) / 6, tone2 = ((i * 11 + j * 5 + 3) % 6) / 6
      const fill1 = rgba((i + j) % 2 ? pal.accent : pal.accent2, (pal.tone === 'light' ? 0.05 : 0.07) + tone1 * (pal.tone === 'light' ? 0.08 : 0.1))
      const fill2 = rgba((i + j) % 2 ? pal.accent2 : pal.accent, (pal.tone === 'light' ? 0.05 : 0.07) + tone2 * (pal.tone === 'light' ? 0.08 : 0.1))
      ctx.fillStyle = fill1; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(cx, cy); ctx.closePath(); ctx.fill()
      ctx.fillStyle = fill2; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(dx, dy); ctx.lineTo(cx, cy); ctx.closePath(); ctx.fill()
      ctx.strokeStyle = rgba(pal.accent, pal.tone === 'light' ? 0.06 : 0.09)
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(cx, cy); ctx.lineTo(ax, ay); ctx.moveTo(bx, by); ctx.lineTo(dx, dy); ctx.lineTo(cx, cy); ctx.stroke()
    }
    scrim(ctx, pal, { centerClear: 0.36, strength: pal.tone === 'light' ? 0.16 : 0.28 })
  },
})

// ---- generative-art ----

register({
  id: 'bg.generative.spirograph', lib: 'backgrounds', category: 'generative-art', tones: ['dark', 'light'], rubros: ['*', 'arte', 'educacion', 'tech'], weight: 0.75,
  register: 'playful', intensity: 'medium', tags: ['generativo', 'espirografo', 'lineas', 'matematico', 'hipnotico'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'spiro')
    rampBg(ctx, pal)
    // curvas tipo espirografo (epicicloides): radios/razon sembrados -> rosetones distintos por semilla. Rotan lento.
    const cx = W / 2, cy = H * 0.46
    const R = H * 0.34
    const curves = 2
    ctx.save(); ctx.globalCompositeOperation = pal.tone === 'light' ? 'multiply' : 'screen'
    for (let c = 0; c < curves; c++) {
      const k = 0.2 + r() * 0.5            // razon de radios
      const l = 0.4 + r() * 0.5            // distancia del trazador
      const lobes = 3 + ((r() * 5) | 0)
      const rot = t * CLK * 0.06 * (c ? -1 : 1)
      const col = c ? pal.accent2 : pal.accent
      ctx.strokeStyle = rgba(col, pal.tone === 'light' ? 0.22 : 0.3); ctx.lineWidth = 1.2
      ctx.beginPath()
      const turns = lobes, N = 360 * 2
      for (let i = 0; i <= N; i++) {
        const th = (i / N) * TAU * turns
        const x = cx + R * ((1 - k) * Math.cos(th) + l * k * Math.cos((1 - k) / k * th) + rot * 0)
        const y = cy + R * ((1 - k) * Math.sin(th) - l * k * Math.sin((1 - k) / k * th))
        // rotacion global
        const dx = x - cx, dy = y - cy
        const rx = cx + dx * Math.cos(rot) - dy * Math.sin(rot)
        const ry = cy + dx * Math.sin(rot) + dy * Math.cos(rot)
        i === 0 ? ctx.moveTo(rx, ry) : ctx.lineTo(rx, ry)
      }
      ctx.stroke()
    }
    ctx.restore()
    scrim(ctx, pal, { centerClear: 0.32, strength: pal.tone === 'light' ? 0.18 : 0.32 })
  },
})

register({
  id: 'bg.generative.driftparticles', lib: 'backgrounds', category: 'generative-art', tones: ['dark', 'light'], rubros: ['*', 'tech', 'salud', 'eventos'], weight: 0.85,
  register: 'neutral', intensity: 'soft', tags: ['generativo', 'particulas', 'red', 'constelacion', 'flotante'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'drift')
    rampBg(ctx, pal)
    // particulas que derivan en orbitas suaves; lineas a vecinos -> red viva (plexus). Determinista por fase.
    const N = 34
    const pts = []
    for (let i = 0; i < N; i++) {
      const bx = r() * W, by = r() * H, ph = r() * TAU, sp = range(r, 0.2, 0.6), rad = 16 + r() * 26
      pts.push({ x: bx + Math.cos(t * CLK * sp + ph) * rad, y: by + Math.sin(t * CLK * sp * 0.9 + ph) * rad, big: r() < 0.2 })
    }
    ctx.lineWidth = 1
    for (let a = 0; a < N; a++) for (let b = a + 1; b < N; b++) {
      const dx = pts[a].x - pts[b].x, dy = pts[a].y - pts[b].y, d2 = dx * dx + dy * dy
      const lim = 78
      if (d2 < lim * lim) {
        const al = (1 - Math.sqrt(d2) / lim) * (pal.tone === 'light' ? 0.16 : 0.2)
        ctx.strokeStyle = rgba(pal.accent, al)
        ctx.beginPath(); ctx.moveTo(pts[a].x, pts[a].y); ctx.lineTo(pts[b].x, pts[b].y); ctx.stroke()
      }
    }
    for (const p of pts) {
      ctx.fillStyle = rgba(p.big ? pal.accent2 : pal.accent, p.big ? 0.6 : 0.4)
      ctx.beginPath(); ctx.arc(p.x, p.y, p.big ? 3.4 : 1.8, 0, TAU); ctx.fill()
    }
    scrim(ctx, pal, { centerClear: 0.34, strength: pal.tone === 'light' ? 0.16 : 0.28 })
  },
})

// ---- retro-print ----

register({
  id: 'bg.retroprint.memphis', lib: 'backgrounds', category: 'retro-print', tones: ['dark', 'light'], rubros: ['*', 'arte', 'eventos', 'moda', 'educacion'], weight: 0.8,
  register: 'playful', intensity: 'loud', tags: ['retro', 'memphis', '80s', 'formas', 'patron', 'ludico'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'memph')
    ctx.fillStyle = pal.tone === 'light' ? pal.bg0 : pal.bg1; ctx.fillRect(0, 0, W, H)
    // patron memphis: zigzags, puntos, squiggles y triangulitos sembrados, planos. Cada uno con idle propio (rotacion
    // lenta + flote) -> patron ludico SIEMPRE vivo, sin un solo movimiento global.
    const kinds = ['zig', 'dots', 'tri', 'ring', 'squig']
    const M = 16
    for (let i = 0; i < M; i++) {
      const bx = r() * W, by = r() * H, s = 16 + r() * 22
      const kind = kinds[(r() * kinds.length) | 0]
      const col = [pal.accent, pal.accent2, pal.tone === 'light' ? darken(pal.accent, 0.3) : lighten(pal.accent2, 0.3)][(r() * 3) | 0]
      const a = pal.tone === 'light' ? 0.32 : 0.3
      const baseRot = range(r, 0, TAU)
      const rotSpd = range(r, 0.08, 0.2) * (r() < 0.5 ? 1 : -1)
      const ph = r() * TAU
      const x = bx + Math.cos(t * CLK * 0.3 + ph) * 5, y = by + Math.sin(t * CLK * 0.26 + ph) * 5
      ctx.save(); ctx.translate(x, y); ctx.rotate(baseRot + t * CLK * rotSpd)
      ctx.strokeStyle = rgba(col, a); ctx.fillStyle = rgba(col, a); ctx.lineWidth = 3; ctx.lineCap = 'round'
      if (kind === 'zig') { ctx.beginPath(); for (let k = 0; k < 4; k++) { ctx.lineTo(k * s * 0.5, (k % 2 ? -1 : 1) * s * 0.3) } ctx.stroke() }
      else if (kind === 'dots') { for (let a2 = 0; a2 < 3; a2++) for (let b2 = 0; b2 < 3; b2++) { ctx.beginPath(); ctx.arc(a2 * 9, b2 * 9, 2, 0, TAU); ctx.fill() } }
      else if (kind === 'tri') { ctx.beginPath(); ctx.moveTo(0, -s * 0.6); ctx.lineTo(s * 0.5, s * 0.4); ctx.lineTo(-s * 0.5, s * 0.4); ctx.closePath(); ctx.stroke() }
      else if (kind === 'ring') { ctx.beginPath(); ctx.arc(0, 0, s * 0.5, 0, TAU); ctx.stroke() }
      else { ctx.beginPath(); for (let xx = -s; xx <= s; xx += 4) ctx.lineTo(xx, Math.sin(xx * 0.4 + t * CLK * 0.8 + ph) * 6); ctx.stroke() }
      ctx.restore()
    }
    scrim(ctx, pal, { centerClear: 0.36, strength: pal.tone === 'light' ? 0.14 : 0.26 })
  },
})

register({
  id: 'bg.retroprint.stamp', lib: 'backgrounds', category: 'retro-print', tones: ['dark', 'light'], rubros: ['*', 'gastronomia', 'arte', 'eventos'], weight: 0.7,
  register: 'playful', intensity: 'medium', tags: ['retro', 'sello', 'grunge', 'tinta', 'vintage'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'stamp')
    ctx.fillStyle = pal.tone === 'light' ? pal.bg0 : pal.bg1; ctx.fillRect(0, 0, W, H)
    // marco postal punteado (perforacion que "avanza": marching-ants suave) + arcos de "sello" que giran/respiran.
    const m = 26
    ctx.strokeStyle = rgba(pal.accent, pal.tone === 'light' ? 0.3 : 0.34); ctx.lineWidth = 2
    ctx.setLineDash([2, 8]); ctx.lineDashOffset = -(t * CLK * 8) % 10
    ctx.strokeRect(m, m, W - m * 2, H - m * 2); ctx.setLineDash([]); ctx.lineDashOffset = 0
    ctx.strokeStyle = rgba(pal.ink, pal.tone === 'light' ? 0.14 : 0.2); ctx.lineWidth = 1
    ctx.strokeRect(m + 8, m + 8, W - (m + 8) * 2, H - (m + 8) * 2)
    // sello circular arriba (cancelacion postal) que respira + gira muy lento
    const cx = W * 0.5, cy = H * 0.34, breathe = 1 + 0.03 * Math.sin(t * CLK * 0.5)
    const seal = t * CLK * 0.1
    ctx.strokeStyle = rgba(pal.accent2, pal.tone === 'light' ? 0.3 : 0.36); ctx.lineWidth = 2.4
    for (let k = 0; k < 2; k++) { ctx.beginPath(); ctx.arc(cx, cy, (52 - k * 12) * breathe, 0, TAU); ctx.stroke() }
    // marcas en el anillo (datestamp) que giran con el sello -> rotacion legible y continua
    ctx.lineWidth = 2.4
    for (let i = 0; i < 8; i++) {
      const ang = seal + (i / 8) * TAU
      const r0 = 52 * breathe, r1 = r0 + 5
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0); ctx.lineTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1); ctx.stroke()
    }
    // rayos de cancelacion que se desplazan lento (la tinta "corre")
    ctx.lineWidth = 2; ctx.strokeStyle = rgba(pal.accent2, pal.tone === 'light' ? 0.24 : 0.3)
    const rayOff = Math.sin(t * CLK * 0.4) * 6
    for (let i = 0; i < 9; i++) { const yy = cy - 16 + i * 4; ctx.beginPath(); ctx.moveTo(cx - 44 + rayOff, yy); ctx.lineTo(cx + 44 + rayOff, yy); ctx.stroke() }
    // grano vintage
    ctx.fillStyle = rgba(pal.tone === 'light' ? '#000' : '#fff', 0.03)
    for (let i = 0; i < 600; i++) ctx.fillRect((r() * W) | 0, (r() * H) | 0, 1, 1)
    scrim(ctx, pal, { centerClear: 0.32, strength: pal.tone === 'light' ? 0.12 : 0.24 })
  },
})

// ---- tech-hud ----

register({
  id: 'bg.techhud.matrixrain', lib: 'backgrounds', category: 'tech-hud', tones: ['dark'], rubros: ['*', 'tech', 'gaming', 'educacion'], weight: 0.72,
  register: 'playful', intensity: 'bold', tags: ['tech', 'matrix', 'lluvia', 'codigo', 'columnas'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'mrain')
    ctx.fillStyle = darken(pal.bg0, 0.12); ctx.fillRect(0, 0, W, H)
    // lluvia de glifos (representados por celdas) cayendo por columnas; la cabeza brilla con acento, la cola se apaga.
    const cellW = 17, cellH = 17
    const cols = Math.ceil(W / cellW), rows = Math.ceil(H / cellH) + 1
    for (let c = 0; c < cols; c++) {
      const sp = 4 + (mulberry32((env.seed ^ (c * 2654435761)) >>> 0)() * 8)
      const len = 6 + ((mulberry32((env.seed ^ (c * 40503)) >>> 0)() * 10) | 0)
      const startPh = mulberry32((env.seed ^ (c * 22699)) >>> 0)() * rows
      const head = ((t * CLK * sp + startPh) % (rows + len))
      for (let k = 0; k < len; k++) {
        const rowI = Math.floor(head) - k
        if (rowI < 0 || rowI >= rows) continue
        const fade = 1 - k / len
        const isHead = k === 0
        // glifo aleatorio estable por celda+rowI (no por frame) -> sin parpadeo no-determinista
        const lit = mulberry32((env.seed ^ (c * 92837) ^ (rowI * 689287)) >>> 0)() < 0.85
        if (!lit) continue
        const col = isHead ? lighten(pal.accent, 0.4) : pal.accent
        ctx.fillStyle = rgba(col, (isHead ? 0.8 : 0.4) * fade)
        ctx.fillRect(c * cellW + 3, rowI * cellH + 3, cellW - 6, cellH - 6)
      }
    }
    scrim(ctx, pal, { centerClear: 0.34, strength: 0.3 })
  },
})

register({
  id: 'bg.techhud.circuitboard', lib: 'backgrounds', category: 'tech-hud', tones: ['dark', 'light'], rubros: ['*', 'tech', 'finanzas', 'educacion'], weight: 0.78,
  register: 'corporate', intensity: 'medium', tags: ['tech', 'pcb', 'circuito', 'nodos', 'trazas'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'pcb')
    rampBg(ctx, pal)
    // placa PCB: trazas ortogonales con pads en los extremos; pulsos de acento que recorren algunas trazas.
    const traces = 16
    const lines = []
    for (let i = 0; i < traces; i++) {
      const horiz = r() < 0.5
      const a = horiz ? { x: 0, y: (0.08 + r() * 0.84) * H } : { x: (0.08 + r() * 0.84) * W, y: 0 }
      const midF = 0.3 + r() * 0.4
      const turn = horiz ? { x: midF * W, y: a.y } : { x: a.x, y: midF * H }
      const end = horiz ? { x: turn.x, y: (0.08 + r() * 0.84) * H } : { x: (0.08 + r() * 0.84) * W, y: turn.y }
      const end2 = horiz ? { x: W, y: end.y } : { x: end.x, y: H }
      lines.push({ pts: [a, turn, end, end2], ph: r() })
    }
    ctx.lineWidth = 1.4; ctx.lineCap = 'square'
    const traceCol = pal.tone === 'light' ? rgba(pal.accent, 0.14) : rgba(pal.accent, 0.16)
    for (const L of lines) {
      ctx.strokeStyle = traceCol
      ctx.beginPath(); L.pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke()
      // pads en los nodos
      for (const p of L.pts) { ctx.fillStyle = rgba(pal.accent, pal.tone === 'light' ? 0.2 : 0.26); ctx.beginPath(); ctx.arc(p.x, p.y, 2.4, 0, TAU); ctx.fill() }
    }
    // pulsos que viajan por las trazas (glow)
    ctx.save(); ctx.globalCompositeOperation = pal.tone === 'light' ? 'source-over' : 'lighter'
    for (let i = 0; i < lines.length; i++) {
      if (i % 3) continue
      const L = lines[i]
      // longitud total + interpolacion por segmentos
      let total = 0; const segs = []
      for (let s = 0; s < L.pts.length - 1; s++) { const dx = L.pts[s + 1].x - L.pts[s].x, dy = L.pts[s + 1].y - L.pts[s].y, d = Math.hypot(dx, dy); segs.push(d); total += d }
      let dist = ((t * CLK * 0.18 + L.ph) % 1) * total
      let px = L.pts[0].x, py = L.pts[0].y
      for (let s = 0; s < segs.length; s++) {
        if (dist <= segs[s]) { const f = dist / (segs[s] || 1); px = lerp(L.pts[s].x, L.pts[s + 1].x, f); py = lerp(L.pts[s].y, L.pts[s + 1].y, f); break }
        dist -= segs[s]
      }
      const col = i % 2 ? pal.accent2 : pal.accent
      const gr = ctx.createRadialGradient(px, py, 0, px, py, 9)
      gr.addColorStop(0, rgba(col, pal.tone === 'light' ? 0.7 : 0.9)); gr.addColorStop(1, rgba(col, 0))
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(px, py, 9, 0, TAU); ctx.fill()
    }
    ctx.restore()
    scrim(ctx, pal, { centerClear: 0.34, strength: pal.tone === 'light' ? 0.14 : 0.28 })
  },
})

// ---- spatial-depth ----

register({
  id: 'bg.spatial.isocity', lib: 'backgrounds', category: 'spatial-depth', tones: ['dark', 'light'], rubros: ['*', 'inmobiliaria', 'tech', 'finanzas'], weight: 0.82,
  register: 'corporate', intensity: 'medium', tags: ['profundidad', 'isometrico', 'ciudad', 'edificios', 'skyline'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'isocity')
    rampBg(ctx, pal)
    // skyline isometrico de prismas (edificios) de alturas sembradas, anclados abajo; uno o dos con ventana de acento.
    const base = H * 0.92
    const bw = 34, depth = 16
    const n = 9
    const startX = (W - n * bw) / 2
    for (let i = 0; i < n; i++) {
      const hgt = H * (0.14 + mulberry32((env.seed ^ (i * 374761393)) >>> 0)() * 0.34)
      const x = startX + i * bw
      const yTop = base - hgt
      const sway = Math.sin(t * CLK * 0.2 + i) * 1.5
      // cara frontal
      const faceCol = pal.tone === 'light' ? darken(pal.bg1, 0.1 + (i % 3) * 0.08) : lighten(pal.bg0, 0.04 + (i % 3) * 0.05)
      ctx.fillStyle = rgba(faceCol, pal.tone === 'light' ? 0.7 : 0.85)
      ctx.fillRect(x, yTop + sway, bw - 2, hgt)
      // cara lateral (mas oscura) -> volumen iso
      ctx.fillStyle = rgba(pal.tone === 'light' ? darken(faceCol, 0.18) : darken(faceCol, 0.4), pal.tone === 'light' ? 0.6 : 0.85)
      ctx.beginPath()
      ctx.moveTo(x + bw - 2, yTop + sway); ctx.lineTo(x + bw - 2 + depth, yTop - depth * 0.5 + sway)
      ctx.lineTo(x + bw - 2 + depth, base - depth * 0.5); ctx.lineTo(x + bw - 2, base); ctx.closePath(); ctx.fill()
      // techo
      ctx.fillStyle = rgba(pal.tone === 'light' ? lighten(faceCol, 0.3) : lighten(faceCol, 0.18), 0.8)
      ctx.beginPath()
      ctx.moveTo(x, yTop + sway); ctx.lineTo(x + bw - 2, yTop + sway); ctx.lineTo(x + bw - 2 + depth, yTop - depth * 0.5 + sway); ctx.lineTo(x + depth, yTop - depth * 0.5 + sway); ctx.closePath(); ctx.fill()
      // ventanas de acento: las encendidas TITILAN con fase propia (la ciudad esta viva de noche)
      for (let wy = yTop + 10; wy < base - 8; wy += 14) for (let wx = x + 4; wx < x + bw - 8; wx += 10) {
        const h = mulberry32((env.seed ^ (i * 6151) ^ ((wy | 0) * 31) ^ ((wx | 0) * 7)) >>> 0)
        const lit = h() < 0.3
        if (lit) {
          const tw = 0.6 + 0.4 * Math.sin(t * CLK * 0.9 + h() * TAU)
          ctx.fillStyle = rgba(pal.accent, (pal.tone === 'light' ? 0.45 : 0.6) * tw)
        } else {
          ctx.fillStyle = rgba(pal.ink, pal.tone === 'light' ? 0.06 : 0.1)
        }
        ctx.fillRect(wx, wy + sway, 5, 6)
      }
    }
    // bruma inferior
    const hz = ctx.createLinearGradient(0, base - 30, 0, H)
    hz.addColorStop(0, rgba(pal.bg1, 0)); hz.addColorStop(1, rgba(pal.tone === 'light' ? pal.bg1 : darken(pal.bg1, 0.3), 0.6))
    ctx.fillStyle = hz; ctx.fillRect(0, base - 30, W, H - base + 30)
    scrim(ctx, pal, { centerClear: 0.34, strength: pal.tone === 'light' ? 0.12 : 0.22 })
  },
})

register({
  id: 'bg.spatial.depthdots', lib: 'backgrounds', category: 'spatial-depth', tones: ['dark', 'light'], rubros: ['*', 'tech', 'salud', 'arte'], weight: 0.8,
  register: 'neutral', intensity: 'soft', tags: ['profundidad', 'puntos', 'campo', '3d-falso', 'parallax'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'ddots')
    rampBg(ctx, pal)
    // campo de puntos en profundidad: cada punto tiene z, deriva hacia la camara (crece/aclara) y reaparece al fondo.
    const N = 80
    const cx = W / 2, cyc = H * 0.46
    for (let i = 0; i < N; i++) {
      const ang = r() * TAU, baseR = 0.05 + r() * 0.95
      const z = ((r() + t * CLK * 0.06) % 1)          // 0 lejos -> 1 cerca
      const ez = z * z
      const spread = lerp(0.3, 1.25, ez)
      const x = cx + Math.cos(ang) * baseR * W * 0.6 * spread
      const y = cyc + Math.sin(ang) * baseR * H * 0.55 * spread
      const rad = 0.6 + ez * 3.4
      const col = i % 5 === 0 ? pal.accent2 : pal.accent
      ctx.fillStyle = rgba(col, (pal.tone === 'light' ? 0.12 : 0.16) + ez * (pal.tone === 'light' ? 0.18 : 0.3))
      ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.fill()
    }
    scrim(ctx, pal, { centerClear: 0.38, strength: pal.tone === 'light' ? 0.12 : 0.24 })
  },
})

// ---- atmospheric-organic ----

register({
  id: 'bg.atmospheric.inkdiffuse', lib: 'backgrounds', category: 'atmospheric-organic', tones: ['dark', 'light'], rubros: ['*', 'arte', 'moda', 'salud'], weight: 0.85,
  register: 'editorial', intensity: 'soft', tags: ['atmosferico', 'tinta', 'acuarela', 'difusion', 'organico'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'ink')
    rampBg(ctx, pal)
    // tinta difundida en agua: lobulos radiales irregulares (multiples radiales con bordes blandos) que respiran.
    ctx.save(); ctx.globalCompositeOperation = pal.tone === 'light' ? 'multiply' : 'screen'
    const blooms = 4
    for (let b = 0; b < blooms; b++) {
      const bcx = W * (0.2 + r() * 0.6), bcy = H * (0.15 + r() * 0.65)
      const phB = r() * TAU
      // la mancha deriva lenta en el agua (la tinta nunca queda quieta)
      const cx = bcx + Math.cos(t * CLK * 0.22 + phB) * 10, cy = bcy + Math.sin(t * CLK * 0.18 + phB) * 9
      const col = b % 2 ? pal.accent2 : pal.accent
      const lobes = 7 + ((r() * 5) | 0)
      const baseR = H * (0.16 + r() * 0.14)
      const breathe = 1 + 0.06 * Math.sin(t * CLK * 0.4 + b)
      // dibujar la mancha como poligono lobulado relleno con gradiente; los lobulos ondulan por t (difusion viva)
      ctx.beginPath()
      for (let i = 0; i <= 80; i++) {
        const a = (i / 80) * TAU
        const wob = 1 + 0.32 * Math.sin(a * lobes + t * CLK * 0.3 + phB) + 0.16 * Math.sin(a * (lobes + 3) - t * CLK * 0.2 + b)
        const rad = baseR * wob * breathe
        const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.closePath()
      const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseR * 1.4 * breathe)
      gr.addColorStop(0, rgba(col, pal.tone === 'light' ? 0.16 : 0.2)); gr.addColorStop(0.6, rgba(col, pal.tone === 'light' ? 0.07 : 0.09)); gr.addColorStop(1, rgba(col, 0))
      ctx.fillStyle = gr; ctx.fill()
    }
    ctx.restore()
    scrim(ctx, pal, { centerClear: 0.36, strength: pal.tone === 'light' ? 0.12 : 0.24 })
  },
})

register({
  id: 'bg.atmospheric.rainglass', lib: 'backgrounds', category: 'atmospheric-organic', tones: ['dark', 'light'], rubros: ['*', 'moda', 'arte', 'eventos'], weight: 0.75,
  register: 'editorial', intensity: 'soft', tags: ['atmosferico', 'lluvia', 'vidrio', 'gotas', 'melancolico'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'rain')
    // fondo: rampa + tinte de acento para que el vidrio tenga color (no gris)
    rampBg(ctx, pal)
    const tint = ctx.createRadialGradient(W * 0.5, H * 0.3, 0, W * 0.5, H * 0.5, H * 0.9)
    tint.addColorStop(0, rgba(pal.accent, pal.tone === 'light' ? 0.08 : 0.16)); tint.addColorStop(1, rgba(pal.accent2, pal.tone === 'light' ? 0.05 : 0.1))
    ctx.fillStyle = tint; ctx.fillRect(0, 0, W, H)
    // gotas estaticas sembradas: sombra + cuerpo + highlight -> volumen claro sobre el vidrio
    for (let i = 0; i < 80; i++) {
      const x = r() * W, y = r() * H, rad = 3 + r() * 7
      // sombra inferior
      ctx.fillStyle = rgba(pal.tone === 'light' ? '#000' : '#000', pal.tone === 'light' ? 0.08 : 0.18)
      ctx.beginPath(); ctx.arc(x + rad * 0.18, y + rad * 0.22, rad, 0, TAU); ctx.fill()
      // cuerpo de la gota (refraccion -> tinte de acento mas claro)
      ctx.fillStyle = rgba(pal.tone === 'light' ? lighten(pal.accent, 0.5) : lighten(pal.accent, 0.3), pal.tone === 'light' ? 0.16 : 0.2)
      ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.fill()
      // highlight especular
      ctx.fillStyle = rgba('#ffffff', pal.tone === 'light' ? 0.55 : 0.45)
      ctx.beginPath(); ctx.arc(x - rad * 0.32, y - rad * 0.34, rad * 0.32, 0, TAU); ctx.fill()
    }
    // regueros que caen (rayas que se desplazan vertical), con una gota-cabeza al final
    const streaks = 20
    for (let i = 0; i < streaks; i++) {
      const x = r() * W, len = 40 + r() * 110, sp = 0.3 + r() * 0.9
      const y = ((t * CLK * sp * 70 + r() * H) % (H + 160)) - 80
      const accent = i % 3 === 0
      const col = accent ? lighten(pal.accent, 0.2) : (pal.tone === 'light' ? '#7a8aa0' : '#ffffff')
      const g = ctx.createLinearGradient(0, y, 0, y + len)
      g.addColorStop(0, rgba(col, 0)); g.addColorStop(0.6, rgba(col, pal.tone === 'light' ? 0.18 : 0.22)); g.addColorStop(1, rgba(col, 0))
      ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + len); ctx.stroke()
      // gota-cabeza
      ctx.fillStyle = rgba(col, pal.tone === 'light' ? 0.28 : 0.3)
      ctx.beginPath(); ctx.arc(x, y + len, 3, 0, TAU); ctx.fill()
    }
    scrim(ctx, pal, { centerClear: 0.34, strength: pal.tone === 'light' ? 0.14 : 0.28 })
  },
})

// ---- chrome-y2k ----

register({
  id: 'bg.chromey2k.vaporsun', lib: 'backgrounds', category: 'chrome-y2k', tones: ['dark', 'light'], rubros: ['*', 'arte', 'moda', 'gaming', 'eventos'], weight: 0.78,
  register: 'playful', intensity: 'loud', tags: ['y2k', 'vaporwave', 'sol', 'gradiente', 'retro', 'sintetico'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'vapor')
    // cielo vaporwave: rampa vertical caliente->fria entre los acentos
    const g = ctx.createLinearGradient(0, 0, 0, H)
    if (pal.tone === 'light') { g.addColorStop(0, lighten(pal.accent2, 0.5)); g.addColorStop(0.5, lighten(pal.accent, 0.45)); g.addColorStop(1, lighten(pal.accent2, 0.3)) }
    else { g.addColorStop(0, darken(pal.accent2, 0.4)); g.addColorStop(0.5, darken(pal.accent, 0.35)); g.addColorStop(1, darken(pal.bg1, 0.1)) }
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    // sol con bandas horizontales (gap creciente hacia abajo) -> sol retro clasico
    const cx = W / 2, cy = H * 0.4, R = H * 0.2
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.clip()
    const sg = ctx.createLinearGradient(0, cy - R, 0, cy + R)
    sg.addColorStop(0, rgba(lighten(pal.accent, 0.4), pal.tone === 'light' ? 0.5 : 0.7)); sg.addColorStop(1, rgba(pal.accent2, pal.tone === 'light' ? 0.4 : 0.6))
    ctx.fillStyle = sg; ctx.fillRect(cx - R, cy - R, R * 2, R * 2)
    // cortes (bandas) en la mitad inferior del sol
    ctx.fillStyle = pal.tone === 'light' ? rgba(lighten(pal.accent2, 0.5), 0.9) : rgba(darken(pal.bg1, 0.1), 0.85)
    let gap = 4
    for (let yy = cy; yy < cy + R; yy += gap, gap += 1.6) ctx.fillRect(cx - R, yy, R * 2, gap * 0.5)
    ctx.restore()
    // halo del sol
    const halo = ctx.createRadialGradient(cx, cy, R * 0.7, cx, cy, R * 2)
    halo.addColorStop(0, rgba(pal.accent, pal.tone === 'light' ? 0.18 : 0.28)); halo.addColorStop(1, rgba(pal.accent, 0))
    ctx.fillStyle = halo; ctx.fillRect(0, 0, W, H)
    // grilla de piso synthwave abajo
    const horizon = H * 0.62
    ctx.strokeStyle = rgba(pal.accent, pal.tone === 'light' ? 0.3 : 0.4); ctx.lineWidth = 1
    const vp = cx
    for (let i = -7; i <= 7; i++) { ctx.beginPath(); ctx.moveTo(vp, horizon); ctx.lineTo(vp + i * (W / 4), H); ctx.stroke() }
    const scroll = (t * CLK * 0.5) % 1
    for (let j = 0; j < 12; j++) { const p = (j + scroll) / 12, y = horizon + (H - horizon) * (p * p); ctx.strokeStyle = rgba(pal.accent, (pal.tone === 'light' ? 0.3 : 0.4) * (1 - p) + 0.05); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }
    scrim(ctx, pal, { centerClear: 0.34, strength: pal.tone === 'light' ? 0.14 : 0.26 })
  },
})
