// COMPUERTA E-HERO-ELEGIBLE — un hero no se ofrece si no tiene con que.
//
// `meta.necesita` dice QUE CLASE de material hace falta ('tira', 'elementos') y es un BOOLEANO: con un
// solo recorte se ofrecia el `cubo`, que reparte imagenes sobre seis caras y DETIENE el tumbo en cada
// una para que se lean. Con el material real de basecamp —5 elementos, dos en sus roles— las seis caras
// mostraban las mismas dos imagenes tres veces cada una. Ninguna compuerta miraba la CANTIDAD, porque
// ninguna mide repeticion de contenido: dos caras pueden estar perfectamente compuestas y decir lo mismo.
//
// Un hero que necesita cantidad la declara con `meta.puede(datosEls)`, y `elegibles` lo descarta ANTES
// de construirlo — antes y no despues, porque `recortesDe` consume del reparto compartido y construir
// un hero para tirarlo le sacaria recortes a la escena que sigue.
//
// Se comprueban tres cosas, y la lista de a quien exigirselas esta ABAJO en `CUPOS`, escrita como
// requisito y no leida del codigo (ver la nota larga ahi: la primera version se apagaba sola):
//   1. El hero con cupo NO se ofrece con el material pobre que documenta su ficha.
//   2. Y SI se ofrece con el material real de una pagina normal — un filtro que no deja pasar a nadie
//      no es un filtro, es un hero borrado del catalogo.
//   3. La red de seguridad sigue puesta: con el peor material imaginable `elegibles` nunca devuelve
//      vacio, porque una escena sin sujeto es peor que un objeto abstracto.
//
// Uso:  node tools/heroes-check.mjs
import { pathToFileURL } from 'node:url'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createCanvas } from '@napi-rs/canvas'

const HERE = dirname(fileURLToPath(import.meta.url))
const RAIZ = join(HERE, '..')
const DEMO = join(RAIZ, 'render3d', 'demo')

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
const { HEROES, elegibles } = await import(pathToFileURL(join(DEMO, 'heroes', 'index.js')).href)

// EL MATERIAL ES EL DE PAGINAS REALES, no uno inventado para que pase. Los conteos salen de las
// capturas que hay en tools/out/motor: tres paginas dan CERO elementos y las otras dan 5, 8 y 9 en rol.
// El caso POBRE es el de basecamp que documenta la ficha del cubo.
const POBRE = [
  { rol: 'foto', url: 'p-el4-foto.png' }, { rol: 'foto', url: 'p-el5-foto.png' },
  { rol: 'cta', url: 'p-el1-cta.png' }, { rol: 'cta', url: 'p-el2-cta.png' },
  { rol: 'cta', url: 'p-el3-cta.png' },
]
const RICO = [
  { rol: 'logo', url: 'r1' }, { rol: 'cta', url: 'r2' }, { rol: 'hero', url: 'r3' },
  { rol: 'foto', url: 'r4' }, { rol: 'foto', url: 'r5' }, { rol: 'foto', url: 'r6' },
  { rol: 'tarjeta', url: 'r7' }, { rol: 'tarjeta', url: 'r8' },
]

// EL REQUISITO SE DECLARA ACA, NO SE LEE DEL CODIGO. La primera version recorria los heroes que tenian
// `meta.puede` y comprobaba que filtraran: contra el codigo VIEJO eso daba verde, porque no habia
// ninguno — cero heroes revisados, cero fallos, y el defecto intacto delante. Una compuerta que se
// apaga sola cuando desaparece el mecanismo que audita no audita nada.
//
// Asi que la lista es del requisito: estos heroes reparten imagenes sobre varias superficies y se
// DETIENEN en cada una para que se lean, o sea que repetir material no es un detalle sino la escena
// entera diciendo lo mismo varias veces. Que lo resuelvan con `meta.puede` o de otra forma es asunto
// suyo; lo que esta compuerta exige es el resultado.
const CUPOS = [
  { id: 'cubo', porque: 'reparte imagenes sobre seis caras y el tumbo se detiene en cada una' },
]

// LO QUE ESTA COMPUERTA NO CUBRE, DICHO ACA PARA QUE NO SE LEA COMO QUE SI.
//
// `elegibles` se llama aca SIN texturas, asi que `meta.puede` cuenta por ROL. El caso que de verdad
// importa es otro: el veto de laminas (`texturaDe`) saca recortes mirando sus PIXELES, y saca DESPUES
// de que el cupo dijo que si. Medido con linear.app recapturado —7 elementos, 3 testimonios— el cubo
// cuenta 4 por rol y solo 2 sobreviven: contando por rol se ofrece, contando lo que vive no.
//
// Probarlo aca es posible y la receta esta: `loadImage` de @napi-rs/canvas devuelve una imagen que
// `esLamina` sabe leer en Node, y los PNG estan en `tools/out/motor/*/elementos/`. No se hizo porque
// esa carpeta no viaja en el repo y la compuerta quedaria pasando sobre cero archivos en un clon nuevo
// —el mismo verde vacio que ya aparecio en `placeholder-check`—. Cuando haya fixtures de recortes
// versionados, este es el lugar.

const fallos = []
const idsPobre = elegibles(new Set(['elementos', 'tira']), null, POBRE).map(h => h.meta.id)
const idsRico = elegibles(new Set(['elementos', 'tira']), null, RICO).map(h => h.meta.id)

for (const { id, porque } of CUPOS) {
  if (!HEROES.some(h => h.meta.id === id)) { fallos.push(`${id}: no existe en el catalogo`); continue }
  if (idsPobre.includes(id)) {
    fallos.push(`${id}: se OFRECE con material pobre (2 recortes en sus roles) — ${porque}, `
      + 'asi que repetiria la misma imagen en varias superficies')
  }
  if (!idsRico.includes(id)) {
    fallos.push(`${id}: NO se ofrece ni con material rico (8 recortes) — el cupo lo borro del catalogo`)
  }
}

// La red de seguridad: sin tira y sin elementos tiene que quedar alguien.
const pelado = elegibles(new Set(), null, [])
if (!pelado.length) fallos.push('sin material no queda NINGUN hero: una escena sin sujeto es peor que un objeto abstracto')
// Y con un aire cualquiera tampoco puede quedar vacio.
for (const aire of ['lujo', 'tecnico', 'gastronomico', 'deportivo', 'editorial', 'jugueton',
  'artesanal', 'bienestar', 'corporativo', 'inmobiliario', 'nocturno']) {
  if (!elegibles(new Set(), aire, []).length) fallos.push(`sin material y con aire ${aire} no queda ningun hero`)
}

if (fallos.length) {
  console.log(`GATE HEROES FAIL (${fallos.length}):`)
  for (const f of fallos) console.log('  ' + f)
  process.exit(1)
}
console.log(`GATE HEROES OK (${HEROES.length} heroes, ${CUPOS.length} con cupo de material: `
  + `rechazan lo pobre, aceptan lo real, y nunca queda la escena sin sujeto).`)
