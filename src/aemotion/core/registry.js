// aemotion 0.1 · REGISTRY — registro PROPIO de modulos (Map independiente: motores separados).
// Shape: { id:'am.scene.x', lib:'scenes'|'transitions', kind, weight, famBias?, render(...) }
const MAP = new Map()

export function register(mod) {
  if (!mod || !mod.id) throw new Error('aemotion registry: modulo sin id')
  if (MAP.has(mod.id)) throw new Error('aemotion registry: id duplicado ' + mod.id)
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
