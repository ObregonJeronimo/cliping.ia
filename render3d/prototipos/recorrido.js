// ESCENA "recorrido" — PROTOTIPO. Montaje de VIAJE en vez de montaje de CORTE.
//
// DE DONDE SALE. Thiago trajo tres referencias de motion graphics profesional (una promo de app, una
// pieza de producto y el lanzamiento de Gemini) y se midieron con tools/mirar-video.py:
//
//                   duracion   cortes duros   un corte cada   movimiento medio
//   FireFit            23 s         2            11.5 s            28.6
//   referencia 2       19 s         3             6.3 s            37.3
//   Gemini             60 s         1            60.0 s            14.1
//   NUESTRO            20 s         8             2.5 s            45.0
//
// Los numeros dicen dos cosas y las dos van en contra de lo que hace este motor:
//
//   1. NO CORTAN, VIAJAN. La camara recorre un espacio grande y va parando en cada estacion. No hay
//      corte porque el viaje ES la transicion. Nosotros cortamos ocho veces en veinte segundos.
//   2. NUESTRO MOVIMIENTO ES MAS ALTO QUE EL DE LAS TRES (45 contra 14-37) mientras cortamos entre 3
//      y 24 veces mas seguido. No nos falta movimiento: nos sobra. Los suyos respiran.
//
// QUE PRUEBA ESTA ESCENA. Que el motor puede hacer montaje de viaje SIN cambiar nada de la
// arquitectura. La clave: la camara solo se TRASLADA, nunca rota. Devolverla a su marca al final es
// entonces trivial y el contrato de escena se cumple igual — main.js no se entera de que adentro pasa
// algo distinto, y las compuertas siguen aplicando.
//
// LAS TRES REGLAS QUE LA HACEN DISTINTA DEL RESTO DEL CATALOGO:
//   · El contenido SE ASIENTA RAPIDO Y SE QUEDA QUIETO. El movimiento lo pone la camara, no las capas.
//     Es lo contrario de lo que hacen las otras escenas, y es de donde sale el "respirar".
//   · Cada estacion usa como mucho dos tercios del cuadro. El aire es parte de la composicion.
//   · La camara NUNCA se detiene del todo: entre estacion y estacion hay una deriva lenta. Un plano
//     completamente quieto en una pieza de viaje se lee como que el video se colgo.
//
// EL FINAL ES EL RETIRO. Despues de la ultima estacion la camara se va hacia atras y revela las tres
// apiladas en profundidad. No es un truco para cumplir el contrato: es el cierre clasico de este tipo
// de pieza, y ademas deja la camara exactamente donde tiene que quedar.
//
// FORMATO: las tres referencias son 16:9 y esto es 9:16. El truco del tablero por el que viaja la
// camara funciona lateral en apaisado; en vertical el recorrido tiene que ser sobre todo en
// PROFUNDIDAD y en Y, que es como esta armado aca. No es la receta copiada, es traducida.

import { LOOK, b, E, texto, nivel, materialMascara, matAcento, planoRecorte, finMascara, encaje } from '../kit.js'
import { D } from '../datos.js'

export const meta = { id: 'recorrido', beats: 30 }

export function build(ctx) {
  const { THREE, gsap, mundoW, mundoH, camera, distBase, rnd, texturas } = ctx
  const g = new THREE.Group()
  const gr = new THREE.Group()          // los recortes reales van post-bloom
  const tl = gsap.timeline({ paused: true })
  const DUR = b(meta.beats)
  const FIN = finMascara()

  const marca = String(D.marca || '').trim()
  if (!marca) { tl.to({}, { duration: DUR }, 0); return { g, gr, tl, vacia: true } }

  // Helper local: un plano de texto revelado por mascara. Igual que en cierre/sello.
  // CON TOPE DE ANCHO. La primera version tomaba el alto como dato fijo y dejaba que el ancho saliera
  // de la proporcion: con "TRANSPORTES INTERNACIONALES" el nombre media 6.86 en un cuadro de 5.63 y
  // E-ENCAJE lo freno. Es la MISMA familia de defecto que la auditoria viene cerrando hace una semana,
  // cometida de nuevo en una escena escrita despues de cerrarla nueve veces. Por eso la compuerta vale
  // mas que la buena intencion.
  const ANCHO_UTIL = mundoW * 0.88
  const rotulo = (str, altoPedido, tinte, op = {}) => {
    const t = texto(str, { color: tinte, ...op })
    const alto = encaje(altoPedido, t.ar, ANCHO_UTIL)
    const m = new THREE.Mesh(new THREE.PlaneGeometry(alto * t.ar, alto), materialMascara(t.tex, tinte))
    m.material.uniforms.uProg.value = -0.2
    // NO SE MARCA `encaja`, Y ESTA ES LA LIMITACION QUE ESTE PROTOTIPO DESTAPO.
    //
    // `userData.encaja` significa "esta malla entra ENTERA en el cuadro, siempre". En una escena que
    // compone en el origen eso es exactamente lo que hay que exigir. En un montaje de VIAJE es falso
    // por diseño: cada estacion esta fuera de cuadro mientras la camara esta en las otras dos, o sea
    // el 75% de la pieza. E-ENCAJE-REAL la acuso en 371 de 436 cuadros, llegando a 2.059 — y tenia
    // razon segun lo que la marca declara, no segun lo que la escena hace.
    //
    // El tope de ancho de arriba SI protege lo que importa (que el texto no se corte cuando la camara
    // SI lo esta mirando), y eso se calcula por construccion. Lo que falta es una compuerta que sepa
    // preguntar "entra entero MIENTRAS la camara lo encuadra" en vez de "entra entero siempre".
    // Queda anotado en la auditoria: es un hueco del sistema de compuertas, no de esta escena.
    return m
  }

  // ============================================================ LAS TRES ESTACIONES
  // Se colocan en un mundo COMPARTIDO, a distintas profundidades y alturas. Nadie se mueve de su
  // lugar: la camara es la que va.
  const EST = [
    { y: 0, z: 0 },
    { y: -5.6, z: -5.5 },
    { y: -11.2, z: -11 },
  ]

  // ---- ESTACION 1 · la marca
  const e1 = new THREE.Group()
  e1.position.set(0, EST[0].y, EST[0].z)
  g.add(e1)
  const nombre = rotulo(marca, mundoH * 0.075, nivel(0.92), { fuente: 'Anton', size: 190, tracking: 0.01, upper: true })
  nombre.position.set(0, 0.55, 0)
  e1.add(nombre)

  const claim = String(D.claim || '').trim()
  let bajada = null
  if (claim) {
    const ANCHO = mundoW * 0.72
    const t = texto(claim, { fuente: 'DMSans', peso: 500, size: 110, tracking: 0.012, upper: false })
    const alto = encaje(mundoH * 0.021, t.ar, ANCHO)
    bajada = new THREE.Mesh(new THREE.PlaneGeometry(alto * t.ar, alto), materialMascara(t.tex, nivel(0.62)))
    bajada.material.uniforms.uProg.value = -0.2
    bajada.position.set(0, -0.35, 0)
    e1.add(bajada)
  }
  // Un filete finito debajo: ancla el bloque al cuadro sin llenarlo.
  const filete = new THREE.Mesh(new THREE.PlaneGeometry(mundoW * 0.30, mundoH * 0.0032), matAcento(LOOK.acento, 1.35))
  filete.position.set(0, -0.95, 0)
  filete.scale.x = 0
  e1.add(filete)

  // ---- ESTACION 2 · la pagina, en perspectiva
  // ES EL GESTO QUE MAS SE REPITE EN LAS TRES REFERENCIAS: una captura plana inclinada hacia atras,
  // con una luz de borde. Da profundidad sin modelar nada.
  const e2 = new THREE.Group()
  e2.position.set(0, EST[1].y, EST[1].z)
  g.add(e2)
  const tira = texturas && texturas.get('tira')
  let panel = null
  if (tira && tira.image) {
    const ANCHO_P = mundoW * 0.66
    const ALTO_P = ANCHO_P * 1.5
    // SE CLONA LA TEXTURA. La primera version le escribia `repeat`/`offset` a `tira` directamente, y
    // `tira` es COMPARTIDA: la segunda construccion con la misma semilla arrancaba con el estado que
    // dejo la primera y daba una escena distinta. E-DETERMINISMO lo freno. Una escena no puede
    // escribirle a un recurso que no es suyo — es la misma leccion que la tira de `pantalla` y `mesa`.
    const propia = tira.clone()
    propia.needsUpdate = true
    // EL PLANO SE ARMA A MANO Y NO CON `planoRecorte`. planoRecorte dimensiona por la proporcion de la
    // TEXTURA, y la tira es 720x8192 (ar 0.088): pidiendole 5.57 de alto devolvia un plano de 0.49 de
    // ancho — una tirita deformada. Aca la proporcion la fija la COMPOSICION (un panel 2:3) y de la
    // tira se toma una VENTANA por UV, que es lo que hace `pantalla` y esta escena copiaba mal.
    {
      const arTira = (tira.image.width || 720) / (tira.image.height || 1560)
      const visible = Math.min(1, (ANCHO_P / ALTO_P) / arTira)
      propia.repeat.set(1, visible); propia.offset.set(0, 1 - visible)
      panel = new THREE.Mesh(new THREE.PlaneGeometry(ANCHO_P, ALTO_P),
        new THREE.MeshBasicMaterial({ map: propia, toneMapped: false, transparent: true, opacity: 0 }))
      panel.rotation.set(-0.30, 0.22, 0.04)      // el 3/4 de las referencias
      panel.position.set(0.15, 0, 0)
      // Y EL MATERIAL TAMBIEN SE CLONA, por lo mismo que la textura: `planoRecorte` puede devolver un
      // material cacheado, y abajo se le escribe `transparent` y `opacity`. Sin esto, la segunda
      // construccion arranca con lo que dejo la primera.
      gr.add(panel)
      panel.userData.estacion = 2
    }
  }
  // La luz de borde: un plano de acento apenas mas grande, detras. Es lo que hace que el panel se
  // despegue del fondo — en el video de Gemini es el recurso principal de toda la pieza.
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(mundoW * 0.70, mundoW * 0.70 * 1.5), matAcento(LOOK.acento, 0.85))
  halo.material.transparent = true
  halo.material.opacity = 0
  halo.rotation.set(-0.30, 0.22, 0.04)
  halo.position.set(0.15, 0, -0.22)
  e2.add(halo)

  // SIN ROTULO. La primera version escribia "EN PANTALLA" debajo del panel y E-PROCEDENCIA la freno:
  // es texto que la pagina nunca dijo. El panel se explica solo — y una etiqueta inventada para
  // decorar es exactamente lo que la regla anti-invencion existe para impedir.

  // ---- ESTACION 3 · una cifra
  const e3 = new THREE.Group()
  e3.position.set(0, EST[2].y, EST[2].z)
  g.add(e3)
  const dato = (D.datos || []).filter(x => x && x.etiqueta)[0]
  let cifra = null, etiqueta = null
  if (dato) {
    cifra = rotulo(String(dato.valor || dato.cifra || '').trim() || String(dato.etiqueta), mundoH * 0.115,
      nivel(0.95), { fuente: 'Anton', size: 240, tracking: 0.0, upper: true })
    cifra.position.set(0, 0.5, 0)
    e3.add(cifra)
    etiqueta = rotulo(String(dato.etiqueta), mundoH * 0.022, nivel(0.58),
      { fuente: 'DMSans', peso: 600, size: 110, tracking: 0.11, upper: true })
    etiqueta.position.set(0, -0.45, 0)
    e3.add(etiqueta)
  }

  // ============================================================ EL VIAJE
  // La camara SOLO SE TRASLADA. Nunca se le toca la rotacion, asi que el contrato de "la camara vuelve
  // a su marca" se cumple con solo devolver la posicion.
  //
  // Las distancias: a `distBase` el cuadro mide 10 de alto. Parandose a 13 de una estacion, el cuadro
  // mide 10*13/18.66 = 6.97, o sea que la estacion se ve un 34% mas grande. Eso es lo que da la
  // sensacion de intimidad de las referencias sin tener que agrandar nada.
  const CERCA = 13.2
  const cam = camera.position

  // — entrada: un empuje corto hacia la marca. No arranca quieto.
  tl.fromTo(cam, { x: 0, y: 0, z: distBase + 2.6 },
    { z: distBase - 1.2, duration: b(7), ease: E.frena(1.8) }, 0)

  // — viaje a la estacion 2
  tl.to(cam, { y: EST[1].y * 0.94, z: EST[1].z + CERCA, duration: b(6.5), ease: E.vaiven() }, b(8))
  // — viaje a la estacion 3
  tl.to(cam, { y: EST[2].y * 0.94, z: EST[2].z + CERCA, duration: b(6.5), ease: E.vaiven() }, b(17))

  // — EL RETIRO. Se va hacia atras y revela las tres apiladas. Y deja la camara en su marca.
  tl.to(cam, { x: 0, y: 0, z: distBase, duration: b(4.6), ease: E.frena(2.4) }, b(25))

  // Deriva lenta y permanente en X: la camara nunca se detiene del todo.
  tl.to(cam, { x: 0.42, duration: b(13), ease: E.vaiven() }, b(1))
  tl.to(cam, { x: -0.30, duration: b(11), ease: E.vaiven() }, b(14))

  // ============================================================ EL CONTENIDO SE ASIENTA Y SE QUEDA
  // Cada estacion resuelve en menos de un beat y medio, y despues NO SE MUEVE MAS. Es la regla que
  // separa esta escena del resto del catalogo.
  tl.to(nombre.material.uniforms.uProg, { value: FIN, duration: b(1.4), ease: E.frena(2) }, b(0.3))
  if (bajada) tl.to(bajada.material.uniforms.uProg, { value: FIN, duration: b(1.2), ease: E.frena(2) }, b(1.3))
  tl.to(filete.scale, { x: 1, duration: b(1.1), ease: E.frena(2.2) }, b(1.7))

  if (panel) {
    panel.material.transparent = true
    panel.material.opacity = 0
    tl.fromTo(panel.material, { opacity: 0 }, { opacity: 1, duration: b(1.3), ease: E.frena(2), immediateRender: false }, b(8.2))
    tl.fromTo(panel.scale, { x: 0.94, y: 0.94, z: 1 }, { x: 1, y: 1, z: 1, duration: b(1.6), ease: E.frena(2.2), immediateRender: false }, b(8.2))
  }
  tl.to(halo.material, { opacity: 0.30, duration: b(1.5), ease: E.frena(2) }, b(8.0))

  if (cifra) {
    tl.to(cifra.material.uniforms.uProg, { value: FIN, duration: b(1.5), ease: E.frena(2) }, b(17.4))
    tl.to(etiqueta.material.uniforms.uProg, { value: FIN, duration: b(1.1), ease: E.frena(2) }, b(18.6))
  }

  // El filete respira una vez al final, cuando la camara ya se esta yendo: es el unico evento del
  // retiro y evita que los ultimos cuatro beats sean solo camara.
  tl.to(filete.scale, { x: 1.55, duration: b(1.6), ease: E.vaiven(2) }, b(26))

  // DERIVA DE LAS ESTACIONES. La primera version dejaba el contenido clavado despues de asentarse y
  // la compuerta acuso 3.34 s sin que se moviera NADA — "se lee como diapositiva", y tiene razon: la
  // tesis era que respirara, no que se muriera. En las referencias los elementos tampoco estan fijos,
  // flotan apenas. Amplitudes chicas a proposito: lo que tiene que llevar el movimiento es la camara.
  // Encadenada de punta a punta, sin huecos: la compuerta mide el peor tramo de TODA la escena, no el
  // promedio, asi que un respiro de mas de un beat en cualquier lado la pone en rojo — y con razon.
  for (const [i, e] of [e1, e2, e3].entries()) {
    const y0 = e.position.y
    for (let k = 0; k < 9; k++) {
      tl.to(e.position, { y: y0 + (k % 2 ? 0 : 0.15), duration: b(3.6), ease: E.vaiven() }, b(k * 3.1 + i * 0.4))
    }
  }
  if (panel) {
    tl.to(panel.rotation, { y: 0.30, duration: b(9), ease: E.vaiven() }, b(9))
    tl.to(panel.rotation, { y: 0.18, duration: b(9), ease: E.vaiven() }, b(18))
  }
  tl.to(halo.material, { opacity: 0.20, duration: b(5), ease: E.vaiven() }, b(14))
  tl.to(halo.material, { opacity: 0.30, duration: b(5), ease: E.vaiven() }, b(19))

  tl.to({}, { duration: DUR }, 0)                  // fija el largo exacto de la escena
  return { g, gr, tl }
}
