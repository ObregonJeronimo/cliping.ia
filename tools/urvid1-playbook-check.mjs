// GATE playbook-wiring (item L142/L849): el brief.energyHint del PLAYBOOK del rubro entra al motor como SESGO SUAVE de RITMO
// (energy -> staggerK comprime la cascada; xf -> ventana de transicion; hookProb -> agresividad de apertura del arco).
// Dos invariantes que este gate blinda:
//   (A) BACK-COMPAT: un brief SIN energyHint == un brief con energyHint:'medio' (el nivel NEUTRO) -> video BYTE-IDENTICO. Asi
//       el cableado es OPT-IN puro: no cambia ningun video existente (los otros 7 gates usan briefs sin playbook -> intactos).
//   (B) SESGO SUAVE: 'alto' acelera y 'bajo' calma el RITMO de forma MONOTONA (xf y energy), NUNCA toca el filtro DURO de
//       tono ni la identidad color/tipografia (energyLevel no entra en esos picks). Nunca prohibe (patron fit.js).
import { makeVideo } from '../src/urvid/index.js'   // barrel: registra todos los pools (importar assemble.js suelto los deja vacios)

const brief = { brand: 'Acme', rubro: 'tech', tone: 'dark', brandColor: '#5b8cff', tagline: 'Software que acompana a tu equipo', claim: 'La plataforma mejor para crecer sin fricciones', cta: 'Ver planes', bullets: ['Integrado', 'Escalable', 'Soporte real'], stats: [{ value: '99.9%', label: 'uptime' }], proof: '4.9 en 2.000 resenas' }

let fails = 0
const die = (m) => { console.error('FAIL  ' + m); fails++ }
const V = (extra, s) => makeVideo({ ...brief, seed: s, ...extra })

// (A) BACK-COMPAT: absent === medio (neutro) -> video IDENTICO, para muchas seeds. Prueba que el cableado es opt-in puro.
for (let s = 1; s <= 40; s++) {
  const base = JSON.stringify(V({}, s))
  const medio = JSON.stringify(V({ energyHint: 'medio' }, s))
  if (base !== medio) { die(`seed ${s}: energyHint 'medio' NO es neutro (deberia ser byte-identico a sin-campo)`); break }
  const garbage = JSON.stringify(V({ energyHint: 'xxx' }, s))   // valor invalido -> tambien neutro (energyLevel 0)
  if (base !== garbage) { die(`seed ${s}: energyHint invalido NO cae a neutro (energyLevel deberia ser 0)`); break }
}

// (B) SESGO SUAVE monotono: alto acelera (xf menor, energy mayor), bajo calma (xf mayor, energy menor). Chequeo el ORDEN por
// seed (robusto ante los clamps de xf/energy) + que AL MENOS UNA seed muestre diferencia estricta (el sesgo hace algo real).
let everStrictXf = false, everStrictEn = false
for (let s = 1; s <= 40; s++) {
  const a = V({ energyHint: 'alto' }, s), m = V({ energyHint: 'medio' }, s), b = V({ energyHint: 'bajo' }, s)
  // xf: alto <= medio <= bajo (ventana de transicion mas corta con mas energia)
  if (!(a.xf <= m.xf + 1e-9 && m.xf <= b.xf + 1e-9)) die(`seed ${s}: xf no es monotono alto<=medio<=bajo (${a.xf}/${m.xf}/${b.xf})`)
  if (a.xf < b.xf - 1e-9) everStrictXf = true
  // energy: alto >= medio >= bajo (mas energia -> cascada de stagger mas rapida via staggerK en las escenas)
  if (!(a.energy >= m.energy - 1e-9 && m.energy >= b.energy - 1e-9)) die(`seed ${s}: energy no es monotono alto>=medio>=bajo (${a.energy}/${m.energy}/${b.energy})`)
  if (a.energy > b.energy + 1e-9) everStrictEn = true
  // FILTRO DURO intacto: tono/color/tipografia NO dependen de energyLevel -> jamas cambian con energyHint.
  if (a.tone !== m.tone || a.recipe.color !== m.recipe.color || a.recipe.type !== m.recipe.type) die(`seed ${s}: energyHint 'alto' altero tono/color/tipo (no deberia)`)
}
if (!everStrictXf) die('el sesgo de energyHint NUNCA cambio xf en 40 seeds (no tiene efecto real)')
if (!everStrictEn) die('el sesgo de energyHint NUNCA cambio energy en 40 seeds (no tiene efecto real)')

if (fails) { console.error(`\nGATE PLAYBOOK FALLO (${fails} casos).`); process.exit(1) }
console.log('GATE PLAYBOOK OK (energyHint: medio/ausente byte-identico; alto/bajo sesgan el RITMO de forma monotona sin tocar tono/color/tipo).')
