// CUENTA LA AUDITORIA — porque un numero copiado a mano vuelve a mentir.
//
// `docs/AUDITORIA-MOTOR.md` lleva su propio aviso en el encabezado: el contador YA MINTIO una vez (se
// tildaron 6 casillas para 5 trabajos, porque una nota de seguimiento tenia el mismo formato que un
// hallazgo). La respuesta a eso fue una regla de formato, y funciono — pero el numero seguia escrito a
// mano y ademas repetido en `docs/HANDOFF-JERO.md`, que quedo diciendo "36 abiertos / 64 cerrados"
// cuando ya eran 29 / 74. Dos copias de un numero son dos numeros distintos en cuanto alguien cierra
// un hallazgo.
//
// Esto lo calcula. Y sobre todo lo DESGLOSA, que es lo que hace falta para contestar "¿cuanto falta?":
// de los abiertos, mas de la mitad no son defectos del motor sino objeciones de los criticos al plan de
// la auditoria, compuertas propuestas, o los dos temas EXTRA que Thiago reservo para charlar.
//
// Uso:  node tools/auditoria-conteo.mjs
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const L = readFileSync(join(RAIZ, 'docs', 'AUDITORIA-MOTOR.md'), 'utf8').split(/\r?\n/)

// LA REGLA DE CONTEO ES LA DEL DOCUMENTO, no una propia: una fila `- [ ] **archivo:linea**` es UN
// hallazgo; una que empieza con `- SEGUIMIENTO` es una nota sobre otro y NO se cuenta.
const ABIERTO = /^- \[ \] \*\*(.+?)\*\*/
const CERRADO = /^- \[x\] \*\*(.+?)\*\*/i

let sec = ''
const abiertos = []
let cerrados = 0, seguimientos = 0
for (const l of L) {
  if (l.startsWith('## ')) sec = l.slice(3).trim()
  if (l.startsWith('- SEGUIMIENTO')) { seguimientos++; continue }
  const a = l.match(ABIERTO)
  if (a) { abiertos.push({ sec, t: a[1] }); continue }
  if (CERRADO.test(l)) cerrados++
}

const clase = ({ sec, t }) => (
  sec.startsWith('Correcciones') ? 'objecion al plan'
    : t.startsWith('EXTRA') ? 'EXTRA (reservado)'
      : t.startsWith('E-PATRON') ? 'compuerta propuesta'
        : 'defecto del motor')

const grupos = new Map()
for (const h of abiertos) {
  const c = clase(h)
  if (!grupos.has(c)) grupos.set(c, [])
  grupos.get(c).push(h.t)
}

const total = abiertos.length + cerrados
console.log(`AUDITORIA: ${abiertos.length} abiertos · ${cerrados} cerrados · ${total} en total`)
console.log(`  (${seguimientos} notas de SEGUIMIENTO, que por regla del documento no se cuentan)`)
console.log('')
const orden = ['defecto del motor', 'objecion al plan', 'compuerta propuesta', 'EXTRA (reservado)']
for (const c of orden) {
  const g = grupos.get(c) || []
  if (!g.length) continue
  console.log(`  ${String(g.length).padStart(3)}  ${c}`)
  if (c === 'defecto del motor') for (const t of g) console.log(`       · ${t.slice(0, 76)}`)
}
const reales = (grupos.get('defecto del motor') || []).length
console.log('')
console.log(`Lo accionable de verdad son ${reales}: el resto son opiniones sobre el plan de la auditoria,`)
console.log('compuertas que habria que escribir, y los dos temas que Thiago pidio charlar antes.')
