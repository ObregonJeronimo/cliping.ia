// urvid 1.0 · MOTION (resolver) — el director elige una "personalidad de movimiento" (libs/motion/) y el motor la
// pone en env.motion; las escenas la usan en vez de eases hardcodeados (M.ease/M.settle/M.smooth + enter/stagger).
// Aca viven el DEFAULT (= feel actual del motor, para que sin personalidad se vea igual) y el resolver por id.
// REGLA: core NO importa libs -> la personalidad se resuelve del REGISTRO (get) por id, no por import directo.
import { get } from './registry.js'
import { eOutCubic, eInOutCubic, spring, clamp } from './util.js'

const ZERO = { x: 0, y: 0, scale: 0, rot: 0 }

// Contrato del objeto motion (lo que recibe env.motion):
//   ease(p)   -> [0,1] MONOTONICO (reglas/barras/progreso/reveals: nunca debe pasarse de 1)
//   settle(p) -> overshoot OK (pops/escala/asentamiento: spring/back; vuelve a 1 en p=1)
//   smooth(p) -> [0,1] monotonico in-out (entrada global, micro-zoom)
//   stagger   -> segundos de delay base entre items de una lista/grilla
//   enter     -> { dx, dy, scale, rotate } offset de entrada de CADA escena (lo aplica render.js)
//   enterDur  -> segundos que dura la entrada
//   life      -> 0..1 FLUIDEZ: intensidad del ken-burns (zoom lento cinematografico) que render.js aplica
//                sobre toda la escena -> nada queda muerto-estatico. Calmo/cine alto, snappy/punch bajo.
//   ambient(t, seed) -> { x, y, scale, rot } micro-vida continua (respiracion + flote sutil). NUNCA cero por defecto.
export function defaultMotion() {
  return {
    id: 'default',
    ease: p => eOutCubic(clamp(p, 0, 1)),
    smooth: p => eInOutCubic(clamp(p, 0, 1)),
    settle: p => spring(clamp(p, 0, 1), { zeta: 0.5, freq: 2.0 }),
    stagger: 0.18,
    enter: { dx: 0, dy: 0, scale: 0.03, rotate: 0 },   // micro-zoom de entrada actual
    enterDur: 0.55,
    life: 0.7,
    ambient: (t, seed) => ({ x: Math.sin(t * 0.5 + (seed % 7)) * 1.1, y: Math.sin(t * 0.7 + (seed % 5)) * 1.4, scale: Math.sin(t * 0.6) * 0.005, rot: 0 }),
  }
}

// Resuelve (y memoiza en video._motion) la personalidad elegida; cae al default si no hay / si falla.
// Determinista: la personalidad es codigo puro; memoizar no introduce estado observable entre videos.
export function resolveMotion(video) {
  if (video && video._motion) return video._motion
  let m = null
  try {
    const mod = video && video.motionId ? get(video.motionId) : null
    if (mod && typeof mod.make === 'function') m = mod.make()
  } catch { m = null }
  m = m || defaultMotion()
  if (video) video._motion = m
  return m
}
