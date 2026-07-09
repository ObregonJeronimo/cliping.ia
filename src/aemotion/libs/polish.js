// aemotion 0.2 · POLISH — la capa de PUESTA EN ESCENA que separa "animacion correcta" de "video AE":
//  1) IDLE universal: nada esta quieto jamas — cada elemento flota/respira con fase propia (cerrado en t)
//  2) SALIDAS: los elementos se despiden ANTES del corte (stagger inverso), la escena nunca muere congelada
//  3) JERARQUIA: eyebrow (kicker con tracking), microcopy de soporte, metadata de esquina
//  4) PROFUNDIDAD: flotantes decorativos en 2 planos (lejano difuso + cercano nitido) con parallax
//  5) GLOW: neon multipasada (shadowBlur creciente con alpha decreciente) para las familias oscuras
// Todo funcion pura de (t, seed): determinista, seek gratis.
import { TAU, clamp, lerp, rgba, fontStr } from '../core/util.js'
import { seedFor } from '../core/prng.js'
import { win, cubicOut, expoOut } from '../core/motion.js'
import { drawShape } from '../core/shapes.js'
import { circlePath, starPath, polygonPath, linePath, rectPath, tracePath } from '../core/path.js'

// ---------- idle: deriva continua con fase por elemento (amp px, period seg) ----------
export function idle(t, phase, amp = 3, period = 5) {
  const a = TAU * (t / period) + phase
  return { dx: Math.sin(a) * amp, dy: Math.cos(a * 0.83 + 1.7) * amp * 0.7, rot: Math.sin(a * 0.6) * 0.012 }
}

// ---------- salida coreografiada: p=0 vivo · p=1 afuera. dir -1 arriba / 1 abajo ----------
// stagger inverso: el elemento i de n sale ANTES que el i+1 (el que entro primero sale primero)
export function exitP(outP, i = 0, n = 1) {
  if (outP <= 0) return 0
  const dur = 1 / (1 + (n - 1) * 0.4)
  const start = i * dur * 0.4
  return clamp((outP - start) / dur, 0, 1)
}
// la salida ACELERA (ease-in, regla pro: la entrada decelera, la salida acelera) + achica levemente
export function applyExit(ctx, ep, cx, cy, dir = -1) {
  if (ep <= 0) return 1
  const e = ep * ep * ep
  ctx.translate(0, dir * e * 52)
  ctx.translate(cx, cy); ctx.scale(1 - 0.1 * e, 1 - 0.1 * e); ctx.translate(-cx, -cy)
  return 1 - clamp(ep * 1.25 - 0.05, 0, 1)                     // alpha: se va un pelo antes que el movimiento
}

// ---------- glow neon multipasada (para familias oscuras; en claras degrada a sombra suave) ----------
export function glowFill(ctx, traceFn, color, k = 1) {
  if (k > 0.05) {
    ctx.save()
    ctx.shadowColor = color
    for (const [blur, a] of [[18, 0.5], [42, 0.3]]) {
      ctx.shadowBlur = blur * k
      ctx.globalAlpha *= a
      traceFn(ctx); ctx.fillStyle = color; ctx.fill()
      ctx.globalAlpha /= a
    }
    ctx.restore()
  }
  traceFn(ctx); ctx.fillStyle = color; ctx.fill()
}
export function glowStroke(ctx, traceFn, color, width, k = 1) {
  ctx.save()
  ctx.lineWidth = width
  if (k > 0.05) {
    ctx.shadowColor = color
    ctx.shadowBlur = 22 * k
    ctx.strokeStyle = color
    traceFn(ctx); ctx.stroke()
  }
  ctx.shadowBlur = 0
  ctx.strokeStyle = color
  traceFn(ctx); ctx.stroke()
  ctx.restore()
}
// texto con glow (2 pasadas de sombra + nitido)
export function glowText(ctx, str, x, y, color, k = 1) {
  ctx.save()
  if (k > 0.05) {
    ctx.shadowColor = color; ctx.shadowBlur = 26 * k
    ctx.fillStyle = color
    ctx.fillText(str, x, y)
  }
  ctx.shadowBlur = 0
  ctx.fillStyle = color
  ctx.fillText(str, x, y)
  ctx.restore()
}

// ---------- eyebrow / kicker: "01 · PALABRA" chiquito con tracking ancho + reglita ----------
export function drawEyebrow(ctx, env, text, y, p = 1, ep = 0) {
  if (p <= 0 || !text) return
  const { W, dna, ink } = env
  const e = expoOut(clamp(p, 0, 1))
  const alpha = clamp(e * 1.4, 0, 1) * (1 - cubicOut(ep))
  if (alpha <= 0.01) return
  ctx.save()
  ctx.globalAlpha *= alpha
  ctx.font = fontStr(dna.sw, 11.5, dna.support)
  ctx.letterSpacing = '3.5px'
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = rgba(ink, 0.62)
  const t = String(text).toUpperCase()
  ctx.fillText(t, W / 2, y - (1 - e) * 10)
  const tw = ctx.measureText(t).width
  ctx.strokeStyle = rgba(env.acc, 0.7); ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.moveTo(W / 2 - tw / 2 - 26, y); ctx.lineTo(W / 2 - tw / 2 - 10, y)
  ctx.moveTo(W / 2 + tw / 2 + 10, y); ctx.lineTo(W / 2 + tw / 2 + 26, y); ctx.stroke()
  ctx.restore()
}

// ---------- metadata de esquina: coordenadas falsas / marca / ticks (identidad editorial) ----------
export function drawCornerMeta(ctx, env, t) {
  const { W, H, dna, ink, video } = env
  const r = seedFor(video.seed, 'am.meta')                      // fijo POR VIDEO (no por escena)
  const style = (r() * 3) | 0
  ctx.save()
  ctx.globalAlpha *= 0.5
  ctx.font = fontStr(dna.sw, 9.5, dna.support)
  ctx.letterSpacing = '2px'
  ctx.fillStyle = ink
  const brand = (video.brand || '').toUpperCase()
  if (style === 0) {
    ctx.textAlign = 'left'; ctx.fillText(brand, env.margin, 30)
    ctx.textAlign = 'right'; ctx.fillText('9:16 · ' + Math.round(dna.bpm), W - env.margin, 30)
  } else if (style === 1) {
    ctx.textAlign = 'left'; ctx.fillText('● ' + brand, env.margin, H - 18)
  } else {
    ctx.textAlign = 'right'; ctx.fillText(brand + ' ©', W - env.margin, H - 18)
  }
  ctx.restore()
}

// ---------- flotantes con profundidad: plano lejano (grande, difuso, lento) + cercano (nitido) ----------
// dialecto decide la forma; posiciones seedeadas por escena FUERA del tercio central (texto)
export function drawFloaters(ctx, env, t, p = 1, ep = 0) {
  if (p <= 0) return
  const { W, H, dna, acc } = env
  const r = env.rng('floaters')
  const n = 3 + ((r() * 2) | 0)
  const alive = clamp(p, 0, 1) * (1 - cubicOut(ep) * 0.85)
  for (let i = 0; i < n; i++) {
    const far = i < n / 2                                        // primeros = plano lejano
    const px = r() < 0.5 ? 0.08 + r() * 0.2 : 0.72 + r() * 0.2
    const py = 0.06 + r() * (i % 2 ? 0.22 : 0.78)
    const ph = r() * TAU
    const sz = far ? 5 + r() * 9 : 2.5 + r() * 4
    const kind = r()
    const { dx, dy } = idle(t, ph, far ? 7 : 3.5, far ? 8 : 5)
    const x = W * px + dx * (far ? 1.4 : 1), y = H * py + dy * (far ? 1.4 : 1)
    const a = alive * (far ? 0.28 : 0.75) * clamp(win(t, 0.15 + i * 0.12, 0.8 + i * 0.12), 0, 1)
    if (a <= 0.01) continue
    ctx.save()
    ctx.globalAlpha *= a
    const glow = env.dark ? dna.glowK * (far ? 0.4 : 1) : 0
    const col = i % 2 ? (env.acc2 || acc) : acc                 // el segundo color del esquema vive aca
    if (dna.shapeDialect === 'anillos') {
      glowStroke(ctx, c => { c.beginPath(); c.arc(x, y, sz, 0, TAU) }, col, far ? 1 : 1.5, glow)
    } else if (dna.shapeDialect === 'gotas') {
      glowFill(ctx, c => { c.beginPath(); c.arc(x, y, sz * 0.8, 0, TAU) }, col, glow)
    } else if (dna.shapeDialect === 'grid') {
      glowStroke(ctx, c => { c.beginPath(); c.moveTo(x - sz, y); c.lineTo(x + sz, y); c.moveTo(x, y - sz); c.lineTo(x, y + sz) }, col, 1.4, glow)
    } else if (dna.shapeDialect === 'subrayados') {
      glowStroke(ctx, c => { c.beginPath(); c.moveTo(x - sz, y); c.lineTo(x + sz, y) }, col, 2, glow * 0.5)
    } else if (dna.shapeDialect === 'estrellas') {
      glowFill(ctx, c => tracePath(c, starPath(x, y, sz, sz * 0.45, 5, t * 0.12 + ph)), col, glow)
    } else if (dna.shapeDialect === 'arcos') {
      const a0 = ph + t * 0.1
      glowStroke(ctx, c => { c.beginPath(); c.arc(x, y, sz, a0, a0 + 2.1) }, col, far ? 1.2 : 1.8, glow)
    } else {
      ctx.translate(x, y); ctx.rotate(t * 0.15 + ph)
      glowFill(ctx, c => { c.beginPath(); c.rect(-sz * 0.7, -sz * 0.7, sz * 1.4, sz * 1.4) }, col, glow)
    }
    ctx.restore()
  }
}

// ---------- microcopy de soporte (bajo el titular) ----------
export function drawSupport(ctx, env, text, y, p = 1, ep = 0) {
  if (!text || p <= 0) return
  const { W, dna, ink } = env
  const e = expoOut(clamp(p, 0, 1))
  const alpha = clamp(e * 1.3, 0, 1) * 0.68 * (1 - cubicOut(ep))
  if (alpha <= 0.01) return
  ctx.save()
  ctx.globalAlpha *= alpha
  ctx.font = fontStr(dna.sw, 14.5, dna.support)
  ctx.letterSpacing = '0.4px'
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = ink
  ctx.fillText(text, W / 2, y + (1 - e) * 12)
  ctx.restore()
}
