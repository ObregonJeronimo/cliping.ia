// urvid 1.0 · ASSEMBLE — el DIRECTOR (esqueleto). Dado un BRIEF (lo que el analisis de la pagina + el LLM producen),
// arma el VIDEO eligiendo de las bibliotecas: paleta, fuentes, un fondo, y una secuencia de escenas por BEAT narrativo.
// Determinista por semilla. Devuelve un objeto VIDEO que render.js dibuja. (El director real —strategy/director libs—
// sera mas listo: ejes ortogonales, sesgos por publico/seriedad, anti-sameness; este prueba el ensamblaje de punta a punta.)
import { derivePalette } from './palette.js'
import { query } from './registry.js'
import { seedFor, weightedPick, hashStr, stableSeed, pick, shuffled } from './prng.js'
import { deriveFonts } from './fonts.js'

// ARCO narrativo VARIADO por semilla: apertura (hook|hero) -> 1-3 beats de cuerpo SIN repetir -> cierre. Usa todas
// las categorias de escena disponibles -> dos videos no comparten estructura (no siempre hero->statement->outro).
const _DUR = { 'openers/hero': 4.0, 'openers/hook': 3.2, 'statements/editorial': 3.4, 'lists/checklist': 3.9, 'lists/comparison': 3.6, 'data/single': 3.0, 'data/multi': 3.6, 'social/proof': 3.4, 'closers/outro': 3.6 }
function buildArc(seed) {
  const r = seedFor(seed, 'arc')
  const open = pick(r, ['openers/hero', 'openers/hero', 'openers/hook'])
  const body = ['statements/editorial', 'lists/checklist', 'lists/comparison', 'data/single', 'data/multi', 'social/proof']
  const n = 1 + (r() * 3 | 0)
  const cats = [open, ...shuffled(r, body).slice(0, n), 'closers/outro']
  return cats.map(c => ({ category: c, dur: _DUR[c] || 3.4 }))
}

export function makeVideo(brief = {}) {
  const { brand = 'Marca', rubro = 'default', tone = 'dark', brandColor = '#5b8cff', style = null, content = {} } = brief
  const seed = brief.seed != null ? (brief.seed >>> 0) : stableSeed(brand, rubro)
  const arc = brief.arc || buildArc(seed)
  // CEREBRO v1 · SERIEDAD: brief.seriousness o default por rubro -> sesga AWAY de lo "jugado" en contenido serio
  // (un consultorio NO sale cyber/y2k). wadj ajusta el peso de cada modulo segun sus tags.
  const seriousness = brief.seriousness != null ? brief.seriousness : ({ salud: 0.85, finanzas: 0.8, inmobiliaria: 0.7, educacion: 0.55, tech: 0.5, default: 0.5, gastronomia: 0.35, moda: 0.4, belleza: 0.35, fitness: 0.35 }[rubro] ?? 0.5)
  const PLAYFUL = new Set(['y2k', 'cyber', 'glitch', 'retro', 'joven', 'pop', 'vibrante', 'energico', 'chrome', 'neon'])
  const wadj = (m) => m.weight * (seriousness > 0.62 && (m.tags || []).some(t => PLAYFUL.has(t)) ? 0.2 : 1)
  // COLOR (esquema/mood) + TIPOGRAFIA (pairing) de sus bibliotecas; fallback a los derivadores base
  const cols = query('color', { tone, rubro }), colMod = cols.length ? weightedPick(seedFor(seed, 'colorpick'), cols, wadj) : null
  const palette = colMod ? colMod.derive(brandColor, { tone, rubro, seed }) : derivePalette(brandColor, { tone, rubro, seed })
  const typs = query('typography', { tone, rubro }), typMod = typs.length ? weightedPick(seedFor(seed, 'typepick'), typs, wadj) : null
  const fonts = typMod ? typMod.fonts : deriveFonts(rubro, style, seed)

  // FONDO: query de la biblioteca por tono/rubro -> pick por peso (ajustado por seriedad)
  const bgs = query('backgrounds', { tone, rubro })
  const bg = bgs.length ? weightedPick(seedFor(seed, 'bg'), bgs, wadj) : null
  // SUBSTRATE (textura tenue, opcional ~65%) + ATMOSPHERE (luz, opcional ~55%) -> mas unicidad por capas
  const subPrng = seedFor(seed, 'substrate'), subs = query('substrates', { tone, rubro })
  const sub = (subs.length && subPrng() < 0.65) ? weightedPick(subPrng, subs, wadj) : null
  const atmPrng = seedFor(seed, 'atmosphere'), atms = query('atmosphere', { tone, rubro })
  const atm = (atms.length && atmPrng() < 0.55) ? weightedPick(atmPrng, atms, wadj) : null

  // ESCENAS: por cada beat del arco, query de scene-layouts de esa categoria -> pick por peso
  const scenes = []; let start = 0
  arc.forEach((beat, i) => {
    const opts = query('scene-layouts', { tone, rubro, category: beat.category })
    const mod = opts.length ? weightedPick(seedFor(seed ^ hashStr('arc' + i), 'scene'), opts, wadj) : null
    if (mod) { scenes.push({ start, dur: beat.dur, sceneId: mod.id, seed: (seed ^ hashStr('s' + i)) >>> 0 }); start += beat.dur }
  })

  return {
    brand, rubro, tone, seed, palette, fonts,
    bgId: bg ? bg.id : null, bgSeed: (seed ^ hashStr('bg')) >>> 0,
    subId: sub ? sub.id : null, subSeed: (seed ^ hashStr('sub')) >>> 0,
    atmId: atm ? atm.id : null, atmSeed: (seed ^ hashStr('atm')) >>> 0,
    content: { brand, ...content },
    scenes, duration: start || 8,
    recipe: { color: colMod ? colMod.id : null, type: typMod ? typMod.id : null, bg: bg ? bg.id : null, sub: sub ? sub.id : null, atm: atm ? atm.id : null, scenes: scenes.map(s => s.sceneId) },   // la "carta" del video
  }
}
