// GATE datakit-honesto (item L152): datakit se REACTIVO pero SOLO leyendo stats REALES (nunca fabrica numeros). Invariantes:
//   (A) HONESTIDAD: sin stats reales, NINGUN modulo datakit (id 'data.*') aparece en la receta -> jamas se inventa un numero.
//   (B) REACTIVADO: con stats reales, datakit ES elegible -> aparece en al menos una seed (si no, seguiria muerto en el pool).
//   (C) DETERMINISTA: mismo brief+seed -> misma receta (con stats reales de entrada).
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

if (fails) { console.error(`\nGATE DATAKIT FALLO (${fails} casos).`); process.exit(1) }
console.log('GATE DATAKIT OK (sin stats -> nunca datakit / no fabrica; con stats reales -> datakit reactivado; determinista).')
