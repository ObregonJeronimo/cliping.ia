// director-cuts.mjs — QA DE MOVIMIENTO. Un contact-sheet no muestra si una transicion funciona: hay
// que ver la ventana del corte frame a frame. Esta herramienta arma rejillas de 12 frames (4x3) por
// cada corte del video y una del final de cada escena.
//
// Es la herramienta que en el motor viejo destapo los defectos que ningun assert veia: frames
// completamente vacios en el medio de una transicion, capas que saltaban, y beats en los que no
// pasaba nada durante segundos.
//
// Uso:
//   node tools/director-cuts.mjs                      -> demo, seed 1
//   node tools/director-cuts.mjs <fixture> [seed]     -> pagemodel real
//   node tools/director-cuts.mjs --escenas <fixture>  -> rejillas de escena completa en vez de cortes
import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { normalizePageModel, validateTimeline, formatErrors, CANVAS } from '../src/director/core/schema.js'
import { buildGuion } from '../src/director/core/scriptwriter.js'
import { composeStoryboard } from '../src/director/core/composer.js'
import { deriveLook } from '../src/director/kit/look.js'
import { compile } from '../src/director/core/timeline.js'
import { drawFrame } from '../src/director/render/video.js'
import { corpusHero } from '../src/director/render/draw.js'

const HERE = dirname(fileURLToPath(import.meta.url)), OUT = join(HERE, 'out')
mkdirSync(OUT, { recursive: true })
try { GlobalFonts.loadFontsFromDir(join(HERE, 'fonts')) } catch {}

const DEMO = {
  brand: 'Urvid', url: 'https://urvid.app/',
  dna: { palette: { accent: '#6366f1' }, modernidad: ['bigtype', 'bento'], mood: { energia: 0.7 } },
  semantica: {
    queHace: 'Convertí cualquier link en un reel listo para publicar',
    comoFunciona: ['Pegás el link de tu página', 'La IA analiza y escribe el guion', 'Descargás el video en 9:16'],
    tipoNegocio: 'saas', modeloUso: 'suscripcion',
    features: [{ titulo: 'Análisis automático' }, { titulo: 'Video en 30 segundos' }, { titulo: 'Sin editar nada' }, { titulo: 'Formato vertical' }],
    pruebas: { stats: [{ valor: '30s', etiqueta: 'por video' }], logosClientes: true },
    cta: 'Probalo gratis',
  },
}

const args = process.argv.slice(2)
const modoEscenas = args[0] === '--escenas'
const fixArg = modoEscenas ? args[1] : args[0]
let raw = DEMO, nombre = 'demo'
if (fixArg) {
  const p = existsSync(fixArg) ? fixArg : join(HERE, 'fixtures', 'director', fixArg.endsWith('.json') ? fixArg : fixArg + '.json')
  if (!existsSync(p)) { console.error('no existe el fixture: ' + p); process.exit(1) }
  raw = JSON.parse(readFileSync(p, 'utf-8')); nombre = p.split(/[\\/]/).pop().replace('.json', '')
}
const seed = Number(args[modoEscenas ? 2 : 1]) || 1

const pm = normalizePageModel(raw)
const guion = buildGuion(pm, seed)
const look = deriveLook(pm, seed)
const sb = composeStoryboard(pm, guion, look, seed)
const tl = compile(sb, seed)
const v = validateTimeline(tl)
if (!v.ok) { console.error('TIMELINE INVALIDA:\n' + formatErrors(v.errors)); process.exit(1) }

const ESC = 1.1, W = Math.round(CANVAS.W * ESC), H = Math.round(CANVAS.H * ESC)
const makeCanvas = (w, h) => createCanvas(w, h)
const frame = t => {
  const c = createCanvas(W, H), cx = c.getContext('2d')
  const rep = drawFrame(cx, tl, t, { W, H, makeCanvas, brand: pm.brand, corpus: corpusHero(pm), images: new Map() })
  return { c, rep, t }
}
// mide cuanta imagen hay SOBRE EL FONDO (mismo criterio que el gate). Medir alpha>0 daria 100%
// siempre: la placa es opaca y llena el cuadro. Lo que interesa es cuanto se DESVIA de la placa.
const placaSola = (() => {
  const c = createCanvas(W, H), cx = c.getContext('2d')
  drawFrame(cx, { ...tl, layers: tl.layers.filter(l => l.kind === 'plate'), tracks: [] }, 0, { W, H, makeCanvas })
  return cx.getImageData(0, 0, W, H).data
})()
const tinta = c => {
  const d = c.getContext('2d').getImageData(0, 0, W, H).data
  let n = 0
  for (let i = 0; i < d.length; i += 4) {
    if (Math.abs(d[i] - placaSola[i]) + Math.abs(d[i + 1] - placaSola[i + 1]) + Math.abs(d[i + 2] - placaSola[i + 2]) > 24) n++
  }
  return n / (W * H)
}

// una rejilla 4x3 de 12 frames entre t0 y t1
function rejilla(t0, t1, titulo, path) {
  const N = 12, cols = 4, filas = 3
  const CW = Math.round(W * 0.62), CH = Math.round(H * 0.62), GAP = 10, LBL = 18
  const c = createCanvas(GAP + cols * (CW + GAP), 30 + filas * (CH + GAP + LBL))
  const s = c.getContext('2d')
  s.fillStyle = '#0b0b0d'; s.fillRect(0, 0, c.width, c.height)
  s.fillStyle = '#e8e8ea'; s.font = 'bold 15px sans-serif'; s.fillText(titulo, GAP, 20)
  let peor = 1, tPeor = 0
  for (let i = 0; i < N; i++) {
    const t = t0 + (t1 - t0) * (i / (N - 1))
    const f = frame(t)
    const fr = tinta(f.c)
    if (fr < peor) { peor = fr; tPeor = t }
    const x = GAP + (i % cols) * (CW + GAP), y = 30 + Math.floor(i / cols) * (CH + GAP + LBL)
    s.fillStyle = '#141418'; s.fillRect(x, y, CW, CH)
    s.drawImage(f.c, x, y, CW, CH)
    s.strokeStyle = fr < 0.008 ? '#ff4d4d' : '#2a2a30'; s.lineWidth = fr < 0.008 ? 2 : 1
    s.strokeRect(x + 0.5, y + 0.5, CW, CH)
    s.fillStyle = fr < 0.008 ? '#ff8080' : '#8a8f98'; s.font = '10px monospace'
    s.fillText(`${t.toFixed(2)}s · ${(fr * 100).toFixed(1)}% · ${f.rep.capas}c`, x + 2, y + CH + 12)
  }
  writeFileSync(path, c.toBuffer('image/png'))
  return { peor, tPeor }
}

console.log(`${pm.brand} · seed ${seed} · ${guion.gramatica} · ${tl.dur}s · ${tl.layers.length} capas · ${tl.tracks.length} tracks`)
console.log('escenas: ' + sb.scenes.map(s => s.escena).join(' > '))
console.log('cortes : ' + tl.links.join(' · '))

if (modoEscenas) {
  sb.scenes.forEach((sc, i) => {
    const p = join(OUT, `director-cuts-${nombre}-e${i + 1}.png`)
    const r = rejilla(sc.t0, sc.t0 + sc.dur, `${nombre} seed${seed} · ESCENA ${i + 1} ${sc.escena} (${sc.t0}s-${(sc.t0 + sc.dur).toFixed(2)}s)`, p)
    console.log(`  escena ${i + 1} ${sc.escena.padEnd(16)} minimo de tinta ${(r.peor * 100).toFixed(1)}% en ${r.tPeor.toFixed(2)}s -> ${p}`)
  })
} else {
  sb.scenes.slice(1).forEach((sc, i) => {
    const tCut = sc.t0, d = 0.55
    const p = join(OUT, `director-cuts-${nombre}-c${i + 1}.png`)
    const r = rejilla(Math.max(0, tCut - d), Math.min(tl.dur, tCut + d), `${nombre} seed${seed} · CORTE ${i + 1}: ${sb.scenes[i].escena} -> ${sc.escena} [${tl.links[i]}]`, p)
    console.log(`  corte ${i + 1} ${(tl.links[i] || '').padEnd(18)} minimo de tinta ${(r.peor * 100).toFixed(1)}% en ${r.tPeor.toFixed(2)}s -> ${p}`)
  })
}
