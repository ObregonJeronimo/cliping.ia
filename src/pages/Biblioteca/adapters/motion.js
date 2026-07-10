// Biblioteca · adaptador MOTION IA (src/aemotion). Catalogo: familias, fondos, fuentes, esquemas de
// color, formas, escenas, transiciones. Previews con frames reales (seed-search). Los ids SIN el
// prefijo de motor son los que consume makeMotionVideo({disabled}) -> este adaptador namespacea con
// 'motion|' y el estudio strippea el prefijo al generar.
import {
  makeMotionVideo, drawMotionFrame, FAMILIAS, FONT_PAIRS, listModules,
  deriveDNA, drawShape, circlePath, starPath, rectPath, linePath, paintPlate,
  rgba, fontStr, applyCase,
} from '../../../aemotion/index.js'
import { PREV_W, PREV_H, K, SAMPLE_IMG, frame, makeFinder } from './common.js'

export const KEY = 'motion'
const SAMPLE = { brand: 'Marca', rubro: 'tech', brandColor: '#4f7cff', tagline: 'Tu historia en video', claim: 'Menos esfuerzo, mas impacto', cta: 'Empeza gratis', bullets: ['Rapido', 'Simple', 'Profesional'], stats: [{ value: '+400', label: 'ya lo usan' }], images: [SAMPLE_IMG] }
const SDNA = deriveDNA(SAMPLE, 7)
const find = makeFinder(s => makeMotionVideo(SAMPLE, { seed: s }))

const LABEL = {
  fam: { orbita: 'Orbital', editorial: 'Editorial', liquidpop: 'Liquid Pop', blueprint: 'Blueprint', poster: 'Poster' },
  scheme: { mono: 'Monocromo', duo: 'Complementario', tri: 'Triadico' },
  dialect: { anillos: 'Anillos', gotas: 'Gotas', arcos: 'Arcos', subrayados: 'Subrayados', bloques: 'Bloques', grid: 'Grilla', estrellas: 'Estrellas' },
  scene: { 'am.scene.cascade': 'Cascada de texto', 'am.scene.morphmark': 'Morph + marca', 'am.scene.orbit': 'Orbitas', 'am.scene.liquidstat': 'Stat liquido', 'am.scene.pathline': 'Trazo + recorrido', 'am.scene.stripes': 'Franjas', 'am.scene.ctapill': 'Cierre / CTA', 'am.scene.photocard': 'Foto del sitio' },
  xf: { 'am.xf.iris': 'Iris liquido', 'am.xf.push': 'Empuje', 'am.xf.shapewipe': 'Barrido de forma' },
}

const famSpec = (famId) => { const v = find('fam:' + famId, x => x.dna.familia === famId); return { dur: v.duration, still: v.duration * 0.16, draw: (ctx, t) => { frame(ctx); drawMotionFrame(ctx, t, v) } } }
const bgSpec = (fam) => { const v = find('fam:' + fam.id, x => x.dna.familia === fam.id); const sc = v.scenes.find(s => s.polarity === 'dark') || v.scenes.find(s => s.polarity === 'light') || v.scenes[0]; return { dur: 8, still: 3, draw: (ctx, t) => { frame(ctx); paintPlate(ctx, 405, 720, sc, sc.t0 + t, v) } } }
const sceneSpec = (id) => { const v = find('scene:' + id, x => x.scenes.some(s => s.sceneId === id)); const sc = v.scenes.find(s => s.sceneId === id) || v.scenes[0]; return { dur: sc.dur, still: sc.dur * 0.45, draw: (ctx, t) => { frame(ctx); drawMotionFrame(ctx, sc.t0 + (t % sc.dur), v) } } }
const xfSpec = (id) => { const v = find('xf:' + id, x => x.cuts.some(c => c.id === id)); const c = v.cuts.find(k => k.id === id); const d = c.dur, t0 = c.at - d / 2; return { dur: d + 1.2, still: d / 2, draw: (ctx, t) => { frame(ctx); drawMotionFrame(ctx, t0 + Math.min(t, d), v) } } }

const fontSpec = (p) => ({ dur: 0, still: 0, draw: (ctx) => {
  frame(ctx); ctx.fillStyle = SDNA.paperDark; ctx.fillRect(0, 0, 405, 720)
  ctx.textAlign = 'center'; ctx.fillStyle = SDNA.inkDark; ctx.textBaseline = 'middle'
  ctx.font = fontStr(p.dw, 150, p.display); ctx.fillText('Aa', 202, 250)
  ctx.font = fontStr(p.dw, 40, p.display); ctx.fillText(applyCase('Titular', 'upper'), 202, 400)
  ctx.fillStyle = rgba(SDNA.inkDark, 0.6); ctx.font = fontStr(p.sw, 22, p.support); ctx.fillText('Texto de soporte 123', 202, 470)
  ctx.fillStyle = rgba(SDNA.accent, 0.9); ctx.font = fontStr(p.sw, 14, p.support); ctx.fillText((p.display + ' / ' + p.support).toUpperCase(), 202, 560)
} })

const schemeSpec = (s) => { const v = find('scheme:' + s, x => x.dna.scheme === s); const a = v.dna.accent, a2 = v.dna.accent2; return { dur: 0, still: 0, draw: (ctx) => {
  frame(ctx); ctx.fillStyle = '#0c0e14'; ctx.fillRect(0, 0, 405, 720)
  drawShape(ctx, 0, { path: circlePath(150, 250, 95), stroke: { color: a, width: 12 } })
  drawShape(ctx, 0, { path: circlePath(255, 250, 95), stroke: { color: a2, width: 12 } })
  ctx.fillStyle = a; ctx.fillRect(70, 430, 120, 120); ctx.fillStyle = a2; ctx.fillRect(215, 430, 120, 120)
  ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = fontStr(600, 18, 'Inter')
  ctx.fillText(a.toUpperCase(), 130, 600); ctx.fillText(a2.toUpperCase(), 275, 600)
} } }

const dialectSpec = (d) => { const a = SDNA.accent, a2 = SDNA.accent2, cx = 202, cy = 240, R = 120; return { dur: 4, still: 1, draw: (ctx, t) => {
  frame(ctx); ctx.fillStyle = '#0c0e14'; ctx.fillRect(0, 0, 405, 720); const rot = t * 0.5
  if (d === 'anillos') { drawShape(ctx, 0, { path: circlePath(cx, cy, R), stroke: { color: a, width: 6 }, trim: { start: 0, end: 0.8, offset: rot * 0.16 } }); drawShape(ctx, 0, { path: circlePath(cx, cy, R * 0.6), stroke: { color: a2, width: 4 }, trim: { start: 0, end: 0.6, offset: -rot * 0.16 } }) }
  else if (d === 'gotas') { drawShape(ctx, 0, { path: circlePath(cx - 40, cy, 34), fill: a }); drawShape(ctx, 0, { path: circlePath(cx + 30 + Math.sin(t * 2) * 10, cy, 22), fill: a }) }
  else if (d === 'arcos') { ctx.strokeStyle = a; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(cx, cy, R, rot, rot + 2.2); ctx.stroke(); ctx.strokeStyle = a2; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, cy, R * 0.62, -rot, -rot + 1.6); ctx.stroke() }
  else if (d === 'subrayados') { drawShape(ctx, 0, { path: linePath(cx - R, cy, cx + R, cy), stroke: { color: a, width: 8 }, trim: { start: 0, end: (Math.sin(t) + 1) / 2 } }) }
  else if (d === 'bloques') { for (let i = 0; i < 3; i++) drawShape(ctx, 0, { path: rectPath(cx - 90 + i * 70, cy - 50 + Math.sin(t * 2 + i) * 8, 56, 100, 8), fill: i % 2 ? a2 : a }) }
  else if (d === 'grid') { ctx.strokeStyle = rgba(a, 0.6); ctx.lineWidth = 2; for (let i = 0; i <= 6; i++) { ctx.beginPath(); ctx.moveTo(cx - R + i * (2 * R / 6), cy - R); ctx.lineTo(cx - R + i * (2 * R / 6), cy + R); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx - R, cy - R + i * (2 * R / 6)); ctx.lineTo(cx + R, cy - R + i * (2 * R / 6)); ctx.stroke() } ctx.strokeStyle = a2; ctx.lineWidth = 3; const mx = cx - R + ((t * 40) % (2 * R)); ctx.beginPath(); ctx.moveTo(mx, cy - 12); ctx.lineTo(mx, cy + 12); ctx.stroke() }
  else if (d === 'estrellas') { drawShape(ctx, 0, { path: starPath(cx, cy, R, R * 0.44, 5, rot), fill: a }); drawShape(ctx, 0, { path: starPath(cx, cy - 4, R * 0.5, R * 0.22, 5, -rot), fill: a2 }) }
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = fontStr(500, 20, 'Inter'); ctx.fillText(LABEL.dialect[d] || d, cx, 470)
} } }

export default function build() {
  const ns = (id) => KEY + '|' + id
  const dialects = [...new Set(FAMILIAS.flatMap(f => f.dialects))]
  const scenes = listModules('scenes').map(m => m.id).sort()
  const xfs = listModules('transitions').filter(m => m.dur > 0).map(m => m.id).sort()
  return {
    key: KEY, label: 'Motion IA',
    note: 'Curar aca SI afecta la generacion de videos nuevos (fallback seguro).',
    categories: [
      { key: 'fam', title: 'Familias visuales', note: 'El sistema de diseno completo (fondo + paleta + ritmo).', items: FAMILIAS.map(f => ({ id: ns('fam:' + f.id), label: LABEL.fam[f.id] || f.id, meta: f.bg, spec: famSpec(f.id) })) },
      { key: 'bg', title: 'Fondos', note: 'El fondo es parte de su familia (mismo on/off).', items: FAMILIAS.map(f => ({ id: ns('fam:' + f.id), label: LABEL.fam[f.id] || f.id, meta: 'fondo ' + f.bg, spec: bgSpec(f) })) },
      { key: 'font', title: 'Fuentes', note: 'Pares display + soporte.', items: FONT_PAIRS.map(p => ({ id: ns('font:' + p.id), label: p.display, meta: '+ ' + p.support, spec: fontSpec(p) })) },
      { key: 'scheme', title: 'Esquemas de color', note: 'Como se deriva el 2do color de la marca.', items: Object.keys(LABEL.scheme).map(s => ({ id: ns('scheme:' + s), label: LABEL.scheme[s], spec: schemeSpec(s) })) },
      { key: 'dialect', title: 'Formas', note: 'El vocabulario de formas (garnish, morphs, flotantes).', items: dialects.map(d => ({ id: ns('dialect:' + d), label: LABEL.dialect[d] || d, spec: dialectSpec(d) })) },
      { key: 'scene', title: 'Escenas', note: 'Las plantillas que arman cada beat.', items: scenes.map(id => ({ id: ns(id), label: LABEL.scene[id] || id, spec: sceneSpec(id) })) },
      { key: 'xf', title: 'Transiciones', note: 'Los cortes con movimiento.', items: xfs.map(id => ({ id: ns(id), label: LABEL.xf[id] || id, spec: xfSpec(id) })) },
    ],
  }
}
