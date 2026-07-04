// kinetic 1.0 · MOTION — el corazon del calibre AE: springs con overshoot/settle en forma CERRADA
// (sin estado, sin integracion numerica) -> evaluar en cualquier t da SIEMPRE el mismo valor (determinismo
// y seek gratis). La "calidad After Effects" es 80% easing+timing: todo el motor anima con estas curvas.
import { clamp } from './util.js'

// --- easings clasicos (t en [0,1]) ---
export const linear = t => t
export const expoOut = t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t))
export const cubicOut = t => 1 - Math.pow(1 - t, 3)
export const quintOut = t => 1 - Math.pow(1 - t, 5)
export const cubicInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
export const backOut = (t, s = 1.70158) => { const u = t - 1; return 1 + u * u * ((s + 1) * u + s) }

// spring subamortiguado en forma cerrada: 1 - e^(-z*w*t) * (cos(wd*t) + (z*w/wd)*sin(wd*t))
// z (zeta) = amortiguacion 0..1 (0.5 rebota mucho, 0.9 casi sin rebote) · w (omega) = velocidad angular.
// Con t en [0,1] y w~10-16 asienta dentro de la ventana. Es LA curva de "pop con settle" de AE.
export function spring(t, z = 0.62, w = 12) {
  if (t <= 0) return 0
  if (t >= 1) return 1
  z = clamp(z, 0.05, 0.999)
  const wd = w * Math.sqrt(1 - z * z)
  const e = Math.exp(-z * w * t)
  return 1 - e * (Math.cos(wd * t) + (z * w / wd) * Math.sin(wd * t))
}

// wobble decreciente alrededor de 0 (para rotacion de settle de polaroids/tokens): amplitud->0 cuando t->1
export function wobble(t, cycles = 2.5, decay = 4) {
  if (t <= 0 || t >= 1) return 0
  return Math.sin(t * Math.PI * 2 * cycles) * Math.exp(-decay * t) * (1 - t)
}

// --- stagger: t local del item i de n dentro de una ventana [0,1] ---
// overlap 0 = secuencial puro (typewriter); 1 = todos juntos. Devuelve [0,1] clampeado listo para un easing.
export function stagger(t, i, n, overlap = 0.6) {
  if (n <= 1) return clamp(t, 0, 1)
  const dur = 1 / (1 + (n - 1) * (1 - overlap))       // duracion de cada item para que el ultimo termine en t=1
  const start = i * dur * (1 - overlap)
  return clamp((t - start) / dur, 0, 1)
}

// --- ghost: motion blur fake, barato y determinista ---
// dibuja drawFn 3 veces: 2 fantasmas desplazados HACIA ATRAS del vector de velocidad con alpha bajo + el real.
// Solo tiene sentido cuando el desplazamiento del frame es grande (llamador decide con speed).
export function ghost(ctx, drawFn, vx, vy, k = 0.5) {
  const g = clamp(k, 0, 1)
  if (g > 0.02) {
    ctx.save(); ctx.globalAlpha *= 0.14 * g; ctx.translate(-vx * 0.66, -vy * 0.66); drawFn(ctx); ctx.restore()
    ctx.save(); ctx.globalAlpha *= 0.26 * g; ctx.translate(-vx * 0.33, -vy * 0.33); drawFn(ctx); ctx.restore()
  }
  drawFn(ctx)
}

// ventana util: progreso [0,1] de t dentro de [a,b] (para sub-animaciones dentro de un beat)
export const win = (t, a, b) => clamp((t - a) / Math.max(1e-6, b - a), 0, 1)

// hold-and-settle: entra con spring en la ventana [0,inDur], se queda en 1 (para entradas de texto/cards)
export const enter = (t, inDur, z, w) => spring(win(t, 0, inDur), z, w)
