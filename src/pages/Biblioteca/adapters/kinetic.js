// Biblioteca · adaptador KINETIC IA (src/kinetic). Ejes de identidad propios: familias de color,
// fuentes, dialecto de garnish, texturas, variantes de CTA + escenas/transiciones. Previews con
// frames reales (seed-search sobre video.dna). Curacion: por ahora VISUAL (no excluye de la
// generacion de kinetic todavia; eso es un cableado aparte en su core).
import { makeKinetic, drawKineticFrame, query } from '../../../kinetic/index.js'
import { FONT_PAIRS } from '../../../kinetic/libs/fonts.js'
import { paintPlate } from '../../../kinetic/libs/backgrounds.js'
import { fontStr, rgba } from '../../../aemotion/index.js'
import { SAMPLE_IMG, frame, makeFinder } from './common.js'

export const KEY = 'kinetic'
const IMGS = [SAMPLE_IMG, SAMPLE_IMG, SAMPLE_IMG]   // collage/polaroid necesitan fotos
const SAMPLE = { brand: 'Marca', rubro: 'tech', brandColor: '#5b8cff', tagline: 'Manifiesto en movimiento', claim: 'Cada palabra pesa', cta: 'Probalo gratis', bullets: ['Directo', 'Audaz', 'Tipografico'], stats: [{ value: '99%', label: 'uptime' }], images: IMGS }
const find = makeFinder(s => makeKinetic(SAMPLE, { seed: s }))
const SDNA = makeKinetic(SAMPLE, { seed: 7 }).dna

const LABEL = {
  family: { duotono: 'Duotono', mesh: 'Mesh', 'papel-crema': 'Papel crema', 'neon-oscuro': 'Neon oscuro' },
  garnish: { blueprint: 'Blueprint', bauhaus: 'Bauhaus', organic: 'Organico', none: 'Sin garnish' },
  texture: { clean: 'Limpia', grain: 'Grano', paper: 'Papel' },
  cta: { pill: 'Pastilla', underline: 'Subrayado', giant: 'Gigante', button: 'Boton' },
  scene: { 'kin.scene.badge': 'Badge', 'kin.scene.bauhaus': 'Bauhaus', 'kin.scene.card-zoom': 'Card zoom', 'kin.scene.collage': 'Collage', 'kin.scene.cta': 'Cierre / CTA', 'kin.scene.morph-reveal': 'Morph reveal', 'kin.scene.polaroid-inline': 'Polaroid', 'kin.scene.stat': 'Stat', 'kin.scene.statement': 'Statement / respiro', 'kin.scene.typewriter': 'Maquina de escribir' },
  xf: { 'kin.xf.fade': 'Fundido', 'kin.xf.liquid': 'Liquido', 'kin.xf.collapse': 'Colapso' },
}

const familySpec = (fam) => { const v = find('fam:' + fam, x => x.dna.colorFamily === fam); return { dur: v.duration, still: v.duration * 0.2, draw: (ctx, t) => { frame(ctx); drawKineticFrame(ctx, t, v) } } }
const bgSpec = (fam) => { const v = find('fam:' + fam, x => x.dna.colorFamily === fam); const sc = v.scenes.find(s => /dark/.test(s.polarity)) || v.scenes[0]; return { dur: 8, still: 3, draw: (ctx, t) => { frame(ctx); paintPlate(ctx, 405, 720, { ...sc, t0: 0, dur: 8 }, t, v) } } }
const garnishSpec = (g) => { const v = find('gar:' + g, x => x.dna.garnishDialect === g); return { dur: v.duration, still: v.duration * 0.25, draw: (ctx, t) => { frame(ctx); drawKineticFrame(ctx, t, v) } } }
const textureSpec = (tx) => { const v = find('tex:' + tx, x => x.dna.texture === tx); return { dur: v.duration, still: v.duration * 0.3, draw: (ctx, t) => { frame(ctx); drawKineticFrame(ctx, t, v) } } }
const ctaSpec = (c) => { const v = find('cta:' + c, x => x.dna.ctaVariant === c && x.scenes.some(s => s.role === 'cta')); const sc = v.scenes.find(s => s.role === 'cta'); return { dur: sc.dur, still: sc.dur * 0.55, draw: (ctx, t) => { frame(ctx); drawKineticFrame(ctx, sc.t0 + (t % sc.dur), v) } } }
const sceneSpec = (id) => { const v = find('scene:' + id, x => x.scenes.some(s => s.sceneId === id)); const sc = v.scenes.find(s => s.sceneId === id) || v.scenes[0]; return { dur: sc.dur, still: sc.dur * 0.45, draw: (ctx, t) => { frame(ctx); drawKineticFrame(ctx, sc.t0 + (t % sc.dur), v) } } }
const xfSpec = (id) => { const v = find('xf:' + id, x => x.cuts.some(c => c.id === id)); const c = v.cuts.find(k => k.id === id); const d = c.dur, t0 = c.at - d / 2; return { dur: d + 1.2, still: d / 2, draw: (ctx, t) => { frame(ctx); drawKineticFrame(ctx, t0 + Math.min(t, d), v) } } }

const fontSpec = (p) => ({ dur: 0, still: 0, draw: (ctx) => {
  frame(ctx); ctx.fillStyle = SDNA.paperDark; ctx.fillRect(0, 0, 405, 720)
  ctx.textAlign = 'center'; ctx.fillStyle = SDNA.inkDark; ctx.textBaseline = 'middle'
  ctx.font = fontStr(p.dw, 150, p.display); ctx.fillText('Aa', 202, 250)
  ctx.font = fontStr(p.dw, 38, p.display); ctx.fillText('TITULAR', 202, 400)
  ctx.fillStyle = rgba(SDNA.inkDark, 0.6); ctx.font = fontStr(p.sw, 22, p.support); ctx.fillText('Texto de soporte 123', 202, 470)
  ctx.fillStyle = rgba(SDNA.accent, 0.9); ctx.font = fontStr(p.sw, 13, p.support); ctx.fillText((p.display + ' / ' + p.support).toUpperCase(), 202, 560)
} })

export default function build() {
  const ns = (id) => KEY + '|' + id
  const families = ['duotono', 'mesh', 'papel-crema', 'neon-oscuro']
  const garnishes = ['blueprint', 'bauhaus', 'organic', 'none']
  const textures = ['clean', 'grain', 'paper']
  const ctas = ['pill', 'underline', 'giant', 'button']
  const scenes = query('scenes').map(m => m.id).sort()
  const xfs = query('transitions').filter(m => m.dur > 0).map(m => m.id).sort()
  return {
    key: KEY, label: 'Kinetic IA',
    note: 'Curacion visual del catalogo (no excluye de la generacion de Kinetic todavia).',
    categories: [
      { key: 'family', title: 'Familias de color', note: 'La historia de color del video.', items: families.map(f => ({ id: ns('family:' + f), label: LABEL.family[f] || f, spec: familySpec(f) })) },
      { key: 'bg', title: 'Fondos', note: 'La placa/mesh de cada familia.', items: families.map(f => ({ id: ns('family:' + f), label: LABEL.family[f] || f, meta: 'fondo', spec: bgSpec(f) })) },
      { key: 'font', title: 'Fuentes', note: 'Pares display + soporte.', items: FONT_PAIRS.map(p => ({ id: ns('font:' + p.id), label: p.display, meta: '+ ' + p.support, spec: fontSpec(p) })) },
      { key: 'garnish', title: 'Garnish (formas)', note: 'El dialecto decorativo de esquinas.', items: garnishes.map(g => ({ id: ns('garnish:' + g), label: LABEL.garnish[g] || g, spec: garnishSpec(g) })) },
      { key: 'texture', title: 'Texturas', note: 'El acabado global (grano / papel).', items: textures.map(t => ({ id: ns('texture:' + t), label: LABEL.texture[t] || t, spec: textureSpec(t) })) },
      { key: 'cta', title: 'Variantes de cierre', note: 'Como se dibuja el CTA final.', items: ctas.map(c => ({ id: ns('cta:' + c), label: LABEL.cta[c] || c, spec: ctaSpec(c) })) },
      { key: 'scene', title: 'Escenas', note: 'Las plantillas de cada beat.', items: scenes.map(id => ({ id: ns(id), label: LABEL.scene[id] || id, spec: sceneSpec(id) })) },
      { key: 'xf', title: 'Transiciones', note: 'Los cortes con movimiento.', items: xfs.map(id => ({ id: ns(id), label: LABEL.xf[id] || id, spec: xfSpec(id) })) },
    ],
  }
}
