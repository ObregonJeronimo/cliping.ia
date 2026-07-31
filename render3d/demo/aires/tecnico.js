// AIRE "tecnico" — el de ANTHEM. Oscuro, HUD, acento eléctrico, ritmo alto y gestos decididos.
// Para: software, fintech, herramientas, cripto, ingeniería, agencias digitales.
// Es el aire por defecto: sus valores son EXACTAMENTE los que se usaron para componer la pieza, así
// que sirve de línea de base contra la cual medir a los demás.
// LAS CARAS DEL SEGUNDO VESTUARIO HAY QUE REGISTRARLAS IGUAL. demo.html declara por @font-face solo
// las cinco de ANTHEM; cualquier otra familia que este aire pueda elegir con la semilla tiene que entrar
// en `document.fonts` a mano o la mitad de los renders sale en la grotesca del sistema. Lo cazo
// E-FUENTE-LLEGA al extenderla a caras[]: es el mismo defecto que ya tenian cuatro aires, entrando por
// la puerta nueva.
if (typeof document !== 'undefined' && document.fonts && typeof FontFace === 'function') {
  for (const nombre of ['Archivo-900', 'IBMPlexMono-400']) {
    if ([...document.fonts].some(f => f.family === nombre)) continue
    try {
      const ff = new FontFace(nombre, `url(/fonts/${nombre}.ttf)`)
      await ff.load()
      document.fonts.add(ff)
    } catch (e) { console.error('aire tecnico, cara ' + nombre + ': ' + (e && e.message)) }
  }
}

// TRES VESTUARIOS TIPOGRAFICOS, y la semilla elige (ver `fuentesDe` en adn.js). La tipografia es la
// mitad de la identidad de una pieza: con un solo par, dos versiones del mismo video se ven iguales por
// mucho que cambien el guion y el montaje. Los tres pares viven DENTRO del caracter de este aire y
// nunca cruzan registro — una cara equivocada es peor que ninguna variedad.
const CARAS_TECNICO = [
  { display: 'Anton', apoyo: 'DMSans' },
  { display: 'Archivo-900', apoyo: 'IBMPlexMono-400' },
  { display: 'InterTight-700', apoyo: 'Inter-500' },
  { display: 'Bricolage', apoyo: 'Inter-600' },
  { display: 'SpaceGrotesk-700', apoyo: 'JetBrainsMono-400' },
]

// Las caras que demo.html NO declara por @font-face hay que meterlas en document.fonts a mano, o el
// render sale en la grotesca del sistema. El await de nivel superior frena el import de este aire hasta
// que estan cargadas, o sea antes del primer glifo rasterizado — `texto()` cachea la textura para
// siempre. Lo cazan E-FUENTE-LLEGA y E-FUENTE-RESUELVE sobre caras[].
if (typeof document !== 'undefined' && document.fonts && typeof FontFace === 'function') {
  await Promise.all(['Archivo-900', 'IBMPlexMono-400', 'Inter-500', 'Inter-600', 'InterTight-700', 'JetBrainsMono-400', 'SpaceGrotesk-700'].map(async nombre => {
    if ([...document.fonts].some(f => f.family === nombre)) return
    try {
      document.fonts.add(await new FontFace(nombre, `url(/fonts/${nombre}.ttf)`, { weight: '100 900' }).load())
    } catch (e) { console.error('aire tecnico, cara ' + nombre + ': ' + (e && e.message)) }
  }))
}

export default {
  id: 'tecnico',
  bpm: 124,
  paleta: { tinta: '#f2f4f8', bg: '#05060a', bg2: '#0b1020', acento: '#5b6cff', acento2: '#00e5c0', calido: '#ff5a3c' },
  fuentes: CARAS_TECNICO[0],
  caras: CARAS_TECNICO,
  // DOS VESTUARIOS, y la semilla elige. Anton es condensada de cartel; Archivo-900 con mono de apoyo es placa de ingenieria y hoja
  // de especificacion. Los dos dicen "tecnico" y no se confunden entre si.
  // gesto vacío = la familia base: llegadas con overshoot, frenadas por potencia. Decidido, seco.
  gesto: {},
  camara: { dolly: 1.0, orbita: 1.0 },
  pelicula: { bloom: 0.85, umbral: 0.62, grano: 0.055, vinieta: 0.9, aberr: 0.0022 },
  // EL MOBILIARIO DEL CUADRO: el HUD de ANTHEM entero: es la referencia y no se toca.
  // Ver el comentario largo de MOB en kit.js — antes esto estaba horneado en las escenas y
  // por eso dos piezas de rubros opuestos seguian teniendo el mismo mueble.
  mobiliario: { fondo: 'fuga', fondos: ['fuga', 'circuito', 'topografia'], marco: 'escuadras', marcos: ['escuadras', 'ticks', 'escalimetro'], hud: true },   // la linea de base de ANTHEM: no se toca
  // COMO CORTA ESTE AIRE: el reparto de ANTHEM tal cual: es la linea de base y no se toca.
  // un solo cambio sobre la linea de base y en la ultima posicion: el reparto de ANTHEM se conserva.
  transiciones: ['corte', 'corte', 'flash', 'barrido', 'empuje', 'golpe', 'tajo', 'atraviesa'],

}
