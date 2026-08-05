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
import { openSync, writeSync, fsyncSync, readFileSync, writeFileSync, unlinkSync, existsSync, mkdirSync } from 'node:fs'
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
  // UNA LECTURA, NO UN VOLCADO. Con dos cuidados que se aprendieron leyendo mal la primera vez:
  //
  //   1) Los renglones marcados (VIEJO) se DESCARTAN para la conclusion. Son valores congelados de
  //      cuando la consulta todavia respondia, y tomarlos por actuales me hizo escribir "no fue
  //      memoria" sobre un cuelgue que SI fue memoria — habia un node con 18,6 GB comprometidos.
  //   2) Se mira una ventana de ~3 minutos, no los ultimos diez renglones: una fuga que sube rapido
  //      deja los ultimos renglones ya congelados por la agonia de la maquina.
  const filas = lineas.filter(l => /^\d\d:\d\d:\d\d/.test(l))
  const datos = filas.map((l) => {
    const m = l.match(/libre\s+(\d+)\s+MB\s+comprometida\s+(\d+)\/(\d+)/)
    return m ? { libre: +m[1], comp: +m[2], compTotal: +m[3], viejo: l.includes('(VIEJO)'), linea: l } : null
  }).filter(Boolean)
  const frescos = datos.filter(d => !d.viejo)
  console.log('\n─── lectura ───')
  if (!frescos.length) {
    console.log('  Ningun renglon con medicion fresca: la consulta a Windows no respondio en toda la ventana.')
    console.log('  ESO YA ES UNA SENAL: bajo presion de memoria PowerShell es lo primero que deja de arrancar.')
  } else {
    const fin = frescos.slice(-90)                       // ~3 min a 2 s por renglon
    const minLibre = Math.min(...fin.map(d => d.libre))
    const peor = fin.reduce((a, d) => (d.comp > a.comp ? d : a), fin[0])
    const pct = Math.round((peor.comp / peor.compTotal) * 100)
    console.log(`  RAM fisica libre, minimo: ${minLibre} MB`)
    console.log(`  Memoria COMPROMETIDA, maximo: ${peor.comp} de ${peor.compTotal} MB (${pct}%)`)
    console.log('  Y en ese instante, los que mas comprometian:')
    const cola = peor.linea.replace(/^.*?comprometida \S+( \(VIEJO\))?\s+/, '')
    for (const parte of cola.split('||')) console.log(`     ${parte.trim()}`)
    const descartados = datos.length - frescos.length
    if (descartados) console.log(`  (se descartaron ${descartados} renglones con valores VIEJOS)`)
    if (pct > 85) console.log('\n  >>> FUE MEMORIA. Arriba esta el proceso que la pidio, con su linea de comando.')
    else if (minLibre < 500) console.log('\n  >>> FUE MEMORIA: se agoto la RAM fisica.')
    else console.log('\n  >>> Hasta el ultimo dato FRESCO habia memoria de sobra.\n'
      + '      Ojo: si los ultimos renglones estan marcados (VIEJO), la maquina ya estaba agonizando y\n'
      + '      este dato es de ANTES del problema. Mira la hora del ultimo renglon fresco.')
  }
  process.exit(0)
}

// ---------------------------------------------------------------- modo grabacion
// UNO SOLO A LA VEZ. Con dos instancias las lineas se intercalan y cada una escribe SU valor de
// memoria comprometida, asi que el archivo alterna entre dos cifras distintas y no se entiende nada.
// Paso el 5/8 y costo una lectura equivocada del cuelgue.
mkdirSync(dirname(ARCHIVO), { recursive: true })
const SENAL = join(HERE, 'out', '.testigo.pid')
if (existsSync(SENAL)) {
  const otro = Number(readFileSync(SENAL, 'utf8').trim())
  let vive = false
  try { process.kill(otro, 0); vive = true } catch { vive = false }
  if (vive) {
    console.log(`Ya hay un testigo corriendo (pid ${otro}). No arranco un segundo: dos escribiendo el`)
    console.log('mismo archivo lo vuelven ilegible. Si querés reiniciarlo, cerrá la otra terminal.')
    process.exit(0)
  }
}
writeFileSync(SENAL, String(process.pid))
const soltarSenal = () => { try { unlinkSync(SENAL) } catch { /* ya no esta */ } }
process.on('exit', soltarSenal)
for (const sg of ['SIGINT', 'SIGTERM', 'SIGBREAK']) process.on(sg, () => { soltarSenal(); process.exit(0) })
const fd = openSync(ARCHIVO, 'a')
// `fsync` en cada linea: sin esto el buffer del sistema se lleva los ultimos renglones, que son los
// unicos que importan cuando la maquina muere sin avisar.
const anotar = (s) => { try { writeSync(fd, s + '\n'); fsyncSync(fd) } catch { /* no romper por un log */ } }

const totalMb = Math.round(totalmem() / 1048576)
anotar(`\n===== TESTIGO ARRANCA · ${new Date().toISOString()} · ${hostname()} · RAM ${totalMb} MB · `
  + `la maquina lleva ${Math.round(uptime() / 60)} min prendida =====`)

let comp = '?', compTotal = '?', top = '(midiendo...)', viejo = false
// SE PIDE LA LINEA DE COMANDO, no solo el nombre del programa. Un renglon que dice `node:18618` cuenta
// que node comprometio 18,6 GB y NO cuenta cual de los veinte scripts del repo era. Paso exactamente
// eso el 5/8: quedo identificado como "node" y nada mas, y sin eso no se puede arreglar la fuga.
//
// Ademas se ordena por `PageFileUsage` (lo COMPROMETIDO) y no por lo residente: el que cuelga la
// maquina es el que compromete, no el que tiene paginas calientes.
const CONSULTA = [
  '$os = Get-CimInstance Win32_OperatingSystem;',
  // Comprometida = RAM + paginacion, menos lo libre. Es el numero del que habla el evento 2004.
  '$tv = [int]($os.TotalVirtualMemorySize/1KB); $fv = [int]($os.FreeVirtualMemory/1KB);',
  '$p = Get-CimInstance Win32_Process | Sort-Object PageFileUsage -Descending | Select-Object -First 5;',
  '$d = $p | ForEach-Object { $c = [string]$_.CommandLine; if ($c.Length -gt 64) { $c = $c.Substring(0,64) };',
  '"$($_.Name):$([int]($_.PageFileUsage/1KB))MB $c" };',
  '"$($tv-$fv)|$tv|" + ($d -join " || ")',
].join(' ')

const medirPesado = () => {
  try {
    const crudo = execFileSync('powershell', ['-NoProfile', '-Command', CONSULTA],
      // 60 s, no 20: bajo presion de memoria arrancar PowerShell puede tardar una eternidad, y un
      // timeout corto convierte "la maquina esta agonizando" en "no se pudo leer", perdiendo el dato.
      { encoding: 'utf8', timeout: 60000 }).trim()
    // SE PARTE EN LOS DOS PRIMEROS SEPARADORES Y NADA MAS. `crudo.split('|')` partia tambien por los
    // `||` que separan los procesos, asi que se perdian cuatro de los cinco culpables — y el que
    // sobrevivia era el primero, no el que mas comprometia. Un instrumento que tira justo la evidencia.
    const i1 = crudo.indexOf('|')
    const i2 = crudo.indexOf('|', i1 + 1)
    comp = crudo.slice(0, i1)
    compTotal = crudo.slice(i1 + 1, i2)
    top = crudo.slice(i2 + 1).trim()
    viejo = false
  } catch (e) {
    // NO SE PISA EL ULTIMO VALOR BUENO, PERO SE MARCA COMO VIEJO. Repetir un numero de hace cuatro
    // minutos como si fuera de ahora fue lo que me hizo leer mal el cuelgue del 5/8: la lectura decia
    // "no fue memoria" mirando una cifra congelada. Y que la consulta falle es, en si mismo, la senal
    // mas fuerte de que la maquina esta en problemas: bajo presion PowerShell es lo primero que muere.
    viejo = true
    top = `[consulta caida: ${String(e.message).split('\n')[0].slice(0, 40)}] ${String(top).replace(/^\[[^\]]*\]\s*/, '')}`
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
  anotar(`${t}  libre ${String(libre).padStart(6)} MB   comprometida ${comp}/${compTotal} MB${viejo ? ' (VIEJO)' : ''}   ${top}`)
}, 2000)
