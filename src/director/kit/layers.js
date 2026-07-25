// director · CAPAS — constructores DECLARATIVOS del storyboard. Puros: no miden, no dibujan, no
// necesitan canvas. Por eso el composer corre identico en Node (gates) y en el browser (estudio).
//
// El contrato de tamano: `size` es fraccion del ALTO del lienzo, no pixeles. El renderer lo pasa a px
// y despues FITEA al ancho de la caja (core/text.js garantiza nunca-desborda). Es decir: `size` es una
// INTENCION tipografica y la caja es la LEY. Si el texto no entra, achica — nunca se sale ni se corta.
//
// matchKey es la pieza que hace posible el LINKER (F3): dos escenas consecutivas que declaran la misma
// matchKey se conectan con un match-cut FLIP (la capa viaja de su caja A a su caja B) en vez de cortar.

import { PROP_DEFAULT } from '../core/schema.js'

// escala tipografica (fraccion del alto). El look multiplica por bigK cuando la pagina es 'bigtype'.
export const SIZE = {
  display: 0.098, title: 0.072, subtitle: 0.040, body: 0.029,
  kicker: 0.0195, mark: 0.024, cta: 0.033, stat: 0.155, statLabel: 0.024,
  quote: 0.046, step: 0.032,
}
// interlineado por rol: los titulos van apretados, el cuerpo aireado
export const LH = { display: 0.96, title: 1.02, quote: 1.16, default: 1.28 }

let _n = 0
export function resetIds() { _n = 0 }
const uid = p => `${p}${++_n}`

const base = (kind, box, o = {}) => ({
  id: o.id || uid(kind[0]),
  kind, box: box.map(v => +v.toFixed(5)),
  ...(o.matchKey ? { matchKey: o.matchKey } : {}),
  ...(o.focal ? { focal: true } : {}),
  ...(o.sangra ? { sangra: true } : {}),
  z: o.z == null ? 10 : o.z,
})

// ---------------------------------------------------------------- texto
// role gobierna tamano/interlineado por default; `size` explicito manda si viene.
export function texto(box, text, o = {}) {
  const role = o.role || 'body'
  return {
    ...base('text', box, o),
    role, text: String(text == null ? '' : text),
    size: o.size == null ? (SIZE[role] || SIZE.body) : o.size,
    weight: o.weight == null ? (role === 'title' || role === 'display' || role === 'stat' ? 800 : 500) : o.weight,
    family: o.family || (role === 'stat' || role === 'statLabel' ? 'num' : (role === 'title' || role === 'quote' ? 'display' : 'support')),
    color: o.color || 'ink',
    align: o.align || 'center',
    lines: o.lines == null ? (role === 'title' ? 3 : role === 'body' || role === 'quote' ? 4 : 1) : o.lines,
    lh: o.lh == null ? (LH[role] || LH.default) : o.lh,
    tracking: o.tracking == null ? null : o.tracking,     // null = el del look
    upper: !!o.upper,
    reveal: o.reveal || 'mask',                            // mask | chars | fade | none
  }
}

// ---------------------------------------------------------------- formas
// shape: rect | line | ring | dot | bar. `fill`/`stroke` aceptan tokens del look (accent, ink, dim...).
export function forma(box, shape, o = {}) {
  return {
    ...base('shape', box, o),
    shape,
    fill: o.fill === undefined ? 'accent' : o.fill,
    stroke: o.stroke || null,
    lw: o.lw == null ? 0.004 : o.lw,                       // fraccion del ANCHO
    radius: o.radius == null ? null : o.radius,            // null = el del look
    alpha: o.alpha == null ? 1 : o.alpha,
  }
}

// ---------------------------------------------------------------- objeto heroe (src/shared/objects.js)
export function objeto(box, obj, o = {}) {
  return { ...base('heroObj', box, o), obj, tint: o.tint || 'accent', hp: o.hp || [0.5, 0.5, 0.5, 0.5] }
}

// ---------------------------------------------------------------- foto
export function foto(box, url, o = {}) {
  return { ...base('photo', box, o), url: String(url || ''), fit: o.fit || 'cover', radius: o.radius == null ? null : o.radius, veil: o.veil == null ? 0 : o.veil }
}

// ---------------------------------------------------------------- compuestas
export function badge(box, text, o = {}) {
  return { ...base('badge', box, o), text: String(text || ''), size: o.size == null ? SIZE.kicker : o.size, fill: o.fill || 'accent', color: o.color || 'onAccent', upper: o.upper !== false }
}
export function stepper(box, items, o = {}) {
  return { ...base('stepper', box, o), items: (items || []).map(s => String(s)), size: o.size == null ? SIZE.step : o.size, numerado: o.numerado !== false }
}
export function priceTag(box, valor, o = {}) {
  return { ...base('priceTag', box, o), valor: String(valor || ''), etiqueta: String(o.etiqueta || ''), tachado: String(o.tachado || '') }
}
export function logoRow(box, n, o = {}) {
  return { ...base('logoRow', box, o), n: Math.max(3, Math.min(6, n | 0)), marca: String(o.marca || '') }
}
// la placa siempre es la capa 0 y siempre sangra: es el fondo del video
export function placa(o = {}) {
  return { ...base('plate', [0, 0, 1, 1], { id: 'plate', z: 0, sangra: true, matchKey: 'plate' }), orn: o.orn !== false, grano: o.grano !== false, vineta: o.vineta !== false }
}

// ---------------------------------------------------------------- utilidades de composicion
// ordena por z y devuelve la escena lista para el storyboard
export function escena(id, dur, layers, meta = {}) {
  const ls = layers.filter(Boolean).slice().sort((a, b) => a.z - b.z || a.id.localeCompare(b.id))
  return { id, dur: +dur.toFixed(3), layers: ls, ...meta }
}
// props iniciales de una capa (lo que el compilador de timeline usa como estado en reposo)
export const propsBase = () => ({ ...PROP_DEFAULT })
