// get-fonts.mjs — descarga TTFs de Google Fonts a tools/fonts/ para que el VISOR (Skia) y cualquier
// render local usen las fuentes REALES (no el fallback sans). Truco: pidiendo el CSS con un User-Agent
// viejo, Google sirve TTF (no woff2), que es lo que registra @napi-rs/canvas.
//
// Uso: node tools/get-fonts.mjs            -> baja la lista FONTS de abajo
// Reutilizable: edita FONTS (familia + query css2 + pesos) y volve a correr.
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = join(dirname(fileURLToPath(import.meta.url)), 'fonts')
mkdirSync(OUT, { recursive: true })

// [familia, query css2 (con pesos), slug archivo]. Cubre el set por estilo (display/text/accent) de los 12
// estilos + fuentes de los estilos nuevos. Reusable: agrega filas y volve a correr.
const FONTS = [
  // --- cuerpo / grotesque / geometric (caption-safe) ---
  ['Inter', 'Inter:wght@400;500;600;700;800', 'Inter'],
  ['Inter Tight', 'Inter+Tight:wght@500;700', 'InterTight'],
  ['Archivo', 'Archivo:wght@400;600;900', 'Archivo'],
  ['Hanken Grotesk', 'Hanken+Grotesk:wght@400;700', 'HankenGrotesk'],
  ['Familjen Grotesk', 'Familjen+Grotesk:wght@500;700', 'FamiljenGrotesk'],
  ['Space Grotesk', 'Space+Grotesk:wght@500;700', 'SpaceGrotesk'],
  ['Sora', 'Sora:wght@600;700;800', 'Sora'],
  ['Outfit', 'Outfit:wght@400;700;800', 'Outfit'],
  ['Plus Jakarta Sans', 'Plus+Jakarta+Sans:wght@400;700;800', 'PlusJakartaSans'],
  ['Onest', 'Onest:wght@400;600', 'Onest'],
  ['DM Sans', 'DM+Sans:wght@400;500;700', 'DMSans'],
  ['Barlow', 'Barlow:wght@400;600', 'Barlow'],
  ['Darker Grotesque', 'Darker+Grotesque:wght@700;900', 'DarkerGrotesque'],
  ['Quicksand', 'Quicksand:wght@500;700', 'Quicksand'],
  // --- condensed / athletic / wide display ---
  ['Anton', 'Anton', 'Anton'],
  ['Oswald', 'Oswald:wght@500;700', 'Oswald'],
  ['Big Shoulders Display', 'Big+Shoulders+Display:wght@700;900', 'BigShouldersDisplay'],
  // --- serif (editorial + humanist) ---
  ['Fraunces', 'Fraunces:opsz,wght@9..144,600;9..144,900', 'Fraunces'],
  ['Playfair Display', 'Playfair+Display:wght@700;900', 'PlayfairDisplay'],
  ['Newsreader', 'Newsreader:wght@400;600', 'Newsreader'],
  ['Spectral', 'Spectral:ital,wght@0,400;1,400', 'Spectral'],
  // --- mono / technical ---
  ['JetBrains Mono', 'JetBrains+Mono:wght@400;700', 'JetBrainsMono'],
  ['IBM Plex Mono', 'IBM+Plex+Mono:wght@400;600', 'IBMPlexMono'],
  ['Space Mono', 'Space+Mono:wght@400;700', 'SpaceMono'],
  // --- display / expressive / retro ---
  ['Bricolage Grotesque', 'Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800', 'BricolageGrotesque'],
  ['Unbounded', 'Unbounded:wght@600;800', 'Unbounded'],
  ['Caprasimo', 'Caprasimo', 'Caprasimo'],
  ['Righteous', 'Righteous', 'Righteous'],
  ['Bagel Fat One', 'Bagel+Fat+One', 'BagelFatOne'],
  ['Chakra Petch', 'Chakra+Petch:wght@500;700', 'ChakraPetch'],
  // --- script / handmade ---
  ['Caveat', 'Caveat:wght@600;700', 'Caveat'],
  ['Permanent Marker', 'Permanent+Marker', 'PermanentMarker'],
]

// UA tipo Wget -> Google sirve TTF (no woff2), que es lo que registra @napi-rs/canvas (Skia)
const UA = 'Wget/1.20'

async function cssFor(query) {
  const url = `https://fonts.googleapis.com/css2?family=${query}`
  const r = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!r.ok) throw new Error(`css ${query}: ${r.status}`)
  return r.text()
}

function ttfUrls(css) {
  // bloques @font-face: capturamos weight + url ttf
  const out = []
  const re = /font-weight:\s*(\d+);[\s\S]*?src:\s*url\((https:\/\/[^)]+\.ttf)\)/g
  let m
  while ((m = re.exec(css))) out.push({ weight: m[1], url: m[2] })
  // fallback: si no hay font-weight (fuentes de 1 solo peso), capturar urls sueltas
  if (!out.length) { const re2 = /url\((https:\/\/[^)]+\.ttf)\)/g; let m2; while ((m2 = re2.exec(css))) out.push({ weight: '400', url: m2[1] }) }
  return out
}

let ok = 0, fail = 0
for (const [family, query, slug] of FONTS) {
  try {
    const css = await cssFor(query)
    const urls = ttfUrls(css)
    if (!urls.length) { console.log('!! no ttf for', family); fail++; continue }
    for (const { weight, url } of urls) {
      const fp = join(OUT, `${slug}-${weight}.ttf`)
      if (existsSync(fp)) { ok++; continue }
      const rr = await fetch(url)
      const buf = Buffer.from(await rr.arrayBuffer())
      writeFileSync(fp, buf)
      ok++
    }
    console.log('ok', family, `(${urls.length} pesos)`)
  } catch (e) { console.log('FAIL', family, e.message); fail++ }
}
console.log(`\n${ok} archivos en tools/fonts/, ${fail} fallos`)
