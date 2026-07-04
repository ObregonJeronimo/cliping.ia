// kinetic 1.0 · REGISTRY — registro PROPIO de modulos (Map independiente del de urvid: motores separados).
// Shape de modulo: { id:'kin.scene.x', lib:'scenes'|'transitions', kind, weight, needs?, render(...) }
const MAP = new Map()

export function register(mod) {
  if (!mod || !mod.id) throw new Error('kinetic registry: modulo sin id')
  if (MAP.has(mod.id)) throw new Error('kinetic registry: id duplicado ' + mod.id)
  MAP.set(mod.id, mod)
}
export const registerAll = mods => mods.forEach(register)
export const get = id => MAP.get(id) || null
export function query(lib, filter = {}) {
  const out = []
  for (const m of MAP.values()) {
    if (m.lib !== lib) continue
    if (filter.kind && !(Array.isArray(m.kind) ? m.kind.includes(filter.kind) : m.kind === filter.kind)) continue
    out.push(m)
  }
  return out
}
export const stats = () => { const s = {}; for (const m of MAP.values()) s[m.lib] = (s[m.lib] || 0) + 1; return s }
export const _reset = () => MAP.clear()
