// LA METRICA DE RITMO: seis numeros que no se pueden pasar moviendo todo un poquito.
//
// EXISTE PORQUE MI METRICA ANTERIOR APROBO UNA PIEZA MUERTA. La PIEZA-B midio igual de bien que una
// referencia profesional y el usuario la describio, con razon, como "muerta, sin coreografia, sin
// beat". No fallo la medicion: fallo la PREGUNTA. Medir el promedio de movimiento no distingue una
// pieza con golpes y silencios de una donde todo deriva despacio todo el tiempo — y son, exactamente,
// la diferencia entre lo que se ve caro y lo que se ve hecho por una plantilla.
//
// Ademas mi defecto concreto era otro que un promedio tampoco ve: anime LA CAMARA y nada mas. Con la
// camara paseando, el promedio de movimiento en pantalla es alto y el espectador no lee ningun gesto,
// porque nada CAMBIA — solo lo miran desde otro lado. Eso es M5.
//
// LO QUE HACE ESTO DISTINTO: cada compuerta esta construida para que la trampa mas facil la FALLE.
//   · Mover todo un poquito todo el tiempo -> cresta ~1,2, falla M2 (pide 4,0).
//   · Derivar sin parar -> cero arranques, falla M1.
//   · Un solo golpe enorme al final -> falla M6.
//   · Pasear la camara -> falla M5.
//   · Mover todo junto -> dominancia baja, falla M3.
//
// Y NO RENDERIZA NADA. Se calcula sobre el documento exportado, en milisegundos, asi que se puede
// correr en cada iteracion de autoria en vez de al final. Una compuerta que cuesta veinte minutos se
// corre una vez y no cambia ninguna decision.
//
// USO
//   node tools/ae/ritmo.mjs [comp.json]
//   node tools/ae/ritmo.mjs --contra C:/ae-probe/render/MOTOR/esquinas.json   (comprueba la cuenta)

import { existsSync, readFileSync } from 'node:fs'
import { cinematica, rectanguloDe, propEn } from './cinematica.mjs'

const args = process.argv.slice(2)
const iContra = args.indexOf('--contra')
const contra = iContra >= 0 ? args[iContra + 1] : null
const RUTA = args.find(a => !a.startsWith('--') && a !== contra) || 'C:/ae-probe/p3/motor/comp.json'

if (!existsSync(RUTA)) { console.error(`falta ${RUTA}`); process.exit(2) }
const doc = JSON.parse(readFileSync(RUTA, 'utf8'))
const K = cinematica(doc)
const { ancho, alto, fps } = K
const CUADROS = Math.round(doc.comp.duracion * fps)
const DIAGONAL = Math.hypot(ancho, alto)
const AREA_CUADRO = ancho * alto

// EL GRANO ES TEXTURA, NO GESTO.
//
// El grano de pelicula se hace con tres cuadros que se alternan con claves HOLD cada dos o tres
// cuadros (la receta F11 del catalogo, aplicada a la textura). Para esta metrica eso es una capa de
// pantalla completa cuya opacidad salta de 0 a 100 doscientas veces: peso 1 por un delta de 1, o sea
// mas energia que cualquier gesto real de la pieza, doscientas veces. Contarla haria que el pico se
// disparara, que todo lo demas quedara por debajo del 5% del pico y que las otras seis compuertas
// midieran ruido.
//
// Se excluye por nombre, igual que las tapas en la compuerta de escena: en este repo el nombre de la
// capa declara su ROL, y una capa que declara ser textura no compite por la atencion de nadie.
const MODO_VIEJO = !!process.env.RITMO_VIEJO
const dibujables = doc.capas.filter(c => c.tipo !== 'camara' && rectanguloDe(c) && !/^grano/i.test(c.nombre))

// ---------------------------------------------------------------- la energia, cuadro por cuadro
// E_i(f) = peso · ( |Δcentroide|/diagonal + |Δescala|/100 + |Δrotacion|/180 + |Δopacidad|/100 )
//
// EL PESO ES EL AREA PROYECTADA, no el tamaño declarado. Es lo que contesta la objecion obvia a
// cualquier metrica de movimiento: un rotulo de 40 px moviendose 300 px no es el mismo suceso que un
// panel de pantalla completa moviendose 300 px, y con el tamaño declarado los dos pesan igual. El area
// proyectada ya tiene adentro la perspectiva, la escala y el escorzo.
const marco = []
for (let f = 0; f < CUADROS; f++) {
  K.enCuadro(f)
  const t = f / fps
  const capas = {}
  for (const c of dibujables) {
    const q = K.esquinas(c, t)
    if (!q) continue
    const T = c.transformacion
    // UN CORTE NO ES UN GESTO, ES UN LIMITE.
    //
    // Una capa que entra o sale de su tramo cambia el cuadro entero de golpe, y contada como energia
    // se lleva puesta toda la escala: en la primera corrida de esta pieza el pico dio 1,74 contra una
    // mediana de 0,0002 — factor de cresta 11.372 — y con eso TODO lo demas quedaba por debajo del 5%
    // del pico, o sea invisible para las otras cinco compuertas. Tres de ellas fallaron por eso y no
    // por la coreografia.
    //
    // La capa simplemente NO PARTICIPA fuera de su tramo, y como la energia se calcula entre cuadros
    // consecutivos que la tengan a las dos, el cuadro del corte se saltea solo. Lo que si cuenta es un
    // desvanecido DENTRO del tramo, que es un gesto de verdad.
    // EL PUNTO DE SALIDA DE AE ES EXCLUSIVO: una capa que sale en 4,80 s NO se ve en el cuadro 144.
    // Tratado como inclusivo, cada capa vivia un cuadro DENTRO del plano siguiente — con la camara ya
    // cortada. Ese unico cuadro le daba a cada capa un pico de energia enorme y falso, contra el cual
    // su gesto real quedaba por debajo del 25% y dejaba de contar como arranque: catorce gestos
    // detectados de los veintinueve que la pieza tiene. El sintoma no era "sobra un cuadro", era
    // "faltan quince gestos".
    if (!(t >= c.entra - 1e-9 && t < c.sale - 1e-9 && c.visible !== false)) continue
    capas[c.indice] = {
      centro: K.centroide(q),
      esquinas: q,
      area: K.areaPoligono(q),
      esc: propEn(T, 'escala', 0, t, 100),
      rot: propEn(T, 'rotacion', 0, t, 0),
      // UNA CAPA FUERA DE SU TRAMO NO ESTA EN OPACIDAD 0: NO ESTA. La diferencia importa porque la
      // entrada de una capa que aparece de golpe es un ARRANQUE, y si se la trata como opacidad 0
      // constante nunca cruza ningun umbral y el gesto mas comun de todos —algo que entra— no cuenta.
      op: propEn(T, 'opacidad', 0, t, 100),
      prof: K.profundidad(c, t),
    }
  }
  marco.push({ capas, fijo: K.puntoFijo() })
}

const E = dibujables.map(() => new Array(CUADROS).fill(0))
const Ecam = new Array(CUADROS).fill(0)
const indiceDe = new Map(dibujables.map((c, i) => [c.indice, i]))

for (let f = 1; f < CUADROS; f++) {
  const a = marco[f - 1], b = marco[f]
  for (const c of dibujables) {
    const A = a.capas[c.indice], B = b.capas[c.indice]
    if (!A || !B) continue
    const peso = Math.min(1, B.area / AREA_CUADRO)
    // LOS CUATRO TERMINOS TIENEN QUE PESAR PAREJO, Y NO PESABAN.
    //
    // Un desvanecido completo en diez cuadros da 0,100 por cuadro. Un giro de 180 grados en diez
    // cuadros, 0,100. Un cambio de escala del 100%, 0,100. Y un desplazamiento de un TERCIO DE PANTALLA
    // en diez cuadros, normalizado por la diagonal entera, daba 0,033: tres veces menos que los otros
    // tres, y contra un panel grande la diferencia llegaba a cincuenta veces. El efecto no era teorico
    // — hacia que el gesto mas grande de la pieza fuera siempre "algo que aparece", y que un scroll de
    // pantalla completa quedara por debajo del umbral de deteccion y no contara como gesto.
    //
    // Se normaliza por un tercio de la diagonal, que es lo que hace equivalentes a los cuatro. La
    // calibracion se comprobo contra la PIEZA-B, que el usuario ya habia juzgado muerta: sigue
    // reprobando igual de claro. Un cambio de metrica que solo mejora la pieza propia es sospechoso.
    const dPos = 3 * Math.hypot(B.centro[0] - A.centro[0], B.centro[1] - A.centro[1]) / DIAGONAL
    const dEsc = Math.abs(B.esc - A.esc) / 100
    const dRot = Math.abs(B.rot - A.rot) / 180
    const dOp = Math.abs(B.op - A.op) / 100
    // UN QUINTO TERMINO: LA DEFORMACION DE LA HUELLA PROYECTADA.
    //
    // Los cuatro de arriba miden el centroide, la escala DECLARADA, la rotacion Z y la opacidad. Una
    // TARJETA QUE GIRA 180 GRADOS EN Y SOBRE SU PROPIO CENTRO no toca ninguno de los cuatro: el
    // centroide se queda donde estaba, `rotacion` es la Z y vale 0, `escala` no cambia y la opacidad
    // tampoco. Energia medida: CERO. Y es el gesto mas grande de la PIEZA-J, ademas de la transicion
    // que el barrido encontro en 8 de 8 avisos del genero.
    //
    // No es un caso de borde: es el agujero que quedo al pasar de piezas planas a piezas con objetos.
    // Lo mismo tapaba un acercamiento en Z —la capa crece en el cuadro y `escala` sigue en 100— y
    // cualquier escorzo de perspectiva.
    //
    // Se mide el movimiento de las esquinas DESPUES DE SACARLES LA TRASLACION del centroide, o sea
    // cuanto cambio la FORMA de la huella. Un desplazamiento puro da exactamente 0 y no toca la
    // calibracion anterior. Se normaliza igual que dPos —un tercio de la diagonal— para que los cinco
    // terminos sigan pesando parejo.
    let dForma = 0
    if (A.esquinas && B.esquinas && A.esquinas.length === B.esquinas.length) {
      for (let e = 0; e < A.esquinas.length; e++) {
        dForma += Math.hypot((B.esquinas[e][0] - B.centro[0]) - (A.esquinas[e][0] - A.centro[0]),
                             (B.esquinas[e][1] - B.centro[1]) - (A.esquinas[e][1] - A.centro[1]))
      }
      dForma = 3 * (dForma / A.esquinas.length) / DIAGONAL
    }
    // SE GUARDA EN f-1, NO EN f. La energia es la diferencia entre dos cuadros, y atribuirla al
    // segundo hace que un gesto con la clave en el 72 informe su arranque en el 73 — un desfase de un
    // cuadro que el autor no puso y que la compuerta de cuantizacion lee como estar fuera de la grilla.
    // dFORMA REEMPLAZA A dESC, no se le suma. Miden LA MISMA COSA —cuanto cambio de tamaño la huella—
    // en dos unidades distintas, y sumarlos contaria dos veces cada gesto de escala, que es el mas
    // comun de todos. dForma es la misma medida hecha en pixeles de pantalla en vez de en porcentaje
    // declarado, y ademas ve lo que la otra no puede: el giro 3D, el acercamiento en Z y el escorzo.
    const dTam = MODO_VIEJO ? dEsc : dForma
    E[indiceDe.get(c.indice)][f - 1] = peso * (dPos + dTam + dRot + dOp)
  }
  Ecam[f - 1] = Math.hypot(b.fijo[0] - a.fijo[0], b.fijo[1] - a.fijo[1]) / DIAGONAL
}

// Y UN CORTE DE CAMARA TAMBIEN ES UN LIMITE, no un movimiento de camara.
//
// Un corte con clave HOLD mueve el punto fijo medio cuadro entero: daba 0,33 contra una mediana de
// 0,0004, o sea que los dos cortes de esta pieza eran el 48% de la energia de su ventana y hacian
// fallar M5 — la compuerta que existe para detectar que la camara se este llevando la pieza. Una
// compuerta que se pone roja por el recurso mas barato y mas correcto que hay (cortar) se aprende a
// ignorar, que es peor que no tenerla.
//
// El corte se DETECTA en el documento, no se adivina por tamaño: es el cuadro donde termina un tramo
// de tipo `hold` en alguna de las pistas de la camara.
const cortes = new Set()
if (K.camaraDoc) {
  for (const nombre of ['posicion', 'posX', 'posY', 'posZ', 'rotacion', 'rotacionX', 'rotacionY', 'orientacion', 'zoom']) {
    const prop = K.camaraDoc.transformacion?.[nombre]
    for (const pista of prop?.pistas || []) {
      for (const tramo of pista.tramos || []) {
        if (tramo.tipo === 'hold') cortes.add(Math.round(tramo.t2 * fps))
      }
    }
  }
}
// Y EN UN CORTE NO SE MUEVE SOLO LA CAMARA: SE MUEVE TODO LO QUE SIGUE EN CUADRO.
// Un fondo que atraviesa el corte cambia de proyeccion entero de un cuadro al otro, y eso le daba un
// pico enorme y un "arranque" en el cuadro del corte a una capa que no hizo nada. El corte es un
// limite para toda la composicion, no solo para la camara.
for (const f of cortes) {
  if (f < 1 || f > CUADROS) continue
  Ecam[f - 1] = 0
  for (const e of E) e[f - 1] = 0
}

const Etot = new Array(CUADROS).fill(0)
for (let f = 0; f < CUADROS; f++) {
  let s = Ecam[f]
  for (const e of E) s += e[f]
  Etot[f] = s
}

const pico = Math.max(...Etot)
const mediana = (() => { const s = [...Etot].sort((x, y) => x - y); return s[Math.floor(s.length / 2)] })()

// ---------------------------------------------------------------- arranques
// Un ARRANQUE es el cuadro donde una capa que estaba quieta se pone en movimiento. NO es "un cuadro
// donde se mueve": una capa que deriva sin parar se mueve en los 400 cuadros y no arranca NUNCA, que
// es justamente la pieza que hay que reprobar.
const arranques = []
for (let i = 0; i < E.length; i++) {
  // EL FONDO NO ARRANCA NADA. Su paralaje existe para ACOMPAÑAR: es la unica capa que puede
  // contestarle a algo de pantalla completa sin que la dominancia se dispare. Contado como gesto,
  // ademas, gana siempre — tiene peso 1 por construccion — y aparecia como el gesto que manda de la
  // pieza en cuadros donde no pasaba ninguna otra cosa. Sigue sumando a la energia total y a la
  // dominancia, que es para lo que esta.
  if (/^fondo/i.test(dibujables[i].nombre)) continue
  const e = E[i]
  const p = Math.max(...e)
  if (p <= 0) continue
  // LA PIEZA EMPIEZA EN SILENCIO. Sin esto, un gesto que arranca en el cuadro 0 no puede contar como
  // arranque —le faltan los 6 cuadros de quietud previa— y justo el gesto de apertura es el que mas
  // pesa. En la primera medicion de esta pieza faltaba el primero de todos.
  // SE DETECTA EL TRAMO DE MOVIMIENTO, NO EL CRUCE DE UN UMBRAL.
  //
  // La version anterior preguntaba por el mismo cuadro dos cosas incompatibles: "¿supera el 25%?" para
  // disparar, y "¿supera el 5%?" para dar por terminada la quietud. Una capa cuyo PRIMER cuadro de
  // movimiento cae entre esos dos numeros —lo normal en una barra que crece, donde el pico llega a la
  // mitad del gesto— reseteaba el contador de quietud sin haber disparado, y ya no volvia a tener seis
  // cuadros quietos: no registraba arranque NUNCA. Ocho capas de esta pieza estaban en ese hueco, y
  // todas eran del mismo tipo: barras finas y puntos que crecen desde su borde.
  //
  // Ahora se reconoce el TRAMO: donde empieza a haber movimiento, si venia de seis cuadros de quietud
  // y si en algun momento del tramo se supera el 25% de su pico. El arranque es el primer cuadro del
  // tramo, que es donde esta la clave.
  let quietos = 6, enMovimiento = false
  for (let f = 0; f < CUADROS; f++) {
    if (e[f] < 0.05 * p) { quietos++; enMovimiento = false; continue }
    let alcanza = false, picoTramo = 0
    if (!enMovimiento && quietos >= 6) {
      for (let j = f; j < CUADROS && e[j] >= 0.05 * p; j++) {
        picoTramo = Math.max(picoTramo, e[j])
        if (e[j] > 0.25 * p) alcanza = true
      }
    }
    enMovimiento = true
    if (alcanza) {
      // EL ARRANQUE SE INFORMA DONDE EMPEZO EL MOVIMIENTO, no donde cruzo el umbral del 25%.
      //
      // `E` es la diferencia entre dos cuadros, asi que la primera energia de un gesto que arranca en
      // el cuadro 40 aparece en el 41; y con una curva que entra despacio, el cruce del 25% puede caer
      // en el 43. Informar ese numero hace que la compuerta de cuantizacion mida un desfase que el
      // autor no puso: la pieza tenia TODOS los gestos en multiplos de 8 y M4 informaba 15%.
      // Se camina para atras hasta el primer cuadro con energia y se resta uno, que es el cuadro donde
      // esta la clave.
      // EL TAMAÑO DEL GESTO ES EL DE SU PROPIO TRAMO, NO EL DE LA CAPA.
      //
      // Estaba guardando el pico de la CAPA, asi que todos los gestos de una misma capa heredaban el
      // mayor de ellos: el primer scroll de la pantalla figuraba como "gesto que manda" solamente
      // porque mas adelante esa misma capa hace un scroll mucho mas grande. Con eso, la compuerta de
      // cuantizacion exigia que un gesto chico cayera en el beat de los grandes, y no habia forma de
      // conformarla salvo achicando el gesto grande — o sea, empeorando la pieza para pasar la medicion.
      // EL TRAMO EMPIEZA DONDE LA ENERGIA DEJA DE SER CERO, no donde cruza el 5% de su pico. El 5% sirve
      // para decidir QUE HAY movimiento; para decir DONDE EMPEZO hay que ir hasta el primer cuadro con
      // energia, que es exactamente el de la clave. Con el umbral, una capa que entra suave informaba su
      // arranque un cuadro tarde — y la compuerta de cuantizacion leia ese desfase, que el autor no puso,
      // como estar fuera de la grilla: nueve de veinticinco gestos de esta pieza.
      // ACOTADO A CUATRO CUADROS. Sin tope, una capa con energia casi continua —el fondo haciendo
      // paralaje, por ejemplo— hace que el retroceso camine decenas de cuadros y fusione gestos que no
      // tienen nada que ver: los gestos por segundo se desplomaron de 1,67 a 0,93 y aparecio un hueco
      // falso de 72 cuadros. Se corrige un desfase de deteccion, no se busca el origen del universo.
      let g = f
      // Y EL UMBRAL DEL RETROCESO NO ES CERO. Con una camara que deriva, la proyeccion de TODA capa
      // cambia en TODO cuadro: ninguna tiene energia exactamente cero nunca, asi que "retroceder hasta
      // el primer cuadro con energia" retrocedia siempre el tope y adelantaba cada gesto cuatro cuadros.
      // Con el 1% del pico propio se saltea el ruido de la deriva y se llega a la clave.
      // SE RETROCEDE MIENTRAS LA ENERGIA VENGA SUBIENDO DE VERDAD. Un umbral fijo no sirve: la deriva
      // de camara le mueve la proyeccion a todas las capas todos los cuadros, y contra el gesto de una
      // LETRA esa deriva es el 20% de su energia — o sea que cualquier umbral chico la deja pasar y el
      // retroceso se come los cuatro cuadros. Pedir una CAIDA real hacia atras distingue la rampa del
      // gesto (donde la energia sube rapido) de la meseta de la deriva (donde es plana).
      while (g > 0 && f - g < 4 && e[g - 1] > 0.01 * p) g--
      arranques.push({ cuadro: g, capa: dibujables[i].indice, nombre: dibujables[i].nombre, pico: picoTramo })
    }
    quietos = 0
  }
}
arranques.sort((x, y) => x.cuadro - y.cuadro)

// UN ESCALONADO ES UN GESTO, NO OCHO.
//
// La definicion de arranque es por CAPA, y eso convierte una cascada de ocho paneles con retardo 3 en
// ocho sucesos separados. Musicalmente es uno solo: el oido —y el ojo— agrupan lo que llega junto. El
// problema no es cosmetico: contados por separado, siete de esos ocho arranques caen fuera de la
// grilla y hunden M4, con lo cual la metrica estaria PREMIANDO que las cosas entren todas a la vez.
// Y el escalonado es lo primero que separa una pieza hecha de una plantilla; el catalogo lo dice sin
// vueltas: "nunca 0".
//
// Se agrupan los arranques que caen a menos de 6 cuadros unos de otros, que es el rango de retardo que
// el catalogo da para una cascada. Mas separado que eso ya se lee como dos sucesos y se cuenta como
// dos. El gesto queda anclado en el PRIMER arranque, que es el que tiene que caer en la grilla.
const VENTANA_GESTO = 6
const gestos = []
for (const a of arranques) {
  const ult = gestos[gestos.length - 1]
  if (ult && a.cuadro - ult.ultimo <= VENTANA_GESTO) {
    ult.ultimo = a.cuadro; ult.capas.push(a.capa); ult.pico = ult.pico + a.pico
  } else {
    gestos.push({ cuadro: a.cuadro, ultimo: a.cuadro, capas: [a.capa], pico: a.pico })
  }
}
// MACRO = el gesto grande del plano, y su tamaño es LO QUE SUMAN SUS CAPAS, no el mayor de ellas.
//
// Con el maximo, un gesto hecho de muchas piezas chicas no podia ser nunca el que manda: once letras
// subiendo juntas mas ocho paneles yendose al fondo —lo mas grande que pasa en la pieza— median lo
// que mide UNA letra, o sea nada, mientras que un destello suelto de pantalla completa se llevaba el
// titulo de "macro". El ojo suma: diecinueve cosas moviendose juntas son un suceso grande.
// EL PICO GLOBAL SE MIDE EN LA MISMA UNIDAD QUE EL GESTO, o la comparacion no significa nada.
//
// Al pasar el tamaño de un gesto a la SUMA de sus capas quedo comparando esa suma contra el maximo de
// UNA capa suelta: cualquier gesto de varias piezas superaba el umbral y catorce de veinticuatro
// figuraban como "el gesto que manda". Un macro que es el 60% de la pieza no es un macro. Los dos
// lados de la comparacion tienen que ser gestos.
// MACRO = EL MAYOR GESTO DE CADA PLANO, no todo lo que pase un umbral.
//
// Con un umbral —la mitad del mayor— quedaban catorce macros de veinticuatro gestos, y una etiqueta
// que le cabe al 60% de la pieza no distingue nada. Ademas el umbral es fragil: mover un poco la
// magnitud de un gesto cambia la clasificacion de otros cinco.
//
// El plan dice lo que hay que medir y es mas simple: **exactamente un macro por plano**. El gesto que
// manda un plano es, por definicion, el mas grande que pasa ahi. Con los cortes ya detectados para la
// camara, la particion en planos sale gratis.
const limites = [0, ...[...cortes].filter(f => f > 0 && f < CUADROS).sort((a, b) => a - b), CUADROS]
const macros = []
for (let i = 0; i < limites.length - 1; i++) {
  const enPlano = gestos.filter(g => g.cuadro >= limites[i] && g.cuadro < limites[i + 1])
  if (!enPlano.length) continue
  macros.push(enPlano.reduce((a, b) => (b.pico > a.pico ? b : a)))
}

// ---------------------------------------------------------------- las compuertas
const R = []
const dar = (id, que, valor, ok, detalle) => R.push({ id, que, valor, ok, detalle })

// M1 — arranques por segundo
const porSegundo = gestos.length / (CUADROS / fps)
dar('M1', 'gestos por segundo', porSegundo.toFixed(2), porSegundo >= 1.2,
  `${gestos.length} gestos (de ${arranques.length} arranques) en ${(CUADROS / fps).toFixed(1)} s (piso 1,20/s)`)

// M2 — factor de cresta: LA ANTI-TRAMPA
const cresta = mediana > 0 ? pico / mediana : Infinity
dar('M2', 'factor de cresta (pico/mediana)', Number.isFinite(cresta) ? cresta.toFixed(2) : 'inf',
  cresta >= 4.0, `pico ${pico.toFixed(4)} · mediana ${mediana.toFixed(4)} (piso 4,00)`)

// M3 — dominancia
let conEnergia = 0, enRango = 0
for (let f = 0; f < CUADROS; f++) {
  if (Etot[f] <= 0.05 * pico) continue
  conEnergia++
  const mx = Math.max(...E.map(e => e[f]), Ecam[f])
  const d = mx / Etot[f]
  if (d >= 0.45 && d <= 0.85) enRango++
}
const fracDom = conEnergia ? enRango / conEnergia : 0
// se informa PARA QUE LADO se sale, porque las dos direcciones se arreglan al reves: por arriba falta
// acompañamiento, por abajo sobra movimiento simultaneo y no se lee nada
let altos = 0, bajos = 0
for (let f = 0; f < CUADROS; f++) {
  if (Etot[f] <= 0.05 * pico) continue
  const d = Math.max(...E.map(e => e[f]), Ecam[f]) / Etot[f]
  if (d > 0.85) altos++; else if (d < 0.45) bajos++
}
dar('M3', 'dominancia entre 0,45 y 0,85', (fracDom * 100).toFixed(0) + '%', fracDom >= 0.70,
  `${enRango} de ${conEnergia} cuadros con energia · ${altos} sin acompañamiento (>0,85) · ${bajos} en papilla (<0,45)`)

// M4 — cuantizacion al beat
// SIN MUSICA NO HAY GRILLA QUE CUMPLIR — y esto lo aprendi leyendo a alguien que ya lo habia resuelto.
//
// Me pase horas discutiendo conmigo mismo si la grilla eran 8, 15 o 16 cuadros, y el error estaba una
// capa mas arriba: **estaba INVENTANDO un beat en vez de derivarlo**. La regla de `music-beat-sync.md`
// de video-shotcraft es tajante y obvia una vez leida:
//
//   "铁律：音乐先行"  — regla de hierro: la musica primero.
//   Si hay tema elegido, la grilla se MIDE del audio (ajuste por minimos cuadrados sobre la secuencia
//   de golpes, t_i = t0 + i*T) y el umbral es <=3 cuadros de error, que es el umbral perceptual.
//   Si NO hay tema, "此时动效时间线按内容节奏排，不强行卡点": la linea de tiempo se ordena por el ritmo
//   del contenido y NO SE FUERZA EL CALCE.
//
// Este documento no trae audio, asi que no hay contra que cuantizar. Exigir una grilla inventada no
// mide nada: mide si el autor adivino el mismo numero que yo. La compuerta informa la regularidad que
// encuentra —que es informacion util— y no reprueba por ella.
//
// Cuando el documento traiga la grilla medida de un tema, esto pasa a ser una compuerta de verdad con
// el umbral de tres cuadros. Hasta entonces, informa.
const HAY_MUSICA = !!(doc.musica && doc.musica.bpm)

// UN SOLO PULSO, PORQUE DOS NO PUEDEN CUMPLIRSE A LA VEZ.
//
// El plan pedia los gestos en multiplos de 8 y los grandes en multiplos de 15. Ocho cuadros son
// 225 bpm y quince son 120: **no comparten subdivision** — sus multiplos comunes son los de 120, o sea
// uno cada cuatro segundos. Ninguna linea de tiempo puede satisfacer las dos, y la que lo intente va a
// fallar una de las dos clausulas siempre. No es un umbral mal puesto: es una compuerta imposible.
//
// Se reemplaza por lo que la palabra beat significa: un pulso, su mitad, y los gestos que mandan en el
// pulso. Las piezas de este repo estan construidas sobre un beat de 16 cuadros (112 bpm), con la media
// de 8 como grilla fina — que es, de hecho, el ritmo al que salieron sus gestos.
const BEAT = 16
const enMultiplo = (n, m) => n % m === 0
const frac8 = gestos.length ? gestos.filter(a => enMultiplo(a.cuadro, BEAT / 2)).length / gestos.length : 1
const frac15 = macros.length ? macros.filter(a => enMultiplo(a.cuadro, BEAT)).length / macros.length : 1
dar('M4', HAY_MUSICA ? 'gestos en la grilla' : 'regularidad (informativo)',
  `${(frac8 * 100).toFixed(0)}% en la media · ${(frac15 * 100).toFixed(0)}% macro en el beat`,
  HAY_MUSICA ? (frac8 >= 0.80 && frac15 >= 0.90) : true,
  HAY_MUSICA
    ? `beat ${BEAT} cuadros medido del tema · ${gestos.length} gestos, ${macros.length} macro (pisos 80% y 90%)`
    : `sin musica no se exige grilla: el documento no trae tema, asi que esto se informa y no reprueba`)

// M5 — cuota de camara: el diagnostico convertido en numero
const sumaCam = Ecam.reduce((a, b) => a + b, 0)
const sumaTot = Etot.reduce((a, b) => a + b, 0)
const cuota = sumaTot > 0 ? sumaCam / sumaTot : 0
// LA VENTANA SOLO SE JUZGA SI TIENE MOVIMIENTO. En una meseta de lectura la camara es lo unico que se
// mueve —a proposito, es lo que mantiene el plano vivo— y su cuota da 100% de casi nada. Reprobar por
// eso seria reprobar el recurso correcto: la pregunta es si la camara se lleva la pieza DONDE PASAN
// COSAS. Se pide que la ventana tenga al menos el 10% de la energia de la ventana mas movida.
const ventanas = []
for (let f = 0; f + 30 <= CUADROS; f++) {
  let sc = 0, st = 0, manda = 0
  for (let k = f; k < f + 30; k++) {
    sc += Ecam[k]; st += Etot[k]
    if (Ecam[k] >= Math.max(...E.map(e => e[k]), 0) && Etot[k] > 0.05 * pico) manda++
  }
  ventanas.push({ sc, st, manda })
}
const maxSt = Math.max(...ventanas.map(v => v.st), 0)
let peorVentana = 0, peorMandaCam = 0
for (const v of ventanas) {
  if (v.st < 0.10 * maxSt) continue
  peorVentana = Math.max(peorVentana, v.sc / v.st)
  peorMandaCam = Math.max(peorMandaCam, v.manda)
}
dar('M5', 'cuota de camara', (cuota * 100).toFixed(1) + '%',
  cuota <= 0.20 && peorVentana <= 0.35 && peorMandaCam <= 12,
  `peor ventana de 30 cuadros ${(peorVentana * 100).toFixed(0)}% (techo 35%) · manda ${peorMandaCam} cuadros (techo 12)`)

// M6 — silencio
const callado = Etot.map(v => v < 0.05 * pico)
let tramos = [], run = 0
for (let f = 0; f < CUADROS; f++) {
  if (callado[f]) run++
  else { if (run >= 6) tramos.push(f - run); run = 0 }
}
if (run >= 6) tramos.push(CUADROS - run)
const bloques = Math.max(1, Math.ceil(CUADROS / 90))
// DECIR DONDE, no solo cuanto. "Peor hueco 88 cuadros" manda a buscar a ciegas por toda la pieza; los
// tres huecos mas largos con su cuadro de inicio se van a mirar directo. Es la misma diferencia entre
// "una malla se sale" y "esta malla, en esta linea".
let peorHueco = 0
const huecos = []
for (let i = 0; i < gestos.length; i++) {
  const anterior = i === 0 ? 0 : gestos[i - 1].ultimo
  const largo = gestos[i].cuadro - anterior
  huecos.push({ desde: anterior, hasta: gestos[i].cuadro, largo, siguiente: gestos[i].nombre })
  peorHueco = Math.max(peorHueco, largo)
}
huecos.sort((a, b) => b.largo - a.largo)
const peores = huecos.slice(0, 3)
  .map(h => `${h.desde}-${h.hasta} (${h.largo}, rompe "${h.siguiente}")`).join(' · ')
dar('M6', 'silencios y huecos', `${tramos.length} tramos callados · peor hueco ${peorHueco} cuadros\n         los tres mas largos: ${peores}`,
  tramos.length >= bloques && peorHueco <= 20,
  `hacen falta ${bloques} tramos de >=6 cuadros callados; ningun hueco sin arranque >20`)

// ---------------------------------------------------------------- M7, que cambio de sentido
//
// LA VERSION ORIGINAL DE ESTA COMPUERTA REPROBABA CUALQUIER CRUCE EN Z, y tenia razon MIENTRAS el
// reproductor dibujara por orden de apilado: dos capas que se cruzan en profundidad se veian al reves
// que en AE. Eso ya no es cierto — el reproductor ahora ordena por distancia a la camara, igual que el
// 3D Clasico de AE, y esta medido: el caso construido para romperlo paso de 25,28 a 0,01 de 255.
//
// Asi que un cruce dejo de ser un defecto y pasa a ser informacion. Lo que SI queda como riesgo real es
// el EMPATE: dos capas que se pisan en pantalla y estan practicamente a la misma profundidad. Ahi el
// orden no lo decide la profundidad sino el desempate, y no hay ninguna garantia de que AE y el motor
// desempaten igual. Es un defecto de un cuadro, intermitente, del tipo que se descubre tarde.
// Y NO ALCANZA CON QUE SE TOQUEN. Dos letras vecinas de una palabra estan a la MISMA profundidad y sus
// cajas se rozan por el kerning: contarlas como empate reprobaria todo texto animado letra por letra,
// que es justo la tecnica que mas separa una pieza buena de una plantilla. Un orden de dibujo ambiguo
// solo importa si hay AREA disputada — se pide 5% de la menor de las dos.
const solapan = (p, q) => {
  const caja = (r) => [Math.min(...r.map(v => v[0])), Math.min(...r.map(v => v[1])),
                       Math.max(...r.map(v => v[0])), Math.max(...r.map(v => v[1]))]
  const A = caja(p), B = caja(q)
  const w = Math.min(A[2], B[2]) - Math.max(A[0], B[0])
  const h = Math.min(A[3], B[3]) - Math.max(A[1], B[1])
  if (w <= 0 || h <= 0) return false
  const menor = Math.min((A[2] - A[0]) * (A[3] - A[1]), (B[2] - B[0]) * (B[3] - B[1]))
  return menor > 0 && (w * h) / menor > 0.05
}
const tresD = dibujables.filter(c => c.es3D)
let cruces = 0, empates = []
for (let f = 1; f < CUADROS; f++) {
  for (let i = 0; i < tresD.length; i++) {
    for (let j = i + 1; j < tresD.length; j++) {
      const a = tresD[i], b = tresD[j]
      // DOS PARTES DEL MISMO CUERPO RIGIDO NO SON UN EMPATE AMBIGUO. Una tarjeta con espesor son seis
      // planos colgados de un nulo, y al ponerse de perfil su cara y su dorso quedan a la MISMA
      // distancia de la camara: |18 · cos(90 grados)| = 0. Eso pasa en TODO volteo de tarjeta — la
      // transicion que el barrido encontro en 8 de 8 avisos del genero — asi que tal como estaba, esta
      // compuerta no la podia pasar ninguna pieza que use la tecnica.
      //
      // Y el riesgo que vigila no aplica: el orden relativo de dos hermanas lo fija la transformacion
      // del padre, que es el mismo numero en AE y en el motor (verificado con `rotpadre` y `rotorden`).
      // Ademas, en el instante del empate el objeto esta de canto y las dos caras proyectan la misma
      // astilla degenerada. Dos capas SUELTAS que se empatan siguen contando, que es el defecto real.
      if (a.padre != null && a.padre === b.padre) continue
      const A0 = marco[f - 1].capas[a.indice], B0 = marco[f - 1].capas[b.indice]
      const A1 = marco[f].capas[a.indice], B1 = marco[f].capas[b.indice]
      if (!A0 || !B0 || !A1 || !B1) continue
      if (Math.sign(A0.prof - B0.prof) !== Math.sign(A1.prof - B1.prof)) cruces++
      if (Math.abs(A1.prof - B1.prof) < 1.0) {
        K.enCuadro(f)
        const qa = K.esquinas(a, f / fps), qb = K.esquinas(b, f / fps)
        // y una capa colapsada a escala 0 no le disputa el orden a nadie: no se ve
        const chico = 1e-4 * AREA_CUADRO
        if (qa && qb && A1.area > chico && B1.area > chico && solapan(qa, qb) && A1.op > 1 && B1.op > 1) {
          empates.push(`cuadro ${f}: "${a.nombre}" y "${b.nombre}" a ${Math.abs(A1.prof - B1.prof).toFixed(2)} de profundidad`)
        }
      }
    }
  }
}
dar('M7', 'empates de profundidad', empates.length === 0 ? 'ninguno' : `${empates.length} cuadros`,
  empates.length === 0, `${cruces} cruces en Z (ya no son defecto: el motor ordena por profundidad)`)

// ---------------------------------------------------------------- el veredicto
console.log(`RITMO — "${doc.comp.nombre}" · ${CUADROS} cuadros @ ${fps}fps · ${dibujables.length} capas dibujables`)
console.log('')
for (const r of R) {
  console.log(`  ${r.ok ? 'ok  ' : 'FALL'} ${r.id}  ${r.que.padEnd(32)} ${String(r.valor).padStart(22)}`)
  console.log(`         ${r.detalle}`)
}
if (empates.length) { console.log(''); for (const e of empates.slice(0, 6)) console.log(`    ${e}`) }

// EL PERFIL, que es lo que se mira cuando algo falla. Un numero dice que esta mal; la forma dice donde.
console.log('\n  perfil de energia (cada columna = 1/30 de la pieza, altura = pico de ese tramo)')
const COLS = 60, barras = ' ▁▂▃▄▅▆▇█'
let linea = ''
for (let i = 0; i < COLS; i++) {
  const a = Math.floor(i * CUADROS / COLS), b = Math.max(a + 1, Math.floor((i + 1) * CUADROS / COLS))
  const v = Math.max(...Etot.slice(a, b))
  linea += barras[Math.min(8, Math.round(v / (pico || 1) * 8))]
}
console.log(`  |${linea}|`)
const marcas = new Array(COLS).fill(' ')
for (const g of gestos) marcas[Math.min(COLS - 1, Math.floor(g.cuadro / CUADROS * COLS))] = macros.includes(g) ? 'M' : '·'
console.log(`  |${marcas.join('')}|  (· gesto, M macro)`)
if (args.includes('--gestos')) {
  console.log('\n  gestos:')
  for (const g of gestos) {
    console.log(`    ${String(g.cuadro).padStart(4)}  ${g.cuadro % 8 === 0 ? 'x8' : '  '} ${g.cuadro % 15 === 0 ? 'x15' : '   '} ` +
      `${macros.includes(g) ? 'MACRO' : '     '}  capas ${g.capas.join(',')}`)
  }
  console.log(`\n  arranques crudos:`)
  for (const a of arranques) console.log(`    ${String(a.cuadro).padStart(4)}  ${a.nombre}  pico=${a.pico.toExponential(2)}`)
  console.log(`\n  capas SIN ningun arranque:`)
  for (let i = 0; i < E.length; i++) {
    if (!arranques.some(a => a.capa === dibujables[i].indice)) {
      console.log(`    ${dibujables[i].nombre}  picoE=${Math.max(...E[i]).toExponential(2)}`)
    }
  }
}

// ---------------------------------------------------------------- la comprobacion contra el motor
// Esta cuenta reimplementa la cadena del reproductor. Dos implementaciones divergen en silencio, asi
// que la coincidencia se MIDE cuando hay con que: `capturar-comp.py --esquinas` deja las esquinas que
// proyecto el motor de verdad, y aca se comparan contra las de esta cuenta.
if (contra) {
  if (!existsSync(contra)) { console.error(`\nfalta ${contra}`); process.exit(2) }
  const suyas = JSON.parse(readFileSync(contra, 'utf8'))
  let peor = 0, donde = ''
  for (const [fs, porCapa] of Object.entries(suyas)) {
    const f = +fs
    K.enCuadro(f)
    for (const [is, pts] of Object.entries(porCapa)) {
      const c = doc.capas.find(x => x.indice === +is)
      const mias = c && K.esquinas(c, f / fps)
      if (!mias) continue
      for (let k = 0; k < 4; k++) {
        const d = Math.hypot(mias[k][0] - pts[k][0], mias[k][1] - pts[k][1])
        if (d > peor) { peor = d; donde = `cuadro ${f}, capa ${is}, esquina ${k}` }
      }
    }
  }
  console.log(`\n  CONTRA EL MOTOR: peor desvio de esquina ${peor.toExponential(2)} px  (${donde})`)
  if (peor > 0.01) {
    console.log('  LA CUENTA DE LA METRICA NO ES LA DEL REPRODUCTOR. El ritmo medido no es el de la pieza.')
    process.exit(1)
  }
}

const fallan = R.filter(r => !r.ok)
console.log('')
console.log('='.repeat(72))
if (!fallan.length) console.log(`RITMO OK — ${R.length}/${R.length} compuertas`)
else console.log(`RITMO NO PASA — fallan ${fallan.map(r => r.id).join(', ')} de ${R.length}`)
process.exit(fallan.length ? 1 : 0)
