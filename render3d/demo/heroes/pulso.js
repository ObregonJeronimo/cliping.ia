// HERO "pulso" — tres canales de un monitor escribiendo señal en vivo, con el latido cayendo en el beat.
//
// QUE REGISTRO LLENA, Y POR QUE NINGUNO DE LOS CATORCE LO LLENABA
// Los heroes abstractos que hay son todos OBJETOS: un cuerpo con una forma, en un espacio, girando o
// subiendo. Sirven para decir de que esta hecha una marca y no sirven para nada cuando lo que la marca
// vende es LECTURA — una clinica, un laboratorio, una app de entrenamiento, una fintech, una empresa de
// telemetria o de monitoreo de flota. Ahi el sujeto no es una cosa: es una magnitud a lo largo del
// tiempo. Un cristal girando sobre una marca que mide el corazon de alguien no dice nada, y peor, dice
// "software generico", que es exactamente la queja que abrio el registro de heroes por aire.
//
// Y hay una razon mas dura para que este exista: es el unico hero cuyo eje horizontal ES el tiempo. En
// los otros catorce el tiempo pasa y no queda; aca queda escrito y se va por la izquierda, que es la
// unica forma visual de decir "esto viene de antes y sigue despues del corte".
//
// EL LATIDO CAE EN EL BEAT, Y NO ES UNA COINCIDENCIA AFORTUNADA
// La onda no se dibuja y despues se sincroniza: la fase esta ESCRITA en unidades de beat. Un periodo de
// señal es exactamente un beat, y el pico R —el golpe alto del complejo, el que el ojo lee como "el
// latido"— esta puesto a 0.335 de ciclo, asi que cruza el cursor en t = 0, 1, 2... beats exactos. La
// cuenta esta abajo, en `fase()`. El resultado es que el corazon del monitor y el corte de la pieza
// laten juntos sin que nadie los haya emparejado a mano.
//
// POR QUE LA CINTA SE REESCRIBE EN VEZ DE DESLIZARSE
// La primera idea fue construir una cinta tres veces mas ancha que el cuadro y correrla hacia la
// izquierda. Es lo mas barato y esta mal por una razon que no se arregla despues: sin recorte, la señal
// asoma por fuera de la banda y el monitor deja de tener marco — se ve una serpentina cruzando el
// cuadro entero. Recortarla pedia un shader con `discard`, y en este repo un shader es un template
// literal donde una sola comilla invertida rompe el build (paso siete veces).
//
// Se hace al reves y sale mas barato: la malla se queda QUIETA dentro de su banda y lo que se reescribe
// son sus vertices, muestreando la señal en una fase que avanza. Cuatrocientos cuarenta puntos por
// canal, tres canales: mil trescientas cuentas por cuadro, nada al lado de los seiscientos planos
// texturados que compone una pieza. Y el recorte sale gratis, porque la geometria nunca existio fuera
// de la banda.
//
// NO USA NADA DE LA PAGINA: se arma siempre, tambien cuando la captura fallo.
//
// CONTRATO: ver heroes/telefono.js

import { LOOK, b, E, hex, matAcento, nivel, CLARO, dolly, deriva } from '../kit.js'

export const meta = {
  id: 'pulso',
  nombre: 'Monitor de tres canales',
  necesita: ['nada'],
  beats: 8,
}

const ANCHO = 4.30                   // ancho util de una banda
const X_CUR = ANCHO / 2 - 0.20       // donde escribe el cabezal: el canto derecho, con un margen
const X_IZQ = -ANCHO / 2
// CUATRO CICLOS A LA VISTA, y el numero decide dos cosas a la vez. Con dos, la señal se ve enorme y
// avanza a 710 px/s: con el obturador de esta pieza (dos submuestras a 8.8 ms) eso deja un fantasma de
// 6 px sobre un trazo de 10, o sea la mitad del ancho del trazo duplicada. Con seis, cada latido mide
// 130 px y el complejo se convierte en un pelo. Cuatro deja 427 px/s —3.8 px de fantasma, que se lee
// como velocidad y no como suciedad— y un latido cada beat, que es lo que ata la escena al pulso.
const PER = ANCHO / 4
const M = 440                        // muestras por canal: ver la nota de sigma en `latido`
const GROSOR = 0.055

// Las tres bandas: donde esta cada una y cuanto respira. La del medio es casi el doble de alta que las
// otras dos, y esa jerarquia es lo que evita que el cuadro se lea como una planilla. Un monitor con
// tres canales iguales es una lista; con uno protagonico y dos de apoyo es una lectura.
const BANDAS = [
  { y: 3.05, semi: 1.05, canal: 'presion' },
  { y: 0.00, semi: 1.75, canal: 'latido' },
  { y: -3.05, semi: 1.05, canal: 'digital' },
]

const gauss = (x, mu, s) => Math.exp(-((x - mu) * (x - mu)) / (2 * s * s))
const frac = (x) => x - Math.floor(x)

// EL COMPLEJO, con las cinco ondas que lo hacen reconocible. Sacando cualquiera de las cinco deja de
// leerse como un latido y pasa a ser un pico: la P chica que anuncia, la bajada Q, el pico R, la bajada
// S que lo devuelve por debajo de la linea y la T ancha que cierra. Es la unica forma de que un dibujo
// abstracto active el reconocimiento, y ese reconocimiento es todo lo que este canal aporta.
//
// SIGMA DEL PICO R Y CUANTAS MUESTRAS HACEN FALTA, porque las dos cosas son la misma decision. Con
// sigma 0.0105 de ciclo el ancho util del pico es 0.06, y con 110 muestras por ciclo eso son seis
// puntos y medio: al desplazarse, el vertice mas alto cae a veces adentro del pico y a veces al lado, y
// el pico PARPADEA de altura cuadro a cuadro. Es aliasing puro y en el video se ve como si el trazo
// temblara. Con sigma 0.013 y 440 muestras (110 por ciclo) el pico se dibuja con ocho puntos y queda
// estable. El costo de subir muestras es lineal y despreciable; el de aflojar sigma es que el complejo
// se ensancha y deja de ser un complejo.
const latido = (f0) => {
  const f = frac(f0)
  return gauss(f, 0.140, 0.034) * 0.17
    - gauss(f, 0.300, 0.012) * 0.15
    + gauss(f, 0.335, 0.013) * 1.00
    - gauss(f, 0.374, 0.017) * 0.32
    + gauss(f, 0.560, 0.052) * 0.30
}

export function build(ctx) {
  const { THREE, gsap, mundoW, camera, distBase, rnd } = ctx
  const g = new THREE.Group()
  const tl = gsap.timeline({ paused: true })
  const DUR = b(meta.beats)

  // Dos grupos anidados: `gLlegada` lleva entrada y salida con tweens, `gMec` la deriva continua escrita
  // a mano. Es la regla de un solo escritor por propiedad — juntos se pisarian sobre `position.x`.
  const gLlegada = new THREE.Group()
  g.add(gLlegada)
  const gMec = new THREE.Group()
  gLlegada.add(gMec)

  // Los tres canales comparten la fase pero no el dibujo. Las semillas salen de ctx.rnd para que dos
  // piezas del mismo aire no tengan la MISMA onda de presion: el latido si es siempre igual, porque un
  // complejo no es una decoracion que se pueda sortear.
  const p1 = rnd() * 6.28, p2 = rnd() * 6.28, p3 = rnd() * 6.28
  const niveles = []
  for (let i = 0; i < 48; i++) niveles.push(rnd() * 1.7 - 0.85)

  // La señal de presion: tres armonicos ENTEROS del beat. Con un multiplo no entero el dibujo sigue
  // siendo lindo y deja de repetirse cada beat, o sea que el canal se despega del pulso justo en la
  // escena que existe para tenerlo.
  const presion = (f) => 0.55 * Math.sin(6.28318 * f + p1)
    + 0.26 * Math.sin(6.28318 * 2 * f + p2)
    + 0.12 * Math.sin(6.28318 * 5 * f + p3)

  // El canal digital: escalones que cambian dos veces por beat y suben con media cosenoide, no de
  // golpe. Un salto instantaneo no tiene DIRECCION —el ojo no ve que subio, ve que cambio— y ademas un
  // canto vertical perfecto en una malla que se remuestrea cada cuadro es donde primero aparece el
  // aliasing. Es la misma cuenta que `escalera` en el kit, aplicada a una señal en vez de a un texto.
  const RAMPA = 0.14
  const digital = (f) => {
    const x = f * 2                                   // dos escalones por beat: caen en la grilla
    const k = Math.floor(x)
    const u = x - k
    const a = niveles[((k - 1) % 48 + 48) % 48]
    const c = niveles[((k % 48) + 48) % 48]
    if (u >= RAMPA) return c
    return a + (c - a) * (1 - Math.cos((u / RAMPA) * Math.PI)) / 2
  }

  // LA FASE, que es la linea de la que cuelga todo el hero.
  //
  // Devuelve en que punto del ciclo esta la señal que corresponde dibujar en la posicion `x` de la
  // banda, en el instante `t`. Dos terminos: cuanto se corrio la posicion respecto del cursor, medido en
  // ciclos; y cuanto tiempo paso, medido en BEATS. Que el segundo termino este en beats y no en segundos
  // es lo unico que hace falta para que la escena entera quede atada al pulso.
  //
  // El 0.335 corre el origen justo lo que mide el pico R dentro del ciclo: asi, en x = X_CUR y t = k
  // beats exactos, la fase vale k + 0.335 y lo que esta bajo el cursor es el pico. Sin ese sumando el
  // latido sigue siendo periodico y cae donde caiga, que es peor que no sincronizar nada — se escucha
  // como algo que casi coincide.
  const fase = (x, t) => (x - X_CUR) / PER + t / b(1) + 0.335

  // ---------------------------------------------------------------- material de rejilla
  // La rejilla NO es de acento. Doce lineas encendidas alrededor de tres trazos encendidos es un cuadro
  // sin jerarquia: el acento tiene que quedar para la señal, que es lo unico que este objeto afirma.
  const matReja = (k) => new THREE.MeshBasicMaterial({
    color: hex(nivel(CLARO ? (0.30 + k * 0.22) : (0.22 + k * 0.20))),
    transparent: true, opacity: 0, toneMapped: false,
  })

  const canales = []
  const bandas = []

  BANDAS.forEach((B, iB) => {
    const gBanda = new THREE.Group()
    gBanda.position.y = B.y
    gMec.add(gBanda)
    const protagonico = B.canal === 'latido'
    const AMP = B.semi * 0.74

    // ---- rejilla: dos reglas horizontales, un eje y seis marcas de tiempo abajo.
    // Abierta a los costados a proposito. Un rectangulo cerrado alrededor de cada canal son tres
    // recuadros apilados, que es la silueta de una tabla; dos reglas sin cerrar los lados dicen "esto
    // sigue" hacia los dos lados, que es lo que hace un registro continuo.
    const reja = []
    for (const s of [1, -1]) {
      const r = new THREE.Mesh(new THREE.PlaneGeometry(ANCHO, 0.026), matReja(1))
      r.position.set(0, s * B.semi, -0.05)
      gBanda.add(r); reja.push(r)
    }
    const eje = new THREE.Mesh(new THREE.PlaneGeometry(ANCHO, 0.014), matReja(0))
    eje.position.set(0, 0, -0.05)
    gBanda.add(eje); reja.push(eje)
    for (let i = 0; i < 6; i++) {
      const t = new THREE.Mesh(new THREE.PlaneGeometry(0.020, 0.13), matReja(0))
      t.position.set(X_IZQ + (i / 5) * ANCHO * 0.98 + 0.04, -B.semi + 0.065, -0.05)
      gBanda.add(t); reja.push(t)
    }

    // ---- la cinta de señal. Dos vertices por muestra, uno a cada lado del trazo, y el desplazamiento
    // es PERPENDICULAR a la tangente local y no vertical: en el pico R la pendiente es casi vertical, y
    // un grosor medido en Y ahi deja el trazo con un cuarto de su ancho — el complejo se ve como un
    // alambre justo donde tiene que verse como un golpe.
    const xs = new Float32Array(M)
    for (let i = 0; i < M; i++) xs[i] = X_IZQ + (X_CUR - X_IZQ) * (i / (M - 1))
    const ys = new Float32Array(M)
    const pos = new Float32Array(M * 2 * 3)
    const idx = []
    for (let i = 0; i < M - 1; i++) {
      const a = i * 2
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setIndex(idx)
    // LOS VOLUMENES DE RECORTE SE FIJAN A MANO, y no es microoptimizacion: es correccion.
    // three calcula la caja y la esfera UNA vez, la primera que alguien las pide, y despues las cachea.
    // Como esta malla reescribe sus vertices en cada cuadro, esa caja queda vieja para siempre: el
    // frustum culling del renderer podria decidir que la cinta no se ve y dejar de dibujarla, y la
    // compuerta de encuadre mediria un rectangulo que ya no existe. Se declaran del tamaño de la banda,
    // que es lo maximo que la señal puede llegar a ocupar, y el problema desaparece de raiz.
    const alto = AMP + GROSOR
    geo.boundingBox = new THREE.Box3(
      new THREE.Vector3(X_IZQ - GROSOR, -alto, -0.01), new THREE.Vector3(X_CUR + GROSOR, alto, 0.01))
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3((X_IZQ + X_CUR) / 2, 0, 0),
      Math.hypot((X_CUR - X_IZQ) / 2, alto) + GROSOR)

    const matTrazo = matAcento(protagonico ? LOOK.acento : LOOK.acento2, protagonico ? 1.5 : 1.15)
    matTrazo.transparent = true
    matTrazo.opacity = 0
    matTrazo.side = THREE.DoubleSide       // la cinta se dobla sobre si misma en los picos
    const cinta = new THREE.Mesh(geo, matTrazo)
    gBanda.add(cinta)

    // ---- el cabezal: la linea vertical donde se escribe, el punto que la recorre y el indice que sale
    // al margen. Los tres dicen lo mismo desde tres distancias distintas, y hace falta: el punto se
    // pierde contra el trazo cuando la señal esta plana, la linea se pierde cuando el trazo la cruza, y
    // el indice de afuera no se pierde nunca porque no tiene nada encima.
    const cursor = new THREE.Mesh(new THREE.PlaneGeometry(0.020, B.semi * 2), matAcento(LOOK.acento, 1.3))
    cursor.position.set(X_CUR, 0, 0.02)
    cursor.material.transparent = true
    cursor.material.opacity = 0
    gBanda.add(cursor)

    const punto = new THREE.Mesh(new THREE.CircleGeometry(protagonico ? 0.095 : 0.068, 20),
      matAcento(protagonico ? LOOK.acento : LOOK.acento2, 1.6))
    punto.position.set(X_CUR, 0, 0.06)
    punto.material.transparent = true
    punto.material.opacity = 0
    gBanda.add(punto)

    const indice = new THREE.Mesh(new THREE.PlaneGeometry(0.20, 0.032),
      matAcento(protagonico ? LOOK.acento : LOOK.acento2, 1.4))
    indice.position.set(X_CUR + 0.23, 0, 0.02)
    indice.material.transparent = true
    indice.material.opacity = 0
    gBanda.add(indice)

    const senal = B.canal === 'latido' ? latido : B.canal === 'presion' ? presion : digital
    canales.push({ xs, ys, pos, geo, senal, AMP, punto, indice })
    bandas.push({ gBanda, cinta, cursor, punto, indice, reja, lado: iB % 2 ? 1 : -1, protagonico })
  })

  // ================================================================ TIEMPO

  // ENTRAN DE A UNA Y POR LADOS ALTERNADOS. Las tres juntas se leen como un panel que aparece —o sea
  // como un corte, que es la transicion de quien no eligio ninguna—; escalonadas y cruzandose se leen
  // como que el sistema se esta encendiendo canal por canal. Empieza la del medio, que es la
  // protagonista: el ojo tiene que agarrarse de esa y despues descubrir las otras dos.
  const ORDEN = [1, 0, 2]
  ORDEN.forEach((i, k) => {
    const bd = bandas[i]
    const desde = bd.lado * mundoW * 1.35
    bd.gBanda.position.x = desde
    tl.fromTo(bd.gBanda.position, { x: desde },
      { x: 0, duration: b(1.05), ease: E.llega(1.6), immediateRender: false }, b(0.12 + k * 0.24))
    const t0 = b(0.55 + k * 0.24)
    bd.reja.forEach((r, j) => {
      tl.fromTo(r.material, { opacity: 0 },
        { opacity: 0.72, duration: b(0.30), ease: E.frena(2), immediateRender: false }, t0 + j * b(0.018))
    })
    // El trazo entra DESPUES de su banda, no con ella: primero el instrumento, despues la lectura. Al
    // reves se lee como que la señal trajo el aparato puesto.
    tl.fromTo(bd.cinta.material, { opacity: 0 },
      { opacity: bd.protagonico ? 0.98 : 0.82, duration: b(0.45), ease: E.frena(2), immediateRender: false }, t0 + b(0.20))
    tl.fromTo(bd.cursor.material, { opacity: 0 },
      { opacity: 0.55, duration: b(0.35), ease: E.frena(2), immediateRender: false }, t0 + b(0.30))
    tl.fromTo(bd.punto.material, { opacity: 0 },
      { opacity: 0.95, duration: b(0.30), ease: E.frena(2), immediateRender: false }, t0 + b(0.34))
    tl.fromTo(bd.indice.material, { opacity: 0 },
      { opacity: 0.9, duration: b(0.30), ease: E.frena(2), immediateRender: false }, t0 + b(0.38))
  })

  // EL CURSOR DEL CANAL PROTAGONICO DESTELLA EN CADA BEAT, o sea exactamente cuando el pico R lo cruza.
  // No es un adorno rítmico agregado encima: es el mismo instante que la fase ya define, dicho una
  // segunda vez. Sin esto el latido pasa por el cursor y no queda marcado, porque el ojo esta siguiendo
  // el trazo y no el borde del cuadro.
  const central = bandas[1]
  for (let k = 2; k < meta.beats - 1; k++) {
    tl.to(central.cursor.material, { opacity: 1.0, duration: b(0.06), ease: E.frena(2) }, b(k) - b(0.05))
    tl.to(central.cursor.material, { opacity: 0.55, duration: b(0.34), ease: E.acelera(2) }, b(k) + b(0.01))
  }

  // ---------------------------------------------------------------- lo continuo
  // Todo lo que depende de la señal se escribe desde aca y desde ningun otro lado: los vertices de las
  // tres cintas, los tres puntos del cabezal y los tres indices del margen. Son seis mallas y mil
  // trescientos vertices leyendo la MISMA funcion de fase, y por eso el punto no puede quedar despegado
  // del trazo ni el indice desfasado del punto. Escrito con tweens harian falta mil escritores y ninguna
  // garantia de que estuvieran de acuerdo.
  const f1 = rnd() * 6.28, f2 = rnd() * 6.28
  deriva(tl, DUR, (u, t) => {
    for (const c of canales) {
      const { xs, ys, pos, senal, AMP } = c
      for (let i = 0; i < M; i++) ys[i] = AMP * senal(fase(xs[i], t))
      for (let i = 0; i < M; i++) {
        const i0 = i > 0 ? i - 1 : 0
        const i1 = i < M - 1 ? i + 1 : M - 1
        const tx = xs[i1] - xs[i0], ty = ys[i1] - ys[i0]
        const L = Math.sqrt(tx * tx + ty * ty) || 1
        const nx = (-ty / L) * (GROSOR / 2), ny = (tx / L) * (GROSOR / 2)
        const j = i * 6
        pos[j] = xs[i] + nx; pos[j + 1] = ys[i] + ny; pos[j + 2] = 0
        pos[j + 3] = xs[i] - nx; pos[j + 4] = ys[i] - ny; pos[j + 5] = 0
      }
      c.geo.attributes.position.needsUpdate = true
      // El punto y el indice leen la señal en el cursor, no el ultimo vertice de la cinta. Da el mismo
      // numero y no depende de cuantas muestras tenga la malla: si mañana M cambia, esto sigue exacto.
      const yc = AMP * senal(fase(X_CUR, t))
      c.punto.position.y = yc
      c.indice.position.y = yc
    }

    // La deriva del conjunto. Un panel de instrumentos perfectamente quieto se lee como una captura de
    // pantalla; con un cabeceo lento hay paralaje contra el fondo y las tres bandas se separan en
    // profundidad. Los periodos no son multiplos entre si a proposito: si lo fueran, los ejes volverian
    // a alinearse cada tanto y el panel entero latiria como una sola cosa, que se nota mas que la
    // quietud misma.
    gMec.rotation.y = Math.sin(t * 0.33 + f1) * 0.055
    gMec.rotation.x = Math.sin(t * 0.24 + f2) * 0.030
    gMec.position.y = Math.sin(t * 0.19 + f1) * 0.055
  })

  // ---------------------------------------------------------------- camara
  // Se acerca mientras los canales se encienden y VUELVE a su marca antes del corte: la escena siguiente
  // arranca contando con (0, 0, distBase). El acercamiento es corto porque las tres bandas ya ocupan
  // nueve decimos del semialto, y con un aire de dolly 1.55 uno largo le comeria el canal de arriba.
  tl.fromTo(camera.position, { z: dolly(distBase, 0.55) },
    { z: dolly(distBase, -0.38), duration: DUR * 0.82, ease: 'none', immediateRender: false }, 0)
  tl.to(camera.position, { z: distBase, duration: DUR * 0.18, ease: E.vaiven() }, DUR * 0.82)

  // ---------------------------------------------------------------- salida
  // Se van por donde vinieron y en orden inverso: primero las de apoyo, ultima la del medio. Que el
  // canal protagonico sea el ultimo en irse deja el latido en pantalla hasta el corte, que es lo unico
  // que hay que llevarse de esta escena.
  const SAL = DUR - b(0.85)
  const SALIDA = [0, 2, 1]
  SALIDA.forEach((i, k) => {
    const bd = bandas[i]
    tl.to(bd.gBanda.position, { x: bd.lado * mundoW * 1.35, duration: b(0.62), ease: E.acelera(3) }, SAL + k * b(0.08))
    tl.to(bd.cinta.material, { opacity: 0, duration: b(0.42), ease: E.acelera(2) }, SAL + k * b(0.08))
    tl.to(bd.punto.material, { opacity: 0, duration: b(0.34), ease: E.acelera(2) }, SAL + k * b(0.08))
    tl.to(bd.indice.material, { opacity: 0, duration: b(0.34), ease: E.acelera(2) }, SAL + k * b(0.08))
    tl.to(bd.cursor.material, { opacity: 0, duration: b(0.34), ease: E.acelera(2) }, SAL + k * b(0.08))
    bd.reja.forEach(r => tl.to(r.material, { opacity: 0, duration: b(0.30), ease: E.acelera(2) }, SAL + k * b(0.08)))
  })

  return { g, tl }
}
