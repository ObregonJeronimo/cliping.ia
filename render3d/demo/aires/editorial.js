// AIRE "editorial" — papel y tinta. Fondo crema, negro de imprenta, UN rojo de tapa. Ritmo 100.
// Para: medios, newsletters, revistas, cultura, libros, podcasts, periodismo.
//
// ES EL UNICO AIRE DE FONDO CLARO, y eso da vuelta las reglas del tratamiento entero.
//
// 1. EL BLOOM SE APAGA CASI DEL TODO. El papel (#f0e9dc) entra al pase con luminancia ~0.91: con el
//    umbral del aire tecnico (0.62) florece EL CUADRO ENTERO —no el acento, el fondo— y la pieza sale
//    como una hoja sobreexpuesta con el texto comido por el halo. Umbral 0.95 deja el papel por
//    debajo del corte y fuerza 0.14 reserva el poco brillo que queda para los reflejos especulares de
//    los objetos 3D. Es correcto conceptualmente ademas de necesario: la tinta no emite luz.
// 2. LA VIÑETA BAJA A 0.15. Sobre negro una viñeta fuerte es profundidad; sobre papel es un filtro de
//    telefono. Ademas oscurecer los bordes de un fondo claro cuenta como "cuadro ocupado" en el
//    analizador sin que haya nada dibujado ahi — 0.15 mantiene el borde por debajo del umbral de la
//    metrica, asi que lo que se mide es composicion y no el propio tratamiento.
// 3. EL GRANO SUBE. 0.05 sobre un fondo claro no es ruido de video: es TEXTURA DE PAPEL, y es lo que
//    impide que el crema se lea como un blanco digital plano.
//
// COLOR. Tinta casi negra (no negro puro: la tinta sobre papel nunca lo es), crema de fondo, rojo de
// tapa como acento y un azul de imprenta como secundario. El secundario tiene que ser OSCURO: sobre
// papel, un color claro desaparece. Ninguno de los dos llega saturado al pase, asi que ninguno
// florece y el negro sigue siendo negro.
//
// TIPOGRAFIA. Serif de texto para los titulares —Newsreader, que es una serif de diario, no una
// didona de moda— con una grotesca escandinava de apoyo para los rotulos. La jerarquia sale del
// contraste serif/grotesca, no del peso.
//
// GESTO. Precision de composicion tipografica: nada rebota, nada se desliza de mas. `llega` es un
// power2.out —una curva que reparte el recorrido en vez de clavarlo en el primer 20% como haria un
// expo— porque un aire pausado tiene que seguir moviendose TODO el rato; y `vaiven` va en
// power1.inOut, un balanceo parejo de prensa en vez de la respiracion de un seno.

// EL ARNES NO CARGA LAS TIPOGRAFIAS DEL AIRE, ASI QUE LAS CARGA EL AIRE.
// main.js hace `if (document.fonts.check('400 100px "X"')) continue` antes de registrar cada
// FontFace, y en Chrome check() devuelve TRUE para una familia que NO EXISTE: el algoritmo busca las
// caras que hacen falta, no encuentra ninguna, y concluye que estan todas cargadas. O sea que el
// continue se saltea exactamente las tipografias que habia que cargar. El defecto no se ve al
// construir —el canvas mide con la del sistema y la textura queda cacheada— sino en el video
// terminado, con toda la pieza en la serif por defecto de Chrome. En un aire de titulares serif eso
// es todavia mas caro que en los demas, porque la sustitucion "casi funciona": no salta a la vista
// que es Times, solo se ve una pieza sin caracter. El aire se importa con `await import()`, asi que
// este await de nivel superior frena la construccion hasta que las caras esten registradas — y no
// hace falta tocar el arnes.

// TRES VESTUARIOS TIPOGRAFICOS, y la semilla elige (ver `fuentesDe` en adn.js). La tipografia es la
// mitad de la identidad de una pieza: con un solo par, dos versiones del mismo video se ven iguales por
// mucho que cambien el guion y el montaje. Los tres pares viven DENTRO del caracter de este aire y
// nunca cruzan registro — una cara equivocada es peor que ninguna variedad.
const CARAS_EDITORIAL = [
  { display: 'Newsreader-600', apoyo: 'FamiljenGrotesk-500' },
  { display: 'Fraunces-900', apoyo: 'HankenGrotesk-400' },
  { display: 'PlayfairDisplay-900', apoyo: 'Spectral-400' },
  { display: 'Fraunces-900', apoyo: 'FamiljenGrotesk-700' },
  { display: 'Newsreader-600', apoyo: 'Spectral-400' },
]

// Las caras que demo.html NO declara por @font-face hay que meterlas en document.fonts a mano, o el
// render sale en la grotesca del sistema. El await de nivel superior frena el import de este aire hasta
// que estan cargadas, o sea antes del primer glifo rasterizado — `texto()` cachea la textura para
// siempre. Lo cazan E-FUENTE-LLEGA y E-FUENTE-RESUELVE sobre caras[].
if (typeof document !== 'undefined' && document.fonts && typeof FontFace === 'function') {
  await Promise.all(['FamiljenGrotesk-500', 'FamiljenGrotesk-700', 'Fraunces-900', 'HankenGrotesk-400', 'Newsreader-600', 'PlayfairDisplay-900', 'Spectral-400'].map(async nombre => {
    if ([...document.fonts].some(f => f.family === nombre)) return
    try {
      document.fonts.add(await new FontFace(nombre, `url(/fonts/${nombre}.ttf)`, { weight: '100 900' }).load())
    } catch (e) { console.error('aire editorial, cara ' + nombre + ': ' + (e && e.message)) }
  }))
}

export default {
  id: 'editorial',
  bpm: 100,
  paleta: {
    tinta: '#14110d',        // negro de tinta, con una gota de calido
    bg: '#f0e9dc',           // papel crema
    bg2: '#e2dac7',          // el mismo papel, un tono a la sombra
    acento: '#c3362b',       // rojo de tapa
    acento2: '#1d3557',      // azul de imprenta: OSCURO, o sobre papel no existe
    calido: '#9c6b3a',       // ocre de encuadernacion
  },
  fuentes: CARAS_EDITORIAL[0],
  caras: CARAS_EDITORIAL,
  // DOS VESTUARIOS, y la semilla elige. la otra serif editorial del disco, con una grotesca humanista de apoyo.
  gesto: {
    llega: () => 'power2.out',                                   // se posa; no rebota
    frena: (n = 2) => (n >= 4 ? 'expo.out' : 'power3.out'),      // siempre nitida
    acelera: () => 'power2.in',
    vaiven: () => 'power1.inOut',
  },
  // mucho aire y poca deriva: el cuadro es una pagina, y una pagina no orbita.
  camara: { dolly: 0.6, orbita: 0.5 },
  // LA FORMA DE LA LUZ, no solo cuanta: una pagina impresa no tiene aro: tiene margen. La caja apaga los cuatro lados parejo.
  pelicula: { bloom: 0.14, umbral: 0.95, radio: 0.35, grano: 0.05, vinieta: 0.15, aberr: 0.0006, vinietaForma: 0.90 },
  // EL MOBILIARIO DEL CUADRO: reticula de papel: superficie, no profundidad. Una revista no tiene HUD.
  // Ver el comentario largo de MOB en kit.js — antes esto estaba horneado en las escenas y
  // por eso dos piezas de rubros opuestos seguian teniendo el mismo mueble.
  // DE DONDE VIENE LA LUZ DEL FONDO: una pagina no tiene foco: tiene luz pareja.
  mobiliario: { fondo: 'puntos', fondos: ['puntos', 'contorno', 'malla'], marco: 'rotulado', marcos: ['rotulado', 'cantoneras', 'reglas'], hud: false, fondoForma: 0.90 },   // el margen asimetrico de un cuaderno: rompe la simetria del cuadro
  // COMO CORTA ESTE AIRE: el vertical se lee como pasar de pagina, que es exactamente el gesto del rubro.
  transiciones: ['corte', 'corte', 'empujeV', 'corte', 'barrido', 'empujeV', 'iris'],

}
