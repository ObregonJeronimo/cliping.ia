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
  for (const nombre of ['PlayfairDisplay-700', 'Spectral-400']) {
    if ([...document.fonts].some(f => f.family === nombre)) continue
    try {
      const ff = new FontFace(nombre, `url(/fonts/${nombre}.ttf)`)
      await ff.load()
      document.fonts.add(ff)
    } catch (e) { console.error('aire lujo, fuente ' + nombre + ': ' + e.message) }
  }
}

export default {
  id: 'lujo',
  bpm: 76,
  paleta: { tinta: '#f4efe4', bg: '#080706', bg2: '#141009', acento: '#c9a227', acento2: '#8c7a4a', calido: '#e0c579' },
  fuentes: { display: 'PlayfairDisplay-700', apoyo: 'Spectral-400' },
  gesto: {
    // sin overshoot: lo caro no rebota. Se posa.
    llega: () => 'power4.out',
    frena: () => 'power4.out',
    acelera: () => 'power2.in',
    vaiven: () => 'sine.inOut',
  },
  camara: { dolly: 0.45, orbita: 0.35 },
  // bloom bajo y grano fino: el brillo del oro tiene que leerse como metal, no como neón.
  // LA FORMA DE LA LUZ, no solo cuanta: ovalo casi puro y la fuente arriba: es el foco de una vitrina, y la esquina
  // oscura es la que hace que el oro se lea como oro.
  pelicula: { bloom: 0.42, umbral: 0.78, grano: 0.025, vinieta: 1.0, aberr: 0.0008, vinietaForma: 0.10, vinietaCentro: [0.5, 0.56] },
  // EL MOBILIARIO DEL CUADRO: solo el degrade. Lo caro se vende con AIRE, no con lineas.
  // Ver el comentario largo de MOB en kit.js — antes esto estaba horneado en las escenas y
  // por eso dos piezas de rubros opuestos seguian teniendo el mismo mueble.
  // DE DONDE VIENE LA LUZ DEL FONDO: el foco mas cerrado del catalogo y alto: vitrina.
  mobiliario: { fondo: 'nada', marco: 'passepartout', hud: false, fondoForma: 0.05, fondoCentro: [0.5, 0.64] },   // el pasepartu de un cuadro colgado: enmarca por el vacio
  // COMO CORTA ESTE AIRE: SIN FLASH. Dos frames de blanco en una pieza de joyeria se leen como un error de
  // archivo, no como acento. Corta seco o pasa una banda; nunca golpea.
  transiciones: ['corte', 'corte', 'corte', 'barrido', 'corte', 'barrido'],

}
