// HERO "cubo" — un cubo que gira y lleva UN RECORTE DE LA PAGINA EN CADA CARA.
//
// POR QUE EXISTE, Y POR QUE ES DISTINTO DE LOS OTROS OCHO
// El catalogo de heroes tenia dos familias: los que muestran la pagina en un DISPOSITIVO (telefono,
// portatil, ventana) y los que la muestran en un PLANO (mosaico, vitrina, cinta). Los seis componen la
// pagina de frente. Este la reparte en las seis caras de un solido y la hace girar, asi que en un
// mismo instante se ven tres caras en tres orientaciones distintas — y eso es literalmente imposible
// de fingir en 2D: no es una perspectiva dibujada, es que hay un cuerpo.
//
// LE DA USO A UN MATERIAL QUE SOBRABA. Una landing entrega entre cuatro y ocho recortes utiles y las
// escenas que los consumen los muestran de a uno. Seis a la vez, cada uno en su cara, es la unica
// composicion del motor donde tener MAS material se nota — y la que mejor responde a "la pagina
// entera, de un vistazo" sin aplastarla en un mosaico plano.
//
// CADA CARA CONTIENE, NUNCA CUBRE. La leccion de `titular`: una captura con texto no puede sangrar,
// porque sangrar le come las palabras. El recorte entra ENTERO en su cara, centrado, sobre la placa
// oscura; lo que sobra es margen, no recorte. Una cara con margen se lee como una lamina montada; una
// cara con el texto cortado se lee como un error.
//
// SIN RECORTES NO HAY CUBO. Un cubo de seis caras vacias es una caja, y una caja no dice nada de la
// marca. Se declara vacio y el guionista elige otro — que es lo que hacen `mosaico` y `vitrina`.
//
// CONTRATO — ver heroes/telefono.js.

import { LOOK, b, E, hex, matAcento, nivel, recortesDe, texturaDe, dolly, orbita, deslizFijo, topeNitido } from '../kit.js'

// Los seis roles en orden de preferencia. Se piden por rol y no por posicion en el documento para que
// la cara que mire al frente al arrancar sea la mas reconocible que la pagina dio.
const ROLES = ['logo', 'tarjeta', 'foto', 'hero']

// CUATRO IMAGENES DISTINTAS O ESTE HERO NO SE OFRECE.
//
// `necesita: ['elementos']` es un booleano: con UN recorte el cubo se ofrecia igual y repartia esa
// imagen sobre las seis caras. Con el material real de basecamp —5 elementos, de los cuales solo DOS
// caen en ROLES— las seis caras mostraban las mismas dos imagenes, tres veces cada una, y el tumbo se
// DETIENE en cada peldano a proposito para que se lean. O sea que la escena para seis veces a mostrar
// dos cosas. Es el reclamo textual de kit.js:2043-2049.
//
// El numero sale de las seis caras, no de un gusto: con N imagenes distintas cada una aparece ceil(6/N)
// veces, y con N = 4 quedan cuatro caras nuevas y dos repetidas — dos tercios del cubo dice algo que el
// espectador no vio. Con N = 3 cada imagen tiene su gemela y la mitad del cuerpo es eco.
//
// Y cuesta cero en material real: de las seis capturas del repo, tres dan CERO elementos (ahi el cubo
// ya no se ofrecia) y las otras dan 5, 8 y 9 en rol. El unico caso que pierde el cubo es justamente
// aquel en el que se veia mal, y `elegibles` le da el hero siguiente — que con poco material es
// `mosaico`, la lectura mas clara, como ya razona el comentario del registro.
const CARAS_MINIMAS = 4

export const meta = {
  id: 'cubo',
  nombre: 'Cubo de recortes',
  necesita: ['elementos'],
  beats: 8,
  // CUENTA LOS QUE SE PUEDEN MOSTRAR, NO LOS QUE TIENEN EL ROL — y esto es un arreglo del arreglo.
  //
  // La primera version contaba por `e.rol` y con eso NO protegia de nada en el caso que importa: el
  // veto de laminas (`texturaDe`, que saca los recortes que son texto disfrazado de imagen cuando la
  // pagina publico testimonios) trabaja sobre PIXELES y saca recortes DESPUES de que este cupo dijo
  // que si. Medido con linear.app recapturado —7 elementos, 3 testimonios, veto encendido— el cubo
  // contaba 4 por rol y solo 2 sobrevivian: se ofrecia igual y mostraba dos imagenes repetidas tres
  // veces cada una, que es exactamente el defecto que este cupo vino a cerrar.
  //
  // `texturas` puede no venir: los barridos que no cargan imagenes (compuertas que auditan geometria)
  // lo llaman sin ellas. Ahi se cuenta por rol, que es lo que se puede saber, y queda dicho.
  puede: (datosEls, texturas) => new Set((datosEls || [])
    .filter(e => e && ROLES.includes(e.rol) && e.url)
    .filter(e => (texturas ? !!texturaDe(texturas, e) : true))
    .map(e => e.url)).size >= CARAS_MINIMAS,
}

// Cuanto mide el cubo. 3.1 unidades sobre un cuadro de 5.625 de ancho deja el solido girando sin que
// una esquina se salga: la diagonal de la cara es 3.1*1.414 = 4.38, y con la camara en reposo el cuadro
// da 5.625. El margen sobra a proposito — la camara se acerca 0.9 durante la escena.
const LADO = 3.1

export function build(ctx) {
  const { THREE, gsap, mundoW, mundoH, camera, distBase, rnd, texturas, datosEls } = ctx
  const g = new THREE.Group()
  const gr = new THREE.Group()          // las caras van post-bloom: traen los colores reales de la marca
  const tl = gsap.timeline({ paused: true })
  const DUR = b(meta.beats)

  // ---------------------------------------------------------------- el material que hay
  const texs = []
  for (const e of recortesDe(datosEls || [], ROLES, 6)) {
    const t = texturaDe(texturas, e)
    if (t) texs.push(t)
  }
  if (!texs.length) {
    tl.to({}, { duration: DUR }, 0)
    return { g, gr, tl, vacia: true }
  }

  // ---------------------------------------------------------------- el cuerpo
  // DOS GRUPOS. `gCubo` hace la llegada y la salida; `gGiro`, hijo suyo, el tumbo continuo. Es la misma
  // separacion que documenta `telefono` y por la misma razon: una propiedad, un solo escritor.
  const gCubo = new THREE.Group()
  g.add(gCubo)
  const gGiro = new THREE.Group()
  gCubo.add(gGiro)

  // El nucleo opaco. Va en `g` —o sea recibe bloom— y es lo que hace que el solido tenga MASA: sin el,
  // seis laminas flotando en angulo recto se leen como un origami, no como un cuerpo.
  const nucleo = new THREE.Mesh(
    new THREE.BoxGeometry(LADO * 0.995, LADO * 0.995, LADO * 0.995),
    new THREE.MeshPhysicalMaterial({
      color: hex('#0d1020'), roughness: 0.38, metalness: 0.75, clearcoat: 0.5, clearcoatRoughness: 0.3,
    }))
  gGiro.add(nucleo)

  // Las aristas encendidas. Son geometria real de 1 px y el bloom las convierte en el dibujo del
  // solido: es lo que separa "un cubo gris" de "un objeto de esta marca".
  gGiro.add(new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(LADO, LADO, LADO)),
    new THREE.LineBasicMaterial({ color: hex(LOOK.acento).multiplyScalar(1.6), toneMapped: false, transparent: true, opacity: 0.92 })))

  // ---------------------------------------------------------------- las seis caras
  // Las seis orientaciones, en el orden en que el giro las va a presentar: frente, derecha, atras,
  // izquierda, arriba, abajo. Cada entrada es la posicion del centro de la cara y su rotacion.
  const CARAS = [
    { p: [0, 0, 1], r: [0, 0, 0] },
    { p: [1, 0, 0], r: [0, Math.PI / 2, 0] },
    { p: [0, 0, -1], r: [0, Math.PI, 0] },
    { p: [-1, 0, 0], r: [0, -Math.PI / 2, 0] },
    { p: [0, 1, 0], r: [-Math.PI / 2, 0, 0] },
    { p: [0, -1, 0], r: [Math.PI / 2, 0, 0] },
  ]

  // El grupo de caras vive en `gr` y NO puede ser hijo de `gGiro`, que esta en la otra escena: se le
  // copia la transformacion mundial en cada cuadro, igual que la pantalla del telefono.
  const gCaras = new THREE.Group()
  gr.add(gCaras)

  const UTIL = LADO * 0.86                 // el margen de la lamina: 7% por lado
  const laminas = []
  CARAS.forEach((cara, i) => {
    const tex = texs[i % texs.length]
    const ar = (tex.image.width || 1) / (tex.image.height || 1)
    // CONTIENE: se elige el lado que limita primero y el otro queda con margen. Nunca se estira y nunca
    // se recorta — las dos cosas cuestan contenido en una captura de pagina.
    // Y CONTIENE TAMBIEN LA RESOLUCION, que faltaba. UTIL = LADO*0.86 = 2.666 unidades = 512 px de
    // cuadro, y el recorte se estiraba hasta llenarlo sin mirar cuantos pixeles trae: el logo de stripe
    // (120 px) salia a 512, o sea 4.3 veces su resolucion, y el de linear 2.9. Y es la peor cara para
    // que pase: el tumbo se DETIENE en cada peldano a proposito (lineas 168-189), asi que el remuestreo
    // se ve justo en el instante en que la escena pide que se lea.
    //
    // Mismo tope que ya usan columna, vitrina y mosaico. Una lamina de poca resolucion ocupa menos cara
    // y deja mas margen, que es preferible a llenarla con una version deshecha de si misma.
    // EL ANCHO DEL CUADRO SALE DEL CONTEXTO, no de un 1080 escrito a mano. Hoy da el mismo numero
    // —el motor rinde a 1080— pero es la misma constante en dos lugares, que es el patron que ya costo
    // cinco arreglos en este repo: el 0.915 de `toro`, la correccion de ancho de `mesa`, el MAG_MAX
    // propio de `rafaga`, el OBJ de `apertura` y el sangrado de `pantalla`. `columna` ya lo hacia asi.
    const NITIDO = topeNitido(tex.image, ctx.W || 1080, mundoW, 1.4)
    const util = Math.min(UTIL, ar >= 1 ? NITIDO : NITIDO / ar)
    const w = ar >= 1 ? util : util * ar
    const h = ar >= 1 ? util / ar : util

    const grupoCara = new THREE.Group()
    grupoCara.position.set(cara.p[0] * LADO / 2, cara.p[1] * LADO / 2, cara.p[2] * LADO / 2)
    grupoCara.rotation.set(cara.r[0], cara.r[1], cara.r[2])
    gCaras.add(grupoCara)

    // La placa de fondo de la cara, del tamaño completo: es lo que le da borde a la lamina y lo que
    // hace que una foto vertical no quede flotando sobre el metal del nucleo.
    const placa = new THREE.Mesh(
      new THREE.PlaneGeometry(LADO * 0.94, LADO * 0.94),
      new THREE.MeshBasicMaterial({ color: nivel(0.08), toneMapped: false, transparent: true, opacity: 0 }))
    placa.position.z = 0.004
    grupoCara.add(placa)

    const lam = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, transparent: true, opacity: 0 }))
    lam.position.z = 0.008
    // DECLARADA PARA QUE E-ENCAJE-REAL LA CUIDE. La contencion de este motor es declarativa —la regla
    // que exige entrar ENTERO solo corre sobre las mallas que lo piden, 16 de 799— y una lamina que se
    // sale del cuadro mientras el cubo tumba es exactamente el defecto que nadie ve venir. Medido sobre
    // las 407 construcciones (11 aires x 8 juegos de datos reales): entra siempre, y el peor caso llega
    // a 0.660 del semicuadro. Declararlo no cambia nada hoy y convierte en FALLO cualquier cambio de
    // LADO, de UTIL o del tumbo que la saque.
    lam.userData.encaja = true
    grupoCara.add(lam)

    // Un filete de acento en el canto inferior de cada cara. Es el detalle que hace que las seis se
    // lean como parte del mismo objeto y no como seis imagenes pegadas.
    const fil = new THREE.Mesh(
      new THREE.PlaneGeometry(w, 0.022),
      matAcento(i % 2 ? LOOK.acento2 : LOOK.acento, 1.25))
    fil.material.transparent = true
    fil.material.opacity = 0
    fil.position.set(0, -h / 2 - 0.05, 0.01)
    grupoCara.add(fil)

    laminas.push({ placa, lam, fil, g: grupoCara })
  })

  // ---------------------------------------------------------------- tiempo
  // El fondo cede mientras el cubo es el sujeto: seis recortes girando contra una trama es demasiada
  // informacion por segundo. Vuelve antes del corte, porque la escena siguiente cuenta con ella.
  if (ctx.fondo && ctx.fondo.uGrilla) {
    const base = ctx.fondo.uGrilla.value
    tl.to(ctx.fondo.uGrilla, { value: base * 0.30, duration: b(1.1), ease: E.frena(2) }, 0)
    tl.to(ctx.fondo.uGrilla, { value: base, duration: b(0.9), ease: E.vaiven() }, DUR - b(0.9))
  }

  // LLEGA girando desde el fondo. Un cubo que aparece de frente y quieto es un icono; uno que llega
  // tumbando declara que tiene volumen antes de que se lea ninguna cara.
  gCubo.position.set(0, -0.2, -7.5)
  gCubo.scale.setScalar(0.45)
  tl.to(gCubo.position, { z: 0, duration: b(1.2), ease: E.llega(1.7) }, 0)
  tl.to(gCubo.scale, { x: 1, y: 1, z: 1, duration: b(1.2), ease: E.llega(2.0) }, 0)

  // LAS CARAS SE ENCIENDEN DE A UNA, una por beat. Es el evento duro de la escena y lo que convierte
  // un objeto que gira en una secuencia: el ojo recibe seis noticias, no una.
  laminas.forEach((L, i) => {
    const t0 = b(0.9 + i * 0.75)
    tl.to(L.placa.material, { opacity: 0.95, duration: b(0.22), ease: E.frena(2) }, t0)
    tl.to(L.lam.material, { opacity: 1, duration: b(0.30), ease: E.frena(2) }, t0 + b(0.06))
    tl.to(L.fil.material, { opacity: 0.9, duration: b(0.20), ease: E.frena(3) }, t0 + b(0.10))
  })

  // EL TUMBO VA A SALTOS, y esa es la unica forma de que un recorte con texto se lea mientras el cuerpo
  // gira. El obturador promedia dos submuestras: con giro continuo, cada cara se dibuja dos veces
  // desfasada y el texto de la captura sale doble — la misma cuenta que documenta `escalera` en el kit.
  //
  // Seis peldaños de un cuarto de vuelta en Y con un sexto de vuelta en X: cada reposo deja una cara
  // distinta enfrentada a la camara y perfectamente quieta. El desliz dura 0.18 s como en todo el motor.
  // CADA REPOSO DEJA UNA CARA RECTA, y eso hay que construirlo — no sale de tumbar en dos ejes.
  //
  // La primera version giraba `rotation.y` y `rotation.x` a la vez, y en el render la cara del frente
  // descansaba DE CABEZA: el logo de linear se leia rotado 180 grados. Un cubo que rueda libre es
  // correcto como fisica y es un error como composicion, porque el unico instante en que el espectador
  // puede leer una cara es justo el que queda torcido.
  //
  // La orientacion de reposo de la cara `i` es EXACTAMENTE la inversa de su propia rotacion local: si la
  // cara esta girada Rf respecto del cubo, poniendo el cubo en Rf⁻¹ esa cara queda mirando a camara y
  // con su vertical alineada a la del cuadro. Sale de la misma tabla que las construye, asi que no puede
  // desincronizarse: agregar o mover una cara mueve su pose sola.
  //
  // Entre pose y pose se interpola por SLERP, que entre dos orientaciones a 90 grados es un giro sobre un
  // eje unico — se lee como que el cubo rueda, no como que se retuerce. Y el desliz dura 0.18 s como
  // todo el motor: en el reposo las dos submuestras del obturador caen en el mismo lugar y la captura
  // sale nitida (ver `escalera` en el kit).
  const Q_TRES_CUARTOS = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.16, 0.36, 0))
  const POSES = CARAS.map(c => new THREE.Quaternion()
    .setFromEuler(new THREE.Euler(c.r[0], c.r[1], c.r[2])).invert())
  const PASOS = POSES.length - 1
  const DESLIZ = deslizFijo(DUR - b(1.0), PASOS)
  const girar = () => {
    const w = Math.max(0, Math.min(1, (tl.time() - b(0.6)) / Math.max(0.001, DUR - b(1.0))))
    const x = w * PASOS
    const k = Math.min(PASOS - 1, Math.floor(x))
    const f = x - k
    const t = f <= 0 ? 0 : f >= DESLIZ ? 1 : (1 - Math.cos((f / DESLIZ) * Math.PI)) / 2
    gGiro.quaternion.slerpQuaternions(POSES[k], POSES[k + 1], t)
    // Y TRES CUARTOS, SIEMPRE. Con la pose sola, el reposo deja la cara perfectamente de frente y el
    // cubo se lee PLANO: una tarjeta cuadrada, que es exactamente lo que esta escena no es. El desvio
    // constante se aplica DESPUES de la pose y en espacio mundial, asi que la vertical del cuadro sigue
    // siendo la vertical de la cara —el texto se lee igual— y ademas entra una segunda cara en escorzo.
    // Es el encuadre de cualquier foto de producto y la unica forma de tener las dos cosas.
    gGiro.quaternion.premultiply(Q_TRES_CUARTOS)
  }

  // Las caras viven en la OTRA escena: se les copia la transformacion mundial del cuerpo en cada cuadro.
  //
  // Y SE OCULTAN LAS DE ATRAS A MANO, que es la parte que no se puede saltear. `gr` se dibuja SIEMPRE
  // por encima de `g` sin importar z —es la regla central del motor, la que evita que una captura casi
  // blanca florezca—, asi que las tres caras del fondo se veian A TRAVES del solido. Y una lamina vista
  // por detras sale ESPEJADA: en el render se leia "raeniL" sobre la cara de arriba. No hay z-buffer que
  // lo arregle porque las dos escenas no comparten profundidad; hay que decidirlo por geometria.
  //
  // La cuenta es un producto punto por cara: si su normal mundial no apunta hacia la camara, no se
  // dibuja. Seis productos punto por cuadro, y es exacto — no una heuristica de angulo.
  const _n = new THREE.Vector3(), _p = new THREE.Vector3()
  const sincronizar = () => {
    g.updateWorldMatrix(true, true)
    gGiro.matrixWorld.decompose(gCaras.position, gCaras.quaternion, gCaras.scale)
    gCaras.updateMatrixWorld(true)
    for (const L of laminas) {
      L.g.getWorldDirection(_n)
      L.g.getWorldPosition(_p)
      _p.subVectors(camera.position, _p)
      L.g.visible = _n.dot(_p) > 0
    }
  }
  // El onUpdate de la TIMELINE corre despues de todos sus hijos, que es la garantia que hace falta para
  // que la copia lea la transformacion de ESTE cuadro y no la del anterior. Ver la nota larga en
  // telefono.js: colgado de un tween hijo, un salto en frio leia un cuadro viejo.
  tl.eventCallback('onUpdate', () => { girar(); sincronizar() })
  girar()
  sincronizar()

  // La camara se acerca mientras el cubo se asienta y VUELVE: sin paralaje contra el fondo, un solido
  // que gira sobre si mismo se lee pegado a la imagen de atras.
  tl.fromTo(camera.position, { z: dolly(distBase, 0.8) }, { z: dolly(distBase, -0.30), duration: DUR * 0.80, ease: 'none' }, 0)
  tl.to(camera.position, { z: distBase, duration: DUR * 0.20, ease: E.vaiven() }, DUR * 0.80)
  tl.fromTo(camera.position, { x: orbita(-0.18) }, { x: orbita(0.14), duration: DUR * 0.58, ease: E.vaiven(), immediateRender: false }, 0)
  tl.to(camera.position, { x: 0, duration: DUR * 0.42, ease: E.vaiven() }, DUR * 0.58)

  // SALIDA: el cubo se va hacia la camara y se apaga. Irse HACIA adelante y no hacia arriba es lo que
  // deja el corte siguiente sobre un cuadro vacio en el centro, que es donde la escena que viene compone.
  const SAL = DUR - b(0.75)
  tl.to(gCubo.position, { z: 6.5, duration: b(0.75), ease: E.acelera(3) }, SAL)
  laminas.forEach((L, i) => {
    tl.to(L.lam.material, { opacity: 0, duration: b(0.4), ease: E.acelera(2) }, SAL + i * b(0.03))
    tl.to(L.placa.material, { opacity: 0, duration: b(0.4), ease: E.acelera(2) }, SAL + i * b(0.03))
    tl.to(L.fil.material, { opacity: 0, duration: b(0.35), ease: E.acelera(2) }, SAL + i * b(0.03))
  })

  void rnd; void mundoW; void mundoH
  return { g, gr, tl }
}
