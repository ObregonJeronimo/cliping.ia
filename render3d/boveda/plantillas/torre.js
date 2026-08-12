// PLANTILLA "torre" — cuarenta losas apiladas y giradas, y la camara subiendo en espiral.
//
// EL GESTO
// Una torre retorcida: cada losa gira un poco mas que la de abajo, asi que las cuarenta juntas
// describen doscientos cuarenta grados de torsion. La camara la rodea SUBIENDO —el radio se cierra de
// 1.24 a 0.80 de `distBase` mientras la altura trepa veintitres unidades— y los bloques de texto se
// montan en el canto de las losas, como los carteles de una obra.
//
// EN QUE SE DIFERENCIA DE `monolito`, QUE ES LA OTRA DE UN SOLO OBJETO
// Alla el objeto es UNO y macizo y la camara lo rodea bajando: el gesto es "acercarse a una cosa".
// Aca son cuarenta piezas iguales apiladas y la camara SUBE: el gesto es "esto se construyo, y sigue
// subiendo". Por eso es la plantilla de inmobiliaria, constructora y de marca que vende crecimiento, y
// por eso no le sirve a una marca con una sola cosa que decir — que es justo para lo que esta la otra.
//
// EL VUELO ES PROPIO Y ES HELICOIDAL. `vueloOrbita` gira y se acerca, pero su altura es un parametro
// del vuelo y aca la altura ES el relato. Cumple las mismas reglas que los tres de `movimiento.js`: no
// se detiene nunca —en el pedido baja a la mitad, no a cero— y la deriva sale de dos senos de periodos
// inconmensurables, que no vuelven a alinearse y por eso no se sienten en bucle.
//
// LAS TRES CAPAS A DISTINTAS VELOCIDADES (regla 3), y en una orbita no salen solas: hay que darlas.
//   la TORRE gira contra la camara, asi que las caras desfilan mas rapido que la vuelta sola.
//   el HORIZONTE gira a favor y a dos veces y media la distancia: se corre apenas.
//   el POLVO acompana la altura de la camara y gira mas lento todavia.
//
// LOS SEIS TIEMPOS (beats sobre 38)
//   0   ESPACIO   el pie de la torre, las losas desfilando hacia abajo, la espina encendida. Sin texto.
//   5   MARCA     el nombre llega desde el fondo y queda montado en el canto de una losa.
//   11  PROMESA   el claim cruza el cuadro de izquierda a derecha mientras la torre sigue girando.
//   17  PRUEBA    la pagina del cliente se monta en el canto y la camara la pasa mientras sube.
//   25  RAZONES   las cifras se apoyan alternadas a un lado y a otro; las frases, mas abajo.
//   32  PEDIDO    la subida baja a la mitad, se descubre el remate de la torre y el CTA queda al frente.
//
// SIN MATERIAL: sin tira, PRUEBA usa el recorte mas grande; sin recortes, ese tiempo no se compone y
// la torre se queda sola. Lo que no hay, no se anuncia.

import { THREE, metal, luz, barra, cama, iluminar, domo, polvo } from '../nucleo.js'
import { entra, sale, respirar, juntar, anchoADistancia } from '../movimiento.js'
import { bloqueMarca, bloquePromesa, bloquePrueba, bloquesCifra, bloquesFrase, bloquePedido } from '../bloques.js'
import { LOOK, nivel, E, b } from '../../demo/kit.js'

export const meta = {
  id: 'torre',
  nombre: 'Torre',
  familia: 'escala',
  necesita: ['nada'],
  beats: 38,
  tiempos: { espacio: 0, marca: 5, promesa: 11, prueba: 17, razones: 25, pedido: 32 },
  pitch: 'Cuarenta losas apiladas y retorcidas, y la cámara subiendo en espiral. De inmobiliaria, constructora, crecimiento.',
}

// ---------------------------------------------------------------- la torre, medida antes de dibujarla
//
// Todo lo demas de la plantilla se cuelga de estos numeros, asi que se calculan y no se eligen a ojo.
const N_LOSAS = 40
const ESP = 0.30          // espesor de una losa
const PASO_Y = 0.68       // de una losa a la siguiente: deja 0.38 de aire, por donde se ve la espina
const PASO_G = 0.105      // seis grados por losa; las cuarenta dan 4.2 rad, o sea 240 grados de torsion
const TORRE_H = N_LOSAS * PASO_Y   // 27.2

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

  // ALEATORIEDAD PROPIA Y DETERMINISTA. `Math.random` daria un video distinto por render y romperia lo
  // primero que promete el motor: la misma pagina con la misma plantilla da el mismo video.
  //
  // Y VIVE DENTRO DE `build`, QUE NO ES UN DETALLE DE ESTILO. Estaba a nivel de modulo, donde la
  // semilla es UNA SOLA para todo el proceso: como `az()` la va corriendo, la segunda construccion de
  // esta misma plantilla arrancaba donde termino la primera y el horizonte salia distinto. Y eso pasa
  // de verdad — `boveda-check` construye cada plantilla dos veces (datos reales y datos minimos), y la
  // sonda y las fotos vuelven a construir en el mismo proceso. Un video que cambia segun cuantas veces
  // se armo antes rompe exactamente la promesa que este comentario dice defender, y no da un solo
  // sintoma hasta que alguien compara dos corridas. Las otras nueve plantillas que sortean algo la
  // declaran aca adentro por esto mismo; `telar.js:244` lo deja escrito.
  let sem = 90311
  const az = () => { sem = (sem * 1664525 + 1013904223) >>> 0; return sem / 4294967296 }

  // Key alta y relleno medio: la torre es metal, y un metal sin luz encima renderiza negro por claro
  // que sea su nivel. Mismo motivo por el que `tectonica` subio la suya de 0.75 a 1.25.
  iluminar(escena, { key: 1.25, relleno: 0.6 })
  const uDomo = domo(escena, { fuerza: 0.24 })
  const motas = polvo(escena, 1200, 26)

  const LADO_A = mundoW * 0.50     // 2.81 — el largo de la losa
  const LADO_F = mundoW * 0.30     // 1.69 — el fondo
  // LO MAS LEJOS DEL EJE QUE LLEGA LA TORRE, y de aca sale donde se montan los textos. La pieza mas
  // ancha no es la losa sino la cornisa que lleva una de cada ocho, a 1.10 de la losa:
  //   hypot(2.81 * 0.55, 1.69 * 0.55) = 1.80
  const RAD_MAX = Math.hypot(LADO_A * 0.55, LADO_F * 0.55)
  // EL CANTO: el radio al que se monta todo el texto. 0.38 por fuera de la torre, y ese margen no es
  // decorativo — los bloques se plantan mirando a la camara, que esta mas abajo, asi que se inclinan
  // hacia adelante y su borde inferior se mete hacia el eje. Con el bloque mas alto de la pieza (3.6
  // de alto, el panel de la pagina) y 7 grados de inclinacion eso son 0.22, y el margen lo cubre.
  const CANTO = RAD_MAX + 0.38

  // ---------------------------------------------------------------- el vuelo helicoidal
  //
  // LA VELOCIDAD BAJA A LA MITAD EN EL PEDIDO Y NO LLEGA A CERO, y esta escrito en dos tramos rectos a
  // proposito. Una sola curva con `power.out` frena de verdad hasta cero en el ultimo cuadro, que es
  // exactamente lo que la regla 1 prohibe; dos rectas dan una razon exacta y comprobable:
  //   tramo 1   beats 0..31   k 0 -> 0.90   =  0.0290 por beat
  //   tramo 2   beats 31..38  k 0.90 -> 1   =  0.0143 por beat   (0.49 del anterior)
  // El cambio de pendiente cae debajo de la entrada del CTA, donde el ojo esta en el texto y una
  // variacion de ritmo se lee como llegada y no como salto.
  const CORTE = 31
  const K_CORTE = 0.90
  const est = { k: 0 }
  tl.fromTo(est, { k: 0 }, { k: K_CORTE, duration: b(CORTE), ease: 'none' }, 0)
  tl.to(est, { k: 1, duration: b(meta.beats - CORTE), ease: 'none' }, b(CORTE))
  // `kEn` TIENE QUE SER LA INVERSA EXACTA DE ESOS DOS TWEENS. Si se desincronizan, los bloques se
  // plantan donde la camara no esta mirando y la pieza sale muda sin un solo error: es el defecto que
  // `cinta` documenta y el que `zEn` y `puntoEn` existen para evitar.
  const kEn = (beat) => (beat <= CORTE
    ? K_CORTE * Math.max(0, beat) / CORTE
    : K_CORTE + (1 - K_CORTE) * Math.min(1, (beat - CORTE) / (meta.beats - CORTE)))

  const R0 = distBase * 1.24, R1 = distBase * 0.80
  const Y0 = -TORRE_H * 0.44, Y1 = TORRE_H * 0.40
  const VUELTAS = 0.85     // menos de una: una vuelta entera termina en el mismo cuadro que empezo
  const ADELANTO = 1.9     // cuanto MAS ARRIBA que si misma mira la camara. Es lo que la hace subir
  const DERIVA = 0.5
  const ang = (k) => k * VUELTAS * Math.PI * 2
  const radio = (k) => R0 + (R1 - R0) * k
  const altura = (k) => Y0 + (Y1 - Y0) * k
  const miraY = (k) => altura(k) + ADELANTO

  // DONDE PONER ALGO PARA QUE LA CAMARA LO LEA EN SU BEAT — el `zEn` de este vuelo.
  //
  // Devuelve el punto y TAMBIEN el ojo, porque de nada sirve plantar bien un bloque que queda de
  // canto. `monolito` resuelve el encare con un `yaw`, pero alli la camara mira horizontal; aca mira
  // hacia arriba y harian falta dos angulos — y componer un giro en Y con uno en X depende del orden
  // de Euler, que es una fuente de errores mudos. Con el ojo en la mano, `lookAt` lo hace bien y sin
  // que haya que pensarlo.
  //
  // Y LA ALTURA SE MIDE CONTRA `miraY`, NO CONTRA `altura`: la camara mira 1.9 por encima de si misma,
  // asi que `dy = 0` es el centro del CUADRO y no la altura del lente. Montarlos donde la camara ESTA
  // en vez de donde MIRA es el defecto que dejo a `cinta` con el 80% de los beats mudos.
  const puntoEn = (beat, dy) => {
    const k = kEn(beat)
    const a = ang(k), R = radio(k)
    const y = miraY(k) + (dy || 0)
    return {
      pos: new THREE.Vector3(Math.sin(a) * CANTO, y, Math.cos(a) * CANTO),
      ojo: new THREE.Vector3(Math.sin(a) * R, altura(k), Math.cos(a) * R),
      // La camara y el bloque estan sobre la misma linea radial, asi que los separan `R - CANTO` en
      // horizontal y la diferencia de alturas en vertical. Medir contra `distBase` a secas daria el
      // bloque un 25% mas grande de lo calculado en el ultimo tercio, donde el radio ya se cerro.
      dist: Math.hypot(R - CANTO, y - altura(k)),
    }
  }

  // ---------------------------------------------------------------- el espacio: la torre
  const matLosaA = metal(nivel(0.16), 0.40)
  const matLosaB = metal(nivel(0.26), 0.34)
  const gTorre = new THREE.Group()
  escena.add(gTorre)
  for (let i = 0; i < N_LOSAS; i++) {
    const g = new THREE.Group()
    g.position.y = -TORRE_H / 2 + PASO_Y * (i + 0.5)
    g.rotation.y = i * PASO_G
    g.add(new THREE.Mesh(new THREE.BoxGeometry(LADO_A, ESP, LADO_F), i % 2 ? matLosaA : matLosaB))
    // EL CANTO EN EMISIVO ES LO QUE HACE LA TORSION VISIBLE. Cuarenta losas iguales apiladas son una
    // columna; cuarenta filetes de luz girando un poco cada uno son una espiral. Sin ellos el giro
    // existe en la geometria y no se lee en el cuadro, que es como no existir.
    for (const s of [1, -1]) {
      const f = barra(LADO_A * 0.98, 0.045, LOOK.acento, 1.4)
      f.position.set(0, ESP * 0.5 - 0.03, s * (LADO_F / 2 + 0.012))
      // Un `barra` es un plano y un plano mira a +z: en la cara de atras hay que darlo vuelta o no se
      // dibuja desde ningun angulo desde el que se lo pueda ver.
      if (s < 0) f.rotation.y = Math.PI
      g.add(f)
    }
    // LA PUNTA: una luz en la MISMA esquina de todas las losas. Es lo que dibuja la helice de un solo
    // trazo — el ojo une cuarenta puntos girando antes que cuarenta cantos, y le sale gratis.
    // SOBRESALE 0.01, y ese numero es todo el arreglo. Centrada en `LADO_A/2 - 0.05` con medio lado de
    // 0.05, sus caras caian en 1.40625 y 0.84375: EXACTAMENTE el plano de las caras de la losa. Dos
    // superficies opacas coplanares no se ordenan —la profundidad interpolada sale igual salvo el
    // redondeo— y el resultado es el moteado que parpadea cuadro a cuadro, en emisivo y con el bloom
    // amplificandolo, en las cuarenta losas a la vez. Es el mismo motivo por el que el filete del canto
    // se planta 0.012 por delante de su cara.
    const punta = new THREE.Mesh(new THREE.BoxGeometry(0.10, ESP * 1.3, 0.10), luz(LOOK.acento2 || LOOK.acento, 1.6))
    punta.position.set(LADO_A / 2 - 0.04, 0, LADO_F / 2 - 0.04)
    g.add(punta)
    // Una cornisa cada ocho losas: son los PISOS, y sin algo que los cuente una torre no tiene escala.
    if (i % 8 === 0) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(LADO_A * 1.10, 0.05, LADO_F * 1.10), luz(LOOK.acento, 1.2))
      c.position.y = -ESP * 0.5 - 0.04
      g.add(c)
    }
    gTorre.add(g)
  }
  // LA ESPINA. Vive dentro de las losas, asi que solo se ve por los 0.38 de aire que quedan entre una
  // y la siguiente: cuarenta rendijas de luz que suben. Es lo que impide que la torre se lea como un
  // bloque apagado en los beats en que la key no le pega de frente.
  const espina = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, TORRE_H * 1.02, 16), luz(nivel(0.05), 1.3))
  gTorre.add(espina)
  // EL REMATE, guardado para el pedido. Es el unico gesto propio del objeto en toda la pieza y por eso
  // no se gasta antes: una torre que hace cosas todo el tiempo no tiene con que cerrar.
  //
  // EL RADIO SALE DE LO QUE ENTRA EN EL CUADRO AL FINAL, NO DE LA LOSA. En el pedido la camara ya cerro
  // a 0.80 de `distBase`, asi que a la altura del remate el cuadro mide 4.4 de ancho y la deriva se
  // lleva 1.0 de eso: quedan 1.75 de semiancho util. Un anillo de `LADO_A * 0.60` = 1.69 ya esta al 97%
  // de ese semiancho SIN abrirse — y abriendolo a 2.1 daba 3.54, o sea el 159% del cuadro (182% en el
  // pico de la deriva): dejaba de ser un remate que se descubre y pasaba a ser dos arcos encendidos
  // cruzando los bordes, con el bloom encima, justo arriba del CTA. Con 0.35 y apertura 1.40 el anillo
  // termina en 1.38 —el 82% del cuadro— y el gesto sigue siendo una apertura de casi la mitad.
  const corona = new THREE.Mesh(new THREE.TorusGeometry(LADO_A * 0.35, 0.055, 10, 48), luz(LOOK.acento, 1.6))
  corona.rotation.x = -Math.PI / 2
  corona.position.y = TORRE_H / 2 + 0.55
  gTorre.add(corona)

  // El pie. `nivel(0.22)` y no `nivel(0.04)`: un piso de metal oscuro sin nada que lo ilumine desde
  // arriba es negro puro y se come el tercio de abajo del cuadro durante todo el tiempo de ESPACIO,
  // que es justo el que tiene que establecer el lugar. Mismo defecto que `pasillo` y `monolito`.
  const base = new THREE.Mesh(new THREE.CylinderGeometry(LADO_A * 1.15, LADO_A * 1.55, 0.9, 44), metal(nivel(0.24), 0.34))
  base.position.y = -TORRE_H / 2 - 0.45
  escena.add(base)
  const piso = new THREE.Mesh(new THREE.CircleGeometry(distBase * 3.2, 64), metal(nivel(0.22), 0.24))
  piso.rotation.x = -Math.PI / 2
  piso.position.y = -TORRE_H / 2 - 0.9
  escena.add(piso)
  for (let i = 1; i <= 6; i++) {
    const a = new THREE.Mesh(new THREE.RingGeometry(LADO_A * (1.0 + i * 0.95), LADO_A * (1.02 + i * 0.95), 72),
      luz(LOOK.acento, 0.85 - i * 0.10))
    a.rotation.x = -Math.PI / 2
    a.position.y = -TORRE_H / 2 - 0.88
    escena.add(a)
  }

  // EL HORIZONTE — la segunda capa. A dos veces y media el radio de la orbita, asi que la misma vuelta
  // de camara lo corre mucho menos que a la torre: eso es el paralaje de una orbita, y es lo unico que
  // convence de que la torre esta EN un lugar y no flotando en un degrade.
  const matLejos = [metal(nivel(0.40), 0.52), metal(nivel(0.48), 0.46), metal(nivel(0.34), 0.58)]
  const lejos = new THREE.Group()
  escena.add(lejos)
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2 + (az() - 0.5) * 0.22
    const r = distBase * (2.1 + az() * 1.5)
    const h = TORRE_H * (0.65 + az() * 1.5)
    const w = 0.6 + az() * 1.5
    const t = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), matLejos[i % 3])
    t.position.set(Math.sin(a) * r, -TORRE_H / 2 + h / 2, Math.cos(a) * r)
    t.rotation.y = az() * 1.4
    lejos.add(t)
  }

  // ---------------------------------------------------------------- los bloques, pedidos y colocados
  //
  // El beat de cada uno es el del MEDIO de su vida y no el de su entrada. La camara sube 0.66 por beat
  // y el cuadro mide unas 10 de alto: un bloque plantado en su entrada ya bajo un tercio del cuadro
  // cuando termina de leerse. Plantado en el medio, deriva la mitad para cada lado — y esa deriva es
  // deseable, porque es lo que hace que se lea como que la camara lo PASA.
  const DONDE = {
    marca: [7.3, 0.45], promesa: [13.4, -0.15], prueba: [20.3, 0.0],
    cifra: [26.0, 1.30], frase: [26.8, -1.95], pedido: [35.0, 0.25],
  }
  const anchoDe = (que, margen) =>
    anchoADistancia(mundoW, distBase, puntoEn(DONDE[que][0], DONDE[que][1]).dist, DERIVA) * margen

  const marca = bloqueMarca({ alto: 1.30, anchoMax: anchoDe('marca', 0.90), cama: true, camaOpacidad: 0.85 , margen: R.margen })
  const promesa = bloquePromesa({ alto: 0.50, anchoMax: anchoDe('promesa', 0.90), maxLineas: 3 , margen: R.margen })
  const prueba = bloquePrueba(ctx, { ancho: anchoDe('prueba', 0.60), ar: 1.5 })
  const cifras = bloquesCifra(R.cifras, { alto: 0.74, anchoMax: anchoDe('cifra', 0.46) , margen: R.margen })
  const frases = bloquesFrase(R.frases, { alto: 0.28, anchoMax: anchoDe('frase', 0.80) , margen: R.margen })
  const pedido = bloquePedido({ alto: 0.32, anchoMax: anchoDe('pedido', 0.72) , margen: R.margen })

  // DOS GRUPOS, igual que en `monolito` y por el mismo motivo: el de afuera lo planta el vuelo
  // —posicion y encare— y el de adentro es el que mueven `entra`, `sale` y `respirar`, en coordenadas
  // ya alineadas con el cuadro. Con uno solo, la entrada pisaria el encare y el bloque llegaria de canto.
  //
  // Y LOS BLOQUES NO SON HIJOS DE LA TORRE aunque esten montados en su canto. La torre gira sobre su
  // eje: colgados de ella, el texto se iria del otro lado del eje a mitad de su propio tiempo y no
  // aparecerian en ningun cuadro. Se plantan en el mundo, la torre pasa por detras, y lo que los
  // sostiene contra ese fondo cambiante es la cama o la placa, no la suerte.
  const plantar = (blk, beat, dy, padre) => {
    const p = puntoEn(beat, dy)
    const gExt = new THREE.Group()
    gExt.position.copy(p.pos)
    gExt.lookAt(p.ojo)
    gExt.add(blk.g)
    ;(padre || escena).add(gExt)
    return gExt
  }

  // UNA PLACA para los bloques que no traen cama propia. No es decoracion: en esta plantilla la TORRE
  // pasa por detras de todos los textos —metal a nivel 0.16 y 0.26, con cantos encendidos cruzandolos—
  // y `nivelTexto` garantiza contraste contra la PALETA, no contra lo que la plantilla resulto poner
  // atras. Es la misma decision que toma `atrio` con la cama de su marca.
  //
  // `renderOrder = -2` y no el -1 que pone `cama`: `bloquePedido` ya usa -1 para su pastilla, y dos
  // transparentes en el mismo cajon se ordenan por profundidad. Ese desempate funciona, pero depender
  // de el para que la placa no tape el CTA es exactamente el defecto que `nucleo.js:cama` documenta.
  const placa = (blk, w, h, cy) => {
    const p = cama(w, h, { opacidad: 0.87, color: nivel(0.05), holgX: 0.16, holgY: 0.13 })
    p.position.set(0, cy, -0.05)
    p.renderOrder = -2
    blk.g.add(p)
    return p
  }

  // ---------------------------------------------------------------- 2 · MARCA
  // Llega desde el fondo y se hunde con la torre. Sale hacia ABAJO y no hacia arriba: en un vuelo que
  // sube, lo que se va hacia arriba viaja con la camara y tarda el doble en dejar el cuadro.
  if (marca) {
    plantar(marca, DONDE.marca[0], DONDE.marca[1])
    entra(marca.g, tl, 5, { desde: 'fondo', dist: 6.5, dur: 1.8 })
    marca.escribir(tl, 5.4, 1.4)
    marca.borrar(tl, 9.4)
    sale(marca.g, tl, 9.6, { hacia: 'abajo', dist: 6, dur: 1.0 })
    uso.marca = true
  }

  // ---------------------------------------------------------------- 3 · PROMESA
  // Cruza el cuadro en vez de posarse en el, que es la unica manera de que un claim de tres renglones
  // no se lea como una placa.
  if (promesa) {
    plantar(promesa, DONDE.promesa[0], DONDE.promesa[1])
    entra(promesa.g, tl, 11, { desde: 'izq', dist: 7, dur: 1.7 })
    promesa.escribir(tl, 11.4, 0.95)
    promesa.borrar(tl, 15.4)
    sale(promesa.g, tl, 15.6, { hacia: 'der', dist: 7.5, dur: 1.1 })
    uso.claim = true
    uso.claimRecortado = promesa.recortado
  }

  // ---------------------------------------------------------------- 4 · PRUEBA
  if (prueba) {
    // EL RESPALDO VA EN MATERIAL BASICO Y NO EN `metal`, y esto no es una preferencia. El panel de la
    // pagina vive en `ctx.pagina`, que es una escena aparte que se renderiza DESPUES del bloom — y a
    // esa escena nadie le pone luces: `iluminar` corre sobre `ctx.escena`. Un `MeshPhysicalMaterial`
    // ahi adentro no tiene de donde sacar color y sale negro.
    const respaldo = new THREE.Mesh(new THREE.PlaneGeometry(prueba.ancho + 0.24, prueba.alto + 0.24), luz(nivel(0.12), 1.0))
    respaldo.position.z = -0.03
    prueba.g.add(respaldo)
    plantar(prueba, DONDE.prueba[0], DONDE.prueba[1], pagina)
    entra(prueba.g, tl, 17, { desde: 'fondo', dist: 6.5, dur: 2.0 })
    prueba.escribir(tl, 17.2, 1.2)
    prueba.recorrer(tl, 18, 5.6, 0.94)
    // Un giro lento y contrario al de la torre: es lo que la separa del fondo sin moverla de sitio.
    tl.to(prueba.g.rotation, { y: 0.42, duration: b(6.4), ease: 'none' }, b(17.6))
    sale(prueba.g, tl, 23.4, { hacia: 'frente', dist: 6, dur: 1.2 })
    respiraciones.push(respirar(prueba.g, { amp: 0.10, giro: 0.022, fase: 1.4 }))
    uso.pagina = prueba.fuente
  }

  // ---------------------------------------------------------------- 5 · RAZONES
  // Cada cifra entra por su lado y se va por el mismo: apoyadas contra el canto, alternadas, se leen
  // como la senaletica de los pisos y no como una lista.
  cifras.forEach((c, i) => {
    const s = i % 2 === 0 ? 1 : -1
    const t0 = 25 + i * 1.9
    // La placa cubre desde el valor hasta la etiqueta. `bloquesCifra` centra el valor en 0, cuelga la
    // etiqueta en -0.72 de su alto y esta mide 0.17: el contenido va de +0.50 a -0.81, o sea 1.31 de
    // alto centrado en -0.15. Se le da 1.35 para que el filete de acento tampoco quede afuera.
    placa(c, c.ancho, c.alto * 1.35, -c.alto * 0.15)
    plantar(c, t0 + 1.0, DONDE.cifra[1] * s)
    entra(c.g, tl, t0, { desde: s > 0 ? 'der' : 'izq', dist: 5.5, dur: 1.1 })
    c.escribir(tl, t0 + 0.28, 0.72)
    sale(c.g, tl, t0 + 2.0, { hacia: s > 0 ? 'der' : 'izq', dist: 6, dur: 0.9 })
  })
  uso.cifras = cifras.length

  frases.forEach((f, i) => {
    const t0 = 25.6 + i * 2.5
    plantar(f, t0 + 1.2, DONDE.frase[1])
    entra(f.g, tl, t0, { desde: 'abajo', dist: 5, dur: 1.25 })
    f.escribir(tl, t0 + 0.4, 0.8)
    f.borrar(tl, t0 + 2.2)
    sale(f.g, tl, t0 + 2.4, { hacia: 'abajo', dist: 5.5, dur: 1.0 })
  })
  uso.frases = frases.length

  // ---------------------------------------------------------------- 6 · PEDIDO
  let latido = null
  if (pedido) {
    // El contenido del pedido va de +1.1 a -2.41 veces el alto de su tipografia, o sea 0.80 del alto
    // que declara el bloque, centrado en -0.15 de ese alto. Sin CTA solo queda el dominio, centrado.
    const A = pedido.alto
    placa(pedido, pedido.ancho, pedido.tieneCta ? A * 0.80 : A * 0.42, pedido.tieneCta ? -A * 0.15 : 0)
    plantar(pedido, DONDE.pedido[0], DONDE.pedido[1])
    entra(pedido.g, tl, 32, { desde: 'fondo', dist: 6, dur: 1.8 })
    pedido.escribir(tl, 32.4, 0.9)
    latido = pedido.latir(0.03)
    uso.cta = pedido.tieneCta
    // El remate se abre y la luz sube. Es el unico sitio de la pieza donde el bloom crece: el ojo lo
    // lee como que algo se resolvio, y cuesta dos tweens.
    tl.to(corona.scale, { x: 1.40, y: 1.40, z: 1.40, duration: b(3.0), ease: E.frena(2.5) }, b(31.4))
    tl.to(ctx.bloom, { strength: (ctx.bloom.strength || 0.5) * 1.8, duration: b(2.6), ease: E.frena(2) }, b(31.6))
  }

  // ---------------------------------------------------------------- lo continuo
  //
  // Va aca y no en tweens porque tiene que evaluarse en CADA submuestra del obturador: la camara de
  // esta plantilla gira y sube a la vez, y escrita como tween se muestrearia una vez por cuadro y
  // saldria a saltos justo donde el obturador deberia barrerla.
  const mira = new THREE.Vector3()
  const alSeek = juntar(latido, (t) => {
    uDomo.uT.value = t
    const k = est.k
    const a = ang(k), R = radio(k)
    camara.position.set(Math.sin(a) * R, altura(k), Math.cos(a) * R)
    // LA DERIVA SE LE DA AL PUNTO QUE SE MIRA, NO A LA CAMARA. Corriendo la camara sobre su radio solo
    // se acerca y se aleja; corriendo el objetivo de costado —sobre la perpendicular al radio— el
    // cuadro se desplaza, que es lo que `anchoADistancia` descuenta con `DERIVA` y lo que evita que un
    // texto compuesto al 90% del cuadro pierda una letra en el pico de la deriva.
    const lat = Math.sin(t * 0.37) * DERIVA
    mira.set(Math.cos(a) * lat, miraY(k) + Math.sin(t * 0.23 + 1.7) * DERIVA * 0.8, -Math.sin(a) * lat)
    camara.lookAt(mira)
    // El balanceo va DESPUES del `lookAt` y en el eje local: `lookAt` escribe la rotacion entera, asi
    // que un `rotation.z` puesto antes se pierde sin dejar rastro.
    camara.rotateZ(Math.sin(t * 0.19 + 0.4) * 0.014)
    // LA TORRE GIRA CONTRA LA ORBITA. La camara barre 0.29 rad/s; con la torre a -0.052 las caras
    // desfilan a 0.34, un 18% mas rapido, sin que la camara tenga que dar mas vuelta — y dar mas
    // vuelta seria volver a ver lo mismo.
    gTorre.rotation.y = -t * 0.052
    lejos.rotation.y = t * 0.021
    motas.position.y = camara.position.y
    motas.rotation.y = t * 0.014
  }, ...respiraciones)

  return { dur: b(meta.beats), alSeek, uso }
}
