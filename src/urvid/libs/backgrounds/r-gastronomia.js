// urvid 1.0 · BACKGROUNDS del rubro GASTRONOMIA — archivo propio (no pisa index.js ni otros agentes).
// Vibe: calido, organico, texturado, apetitoso. Vapor, grano, trazo a mano, abundancia. Energico-calido.
// Contrato: render(ctx, t, env) full-canvas. SOLO env.pal (bg0/bg1 base por tono, accent/accent2 detalle).
// Determinista (mulberry32/seedFor, movimiento solo por t). Centro suave -> cuida el texto; detalle a los bordes.
import { register } from '../../core/registry.js'
import { mulberry32, range, irange, seedFor, shuffled } from '../../core/prng.js'
import { W, H, TAU, rgba, lighten, darken, clamp, lerp, mix, hexToHsl, hslToHex } from '../../core/util.js'

const CLK = 0.6   // reloj base de vida (mismo que el resto de la biblioteca)

// ---- helpers locales (prefijo g_ para no chocar con nada) ----------------------------------------

// rampa base calida bg0->bg1 (con un leve calentamiento del medio para que "respire apetito")
function g_warmBg(ctx, pal) {
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, pal.bg0)
  g.addColorStop(1, pal.bg1)
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
}

// scrim de legibilidad (oscurece en dark / aclara en light el centro hacia el borde)
function g_scrim(ctx, pal, { centerClear = 0.32, strength = null } = {}) {
  const s = strength == null ? (pal.tone === 'light' ? 0.22 : 0.42) : strength
  const v = ctx.createRadialGradient(W / 2, H * 0.46, H * centerClear, W / 2, H * 0.5, H * 0.84)
  v.addColorStop(0, 'rgba(0,0,0,0)')
  v.addColorStop(1, pal.tone === 'light' ? `rgba(255,255,255,${s})` : `rgba(0,0,0,${s})`)
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H)
}

// grano de pelicula determinista (sal y pimienta tenue) -> textura "horneada"/analogica
function g_grain(ctx, seed, pal, amt = 0.04, cell = 3) {
  const r = mulberry32(seed ^ 0x6e21)
  ctx.save()
  for (let y = 0; y < H; y += cell) for (let x = 0; x < W; x += cell) {
    const n = r()
    if (n < 0.5) continue
    const a = (n - 0.5) * 2 * amt
    ctx.fillStyle = pal.tone === 'light' ? `rgba(60,40,20,${a})` : `rgba(255,235,200,${a})`
    ctx.fillRect(x, y, cell, cell)
  }
  ctx.restore()
}

// columna de vapor que sube y se disipa (alfa baja, screen/multiply). vida via t (deriva senoidal lenta).
function g_steam(ctx, pal, t, x, baseY, w, h, col, ph, alpha) {
  const segs = 16
  ctx.beginPath()
  ctx.moveTo(x, baseY)
  for (let i = 0; i <= segs; i++) {
    const u = i / segs
    const yy = baseY - u * h
    const wob = Math.sin(u * 5 + t * CLK * 0.7 + ph) * (w * 0.5) * u + Math.sin(u * 11 + ph * 2) * (w * 0.18)
    ctx.lineTo(x + wob - w * 0.5 * (1 - u * 0.3), yy)
  }
  for (let i = segs; i >= 0; i--) {
    const u = i / segs
    const yy = baseY - u * h
    const wob = Math.sin(u * 5 + t * CLK * 0.7 + ph) * (w * 0.5) * u + Math.sin(u * 11 + ph * 2) * (w * 0.18)
    ctx.lineTo(x + wob + w * 0.5 * (1 - u * 0.3), yy)
  }
  ctx.closePath()
  const g = ctx.createLinearGradient(0, baseY, 0, baseY - h)
  g.addColorStop(0, rgba(col, 0)); g.addColorStop(0.3, rgba(col, alpha)); g.addColorStop(1, rgba(col, 0))
  ctx.fillStyle = g; ctx.fill()
}

// =====================================================================================================
// GRADIENT-FIELDS — calor de cocina, brasa, salsa
// =====================================================================================================

register({
  id: 'bg.gastrogradient.emberglow', lib: 'backgrounds', category: 'gradient-fields', tones: ['dark', 'light'], rubros: ['gastronomia', 'default'], weight: 1.05,
  register: 'friendly', intensity: 'soft', temp: 'warm', tags: ['gastronomia', 'calido', 'brasa', 'gradiente'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'ember')
    g_warmBg(ctx, pal)
    // resplandor de brasa que late lento desde abajo (calor del horno/parrilla)
    const pulse = 0.5 + 0.5 * Math.sin(t * CLK * 0.45)
    const cy = H * (0.96 + 0.02 * Math.sin(t * CLK * 0.3))
    const rad = H * (0.7 + 0.06 * pulse)
    const g = ctx.createRadialGradient(W * 0.5, cy, 0, W * 0.5, cy, rad)
    g.addColorStop(0, rgba(pal.accent, pal.tone === 'light' ? 0.2 : 0.34))
    g.addColorStop(0.45, rgba(pal.accent2, pal.tone === 'light' ? 0.1 : 0.16))
    g.addColorStop(1, rgba(pal.accent2, 0))
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    // chispas que suben (pocas, tenues) -> vida
    ctx.globalCompositeOperation = pal.tone === 'light' ? 'multiply' : 'lighter'
    const N = 14
    for (let i = 0; i < N; i++) {
      const ph = r() * TAU, sp = range(r, 0.2, 0.6)
      const x = r() * W
      const prog = ((t * CLK * sp + r()) % 1)
      const y = H - prog * H * 0.8
      const a = (1 - prog) * (pal.tone === 'light' ? 0.18 : 0.3)
      const rr = 1.2 + r() * 1.8
      ctx.fillStyle = rgba(i % 3 ? pal.accent : pal.accent2, a)
      ctx.beginPath(); ctx.arc(x + Math.sin(prog * 6 + ph) * 8, y, rr, 0, TAU); ctx.fill()
    }
    ctx.globalCompositeOperation = 'source-over'
    g_grain(ctx, env.seed, pal, 0.03)
    g_scrim(ctx, pal, { strength: pal.tone === 'light' ? 0.16 : 0.3 })
  },
})

register({
  id: 'bg.gastrogradient.saucepour', lib: 'backgrounds', category: 'gradient-fields', tones: ['dark', 'light'], rubros: ['gastronomia', 'default'], weight: 0.95,
  register: 'editorial', intensity: 'soft', temp: 'warm', tags: ['gastronomia', 'salsa', 'apetitoso', 'gradiente'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'sauce')
    // base + dos manchas calidas grandes (tomate/miel) que se mezclan lento como salsa
    g_warmBg(ctx, pal)
    ctx.globalCompositeOperation = pal.tone === 'light' ? 'multiply' : 'screen'
    for (let i = 0; i < 3; i++) {
      const ph = r() * TAU, sp = range(r, 0.14, 0.34)
      const bx = W * (i === 1 ? 0.5 : (i === 0 ? 0.16 : 0.86)) + Math.cos(t * CLK * sp + ph) * 30
      const by = H * (0.16 + r() * 0.68) + Math.sin(t * CLK * sp * 0.9 + ph) * 36
      const rad = H * (0.3 + r() * 0.16)
      const col = i % 2 ? pal.accent2 : pal.accent
      const gr = ctx.createRadialGradient(bx, by, 0, bx, by, rad)
      gr.addColorStop(0, rgba(col, pal.tone === 'light' ? 0.16 : 0.22))
      gr.addColorStop(0.6, rgba(col, pal.tone === 'light' ? 0.06 : 0.08))
      gr.addColorStop(1, rgba(col, 0))
      ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H)
    }
    ctx.globalCompositeOperation = 'source-over'
    g_scrim(ctx, pal, { strength: pal.tone === 'light' ? 0.2 : 0.36 })
  },
})

// =====================================================================================================
// ATMOSPHERIC-ORGANIC — vapor de cocina, humo de parrilla
// =====================================================================================================

register({
  id: 'bg.gastroatmos.kitchensteam', lib: 'backgrounds', category: 'atmospheric-organic', tones: ['dark', 'light'], rubros: ['gastronomia', 'default'], weight: 1.0,
  register: 'editorial', intensity: 'soft', temp: 'warm', tags: ['gastronomia', 'vapor', 'plato-caliente', 'atmosferico'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'steam')
    g_warmBg(ctx, pal)
    // vapor que sube de la base (3-4 columnas, pegadas a los bordes para no tapar el centro)
    ctx.globalCompositeOperation = pal.tone === 'light' ? 'multiply' : 'screen'
    const cols = 4
    const xs = [0.12, 0.32, 0.7, 0.9]
    for (let i = 0; i < cols; i++) {
      const x = W * xs[i]
      const ph = r() * TAU
      const h = H * (0.55 + r() * 0.3)
      const w = 70 + r() * 50
      const col = i % 2 ? pal.accent2 : pal.accent
      const a = (pal.tone === 'light' ? 0.16 : 0.14) * (0.7 + 0.3 * Math.sin(t * CLK * 0.5 + ph))
      g_steam(ctx, pal, t, x, H * 1.02, w, h, pal.tone === 'light' ? darken(col, 0.2) : col, ph, a)
    }
    ctx.globalCompositeOperation = 'source-over'
    // bruma calida inferior
    const g = ctx.createLinearGradient(0, H * 0.6, 0, H)
    g.addColorStop(0, rgba(pal.accent, 0)); g.addColorStop(1, rgba(pal.tone === 'light' ? darken(pal.accent, 0.15) : pal.accent, pal.tone === 'light' ? 0.14 : 0.12))
    ctx.fillStyle = g; ctx.fillRect(0, H * 0.6, W, H * 0.4)
    g_grain(ctx, env.seed, pal, 0.025)
    g_scrim(ctx, pal, { strength: pal.tone === 'light' ? 0.16 : 0.28 })
  },
})

register({
  id: 'bg.gastroatmos.grillsmoke', lib: 'backgrounds', category: 'atmospheric-organic', tones: ['dark', 'light'], rubros: ['gastronomia', 'default'], weight: 0.9,
  register: 'editorial', intensity: 'medium', temp: 'warm', tags: ['gastronomia', 'humo', 'parrilla', 'ahumado'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'smoke')
    // base mas oscura/contrastada para el humo
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, pal.tone === 'light' ? lighten(pal.bg0, 0.04) : darken(pal.bg0, 0.12))
    g.addColorStop(1, pal.bg1)
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    // capas de humo que derivan en diagonal (metaballs alargados)
    ctx.globalCompositeOperation = pal.tone === 'light' ? 'multiply' : 'screen'
    const M = 7
    for (let i = 0; i < M; i++) {
      const ph = r() * TAU, sp = range(r, 0.1, 0.28)
      const drift = (t * CLK * sp + r())
      const bx = ((r() * 1.4 - 0.2) * W + Math.cos(drift + ph) * 60)
      const by = H * (0.1 + r() * 0.85) + Math.sin(drift * 0.8 + ph) * 40
      const rad = H * (0.16 + r() * 0.2)
      const col = i % 3 === 0 ? pal.accent : (pal.tone === 'light' ? darken(pal.bg1, 0.25) : lighten(pal.bg1, 0.18))
      const gr = ctx.createRadialGradient(bx, by, 0, bx, by, rad)
      gr.addColorStop(0, rgba(col, pal.tone === 'light' ? 0.08 : 0.12))
      gr.addColorStop(1, rgba(col, 0))
      ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H)
    }
    ctx.globalCompositeOperation = 'source-over'
    g_grain(ctx, env.seed, pal, 0.035)
    g_scrim(ctx, pal, { strength: pal.tone === 'light' ? 0.2 : 0.34 })
  },
})

// =====================================================================================================
// ORGANIC / GENERATIVE — ingredientes esparcidos, vetas de madera, miel/aceite
// =====================================================================================================

// dibuja una hojita/ingrediente simple (forma de hoja) en (x,y) rotada
function g_leaf(ctx, x, y, s, rot, col, a) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot)
  ctx.fillStyle = rgba(col, a)
  ctx.beginPath()
  ctx.moveTo(0, -s)
  ctx.quadraticCurveTo(s * 0.7, 0, 0, s)
  ctx.quadraticCurveTo(-s * 0.7, 0, 0, -s)
  ctx.fill()
  // nervadura
  ctx.strokeStyle = rgba(col, a * 0.6); ctx.lineWidth = 0.8
  ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(0, s); ctx.stroke()
  ctx.restore()
}

register({
  id: 'bg.gastroorganic.herbscatter', lib: 'backgrounds', category: 'organic-natural', tones: ['dark', 'light'], rubros: ['gastronomia', 'default'], weight: 0.95,
  register: 'friendly', intensity: 'soft', temp: 'warm', tags: ['gastronomia', 'hierbas', 'ingredientes', 'organico', 'fresco'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'herb')
    g_warmBg(ctx, pal)
    // hojitas/granos esparcidos hacia los bordes (centro despejado para el texto)
    const N = 26
    for (let i = 0; i < N; i++) {
      let x = r() * W, y = r() * H
      // empujar fuera del centro
      const dx = x - W / 2, dy = y - H / 2
      const d = Math.hypot(dx, dy) / (H * 0.5)
      if (d < 0.5) { x = W / 2 + dx / (d || 0.01) * H * 0.5; y = H / 2 + dy / (d || 0.01) * H * 0.5 }
      const s = 6 + r() * 12
      const baseRot = r() * TAU
      const sway = Math.sin(t * CLK * 0.4 + i * 0.7) * 0.12   // mecida sutil
      const baseCol = i % 3 === 0 ? pal.accent2 : pal.accent
      const col = pal.tone === 'light' ? darken(baseCol, 0.25) : baseCol
      const a = (pal.tone === 'light' ? 0.3 : 0.26) * (0.7 + 0.3 * (1 - d))
      g_leaf(ctx, x, y, s, baseRot + sway, col, a * (d > 0.55 ? 1 : 0.5))
    }
    g_grain(ctx, env.seed, pal, 0.02)
    g_scrim(ctx, pal, { centerClear: 0.28, strength: pal.tone === 'light' ? 0.14 : 0.26 })
  },
})

register({
  id: 'bg.gastroorganic.woodgrain', lib: 'backgrounds', category: 'organic-natural', tones: ['dark', 'light'], rubros: ['gastronomia', 'default'], weight: 0.9,
  register: 'editorial', intensity: 'calm', temp: 'warm', tags: ['gastronomia', 'madera', 'tabla', 'rustico', 'textura'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'wood')
    // tabla de madera: rampa + vetas onduladas verticales que derivan apenas
    const g = ctx.createLinearGradient(0, 0, W, 0)
    g.addColorStop(0, pal.bg1); g.addColorStop(0.5, pal.bg0); g.addColorStop(1, darken(pal.bg1, 0.08))
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    const lines = 26
    const drift = Math.sin(t * CLK * 0.12) * 6
    for (let i = 0; i < lines; i++) {
      const baseX = (i / lines) * W + range(r, -6, 6)
      const amp = range(r, 4, 16)
      const freq = range(r, 0.004, 0.011)
      const ph = r() * TAU
      const dark = i % 4 === 0
      ctx.strokeStyle = rgba(dark ? pal.accent : (pal.tone === 'light' ? darken(pal.bg1, 0.2) : lighten(pal.bg0, 0.12)),
        pal.tone === 'light' ? (dark ? 0.12 : 0.07) : (dark ? 0.14 : 0.08))
      ctx.lineWidth = dark ? 1.6 : 1
      ctx.beginPath()
      for (let y = 0; y <= H; y += 8) {
        const x = baseX + Math.sin(y * freq + ph + drift * 0.02) * amp
        if (y === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    g_grain(ctx, env.seed, pal, 0.03)
    g_scrim(ctx, pal, { strength: pal.tone === 'light' ? 0.14 : 0.28 })
  },
})

register({
  id: 'bg.gastroorganic.honeydrip', lib: 'backgrounds', category: 'organic-natural', tones: ['dark', 'light'], rubros: ['gastronomia', 'default'], weight: 0.85,
  register: 'friendly', intensity: 'soft', temp: 'warm', tags: ['gastronomia', 'miel', 'dulce', 'goteo', 'organico'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'honey')
    g_warmBg(ctx, pal)
    // cortina de miel desde arriba: lobulos colgantes con goteo lento (centro mas corto -> deja respirar)
    const lobes = 7
    ctx.globalCompositeOperation = pal.tone === 'light' ? 'multiply' : 'screen'
    ctx.beginPath()
    ctx.moveTo(0, 0)
    for (let i = 0; i <= lobes; i++) {
      const x = (i / lobes) * W
      const centerBias = 1 - Math.abs(i / lobes - 0.5) * 1.3  // mas corto al centro
      const drop = H * (0.1 + 0.16 * (0.5 + 0.5 * Math.sin(i * 1.7 + t * CLK * 0.3))) * Math.max(0.15, 1 - centerBias)
      const cx = x - W / (lobes * 2)
      ctx.quadraticCurveTo(cx, drop + 26, x, drop)
    }
    ctx.lineTo(W, 0); ctx.closePath()
    const hg = ctx.createLinearGradient(0, 0, 0, H * 0.4)
    hg.addColorStop(0, rgba(pal.accent, pal.tone === 'light' ? 0.22 : 0.3))
    hg.addColorStop(1, rgba(pal.accent2, 0))
    ctx.fillStyle = hg; ctx.fill()
    // un par de gotas que caen lento por los bordes
    for (let i = 0; i < 4; i++) {
      const x = i < 2 ? W * (0.08 + r() * 0.12) : W * (0.8 + r() * 0.12)
      const prog = ((t * CLK * 0.18 + r()) % 1)
      const y = lerp(H * 0.1, H * 0.85, prog)
      const a = (1 - prog) * (pal.tone === 'light' ? 0.18 : 0.26)
      ctx.fillStyle = rgba(pal.accent, a)
      ctx.beginPath(); ctx.ellipse(x, y, 4, 7, 0, 0, TAU); ctx.fill()
    }
    ctx.globalCompositeOperation = 'source-over'
    g_scrim(ctx, pal, { strength: pal.tone === 'light' ? 0.16 : 0.28 })
  },
})

// =====================================================================================================
// GEOMETRIC / PATTERN — manteles, baldosas de bistro, listones de menu
// =====================================================================================================

register({
  id: 'bg.gastrogeo.gingham', lib: 'backgrounds', category: 'geometric-graphic', tones: ['dark', 'light'], rubros: ['gastronomia', 'default'], weight: 0.9,
  register: 'friendly', intensity: 'soft', temp: 'warm', tags: ['gastronomia', 'mantel', 'cuadrille', 'picnic', 'trattoria'],
  render(ctx, t, env) {
    const { pal } = env
    g_warmBg(ctx, pal)
    // mantel a cuadros (gingham): franjas semitransparentes que se cruzan -> donde se cruzan, mas densa
    const step = 46
    const off = (t * CLK * 1.6) % step   // deriva lentisima del patron
    const col = pal.accent
    const aBand = pal.tone === 'light' ? 0.1 : 0.12
    ctx.fillStyle = rgba(col, aBand)
    for (let x = -off; x < W; x += step * 2) ctx.fillRect(x, 0, step, H)
    for (let y = -off; y < H; y += step * 2) ctx.fillRect(0, y, W, step)
    // borde decorativo de acento2 para no ser plano
    ctx.fillStyle = rgba(pal.accent2, pal.tone === 'light' ? 0.06 : 0.08)
    for (let x = -off + step; x < W; x += step * 2) ctx.fillRect(x, 0, step / 2, H)
    g_grain(ctx, env.seed, pal, 0.02)
    g_scrim(ctx, pal, { strength: pal.tone === 'light' ? 0.18 : 0.3 })
  },
})

register({
  id: 'bg.gastrogeo.bistrotile', lib: 'backgrounds', category: 'geometric-graphic', tones: ['dark', 'light'], rubros: ['gastronomia', 'default'], weight: 0.85,
  register: 'editorial', intensity: 'calm', temp: 'warm', tags: ['gastronomia', 'baldosa', 'bistro', 'cafe', 'patron'],
  render(ctx, t, env) {
    const { pal } = env
    g_warmBg(ctx, pal)
    // baldosa hidraulica estilizada: rombos con un punto central, brillo que recorre en diagonal
    const step = 56
    const lineCol = pal.tone === 'light' ? darken(pal.bg1, 0.3) : lighten(pal.bg0, 0.14)
    ctx.strokeStyle = rgba(lineCol, pal.tone === 'light' ? 0.12 : 0.14); ctx.lineWidth = 1
    for (let y = -step; y < H + step; y += step) {
      for (let x = -step; x < W + step; x += step) {
        ctx.beginPath()
        ctx.moveTo(x + step / 2, y); ctx.lineTo(x + step, y + step / 2)
        ctx.lineTo(x + step / 2, y + step); ctx.lineTo(x, y + step / 2)
        ctx.closePath(); ctx.stroke()
        ctx.fillStyle = rgba(pal.accent, pal.tone === 'light' ? 0.08 : 0.1)
        ctx.beginPath(); ctx.arc(x + step / 2, y + step / 2, 2.4, 0, TAU); ctx.fill()
      }
    }
    // sheen diagonal lento (luz de vidriera de cafe)
    const sw = ((t * CLK * 0.1) % 1)
    const sx = lerp(-W * 0.3, W * 1.3, sw)
    ctx.save(); ctx.globalCompositeOperation = pal.tone === 'light' ? 'multiply' : 'screen'
    const sg = ctx.createLinearGradient(sx, 0, sx + 140, H)
    sg.addColorStop(0, rgba(pal.accent2, 0)); sg.addColorStop(0.5, rgba(pal.accent2, pal.tone === 'light' ? 0.06 : 0.08)); sg.addColorStop(1, rgba(pal.accent2, 0))
    ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H); ctx.restore()
    g_scrim(ctx, pal, { strength: pal.tone === 'light' ? 0.16 : 0.28 })
  },
})

register({
  id: 'bg.gastrogeo.menustripes', lib: 'backgrounds', category: 'geometric-graphic', tones: ['dark', 'light'], rubros: ['gastronomia', 'default'], weight: 0.85,
  register: 'corporate', intensity: 'soft', temp: 'warm', tags: ['gastronomia', 'menu', 'rayas', 'toldo', 'awning'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'menu')
    g_warmBg(ctx, pal)
    // toldo de bar: rayas verticales anchas (acento/transparente) arriba, que ondulan apenas como tela
    const stripes = 9
    const sw = W / stripes
    for (let i = 0; i < stripes; i++) {
      if (i % 2) continue
      const wob = Math.sin(t * CLK * 0.35 + i * 0.6) * 4
      ctx.fillStyle = rgba(i % 4 === 0 ? pal.accent2 : pal.accent, pal.tone === 'light' ? 0.1 : 0.12)
      ctx.beginPath()
      ctx.moveTo(i * sw + wob, 0)
      ctx.lineTo((i + 1) * sw + wob, 0)
      ctx.lineTo((i + 1) * sw - wob, H)
      ctx.lineTo(i * sw - wob, H)
      ctx.closePath(); ctx.fill()
    }
    // festón inferior del toldo (semicírculos) para identidad de bistro
    const scallops = 7, r2 = W / (scallops * 2)
    ctx.fillStyle = rgba(pal.accent, pal.tone === 'light' ? 0.12 : 0.16)
    const yScal = H * 0.16
    for (let i = 0; i < scallops; i++) {
      const cx = (i + 0.5) * (W / scallops)
      ctx.beginPath(); ctx.arc(cx, yScal, r2, 0, Math.PI); ctx.fill()
    }
    g_grain(ctx, env.seed, pal, 0.02)
    g_scrim(ctx, pal, { centerClear: 0.34, strength: pal.tone === 'light' ? 0.16 : 0.3 })
  },
})

// =====================================================================================================
// RETRO-PRINT / HAND-DRAWN — chalkboard, sello, riso de delivery
// =====================================================================================================

register({
  id: 'bg.gastroretro.chalkboard', lib: 'backgrounds', category: 'retro-print', tones: ['dark', 'light'], rubros: ['gastronomia', 'default'], weight: 1.0,
  register: 'friendly', intensity: 'medium', temp: 'warm', tags: ['gastronomia', 'pizarra', 'tiza', 'menu-del-dia', 'hand-drawn'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'chalk')
    // pizarra: base oscura aun en tono claro (un verde/marron muy oscuro derivado del bg)
    const board = pal.tone === 'light' ? darken(pal.bg1, 0.62) : darken(pal.bg0, 0.4)
    ctx.fillStyle = board; ctx.fillRect(0, 0, W, H)
    // nube de polvo de tiza (vineta clara central muy suave)
    const dust = ctx.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, H * 0.6)
    dust.addColorStop(0, 'rgba(255,255,255,0.05)'); dust.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = dust; ctx.fillRect(0, 0, W, H)
    // marco decorativo de tiza (doble linea irregular) hacia los bordes
    const m = 22
    const chalk = (col, a, lw) => { ctx.strokeStyle = rgba(col, a); ctx.lineWidth = lw }
    const wobblyRect = (x, y, w, h, jitter, seed) => {
      const rr = mulberry32(seed)
      ctx.beginPath()
      const pts = [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]]
      for (let i = 0; i < pts.length; i++) {
        const jx = (rr() - 0.5) * jitter, jy = (rr() - 0.5) * jitter
        if (i === 0) ctx.moveTo(pts[i][0] + jx, pts[i][1] + jy); else ctx.lineTo(pts[i][0] + jx, pts[i][1] + jy)
      }
      ctx.stroke()
    }
    chalk('#f3ead8', 0.4, 1.4); wobblyRect(m, m, W - m * 2, H - m * 2, 5, env.seed ^ 1)
    chalk(pal.accent, 0.5, 1.2); wobblyRect(m + 8, m + 8, W - (m + 8) * 2, H - (m + 8) * 2, 6, env.seed ^ 2)
    // floreo/swirl de tiza en esquinas (vida: respira en grosor con t)
    const flourish = (cx, cy, dir) => {
      ctx.strokeStyle = rgba(pal.accent2, 0.45 + 0.1 * Math.sin(t * CLK * 0.5))
      ctx.lineWidth = 1.4
      ctx.beginPath()
      for (let a = 0; a < TAU * 1.4; a += 0.2) {
        const rad = 4 + a * 4
        const x = cx + Math.cos(a * dir) * rad, y = cy + Math.sin(a * dir) * rad
        if (a === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    flourish(m + 30, m + 30, 1); flourish(W - m - 30, H - m - 30, -1)
    // textura de tiza (puntitos claros)
    const r2 = mulberry32(env.seed ^ 0xc4a1)
    ctx.fillStyle = 'rgba(255,255,255,0.04)'
    for (let i = 0; i < 200; i++) ctx.fillRect(r2() * W, r2() * H, 1, 1)
  },
})

register({
  id: 'bg.gastroretro.deliveryriso', lib: 'backgrounds', category: 'retro-print', tones: ['dark', 'light'], rubros: ['gastronomia', 'default'], weight: 0.85,
  register: 'playful', intensity: 'bold', temp: 'warm', tags: ['gastronomia', 'riso', 'delivery', 'duotono', 'puntos'],
  render(ctx, t, env) {
    const { pal } = env
    ctx.fillStyle = pal.tone === 'light' ? pal.bg0 : pal.bg1; ctx.fillRect(0, 0, W, H)
    // halftone radial calido: puntos crecen hacia los bordes (centro limpio para el texto)
    const step = 14, drift = t * CLK * 1.2
    const cx = W / 2, cy = H * 0.46
    const maxD = Math.hypot(W, H) * 0.5
    ctx.fillStyle = rgba(pal.tone === 'light' ? darken(pal.accent, 0.12) : pal.accent, pal.tone === 'light' ? 0.5 : 0.46)
    for (let y = 0; y < H + step; y += step) for (let x = 0; x < W + step; x += step) {
      const px = x + ((y / step) % 2) * (step / 2)
      const d = Math.hypot(px - cx, y - cy) / maxD
      const dens = clamp(d * 1.2 - 0.15 + 0.06 * Math.sin(d * 8 - drift), 0, 1)
      const rad = dens * (step * 0.5)
      if (rad < 0.5) continue
      ctx.beginPath(); ctx.arc(px, y, rad, 0, TAU); ctx.fill()
    }
    // segundo color desfasado (duotono riso)
    ctx.fillStyle = rgba(pal.tone === 'light' ? darken(pal.accent2, 0.12) : pal.accent2, pal.tone === 'light' ? 0.34 : 0.3)
    for (let y = step / 2; y < H + step; y += step) for (let x = step / 2; x < W + step; x += step) {
      const d = Math.hypot(x - cx, y - cy) / maxD
      const dens = clamp(d * 1.2 - 0.25 + 0.06 * Math.sin(d * 8 - drift + 2), 0, 1)
      const rad = dens * (step * 0.32)
      if (rad < 0.5) continue
      ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.fill()
    }
    g_grain(ctx, env.seed, pal, 0.03)
  },
})

register({
  id: 'bg.gastroretro.stampbadge', lib: 'backgrounds', category: 'retro-print', tones: ['dark', 'light'], rubros: ['gastronomia', 'default'], weight: 0.8,
  register: 'editorial', intensity: 'soft', temp: 'warm', tags: ['gastronomia', 'sello', 'organico', 'artesanal', 'badge'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'stamp')
    g_warmBg(ctx, pal)
    // grandes sellos circulares de tinta (estilo etiqueta artesanal) en las esquinas, rotando lentisimo
    const stamp = (cx, cy, R, rot, baseCol) => {
      const col = pal.tone === 'light' ? darken(baseCol, 0.18) : baseCol
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot)
      ctx.strokeStyle = rgba(col, pal.tone === 'light' ? 0.3 : 0.24)
      ctx.lineWidth = 2.2
      ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.stroke()
      ctx.beginPath(); ctx.arc(0, 0, R * 0.8, 0, TAU); ctx.stroke()
      // marcas radiales (rayitas de sello)
      ctx.strokeStyle = rgba(col, pal.tone === 'light' ? 0.24 : 0.18); ctx.lineWidth = 1.6
      for (let i = 0; i < 28; i++) {
        const a = (i / 28) * TAU
        ctx.beginPath()
        ctx.moveTo(Math.cos(a) * R * 0.82, Math.sin(a) * R * 0.82)
        ctx.lineTo(Math.cos(a) * R * 0.98, Math.sin(a) * R * 0.98)
        ctx.stroke()
      }
      // estrellita central
      ctx.fillStyle = rgba(col, pal.tone === 'light' ? 0.14 : 0.18)
      ctx.beginPath()
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU - Math.PI / 2
        const rad = i % 2 ? R * 0.18 : R * 0.4
        const x = Math.cos(a) * rad, y = Math.sin(a) * rad
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
      }
      ctx.closePath(); ctx.fill()
      ctx.restore()
    }
    const rot = t * CLK * 0.05
    stamp(W * 0.14, H * 0.16, H * 0.16, rot, pal.accent)
    stamp(W * 0.86, H * 0.86, H * 0.18, -rot * 0.7 + 0.5, pal.accent2)
    stamp(W * 0.9, H * 0.12, H * 0.1, rot * 1.3, pal.accent2)
    g_grain(ctx, env.seed, pal, 0.03)
    g_scrim(ctx, pal, { strength: pal.tone === 'light' ? 0.14 : 0.26 })
  },
})

// =====================================================================================================
// LINES / FLOW — vapor lineal, fideos/pasta, contornos de receta
// =====================================================================================================

register({
  id: 'bg.gastrolines.pastaswirl', lib: 'backgrounds', category: 'generative-art', tones: ['dark', 'light'], rubros: ['gastronomia', 'default'], weight: 0.9,
  register: 'friendly', intensity: 'soft', temp: 'warm', tags: ['gastronomia', 'pasta', 'fideos', 'lineas', 'organico'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'pasta')
    g_warmBg(ctx, pal)
    // hebras largas onduladas (fideos) que cruzan, mas densas hacia los bordes inferiores
    ctx.lineCap = 'round'
    ctx.globalCompositeOperation = pal.tone === 'light' ? 'multiply' : 'screen'
    const N = 16
    for (let i = 0; i < N; i++) {
      const yBase = range(r, -H * 0.1, H * 1.1)
      const amp = range(r, 14, 40)
      const freq = range(r, 0.006, 0.014)
      const ph = r() * TAU
      const speed = range(r, 0.15, 0.4)
      const baseCol = i % 4 === 0 ? pal.accent2 : pal.accent
      const col = pal.tone === 'light' ? darken(baseCol, 0.2) : baseCol
      // hebras lejos del centro vertical son mas visibles
      const dCenter = Math.abs(yBase - H * 0.46) / (H * 0.5)
      const a = (pal.tone === 'light' ? 0.3 : 0.26) * clamp(dCenter, 0.3, 1)
      ctx.strokeStyle = rgba(col, a)
      ctx.lineWidth = 2 + r() * 2
      ctx.beginPath()
      for (let x = -10; x <= W + 10; x += 10) {
        const y = yBase + Math.sin(x * freq + ph + t * CLK * speed) * amp + Math.sin(x * freq * 2.3 + ph) * amp * 0.3
        if (x === -10) ctx.moveTo(x, y); else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    ctx.globalCompositeOperation = 'source-over'
    g_scrim(ctx, pal, { strength: pal.tone === 'light' ? 0.2 : 0.34 })
  },
})

register({
  id: 'bg.gastrolines.steamcurls', lib: 'backgrounds', category: 'generative-art', tones: ['dark', 'light'], rubros: ['gastronomia', 'default'], weight: 0.85,
  register: 'editorial', intensity: 'calm', temp: 'warm', tags: ['gastronomia', 'vapor', 'lineas', 'cafe', 'aroma'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'curl')
    g_warmBg(ctx, pal)
    // espirales finas de aroma/vapor que suben (estilo ilustracion de cafe), pegadas a los lados
    ctx.lineCap = 'round'
    ctx.globalCompositeOperation = pal.tone === 'light' ? 'multiply' : 'screen'
    const N = 6
    const xs = [0.1, 0.22, 0.78, 0.9, 0.5, 0.5]
    for (let i = 0; i < N; i++) {
      const x0 = W * xs[i]
      const ph = r() * TAU
      const isCenter = i >= 4
      const h = H * (isCenter ? 0.3 : 0.6 + r() * 0.25)
      const baseY = isCenter ? H * 0.14 : H * (0.95 + r() * 0.05)
      const a = (pal.tone === 'light' ? 0.26 : 0.24) * (isCenter ? 0.5 : 1)
      const col = pal.tone === 'light' ? darken(i % 2 ? pal.accent2 : pal.accent, 0.2) : (i % 2 ? pal.accent2 : pal.accent)
      ctx.strokeStyle = rgba(col, a)
      ctx.lineWidth = 1.8
      ctx.beginPath()
      const segs = 40
      for (let s = 0; s <= segs; s++) {
        const u = s / segs
        const yy = baseY - u * h * (isCenter ? -1 : 1) * (isCenter ? -1 : 1)
        const y = isCenter ? baseY + u * h : baseY - u * h
        const wob = Math.sin(u * 8 + t * CLK * 0.5 + ph) * 18 * (0.3 + u * 0.7)
        const x = x0 + wob
        if (s === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    ctx.globalCompositeOperation = 'source-over'
    g_grain(ctx, env.seed, pal, 0.02)
    g_scrim(ctx, pal, { centerClear: 0.3, strength: pal.tone === 'light' ? 0.16 : 0.28 })
  },
})

// =====================================================================================================
// SEASONAL / ABUNDANCE — confeti de comida, plato cenital (centro despejado)
// =====================================================================================================

register({
  id: 'bg.gastroabundance.platering', lib: 'backgrounds', category: 'geometric-graphic', tones: ['dark', 'light'], rubros: ['gastronomia', 'default'], weight: 0.9,
  register: 'editorial', intensity: 'soft', temp: 'warm', tags: ['gastronomia', 'plato', 'cenital', 'circular', 'abundancia'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'plate')
    g_warmBg(ctx, pal)
    // gran plato cenital: anillos concentricos, el aro exterior con "bocaditos" distribuidos que orbitan lento
    const cx = W / 2, cy = H * 0.46
    const R = H * 0.42
    // aros del plato
    ctx.strokeStyle = rgba(pal.tone === 'light' ? darken(pal.bg1, 0.45) : lighten(pal.bg0, 0.2), pal.tone === 'light' ? 0.28 : 0.2)
    ctx.lineWidth = 1.6
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke()
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.78, 0, TAU); ctx.stroke()
    // borde de acento fino
    ctx.strokeStyle = rgba(pal.tone === 'light' ? darken(pal.accent, 0.2) : pal.accent, pal.tone === 'light' ? 0.32 : 0.26); ctx.lineWidth = 2.4
    ctx.beginPath(); ctx.arc(cx, cy, R * 1.04, 0, TAU); ctx.stroke()
    // bocaditos en el aro (decoracion emplatada) -> orbitan lentisimo
    const M = 12
    const orbit = t * CLK * 0.05
    for (let i = 0; i < M; i++) {
      const a = (i / M) * TAU + orbit
      const rr = R * (0.9 + 0.06 * Math.sin(i * 2.1))
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr
      const s = 5 + ((i * 7) % 5)
      const bc = i % 3 === 0 ? pal.accent2 : pal.accent
      ctx.fillStyle = rgba(pal.tone === 'light' ? darken(bc, 0.15) : bc, pal.tone === 'light' ? 0.32 : 0.3)
      ctx.beginPath(); ctx.arc(x, y, s, 0, TAU); ctx.fill()
    }
    g_grain(ctx, env.seed, pal, 0.02)
    // mantener el interior del plato muy limpio
    g_scrim(ctx, pal, { centerClear: 0.36, strength: pal.tone === 'light' ? 0.12 : 0.24 })
  },
})

register({
  id: 'bg.gastroabundance.foodconfetti', lib: 'backgrounds', category: 'seasonal', tones: ['dark', 'light'], rubros: ['gastronomia', 'default'], weight: 0.85,
  register: 'playful', intensity: 'medium', temp: 'warm', tags: ['gastronomia', 'confeti', 'celebracion', 'abundancia', 'fiesta'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'conf')
    g_warmBg(ctx, pal)
    // confeti de formas-comida simples (circulos=tomate, gajos, granos) cayendo lento, despejando el centro
    const N = 36
    for (let i = 0; i < N; i++) {
      const x0 = r() * W
      const sp = range(r, 0.05, 0.16)
      const prog = ((t * CLK * sp + r()) % 1)
      const y = prog * (H + 60) - 30
      const x = x0 + Math.sin(prog * 6 + i) * 22
      const dCenter = Math.abs(x - W / 2) / (W / 2)
      // si cae por el centro, lo hacemos casi invisible para no estorbar el texto
      const fade = clamp((dCenter - 0.3) / 0.4, 0, 1)
      const a = (pal.tone === 'light' ? 0.34 : 0.3) * (0.4 + 0.6 * fade)
      const bc = i % 3 === 0 ? pal.accent2 : pal.accent
      const col = pal.tone === 'light' ? darken(bc, 0.15) : bc
      const s = 4 + r() * 7
      const kind = i % 3
      ctx.save(); ctx.translate(x, y); ctx.rotate(prog * 6 + i)
      ctx.fillStyle = rgba(col, a)
      if (kind === 0) { ctx.beginPath(); ctx.arc(0, 0, s, 0, TAU); ctx.fill() }
      else if (kind === 1) { ctx.beginPath(); ctx.arc(0, 0, s, 0, Math.PI); ctx.fill() }   // gajo
      else { ctx.fillRect(-s * 0.3, -s, s * 0.6, s * 2) }   // grano
      ctx.restore()
    }
    g_scrim(ctx, pal, { centerClear: 0.3, strength: pal.tone === 'light' ? 0.16 : 0.28 })
  },
})
