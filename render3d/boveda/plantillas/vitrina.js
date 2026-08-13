// PLANTILLA "vitrina" — una hilera de vitrinas iluminadas por dentro, y una camara que se DEMORA en
// cada una sin llegar a pararse nunca.
//
// EL GESTO
// Una galeria: una hilera continua de vitrinas de vidrio, cada una con su pedestal y su lampara
// adentro, y la camara deslizandose de costado por delante. Lo que hace a esta plantilla no es la
// hilera —`reticula` y `archivo` tambien son muros en desliz— sino EL RITMO DE LA CAMARA: no avanza
// pareja. Vuela entre una vitrina y la siguiente, y se demora en la que esta hablando. El mecanismo no
// esta en el mueble: esta en la camara, que es lo unico que decide cuanto dura cada pieza.
//
// EN QUE SE DIFERENCIA DE `archivo`, QUE ES SU VECINA MAS CERCANA
// En `archivo` el mueble ESCONDE, y el mecanismo consiste en abrirse: el dato sale del cajon, se lee, y
// el cajon lo vuelve a guardar. Aca no se guarda nada y no hay nada que abrir. El contenido esta
// SIEMPRE a la vista y siempre PROTEGIDO —detras del vidrio, sobre su pedestal, con su luz propia— que
// es exactamente lo contrario. La prueba de que la diferencia es real esta en el codigo: `archivo`
// gasta su presupuesto en abrir y cerrar cajones y deja la camara lineal; aca no se mueve un solo
// panel y todo el presupuesto esta en el perfil de velocidad de la camara.
//
// PARA QUE MARCA SIRVE
// Lujo, joyeria, relojeria, museo, coleccion, edicion limitada, producto fisico caro. Todo lo que se
// vende dejandolo ver y no dejandolo tocar. La metafora es literal: la marca tiene piezas, cada pieza
// merece su luz, y ninguna se manosea.
//
// LOS SEIS TIEMPOS (beats sobre 40)
//   0   ESPACIO   la hilera pasando; en la primera vitrina hay una pieza girando y ningun texto.
//   5   MARCA     una vitrina alta; el nombre llega DESDE EL FONDO de la caja, como algo que se monta.
//   12  PROMESA   la vitrina siguiente; el claim entra por la izquierda y cruza hasta salir por la derecha.
//   18  PRUEBA    una vitrina alta y angosta: la pagina SE LEVANTA de su pedestal y gira mientras se lee.
//   25  RAZONES   una vitrina larga de tres estantes: cifras arriba, cifras al medio, frases abajo.
//   33  PEDIDO    la ultima vitrina va COLGADA, se despega de la hilera y viaja con el ojo hasta el final.
//
// SIN MATERIAL: un tiempo que la pagina no puede llenar no reserva su vitrina, y ese tramo se rellena
// con vitrinas de galeria —pieza adentro, luz adentro— como todo el resto. Un tiempo que falta no deja
// un hueco con forma de cartel: deja mas galeria.

import { THREE, vidrio, metal, luz, barra, iluminar, domo, polvo, prismaDe } from '../nucleo.js'
import { vueloDesliz, entra, sale, acompanar, respirar, juntar, anchoADistancia } from '../movimiento.js'
import { bloqueMarca, bloquePromesa, bloquePrueba, bloquesCifra, bloquesFrase, bloquePedido } from '../bloques.js'
import { colorDePeso, grisDePeso } from '../recetas.js'
import { LOOK, nivel, E, b } from '../../demo/kit.js'

export const meta = {
  id: 'vitrina',
  nombre: 'Vitrina',
  familia: 'objeto',
  necesita: ['nada'],
  beats: 40,
  tiempos: { espacio: 0, marca: 5, promesa: 12, prueba: 18, razones: 25, pedido: 33 },
  pitch: 'Una hilera de vitrinas iluminadas por dentro y una cámara que se demora en cada una sin llegar a parar. Para lujo, joyería, museo, colección y producto físico.',
}

// EN QUE BEAT LA CAMARA TIENE CADA VITRINA DELANTE. No es lo mismo que `meta.tiempos`, que dice cuando
// EMPIEZA cada tiempo: una vitrina se coloca donde la camara la va a estar mirando, o sea en el beat
// del medio de su tiempo. Elegir la posicion y el beat por separado es el defecto que `zEn`/`xEn`
// existen para evitar, y aca hay una vuelta de tuerca mas: la camara no avanza pareja, asi que el beat
// no se traduce a posicion con una regla de tres. Se traduce con `camX`, que integra la velocidad real.
const CENTRO = { espacio: 1.0, marca: 7.2, promesa: 13.8, prueba: 20.6, razones: 28.0, pedido: 35.2 }
// El tramo que ocupa la vitrina larga de RAZONES, en beats. Los bloques de ese tiempo se reparten
// dentro y la caja se corta para no tocar a sus dos vecinas.
const RAZ_T0 = 25.2, RAZ_T1 = 31.0

export function build(ctx) {
  const { escena, pagina, camara, tl, mundoW, mundoH, distBase, BEAT } = ctx
  const uso = {}
  const respiraciones = []

  // ---------------------------------------------------------------- LO QUE LA PAGINA DECIDE
  //
  // `ctx.recetas` sale de `backend/retrato.py`, que mide la tira, el DOM y los recortes de ESTA pagina.
  // Sin retrato devuelve los valores neutros y la plantilla compone como componia antes de que el
  // analisis existiera: no hay una rama distinta ni un caso especial. La explicacion larga de cada
  // receta esta en `render3d/boveda/recetas.js`; la de por que existe el mecanismo, en `atrio.js`.
  //
  // Lo que se modula es el GRADO, nunca la idea: `vitrina` siempre es una galeria recorrida de costado.
  // Lo que cambia entre una marca y otra es cuanto camino hace la camara entre pieza y pieza, de que
  // forma son los pedestales, de que color es el vidrio, cuantas vitrinas hay y cuanto texto entra.
  const R = ctx.recetas || { velocidad: 1, capas: 3, dureza: 0.75, margen: 0.88, cifras: 3, frases: 2,
    acentoMasa: false, vacio: 0.5, movimientos: 4, paleta: [], medido: false }
  uso.retrato = !!R.medido

  iluminar(escena, { key: 1.20, relleno: 0.42 })
  const uDomo = domo(escena, { fuerza: 0.18 })
  const motas = polvo(escena, 900, 30)

  // Semilla propia y determinista. `ctx.rnd` la comparten los bloques, y compartirla haria que el
  // dibujo de la galeria cambiara porque la pagina trajo una frase mas. Una galeria que se redibuja
  // cuando cambia el texto es una galeria que no se puede depurar.
  let sem = 51120326
  const az = () => { sem = (sem * 1664525 + 1013904223) >>> 0; return sem / 4294967296 }

  // ---------------------------------------------------------------- el vuelo, y cuanto camino compra
  //
  // R.velocidad ES EL LARGO DE LA GALERIA, pero NO como multiplicador limpio, y la cuenta explica por
  // que. Aca la separacion entre dos vitrinas es literalmente el camino que la camara recorre entre sus
  // dos beats: `largo · Δt / beats`. Multiplicar el largo por 0.7 no hace "una camara mas tranquila",
  // hace vitrinas un 30% mas angostas — y como el ancho del texto se corta contra el ancho de su
  // vitrina, hace la marca un 30% mas chica. La forma afin conserva la discriminacion donde importa
  // (37.0 unidades de recorrido contra 26.9, o sea un 38% mas de camara) sin que el piso se desfonde.
  //
  //   0.70 -> mundoW · 4.78 = 26.9      1.00 -> mundoW · 5.50 = 30.9      1.45 -> mundoW · 6.58 = 37.0
  const LARGO = mundoW * (3.1 + 2.4 * R.velocidad)
  const vuelo = vueloDesliz(camara, tl, { distBase, beats: meta.beats, largo: LARGO, dist: 1.0 })
  const xEn = vuelo.xEn
  const X0 = xEn(0), X1 = xEn(meta.beats)

  // ---------------------------------------------------------------- EL FRENO — el corazon de la pieza
  //
  // La regla 1 dice que la camara no se detiene nunca y que frenar es llegar a una velocidad baja, no a
  // cero. Aca eso no es una advertencia: es la mecanica principal, asi que se construye con una cota y
  // no con calibracion a ojo.
  //
  // Se declara un PERFIL DE VELOCIDAD: 1 en crucero, menos donde hay un nodo de freno. Cada nodo aporta
  // `a / cosh²((beat - t) / w)` — una campana suave que vale `a` en su centro y se apaga a los dos
  // lados sin escalones. La suma se recorta en TOPE_FRENO = 0.78, asi que la velocidad nunca baja del
  // 22% de crucero POR MUCHO QUE SE JUNTEN DOS NODOS. No hay combinacion de recetas que la lleve a cero
  // porque la cota no depende de las recetas. El recorte es continuo en velocidad —lo unico que salta
  // es la aceleracion— y un salto de aceleracion no se ve; uno de velocidad se lee como un tiron.
  //
  // La posicion sale de INTEGRAR ese perfil y normalizarlo, asi que la camara sigue recorriendo
  // exactamente `LARGO` en los 40 beats: lo que el freno hace no es acortar el viaje sino repartirlo
  // distinto. Por eso el crucero termina siendo MAS rapido que el promedio, y el contraste entre volar
  // y demorarse —que es todo el gesto— se hace mas fuerte y no mas debil.
  //
  // Y LA AMPLITUD SUBE CON LA VELOCIDAD MEDIDA, que es la parte contraintuitiva y la que hace que esta
  // plantilla lea el retrato de verdad. Compensando, la velocidad EN LA VITRINA queda casi constante
  // (0.42 / 0.37 / 0.38 unidades por beat para R.velocidad 0.70 / 1.00 / 1.45) mientras la de crucero
  // varia un 65% (1.03 / 1.34 / 1.70). O sea: lo que el retrato cambia es cuanto vuela la camara ENTRE
  // piezas, no cuanto tiempo te da para LEER cada una. Una pagina con mas energia no produce una pieza
  // mas dificil de leer; produce una galeria mas larga recorrida con mas impulso.
  const FUERTE = Math.max(0.30, Math.min(0.78, 0.30 + 0.42 * R.velocidad))
  const TOPE_FRENO = 0.78
  const NODOS = [
    { t: CENTRO.espacio, a: FUERTE * 0.80, w: 2.0 },
    { t: CENTRO.marca, a: FUERTE, w: 2.2 },
    { t: CENTRO.promesa, a: FUERTE, w: 2.2 },
    { t: CENTRO.prueba, a: FUERTE, w: 2.4 },
    // RAZONES FRENA MENOS, y es una decision de ritmo, no una economia. Ese tiempo tiene hasta siete
    // bloques repartidos a lo largo de la vitrina larga: si la camara se demorara como en los otros, los
    // siete caerian practicamente en el mismo punto del mundo y se taparian entre si. Pasar la hilera
    // corta a mas velocidad es lo que los SEPARA, y ademas es el unico tramo de la pieza que acelera,
    // que es lo que hace que el freno final del pedido se sienta como una llegada.
    { t: CENTRO.razones, a: FUERTE * 0.45, w: 1.8 },
    { t: 36.4, a: FUERTE, w: 2.8 },
  ]
  // Ocho muestras por beat: el paso es de 1/8 de beat y el perfil mas angosto tiene w = 1.8 beats, o
  // sea catorce muestras de ancho a media altura. La integral trapezoidal sobre eso no se equivoca en
  // nada que se pueda ver.
  const MUESTRAS = meta.beats * 8
  const acum = new Float64Array(MUESTRAS + 1)
  let vPrev = 0
  for (let i = 0; i <= MUESTRAS; i++) {
    const beat = (i / MUESTRAS) * meta.beats
    let f = 0
    for (const n of NODOS) {
      const ch = Math.cosh((beat - n.t) / n.w)
      f += n.a / (ch * ch)
    }
    const v = 1 - Math.min(TOPE_FRENO, f)
    if (i > 0) acum[i] = acum[i - 1] + (vPrev + v) * 0.5
    vPrev = v
  }
  const TOTAL = acum[MUESTRAS] || 1
  const sEn = (beat) => {
    const u = Math.max(0, Math.min(1, beat / meta.beats)) * MUESTRAS
    const i = Math.min(MUESTRAS - 1, Math.floor(u))
    return (acum[i] + (acum[i + 1] - acum[i]) * (u - i)) / TOTAL
  }
  // DONDE ESTA LA CAMARA EN UN BEAT. Es el `xEn` de esta plantilla y hay que usarlo para TODO: colocar
  // una vitrina con el `xEn` lineal del vuelo la deja hasta dos unidades corrida del sitio donde la
  // camara la va a estar mirando, o sea el defecto de siempre —posicion y tiempo elegidos por
  // separado— con otra cara.
  const camX = (beat) => X0 + (X1 - X0) * sEn(beat)
  // Y LO QUE HAY QUE SUMARLE A LA CAMARA EN CADA SUBMUESTRA para que de verdad vaya por ahi. El vuelo
  // tunea `camara.position.x` linealmente; esto es la diferencia entre el camino con freno y el lineal.
  // SUMA y no asigna porque hay un tween sobre esa clave, que es la mitad de la regla de `alSeek`; y
  // sumar no acumula porque el tween restablece el valor antes de cada llamada. La camara es ademas la
  // unica excepcion declarada de la compuerta, justamente porque todos los vuelos hacen esto.
  const desvio = (beat) => camX(beat) - xEn(beat)

  // ---------------------------------------------------------------- las medidas de una vitrina
  const PROF = 1.70          // fondo de la caja
  const Z_CONT = 0.30        // donde vive lo que se muestra: adentro, apenas detras del vidrio de adelante
  const Y_BASE = -1.40       // el piso de toda vitrina, o sea la tapa de su pedestal
  const ALTO_PED = 2.40
  const JUNTA = 0.14         // la costura entre dos vitrinas vecinas
  const MARGEN = 0.28        // aire entre el bloque y el montante de su vitrina

  // EL CUADRO SE MIDE A LA DISTANCIA DEL CONTENIDO Y CON LA CAMARA EN SU PUNTO MAS CERCANO, que es lo
  // unico honesto: `vueloDesliz` balancea la z de la camara +-0.7, asi que el cuadro se angosta cuando
  // la camara se acerca — y si el texto se corta, se corta ahi. A `distBase - 0.7 - Z_CONT` = 16.44 el
  // cuadro mide 5.30 de ancho y no 5.62; con la reserva por el balanceo de rotacion quedan 4.86.
  const D_CONT = distBase - 0.70 - Z_CONT
  const CUADRO_W = anchoADistancia(mundoW, distBase, D_CONT, 0.22)
  // Y el alto por la misma cuenta, menos el vaiven de 0.42 que el desliz le mete a la camara en y:
  // `mundoH · 16.44 / 17.44` = 9.43, o sea +-4.29 desde el eje. Nada puede pasarse de ahi.
  const TOPE_Y = mundoH * (D_CONT / distBase) * 0.5 - 0.42
  const TOPE_BAHIA = CUADRO_W * 0.86

  // ---------------------------------------------------------------- donde cae cada vitrina, y cuanto mide
  //
  // El ancho NO SE ELIGE: se corta contra el hueco que hay hasta la vecina, y ese hueco lo dio el vuelo.
  // Media vitrina es como mucho 0.40 del hueco mas chico, asi que dos vecinas suman 0.80 de la distancia
  // que las separa y sobra un 20% de costura — no hay combinacion de recetas que las haga chocar, y no
  // hace falta ninguna busqueda como la que `archivo` necesita para sus cajones.
  //
  // El precio esta escrito y es real: en una pagina medida lenta la galeria es mas compacta y el nombre
  // de la marca entra mas chico. Es la consecuencia correcta —una camara que recorre menos ve menos
  // pared— y es preferible a la alternativa, que seria un nombre cortado por los dos lados.
  const CX = {
    espacio: camX(CENTRO.espacio), marca: camX(CENTRO.marca), promesa: camX(CENTRO.promesa),
    prueba: camX(CENTRO.prueba), pedido: camX(CENTRO.pedido),
  }
  const RZ_IZQ = camX(RAZ_T0), RZ_DER = camX(RAZ_T1)
  // La vecina de PRUEBA por la derecha y la de PEDIDO por la izquierda no son un centro sino el BORDE
  // de la vitrina larga: medir contra su centro dejaria a las tres superpuestas.
  const VECINA = {
    espacio: [-1e9, CX.marca],
    marca: [CX.espacio, CX.promesa],
    promesa: [CX.marca, CX.prueba],
    prueba: [CX.promesa, RZ_IZQ],
    pedido: [RZ_DER, 1e9],
  }
  const anchoDe = (n) => {
    const v = VECINA[n]
    return Math.max(1.30, Math.min(TOPE_BAHIA, 0.80 * Math.min(CX[n] - v[0], v[1] - CX[n])))
  }
  const textoDe = (n) => Math.max(0.85, anchoDe(n) - MARGEN * 2)

  // ---------------------------------------------------------------- materiales
  //
  // EL COLOR DEL VIDRIO SALE DE LOS PIXELES, no de `LOOK.acento` a secas: `colorDePeso` devuelve la
  // primera masa CROMATICA de la paleta medida sobre la tira, que es el color que de verdad ocupa
  // superficie en el sitio. Y si ese acento no da para masa —menos del 3% de la tira— el vidrio va
  // neutro y el color se queda en los filetes de las lamparas, que es donde un acento de detalle sabe
  // estar. En una galeria eso es literal: o las cajas son de cristal tintado, o son incoloras y lo
  // unico de color es la luz.
  const COL = colorDePeso(R, LOOK.acento, 0.20)
  const GRIS = grisDePeso(R, nivel(0.24))
  // EL VIDRIO NO LLEVA `transmission`, Y ES UNA DECISION, no un olvido. La transmision de three
  // renderiza lo que hay DETRAS a traves de un buffer aparte y una pasada por cuadro; aca hay entre
  // veinte y treinta cajas y lo que tienen adentro es TEXTO, que es justo lo que no puede salir
  // distorsionado ni desenfocado. Lo que hace falta no es una lente: es una lamina especular. Con
  // `clearcoat` a 1.0 —que `vidrio()` ya pone— y opacidad baja, el panel devuelve los brillos que lo
  // hacen leerse como vidrio y no se come una sola letra.
  const matVidrio = vidrio(R.acentoMasa ? COL : GRIS, { rug: 0.04, trans: 0.0, grosor: 0.4, opacidad: 0.24 })
  matVidrio.side = THREE.DoubleSide
  matVidrio.depthWrite = false
  const matPiedra = metal(GRIS, 0.44)
  const matMontante = metal(grisDePeso(R, nivel(0.30)), 0.26)
  const matFondo = metal(grisDePeso(R, nivel(0.12)), 0.62)
  const matPieza = metal(R.acentoMasa ? COL : grisDePeso(R, nivel(0.40)), 0.22)
  // LA VELADURA DE ADENTRO. Va sobre el fondo mate y no ES el fondo: un panel emisivo de acento a
  // pleno detras de un texto es la trampa de legibilidad mas vieja del motor, y ademas florece con el
  // bloom. Asi la caja se lee iluminada por dentro y el texto sigue teniendo un fondo mate contra el
  // cual recortarse.
  const matVelo = luz(LOOK.acento2 || LOOK.acento, 0.55)
  matVelo.transparent = true
  matVelo.opacity = 0.16
  matVelo.depthWrite = false

  // ---------------------------------------------------------------- armar una vitrina
  //
  // Fondo mate, veladura, cuatro montantes, dos filetes de luz, el vidrio de adelante y el de arriba, y
  // debajo el pedestal. El origen del grupo esta en el eje de la caja al nivel del piso de la galeria,
  // asi que colocarla es escribir una sola x.
  const piezas = []
  const armar = (w, h, op) => {
    op = op || {}
    const g = new THREE.Group()

    if (op.colgada === true) {
      // La ultima va COLGADA y no apoyada, y no es un capricho de estilo: esa vitrina tiene que viajar
      // con el ojo hasta el final (ver PEDIDO), y un pedestal que se desliza por el piso se lee como un
      // error de render. Dos tensores que se van fuera de cuadro lo explican en una malla cada uno.
      for (const s of [-1, 1]) {
        const cable = new THREE.Mesh(new THREE.BoxGeometry(0.03, 9, 0.03), matMontante)
        cable.position.set(s * w * 0.32, Y_BASE + h + 4.5, 0)
        g.add(cable)
      }
    } else {
      // EL PEDESTAL ES LA LECTURA MAS VISIBLE DEL RETRATO. `prismaDe` va de seccion cuadrada a
      // cilindrica segun cuanto redondee la marca sus tarjetas y sus botones: una joyeria que redondea
      // todo apoya sus piezas sobre columnas cilindricas y un estudio de aristas vivas sobre bloques.
      //
      // Se estira POR EL GRUPO y no por el mesh. `prismaDe` gira 45 grados el caso de cuatro lados para
      // que no quede un rombo apoyado en un vertice; escalar la x del mesh se aplica ANTES de esa
      // rotacion, o sea que estiraria el cuadrado por su diagonal y devolveria justamente el rombo que
      // esa rotacion existe para evitar. Escalando el grupo, el estirado se aplica despues.
      const gp = new THREE.Group()
      gp.add(prismaDe(PROF * 0.86, ALTO_PED, R.dureza, matPiedra))
      gp.scale.x = Math.max(0.25, (w * 0.84) / (PROF * 0.86))
      gp.position.y = Y_BASE - ALTO_PED / 2
      g.add(gp)
    }

    const tapa = new THREE.Mesh(new THREE.BoxGeometry(w, 0.10, PROF), matPiedra)
    tapa.position.y = Y_BASE - 0.05
    g.add(tapa)

    const fondo = new THREE.Mesh(new THREE.PlaneGeometry(w, h), matFondo)
    fondo.position.set(0, Y_BASE + h / 2, -PROF / 2)
    g.add(fondo)
    const velo = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.94, h * 0.92), matVelo)
    velo.position.set(0, Y_BASE + h / 2, -PROF / 2 + 0.03)
    g.add(velo)

    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.05, h, 0.05), matMontante)
        m.position.set(sx * w / 2, Y_BASE + h / 2, sz * PROF / 2)
        g.add(m)
      }
    }

    // Los dos vidrios. `renderOrder` 3 los manda a pintarse despues de lo que tienen adentro: son
    // transparentes y sin escritura de profundidad, asi que lo unico que decide es el orden.
    const frente = new THREE.Mesh(new THREE.PlaneGeometry(w, h), matVidrio)
    frente.position.set(0, Y_BASE + h / 2, PROF / 2)
    frente.renderOrder = 3
    g.add(frente)
    const techo = new THREE.Mesh(new THREE.PlaneGeometry(w, PROF), matVidrio)
    techo.rotation.x = -Math.PI / 2
    techo.position.set(0, Y_BASE + h, 0)
    techo.renderOrder = 3
    g.add(techo)

    // LA LAMPARA VA EN EL ACENTO Y NO EN `nivel(k)`, y esta escrito en `archivo` con la medicion al
    // lado: `nivel(0.05)` es casi blanco en un aire claro y casi negro en uno oscuro, o sea que una
    // lampara escrita asi se apagaria sola en la mitad de los once aires. El acento es lo unico de la
    // paleta con contraste garantizado contra los dos fondos.
    const lamp = barra(w * 0.90, 0.05, LOOK.acento, 1.6)
    lamp.position.set(0, Y_BASE + h - 0.10, PROF / 2 - 0.16)
    g.add(lamp)
    const zocalo = barra(w * 0.90, 0.035, LOOK.acento2 || LOOK.acento, 1.3)
    zocalo.position.set(0, Y_BASE + 0.06, PROF / 2 - 0.16)
    g.add(zocalo)
    // Las de galeria estan encendidas desde el cuadro uno —el contenido SIEMPRE esta a la vista, que es
    // la idea entera— y las que van a hablar suben su luz cuando la camara llega. Eso no contradice la
    // regla 2: no aparece un objeto, sube una luz, y ademas ocurre mientras la caja todavia esta
    // entrando por el borde del cuadro.
    if (op.abre === true) { lamp.scale.x = 0.0001; zocalo.scale.x = 0.0001 }

    return { g, lamp, zocalo, w, h }
  }

  const encender = (v, t0) => {
    tl.to(v.lamp.scale, { x: 1, duration: b(1.1), ease: 'power3.out' }, b(t0))
    tl.to(v.zocalo.scale, { x: 1, duration: b(1.3), ease: 'power2.out' }, b(t0 + 0.2))
  }

  // Una pieza de la coleccion: lo que hay adentro de una vitrina que no tiene texto. Gira sobre su eje
  // en `alSeek` (ver abajo por que ASIGNANDO y no sumando).
  const conPieza = (v, esc) => {
    const p = prismaDe(Math.min(v.w * 0.34, 0.62) * esc, Math.min(v.h * 0.42, 0.9) * esc, R.dureza, matPieza)
    p.position.set(0, Y_BASE + v.h * 0.42, 0)
    p.userData.giro0 = az() * 6.28
    p.userData.vel = 0.10 + az() * 0.22
    v.g.add(p)
    piezas.push(p)
    return p
  }

  const hilera = new THREE.Group()
  escena.add(hilera)
  const ocupado = []                                  // [x0, x1] de todo lo que ya esta puesto
  const poner = (v, cx) => { v.g.position.x = cx; hilera.add(v.g); ocupado.push([cx - v.w / 2, cx + v.w / 2]); return v }

  // ---------------------------------------------------------------- los bloques, cortados a su vitrina
  //
  // Se pide PRIMERO y se corta la caja despues, que es la misma disciplina de `archivo`: `bloques.js`
  // MIDE lo que compuso, asi que preguntarle antes es lo que garantiza que ningun texto se salga de la
  // vitrina que lo sostiene con cualquier pagina, y no con la que tenia a mano el dia que escribi esto.
  const marca = bloqueMarca({ alto: 1.15, anchoMax: textoDe('marca'), cama: true, camaOpacidad: 0.82, margen: R.margen })
  const promesa = bloquePromesa({ alto: 0.52, anchoMax: textoDe('promesa'), maxLineas: 3, margen: R.margen })
  const prueba = bloquePrueba(ctx, { ancho: Math.min(mundoW * 0.42, textoDe('prueba')), ar: 1.5 })
  const cifras = bloquesCifra(R.cifras, { alto: 0.78, anchoMax: Math.min(2.4, CUADRO_W * 0.44), margen: R.margen })
  const frases = bloquesFrase(R.frases, { alto: 0.27, anchoMax: Math.min(2.1, CUADRO_W * 0.42), maxLineas: 2, margen: R.margen })
  const pedido = bloquePedido({ alto: 0.32, anchoMax: textoDe('pedido') * 0.90, margen: R.margen })

  // ---------------------------------------------------------------- 1 · ESPACIO
  //
  // La primera vitrina no tiene texto y ese es todo su trabajo: enseña el idioma —una caja, un
  // pedestal, una luz, una pieza girando— antes de que llegue una sola palabra. El espectador tiene que
  // entender donde esta parado antes de que le hablen.
  const vEspacio = poner(armar(anchoDe('espacio'), 2.60, {}), CX.espacio)
  conPieza(vEspacio, 1.25)

  // ---------------------------------------------------------------- 2 · MARCA
  //
  // El nombre llega DESDE EL FONDO de la caja, o sea desde atras del vidrio hacia adelante: es el gesto
  // de una pieza que se monta en su sitio, y es el unico de la pieza que usa esa direccion. Y sale hacia
  // arriba antes de que la camara termine de pasar la vitrina — en un desliz, lo que se queda se ve
  // irse por el borde, que es lo contrario de lo que uno quiere del nombre de la marca.
  //
  // LLEVA CAMA aunque el fondo de la caja sea mate, y por medicion ajena: `nivelTexto` garantiza
  // contraste contra la PALETA, no contra lo que esta plantilla resulto poner detras — y detras hay una
  // veladura de acento y dos filetes encendidos.
  if (marca) {
    const v = poner(armar(anchoDe('marca'), Math.max(2.30, marca.alto * 1.9), { abre: true }), CX.marca)
    marca.g.position.set(0, Y_BASE + v.h / 2 + marca.alto * 0.16, Z_CONT)
    v.g.add(marca.g)
    encender(v, 4.2)
    entra(marca.g, tl, 5.2, { desde: 'fondo', dist: 4.5, dur: 1.7 })
    marca.escribir(tl, 5.7, 1.2)
    marca.borrar(tl, 9.5)
    sale(marca.g, tl, 9.7, { hacia: 'arriba', dist: 5.5, dur: 1.0 })
    uso.marca = true
  }

  // ---------------------------------------------------------------- 3 · PROMESA
  //
  // Cruza la vitrina de lado a lado: entra por la izquierda y sale por la derecha. Es el unico bloque
  // que entra y sale por lados OPUESTOS, y por la misma razon que en las otras plantillas — el claim es
  // lo que hay que leer entero, y un texto que atraviesa se lee mas tiempo que uno que vuelve.
  if (promesa) {
    const v = poner(armar(anchoDe('promesa'), Math.max(2.40, promesa.alto * 1.7), { abre: true }), CX.promesa)
    promesa.g.position.set(0, Y_BASE + v.h / 2, Z_CONT)
    v.g.add(promesa.g)
    encender(v, 11.0)
    entra(promesa.g, tl, 12.0, { desde: 'izq', dist: 5.5, dur: 1.7 })
    promesa.escribir(tl, 12.6, 1.0)
    promesa.borrar(tl, 15.9)
    sale(promesa.g, tl, 16.1, { hacia: 'der', dist: 6.5, dur: 1.1 })
    uso.claim = true
    uso.claimRecortado = promesa.recortado
  }

  // ---------------------------------------------------------------- 4 · PRUEBA
  //
  // La pagina SE LEVANTA de su pedestal, como una pieza que se alza para mirarla, y gira mientras se
  // recorre. EL GIRO ES LO QUE LA VUELVE OBJETO: un plano de frente con una captura encima es una
  // textura pegada; el mismo plano girando dentro de una caja de vidrio es una pieza expuesta.
  //
  // Y NO VA COLGADA DE LA VITRINA sino puesta en el mundo, porque vive en `ctx.pagina`, que es OTRA
  // ESCENA y se dibuja en un pase posterior. De ahi salen dos consecuencias que se componen a favor en
  // vez de pelearse: la pagina se dibuja SIEMPRE encima, asi que el vidrio de adelante no la vela —que
  // es lo que uno quiere de un vidrio que protege una pantalla— y a cambio taparia cualquier montante
  // que le quedara por delante, por lo que la caja se corta mas ancha que ella y los montantes quedan a
  // los costados, donde no hay nada que tapar.
  if (prueba) {
    const alto = Math.min(prueba.alto + 0.66, (TOPE_Y - Y_BASE) * 0.98)
    const v = poner(armar(Math.max(anchoDe('prueba'), prueba.ancho + MARGEN * 2), alto, { abre: true }), CX.prueba)
    const yPag = Y_BASE + alto / 2
    prueba.g.position.set(CX.prueba, yPag, Z_CONT + 0.06)
    prueba.g.rotation.y = 0.34
    pagina.add(prueba.g)
    encender(v, 17.0)
    // SUBE DESDE ABAJO DEL PISO DE LA CAJA Y VUELVE AHI. El salto se calcula, no se calibra: desde
    // donde esta parada hasta pasar el borde de abajo de su propia vitrina, mas su medio alto y un
    // margen. Encender o apagar una pagina en su sitio es el cartel que prohibe la regla 2, y encima en
    // la unica capa que se dibuja por encima de todo, asi que no habria nada que la tapara mientras lo
    // hace.
    const SALTO = (yPag - Y_BASE) + prueba.alto * 0.5 + 0.5
    entra(prueba.g, tl, 18.0, { desde: 'abajo', dist: SALTO, dur: 2.0 })
    prueba.escribir(tl, 18.3, 1.2)
    prueba.recorrer(tl, 19.0, 5.4, 0.94)
    tl.to(prueba.g.rotation, { y: -0.26, duration: b(5.6), ease: 'none' }, b(18.8))
    sale(prueba.g, tl, 23.6, { hacia: 'abajo', dist: SALTO, dur: 1.2 })
    respiraciones.push(respirar(prueba.g, { amp: 0.07, giro: 0.018, fase: 0.9 }))
    uso.pagina = prueba.fuente
  }

  // ---------------------------------------------------------------- 5 · RAZONES
  //
  // UNA SOLA VITRINA LARGA DE TRES ESTANTES, y no una vitrina por dato. La cuenta lo obliga y ademas
  // sale mejor: en el tramo de razones la camara recorre poco mas de media unidad por beat, asi que
  // siete cajas separadas por beat y medio quedarian a medio metro una de otra, superpuestas. Repartidos
  // en ALTURA no compiten: dos niveles de cifras y uno de frases, y dos bloques del mismo nivel estan a
  // tres beats largos, o sea que el primero ya salio cuando el segundo entra.
  const raz = []
  cifras.forEach((c, i) => ({ t: 25.6 + i * 1.6, c }))
  const AGENDA = []
  cifras.forEach((c, i) => AGENDA.push({ bloque: c, t: 25.6 + i * 1.6, nivel: i % 2 === 0 ? 2.05 : 0.75, cifra: true }))
  frases.forEach((f, i) => AGENDA.push({ bloque: f, t: 26.4 + i * 2.1, nivel: -0.60, cifra: false }))

  if (AGENDA.length) {
    // La caja se corta contra sus dos vecinas: nunca invade la vitrina de PRUEBA ni la del PEDIDO.
    const izq = Math.max(RZ_IZQ - 0.55, CX.prueba + anchoDe('prueba') / 2 + JUNTA)
    const der = Math.min(RZ_DER + 0.55, CX.pedido - anchoDe('pedido') / 2 - JUNTA)
    const w = Math.max(1.8, der - izq)
    const cx = (izq + der) / 2
    const v = poner(armar(w, 4.20, { abre: true }), cx)
    encender(v, 24.4)
    // Los dos estantes, que ademas son lo que hace que la caja se lea larga y no vacia.
    for (const y of [1.40, 0.20]) {
      const e = new THREE.Mesh(new THREE.BoxGeometry(w * 0.98, 0.05, PROF * 0.86), matMontante)
      e.position.set(0, y, 0)
      v.g.add(e)
    }
    for (const it of AGENDA) {
      const g = it.bloque.g
      // Se coloca en coordenadas de la caja: la caja esta en `cx` y el bloque tiene que caer donde la
      // camara va a estar en SU beat, o sea `camX(t) - cx`.
      const dx = camX(it.t + 1.0) - cx
      // El centro de dibujo de una cifra NO es el centro de su caja —cuelga etiqueta y filete— asi que
      // sin este sesgo queda pegada a su estante. Los niveles tienen aire de sobra para que el alto real
      // del bloque, que sale de la pagina, no lo desborde.
      g.position.set(dx, it.nivel + (it.cifra ? it.bloque.alto * 0.22 : 0), Z_CONT)
      v.g.add(g)
      const s = it.cifra ? (it.nivel > 1 ? 1 : -1) : -1
      entra(g, tl, it.t, { desde: it.cifra ? (s > 0 ? 'der' : 'izq') : 'abajo', dist: 4.6, dur: 1.2 })
      it.bloque.escribir(tl, it.t + 0.35, it.cifra ? 0.75 : 0.8)
      if (!it.cifra) it.bloque.borrar(tl, it.t + 2.3)
      sale(g, tl, it.t + 2.5, { hacia: it.cifra ? (s > 0 ? 'izq' : 'der') : 'abajo', dist: 5.2, dur: 1.0 })
      raz.push(g)
    }
  }
  uso.cifras = cifras.length
  uso.frases = frases.length

  // ---------------------------------------------------------------- 6 · PEDIDO
  //
  // LA ULTIMA VITRINA SE DESPEGA DE LA HILERA Y VIAJA CON EL OJO. Es la pieza que se saca de la fila y
  // se te acerca al mostrador, y ademas resuelve una cuenta que no tiene otra salida: un objeto quieto
  // en un desliz dura `cuadro / velocidad` beats, y aun con el freno mas fuerte eso da poco menos de
  // cinco — el CTA necesita siete y tiene que quedar hasta el ultimo cuadro. La camara NO frena para
  // conseguirlo, que romperia la regla 1: sigue corriendo, y lo que se queda quieto respecto del ojo es
  // la vitrina. Es el mismo recurso que `archivo` documenta para su ultimo cajon y por la misma fisica.
  //
  // `retraso` 0.94 y no 1.0 a proposito: queda un 6% de deriva, o sea que se percibe que la galeria la
  // esta pasando. Clavada al cuadro se leeria como una imagen pegada encima del video.
  let latido = null
  if (pedido) {
    const v = poner(armar(anchoDe('pedido'), Math.max(2.40, pedido.alto * 1.5), { abre: true, colgada: true }), CX.pedido)
    pedido.g.position.set(0, Y_BASE + v.h / 2 + pedido.alto * 0.12, Z_CONT)
    v.g.add(pedido.g)
    encender(v, 32.6)
    entra(pedido.g, tl, 33.4, { desde: 'fondo', dist: 4.5, dur: 1.8 })
    pedido.escribir(tl, 34.2, 0.9)
    acompanar(v.g, tl, 35.0, meta.beats, camX, 0.94)
    latido = pedido.latir(0.032)
    uso.cta = pedido.tieneCta
    // El unico sitio de la pieza donde la luz sube. El ojo lo lee como que algo se resolvio, y cuesta un
    // tween.
    tl.to(ctx.bloom, { strength: (ctx.bloom.strength || 0.5) * 1.6, duration: b(2.2), ease: E.frena(2) }, b(33.0))
  }

  // ---------------------------------------------------------------- el resto de la galeria
  //
  // Las vitrinas que no hablan. Se rellenan las costuras que quedaron entre las que si, mas un tramo
  // sobrante a cada punta para que la hilera nunca se termine dentro del cuadro. CUANTAS Y DE QUE ANCHO
  // LO DECIDE EL AIRE DE LA PAGINA: un sitio que compone con mucho blanco recibe vitrinas anchas y
  // pocas —una pieza por caja, mucho espacio alrededor— y uno denso recibe muchas y angostas. Es la
  // traduccion literal de `vacio` a una galeria.
  const ANCHO_GEN = 1.20 + 1.60 * (R.vacio != null ? R.vacio : 0.5)
  ocupado.sort((a, c) => a[0] - c[0])
  const rellenar = (a, c) => {
    const largo = c - a
    if (largo < 1.0) return
    const n = Math.max(1, Math.round(largo / (ANCHO_GEN + JUNTA)))
    const paso = largo / n
    if (paso - JUNTA < 0.55) return
    for (let i = 0; i < n; i++) {
      const h = 1.70 + az() * (R.vacio > 0.55 ? 1.45 : 0.85)
      const v = poner(armar(paso - JUNTA, h, {}), a + (i + 0.5) * paso)
      if (az() < 0.82) conPieza(v, 0.75 + az() * 0.5)
    }
  }
  const BORDE_A = camX(0) - mundoW * 1.7, BORDE_B = camX(meta.beats) + mundoW * 1.7
  const tramos = [[BORDE_A, ocupado.length ? ocupado[0][0] - JUNTA : BORDE_B]]
  for (let i = 0; i < ocupado.length - 1; i++) tramos.push([ocupado[i][1] + JUNTA, ocupado[i + 1][0] - JUNTA])
  if (ocupado.length) tramos.push([ocupado[ocupado.length - 1][1] + JUNTA, BORDE_B])
  for (const t of tramos) rellenar(t[0], t[1])
  uso.vitrinas = hilera.children.length

  // ---------------------------------------------------------------- el piso
  //
  // UN PISO OSCURO SIN LUZ ENCIMA ES NEGRO PURO Y SE COME MEDIO CUADRO. Toma el gris de mas peso de la
  // pagina —es la superficie mas grande de la pieza y la que mas dice de que marca se trata— y lleva
  // una banda de acento corriendo al pie de la hilera, que es ademas lo que ata la fila al suelo: sin
  // ella las vitrinas flotan sobre una nada del color del domo.
  const largoPiso = (BORDE_B - BORDE_A) + mundoW * 4
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(largoPiso, 220), metal(grisDePeso(R, nivel(0.14)), 0.30))
  piso.rotation.x = -Math.PI / 2
  piso.position.set((BORDE_A + BORDE_B) / 2, Y_BASE - ALTO_PED, -60)
  escena.add(piso)
  const cinta = barra(largoPiso, 0.40, LOOK.acento, 0.9)
  cinta.material.transparent = true
  cinta.material.opacity = 0.22
  cinta.material.depthWrite = false
  cinta.rotation.x = -Math.PI / 2
  cinta.position.set((BORDE_A + BORDE_B) / 2, Y_BASE - ALTO_PED + 0.02, PROF * 1.5)
  escena.add(cinta)

  // ---------------------------------------------------------------- las otras capas
  //
  // La regla 3 en el eje que corresponde. `paralaje()` mueve en z y aca el eje es x, asi que las capas
  // se mueven en `alSeek` — no es una excepcion a la regla sino la misma regla en el otro eje.
  const capas = 1
  // LA CAPA LEJANA: la pared del fondo de la galeria, con sus nichos encendidos. Esta a 8.5 detras de
  // la hilera, o sea que ya parala­jea sola por profundidad (se mueve un 33% mas lento en pantalla); la
  // deriva de `alSeek` exagera eso hasta que se percibe sin mirarlo.
  const fondoSala = new THREE.Group()
  escena.add(fondoSala)
  {
    const paso = 3.1
    const n = Math.ceil((BORDE_B - BORDE_A + 24) / paso)
    for (let i = 0; i < n; i++) {
      const x = BORDE_A - 12 + i * paso
      const h = 3.4 + az() * 2.6
      const m = new THREE.Mesh(new THREE.BoxGeometry(1.5 + az() * 0.7, h, 0.5), matFondo)
      m.position.set(x, Y_BASE + h / 2 - 0.6, -8.5)
      fondoSala.add(m)
      const ranura = barra(0.07, h * 0.72, LOOK.acento2 || LOOK.acento, 0.9)
      ranura.material.transparent = true
      ranura.material.opacity = 0.5
      ranura.position.set(x + 0.55, Y_BASE + h / 2 - 0.6, -8.2)
      fondoSala.add(ranura)
    }
  }

  // LA CAPA CERCANA: el riel de lamparas del techo. Van a `distBase · 0.40` del origen, o sea a 10.5 del
  // lente contra los 17.1 de las vitrinas: cruzan el cuadro 1.67 veces mas rapido, y eso es paralaje de
  // verdad y no una deriva inventada — son objetos quietos en el mundo, mas cerca.
  //
  // Y VAN ARRIBA A PROPOSITO. A esa profundidad el medio alto del cuadro es 3.0, asi que una lampara a
  // y = 2.6 sale al 87% de la altura del cuadro mientras el texto de las vitrinas cae al 41%: pasan por
  // encima de todo lo que hay que leer. Una lampara cruzando delante del claim es ruido en el unico
  // momento en que hay que LEER.
  const riel = new THREE.Group()
  escena.add(riel)
  let capasVivas = 2
  if (R.capas >= 3) {
    capasVivas = 3
    const paso = 3.9
    const n = Math.ceil((BORDE_B - BORDE_A + 8) / paso)
    for (let i = 0; i < n; i++) {
      const x = BORDE_A - 4 + i * paso
      const y = 2.40 + az() * 0.45
      const z = distBase * 0.40
      const cana = new THREE.Mesh(new THREE.BoxGeometry(0.035, 2.2, 0.035), matMontante)
      cana.position.set(x, y + 1.1, z)
      riel.add(cana)
      const pantalla = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.34), matPiedra)
      pantalla.position.set(x, y, z)
      riel.add(pantalla)
      const foco = barra(0.26, 0.05, LOOK.acento, 1.8)
      foco.position.set(x, y - 0.10, z + 0.18)
      riel.add(foco)
    }
  }

  // Y LA CUARTA, solo en las paginas mas densas que el motor midio: una segunda galeria mucho mas
  // atras, sin detalle. No se lee como objetos sino como que la sala sigue mas alla.
  const trama = new THREE.Group()
  escena.add(trama)
  if (R.capas >= 4) {
    capasVivas = 4
    for (let i = 0; i < 26; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(1.1 + az() * 1.4, 1.0 + az() * 1.6, 0.4), matFondo)
      m.position.set(BORDE_A - 10 + az() * (BORDE_B - BORDE_A + 20), Y_BASE - 0.4 + az() * 2.2, -24)
      trama.add(m)
    }
  }
  uso.capas = capasVivas + capas

  // ---------------------------------------------------------------- lo continuo
  //
  // Todo lo de aca se evalua en CADA submuestra del obturador. Escrito como tween se muestrearia una vez
  // por cuadro y saldria a saltos justo donde el obturador deberia barrerlo — y en esta plantilla eso se
  // llevaria puesto el freno, que es su idea entera.
  //
  // LA REGLA DE `alSeek`, aplicada eje por eje y de las dos maneras porque los dos casos estan aca:
  //   · `camara.position.x` LO ANIMA UN TWEEN (el vuelo), asi que el freno SUMA. Sumar no acumula
  //     porque `tl.time()` corre antes y restablece el valor en cada submuestra.
  //   · las piezas, el fondo, el riel y las motas NO LOS ANIMA NADIE, asi que se ASIGNA sobre una base
  //     guardada. Sumar ahi acumularia en cada submuestra y el motor dejaria de ser determinista: la
  //     velocidad de giro pasaria a depender de cuantas veces se llamo a `alSeek`.
  const alSeek = juntar(vuelo.alSeek, latido, (t) => {
    const beat = t / BEAT
    camara.position.x += desvio(beat)
    uDomo.uT.value = t
    for (const p of piezas) p.rotation.y = p.userData.giro0 + t * p.userData.vel
    fondoSala.position.x = t * 0.34
    trama.position.x = t * 0.62
    motas.position.x = camara.position.x
    motas.rotation.z = t * 0.012
  }, ...respiraciones)

  return { dur: b(meta.beats), alSeek, uso }
}
