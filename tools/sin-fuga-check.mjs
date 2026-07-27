// GATE sin-fuga — prohibe `getImageData` en las herramientas que corren sobre @napi-rs/canvas.
//
// No es una regla de estilo. Esa funcion no libera nunca su buffer nativo y V8 ni se entera, asi que
// no dispara el recolector: medido a 540x960 son ~2 MB por llamada que jamas vuelven. Un gate que
// recorre 44.104 frames pide 88 GB. En una maquina de 15 GB eso no es lentitud — es el sistema
// operativo congelandose y el usuario apagando a la fuerza. Paso tres veces en un dia.
//
// La alternativa es tools/lib/pixeles.mjs, que usa `canvas.data()` (3000 llamadas = +7 MB) y COPIA,
// porque `data()` devuelve una vista VIVA del lienzo: sin copiar, un gate que compara dos frames los
// leeria identicos y pasaria en verde justo cuando el motor esta roto.
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
// Los que empiezan con "_" son sondas sueltas de un solo uso, no entran a la cadena.
const ARCH = readdirSync(HERE).filter(f => f.endsWith('.mjs') && !f.startsWith('_') && f !== 'sin-fuga-check.mjs')

let fails = 0
for (const f of ARCH) {
  const s = readFileSync(join(HERE, f), 'utf8')
  if (!/@napi-rs\/canvas/.test(s)) continue
  const lineas = s.split('\n')
  lineas.forEach((l, i) => {
    if (l.includes('getImageData') && !l.trim().startsWith('//')) {
      console.error(`FAIL  tools/${f}:${i + 1} usa getImageData — usa pixeles() de lib/pixeles.mjs`)
      console.error(`      ${l.trim().slice(0, 100)}`)
      fails++
    }
  })
}
if (fails) { console.error(`\nGATE SIN-FUGA: ${fails} FAIL`); process.exit(1) }
console.log(`GATE SIN-FUGA OK (${ARCH.length} herramientas: ninguna lee pixeles con la funcion que gotea).`)
