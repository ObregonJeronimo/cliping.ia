// AIRE "tecnico" — el de ANTHEM. Oscuro, HUD, acento eléctrico, ritmo alto y gestos decididos.
// Para: software, fintech, herramientas, cripto, ingeniería, agencias digitales.
// Es el aire por defecto: sus valores son EXACTAMENTE los que se usaron para componer la pieza, así
// que sirve de línea de base contra la cual medir a los demás.
export default {
  id: 'tecnico',
  bpm: 124,
  paleta: { tinta: '#f2f4f8', bg: '#05060a', bg2: '#0b1020', acento: '#5b6cff', acento2: '#00e5c0', calido: '#ff5a3c' },
  fuentes: { display: 'Anton', apoyo: 'DMSans' },
  // gesto vacío = la familia base: llegadas con overshoot, frenadas por potencia. Decidido, seco.
  gesto: {},
  camara: { dolly: 1.0, orbita: 1.0 },
  pelicula: { bloom: 0.85, umbral: 0.62, grano: 0.055, vinieta: 0.9, aberr: 0.0022 },
  // EL MOBILIARIO DEL CUADRO: el HUD de ANTHEM entero: es la referencia y no se toca.
  // Ver el comentario largo de MOB en kit.js — antes esto estaba horneado en las escenas y
  // por eso dos piezas de rubros opuestos seguian teniendo el mismo mueble.
  mobiliario: { fondo: 'fuga', marco: 'escuadras', hud: true },   // la linea de base de ANTHEM: no se toca

}
