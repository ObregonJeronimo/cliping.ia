// urvid1-prefit-check.mjs — GATE del DIRECTOR/CRITICO del guion (#3). Verifica por CODIGO (sin LLM/API) que el TEXTO
// del brief se MUESTRA COMPLETO (nunca cortado con "...") en CUALQUIER escena que el motor elija. Dos modos:
//   (default) ASSERT: mete contenido ADVERSARIAL (largisimo, palabras largas) -> lo pasa por fitContent (el enforcer
//             de core/script.js) -> arma el video por rubro x tono x semilla -> renderiza cada escena con telemetria
//             -> exige 0 ellipsis. Prueba que fitContent garantiza "se ve completo" aun con input basura.
//   sweep:    EXPLORA la capacidad REAL: para cada campo, alarga el texto hasta el 1er ellipsis (peor escena/seed) ->
//             imprime el largo seguro -> con eso se calibran los BUDGETS de core/script.js. (no asercion)
// Uso: node tools/urvid1-prefit-check.mjs        (assert; exit 1 si hay ellipsis)
//      node tools/urvid1-prefit-check.mjs sweep   (calibracion)
import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { makeVideo, drawFrame } from '../src/urvid/index.js'
import { setScratchFactory } from '../src/urvid/core/render.js'
import { telStart, telStop, telTag } from '../src/urvid/core/text.js'
import { W, H } from '../src/urvid/core/util.js'

const HERE = dirname(fileURLToPath(import.meta.url))
try { GlobalFonts.loadFontsFromDir(join(HERE, 'fonts')) } catch {}
const _bufs = {}
setScratchFactory((w, h) => { const k = w + 'x' + h; return _bufs[k] || (_bufs[k] = createCanvas(w, h)) })

const RUBROS = ['tech', 'finanzas', 'inmobiliaria', 'salud', 'gastronomia', 'moda', 'belleza', 'fitness', 'educacion', 'default']
const SEEDS = 8
const ss = 1.5
const _cv = createCanvas(Math.ceil(W * ss), Math.ceil(H * ss)), _c = _cv.getContext('2d')
const ctxFor = () => { _c.setTransform(ss, 0, 0, ss, 0, 0); return _c }

// palabras reales (es-AR) para armar relleno con wrapping realista
const WORDS = ('resultados visibles para tu negocio en dos semanas mas foco menos tareas repetitivas automatiza lo aburrido ' +
  'enfocate en lo que importa clientes lo recomienda proyectos entregados soluciones simples rapidas crece vende ahorra ' +
  'tiempo equipo integraciones soporte garantia confianza calidad atencion personalizada cada dia desde el primer momento').split(' ')
// texto de ~n caracteres, cortado en limite de palabra (<= n). minWords asegura varias palabras.
function filler(n, salt = 0) {
  let s = ''
  let i = salt % WORDS.length
  while (s.length < n) { s = s ? s + ' ' + WORDS[i % WORDS.length] : WORDS[i % WORDS.length]; i++ }
  if (s.length > n) { const cut = s.slice(0, n); const k = cut.lastIndexOf(' '); s = k > 0 ? cut.slice(0, k) : cut }
  return s
}

// renderiza TODAS las escenas de un brief (aisladas, t asentado) y devuelve los records ellipsizados.
function ellipsisOf(brief) {
  const video = makeVideo(brief)
  const bad = []
  for (const sc of video.scenes) {
    const solo = { ...video, scenes: [{ ...sc, start: 0 }], duration: sc.dur }
    const c = ctxFor(); telStart(); telTag({ scene: sc.sceneId })
    drawFrame(c, sc.dur * 0.7, solo)
    const recs = telStop()
    for (const r of recs) if (r.ellip) bad.push({ scene: sc.sceneId, str: r.str, raw: r.raw })
  }
  return bad
}

// brief base con TODOS los tipos de contenido presentes (para que aparezcan todas las escenas: hook/data/list/...).
function baseBrief(rubro, tone, seed, over = {}) {
  return {
    brand: 'Marca', rubro, tone, brandColor: '#4285F4', seed,
    content: {
      tagline: 'Gancho corto', claim: 'Un mensaje claro y directo', cta: 'Probalo gratis',
      bullets: ['Rapido y simple', 'Soporte real', 'Sin vueltas'],
      stats: [{ value: '92%', label: 'de clientes lo recomienda' }, { value: '+600', label: 'proyectos entregados' }],
      proof: 'Cambio como trabajamos',
      ...over,
    },
  }
}

const MODE = process.argv[2] === 'sweep' ? 'sweep' : 'assert'

if (MODE === 'sweep') {
  // para cada campo, alarga su texto y busca el MAYOR largo con 0 ellipsis (cruzando rubros/tonos/semillas).
  // el campo bajo prueba lleva relleno; el resto queda corto para aislar.
  const FIELDS = [
    { key: 'tagline', max: 90, build: (L, salt) => ({ tagline: filler(L, salt) }) },
    { key: 'claim', max: 160, build: (L, salt) => ({ claim: filler(L, salt) }) },
    { key: 'cta', max: 50, build: (L, salt) => ({ cta: filler(L, salt) }) },
    { key: 'bullet', max: 60, build: (L, salt) => ({ bullets: [filler(L, salt), filler(L, salt + 3), filler(L, salt + 7)] }) },
    { key: 'statLabel', max: 70, build: (L, salt) => ({ stats: [{ value: '92%', label: filler(L, salt) }, { value: '+600', label: filler(L, salt + 5) }] }) },
    { key: 'proof', max: 130, build: (L, salt) => ({ proof: filler(L, salt) }) },
  ]
  console.log('SWEEP capacidad (mayor largo con 0 ellipsis, cruzando rubros/tonos/semillas):')
  for (const f of FIELDS) {
    let safe = 0, firstBad = null
    for (let L = 12; L <= f.max; L += 2) {
      let bad = null
      outer:
      for (const rubro of RUBROS) for (const tone of ['dark', 'light']) for (let s = 1; s <= SEEDS; s++) {
        const e = ellipsisOf(baseBrief(rubro, tone, s, f.build(L, s)))
        if (e.length) { bad = { L, rubro, tone, s, scene: e[0].scene, str: e[0].str }; break outer }
      }
      if (bad) { firstBad = bad; break }
      safe = L
    }
    console.log(`  ${f.key.padEnd(10)} seguro <= ${safe} chars` + (firstBad ? `  (1er corte a ${firstBad.L}: ${firstBad.scene} "${firstBad.str}" [${firstBad.rubro}/${firstBad.tone}/#${firstBad.s}])` : '  (sin corte hasta el max)'))
  }
  process.exit(0)
}

// ASSERT: contenido ADVERSARIAL (mucho mas largo que cualquier cap) -> fitContent -> 0 ellipsis.
const { fitContent } = await import('../src/urvid/core/script.js')
const ADV = {
  tagline: filler(120, 1),
  claim: filler(220, 2),
  cta: filler(60, 3),
  bullets: [filler(70, 4), filler(80, 5), filler(60, 6), filler(90, 7), filler(50, 8)],
  stats: [{ value: '92%', label: filler(80, 9) }, { value: '+600', label: filler(70, 10) }, { value: '4.9', label: filler(90, 11) }],
  proof: filler(160, 12),
}
// 2do caso: contenido REALISTA pero muy largo (palabras reales, frases enteras) -> el peor caso que la perception
// podria producir. (Tokens INQUEBRABLES sin espacios = limitacion del motor, no se asertan: el contenido real
// siempre tiene espacios; el sweep/los caps los evitan.)
const PATHO = {
  tagline: filler(75, 21), claim: filler(180, 22), cta: filler(44, 23),
  bullets: [filler(55, 24), filler(48, 25), filler(60, 26), filler(40, 27)],
  stats: [{ value: '4.9', label: filler(64, 28) }, { value: '+1200', label: filler(58, 29) }],
  proof: filler(140, 30),
}

const bad = []
let checked = 0
for (const over of [ADV, PATHO]) {
  const fitted = fitContent({ brand: 'Marca', ...over })   // el enforcer (puro)
  for (const rubro of RUBROS) for (const tone of ['dark', 'light']) for (let s = 1; s <= SEEDS; s++) {
    const e = ellipsisOf({ brand: 'Marca', rubro, tone, brandColor: '#4285F4', seed: s, content: fitted })
    checked++
    for (const x of e) bad.push(`${rubro}/${tone}/#${s} ${x.scene}: "${x.str}"`)
  }
}
console.log(`PREFIT assert: ${checked} videos (contenido adversarial -> fitContent -> render)`)
console.log(`${bad.length === 0 ? 'OK ' : 'XX '} ELLIPSIS tras fitContent: ${bad.length}`)
for (const e of bad.slice(0, 10)) console.log('     - ' + e)
if (bad.length > 10) console.log(`     ... +${bad.length - 10} mas`)
if (bad.length) {
  const tally = {}
  for (const e of bad) { const m = e.match(/scene\.[a-z.]+/); if (m) tally[m[0]] = (tally[m[0]] || 0) + 1 }
  console.log('  por escena: ' + Object.entries(tally).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join('  '))
}
console.log('\n' + (bad.length === 0 ? 'GATE PREFIT OK (el guion se muestra completo aun con input adversarial).' : `GATE PREFIT: ${bad.length} ellipsis.`))
process.exit(bad.length === 0 ? 0 : 1)
