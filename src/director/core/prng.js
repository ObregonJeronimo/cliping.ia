// director · PRNG determinista — mulberry32 + sub-seeds por NAMESPACE. Iterar un eje (p.ej. 'story')
// NO desbarata otro (p.ej. 'look'): cada uno tira de su propio generador. Copia INDEPENDIENTE a
// proposito (regla del proyecto: src/director no importa de otros motores).
// REGLA DURA: cero Math.random / Date.now en TODO el motor.

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

// semilla estable desde partes (marca+url) -> mismo input = mismo video, siempre
export const stableSeed = (...parts) => hashStr(parts.filter(p => p != null).join('|'))
// generador con SUB-SEED por namespace -> ejes ortogonales
// OJO CON EL TIPO DE `seed`. El XOR fuerza ToInt32, y ToInt32 de un string es 0: con una semilla
// string el sub-seed colapsaba a hashStr(ns) y TODAS las paginas producian la misma secuencia.
// Verificado: seedFor('abc','dir.guion') y seedFor('zzz','dir.guion') daban valores identicos.
// Hoy ningun caller pasa strings — todos pasan numeros — asi que no esta roto, pero es una mina para
// el primero que llame buildGuion con un id de pagina o un hash. Se normaliza con el mismo hashStr
// que ya usa stableSeed dos lineas mas arriba.
export const seedFor = (seed, ns) => mulberry32((normSeed(seed) ^ hashStr(ns)) >>> 0)
const normSeed = (s) => (typeof s === 'number' && Number.isFinite(s) ? (s >>> 0) : hashStr(String(s)))
// semilla derivada (no un generador): para estampar un seed propio en una capa/escena
export const subSeed = (seed, ns) => (normSeed(seed) ^ hashStr(ns)) >>> 0

export const pick = (r, arr) => arr[(r() * arr.length) | 0]
export const range = (r, a, b) => a + (b - a) * r()
export const irange = (r, a, b) => a + ((r() * (b - a + 1)) | 0)
export function weightedPick(r, items, weightOf) {
  let total = 0
  for (const it of items) total += Math.max(0, weightOf(it))
  if (total <= 0) return items[0]
  let x = r() * total
  for (const it of items) { x -= Math.max(0, weightOf(it)); if (x <= 0) return it }
  return items[items.length - 1]
}
// muestreo SIN REEMPLAZO ponderado (elegir n de m sin repetir): el patron que da variedad de estructura
export function weightedSample(r, items, n, weightOf) {
  const pool = items.slice(), out = []
  while (out.length < n && pool.length) {
    const it = weightedPick(r, pool, weightOf)
    pool.splice(pool.indexOf(it), 1)
    out.push(it)
  }
  return out
}
export function shuffled(r, arr) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) { const j = (r() * (i + 1)) | 0;[a[i], a[j]] = [a[j], a[i]] }
  return a
}
