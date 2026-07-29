// AIRE "gastronomico" — carbon calido, ambar y oliva, serif con caracter y todo se sirve en cadencia.
// Para: asador, restaurante, cafe de especialidad, delivery, vinoteca, panaderia, cerveceria.
//
// LA COMIDA NO SE VENDE CON URGENCIA, SE VENDE CON ABUNDANCIA. Por eso el bpm queda en 108 —
// mas alto que el lujo (76) y bastante mas bajo que el tecnico (124): la pieza dura 20 s y cada corte
// cae donde el ojo lo espera, pero ninguna entrada llega apurada. El gesto es lo que hace la mitad del
// trabajo: `llega` conserva el overshoot pero a poco mas de la mitad de fuerza (back.out(1.21) contra
// back.out(2.2) del base) y `vaiven` es sine puro en todos los casos. Traducido: nada golpea, todo se
// POSA con un ultimo balanceo, que es exactamente el movimiento de un plato que se apoya en la mesa.
//
// EL FONDO NO ES NEGRO. #150e0a es carbon con rojo adentro, y el centro del degrade (bg2) sube a un
// terracota tostado: sobre eso el ambar no compite, se apoya. Un negro puro habria hecho de esto un
// aire tecnico con la paleta cambiada.
//
// POR QUE EL BLOOM VA BAJO Y ANCHO
// El ambar #e0912f entra al pase con luminancia lineal 0.36. Multiplicado por 1.15 (el default de
// matAcento) queda en 0.41 y por 1.45 (los filetes gruesos) en 0.52: con umbral 0.72 NINGUNA masa de
// color florece, y solo cruzan el umbral los filetes finos que las escenas multiplican x2.6-x3.4. Eso
// es lo que se busca — que brillen los bordes y no los bloques. La fuerza baja a 0.5 y el RADIO sube a
// 0.85: un halo ancho y suave se lee como calor de horno; uno chico y fuerte se lee como neon, que es
// justo el aire equivocado. La crema #f7ecdc (0.85 lineal) al 0.655 de exposicion que usan las escenas
// para el texto grande queda en 0.56, tambien por debajo del umbral: la tipografia sale nitida.
//
// El grano sube a 0.078 (contra 0.055 del base). En una pieza de comida la textura es apetito: un
// cuadro limpio de laboratorio vende software, no un asado.

// ---------------------------------------------------------------- las caras se registran ACA
// Y no es un capricho. main.js intenta cargar las tipografias del aire, pero antes pregunta
// `document.fonts.check('400 100px "Fraunces-700"')` y sigue de largo si da true — y da TRUE SIEMPRE:
// check() responde por la fuente que se USARIA para ese texto, y para una familia que no existe esa es
// la de reserva del sistema, que obviamente esta disponible. Resultado: ninguna cara que no este
// declarada en el CSS de demo.html (Anton, ArchivoBlack, BigShoulders, Bricolage, DMSans) llega a
// cargarse nunca y la pieza sale con el serif por defecto de Chrome. Medido en la pagina: el ancho de
// "ANTHEM HAMBURGO" a 100px da 1036.13 con Fraunces-700, con Quicksand-700, con PlayfairDisplay-700 y
// con una familia inventada — el mismo numero, o sea la misma fuente. (Al aire `lujo` le pasa igual:
// su Playfair es Times.)
//
// El arreglo de verdad va en main.js, que este aire no toca. Mientras tanto el modulo se hace cargo de
// sus dos caras: el `await` de nivel superior frena el `await import('./aires/gastronomico.js')` de
// main.js hasta que las fuentes terminaron de cargar, o sea ANTES de que se rasterice el primer glifo
// — que es lo unico que importa, porque `texto()` cachea la textura y una fuente que llega tarde no se
// ve mal, se ve con OTRA tipografia para siempre. El rango de peso 100-900 evita que pedir 900 sobre
// una cara de 700 fabrique una negrita sintetica: en una serif de display eso engorda los remates y se
// nota.
// Fraunces-700 NO EXISTE en tools/fonts: el descargador baja 600 y 900. El FontFace fallaba, el aire
// entero salia en la grotesca del sistema y no lo decia nadie. Va 600 —la mas cercana a la que se
// habia pedido— y no 900, que es la que usa artesanal: dos aires con la misma cara es medio aire.
const CARAS = { display: 'Fraunces-600', apoyo: 'FamiljenGrotesk-500' }

if (typeof document !== 'undefined' && document.fonts && typeof FontFace === 'function') {
  await Promise.all(Object.values(CARAS).map(async nombre => {
    try {
      document.fonts.add(await new FontFace(nombre, `url(/fonts/${nombre}.ttf)`, { weight: '100 900' }).load())
    } catch (e) { console.error('aire gastronomico, fuente ' + nombre + ': ' + (e && e.message)) }
  }))
}

export default {
  id: 'gastronomico',
  bpm: 108,
  paleta: {
    tinta: '#f7ecdc',      // crema — el blanco de esta pieza es un blanco de mantel, no de pantalla
    bg: '#150e0a',         // carbon calido: el borde del cuadro
    bg2: '#2b1a12',        // terracota tostado: el centro del degrade, donde se apoya la tipografia
    acento: '#e0912f',     // ambar
    acento2: '#a6ae5f',    // oliva
    calido: '#c9452b',     // brasa
  },
  fuentes: CARAS,
  gesto: {
    // El overshoot no se saca, se ABLANDA. A 0.55 del valor que pide la escena, la palabra se pasa lo
    // justo para que se lea que llego sola y no que la clavaron.
    llega: (n = 2.2) => `back.out(${(n * 0.55).toFixed(2)})`,
    // Sin expo: la frenada de potencia 5 llega y muere en el ultimo 10% del recorrido, y eso se lee
    // seco. Potencia 2-3 reparte la desaceleracion y deja la cola de movimiento que este aire necesita.
    frena: (n = 2) => (n >= 5 ? 'power3.out' : 'power2.out'),
    acelera: (n = 2) => `power${Math.max(2, n - 1)}.in`,
    // Sine siempre, incluso donde la escena pide potencia: el vaiven de este aire es largo y parejo.
    vaiven: () => 'sine.inOut',
  },
  camara: { dolly: 0.9, orbita: 0.8 },
  // El RADIO es el que casi arruina este aire. Con 0.85 el halo se vuelve ancho y blando, que sonaba a
  // "calor de horno" — hasta que se miro un cuadro: el filete de oliva de `tipografia` (que la escena
  // multiplica x3.4, o sea 1.33 de luminancia: no hay umbral que lo detenga) se convertia en un lavado
  // verde sobre el tercio inferior del cuadro y se comia el epigrafe. Y encima ese momento cae justo
  // donde la escena FUERZA bloom.strength a 1.15, asi que lo que uno pone en el aire ahi no manda.
  // 0.55 deja el halo pegado al objeto: brilla el borde, no el vecindario. El calor lo pone la paleta.
  // LA FORMA DE LA LUZ, no solo cuanta: luz calida de arriba, como la lampara sobre una mesa.
  pelicula: { bloom: 0.46, umbral: 0.76, radio: 0.55, grano: 0.078, vinieta: 0.95, aberr: 0.0015, vinietaForma: 0.15, vinietaCentro: [0.5, 0.55] },
  // EL MOBILIARIO DEL CUADRO: curvas: nada de esquinas duras alrededor de comida.
  // Ver el comentario largo de MOB en kit.js — antes esto estaba horneado en las escenas y
  // por eso dos piezas de rubros opuestos seguian teniendo el mismo mueble.
  // DE DONDE VIENE LA LUZ DEL FONDO: la lampara sobre la mesa, apenas corrida.
  mobiliario: { fondo: 'ondas', marco: 'reglas', hud: false, fondoForma: 0.20, fondoCentro: [0.46, 0.60] },   // la carta de un restaurante lleva filetes, no corchetes de camara
  // COMO CORTA ESTE AIRE: la banda pasa como pasa un plato; el vertical, como se baja por una carta.
  transiciones: ['corte', 'barrido', 'corte', 'corte', 'empujeV', 'corte'],

}
