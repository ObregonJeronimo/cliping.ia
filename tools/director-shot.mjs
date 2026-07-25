// director-shot.mjs — VER el storyboard. Renderiza cada escena estatica del Director a una lamina
// contact-sheet con las fuentes REALES, para poder auditar la composicion con el ojo (que es la unica
// forma de cazar defectos que ningun assert ve: aire mal repartido, foco ambiguo, ritmo visual plano).
//
// Uso:
//   node tools/director-shot.mjs                          -> fixture urvid demo, seed 1
//   node tools/director-shot.mjs <fixture.json> [seed] [n] -> pagemodel real (tools/fixtures/director/*.json)
//   node tools/director-shot.mjs --seeds 4                 -> 4 seeds de la misma pagina (test anti-huella)
import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { normalizePageModel, validateStoryboard, formatErrors, CANVAS } from '../src/director/core/schema.js'
import { buildGuion } from '../src/director/core/scriptwriter.js'
import { composeStoryboard, matchesEntre } from '../src/director/core/composer.js'
import { deriveLook } from '../src/director/kit/look.js'
import { drawScene } from '../src/director/render/draw.js'

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
    pruebas: { stats: [{ valor: '30s', etiqueta: 'por video' }], testimonios: [{ texto: 'Pasamos de tardar un día a tener el reel en un café', firma: 'Marina, agencia' }], logosClientes: true },
    cta: 'Probalo gratis',
  },
}

const args = process.argv.slice(2)
const nSeeds = args[0] === '--seeds' ? Math.max(1, Number(args[1]) || 4) : 0
const fixArg = nSeeds ? null : args[0]
let raw = DEMO, nombre = 'demo'
if (fixArg) {
  const p = existsSync(fixArg) ? fixArg : join(HERE, 'fixtures', 'director', fixArg.endsWith('.json') ? fixArg : fixArg + '.json')
  if (!existsSync(p)) { console.error('no existe el fixture: ' + p); process.exit(1) }
  raw = JSON.parse(readFileSync(p, 'utf-8')); nombre = p.split(/[\\/]/).pop().replace('.json', '')
}
const seedBase = Number(args[nSeeds ? 2 : 1]) || 1
const pm = normalizePageModel(raw)

const ESC = 2                                    // 810x1440 por escena: se lee bien el texto chico
const W = CANVAS.W * ESC, H = CANVAS.H * ESC
const makeCanvas = (w, h) => createCanvas(w, h)

function renderVideo(seed) {
  const guion = buildGuion(pm, seed)
  const look = deriveLook(pm, seed)
  const sb = composeStoryboard(pm, guion, look, seed)
  const v = validateStoryboard(sb)
  if (!v.ok) { console.error('STORYBOARD INVALIDO:\n' + formatErrors(v.errors)); process.exit(1) }
  const tiles = sb.scenes.map(sc => {
    const c = createCanvas(W, H), cx = c.getContext('2d')
    const rep = drawScene(cx, sc, look, W, H, { p: 1, makeCanvas, brand: pm.brand, images: new Map() })
    return { c, sc, rep }
  })
  return { sb, guion, look, tiles }
}

function hoja(videos, path, titulo) {
  const cols = videos.reduce((a, v) => Math.max(a, v.tiles.length), 0)
  const filas = videos.length
  const GAP = 16, LBL = 34
  const CW = Math.round(W * 0.42), CH = Math.round(H * 0.42)
  const sheet = createCanvas(GAP + cols * (CW + GAP), LBL + filas * (CH + GAP + LBL))
  const s = sheet.getContext('2d')
  s.fillStyle = '#0b0b0d'; s.fillRect(0, 0, sheet.width, sheet.height)
  s.fillStyle = '#e8e8ea'; s.font = 'bold 20px sans-serif'; s.fillText(titulo, GAP, 24)
  videos.forEach((v, fi) => {
    const y0 = LBL + fi * (CH + GAP + LBL)
    s.fillStyle = '#9aa0aa'; s.font = '13px monospace'
    s.fillText(`seed ${v.sb.seed} · ${v.guion.gramatica} · placa ${v.look.placa} · ${v.look.fonts.display}/${v.look.fonts.support} · obj ${v.sb.rubro.join(',')} · ${v.sb.dur}s`, GAP, y0 + 16)
    v.tiles.forEach((t, i) => {
      const x = GAP + i * (CW + GAP), y = y0 + 24
      s.drawImage(t.c, x, y, CW, CH)
      s.strokeStyle = '#2a2a30'; s.lineWidth = 1; s.strokeRect(x + 0.5, y + 0.5, CW, CH)
      s.fillStyle = '#c9ccd2'; s.font = '11px monospace'
      s.fillText(`${i + 1}. ${t.sc.escena} ${t.sc.dur}s`, x + 4, y + CH + 13)
      const m = i ? matchesEntre(v.tiles[i - 1].sc, t.sc).map(x2 => x2.key).join('+') : ''
      if (m) { s.fillStyle = '#7c8cff'; s.fillText('↤ ' + m, x + 4, y + CH + 26) }
    })
  })
  writeFileSync(path, sheet.toBuffer('image/png'))
}

if (nSeeds) {
  const videos = []
  for (let i = 0; i < nSeeds; i++) videos.push(renderVideo(seedBase + i * 7919))
  const p = join(OUT, `director-${nombre}-seeds.png`)
  hoja(videos, p, `DIRECTOR · ${pm.brand} · ${nSeeds} seeds (anti-huella)`)
  console.log('-> ' + p)
  videos.forEach(v => console.log(`  seed ${v.sb.seed}: ${v.sb.scenes.map(s => s.escena).join(' > ')}`))
} else {
  const v = renderVideo(seedBase)
  const p = join(OUT, `director-${nombre}.png`)
  hoja([v], p, `DIRECTOR · ${pm.brand} · seed ${seedBase}`)
  console.log(`gramatica: ${v.guion.gramatica} · sesgos: ${v.guion.sesgos.join(',') || '-'} · ${v.sb.dur}s`)
  console.log(`look: placa ${v.look.placa} · acento ${v.look.accent} · ${v.look.fonts.display}/${v.look.fonts.support} · orn ${v.look.orn}`)
  v.tiles.forEach((t, i) => console.log(`  ${i + 1}. ${t.sc.escena.padEnd(16)} ${t.sc.dur}s · ${t.sc.layers.length} capas${t.rep.faltantes.length ? ' · FALTAN IMGS: ' + t.rep.faltantes.length : ''}`))
  console.log('-> ' + p)
}
