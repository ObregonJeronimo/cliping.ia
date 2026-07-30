// AIRE "jugueton" — coral pleno, crema, amarillo y menta. Gordo, redondo y elastico.
// Para: jugueterias, heladerias, apps casuales, contenido infantil, cumpleanos, mascotas, pediatria.
//
// LO PRIMERO QUE HAY QUE ROMPER ES EL FONDO NEGRO.
// Las otras familias de aires apoyan sobre negro porque ahi el bloom convierte el acento en luz. Acá
// eso esta mal: un juguete no brilla en la oscuridad, es un objeto de color plano bajo luz de dia. El
// fondo pasa a ser un CORAL PLENO (#e8402f al borde, #ff7a4d en el centro) y la tinta pasa a crema.
// La pieza deja de ser "algo iluminado" y pasa a ser "algo impreso", que es exactamente el registro
// de una juguetería.
//
// EL FONDO CLARO ES UNA TRAMPA PARA EL BLOOM y hay que medirla, no intuirla. Sobre negro el pase
// florece cuatro objetos; sobre un fondo que ya tiene luminancia propia puede florecer el cuadro
// ENTERO y la pieza sale lavada, sin negros y sin dibujo. Los numeros de esta paleta en lineal:
//   fondo centro 0.357 · +pulso maximo 0.559 · titular a LUM 0.600 · tinta plena 0.917
//   amarillo x1.15 0.819 · menta x1.15 0.661
// El umbral va en 0.72: el FONDO NUNCA lo alcanza, ni siquiera cuando el pulso late al maximo, y el
// titular gigante queda 0.12 por debajo. Florecen la tipografia a intensidad plena y el amarillo — o
// sea el brillo de caramelo sobre los objetos, no una neblina sobre todo. Y la fuerza baja a 0.40:
// un fondo claro necesita MENOS bloom que uno negro para el mismo efecto percibido, no mas.
// La vinieta tambien baja a 0.5. Una vinieta cerrada es dramatica, y esto no lo es.
//
// LENTO NO ES QUIETO — Y BLANDO TAMPOCO. 120 BPM (beat de medio segundo justo) no es un ritmo lento,
// es un ritmo que se puede seguir con la mano: rapido para que nada se detenga, redondo para que no
// se lea agresivo.
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
  for (const nombre of ['BagelFatOne-400', 'Quicksand-700']) {
    if ([...document.fonts].some(f => f.family === nombre)) continue
    try {
      const ff = new FontFace(nombre, `url(/fonts/${nombre}.ttf)`)
      await ff.load()
      document.fonts.add(ff)
    } catch (e) { console.error('aire jugueton, fuente ' + nombre + ': ' + e.message) }
  }
}

// TRES VESTUARIOS TIPOGRAFICOS, y la semilla elige (ver `fuentesDe` en adn.js). La tipografia es la
// mitad de la identidad de una pieza: con un solo par, dos versiones del mismo video se ven iguales por
// mucho que cambien el guion y el montaje. Los tres pares viven DENTRO del caracter de este aire y
// nunca cruzan registro — una cara equivocada es peor que ninguna variedad.
const CARAS_JUGUETON = [
  { display: 'BagelFatOne-400', apoyo: 'Quicksand-700' },
  { display: 'Caprasimo-400', apoyo: 'Outfit-700' },
  { display: 'Righteous-400', apoyo: 'Quicksand-500' },
  { display: 'BagelFatOne-400', apoyo: 'Outfit-400' },
  { display: 'Righteous-400', apoyo: 'Outfit-400' },
]

// Las caras que demo.html NO declara por @font-face hay que meterlas en document.fonts a mano, o el
// render sale en la grotesca del sistema. El await de nivel superior frena el import de este aire hasta
// que estan cargadas, o sea antes del primer glifo rasterizado — `texto()` cachea la textura para
// siempre. Lo cazan E-FUENTE-LLEGA y E-FUENTE-RESUELVE sobre caras[].
if (typeof document !== 'undefined' && document.fonts && typeof FontFace === 'function') {
  await Promise.all(['BagelFatOne-400', 'Caprasimo-400', 'Outfit-400', 'Outfit-700', 'Quicksand-500', 'Quicksand-700', 'Righteous-400'].map(async nombre => {
    if ([...document.fonts].some(f => f.family === nombre)) return
    try {
      document.fonts.add(await new FontFace(nombre, `url(/fonts/${nombre}.ttf)`, { weight: '100 900' }).load())
    } catch (e) { console.error('aire jugueton, cara ' + nombre + ': ' + (e && e.message)) }
  }))
}

export default {
  id: 'jugueton',
  bpm: 120,
  paleta: {
    tinta: '#fff4e6',      // crema, no blanco puro: sobre coral el blanco puro vibra
    bg: '#e8402f',         // coral saturado en el borde del cuadro
    bg2: '#ff7a4d',        // coral naranja en el centro — el cuadro tiene sol adentro
    acento: '#ffd93d',     // amarillo: filetes, grilla, cantos
    acento2: '#3fe0b0',    // verde menta: lo que la escena quiere destacar
    calido: '#5fd0ff',     // celeste, el cuarto primario en dosis chicas
  },
  fuentes: CARAS_JUGUETON[0],
  caras: CARAS_JUGUETON,
  gesto: {
    // ACA SI VA ELASTIC. Es el unico aire donde una llegada que rebota dos veces antes de asentarse
    // no se lee como error de timing sino como caracter. El periodo baja cuando la escena pide mas
    // fuerza (n de 1.8 a 3.2 -> periodo de 0.47 a 0.40), y con amplitud 1 el sobrepaso queda entre
    // 17% y 25%: rebota de verdad y aun asi vuelve al lugar exacto, que es lo que separa un rebote
    // de un temblor.
    llega: (n = 2.2) => `elastic.out(1, ${Math.max(0.34, Math.min(0.50, 0.56 - n * 0.05)).toFixed(2)})`,
    // Las frenadas se pasan apenas: sin eso, entre rebote y rebote la pieza vuelve a moverse a
    // maquina y se nota el remiendo. Los barridos de mascara (n>=5) siguen con expo, que es lo que
    // hace que una palabra se escriba de un tiron.
    frena: (n = 2) => (n >= 5 ? 'expo.out' : 'back.out(1.05)'),
    // Salir tomando impulso hacia atras primero: es la anticipacion de dibujo animado y es gratis.
    acelera: (n = 2) => `back.in(${(1.1 + n * 0.15).toFixed(2)})`,
    // Se pasa de largo en LOS DOS extremos. Es el unico aire donde el vaiven rebota, y es el unico
    // donde corresponde: todo lo demas de este archivo dice lo mismo.
    vaiven: (n = 0) => (n ? 'back.inOut(1.3)' : 'back.inOut(1.05)'),
  },
  // Camara con juego: se mueve mas que la del aire tecnico pero sin la violencia de la deportiva.
  camara: { dolly: 1.25, orbita: 1.15 },
  // LA FORMA DE LA LUZ, no solo cuanta: plano como un afiche: el aro suave le pondria drama a un aire que no lo quiere.
  // HALACION: magenta: el aire ya grita, y el halo grita con el.
  pelicula: { bloom: 0.40, umbral: 0.72, radio: 0.55, grano: 0.03, vinieta: 0.5, aberr: 0.0012, vinietaForma: 0.80, halacion: { color: '#ff4fd8', fuerza: 0.6 } },
  // EL MOBILIARIO DEL CUADRO: celdas que se encienden en el beat; sin corchetes, que enfrian.
  // Ver el comentario largo de MOB en kit.js — antes esto estaba horneado en las escenas y
  // por eso dos piezas de rubros opuestos seguian teniendo el mismo mueble.
  // DE DONDE VIENE LA LUZ DEL FONDO: plano y centrado, como un afiche.
  mobiliario: { fondo: 'bloques', fondos: ['bloques', 'puntos', 'terrazo'], marco: 'nada', marcos: ['nada', 'cantoneras', 'escuadras'], hud: false, fondoForma: 0.80, fondoCentro: [0.5, 0.5] },   // el color y la forma ya gritan; un marco encima es ruido
  // COMO CORTA ESTE AIRE: el unico donde el corte duro es minoria: todo se mueve, que es el punto.
  // el mas energico del catalogo: el punch es su gesto natural.
  transiciones: ['empujeV', 'flash', 'golpe', 'corte', 'flash', 'empujeV'],

}
