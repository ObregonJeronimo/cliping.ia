import { Easing, spring } from 'remotion'
import { clamp } from './theme'

/**
 * motion.js — el sistema de movimiento central.
 *
 * Todas las escenas consumen estos helpers para que el movimiento sea consistente
 * y "pro": curvas premium, entradas con stagger, springs con overshoot/anticipation,
 * parallax, deriva de cámara y flote (nada queda nunca quieto).
 *
 * Regla: nada aparece de golpe ni se mueve lineal.
 */

// ── Curvas curadas (cubic-bezier) ─────────────────────────────────────────────
export const EASE = {
  out: Easing.bezier(0.16, 1, 0.3, 1),       // desaceleración suave (expo)
  inOut: Easing.bezier(0.65, 0, 0.35, 1),    // simétrica suave
  soft: Easing.bezier(0.25, 0.1, 0.25, 1),   // clásica, calma
  snappy: Easing.bezier(0.5, 0, 0.1, 1),     // entra rápida, frena
  back: Easing.bezier(0.34, 1.4, 0.64, 1),   // overshoot (se pasa y vuelve)
  anticipate: Easing.bezier(0.7, -0.4, 0.4, 1.4), // retrocede antes de arrancar
}

// ── Presets de spring ─────────────────────────────────────────────────────────
export const SPRING = {
  smooth: { damping: 200, mass: 1, stiffness: 100 }, // sin rebote
  bouncy: { damping: 12, mass: 1, stiffness: 130 },  // rebote marcado
  pop: { damping: 9, mass: 0.6, stiffness: 150 },    // pop con overshoot
  gentle: { damping: 26, mass: 1.1, stiffness: 90 }, // suave, casi sin rebote
}

// ── Progreso eased entre [from, from+dur] ─────────────────────────────────────
export const prog = (frame, from, dur, ease = EASE.out) =>
  ease(clamp((frame - from) / Math.max(1, dur), 0, 1))

// ── Spring helper ─────────────────────────────────────────────────────────────
export const spr = (frame, fps, from = 0, preset = SPRING.bouncy, durationInFrames) =>
  spring({ frame: frame - from, fps, config: preset, durationInFrames })

// ── Stagger: delay del item i ─────────────────────────────────────────────────
export const stagger = (i, base = 6, step = 4) => base + i * step

/**
 * Entrada: fade + desplazamiento con easing premium.
 * axis 'y'|'x'. Devuelve { opacity, transform }.
 */
export const enter = (frame, from = 0, { dur = 16, dist = 60, axis = 'y', ease = EASE.out } = {}) => {
  const p = prog(frame, from, dur, ease)
  const op = clamp((frame - from) / Math.max(1, dur * 0.7), 0, 1)
  const off = (1 - p) * dist
  return { opacity: op, transform: axis === 'x' ? `translateX(${off}px)` : `translateY(${off}px)` }
}

// ── Flote idle (nada queda quieto). Devuelve px. ──────────────────────────────
export const floatY = (frame, amp = 8, period = 90, phase = 0) =>
  Math.sin((frame / period) * Math.PI * 2 + phase) * amp

// ── Respiración (escala ~1 que late). ─────────────────────────────────────────
export const breathe = (frame, amp = 0.015, period = 120) =>
  1 + Math.sin((frame / period) * Math.PI * 2) * amp

/**
 * Deriva de cámara: leve zoom + paneo a lo largo de toda la escena.
 * total = durationInFrames de la escena. Devuelve { scale, x, y }.
 */
export const cameraDrift = (frame, total, amount = 0.05) => {
  const t = prog(frame, 0, total, EASE.inOut)
  return { scale: 1 + amount * t, x: (t - 0.5) * amount * 220, y: (t - 0.5) * amount * 80 }
}

/**
 * Parallax: capas a distinta profundidad se mueven distinto con la cámara.
 * depth 0 = fondo (lento), 1 = frente (rápido). Devuelve { x, y }.
 */
export const parallax = (cam, depth = 0.5) => ({ x: cam.x * depth, y: cam.y * depth })

// Re-export por comodidad
export { clamp } from './theme'
