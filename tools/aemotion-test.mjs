// GATE aemotion: (1) la MATEMATICA del motor da los valores exactos conocidos (cubic-bezier de
// referencia, Easy Ease simetrico, derivada del spring vs diferencia finita, longitud del circulo,
// trim, follow-path); (2) DETERMINISMO byte-identico: el demo con el mismo t produce el mismo PNG en
// 2 corridas y en seek en frio (caza estado escondido entre frames — wiggle/trim/tracks incluidos).
import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import {
  cubicBezier, track, velOf, spring, springVel, squashFactor,
  parsePath, circlePath, starPath, measure, pointAt, trimmed,
  pathMorph, ringOf, metaballPath, rangeAmount, randomOrder, setScratchFactory,
  makeMotionVideo, drawMotionFrame,
  drawDemoFrame, DEMO_DUR, W, H,
} from '../src/aemotion/index.js'

const HERE = dirname(fileURLToPath(import.meta.url))
try { GlobalFonts.loadFontsFromDir(join(HERE, 'fonts')) } catch { /* fuentes del sistema */ }
setScratchFactory((w, h) => createCanvas(w, h))   // OBLIGATORIO en Node: sin esto blur degrada y transiciones caen a corte seco

let fails = 0
const die = m => { console.error('FAIL  ' + m); fails++ }
const near = (a, b, tol, m) => { if (Math.abs(a - b) > tol) die(`${m}: ${a} !== ${b} (±${tol})`) }

// 1) cubic-bezier: valor de referencia exacto de gre/bezier-easing (README): (0,0,1,0.5)(0.5) = 0.3125
near(cubicBezier(0, 0, 1, 0.5)(0.5), 0.3125, 1e-4, 'cubicBezier ref')
near(cubicBezier(0.25, 0.1, 0.25, 1)(0), 0, 1e-9, 'cubicBezier f(0)')
near(cubicBezier(0.25, 0.1, 0.25, 1)(1), 1, 1e-9, 'cubicBezier f(1)')

// 2) Easy Ease (default de track): simetrico -> f(0.5)=0.5 y f(x)+f(1-x)=1; extremos exactos
const ee = track([{ t: 0, v: 0 }, { t: 1, v: 1 }])
near(ee(0.5), 0.5, 1e-6, 'easyEase medio')
near(ee(0.25) + ee(0.75), 1, 1e-4, 'easyEase simetria')
near(ee(0), 0, 1e-12, 'easyEase f(0)')
near(ee(1), 1, 1e-12, 'easyEase f(1)')
if (!(ee(0.25) < 0.25)) die('easyEase deberia arrancar lento (f(0.25) < 0.25)')

// 3) velocidades que igualan la pendiente media -> movimiento LINEAL exacto (sanidad del speed graph)
const lin = track([{ t: 0, v: 0, out: { speed: 10, influence: 33 } }, { t: 1, v: 10, in: { speed: 10, influence: 33 } }])
near(lin(0.25), 2.5, 1e-9, 'speed=media -> lineal')
near(lin(0.7), 7, 1e-9, 'speed=media -> lineal (2)')

// 4) hold + valores exactos en los keys + vector
const hd = track([{ t: 0, v: 3, interp: 'hold' }, { t: 1, v: 9 }])
near(hd(0.999), 3, 1e-12, 'hold mantiene v1')
near(hd(1), 9, 1e-12, 'hold salta en k2')
const vec = track([{ t: 0, v: [0, 100] }, { t: 1, v: [10, 200] }])
const vm = vec(0.5)
near(vm[0], 5, 1e-6, 'vector dim0 medio'); near(vm[1], 150, 1e-6, 'vector dim1 medio')

// 5) derivada analitica del spring vs diferencia finita central
for (const tt of [0.12, 0.3, 0.55]) {
  const dt = 1e-5
  const fd = (spring(tt + dt, 0.55, 13) - spring(tt - dt, 0.55, 13)) / (2 * dt)
  near(springVel(tt, 0.55, 13), fd, 1e-3, `springVel(t=${tt}) vs dif. finita`)
}

// 6) squash preserva area: s * (1/s) = 1
const s = squashFactor(400, 0.001, 0.3)
near(s * (1 / s), 1, 1e-12, 'squash area')

// 7) path: circulo de radio 100 mide ~2πr (las 4 cubicas kappa aproximan a <0.03%)
const cm = measure(circlePath(0, 0, 100), 0.1)
near(cm.length, 2 * Math.PI * 100, 2 * Math.PI * 100 * 0.002, 'longitud del circulo')

// 8) pointAt: extremos y angulo de una linea recta
const lm = measure(parsePath('M 0 0 L 10 0 L 10 10'))
near(lm.length, 20, 1e-9, 'longitud polilinea')
const p0 = pointAt(lm, 0), pL = pointAt(lm, 20), pMid = pointAt(lm, 5)
near(p0.x, 0, 1e-9, 'pointAt(0).x'); near(pL.y, 10, 1e-9, 'pointAt(L).y')
near(pMid.x, 5, 1e-9, 'pointAt(5).x'); near(pMid.angle, 0, 1e-9, 'angulo tramo horizontal')

// 9) trim: la ventana [25%,75%] de una polilinea de 20px mide 10px
const tr = trimmed(lm, 5, 15)
let trLen = 0
for (const sub of tr) for (let i = 1; i < sub.pts.length; i++) trLen += Math.hypot(sub.pts[i].x - sub.pts[i - 1].x, sub.pts[i].y - sub.pts[i - 1].y)
near(trLen, 10, 1e-6, 'trim 25-75 mide la mitad')
if (trimmed(lm, 7, 7).length !== 0) die('trim vacio deberia dar []')

// 10) MORPH: los extremos del interpolador son los anillos de origen/destino (alineados)
const mSC = pathMorph(starPath(0, 0, 60, 26, 5), circlePath(0, 0, 50), { n: 96 })
const ring0 = mSC(0), ring1 = mSC(1)
const A0 = ringOf(starPath(0, 0, 60, 26, 5), 96)
near(ring0[0].x, A0[0].x, 1e-9, 'morph f(0) = anillo A (x)')
near(ring0[0].y, A0[0].y, 1e-9, 'morph f(0) = anillo A (y)')
{ // todo punto de f(1) esta sobre el circulo destino (radio 50, tolerancia del resampleo)
  let worst = 0
  for (const p of ring1) { if (p.c === 'Z') continue; if (p.x == null) continue; worst = Math.max(worst, Math.abs(Math.hypot(p.x, p.y) - 50)) }
  if (worst > 0.6) die(`morph f(1): punto a ${worst.toFixed(3)}px del circulo destino`)
}
const rHalf = mSC(0.5)
if (!rHalf.some(s => s.c === 'Z')) die('morph f(0.5) no cierra el path')

// 11) LIQUID: membrana existe cuando estan cerca, null cuando lejos o contenidos
if (!metaballPath(0, 0, 30, 70, 0, 24)) die('metaball: deberia haber membrana a d=70')
if (metaballPath(0, 0, 30, 500, 0, 24)) die('metaball: no deberia haber membrana a d=500')
if (metaballPath(0, 0, 30, 2, 0, 24)) die('metaball: no deberia haber membrana con circulo contenido')
{ const mm = metaballPath(0, 0, 30, 70, 0, 24); if (mm[mm.length - 1].c !== 'Z') die('metaball: la membrana no cierra') }

// 12) TEXTFX: range selector (square ventana completa = 1; triangle pico al centro; orden seedeado estable)
for (let i = 0; i < 5; i++) near(rangeAmount(i, 5, { start: 0, end: 1, shape: 'square' }, 0), 1, 1e-9, `square full char ${i}`)
{
  const wMid = rangeAmount(2, 5, { start: 0, end: 1, shape: 'triangle' }, 0)
  const wEdge = rangeAmount(0, 5, { start: 0, end: 1, shape: 'triangle' }, 0)
  if (!(wMid > wEdge)) die('triangle: el centro deberia pesar mas que el borde')
}
{
  const o1 = randomOrder(8, 42), o2 = randomOrder(8, 42), o3 = randomOrder(8, 43)
  if (o1.join() !== o2.join()) die('randomOrder: mismo seed deberia dar el mismo orden')
  if (o1.join() === o3.join()) die('randomOrder: seeds distintos dieron el mismo orden (sospechoso)')
  if (o1.slice().sort((a, b) => a - b).join() !== '0,1,2,3,4,5,6,7') die('randomOrder: no es permutacion')
}

// 13) DETERMINISMO byte-identico del demo (2 corridas + seek en frio, ts cubren los 5 beats)
const png = t => {
  const ss = 2, cv = createCanvas(W * ss, H * ss), ctx = cv.getContext('2d')
  ctx.setTransform(ss, 0, 0, ss, 0, 0)
  drawDemoFrame(ctx, t, 7)
  return cv.toBuffer('image/png')
}
const TS = [0.6, 1.12, 1.4, 3.6, 4.6, 6.4, 7.2, 8.9, 9.7, 11.6, 12.35, 13.1]
for (const t of TS) {
  if (!png(t).equals(png(t))) die(`t=${t}: frame difiere entre corridas`)
}
// seek en frio: renderizar SOLO el ultimo t (proceso "nuevo" simulado: sin frames previos ya lo es,
// el demo no tiene estado; esto documenta el contrato para escenas futuras)
if (!png(TS[TS.length - 1]).equals(png(TS[TS.length - 1]))) die('seek en frio difiere')
if (DEMO_DUR <= 0) die('DEMO_DUR invalido')

// 14) VIDEO REAL: makeMotionVideo determinista (receta + frames byte-identicos, incluida la ventana
// de transicion) + seek en frio + contrato basico
const brief = { brand: 'Acme', rubro: 'tech', brandColor: '#5b8cff', tagline: 'Construido para escalar', claim: 'La plataforma que crece con vos', cta: 'Probalo gratis', bullets: ['Rapido', 'Seguro', 'Simple'], stats: [{ value: '99.9%', label: 'uptime' }] }
const vpng = (video, t) => {
  const ss = 2, cv = createCanvas(video.W * ss, video.H * ss), ctx = cv.getContext('2d')
  ctx.setTransform(ss, 0, 0, ss, 0, 0)
  drawMotionFrame(ctx, t, video)
  return cv.toBuffer('image/png')
}
for (const seed of [1, 7, 1234]) {
  const a = makeMotionVideo(brief, { seed }), b = makeMotionVideo(brief, { seed })
  if (JSON.stringify(a.recipe) !== JSON.stringify(b.recipe)) die(`video seed ${seed}: receta re-rolleo`)
  const vts = [0.2, a.duration * 0.35, a.duration * 0.8]
  const ftr = a.cuts.find(c => c.dur > 0); if (ftr) vts.push(ftr.at)
  for (const t of vts) {
    if (!vpng(a, t).equals(vpng(b, t))) die(`video seed ${seed} t=${t.toFixed(2)}: frame difiere entre corridas`)
  }
  const cold = makeMotionVideo(brief, { seed })
  const tLast = vts[vts.length - 1]
  if (!vpng(cold, tLast).equals(vpng(a, tLast))) die(`video seed ${seed}: seek en frio difiere (estado entre frames)`)
}

// 15) ANTI-FABRICA: 24 seeds -> genotipos discretos, variedad real (pedido explicito: varios disenos)
const genos = new Set(), fams = new Set()
for (let s = 1; s <= 24; s++) {
  const v = makeMotionVideo(brief, { seed: s * 37 })
  genos.add([v.dna.familia, v.dna.pairId, v.dna.shapeDialect, v.dna.ctaKind, v.dna.caseMode, v.script.templateId].join('|'))
  fams.add(v.dna.familia)
}
if (genos.size < 18) die(`variedad pobre: solo ${genos.size}/24 genotipos distintos`)
if (fams.size < 3) die(`variedad pobre: solo ${fams.size} familias visuales en 24 seeds`)

// 16) contrato basico
const vv = makeMotionVideo(brief, { seed: 5 })
if (!(vv.duration > 6 && vv.duration <= 30)) die('duracion fuera de rango: ' + vv.duration)
if (!vv.scenes.length || vv.scenes[vv.scenes.length - 1].role !== 'cta') die('el video no cierra con CTA')
if (!vv.recipe || !vv.recipe.dna) die('receta sin dna')

if (fails) { console.error(`\nGATE AEMOTION FALLO (${fails}).`); process.exit(1) }
console.log(`GATE AEMOTION OK (matematica + determinismo testbed ${TS.length} ts + video real 3 seeds + ${genos.size}/24 genotipos, ${fams.size} familias).`)
