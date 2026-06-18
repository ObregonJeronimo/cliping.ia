// urvid 1.0 · biblioteca ATMOSPHERE — capas de LUZ y atmosfera que se pintan SOBRE el fondo (no full-opaque).
// render(ctx, t, env). env = { pal, content, fonts, seed, energy, sceneDur }. Puro + determinista
// (mulberry32(env.seed)/seedFor para azar estable, t para motion). TONE-AWARE: en oscuro la luz es ADITIVA
// (composite 'lighter' / screen), en claro la sombra/tinta es SUSTRACTIVA ('multiply'). Alpha SIEMPRE contenido
// y, cuando aplica, con un "hueco" en el centro -> nunca tapan el texto (regla dura de legibilidad).
// Categorias: glow-bloom · vignette · light-rays · depth-haze · lens-fx · color-grade · scrim-legibility.
import { register } from '../../core/registry.js'
import { mulberry32, seedFor, range } from '../../core/prng.js'
import { W, H, TAU, clamp, rgba, lighten, darken, hexToHsl, hslToHex } from '../../core/util.js'

const CLK = 0.6
// helpers locales (puros)
const add = ctx => { ctx.globalCompositeOperation = 'lighter' }      // luz aditiva (oscuro)
const screen = ctx => { ctx.globalCompositeOperation = 'screen' }
const mult = ctx => { ctx.globalCompositeOperation = 'multiply' }    // tinta sustractiva (claro)
// respiracion 0..1 suave, fase por semilla -> nunca todas las capas laten igual
const breath = (t, ph = 0, sp = 1) => 0.5 + 0.5 * Math.sin(t * CLK * sp + ph)

// ════════════════════════════ GLOW-BLOOM ════════════════════════════

register({
  id: 'atmo.glow.bloom-soft', lib: 'atmosphere', category: 'glow-bloom', tones: ['dark'], rubros: ['*'], weight: 1.2,
  tags: ['premium', 'calido', 'luz'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'glow')
    // 3 florecimientos de acento que respiran arriba/abajo, NUNCA sobre el centro (el texto vive en H*0.4..0.55)
    const spots = [
      { x: 0.24, y: 0.16, c: pal.accent, rad: 0.42, ph: r() * TAU },
      { x: 0.80, y: 0.20, c: pal.accent2, rad: 0.38, ph: r() * TAU },
      { x: 0.52, y: 0.86, c: pal.accent, rad: 0.46, ph: r() * TAU },
    ]
    ctx.save(); add(ctx)
    for (const s of spots) {
      const br = 0.10 + 0.06 * breath(t, s.ph, 0.7)
      const cx = s.x * W + Math.sin(t * CLK * 0.4 + s.ph) * 14
      const cy = s.y * H + Math.cos(t * CLK * 0.3 + s.ph) * 12
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, H * s.rad)
      g.addColorStop(0, rgba(s.c, br)); g.addColorStop(0.5, rgba(s.c, br * 0.4)); g.addColorStop(1, rgba(s.c, 0))
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    }
    ctx.restore()
  },
})

register({
  id: 'atmo.glow.halation-edge', lib: 'atmosphere', category: 'glow-bloom', tones: ['dark'], rubros: ['*'], weight: 0.9,
  tags: ['cinematico', 'halacion'],
  render(ctx, t, env) {
    const { pal } = env
    // halacion de borde: la luz se acumula en los margenes (como un lente sangrando), centro limpio
    const bloom = 0.13 + 0.05 * breath(t, 1.2, 0.5)
    ctx.save(); add(ctx)
    // top
    let g = ctx.createLinearGradient(0, 0, 0, H * 0.34)
    g.addColorStop(0, rgba(pal.accent, bloom)); g.addColorStop(1, rgba(pal.accent, 0))
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H * 0.34)
    // bottom
    g = ctx.createLinearGradient(0, H, 0, H * 0.66)
    g.addColorStop(0, rgba(pal.accent2, bloom * 0.85)); g.addColorStop(1, rgba(pal.accent2, 0))
    ctx.fillStyle = g; ctx.fillRect(0, H * 0.66, W, H * 0.34)
    ctx.restore()
  },
})

register({
  id: 'atmo.glow.pulse-orb', lib: 'atmosphere', category: 'glow-bloom', tones: ['dark'], rubros: ['*'], weight: 0.8,
  tags: ['hero', 'foco'],
  render(ctx, t, env) {
    const { pal } = env
    // un orbe central tenue DETRAS del texto (alpha bajisimo) -> halo de foco sin tapar
    const p = breath(t, 0, 0.6)
    const cx = W / 2, cy = H * 0.42
    ctx.save(); add(ctx)
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, H * (0.30 + 0.04 * p))
    g.addColorStop(0, rgba(pal.accent, 0.07 + 0.03 * p)); g.addColorStop(0.55, rgba(pal.accent, 0.03)); g.addColorStop(1, rgba(pal.accent, 0))
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    ctx.restore()
  },
})

// ════════════════════════════ VIGNETTE ════════════════════════════

register({
  id: 'atmo.vignette.classic', lib: 'atmosphere', category: 'vignette', tones: ['dark', 'light'], rubros: ['*'], weight: 1.3,
  tags: ['universal', 'foco'],
  render(ctx, t, env) {
    const { pal } = env, light = pal.tone === 'light'
    // oscurecido radial clasico que cae a los bordes -> empuja el ojo al centro. En claro, muy sutil.
    const g = ctx.createRadialGradient(W / 2, H * 0.46, H * 0.28, W / 2, H * 0.52, H * 0.78)
    g.addColorStop(0, 'rgba(0,0,0,0)')
    g.addColorStop(0.7, light ? 'rgba(0,0,0,0.02)' : 'rgba(0,0,0,0.22)')
    g.addColorStop(1, light ? 'rgba(40,30,20,0.08)' : 'rgba(0,0,0,0.6)')
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
  },
})

register({
  id: 'atmo.vignette.cinema-bars', lib: 'atmosphere', category: 'vignette', tones: ['dark', 'light'], rubros: ['*'], weight: 0.9,
  tags: ['cinematico', 'editorial'],
  render(ctx, t, env) {
    const { pal } = env, light = pal.tone === 'light'
    // gradiente vertical top+bottom (vineta direccional) -> sensacion cine, centro despejado
    const dk = light ? 'rgba(30,22,16,0.10)' : 'rgba(0,0,0,0.55)'
    let g = ctx.createLinearGradient(0, 0, 0, H * 0.28)
    g.addColorStop(0, dk); g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H * 0.28)
    g = ctx.createLinearGradient(0, H, 0, H * 0.72)
    g.addColorStop(0, dk); g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g; ctx.fillRect(0, H * 0.72, W, H * 0.28)
  },
})

register({
  id: 'atmo.vignette.tinted-accent', lib: 'atmosphere', category: 'vignette', tones: ['dark'], rubros: ['*'], weight: 0.8,
  tags: ['marca', 'color'],
  render(ctx, t, env) {
    const { pal } = env
    // vineta TENIDA con el acento (no negra) -> el borde se oscurece hacia el color de marca
    const edge = darken(pal.accent, 0.7)
    const g = ctx.createRadialGradient(W / 2, H * 0.46, H * 0.3, W / 2, H * 0.5, H * 0.82)
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.72, rgba(edge, 0.18)); g.addColorStop(1, rgba(edge, 0.5))
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    // negra encima para profundidad
    const g2 = ctx.createRadialGradient(W / 2, H * 0.5, H * 0.4, W / 2, H * 0.5, H * 0.85)
    g2.addColorStop(0, 'rgba(0,0,0,0)'); g2.addColorStop(1, 'rgba(0,0,0,0.32)')
    ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H)
  },
})

// ════════════════════════════ LIGHT-RAYS (godrays) ════════════════════════════

register({
  id: 'atmo.rays.godrays-top', lib: 'atmosphere', category: 'light-rays', tones: ['dark'], rubros: ['*'], weight: 1,
  tags: ['volumetrico', 'dramatico'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'rays')
    // rayos volumetricos desde una fuente arriba; cada uno es una cuna fina de luz aditiva que respira
    const ox = W * (0.32 + r() * 0.36), oy = -H * 0.12
    const n = 7
    ctx.save(); add(ctx)
    for (let i = 0; i < n; i++) {
      const base = (i / (n - 1) - 0.5)
      const ang = Math.PI / 2 + base * 0.62 + Math.sin(t * CLK * 0.2 + i) * 0.015
      const wRay = 18 + r() * 26
      const len = H * 1.25
      const a = (0.05 + 0.05 * breath(t, i * 1.3, 0.5)) * (1 - Math.abs(base) * 0.5)
      ctx.save(); ctx.translate(ox, oy); ctx.rotate(ang - Math.PI / 2)
      const g = ctx.createLinearGradient(0, 0, 0, len)
      g.addColorStop(0, rgba(pal.accent, a)); g.addColorStop(0.6, rgba(pal.accent, a * 0.35)); g.addColorStop(1, rgba(pal.accent, 0))
      ctx.fillStyle = g
      ctx.beginPath(); ctx.moveTo(-wRay * 0.3, 0); ctx.lineTo(wRay * 0.3, 0); ctx.lineTo(wRay, len); ctx.lineTo(-wRay, len); ctx.closePath(); ctx.fill()
      ctx.restore()
    }
    ctx.restore()
  },
})

register({
  id: 'atmo.rays.fan-burst', lib: 'atmosphere', category: 'light-rays', tones: ['dark'], rubros: ['*'], weight: 0.7,
  tags: ['radial', 'celebracion'],
  render(ctx, t, env) {
    const { pal } = env
    // abanico de rayos finos desde un foco bajo (efecto amanecer detras del contenido)
    const fx = W / 2, fy = H * 1.02, n = 13
    const rot = t * CLK * 0.04
    ctx.save(); add(ctx); ctx.translate(fx, fy)
    for (let i = 0; i < n; i++) {
      const ang = -Math.PI / 2 + (i / (n - 1) - 0.5) * 1.5 + rot
      const a = 0.04 + 0.03 * breath(t, i * 0.9, 0.6)
      ctx.save(); ctx.rotate(ang)
      const g = ctx.createLinearGradient(0, 0, 0, -H * 1.2)
      g.addColorStop(0, rgba(pal.accent, a)); g.addColorStop(1, rgba(pal.accent, 0))
      ctx.fillStyle = g
      ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(10, 0); ctx.lineTo(34, -H * 1.2); ctx.lineTo(-34, -H * 1.2); ctx.closePath(); ctx.fill()
      ctx.restore()
    }
    ctx.restore()
  },
})

// ════════════════════════════ DEPTH-HAZE ════════════════════════════

register({
  id: 'atmo.haze.depth-floor', lib: 'atmosphere', category: 'depth-haze', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['profundidad', 'niebla'],
  render(ctx, t, env) {
    const { pal } = env, light = pal.tone === 'light'
    // niebla que sube del piso (atmosphere perspective): bruma clara en claro, neblina luminosa en oscuro
    const fog = light ? '#ffffff' : lighten(pal.bg0, 0.4)
    const drift = Math.sin(t * CLK * 0.25) * 0.02
    ctx.save(); if (!light) screen(ctx)
    const g = ctx.createLinearGradient(0, H, 0, H * (0.5 + drift))
    g.addColorStop(0, rgba(fog, light ? 0.5 : 0.16)); g.addColorStop(0.5, rgba(fog, light ? 0.18 : 0.06)); g.addColorStop(1, rgba(fog, 0))
    ctx.fillStyle = g; ctx.fillRect(0, H * 0.45, W, H * 0.55)
    ctx.restore()
  },
})

register({
  id: 'atmo.haze.drift-bands', lib: 'atmosphere', category: 'depth-haze', tones: ['dark'], rubros: ['*'], weight: 0.85,
  tags: ['niebla', 'organico'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'haze')
    // bandas de bruma horizontales suaves a la deriva -> profundidad atmosferica, evita el centro
    const fog = lighten(pal.bg1, 0.5)
    ctx.save(); screen(ctx)
    for (let i = 0; i < 4; i++) {
      const baseY = (i < 2 ? 0.1 + i * 0.12 : 0.72 + (i - 2) * 0.13) * H
      const ph = r() * TAU
      const cy = baseY + Math.sin(t * CLK * 0.3 + ph) * 16
      const h = 70 + r() * 50
      const g = ctx.createLinearGradient(0, cy - h, 0, cy + h)
      g.addColorStop(0, rgba(fog, 0)); g.addColorStop(0.5, rgba(fog, 0.05 + 0.02 * breath(t, ph, 0.4))); g.addColorStop(1, rgba(fog, 0))
      ctx.fillStyle = g; ctx.fillRect(0, cy - h, W, h * 2)
    }
    ctx.restore()
  },
})

// ════════════════════════════ LENS-FX (bokeh / flare tenue) ════════════════════════════

register({
  id: 'atmo.lens.bokeh-drift', lib: 'atmosphere', category: 'lens-fx', tones: ['dark'], rubros: ['*'], weight: 1,
  tags: ['bokeh', 'profundidad', 'premium'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'bokeh')
    // discos de bokeh desenfocados (anillo mas brillante que el centro, como lente real) a la deriva lenta
    const N = 11
    ctx.save(); add(ctx)
    for (let i = 0; i < N; i++) {
      const ph = r() * TAU, sp = 0.2 + r() * 0.3
      const bx = (r() * W)
      const by0 = r() * H
      const by = (by0 + t * 8 * sp) % (H + 80) - 40
      const rad = 8 + r() * 26
      const a = (0.05 + 0.08 * r()) * (0.7 + 0.3 * breath(t, ph, 1.2))
      // empuja los discos lejos del centro de texto (atenua si caen ahi)
      const dCenter = Math.hypot((bx - W / 2) / W, (by - H * 0.47) / H)
      const fade = clamp(dCenter * 1.8, 0.15, 1)
      const col = i % 2 ? pal.accent2 : pal.accent
      const g = ctx.createRadialGradient(bx, by, 0, bx, by, rad)
      g.addColorStop(0, rgba(col, a * 0.5 * fade)); g.addColorStop(0.75, rgba(col, a * fade)); g.addColorStop(0.92, rgba(col, a * 0.7 * fade)); g.addColorStop(1, rgba(col, 0))
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, rad, 0, TAU); ctx.fill()
    }
    ctx.restore()
  },
})

register({
  id: 'atmo.lens.flare-anamorphic', lib: 'atmosphere', category: 'lens-fx', tones: ['dark'], rubros: ['*'], weight: 0.75,
  tags: ['flare', 'cinematico'],
  render(ctx, t, env) {
    const { pal } = env
    // flare anamorfico: una linea horizontal de luz + un nucleo, deriva suave arriba a la derecha
    const fx = W * (0.7 + 0.06 * Math.sin(t * CLK * 0.3)), fy = H * 0.22
    const a = 0.12 + 0.05 * breath(t, 0.5, 0.7)
    ctx.save(); add(ctx)
    // raya horizontal (anamorfica)
    const g = ctx.createLinearGradient(fx - W * 0.6, fy, fx + W * 0.6, fy)
    g.addColorStop(0, rgba(pal.accent2, 0)); g.addColorStop(0.5, rgba(pal.accent2, a)); g.addColorStop(1, rgba(pal.accent2, 0))
    ctx.fillStyle = g
    ctx.save(); ctx.translate(fx, fy); ctx.scale(1, 0.045); ctx.beginPath(); ctx.arc(0, 0, W * 0.6, 0, TAU); ctx.fill(); ctx.restore()
    // nucleo
    const c = ctx.createRadialGradient(fx, fy, 0, fx, fy, 40)
    c.addColorStop(0, rgba('#ffffff', a * 0.9)); c.addColorStop(0.4, rgba(pal.accent2, a * 0.6)); c.addColorStop(1, rgba(pal.accent2, 0))
    ctx.fillStyle = c; ctx.beginPath(); ctx.arc(fx, fy, 40, 0, TAU); ctx.fill()
    ctx.restore()
  },
})

register({
  id: 'atmo.lens.glints', lib: 'atmosphere', category: 'lens-fx', tones: ['dark'], rubros: ['*'], weight: 0.7,
  tags: ['destello', 'estrella'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'glint')
    // destellos en cruz (sparkle de 4 puntas) que titilan en los margenes -> brillo de joya
    const N = 5
    ctx.save(); add(ctx)
    for (let i = 0; i < N; i++) {
      const gx = (0.12 + r() * 0.76) * W
      const gy = (r() < 0.5 ? 0.08 + r() * 0.2 : 0.74 + r() * 0.2) * H
      const tw = breath(t, r() * TAU, 1.4 + r())
      const len = (10 + r() * 16) * (0.4 + 0.6 * tw)
      const a = (0.2 + 0.4 * tw) * 0.55
      ctx.strokeStyle = rgba('#ffffff', a); ctx.lineWidth = 1.4
      ctx.beginPath(); ctx.moveTo(gx - len, gy); ctx.lineTo(gx + len, gy); ctx.moveTo(gx, gy - len); ctx.lineTo(gx, gy + len); ctx.stroke()
      const c = ctx.createRadialGradient(gx, gy, 0, gx, gy, len * 0.5)
      c.addColorStop(0, rgba(pal.accent, a)); c.addColorStop(1, rgba(pal.accent, 0))
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(gx, gy, len * 0.5, 0, TAU); ctx.fill()
    }
    ctx.restore()
  },
})

// ════════════════════════════ COLOR-GRADE (overlay) ════════════════════════════

register({
  id: 'atmo.grade.split-tone', lib: 'atmosphere', category: 'color-grade', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['grade', 'teal-orange', 'cine'],
  render(ctx, t, env) {
    const { pal } = env, light = pal.tone === 'light'
    // split-tone cinematografico: sombras al acento frio (arriba), luces al acento calido (abajo). Muy sutil.
    ctx.save(); ctx.globalCompositeOperation = light ? 'multiply' : 'soft-light'
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, rgba(pal.accent, light ? 0.06 : 0.16))
    g.addColorStop(0.5, 'rgba(128,128,128,0)')
    g.addColorStop(1, rgba(pal.accent2, light ? 0.06 : 0.16))
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    ctx.restore()
  },
})

register({
  id: 'atmo.grade.warm-wash', lib: 'atmosphere', category: 'color-grade', tones: ['dark'], rubros: ['*'], weight: 0.85,
  tags: ['calido', 'grade', 'atardecer'],
  render(ctx, t, env) {
    const { pal } = env
    // lavado calido global (oro/ambar) tipo "golden hour" + leve viraje frio en sombras de los bordes
    const warm = hslToHex((hexToHsl(pal.accent).h * 0 + 32), 0.8, 0.55)   // ambar fijo derivado
    ctx.save(); ctx.globalCompositeOperation = 'soft-light'
    const g = ctx.createRadialGradient(W / 2, H * 0.4, 0, W / 2, H * 0.5, H * 0.9)
    g.addColorStop(0, rgba(warm, 0.22)); g.addColorStop(0.6, rgba(warm, 0.08)); g.addColorStop(1, rgba('#0a1830', 0.14))
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    ctx.restore()
  },
})

// ════════════════════════════ SCRIM-LEGIBILITY ════════════════════════════

register({
  id: 'atmo.scrim.center-plate', lib: 'atmosphere', category: 'scrim-legibility', tones: ['dark', 'light'], rubros: ['*'], weight: 1.2,
  tags: ['legibilidad', 'guard', 'universal'],
  render(ctx, t, env) {
    const { pal } = env, light = pal.tone === 'light'
    // scrim de legibilidad: una placa SUAVE detras del centro -> oscurece (oscuro) o aclara (claro) SOLO donde
    // vive el texto, para garantizar contraste sin un panel duro. Centro al 90% de la fuerza, bordes a 0.
    const cy = H * 0.47
    const g = ctx.createRadialGradient(W / 2, cy, H * 0.04, W / 2, cy, H * 0.42)
    if (light) { g.addColorStop(0, 'rgba(255,255,255,0.34)'); g.addColorStop(0.7, 'rgba(255,255,255,0.14)'); g.addColorStop(1, 'rgba(255,255,255,0)') }
    else { g.addColorStop(0, 'rgba(0,0,0,0.4)'); g.addColorStop(0.7, 'rgba(0,0,0,0.16)'); g.addColorStop(1, 'rgba(0,0,0,0)') }
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
  },
})

register({
  id: 'atmo.scrim.bottom-gradient', lib: 'atmosphere', category: 'scrim-legibility', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['legibilidad', 'lower-third', 'caption'],
  render(ctx, t, env) {
    const { pal } = env, light = pal.tone === 'light'
    // scrim inferior (estilo lower-third): asegura legibilidad de un caption/CTA al pie. Clasico de reels.
    const g = ctx.createLinearGradient(0, H, 0, H * 0.5)
    if (light) { g.addColorStop(0, 'rgba(255,255,255,0.55)'); g.addColorStop(0.6, 'rgba(255,255,255,0.16)'); g.addColorStop(1, 'rgba(255,255,255,0)') }
    else { g.addColorStop(0, 'rgba(0,0,0,0.62)'); g.addColorStop(0.6, 'rgba(0,0,0,0.2)'); g.addColorStop(1, 'rgba(0,0,0,0)') }
    ctx.fillStyle = g; ctx.fillRect(0, H * 0.5, W, H * 0.5)
  },
})
