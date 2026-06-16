// legibility-probe.mjs — mide OBJETIVAMENTE si el texto se LEE sobre su fondo (WCAG).
// Por escena: renderiza el frame COMPLETO y el frame SOLO-FONDO (drawFrame con {bgOnly}); los pixeles que
// difieren fuerte = TEXTO/contenido; calcula el contraste WCAG entre el color del texto y el fondo debajo, y
// reporta que % del texto queda por debajo de 3:1 (AA texto grande) y 4.5:1 (AA normal). Determinista.
// Uso: node tools/legibility-probe.mjs <timeline.json>
import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { drawFrame, setLogo, setPhotos } from '../src/pages/Animaciones/engineCore.js'

const LW = 405, LH = 720, DSF = 1080 / LW
const HERE = dirname(fileURLToPath(import.meta.url))
try { GlobalFonts.loadFontsFromDir(join(HERE, 'fonts')) } catch { }

const path = process.argv[2]
const tl = JSON.parse(readFileSync(path, 'utf8'))
try { if (tl.logo) setLogo(await loadImage(tl.logo)) } catch { }
try { if (Array.isArray(tl.images) && tl.images.length) setPhotos(await Promise.all(tl.images.map(u => loadImage(u).catch(() => null)))) } catch { }

const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }
const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
const contrast = (l1, l2) => { const a = Math.max(l1, l2), b = Math.min(l1, l2); return (a + 0.05) / (b + 0.05) }

function renderRGBA(t, bgOnly) {
  const cv = createCanvas(LW * DSF, LH * DSF)
  const ctx = cv.getContext('2d'); ctx.setTransform(DSF, 0, 0, DSF, 0, 0)
  drawFrame(ctx, t, tl, bgOnly ? { bgOnly: true } : undefined)
  return ctx.getImageData(0, 0, LW * DSF, LH * DSF).data
}

// limites de escena
const scenes = tl.scenes || []
let cur = 0; const segs = []
for (const sc of scenes) { const d = Math.max(30, sc.durationInFrames || 120) / 30; segs.push({ type: sc.type, s: cur, e: cur + d }); cur += d }

console.log(`\n${tl.brand || path} · legibilidad por escena (texto vs fondo, WCAG):`)
console.log('  escena            %texto<3:1   %texto<4.5:1   contraste_min   px_texto')
let worst = 1e9, worstScene = ''
for (const seg of segs) {
  const t = seg.s + (seg.e - seg.s) * 0.72   // hold tardio (texto ya revelado)
  const full = renderRGBA(t, false), bg = renderRGBA(t, true)
  let nTxt = 0, nLow3 = 0, nLow45 = 0, minC = 1e9
  for (let i = 0; i < full.length; i += 4) {
    const lf = lum(full[i], full[i + 1], full[i + 2]), lb = lum(bg[i], bg[i + 1], bg[i + 2])
    // pixel de TEXTO/contenido: difiere fuerte del fondo (evita ruido de AA y micro-movimiento del fondo)
    const dr = Math.abs(full[i] - bg[i]) + Math.abs(full[i + 1] - bg[i + 1]) + Math.abs(full[i + 2] - bg[i + 2])
    if (dr < 160) continue   // solo glifos/elementos SOLIDOS (excluye marca de agua tenue, sombras y bordes AA)
    nTxt++
    const c = contrast(lf, lb)
    if (c < 3) nLow3++
    if (c < 4.5) nLow45++
    if (c < minC) minC = c
  }
  const p3 = nTxt ? (100 * nLow3 / nTxt) : 0, p45 = nTxt ? (100 * nLow45 / nTxt) : 0
  const mc = nTxt ? minC : 0
  if (nTxt > 400 && mc < worst) { worst = mc; worstScene = seg.type }
  console.log(`  ${(seg.type || '?').padEnd(15)} ${p3.toFixed(1).padStart(8)}% ${p45.toFixed(1).padStart(11)}% ${mc.toFixed(2).padStart(13)}   ${String(nTxt).padStart(8)}`)
}
console.log(`  -> objetivo: %texto<3:1 cerca de 0 (todo el texto contrasta). Peor escena: ${worstScene} (min ${worst === 1e9 ? '-' : worst.toFixed(2)}:1).`)
