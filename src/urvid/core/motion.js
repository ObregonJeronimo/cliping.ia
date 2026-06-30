// urvid 1.0 · MOTION (resolver) — el director elige una "personalidad de movimiento" (libs/motion/) y el motor la
// pone en env.motion; las escenas la usan en vez de eases hardcodeados (M.ease/M.settle/M.smooth + enter/stagger).
// Aca viven el DEFAULT (= feel actual del motor, para que sin personalidad se vea igual) y el resolver por id.
// REGLA: core NO importa libs -> la personalidad se resuelve del REGISTRO (get) por id, no por import directo.
import { get } from './registry.js'
import { eOutCubic, eInOutCubic, spring, clamp } from './util.js'
import { reduceMotion } from './a11y.js'

const ZERO = { x: 0, y: 0, scale: 0, rot: 0 }

// ACCESIBILIDAD (prefers-reduced-motion): neutraliza el MOVIMIENTO ESPACIAL de la personalidad preservando el contrato y
// los reveals (ease/smooth = fades/progreso, permitidos). settle pierde el overshoot (curva monotonica, sin rebote); la
// entrada de escena pierde offset/zoom/rotacion; stagger, ken-burns (life) y micro-vida (ambient) van a cero. Resultado:
// el contenido aparece por cambio de estado, sin parallax/zoom. Headless (sin window) nunca entra aca -> byte-identico.
function reducedMotion(m) {
  return { ...m, settle: m.smooth, stagger: 0, enter: { dx: 0, dy: 0, scale: 0, rotate: 0 }, life: 0, ambient: () => ZERO }
}

// Contrato del objeto motion (lo que recibe env.motion):
//   ease(p)   -> [0,1] MONOTONICO (reglas/barras/progreso/reveals: nunca debe pasarse de 1)
//   settle(p) -> overshoot OK (pops/escala/asentamiento: spring/back; vuelve a 1 en p=1)
//                CONTRATO: settle toma UN solo argumento. Algunas escenas pasan un 2do arg ({zeta,freq} o un numero)
//                pensando que ajusta el resorte -> se IGNORA A PROPOSITO: el caracter del spring (rebote/frecuencia) lo
//                fija la PERSONALIDAD elegida por el director (cada una con su zeta/freq), no la escena. Honrarlo
//                aplanaria las 12 personalidades a un resorte generico. Si una escena necesita otro asentamiento, debe
//                elegirse via personalidad, no override local. (No remover los 2dos args existentes: son no-ops inertes.)
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

// Resolucion BASE (determinista): personalidad elegida del registro (o default) + energia del copy estampada.
function resolveBase(video) {
  let m = null
  try {
    const mod = video.motionId ? get(video.motionId) : null
    if (mod && typeof mod.make === 'function') m = mod.make()
  } catch { m = null }
  m = m || defaultMotion()
  return { ...m, energy: (video.energy != null ? video.energy : 0) }   // ENERGIA del copy (la usa staggerK); default 0 -> byte-identico
}
// Resuelve (y memoiza) la personalidad; cae al default si no hay / si falla. Memoizar no introduce estado observable.
// a11y: con prefers-reduced-motion devuelve la personalidad NEUTRALIZADA (reactivo, sin cachear -> respeta cambios en vivo;
// headless sin window nunca entra -> byte-identico). El cache memoiza solo el caso normal (NO-mutante, congelable a worker).
const _cache = new WeakMap()
export function resolveMotion(video) {
  const rm = reduceMotion()
  if (!video) return rm ? reducedMotion(defaultMotion()) : defaultMotion()
  if (rm) return reducedMotion(resolveBase(video))
  const hit = _cache.get(video); if (hit) return hit
  const m = resolveBase(video)
  _cache.set(video, m)
  return m
}
