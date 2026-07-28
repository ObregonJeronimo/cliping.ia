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
  fuentes: { display: 'Unbounded-800', apoyo: 'ChakraPetch-500' },
  gesto: {
    // REBOTE A LA LLEGADA, SALIDA SECA. Un cartel de fiesta entra golpeando y se va de golpe; nada se
    // desliza hasta detenerse. `llega` exagera el overshoot del base (2.2 -> 3.3) sin llegar al
    // 4.6 del aire deportivo, que se lee a gimnasio; `acelera` se va con expo, que es la curva mas
    // corta que hay: el objeto desaparece antes de que el ojo lo siga.
    llega: (n = 2.2) => `back.out(${Math.min(4.0, n * 1.5).toFixed(2)})`,
    frena: (n = 2) => (n >= 5 ? 'expo.out' : 'power3.out'),
    acelera: (n = 2) => (n >= 3 ? 'expo.in' : `power${Math.min(4, n + 2)}.in`),
    vaiven: (n = 0) => (n ? 'power2.inOut' : 'sine.inOut'),
  },
  // Camara suelta: en un video de fiesta la camara nunca esta en tripode.
  camara: { dolly: 1.35, orbita: 1.25 },
  pelicula: { bloom: 1.15, umbral: 0.58, radio: 0.95, grano: 0.05, vinieta: 1.0, aberr: 0.0045 },
  // EL MOBILIARIO DEL CUADRO: diagonales corriendo: la pieza no deja respirar, y sin ficha tecnica.
  // Ver el comentario largo de MOB en kit.js — antes esto estaba horneado en las escenas y
  // por eso dos piezas de rubros opuestos seguian teniendo el mismo mueble.
  mobiliario: { fondo: 'rayas', esquinas: true, hud: false },

}
