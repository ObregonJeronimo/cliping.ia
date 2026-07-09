// aemotion 0.1 · MOTION — springs con overshoot/settle en forma CERRADA (misma matematica probada de
// kinetic; copia independiente, regla del proyecto: cero imports cruzados entre motores) + lo NUEVO:
// la DERIVADA ANALITICA del spring (alimenta squash&stretch y motion blur sin diferencias finitas)
// y el squash con preservacion de area. Todo funcion pura de t.
import { clamp } from './util.js'

// --- easings clasicos (t en [0,1]) ---
export const linear = t => t
export const expoOut = t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t))
export const cubicOut = t => 1 - Math.pow(1 - t, 3)
export const quintOut = t => 1 - Math.pow(1 - t, 5)
export const cubicInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
export const backOut = (t, s = 1.70158) => { const u = t - 1; return 1 + u * u * ((s + 1) * u + s) }

// spring subamortiguado en forma cerrada: 1 - e^(-z*w*t) * (cos(wd*t) + (z*w/wd)*sin(wd*t))
// z = amortiguacion 0..1 (0.5 rebota mucho, 0.9 casi sin rebote) · w = velocidad angular (10-16 asienta en ventana)
export function spring(t, z = 0.62, w = 12) {
  if (t <= 0) return 0
  if (t >= 1) return 1
  z = clamp(z, 0.05, 0.999)
  const wd = w * Math.sqrt(1 - z * z)
  const e = Math.exp(-z * w * t)
  return 1 - e * (Math.cos(wd * t) + (z * w / wd) * Math.sin(wd * t))
}

// DERIVADA analitica del spring (velocidad, por unidad de t): v(t) = (w²/wd) · e^(-z·w·t) · sin(wd·t)
// Es la que gobierna squash (estirar segun velocidad) y motion blur (cuanto smear) — cerrada, sin estado.
export function springVel(t, z = 0.62, w = 12) {
  if (t <= 0 || t >= 1) return 0
  z = clamp(z, 0.05, 0.999)
  const wd = w * Math.sqrt(1 - z * z)
  return (w * w / wd) * Math.exp(-z * w * t) * Math.sin(wd * t)
}

// wobble decreciente alrededor de 0 (rotacion de settle): amplitud->0 cuando t->1
export function wobble(t, cycles = 2.5, decay = 4) {
  if (t <= 0 || t >= 1) return 0
  return Math.sin(t * Math.PI * 2 * cycles) * Math.exp(-decay * t) * (1 - t)
}

// stagger: t local del item i de n dentro de una ventana [0,1]; overlap 0 = secuencial, 1 = todos juntos
export function stagger(t, i, n, overlap = 0.6) {
  if (n <= 1) return clamp(t, 0, 1)
  const dur = 1 / (1 + (n - 1) * (1 - overlap))
  const start = i * dur * (1 - overlap)
  return clamp((t - start) / dur, 0, 1)
}

// ventana util: progreso [0,1] de t dentro de [a,b]
export const win = (t, a, b) => clamp((t - a) / Math.max(1e-6, b - a), 0, 1)

// --- SQUASH & STRETCH con preservacion de area ---
// factor s en la direccion del movimiento y 1/s en la perpendicular -> area exacta (s·1/s = 1).
// s sale de la velocidad: s = 1 + clamp(|v|·k, 0, max). Con v de springVel o velOf, puro y determinista.
export function squashFactor(speed, k = 0.03, max = 0.22) {
  return 1 + clamp(Math.abs(speed) * k, 0, max)
}

// aplica el squash alrededor de (cx,cy) orientado al vector velocidad (vx,vy) y dibuja adentro.
// |v| chico -> dibuja directo (evita atan2 con vector ~0).
export function withSquash(ctx, cx, cy, vx, vy, k, max, draw) {
  const sp = Math.hypot(vx, vy)
  const s = squashFactor(sp, k, max)
  if (s <= 1.001) { draw(ctx); return }
  const th = Math.atan2(vy, vx)
  ctx.save()
  ctx.translate(cx, cy); ctx.rotate(th); ctx.scale(s, 1 / s); ctx.rotate(-th); ctx.translate(-cx, -cy)
  draw(ctx)
  ctx.restore()
}
