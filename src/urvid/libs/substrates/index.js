// urvid 1.0 · biblioteca SUBSTRATES — texturas/overlays TENUES que se pintan SOBRE el contenido (semi-transparentes,
// tone-aware). Cada modulo: render(ctx, t, env). env = { pal, content, fonts, seed, energy }. PURO + DETERMINISTA
// (mulberry32(env.seed) para el patron estable, t para microvida). NO hardcodea color (usa env.pal.*); respeta W,H.
// Categorias: grain-noise · print-trama · editorial-grid · fabric-material · glass-acrylic · damage-distress ·
// scanlines · overlay-light. Regla de oro: ALPHA BAJO -> la textura se SIENTE, no tapa. El director la pone arriba.
import { register } from '../../core/registry.js'
import { mulberry32, range, irange } from '../../core/prng.js'
import { W, H, TAU, rgba, lighten, darken, clamp } from '../../core/util.js'

// ink util: color de la "tinta" de la textura segun tono (oscuro sobre claro, claro sobre oscuro)
const inkOf = pal => (pal.tone === 'light' ? '#000000' : '#ffffff')
const antiInkOf = pal => (pal.tone === 'light' ? '#ffffff' : '#000000')

// ============================================================ grain-noise ============================================================

register({
  id: 'sub.grain.film', lib: 'substrates', category: 'grain-noise', tones: ['dark', 'light'], rubros: ['*'], weight: 1.4,
  tags: ['universal', 'analogico', 'sutil'],
  render(ctx, t, env) {
    const { pal } = env, r = mulberry32(env.seed ^ 0x9e3779b1)
    // grano por puntos: muchos micropuntos sembrados; "centellean" en bloques temporales (sin Math.random)
    const ink = inkOf(pal), anti = antiInkOf(pal)
    const N = 1400, base = pal.tone === 'light' ? 0.05 : 0.07
    const flick = 0.5 + 0.5 * Math.sin(t * 1.7)   // respiracion global del grano
    ctx.save()
    for (let i = 0; i < N; i++) {
      const x = r() * W, y = r() * H, s = 0.6 + r() * 0.9
      // mitad tinta, mitad anti-tinta -> sensacion de "ruido" real
      const dark = r() < 0.5
      const a = base * (0.4 + 0.6 * ((i * 0.013 + flick) % 1))
      ctx.fillStyle = rgba(dark ? ink : anti, a)
      ctx.fillRect(x, y, s, s)
    }
    ctx.restore()
  },
})

register({
  id: 'sub.grain.dust', lib: 'substrates', category: 'grain-noise', tones: ['dark', 'light'], rubros: ['*'], weight: 0.9,
  tags: ['analogico', 'organico', 'mota'],
  render(ctx, t, env) {
    const { pal } = env, r = mulberry32(env.seed ^ 0x1b56c4e9)
    // motas grandes de polvo + pelusas: pocas, dispersas, a la deriva muy lenta
    const ink = inkOf(pal)
    ctx.save()
    const N = 90
    for (let i = 0; i < N; i++) {
      const drift = Math.sin(t * 0.4 + i) * 6
      const x = r() * W, y = (r() * H + drift + H) % H, rad = 0.5 + r() * 2.2
      ctx.fillStyle = rgba(ink, (pal.tone === 'light' ? 0.06 : 0.09) * (0.4 + r() * 0.6))
      ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.fill()
    }
    // unos pocos "pelos" finos
    ctx.strokeStyle = rgba(ink, pal.tone === 'light' ? 0.05 : 0.08); ctx.lineWidth = 0.7
    for (let i = 0; i < 7; i++) {
      const x = r() * W, y = r() * H, ang = r() * TAU, len = 10 + r() * 30
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len); ctx.stroke()
    }
    ctx.restore()
  },
})

// ============================================================ print-trama ============================================================

register({
  id: 'sub.trama.halftone', lib: 'substrates', category: 'print-trama', tones: ['dark', 'light'], rubros: ['*'], weight: 1.2,
  tags: ['print', 'editorial', 'puntos'],
  render(ctx, t, env) {
    const { pal } = env
    // trama de puntos en grilla rotada ~15deg, radio modulado por un gradiente diagonal -> sensacion de impresion
    const ink = inkOf(pal), step = 11, ang = 0.26   // ~15 grados
    const drift = (t * 3) % step
    ctx.save()
    ctx.translate(W / 2, H / 2); ctx.rotate(ang); ctx.translate(-W / 2, -H / 2)
    const maxR = step * 0.42, alpha = pal.tone === 'light' ? 0.06 : 0.08
    for (let y = -step; y < H + step; y += step) {
      for (let x = -step; x < W + step; x += step) {
        // densidad por diagonal (de denso arriba-izq a ralo abajo-der) + leve respiracion
        const g = clamp((x + y) / (W + H), 0, 1)
        const rad = maxR * (0.85 - 0.65 * g) * (0.9 + 0.1 * Math.sin(t * 1.2))
        if (rad <= 0.2) continue
        ctx.fillStyle = rgba(ink, alpha)
        ctx.beginPath(); ctx.arc(x + drift, y, rad, 0, TAU); ctx.fill()
      }
    }
    ctx.restore()
  },
})

register({
  id: 'sub.trama.cmyk-dots', lib: 'substrates', category: 'print-trama', tones: ['light'], rubros: ['*'], weight: 0.8,
  tags: ['print', 'retro', 'color'],
  render(ctx, t, env) {
    const { pal } = env
    // mini-rosetas de impresion: dos tramas (acento + acento2) levemente desfasadas/rotadas (mis-registro)
    const step = 14, alpha = 0.05
    const layers = [
      { col: pal.accent, ang: 0.26, dx: 0 },
      { col: pal.accent2, ang: -0.18, dx: 2.5 + Math.sin(t * 0.8) * 1.2 },
    ]
    for (const L of layers) {
      ctx.save()
      ctx.translate(W / 2, H / 2); ctx.rotate(L.ang); ctx.translate(-W / 2, -H / 2)
      ctx.fillStyle = rgba(L.col, alpha)
      for (let y = -step; y < H + step; y += step) {
        for (let x = -step; x < W + step; x += step) {
          ctx.beginPath(); ctx.arc(x + L.dx, y, step * 0.28, 0, TAU); ctx.fill()
        }
      }
      ctx.restore()
    }
  },
})

register({
  id: 'sub.trama.lines', lib: 'substrates', category: 'print-trama', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['print', 'grabado', 'rayado'],
  render(ctx, t, env) {
    const { pal } = env, r = mulberry32(env.seed ^ 0x33aa55cc)
    // trama de lineas (estilo grabado/engraving): lineas paralelas finas con grosor modulado -> sombreado de impresion
    const ink = inkOf(pal), ang = range(r, -0.5, 0.5) + 0.3
    const step = 6, drift = (t * 4) % step
    ctx.save()
    ctx.translate(W / 2, H / 2); ctx.rotate(ang); ctx.translate(-W / 2, -H / 2)
    const diag = Math.hypot(W, H)
    for (let i = -diag; i < diag; i += step) {
      const f = 0.5 + 0.5 * Math.sin((i / diag) * Math.PI * 3 + t * 0.5)   // modulacion de densidad
      ctx.strokeStyle = rgba(ink, (pal.tone === 'light' ? 0.04 : 0.06) * (0.5 + f))
      ctx.lineWidth = 0.6 + f * 0.7
      ctx.beginPath(); ctx.moveTo(i + drift, -diag); ctx.lineTo(i + drift, diag); ctx.stroke()
    }
    ctx.restore()
  },
})

// ============================================================ editorial-grid ============================================================

register({
  id: 'sub.grid.swiss', lib: 'substrates', category: 'editorial-grid', tones: ['dark', 'light'], rubros: ['tech', 'finanzas', 'inmobiliaria', 'educacion', 'default', 'legal', 'salud'], weight: 1.1,
  tags: ['swiss', 'editorial', 'hairline'],
  render(ctx, t, env) {
    const { pal } = env
    // grilla editorial de columnas + margenes + lineas guia (hairlines de acento muy tenue) — look de revista/Swiss
    const ink = inkOf(pal), aBase = pal.tone === 'light' ? 0.07 : 0.1
    const mx = 26, my = 40, cols = 6
    ctx.save()
    ctx.strokeStyle = rgba(ink, aBase * 0.6); ctx.lineWidth = 1
    // marco interior
    ctx.strokeRect(mx, my, W - mx * 2, H - my * 2)
    // columnas
    const cw = (W - mx * 2) / cols
    ctx.strokeStyle = rgba(pal.accent, aBase * (0.7 + 0.3 * Math.sin(t * 0.7)))
    for (let i = 1; i < cols; i++) {
      const x = mx + cw * i
      ctx.beginPath(); ctx.moveTo(x, my); ctx.lineTo(x, H - my); ctx.stroke()
    }
    // dos lineas de baseline horizontales en tercios
    ctx.strokeStyle = rgba(ink, aBase * 0.5)
    for (const fy of [0.34, 0.66]) {
      const y = my + (H - my * 2) * fy
      ctx.beginPath(); ctx.moveTo(mx, y); ctx.lineTo(W - mx, y); ctx.stroke()
    }
    // marcas de registro en las esquinas (cruces)
    ctx.strokeStyle = rgba(pal.accent, aBase); ctx.lineWidth = 1
    for (const [cx, cy] of [[mx, my], [W - mx, my], [mx, H - my], [W - mx, H - my]]) {
      ctx.beginPath(); ctx.moveTo(cx - 5, cy); ctx.lineTo(cx + 5, cy); ctx.moveTo(cx, cy - 5); ctx.lineTo(cx, cy + 5); ctx.stroke()
    }
    ctx.restore()
  },
})

register({
  id: 'sub.grid.blueprint', lib: 'substrates', category: 'editorial-grid', tones: ['dark', 'light'], rubros: ['tech', 'inmobiliaria', 'default', 'construccion'], weight: 0.9,
  tags: ['tecnico', 'plano', 'milimetrado'],
  render(ctx, t, env) {
    const { pal } = env
    // papel milimetrado: grilla fina + grilla mayor cada 5 — tono "blueprint" en acento
    const minor = 14, major = minor * 5
    const off = (t * 2) % minor
    ctx.save()
    // grilla fina
    ctx.strokeStyle = rgba(pal.accent, pal.tone === 'light' ? 0.05 : 0.06); ctx.lineWidth = 0.6
    for (let x = -off; x < W; x += minor) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
    for (let y = -off; y < H; y += minor) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }
    // grilla mayor
    ctx.strokeStyle = rgba(pal.accent, pal.tone === 'light' ? 0.09 : 0.11); ctx.lineWidth = 1
    for (let x = 0; x < W; x += major) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
    for (let y = 0; y < H; y += major) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }
    ctx.restore()
  },
})

register({
  id: 'sub.grid.dotmatrix', lib: 'substrates', category: 'editorial-grid', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['editorial', 'puntos', 'minimal'],
  render(ctx, t, env) {
    const { pal } = env
    // matriz de puntos de guia (como un cuaderno dotted): regular, muy tenue, microflota
    const ink = inkOf(pal), step = 24
    const off = (Math.sin(t * 0.5) * 2)
    ctx.save()
    ctx.fillStyle = rgba(ink, pal.tone === 'light' ? 0.08 : 0.1)
    for (let y = step / 2; y < H; y += step) {
      for (let x = step / 2; x < W; x += step) {
        ctx.beginPath(); ctx.arc(x + off, y, 0.9, 0, TAU); ctx.fill()
      }
    }
    ctx.restore()
  },
})

// ============================================================ scanlines ============================================================

register({
  id: 'sub.scan.crt', lib: 'substrates', category: 'scanlines', tones: ['dark'], rubros: ['tech', 'gaming', 'musica', 'default'], weight: 1,
  tags: ['retro', 'crt', 'tv'],
  render(ctx, t, env) {
    const { pal } = env
    // scanlines horizontales (CRT) + una banda de "roll" que baja lentamente -> textura de pantalla vieja. Solo dark.
    ctx.save()
    ctx.strokeStyle = rgba('#000000', 0.16); ctx.lineWidth = 1
    for (let y = 0; y < H; y += 3) { ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); ctx.stroke() }
    // banda de barrido (rolling shutter)
    const by = ((t * 60) % (H + 160)) - 80
    const g = ctx.createLinearGradient(0, by - 80, 0, by + 80)
    g.addColorStop(0, rgba(pal.accent, 0)); g.addColorStop(0.5, rgba(pal.accent, 0.05)); g.addColorStop(1, rgba(pal.accent, 0))
    ctx.fillStyle = g; ctx.fillRect(0, by - 80, W, 160)
    ctx.restore()
  },
})

register({
  id: 'sub.scan.lcd', lib: 'substrates', category: 'scanlines', tones: ['dark', 'light'], rubros: ['tech', 'gaming', 'default'], weight: 0.8,
  tags: ['digital', 'pixel', 'matriz'],
  render(ctx, t, env) {
    const { pal } = env
    // rejilla LCD: lineas verticales sutiles + horizontales -> "subpixel grid". Doble tono via acento.
    const ink = inkOf(pal), step = 4
    ctx.save()
    ctx.strokeStyle = rgba(ink, pal.tone === 'light' ? 0.03 : 0.05); ctx.lineWidth = 1
    for (let x = 0; x < W; x += step) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); ctx.stroke() }
    ctx.strokeStyle = rgba(ink, pal.tone === 'light' ? 0.04 : 0.06)
    for (let y = 0; y < H; y += step) { ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); ctx.stroke() }
    ctx.restore()
  },
})

// ============================================================ fabric-material ============================================================

register({
  id: 'sub.fabric.paper', lib: 'substrates', category: 'fabric-material', tones: ['dark', 'light'], rubros: ['*'], weight: 1.1,
  tags: ['papel', 'organico', 'fibra'],
  render(ctx, t, env) {
    const { pal } = env, r = mulberry32(env.seed ^ 0x77c1e3a5)
    // fibras de papel: muchos segmentos cortos en angulos aleatorios -> textura de papel/cartulina. Casi inmovil.
    const ink = inkOf(pal), anti = antiInkOf(pal)
    ctx.save()
    ctx.lineWidth = 0.6
    const N = 500
    for (let i = 0; i < N; i++) {
      const x = r() * W, y = r() * H, ang = r() * TAU, len = 2 + r() * 5
      const dark = r() < 0.55
      ctx.strokeStyle = rgba(dark ? ink : anti, (pal.tone === 'light' ? 0.04 : 0.05) * (0.4 + r() * 0.6))
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len); ctx.stroke()
    }
    // mancha de "envejecido" muy tenue en una esquina sembrada (respira con t)
    const ex = r() < 0.5 ? W * 0.12 : W * 0.88, ey = r() < 0.5 ? H * 0.14 : H * 0.86
    const g = ctx.createRadialGradient(ex, ey, 0, ex, ey, 220)
    g.addColorStop(0, rgba(ink, (pal.tone === 'light' ? 0.03 : 0.04) * (0.7 + 0.3 * Math.sin(t * 0.5)))); g.addColorStop(1, rgba(ink, 0))
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    ctx.restore()
  },
})

register({
  id: 'sub.fabric.canvas', lib: 'substrates', category: 'fabric-material', tones: ['dark', 'light'], rubros: ['*'], weight: 0.9,
  tags: ['lienzo', 'tejido', 'trama'],
  render(ctx, t, env) {
    const { pal } = env
    // tejido de lienzo: hilos verticales y horizontales entrelazados (lineas onduladas suaves) -> textura de tela
    const ink = inkOf(pal), anti = antiInkOf(pal), step = 6
    ctx.save()
    ctx.lineWidth = 1.2
    // urdimbre (vertical)
    ctx.strokeStyle = rgba(ink, pal.tone === 'light' ? 0.03 : 0.04)
    for (let x = 0; x < W; x += step) {
      ctx.beginPath()
      for (let y = 0; y <= H; y += 3) ctx.lineTo(x + Math.sin(y * 0.5) * 0.8, y)
      ctx.stroke()
    }
    // trama (horizontal), leve highlight para dar relieve
    ctx.strokeStyle = rgba(anti, pal.tone === 'light' ? 0.025 : 0.035)
    for (let y = 0; y < H; y += step) {
      ctx.beginPath()
      for (let x = 0; x <= W; x += 3) ctx.lineTo(x, y + Math.sin(x * 0.5) * 0.8)
      ctx.stroke()
    }
    ctx.restore()
  },
})

// ============================================================ glass-acrylic ============================================================

register({
  id: 'sub.glass.frost', lib: 'substrates', category: 'glass-acrylic', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['vidrio', 'frost', 'premium'],
  render(ctx, t, env) {
    const { pal } = env, r = mulberry32(env.seed ^ 0x5a17bd03)
    // vidrio esmerilado: brillo difuso diagonal + microsalpicado de luz -> sensacion frosted sobre el contenido
    ctx.save()
    // highlight diagonal que se desliza muy lento
    const sweep = 0.5 + 0.5 * Math.sin(t * 0.4)
    const gx = W * (sweep * 1.4 - 0.2)
    const g = ctx.createLinearGradient(gx - 160, 0, gx + 160, H)
    g.addColorStop(0, rgba('#ffffff', 0)); g.addColorStop(0.5, rgba('#ffffff', pal.tone === 'light' ? 0.05 : 0.07)); g.addColorStop(1, rgba('#ffffff', 0))
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    // microbrillos (escarcha)
    for (let i = 0; i < 120; i++) {
      const x = r() * W, y = r() * H, s = 0.5 + r() * 1.4
      ctx.fillStyle = rgba('#ffffff', (pal.tone === 'light' ? 0.05 : 0.08) * r())
      ctx.fillRect(x, y, s, s)
    }
    ctx.restore()
  },
})

register({
  id: 'sub.glass.streaks', lib: 'substrates', category: 'glass-acrylic', tones: ['dark', 'light'], rubros: ['*'], weight: 0.8,
  tags: ['vidrio', 'reflejo', 'acrilico'],
  render(ctx, t, env) {
    const { pal } = env, r = mulberry32(env.seed ^ 0x2c9f01ab)
    // vetas de acrilico: bandas diagonales largas de brillo, anchos variados -> plastico/acrilico pulido
    ctx.save()
    ctx.translate(W / 2, H / 2); ctx.rotate(-0.55); ctx.translate(-W / 2, -H / 2)
    const n = 7
    for (let i = 0; i < n; i++) {
      const cx = range(r, -W * 0.3, W * 1.3) + Math.sin(t * 0.3 + i) * 8
      const wdt = range(r, 6, 26)
      const a = (pal.tone === 'light' ? 0.04 : 0.06) * (0.5 + r() * 0.5)
      const g = ctx.createLinearGradient(cx - wdt, 0, cx + wdt, 0)
      g.addColorStop(0, rgba('#ffffff', 0)); g.addColorStop(0.5, rgba('#ffffff', a)); g.addColorStop(1, rgba('#ffffff', 0))
      ctx.fillStyle = g; ctx.fillRect(cx - wdt, -H, wdt * 2, H * 3)
    }
    ctx.restore()
  },
})

// ============================================================ overlay-light ============================================================

register({
  id: 'sub.light.vignette', lib: 'substrates', category: 'overlay-light', tones: ['dark', 'light'], rubros: ['*'], weight: 1.3,
  tags: ['vineta', 'foco', 'universal'],
  render(ctx, t, env) {
    const { pal } = env
    // vineta que respira + un sutil "lift" central: oscurece bordes (dark) o agrega scrim suave (light) para legibilidad
    const breath = 0.5 + 0.5 * Math.sin(t * 0.5)
    const inner = H * (0.32 + 0.03 * breath)
    const v = ctx.createRadialGradient(W / 2, H * 0.46, inner, W / 2, H * 0.5, H * 0.78)
    v.addColorStop(0, 'rgba(0,0,0,0)')
    v.addColorStop(1, pal.tone === 'light' ? 'rgba(0,0,0,0.07)' : 'rgba(0,0,0,0.42)')
    ctx.save(); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H); ctx.restore()
  },
})

register({
  id: 'sub.light.rays', lib: 'substrates', category: 'overlay-light', tones: ['dark'], rubros: ['*'], weight: 0.9,
  tags: ['rayos', 'godrays', 'dramatico'],
  render(ctx, t, env) {
    const { pal } = env, r = mulberry32(env.seed ^ 0x4f2a8c17)
    // god-rays: abanico de rayos de luz de acento desde un foco superior, alpha bajo, leve barrido. Solo dark.
    const ox = W * (0.3 + r() * 0.4), oy = -40
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    const n = 9
    for (let i = 0; i < n; i++) {
      const base = (i / n) * TAU * 0.18 + 0.7   // abanico hacia abajo
      const ang = base + Math.sin(t * 0.3 + i) * 0.03
      const a = (0.025 + 0.02 * (0.5 + 0.5 * Math.sin(t * 0.6 + i)))
      ctx.save(); ctx.translate(ox, oy); ctx.rotate(ang)
      const g = ctx.createLinearGradient(0, 0, 0, H * 1.3)
      g.addColorStop(0, rgba(pal.accent, a)); g.addColorStop(1, rgba(pal.accent, 0))
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(3, 0); ctx.lineTo(46, H * 1.3); ctx.lineTo(-46, H * 1.3); ctx.closePath(); ctx.fill()
      ctx.restore()
    }
    ctx.restore()
  },
})

register({
  id: 'sub.light.bloom', lib: 'substrates', category: 'overlay-light', tones: ['dark'], rubros: ['*'], weight: 0.8,
  tags: ['bloom', 'glow', 'haze'],
  render(ctx, t, env) {
    const { pal } = env, r = mulberry32(env.seed ^ 0x6db3a90f)
    // bloom/haze: 3 halos suaves de acento a la deriva + niebla global que sube el negro un toque. Solo dark.
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    for (let i = 0; i < 3; i++) {
      const ph = r() * TAU
      const bx = W * (0.25 + r() * 0.5) + Math.sin(t * 0.35 + ph) * 30
      const by = H * (0.2 + r() * 0.55) + Math.cos(t * 0.28 + ph) * 26
      const rad = 120 + r() * 120
      const col = i % 2 ? pal.accent2 : pal.accent
      const g = ctx.createRadialGradient(bx, by, 0, bx, by, rad)
      g.addColorStop(0, rgba(col, 0.06)); g.addColorStop(1, rgba(col, 0))
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    }
    ctx.restore()
  },
})

// ============================================================ damage-distress ============================================================

register({
  id: 'sub.distress.scratches', lib: 'substrates', category: 'damage-distress', tones: ['dark', 'light'], rubros: ['*'], weight: 0.9,
  tags: ['rayado', 'film', 'vintage'],
  render(ctx, t, env) {
    const { pal } = env, r = mulberry32(env.seed ^ 0x13d7f2bb)
    // rayas verticales de film (scratches) que parpadean por bloque temporal + algun "pelo" diagonal
    const ink = inkOf(pal), anti = antiInkOf(pal)
    ctx.save()
    ctx.lineWidth = 1
    const N = 14
    for (let i = 0; i < N; i++) {
      const x = r() * W
      // parpadeo: cada raya aparece en una ventana temporal sembrada
      const phase = r()
      const on = ((t * 0.7 + phase) % 1) < 0.4 ? 1 : 0.15
      const dark = r() < 0.5
      ctx.strokeStyle = rgba(dark ? ink : anti, (pal.tone === 'light' ? 0.05 : 0.08) * on)
      const y0 = r() * H * 0.4, y1 = y0 + H * (0.4 + r() * 0.5)
      ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x + range(r, -3, 3), y1); ctx.stroke()
    }
    ctx.restore()
  },
})

register({
  id: 'sub.distress.grunge', lib: 'substrates', category: 'damage-distress', tones: ['dark', 'light'], rubros: ['*'], weight: 0.8,
  tags: ['grunge', 'desgaste', 'manchas'],
  render(ctx, t, env) {
    const { pal } = env, r = mulberry32(env.seed ^ 0x71fe4d29)
    // grunge: manchas irregulares (clusters de puntos de tamano variado) en los bordes -> desgaste/suciedad
    const ink = inkOf(pal)
    ctx.save()
    const clusters = 6
    for (let c = 0; c < clusters; c++) {
      // sesgar los clusters hacia los bordes
      const edge = r()
      const cx = edge < 0.5 ? r() * W * 0.3 + (r() < 0.5 ? 0 : W * 0.7) : r() * W
      const cy = edge < 0.5 ? r() * H : (r() < 0.5 ? r() * H * 0.25 : H * 0.75 + r() * H * 0.25)
      const spread = 30 + r() * 50, dots = 40 + (r() * 50 | 0)
      for (let i = 0; i < dots; i++) {
        const a = r() * TAU, rr = Math.pow(r(), 1.6) * spread
        const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr, s = 0.6 + r() * 1.8
        ctx.fillStyle = rgba(ink, (pal.tone === 'light' ? 0.03 : 0.05) * (1 - rr / spread))
        ctx.fillRect(x, y, s, s)
      }
    }
    ctx.restore()
  },
})

// ============================================================ OLA 2 ============================================================
// Ampliacion: topographic-organic (faltaba), mas print-trama (cmyk-misregister/screentone/benday),
// mas editorial-grid (baseline/columnas), mas fabric/glass, vignette-de-textura. Todos tenues + tone-aware.

// ------------------------------------------------------------ topographic-organic ------------------------------------------------------------

register({
  id: 'sub.topo.contours', lib: 'substrates', category: 'topographic-organic', tones: ['dark', 'light'], rubros: ['*'], weight: 1.1,
  tags: ['mapa', 'curvas-nivel', 'organico'],
  render(ctx, t, env) {
    const { pal } = env, r = mulberry32(env.seed ^ 0x0a17c3f5)
    // curvas de nivel tipo mapa topografico: anillos concentricos deformados por ruido seno de 2-3 focos sembrados.
    // Cada "altura" es una isolinea cerrada; el campo respira muy lento con t. Tenue, ink-aware.
    const ink = inkOf(pal)
    const foci = []
    const nf = 3
    for (let i = 0; i < nf; i++) foci.push({ x: range(r, W * 0.1, W * 0.9), y: range(r, H * 0.1, H * 0.9), w: range(r, 0.9, 1.6), s: range(r, 70, 150) })
    ctx.save()
    ctx.lineWidth = 1
    const levels = 16, step = Math.max(W, H) / levels
    // campo escalar: suma de gaussianas-aproximadas + ondulacion -> dibujamos marching por muestreo radial barato:
    // por cada foco trazamos anillos elipticos perturbados; superpuestos dan el look de mapa.
    for (const f of foci) {
      for (let L = 1; L <= levels; L++) {
        const baseR = L * step * 0.5
        const a = (pal.tone === 'light' ? 0.045 : 0.12) * (1 - L / (levels + 4))
        if (a <= 0.004) continue
        ctx.strokeStyle = rgba(ink, a)
        ctx.beginPath()
        const segs = 64
        for (let s = 0; s <= segs; s++) {
          const ang = (s / segs) * TAU
          const wob = Math.sin(ang * 3 + f.w * 5 + t * 0.3) * (f.s * 0.18) + Math.cos(ang * 5 - f.w * 3) * (f.s * 0.1)
          const rr = baseR + wob
          const x = f.x + Math.cos(ang) * rr * 1.05
          const y = f.y + Math.sin(ang) * rr * 0.82
          s === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        }
        ctx.closePath(); ctx.stroke()
      }
    }
    ctx.restore()
  },
})

register({
  id: 'sub.topo.flowlines', lib: 'substrates', category: 'topographic-organic', tones: ['dark', 'light'], rubros: ['*'], weight: 0.9,
  tags: ['flowfield', 'corrientes', 'organico'],
  render(ctx, t, env) {
    const { pal } = env, r = mulberry32(env.seed ^ 0x5b21d70b)
    // lineas de flujo (flowfield): muchas hebras que siguen un campo de angulo seno-suave -> corrientes organicas
    // como vetas de madera / agua. Avanzan a la deriva con t. Color de tinta, alpha bajo.
    const ink = inkOf(pal), anti = antiInkOf(pal)
    const ang = (x, y) => Math.sin(x * 0.012 + t * 0.15) * 1.2 + Math.cos(y * 0.01 - t * 0.1) * 1.2
    ctx.save()
    ctx.lineWidth = 0.9
    const strands = 95
    for (let i = 0; i < strands; i++) {
      let x = range(r, -20, W + 20), y = range(r, -20, H + 20)
      const dark = r() < 0.6
      ctx.strokeStyle = rgba(dark ? ink : anti, (pal.tone === 'light' ? 0.03 : 0.1) * (0.5 + r() * 0.5))
      ctx.beginPath(); ctx.moveTo(x, y)
      const steps = 26
      for (let s = 0; s < steps; s++) {
        const a = ang(x, y)
        x += Math.cos(a) * 6; y += Math.sin(a) * 6
        ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    ctx.restore()
  },
})

register({
  id: 'sub.topo.marble', lib: 'substrates', category: 'topographic-organic', tones: ['dark', 'light'], rubros: ['*'], weight: 0.8,
  tags: ['marmol', 'veteado', 'premium'],
  render(ctx, t, env) {
    const { pal } = env, r = mulberry32(env.seed ^ 0x2e8fa401)
    // vetas de marmol: pocas curvas largas (beziers) ramificadas, finas, que cruzan el lienzo en diagonal.
    // Sensacion de piedra/marmol pulido. Casi inmovil (microderiva con t).
    const ink = inkOf(pal)
    ctx.save()
    const veins = 9
    for (let i = 0; i < veins; i++) {
      const y0 = range(r, -H * 0.2, H * 1.2)
      const drift = Math.sin(t * 0.25 + i) * 6
      const a = (pal.tone === 'light' ? 0.04 : 0.1) * (0.4 + r() * 0.6)
      ctx.strokeStyle = rgba(ink, a)
      ctx.lineWidth = 0.6 + r() * 1.1
      ctx.beginPath(); ctx.moveTo(-30, y0 + drift)
      let cy = y0
      for (let x = 0; x <= W + 40; x += 60) {
        cy += range(r, -55, 55)
        const cx1 = x - 30 + range(r, -20, 20)
        ctx.quadraticCurveTo(cx1, cy + drift, x, (y0 + cy * 0.4) * 0.5 + cy * 0.5 + drift)
      }
      ctx.stroke()
    }
    ctx.restore()
  },
})

// ------------------------------------------------------------ print-trama (Ola 2) ------------------------------------------------------------

register({
  id: 'sub.trama.misregister', lib: 'substrates', category: 'print-trama', tones: ['dark', 'light'], rubros: ['*'], weight: 0.9,
  tags: ['print', 'cmyk', 'desfase', 'riso'],
  render(ctx, t, env) {
    const { pal } = env
    // mis-registro CMYK/riso: TRES capas de la misma trama de lineas finas (acento, acento2, tinta) desplazadas
    // unos px entre si -> el clasico "no calzo la impresion". Multiply-ish via alpha bajo. Doble tono.
    const ink = inkOf(pal)
    const step = 5, drift = Math.sin(t * 0.6) * 1.5
    const layers = [
      { col: pal.accent, dx: -2 - drift, dy: 0 },
      { col: pal.accent2, dx: 2 + drift, dy: 0.6 },
      { col: ink, dx: 0, dy: -1 },
    ]
    ctx.save()
    for (const L of layers) {
      ctx.strokeStyle = rgba(L.col, pal.tone === 'light' ? 0.05 : 0.06)
      ctx.lineWidth = 1
      for (let y = 0; y < H; y += step) {
        ctx.beginPath(); ctx.moveTo(0, y + L.dy); ctx.lineTo(W, y + L.dy + Math.sin(y * 0.02) * 0.6); ctx.stroke()
      }
      // un leve desplazamiento horizontal global por capa para el "desfase"
      ctx.translate(L.dx, 0)
    }
    ctx.restore()
  },
})

register({
  id: 'sub.trama.screentone', lib: 'substrates', category: 'print-trama', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['print', 'manga', 'screentone', 'puntos-finos'],
  render(ctx, t, env) {
    const { pal } = env
    // screentone (trama manga): puntos UNIFORMES y muy finos en grilla densa rotada 45deg, radio constante.
    // A diferencia de halftone (gradiente), aca es plano -> sombreado de comic. Tenue, ink-aware.
    const ink = inkOf(pal), step = 7
    ctx.save()
    ctx.translate(W / 2, H / 2); ctx.rotate(0.785); ctx.translate(-W / 2, -H / 2)   // 45deg
    const drift = (t * 1.5) % step
    ctx.fillStyle = rgba(ink, pal.tone === 'light' ? 0.05 : 0.1)
    const rad = step * 0.26
    for (let y = -step; y < H + step; y += step) {
      for (let x = -step; x < W + step; x += step) {
        ctx.beginPath(); ctx.arc(x + drift, y, rad, 0, TAU); ctx.fill()
      }
    }
    ctx.restore()
  },
})

register({
  id: 'sub.trama.benday', lib: 'substrates', category: 'print-trama', tones: ['light'], rubros: ['*'], weight: 0.8,
  tags: ['print', 'pop-art', 'benday', 'lichtenstein'],
  render(ctx, t, env) {
    const { pal } = env
    // Ben-Day dots (pop-art / Lichtenstein): puntos GRANDES de acento en grilla recta amplia, alpha bajo.
    // Look comic-print de los 60. Solo claro (sobre papel). Puntos respiran muy poco.
    const step = 18
    const breath = 0.92 + 0.08 * Math.sin(t * 0.8)
    ctx.save()
    ctx.fillStyle = rgba(pal.accent, 0.07)
    const rad = step * 0.32 * breath
    for (let y = step / 2; y < H + step; y += step) {
      const rowOff = (Math.floor(y / step) % 2) * (step / 2)   // hexagonal stagger
      for (let x = step / 2; x < W + step; x += step) {
        ctx.beginPath(); ctx.arc(x + rowOff, y, rad, 0, TAU); ctx.fill()
      }
    }
    ctx.restore()
  },
})

// ------------------------------------------------------------ editorial-grid (Ola 2) ------------------------------------------------------------

register({
  id: 'sub.grid.baseline', lib: 'substrates', category: 'editorial-grid', tones: ['dark', 'light'], rubros: ['tech', 'finanzas', 'inmobiliaria', 'educacion', 'default', 'legal', 'salud', 'editorial'], weight: 1,
  tags: ['editorial', 'baseline', 'reglones', 'tipografico'],
  render(ctx, t, env) {
    const { pal } = env
    // grilla de baseline (reglones de tipografia): lineas horizontales finas y regulares, cada 4ta mas marcada.
    // Como un papel pautado / grilla de maquetacion. Tenue. Microderiva vertical con t.
    const ink = inkOf(pal), step = 12
    const off = (t * 2) % step
    ctx.save()
    for (let y = -off; y < H + step; y += step) {
      const major = Math.round((y + off) / step) % 4 === 0
      ctx.strokeStyle = rgba(ink, (pal.tone === 'light' ? 0.04 : 0.055) * (major ? 1.6 : 0.8))
      ctx.lineWidth = major ? 0.9 : 0.6
      ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); ctx.stroke()
    }
    // dos margenes verticales (caja de texto) en acento muy tenue
    ctx.strokeStyle = rgba(pal.accent, pal.tone === 'light' ? 0.06 : 0.08); ctx.lineWidth = 1
    for (const fx of [0.14, 0.86]) { const x = W * fx; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
    ctx.restore()
  },
})

register({
  id: 'sub.grid.columns', lib: 'substrates', category: 'editorial-grid', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['editorial', 'columnas', 'gutter', 'maquetacion'],
  render(ctx, t, env) {
    const { pal } = env
    // columnas de maquetacion con GUTTER visible: N columnas como bandas de acento muy tenue separadas por canaletas.
    // Look de grilla de revista/InDesign. La opacidad de las bandas late suavemente en onda viajera.
    const cols = 4, mx = 24, my = 34
    const innerW = W - mx * 2, gutter = 10
    const cw = (innerW - gutter * (cols - 1)) / cols
    ctx.save()
    for (let i = 0; i < cols; i++) {
      const x = mx + i * (cw + gutter)
      const wave = 0.5 + 0.5 * Math.sin(t * 0.7 + i * 0.9)
      ctx.fillStyle = rgba(pal.accent, (pal.tone === 'light' ? 0.035 : 0.05) * (0.5 + 0.5 * wave))
      ctx.fillRect(x, my, cw, H - my * 2)
    }
    // marco exterior fino
    ctx.strokeStyle = rgba(inkOf(pal), pal.tone === 'light' ? 0.05 : 0.07); ctx.lineWidth = 1
    ctx.strokeRect(mx, my, innerW, H - my * 2)
    ctx.restore()
  },
})

register({
  id: 'sub.grid.crosshatch', lib: 'substrates', category: 'editorial-grid', tones: ['dark', 'light'], rubros: ['*'], weight: 0.9,
  tags: ['editorial', 'isometrico', 'tecnico', 'rombos'],
  render(ctx, t, env) {
    const { pal } = env
    // grilla isometrica/diagonal (crosshatch tecnico): dos familias de lineas a +-30deg -> red de rombos.
    // Look de papel isometrico / patron tecnico. Tenue, acento. Microderiva.
    const ink = inkOf(pal), step = 20
    const off = (t * 1.5) % step
    ctx.save()
    ctx.lineWidth = 0.6
    const diag = Math.hypot(W, H)
    for (const dir of [0.5236, -0.5236]) {   // +-30deg
      ctx.save()
      ctx.translate(W / 2, H / 2); ctx.rotate(dir); ctx.translate(-W / 2, -H / 2)
      ctx.strokeStyle = rgba(ink, pal.tone === 'light' ? 0.035 : 0.07)
      for (let i = -diag; i < diag * 2; i += step) {
        ctx.beginPath(); ctx.moveTo(i + off, -diag); ctx.lineTo(i + off, diag * 2); ctx.stroke()
      }
      ctx.restore()
    }
    ctx.restore()
  },
})

// ------------------------------------------------------------ fabric-material (Ola 2) ------------------------------------------------------------

register({
  id: 'sub.fabric.denim', lib: 'substrates', category: 'fabric-material', tones: ['dark', 'light'], rubros: ['*'], weight: 0.9,
  tags: ['tela', 'denim', 'twill', 'sarga'],
  render(ctx, t, env) {
    const { pal } = env, r = mulberry32(env.seed ^ 0x4d3b9af1)
    // tejido de sarga/denim: lineas diagonales cortas y densas (el tipico patron en escalera del jean) + micromota.
    // Casi inmovil. Tenue. Doble tono via ink/anti para el relieve.
    const ink = inkOf(pal), anti = antiInkOf(pal)
    ctx.save()
    // capa diagonal de sarga (en su propio save para deshacer la rotacion)
    ctx.save()
    ctx.translate(W / 2, H / 2); ctx.rotate(0.62); ctx.translate(-W / 2, -H / 2)
    ctx.lineWidth = 1.4
    const step = 5
    for (let y = -10; y < H + 10; y += step) {
      ctx.strokeStyle = rgba(ink, pal.tone === 'light' ? 0.03 : 0.07)
      ctx.beginPath()
      for (let x = -10; x <= W + 10; x += 8) ctx.lineTo(x, y + (x % (step * 2) === 0 ? 1 : -1))
      ctx.stroke()
    }
    ctx.restore()
    // micromota de hilos rotos (ya sin rotacion)
    for (let i = 0; i < 200; i++) {
      const x = r() * W, y = r() * H
      ctx.fillStyle = rgba(r() < 0.5 ? ink : anti, (pal.tone === 'light' ? 0.025 : 0.06) * r())
      ctx.fillRect(x, y, 1, 1)
    }
    ctx.restore()
  },
})

register({
  id: 'sub.fabric.knit', lib: 'substrates', category: 'fabric-material', tones: ['dark', 'light'], rubros: ['*'], weight: 0.8,
  tags: ['tela', 'tejido', 'punto', 'lana'],
  render(ctx, t, env) {
    const { pal } = env
    // tejido de punto (knit/lana): pequenos chevrons "V" apilados en grilla -> el patron de un sueter tejido.
    // Tenue, casi inmovil (microvaiven). Doble tono para dar relieve.
    const ink = inkOf(pal), anti = antiInkOf(pal)
    const cw = 9, ch = 7
    const sway = Math.sin(t * 0.5) * 0.5
    ctx.save()
    ctx.lineWidth = 1.1
    for (let y = 0; y < H + ch; y += ch) {
      const rowOff = (Math.floor(y / ch) % 2) * (cw / 2)
      for (let x = -cw; x < W + cw; x += cw) {
        const px = x + rowOff + sway
        ctx.strokeStyle = rgba(ink, pal.tone === 'light' ? 0.03 : 0.07)
        ctx.beginPath(); ctx.moveTo(px, y); ctx.lineTo(px + cw / 2, y + ch * 0.7); ctx.lineTo(px + cw, y); ctx.stroke()
        ctx.strokeStyle = rgba(anti, pal.tone === 'light' ? 0.02 : 0.045)
        ctx.beginPath(); ctx.moveTo(px, y + 1.2); ctx.lineTo(px + cw / 2, y + ch * 0.7 + 1.2); ctx.lineTo(px + cw, y + 1.2); ctx.stroke()
      }
    }
    ctx.restore()
  },
})

// ------------------------------------------------------------ glass-acrylic (Ola 2) ------------------------------------------------------------

register({
  id: 'sub.glass.droplets', lib: 'substrates', category: 'glass-acrylic', tones: ['dark', 'light'], rubros: ['*'], weight: 0.9,
  tags: ['vidrio', 'gotas', 'lluvia', 'condensacion'],
  render(ctx, t, env) {
    const { pal } = env, r = mulberry32(env.seed ^ 0x6f1ad44b)
    // condensacion / gotas en vidrio: gotitas con highlight (luna brillante) + sombra suave, sembradas.
    // Algunas "resbalan" lentamente hacia abajo (estela). Tenue. Funciona en ambos tonos.
    ctx.save()
    const N = 60
    for (let i = 0; i < N; i++) {
      const bx = r() * W
      const fall = ((r() * H) + (r() < 0.3 ? (t * 18) % (H + 40) : Math.sin(t * 0.3 + i) * 4))
      const by = (fall + H) % H
      const rad = 1.5 + r() * 4.5
      // sombra
      ctx.fillStyle = rgba('#000000', pal.tone === 'light' ? 0.05 : 0.09)
      ctx.beginPath(); ctx.arc(bx + 0.6, by + 0.8, rad, 0, TAU); ctx.fill()
      // cuerpo de la gota (lente)
      ctx.fillStyle = rgba('#ffffff', pal.tone === 'light' ? 0.04 : 0.06)
      ctx.beginPath(); ctx.arc(bx, by, rad, 0, TAU); ctx.fill()
      // highlight especular
      ctx.fillStyle = rgba('#ffffff', pal.tone === 'light' ? 0.1 : 0.16)
      ctx.beginPath(); ctx.arc(bx - rad * 0.3, by - rad * 0.3, rad * 0.32, 0, TAU); ctx.fill()
    }
    ctx.restore()
  },
})

register({
  id: 'sub.glass.crackle', lib: 'substrates', category: 'glass-acrylic', tones: ['dark', 'light'], rubros: ['*'], weight: 0.7,
  tags: ['vidrio', 'roto', 'craquelado', 'shatter'],
  render(ctx, t, env) {
    const { pal } = env, r = mulberry32(env.seed ^ 0x71c0ffee)
    // vidrio craquelado / shatter: red de fracturas radiales desde 1-2 puntos de impacto + anillos concentricos.
    // Lineas finas de luz. Tenue. Microbrillo pulsa con t. Funciona en ambos tonos.
    ctx.save()
    ctx.globalCompositeOperation = pal.tone === 'light' ? 'source-over' : 'lighter'
    const impacts = 2
    for (let k = 0; k < impacts; k++) {
      const cx = range(r, W * 0.2, W * 0.8), cy = range(r, H * 0.2, H * 0.8)
      const pulse = 0.6 + 0.4 * Math.sin(t * 0.9 + k * 1.4)
      const lineCol = pal.tone === 'light' ? '#000000' : '#ffffff'
      const baseA = (pal.tone === 'light' ? 0.05 : 0.08) * pulse
      // fracturas radiales
      const spokes = 7 + (r() * 4 | 0)
      ctx.lineWidth = 0.7
      for (let i = 0; i < spokes; i++) {
        const ang = (i / spokes) * TAU + r() * 0.3
        const len = range(r, 60, 180)
        ctx.strokeStyle = rgba(lineCol, baseA)
        ctx.beginPath(); ctx.moveTo(cx, cy)
        let x = cx, y = cy
        const segs = 4
        for (let s = 1; s <= segs; s++) {
          x = cx + Math.cos(ang + range(r, -0.12, 0.12)) * (len * s / segs)
          y = cy + Math.sin(ang + range(r, -0.12, 0.12)) * (len * s / segs)
          ctx.lineTo(x, y)
        }
        ctx.stroke()
      }
      // anillos de tension
      for (let ring = 1; ring <= 3; ring++) {
        ctx.strokeStyle = rgba(lineCol, baseA * 0.6 / ring)
        ctx.beginPath(); ctx.arc(cx, cy, ring * 26 + 8, 0, TAU); ctx.stroke()
      }
    }
    ctx.restore()
  },
})

// ------------------------------------------------------------ overlay-light: vignette-de-textura ------------------------------------------------------------

register({
  id: 'sub.light.vignette-grain', lib: 'substrates', category: 'overlay-light', tones: ['dark', 'light'], rubros: ['*'], weight: 1.1,
  tags: ['vineta', 'textura', 'foto', 'lomo'],
  render(ctx, t, env) {
    const { pal } = env, r = mulberry32(env.seed ^ 0x1ce7a005)
    // vignette CON TEXTURA (no un degrade liso): borde oscurecido construido por densidad de micropuntos hacia
    // las esquinas -> sensacion de pelicula/lomo. El centro queda limpio. Respira con t. Ambos tonos.
    const ink = inkOf(pal)
    const cx = W / 2, cy = H * 0.47
    const maxD = Math.hypot(cx, cy)
    const breath = 0.85 + 0.15 * Math.sin(t * 0.5)
    ctx.save()
    // capa base de degrade suave (poca) para sostener la textura
    const v = ctx.createRadialGradient(cx, cy, H * 0.3, cx, cy, H * 0.8)
    v.addColorStop(0, 'rgba(0,0,0,0)')
    v.addColorStop(1, pal.tone === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.3)')
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H)
    // textura: puntos que se DENSIFICAN hacia el borde (probabilidad ~ d^2)
    const N = 2600
    for (let i = 0; i < N; i++) {
      const x = r() * W, y = r() * H
      const d = Math.hypot(x - cx, y - cy) / maxD
      // rechazo: solo dibuja si d alto (concentra en bordes)
      if (r() > d * d * breath) continue
      const a = (pal.tone === 'light' ? 0.06 : 0.11) * d
      ctx.fillStyle = rgba(ink, a)
      ctx.fillRect(x, y, 1, 1)
    }
    ctx.restore()
  },
})

// ============================================================ OLA 3 ============================================================
// Ampliacion: mas grain (perlin-ish/speckle), mas trama (woodgrain/mesh-moire), mas grid (perspectiva/isometrico-3d),
// mas scanlines (vhs/interlace), mas fabric (corduroy/herringbone), mas glass (rain-track/lens-spots),
// mas light (caustics/spotlight-soft), mas distress (foxing/halftone-erosion), mas topographic (ridges/voronoi-cells).
// TODOS tenues + tone-aware + deterministas (mulberry32(env.seed)). ALPHA BAJO: la textura se SIENTE, no tapa.

// ------------------------------------------------------------ grain-noise (Ola 3) ------------------------------------------------------------

register({
  id: 'sub.grain.speckle', lib: 'substrates', category: 'grain-noise', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['grano', 'sal-pimienta', 'estatica'],
  render(ctx, t, env) {
    const { pal } = env, r = mulberry32(env.seed ^ 0x3f8aa1d7)
    // sal y pimienta: micropuntos de tinta Y anti-tinta en densidad media, con un "twinkle" por bloque temporal
    // (sin Math.random; el centelleo viene de un seno por indice). Mas grueso que grain.film -> textura de estatica fina.
    const ink = inkOf(pal), anti = antiInkOf(pal)
    const N = 900, baseA = pal.tone === 'light' ? 0.05 : 0.075
    ctx.save()
    for (let i = 0; i < N; i++) {
      const x = r() * W, y = r() * H, s = 0.7 + r() * 1.3
      const tw = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * 2.2 + i * 0.7))
      const dark = r() < 0.5
      ctx.fillStyle = rgba(dark ? ink : anti, baseA * tw)
      ctx.fillRect(x, y, s, s)
    }
    ctx.restore()
  },
})

register({
  id: 'sub.grain.clouds', lib: 'substrates', category: 'grain-noise', tones: ['dark', 'light'], rubros: ['*'], weight: 0.9,
  tags: ['grano', 'nube', 'perlin', 'organico'],
  render(ctx, t, env) {
    const { pal } = env, r = mulberry32(env.seed ^ 0x77ce11a3)
    // ruido tipo "nubes" (valor-noise barato): manchones suaves de luz/sombra construidos por blobs radiales
    // sembrados en una grilla floja con jitter -> textura granulada de baja frecuencia que respira. Tone-aware.
    const ink = inkOf(pal), anti = antiInkOf(pal)
    const cells = 7, cw = W / cells, ch = H / (cells * 2)
    ctx.save()
    for (let gy = 0; gy < cells * 2; gy++) {
      for (let gx = 0; gx < cells; gx++) {
        const jx = (r() - 0.5) * cw, jy = (r() - 0.5) * ch
        const cx = gx * cw + cw / 2 + jx, cy = gy * ch + ch / 2 + jy
        const rad = (cw * 0.7) * (0.7 + 0.3 * r())
        const up = r() < 0.5
        const a = (pal.tone === 'light' ? 0.03 : 0.05) * (0.5 + 0.5 * Math.sin(t * 0.4 + gx * 0.6 + gy * 0.3))
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad)
        g.addColorStop(0, rgba(up ? anti : ink, a)); g.addColorStop(1, rgba(up ? anti : ink, 0))
        ctx.fillStyle = g; ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2)
      }
    }
    ctx.restore()
  },
})

// ------------------------------------------------------------ print-trama (Ola 3) ------------------------------------------------------------

register({
  id: 'sub.trama.woodgrain', lib: 'substrates', category: 'print-trama', tones: ['dark', 'light'], rubros: ['*'], weight: 0.9,
  tags: ['print', 'madera', 'veta', 'xilografia'],
  render(ctx, t, env) {
    const { pal } = env, r = mulberry32(env.seed ^ 0x1d77beef)
    // veta de madera / xilografia: lineas horizontales largas que ondulan en fase, agrupadas, con "nudos" elipticos
    // sembrados donde las lineas se curvan alrededor. Look de grabado en madera. Tenue, ink-aware. Microderiva.
    const ink = inkOf(pal)
    const knots = []
    const nk = 3
    for (let i = 0; i < nk; i++) knots.push({ x: range(r, W * 0.15, W * 0.85), y: range(r, H * 0.1, H * 0.9), s: range(r, 18, 40) })
    ctx.save()
    ctx.lineWidth = 0.8
    const step = 7, drift = Math.sin(t * 0.3) * 2
    for (let y = 0; y < H + step; y += step) {
      const a = (pal.tone === 'light' ? 0.035 : 0.06) * (0.6 + 0.4 * Math.sin(y * 0.05))
      ctx.strokeStyle = rgba(ink, a)
      ctx.beginPath()
      for (let x = 0; x <= W; x += 6) {
        // deformacion base + repulsion alrededor de nudos (las lineas "abrazan" el nudo)
        let dy = Math.sin(x * 0.018 + y * 0.06 + drift) * 3
        for (const k of knots) {
          const dx = x - k.x, dyy = y - k.y, d = Math.hypot(dx, dyy)
          if (d < k.s * 2.4) dy += (dyy / (d || 1)) * (k.s * 1.6) * Math.exp(-(d * d) / (k.s * k.s * 1.6))
        }
        x === 0 ? ctx.moveTo(x, y + dy) : ctx.lineTo(x, y + dy)
      }
      ctx.stroke()
    }
    ctx.restore()
  },
})

register({
  id: 'sub.trama.moire', lib: 'substrates', category: 'print-trama', tones: ['dark', 'light'], rubros: ['*'], weight: 0.8,
  tags: ['print', 'moire', 'interferencia', 'optico'],
  render(ctx, t, env) {
    const { pal } = env
    // patron de moire: dos rejillas de lineas finas casi-paralelas (angulos minimamente distintos) que al superponerse
    // generan franjas de interferencia. El angulo relativo respira muy lento con t -> el moire "viaja". Tenue, ink-aware.
    const ink = inkOf(pal), step = 4
    const diag = Math.hypot(W, H)
    const baseAng = 0.04, delta = 0.05 + 0.03 * Math.sin(t * 0.35)
    ctx.save()
    ctx.lineWidth = 0.7
    for (const ang of [baseAng, baseAng + delta]) {
      ctx.save()
      ctx.translate(W / 2, H / 2); ctx.rotate(ang); ctx.translate(-W / 2, -H / 2)
      ctx.strokeStyle = rgba(ink, pal.tone === 'light' ? 0.04 : 0.055)
      for (let i = -diag; i < diag * 2; i += step) {
        ctx.beginPath(); ctx.moveTo(i, -diag); ctx.lineTo(i, diag * 2); ctx.stroke()
      }
      ctx.restore()
    }
    ctx.restore()
  },
})

// ------------------------------------------------------------ editorial-grid (Ola 3) ------------------------------------------------------------

register({
  id: 'sub.grid.perspective', lib: 'substrates', category: 'editorial-grid', tones: ['dark', 'light'], rubros: ['tech', 'gaming', 'musica', 'default', 'inmobiliaria'], weight: 1,
  tags: ['perspectiva', 'horizonte', 'retrowave', 'piso'],
  render(ctx, t, env) {
    const { pal } = env
    // grilla en perspectiva (piso retrowave/synthwave): lineas que convergen a un punto de fuga central + travesanos
    // horizontales que se densifican hacia el horizonte. Las horizontales "fluyen" hacia el espectador con t. Tone-aware.
    const horizon = H * 0.5, vpx = W / 2
    const ink = inkOf(pal)
    ctx.save()
    // lineas radiales (verticales convergiendo al punto de fuga)
    ctx.strokeStyle = rgba(pal.accent, pal.tone === 'light' ? 0.06 : 0.09); ctx.lineWidth = 0.8
    const rays = 14
    for (let i = 0; i <= rays; i++) {
      const fx = (i / rays - 0.5) * W * 2.4
      ctx.beginPath(); ctx.moveTo(vpx, horizon); ctx.lineTo(vpx + fx, H); ctx.stroke()
    }
    // travesanos horizontales que se acercan (densidad exponencial hacia el horizonte)
    ctx.strokeStyle = rgba(ink, pal.tone === 'light' ? 0.05 : 0.08)
    const flow = (t * 0.25) % 1
    for (let i = 0; i < 16; i++) {
      const p = ((i + flow) / 16)
      const y = horizon + (H - horizon) * (p * p)   // ease cuadratica -> juntas arriba, separadas abajo
      ctx.lineWidth = 0.5 + p * 1.1
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
    }
    // linea de horizonte tenue
    ctx.strokeStyle = rgba(pal.accent, pal.tone === 'light' ? 0.07 : 0.12); ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(0, horizon); ctx.lineTo(W, horizon); ctx.stroke()
    ctx.restore()
  },
})

register({
  id: 'sub.grid.iso3d', lib: 'substrates', category: 'editorial-grid', tones: ['dark', 'light'], rubros: ['tech', 'construccion', 'inmobiliaria', 'default'], weight: 0.9,
  tags: ['isometrico', '3d', 'cubos', 'tecnico'],
  render(ctx, t, env) {
    const { pal } = env
    // papel isometrico (ilusion 3D de cubos): TRES familias de lineas paralelas que TAPIZAN el lienzo -> +30deg, -30deg
    // y verticales. Su interseccion da rombos que el ojo lee como cubos. Cada familia con su alpha (relieve por cara).
    // Cada familia se rota y se dibuja como rejilla de paralelas que cubre la diagonal completa. Microderiva con t.
    const ink = inkOf(pal), anti = antiInkOf(pal)
    const step = 22, off = (t * 1.5) % step
    const diag = Math.hypot(W, H)
    const baseA = pal.tone === 'light' ? 0.045 : 0.075
    // familia = { rot, col, a }: dos diagonales (caras top) + verticales (caras laterales, highlight)
    const fams = [
      { rot: 0.5236, col: ink, a: 1.0 },     // +30deg
      { rot: -0.5236, col: ink, a: 0.85 },   // -30deg
      { rot: 0, col: anti, a: 0.55 },        // vertical (highlight de la cara lateral)
    ]
    ctx.save()
    ctx.lineWidth = 0.7
    for (const f of fams) {
      ctx.save()
      ctx.translate(W / 2, H / 2); ctx.rotate(f.rot); ctx.translate(-W / 2, -H / 2)
      ctx.strokeStyle = rgba(f.col, baseA * f.a)
      for (let i = -diag; i < diag * 2; i += step) {
        ctx.beginPath(); ctx.moveTo(i + off, -diag); ctx.lineTo(i + off, diag * 2); ctx.stroke()
      }
      ctx.restore()
    }
    ctx.restore()
  },
})

// ------------------------------------------------------------ scanlines (Ola 3) ------------------------------------------------------------

register({
  id: 'sub.scan.vhs', lib: 'substrates', category: 'scanlines', tones: ['dark'], rubros: ['tech', 'gaming', 'musica', 'default'], weight: 1,
  tags: ['vhs', 'retro', 'tracking', 'analogico'],
  render(ctx, t, env) {
    const { pal } = env, r = mulberry32(env.seed ^ 0x5ca7711e)
    // VHS: scanlines suaves + bandas de "tracking" (ruido horizontal que salta a alturas sembradas) + un leve
    // desplazamiento cromatico (chroma shift) en una franja. Solo dark (look de cinta de video vieja).
    ctx.save()
    // scanlines base
    ctx.strokeStyle = rgba('#000000', 0.12); ctx.lineWidth = 1
    for (let y = 0; y < H; y += 3) { ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); ctx.stroke() }
    // bandas de tracking que suben/bajan con el tiempo
    const bands = 4
    for (let i = 0; i < bands; i++) {
      const phase = r()
      const by = ((t * (20 + i * 12) + phase * H) % (H + 30)) - 15
      const bh = 4 + r() * 10
      // ruido horizontal dentro de la banda
      ctx.fillStyle = rgba('#ffffff', 0.05)
      for (let x = 0; x < W; x += 2) {
        if (r() < 0.5) continue
        ctx.fillRect(x, by + r() * bh, 1 + r() * 3, 1)
      }
      // tinte de chroma shift (acento) en el borde de la banda
      ctx.fillStyle = rgba(pal.accent, 0.04); ctx.fillRect(0, by, W, 1.2)
      ctx.fillStyle = rgba(pal.accent2, 0.035); ctx.fillRect(2, by + bh, W, 1)
    }
    ctx.restore()
  },
})

register({
  id: 'sub.scan.interlace', lib: 'substrates', category: 'scanlines', tones: ['dark', 'light'], rubros: ['tech', 'gaming', 'default'], weight: 0.8,
  tags: ['interlace', 'campos', 'digital', 'flicker'],
  render(ctx, t, env) {
    const { pal } = env
    // entrelazado (interlace): dos campos (lineas pares e impares) que alternan su tenue oscurecimiento por frame
    // -> el "shimmer" del video entrelazado. Muy regular, tenue. Doble tono via ink. El flicker viene de t (no random).
    const ink = inkOf(pal)
    const odd = Math.sin(t * 6) > 0 ? 0 : 1   // alterna campo por bloque temporal
    ctx.save()
    ctx.strokeStyle = rgba(ink, pal.tone === 'light' ? 0.04 : 0.07); ctx.lineWidth = 1
    for (let y = 0; y < H; y += 2) {
      if ((Math.floor(y / 2) % 2) !== odd) continue
      ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); ctx.stroke()
    }
    // el otro campo, mas suave
    ctx.strokeStyle = rgba(ink, pal.tone === 'light' ? 0.02 : 0.035)
    for (let y = 0; y < H; y += 2) {
      if ((Math.floor(y / 2) % 2) === odd) continue
      ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); ctx.stroke()
    }
    ctx.restore()
  },
})

// ------------------------------------------------------------ fabric-material (Ola 3) ------------------------------------------------------------

register({
  id: 'sub.fabric.corduroy', lib: 'substrates', category: 'fabric-material', tones: ['dark', 'light'], rubros: ['*'], weight: 0.8,
  tags: ['tela', 'pana', 'corduroy', 'acanalado'],
  render(ctx, t, env) {
    const { pal } = env
    // pana / corduroy: canaletas verticales con relieve (cada cordon = una banda con highlight a un lado y sombra al otro).
    // Sensacion de tela acanalada. Casi inmovil (microvaiven del highlight). Doble tono via ink/anti.
    const ink = inkOf(pal), anti = antiInkOf(pal)
    const wale = 8                          // ancho del cordon
    const sway = Math.sin(t * 0.4) * 0.5
    ctx.save()
    for (let x = 0; x < W; x += wale) {
      // sombra a la izquierda del cordon
      ctx.fillStyle = rgba(ink, pal.tone === 'light' ? 0.03 : 0.06)
      ctx.fillRect(x, 0, wale * 0.4, H)
      // highlight a la derecha
      ctx.fillStyle = rgba(anti, pal.tone === 'light' ? 0.025 : 0.05)
      ctx.fillRect(x + wale * 0.6 + sway, 0, wale * 0.3, H)
    }
    // micro-vetas horizontales (textura del hilo) muy tenues
    ctx.strokeStyle = rgba(ink, pal.tone === 'light' ? 0.015 : 0.03); ctx.lineWidth = 0.5
    for (let y = 0; y < H; y += 5) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }
    ctx.restore()
  },
})

register({
  id: 'sub.fabric.herringbone', lib: 'substrates', category: 'fabric-material', tones: ['dark', 'light'], rubros: ['*'], weight: 0.9,
  tags: ['tela', 'espiga', 'herringbone', 'sastreria'],
  render(ctx, t, env) {
    const { pal } = env
    // espiga / herringbone (tweed de sastreria): bloques de lineas diagonales que alternan +45/-45 por columna
    // -> el clasico zig-zag de espiga. Tenue, ink-aware. Casi inmovil (microderiva). Look elegante/textil.
    const ink = inkOf(pal)
    const blockW = 16, step = 4, drift = (t * 1.2) % step
    ctx.save()
    ctx.lineWidth = 1
    ctx.strokeStyle = rgba(ink, pal.tone === 'light' ? 0.035 : 0.06)
    for (let bx = 0; bx < W; bx += blockW) {
      const dir = (Math.floor(bx / blockW) % 2) ? 1 : -1   // alterna la pendiente
      for (let i = -blockW; i < H + blockW; i += step) {
        ctx.beginPath()
        const y0 = i + drift
        ctx.moveTo(bx, y0); ctx.lineTo(bx + blockW, y0 + dir * blockW)
        ctx.stroke()
      }
    }
    ctx.restore()
  },
})

// ------------------------------------------------------------ glass-acrylic (Ola 3) ------------------------------------------------------------

register({
  id: 'sub.glass.raintrack', lib: 'substrates', category: 'glass-acrylic', tones: ['dark', 'light'], rubros: ['*'], weight: 0.9,
  tags: ['vidrio', 'lluvia', 'reguero', 'ventana'],
  render(ctx, t, env) {
    const { pal } = env, r = mulberry32(env.seed ^ 0x4a17d09f)
    // regueros de lluvia en vidrio: hilos verticales que serpentean hacia abajo con una "cabeza" de gota brillante
    // que cae. La estela queda translucida. Tenue. Funciona en ambos tonos (highlight blanco + sombra suave).
    ctx.save()
    const tracks = 16
    for (let i = 0; i < tracks; i++) {
      const x0 = r() * W
      const speed = 30 + r() * 70
      const headY = ((r() * H) + t * speed) % (H + 60) - 30
      const len = 40 + r() * 120
      // estela (reguero): linea serpenteante con leve sombra
      ctx.strokeStyle = rgba('#000000', pal.tone === 'light' ? 0.025 : 0.05); ctx.lineWidth = 1.4
      ctx.beginPath()
      let x = x0
      for (let yy = headY - len; yy <= headY; yy += 6) {
        x = x0 + Math.sin(yy * 0.08 + i) * 2
        yy === headY - len ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy)
      }
      ctx.stroke()
      // highlight de la estela
      ctx.strokeStyle = rgba('#ffffff', pal.tone === 'light' ? 0.04 : 0.07); ctx.lineWidth = 0.7
      ctx.stroke()
      // cabeza de la gota
      const hr = 1.8 + r() * 2
      ctx.fillStyle = rgba('#ffffff', pal.tone === 'light' ? 0.06 : 0.1)
      ctx.beginPath(); ctx.arc(x, headY, hr, 0, TAU); ctx.fill()
    }
    ctx.restore()
  },
})

register({
  id: 'sub.glass.lensbokeh', lib: 'substrates', category: 'glass-acrylic', tones: ['dark'], rubros: ['*'], weight: 0.8,
  tags: ['vidrio', 'bokeh', 'lente', 'flare', 'circulos'],
  render(ctx, t, env) {
    const { pal } = env, r = mulberry32(env.seed ^ 0x6b0be401)
    // bokeh de lente: circulos suaves desenfocados (anillos huecos de luz) de tamanos varios a la deriva lenta,
    // como puntos fuera de foco / lens flare. Solo dark (brilla sobre fondo oscuro). Acentos + blanco. Lighter blend.
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    const N = 14
    for (let i = 0; i < N; i++) {
      const ph = r() * TAU
      const bx = r() * W + Math.sin(t * 0.2 + ph) * 18
      const by = r() * H + Math.cos(t * 0.17 + ph) * 16
      const rad = 8 + r() * 34
      const col = i % 3 === 0 ? pal.accent2 : (i % 3 === 1 ? pal.accent : '#ffffff')
      const a = 0.04 + 0.03 * (0.5 + 0.5 * Math.sin(t * 0.5 + i))
      // anillo: relleno suave + borde mas marcado (look de bokeh con borde)
      const g = ctx.createRadialGradient(bx, by, rad * 0.3, bx, by, rad)
      g.addColorStop(0, rgba(col, a * 0.5)); g.addColorStop(0.75, rgba(col, a)); g.addColorStop(1, rgba(col, 0))
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, rad, 0, TAU); ctx.fill()
    }
    ctx.restore()
  },
})

// ------------------------------------------------------------ overlay-light (Ola 3) ------------------------------------------------------------

register({
  id: 'sub.light.caustics', lib: 'substrates', category: 'overlay-light', tones: ['dark'], rubros: ['*'], weight: 0.9,
  tags: ['caustics', 'agua', 'reflejos', 'piscina'],
  render(ctx, t, env) {
    const { pal } = env
    // caustics (reflejos de agua): malla de luz ondulante que dibuja celdas brillantes irregulares como el fondo
    // de una pileta. Construida por interferencia de senos en 2 ejes -> filamentos de luz que se mueven. Solo dark.
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    const cell = 26
    for (let y = 0; y < H; y += cell) {
      for (let x = 0; x < W; x += cell) {
        // brillo = producto de ondas desfasadas -> nodos brillantes que migran con t
        const v = Math.sin(x * 0.06 + t * 0.8) * Math.cos(y * 0.05 - t * 0.6) +
          Math.sin((x + y) * 0.04 + t * 0.5)
        const b = Math.max(0, v)        // solo crestas
        if (b < 0.4) continue
        const a = 0.05 * Math.min(1, (b - 0.4) * 1.5)
        const cx = x + cell / 2, cy = y + cell / 2
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, cell * 0.8)
        g.addColorStop(0, rgba(pal.accent, a)); g.addColorStop(1, rgba(pal.accent, 0))
        ctx.fillStyle = g; ctx.fillRect(x - cell / 2, y - cell / 2, cell * 2, cell * 2)
      }
    }
    ctx.restore()
  },
})

register({
  id: 'sub.light.spotlight', lib: 'substrates', category: 'overlay-light', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['spotlight', 'foco', 'escenario', 'realce'],
  render(ctx, t, env) {
    const { pal } = env
    // spotlight suave: un foco circular de luz que realza el centro-superior (donde suele ir el titulo) y deja caer
    // el resto. En dark = halo de luz aditivo; en light = scrim invertido (apenas baja el resto para destacar el foco).
    const cx = W / 2, cy = H * (0.4 + 0.02 * Math.sin(t * 0.4))
    const rad = H * (0.36 + 0.03 * Math.sin(t * 0.5))
    ctx.save()
    if (pal.tone === 'light') {
      // scrim radial inverso muy tenue (oscurece afuera del foco)
      const g = ctx.createRadialGradient(cx, cy, rad * 0.4, cx, cy, rad * 1.6)
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.06)')
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    } else {
      ctx.globalCompositeOperation = 'lighter'
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad)
      g.addColorStop(0, rgba('#ffffff', 0.05)); g.addColorStop(0.6, rgba(pal.accent, 0.02)); g.addColorStop(1, rgba('#ffffff', 0))
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    }
    ctx.restore()
  },
})

// ------------------------------------------------------------ damage-distress (Ola 3) ------------------------------------------------------------

register({
  id: 'sub.distress.foxing', lib: 'substrates', category: 'damage-distress', tones: ['dark', 'light'], rubros: ['*'], weight: 0.8,
  tags: ['manchas', 'envejecido', 'papel-viejo', 'oxido'],
  render(ctx, t, env) {
    const { pal } = env, r = mulberry32(env.seed ^ 0x0f1a9301)
    // "foxing": manchas de envejecimiento de papel viejo -> pequenos discos teñidos (calidos en dark via acento,
    // sepia/tinta en light) con borde difuso, dispersos. Casi inmovil (respiran apenas). Tenue.
    const stainCol = pal.tone === 'light' ? '#6b4a2a' : pal.accent2
    ctx.save()
    const N = 26
    for (let i = 0; i < N; i++) {
      const x = r() * W, y = r() * H
      const rad = 3 + r() * 12
      const a = (pal.tone === 'light' ? 0.04 : 0.06) * (0.4 + 0.6 * r()) * (0.85 + 0.15 * Math.sin(t * 0.3 + i))
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad)
      g.addColorStop(0, rgba(stainCol, a)); g.addColorStop(0.6, rgba(stainCol, a * 0.5)); g.addColorStop(1, rgba(stainCol, 0))
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.fill()
    }
    ctx.restore()
  },
})

register({
  id: 'sub.distress.erosion', lib: 'substrates', category: 'damage-distress', tones: ['dark', 'light'], rubros: ['*'], weight: 0.8,
  tags: ['erosion', 'desgaste', 'estarcido', 'stencil'],
  render(ctx, t, env) {
    const { pal } = env, r = mulberry32(env.seed ^ 0x33e7051a)
    // erosion / desgaste tipo stencil: motas ANTI-tinta (huecos) que "comen" la superficie -> sensacion de pintura
    // descascarada / tinta gastada. Densidad mayor en franjas sembradas. Casi inmovil. Tenue, tone-aware.
    const anti = antiInkOf(pal)
    ctx.save()
    const N = 700
    // dos franjas erosionadas sembradas (donde se concentra el desgaste)
    const b1 = range(r, 0, H), b2 = range(r, 0, H)
    for (let i = 0; i < N; i++) {
      const x = r() * W, y = r() * H
      // probabilidad de aparecer mayor cerca de las franjas
      const near = Math.min(Math.abs(y - b1), Math.abs(y - b2))
      if (r() > Math.exp(-near / 90)) continue
      const s = 0.6 + r() * 2
      ctx.fillStyle = rgba(anti, (pal.tone === 'light' ? 0.04 : 0.06) * r())
      ctx.fillRect(x, y, s, s)
    }
    ctx.restore()
  },
})

// ------------------------------------------------------------ topographic-organic (Ola 3) ------------------------------------------------------------

register({
  id: 'sub.topo.ridges', lib: 'substrates', category: 'topographic-organic', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['duna', 'cordillera', 'estratos', 'capas'],
  render(ctx, t, env) {
    const { pal } = env, r = mulberry32(env.seed ^ 0x5e21ce0d)
    // estratos / dunas: capas horizontales de crestas onduladas apiladas (como cortes geologicos o dunas vistas de lado).
    // Cada capa = una curva suave con fase propia; el relleno entre capas es un degrade tenue. Microderiva con t.
    const ink = inkOf(pal)
    ctx.save()
    const layers = 11
    for (let L = 0; L < layers; L++) {
      const baseY = (L / layers) * H * 1.05 + 10
      const amp = 10 + r() * 22, ph = r() * TAU, freq = 0.006 + r() * 0.01
      const drift = Math.sin(t * 0.22 + L) * 3
      const a = (pal.tone === 'light' ? 0.04 : 0.07) * (0.5 + 0.5 * (L / layers))
      ctx.strokeStyle = rgba(ink, a); ctx.lineWidth = 0.9
      ctx.beginPath()
      for (let x = 0; x <= W; x += 6) {
        const y = baseY + Math.sin(x * freq + ph + drift) * amp + Math.sin(x * freq * 2.3 + ph) * amp * 0.3
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    ctx.restore()
  },
})

register({
  id: 'sub.topo.voronoi', lib: 'substrates', category: 'topographic-organic', tones: ['dark', 'light'], rubros: ['*'], weight: 0.9,
  tags: ['voronoi', 'celdas', 'craquelado', 'cuero', 'organico'],
  render(ctx, t, env) {
    const { pal } = env, r = mulberry32(env.seed ^ 0x71a0cce5)
    // celdas de Voronoi (aprox): bordes entre regiones de sitios sembrados -> red organica de celdas como cuero
    // agrietado / piel de jirafa / mosaico. Se aproxima dibujando, por cada sitio, segmentos a sus vecinos cercanos
    // (mediatrices implicitas). Tenue, ink-aware. Sitios microderivan con t.
    const ink = inkOf(pal)
    const sites = []
    const N = 24
    for (let i = 0; i < N; i++) sites.push({ x: r() * W, y: r() * H, px: r() * TAU })
    // posiciones animadas
    const pos = sites.map(s => ({ x: s.x + Math.sin(t * 0.25 + s.px) * 6, y: s.y + Math.cos(t * 0.2 + s.px) * 6 }))
    ctx.save()
    ctx.strokeStyle = rgba(ink, pal.tone === 'light' ? 0.045 : 0.07); ctx.lineWidth = 0.8
    // por cada par cercano, dibujar la mediatriz recortada (segmento perpendicular al punto medio) -> red de bordes
    for (let i = 0; i < N; i++) {
      // ordenar vecinos por distancia y conectar a los 3 mas cercanos con su mediatriz
      const ds = []
      for (let j = 0; j < N; j++) if (j !== i) ds.push({ j, d: Math.hypot(pos[i].x - pos[j].x, pos[i].y - pos[j].y) })
      ds.sort((a, b) => a.d - b.d)
      for (let k = 0; k < 3 && k < ds.length; k++) {
        const j = ds[k].j
        const mx = (pos[i].x + pos[j].x) / 2, my = (pos[i].y + pos[j].y) / 2
        const dx = pos[j].x - pos[i].x, dy = pos[j].y - pos[i].y, len = Math.hypot(dx, dy) || 1
        // direccion perpendicular
        const nx = -dy / len, ny = dx / len
        const half = Math.min(len * 0.55, 26)
        ctx.beginPath()
        ctx.moveTo(mx - nx * half, my - ny * half)
        ctx.lineTo(mx + nx * half, my + ny * half)
        ctx.stroke()
      }
    }
    // puntitos en los sitios (nucleos de celda)
    ctx.fillStyle = rgba(pal.accent, pal.tone === 'light' ? 0.06 : 0.09)
    for (const p of pos) { ctx.beginPath(); ctx.arc(p.x, p.y, 1.1, 0, TAU); ctx.fill() }
    ctx.restore()
  },
})

// ============================================================ OLA 5 ============================================================
// Ampliacion: mas grain (tv-snow/chroma-grain), mas trama (guilloche/stipple), mas grid (modular/radial),
// mas fabric (leather/linen), mas glass (fresnel/smudge), mas light (lensflare/scrim-gradient),
// mas distress (tape/fold), mas topographic (rings/cells-hex). TODOS tenues + tone-aware + deterministas
// (mulberry32(env.seed)). ALPHA BAJO: la textura se SIENTE, no tapa el contenido.

// ------------------------------------------------------------ grain-noise (Ola 5) ------------------------------------------------------------

register({
  id: 'sub.grain.tv-snow', lib: 'substrates', category: 'grain-noise', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['estatica', 'tv', 'nieve', 'ruido'],
  render(ctx, t, env) {
    const { pal } = env, r = mulberry32(env.seed ^ 0x2af19c63)
    // nieve de TV (static snow): muchos pixeles ANTI-tinta/tinta en grilla floja que "centellean" por bloque temporal
    // (el twinkle viene de un seno por indice + fase sembrada, sin Math.random). Mas denso que speckle, granos chicos.
    const ink = inkOf(pal), anti = antiInkOf(pal)
    const N = 1100, baseA = pal.tone === 'light' ? 0.045 : 0.07
    ctx.save()
    for (let i = 0; i < N; i++) {
      const x = r() * W, y = r() * H, s = 0.8 + r() * 1.1
      const ph = r() * TAU
      // centelleo rapido por bloque: cae a casi 0 en parte del ciclo -> sensacion de estatica viva
      const tw = Math.max(0, Math.sin(t * 3.4 + ph))
      if (tw < 0.05) continue
      const dark = r() < 0.5
      ctx.fillStyle = rgba(dark ? ink : anti, baseA * tw)
      ctx.fillRect(x, y, s, s)
    }
    ctx.restore()
  },
})

register({
  id: 'sub.grain.chroma-grain', lib: 'substrates', category: 'grain-noise', tones: ['dark', 'light'], rubros: ['*'], weight: 0.9,
  tags: ['grano', 'color', 'iso-alto', 'fotografia'],
  render(ctx, t, env) {
    const { pal } = env, r = mulberry32(env.seed ^ 0x5d0c7af1)
    // grano de color (chroma grain de ISO alto): micropuntos teñidos de acento/acento2 mezclados con tinta neutra
    // -> el ruido cromatico de una foto subexpuesta. Respira muy leve con t. Tone-aware (alpha bajo en claro).
    const ink = inkOf(pal)
    const cols = [pal.accent, pal.accent2, ink]
    const N = 950, baseA = pal.tone === 'light' ? 0.04 : 0.06
    const breath = 0.7 + 0.3 * Math.sin(t * 1.1)
    ctx.save()
    for (let i = 0; i < N; i++) {
      const x = r() * W, y = r() * H, s = 0.7 + r() * 1.2
      const col = cols[(r() * cols.length) | 0]
      ctx.fillStyle = rgba(col, baseA * (0.4 + 0.6 * r()) * breath)
      ctx.fillRect(x, y, s, s)
    }
    ctx.restore()
  },
})

// ------------------------------------------------------------ print-trama (Ola 5) ------------------------------------------------------------

register({
  id: 'sub.trama.guilloche', lib: 'substrates', category: 'print-trama', tones: ['dark', 'light'], rubros: ['finanzas', 'legal', 'default', 'lujo', 'inmobiliaria'], weight: 0.9,
  tags: ['print', 'guilloche', 'billete', 'seguridad', 'espirograf'],
  render(ctx, t, env) {
    const { pal } = env
    // guilloche (filigrana de billete / sello de seguridad): curva de espirografo (hipotrocoide) que teje un patron
    // de rosetones finos. Look de documento oficial / moneda. Color de acento, alpha bajo. Microrotacion con t.
    const cx = W / 2, cy = H * 0.5
    const R = 150, rr = 47, d = 78   // radios del hipotrocoide
    const k = (R - rr) / rr
    const phase = t * 0.12
    ctx.save()
    ctx.strokeStyle = rgba(pal.accent, pal.tone === 'light' ? 0.05 : 0.075)
    ctx.lineWidth = 0.5
    ctx.beginPath()
    const steps = 720
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * TAU * 7 + phase   // 7 vueltas -> rosetones cerrados
      const x = cx + (R - rr) * Math.cos(a) + d * Math.cos(k * a)
      const y = cy + (R - rr) * Math.sin(a) - d * Math.sin(k * a)
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.stroke()
    ctx.restore()
  },
})

register({
  id: 'sub.trama.stipple', lib: 'substrates', category: 'print-trama', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['print', 'puntillismo', 'grabado', 'stipple', 'dotwork'],
  render(ctx, t, env) {
    const { pal } = env, r = mulberry32(env.seed ^ 0x3c9e0d17)
    // puntillismo / stipple (grabado a punta seca): puntos finos SEMBRADOS cuya densidad sigue un gradiente diagonal
    // (denso en una esquina, ralo en la opuesta) -> sombreado de ilustracion clasica. Casi inmovil. Tenue, ink-aware.
    const ink = inkOf(pal)
    const N = 2200
    const grad = pal.tone === 'light' ? 0.05 : 0.08
    const slide = 0.5 + 0.5 * Math.sin(t * 0.3)
    ctx.save()
    ctx.fillStyle = rgba(ink, grad)
    for (let i = 0; i < N; i++) {
      const x = r() * W, y = r() * H
      // densidad por diagonal: rechazo segun (1 - g) -> mas puntos arriba-izquierda
      const g = (x / W + y / H) / 2
      if (r() < g * (0.7 + 0.3 * slide)) continue
      const s = 0.6 + r() * 0.9
      ctx.beginPath(); ctx.arc(x, y, s * 0.5, 0, TAU); ctx.fill()
    }
    ctx.restore()
  },
})

// ------------------------------------------------------------ editorial-grid (Ola 5) ------------------------------------------------------------

register({
  id: 'sub.grid.modular', lib: 'substrates', category: 'editorial-grid', tones: ['dark', 'light'], rubros: ['tech', 'finanzas', 'inmobiliaria', 'educacion', 'default', 'editorial', 'legal'], weight: 1,
  tags: ['editorial', 'modular', 'celdas', 'bento', 'maquetacion'],
  render(ctx, t, env) {
    const { pal } = env
    // grilla modular (estilo bento / sistema modular suizo): celdas rectangulares de tamanos varios apiladas con
    // hairlines de acento. Una celda "activa" recorre el tablero realzandose levemente con t. Tenue. Doble tono.
    const ink = inkOf(pal)
    const mx = 22, my = 32, cols = 4, rows = 7
    const innerW = W - mx * 2, innerH = H - my * 2
    const cw = innerW / cols, chh = innerH / rows
    ctx.save()
    // celdas (lineas internas)
    ctx.strokeStyle = rgba(ink, pal.tone === 'light' ? 0.05 : 0.07); ctx.lineWidth = 0.7
    for (let i = 1; i < cols; i++) { const x = mx + cw * i; ctx.beginPath(); ctx.moveTo(x, my); ctx.lineTo(x, H - my); ctx.stroke() }
    for (let j = 1; j < rows; j++) { const y = my + chh * j; ctx.beginPath(); ctx.moveTo(mx, y); ctx.lineTo(W - mx, y); ctx.stroke() }
    // marco
    ctx.strokeStyle = rgba(ink, pal.tone === 'light' ? 0.06 : 0.09); ctx.lineWidth = 1
    ctx.strokeRect(mx, my, innerW, innerH)
    // celda activa que recorre (relleno de acento muy tenue)
    const total = cols * rows
    const idx = Math.floor(((t * 0.6) % 1) * total) % total
    const ci = idx % cols, cj = (idx / cols) | 0
    ctx.fillStyle = rgba(pal.accent, (pal.tone === 'light' ? 0.05 : 0.07))
    ctx.fillRect(mx + ci * cw, my + cj * chh, cw, chh)
    ctx.restore()
  },
})

register({
  id: 'sub.grid.radial', lib: 'substrates', category: 'editorial-grid', tones: ['dark', 'light'], rubros: ['tech', 'gaming', 'musica', 'default', 'salud'], weight: 0.9,
  tags: ['radial', 'polar', 'diana', 'radar', 'concentrico'],
  render(ctx, t, env) {
    const { pal } = env
    // grilla polar / radar: anillos concentricos + radios desde un centro, como una mira/diana o un sonar tecnico.
    // Un anillo "ping" se expande lentamente con t. Tenue, ink-aware con acento en el ping.
    const ink = inkOf(pal)
    const cx = W / 2, cy = H * 0.5
    const maxR = Math.hypot(W, H) * 0.55
    ctx.save()
    // anillos
    ctx.strokeStyle = rgba(ink, pal.tone === 'light' ? 0.045 : 0.07); ctx.lineWidth = 0.7
    const rings = 9
    for (let i = 1; i <= rings; i++) { ctx.beginPath(); ctx.arc(cx, cy, (i / rings) * maxR, 0, TAU); ctx.stroke() }
    // radios
    const spokes = 12
    for (let i = 0; i < spokes; i++) {
      const a = (i / spokes) * TAU
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * maxR, cy + Math.sin(a) * maxR); ctx.stroke()
    }
    // ping expansivo de acento
    const ping = ((t * 0.4) % 1)
    ctx.strokeStyle = rgba(pal.accent, (pal.tone === 'light' ? 0.08 : 0.11) * (1 - ping)); ctx.lineWidth = 1.2
    ctx.beginPath(); ctx.arc(cx, cy, ping * maxR, 0, TAU); ctx.stroke()
    ctx.restore()
  },
})

// ------------------------------------------------------------ fabric-material (Ola 5) ------------------------------------------------------------

register({
  id: 'sub.fabric.leather', lib: 'substrates', category: 'fabric-material', tones: ['dark', 'light'], rubros: ['*'], weight: 0.9,
  tags: ['cuero', 'piel', 'grano', 'lujo', 'material'],
  render(ctx, t, env) {
    const { pal } = env, r = mulberry32(env.seed ^ 0x6e2af913)
    // grano de cuero: poros (puntitos hundidos) + microarrugas cortas en angulos varios -> textura de piel curtida.
    // Sensacion premium/material. Casi inmovil. Doble tono via ink (poro) / anti (highlight del relieve).
    const ink = inkOf(pal), anti = antiInkOf(pal)
    ctx.save()
    // poros
    const N = 650
    for (let i = 0; i < N; i++) {
      const x = r() * W, y = r() * H, s = 0.6 + r() * 1.6
      ctx.fillStyle = rgba(ink, (pal.tone === 'light' ? 0.03 : 0.055) * (0.4 + 0.6 * r()))
      ctx.beginPath(); ctx.arc(x, y, s, 0, TAU); ctx.fill()
      // pequeno highlight contiguo (relieve del poro)
      ctx.fillStyle = rgba(anti, (pal.tone === 'light' ? 0.02 : 0.04) * r())
      ctx.beginPath(); ctx.arc(x - 0.7, y - 0.7, s * 0.55, 0, TAU); ctx.fill()
    }
    // microarrugas
    ctx.lineWidth = 0.6
    for (let i = 0; i < 90; i++) {
      const x = r() * W, y = r() * H, ang = r() * TAU, len = 4 + r() * 12
      ctx.strokeStyle = rgba(ink, (pal.tone === 'light' ? 0.025 : 0.045) * r())
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len); ctx.stroke()
    }
    ctx.restore()
  },
})

register({
  id: 'sub.fabric.linen', lib: 'substrates', category: 'fabric-material', tones: ['dark', 'light'], rubros: ['*'], weight: 1,
  tags: ['tela', 'lino', 'trama-irregular', 'natural'],
  render(ctx, t, env) {
    const { pal } = env, r = mulberry32(env.seed ^ 0x1f7b3ca9)
    // lino: trama plana de hilos horizontales y verticales de grosor/espaciado LEVEMENTE irregular (a diferencia del
    // canvas perfecto) -> tela natural rustica. Casi inmovil. Doble tono para el cruce de hilos. Tenue.
    const ink = inkOf(pal), anti = antiInkOf(pal)
    ctx.save()
    // hilos verticales (urdimbre) con espaciado jitter
    let x = 0
    while (x < W) {
      const a = (pal.tone === 'light' ? 0.03 : 0.05) * (0.6 + 0.4 * r())
      ctx.strokeStyle = rgba(ink, a); ctx.lineWidth = 0.7 + r() * 0.7
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke()
      x += 4 + r() * 3
    }
    // hilos horizontales (trama) con highlight para el cruce
    let y = 0
    while (y < H) {
      const a = (pal.tone === 'light' ? 0.025 : 0.045) * (0.6 + 0.4 * r())
      ctx.strokeStyle = rgba(anti, a); ctx.lineWidth = 0.7 + r() * 0.7
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
      y += 4 + r() * 3
    }
    ctx.restore()
  },
})

// ------------------------------------------------------------ glass-acrylic (Ola 5) ------------------------------------------------------------

register({
  id: 'sub.glass.fresnel', lib: 'substrates', category: 'glass-acrylic', tones: ['dark', 'light'], rubros: ['*'], weight: 0.9,
  tags: ['vidrio', 'borde', 'fresnel', 'edge-light', 'premium'],
  render(ctx, t, env) {
    const { pal } = env
    // brillo de borde (Fresnel / edge-light de panel de vidrio): los bordes del lienzo se iluminan suavemente
    // como el canto de un panel acrilico, con un highlight que recorre lentamente un lado con t. Tenue, ambos tonos.
    const hi = pal.tone === 'light' ? '#ffffff' : '#ffffff'
    const baseA = pal.tone === 'light' ? 0.05 : 0.08
    ctx.save()
    // 4 degrades de borde hacia adentro
    const edges = [
      ctx.createLinearGradient(0, 0, 0, 60),            // top
      ctx.createLinearGradient(0, H, 0, H - 60),        // bottom
      ctx.createLinearGradient(0, 0, 60, 0),            // left
      ctx.createLinearGradient(W, 0, W - 60, 0),        // right
    ]
    const rects = [[0, 0, W, 60], [0, H - 60, W, 60], [0, 0, 60, H], [W - 60, 0, 60, H]]
    edges.forEach((g, i) => {
      g.addColorStop(0, rgba(hi, baseA)); g.addColorStop(1, rgba(hi, 0))
      ctx.fillStyle = g; ctx.fillRect(...rects[i])
    })
    // highlight viajero a lo largo del borde superior
    const hx = ((t * 0.18) % 1) * W
    const g2 = ctx.createRadialGradient(hx, 0, 0, hx, 0, 120)
    g2.addColorStop(0, rgba(pal.accent, baseA * 0.9)); g2.addColorStop(1, rgba(pal.accent, 0))
    ctx.fillStyle = g2; ctx.fillRect(0, 0, W, 80)
    ctx.restore()
  },
})

register({
  id: 'sub.glass.smudge', lib: 'substrates', category: 'glass-acrylic', tones: ['dark', 'light'], rubros: ['*'], weight: 0.8,
  tags: ['vidrio', 'huella', 'mancha', 'grasa', 'pantalla'],
  render(ctx, t, env) {
    const { pal } = env, r = mulberry32(env.seed ^ 0x42d9af07)
    // huellas / smudges en una pantalla de vidrio: manchones ovalados translucidos (grasa de dedo) con highlight tenue
    // -> la suciedad sutil de un display. Casi inmovil (respiran un poco). Tenue, ambos tonos.
    const breath = 0.85 + 0.15 * Math.sin(t * 0.4)
    ctx.save()
    const N = 9
    for (let i = 0; i < N; i++) {
      const x = r() * W, y = r() * H
      const rx = 18 + r() * 40, ry = 12 + r() * 26
      const rot = r() * TAU
      const a = (pal.tone === 'light' ? 0.022 : 0.04) * (0.5 + 0.5 * r()) * breath
      ctx.save()
      ctx.translate(x, y); ctx.rotate(rot); ctx.scale(rx, ry)
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
      g.addColorStop(0, rgba('#ffffff', a)); g.addColorStop(0.7, rgba('#ffffff', a * 0.4)); g.addColorStop(1, rgba('#ffffff', 0))
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU); ctx.fill()
      ctx.restore()
    }
    ctx.restore()
  },
})

// ------------------------------------------------------------ overlay-light (Ola 5) ------------------------------------------------------------

register({
  id: 'sub.light.lensflare', lib: 'substrates', category: 'overlay-light', tones: ['dark'], rubros: ['*'], weight: 0.8,
  tags: ['flare', 'lente', 'destello', 'cinematografico'],
  render(ctx, t, env) {
    const { pal } = env, r = mulberry32((env.seed ^ 0x7a0ff13e) >>> 0)
    // lens flare anamorfico: un foco brillante sembrado + una linea de destellos (ghosts) alineados hacia el centro
    // opuesto + una raya horizontal de luz. Solo dark (brilla sobre fondo oscuro). Lighter blend. Microflota con t.
    const sx = W * (0.25 + r() * 0.5), sy = H * (0.2 + r() * 0.3)
    const cx = W / 2, cy = H / 2
    const dx = cx - sx, dy = cy - sy
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    const pulse = 0.7 + 0.3 * Math.sin(t * 0.6)
    // foco principal
    let g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 70)
    g.addColorStop(0, rgba('#ffffff', 0.1 * pulse)); g.addColorStop(0.4, rgba(pal.accent, 0.05 * pulse)); g.addColorStop(1, rgba(pal.accent, 0))
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    // raya anamorfica horizontal
    const gh = ctx.createLinearGradient(sx - 130, sy, sx + 130, sy)
    gh.addColorStop(0, rgba(pal.accent2, 0)); gh.addColorStop(0.5, rgba(pal.accent2, 0.05 * pulse)); gh.addColorStop(1, rgba(pal.accent2, 0))
    ctx.fillStyle = gh; ctx.fillRect(sx - 130, sy - 1, 260, 2.5)
    // ghosts alineados hacia el lado opuesto
    const ghosts = 5
    for (let i = 1; i <= ghosts; i++) {
      const p = i / ghosts * 1.6
      const gxp = sx + dx * p, gyp = sy + dy * p
      const rad = 5 + (i % 2 ? 10 : 4)
      const col = i % 2 ? pal.accent : pal.accent2
      const a = 0.03 * pulse
      const gg = ctx.createRadialGradient(gxp, gyp, 0, gxp, gyp, rad)
      gg.addColorStop(0, rgba(col, a)); gg.addColorStop(1, rgba(col, 0))
      ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(gxp, gyp, rad, 0, TAU); ctx.fill()
    }
    ctx.restore()
  },
})

register({
  id: 'sub.light.scrim-gradient', lib: 'substrates', category: 'overlay-light', tones: ['dark', 'light'], rubros: ['*'], weight: 1.3,
  tags: ['scrim', 'gradiente', 'legibilidad', 'cine', 'universal'],
  render(ctx, t, env) {
    const { pal } = env
    // scrim de legibilidad (lower-third de cine): degrade que oscurece (dark) o aclara/scrim (light) la franja
    // SUPERIOR e INFERIOR para que el titulo arriba y el CTA abajo lean siempre. La intensidad respira muy leve con t.
    const breath = 0.9 + 0.1 * Math.sin(t * 0.4)
    ctx.save()
    if (pal.tone === 'light') {
      // velo blanco suave arriba y abajo (sube legibilidad de texto oscuro)
      const top = ctx.createLinearGradient(0, 0, 0, H * 0.32)
      top.addColorStop(0, rgba('#ffffff', 0.18 * breath)); top.addColorStop(1, rgba('#ffffff', 0))
      ctx.fillStyle = top; ctx.fillRect(0, 0, W, H * 0.32)
      const bot = ctx.createLinearGradient(0, H, 0, H * 0.7)
      bot.addColorStop(0, rgba('#ffffff', 0.2 * breath)); bot.addColorStop(1, rgba('#ffffff', 0))
      ctx.fillStyle = bot; ctx.fillRect(0, H * 0.7, W, H * 0.3)
    } else {
      const top = ctx.createLinearGradient(0, 0, 0, H * 0.34)
      top.addColorStop(0, rgba('#000000', 0.4 * breath)); top.addColorStop(1, rgba('#000000', 0))
      ctx.fillStyle = top; ctx.fillRect(0, 0, W, H * 0.34)
      const bot = ctx.createLinearGradient(0, H, 0, H * 0.62)
      bot.addColorStop(0, rgba('#000000', 0.5 * breath)); bot.addColorStop(1, rgba('#000000', 0))
      ctx.fillStyle = bot; ctx.fillRect(0, H * 0.62, W, H * 0.38)
    }
    ctx.restore()
  },
})

// ------------------------------------------------------------ damage-distress (Ola 5) ------------------------------------------------------------

register({
  id: 'sub.distress.tape', lib: 'substrates', category: 'damage-distress', tones: ['dark', 'light'], rubros: ['*'], weight: 0.8,
  tags: ['cinta', 'collage', 'pegado', 'washi', 'scrapbook'],
  render(ctx, t, env) {
    const { pal } = env, r = mulberry32(env.seed ^ 0x2bda4f17)
    // tiras de cinta adhesiva (collage / scrapbook): 3-4 rectangulos translucidos semi-mate pegados en angulos varios
    // en los bordes/esquinas, con highlight y sombra suave -> look de papel pegado con cinta. Casi inmovil. Tenue.
    const ink = inkOf(pal)
    ctx.save()
    const N = 4
    for (let i = 0; i < N; i++) {
      // anclar a un borde
      const edge = (r() * 4) | 0
      let x, y
      if (edge === 0) { x = r() * W; y = -6 + r() * 30 }
      else if (edge === 1) { x = r() * W; y = H - 24 - r() * 24 }
      else if (edge === 2) { x = -6 + r() * 30; y = r() * H }
      else { x = W - 24 - r() * 24; y = r() * H }
      const w = 40 + r() * 60, h = 14 + r() * 8
      const rot = range(r, -0.5, 0.5)
      ctx.save()
      ctx.translate(x, y); ctx.rotate(rot)
      // sombra
      ctx.fillStyle = rgba('#000000', pal.tone === 'light' ? 0.04 : 0.07)
      ctx.fillRect(-w / 2 + 1.5, -h / 2 + 1.5, w, h)
      // cuerpo de la cinta (translucido)
      ctx.fillStyle = rgba(pal.accent, pal.tone === 'light' ? 0.05 : 0.07)
      ctx.fillRect(-w / 2, -h / 2, w, h)
      // bordes mate (lineas a los lados, tipico de la cinta)
      ctx.strokeStyle = rgba(ink, pal.tone === 'light' ? 0.04 : 0.06); ctx.lineWidth = 0.6
      ctx.beginPath(); ctx.moveTo(-w / 2, -h / 2); ctx.lineTo(-w / 2, h / 2)
      ctx.moveTo(w / 2, -h / 2); ctx.lineTo(w / 2, h / 2); ctx.stroke()
      // highlight
      ctx.fillStyle = rgba('#ffffff', pal.tone === 'light' ? 0.05 : 0.07)
      ctx.fillRect(-w / 2, -h / 2, w, h * 0.28)
      ctx.restore()
    }
    ctx.restore()
  },
})

register({
  id: 'sub.distress.fold', lib: 'substrates', category: 'damage-distress', tones: ['dark', 'light'], rubros: ['*'], weight: 0.8,
  tags: ['pliegue', 'doblez', 'papel-arrugado', 'crease'],
  render(ctx, t, env) {
    const { pal } = env, r = mulberry32(env.seed ^ 0x55c10fd3)
    // pliegues de papel (creases): unas pocas lineas de doblez (una sombra + un highlight contiguo) que cruzan el lienzo
    // -> sensacion de hoja doblada/desplegada. Casi inmovil. Tenue. Doble tono via ink (valle) / anti (cresta).
    const ink = inkOf(pal), anti = antiInkOf(pal)
    ctx.save()
    const N = 5
    for (let i = 0; i < N; i++) {
      const horiz = r() < 0.5
      const a = (pal.tone === 'light' ? 0.035 : 0.06) * (0.6 + 0.4 * r())
      ctx.lineWidth = 1
      if (horiz) {
        const y = range(r, H * 0.1, H * 0.9), wob = range(r, -10, 10)
        ctx.strokeStyle = rgba(ink, a)
        ctx.beginPath(); ctx.moveTo(0, y); ctx.quadraticCurveTo(W / 2, y + wob, W, y + range(r, -6, 6)); ctx.stroke()
        ctx.strokeStyle = rgba(anti, a * 0.7)
        ctx.beginPath(); ctx.moveTo(0, y + 1.4); ctx.quadraticCurveTo(W / 2, y + wob + 1.4, W, y + range(r, -6, 6) + 1.4); ctx.stroke()
      } else {
        const x = range(r, W * 0.1, W * 0.9), wob = range(r, -10, 10)
        ctx.strokeStyle = rgba(ink, a)
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.quadraticCurveTo(x + wob, H / 2, x + range(r, -6, 6), H); ctx.stroke()
        ctx.strokeStyle = rgba(anti, a * 0.7)
        ctx.beginPath(); ctx.moveTo(x + 1.4, 0); ctx.quadraticCurveTo(x + wob + 1.4, H / 2, x + range(r, -6, 6) + 1.4, H); ctx.stroke()
      }
    }
    ctx.restore()
  },
})

// ------------------------------------------------------------ topographic-organic (Ola 5) ------------------------------------------------------------

register({
  id: 'sub.topo.rings', lib: 'substrates', category: 'topographic-organic', tones: ['dark', 'light'], rubros: ['*'], weight: 0.9,
  tags: ['anillos', 'arbol', 'tronco', 'concentrico', 'organico'],
  render(ctx, t, env) {
    const { pal } = env, r = mulberry32(env.seed ^ 0x6c0a17d9)
    // anillos de tronco (tree rings): anillos concentricos LIGERAMENTE excentricos y de espaciado irregular alrededor
    // de un centro sembrado fuera de cuadro -> corte de tronco / madera. Microrespiracion con t. Tenue, ink-aware.
    const ink = inkOf(pal)
    const cx = range(r, -W * 0.2, W * 0.4), cy = range(r, H * 0.7, H * 1.2)
    ctx.save()
    ctx.lineWidth = 0.8
    let rad = 14
    const breath = 1 + 0.02 * Math.sin(t * 0.3)
    const maxR = Math.hypot(W, H) * 1.2
    let i = 0
    while (rad < maxR) {
      const a = (pal.tone === 'light' ? 0.035 : 0.06) * (0.6 + 0.4 * Math.sin(i * 0.7))
      ctx.strokeStyle = rgba(ink, a)
      // anillo elipico levemente deformado
      ctx.beginPath()
      const segs = 80
      for (let s = 0; s <= segs; s++) {
        const ang = (s / segs) * TAU
        const wob = Math.sin(ang * 3 + i) * (rad * 0.04)
        const rr = (rad + wob) * breath
        const x = cx + Math.cos(ang) * rr * 1.08
        const y = cy + Math.sin(ang) * rr * 0.94
        s === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.closePath(); ctx.stroke()
      rad += 6 + r() * 10
      i++
    }
    ctx.restore()
  },
})

register({
  id: 'sub.topo.cells-hex', lib: 'substrates', category: 'topographic-organic', tones: ['dark', 'light'], rubros: ['*'], weight: 0.9,
  tags: ['hexagonos', 'panal', 'celdas', 'organico', 'molecular'],
  render(ctx, t, env) {
    const { pal } = env
    // panal de hexagonos (honeycomb): teselado regular de hexagonos hairline -> red molecular/organica. Cada celda
    // late en una onda viajera de acento muy tenue con t (sensacion de "respiracion" del panal). Tone-aware.
    const ink = inkOf(pal)
    const R = 18                              // radio del hexagono
    const hw = R * Math.sqrt(3), vh = R * 1.5  // paso horizontal / vertical
    ctx.save()
    ctx.lineWidth = 0.7
    let row = 0
    for (let y = -R; y < H + R; y += vh) {
      const xoff = (row % 2) * (hw / 2)
      for (let x = -R; x < W + R; x += hw) {
        const cx = x + xoff, cy = y
        // onda viajera para el realce de acento
        const wave = 0.5 + 0.5 * Math.sin((cx + cy) * 0.02 - t * 1.0)
        ctx.strokeStyle = rgba(ink, pal.tone === 'light' ? 0.035 : 0.055)
        ctx.beginPath()
        for (let k = 0; k <= 6; k++) {
          const a = (k / 6) * TAU + Math.PI / 6
          const px = cx + Math.cos(a) * R, py = cy + Math.sin(a) * R
          k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
        }
        ctx.closePath(); ctx.stroke()
        // realce de acento en la cresta de la onda
        if (wave > 0.82) {
          ctx.fillStyle = rgba(pal.accent, (pal.tone === 'light' ? 0.04 : 0.06) * (wave - 0.82) * 5)
          ctx.beginPath()
          for (let k = 0; k <= 6; k++) {
            const a = (k / 6) * TAU + Math.PI / 6
            const px = cx + Math.cos(a) * R * 0.82, py = cy + Math.sin(a) * R * 0.82
            k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
          }
          ctx.closePath(); ctx.fill()
        }
      }
      row++
    }
    ctx.restore()
  },
})
