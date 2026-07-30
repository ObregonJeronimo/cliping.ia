// AIRE "lujo" — negro y oro, serif fina, muchísimo aire y movimiento LENTO PERO CONTINUO.
// Para: joyería, alta relojería, inmobiliaria premium, hotelería, vinos, moda de autor.
//
// La trampa de este aire es confundir "lento" con "quieto". Una pieza de lujo se mueve todo el tiempo
// —una deriva de cámara imperceptible, un brillo que recorre un canto— pero NUNCA se apura. Por eso
// baja el BPM (76 en vez de 124: la pieza dura casi el doble y respira) y saca el overshoot: nada
// rebota, todo se posa. `frena` sube a potencia 4 y `llega` deja de pasarse.
// LAS FUENTES DE ESTE AIRE HAY QUE REGISTRARLAS, Y NO SE HACIA.
// demo.html declara por @font-face solo las CINCO de ANTHEM (Anton, ArchivoBlack, BigShoulders,
// Bricolage, DMSans). Cualquier otra familia hay que meterla en `document.fonts` a mano o el canvas
// mide y dibuja con la del sistema, la textura queda cacheada asi para siempre, y la pieza sale
// entera en una grotesca cualquiera. NO TIRA NINGUN ERROR: se ve recien en el video terminado.
//
// El camino de main.js no alcanza: saltea la carga cuando `document.fonts.check()` dice que si, y esa
// funcion contesta true para una familia que no existe —da por buena la que el sistema va a usar de
// reemplazo—. Por eso el test de aca abajo recorre el SET y compara familias, que es lo unico que
// distingue "esta cargada" de "hay algo con que dibujarla".
//
// Va en el modulo del aire, con await de nivel superior, porque main.js lo importa con `await
// import(...)` ANTES de rasterizar el primer glifo. El guard de `document` es para poder importar el
// aire desde Node (lo hacen adn-check y guion-check).
if (typeof document !== 'undefined' && document.fonts) {
  for (const nombre of ['PlayfairDisplay-700', 'Spectral-400', 'DarkerGrotesque-900']) {
    if ([...document.fonts].some(f => f.family === nombre)) continue
    try {
      const ff = new FontFace(nombre, `url(/fonts/${nombre}.ttf)`)
      await ff.load()
      document.fonts.add(ff)
    } catch (e) { console.error('aire lujo, fuente ' + nombre + ': ' + e.message) }
  }
}

// TRES VESTUARIOS TIPOGRAFICOS, y la semilla elige (ver `fuentesDe` en adn.js). La tipografia es la
// mitad de la identidad de una pieza: con un solo par, dos versiones del mismo video se ven iguales por
// mucho que cambien el guion y el montaje. Los tres pares viven DENTRO del caracter de este aire y
// nunca cruzan registro — una cara equivocada es peor que ninguna variedad.
const CARAS_LUJO = [
  { display: 'PlayfairDisplay-700', apoyo: 'Spectral-400' },
  { display: 'DarkerGrotesque-900', apoyo: 'Spectral-400' },
  { display: 'Fraunces-600', apoyo: 'Newsreader-400' },
  { display: 'DarkerGrotesque-700', apoyo: 'Newsreader-400' },
]

// Las caras que demo.html NO declara por @font-face hay que meterlas en document.fonts a mano, o el
// render sale en la grotesca del sistema. El await de nivel superior frena el import de este aire hasta
// que estan cargadas, o sea antes del primer glifo rasterizado — `texto()` cachea la textura para
// siempre. Lo cazan E-FUENTE-LLEGA y E-FUENTE-RESUELVE sobre caras[].
if (typeof document !== 'undefined' && document.fonts && typeof FontFace === 'function') {
  await Promise.all(['DarkerGrotesque-700', 'DarkerGrotesque-900', 'Fraunces-600', 'Newsreader-400', 'PlayfairDisplay-700', 'Spectral-400'].map(async nombre => {
    if ([...document.fonts].some(f => f.family === nombre)) return
    try {
      document.fonts.add(await new FontFace(nombre, `url(/fonts/${nombre}.ttf)`, { weight: '100 900' }).load())
    } catch (e) { console.error('aire lujo, cara ' + nombre + ': ' + (e && e.message)) }
  }))
}

export default {
  id: 'lujo',
  bpm: 76,
  paleta: { tinta: '#f4efe4', bg: '#080706', bg2: '#141009', acento: '#c9a227', acento2: '#8c7a4a', calido: '#e0c579' },
  fuentes: CARAS_LUJO[0],
  caras: CARAS_LUJO,
  // DOS VESTUARIOS, y la semilla elige. masthead de revista de moda. A diferencia de Playfair no tiene finos que el bloom se coma.
  gesto: {
    // sin overshoot: lo caro no rebota. Se posa.
    llega: () => 'power4.out',
    frena: () => 'power4.out',
    acelera: () => 'power2.in',
    // El vaiven mas LENTO del catalogo. power3.inOut se demora en los extremos: la cosa llega, se
    // queda un instante de mas y recien vuelve. Es la diferencia entre algo que oscila y algo que se
    // toma su tiempo — y este aire declara en su encabezado que nunca se apura. Estaba en sine.inOut,
    // o sea respirando igual que el aire tecnico.
    vaiven: () => 'power3.inOut',
  },
  camara: { dolly: 0.45, orbita: 0.35 },
  // bloom bajo y grano fino: el brillo del oro tiene que leerse como metal, no como neón.
  // LA FORMA DE LA LUZ, no solo cuanta: ovalo casi puro y la fuente arriba: es el foco de una vitrina, y la esquina
  // oscura es la que hace que el oro se lea como oro.
  // HALACION: el oro no brilla blanco. El halo tiene que traer el color del metal.
  pelicula: { bloom: 0.42, umbral: 0.78, grano: 0.025, vinieta: 1.0, aberr: 0.0008, vinietaForma: 0.10, vinietaCentro: [0.5, 0.56], halacion: { color: '#f0c66a', fuerza: 0.45 } },
  // EL MOBILIARIO DEL CUADRO: solo el degrade. Lo caro se vende con AIRE, no con lineas.
  // Ver el comentario largo de MOB en kit.js — antes esto estaba horneado en las escenas y
  // por eso dos piezas de rubros opuestos seguian teniendo el mismo mueble.
  // DE DONDE VIENE LA LUZ DEL FONDO: el foco mas cerrado del catalogo y alto: vitrina.
  mobiliario: { fondo: 'arcos', fondos: ['arcos', 'destellos', 'contorno'], marco: 'passepartout', marcos: ['passepartout', 'cantoneras', 'rotulado'], hud: false, fondoForma: 0.05, fondoCentro: [0.5, 0.64] },   // el pasepartu de un cuadro colgado: enmarca por el vacio
  // COMO CORTA ESTE AIRE: SIN FLASH. Dos frames de blanco en una pieza de joyeria se leen como un error de
  // archivo, no como acento. Corta seco o pasa una banda; nunca golpea.
  transiciones: ['corte', 'corte', 'corte', 'barrido', 'corte', 'barrido', 'iris'],

}
