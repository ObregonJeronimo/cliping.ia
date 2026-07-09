// aemotion 0.1 · SCRATCH — canvases de trabajo compartidos por blur (multi-sample) y transiciones
// (doble buffer). Browser: OffscreenCanvas/createElement. Node: los tools DEBEN inyectar la factory
// (setScratchFactory(createCanvas)) — sin ella, blur degrada a 1 muestra y transiciones a corte seco.
let _factory = null
export function setScratchFactory(fn) { _factory = fn }

export function scratch(w, h) {
  if (_factory) return _factory(w, h)
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h)
  if (typeof document !== 'undefined') { const c = document.createElement('canvas'); c.width = w; c.height = h; return c }
  return null
}

// pool con clave: buffers reusados entre frames (realoc solo si cambia el tamano) — idempotente,
// no guarda estado de CONTENIDO entre frames (cada uso limpia), asi el seek en frio da lo mismo.
const _pool = new Map()
export function pooled(key, w, h) {
  let e = _pool.get(key)
  if (!e || e.w !== w || e.h !== h) {
    const c = scratch(w, h)
    if (!c) return null
    e = { c, w, h }
    _pool.set(key, e)
  }
  return e.c
}
