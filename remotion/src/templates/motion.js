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

// ── Intensidad de movimiento según la ENERGÍA de la marca (del ADN/playbook) ──────────────────
// medio = 1.0 EXACTO -> no regresa el vertical actual. alto = más viaje y más rápido (punch).
// bajo = menos viaje y más lento (calmo/elegante). Lo leen camera() y entrance() vía art.energy.
const _ENERGY = (art) => (art && art.energy) || 'medio'
const CAM_K = { alto: 1.32, medio: 1.0, bajo: 0.72 }   // multiplica el "amount" de la cámara
const DIST_K = { alto: 1.18, medio: 1.0, bajo: 0.82 }  // viaje de las entradas
const DUR_K = { alto: 0.82, medio: 1.0, bajo: 1.22 }   // velocidad de las entradas (menor = más rápido)

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
export const floatY = (frame, amp = 6, period = 120, phase = 0) =>
  Math.sin((frame / period) * Math.PI * 2 + phase) * amp

// ── Respiración (escala ~1 que late). ─────────────────────────────────────────
export const breathe = (frame, amp = 0.012, period = 160) =>
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

// ══════════════════════════════════════════════════════════════════════════════
// DIRECCIÓN DE ARTE — variedad de movimiento por video (azar curado).
//
// El director elige una "art direction" por video (spec.art) que cambia CÓMO se
// mueve todo: el viaje de cámara y la familia de entrada de los elementos. Las
// escenas llaman a camera(art, ...) y entrance(art, ...) en vez de cableado fijo,
// así dos videos con las mismas escenas se sienten distintos.
// ══════════════════════════════════════════════════════════════════════════════

// ── Viajes de cámara (devuelven { scale, x, y }) ──────────────────────────────
export const CAMERAS = {
  drift:   (t, a) => ({ scale: 1 + a * 0.8 * t,     x: (t - 0.5) * a * 200, y: (t - 0.5) * a * 70 }),  // suave (clásico)
  pushIn:  (t, a) => ({ scale: 1 + a * 1.3 * t,     x: 0,                    y: 0 }),                   // acercándose (suave)
  pullOut: (t, a) => ({ scale: 1 + a * 1.3 * (1 - t), x: 0,                  y: 0 }),                   // alejándose (suave)
  panL:    (t, a) => ({ scale: 1 + a * 0.9,         x: (0.5 - t) * a * 460,  y: 0 }),                   // paneo a la izquierda
  panR:    (t, a) => ({ scale: 1 + a * 0.9,         x: (t - 0.5) * a * 460,  y: 0 }),                   // paneo a la derecha
  ken:     (t, a) => ({ scale: 1 + a * 1.1 * t,     x: (t - 0.5) * a * 170,  y: (0.5 - t) * a * 120 }), // ken burns diagonal
  sway:    (t, a) => ({ scale: 1 + a * 0.7,         x: Math.sin(t * Math.PI * 2) * a * 110,             // vaivén orgánico
                                                     y: Math.cos(t * Math.PI * 1.5) * a * 60 }),
}

/** Viaje de cámara según la art direction. total = duración de la escena. */
export const camera = (art, frame, total, amount = 0.05) => {
  const kind = (art && art.camera) || 'drift'
  const t = prog(frame, 0, total, EASE.inOut)
  const amt = amount * (CAM_K[_ENERGY(art)] || 1)   // energía de la marca modula el movimiento
  return (CAMERAS[kind] || CAMERAS.drift)(t, amt)
}

// ── Familias de entrada (cómo aparece cada elemento) ──────────────────────────
// Cada una recibe (p = progreso eased 0..1, op = opacidad 0..1, d = distancia) y
// devuelve { opacity, transform } — mismo shape que enter(), drop-in.
export const ENTRANCES = {
  rise:  (p, op, d) => ({ opacity: op, transform: `translateY(${(1 - p) * d}px)` }),
  drop:  (p, op, d) => ({ opacity: op, transform: `translateY(${-(1 - p) * d}px)` }),
  slide: (p, op, d) => ({ opacity: op, transform: `translateX(${(1 - p) * d}px)` }),
  scale: (p, op)    => ({ opacity: op, transform: `scale(${0.74 + p * 0.26})` }),
  zoom:  (p, op)    => ({ opacity: op, transform: `scale(${1.2 - p * 0.2})` }),               // entra grande y asienta
  tilt:  (p, op, d) => ({ opacity: op, transform: `translateY(${(1 - p) * d}px) rotate(${(1 - p) * -5}deg)` }),
}
const ENTRANCE_EASE = { rise: EASE.back, drop: EASE.back, slide: EASE.out, scale: EASE.back, zoom: EASE.out, tilt: EASE.back }

/**
 * Entrada según la art direction (con override por escena vía `fam`).
 * Las escenas con dirección estructural (paneles izq/der, filas) pasan `fam`
 * fijo; el resto deja que la art direction decida.
 */
export const entrance = (art, frame, from = 0, { dur = 16, dist = 60, axis = 'y', ease, fam } = {}) => {
  let family = fam || (art && art.entrance) || (axis === 'x' ? 'slide' : 'rise')
  if (!ENTRANCES[family]) family = 'rise'
  const e = ease || ENTRANCE_EASE[family] || EASE.out
  const en = _ENERGY(art)                                   // energía de la marca:
  const effDur = Math.max(6, dur * (DUR_K[en] || 1))        //  alto = más rápido, bajo = más lento
  const effDist = dist * (DIST_K[en] || 1)                  //  alto = más viaje, bajo = menos
  const p = prog(frame, from, effDur, e)
  const op = clamp((frame - from) / Math.max(1, effDur * 0.7), 0, 1)
  return ENTRANCES[family](p, op, effDist)
}
