// AIRE "artesanal" — tierra y papel, serif con mano, y un movimiento que avanza A SALTITOS.
// Para: ceramica, panaderia, huerta, conservas, feria, marroquineria, cerveceria de barrio.
//
// LA IDEA
// Lo hecho a mano no es lo LENTO: es lo IMPERFECTO. Una pieza artesanal se delata en que el
// movimiento no sale de una maquina — se posa con un temblorcito y algunas cosas entran a saltos,
// como un stop-motion filmado cuadro a cuadro sobre una mesa de trabajo. De ahi sale toda la
// personalidad de este aire.
//
// LOS SALTITOS, Y POR QUE NO VAN EN TODOS LADOS
// `llega` devuelve `steps(3)` SOLO cuando la escena pide un golpe corto (n >= 2.8: son las entradas
// de 0.2 a 0.4 beats, los pops de escala, los puntos que aparecen). Ahi el saltito se lee como
// artesania. Si `steps` cayera tambien sobre las llegadas largas —los planos que viajan de z=-13 a 0
// durante beats enteros— la pieza pasaria un tercio de cada movimiento CLAVADA en un valor y el
// analizador lo ve como lo que es: frames quietos. El movimiento continuo (`vaiven`, `frena` de los
// revelados largos) se queda en curvas suaves; el saltito es condimento, no la comida.
//
// EL BLOOM, CONTRA UNA TINTA CREMA
// La tinta no es blanco puro sino papel crudo (#f7ecd6, luminancia ~0.90). Con el umbral del aire
// base (0.62) florece entera y la tipografia se convierte en una mancha color manteca sobre el fondo
// tierra. Umbral 0.86 la deja pasar apenas: el ocre y el musgo quedan por debajo a proposito, porque
// en esta pieza el color es PIGMENTO y no luz. Lo unico que brilla es el papel.
//
// EL RADIO ES MAS PELIGROSO QUE LA FUERZA. Primera version de este aire: radio 0.9 con fuerza baja
// (0.38), buscando una difusion tibia de luz de horno. Lo que salio fue otra cosa: con el radio cerca
// de 1 el UnrealBloomPass pondera las mips mas gruesas y el halo deja de ser un halo — es un LEVANTE
// de todo el cuadro. La escena de tipografia salio con el fondo lavado a un gris parejo y la palabra
// COMPONE casi invisible, gris sobre gris. Medido: ocupacion 0.146 y contraste 0.128, los dos por el
// piso. Radio 0.55 (mas corto que el 0.62 del aire base) devuelve el halo al borde del glifo, y recien
// ahi la fuerza puede subir a 0.52 sin lavar nada.
//
// El fondo es tierra OSCURA y no barro medio: un ocre sobre un marron claro es el mismo color dos
// veces, y ademas de leerse plano deja al analizador sin nada que contar como "cuadro ocupado".
// El grano va alto (0.085) porque aca no es "ruido de camara" sino el poro del papel. La viñeta baja
// a 0.78: al maximo apagaba las esquinas y con ellas el marco, los filetes y los renglones de datos.

// ---------------------------------------------------------------- las fuentes, cargadas por el aire
// EL AIRE CARGA SU PROPIA TIPOGRAFIA. main.js tiene una rama que la carga por FontFace, pero esta
// guardada por `document.fonts.check('400 100px "Fraunces-900"')` — y en Chrome check() devuelve TRUE
// para una familia que no existe: contesta "puedo dibujar ese texto" porque puede, con la fuente del
// sistema. Resultado medido en este repo: `document.fonts` se queda con las cinco del CSS, el canvas
// mide con la del sistema, la textura queda cacheada asi para siempre y la pieza sale entera en una
// grotesca cualquiera. No tira ningun error; se ve recien en el video terminado.
// Se hace en el modulo del aire, con await de nivel superior, porque main.js lo importa con `await
// import(...)` ANTES de rasterizar el primer glifo: cuando la promesa del modulo resuelve, las
// fuentes ya estan en el set. El guard de `document` es para poder importar el aire desde Node.
if (typeof document !== 'undefined' && document.fonts) {
  for (const nombre of ['Fraunces-900', 'PermanentMarker-400']) {
    if ([...document.fonts].some(f => f.family === nombre)) continue
    try {
      const ff = new FontFace(nombre, `url(/fonts/${nombre}.ttf)`)
      await ff.load()
      document.fonts.add(ff)
    } catch (e) { console.error('aire artesanal, fuente ' + nombre + ': ' + e.message) }
  }
}

export default {
  id: 'artesanal',
  bpm: 104,
  paleta: {
    tinta: '#f7ecd6',      // papel crudo, sin blanquear
    bg: '#0f0a06',         // tierra mojada — el borde del cuadro
    bg2: '#241708',        // barro: el centro del degrade, como una mesa de madera al fondo del taller
    acento: '#d3821f',     // ocre quemado
    acento2: '#7f8a45',    // verde musgo
    calido: '#b8402c',     // el rojo del sello de lacre
  },
  fuentes: { display: 'Fraunces-900', apoyo: 'PermanentMarker-400' },
  gesto: {
    // El saltito, solo en los golpes cortos. Para todo lo demas un overshoot CHICO: lo hecho a mano
    // se pasa un poquito y vuelve, pero no rebota como una zapatilla.
    llega: (n = 2.2) => (n >= 2.8 ? 'steps(3)' : `back.out(${(n * 0.75).toFixed(2)})`),
    // Frenadas blandas. `expo.out` mete todo el recorrido en el primer 10% y despues no se mueve
    // nada: se lee a maquina Y deja frames quietos. Potencias bajas reparten el movimiento.
    frena: (n = 2) => (n >= 4 ? 'power2.out' : 'power1.out'),
    acelera: (n = 2) => `power${Math.max(1, n - 1)}.in`,
    vaiven: (n = 0) => (n ? `power${Math.min(2, n)}.inOut` : 'sine.inOut'),
  },
  camara: { dolly: 0.75, orbita: 0.85 },
  pelicula: { bloom: 0.52, umbral: 0.86, radio: 0.55, grano: 0.085, vinieta: 0.78, aberr: 0.0020 },
  // EL MOBILIARIO DEL CUADRO: el mismo papel, mas calido por la paleta.
  // Ver el comentario largo de MOB en kit.js — antes esto estaba horneado en las escenas y
  // por eso dos piezas de rubros opuestos seguian teniendo el mismo mueble.
  mobiliario: { fondo: 'puntos', marco: 'reglas', hud: false },   // papel: el filete de arriba y abajo de una pagina compuesta a mano
  // COMO CORTA ESTE AIRE: lo hecho a mano no tiene efectos: casi todo corte, con una sola banda que respira.
  transiciones: ['corte', 'corte', 'barrido', 'corte', 'corte', 'corte'],

}
