// ¿COMPILA EL REPRODUCTOR? — la compuerta mas barata del repo y la que mas veces me hizo falta hoy.
//
// POR QUE EXISTE. Los dos reproductores son HTML con un `<script type="module">` adentro, y nada los
// revisa: `node --check` no lee HTML y el navegador recien se queja cuando ya se pago una captura. Hoy
// rompi la sintaxis TRES veces y las tres me entere tarde y mal:
//
//   1. un salto de linea REAL dentro de un literal de comillas simples -> el archivo entero dejo de
//      compilar y el render salio NEGRO de punta a punta, sin un error visible en la captura;
//   2. lo mismo otra vez, en otro archivo;
//   3. un comentario con `backticks` para citar un identificador, ADENTRO de un literal de plantilla
//      delimitado por backticks: lo cerro a la mitad y el error salio como "missing ) after argument
//      list" cuarenta lineas mas abajo.
//
// Las tres son la misma familia —un literal que se cierra donde no corresponde— y las tres cuestan
// segundos de detectar y media hora de diagnosticar. Esta compuerta corre en milisegundos, no abre un
// navegador y no toca el disco.
//
// COMO FUNCIONA. Se extrae el modulo, se escribe a un archivo temporal y se le pide a Node que lo
// PARSEE (`--check`), que es exactamente la pregunta: ¿esto es JavaScript valido? No se ejecuta nada.
//
// LO QUE NO DICE: si el codigo hace lo correcto. Dice si compila. Un reproductor que compila y dibuja
// mal es el trabajo de `motor-check` y de mirar cuadros.
//
// USO
//   node tools/ae/reproductor-check.mjs

import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

// se pueden pasar rutas por linea de comandos, que es lo que permite probar que la compuerta SABE
// fallar sin tener que romper un archivo de verdad
const ARCHIVOS = process.argv.length > 2 ? process.argv.slice(2) : [
  'tools/ae/motor/comp3d.html',
  'tools/ae/motor/comp.html',
  'tools/ae/motor/escena.html',
]

const carpeta = mkdtempSync(join(tmpdir(), 'repro-'))
let malos = 0, revisados = 0

for (const ruta of ARCHIVOS) {
  let html
  try { html = readFileSync(ruta, 'utf8') } catch { console.log(`  (no existe ${ruta})`); continue }

  // se toman TODOS los bloques de script, no solo el primero: un segundo bloque roto es igual de fatal
  // y es justo el que uno se olvida de mirar
  const bloques = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
    .map(m => m[1])
    .filter(t => t.trim() && !/^\s*\{/.test(t.trim()))   // los import-map son JSON, no JS

  if (!bloques.length) { console.log(`  ${ruta}: sin bloques de script`); continue }

  bloques.forEach((codigo, i) => {
    revisados++
    // LAS LINEAS SE CONSERVAN para que el numero que informe Node sea el del HTML. Sin esto el error
    // sale en "linea 12" de un archivo que no existe y hay que contar a mano.
    const antes = html.slice(0, html.indexOf(codigo)).split('\n').length - 1
    const f = join(carpeta, `b${revisados}.mjs`)
    writeFileSync(f, '\n'.repeat(antes) + codigo)
    try {
      execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' })
      console.log(`  ok    ${ruta}${bloques.length > 1 ? ` (bloque ${i + 1})` : ''}`)
    } catch (e) {
      malos++
      const salida = (e.stderr?.toString() || e.message).split('\n')
        .filter(l => l.trim() && !l.includes(carpeta) && !/^\s*at /.test(l) && !l.includes('Node.js v'))
      console.log(`  ROTO  ${ruta}${bloques.length > 1 ? ` (bloque ${i + 1})` : ''}`)
      for (const l of salida.slice(0, 6)) console.log(`          ${l}`)
    }
  })
}

console.log('')
console.log('='.repeat(72))
if (!malos) console.log(`REPRODUCTOR OK — ${revisados} bloque(s) de script compilan`)
else console.log(`REPRODUCTOR NO PASA — ${malos} de ${revisados} bloque(s) no compilan`)
process.exit(malos ? 1 : 0)
