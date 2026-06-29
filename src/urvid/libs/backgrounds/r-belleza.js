// urvid 1.0 · biblioteca BACKGROUNDS — RUBRO BELLEZA. Archivo propio (no pisa index.js).
// Estilo del rubro: suave, pasteles/rosados, glow, organico, elegante, luminoso, gradientes tenues, delicado.
// Contrato: render(ctx, t, env) full-canvas, usa SIEMPRE env.pal (bg0/bg1 base por tono; accent/accent2 detalle).
// Determinista: cero Math.random/Date.now -> mulberry32(env.seed)/seedFor; movimiento SOLO por t (vida sutil).
// Centro suave (no mata el contraste del texto); detalle hacia los bordes. Se ve bien en dark Y light.
import { register } from '../../core/registry.js'
import { mulberry32, range, seedFor } from '../../core/prng.js'
import { W, H, TAU, rgba, lighten, darken, clamp, lerp, mix, hexToHsl, hslToHex } from '../../core/util.js'

const CLK = 0.6

// ---- helpers privados (no comparten scope con index.js -> definidos aca para mantener el archivo autonomo) ----

// base suave por tono: rampa vertical bg0->bg1 (todos los fondos arrancan de aca)
function bzBg(ctx, pal) {
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, pal.bg0); g.addColorStop(1, pal.bg1)
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
}

// scrim de legibilidad: aclara (light) / oscurece (dark) hacia los bordes, deja el centro limpio para el texto
function bzScrim(ctx, pal, { centerClear = 0.34, strength = null } = {}) {
  const s = strength == null ? (pal.tone === 'light' ? 0.2 : 0.4) : strength
  const v = ctx.createRadialGradient(W / 2, H * 0.46, H * centerClear, W / 2, H * 0.5, H * 0.84)
  v.addColorStop(0, 'rgba(0,0,0,0)')
  v.addColorStop(1, pal.tone === 'light' ? `rgba(255,255,255,${s})` : `rgba(0,0,0,${s})`)
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H)
}

// pastel: lleva un color de marca a alta luminancia / baja-media saturacion (la firma del rubro belleza)
function pastel(hex, tone, sMul = 1) {
  const c = hexToHsl(hex)
  if (tone === 'light') return hslToHex(c.h, clamp(c.s * 0.55 * sMul, 0.18, 0.62), clamp(0.8, 0.74, 0.9))
  return hslToHex(c.h, clamp(c.s * 0.7 * sMul, 0.3, 0.78), clamp(0.6, 0.5, 0.7))
}

// blend tone-aware: en light multiplica (los pasteles se asientan), en dark aclara (glow)
function softBlend(pal) { return pal.tone === 'light' ? 'multiply' : 'lighter' }

// ============================================================================
// gradient-fields — degrades tenues, glow, mesh suave (el corazon del rubro)
// ============================================================================

register({
  id: 'bg.belleza.rosequartz', lib: 'backgrounds', category: 'gradient-fields', tones: ['dark', 'light'], rubros: ['belleza', 'default'], weight: 1.1,
  register: 'editorial', intensity: 'calm', temp: 'warm', tags: ['belleza', 'pastel', 'rosa', 'glow', 'suave'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'rosequartz')
    bzBg(ctx, pal)
    // dos lobulos pastel a la deriva (rose-quartz / serenity), opacidad contenida -> degrade lechoso
    ctx.save(); ctx.globalCompositeOperation = softBlend(pal)
    const lobes = [
      { x: 0.26, y: 0.22, col: pastel(pal.accent, pal.tone) },
      { x: 0.78, y: 0.8, col: pastel(pal.accent2, pal.tone) },
    ]
    for (let i = 0; i < lobes.length; i++) {
      const lo = lobes[i], ph = r() * TAU
      const bx = W * lo.x + Math.sin(t * CLK * 0.3 + ph) * 22
      const by = H * lo.y + Math.cos(t * CLK * 0.24 + ph) * 26
      const rad = H * 0.62
      const gr = ctx.createRadialGradient(bx, by, 0, bx, by, rad)
      gr.addColorStop(0, rgba(lo.col, pal.tone === 'light' ? 0.5 : 0.32))
      gr.addColorStop(0.6, rgba(lo.col, pal.tone === 'light' ? 0.18 : 0.12))
      gr.addColorStop(1, rgba(lo.col, 0))
      ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H)
    }
    ctx.restore()
    // brillo lechoso central que respira muy lento (vida) -> luminosidad de la piel
    const br = 0.94 + 0.06 * Math.sin(t * CLK * 0.4)
    const gl = ctx.createRadialGradient(W / 2, H * 0.44, 0, W / 2, H * 0.44, H * 0.4 * br)
    gl.addColorStop(0, rgba(pal.tone === 'light' ? '#ffffff' : lighten(pal.accent, 0.55), pal.tone === 'light' ? 0.22 : 0.08))
    gl.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H)
    bzScrim(ctx, pal, { strength: pal.tone === 'light' ? 0.12 : 0.3 })
  },
})

register({
  id: 'bg.belleza.peachglow', lib: 'backgrounds', category: 'gradient-fields', tones: ['dark', 'light'], rubros: ['belleza', 'default'], weight: 1,
  register: 'friendly', intensity: 'soft', temp: 'warm', tags: ['belleza', 'durazno', 'glow', 'calido', 'luminoso'],
  render(ctx, t, env) {
    const { pal } = env
    bzBg(ctx, pal)
    // resplandor calido desde una esquina inferior que sube suave (luz de tocador) -> deriva muy lenta
    const drift = 0.5 + 0.5 * Math.sin(t * CLK * 0.22)
    const ox = W * (0.18 + drift * 0.1), oy = H * (1.02 - drift * 0.06)
    const warm = pastel(pal.accent2, pal.tone, 1.1)
    const g1 = ctx.createRadialGradient(ox, oy, 0, ox, oy, H * 0.95)
    g1.addColorStop(0, rgba(warm, pal.tone === 'light' ? 0.4 : 0.3))
    g1.addColorStop(0.55, rgba(warm, pal.tone === 'light' ? 0.14 : 0.1))
    g1.addColorStop(1, rgba(warm, 0))
    ctx.save(); ctx.globalCompositeOperation = softBlend(pal)
    ctx.fillStyle = g1; ctx.fillRect(0, 0, W, H)
    // contra-luz fria tenue arriba a la derecha (balance de color, piel fresca)
    const cool = pastel(pal.accent, pal.tone, 0.9)
    const g2 = ctx.createRadialGradient(W * 0.86, H * 0.16, 0, W * 0.86, H * 0.16, H * 0.6)
    g2.addColorStop(0, rgba(cool, pal.tone === 'light' ? 0.26 : 0.18)); g2.addColorStop(1, rgba(cool, 0))
    ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H)
    ctx.restore()
    bzScrim(ctx, pal, { strength: pal.tone === 'light' ? 0.12 : 0.26 })
  },
})

register({
  id: 'bg.belleza.silkdrape', lib: 'backgrounds', category: 'gradient-fields', tones: ['dark', 'light'], rubros: ['belleza', 'default'], weight: 0.95,
  register: 'editorial', intensity: 'soft', temp: 'warm', tags: ['belleza', 'seda', 'pliegues', 'satin', 'elegante'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'silk')
    bzBg(ctx, pal)
    // pliegues de seda: bandas verticales suaves con luces/sombras que ondulan (satin) -> elegancia textil
    const bands = 9
    const ph0 = r() * TAU
    ctx.save(); ctx.globalCompositeOperation = pal.tone === 'light' ? 'soft-light' : 'screen'
    for (let i = 0; i < bands; i++) {
      const u = i / (bands - 1)
      const x = u * W
      // la posicion del brillo del pliegue ondula lento por t -> la tela "respira"
      const sheen = 0.5 + 0.5 * Math.sin(u * 7 + t * CLK * 0.4 + ph0)
      const col = i % 2 ? pastel(pal.accent, pal.tone) : pastel(pal.accent2, pal.tone)
      const bw = W / bands * 1.6
      const g = ctx.createLinearGradient(x - bw / 2, 0, x + bw / 2, 0)
      g.addColorStop(0, rgba(col, 0))
      g.addColorStop(0.5, rgba(pal.tone === 'light' ? '#ffffff' : lighten(col, 0.4), (pal.tone === 'light' ? 0.34 : 0.22) * sheen))
      g.addColorStop(1, rgba(col, 0))
      ctx.fillStyle = g; ctx.fillRect(x - bw / 2, 0, bw, H)
    }
    ctx.restore()
    bzScrim(ctx, pal, { centerClear: 0.36, strength: pal.tone === 'light' ? 0.14 : 0.3 })
  },
})

// ============================================================================
// atmospheric-organic — niebla pastel, bokeh, polvo dorado (glow + delicadeza)
// ============================================================================

register({
  id: 'bg.belleza.bokeh', lib: 'backgrounds', category: 'atmospheric-organic', tones: ['dark', 'light'], rubros: ['belleza', 'default'], weight: 1,
  register: 'friendly', intensity: 'soft', temp: 'warm', tags: ['belleza', 'bokeh', 'glow', 'particulas', 'luminoso'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'bokeh')
    bzBg(ctx, pal)
    // circulos de luz desenfocados a distintas profundidades, flote lento -> bokeh suave de tocador
    ctx.save(); ctx.globalCompositeOperation = softBlend(pal)
    const N = 22
    for (let i = 0; i < N; i++) {
      const bx0 = r() * W, by0 = r() * H, ph = r() * TAU
      const depth = r()                          // 0 lejos (chico/tenue) .. 1 cerca (grande)
      const rad = lerp(10, 46, depth) * (0.85 + 0.15 * Math.sin(t * CLK * 0.5 + ph))
      const bx = bx0 + Math.sin(t * CLK * 0.18 + ph) * (6 + depth * 14)
      const by = by0 - (t * CLK * (4 + depth * 10)) % (H + 120)   // suben lento
      const yy = ((by % (H + 120)) + (H + 120)) % (H + 120) - 60
      const col = i % 3 === 0 ? pastel(pal.accent2, pal.tone, 1.1) : pastel(pal.accent, pal.tone)
      const a = (pal.tone === 'light' ? 0.16 : 0.13) * (0.4 + depth * 0.6)
      const gr = ctx.createRadialGradient(bx, yy, 0, bx, yy, rad)
      gr.addColorStop(0, rgba(col, a)); gr.addColorStop(0.7, rgba(col, a * 0.5)); gr.addColorStop(1, rgba(col, 0))
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(bx, yy, rad, 0, TAU); ctx.fill()
    }
    ctx.restore()
    bzScrim(ctx, pal, { centerClear: 0.32, strength: pal.tone === 'light' ? 0.14 : 0.3 })
  },
})

register({
  id: 'bg.belleza.mistveil', lib: 'backgrounds', category: 'atmospheric-organic', tones: ['dark', 'light'], rubros: ['belleza', 'default'], weight: 0.95,
  register: 'editorial', intensity: 'calm', temp: 'warm', tags: ['belleza', 'niebla', 'velo', 'pastel', 'etereo'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'mist')
    bzBg(ctx, pal)
    // capas de velo pastel horizontales que se deslizan lento -> niebla etérea, muy suave en el centro
    ctx.save(); ctx.globalCompositeOperation = softBlend(pal)
    const layers = 5
    for (let i = 0; i < layers; i++) {
      const ph = r() * TAU
      const baseY = H * (0.12 + (i / (layers - 1)) * 0.78)
      const sway = Math.sin(t * CLK * 0.2 + ph) * 18
      const col = i % 2 ? pastel(pal.accent, pal.tone) : pastel(pal.accent2, pal.tone)
      const thick = H * (0.18 + r() * 0.12)
      const cy = baseY + sway
      const g = ctx.createLinearGradient(0, cy - thick, 0, cy + thick)
      g.addColorStop(0, rgba(col, 0))
      g.addColorStop(0.5, rgba(col, pal.tone === 'light' ? 0.16 : 0.11))
      g.addColorStop(1, rgba(col, 0))
      ctx.fillStyle = g; ctx.fillRect(0, cy - thick, W, thick * 2)
    }
    ctx.restore()
    bzScrim(ctx, pal, { strength: pal.tone === 'light' ? 0.1 : 0.24 })
  },
})

register({
  id: 'bg.belleza.golddust', lib: 'backgrounds', category: 'atmospheric-organic', tones: ['dark', 'light'], rubros: ['belleza', 'default'], weight: 0.85,
  register: 'editorial', intensity: 'soft', temp: 'warm', tags: ['belleza', 'polvo', 'shimmer', 'particulas', 'glam'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'gold')
    bzBg(ctx, pal)
    // halo central tenue (luz) + polvo brillante que flota y titila lento (shimmer delicado, no recargado)
    const gl = ctx.createRadialGradient(W / 2, H * 0.42, 0, W / 2, H * 0.42, H * 0.55)
    gl.addColorStop(0, rgba(pastel(pal.accent2, pal.tone, 1.1), pal.tone === 'light' ? 0.2 : 0.14))
    gl.addColorStop(1, rgba(pal.accent2, 0))
    ctx.save(); ctx.globalCompositeOperation = softBlend(pal)
    ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H)
    const N = 80
    for (let i = 0; i < N; i++) {
      const bx = r() * W, by0 = r() * H, ph = r() * TAU
      const drift = (t * CLK * (2 + r() * 4))
      const x = bx + Math.sin(t * CLK * 0.4 + ph) * 10
      const y = (((by0 - drift) % H) + H) % H
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * CLK * 1.0 + ph))
      const sz = (0.6 + r() * 1.4) * (0.6 + tw * 0.7)
      const col = i % 4 === 0 ? lighten(pal.accent, 0.4) : pastel(pal.accent2, pal.tone, 1.2)
      ctx.fillStyle = rgba(col, (pal.tone === 'light' ? 0.32 : 0.5) * tw)
      ctx.beginPath(); ctx.arc(x, y, sz, 0, TAU); ctx.fill()
    }
    ctx.restore()
    bzScrim(ctx, pal, { centerClear: 0.3, strength: pal.tone === 'light' ? 0.12 : 0.26 })
  },
})

// ============================================================================
// organic / morph — petalos, ondas, blobs suaves (delicadeza floral)
// ============================================================================

register({
  id: 'bg.belleza.petals', lib: 'backgrounds', category: 'atmospheric-organic', tones: ['dark', 'light'], rubros: ['belleza', 'default'], weight: 0.9,
  register: 'friendly', intensity: 'soft', temp: 'warm', tags: ['belleza', 'petalos', 'flores', 'organico', 'delicado'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'petals')
    bzBg(ctx, pal)
    // petalos translucidos que caen y giran lento (elipses suaves) -> delicadeza floral, detalle hacia los bordes
    ctx.save(); ctx.globalCompositeOperation = softBlend(pal)
    const N = 16
    for (let i = 0; i < N; i++) {
      const bx0 = r() * W, ph = r() * TAU, spd = 6 + r() * 10
      const sideBias = r() < 0.5 ? -1 : 1
      const fall = (t * CLK * spd) % (H + 120)
      const y = ((r() * (H + 120) + fall) % (H + 120)) - 60
      const x = bx0 + Math.sin(t * CLK * 0.4 + ph) * 26 + sideBias * 10
      const rot = ph + t * CLK * 0.5 * (i % 2 ? 1 : -1)
      const w = 10 + r() * 12, h = w * (1.7 + r() * 0.6)
      const col = i % 3 === 0 ? pastel(pal.accent2, pal.tone) : pastel(pal.accent, pal.tone)
      // los del centro mas tenues (cuidan el texto); los de los bordes un poco mas presentes
      const edge = clamp(Math.abs(x - W / 2) / (W / 2), 0, 1)
      const a = (pal.tone === 'light' ? 0.14 : 0.12) * (0.4 + edge * 0.6)
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot)
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, h)
      g.addColorStop(0, rgba(col, a)); g.addColorStop(1, rgba(col, 0))
      ctx.fillStyle = g
      ctx.beginPath(); ctx.ellipse(0, 0, w, h, 0, 0, TAU); ctx.fill()
      ctx.restore()
    }
    ctx.restore()
    bzScrim(ctx, pal, { centerClear: 0.34, strength: pal.tone === 'light' ? 0.12 : 0.28 })
  },
})

register({
  id: 'bg.belleza.bloomwaves', lib: 'backgrounds', category: 'gradient-fields', tones: ['dark', 'light'], rubros: ['belleza', 'default'], weight: 0.9,
  register: 'editorial', intensity: 'soft', temp: 'warm', tags: ['belleza', 'ondas', 'organico', 'pastel', 'fluido'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'bloom')
    bzBg(ctx, pal)
    // ondas pastel apiladas desde abajo (colinas suaves) que ondulan lento -> base organica, centro despejado
    ctx.save(); ctx.globalCompositeOperation = softBlend(pal)
    const layers = 4
    for (let l = 0; l < layers; l++) {
      const depth = l / (layers - 1)
      const ph = r() * TAU
      const baseY = H * (0.58 + depth * 0.28)
      const amp = 16 + depth * 22
      const freq = 0.006 + depth * 0.003
      const col = l % 2 ? pastel(pal.accent, pal.tone) : pastel(pal.accent2, pal.tone)
      ctx.fillStyle = rgba(col, pal.tone === 'light' ? 0.2 + depth * 0.12 : 0.14 + depth * 0.1)
      ctx.beginPath(); ctx.moveTo(0, H)
      for (let x = 0; x <= W; x += 8) {
        const y = baseY + Math.sin(x * freq + ph + t * CLK * 0.3) * amp + Math.sin(x * freq * 2.2 + ph) * amp * 0.3
        ctx.lineTo(x, y)
      }
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill()
    }
    // eco simetrico tenue arriba (la flor "abre" hacia ambos lados)
    const ph2 = r() * TAU
    ctx.fillStyle = rgba(pastel(pal.accent, pal.tone), pal.tone === 'light' ? 0.12 : 0.08)
    ctx.beginPath(); ctx.moveTo(0, 0)
    for (let x = 0; x <= W; x += 8) {
      const y = H * 0.22 + Math.sin(x * 0.007 + ph2 - t * CLK * 0.25) * 16
      ctx.lineTo(x, y)
    }
    ctx.lineTo(W, 0); ctx.closePath(); ctx.fill()
    ctx.restore()
    bzScrim(ctx, pal, { strength: pal.tone === 'light' ? 0.1 : 0.24 })
  },
})

// ============================================================================
// geometric-graphic — arcos, lineas finas, marcos elegantes (lujo editorial sutil)
// ============================================================================

register({
  id: 'bg.belleza.archframe', lib: 'backgrounds', category: 'geometric-graphic', tones: ['dark', 'light'], rubros: ['belleza', 'default'], weight: 0.85,
  register: 'editorial', intensity: 'calm', temp: 'warm', tags: ['belleza', 'arco', 'spa', 'minimal', 'elegante'],
  render(ctx, t, env) {
    const { pal } = env
    bzBg(ctx, pal)
    // arcos concentricos (nicho / spa) anclados abajo-centro, glow tenue dentro -> calma elegante
    const cx = W / 2, cy = H * 0.92
    const breathe = 1 + 0.02 * Math.sin(t * CLK * 0.4)
    const glow = ctx.createRadialGradient(cx, H * 0.5, 0, cx, H * 0.5, H * 0.5)
    glow.addColorStop(0, rgba(pastel(pal.accent2, pal.tone, 1.1), pal.tone === 'light' ? 0.14 : 0.1))
    glow.addColorStop(1, rgba(pal.accent2, 0))
    ctx.save(); ctx.globalCompositeOperation = softBlend(pal)
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H)
    ctx.restore()
    const arcs = 5
    for (let i = 0; i < arcs; i++) {
      const rad = (H * (0.3 + i * 0.13)) * breathe
      const col = i % 2 ? pal.accent2 : pal.accent
      ctx.strokeStyle = rgba(pal.tone === 'light' ? darken(col, 0.05) : lighten(col, 0.3), (pal.tone === 'light' ? 0.22 : 0.26) * (1 - i * 0.12))
      ctx.lineWidth = 1.4
      ctx.beginPath(); ctx.arc(cx, cy, rad, Math.PI, TAU); ctx.stroke()
    }
    // punto de luz que se desliza por el arco interior (vida puntual continua)
    const a = Math.PI + (0.5 + 0.5 * Math.sin(t * CLK * 0.5)) * Math.PI
    const rr = H * 0.3 * breathe
    ctx.fillStyle = rgba(pal.tone === 'light' ? darken(pal.accent, 0.05) : lighten(pal.accent, 0.5), 0.6)
    ctx.beginPath(); ctx.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 2.6, 0, TAU); ctx.fill()
    bzScrim(ctx, pal, { centerClear: 0.38, strength: pal.tone === 'light' ? 0.1 : 0.24 })
  },
})

register({
  id: 'bg.belleza.thinlines', lib: 'backgrounds', category: 'geometric-graphic', tones: ['dark', 'light'], rubros: ['belleza', 'default'], weight: 0.8,
  register: 'editorial', intensity: 'calm', temp: 'warm', tags: ['belleza', 'lineas', 'minimal', 'lujo', 'editorial'],
  render(ctx, t, env) {
    const { pal } = env
    bzBg(ctx, pal)
    // lineas onduladas finas paralelas (contour de lujo) que se desplazan muy lento -> minimal elegante
    const lines = 26
    const drift = t * CLK * 0.12
    for (let i = 0; i < lines; i++) {
      const u = i / (lines - 1)
      const baseY = u * H
      const col = i % 6 === 0 ? pal.accent : (pal.tone === 'light' ? darken(pal.bg1, 0.3) : lighten(pal.bg0, 0.18))
      // las del centro mas tenues (no compiten con el texto)
      const center = 1 - clamp(Math.abs(u - 0.5) / 0.5, 0, 1)
      ctx.strokeStyle = rgba(col, (pal.tone === 'light' ? 0.12 : 0.14) * (1 - center * 0.6) + (i % 6 === 0 ? 0.06 : 0))
      ctx.lineWidth = i % 6 === 0 ? 1.2 : 0.8
      ctx.beginPath()
      for (let x = 0; x <= W; x += 10) {
        const y = baseY + Math.sin(x * 0.01 + u * 6 + drift) * (6 + u * 6)
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    bzScrim(ctx, pal, { centerClear: 0.36, strength: pal.tone === 'light' ? 0.12 : 0.26 })
  },
})

// ============================================================================
// chrome-y2k / glam — perla iridiscente, glass (brillo premium pero suave)
// ============================================================================

register({
  id: 'bg.belleza.pearl', lib: 'backgrounds', category: 'chrome-y2k', tones: ['dark', 'light'], rubros: ['belleza', 'default'], weight: 0.85,
  register: 'editorial', intensity: 'soft', temp: 'warm', tags: ['belleza', 'perla', 'nacar', 'iridiscente', 'premium'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'pearl')
    bzBg(ctx, pal)
    // nacar: bandas diagonales de hue cercano a la marca con brillo perlado que barre lento (suave, no foil duro)
    const h0 = hexToHsl(pal.accent).h, h1 = hexToHsl(pal.accent2).h
    const hc = (h0 + h1) / 2
    const ang = Math.PI / 5, ux = Math.cos(ang), uy = Math.sin(ang)
    const perpx = -uy, perpy = ux
    const L = Math.max(W, H) * 1.6
    const span = W * ux + H * uy
    const stripe = 46
    const shift = t * CLK * 0.4 + r() * TAU
    ctx.save(); ctx.globalCompositeOperation = softBlend(pal)
    for (let p = -span; p < span * 1.2; p += stripe) {
      const u = (p + span) / (2 * span)
      const hue = hc + Math.sin(u * 4 + shift) * 36
      const lum = pal.tone === 'light' ? 0.82 : 0.62
      const col = hslToHex(hue, 0.4, lum)
      const a = pal.tone === 'light' ? 0.2 : 0.16
      const px = p * ux, py = p * uy
      const g = ctx.createLinearGradient(px - perpx * 0, py - perpy * 0, px + ux * stripe, py + uy * stripe)
      g.addColorStop(0, rgba(col, 0)); g.addColorStop(0.5, rgba(col, a)); g.addColorStop(1, rgba(col, 0))
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.moveTo(px - perpx * L, py - perpy * L)
      ctx.lineTo(px + perpx * L, py + perpy * L)
      ctx.lineTo(px + perpx * L + ux * stripe, py + perpy * L + uy * stripe)
      ctx.lineTo(px - perpx * L + ux * stripe, py - perpy * L + uy * stripe)
      ctx.closePath(); ctx.fill()
    }
    ctx.restore()
    // sheen perlado que cruza lento
    const sheen = ((t * CLK * 0.1) % 1)
    const sx = lerp(-0.3, 1.3, sheen) * span
    ctx.save(); ctx.globalCompositeOperation = 'screen'
    const sgx = sx * ux, sgy = sx * uy
    const sg = ctx.createLinearGradient(sgx - perpx, sgy - perpy, sgx + ux * 140, sgy + uy * 140)
    sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, `rgba(255,255,255,${pal.tone === 'light' ? 0.22 : 0.18})`); sg.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H); ctx.restore()
    bzScrim(ctx, pal, { strength: pal.tone === 'light' ? 0.14 : 0.3 })
  },
})

register({
  id: 'bg.belleza.glassorbs', lib: 'backgrounds', category: 'chrome-y2k', tones: ['dark', 'light'], rubros: ['belleza', 'default'], weight: 0.8,
  register: 'friendly', intensity: 'soft', temp: 'warm', tags: ['belleza', 'glass', 'burbujas', 'glow', 'glam'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'glassorbs')
    bzBg(ctx, pal)
    // orbes de vidrio pastel con highlight especular, flotando lento -> sensacion de serum / gota
    const M = 5
    for (let i = 0; i < M; i++) {
      const ph = r() * TAU, sp = range(r, 0.16, 0.4)
      // anclados hacia los bordes (no en el centro de texto)
      const ax = i % 2 ? 0.82 : 0.18, ay = 0.18 + (i / M) * 0.64
      const x = W * ax + Math.cos(t * CLK * sp + ph) * 20
      const y = H * ay + Math.sin(t * CLK * sp * 0.8 + ph) * 26
      const rad = H * (0.08 + r() * 0.07)
      const col = pastel(i % 2 ? pal.accent2 : pal.accent, pal.tone)
      // cuerpo translucido
      const body = ctx.createRadialGradient(x, y, 0, x, y, rad)
      body.addColorStop(0, rgba(lighten(col, 0.35), pal.tone === 'light' ? 0.26 : 0.28))
      body.addColorStop(0.7, rgba(col, pal.tone === 'light' ? 0.14 : 0.16))
      body.addColorStop(1, rgba(col, 0))
      ctx.fillStyle = body; ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.fill()
      // borde de vidrio
      ctx.strokeStyle = rgba(pal.tone === 'light' ? '#ffffff' : lighten(col, 0.5), 0.34); ctx.lineWidth = 1.4
      ctx.beginPath(); ctx.arc(x, y, rad * 0.92, 0, TAU); ctx.stroke()
      // highlight especular arriba-izquierda
      const hl = ctx.createRadialGradient(x - rad * 0.32, y - rad * 0.4, 0, x - rad * 0.32, y - rad * 0.4, rad * 0.5)
      hl.addColorStop(0, `rgba(255,255,255,${pal.tone === 'light' ? 0.45 : 0.4})`); hl.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = hl; ctx.beginPath(); ctx.arc(x - rad * 0.32, y - rad * 0.4, rad * 0.5, 0, TAU); ctx.fill()
    }
    bzScrim(ctx, pal, { centerClear: 0.34, strength: pal.tone === 'light' ? 0.12 : 0.26 })
  },
})

// ============================================================================
// light-substrate / editorial — papel pastel con detalle minimo (belleza editorial)
// ============================================================================

register({
  id: 'bg.belleza.softpaper', lib: 'backgrounds', category: 'light-substrate-paper', tones: ['dark', 'light'], rubros: ['belleza', 'default'], weight: 0.95,
  register: 'editorial', intensity: 'calm', temp: 'warm', tags: ['belleza', 'papel', 'editorial', 'minimal', 'crema'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'softpaper')
    // papel teñido al hue de marca, muy claro en light / superficie suave en dark
    const hue = hexToHsl(pal.accent).h
    const paper = pal.tone === 'light' ? hslToHex(hue, 0.16, 0.955) : hslToHex(hue, 0.22, 0.1)
    ctx.fillStyle = paper; ctx.fillRect(0, 0, W, H)
    // wash pastel en una esquina superior (acuarela suave) que respira
    const wx = W * 0.8, wy = H * 0.14
    const br = 0.94 + 0.06 * Math.sin(t * CLK * 0.35)
    const wash = ctx.createRadialGradient(wx, wy, 0, wx, wy, H * 0.5 * br)
    wash.addColorStop(0, rgba(pastel(pal.accent2, pal.tone, 1.1), pal.tone === 'light' ? 0.3 : 0.2))
    wash.addColorStop(1, rgba(pal.accent2, 0))
    ctx.save(); ctx.globalCompositeOperation = softBlend(pal)
    ctx.fillStyle = wash; ctx.fillRect(0, 0, W, H)
    // segundo wash inferior-izquierda (balance)
    const w2 = ctx.createRadialGradient(W * 0.16, H * 0.9, 0, W * 0.16, H * 0.9, H * 0.45)
    w2.addColorStop(0, rgba(pastel(pal.accent, pal.tone), pal.tone === 'light' ? 0.22 : 0.16)); w2.addColorStop(1, rgba(pal.accent, 0))
    ctx.fillStyle = w2; ctx.fillRect(0, 0, W, H)
    ctx.restore()
    // filete fino de acento arriba + punto que se desliza (detalle editorial vivo)
    const m = 26
    ctx.strokeStyle = rgba(pal.tone === 'light' ? darken(pal.accent, 0.05) : lighten(pal.accent, 0.3), 0.2); ctx.lineWidth = 1
    ctx.strokeRect(m, m, W - m * 2, H - m * 2)
    const fw = W - m * 2
    const dotX = m + fw * (0.5 + 0.42 * Math.sin(t * CLK * 0.45))
    ctx.fillStyle = rgba(pal.accent2, 0.6); ctx.beginPath(); ctx.arc(dotX, m, 2.4, 0, TAU); ctx.fill()
    // grano ligero de papel (estatico -> textura)
    ctx.fillStyle = rgba(pal.tone === 'light' ? '#1c1510' : '#ffffff', 0.025)
    for (let i = 0; i < 320; i++) ctx.fillRect((r() * W) | 0, (r() * H) | 0, 1, 1)
  },
})

register({
  id: 'bg.belleza.ribbonsheen', lib: 'backgrounds', category: 'gradient-fields', tones: ['dark', 'light'], rubros: ['belleza', 'default'], weight: 0.85,
  register: 'editorial', intensity: 'soft', temp: 'warm', tags: ['belleza', 'cinta', 'satin', 'fluido', 'elegante'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'ribbon')
    bzBg(ctx, pal)
    // cintas de satin que cruzan en diagonal con brillo central que se mueve -> fluidez elegante, lejos del centro
    ctx.save(); ctx.globalCompositeOperation = softBlend(pal)
    const ribbons = 3
    for (let i = 0; i < ribbons; i++) {
      const ph = r() * TAU
      const yBase = H * (0.2 + (i / (ribbons - 1)) * 0.6)
      const col = i % 2 ? pastel(pal.accent2, pal.tone) : pastel(pal.accent, pal.tone)
      const thick = 40 + r() * 30
      ctx.beginPath()
      const pts = []
      for (let x = -20; x <= W + 20; x += 12) {
        const y = yBase + Math.sin(x * 0.008 + ph + t * CLK * 0.3) * 50 + Math.sin(x * 0.02 + ph) * 16
        pts.push([x, y])
      }
      // borde superior
      ctx.moveTo(pts[0][0], pts[0][1] - thick / 2)
      for (const [x, y] of pts) ctx.lineTo(x, y - thick / 2)
      for (let k = pts.length - 1; k >= 0; k--) ctx.lineTo(pts[k][0], pts[k][1] + thick / 2)
      ctx.closePath()
      // brillo de satin recorre la cinta
      const shx = (0.5 + 0.5 * Math.sin(t * CLK * 0.4 + ph)) * W
      const g = ctx.createLinearGradient(shx - 160, 0, shx + 160, 0)
      g.addColorStop(0, rgba(col, pal.tone === 'light' ? 0.16 : 0.12))
      g.addColorStop(0.5, rgba(pal.tone === 'light' ? '#ffffff' : lighten(col, 0.45), pal.tone === 'light' ? 0.3 : 0.22))
      g.addColorStop(1, rgba(col, pal.tone === 'light' ? 0.16 : 0.12))
      ctx.fillStyle = g; ctx.fill()
    }
    ctx.restore()
    bzScrim(ctx, pal, { centerClear: 0.34, strength: pal.tone === 'light' ? 0.14 : 0.3 })
  },
})
