// GATE reveal-completo (bug de Jero: "Ejemplo Palabr" — textos cortados a mitad de palabra en el video).
// Invariante: al FINAL de cada escena (t = fin - 0.05s) y en el ULTIMO frame del video, todo texto dibujado
// debe estar COMPLETO: la ultima palabra dibujada tiene que ser una palabra REAL del texto fuente (no un
// prefijo tipo "Palabr"), salvo elipsis explicita ("…", que ya cazan otros gates). Un reveal de typekit que
// no llego a 1 antes del corte deja palabras a medias -> este gate lo caza por CODIGO en cientos de escenas.
import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { makeVideo, drawFrame } from '../src/urvid/index.js'
import { setScratchFactory } from '../src/urvid/core/render.js'
import { telStart, telStop } from '../src/urvid/core/text.js'

const HERE = dirname(fileURLToPath(import.meta.url))
try { GlobalFonts.loadFontsFromDir(join(HERE, 'fonts')) } catch { /* fuentes del sistema */ }
setScratchFactory((w, h) => createCanvas(w, h))

const RUBROS = ['tech', 'gastronomia', 'belleza', 'finanzas', 'fitness']
const SEEDS = 4
const brief = (rubro, tone, seed) => ({
  brand: 'Marca', rubro, tone, brandColor: '#4285F4', seed,
  tagline: 'Hecho para durar toda la semana', claim: 'Una idea clara que cambia resultados reales',
  cta: 'Empeza hoy mismo', bullets: ['Rapido y simple', 'Soporte de verdad', 'Sin contratos largos'],
  stats: [{ value: '92%', label: 'clientes contentos' }], proof: 'Nos cambio la operacion completa',
})

const cv = createCanvas(Math.ceil(405 * 1.5), Math.ceil(720 * 1.5))
const ctx = cv.getContext('2d')
const ctxFor = () => { ctx.setTransform(1.5, 0, 0, 1.5, 0, 0); return ctx }

// ¿la ultima palabra dibujada es un CORTE a mitad de palabra? (prefijo propio de una palabra del raw, sin "…")
function midWordCut(drawn, raw) {
  drawn = String(drawn || '').trim(); raw = String(raw || '').trim()
  if (!drawn || drawn.includes('…')) return false
  const dW = drawn.split(/\s+/), last = dW[dW.length - 1]
  if (!last || last.length < 2) return false
  const rawWords = raw.split(/\s+/)
  if (rawWords.some(w => w === last || w.replace(/[.,:;!?]+$/, '') === last)) return false   // palabra completa
  return rawWords.some(w => w.length > last.length && w.startsWith(last))                     // prefijo propio -> corte
}

let fails = 0, checked = 0
const bad = []
for (const rubro of RUBROS) for (const tone of ['dark', 'light']) for (let s = 1; s <= SEEDS; s++) {
  const video = makeVideo(brief(rubro, tone, s * 17))
  const points = video.scenes.map(sc => ({ t: sc.start + sc.dur - 0.05, tag: sc.sceneId }))
  points.push({ t: video.duration - 0.05, tag: 'FINAL' })
  for (const p of points) {
    const c = ctxFor(); telStart(); drawFrame(c, p.t, video); const recs = telStop(); checked++
    for (const r of recs) {
      if (midWordCut(r.str, r.raw)) { bad.push(`${rubro}/${tone}/#${s * 17} ${p.tag} @${p.t.toFixed(2)}s: "${r.str}" (raw: "${String(r.raw).slice(0, 50)}")`); fails++ }
    }
  }
}

if (fails) {
  console.error(`FALLAS (${fails}):`)
  for (const b of bad.slice(0, 15)) console.error('  - ' + b)
  if (bad.length > 15) console.error(`  ... +${bad.length - 15} mas`)
  console.error(`\nGATE REVEAL FALLO (${fails} textos a mitad de palabra al final de escena).`)
  process.exit(1)
}
console.log(`GATE REVEAL OK (${checked} puntos de fin-de-escena, cero textos cortados a mitad de palabra).`)
