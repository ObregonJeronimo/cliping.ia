// PLANTILLA "marea" — un plano liquido que ondula de verdad, y la camara volando al ras del agua.
//
// EL GESTO
// No hay arquitectura, ni objeto protagonico, ni multitud: hay UNA superficie que se mueve y un ojo a
// un metro y medio de ella. Todo lo que pasa en la pieza pasa SOBRE el agua — los bloques flotan, se
// hamacan con la ola, salen del mar y vuelven a hundirse. Es la plantilla para una marca que vende
// calma o cuidado: bienestar, cosmetica, una bebida, un viaje. Una marca que quiere verse rapida no
// tiene que elegir esta.
//
// EN QUE SE DIFERENCIA DE `deriva`, que es la otra de la familia `atmosfera`
// Alli lo atmosferico es la NIEBLA y lo que la camara esquiva son objetos sueltos en el aire; el
// espacio no tiene forma. Aca el espacio tiene una sola forma, es continua, y es lo unico que se
// mueve por su cuenta: el mar. `deriva` serpentea entre cosas, `marea` va derecho sobre una cosa.
//
// LA REGLA DEL AGUA — UNA SOLA FUNCION PARA TODO
// `ola(x, z, t)` devuelve la altura de la superficie en un punto del mundo Y sus dos pendientes. La
// usan las cuatro cosas que tienen que estar de acuerdo: los vertices de la malla, la altura a la que
// flota cada bloque, la inclinacion con que se hamaca, y la altura del ojo de la camara. Escribir la
// ola dos veces —una para la geometria y otra para colocar los bloques— es como se consigue que el
// texto flote medio metro por encima o por debajo del agua que se ve, y no hay compuerta que lo cace.
//
// TRES TRENES DE OLA CON LARGOS QUE NO SON MULTIPLOS entre si. Dos senos conmensurables vuelven a
// alinearse y el mar se percibe en bucle a los pocos segundos, que es exactamente lo contrario de lo
// que un mar tiene que transmitir.
//
// POR QUE ESTA PIEZA TIENE NIEBLA Y NINGUNA OTRA LA TIENE
// Un plano finito visto desde 1.3 unidades de altura termina en un BORDE, y ese borde cae siempre un
// poco por debajo del horizonte: a 68 unidades de largo son atan(1.3/68) = 1.1 grados, o sea 66 px de
// costura en un cuadro de 1920. La niebla lo disuelve antes de que llegue y ademas da perspectiva
// aerea, que es lo que hace legible el paralaje. Su color REPRODUCE el del domo a la altura del
// horizonte para que el mar se funda con el cielo y no contra el.
//
// LOS SEIS TIEMPOS (beats sobre 38)
//   0   ESPACIO   el mar, el camino de brillos y los anillos flotando. Nada de texto.
//   5   MARCA     el nombre EMERGE del agua, se planta sobre la marea y se va hacia arriba.
//   12  PROMESA   el claim cruza el cuadro de izquierda a derecha, hamacandose.
//   18  PRUEBA    la pagina entra girada por la derecha, apoyada en el agua, y la camara la pasa.
//   26  RAZONES   las cifras salen del mar de a una, a un lado y al otro, y se hunden.
//   33  PEDIDO    el mar se aquieta, la veladura baja y el CTA sale del agua — y se queda.
//
// SIN MATERIAL: sin tira, PRUEBA usa el recorte mas grande; sin recortes, ese tiempo se compone vacio
// y queda el mar solo. Lo que no hay, no se anuncia.

import { THREE, vidrio, metal, luz, iluminar, domo, polvo } from '../nucleo.js'
import { entra, sale, respirar, juntar, anchoConDeriva } from '../movimiento.js'
import { bloqueMarca, bloquePromesa, bloquePrueba, bloquesCifra, bloquesFrase, bloquePedido } from '../bloques.js'
import { colorDePeso, grisDePeso } from '../recetas.js'
import { LOOK, hex, nivel, CLARO, E, b } from '../../demo/kit.js'

export const meta = {
  id: 'marea',
  nombre: 'Marea',
  familia: 'atmosfera',
  necesita: ['nada'],
  beats: 38,
  tiempos: { espacio: 0, marca: 5, promesa: 12, prueba: 18, razones: 26, pedido: 33 },
  pitch: 'Un mar que ondula de verdad y la cámara volando al ras. De bienestar, cosmética, bebida o viaje.',
}

// El ojo va en y = 0 y el mar aca abajo: la altura de vuelo es este numero, y 1.3 sobre un cuadro de
// 10 de alto es volar practicamente tocando el agua. Subirlo convierte la pieza en un plano de dron y
// se pierde lo unico que la define, que es tener la superficie encima del ojo casi todo el rato.
const NIVEL = -1.3

export function build(ctx) {
  const { escena, pagina, camara, tl, mundoW, distBase } = ctx
  const uso = {}

  // ---------------------------------------------------------------- LO QUE LA PAGINA DECIDE
  //
  // `ctx.recetas` sale de `backend/retrato.py`, que mide la tira, el DOM y los recortes de ESTA pagina.
  // Sin retrato devuelve los valores neutros y la plantilla compone como se componia antes: no hay una
  // rama distinta ni un caso especial. Lo que se modula es el GRADO, nunca la idea.
  //
  // La explicacion larga de cada receta esta en `render3d/boveda/recetas.js`, y la de por que existe
  // este mecanismo, en `atrio.js`.
  const R = ctx.recetas || { velocidad: 1, capas: 3, dureza: 0.75, margen: 0.88, cifras: 3, frases: 2,
    acentoMasa: false, vacio: 0.5, movimientos: 4, paleta: [], medido: false }
  uso.retrato = !!R.medido
  const respiraciones = []

  // Key alta y relleno generoso: una superficie casi lisa devuelve luz en un solo sitio, y con key
  // baja el mar entero queda plano. Lo que dibuja la ola no es la sombra, es el especular corriendo.
  iluminar(escena, { key: 1.20, relleno: 0.70 })

  // El piso del domo se pide explicito y no por defecto porque la niebla tiene que copiarlo: son dos
  // numeros que describen el mismo horizonte y si se separan, se ve la costura que la niebla existe
  // para tapar.
  const PISO = CLARO ? 0.66 : 0.86
  const uDomo = domo(escena, { fuerza: 0.30, piso: PISO })
  const motas = polvo(escena, 1400, 24)

  // ---------------------------------------------------------------- la niebla
  //
  // El color es la cuenta del domo evaluada en el horizonte: mezcla de `bg` y `bg2` a la mitad, con el
  // oscurecimiento del suelo que el shader aplica en d.y = 0 —smoothstep(0.52, -0.25, 0) = 0.752— y un
  // toque de acento, que es lo que el domo pone encima con su veladura.
  //
  // Se opera sobre `THREE.Color`, que viene en LINEAL, y esta bien: la trampa documentada del repo es
  // MEDIR contraste sobre `.r/.g/.b` (hay que medir sobre el hex), no mezclar. Mezclar dos colores en
  // lineal es justamente lo correcto, y es ademas lo que hace el shader del domo.
  const cNiebla = hex(LOOK.bg).lerp(hex(LOOK.bg2 || LOOK.bg), 0.5).lerp(hex(LOOK.acento), 0.14)
  cNiebla.multiplyScalar(1 - 0.752 * (1 - PISO))
  // ARRANCA MAS LEJOS QUE CUALQUIER BLOQUE DE TEXTO, y eso no es holgura sino requisito: la niebla
  // pinta camas y pastillas (son `MeshBasicMaterial`) pero NO pinta los textos (son `ShaderMaterial`,
  // que ignora `fog` salvo que uno lo escriba). Una cama desteñida detras de un texto que no se
  // destiñe es un contraste que nadie midio. El instante mas lejano de la pieza es la PROMESA cuando
  // arranca su entrada, a 20.2 del lente; esto empieza a teñir en 22.6.
  escena.fog = new THREE.Fog(cNiebla, distBase * 1.30, distBase * 3.60)

  // ---------------------------------------------------------------- la ola
  //
  // Largos primos entre si a ojo (13, 7.3, 4.1) y velocidades distintas. Los tres viajan hacia +z, o
  // sea CONTRA la camara: sumar la velocidad de la ola a la de la camara es lo que da sensacion de
  // avance en un espacio sin nada plantado con que medirlo.
  const OLAS = [
    { dx: 0.00, dz: 1.00, largo: 13.0, amp: 0.260, vel: 1.55, fase: 0.0 },
    { dx: 0.62, dz: 0.78, largo: 7.30, amp: 0.140, vel: 1.10, fase: 2.1 },
    { dx: -0.86, dz: 0.51, largo: 4.10, amp: 0.055, vel: 0.72, fase: 4.7 },
  ].map(o => {
    const k = Math.PI * 2 / o.largo
    return { kx: o.dx * k, kz: o.dz * k, w: k * o.vel, a: o.amp, f: o.fase }
  })

  // El mar se aquieta para el PEDIDO. Es un multiplicador y no tres tweens porque asi la superficie,
  // los bloques y el ojo bajan a la vez: si el agua se calmara y el texto siguiera hamacandose, el
  // texto dejaria de estar apoyado en nada.
  const mar = { amp: 1 }

  // DEVUELVE UN OBJETO COMPARTIDO Y NO UNO NUEVO. Esto se llama ~6300 veces por submuestra —una por
  // vertice— y a 4 submuestras por cuadro son 19 millones de llamadas en una pieza: un objeto por
  // llamada es basura suficiente para que el recolector aparezca en medio del render.
  const _o = { h: 0, hx: 0, hz: 0 }
  const ola = (x, z, t) => {
    let h = 0, hx = 0, hz = 0
    for (let i = 0; i < OLAS.length; i++) {
      const o = OLAS[i]
      const a = o.kx * x + o.kz * z - o.w * t + o.f
      const s = Math.sin(a), c = Math.cos(a)
      h += o.a * s
      hx += o.a * o.kx * c
      hz += o.a * o.kz * c
    }
    _o.h = h * mar.amp; _o.hx = hx * mar.amp; _o.hz = hz * mar.amp
    return _o
  }

  // ---------------------------------------------------------------- el vuelo, propio
  //
  // Es un avance —y podria ser `vueloAvance`— salvo por una cosa: la regla 1 dice que la camara puede
  // BAJAR la velocidad para el pedido, y `vueloAvance` interpola en linea recta con ease 'none', asi
  // que no puede frenar. Un mar tranquilo con la camara a velocidad de crucero en el CTA se contradice
  // solo, y frenar con un segundo tween sobre `camara.position.z` deja dos tweens peleando la misma
  // propiedad.
  //
  // Asi que el perfil de velocidad se escribe entero: 1 hasta el beat del pedido y de ahi baja lineal
  // hasta V_MIN. La distancia recorrida es la INTEGRAL de eso, y sale exacta porque el perfil es una
  // recta. V_MIN es 0.36 y no 0: la camara llega al final a un tercio de su velocidad, que se lee como
  // "se acomodo", no como "se detuvo".
  const BEATS = meta.beats
  // El recorrido se estira o se acorta con la ENERGIA medida de la pagina: mismo tiempo, mas o menos
  // camino, que es literalmente la velocidad. Sin retrato, `R.velocidad` vale 1 y no cambia nada.
  const LARGO = distBase * 3.2 * R.velocidad
  const Z0 = distBase * 0.92
  const U_FRENO = meta.tiempos.pedido / BEATS
  const V_MIN = 0.36
  const S = (u) => {
    if (u <= U_FRENO) return u
    const d = u - U_FRENO
    const R = 1 - U_FRENO
    return U_FRENO + d - (1 - V_MIN) * d * d / (2 * R)
  }
  const S1 = S(1)
  const zDe = (u) => Z0 - LARGO * S(Math.min(1, Math.max(0, u))) / S1
  // `zEn` SALE DE LA MISMA `S`, y por eso no puede desincronizarse. Es la trampa que `movimiento.js`
  // documenta para los tres vuelos: en un vuelo continuo la posicion y el tiempo son la misma
  // variable, y elegirlas por separado garantiza que no coincidan.
  const zEn = (beat, lectura) => zDe(beat / BEATS) - lectura

  const DERIVA = 0.50
  // El picado es lo que sube el horizonte y le da al mar mas de la mitad del cuadro. 0.05 rad sobre un
  // fov vertical de 32 grados (0.5585 rad) corre la imagen un 9% de la altura: se nota, no marea.
  const PICADO = -0.05
  const UTIL = (k) => anchoConDeriva(mundoW, DERIVA, k)

  // ---------------------------------------------------------------- el espacio: la superficie
  //
  // LA MALLA SE MIDE CONTRA LA NIEBLA, NO CONTRA EL HORIZONTE. Si el plano tiene que desaparecer antes
  // de la distancia en que la niebla lo tapa del todo (62.6), alcanza con 68 por delante — y con eso
  // el resto del presupuesto de vertices se gasta donde se ve, que es cerca. Un plano gigante con la
  // misma cantidad de vertices tiene el paso tan grande que el oleaje cercano sale poligonal.
  //
  // Paso de 0.7 unidades contra la ola mas corta, que mide 4.1: casi seis muestras por largo de onda.
  // Con paso 1 —que es lo que da un plano del doble— serian cuatro y el tren chico se convierte en
  // ruido triangular.
  const AGUA_W = 34, AGUA_L = 90, SEG_W = 48, SEG_L = 128
  const DESP = 23 // el plano va corrido: 68 por delante del ojo y 22 por detras
  const geoAgua = new THREE.PlaneGeometry(AGUA_W, AGUA_L, SEG_W, SEG_L)
  // SE HORNEA LA ROTACION EN LA GEOMETRIA en vez de rotar la malla. Con la malla rotada, el atributo
  // que hay que mover para levantar un vertice es el Z local y la profundidad del mundo es el Y local
  // negado: dos traducciones mentales en el bucle mas caliente de la pieza. Horneada, el atributo Y es
  // la altura y el Z es la profundidad, que es como se lee la formula de la ola.
  geoAgua.rotateX(-Math.PI / 2)
  const posAgua = geoAgua.attributes.position
  const norAgua = geoAgua.attributes.normal
  const N_V = posAgua.count
  const VX = new Float32Array(N_V), VZ = new Float32Array(N_V)
  for (let i = 0; i < N_V; i++) { VX[i] = posAgua.getX(i); VZ[i] = posAgua.getZ(i) }
  const arrPos = posAgua.array, arrNor = norAgua.array

  // Agua tintada con el acento. `nivel(0.24)` esta del lado CLARO de la rampa a proposito: la trampa
  // que documenta `nucleo.js` es un piso de metal oscuro, que sin mapa de entorno renderiza negro y se
  // come medio cuadro — y aca el piso ocupa mas de la mitad del cuadro todo el tiempo.
  // Rugosidad 0.26 y no 0.10: con una luz direccional, una superficie casi espejada devuelve un punto
  // brillante y nada mas. A 0.26 el reflejo se estira en una veta que recorre la ola, que es lo que se
  // lee como agua.
  const agua = new THREE.Mesh(geoAgua, metal(nivel(0.24, 0.30), 0.26))
  agua.frustumCulled = false // los vertices se mueven fuera de la esfera que se calculo al construir
  agua.position.y = NIVEL
  escena.add(agua)

  // ---------------------------------------------------------------- las capas que se reciclan
  //
  // DOS SORTEOS DISTINTOS Y NO UNO, y esto es lo unico delicado del archivo.
  //
  // El LCG de abajo sirve para lo que se decide una vez al construir. Pero el camino de brillos y los
  // anillos estan CLAVADOS AL MUNDO y se reciclan: cuando la camara pasa uno, esa malla se reutiliza
  // mucho mas adelante. Si su tamaño y su desvio salieran del orden en que le tocaron, cambiarian al
  // reciclarse y el objeto saltaria en pleno cuadro. Salen de un hash de la RANURA de mundo que
  // ocupan, asi que la ranura n tiene siempre las mismas propiedades y el reciclado es invisible.
  let sem = 90311
  const az = () => { sem = (sem * 1664525 + 1013904223) >>> 0; return sem / 4294967296 }
  const hash01 = (n) => {
    let h = Math.imul(n | 0, 374761393) + 668265263
    h = Math.imul(h ^ (h >>> 13), 1274126177)
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296
  }

  // EL CAMINO DE BRILLOS. Tejas planas apenas encima del agua que se encienden solo donde la pendiente
  // hacia el ojo entra en la banda del reflejo. Es el destello del sol sobre el mar y cuesta una resta
  // por teja: sin el, una superficie lisa a esta hora del dia no tiene de donde brillar.
  const N_TEJA = 26, SEP_TEJA = 2.1, DELANTE_TEJA = 5
  const matBrillo = luz(LOOK.acento2 || LOOK.acento, 1.25)
  matBrillo.transparent = true
  matBrillo.opacity = 0.55
  matBrillo.blending = THREE.AdditiveBlending
  matBrillo.depthWrite = false
  const geoTeja = new THREE.PlaneGeometry(0.34, 1.5)
  geoTeja.rotateX(-Math.PI / 2)
  const tejas = []
  for (let i = 0; i < N_TEJA; i++) {
    const m = new THREE.Mesh(geoTeja, matBrillo)
    escena.add(m)
    tejas.push(m)
  }

  // LOS ANILLOS. Un disco de vidrio con un aro encendido encima, flotando. Son la capa media: dan
  // escala —sin un objeto de tamaño conocido, un mar es un degrade— y son lo unico de la pieza que se
  // ve como un objeto y no como una superficie.
  //
  // VAN FUERA DEL CORREDOR CENTRAL. Todos los textos caen en |x| < 2.4, asi que el BORDE DE ADENTRO del
  // anillo —no su centro— arranca en 2.6 y de ahi se abren hacia afuera: uno cruzandose por detras de
  // una cifra la vuelve ilegible sin que ninguna medicion lo diga. Aca el 2.6 se le daba al CENTRO y el
  // radio (hasta 1.5) se comia la diferencia: medido sobre las ranuras que la pieza recorre de verdad,
  // el peor anillo metia su borde hasta 1.81, adentro del corredor que este parrafo declara vacio.
  const N_ANILLO = 11, SEP_ANILLO = 6.2, DELANTE_ANILLO = 7
  const geoDisco = new THREE.CylinderGeometry(1, 1, 0.06, 28)
  const geoAro = new THREE.RingGeometry(0.86, 1.0, 44)
  geoAro.rotateX(-Math.PI / 2)
  const matDisco = vidrio(colorDePeso(R, LOOK.acento, 0.20), { rug: 0.10, trans: 0.78, grosor: 1.4, opacidad: 0.86 })
  const matAro = luz(LOOK.acento2 || LOOK.acento, 1.1)
  const anillos = []
  for (let i = 0; i < N_ANILLO; i++) {
    const g = new THREE.Group()
    g.add(new THREE.Mesh(geoDisco, matDisco))
    const aro = new THREE.Mesh(geoAro, matAro)
    aro.position.y = 0.05
    g.add(aro)
    escena.add(g)
    anillos.push(g)
  }
  // Una fase propia por anillo para que respiren desacompasados. Sale del LCG porque se decide una vez
  // y no depende de la ranura: es un desfase de tiempo, no una propiedad del sitio.
  const faseAnillo = anillos.map(() => az() * 6.28)

  // ---------------------------------------------------------------- flotar
  //
  // TODO BLOQUE VIVE EN DOS GRUPOS, por la colision que documenta `bloques.js`: el de afuera lo
  // escribe `alSeek` con la ola, el de adentro lo escriben `entra`/`sale`/`respirar`. Con uno solo se
  // pelean `position` y gana el ultimo que corra, que es como se consigue una entrada que no se ve.
  //
  // `alto` es la altura del CENTRO del bloque sobre el agua en calma. Un bloque cuyo centro esta a la
  // mitad de su altura toca la superficie con el borde de abajo, que es lo que hace que se lea apoyado
  // y no pegado encima.
  const flotantes = []
  const flotar = (blk, op) => {
    const g = new THREE.Group()
    g.add(blk.g)
    ;(op.padre || escena).add(g)
    const x = op.x || 0
    const z = zEn(op.beat, op.lectura != null ? op.lectura : distBase * 0.96)
    const alto = op.alto != null ? op.alto : 2.4
    g.position.set(x, NIVEL + alto, z)
    // `sigue` por debajo de 1: un bloque que copiara la ola entera se hamacaria tanto como el agua y
    // el renglon se volveria dificil de seguir. Sigue lo suficiente para pertenecer al mar, no tanto
    // como para marear al que lee.
    flotantes.push({
      g, x, z, alto,
      sigue: op.sigue != null ? op.sigue : 0.65,
      giro: op.giro != null ? op.giro : 0.22,
    })
    return g
  }

  // ---------------------------------------------------------------- los bloques, pedidos y colocados
  const marca = bloqueMarca({ alto: 1.35, anchoMax: UTIL(0.94) * 0.92, cama: true, camaOpacidad: 0.80 , margen: R.margen })
  const promesa = bloquePromesa({ alto: 0.56, anchoMax: UTIL(0.98) * 0.90 , margen: R.margen })
  const prueba = bloquePrueba(ctx, { ancho: mundoW * 0.50, ar: 1.5 })
  const cifras = bloquesCifra(R.cifras, { alto: 0.88, anchoMax: UTIL(0.84) * 0.40 , margen: R.margen })
  const frases = bloquesFrase(R.frases, { alto: 0.30, anchoMax: UTIL(0.84) * 0.80 , margen: R.margen })
  const pedido = bloquePedido({ alto: 0.33, anchoMax: UTIL(0.86) * 0.62 , margen: R.margen })

  // ---------------------------------------------------------------- 2 · MARCA
  //
  // EMERGE DEL AGUA, y es el gesto que solo esta plantilla puede hacer. Sale desde 5.8 por debajo del
  // nivel, o sea tapado por la superficie —los textos son transparentes con test de profundidad, asi
  // que el mar opaco los oculta de verdad— y el `back.out` de `entra` lo hace pasarse un poco y
  // acomodarse, que es como sale algo del agua.
  //
  // La cama va encendida por lo mismo que en `atrio`: `nivelTexto` garantiza contraste contra la
  // PALETA, no contra lo que la plantilla resulto poner detras, y detras del nombre hay cielo con una
  // veladura de acento que barre lentamente. Opacidad 0.80 y no 0.88: aca tiene que leerse como un
  // velo de bruma sobre el agua, no como una placa apoyada encima.
  if (marca) {
    flotar(marca, { alto: 2.60, beat: 6.9, lectura: distBase * 0.96, sigue: 0.55, giro: 0.16 })
    entra(marca.g, tl, 5, { desde: 'abajo', dist: 5.8, dur: 2.0 })
    marca.escribir(tl, 5.5, 1.5)
    marca.borrar(tl, 10.2)
    // Se va HACIA ARRIBA y no de vuelta al agua: es lo unico que sube en toda la pieza y por eso se
    // lee como que la marca queda por encima de lo demas. Lo demas vuelve al mar.
    sale(marca.g, tl, 10.4, { hacia: 'arriba', dist: 6, dur: 1.1 })
    uso.marca = true
  }

  // ---------------------------------------------------------------- 3 · PROMESA
  // CRUZA el cuadro en vez de posarse: entra por la izquierda y se va por la derecha. En una pieza
  // donde todo sale y entra por el eje vertical, el claim es el unico movimiento horizontal y por eso
  // se destaca sin necesidad de ser mas grande.
  if (promesa) {
    flotar(promesa, { alto: 2.35, beat: 13.8, lectura: distBase * 1.00, sigue: 0.60, giro: 0.20 })
    entra(promesa.g, tl, 12, { desde: 'izq', dist: 6.5, dur: 1.8 })
    promesa.escribir(tl, 12.5, 1.0)
    promesa.borrar(tl, 16.5)
    sale(promesa.g, tl, 16.7, { hacia: 'der', dist: 7, dur: 1.2 })
    uso.claim = true
    uso.claimRecortado = promesa.recortado
  }

  // ---------------------------------------------------------------- 4 · PRUEBA
  //
  // ENTRA POR EL COSTADO Y NO DESDE EL AGUA, aunque salir del mar seria el gesto de la casa. La razon
  // es del rig y no de la composicion: la pagina vive en `escenaPagina`, que se dibuja en un pase
  // POSTERIOR y sin la profundidad de la escena principal, asi que el mar NO la puede ocultar. Una
  // pagina "emergiendo" se veria entera y flotando debajo del agua, que es peor que no intentarlo.
  //
  // El giro es lo que la vuelve objeto: un plano de frente con una captura encima es una textura
  // pegada; el mismo plano girando mientras la camara lo pasa es una pantalla parada en el mar.
  //
  // LA ALTURA SALE DE `prueba.alto` MEDIDO, NO DE UN NUMERO ESCRITO A MANO. Aca decia `alto: 2.20`,
  // que es exactamente la mitad de 4.22 mas 0.09 — o sea el borde de abajo apoyado en el agua— PERO
  // 4.22 es el alto de la rama TIRA (`ancho * ar`, con el `ar: 1.5` que pide esta plantilla). Cuando no
  // hay tira, `bloquePrueba` cae al recorte mas grande y ahi el alto lo decide la PROPORCION DE LA
  // IMAGEN: con una foto apaisada (ar 1.78) el panel mide 1.58 y queda FLOTANDO 1.41 sobre el mar; con
  // una vertical (ar 0.60) mide 4.69 y el borde de abajo se HUNDE 0.14 — y como la pagina vive en
  // `escenaPagina`, que se dibuja en un pase posterior, el mar no la tapa: se ve el panel metido dentro
  // del agua, que es justo lo que dos parrafos mas arriba se descarta como peor que no intentarlo.
  // `prueba.alto` es el alto YA MEDIDO por el bloque en las dos ramas, asi que esto apoya siempre. Para
  // la tira da 2.1994, o sea el mismo cuadro que habia.
  if (prueba) {
    flotar(prueba, { alto: prueba.alto / 2 + 0.09, beat: 20.6, lectura: distBase * 1.02, sigue: 0.85, giro: 0.28, padre: pagina })
    prueba.g.rotation.y = 0.66
    entra(prueba.g, tl, 18, { desde: 'der', dist: 6.8, dur: 2.2 })
    prueba.escribir(tl, 18.3, 1.2)
    prueba.recorrer(tl, 19, 6.0, 0.92)
    tl.to(prueba.g.rotation, { y: -0.24, duration: b(6.8), ease: 'none' }, b(18.8))
    sale(prueba.g, tl, 25.2, { hacia: 'izq', dist: 7, dur: 1.3 })
    respiraciones.push(respirar(prueba.g, { amp: 0.10, giro: 0.022, fase: 1.4 }))
    uso.pagina = prueba.fuente
  }

  // ---------------------------------------------------------------- 5 · RAZONES
  //
  // Salen del mar de a una y se hunden. El desvio lateral es 0.18 del ancho del mundo y no 0.30, y
  // sale de una cuenta, no del gusto: a `d` del lente el semiancho del cuadro es 0.1616·d, la cifra
  // mide 1.49 de ancho y la camara deriva 0.5, asi que puesta en x = 1.01 se va de cuadro cuando
  // 1.01 + 0.5 + 0.745 > 0.1616·d, o sea a 13.9. Se la coloca a 17.05 y la camara cierra 1.53 por
  // beat, asi que llega a ese borde en t0 + 3.16 — y para entonces la cifra ya se esta hundiendo
  // (sale en t0 + 2.3 y se apaga en t0 + 3.25). `atrio` pago justo esto al reves: cifras encendidas y
  // fuera del encuadre dos beats enteros.
  cifras.forEach((c, i) => {
    const s = i % 2 === 0 ? -1 : 1
    const t0 = 26 + i * 2.2
    flotar(c, {
      alto: 2.45 - i * 0.22, x: s * mundoW * 0.18, beat: t0 + 1.1,
      lectura: distBase * 0.98, sigue: 0.80, giro: 0.30,
    })
    c.g.rotation.y = s * 0.28
    entra(c.g, tl, t0, { desde: 'abajo', dist: 4.6, dur: 1.4 })
    c.escribir(tl, t0 + 0.35, 0.78)
    sale(c.g, tl, t0 + 2.3, { hacia: 'abajo', dist: 5, dur: 0.95 })
  })
  uso.cifras = cifras.length

  // Las frases van BAJAS, casi tocando el agua, y las cifras altas. Es la unica separacion que tienen
  // —los dos tiempos se cruzan a proposito, razones es el unico que puede tener dos cosas a la vez— y
  // sin ella se pisan en el centro del cuadro.
  frases.forEach((f, i) => {
    const t0 = 26.8 + i * 2.6
    flotar(f, { alto: 1.50, beat: t0 + 1.1, lectura: distBase * 0.92, sigue: 0.75, giro: 0.26 })
    entra(f.g, tl, t0, { desde: 'abajo', dist: 4.2, dur: 1.4 })
    f.escribir(tl, t0 + 0.4, 0.85)
    f.borrar(tl, t0 + 2.1)
    sale(f.g, tl, t0 + 2.3, { hacia: 'abajo', dist: 4.8, dur: 1.0 })
  })
  uso.frases = frases.length

  // ---------------------------------------------------------------- 6 · PEDIDO
  //
  // EL MAR SE AQUIETA. Va fuera del `if` a proposito: el cierre de la pieza es del ESPACIO, no del
  // bloque, y una pagina sin CTA ni dominio igual tiene que terminar en calma. Es la misma decision
  // que toma `deriva` bajando la niebla — una plantilla que se apoya en un efecto tiene que sacarlo
  // para el ultimo bloque, o el unico texto que el espectador tiene que poder tipear compite con lo
  // que lo trajo hasta aca.
  //
  // El tween va sobre `uDomo.uFuerza` y no sobre `uDomo.fuerza`: `domo()` devuelve los UNIFORMS, y
  // tunear la propiedad equivocada compila, corre y no hace nada.
  tl.to(mar, { amp: 0.42, duration: b(3.4), ease: E.frena(2) }, b(32.2))
  tl.to(uDomo.uFuerza, { value: 0.15, duration: b(3.0), ease: E.frena(2) }, b(32.4))

  let latido = null
  if (pedido) {
    // Se coloca a 14.96 del lente en el beat 36.6: al entrar (beat 33) esta a 19.2 y en el ultimo
    // cuadro a 14.0. Nunca se le acerca mas que eso, asi que no hace falta que acompañe a la camara —
    // la frenada del vuelo ya le da la ventana de lectura entera.
    flotar(pedido, { alto: 2.30, beat: BEATS - 1.4, lectura: distBase * 0.86, sigue: 0.45, giro: 0.12 })
    entra(pedido.g, tl, 33, { desde: 'abajo', dist: 5.4, dur: 2.1 })
    pedido.escribir(tl, 33.6, 0.95)
    latido = pedido.latir(0.03)
    uso.cta = pedido.tieneCta
    // El unico sitio de la pieza donde la luz sube. El ojo lo lee como que algo se resolvio.
    tl.to(ctx.bloom, { strength: (ctx.bloom.strength || 0.5) * 1.65, duration: b(2.4), ease: E.frena(2) }, b(33))
  }

  // ---------------------------------------------------------------- lo continuo
  //
  // TODO EL MOVIMIENTO DE ESTA PLANTILLA VIVE ACA, y no es una preferencia: una ola escrita como tween
  // se muestrea una vez por cuadro, y el obturador por acumulacion la barreria a saltos justo donde
  // deberia barrerla. Ademas la ola no es interpolable — es una funcion del tiempo, no dos extremos.
  //
  // EL ORDEN IMPORTA y es este:
  //   1. la camara en z, porque el agua y las dos capas recicladas se colocan RELATIVO a ella;
  //   2. la superficie;
  //   3. la altura del ojo, que sale de la superficie ya calculada — la camara CABALGA la ola, que es
  //      lo que separa "un plano sobre el mar" de "estar en el mar";
  //   4. los flotantes, que se apoyan en la misma funcion.
  const est = { k: 0 }
  tl.fromTo(est, { k: 0 }, { k: 1, duration: b(BEATS), ease: 'none' }, 0)

  const alSeek = juntar(latido, (t) => {
    uDomo.uT.value = t

    // 1 · la camara, menos su altura
    const camZ = zDe(est.k)
    camara.position.z = camZ
    // Dos senos de periodos que no son multiplos entre si: no vuelven a alinearse nunca, asi que el
    // vuelo no se siente en bucle. Misma receta que `vueloAvance`, porque el vuelo es propio pero la
    // deriva es del idioma de la casa.
    camara.position.x = Math.sin(t * 0.37) * DERIVA
    camara.rotation.z = Math.sin(t * 0.19 + 0.4) * 0.012
    camara.rotation.x = PICADO + Math.sin(t * 0.13) * 0.013

    // 2 · la superficie, que persigue a la camara para ser infinita
    const zAgua = camZ - DESP
    agua.position.z = zAgua
    for (let i = 0, j = 0; i < N_V; i++, j += 3) {
      const o = ola(VX[i], VZ[i] + zAgua, t)
      arrPos[j + 1] = o.h
      // Normales ANALITICAS y no `computeVertexNormals`. La normal de una altura h(x,z) es
      // (-dh/dx, 1, -dh/dz) y las dos derivadas ya estan calculadas —son los mismos cosenos—, asi que
      // cuestan una raiz. Recalcular por caras seria recorrer 12.000 triangulos cuatro veces por
      // cuadro para obtener un resultado peor.
      const inv = 1 / Math.sqrt(o.hx * o.hx + o.hz * o.hz + 1)
      arrNor[j] = -o.hx * inv
      arrNor[j + 1] = inv
      arrNor[j + 2] = -o.hz * inv
    }
    posAgua.needsUpdate = true
    norAgua.needsUpdate = true

    // 3 · la altura del ojo. Cabalga la ola al 45%: con el 100% el horizonte sube y baja tanto que la
    // pieza se vuelve incomoda de mirar, y con 0 la camara flota sobre un mar que no la toca.
    const co = ola(camara.position.x, camZ, t)
    camara.position.y = Math.sin(t * 0.23 + 1.7) * DERIVA * 0.5 + co.h * 0.45

    // 4 · los bloques, apoyados en la misma superficie
    for (let i = 0; i < flotantes.length; i++) {
      const f = flotantes[i]
      const o = ola(f.x, f.z, t)
      f.g.position.y = NIVEL + f.alto + o.h * f.sigue
      // La normal inclina el bloque como inclinaria a una balsa: si la superficie sube hacia +x, el
      // objeto se recuesta hacia -x. Es un giro sobre el grupo DE AFUERA, asi que no pelea con la
      // entrada ni con la respiracion, que escriben el de adentro.
      f.g.rotation.z = o.hx * f.giro
      f.g.rotation.x = -o.hz * f.giro
    }

    // 5 · el camino de brillos. Cada teja ocupa una ranura fija del mundo; cuando la camara pasa la
    // primera, la ranura se recicla mucho mas adelante y como sus propiedades salen de la ranura y no
    // del indice, el cambio no se ve.
    const n0 = Math.floor((camZ - DELANTE_TEJA) / SEP_TEJA)
    for (let i = 0; i < N_TEJA; i++) {
      const n = n0 - i
      const z = n * SEP_TEJA
      const x = (hash01(n) - 0.5) * 4.4
      const o = ola(x, z, t)
      const m = tejas[i]
      m.position.set(x, NIVEL + o.h + 0.03, z)
      // Solo brilla la cara de la ola que devuelve la luz al ojo: la pendiente hacia el observador
      // tiene que caer en una banda angosta. Fuera de ella la teja se cierra a nada.
      const g = 1 - Math.abs(o.hz - 0.14) * 6
      // Nunca exactamente 0: una escala nula deja la matriz sin inversa y three avisa por cuadro.
      const e = g > 0.0001 ? g : 0.0001
      m.scale.set(e, 1, e)
    }

    // 6 · los anillos. Misma mecanica de ranura, mas separacion y mas afuera del corredor.
    const a0 = Math.floor((camZ - DELANTE_ANILLO) / SEP_ANILLO)
    for (let i = 0; i < N_ANILLO; i++) {
      const n = a0 - i
      const z = n * SEP_ANILLO
      // TRES HASHES Y NO DOS. `h2` decidia el LADO y ademas el RADIO, que es la misma variable usada
      // para dos cosas independientes: como el lado sale de `h2 < 0.5` y el radio crece con `h2`, TODOS
      // los anillos de la izquierda quedaban chicos y TODOS los de la derecha grandes. No es una
      // sospecha: sobre las ranuras que la pieza recorre, el mayor de la izquierda daba 0.969 y el menor
      // de la derecha 0.978 — cero solapamiento, una asimetria perfecta en lo unico que esta pieza tiene
      // para dar escala. El radio sale ahora de su propio hash de ranura, asi que sigue siendo estable
      // al reciclarse y deja de estar atado al lado.
      const h1 = hash01(n), h2 = hash01(n * 7 + 3), h3 = hash01(n * 31 + 17)
      const r = 0.45 + h3 * 1.05
      // Y EL RADIO SE SUMA AL DESVIO: el corredor libre se mide contra el borde del anillo, no contra su
      // centro. Con esto el borde de adentro nunca baja de 2.6 y el parrafo de arriba deja de mentir.
      const x = (h2 < 0.5 ? -1 : 1) * (2.6 + r + h1 * 6.5)
      const o = ola(x, z, t)
      const g = anillos[i]
      g.position.set(x, NIVEL + o.h + 0.02, z)
      g.rotation.z = o.hx * 0.6
      g.rotation.x = -o.hz * 0.6
      // Una respiracion propia por anillo, chica: un objeto flotando quieto sobre agua que se mueve se
      // lee como pegado a ella.
      const p = r * (1 + Math.sin(t * 0.5 + faseAnillo[i]) * 0.05)
      g.scale.set(p, 1, p)
    }

    // El polvo viaja con la camara: es lo que hace que el AIRE tambien tenga algo suspendido, y sin
    // eso la unica referencia de movimiento seria el agua.
    motas.position.z = camara.position.z
    motas.rotation.y = t * 0.018
  }, ...respiraciones)

  return { dur: b(BEATS), alSeek, uso }
}
