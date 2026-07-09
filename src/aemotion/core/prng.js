// aemotion 0.1 · PRNG determinista — mismo patron probado de urvid/kinetic (mulberry32 + sub-seeds por
// NAMESPACE): iterar un generador (ej 'wiggle') NO desbaraja otro. Copia INDEPENDIENTE a proposito:
// los motores viven separados (regla del proyecto), cero imports cruzados entre src/aemotion y los demas.
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

export function stableSeed(...parts) { return hashStr(parts.filter(p => p != null).join('|')) }

// un generador con SUB-SEED por namespace -> ejes ortogonales independientes
export function seedFor(seed, namespace) { return mulberry32((seed ^ hashStr(namespace)) >>> 0) }

export const pick = (prng, arr) => arr[(prng() * arr.length) | 0]
export const range = (prng, a, b) => a + (b - a) * prng()
export const irange = (prng, a, b) => a + ((prng() * (b - a + 1)) | 0)
