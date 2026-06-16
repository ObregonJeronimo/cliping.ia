// similarity-probe.mjs — ANTI-SAMENESS: mide si dos marcas (videos) se PARECEN demasiado.
// Por marca calcula: (a) la SECUENCIA de tipos de escena (estructura) y (b) un aHash perceptual de frames clave
// (layout/luminancia, gris -> ignora el color, capta el "molde"). Compara TODOS los pares y reporta los mas
// parecidos. Determinista, sin API. Uso: node tools/similarity-probe.mjs [dir=tools/brands]
import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { drawFrame, timelineDuration, setLogo, setPhotos } from '../src/pages/Animaciones/engineCore.js'

const HERE = dirname(fileURLToPath(import.meta.url))
try { GlobalFonts.loadFontsFromDir(join(HERE, 'fonts')) } catch { }
const dir = process.argv[2] || join(HERE, 'brands')
const HW = 18, HH = 32   // resolucion del hash (9:16)

function aHashAt(tl, t) {
  const cv = createCanvas(HW, HH); const ctx = cv.getContext('2d')
  ctx.setTransform(HW / 405, 0, 0, HH / 720, 0, 0)
  drawFrame(ctx, t, tl)
  const d = ctx.getImageData(0, 0, HW, HH).data
  const g = new Float32Array(HW * HH); let sum = 0
  for (let i = 0, j = 0; i < d.length; i += 4, j++) { g[j] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; sum += g[j] }
  const mean = sum / g.length
  return g.map(v => v > mean ? 1 : 0)
}

const files = readdirSync(dir).filter(f => f.endsWith('.json')).sort()
const brands = []
for (const f of files) {
  const tl = JSON.parse(readFileSync(join(dir, f), 'utf8'))
  try { if (tl.logo) setLogo(await loadImage(tl.logo)) } catch { }
  try { if (Array.isArray(tl.images) && tl.images.length) setPhotos(await Promise.all(tl.images.map(u => loadImage(u).catch(() => null)))) } catch { }
  const dur = timelineDuration(tl) || 8
  const seq = (tl.scenes || []).map(s => s.type).join('-')
  const bits = [0.22, 0.5, 0.78].flatMap(p => Array.from(aHashAt(tl, dur * p)))   // 3 frames clave
  brands.push({ name: tl.brand || f, seq, bits })
  setLogo(null); setPhotos([])
}

function hamm(a, b) { let d = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++; return d / a.length }
const pairs = []
for (let i = 0; i < brands.length; i++) for (let j = i + 1; j < brands.length; j++) {
  const A = brands[i], B = brands[j]
  pairs.push({ a: A.name, b: B.name, sameSeq: A.seq === B.seq, dissim: hamm(A.bits, B.bits) })
}
pairs.sort((x, y) => x.dissim - y.dissim)

console.log(`\nANTI-SAMENESS · ${brands.length} marcas · ${pairs.length} pares (frames ${HW}x${HH}, gris)`)
console.log('estructuras IDENTICAS (mismo orden de escenas) -> molde repetido:')
const seqGroups = {}; for (const b of brands) (seqGroups[b.seq] ||= []).push(b.name)
let anySeq = false
for (const s in seqGroups) if (seqGroups[s].length > 1) { anySeq = true; console.log(`  [${s}] -> ${seqGroups[s].join(', ')}`) }
if (!anySeq) console.log('  (ninguna estructura se repite — bien)')
console.log('\npares mas PARECIDOS visualmente (dissim baja = se parecen; <0.18 = sospechoso):')
for (const p of pairs.slice(0, 8)) console.log(`  ${p.dissim.toFixed(3)}  ${p.sameSeq ? '[MISMA ESTRUCTURA] ' : ''}${p.a}  vs  ${p.b}`)
const flagged = pairs.filter(p => p.dissim < 0.18 || (p.sameSeq && p.dissim < 0.26))
console.log(`\n-> ${flagged.length} par(es) "demasiado parecidos" (objetivo: 0). ${flagged.length ? 'Atacar variando estructura/layout/ritmo.' : 'OK.'}`)
