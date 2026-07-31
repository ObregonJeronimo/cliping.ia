// AIRE "corporativo" — azul profundo, gris pizarra, un acento medido. Ritmo exacto, gestos sin rebote.
// Para: estudios juridicos, consultoras, seguros, banca, contabilidad, B2B serio.
//
// EL RIESGO DE ESTE AIRE ES EL ABURRIMIENTO, y no se arregla con color. Una pieza sobria que ademas
// se mueve poco no se lee "seria": se lee barata. Asi que la energia entra por otro lado — por la
// PRECISION. El bpm queda en 108 (beat = 0.556 s), tempo de caminata firme: mas lento que el tecnico
// y bastante mas rapido que el de lujo, con los cortes cayendo siempre donde el ojo ya los espera. Lo
// que se saca es el REBOTE, no el movimiento.
//
// GESTO. La autoridad no rebota. `llega` conserva la forma de back.out —que es lo que hace que algo
// "aterrice" en vez de "deslizarse"— pero con el overshoot recortado a menos de la mitad: donde el
// aire base se pasa un 12% y vuelve, este se pasa un 3% y se asienta. Se percibe como firmeza, no
// como salto. `frena` y `acelera` quedan encerradas entre potencia 2 y 3: una escena que pide un
// power5 seco aca cobra un power3, que frena con cuerpo en vez de clavar los frenos.
//
// COLOR. Azul profundo de fondo y no negro puro: el negro absoluto es del aire tecnico y del de lujo,
// y ademas sobre una base ligeramente azulada el gris pizarra del acento2 se lee como material y no
// como texto apagado. Un solo punto calido (bronce) para el testigo y los nodos — es la unica
// temperatura de la paleta y por eso ordena la jerarquia sin gritar.
//
// BLOOM: BAJO PERO NO APAGADO — LA PRIMERA VERSION SE MIDIO Y ESTABA MAL. Con fuerza 0.30 la pieza
// daba 0.11 de ocupacion de cuadro (el piso es 0.18) y 0.175 de frames casi quietos (el techo es
// 0.15): sin halo, lo unico que ocupa cuadro son los glifos, y los cambios de luminancia entre frames
// se quedan por debajo del umbral con el que el analizador cuenta un pixel como "en movimiento". O
// sea que un tratamiento demasiado tenue no se lee sobrio, se lee QUIETO. 0.50 con umbral 0.74 deja
// un halo contenido —sigue siendo la mitad del bloom del aire tecnico— y devuelve el cuadro al piso.
// El acento (luminancia ~0.46) igual queda por debajo del umbral: florece la tipografia blanca, no el
// azul. Un estudio juridico con neon es un estudio juridico que no inspira confianza.

// EL ARNES NO CARGA LAS TIPOGRAFIAS DEL AIRE, ASI QUE LAS CARGA EL AIRE.
// main.js hace `if (document.fonts.check('400 100px "X"')) continue` antes de registrar cada
// FontFace, y en Chrome check() devuelve TRUE para una familia que NO EXISTE: el algoritmo busca las
// caras que hacen falta, no encuentra ninguna, y concluye que estan todas cargadas. O sea que el
// continue se saltea exactamente las tipografias que habia que cargar. El defecto no se ve al
// construir —el canvas mide con la del sistema y la textura queda cacheada— sino en el video
// terminado, con toda la pieza en la serif por defecto de Chrome. Medido: con estas dos declaradas
// aca, 'ANTHEM' a 200px mide 851.8 px; sin ellas, 855.5 px, que es exactamente lo que mide en serif.
// El aire se importa con `await import()`, asi que este await de nivel superior frena la construccion
// hasta que las caras esten registradas — y no hace falta tocar el arnes.

// TRES VESTUARIOS TIPOGRAFICOS, y la semilla elige (ver `fuentesDe` en adn.js). La tipografia es la
// mitad de la identidad de una pieza: con un solo par, dos versiones del mismo video se ven iguales por
// mucho que cambien el guion y el montaje. Los tres pares viven DENTRO del caracter de este aire y
// nunca cruzan registro — una cara equivocada es peor que ninguna variedad.
const CARAS_CORPORATIVO = [
  { display: 'PlusJakartaSans-800', apoyo: 'Inter-500' },
  { display: 'Sora-700', apoyo: 'HankenGrotesk-400' },
  { display: 'Archivo-900', apoyo: 'Barlow-400' },
  { display: 'Inter-800', apoyo: 'Inter-600' },
  { display: 'Archivo-600', apoyo: 'DMSans-400' },
]

// Las caras que demo.html NO declara por @font-face hay que meterlas en document.fonts a mano, o el
// render sale en la grotesca del sistema. El await de nivel superior frena el import de este aire hasta
// que estan cargadas, o sea antes del primer glifo rasterizado — `texto()` cachea la textura para
// siempre. Lo cazan E-FUENTE-LLEGA y E-FUENTE-RESUELVE sobre caras[].
if (typeof document !== 'undefined' && document.fonts && typeof FontFace === 'function') {
  await Promise.all(['Archivo-600', 'Archivo-900', 'Barlow-400', 'DMSans-400', 'HankenGrotesk-400', 'Inter-500', 'Inter-600', 'Inter-800', 'PlusJakartaSans-800', 'Sora-700'].map(async nombre => {
    if ([...document.fonts].some(f => f.family === nombre)) return
    try {
      document.fonts.add(await new FontFace(nombre, `url(/fonts/${nombre}.ttf)`, { weight: '100 900' }).load())
    } catch (e) { console.error('aire corporativo, cara ' + nombre + ': ' + (e && e.message)) }
  }))
}

export default {
  id: 'corporativo',
  bpm: 108,
  paleta: {
    tinta: '#eef2f8',        // blanco frio de papel de informe
    bg: '#0a1120',           // azul profundo — SLATE, no negro: ver la nota de OCUPACION
    bg2: '#17233a',          // pizarra
    acento: '#3a7bd5',       // azul institucional: ningun canal al tope, asi que no se lava al multiplicar
    acento2: '#a3b8d4',      // gris azulado — el secundario es un GRIS, no un segundo color
    calido: '#c08a4a',       // bronce: el unico punto de temperatura de toda la pieza
  },
  fuentes: CARAS_CORPORATIVO[0],
  caras: CARAS_CORPORATIVO,
  gesto: {
    // overshoot recortado: se pasa apenas y se asienta. No es 'power.out' (eso seria el aire de lujo);
    // queda un rastro de aterrizaje, que es lo que separa firme de blando.
    llega: (n = 2.2) => `back.out(${(Math.min(2.2, n) * 0.42).toFixed(2)})`,
    // frenadas de potencia MEDIA: ni el deslizamiento largo de un power4 ni el frenazo de un power5.
    frena: (n = 2) => `power${Math.min(3, Math.max(2, Math.round(n)))}.out`,
    acelera: (n = 2) => `power${Math.min(3, Math.max(2, Math.round(n)))}.in`,
    // power1.inOut es la oscilacion mas NEUTRA que hay: casi lineal, sin acento en los extremos. Es
    // la coherente con el resto de este bloque —'ni el deslizamiento largo ni el frenazo'— y ademas
    // lo separa del aire tecnico, con el que compartia las TRES curvas dominantes siendo los dos
    // alcanzables desde saas, app y otro: el par que un cliente puede ver uno al lado del otro.
    vaiven: () => 'power1.inOut',
  },
  // camara medida y casi sin orbita: el punto de vista de esta pieza no se pasea, se acomoda.
  camara: { dolly: 0.7, orbita: 0.35 },
  // LA FORMA DE LA LUZ, no solo cuanta: rectangular y sobrio: la luz no dibuja, encuadra.
  pelicula: { bloom: 0.56, umbral: 0.72, radio: 0.68, grano: 0.035, vinieta: 0.6, aberr: 0.0009, vinietaForma: 0.70 },
  // EL MOBILIARIO DEL CUADRO: mismo instrumental que tecnico, mas sobrio en el resto.
  // Ver el comentario largo de MOB en kit.js — antes esto estaba horneado en las escenas y
  // por eso dos piezas de rubros opuestos seguian teniendo el mismo mueble.
  // DE DONDE VIENE LA LUZ DEL FONDO: reparte antes que concentrar.
  mobiliario: { fondo: 'circuito', fondos: ['circuito', 'fuga', 'puntos', 'recuento'], marco: 'reglas', marcos: ['reglas', 'escuadras', 'escalimetro'], hud: true, fondoForma: 0.65 },   // la caja de un informe impreso, abierta a los lados
  // COMO CORTA ESTE AIRE: sobrio: casi todo corte duro, y cuando adorna lo hace con la banda y no con un golpe.
  // la persiana es un mecanismo ordenado, que es exactamente lo que este aire dice.
  transiciones: ['corte', 'corte', 'barrido', 'persiana', 'corte', 'empuje', 'atraviesa'],

}
