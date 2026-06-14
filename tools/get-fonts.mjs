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

// [familia, query css2 (con pesos), slug archivo]
const FONTS = [
  ['Inter', 'Inter:wght@400;500;600;700;800', 'Inter'],
  ['Archivo Black', 'Archivo+Black', 'ArchivoBlack'],
  ['Anton', 'Anton', 'Anton'],
  ['Oswald', 'Oswald:wght@500;700', 'Oswald'],
  ['DM Serif Display', 'DM+Serif+Display', 'DMSerifDisplay'],
  ['Fraunces', 'Fraunces:opsz,wght@9..144,500;9..144,700', 'Fraunces'],
  ['Space Grotesk', 'Space+Grotesk:wght@500;700', 'SpaceGrotesk'],
  ['Space Mono', 'Space+Mono:wght@400;700', 'SpaceMono'],
  ['JetBrains Mono', 'JetBrains+Mono:wght@500;700', 'JetBrainsMono'],
  ['Permanent Marker', 'Permanent+Marker', 'PermanentMarker'],
  ['Caveat', 'Caveat:wght@600;700', 'Caveat'],
  ['Bricolage Grotesque', 'Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800', 'BricolageGrotesque'],
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
