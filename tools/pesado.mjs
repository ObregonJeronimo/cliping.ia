// CORRER CUALQUIER COSA PESADA CON LA MISMA RED que `gates-guard`: cerrojo, vigilante de memoria, y el
// arbol de procesos muere con el padre.
//
// POR QUE EXISTE. Despues de los dos cuelgues del 4 de agosto de 2026 quedaron protegidos los dos
// caminos conocidos —`npm run gates` y `motor.py`— y NADA MAS. Pero el trabajo del dia a dia no pasa
// solo por ahi: una compuerta nueva que construye 2849 escenas con three.js en Node, un barrido de
// mediciones, un script de una sola vez para medir algo. Todos esos corren sin red, y son exactamente
// la clase de cosa que se lanza sin pensarlo dos veces porque "es solo una medicion".
//
// La leccion de los dos cuelgues es la misma: la proteccion que hay que acordarse de invocar no
// protege. Asi que esto tiene que ser mas facil de escribir que el comando pelado:
//
//   npm run pesado -- node tools/fondo-check.mjs
//   npm run pesado -- python backend/motor.py https://linear.app --dur 20
//
// Y si algo ya tiene el cerrojo, este NO ARRANCA en vez de competirle la RAM.
import { spawn } from 'node:child_process'
import { vigilar, matarArbol, disponibleMb, MINIMO_ARRANQUE_MB } from './lib/memoria.mjs'
import { tomar } from './lib/cerrojo.mjs'
import { moderarCarga } from './lib/carga.mjs'

const argv = process.argv.slice(2)
if (!argv.length) {
  console.error('uso: npm run pesado -- <comando> [args...]')
  process.exit(2)
}

const disp = disponibleMb()
if (disp < MINIMO_ARRANQUE_MB) {
  console.error(`pesado: NO ARRANCA — quedan ${disp} MB de RAM disponible y hacen falta al menos `
    + `${MINIMO_ARRANQUE_MB}. Cerrá algunas aplicaciones y volvé a intentar.`)
  process.exit(2)
}

const cerrojo = tomar(argv.join(' ').slice(0, 60))
if (cerrojo.ocupado) {
  const { quien, pid, desde } = cerrojo.ocupado
  console.error(`pesado: NO ARRANCA — "${quien}" (pid ${pid}) tiene el cerrojo desde ${desde}.`)
  console.error('Dos corridas pesadas a la vez es lo que cuelga la maquina. Esperá a que termine.')
  process.exit(2)
}

// MODERAR LA CARGA ANTES DE LANZAR NADA. La afinidad se hereda, asi que fijarla aca la reciben el
// hijo, los nietos y cada Chromium que abra Playwright. Ver la nota larga en lib/carga.mjs: la maquina
// venia de seis dias estables y se apago tres veces en 50 minutos bajo carga sostenida, sin pantalla
// azul y sin error de hardware — o sea, no fue memoria.
const carga = moderarCarga()
console.error(carga.ok
  ? `pesado: usando ${carga.usar} de ${carga.total} hilos y prioridad baja, para no saturar la maquina`
  : `pesado: no se pudo moderar la carga (${carga.error}) — se sigue igual, es una mitigacion, no la red principal`)

// SIN `shell: true`, A PROPOSITO. Con shell, Windows re-concatena `comando + args` separados por
// espacios y SIN volver a citar, asi que cualquier argumento con espacios o comillas —una URL, un
// `-e "console.log(...)"`— llega partido y el comando falla por una razon que no tiene nada que ver
// con lo que uno queria correr. Sin shell los limites de cada argumento se respetan tal cual.
const p = spawn(argv[0], argv.slice(1), { stdio: ['ignore', 'inherit', 'inherit'] })

// Igual que en el guard: si muere el padre, se lleva la cadena. Ver la nota larga en gates-guard.mjs —
// el huerfano que quedo vivo una vez ya colgo la maquina.
let yaLimpio = false
const llevarse = () => { if (!yaLimpio) { yaLimpio = true; matarArbol(p.pid) } }
process.on('exit', llevarse)
for (const s of ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGBREAK']) process.on(s, () => { llevarse(); process.exit(130) })
process.on('uncaughtException', (e) => { console.error(e); llevarse(); process.exit(1) })

let cortadoPor = null
const ojo = vigilar((motivo) => {
  cortadoPor = motivo
  console.error(`\n!! pesado: ${motivo}`)
  llevarse()
})

p.on('close', (codigo) => {
  ojo.parar()
  const min = ojo.libreMinMb === null
    ? 'no llego a medirse (termino en menos de un cuarto de segundo)'
    : `${ojo.libreMinMb} MB`
  console.error(`\npesado: "${argv.join(' ').slice(0, 60)}" · minimo de RAM disponible ${min} `
    + `(arranco con ${disp}, piso ${ojo.pisoMb}) · exit ${codigo}`)
  if (cortadoPor) console.error(`pesado: CORTADO — ${cortadoPor}`)
  process.exit(cortadoPor ? 1 : codigo)
})
