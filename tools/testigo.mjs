// LA CAJA NEGRA. Anota cada pocos segundos que estaba haciendo la maquina, para que el proximo cuelgue
// deje evidencia en vez de una discusion.
//
// POR QUE EXISTE
// La PC de desarrollo se colgo tres veces en una noche. Se reviso el registro de Windows y quedaron dos
// causas posibles y ninguna probada: memoria agotada (16 GB, con Photoshop, OBS, Edge y SQL Server
// abiertos, el disponible ronda los 2.4 GB) o un cuelgue de la placa de video (RX 7600, y CERO eventos
// 4101/4104, o sea que el driver nunca llego a recuperarse). Los dos dan el MISMO sintoma: pantalla en
// negro, nada responde, y hay que apagar con el boton.
//
// El registro de Windows no sirve para distinguirlas, y por una razon simple: cuando la maquina se
// cuelga, deja de escribir. Lo ultimo que anota es de ANTES de que empiece el problema.
//
// Esto escribe cada 5 segundos y hace `fsync` en cada linea, asi que la ultima linea del archivo
// SOBREVIVE a un apagado por boton. Despues del cuelgue, esa linea dice cuanta memoria quedaba y que
// estaba corriendo. Con eso se decide, en vez de opinar:
//
//   - Si la memoria venia cayendo hasta cerca de cero -> era memoria.
//   - Si habia memoria de sobra y el ultimo renglon es normal -> no era memoria, y con OBS o el
//     navegador en la lista, el sospechoso es la placa de video.
//
// Cuesta practicamente nada: `os.freemem()` no reserva memoria, y la lista de procesos se pide cada 30
// segundos, no cada 5.
//
// Uso:  node tools/testigo.mjs            (dejarlo corriendo en una terminal aparte)
//       node tools/testigo.mjs --leer     (leer las ultimas lineas despues de un cuelgue)
import { openSync, writeSync, fsyncSync, readFileSync, existsSync, mkdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { freemem, totalmem, uptime } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ARCHIVO = join(HERE, 'out', 'testigo.log')

if (process.argv.includes('--leer')) {
  if (!existsSync(ARCHIVO)) {
    console.log('todavia no hay caja negra: corré `node tools/testigo.mjs` en una terminal aparte.')
    process.exit(0)
  }
  const lineas = readFileSync(ARCHIVO, 'utf8').trim().split('\n')
  console.log(`caja negra: ${lineas.length} renglones. Los ultimos 25 (el ultimo es el instante previo al cuelgue):\n`)
  for (const l of lineas.slice(-25)) console.log('  ' + l)
  process.exit(0)
}

mkdirSync(dirname(ARCHIVO), { recursive: true })
const fd = openSync(ARCHIVO, 'a')
const anotar = (s) => { writeSync(fd, s + '\n'); fsyncSync(fd) }   // fsync: la ultima linea tiene que sobrevivir

const totalMb = Math.round(totalmem() / 1048576)
anotar(`\n===== testigo arranca · uptime ${Math.round(uptime() / 60)} min · RAM total ${totalMb} MB =====`)
console.log(`anotando en ${ARCHIVO} cada 5 s. Dejalo corriendo. Despues de un cuelgue: node tools/testigo.mjs --leer`)

let vuelta = 0
let top = ''
setInterval(() => {
  const libre = Math.round(freemem() / 1048576)
  // La lista de procesos cada 30 s: es lo unico que cuesta algo, y no cambia cada 5 segundos.
  if (vuelta++ % 6 === 0) {
    try {
      top = execFileSync('powershell', ['-NoProfile', '-Command',
        'Get-Process | Sort-Object WorkingSet -Descending | Select-Object -First 4 | '
        + 'ForEach-Object { "$($_.ProcessName):$([int]($_.WorkingSet/1MB))" }'],
      { encoding: 'utf8', timeout: 10000 }).trim().split(/\s*\r?\n\s*/).join(' ')
    } catch { top = '(no se pudo leer la lista de procesos — sintoma en si mismo)' }
  }
  const t = new Date().toTimeString().slice(0, 8)
  anotar(`${t}  libre ${String(libre).padStart(6)} MB de ${totalMb}   ${top}`)
}, 5000)
