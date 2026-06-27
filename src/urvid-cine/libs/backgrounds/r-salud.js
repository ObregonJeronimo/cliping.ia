// urvid 1.0 · BACKGROUNDS rubro SALUD — fondos full-canvas serenos para clinicas, consultorios, bienestar, farmacia.
// Vibe: limpio, calmo, gradientes suaves, curvas organicas, cruz/plus muy sutil, aire, celeste/verde-menta.
// Contrato identico a index.js: render(ctx, t, env). PURO + DETERMINISTA (mulberry32/seedFor para layout, t para vida).
// Consume env.pal (bg0/bg1 = base por tono; accent/accent2 = detalle). Centro SIEMPRE suave (no mata el contraste del texto).
// Archivo PROPIO (un agente, un archivo) -> no se pisa con index.js. El orquestador agrega el import despues.
import { register } from '../../core/registry.js'
import { mulberry32, range, seedFor } from '../../core/prng.js'
import { W, H, TAU, rgba, lighten, darken, clamp, lerp, hexToHsl, hslToHex } from '../../core/util.js'

const CLK = 0.6   // reloj base (mismo ritmo lento que el resto de la biblioteca)

// ---- helpers locales (self-contained: no se importan de index.js) ----
// rampa vertical bg0 -> bg1 (base limpia por tono)
function rampBg(ctx, pal) {
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, pal.bg0); g.addColorStop(1, pal.bg1)
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
}
// scrim de legibilidad: aclara/oscurece bordes dejando el centro limpio para el texto
function scrim(ctx, pal, { centerClear = 0.34, strength = null } = {}) {
  const s = strength == null ? (pal.tone === 'light' ? 0.2 : 0.4) : strength
  const v = ctx.createRadialGradient(W / 2, H * 0.46, H * centerClear, W / 2, H * 0.5, H * 0.84)
  v.addColorStop(0, 'rgba(0,0,0,0)')
  v.addColorStop(1, pal.tone === 'light' ? `rgba(255,255,255,${s})` : `rgba(0,0,0,${s})`)
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H)
}
// dibuja un simbolo plus (cruz medica) con esquinas redondeadas, centrado en (x,y), brazo de largo arm y grosor th
function plusPath(ctx, x, y, arm, th) {
  const h = th / 2
  ctx.beginPath()
  ctx.moveTo(x - h, y - arm); ctx.lineTo(x + h, y - arm); ctx.lineTo(x + h, y - h)
  ctx.lineTo(x + arm, y - h); ctx.lineTo(x + arm, y + h); ctx.lineTo(x + h, y + h)
  ctx.lineTo(x + h, y + arm); ctx.lineTo(x - h, y + arm); ctx.lineTo(x - h, y + h)
  ctx.lineTo(x - arm, y + h); ctx.lineTo(x - arm, y - h); ctx.lineTo(x - h, y - h)
  ctx.closePath()
}
// tinte sereno derivado de un rol: en salud preferimos celeste/menta -> empuja el hue del accent hacia el rango frio-verde
function calmTint(hex, tone, toward = 175) {
  const a = hexToHsl(hex)
  // mezcla suave del hue hacia el verde-menta/celeste, baja saturacion (sereno)
  const h = a.h + (((((toward - a.h) % 360) + 540) % 360) - 180) * 0.32
  const s = clamp(a.s * 0.78, 0.18, 0.6)
  const l = tone === 'light' ? clamp(a.l + 0.12, 0.5, 0.82) : clamp(a.l, 0.34, 0.62)
  return hslToHex(h, s, l)
}

// ============================================================================
// gradient-fields — gradientes suaves, brumas, auras serenas
// ============================================================================

register({
  id: 'bg.salud.calmwash', lib: 'backgrounds', category: 'gradient-fields', tones: ['dark', 'light'], rubros: ['salud', 'default'], weight: 1.05,
  register: 'friendly', intensity: 'calm', tags: ['salud', 'calmo', 'gradiente', 'sereno', 'aire'],
  render(ctx, t, env) {
    const { pal } = env
    rampBg(ctx, pal)
    const c1 = calmTint(pal.accent, pal.tone, 185), c2 = calmTint(pal.accent2, pal.tone, 150)
    // dos auras frias muy suaves arriba (deja respirar el centro-bajo donde va el texto)
    ctx.save(); ctx.globalCompositeOperation = pal.tone === 'light' ? 'multiply' : 'lighter'
    const by = H * 0.26 + Math.sin(t * CLK * 0.3) * 14
    const g1 = ctx.createRadialGradient(W * 0.32, by, 0, W * 0.32, by, H * 0.52)
    g1.addColorStop(0, rgba(c1, pal.tone === 'light' ? 0.16 : 0.2)); g1.addColorStop(1, rgba(c1, 0))
    ctx.fillStyle = g1; ctx.fillRect(0, 0, W, H)
    const g2 = ctx.createRadialGradient(W * 0.74, by * 0.85, 0, W * 0.74, by * 0.85, H * 0.48)
    g2.addColorStop(0, rgba(c2, pal.tone === 'light' ? 0.13 : 0.16)); g2.addColorStop(1, rgba(c2, 0))
    ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H)
    ctx.restore()
    scrim(ctx, pal, { centerClear: 0.4, strength: pal.tone === 'light' ? 0.1 : 0.26 })
  },
})

register({
  id: 'bg.salud.mintdawn', lib: 'backgrounds', category: 'gradient-fields', tones: ['dark', 'light'], rubros: ['salud', 'default'], weight: 1,
  register: 'editorial', intensity: 'calm', tags: ['salud', 'menta', 'amanecer', 'gradiente', 'limpio'],
  render(ctx, t, env) {
    const { pal } = env
    // amanecer vertical sereno: base del tono arriba, velo menta abajo
    const mint = calmTint(pal.accent2, pal.tone, 158)
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, pal.bg0)
    g.addColorStop(0.55, pal.tone === 'light' ? lighten(mint, 0.4) : pal.bg1)
    g.addColorStop(1, pal.tone === 'light' ? lighten(mint, 0.18) : darken(mint, 0.55))
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    // banda de luz horizontal que sube/baja apenas (respiracion)
    const ly = H * (0.6 + 0.04 * Math.sin(t * CLK * 0.35))
    ctx.save(); ctx.globalCompositeOperation = pal.tone === 'light' ? 'soft-light' : 'screen'
    const lg = ctx.createLinearGradient(0, ly - 120, 0, ly + 120)
    lg.addColorStop(0, rgba('#ffffff', 0)); lg.addColorStop(0.5, rgba('#ffffff', pal.tone === 'light' ? 0.4 : 0.08)); lg.addColorStop(1, rgba('#ffffff', 0))
    ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H)
    ctx.restore()
    scrim(ctx, pal, { centerClear: 0.42, strength: pal.tone === 'light' ? 0.08 : 0.22 })
  },
})

register({
  id: 'bg.salud.breathorbs', lib: 'backgrounds', category: 'gradient-fields', tones: ['dark', 'light'], rubros: ['salud', 'default'], weight: 0.95,
  register: 'friendly', intensity: 'soft', tags: ['salud', 'respiracion', 'orbes', 'bienestar', 'calmo'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'breath')
    rampBg(ctx, pal)
    // 5 orbes que respiran muy lento (escala) -> sensacion de calma/respiracion; tonos frios
    ctx.save(); ctx.globalCompositeOperation = pal.tone === 'light' ? 'multiply' : 'lighter'
    for (let i = 0; i < 5; i++) {
      const ph = r() * TAU
      const ox = W * (0.18 + r() * 0.64), oy = H * (0.12 + r() * 0.5)
      const breathe = 0.5 + 0.5 * Math.sin(t * CLK * 0.28 + ph)
      const rad = H * (0.16 + r() * 0.12) * (0.9 + breathe * 0.16)
      const col = calmTint(i % 2 ? pal.accent2 : pal.accent, pal.tone, i % 2 ? 150 : 190)
      const gr = ctx.createRadialGradient(ox, oy, 0, ox, oy, rad)
      gr.addColorStop(0, rgba(col, (pal.tone === 'light' ? 0.1 : 0.14) * (0.7 + breathe * 0.3)))
      gr.addColorStop(1, rgba(col, 0))
      ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H)
    }
    ctx.restore()
    scrim(ctx, pal, { centerClear: 0.4, strength: pal.tone === 'light' ? 0.12 : 0.3 })
  },
})

// ============================================================================
// atmospheric-organic — brumas / ondas / pulso
// ============================================================================

register({
  id: 'bg.salud.softmist', lib: 'backgrounds', category: 'atmospheric-organic', tones: ['dark', 'light'], rubros: ['salud', 'default'], weight: 0.95,
  register: 'editorial', intensity: 'calm', tags: ['salud', 'niebla', 'capas', 'sereno', 'aire'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'mist')
    rampBg(ctx, pal)
    // capas de bruma horizontal que derivan lento (limpio, hospitalario)
    ctx.save(); ctx.globalCompositeOperation = pal.tone === 'light' ? 'screen' : 'lighter'
    const layers = 4
    for (let i = 0; i < layers; i++) {
      const ph = r() * TAU
      const cy = H * (0.18 + i * 0.2) + Math.sin(t * CLK * 0.22 + ph) * 12
      const col = i % 2 ? calmTint(pal.accent2, pal.tone, 155) : calmTint(pal.accent, pal.tone, 195)
      const g = ctx.createLinearGradient(0, cy - 90, 0, cy + 90)
      const a = pal.tone === 'light' ? 0.1 : 0.08
      g.addColorStop(0, rgba(col, 0)); g.addColorStop(0.5, rgba(col, a)); g.addColorStop(1, rgba(col, 0))
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    }
    ctx.restore()
    scrim(ctx, pal, { centerClear: 0.44, strength: pal.tone === 'light' ? 0.1 : 0.26 })
  },
})

register({
  id: 'bg.salud.pulsewave', lib: 'backgrounds', category: 'atmospheric-organic', tones: ['dark', 'light'], rubros: ['salud', 'default'], weight: 0.9,
  register: 'corporate', intensity: 'soft', tags: ['salud', 'pulso', 'ecg', 'onda', 'vital'],
  render(ctx, t, env) {
    const { pal } = env
    rampBg(ctx, pal)
    // linea de pulso (ECG) muy sutil, abajo del centro, recorriendo de izq a der
    const baseY = H * 0.72
    const col = calmTint(pal.accent, pal.tone, 185)
    const phase = (t * CLK * 0.5) % 1
    ctx.save()
    ctx.lineWidth = pal.tone === 'light' ? 2 : 2.2
    ctx.lineJoin = 'round'; ctx.lineCap = 'round'
    ctx.strokeStyle = rgba(col, pal.tone === 'light' ? 0.4 : 0.5)
    ctx.beginPath()
    for (let x = 0; x <= W; x += 4) {
      const u = x / W
      // base plana + un latido gaussiano que se desplaza
      const d = ((u - phase) % 1 + 1) % 1
      let beat = 0
      const k = d - 0.5
      beat = Math.exp(-Math.pow(k * 14, 2)) * 36 - Math.exp(-Math.pow((k - 0.04) * 26, 2)) * 16
      const y = baseY - beat
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
    }
    ctx.stroke()
    // glow tenue bajo la linea
    ctx.globalCompositeOperation = pal.tone === 'light' ? 'multiply' : 'lighter'
    const gx = lerp(0, W, phase)
    const gl = ctx.createRadialGradient(gx, baseY, 0, gx, baseY, 120)
    gl.addColorStop(0, rgba(col, pal.tone === 'light' ? 0.1 : 0.2)); gl.addColorStop(1, rgba(col, 0))
    ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H)
    ctx.restore()
    scrim(ctx, pal, { centerClear: 0.42, strength: pal.tone === 'light' ? 0.08 : 0.22 })
  },
})

register({
  id: 'bg.salud.ripplecalm', lib: 'backgrounds', category: 'atmospheric-organic', tones: ['dark', 'light'], rubros: ['salud', 'default'], weight: 0.88,
  register: 'friendly', intensity: 'calm', tags: ['salud', 'ondas', 'agua', 'concentrico', 'sereno'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'ripple')
    rampBg(ctx, pal)
    // ondas concentricas que se expanden desde un punto sembrado arriba (agua serena)
    const cx = W * (0.36 + r() * 0.28), cy = H * (0.22 + r() * 0.12)
    const col = calmTint(pal.accent, pal.tone, 192)
    ctx.save()
    ctx.lineWidth = 1.4
    const N = 7
    for (let i = 0; i < N; i++) {
      // cada anillo crece y se desvanece (fase escalonada) -> expansion continua
      const ph = (t * CLK * 0.18 + i / N) % 1
      const rad = H * (0.06 + ph * 0.7)
      const a = (1 - ph) * (pal.tone === 'light' ? 0.16 : 0.18)
      ctx.strokeStyle = rgba(i % 2 ? calmTint(pal.accent2, pal.tone, 156) : col, a)
      ctx.beginPath(); ctx.arc(cx, cy, rad, 0, TAU); ctx.stroke()
    }
    ctx.restore()
    scrim(ctx, pal, { centerClear: 0.44, strength: pal.tone === 'light' ? 0.1 : 0.26 })
  },
})

// ============================================================================
// geometric-graphic — grillas suaves, cruces, paneles limpios
// ============================================================================

register({
  id: 'bg.salud.plusgrid', lib: 'backgrounds', category: 'geometric-graphic', tones: ['dark', 'light'], rubros: ['salud', 'default'], weight: 0.92,
  register: 'corporate', intensity: 'calm', tags: ['salud', 'cruz', 'plus', 'grilla', 'clinico', 'limpio'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'plusgrid')
    rampBg(ctx, pal)
    // grilla de cruces medicas muy sutiles, mas densas hacia los bordes (centro despejado)
    const step = 64, arm = 7, th = 3.5
    const off = (t * CLK * 2) % step
    const col = calmTint(pal.accent, pal.tone, 182)
    for (let y = -off; y < H + step; y += step) {
      for (let x = -off; x < W + step; x += step) {
        // distancia normalizada al centro -> fade en el centro
        const dx = (x - W / 2) / (W / 2), dy = (y - H * 0.48) / (H / 2)
        const edge = clamp(Math.hypot(dx, dy) - 0.35, 0, 1)
        if (edge < 0.04) continue
        const a = edge * (pal.tone === 'light' ? 0.1 : 0.12)
        const jit = (r() - 0.5) * 0   // determinista (sin jitter) -> grilla pareja
        ctx.fillStyle = rgba(col, a)
        plusPath(ctx, x + jit, y, arm, th)
        ctx.fill()
      }
    }
    scrim(ctx, pal, { centerClear: 0.4, strength: pal.tone === 'light' ? 0.06 : 0.2 })
  },
})

register({
  id: 'bg.salud.softpanels', lib: 'backgrounds', category: 'geometric-graphic', tones: ['dark', 'light'], rubros: ['salud', 'default'], weight: 0.88,
  register: 'corporate', intensity: 'calm', tags: ['salud', 'paneles', 'redondeado', 'limpio', 'cards'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'panels')
    rampBg(ctx, pal)
    // tarjetas redondeadas tenues hacia los bordes (estetica de app de salud), centro libre
    const col = calmTint(pal.accent, pal.tone, 186)
    const cols = [
      { x: -40, y: H * 0.08, w: 150, h: 120 },
      { x: W - 120, y: H * 0.02, w: 150, h: 140 },
      { x: -50, y: H * 0.7, w: 160, h: 150 },
      { x: W - 110, y: H * 0.72, w: 150, h: 160 },
    ]
    ctx.save()
    for (let i = 0; i < cols.length; i++) {
      const c = cols[i]
      const drift = Math.sin(t * CLK * 0.25 + i * 1.3) * 6
      const rad = 22
      const a = pal.tone === 'light' ? 0.07 : 0.06
      ctx.fillStyle = rgba(i % 2 ? calmTint(pal.accent2, pal.tone, 156) : col, a)
      roundRect(ctx, c.x + drift, c.y + drift * 0.5, c.w, c.h, rad)
      ctx.fill()
      // borde finito
      ctx.strokeStyle = rgba(col, pal.tone === 'light' ? 0.1 : 0.1); ctx.lineWidth = 1.2
      roundRect(ctx, c.x + drift, c.y + drift * 0.5, c.w, c.h, rad)
      ctx.stroke()
    }
    ctx.restore()
    scrim(ctx, pal, { centerClear: 0.4, strength: pal.tone === 'light' ? 0.08 : 0.22 })
  },
})

register({
  id: 'bg.salud.heartline', lib: 'backgrounds', category: 'geometric-graphic', tones: ['dark', 'light'], rubros: ['salud', 'default'], weight: 0.85,
  register: 'friendly', intensity: 'soft', tags: ['salud', 'corazon', 'linea', 'cuidado', 'sutil'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'heart')
    rampBg(ctx, pal)
    // contornos de corazon concentricos muy sutiles, hacia una esquina superior (cuidado/afecto)
    const cx = W * (r() < 0.5 ? 0.78 : 0.22), cy = H * 0.2
    const col = calmTint(pal.accent, pal.tone, 350)   // hacia un rosado-coral suave para el corazon
    ctx.save()
    ctx.lineWidth = 1.5
    for (let k = 0; k < 4; k++) {
      const breathe = 0.5 + 0.5 * Math.sin(t * CLK * 0.3 + k * 0.5)
      const s = 26 + k * 16 + breathe * 4
      ctx.strokeStyle = rgba(col, (pal.tone === 'light' ? 0.14 : 0.16) * (1 - k * 0.18))
      ctx.beginPath()
      for (let a = 0; a <= TAU + 0.05; a += 0.08) {
        // curva de corazon parametrica
        const hx = 16 * Math.pow(Math.sin(a), 3)
        const hy = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a))
        const px = cx + hx * (s / 16), py = cy + hy * (s / 16)
        if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
      }
      ctx.stroke()
    }
    ctx.restore()
    scrim(ctx, pal, { centerClear: 0.42, strength: pal.tone === 'light' ? 0.08 : 0.24 })
  },
})

// ============================================================================
// generative-art — curvas organicas, lineas suaves, puntos
// ============================================================================

register({
  id: 'bg.salud.organicwaves', lib: 'backgrounds', category: 'generative-art', tones: ['dark', 'light'], rubros: ['salud', 'default'], weight: 0.9,
  register: 'editorial', intensity: 'calm', tags: ['salud', 'curvas', 'organico', 'ondas', 'sereno'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'owaves')
    rampBg(ctx, pal)
    // bandas onduladas apiladas abajo (paisaje sereno tipo colinas suaves)
    ctx.save(); ctx.globalCompositeOperation = pal.tone === 'light' ? 'multiply' : 'lighter'
    const bands = 4
    for (let i = 0; i < bands; i++) {
      const baseY = H * (0.58 + i * 0.12)
      const ph = r() * TAU
      const col = i % 2 ? calmTint(pal.accent2, pal.tone, 152) : calmTint(pal.accent, pal.tone, 190)
      ctx.fillStyle = rgba(col, (pal.tone === 'light' ? 0.1 : 0.1) * (1 - i * 0.12))
      ctx.beginPath(); ctx.moveTo(0, H)
      for (let x = 0; x <= W; x += 8) {
        const y = baseY + Math.sin(x * 0.012 + t * CLK * 0.22 + ph) * 22 + Math.sin(x * 0.026 + ph * 2) * 10
        ctx.lineTo(x, y)
      }
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill()
    }
    ctx.restore()
    scrim(ctx, pal, { centerClear: 0.42, strength: pal.tone === 'light' ? 0.08 : 0.22 })
  },
})

register({
  id: 'bg.salud.dnastrand', lib: 'backgrounds', category: 'generative-art', tones: ['dark', 'light'], rubros: ['salud', 'default'], weight: 0.82,
  register: 'corporate', intensity: 'soft', tags: ['salud', 'adn', 'helix', 'ciencia', 'sutil'],
  render(ctx, t, env) {
    const { pal } = env
    rampBg(ctx, pal)
    // doble helice MUY sutil cruzando en diagonal hacia un lateral (no en el centro del texto)
    const col1 = calmTint(pal.accent, pal.tone, 190), col2 = calmTint(pal.accent2, pal.tone, 152)
    ctx.save()
    ctx.translate(W * 0.82, 0); ctx.rotate(0.18)
    const amp = 30, len = H * 1.4, rungs = 26
    const drift = t * CLK * 0.3
    ctx.lineWidth = 2
    // las dos hebras
    for (let s = 0; s < 2; s++) {
      ctx.strokeStyle = rgba(s ? col2 : col1, pal.tone === 'light' ? 0.16 : 0.18)
      ctx.beginPath()
      for (let y = -40; y <= len; y += 8) {
        const x = Math.sin(y * 0.03 + drift + s * Math.PI) * amp
        if (y === -40) ctx.moveTo(x, y); else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    // peldanos
    ctx.lineWidth = 1.2
    for (let i = 0; i < rungs; i++) {
      const y = (i / rungs) * len
      const x1 = Math.sin(y * 0.03 + drift) * amp
      const x2 = Math.sin(y * 0.03 + drift + Math.PI) * amp
      ctx.strokeStyle = rgba(col1, (pal.tone === 'light' ? 0.08 : 0.1))
      ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke()
    }
    ctx.restore()
    scrim(ctx, pal, { centerClear: 0.42, strength: pal.tone === 'light' ? 0.08 : 0.24 })
  },
})

register({
  id: 'bg.salud.cellfloat', lib: 'backgrounds', category: 'generative-art', tones: ['dark', 'light'], rubros: ['salud', 'default'], weight: 0.84,
  register: 'friendly', intensity: 'soft', tags: ['salud', 'celulas', 'puntos', 'flotante', 'organico'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'cells')
    rampBg(ctx, pal)
    // celulas/burbujas suaves a la deriva (anillo + nucleo), opacidad contenida, centro despejado
    ctx.save()
    const M = 16
    const cells = Array.from({ length: M }, () => ({
      x: r() * W, y: r() * H, rad: range(r, 10, 30), ph: r() * TAU, sp: range(r, 0.15, 0.4),
    }))
    for (const c of cells) {
      const cx = c.x + Math.cos(t * CLK * c.sp + c.ph) * 16
      const cy = c.y + Math.sin(t * CLK * c.sp * 0.8 + c.ph) * 18
      // fade en el centro
      const dx = (cx - W / 2) / (W / 2), dy = (cy - H * 0.48) / (H / 2)
      const edge = clamp(Math.hypot(dx, dy) - 0.25, 0, 1)
      const col = (c.rad > 20 ? calmTint(pal.accent2, pal.tone, 152) : calmTint(pal.accent, pal.tone, 190))
      const a = edge * (pal.tone === 'light' ? 0.13 : 0.15)
      ctx.strokeStyle = rgba(col, a); ctx.lineWidth = 1.4
      ctx.beginPath(); ctx.arc(cx, cy, c.rad, 0, TAU); ctx.stroke()
      const gl = ctx.createRadialGradient(cx, cy, 0, cx, cy, c.rad)
      gl.addColorStop(0, rgba(col, a * 0.5)); gl.addColorStop(1, rgba(col, 0))
      ctx.fillStyle = gl; ctx.fill()
    }
    ctx.restore()
    scrim(ctx, pal, { centerClear: 0.4, strength: pal.tone === 'light' ? 0.1 : 0.26 })
  },
})

register({
  id: 'bg.salud.contourcalm', lib: 'backgrounds', category: 'generative-art', tones: ['dark', 'light'], rubros: ['salud', 'default'], weight: 0.8,
  register: 'editorial', intensity: 'calm', tags: ['salud', 'contornos', 'lineas', 'topografico', 'sereno'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'contour')
    rampBg(ctx, pal)
    // lineas de contorno suaves y paralelas que ondulan (campo de sumas de senos)
    const waves = []
    for (let i = 0; i < 3; i++) waves.push({ fx: range(r, 0.004, 0.012), fy: range(r, 0.004, 0.01), ph: r() * TAU, a: 1 / (i + 1) })
    const lines = 16
    const col = calmTint(pal.accent, pal.tone, 188)
    ctx.lineWidth = 1.2
    for (let l = 0; l < lines; l++) {
      const baseY = (l / lines) * H
      // las del centro mas tenues (cuida el texto)
      const centerFade = clamp(Math.abs(baseY - H * 0.48) / (H * 0.4), 0.25, 1)
      ctx.strokeStyle = rgba(l % 3 === 0 ? calmTint(pal.accent2, pal.tone, 154) : col, (pal.tone === 'light' ? 0.1 : 0.11) * centerFade)
      ctx.beginPath()
      for (let x = 0; x <= W; x += 6) {
        let dy = 0
        for (const w of waves) dy += w.a * Math.sin(x * w.fx * TAU + baseY * w.fy * TAU + w.ph + t * CLK * 0.18)
        const y = baseY + dy * 12
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    scrim(ctx, pal, { centerClear: 0.42, strength: pal.tone === 'light' ? 0.08 : 0.22 })
  },
})

// ============================================================================
// light-substrate-paper — papel claro sereno (solo light)
// ============================================================================

register({
  id: 'bg.salud.cleanpaper', lib: 'backgrounds', category: 'light-substrate-paper', tones: ['light'], rubros: ['salud', 'default'], weight: 0.9,
  register: 'editorial', intensity: 'calm', tags: ['salud', 'papel', 'claro', 'limpio', 'consultorio'],
  render(ctx, t, env) {
    const { pal } = env
    // papel claro con leve velo frio en una esquina + una cruz medica gigante muy tenue
    ctx.fillStyle = pal.bg0; ctx.fillRect(0, 0, W, H)
    const mint = calmTint(pal.accent2, 'light', 156)
    const g = ctx.createRadialGradient(W * 0.85, H * 0.12, 0, W * 0.85, H * 0.12, H * 0.6)
    g.addColorStop(0, rgba(mint, 0.16)); g.addColorStop(1, rgba(mint, 0))
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    // cruz medica gigante, fuera del centro, casi imperceptible (respira de a poco)
    const col = calmTint(pal.accent, 'light', 188)
    const breathe = 0.5 + 0.5 * Math.sin(t * CLK * 0.25)
    ctx.fillStyle = rgba(col, 0.05 + breathe * 0.015)
    plusPath(ctx, W * 0.2, H * 0.82, 120, 48)
    ctx.fill()
    scrim(ctx, pal, { centerClear: 0.46, strength: 0.06 })
  },
})

register({
  id: 'bg.salud.wellnesscard', lib: 'backgrounds', category: 'light-substrate-paper', tones: ['light'], rubros: ['salud', 'default'], weight: 0.85,
  register: 'corporate', intensity: 'calm', tags: ['salud', 'card', 'claro', 'bienestar', 'app'],
  render(ctx, t, env) {
    const { pal } = env
    // tarjeta central flotante muy suave sobre papel (estetica de app de bienestar), borde frio
    ctx.fillStyle = pal.bg1; ctx.fillRect(0, 0, W, H)
    const mint = calmTint(pal.accent, 'light', 184)
    // velo frio general
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, rgba(mint, 0.08)); g.addColorStop(0.5, rgba(mint, 0)); g.addColorStop(1, rgba(calmTint(pal.accent2, 'light', 152), 0.08))
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    // gran card central tenue (sombra suave) — su superficie es mas clara que el papel (centro despejado)
    const m = 26, cardH = H - 2 * m, drift = Math.sin(t * CLK * 0.2) * 3
    ctx.save()
    ctx.shadowColor = 'rgba(40,60,70,0.1)'; ctx.shadowBlur = 28; ctx.shadowOffsetY = 10
    ctx.fillStyle = '#ffffff'
    roundRect(ctx, m, m + drift, W - 2 * m, cardH, 28); ctx.fill()
    ctx.restore()
    // acento finito arriba de la card
    ctx.fillStyle = rgba(mint, 0.5)
    roundRect(ctx, m + 24, m + 24 + drift, 56, 6, 3); ctx.fill()
    scrim(ctx, pal, { centerClear: 0.5, strength: 0.04 })
  },
})

// ============================================================================
// spatial-depth — profundidad serena
// ============================================================================

register({
  id: 'bg.salud.depthrings', lib: 'backgrounds', category: 'spatial-depth', tones: ['dark', 'light'], rubros: ['salud', 'default'], weight: 0.82,
  register: 'editorial', intensity: 'soft', tags: ['salud', 'anillos', 'profundidad', 'tunel', 'sereno'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'depth')
    rampBg(ctx, pal)
    // anillos de profundidad excentricos (centro de fuga arriba a un lado), expansion lenta -> calma con sensacion de avance
    const cx = W * (0.5 + (r() - 0.5) * 0.3), cy = H * 0.32
    const col = calmTint(pal.accent, pal.tone, 190)
    const N = 9
    ctx.save()
    for (let i = 0; i < N; i++) {
      const ph = (t * CLK * 0.12 + i / N) % 1
      const rad = H * (0.04 + ph * ph * 0.95)   // ease-in -> sensacion de profundidad
      const a = (1 - ph) * (pal.tone === 'light' ? 0.12 : 0.13)
      ctx.lineWidth = 1 + (1 - ph) * 2
      ctx.strokeStyle = rgba(i % 3 === 0 ? calmTint(pal.accent2, pal.tone, 154) : col, a)
      ctx.beginPath(); ctx.arc(cx, cy, rad, 0, TAU); ctx.stroke()
    }
    ctx.restore()
    scrim(ctx, pal, { centerClear: 0.44, strength: pal.tone === 'light' ? 0.1 : 0.26 })
  },
})

// ---- helper de rect redondeado (al final: solo lo usan algunos modulos) ----
function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}
