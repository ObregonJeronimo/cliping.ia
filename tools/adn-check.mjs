// GATE del ADN: la identidad medida de la página tiene que LLEGAR A LA PANTALLA, y legible.
//
// Este gate existe porque el defecto que arregla era invisible desde el código: el motor medía fondo,
// acento, tinta y tipografía de cada página, y después construía el video con la paleta escrita a mano
// en el aire. Nada fallaba. Simplemente todos los videos salían iguales, y hacía falta ponerlos al lado
// para verlo. Un gate convierte eso en un número.
//
// Prueba el producto cruzado FIXTURES × AIRES, que es lo que el motor va a producir de verdad, y
// controla cuatro cosas:
//   E-ADN-POLARIDAD  el mundo es claro si y sólo si la página medida es clara
//   E-ADN-HUE        el acento conserva el TONO de la marca (±14°) cuando la marca tiene color
//   E-ADN-LEGIBLE    tinta y los tres acentos tienen contraste suficiente contra SU fondo
//   E-ADN-VARIEDAD   dos páginas distintas con el mismo aire NO dan la misma paleta,
//                    y una misma página con aires distintos TAMPOCO
//
// El de VARIEDAD es el que responde al reclamo textual del usuario: "en todos los ejemplos q me
// mandaste se vieron videos identicos".
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// Los aires son módulos de navegador: algunos registran fuentes con FontFace al importarse. El stub es
// lo mínimo para que `import` no explote en Node — no se ejecuta nada de render acá.
globalThis.document = { fonts: { *[Symbol.iterator]() {}, add() {}, check: () => true, load: async () => {} } }
globalThis.FontFace = class { async load() { return this } }

const HERE = dirname(fileURLToPath(import.meta.url))
const { personalizar, contraste, aHsl, SAT_GRIS } = await import('../render3d/demo/adn.js')

const dirAires = join(HERE, '..', 'render3d', 'demo', 'aires')
const dirFix = join(HERE, 'fixtures', 'director', 'elementos')
const AIRES = {}
for (const f of readdirSync(dirAires).filter(f => f.endsWith('.js'))) {
  AIRES[f.replace('.js', '')] = (await import(`../render3d/demo/aires/${f}`)).default
}
const FIX = readdirSync(dirFix).filter(f => f.endsWith('.json'))
  .map(f => ({ id: f.replace('.json', ''), pm: JSON.parse(readFileSync(join(dirFix, f), 'utf8')) }))
  .filter(x => x.pm.dna && x.pm.dna.palette)

const fallos = []
const F = (cod, msg) => fallos.push(`${cod}  ${msg}`)
// Distancia angular de tono: 350° y 10° están a 20°, no a 340°.
const dHue = (a, b) => Math.abs(((a - b) % 360 + 540) % 360 - 180)

const porAire = {}
for (const { id, pm } of FIX) {
  for (const [nombreAire, aire] of Object.entries(AIRES)) {
    const a = personalizar(aire, pm.dna, () => 0.5)
    const P = a.paleta
    const etiq = `${id} × ${nombreAire}`

    const claroMedido = pm.dna.palette.bgLum > 0.42
    if (a.claro !== claroMedido) {
      F('E-ADN-POLARIDAD', `${etiq}: la página mide bgLum ${pm.dna.palette.bgLum} y el aire salió ${a.claro ? 'claro' : 'oscuro'}`)
    }

    const marca = pm.dna.palette.accentText || pm.dna.palette.accent
    if (marca && aHsl(marca).s >= SAT_GRIS) {
      const d = dHue(aHsl(P.acento).h, aHsl(marca).h)
      if (d > 14) F('E-ADN-HUE', `${etiq}: la marca es ${marca} (tono ${aHsl(marca).h.toFixed(0)}°) y el acento salió ${P.acento} (${aHsl(P.acento).h.toFixed(0)}°), ${d.toFixed(0)}° de corrimiento`)
    }

    const piso = a.claro ? 3.2 : 2.6
    const chequeos = [['tinta', P.tinta, 6.5], ['acento', P.acento, piso],
      ['acento2', P.acento2, piso], ['calido', P.calido, piso * 0.85]]
    for (const [rol, col, min] of chequeos) {
      const c = contraste(col, P.bg)
      if (c < min - 0.05) F('E-ADN-LEGIBLE', `${etiq}: ${rol} ${col} sobre ${P.bg} da ${c.toFixed(2)}:1, hace falta ${min}`)
    }

    ;(porAire[nombreAire] ||= []).push({ id, firma: JSON.stringify(P) })
  }
}

// VARIEDAD entre páginas: el mismo aire con dos ADN distintos no puede dar la misma paleta.
for (const [nombreAire, filas] of Object.entries(porAire)) {
  const vistos = new Map()
  for (const { id, firma } of filas) {
    if (vistos.has(firma)) F('E-ADN-VARIEDAD', `${nombreAire}: "${id}" y "${vistos.get(firma)}" dan la MISMA paleta`)
    else vistos.set(firma, id)
  }
}
// VARIEDAD entre aires: una misma página con dos aires distintos tampoco. Sin esto, el ADN pisaría
// tanto que los once aires colapsarían en uno — el error opuesto y igual de malo.
for (const { id, pm } of FIX) {
  const vistos = new Map()
  for (const [nombreAire, aire] of Object.entries(AIRES)) {
    const f = JSON.stringify(personalizar(aire, pm.dna, () => 0.5).paleta)
    if (vistos.has(f)) F('E-ADN-VARIEDAD', `${id}: los aires "${nombreAire}" y "${vistos.get(f)}" dan la MISMA paleta — el ADN pisó la personalidad`)
    else vistos.set(f, nombreAire)
  }
}

// ---------------------------------------------------------------- E-ADN-AIRE-MUERTO
// Once aires escritos, nueve alcanzables. "bienestar" y "deportivo" no los producia NINGUNA entrada
// posible: existian, se mantenian, y ningun video del mundo iba a usarlos. Un gimnasio recibia el aire
// de una panaderia porque los dos son 'servicio-local'.
//
// Se barre una grilla de paginas plausibles —los ocho rubros que el clasificador puede devolver, por
// energia, calidez y registro— y se exige que cada aire de la carpeta salga al menos una vez. Es la
// unica forma de que "escribi un aire nuevo" y "el motor puede elegirlo" sean la misma cosa: sin esto
// las dos afirmaciones se separan en silencio y nadie se entera hasta que alguien las cuenta.
const { aireDe } = await import('./anthem-datos.mjs')
const RUBROS = ['saas', 'app', 'ecommerce', 'servicio-local', 'educacion', 'media', 'portfolio',
  'evento', 'otro']
const producidos = new Set()
let barridos = 0
for (const tipoNegocio of RUBROS) {
  for (const energia of [0.1, 0.25, 0.35, 0.5, 0.7, 0.85, 0.95]) {
    for (const calidez of [0.1, 0.3, 0.5, 0.7, 0.9]) {
      for (const register of ['casual', 'formal']) {
        barridos++
        producidos.add(aireDe({
          semantica: { tipoNegocio, audiencia: { register } },
          dna: { mood: { energia, calidez } },
        }))
      }
    }
  }
}
const muertos = Object.keys(AIRES).filter(a => !producidos.has(a))
for (const m of muertos) {
  F('E-ADN-AIRE-MUERTO', `el aire "${m}" existe en render3d/demo/aires/ y NINGUNA pagina posible lo elige — ${barridos} combinaciones barridas`)
}

const n = FIX.length * Object.keys(AIRES).length
if (fallos.length) {
  console.error(`ADN: ${fallos.length} FALLO(S) sobre ${n} combinaciones\n` + fallos.map(f => '  ' + f).join('\n'))
  process.exit(1)
}
const claras = FIX.filter(x => x.pm.dna.palette.bgLum > 0.42).length
console.log(`ADN OK — ${n} combinaciones (${FIX.length} páginas × ${Object.keys(AIRES).length} aires): `
  + `polaridad, tono de marca (±14°), legibilidad y variedad.  ${claras}/${FIX.length} páginas dan mundo CLARO.`)
console.log(`  los ${Object.keys(AIRES).length} aires son alcanzables (${barridos} combinaciones de rubro × energía × calidez × registro).`)
