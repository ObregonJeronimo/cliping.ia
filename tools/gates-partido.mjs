// EL GUARD, PERO DE A UNA COMPUERTA — para máquinas ocupadas, sin bajar la cobertura.
//
// POR QUE EXISTE. `npm run gates` corre la cadena entera dentro de UN proceso de npm, así que la
// memoria de cada compuerta se acumula hasta que termina la última: medido en esta máquina, pide
// hasta 3001 MB. Con un juego abierto no entra, y el vigilante se niega a arrancar — que es lo
// correcto, pero deja el trabajo parado.
//
// Corriéndolas de a una el pico es el de la compuerta MÁS CARA, no la suma. El sistema recupera la
// memoria al cerrar cada proceso — que es exactamente la técnica que varias compuertas ya usan por
// dentro ("cada una en su propio proceso para que la memoria vuelva al sistema").
//
// CUÁL ES LA MÁS CARA: NO SE SABÍA, Y ESTE ARCHIVO AFIRMABA QUE SÍ. Acá decía "el pico es
// `fondo-check`, 1052 MB", y en CLAUDE.md lo mismo. Era falso, y de la peor manera: no estaba
// inventado, estaba leído del máximo de `npm run costo` — una tabla que sólo tenía las cuatro o cinco
// compuertas que alguien había corrido A MANO con `npm run pesado`. Las otras 37 nunca se habían
// medido por separado, así que el máximo de lo medido se presentó como el máximo de todo.
//
// Refutado por una corrida real: cortó en `urvid1-test.mjs` —que no figuraba en la tabla— con el
// disponible cayendo de 3643 a 901 MB. Unos 2,7 GB, no 1052.
//
// Por eso ahora CADA compuerta anota su costo (`anotarCosto`), y a la vuelta `npm run costo` tiene las
// 42 en vez de cinco. Es el mismo error que el repo ya documenta en otro lado con otro nombre: sacar
// una conclusión de la ausencia de datos en vez de decir "no se midió".
//
// LO QUE ESE NÚMERO NO ES: no es "lo que pidió la compuerta". Es cuánto bajó el disponible del SISTEMA
// mientras corría, así que incluye lo que hayan pedido el navegador, el juego o Discord en esos
// segundos. Es la misma definición que ya usa toda la tabla y sirve para avisar —es el caso malo real
// que se vio— pero atribuírselo entero a la compuerta sería otro dato falso con cara de medición.
//
// NO ES UN GUARD MÁS DÉBIL. Corre LAS MISMAS compuertas, en el MISMO orden, leídas del MISMO lugar:
// el script `gates:crudo` de package.json. Si alguien agrega una compuerta a la cadena, ésta la corre
// sin tocar nada. Lo único que cambia es cómo se agrupan los procesos.
//
// LO QUE SÍ PIERDE, y hay que decirlo: la cadena original usa `&&`, así que se corta en la primera
// que falla. Ésta las corre TODAS y reporta al final — que para diagnosticar es mejor (ves todo lo
// que está roto de una vez) y para un guard previo a push es equivalente: lo que importa es si hubo
// algún FAIL.
//
// Uso:  node tools/gates-partido.mjs            (todas)
//       node tools/gates-partido.mjs --desde 12 (retomar desde la compuerta 12)
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { tomar } from './lib/cerrojo.mjs'
import { disponibleMb, entornoConTecho, vigilar, matarArbol, pisoPara, anotarCosto, costoDe, MINIMO_ARRANQUE_MB } from './lib/memoria.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const RAIZ = join(HERE, '..')

// SI NO HAY LUGAR NI PARA EMPEZAR, NO SE EMPIEZA. CLAUDE.md declara esta regla desde que existe —"si
// hay menos de 1200 MB disponibles, el guard no arranca y te dice que cierres aplicaciones"— y era
// FALSA para `npm run gates`: la implementaba solo el envoltorio `npm run pesado`, y cuando la cadena
// vigilada paso a ser `gates-partido` nadie la trajo. Una proteccion documentada que no existe es peor
// que no tenerla: alguien la da por hecha.
//
// Se vio el 7/8/2026: se lanzo con 542 MB libres —un juego cargado— y arranco igual, tomo el cerrojo,
// levanto un hijo y murio a los cuatro segundos. No colgo la maquina porque el vigilante hizo su
// trabajo, pero le pidio memoria a una maquina que no tenia, que es justo lo que hay que no hacer.
if (disponibleMb() < MINIMO_ARRANQUE_MB) {
  console.error(`gates-partido: NO ARRANCA — quedan ${disponibleMb()} MB libres y hacen falta al menos `
    + `${MINIMO_ARRANQUE_MB} para empezar. Cerra alguna aplicacion (un juego suele liberar 1-2 GB).`)
  console.error('  No es un capricho: con menos que eso la primera compuerta cara muere y la tanda se')
  console.error('  corta igual, pero despues de haberle pedido memoria a una maquina que no la tiene.')
  process.exit(2)
}

// EL CERROJO IGUAL. Que corra de a una no la vuelve liviana: sigue siendo media hora de compuertas y
// dos corridas pesadas a la vez es lo que cuelga la máquina. Se toma una sola vez para toda la tanda.
const cerrojo = tomar('gates:partido', { pid: process.pid })
if (cerrojo.ocupado) {
  const { quien, pid, desde } = cerrojo.ocupado
  console.error(`gates-partido: NO ARRANCA — "${quien}" (pid ${pid}) tiene el cerrojo desde ${desde}.`)
  process.exit(2)
}

const pkg = JSON.parse(readFileSync(join(RAIZ, 'package.json'), 'utf8'))
const cadena = pkg.scripts['gates:crudo']
if (!cadena) {
  console.error('gates-partido: no encuentro el script `gates:crudo` en package.json')
  process.exit(2)
}
// Se parte por `&&` y se respeta el orden. `vite build` queda incluido: es parte de la cadena.
const PASOS = cadena.split('&&').map(s => s.trim()).filter(Boolean)

const args = process.argv.slice(2)
const desde = args.includes('--desde') ? Number(args[args.indexOf('--desde') + 1]) || 0 : 0
// `--solo 3,24,35` corre EXACTAMENTE esas, por su numero en la cadena (1..42). Existe para retomar las
// que quedaron POSPUESTAS por memoria sin volver a correr las 38 que ya pasaron.
const SOLO = args.includes('--solo')
  ? new Set(String(args[args.indexOf('--solo') + 1] || '').split(',').map(n => Number(n.trim())).filter(Boolean))
  : null

console.log(`gates-partido: ${PASOS.length} compuertas, de a una. Disponible ahora ${disponibleMb()} MB.`)
console.log('  mismas compuertas que `npm run gates`, leidas de gates:crudo. Cambia el agrupamiento,')
console.log('  no la cobertura: el pico pasa a ser el de la compuerta mas cara y no la suma de todas.\n')

const fallaron = []
const costos = []
const pospuestas = []
let okTotal = 0
const t0 = Date.now()

// EL VIGILANTE EN VIVO, Y POR ESO EL BUCLE ES ASINCRONO. La primera version usaba `spawnSync`, que
// BLOQUEA el event loop: un reloj de vigilancia no dispararia nunca mientras corre la compuerta — o
// sea justo cuando hace falta. Medir el disponible ANTES de cada paso no alcanza: la que cuelga la
// maquina es la que se dispara a la mitad, y esa familia ya la colgo seis veces.
//
// Con spawn asincrono el reloj corre en paralelo y mata el arbol del hijo igual que `gates-guard`.
let procesoActual = null
let cortadoPor = null
const ojo = vigilar((motivo) => {
  cortadoPor = motivo
  console.error(`\n!! gates-partido: ${motivo}`)
  if (procesoActual && procesoActual.pid) matarArbol(procesoActual.pid)
}, { pisoMb: pisoPara(disponibleMb()) })

// SI MUERE EL PADRE, MUERE EL HIJO. En Windows un proceso no se lleva a sus hijos al morir, y eso ya
// dejo una cadena huerfana corriendo sin vigilante hasta colgar la maquina. Vale igual aca.
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    if (procesoActual && procesoActual.pid) matarArbol(procesoActual.pid)
    process.exit(130)
  })
}

// --oportunista [minutos] — NO SE RINDE EN UNA PASADA: vuelve por las pospuestas cuando haya lugar.
//
// La postergacion por si sola contesta "¿entra AHORA?" una vez y sigue de largo. Eso alcanza cuando la
// maquina esta libre y sobra cuando esta ocupada, pero desperdicia el caso real de este repo: la
// persona esta jugando, dentro de veinte minutos cierra, y la RAM aparece sin que nadie la pida.
//
// Con esta bandera la tanda se recorre en PASADAS. Cada pasada corre lo que entra en ese momento y
// deja lo que no; despues espera y vuelve por lo que quedo. Termina cuando no queda nada, o cuando se
// acaba el plazo, o cuando una pasada entera no logra correr NADA y ya no queda tiempo util.
//
// Es literalmente "actuar en el momento segun la RAM disponible", que es lo que hay que hacer a mano
// si esto no existe — y hacerlo a mano significa depender de que alguien este mirando.
const OPORTUNISTA = args.includes('--oportunista')
const PLAZO_MIN = OPORTUNISTA
  ? (Number(args[args.indexOf('--oportunista') + 1]) || 45)
  : 0
const ESPERA_MS = 60000
const tFin = Date.now() + PLAZO_MIN * 60000
const esperar = (ms) => new Promise(r => setTimeout(r, ms))

// La lista de lo que falta correr. En el modo normal se recorre una vez; en el oportunista, hasta que
// se vacie o se acabe el plazo.
let pendientes = PASOS.map((paso, i) => ({ paso, i }))
  .filter(({ i }) => i >= desde && (!SOLO || SOLO.has(i + 1)))
let pasada = 0

while (pendientes.length && !cortadoPor) {
  pasada++
  const quedan = []
  if (OPORTUNISTA && pasada > 1) {
    console.log(`\n  -- pasada ${pasada}: reintentando ${pendientes.length} pospuesta(s), `
      + `${disponibleMb()} MB libres --`)
  }

for (const { paso, i } of pendientes) {
  if (cortadoPor) { quedan.push({ paso, i }); continue }
  const etiqueta = paso.replace(/^(node|python)\s+/, '').replace(/^tools\//, '')
  const libre = disponibleMb()
  process.stdout.write(`  [${String(i + 1).padStart(2)}/${PASOS.length}] ${etiqueta.padEnd(38)} `)

  // NO ARRANCAR LA QUE YA SE SABE QUE NO ENTRA. Esto existe porque la maquina se comparte con quien
  // la esta usando: dos corridas seguidas murieron enteras —una en la compuerta 3, otra en la 24—
  // porque una sola compuerta cara se topo con un juego abierto, y las 20 y pico que ya habian pasado
  // se perdieron con ella.
  //
  // Ahora cada compuerta anota su costo, asi que la pregunta se puede contestar ANTES en vez de
  // descubrirla a los golpes: si lo que esta compuerta pidio en su peor corrida no entra en lo que hay
  // libre, se POSPONE y la tanda sigue. Es la misma idea que ya usa `npm run pesado` para negarse a
  // arrancar, aplicada por compuerta en vez de por tanda entera.
  //
  // Y NO CONVIERTE UN GUARD INCOMPLETO EN VERDE. Las pospuestas se listan con nombre y con cuantos MB
  // faltaron, y la salida es distinta de cero. Un guard que se saltea compuertas y dice OK seria
  // exactamente el "cero tranquilizador" que este repo persigue en otros seis lugares.
  //
  // Sin medicion previa NO se pospone: no saber cuanto pide no es lo mismo que saber que no entra, y
  // negarse por las dudas dejaria fuera para siempre a toda compuerta nunca medida.
  // `--solo` NO SE POSPONE NUNCA, y esto tapa un agujero que se vio en la primera corrida de verdad:
  // `urvid1-qa` quedo pospuesta con 7196 MB libres —o sea con la maquina practicamente vacia— porque
  // su peor caso registrado es de ANTES de que le arreglaran la fuga (6426 MB contra los ~950 de las
  // corridas siguientes). Y como la unica forma de retomar una pospuesta es `--solo`, que aplicaba la
  // misma regla, la compuerta quedaba imposible de correr: la medicion vieja se profetizaba sola.
  //
  // `--solo` es un pedido explicito con numeros escritos a mano. Ahi la decision ya la tomo alguien; lo
  // que corresponde es correr y dejar que el vigilante en vivo haga su trabajo, que es la proteccion
  // que de verdad mide lo que esta pasando en vez de lo que paso una vez.
  const costo = SOLO ? null : costoDe(paso)
  if (costo && Number.isFinite(costo.pidioMbPeor)) {
    const quedaria = libre - costo.pidioMbPeor
    if (quedaria < ojo.pisoMb) {
      console.log(`POSPUESTA  (pidio ${costo.pidioMbPeor} MB, quedarian ${quedaria} — piso ${ojo.pisoMb})`)
      quedan.push({ paso, i, pidio: costo.pidioMbPeor, faltan: ojo.pisoMb - quedaria })
      continue
    }
  }

  // `node_modules/.bin` AL PATH. La cadena la corre npm, que lo agrega solo; corriendo los pasos a
  // mano, `vite build` falla con "no se reconoce como un comando". Es la unica diferencia real entre
  // ejecutar la cadena y ejecutar sus partes, y sin esto el ultimo paso siempre daria FAIL.
  const BIN = join(RAIZ, 'node_modules', '.bin')
  const env = { ...entornoConTecho(), PESADO_ACTIVO: '1' }
  env.PATH = BIN + (process.platform === 'win32' ? ';' : ':') + (env.PATH || process.env.PATH || '')
  // EL COMANDO ENTERO EN UN STRING, no partido en argumentos. Con `shell: true` Node avisa que pasar
  // args por separado es riesgoso porque los concatena sin escapar (DEP0190), y aca el comando ya
  // viene como una linea de package.json: partirlo para que el shell lo vuelva a unir no aporta nada.
  // EL MEDIDOR DE ESTE PASO. Es un segundo muestreo, aparte del vigilante: aquél mira toda la tanda y
  // decide si matar; éste sólo anota el mínimo de ESTA compuerta para que el historial la aprenda.
  // `os.freemem()` no cuesta nada (ver la nota larga en memoria.mjs), así que dos relojes de 250 ms no
  // son un problema, y separarlos evita que medir el costo pueda alterar la decisión de cortar.
  const tPaso = Date.now()
  let minPaso = libre
  const relojPaso = setInterval(() => {
    const m = disponibleMb()
    if (Number.isFinite(m) && m > 0 && m < minPaso) minPaso = m
  }, 250)
  relojPaso.unref?.()

  const r = await new Promise((res) => {
    const h = spawn(paso, {
      cwd: RAIZ, shell: true, env, stdio: ['ignore', 'pipe', 'pipe'],
    })
    procesoActual = h
    let out = ''
    h.stdout.on('data', d => { out += d })
    h.stderr.on('data', d => { out += d })
    h.on('close', (status) => { procesoActual = null; res({ status, out }) })
    h.on('error', (e) => { procesoActual = null; res({ status: 1, out: String(e) }) })
  })
  clearInterval(relojPaso)

  // SE ANOTA MARCADA COMO CORTADA SI EL VIGILANTE MATÓ ESTE PASO, y no es un detalle: `costo.mjs`
  // descarta las cortadas justamente porque su mínimo no es lo que la tarea pidió sino dónde estaba la
  // máquina cuando alguien la mató. Sin esta marca, cada corte metería en el historial un "pidió
  // muchísimo" falso, y el aviso de la próxima vez se construiría sobre él.
  const segundos = Math.round((Date.now() - tPaso) / 1000)
  anotarCosto(paso, { arrancoConMb: libre, minimoMb: minPaso, segundos, cortado: !!cortadoPor })
  costos.push({ paso: etiqueta, pidio: libre - minPaso, segundos, cortado: !!cortadoPor })

  const salida = r.out
  // El mismo criterio de veredicto que usa `gates-guard`: una linea que arranca con el nombre de la
  // compuerta en mayusculas y dice OK. Ver la nota larga alla sobre por que no se cuenta por puntuacion.
  const oks = (salida.match(/^(?:GATE )?[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ0-9 _/-]*\bOK\b/gm) || []).length
  const fails = (salida.match(/\b(FAIL|FALLO)\b/g) || []).length

  if (r.status !== 0 || fails > 0) {
    console.log(`FAIL  (libre ${libre} MB)`)
    fallaron.push({ i: i + 1, paso, salida: salida.trim().split('\n').slice(-12).join('\n') })
  } else {
    okTotal += oks || 1
    console.log(`ok · ${oks || 1}  (libre ${libre} MB)`)
  }
}

  // FIN DE LA PASADA. En el modo normal se termina aca y lo que quedo son las pospuestas de siempre.
  if (!OPORTUNISTA || !quedan.length || cortadoPor) { pendientes = quedan; break }

  // En el oportunista: si en TODA la pasada no entro ninguna, esperar tiene sentido —la RAM cambia
  // sola cuando la persona cierra el juego—. Si entro alguna, se vuelve enseguida: liberar una
  // compuerta suele destrabar a la siguiente.
  if (quedan.length === pendientes.length) {
    const restanMs = tFin - Date.now()
    if (restanMs <= 0) { pendientes = quedan; break }
    console.log(`  (no entra ninguna de las ${quedan.length} con ${disponibleMb()} MB libres; espero `
      + `${ESPERA_MS / 1000}s — quedan ${Math.ceil(restanMs / 60000)} min de plazo)`)
    await esperar(Math.min(ESPERA_MS, restanMs))
  }
  pendientes = quedan
}

// Lo que quedo sin correr, con el formato que espera el informe de abajo.
for (const q of pendientes) {
  pospuestas.push({
    i: q.i + 1,
    paso: q.paso,
    etiqueta: q.paso.replace(/^(node|python)\s+/, '').replace(/^tools\//, ''),
    pidio: q.pidio || 0,
    faltan: q.faltan || 0,
  })
}

ojo.parar()
const mins = ((Date.now() - t0) / 60000).toFixed(1)
console.log(`\ngates-partido: ${okTotal} OK · ${fallaron.length} compuertas con FAIL · ${mins} min `
  + `· minimo de RAM disponible ${ojo.libreMinMb} MB (piso ${ojo.pisoMb}, total ${ojo.totalMb})`)
if (cortadoPor) console.log(`gates-partido: CORTADO — ${cortadoPor}`)

// LAS POSPUESTAS SE DICEN PRIMERO Y CON NOMBRE. Es la unica parte de esta salida que puede engañar:
// "38 OK · 0 FAIL" con cuatro sin correr se lee como un guard verde y no lo es.
if (pospuestas.length) {
  console.log(`\ngates-partido: NO ES VERDE — ${pospuestas.length} compuertas POSPUESTAS por memoria, `
    + 'no corrieron. Un guard con compuertas sin correr no habilita un push.')
  for (const p of pospuestas) {
    console.log(`  [${String(p.i).padStart(2)}] ${p.etiqueta.padEnd(38)} pidio ${String(p.pidio).padStart(5)} MB `
      + `· faltaron ${p.faltan} MB`)
  }
  const pico = Math.max(...pospuestas.map(p => p.pidio))
  console.log(`  para correrlas hace falta liberar hasta ${pico} MB (la mas cara de las pospuestas).`)
  console.log(`  cuando haya lugar:  node tools/gates-partido.mjs --solo ${pospuestas.map(p => p.i).join(',')}`)
}

// LAS MÁS CARAS DE ESTA CORRIDA, dichas acá y no sólo guardadas en el historial. El número que hace
// falta para decidir si el guard entra hoy es el de la compuerta más cara, y hasta ahora había que
// deducirlo de `npm run costo` — donde faltaban 37 de las 42.
const medidas = costos.filter(c => !c.cortado && Number.isFinite(c.pidio) && c.pidio > 0)
if (medidas.length) {
  const top = [...medidas].sort((a, b) => b.pidio - a.pidio).slice(0, 5)
  console.log(`\n  las mas caras de esta corrida (${medidas.length} de ${costos.length} medidas):`)
  for (const c of top) console.log(`    ${c.paso.padEnd(38)} ${String(c.pidio).padStart(6)} MB · ${c.segundos} s`)
  console.log('    es cuanto bajo el DISPONIBLE DEL SISTEMA mientras corria, no lo que pidio la')
  console.log('    compuerta sola: lo que hayan pedido el navegador o un juego en esos segundos va')
  console.log('    incluido. Sirve para avisar —es el caso malo real— no para acusar a la compuerta.')
}
const sinMedir = costos.filter(c => c.cortado || !(c.pidio > 0))
if (sinMedir.length) {
  console.log(`\n  sin medicion util (${sinMedir.length}): ${sinMedir.map(c => c.paso).join(', ')}`)
  console.log('    una cortada o una que termino antes de la primera muestra no aporta un costo, y')
  console.log('    decirlo es el punto: un cero aca se leeria como "no consumio nada".')
}
if (fallaron.length) {
  for (const f of fallaron) {
    console.log(`\n--- [${f.i}] ${f.paso}`)
    console.log(f.salida)
  }
  // SE DICE COMO RETOMAR. Media hora de compuertas y volver a empezar de cero por la que fallo al
  // final es tiempo tirado.
  console.log(`\n  para retomar desde la primera que fallo:  node tools/gates-partido.mjs --desde ${fallaron[0].i - 1}`)
}
cerrojo.soltar && cerrojo.soltar()
// UNA POSPUESTA TAMBIEN ES SALIDA 1. No fallo nada, pero tampoco se comprobo nada de esa compuerta, y
// quien mira el codigo de salida esta preguntando "¿puedo pushear?" — la respuesta con compuertas sin
// correr es no. Confundir "no encontre defectos" con "no busque" es el error que este repo mas paga.
process.exit(cortadoPor || fallaron.length || pospuestas.length ? 1 : 0)
