// HERO "calibre" — un calibre de alturas que baja sobre una pieza mecanizada, la toca y da un valor.
//
// QUE REGISTRO LLENA, Y POR QUE NINGUNO DE LOS TRECE LO LLENABA
// Todos los heroes de geometria pura AFIRMAN algo de si mismos: el cristal dice "soy preciso", la
// columnata dice "soy solido", el motor dice "funciono". Ninguno hace lo unico que sostiene una marca
// que vende control de calidad, laboratorio, diagnostico, certificacion o ingenieria de detalle:
// MEDIR ALGO QUE NO ES EL. Un objeto que se mide a si mismo es decoracion; un instrumento que se apoya
// sobre una pieza ajena y se detiene exactamente donde la pieza termina es una afirmacion verificable,
// y se lee como tal aunque el espectador no sepa que esta mirando un trazador de alturas.
//
// Por eso el hero tiene DOS cuerpos y no uno. La pieza escalonada no es escenografia: es el sujeto. El
// calibre es el predicado.
//
// POR QUE VERTICAL, Y NO UN PIE DE REY ACOSTADO
// El primer boceto fue el calibre que todo el mundo tiene en la cabeza —el pie de rey, horizontal, con
// las mordazas cerrandose—. En un cuadro de 9:16 eso es una barra de 4.8 de largo y 1.2 de alto: ocupa
// una franja y deja el 70% del cuadro vacio arriba y abajo. El trazador de alturas es el MISMO
// instrumento con el eje girado noventa grados, existe igual de verdad y llena la columna entera del
// formato. La forma del cuadro eligio el instrumento, que es como se elige bien.
//
// EL DESCENSO VA EN PELDAÑOS Y ES LA UNICA PARTE QUE NO SE NEGOCIA
// Una medicion no es un movimiento, es una serie de aproximaciones que terminan en un contacto. Un
// carro que baja parejo hasta tocar se lee como una cosa cayendo; uno que avanza, se detiene, avanza y
// se detiene se lee como alguien acercandose CON CUIDADO — que es la diferencia entre bajar algo y
// medirlo. Ademas es la doctrina de `escalera` del kit aplicada donde corresponde: en la quietud de
// cada peldaño las dos submuestras del obturador caen en el mismo lugar y el filo del palpador sale
// nitido, que es justo el detalle que hay que ver para creer que toco.
//
// NO USA NADA DE LA PAGINA: se arma siempre, tambien cuando la captura fallo.
//
// CONTRATO: ver heroes/telefono.js

import { LOOK, b, E, hex, matAcento, nivel, CLARO, dolly, deriva, escalera, deslizFijo, pasosEnBeats } from '../kit.js'

export const meta = {
  id: 'calibre',
  nombre: 'Calibre de alturas',
  necesita: ['nada'],
  beats: 8,
}

const X_COL = -1.45                  // eje de la columna
const ANCHO_COL = 0.44
const BORDE_COL = X_COL + ANCHO_COL / 2      // el canto por donde corre la graduacion
const Y_BASE = -3.74                 // cara superior de la base: el cero del instrumento
const Y_ALTO = 2.95                  // reposo del carro, arriba de todo
const N_TRAZOS = 25

// LA ALTURA QUE SE MIDE, y no es un numero elegido: es la cara de arriba del escalon mas alto de la
// pieza. Sale de la geometria de la pieza y no al reves, porque en cuanto uno de los dos se escriba a
// mano el palpador va a quedar flotando dos milimetros arriba o clavado dos adentro — y eso es
// exactamente el defecto que arruina el hero, porque lo unico que este objeto promete es que TOCA.
const ALTO_PIEZA = 2.42
const Y_TOPE = Y_BASE + ALTO_PIEZA
const X_PALPA = 0.55                 // donde apoya el palpador: el centro del escalon medido

export function build(ctx) {
  const { THREE, gsap, camera, distBase, rnd } = ctx
  const g = new THREE.Group()
  const tl = gsap.timeline({ paused: true })
  const DUR = b(meta.beats)

  // Dos grupos anidados, por la regla de un solo escritor por propiedad: `gLlegada` lleva la entrada y
  // la salida con tweens, `gMec` la deriva continua escrita a mano. Juntos en un solo objeto se
  // pisarian sobre `position.y` y el render dejaria de repetir dos veces igual.
  const gLlegada = new THREE.Group()
  g.add(gLlegada)
  const gMec = new THREE.Group()
  gLlegada.add(gMec)

  // ---------------------------------------------------------------- materiales
  // El instrumento oscuro y la pieza CLARA, y esa inversion es medio hero. Con los dos del mismo gris
  // el palpador llega al escalon y no pasa nada: dos cosas del mismo color que se tocan son una sola
  // cosa. Con la pieza mas clara, el contacto es un canto contra otro y se ve el instante exacto.
  // `nivel()` interpola de FONDO a TINTA, asi que el par se da vuelta solo en un mundo claro y la
  // relacion se mantiene: un valor fijo desaparece en una de las dos polaridades, y eso ya paso tres
  // veces en este repo.
  const matCuerpo = new THREE.MeshPhysicalMaterial({
    color: hex(nivel(CLARO ? 0.40 : 0.21)), roughness: 0.46, metalness: 0.42,
    clearcoat: 0.42, clearcoatRoughness: 0.35,
  })
  const matCarro = () => new THREE.MeshPhysicalMaterial({
    color: hex(nivel(CLARO ? 0.52 : 0.38)), roughness: 0.26, metalness: 0.80,
    clearcoat: 0.65, clearcoatRoughness: 0.16,
  })
  const matPieza = () => new THREE.MeshPhysicalMaterial({
    color: hex(nivel(CLARO ? 0.62 : 0.55)), roughness: 0.31, metalness: 0.62,
    clearcoat: 0.5, clearcoatRoughness: 0.22,
  })
  // Los trazos de la escala NO son de acento. Veinticinco lineas de color encendido en el margen
  // izquierdo son una escalera de neon: el ojo va ahi y no a la punta del palpador, que es donde pasa
  // todo. Van en gris y el acento queda reservado para las dos cosas que el hero afirma — donde esta
  // leyendo ahora, y cuanto midio.
  const matTrazo = () => new THREE.MeshBasicMaterial({
    color: hex(nivel(CLARO ? 0.60 : 0.46)), transparent: true, opacity: 0, toneMapped: false,
  })

  // ---------------------------------------------------------------- base y columna
  const base = new THREE.Mesh(new THREE.BoxGeometry(4.05, 0.32, 1.45), matCuerpo)
  base.position.set(0.08, Y_BASE - 0.16, 0)
  gMec.add(base)
  // El filete del canto frontal de la base. Un prisma mate contra un fondo plano se lee como un
  // rectangulo pintado; una linea de acento en el canto de apoyo le devuelve el filo y ademas dice
  // donde esta el cero del instrumento, que es la referencia contra la que se entiende la medida.
  const cero = new THREE.Mesh(new THREE.PlaneGeometry(3.85, 0.045), matAcento(LOOK.acento, 1.35))
  cero.position.set(0.08, Y_BASE - 0.05, 0.74)
  cero.material.transparent = true
  cero.material.opacity = 0
  gMec.add(cero)

  const columna = new THREE.Mesh(new THREE.BoxGeometry(ANCHO_COL, 7.04, ANCHO_COL), matCuerpo)
  columna.position.set(X_COL, Y_BASE + 7.04 / 2 - 0.02, 0)
  gMec.add(columna)

  // LA GRADUACION. Una larga cada cinco y no todas iguales: con veinticinco rayas del mismo largo el
  // ojo no cuenta nada, ve textura. La jerarquia es lo que convierte una trama en una escala, y es
  // gratis — son las mismas mallas con otro ancho.
  const trazos = []
  for (let i = 0; i < N_TRAZOS; i++) {
    const larga = i % 5 === 0
    const w = larga ? 0.27 : 0.14
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, larga ? 0.036 : 0.028), matTrazo())
    m.position.set(BORDE_COL - w / 2, -3.2 + i * (6.2 / (N_TRAZOS - 1)), ANCHO_COL / 2 + 0.005)
    gMec.add(m)
    trazos.push({ m, larga })
  }

  // ---------------------------------------------------------------- el carro
  const gCarro = new THREE.Group()
  gCarro.position.set(X_COL, Y_ALTO, 0)
  gMec.add(gCarro)

  const cuerpoCarro = new THREE.Mesh(new THREE.BoxGeometry(0.80, 0.68, 0.64), matCarro())
  cuerpoCarro.position.y = 0.42
  gCarro.add(cuerpoCarro)

  // El brazo sale del carro hacia la pieza. Termina en el palpador, y el palpador tiene su cara de
  // abajo EXACTAMENTE en el cero local del grupo: por eso `gCarro.position.y` es, literalmente, la
  // altura que el instrumento esta leyendo. No hay una segunda cuenta que pueda desfasarse.
  const largoBrazo = X_PALPA - X_COL + 0.34
  const brazo = new THREE.Mesh(new THREE.BoxGeometry(largoBrazo, 0.19, 0.32), matCarro())
  brazo.position.set(largoBrazo / 2 + 0.14, 0.17, 0)
  gCarro.add(brazo)
  const palpador = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.15, 0.26), matCarro())
  palpador.position.set(X_PALPA - X_COL, 0.075, 0)
  gCarro.add(palpador)
  // El filo del palpador, en acento y finito. Es lo unico que va a tocar la pieza, o sea el pixel que
  // el espectador tiene que mirar durante ocho beats: sin marcarlo, el contacto pasa desapercibido
  // entre veinte grises.
  const filo = new THREE.Mesh(new THREE.PlaneGeometry(0.30, 0.030), matAcento(LOOK.acento2, 1.5))
  filo.position.set(X_PALPA - X_COL, 0.012, 0.145)
  filo.material.transparent = true
  filo.material.opacity = 0
  gCarro.add(filo)

  // EL INDICE, sobre la escala, a la altura del carro. Es el unico acento del margen izquierdo y viaja
  // con el instrumento: leer una escala es poner una marca contra ella, y eso hay que verlo.
  const indice = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.052), matAcento(LOOK.acento, 1.5))
  indice.position.set(BORDE_COL - X_COL - 0.17, 0, ANCHO_COL / 2 + 0.02)
  indice.material.transparent = true
  indice.material.opacity = 0
  gCarro.add(indice)

  // ---------------------------------------------------------------- el comparador
  // Un reloj comparador montado en el brazo. No es un adorno: es la unica pieza que traduce el
  // movimiento del carro a un movimiento GIRATORIO, y esa traduccion es lo que hace que el descenso se
  // lea como una lectura y no como un desplazamiento. Cuando el carro se detiene en un peldaño, la
  // aguja tambien: son la misma magnitud contada de dos formas.
  const gDial = new THREE.Group()
  gDial.position.set(X_PALPA - X_COL - 1.02, 0.98, 0.16)
  gCarro.add(gDial)
  const caja = new THREE.Mesh(new THREE.CylinderGeometry(0.40, 0.40, 0.13, 34), matCarro())
  caja.rotation.x = Math.PI / 2
  gDial.add(caja)
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    const t = new THREE.Mesh(new THREE.PlaneGeometry(i % 3 === 0 ? 0.11 : 0.06, 0.024), matTrazo())
    t.position.set(Math.cos(a) * 0.30, Math.sin(a) * 0.30, 0.08)
    t.rotation.z = a
    gDial.add(t)
    trazos.push({ m: t, larga: i % 3 === 0 })
  }
  // La aguja pivota en una punta: la geometria se corre medio largo para que el origen del grupo sea el
  // eje. Rotando una malla centrada, la aguja giraria alrededor de su mitad y se leeria como una helice.
  const aguja = new THREE.Mesh(new THREE.PlaneGeometry(0.045, 0.34), matAcento(LOOK.acento, 1.6))
  aguja.geometry.translate(0, 0.34 / 2 - 0.03, 0)
  aguja.position.z = 0.085
  aguja.material.transparent = true
  aguja.material.opacity = 0
  gDial.add(aguja)

  // ---------------------------------------------------------------- el volante
  // Gira exactamente con el carro: es el husillo visto por su mango. Lo que hace es dar una segunda
  // lectura del mismo movimiento en un eje que la vertical no tiene, y sobre todo LLENAR el remate de
  // arriba del cuadro, que en un formato 9:16 es la zona que se queda muerta en casi todo hero.
  const gVolante = new THREE.Group()
  gVolante.position.set(X_COL, 3.55, 0.30)
  gMec.add(gVolante)
  const llanta = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.048, 10, 44), matCarro())
  gVolante.add(llanta)
  for (let i = 0; i < 3; i++) {
    const rayo = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.60, 0.055), matCarro())
    rayo.rotation.z = (i / 3) * Math.PI
    gVolante.add(rayo)
  }

  // ---------------------------------------------------------------- la pieza medida
  // Tres escalones y no un bloque. Un prisma liso no tiene NADA que medir: el instrumento podria estar
  // apoyandose en cualquier lado. Con escalones de tres alturas distintas, la que el palpador elige
  // —siempre la mas alta, porque es la primera con la que se choca bajando— es una decision visible, y
  // eso es lo que convierte el gesto en una medicion en vez de un aterrizaje.
  const escalones = []
  const PLANTA = [
    { x: X_PALPA, w: 0.90, h: ALTO_PIEZA },
    { x: X_PALPA + 0.83, w: 0.76, h: 1.55 },
    { x: X_PALPA - 0.73, w: 0.56, h: 0.95 },
  ]
  PLANTA.forEach((p, i) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(p.w, p.h, 0.90), matPieza())
    // Anclado por la BASE: la pieza crece desde el marmol para arriba, que es como esta apoyada. Con el
    // pivote al medio sube y baja a la vez y se lee como que flota, que es lo contrario de una pieza.
    m.geometry.translate(0, p.h / 2, 0)
    m.position.set(p.x, Y_BASE, 0)
    gMec.add(m)
    escalones.push({ m, alto: p.h, orden: i })
  })

  // LA COTA: el filete horizontal que va del canto de la columna a la pieza, a la altura medida. Es el
  // resultado dibujado, y es lo unico de la escena que no existe hasta que el palpador toca. Crece
  // desde la columna hacia la pieza —geometria corrida al origen izquierdo— porque una cota se lee en
  // la direccion en que se mide.
  const LARGO_COTA = PLANTA[0].x - PLANTA[0].w / 2 - BORDE_COL
  const cota = new THREE.Mesh(new THREE.PlaneGeometry(LARGO_COTA, 0.038), matAcento(LOOK.acento, 1.5))
  cota.geometry.translate(LARGO_COTA / 2, 0, 0)
  cota.position.set(BORDE_COL, Y_TOPE, 0.48)
  cota.scale.x = 0.0001
  cota.material.transparent = true
  gMec.add(cota)
  // Y la cara medida se enciende: sin esto la cota apunta a un canto gris y no se entiende que la
  // afirmacion es sobre ESA cara y no sobre la pieza entera.
  const caraMedida = new THREE.Mesh(new THREE.PlaneGeometry(PLANTA[0].w, 0.042), matAcento(LOOK.acento2, 1.5))
  caraMedida.position.set(PLANTA[0].x, Y_TOPE + 0.006, 0.47)
  caraMedida.material.transparent = true
  caraMedida.material.opacity = 0
  gMec.add(caraMedida)

  // ================================================================ TIEMPO

  // Cuando baja, cuando toca, cuanto se queda y cuando se retira. Escrito arriba de todo lo que lo usa
  // porque son los cuatro instantes que definen la escena entera: la cinematica los lee, los tweens los
  // leen y la salida empieza donde termina el ultimo.
  const T_BAJA0 = b(1.0), T_BAJA1 = b(5.0)
  const T_SUBE0 = b(6.5), T_SUBE1 = b(7.15)
  // Ocho peldaños en cuatro beats: uno cada medio beat, o sea cada tiron cae en la grilla. `pasosEnBeats`
  // se encarga de que la cantidad divida la bajada en medios beats exactos — con cinco o siete peldaños
  // los tirones caerian en 0.8 y 0.57 de beat, o sea en ningun lado, y cada uno es un evento tan audible
  // como un corte. `deslizFijo` clava el tramo en movimiento en 0.18 s pase lo que pase con el tempo: sin
  // eso el mismo descenso dura cinco cuadros de borron a 124 bpm y catorce a 90.
  const PASOS = pasosEnBeats(4, 8)
  const DESLIZ = deslizFijo(T_BAJA1 - T_BAJA0, PASOS)

  // LLEGADA. El conjunto entra desde el fondo, apenas ladeado, y se endereza. La rotacion inicial en Y
  // existe para que el primer cuadro muestre el ESPESOR de la base y de la pieza: de frente y plano,
  // un calibre es un dibujo tecnico, y lo que hay que vender es que son objetos.
  gLlegada.position.set(0, -1.35, -5.6)
  gLlegada.rotation.set(-0.10, 0.44, 0)
  tl.to(gLlegada.position, { y: 0, z: 0, duration: b(1.2), ease: E.llega(1.6) }, 0)
  tl.to(gLlegada.rotation, { x: 0, y: 0, duration: b(1.4), ease: E.llega(1.4) }, 0)

  // La pieza se levanta desde el marmol, de la mas alta a la mas baja. Que la mas alta llegue primero
  // no es un capricho de orden: es la que el palpador va a tocar, asi que tiene que estar puesta antes
  // de que el carro arranque a bajar o el gesto pierde su destino.
  escalones.forEach((e, i) => {
    tl.fromTo(e.m.position, { y: Y_BASE - e.alto * 1.05 },
      { y: Y_BASE, duration: b(0.55), ease: E.llega(1.6), immediateRender: false }, b(0.28 + i * 0.20))
  })
  // La graduacion se enciende de abajo hacia arriba: es el instrumento despertando, y de paso el ojo
  // recorre la escala una vez antes de que empiece a usarse.
  trazos.forEach((t, i) => {
    tl.fromTo(t.m.material, { opacity: 0 },
      { opacity: t.larga ? 0.85 : 0.55, duration: b(0.30), ease: E.frena(2), immediateRender: false },
      b(0.35) + i * b(0.022))
  })
  tl.fromTo(cero.material, { opacity: 0 }, { opacity: 0.85, duration: b(0.5), ease: E.frena(2), immediateRender: false }, b(0.5))
  tl.fromTo(indice.material, { opacity: 0 }, { opacity: 0.95, duration: b(0.4), ease: E.frena(2), immediateRender: false }, b(0.8))
  tl.fromTo(aguja.material, { opacity: 0 }, { opacity: 0.95, duration: b(0.4), ease: E.frena(2), immediateRender: false }, b(0.8))
  tl.fromTo(filo.material, { opacity: 0 }, { opacity: 0.9, duration: b(0.4), ease: E.frena(2), immediateRender: false }, b(0.9))

  // EL CONTACTO. La cota crece y la cara medida se enciende un instante despues de que el palpador
  // llega, no antes: el resultado es consecuencia del contacto, y si aparece junto con el se lee como
  // que estaba decidido de antemano — que es exactamente lo que un instrumento no puede parecer.
  tl.to(cota.scale, { x: 1, duration: b(0.55), ease: E.frena(3) }, T_BAJA1 + b(0.06))
  tl.fromTo(caraMedida.material, { opacity: 0 },
    { opacity: 0.95, duration: b(0.30), ease: E.frena(2), immediateRender: false }, T_BAJA1 + b(0.04))
  // Dos parpadeos del indice sobre la escala, en el beat. Es el "lectura tomada" de cualquier
  // instrumento con luz, y ademas es lo que le da un evento al tramo quieto entre el contacto y el
  // retiro: sin eso la escena se apoya solo en la deriva durante casi un beat.
  for (const k of [5.5, 6.0]) {
    tl.to(indice.material, { opacity: 0.25, duration: b(0.14), ease: E.acelera(2) }, b(k))
    tl.to(indice.material, { opacity: 0.95, duration: b(0.22), ease: E.frena(2) }, b(k) + b(0.14))
  }

  // ---------------------------------------------------------------- lo continuo
  // La altura del carro se escribe ENTERA desde aca, en una sola funcion por tramos, y no con tres
  // tweens encadenados. Es la regla de un solo escritor por propiedad llevada hasta el final: con un
  // tween para bajar, otro para esperar y otro para subir, cualquier reordenamiento de la timeline
  // —que GSAP hace por tiempo de inicio— deja dos de ellos discutiendo el mismo frame. Y ademas asi el
  // indice, la aguja y el volante pueden leer la MISMA altura en vez de una copia suya.
  const salir = gsap.parseEase(E.acelera(3)) || ((u) => u * u * u)
  const alturaCarro = (t) => {
    if (t <= T_BAJA0) return Y_ALTO
    if (t < T_BAJA1) {
      const u = (t - T_BAJA0) / (T_BAJA1 - T_BAJA0)
      return Y_ALTO - (Y_ALTO - Y_TOPE) * escalera(u, PASOS, DESLIZ)
    }
    if (t <= T_SUBE0) return Y_TOPE
    // Se retira ACELERANDO, con la curva del aire y no con una inventada aca: un carro que vuelve
    // despacio se lee como que duda de lo que acaba de medir. La guarda del `||` es por si algun aire
    // devolviera un ease que GSAP no parsea — no deberia (E-EASE-VALIDO lo comprueba en los once), pero
    // un undefined ahi adentro dejaria la altura en NaN y se llevaria puesto medio hero sin decir nada.
    const u = Math.min(1, (t - T_SUBE0) / (T_SUBE1 - T_SUBE0))
    return Y_TOPE + (Y_ALTO - Y_TOPE) * salir(u)
  }

  const fase = rnd() * 6.28, fase2 = rnd() * 6.28
  deriva(tl, DUR, (u, t) => {
    const y = alturaCarro(t)
    gCarro.position.y = y

    // Cuanto recorrio, de 0 en el reposo a 1 en el contacto. Es la magnitud que comparten la aguja y el
    // volante: las dos son la misma medida girada, que es la razon de ser de un comparador.
    const rec = (Y_ALTO - y) / (Y_ALTO - Y_TOPE)
    // Casi una vuelta y media de aguja en toda la carrera. Menos de una vuelta se lee como un
    // potenciometro; mucho mas y en cada peldaño la aguja pega un giro que el ojo no puede seguir y
    // deja de haber correspondencia entre lo que baja y lo que gira.
    let ang = -rec * 5.6
    if (t > T_BAJA1) {
      // El rebote del contacto, amortiguado. Es lo que hace cualquier comparador al apoyar y es la
      // unica forma honesta de decir "toco" sin dibujar un golpe: la aguja se pasa, vuelve, se pasa
      // menos. Se apaga con una exponencial, asi que nunca se corta de golpe en un cuadro.
      const d = t - T_BAJA1
      ang += Math.sin(d * 26.0) * 0.20 * Math.exp(-d / b(1.1))
    }
    // Y un temblor que no se va nunca. Un instrumento de precision apoyado sobre una pieza NO queda
    // quieto —esa es justamente la razon por la que existen las tolerancias— y ademas es lo que evita
    // que el tramo entre la lectura y el retiro sea un cuadro congelado.
    ang += Math.sin(t * 7.3 + fase2) * 0.020
    aguja.rotation.z = ang
    // El volante es el husillo: gira lo mismo que baja el carro, ni mas ni menos. Si girara por su
    // cuenta seria un ventilador pegado arriba de una columna.
    gVolante.rotation.z = -rec * 11.0

    // La deriva del conjunto, con tres periodos que no son multiplos entre si: si lo fueran, los ejes
    // volverian a alinearse cada tanto y todo el instrumento cabecearia como una sola pieza, que se
    // nota mas que la quietud. El giro de reposo en Y vive ACA y no en la entrada —que termina en
    // cero—, asi que ninguno de los dos pisa al otro.
    gMec.rotation.y = 0.16 + Math.sin(t * 0.35 + fase) * 0.050
    gMec.position.x = Math.sin(t * 0.27 + fase2) * 0.048
    gMec.position.y = Math.sin(t * 0.22 + fase) * 0.042
  })

  // ---------------------------------------------------------------- camara
  // Se acerca mientras el carro baja y VUELVE a su marca antes del corte: la escena siguiente arranca
  // contando con (0, 0, distBase). El recorrido es corto porque el instrumento ya ocupa casi todo el
  // semialto del cuadro, y con un aire de dolly 1.55 un acercamiento largo le comeria el volante.
  tl.fromTo(camera.position, { z: dolly(distBase, 0.58) },
    { z: dolly(distBase, -0.40), duration: DUR * 0.82, ease: 'none', immediateRender: false }, 0)
  tl.to(camera.position, { z: distBase, duration: DUR * 0.18, ease: E.vaiven() }, DUR * 0.82)

  // ---------------------------------------------------------------- salida
  // La pieza se hunde en el marmol y el instrumento se va hacia el fondo. Que la pieza desaparezca
  // PRIMERO deja al calibre un instante midiendo el aire, que es la unica forma de cerrar la idea: lo
  // que importaba era la pieza, y el instrumento sin ella no afirma nada.
  const SAL = DUR - b(0.85)
  escalones.forEach((e, i) => {
    tl.to(e.m.position, { y: Y_BASE - e.alto * 1.05, duration: b(0.42), ease: E.acelera(2) }, SAL + i * b(0.05))
  })
  tl.to(cota.scale, { x: 0.0001, duration: b(0.34), ease: E.acelera(3) }, SAL)
  tl.to(caraMedida.material, { opacity: 0, duration: b(0.30), ease: E.acelera(2) }, SAL)
  tl.to(gLlegada.position, { z: -9.5, y: -0.45, duration: b(0.85), ease: E.acelera(3) }, SAL)
  tl.to(gLlegada.rotation, { y: -0.34, duration: b(0.85), ease: E.acelera(2) }, SAL)
  tl.to(cero.material, { opacity: 0, duration: b(0.45), ease: E.acelera(2) }, SAL + b(0.2))
  trazos.forEach((t, i) => {
    tl.to(t.m.material, { opacity: 0, duration: b(0.30), ease: E.acelera(2) }, SAL + b(0.10) + i * b(0.010))
  })

  return { g, tl }
}
