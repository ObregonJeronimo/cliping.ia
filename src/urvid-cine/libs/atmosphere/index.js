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
// ---- vida continua: helpers de movimiento secundario (todos puros, solo por t) ----
// onda suave -1..1 (deriva organica). Doble seno desfasado -> no es un seno plano, respira mas natural.
const wave = (t, ph = 0, sp = 1) => 0.65 * Math.sin(t * CLK * sp + ph) + 0.35 * Math.sin(t * CLK * sp * 0.53 + ph * 1.7)
// pulso 0..1 con valle suave (glow que late, mas "vivo" que un seno: pasa mas tiempo tenue, destella corto)
const pulse = (t, ph = 0, sp = 1) => { const s = 0.5 + 0.5 * Math.sin(t * CLK * sp + ph); return s * s * (3 - 2 * s) }
// fase de barrido 0..1 suavizada en los extremos (smoothstep) -> el sheen entra/sale sin corte duro
const sweepPhase = p => { const x = clamp(p, 0, 1); return x * x * (3 - 2 * x) }

// ════════════════════════════ GLOW-BLOOM ════════════════════════════

register({
  id: 'atmo.glow.bloom-soft', lib: 'atmosphere', category: 'glow-bloom', tones: ['dark'], rubros: ['*'], weight: 1.2,
  register: 'editorial', intensity: 'soft', tags: ['premium', 'calido', 'luz', 'glow'],
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
      const br = 0.10 + 0.06 * pulse(t, s.ph, 0.7)
      const cx = s.x * W + wave(t, s.ph, 0.4) * 16
      const cy = s.y * H + wave(t, s.ph + 1.6, 0.3) * 13
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, H * (s.rad + 0.015 * breath(t, s.ph, 0.5)))
      g.addColorStop(0, rgba(s.c, br)); g.addColorStop(0.5, rgba(s.c, br * 0.4)); g.addColorStop(1, rgba(s.c, 0))
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    }
    ctx.restore()
  },
})

register({
  id: 'atmo.glow.halation-edge', lib: 'atmosphere', category: 'glow-bloom', tones: ['dark'], rubros: ['*'], weight: 0.9,
  register: 'editorial', intensity: 'soft', tags: ['cinematico', 'halacion', 'borde', 'luz'],
  render(ctx, t, env) {
    const { pal } = env
    // halacion de borde: la luz se acumula en los margenes (como un lente sangrando), centro limpio.
    // Top y bottom laten en CONTRAFASE (uno sube mientras el otro baja) + la altura del sangrado deriva
    // suave -> la halacion nunca queda congelada, parece luz real palpitando en los bordes.
    const bloomT = 0.13 + 0.05 * pulse(t, 1.2, 0.5)
    const bloomB = 0.11 + 0.045 * pulse(t, 1.2 + Math.PI, 0.5)
    const hT = H * (0.34 + 0.03 * wave(t, 0.4, 0.4))
    const hB = H * (0.34 + 0.03 * wave(t, 0.4 + Math.PI, 0.4))
    ctx.save(); add(ctx)
    // top
    let g = ctx.createLinearGradient(0, 0, 0, hT)
    g.addColorStop(0, rgba(pal.accent, bloomT)); g.addColorStop(1, rgba(pal.accent, 0))
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, hT)
    // bottom
    g = ctx.createLinearGradient(0, H, 0, H - hB)
    g.addColorStop(0, rgba(pal.accent2, bloomB)); g.addColorStop(1, rgba(pal.accent2, 0))
    ctx.fillStyle = g; ctx.fillRect(0, H - hB, W, hB)
    ctx.restore()
  },
})

register({
  id: 'atmo.glow.pulse-orb', lib: 'atmosphere', category: 'glow-bloom', tones: ['dark'], rubros: ['*'], weight: 0.8,
  register: 'neutral', intensity: 'calm', tags: ['hero', 'foco', 'orbe', 'glow'],
  render(ctx, t, env) {
    const { pal } = env
    // un orbe central tenue DETRAS del texto (alpha bajisimo) -> halo de foco sin tapar. Late (pulse) y
    // deriva con una micro-orbita lentisima -> el halo "respira" como una brasa viva, nunca queda quieto.
    const p = pulse(t, 0, 0.6)
    const cx = W / 2 + wave(t, 0.5, 0.32) * 7, cy = H * 0.42 + wave(t, 1.3, 0.27) * 6
    ctx.save(); add(ctx)
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, H * (0.30 + 0.045 * p))
    g.addColorStop(0, rgba(pal.accent, 0.06 + 0.035 * p)); g.addColorStop(0.55, rgba(pal.accent, 0.03)); g.addColorStop(1, rgba(pal.accent, 0))
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    ctx.restore()
  },
})

// ════════════════════════════ VIGNETTE ════════════════════════════

register({
  id: 'atmo.vignette.classic', lib: 'atmosphere', category: 'vignette', tones: ['dark', 'light'], rubros: ['*'], weight: 1.3,
  register: 'neutral', intensity: 'soft', tags: ['universal', 'foco', 'vineta', 'radial'],
  render(ctx, t, env) {
    const { pal } = env, light = pal.tone === 'light'
    // oscurecido radial clasico que cae a los bordes -> empuja el ojo al centro. En claro, muy sutil.
    // VIDA: el radio interior (el "ojo" limpio) y la densidad del borde laten apenas (iris que respira) ->
    // la vineta nunca queda 100% congelada, sin tocar la zona de texto.
    const br = breath(t, 0.3, 0.4)
    const inner = H * (0.28 + 0.015 * br)
    const edge = (light ? 0.6 : 0.6) + (light ? 0 : 0.04) * (br - 0.5)
    const g = ctx.createRadialGradient(W / 2, H * 0.46, inner, W / 2, H * 0.52, H * 0.78)
    g.addColorStop(0, 'rgba(0,0,0,0)')
    g.addColorStop(0.7, light ? 'rgba(0,0,0,0.02)' : `rgba(0,0,0,${0.22 + 0.02 * (br - 0.5)})`)
    g.addColorStop(1, light ? 'rgba(40,30,20,0.08)' : `rgba(0,0,0,${edge})`)
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
  },
})

register({
  id: 'atmo.vignette.cinema-bars', lib: 'atmosphere', category: 'vignette', tones: ['dark', 'light'], rubros: ['*'], weight: 0.9,
  register: 'editorial', intensity: 'soft', tags: ['cinematico', 'editorial', 'barras', 'encuadre'],
  render(ctx, t, env) {
    const { pal } = env, light = pal.tone === 'light'
    // gradiente vertical top+bottom (vineta direccional) -> sensacion cine, centro despejado.
    // VIDA: las dos barras "respiran" su altura en contrafase (como un encuadre que se asienta) muy leve.
    const a = light ? 0.10 : 0.55
    const dk = `rgba(${light ? '30,22,16' : '0,0,0'},${a})`
    const hT = H * (0.28 + 0.012 * wave(t, 0.5, 0.38))
    const hB = H * (0.28 + 0.012 * wave(t, 0.5 + Math.PI, 0.38))
    let g = ctx.createLinearGradient(0, 0, 0, hT)
    g.addColorStop(0, dk); g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, hT)
    g = ctx.createLinearGradient(0, H, 0, H - hB)
    g.addColorStop(0, dk); g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g; ctx.fillRect(0, H - hB, W, hB)
  },
})

register({
  id: 'atmo.vignette.tinted-accent', lib: 'atmosphere', category: 'vignette', tones: ['dark'], rubros: ['*'], weight: 0.8,
  register: 'editorial', intensity: 'medium', tags: ['marca', 'color', 'vineta', 'tenida'],
  render(ctx, t, env) {
    const { pal } = env
    // vineta TENIDA con el acento (no negra) -> el borde se oscurece hacia el color de marca.
    // VIDA: la intensidad del tinte de marca late suave (pulse) -> el color del borde palpita apenas.
    const edge = darken(pal.accent, 0.7)
    const br = pulse(t, 0.6, 0.7)
    const inner = H * (0.3 + 0.025 * breath(t, 0.6, 0.5))
    const g = ctx.createRadialGradient(W / 2, H * 0.46, inner, W / 2, H * 0.5, H * 0.82)
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.72, rgba(edge, 0.16 + 0.04 * br)); g.addColorStop(1, rgba(edge, 0.46 + 0.06 * br))
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
  register: 'editorial', intensity: 'bold', tags: ['volumetrico', 'dramatico', 'rayos', 'godrays'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'rays')
    // rayos volumetricos desde una fuente arriba; cada uno es una cuna fina de luz aditiva que respira
    const ox = W * (0.32 + r() * 0.36), oy = -H * 0.12
    const n = 7
    ctx.save(); add(ctx)
    for (let i = 0; i < n; i++) {
      const base = (i / (n - 1) - 0.5)
      // cada rayo se mece en abanico (sway suave) y su brillo late en fase propia -> el haz "vive" como
      // luz volumetrica con polvo cruzando, nunca un grupo de cunas congeladas.
      const ang = Math.PI / 2 + base * 0.62 + wave(t, i * 1.1, 0.22) * 0.03
      const wRay = 18 + r() * 26
      const len = H * 1.25
      const a = (0.05 + 0.055 * pulse(t, i * 1.3, 0.5)) * (1 - Math.abs(base) * 0.5)
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
  register: 'friendly', intensity: 'medium', tags: ['radial', 'celebracion', 'amanecer', 'abanico'],
  render(ctx, t, env) {
    const { pal } = env
    // abanico de rayos finos desde un foco bajo (efecto amanecer detras del contenido)
    const fx = W / 2, fy = H * 1.02, n = 13
    // rotacion idle lentisima del abanico + cada rayo titila en fase propia (pulse) -> amanecer que palpita.
    const rot = wave(t, 0, 0.18) * 0.06
    ctx.save(); add(ctx); ctx.translate(fx, fy)
    for (let i = 0; i < n; i++) {
      const ang = -Math.PI / 2 + (i / (n - 1) - 0.5) * 1.5 + rot
      const a = 0.04 + 0.035 * pulse(t, i * 0.9, 0.6)
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
  register: 'neutral', intensity: 'soft', tags: ['profundidad', 'niebla', 'piso', 'bruma'],
  render(ctx, t, env) {
    const { pal } = env, light = pal.tone === 'light'
    // niebla que sube del piso (atmosphere perspective): bruma clara en claro, neblina luminosa en oscuro
    const fog = light ? '#ffffff' : lighten(pal.bg0, 0.4)
    // la altura de la niebla SUBE Y BAJA (marea lenta) y su densidad late apenas -> el banco de bruma
    // nunca queda quieto, como aire real moviendose sobre el piso.
    const drift = wave(t, 0, 0.25) * 0.03
    const dens = 1 + 0.1 * (breath(t, 0.8, 0.3) - 0.5)
    ctx.save(); if (!light) screen(ctx)
    const g = ctx.createLinearGradient(0, H, 0, H * (0.5 + drift))
    g.addColorStop(0, rgba(fog, (light ? 0.5 : 0.16) * dens)); g.addColorStop(0.5, rgba(fog, (light ? 0.18 : 0.06) * dens)); g.addColorStop(1, rgba(fog, 0))
    ctx.fillStyle = g; ctx.fillRect(0, H * 0.45, W, H * 0.55)
    ctx.restore()
  },
})

register({
  id: 'atmo.haze.drift-bands', lib: 'atmosphere', category: 'depth-haze', tones: ['dark'], rubros: ['*'], weight: 0.85,
  register: 'neutral', intensity: 'soft', tags: ['niebla', 'organico', 'bandas', 'deriva'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'haze')
    // bandas de bruma horizontales suaves a la deriva -> profundidad atmosferica, evita el centro
    const fog = lighten(pal.bg1, 0.5)
    ctx.save(); screen(ctx)
    for (let i = 0; i < 4; i++) {
      const baseY = (i < 2 ? 0.1 + i * 0.12 : 0.72 + (i - 2) * 0.13) * H
      const ph = r() * TAU
      const cy = baseY + wave(t, ph, 0.3) * 18
      const h = (70 + r() * 50) * (1 + 0.06 * wave(t, ph + 1.0, 0.22))   // la banda se ensancha/afina al derivar
      const g = ctx.createLinearGradient(0, cy - h, 0, cy + h)
      g.addColorStop(0, rgba(fog, 0)); g.addColorStop(0.5, rgba(fog, 0.05 + 0.025 * pulse(t, ph, 0.4))); g.addColorStop(1, rgba(fog, 0))
      ctx.fillStyle = g; ctx.fillRect(0, cy - h, W, h * 2)
    }
    ctx.restore()
  },
})

// ════════════════════════════ LENS-FX (bokeh / flare tenue) ════════════════════════════

register({
  id: 'atmo.lens.bokeh-drift', lib: 'atmosphere', category: 'lens-fx', tones: ['dark'], rubros: ['*'], weight: 1,
  register: 'editorial', intensity: 'soft', tags: ['bokeh', 'profundidad', 'premium', 'lente'],
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
  register: 'editorial', intensity: 'bold', tags: ['flare', 'cinematico', 'anamorfico', 'destello'],
  render(ctx, t, env) {
    const { pal } = env
    // flare anamorfico: una linea horizontal de luz + un nucleo, deriva suave arriba a la derecha.
    // El nucleo titila (pulse) y la raya respira su largo -> destello vivo de lente, no un trazo fijo.
    const fx = W * (0.7 + 0.06 * wave(t, 0, 0.3)), fy = H * (0.22 + 0.01 * wave(t, 1.2, 0.25))
    const a = 0.11 + 0.06 * pulse(t, 0.5, 0.7)
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
  id: 'atmo.lens.glints', lib: 'atmosphere', category: 'lens-fx', tones: ['dark'], rubros: ['belleza', 'moda', 'default'], weight: 0.7,
  register: 'editorial', intensity: 'medium', tags: ['destello', 'estrella', 'brillo', 'joya'],
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
  register: 'editorial', intensity: 'soft', tags: ['grade', 'teal-orange', 'cine', 'split-tone'],
  render(ctx, t, env) {
    const { pal } = env, light = pal.tone === 'light'
    // split-tone cinematografico: sombras al acento frio (arriba), luces al acento calido (abajo). Muy sutil.
    // VIDA: los dos tonos "respiran" en contrafase (uno gana mientras el otro cede) -> el grade ondula como
    // luz cambiante, sin mover nada ni tocar el centro neutro.
    const sw = 0.5 + 0.5 * wave(t, 0.4, 0.6)   // 0..1 balance que oscila
    const top = light ? 0.06 : 0.16, bot = light ? 0.06 : 0.16
    ctx.save(); ctx.globalCompositeOperation = light ? 'multiply' : 'soft-light'
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, rgba(pal.accent, top * (0.74 + 0.52 * sw)))
    g.addColorStop(0.5, 'rgba(128,128,128,0)')
    g.addColorStop(1, rgba(pal.accent2, bot * (0.74 + 0.52 * (1 - sw))))
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    ctx.restore()
  },
})

register({
  id: 'atmo.grade.warm-wash', lib: 'atmosphere', category: 'color-grade', tones: ['dark'], rubros: ['gastronomia', 'belleza', 'salud', 'default'], weight: 0.85,
  register: 'friendly', intensity: 'soft', tags: ['calido', 'grade', 'atardecer', 'ambar'],
  render(ctx, t, env) {
    const { pal } = env
    // lavado calido global (oro/ambar) tipo "golden hour" + leve viraje frio en sombras de los bordes
    const warm = hslToHex((hexToHsl(pal.accent).h * 0 + 32), 0.8, 0.55)   // ambar fijo derivado
    // VIDA: el foco calido deriva apenas y su calor late (pulse) -> "golden hour" que respira como sol vivo.
    const cx = W / 2 + wave(t, 0.3, 0.22) * 12, cy = H * (0.4 + 0.01 * wave(t, 1.1, 0.2))
    const warmth = 0.2 + 0.04 * pulse(t, 0.5, 0.4)
    ctx.save(); ctx.globalCompositeOperation = 'soft-light'
    const g = ctx.createRadialGradient(cx, cy, 0, W / 2, H * 0.5, H * 0.9)
    g.addColorStop(0, rgba(warm, warmth)); g.addColorStop(0.6, rgba(warm, 0.08)); g.addColorStop(1, rgba('#0a1830', 0.14))
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    ctx.restore()
  },
})

// ════════════════════════════ SCRIM-LEGIBILITY ════════════════════════════

register({
  id: 'atmo.scrim.center-plate', lib: 'atmosphere', category: 'scrim-legibility', tones: ['dark', 'light'], rubros: ['*'], weight: 1.2,
  register: 'neutral', intensity: 'calm', tags: ['legibilidad', 'guard', 'universal', 'placa'],
  render(ctx, t, env) {
    const { pal } = env, light = pal.tone === 'light'
    // scrim de legibilidad: una placa SUAVE detras del centro -> oscurece (oscuro) o aclara (claro) SOLO donde
    // vive el texto, para garantizar contraste sin un panel duro. Centro al 90% de la fuerza, bordes a 0.
    // VIDA (minima, legibilidad ante todo): la placa solo respira su fuerza HACIA ARRIBA desde el piso base
    // (nunca baja del contraste garantizado) -> el guard "vive" sin perder cobertura del texto.
    const k = 0.06 * breath(t, 0.4, 0.35)   // 0..0.06 que se SUMA
    const cy = H * 0.47
    const g = ctx.createRadialGradient(W / 2, cy, H * 0.04, W / 2, cy, H * 0.42)
    if (light) { g.addColorStop(0, `rgba(255,255,255,${0.34 + k})`); g.addColorStop(0.7, 'rgba(255,255,255,0.14)'); g.addColorStop(1, 'rgba(255,255,255,0)') }
    else { g.addColorStop(0, `rgba(0,0,0,${0.4 + k})`); g.addColorStop(0.7, 'rgba(0,0,0,0.16)'); g.addColorStop(1, 'rgba(0,0,0,0)') }
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
  },
})

register({
  id: 'atmo.scrim.bottom-gradient', lib: 'atmosphere', category: 'scrim-legibility', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  register: 'neutral', intensity: 'calm', tags: ['legibilidad', 'lower-third', 'caption', 'gradiente'],
  render(ctx, t, env) {
    const { pal } = env, light = pal.tone === 'light'
    // scrim inferior (estilo lower-third): asegura legibilidad de un caption/CTA al pie. Clasico de reels.
    // VIDA (minima): el ALTO del scrim sube/baja apenas como marea, anclado al pie -> respira sin descubrir
    // el caption (la fuerza en el borde inferior no cambia).
    const top = H * (0.5 - 0.015 * breath(t, 0.5, 0.32))
    const g = ctx.createLinearGradient(0, H, 0, top)
    if (light) { g.addColorStop(0, 'rgba(255,255,255,0.55)'); g.addColorStop(0.6, 'rgba(255,255,255,0.16)'); g.addColorStop(1, 'rgba(255,255,255,0)') }
    else { g.addColorStop(0, 'rgba(0,0,0,0.62)'); g.addColorStop(0.6, 'rgba(0,0,0,0.2)'); g.addColorStop(1, 'rgba(0,0,0,0)') }
    ctx.fillStyle = g; ctx.fillRect(0, top, W, H - top)
  },
})

// ══════════════════════════════════════════════════════════════════════════════════════
// ░░ OLA 2 ░░  shadow-systems · mas light-rays · mas lens-fx · color-grade frio/duotone ·
// depth-haze extra. Todo alpha contenido, hueco en el centro (texto en H*0.4..0.55) -> nunca tapa.
// ══════════════════════════════════════════════════════════════════════════════════════

// ════════════════════════════ SHADOW-SYSTEMS (sombras direccionales largas) ════════════════════════════

register({
  id: 'atmo.shadow.long-cast', lib: 'atmosphere', category: 'shadow-systems', tones: ['dark', 'light'], rubros: ['*'], weight: 1.05,
  register: 'editorial', intensity: 'soft', tags: ['sombra', 'direccional', 'hora-dorada', 'diagonal'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'shadow-cast'), light = pal.tone === 'light'
    // sombras largas oblicuas (luz rasante de atardecer): franjas diagonales suaves que cruzan desde los bordes
    // sin llegar al centro. En claro multiplican (tinta), en oscuro oscurecen levemente para dar piso/relieve.
    const ang = -0.42 + 0.03 * Math.sin(t * CLK * 0.25)   // inclinacion casi fija, micro-respiro
    const bands = 5
    ctx.save(); if (light) mult(ctx)
    for (let i = 0; i < bands; i++) {
      const fromTop = i < Math.ceil(bands / 2)
      const lane = fromTop ? (i / 2) : (i - Math.ceil(bands / 2))
      // origen pegado al borde sup o inf, fuera de la franja de texto
      const ox = (0.1 + r() * 0.8) * W
      const oy = fromTop ? -H * 0.05 - lane * 30 : H * 1.05 + lane * 30
      const len = H * (0.62 + r() * 0.18)
      const wsh = 50 + r() * 70
      const a = (light ? 0.07 : 0.16) * (0.7 + 0.3 * breath(t, i * 1.1, 0.4))
      const scol = light ? darken(pal.accent, 0.5) : '#000000'
      ctx.save(); ctx.translate(ox, oy); ctx.rotate(ang + (fromTop ? 0 : Math.PI))
      const g = ctx.createLinearGradient(0, 0, 0, len)
      g.addColorStop(0, rgba(scol, a)); g.addColorStop(0.7, rgba(scol, a * 0.4)); g.addColorStop(1, rgba(scol, 0))
      ctx.fillStyle = g
      ctx.beginPath(); ctx.moveTo(-wsh * 0.5, 0); ctx.lineTo(wsh * 0.5, 0); ctx.lineTo(wsh, len); ctx.lineTo(-wsh, len); ctx.closePath(); ctx.fill()
      ctx.restore()
    }
    ctx.restore()
  },
})

register({
  id: 'atmo.shadow.blinds-gobo', lib: 'atmosphere', category: 'shadow-systems', tones: ['dark', 'light'], rubros: ['*'], weight: 0.85,
  register: 'editorial', intensity: 'medium', tags: ['sombra', 'persiana', 'gobo', 'cinematico'],
  render(ctx, t, env) {
    const { pal } = env, light = pal.tone === 'light'
    // gobo de persiana (window blinds): franjas paralelas de sombra inclinadas que se deslizan despacio.
    // El centro de texto se PROTEGE atenuando la franja cuando cae sobre H*0.4..0.55.
    const ang = -0.32
    const gap = 64, wband = 30
    const slide = (t * 9) % gap
    ctx.save(); if (light) mult(ctx); else ctx.globalCompositeOperation = 'multiply'
    ctx.translate(W / 2, H / 2); ctx.rotate(ang); ctx.translate(-W / 2, -H / 2)
    const scol = light ? darken(pal.accent, 0.55) : '#000000'
    for (let y = -H; y < H * 2; y += gap) {
      const yy = y + slide
      // posicion real (post-rotacion) aprox del centro de la franja en pantalla -> distancia al centro de texto
      const screenY = (yy - H / 2) * Math.cos(ang) + H / 2
      const guard = clamp(Math.abs(screenY - H * 0.47) / (H * 0.2), 0.18, 1)
      const a = (light ? 0.1 : 0.22) * guard
      const g = ctx.createLinearGradient(0, yy, 0, yy + wband)
      g.addColorStop(0, rgba(scol, 0)); g.addColorStop(0.5, rgba(scol, a)); g.addColorStop(1, rgba(scol, 0))
      ctx.fillStyle = g; ctx.fillRect(-W * 0.4, yy, W * 1.8, wband)
    }
    ctx.restore()
  },
})

register({
  id: 'atmo.shadow.contact-floor', lib: 'atmosphere', category: 'shadow-systems', tones: ['dark', 'light'], rubros: ['*'], weight: 0.95,
  register: 'neutral', intensity: 'soft', tags: ['sombra', 'piso', 'profundidad', 'grounding'],
  render(ctx, t, env) {
    const { pal } = env, light = pal.tone === 'light'
    // sombra de contacto: una elipse oscura difusa contra el borde inferior (ancla el contenido al "piso") +
    // un leve oscurecido bajo el centro -> da peso y profundidad sin tocar la franja de texto.
    const cy = H * 0.985, drift = Math.sin(t * CLK * 0.3) * 6
    ctx.save(); if (light) mult(ctx)
    const sol = light ? darken(pal.accent2, 0.5) : '#000000'
    ctx.save(); ctx.translate(W / 2 + drift, cy); ctx.scale(1, 0.13)
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, W * 0.52)
    g.addColorStop(0, rgba(sol, light ? 0.16 : 0.42)); g.addColorStop(0.6, rgba(sol, light ? 0.07 : 0.2)); g.addColorStop(1, rgba(sol, 0))
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, W * 0.52, 0, TAU); ctx.fill()
    ctx.restore()
    ctx.restore()
  },
})

// ════════════════════════════ LIGHT-RAYS (mas godrays) ════════════════════════════

register({
  id: 'atmo.rays.window-shaft', lib: 'atmosphere', category: 'light-rays', tones: ['dark'], rubros: ['*'], weight: 0.85,
  register: 'editorial', intensity: 'medium', tags: ['volumetrico', 'ventana', 'lateral', 'polvo'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'shaft')
    // haz de ventana: 3-4 columnas anchas de luz que entran en diagonal desde arriba-izquierda, polvo flotando.
    // Pasan por los costados del texto. Aditivo (oscuro).
    const baseAng = 0.5   // inclinacion del haz
    const ox = -W * 0.1, oy = -H * 0.08
    const cols = 4
    ctx.save(); add(ctx); ctx.translate(ox, oy); ctx.rotate(baseAng)
    for (let i = 0; i < cols; i++) {
      const off = i * (W * 0.42) + r() * 24
      const wsh = 60 + r() * 36
      const len = H * 1.7
      const a = (0.05 + 0.045 * breath(t, i * 1.7, 0.5)) * (1 - i * 0.12)
      const g = ctx.createLinearGradient(0, 0, 0, len)
      g.addColorStop(0, rgba(pal.accent, a)); g.addColorStop(0.55, rgba(pal.accent, a * 0.35)); g.addColorStop(1, rgba(pal.accent, 0))
      ctx.fillStyle = g
      ctx.fillRect(off, 0, wsh, len)
    }
    // motas de polvo en el haz (deterministas, deriva lenta)
    for (let k = 0; k < 22; k++) {
      const px = r() * W * 1.6, py = (r() * H * 1.6 + t * 6) % (H * 1.7)
      const a = 0.1 + 0.2 * r()
      const rad = 0.8 + r() * 1.8
      ctx.fillStyle = rgba('#ffffff', a * (0.5 + 0.5 * breath(t, k, 1.3)))
      ctx.beginPath(); ctx.arc(px, py, rad, 0, TAU); ctx.fill()
    }
    ctx.restore()
  },
})

register({
  id: 'atmo.rays.crepuscular-edge', lib: 'atmosphere', category: 'light-rays', tones: ['dark'], rubros: ['*'], weight: 0.7,
  register: 'editorial', intensity: 'soft', tags: ['volumetrico', 'crepuscular', 'esquina', 'rayos'],
  render(ctx, t, env) {
    const { pal } = env
    // rayos crepusculares desde una esquina superior derecha (sol oculto): abanico estrecho que abraza el borde,
    // dejando el centro despejado. Mezcla acento + acento2 por rayo.
    const fx = W * 1.05, fy = -H * 0.06, n = 9
    const sweep = Math.sin(t * CLK * 0.12) * 0.04
    ctx.save(); add(ctx); ctx.translate(fx, fy)
    for (let i = 0; i < n; i++) {
      const ang = Math.PI * 0.62 + (i / (n - 1)) * 0.5 + sweep
      const a = (0.04 + 0.035 * breath(t, i * 0.8, 0.55)) * (1 - i / n * 0.4)
      const col = i % 2 ? pal.accent2 : pal.accent
      ctx.save(); ctx.rotate(ang)
      const g = ctx.createLinearGradient(0, 0, H * 1.3, 0)
      g.addColorStop(0, rgba(col, a)); g.addColorStop(0.7, rgba(col, a * 0.3)); g.addColorStop(1, rgba(col, 0))
      ctx.fillStyle = g
      ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(0, 8); ctx.lineTo(H * 1.3, 40); ctx.lineTo(H * 1.3, -40); ctx.closePath(); ctx.fill()
      ctx.restore()
    }
    ctx.restore()
  },
})

// ════════════════════════════ LENS-FX (mas flares / glints / bokeh) ════════════════════════════

register({
  id: 'atmo.lens.flare-chain', lib: 'atmosphere', category: 'lens-fx', tones: ['dark'], rubros: ['*'], weight: 0.7,
  register: 'editorial', intensity: 'bold', tags: ['flare', 'ghost', 'cinematico'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'flarechain')
    // cadena de "ghosts" de lente: discos/anillos translucidos alineados sobre la diagonal fuente->centro,
    // como un flare de cine. La fuente deriva; los ghosts no caen sobre el texto (se atenuan cerca del centro).
    const sx = W * (0.78 + 0.05 * Math.sin(t * CLK * 0.3)), sy = H * (0.14 + 0.02 * Math.cos(t * CLK * 0.25))
    const cx = W / 2, cy = H * 0.47
    const N = 6
    ctx.save(); add(ctx)
    for (let i = 0; i < N; i++) {
      const f = -0.35 + i * 0.42   // factor a lo largo de la linea (algunos pasados del centro)
      const gx = sx + (cx - sx) * f, gy = sy + (cy - sy) * f
      const dC = Math.hypot((gx - cx) / W, (gy - cy) / H)
      const fade = clamp(dC * 2.2, 0.12, 1)
      const rad = (10 + r() * 30) * (0.6 + 0.4 * Math.abs(f))
      const a = (0.05 + 0.05 * r()) * fade * (0.7 + 0.3 * breath(t, i, 0.8))
      const col = i % 3 === 0 ? '#ffffff' : (i % 2 ? pal.accent2 : pal.accent)
      const ring = i % 2 === 0
      if (ring) {
        ctx.strokeStyle = rgba(col, a); ctx.lineWidth = 2 + r() * 2
        ctx.beginPath(); ctx.arc(gx, gy, rad, 0, TAU); ctx.stroke()
      }
      const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, rad)
      g.addColorStop(0, rgba(col, a)); g.addColorStop(0.7, rgba(col, a * 0.4)); g.addColorStop(1, rgba(col, 0))
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(gx, gy, rad, 0, TAU); ctx.fill()
    }
    ctx.restore()
  },
})

register({
  id: 'atmo.lens.bokeh-corner', lib: 'atmosphere', category: 'lens-fx', tones: ['dark'], rubros: ['*'], weight: 0.85,
  register: 'editorial', intensity: 'medium', tags: ['bokeh', 'esquina', 'festivo', 'premium'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'bokeh-corner')
    // bokeh denso AGRUPADO en dos esquinas (sup-izq + inf-der), out-of-focus grande -> profundidad festiva
    // sin invadir el centro. Discos con anillo brillante (lente real). Deriva diagonal suave.
    const clusters = [{ cx: 0.12, cy: 0.12 }, { cx: 0.88, cy: 0.9 }]
    ctx.save(); add(ctx)
    for (let c = 0; c < clusters.length; c++) {
      const cl = clusters[c]
      for (let i = 0; i < 7; i++) {
        const ph = r() * TAU
        const ox = (r() - 0.5) * 0.34, oy = (r() - 0.5) * 0.34
        const dx = Math.sin(t * CLK * 0.2 + ph) * 0.02
        const bx = (cl.cx + ox + dx) * W, by = (cl.cy + oy) * H
        const rad = 14 + r() * 40
        const a = (0.05 + 0.07 * r()) * (0.6 + 0.4 * breath(t, ph, 1.0))
        const col = (i + c) % 2 ? pal.accent2 : pal.accent
        const g = ctx.createRadialGradient(bx, by, 0, bx, by, rad)
        g.addColorStop(0, rgba(col, a * 0.45)); g.addColorStop(0.78, rgba(col, a)); g.addColorStop(0.93, rgba(col, a * 0.6)); g.addColorStop(1, rgba(col, 0))
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, rad, 0, TAU); ctx.fill()
      }
    }
    ctx.restore()
  },
})

// ════════════════════════════ COLOR-GRADE (frio · teal-orange · duotone-wash) ════════════════════════════

register({
  id: 'atmo.grade.cool-wash', lib: 'atmosphere', category: 'color-grade', tones: ['dark', 'light'], rubros: ['*'], weight: 0.9,
  register: 'editorial', intensity: 'soft', tags: ['frio', 'grade', 'azul', 'nocturno'],
  render(ctx, t, env) {
    const { pal } = env, light = pal.tone === 'light'
    // lavado FRIO global (azul/cian nocturno), contraparte de warm-wash. Sombras viran a azul profundo, leve
    // realce frio en el centro-alto. Sutil, soft-light/multiply segun tono.
    const cool = hslToHex(212, 0.7, light ? 0.5 : 0.45)
    // VIDA: el realce frio del centro-alto late (pulse) y deriva -> noche que respira, no un filtro fijo.
    const cy = H * (0.42 + 0.03 * wave(t, 0.7, 0.45))
    const k = 0.72 + 0.56 * pulse(t, 0.9, 0.6)
    ctx.save(); ctx.globalCompositeOperation = light ? 'multiply' : 'soft-light'
    const g = ctx.createRadialGradient(W / 2, cy, 0, W / 2, H * 0.5, H * 0.95)
    g.addColorStop(0, rgba(cool, (light ? 0.05 : 0.18) * k)); g.addColorStop(0.55, rgba(cool, light ? 0.03 : 0.08)); g.addColorStop(1, rgba(hslToHex(224, 0.6, 0.18), light ? 0.06 : 0.2))
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    ctx.restore()
  },
})

register({
  id: 'atmo.grade.teal-orange', lib: 'atmosphere', category: 'color-grade', tones: ['dark', 'light'], rubros: ['*'], weight: 1.0,
  register: 'editorial', intensity: 'medium', tags: ['teal-orange', 'blockbuster', 'grade', 'cine'],
  render(ctx, t, env) {
    const { pal } = env, light = pal.tone === 'light'
    // el grade "blockbuster" mas usado: sombras a TEAL, luces a NARANJA, en diagonal (no solo top/bottom como
    // split-tone). Da el look hollywoodense. Hue fijos para honestidad del look, intensidad por tono.
    const teal = hslToHex(184, 0.65, light ? 0.45 : 0.42)
    const orange = hslToHex(26, 0.85, light ? 0.55 : 0.55)
    // VIDA: teal y naranja respiran en contrafase a lo largo de la diagonal + el eje de la diagonal deriva
    // -> el look blockbuster ondula como luz cambiante, centro neutro intacto.
    const sw = 0.5 + 0.5 * wave(t, 0.6, 0.6)
    const ex = W + wave(t, 0.9, 0.4) * 26, ey = wave(t, 1.7, 0.35) * 22
    ctx.save(); ctx.globalCompositeOperation = light ? 'multiply' : 'soft-light'
    const g = ctx.createLinearGradient(0, 0, ex, ey + H)   // diagonal que oscila
    g.addColorStop(0, rgba(teal, (light ? 0.06 : 0.18) * (0.75 + 0.5 * sw)))
    g.addColorStop(0.48, 'rgba(128,128,128,0)')
    g.addColorStop(0.52, 'rgba(128,128,128,0)')
    g.addColorStop(1, rgba(orange, (light ? 0.05 : 0.16) * (0.75 + 0.5 * (1 - sw))))
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    ctx.restore()
  },
})

register({
  id: 'atmo.grade.duotone-wash', lib: 'atmosphere', category: 'color-grade', tones: ['dark', 'light'], rubros: ['*'], weight: 0.8,
  register: 'editorial', intensity: 'soft', tags: ['duotone', 'editorial', 'grade', 'marca'],
  render(ctx, t, env) {
    const { pal } = env, light = pal.tone === 'light'
    // duotono editorial: mapea sombras->acento, luces->acento2 con un wash de marca direccional (top-left a
    // bottom-right). El centro queda casi neutro (hueco) para no teñir el texto. Respira muy leve.
    const breathe = 0.02 * Math.sin(t * CLK * 0.3)
    ctx.save(); ctx.globalCompositeOperation = light ? 'multiply' : 'soft-light'
    const g = ctx.createLinearGradient(0, 0, W * 0.9, H)
    g.addColorStop(0, rgba(pal.accent, (light ? 0.06 : 0.17) + breathe))
    g.addColorStop(0.42, 'rgba(128,128,128,0)')
    g.addColorStop(0.58, 'rgba(128,128,128,0)')
    g.addColorStop(1, rgba(pal.accent2, (light ? 0.055 : 0.16) - breathe))
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    ctx.restore()
  },
})

// ════════════════════════════ DEPTH-HAZE (extra) ════════════════════════════

register({
  id: 'atmo.haze.top-mist', lib: 'atmosphere', category: 'depth-haze', tones: ['dark', 'light'], rubros: ['*'], weight: 0.85,
  register: 'neutral', intensity: 'soft', tags: ['niebla', 'cielo', 'profundidad'],
  render(ctx, t, env) {
    const { pal } = env, light = pal.tone === 'light'
    // bruma alta que baja del techo (cielo/atmosfera lejana), espejo de depth-floor: aclara la parte superior y
    // se disuelve antes del texto. Da sensacion de aire y distancia arriba.
    const fog = light ? '#ffffff' : lighten(pal.bg1, 0.45)
    const drift = Math.cos(t * CLK * 0.22) * 0.02
    ctx.save(); if (!light) screen(ctx)
    const g = ctx.createLinearGradient(0, 0, 0, H * (0.34 + drift))
    g.addColorStop(0, rgba(fog, light ? 0.42 : 0.15)); g.addColorStop(0.5, rgba(fog, light ? 0.16 : 0.05)); g.addColorStop(1, rgba(fog, 0))
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H * 0.4)
    ctx.restore()
  },
})

register({
  id: 'atmo.haze.volumetric-puffs', lib: 'atmosphere', category: 'depth-haze', tones: ['dark'], rubros: ['*'], weight: 0.7,
  register: 'neutral', intensity: 'soft', tags: ['niebla', 'nubes', 'volumetrico', 'organico'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'puffs')
    // bocanadas de niebla volumetrica (cumulos suaves) a la deriva por los bordes sup/inf -> nubosidad luminosa
    // tenue, evita el centro. Cada puff es un radial difuso que late y se desplaza horizontalmente.
    const fog = lighten(pal.bg1, 0.55)
    const N = 7
    ctx.save(); screen(ctx)
    for (let i = 0; i < N; i++) {
      const ph = r() * TAU, sp = 0.3 + r() * 0.5
      const lane = r() < 0.5 ? 0.1 + r() * 0.14 : 0.78 + r() * 0.14   // arriba o abajo, no el centro
      const px = ((r() * W) + t * 7 * sp) % (W + 160) - 80
      const py = lane * H + Math.sin(t * CLK * 0.3 + ph) * 14
      const rad = 70 + r() * 90
      const a = (0.03 + 0.035 * r()) * (0.6 + 0.4 * breath(t, ph, 0.5))
      const g = ctx.createRadialGradient(px, py, 0, px, py, rad)
      g.addColorStop(0, rgba(fog, a)); g.addColorStop(0.6, rgba(fog, a * 0.4)); g.addColorStop(1, rgba(fog, 0))
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, rad, 0, TAU); ctx.fill()
    }
    ctx.restore()
  },
})

// ════════════════════════════ GLOW-BLOOM (extra: barrido) ════════════════════════════

register({
  id: 'atmo.glow.sweep-band', lib: 'atmosphere', category: 'glow-bloom', tones: ['dark'], rubros: ['*'], weight: 0.7,
  register: 'neutral', intensity: 'medium', tags: ['barrido', 'luz', 'diagonal'],
  render(ctx, t, env) {
    const { pal } = env
    // barrido de luz: una banda diagonal aditiva que recorre la pantalla en loop lento (specular sweep tipo
    // metal/cristal). Cruza el centro pero con alpha bajisimo y suave -> realza sin tapar.
    const period = 8
    const p = ((t % period) / period)   // 0..1
    const cx = (-0.3 + p * 1.6) * W      // centro de la banda barriendo
    const ang = -0.5
    // el brillo del barrido entra y sale suave (smoothstep en los extremos) -> sin corte duro al reciclar.
    const edgeFade = sweepPhase(p / 0.12) * sweepPhase((1 - p) / 0.12)
    const a = 0.07 * (0.5 + 0.5 * edgeFade)
    ctx.save(); add(ctx)
    ctx.translate(W / 2, H / 2); ctx.rotate(ang); ctx.translate(-W / 2, -H / 2)
    const half = W * 0.34
    const g = ctx.createLinearGradient(cx - half, 0, cx + half, 0)
    g.addColorStop(0, rgba(pal.accent, 0)); g.addColorStop(0.5, rgba(pal.accent, a)); g.addColorStop(1, rgba(pal.accent, 0))
    ctx.fillStyle = g; ctx.fillRect(cx - half, -H * 0.6, half * 2, H * 2.2)
    ctx.restore()
  },
})

// ══════════════════════════════════════════════════════════════════════════════════════
// ░░ OLA 3 ░░  mas glow · vignette · light-rays · depth-haze · lens · color-grade · shadow ·
// scrim. Mismas reglas: alpha contenido, HUECO en el centro (texto en H*0.4..0.55), tone-aware
// honesto (luz ADITIVA en oscuro / tinta SUSTRACTIVA en claro). Puro + determinista.
// ══════════════════════════════════════════════════════════════════════════════════════

// ════════════════════════════ GLOW-BLOOM (extra) ════════════════════════════

register({
  id: 'atmo.glow.corner-pools', lib: 'atmosphere', category: 'glow-bloom', tones: ['dark'], rubros: ['*'], weight: 0.9,
  register: 'neutral', intensity: 'medium', tags: ['esquinas', 'luz', 'enmarque'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'corner-pools')
    // pozos de luz en las 4 esquinas (enmarque luminoso): cada esquina respira en fase distinta, el centro
    // queda como un "hueco" oscuro -> guia el ojo al texto. Aditivo. Alterna acento/acento2 por esquina.
    const corners = [[0, 0], [1, 0], [0, 1], [1, 1]]
    ctx.save(); add(ctx)
    corners.forEach(([cx, cy], i) => {
      const ph = r() * TAU
      const x = cx * W, y = cy * H
      const rad = H * (0.30 + 0.04 * breath(t, ph, 0.5))
      const a = 0.07 + 0.035 * breath(t, ph, 0.6)
      const col = i % 2 ? pal.accent2 : pal.accent
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad)
      g.addColorStop(0, rgba(col, a)); g.addColorStop(0.55, rgba(col, a * 0.35)); g.addColorStop(1, rgba(col, 0))
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    })
    ctx.restore()
  },
})

register({
  id: 'atmo.glow.ember-rise', lib: 'atmosphere', category: 'glow-bloom', tones: ['dark'], rubros: ['*'], weight: 0.75,
  register: 'friendly', intensity: 'medium', tags: ['brasas', 'calido', 'organico', 'partculas'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'ember')
    // brasas de luz que ascienden lentas desde el borde inferior (chimenea/forja): puntos calidos difusos que
    // suben y se apagan antes del centro de texto. Aditivo, determinista (posiciones por semilla + t en modulo).
    const warm = hslToHex(28, 0.85, 0.58)
    const N = 16
    ctx.save(); add(ctx)
    for (let i = 0; i < N; i++) {
      const ph = r() * TAU, sp = 0.4 + r() * 0.6
      const x0 = r() * W
      const sway = Math.sin(t * CLK * 0.5 + ph) * 10
      const cycle = (r() * H + t * 16 * sp) % (H * 1.1)
      const y = H - cycle                       // sube
      const lifeT = cycle / (H * 1.1)           // 0 abajo .. 1 arriba
      // se desvanece arriba y, sobre todo, antes de la franja de texto
      const guard = clamp(Math.abs((y - H * 0.47) / (H * 0.22)), 0.1, 1)
      const a = (0.12 + 0.18 * r()) * (1 - lifeT) * guard * (0.6 + 0.4 * breath(t, ph, 1.4))
      const rad = 2 + r() * 4
      const col = i % 3 === 0 ? pal.accent : warm
      const g = ctx.createRadialGradient(x0 + sway, y, 0, x0 + sway, y, rad * 3)
      g.addColorStop(0, rgba(col, a)); g.addColorStop(0.5, rgba(col, a * 0.4)); g.addColorStop(1, rgba(col, 0))
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x0 + sway, y, rad * 3, 0, TAU); ctx.fill()
    }
    ctx.restore()
  },
})

// ════════════════════════════ VIGNETTE (extra) ════════════════════════════

register({
  id: 'atmo.vignette.spotlight', lib: 'atmosphere', category: 'vignette', tones: ['dark', 'light'], rubros: ['*'], weight: 1.05,
  register: 'editorial', intensity: 'bold', tags: ['spotlight', 'foco', 'teatro', 'universal'],
  render(ctx, t, env) {
    const { pal } = env, light = pal.tone === 'light'
    // foco de teatro: una elipse de luz clara enmarca el centro y TODO lo de afuera cae a oscuro (oscuro) o a
    // una bruma blanca (claro). Mas estrecho que la vineta clasica -> aisla el texto como en un escenario.
    const cx = W / 2, cy = H * 0.47, drift = Math.sin(t * CLK * 0.2) * 4
    ctx.save()
    ctx.translate(cx + drift, cy); ctx.scale(1, 1.42)   // elipse vertical (encuadre del bloque de texto)
    const g = ctx.createRadialGradient(0, 0, H * 0.06, 0, 0, H * 0.5)
    if (light) {
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.62, 'rgba(255,255,255,0)')
      g.addColorStop(1, 'rgba(250,248,244,0.16)')
    } else {
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.58, 'rgba(0,0,0,0)')
      g.addColorStop(0.85, 'rgba(0,0,0,0.42)'); g.addColorStop(1, 'rgba(0,0,0,0.7)')
    }
    ctx.fillStyle = g; ctx.fillRect(-W, -H, W * 2, H * 2)
    ctx.restore()
  },
})

register({
  id: 'atmo.vignette.frame-edge', lib: 'atmosphere', category: 'vignette', tones: ['dark', 'light'], rubros: ['*'], weight: 0.85,
  register: 'editorial', intensity: 'soft', tags: ['marco', 'editorial', 'borde', 'universal'],
  render(ctx, t, env) {
    const { pal } = env, light = pal.tone === 'light'
    // vineta de MARCO (4 lados, no radial): oscurece/aclara solo un anillo en el perimetro con gradientes lineales
    // por lado -> sensacion de borde impreso/editorial, centro 100% intacto. Espesor fijo, muy estable.
    // VIDA (minima): el grosor del marco respira como una marea muy lenta -> el borde editorial vive.
    const inset = Math.round(W * (0.16 + 0.008 * breath(t, 0.4, 0.3)))
    const col = light ? 'rgba(250,248,244,' : 'rgba(0,0,0,'
    const a = light ? 0.34 : 0.46
    ctx.save()
    // top
    let g = ctx.createLinearGradient(0, 0, 0, inset)
    g.addColorStop(0, col + a + ')'); g.addColorStop(1, col + '0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, inset)
    // bottom
    g = ctx.createLinearGradient(0, H, 0, H - inset)
    g.addColorStop(0, col + a + ')'); g.addColorStop(1, col + '0)'); ctx.fillStyle = g; ctx.fillRect(0, H - inset, W, inset)
    // left
    g = ctx.createLinearGradient(0, 0, inset, 0)
    g.addColorStop(0, col + a + ')'); g.addColorStop(1, col + '0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, inset, H)
    // right
    g = ctx.createLinearGradient(W, 0, W - inset, 0)
    g.addColorStop(0, col + a + ')'); g.addColorStop(1, col + '0)'); ctx.fillStyle = g; ctx.fillRect(W - inset, 0, inset, H)
    ctx.restore()
  },
})

// ════════════════════════════ LIGHT-RAYS (extra) ════════════════════════════

register({
  id: 'atmo.rays.scanline-sweep', lib: 'atmosphere', category: 'light-rays', tones: ['dark'], rubros: ['tech', 'default'], weight: 0.7,
  register: 'playful', intensity: 'bold', tags: ['scan', 'tech', 'horizontal', 'futurista'],
  render(ctx, t, env) {
    const { pal } = env
    // barrido de LINEA horizontal (scanner tech): una banda fina de luz recorre la pantalla de arriba a abajo en
    // loop, atenuandose al pasar por la franja de texto (guard) -> look hi-tech/escaner sin tapar el contenido.
    const period = 6
    const p = (t % period) / period
    const y = (-0.15 + p * 1.3) * H
    const guard = clamp(Math.abs(y - H * 0.47) / (H * 0.2), 0.25, 1)
    const a = 0.14 * guard
    const half = 60
    ctx.save(); add(ctx)
    const g = ctx.createLinearGradient(0, y - half, 0, y + half)
    g.addColorStop(0, rgba(pal.accent, 0)); g.addColorStop(0.5, rgba(pal.accent, a)); g.addColorStop(1, rgba(pal.accent, 0))
    ctx.fillStyle = g; ctx.fillRect(0, y - half, W, half * 2)
    // nucleo fino mas brillante
    const g2 = ctx.createLinearGradient(0, y - 4, 0, y + 4)
    g2.addColorStop(0, rgba('#ffffff', 0)); g2.addColorStop(0.5, rgba('#ffffff', a * 0.8)); g2.addColorStop(1, rgba('#ffffff', 0))
    ctx.fillStyle = g2; ctx.fillRect(0, y - 4, W, 8)
    ctx.restore()
  },
})

register({
  id: 'atmo.rays.aurora-veil', lib: 'atmosphere', category: 'light-rays', tones: ['dark'], rubros: ['*'], weight: 0.7,
  register: 'editorial', intensity: 'medium', tags: ['aurora', 'cortina', 'organico', 'nocturno'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'aurora')
    // cortinas de aurora boreal: bandas verticales onduladas de luz translucida en la parte ALTA del cuadro
    // (cuelgan del techo, se disuelven antes del texto). Ondulan con seno por columna. Aditivo, frio.
    const cols = 5
    ctx.save(); add(ctx)
    for (let i = 0; i < cols; i++) {
      const baseX = (0.1 + (i / (cols - 1)) * 0.8) * W
      const ph = r() * TAU
      const wob = Math.sin(t * CLK * 0.4 + ph) * 22
      const wRay = 36 + r() * 30
      const len = H * 0.5     // solo techo -> mitad superior
      const a = (0.05 + 0.04 * breath(t, ph, 0.5)) * (0.7 + 0.3 * Math.sin(i + t * CLK * 0.2))
      const col = i % 2 ? pal.accent2 : pal.accent
      const x = baseX + wob
      const g = ctx.createLinearGradient(0, 0, 0, len)
      g.addColorStop(0, rgba(col, a)); g.addColorStop(0.7, rgba(col, a * 0.3)); g.addColorStop(1, rgba(col, 0))
      ctx.fillStyle = g
      ctx.beginPath(); ctx.moveTo(x - wRay * 0.4, 0); ctx.lineTo(x + wRay * 0.4, 0); ctx.lineTo(x + wRay, len); ctx.lineTo(x - wRay, len); ctx.closePath(); ctx.fill()
    }
    ctx.restore()
  },
})

// ════════════════════════════ DEPTH-HAZE (extra) ════════════════════════════

register({
  id: 'atmo.haze.dust-motes', lib: 'atmosphere', category: 'depth-haze', tones: ['dark'], rubros: ['*'], weight: 0.8,
  register: 'neutral', intensity: 'soft', tags: ['polvo', 'partculas', 'profundidad', 'ambiente'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'motes')
    // motas de polvo flotando en el aire (depth particles): puntos diminutos que derivan en parallax suave por
    // TODO el cuadro, mas tenues cerca del centro (no compiten con el texto). Da volumen/aire. Aditivo.
    const N = 40
    ctx.save(); add(ctx)
    for (let i = 0; i < N; i++) {
      const ph = r() * TAU, sp = 0.2 + r() * 0.5
      const x = (r() * W + Math.sin(t * CLK * 0.3 + ph) * 12)
      const y = ((r() * H) + t * 5 * sp) % (H + 20) - 10
      const dC = Math.hypot((x - W / 2) / W, (y - H * 0.47) / H)
      const fade = clamp(dC * 2.0, 0.12, 1)
      const rad = 0.7 + r() * 1.6
      const a = (0.12 + 0.22 * r()) * fade * (0.5 + 0.5 * breath(t, ph, 1.5))
      ctx.fillStyle = rgba(i % 4 === 0 ? pal.accent : '#ffffff', a)
      ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.fill()
    }
    ctx.restore()
  },
})

register({
  id: 'atmo.haze.gradient-fog-side', lib: 'atmosphere', category: 'depth-haze', tones: ['dark', 'light'], rubros: ['*'], weight: 0.8,
  register: 'neutral', intensity: 'soft', tags: ['niebla', 'lateral', 'profundidad'],
  render(ctx, t, env) {
    const { pal } = env, light = pal.tone === 'light'
    // bruma que entra desde los LADOS (izq+der) hacia adentro y se disuelve antes del centro -> estrecha el foco
    // horizontalmente y da profundidad de campo. Espejo lateral de depth-floor. Sutil, deriva lenta.
    const fog = light ? '#ffffff' : lighten(pal.bg1, 0.42)
    const drift = Math.sin(t * CLK * 0.22) * 0.015
    ctx.save(); if (!light) screen(ctx)
    const wEdge = W * (0.30 + drift)
    let g = ctx.createLinearGradient(0, 0, wEdge, 0)
    g.addColorStop(0, rgba(fog, light ? 0.4 : 0.14)); g.addColorStop(0.5, rgba(fog, light ? 0.14 : 0.05)); g.addColorStop(1, rgba(fog, 0))
    ctx.fillStyle = g; ctx.fillRect(0, 0, wEdge, H)
    g = ctx.createLinearGradient(W, 0, W - wEdge, 0)
    g.addColorStop(0, rgba(fog, light ? 0.4 : 0.14)); g.addColorStop(0.5, rgba(fog, light ? 0.14 : 0.05)); g.addColorStop(1, rgba(fog, 0))
    ctx.fillStyle = g; ctx.fillRect(W - wEdge, 0, wEdge, H)
    ctx.restore()
  },
})

// ════════════════════════════ LENS-FX (extra) ════════════════════════════

register({
  id: 'atmo.lens.chromatic-fringe', lib: 'atmosphere', category: 'lens-fx', tones: ['dark'], rubros: ['*'], weight: 0.65,
  register: 'playful', intensity: 'bold', tags: ['aberracion', 'cromatico', 'borde', 'lente'],
  render(ctx, t, env) {
    // aberracion cromatica de borde (lente real): franjas rojo/cian muy finas y desplazadas en los margenes del
    // cuadro -> el clasico "fringe" de las esquinas de un lente. Centro intacto. Hue FIJOS (honestidad del efecto).
    const red = '#ff3a3a', cyan = '#27e0e0'
    // VIDA: los dos lados titilan en contrafase (la aberracion "vibra" como un lente real) y el ancho del fringe
    // deriva apenas -> nunca queda congelado, centro intacto.
    const aL = 0.10 + 0.035 * pulse(t, 0.4, 0.5)
    const aR = 0.10 + 0.035 * pulse(t, 0.4 + Math.PI, 0.5)
    const band = W * (0.1 + 0.008 * wave(t, 0.9, 0.25))
    ctx.save(); ctx.globalCompositeOperation = 'screen'
    // izquierda: rojo afuera, cian adentro
    let g = ctx.createLinearGradient(0, 0, band, 0)
    g.addColorStop(0, rgba(red, aL)); g.addColorStop(1, rgba(red, 0)); ctx.fillStyle = g; ctx.fillRect(0, 0, band, H)
    g = ctx.createLinearGradient(band * 0.4, 0, band * 1.4, 0)
    g.addColorStop(0, rgba(cyan, aL * 0.7)); g.addColorStop(1, rgba(cyan, 0)); ctx.fillStyle = g; ctx.fillRect(band * 0.4, 0, band, H)
    // derecha: cian afuera, rojo adentro
    g = ctx.createLinearGradient(W, 0, W - band, 0)
    g.addColorStop(0, rgba(cyan, aR)); g.addColorStop(1, rgba(cyan, 0)); ctx.fillStyle = g; ctx.fillRect(W - band, 0, band, H)
    g = ctx.createLinearGradient(W - band * 0.4, 0, W - band * 1.4, 0)
    g.addColorStop(0, rgba(red, aR * 0.7)); g.addColorStop(1, rgba(red, 0)); ctx.fillStyle = g; ctx.fillRect(W - band * 1.4, 0, band, H)
    ctx.restore()
  },
})

register({
  id: 'atmo.lens.starburst-core', lib: 'atmosphere', category: 'lens-fx', tones: ['dark'], rubros: ['*'], weight: 0.7,
  register: 'editorial', intensity: 'bold', tags: ['estrella', 'destello', 'diafragma', 'cinematico'],
  render(ctx, t, env) {
    const { pal } = env
    // estrella de diafragma (sunstar) de un punto de luz unico en una esquina superior: nucleo brillante + puntas
    // largas (numero par, como las palas del iris) que titilan despacio. Lejos del centro. Aditivo.
    const fx = W * 0.84, fy = H * 0.15
    const spikes = 12
    const tw = 0.6 + 0.4 * breath(t, 0.2, 0.6)
    ctx.save(); add(ctx)
    // puntas
    for (let i = 0; i < spikes; i++) {
      const ang = (i / spikes) * TAU + t * CLK * 0.03
      const len = (i % 2 ? 130 : 64) * tw
      const a = (i % 2 ? 0.12 : 0.08) * tw
      ctx.save(); ctx.translate(fx, fy); ctx.rotate(ang)
      const g = ctx.createLinearGradient(0, 0, len, 0)
      g.addColorStop(0, rgba('#ffffff', a)); g.addColorStop(0.4, rgba(pal.accent, a * 0.6)); g.addColorStop(1, rgba(pal.accent, 0))
      ctx.fillStyle = g
      ctx.beginPath(); ctx.moveTo(0, -2.2); ctx.lineTo(len, 0); ctx.lineTo(0, 2.2); ctx.closePath(); ctx.fill()
      ctx.restore()
    }
    // nucleo
    const c = ctx.createRadialGradient(fx, fy, 0, fx, fy, 26)
    c.addColorStop(0, rgba('#ffffff', 0.5 * tw)); c.addColorStop(0.4, rgba(pal.accent, 0.3 * tw)); c.addColorStop(1, rgba(pal.accent, 0))
    ctx.fillStyle = c; ctx.beginPath(); ctx.arc(fx, fy, 26, 0, TAU); ctx.fill()
    ctx.restore()
  },
})

// ════════════════════════════ COLOR-GRADE (extra) ════════════════════════════

register({
  id: 'atmo.grade.bleach-bypass', lib: 'atmosphere', category: 'color-grade', tones: ['dark', 'light'], rubros: ['*'], weight: 0.8,
  register: 'editorial', intensity: 'medium', tags: ['bleach', 'contraste', 'desaturado', 'cine'],
  render(ctx, t, env) {
    const { pal } = env, light = pal.tone === 'light'
    // "bleach bypass": look de alto contraste y bajo croma (plata retenida). Lo emulamos con un overlay gris
    // direccional que sube el contraste en los bordes (sombras mas densas, luces mas duras) dejando el centro neutro.
    // VIDA: el contraste de bordes y el brillo plateado alto laten en contrafase -> el "bleach" palpita.
    const kEdge = 0.88 + 0.24 * pulse(t, 0.3, 0.3)
    const kHi = 0.88 + 0.24 * pulse(t, 0.3 + Math.PI, 0.3)
    ctx.save()
    // capa de contraste: oscurece bordes (multiply) -> sombras profundas tipo bleach
    ctx.globalCompositeOperation = 'multiply'
    let g = ctx.createRadialGradient(W / 2, H * 0.47, H * 0.22, W / 2, H * 0.5, H * 0.8)
    const gray = light ? '#b8b4ae' : '#3a3640'
    g.addColorStop(0, 'rgba(128,128,128,0)'); g.addColorStop(1, rgba(gray, (light ? 0.12 : 0.3) * kEdge))
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    // capa de luces duras (screen) en la zona alta -> brillo lavado plateado
    ctx.globalCompositeOperation = 'screen'
    g = ctx.createLinearGradient(0, 0, 0, H * 0.4)
    g.addColorStop(0, rgba('#d8d4cc', (light ? 0.1 : 0.16) * kHi)); g.addColorStop(1, rgba('#d8d4cc', 0))
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H * 0.4)
    ctx.restore()
  },
})

register({
  id: 'atmo.grade.crossfade-vhs', lib: 'atmosphere', category: 'color-grade', tones: ['dark'], rubros: ['*'], weight: 0.65,
  register: 'playful', intensity: 'loud', tags: ['vhs', 'retro', 'magenta', 'analogico'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'vhs')
    // grade analogico VHS: viraje magenta/verde cruzado + bandas tracking horizontales muy tenues que se deslizan.
    // Centro casi neutro. Da nostalgia 80s/90s sin destruir legibilidad. Hue FIJOS (look honesto).
    const magenta = '#d83a9a', green = '#3ad88a'
    ctx.save(); ctx.globalCompositeOperation = 'soft-light'
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, rgba(magenta, 0.14)); g.addColorStop(0.45, 'rgba(128,128,128,0)')
    g.addColorStop(0.55, 'rgba(128,128,128,0)'); g.addColorStop(1, rgba(green, 0.12))
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    // bandas tracking (lighter) deslizando, evitan el centro
    ctx.globalCompositeOperation = 'lighter'
    const slide = (t * 22) % 90
    for (let i = 0; i < 9; i++) {
      const y = (i * 90 + slide) % (H + 90) - 45
      const guard = clamp(Math.abs(y - H * 0.47) / (H * 0.18), 0.2, 1)
      const a = (0.018 + 0.02 * r()) * guard
      ctx.fillStyle = rgba('#ffffff', a); ctx.fillRect(0, y, W, 2 + r() * 3)
    }
    ctx.restore()
  },
})

// ════════════════════════════ SHADOW-SYSTEMS (extra) ════════════════════════════

register({
  id: 'atmo.shadow.foliage-gobo', lib: 'atmosphere', category: 'shadow-systems', tones: ['dark', 'light'], rubros: ['*'], weight: 0.8,
  register: 'friendly', intensity: 'soft', tags: ['sombra', 'follaje', 'gobo', 'organico', 'natural'],
  render(ctx, t, env) {
    const { pal } = env, light = pal.tone === 'light', r = seedFor(env.seed, 'foliage')
    // gobo de FOLLAJE (luz filtrada entre hojas): manchas organicas de sombra dispersas por los bordes que se
    // mecen suave como con viento. En claro multiplican (tinta), en oscuro oscurecen. El centro se PROTEGE (guard).
    const N = 18
    const scol = light ? darken(pal.accent, 0.5) : '#000000'
    ctx.save(); if (light) mult(ctx); else ctx.globalCompositeOperation = 'multiply'
    for (let i = 0; i < N; i++) {
      const ph = r() * TAU
      const bx = r() * W + Math.sin(t * CLK * 0.4 + ph) * 8
      const by = r() * H + Math.cos(t * CLK * 0.3 + ph) * 6
      const guard = clamp(Math.hypot((bx - W / 2) / W, (by - H * 0.47) / H) * 1.9, 0.12, 1)
      const rad = 18 + r() * 46
      const a = (light ? 0.08 : 0.2) * guard * (0.75 + 0.25 * breath(t, ph, 0.5))
      const g = ctx.createRadialGradient(bx, by, 0, bx, by, rad)
      g.addColorStop(0, rgba(scol, a)); g.addColorStop(0.6, rgba(scol, a * 0.45)); g.addColorStop(1, rgba(scol, 0))
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, rad, 0, TAU); ctx.fill()
    }
    ctx.restore()
  },
})

// ════════════════════════════ SCRIM-LEGIBILITY (extra) ════════════════════════════

register({
  id: 'atmo.scrim.top-banner', lib: 'atmosphere', category: 'scrim-legibility', tones: ['dark', 'light'], rubros: ['*'], weight: 0.95,
  register: 'neutral', intensity: 'calm', tags: ['legibilidad', 'upper-third', 'titulo', 'banner'],
  render(ctx, t, env) {
    const { pal } = env, light = pal.tone === 'light'
    // scrim SUPERIOR (upper-third): asegura legibilidad de un titulo/kicker en lo alto del cuadro. Espejo del
    // bottom-gradient. Se disuelve antes de la franja de texto central -> no compite con el cuerpo.
    // VIDA (minima): el alcance del scrim respira anclado al techo -> aire vivo sin descubrir el titulo.
    const bot = H * (0.42 + 0.015 * breath(t, 0.7, 0.32))
    const g = ctx.createLinearGradient(0, 0, 0, bot)
    if (light) { g.addColorStop(0, 'rgba(255,255,255,0.5)'); g.addColorStop(0.6, 'rgba(255,255,255,0.14)'); g.addColorStop(1, 'rgba(255,255,255,0)') }
    else { g.addColorStop(0, 'rgba(0,0,0,0.58)'); g.addColorStop(0.6, 'rgba(0,0,0,0.18)'); g.addColorStop(1, 'rgba(0,0,0,0)') }
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, bot)
  },
})

register({
  id: 'atmo.scrim.diagonal-wedge', lib: 'atmosphere', category: 'scrim-legibility', tones: ['dark', 'light'], rubros: ['*'], weight: 0.75,
  register: 'editorial', intensity: 'soft', tags: ['legibilidad', 'diagonal', 'editorial', 'cuna'],
  render(ctx, t, env) {
    const { pal } = env, light = pal.tone === 'light'
    // scrim en CUNA diagonal: una banda de oscurecido/aclarado que cruza el cuadro de la esquina inf-izq a la
    // media-derecha, asegurando contraste para texto alineado en esa diagonal (look editorial). Suave en los bordes.
    // VIDA (minima): la cuna diagonal respira su fuerza HACIA ARRIBA del piso -> el guard editorial vive.
    const k = 0.05 * breath(t, 0.6, 0.3)
    ctx.save()
    ctx.translate(W / 2, H / 2); ctx.rotate(-0.32); ctx.translate(-W / 2, -H / 2)
    const cy = H * 0.6, half = H * 0.26
    const g = ctx.createLinearGradient(0, cy - half, 0, cy + half)
    if (light) { g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, `rgba(255,255,255,${0.34 + k})`); g.addColorStop(1, 'rgba(255,255,255,0)') }
    else { g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, `rgba(0,0,0,${0.44 + k})`); g.addColorStop(1, 'rgba(0,0,0,0)') }
    ctx.fillStyle = g; ctx.fillRect(-W * 0.5, cy - half, W * 2, half * 2)
    ctx.restore()
  },
})

// ══════════════════════════════════════════════════════════════════════════════════════
// ░░ OLA 5 ░░  mas glow · vignette · light-rays · depth-haze · lens · color-grade · shadow ·
// scrim. Mismas reglas DURAS: alpha contenido, HUECO en el centro (texto en H*0.4..0.55),
// tone-aware honesto (luz ADITIVA en oscuro / tinta SUSTRACTIVA en claro). Puro + determinista.
// ══════════════════════════════════════════════════════════════════════════════════════

// ════════════════════════════ GLOW-BLOOM (extra) ════════════════════════════

register({
  id: 'atmo.glow.rim-arc', lib: 'atmosphere', category: 'glow-bloom', tones: ['dark'], rubros: ['*'], weight: 0.85,
  register: 'editorial', intensity: 'soft', tags: ['arco', 'borde', 'luz', 'enmarque'],
  render(ctx, t, env) {
    const { pal } = env
    // arco de luz superior: un trazo curvo aditivo y difuso que abraza el borde de arriba (como el rim-light de un
    // halo) -> enmarca sin tocar el centro. Respira en brillo. Acento -> acento2 a lo largo del arco.
    const cx = W / 2, cy = -H * 0.18, rad = H * 0.5
    const a = 0.1 + 0.05 * breath(t, 0.6, 0.5)
    ctx.save(); add(ctx)
    for (let pass = 0; pass < 3; pass++) {
      const lw = 26 - pass * 7
      ctx.lineWidth = lw
      const g = ctx.createLinearGradient(0, 0, W, 0)
      g.addColorStop(0, rgba(pal.accent, 0)); g.addColorStop(0.5, rgba(pass % 2 ? pal.accent2 : pal.accent, a * (1 - pass * 0.25))); g.addColorStop(1, rgba(pal.accent, 0))
      ctx.strokeStyle = g
      ctx.beginPath(); ctx.arc(cx, cy, rad + pass * 4, Math.PI * 0.12, Math.PI * 0.88); ctx.stroke()
    }
    ctx.restore()
  },
})

register({
  id: 'atmo.glow.under-light', lib: 'atmosphere', category: 'glow-bloom', tones: ['dark'], rubros: ['*'], weight: 0.8,
  register: 'editorial', intensity: 'medium', tags: ['contraluz', 'piso', 'luz', 'escenario'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'under')
    // luz desde abajo (footlights / contraluz de escenario): 2-3 manchas de luz que emergen del borde inferior y
    // suben difusas, deteniendose ANTES de la franja de texto. Da un brillo de "abajo hacia arriba", aditivo.
    const spots = [{ x: 0.28, c: pal.accent }, { x: 0.72, c: pal.accent2 }, { x: 0.5, c: pal.accent }]
    ctx.save(); add(ctx)
    spots.forEach((s, i) => {
      const ph = r() * TAU
      const cx = s.x * W + Math.sin(t * CLK * 0.3 + ph) * 10
      const cy = H * (1.02 + 0.01 * Math.sin(t * CLK * 0.4 + ph))
      const rad = H * (0.32 + 0.03 * breath(t, ph, 0.5))
      const a = (i === 2 ? 0.05 : 0.08) + 0.03 * breath(t, ph, 0.6)
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad)
      g.addColorStop(0, rgba(s.c, a)); g.addColorStop(0.55, rgba(s.c, a * 0.35)); g.addColorStop(1, rgba(s.c, 0))
      ctx.fillStyle = g; ctx.fillRect(0, H * 0.55, W, H * 0.45)
    })
    ctx.restore()
  },
})

// ════════════════════════════ VIGNETTE (extra) ════════════════════════════

register({
  id: 'atmo.vignette.pillarbox', lib: 'atmosphere', category: 'vignette', tones: ['dark', 'light'], rubros: ['*'], weight: 0.8,
  register: 'editorial', intensity: 'soft', tags: ['pillarbox', 'lateral', 'cinematico', 'universal'],
  render(ctx, t, env) {
    const { pal } = env, light = pal.tone === 'light'
    // vineta LATERAL (pillarbox): oscurece/aclara solo las dos columnas de los costados con gradientes horizontales,
    // estrechando el cuadro hacia el centro vertical donde vive el texto. Complemento horizontal de cinema-bars.
    // VIDA (minima): las dos columnas respiran su ancho en contrafase, ancladas a los costados -> pillarbox vivo.
    const dk = light ? 'rgba(30,22,16,0.10)' : 'rgba(0,0,0,0.5)'
    const wL = W * (0.26 + 0.012 * breath(t, 0.5, 0.3))
    const wR = W * (0.26 + 0.012 * breath(t, 0.5 + Math.PI, 0.3))
    let g = ctx.createLinearGradient(0, 0, wL, 0)
    g.addColorStop(0, dk); g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g; ctx.fillRect(0, 0, wL, H)
    g = ctx.createLinearGradient(W, 0, W - wR, 0)
    g.addColorStop(0, dk); g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g; ctx.fillRect(W - wR, 0, wR, H)
  },
})

register({
  id: 'atmo.vignette.breathing-iris', lib: 'atmosphere', category: 'vignette', tones: ['dark'], rubros: ['*'], weight: 0.75,
  register: 'neutral', intensity: 'soft', tags: ['iris', 'foco', 'respiracion', 'organico'],
  render(ctx, t, env) {
    // iris que respira: una vineta radial cuyo RADIO interior late suave (el "ojo" se abre y cierra apenas) -> da
    // vida organica al encuadre sin distraer. Centro siempre despejado. Solo oscuro (negro puro).
    const p = breath(t, 0.3, 0.45)
    const inner = H * (0.30 + 0.04 * p)
    const g = ctx.createRadialGradient(W / 2, H * 0.47, inner, W / 2, H * 0.5, H * 0.82)
    g.addColorStop(0, 'rgba(0,0,0,0)')
    g.addColorStop(0.7, 'rgba(0,0,0,0.2)')
    g.addColorStop(1, 'rgba(0,0,0,0.58)')
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
  },
})

// ════════════════════════════ LIGHT-RAYS (extra) ════════════════════════════

register({
  id: 'atmo.rays.spotlight-cone', lib: 'atmosphere', category: 'light-rays', tones: ['dark'], rubros: ['*'], weight: 0.8,
  register: 'editorial', intensity: 'medium', tags: ['cono', 'spotlight', 'volumetrico', 'teatro'],
  render(ctx, t, env) {
    const { pal } = env
    // cono de spotlight volumetrico que barre suave de lado a lado desde un foco arriba-centro -> luz teatral en
    // movimiento. El cono pasa por el centro pero con alpha bajisimo (no tapa), nucleo blanco arriba.
    const fx = W / 2, fy = -H * 0.06
    const swing = Math.sin(t * CLK * 0.18) * 0.22
    const ang = Math.PI / 2 + swing
    const half = 0.34
    ctx.save(); add(ctx); ctx.translate(fx, fy); ctx.rotate(ang - Math.PI / 2)
    const len = H * 1.25
    const a = 0.06 + 0.02 * breath(t, 0.4, 0.5)
    const g = ctx.createLinearGradient(0, 0, 0, len)
    g.addColorStop(0, rgba('#ffffff', a)); g.addColorStop(0.4, rgba(pal.accent, a * 0.5)); g.addColorStop(1, rgba(pal.accent, 0))
    ctx.fillStyle = g
    ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(10, 0); ctx.lineTo(len * half, len); ctx.lineTo(-len * half, len); ctx.closePath(); ctx.fill()
    ctx.restore()
  },
})

register({
  id: 'atmo.rays.caustics-floor', lib: 'atmosphere', category: 'light-rays', tones: ['dark'], rubros: ['*'], weight: 0.7,
  register: 'editorial', intensity: 'soft', tags: ['causticas', 'agua', 'piso', 'organico'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'caustics')
    // causticas de agua proyectadas en el PISO (reflejo de pileta/mar): manchas de luz onduladas que se deslizan
    // por la franja inferior, nunca el centro. Lineas finas curvas aditivas, frias. Da un mood acuatico premium.
    const N = 9
    ctx.save(); add(ctx)
    for (let i = 0; i < N; i++) {
      const ph = r() * TAU
      const baseX = r() * W
      const x = (baseX + t * 6 * (0.3 + r() * 0.5)) % (W + 80) - 40
      const y = H * (0.8 + r() * 0.18)
      const wob = Math.sin(t * CLK * 0.5 + ph) * 8
      const len = 30 + r() * 50
      const a = (0.06 + 0.06 * r()) * (0.5 + 0.5 * breath(t, ph, 0.9))
      ctx.strokeStyle = rgba(i % 3 === 0 ? pal.accent2 : pal.accent, a)
      ctx.lineWidth = 1.5 + r() * 1.5
      ctx.beginPath()
      ctx.moveTo(x - len, y + wob)
      ctx.quadraticCurveTo(x, y - 10 + wob, x + len, y + wob)
      ctx.stroke()
    }
    ctx.restore()
  },
})

// ════════════════════════════ DEPTH-HAZE (extra) ════════════════════════════

register({
  id: 'atmo.haze.rolling-fog', lib: 'atmosphere', category: 'depth-haze', tones: ['dark', 'light'], rubros: ['*'], weight: 0.85,
  register: 'editorial', intensity: 'medium', tags: ['niebla', 'rodante', 'profundidad', 'organico'],
  render(ctx, t, env) {
    const { pal } = env, light = pal.tone === 'light', r = seedFor(env.seed, 'rollfog')
    // niebla rodante de bordes: bancos de bruma que entran desde las 4 esquinas hacia adentro y se mecen, dejando
    // un claro central. Da una atmosfera densa/misteriosa. En oscuro screen, en claro multiply muy suave de blanco.
    const fog = light ? '#ffffff' : lighten(pal.bg1, 0.4)
    const corners = [[0.0, 0.0], [1.0, 0.0], [0.0, 1.0], [1.0, 1.0]]
    ctx.save(); if (!light) screen(ctx)
    corners.forEach(([cx, cy], i) => {
      const ph = r() * TAU
      const x = (cx + (cx < 0.5 ? 1 : -1) * 0.04 * (0.5 + 0.5 * Math.sin(t * CLK * 0.3 + ph))) * W
      const y = (cy + (cy < 0.5 ? 1 : -1) * 0.03 * (0.5 + 0.5 * Math.cos(t * CLK * 0.25 + ph))) * H
      const rad = H * (0.4 + 0.04 * breath(t, ph, 0.4))
      const a = light ? 0.16 : 0.1
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad)
      g.addColorStop(0, rgba(fog, a)); g.addColorStop(0.55, rgba(fog, a * 0.4)); g.addColorStop(1, rgba(fog, 0))
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    })
    ctx.restore()
  },
})

// ════════════════════════════ LENS-FX (extra) ════════════════════════════

register({
  id: 'atmo.lens.rain-streaks', lib: 'atmosphere', category: 'lens-fx', tones: ['dark'], rubros: ['*'], weight: 0.65,
  register: 'editorial', intensity: 'medium', tags: ['lluvia', 'lente', 'gotas', 'cinematico'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'rain')
    // gotas/regueros de lluvia sobre el lente: vetas verticales translucidas que caen y refractan luz de acento,
    // mas un par de gotas estaticas. Por los bordes; se atenuan hacia el centro. Aditivo, frio, look noir/urbano.
    const N = 14
    ctx.save(); add(ctx)
    for (let i = 0; i < N; i++) {
      const ph = r() * TAU
      const x = r() * W
      const sp = 0.6 + r() * 0.8
      const y = ((r() * H) + t * 60 * sp) % (H + 120) - 60
      const len = 24 + r() * 60
      const dC = Math.abs(x - W / 2) / W
      const fade = clamp(dC * 2.0 + 0.15, 0.2, 1)
      const a = (0.05 + 0.06 * r()) * fade
      const g = ctx.createLinearGradient(x, y, x, y + len)
      g.addColorStop(0, rgba(pal.accent, 0)); g.addColorStop(0.6, rgba(pal.accent2, a)); g.addColorStop(1, rgba('#ffffff', a * 0.8))
      ctx.strokeStyle = g; ctx.lineWidth = 1 + r() * 1.4
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + len); ctx.stroke()
    }
    ctx.restore()
  },
})

register({
  id: 'atmo.lens.smudge-bloom', lib: 'atmosphere', category: 'lens-fx', tones: ['dark'], rubros: ['*'], weight: 0.6,
  register: 'neutral', intensity: 'soft', tags: ['smudge', 'difuso', 'organico', 'suave'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'smudge')
    // manchas de "lente sucio" (smudge bloom): florecimientos suaves y deformados de luz en los margenes, como
    // huellas en el cristal que difunden el brillo. Elipses difusas aditivas, baja opacidad. Lejos del centro.
    const N = 6
    ctx.save(); add(ctx)
    for (let i = 0; i < N; i++) {
      const ph = r() * TAU
      const onEdge = r() < 0.5
      const bx = (onEdge ? (r() < 0.5 ? 0.12 : 0.88) : 0.1 + r() * 0.8) * W
      const by = (onEdge ? 0.1 + r() * 0.8 : (r() < 0.5 ? 0.14 : 0.86)) * H
      const rx = 40 + r() * 70, ry = (24 + r() * 50)
      const rot = r() * TAU
      const a = (0.03 + 0.04 * r()) * (0.6 + 0.4 * breath(t, ph, 0.6))
      const col = i % 2 ? pal.accent2 : pal.accent
      ctx.save(); ctx.translate(bx, by); ctx.rotate(rot + Math.sin(t * CLK * 0.2 + ph) * 0.06); ctx.scale(rx / ry, 1)
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, ry)
      g.addColorStop(0, rgba(col, a)); g.addColorStop(0.6, rgba(col, a * 0.4)); g.addColorStop(1, rgba(col, 0))
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, ry, 0, TAU); ctx.fill()
      ctx.restore()
    }
    ctx.restore()
  },
})

// ════════════════════════════ COLOR-GRADE (extra) ════════════════════════════

register({
  id: 'atmo.grade.golden-hour', lib: 'atmosphere', category: 'color-grade', tones: ['dark', 'light'], rubros: ['*'], weight: 0.9,
  register: 'friendly', intensity: 'medium', tags: ['dorado', 'atardecer', 'grade', 'calido'],
  render(ctx, t, env) {
    const { pal } = env, light = pal.tone === 'light'
    // "golden hour" direccional: la luz calida entra desde una esquina superior (amanecer/atardecer) y vira a sombra
    // fria en la esquina opuesta -> profundidad y hora del dia. Hue FIJOS (ambar / azul) para honestidad del look.
    const amber = hslToHex(36, 0.85, light ? 0.6 : 0.55)
    const cool = hslToHex(220, 0.5, light ? 0.5 : 0.3)
    // VIDA: el calor de la "hora dorada" late (pulse) y el eje de la diagonal deriva -> sol que baja, vivo.
    const warm = (light ? 0.07 : 0.2) * (0.74 + 0.52 * pulse(t, 0.4, 0.55))
    const dx = W + wave(t, 0.8, 0.4) * 30, dy = wave(t, 1.5, 0.35) * 24
    ctx.save(); ctx.globalCompositeOperation = light ? 'multiply' : 'soft-light'
    const g = ctx.createLinearGradient(dx, dy, 0, H)   // de sup-der (calido) a inf-izq (frio)
    g.addColorStop(0, rgba(amber, warm))
    g.addColorStop(0.45, 'rgba(128,128,128,0)')
    g.addColorStop(0.55, 'rgba(128,128,128,0)')
    g.addColorStop(1, rgba(cool, light ? 0.05 : 0.16))
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    ctx.restore()
  },
})

register({
  id: 'atmo.grade.noir-mono', lib: 'atmosphere', category: 'color-grade', tones: ['dark', 'light'], rubros: ['*'], weight: 0.7,
  register: 'editorial', intensity: 'medium', tags: ['noir', 'mono', 'desaturado', 'contraste', 'editorial'],
  render(ctx, t, env) {
    const { pal } = env, light = pal.tone === 'light'
    // grade NOIR: desatura tirando a gris de marca y profundiza las sombras de los bordes (alto contraste, look de
    // cine negro). Centro intacto. Un toque del acento en la zona alta para que no quede 100% plano. Sutil.
    const grayHsl = hexToHsl(pal.accent)
    const gray = hslToHex(grayHsl.h, 0.06, light ? 0.7 : 0.3)
    // VIDA: la chispa fria de marca arriba late (pulse, marcado) y deriva su foco -> el gris noir nunca queda
    // muerto, respira un destello frio.
    const spark = 0.7 + 0.6 * pulse(t, 0.6, 0.7)
    const cx = W * (0.5 + 0.06 * wave(t, 0.4, 0.4))
    ctx.save()
    ctx.globalCompositeOperation = light ? 'multiply' : 'soft-light'
    let g = ctx.createRadialGradient(W / 2, H * 0.47, H * 0.22, W / 2, H * 0.5, H * 0.85)
    g.addColorStop(0, 'rgba(128,128,128,0)'); g.addColorStop(1, rgba(gray, light ? 0.14 : 0.28))
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    // chispa fria de marca arriba para que no sea gris muerto
    ctx.globalCompositeOperation = light ? 'multiply' : 'screen'
    g = ctx.createRadialGradient(cx, -H * 0.02, 0, cx, -H * 0.02, H * 0.42)
    g.addColorStop(0, rgba(pal.accent, (light ? 0.05 : 0.1) * spark)); g.addColorStop(1, rgba(pal.accent, 0))
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H * 0.42)
    ctx.restore()
  },
})

// ════════════════════════════ SHADOW-SYSTEMS (extra) ════════════════════════════

register({
  id: 'atmo.shadow.grid-cast', lib: 'atmosphere', category: 'shadow-systems', tones: ['dark', 'light'], rubros: ['*'], weight: 0.7,
  register: 'corporate', intensity: 'medium', tags: ['sombra', 'reja', 'grid', 'arquitectura', 'gobo'],
  render(ctx, t, env) {
    const { pal } = env, light = pal.tone === 'light'
    // gobo de REJA/ventana cuadriculada: sombra de una grilla en perspectiva proyectada desde un costado, que se
    // desliza muy lento -> mood arquitectonico. El centro se PROTEGE (guard atenua donde vive el texto). Sustractivo.
    const scol = light ? darken(pal.accent, 0.55) : '#000000'
    const gap = 78, wbar = 16
    const slideX = (t * 6) % gap, slideY = (t * 4) % gap
    ctx.save(); ctx.globalCompositeOperation = 'multiply'
    ctx.translate(W / 2, H / 2); ctx.rotate(-0.18); ctx.translate(-W / 2, -H / 2)
    // verticales
    for (let x = -gap; x < W + gap; x += gap) {
      const xx = x + slideX
      const guardX = clamp(Math.abs(xx - W / 2) / (W * 0.28), 0.25, 1)
      const a = (light ? 0.07 : 0.16) * guardX
      const g = ctx.createLinearGradient(xx, 0, xx + wbar, 0)
      g.addColorStop(0, rgba(scol, 0)); g.addColorStop(0.5, rgba(scol, a)); g.addColorStop(1, rgba(scol, 0))
      ctx.fillStyle = g; ctx.fillRect(xx, -H * 0.5, wbar, H * 2)
    }
    // horizontales
    for (let y = -gap; y < H + gap; y += gap) {
      const yy = y + slideY
      const guardY = clamp(Math.abs(yy - H * 0.47) / (H * 0.2), 0.25, 1)
      const a = (light ? 0.07 : 0.16) * guardY
      const g = ctx.createLinearGradient(0, yy, 0, yy + wbar)
      g.addColorStop(0, rgba(scol, 0)); g.addColorStop(0.5, rgba(scol, a)); g.addColorStop(1, rgba(scol, 0))
      ctx.fillStyle = g; ctx.fillRect(-W * 0.5, yy, W * 2, wbar)
    }
    ctx.restore()
  },
})

register({
  id: 'atmo.shadow.corner-drape', lib: 'atmosphere', category: 'shadow-systems', tones: ['dark', 'light'], rubros: ['*'], weight: 0.8,
  register: 'editorial', intensity: 'soft', tags: ['sombra', 'esquinas', 'profundidad', 'enmarque', 'grounding'],
  render(ctx, t, env) {
    const { pal } = env, light = pal.tone === 'light'
    // sombras de esquina (corner drape): cuatro radiales suaves en las esquinas que las hunden en penumbra ->
    // enmarcan el centro con peso, como un libro abierto. Estaticas con micro-respiracion. Sustractivo.
    const scol = light ? darken(pal.accent, 0.5) : '#000000'
    const p = 0.85 + 0.15 * breath(t, 0.4, 0.4)
    const corners = [[0, 0], [1, 0], [0, 1], [1, 1]]
    ctx.save(); if (light) mult(ctx)
    for (const [cx, cy] of corners) {
      const x = cx * W, y = cy * H
      const rad = H * 0.4 * p
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad)
      g.addColorStop(0, rgba(scol, light ? 0.12 : 0.34)); g.addColorStop(0.55, rgba(scol, light ? 0.05 : 0.14)); g.addColorStop(1, rgba(scol, 0))
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    }
    ctx.restore()
  },
})

// ════════════════════════════ SCRIM-LEGIBILITY (extra) ════════════════════════════

register({
  id: 'atmo.scrim.soft-panel', lib: 'atmosphere', category: 'scrim-legibility', tones: ['dark', 'light'], rubros: ['*'], weight: 1.0,
  register: 'neutral', intensity: 'calm', tags: ['legibilidad', 'panel', 'tarjeta', 'guard', 'universal'],
  render(ctx, t, env) {
    const { pal } = env, light = pal.tone === 'light'
    // panel SUAVE rectangular detras del bloque de texto (tarjeta sin bordes): un rectangulo de esquinas redondeadas
    // con relleno radial que oscurece (oscuro) o aclara (claro) la zona de texto y se desvanece en los bordes.
    // VIDA (minima): el centro de la tarjeta respira su fuerza HACIA ARRIBA del piso + el radio del nucleo
    // late -> el panel vive sin achicar su cobertura del bloque de texto.
    const k = 0.06 * breath(t, 0.5, 0.5)
    const rk = 1 + 0.06 * wave(t, 0.9, 0.4)
    const bx = W * 0.1, by = H * 0.33, bw = W * 0.8, bh = H * 0.3
    const cx = bx + bw / 2, cy = by + bh / 2
    const g = ctx.createRadialGradient(cx, cy, Math.min(bw, bh) * 0.1, cx, cy, Math.max(bw, bh) * 0.62 * rk)
    if (light) { g.addColorStop(0, `rgba(255,255,255,${0.4 + k})`); g.addColorStop(0.7, 'rgba(255,255,255,0.18)'); g.addColorStop(1, 'rgba(255,255,255,0)') }
    else { g.addColorStop(0, `rgba(0,0,0,${0.46 + k})`); g.addColorStop(0.7, 'rgba(0,0,0,0.2)'); g.addColorStop(1, 'rgba(0,0,0,0)') }
    ctx.save()
    // rounded-rect clip para que la placa no invada todo el cuadro
    const rr = 28
    ctx.beginPath()
    ctx.moveTo(bx + rr, by); ctx.arcTo(bx + bw, by, bx + bw, by + bh, rr); ctx.arcTo(bx + bw, by + bh, bx, by + bh, rr)
    ctx.arcTo(bx, by + bh, bx, by, rr); ctx.arcTo(bx, by, bx + bw, by, rr); ctx.closePath(); ctx.clip()
    ctx.fillStyle = g; ctx.fillRect(bx, by, bw, bh)
    ctx.restore()
  },
})

register({
  id: 'atmo.scrim.duo-thirds', lib: 'atmosphere', category: 'scrim-legibility', tones: ['dark', 'light'], rubros: ['*'], weight: 0.85,
  register: 'neutral', intensity: 'calm', tags: ['legibilidad', 'titulo', 'caption', 'doble', 'universal'],
  render(ctx, t, env) {
    const { pal } = env, light = pal.tone === 'light'
    // doble scrim (upper-third + lower-third) en una sola capa: protege titulo arriba Y caption/CTA abajo, dejando
    // un claro central. Util cuando el texto se reparte arriba y abajo. Mas suave que cada banda por separado.
    // VIDA (minima): las dos bandas respiran su alcance en contrafase, ancladas a sus bordes -> doble guard
    // vivo sin descubrir titulo ni caption.
    const tH = H * (0.3 + 0.012 * breath(t, 0.4, 0.3))
    const bH = H * (0.32 + 0.012 * breath(t, 0.4 + Math.PI, 0.3))
    if (light) {
      let g = ctx.createLinearGradient(0, 0, 0, tH)
      g.addColorStop(0, 'rgba(255,255,255,0.42)'); g.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, tH)
      g = ctx.createLinearGradient(0, H, 0, H - bH)
      g.addColorStop(0, 'rgba(255,255,255,0.46)'); g.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = g; ctx.fillRect(0, H - bH, W, bH)
    } else {
      let g = ctx.createLinearGradient(0, 0, 0, tH)
      g.addColorStop(0, 'rgba(0,0,0,0.5)'); g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, tH)
      g = ctx.createLinearGradient(0, H, 0, H - bH)
      g.addColorStop(0, 'rgba(0,0,0,0.54)'); g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g; ctx.fillRect(0, H - bH, W, bH)
    }
  },
})

// ══════════════════════════════════════════════════════════════════════════════════════
// ░░ OLA 6 ░░  mas glow · vignette · light-rays · depth-haze · lens · color-grade · shadow ·
// scrim. Mismas reglas DURAS: alpha contenido, HUECO en el centro (texto en H*0.4..0.55),
// tone-aware honesto (luz ADITIVA en oscuro / tinta SUSTRACTIVA en claro). Puro + determinista.
// ══════════════════════════════════════════════════════════════════════════════════════

// ════════════════════════════ GLOW-BLOOM (extra) ════════════════════════════

register({
  id: 'atmo.glow.streak-rays', lib: 'atmosphere', category: 'glow-bloom', tones: ['dark'], rubros: ['*'], weight: 0.75,
  register: 'editorial', intensity: 'bold', tags: ['radial', 'destello', 'luz', 'estrella'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'streak')
    // estrellado de rayos FINOS que irradian desde un foco alto-lateral (no el centro): muchas vetas de luz delgadas
    // y largas a distintos angulos que titilan en fase propia -> brillo de fuente puntual. Aditivo. Largo desigual.
    const fx = W * (0.2 + r() * 0.6), fy = -H * 0.04
    const N = 16
    ctx.save(); add(ctx); ctx.translate(fx, fy)
    for (let i = 0; i < N; i++) {
      const ang = Math.PI * 0.18 + (i / (N - 1)) * Math.PI * 0.64 + Math.sin(t * CLK * 0.1 + i) * 0.01
      const len = H * (0.55 + r() * 0.6)
      const a = (0.035 + 0.04 * breath(t, i * 0.7, 0.7 + r() * 0.4)) * (0.7 + 0.3 * (i % 2))
      const col = i % 3 === 0 ? pal.accent2 : pal.accent
      ctx.save(); ctx.rotate(ang)
      const g = ctx.createLinearGradient(0, 0, len, 0)
      g.addColorStop(0, rgba(col, a)); g.addColorStop(0.6, rgba(col, a * 0.3)); g.addColorStop(1, rgba(col, 0))
      ctx.fillStyle = g
      ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(0, 2); ctx.lineTo(len, 6); ctx.lineTo(len, -6); ctx.closePath(); ctx.fill()
      ctx.restore()
    }
    ctx.restore()
  },
})

register({
  id: 'atmo.glow.twin-suns', lib: 'atmosphere', category: 'glow-bloom', tones: ['dark'], rubros: ['*'], weight: 0.8,
  register: 'editorial', intensity: 'medium', tags: ['simetria', 'soles', 'luz', 'enmarque'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'twin')
    // dos "soles" suaves simetricos en las esquinas superiores que respiran en contrafase -> un enmarque luminoso
    // arriba que deja el centro/abajo en sombra (guia el ojo al texto). Acento izq, acento2 der. Aditivo.
    const ph0 = r() * TAU
    const suns = [{ x: 0.14, y: 0.12, c: pal.accent, ph: ph0 }, { x: 0.86, y: 0.12, c: pal.accent2, ph: ph0 + Math.PI }]
    ctx.save(); add(ctx)
    for (const s of suns) {
      const br = 0.09 + 0.04 * breath(t, s.ph, 0.55)
      const cx = s.x * W, cy = s.y * H
      const rad = H * (0.34 + 0.03 * breath(t, s.ph, 0.5))
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad)
      g.addColorStop(0, rgba(s.c, br)); g.addColorStop(0.45, rgba(s.c, br * 0.4)); g.addColorStop(1, rgba(s.c, 0))
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H * 0.6)
    }
    ctx.restore()
  },
})

// ════════════════════════════ VIGNETTE (extra) ════════════════════════════

register({
  id: 'atmo.vignette.soft-feather', lib: 'atmosphere', category: 'vignette', tones: ['dark', 'light'], rubros: ['*'], weight: 1.1,
  register: 'neutral', intensity: 'calm', tags: ['suave', 'plumeado', 'foco', 'universal', 'sutil'],
  render(ctx, t, env) {
    const { pal } = env, light = pal.tone === 'light'
    // vineta MUY plumeada (feathered): caida larguisima y gradual del centro al borde, sin un anillo marcado ->
    // oscurece/aclara apenas el perimetro para dar cuerpo sin que se note el efecto. La mas discreta del set.
    // VIDA (minima): el radio limpio interior respira (iris suavisimo) -> la vineta mas discreta igual vive.
    const inner = H * (0.12 + 0.025 * breath(t, 0.3, 0.45))
    const g = ctx.createRadialGradient(W / 2, H * 0.47, inner, W / 2, H * 0.5, H * 0.95)
    g.addColorStop(0, 'rgba(0,0,0,0)')
    g.addColorStop(0.55, light ? 'rgba(0,0,0,0.01)' : 'rgba(0,0,0,0.08)')
    g.addColorStop(0.85, light ? 'rgba(30,22,16,0.05)' : 'rgba(0,0,0,0.28)')
    g.addColorStop(1, light ? 'rgba(30,22,16,0.1)' : 'rgba(0,0,0,0.46)')
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
  },
})

register({
  id: 'atmo.vignette.bottom-weight', lib: 'atmosphere', category: 'vignette', tones: ['dark', 'light'], rubros: ['*'], weight: 0.9,
  register: 'editorial', intensity: 'soft', tags: ['inferior', 'peso', 'grounding', 'editorial'],
  render(ctx, t, env) {
    const { pal } = env, light = pal.tone === 'light'
    // vineta ASIMETRICA pesada abajo: la penumbra se concentra en la mitad inferior (centro de gravedad bajo, tipo
    // poster) y se aligera arriba -> ancla el contenido y deja respirar el cielo. Radial descentrado hacia abajo.
    // VIDA (minima): el centro de gravedad bajo oscila apenas en vertical -> el peso inferior respira.
    const cy = H * (0.72 + 0.01 * breath(t, 0.5, 0.28))
    const g = ctx.createRadialGradient(W / 2, H * 0.4, H * 0.22, W / 2, cy, H * 0.95)
    g.addColorStop(0, 'rgba(0,0,0,0)')
    g.addColorStop(0.6, light ? 'rgba(0,0,0,0.02)' : 'rgba(0,0,0,0.2)')
    g.addColorStop(1, light ? 'rgba(30,22,16,0.12)' : 'rgba(0,0,0,0.62)')
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
  },
})

// ════════════════════════════ LIGHT-RAYS (extra) ════════════════════════════

register({
  id: 'atmo.rays.cathedral', lib: 'atmosphere', category: 'light-rays', tones: ['dark'], rubros: ['*'], weight: 0.78,
  register: 'editorial', intensity: 'medium', tags: ['catedral', 'vertical', 'volumetrico', 'solemne'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'cathedral')
    // haces de "ventanal de catedral": columnas verticales anchas de luz que bajan rectas desde el techo, separadas
    // como vitrales, atenuandose antes de la franja de texto (guard). Solemne, aditivo. Cada columna respira aparte.
    const cols = 5
    ctx.save(); add(ctx)
    for (let i = 0; i < cols; i++) {
      const cx = (0.5 / cols + i / cols) * W + Math.sin(t * CLK * 0.1 + i) * 3
      const wsh = W / cols * (0.45 + r() * 0.2)
      const a0 = 0.05 + 0.035 * breath(t, i * 1.4, 0.45)
      const col = i % 2 ? pal.accent2 : pal.accent
      const g = ctx.createLinearGradient(0, 0, 0, H * 0.95)
      g.addColorStop(0, rgba(col, a0))
      g.addColorStop(0.42, rgba(col, a0 * 0.5))
      g.addColorStop(0.62, rgba(col, a0 * 0.12))   // se apaga al acercarse al texto
      g.addColorStop(1, rgba(col, 0))
      ctx.fillStyle = g; ctx.fillRect(cx - wsh / 2, 0, wsh, H * 0.95)
    }
    ctx.restore()
  },
})

register({
  id: 'atmo.rays.lighthouse', lib: 'atmosphere', category: 'light-rays', tones: ['dark'], rubros: ['*'], weight: 0.65,
  register: 'editorial', intensity: 'medium', tags: ['faro', 'barrido', 'haz', 'cinematico'],
  render(ctx, t, env) {
    const { pal } = env
    // haz de FARO: un cono ancho de luz que barre lento en pendulo desde un foco alto-derecha hacia el cielo, como
    // un reflector. El cono no apunta al centro de texto (oscila por el cuadrante superior). Aditivo, nucleo blanco.
    const fx = W * 0.92, fy = H * 0.08
    const swing = Math.sin(t * CLK * 0.14) * 0.5
    const ang = Math.PI * 0.78 + swing   // apunta hacia arriba-izquierda, oscilando
    const len = H * 1.2, half = 0.16
    const a = 0.07 + 0.025 * breath(t, 0.3, 0.5)
    ctx.save(); add(ctx); ctx.translate(fx, fy); ctx.rotate(ang)
    const g = ctx.createLinearGradient(0, 0, len, 0)
    g.addColorStop(0, rgba('#ffffff', a)); g.addColorStop(0.35, rgba(pal.accent, a * 0.6)); g.addColorStop(1, rgba(pal.accent, 0))
    ctx.fillStyle = g
    ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(0, 8); ctx.lineTo(len, len * half); ctx.lineTo(len, -len * half); ctx.closePath(); ctx.fill()
    ctx.restore()
  },
})

// ════════════════════════════ DEPTH-HAZE (extra) ════════════════════════════

register({
  id: 'atmo.haze.steam-rise', lib: 'atmosphere', category: 'depth-haze', tones: ['dark', 'light'], rubros: ['*'], weight: 0.75,
  register: 'friendly', intensity: 'soft', tags: ['vapor', 'columnas', 'niebla', 'organico'],
  render(ctx, t, env) {
    const { pal } = env, light = pal.tone === 'light', r = seedFor(env.seed, 'steam')
    // columnas de VAPOR que ascienden ondulando desde el borde inferior (cafe/calle mojada): bocanadas verticales
    // suaves que se disuelven antes del centro. En oscuro screen (bruma luminosa), en claro multiply tenue de blanco.
    const fog = light ? '#ffffff' : lighten(pal.bg1, 0.5)
    const N = 4
    ctx.save(); if (!light) screen(ctx)
    for (let i = 0; i < N; i++) {
      const ph = r() * TAU
      const baseX = (0.14 + (i / (N - 1)) * 0.72) * W
      const sway = Math.sin(t * CLK * 0.5 + ph) * 16
      const cx = baseX + sway
      // tres bocanadas apiladas que suben con t
      for (let k = 0; k < 3; k++) {
        const rise = (k * 0.18 + (t * 0.04 * (0.6 + r() * 0.5))) % 0.62
        const cy = H * (1.0 - rise)
        const rad = (40 + r() * 36) * (1 - rise * 0.5)
        const a = (light ? 0.1 : 0.06) * (1 - rise / 0.62) * (0.6 + 0.4 * breath(t, ph + k, 0.5))
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad)
        g.addColorStop(0, rgba(fog, a)); g.addColorStop(0.6, rgba(fog, a * 0.4)); g.addColorStop(1, rgba(fog, 0))
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rad, 0, TAU); ctx.fill()
      }
    }
    ctx.restore()
  },
})

register({
  id: 'atmo.haze.smoke-curl', lib: 'atmosphere', category: 'depth-haze', tones: ['dark'], rubros: ['*'], weight: 0.7,
  register: 'editorial', intensity: 'medium', tags: ['humo', 'rizos', 'organico', 'ambiente', 'misterio'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'smoke')
    // rizos de HUMO a la deriva por los bordes laterales: trazos curvos translucidos (lineas anchas con quadratic)
    // que se enroscan suave -> humo ambiente de mood/misterio. Lejos del centro (guard). Aditivo, tono frio bajo.
    const N = 7
    ctx.save(); add(ctx)
    for (let i = 0; i < N; i++) {
      const ph = r() * TAU
      const side = r() < 0.5 ? 0.16 : 0.84
      const bx = side * W + Math.sin(t * CLK * 0.3 + ph) * 18
      const by = ((r() * H) - t * 5 * (0.4 + r() * 0.5)) % (H + 120)
      const yy = by < 0 ? by + H + 120 : by
      const guard = clamp(Math.abs((yy - H * 0.47) / (H * 0.24)), 0.14, 1)
      const len = 40 + r() * 70
      const curl = (r() < 0.5 ? -1 : 1) * (30 + r() * 40)
      const a = (0.04 + 0.04 * r()) * guard * (0.6 + 0.4 * breath(t, ph, 0.5))
      const col = i % 2 ? pal.accent2 : pal.accent
      ctx.strokeStyle = rgba(col, a); ctx.lineWidth = 8 + r() * 14; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(bx, yy + len)
      ctx.quadraticCurveTo(bx + curl, yy + len * 0.4, bx, yy)
      ctx.quadraticCurveTo(bx - curl, yy - len * 0.4, bx, yy - len)
      ctx.stroke()
    }
    ctx.restore()
  },
})

// ════════════════════════════ LENS-FX (extra) ════════════════════════════

register({
  id: 'atmo.lens.veiling-glare', lib: 'atmosphere', category: 'lens-fx', tones: ['dark'], rubros: ['*'], weight: 0.7,
  register: 'editorial', intensity: 'soft', tags: ['veiling', 'glare', 'lavado', 'suave', 'cinematico'],
  render(ctx, t, env) {
    const { pal } = env
    // "veiling glare": el velo de luz difusa que una fuente brillante derrama sobre TODO el cuadro (baja el contraste
    // global, lava las sombras). Lo emulamos con un wash radial calido amplio desde una esquina, alpha bajo, screen.
    const fx = W * 0.8, fy = H * 0.18
    const a = 0.08 + 0.025 * breath(t, 0.5, 0.5)
    ctx.save(); ctx.globalCompositeOperation = 'screen'
    const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, H * 1.0)
    g.addColorStop(0, rgba('#ffffff', a)); g.addColorStop(0.4, rgba(pal.accent, a * 0.5)); g.addColorStop(1, rgba(pal.accent, 0))
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    ctx.restore()
  },
})

register({
  id: 'atmo.lens.prism-split', lib: 'atmosphere', category: 'lens-fx', tones: ['dark'], rubros: ['*'], weight: 0.6,
  register: 'playful', intensity: 'medium', tags: ['prisma', 'arcoiris', 'dispersion', 'borde', 'lente'],
  render(ctx, t, env) {
    const r = seedFor(env.seed, 'prism')
    // dispersion prismatica: un abanico CORTO de franjas arcoiris en una esquina (como la luz partida por el borde
    // de un lente). Hues recorridos a mano (honestidad del efecto). Aditivo, baja opacidad, lejos del centro.
    const fx = W * (r() < 0.5 ? 0.1 : 0.9), fy = H * 0.86
    const dir = fx < W / 2 ? 1 : -1
    const N = 7
    const a = 0.07 + 0.025 * pulse(t, 0.4, 0.5)
    // el abanico se abre/cierra apenas (dispersion respirando) y cada franja titila en fase propia -> prisma vivo.
    const spread = 1 + 0.08 * wave(t, 0.6, 0.22)
    ctx.save(); add(ctx); ctx.translate(fx, fy)
    for (let i = 0; i < N; i++) {
      const hue = 360 * (i / N)
      const col = hslToHex(hue, 0.85, 0.6)
      const ang = dir * (-Math.PI * 0.45 + (i / (N - 1)) * Math.PI * 0.32 * spread)
      const len = H * 0.42 * (1 + 0.04 * wave(t, i * 0.8, 0.3))
      ctx.save(); ctx.rotate(ang)
      const g = ctx.createLinearGradient(0, 0, len, 0)
      g.addColorStop(0, rgba(col, a)); g.addColorStop(0.7, rgba(col, a * 0.3)); g.addColorStop(1, rgba(col, 0))
      ctx.fillStyle = g
      ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(0, 3); ctx.lineTo(len, 10); ctx.lineTo(len, -10); ctx.closePath(); ctx.fill()
      ctx.restore()
    }
    ctx.restore()
  },
})

// ════════════════════════════ COLOR-GRADE (extra) ════════════════════════════

register({
  id: 'atmo.grade.faded-film', lib: 'atmosphere', category: 'color-grade', tones: ['dark', 'light'], rubros: ['*'], weight: 0.8,
  register: 'editorial', intensity: 'soft', tags: ['faded', 'analogico', 'matte', 'vintage', 'sombras-levantadas'],
  render(ctx, t, env) {
    const { pal } = env, light = pal.tone === 'light'
    // look "faded film" (matte): SUBE las sombras (negros lavados) con un velo gris-verdoso suave -> ese aire vintage
    // de pelicula vieja. En oscuro un screen tenue levanta los negros; en claro un multiply muy leve apaga las luces.
    const tintHsl = hexToHsl(pal.accent)
    // VIDA: el velo matte respira su densidad (pulse) -> el aire vintage palpita levisimo, como film viejo.
    const k = 0.88 + 0.24 * pulse(t, 0.5, 0.3)
    if (light) {
      ctx.save(); ctx.globalCompositeOperation = 'multiply'
      const matte = hslToHex(tintHsl.h, 0.08, 0.82)
      const g = ctx.createLinearGradient(0, 0, 0, H)
      g.addColorStop(0, rgba(matte, 0.1 * k)); g.addColorStop(0.5, rgba(matte, 0.04)); g.addColorStop(1, rgba(matte, 0.1 * k))
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore()
    } else {
      ctx.save(); ctx.globalCompositeOperation = 'screen'
      const lift = hslToHex((tintHsl.h + 40) % 360, 0.25, 0.3)   // velo verde-oliva tenue
      const g = ctx.createLinearGradient(0, 0, 0, H)
      g.addColorStop(0, rgba(lift, 0.1 * k)); g.addColorStop(0.5, rgba(lift, 0.05)); g.addColorStop(1, rgba(lift, 0.12 * k))
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore()
    }
  },
})

register({
  id: 'atmo.grade.neon-night', lib: 'atmosphere', category: 'color-grade', tones: ['dark'], rubros: ['*'], weight: 0.72,
  register: 'playful', intensity: 'loud', tags: ['neon', 'cyber', 'magenta', 'cian', 'nocturno', 'urbano'],
  render(ctx, t, env) {
    const { pal } = env
    // grade "neon night" (cyberpunk): magenta caliente arriba, cian frio abajo, en diagonal -> mood urbano nocturno.
    // Hue FIJOS (honestidad del look). Centro neutro (hueco). Solo oscuro: la luz neon necesita fondo profundo.
    const magenta = hslToHex(312, 0.8, 0.55)
    const cyan = hslToHex(186, 0.85, 0.55)
    // VIDA: el neon magenta y cian laten en contrafase (parpadeo de letrero) + el eje de la diagonal deriva
    // apenas -> noche urbana viva, centro neutro intacto.
    const m = 0.2 * (0.78 + 0.44 * pulse(t, 0.2, 0.5))
    const c = 0.18 * (0.78 + 0.44 * pulse(t, 0.2 + Math.PI, 0.5))
    const ex = W * 0.4 + wave(t, 0.7, 0.22) * 18
    ctx.save(); ctx.globalCompositeOperation = 'soft-light'
    const g = ctx.createLinearGradient(0, 0, ex, H)
    g.addColorStop(0, rgba(magenta, m))
    g.addColorStop(0.44, 'rgba(128,128,128,0)')
    g.addColorStop(0.56, 'rgba(128,128,128,0)')
    g.addColorStop(1, rgba(cyan, c))
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    ctx.restore()
  },
})

// ════════════════════════════ SHADOW-SYSTEMS (extra) ════════════════════════════

register({
  id: 'atmo.shadow.venetian-soft', lib: 'atmosphere', category: 'shadow-systems', tones: ['dark', 'light'], rubros: ['*'], weight: 0.78,
  register: 'editorial', intensity: 'soft', tags: ['sombra', 'persiana', 'vertical', 'gobo', 'estatico'],
  render(ctx, t, env) {
    const { pal } = env, light = pal.tone === 'light'
    // persiana VERTICAL (venetian) suave y casi estatica: franjas verticales de sombra inclinadas levemente, con
    // micro-deriva. Distinta de blinds-gobo (horizontal, deslizante): esta da un patron de cortina vertical estable.
    const scol = light ? darken(pal.accent2, 0.5) : '#000000'
    const gap = 56, wband = 26
    const slide = Math.sin(t * CLK * 0.2) * 6
    ctx.save(); ctx.globalCompositeOperation = 'multiply'
    ctx.translate(W / 2, H / 2); ctx.rotate(0.06); ctx.translate(-W / 2, -H / 2)
    for (let x = -gap; x < W + gap; x += gap) {
      const xx = x + slide
      const screenX = (xx - W / 2) * Math.cos(0.06) + W / 2
      const guard = clamp(Math.abs(screenX - W / 2) / (W * 0.3), 0.22, 1)
      const a = (light ? 0.08 : 0.18) * guard
      const g = ctx.createLinearGradient(xx, 0, xx + wband, 0)
      g.addColorStop(0, rgba(scol, 0)); g.addColorStop(0.5, rgba(scol, a)); g.addColorStop(1, rgba(scol, 0))
      ctx.fillStyle = g; ctx.fillRect(xx, -H * 0.5, wband, H * 2)
    }
    ctx.restore()
  },
})

register({
  id: 'atmo.shadow.archway-cast', lib: 'atmosphere', category: 'shadow-systems', tones: ['dark', 'light'], rubros: ['*'], weight: 0.75,
  register: 'corporate', intensity: 'medium', tags: ['sombra', 'arco', 'arquitectura', 'enmarque', 'top'],
  render(ctx, t, env) {
    const { pal } = env, light = pal.tone === 'light'
    // sombra de ARCO (archway): dos cunas curvas oscuras en las esquinas SUPERIORES que sugieren un arco/portico
    // enmarcando la escena desde arriba -> mood arquitectonico y profundidad. No toca el centro. Sustractivo.
    const scol = light ? darken(pal.accent, 0.5) : '#000000'
    const a = (light ? 0.1 : 0.32) * (0.9 + 0.1 * breath(t, 0.3, 0.35))
    ctx.save(); if (light) mult(ctx)
    for (const sx of [0, 1]) {
      const ox = sx * W
      // radial en la esquina superior, recortado por un arco -> deja una "boveda" clara en el centro-alto
      const g = ctx.createRadialGradient(ox, -H * 0.05, H * 0.05, ox, -H * 0.05, H * 0.5)
      g.addColorStop(0, rgba(scol, a)); g.addColorStop(0.6, rgba(scol, a * 0.45)); g.addColorStop(1, rgba(scol, 0))
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H * 0.5)
    }
    ctx.restore()
  },
})

// ════════════════════════════ SCRIM-LEGIBILITY (extra) ════════════════════════════

register({
  id: 'atmo.scrim.radial-guard', lib: 'atmosphere', category: 'scrim-legibility', tones: ['dark', 'light'], rubros: ['*'], weight: 1.05,
  register: 'neutral', intensity: 'calm', tags: ['legibilidad', 'guard', 'radial', 'amplio', 'universal'],
  render(ctx, t, env) {
    const { pal } = env, light = pal.tone === 'light'
    // guard radial AMPLIO y suave centrado en el bloque de texto: mas extendido que center-plate (cubre mejor titulos
    // largos a varias lineas) y con caida muy gradual -> contraste asegurado sin un borde visible. El workhorse.
    // VIDA (minima): el nucleo del guard respira su fuerza solo HACIA ARRIBA del piso base -> vive sin perder
    // contraste. El workhorse se queda quieto en cobertura, vivo en intensidad.
    const k = 0.05 * breath(t, 0.3, 0.33)
    const cx = W / 2, cy = H * 0.47
    const g = ctx.createRadialGradient(cx, cy, H * 0.02, cx, cy, H * 0.5)
    if (light) { g.addColorStop(0, `rgba(255,255,255,${0.3 + k})`); g.addColorStop(0.45, 'rgba(255,255,255,0.18)'); g.addColorStop(0.8, 'rgba(255,255,255,0.05)'); g.addColorStop(1, 'rgba(255,255,255,0)') }
    else { g.addColorStop(0, `rgba(0,0,0,${0.36 + k})`); g.addColorStop(0.45, 'rgba(0,0,0,0.22)'); g.addColorStop(0.8, 'rgba(0,0,0,0.07)'); g.addColorStop(1, 'rgba(0,0,0,0)') }
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
  },
})

register({
  id: 'atmo.scrim.corner-anchor', lib: 'atmosphere', category: 'scrim-legibility', tones: ['dark', 'light'], rubros: ['*'], weight: 0.78,
  register: 'editorial', intensity: 'soft', tags: ['legibilidad', 'esquina', 'L', 'lower-left', 'editorial'],
  render(ctx, t, env) {
    const { pal } = env, light = pal.tone === 'light'
    // scrim en forma de L anclado en la esquina INFERIOR-IZQUIERDA: combina una banda inferior + una lateral
    // izquierda -> asegura contraste para un titulo/kicker alineado a esa esquina (look editorial). Centro libre.
    // VIDA (minima): banda inferior y lateral respiran su alcance en contrafase, ancladas a la esquina ->
    // la L editorial vive sin perder contraste.
    const top = H * (0.62 - 0.012 * breath(t, 0.5, 0.3))
    const lw = W * (0.4 + 0.02 * breath(t, 0.5 + Math.PI, 0.3))
    ctx.save()
    // banda inferior
    let g = ctx.createLinearGradient(0, H, 0, top)
    if (light) { g.addColorStop(0, 'rgba(255,255,255,0.46)'); g.addColorStop(1, 'rgba(255,255,255,0)') }
    else { g.addColorStop(0, 'rgba(0,0,0,0.52)'); g.addColorStop(1, 'rgba(0,0,0,0)') }
    ctx.fillStyle = g; ctx.fillRect(0, top, W, H - top)
    // banda lateral izquierda (se suma a la de abajo para reforzar la esquina)
    g = ctx.createLinearGradient(0, 0, lw, 0)
    if (light) { g.addColorStop(0, 'rgba(255,255,255,0.3)'); g.addColorStop(1, 'rgba(255,255,255,0)') }
    else { g.addColorStop(0, 'rgba(0,0,0,0.36)'); g.addColorStop(1, 'rgba(0,0,0,0)') }
    ctx.fillStyle = g; ctx.fillRect(0, H * 0.5, lw, H * 0.5)
    ctx.restore()
  },
})
