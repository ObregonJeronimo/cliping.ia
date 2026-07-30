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
import * as portatil from './portatil.js'
import * as ventana from './ventana.js'
import * as mosaico from './mosaico.js'
import * as vitrina from './vitrina.js'
import * as prisma from './prisma.js'
import * as cinta from './cinta.js'
import * as enjambre from './enjambre.js'
import * as cubo from './cubo.js'
import * as toro from '../escenas/toro.js'

// El toro se registra como hero de RESPALDO. Es geometria pura, asi que no necesita nada de la pagina
// y siempre se puede armar: es lo que garantiza que la escena de hero nunca quede sin sujeto — ni
// cuando la captura fallo, ni cuando la pagina bloqueo al bot, ni cuando el usuario pidio un hero que
// esta pagina no puede sostener.
const orbital = {
  meta: { id: 'orbital', nombre: 'Objeto orbital', necesita: ['nada'], beats: toro.meta.beats },
  build: toro.build,
}

// EL ORDEN ES EL DE PREFERENCIA y no es alfabetico: el registro elige `posibles[0]` cuando el usuario
// no pide nada, y a partir de la segunda aparicion ROTA. Adelante van los que muestran la PAGINA del
// usuario —telefono, portatil, ventana, mosaico, vitrina—, porque eso es lo que ninguna plantilla
// puede fingir; atras los de geometria pura, que son los que sostienen la pieza cuando la captura
// fallo. Un video que arranca con un cristal cuando podia arrancar con la pagina del cliente esta
// eligiendo mal.
// `cubo` va entre los que muestran la PAGINA: necesita recortes y los usa de a seis, que es donde
// tener mas material se nota. Detras de `mosaico` porque ese muestra la pagina de una sola vez y este
// la reparte — con poco material, el mosaico sigue siendo la lectura mas clara.
export const HEROES = [telefono, portatil, ventana, mosaico, cubo, vitrina, prisma, cinta, enjambre, orbital]
export const porId = (id) => HEROES.find(h => h.meta.id === id) || null

// Los que se pueden armar con el material que HAY. `disponible` es un set con 'tira', 'elementos'...
export function elegibles(disponible) {
  return HEROES.filter(h => (h.meta.necesita || ['nada'])
    .every(n => n === 'nada' || disponible.has(n)))
}
