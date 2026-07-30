// AIRE "bienestar" — verde salvia, arena y blanco roto sobre piedra. Lento, continuo, sin un solo golpe.
// Para: spa, yoga, terapia, cosmetica natural, salud mental, meditacion, nutricion, kinesiologia.
//
// EL FONDO CLARO SE PROBO Y SE DESCARTO — con evidencia, no por gusto.
// La primera version de este aire era papel: bg #e6e1d4, tinta verde oscura, bloom en cero. Se
// renderizo la apertura y se miro. La pieza sale FANTASMA: el titular de `apertura` esta pintado con
// un gris azulado FIJO en la escena (TIPO_GRANDE = '#c3cbdb', luminancia 0.59) que sobre negro se lee
// blanco y sobre crema desaparece; los rotulos de `toro` van en otro gris fijo (#8c95ab) y las
// tarjetas de `tarjetas` son azul marino macizo (#111c40) — tres decisiones tomadas para fondo oscuro
// que viven DENTRO de las escenas, y las escenas no se tocan. Un aire no puede arreglar eso desde
// afuera: puede elegir su tinta, no la de un titular que no la usa.
//
// Asi que la calma se consigue por el otro camino: piedra verde en vez de negro (#141a17 con el centro
// del degrade en #26302b), contraste alto donde hace falta para que se lea, y TRATAMIENTO casi nulo.
// Bloom 0.30 con umbral 0.88: con la salvia en 0.37 de luminancia lineal, ni las masas de color ni la
// tipografia cruzan el umbral — solo los filetes que las escenas multiplican x2.6-x3.4 sacan un halo
// ancho (radio 0.9) y sin fuerza, que es un resplandor de vela y no un neon. Grano 0.022 (la mitad que
// el aire base) y vinieta 0.35 en vez de 0.9: el cuadro queda parejo, sin tunel, sin suciedad.
//
// LENTO NO ES QUIETO — y este es el aire donde eso se puede arruinar.
// 88 bpm deja la pieza en 24.5 s. El gesto saca el golpe pero NO el movimiento: `llega` conserva un
// back.out de una quinta parte de la fuerza que pide la escena (0.44 contra 2.2), un exceso del orden
// del 3% que nadie lee como rebote pero que impide que algo llegue a su marca y se congele ahi.
// `frena` baja de expo (que gasta el 90% del recorrido en el primer 20% del tiempo y despues se
// arrastra, o sea: parece detenido) a potencia 2-3, que reparte la desaceleracion a lo largo de todo
// el tween. Y `vaiven` es sine puro en todos los casos: los balanceos largos de fondo son los que
// sostienen la regla de que nada descansa cuando no esta entrando nada nuevo.

// ---------------------------------------------------------------- las caras se registran ACA
// main.js carga las tipografias del aire salvo que `document.fonts.check('400 100px "Quicksand-700"')`
// diga que ya estan — y eso da TRUE SIEMPRE, porque check() responde por la fuente que se USARIA, y
// para una familia inexistente esa es la de reserva del sistema. O sea: todo lo que no este declarado
// en el CSS de demo.html (Anton, ArchivoBlack, BigShoulders, Bricolage, DMSans) no se carga nunca y la
// pieza sale con el serif por defecto de Chrome. Se midio en la pagina: "ANTHEM HAMBURGO" a 100px mide
// 1036.13 con Quicksand-700, con Fraunces-700 y con una familia inventada — el mismo numero, la misma
// fuente. Este aire es el que peor lo sufria: una redondeada amable no se parece en NADA a un Times, y
// la tira de la primera prueba salio con la apertura en serif.
//
// El arreglo va en main.js, que no es de este aire. Mientras tanto el modulo registra sus dos caras y
// el `await` de nivel superior frena el `await import('./aires/bienestar.js')` de main.js hasta que
// terminaron de cargar: antes del primer glifo rasterizado, que es lo unico que importa porque
// `texto()` cachea la textura para siempre. El rango 100-900 evita la negrita sintetica cuando una
// escena pide peso 900 sobre la cara de 700.

// TRES VESTUARIOS TIPOGRAFICOS, y la semilla elige (ver `fuentesDe` en adn.js). La tipografia es la
// mitad de la identidad de una pieza: con un solo par, dos versiones del mismo video se ven iguales por
// mucho que cambien el guion y el montaje. Los tres pares viven DENTRO del caracter de este aire y
// nunca cruzan registro — una cara equivocada es peor que ninguna variedad.
const CARAS_BIENESTAR = [
  { display: 'Quicksand-700', apoyo: 'Onest-400' },
  { display: 'Outfit-700', apoyo: 'Onest-600' },
  { display: 'HankenGrotesk-700', apoyo: 'Onest-400' },
  { display: 'HankenGrotesk-700', apoyo: 'Outfit-400' },
  { display: 'Quicksand-700', apoyo: 'Onest-600' },
]

// Las caras que demo.html NO declara por @font-face hay que meterlas en document.fonts a mano, o el
// render sale en la grotesca del sistema. El await de nivel superior frena el import de este aire hasta
// que estan cargadas, o sea antes del primer glifo rasterizado — `texto()` cachea la textura para
// siempre. Lo cazan E-FUENTE-LLEGA y E-FUENTE-RESUELVE sobre caras[].
if (typeof document !== 'undefined' && document.fonts && typeof FontFace === 'function') {
  await Promise.all(['HankenGrotesk-700', 'Onest-400', 'Onest-600', 'Outfit-400', 'Outfit-700', 'Quicksand-700'].map(async nombre => {
    if ([...document.fonts].some(f => f.family === nombre)) return
    try {
      document.fonts.add(await new FontFace(nombre, `url(/fonts/${nombre}.ttf)`, { weight: '100 900' }).load())
    } catch (e) { console.error('aire bienestar, cara ' + nombre + ': ' + (e && e.message)) }
  }))
}

export default {
  id: 'bienestar',
  bpm: 88,
  paleta: {
    tinta: '#eef2e9',      // blanco roto, con una gota de verde: el blanco de una toalla, no de un LED
    bg: '#141a17',         // piedra verde: el borde del cuadro
    bg2: '#26302b',        // centro del degrade, apenas mas claro — el cuadro respira desde el medio
    acento: '#93b389',     // salvia
    acento2: '#d9c9a6',    // arena
    calido: '#e3b491',     // durazno seco, para los pocos avisos calidos de la pieza
  },
  fuentes: CARAS_BIENESTAR[0],
  caras: CARAS_BIENESTAR,
  gesto: {
    // Nada se pasa: 0.2 de la fuerza pedida es un overshoot de milimetros. Se POSA, pero sigue vivo el
    // frame en que llega, que es la diferencia entre calmo y congelado.
    llega: (n = 2.2) => `back.out(${(n * 0.2).toFixed(2)})`,
    // sine.out es la frenada mas SUAVE del vocabulario: entra desacelerando desde el primer frame y
    // no tiene el tiron inicial de una potencia. Es literalmente 'se posa', que es lo que dice el
    // comentario de arriba, y power2.out no lo era — era la curva del aire base. Compartia las tres
    // dominantes con gastronomico, y los dos salen del mismo rubro (servicio-local).
    frena: (n = 2) => (n >= 5 ? 'power2.out' : 'sine.out'),
    acelera: () => 'power2.in',
    vaiven: () => 'sine.inOut',
  },
  camara: { dolly: 0.4, orbita: 0.5 },
  // Radio 0.6 y no 0.9: un halo ancho suena a "resplandor suave" y termina siendo un lavado. La salvia
  // que las escenas multiplican x3.4 llega a 1.26 de luminancia — ningun umbral la para — y en el
  // tramo donde `tipografia` FUERZA bloom.strength a 1.15 un radio grande le tiñe medio cuadro de
  // verde. Con el halo corto, la calma la dan la paleta y la vinieta abierta, no la exposicion.
  // LA FORMA DE LA LUZ, no solo cuanta: el unico que corrige aspecto: el ovalo sigue la forma alta del cuadro en vez de
  // ser un circulo en UV, y por eso no aprieta por los lados.
  pelicula: { bloom: 0.3, umbral: 0.88, radio: 0.6, grano: 0.022, vinieta: 0.35, aberr: 0.0006, vinietaForma: 0.25, vinietaAsp: 0.62 },
  // EL MOBILIARIO DEL CUADRO: lo mismo, y por eso el patron existe.
  // Ver el comentario largo de MOB en kit.js — antes esto estaba horneado en las escenas y
  // por eso dos piezas de rubros opuestos seguian teniendo el mismo mueble.
  // DE DONDE VIENE LA LUZ DEL FONDO: corrige aspecto: la luz sigue la forma alta del cuadro y no aprieta por los lados.
  mobiliario: { fondo: 'ondas', fondos: ['ondas', 'malla', 'topografia'], marco: 'nada', marcos: ['nada', 'reglas', 'cantoneras'], hud: false, fondoForma: 0.30, fondoAsp: 0.62 },   // el aire ES el mensaje; cualquier borde lo contradice
  // COMO CORTA ESTE AIRE: SIN FLASH ni empuje: nada que sobresalte. Es el aire cuyo mensaje es la calma y
  // un golpe lo contradice.
  transiciones: ['corte', 'corte', 'barrido', 'corte', 'barrido', 'corte', 'iris'],

}
