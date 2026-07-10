// Biblioteca · comun a todos los adaptadores de motor. Cada adaptador (motion/kinetic/urvid) expone
// build() -> { key, label, note?, categories:[{ key, title, note, items:[{ id, label, meta, spec }] }] }
// spec = { draw(ctx, t), dur, still } — draw ya deja el ctx en coords logicas 405x720 y limpia.
// Los ids van NAMESPACEADOS por motor ('motion|...', 'kinetic|...', 'urvid|...') para que no colisionen.

export const PREV_W = 270, PREV_H = 480, K = PREV_W / 405

// imagen de muestra (data-URI) para escenas que necesitan foto — se carga async via getImg (new Image)
export const SAMPLE_IMG = 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a5bd0"/><stop offset="1" stop-color="#0d1a3a"/></linearGradient></defs><rect width="240" height="300" fill="url(#g)"/><circle cx="170" cy="90" r="46" fill="#e8a13c"/></svg>')

// prepara el ctx (escala a preview y limpia)
export const frame = (ctx) => { ctx.setTransform(K, 0, 0, K, 0, 0); ctx.clearRect(0, 0, 405, 720) }

// fabrica de buscador-por-seed con cache propia (previews de contenido REAL del motor)
export function makeFinder(makeVideo) {
  const cache = new Map()
  return function find(key, pred, max = 500) {
    if (cache.has(key)) return cache.get(key)
    let found = null
    for (let s = 1; s <= max && !found; s++) { const v = makeVideo(s); if (pred(v)) found = v }
    if (!found) found = makeVideo(1)
    cache.set(key, found)
    return found
  }
}
