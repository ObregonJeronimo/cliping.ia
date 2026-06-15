// fluidity-probe.mjs — mide OBJETIVAMENTE el "crawl" sub-pixel del texto durante un HOLD.
// Renderiza una ventana de un timeline a 30fps en la ESCALA REAL (1080x1920) y calcula, entre frames
// consecutivos, el MAD (mean abs diff) por BANDAS horizontales. Si una banda de TEXTO (quieto en el hold)
// tiene MAD >> que la banda de FONDO, el texto esta crawleando (la falta de fluidez que se ve en el video).
// Uso: node tools/fluidity-probe.mjs <timeline.json> [tipoEscena=statement]
import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { drawFrame, setLogo, setPhotos } from '../src/pages/Animaciones/engineCore.js'

const LW = 405, LH = 720, DSF = 1080 / LW   // escala de produccion (2.667) -> reproduce el crawl real
const HERE = dirname(fileURLToPath(import.meta.url))
try { GlobalFonts.loadFontsFromDir(join(HERE, 'fonts')) } catch { }

const path = process.argv[2]
const wantType = process.argv[3] || 'statement'
const tl = JSON.parse(readFileSync(path, 'utf8'))
// precarga assets para igualar produccion
try { if (tl.logo) setLogo(await loadImage(tl.logo)) } catch { }
try { if (Array.isArray(tl.images) && tl.images.length) setPhotos(await Promise.all(tl.images.map(u => loadImage(u).catch(() => null)))) } catch { }

// limites de escena por durationInFrames
const scenes = tl.scenes || []
let cur = 0, target = null
for (const sc of scenes) {
  const d = Math.max(30, sc.durationInFrames || 120) / 30
  if (!target && sc.type === wantType) target = { s: cur, e: cur + d, sc }
  cur += d
}
if (!target) { console.log(`no hay escena tipo '${wantType}' en ${path}. Tipos:`, scenes.map(s => s.type).join(',')); process.exit(1) }
// ventana de HOLD: explicita por args (node ... <json> <tipo> <t0> <t1>) o auto (tail de la escena, ya quieta).
// auto cae en el ULTIMO tramo (target.e-...) para evitar la fase de animacion (ANIM_LEN) y medir texto QUIETO.
const argT0 = parseFloat(process.argv[4] || ''), argT1 = parseFloat(process.argv[5] || '')
const t0 = Number.isFinite(argT0) ? argT0 : Math.max(target.s + 0.2, target.e - 1.8)
const t1 = Number.isFinite(argT1) ? argT1 : (target.e - 0.2)

function frameGray(t) {
  const cv = createCanvas(LW * DSF, LH * DSF)
  const ctx = cv.getContext('2d')
  ctx.setTransform(DSF, 0, 0, DSF, 0, 0)
  drawFrame(ctx, t, tl)
  const { data, width, height } = ctx.getImageData(0, 0, LW * DSF, LH * DSF)
  const g = new Float32Array(width * height)
  for (let i = 0, j = 0; i < data.length; i += 4, j++) g[j] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
  return { g, width, height }
}

const FPS = 30, n = Math.max(2, Math.round((t1 - t0) * FPS))
const frames = []
for (let i = 0; i < n; i++) frames.push(frameGray(t0 + i / FPS))
const { width: W2, height: H2 } = frames[0]

// bandas (fraccion de alto): kicker/superior, TEXTO central, subtexto, FONDO inferior
const bands = { top: [0.10, 0.30], textoMid: [0.36, 0.58], subtexto: [0.60, 0.70], fondo: [0.82, 0.97] }
function bandMAD(a, b, y0f, y1f) {
  const y0 = Math.floor(y0f * H2), y1 = Math.floor(y1f * H2); let s = 0, c = 0
  for (let y = y0; y < y1; y++) { const off = y * W2; for (let x = 0; x < W2; x++) { s += Math.abs(a[off + x] - b[off + x]); c++ } }
  return s / c
}
const acc = {}; for (const k in bands) acc[k] = []
for (let i = 1; i < frames.length; i++) for (const k in bands) acc[k].push(bandMAD(frames[i - 1].g, frames[i].g, bands[k][0], bands[k][1]))
const mean = a => a.reduce((x, y) => x + y, 0) / a.length, max = a => Math.max(...a)

console.log(`\n${tl.brand || path} · escena '${wantType}' · hold t=${t0.toFixed(2)}..${t1.toFixed(2)} (${n} frames @${FPS}fps, ${W2}x${H2})`)
console.log('  banda            MAD_media   MAD_max   (vs fondo)')
const fz = mean(acc.fondo)
for (const k of ['top', 'textoMid', 'subtexto', 'fondo']) {
  const m = mean(acc[k]); console.log(`  ${k.padEnd(14)} ${m.toFixed(3).padStart(8)} ${max(acc[k]).toFixed(3).padStart(9)}    ${(m / (fz || 1)).toFixed(2)}x`)
}
console.log('  -> objetivo del fix: textoMid/subtexto cerca de 1.0x fondo (texto clavado a la grilla, no crawl).')
