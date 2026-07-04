// kinetic 1.0 · STYLE DNA — la IDENTIDAD del video, elegida UNA vez por seed. Requisito central de Jero:
// que dos videos NUNCA se parezcan ni delaten la fabrica. Mecanica: ejes DISCRETOS sampleados con afinidad
// gaussiana a un "mood vector" (coherencia sin reglas rigidas; pesos capeados 3:1 para que el bias oriente
// pero nunca determine) + ~15 ejes CONTINUOS (floats del seed) -> ni dos videos de la misma familia son
// identicos. PROHIBIDO que algo visual sea constante entre videos (anclas de color jitterizadas, bpm float,
// margen continuo, posicion del respiro sampleada...). Cada eje tira de su namespace (ortogonalidad PRNG).
import { seedFor, weightedPick, range, pick } from './prng.js'
import { clamp, hexToHsl, hslToHex, contrast } from './util.js'
import { FONT_PAIRS, FONT_VETO } from '../libs/fonts.js'

// mood vector [calidez, formalidad, energia] desde el brief (enums reales de perception: register
// formal/casual/warm · awareness 5 etapas · seriousness 0..1 · energyHint 'alto|medio|bajo')
function moodOf(brief, r) {
  const aud = brief.audience || {}
  const reg = aud.register || ''
  const ser = typeof brief.seriousness === 'number' ? brief.seriousness : 0.5
  const eh = brief.energyHint || brief.energy || ''
  const WARM_RUBROS = ['beauty', 'food', 'resto', 'salud', 'health', 'eventos', 'educacion']
  let calidez = 0.45 + (reg === 'warm' ? 0.25 : reg === 'casual' ? 0.1 : reg === 'formal' ? -0.15 : 0)
  if (WARM_RUBROS.includes(String(brief.rubro || '').toLowerCase())) calidez += 0.12
  let formalidad = 0.3 + ser * 0.5 + (reg === 'formal' ? 0.2 : reg === 'casual' ? -0.12 : 0)
  let energia = eh === 'alto' ? 0.75 : eh === 'bajo' ? 0.3 : 0.55
  energia += (0.5 - ser) * 0.2
  return [clamp(calidez + range(r, -0.15, 0.15), 0, 1), clamp(formalidad + range(r, -0.15, 0.15), 0, 1), clamp(energia + range(r, -0.15, 0.15), 0, 1)]
}

// pick con afinidad gaussiana al mood, pesos capeados a 3:1 (el bias orienta, nunca determina)
function moodPick(r, items, mood, moodOfItem, veto) {
  const S2 = 2 * 0.35 * 0.35
  let ws = items.map(it => {
    const m = moodOfItem(it)
    const d2 = (m[0] - mood[0]) ** 2 + (m[1] - mood[1]) ** 2 + (m[2] - mood[2]) ** 2
    return Math.exp(-d2 / S2)
  })
  const mx = Math.max(...ws)
  ws = ws.map(w => Math.max(w, mx / 3))                      // cap 3:1
  let it = weightedPick(r, items, x => ws[items.indexOf(x)])
  for (let k = 0; k < 6 && veto && veto(it, mood); k++) it = weightedPick(r, items, x => ws[items.indexOf(x)])
  return it
}

// historias de color: familia + parametros; TODO derivado de brandColor con anclas JITTERIZADAS (anti-huella)
const COLOR_FAMILIES = [
  { id: 'duotono', mood: [0.35, 0.6, 0.6], meshBudget: 0 },
  { id: 'mesh', mood: [0.55, 0.4, 0.7], meshBudget: 2 },
  { id: 'papel-crema', mood: [0.75, 0.55, 0.35], meshBudget: 1 },
  { id: 'neon-oscuro', mood: [0.3, 0.3, 0.85], meshBudget: 1 },
]

// patrones de polaridad (motivos; se expanden al n real de escenas). L claro, D oscuro, M mesh (resuelto por familia)
const POLARITY_PATTERNS = [
  ['L', 'D', 'L', 'D', 'L'], ['D', 'L', 'D', 'L', 'D'], ['D', 'D', 'L', 'D', 'D'], ['L', 'L', 'D', 'L', 'L'],
  ['L', 'D', 'M', 'D', 'L'], ['D', 'M', 'L', 'D', 'M'], ['M', 'D', 'L', 'D', 'D'], ['D', 'L', 'L', 'M', 'D'],
]

const GARNISH_DIALECTS = [
  { id: 'blueprint', mood: [0.25, 0.6, 0.6] },
  { id: 'bauhaus', mood: [0.45, 0.45, 0.75] },
  { id: 'organic', mood: [0.8, 0.25, 0.45] },
  { id: 'none', mood: [0.5, 0.7, 0.4] },
]

export function deriveDNA(brief, seed) {
  const rMood = seedFor(seed, 'kin.dna.mood')
  const mood = moodOf(brief, rMood)

  // --- voz tipografica ---
  const rV = seedFor(seed, 'kin.dna.voice')
  const pair = moodPick(rV, FONT_PAIRS, mood, p => p.mood, FONT_VETO)
  const caseMode = pick(rV, mood[1] > 0.66 ? ['sentence', 'title', 'upper'] : ['upper', 'upper', 'sentence', 'title'])
  const trackingBias = range(rV, -0.5, 2.2)                  // px logicos extra de tracking del display
  const sizeContrast = range(rV, 1.6, 3.0)                   // ratio display/support

  // --- historia de color (anclas jitterizadas SIEMPRE: jamas un hex de fabrica) ---
  const rC = seedFor(seed, 'kin.dna.color')
  const fam = moodPick(rC, COLOR_FAMILIES, mood, f => f.mood, null)
  const bHsl = hexToHsl(brief.brandColor || '#5b8cff')
  const achroma = bHsl.s < 0.12
  const hue = achroma ? range(rC, 0, 360) : (bHsl.h + range(rC, -14, 14) + 360) % 360
  const warm = fam.id === 'papel-crema'
  const pHue = warm ? range(rC, 32, 55) : hue + range(rC, -20, 20)
  const paperLight = hslToHex(pHue, warm ? range(rC, 0.10, 0.2) : range(rC, 0.02, 0.1), range(rC, 0.915, 0.965))
  const paperDark = hslToHex(hue + range(rC, -25, 25), range(rC, 0.06, 0.3), fam.id === 'neon-oscuro' ? range(rC, 0.05, 0.09) : range(rC, 0.08, 0.14))
  let accent = hslToHex(hue, clamp((achroma ? 0.6 : bHsl.s) + range(rC, 0, 0.2) + (fam.id === 'neon-oscuro' ? 0.2 : 0), 0.45, 0.95), fam.id === 'neon-oscuro' ? range(rC, 0.55, 0.65) : range(rC, 0.42, 0.56))
  // acento legible como PLACA (texto blanco o negro encima >= 4.5)
  for (let i = 0; i < 8 && contrast(accent, '#ffffff') < 4.5 && contrast(accent, '#0b0b0e') < 4.5; i++) {
    const a = hexToHsl(accent); accent = hslToHex(a.h, a.s, a.l > 0.5 ? a.l - 0.06 : a.l + 0.06)
  }
  const inkOnAccent = contrast(accent, '#ffffff') >= contrast(accent, '#0b0b0e') ? '#ffffff' : '#0b0b0e'
  // tintas jitterizadas (casi-negro / casi-blanco tenidos al hue — nunca #000/#fff pelados)
  const inkLight = hslToHex(hue + range(rC, -15, 15), range(rC, 0.05, 0.25), range(rC, 0.05, 0.11))
  const inkDark = hslToHex(pHue + range(rC, -15, 15), range(rC, 0.03, 0.15), range(rC, 0.93, 0.98))

  // mesh spec (aunque la familia no lo use, viaja: escenas mesh solo si meshBudget > 0)
  const nB = 2 + ((rC() * 2) | 0)
  const meshBlobs = []
  for (let i = 0; i < nB; i++) meshBlobs.push({
    hueOff: range(rC, -30, 30) + i * range(rC, 10, 40), sat: range(rC, 0.45, 0.8),
    phx: range(rC, 0, 6.28), phy: range(rC, 0, 6.28), fx: range(rC, 0.25, 0.6), fy: range(rC, 0.2, 0.5),
    rk: range(rC, 0.5, 0.85), lk: range(rC, 0.15, 0.9),
  })

  // --- dialecto de movimiento: 100% CONTINUO (z/w del spring real de motion.js) ---
  const rM = seedFor(seed, 'kin.dna.motion')
  const z = range(rM, 0.5, 0.82) - mood[2] * 0.1             // mas energia -> menos amortiguado (mas rebote)
  const w = range(rM, 10, 17) + mood[2] * 3
  const overshoot = range(rM, 1.03, 1.16)
  const staggerOverlap = range(rM, 0.4, 0.72)
  const ghostK = mood[2] > 0.6 ? range(rM, 0.3, 0.8) : range(rM, 0, 0.4)
  const bpm = range(rM, 84, 126)                             // float: nunca un BPM redondo de fabrica

  // --- polaridad / garnish / textura / layout ---
  const rP = seedFor(seed, 'kin.dna.polarity')
  const pattern = pick(rP, POLARITY_PATTERNS)
  const rG = seedFor(seed, 'kin.dna.garnish')
  const garnish = moodPick(rG, GARNISH_DIALECTS, mood, g => g.mood, null)
  const rT = seedFor(seed, 'kin.dna.texture')
  const texture = pick(rT, ['clean', 'clean', 'grain', 'grain', 'paper'])
  const texIntensity = range(rT, 0.04, 0.14)
  const rL = seedFor(seed, 'kin.dna.layout')
  const margin = range(rL, 26, 46)                           // px LOGICOS (lienzo 405 de ancho)
  const align = pick(rL, ['center', 'center', 'left'])
  const ctaVariant = pick(rL, ['pill', 'underline', 'giant', 'button'])
  const photoStyle = pick(rL, ['polaroid', 'card', 'raw'])
  const radius = pick(rL, [0, 6, 14])
  const breathPos = range(rL, 0.52, 0.74)                    // posicion RELATIVA del respiro (nunca "la escena 4")

  return {
    v: 1, mood,
    // voz
    pairId: pair.id, display: pair.display, dw: pair.dw, dAlt: pair.alt, support: pair.support, sw: pair.sw,
    caseMode, trackingBias, sizeContrast,
    // color
    colorFamily: fam.id, meshBudget: fam.meshBudget,
    paperLight, paperDark, accent, inkOnAccent, inkLight, inkDark,
    meshBlobs, meshHueDrift: range(rC, -18, 18), meshLLight: range(rC, 0.78, 0.84), meshLDark: range(rC, 0.16, 0.24),
    // movimiento
    z: clamp(z, 0.42, 0.9), w: clamp(w, 9, 20), overshoot, staggerOverlap, ghostK, bpm,
    // resto
    polarityMotif: pattern, garnishDialect: garnish.id, garnishDensity: range(rG, 0.2, 0.7),
    texture, texIntensity, margin, align, ctaVariant, photoStyle, radius, breathPos,
  }
}
