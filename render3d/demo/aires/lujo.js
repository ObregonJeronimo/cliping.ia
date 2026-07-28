// AIRE "lujo" — negro y oro, serif fina, muchísimo aire y movimiento LENTO PERO CONTINUO.
// Para: joyería, alta relojería, inmobiliaria premium, hotelería, vinos, moda de autor.
//
// La trampa de este aire es confundir "lento" con "quieto". Una pieza de lujo se mueve todo el tiempo
// —una deriva de cámara imperceptible, un brillo que recorre un canto— pero NUNCA se apura. Por eso
// baja el BPM (76 en vez de 124: la pieza dura casi el doble y respira) y saca el overshoot: nada
// rebota, todo se posa. `frena` sube a potencia 4 y `llega` deja de pasarse.
export default {
  id: 'lujo',
  bpm: 76,
  paleta: { tinta: '#f4efe4', bg: '#080706', bg2: '#141009', acento: '#c9a227', acento2: '#8c7a4a', calido: '#e0c579' },
  fuentes: { display: 'PlayfairDisplay-700', apoyo: 'Spectral-400' },
  gesto: {
    // sin overshoot: lo caro no rebota. Se posa.
    llega: () => 'power4.out',
    frena: () => 'power4.out',
    acelera: () => 'power2.in',
    vaiven: () => 'sine.inOut',
  },
  camara: { dolly: 0.45, orbita: 0.35 },
  // bloom bajo y grano fino: el brillo del oro tiene que leerse como metal, no como neón.
  pelicula: { bloom: 0.42, umbral: 0.78, grano: 0.025, vinieta: 1.0, aberr: 0.0008 },
  // EL MOBILIARIO DEL CUADRO: solo el degrade. Lo caro se vende con AIRE, no con lineas.
  // Ver el comentario largo de MOB en kit.js — antes esto estaba horneado en las escenas y
  // por eso dos piezas de rubros opuestos seguian teniendo el mismo mueble.
  mobiliario: { fondo: 'nada', esquinas: false, hud: false },

}
