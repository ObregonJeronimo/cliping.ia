// urvid 1.0 · FONTS — derivador minimo de sistema tipografico (display/text/accent). Pairings curados.
// (Slice: pool chico; la biblioteca typography/ lo escalara a cientos de familias + pairings validos por mood/rubro.)
import { pick, seedFor } from './prng.js'

const PAIRS = [
  { display: 'Space Grotesk', text: 'Inter', accent: 'JetBrains Mono' },
  { display: 'Fraunces', text: 'Hanken Grotesk', accent: 'Space Mono' },
  { display: 'Archivo', text: 'Inter', accent: 'Archivo' },
  { display: 'Bricolage Grotesque', text: 'Plus Jakarta Sans', accent: 'Space Grotesk' },
]
const BY_RUBRO = {
  tech: [0, 2, 3], finanzas: [1, 2], moda: [1, 3], gastronomia: [3, 0], educacion: [2, 0], default: [0, 1, 2, 3],
}
export function deriveFonts(rubro, style, seed) {
  const prng = seedFor(seed, 'fonts')
  const idx = BY_RUBRO[rubro] || BY_RUBRO.default
  return PAIRS[pick(prng, idx)]
}
