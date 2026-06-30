// urvid 1.0 · TYPEKIT (resolver) — el director elige un "efecto de texto" (libs/typekit/) y el motor lo pone en
// env.typekit; las escenas dibujan su texto de display via TK.draw/TK.drawWrapped en vez de drawText directo.
// GARANTIA DURA: el efecto FITEA primero (no-desborde) y, cuando reveal>=1, es IDENTICO a drawText -> el estado
// final siempre es el texto limpio y legible. El default = 'plain' (sin efecto) -> sin typekit elegido se ve igual.
// core NO importa libs: resuelve el efecto del REGISTRO por id (memoizado en el video).
import { get } from './registry.js'
import { drawText, drawWrapped } from './text.js'
import { reduceMotion } from './a11y.js'

export function defaultTypekit() {
  return {
    id: 'plain',
    draw: (ctx, str, x, y, opts = {}) => drawText(ctx, str, x, y, opts),
    drawWrapped: (ctx, str, x, y, opts = {}) => drawWrapped(ctx, str, x, y, opts),
  }
}

const _cache = new WeakMap()   // memo NO-mutante (no estampa el video)
export function resolveTypekit(video) {
  if (!video) return defaultTypekit()
  // ACCESIBILIDAD: el typekit es kinetic typography. Con prefers-reduced-motion degradamos a entrada PLANA ignorando
  // video.typekitId. El estado final del texto ya es identico a plano (reveal>=1) -> solo se quita la ANIMACION de entrada,
  // cero legibilidad. Short-circuit ANTES de la cache -> no la contamina y respeta cambios de preferencia en vivo (ver a11y.js).
  if (reduceMotion()) return defaultTypekit()
  const hit = _cache.get(video); if (hit) return hit
  let tk = null
  try {
    const mod = video.typekitId ? get(video.typekitId) : null
    if (mod && typeof mod.make === 'function') tk = mod.make()
  } catch { tk = null }
  tk = tk || defaultTypekit()
  _cache.set(video, tk)
  return tk
}
