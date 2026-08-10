// HERRAMIENTA — cuantos heroes puede sostener CADA PAGINA que hay capturada, y al reves.
//
// No es una compuerta: mide y saca una tabla. Existe porque el reclamo fue "los heros no pude
// usarlos", y antes de mejorar nada hay que saber DONDE no se pueden usar y por que. Son dos causas
// distintas y se arreglan distinto:
//
//   · falta MATERIAL   — la pagina no dio recortes, o no dio suficientes para ese hero
//   · no encaja el AIRE — el hero existe y hay material, pero el REGISTRO no se lo ofrece a ese aire
//
// Confundirlas manda a tocar el extractor cuando el problema era una lista de aires, y al reves.
//
// No renderiza y no captura: lee lo que ya hay en tools/out/motor/. Corre en segundos.
// Uso:  node tools/heroes-cobertura.mjs
import { pathToFileURL, fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { readdirSync, existsSync, readFileSync } from 'node:fs'
import { createCanvas } from '@napi-rs/canvas'

const HERE = dirname(fileURLToPath(import.meta.url))
const RAIZ = join(HERE, '..')
const DEMO = join(RAIZ, 'render3d', 'demo')
const MOTOR = join(RAIZ, 'tools', 'out', 'motor')

globalThis.document = {
  createElement: (t) => (t === 'canvas' ? createCanvas(4, 4) : { style: {} }),
  getElementById: () => createCanvas(4, 4),
  fonts: { ready: Promise.resolve(), load: async () => {}, add() {}, check: () => true, *[Symbol.iterator]() {} },
}
globalThis.FontFace = class { constructor(f) { this.family = f } async load() { return this } }
globalThis.window = globalThis
console.warn = () => {}
const { gsap } = await import(pathToFileURL(join(RAIZ, 'node_modules', 'gsap', 'dist', 'gsap.js')).href)
globalThis.gsap = gsap
await import(pathToFileURL(join(RAIZ, 'node_modules', 'three', 'build', 'three.module.js')).href)
const { HEROES, elegibles, airesDe } = await import(pathToFileURL(join(DEMO, 'heroes', 'index.js')).href)

// LOS AIRES SE LEEN DEL DIRECTORIO y no de una lista escrita a mano: una lista copiada se
// desincroniza el dia que alguien agrega un aire, y el informe mentiria por omision sin avisar.
const AIRES = readdirSync(join(DEMO, 'aires'))
  .filter(f => f.endsWith('.js') && f !== 'index.js')
  .map(f => f.replace(/\.js$/, ''))

// ---- las paginas: las que hay capturadas, con el material que REALMENTE dieron
const paginas = []
for (const nom of readdirSync(MOTOR)) {
  const dir = join(MOTOR, nom)
  const site = join(dir, 'site.json')
  if (!existsSync(site)) continue
  let s
  try { s = JSON.parse(readFileSync(site, 'utf8')) } catch { continue }
  const els = Array.isArray(s.elementos) ? s.elementos : []
  const disponible = new Set()
  if (existsSync(join(dir, 'tira.png'))) disponible.add('tira')
  if (els.length) disponible.add('elementos')
  // Un muro anti-bot no es una pagina pobre: es una pagina que el motor SE NIEGA a usar, y contarla
  // como "0 de 18 heroes" ensuciaria el promedio con un caso que no es del catalogo de heroes.
  //
  // Y HAY UN TERCER ESTADO, que aparecio midiendo: `despegar` no dice "Access Denied" en ningun lado
  // —su bloqueo se dibuja como imagen— pero su `content` viene ENTERO VACIO: sin titulos, sin nav, sin
  // ctas, sin parrafos, sin bodyText. Buscarle la frase al muro no alcanza; lo que delata a esa clase
  // de pagina es que no dejo NADA de donde escribir un guion. Contarla como "pagina pobre de 0
  // elementos" le echaria al catalogo de heroes la culpa de un problema de captura.
  const txt = ((s.content && JSON.stringify(s.content)) || '').toLowerCase()
  const muro = /access denied|acceso est[aá] restringido|permission to access|attention required/.test(txt)
  const c = s.content || {}
  const vacia = !muro && !((c.headings || []).length + (c.titulares || []).length +
    (c.nav || []).length + (c.ctas || []).length + (c.paragraphs || []).length +
    String(c.bodyText || '').length)
  // La URL real, para que el comando que sale abajo se pueda copiar y pegar. El nombre del directorio
  // es la URL con los puntos cambiados por guiones, y eso NO se puede revertir sin adivinar:
  // `cliping-ia-vercel-app` puede ser cliping-ia.vercel.app o cliping.ia.vercel.app.
  let url = null
  try {
    const pm = join(dir, 'pagemodel.json')
    if (existsSync(pm)) {
      const m = readFileSync(pm, 'utf8').match(/"(https?:\/\/[^"]{5,80})"/)
      if (m && !m[1].includes('cloudinary')) url = m[1]
    }
  } catch { /* sin URL se cae al nombre del directorio, que sigue identificando la pagina */ }
  paginas.push({ nom, els, disponible, muro, vacia, url })
}
paginas.sort((a, b) => b.els.length - a.els.length)

const util = paginas.filter(p => !p.muro && !p.vacia)
const muros = paginas.filter(p => p.muro)
const vacias = paginas.filter(p => p.vacia)

// `console.log` de node NO entiende el ancho de printf: `%-26s` sale literal. Se alinea a mano.
const P = (v, n) => String(v).padEnd(n)
const D = (v, n) => String(v).padStart(n)
console.log(`\nCOBERTURA DE HEROES — ${HEROES.length} heroes x ${util.length} paginas capturadas x ${AIRES.length} aires\n`)

// ---- por pagina: cuantos de los 18 puede sostener, con material y sin mirar aire
console.log('  POR PAGINA — con el material que dio (sin filtrar por aire)')
console.log('  ' + P('pagina', 26) + D('els', 4) + '  ' + P('tira', 5) + ' heroes')
for (const p of util) {
  const ok = elegibles(p.disponible, null, p.els.length ? p.els : null, null)
  const faltan = HEROES.filter(h => !ok.includes(h)).map(h => h.meta.id)
  console.log('  ' + P(p.nom, 26) + D(p.els.length, 4) + '  ' +
    P(p.disponible.has('tira') ? 'si' : 'NO', 5) + D(ok.length, 2) + '/' + HEROES.length +
    (faltan.length ? '   sin material: ' + faltan.join(' ') : ''))
}
if (muros.length) {
  console.log(`\n  (${muros.length} muro${muros.length === 1 ? '' : 's'} anti-bot fuera de la cuenta: ` +
    muros.map(m => m.nom).join(', ') + ' — el motor se niega a construir sobre ellos)')
}
if (vacias.length) {
  console.log(`  (${vacias.length} sin NADA de contenido, fuera de la cuenta: ` +
    vacias.map(m => m.nom).join(', ') + ' — no es falta de heroes, es una captura que no trajo texto)')
}

// ---- por hero: en cuantas paginas hay material, y a cuantos aires se le ofrece
console.log('\n  POR HERO — material disponible y alcance de aire')
console.log('  ' + P('hero', 11) + P('necesita', 10) + P('paginas', 9) + P('aires', 7) + 'a que aires se le ofrece')
const flojos = []
for (const h of HEROES) {
  const conMat = util.filter(p => elegibles(p.disponible, null, p.els.length ? p.els : null, null).includes(h))
  const ai = airesDe(h.meta.id)
  const nAi = ai.length ? ai.length : AIRES.length
  console.log('  ' + P(h.meta.id, 11) + P((h.meta.necesita || ['nada']).join('+'), 10) +
    P(D(conMat.length, 2) + '/' + util.length, 9) + P(D(nAi, 2) + '/' + AIRES.length, 7) +
    (ai.length ? ai.join(' ') : '(todos)'))
  // El producto es lo que de verdad puede pedir el usuario: pagina Y aire a la vez.
  if (conMat.length * nAi < util.length * AIRES.length * 0.25) {
    flojos.push([h.meta.id, conMat.length, nAi, conMat.length * nAi])
  }
}

// ---- LO ACCIONABLE: un comando que de verdad entregue cada hero.
//
// Esta es la seccion que contesta el reclamo. Saber que `pulso` cubre 5 aires no le sirve a nadie que
// acaba de pedirlo y recibio un telefono; lo que sirve es la linea exacta que lo entrega. Se simula el
// MISMO camino que corre `escenas/hero.js`: `elegibles(...)` con el material y el aire, y despues
// buscar el id pedido en esa lista — si no esta, el pedido no se cumple y sale otro hero.
console.log('\n  COMO PEDIR CADA HERO — primera combinacion que lo entrega de verdad')
const sinForma = []
for (const h of HEROES) {
  const ai = airesDe(h.meta.id)
  const aires = ai.length ? ai : AIRES
  let linea = null
  for (const p of util) {
    for (const a of aires) {
      const posibles = elegibles(p.disponible, a, p.els.length ? p.els : [], null)
      if (posibles.findIndex(x => x.meta.id === h.meta.id) >= 0) {
        linea = `--hero ${h.meta.id} --aire ${a}   (${p.url || p.nom})`
        break
      }
    }
    if (linea) break
  }
  if (linea) console.log('    ' + P(h.meta.id, 11) + linea)
  else { console.log('    ' + P(h.meta.id, 11) + 'NINGUNA de las ' + (util.length * aires.length) + ' combinaciones lo entrega'); sinForma.push(h.meta.id) }
}
if (sinForma.length) console.log('\n    NO SE PUEDEN PEDIR: ' + sinForma.join(', '))
else console.log('\n    los ' + HEROES.length + ' se pueden pedir con el material capturado')

const totalPosible = util.length * AIRES.length
console.log('\n  LOS MAS DIFICILES DE PEDIR (menos de un cuarto de las combinaciones pagina x aire)')
if (!flojos.length) console.log('    ninguno')
for (const [id, np, na, prod] of flojos.sort((a, b) => a[3] - b[3])) {
  console.log('    ' + P(id, 11) + D(np, 2) + ' paginas x ' + D(na, 2) + ' aires = ' +
    D(prod, 3) + ' de ' + totalPosible + ' combinaciones (' +
    Math.round(100 * prod / totalPosible) + '%)')
}
console.log('')
