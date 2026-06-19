// urvid 1.0 · POST (resolver) — el ACABADO. El director elige un "finish" (libs/post/) que render.js aplica como
// pase FINAL sobre TODO el cuadro (bg+contenido): grano/vignette/light-leak/grade/halacion/scanlines. Es el film-look
// que UNE el frame (distinto de atmosphere, que va DETRAS del contenido). SUTIL (preserva legibilidad) y FLUIDO (anima por t).
// core NO importa libs: resuelve por id del registro (memoizado en el video). Default = sin acabado (passthrough).
import { get } from './registry.js'

export function defaultPost() {
  return { id: 'none', render() {} }
}

const _cache = new WeakMap()   // memo NO-mutante (no estampa el video)
export function resolvePost(video) {
  if (!video) return defaultPost()
  const hit = _cache.get(video); if (hit) return hit
  let p = null
  try {
    const mod = video.postId ? get(video.postId) : null
    if (mod && typeof mod.render === 'function') p = mod
  } catch { p = null }
  p = p || defaultPost()
  _cache.set(video, p)
  return p
}
