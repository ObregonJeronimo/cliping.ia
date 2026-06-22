// Urvid Craft — helpers PUROS para listar y rutear las opciones de cada biblioteca del motor. Reusa query/get/fitWeight
// del motor: lista por TONO (filtro duro) y ORDENA por afinidad de rubro (fitWeight de core/fit.js, como el director).
import { query, get } from '../../urvid/index.js'
import { fitWeight } from '../../urvid/core/fit.js'

// slot del recipe -> lib del registro. (scenes se maneja aparte: depende de la categoria del beat.)
export const SLOT_LIB = { color: 'color', type: 'typography', bg: 'backgrounds', sub: 'substrates', atm: 'atmosphere', motion: 'motion', typekit: 'typekit', mark: 'markkit', transition: 'transitions', post: 'post', layout: 'layouts' }
// seriedad por defecto por rubro (espeja assemble.js) -> alimenta el scorer de fit.
const SERIOUSNESS = { salud: 0.85, finanzas: 0.8, inmobiliaria: 0.7, educacion: 0.55, tech: 0.5, default: 0.5, gastronomia: 0.35, moda: 0.4, belleza: 0.35, fitness: 0.35 }
// markkit: solo el garnish de icono entra al slot mark (igual que assemble.js).
const MARK_CATS = new Set(['iconos-rubro', 'iconos-animados'])
// slots OPCIONALES -> se puede elegir "Ninguno" (null).
export const OPTIONAL_SLOTS = new Set(['sub', 'atm', 'typekit', 'mark', 'post'])

export const shortId = id => String(id || '').replace(/^[^.]+\./, '')
export const seriousnessFor = (brief) => (brief.seriousness != null ? brief.seriousness : (SERIOUSNESS[brief.rubro] ?? 0.5))

// opciones de un slot, ordenadas por afinidad (fitWeight) descendente. NO pasa rubro a query (filtro crudo); ordena por fit.
export function optionsFor(slot, brief) {
  const lib = SLOT_LIB[slot]; if (!lib) return []
  let pool = query(lib, { tone: brief.tone })
  if (slot === 'mark') pool = pool.filter(m => MARK_CATS.has(m.category))
  const ctx = { rubro: brief.rubro, seriousness: seriousnessFor(brief) }
  return pool.slice().sort((a, b) => fitWeight(b, ctx) - fitWeight(a, ctx))
}

// opciones de escena para un beat: scenes de la MISMA categoria que la escena actual, ordenadas por afinidad.
export function sceneOptionsFor(sceneId, brief) {
  const m = get(sceneId); if (!m) return []
  const pool = query('scene-layouts', { tone: brief.tone, category: m.category })
  const ctx = { rubro: brief.rubro, seriousness: seriousnessFor(brief) }
  return pool.slice().sort((a, b) => fitWeight(b, ctx) - fitWeight(a, ctx))
}

export const categoryOf = (sceneId) => (get(sceneId)?.category || '').replace(/\//g, ' · ')

// TODAS las escenas del tono (cualquier categoria), ordenadas por afinidad -> el picker por beat las filtra por categoria.
export function allSceneOptions(brief) {
  const pool = query('scene-layouts', { tone: brief.tone })
  const ctx = { rubro: brief.rubro, seriousness: seriousnessFor(brief) }
  return pool.slice().sort((a, b) => fitWeight(b, ctx) - fitWeight(a, ctx))
}
// categoria de nivel superior de una escena (openers/hero -> openers) para los filtros por beat.
export const sceneTopCategory = (m) => String((m && m.category) || '').split('/')[0]
export const topCategoryOfScene = (sceneId) => sceneTopCategory(get(sceneId))
// como se previsualiza cada slot: color=swatches, typography=muestra de texto, el resto=canvas (gif).
export const previewMode = (slot) => (slot === 'color' ? 'swatch' : slot === 'type' ? 'type' : 'canvas')
