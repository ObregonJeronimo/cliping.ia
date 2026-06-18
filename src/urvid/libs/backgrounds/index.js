// urvid 1.0 · biblioteca BACKGROUNDS — pintores de fondo full-canvas. Cada modulo: render(ctx, t, env).
// env = { pal, content, seed, energy, sceneDur }. Puro + determinista (mulberry32(env.seed) para layout estable,
// t para motion). Consume la PALETA (no hardcodea color). El director elige uno por video segun tono/rubro.
// ESTE archivo es la PLANTILLA que los agentes siguen para llenar las ~11 categorias con cientos de modulos.
import { register } from '../../core/registry.js'
import { mulberry32, range } from '../../core/prng.js'
import { W, H, TAU, rgba, lighten, clamp } from '../../core/util.js'

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
