// PLANTILLA "pendulo" — un banco de masas colgadas que se hamacan solas, y la camara pasando por delante.
//
// EL GESTO
// De un riel alto cuelgan decenas de masas de hilos largos. Se sueltan TODAS JUNTAS en el cuadro cero,
// desde el mismo angulo, y a partir de ahi la fisica las desarma: cada hilo tiene su largo, cada largo
// su periodo, y como los periodos no guardan razon entre si el banco nunca vuelve a alinearse. Eso es
// una onda de pendulos, y es lo unico que pasa en el tiempo de ESPACIO — no hace falta animar nada.
// La camara se desliza de costado por delante. Cada bloque va montado en la masa que le toca, asi que
// el texto se hamaca apenas mientras se lee.
//
// EN QUE SE DIFERENCIA DE `monolito`, QUE ES LA OTRA DE LA FAMILIA `objeto`
// Alli el objeto es UNO, macizo y en el centro: la pieza entera pasa en un metro cuadrado y lo que se
// mueve es la camara rodeandolo. Aca los objetos son decenas, ninguno esta quieto y ninguno depende de
// la camara para moverse — si la camara se parara, la pieza seguiria pasando. `monolito` muestra un
// objeto; `pendulo` muestra un MECANISMO en marcha, y el texto no esta apoyado encima sino colgado de el.
//
// PARA QUE MARCA SIRVE
// Precision, relojeria, ingenieria, laboratorio, metrologia, control de calidad. Todo lo que se vende
// diciendo "esto esta medido": un fabricante de instrumentos, un estudio de ingenieria, un laboratorio
// de ensayos, una casa de relojes, una consultora de datos que quiere verse exacta y no rapida.
//
// LA LEY DEL PENDULO, Y POR QUE ACA SE MIDE EN BEATS
// El periodo de un pendulo va como la RAIZ de su largo. Eso se respeta —un hilo mas largo se hamaca
// mas lento, y es lo que hace que el banco se lea como fisica y no como animacion suelta—, pero la
// escala se elige en beats y no en segundos: `PER(L) = K_PER * sqrt(L)`. Asi el instrumento lleva el
// tempo de LA PIEZA. Un aire `lujo` corre a 76 BPM y uno `deportivo` a 140; con el periodo clavado en
// segundos el mismo banco se hamacaria a destiempo en nueve de los once aires.
//
// Y POR QUE NO SE REPITE, con la cuenta hecha:
//   - EN EL ESPACIO. Los largos salen de `L(x) = LM + A1*sin(0.37x) + A2*sin(0.23x)`. Los dos senos
//     vuelven a coincidir cada `2*PI / gcd(0.37, 0.23)` = 628 unidades de riel, y el riel mas largo que
//     esta plantilla construye mide unas 53. O sea que el perfil de alturas no se repite ni una vez.
//   - EN EL TIEMPO. Para que el banco vuelva a su configuracion inicial tendrian que reencontrarse
//     TODOS los pares a la vez. Los extremos (4.7 y 8.0 beats de periodo) se reencuentran cada
//     `4.7*8.0/3.3` = 11 beats, pero los vecinos de una cresta —donde `L(x)` casi no cambia— tardan
//     cientos. La pieza dura 38.
//
// LOS SEIS TIEMPOS (beats sobre 38)
//   0   ESPACIO   el banco soltandose y abriendose en onda, el riel pasando, la escala graduada debajo.
//   5   MARCA     una masa cargada llega por la derecha y el nombre BAJA sobre ella.
//   11  PROMESA   otra masa, mas abajo; el claim cruza su cara de izquierda a derecha.
//   18  PRUEBA    la pagina cuelga de dos hilos como un panel suspendido, con lastre abajo.
//   25  RAZONES   cinco masas a tres alturas distintas: las cifras arriba, las frases al fondo.
//   33  PEDIDO    el ultimo carro corre por el riel a la par de la camara y su masa se va aquietando.
//
// SIN MATERIAL: un tiempo que la pagina no dio simplemente no cuelga su masa, y el coro ocupa ese tramo
// del riel. Un hueco en el banco no se lee como un hueco: se lee como un pendulo menos.

import { THREE, metal, luz, barra, iluminar, domo, polvo, prismaDe } from '../nucleo.js'
import { vueloDesliz, entra, sale, acompanar, respirar, juntar, anchoADistancia } from '../movimiento.js'
import { bloqueMarca, bloquePromesa, bloquePrueba, bloquesCifra, bloquesFrase, bloquePedido } from '../bloques.js'
import { colorDePeso, grisDePeso } from '../recetas.js'
import { LOOK, nivel, E, b } from '../../demo/kit.js'

export const meta = {
  id: 'pendulo',
  nombre: 'Péndulo',
  familia: 'objeto',
  necesita: ['nada'],
  beats: 38,
  tiempos: { espacio: 0, marca: 5, promesa: 11, prueba: 18, razones: 25, pedido: 33 },
  pitch: 'Un banco de masas colgadas que se hamacan en onda y traen cada dato colgado de un hilo. Para marcas de precisión: relojería, ingeniería, laboratorio.',
}

const TAU = Math.PI * 2

export function build(ctx) {
  const { escena, pagina, camara, tl, mundoW, mundoH, distBase } = ctx
  const uso = {}
  const respiraciones = []

  // ---------------------------------------------------------------- LO QUE LA PAGINA DECIDE
  //
  // `ctx.recetas` sale de `backend/retrato.py`, que mide la tira, el DOM y los recortes de ESTA pagina.
  // Sin retrato devuelve los valores neutros y la plantilla compone como se componia antes: no hay una
  // rama distinta ni un caso especial. Lo que se modula es el GRADO, nunca la idea — esta plantilla
  // siempre es un banco de pendulos visto de costado.
  //
  // La explicacion larga de cada receta esta en `render3d/boveda/recetas.js`, y la de por que existe
  // este mecanismo, en `atrio.js`. Lo que cambia aca, receta por receta:
  //
  //   R.velocidad   cuanto riel recorre la camara en los mismos 38 beats, o sea cuantas masas desfilan.
  //   R.capas       2 a 4 filas de pendulos a distintas profundidades y velocidades aparentes.
  //   R.dureza      LA FORMA DE LA MASA: prisma de seccion cuadrada si la marca es angulosa, plomada
  //                 cilindrica si redondea. Es la traduccion mas visible de todo el retrato.
  //   R.margen      cuanto ancho puede ocupar cada bloque dentro del cuadro. Va a `bloques.js`.
  //   R.cifras      cuantas masas cargadas cuelgan en RAZONES arriba.
  //   R.frases      cuantas cuelgan abajo, en el hilo mas largo.
  //   R.acentoMasa  si las masas se funden en el color de la marca o el color queda en la banda y el hilo.
  //   R.vacio       cuanto AIRE hay entre pendulo y pendulo. Un sitio apretado cuelga un banco denso.
  //   R.movimientos uno de cada cuantos pendulos del coro se hamaca ANCHO. Una pagina que pide muchos
  //                 cambios de espacio recibe un banco mas agitado.
  const R = ctx.recetas || { velocidad: 1, capas: 3, dureza: 0.75, margen: 0.88, cifras: 3, frases: 2,
    acentoMasa: false, vacio: 0.5, movimientos: 4, paleta: [], medido: false }
  uso.retrato = !!R.medido

  iluminar(escena, { key: 1.15, relleno: 0.45 })
  const uDomo = domo(escena, { fuerza: 0.19 })
  const motas = polvo(escena, 900, 26)

  // Semilla propia y determinista. `ctx.rnd` la comparten los bloques, y compartirla haria que el
  // dibujo del banco cambiara porque la pagina trajo una frase mas. Un banco que cambia con el texto es
  // un banco que no se puede depurar.
  let sem = 18510326
  const az = () => { sem = (sem * 1664525 + 1013904223) >>> 0; return sem / 4294967296 }

  // ---------------------------------------------------------------- el vuelo, y por que a esta velocidad
  //
  // LA VELOCIDAD DEL DESLIZ LA DECIDE CUANTO TIENE QUE DURAR UNA MASA EN EL CUADRO. Un objeto quieto en
  // un desliz se ve `mundoW / v` beats, y con `v = LARGO / beats` eso es `beats * mundoW / LARGO`:
  // 38 / 4.4 = 8.6 beats de ventana con los neutros. Los tiempos largos —promesa y prueba, 7 beats—
  // entran enteros.
  //
  // PERO `R.velocidad` LLEGA HASTA 1.45, y ahi la ventana cae a 38 / 6.38 = 5.96 beats: promesa y
  // prueba ya NO entran. Por eso los cuatro tiempos largos van montados en CARROS que corren por el
  // riel (ver `acompanar` mas abajo), que es la unica manera de estirar la ventana sin frenar la camara
  // — y ademas es lo que un riel esta para hacer. Las cifras y las frases duran 2.6 beats y no lo
  // necesitan.
  const LARGO = mundoW * 4.4
  const RECORRIDO = LARGO * R.velocidad
  const vuelo = vueloDesliz(camara, tl, { distBase, beats: meta.beats, largo: RECORRIDO, dist: 1.0 })
  const xEn = vuelo.xEn
  const Z_CAM = distBase

  // Lo que el vaiven del vuelo se come del ancho, con la cuenta hecha: `vueloDesliz` balancea la z de la
  // camara +-0.7, y a 0.7 mas cerca el cuadro se angosta `mundoW * 0.7 / distBase` = 0.23, o sea 0.11
  // por lado; el balanceo de 0.008 rad en z se lleva otros `mundoH/2 * 0.008` = 0.04. Son 0.15 por lado
  // y se reserva el doble, que es lo que cuesta no tener que volver a mirarlo.
  const DERIVA = 0.30

  // ---------------------------------------------------------------- las medidas del banco
  const RIEL_Y = 4.35          // la altura del riel. Queda dentro del cuadro: se tiene que VER de donde cuelgan.
  const LADO_M = 0.86          // el lado de una masa cargada
  const ALTO_M = 1.15
  // La cara de la masa que mira al lente. `prismaDe` con dureza 1 deja la cara plana a `lado/2` del eje
  // y con dureza 0 el punto mas cercano queda a `lado/2 * 1.06`; 0.55 pasa por delante de los dos.
  const Z_CARA = LADO_M * 0.55
  const Z_BLOQUE = Z_CARA + 0.09
  const ESCALA_Y = -3.40       // la regla graduada sobre la que oscila el banco

  // EL ANCHO DE UN BLOQUE SE MIDE CONTRA EL CUADRO QUE HAY A SU DISTANCIA, y esa distancia no es
  // `distBase`: el bloque cuelga 0.56 por delante del eje del banco, o sea a 16.88 del lente, donde el
  // cuadro mide 5.44 y no 5.63. Es poco, y justamente por eso se escapa leyendo — es el mismo error que
  // `anchoConDeriva` documenta para `atrio` con otro numero.
  const CARA = anchoADistancia(mundoW, distBase, Z_CAM - Z_BLOQUE, DERIVA)
  // Y el alto por la misma cuenta: `mundoH * 16.88 / 17.44` = 9.68, o sea +-4.84 desde el eje. Es lo que
  // acota donde puede colgar una masa: mas abajo de -4.84 la masa esta fuera del cuadro y su bloque
  // tambien, por bien escrito que este.
  const ALTO_UTIL = mundoH * ((Z_CAM - Z_BLOQUE) / distBase)
  // NINGUNA MASA CARGADA CUELGA MAS ABAJO DE DONDE LLEGA EL CUADRO. Con los largos de mas abajo sobra
  // —la mas baja es la de las frases, en -2.15 contra un piso de -4.84—, y por eso mismo esto es una
  // red y no un calculo: los altos de los bloques los mide `bloques.js` contra la pagina del CLIENTE,
  // asi que una frase de dos renglones largos con cama crece sin que esta plantilla se entere.
  const Y_PISO = -ALTO_UTIL / 2 + 0.35
  const largoTope = (L, blk) => Math.min(L, RIEL_Y - Y_PISO - (blk ? blk.alto * 0.5 : 0))

  // ---------------------------------------------------------------- la ley del pendulo
  //
  // `K_PER` fija la ESCALA y nada mas: la forma la manda la raiz. A la altura media del coro (L = 4.9)
  // el ciclo dura `2.98 * sqrt(4.9)` = 6.6 beats, o sea que en 38 beats se ven algo menos de seis idas
  // y vueltas. Menos que eso y el banco parece congelado; mas y se vuelve un limpiaparabrisas.
  const K_PER = 2.98
  const PER = (L) => K_PER * Math.sqrt(Math.max(0.2, L))

  // LAS AMPLITUDES, y son tres porque cumplen tres funciones distintas.
  //
  // Una masa cargada se hamaca 0.075 rad: sobre un hilo de 4.3 eso son `4.3 * sin(0.075)` = 0.32
  // unidades de recorrido, un 5.7% del ancho del cuadro. Se percibe que el texto esta vivo y se puede
  // leer igual. Al doble ya hay que perseguir el renglon con la vista.
  const AMP_TXT = 0.075
  // La pagina se hamaca la mitad: mide casi cuatro unidades de alto y un giro que en una linea de texto
  // es un guino, en un panel de ese tamano se lee como que esta torcido. `0.042 rad` son 2.4 grados.
  const AMP_PAG = 0.042
  // Y el coro se hamaca de verdad, porque es el que tiene que contar que esto es un mecanismo.
  const AMP_CORO = 0.055
  const AMP_ANCHA = 0.17
  // CUANTO DEL GIRO DEL HILO SE LE PASA AL TEXTO. Un peso de laboratorio cuelga de un eje y su placa se
  // mantiene casi a nivel mientras la masa se hamaca; aca eso vale ademas como decision de legibilidad:
  // el bloque se inclina un 35% de lo que se inclina su hilo, o sea 1.5 grados en el pico. El resto lo
  // absorbe el grupo `plato`, que existe SOLO para eso.
  const GIRO_TXT = 0.35

  // ---------------------------------------------------------------- los materiales
  //
  // EL COLOR DE LAS MASAS SALE DE LOS PIXELES, no de `LOOK.acento` a secas. `colorDePeso` devuelve la
  // primera masa cromatica de la paleta medida sobre la tira, saltando los grises: es el color que de
  // verdad OCUPA superficie en el sitio, que no es lo mismo que el color de sus botones.
  //
  // Y si el acento no da para masa —cobertura por debajo del 3% de la tira— las masas van en el gris de
  // mas peso y el color queda en la banda de la cara y en el hilo. Construir un banco entero con un
  // acento que en la pagina es un detalle miente sobre como se ve esa marca.
  const COL_MASA = colorDePeso(R, LOOK.acento, 0.20)
  const matMasa = metal(R.acentoMasa ? COL_MASA : grisDePeso(R, nivel(0.30)), 0.34)
  const matCoro = metal(grisDePeso(R, nivel(0.44)), 0.46)
  const matRiel = metal(grisDePeso(R, nivel(0.26)), 0.30)
  // El hilo del coro es metal y el de los cargados esta ENCENDIDO. Es la unica senal de cual de los
  // cuarenta pendulos esta hablando, y cuesta un material: en un banco donde todo se mueve igual, el
  // ojo necesita que algo diga por donde mirar antes de que el texto llegue.
  //
  // `nivel(0.55)` y no un hex fijo: nivel(0) es el CLARO del aire y nivel(1) la TINTA, asi que un valor
  // del medio contrasta contra el fondo tanto en los aires claros como en los oscuros. Un gris fijo se
  // apagaria solo en la mitad de los once.
  const matHilo = metal(nivel(0.55), 0.5)
  const matHiloVivo = luz(LOOK.acento2 || LOOK.acento, 1.15)

  // ---------------------------------------------------------------- un pendulo
  //
  // DOS GRUPOS Y NO UNO, y la razon es la misma colision que `bloques.js` documenta para la pagina:
  //   `carro`  va sobre el riel y NO gira. Lo escribe la linea de tiempo cuando corre (`acompanar`).
  //   `brazo`  cuelga del carro y es lo que se hamaca. Lo escribe `alSeek` y nadie mas.
  // Con un solo grupo, un carro que corre por el riel llegaria girado y un pendulo que se hamaca
  // arrastraria su carro fuera del riel.
  //
  // El origen del `brazo` esta en el PIVOTE, asi que hamacarlo es escribir `rotation.z` y nada mas:
  // ninguna otra parte de la plantilla tiene que saber de que largo es el hilo.
  const pendulos = []
  const colgar = (op) => {
    const carro = new THREE.Group()
    carro.position.set(op.x, op.rielY != null ? op.rielY : RIEL_Y, op.z || 0)
    ;(op.padre || escena).add(carro)
    if (op.carro !== false) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(op.grande ? 0.34 : 0.17, op.grande ? 0.18 : 0.13,
        op.grande ? 0.38 : 0.26), matRiel)
      carro.add(c)
    }
    const brazo = new THREE.Group()
    carro.add(brazo)
    const L = op.largo
    // El hilo llega hasta donde empieza la masa, no hasta su centro: un hilo que atraviesa la masa se
    // ve por los cantos cuando la seccion es cilindrica.
    const hasta = Math.max(0.4, L - (op.altoM || ALTO_M) * 0.5)
    const hilo = new THREE.Mesh(new THREE.PlaneGeometry(op.hiloW || 0.018, hasta), op.matHilo || matHilo)
    hilo.position.y = -hasta / 2
    brazo.add(hilo)
    const masa = prismaDe(op.lado || LADO_M, op.altoM || ALTO_M, R.dureza, op.matMasa || matCoro)
    masa.position.y = -L
    brazo.add(masa)
    if (op.banda) {
      // Una banda encendida cruzando la cara de la masa. Es lo que la ata al resto de la pieza —el filete
      // del nombre, el de la cifra, la pastilla del CTA son todos del mismo acento— y cuesta una malla.
      const bd = barra((op.lado || LADO_M) * 0.86, 0.05, LOOK.acento, 1.4)
      bd.position.set(0, -L + (op.altoM || ALTO_M) * 0.26, (op.lado || LADO_M) * 0.55 + 0.012)
      brazo.add(bd)
    }
    const reg = {
      carro, brazo, largo: L, y: (op.rielY != null ? op.rielY : RIEL_Y) - L,
      // La velocidad angular se precalcula: `b()` lee el BEAT del aire vigente, que ya esta configurado
      // cuando corre `build`. Calcularla en cada submuestra del obturador seria una raiz por pendulo por
      // muestra por cuadro para obtener siempre el mismo numero.
      w: TAU / b(PER(L)),
      amp: op.amp != null ? op.amp : AMP_CORO,
      plato: null, frena: null, ang: 0,
    }
    pendulos.push(reg)
    return reg
  }

  // CUANTO SE HAMACA ESTE PENDULO AHORA. Devuelve 1 salvo que se le haya pedido que se aquiete.
  //
  // Al CUADRADO y no lineal: con `k*k` la derivada del sobre es cero al entrar en el freno, o sea que la
  // velocidad de la masa es continua. Un escalon de amplitud se ve como un tiron, que es exactamente lo
  // contrario de lo que un pendulo que se aquieta tiene que transmitir.
  const amortDe = (p, t) => {
    if (!p.frena) return 1
    const k = Math.min(1, Math.max(0, (t - p.frena.t0) / (p.frena.t1 - p.frena.t0)))
    return 1 - (1 - p.frena.hasta) * k * k
  }

  // MONTAR UN BLOQUE EN UNA MASA. `plato` es el grupo que absorbe el giro del hilo; lo escribe `alSeek`.
  // El bloque va adentro, y ese lo escriben `entra` / `sale` / `respirar`. Los dos grupos existen para
  // no pelearse por `rotation`: si `alSeek` escribiera el mismo objeto que anima un tween, lo anularia
  // — sin error y sin nada raro en el cuadro, que es la familia de defectos mas cara de este motor.
  //
  // `sesgo` sube el bloque dentro de la cara. Hace falta en tres de los seis: la marca cuelga su filete y
  // su rotulo, la cifra su etiqueta y el pedido su dominio, asi que el centro de DIBUJO de esos bloques
  // no es el centro de su caja. Sin corregirlo quedan colgando por debajo de la masa.
  const montar = (p, blk, sesgo) => {
    const plato = new THREE.Group()
    plato.position.set(0, -p.largo, Z_BLOQUE)
    p.brazo.add(plato)
    blk.g.position.set(0, (sesgo || 0) * blk.alto, 0)
    plato.add(blk.g)
    p.plato = plato
    return plato
  }

  // ---------------------------------------------------------------- los bloques, medidos contra la cara
  const marca = bloqueMarca({ alto: 1.15, anchoMax: CARA * 0.92, cama: true, camaOpacidad: 0.84, margen: R.margen })
  const promesa = bloquePromesa({ alto: 0.55, anchoMax: CARA * 0.94, maxLineas: 3, margen: R.margen })
  const prueba = bloquePrueba(ctx, { ancho: mundoW * 0.46, ar: 1.5 })
  const cifras = bloquesCifra(R.cifras, { alto: 0.85, anchoMax: CARA * 0.42, margen: R.margen })
  const frases = bloquesFrase(R.frases, { alto: 0.30, anchoMax: CARA * 0.80, maxLineas: 2, margen: R.margen })
  const pedido = bloquePedido({ alto: 0.33, anchoMax: CARA * 0.66, margen: R.margen })

  // LOS LARGOS DE LOS HILOS CARGADOS SALEN DE DONDE TIENE QUE CAER EL TEXTO, no de la onda.
  //
  // Es la unica concesion del banco a la composicion, y es deliberada: un bloque tiene que caer cerca
  // del centro del cuadro, asi que los pendulos que llevan texto cuelgan casi todos a la misma altura y
  // sus periodos quedan parecidos. La ONDA vive en el coro, donde los largos son libres — que es
  // ademas donde se ve, porque el coro son cuarenta y los cargados son nueve.
  //
  // Las tres alturas de RAZONES estan elegidas para que dos bloques vecinos no se toquen: 1.00, -0.70 y
  // -2.15, o sea 1.70 y 1.45 de separacion, contra medias alturas de 0.6 (cifra con etiqueta) y 0.55
  // (frase de dos renglones con cama). Quedan 0.5 y 0.3 de aire.
  const L_MARCA = 4.05        // masa en y = +0.30
  const L_PROM = 4.55         // masa en y = -0.20
  const L_CIF = [3.35, 5.05]  // masas en y = +1.00 y y = -0.70, alternadas
  const L_FRA = 6.50          // masa en y = -2.15
  const L_PED = 4.30          // masa en y = +0.05

  // Los tramos del riel que ya estan ocupados, para que el coro no cuelgue una masa dentro de otra.
  // Se guarda un CORREDOR y no un punto: los cuatro carros largos CORREN, asi que ocupan un tramo.
  const ocupados = []
  const reservar = (x0, x1, y) => ocupados.push({ x0: x0 - 1.35, x1: x1 + 1.35, y })

  // ---------------------------------------------------------------- 2 · MARCA
  //
  // EL NOMBRE BAJA SOBRE LA MASA, y es el gesto que solo esta plantilla puede hacer: en un banco de
  // pesas, lo que se hace con un peso es apoyarlo. `back.out` lo hace pasarse y acomodarse, que es como
  // se posa algo sobre un platillo que ya se estaba moviendo.
  //
  // La cama va encendida por lo mismo que en `atrio`: `nivelTexto` garantiza contraste contra la PALETA,
  // no contra lo que la plantilla resulto poner detras — y detras del nombre pasan hilos encendidos, la
  // regla graduada y el riel.
  if (marca) {
    const p = colgar({ x: xEn(7.4), largo: L_MARCA, amp: AMP_TXT, grande: true, banda: true,
      lado: LADO_M, matMasa, matHilo: matHiloVivo, hiloW: 0.022 })
    montar(p, marca, 0.24)
    // El carro corre al 45% de la camara: la ventana de lectura pasa de 8.6 a 15.6 beats con los
    // neutros y de 5.96 a 10.8 en el extremo, y aun asi sigue habiendo movimiento relativo contra el
    // coro — que es de donde sale la sensacion de velocidad. Clavarlo del todo lo dejaria quieto.
    acompanar(p.carro, tl, 5.4, 10.4, xEn, 0.45)
    reservar(xEn(7.4), xEn(7.4) + (xEn(10.4) - xEn(5.4)) * 0.45, p.y)
    entra(marca.g, tl, 5, { desde: 'arriba', dist: 5.5, dur: 1.7 })
    marca.escribir(tl, 5.5, 1.3)
    marca.borrar(tl, 9.4)
    sale(marca.g, tl, 9.6, { hacia: 'arriba', dist: 5.5, dur: 1.0 })
    uso.marca = true
  }

  // ---------------------------------------------------------------- 3 · PROMESA
  // Cruza la cara de su masa de lado a lado. Es el unico bloque que entra y sale por lados OPUESTOS: el
  // claim es lo que hay que leer entero, y un texto que atraviesa se lee mas tiempo que uno que vuelve.
  if (promesa) {
    const p = colgar({ x: xEn(13.6), largo: L_PROM, amp: AMP_TXT, grande: true, banda: true,
      lado: LADO_M, matMasa, matHilo: matHiloVivo, hiloW: 0.022 })
    montar(p, promesa, 0)
    acompanar(p.carro, tl, 11.4, 16.6, xEn, 0.45)
    reservar(xEn(13.6), xEn(13.6) + (xEn(16.6) - xEn(11.4)) * 0.45, p.y)
    entra(promesa.g, tl, 11, { desde: 'izq', dist: 6.5, dur: 1.8 })
    promesa.escribir(tl, 11.5, 1.0)
    promesa.borrar(tl, 15.6)
    sale(promesa.g, tl, 15.8, { hacia: 'der', dist: 7, dur: 1.1 })
    uso.claim = true
    uso.claimRecortado = promesa.recortado
  }

  // ---------------------------------------------------------------- 4 · PRUEBA
  //
  // LA PAGINA ES LA MASA, y no cuelga de un hilo sino de DOS: un panel ancho colgado de un punto giraria
  // sobre si mismo al primer balanceo. Con dos hilos separados y un travesano arriba queda suspendido de
  // verdad, y el lastre de abajo termina de contarlo — es lo que hace que se lea como algo pesado
  // colgado y no como una lamina flotando.
  //
  // Y VIVE EN OTRA ESCENA. `ctx.pagina` se dibuja en un pase posterior para que el bloom no le queme el
  // blanco, asi que no se puede colgar del `brazo` como los demas. Se la mantiene pegada calculando LA
  // MISMA funcion —el mismo angulo, el mismo carro, el mismo largo— en vez de copiar un resultado: dos
  // cuentas iguales no se pueden desincronizar, dos copias si.
  //
  // Por lo mismo la pagina NO puede quedar tapada por sus hilos: ese pase no comparte la profundidad,
  // asi que la pagina se dibuja siempre encima. Los hilos llegan hasta su borde de arriba y se compone
  // contando con eso, no peleandolo.
  let pPag = null, gPag = null, Z_PAG = 0.35
  if (prueba) {
    // Donde cuelga el centro de la pagina. Se busca -0.25 —casi el eje del cuadro— y se baja si el
    // recorte es tan alto que su borde superior chocaria con el riel. Un recorte muy vertical existe:
    // `bloquePrueba` toma la relacion de aspecto de la imagen del cliente, no la pedida.
    const Y_PAG = Math.min(-0.25, RIEL_Y - 0.75 - prueba.alto / 2)
    const L_PAG = RIEL_Y - Y_PAG
    const sep = Math.max(0.25, prueba.ancho * 0.36)
    const p = colgar({ x: xEn(20.4), largo: L_PAG, amp: AMP_PAG, grande: true, carro: true,
      lado: 0.34, altoM: 0.30, matMasa, matHilo: matHiloVivo, hiloW: 0.001 })
    // La masa y el hilo que `colgar` fabrica no sirven aca: la masa es la pagina. Se los reemplaza por
    // el travesano, los dos hilos y el lastre, y por eso el hilo pedido va con ancho 0.001 — existe para
    // que el registro sea el mismo que el de los otros treinta y nueve pendulos y no para verse.
    const trav = new THREE.Mesh(new THREE.BoxGeometry(sep * 2 + 0.24, 0.09, 0.20), matRiel)
    trav.position.y = -0.09
    p.brazo.add(trav)
    const largoHilo = Math.max(0.6, L_PAG - prueba.alto / 2 - 0.09)
    for (const s of [-1, 1]) {
      const h = new THREE.Mesh(new THREE.PlaneGeometry(0.02, largoHilo), matHiloVivo)
      h.position.set(s * sep, -0.09 - largoHilo / 2, 0)
      p.brazo.add(h)
    }
    const lastre = new THREE.Mesh(new THREE.BoxGeometry(prueba.ancho * 0.62, 0.16, 0.24), matMasa)
    lastre.position.y = -(L_PAG + prueba.alto / 2 + 0.20)
    p.brazo.add(lastre)
    const bd = barra(prueba.ancho * 0.50, 0.035, LOOK.acento, 1.3)
    bd.position.set(0, lastre.position.y, 0.14)
    p.brazo.add(bd)

    gPag = new THREE.Group()
    pagina.add(gPag)
    gPag.add(prueba.g)
    prueba.g.position.set(0, 0, 0)
    pPag = { p, L: L_PAG }

    // ENTRA DESDE EL FONDO, que es la unica entrada segura para este bloque: `entra` con `fondo` escribe
    // la escala del grupo de AFUERA y el gesto de encendido de la pagina escribe la del de ADENTRO. Con
    // cualquier otro reparto se pelean por la misma propiedad y gana el ultimo que corra — esta escrito
    // en `bloques.js:marcoDe` y ya costo una pagina que no se veia nunca.
    entra(prueba.g, tl, 18, { desde: 'fondo', dist: 6.5, dur: 2.0 })
    prueba.escribir(tl, 18.3, 1.2)
    prueba.recorrer(tl, 18.9, 5.0, 0.93)
    acompanar(p.carro, tl, 18.8, 23.6, xEn, 0.55)
    reservar(xEn(20.4), xEn(20.4) + (xEn(23.6) - xEn(18.8)) * 0.55, Y_PAG)
    sale(prueba.g, tl, 23.6, { hacia: 'izq', dist: 7, dur: 1.3 })
    // Respiracion corta a proposito. `respirar` SUMA sobre lo que dejo la linea de tiempo, asi que su
    // giro se acumula con el del pendulo: 0.042 del hilo mas 0.014 de la respiracion son 3.2 grados en
    // el peor cruce, que sobre un panel de cuatro unidades es el limite de lo que se lee como vivo y no
    // como torcido.
    respiraciones.push(respirar(prueba.g, { amp: 0.07, giro: 0.014, fase: 0.9 }))
    uso.pagina = prueba.fuente
  }

  // ---------------------------------------------------------------- 5 · RAZONES
  //
  // CINCO MASAS A TRES ALTURAS, encabalgadas: una todavia se esta yendo cuando la siguiente ya llega.
  // Es el unico tiempo donde el banco se ve como banco y no como un pendulo por vez.
  //
  // Los carros NO corren aca. Cada bloque dura 2.6 beats y la ventana mas corta que el retrato puede
  // imponer es 5.96, asi que entran de sobra quietos — y que estos se queden mientras los cuatro largos
  // corren es lo que hace que correr signifique algo.
  //
  // 25.2 y no 25.0: la pagina se apaga recien en 25.16 (`sale` en 23.6 mas `dur * 1.2`), y una cifra
  // encendida mientras el panel todavia existe queda a 1.7 unidades de el con sus anchos sumando 2.3.
  // Se cruzarian.
  cifras.forEach((c, i) => {
    const t0 = 25.2 + i * 1.6
    const s = i % 2 === 0 ? 1 : -1
    const p = colgar({ x: xEn(t0 + 1.1), largo: largoTope(L_CIF[i % 2], c), amp: AMP_TXT, grande: true, banda: true,
      lado: LADO_M * 0.82, altoM: ALTO_M * 0.8, matMasa, matHilo: matHiloVivo, hiloW: 0.02 })
    montar(p, c, 0.15)
    reservar(xEn(t0 + 1.1), xEn(t0 + 1.1), p.y)
    entra(c.g, tl, t0, { desde: s > 0 ? 'der' : 'izq', dist: 5.5, dur: 1.2 })
    c.escribir(tl, t0 + 0.3, 0.75)
    sale(c.g, tl, t0 + 2.2, { hacia: s > 0 ? 'izq' : 'der', dist: 6, dur: 0.9 })
  })
  uso.cifras = cifras.length

  // Las frases cuelgan del hilo mas largo de todo el banco y suben desde abajo. Van al fondo del cuadro
  // a proposito: las dos familias de RAZONES se cruzan en el tiempo —es el unico tiempo que puede tener
  // dos cosas a la vez— y separarlas en altura es lo que hace que eso se lea como composicion.
  frases.forEach((f, i) => {
    const t0 = 25.9 + i * 2.2
    const p = colgar({ x: xEn(t0 + 1.1), largo: largoTope(L_FRA, f), amp: AMP_TXT * 0.85, grande: true, banda: true,
      lado: LADO_M * 0.72, altoM: ALTO_M * 0.7, matMasa, matHilo: matHiloVivo, hiloW: 0.02 })
    montar(p, f, 0)
    reservar(xEn(t0 + 1.1), xEn(t0 + 1.1), p.y)
    entra(f.g, tl, t0, { desde: 'abajo', dist: 4.5, dur: 1.3 })
    f.escribir(tl, t0 + 0.4, 0.8)
    f.borrar(tl, t0 + 2.2)
    sale(f.g, tl, t0 + 2.4, { hacia: 'abajo', dist: 5, dur: 1.0 })
  })
  uso.frases = frases.length

  // ---------------------------------------------------------------- 6 · PEDIDO
  //
  // EL ULTIMO CARRO CORRE A LA PAR DE LA CAMARA Y SU MASA SE VA AQUIETANDO. Son las dos mitades del
  // cierre y ninguna rompe la regla 1: la camara sigue deslizandose a la misma velocidad —el banco entero
  // pasa por detras y se ve— y lo unico que se calma es el pendulo que lleva el CTA, que es lo que hay
  // que poder leer y tipear.
  //
  // Y NO LLEGA A CERO: se queda en el 34% de su amplitud, o sea 0.11 unidades de recorrido. Es la misma
  // regla que la de la camara aplicada al objeto — un pendulo detenido es una diapositiva colgada de un
  // hilo, y ademas seria falso: un pendulo real no se para en cinco beats.
  let latido = null
  if (pedido) {
    const p = colgar({ x: xEn(34.4), largo: L_PED, amp: AMP_TXT, grande: true, banda: true,
      lado: LADO_M, matMasa, matHilo: matHiloVivo, hiloW: 0.022 })
    montar(p, pedido, 0.15)
    p.frena = { t0: b(33.2), t1: b(meta.beats), hasta: 0.34 }
    acompanar(p.carro, tl, 34.4, meta.beats, xEn, 1.0)
    reservar(xEn(34.4), xEn(meta.beats), p.y)
    entra(pedido.g, tl, 33, { desde: 'arriba', dist: 5.5, dur: 1.7 })
    pedido.escribir(tl, 33.5, 0.9)
    latido = pedido.latir(0.032)
    uso.cta = pedido.tieneCta
    // El unico sitio de la pieza donde la luz sube. El ojo lo lee como que algo se resolvio, y cuesta un
    // tween.
    tl.to(ctx.bloom, { strength: (ctx.bloom.strength || 0.5) * 1.6, duration: b(2.0), ease: E.frena(2) }, b(31.8))
  }
  uso.cargados = pendulos.length

  // ---------------------------------------------------------------- el riel y la regla graduada
  //
  // EL RIEL SE MIDE CONTRA EL RECORRIDO REAL, NO CONTRA `LARGO`. La camara viaja `LARGO * R.velocidad`
  // y el retrato manda esa velocidad hasta 1.45, asi que el multiplicador tiene que estar en los DOS
  // lados de la cuenta. `archivo` dejo escrito lo que pasa cuando no lo esta: con 1.45 la camara llega
  // mas lejos que el mueble y el ultimo beat —el del CTA— se compone contra el vacio. Aca el vacio seria
  // el domo, que es menos grave que un plano emisivo, pero un banco de pendulos que se termina antes que
  // la pieza deja los pendulos colgando de nada.
  const ANCHO_RIEL = RECORRIDO + mundoW * 3.0
  const riel = new THREE.Mesh(new THREE.BoxGeometry(ANCHO_RIEL, 0.26, 0.34), matRiel)
  riel.position.set(0, RIEL_Y, 0)
  escena.add(riel)
  const filoRiel = barra(ANCHO_RIEL, 0.028, LOOK.acento, 1.2)
  filoRiel.position.set(0, RIEL_Y - 0.14, 0.18)
  escena.add(filoRiel)

  // LA REGLA GRADUADA, que es lo que convierte un banco de pesas en un INSTRUMENTO. Sin ella el espacio
  // dice "cosas colgando"; con ella dice "esto esta midiendo algo", que es todo el pitch de la plantilla.
  // Cuesta una linea larga y unas setenta marcas, y ninguna de ellas se anima.
  const escala = new THREE.Group()
  escena.add(escala)
  const linea = barra(ANCHO_RIEL, 0.022, LOOK.acento2 || LOOK.acento, 0.95)
  linea.position.set(0, ESCALA_Y, -0.30)
  escala.add(linea)
  const PASO_T = 0.75
  const nT = Math.floor(ANCHO_RIEL / PASO_T)
  for (let i = 0; i <= nT; i++) {
    const x = -ANCHO_RIEL / 2 + i * PASO_T
    const mayor = i % 4 === 0
    const t = barra(0.022, mayor ? 0.30 : 0.15, LOOK.acento2 || LOOK.acento, mayor ? 1.15 : 0.8)
    t.position.set(x, ESCALA_Y + (mayor ? 0.15 : 0.075), -0.30)
    escala.add(t)
  }

  // ---------------------------------------------------------------- el coro, y las otras velocidades
  //
  // REGLA 3: EL ESPACIO TIENE CAPAS A DISTINTAS VELOCIDADES. Aca el eje es X y no Z, asi que `paralaje()`
  // —que mueve en z— no sirve. No es una excepcion a la regla sino la misma regla en el otro eje: cada
  // capa se corre con la camara en una fraccion distinta, y lo que se ve es la diferencia.
  //
  // Un grupo que acompana a la camara al 55% se mueve, en pantalla, al 45% de lo que se mueve el banco
  // de adelante. Sumado a que esta mas lejos —y por perspectiva ya se movia menos— la separacion entre
  // capas queda leyendose sola.
  const capas = []

  // El perfil de alturas del coro. Dos senos con periodos que no son multiplos entre si: vuelven a
  // coincidir cada 628 unidades de riel y el riel mide 53 en el peor caso, asi que el banco no repite su
  // silueta ni una vez en toda la pieza. Es la misma receta que `marea` usa para el agua y `vueloAvance`
  // para su deriva — el idioma de la casa, aplicado al espacio en vez de al tiempo.
  const largoEn = (x) => 4.90 + 1.50 * Math.sin(x * 0.37 + 0.4) + 0.90 * Math.sin(x * 0.23 + 1.7)

  // CUANTO AIRE HAY ENTRE PENDULO Y PENDULO. Un sitio apretado cuelga un banco denso; uno que compone con
  // mucho blanco cuelga pocos y separados. Entre 0.85 y 1.95 de paso, o sea entre 62 y 27 pendulos sobre
  // el riel mas largo — el mismo espacio contado dos veces distintas.
  const PASO = 0.85 + 1.10 * (R.vacio != null ? R.vacio : 0.5)
  // UNO DE CADA CUANTOS SE HAMACA ANCHO. `R.movimientos` va de 2 a 6, asi que esto va de uno cada 7 a uno
  // cada 3. Es lo que hace que una pagina inquieta reciba un banco inquieto sin cambiar una sola forma.
  const CADA = Math.max(3, 9 - R.movimientos)

  const libre = (x, y) => !ocupados.some(o => x > o.x0 && x < o.x1 && Math.abs(y - o.y) < 1.30)

  // La fila de adelante: la que comparte riel con los cargados. No se corre — es la referencia contra la
  // que se miden las otras dos.
  const MEDIO = RECORRIDO / 2 + mundoW * 1.5
  let k = 0
  for (let x = -MEDIO; x <= MEDIO; x += PASO) {
    const L = largoEn(x)
    if (!libre(x, RIEL_Y - L)) { k++; continue }
    colgar({
      x, largo: L, amp: (k % CADA === 0) ? AMP_ANCHA : AMP_CORO,
      lado: 0.42 + az() * 0.22, altoM: 0.55 + az() * 0.28,
    })
    k++
  }
  uso.coro = pendulos.length - (uso.cargados || 0)

  // La capa lejana: pendulos mas grandes, mas atras y con su propio riel. Se corre con la camara al 55%.
  //
  // Su fila tiene que cubrir el recorrido APARENTE, que no es el mismo: si el grupo acompana al 55%, la
  // camara se mueve respecto de el `RECORRIDO * 0.45`, o sea +-`RECORRIDO * 0.225`. Mas medio cuadro a esa
  // profundidad (`mundoW * 24.4 / 17.44 / 2` = 3.94) y un margen. Sobredimensionarlo cuesta doce mallas;
  // quedarse corto deja el borde del cuadro sin capa justo en los beats donde la camara llega mas lejos.
  const lejos = new THREE.Group()
  escena.add(lejos)
  capas.push(lejos)
  const M_LEJOS = RECORRIDO * 0.25 + 9
  const rielL = new THREE.Mesh(new THREE.BoxGeometry(M_LEJOS * 2, 0.34, 0.4), matRiel)
  rielL.position.set(0, 6.10, -7)
  lejos.add(rielL)
  for (let x = -M_LEJOS; x <= M_LEJOS; x += 2.6) {
    colgar({
      padre: lejos, x, z: -7, rielY: 6.10, largo: 3.4 + az() * 4.2,
      amp: AMP_CORO * (0.7 + az() * 1.6), carro: false,
      lado: 0.62 + az() * 0.34, altoM: 0.8 + az() * 0.4, hiloW: 0.030,
    })
  }

  // La capa de ROCE, solo en las paginas que el motor midio densas. Son masas chicas a un tercio de la
  // distancia del lente: cruzan el cuadro en menos de un beat y funcionan como barrido entre tiempos.
  //
  // VAN ALTAS O BAJAS, NUNCA A LA ALTURA DEL TEXTO, y eso lo dejo escrito `archivo` despues de pagarlo:
  // una masa cruzando por delante del claim es ruido en el unico momento en que hay que LEER. A esa
  // profundidad el cuadro mide 3.5 de semialto, asi que la banda de +-2.0 a +-3.0 pasa por dentro del
  // encuadre y por fuera de donde vive el texto.
  let cerca = null
  if (R.capas >= 3) {
    cerca = new THREE.Group()
    escena.add(cerca)
    capas.push(cerca)
    const M_CERCA = RECORRIDO * 0.53 + 3
    for (let i = 0; i < 9; i++) {
      const x = -M_CERCA + (i / 8) * M_CERCA * 2 + (az() - 0.5) * 1.2
      const arriba = i % 2 === 0
      // El largo se DESPEJA de donde tiene que quedar la masa: `L = RIEL_Y - y`. Elegir el largo y
      // despues mirar donde cayo es como se consigue una masa fuera de cuadro con el numero bien puesto.
      const y = (arriba ? 1 : -1) * (2.0 + az() * 1.0)
      colgar({
        padre: cerca, x, z: distBase * 0.30, largo: RIEL_Y - y, amp: 0.20, carro: false,
        lado: 0.30 + az() * 0.16, altoM: 0.40 + az() * 0.18, hiloW: 0.020,
      })
    }
  }

  // Y la cuarta, solo en las mas densas de todas: hilos larguisimos con masas minusculas, muy al fondo.
  // No se lee como objetos sino como que el banco sigue mas alla del cuadro.
  let hondo = null
  if (R.capas >= 4) {
    hondo = new THREE.Group()
    escena.add(hondo)
    capas.push(hondo)
    const M_HONDO = RECORRIDO * 0.09 + 9
    // Con su riel, y no es decoracion: a 39.4 del lente el cuadro mide 22.6 de alto, asi que el pivote
    // en 9.5 cae DENTRO del encuadre y sin la barra se verian doce hilos naciendo de la nada.
    const rielH = new THREE.Mesh(new THREE.BoxGeometry(M_HONDO * 2, 0.5, 0.5), matRiel)
    rielH.position.set(0, 9.5, -22)
    hondo.add(rielH)
    for (let x = -M_HONDO; x <= M_HONDO; x += 3.1) {
      colgar({
        padre: hondo, x, z: -22, rielY: 9.5, largo: 7.0 + az() * 5.0,
        amp: AMP_CORO * 0.8, carro: false,
        lado: 0.9 + az() * 0.5, altoM: 1.1 + az() * 0.6, hiloW: 0.05,
      })
    }
  }
  uso.capas = 1 + capas.length
  uso.masas = pendulos.length

  // ---------------------------------------------------------------- lo continuo
  //
  // Todo lo de aca se evalua en CADA submuestra del obturador. Escrito como tween se muestrearia una vez
  // por cuadro y saldria a saltos justo donde el obturador deberia barrerlo — y en esta plantilla eso se
  // llevaria puesto el banco entero, que es su idea.
  //
  // LA REGLA DE `alSeek`, aplicada eje por eje y por eso escrita aca:
  //   - `brazo.rotation.z` y `plato.rotation.z` NO los anima ningun tween, asi que se ASIGNAN. Sumar
  //     acumularia en cada submuestra y el motor dejaria de ser determinista.
  //   - `carro.position.x` SI lo anima `acompanar` en cuatro pendulos, y por eso no se toca aca: se LEE.
  //     `seek()` corre `tl.time(t)` antes que `alSeek(t)`, asi que en este punto ya vale lo que el tween
  //     dejo.
  //   - `gPag` no es objetivo de ningun tween —lo es `prueba.g`, que vive adentro—, asi que se asigna.
  const alSeek = juntar(vuelo.alSeek, latido, (t) => {
    uDomo.uT.value = t
    // El polvo persigue a la camara en el eje del vuelo: un volumen fijo de particulas se agota a los
    // pocos beats de desliz y el aire se vacia justo cuando la pieza esta a media lectura.
    motas.position.x = camara.position.x
    motas.rotation.y = t * 0.015

    // Las capas. Cuanto mas acompana un grupo a la camara, mas lento se ve — por eso el fondo lleva el
    // numero mas alto y el roce el unico negativo.
    lejos.position.x = camara.position.x * 0.55
    if (cerca) cerca.position.x = camara.position.x * -0.06
    if (hondo) hondo.position.x = camara.position.x * 0.82

    // EL BANCO. Todos se sueltan en t = 0 desde el mismo angulo —`cos(0) = 1`— y a partir de ahi cada
    // uno corre a su periodo. No hay fase por pendulo y no hace falta: la divergencia la produce el
    // largo, que es exactamente lo que un experimento de pendulos demuestra.
    for (let i = 0; i < pendulos.length; i++) {
      const p = pendulos[i]
      const a = p.amp * amortDe(p, t) * Math.cos(p.w * t)
      p.ang = a
      p.brazo.rotation.z = a
      // El plato devuelve la parte del giro que el texto no tiene que heredar. Neto: `a * GIRO_TXT`.
      if (p.plato) p.plato.rotation.z = -a * (1 - GIRO_TXT)
    }

    // LA PAGINA, que cuelga del mismo pendulo desde otra escena. Se rehace la cuenta en vez de copiar la
    // posicion del brazo: el brazo esta a `-L` sobre el eje del pivote y girado `ang`, o sea que su punta
    // cae en `(x + L*sin(ang), rielY - L*cos(ang))`. Son dos lineas y no se pueden desincronizar.
    if (pPag) {
      const a = pPag.p.ang
      gPag.position.set(
        pPag.p.carro.position.x + Math.sin(a) * pPag.L,
        RIEL_Y - Math.cos(a) * pPag.L,
        Z_PAG)
      // Sin `plato`: un panel colgado de dos hilos gira con ellos. Por eso su amplitud es la mitad.
      gPag.rotation.z = a
    }
  }, ...respiraciones)

  return { dur: b(meta.beats), alSeek, uso }
}
