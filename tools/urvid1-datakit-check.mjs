// GATE datakit-honesto (item L152): datakit se REACTIVO pero SOLO leyendo stats REALES (nunca fabrica numeros). Invariantes:
//   (A) HONESTIDAD: sin stats reales, NINGUN modulo datakit (id 'data.*') aparece en la receta -> jamas se inventa un numero.
//   (B) REACTIVADO: con stats reales, datakit ES elegible -> aparece en al menos una seed (si no, seguiria muerto en el pool).
//   (C) DETERMINISTA: mismo brief+seed -> misma receta (con stats reales de entrada).
//   (D) TIPADO: un modulo % / rating NO es elegible si la unica stat no es %/rating -> nunca se selecciona un modulo que se
//       auto-saltaria (statPercent/statRating null) y dejaria la ESCENA VACIA (~3s muertos). Gate por needsType en assemble.
import { makeVideo } from '../src/urvid/index.js'   // barrel: registra todos los pools (incl. datakit)

let fails = 0
const die = (m) => { console.error('FAIL  ' + m); fails++ }
const isDatakit = id => typeof id === 'string' && id.indexOf('data.') === 0   // datakit = 'data.*'; scene-layouts = 'scene.*'
const C = { claim: 'Menos tareas repetitivas, mas resultados reales', tagline: 'La forma mas simple de crecer', cta: 'Probalo gratis' }
const base = { brand: 'Acme', rubro: 'tech', tone: 'dark', brandColor: '#5b8cff' }
const briefNoStats = { ...base, content: { ...C } }                                                  // sin stats + copy sin numeros
const briefStats = { ...base, stats: [{ value: '92%', label: 'de clientes lo recomienda' }], content: { ...C } }

// (A) HONESTIDAD: sin stats -> JAMAS datakit (fabricaria un numero)
for (let s = 1; s <= 80; s++) {
  const v = makeVideo({ ...briefNoStats, seed: s })
  const dk = v.recipe.scenes.filter(isDatakit)
  if (dk.length) { die(`seed ${s} SIN stats eligio datakit (${dk.join(',')}) -> fabricaria numeros`); break }
}
// (B) REACTIVADO: con stats reales -> datakit elegible al menos una vez en 80 seeds
let dkId = null
for (let s = 1; s <= 80 && !dkId; s++) {
  const dk = makeVideo({ ...briefStats, seed: s }).recipe.scenes.find(isDatakit)
  if (dk) dkId = dk
}
if (!dkId) die('CON stats reales datakit NO se eligio en 80 seeds -> sigue muerto (revisar gate en assemble/pool)')
else console.log(`  datakit reactivado con stats reales (ej '${dkId}')`)

// (C) DETERMINISMO con stats reales
for (let s = 1; s <= 12; s++) {
  const a = JSON.stringify(makeVideo({ ...briefStats, seed: s }).recipe), b = JSON.stringify(makeVideo({ ...briefStats, seed: s }).recipe)
  if (a !== b) { die(`seed ${s}: receta no determinista con stats reales`); break }
}

// (D) TIPADO: con UNA sola stat que es un NUMERO PLANO (ni % ni rating 0..5), NINGUN modulo % / rating debe aparecer en la
// receta -> si apareciera, se auto-saltaria y dejaria la escena vacia. Lista hardcodeada de los modulos tipados (needsType).
const TYPED_IDS = [
  // percent (needsType: 'percent')
  'data.ring.gauge', 'data.donut.share', 'data.ring.dial', 'data.ring.dots', 'data.compare.battery',
  'data.progress.ringpct', 'data.ring.halfgauge', 'data.progress.barbig', 'data.number.percentcircle',
  'data.donut.gauge270', 'data.progress.dialarc',
  // rating (needsType: 'rating')
  'data.rating.stars', 'data.rating.bignum',
]
const briefPlain = { ...base, stats: [{ value: '28.725', label: 'prestamos otorgados' }], content: { ...C } }   // 1 numero PLANO (ni % ni 0..5)
let plainDatakitSeen = false   // (E) con un numero plano, un modulo datakit PLANO/stack si puede aparecer (eso es honesto)
for (let s = 1; s <= 200; s++) {
  const scenes = makeVideo({ ...briefPlain, seed: s }).recipe.scenes
  const typed = scenes.filter(id => TYPED_IDS.includes(id))
  if (typed.length) { die(`seed ${s} con stat PLANA ('28.725') eligio modulo TIPADO ${typed.join(',')} -> render VACIO`); break }
  if (scenes.some(isDatakit)) plainDatakitSeen = true
}
if (!plainDatakitSeen) console.log('  (aviso) con stat plana ningun datakit plano/stack aparecio en 200 seeds (ok si el arco no abrio beat de datos)')
else console.log('  tipado OK: con stat plana, 0/200 seeds eligio un modulo %/rating (sin escenas vacias); datakit plano si reactiva')

if (fails) { console.error(`\nGATE DATAKIT FALLO (${fails} casos).`); process.exit(1) }
console.log('GATE DATAKIT OK (sin stats -> nunca datakit / no fabrica; con stats reales -> datakit reactivado; tipado -> 0 escenas vacias; determinista).')
