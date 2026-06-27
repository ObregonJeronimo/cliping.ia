// urvid 1.0 · REGISTRO de modulos — el corazon de la arquitectura de bibliotecas.
// Cada modulo de cualquier biblioteca se REGISTRA con su metadata; el director CONSULTA por (libreria, categoria,
// tono, rubro) y elige (con peso/compatibilidad). Crecer a CIENTOS de modulos NO toca el motor: solo se registran.
//
// Forma de un modulo:
//   {
//     id: 'bg.gradient.mesh',         // unico, namespaced: <lib>.<categoria>.<nombre>
//     lib: 'backgrounds',             // a que biblioteca pertenece (uno de los pilares del blueprint)
//     category: 'gradient-fields',    // categoria dentro de la biblioteca
//     tones: ['dark','light'],        // tonos compatibles (el director no elige flowfield en claro, etc.)
//     rubros: ['*'],                  // rubros afines ('*' = todos)
//     weight: 1,                      // peso de frecuencia (raras < 1, comunes > 1)
//     tags: ['premium','calmo'],      // libres, para el selector
//     render(ctx, t, env) {}          // la funcion PURA (o derive(env) para las que producen tokens, no pixeles)
//   }

const _MODULES = new Map()   // id -> module
const _BY_LIB = new Map()    // lib -> Set<id>

export function register(mod) {
  if (!mod || !mod.id || !mod.lib) throw new Error('urvid: modulo sin id/lib: ' + JSON.stringify(mod && mod.id))
  if (_MODULES.has(mod.id)) throw new Error('urvid: id de modulo duplicado: ' + mod.id)
  const m = { tones: ['dark', 'light'], rubros: ['*'], weight: 1, tags: [], ...mod }
  _MODULES.set(m.id, m)
  if (!_BY_LIB.has(m.lib)) _BY_LIB.set(m.lib, new Set())
  _BY_LIB.get(m.lib).add(m.id)
  return m
}
export function registerAll(mods) { mods.forEach(register) }

export function get(id) { return _MODULES.get(id) }

// CONSULTA del director: todos los modulos de una biblioteca que matcheen tono + rubro + categoria opcional.
export function query(lib, { tone, rubro, category } = {}) {
  const ids = _BY_LIB.get(lib)
  if (!ids) return []
  const out = []
  for (const id of ids) {
    const m = _MODULES.get(id)
    if (category && m.category !== category) continue
    if (tone && m.tones.indexOf(tone) < 0) continue
    if (rubro && m.rubros[0] !== '*' && m.rubros.indexOf(rubro) < 0) continue
    out.push(m)
  }
  return out
}

// estadisticas (para saber cuanto falta para "masa critica")
export function stats() {
  const byLib = {}
  for (const [lib, ids] of _BY_LIB) {
    const cats = {}
    for (const id of ids) { const c = _MODULES.get(id).category; cats[c] = (cats[c] || 0) + 1 }
    byLib[lib] = { total: ids.size, categories: cats }
  }
  return { totalModules: _MODULES.size, libraries: byLib }
}

export function _reset() { _MODULES.clear(); _BY_LIB.clear() }   // solo para tests
