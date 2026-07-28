// AIRE "deportivo" — negro y naranja flúor, condensada, ritmo alto y gestos violentos.
// Para: gimnasios, indumentaria deportiva, suplementos, competencias, motor, esports.
//
// Acá el overshoot se exagera (back.out(4) contra el 2.2 del base): todo llega pasándose y vuelve de
// golpe, que es la lectura física de "fuerza". El BPM sube a 140 — la pieza dura menos y cada beat
// pega. Y las frenadas son de potencia baja para que el movimiento llegue rápido y corte seco en vez
// de deslizarse hasta detenerse.
export default {
  id: 'deportivo',
  bpm: 140,
  paleta: { tinta: '#ffffff', bg: '#08090b', bg2: '#16181d', acento: '#ff5a1f', acento2: '#e8ff3a', calido: '#ff2d55' },
  fuentes: { display: 'BigShoulders', apoyo: 'Barlow-600' },
  gesto: {
    llega: (n = 2.2) => `back.out(${Math.min(4.6, n * 1.8)})`,
    frena: () => 'power2.out',
    acelera: (n = 2) => `power${Math.min(4, n + 1)}.in`,
    vaiven: () => 'power2.inOut',
  },
  camara: { dolly: 1.5, orbita: 1.3 },
  // El amarillo #e8ff3a entra al pase con R y G casi en 1.0: con umbral 0.58 florece el glifo ENTERO
  // y el texto sale como una mancha blanca. Umbral alto y fuerza moderada — la energia de este aire la
  // dan el ritmo y el overshoot, no la exposicion.
  pelicula: { bloom: 0.55, umbral: 0.86, grano: 0.075, vinieta: 0.8, aberr: 0.0035 },
  // EL MOBILIARIO DEL CUADRO: lo mismo, que es de donde viene el patron.
  // Ver el comentario largo de MOB en kit.js — antes esto estaba horneado en las escenas y
  // por eso dos piezas de rubros opuestos seguian teniendo el mismo mueble.
  mobiliario: { fondo: 'rayas', esquinas: true, hud: false },

}
