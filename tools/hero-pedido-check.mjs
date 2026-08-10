// COMPUERTA E-HERO-PEDIDO — si pediste un hero y HABIA LUGAR, la escena de hero entra.
//
// El reclamo fue "los heros no pude usarlos", y la causa era que `--hero X` ponia X en el spec y nada
// mas: que la escena `hero` ENTRARA al plan seguia siendo un sorteo entre veinte escenas. Fallaba en
// silencio y con un video valido, que es la clase de defecto que solo caza una compuerta.
//
// ESTA COMPUERTA ESTA PROBADA CONTRA EL DEFECTO, no solo escrita. Desactivando el bloque `fija` de
// guion.js informa 82 fallos y sale con codigo 1; con el bloque puesto, 360 de 360 y codigo 0. Una
// compuerta que nunca vio rojo no se sabe si mide algo — la primera version de esta pasaba VERDE con
// el bug puesto, por la cuenta circular que se explica abajo.
//
// LO QUE NO SE EXIGE, a proposito: que entre cuando NO CABE. Con 12 s a la velocidad de `editorial`
// quedan 6 beats libres y la escena de hero pide 8 — ahi la respuesta correcta es no meterla y
// decirlo, y `motor.py` lo dice nombrando la duracion. Exigir que entre siempre obligaria a recortar
// otra escena o a estirar la pieza, que es peor que un aviso.
//
// Uso:  node tools/hero-pedido-check.mjs
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
const { guionDe } = await import(pathToFileURL(join(DEMO, 'guion.js')).href)

// EL CATALOGO SE ARMA IMPORTANDO LAS ESCENAS, no copiando sus beats a mano. `guion-check.mjs` tiene la
// lista escrita y su propio comentario cuenta como se desincronizo: se agregaron seis escenas y la
// compuerta siguio informando "todas (16 escenas)" sobre un catalogo de veintidos. Importar cuesta un
// segundo y no se puede desincronizar.
const CAT = new Map()
for (const f of readdirSync(join(DEMO, 'escenas'))) {
  if (!f.endsWith('.js') || f === 'index.js') continue
  const id = f.replace(/\.js$/, '')
  try {
    const mod = await import(pathToFileURL(join(DEMO, 'escenas', f)).href)
    if (mod && mod.meta) CAT.set(id, mod.meta)
  } catch { /* una escena que no importa no es asunto de esta compuerta */ }
}

// LAS PAGINAS SON LAS CAPTURADAS, no un dato inventado. Una pagina de laboratorio con material
// perfecto haria pasar la compuerta sin probar nada: el bug aparecia justo cuando el presupuesto
// estaba ajustado, que es lo que produce el material real.
const paginas = []
for (const nom of readdirSync(MOTOR)) {
  const f = join(MOTOR, nom, 'datos.json')
  if (!existsSync(f)) continue
  try {
    const j = JSON.parse(readFileSync(f, 'utf8'))
    if (j && j.datos) paginas.push({ nom, d: j.datos })
  } catch { /* un datos.json roto no es asunto de esta compuerta */ }
}
// SIN PAGINAS NO SE APAGA SOLA, FALLA. La version anterior de estas cuatro lineas imprimia
// "GATE HERO-PEDIDO OK (omitida: ...)" y salia con 0 — o sea que en una copia del repo sin capturas la
// compuerta sumaba un OK al guard sin haber medido un solo guion. Es el mismo defecto que `CLAUDE.md`
// documenta para `heroes-check` ("la primera version se apagaba sola") y el que hace que un guard
// verde no signifique nada. El resto del guard ya asume que hay capturas: `captura-check` recorre este
// mismo directorio.
if (paginas.length < 3) {
  console.log(`GATE HERO-PEDIDO FAIL (hacen falta 3 paginas capturadas en tools/out/motor y hay ${paginas.length})`)
  console.log('   Captura alguna:  python backend/motor.py https://stripe.com --dur 20')
  process.exit(1)
}

if (!CAT.has('hero')) { console.log('GATE HERO-PEDIDO FAIL (no se pudo importar la escena `hero`)'); process.exit(1) }
const beatsHero = CAT.get('hero').beats || 8
const beatsDe = (id) => (CAT.get(id) || {}).beats || 0

let conLugar = 0, entro = 0, sinLugar = 0, pedidos = 0
const fallos = []
const RITMO = 60 / 124                             // beatSeg por defecto de `guionDe`

for (const p of paginas) {
  for (const dur of [12, 15, 20, 25, 30]) {
    for (let seed = 1; seed <= 6; seed++) {
      let ids
      try { ids = guionDe({ escenas: CAT, datos: p.d, seed, dur, fija: 'hero' }) } catch { continue }
      if (!Array.isArray(ids)) continue
      pedidos++
      if (ids.includes('hero')) { entro++; conLugar++; continue }
      // NO CABER ES UNA RESPUESTA VALIDA y hay que distinguirla de un fallo — pero la primera version
      // de esta cuenta era CIRCULAR y por eso la compuerta no cazaba nada. Comparaba el presupuesto
      // contra los beats que la pieza USO: cuando el hero se cae, las otras escenas del medio ocupan su
      // hueco, la pieza queda llena y el fallo se lee como "no habia lugar". Desactivando a mano el
      // bloque `fija` el barrido informo "82 no entraban en la duracion" y salio VERDE con el bug
      // puesto, que es exactamente el filtro que no filtra nada.
      //
      // Lo que hay que medir es el espacio POR EL QUE COMPITE EL MEDIO: el presupuesto menos las
      // escenas estructurales, que entran si o si y no se le pueden sacar a nadie. Ese es el numero que
      // ve `llenar`, y contra ese se decide si el hero tenia lugar.
      const ESTRUCTURA = new Set(['gancho', 'apertura', 'bandera', 'cierre'])
      const beatsFijos = ids.filter(id => ESTRUCTURA.has(id)).reduce((n, id) => n + beatsDe(id), 0)
      const presupuesto = dur / RITMO
      if (presupuesto - beatsFijos >= beatsHero) {
        conLugar++
        fallos.push(`${p.nom} dur=${dur}s seed=${seed} el medio tenia ${Math.floor(presupuesto - beatsFijos)} beats y el hero pide ${beatsHero} -> ${ids.join(',')}`)
      } else sinLugar++
    }
  }
}

if (fallos.length) {
  console.log(`GATE HERO-PEDIDO FAIL (${fallos.length} de ${conLugar} pedidos CON LUGAR no metieron la escena de hero)`)
  for (const f of fallos.slice(0, 12)) console.log('   ' + f)
  if (fallos.length > 12) console.log(`   ... y ${fallos.length - 12} mas`)
  process.exit(1)
}
if (!pedidos) { console.log('GATE HERO-PEDIDO FAIL (no se midio un solo guion: el catalogo o los datos no cargaron)'); process.exit(1) }
console.log(`GATE HERO-PEDIDO OK — ${pedidos} guiones (${paginas.length} paginas x 5 duraciones x 6 semillas): ` +
  `${conLugar} pedidos tenian lugar y los ${entro} metieron la escena de hero; ${sinLugar} no entraban en la duracion.`)
