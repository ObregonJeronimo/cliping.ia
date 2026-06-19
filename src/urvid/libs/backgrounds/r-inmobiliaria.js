// urvid 1.0 · BACKGROUNDS — rubro INMOBILIARIA. Archivo propio (no pisa index.js ni otros agentes).
// Vibe: arquitectura, blueprint/planos, marcos/ventanas, perspectiva sutil, materiales, gradientes calidos neutros.
// Premium-calmo: detalle hacia los bordes, centro SUAVE (cuida el contraste del texto). Determinista (mulberry32/seedFor + t).
import { register } from '../../core/registry.js'
import { mulberry32, seedFor, range, irange } from '../../core/prng.js'
import { W, H, TAU, rgba, lighten, darken, clamp, lerp, mix, hexToHsl, hslToHex } from '../../core/util.js'

const CLK = 0.6   // reloj global lento (mismo que el resto de la biblioteca) -> vida sutil, no distrae

// --- helpers locales (no importo los privados de index.js) ---
function rampBg(ctx, pal, angled = false) {
  const g = angled ? ctx.createLinearGradient(0, 0, W, H) : ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, pal.bg0); g.addColorStop(1, pal.bg1)
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
}
// scrim de legibilidad: aclara/oscurece el centro segun tono para que el texto respire
function scrim(ctx, pal, { centerClear = 0.34, strength = null } = {}) {
  const s = strength == null ? (pal.tone === 'light' ? 0.2 : 0.4) : strength
  const v = ctx.createRadialGradient(W / 2, H * 0.46, H * centerClear, W / 2, H * 0.5, H * 0.84)
  v.addColorStop(0, 'rgba(0,0,0,0)')
  v.addColorStop(1, pal.tone === 'light' ? `rgba(255,255,255,${s})` : `rgba(0,0,0,${s})`)
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H)
}
// linea fina tone-aware (tinta sutil en claro, acento tenue en oscuro)
function lineCol(pal, aLight = 0.06, aDark = 0.09, useAccent = true) {
  const c = pal.tone === 'light' ? (useAccent ? darken(pal.accent, 0.2) : '#1c1510') : (useAccent ? pal.accent : '#ffffff')
  return rgba(c, pal.tone === 'light' ? aLight : aDark)
}

// =====================================================================================
// gradient-fields — gradientes calidos neutros, luz de ventana
// =====================================================================================

register({
  id: 'bg.inmobiliaria.warmcanvas', lib: 'backgrounds', category: 'gradient-fields', tones: ['dark', 'light'],
  rubros: ['inmobiliaria', 'default'], weight: 1.05, register: 'editorial', intensity: 'calm',
  tags: ['inmobiliaria', 'gradiente', 'calido', 'calmo', 'premium'],
  render(ctx, t, env) {
    const { pal } = env
    rampBg(ctx, pal)
    // baño de luz calida desde una esquina alta (sol de ventana) que deriva muy lento
    const ox = W * (0.72 + Math.sin(t * CLK * 0.12) * 0.04), oy = H * (0.12 + Math.cos(t * CLK * 0.1) * 0.02)
    const warm = pal.tone === 'light' ? hslToHex(38, 0.5, 0.9) : hslToHex(34, 0.4, 0.5)
    const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, H * 0.95)
    g.addColorStop(0, rgba(warm, pal.tone === 'light' ? 0.5 : 0.22))
    g.addColorStop(0.5, rgba(warm, pal.tone === 'light' ? 0.16 : 0.08))
    g.addColorStop(1, rgba(warm, 0))
    ctx.save(); ctx.globalCompositeOperation = pal.tone === 'light' ? 'multiply' : 'screen'
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore()
    // pie en sombra para anclar (piso/horizonte)
    const fl = ctx.createLinearGradient(0, H * 0.72, 0, H)
    fl.addColorStop(0, rgba(pal.bg1, 0)); fl.addColorStop(1, rgba(darken(pal.bg1, 0.2), pal.tone === 'light' ? 0.4 : 0.55))
    ctx.fillStyle = fl; ctx.fillRect(0, H * 0.72, W, H * 0.28)
    scrim(ctx, pal, { centerClear: 0.36, strength: pal.tone === 'light' ? 0.1 : 0.22 })
  },
})

register({
  id: 'bg.inmobiliaria.skylineglow', lib: 'backgrounds', category: 'gradient-fields', tones: ['dark', 'light'],
  rubros: ['inmobiliaria', 'default'], weight: 0.95, register: 'corporate', intensity: 'soft',
  tags: ['inmobiliaria', 'skyline', 'ciudad', 'gradiente', 'horizonte'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'sky')
    // cielo: rampa vertical hacia el horizonte
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, pal.bg0); g.addColorStop(0.62, lighten(pal.bg1, pal.tone === 'light' ? 0.02 : 0.06)); g.addColorStop(1, pal.bg1)
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    // resplandor de horizonte (atardecer urbano) sobre la linea de edificios
    const hy = H * 0.74
    const hg = ctx.createLinearGradient(0, hy - H * 0.18, 0, hy)
    const warm = pal.tone === 'light' ? hslToHex(30, 0.5, 0.85) : hslToHex(28, 0.55, 0.45)
    hg.addColorStop(0, rgba(warm, 0)); hg.addColorStop(1, rgba(warm, pal.tone === 'light' ? 0.3 : 0.3))
    ctx.fillStyle = hg; ctx.fillRect(0, hy - H * 0.18, W, H * 0.18)
    // siluetas de edificios en la franja baja (lejos del centro -> no molesta el texto)
    const silCol = pal.tone === 'light' ? rgba(darken(pal.accent, 0.1), 0.16) : rgba(darken(pal.bg1, 0.5), 0.85)
    ctx.fillStyle = silCol
    let x = -10
    while (x < W + 10) {
      const bw = range(r, 26, 56), bh = range(r, H * 0.08, H * 0.22)
      const breathe = 1 + Math.sin(t * CLK * 0.18 + x * 0.05) * 0.01
      ctx.fillRect(x, hy - bh * breathe, bw, bh * breathe + (H - hy))
      x += bw + range(r, 2, 8)
    }
    scrim(ctx, pal, { centerClear: 0.4, strength: pal.tone === 'light' ? 0.08 : 0.18 })
  },
})

// =====================================================================================
// architectural-lines — blueprint / planos / lineas de construccion
// =====================================================================================

register({
  id: 'bg.inmobiliaria.blueprint', lib: 'backgrounds', category: 'architectural-lines', tones: ['dark', 'light'],
  rubros: ['inmobiliaria', 'default'], weight: 1.0, register: 'corporate', intensity: 'soft',
  tags: ['inmobiliaria', 'blueprint', 'plano', 'tecnico', 'grilla'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'bp')
    rampBg(ctx, pal)
    const drift = (t * CLK * 4) % 28
    // grilla fina + grilla gruesa cada 4 (papel de plano)
    const step = 28
    ctx.lineWidth = 1
    for (let pass = 0; pass < 2; pass++) {
      const big = pass === 1
      ctx.strokeStyle = lineCol(pal, big ? 0.08 : 0.04, big ? 0.13 : 0.06)
      ctx.lineWidth = big ? 1.2 : 0.8
      for (let i = 0, x = -drift; x < W; x += step, i++) { if (big !== (i % 4 === 0)) continue; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
      for (let j = 0, y = -drift; y < H; y += step, j++) { if (big !== (j % 4 === 0)) continue; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }
    }
    // un par de "plantas" esquematicas en las esquinas (rectangulos con cota), lejos del centro
    ctx.strokeStyle = rgba(pal.accent, pal.tone === 'light' ? 0.3 : 0.45); ctx.lineWidth = 1.4
    function room(px, py, w, h) {
      ctx.strokeRect(px, py, w, h)
      // hueco de puerta (gap)
      ctx.save(); ctx.strokeStyle = pal.tone === 'light' ? pal.bg0 : pal.bg1; ctx.lineWidth = 3
      ctx.beginPath(); ctx.moveTo(px + w * 0.4, py + h); ctx.lineTo(px + w * 0.62, py + h); ctx.stroke(); ctx.restore()
      // arco de puerta
      ctx.beginPath(); ctx.arc(px + w * 0.4, py + h, w * 0.22, -Math.PI / 2, 0); ctx.stroke()
    }
    room(W * 0.06, H * 0.08, W * 0.26, H * 0.14)
    room(W * 0.62, H * 0.78, W * 0.3, H * 0.15)
    // cursor de cota que recorre el plano (vida)
    const cx = W * (0.5 + 0.42 * Math.sin(t * CLK * 0.22))
    ctx.fillStyle = rgba(pal.accent, 0.5); ctx.beginPath(); ctx.arc(cx, H * 0.5, 2.4, 0, TAU); ctx.fill()
    scrim(ctx, pal, { centerClear: 0.34, strength: pal.tone === 'light' ? 0.14 : 0.26 })
  },
})

register({
  id: 'bg.inmobiliaria.floorplan', lib: 'backgrounds', category: 'architectural-lines', tones: ['dark', 'light'],
  rubros: ['inmobiliaria', 'default'], weight: 0.85, register: 'editorial', intensity: 'soft',
  tags: ['inmobiliaria', 'plano', 'planta', 'habitaciones', 'tecnico'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'fp')
    rampBg(ctx, pal)
    // planta de un departamento dibujada GRANDE pero como marco (paredes hacia los bordes, centro libre)
    ctx.save()
    ctx.translate(W * 0.5, H * 0.5)
    const sx = W * 0.84, sy = H * 0.66
    ctx.strokeStyle = rgba(pal.accent, pal.tone === 'light' ? 0.28 : 0.4); ctx.lineWidth = 2
    ctx.strokeRect(-sx / 2, -sy / 2, sx, sy)
    // divisiones interiores deterministas
    ctx.lineWidth = 1.3
    ctx.strokeStyle = lineCol(pal, 0.12, 0.2)
    // pared vertical desplazada
    const vx = -sx / 2 + sx * (0.34 + r() * 0.06)
    ctx.beginPath(); ctx.moveTo(vx, -sy / 2); ctx.lineTo(vx, sy * 0.1); ctx.stroke()
    // pared horizontal
    const hy = -sy / 2 + sy * (0.55 + r() * 0.08)
    ctx.beginPath(); ctx.moveTo(vx, hy); ctx.lineTo(sx / 2, hy); ctx.stroke()
    // simbolos de muebles tenues en las esquinas
    ctx.strokeStyle = rgba(pal.accent, pal.tone === 'light' ? 0.2 : 0.3); ctx.lineWidth = 1
    ctx.strokeRect(-sx / 2 + 12, -sy / 2 + 12, sx * 0.18, sy * 0.12)   // cama/sofa
    ctx.beginPath(); ctx.arc(sx / 2 - 30, sy / 2 - 30, 12, 0, TAU); ctx.stroke()  // mesa redonda
    // barrido de escaner que recorre la planta (vida sutil)
    const sweepY = (-sy / 2) + ((t * CLK * 18) % sy)
    const sg = ctx.createLinearGradient(0, sweepY - 30, 0, sweepY + 30)
    sg.addColorStop(0, rgba(pal.accent, 0)); sg.addColorStop(0.5, rgba(pal.accent, pal.tone === 'light' ? 0.12 : 0.16)); sg.addColorStop(1, rgba(pal.accent, 0))
    ctx.fillStyle = sg; ctx.fillRect(-sx / 2, sweepY - 30, sx, 60)
    ctx.restore()
    scrim(ctx, pal, { centerClear: 0.3, strength: pal.tone === 'light' ? 0.16 : 0.3 })
  },
})

register({
  id: 'bg.inmobiliaria.elevationlines', lib: 'backgrounds', category: 'architectural-lines', tones: ['dark', 'light'],
  rubros: ['inmobiliaria', 'default'], weight: 0.8, register: 'corporate', intensity: 'calm',
  tags: ['inmobiliaria', 'fachada', 'lineas', 'minimal', 'elevacion'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'elev')
    rampBg(ctx, pal)
    // lineas horizontales de "niveles" (pisos) que se condensan arriba (perspectiva sutil de fachada)
    const N = 16
    for (let i = 0; i < N; i++) {
      const f = i / (N - 1)
      const y = H * (0.06 + f * f * 0.88)   // mas juntas arriba
      ctx.strokeStyle = lineCol(pal, 0.05 + f * 0.05, 0.07 + f * 0.07)
      ctx.lineWidth = 0.8 + f * 0.6
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
    }
    // columnas verticales (mullions) a los costados
    const cols = 5
    for (let i = 0; i <= cols; i++) {
      const x = (i / cols) * W
      const edge = Math.abs(x / W - 0.5) * 2   // mas marcadas hacia los bordes
      ctx.strokeStyle = lineCol(pal, 0.03 + edge * 0.05, 0.04 + edge * 0.08)
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke()
    }
    // ventana iluminada que se enciende/apaga lento (vida)
    const wins = 4
    for (let i = 0; i < wins; i++) {
      const gx = r() * W, gy = H * (0.1 + r() * 0.8)
      const lit = 0.5 + 0.5 * Math.sin(t * CLK * 0.4 + i * 1.9)
      ctx.fillStyle = rgba(hslToHex(40, 0.6, pal.tone === 'light' ? 0.7 : 0.6), lit * (pal.tone === 'light' ? 0.18 : 0.3))
      ctx.fillRect(gx, gy, 14, 9)
    }
    scrim(ctx, pal, { centerClear: 0.36, strength: pal.tone === 'light' ? 0.1 : 0.2 })
  },
})

// =====================================================================================
// frames-windows — marcos, ventanas, mullions, perspectiva de cuarto
// =====================================================================================

register({
  id: 'bg.inmobiliaria.windowgrid', lib: 'backgrounds', category: 'frames-windows', tones: ['dark', 'light'],
  rubros: ['inmobiliaria', 'default'], weight: 0.95, register: 'editorial', intensity: 'soft',
  tags: ['inmobiliaria', 'ventana', 'marco', 'luz', 'fachada'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'win')
    rampBg(ctx, pal)
    // grilla de ventanas grandes (fachada de vidrio). luz calida detras, parteluces tone-aware.
    const cols = 3, rows = 5, gap = 6
    const cw = (W - gap * (cols + 1)) / cols, ch = (H - gap * (rows + 1)) / rows
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const x = gap + i * (cw + gap), y = gap + j * (ch + gap)
      // reflejo de cielo dentro del vidrio (gradiente diagonal tenue)
      const gg = ctx.createLinearGradient(x, y, x + cw, y + ch)
      const sky = pal.tone === 'light' ? lighten(pal.accent, 0.5) : lighten(pal.bg0, 0.06)
      gg.addColorStop(0, rgba(sky, pal.tone === 'light' ? 0.16 : 0.1)); gg.addColorStop(1, rgba(sky, 0))
      ctx.fillStyle = gg; ctx.fillRect(x, y, cw, ch)
      // alguna ventana con luz interior (parpadeo lento)
      const k = (i + j * cols)
      const lit = 0.5 + 0.5 * Math.sin(t * CLK * 0.3 + k * 1.3)
      if (((env.seed ^ (k * 2654435761)) >>> 0) % 5 === 0) {
        ctx.fillStyle = rgba(hslToHex(40, 0.55, pal.tone === 'light' ? 0.72 : 0.55), lit * (pal.tone === 'light' ? 0.14 : 0.22))
        ctx.fillRect(x, y, cw, ch)
      }
      // marco
      ctx.strokeStyle = lineCol(pal, 0.1, 0.16, false); ctx.lineWidth = 1.4
      ctx.strokeRect(x, y, cw, ch)
      // parteluz central
      ctx.beginPath(); ctx.moveTo(x + cw / 2, y); ctx.lineTo(x + cw / 2, y + ch); ctx.moveTo(x, y + ch / 2); ctx.lineTo(x + cw, y + ch / 2); ctx.stroke()
    }
    scrim(ctx, pal, { centerClear: 0.32, strength: pal.tone === 'light' ? 0.18 : 0.32 })
  },
})

register({
  id: 'bg.inmobiliaria.roomperspective', lib: 'backgrounds', category: 'frames-windows', tones: ['dark', 'light'],
  rubros: ['inmobiliaria', 'default'], weight: 0.8, register: 'editorial', intensity: 'soft',
  tags: ['inmobiliaria', 'perspectiva', 'cuarto', 'interior', 'profundidad'],
  render(ctx, t, env) {
    const { pal } = env
    rampBg(ctx, pal)
    // perspectiva de 1 punto: lineas de cuarto que convergen a un VP descentrado (no en el centro del texto)
    const vpx = W * (0.5 + Math.sin(t * CLK * 0.1) * 0.03), vpy = H * 0.46
    // pared del fondo (rectangulo claro) — la "ventana" iluminada al fondo
    const bw = W * 0.34, bh = H * 0.26
    const bg = ctx.createRadialGradient(vpx, vpy, 0, vpx, vpy, bw)
    const glow = pal.tone === 'light' ? hslToHex(40, 0.4, 0.92) : hslToHex(36, 0.35, 0.42)
    bg.addColorStop(0, rgba(glow, pal.tone === 'light' ? 0.32 : 0.28)); bg.addColorStop(1, rgba(glow, 0))
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)
    // lineas de fuga (piso, techo, zocalos) desde las 4 esquinas al VP
    ctx.strokeStyle = lineCol(pal, 0.07, 0.11); ctx.lineWidth = 1
    const corners = [[0, 0], [W, 0], [0, H], [W, H]]
    for (const [cx, cy] of corners) { ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(vpx, vpy); ctx.stroke() }
    // marco de la pared del fondo
    ctx.strokeStyle = rgba(pal.accent, pal.tone === 'light' ? 0.22 : 0.32); ctx.lineWidth = 1.4
    ctx.strokeRect(vpx - bw / 2, vpy - bh / 2, bw, bh)
    // baldosas del piso (lineas transversales) que se acercan -> sensacion de avanzar
    ctx.strokeStyle = lineCol(pal, 0.05, 0.08); ctx.lineWidth = 1
    const phase = (t * CLK * 0.15) % 1
    for (let i = 1; i <= 7; i++) {
      const f = ((i - phase) / 7)
      if (f <= 0 || f >= 1) continue
      const y = lerp(vpy + bh / 2, H, f * f)
      ctx.globalAlpha = clamp(f * 1.4, 0, 1)
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
    }
    ctx.globalAlpha = 1
    scrim(ctx, pal, { centerClear: 0.3, strength: pal.tone === 'light' ? 0.14 : 0.28 })
  },
})

register({
  id: 'bg.inmobiliaria.archframe', lib: 'backgrounds', category: 'frames-windows', tones: ['dark', 'light'],
  rubros: ['inmobiliaria', 'default'], weight: 0.85, register: 'editorial', intensity: 'calm',
  tags: ['inmobiliaria', 'arco', 'marco', 'portal', 'elegante'],
  render(ctx, t, env) {
    const { pal } = env
    rampBg(ctx, pal)
    // marco arquitectonico tipo portal/arco: deja el centro libre, dibuja molduras hacia los bordes
    const inset = W * 0.1
    const ax = W * 0.5, top = H * 0.1, bot = H * 0.92
    const halfW = W * 0.5 - inset
    // gradiente calido detras del arco (luz que entra)
    const lg = ctx.createRadialGradient(ax, H * 0.5, 0, ax, H * 0.5, H * 0.5)
    const warm = pal.tone === 'light' ? hslToHex(38, 0.4, 0.94) : hslToHex(34, 0.3, 0.32)
    lg.addColorStop(0, rgba(warm, pal.tone === 'light' ? 0.3 : 0.25)); lg.addColorStop(1, rgba(warm, 0))
    ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H)
    // dos molduras concentricas del arco (vida: respiran levisimo)
    const breathe = 1 + Math.sin(t * CLK * 0.2) * 0.006
    for (let m = 0; m < 2; m++) {
      const grow = m * 14 * breathe
      ctx.strokeStyle = m === 0 ? rgba(pal.accent, pal.tone === 'light' ? 0.3 : 0.42) : lineCol(pal, 0.1, 0.15)
      ctx.lineWidth = m === 0 ? 2 : 1.2
      const hw = halfW + grow, ty = top - grow
      ctx.beginPath()
      ctx.moveTo(ax - hw, bot)
      ctx.lineTo(ax - hw, ty + hw)
      ctx.arc(ax, ty + hw, hw, Math.PI, 0)
      ctx.lineTo(ax + hw, bot)
      ctx.stroke()
    }
    // clave del arco (keystone)
    ctx.fillStyle = rgba(pal.accent, pal.tone === 'light' ? 0.18 : 0.26)
    ctx.fillRect(ax - 8, top - halfW - 2, 16, 14)
    scrim(ctx, pal, { centerClear: 0.42, strength: pal.tone === 'light' ? 0.08 : 0.18 })
  },
})

// =====================================================================================
// spatial-depth — isometrico / ciudad / volumen
// =====================================================================================

register({
  id: 'bg.inmobiliaria.isohouses', lib: 'backgrounds', category: 'spatial-depth', tones: ['dark', 'light'],
  rubros: ['inmobiliaria', 'default'], weight: 0.85, register: 'friendly', intensity: 'soft',
  tags: ['inmobiliaria', 'isometrico', 'casas', 'barrio', 'volumen'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'iso')
    rampBg(ctx, pal)
    // tira de casitas isometricas en la franja BAJA (lejos del centro)
    const baseY = H * 0.82
    const u = 22   // unidad iso
    function house(cx, cy, hgt, lit) {
      // top (rombo)
      const top = [[cx, cy - hgt - u], [cx + u, cy - hgt - u / 2], [cx, cy - hgt], [cx - u, cy - hgt - u / 2]]
      ctx.fillStyle = rgba(pal.accent, pal.tone === 'light' ? 0.18 : 0.26)
      ctx.beginPath(); ctx.moveTo(top[0][0], top[0][1]); for (let k = 1; k < 4; k++) ctx.lineTo(top[k][0], top[k][1]); ctx.closePath(); ctx.fill()
      // cara izquierda
      ctx.fillStyle = rgba(pal.tone === 'light' ? darken(pal.accent, 0.1) : pal.bg0, pal.tone === 'light' ? 0.14 : 0.6)
      ctx.beginPath(); ctx.moveTo(cx - u, cy - hgt - u / 2); ctx.lineTo(cx, cy - hgt); ctx.lineTo(cx, cy); ctx.lineTo(cx - u, cy - u / 2); ctx.closePath(); ctx.fill()
      // cara derecha (mas clara)
      ctx.fillStyle = rgba(pal.tone === 'light' ? lighten(pal.accent, 0.2) : lighten(pal.bg0, 0.06), pal.tone === 'light' ? 0.1 : 0.5)
      ctx.beginPath(); ctx.moveTo(cx + u, cy - hgt - u / 2); ctx.lineTo(cx, cy - hgt); ctx.lineTo(cx, cy); ctx.lineTo(cx + u, cy - u / 2); ctx.closePath(); ctx.fill()
      // ventanita que se enciende
      ctx.fillStyle = rgba(hslToHex(42, 0.6, 0.6), lit * (pal.tone === 'light' ? 0.25 : 0.5))
      ctx.fillRect(cx + u * 0.35, cy - hgt + u * 0.25, 4, 4)
    }
    let i = 0
    for (let cx = u; cx < W + u; cx += u * 2.1) {
      const hgt = range(r, u * 0.6, u * 1.8)
      const lit = 0.5 + 0.5 * Math.sin(t * CLK * 0.4 + i * 1.7)
      house(cx, baseY + (i % 2) * (u * 0.5), hgt, lit)
      i++
    }
    scrim(ctx, pal, { centerClear: 0.38, strength: pal.tone === 'light' ? 0.1 : 0.2 })
  },
})

register({
  id: 'bg.inmobiliaria.floatcards', lib: 'backgrounds', category: 'spatial-depth', tones: ['dark', 'light'],
  rubros: ['inmobiliaria', 'default'], weight: 0.8, register: 'corporate', intensity: 'calm',
  tags: ['inmobiliaria', 'tarjetas', 'fichas', 'flotante', 'profundidad'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'cards')
    rampBg(ctx, pal, true)
    // fichas de propiedad flotando con parallax suave, agrupadas en los bordes
    const N = 7
    for (let i = 0; i < N; i++) {
      const edge = r() < 0.5 ? r() * 0.32 : 0.68 + r() * 0.32   // x hacia los bordes
      const bx = edge * W, by = r() * H
      const depth = 0.4 + r() * 0.6
      const ph = r() * TAU
      const fx = bx + Math.sin(t * CLK * 0.2 + ph) * 10 * depth
      const fy = by + Math.cos(t * CLK * 0.16 + ph) * 8 * depth
      const cw = 64 * depth, ch = 80 * depth
      ctx.save()
      ctx.globalAlpha = 0.4 + depth * 0.4
      // sombra
      ctx.fillStyle = rgba('#000', pal.tone === 'light' ? 0.06 : 0.18)
      ctx.fillRect(fx - cw / 2 + 3, fy - ch / 2 + 4, cw, ch)
      // ficha (superficie)
      ctx.fillStyle = pal.tone === 'light' ? rgba('#ffffff', 0.7) : rgba(lighten(pal.bg0, 0.08), 0.85)
      ctx.fillRect(fx - cw / 2, fy - ch / 2, cw, ch)
      // "foto" arriba (banda de acento)
      ctx.fillStyle = rgba(i % 2 ? pal.accent2 : pal.accent, pal.tone === 'light' ? 0.3 : 0.4)
      ctx.fillRect(fx - cw / 2, fy - ch / 2, cw, ch * 0.5)
      // lineas de texto
      ctx.fillStyle = lineCol(pal, 0.2, 0.3, false)
      ctx.fillRect(fx - cw / 2 + 6, fy + ch * 0.06, cw * 0.7, 3)
      ctx.fillRect(fx - cw / 2 + 6, fy + ch * 0.18, cw * 0.45, 3)
      ctx.restore()
    }
    scrim(ctx, pal, { centerClear: 0.34, strength: pal.tone === 'light' ? 0.16 : 0.3 })
  },
})

// =====================================================================================
// material-texture — concreto, madera, planos texturados
// =====================================================================================

register({
  id: 'bg.inmobiliaria.concrete', lib: 'backgrounds', category: 'material-texture', tones: ['dark', 'light'],
  rubros: ['inmobiliaria', 'default'], weight: 0.85, register: 'neutral', intensity: 'calm',
  tags: ['inmobiliaria', 'concreto', 'material', 'minimal', 'textura'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'conc')
    rampBg(ctx, pal)
    // manchas suaves de concreto (radiales tenues sembrados) + juntas de losa
    ctx.save(); ctx.globalCompositeOperation = pal.tone === 'light' ? 'multiply' : 'screen'
    for (let i = 0; i < 14; i++) {
      const x = r() * W, y = r() * H, rad = range(r, 60, 150)
      const c = pal.tone === 'light' ? '#000000' : '#ffffff'
      const gr = ctx.createRadialGradient(x, y, 0, x, y, rad)
      const a = (pal.tone === 'light' ? 0.018 : 0.022) * (0.6 + 0.4 * Math.sin(t * CLK * 0.12 + i))
      gr.addColorStop(0, rgba(c, a)); gr.addColorStop(1, rgba(c, 0))
      ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H)
    }
    ctx.restore()
    // juntas de losa (grid grueso) hacia los bordes
    ctx.strokeStyle = lineCol(pal, 0.05, 0.07, false); ctx.lineWidth = 1.5
    const gx = W / 3, gy = H / 4
    for (let i = 1; i < 3; i++) { ctx.beginPath(); ctx.moveTo(gx * i, 0); ctx.lineTo(gx * i, H); ctx.stroke() }
    for (let j = 1; j < 4; j++) { ctx.beginPath(); ctx.moveTo(0, gy * j); ctx.lineTo(W, gy * j); ctx.stroke() }
    // puntitos de poros (grano)
    ctx.fillStyle = rgba(pal.tone === 'light' ? '#000' : '#fff', pal.tone === 'light' ? 0.03 : 0.04)
    for (let i = 0; i < 500; i++) ctx.fillRect(r() * W, r() * H, 1, 1)
    scrim(ctx, pal, { centerClear: 0.38, strength: pal.tone === 'light' ? 0.08 : 0.16 })
  },
})

register({
  id: 'bg.inmobiliaria.woodgrain', lib: 'backgrounds', category: 'material-texture', tones: ['dark', 'light'],
  rubros: ['inmobiliaria', 'default'], weight: 0.75, register: 'friendly', intensity: 'calm',
  tags: ['inmobiliaria', 'madera', 'calido', 'material', 'parquet'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'wood')
    // base calida de madera derivada del tono
    const woodHue = 32
    const base0 = pal.tone === 'light' ? hslToHex(woodHue, 0.3, 0.9) : hslToHex(woodHue, 0.25, 0.14)
    const base1 = pal.tone === 'light' ? hslToHex(woodHue, 0.34, 0.82) : hslToHex(woodHue, 0.3, 0.09)
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, base0); g.addColorStop(1, base1)
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    // vetas de madera (lineas onduladas verticales, suaves)
    ctx.save(); ctx.globalCompositeOperation = pal.tone === 'light' ? 'multiply' : 'screen'
    const planks = 9
    for (let i = 0; i < planks; i++) {
      const baseX = (i + 0.5) / planks * W
      const ph = r() * TAU, amp = range(r, 3, 9)
      ctx.strokeStyle = rgba(pal.tone === 'light' ? darken(base1, 0.25) : lighten(base0, 0.1), pal.tone === 'light' ? 0.12 : 0.14)
      ctx.lineWidth = range(r, 0.6, 1.6)
      ctx.beginPath()
      for (let y = -5; y <= H + 5; y += 10) {
        const x = baseX + Math.sin(y * 0.02 + ph + t * CLK * 0.05) * amp + Math.sin(y * 0.06 + ph) * 2
        if (y < 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    ctx.restore()
    // juntas de tablones (verticales gruesas)
    ctx.strokeStyle = rgba(pal.tone === 'light' ? darken(base1, 0.3) : '#000', pal.tone === 'light' ? 0.1 : 0.25); ctx.lineWidth = 1.2
    for (let i = 1; i < planks; i++) { const x = i / planks * W; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
    scrim(ctx, pal, { centerClear: 0.36, strength: pal.tone === 'light' ? 0.12 : 0.22 })
  },
})

// =====================================================================================
// geometric-graphic — keys/llaves, pins, geometria inmobiliaria
// =====================================================================================

register({
  id: 'bg.inmobiliaria.pinmap', lib: 'backgrounds', category: 'geometric-graphic', tones: ['dark', 'light'],
  rubros: ['inmobiliaria', 'default'], weight: 0.85, register: 'friendly', intensity: 'soft',
  tags: ['inmobiliaria', 'mapa', 'pins', 'ubicacion', 'calles'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'map')
    rampBg(ctx, pal)
    // trama de calles (mapa abstracto): lineas orto con algunas mas gruesas (avenidas)
    const step = 46, drift = (t * CLK * 3) % step
    for (let pass = 0; pass < 2; pass++) {
      const ave = pass === 1
      ctx.strokeStyle = lineCol(pal, ave ? 0.07 : 0.035, ave ? 0.1 : 0.05, false)
      ctx.lineWidth = ave ? 3 : 1
      for (let i = 0, x = -drift; x < W; x += step, i++) { if (ave !== (i % 3 === 0)) continue; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
      for (let j = 0, y = -drift; y < H; y += step, j++) { if (ave !== (j % 3 === 0)) continue; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }
    }
    // pins de ubicacion (gota), hacia los bordes, uno "rebotando" suave
    const pins = 5
    for (let i = 0; i < pins; i++) {
      const px = (0.12 + 0.76 * r()) * W
      const py = (r() < 0.5 ? 0.1 + r() * 0.22 : 0.7 + r() * 0.22) * H
      const bob = Math.sin(t * CLK * 0.6 + i * 1.4) * 3
      const c = i % 2 ? pal.accent2 : pal.accent
      ctx.fillStyle = rgba(c, pal.tone === 'light' ? 0.55 : 0.7)
      // gota: circulo + triangulo
      const rad = 6
      ctx.beginPath(); ctx.arc(px, py + bob, rad, Math.PI, 0); ctx.lineTo(px, py + bob + rad * 2.2); ctx.closePath(); ctx.fill()
      ctx.fillStyle = pal.tone === 'light' ? pal.bg0 : pal.bg1
      ctx.beginPath(); ctx.arc(px, py + bob - 1, 2.2, 0, TAU); ctx.fill()
    }
    scrim(ctx, pal, { centerClear: 0.36, strength: pal.tone === 'light' ? 0.12 : 0.24 })
  },
})

register({
  id: 'bg.inmobiliaria.keylines', lib: 'backgrounds', category: 'geometric-graphic', tones: ['dark', 'light'],
  rubros: ['inmobiliaria', 'default'], weight: 0.7, register: 'playful', intensity: 'soft',
  tags: ['inmobiliaria', 'llaves', 'iconos', 'geometrico', 'patron'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'key')
    rampBg(ctx, pal, true)
    // patron disperso de siluetas de llave + techo (iconos de marca neutra), tenues, hacia los bordes
    function drawKey(x, y, s, rot, a) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot)
      ctx.strokeStyle = rgba(pal.accent, a); ctx.lineWidth = 1.6
      ctx.beginPath(); ctx.arc(0, 0, s * 0.4, 0, TAU); ctx.stroke()           // ojo
      ctx.beginPath(); ctx.moveTo(s * 0.4, 0); ctx.lineTo(s * 1.3, 0); ctx.stroke()  // tija
      ctx.beginPath(); ctx.moveTo(s * 1.0, 0); ctx.lineTo(s * 1.0, s * 0.3); ctx.moveTo(s * 1.2, 0); ctx.lineTo(s * 1.2, s * 0.35); ctx.stroke()  // dientes
      ctx.restore()
    }
    function drawRoof(x, y, s, a) {
      ctx.save(); ctx.translate(x, y)
      ctx.strokeStyle = rgba(pal.accent2, a); ctx.lineWidth = 1.6
      ctx.beginPath(); ctx.moveTo(-s, 0); ctx.lineTo(0, -s * 0.7); ctx.lineTo(s, 0); ctx.stroke()  // techo
      ctx.strokeRect(-s * 0.7, 0, s * 1.4, s * 0.8)  // casa
      ctx.restore()
    }
    const M = 9
    for (let i = 0; i < M; i++) {
      const x = r() * W, y = r() * H
      // empuja lejos del centro
      const dcx = (x - W / 2) / (W / 2), dcy = (y - H / 2) / (H / 2)
      const central = Math.hypot(dcx, dcy)
      const a = (pal.tone === 'light' ? 0.16 : 0.22) * clamp(central, 0.25, 1)
      const drift = Math.sin(t * CLK * 0.18 + i) * 4
      if (i % 2 === 0) drawKey(x + drift, y, range(r, 12, 20), r() * TAU, a)
      else drawRoof(x, y + drift, range(r, 12, 22), a)
    }
    scrim(ctx, pal, { centerClear: 0.4, strength: pal.tone === 'light' ? 0.1 : 0.2 })
  },
})
