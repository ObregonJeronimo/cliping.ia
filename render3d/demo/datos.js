import { vetarLaminas } from './kit.js'
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
  // La voz del cliente. En ANTHEM es NUESTRA propia copy —igual que el claim y el golpe—, no la de
  // una marca ajena: la demo es su propio contenido y no hay nadie a quien atribuirle nada falso.
  // Sirve ademas para que la escena de cita se pueda ver y medir sin depender de que la pagina de
  // turno publique testimonios.
  testimonios: [
    { texto: 'Lo armamos para medirnos contra una pieza hecha a mano, no contra otra plantilla.', firma: 'URVID' },
  ],
  cta: 'VER EL MOTOR',
  pie: ['1080x1920', '30 FPS', 'SIN IA GENERATIVA'],
  dominio: '',
  elementos: [],                                     // recortes reales de la página, si los hay
}

export let D = ANTHEM

// LO ÚNICO QUE UNA ESCENA PUEDE ESCRIBIR SIN QUE LA PÁGINA LO HAYA DICHO.
//
// Son rótulos de sistema: no afirman nada sobre el negocio, y por eso no mienten. "1080X1920" es el
// formato del archivo; "30 FPS" es su cadencia. Un espectador no los lee como una promesa de la marca.
//
// La lista es corta a propósito y el gate E-PROCEDENCIA la usa como única excepción: cualquier texto
// que una escena escriba y que no salga de los DATOS ni esté acá, falla. Eso invierte la carga de la
// prueba — antes había que acordarse de prohibir cada frase nueva, y por eso se filtraron "SIETE
// ENTRADAS · NINGUNA IGUAL" y "CADA CORTE CAE EN EL BEAT" al video de Stripe. Ahora hay que declararla,
// y declararla es un acto visible en el diff.
export const DECORATIVO = new Set([
  '1080X1920', '30 FPS', '9:16',
])

// ---------------------------------------------------------------- rótulos de escena
// Toda escena quiere una marca chica arriba o abajo: el tipo de cosa que en una pieza editorial dice
// "02 · VOLUMEN" y compone el cuadro. El problema es que esos rótulos estaban escritos a mano, en
// castellano, con el vocabulario interno del motor — así que el video de una marca inglesa salía
// diciendo "CAPITULO 01 — APERTURA" y "BLOQUE 04 · DATOS". No es sólo que mienta: DELATA LA PLANTILLA,
// que es lo peor que puede hacer una pieza que quiere pasar por hecha a medida.
//
// Las dos formas honestas de llenar ese slot:
//   · `marca(i, n)` — un índice puro. Sin letras, no afirma nada, y leído como número de página es
//     exactamente el gesto editorial que se buscaba.
//   · `sello(i)`    — el pie REAL: el dominio de la página y el formato del archivo.
export const marca = (i, n) => `${String(i).padStart(2, '0')} / ${String(n).padStart(2, '0')}`
export const sello = (i = 0) => {
  const p = sello.lista()
  return p[i] || p[0] || ''
}
sello.lista = () => (D.pie || []).filter(Boolean)

// ¿Estamos mostrando la demo o el video de alguien? Es la distinción que decide si un hueco se
// rellena o se deja vacío, y no tenerla convirtió la regla anti-invención en un comentario.
export let esDemo = true

// Rellena SOLO lo que falta. Nunca inventa contenido: si la página no dio frases, quedan las de
// ANTHEM y la escena de tipografía no debería elegirse — esa decisión es del guionista, no de acá.
export function configurarDatos(d) {
  // Si la pagina publico testimonios, sus reseñas se cuentan con PALABRAS: las escenas que muestran
  // recortes dejan de aceptar laminas de texto. Ver `esLamina` en kit.js.
  vetarLaminas(!!(d && Array.isArray(d.testimonios) && d.testimonios.some(t => t && t.texto)))
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
  // Un testimonio sin texto no es un testimonio. La firma SI puede venir vacia —hay paginas que
  // publican la cita sin decir quien la dijo— y en ese caso la escena la muestra sin autor, que es
  // la verdad; lo que nunca se hace es completarla.
  if (Array.isArray(d.testimonios)) D.testimonios = d.testimonios.filter(t => t && t.texto)
}

// Los testimonios REALES de la pagina. Mismo criterio que `frase`: si la pagina no dio ninguno se
// devuelve vacio y la escena de cita no se elige — nunca se cae a los de ANTHEM, porque poner en boca
// de un cliente ajeno una frase nuestra es la mentira mas cara que puede cometer este motor. El unico
// caso en que ANTHEM habla es la DEMO, donde el contenido es propio.
export const testimonios = () => {
  const t = (D.testimonios || []).filter(x => x && x.texto)
  if (t.length) return t
  return esDemo ? (ANTHEM.testimonios || []) : []
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

// ---------------------------------------------------------------- REPARTO
// DOS ESCENAS NO PUEDEN DECIR LO MISMO, Y ESTE ERA EL DEFECTO MAS CARO DE LA PIEZA.
//
// Cinco escenas beben del mismo pozo de frases y CADA UNA empezaba a contar desde cero: `tipografia`
// recorria todas, `rafaga` tomaba desde la primera, `partida` las dos primeras, `titular` la primera.
// Resultado medido en el render de basecamp: la escena de 0:12 mostraba "BIG NUMBERS / REMEMBER WHEN /
// PICK A PACKAGE / THE SAME CORE" y la de 0:19 mostraba "BIG NUMBERS" otra vez. Thiago lo dijo con
// esas palabras: "aparecen las MISMAS IMAGENES Y MISMOS TEXTOS que aparecieron en anteriores escenas,
// no innovan nada las escenas".
//
// `lista` intentaba esquivarlo tomando las ULTIMAS frases, y su propio comentario ya decia por que no
// alcanza: con cuatro frases justas las tres escenas siguen coincidiendo, y el arreglo de verdad no
// era local. Es este: un mostrador que REPARTE. Cada escena pide las que necesita y se lleva otras.
//
// EL CURSOR ES DETERMINISTA porque el orden de construccion lo es: `main.js` arma las escenas en el
// orden del guion y llama a `reiniciarReparto()` antes de empezar. Dos renders de la misma semilla
// reparten igual. Lo que NO puede hacerse es pedir frases fuera de `build()`, porque entonces el
// reparto dependeria del orden de importacion de los modulos.
//
// SI EL POZO SE ACABA, SE DA LA VUELTA. Repetir es peor que no mostrar, pero dejar una escena vacia
// por falta de material tambien vacia la pieza: el guionista ya limita cuantas escenas de texto entran
// segun cuantas frases hay (ver el cupo en guion.js). Dar la vuelta es el ultimo recurso y avisa por
// `repetidas` para que una compuerta pueda medirlo.
let _cursor = 0
export let repetidas = 0
// LA PROMESA TAMBIEN SE REPARTE, y es la unica pieza de copy que dos escenas quieren a la vez: `gancho`
// la usa como cartel de entrada y `titular` como titular de portada. Con las dos en la misma pieza el
// espectador lee la misma linea dos veces — el defecto que este mostrador vino a resolver. Quien la
// toma primero avisa, y la otra cae a su respaldo.
let _claimUsado = false
export const claimLibre = () => !_claimUsado
export const marcarClaimUsado = () => { _claimUsado = true }
export const reiniciarReparto = () => { _cursor = 0; repetidas = 0; _claimUsado = false }

// `soloUnaLinea` lo piden las escenas que componen una grilla vertical y no toleran un item del doble
// de alto. `cuantas` es un maximo: si hay menos, devuelve menos, y la escena decide si le alcanza.
// EL GOLPE SALE DEL POZO, y esto costo dos videos enteros.
//
// El campo `golpe` es distinto de `frases`, asi que el mostrador nunca lo vio — y muy seguido es la
// MISMA linea que una de las frases, porque las dos se extraen de los titulares de la pagina. En el
// render de basecamp, `lista` abria con "BIG NUMBERS. HIGHLY-TRUSTED." y dos escenas despues
// `destello` ponia exactamente eso a cuerpo de cartel. En duolingo pasaba con "DIVERTIDO, EFECTIVO
// Y GRATIS". Thiago lo marco en los dos videos: "se repitieron los mismos textos en otras escenas".
//
// Se compara NORMALIZADO —sin mayusculas, sin puntuacion, sin saltos— porque cada escena trata el
// mismo texto distinto: una lo parte en dos renglones y la otra lo pone en versales. Comparando
// crudo, dos strings que el espectador lee como la misma frase no se parecen en nada.
const _norm = (t) => String(t || '').toLowerCase().replace(/[^a-z0-9à-ÿ ]+/gi, ' ').replace(/[ ]+/g, ' ').trim()

export function repartirFrases(cuantas, soloUnaLinea = false) {
  const pozo = (esDemo ? ANTHEM.frases : (D.frases || [])).filter(Boolean).map(String)
  const golpe = _norm(esDemo ? ANTHEM.golpe : (D.golpe || ''))
  // Se saca del pozo la frase que el golpe ya va a decir. Solo si QUEDA material: con una sola frase
  // y esa igual al golpe, es preferible repetirla a dejar la escena vacia — una escena de texto sin
  // texto no es mas honesta, es un agujero.
  const sinGolpe = golpe ? pozo.filter(f => _norm(f) !== golpe) : pozo
  const base = sinGolpe.length ? sinGolpe : pozo
  const elegibles = soloUnaLinea ? base.filter(f => !f.includes('\n')) : base
  if (!elegibles.length) return []
  // NUNCA DOS VECES LA MISMA FRASE EN LA MISMA ENTREGA — y esto no contradice el "dar la vuelta" de
  // arriba, son dos situaciones distintas que estaban resueltas con el mismo codigo:
  //
  //   (a) EL CURSOR paso del final del pozo porque las escenas anteriores se llevaron las frases. Dar
  //       la vuelta ahi es deliberado y esta razonado en las lineas 157-160: la escena siguiente
  //       muestra una frase que ya salio hace rato, y eso es preferible a un agujero.
  //   (b) SE PIDEN MAS DE LAS QUE HAY. Ahi la vuelta mete la misma frase DOS VECES EN LA MISMA ESCENA:
  //       se piden 5 con 2 elegibles y salen [A,B,A,B,A]. La lista enumera A/B/A, las dos mitades de
  //       `partida` dicen lo mismo y las dos cintas de `marquesina` cruzan la misma frase. Eso no es un
  //       ultimo recurso, es un defecto que el espectador lee de una.
  //
  // El (b) ademas dejaba MUERTAS las guardas de las escenas, que estan escritas contra el contrato que
  // documenta la linea 173 ("`cuantas` es un maximo: si hay menos, devuelve menos, y la escena decide
  // si le alcanza"): `lista.js:50` mira `items.length < MIN_ITEMS` y `partida.js:36` mira `fr.length < 2`,
  // y nunca se cumplian porque el mostrador SIEMPRE devolvia exactamente lo pedido. El codigo y su
  // propio comentario decian cosas distintas; gana el comentario, que es el contrato contra el que se
  // escribio todo lo demas.
  const n = Math.min(cuantas, elegibles.length)
  const out = []
  for (let k = 0; k < n; k++) {
    const i = (_cursor + k) % elegibles.length
    if (_cursor + k >= elegibles.length) repetidas++
    out.push(elegibles[i])
  }
  // El cursor avanza por el pozo COMPLETO y no por el filtrado: si `lista` se lleva las de una linea,
  // la escena siguiente tiene que arrancar despues de ellas igual, o vuelve a caer en las mismas.
  _cursor += Math.min(cuantas, elegibles.length)
  return out
}
export const dato = (i) => (D.datos && D.datos[i]) || null

// Cuántas frases REALES hay. Las escenas lo usan para componerse con lo que hay en vez de dejar
// slots vacíos: es la diferencia entre una escena más corta y una escena con agujeros.
export const nFrases = () => (esDemo ? ANTHEM.frases.length : (D.frases || []).filter(Boolean).length)
