// PRUEBA DEL VIGILANTE Y DEL CERROJO — sin reservar un solo byte.
//
// La primera version de esta prueba lanzaba un proceso que pedia 200 MB cada 150 ms para ver si el
// vigilante lo mataba. Lo mataba. Y de paso dejo el disponible de la maquina en 626 MB, o sea que
// estuvo a un pelo de colgarla para comprobar que no se cuelga. Una prueba que puede causar el defecto
// que esta probando no es una prueba.
//
// Ahora el lector de memoria se inyecta (`leer`), asi que la caida se SIMULA. Y lo del cerrojo y los
// huerfanos se prueba con procesos que duermen, no con procesos que comen.
//
// Uso:  node tools/memoria-test.mjs
import { spawn } from 'node:child_process'
import { vigilar, pisoPara, disponibleMb, TECHO_MB, MINIMO_ARRANQUE_MB, TECHO_NODE_MB, entornoConTecho, claveDe } from './lib/memoria.mjs'
import { tomar } from './lib/cerrojo.mjs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

let fallos = 0
const ok = (m) => console.log(`  ok · ${m}`)
const mal = (m) => { fallos++; console.log(`  FALLA · ${m}`) }

// ---------------------------------------------------------------- el piso
{
  const p1 = pisoPara(2400)      // maquina cargada, como la de desarrollo un dia cualquiera
  const p2 = pisoPara(10000)     // maquina despejada
  const p3 = pisoPara(500)       // maquina ahogada
  if (p1 > 0 && p1 < 2400) ok(`con 2400 MB disponibles el piso es ${p1} (deja trabajar y corta antes del final)`)
  else mal(`piso ${p1} con 2400 disponibles`)
  if (p2 === TECHO_MB) ok(`con 10000 MB el piso llega al techo (${TECHO_MB})`)
  else mal(`piso ${p2}, esperaba ${TECHO_MB}`)
  if (p3 === 800) ok('con la maquina ahogada el piso no baja del minimo duro (800)')
  else mal(`piso ${p3}`)
}

// EL RELOJ DE SEGURIDAD SE CANCELA AL ACERTAR. Sin esto, el `setTimeout` de una prueba que ya paso
// sigue vivo y dispara mas tarde, en medio de OTRA prueba, anotando un fallo que no existe. Paso
// exactamente eso al agregar la prueba del guard: la suite paso a durar dos segundos mas y la primera
// prueba —que habia pasado— se auto-acuso.
const conReloj = (fn, ms, siNoPasa) => new Promise((res) => {
  const t = setTimeout(() => { mal(siNoPasa); res() }, ms)
  fn(() => { clearTimeout(t); res() })
})

// ---------------------------------------------------------------- lo PREVENTIVO: el techo de Node
//
// Todo lo de abajo es reactivo: mira y mata. Esto evita que la herramienta PIDA de mas, que es lo que
// de verdad hacia falta — un `node.exe` pidiendo 42 GB en una maquina de 15 no se arregla vigilandolo.
{
  const total = Math.round((await import('node:os')).totalmem() / 1048576)
  if (TECHO_NODE_MB >= 1024 && TECHO_NODE_MB <= 6144 && TECHO_NODE_MB <= total)
    ok(`el techo de Node sale de la maquina: ${TECHO_NODE_MB} MB de ${total} totales`)
  else mal(`techo de Node fuera de rango: ${TECHO_NODE_MB} con ${total} totales`)

  const e = entornoConTecho({ RUTA: 'x' })
  if (e.NODE_OPTIONS === `--max-old-space-size=${TECHO_NODE_MB}`) ok('el entorno del hijo lleva el techo')
  else mal(`NODE_OPTIONS quedo en "${e.NODE_OPTIONS}"`)

  const ya = entornoConTecho({ NODE_OPTIONS: '--max-old-space-size=999' })
  if (ya.NODE_OPTIONS === '--max-old-space-size=999') ok('si alguien ya puso un techo a mano, no se le pisa')
  else mal(`se piso un techo puesto a mano: "${ya.NODE_OPTIONS}"`)

  if (claveDe('python backend/motor.py https://linear.app --dur 20') === 'python backend/motor.py')
    ok('el historial agrupa por TAREA y no por linea de comando (misma tarea, otra URL)')
  else mal(`claveDe devolvio "${claveDe('python backend/motor.py https://linear.app --dur 20')}"`)
}

// ---------------------------------------------------------------- caida sostenida
await conReloj((listo) => {
  let n = 0
  const ojo = vigilar((motivo) => {
    ojo.parar()
    if (/seguidos/.test(motivo)) ok('una caida SOSTENIDA por debajo del piso dispara')
    else mal(`disparo por el motivo equivocado: ${motivo}`)
    listo()
  }, { pisoMb: 1000, intervalo: 5, leer: () => (++n < 3 ? 1500 : 900) })   // 900 = bajo el piso, no critico
}, 3000, 'una caida sostenida NO disparo')

// ---------------------------------------------------------------- un pico no dispara
await new Promise((res) => {
  let n = 0
  const ojo = vigilar(() => { ojo.parar(); mal('un pico de un instante disparo (no deberia)'); res() },
    { pisoMb: 1000, intervalo: 5, leer: () => (++n === 4 ? 900 : 1500) })
  setTimeout(() => { ojo.parar(); ok('un pico corto NO dispara'); res() }, 400)
})

// ---------------------------------------------------------------- caida critica: sin esperar
await conReloj((listo) => {
  const t0 = Date.now()
  const ojo = vigilar((motivo) => {
    ojo.parar()
    const ms = Date.now() - t0
    if (/MITAD/.test(motivo) && ms < 300) ok(`una caida CRITICA corta sin esperar (${ms} ms)`)
    else mal(`critica tardo ${ms} ms o disparo por otro motivo: ${motivo}`)
    listo()
  }, { pisoMb: 1000, intervalo: 5, leer: () => 400 })                      // 400 < 1000/2
}, 3000, 'una caida critica NO disparo')

// ---------------------------------------------------------------- el muestreo roto ABORTA
await conReloj((listo) => {
  const ojo = vigilar((motivo) => {
    ojo.parar()
    if (/no pudo leer/.test(motivo)) ok('si el vigilante no puede medir, ABORTA en vez de seguir a ciegas')
    else mal(`motivo inesperado: ${motivo}`)
    listo()
  }, { pisoMb: 1000, intervalo: 5, leer: () => { throw new Error('FileLoadException simulada') } })
}, 3000, 'el muestreo roto NO aborto — es el agujero de la primera version')

// ---------------------------------------------------------------- el guard se lleva su cadena al morir
//
// Este es el que faltaba, y es el que colgo la maquina la segunda vez: matar al padre en Windows NO
// mata a los hijos. Se prueba con un hijo que duerme.
await new Promise((res) => {
  const padre = spawn(process.execPath, ['-e', `
    const { spawn } = require('node:child_process')
    const h = spawn(process.execPath, ['-e', 'setTimeout(()=>{},30000)'], { stdio: 'ignore' })
    console.log(h.pid)
    const irse = () => { try { require('node:child_process').execFileSync('taskkill', ['/PID', String(h.pid), '/T', '/F'], { stdio: 'ignore' }) } catch {} }
    process.on('exit', irse)
    for (const s of ['SIGINT','SIGTERM','SIGBREAK']) process.on(s, () => { irse(); process.exit(130) })
    setTimeout(() => {}, 30000)
  `], { stdio: ['ignore', 'pipe', 'ignore'] })
  let pidHijo = ''
  padre.stdout.on('data', (d) => { pidHijo += d })
  setTimeout(() => {
    const hijo = Number(String(pidHijo).trim())
    padre.kill('SIGTERM')
    setTimeout(() => {
      let vive = true
      try { process.kill(hijo, 0) } catch { vive = false }
      if (vive) mal(`al matar al padre el hijo ${hijo} SIGUE VIVO — es el huerfano que colgo la maquina`)
      else ok('al matar al guard, la cadena se muere con el')
      if (vive) { try { process.kill(hijo, 'SIGKILL') } catch { /* */ } }
      res()
    }, 1200)
  }, 900)
})

// ---------------------------------------------------------------- el guard, de punta a punta
//
// Con una cadena FALSA de un segundo. Existe porque el informe final del guard tenia una referencia a
// una constante que ya no se importaba: un ReferenceError en la ULTIMA linea, despues de media hora de
// compuertas verdes. `node --check` no lo ve y una prueba de humo con timeout tampoco.
await new Promise((res) => {
  const g = spawn(process.execPath, ['tools/gates-guard.mjs'],
    { env: { ...process.env, GUARD_CADENA: 'gates:falsa',
      // su propio cerrojo: si no, este guard de prueba choca con el guard que puede estar corriendo la
      // suite, y la prueba fallaria por una razon que no tiene nada que ver con lo que mide.
      GUARD_CERROJO: join(dirname(fileURLToPath(import.meta.url)), 'out', '.prueba-guard.lock'),
      // Y SU PROPIO PRESUPUESTO. El cerrojo ya estaba aislado; el HISTORIAL DE COSTO no, y ese era el
      // otro lugar donde esta prueba competia con lo que prueba. El guard consulta cuanto pidio
      // `gates:guard` la ultima vez —3001 MB, el costo de la cadena REAL— y se niega a arrancar si no
      // entra... aunque aca esta corriendo `gates:falsa`, que dura un segundo y pide 5 MB.
      //
      // Resultado: en una maquina ocupada la prueba fallaba con "quedarian 767 MB, por debajo del piso
      // de 1319" — o sea reportaba un defecto del motor cuando lo unico que pasaba es que habia un
      // juego abierto. Una prueba que depende de cuanta RAM libre hay no prueba el guard, mide la
      // maquina.
      PESADO_IGNORAR_HISTORIAL: '1' },
      stdio: ['ignore', 'pipe', 'pipe'] })
  let out = ''
  g.stdout.on('data', d => { out += d })
  g.stderr.on('data', d => { out += d })
  g.on('close', (c) => {
    if (c === 0 && /gates-guard: \d+ OK/.test(out) && !/ReferenceError|is not defined/.test(out)) {
      ok('el guard corre de punta a punta e imprime su informe final sin explotar')
    } else mal(`el guard termino con exit ${c}: ${out.split(String.fromCharCode(10)).filter(Boolean).slice(-2).join(' | ')}`)
    res()
  })
})

// ---------------------------------------------------------------- el cerrojo
{
  // CON SU PROPIO ARCHIVO: esta prueba corre como primera compuerta de `npm run gates`, y en ese
  // momento el cerrojo real lo tiene el guard que la esta ejecutando. Pidiendo el de verdad, la prueba
  // se auto-bloqueaba y tiraba abajo la cadena entera antes de la primera compuerta util.
  const CERROJO_PRUEBA = { archivo: join(dirname(fileURLToPath(import.meta.url)), 'out', '.prueba.lock') }
  const a = tomar('prueba-a', CERROJO_PRUEBA)
  if (a.ocupado) mal('no se pudo tomar un cerrojo libre')
  else ok('se toma un cerrojo libre')
  const b = tomar('prueba-b', CERROJO_PRUEBA)
  if (b.ocupado) ok(`el segundo NO arranca y dice quien lo tiene ("${b.ocupado.quien}")`)
  else mal('el segundo tomo el cerrojo igual')
  a.soltar?.()
}

console.log(`\nMEMORIA-TEST ${fallos ? `FAIL (${fallos})` : 'OK'} — vigilante, piso adaptativo, aborto por ceguera, `
  + `huerfanos y cerrojo. Disponible ahora ${disponibleMb()} MB, minimo para arrancar ${MINIMO_ARRANQUE_MB}.`)
process.exit(fallos ? 1 : 0)
