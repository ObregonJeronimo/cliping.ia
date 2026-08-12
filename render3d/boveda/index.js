// EL CATALOGO DE BOVEDA — y, mas importante, EL CONTRATO que hace que una plantilla sea intercambiable.
//
// EL PROBLEMA QUE ESTE ARCHIVO RESUELVE
// Si cada plantilla decidiera por su cuenta que datos usa y donde los pone, agregar la numero trece
// seria leer las doce anteriores. Peor: el usuario elegiria "otra plantilla" y recibiria un video que
// cuenta OTRA COSA, porque cada una habria elegido distinto que mostrar de la misma pagina.
//
// Asi que el reparto de datos es un contrato y vive aca. Una plantilla puede cambiar TODO —el espacio,
// la camara, los materiales, el ritmo— pero no puede cambiar QUE se cuenta ni EN QUE ORDEN.
//
// ---------------------------------------------------------------- LOS SEIS TIEMPOS
//
// Toda plantilla de Boveda cuenta lo mismo, en el mismo orden, porque eso es lo que hace que doce
// piezas distintas sirvan para la misma marca:
//
//   1. ESPACIO   se establece el lugar. Nada de marca todavia: el espectador tiene que entender
//                donde esta parado antes de que le hablen. Es el unico tiempo sin datos.
//   2. MARCA     el nombre, grande y solo. Es lo unico que se repite al final.
//   3. PROMESA   el claim de la pagina — la frase que la marca escribio para presentarse.
//   4. PRUEBA    la PAGINA del cliente, de verdad, mostrada como objeto. Es lo unico que ninguna
//                plantilla generica puede fingir, y por eso ninguna de las doce se lo saltea.
//   5. RAZONES   las frases y las cifras. Cuantas entran lo decide la plantilla; cuales, el mostrador.
//   6. PEDIDO    el CTA y el dominio. Si la pagina no dio CTA, va el dominio solo — nunca inventado.
//
// Una plantilla declara en `meta.tiempos` en que beat empieza cada tiempo. No es decorativo: la
// compuerta lo lee para comprobar que los seis existen y estan en orden.
//
// ---------------------------------------------------------------- DE DONDE SALEN LOS DATOS
//
// Del mismo analisis que ya hace el motor de escenas: captura -> pagemodel -> `datosDe`. Boveda no
// analiza nada nuevo. Lo que cambia es que aca los datos entran en una pieza TERMINADA en vez de en un
// guion que se sortea.
//
//   D.marca      el nombre               D.claim      la promesa
//   D.frases[]   las frases del sitio    D.datos[]    las cifras con su etiqueta
//   D.cta        el boton                D.dominio    el dominio
//   D.rotulo     el rubro/bajada         elementos[]  los recortes reales de la pagina
//   spec.tira    la captura scrolleable completa
//
// LO QUE UNA PLANTILLA NO PUEDE HACER: inventar. Si no hay cifras, no hay tiempo de cifras — se
// compone sin el. Un hueco se ve; un dato falso firmado por la marca del cliente es otra cosa.

import * as atrio from './plantillas/atrio.js'
import * as reticula from './plantillas/reticula.js'

// EL ORDEN ES EL DE PRESENTACION en el estudio, y no es alfabetico: adelante van las que muestran la
// pagina del cliente como objeto protagonico, que es lo que ninguna plantilla generica puede fingir.
export const PLANTILLAS = [atrio, reticula]

export const porId = (id) => PLANTILLAS.find(p => p.meta && p.meta.id === id) || null

// Los seis tiempos, por nombre, para que la compuerta y el estudio no los copien a mano.
export const TIEMPOS = ['espacio', 'marca', 'promesa', 'prueba', 'razones', 'pedido']

// Que necesita cada plantilla para no salir coja. Mismo criterio que el registro de heroes del otro
// motor: no se ofrece una plantilla que no se puede armar con lo que la pagina dio.
//   'tira'      la captura scrolleable
//   'elementos' los recortes
//   'cifras'    al menos una cifra con etiqueta
//   'nada'      se arma con geometria y texto
export function elegibles(disponible, datos) {
  const hay = new Set(disponible || [])
  const cifras = ((datos && datos.datos) || []).filter(d => d && d.valor).length
  return PLANTILLAS.filter(p => {
    const n = (p.meta.necesita || ['nada'])
    return n.every(x => x === 'nada' || (x === 'cifras' ? cifras >= (p.meta.minCifras || 1) : hay.has(x)))
  })
}
