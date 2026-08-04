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
import * as columnata from './columnata.js'
import * as gota from './gota.js'
import * as biela from './biela.js'
import * as calibre from './calibre.js'
import * as pulso from './pulso.js'
import * as brote from './brote.js'
import * as telar from './telar.js'
import * as farol from './farol.js'
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
// `columnata` va entre los de geometria pura y ADELANTE de `prisma`: los dos se arman siempre, pero el
// cristal vende precision y la columnata vende peso, y cuando la captura fallo lo que hay que sostener
// primero es la seriedad de la marca. Detras de los que muestran la pagina, como todos los de su clase.
export const HEROES = [telefono, portatil, ventana, mosaico, cubo, vitrina, columnata, prisma, gota,
  biela, calibre, pulso, brote, telar, farol, cinta, enjambre, orbital]
export const porId = (id) => HEROES.find(h => h.meta.id === id) || null

// EL REGISTRO: a que clase de marca le queda cada objeto.
//
// Los heroes que muestran LA PAGINA del cliente —telefono, portatil, ventana, mosaico, vitrina, cubo—
// le quedan a cualquiera: lo que se ve es el sitio de la marca, no una forma que alguien eligio. Los
// de geometria pura, no. Un poliedro facetado con anillos orbitando es lenguaje de software: sobre una
// app de idiomas o una marca de avena no dice nada, y peor, dice algo que no es. Thiago, sobre dos
// videos distintos: "no tienen ningun sentido esas formas, son formas para algo tecnologico, no para
// una marca de cafes y una aplicacion para aprender idiomas".
//
// Un hero sin `aires` le queda a todos. Uno con lista, solo a esos.
const REGISTRO = {
  // geometria dura, instrumental: dice ingenieria, sistema, precision
  orbital: ['tecnico', 'corporativo', 'nocturno', 'deportivo'],
  prisma: ['tecnico', 'corporativo', 'nocturno', 'lujo'],
  enjambre: ['tecnico', 'corporativo', 'nocturno', 'deportivo'],
  cinta: ['tecnico', 'nocturno', 'deportivo', 'jugueton'],
  // arquitectura: peso, solidez, permanencia
  columnata: ['lujo', 'inmobiliario', 'corporativo', 'editorial', 'nocturno'],
  // ---- tanda nueva: seis registros que el catalogo no tenia
  biela: ['tecnico', 'deportivo', 'corporativo', 'nocturno'],
  calibre: ['tecnico', 'corporativo', 'lujo', 'editorial', 'nocturno'],
  pulso: ['tecnico', 'deportivo', 'nocturno', 'corporativo', 'bienestar'],
  brote: ['bienestar', 'gastronomico', 'artesanal', 'editorial', 'jugueton'],
  telar: ['artesanal', 'editorial', 'lujo', 'bienestar', 'gastronomico'],
  farol: ['gastronomico', 'nocturno', 'lujo', 'artesanal', 'jugueton'],
  // cuerpo blando: materia, calma, comida
  gota: ['bienestar', 'gastronomico', 'artesanal', 'jugueton', 'editorial'],
}

// Los que se pueden armar con el material que HAY y que ADEMAS le quedan a este aire.
// `disponible` es un set con 'tira', 'elementos'...; `aire` es opcional y sin el no se filtra por
// registro, que es lo que necesitan las compuertas que barren el catalogo entero.
// `datosEls` es opcional y sirve para el segundo filtro: `necesita` dice QUE CLASE de material hace
// falta ('elementos'), y eso es un booleano — con UN recorte ya se ofrecia un hero que reparte seis.
// El `cubo` salia con dos imagenes repetidas tres veces cada una sobre las seis caras, que es el reclamo
// textual registrado en kit.js:2043-2049 ("vuelven a aparecer las mismas imagenes... no innovan nada").
// Un hero que necesita CANTIDAD lo declara con `meta.puede(datosEls)` y se descarta antes de
// construirse — antes, no despues: `recortesDe` consume del reparto compartido, asi que construir un
// hero para descartarlo le sacaria recortes a la escena siguiente.
export function elegibles(disponible, aire = null, datosEls = null, texturas = null) {
  let hay = HEROES.filter(h => (h.meta.necesita || ['nada'])
    .every(n => n === 'nada' || disponible.has(n)))
  if (datosEls) hay = hay.filter(h => !h.meta.puede || h.meta.puede(datosEls, texturas))
  if (!aire) return hay
  const encajan = hay.filter(h => !REGISTRO[h.meta.id] || REGISTRO[h.meta.id].includes(aire))
  // Nunca se devuelve vacio: si el filtro no dejo a nadie —una pagina sin material y un aire para el
  // que ningun objeto abstracto encaja— es preferible un hero fuera de registro que una escena sin
  // sujeto. La degradacion honesta es mostrar algo, no un cuadro vacio.
  return encajan.length ? encajan : hay
}
