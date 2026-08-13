// PLANTILLA "duna" — un desierto de dunas hasta el horizonte, con la camara volando bajo y siguiendo
// el relieve.
//
// EL GESTO
// Todo el resto de la boveda pone objetos en un espacio vacio. Aca el espacio ES el objeto: no hay
// columnas, ni cajones, ni prismas — hay un terreno, y lo unico que se agrega encima es el texto. Es la
// plantilla mas quieta del catalogo y la que menos compite con lo que dice.
//
// LO QUE LA SEPARA DE `marea`, que tambien es una superficie que ondula:
//
//   `marea`  la superficie es LIQUIDA: refleja, es oscura, y la camara la rasa a altura constante. El
//            movimiento esta en el agua.
//   `duna`   la superficie es SOLIDA: mate, clara, y la camara SUBE Y BAJA con ella. El movimiento
//            esta en la camara, y el terreno esta quieto.
//
// La diferencia se nota en una sola cuenta: aca la altura del ojo sale de la misma funcion que dibuja
// el relieve, asi que la camara nunca atraviesa una cresta ni se despega del suelo.
//
// LA REGLA QUE ORDENA ESTE ARCHIVO: UNA SOLA FUNCION DE RELIEVE.
//
// `duna(x, z)` la usan los ~7000 vertices de la malla, la altura a la que vuela la camara, y la altura
// a la que se apoya cada bloque de texto. Escribirla dos veces —una para el terreno y otra "parecida"
// para los bloques— es como el texto queda flotando medio metro sobre la arena que se ve, y no hay
// compuerta que cace eso: las dos cuentas son correctas por separado. Es la misma leccion que `marea`
// documenta con su `ola`.
//
// LOS SEIS TIEMPOS (beats sobre 40)
//   0   ESPACIO   el desierto solo, la camara subiendo y bajando con las crestas. Nada de texto.
//   6   MARCA     el nombre se planta sobre la cresta que la camara esta por coronar.
//   13  PROMESA   el claim baja al valle: la camara lo lee desde arriba mientras desciende.
//   19  PRUEBA    la pagina se levanta de la arena como una lamina clavada en la cresta.
//   27  RAZONES   las cifras se apoyan en crestas alternas, a un lado y al otro del rumbo.
//   34  PEDIDO    la camara sube por encima del relieve y el CTA queda contra el cielo limpio.

import { THREE, metal, mate, luz, barra, iluminar, domo, polvo } from '../nucleo.js'
import { entra, sale, respirar, juntar, anchoADistancia } from '../movimiento.js'
import { bloqueMarca, bloquePromesa, bloquePrueba, bloquesCifra, bloquesFrase, bloquePedido } from '../bloques.js'
import { colorDePeso, grisDePeso } from '../recetas.js'
import { LOOK, nivel, E, b } from '../../demo/kit.js'

export const meta = {
  id: 'duna',
  nombre: 'Duna',
  familia: 'atmosfera',
  necesita: ['nada'],
  beats: 40,
  tiempos: { espacio: 0, marca: 6, promesa: 13, prueba: 19, razones: 27, pedido: 34 },
  pitch: 'Un desierto de dunas y la cámara volando bajo, subiendo y bajando con el relieve. De viaje, moda y cosmética.',
}

export function build(ctx) {
  const { escena, pagina, camara, tl, mundoW, mundoH, distBase } = ctx
  const uso = {}
  const respiraciones = []

  // ---------------------------------------------------------------- LO QUE LA PAGINA DECIDE
  const R = ctx.recetas || { velocidad: 1, capas: 3, dureza: 0.75, margen: 0.88, cifras: 3, frases: 2,
    acentoMasa: false, vacio: 0.5, movimientos: 4, paleta: [], medido: false }
  uso.retrato = !!R.medido

  // Key alta y relleno bajo: una duna es una superficie casi horizontal, o sea que casi toda su luz
  // viene de arriba. Con el relleno alto se le llena la sombra y las crestas dejan de leerse.
  iluminar(escena, { key: 1.30, relleno: 0.45 })
  const uDomo = domo(escena, { fuerza: 0.30 })
  const motas = polvo(escena, 800, 24)
  // EL CONTRALUZ, que es lo que dibuja una duna. Viene desde el fondo y desde muy abajo del horizonte,
  // asi que solo alcanza las caras que miran hacia adelante — las crestas— y deja en sombra las que
  // miran a la camara. Sin el, un terreno mate iluminado desde arriba es una superficie de un solo
  // valor por mas relieve que tenga: el ojo no tiene con que separar una cresta de la siguiente.
  //
  // 0.95 y no 2.6: con 2.6 la cara iluminada satura a blanco puro y la duna deja de ser una duna para
  // ser un reflejo. El contraluz tiene que SEPARAR la cresta del fondo, no reemplazarla — y el motor no
  // tiene mapeo de tonos (`NoToneMapping`), o sea que todo lo que pasa de 1.0 se recorta de golpe en
  // vez de comprimirse. Aca es mas facil quemar que en un render con filmico.
  const contra = new THREE.DirectionalLight(0xffffff, 1.75)
  contra.position.set(0.6, 1.4, -14)
  escena.add(contra)

  // ---------------------------------------------------------------- el relieve, primero que todo
  //
  // Tres senos de periodos que no son multiplos entre si. No es un detalle de gusto: con periodos
  // conmensurables el terreno vuelve a repetirse cada tantos metros y el ojo lo detecta como un mosaico
  // — que es exactamente lo que un desierto no es.
  //
  // LA AMPLITUD SALE DEL AIRE DE LA PAGINA. Un sitio denso recibe un relieve movido y uno aireado, una
  // llanura casi lisa: es la misma decision que toma un disenador cuando elige cuanto pasa en pantalla.
  // Entre 0.55 y 1.75 unidades de mundo, sobre un cuadro de diez.
  // Y LOS PERIODOS SON LARGOS, que es lo que separa una duna de una arruga. Con las frecuencias de la
  // primera version (0.21 y 0.31 por unidad) las crestas se sucedian cada cinco unidades: a la altura a
  // la que vuela la camara eso no se lee como relieve sino como una superficie rugosa. Divididas por
  // tres, una duna mide quince unidades de punta a punta — casi tres cuadros de ancho— y recien ahi el
  // ojo la reconoce como duna.
  // LO QUE HACE VISIBLE UNA DUNA ES LA PENDIENTE, NO LA ALTURA — y la pendiente es amplitud POR
  // frecuencia. Bajar las frecuencias para que las dunas fueran anchas les quito pendiente, y con un
  // material mate (que no tiene especular) una pendiente suave apenas cambia de sombra: el terreno
  // volvio a leerse como una masa lisa. Medido en dos fotos seguidas: primero quemado, despues plano.
  //
  // Amplitud alta CON frecuencia media: dunas de unas nueve unidades de punta a punta y pendientes de
  // hasta 35 grados, que es donde la cara al sol y la cara en sombra se separan de verdad.
  const AMP = 3.20 + 3.20 * (1 - (R.vacio != null ? R.vacio : 0.5))
  const duna = (x, z) => (
    Math.sin(x * 0.148 + z * 0.061) * AMP
    + Math.sin(x * 0.061 - z * 0.096) * AMP * 0.55
    + Math.sin(x * 0.232 + z * 0.211) * AMP * 0.16
  )

  // EL VUELO ES PROPIO porque ninguno de los tres de `movimiento.js` sube y baja con un terreno. Cumple
  // las mismas reglas: no se detiene nunca, y la deriva sale de dos senos inconmensurables.
  //
  // El recorrido se estira o se acorta con la energia medida: mismo tiempo, mas o menos camino.
  const LARGO = distBase * 4.4 * R.velocidad
  const Z0 = distBase * 0.6
  const zDe = (beat) => Z0 - LARGO * (Math.min(beat, meta.beats) / meta.beats)
  const est = { k: 0 }
  tl.fromTo(est, { k: 0 }, { k: 1, duration: b(meta.beats), ease: 'none' }, 0)

  // A que altura vuela el ojo sobre la arena. Baja durante la pieza —de 2.6 a 1.5— porque acercarse al
  // suelo es lo que hace que el relieve se sienta; y vuelve a subir en el PEDIDO, que es el unico tramo
  // donde el terreno tiene que dejar de competir con lo que hay que leer.
  // LA ALTURA DEL OJO ES LO QUE DECIDE SI SE VE UN DESIERTO O UNA LADERA, y la primera version volaba
  // a 2.6 sobre un relieve de +-1.75: desde ahi la cresta siguiente tapa el horizonte y el cuadro se
  // llena de una sola masa oscura sin estructura. Se vio en la foto del beat 4.8 — el 70% de la
  // pantalla era un plano liso.
  //
  // A 6.2 la camara mira POR ENCIMA de la cresta proxima y ve las tres o cuatro siguientes escalonadas,
  // que es de donde sale la lectura de "desierto". Baja a 4.1 durante la pieza —acercarse hace que el
  // relieve se sienta— y vuelve a subir en el PEDIDO, que es el unico tramo donde el terreno tiene que
  // dejar de competir con lo que hay que leer.
  const OJO = (k) => 8.4 - 2.8 * Math.min(1, k / 0.85) + 3.2 * Math.max(0, (k - 0.85) / 0.15)
  const DERIVA = 0.42

  // DONDE PONER ALGO PARA QUE LA CAMARA LO LEA EN SU BEAT. Es el `zEn` de esta plantilla, y existe por
  // lo mismo que en las demas: en un vuelo continuo la posicion y el beat son la misma variable, y
  // elegirlos por separado garantiza que no coincidan.
  const zEn = (beat, lectura) => zDe(beat) - (lectura != null ? lectura : distBase * 0.9)
  // Y el cuadro util a esa distancia. `anchoADistancia` porque aca se conoce la distancia real de cada
  // bloque, no una fraccion de `distBase`.
  const UTIL = (lectura) => anchoADistancia(mundoW, distBase, lectura, DERIVA)

  // ---------------------------------------------------------------- el espacio: el terreno
  //
  // Un plano segmentado al que se le mueven los vertices UNA VEZ, al construir. El terreno no se anima
  // —esa es la diferencia con `marea`— asi que no hace falta tocarlo en `alSeek`, y eso ahorra siete mil
  // vertices por submuestra de obturador.
  const ANCHO_T = mundoW * 7
  const LARGO_T = LARGO + distBase * 4
  const SEGX = 96, SEGZ = 120
  const geo = new THREE.PlaneGeometry(ANCHO_T, LARGO_T, SEGX, SEGZ)
  geo.rotateX(-Math.PI / 2)
  const pos = geo.attributes.position
  const CZ = Z0 - LARGO_T / 2 + distBase
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i) + CZ
    pos.setY(i, duna(x, z))
  }
  pos.needsUpdate = true
  geo.computeVertexNormals()
  // ARENA MATE Y CLARA. `grisDePeso` devuelve el gris de mas peso de la pagina; si la marca tiene masa
  // de color, la arena la toma en un tinte suave — un desierto entero del color del acento seria una
  // mancha, pero un desierto que lo insinua se lee como de esa marca.
  // LA ARENA SE INSINUA CON EL ACENTO, NO SE PINTA CON EL. La primera version usaba `colorDePeso` a
  // plena fuerza cuando la pagina tenia masa de color, y sobre basecamp eso da un desierto ENTERO azul
  // — que es literalmente lo que el comentario de arriba decia que no habia que hacer. `nivel(k, tinte)`
  // mezcla hacia el acento en la proporcion que se le pida: 0.16 se lee como "arena de esa marca" y
  // 1.0 se lee como una mancha.
  // METALNESS EN CERO, Y ESO NO ES UN AJUSTE FINO: LA ARENA NO ES METAL.
  //
  // Con `metal()` por defecto —metalness 0.30, roughness 0.62— este plano renderizaba en (40,51,64)
  // teniendo un color base de #c4a89d. Medido: con el mismo color en un material EMISIVO el mismo pixel
  // da (121,144,171), o sea que la geometria estaba bien y lo que fallaba era como responde a la luz.
  // Un 30% de metalness sobre una superficie enorme y casi horizontal se come casi toda la difusa, que
  // es justo lo unico que tiene una duna.
  //
  // Es la misma familia que costo tres arreglos con `metalness: 1.0`, un escalon mas abajo: no alcanza
  // con que el color sea claro si el material no lo deja verse.
  // NIVEL 0.07 Y NO 0.20, Y LA CUENTA ES ESTA. Medido dentro del navegador: con `nivel(0.20)` el
  // material sale #b8c7d7 —claro— y el pixel renderizado da (60,76,96), o sea UN TERCIO del albedo. No
  // es un defecto: three ilumina en unidades fisicas, y una direccional de 1.85 sobre una superficie
  // horizontal aporta 1.85/PI * cos(51 grados) = 0.37, mas la hemisferica 1.15/PI * 0.5 = 0.18. Un
  // tercio es exactamente lo que la fisica devuelve.
  //
  // O sea que para que la arena SE VEA como arena, su color base tiene que estar tres veces mas cerca
  // del fondo de lo que uno elegiria mirando el hex. `nivel(0.07)` es lo que renderiza como
  // `nivel(0.20)` parecia prometer.
  //
  // Y el tinte de acento baja de 0.16 a 0.07: sobre una pagina de acento azul, 0.16 volvia la arena
  // gris azulada. Un desierto puede insinuar el color de la marca; no puede ser de ese color.
  // LA ARENA VA MAS OSCURA QUE EL CIELO, Y ESO ES LO CONTRARIO DE LO QUE PARECE.
  //
  // La version anterior la aclaro hasta (120,134,151) para que se viera "como arena" — y el resultado
  // fue que el suelo y el cielo quedaron EN EL MISMO VALOR, o sea sin horizonte: el cuadro entero se
  // leia como niebla. Es la misma trampa del contraste que este repo documenta en otros tres lugares:
  // lo que hace legible una forma no es su brillo sino su DIFERENCIA con lo que tiene detras.
  //
  // `marea` funciona por esto: su agua es oscura contra un cielo claro. Aca se hace igual, y el
  // relieve lo separa un CONTRALUZ —ver abajo— que es la respuesta fotografica de siempre para una
  // duna: el sol por detras enciende la cresta y deja la cara en sombra.
  const suelo = new THREE.Mesh(geo, mate(nivel(0.46, R.acentoMasa ? 0.10 : 0.04), 0.96))
  suelo.position.z = CZ
  escena.add(suelo)

  // ---------------------------------------------------------------- las capas
  //
  // Cuantas hay lo decide la densidad de la pagina. La primera siempre: cordones lejanos que dan el
  // horizonte. La segunda son penachos de arena volando cerca del lente —el barrido gratis entre
  // tiempos— y la tercera, un banco de bruma a media distancia.
  const capas = []
  const cordon = new THREE.Group()
  escena.add(cordon)
  let sem = 314159
  const az = () => { sem = (sem * 1664525 + 1013904223) >>> 0; return sem / 4294967296 }
  for (let i = 0; i < 14; i++) {
    const w = mundoW * (1.6 + az() * 2.4)
    const h = mundoH * (0.10 + az() * 0.14)
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
      luz(grisDePeso(R, nivel(0.34)), 0.55 + az() * 0.2))
    m.material.transparent = true
    m.material.opacity = 0.55
    m.material.depthWrite = false
    // La z es RELATIVA al grupo, que en `alSeek` se ancla a la camara: cada cordon queda entre 0 y
    // 2.4 distBase por detras del horizonte, o sea siempre lejos.
    m.position.set((az() - 0.5) * mundoW * 8, -0.2 + h * 0.5, -distBase * az() * 2.4)
    cordon.add(m)
  }
  capas.push({ grupo: cordon, vel: 0.12, largo: distBase * 6 })

  let penachos = null
  if (R.capas >= 3) {
    penachos = new THREE.Group()
    escena.add(penachos)
    for (let i = 0; i < 9; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(mundoW * (0.5 + az() * 0.7), 0.09),
        luz(nivel(0.16), 0.8))
      m.material.transparent = true
      m.material.opacity = 0.30
      m.material.depthWrite = false
      // FUERA DEL CORREDOR CENTRAL. Un penacho a media unidad del lente no oscurece el cuadro: lo
      // borra. Es la leccion que `deriva` pago con su capa cercana tapando el CTA.
      m.position.set((az() < 0.5 ? -1 : 1) * mundoW * (0.75 + az() * 0.9), 0.3 + az() * 1.4, 0)
      m.rotation.z = (az() - 0.5) * 0.25
      penachos.add(m)
    }
    capas.push({ grupo: penachos, vel: 2.9, largo: distBase * 1.4 })
  }
  let bruma = null
  if (R.capas >= 4) {
    // Solo en los sitios mas densos: una franja de bruma que corta el terreno a media distancia y le
    // agrega un plano mas. En un sitio aireado esto ensucia el horizonte, que es lo que lo vende.
    bruma = new THREE.Mesh(new THREE.PlaneGeometry(ANCHO_T, mundoH * 0.5), luz(nivel(0.06), 0.9))
    bruma.material.transparent = true
    bruma.material.opacity = 0.22
    bruma.material.depthWrite = false
    bruma.position.set(0, 0.9, 0)
    escena.add(bruma)
    capas.push({ grupo: bruma, vel: 0.9, largo: distBase * 3 })
  }
  uso.capas = capas.length

  // ---------------------------------------------------------------- los bloques
  //
  // TODOS SE APOYAN EN LA MISMA FUNCION QUE DIBUJA LA ARENA. `alturaDe` no es "parecida" al relieve: ES
  // el relieve. Sin eso el texto flota sobre una duna que no existe, y ninguna compuerta lo caza porque
  // las dos cuentas son correctas por separado.
  const LEC = distBase * 0.9
  const alturaDe = (x, z, sobre) => duna(x, z) + (sobre != null ? sobre : 1.0)

  const marca = bloqueMarca({ alto: 1.30, anchoMax: UTIL(LEC) * 0.90, margen: R.margen })
  const promesa = bloquePromesa({ alto: 0.55, anchoMax: UTIL(LEC) * 0.90, margen: R.margen })
  const prueba = bloquePrueba(ctx, { ancho: mundoW * 0.50, ar: 1.55 })
  const cifras = bloquesCifra(R.cifras, { alto: 0.80, anchoMax: UTIL(LEC) * 0.44, margen: R.margen })
  const frases = bloquesFrase(R.frases, { alto: 0.29, anchoMax: UTIL(LEC) * 0.82, margen: R.margen })
  const pedido = bloquePedido({ alto: 0.33, anchoMax: UTIL(LEC) * 0.62, margen: R.margen })

  // Planta un bloque sobre la arena, en el beat en que la camara lo va a estar mirando.
  // LA ALTURA DEL BLOQUE SE MIDE CONTRA EL OJO, no contra la arena.
  //
  // La primera version los apoyaba a una unidad del suelo con numeros fijos. Cuando la camara subio de
  // 2.6 a 8.4 —para poder ver POR ENCIMA de la cresta proxima, que es lo que hace que un desierto se
  // lea como desierto— los bloques quedaron seis unidades por debajo del encuadre y la sonda paso de
  // 29% a 56% de beats mudos. El texto no se movio: se movio el punto de vista.
  //
  // `sobre` pasa a ser una fraccion de la altura del ojo EN ESE BEAT. Asi la composicion sobrevive a
  // cualquier cambio del vuelo, que es justamente lo que va a seguir pasando mientras se afina.
  const plantar = (blk, beat, x, frac, padre) => {
    const z = zEn(beat, LEC)
    const k = Math.min(1, beat / meta.beats)
    blk.g.position.set(x || 0, alturaDe(x || 0, z, OJO(k) * (frac != null ? frac : 0.55)), z)
    ;(padre || escena).add(blk.g)
    return blk.g
  }

  // ---------------------------------------------------------------- 2 · MARCA
  // Se planta sobre la cresta que la camara esta por coronar: sube desde la arena y se va hacia arriba
  // antes de que la camara lo alcance, porque en un vuelo lo que se queda te lo comes.
  if (marca) {
    plantar(marca, 8.0, 0, 0.72)
    entra(marca.g, tl, 6, { desde: 'abajo', dist: 4.2, dur: 1.8 })
    marca.escribir(tl, 6.5, 1.4)
    marca.borrar(tl, 11.2)
    sale(marca.g, tl, 11.4, { hacia: 'arriba', dist: 5.5, dur: 1.1 })
    respiraciones.push(respirar(marca.g, { amp: 0.045, giro: 0.012, fase: 0.4 }))
    uso.marca = true
  }

  // ---------------------------------------------------------------- 3 · PROMESA
  // Baja al valle y CRUZA el cuadro: entra por la derecha y se va por la izquierda. En una pieza donde
  // todo sube y baja, el claim es el unico movimiento lateral y por eso se destaca sin ser mas grande.
  if (promesa) {
    plantar(promesa, 15.0, 0, 0.58)
    entra(promesa.g, tl, 13, { desde: 'der', dist: 6.5, dur: 1.8 })
    promesa.escribir(tl, 13.5, 1.0)
    promesa.borrar(tl, 17.4)
    sale(promesa.g, tl, 17.6, { hacia: 'izq', dist: 7, dur: 1.2 })
    uso.claim = true
    uso.claimRecortado = promesa.recortado
  }

  // ---------------------------------------------------------------- 4 · PRUEBA
  // Se levanta de la arena como una lamina clavada en la cresta, y gira mientras la camara la pasa. El
  // giro es lo que la vuelve OBJETO: un plano de frente con una captura encima es una textura pegada.
  if (prueba) {
    plantar(prueba, 21.6, 0, 0.62, pagina)
    prueba.g.rotation.y = 0.52
    entra(prueba.g, tl, 19, { desde: 'abajo', dist: 6.5, dur: 2.1 })
    prueba.escribir(tl, 19.3, 1.2)
    prueba.recorrer(tl, 20, 6.0, 0.92)
    tl.to(prueba.g.rotation, { y: -0.26, duration: b(6.4), ease: 'none' }, b(19.8))
    sale(prueba.g, tl, 25.4, { hacia: 'izq', dist: 7, dur: 1.3 })
    respiraciones.push(respirar(prueba.g, { amp: 0.07, giro: 0.018, fase: 1.5 }))
    uso.pagina = prueba.fuente
  }

  // ---------------------------------------------------------------- 5 · RAZONES
  // Cifras en crestas alternas a un lado y al otro del rumbo; frases en el eje, mas bajas. El cruce
  // llena el tiempo mas largo de la pieza sin apilar dos cosas en el mismo sitio.
  cifras.forEach((c, i) => {
    const s = i % 2 === 0 ? -1 : 1
    const t0 = 27 + i * 2.3
    plantar(c, t0 + 1.0, s * mundoW * 0.26, 0.66)
    c.g.rotation.y = s * 0.22
    entra(c.g, tl, t0, { desde: s < 0 ? 'izq' : 'der', dist: 5, dur: 1.4 })
    c.escribir(tl, t0 + 0.3, 0.78)
    sale(c.g, tl, t0 + 2.4, { hacia: 'arriba', dist: 5, dur: 1.0 })
  })
  uso.cifras = cifras.length

  frases.forEach((f, i) => {
    const t0 = 27.8 + i * 2.8
    plantar(f, t0 + 1.0, 0, 0.40)
    entra(f.g, tl, t0, { desde: 'abajo', dist: 4, dur: 1.4 })
    f.escribir(tl, t0 + 0.4, 0.85)
    f.borrar(tl, t0 + 2.4)
    sale(f.g, tl, t0 + 2.6, { hacia: 'abajo', dist: 4.5, dur: 1.0 })
  })
  uso.frases = frases.length

  // ---------------------------------------------------------------- 6 · PEDIDO
  // La camara sube por encima del relieve —ver `OJO`— y el CTA queda contra el cielo limpio. Es el
  // unico tramo de la pieza donde el terreno deja de competir con lo que hay que leer, y por eso el
  // ascenso esta en la funcion de altura y no en un tween: tiene que evaluarse en cada submuestra.
  let latido = null
  if (pedido) {
    plantar(pedido, meta.beats - 1.2, 0, 0.70)
    entra(pedido.g, tl, 34, { desde: 'fondo', dist: 5.5, dur: 2.0 })
    pedido.escribir(tl, 34.5, 0.9)
    latido = pedido.latir(0.03)
    uso.cta = pedido.tieneCta
    tl.to(ctx.bloom, { strength: (ctx.bloom.strength || 0.5) * 1.6, duration: b(2.2), ease: E.frena(2) }, b(34))
  }

  // ---------------------------------------------------------------- lo continuo
  //
  // La camara ASIGNA su posicion porque ningun tween la anima en esta plantilla —el vuelo es propio— y
  // sumar sobre una propiedad que nadie restablece acumularia en cada submuestra del obturador. Es la
  // regla que documenta `boveda-check`, y aca cae del lado de asignar.
  const _mira = new THREE.Vector3()
  const alSeek = juntar(latido, (t) => {
    uDomo.uT.value = t
    const k = est.k
    const z = zDe(k * meta.beats)
    const x = Math.sin(t * 0.31) * DERIVA
    camara.position.set(x, alturaDe(x, z, OJO(k)), z)
    // Mira un tramo mas adelante y un poco mas abajo que el ojo: sin eso la camara apunta al cielo cada
    // vez que corona una cresta, y el terreno —que es el sujeto— se va del cuadro justo en el momento
    // en que mas se siente.
    // Mira MUCHO mas adelante que antes (2.3 en vez de 1.15 distBase): con el objetivo cerca, la
    // camara cabecea con cada cresta y el horizonte entra y sale del cuadro. Lejos, el horizonte se
    // queda quieto y lo que se mueve es el relieve pasando por debajo, que es lo que se quiere ver.
    const zm = z - distBase * 2.3
    // EL OBJETIVO SIGUE AL OJO, NO AL TERRENO. Apuntar a la altura de la arena a 2.3 distBase de
    // distancia parecia lo correcto —la camara mira el suelo que viene— y con la amplitud subida a 6.4
    // hace CABECEAR el encuadre varias unidades por beat: los bloques, que estan a una altura fija,
    // entran y salen del cuadro solos. La sonda lo marco como "encendido pero NO se ve" en los beats
    // 15 a 17.
    //
    // Con una caida constante respecto del ojo, el horizonte se queda quieto y lo que se mueve es el
    // relieve pasando por debajo — que ademas es lo que se queria ver.
    _mira.set(Math.sin(t * 0.19) * DERIVA * 0.6, camara.position.y - OJO(k) * 0.46, zm)
    camara.lookAt(_mira)
    camara.rotation.z += Math.sin(t * 0.23 + 0.4) * 0.013
    // LAS CAPAS SIGUEN A LA CAMARA. La primera version las corria con `(t * vel) % largo` a secas, o
    // sea en coordenadas de MUNDO, mientras la camara avanzaba en sentido contrario: el cordon del
    // horizonte —catorce planos claros de hasta cuatro anchos de mundo— terminaba DELANTE DEL LENTE y
    // tapaba el cuadro entero con una pared blanca. Se veia en la foto del beat 5 y del beat 11.
    //
    // Un horizonte no se aleja ni se acerca: se queda. Se ancla a la camara y lo unico que se le deja
    // es una deriva LATERAL, que es de donde sale el paralaje de una capa lejana de verdad.
    cordon.position.z = camara.position.z - distBase * 3.4
    cordon.position.x = Math.sin(t * 0.021) * mundoW * 0.5
    if (penachos) {
      // Los penachos si ciclan, porque son la capa cercana y tienen que PASAR. El modulo va sobre la
      // distancia a la camara, no sobre la posicion absoluta.
      penachos.position.z = camara.position.z - ((t * 2.9) % (distBase * 1.4))
      penachos.position.y = camara.position.y - 0.4
    }
    if (bruma) {
      bruma.position.z = camara.position.z - distBase * 1.6
      bruma.position.y = camara.position.y + 0.5
    }
    motas.position.copy(camara.position)
    motas.rotation.y = t * 0.02
  }, ...respiraciones)

  return { dur: b(meta.beats), alSeek, uso }
}
