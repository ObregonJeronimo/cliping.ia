// urvid 1.0 · ASSEMBLE — el DIRECTOR (esqueleto). Dado un BRIEF (lo que el analisis de la pagina + el LLM producen),
// arma el VIDEO eligiendo de las bibliotecas: paleta, fuentes, un fondo, y una secuencia de escenas por BEAT narrativo.
// Determinista por semilla. Devuelve un objeto VIDEO que render.js dibuja. (El director real —strategy/director libs—
// sera mas listo: ejes ortogonales, sesgos por publico/seriedad, anti-sameness; este prueba el ensamblaje de punta a punta.)
import { derivePalette } from './palette.js'
import { query } from './registry.js'
import { seedFor, weightedPick, hashStr, stableSeed } from './prng.js'
import { deriveFonts } from './fonts.js'

// arco narrativo por defecto (hook -> value -> close). El director real elige el arco segun objetivo/mensaje.
const DEFAULT_ARC = [
  { category: 'openers/hero', dur: 4.2 },
  { category: 'statements/editorial', dur: 3.4 },
  { category: 'closers/outro', dur: 3.6 },
]

export function makeVideo(brief = {}) {
  const { brand = 'Marca', rubro = 'default', tone = 'dark', brandColor = '#5b8cff', style = null, content = {}, arc = DEFAULT_ARC } = brief
  const seed = brief.seed != null ? (brief.seed >>> 0) : stableSeed(brand, rubro)
  const palette = derivePalette(brandColor, { tone, rubro, seed })
  const fonts = deriveFonts(rubro, style, seed)

  // FONDO: query de la biblioteca por tono/rubro -> pick por peso
  const bgs = query('backgrounds', { tone, rubro })
  const bg = bgs.length ? weightedPick(seedFor(seed, 'bg'), bgs, m => m.weight) : null

  // ESCENAS: por cada beat del arco, query de scene-layouts de esa categoria -> pick por peso
  const scenes = []; let start = 0
  arc.forEach((beat, i) => {
    const opts = query('scene-layouts', { tone, rubro, category: beat.category })
    const mod = opts.length ? weightedPick(seedFor(seed ^ hashStr('arc' + i), 'scene'), opts, m => m.weight) : null
    if (mod) { scenes.push({ start, dur: beat.dur, sceneId: mod.id, seed: (seed ^ hashStr('s' + i)) >>> 0 }); start += beat.dur }
  })

  return {
    brand, rubro, tone, seed, palette, fonts,
    bgId: bg ? bg.id : null, bgSeed: (seed ^ hashStr('bg')) >>> 0,
    content: { brand, ...content },
    scenes, duration: start || 8,
    recipe: { bg: bg ? bg.id : null, scenes: scenes.map(s => s.sceneId) },   // la "carta" del video (para mostrar/auditar)
  }
}
