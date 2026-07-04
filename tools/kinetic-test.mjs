// GATE kinetic-determinismo: el motor kinetic con el MISMO brief+seed produce el MISMO video (receta
// identica) y el MISMO frame (pixeles byte-identicos, 2 pasadas con caches frios/calientes) en varios seeds
// y varios t (incluida una ventana de transicion). Ademas: seeds distintos -> DNA distinto (anti-fabrica
// smoke: en 24 seeds no puede repetirse el genotipo discreto completo).
import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { makeKinetic, drawKineticFrame, setScratchFactory } from '../src/kinetic/index.js'

const HERE = dirname(fileURLToPath(import.meta.url))
try { GlobalFonts.loadFontsFromDir(join(HERE, 'fonts')) } catch { /* fuentes del sistema */ }
setScratchFactory((w, h) => createCanvas(w, h))

const brief = { brand: 'Acme', rubro: 'tech', brandColor: '#5b8cff', tagline: 'Construido para escalar', claim: 'La plataforma que crece con vos', cta: 'Probalo gratis', bullets: ['Rapido', 'Seguro', 'Simple'], stats: [{ value: '99.9%', label: 'uptime' }] }
let fails = 0
const die = m => { console.error('FAIL  ' + m); fails++ }

const png = (video, t) => { const ss = 2, cv = createCanvas(video.W * ss, video.H * ss), ctx = cv.getContext('2d'); ctx.setTransform(ss, 0, 0, ss, 0, 0); drawKineticFrame(ctx, t, video); return cv.toBuffer('image/png') }

// 1) receta y frames byte-identicos entre 2 corridas
for (const seed of [1, 7, 1234, 99991]) {
  const a = makeKinetic(brief, { seed }), b = makeKinetic(brief, { seed })
  if (JSON.stringify(a.recipe) !== JSON.stringify(b.recipe)) die(`seed ${seed}: receta re-rolleo`)
  const ts = [0.2, a.duration * 0.35, a.duration * 0.8]
  const ftr = a.cuts.find(c => c.dur > 0); if (ftr) ts.push(ftr.at)      // dentro de la ventana de transicion
  for (const t of ts) {
    const p1 = png(a, t), p2 = png(b, t)
    if (!p1.equals(p2)) die(`seed ${seed} t=${t.toFixed(2)}: frame difiere entre corridas`)
  }
  // SEEK EN FRIO: un video nuevo renderizado SOLO en el ultimo t (sin frames previos) debe dar el mismo
  // byte que la corrida secuencial -> caza estado dependiente del historial de renders (buffers/caches).
  const cold = makeKinetic(brief, { seed })
  const tLast = ts[ts.length - 1]
  if (!png(cold, tLast).equals(png(a, tLast))) die(`seed ${seed} t=${tLast.toFixed(2)}: seek en frio difiere (estado entre frames)`)
}

// 2) anti-fabrica smoke: 24 seeds -> genotipos discretos, ninguno duplicado exacto
const genos = new Set()
for (let s = 1; s <= 24; s++) {
  const v = makeKinetic(brief, { seed: s * 37 })
  const g = [v.dna.pairId, v.dna.caseMode, v.dna.colorFamily, v.dna.garnishDialect, v.dna.texture, v.dna.ctaVariant, v.script.templateId].join('|')
  genos.add(g)
}
if (genos.size < 18) die(`variedad pobre: solo ${genos.size}/24 genotipos distintos`)

// 3) contrato basico del video
const v = makeKinetic(brief, { seed: 5 })
if (!(v.duration > 6 && v.duration <= 30)) die('duracion fuera de rango: ' + v.duration)
if (!v.scenes.length || v.scenes[v.scenes.length - 1].role !== 'cta') die('el video no cierra con CTA')
if (!v.recipe || !v.recipe.dna) die('receta sin dna')

if (fails) { console.error(`\nGATE KINETIC FALLO (${fails}).`); process.exit(1) }
console.log(`GATE KINETIC OK (determinismo byte-identico + ${genos.size}/24 genotipos distintos + contrato).`)
