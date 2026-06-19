// urvid 1.0 · TRANSITIONS (resolver) — el director elige una transicion (libs/transitions/) -> el motor la usa para
// pasar de la escena A (saliente) a la B (entrante). El contrato: render(ctx, p, drawA, drawB, dims) compone A y B
// dibujandolas DIRECTO al ctx (drawA/drawB son callbacks) con clip/transform -> nitido, sin buffers, cross-env.
// p in [0,1] (0 = todo A, 1 = todo B). core NO importa libs: resuelve por id del registro (memoizado en el video).
import { get } from './registry.js'

// default = cut (corte limpio en p=0.5). Usado si no hay transicion elegida / si falla la resolucion.
export function defaultTransition() {
  return { id: 'cut', render(ctx, p, drawA, drawB) { if (p < 0.5) drawA(ctx); else drawB(ctx) } }
}

const _cache = new WeakMap()   // memo NO-mutante (no estampa el video)
export function resolveTransition(video) {
  if (!video) return defaultTransition()
  const hit = _cache.get(video); if (hit) return hit
  let tr = null
  try {
    const mod = video.transitionId ? get(video.transitionId) : null
    if (mod && typeof mod.make === 'function') tr = mod.make()
  } catch { tr = null }
  tr = tr || defaultTransition()
  _cache.set(video, tr)
  return tr
}
