// AIRE "inmobiliario" — grafito, blanco hueso, azul de cianotipo y naranja de obra.
// Para: desarrollos, arquitectura, construccion, estudios de diseño, mobiliario, reformas.
//
// LA IDEA
// El producto ES el espacio, asi que el espacio tiene que sentirse: dolly alto y orbita baja. La
// camara de este aire AVANZA (recorre, entra, atraviesa) en vez de girar alrededor — girar es lo que
// hace una pieza de producto; recorrer es lo que hace una pieza de arquitectura.
//
// EL GESTO: ALINEAR, NO REBOTAR
// Nada se pasa de largo. Un plano que rebota al llegar dice "esto es blando"; en una marca que vende
// obra eso es exactamente lo contrario del mensaje. `llega` es power3.out: entra rapido y se posa con
// una cola larga, la lectura fisica de algo pesado que encaja. Los revelados usan `circ.out`, que
// arranca de golpe y desacelera sobre un arco — se lee a servo, a plotter, a guia de cajon. Dos
// familias distinguibles y ninguna con overshoot.
//
// EL BLOOM: EL AZUL ES TINTA, NO NEON
// Umbral 0.90. Por encima queda solo el hueso de la tipografia, asi que el azul de cianotipo y el
// naranja de obra NO florecen: se leen como pigmento sobre papel de plano, que es de donde vienen. Si
// el umbral bajara al del aire base, los filetes de acento se encenderian y la pieza se iria a
// "software" — el mismo error de lectura que un render de arquitectura con lens flares. Fuerza 0.42 y
// radio corto: un halo justo, del ancho de un antialias, no una nube.
//
// Grano bajo y viñeta suave a proposito: la iluminacion pareja de un render arquitectonico. La
// aberracion casi cero, porque lo que este aire vende es que las lineas rectas son rectas.

// ---------------------------------------------------------------- las fuentes, cargadas por el aire
// EL AIRE CARGA SU PROPIA TIPOGRAFIA. main.js tiene una rama que la carga por FontFace, pero esta
// guardada por `document.fonts.check('400 100px "Sora-800"')` — y en Chrome check() devuelve TRUE
// para una familia que no existe: contesta "puedo dibujar ese texto" porque puede, con la fuente del
// sistema. Resultado medido en este repo: `document.fonts` se queda con las cinco del CSS, el canvas
// mide con la del sistema, la textura queda cacheada asi para siempre y la pieza sale entera en una
// grotesca cualquiera. No tira ningun error; se ve recien en el video terminado.
// Se hace en el modulo del aire, con await de nivel superior, porque main.js lo importa con `await
// import(...)` ANTES de rasterizar el primer glifo: cuando la promesa del modulo resuelve, las
// fuentes ya estan en el set. El guard de `document` es para poder importar el aire desde Node.
if (typeof document !== 'undefined' && document.fonts) {
  for (const nombre of ['Sora-800', 'SpaceGrotesk-500']) {
    if ([...document.fonts].some(f => f.family === nombre)) continue
    try {
      const ff = new FontFace(nombre, `url(/fonts/${nombre}.ttf)`)
      await ff.load()
      document.fonts.add(ff)
    } catch (e) { console.error('aire inmobiliario, fuente ' + nombre + ': ' + e.message) }
  }
}

export default {
  id: 'inmobiliario',
  bpm: 96,
  paleta: {
    tinta: '#f2f0ea',      // blanco hueso
    bg: '#0d0f11',         // grafito al borde del negro
    bg2: '#1d242a',        // grafito frio, el centro del degrade
    acento: '#2f6fb0',     // azul de cianotipo
    acento2: '#e0703a',    // naranja de obra
    calido: '#c85a24',
  },
  fuentes: { display: 'Sora-800', apoyo: 'SpaceGrotesk-500' },
  gesto: {
    llega: () => 'power3.out',
    frena: (n = 2) => (n >= 4 ? 'circ.out' : 'power2.out'),
    acelera: (n = 2) => (n >= 3 ? 'power3.in' : 'power2.in'),
    vaiven: (n = 0) => (n ? `power${Math.min(2, n)}.inOut` : 'sine.inOut'),
  },
  camara: { dolly: 1.55, orbita: 0.55 },
  pelicula: { bloom: 0.42, umbral: 0.90, radio: 0.5, grano: 0.034, vinieta: 0.62, aberr: 0.0007 },
  // ESTE AIRE NO DECLARABA MOBILIARIO Y SALIA CON EL DE ANTHEM. El merge de configurar() le pegaba
  // el MOBILIARIO_BASE entero —grilla en fuga, corchetes de camara y rotulos de ficha tecnica—, o sea
  // que el aire de arquitectura, el que mas necesita AIRE, se veia como una herramienta de ingenieria.
  // No lo decidio nadie: se heredo. Ahora lo declara, y adn-check exige que todos lo declaren.
  //
  // 'nada' de fondo porque el producto ES el espacio (ver LA IDEA, arriba) y una grilla en fuga lo
  // llena. 'ticks' porque la acotacion es el vocabulario literal de un plano, y este aire ya tiene el
  // azul de cianotipo para dibujarla.
  mobiliario: { fondo: 'nada', marco: 'ticks', hud: false },
}
