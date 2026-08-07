// ESCENA "cita" — un testimonio, tratado como cita.
//
// POR QUE EXISTE
// El material estaba y no se usaba. `content.testimonials` se capturaba desde hacia tiempo y moria
// dos veces en el camino: `semantica_gratis` escribia `testimonios: []` fijo, y `anthem-datos` leia
// `pruebas` pero solo transportaba `stats`. Habia voz del cliente entrando por la puerta y saliendo
// por la ventana, y ninguna escena podia pedirla.
//
// Y ES LA UNICA ESCENA QUE HABLA CON OTRA VOZ. Todas las demas dicen lo que la marca dice de si
// misma: el claim, las features, las cifras, el CTA. Esta dice lo que dijo un tercero, y por eso su
// tratamiento tiene que SEÑALAR que el texto es de otro — de ahi la comilla enorme, la sangria y la
// firma separada por un filete. Un testimonio compuesto como un claim mas no se lee como testimonio.
//
// COMPOSICION: NO ESTA CENTRADA, A PROPOSITO
// El diagnostico que abrio este trabajo fue "toda escena es centrada". Aca el bloque se ancla al
// margen izquierdo y la comilla se sale por arriba: el peso queda arriba-izquierda y el cuadro se
// lee en diagonal hacia la firma. Es la misma pieza tipografica de siempre puesta en otro eje, que
// es exactamente la variedad que faltaba — de TIPO, no de color.
//
// LA COMILLA ES GEOMETRIA, NO UN GLIFO
// Pedirsela a la fuente es apostar a que la familia que el aire eligio tenga esa comilla dibujada, y
// una tipografia sin ese glifo devuelve un rectangulo vacio (tofu) del tamaño de media pantalla, sin
// avisar. Dos barras redondeadas e inclinadas leen como comilla en cualquier aire y no dependen de
// nadie. Ademas es coherente con un motor que se jacta de que sus objetos son geometria de verdad.
//
// SIN TESTIMONIO NO HAY ESCENA. No hay como sustituir el sujeto: una cita sin cita es un cuadro con
// comillas vacias. Se declara vacia y el guionista es quien no deberia haberla elegido.

import { LOOK, b, E, texto, nivel, nivelTexto, matAcento, materialMascara, filete, CLARO, finMascara, deriva, encaje, dolly, orbita } from '../kit.js'
import { testimonios } from '../datos.js'

export const meta = { id: 'cita', beats: 6 }

// Cuantos caracteres entran por renglon. Sale del ancho util (el bloque arranca en el margen y no
// llega al borde derecho) contra el ancho medio de un glifo de display: mas largo y la ultima linea
// se sale del cuadro, mas corto y una cita de 120 caracteres necesita seis renglones que no entran
// en seis beats.
const POR_LINEA = 26
const MAX_LINEAS = 4

// Corta por PALABRAS. Cortar por caracteres parte un apellido al medio, que es justo lo que esta
// escena no puede hacer: el texto es de otra persona y se publica como lo dijo.
function enLineas(txt, porLinea, maxLineas) {
  // UN TOKEN MAS LARGO QUE EL RENGLON SE PARTE IGUAL, y no contradice la nota de arriba: se parte solo
  // lo que mide MAS de porLinea, o sea nunca un apellido — el token mas largo de todo el material real
  // capturado (las 11 citas de los fixtures mas la de ANTHEM) mide 13 caracteres contra 26 de POR_LINEA.
  // Sin esto una URL, un mail o un handle quedan como un renglon de largo arbitrario, ese renglon gana el
  // Math.max de las proporciones que alimenta `encaje`, y la CITA ENTERA se achica para que el quepa:
  // medido sobre 1920, la misma cita cae de 107 a 63 px de cuerpo en tecnico (79 -> 46 px de glifo) y en
  // nocturno, la display mas ancha, el glifo baja a 24 px. Ninguna compuerta lo ve, porque achicar es
  // justamente como `encaje` consigue que entre: E-ENCAJE queda verde con el texto ya ilegible.
  // El flag `u` va para no partir un par sustituto y que un emoji no termine saliendo como tofu.
  const palabras = String(txt || '').split(/\s+/).filter(Boolean)
    .flatMap(p => (p.length <= porLinea ? p : p.match(new RegExp(`.{1,${porLinea}}`, 'gu'))))
  const lineas = []
  let actual = ''
  for (const p of palabras) {
    if (!actual) { actual = p; continue }
    if ((actual + ' ' + p).length <= porLinea) actual += ' ' + p
    else { lineas.push(actual); actual = p }
  }
  if (actual) lineas.push(actual)
  // Si no entra, se recorta por LINEAS enteras y la ultima cierra con puntos suspensivos: una cita
  // cortada a mitad de palabra se lee como un error de la herramienta.
  if (lineas.length > maxLineas) {
    const cortadas = lineas.slice(0, maxLineas)
    cortadas[maxLineas - 1] = cortadas[maxLineas - 1].replace(/[.,;:]$/, '') + '…'
    return cortadas
  }
  return lineas
}

export function build(ctx) {
  const { THREE, gsap, mundoW, mundoH, camera, distBase, rnd } = ctx
  const g = new THREE.Group()
  const tl = gsap.timeline({ paused: true })
  const DUR = b(meta.beats)

  // ---- el material que hay
  const todos = testimonios()
  if (!todos.length) {
    tl.to({}, { duration: DUR }, 0)
    return { g, tl, vacia: true }
  }
  // Con varios testimonios se elige UNO por semilla: dos piezas de la misma pagina citan a personas
  // distintas, que es variedad real y gratis. Mostrar los tres juntos seria una grilla de citas, y
  // una cita que comparte cuadro con otras dos deja de ser una cita.
  const elegido = todos[Math.floor(rnd() * todos.length) % todos.length]
  const lineas = enLineas(elegido.texto, POR_LINEA, MAX_LINEAS)
  const firmaTxt = String(elegido.firma || '').trim()

  // ---- geometria del cuadro
  const MARGEN = -mundoW * 0.40                     // el bloque se ancla al margen izquierdo
  const TOPE = mundoH * 0.14                        // donde arranca la primera linea
  const FUENTE_CITA = { fuente: 'Anton', peso: 400, size: 150, tracking: 0.005, upper: true, alineado: 'left' }

  // AJUSTE AL CUADRO: SE MIDE, NO SE ADIVINA.
  // La primera version fijaba los caracteres por renglon a ojo, y en el render real de basecamp.com
  // las cuatro lineas se salian por la derecha ("INFORMATION FLOWS LIKE WAT..."): el ancho de un
  // renglon no lo decide la cantidad de letras sino la FUENTE que eligio el aire y su tracking, y
  // las dos cambian por pieza. Se miden todas las lineas y, si la mas ancha no entra, se achica el
  // BLOQUE ENTERO por igual — achicar solo la que sobra rompe la escala tipografica y se nota.
  // Y ojo con que compuerta te cuida: `encuadre-check` verifica INTERSECCION con el frustum, no
  // contencion, asi que un texto que sale medio cuadro por la derecha le parece perfectamente
  // visible. La que si lo caza es E-ENCAJE, y solo porque estas mallas se declaran con
  // `userData.encaja = true` — sin esa marca nadie mira si el renglon entero entro.
  const ANCHO_UTIL = mundoW * 0.86
  const texs = lineas.map(l => texto(l, FUENTE_CITA))
  const ALTO_BASE = mundoH * 0.072
  const ALTO_LINEA = encaje(ALTO_BASE, Math.max(...texs.map(t => t.ar)), ANCHO_UTIL)
  const PASO = ALTO_LINEA * 1.30

  // CONTRASTE POR MUNDO. El tope de 0.80 existe por el BLOOM: en un mundo oscuro la tipografia de
  // display que pasa el umbral (0.62) florece entera y sale como un ladrillo sin contraformas. En un
  // mundo CLARO esa restriccion no aplica —ahi el riesgo es el opuesto, un gris que se lava contra el
  // fondo— asi que se empuja hacia la tinta. Medido en basecamp.com, que da mundo claro: con 0.80 la
  // cita competia de igual a igual con el degrade celeste del fondo y se leia a medias.
  const COLOR_CITA = nivel(CLARO ? 0.94 : 0.80)

  // ---- la comilla: dos barras inclinadas, en acento
  // Va por DETRAS del texto y sangrada hacia arriba-izquierda: es un signo de puntuacion gigante, no
  // un objeto en la escena. Si compitiera con el texto en peso, el ojo leeria la comilla primero.
  const comilla = new THREE.Group()
  for (let i = 0; i < 2; i++) {
    const barra = new THREE.Mesh(
      new THREE.PlaneGeometry(mundoW * 0.052, mundoH * 0.115),
      matAcento(LOOK.acento, 1.15),
    )
    barra.material.transparent = true
    barra.position.set(i * mundoW * 0.085, 0, 0)
    barra.rotation.z = -0.20                        // inclinadas: una barra recta es una barra
    comilla.add(barra)
  }
  comilla.position.set(MARGEN + mundoW * 0.02, TOPE + mundoH * 0.135, -0.05)
  g.add(comilla)

  // ---- las lineas de la cita, reveladas por mascara
  // Mascara y no fundido: un fundido de texto es lo que hace una presentacion; un barrido es lo que
  // hace un reel. Y ademas la cita se "escribe", que es lo que uno espera de algo que alguien dijo.
  const meshes = []
  for (let i = 0; i < lineas.length; i++) {
    const t = texs[i]
    // nivel() y NUNCA LOOK.tinta: la tinta pura queda por encima del umbral del bloom y la display
    // sale reventada de blanco, sin contraformas. Ademas nivel() se da vuelta solo segun el mundo.
    const mat = materialMascara(t.tex, COLOR_CITA)
    // DECLARADO PARA QUE E-ENCAJE-REAL LO CUIDE. La contencion en este motor es declarativa: la regla
    // que exige que una malla entre ENTERA solo corre sobre las que lo piden, y eran 16 de 799.
    // Medido sobre las 407 construcciones (11 aires x 8 juegos de datos reales) esta malla entra
    // siempre y con margen —el peor caso llega a 0.807 del semicuadro— asi que declararlo no cambia nada
    // hoy y convierte en FALLO cualquier cambio futuro que la saque del cuadro.
    const m = new THREE.Mesh(new THREE.PlaneGeometry(ALTO_LINEA * t.ar, ALTO_LINEA), mat)
    m.userData.encaja = true
    // Anclada por su borde IZQUIERDO: centrada, cada linea arrancaria en un x distinto segun su
    // largo y el bloque dejaria de tener un margen.
    m.position.set(MARGEN + (ALTO_LINEA * t.ar) / 2, TOPE - i * PASO, 0)
    m.userData.encaja = true       // una cita cortada por el borde es una cita mal citada
    g.add(m)
    meshes.push({ m, mat })
  }

  // ---- la firma: filete + nombre
  // Puede no existir: hay paginas que publican la cita sin decir quien la dijo, y en ese caso NO se
  // crea nada. Un tween contra un objeto que no se construyo es un aviso de GSAP —que la compuerta
  // grande convierte en FAIL— y un hueco en el video. Nunca se rellena con un generico: ver la nota
  // en tools/testimonios-check.py.
  const yFirma = TOPE - lineas.length * PASO - mundoH * 0.045
  const raya = filete(mundoW * 0.16, mundoH * 0.0075, LOOK.acento2)
  raya.position.set(MARGEN + mundoW * 0.08, yFirma, 0)
  raya.scale.x = 0.001
  g.add(raya)

  let firmaMat = null, firmaMesh = null
  if (firmaTxt) {
    const tf = texto(firmaTxt, { fuente: 'DMSans', peso: 500, size: 90, tracking: 0.16, upper: true, alineado: 'left' })
    const ALTO_F = mundoH * 0.026
    firmaMat = materialMascara(tf.tex, nivelTexto(0.58))
    firmaMesh = new THREE.Mesh(new THREE.PlaneGeometry(ALTO_F * tf.ar, ALTO_F), firmaMat)
    // Es la firma de la cita: texto que hay que poder LEER, asi que entra entera. Estaba sin declarar
    // y era invisible para el censo, que buscaba `material.map` y esto lleva `materialMascara`.
    firmaMesh.userData.encaja = true
    firmaMesh.position.set(MARGEN + (ALTO_F * tf.ar) / 2, yFirma - mundoH * 0.032, 0)
    g.add(firmaMesh)
  }

  // ================================================================ TIEMPO
  // DERIVA CONTINUA DEL BLOQUE. La compuerta exige que nada quede quieto mas de un beat, y lo mide
  // sobre matrixWorld: mover la camara no alcanza, porque los objetos no se enteran. Un tween sobre
  // un reloj con las propiedades escritas a mano es la version segura — `modifiers` de GSAP no corre
  // si la propiedad no esta tambien en vars, y esa trampa ya costo cuatro heroes que nunca flotaron.
  deriva(tl, DUR, u => {
    g.position.x = Math.sin(u * Math.PI * 1.1) * mundoW * 0.012
    g.position.y = -u * mundoH * 0.018                    // el bloque sube apenas: la cita "se asienta"
    comilla.rotation.z = Math.sin(u * Math.PI * 2.0) * 0.02
  })

  // ---- la comilla entra primero, y de golpe
  tl.fromTo(comilla.scale, { x: 0.2, y: 0.2 }, { x: 1, y: 1, duration: b(0.55), ease: E.llega(2.6), immediateRender: false }, 0)
  for (const barra of comilla.children) {
    tl.fromTo(barra.material, { opacity: 0 }, { opacity: 1, duration: b(0.35), ease: E.frena(2), immediateRender: false }, 0)
  }

  // ---- una linea por beat: son los EVENTOS DUROS de la escena
  // La metrica de movimiento cuenta pixeles que cruzan un umbral de luma entre cuadros, y lo que la
  // mueve son eventos, no deriva. Cuatro lineas que se escriben en cuatro beats son cuatro eventos.
  // EL REVELADO TERMINA EN 1.06 Y NO EN 1, y esto se ve en el video, no en el codigo.
  // La mascara calcula `smoothstep(uProg, uProg - uSuave, e)`: con uProg=1 el borde de la banda cae
  // EXACTAMENTE en e=1, asi que la franja final del plano —donde vive la ultima letra de cada
  // renglon— se queda a mitad de camino. Medido mirando el render de basecamp.com a resolucion
  // real: "INFORMATION FLOWS LIKE" mostraba la E lavada, y "NO MORE…" los puntos. Llevando uProg un
  // uSuave mas alla, la banda suave sale del plano y la linea queda entera.
  const FIN = finMascara()                          // 1 + uSuave: ver la nota en kit.js
  const T0 = b(0.45)
  const PASO_BEAT = b(0.85)
  meshes.forEach((x, i) => {
    tl.fromTo(x.mat.uniforms.uProg, { value: 0 }, { value: FIN, duration: b(0.62), ease: E.frena(2), immediateRender: false }, T0 + i * PASO_BEAT)
  })

  // ---- la firma llega despues de la ultima linea, nunca encima
  const TF = T0 + meshes.length * PASO_BEAT + b(0.15)
  tl.fromTo(raya.scale, { x: 0.001 }, { x: 1, duration: b(0.42), ease: E.frena(3), immediateRender: false }, TF)
  if (firmaMat) {
    tl.fromTo(firmaMat.uniforms.uProg, { value: 0 }, { value: FIN, duration: b(0.5), ease: E.frena(2), immediateRender: false }, TF + b(0.18))
  }

  // ---- salida: el bloque se apaga por donde entro
  const SALIDA = DUR - b(0.45)
  meshes.forEach((x, i) => {
    tl.to(x.mat.uniforms.uProg, { value: 0, duration: b(0.34), ease: E.acelera(2) }, SALIDA + i * b(0.03))
  })
  if (firmaMat) tl.to(firmaMat.uniforms.uProg, { value: 0, duration: b(0.3), ease: E.acelera(2) }, SALIDA)
  tl.to(raya.scale, { x: 0.001, duration: b(0.3), ease: E.acelera(3) }, SALIDA)
  tl.to(comilla.scale, { x: 0.2, y: 0.2, duration: b(0.34), ease: E.acelera(2) }, SALIDA)

  // ---- camara: un acercamiento lento que se devuelve
  // Devolverla es CONTRATO: la escena siguiente arranca desde (0,0,distBase) y si esta la deja
  // corrida, el corte se lee como un salto. El `set` del final es el seguro: si algun tween quedara
  // a mitad por un ajuste de tempo, igual se entrega la camara donde corresponde.
  // CAMARA QUE SE ASIENTA. Una cita pide que la LEAS, y una camara que viaja mientras hay tres renglones
  // en pantalla compite con la lectura. Se acerca en el primer tercio y despues QUEDA QUIETA en z: el
  // unico movimiento que sigue es una inclinacion minima que se resuelve, que es lo que hace una cabeza
  // al empezar a leer. Las seis escenas nuevas hacian todas el mismo acercamiento con vaiven lateral.
  tl.fromTo(camera.position, { z: dolly(distBase, 0.30) }, { z: distBase, duration: DUR * 0.34, ease: E.frena(3), immediateRender: false }, 0)
  tl.fromTo(camera.rotation, { z: orbita(0.011) }, { z: 0, duration: DUR * 0.55, ease: E.frena(2), immediateRender: false }, 0)
  tl.set(camera.position, { x: 0, y: 0, z: distBase }, DUR - 0.001)

  return { g, tl }
}
