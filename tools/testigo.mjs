// LA CAJA NEGRA. Anota cada 2 segundos que esta haciendo la maquina, y la ultima linea SOBREVIVE a un
// apagado forzado con el boton.
//
// POR QUE VUELVE, y por que esta vez mide otra cosa:
//
//   La PC se colgo CINCO veces en dos dias. Windows deja anotado el agotamiento de memoria (evento
//   2004) y ahi aparecio `node.exe` con 42, 52, 58 y 60 GB — pero el vigilante del proyecto miraba
//   `os.freemem()`, o sea RAM FISICA disponible, y en esas mismas corridas informo "minimo 6423 MB
//   disponibles". Nunca vio nada. El numero que se estaba agotando era la memoria COMPROMETIDA (RAM +
//   archivo de paginacion), que es justo de la que habla Windows y justo la que no se miraba.
//
//   Y hay cuelgues que NINGUNA de las dos explica: el 5/8 la maquina se congelo **6 minutos despues de
//   arrancar**, practicamente en reposo. Para eso no alcanza con teorizar; hace falta ver el ultimo
//   instante.
//
// QUE ANOTA, y cuanto cuesta:
//
//   Cada 2 s (gratis, son llamadas del proceso al sistema): RAM fisica disponible y hace cuanto arranco
//   la maquina.
//   Cada 20 s (una consulta a Windows, ~0.2 s de CPU): memoria COMPROMETIDA usada y total, y los 5
//   procesos que mas piden — por memoria comprometida, no por la que tienen residente, porque el que
//   cuelga la maquina es el que COMPROMETE.
//
//   Cada linea se escribe con `fsync`, asi que la ultima llega al disco antes de que la maquina muera.
//   Sin eso, el cuelgue se lleva justo el renglon que importa.
//
// Uso:  npm run testigo          (dejalo corriendo en una terminal aparte)
//       npm run testigo -- --leer   (despues de un cuelgue: los ultimos renglones)
import { openSync, writeSync, fsyncSync, readFileSync, existsSync, mkdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { freemem, totalmem, uptime, hostname } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ARCHIVO = join(HERE, 'out', 'testigo.log')

// ---------------------------------------------------------------- modo lectura
if (process.argv.includes('--leer')) {
  if (!existsSync(ARCHIVO)) {
    console.log('Todavia no hay caja negra. Corré `npm run testigo` en una terminal aparte y dejalo abierto.')
    process.exit(0)
  }
  const lineas = readFileSync(ARCHIVO, 'utf8').trim().split('\n')
  console.log(`\nCaja negra: ${lineas.length} renglones.`)
  console.log('Los ultimos 30. EL ULTIMO ES EL INSTANTE ANTES DEL CUELGUE:\n')
  for (const l of lineas.slice(-30)) console.log('  ' + l)
  // Una lectura, no solo un volcado: lo que importa es si la memoria venia cayendo.
  const datos = lineas.map(l => l.match(/libre\s+(\d+)\s+MB.*?comprometida\s+(\d+)\/(\d+)/))
    .filter(Boolean).map(m => ({ libre: +m[1], comp: +m[2], compTotal: +m[3] }))
  if (datos.length >= 3) {
    const fin = datos.slice(-10)
    const minLibre = Math.min(...fin.map(d => d.libre))
    const maxComp = Math.max(...fin.map(d => d.comp))
    const totalComp = fin[fin.length - 1].compTotal
    console.log('\n─── lectura ───')
    console.log(`  RAM fisica libre, minimo de los ultimos renglones: ${minLibre} MB`)
    console.log(`  Memoria COMPROMETIDA, maximo: ${maxComp} de ${totalComp} MB (${Math.round(maxComp / totalComp * 100)}%)`)
    if (maxComp / totalComp > 0.92) console.log('  >>> LA COMPROMETIDA SE AGOTO: la causa fue memoria, y arriba esta quien la pidio.')
    else if (minLibre < 500) console.log('  >>> LA RAM FISICA SE AGOTO: la causa fue memoria.')
    else console.log('  >>> Habia memoria de sobra en el ultimo instante: NO fue memoria.\n'
      + '      Con la pantalla congelandose primero y despues perdiendo senal, el sospechoso pasa a ser\n'
      + '      la placa de video o la RAM defectuosa (que no da error, simplemente cuelga).')
  }
  process.exit(0)
}

// ---------------------------------------------------------------- modo grabacion
mkdirSync(dirname(ARCHIVO), { recursive: true })
const fd = openSync(ARCHIVO, 'a')
// `fsync` en cada linea: sin esto el buffer del sistema se lleva los ultimos renglones, que son los
// unicos que importan cuando la maquina muere sin avisar.
const anotar = (s) => { try { writeSync(fd, s + '\n'); fsyncSync(fd) } catch { /* no romper por un log */ } }

const totalMb = Math.round(totalmem() / 1048576)
anotar(`\n===== TESTIGO ARRANCA · ${new Date().toISOString()} · ${hostname()} · RAM ${totalMb} MB · `
  + `la maquina lleva ${Math.round(uptime() / 60)} min prendida =====`)

let comp = '?', compTotal = '?', top = '(midiendo...)'
const medirPesado = () => {
  try {
    const crudo = execFileSync('powershell', ['-NoProfile', '-Command',
      '$os = Get-CimInstance Win32_OperatingSystem; '
      // Comprometida = RAM + paginacion, menos lo libre. Es el numero del que habla el evento 2004.
      + '$tv = [int]($os.TotalVirtualMemorySize/1KB); $fv = [int]($os.FreeVirtualMemory/1KB); '
      + '"$($tv-$fv)|$tv|" + (((Get-Process | Sort-Object PagedMemorySize64 -Descending | Select-Object -First 5) '
      + '| ForEach-Object { "$($_.ProcessName):$([int]($_.PagedMemorySize64/1MB))" }) -join " ")'],
    { encoding: 'utf8', timeout: 20000 }).trim()
    const [c, ct, t] = crudo.split('|')
    comp = c; compTotal = ct; top = t || ''
  } catch (e) {
    // Que la consulta falle NO se ignora en silencio: bajo presion de memoria PowerShell es lo primero
    // que deja de funcionar, y ese fallo es en si mismo la senal mas fuerte de que algo va mal.
    top = `(la consulta a Windows FALLO: ${String(e.message).split('\n')[0].slice(0, 60)} — sintoma en si mismo)`
  }
}
medirPesado()

console.log(`Anotando en ${ARCHIVO} cada 2 s. Dejá esta terminal abierta.`)
console.log('Si se cuelga: prendé la PC y corré  npm run testigo -- --leer')

let vuelta = 0
setInterval(() => {
  if (vuelta % 10 === 0) medirPesado()            // 10 x 2 s = cada 20 s
  vuelta++
  const libre = Math.round(freemem() / 1048576)
  const t = new Date().toTimeString().slice(0, 8)
  anotar(`${t}  libre ${String(libre).padStart(6)} MB   comprometida ${comp}/${compTotal} MB   ${top}`)
}, 2000)
