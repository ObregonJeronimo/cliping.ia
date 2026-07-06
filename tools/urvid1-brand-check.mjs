// urvid1-brand-check.mjs — GATE de FIDELIDAD DE MARCA. Invariante: el HUE del acento del video sigue al HUE del
// brandColor de la pagina (el publico que reconoce la marca la ve reflejada). makeVideo() -> palette.accent debe quedar
// a &lt;=60 grados de hue del brandColor CROMATICO. Las marcas ACROMATICAS (negro/blanco/gris, S&lt;0.12) se saltean a
// proposito: el motor las normaliza al hue del RUBRO (no hay hue de marca que respetar). Puro/determinista.
import { makeVideo } from '../src/urvid/index.js'
import { hexToHsl } from '../src/urvid/core/util.js'

const MAX_DIST = 60
const hueDist = (a, b) => Math.abs(((a - b + 540) % 360) - 180)   // distancia circular de hue [0,180]

// marcas CROMATICAS reales (variadas en hue). Las acromaticas no aplican (ver arriba).
const BRANDS = ['#22e06a', '#5b8cff', '#e0533b', '#7048e8', '#f5c842', '#d0417a', '#2b9bc9', '#e07b39', '#ff2d55', '#00b3a4']
const RUBROS = ['tech', 'finanzas', 'salud', 'moda', 'gastronomia', 'fitness', 'educacion', 'default']
const TONES = ['dark', 'light']
const SEEDS = [7, 3, 19]

let checks = 0, fails = 0, worst = 0, worstMsg = ''
for (const tone of TONES) for (const rubro of RUBROS) for (const brandColor of BRANDS) for (const seed of SEEDS) {
  const { s } = hexToHsl(brandColor)
  if (s < 0.12) continue   // acromatica -> el motor usa el hue del rubro a proposito
  const v = makeVideo({ brand: 'X', rubro, tone, brandColor, tagline: 'a', claim: 'b', cta: 'c', seed })
  const d = hueDist(hexToHsl(v.palette.accent).h, hexToHsl(brandColor).h)
  checks++
  if (d > worst) { worst = d; worstMsg = `${rubro}/${tone} ${brandColor} -> ${v.palette.accent} (hueDist ${d.toFixed(1)})` }
  if (d > MAX_DIST) { fails++; if (fails <= 12) console.log(`  XX ${rubro}/${tone} ${brandColor} -> accent ${v.palette.accent} · hueDist ${d.toFixed(1)} > ${MAX_DIST}`) }
}

console.log(`combos=${checks} fails=${fails} peor=${worst.toFixed(1)}° (${worstMsg})`)
if (fails === 0) { console.log(`GATE MARCA OK (el acento sigue al brandColor cromatico: hueDist <= ${MAX_DIST}° en ${checks} combos).`); process.exit(0) }
console.error(`GATE MARCA FALLO: ${fails} combos con el acento desviado > ${MAX_DIST}° del brandColor.`); process.exit(1)
