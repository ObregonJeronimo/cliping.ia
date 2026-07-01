// GATE keep-no-add-layers: la variante "keep" (boton "Otra variante") PRESERVA la presencia/ausencia de los 5 slots
// opcionales (typekit/mark/post/sub/atm) -> nunca AGREGA una capa que el original no tenia, ni QUITA una que tenia.
// Re-rolea CUAL modulo (variedad), no la presencia. Sin esto, "keep" podia inventar adornos (rompe la identidad).
import { makeVideo } from '../src/urvid/index.js'   // barrel: registra typekit/mark/post/sub/atmosphere en el registry (importar assemble.js suelto deja los pools VACIOS)

const OPT = ['typekit', 'mark', 'post', 'sub', 'atm']
const brief = { brand: 'Acme', rubro: 'tech', tone: 'dark', brandColor: '#5b8cff', tagline: 'Construido para escalar', claim: 'La plataforma que crece con vos', cta: 'Probalo gratis', bullets: ['Rapido', 'Seguro', 'Simple'], stats: [{ value: '99.9%', label: 'uptime' }] }

let fails = 0
const die = (m) => { console.error('FAIL  ' + m); fails++ }

// 1) keep = receta COMPLETA del original -> cada slot conserva su presencia/ausencia (null<->null, set<->set) en muchas seeds.
for (let s = 1; s <= 40; s++) {
  const base = makeVideo({ ...brief, seed: s })
  const rr = makeVideo({ ...brief, seed: (s + 0x9e3779b1) >>> 0, keepRecipe: base.recipe })
  for (const k of OPT) {
    const had = base.recipe[k] != null, has = rr.recipe[k] != null
    if (had !== has) die(`seed ${s} slot ${k}: presencia cambio (original ${had ? 'tenia' : 'no tenia'}, variante ${has ? 'agrego' : 'quito'})`)
  }
}

// 2) keep con TODOS los opcionales en null -> la variante NO debe AGREGAR ninguno (aunque su prob normal sea 50-70%).
for (let s = 1; s <= 40; s++) {
  const keepEmpty = { color: 'x', type: 'x' }; for (const k of OPT) keepEmpty[k] = null
  const rr = makeVideo({ ...brief, seed: s, keepRecipe: keepEmpty })
  for (const k of OPT) if (rr.recipe[k] != null) die(`seed ${s}: keepEmpty AGREGO slot ${k}=${rr.recipe[k]} (debia quedar ausente)`)
}

// 3) keep con un slot PRESENTE -> la variante lo conserva presente (puede re-rolear identidad, no quitarlo).
let everPresent = false
for (let s = 1; s <= 60 && !everPresent; s++) {
  const base = makeVideo({ ...brief, seed: s })
  if (base.recipe.post == null) continue
  everPresent = true
  const rr = makeVideo({ ...brief, seed: (s * 7 + 1) >>> 0, keepRecipe: { color: 'x', type: 'x', post: base.recipe.post, typekit: null, mark: null, sub: null, atm: null } })
  if (rr.recipe.post == null) die(`seed ${s}: keep con post presente lo QUITO`)
}
if (!everPresent) console.warn('WARN  ningun base tenia post en 60 seeds (no se pudo testear el caso presente)')

if (fails) { console.error(`\nGATE KEEP FALLO (${fails} casos).`); process.exit(1) }
console.log('GATE KEEP OK (keep preserva presencia/ausencia de los 5 slots opcionales; nunca agrega ni quita capas).')
