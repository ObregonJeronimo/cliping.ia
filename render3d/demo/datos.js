// DATOS — lo que la pieza DICE. Es el otro eje del sistema, perpendicular al aire.
//
//     el AIRE decide COMO se ve y COMO se mueve      (paleta, tipografía, ritmo, gesto, cámara)
//     los DATOS deciden QUE dice                     (marca, frases, features, cifras, CTA, recortes)
//
// Las mismas seis escenas × N aires × los datos de cualquier página. Esa es la salida combinatoria
// que convierte un reel hecho a mano en un motor.
//
// REGLA ANTI-INVENCIÓN — es la más importante de todo el repo y acá vuelve a aplicar entera.
// Una escena que quiere cinco tarjetas y recibe tres muestra TRES. Nunca rellena, nunca inventa una
// cifra, nunca completa una lista con material propio. Si un slot viene vacío la escena se compone
// sin él, y si sin él no tiene sentido, esa escena no entra en la pieza. Poner "+500 clientes" en el
// video de una marca que nunca lo dijo es la mentira más cara que puede cometer este motor.
//
// Se exporta con `let` y bindings vivos, igual que el aire: las escenas leen `D` y no saben de dónde
// salió.

// Los datos por defecto son los de ANTHEM, la pieza de referencia. Así la demo sigue funcionando sola
// y, sobre todo, el default no es un placeholder gris: es una pieza real contra la cual comparar.
export const ANTHEM = {
  marca: 'ANTHEM',
  rotulo: 'URVID // SISTEMA DE MOTION',
  claim: 'HECHO A MANO PARA MEDIR A LA MÁQUINA',
  // Frases cortas para la tipografía cinética. El orden importa: la escena les da a cada una una
  // entrada distinta, y la 5.ª es la única que va en el acento.
  frases: ['NO ES UNA\nPLANTILLA', 'ES UN MOTOR', 'MIDE', 'COMPONE', 'ANIMA', 'CADA PÁGINA', 'VIDEO'],
  bloque: { titulo: 'CADA OBJETO ES REAL', bajada: 'GEOMETRÍA, NO UN DIBUJO' },
  datos: [
    { valor: 6, etiqueta: 'ESCENAS' }, { valor: 12, etiqueta: 'EQUIPOS' },
    { valor: 300, etiqueta: 'MARCAS' }, { valor: 96, etiqueta: 'CIUDADES' },
    { valor: 24, etiqueta: 'PAÍSES' },
  ],
  golpe: 'ESTO NO LO HACE\nUNA PLANTILLA',
  cta: 'VER EL MOTOR',
  pie: ['1080x1920', '30 FPS', 'SIN IA GENERATIVA'],
  dominio: '',
  elementos: [],                                     // recortes reales de la página, si los hay
}

export let D = ANTHEM

// ¿Estamos mostrando la demo o el video de alguien? Es la distinción que decide si un hueco se
// rellena o se deja vacío, y no tenerla convirtió la regla anti-invención en un comentario.
export let esDemo = true

// Rellena SOLO lo que falta. Nunca inventa contenido: si la página no dio frases, quedan las de
// ANTHEM y la escena de tipografía no debería elegirse — esa decisión es del guionista, no de acá.
export function configurarDatos(d) {
  if (!d) return
  esDemo = d === ANTHEM
  D = { ...ANTHEM, ...d }
  // Las listas se recortan a lo que la página realmente dijo. Completar hasta cinco con material de
  // ANTHEM haría que el video de un cliente mostrara las cifras de la demo — que es exactamente el
  // defecto que la regla anti-invención existe para impedir.
  if (Array.isArray(d.datos)) D.datos = d.datos.filter(x => x && x.etiqueta)
  if (Array.isArray(d.frases)) D.frases = d.frases.filter(Boolean)
  if (Array.isArray(d.pie)) D.pie = d.pie.filter(Boolean)
  if (Array.isArray(d.elementos)) D.elementos = d.elementos.filter(e => e && e.url)
}

// La frase i. Si la página no llegó a tantas, devuelve CADENA VACÍA — no la de ANTHEM.
//
// Esto decía `|| ANTHEM.frases[i]`, y ese "o" era una mentira que se publicaba. Medido sobre los
// fixtures: 46 de 84 slots de frase salían del copy de la demo. El video de Stripe decía "ANIMA",
// "CADA PÁGINA" y "SU PROPIO VIDEO" — frases de ANTHEM, presentadas como si fueran de Stripe. Y el de
// una página 404 salía diciendo "300 MARCAS · 96 CIUDADES · 24 PREMIOS".
//
// El archivo declaraba la regla anti-invención en un comentario largo y a la vez la violaba tres
// líneas más abajo. Un fallback que rellena con contenido AJENO no es robustez: es exactamente el
// defecto que la regla existe para impedir. Un hueco vacío es un problema de composición — se ve, se
// arregla. Una frase ajena es un problema de veracidad, y no se ve nunca.
//
// El único caso en que se rellena es la DEMO: cuando nadie pasó una página, ANTHEM es su propio
// contenido y no hay marca a la que mentirle.
export const frase = (i) => {
  const f = D.frases && D.frases[i]
  if (f) return f
  return esDemo ? (ANTHEM.frases[i] || '') : ''
}
export const dato = (i) => (D.datos && D.datos[i]) || null

// Cuántas frases REALES hay. Las escenas lo usan para componerse con lo que hay en vez de dejar
// slots vacíos: es la diferencia entre una escena más corta y una escena con agujeros.
export const nFrases = () => (esDemo ? ANTHEM.frases.length : (D.frases || []).filter(Boolean).length)
