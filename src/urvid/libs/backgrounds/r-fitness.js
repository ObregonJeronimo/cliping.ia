// urvid 1.0 · BACKGROUNDS rubro FITNESS — fondos energicos, diagonales, alto contraste, lineas de movimiento.
// Archivo PROPIO (no se pisa con otros agentes). El orquestador agrega el import en index.js aparte.
// Contrato: render(ctx, t, env) full-canvas. SOLO env.pal (bg0/bg1 base por tono, accent/accent2 detalle).
// Determinista: mulberry32(env.seed)/seedFor para azar estable; movimiento SOLO por t. Centro suave (legibilidad).
import { register } from '../../core/registry.js'
import { mulberry32, seedFor, range, irange } from '../../core/prng.js'
import { W, H, TAU, rgba, lighten, darken, clamp, lerp } from '../../core/util.js'

const CLK = 0.6 // reloj base lento compartido (vida sutil, nada que distraiga)

// rampa base bg0->bg1 (diagonal energica para el rubro)
function rampDiag(ctx, pal) {
  const g = ctx.createLinearGradient(0, 0, W, H)
  g.addColorStop(0, pal.bg0); g.addColorStop(1, pal.bg1)
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
}
// scrim central tone-aware: protege el contraste del texto sin matar el detalle de bordes
function centerScrim(ctx, pal, strDark = 0.42, strLight = 0.2) {
  const v = ctx.createRadialGradient(W / 2, H * 0.47, H * 0.28, W / 2, H * 0.5, H * 0.85)
  v.addColorStop(0, 'rgba(0,0,0,0)')
  v.addColorStop(1, pal.tone === 'light' ? `rgba(255,255,255,${strLight})` : `rgba(0,0,0,${strDark})`)
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H)
}
const blend = pal => (pal.tone === 'light' ? 'multiply' : 'screen')

// ============================================================================
// gradient — barridos diagonales potentes
// ============================================================================

register({
  id: 'bg.fitness.diagonalsurge', lib: 'backgrounds', category: 'gradient-fields', tones: ['dark', 'light'], rubros: ['fitness', 'default'], weight: 1.1,
  register: 'corporate', intensity: 'bold', temp: 'warm', tags: ['fitness', 'diagonal', 'gradiente', 'energico'],
  render(ctx, t, env) {
    const { pal } = env
    rampDiag(ctx, pal)
    // dos cunas diagonales de acento que barren desde las esquinas opuestas (vida = deriva del angulo)
    const drift = Math.sin(t * CLK * 0.4) * 0.05
    ctx.save(); ctx.globalCompositeOperation = blend(pal)
    for (let s = 0; s < 2; s++) {
      const col = s ? pal.accent2 : pal.accent
      const ang = (s ? -0.62 : 0.62) + drift * (s ? -1 : 1)
      const ux = Math.cos(ang), uy = Math.sin(ang)
      const ox = s ? W : 0, oy = s ? H : 0
      const g = ctx.createLinearGradient(ox, oy, ox + ux * W, oy + uy * H)
      g.addColorStop(0, rgba(col, pal.tone === 'light' ? 0.22 : 0.32))
      g.addColorStop(0.5, rgba(col, pal.tone === 'light' ? 0.06 : 0.08))
      g.addColorStop(1, rgba(col, 0))
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    }
    ctx.restore()
    centerScrim(ctx, pal, 0.38, 0.18)
  },
})

register({
  id: 'bg.fitness.speedlines', lib: 'backgrounds', category: 'gradient-fields', tones: ['dark', 'light'], rubros: ['fitness', 'default'], weight: 1,
  register: 'playful', intensity: 'loud', temp: 'warm', tags: ['fitness', 'velocidad', 'lineas', 'movimiento'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'speed')
    rampDiag(ctx, pal)
    // lineas de velocidad diagonales que se deslizan (motion blur de barras finas) hacia los bordes
    const ang = -0.7, ux = Math.cos(ang), uy = Math.sin(ang)
    const px = -uy, py = ux // perpendicular
    const N = 26, span = W * 2.2
    ctx.save(); ctx.globalCompositeOperation = blend(pal)
    for (let i = 0; i < N; i++) {
      const f = i / (N - 1)
      // densidad mayor hacia los bordes (deja el centro mas limpio)
      const edge = Math.abs(f - 0.5) * 2
      const off = (f - 0.5) * span + ((t * CLK * 40) % 60) - 30
      const cx = W / 2 + px * off, cy = H / 2 + py * off
      const w = lerp(1.2, 5, r())
      const col = i % 4 === 0 ? pal.accent2 : pal.accent
      ctx.strokeStyle = rgba(col, (pal.tone === 'light' ? 0.1 : 0.14) + edge * (pal.tone === 'light' ? 0.14 : 0.2))
      ctx.lineWidth = w
      ctx.beginPath(); ctx.moveTo(cx - ux * span, cy - uy * span); ctx.lineTo(cx + ux * span, cy + uy * span); ctx.stroke()
    }
    ctx.restore()
    centerScrim(ctx, pal, 0.4, 0.2)
  },
})

register({
  id: 'bg.fitness.heatcorner', lib: 'backgrounds', category: 'gradient-fields', tones: ['dark', 'light'], rubros: ['fitness', 'default'], weight: 0.95,
  register: 'editorial', intensity: 'medium', temp: 'warm', tags: ['fitness', 'calor', 'gradiente', 'esquina'],
  render(ctx, t, env) {
    const { pal } = env
    rampDiag(ctx, pal)
    // dos focos de "calor" en esquinas (inferior-izq + superior-der) que respiran -> energia
    ctx.save(); ctx.globalCompositeOperation = blend(pal)
    const pts = [{ x: W * 0.08, y: H * 0.94, c: pal.accent, ph: 0 }, { x: W * 0.95, y: H * 0.08, c: pal.accent2, ph: 1.6 }]
    for (const p of pts) {
      const rad = H * (0.5 + 0.06 * Math.sin(t * CLK * 0.5 + p.ph))
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad)
      g.addColorStop(0, rgba(p.c, pal.tone === 'light' ? 0.24 : 0.34))
      g.addColorStop(0.55, rgba(p.c, pal.tone === 'light' ? 0.07 : 0.1))
      g.addColorStop(1, rgba(p.c, 0))
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    }
    ctx.restore()
    centerScrim(ctx, pal, 0.34, 0.16)
  },
})

// ============================================================================
// geometric — chevrons, cunas, barras dinamicas
// ============================================================================

register({
  id: 'bg.fitness.chevronrun', lib: 'backgrounds', category: 'geometric-graphic', tones: ['dark', 'light'], rubros: ['fitness', 'default'], weight: 1,
  register: 'corporate', intensity: 'bold', temp: 'warm', tags: ['fitness', 'chevron', 'flechas', 'avance'],
  render(ctx, t, env) {
    const { pal } = env
    rampDiag(ctx, pal)
    // galones (>) ascendentes que avanzan -> sensacion de progreso/empuje
    const rows = 7, gap = H / rows, scroll = (t * CLK * 14) % (gap * 2)
    ctx.save(); ctx.globalCompositeOperation = blend(pal)
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    for (let i = -1; i < rows + 1; i++) {
      const y = i * gap + scroll
      // los del centro mas tenues (legibilidad), los de los bordes mas fuertes
      const cf = clamp(Math.abs((y / H) - 0.5) * 2, 0, 1)
      const col = i % 2 ? pal.accent2 : pal.accent
      ctx.strokeStyle = rgba(col, (pal.tone === 'light' ? 0.08 : 0.1) + cf * (pal.tone === 'light' ? 0.16 : 0.22))
      ctx.lineWidth = 10
      ctx.beginPath()
      ctx.moveTo(-20, y + gap * 0.5); ctx.lineTo(W / 2, y); ctx.lineTo(W + 20, y + gap * 0.5)
      ctx.stroke()
    }
    ctx.restore()
    centerScrim(ctx, pal, 0.4, 0.2)
  },
})

register({
  id: 'bg.fitness.wedgesplit', lib: 'backgrounds', category: 'geometric-graphic', tones: ['dark', 'light'], rubros: ['fitness', 'default'], weight: 0.95,
  register: 'editorial', intensity: 'bold', temp: 'warm', tags: ['fitness', 'cuna', 'split', 'dinamico'],
  render(ctx, t, env) {
    const { pal } = env
    ctx.fillStyle = pal.bg1; ctx.fillRect(0, 0, W, H)
    // dos grandes cunas diagonales superpuestas (composicion atletica de bloques)
    const sway = Math.sin(t * CLK * 0.35) * 14
    ctx.save(); ctx.globalCompositeOperation = blend(pal)
    // cuna 1: esquina sup-izq
    ctx.fillStyle = rgba(pal.accent, pal.tone === 'light' ? 0.16 : 0.22)
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W * 0.72 + sway, 0); ctx.lineTo(0, H * 0.5); ctx.closePath(); ctx.fill()
    // cuna 2: esquina inf-der
    ctx.fillStyle = rgba(pal.accent2, pal.tone === 'light' ? 0.16 : 0.22)
    ctx.beginPath(); ctx.moveTo(W, H); ctx.lineTo(W * 0.28 - sway, H); ctx.lineTo(W, H * 0.5); ctx.closePath(); ctx.fill()
    // filo de luz en la diagonal central
    ctx.strokeStyle = rgba(pal.accent, pal.tone === 'light' ? 0.2 : 0.3); ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(W * 0.85 + sway, 0); ctx.lineTo(W * 0.15 - sway, H); ctx.stroke()
    ctx.restore()
    centerScrim(ctx, pal, 0.3, 0.12)
  },
})

register({
  id: 'bg.fitness.barstack', lib: 'backgrounds', category: 'geometric-graphic', tones: ['dark', 'light'], rubros: ['fitness', 'default'], weight: 0.9,
  register: 'corporate', intensity: 'medium', temp: 'warm', tags: ['fitness', 'barras', 'ecualizador', 'ritmo'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'bars')
    rampDiag(ctx, pal)
    // ecualizador vertical en ambos bordes (energia ritmica) -> centro despejado
    const cols = 9, cw = W / (cols * 2.6)
    ctx.save(); ctx.globalCompositeOperation = blend(pal)
    for (const side of [0, 1]) {
      for (let i = 0; i < cols; i++) {
        const ph = r() * TAU, sp = range(r, 0.5, 1.3)
        const amp = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * CLK * sp + ph))
        const bh = H * (0.12 + amp * 0.34)
        const x = side ? W - (i + 1) * cw * 1.5 : i * cw * 1.5 + cw * 0.5
        const col = i % 3 === 0 ? pal.accent2 : pal.accent
        const g = ctx.createLinearGradient(0, H, 0, H - bh)
        g.addColorStop(0, rgba(col, pal.tone === 'light' ? 0.22 : 0.3)); g.addColorStop(1, rgba(col, 0))
        ctx.fillStyle = g; ctx.fillRect(x, H - bh, cw, bh)
        // espejo arriba
        const g2 = ctx.createLinearGradient(0, 0, 0, bh * 0.7)
        g2.addColorStop(0, rgba(col, pal.tone === 'light' ? 0.14 : 0.2)); g2.addColorStop(1, rgba(col, 0))
        ctx.fillStyle = g2; ctx.fillRect(x, 0, cw, bh * 0.7)
      }
    }
    ctx.restore()
    centerScrim(ctx, pal, 0.32, 0.14)
  },
})

register({
  id: 'bg.fitness.tracklanes', lib: 'backgrounds', category: 'geometric-graphic', tones: ['dark', 'light'], rubros: ['fitness', 'default'], weight: 0.9,
  register: 'corporate', intensity: 'medium', temp: 'warm', tags: ['fitness', 'pista', 'carriles', 'perspectiva'],
  render(ctx, t, env) {
    const { pal } = env
    rampDiag(ctx, pal)
    // carriles de pista en fuga hacia un punto alto (perspectiva atletica), lineas que corren
    const vpx = W / 2, vpy = H * 0.16
    const lanes = 8, scroll = (t * CLK * 0.25) % 1
    ctx.save(); ctx.globalCompositeOperation = blend(pal)
    for (let i = 0; i <= lanes; i++) {
      const f = i / lanes
      const bx = lerp(-W * 0.6, W * 1.6, f)
      const col = i % 2 ? pal.accent2 : pal.accent
      ctx.strokeStyle = rgba(col, pal.tone === 'light' ? 0.12 : 0.16); ctx.lineWidth = 1.6
      ctx.beginPath(); ctx.moveTo(vpx, vpy); ctx.lineTo(bx, H + 10); ctx.stroke()
    }
    // marcas de distancia que se acercan (dashes que escalan con la profundidad)
    for (let k = 0; k < 7; k++) {
      const dep = ((k + scroll) / 7)
      const y = lerp(vpy, H, dep * dep)
      const wband = lerp(4, W * 0.95, dep * dep)
      ctx.strokeStyle = rgba(pal.accent, (pal.tone === 'light' ? 0.1 : 0.14) * dep); ctx.lineWidth = 1 + dep * 3
      ctx.beginPath(); ctx.moveTo(W / 2 - wband / 2, y); ctx.lineTo(W / 2 + wband / 2, y); ctx.stroke()
    }
    ctx.restore()
    centerScrim(ctx, pal, 0.36, 0.18)
  },
})

// ============================================================================
// energetic-motion — pulso, ondas, sheen
// ============================================================================

register({
  id: 'bg.fitness.pulsewave', lib: 'backgrounds', category: 'energetic-motion', tones: ['dark', 'light'], rubros: ['fitness', 'default'], weight: 1,
  register: 'editorial', intensity: 'medium', temp: 'warm', tags: ['fitness', 'pulso', 'cardio', 'onda'],
  render(ctx, t, env) {
    const { pal } = env
    rampDiag(ctx, pal)
    // linea de pulso cardiaco (heartbeat) que recorre, abajo del centro para no tapar el texto
    ctx.save(); ctx.globalCompositeOperation = blend(pal)
    const draw = (yBase, col, alpha, lw, phase) => {
      ctx.strokeStyle = rgba(col, alpha); ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
      ctx.beginPath()
      const scroll = (t * CLK * 60 + phase) % 120
      for (let x = -10; x <= W + 10; x += 3) {
        const u = ((x + scroll) % 120) / 120
        // un latido por periodo: pico agudo + rebote
        let spike = 0
        if (u > 0.42 && u < 0.58) { const s = (u - 0.42) / 0.16; spike = Math.sin(s * Math.PI) * (s < 0.5 ? 1 : -0.6) }
        const y = yBase - spike * H * 0.12
        x === -10 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    draw(H * 0.74, pal.accent, pal.tone === 'light' ? 0.3 : 0.42, 2.6, 0)
    draw(H * 0.26, pal.accent2, pal.tone === 'light' ? 0.18 : 0.26, 1.8, 60)
    ctx.restore()
    centerScrim(ctx, pal, 0.3, 0.14)
  },
})

register({
  id: 'bg.fitness.sheenstreaks', lib: 'backgrounds', category: 'energetic-motion', tones: ['dark', 'light'], rubros: ['fitness', 'default'], weight: 0.95,
  register: 'editorial', intensity: 'soft', temp: 'warm', tags: ['fitness', 'sheen', 'brillo', 'diagonal'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'sheen')
    rampDiag(ctx, pal)
    // franjas de brillo diagonales que pasan lentamente (sudor/velocidad premium)
    const ang = -0.85, ux = Math.cos(ang), uy = Math.sin(ang), px = -uy, py = ux
    ctx.save(); ctx.globalCompositeOperation = blend(pal)
    const M = 4
    for (let i = 0; i < M; i++) {
      const ph = r() * TAU, sp = range(r, 0.12, 0.28)
      const slide = ((t * CLK * sp + i / M) % 1) * (W * 2) - W * 0.5
      const cx = W / 2 + px * (slide - W * 0.5) * 0 + px * 0 // base centro
      const ccx = W / 2 + px * (slide) , ccy = H / 2 + py * (slide)
      const col = i % 2 ? pal.accent2 : pal.accent
      const bandW = 50 + r() * 40
      const g = ctx.createLinearGradient(ccx - px * bandW, ccy - py * bandW, ccx + px * bandW, ccy + py * bandW)
      g.addColorStop(0, rgba(col, 0)); g.addColorStop(0.5, rgba(col, pal.tone === 'light' ? 0.12 : 0.16)); g.addColorStop(1, rgba(col, 0))
      ctx.fillStyle = g
      ctx.save(); ctx.translate(ccx, ccy); ctx.rotate(ang); ctx.fillRect(-W * 1.5, -bandW, W * 3, bandW * 2); ctx.restore()
    }
    ctx.restore()
    centerScrim(ctx, pal, 0.26, 0.12)
  },
})

register({
  id: 'bg.fitness.kinetictri', lib: 'backgrounds', category: 'energetic-motion', tones: ['dark', 'light'], rubros: ['fitness', 'default'], weight: 0.85,
  register: 'playful', intensity: 'bold', temp: 'warm', tags: ['fitness', 'triangulos', 'cinetico', 'shards'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'tri')
    rampDiag(ctx, pal)
    // esquirlas triangulares dispersas a la deriva (explosion de energia), concentradas en bordes
    ctx.save(); ctx.globalCompositeOperation = blend(pal)
    const M = 16
    for (let i = 0; i < M; i++) {
      // sesgo hacia los bordes: x cerca de 0/1, y libre
      const edgeBias = r() < 0.5 ? r() * 0.28 : 1 - r() * 0.28
      const bx = edgeBias * W, by = r() * H
      const ph = r() * TAU, sp = range(r, 0.3, 0.8)
      const x = bx + Math.cos(t * CLK * sp + ph) * 16
      const y = by + Math.sin(t * CLK * sp * 0.9 + ph) * 16
      const sz = range(r, 12, 34), rot = ph + t * CLK * 0.2 * (i % 2 ? 1 : -1)
      const col = i % 3 === 0 ? pal.accent2 : pal.accent
      ctx.fillStyle = rgba(col, pal.tone === 'light' ? 0.12 : 0.16)
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot)
      ctx.beginPath(); ctx.moveTo(0, -sz); ctx.lineTo(sz * 0.86, sz * 0.5); ctx.lineTo(-sz * 0.86, sz * 0.5); ctx.closePath(); ctx.fill()
      ctx.restore()
    }
    ctx.restore()
    centerScrim(ctx, pal, 0.36, 0.18)
  },
})

// ============================================================================
// texture — carbon, mallas, rejillas tecnicas
// ============================================================================

register({
  id: 'bg.fitness.carbonweave', lib: 'backgrounds', category: 'texture-material', tones: ['dark', 'light'], rubros: ['fitness', 'default'], weight: 0.85,
  register: 'corporate', intensity: 'soft', temp: 'warm', tags: ['fitness', 'carbono', 'textura', 'tecnico'],
  render(ctx, t, env) {
    const { pal } = env
    rampDiag(ctx, pal)
    // trama de fibra de carbono (chevrons chicos entrelazados) con un sheen que cruza
    const cell = 16, sh = (t * CLK * 8) % (cell * 2)
    ctx.save(); ctx.globalCompositeOperation = blend(pal)
    ctx.strokeStyle = rgba(pal.tone === 'light' ? '#555' : pal.accent, pal.tone === 'light' ? 0.06 : 0.08); ctx.lineWidth = 2
    for (let y = -cell; y < H + cell; y += cell) {
      for (let x = -cell; x < W + cell; x += cell) {
        const up = ((x / cell + y / cell) | 0) % 2 === 0
        ctx.beginPath()
        if (up) { ctx.moveTo(x, y + cell); ctx.lineTo(x + cell / 2, y); ctx.lineTo(x + cell, y + cell) }
        else { ctx.moveTo(x, y); ctx.lineTo(x + cell / 2, y + cell); ctx.lineTo(x + cell, y) }
        ctx.stroke()
      }
    }
    ctx.restore()
    // sheen diagonal lento
    const ux = Math.cos(-0.7), uy = Math.sin(-0.7)
    const cxp = lerp(-W * 0.5, W * 1.5, ((t * CLK * 0.1) % 1))
    const g = ctx.createLinearGradient(cxp - 80, 0, cxp + 80, H)
    g.addColorStop(0, rgba(pal.accent, 0)); g.addColorStop(0.5, rgba(pal.accent, pal.tone === 'light' ? 0.06 : 0.09)); g.addColorStop(1, rgba(pal.accent, 0))
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    centerScrim(ctx, pal, 0.3, 0.14)
  },
})

register({
  id: 'bg.fitness.meshgridtilt', lib: 'backgrounds', category: 'texture-material', tones: ['dark', 'light'], rubros: ['fitness', 'default'], weight: 0.85,
  register: 'corporate', intensity: 'soft', temp: 'warm', tags: ['fitness', 'malla', 'grilla', 'inclinada'],
  render(ctx, t, env) {
    const { pal } = env
    rampDiag(ctx, pal)
    // grilla romboidal inclinada (malla deportiva) que se desplaza, con nodos de acento en bordes
    const step = 30, off = (t * CLK * 5) % step
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(0.32); ctx.translate(-W / 2, -H / 2)
    ctx.strokeStyle = rgba(pal.tone === 'light' ? '#000' : pal.accent, pal.tone === 'light' ? 0.05 : 0.08); ctx.lineWidth = 1
    for (let x = -H - off; x < W + H; x += step) { ctx.beginPath(); ctx.moveTo(x, -H); ctx.lineTo(x, H * 2); ctx.stroke() }
    for (let y = -off; y < H * 2; y += step) { ctx.beginPath(); ctx.moveTo(-H, y); ctx.lineTo(W + H, y); ctx.stroke() }
    ctx.restore()
    // glow en dos esquinas para concentrar el detalle fuera del centro
    ctx.save(); ctx.globalCompositeOperation = blend(pal)
    for (const p of [{ x: W, y: 0, c: pal.accent }, { x: 0, y: H, c: pal.accent2 }]) {
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, H * 0.42)
      g.addColorStop(0, rgba(p.c, pal.tone === 'light' ? 0.16 : 0.22)); g.addColorStop(1, rgba(p.c, 0))
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    }
    ctx.restore()
    centerScrim(ctx, pal, 0.32, 0.15)
  },
})

// ============================================================================
// organic — humo/energia + arcos de potencia
// ============================================================================

register({
  id: 'bg.fitness.energyarcs', lib: 'backgrounds', category: 'atmospheric-organic', tones: ['dark', 'light'], rubros: ['fitness', 'default'], weight: 0.9,
  register: 'editorial', intensity: 'bold', temp: 'warm', tags: ['fitness', 'arcos', 'energia', 'potente'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'arc')
    rampDiag(ctx, pal)
    // arcos concentricos de energia emanando de una esquina inferior (impulso) -> centro queda libre
    const ox = W * 1.04, oy = H * 1.06
    ctx.save(); ctx.globalCompositeOperation = blend(pal)
    const rings = 7
    for (let i = 0; i < rings; i++) {
      const base = H * (0.2 + i * 0.16)
      const pulse = Math.sin(t * CLK * 0.5 - i * 0.6) * 8
      const rad = base + pulse
      const col = i % 2 ? pal.accent2 : pal.accent
      const a = (pal.tone === 'light' ? 0.16 : 0.22) * (1 - i / rings * 0.5)
      ctx.strokeStyle = rgba(col, a); ctx.lineWidth = lerp(5, 1.4, i / rings)
      ctx.beginPath(); ctx.arc(ox, oy, rad, Math.PI, Math.PI * 1.5); ctx.stroke()
    }
    ctx.restore()
    // spark sutil en el origen
    ctx.save(); ctx.globalCompositeOperation = blend(pal)
    const gl = ctx.createRadialGradient(ox, oy, 0, ox, oy, H * 0.4)
    gl.addColorStop(0, rgba(pal.accent, pal.tone === 'light' ? 0.18 : 0.26)); gl.addColorStop(1, rgba(pal.accent, 0))
    ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H)
    ctx.restore()
    centerScrim(ctx, pal, 0.3, 0.14)
  },
})

register({
  id: 'bg.fitness.smokeplume', lib: 'backgrounds', category: 'atmospheric-organic', tones: ['dark', 'light'], rubros: ['fitness', 'default'], weight: 0.8,
  register: 'editorial', intensity: 'soft', temp: 'warm', tags: ['fitness', 'humo', 'vapor', 'atmosferico'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'smoke')
    rampDiag(ctx, pal)
    // columnas de vapor/energia subiendo desde abajo (intensidad de gimnasio), plumas suaves laterales
    ctx.save(); ctx.globalCompositeOperation = blend(pal)
    const M = 5
    for (let i = 0; i < M; i++) {
      const ph = r() * TAU, sp = range(r, 0.2, 0.45)
      const baseX = lerp(0.12, 0.88, i / (M - 1)) * W
      const drift = Math.sin(t * CLK * sp + ph) * 30
      const bx = baseX + drift
      const by = H * (0.55 + r() * 0.4) - ((t * CLK * 10 + ph * 20) % (H * 0.5))
      const rad = H * (0.16 + r() * 0.14)
      const col = i % 2 ? pal.accent2 : pal.accent
      const g = ctx.createRadialGradient(bx, by, 0, bx, by, rad)
      g.addColorStop(0, rgba(col, pal.tone === 'light' ? 0.09 : 0.13)); g.addColorStop(1, rgba(col, 0))
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    }
    ctx.restore()
    // base oscura/clara mas densa abajo
    const g = ctx.createLinearGradient(0, H * 0.6, 0, H)
    g.addColorStop(0, rgba(pal.bg1, 0)); g.addColorStop(1, rgba(pal.tone === 'light' ? '#ffffff' : pal.bg0, pal.tone === 'light' ? 0.2 : 0.4))
    ctx.fillStyle = g; ctx.fillRect(0, H * 0.6, W, H * 0.4)
    centerScrim(ctx, pal, 0.26, 0.12)
  },
})
