// render.mjs — rasteriza el motor Canvas a PNG con @napi-rs/canvas (Skia, fuera del navegador).
// Sirve para AUTO-REVISAR visualmente sin MP4: produce "contact sheets" (grillas de frames a lo largo
// del tiempo) y galerias de semillas/temas. Las PNG quedan en tools/out/ para abrirlas y mirarlas.
//
// Uso:
//   node tools/render.mjs all                      -> fondo-seeds, fondo-motion, fondo-themes, video-demo
//   node tools/render.mjs video <timeline.json> <nombre>   -> film-strip de un timeline propio
//
// OJO de honestidad: Skia ~= Chromium (Remotion), pero NO es identico (fuentes: sin Inter local usa
// fallback sans). Sirve para juzgar composicion/color/movimiento/variedad. El MP4 final lo rinde Jero.
import { createCanvas } from '@napi-rs/canvas'
import { writeFileSync, mkdirSync, readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { drawFrame, drawBackground, beatAt, timelineDuration, DEMO_TIMELINE, THEME_NAMES } from '../src/pages/Animaciones/engineCore.js'
import { drawMotionDemo } from '../src/pages/Animaciones/motionDemo.js'

const W = 405, H = 720
const SS = 2                          // supersample del frame fuente (nitidez)
const OUT = join(dirname(fileURLToPath(import.meta.url)), 'out')
mkdirSync(OUT, { recursive: true })

// renderiza una funcion de dibujo a un canvas WxH (supersampleado)
function frameCanvas(drawFn) {
  const cv = createCanvas(W * SS, H * SS)
  const ctx = cv.getContext('2d')
  ctx.setTransform(SS, 0, 0, SS, 0, 0)
  drawFn(ctx)
  return cv
}

// arma una grilla (contact sheet) de {cv,label} y la escribe a out/<name>.png
function sheet(name, title, items, cols, tileW = 232) {
  const tileH = Math.round(tileW * H / W)
  const rows = Math.ceil(items.length / cols)
  const pad = 10, lh = 20, top = 34
  const cw = cols * tileW + (cols + 1) * pad
  const ch = top + rows * (tileH + lh) + (rows + 1) * pad
  const cv = createCanvas(cw, ch)
  const ctx = cv.getContext('2d')
  ctx.fillStyle = '#0a0a0f'; ctx.fillRect(0, 0, cw, ch)
  ctx.fillStyle = '#fff'; ctx.font = 'bold 16px sans-serif'; ctx.fillText(title, pad, 22)
  items.forEach((it, i) => {
    const r = Math.floor(i / cols), c = i % cols
    const x = pad + c * (tileW + pad), y = top + pad + r * (tileH + lh + pad)
    ctx.drawImage(it.cv, x, y, tileW, tileH)
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.strokeRect(x, y, tileW, tileH)
    ctx.fillStyle = '#9aa'; ctx.font = '12px sans-serif'; ctx.fillText(it.label, x + 2, y + tileH + 14)
  })
  const p = join(OUT, name + '.png')
  writeFileSync(p, cv.toBuffer('image/png'))
  console.log('wrote', p, `(${cw}x${ch})`)
}

function videoStrip(tl, name, title, n = 12) {
  const dur = timelineDuration(tl) || 8
  const items = Array.from({ length: n }, (_, i) => {
    const t = (i + 0.5) * dur / n
    return { cv: frameCanvas((ctx) => drawFrame(ctx, t, tl)), label: `${t.toFixed(1)}s · ${beatAt(t, tl)}`.slice(0, 34) }
  })
  sheet(name, title, items, 4)
}

const SHOW_ACCENT = {
  'ocean-deep': '#3aa0ff', 'organic-natural': '#7cc04a', 'sunset-warm': '#ff7847',
  'crimson-bold': '#ff4d5e', 'gold-lux': '#f5c451', 'berry-glow': '#c879ff',
  'clinical-formal': '#5b8cff', 'saas-explainer': '#6aa6ff', 'cyber-neon': '#39f0ff', 'mono-ink': '#cfcfcf',
}

function fondoSeeds() {
  const seeds = [1, 7, 23, 42, 99, 256, 1024, 7777]
  const items = seeds.map(s => ({ cv: frameCanvas(ctx => drawBackground(ctx, 3.0, { theme: 'ocean-deep', accent: '#3aa0ff', seed: s })), label: `semilla ${s}` }))
  sheet('fondo-seeds', 'Fondo · variedad por semilla (misma marca/tema, t=3s) -> cada marca = fondo distinto', items, 4)
}
function fondoMotion() {
  const ts = [0, 1.5, 3, 4.5, 6, 7.5, 9, 10.5]
  const items = ts.map(t => ({ cv: frameCanvas(ctx => drawBackground(ctx, t, { theme: 'berry-glow', accent: '#c879ff', seed: 42 })), label: `t=${t}s` }))
  sheet('fondo-motion', 'Fondo · movimiento en el tiempo (semilla 42, berry-glow)', items, 4)
}
function fondoThemes() {
  const items = THEME_NAMES.map(th => ({ cv: frameCanvas(ctx => drawBackground(ctx, 3.0, { theme: th, accent: SHOW_ACCENT[th] || '#5b8cff', seed: 42 })), label: th }))
  sheet('fondo-themes', 'Fondo · 10 temas de rubro (semilla 42, t=3s)', items, 5, 200)
}

function motionSheets(accent) {
  const spans = { eases: 1.9, path: 4, morph: 8.05, stagger: 1.7 }
  for (const kind of ['eases', 'path', 'morph', 'stagger']) {
    const span = spans[kind]
    const items = Array.from({ length: 8 }, (_, i) => {
      const t = (i + 0.3) * span / 8
      return { cv: frameCanvas(ctx => drawMotionDemo(ctx, t, kind, { accent })), label: `${kind} t=${t.toFixed(2)}` }
    })
    sheet('motion-' + kind, `Motion premium · ${kind} (accent ${accent})`, items, 4)
  }
}

function rubroSheet() {
  const p = join(dirname(fileURLToPath(import.meta.url)), 'style-presets.json')
  const presets = JSON.parse(readFileSync(p, 'utf8'))
  const items = presets.map(pr => ({ cv: frameCanvas(ctx => drawBackground(ctx, 3.0, { theme: pr.theme, accent: pr.accent, seed: pr.seed })), label: `${pr.rubro} · ${pr.accent}` }))
  sheet('rubros', 'Direccion (POC 3) · fondo por RUBRO (rubro distinto = look distinto; la marca lo varia con su semilla)', items, 4)
}

function galleryFromDir(dir, t = 3.0) {
  const files = readdirSync(dir).filter(f => f.endsWith('.json')).sort()
  const items = files.map(f => {
    const tl = JSON.parse(readFileSync(join(dir, f), 'utf8'))
    return { cv: frameCanvas(ctx => drawFrame(ctx, t, tl)), label: `${tl.brand} · ${tl.rubro || ''}` }
  })
  sheet('brands-gallery', `Marcas mock · frame del HERO (t=${t}s) — comparar UNICIDAD entre marcas`, items, 4)
}

const mode = process.argv[2] || 'all'
if (mode === 'gallery') {
  galleryFromDir(process.argv[3] || 'tools/brands', parseFloat(process.argv[4] || '3.0'))
} else if (mode === 'video') {
  const path = process.argv[3]
  const name = process.argv[4] || 'video'
  const tl = path ? JSON.parse(readFileSync(path, 'utf8')) : DEMO_TIMELINE
  videoStrip(tl, name, `Video · ${name}`)
} else if (mode === 'motion') {
  motionSheets(process.argv[3] || '#5aa0ff')
} else if (mode === 'rubros') {
  rubroSheet()
} else {
  fondoSeeds(); fondoMotion(); fondoThemes()
  videoStrip(DEMO_TIMELINE, 'video-demo', 'Video DEMO (fondo nuevo + escenas)')
}
console.log('done.')
