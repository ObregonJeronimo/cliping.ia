// urvid 1.0 · biblioteca POST — el ACABADO (finish). render(ctx, t, env) se dibuja ULTIMO, SOBRE todo el cuadro
// (405x720). Da el "film look" que une el frame. REGLAS: SUTIL (no tapa el texto: alphas bajos, vignette solo en
// bordes, grade leve), FLUIDO (anima por t: grano titila, leaks derivan, vignette respira) y DETERMINISTA
// (mulberry32(env.seed); cero Math.random/Date.now). Color de env.pal.* (los tintes calido/frio son hues honestos).
import { register } from '../../core/registry.js'
import { mulberry32 } from '../../core/prng.js'
import { W, H, TAU, rgba, clamp, hexToHsl, hslToHex } from '../../core/util.js'

// tintHue: lleva el HUE de un hex hacia un anchor con peso w (preserva S/L del que lo llama). PURO. Para teñir los grades
// NEUTRALES (warm/cool) hacia el acento de la marca sin perder su temperatura (w=0.7 acota el peor caso a banda calida/fria).
const tintHue = (hex, anchor, w) => { const a = hexToHsl(hex || '#888888'); const dh = ((anchor - a.h + 540) % 360) - 180; return a.h + dh * w }

// INTENSIDAD GLOBAL del pase de post, modulada por seriousness en render-time (la setea urvid/index.js antes de drawFrame).
// Escala el alpha de TODAS las capas por igual -> serio = acabado mas tenue; relajado = mas presente. NO toca los hues
// internos de los grades (teal-orange/golden siguen siendo su LUT) -> solo la PRESENCIA del acabado. Default 1 = no-op.
let _postK = 1
export function setPostIntensity(k) { _postK = (typeof k === 'number' && isFinite(k)) ? k : 1 }
// helper: overlay con composite + alpha (escalado por _postK), restaura siempre.
function layer(ctx, alpha, comp, draw) {
  ctx.save(); ctx.globalAlpha = clamp(alpha * _postK, 0, 1); if (comp) ctx.globalCompositeOperation = comp
  draw(ctx); ctx.restore()
}
// helper: gradiente radial centrado (para vignette/halacion/leak).
function radial(ctx, cx, cy, r0, r1, stops) {
  const g = ctx.createRadialGradient(cx, cy, r0, cx, cy, r1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g
}

function P(id, category, render, meta = {}) {
  register({ id, lib: 'post', category, tones: meta.tones || ['dark', 'light'], rubros: meta.rubros || ['*'], weight: meta.weight || 1, tags: meta.tags || [], register: meta.register, intensity: meta.intensity, render })   // register/intensity EXPLICITOS: el acabado deja de ser un sorteo plano y se alinea a la seriedad+audiencia (clinico sobrio vs comida calida).
}

// ---- grain (grano de pelicula: specks seeded, titilan por t) ----
P('post.grain.film', 'fx-grano', (ctx, t, env) => {
  const r = mulberry32((env.seed >>> 0) ^ 0xf11), n = 900, fl = 0.5 + 0.5 * Math.sin(t * 9)
  const ink = env.pal.tone === 'light' ? 0 : 255
  layer(ctx, 0.05 + 0.03 * fl, null, (c) => {
    for (let i = 0; i < n; i++) { const x = r() * W, y = r() * H, a = 0.3 + 0.7 * r(); c.fillStyle = `rgba(${ink},${ink},${ink},${a.toFixed(2)})`; c.fillRect(x, y, 1.2, 1.2) }
  })
}, { register: 'editorial', intensity: 'soft', tags: ['grano', 'film', 'textura'], weight: 1.1 })

P('post.grain.fine', 'fx-grano', (ctx, t, env) => {
  const r = mulberry32((env.seed >>> 0) ^ 0xf12), n = 1400
  const ph = (t * 7) | 0, ink = env.pal.tone === 'light' ? 20 : 235
  layer(ctx, 0.04, null, (c) => {
    for (let i = 0; i < n; i++) { const x = (r() * W + ph * 0.3) % W, y = r() * H; c.fillStyle = rgba('#' + ink.toString(16).repeat(3).slice(0, 6), 0.3 + 0.7 * r()); c.fillRect(x, y, 1, 1) }
  })
}, { register: 'corporate', intensity: 'calm', tags: ['grano', 'fino', 'sutil'], weight: 0.9 })

// ---- vignette (oscurece SOLO bordes; respira) ----
P('post.vignette.soft', 'fx-vignette', (ctx, t, env) => {
  const br = 1 + 0.02 * Math.sin(t * 0.8), a = env.pal.tone === 'light' ? 0.16 : 0.34
  layer(ctx, 1, null, (c) => { c.fillStyle = radial(c, W / 2, H * 0.46, W * 0.28 * br, W * 0.85, [[0, 'rgba(0,0,0,0)'], [1, rgba('#000', a)]]); c.fillRect(0, 0, W, H) })
}, { register: 'neutral', intensity: 'soft', tags: ['vignette', 'foco', 'cine'], weight: 1.2 })

P('post.vignette.frame', 'fx-vignette', (ctx, t, env) => {
  const a = env.pal.tone === 'light' ? 0.1 : 0.22, m = 0
  layer(ctx, 1, null, (c) => {
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, rgba('#000', a)); g.addColorStop(0.12, 'rgba(0,0,0,0)'); g.addColorStop(0.88, 'rgba(0,0,0,0)'); g.addColorStop(1, rgba('#000', a)); c.fillStyle = g; c.fillRect(m, m, W, H)
    const h = c.createLinearGradient(0, 0, W, 0); h.addColorStop(0, rgba('#000', a * 0.7)); h.addColorStop(0.1, 'rgba(0,0,0,0)'); h.addColorStop(0.9, 'rgba(0,0,0,0)'); h.addColorStop(1, rgba('#000', a * 0.7)); c.fillStyle = h; c.fillRect(0, 0, W, H)
  })
}, { register: 'editorial', intensity: 'soft', tags: ['vignette', 'marco', 'letterbox'], weight: 0.9 })

// ---- light-leak (fuga de luz que deriva por t) ----
P('post.leak.warm', 'fx-leak', (ctx, t, env) => {
  const cx = W * (0.85 + 0.1 * Math.sin(t * 0.4)), cy = H * (0.12 + 0.06 * Math.cos(t * 0.33))
  layer(ctx, 0.5, 'screen', (c) => { c.fillStyle = radial(c, cx, cy, 0, W * 0.7, [[0, rgba('#ff9d4d', 0.5)], [0.5, rgba('#ff5e3a', 0.16)], [1, 'rgba(0,0,0,0)']]); c.fillRect(0, 0, W, H) })
}, { register: 'friendly', intensity: 'bold', tags: ['leak', 'calido', 'analogico'], weight: 0.8, tones: ['dark'] })

P('post.leak.prism', 'fx-leak', (ctx, t, env) => {
  const cx = W * (0.15 + 0.12 * Math.sin(t * 0.5 + 1)), cy = H * (0.88 - 0.06 * Math.sin(t * 0.37))
  layer(ctx, 0.45, 'screen', (c) => { c.fillStyle = radial(c, cx, cy, 0, W * 0.65, [[0, rgba(env.pal.accent, 0.5)], [0.55, rgba(env.pal.accent2 || env.pal.accent, 0.14)], [1, 'rgba(0,0,0,0)']]); c.fillRect(0, 0, W, H) })
}, { register: 'playful', intensity: 'bold', tags: ['leak', 'acento', 'prisma'], weight: 0.8, tones: ['dark'] })

// ---- halacion / bloom suave (resplandor central que respira) ----
P('post.glow.halation', 'fx-bloom', (ctx, t, env) => {
  const br = 1 + 0.05 * Math.sin(t * 0.9), a = env.pal.tone === 'light' ? 0.06 : 0.12
  layer(ctx, 1, 'screen', (c) => { c.fillStyle = radial(c, W / 2, H * 0.44, W * 0.05, W * 0.7 * br, [[0, rgba(env.pal.accent, a)], [1, 'rgba(0,0,0,0)']]); c.fillRect(0, 0, W, H) })
}, { register: 'editorial', intensity: 'soft', tags: ['bloom', 'halacion', 'glow'], weight: 0.85 })

// ---- scanlines / CRT ----
P('post.scan.lines', 'fx-scan', (ctx, t, env) => {
  const off = (t * 14) % 4, a = env.pal.tone === 'light' ? 0.05 : 0.1
  layer(ctx, 1, null, (c) => { c.fillStyle = rgba('#000', a); for (let y = (off | 0); y < H; y += 4) c.fillRect(0, y, W, 1.4) })
}, { register: 'playful', intensity: 'bold', tags: ['scanlines', 'crt', 'retro'], weight: 0.7, rubros: ['tech', 'gaming', 'eventos', 'musica'] })   // sin '*': rubroAffinity baja scanlines a 0.45 fuera de nicho (un brief serio dark ya no recibe CRT)

P('post.scan.crt', 'fx-scan', (ctx, t, env) => {
  const flick = 0.9 + 0.1 * Math.sin(t * 30)
  layer(ctx, 0.1 * flick, null, (c) => { c.fillStyle = rgba('#000', 1); for (let y = 0; y < H; y += 3) c.fillRect(0, y, W, 1.2) })
  layer(ctx, env.pal.tone === 'light' ? 0.12 : 0.26, null, (c) => { c.fillStyle = radial(c, W / 2, H / 2, W * 0.3, W * 0.85, [[0, 'rgba(0,0,0,0)'], [1, rgba('#000', 1)]]); c.fillRect(0, 0, W, H) })
}, { register: 'playful', intensity: 'loud', tags: ['crt', 'retro', 'tv'], weight: 0.6, rubros: ['tech', 'gaming', 'musica'] })   // sin '*': el CRT (lo mas ruidoso) queda acotado a su nicho, no entra en salud/finanzas/legal dark

// ---- grade (tinte global LEVE; preserva contraste -> alpha bajo + overlay) ----
P('post.grade.warm', 'grade', (ctx, t, env) => {
  const hw = tintHue(env.pal.accent, 30, 0.7)   // hue del acento empujado a CALIDO (anchor 30, w0.7); S/L pin de #ffb070/#7a4a2a
  layer(ctx, 0.1, 'overlay', (c) => { const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, rgba(hslToHex(hw, 1.0, 0.72), 1)); g.addColorStop(1, rgba(hslToHex(hw, 0.49, 0.32), 1)); c.fillStyle = g; c.fillRect(0, 0, W, H) })
}, { register: 'friendly', intensity: 'medium', tags: ['grade', 'calido', 'dorado'], weight: 1, rubros: ['*', 'gastronomia', 'moda', 'belleza', 'inmobiliaria'] })

P('post.grade.cool', 'grade', (ctx, t, env) => {
  const hc = tintHue(env.pal.accent, 210, 0.7)   // hue del acento empujado a FRIO (anchor 210, w0.7); S/L pin de #7fd0ff/#243a6a
  layer(ctx, 0.1, 'overlay', (c) => { const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, rgba(hslToHex(hc, 1.0, 0.75), 1)); g.addColorStop(1, rgba(hslToHex(hc, 0.49, 0.28), 1)); c.fillStyle = g; c.fillRect(0, 0, W, H) })
}, { register: 'corporate', intensity: 'calm', tags: ['grade', 'frio', 'clinico'], weight: 1, rubros: ['*', 'tech', 'finanzas', 'salud'] })

P('post.grade.fade', 'grade', (ctx, t, env) => {
  // faded-film: levanta los negros (overlay claro tenue) -> look analogico suave. Preserva legibilidad (alpha bajo).
  layer(ctx, env.pal.tone === 'light' ? 0.05 : 0.1, 'lighten', (c) => { c.fillStyle = rgba(env.pal.tone === 'light' ? '#fbf6ec' : '#3a3340', 1); c.fillRect(0, 0, W, H) })
}, { register: 'editorial', intensity: 'soft', tags: ['grade', 'fade', 'analogico', 'suave'], weight: 0.9 })

P('post.grade.teal-orange', 'grade', (ctx, t, env) => {
  // look de cine: sombras teal arriba, luces calidas abajo (muy leve).
  layer(ctx, 0.09, 'overlay', (c) => { const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, rgba('#1fb6c9', 1)); g.addColorStop(0.5, 'rgba(128,128,128,1)'); g.addColorStop(1, rgba('#ff8a3d', 1)); c.fillStyle = g; c.fillRect(0, 0, W, H) })
}, { register: 'editorial', intensity: 'medium', tags: ['grade', 'teal-orange', 'cine'], weight: 0.85 })

P('post.grade.neutral', 'grade', (ctx, t, env) => {
  // contrast-lift NEUTRO (sin tinte): overlay gris PURO -> profundiza negros y levanta blancos SIN desviar el hue. Acabado
  // SOBRIO (finanzas/legal/B2B). APCA-safe: stop medio #808080 = punto neutro del overlay (centro intacto); vignette suave.
  layer(ctx, env.pal.tone === 'light' ? 0.07 : 0.11, 'overlay', (c) => { const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#c8c8c8'); g.addColorStop(0.5, '#808080'); g.addColorStop(1, '#3c3c3c'); c.fillStyle = g; c.fillRect(0, 0, W, H) })
  layer(ctx, env.pal.tone === 'light' ? 0.08 : 0.16, null, (c) => { c.fillStyle = radial(c, W / 2, H * 0.46, W * 0.4, W * 0.92, [[0, 'rgba(0,0,0,0)'], [1, rgba('#000', 1)]]); c.fillRect(0, 0, W, H) })
}, { register: 'corporate', intensity: 'calm', tags: ['grade', 'neutro', 'contraste', 'corporativo', 'sobrio'], weight: 1, rubros: ['*', 'finanzas', 'legal', 'tech', 'salud'] })

// ---- dust (motas que derivan lento; analogico) ----
P('post.dust.motes', 'fx-grano', (ctx, t, env) => {
  const r = mulberry32((env.seed >>> 0) ^ 0xd05), n = 14
  layer(ctx, env.pal.tone === 'light' ? 0.1 : 0.18, 'screen', (c) => {
    for (let i = 0; i < n; i++) { const bx = r() * W, by = r() * H, sp = 4 + r() * 8, ph = r() * TAU; const x = (bx + Math.sin(t * 0.2 + ph) * sp) % W, y = (by + (t * (3 + r() * 4)) % H) % H, rad = 0.8 + r() * 1.8; c.fillStyle = rgba('#fff', 0.4 + 0.4 * r()); c.beginPath(); c.arc(x, y, rad, 0, TAU); c.fill() }
  })
}, { register: 'editorial', intensity: 'soft', tags: ['dust', 'motas', 'analogico'], weight: 0.6 })
