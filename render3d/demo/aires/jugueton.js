// AIRE "jugueton" — coral pleno, crema, amarillo y menta. Gordo, redondo y elastico.
// Para: jugueterias, heladerias, apps casuales, contenido infantil, cumpleanos, mascotas, pediatria.
//
// LO PRIMERO QUE HAY QUE ROMPER ES EL FONDO NEGRO.
// Las otras familias de aires apoyan sobre negro porque ahi el bloom convierte el acento en luz. Acá
// eso esta mal: un juguete no brilla en la oscuridad, es un objeto de color plano bajo luz de dia. El
// fondo pasa a ser un CORAL PLENO (#e8402f al borde, #ff7a4d en el centro) y la tinta pasa a crema.
// La pieza deja de ser "algo iluminado" y pasa a ser "algo impreso", que es exactamente el registro
// de una juguetería.
//
// EL FONDO CLARO ES UNA TRAMPA PARA EL BLOOM y hay que medirla, no intuirla. Sobre negro el pase
// florece cuatro objetos; sobre un fondo que ya tiene luminancia propia puede florecer el cuadro
// ENTERO y la pieza sale lavada, sin negros y sin dibujo. Los numeros de esta paleta en lineal:
//   fondo centro 0.357 · +pulso maximo 0.559 · titular a LUM 0.600 · tinta plena 0.917
//   amarillo x1.15 0.819 · menta x1.15 0.661
// El umbral va en 0.72: el FONDO NUNCA lo alcanza, ni siquiera cuando el pulso late al maximo, y el
// titular gigante queda 0.12 por debajo. Florecen la tipografia a intensidad plena y el amarillo — o
// sea el brillo de caramelo sobre los objetos, no una neblina sobre todo. Y la fuerza baja a 0.40:
// un fondo claro necesita MENOS bloom que uno negro para el mismo efecto percibido, no mas.
// La vinieta tambien baja a 0.5. Una vinieta cerrada es dramatica, y esto no lo es.
//
// LENTO NO ES QUIETO — Y BLANDO TAMPOCO. 120 BPM (beat de medio segundo justo) no es un ritmo lento,
// es un ritmo que se puede seguir con la mano: rapido para que nada se detenga, redondo para que no
// se lea agresivo.
export default {
  id: 'jugueton',
  bpm: 120,
  paleta: {
    tinta: '#fff4e6',      // crema, no blanco puro: sobre coral el blanco puro vibra
    bg: '#e8402f',         // coral saturado en el borde del cuadro
    bg2: '#ff7a4d',        // coral naranja en el centro — el cuadro tiene sol adentro
    acento: '#ffd93d',     // amarillo: filetes, grilla, cantos
    acento2: '#3fe0b0',    // verde menta: lo que la escena quiere destacar
    calido: '#5fd0ff',     // celeste, el cuarto primario en dosis chicas
  },
  fuentes: { display: 'BagelFatOne-400', apoyo: 'Quicksand-700' },
  gesto: {
    // ACA SI VA ELASTIC. Es el unico aire donde una llegada que rebota dos veces antes de asentarse
    // no se lee como error de timing sino como caracter. El periodo baja cuando la escena pide mas
    // fuerza (n de 1.8 a 3.2 -> periodo de 0.47 a 0.40), y con amplitud 1 el sobrepaso queda entre
    // 17% y 25%: rebota de verdad y aun asi vuelve al lugar exacto, que es lo que separa un rebote
    // de un temblor.
    llega: (n = 2.2) => `elastic.out(1, ${Math.max(0.34, Math.min(0.50, 0.56 - n * 0.05)).toFixed(2)})`,
    // Las frenadas se pasan apenas: sin eso, entre rebote y rebote la pieza vuelve a moverse a
    // maquina y se nota el remiendo. Los barridos de mascara (n>=5) siguen con expo, que es lo que
    // hace que una palabra se escriba de un tiron.
    frena: (n = 2) => (n >= 5 ? 'expo.out' : 'back.out(1.05)'),
    // Salir tomando impulso hacia atras primero: es la anticipacion de dibujo animado y es gratis.
    acelera: (n = 2) => `back.in(${(1.1 + n * 0.15).toFixed(2)})`,
    vaiven: (n = 0) => (n ? 'power1.inOut' : 'sine.inOut'),
  },
  // Camara con juego: se mueve mas que la del aire tecnico pero sin la violencia de la deportiva.
  camara: { dolly: 1.25, orbita: 1.15 },
  pelicula: { bloom: 0.40, umbral: 0.72, radio: 0.55, grano: 0.03, vinieta: 0.5, aberr: 0.0012 },
}
