// ESCENA "marquesina" — dos tiras HORIZONTALES de texto que corren en sentidos opuestos.
//
// POR QUE EXISTE
// El catalogo entero se mueve en VERTICAL o en Z. Es logico —el cuadro es 9:16 y el eje largo es el
// alto— y por eso mismo el eje horizontal quedo libre: no hay una sola escena que lo use como gesto
// principal. Una marquesina lo toma entero, y con dos tiras cruzadas produce algo que ninguna otra
// escena da: dos velocidades opuestas en el mismo cuadro, que es la lectura mas barata de PROFUNDIDAD
// que existe sin mover la camara.
//
// Y ES LA UNICA QUE PUEDE REPETIR SU TEXTO SIN MENTIR. Una marquesina de aeropuerto repite: eso es lo
// que es. Las frases dan la vuelta porque la tira es un bucle, no porque falte material — igual que el
// feed de `columna`, y con el mismo limite: no aparece ni una palabra que la pagina no haya escrito.
//
// EL MOVIMIENTO VA A PASOS, como todo lo que lleva texto en este motor. Una tira que corre continua a
// la velocidad que hace falta para leerse como marquesina deja cada glifo escrito dos veces por el
// obturador (la cuenta esta arriba de `escalera`, en el kit). A saltos de una ranura, con pausa, cada
// reposo es un cuadro nitido — y ademas cae en el beat, que una deriva no puede hacer.
//
// SIN DOS FRASES NO HAY MARQUESINA. Con una, las dos tiras dicen lo mismo y el cruce no compara nada.

import { LOOK, b, E, texto, nivel, nivelTexto, tintaSobre, hex, matAcento, materialMascara, CLARO, finMascara, deriva, escalera, deslizFijo, encaje, dolly, orbita } from '../kit.js'
import { repartirFrases, marca } from '../datos.js'

export const meta = { id: 'marquesina', beats: 6 }

const MIN_FRASES = 2

export function build(ctx) {
  const { THREE, gsap, mundoW, mundoH, camera, distBase, rnd } = ctx
  const g = new THREE.Group()
  const tl = gsap.timeline({ paused: true })
  const DUR = b(meta.beats)

  // ---- el material que hay
  // Del mostrador, aplanado a un renglon: una tira horizontal no tiene alto para dos.
  const frases = repartirFrases(3).map(f => String(f).replace(/\n/g, ' ').trim()).filter(Boolean)
  if (frases.length < MIN_FRASES) {
    tl.to({}, { duration: DUR }, 0)
    return { g, tl, vacia: true }
  }

  // ---- geometria de las dos tiras
  const ALTO_TIRA = mundoH * 0.135
  const SEP = mundoH * 0.085                     // el hueco entre las dos, donde vive el filete
  // EL COLOR DE LA CINTA SE ELIGE CONTRA SU BANDA, NO CONTRA EL FONDO. Cada tira se dibuja sobre una
  // cama de color —arriba el acento, abajo un nivel— y el texto iba con `nivel(CLARO ? 0.92 : 0.86)`,
  // elegido contra el FONDO DEL MUNDO, que no es lo que hay detras de las letras. En mundo claro eso
  // daba texto 0.92 sobre cama 0.88: cuatro centesimas de la misma rampa. Medido sobre los 7
  // pagemodels x los 11 aires, 55 de 77 combinaciones por debajo del piso EN CADA CINTA, la peor a
  // 1.05:1 — y visible en el cuadro 410 de basecamp, donde la frase de la cinta gris no se lee.
  // Las camas se declaran aca arriba para que el color del texto pueda mirarlas; se dibujan mas abajo.
  // La intensidad va en UNA constante: la usa el material de la cama y la usa el calculo del color del
  // texto, y dos copias del mismo 0.55 es como el texto se despega de su fondo sin que nadie se entere.
  const INT_CAMA = 0.55
  const CAMA_ARRIBA = '#' + hex(LOOK.acento).multiplyScalar(INT_CAMA).getHexString()
  const CAMA_ABAJO = nivel(CLARO ? 0.88 : 0.10)

  // UNA MALLA POR FRASE, Y NO UNA CADENA GIGANTE. La primera version armaba las frases en UN texto y
  // salia un plano de 17.86 unidades de ancho en un cuadro de 5.63 — la compuerta de encuadre lo caza y
  // tiene razon: una pieza cuatro veces el cuadro no se puede auditar ni encuadrar. Ademas obligaba a
  // que la textura fuera enorme para que cada glifo siguiera teniendo pixeles.
  //
  // Por frase, cada malla mide como mucho el ancho util y la tira es la SUMA. Y de paso el paso del
  // bucle deja de ser un numero: es el centro de cada frase, asi que cada reposo centra una frase
  // exacta en el cuadro en vez de dejarla donde caiga.
  //
  // EL SEPARADOR ES UN ROMBO DE GEOMETRIA, no un glifo. Escrito como texto, la compuerta de procedencia
  // lo acusa —y tiene razon: es un caracter que la pagina nunca escribio—. Como malla es lo que
  // realmente es, un ornamento tipografico, y ademas se puede teñir con el acento del aire.
  const GAP = mundoW * 0.13
  const tiras = []
  for (let i = 0; i < 2; i++) {
    const arriba = i === 0
    // Cada tira ordena las frases distinto: cruzadas, las dos nunca muestran la misma palabra a la
    // misma altura del cuadro, que es lo que delataria que son la misma cinta.
    const orden = arriba ? frases : frases.slice().reverse()

    const grupo = new THREE.Group()
    const alto = ALTO_TIRA * 0.52
    const ANCHO_UTIL = mundoW * 0.92
    let x = 0
    const centros = []
    // Se rasterizan TODAS antes de dibujar ninguna, porque el cuerpo de la cinta depende de la frase
    // mas larga y eso no se puede saber a mitad del bucle. `texto()` cachea, asi que no cuesta doble.
    const OPT = {
      fuente: arriba ? 'Anton' : 'DMSans',
      peso: arriba ? 400 : 700,
      size: 150, tracking: 0.02, upper: true, alineado: 'center',
      color: tintaSobre(arriba ? CAMA_ARRIBA : CAMA_ABAJO, CLARO ? 0.92 : 0.86),
    }
    const tex_ = orden.map(f => texto(f, OPT))
    const ALTO_CINTA = encaje(alto, Math.max(...tex_.map(t => t.ar)), ANCHO_UTIL)
    for (const [iF, f] of orden.entries()) {
      const t = tex_[iF]
      // UN SOLO CUERPO PARA TODA LA CINTA. Esto aplicaba `encaje` FRASE POR FRASE, asi que cada una
      // salia de un tamano distinto: medido en una sola cinta, 'Precios' a 135 px y 'Todo lo que
      // necesitas para vender online sin comisiones' a 55 px — dos veces y media de diferencia
      // desfilando una atras de la otra. Una marquesina es UNA tira de texto, no una coleccion de
      // carteles: el cuerpo desparejo la lee como cinco cosas distintas pegadas.
      //
      // Se toma el ar MAS GRANDE de la cinta (la frase mas larga) y ese fija el cuerpo de todas. Es la
      // misma regla que ya usan `lista` y `cita`, y el efecto es que la frase larga manda: preferible a
      // que la corta grite. Sigue sin recortarse texto, que es lo que la linea original protegia.
      const a = ALTO_CINTA
      const w = a * t.ar
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(w, a),
        new THREE.MeshBasicMaterial({ map: t.tex, transparent: true, depthWrite: false, toneMapped: false }))
      // SANGRA, Y ES EL CASO MAS CLARO DE TODO EL CATALOGO. La cinta es un BUCLE: en cualquier
      // instante la mayoria de sus frases esta fuera del cuadro, que es literalmente lo que hace que
      // se lea como marquesina. Exigirle contencion seria exigirle que deje de ser una marquesina.
      // Queda declarado y no supuesto — antes esta malla simplemente no decia nada, que es
      // indistinguible de "nadie lo penso". Ya costo una vez: se acuso 34 veces la legibilidad de
      // texto que nadie ve, justo aca, por medir frases que no intersectan el cuadro.
      m.userData.sangra = true
      m.userData.tipoImagen = 'texto'
      m.position.set(x + w / 2, 0, 0)
      grupo.add(m)
      centros.push(x + w / 2)
      x += w + GAP

      // El rombo: un cuadrado a 45 grados en el hueco entre frase y frase.
      const rombo = new THREE.Mesh(
        new THREE.PlaneGeometry(ALTO_TIRA * 0.16, ALTO_TIRA * 0.16),
        matAcento(arriba ? LOOK.acento2 : LOOK.acento, 1.3))
      rombo.rotation.z = Math.PI / 4
      rombo.position.set(x - GAP / 2, 0, 0)
      grupo.add(rombo)
    }
    const LARGO = x

    // LA SEGUNDA COPIA es lo que hace que el bucle no tenga costura: cuando la primera sale por un
    // borde, la segunda ya ocupa su lugar. Con una sola habria que teletransportarla, y el salto se ve
    // exactamente en el cuadro en que ocurre.
    // TRES TRAMOS Y NINGUNA PIEZA DE MAS. Con dos copias el bucle se descubre en un extremo: puestas en
    // 0 y +largo el cuadro queda vacio por la izquierda al arrancar, y en 0 y -largo queda vacio por la
    // derecha al cerrar. Hace falta material a los DOS lados.
    //
    // Pero clonar la tira entera dos veces enciende piezas que nunca llegan al cuadro, y eso la compuerta
    // E-ENCUADRE-NUNCA lo reporta con razon: es trabajo por cuadro que no se ve. La tira se desplaza como
    // mucho un largo, asi que de la copia de la izquierda solo puede entrar su COLA y de la de la derecha
    // solo su CABEZA — medio cuadro de cada una. Se clona exactamente eso.
    const BORDE = mundoW * 0.5
    const cola = new THREE.Group()          // el final de la tira, puesto ANTES
    const cabeza = new THREE.Group()        // el principio de la tira, puesto DESPUES
    for (const hijo of grupo.children) {
      if (hijo.position.x >= LARGO - BORDE) cola.add(hijo.clone())
      if (hijo.position.x <= BORDE) cabeza.add(hijo.clone())
    }
    cola.position.x = -LARGO
    cabeza.position.x = LARGO
    // DECLARADO como relleno de banda continua: estas dos repeticiones solo asoman en la costura del
    // bucle, y esa es su unica funcion. Sin la declaracion, encuadre-check las acusa de animarse sin
    // verse — la descripcion es correcta y el veredicto no. Ver la nota en tools/encuadre-check.mjs.
    cola.userData.relleno = true
    cabeza.userData.relleno = true
    const cinta = new THREE.Group()
    cinta.add(grupo, cola, cabeza)
    cinta.position.y = arriba ? SEP / 2 + ALTO_TIRA / 2 : -SEP / 2 - ALTO_TIRA / 2
    g.add(cinta)

    // La cama de la tira: una banda que la separa del fondo. La de arriba lleva el acento y la de abajo
    // el nivel bajo, igual que `partida` — es lo que hace que se lean como DOS cintas y no como una
    // banda partida por una linea.
    const cama = new THREE.Mesh(
      new THREE.PlaneGeometry(mundoW * 1.3, ALTO_TIRA),
      arriba ? matAcento(LOOK.acento, INT_CAMA) : new THREE.MeshBasicMaterial({ color: CAMA_ABAJO, toneMapped: false }),
    )
    cama.position.set(0, cinta.position.y, -0.15)
    cama.scale.x = 0.001
    g.add(cama)

    tiras.push({ cinta, cama, cola, cabeza, largo: LARGO, centros, dir: arriba ? -1 : 1 })
  }

  // ---- el filete que corre por el hueco entre las dos tiras
  const filete = new THREE.Mesh(new THREE.PlaneGeometry(mundoW * 1.3, 0.02), matAcento(LOOK.acento2, 1.35))
  filete.position.set(0, 0, 0.3)
  filete.scale.x = 0.001
  g.add(filete)

  // ---- el rotulo de la escena, arriba: solo numeros, asi que no afirma nada del negocio
  const rot = texto(marca(1, meta.beats), { fuente: 'DMSans', peso: 500, size: 90, tracking: 0.3 })
  const matRot = materialMascara(rot.tex, nivelTexto(0.55))
  const ALTO_ROT = 0.24
  const mRot = new THREE.Mesh(new THREE.PlaneGeometry(ALTO_ROT * rot.ar, ALTO_ROT), matRot)
  // El rotulo entra entero: es texto, y ademas corto y de ancho acotado (solo numeros, como dice la
  // linea de arriba). Estaba sin declarar porque el censo no veia `materialMascara`.
  mRot.userData.encaja = true
  mRot.position.set(-mundoW * 0.5 + 0.22 + (ALTO_ROT * rot.ar) / 2, mundoH * 0.30, 0.4)
  g.add(mRot)

  // ================================================================ TIEMPO
  // UNA RANURA POR BEAT, a saltos. La ranura es la distancia entre dos separadores, o sea "una frase":
  // en cada reposo el ojo tiene una frase entera centrada y quieta. Se calcula sobre el ancho real de la
  // cadena y no sobre un numero elegido a mano, asi que sigue valiendo con dos frases o con cinco.
  // UN PELDAÑO POR FRASE, no por beat. Con seis peldaños y siete frases el recorrido no completaba una
  // vuelta y las ultimas nunca llegaban al cuadro — la compuerta E-ENCUADRE-NUNCA lo caza como una malla
  // encendida que nadie ve, y es la descripcion exacta. Con un peldaño por frase la vuelta cierra
  // siempre, cada frase pasa centrada una vez y —como el mostrador entrega dos o tres— cada tramo dura
  // dos o tres beats enteros, o sea que sigue cayendo en la grilla.
  const PASOS = frases.length
  // EL DESLIZ DE ESTA ESCENA ES MAS CORTO QUE EL DEL RESTO, y la cuenta obliga.
  //
  // Un peldaño de aca mueve UNA FRASE ENTERA —unos 900 px de pantalla—, contra los 42 px del scroll del
  // telefono o los 450 de la mesa. Con los 0.18 s que usa todo el motor eso da 5000 px/s, y a esa
  // velocidad las dos submuestras del obturador caen a 47 px una de otra: no es un borron, son dos
  // copias legibles del mismo texto encimadas. Se ve exacto en el render de nocturno.
  //
  // Con una distancia asi no hay duracion que evite el fantasma: para bajar la separacion a 4 px haria
  // falta un desliz de dos segundos, mas largo que el peldaño entero. Lo que SI se puede elegir es
  // cuantos cuadros dura: a 0.10 s el transito ocupa tres cuadros y a esa velocidad deja de leerse como
  // dos textos y pasa a leerse como una estela — que es lo que corresponde ver cuando algo cruza. Los
  // otros 27 cuadros de cada peldaño siguen perfectamente quietos, que es donde se lee.
  const DESLIZ = deslizFijo(DUR, PASOS, 0.10)
  deriva(tl, DUR, (u) => {
    const e = escalera(u, PASOS, DESLIZ)
    for (const t of tiras) {
      // El recorrido de un paso es UNA frase, y las frases no miden lo mismo: el destino de cada peldaño
      // es el CENTRO de la frase que toca, no una fraccion del largo. Asi cada reposo deja una frase
      // centrada en el cuadro — que es la unica razon por la que la escena se detiene.
      const n = t.centros.length
      // LA TIRA DE ABAJO ARRANCA MEDIO SLOT CORRIDA. Con las dos en fase, y con dos o tres frases, las
      // dos cintas terminan mostrando LA MISMA frase centrada al mismo tiempo — se vio en el render de
      // nocturno, con "Make product operations self-driving" repetido arriba y abajo. Media ranura de
      // desfase las cruza siempre, que es la unica razon por la que son dos.
      const idx = e * PASOS + (t.dir > 0 ? 0.5 : 0)
      const k = Math.min(n - 1, Math.floor(idx) % n)
      const k2 = (k + 1) % n
      const f = Math.min(1, Math.max(0, idx - Math.floor(idx)))
      const c0 = t.centros[k]
      // Al dar la vuelta, el centro siguiente esta en la SEGUNDA copia: se le suma el largo entero.
      const c1 = k2 > k ? t.centros[k2] : t.centros[k2] + t.largo
      const vueltas = Math.floor(idx / n) * t.largo
      const centro = vueltas + c0 + (c1 - c0) * f
      // LA ENVOLTURA VA EN (-largo, 0], y no en [0, largo). Con la version anterior la cinta se corria
      // hacia la DERECHA y las dos copias terminaban las dos fuera del cuadro por ese lado: la compuerta
      // E-ENCUADRE-NUNCA lo dijo exacto —"seis piezas encendidas el 100% de la escena que no entran en
      // el cuadro en ningun momento"—. Con la copia 1 en [pos, pos+largo] y la copia 2 en
      // [pos+largo, pos+2*largo] y pos siempre negativo, el cuadro queda cubierto por construccion.
      //
      // El sentido se expresa negando el recorrido, no la posicion: asi las dos tiras usan la misma
      // envoltura y no hay un caso raro que revisar.
      const rec = t.dir < 0 ? centro : -centro
      const w = ((rec % t.largo) + t.largo) % t.largo
      t.cinta.position.x = -w
      // LOS TRAMOS DE COSTURA SE APAGAN CUANDO NO HACEN FALTA. Encendidos toda la escena, la compuerta
      // E-ENCUADRE-CASI reporta —con razon— dos piezas que solo entran en el 2% de los cuadros: eso es
      // trabajo por cuadro que casi nunca se ve. La cola sirve mientras la tira esta poco corrida y la
      // cabeza cuando esta por dar la vuelta; fuera de esos tramos no aportan un pixel.
      // La ventana es MEDIO cuadro y no uno entero, que es lo que de verdad puede entrar: la cola ocupa
      // world [-BORDE-w, -w] y solo asoma mientras w < mundoW/2; la cabeza, world [largo-w, ...], solo
      // mientras w > largo - mundoW/2. Con la ventana al doble estaban encendidas el 35% de la escena
      // para servir el 6%.
      const VENT = mundoW * 0.55
      t.cola.visible = w < VENT
      t.cabeza.visible = w > t.largo - VENT
    }
    // El cuadro entero respira un pelo en vertical: sin esto, entre salto y salto no se mueve nada.
    g.position.y = Math.sin(u * Math.PI * 1.4) * mundoH * 0.006
  })

  // ---- las camas entran primero: establecen las dos bandas antes de que llegue el texto
  tiras.forEach((t, i) => {
    tl.fromTo(t.cama.scale, { x: 0.001 }, { x: 1, duration: b(0.55), ease: E.frena(3), immediateRender: false }, i * b(0.14))
  })
  tl.fromTo(filete.scale, { x: 0.001 }, { x: 1, duration: b(0.45), ease: E.frena(4), immediateRender: false }, b(0.40))
  tl.fromTo(matRot.uniforms.uProg, { value: 0 }, { value: finMascara(), duration: b(0.40), ease: E.frena(2), immediateRender: false }, b(0.55))

  // ---- el golpe del beat: el filete engorda y las camas se separan un instante
  for (const bt of [2, 3, 4, 5]) {
    tl.to(filete.scale, { y: 2.6, duration: b(0.10), ease: E.acelera(2) }, b(bt))
    tl.to(filete.scale, { y: 1, duration: b(0.38), ease: E.frena(3) }, b(bt) + b(0.10))
  }

  // ---- salida: las dos camas se recogen hacia sus bordes y el filete se apaga
  const SAL = DUR - b(0.45)
  tiras.forEach((t, i) => {
    tl.to(t.cama.scale, { x: 0.001, duration: b(0.38), ease: E.acelera(3) }, SAL + i * b(0.05))
  })
  tl.to(filete.scale, { x: 0.001, duration: b(0.32), ease: E.acelera(3) }, SAL)
  tl.to(matRot.uniforms.uProg, { value: 0, duration: b(0.30), ease: E.acelera(2) }, SAL)

  // ---- camara: un empuje corto que se devuelve. Devolverla es CONTRATO.
  tl.fromTo(camera.position, { z: dolly(distBase, 0.45) }, { z: dolly(distBase, -0.22), duration: DUR * 0.80, ease: 'none', immediateRender: false }, 0)
  tl.to(camera.position, { z: distBase, duration: DUR * 0.20, ease: E.vaiven() }, DUR * 0.80)
  tl.fromTo(camera.position, { x: orbita(0.10) }, { x: orbita(-0.08), duration: DUR * 0.60, ease: E.vaiven(), immediateRender: false }, 0)
  tl.to(camera.position, { x: 0, duration: DUR * 0.40, ease: E.vaiven() }, DUR * 0.60)

  void rnd
  return { g, tl }
}
