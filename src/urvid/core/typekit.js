// urvid 1.0 · TYPEKIT (resolver) — el director elige un "efecto de texto" (libs/typekit/) y el motor lo pone en
// env.typekit; las escenas dibujan su texto de display via TK.draw/TK.drawWrapped en vez de drawText directo.
// GARANTIA DURA: el efecto FITEA primero (no-desborde) y, cuando reveal>=1, es IDENTICO a drawText -> el estado
// final siempre es el texto limpio y legible. El default = 'plain' (sin efecto) -> sin typekit elegido se ve igual.
// core NO importa libs: resuelve el efecto del REGISTRO por id (memoizado en el video).
import { get } from './registry.js'
import { drawText, drawWrapped } from './text.js'

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
