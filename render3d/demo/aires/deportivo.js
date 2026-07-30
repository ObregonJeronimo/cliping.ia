import { pot } from '../kit.js'
// AIRE "deportivo" — negro y naranja flúor, condensada, ritmo alto y gestos violentos.
// Para: gimnasios, indumentaria deportiva, suplementos, competencias, motor, esports.
//
// Acá el overshoot se exagera (back.out(4) contra el 2.2 del base): todo llega pasándose y vuelve de
// golpe, que es la lectura física de "fuerza". El BPM sube a 140 — la pieza dura menos y cada beat
// pega. Y las frenadas son de potencia baja para que el movimiento llegue rápido y corte seco en vez
// de deslizarse hasta detenerse.
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
  for (const nombre of ['Barlow-600', 'Oswald-700']) {
    if ([...document.fonts].some(f => f.family === nombre)) continue
    try {
      const ff = new FontFace(nombre, `url(/fonts/${nombre}.ttf)`)
      await ff.load()
      document.fonts.add(ff)
    } catch (e) { console.error('aire deportivo, fuente ' + nombre + ': ' + e.message) }
  }
}

// TRES VESTUARIOS TIPOGRAFICOS, y la semilla elige (ver `fuentesDe` en adn.js). La tipografia es la
// mitad de la identidad de una pieza: con un solo par, dos versiones del mismo video se ven iguales por
// mucho que cambien el guion y el montaje. Los tres pares viven DENTRO del caracter de este aire y
// nunca cruzan registro — una cara equivocada es peor que ninguna variedad.
const CARAS_DEPORTIVO = [
  { display: 'BigShoulders', apoyo: 'Barlow-600' },
  { display: 'Oswald-700', apoyo: 'Barlow-600' },
  { display: 'Archivo-900', apoyo: 'InterTight-500' },
]

// Las caras que demo.html NO declara por @font-face hay que meterlas en document.fonts a mano, o el
// render sale en la grotesca del sistema. El await de nivel superior frena el import de este aire hasta
// que estan cargadas, o sea antes del primer glifo rasterizado — `texto()` cachea la textura para
// siempre. Lo cazan E-FUENTE-LLEGA y E-FUENTE-RESUELVE sobre caras[].
if (typeof document !== 'undefined' && document.fonts && typeof FontFace === 'function') {
  await Promise.all(['Archivo-900', 'Barlow-600', 'InterTight-500', 'Oswald-700'].map(async nombre => {
    if ([...document.fonts].some(f => f.family === nombre)) return
    try {
      document.fonts.add(await new FontFace(nombre, `url(/fonts/${nombre}.ttf)`, { weight: '100 900' }).load())
    } catch (e) { console.error('aire deportivo, cara ' + nombre + ': ' + (e && e.message)) }
  }))
}

export default {
  id: 'deportivo',
  bpm: 140,
  paleta: { tinta: '#ffffff', bg: '#08090b', bg2: '#16181d', acento: '#ff5a1f', acento2: '#e8ff3a', calido: '#ff2d55' },
  fuentes: CARAS_DEPORTIVO[0],
  caras: CARAS_DEPORTIVO,
  // DOS VESTUARIOS, y la semilla elige. Oswald es la otra condensada del deporte: mas estrecha y con remates rectos.
  gesto: {
    llega: (n = 2.2) => `back.out(${Math.min(4.6, n * 1.8)})`,
    frena: () => 'power2.out',
    acelera: (n = 2) => pot(Math.min(4, n + 1), 'in'),
    vaiven: () => 'power2.inOut',
  },
  camara: { dolly: 1.5, orbita: 1.3 },
  // El amarillo #e8ff3a entra al pase con R y G casi en 1.0: con umbral 0.58 florece el glifo ENTERO
  // y el texto sale como una mancha blanca. Umbral alto y fuerza moderada — la energia de este aire la
  // dan el ritmo y el overshoot, no la exposicion.
  // LA FORMA DE LA LUZ, no solo cuanta: la fuente apenas abajo: luz de cancha, que viene de los costados y no del cielo.
  pelicula: { bloom: 0.55, umbral: 0.86, grano: 0.075, vinieta: 0.8, aberr: 0.0035, vinietaForma: 0.35, vinietaCentro: [0.5, 0.46] },
  // EL MOBILIARIO DEL CUADRO: lo mismo, que es de donde viene el patron.
  // Ver el comentario largo de MOB en kit.js — antes esto estaba horneado en las escenas y
  // por eso dos piezas de rubros opuestos seguian teniendo el mismo mueble.
  // DE DONDE VIENE LA LUZ DEL FONDO: luz de cancha: viene de los costados, no del cielo.
  mobiliario: { fondo: 'rayas', fondos: ['rayas', 'panal', 'bloques'], marco: 'ticks', hud: false, fondoForma: 0.45, fondoCentro: [0.5, 0.48] },   // acotacion: marca de pista, de cronometro, de medicion
  // COMO CORTA ESTE AIRE: el unico aire donde el flash es mayoria: es el lenguaje del deporte, y los dos ejes
  // de empuje le dan el pique que un corte seco solo no da.
  // el punch reemplaza un corte seco: este aire ya corta duro y le faltaba un acento que no moviera el eje.
  transiciones: ['flash', 'golpe', 'empuje', 'flash', 'corte', 'empujeV'],

}
