// Biblioteca · adaptador URVID IA (src/urvid — el motor principal). Catalogo ENORME (~750 modulos):
// escenas, fondos, tipografia, color, substrates, atmosfera, movimiento, typekit, markkit, post,
// layouts, transiciones. Preview REAL de cada modulo pinneandolo con lockRecipe sobre un video base
// + drawFrame (verificado: pinnea las 12 libs sin romper). Los specs son PEREZOSOS (no llaman
// makeVideo hasta el primer draw) porque son cientos. Curacion: por ahora visual (no excluye de la
// generacion de urvid todavia). El shell hace render perezoso (IntersectionObserver).
import { makeVideo, drawFrame, query, get } from '../../../urvid/index.js'
import { SAMPLE_IMG, frame } from './common.js'

export const KEY = 'urvid'
const SAMPLE = { brand: 'Marca', rubro: 'tech', tone: 'dark', brandColor: '#4f7cff', mediaImage: SAMPLE_IMG, content: { tagline: 'Envios en 24 horas', claim: 'La forma simple de vender', cta: 'Probalo gratis', bullets: ['Rapido', 'Seguro', 'Simple'], stats: [{ value: '99%', label: 'uptime' }] } }
let _base = null
const base = () => _base || (_base = makeVideo(SAMPLE))

// pin: fija un modulo via lockRecipe sobre la receta base y devuelve el video (cacheado por field|id)
const _pin = new Map()
function pin(field, id) {
  const k = field + '|' + id
  if (_pin.has(k)) return _pin.get(k)
  const b = base()
  const recipe = { ...b.recipe, [field]: field === 'scenes' ? [id] : id }
  let v; try { v = makeVideo({ ...SAMPLE, lockRecipe: recipe }) } catch { v = b }
  _pin.set(k, v)
  return v
}

const readable = (id) => { const p = String(id).split('.'); return (p.slice(2).join(' ') || p.slice(1).join(' ') || id) }
const group = (id) => String(id).split('.')[1] || ''

// spec generico: pinnea field/id (perezoso) y dibuja un frame asentado del hero
function genSpec(field, id) {
  return {
    dur: 4, still: 1.4,
    draw: (ctx, t) => { const v = pin(field, id); frame(ctx); const sc = v.scenes[0]; drawFrame(ctx, (sc.start || 0) + 0.6 + (t % 3), v) },
  }
}

// spec de CAPA aislada (bg/sub/atm/post/mark): renderiza SOLO ese modulo sobre una placa base de la
// paleta -> cada item se ve DISTINTO (el frame completo los tapaba con el hero). Overlay sobre base.
function envFor(v) { return { pal: v.palette, palette: v.palette, content: v.content, fonts: v.fonts, seed: 1, energy: 1, quality: 1, W: 405, H: 720, dark: v.tone === 'dark', tone: v.tone, margin: 34, rubro: v.rubro } }
function layerSpec(id) {
  return {
    dur: 3, still: 0.6,
    draw: (ctx, t) => {
      const v = base(); frame(ctx)
      const p = v.palette
      if (p.bg1) { const g = ctx.createLinearGradient(0, 0, 0, 720); g.addColorStop(0, p.bg0 || '#0c0e14'); g.addColorStop(1, p.bg1); ctx.fillStyle = g } else ctx.fillStyle = p.bg0 || '#0c0e14'
      ctx.fillRect(0, 0, 405, 720)
      try { get(id).render(ctx, 0.5 + (t % 2), envFor(v)) } catch { /* modulo problematico */ }
    },
  }
}

// spec de COLOR: swatches de la paleta derivada (accent/accent2/bg/surface/ink) — muy escaneable
function colorSpec(id) {
  return {
    dur: 0, still: 0,
    draw: (ctx) => {
      frame(ctx)
      let pal; try { pal = get(id).derive(SAMPLE.brandColor, { tone: base().tone, rubro: 'tech', seed: 1 }) } catch { pal = base().palette }
      ctx.fillStyle = pal.bg0 || '#0c0e14'; ctx.fillRect(0, 0, 405, 720)
      const roles = [['accent', pal.accent], ['accent2', pal.accent2], ['surface', pal.surface], ['bg1', pal.bg1], ['ink', pal.ink]].filter(r => r[1])
      const h = 640 / roles.length
      roles.forEach(([name, col], i) => {
        ctx.fillStyle = col; ctx.fillRect(36, 40 + i * h, 333, h - 10)
        ctx.fillStyle = pal.ink && name !== 'ink' ? (col === pal.ink ? pal.bg0 : 'rgba(255,255,255,0.85)') : (pal.bg0 || '#000')
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = '600 20px Inter'
        ctx.fillText(name + '  ' + String(col).toUpperCase(), 54, 40 + i * h + (h - 10) / 2)
      })
    },
  }
}
function sceneSpec(id) {
  return {
    dur: 4, still: 1.4,
    draw: (ctx, t) => { const v = pin('scenes', id); frame(ctx); const sc = v.scenes[0]; drawFrame(ctx, (sc.start || 0) + (t % Math.max(2, sc.dur || 4)), v) },
  }
}
function xfSpec(id) {
  return {
    dur: 3, still: 0.2,
    draw: (ctx, t) => { const v = pin('transition', id); frame(ctx); const c = v.scenes[1] ? v.scenes[1].start : 0.4; const xf = v.xf || 0.4; drawFrame(ctx, c + Math.min(t, xf) * 0.99, v) },
  }
}

const cat = (key, title, note, field, filter, specFn) => ({
  key, title, note,
  items: query(filter.lib, filter.q || {}).map(m => ({
    id: KEY + '|' + m.id, label: readable(m.id), meta: group(m.id), spec: (specFn || genSpec)(field, m.id),
  })),
})

export default function build() {
  const tone = base().tone
  const T = { tone }
  return {
    key: KEY, label: 'urvid IA',
    note: 'El motor principal. Curacion visual del catalogo (no excluye de la generacion todavia).',
    categories: [
      { key: 'scene', title: 'Escenas', note: 'Las plantillas de composicion.', items: query('scene-layouts', T).map(m => ({ id: KEY + '|' + m.id, label: readable(m.id), meta: group(m.id), spec: sceneSpec(m.id) })) },
      { key: 'bg', title: 'Fondos', note: 'Por rubro + universales (capa aislada).', items: query('backgrounds', T).map(m => ({ id: KEY + '|' + m.id, label: readable(m.id), meta: group(m.id), spec: layerSpec(m.id) })) },
      { key: 'type', title: 'Tipografia', note: 'Pares display + texto + acento.', items: query('typography', T).map(m => ({ id: KEY + '|' + m.id, label: readable(m.id), meta: group(m.id), spec: genSpec('type', m.id) })) },
      { key: 'color', title: 'Color', note: 'Esquemas y paletas (swatches).', items: query('color', T).map(m => ({ id: KEY + '|' + m.id, label: readable(m.id), meta: group(m.id), spec: colorSpec(m.id) })) },
      { key: 'sub', title: 'Substratos', note: 'Grano, trama, grilla, material (capa aislada).', items: query('substrates', T).map(m => ({ id: KEY + '|' + m.id, label: readable(m.id), meta: group(m.id), spec: layerSpec(m.id) })) },
      { key: 'atm', title: 'Atmosfera', note: 'Glow, vineta, rayos, halo (capa aislada).', items: query('atmosphere', T).map(m => ({ id: KEY + '|' + m.id, label: readable(m.id), meta: group(m.id), spec: layerSpec(m.id) })) },
      { key: 'motion', title: 'Movimiento', note: 'Personalidades de animacion (pasa el mouse).', items: query('motion', {}).map(m => ({ id: KEY + '|' + m.id, label: readable(m.id), meta: group(m.id), spec: genSpec('motion', m.id) })) },
      { key: 'typekit', title: 'Texto cinetico', note: 'Efectos de revelado del texto (pasa el mouse).', items: query('typekit', {}).map(m => ({ id: KEY + '|' + m.id, label: readable(m.id), meta: group(m.id), spec: genSpec('typekit', m.id) })) },
      { key: 'mark', title: 'Markkit', note: 'Iconos, marcos y decoradores (capa aislada).', items: query('markkit', {}).map(m => ({ id: KEY + '|' + m.id, label: readable(m.id), meta: group(m.id), spec: layerSpec(m.id) })) },
      { key: 'post', title: 'Post', note: 'Grano, vineta, leaks, grade final (capa aislada).', items: query('post', {}).map(m => ({ id: KEY + '|' + m.id, label: readable(m.id), meta: group(m.id), spec: layerSpec(m.id) })) },
      { key: 'layout', title: 'Layouts', note: 'La grilla de composicion.', items: query('layouts', {}).map(m => ({ id: KEY + '|' + m.id, label: readable(m.id), meta: group(m.id), spec: genSpec('layout', m.id) })) },
      { key: 'xf', title: 'Transiciones', note: 'Los cortes con movimiento.', items: query('transitions', T).map(m => ({ id: KEY + '|' + m.id, label: readable(m.id), meta: group(m.id), spec: xfSpec(m.id) })) },
    ],
  }
}
