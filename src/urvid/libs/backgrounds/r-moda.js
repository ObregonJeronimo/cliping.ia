// urvid 1.0 · biblioteca BACKGROUNDS — RUBRO MODA (fashion editorial). Archivo propio (no pisa a otros agentes).
// Vibe: editorial, alto contraste, minimal, gradientes fashion, halftone, lineas, elegante, dramatico, mucho aire.
// Contrato igual al index.js: render(ctx, t, env) full-canvas, usa env.pal (bg0/bg1/accent/accent2), determinista
// (mulberry32(env.seed)/seedFor), vida SOLO por t. Centro suave -> no mata el contraste del texto.
import { register } from '../../core/registry.js'
import { mulberry32, seedFor, range, irange } from '../../core/prng.js'
import { W, H, TAU, rgba, lighten, darken, clamp, lerp, mix, hexToHsl, hslToHex } from '../../core/util.js'

const CLK = 0.6
const isLight = pal => pal.tone === 'light'

// rampa base bg0->bg1 (vertical por defecto). Comun a casi todos -> no repetir.
function rampBg(ctx, pal, angle = 90) {
  const a = (angle * Math.PI) / 180
  const cx = W / 2, cy = H / 2, ext = Math.max(W, H)
  const g = ctx.createLinearGradient(cx - Math.cos(a) * ext, cy - Math.sin(a) * ext, cx + Math.cos(a) * ext, cy + Math.sin(a) * ext)
  g.addColorStop(0, pal.bg0); g.addColorStop(1, pal.bg1)
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
}

// scrim central suave (cuida el texto). Editorial: tenue, no opaca el fondo.
function centerScrim(ctx, pal, strength = 1) {
  const v = ctx.createRadialGradient(W / 2, H * 0.46, H * 0.28, W / 2, H * 0.5, H * 0.82)
  v.addColorStop(0, 'rgba(0,0,0,0)')
  v.addColorStop(1, isLight(pal) ? `rgba(255,255,255,${0.2 * strength})` : `rgba(0,0,0,${0.4 * strength})`)
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H)
}

// gris/blanco neutro de detalle por tono (lineas finas, hairlines) — neutro, no es color de marca
const hair = (pal, a) => rgba(isLight(pal) ? '#000000' : '#ffffff', a)

// =====================================================================================
// gradient-fields — gradientes fashion, duotonos, brillo de pasarela
// =====================================================================================

register({
  id: 'bg.moda.runwayfade', lib: 'backgrounds', category: 'gradient-fields', tones: ['dark', 'light'], rubros: ['moda', 'default'], weight: 1.05,
  register: 'editorial', intensity: 'calm', temp: 'warm', tags: ['moda', 'editorial', 'gradiente', 'pasarela'],
  render(ctx, t, env) {
    const { pal } = env
    // degrade vertical alto: piso oscuro/claro -> cielo, con una franja de luz a media altura (la "pasarela")
    rampBg(ctx, pal, 90)
    const aCol = isLight(pal) ? darken(pal.accent, 0.1) : pal.accent
    const yc = H * 0.4 + Math.sin(t * CLK * 0.18) * 10
    const g = ctx.createLinearGradient(0, yc - H * 0.45, 0, yc + H * 0.45)
    g.addColorStop(0, rgba(aCol, 0))
    g.addColorStop(0.5, rgba(aCol, isLight(pal) ? 0.16 : 0.11))
    g.addColorStop(1, rgba(aCol, 0))
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    // cielo arriba: tinte de acento2 que cae (da cuerpo al degrade en ambos tonos)
    const sg = ctx.createLinearGradient(0, 0, 0, H * 0.5)
    sg.addColorStop(0, rgba(isLight(pal) ? darken(pal.accent2, 0.05) : lighten(pal.accent2, 0.1), isLight(pal) ? 0.12 : 0.1))
    sg.addColorStop(1, rgba(pal.accent2, 0))
    ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H * 0.5)
    // piso reflejante abajo
    const fg = ctx.createLinearGradient(0, H * 0.68, 0, H)
    fg.addColorStop(0, rgba(pal.bg0, 0)); fg.addColorStop(1, isLight(pal) ? rgba(darken(pal.accent2, 0.1), 0.14) : rgba('#000000', 0.45))
    ctx.fillStyle = fg; ctx.fillRect(0, H * 0.68, W, H * 0.32)
  },
})

register({
  id: 'bg.moda.duotonesplit', lib: 'backgrounds', category: 'gradient-fields', tones: ['dark', 'light'], rubros: ['moda', 'default'], weight: 1,
  register: 'editorial', intensity: 'medium', temp: 'warm', tags: ['moda', 'duotono', 'split', 'dramatico'],
  render(ctx, t, env) {
    const { pal } = env
    // diagonal duotono: dos campos accent/accent2 separados por una linea limpia que respira
    const split = 0.5 + Math.sin(t * CLK * 0.16) * 0.04
    const a = -0.32 // pendiente de la diagonal
    ctx.fillStyle = pal.bg1; ctx.fillRect(0, 0, W, H)
    // campo 1 (arriba-izq)
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(0, 0); ctx.lineTo(W, 0); ctx.lineTo(W, H * split + W * a); ctx.lineTo(0, H * split); ctx.closePath(); ctx.clip()
    const g1 = ctx.createLinearGradient(0, 0, W, H)
    g1.addColorStop(0, isLight(pal) ? lighten(pal.accent, 0.45) : darken(pal.accent, 0.35))
    g1.addColorStop(1, pal.bg0)
    ctx.fillStyle = g1; ctx.fillRect(0, 0, W, H)
    ctx.restore()
    // campo 2 (abajo-der)
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(0, H * split); ctx.lineTo(W, H * split + W * a); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.clip()
    const g2 = ctx.createLinearGradient(0, 0, W, H)
    g2.addColorStop(0, pal.bg1)
    g2.addColorStop(1, isLight(pal) ? lighten(pal.accent2, 0.4) : darken(pal.accent2, 0.45))
    ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H)
    ctx.restore()
    // hairline divisoria
    ctx.strokeStyle = hair(pal, isLight(pal) ? 0.18 : 0.22); ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(0, H * split); ctx.lineTo(W, H * split + W * a); ctx.stroke()
    centerScrim(ctx, pal, 0.6)
  },
})

register({
  id: 'bg.moda.satinsheen', lib: 'backgrounds', category: 'gradient-fields', tones: ['dark', 'light'], rubros: ['moda', 'default'], weight: 0.95,
  register: 'editorial', intensity: 'soft', temp: 'warm', tags: ['moda', 'satin', 'sheen', 'lujo'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'satin')
    rampBg(ctx, pal, 110)
    // wash diagonal de acento para dar cuerpo a la tela (sutil pero visible en ambos tonos)
    const wg = ctx.createLinearGradient(0, 0, W, H)
    wg.addColorStop(0, rgba(isLight(pal) ? darken(pal.accent, 0.05) : pal.accent, isLight(pal) ? 0.1 : 0.08))
    wg.addColorStop(0.55, rgba(pal.accent, 0))
    wg.addColorStop(1, rgba(isLight(pal) ? darken(pal.accent2, 0.05) : pal.accent2, isLight(pal) ? 0.1 : 0.08))
    ctx.fillStyle = wg; ctx.fillRect(0, 0, W, H)
    // bandas de brillo satinado que recorren la tela en diagonal (lento)
    ctx.save(); ctx.globalCompositeOperation = isLight(pal) ? 'multiply' : 'screen'
    const bands = 4
    for (let i = 0; i < bands; i++) {
      const ph = r() * TAU
      const p = ((t * CLK * 0.06 + i / bands + Math.sin(ph) * 0.1) % 1 + 1) % 1
      const x = -W * 0.5 + p * W * 2
      const col = isLight(pal) ? darken(i % 2 ? pal.accent2 : pal.accent, 0.05) : (i % 2 ? pal.accent2 : pal.accent)
      const g = ctx.createLinearGradient(x, 0, x + W * 0.5, H)
      g.addColorStop(0, rgba(col, 0))
      g.addColorStop(0.5, rgba(col, isLight(pal) ? 0.16 : 0.12))
      g.addColorStop(1, rgba(col, 0))
      ctx.fillStyle = g
      ctx.save(); ctx.translate(x, 0); ctx.transform(1, 0, -0.4, 1, 0, 0); ctx.fillRect(-W, -H, W * 0.6, H * 3); ctx.restore()
    }
    ctx.restore()
    centerScrim(ctx, pal, 0.5)
  },
})

register({
  id: 'bg.moda.spotlightcouture', lib: 'backgrounds', category: 'gradient-fields', tones: ['dark', 'light'], rubros: ['moda', 'default'], weight: 0.9,
  register: 'editorial', intensity: 'soft', temp: 'warm', tags: ['moda', 'spotlight', 'dramatico', 'aire'],
  render(ctx, t, env) {
    const { pal } = env
    // foco superior dramatico (vidriera/estudio): luz que cae desde arriba, mucho aire al centro
    ctx.fillStyle = pal.bg1; ctx.fillRect(0, 0, W, H)
    const cx = W / 2 + Math.sin(t * CLK * 0.2) * 20, cy = H * 0.16
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, H * 0.95)
    g.addColorStop(0, isLight(pal) ? lighten(pal.bg0, 0.4) : lighten(pal.bg0, 0.16))
    g.addColorStop(0.45, pal.bg0)
    g.addColorStop(1, pal.bg1)
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    // tinte de acento muy tenue en el haz
    const gl = ctx.createRadialGradient(cx, cy, 0, cx, cy, H * 0.5)
    gl.addColorStop(0, rgba(pal.accent, isLight(pal) ? 0.05 : 0.08)); gl.addColorStop(1, rgba(pal.accent, 0))
    ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H)
    // sombra de piso para anclar
    const fg = ctx.createLinearGradient(0, H * 0.78, 0, H)
    fg.addColorStop(0, rgba('#000000', 0)); fg.addColorStop(1, rgba('#000000', isLight(pal) ? 0.08 : 0.5))
    ctx.fillStyle = fg; ctx.fillRect(0, H * 0.78, W, H * 0.22)
  },
})

// =====================================================================================
// geometric-graphic — editorial swiss, marcos, columnas, lineas de revista
// =====================================================================================

register({
  id: 'bg.moda.editorialframe', lib: 'backgrounds', category: 'geometric-graphic', tones: ['dark', 'light'], rubros: ['moda', 'default'], weight: 1,
  register: 'editorial', intensity: 'calm', temp: 'warm', tags: ['moda', 'editorial', 'marco', 'minimal', 'swiss'],
  render(ctx, t, env) {
    const { pal } = env
    rampBg(ctx, pal, 90)
    // marco fino de revista con margenes amplios (aire), esquinas con ticks
    const m = Math.round(W * 0.085)
    ctx.strokeStyle = hair(pal, isLight(pal) ? 0.28 : 0.34); ctx.lineWidth = 1.2
    ctx.strokeRect(m, m, W - 2 * m, H - 2 * m)
    // ticks de acento que laten suave en las esquinas
    const pulse = 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(t * CLK * 0.5))
    ctx.strokeStyle = rgba(pal.accent, 0.55 * pulse); ctx.lineWidth = 2
    const tk = 16
    const corners = [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]]
    for (const [x, y, sx, sy] of corners) {
      ctx.beginPath(); ctx.moveTo(x, y + sy * tk); ctx.lineTo(x, y); ctx.lineTo(x + sx * tk, y); ctx.stroke()
    }
    // linea base superior con un guion (estilo cabecera de revista)
    ctx.strokeStyle = hair(pal, isLight(pal) ? 0.16 : 0.2); ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(m, m + 22); ctx.lineTo(W - m, m + 22); ctx.stroke()
  },
})

register({
  id: 'bg.moda.columnsgrid', lib: 'backgrounds', category: 'geometric-graphic', tones: ['dark', 'light'], rubros: ['moda', 'default'], weight: 0.9,
  register: 'corporate', intensity: 'calm', temp: 'warm', tags: ['moda', 'columnas', 'grilla', 'editorial', 'swiss'],
  render(ctx, t, env) {
    const { pal } = env
    rampBg(ctx, pal, 90)
    // grilla de columnas editorial (12 cols con gutters), hairlines tenues que respiran de opacidad
    const cols = 6
    const breathe = 0.7 + 0.3 * (0.5 + 0.5 * Math.sin(t * CLK * 0.4))
    ctx.strokeStyle = hair(pal, (isLight(pal) ? 0.14 : 0.11) * breathe); ctx.lineWidth = 1
    for (let i = 1; i < cols; i++) {
      const x = (i / cols) * W
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke()
    }
    // bandas de acento tenues en ambos bordes laterales (detalle, centro limpio)
    const ax = (cols - 1) / cols * W
    const aCol = isLight(pal) ? darken(pal.accent, 0.08) : pal.accent
    const g = ctx.createLinearGradient(ax, 0, W, 0)
    g.addColorStop(0, rgba(aCol, 0)); g.addColorStop(1, rgba(aCol, isLight(pal) ? 0.12 : 0.09))
    ctx.fillStyle = g; ctx.fillRect(ax, 0, W - ax, H)
    const lw = W / cols
    const g2 = ctx.createLinearGradient(0, 0, lw, 0)
    g2.addColorStop(0, rgba(isLight(pal) ? darken(pal.accent2, 0.08) : pal.accent2, isLight(pal) ? 0.1 : 0.07)); g2.addColorStop(1, rgba(pal.accent2, 0))
    ctx.fillStyle = g2; ctx.fillRect(0, 0, lw, H)
  },
})

register({
  id: 'bg.moda.diagonalbars', lib: 'backgrounds', category: 'geometric-graphic', tones: ['dark', 'light'], rubros: ['moda', 'default'], weight: 0.85,
  register: 'editorial', intensity: 'medium', temp: 'warm', tags: ['moda', 'diagonal', 'barras', 'dinamico'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'diag')
    rampBg(ctx, pal, 60)
    // barras diagonales delgadas concentradas en bordes (detalle), centro limpio
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(-0.5); ctx.translate(-W / 2, -H / 2)
    const drift = (t * CLK * 4) % 80
    for (let x = -H; x < W + H; x += 80) {
      const xx = x + drift
      // distancia al centro horizontal -> menos opacidad cerca del centro
      const dc = Math.abs((xx - W / 2) / (W / 2))
      const a = (isLight(pal) ? 0.05 : 0.07) * clamp(dc * 1.2, 0, 1)
      const col = (Math.floor(x / 80) % 3 === 0) ? pal.accent : hair(pal, 1) === '#fff' ? pal.accent2 : pal.accent2
      ctx.fillStyle = rgba(col, a)
      ctx.fillRect(xx, -H, 26, H * 3)
    }
    ctx.restore()
    centerScrim(ctx, pal, 0.5)
  },
})

register({
  id: 'bg.moda.bauhausmod', lib: 'backgrounds', category: 'geometric-graphic', tones: ['dark', 'light'], rubros: ['moda', 'default'], weight: 0.8,
  register: 'playful', intensity: 'bold', temp: 'warm', tags: ['moda', 'bauhaus', 'formas', 'editorial', 'arte'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'bau')
    rampBg(ctx, pal, 90)
    // formas grandes simples (circulo, cuarto, barra) en las esquinas -> centro despejado
    ctx.save(); ctx.globalAlpha = isLight(pal) ? 0.5 : 0.55
    // circulo superior derecho
    const rot = t * CLK * 0.05
    ctx.fillStyle = rgba(pal.accent, isLight(pal) ? 0.5 : 0.4)
    ctx.beginPath(); ctx.arc(W * 0.9, H * 0.12, W * 0.22, 0, TAU); ctx.fill()
    // medio circulo inferior izquierdo girando lento
    ctx.fillStyle = rgba(pal.accent2, isLight(pal) ? 0.45 : 0.38)
    ctx.save(); ctx.translate(W * 0.08, H * 0.92); ctx.rotate(rot)
    ctx.beginPath(); ctx.arc(0, 0, W * 0.26, -Math.PI / 2, Math.PI / 2); ctx.fill(); ctx.restore()
    // barra vertical fina a la izquierda
    ctx.fillStyle = hair(pal, isLight(pal) ? 0.4 : 0.3)
    ctx.fillRect(W * 0.16, 0, 4, H)
    ctx.restore()
    centerScrim(ctx, pal, 0.7)
  },
})

// =====================================================================================
// linework — hairlines, contornos, alta costura minimal
// =====================================================================================

register({
  id: 'bg.moda.contourlines', lib: 'backgrounds', category: 'linework', tones: ['dark', 'light'], rubros: ['moda', 'default'], weight: 0.9,
  register: 'editorial', intensity: 'soft', temp: 'warm', tags: ['moda', 'lineas', 'curvas', 'organico', 'elegante'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'cont')
    rampBg(ctx, pal, 90)
    // contornos sinuosos tipo tela/curva-de-cuerpo, apilados, ondulando lento
    const lines = 16
    ctx.lineWidth = 1.1
    const basePh = r() * TAU
    for (let i = 0; i < lines; i++) {
      const yy = (i / (lines - 1)) * H * 1.05 - H * 0.025
      const dc = Math.abs((yy / H) - 0.5) * 2 // 0 centro, 1 bordes
      const a = (isLight(pal) ? 0.16 : 0.14) * clamp(0.3 + dc, 0.22, 1)
      ctx.strokeStyle = (i % 4 === 0) ? rgba(isLight(pal) ? darken(pal.accent, 0.1) : pal.accent, a * 1.4) : hair(pal, a)
      ctx.beginPath()
      for (let x = 0; x <= W; x += 8) {
        const y = yy + Math.sin(x * 0.012 + i * 0.5 + t * CLK * 0.3 + basePh) * (10 + i * 0.6) + Math.sin(x * 0.03 + basePh) * 4
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
  },
})

register({
  id: 'bg.moda.threadweave', lib: 'backgrounds', category: 'linework', tones: ['dark', 'light'], rubros: ['moda', 'default'], weight: 0.8,
  register: 'editorial', intensity: 'soft', temp: 'warm', tags: ['moda', 'hilos', 'textura', 'tejido', 'minimal'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'thread')
    rampBg(ctx, pal, 80)
    // hilos finos verticales + horizontales (trama de tela), densidad mayor a los bordes
    ctx.save(); ctx.globalCompositeOperation = isLight(pal) ? 'multiply' : 'screen'
    const sway = Math.sin(t * CLK * 0.25) * 3
    const stepV = 9
    for (let x = 0; x <= W; x += stepV) {
      const dc = Math.abs((x / W) - 0.5) * 2
      const a = (isLight(pal) ? 0.12 : 0.08) * clamp(0.25 + dc * 1.1, 0.2, 1)
      ctx.strokeStyle = rgba((Math.floor(x / stepV) % 7 === 0) ? (isLight(pal) ? darken(pal.accent, 0.1) : pal.accent) : (isLight(pal) ? '#000000' : '#ffffff'), a)
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(x + sway, 0); ctx.lineTo(x - sway, H); ctx.stroke()
    }
    const stepH = 14
    for (let y = 0; y <= H; y += stepH) {
      const dc = Math.abs((y / H) - 0.5) * 2
      const a = (isLight(pal) ? 0.08 : 0.06) * clamp(0.25 + dc, 0.2, 1)
      ctx.strokeStyle = rgba(isLight(pal) ? '#000000' : '#ffffff', a)
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
    }
    ctx.restore()
  },
})

register({
  id: 'bg.moda.arcsuite', lib: 'backgrounds', category: 'linework', tones: ['dark', 'light'], rubros: ['moda', 'default'], weight: 0.85,
  register: 'editorial', intensity: 'soft', temp: 'warm', tags: ['moda', 'arcos', 'lineas', 'elegante', 'aire'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'arc')
    rampBg(ctx, pal, 100)
    // arcos concentricos finos anclados a una esquina (deco/couture), centro despejado
    const ox = r() < 0.5 ? W * 0.02 : W * 0.98
    const oy = H * 1.02
    const rings = 12
    const breathe = Math.sin(t * CLK * 0.3) * 6
    for (let i = 0; i < rings; i++) {
      const rad = (i + 1) / rings * H * 1.1 + breathe * (i / rings)
      const a = (isLight(pal) ? 0.18 : 0.13) * (0.4 + 0.6 * (i / rings))
      ctx.strokeStyle = (i % 3 === 0) ? rgba(isLight(pal) ? darken(pal.accent, 0.1) : pal.accent, a * 1.3) : hair(pal, a)
      ctx.lineWidth = 1.2
      ctx.beginPath(); ctx.arc(ox, oy, rad, Math.PI, TAU); ctx.stroke()
    }
  },
})

// =====================================================================================
// retro-print — halftone, riso, print fashion
// =====================================================================================

register({
  id: 'bg.moda.halftonefade', lib: 'backgrounds', category: 'retro-print', tones: ['dark', 'light'], rubros: ['moda', 'default'], weight: 0.95,
  register: 'editorial', intensity: 'medium', temp: 'warm', tags: ['moda', 'halftone', 'print', 'puntos', 'editorial'],
  render(ctx, t, env) {
    const { pal } = env
    // halftone que se densifica desde abajo (degrade de puntos), centro/arriba limpio para el texto
    ctx.fillStyle = isLight(pal) ? pal.bg0 : pal.bg1; ctx.fillRect(0, 0, W, H)
    const step = 12, drift = t * CLK * 0.6
    ctx.fillStyle = rgba(pal.accent, isLight(pal) ? 0.5 : 0.5)
    for (let y = 0; y < H + step; y += step) {
      // densidad crece hacia abajo
      const dens = clamp((y / H - 0.35) / 0.65, 0, 1)
      for (let x = 0; x < W + step; x += step) {
        const px = x + ((Math.round(y / step)) % 2) * (step / 2)
        const wob = Math.sin(x * 0.05 + y * 0.04 + drift) * 0.12
        const rad = (dens + wob) * (step * 0.5)
        if (rad < 0.4) continue
        ctx.beginPath(); ctx.arc(px, y, Math.min(rad, step * 0.5), 0, TAU); ctx.fill()
      }
    }
  },
})

register({
  id: 'bg.moda.risoribbon', lib: 'backgrounds', category: 'retro-print', tones: ['dark', 'light'], rubros: ['moda', 'default'], weight: 0.8,
  register: 'playful', intensity: 'bold', temp: 'warm', tags: ['moda', 'riso', 'cinta', 'duotono', 'print'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'riso')
    rampBg(ctx, pal, 90)
    // dos cintas riso (duotono) anchas que cruzan arriba y abajo con misregistro (offset de color), centro libre
    const drawRibbon = (yc, h, col, dir, phase) => {
      const off = Math.sin(t * CLK * 0.3 + phase) * 6
      // capa 1
      ctx.fillStyle = rgba(col, isLight(pal) ? 0.42 : 0.4)
      ribbonPath(ctx, yc, h, dir, phase, 0, 0); ctx.fill()
      // capa 2 desplazada (misregistro riso)
      ctx.globalCompositeOperation = isLight(pal) ? 'multiply' : 'screen'
      ctx.fillStyle = rgba(col === pal.accent ? pal.accent2 : pal.accent, isLight(pal) ? 0.3 : 0.32)
      ribbonPath(ctx, yc, h, dir, phase, off + 5, 4); ctx.fill()
      ctx.globalCompositeOperation = 'source-over'
    }
    drawRibbon(H * 0.16, H * 0.1, pal.accent, 1, 0)
    drawRibbon(H * 0.86, H * 0.11, pal.accent2, -1, 2.1)
  },
})
function ribbonPath(ctx, yc, h, dir, phase, dx, dy) {
  ctx.beginPath()
  for (let x = -10; x <= W + 10; x += 10) {
    const y = yc + Math.sin(x * 0.01 * dir + phase) * (h * 0.4) + dy
    x === -10 ? ctx.moveTo(x + dx, y - h / 2) : ctx.lineTo(x + dx, y - h / 2)
  }
  for (let x = W + 10; x >= -10; x -= 10) {
    const y = yc + Math.sin(x * 0.01 * dir + phase) * (h * 0.4) + dy
    ctx.lineTo(x + dx, y + h / 2)
  }
  ctx.closePath()
}

register({
  id: 'bg.moda.papergrain', lib: 'backgrounds', category: 'retro-print', tones: ['dark', 'light'], rubros: ['moda', 'default'], weight: 0.85,
  register: 'editorial', intensity: 'calm', temp: 'warm', tags: ['moda', 'papel', 'grano', 'textura', 'minimal'],
  render(ctx, t, env) {
    const { pal } = env, r = mulberry32(env.seed ^ 0x9e3779b9)
    rampBg(ctx, pal, 95)
    // grano de papel editorial (motas finas deterministas) + flotacion casi imperceptible via t
    const N = 1100
    const fl = Math.sin(t * CLK * 0.4)
    // wash de acento suave en una esquina para dar tono editorial al papel
    const cg = ctx.createRadialGradient(W * 0.85, H * 0.12, 0, W * 0.85, H * 0.12, H * 0.7)
    cg.addColorStop(0, rgba(isLight(pal) ? darken(pal.accent, 0.05) : pal.accent, isLight(pal) ? 0.09 : 0.08)); cg.addColorStop(1, rgba(pal.accent, 0))
    ctx.fillStyle = cg; ctx.fillRect(0, 0, W, H)
    ctx.save()
    for (let i = 0; i < N; i++) {
      const x = r() * W, y = r() * H
      const dc = Math.abs((y / H) - 0.46) * 2
      const a = (isLight(pal) ? 0.1 : 0.07) * (0.3 + 0.7 * clamp(dc, 0, 1)) * (0.6 + 0.4 * r())
      ctx.fillStyle = rgba((r() < 0.14) ? (isLight(pal) ? darken(pal.accent, 0.1) : pal.accent) : (isLight(pal) ? '#000000' : '#ffffff'), a)
      const s = r() < 0.5 ? 1 : 1.5
      ctx.fillRect(x, y + fl * (r() - 0.5) * 1.5, s, s)
    }
    ctx.restore()
  },
})

// =====================================================================================
// atmospheric-organic — niebla, sheen, humo de pasarela
// =====================================================================================

register({
  id: 'bg.moda.silkfold', lib: 'backgrounds', category: 'atmospheric-organic', tones: ['dark', 'light'], rubros: ['moda', 'default'], weight: 1,
  register: 'editorial', intensity: 'soft', temp: 'warm', tags: ['moda', 'seda', 'pliegues', 'lujo', 'fluido'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'silk')
    rampBg(ctx, pal, 115)
    // pliegues de seda: bandas verticales suaves de luz/sombra que ondulan (drapeado)
    ctx.save(); ctx.globalCompositeOperation = isLight(pal) ? 'multiply' : 'screen'
    const folds = 7
    for (let i = 0; i < folds; i++) {
      const ph = r() * TAU
      const cx = (i + 0.5) / folds * W + Math.sin(t * CLK * 0.2 + ph) * 14
      const wob = 40 + Math.sin(t * CLK * 0.25 + ph) * 8
      const col = i % 2 ? pal.accent2 : pal.accent
      const g = ctx.createLinearGradient(cx - wob, 0, cx + wob, 0)
      g.addColorStop(0, rgba(col, 0))
      g.addColorStop(0.5, rgba(col, isLight(pal) ? 0.06 : 0.085))
      g.addColorStop(1, rgba(col, 0))
      ctx.fillStyle = g; ctx.fillRect(cx - wob, 0, wob * 2, H)
    }
    ctx.restore()
    centerScrim(ctx, pal, 0.5)
  },
})

register({
  id: 'bg.moda.runwaysmoke', lib: 'backgrounds', category: 'atmospheric-organic', tones: ['dark'], rubros: ['moda', 'default'], weight: 0.85,
  register: 'editorial', intensity: 'medium', temp: 'warm', tags: ['moda', 'humo', 'dramatico', 'pasarela', 'oscuro'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'smk')
    ctx.fillStyle = pal.bg1; ctx.fillRect(0, 0, W, H)
    // humo bajo dramatico (solo dark): plumas que suben desde el piso
    ctx.save(); ctx.globalCompositeOperation = 'screen'
    const M = 7
    for (let i = 0; i < M; i++) {
      const ph = r() * TAU, sp = range(r, 0.15, 0.4)
      const bx = W * (0.15 + r() * 0.7) + Math.cos(t * CLK * sp + ph) * 50
      const by = H * (0.7 + r() * 0.35) + Math.sin(t * CLK * sp * 0.7 + ph) * 50
      const rad = H * (0.2 + r() * 0.18)
      const col = i % 3 === 0 ? pal.accent : (i % 3 === 1 ? pal.accent2 : lighten(pal.bg0, 0.3))
      const gr = ctx.createRadialGradient(bx, by, 0, bx, by, rad)
      gr.addColorStop(0, rgba(col, 0.08)); gr.addColorStop(0.5, rgba(col, 0.035)); gr.addColorStop(1, rgba(col, 0))
      ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H)
    }
    ctx.restore()
    // foco superior para dejar aire arriba
    const g = ctx.createRadialGradient(W / 2, H * 0.2, 0, W / 2, H * 0.2, H * 0.6)
    g.addColorStop(0, rgba(lighten(pal.bg0, 0.2), 0.3)); g.addColorStop(1, rgba(pal.bg0, 0))
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
  },
})

register({
  id: 'bg.moda.glamourbokeh', lib: 'backgrounds', category: 'atmospheric-organic', tones: ['dark', 'light'], rubros: ['moda', 'default'], weight: 0.85,
  register: 'friendly', intensity: 'soft', temp: 'warm', tags: ['moda', 'bokeh', 'brillo', 'glamour', 'fiesta'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'bok')
    rampBg(ctx, pal, 110)
    // bokeh suave de luces (glamour/noche) concentrado arriba y bordes, centro despejado
    ctx.save(); ctx.globalCompositeOperation = isLight(pal) ? 'multiply' : 'screen'
    const N = 22
    for (let i = 0; i < N; i++) {
      const ph = r() * TAU
      const bx = r() * W, by = r() * H
      const dc = Math.abs((by / H) - 0.46) * 2 // lejos del centro = mas visible
      const rad = range(r, 8, 34)
      const tw = 0.5 + 0.5 * Math.sin(t * CLK * range(r, 0.4, 0.9) + ph)
      const a = (isLight(pal) ? 0.16 : 0.12) * clamp(0.3 + dc, 0.25, 1) * tw
      const col = isLight(pal) ? darken(i % 3 === 0 ? pal.accent2 : pal.accent, 0.05) : (i % 3 === 0 ? pal.accent2 : pal.accent)
      const gr = ctx.createRadialGradient(bx, by, 0, bx, by, rad)
      gr.addColorStop(0, rgba(col, a)); gr.addColorStop(0.7, rgba(col, a * 0.4)); gr.addColorStop(1, rgba(col, 0))
      ctx.fillStyle = gr; ctx.fillRect(bx - rad, by - rad, rad * 2, rad * 2)
    }
    ctx.restore()
  },
})

// =====================================================================================
// morph-hero — gran forma fashion (silueta blob editorial) hacia un lado
// =====================================================================================

register({
  id: 'bg.moda.coutureblob', lib: 'backgrounds', category: 'morph-hero', tones: ['dark', 'light'], rubros: ['moda', 'default'], weight: 0.9,
  register: 'editorial', intensity: 'medium', temp: 'warm', tags: ['moda', 'forma', 'organico', 'editorial', 'lateral'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'blob')
    rampBg(ctx, pal, 90)
    // gran forma organica suave a un costado (deja el centro/lado opuesto para el texto)
    const side = r() < 0.5 ? 0 : 1
    const cx = side ? W * 1.02 : W * -0.02
    const cy = H * (0.4 + r() * 0.2)
    const baseR = H * 0.5
    ctx.save()
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseR * 1.3)
    const col = isLight(pal) ? darken(pal.accent, 0.08) : pal.accent
    grad.addColorStop(0, rgba(col, isLight(pal) ? 0.26 : 0.22))
    grad.addColorStop(0.6, rgba(col, isLight(pal) ? 0.12 : 0.1))
    grad.addColorStop(1, rgba(col, 0))
    ctx.fillStyle = grad
    ctx.beginPath()
    const pts = 7, phs = Array.from({ length: pts }, () => r() * TAU)
    for (let i = 0; i <= pts; i++) {
      const ang = (i / pts) * TAU
      const wob = 1 + 0.18 * Math.sin(t * CLK * 0.3 + phs[i % pts])
      const rr = baseR * wob
      const x = cx + Math.cos(ang) * rr, y = cy + Math.sin(ang) * rr
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.closePath(); ctx.fill()
    ctx.restore()
    centerScrim(ctx, pal, 0.45)
  },
})

register({
  id: 'bg.moda.ribbondrape', lib: 'backgrounds', category: 'morph-hero', tones: ['dark', 'light'], rubros: ['moda', 'default'], weight: 0.85,
  register: 'editorial', intensity: 'medium', temp: 'warm', tags: ['moda', 'cinta', 'drapeado', 'fluido', 'elegante'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'drape')
    rampBg(ctx, pal, 120)
    // una cinta amplia que cruza en diagonal como tela drapeada, con sombra propia
    const ph = r() * TAU
    const drawBand = (offset, col, alpha) => {
      ctx.beginPath()
      const amp = 70, baseY = H * 0.5
      for (let x = -20; x <= W + 20; x += 12) {
        const y = baseY + Math.sin(x * 0.008 + ph + t * CLK * 0.2) * amp + offset
        x === -20 ? ctx.moveTo(x, y - 60) : ctx.lineTo(x, y - 60)
      }
      for (let x = W + 20; x >= -20; x -= 12) {
        const y = baseY + Math.sin(x * 0.008 + ph + t * CLK * 0.2) * amp + offset
        ctx.lineTo(x, y + 60)
      }
      ctx.closePath()
      ctx.fillStyle = rgba(col, alpha)
      ctx.fill()
    }
    // sombra
    drawBand(14, isLight(pal) ? '#000000' : '#000000', isLight(pal) ? 0.06 : 0.25)
    // cinta principal
    drawBand(0, pal.accent, isLight(pal) ? 0.16 : 0.2)
    // brillo de borde
    ctx.globalCompositeOperation = isLight(pal) ? 'multiply' : 'screen'
    drawBand(-22, pal.accent2, isLight(pal) ? 0.1 : 0.14)
    ctx.globalCompositeOperation = 'source-over'
    centerScrim(ctx, pal, 0.55)
  },
})
