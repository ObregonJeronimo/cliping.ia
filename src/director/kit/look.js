// director · LOOK — el DNA de la pagina (medido) + el seed se convierten UNA vez por video en la
// direccion de arte concreta: placas, tintas, tipografia, forma, ornamento y sesgos de modernidad.
// Es el equivalente al "Style DNA" que ya probamos en kinetic, pero ALIMENTADO POR LA PAGINA REAL
// (DNA-SPEC §4: que se hereda y que no) en vez de por puro azar.
//
// Regla anti-huella (DNA-SPEC §4.5, heredada de kinetic): nada visual puede ser CONSTANTE entre videos.
// Las tintas se tiñen, el tracking y los margenes son continuos, el ornamento y la placa varian por seed.
import { seedFor, weightedPick, range, pick, hashStr } from '../core/prng.js'
import { clamp, hexToHsl, hslToHex, chroma, lighten, darken, luminance, contrast, ensureContrast, ensureApca, apcaLc as apcaLcOf, legibleOn, hueDist } from '../core/util.js'
const esNum = v => typeof v === 'number' && Number.isFinite(v)

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
// ESCRITURA NO LATINA — nuestras 72 webfonts son latinas. Si la pagina esta en japones, chino, coreano,
// arabe, hebreo o devanagari, imponerles Archivo o Playfair da TOFU (cuadritos) en pantalla: el video
// sale ilegible aunque todos los demas chequeos pasen.
// La solucion honesta a costo cero es no pelear: se pide la Noto de esa escritura y se deja que la
// cadena CSS caiga al sans del sistema, que en cualquier dispositivo de esa region existe. Cambiamos
// "nuestra tipografia elegida" por "texto legible", que es la unica jerarquia correcta aca.
const FUENTE_ESCRITURA = {
  cjk: { display: 'Noto Sans JP', support: 'Noto Sans JP', dw: 800, sw: 500 },
  arabic: { display: 'Noto Sans Arabic', support: 'Noto Sans Arabic', dw: 700, sw: 400 },
  hebrew: { display: 'Noto Sans Hebrew', support: 'Noto Sans Hebrew', dw: 700, sw: 400 },
  devanagari: { display: 'Noto Sans Devanagari', support: 'Noto Sans Devanagari', dw: 700, sw: 400 },
}
// cirilico y griego SI los cubren varias de nuestras familias (Inter, Onest, Archivo): no se tocan.

// Un dato JAMAS en fuente script/manuscrita — esa es la regla dura del repo. Pero se implementaba
// forzando una MONOESPACIADA, y en mono el punto decimal ocupa un ancho completo: "3.8%" se dibujaba
// "3 . 8%" (visto en el reel real de Stripe). La regla correcta es la que estaba escrita: se usa la
// tipografia de apoyo del pairing salvo que sea manuscrita. En este catalogo ninguna lo es, asi que
// el forzado a mono no protegia de nada y solo rompia los decimales.
const SCRIPT_FONT = { Caveat: 1, 'Permanent Marker': 1, 'Bagel Fat One': 1, Caprasimo: 1 }

// ---------------------------------------------------------------- derivacion
// deriveLook(pagemodel, seed) -> look congelado para TODO el video
// huella ESTABLE de la pagina: entra al namespace del PRNG para que el stream dependa de QUE pagina
// es, no solo del seed. Sin esto, `seedFor(seed, 'dir.look')` daba el MISMO stream para un SaaS y para
// una parrilla: al seed por defecto (1) cinco paginas distintas salian con la misma placa, el mismo
// ornamento, la misma tipografia y el mismo encuadre — o sea que todo cliente que no tocara el seed
// publicaba la misma pieza. Solo cambiaban el acento y el objeto.
export const huellaDe = pm => hashStr([
  pm.brand, pm.url, pm.dna.palette.accent, pm.semantica.tipoNegocio, pm.semantica.modeloUso,
  (pm.dna.typography && pm.dna.typography.displayHint) || '',
].join('|')).toString(36)

export function deriveLook(pm, seed) {
  const r = seedFor(seed, 'dir.look:' + huellaDe(pm))
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
  // legibleOn decide blanco/negro con WCAG; sobre naranjas y amarillos elige blanco y APCA lo reprueba
  // (Lc 46). Elegimos el que gana en APCA y despues lo empujamos hasta el umbral de texto chico.
  const cands = [P.dark ? '#0b0b0d' : '#0c0a08', '#ffffff', legibleOn(accent)]
  let onAccent = cands[0], mejor = -1
  for (const cnd of cands) { const lc = Math.abs(apcaLcOf(cnd, accent)); if (lc > mejor) { mejor = lc; onAccent = cnd } }
  // 66 y no 62: el gate exige >= 62 y `ensureApca` corta en cuanto alcanza su objetivo, asi que
  // apuntar al umbral exacto deja casos que caen en 61.99 por redondeo. Quien produce apunta POR
  // ENCIMA del umbral de aceptacion; el margen no cuesta nada.
  onAccent = ensureApca(onAccent, accent, 66)
  // accent2 (DNA-SPEC §3.4): del pagemodel si vino, si no derivado por rotacion de hue
  let accent2 = dna.palette.accent2
  if (!accent2 || hueDist(hexToHsl(accent2).h, hAcc) < 12) {
    const dh = mod.indexOf('gradient-mesh') >= 0 ? 150 : range(r, 28, 62)
    const a = hexToHsl(accent)
    accent2 = acro ? P.dim : hslToHex(a.h + dh, clamp(a.s * 0.9, 0.25, 0.9), clamp(a.l + range(r, -0.08, 0.08), 0.28, 0.68))
  }

  // --- TIPOGRAFIA ---
  // La clase de la pagina SESGA, no encadena. Medido sobre 8 paginas reales (Stripe, Linear, Tailwind,
  // Basecamp, Ghost, MercadoLibre, awwwards y la nuestra): las 8 dan `grotesk`, y no es un fallo del
  // detector — Söhne, Inter y Proxima Nova son grotescas de verdad; el diseño web moderno es homogeneo.
  // Pero mapear 1:1 dejaba 4 de los 18 pares del catalogo en uso y 14 muertos: todos los reels con la
  // misma tipografia. Un reel NO es la pagina: DNA-SPEC ya dice que heredamos la CLASE, nunca la
  // webfont, y una pagina grotesca aguanta un titular display o condensado sin dejar de ser ella.
  // Los vecinos son los que NO traicionan la lectura de marca (una pagina seria nunca cae en rounded).
  const VECINAS = {
    grotesk: [['grotesk', 3], ['display', 1.4], ['condensed', 1.0]],
    serif: [['serif', 3], ['display', 1.2]],
    rounded: [['rounded', 3], ['grotesk', 1.2]],
    mono: [['mono', 3], ['condensed', 1.2]],
    condensed: [['condensed', 3], ['grotesk', 1.2], ['display', 1.0]],
  }
  const base = PAIRINGS[dna.typography.displayHint] ? dna.typography.displayHint : 'grotesk'
  const clase = weightedPick(r, (VECINAS[base] || VECINAS.grotesk).map(x => x[0]),
    n => (VECINAS[base] || VECINAS.grotesk).find(x => x[0] === n)[1])
  const par = pick(r, PAIRINGS[clase])
  const caseMode = mod.indexOf('brutalist') >= 0 ? 'upper' : dna.typography.caseHint
  const bigK = mod.indexOf('bigtype') >= 0 ? 1.18 : 1                 // DNA-SPEC §4.2
  let fuenteNum = SCRIPT_FONT[par.support] ? 'IBM Plex Mono' : par.support
  // la escritura manda sobre el pairing: primero que se LEA, despues el gusto tipografico
  const escritura = FUENTE_ESCRITURA[dna.typography.script]
  const parEff = escritura ? { ...par, ...escritura } : par
  if (escritura) fuenteNum = escritura.support

  // --- FORMA (heredada de la pagina, endurecida por brutalist) ---
  const brut = mod.indexOf('brutalist') >= 0
  const radius = brut ? Math.min(4, dna.shape.radius) : clamp(dna.shape.radius, 0, 28)
  const borde = brut ? 'bold' : dna.shape.borderStyle
  const sombra = brut ? 'hard' : dna.shape.shadowStyle

  // --- RITMO / DENSIDAD / ORNAMENTO (continuos: anti-huella) ---
  // DENSIDAD: comparaba `dna.density` (que desde el pagemodel.v1 es un OBJETO {nivel,score,fill,nodos})
  // contra strings, asi que las tres ramas eran una sola y todo lo que el backend media con una rejilla
  // de 64x45 celdas no llegaba nunca al video. Ahora entra por el CONTINUO `score`, que es mejor que
  // los tres baldes: una pagina apenas densa merece apenas menos aire, no un salto de categoria.
  // score 0 (pagina aireada) -> margen ancho · score 1 (pagina apretada) -> margen angosto.
  const dens = clamp(dna.density && esNum(dna.density.score) ? dna.density.score : 0.35, 0, 1)
  const margen = range(r, 0.135 - dens * 0.075, 0.155 - dens * 0.075)
  const orn = brut ? 'corners' : pick(r, ['line', 'line', 'corners', 'dots'])
  const grano = pick(r, [0.03, 0.04, 0.05, 0.055])
  const luzAng = pick(r, [-2.35, -1.57, -0.79])                        // UNA luz por video (DIRECCION-DE-ARTE P2)

  // TINTAS DE TEXTO: el acento y el gris secundario se validan con APCA CONTRA SU PLACA y se corrigen
  // si no llegan. Sin esto, un acento indigo sobre placa 'tinta' daba Lc 31 (ilegible en un telefono)
  // y el dato mas importante del video era el texto peor leido de la pieza.
  const accentTxt = ensureApca(accent, P.bg0, 66)
  const dim = ensureApca(P.dim, P.bg0, 68)

  return {
    v: 1,
    placa, ...P, dim,
    accent, accent2, accentTxt, onAccent, acromatica: acro,
    fonts: { display: parEff.display, dw: parEff.dw, support: parEff.support, sw: parEff.sw, num: fuenteNum, clase, escritura: dna.typography.script },
    caseMode, bigK, tracking: range(r, -0.3, 2.4),
    radius, borde, sombra,
    margen, orn, grano, luzAng, densidad: dens,
    modernidad: mod,
    energia: dna.mood.energia, formalidad: dna.mood.formalidad,
  }
}

// colores concretos de cada familia de placa. Las tintas se TIÑEN (nunca el mismo hex en dos videos).
// EXPORTADA porque el overlay de edicion (core/edits.js) permite cambiar la familia de placa sin
// recomponer el video: necesita ESTA derivacion y no una copia, o el fondo editado no seria el mismo
// fondo que produce deriveLook para esa familia.
export function placaColors(placa, hAcc, acro, r, forzarClaro) {
  const tint = (h, s, l) => hslToHex(h, acro ? Math.min(s, 0.04) : s, l)
  if (placa === 'crema' || placa === 'papel' || forzarClaro) {
    const calido = placa === 'papel' || forzarClaro
    const h = calido ? range(r, 30, 52) : hAcc + range(r, -18, 18)
    return {
      dark: false,
      bg0: tint(h, calido ? range(r, 0.12, 0.22) : range(r, 0.07, 0.16), range(r, 0.925, 0.965)),
      bg1: tint(h, calido ? range(r, 0.14, 0.26) : range(r, 0.06, 0.16), range(r, 0.795, 0.865)),
      ink: tint(h + range(r, -14, 14), range(r, 0.06, 0.24), range(r, 0.045, 0.10)),
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
