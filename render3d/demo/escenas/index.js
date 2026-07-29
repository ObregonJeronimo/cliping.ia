// ANTHEM · orden de la pieza. 124 BPM, beat = 0.4839 s.
//
// La estructura es la de un reel de marca de hoy: apertura seca, un objeto 3D que establece el
// espacio, un bloque de tipografía cinética que lleva el peso del mensaje, una pieza de datos, un
// beat de inversión que rompe el ritmo, y un cierre que asienta. 36 beats ≈ 17.4 s.
//
// Cada módulo declara sus beats y el secuenciador los encadena. Cambiar el orden acá cambia la pieza
// entera sin tocar una sola escena.
import * as apertura from './apertura.js'
import * as hero from './hero.js'
import * as toro from './toro.js'
import * as tipografia from './tipografia.js'
import * as tarjetas from './tarjetas.js'
import * as destello from './destello.js'
import * as rafaga from './rafaga.js'
import * as pantalla from './pantalla.js'
import * as columna from './columna.js'
import * as cita from './cita.js'
import * as lista from './lista.js'
import * as titular from './titular.js'
import * as partida from './partida.js'
import * as contraste from './contraste.js'
import * as sello from './sello.js'
import * as mesa from './mesa.js'
import * as cierre from './cierre.js'

// ESTO YA NO ES EL ORDEN DE LA PIEZA: es el CATALOGO de lo que existe. El orden y la seleccion los
// decide render3d/demo/guion.js con el material que la pagina dio, la semilla y la duracion pedida.
// Mientras esta lista fue el orden, una pagina daba exactamente un video posible — misma estructura
// para todos, que es lo que se percibe como "son todos iguales" incluso con la paleta de cada marca
// ya aplicada.
//
// El toro vuelve al catalogo. Salio de la pieza cuando el hero ocupo su lugar (geometria generica vs.
// la pagina del usuario), pero como ALTERNATIVA sigue siendo bueno: es la unica escena que no
// necesita absolutamente nada, y es lo que sostiene el espacio cuando la pagina no dio material.
export const ESCENAS = [apertura, hero, toro, tipografia, rafaga, pantalla, columna, cita, lista, titular, partida, contraste, sello, tarjetas, destello, cierre, mesa]
