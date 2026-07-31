// HERO "biela" — un motor de tres cilindros abierto, girando. El unico objeto del catalogo donde el
// movimiento de una pieza EXPLICA el de otra.
//
// QUE REGISTRO LLENA, Y POR QUE NINGUNO DE LOS DOCE LO LLENABA
// Los heroes de geometria pura dicen materia (cristal), orbita (toro), sistema (enjambre), gesto
// (cinta), peso (columnata) y blandura (gota). Los seis tienen algo en comun que no se ve hasta que
// falta: sus partes se mueven CADA UNA POR SU CUENTA. Los aros del toro giran a velocidades distintas
// porque se les puso velocidades distintas; si uno frenara, el otro no se enteraria. Eso esta bien para
// vender atmosfera y no sirve para nada cuando la marca vende MAQUINA — un taller, una autopartista,
// una empresa de mantenimiento, una fabrica. Ahi lo que hay que decir no es "esto es lindo", es "esto
// FUNCIONA": hay una causa, hay una transmision y hay una consecuencia.
//
// Aca el cigüeñal es lo unico que se mueve por decision propia. Todo lo demas —los tres pistones, las
// tres bielas, el arbol de levas— sale de una cuenta a partir de su angulo. Si se cambia una sola linea,
// la de theta, se mueven las once piezas juntas y siguen encajando. Es la diferencia entre una animacion
// y un mecanismo, y se nota aunque el espectador no sepa nombrarla.
//
// POR QUE NO HAY PELDAÑOS ACA
// La doctrina de esta pieza —`escalera` en el kit— dice que lo que se mueve en continuo se difumina y
// lo que se detiene se lee. Es cierta Y ES SOBRE TEXTO: un renglon corrido a 1820 px/s sale escrito dos
// veces. Un cigüeñal que avanza a saltos no es un cigüeñal mas legible, es un cigüeñal roto. Lo que si
// se ata a la grilla son los EVENTOS: la velocidad esta elegida para que cada explosion caiga exacto en
// un medio beat (ver VUELTAS, abajo), asi que el motor suena en el pulso sin dejar de girar parejo.
//
// LO QUE SE DEJO AFUERA A PROPOSITO
// Valvulas. El arbol de levas esta, y sus tres lobulos giran a la mitad de vueltas que el cigüeñal
// —cuatro tiempos, no es un adorno—, pero empujar una valvula pide un balancin, un muelle y una guia,
// y a esta escala esas cuatro piezas miden dos pixeles cada una: se leen como suciedad sobre la culata,
// no como un tren de valvulas. El lobulo excentrico girando ya cuenta que arriba pasa algo y a la mitad
// de ritmo, que es toda la informacion que el cuadro puede sostener.
//
// NO USA NADA DE LA PAGINA: se arma siempre, tambien cuando la captura fallo.
//
// CONTRATO: ver heroes/telefono.js

import { LOOK, b, E, hex, matAcento, nivel, CLARO, dolly, deriva } from '../kit.js'

export const meta = {
  id: 'biela',
  nombre: 'Motor de tres cilindros',
  necesita: ['nada'],
  beats: 8,
}

// TRES Y NO CUATRO, y la razon es el formato. En un cuadro de 9:16 el ancho es el recurso escaso: con
// cuatro cilindros el paso baja a 1.24 y cada piston queda en 0.74 de diametro, o sea 142 px en el
// render — un dedal. Con tres, cada uno mide 188 px y se le ve la corona, el bulon y la biela entrando.
// Ademas un tres en linea tiene calado de 120 grados, que reparte las explosiones parejas: nunca hay
// dos pistones haciendo lo mismo, que es justo lo que arruina la lectura de un cuatro en linea (el 1 y
// el 4 suben juntos y el ojo ve dos cosas en vez de seis).
const N = 3
const PASO = 1.52                    // separacion entre ejes de cilindro
const R_MAN = 1.15                   // radio de manivela: la carrera es el doble
const L_BIELA = 3.10                 // largo de biela, de centro de bulon a centro de muñequilla
const Y_EJE = -2.90                  // altura del eje del cigüeñal
const D_PIS = 0.98                   // diametro de piston
const H_PIS = 0.80

// LA ALTURA DEL BULON, QUE ES LA CUENTA QUE SOSTIENE TODO EL HERO.
//
// El piston esta obligado a moverse sobre el eje del cilindro (z = 0) y la biela tiene largo FIJO. De
// esas dos condiciones sale una sola altura posible para cada angulo de manivela, y es esta. No es una
// aproximacion sinusoidal: la asimetria entre la carrera de subida y la de bajada —el piston pasa mas
// tiempo abajo que arriba— es exactamente lo que hace que un motor se vea como un motor y no como tres
// cosas oscilando. Se pierde escribiendo Math.sin y no se recupera despues.
//
// El max(0, ...) no es paranoia de programador: con R_MAN mayor que L_BIELA la raiz se vuelve negativa
// y el mecanismo directamente no existe. Prefiero que la pieza quede plantada a que devuelva NaN y se
// lleve puesta la matriz mundial de medio hero, que es un defecto que despues no dice de donde vino.
const alturaBulon = (a) => {
  const s = R_MAN * Math.sin(a)
  return Y_EJE + R_MAN * Math.cos(a) + Math.sqrt(Math.max(0, L_BIELA * L_BIELA - s * s))
}

// CUANTAS VUELTAS DA EL CIGÜEÑAL EN LOS OCHO BEATS, y el numero no es de gusto: es lo que ata el motor
// a la grilla sin frenarlo. Con tres cilindros a 120 grados hay UNA explosion cada tercio de vuelta, o
// sea tres por vuelta. Para que caigan en los dieciseis medios beats de la escena hacen falta 16/3
// vueltas exactas — y ahi la cuenta cierra sola: en t = b(k/2) el angulo vale k*120 grados, asi que el
// cilindro que esta en punto muerto superior es siempre el k modulo 3. Se enciende uno por medio beat,
// rotando 0-1-2-0-1-2, sin una sola lista de tiempos escrita a mano.
//
// De paso da 1.38 vueltas por segundo, que es la ventana donde el ojo todavia sigue una muñequilla: mas
// lento se ve una maqueta girando a mano, mas rapido el contrapeso se vuelve un disco borroso y se
// pierde justo lo que este hero vino a mostrar.
const VUELTAS = 16 / 3

// Cuanto se sube el conjunto para quedar centrado en el cuadro. La geometria se compone alrededor del
// cigüeñal —que es donde nace todo— y ese punto no es el centro visual: el carter cuelga y la culata no
// llega tan arriba. Escrito como una constante y no sumado a mano en cada pieza, porque la unica forma
// de que esto no se desfase es que haya UN numero.
const SUBIR = 0.69

export function build(ctx) {
  const { THREE, gsap, camera, distBase, rnd } = ctx
  const g = new THREE.Group()
  const tl = gsap.timeline({ paused: true })
  const DUR = b(meta.beats)

  // DOS GRUPOS ANIDADOS, por la regla de un solo escritor por propiedad. `gLlegada` hace la entrada y
  // la salida con tweens; `gMec`, hijo suyo, lleva la deriva continua escrita a mano en el onUpdate.
  // Si los dos vivieran en el mismo objeto, el tween de entrada y la deriva se pelearian por
  // `position.y` y el resultado dejaria de repetir dos veces igual — que es como se rompio `partida`.
  const gLlegada = new THREE.Group()
  g.add(gLlegada)
  const gMec = new THREE.Group()
  gLlegada.add(gMec)

  // ---------------------------------------------------------------- materiales
  // Dos grises y no uno. El bloque tiene que quedarse atras y las piezas que se mueven tienen que
  // despegarse de el, o el motor entero se lee como una sola mancha con reflejos. `nivel()` interpola
  // de FONDO a TINTA, asi que el mismo par de numeros da bloque oscuro / piezas claras sobre negro y
  // bloque medio / piezas oscuras sobre papel. Un gris fijo desaparece en una de las dos polaridades:
  // ya paso tres veces en este repo y por eso la regla esta escrita en el contrato.
  const matBloque = new THREE.MeshPhysicalMaterial({
    color: hex(nivel(CLARO ? 0.34 : 0.19)), roughness: 0.52, metalness: 0.35,
    clearcoat: 0.35, clearcoatRoughness: 0.45,
  })
  // Las piezas moviles van MAS metalicas y menos rugosas: lo que delata a un piston mecanizado no es su
  // color, es que el reflejo del estudio le corre por la falda al subir. Sin metalness alto no corre
  // nada y queda un cilindro pintado.
  const matMovil = () => new THREE.MeshPhysicalMaterial({
    color: hex(nivel(CLARO ? 0.56 : 0.45)), roughness: 0.24, metalness: 0.85,
    clearcoat: 0.6, clearcoatRoughness: 0.18,
  })
  // El cigüeñal, un punto mas oscuro que el resto de lo movil: es la pieza forjada, no la mecanizada, y
  // ademas conviene que los contrapesos no compitan con los pistones por la atencion.
  const matForja = () => new THREE.MeshPhysicalMaterial({
    color: hex(nivel(CLARO ? 0.46 : 0.33)), roughness: 0.38, metalness: 0.75,
    clearcoat: 0.4, clearcoatRoughness: 0.30,
  })

  // Un cilindro con el eje sobre X. three los pare con el eje en Y, asi que la rotacion va en la
  // geometria y no en la malla: puesta en la malla, cualquier tween sobre `rotation` despues la pisa.
  const disco = (radio, largo, mat, seg = 28) => {
    const geo = new THREE.CylinderGeometry(radio, radio, largo, seg)
    geo.rotateZ(Math.PI / 2)
    return new THREE.Mesh(geo, mat)
  }

  // ---------------------------------------------------------------- bancada y culata
  const ANCHO_BLOQUE = PASO * (N - 1) + 1.51            // 4.55: los tres cilindros mas los bordes
  const carter = new THREE.Mesh(new THREE.BoxGeometry(ANCHO_BLOQUE, 0.36, 1.10), matBloque)
  carter.position.set(0, -4.52, 0)
  gMec.add(carter)

  const culata = new THREE.Mesh(new THREE.BoxGeometry(ANCHO_BLOQUE, 0.22, 0.92), matBloque)
  culata.position.set(0, 2.18, 0)
  gMec.add(culata)

  // EL UNICO FILETE DE ACENTO FIJO de la pieza, pegado bajo la culata. Un motor en dos grises es un
  // motor correcto y anonimo: la marca no aparece por ningun lado. Una linea de color donde el ojo ya
  // esta mirando —la banda donde se produce la explosion— tiñe todo el objeto sin pintarlo.
  const liston = new THREE.Mesh(new THREE.PlaneGeometry(ANCHO_BLOQUE * 0.94, 0.045), matAcento(LOOK.acento, 1.4))
  liston.position.set(0, 2.02, 0.47)
  liston.material.transparent = true
  liston.material.opacity = 0
  gMec.add(liston)

  // ---------------------------------------------------------------- el eje y los tres trenes
  const eje = disco(0.20, ANCHO_BLOQUE * 0.98, matForja(), 20)
  eje.position.set(0, Y_EJE, 0)
  gMec.add(eje)

  const trenes = []
  for (let i = 0; i < N; i++) {
    const X = (i - (N - 1) / 2) * PASO

    // GUIAS ABIERTAS Y NO UN CILINDRO CERRADO. La primera idea fue un tubo: es lo que tiene un motor de
    // verdad y es exactamente lo que hay que no poner, porque tapa el piston, la biela y la muñequilla
    // — o sea las tres cosas por las que este hero existe. Dos rieles a los costados dan la misma idea
    // de "esto corre por una guia" y dejan el mecanismo a la vista. Es un motor de banco de pruebas,
    // que ademas es el registro correcto: ingenieria, no catalogo de repuestos.
    for (const s of [-1, 1]) {
      const riel = new THREE.Mesh(new THREE.BoxGeometry(0.13, 3.55, 0.40), matBloque)
      riel.position.set(X + s * (D_PIS / 2 + 0.13), 0.225, 0)
      gMec.add(riel)
    }

    // PISTON. La corona va apenas mas ancha que la falda: es el chaflan que tiene cualquier piston y es
    // lo que hace que al llegar arriba el canto atrape una linea de luz en vez de quedar romo.
    const piston = new THREE.Group()
    // La falda va con el eje en Y —el piston corre vertical— asi que NO pasa por `disco()`, que existe
    // para las piezas que giran sobre X. Girarla y desgirarla seria la misma malla con dos operaciones
    // que se anulan, y alguien la va a borrar sin darse cuenta de que la otra la necesitaba.
    const falda = new THREE.Mesh(new THREE.CylinderGeometry(D_PIS / 2, D_PIS / 2, H_PIS, 32), matMovil())
    piston.add(falda)
    const corona = new THREE.Mesh(new THREE.CylinderGeometry(D_PIS / 2 + 0.035, D_PIS / 2 + 0.035, 0.10, 32), matMovil())
    corona.position.y = H_PIS / 2 - 0.02
    piston.add(corona)
    // Bulon: el eje sobre el que pivota la biela. Asoma a los dos lados de la falda a proposito, porque
    // es lo unico que explica por que la biela cuelga de ahi y no de cualquier punto del piston.
    const bulon = disco(0.15, D_PIS + 0.12, matForja(), 16)
    piston.add(bulon)
    piston.position.set(X, 0, 0)
    gMec.add(piston)

    // BIELA. Es un grupo y no una malla suelta porque lleva los dos cojinetes en las puntas, y esos
    // tienen que girar CON ella: puestos como hermanos habria que reescribir sus tres posiciones en
    // cada cuadro y ya serian tres escritores mas donde alcanza con uno.
    const biela = new THREE.Group()
    const cuerpo = new THREE.Mesh(new THREE.BoxGeometry(0.19, L_BIELA, 0.26), matMovil())
    biela.add(cuerpo)
    const pieChico = disco(0.20, 0.34, matMovil(), 18); pieChico.position.y = L_BIELA / 2
    const pieGrande = disco(0.30, 0.40, matMovil(), 20); pieGrande.position.y = -L_BIELA / 2
    biela.add(pieChico, pieGrande)
    gMec.add(biela)

    // CIGÜEÑAL: un grupo por cilindro, apoyado en el eje, que gira sobre X. Todo lo que lleva adentro
    // esta escrito en coordenadas de manivela —la muñequilla en (0, R_MAN, 0)— asi que la unica
    // propiedad que hay que escribir por cuadro es su rotacion. Un solo escritor, una sola linea.
    const manivela = new THREE.Group()
    manivela.position.set(X, Y_EJE, 0)
    const brazo = new THREE.Mesh(new THREE.BoxGeometry(0.24, R_MAN + 0.36, 0.32), matForja())
    brazo.position.y = R_MAN / 2 - 0.05
    manivela.add(brazo)
    const munequilla = disco(0.18, 0.46, matForja(), 18)
    munequilla.position.y = R_MAN
    manivela.add(munequilla)
    // CONTRAPESO, y es la pieza que mas trabaja visualmente de todo el hero. Un cigüeñal sin contrapesos
    // es un alambre doblado que gira: no se le ve la vuelta porque no tiene masa que seguir. El disco
    // excentrico da una silueta que sube por un lado y baja por el otro, o sea la unica pieza del motor
    // cuyo giro se lee entero de un vistazo. Va del lado opuesto a la muñequilla, como corresponde.
    const contrapeso = disco(0.80, 0.20, matForja(), 34)
    contrapeso.position.y = -0.52
    manivela.add(contrapeso)
    gMec.add(manivela)

    // EXPLOSION. Un disco de acento en la camara de combustion, delante de los rieles para que no lo
    // tape nada. No pretende ser fuego: es el destello que marca CUANDO pasa algo, y su unico trabajo
    // es caer en el beat. Empieza apagado; toda su vida esta declarada en la timeline.
    const fogonazo = new THREE.Mesh(new THREE.CircleGeometry(0.42, 26), matAcento(i === 1 ? LOOK.acento2 : LOOK.acento, 1.5))
    fogonazo.position.set(X, 1.93, 0.34)
    fogonazo.material.transparent = true
    fogonazo.material.opacity = 0
    fogonazo.material.depthWrite = false
    gMec.add(fogonazo)

    trenes.push({ X, piston, biela, manivela, fogonazo })
  }

  // ---------------------------------------------------------------- arbol de levas
  // Gira a la MITAD de vueltas que el cigüeñal, que es lo que hace un motor de cuatro tiempos: cada
  // cilindro explota una vez cada dos vueltas. No es un dato de manual puesto por prolijidad — es la
  // segunda velocidad de la escena. Con todo girando al mismo ritmo el conjunto late como una sola cosa
  // y el ojo deja de mirarlo a los dos segundos; con dos ritmos que no vuelven a coincidir hasta la
  // vuelta par, el cuadro sigue teniendo algo nuevo hasta el corte.
  const gLeva = new THREE.Group()
  gLeva.position.set(0, 2.85, 0)
  gMec.add(gLeva)
  const barra = disco(0.13, ANCHO_BLOQUE * 0.94, matForja(), 18)
  gLeva.add(barra)
  for (let i = 0; i < N; i++) {
    const X = (i - (N - 1) / 2) * PASO
    // El lobulo es un disco corrido de su eje: al girar, su contorno se acerca y se aleja de la barra.
    // Esa excentricidad es todo lo que hace falta para que se lea que empuja algo, sin tener que
    // dibujar lo que empuja.
    const lobulo = disco(0.30, 0.26, matForja(), 26)
    lobulo.geometry.translate(0, 0.18, 0)
    lobulo.position.x = X
    gLeva.add(lobulo)
  }
  // Los apoyos: sin ellos el arbol flota sobre la culata y se lee como una pieza suelta que quedo ahi.
  for (const s of [-1, 1]) {
    const poste = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.62, 0.34), matBloque)
    poste.position.set(s * (ANCHO_BLOQUE / 2 - 0.28), 2.52, 0)
    gMec.add(poste)
    const sombrerete = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.26, 0.42), matBloque)
    sombrerete.position.set(s * (ANCHO_BLOQUE / 2 - 0.28), 2.90, 0)
    gMec.add(sombrerete)
  }

  // ================================================================ TIEMPO

  // LLEGA DESDE EL FONDO Y GIRANDO. Un motor que aparece parado y despues arranca pierde el primer
  // segundo entero: el espectador no sabe que esta mirando hasta que se mueve. Este entra ya en marcha
  // —el cigüeñal gira desde el cuadro cero, ver el onUpdate— y lo que hace la entrada es solo traerlo y
  // enderezarlo. La rotacion en Y arranca en 0.62 para que el primer cuadro muestre la profundidad del
  // bloque, que es lo que dice "hay tres de estos, uno detras del otro".
  gLlegada.position.set(0, -1.8, -7.0)
  gLlegada.rotation.set(-0.16, 0.62, 0)
  tl.to(gLlegada.position, { y: 0, z: 0, duration: b(1.25), ease: E.llega(1.6) }, 0)
  tl.to(gLlegada.rotation, { x: 0, y: 0, duration: b(1.45), ease: E.llega(1.4) }, 0)
  tl.fromTo(liston.material, { opacity: 0 }, { opacity: 0.9, duration: b(0.6), ease: E.frena(2), immediateRender: false }, b(0.9))

  // LAS EXPLOSIONES, una por medio beat, en el cilindro que le toca. El indice sale de la misma cuenta
  // que mueve el cigüeñal —k modulo 3—, asi que si mañana cambia VUELTAS o la cantidad de cilindros,
  // esto sigue cayendo donde tiene que caer en vez de quedar desfasado en silencio.
  //
  // Los dos primeros medios beats quedan mudos a proposito: el motor esta entrando y todavia gira lejos
  // de la camara. Un destello ahi no se lee como encendido, se lee como un parpadeo de la imagen.
  const SUBE = b(0.07)
  for (let k = 2; k < meta.beats * 2; k++) {
    const t0 = b(k / 2) - SUBE
    const f = trenes[k % N].fogonazo
    tl.to(f.material, { opacity: 0.95, duration: SUBE, ease: E.frena(2) }, t0)
    tl.to(f.material, { opacity: 0, duration: b(0.30), ease: E.acelera(2) }, t0 + SUBE)
  }

  // ---------------------------------------------------------------- lo continuo
  // TODA la cinematica en una funcion y en un solo canal. Cada propiedad de cada pieza se escribe una
  // vez por cuadro desde aca y desde ningun otro lado: no hay un tween que mueva un piston ni uno que
  // gire una biela, porque en cuanto los hubiera habria dos verdades sobre donde esta cada cosa y el
  // mecanismo dejaria de cerrar. Es la misma razon por la que el motor de verdad tiene un solo cigüeñal.
  const f1 = rnd() * 6.28, f2 = rnd() * 6.28, f3 = rnd() * 6.28
  deriva(tl, DUR, (u, t) => {
    const th = 2 * Math.PI * VUELTAS * (t / DUR)
    for (let i = 0; i < N; i++) {
      const tr = trenes[i]
      const a = th - i * (2 * Math.PI / N)
      tr.manivela.rotation.x = a
      const yBulon = alturaBulon(a)
      tr.piston.position.y = yBulon
      // Donde esta la muñequilla AHORA. Es el mismo punto que la manivela dibuja con su rotacion; se
      // recalcula en vez de leerlo de la matriz porque leer una matriz que se acaba de escribir obliga
      // a un updateWorldMatrix en el medio del recorrido, y eso es un orden de actualizacion mas para
      // que se rompa. Dos senos cuestan menos que una dependencia.
      const yMun = Y_EJE + R_MAN * Math.cos(a)
      const zMun = R_MAN * Math.sin(a)
      tr.biela.position.set(tr.X, (yBulon + yMun) / 2, zMun / 2)
      // El +Y local de la biela apunta del pie grande al pie chico. Rotando sobre X, el eje Y cae sobre
      // (0, cos, sin): el angulo es el atan2 de la diferencia, y por como se definio `alturaBulon` la
      // distancia entre las dos puntas es exactamente L_BIELA en todos los angulos. La biela no estira.
      tr.biela.rotation.x = Math.atan2(-zMun, yBulon - yMun)
    }
    gLeva.rotation.x = th / 2

    // La deriva del conjunto. Tres periodos que no son multiplos entre si: si lo fueran, los tres ejes
    // volverian a alinearse cada tanto y el motor entero cabecearia como una sola pieza, que se nota
    // mas que la quietud. El giro en Y de reposo vive ACA y no en la entrada, porque la entrada termina
    // en cero y este es el que se queda: separados, ninguno de los dos pisa al otro.
    gMec.rotation.y = 0.14 + Math.sin(t * 0.37 + f1) * 0.052
    gMec.position.x = Math.sin(t * 0.29 + f2) * 0.055
    gMec.position.y = SUBIR + Math.sin(t * 0.21 + f3) * 0.045
  })

  // ---------------------------------------------------------------- camara
  // Se acerca mientras el motor se asienta y VUELVE a su marca antes del corte. El contrato del motor no
  // admite que una escena deje la camara donde termino: la siguiente arranca contando con (0,0,distBase).
  // El recorrido es corto a proposito — 0.44 de acercamiento— porque este objeto ya ocupa 4.0 de las 5
  // unidades de semialto, y con un aire de dolly 1.55 un acercamiento largo le comeria la culata.
  tl.fromTo(camera.position, { z: dolly(distBase, 0.62) },
    { z: dolly(distBase, -0.44), duration: DUR * 0.82, ease: 'none', immediateRender: false }, 0)
  tl.to(camera.position, { z: distBase, duration: DUR * 0.18, ease: E.vaiven() }, DUR * 0.82)

  // ---------------------------------------------------------------- salida
  // SE VA HACIA EL FONDO, no hacia arriba. Un motor que se eleva se lee como que flota, que es
  // exactamente lo contrario de lo que el objeto vino a decir; alejandose acelerando se lee como que
  // pasa de largo, que es lo que hace una maquina en una linea de produccion. Y deja el cuadro limpio
  // desde el centro hacia afuera, que es por donde la escena siguiente entra.
  const SAL = DUR - b(0.85)
  tl.to(gLlegada.position, { z: -11.5, y: -0.55, duration: b(0.85), ease: E.acelera(3) }, SAL)
  tl.to(gLlegada.rotation, { x: 0.30, duration: b(0.85), ease: E.acelera(2) }, SAL)
  tl.to(liston.material, { opacity: 0, duration: b(0.5), ease: E.acelera(2) }, SAL)

  return { g, tl }
}
