// REGISTRO DE HEROES. Un hero es el objeto protagonista de una escena, y es el eje de variedad mas
// visible que tiene la pieza: cambiar el hero cambia de que TRATA el video, no solo como se ve.
//
// La idea es que sean cientos y que el usuario elija. Para que eso escale sin que cada uno sea un caso
// especial, todos cumplen el mismo contrato (ver heroes/telefono.js) y declaran QUE NECESITAN:
//
//   'tira'       la captura movil scrolleable de la pagina  (backend/captura_hero.py)
//   'elementos'  los recortes reales de la pagina           (backend/element_extract.py)
//   'nada'       se arma solo con geometria y la paleta
//
// El selector no ofrece un hero cuyo material no exista: un telefono con la pantalla negra es peor
// que no tener telefono.
import * as telefono from './telefono.js'
import * as toro from '../escenas/toro.js'

// El toro se registra como hero de RESPALDO. Es geometria pura, asi que no necesita nada de la pagina
// y siempre se puede armar: es lo que garantiza que la escena de hero nunca quede sin sujeto — ni
// cuando la captura fallo, ni cuando la pagina bloqueo al bot, ni cuando el usuario pidio un hero que
// esta pagina no puede sostener.
const orbital = {
  meta: { id: 'orbital', nombre: 'Objeto orbital', necesita: ['nada'], beats: toro.meta.beats },
  build: toro.build,
}

export const HEROES = [telefono, orbital]
export const porId = (id) => HEROES.find(h => h.meta.id === id) || null

// Los que se pueden armar con el material que HAY. `disponible` es un set con 'tira', 'elementos'...
export function elegibles(disponible) {
  return HEROES.filter(h => (h.meta.necesita || ['nada'])
    .every(n => n === 'nada' || disponible.has(n)))
}
