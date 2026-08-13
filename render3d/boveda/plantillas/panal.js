// PLANTILLA "panal" — una boveda de celdas hexagonales que se cierra sobre el lente y se ABRE, celda
// por celda, para dejar pasar cada bloque.
//
// EL GESTO
//
// Un tunel de panal: la camara avanza por dentro de un tubo tapizado de celdas hexagonales y cada
// cierto tramo se encuentra con una COMPUERTA — un disco de celdas que tapa el corredor entero. La
// compuerta no se desvanece ni se corre: se VACIA. Los nucleos salen de sus celdas del centro hacia
// afuera, uno por anillo, y la trama se dilata hasta pasar de largo. El bloque de ese tiempo entra
// volando desde el fondo y ATRAVIESA el hueco que se acaba de abrir.
//
// Marca de comunidad, cooperativa, red o manufactura: todo lo que se vende diciendo "esto esta hecho
// de MUCHAS PARTES IGUALES que encajan".
//
// EN QUE SE DIFERENCIA DE `telar`, QUE TAMBIEN ES UNA ESTRUCTURA
//
// `telar` teje HILOS: su unidad es una linea tensa, no tiene interior y no puede sostener nada. Lo que
// hace ahi el bastidor es abrirse para no pegarte. Aca la unidad es una CELDA CON CARA — un hexagono
// con fondo, con canto y con un nucleo adentro—, y eso cambia dos cosas que se ven en cualquier cuadro:
//
//   1. UNA CELDA SE VACIA, un cable no. Un bastidor de `telar` se dilata entero y a la vez; un panal se
//      abre POR ANILLOS, del centro hacia afuera, porque cada celda es una pieza con su propio nucleo.
//      Es la unica forma de que "se abren una por una" sea algo que se vea y no una manera de hablar.
//   2. UNA CELDA PUEDE LLEVAR ALGO ENCIMA. Cuatro celdas del tubo llevan un recorte real de la pagina
//      del cliente como cara. No es decoracion: es lo que hace que el ESPACIO ya sea de esa marca antes
//      de que aparezca el nombre. Un hilo no puede hacer eso.
//
// Y una consecuencia de composicion: el panal no necesita frenar la camara para el pedido, porque
// tiene una compuerta que NO se abre. La ultima queda sellada mas alla del final del vuelo, la camara
// no la alcanza nunca y el CTA se lee contra ella. Donde `telar` despeja el ultimo tercio sacando
// bastidores, `panal` lo cierra: la boveda se sella y el pedido queda adentro.
//
// LOS SEIS TIEMPOS (beats sobre 36) — al lado, la compuerta que se vacia mientras tanto
//   0   ESPACIO   el tubo cerrado llenando el cuadro; la primera compuerta se abre sobre el lente.
//   4   MARCA     el nombre entra desde el fondo y cruza su compuerta mientras se escribe.
//   10  PROMESA   el claim atraviesa la siguiente y se planta delante de ella.
//   16  PRUEBA    la pagina llega girada, montada dentro de una celda hexagonal de su tamaño.
//   24  RAZONES   las cifras entran pegadas a la pared; las frases suben por el eje.
//   31  PEDIDO    la ultima compuerta NO se abre: el CTA se lee sobre el panal sellado.
//
// SIN MATERIAL: sin tira, PRUEBA usa el recorte mas grande; sin recortes, ese tiempo se compone vacio,
// las celdas con cara no existen y el tubo se queda solo. Lo que no hay, no se anuncia.

import { THREE, metal, luz, iluminar, domo, polvo, prismaDe } from '../nucleo.js'
import { vueloAvance, entra, sale, paralaje, respirar, juntar, anchoConDeriva, anchoADistancia } from '../movimiento.js'
import { bloqueMarca, bloquePromesa, bloquePrueba, bloquesCifra, bloquesFrase, bloquePedido } from '../bloques.js'
import { colorDePeso, grisDePeso } from '../recetas.js'
import { LOOK, nivel, recortesDe, topeNitido, E, b } from '../../demo/kit.js'

export const meta = {
  id: 'panal',
  nombre: 'Panal',
  familia: 'trama',
  necesita: ['nada'],
  beats: 36,
  tiempos: { espacio: 0, marca: 4, promesa: 10, prueba: 16, razones: 24, pedido: 31 },
  pitch: 'Una boveda de celdas hexagonales que se abre celda por celda para dejar pasar cada bloque. De comunidad, de red, de manufactura.',
}

const SQ3 = Math.sqrt(3)

// LA APERTURA, EN CUATRO NUMEROS Y UNA CUENTA.
//
//   APERTURA  cuanto se dilata la trama de una compuerta abierta del todo. 2.8 sale de la unica cuenta
//             que no puede fallar: el canto interior de la celda central mide `0.80 * RC` y con la
//             celda mas chica que el retrato puede pedir (RC = 0.731) eso son 0.585 unidades. Dilatado
//             3.8 veces da 2.22, contra una deriva maxima de camara de 0.54. Sobran cuatro veces, y por
//             eso ninguna celda puede pasar por el lente por rapida que vaya la camara.
//   CERCA     a que distancia empieza a abrirse SOLA por proximidad de la camara. Es la red de
//             seguridad, no el gesto: con 0.014, a 10 unidades ya vale 0.42 y a 25 apenas 0.10.
//   ESCALON   cuanto tarda cada anillo respecto del anterior. Es lo que hace que se abra "una por una"
//             y no de golpe: con 0.10, el cuarto anillo arranca cuando el central ya termino.
//   VENTANA   cuanto dura el vaciado de un anillo, medido en la misma escala 0..1.
const APERTURA = 2.8
const CERCA = 0.014
const ESCALON = 0.10
const VENTANA = 0.40

// Cuantas instancias como MUCHO puede tener el tubo cercano. No es un numero de gusto: es un tope de
// seguridad contra una combinacion de recetas que no existe hoy. El peor caso real —velocidad 1.45 con
// la pagina mas densa, o sea el vuelo mas largo con las celdas mas chicas— da 151 anillos por 17 celdas
// = 2567. El tope solo se toca si alguna vez se ensancha alguno de los dos rangos.
const TOPE_CELDAS = 3200

// ---------------------------------------------------------------- las dos maneras de tejer un panal
//
// UN PANAL ES UNA SOLA MALLA POR FAMILIA, y esa es la unica decision tecnica del archivo. El tubo
// cercano tiene dos mil quinientas celdas: como mallas sueltas serian cinco mil llamadas de dibujo por
// cuadro, y por cuatro submuestras de obturador, veinte mil. Instanciadas son DOS. Lo mismo cada
// compuerta: dos llamadas en vez de setenta.
//
// El precio de instanciar es que una celda ya no se mueve poniendole `position` a un objeto — hay que
// reescribir su matriz. Sale barato (una composicion de matriz por celda y por submuestra) y ademas es
// lo correcto, porque un movimiento continuo escrito como tween se muestrea una vez por cuadro y sale
// a saltos justo donde el obturador deberia barrerlo.
//
// `frustumCulled = false` en las dos: la esfera de recorte de un InstancedMesh se calcula con la
// geometria de UNA instancia, asi que three descartaria el tubo entero justo cuando mas ocupa el cuadro.

// EL TUBO: celdas repartidas alrededor del eje, con la boca mirando al eje. Los anillos impares van
// corridos medio paso, y eso es lo unico que separa un PANAL de una grilla de anillos apilados.
function tejerTubo(RT, RC, anillos, pasoZ, zTope, matCanto, matCara) {
  const grupo = new THREE.Group()
  // Cuantas caben alrededor: el perimetro dividido por el ALTO de un hexagono (`SQ3 * RC`), que es la
  // medida con la que un panal encastra sin dejar hueco.
  const nAng = Math.max(8, Math.round((2 * Math.PI * RT) / (SQ3 * RC)))
  const celdas = []
  for (let j = 0; j < anillos; j++) {
    const z = zTope - j * pasoZ
    const off = (j & 1) ? 0.5 : 0
    for (let k = 0; k < nAng; k++) {
      const a = ((k + off) / nAng) * Math.PI * 2
      celdas.push({ x: Math.cos(a) * RT, y: Math.sin(a) * RT, z, a })
    }
  }
  const canto = new THREE.InstancedMesh(new THREE.RingGeometry(RC * 0.80, RC * 0.98, 6, 1), matCanto, celdas.length)
  const cara = new THREE.InstancedMesh(new THREE.CircleGeometry(RC * 0.80, 6), matCara, celdas.length)
  canto.frustumCulled = false
  cara.frustumCulled = false
  const eje = new THREE.Object3D()
  celdas.forEach((c, i) => {
    eje.position.set(c.x, c.y, c.z)
    eje.scale.setScalar(1)
    // La boca de la celda mira al EJE, no a la camara. Un plano de `CircleGeometry` nace mirando a +Z;
    // `lookAt` lo gira para que su normal apunte al punto del eje a su misma altura de z, que es donde
    // va a estar la camara cuando pase. Sin esto el tubo se ve de canto, o sea no se ve.
    eje.lookAt(0, 0, c.z)
    eje.updateMatrix()
    canto.setMatrixAt(i, eje.matrix)
    cara.setMatrixAt(i, eje.matrix)
  })
  grupo.add(canto)
  grupo.add(cara)
  return { grupo, celdas, nAng, canto, cara }
}

// EL DISCO DE UNA COMPUERTA: un panal plano que tapa el corredor. Coordenadas de panal de verdad —
// columnas cada `1.5 * RC`, filas cada `SQ3 * RC`, las columnas impares corridas media fila— y despues
// se recorta al radio pedido. Es la trama que encastra sin hueco; una grilla cuadrada de hexagonos deja
// rombos vacios y se lee como un error de modelado.
//
// `anillo` no es el indice axial exacto sino la BANDA radial, redondeada al paso de columna. Sirve
// para lo unico para lo que se usa: escalonar el vaciado del centro hacia afuera. El indice exacto
// daria el mismo orden con mas cuentas.
function celdasDisco(RG, RC) {
  const celdas = []
  const Q = Math.ceil(RG / (1.5 * RC)) + 1
  const P = Math.ceil(RG / (SQ3 * RC)) + 1
  for (let q = -Q; q <= Q; q++) {
    for (let p = -P; p <= P; p++) {
      const x = q * 1.5 * RC
      // `q & 1` y no `q % 2`: con q negativo el resto en JS sale negativo y la mitad de las columnas
      // quedaria corrida para el otro lado, o sea la trama partida al medio por el eje.
      const y = p * SQ3 * RC + ((q & 1) ? SQ3 * 0.5 * RC : 0)
      const r = Math.hypot(x, y)
      if (r > RG) continue
      celdas.push({ x, y, anillo: Math.round(r / (1.5 * RC)) })
    }
  }
  return celdas
}

// LA CARA DE UNA CELDA CON UN RECORTE ENCIMA, sin deformarlo.
//
// El hexagono de `CircleGeometry` usa el cuadro UV entero de ancho y solo `SQ3/2` de alto, o sea que
// muestrea una ventana de proporcion 2/SQ3 = 1.155 — la misma proporcion que tiene el hexagono en el
// mundo. La geometria entonces NO deforma; lo que deforma es meter una imagen que no es de esa
// proporcion en el cuadro UV completo. Se corrige recortando al centro con `repeat`/`offset`, que es la
// misma cuenta que hace `panelPagina` para la tira y por la misma razon: la proporcion de lo que
// capturamos de la pagina del cliente se respeta o el dueño de la marca lo ve antes que nadie.
function caraDeRecorte(tex) {
  const t = tex.clone()
  t.needsUpdate = true
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
  t.anisotropy = 8
  const ar = ((tex.image && tex.image.width) || 1) / ((tex.image && tex.image.height) || 1)
  const AR_HEX = 2 / SQ3
  if (ar > AR_HEX) { const k = AR_HEX / ar; t.repeat.set(k, 1); t.offset.set((1 - k) / 2, 0) }
  else { const k = ar / AR_HEX; t.repeat.set(1, k); t.offset.set(0, (1 - k) / 2) }
  return t
}

export function build(ctx) {
  const { escena, pagina, camara, tl, W, mundoW, mundoH, distBase, texturas, datosEls } = ctx
  const uso = {}
  const respiraciones = []

  // ---------------------------------------------------------------- LO QUE LA PAGINA DECIDE
  //
  // `ctx.recetas` sale de `backend/retrato.py`, que mide la tira, el DOM y los recortes de ESTA pagina.
  // Sin retrato devuelve los valores neutros y la plantilla compone como se componia antes de que el
  // analisis existiera: no hay una rama distinta ni un caso especial. Lo que se modula es el GRADO,
  // nunca la idea — `panal` siempre es un tunel de celdas con compuertas que se vacian.
  //
  // La explicacion larga de cada receta vive en `render3d/boveda/recetas.js`, y la de por que existe
  // este mecanismo, en `atrio.js`. Aca esta lo que cambia EN EL VIDEO:
  //
  //   R.vacio       EL TAMAÑO DE LA CELDA Y EL DIAMETRO DEL TUBO. Es la traduccion mas visible de todo
  //                 el retrato en esta plantilla: una pagina que respira mucho aire da un panal de
  //                 pocas celdas grandes y un tubo ancho; una apretada da muchas celdas chicas y un
  //                 tubo que roza. La misma pieza pasa de "boveda" a "colmena" sin cambiar una linea.
  //   R.velocidad   cuanto camino recorre la camara en los mismos 36 beats.
  //   R.capas       cuantas pieles de panal hay: 2 (tubo + fondo), 3 (+ el roce que barre el lente),
  //                 4 (+ una segunda piel por fuera del tubo, que se ve por los huecos).
  //   R.dureza      LA FORMA DEL NUCLEO que llena cada celda, via `prismaDe`. Una marca de aristas
  //                 vivas tapona sus celdas con un tarugo cuadrado; una que redondea todo, con uno
  //                 cilindrico. La boca sigue siendo hexagonal porque eso es el panal.
  //   R.margen      cuanto ancho puede ocupar un bloque de texto. Va a los seis bloques y a ningun
  //                 otro lado.
  //   R.cifras      cuantas cifras se piden en RAZONES.
  //   R.frases      cuantas frases se piden en RAZONES.
  //   R.acentoMasa  si el color de la marca ocupa SUPERFICIE (las caras del panal) o queda en los
  //                 cantos. Por debajo del 3% de la tira, construir el tubo entero en ese color miente
  //                 sobre como se ve ese sitio.
  const R = ctx.recetas || { velocidad: 1, capas: 3, dureza: 0.75, margen: 0.88, cifras: 3, frases: 2,
    acentoMasa: false, vacio: 0.5, movimientos: 4, paleta: [], medido: false }
  uso.retrato = !!R.medido
  const VACIO = R.vacio != null ? R.vacio : 0.5

  // Semilla propia y determinista. Dos renders de la misma pagina tienen que dar el mismo video, y
  // `Math.random` lo rompe sin dar un solo sintoma hasta que alguien compara dos corridas. Vive DENTRO
  // de `build` para que la compuerta, que construye la misma plantilla varias veces en un proceso,
  // reciba el mismo panal cada vez.
  let sem = 8221
  const az = () => { sem = (sem * 1664525 + 1013904223) >>> 0; return sem / 4294967296 }

  iluminar(escena, { key: 1.05, relleno: 0.55 })
  const uDomo = domo(escena, { fuerza: 0.25 })
  const motas = polvo(escena, 1000, 30)

  // ---------------------------------------------------------------- las medidas del panal
  //
  // Las tres salen del aire de la pagina y quedan atadas entre si a proposito: una celda grande pide un
  // tubo ancho, o el panal deja de leerse como una trama y pasa a ser un tunel de seis paredes.
  const RC = mundoW * (0.130 + 0.130 * VACIO)   // radio de celda   0.731 .. 1.463
  const RT = mundoW * (0.620 + 0.340 * VACIO)   // radio del tubo   3.488 .. 5.400
  const RG = RT * 1.30                          // el disco de una compuerta DESBORDA el tubo: si midiera
                                                // igual, en el cuadro quedaria un borde de domo entre la
                                                // compuerta y la pared, y se veria el truco.
  const PZ = RC * 1.50                          // separacion de anillos del tubo

  // EL VUELO PRIMERO. En una pieza que avanza, donde va un objeto no es una decision de composicion
  // sino la consecuencia de en que beat tiene que leerse.
  //
  // LA DERIVA SALE DEL MISMO AIRE QUE EL TUBO, y no puede salir de otro lado: un tubo angosto con una
  // camara que serpentea mucho se lee como un choque evitado por poco. Queda entre 0.24 y 0.54, o sea
  // siempre por debajo de un decimo del radio del tubo.
  const DERIVA = 0.24 + 0.30 * VACIO
  const LARGO = distBase * 4.2 * R.velocidad
  const vuelo = vueloAvance(camara, tl, {
    distBase, beats: meta.beats, largo: LARGO, desde: 0.90, deriva: DERIVA,
  })
  const zEn = vuelo.zEn
  // Todo lo que se compone al ancho se mide contra ESTO y no contra `mundoW`: la camara deriva, asi que
  // el cuadro util es mas angosto que el de reposo — y mas todavia para lo que esta cerca.
  const UTIL = (k) => anchoConDeriva(mundoW, DERIVA, k)

  // ---------------------------------------------------------------- el espacio · los materiales
  //
  // EL COLOR SALE DE LOS PIXELES, no de `LOOK.acento` a secas. `colorDePeso` devuelve la primera masa
  // cromatica de la paleta medida sobre la tira, saltando los grises: no es el acento del ADN —que es
  // el color de los BOTONES— sino el que de verdad ocupa superficie.
  const COL = colorDePeso(R, LOOK.acento, 0.20)
  const GRIS = grisDePeso(R, nivel(0.22))
  // Y SI EL ACENTO NO DA PARA MASA, las caras van neutras y el color queda en los cantos. Es la
  // diferencia entre un panal de color con filetes grises y uno gris con filetes de color, y en un
  // sitio cuyo acento cubre menos del 3% de la tira la primera version es un retrato falso.
  const matCara = metal(R.acentoMasa ? COL : GRIS, 0.36)
  const matCanto = luz(LOOK.acento, 1.05)
  // Las dos caras, y no es prolijidad: la capa de roce PASA AL LADO DEL LENTE, asi que despues de
  // cruzarla se le ve el dorso. Una celda que desaparece al pasar no se lee como un error de material
  // sino como un parpadeo del render, que es peor porque manda a buscar el defecto a otro lado.
  matCara.side = THREE.DoubleSide
  matCanto.side = THREE.DoubleSide
  // EL NUCLEO ES LO UNICO OPACO QUE TAPA EL CORREDOR, asi que va en metal y no en emisivo: tiene que
  // recibir la luz para que se lea como una pieza y no como un recorte negro. `metal()` ya usa
  // metalness 0.30 justamente porque un metal PBR sin mapa de entorno renderiza NEGRO, que es la
  // trampa que costo tres arreglos en las luces de otras plantillas.
  const matNucleo = metal(R.acentoMasa ? GRIS : COL, 0.30)

  // NO HAY `vidrio()` EN ESTA PLANTILLA, y es una decision y no un olvido. Una trama de dos mil celdas
  // en transmision llena el cuadro de refraccion y el panal deja de leerse como CELDAS con cara para
  // leerse como un vidrio esmerilado — que es justo lo que lo separa de `telar` y de `vitral`. La
  // profundidad la dan las capas, no el material.

  // EL NUCLEO DE UNA CELDA, CON LA FORMA DE LA MARCA.
  //
  // `prismaDe` devuelve un prisma con el eje en Y —es un cilindro de n lados— y aca hace falta apuntando
  // a la camara, o sea en Z. La orientacion se HORNEA en la geometria en vez de resolverse con una
  // rotacion del objeto por dos razones: son celdas instanciadas y no objetos, asi que no hay donde
  // poner esa rotacion; y `prismaDe` ya usa `rotation.y` para enderezar el caso de 4 lados (sin eso una
  // columnata de rombos), asi que apilarle una rotacion en X encima daria una forma girada al azar.
  // Se lee la suya, se hornea, y despues se tumba el eje.
  const protoNucleo = prismaDe(RC * 1.30, RC * 0.95, R.dureza, matNucleo)
  const geoNucleo = protoNucleo.geometry
  if (protoNucleo.rotation.y) geoNucleo.rotateY(protoNucleo.rotation.y)
  geoNucleo.rotateX(Math.PI / 2)
  uso.ladosNucleo = protoNucleo.userData.lados

  // ---------------------------------------------------------------- el espacio · el tubo cercano
  //
  // ALCANZA HASTA EL FINAL DEL VUELO Y NO SE REPITE. Una capa que se envuelve con `paralaje` ahorra
  // celdas y trae una costura: el tubo tiene anillos alternados, asi que el salto invierte el corrimiento
  // y por un cuadro la trama se parte. Extenderlo cuesta memoria de instancias —barata— y no cuesta
  // ninguna llamada de dibujo mas, porque instanciado es la misma.
  const ALCANCE = LARGO + distBase * 3.0
  const N_ANG = Math.max(8, Math.round((2 * Math.PI * RT) / (SQ3 * RC)))
  const anillosTubo = Math.min(Math.ceil(ALCANCE / PZ) + 6, Math.floor(TOPE_CELDAS / N_ANG))
  const tubo = tejerTubo(RT, RC, anillosTubo, PZ, distBase * 1.20, matCanto, matCara)
  escena.add(tubo.grupo)
  uso.celdas = tubo.celdas.length

  // ---------------------------------------------------------------- el espacio · las capas
  //
  // SIN CAPAS A DISTINTAS VELOCIDADES, volar por un tunel es indistinguible de un zoom sobre una
  // textura: no hay contra que medir el avance. El tubo cercano va con velocidad 0 —esta clavado al
  // mundo y la camara lo atraviesa—, y lo que da la profundidad son las otras.
  const capas = [{ grupo: tubo.grupo, vel: 0, largo: ALCANCE }]

  // EL FONDO. Un panal enorme y tenue mucho mas lejos, ALEJANDOSE. El signo importa mas que el numero:
  // una capa lejana que se acerca se cruza mas rapido que el mundo y el ojo la lee como si estuviera
  // MAS CERCA. A 0.5 u/s contra los ~4 de la camara se percibe a un octavo, que es de donde sale la
  // profundidad. Y en 18 segundos recorre 9 unidades contra un largo de 111 como minimo, asi que nunca
  // da la vuelta y no hay costura que disimular.
  //
  // CUARENTA ANILLOS Y NO VEINTISEIS: con las celdas mas chicas y el vuelo mas largo que el retrato
  // puede pedir, veintiseis anillos terminaban en la unidad -100 y la camara llegaba a -90. Los ultimos
  // beats de la pieza mas rapida se quedaban sin fondo, que es justamente donde mas se nota.
  const matCantoLejos = luz(LOOK.acento2 || LOOK.acento, 0.55)
  matCantoLejos.transparent = true; matCantoLejos.opacity = 0.34; matCantoLejos.depthWrite = false
  matCantoLejos.side = THREE.DoubleSide
  const matCaraLejos = metal(GRIS, 0.5)
  matCaraLejos.side = THREE.DoubleSide
  const fondo = tejerTubo(RT * 2.4, RC * 2.6, 40, RC * 3.9, -distBase, matCantoLejos, matCaraLejos)
  escena.add(fondo.grupo)
  capas.push({ grupo: fondo.grupo, vel: -0.5, largo: 40 * RC * 3.9 })

  // EL ROCE, y no es "mas de lo mismo": ocho anillos de celdas grandes a un radio corto que barren la
  // parte alta y baja del cuadro y desaparecen. Funciona como corte entre tiempos, no como espacio. En
  // un sitio muy aireado ensuciaria; por eso solo aparece cuando el retrato midio densidad.
  //
  // Y NO VA POR `paralaje`, que es el unico sitio donde esta plantilla se sale del vocabulario comun.
  // `paralaje` mueve una capa contra el MUNDO, y una capa que tiene que estar siempre pegada al lente
  // se define contra la CAMARA: puesta en el mundo, ocho anillos cubren veinte unidades y la camara
  // recorre setenta y tres, o sea que a los cinco beats el roce quedo atras para siempre. Se le da la
  // vuelta al alSeek y se lo ancla a `cz` — la posicion sale de la resta y el barrido, del resto.
  let roce = null
  const ROCE_PASO = RC * 1.15 * 3.2
  const ROCE_LARGO = 8 * ROCE_PASO
  if (R.capas >= 3) {
    // Ocho y no siete: el corrimiento de los anillos impares hace que la trama se repita cada DOS
    // anillos, asi que con un numero impar el salto de la vuelta invierte el patron y por un cuadro se
    // ve la costura.
    roce = tejerTubo(mundoW * 0.66, RC * 1.15, 8, ROCE_PASO, 0, matCanto, matCara)
    escena.add(roce.grupo)
  }
  if (R.capas >= 4) {
    // LA SEGUNDA PIEL, solo en los sitios mas densos que el motor midio. Va POR FUERA del tubo y se ve
    // por los huecos que deja la trama —la cara de una celda mide 0.80 del radio, asi que entre celda y
    // celda queda aire—: no se lee como objetos sino como que el panal tiene espesor.
    //
    // Sus anillos salen de `ALCANCE` y no de los del tubo: con otro paso, una fraccion fija del tubo
    // cubre otra longitud, y a velocidad 1.45 la piel se cortaba cincuenta unidades antes que el tubo.
    const pasoPiel = RC * 2.6
    const nPiel = Math.ceil(ALCANCE / pasoPiel) + 4
    const piel = tejerTubo(RT * 1.45, RC * 1.45, nPiel, pasoPiel, distBase * 1.20, matCantoLejos, matCaraLejos)
    escena.add(piel.grupo)
    capas.push({ grupo: piel.grupo, vel: -0.25, largo: nPiel * pasoPiel })
  }
  uso.capas = capas.length + (roce ? 1 : 0)

  // ---------------------------------------------------------------- donde se lee cada bloque
  //
  // SE ELIGEN PRIMERO Y TODOS JUNTOS, porque las compuertas se plantan CONTRA ELLOS. En un vuelo, la
  // posicion y el tiempo son la misma variable: `zEn(beat, lectura)` es el unico modo de que un bloque
  // este donde la camara mira cuando le toca hablar, y elegir las dos cosas por separado garantiza que
  // no coincidan.
  const Z_MARCA = zEn(5.8, distBase * 0.88)
  const Z_PROMESA = zEn(11.8, distBase * 0.90)
  const Z_PRUEBA = zEn(19.2, distBase * 0.98)
  const Z_CIFRA = (i) => zEn(25.0 + i * 1.8, distBase * 0.92)
  const Z_FRASE = (i) => zEn(25.6 + i * 2.2, distBase * 0.86)
  const Z_PEDIDO = zEn(35.0, distBase * 0.78)

  // ---------------------------------------------------------------- el espacio · las compuertas
  //
  // CADA COMPUERTA VA DETRAS DE SU BLOQUE, y esa sola regla ordena la pieza entera: como los seis
  // bloques ya estan en orden de z —cada tiempo se lee mas lejos que el anterior—, plantar cada
  // compuerta detras del suyo garantiza que TODA compuerta cerrada este siempre mas lejos que todo
  // bloque ya leido. Sin eso, un disco todavia sellado se cruza delante de un texto y lo tapa.
  //
  // Se planta contra el bloque y no contra un beat: `zEn` depende de la velocidad medida de la pagina,
  // asi que un offset en beats daria una separacion distinta en cada sitio. En unidades de mundo la
  // relacion es la misma siempre, que es lo unico que hace que esto se pueda dejar escrito.
  //
  // CUANTO DETRAS: 3.2 beats de camara, acotado entre 3 y 9 unidades. No es una constante porque no
  // puede serlo — a velocidad 0.7 la camara avanza 1.42 por beat y los bloques quedan a siete unidades
  // uno de otro, asi que un `DETRAS` fijo de 9 pondria la compuerta de un tiempo POR DELANTE del bloque
  // del siguiente. Atada al paso de camara, la separacion es siempre una fraccion del hueco que hay.
  // Y el piso de 3 la mantiene por debajo de las 12.8 unidades con que `entra(..., dist: 8)` lanza el
  // bloque desde el fondo, que es lo que hace que el bloque de verdad la ATRAVIESE.
  const PASO_BEAT = LARGO / meta.beats
  const DETRAS = Math.max(mundoH * 0.30, Math.min(mundoH * 0.90, PASO_BEAT * 3.2))
  const compuertas = [
    // La primera no tiene bloque: se abre sobre el lente en el tiempo de ESPACIO, que es como se
    // establece de una que hay una ESTRUCTURA y no un decorado. Va donde la camara esta en el beat 3.
    { z: zEn(3.0, 0), abre: 0.8, puede: 1 },
    { z: Z_MARCA - DETRAS, abre: 2.6, puede: 1 },
    { z: Z_PROMESA - DETRAS, abre: 8.6, puede: 1 },
    { z: Z_PRUEBA - DETRAS, abre: 14.6, puede: 1 },
    { z: Z_FRASE(0) - DETRAS, abre: 22.6, puede: 1 },
    // Y LA ULTIMA NO SE ABRE. Va veinte unidades MAS ALLA del final del vuelo, asi que la camara no la
    // alcanza nunca: es el fondo contra el que se lee el pedido. `puede: 0` es lo unico que la
    // distingue, y es el gesto que cierra la pieza.
    { z: zEn(meta.beats, 0) - mundoH * 2.0, abre: null, puede: 0 },
  ]
  const discos = compuertas.map((c, i) => {
    const grupo = new THREE.Group()
    grupo.position.z = c.z
    // Cada compuerta con su propio giro. Cinco discos paralelos se leen como uno repetido; a distintos
    // angulos se leen como un panal continuo visto desde adentro.
    grupo.rotation.z = (i - 2) * 0.19 + (az() - 0.5) * 0.14
    escena.add(grupo)
    const celdas = celdasDisco(RG, RC)
    // Material propio por compuerta: el desvanecido por distancia va como un numero por disco en vez de
    // `escena.fog`, que teñiria tambien el polvo y los tensores de la pagina y no coincidiria con el
    // domo, que tiene degrade.
    const mat = luz(i % 2 ? (LOOK.acento2 || LOOK.acento) : LOOK.acento, 1.15)
    mat.transparent = true; mat.opacity = 0.9; mat.depthWrite = false; mat.side = THREE.DoubleSide
    const canto = new THREE.InstancedMesh(new THREE.RingGeometry(RC * 0.80, RC * 0.98, 6, 1), mat, celdas.length)
    const nucleo = new THREE.InstancedMesh(geoNucleo, matNucleo, celdas.length)
    canto.frustumCulled = false; nucleo.frustumCulled = false
    canto.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    nucleo.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    grupo.add(canto); grupo.add(nucleo)
    // El estado de apertura es un objeto plano con UNA clave, y por eso se puede tunear: es lo que hace
    // que la compuerta se abra PARA SU BLOQUE y no solo cuando la camara ya la tiene encima.
    const est = { paso: 0 }
    if (c.abre != null) tl.to(est, { paso: 1, duration: b(2.4), ease: E.frena(2.2) }, b(c.abre))
    return { z: c.z, puede: c.puede, celdas, canto, nucleo, mat, est }
  })
  uso.compuertas = discos.length

  // ---------------------------------------------------------------- los bloques, pedidos y colocados
  //
  // LA `k` DE CADA `UTIL` ES LA MISMA A LA QUE ESE BLOQUE SE PLANTA, sin excepcion. Medir el claim
  // contra `UTIL(0.95)` y clavarlo despues a `distBase * 0.90` es el error que documenta
  // `anchoConDeriva`: el cuadro a 0.90 mide 5.06 y no 5.34, y con el margen en su tope el bloque se
  // queda sin aire. Usar una `k` MENOR que la de plantado no es defecto —subestima el cuadro y sobra
  // margen—, y por eso las cifras y las frases se quedan mas cortas de lo que podrian.
  //
  // CAMA EN LA MARCA, y por medicion: detras del nombre esta la compuerta de MARCA todavia vaciandose,
  // o sea cantos emisivos y nucleos iluminados. `nivelTexto` garantiza contraste contra la PALETA, no
  // contra lo que esta plantilla resulto poner atras.
  const marca = bloqueMarca({ alto: 1.45, anchoMax: UTIL(0.88) * 0.92, cama: true, camaOpacidad: 0.86, margen: R.margen })
  const promesa = bloquePromesa({ alto: 0.58, anchoMax: UTIL(0.90) * 0.90, margen: R.margen })
  const prueba = bloquePrueba(ctx, { ancho: mundoW * 0.52, ar: 1.62 })
  const cifras = bloquesCifra(R.cifras, { alto: 0.88, anchoMax: UTIL(0.80) * 0.40, margen: R.margen })
  const frases = bloquesFrase(R.frases, { alto: 0.30, anchoMax: UTIL(0.80) * 0.82, margen: R.margen })
  const pedido = bloquePedido({ alto: 0.34, anchoMax: UTIL(0.74) * 0.64, margen: R.margen })

  // ---------------------------------------------------------------- las celdas que llevan algo encima
  //
  // ESTO ES LO QUE UNA TRAMA DE HILOS NO PUEDE HACER, y es la razon de que `panal` exista al lado de
  // `telar`. Cuatro celdas del tubo llevan un recorte real de la pagina como cara, repartidas a lo
  // largo del recorrido: la camara las pasa en el beat 4, el 12, el 21 y el 29.
  //
  // Van DESPUES de pedir los bloques porque `recortesDe` mueve un cursor compartido: si se llamara
  // antes, `bloquePrueba` recibiria el segundo recorte en vez del mejor cuando la pagina no tiene tira.
  //
  // Y SOLO SI EL RECORTE AGUANTA EL TAMAÑO. `topeNitido` compara los pixeles reales de la imagen contra
  // los que se van a dibujar: un logo de 120 px en una cara de 1.2 unidades sale con los cantos
  // deshechos, y eso se caza al construir por dos pesos en vez de mirando cuadros. El que no aguanta no
  // se muestra mas chico ni se muestra igual: no se muestra.
  //
  // Y VAN EN `escena` Y NO EN `pagina`, que es la decision con precio. El pase de la pagina se dibuja
  // DESPUES del bloom con su propio buffer de profundidad, o sea SIEMPRE encima: una celda puesta ahi
  // se veria a traves de la pared del tubo. En la escena se ocluye bien y paga el bloom, que es
  // aceptable porque una cara mide 1.2 a 2.3 unidades y a veinte de distancia ocupa el 19% del ancho
  // del cuadro — un azulejo encendido, no una mancha que se coma el plano.
  const anchoCara = 2 * RC * 0.80
  let conCara = 0
  const vistos = new Set()
  for (const e of recortesDe(datosEls || [], ['foto', 'tarjeta', 'logo'], 6)) {
    if (conCara >= 4 || !e || vistos.has(e.url)) continue
    vistos.add(e.url)
    const t = texturas && texturas.get(e.url)
    if (!t || !t.image) continue
    if (topeNitido(t.image, W, mundoW, 1.35) < anchoCara) continue
    // EL ANILLO SE ELIGE POR BEAT DE PASADA, no por fraccion del tubo — y por fraccion era un defecto
    // mudo. El tubo mide `LARGO + 3 * distBase` porque tiene que seguir habiendo tunel por delante
    // cuando la camara llega al final; el recorrido es solo `LARGO`. Repartir las celdas al 12/33/58/80
    // por ciento del TUBO ponia la ultima en la unidad 94 de un recorrido de 73: la camara no la
    // alcanzaba nunca y esa cara no aparecia en un solo cuadro, sin error y sin nada raro.
    //
    // Con el beat de pasada, cada cara se lee unos siete beats ANTES —cuando la celda todavia esta a
    // veinte unidades y se ve casi de frente— y despues barre hacia el borde. Los cuatro beats caen uno
    // por tiempo: espacio/marca, promesa, prueba y razones.
    //
    // Y el angulo se sortea con la semilla propia, no con el indice: cuatro celdas en la misma
    // generatriz del tubo se leerian como una fila y no como un panal.
    // [13, 20, 26, 32] Y NO [7, 15, 24, 32] — y el que estaba mal era el primero, no los cuatro.
    //
    // Este mismo comentario explica dos parrafos mas arriba que cada cara se lee unos SIETE BEATS ANTES
    // de que la camara la cruce, porque a veinte unidades ya se ve casi de frente. O sea que una celda
    // puesta para el beat 7 aparece en el cuadro en el BEAT 0 — y el beat 0 es ESPACIO, que el contrato
    // de `index.js` define como el unico tiempo SIN DATOS: el espectador tiene que entender donde esta
    // parado antes de que le hablen.
    //
    // Medido con la sonda sobre las veintitres plantillas: todas dan cero mallas de pagina en los beats
    // 0 a 3 menos seis que dan una —la pagina rozando el cuadro al entrar— y esta, que daba OCHO. No
    // era un matiz: era el material del cliente en pantalla desde el primer cuadro, lo que ademas le
    // saca a PRUEBA lo unico que la hace especial.
    //
    // Con 13, la primera cara entra alrededor del beat 6, que es MARCA. El reparto se hace contra el
    // beat en que la cara APARECE, no contra el beat en que la camara la cruza.
    const jCrudo = Math.round((distBase * 1.20 - zEn([13, 20, 26, 32][conCara], 0)) / PZ)
    const j = Math.max(0, Math.min(anillosTubo - 1, jCrudo))
    const c = tubo.celdas[j * tubo.nAng + Math.floor(az() * tubo.nAng)]
    if (!c) continue
    // LA CARA SE ENCIENDE AL ACERCARSE, no existe desde el primer cuadro.
    //
    // Correr las celdas mas adelante no alcanzo —una celda a cuarenta unidades sigue ocupando el 15%
    // del ancho del cuadro— asi que el material del cliente seguia en pantalla durante ESPACIO. Y el
    // problema no era donde estaban: era que ya estaban ENCENDIDAS.
    //
    // Encenderlas al acercarse es ademas el gesto que la cabecera de esta plantilla declara: las celdas
    // se abren una por una al paso de la camara. Antes eso era una figura retorica; ahora pasa.
    const matCara = new THREE.MeshBasicMaterial({ map: caraDeRecorte(t), toneMapped: false, transparent: true, opacity: 0 })
    const m = new THREE.Mesh(new THREE.CircleGeometry(RC * 0.80, 6), matCara)
    // Tres centesimas hacia el eje: comparte plano exacto con la cara instanciada que ya esta ahi, y
    // dos planos coplanares parpadean segun de que lado los mire la camara.
    const k = 1 - 0.03 / RT
    m.position.set(c.x * k, c.y * k, c.z)
    m.lookAt(0, 0, c.z)
    // Se declara como recorte del cliente. La sonda las va a contar como imagenes de pagina y esta
    // bien que lo haga: SON la pagina, mostrada de otra manera. Sin declararlo, `nitidez-inventario`
    // dejaria de medirlas y el tope de arriba seria una promesa sin quien la revise.
    m.userData.tipoImagen = 'recorte'
    // Se abre 3.5 beats antes de la pasada y se cierra 1.5 despues: la ventana en que la cara se ve de
    // frente. Es un tween sobre `material.opacity` y no algo de `alSeek` a proposito — nadie escribe esa
    // clave desde alSeek, asi que la linea de tiempo puede quedarse con ella entera.
    const btPasa = [13, 20, 26, 32][conCara]
    tl.set(matCara, { opacity: 0 }, 0)
    tl.to(matCara, { opacity: 1, duration: b(1.6), ease: E.frena(2) }, b(btPasa - 3.5))
    tl.to(matCara, { opacity: 0, duration: b(1.1), ease: E.acelera(2) }, b(btPasa + 1.5))
    tubo.grupo.add(m)
    conCara++
  }
  uso.celdasConCara = conCara

  // ---------------------------------------------------------------- 2 · MARCA
  // Llega desde el fondo, atraviesa su compuerta mientras se escribe y se va hacia arriba ANTES de que
  // la camara la alcance. Esa ultima parte no es estetica: en un vuelo, lo que se queda te lo comes.
  if (marca) {
    marca.g.position.set(0, 0.30, Z_MARCA)
    escena.add(marca.g)
    entra(marca.g, tl, 4, { desde: 'fondo', dist: 8, dur: 2.0 })
    marca.escribir(tl, 4.5, 1.45)
    marca.borrar(tl, 8.6)
    sale(marca.g, tl, 8.8, { hacia: 'arriba', dist: 6, dur: 1.1 })
    uso.marca = true
  }

  // ---------------------------------------------------------------- 3 · PROMESA
  // Tambien desde el fondo, y a proposito: en esta plantilla lo que entra por el eje es lo que la
  // boveda dejo pasar. Sale por la derecha, que es la unica manera de que no repita el gesto anterior.
  if (promesa) {
    promesa.g.position.set(0, 0.05, Z_PROMESA)
    escena.add(promesa.g)
    entra(promesa.g, tl, 10, { desde: 'fondo', dist: 8, dur: 1.9 })
    promesa.escribir(tl, 10.5, 1.0)
    promesa.borrar(tl, 14.4)
    sale(promesa.g, tl, 14.6, { hacia: 'der', dist: 7.5, dur: 1.2 })
    uso.claim = true
    uso.claimRecortado = promesa.recortado
  }

  // ---------------------------------------------------------------- 4 · PRUEBA
  //
  // La pagina entra girada y la camara la rodea al pasar: un plano de frente con una captura encima es
  // una textura pegada; el mismo plano girando es una pantalla en un espacio.
  //
  // Y VA MONTADA DENTRO DE UNA CELDA DE SU TAMAÑO. Es lo que la ata a ESTE espacio — la funcion que en
  // `atrio` cumple el marco metalico y en `telar` los cuatro tensores—, y aca tiene que ser un hexagono
  // o la pagina se lee como el unico objeto de la pieza que no es del panal.
  //
  // LA CUENTA DEL HEXAGONO, que decide si entra o no entra: un hexagono con punta arriba de radio Rh
  // mide `SQ3 * Rh` de ancho y `2 * Rh` de alto. Para envolver una pagina de `a` por `h` hace falta
  // `Rh >= max(a / SQ3, h / 2)`. Con la tira (2.93 x 4.74) da 2.37, o sea 4.10 de ancho, contra un
  // cuadro util de 4.55 a esa distancia: entra con 45 centesimas.
  //
  // Y SI NO ENTRA, NO VA. Acotarlo lo dejaria cortando la pagina por los lados, que dice exactamente lo
  // contrario de lo unico que el marco esta para decir. Es la misma leccion que pagaron los tensores de
  // `telar`, sobre otro objeto.
  if (prueba) {
    prueba.g.position.set(0, 0, Z_PRUEBA)
    prueba.g.rotation.y = -0.52
    const Rh = Math.max(prueba.ancho / SQ3, prueba.alto / 2) * 1.04
    const utilAqui = anchoADistancia(mundoW, distBase, distBase * 0.98, DERIVA)
    if (SQ3 * Rh <= utilAqui) {
      // Emisivo y NO metal: esta malla vive en la escena de la PAGINA, que no tiene una sola luz. Un
      // material fisico ahi renderiza negro, que es la trampa que documenta `nucleo.js` en `metal()`.
      const matHex = luz(LOOK.acento, 1.3)
      matHex.side = THREE.DoubleSide
      // NO se llama `hex`: `kit.js` ya exporta un `hex()` que significa otra cosa —convertir una cadena
      // de color a `THREE.Color`— y esta plantilla importa de los dos modulos. Dos nombres iguales con
      // dos significados en el mismo archivo es un error que no da sintomas hasta que alguien edita.
      const celdaPagina = new THREE.Mesh(new THREE.RingGeometry(Rh * 0.975, Rh * 1.02, 6, 1), matHex)
      // 30 grados: `RingGeometry` nace con los vertices en 0 y 180, o sea punta a los costados. La
      // pagina es vertical y necesita la punta arriba, que es donde le sobra alto.
      celdaPagina.rotation.z = Math.PI / 6
      celdaPagina.position.z = -0.03
      // Al grupo de AFUERA y no al de adentro: el hexagono llega entero con la entrada y la pagina se
      // enciende por escala adentro de el, que se lee como que la celda la revela.
      prueba.g.add(celdaPagina)
      uso.celdaPagina = true
    }
    pagina.add(prueba.g)
    entra(prueba.g, tl, 16, { desde: 'fondo', dist: 8, dur: 2.2 })
    prueba.escribir(tl, 16.4, 1.2)
    prueba.recorrer(tl, 17.2, 5.6, 0.94)
    tl.to(prueba.g.rotation, { y: 0.32, duration: b(6.6), ease: 'none' }, b(16.6))
    sale(prueba.g, tl, 22.8, { hacia: 'izq', dist: 7, dur: 1.3 })
    respiraciones.push(respirar(prueba.g, { amp: 0.12, giro: 0.026, fase: 0.8 }))
    uso.pagina = prueba.fuente
  }

  // ---------------------------------------------------------------- 5 · RAZONES
  //
  // Las cifras NO entran por el eje: llegan pegadas a la pared del tubo, cada una por su costado, y se
  // van por el mismo. Es el unico tiempo que puede tener dos cosas a la vez, y separar las familias por
  // POR DONDE ENTRAN es lo que evita que se lean como una lista.
  //
  // 0.24 del semiancho y no 0.34: la cifra mide `UTIL(0.80) * 0.40 = 1.70`, o sea 0.85 de semiancho, y
  // el cuadro util a `0.92 * distBase` mide 2.32 de semiancho. A 0.34 el ultimo digito se sale cuando
  // la deriva llega a su pico, que es exactamente como `atrio` perdio el primer digito de un `10X`.
  cifras.forEach((c, i) => {
    const s = i % 2 === 0 ? -1 : 1
    const t0 = 24 + i * 1.8
    c.g.position.set(s * mundoW * 0.24, 0.70 - i * 0.70, Z_CIFRA(i))
    c.g.rotation.y = s * 0.30
    escena.add(c.g)
    entra(c.g, tl, t0, { desde: s < 0 ? 'izq' : 'der', dist: 5.4, dur: 1.3 })
    c.escribir(tl, t0 + 0.3, 0.78)
    sale(c.g, tl, t0 + 2.1, { hacia: s < 0 ? 'izq' : 'der', dist: 5.8, dur: 1.0 })
  })
  uso.cifras = cifras.length

  frases.forEach((f, i) => {
    const t0 = 24.6 + i * 2.2
    f.g.position.set(0, -1.85, Z_FRASE(i))
    escena.add(f.g)
    entra(f.g, tl, t0, { desde: 'abajo', dist: 4.5, dur: 1.4 })
    f.escribir(tl, t0 + 0.4, 0.82)
    f.borrar(tl, t0 + 2.0)
    sale(f.g, tl, t0 + 2.2, { hacia: 'abajo', dist: 5, dur: 1.0 })
  })
  uso.frases = frases.length

  // ---------------------------------------------------------------- 6 · PEDIDO
  //
  // LA BOVEDA SE SELLA. `cierre` contrae la ultima compuerta un 22% justo antes de que llegue el CTA:
  // la camara sigue a la misma velocidad —la regla 1 no permite otra cosa— pero lo que hay por delante
  // deja de abrirse y empieza a apretarse, y eso se percibe como llegar. Es la unica manera honesta de
  // "bajar a velocidad de lectura" con un vuelo lineal, que es el que `zEn` sabe medir.
  const est = { cierre: 1 }
  tl.to(est, { cierre: 0.78, duration: b(3.6), ease: E.frena(2.2) }, b(30.2))
  let latido = null
  if (pedido) {
    pedido.g.position.set(0, 0.15, Z_PEDIDO)
    escena.add(pedido.g)
    entra(pedido.g, tl, 31, { desde: 'fondo', dist: 6, dur: 2.0 })
    pedido.escribir(tl, 31.5, 0.9)
    latido = pedido.latir(0.032)
    uso.cta = pedido.tieneCta
    // El unico sitio de la pieza donde la luz sube. El ojo lo lee como que algo se resolvio, y cuesta
    // un tween.
    tl.to(ctx.bloom, { strength: (ctx.bloom.strength || 0.5) * 1.7, duration: b(2.4), ease: E.frena(2) }, b(31))
  }

  // ---------------------------------------------------------------- lo continuo
  //
  // Todo el panal vive aca y no en tweens, por dos razones. La de siempre: se evalua en CADA submuestra
  // del obturador, y un movimiento continuo escrito como tween se muestrea una vez por cuadro y sale a
  // saltos. Y una propia: la apertura no se anima, SE CALCULA — contra el tween de su compuerta y contra
  // donde esta la camara—, asi que sigue siendo correcta aunque se muevan los beats, la duracion o el
  // largo del vuelo.
  //
  // Y TODO LO DE ACA ASIGNA, NO SUMA, y eso es lo que corresponde: ningun tween anima una matriz de
  // instancia ni el giro del tubo. Sumar donde no hay tween que restablezca acumula en cada submuestra
  // del obturador y el motor deja de ser determinista — la velocidad del giro dependeria de cuantas
  // veces se hubiera llamado a `alSeek`. Al reves, `respirar` sobre la pagina SUMA, porque ahi si hay
  // una entrada y un giro tuneados que quedarian anulados.
  const mover = paralaje(capas)
  const eje = new THREE.Object3D()
  const alSeek = juntar(vuelo.alSeek, mover, latido, (t) => {
    uDomo.uT.value = t
    const cz = camara.position.z
    for (const p of discos) {
      const d = Math.abs(p.z - cz)
      // Dos motivos para abrirse, y gana el mayor. El tween es el GESTO —la compuerta se abre para su
      // bloque, aunque la camara este a treinta unidades—; la proximidad es la RED DE SEGURIDAD, y
      // existe para que ninguna celda pueda pasar por el lente pase lo que pase con los beats.
      const k = Math.min(1, Math.max(p.est.paso, 1 / (1 + d * d * CERCA)))
      const abre = (1 + APERTURA * k * p.puede) * est.cierre
      for (let i = 0; i < p.celdas.length; i++) {
        const c = p.celdas[i]
        // El canto se DILATA con la trama entera: las celdas siguen encastrando entre si mientras el
        // panal crece, que es lo que lo mantiene leyendose como una trama y no como piezas sueltas.
        eje.position.set(c.x * abre, c.y * abre, 0)
        eje.rotation.set(0, 0, 0)
        eje.scale.setScalar(abre)
        eje.updateMatrix()
        p.canto.setMatrixAt(i, eje.matrix)
        // El nucleo, ademas, SE VACIA — y escalonado por anillo, que es el gesto entero de la plantilla.
        // Se hunde hacia el fondo de su celda mientras se achica; cuando `q` llega a 1 la celda quedo
        // hueca y por ahi pasa lo que tenga que pasar.
        const q = p.puede ? Math.min(1, Math.max(0, (k - c.anillo * ESCALON) / VENTANA)) : 0
        // 0.0001 y no 0: una escala exacta de cero deja la matriz sin inversa y three tira un warning
        // por cuadro, o sea uno por celda y por submuestra.
        const e = Math.max(0.0001, abre * (1 - q))
        eje.position.set(c.x * abre, c.y * abre, -q * RC * 2.2)
        eje.scale.setScalar(e)
        eje.updateMatrix()
        p.nucleo.setMatrixAt(i, eje.matrix)
      }
      p.canto.instanceMatrix.needsUpdate = true
      p.nucleo.instanceMatrix.needsUpdate = true
      // El desvanecido por distancia. Una compuerta a cuarenta unidades tiene que insinuarse, no
      // dibujarse: sin esto el corredor entero se ve de una y no queda nada por descubrir.
      p.mat.opacity = Math.max(0.10, Math.min(0.90, 1.20 - d * 0.015))
    }
    // EL ROCE, anclado a la camara y no al mundo (ver arriba). `s` va de 0 a `ROCE_LARGO` y vuelve a
    // empezar: los anillos aparecen a `ROCE_LARGO` por delante y barren hasta quedar sobre el lente,
    // donde a ese radio ya estan fuera del cuadro, asi que la vuelta no se ve. 9 u/s contra los ~4 de
    // la camara: se cruza a mas del doble de lo que pasa el tubo, que es lo que lo vuelve un corte.
    if (roce) {
      const s = (t * 9.0) % ROCE_LARGO
      roce.grupo.position.z = cz - ROCE_LARGO + s
    }
    // EL TUBO RUEDA, lentisimo y en sentido contrario al fondo. Doce grados en toda la pieza: no se
    // percibe como giro sino como que el panal es un objeto y no un fondo pintado.
    tubo.grupo.rotation.z = t * 0.012
    fondo.grupo.rotation.z = -t * 0.020
    motas.position.z = cz
    motas.rotation.z = t * 0.014
  }, ...respiraciones)

  return { dur: b(meta.beats), alSeek, uso }
}
