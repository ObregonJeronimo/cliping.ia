// GATE director-independence (codigo E-INDEP) — el motor Director NO puede depender de NADA ajeno.
// Regla del proyecto (docs/MOTOR-DIRECTOR.md §0.1): las skills externas (GSAP/design-dna/genjutsu)
// son MAESTROS de tiempo-de-desarrollo; su conocimiento vive destilado en docs/director/*.md y en
// NUESTRO codigo. Si manana desaparecen o se vuelven pagas, el motor sigue igual.
// El gate falla si en src/director/ aparece cualquier import fuera de la whitelist.
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const DIR = join(ROOT, 'src', 'director')

// UNICOS imports permitidos desde src/director:
//  · relativos dentro del propio motor           ('./', '../core/', ...)
//  · el catalogo compartido de objetos heroe     ('src/shared/objects.js' — puro, con inyeccion de deps)
//  · react / react-dom SOLO en archivos .jsx de UI (el motor en si no los toca)
const WHITELIST_BARE = new Set(['react', 'react-dom', 'react/jsx-runtime'])
const SHARED_OK = /(^|\/)\.\.\/shared\/objects\.js$/

function walk(dir, out = []) {
  if (!existsSync(dir)) return out
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.(js|jsx|mjs)$/.test(name)) out.push(p)
  }
  return out
}

const files = walk(DIR)
if (!files.length) { console.log('GATE INDEPENDENCE OK (src/director aun no tiene archivos).'); process.exit(0) }

const IMPORT_RE = /(?:^|\n)\s*(?:import|export)[\s\S]*?from\s+['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|require\s*\(\s*['"]([^'"]+)['"]\s*\)/g
const bad = []
let checked = 0
for (const f of files) {
  const rel = relative(ROOT, f).replace(/\\/g, '/')
  const src = readFileSync(f, 'utf-8')
  const isUI = /\.jsx$/.test(f)
  let m
  IMPORT_RE.lastIndex = 0
  while ((m = IMPORT_RE.exec(src))) {
    const spec = m[1] || m[2] || m[3]
    if (!spec) continue
    checked++
    if (spec.startsWith('.')) {
      const norm = spec.replace(/\\/g, '/')
      // relativo: solo dentro del motor o al catalogo compartido
      if (norm.indexOf('/urvid/') >= 0 || norm.indexOf('/kinetic/') >= 0 || /^\.\.\/\.\.\//.test(norm) && !SHARED_OK.test(norm)) {
        if (!SHARED_OK.test(norm)) bad.push(`${rel}: import PROHIBIDO de otro motor -> '${spec}'`)
      }
      continue
    }
    // bare import (paquete de node_modules)
    if (WHITELIST_BARE.has(spec)) {
      if (!isUI) bad.push(`${rel}: '${spec}' solo esta permitido en archivos .jsx de UI`)
      continue
    }
    if (spec.startsWith('http')) { bad.push(`${rel}: import por URL prohibido -> '${spec}'`); continue }
    bad.push(`${rel}: dependencia EXTERNA prohibida -> '${spec}'`)
  }
  // css modules de la UI: permitidos solo en .jsx (no son codigo del motor)
  if (!isUI && /\.module\.css/.test(src)) bad.push(`${rel}: css fuera de la UI`)
}

if (bad.length) {
  console.error('FALLAS DE INDEPENDENCIA (E-INDEP):')
  for (const b of bad) console.error('  - ' + b)
  console.error(`\nGATE INDEPENDENCE FALLO (${bad.length}). El motor Director debe ser 100% nuestro.`)
  process.exit(1)
}
console.log(`GATE INDEPENDENCE OK (${files.length} archivos, ${checked} imports: solo internos + shared/objects + react en UI).`)
