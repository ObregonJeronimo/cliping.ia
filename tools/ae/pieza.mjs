// DE UNA COMPOSICION DE AFTER EFFECTS A UN MP4, EN UN COMANDO.
//
//   node tools/ae/pieza.mjs ESCENA-LIMPIA --mp4 C:/ae-probe/pieza.mp4 --comparar
//
// Encadena las piezas que hasta ahora se corrian a mano, y ese encadenado no es comodidad: cada paso
// manual es una oportunidad de correr uno con los datos del anterior. Ya paso — una captura leyo el
// documento de una corrida vieja y el resultado parecia bueno.
//
//   1. exportar.jsx   lee la composicion y vuelca keyframes, texto, colores y el inventario de lo que
//                     NO viaja
//   2. comp.mjs       convierte las curvas y arma el documento de escena
//   3. capturar-comp  lo reproduce en un navegador, cuadro por cuadro, y codifica el MP4
//   4. render.jsx     (con --comparar) renderiza la MISMA composicion en AE
//   5. comp-check     mide geometria, tipografia y pixeles entre los dos
//
// SE PLANTA SI EL DOCUMENTO ESTA INCOMPLETO, salvo que se le pase --igual. Un documento al que le
// falta un efecto o una expresion se reproduce y sale PARECIDO — y "parecido" no se puede señalar con
// el dedo ni discutir con un cliente. Seguir de largo seria fabricar un video que dice ser una
// portacion fiel sin serlo.
//
// Los parametros llegan por archivo y no por linea de comandos porque `AfterFX.exe -r` no acepta
// argumentos. Ninguno. Es feo y es el unico camino.

import { existsSync, writeFileSync, mkdirSync, readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { llamarAE } from './llamar.mjs'
import { leerComp, documentoDe } from './comp.mjs'

const AQUI = dirname(new URL(import.meta.url).pathname.replace(/^\//, ''))
const P = (r) => join(AQUI, r).replace(/\//g, '\\')

const args = process.argv.slice(2)
const nombre = args.find(a => !a.startsWith('--'))
if (!nombre) {
  console.log('uso: node tools/ae/pieza.mjs <NOMBRE-DE-LA-COMP> [--mp4 salida.mp4] [--comparar] [--igual]')
  process.exit(2)
}
const iMp4 = args.indexOf('--mp4')
const mp4 = iMp4 >= 0 ? args[iMp4 + 1] : null
const comparar = args.includes('--comparar')
const igual = args.includes('--igual')

const DOC = 'C:/ae-probe/p3/motor/comp.json'
const paso = (n, t) => console.log(`\n[${n}] ${t}`)

// el nombre viaja por archivo, sin BOM: un BOM al principio hace que la comparacion de nombres falle
const pedir = (ruta) => writeFileSync(ruta, nombre, { encoding: 'utf8' })

// ---------------------------------------------------------------- 1. exportar
paso(1, `exportando "${nombre}" desde After Effects`)
pedir('C:/ae-probe/exportar-comp.txt')
let r = await llamarAE(P('sondas/exportar.jsx'), { esperaMs: 180000 })
if (!r.ok) { console.error(`  fallo: ${r.motivo}\n${r.texto || ''}`); process.exit(2) }
console.log(`  ${r.ms} ms`)

// ---------------------------------------------------------------- 2. documento
paso(2, 'armando el documento de escena')
const crudo = leerComp()
if (crudo.error) { console.error(`  la sonda informo: ${crudo.error}`); process.exit(2) }
const doc = documentoDe(crudo)
if (!existsSync(dirname(DOC))) mkdirSync(dirname(DOC), { recursive: true })
writeFileSync(DOC, JSON.stringify(doc, null, 1))
console.log(`  ${doc.capas.length} capas · ${doc.comp.ancho}x${doc.comp.alto} @ ${doc.comp.fps}fps · ${doc.comp.duracion}s`)

if (!doc.completo) {
  console.log('\n  LO QUE NO VIAJA:')
  for (const n of doc.noSoportado) console.log(`    capa ${n.capa}: ${n.que}${n.detalle && n.detalle !== '-' ? ` (${n.detalle})` : ''}`)
  for (const x of doc.rechazos) console.log(`    capa ${x.capa} ${x.prop}: ${x.motivo}`)
  if (!igual) {
    console.error('\n  ME PLANTO. Reproducir esto daria algo PARECIDO, que es peor que fallar.')
    console.error('  Si igual lo querés ver, agregá --igual y el video sale sabiendo qué le falta.')
    process.exit(1)
  }
  console.log('\n  --igual: sigo, pero el video NO es una portacion fiel.')
}

// ---------------------------------------------------------------- 3. reproducir y codificar
paso(3, 'reproduciendo en el navegador' + (mp4 ? ' y codificando' : ''))
// `--obturador N` se pasa tal cual al capturador: N muestras por cuadro dentro de la ventana del
// obturador. Sin el, se usa lo que diga el documento — que sale de la composicion, no de una opcion.
// `--rapido` FUERZA UNA MUESTRA POR CUADRO, y hace falta un atajo explicito porque el capturador
// respeta el documento: si la composicion trae el obturador con 16 muestras, una pieza de 10 s son
// 4800 capturas y ~17 minutos. Eso esta bien para el render final y mata la iteracion de diseño, que
// necesita ver la composicion en treinta segundos. El desenfoque no cambia una decision de layout.
const iObt = args.indexOf('--obturador')
const obturador = args.includes('--rapido') ? ['--obturador', '1']
  : iObt >= 0 ? ['--obturador', args[iObt + 1]] : []
const py = ['python', [P('motor/capturar-comp.py'), ...(mp4 ? ['--mp4', mp4] : []), ...obturador]]
r = spawnSync(py[0], py[1], { encoding: 'utf8' })
process.stdout.write(r.stdout || '')
if (r.status !== 0) { console.error(r.stderr || '  la captura fallo'); process.exit(2) }

// ---------------------------------------------------------------- la tira para mirarla
// Iterar diseño exige VER, y una hoja de comparacion contra AE esta hecha para otra cosa: sus celdas
// van a 1:4 y a esa escala un texto chico se vuelve ilegible. Con --tira sale una a 1:3, repartida
// sobre toda la pieza, que es con la que se puede juzgar composicion.
if (args.includes('--tira')) {
  const t = spawnSync('node', [P('tira.mjs'), '--cuadros', '9', '--cols', '3', '--ancho', '620'], { encoding: 'utf8' })
  process.stdout.write(t.stdout || '')
}

// ---------------------------------------------------------------- 4 y 5. comparar contra AE
if (comparar) {
  paso(4, 'renderizando la misma composicion en After Effects')
  pedir('C:/ae-probe/render-comp.txt')
  r = await llamarAE(P('sondas/render.jsx'), { esperaMs: 600000 })
  if (!r.ok) { console.error(`  fallo: ${r.motivo}`); process.exit(2) }

  // AE ESCRIBE LOS PNG DE FORMA DIFERIDA: el volcado dice "listo" y los archivos siguen apareciendo
  // durante decenas de segundos. Medido: 4,9 s el texto contra 23 s los cuadros.
  const { esperarPNGs } = await import('./png.mjs')
  const dir = `C:/ae-probe/render/${nombre}`
  const total = Math.floor(doc.comp.duracion * doc.comp.fps)
  const rutas = Array.from({ length: total }, (_, k) => `${dir}/f${String(k).padStart(3, '0')}.png`)
  const espera = await esperarPNGs(rutas, 300000)
  if (espera.faltan.length) {
    console.error(`  faltan ${espera.faltan.length} de ${total} PNG tras ${(espera.ms / 1000).toFixed(0)} s`)
    process.exit(2)
  }
  console.log(`  ${total} cuadros (${(espera.ms / 1000).toFixed(1)} s de escritura diferida)`)

  paso(5, 'comparando After Effects contra el reproductor')
  const c = spawnSync('node', [P('comp-check.mjs')], { encoding: 'utf8' })
  process.stdout.write(c.stdout || '')
  if (c.stderr) process.stderr.write(c.stderr)
  process.exit(c.status ?? 0)
}

console.log(`\nlisto${mp4 ? `: ${mp4}` : ''}`)
