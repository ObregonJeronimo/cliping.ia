// AIRE "nocturno" — magenta y violeta sobre negro absoluto, cian de contra, luz que desborda.
// Para: boliches, fiestas, festivales, musica en vivo, DJs, sellos, bares, after.
//
// EL REFERENTE NO ES UNA PANTALLA: SON LUCES REALES EN LA OSCURIDAD.
// De ahi salen las tres decisiones de este aire y todas apuntan al mismo lado. Primero el negro tiene
// que ser NEGRO (bg #02010a, casi cero lineal): un gris oscuro convierte el halo en niebla gris y la
// pieza se lee sucia en vez de nocturna. Segundo el bloom sube fuerte y sobre todo ANCHO — el radio
// pasa de 0.62 a 0.95 — porque lo que delata a una luz de verdad no es el brillo del centro sino el
// halo que se abre alrededor. Y tercero la aberracion cromatica se duplica: un flyer de club siempre
// tiene la lente sucia.
//
// EL BLOOM ES FUERTE PERO NO CIEGO. Con umbral bajo el titular gigante de la escena de tipografia se
// funde en una mancha y se pierde la unica cosa que la pieza tiene que comunicar. Ese titular se
// dibuja a LUM=0.655 de la tinta: en lineal la tinta #f5e9ff vale 0.849, o sea 0.556 despues de LUM.
// El umbral va en 0.58, apenas por encima: el TITULAR NO FLORECE y todo lo que esta por arriba —el
// texto a intensidad plena (0.849), el cian a 1.15 (0.732), el filo caliente del barrido (0.707)—
// florece entero. Ese margen de 0.024 es todo el aire: es la diferencia entre neon y mancha.
//
// El magenta es oscuro en luminancia (0.272 lineal) y por eso NO dispara el bloom cuando se usa como
// relleno — igual que el azul del aire tecnico. Es correcto: el magenta es la PINTURA de la pieza y el
// cian es la LUZ. Si florecieran los dos no habria jerarquia y el cuadro seria una sopa rosa.
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
  for (const nombre of ['Unbounded-800', 'ChakraPetch-500', 'Righteous-400', 'SpaceMono-400']) {
    if ([...document.fonts].some(f => f.family === nombre)) continue
    try {
      const ff = new FontFace(nombre, `url(/fonts/${nombre}.ttf)`)
      await ff.load()
      document.fonts.add(ff)
    } catch (e) { console.error('aire nocturno, fuente ' + nombre + ': ' + e.message) }
  }
}

// TRES VESTUARIOS TIPOGRAFICOS, y la semilla elige (ver `fuentesDe` en adn.js). La tipografia es la
// mitad de la identidad de una pieza: con un solo par, dos versiones del mismo video se ven iguales por
// mucho que cambien el guion y el montaje. Los tres pares viven DENTRO del caracter de este aire y
// nunca cruzan registro — una cara equivocada es peor que ninguna variedad.
const CARAS_NOCTURNO = [
  { display: 'Unbounded-800', apoyo: 'ChakraPetch-500' },
  { display: 'Righteous-400', apoyo: 'SpaceMono-400' },
  { display: 'Sora-800', apoyo: 'JetBrainsMono-400' },
  { display: 'ChakraPetch-700', apoyo: 'SpaceMono-700' },
  { display: 'Unbounded-600', apoyo: 'JetBrainsMono-700' },
]

// Las caras que demo.html NO declara por @font-face hay que meterlas en document.fonts a mano, o el
// render sale en la grotesca del sistema. El await de nivel superior frena el import de este aire hasta
// que estan cargadas, o sea antes del primer glifo rasterizado — `texto()` cachea la textura para
// siempre. Lo cazan E-FUENTE-LLEGA y E-FUENTE-RESUELVE sobre caras[].
if (typeof document !== 'undefined' && document.fonts && typeof FontFace === 'function') {
  await Promise.all(['ChakraPetch-500', 'ChakraPetch-700', 'JetBrainsMono-400', 'JetBrainsMono-700', 'Righteous-400', 'Sora-800', 'SpaceMono-400', 'SpaceMono-700', 'Unbounded-600', 'Unbounded-800'].map(async nombre => {
    if ([...document.fonts].some(f => f.family === nombre)) return
    try {
      document.fonts.add(await new FontFace(nombre, `url(/fonts/${nombre}.ttf)`, { weight: '100 900' }).load())
    } catch (e) { console.error('aire nocturno, cara ' + nombre + ': ' + (e && e.message)) }
  }))
}

export default {
  id: 'nocturno',
  bpm: 128,
  paleta: {
    tinta: '#f5e9ff',      // blanco lila: el blanco puro sobre este bloom se pone lechoso
    bg: '#02010a',         // negro absoluto con una gota de azul
    bg2: '#170833',        // violeta profundo en el centro del cuadro
    acento: '#ff2ec4',     // magenta neon — la pintura
    acento2: '#25e5ff',    // cian — la luz, lo unico que florece de verdad
    calido: '#9a4dff',     // violeta electrico, el tercer color en dosis chicas
  },
  fuentes: CARAS_NOCTURNO[0],
  caras: CARAS_NOCTURNO,
  // DOS VESTUARIOS, y la semilla elige. Righteous es geometrica de marquesina y SpaceMono le pone el registro de pantalla.
  gesto: {
    // REBOTE A LA LLEGADA, SALIDA SECA. Un cartel de fiesta entra golpeando y se va de golpe; nada se
    // desliza hasta detenerse. `llega` exagera el overshoot del base (2.2 -> 3.3) sin llegar al
    // 4.6 del aire deportivo, que se lee a gimnasio; `acelera` se va con expo, que es la curva mas
    // corta que hay: el objeto desaparece antes de que el ojo lo siga.
    llega: (n = 2.2) => `back.out(${Math.min(4.0, n * 1.5).toFixed(2)})`,
    frena: (n = 2) => (n >= 5 ? 'expo.out' : 'power3.out'),
    acelera: (n = 2) => (n >= 3 ? 'expo.in' : `power${Math.min(4, n + 2)}.in`),
    // expo.inOut arranca y termina casi detenido y cruza el medio de golpe: es un pulso, no una
    // oscilacion. Es la respiracion de un lugar con luz estroboscopica, y estaba en sine.inOut, o sea
    // la misma que ocho de los once aires.
    vaiven: (n = 0) => (n ? 'power3.inOut' : 'expo.inOut'),
  },
  // Camara suelta: en un video de fiesta la camara nunca esta en tripode.
  camara: { dolly: 1.35, orbita: 1.25 },
  // LA FORMA DE LA LUZ, no solo cuanta: el aro mas cerrado del catalogo, con la luz cayendo desde arriba: es un cono de
  // luz en un lugar oscuro, que es literalmente el rubro.
  // HALACION: un neon sangra rosa alrededor: es LA firma visual del rubro y lo que separa
  // una foto de club de una captura de pantalla.
  pelicula: { bloom: 1.15, umbral: 0.58, radio: 0.95, grano: 0.05, vinieta: 1.0, aberr: 0.0045, vinietaForma: 0.0, vinietaCentro: [0.5, 0.60], halacion: { color: '#ff2d6f', fuerza: 0.85 } },
  // EL MOBILIARIO DEL CUADRO: diagonales corriendo: la pieza no deja respirar, y sin ficha tecnica.
  // Ver el comentario largo de MOB en kit.js — antes esto estaba horneado en las escenas y
  // por eso dos piezas de rubros opuestos seguian teniendo el mismo mueble.
  // DE DONDE VIENE LA LUZ DEL FONDO: un cono de luz en un lugar oscuro.
  mobiliario: { fondo: 'rayas', fondos: ['rayas', 'destellos', 'fuga'], marco: 'passepartout', marcos: ['passepartout', 'escuadras', 'ticks'], hud: false, fondoForma: 0.0, fondoCentro: [0.5, 0.68] },   // la masa oscura alrededor hace que el neon del centro se lea como neon
  // COMO CORTA ESTE AIRE: club: el flash ES la luz estroboscopica del rubro, y el empuje vertical lo baja al
  // formato en el que se mira.
  // idem deportivo, en el aire de mas contraste del catalogo.
  transiciones: ['corte', 'flash', 'empujeV', 'golpe', 'flash', 'empuje', 'tajo'],

}
