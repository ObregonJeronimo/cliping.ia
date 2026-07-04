// kinetic 1.0 · VOCES TIPOGRAFICAS — pares display+support CURADOS. Los pesos estan HORNEADOS por par y
// verificados contra la interseccion de index.html (browser) y tools/fonts/*.ttf (Node) -> cero faux-bold,
// cero divergencia contact-sheet/export. `alt` = peso alternativo del display (para ritmo de pesos); si no
// hay, el par no soporta crescendo. mood = punto de afinidad {calidez, formalidad, energia} para el sampler.
export const FONT_PAIRS = [
  { id: 'brutal-mono', display: 'Anton', dw: 400, alt: null, support: 'Space Mono', sw: 400, mood: [0.2, 0.5, 0.9] },
  { id: 'suizo', display: 'Archivo', dw: 900, alt: 600, support: 'Inter', sw: 500, mood: [0.3, 0.7, 0.6] },
  { id: 'editorial', display: 'Fraunces', dw: 900, alt: 600, support: 'Hanken Grotesk', sw: 400, mood: [0.5, 0.8, 0.4] },
  { id: 'serif-drama', display: 'Playfair Display', dw: 900, alt: 700, support: 'Newsreader', sw: 400, mood: [0.6, 0.9, 0.3] },
  { id: 'tech', display: 'Chakra Petch', dw: 700, alt: 500, support: 'IBM Plex Mono', sw: 400, mood: [0.2, 0.6, 0.8] },
  { id: 'humano', display: 'Caveat', dw: 700, alt: 600, support: 'DM Sans', sw: 400, mood: [0.9, 0.2, 0.5] },
  { id: 'condensado', display: 'Oswald', dw: 700, alt: 500, support: 'Barlow', sw: 400, mood: [0.3, 0.6, 0.7] },
  { id: 'redondo', display: 'Quicksand', dw: 700, alt: 500, support: 'Onest', sw: 400, mood: [0.8, 0.3, 0.5] },
  { id: 'display-pop', display: 'Bagel Fat One', dw: 400, alt: null, support: 'Plus Jakarta Sans', sw: 400, mood: [0.8, 0.2, 0.9] },
  { id: 'ancho', display: 'Unbounded', dw: 800, alt: 600, support: 'Space Grotesk', sw: 500, mood: [0.3, 0.5, 0.8] },
  { id: 'marcador', display: 'Permanent Marker', dw: 400, alt: null, support: 'Inter Tight', sw: 500, mood: [0.9, 0.1, 0.8] },
  { id: 'shoulders', display: 'Big Shoulders Display', dw: 900, alt: 700, support: 'Familjen Grotesk', sw: 500, mood: [0.2, 0.6, 0.9] },
  { id: 'bricolage', display: 'Bricolage Grotesque', dw: 800, alt: 500, support: 'DM Sans', sw: 400, mood: [0.5, 0.4, 0.6] },
  { id: 'sora', display: 'Sora', dw: 800, alt: 600, support: 'Onest', sw: 400, mood: [0.4, 0.6, 0.6] },
]

// VETOS duros (coherencia): pares que chirrian con ciertos moods -> el sampler re-samplea si caen aca.
export const FONT_VETO = (pair, mood) => {
  const [, formalidad] = mood
  if ((pair.id === 'marcador' || pair.id === 'humano' || pair.id === 'display-pop') && formalidad > 0.72) return true
  if ((pair.id === 'serif-drama' || pair.id === 'editorial') && mood[2] > 0.88) return true
  return false
}

// aplica caseMode del DNA a un string (sin italicas: no hay cargadas; el enfasis es por peso/caja)
export function applyCase(str, caseMode) {
  str = String(str == null ? '' : str)
  if (caseMode === 'upper') return str.toUpperCase()
  if (caseMode === 'title') return str.replace(/(^|\s)(\p{L})/gu, (m, a, b) => a + b.toUpperCase())
  return str
}
