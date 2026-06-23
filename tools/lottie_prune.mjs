// Saca del manifest.js los IDs de tools/lottie_blocklist.txt (curados a mano en el visor "Lotties").
// Exacto primero; para IDs que no matchean (truncados al copiar) intenta prefijo UNICO. Reescribe el manifest
// preservando el header generado. Uso: node tools/lottie_prune.mjs
import fs from 'node:fs'
import { pathToFileURL } from 'node:url'

const MAN = 'src/urvid/lottie/manifest.js'
const BL = 'tools/lottie_blocklist.txt'

const data = (await import(pathToFileURL(MAN).href)).default
const items = data.items

const want = new Set(
  fs.readFileSync(BL, 'utf8').split(/\r?\n/).map(s => s.trim()).filter(s => s && !s.startsWith('#'))
)

let kept = [], removed = []
for (const it of items) (want.has(it.id) ? removed : kept).push(it)
const foundExact = new Set(removed.map(r => r.id))
const notFound = [...want].filter(id => !foundExact.has(id))

const prefixHit = [], ambiguous = [], missing = []
for (const nf of notFound) {
  const cands = kept.filter(it => it.id.startsWith(nf))
  if (cands.length === 1) { removed.push(cands[0]); kept = kept.filter(it => it !== cands[0]); prefixHit.push(`${cands[0].id}  (prefijo de "${nf}")`) }
  else if (cands.length > 1) ambiguous.push(`${nf} -> ${cands.length} candidatos`)
  else missing.push(nf)
}

const raw = fs.readFileSync(MAN, 'utf8')
const idx = raw.indexOf('export default')
const header = idx > 0 ? raw.slice(0, idx) : ''
const out = { version: data.version, count: kept.length, items: kept }
fs.writeFileSync(MAN, header + 'export default ' + JSON.stringify(out) + '\n')

console.log(`pedidos en blocklist: ${want.size}`)
console.log(`removidos exacto:     ${foundExact.size}`)
console.log(`removidos por prefijo:${prefixHit.length}`)
prefixHit.forEach(x => console.log('   +', x))
console.log(`AMBIGUOS (no tocados):${ambiguous.length}`)
ambiguous.forEach(x => console.log('   ?', x))
console.log(`NO ENCONTRADOS:       ${missing.length}`)
missing.forEach(x => console.log('   -', x))
console.log(`\nmanifest: ${items.length} -> ${kept.length}  (removidos ${items.length - kept.length})`)
