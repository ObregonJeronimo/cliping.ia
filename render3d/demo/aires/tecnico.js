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

export default {
  id: 'tecnico',
  bpm: 124,
  paleta: { tinta: '#f2f4f8', bg: '#05060a', bg2: '#0b1020', acento: '#5b6cff', acento2: '#00e5c0', calido: '#ff5a3c' },
  fuentes: { display: 'Anton', apoyo: 'DMSans' },
  // DOS VESTUARIOS, y la semilla elige. Anton es condensada de cartel; Archivo-900 con mono de apoyo es placa de ingenieria y hoja
  // de especificacion. Los dos dicen "tecnico" y no se confunden entre si.
  caras: [{ display: 'Anton', apoyo: 'DMSans' }, { display: 'Archivo-900', apoyo: 'IBMPlexMono-400' }],
  // gesto vacío = la familia base: llegadas con overshoot, frenadas por potencia. Decidido, seco.
  gesto: {},
  camara: { dolly: 1.0, orbita: 1.0 },
  pelicula: { bloom: 0.85, umbral: 0.62, grano: 0.055, vinieta: 0.9, aberr: 0.0022 },
  // EL MOBILIARIO DEL CUADRO: el HUD de ANTHEM entero: es la referencia y no se toca.
  // Ver el comentario largo de MOB en kit.js — antes esto estaba horneado en las escenas y
  // por eso dos piezas de rubros opuestos seguian teniendo el mismo mueble.
  mobiliario: { fondo: 'fuga', marco: 'escuadras', hud: true },   // la linea de base de ANTHEM: no se toca
  // COMO CORTA ESTE AIRE: el reparto de ANTHEM tal cual: es la linea de base y no se toca.
  transiciones: ['corte', 'corte', 'flash', 'barrido', 'empuje', 'corte'],

}
