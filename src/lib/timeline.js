// TIMELINE (edicion tipo Canva) · Fase 1 — capa de EDICION sobre el video GENERADO, sin tocar el motor determinista.
// El motor arma las escenas (video.scenes = [{start,dur,sceneId,seed,bgSeed}]) a partir de {brief,seed,receta}; el timeline
// aplica ENCIMA un orden del usuario. drawFrame se guia 100% por scenes[].start/dur -> reordenar = permutar + recalcular
// starts. PURO/determinista. (Fases proximas: overrides de texto por-escena, pistas de animacion y SFX.)

// FAMILIA de la escena (el sceneId real es 'scene.<familia>.<variante>', ej 'scene.hook.bignum') -> etiqueta ES + campo
// de texto PRINCIPAL del brief que esa familia muestra. Se incluyen tambien los nombres de CATEGORIA del arco
// (openers/statements/...) como fallback por si algun sceneId viniera en esa forma.
const FAM = {
  hook: { label: 'Apertura', textKey: 'tagline' }, hero: { label: 'Apertura', textKey: 'tagline' }, showcase: { label: 'Apertura', textKey: 'tagline' }, openers: { label: 'Apertura', textKey: 'tagline' },
  statement: { label: 'Mensaje', textKey: 'claim' }, statements: { label: 'Mensaje', textKey: 'claim' }, spec: { label: 'Detalle', textKey: 'claim' },
  checklist: { label: 'Lista', textKey: 'bullets' }, lists: { label: 'Lista', textKey: 'bullets' }, comparison: { label: 'Comparación', textKey: 'bullets' },
  data: { label: 'Dato', textKey: 'stats' },
  social: { label: 'Prueba', textKey: 'proof' },
  outro: { label: 'Cierre', textKey: 'cta' }, closers: { label: 'Cierre', textKey: 'cta' },
  interstitial: { label: 'Puente', textKey: null }, connectors: { label: 'Puente', textKey: null },
}

export function sceneMeta(sceneId) {
  const parts = String(sceneId || '').split(/[./]/)
  const fam = (parts[0] === 'scene' ? parts[1] : parts[0]) || ''   // 'scene.hook.bignum'->'hook'; 'openers/hero'->'openers'
  const m = FAM[fam] || { label: 'Escena', textKey: 'claim' }
  return { category: fam, label: m.label, textKey: m.textKey }
}

// texto legible que muestra un bloque (para el label). Single-field -> el string; bullets/stats -> resumen corto.
export function blockText(brief, textKey) {
  const b = brief || {}
  if (!textKey) return ''
  const v = b[textKey]
  if (Array.isArray(v)) {
    if (!v.length) return ''
    if (textKey === 'stats') return v.map(s => (typeof s === 'string' ? s : [s && s.value, s && s.label].filter(Boolean).join(' '))).filter(Boolean).join(' · ')
    return v.filter(Boolean).join(' · ')
  }
  return String(v == null ? '' : v)
}

// ¿el texto de este bloque es editable INLINE en Fase 1? Solo campos de UN valor (los arrays -> se editan en el panel).
export function isInlineEditable(textKey) {
  return textKey === 'tagline' || textKey === 'claim' || textKey === 'cta' || textKey === 'proof'
}

// identidad = [0,1,...,n-1]. Util para (re)inicializar el orden cuando cambia la cantidad de escenas del video base.
export function identityOrder(n) {
  return Array.from({ length: Math.max(0, n | 0) }, (_, i) => i)
}

// aplica el documento de timeline sobre el video base SIN tocar el motor determinista:
//  - `order` reordena las escenas y RECALCULA los start acumulados (Fase 1).
//  - `sceneText` (opcional, Fase 2) mapea INDICE BASE -> {campo:valor} y se inyecta como sc.content (el motor usa
//    sc.content || video.content -> una escena sin override queda byte-identica). El indice es BASE, asi el override
//    sigue a su escena aunque se reordene. Cada escena resultante lleva `baseIndex` (para editar por-escena en la UI).
// Si `order` no es una permutacion valida y COMPLETA, devuelve el video base intacto (fail-safe -> nunca rompe el preview).
export function applyTimeline(video, order, sceneText) {
  const base = video && Array.isArray(video.scenes) ? video.scenes : null
  if (!base || !Array.isArray(order) || order.length !== base.length) return video
  const seen = new Set()
  for (const i of order) { if (!(Number.isInteger(i) && i >= 0 && i < base.length) || seen.has(i)) return video; seen.add(i) }
  const gc = video.content || {}
  let start = 0
  const scenes = order.map(i => {
    const ov = sceneText && sceneText[i]
    const content = (ov && Object.keys(ov).length) ? { ...gc, ...ov } : undefined   // override de texto por-escena; ausente -> undefined -> motor usa el content global
    const s = { ...base[i], start, baseIndex: i, ...(content ? { content } : {}) }
    start += (s.dur || 0)
    return s
  })
  return { ...video, scenes, duration: start || video.duration }
}

// mueve el elemento en `from` a la posicion `to` (devuelve un NUEVO array). Reordenar por drag o por botones.
export function moveItem(order, from, to) {
  if (!Array.isArray(order)) return order
  if (from === to || from < 0 || to < 0 || from >= order.length || to >= order.length) return order
  const next = order.slice()
  const [it] = next.splice(from, 1)
  next.splice(to, 0, it)
  return next
}

// ---- OVERLAYS (Fase 3): objetos de texto/imagen sobre el video, con animacion (preset o grabada) ----
import { decimate } from '../urvid/core/anim.js'

let _ovSeq = 0
export const OVERLAY_PRESETS = [
  { key: 'fadeIn', label: 'Fade in' }, { key: 'fadeOut', label: 'Fade out' },
  { key: 'slideLeft', label: 'Desde izquierda' }, { key: 'slideRight', label: 'Desde derecha' },
  { key: 'slideUp', label: 'Desde abajo' }, { key: 'pop', label: 'Pop' }, { key: 'none', label: 'Sin animación' },
]

// overlay de TEXTO por defecto: centrado, visible 2.5s desde `startSec`, preset fadeIn.
export function makeTextOverlay(startSec = 0, VW = 405, VH = 720) {
  return {
    id: 'ov_' + Date.now().toString(36) + '_' + (_ovSeq++), type: 'text', track: 'anim', text: 'Tu texto',
    style: { size: 56, weight: 800, color: '#ffffff', stroke: null },
    transform: { x: Math.round(VW / 2), y: Math.round(VH / 2), scale: 1, rot: 0, alpha: 1 },
    startSec: +(startSec || 0).toFixed(2), durSec: 2.5, anim: { kind: 'preset', preset: 'fadeIn', ease: 'suave' },
  }
}

// aplica un patch a un overlay por id (inmutable; mergea transform/style/anim anidados).
export function patchOverlay(overlays, id, patch) {
  return (overlays || []).map(o => {
    if (o.id !== id) return o
    const n = { ...o, ...patch }
    if (patch.transform) n.transform = { ...o.transform, ...patch.transform }
    if (patch.style) n.style = { ...o.style, ...patch.style }
    if (patch.anim) n.anim = { ...o.anim, ...patch.anim }
    return n
  })
}

// convierte un gesto grabado [{ms,x,y}] en una animacion 'recorded': normaliza el tiempo a [0,1], diezma (RDP) a
// pocos keyframes conservando la forma. Devuelve { anim, durSec, home:{x,y} } o null si el gesto es trivial.
export function finalizeRecording(pts) {
  const clean = (pts || []).filter(p => p && isFinite(p.x) && isFinite(p.y))
  if (clean.length < 2) return null
  const total = clean[clean.length - 1].ms || 1
  let kfs = clean.map(p => ({ t: Math.max(0, Math.min(1, p.ms / total)), x: Math.round(p.x), y: Math.round(p.y) }))
  kfs = decimate(kfs, 3)
  if (kfs.length < 2) return null
  return { anim: { kind: 'recorded', ease: 'lineal', curved: true, keyframes: kfs }, durSec: Math.max(0.4, +(total / 1000).toFixed(2)), home: { x: kfs[0].x, y: kfs[0].y } }
}
