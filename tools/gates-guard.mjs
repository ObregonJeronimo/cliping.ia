// Corre `npm run gates` VIGILANDO la memoria, y corta antes de que la maquina se cuelgue.
//
// POR QUÉ EXISTE
// El 26 de julio de 2026 esta cadena colgó la máquina de desarrollo tres veces en un día: un solo
// script llegaba a 28 GB en una PC de 15, y había que apagar a la fuerza. La causa era una fuga de
// `getImageData` en @napi-rs/canvas (ver tools/lib/pixeles.mjs) que ya está arreglada — pero el
// problema de fondo es que un gate puede pedir memoria sin techo y llevarse puesto al sistema
// operativo, y ahí no hay stack trace ni exit code: hay un botón de encendido.
//
// Y VOLVIÓ A PASAR EL 4 DE AGOSTO DE 2026, con este guard corriendo. Los tres agujeros por los que se
// coló están documentados con el log en `tools/lib/memoria.mjs`: el vigilante muestreaba con
// PowerShell y se quedó CIEGO bajo presión de memoria (`FileLoadException` seis veces, tragado por un
// `catch {}`), miraba sólo procesos `node` —Chromium de Playwright era invisible— y ponía un tope POR
// PROCESO en vez de mirar la RAM libre del sistema.
//
// Ahora: `os.freemem()` —que no puede fallar por falta de memoria porque no reserva nada—, piso
// derivado de la RAM real de la máquina, se mata el ÁRBOL de procesos y no sólo el padre, y un fallo
// del muestreo aborta la corrida en vez de seguir a ciegas.
//
// Y TOMA EL CERROJO. Lo que disparó el cuelgue del 4 de agosto no fue el guard solo: fue el guard MÁS
// renders de `motor.py` en paralelo. Ahora el segundo no arranca.
//
// Uso:  node tools/gates-guard.mjs
import { spawn } from 'node:child_process'
import { vigilar, matarArbol, disponibleMb, pisoPara, MINIMO_ARRANQUE_MB } from './lib/memoria.mjs'
import { tomar } from './lib/cerrojo.mjs'

// NO SE ARRANCA CON LA MAQUINA YA AHOGADA. Media hora de compuertas para morir en el minuto 20 porque
// habia tres navegadores abiertos no le sirve a nadie, y ademas es indistinguible de un fallo real.
const disp = disponibleMb()
if (disp < MINIMO_ARRANQUE_MB) {
  console.error(`gates-guard: NO ARRANCA — quedan ${disp} MB de RAM disponible y hacen falta al menos `
    + `${MINIMO_ARRANQUE_MB}. Cerrá algunas aplicaciones y volvé a intentar.`)
  process.exit(2)
}

const cerrojo = tomar('gates:guard')
if (cerrojo.ocupado) {
  const { quien, pid, desde } = cerrojo.ocupado
  console.error(`gates-guard: NO ARRANCA — "${quien}" (pid ${pid}) tiene el cerrojo desde ${desde}.`)
  console.error('Dos corridas pesadas a la vez es lo que cuelga la maquina. Esperá a que termine.')
  process.exit(2)
}

// `gates:crudo` ES LA CADENA SIN VIGILAR, y se llama asi a proposito. Antes se llamaba `gates`, o sea
// que el comando mas natural de tipear —`npm run gates`— era el unico camino SIN cerrojo y SIN
// vigilante: toda la proteccion dependia de acordarse de escribir `gates:guard`. El CLAUDE.md avisaba
// que no se corriera `gates` pelado, y un aviso no protege a quien todavia no lo leyo (Thiago recien
// arranca con este motor). Ahora `npm run gates` ES el camino vigilado y la puerta sin cerrojo tiene un
// nombre que nadie escribe por reflejo.
const p = spawn('npm', ['run', 'gates:crudo'], { shell: true, stdio: ['ignore', 'pipe', 'pipe'] })

let cortadoPor = null
const ojo = vigilar((motivo) => {
  cortadoPor = motivo
  console.error(`\n!! gates-guard: ${motivo}`)
  matarArbol(p.pid)
})

let salida = ''
p.stdout.on('data', d => { salida += d; process.stdout.write(d) })
p.stderr.on('data', d => { salida += d; process.stderr.write(d) })
p.on('close', codigo => {
  ojo.parar()
  const ok = (salida.match(/OK \(|OK:/g) || []).length
  const fail = (salida.match(/^FAIL|FALLO/gm) || []).length
  console.log(`\ngates-guard: ${ok} OK · ${fail} FAIL · minimo de RAM libre ${ojo.libreMinMb} MB `
    + `(piso ${PISO_MB} de ${ojo.totalMb} totales) · exit ${codigo}`)
  if (cortadoPor) console.log(`gates-guard: CORTADO — ${cortadoPor}`)
  process.exit(cortadoPor ? 1 : codigo)
})
