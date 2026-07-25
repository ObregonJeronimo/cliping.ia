// director · LOOK — el DNA de la pagina (medido) + el seed se convierten UNA vez por video en la
// direccion de arte concreta: placas, tintas, tipografia, forma, ornamento y sesgos de modernidad.
// Es el equivalente al "Style DNA" que ya probamos en kinetic, pero ALIMENTADO POR LA PAGINA REAL
// (DNA-SPEC §4: que se hereda y que no) en vez de por puro azar.
//
// Regla anti-huella (DNA-SPEC §4.5, heredada de kinetic): nada visual puede ser CONSTANTE entre videos.
// Las tintas se tiñen, el tracking y los margenes son continuos, el ornamento y la placa varian por seed.
import { seedFor, weightedPick, range, pick } from '../core/prng.js'
import { clamp, hexToHsl, hslToHex, chroma, lighten, darken, luminance, contrast, ensureContrast, legibleOn, hueDist } from '../core/util.js'

// ---------------------------------------------------------------- familias de placa
// Cada una define bg0/bg1 (fondo) + tinta. 'tinta' se tiñe con el hue de la MARCA (no de la pagina:
// DNA-SPEC §4.3 prohibe heredar el fondo de la pagina tal cual; solo entra como tinte).
export const PLACAS = ['noir', 'carbon', 'tinta', 'crema', 'papel']

// pesos por mood/modernidad: una marca formal y fria no deberia caer en 'papel' calido, etc.
function pesoPlaca(id, dna) {
  const { calidez, formalidad } = dna.mood
  const mod = dna.modernidad || []
  switch (id) {
    case 'noir': return 1.0 + formalidad * 0.6 + (mod.indexOf('bigtype') >= 0 ? 0.5 : 0)
    case 'carbon': return 0.8 + calidez * 0.8
    case 'tinta': return 0.9 + (chroma(dna.palette.accent) > 0.12 ? 0.8 : -0.5) + (mod.indexOf('gradient-mesh') >= 0 ? 0.6 : 0)
    case 'crema': return 0.7 + (1 - formalidad) * 0.5 + (mod.indexOf('editorial-photo') >= 0 ? 0.7 : 0)
    case 'papel': return 0.5 + calidez * 0.9 + (mod.indexOf('brutalist') >= 0 ? 0.4 : 0)
    default: return 0.5
  }
}

// ---------------------------------------------------------------- pairings tipograficos por displayHint
// (DNA-SPEC §4.4) Heredamos la CLASE de tipografia de la pagina, nunca su webfont.
// Pesos horneados y verificados contra index.html + tools/fonts (browser y Node cargan lo mismo).
export const PAIRINGS = {
  serif: [
    { display: 'Playfair Display', dw: 900, support: 'Newsreader', sw: 400 },
    { display: 'Fraunces', dw: 900, support: 'Hanken Grotesk', sw: 400 },
    { display: 'DM Serif Display', dw: 400, support: 'DM Sans', sw: 400 },
  ],
  grotesk: [
    { display: 'Archivo', dw: 900, support: 'Inter', sw: 500 },
    { display: 'Space Grotesk', dw: 700, support: 'Inter Tight', sw: 500 },
    { display: 'Familjen Grotesk', dw: 700, support: 'Onest', sw: 400 },
    { display: 'Sora', dw: 800, support: 'Onest', sw: 400 },
  ],
  rounded: [
    { display: 'Quicksand', dw: 700, support: 'Onest', sw: 400 },
    { display: 'Plus Jakarta Sans', dw: 800, support: 'DM Sans', sw: 400 },
    { display: 'Outfit', dw: 800, support: 'Inter', sw: 400 },
  ],
  mono: [
    { display: 'Chakra Petch', dw: 700, support: 'IBM Plex Mono', sw: 400 },
    { display: 'Space Grotesk', dw: 700, support: 'Space Mono', sw: 400 },
  ],
  condensed: [
    { display: 'Oswald', dw: 700, support: 'Barlow', sw: 400 },
    { display: 'Big Shoulders Display', dw: 900, support: 'Familjen Grotesk', sw: 500 },
    { display: 'Archivo', dw: 900, support: 'Barlow', sw: 400 },
  ],
  display: [
    { display: 'Unbounded', dw: 800, support: 'Space Grotesk', sw: 500 },
    { display: 'Bricolage Grotesque', dw: 800, support: 'DM Sans', sw: 400 },
    { display: 'Anton', dw: 400, support: 'Inter', sw: 500 },
  ],
}
// mono legible para NUMEROS (regla dura del repo: un dato jamas en fuente script/manuscrita)
const NUM_FONT = { 'IBM Plex Mono': 1, 'Space Mono': 1, 'JetBrains Mono': 1, 'DM Mono': 1 }

// ---------------------------------------------------------------- derivacion
// deriveLook(pagemodel, seed) -> look congelado para TODO el video
export function deriveLook(pm, seed) {
  const r = seedFor(seed, 'dir.look')
  const dna = pm.dna
  const mod = (dna.modernidad || []).slice(0, 2)          // tope de 2 lenguajes (3 = slop)
  const acro = chroma(dna.palette.accent) < 0.12

  // --- PLACA ---
  const placa = weightedPick(r, PLACAS, id => pesoPlaca(id, dna))
  const hAcc = hexToHsl(dna.palette.accent).h
  // brutalist fuerza claro/duro; editorial-photo prefiere oscuro para que la foto mande
  const forzarClaro = mod.indexOf('brutalist') >= 0 && r() < 0.6
  const P = placaColors(placa, hAcc, acro, r, forzarClaro)

  // --- ACENTO: el de la marca, garantizado legible sobre la placa (DNA-SPEC §3.3) ---
  let accent = dna.palette.accent
  if (acro) {
    // marca acromatica (Apple/Vercel-like): NO inventamos un color -> acento neutro de alto contraste
    accent = P.dark ? '#f2f0ea' : '#161310'
  } else if (contrast(accent, P.bg0) < 2.2) {
    accent = ensureContrast(accent, P.bg0, 2.6)            // el acento debe VERSE sobre su placa
  }
  const onAccent = legibleOn(accent)
  // accent2 (DNA-SPEC §3.4): del pagemodel si vino, si no derivado por rotacion de hue
  let accent2 = dna.palette.accent2
  if (!accent2 || hueDist(hexToHsl(accent2).h, hAcc) < 12) {
    const dh = mod.indexOf('gradient-mesh') >= 0 ? 150 : range(r, 28, 62)
    const a = hexToHsl(accent)
    accent2 = acro ? P.dim : hslToHex(a.h + dh, clamp(a.s * 0.9, 0.25, 0.9), clamp(a.l + range(r, -0.08, 0.08), 0.28, 0.68))
  }

  // --- TIPOGRAFIA ---
  const clase = PAIRINGS[dna.typography.displayHint] ? dna.typography.displayHint : 'grotesk'
  const par = pick(r, PAIRINGS[clase])
  const caseMode = mod.indexOf('brutalist') >= 0 ? 'upper' : dna.typography.caseHint
  const bigK = mod.indexOf('bigtype') >= 0 ? 1.18 : 1                 // DNA-SPEC §4.2
  const fuenteNum = NUM_FONT[par.support] ? par.support : 'IBM Plex Mono'

  // --- FORMA (heredada de la pagina, endurecida por brutalist) ---
  const brut = mod.indexOf('brutalist') >= 0
  const radius = brut ? Math.min(4, dna.shape.radius) : clamp(dna.shape.radius, 0, 28)
  const borde = brut ? 'bold' : dna.shape.borderStyle
  const sombra = brut ? 'hard' : dna.shape.shadowStyle

  // --- RITMO / DENSIDAD / ORNAMENTO (continuos: anti-huella) ---
  const margen = dna.density === 'aireado' ? range(r, 0.10, 0.14) : dna.density === 'denso' ? range(r, 0.055, 0.085) : range(r, 0.075, 0.11)
  const orn = brut ? 'corners' : pick(r, ['line', 'line', 'corners', 'dots'])
  const grano = pick(r, [0.03, 0.04, 0.05, 0.055])
  const luzAng = pick(r, [-2.35, -1.57, -0.79])                        // UNA luz por video (DIRECCION-DE-ARTE P2)

  return {
    v: 1,
    placa, ...P,
    accent, accent2, onAccent, acromatica: acro,
    fonts: { display: par.display, dw: par.dw, support: par.support, sw: par.sw, num: fuenteNum, clase },
    caseMode, bigK, tracking: range(r, -0.3, 2.4),
    radius, borde, sombra,
    margen, orn, grano, luzAng,
    modernidad: mod,
    energia: dna.mood.energia, formalidad: dna.mood.formalidad,
  }
}

// colores concretos de cada familia de placa. Las tintas se TIÑEN (nunca el mismo hex en dos videos).
function placaColors(placa, hAcc, acro, r, forzarClaro) {
  const tint = (h, s, l) => hslToHex(h, acro ? Math.min(s, 0.04) : s, l)
  if (placa === 'crema' || placa === 'papel' || forzarClaro) {
    const calido = placa === 'papel' || forzarClaro
    const h = calido ? range(r, 30, 52) : hAcc + range(r, -18, 18)
    return {
      dark: false,
      bg0: tint(h, calido ? range(r, 0.10, 0.20) : range(r, 0.03, 0.10), range(r, 0.915, 0.965)),
      bg1: tint(h, calido ? range(r, 0.12, 0.22) : range(r, 0.04, 0.12), range(r, 0.86, 0.91)),
      ink: tint(h + range(r, -14, 14), range(r, 0.05, 0.22), range(r, 0.06, 0.12)),
      dim: tint(h, range(r, 0.04, 0.14), range(r, 0.36, 0.46)),
    }
  }
  const carbon = placa === 'carbon'
  const h = placa === 'tinta' ? hAcc : carbon ? range(r, 22, 40) : hAcc + range(r, -25, 25)
  const s0 = placa === 'tinta' ? range(r, 0.20, 0.32) : carbon ? range(r, 0.10, 0.20) : range(r, 0.04, 0.16)
  return {
    dark: true,
    bg0: tint(h, s0, placa === 'tinta' ? range(r, 0.065, 0.095) : range(r, 0.04, 0.075)),
    bg1: tint(h, s0 * 1.1, placa === 'tinta' ? range(r, 0.10, 0.14) : range(r, 0.075, 0.115)),
    ink: tint(h + range(r, -16, 16), range(r, 0.03, 0.14), range(r, 0.93, 0.975)),
    dim: tint(h, range(r, 0.03, 0.12), range(r, 0.55, 0.66)),
  }
}
