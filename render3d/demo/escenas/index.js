// ANTHEM · orden de la pieza. 124 BPM, beat = 0.4839 s.
//
// La estructura es la de un reel de marca de hoy: apertura seca, un objeto 3D que establece el
// espacio, un bloque de tipografía cinética que lleva el peso del mensaje, una pieza de datos, un
// beat de inversión que rompe el ritmo, y un cierre que asienta. 36 beats ≈ 17.4 s.
//
// Cada módulo declara sus beats y el secuenciador los encadena. Cambiar el orden acá cambia la pieza
// entera sin tocar una sola escena.
import * as apertura from './apertura.js'
import * as toro from './toro.js'
import * as tipografia from './tipografia.js'
import * as tarjetas from './tarjetas.js'
import * as destello from './destello.js'
import * as cierre from './cierre.js'

export const ESCENAS = [apertura, toro, tipografia, tarjetas, destello, cierre]
