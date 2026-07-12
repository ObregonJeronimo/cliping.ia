// templates · SCHEMA — el formato de un template + defaults + un template de EJEMPLO que prueba el
// concepto end-to-end. Un template es DATO puro (lo que el editor va a producir y editar):
//   template = { id, name, mode:'dark'|'light', W, H, scenes:[ scene ] }
//   scene    = { id, dur, background:{kind,...}, layers:[ layer ] }
//   layer    = { id, type:'text'|'shape'|'image', x, y (0..1), scale, rot, anim:{in,inDur,delay,idle,out},
//                // text: text:'fijo' | slot:{kind,maxChars,maxLines,maxItems}, style:{font,weight,size,color,align,tracking,maxW,maxLines,leading}
//                // shape: shape:'rect|circle|star|poly|line', shapeStyle:{fill,stroke,width,w,h,r,points,sides}
//                // image: imageUrl?, shapeStyle:{w,h,r} }
// Slots (kind): brand · headline · tagline · line · list · stat · statLabel · cta. Colores por TOKEN
// (accent/accent2/ink/dim/bg/surface/onAccent) o hex. Nada de aleatorio -> determinista.

export const MW = 405, MH = 720

let _uid = 0
const uid = (p) => p + '_' + (++_uid).toString(36)

export function normalizeTemplate(t) {
  const tpl = { id: t.id || uid('tpl'), name: t.name || 'Template', mode: t.mode === 'light' ? 'light' : 'dark', W: t.W || MW, H: t.H || MH, scenes: [] }
  tpl.scenes = (t.scenes || []).map(sc => ({
    id: sc.id || uid('sc'), dur: Math.max(1, +sc.dur || 3), background: sc.background || { kind: 'solid' }, camera: sc.camera || null,
    layers: (sc.layers || []).map(l => ({ id: l.id || uid('ly'), type: l.type || 'text', x: l.x == null ? 0.5 : l.x, y: l.y == null ? 0.5 : l.y, scale: l.scale == null ? 1 : l.scale, rot: l.rot || 0, ...l })),
  }))
  return tpl
}

// TEMPLATE DE EJEMPLO — promo de 4 escenas (intro · beneficios/lista · headline · CTA). Demuestra
// slots tipados (brand/list/headline/cta) + capas fijas + varias animaciones + fondos por token.
export const EXAMPLE_TEMPLATES = [
  {
    id: 'tpl.promo-basico', name: 'Promo basico', mode: 'dark',
    scenes: [
      { id: 's1', dur: 3.2, background: { kind: 'glow' }, layers: [
        { type: 'text', y: 0.33, text: 'PRESENTAMOS', style: { size: 30, weight: 700, color: 'dim', tracking: 4 }, anim: { in: 'fade', inDur: 0.5 } },
        { type: 'text', y: 0.48, slot: { kind: 'brand', maxChars: 18 }, style: { size: 100, weight: 900, color: 'ink' }, anim: { in: 'cascade' } },
        { type: 'shape', shape: 'line', y: 0.6, shapeStyle: { w: 130, stroke: 'accent', width: 4 }, anim: { in: 'slide-l', inDur: 0.6, delay: 0.6 } },
      ] },
      { id: 's2', dur: 4.2, background: { kind: 'gradient' }, layers: [
        { type: 'text', x: 0.5, y: 0.18, text: 'BENEFICIOS', style: { size: 40, weight: 800, color: 'accent', tracking: 2 }, anim: { in: 'rise' } },
        { type: 'text', x: 0.5, y: 0.55, slot: { kind: 'list', maxItems: 3, maxChars: 26 }, style: { size: 40, weight: 700, color: 'ink', align: 'left', maxW: 0.8 }, anim: { in: 'fade', idle: false } },
      ] },
      { id: 's3', dur: 3.0, background: { kind: 'glow' }, layers: [
        { type: 'text', y: 0.47, slot: { kind: 'headline', maxChars: 42, maxLines: 3 }, style: { size: 74, weight: 900, color: 'ink' }, anim: { in: 'cascade' } },
      ] },
      { id: 's4', dur: 3.0, background: { kind: 'accent' }, layers: [
        { type: 'text', y: 0.44, slot: { kind: 'cta', maxChars: 22 }, style: { size: 66, weight: 900, color: 'onAccent' }, anim: { in: 'pop', inDur: 0.5 } },
        { type: 'text', y: 0.56, slot: { kind: 'brand', maxChars: 20 }, style: { size: 26, weight: 600, color: 'onAccent', tracking: 3 }, anim: { in: 'fade', delay: 0.4 } },
      ] },
    ],
  },
]
