// templates 0.1 — CREADOR/REPRODUCTOR de templates autorados (apartado admin). Un template es DATO
// puro (schema.js); makeTemplateVideo(template, brief) resuelve sus SLOTS con el contenido del brief
// (content.js, tipado + anti-repeticion) y deriva la PALETA de la marca (palette.js), y
// drawTemplateFrame(ctx, t, rv) lo reproduce determinista (render.js) con las primitivas de aemotion.
// Contrato del ecosistema: funcion pura de t (seek/determinismo). El editor visual produce estos datos.
import { normalizeTemplate, EXAMPLE_TEMPLATES, MW, MH } from './schema.js'
import { resolveContent } from './content.js'
import { deriveTemplatePalette } from './palette.js'
import { drawTemplateFrame } from './render.js'

export { drawTemplateFrame, hitTest, layerExtent } from './render.js'
export { EXAMPLE_TEMPLATES, normalizeTemplate, MW, MH } from './schema.js'
export { GALLERY } from './gallery.js'
export { resolveContent } from './content.js'
export { deriveTemplatePalette, resolveColor } from './palette.js'
export { OBJECTS, OBJECT_IDS, drawObject } from './objects.js'
export { BACKGROUNDS, BACKGROUND_IDS, paintTemplateBackground } from './backgrounds.js'
export { ANIM_IN, ANIM_OUT, IDLE_KINDS } from './anim.js'

// --- imagenes (mismo contrato que los motores: browser new Image / Node loader inyectado) ---
let _imageLoader = null
export function setImageLoader(fn) { _imageLoader = fn }
const _imgCache = new Map()
function getImg(url) {
  if (!url) return null
  let e = _imgCache.get(url)
  if (e !== undefined) return (e && e.ok) ? e.img : null
  if (_imageLoader) { const img = _imageLoader(url); _imgCache.set(url, img ? { img, ok: true } : { ok: false }); return img || null }
  if (typeof Image === 'undefined') { _imgCache.set(url, { ok: false }); return null }
  const img = new Image(); e = { img, ok: false }; _imgCache.set(url, e)
  try { img.crossOrigin = 'anonymous' } catch { /* noop */ }
  img.onload = () => { e.ok = true }; img.src = url
  return null
}

// makeTemplateVideo(template, brief) -> rv reproducible (compatible con el pipeline preview/export)
export function makeTemplateVideo(template, brief = {}) {
  const tpl = normalizeTemplate(template)
  const resolved = resolveContent(tpl, brief)
  const palette = deriveTemplatePalette(brief.brandColor, tpl.mode)
  let t = 0
  const scenes = resolved.scenes.map(sc => { const s = { ...sc, t0: t }; t += sc.dur; return s })
  const duration = Math.max(1, t)
  return {
    engine: 'template', v: 1, templateId: tpl.id, name: tpl.name,
    W: tpl.W || MW, H: tpl.H || MH, duration,
    palette, scenes, brief, getImg,
    recipe: { templateId: tpl.id, mode: tpl.mode, sceneIds: scenes.map(s => s.id) },
  }
}
