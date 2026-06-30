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

// ACCESIBILIDAD (prefers-reduced-motion): el typekit es kinetic typography. Si el usuario pide menos movimiento (requisito
// a11y), degradamos a entrada PLANA (defaultTypekit) ignorando video.typekitId. El estado final del texto ya es identico a
// plano (reveal>=1) -> solo se elimina la ANIMACION de entrada, nada de legibilidad. Cacheamos el MediaQueryList UNA vez
// (matchMedia es relativamente caro) y leemos .matches por llamada -> reactivo y barato. En el motor headless (Node/gates/
// Remotion) no hay window -> _mql queda null -> false -> comportamiento IDENTICO (frames byte-identicos, determinismo intacto).
let _mql, _mqlTried = false
function reduceMotion() {
  try {
    if (!_mqlTried) { _mqlTried = true; _mql = (typeof window !== 'undefined' && window.matchMedia) ? window.matchMedia('(prefers-reduced-motion: reduce)') : null }
    return _mql ? _mql.matches : false
  } catch { return false }
}

const _cache = new WeakMap()   // memo NO-mutante (no estampa el video)
export function resolveTypekit(video) {
  if (!video) return defaultTypekit()
  if (reduceMotion()) return defaultTypekit()   // a11y: entrada plana (reactivo; NO cachea -> respeta cambios de preferencia)
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
