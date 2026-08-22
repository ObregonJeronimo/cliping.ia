// PEDIRLE A AE CUADROS SUELTOS, Y ESPERARLOS.
//
// `comp.saveFrameToPng` es ASINCRONA: la llamada vuelve enseguida y el archivo aparece despues. Mirar
// el disco al volver da "no existe" y parece que fallo — es el mismo comportamiento de `AfterFX.exe -r`
// que ya costo una hora en este repo. Este envoltorio lanza la sonda y ESPERA los archivos.
//
// PARA QUE SIRVE: es la verdad de referencia en pixeles. Hasta hoy cada funcion del motor se comparaba
// contra algun numero que AE expusiera; con las mascaras eso se termino, porque esta medido que
// `sourceRectAtTime` NO las refleja. Con esto se puede comparar el cuadro entero, alfa incluido.
//
// NO CONTRADICE LA ARQUITECTURA. AE sigue sin renderizar el video: renderiza cuadros sueltos para
// MEDIR, que es la misma categoria que `valueAtTime`. Y cuesta lo que cuesta — no es una compuerta para
// correr en cada cambio, es la que se corre cuando se agrega una capacidad.
//
// USO
//   node tools/ae/cuadro-ae.mjs SONDA-MASCARA 0,12,24
//   node tools/ae/cuadro-ae.mjs PIEZA-I 212,232 --espera 90

import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync, statSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const args = process.argv.slice(2)
const COMP = args.find(a => !a.startsWith('--') && !/^[\d,]+$/.test(a))
const CUADROS = args.find(a => /^[\d,]+$/.test(a)) || '0'
const iE = args.indexOf('--espera')
const ESPERA = iE >= 0 ? +args[iE + 1] : 60

if (!COMP) {
  console.error('uso: node tools/ae/cuadro-ae.mjs <COMPOSICION> <cuadros separados por coma> [--espera seg]')
  process.exit(2)
}

// una carpeta POR COMPOSICION: con una sola, dos comps se pisan y la comparacion sale verde
// sobre cuadros de otra pieza
const DESTINO = `C:/ae-probe/ae-cuadros/${COMP}`
const pedidos = CUADROS.split(',').filter(s => s !== '').map(Number)
const esperados = pedidos.map(k => `${DESTINO}/f${String(k).padStart(3, '0')}.png`)

if (!existsSync(DESTINO)) mkdirSync(DESTINO, { recursive: true })
// se borran aca TAMBIEN, ademas de en la sonda: si AE no llega a arrancar, un archivo viejo se leeria
// como resultado de esta corrida y la comparacion saldria verde sobre datos de otro dia
for (const r of esperados) if (existsSync(r)) rmSync(r)

writeFileSync('C:/ae-probe/exportar-comp.txt', COMP, 'utf8')
writeFileSync('C:/ae-probe/cuadro-frames.txt', CUADROS, 'utf8')

console.log(`AE -> ${pedidos.length} cuadro(s) de "${COMP}": ${pedidos.join(', ')}`)
const r = spawnSync(process.execPath, ['tools/ae/llamar.mjs', 'tools/ae/sondas/cuadro.jsx'],
  { encoding: 'utf8' })
const salida = (r.stdout || '') + (r.stderr || '')
if (/FALLO\|/.test(salida)) {
  console.error(salida.split(/\r?\n/).filter(l => l.startsWith('FALLO')).join('\n'))
  process.exit(1)
}

// ---------------------------------------------------------------- esperar
//
// No alcanza con que el archivo EXISTA: AE lo crea y despues lo llena, asi que un PNG a medio escribir
// se lee como corrupto o —peor— se lee entero y con la mitad en negro. Se espera a que el tamano deje
// de cambiar entre dos vueltas.
const dormir = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
const t0 = Date.now()
const tam = new Map()
let listos = new Set()
while (listos.size < esperados.length && (Date.now() - t0) / 1000 < ESPERA) {
  dormir(250)
  for (const r2 of esperados) {
    if (listos.has(r2) || !existsSync(r2)) continue
    const n = statSync(r2).size
    if (n > 0 && tam.get(r2) === n) listos.add(r2)
    tam.set(r2, n)
  }
}

const faltan = esperados.filter(r2 => !listos.has(r2))
const seg = ((Date.now() - t0) / 1000).toFixed(1)
if (faltan.length) {
  console.error(`\nAE no escribio ${faltan.length} de ${esperados.length} cuadro(s) en ${ESPERA}s:`)
  for (const f of faltan) console.error(`  ${f}${existsSync(f) ? ' (existe pero no termino de escribirse)' : ''}`)
  console.error('  probar con --espera mas alto, o mirar si AE quedo mostrando un cartel')
  process.exit(1)
}
console.log(`  ${listos.size} cuadro(s) listos en ${seg}s -> ${DESTINO}`)
for (const r2 of esperados) console.log(`    ${r2.split('/').pop()}  ${statSync(r2).size} bytes`)
