// urvid 1.0 · backgrounds del rubro EDUCACION — papel/cuaderno, grillas, geometrico amigable, renglones,
// formas simples, didactico, calido-neutro. Cada modulo: render(ctx, t, env). PURO + DETERMINISTA
// (mulberry32(env.seed)/seedFor para layout; t solo para vida sutil). Usa env.pal (bg0/bg1 base por tono;
// accent/accent2 detalle). Centro suave -> no mata el contraste del texto; detalle hacia los bordes.
// ARCHIVO PROPIO (no se pisa con otros agentes). El orquestador agrega el import despues.
import { register } from '../../core/registry.js'
import { mulberry32, range, seedFor } from '../../core/prng.js'
import { W, H, TAU, rgba, lighten, darken, clamp, lerp, mix, hexToHsl, hslToHex } from '../../core/util.js'

const CLK = 0.6

// ---- helpers locales (prefijo edu para no chocar) ----

// base de "papel": en light un blanco calido neutro; en dark un gris-tinta tibio. Deriva del bg0/bg1 del tono.
function eduPaper(ctx, pal) {
  const g = ctx.createLinearGradient(0, 0, 0, H)
  if (pal.tone === 'light') { g.addColorStop(0, lighten(pal.bg0, 0.25)); g.addColorStop(1, pal.bg0) }
  else { g.addColorStop(0, lighten(pal.bg0, 0.04)); g.addColorStop(1, pal.bg1) }
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
}
// tinta tenue para lineas neutras de cuaderno (gris calido, no color de marca)
function eduInk(pal, a) { return pal.tone === 'light' ? `rgba(40,34,28,${a})` : `rgba(235,228,214,${a})` }
// scrim suave que despeja el centro para el texto
function eduScrim(ctx, pal, center = 0.34, strength = null) {
  const s = strength == null ? (pal.tone === 'light' ? 0.16 : 0.34) : strength
  const v = ctx.createRadialGradient(W / 2, H * 0.46, H * center, W / 2, H * 0.5, H * 0.84)
  v.addColorStop(0, 'rgba(0,0,0,0)')
  v.addColorStop(1, pal.tone === 'light' ? `rgba(255,255,255,${s})` : `rgba(0,0,0,${s})`)
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H)
}

// ============================================================================
// paper-notebook — cuaderno: renglones, cuadriculado, margen
// ============================================================================

register({
  id: 'bg.educacion.notebookruled', lib: 'backgrounds', category: 'paper-notebook', tones: ['dark', 'light'],
  rubros: ['educacion', 'default'], weight: 1.05, register: 'friendly', intensity: 'calm',
  tags: ['educacion', 'cuaderno', 'renglones', 'papel'],
  render(ctx, t, env) {
    const { pal } = env
    eduPaper(ctx, pal)
    // renglones horizontales que respiran muy lento (deriva sub-pixel)
    const step = 30, drift = Math.sin(t * CLK * 0.18) * 2
    ctx.strokeStyle = eduInk(pal, pal.tone === 'light' ? 0.07 : 0.08); ctx.lineWidth = 1
    for (let y = step + drift; y < H; y += step) { ctx.beginPath(); ctx.moveTo(22, y); ctx.lineTo(W, y); ctx.stroke() }
    // margen vertical de acento (la linea roja del cuaderno, pero con la marca)
    ctx.strokeStyle = rgba(pal.accent, pal.tone === 'light' ? 0.5 : 0.6); ctx.lineWidth = 1.6
    ctx.beginPath(); ctx.moveTo(22, 0); ctx.lineTo(22, H); ctx.stroke()
    // perforaciones del margen izquierdo
    ctx.fillStyle = eduInk(pal, pal.tone === 'light' ? 0.1 : 0.12)
    for (let y = step * 1.5; y < H; y += step * 3) { ctx.beginPath(); ctx.arc(11, y, 3.4, 0, TAU); ctx.fill() }
    eduScrim(ctx, pal)
  },
})

register({
  id: 'bg.educacion.gridpaper', lib: 'backgrounds', category: 'paper-notebook', tones: ['dark', 'light'],
  rubros: ['educacion', 'default'], weight: 1, register: 'neutral', intensity: 'calm',
  tags: ['educacion', 'cuadriculado', 'grilla', 'papel', 'matematica'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'gridpaper')
    eduPaper(ctx, pal)
    const minor = 26, drift = (t * CLK * 1.2) % minor
    // cuadricula menor
    ctx.strokeStyle = eduInk(pal, pal.tone === 'light' ? 0.06 : 0.07); ctx.lineWidth = 1
    for (let x = -drift; x < W; x += minor) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
    for (let y = -drift; y < H; y += minor) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }
    // cuadricula mayor cada 4 celdas (acento tenue)
    ctx.strokeStyle = rgba(pal.accent, pal.tone === 'light' ? 0.14 : 0.16); ctx.lineWidth = 1
    for (let x = -drift; x < W; x += minor * 4) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
    for (let y = -drift; y < H; y += minor * 4) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }
    // un par de celdas "marcadas" en los bordes que titilan (vida discreta)
    const cells = 5
    for (let i = 0; i < cells; i++) {
      const gx = Math.floor(range(r, 0, W / minor)) * minor
      const gy = Math.floor(range(r, 0, H / minor)) * minor
      // solo cerca de los bordes (no en la franja central del texto)
      if (gx > W * 0.22 && gx < W * 0.78 && gy > H * 0.3 && gy < H * 0.7) continue
      const a = (pal.tone === 'light' ? 0.1 : 0.14) * (0.5 + 0.5 * Math.sin(t * CLK * 0.7 + i * 1.5))
      ctx.fillStyle = rgba(i % 2 ? pal.accent2 : pal.accent, a)
      ctx.fillRect(gx, gy, minor, minor)
    }
    eduScrim(ctx, pal)
  },
})

register({
  id: 'bg.educacion.dottedgrid', lib: 'backgrounds', category: 'paper-notebook', tones: ['dark', 'light'],
  rubros: ['educacion', 'default'], weight: 0.95, register: 'neutral', intensity: 'calm',
  tags: ['educacion', 'bullet', 'puntos', 'papel', 'minimal'],
  render(ctx, t, env) {
    const { pal } = env
    eduPaper(ctx, pal)
    // bullet-journal: grilla de puntos. Respiracion de tamano muy sutil por t.
    const step = 24, breathe = 0.85 + 0.15 * (0.5 + 0.5 * Math.sin(t * CLK * 0.5))
    ctx.fillStyle = eduInk(pal, pal.tone === 'light' ? 0.16 : 0.18)
    for (let y = step; y < H; y += step) for (let x = step; x < W; x += step) {
      ctx.beginPath(); ctx.arc(x, y, 1.4 * breathe, 0, TAU); ctx.fill()
    }
    // un punto de acento que recorre la grilla (cursor de escritura), snap a la grilla
    const px = Math.round((0.5 + 0.34 * Math.sin(t * CLK * 0.4)) * W / step) * step
    const py = Math.round((0.5 + 0.34 * Math.cos(t * CLK * 0.33)) * H / step) * step
    ctx.fillStyle = rgba(pal.accent, 0.7); ctx.beginPath(); ctx.arc(px, py, 3.2, 0, TAU); ctx.fill()
    eduScrim(ctx, pal, 0.36)
  },
})

register({
  id: 'bg.educacion.ledgerlines', lib: 'backgrounds', category: 'paper-notebook', tones: ['dark', 'light'],
  rubros: ['educacion', 'default'], weight: 0.85, register: 'editorial', intensity: 'soft',
  tags: ['educacion', 'caligrafia', 'renglones', 'guia', 'escritura'],
  render(ctx, t, env) {
    const { pal } = env
    eduPaper(ctx, pal)
    // renglones de caligrafia: banda de 4 lineas (alta, media punteada, base, descendente) repetida
    const band = 60, drift = Math.sin(t * CLK * 0.2) * 3
    for (let y0 = drift; y0 < H; y0 += band) {
      // base y tope solidos
      ctx.strokeStyle = eduInk(pal, pal.tone === 'light' ? 0.1 : 0.11); ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(0, y0 + band * 0.18); ctx.lineTo(W, y0 + band * 0.18); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, y0 + band * 0.7); ctx.lineTo(W, y0 + band * 0.7); ctx.stroke()
      // linea media punteada de acento (la guia)
      ctx.strokeStyle = rgba(pal.accent, pal.tone === 'light' ? 0.28 : 0.34); ctx.lineWidth = 1
      ctx.setLineDash([5, 6]); ctx.beginPath(); ctx.moveTo(0, y0 + band * 0.44); ctx.lineTo(W, y0 + band * 0.44); ctx.stroke(); ctx.setLineDash([])
    }
    eduScrim(ctx, pal, 0.3)
  },
})

// ============================================================================
// geometric-friendly — formas simples didacticas (bloques, ABC, regla)
// ============================================================================

register({
  id: 'bg.educacion.blockshapes', lib: 'backgrounds', category: 'geometric-friendly', tones: ['dark', 'light'],
  rubros: ['educacion', 'default'], weight: 1, register: 'playful', intensity: 'soft',
  tags: ['educacion', 'formas', 'bloques', 'amigable', 'didactico'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'blocks')
    eduPaper(ctx, pal)
    // formas geometricas simples (cuadrado/circulo/triangulo) flotando hacia los BORDES, contornos de marca
    const shapes = 9
    for (let i = 0; i < shapes; i++) {
      const ph = r() * TAU, sp = range(r, 0.2, 0.5)
      // empujadas a los margenes: x cerca de 0/1, y libre
      const edge = r() < 0.5 ? range(r, 0.02, 0.2) : range(r, 0.8, 0.98)
      const bx = edge * W + Math.cos(t * CLK * sp + ph) * 14
      const by = (0.08 + r() * 0.84) * H + Math.sin(t * CLK * sp * 0.8 + ph) * 16
      const sz = 16 + r() * 26
      const kind = (r() * 3) | 0
      const col = i % 3 === 0 ? pal.accent2 : pal.accent
      const filled = r() < 0.4
      ctx.lineWidth = 2.2
      ctx.strokeStyle = rgba(col, pal.tone === 'light' ? 0.4 : 0.48)
      ctx.fillStyle = rgba(col, pal.tone === 'light' ? 0.14 : 0.18)
      const rot = ph + t * CLK * sp * 0.3
      ctx.save(); ctx.translate(bx, by); ctx.rotate(rot)
      ctx.beginPath()
      if (kind === 0) ctx.rect(-sz / 2, -sz / 2, sz, sz)
      else if (kind === 1) ctx.arc(0, 0, sz / 2, 0, TAU)
      else { ctx.moveTo(0, -sz / 2); ctx.lineTo(sz / 2, sz / 2); ctx.lineTo(-sz / 2, sz / 2); ctx.closePath() }
      if (filled) ctx.fill()
      ctx.stroke()
      ctx.restore()
    }
    eduScrim(ctx, pal)
  },
})

register({
  id: 'bg.educacion.confettishapes', lib: 'backgrounds', category: 'geometric-friendly', tones: ['dark', 'light'],
  rubros: ['educacion', 'default'], weight: 0.9, register: 'playful', intensity: 'medium',
  tags: ['educacion', 'graduacion', 'confeti', 'celebracion', 'amigable'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'confetti')
    eduPaper(ctx, pal)
    // confeti didactico cayendo lento (logro/graduacion). Densidad mayor arriba y abajo, raleado al centro.
    const N = 46
    for (let i = 0; i < N; i++) {
      const x0 = r() * W
      const fall = (t * CLK * (8 + r() * 10) + r() * H) % (H + 40) - 20
      const sway = Math.sin(t * CLK * 0.6 + r() * TAU) * 14
      const x = x0 + sway
      // atenuar lo que cae por la franja central de texto
      const centerFade = clamp(Math.abs(fall - H * 0.48) / (H * 0.26), 0, 1)
      if (centerFade <= 0) continue
      const sz = 4 + r() * 6
      const col = i % 3 === 0 ? pal.accent2 : (i % 3 === 1 ? pal.accent : eduInk(pal, 1).replace(/[\d.]+\)$/, '1)'))
      const useInk = i % 3 === 2
      const a = (pal.tone === 'light' ? 0.5 : 0.55) * centerFade
      ctx.save(); ctx.translate(x, fall); ctx.rotate(fall * 0.05 + i)
      ctx.fillStyle = useInk ? eduInk(pal, a) : rgba(col, a)
      if (i % 2) ctx.fillRect(-sz / 2, -sz / 4, sz, sz / 2)
      else { ctx.beginPath(); ctx.arc(0, 0, sz / 2, 0, TAU); ctx.fill() }
      ctx.restore()
    }
    eduScrim(ctx, pal, 0.3)
  },
})

register({
  id: 'bg.educacion.rulerframe', lib: 'backgrounds', category: 'geometric-friendly', tones: ['dark', 'light'],
  rubros: ['educacion', 'default'], weight: 0.85, register: 'corporate', intensity: 'soft',
  tags: ['educacion', 'regla', 'medicion', 'marco', 'didactico'],
  render(ctx, t, env) {
    const { pal } = env
    eduPaper(ctx, pal)
    // marcos de regla en los bordes superior e izquierdo (graduacion tipo escuadra)
    const tick = (x0, y0, dx, dy, perpx, perpy, count, big) => {
      for (let i = 0; i <= count; i++) {
        const x = x0 + dx * i, y = y0 + dy * i
        const len = (i % 5 === 0) ? big : big * 0.5
        ctx.strokeStyle = eduInk(pal, i % 5 === 0 ? (pal.tone === 'light' ? 0.28 : 0.32) : (pal.tone === 'light' ? 0.14 : 0.16))
        ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + perpx * len, y + perpy * len); ctx.stroke()
      }
    }
    // banda superior
    ctx.fillStyle = rgba(pal.accent, pal.tone === 'light' ? 0.06 : 0.08); ctx.fillRect(0, 0, W, 26)
    tick(8, 26, 12, 0, 0, -1, Math.ceil(W / 12), 12)
    // banda izquierda
    ctx.fillStyle = rgba(pal.accent2, pal.tone === 'light' ? 0.06 : 0.08); ctx.fillRect(0, 0, 26, H)
    tick(26, 8, 0, 12, -1, 0, Math.ceil(H / 12), 12)
    // cursor que recorre la regla superior (vida)
    const cx = (0.5 + 0.42 * Math.sin(t * CLK * 0.4)) * W
    ctx.strokeStyle = rgba(pal.accent, pal.tone === 'light' ? 0.5 : 0.6); ctx.lineWidth = 1.4
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, 30); ctx.stroke()
    ctx.fillStyle = rgba(pal.accent, 0.7); ctx.beginPath(); ctx.moveTo(cx, 30); ctx.lineTo(cx - 4, 22); ctx.lineTo(cx + 4, 22); ctx.closePath(); ctx.fill()
    eduScrim(ctx, pal, 0.32)
  },
})

register({
  id: 'bg.educacion.abcblocks', lib: 'backgrounds', category: 'geometric-friendly', tones: ['dark', 'light'],
  rubros: ['educacion', 'default'], weight: 0.85, register: 'playful', intensity: 'medium',
  tags: ['educacion', 'abecedario', 'primaria', 'bloques', 'amigable'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'abc')
    eduPaper(ctx, pal)
    // bloques de letras/numeros (didactico, infantil-amigable) apilados en los margenes inferior/laterales
    const glyphs = ['A', 'B', 'C', '1', '2', '3', '+', '=', 'x']
    const blocks = 7
    for (let i = 0; i < blocks; i++) {
      const side = i % 2
      const bx = (side ? range(r, 0.78, 0.92) : range(r, 0.08, 0.22)) * W
      const by = range(r, 0.12, 0.9) * H
      // descartar centro
      if (by > H * 0.34 && by < H * 0.66 && bx > W * 0.3 && bx < W * 0.7) continue
      const sz = 30 + r() * 14
      const bob = Math.sin(t * CLK * 0.5 + i * 1.3) * 5
      const rot = Math.sin(t * CLK * 0.4 + i) * 0.12
      const col = i % 2 ? pal.accent2 : pal.accent
      ctx.save(); ctx.translate(bx, by + bob); ctx.rotate(rot)
      // cubo
      ctx.fillStyle = rgba(col, pal.tone === 'light' ? 0.16 : 0.2)
      ctx.strokeStyle = rgba(col, pal.tone === 'light' ? 0.42 : 0.5); ctx.lineWidth = 2
      const rr = 6
      ctx.beginPath()
      ctx.moveTo(-sz / 2 + rr, -sz / 2)
      ctx.arcTo(sz / 2, -sz / 2, sz / 2, sz / 2, rr)
      ctx.arcTo(sz / 2, sz / 2, -sz / 2, sz / 2, rr)
      ctx.arcTo(-sz / 2, sz / 2, -sz / 2, -sz / 2, rr)
      ctx.arcTo(-sz / 2, -sz / 2, sz / 2, -sz / 2, rr)
      ctx.closePath(); ctx.fill(); ctx.stroke()
      // glifo
      ctx.fillStyle = rgba(col, pal.tone === 'light' ? 0.6 : 0.7)
      ctx.font = `700 ${Math.round(sz * 0.5)}px "Inter", sans-serif`
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(glyphs[(i * 3 + (r() * 9 | 0)) % glyphs.length], 0, 1)
      ctx.restore()
    }
    eduScrim(ctx, pal)
  },
})

// ============================================================================
// chalkboard — pizarron: verde/negro mate + tiza
// ============================================================================

register({
  id: 'bg.educacion.chalkboard', lib: 'backgrounds', category: 'chalkboard', tones: ['dark', 'light'],
  rubros: ['educacion', 'default'], weight: 0.95, register: 'editorial', intensity: 'soft',
  tags: ['educacion', 'pizarron', 'tiza', 'aula', 'clasico'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'chalk')
    // superficie mate: en dark un pizarron oscuro; en light una pizarra clara/papel
    if (pal.tone === 'light') { ctx.fillStyle = pal.bg0; ctx.fillRect(0, 0, W, H) }
    else { const g = ctx.createRadialGradient(W / 2, H * 0.42, H * 0.1, W / 2, H * 0.5, H * 0.9); g.addColorStop(0, lighten(pal.bg0, 0.06)); g.addColorStop(1, darken(pal.bg1, 0.1)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H) }
    // polvo de tiza disperso (puntitos tenues), estable por seed
    ctx.fillStyle = pal.tone === 'light' ? 'rgba(40,34,28,0.04)' : 'rgba(245,240,230,0.05)'
    for (let i = 0; i < 200; i++) { const x = r() * W, y = r() * H; ctx.fillRect(x, y, 1, 1) }
    // marco de la pizarra (borde de madera = acento)
    const m = 12
    ctx.strokeStyle = rgba(pal.accent, pal.tone === 'light' ? 0.4 : 0.5); ctx.lineWidth = 6
    ctx.strokeRect(m, m, W - m * 2, H - m * 2)
    // trazos de tiza tenues en las esquinas (garabatos didacticos: una llave, una flecha)
    const chalk = pal.tone === 'light' ? rgba(pal.accent2, 0.35) : 'rgba(245,240,230,0.3)'
    ctx.strokeStyle = chalk; ctx.lineWidth = 2; ctx.lineCap = 'round'
    const sway = Math.sin(t * CLK * 0.3) * 3
    // flecha abajo-derecha
    ctx.beginPath(); ctx.moveTo(W * 0.7, H * 0.86 + sway); ctx.lineTo(W * 0.86, H * 0.8); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(W * 0.86, H * 0.8); ctx.lineTo(W * 0.8, H * 0.79); ctx.moveTo(W * 0.86, H * 0.8); ctx.lineTo(W * 0.84, H * 0.85); ctx.stroke()
    // subrayado ondulado arriba-izquierda
    ctx.beginPath()
    for (let x = W * 0.1; x < W * 0.34; x += 6) ctx.lineTo(x, H * 0.16 + Math.sin(x * 0.3 + t * CLK * 0.5) * 2)
    ctx.stroke()
    ctx.lineCap = 'butt'
  },
})

register({
  id: 'bg.educacion.chalkdiagram', lib: 'backgrounds', category: 'chalkboard', tones: ['dark', 'light'],
  rubros: ['educacion', 'default'], weight: 0.8, register: 'editorial', intensity: 'medium',
  tags: ['educacion', 'pizarron', 'diagrama', 'ciencia', 'formula'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'chalkdia')
    if (pal.tone === 'light') { ctx.fillStyle = pal.bg0; ctx.fillRect(0, 0, W, H) }
    else { ctx.fillStyle = darken(pal.bg1, 0.06); ctx.fillRect(0, 0, W, H) }
    const chalk = (a) => pal.tone === 'light' ? rgba(pal.accent, a) : `rgba(240,236,226,${a})`
    ctx.lineCap = 'round'
    // diagramas de tiza tenues hacia los bordes: orbitas (atomo), ejes, llaves
    // atomo arriba-izquierda
    const ax = W * 0.18, ay = H * 0.16
    ctx.strokeStyle = chalk(pal.tone === 'light' ? 0.3 : 0.26); ctx.lineWidth = 1.6
    for (let k = 0; k < 3; k++) {
      ctx.save(); ctx.translate(ax, ay); ctx.rotate(k * Math.PI / 3 + t * CLK * 0.08)
      ctx.beginPath(); ctx.ellipse(0, 0, 30, 12, 0, 0, TAU); ctx.stroke(); ctx.restore()
    }
    ctx.fillStyle = chalk(0.5); ctx.beginPath(); ctx.arc(ax, ay, 3, 0, TAU); ctx.fill()
    // ejes cartesianos abajo-derecha
    const ex = W * 0.74, ey = H * 0.82
    ctx.strokeStyle = chalk(pal.tone === 'light' ? 0.28 : 0.24); ctx.lineWidth = 1.6
    ctx.beginPath(); ctx.moveTo(ex - 40, ey); ctx.lineTo(ex + 46, ey); ctx.moveTo(ex, ey + 40); ctx.lineTo(ex, ey - 46); ctx.stroke()
    // curva que se dibuja/borra suave (parabola), animada por t
    ctx.strokeStyle = chalk(pal.tone === 'light' ? 0.36 : 0.3); ctx.lineWidth = 2
    ctx.beginPath()
    const reach = 0.5 + 0.5 * Math.sin(t * CLK * 0.4)
    for (let x = -40; x <= 46 * reach; x += 4) { const yy = ey - (x * x) * 0.02; ctx.lineTo(ex + x, yy) }
    ctx.stroke()
    ctx.lineCap = 'butt'
  },
})

// ============================================================================
// soft-gradient — fondos calidos suaves del rubro (papel tibio, halo de foco)
// ============================================================================

register({
  id: 'bg.educacion.warmwash', lib: 'backgrounds', category: 'soft-gradient', tones: ['dark', 'light'],
  rubros: ['educacion', 'default'], weight: 1.1, register: 'friendly', intensity: 'calm',
  tags: ['educacion', 'gradiente', 'calido', 'suave', 'universal'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'warm')
    eduPaper(ctx, pal)
    // dos halos calidos a la deriva hacia los bordes superior e inferior (acento tibio)
    ctx.globalCompositeOperation = pal.tone === 'light' ? 'multiply' : 'lighter'
    const halos = [
      { x: W * 0.22, y: H * 0.14, col: pal.accent },
      { x: W * 0.8, y: H * 0.88, col: pal.accent2 },
    ]
    halos.forEach((h, i) => {
      const ph = r() * TAU
      const bx = h.x + Math.sin(t * CLK * 0.3 + ph) * 22
      const by = h.y + Math.cos(t * CLK * 0.26 + ph) * 18
      const rad = H * 0.42
      const g = ctx.createRadialGradient(bx, by, 0, bx, by, rad)
      g.addColorStop(0, rgba(h.col, pal.tone === 'light' ? 0.13 : 0.2)); g.addColorStop(1, rgba(h.col, 0))
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    })
    ctx.globalCompositeOperation = 'source-over'
    eduScrim(ctx, pal, 0.4)
  },
})

register({
  id: 'bg.educacion.focusspot', lib: 'backgrounds', category: 'soft-gradient', tones: ['dark', 'light'],
  rubros: ['educacion', 'default'], weight: 0.9, register: 'neutral', intensity: 'calm',
  tags: ['educacion', 'foco', 'spotlight', 'lectura', 'suave'],
  render(ctx, t, env) {
    const { pal } = env
    eduPaper(ctx, pal)
    // halo de foco central muy suave (zona de lectura iluminada), con anillo de acento tenue
    const cx = W / 2 + Math.sin(t * CLK * 0.25) * 12, cy = H * 0.44
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, H * 0.6)
    if (pal.tone === 'light') { g.addColorStop(0, 'rgba(255,255,255,0.5)'); g.addColorStop(0.6, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(40,34,28,0.05)') }
    else { g.addColorStop(0, rgba(lighten(pal.bg0, 0.14), 0.7)); g.addColorStop(0.6, rgba(pal.bg0, 0)); g.addColorStop(1, rgba(darken(pal.bg1, 0.2), 0.5)) }
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    // anillo de acento que respira lento (encuadre del foco), hacia el borde del halo
    const rr = H * 0.5 * (0.97 + 0.03 * Math.sin(t * CLK * 0.5))
    ctx.strokeStyle = rgba(pal.accent, pal.tone === 'light' ? 0.12 : 0.16); ctx.lineWidth = 2
    ctx.beginPath(); ctx.arc(cx, cy, rr, 0, TAU); ctx.stroke()
  },
})

// ============================================================================
// didactic-lines — flechas, diagramas de flujo, conexiones (mapa de aprendizaje)
// ============================================================================

register({
  id: 'bg.educacion.flowmap', lib: 'backgrounds', category: 'didactic-lines', tones: ['dark', 'light'],
  rubros: ['educacion', 'default'], weight: 0.9, register: 'corporate', intensity: 'soft',
  tags: ['educacion', 'flujo', 'diagrama', 'pasos', 'nodos'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'flow')
    eduPaper(ctx, pal)
    // nodos conectados en los margenes (mapa de pasos/aprendizaje). Posiciones sembradas en bandas laterales.
    const nodes = []
    const cols = [W * 0.12, W * 0.88]
    for (let c = 0; c < 2; c++) for (let k = 0; k < 4; k++) {
      nodes.push({ x: cols[c] + range(r, -10, 10), y: H * (0.12 + k * 0.25) + range(r, -8, 8) })
    }
    // conexiones tenues entre nodos cercanos (curvas)
    ctx.strokeStyle = rgba(pal.accent, pal.tone === 'light' ? 0.18 : 0.22); ctx.lineWidth = 1.4
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i], b = nodes[(i + 1) % nodes.length]
      if (Math.abs(a.y - b.y) > H * 0.4) continue
      ctx.beginPath(); ctx.moveTo(a.x, a.y)
      ctx.quadraticCurveTo((a.x + b.x) / 2, (a.y + b.y) / 2 + Math.sin(t * CLK * 0.3 + i) * 8, b.x, b.y); ctx.stroke()
    }
    // nodos: circulos con punto central; uno "activo" pulsa
    nodes.forEach((n, i) => {
      const active = (Math.floor(t * CLK * 0.5) % nodes.length) === i
      const pulse = active ? 0.5 + 0.5 * Math.sin(t * CLK * 2) : 0
      ctx.fillStyle = rgba(pal.tone === 'light' ? lighten(pal.bg0, 0.3) : pal.bg0, 0.9)
      ctx.strokeStyle = rgba(i % 2 ? pal.accent2 : pal.accent, (pal.tone === 'light' ? 0.4 : 0.5) + pulse * 0.3)
      ctx.lineWidth = 1.8
      ctx.beginPath(); ctx.arc(n.x, n.y, 9 + pulse * 2, 0, TAU); ctx.fill(); ctx.stroke()
      ctx.fillStyle = rgba(i % 2 ? pal.accent2 : pal.accent, 0.7)
      ctx.beginPath(); ctx.arc(n.x, n.y, 2.6, 0, TAU); ctx.fill()
    })
    eduScrim(ctx, pal, 0.36)
  },
})

register({
  id: 'bg.educacion.checklist', lib: 'backgrounds', category: 'didactic-lines', tones: ['dark', 'light'],
  rubros: ['educacion', 'default'], weight: 0.8, register: 'friendly', intensity: 'soft',
  tags: ['educacion', 'checklist', 'tareas', 'progreso', 'lista'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'check')
    eduPaper(ctx, pal)
    // lista de items con casillas en la columna izquierda (margen) que se van tildando con t
    const rows = 11, x0 = 20, step = (H - 40) / rows
    const done = Math.floor((0.5 + 0.5 * Math.sin(t * CLK * 0.3)) * rows)
    for (let i = 0; i < rows; i++) {
      const y = 28 + i * step
      const box = 13
      // casilla
      ctx.strokeStyle = eduInk(pal, pal.tone === 'light' ? 0.22 : 0.26); ctx.lineWidth = 1.4
      ctx.strokeRect(x0, y - box / 2, box, box)
      const checked = i < done
      if (checked) {
        ctx.strokeStyle = rgba(pal.accent, pal.tone === 'light' ? 0.6 : 0.7); ctx.lineWidth = 2; ctx.lineCap = 'round'
        ctx.beginPath(); ctx.moveTo(x0 + 2.5, y); ctx.lineTo(x0 + box * 0.42, y + box * 0.36); ctx.lineTo(x0 + box - 1.5, y - box * 0.4); ctx.stroke(); ctx.lineCap = 'butt'
      }
      // "texto" como linea tenue (longitud sembrada), solo en los lados, raleado al centro vertical
      const len = (W - x0 - 26) * range(r, 0.4, 0.92)
      ctx.fillStyle = eduInk(pal, checked ? (pal.tone === 'light' ? 0.1 : 0.12) : (pal.tone === 'light' ? 0.16 : 0.18))
      ctx.fillRect(x0 + box + 8, y - 2.5, len, 5)
    }
    eduScrim(ctx, pal, 0.42)
  },
})

register({
  id: 'bg.educacion.lightbulbs', lib: 'backgrounds', category: 'geometric-friendly', tones: ['dark', 'light'],
  rubros: ['educacion', 'default'], weight: 0.8, register: 'playful', intensity: 'soft',
  tags: ['educacion', 'idea', 'lamparita', 'inspiracion', 'amigable'],
  render(ctx, t, env) {
    const { pal } = env, r = seedFor(env.seed, 'bulb')
    eduPaper(ctx, pal)
    // lamparitas-idea simples (circulo + base + rayitos) flotando en los bordes; una "prende" por turno
    const bulbs = 6
    for (let i = 0; i < bulbs; i++) {
      const side = i % 2
      const bx = (side ? range(r, 0.8, 0.92) : range(r, 0.08, 0.2)) * W
      const by = range(r, 0.1, 0.9) * H
      if (by > H * 0.36 && by < H * 0.64) continue
      const sz = 14 + r() * 8
      const bob = Math.sin(t * CLK * 0.5 + i) * 4
      const on = (Math.floor(t * CLK * 0.4) % bulbs) === i
      const glow = on ? 0.5 + 0.5 * Math.sin(t * CLK * 3) : 0
      const col = i % 2 ? pal.accent2 : pal.accent
      ctx.save(); ctx.translate(bx, by + bob)
      // halo si esta prendida
      if (glow > 0.05) {
        const gg = ctx.createRadialGradient(0, 0, 0, 0, 0, sz * 2.4)
        gg.addColorStop(0, rgba(col, 0.22 * glow)); gg.addColorStop(1, rgba(col, 0))
        ctx.fillStyle = gg; ctx.fillRect(-sz * 2.4, -sz * 2.4, sz * 4.8, sz * 4.8)
      }
      // bulbo
      ctx.strokeStyle = rgba(col, pal.tone === 'light' ? 0.45 : 0.55); ctx.lineWidth = 2
      ctx.fillStyle = rgba(col, (pal.tone === 'light' ? 0.12 : 0.16) + glow * 0.2)
      ctx.beginPath(); ctx.arc(0, 0, sz, 0, TAU); ctx.fill(); ctx.stroke()
      // base (rosca)
      ctx.beginPath(); ctx.moveTo(-sz * 0.4, sz); ctx.lineTo(sz * 0.4, sz); ctx.moveTo(-sz * 0.3, sz + 4); ctx.lineTo(sz * 0.3, sz + 4); ctx.stroke()
      // rayitos
      ctx.strokeStyle = rgba(col, (pal.tone === 'light' ? 0.3 : 0.4) + glow * 0.3); ctx.lineWidth = 1.6
      for (let k = 0; k < 6; k++) {
        const a = -Math.PI / 2 + (k - 2.5) * 0.42
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * (sz + 4), Math.sin(a) * (sz + 4)); ctx.lineTo(Math.cos(a) * (sz + 9 + glow * 3), Math.sin(a) * (sz + 9 + glow * 3)); ctx.stroke()
      }
      ctx.restore()
    }
    eduScrim(ctx, pal)
  },
})
