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
