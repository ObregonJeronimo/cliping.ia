// LAS RECETAS — el único sitio del motor que traduce el retrato de la página a números de plantilla.
//
// POR QUÉ NO SE LEE EL RETRATO CRUDO
//
// `backend/retrato.py` mide la página y produce un JSON grande y detallado. Si cada plantilla lo leyera
// directo pasarían tres cosas, y las tres son caras:
//
//   1. SE ROMPEN CUANDO NO HAY RETRATO, y va a faltar seguido. Una captura vieja no lo tiene, la sonda
//      construye sin él a propósito, la compuerta también, y un usuario puede tener el motor corriendo
//      sobre un dominio capturado antes de que este archivo existiera. `retrato.recetas.velocidadCamara`
//      sobre `undefined` tira, y tira DENTRO del navegador de grabación, donde el error sale como una
//      pieza en negro y no como un mensaje.
//   2. CADA PLANTILLA INTERPRETA DISTINTO. Una decide que "denso" es score > 0.6 y otra que es > 0.7, y
//      dieciocho piezas de la misma marca dejan de sentirse del mismo estudio — que es exactamente lo
//      que el catálogo promete.
//   3. NO SE PUEDE CAMBIAR NADA. El día que la medición mejore hay que tocar dieciocho archivos.
//
// Acá se resuelve una vez: **siempre devuelve el mismo juego de claves**, con valores NEUTROS cuando no
// hubo medición. Neutro no es inventado — es "esto no se midió, componé como se componía antes".
//
// LO QUE UNA PLANTILLA TIENE QUE SABER
//
// Todas las recetas son MULTIPLICADORES o FRACCIONES alrededor de 1 y de valores que ya funcionaban. Se
// usan así:
//
//     const R = ctx.recetas
//     const largo = SEP * 11 * R.velocidad        // el vuelo se estira o se acorta
//     const capas = R.capas                        // 2 a 4
//     const rad = lado * 0.5 * (1 - R.dureza)      // esquinas: filoso o redondeado
//
// Nunca al revés: una plantilla no debería tener un `if (R.densidad > x)` que cambie su composición
// entera. Lo que la receta modula es el GRADO, no la idea — la idea es de la plantilla.

// Los valores neutros. Cada uno es el número con el que las doce primeras plantillas se compusieron
// antes de que existiera el retrato, así que sin medición el motor produce exactamente lo de antes.
const NEUTRO = {
  velocidad: 1.0,        // multiplicador del recorrido de cámara
  capas: 3,              // capas de paralaje
  dureza: 0.75,          // 1 = aristas vivas, 0 = todo redondeado
  margen: 0.88,          // fracción del cuadro útil que puede ocupar un bloque de texto
  beats: 0,              // 0 = la plantilla usa los suyos
  cifras: 3,
  frases: 2,
  acentoMasa: false,     // el espacio se construye en acento, o el acento va en filetes
  pruebaGrande: true,    // el recorte aguanta media pantalla sin verse blando
  movimientos: 4,        // cuántos cambios de espacio pide la página
  sistematico: false,    // grilla regular vs editorial
  formalidad: 0.5,
  calidez: 0.5,
  densidad: 0.5,
  vacio: 0.5,
  // La paleta medida sobre los píxeles, ordenada por peso. Vacía cuando no hay retrato: una plantilla
  // que la use tiene que tener su propio color de respaldo, y por eso `colorDePeso` existe.
  paleta: [],
  medido: false,         // ¿esto salió de una medición o son los neutros?
}

const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d)
const bool = (v, d) => (typeof v === 'boolean' ? v : d)

export function recetasDe(retrato) {
  if (!retrato || !retrato.recetas) return Object.assign({}, NEUTRO)
  const r = retrato.recetas
  const aire = retrato.aire || {}
  return {
    // Los rangos se acotan acá y no en Python, a propósito: el que sabe qué rango soporta el motor es
    // el motor. Una velocidad de 3 no es "más rápido", es una pieza que no se puede leer.
    velocidad: Math.max(0.7, Math.min(1.45, num(r.velocidadCamara, NEUTRO.velocidad))),
    capas: Math.max(2, Math.min(4, Math.round(num(r.capas, NEUTRO.capas)))),
    dureza: Math.max(0, Math.min(1, num(r.dureza, NEUTRO.dureza))),
    margen: Math.max(0.74, Math.min(0.95, num(r.margenTexto, NEUTRO.margen))),
    beats: Math.max(0, Math.min(48, Math.round(num(r.beatsSugeridos, 0)))),
    cifras: Math.max(1, Math.min(4, Math.round(num(r.cifrasAPedir, NEUTRO.cifras)))),
    frases: Math.max(1, Math.min(3, Math.round(num(r.frasesAPedir, NEUTRO.frases)))),
    acentoMasa: bool(r.acentoComoMasa, NEUTRO.acentoMasa),
    pruebaGrande: bool(r.pruebaGrande, NEUTRO.pruebaGrande),
    movimientos: Math.max(2, Math.min(6, Math.round(num(r.movimientos, NEUTRO.movimientos)))),
    sistematico: bool(r.sistematico, NEUTRO.sistematico),
    formalidad: Math.max(0, Math.min(1, num(r.formalidad, 0.5))),
    calidez: Math.max(0, Math.min(1, num(r.calidez, 0.5))),
    densidad: Math.max(0, Math.min(1, 1 - num(aire.vacio, 0.5))),
    vacio: Math.max(0, Math.min(1, num(aire.vacio, 0.5))),
    paleta: Array.isArray(retrato.paleta) ? retrato.paleta : [],
    medido: true,
  }
}

// ---------------------------------------------------------------- ayudas para las plantillas
//
// Tres funciones que resuelven las preguntas que TODAS las plantillas se hacen. Sin esto cada una las
// resuelve un poco distinto y el catálogo deja de sentirse de un solo estudio.

// EL COLOR DE MÁS PESO QUE ADEMÁS SEA COLOR. La paleta medida está ordenada por superficie, así que la
// primera entrada casi siempre es el fondo —blanco o casi— y no sirve para construir nada. Esto salta
// los grises y devuelve la primera masa cromática de verdad.
//
// `respaldo` no es opcional: una página en escala de grises no tiene ninguna, y devolver `undefined`
// dejaría a la plantilla con un material sin color. Cuál es el respaldo lo decide la plantilla, porque
// depende de si ese color va a ser vidrio, metal o luz.
export function colorDePeso(recetas, respaldo, minCroma) {
  const mc = minCroma != null ? minCroma : 0.22
  const p = (recetas && recetas.paleta) || []
  for (const c of p) {
    if (c && c.hex && (c.croma || 0) >= mc) return c.hex
  }
  return respaldo
}

// EL GRIS DE MÁS PESO, para pisos, muros y todo lo que tiene que ser estructura y no marca. Se busca
// dentro de un rango de luminancia para no devolver ni el blanco del fondo ni el negro del texto:
// los dos existen en toda página y ninguno de los dos sirve como material.
export function grisDePeso(recetas, respaldo) {
  const p = (recetas && recetas.paleta) || []
  for (const c of p) {
    if (c && c.hex && (c.croma || 0) < 0.18 && (c.lum || 0) > 0.05 && (c.lum || 0) < 0.85) return c.hex
  }
  return respaldo
}

// EL RADIO DE UNA ARISTA a partir de la dureza medida. Es la traducción más directa del retrato: si la
// marca redondea sus tarjetas, el espacio 3D también redondea.
//
// Se acota al 45% del lado porque a partir de ahí una caja deja de ser una caja: se vuelve una cápsula,
// y eso ya no es "más redondeado", es otra forma.
export function radioDe(recetas, lado) {
  const d = recetas ? recetas.dureza : NEUTRO.dureza
  return Math.max(0, Math.min(lado * 0.45, lado * 0.5 * (1 - d)))
}
