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
import { vigilar, matarArbol, disponibleMb, MINIMO_ARRANQUE_MB, barrerHuerfanos, anotarCosto, entornoConTecho, TECHO_NODE_MB, costoDe, pisoPara, commitDelArbol } from './lib/memoria.mjs'
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

// `GUARD_CERROJO` existe SOLO para la prueba de punta a punta, que lanza un guard DENTRO del guard: sin
// esto pediria el cerrojo real —que en ese momento lo tiene el que la esta corriendo— y se auto-
// bloquearia. Es el mismo cuidado que `memoria-test` toma con su propio cerrojo.
const cerrojo = tomar('gates:guard',
  process.env.GUARD_CERROJO ? { archivo: process.env.GUARD_CERROJO } : {})
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

// Con el cerrojo REAL en la mano, cualquier cadena viva es un huerfano de una corrida anterior que
// murio mal. Se barre antes de arrancar: si no, la corrida nueva compite por la RAM contra un fantasma.
//
// PERO SOLO CON EL CERROJO REAL, y esto casi cuesta caro. La prueba de punta a punta lanza un guard con
// su propio cerrojo; ese guard veia el suyo libre, concluia que la cadena de verdad —la que lo estaba
// ejecutando— era un huerfano, y LA MATABA. El guard se suicidaba a traves de su propia prueba, y el
// sintoma era una cadena que moria en la primera compuerta sin decir por que.
//
// La regla queda explicita: el barrido vale porque "tengo el cerrojo, luego lo que vive es huerfano".
// Con un cerrojo prestado esa deduccion es falsa, asi que no se barre.
const huerfanos = process.env.GUARD_CERROJO ? [] : barrerHuerfanos()
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
// ¿ENTRA EN ESTA MAQUINA? Esta es la pregunta que faltaba, y es la unica preventiva de todas.
//
// El reclamo de Jero es correcto y directo: "no puede ser que no consideres que potencia tiene la pc
// como para pedir tanto recurso". Todo lo demas de la red es reactivo —vigila y mata cuando la cosa ya
// se fue de mano—; nada preguntaba, ANTES de arrancar, si el trabajo entraba.
//
// Ahora se pregunta, y con lo MEDIDO EN ESTA MAQUINA (`costoDe`), no con una estimacion: si lo que esta
// tarea pidio en su peor corrida no deja al menos el piso libre, no se arranca. Se dice cuanto falta y
// se pide cerrar aplicaciones. Una corrida que se sabe que no entra es media hora tirada y una PC
// colgada; negarse es mas util que intentarlo.
//
// La primera vez que una tarea corre en una maquina no hay historial, y eso se DICE en vez de suponer
// que entra: lo medido en la PC de uno no predice nada sobre la del otro.
const gasto = costoDe('gates:guard')
if (gasto) {
  const quedaria = disp - gasto.pidioMbPeor
  const piso = pisoPara(disp)
  console.error(`gates-guard: esta tarea pidio hasta ${gasto.pidioMbPeor} MB en esta maquina (${gasto.corridas} corridas). `
    + `Con ${disp} MB disponibles quedarian ~${quedaria} MB.`)
  if (quedaria < piso && !process.env.PESADO_IGNORAR_HISTORIAL) {
    console.error(`gates-guard: NO ARRANCA — quedarian ${quedaria} MB, por debajo del piso de ${piso}. `
      + `Cerrá algunas aplicaciones (te faltan ~${piso - quedaria} MB) y volvé a intentar.`)
    // LA PUERTA DE ATRAS SE DICE, no se esconde. Si la tarea acaba de arreglarse, el historial todavia
    // guarda el consumo de ANTES y esta negativa es un fantasma. Ocultarlo obliga a borrar el historial
    // a mano, que es peor: se pierde todo lo medido en esta maquina.
    console.error('gates-guard: si acabás de arreglar esta tarea, el numero de arriba es viejo. '
      + 'Corré una vez con  PESADO_IGNORAR_HISTORIAL=1  para volver a medirla.')
    process.exit(2)
  }
} else {
  console.error('gates-guard: esta tarea nunca se corrio en esta maquina, asi que su consumo se desconoce. '
    + 'Esta corrida lo va a medir; el vigilante corta si se pasa.')
}

// EL TECHO VA ANTES QUE LA VIGILANCIA, porque es lo unico PREVENTIVO de toda la cadena: el resto mira
// y mata cuando la cosa ya se fue de mano. Ver la nota en lib/memoria.mjs.
console.error(`gates-guard: techo de memoria de Node en ${TECHO_NODE_MB} MB (40% de la RAM de esta maquina)`)
const carga = moderarCarga()
console.error(carga.ok
  ? `gates-guard: usando ${carga.usar} de ${carga.total} hilos y prioridad baja, para no saturar la maquina`
  : `gates-guard: no se pudo moderar la carga (${carga.error}) — se sigue igual, es una mitigacion, no la red principal`)

// `PESADO_ACTIVO` VIAJA A LA CADENA, igual que en `pesado.mjs`. Significa "la red ya esta puesta:
// cerrojo tomado y vigilante mirando", y dentro del guard eso es exactamente cierto — lo tomo doce
// lineas mas arriba. Sin esto, cualquier compuerta que lance el motor de verdad choca contra el
// cerrojo DEL PROPIO GUARD y corta la cadena: `imagen-check` renderiza una pieza con
// `backend/motor.py`, que hace `cerrojo.exigir()`, y el guard moria en
//
//     GATE IMAGEN: no se pudo renderizar https://linear.app (seed 11)
//      NO ARRANCA: "gates:guard" (pid 21264) tiene el cerrojo desde ...
//
// dejando 32 OK y un exit 1 sin un solo FAIL — o sea la cadena cortada a la mitad, no un defecto del
// motor. Es el mismo error que ya mordio a `memoria-test`: una prueba que compite con el sistema que
// prueba no prueba nada. El guard ya tenia ese cuidado consigo mismo (ver el comentario del cerrojo
// arriba) y le faltaba tenerlo con sus nietos.
const t0 = Date.now()
const p = spawn('npm', ['run', CADENA], { shell: true, stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...entornoConTecho(), PESADO_ACTIVO: '1' } })

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

// VIGILANCIA DEL COMMIT, que es el numero que Node NO VE. `fondo-check` fue cazado en 29 GB de memoria
// comprometida mientras `process.memoryUsage()` del mismo proceso informaba 303 MB: la reserva la hace
// la libreria nativa de canvas y ninguna API de Node la registra. Ver la nota larga en lib/memoria.mjs.
//
// Por eso son DOS relojes: `os.freemem()` cada 250 ms para el sistema entero (gratis, no puede fallar)
// y este cada 4 s para los procesos pesados (cuesta una consulta a Windows, pero es el unico que ve la
// verdad). Sin este, la maquina se colgo cinco veces con el vigilante informando que todo estaba bien.
const TOPE_COMMIT_MB = Math.max(4096, Math.round((disp * 0.75)))
let picoCommit = 0
const relojCommit = setInterval(() => {
  const m = commitDelArbol(p.pid)
  if (!m) return                                   // que falle no es fatal: el otro reloj sigue
  for (const [pid, mb] of m) {
    if (mb > picoCommit) picoCommit = mb
    if (mb > TOPE_COMMIT_MB) {
      console.error(`
!! gates-guard: el proceso ${pid} de esta corrida COMPROMETIO ${mb} MB `
        + `(tope ${TOPE_COMMIT_MB}). Node no lo ve; Windows si. Lo mato antes de que cuelgue la maquina.`)
      matarArbol(pid)
    }
  }
}, 4000)
relojCommit.unref?.()

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
  clearInterval(relojCommit)
  // Se anota lo que REALMENTE costo, para que el aviso previo de la proxima vez sea un dato medido en
  // ESTA maquina y no una estimacion. Ver la regla de avisos en el CLAUDE.md.
  anotarCosto('gates:guard', {
    arrancoConMb: disp, minimoMb: ojo.libreMinMb,
    segundos: Math.round((Date.now() - t0) / 1000), cortado: !!cortadoPor,
  })
  const ok = (salida.match(/OK \(|OK:/g) || []).length
  const fail = (salida.match(/^FAIL|FALLO/gm) || []).length
  console.log(`\ngates-guard: ${ok} OK · ${fail} FAIL · minimo de RAM disponible ${ojo.libreMinMb} MB `
    + `(arranco con ${disp}, piso ${ojo.pisoMb}, total ${ojo.totalMb}) · exit ${codigo}`)
  if (cortadoPor) console.log(`gates-guard: CORTADO — ${cortadoPor}`)
  process.exit(cortadoPor ? 1 : codigo)
})
