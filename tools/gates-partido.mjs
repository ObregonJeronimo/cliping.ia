// EL GUARD, PERO DE A UNA COMPUERTA — para máquinas ocupadas, sin bajar la cobertura.
//
// POR QUE EXISTE. `npm run gates` corre la cadena entera dentro de UN proceso de npm, así que la
// memoria de cada compuerta se acumula hasta que termina la última: medido en esta máquina, pide
// hasta 3001 MB. Con un juego abierto no entra, y el vigilante se niega a arrancar — que es lo
// correcto, pero deja el trabajo parado.
//
// Corriéndolas de a una el pico es el de la compuerta MÁS CARA, no la suma: `fondo-check` pide 1052
// MB, `tira-check` 955, `encuadre-check` 468, `guion-check` 5. El sistema recupera la memoria al
// cerrar cada proceso — que es exactamente la técnica que varias compuertas ya usan por dentro
// ("cada una en su propio proceso para que la memoria vuelva al sistema").
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
import { disponibleMb, entornoConTecho, vigilar, matarArbol, pisoPara } from './lib/memoria.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const RAIZ = join(HERE, '..')

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

console.log(`gates-partido: ${PASOS.length} compuertas, de a una. Disponible ahora ${disponibleMb()} MB.`)
console.log('  mismas compuertas que `npm run gates`, leidas de gates:crudo. Cambia el agrupamiento,')
console.log('  no la cobertura: el pico pasa a ser el de la compuerta mas cara y no la suma de todas.\n')

const fallaron = []
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

for (let i = desde; i < PASOS.length && !cortadoPor; i++) {
  const paso = PASOS[i]
  const etiqueta = paso.replace(/^(node|python)\s+/, '').replace(/^tools\//, '')
  const libre = disponibleMb()
  process.stdout.write(`  [${String(i + 1).padStart(2)}/${PASOS.length}] ${etiqueta.padEnd(38)} `)

  // `node_modules/.bin` AL PATH. La cadena la corre npm, que lo agrega solo; corriendo los pasos a
  // mano, `vite build` falla con "no se reconoce como un comando". Es la unica diferencia real entre
  // ejecutar la cadena y ejecutar sus partes, y sin esto el ultimo paso siempre daria FAIL.
  const BIN = join(RAIZ, 'node_modules', '.bin')
  const env = { ...entornoConTecho(), PESADO_ACTIVO: '1' }
  env.PATH = BIN + (process.platform === 'win32' ? ';' : ':') + (env.PATH || process.env.PATH || '')
  // EL COMANDO ENTERO EN UN STRING, no partido en argumentos. Con `shell: true` Node avisa que pasar
  // args por separado es riesgoso porque los concatena sin escapar (DEP0190), y aca el comando ya
  // viene como una linea de package.json: partirlo para que el shell lo vuelva a unir no aporta nada.
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

ojo.parar()
const mins = ((Date.now() - t0) / 60000).toFixed(1)
console.log(`\ngates-partido: ${okTotal} OK · ${fallaron.length} compuertas con FAIL · ${mins} min `
  + `· minimo de RAM disponible ${ojo.libreMinMb} MB (piso ${ojo.pisoMb}, total ${ojo.totalMb})`)
if (cortadoPor) console.log(`gates-partido: CORTADO — ${cortadoPor}`)
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
process.exit(cortadoPor || fallaron.length ? 1 : 0)
