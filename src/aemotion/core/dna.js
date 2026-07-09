// aemotion 0.1 · STYLE DNA — la IDENTIDAD del video, elegida UNA vez por seed. Requisito central
// (pedido explicito de Thiago): que existan VARIOS disenos de video, nunca uno igual a otro ni un
// estilo unico de fabrica. Mecanica probada de kinetic: FAMILIA VISUAL discreta (5 sistemas de diseno
// distintos) sampleada con afinidad gaussiana a un mood-vector + ejes continuos jitterizados (paleta
// derivada del brandColor con anclas movidas, bpm float, springs z/w, margen, tracking...) -> ni dos
// videos de la misma familia son identicos. Cada eje tira de su namespace (ortogonalidad PRNG).
import { seedFor, weightedPick, range, pick } from './prng.js'
import { clamp } from './util.js'
import { FONT_PAIRS, FONT_VETO } from '../libs/fonts.js'

// --- color helpers locales (hsl) ---
function hexToHsl(hex) {
  let h = String(hex || '#888').replace('#', '')
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
  const n = parseInt(h.slice(0, 6), 16) || 0x888888
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
  let hh = 0
  if (d > 0) {
    if (max === r) hh = ((g - b) / d + (g < b ? 6 : 0))
    else if (max === g) hh = (b - r) / d + 2
    else hh = (r - g) / d + 4
    hh *= 60
  }
  const l = (max + min) / 2
  return { h: hh, s: d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1)), l }
}
function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360; s = clamp(s, 0, 1); l = clamp(l, 0, 1)
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2
  let r = 0, g = 0, b = 0
  if (h < 60) { r = c; g = x } else if (h < 120) { r = x; g = c } else if (h < 180) { g = c; b = x }
  else if (h < 240) { g = x; b = c } else if (h < 300) { r = x; b = c } else { r = c; b = x }
  const q = v => clamp(Math.round((v + m) * 255), 0, 255).toString(16).padStart(2, '0')
  return '#' + q(r) + q(g) + q(b)
}
function relLum(hex) {
  let h = String(hex).replace('#', '')
  const n = parseInt(h.slice(0, 6), 16) || 0
  const f = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }
  return 0.2126 * f((n >> 16) & 255) + 0.7152 * f((n >> 8) & 255) + 0.0722 * f(n & 255)
}
export function contrast(a, b) {
  const la = relLum(a), lb = relLum(b), hi = Math.max(la, lb), lo = Math.min(la, lb)
  return (hi + 0.05) / (lo + 0.05)
}

// mood vector [calidez, formalidad, energia] desde el brief (enums reales de perception)
function moodOf(brief, r) {
  const aud = brief.audience || {}
  const reg = aud.register || ''
  const ser = typeof brief.seriousness === 'number' ? brief.seriousness : 0.5
  const eh = brief.energyHint || brief.energy || ''
  const WARM = ['beauty', 'food', 'resto', 'salud', 'health', 'eventos', 'educacion']
  let calidez = 0.45 + (reg === 'warm' ? 0.25 : reg === 'casual' ? 0.1 : reg === 'formal' ? -0.15 : 0)
  if (WARM.includes(String(brief.rubro || '').toLowerCase())) calidez += 0.12
  let formalidad = 0.3 + ser * 0.5 + (reg === 'formal' ? 0.2 : reg === 'casual' ? -0.12 : 0)
  let energia = eh === 'alto' ? 0.75 : eh === 'bajo' ? 0.3 : 0.55
  energia += (0.5 - ser) * 0.2
  return [clamp(calidez + range(r, -0.15, 0.15), 0, 1), clamp(formalidad + range(r, -0.15, 0.15), 0, 1), clamp(energia + range(r, -0.15, 0.15), 0, 1)]
}

// pick con afinidad gaussiana al mood, pesos capeados 3:1 (el bias orienta, nunca determina)
function moodPick(r, items, mood, moodOfItem, veto) {
  const S2 = 2 * 0.35 * 0.35
  let ws = items.map(it => {
    const m = moodOfItem(it)
    const d2 = (m[0] - mood[0]) ** 2 + (m[1] - mood[1]) ** 2 + (m[2] - mood[2]) ** 2
    return Math.exp(-d2 / S2)
  })
  const mx = Math.max(...ws)
  ws = ws.map(w => Math.max(w, mx / 3))
  let it = weightedPick(r, items, x => ws[items.indexOf(x)])
  for (let k = 0; k < 6 && veto && veto(it, mood); k++) it = weightedPick(r, items, x => ws[items.indexOf(x)])
  return it
}

// --- LAS 5 FAMILIAS VISUALES (sistemas de diseno distintos, no variaciones de uno) ---
//  pol: motivo de polaridad (L claro / D oscuro / A placa de acento) · dialects: formas de la familia
//  fonts: voces preferidas (bias x2.2, no exclusivas) · bg: variante de fondo que pinta backgrounds.js
export const FAMILIAS = [
  { id: 'orbita', mood: [0.25, 0.55, 0.65], pol: [['D', 'D', 'L', 'D', 'D'], ['D', 'D', 'D', 'A', 'D']], dialects: ['anillos', 'gotas'], fonts: ['suizo', 'tech', 'ancho', 'sora', 'shoulders'], bg: 'glow' },
  { id: 'editorial', mood: [0.6, 0.85, 0.35], pol: [['L', 'L', 'D', 'L', 'L'], ['L', 'L', 'L', 'A', 'L']], dialects: ['subrayados', 'anillos'], fonts: ['editorial', 'serif-drama', 'suizo', 'sora'], bg: 'papel' },
  { id: 'liquidpop', mood: [0.75, 0.25, 0.7], pol: [['A', 'L', 'A', 'L', 'A'], ['L', 'A', 'L', 'A', 'D']], dialects: ['gotas', 'bloques'], fonts: ['redondo', 'ancho', 'suizo', 'condensado'], bg: 'blobs' },
  { id: 'blueprint', mood: [0.3, 0.65, 0.55], pol: [['D', 'D', 'L', 'D', 'D'], ['D', 'L', 'D', 'D', 'D']], dialects: ['grid', 'anillos'], fonts: ['tech', 'brutal-mono', 'suizo', 'condensado'], bg: 'grid' },
  { id: 'poster', mood: [0.35, 0.4, 0.85], pol: [['L', 'D', 'A', 'D', 'L'], ['D', 'L', 'D', 'A', 'D']], dialects: ['bloques', 'subrayados'], fonts: ['brutal-mono', 'shoulders', 'condensado', 'ancho'], bg: 'franja' },
]

export function deriveDNA(brief, seed) {
  const rMood = seedFor(seed, 'am.dna.mood')
  const mood = moodOf(brief, rMood)

  // --- familia visual (el eje mas grande de variedad) ---
  const rF = seedFor(seed, 'am.dna.familia')
  const fam = moodPick(rF, FAMILIAS, mood, f => f.mood, null)
  const shapeDialect = pick(rF, fam.dialects)
  const polarityMotif = pick(rF, fam.pol)

  // --- voz tipografica (mood-pick global con bias de familia) ---
  const rV = seedFor(seed, 'am.dna.voice')
  const famSet = new Set(fam.fonts)
  const pair = (() => {
    const S2 = 2 * 0.35 * 0.35
    let ws = FONT_PAIRS.map(p => {
      const d2 = (p.mood[0] - mood[0]) ** 2 + (p.mood[1] - mood[1]) ** 2 + (p.mood[2] - mood[2]) ** 2
      return Math.exp(-d2 / S2) * (famSet.has(p.id) ? 2.2 : 1)
    })
    const mx = Math.max(...ws); ws = ws.map(w => Math.max(w, mx / 3))
    let it = weightedPick(rV, FONT_PAIRS, x => ws[FONT_PAIRS.indexOf(x)])
    for (let k = 0; k < 6 && FONT_VETO(it, mood); k++) it = weightedPick(rV, FONT_PAIRS, x => ws[FONT_PAIRS.indexOf(x)])
    return it
  })()
  const caseMode = pick(rV, fam.id === 'poster' ? ['upper', 'upper', 'title'] : mood[1] > 0.66 ? ['sentence', 'title', 'upper'] : ['upper', 'upper', 'sentence', 'title'])
  // micro-craft tipografico (research): UPPERCASE pide tracking +5-10% del em y leading compacto
  // 0.88-0.97; caja mixta pide tracking neutro/negativo y leading ~1.0-1.08. En EM (escala con size).
  const trackEm = caseMode === 'upper' ? range(rV, 0.045, 0.095) : range(rV, -0.02, 0.004)
  const leading = caseMode === 'upper' ? range(rV, 0.9, 0.97) : range(rV, 1.0, 1.08)
  const sizeContrast = range(rV, 1.7, 3.0)

  // --- paleta (anclas SIEMPRE jitterizadas: jamas un hex de fabrica) ---
  const rC = seedFor(seed, 'am.dna.color')
  const bHsl = hexToHsl(brief.brandColor || '#5b8cff')
  const achroma = bHsl.s < 0.12
  const hue = achroma ? range(rC, 0, 360) : (bHsl.h + range(rC, -13, 13) + 360) % 360
  const darkL = fam.id === 'orbita' ? range(rC, 0.045, 0.085) : fam.id === 'blueprint' ? range(rC, 0.07, 0.11) : range(rC, 0.08, 0.13)
  const paperDark = hslToHex(hue + range(rC, -24, 24), fam.id === 'blueprint' ? range(rC, 0.12, 0.3) : range(rC, 0.05, 0.25), darkL)
  const warmPaper = fam.id === 'editorial'
  const paperLight = hslToHex(warmPaper ? range(rC, 34, 56) : hue + range(rC, -18, 18), warmPaper ? range(rC, 0.1, 0.22) : range(rC, 0.02, 0.09), range(rC, 0.915, 0.965))
  let accent = hslToHex(hue, clamp((achroma ? 0.6 : bHsl.s) + range(rC, 0.02, 0.22) + (fam.id === 'orbita' ? 0.15 : 0), 0.45, 0.95), fam.id === 'orbita' ? range(rC, 0.54, 0.66) : range(rC, 0.42, 0.58))
  for (let i = 0; i < 8 && contrast(accent, '#ffffff') < 4.5 && contrast(accent, '#0b0b0e') < 4.5; i++) {
    const a = hexToHsl(accent); accent = hslToHex(a.h, a.s, a.l > 0.5 ? a.l - 0.06 : a.l + 0.06)
  }
  const accent2 = hslToHex(hue + range(rC, 24, 60) * (rC() < 0.5 ? 1 : -1), range(rC, 0.5, 0.85), range(rC, 0.5, 0.66))
  const inkOnAccent = contrast(accent, '#ffffff') >= contrast(accent, '#0b0b0e') ? '#ffffff' : '#0b0b0e'
  const inkLight = hslToHex(hue + range(rC, -15, 15), range(rC, 0.05, 0.25), range(rC, 0.05, 0.11))
  const inkDark = hslToHex(hue + range(rC, -15, 15), range(rC, 0.03, 0.15), range(rC, 0.93, 0.98))

  // --- personalidad de movimiento (continua) ---
  const rM = seedFor(seed, 'am.dna.motion')
  const z = clamp(range(rM, 0.5, 0.82) - mood[2] * 0.1, 0.42, 0.9)
  const w = clamp(range(rM, 10, 17) + mood[2] * 3, 9, 20)
  const overshoot = range(rM, 1.03, 1.16)
  const staggerOverlap = range(rM, 0.42, 0.72)
  const squashK = range(rM, 0.0002, 0.00055) * (mood[2] > 0.6 ? 1.35 : 1)
  const shutterK = mood[2] > 0.55 ? range(rM, 0.4, 1) : range(rM, 0, 0.5)   // cuanto motion blur usa la familia
  const bpm = range(rM, 84, 126)

  // --- layout / textura ---
  const rL = seedFor(seed, 'am.dna.layout')
  const margin = range(rL, 26, 46)
  const radius = fam.id === 'poster' ? 0 : pick(rL, [0, 8, 16])
  const ctaKind = pick(rL, fam.id === 'poster' ? ['block', 'giant', 'underline'] : fam.id === 'editorial' ? ['underline', 'pill', 'giant'] : ['pill', 'pill', 'underline', 'block'])
  const rT = seedFor(seed, 'am.dna.texture')
  const texture = pick(rT, ['clean', 'clean', 'grain', 'grain'])
  const texIntensity = range(rT, 0.04, 0.12)
  const breathPos = range(rL, 0.5, 0.74)

  return {
    v: 1, mood,
    familia: fam.id, bg: fam.bg, shapeDialect, polarityMotif,
    pairId: pair.id, display: pair.display, dw: pair.dw, dAlt: pair.alt, support: pair.support, sw: pair.sw,
    caseMode, trackEm, leading, sizeContrast,
    paperLight, paperDark, accent, accent2, inkOnAccent, inkLight, inkDark,
    glowK: fam.id === 'orbita' ? range(rC, 0.5, 1) : range(rC, 0, 0.35),
    z, w, overshoot, staggerOverlap, squashK, shutterK, bpm,
    margin, radius, ctaKind, texture, texIntensity, breathPos,
  }
}
