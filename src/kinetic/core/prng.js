// kinetic 1.0 · PRNG determinista — mismo patron probado del motor urvid (mulberry32 + sub-seeds por
// NAMESPACE): iterar un generador (ej 'dna') NO desbaraja otro (ej 'script'). Copia INDEPENDIENTE a
// proposito: los dos motores viven separados (regla del proyecto), cero imports cruzados src/kinetic<->src/urvid.
// REGLA DURA: cero Math.random / Date.now en todo el motor.

export function mulberry32(a) {
  a = a >>> 0
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hashStr(s) {
  s = String(s == null ? '' : s)
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

// marca + url -> semilla estable (mismo input -> mismo video, siempre); la variante cambia el seed entero
export function stableSeed(...parts) { return hashStr(parts.filter(p => p != null).join('|')) }

// un generador con SUB-SEED por namespace -> ejes ortogonales (dna/script/scenes/cuts...) independientes
export function seedFor(seed, namespace) { return mulberry32((seed ^ hashStr(namespace)) >>> 0) }

export const pick = (prng, arr) => arr[(prng() * arr.length) | 0]
export const range = (prng, a, b) => a + (b - a) * prng()
export const irange = (prng, a, b) => a + ((prng() * (b - a + 1)) | 0)
export function weightedPick(prng, items, weightOf) {
  let total = 0; for (const it of items) total += Math.max(0, weightOf(it))
  let r = prng() * total
  for (const it of items) { r -= Math.max(0, weightOf(it)); if (r <= 0) return it }
  return items[items.length - 1]
}
export function shuffled(prng, arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = (prng() * (i + 1)) | 0;[a[i], a[j]] = [a[j], a[i]] } return a }
