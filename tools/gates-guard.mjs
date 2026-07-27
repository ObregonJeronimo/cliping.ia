// Corre `npm run gates` VIGILANDO la memoria, y mata cualquier proceso que se desboque.
//
// POR QUÉ EXISTE
// El 26 de julio de 2026 esta cadena colgó la máquina de desarrollo tres veces en un día: un solo
// script llegaba a 28 GB en una PC de 15, y había que apagar a la fuerza. La causa era una fuga de
// `getImageData` en @napi-rs/canvas (ver tools/lib/pixeles.mjs) que ya está arreglada — pero el
// problema de fondo es que un gate puede pedir memoria sin techo y llevarse puesto al sistema
// operativo, y ahí no hay stack trace ni exit code: hay un botón de encendido.
//
// Este envoltorio le pone un techo. Si un proceso lo cruza, lo mata y dice cuál era.
//
// Uso:  node tools/gates-guard.mjs [tope_MB]        (por defecto 8192)
import { spawn, execSync } from 'node:child_process'

const TOPE = Number(process.argv[2] || 8192)
const p = spawn('npm', ['run', 'gates'], { shell: true, stdio: ['ignore', 'pipe', 'pipe'] })

let pico = 0
let matados = 0
const reloj = setInterval(() => {
  try {
    const crudo = execSync(
      'powershell -NoProfile -Command "Get-Process node -ErrorAction SilentlyContinue | '
      + 'Select-Object Id,WorkingSet64 | ConvertTo-Json -Compress"', { encoding: 'utf8' }).trim()
    if (!crudo) return
    for (const q of [].concat(JSON.parse(crudo))) {
      const mb = Math.round(q.WorkingSet64 / 1048576)
      if (mb > pico) pico = mb
      if (mb > TOPE) {
        console.error(`\n!! gates-guard: matando pid ${q.Id} en ${mb} MB (tope ${TOPE})`)
        try { process.kill(q.Id) } catch { /* ya murió */ }
        matados++
      }
    }
  } catch { /* la consulta puede fallar entre procesos; no es motivo para abortar */ }
}, 1000)

let salida = ''
p.stdout.on('data', d => { salida += d; process.stdout.write(d) })
p.stderr.on('data', d => { salida += d; process.stderr.write(d) })
p.on('close', codigo => {
  clearInterval(reloj)
  const ok = (salida.match(/OK \(|OK:/g) || []).length
  const fail = (salida.match(/^FAIL|FALLO/gm) || []).length
  console.log(`\ngates-guard: ${ok} OK · ${fail} FAIL · pico ${pico} MB · ${matados} procesos matados · exit ${codigo}`)
  process.exit(matados ? 1 : codigo)
})
