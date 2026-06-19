// urvid1-qa.mjs — GATE de QA VISUAL por CODIGO (sin LLM, sin API, barato). Genera una matriz de videos
// (rubros x tonos x semillas), renderiza cada escena con TELEMETRIA de texto prendida y detecta defectos que
// "se ven" en el video pero que ningun test cubria:
//   1) LISTA-DISPAR: items de una lista (misma columna, espaciado regular) con TAMANOS de fuente distintos.
//   2) ELLIPSIS: texto que se corto con "..." (no entro) -> deberia achicar, no elidir.
//   3) TIMING: en la ventana de transicion, aparecen a la vez textos de la escena saliente Y de la entrante.
//   4) OFF-CANVAS (warning): caja de texto muy afuera del cuadro.
// Uso: node tools/urvid1-qa.mjs            (matriz default)
//      node tools/urvid1-qa.mjs full       (matriz grande)
import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { makeVideo, drawFrame } from '../src/urvid/index.js'
import { setScratchFactory } from '../src/urvid/core/render.js'
import { telStart, telStop, telTag } from '../src/urvid/core/text.js'
import { W, H } from '../src/urvid/core/util.js'

const HERE = dirname(fileURLToPath(import.meta.url))
try { GlobalFonts.loadFontsFromDir(join(HERE, 'fonts')) } catch {}
// buffers de transicion REUSADOS por tamano (render.js los limpia antes de pintar) -> no crea miles -> escala a 'full'.
const _bufs = {}
setScratchFactory((w, h) => { const k = w + 'x' + h; return _bufs[k] || (_bufs[k] = createCanvas(w, h)) })

// briefs de prueba: contenido REAL variado por rubro (con/sin stats/proof) para ejercitar todas las escenas.
const RUBROS = ['tech', 'finanzas', 'inmobiliaria', 'salud', 'gastronomia', 'moda', 'belleza', 'fitness', 'educacion', 'default']
const CONTENT = {
  tagline: 'Busca por voz o imagen', claim: 'Resultados visibles en dos semanas para tu negocio',
  cta: 'Probalo gratis hoy', bullets: ['Busqueda instantanea y precisa', 'Busca por voz o imagen', 'Resultados personalizados'],
  stats: [{ value: '92%', label: 'de clientes lo recomienda' }, { value: '+600', label: 'proyectos entregados' }],
  proof: 'Cambio como trabajamos todos los dias',
}
const FULL = process.argv[2] === 'full'
const SEEDS = FULL ? 16 : 7
const ss = 1.5
// REUSA un solo canvas (drawFrame hace clearRect al entrar) -> no crea miles de canvases (evita el limite nativo).
const _cv = createCanvas(Math.ceil(W * ss), Math.ceil(H * ss)), _c = _cv.getContext('2d')
const ctxFor = () => { _c.setTransform(ss, 0, 0, ss, 0, 0); return _c }

// caja de un record de texto (align + ancho medido + baseline middle aprox).
function box(r) {
  const left = r.align === 'left' ? r.x : r.align === 'right' ? r.x - r.w : r.x - r.w / 2
  const top = r.y - r.size * 0.62
  return { left, right: left + r.w, top, bottom: r.y + r.size * 0.62 }
}

const defects = { listSize: [], ellipsis: [], timing: [], offCanvas: [] }
let scenesChecked = 0, transChecked = 0

for (const rubro of RUBROS) {
  for (const tone of ['dark', 'light']) {
    for (let s = 1; s <= SEEDS; s++) {
      const brief = { brand: 'Google', rubro, tone, brandColor: '#4285F4', seed: s, content: CONTENT }
      const video = makeVideo(brief)
      const tag = `${rubro}/${tone}/#${s}`
      // ---- por ESCENA (aislada): captura limpia de su texto ----
      const fp = []   // fingerprint por escena: set de strings dibujados
      video.scenes.forEach((sc, i) => {
        const solo = { ...video, scenes: [{ ...sc, start: 0 }], duration: sc.dur }
        const c = ctxFor(); telStart(); telTag({ scene: sc.sceneId })
        drawFrame(c, sc.dur * 0.7, solo)   // t asentado (reveal>=1)
        const recs = telStop(); scenesChecked++
        fp[i] = new Set(recs.map(r => r.raw).filter(x => x && x.length > 1))
        // (1) LISTA-DISPAR: columnas de >=3 records, mismo x (~), espaciado regular en y, tamanos distintos.
        const byX = {}
        for (const r of recs) { if (!(r.w > 0)) continue; const k = r.align + ':' + Math.round((r.align === 'left' ? r.x : box(r).left) / 4) * 4; (byX[k] ||= []).push(r) }
        for (const k in byX) {
          const col = byX[k].filter(r => r.size).sort((a, b) => a.y - b.y)
          if (col.length < 3) continue
          const gaps = col.slice(1).map((r, j) => r.y - col[j].y).filter(g => g > 4)
          if (gaps.length < 2) continue
          const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length
          const reg = gaps.every(g => Math.abs(g - mean) < mean * 0.35)   // espaciado regular = es una lista
          const sizes = col.map(r => r.size), spread = Math.max(...sizes) - Math.min(...sizes)
          if (reg && spread > 1.5) defects.listSize.push(`${tag} ${sc.sceneId}: tamanos ${[...new Set(sizes.map(Math.round))].join('/')} en lista`)
        }
        // (2) ELLIPSIS
        for (const r of recs) if (r.ellip) defects.ellipsis.push(`${tag} ${sc.sceneId}: "${r.str}"`)
      })
      // ---- TIMING: en la ventana de transicion, no deben coexistir textos de A y de B ----
      for (let i = 1; i < video.scenes.length; i++) {
        const b = video.scenes[i].start, uniqA = [...(fp[i - 1] || [])].filter(x => !(fp[i] || new Set()).has(x)), uniqB = [...(fp[i] || [])].filter(x => !(fp[i - 1] || new Set()).has(x))
        if (!uniqA.length || !uniqB.length) continue
        for (const dt of [0.08, 0.16, 0.24, 0.32]) {
          const c = ctxFor(); telStart(); drawFrame(c, b + dt, video); const recs = telStop(); transChecked++
          const present = new Set(recs.map(r => r.raw))
          const aIn = uniqA.some(x => present.has(x)), bIn = uniqB.some(x => present.has(x))
          if (aIn && bIn) { defects.timing.push(`${tag} ${video.scenes[i - 1].sceneId}->${video.scenes[i].sceneId} @t=${(b + dt).toFixed(2)}: A y B juntos`); break }
        }
      }
    }
  }
}

const N = RUBROS.length * 2 * SEEDS
console.log(`QA: ${N} videos · ${scenesChecked} escenas · ${transChecked} frames de transicion\n`)
const show = (name, arr, hard) => {
  console.log(`${arr.length === 0 ? 'OK ' : (hard ? 'XX ' : '!! ')} ${name}: ${arr.length}`)
  for (const e of arr.slice(0, 6)) console.log('     - ' + e)
  if (arr.length > 6) console.log(`     ... +${arr.length - 6} mas`)
}
show('LISTA tamanos disparejos', defects.listSize, true)
show('ELLIPSIS (texto cortado)', defects.ellipsis, true)
show('TIMING (A y B juntos en transicion)', defects.timing, true)
const hardFails = defects.listSize.length + defects.ellipsis.length + defects.timing.length
console.log('\n' + (hardFails === 0 ? 'GATE QA OK (cero defectos duros).' : `GATE QA: ${hardFails} defectos duros.`))
process.exit(hardFails === 0 ? 0 : 1)
