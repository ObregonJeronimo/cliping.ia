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
import { vigilar, matarArbol, disponibleMb, MINIMO_ARRANQUE_MB, barrerHuerfanos } from './lib/memoria.mjs'
import { tomar } from './lib/cerrojo.mjs'
import { moderarCarga } from './lib/carga.mjs'

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

// Con el cerrojo en la mano, cualquier cadena viva es un huerfano de una corrida anterior que murio
// mal. Se barre antes de arrancar: si no, la corrida nueva compite por la RAM contra un fantasma.
const huerfanos = barrerHuerfanos()
if (huerfanos.length) {
  console.log(`gates-guard: habia ${huerfanos.length} proceso(s) huerfano(s) de una corrida anterior. Muertos:`)
  for (const h of huerfanos) console.log(`  pid ${h.pid} · ${h.cmd}`)
}

// LA CADENA SE PUEDE SUSTITUIR PARA PROBAR ESTE ARCHIVO, y hace falta: el informe final de abajo tenia
// una referencia a una constante que ya no se importaba, o sea un ReferenceError que solo aparece
// CUANDO TERMINA la corrida. Media hora de compuertas verdes para explotar en la ultima linea. Ni
// `node --check` ni una prueba de humo de 70 s lo tocan; con una cadena falsa de un segundo, si.
const CADENA = process.env.GUARD_CADENA || 'gates:crudo'
// MODERAR LA CARGA ANTES DE LANZAR NADA. La afinidad se hereda, asi que fijarla aca la reciben el
// hijo, los nietos y cada Chromium que abra Playwright. Ver la nota larga en lib/carga.mjs: la maquina
// venia de seis dias estables y se apago tres veces en 50 minutos bajo carga sostenida, sin pantalla
// azul y sin error de hardware — o sea, no fue memoria.
const carga = moderarCarga()
console.error(carga.ok
  ? `gates-guard: usando ${carga.usar} de ${carga.total} hilos y prioridad baja, para no saturar la maquina`
  : `gates-guard: no se pudo moderar la carga (${carga.error}) — se sigue igual, es una mitigacion, no la red principal`)

const p = spawn('npm', ['run', CADENA], { shell: true, stdio: ['ignore', 'pipe', 'pipe'] })

// SI MUERE EL GUARD, MUERE LA CADENA. Este es el agujero que colgo la maquina la SEGUNDA vez la misma
// noche, y lo peor es que lo abrio la prueba de humo de este mismo archivo: se corrio
// `timeout 70 node tools/gates-guard.mjs`, el timeout mato al guard, el guard solto el cerrojo
// ordenadamente... y `npm run gates:crudo` —con su node y su Chromium debajo— siguio corriendo
// HUERFANO. Sin vigilante, sin cerrojo y sin nadie mirando. Cuatro minutos despues la maquina no
// respondia.
//
// Probado, porque no era obvio: matando solo al padre, `npm` y `node` sobreviven. En Windows un
// proceso no se lleva a sus hijos al morir.
//
// Vale para CUALQUIER muerte del guard: Ctrl-C, timeout, cerrar la terminal, una excepcion. Un guard
// que deja atras lo que estaba vigilando es peor que no correrlo, porque ademas suelta el cerrojo y el
// siguiente arranca encima.
let yaLimpio = false
const llevarseLaCadena = () => {
  if (yaLimpio) return
  yaLimpio = true
  matarArbol(p.pid)
}
process.on('exit', llevarseLaCadena)
for (const s of ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGBREAK']) {
  process.on(s, () => { llevarseLaCadena(); process.exit(130) })
}
process.on('uncaughtException', (e) => { console.error(e); llevarseLaCadena(); process.exit(1) })

let cortadoPor = null
const ojo = vigilar((motivo) => {
  cortadoPor = motivo
  console.error(`\n!! gates-guard: ${motivo}`)
  llevarseLaCadena()
})

let salida = ''
p.stdout.on('data', d => { salida += d; process.stdout.write(d) })
p.stderr.on('data', d => { salida += d; process.stderr.write(d) })
p.on('close', codigo => {
  ojo.parar()
  const ok = (salida.match(/OK \(|OK:/g) || []).length
  const fail = (salida.match(/^FAIL|FALLO/gm) || []).length
  console.log(`\ngates-guard: ${ok} OK · ${fail} FAIL · minimo de RAM disponible ${ojo.libreMinMb} MB `
    + `(arranco con ${disp}, piso ${ojo.pisoMb}, total ${ojo.totalMb}) · exit ${codigo}`)
  if (cortadoPor) console.log(`gates-guard: CORTADO — ${cortadoPor}`)
  process.exit(cortadoPor ? 1 : codigo)
})
