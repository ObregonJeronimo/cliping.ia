// PLANTILLA "imprenta" — tipos moviles gigantes que caen en su lugar y componen una linea.
//
// EL GESTO
// La camara se desliza a lo largo de una caja tipografica y, delante de ella, cada tiempo SE COMPONE:
// bloques de plomo con una cara en relieve caen de arriba, uno detras de otro, hasta armar un renglon
// del ancho exacto de lo que ese renglon tiene que decir. Cuando el ultimo tipo aterriza, la linea se
// APRIETA —se cierra un 4% sobre si misma, que es lo que hace una cuna— y recien entonces el texto sale
// del metal. Leido el dato, la linea SE LEVANTA entera y deja el hueco para la siguiente.
//
// EN QUE SE DIFERENCIA DE `archivo`, QUE TAMBIEN ES UN MUEBLE QUE ACTUA
// En `archivo` el mueble GUARDA: el cajon sale con el dato montado en su cara, se lee, y el cajon lo
// vuelve a meter. El gesto de la pieza entera es "esto queda archivado", y por eso cada tiempo es UN
// objeto que ya existia y que se mueve. Aca el mueble IMPRIME, o sea exactamente el movimiento
// contrario: nada sale entero de ningun lado, sino que PIEZAS SUELTAS SE ENSAMBLAN hasta formar algo
// que antes no existia. Un cajon es uno; una linea de imprenta son ocho tipos que se eligieron de la
// caja y se pusieron en fila.
//
// La diferencia no es una metafora escrita en el encabezado, se ve en el codigo: alli un bloque se
// monta sobre una cara ya construida y aca la cara SE CONSTRUYE A LA MEDIDA DEL BLOQUE y se arma a la
// vista, tipo por tipo, con su `entra()` cada uno. Y contra `reticula` —el otro desliz frente a un
// muro— la distancia es todavia mayor: alli el muro es una superficie que pasa y no hace nada.
//
// PARA QUE MARCA SIRVE
// Editorial, imprenta, tipografia, estudio grafico, packaging, papeleria, un diario, una casa de
// tipos, una agencia que se presenta como taller. La metafora es literal y esa es la gracia: lo que la
// marca hace es COMPONER — juntar piezas ajenas hasta que digan algo.
//
// LOS SEIS TIEMPOS (beats sobre 38)
//   0   ESPACIO   la caja pasando, los tipos que se levantan solos de sus cajetines, plomo suelto
//                 cruzando delante del lente. Sin texto: primero hay que entender donde se esta.
//   5   MARCA     la primera linea se compone y el nombre SALE DEL METAL, desde el fondo hacia el frente.
//   12  PROMESA   una linea de tres renglones; el claim la cruza de izquierda a derecha.
//   18  PRUEBA    una forma baja de tipos, y la pagina del cliente se LEVANTA de ella como un pliego
//                 que se saca de la prensa. El unico tiempo con destello: es la estampa.
//   26  RAZONES   lineas cortas encabalgadas — las cifras arriba, las frases abajo.
//   33  PEDIDO    la ultima linea se compone entrando por la derecha y se queda clavada al cuadro.
//
// SIN MATERIAL: un tiempo que la pagina no puede llenar no compone su linea, y la caja sigue pasando.
// Un hueco en una galera no se lee como un error; se lee como una galera a medio componer.

import { THREE, metal, luz, barra, iluminar, domo, polvo, prismaDe } from '../nucleo.js'
import { vueloDesliz, entra, sale, acompanar, respirar, juntar, anchoADistancia } from '../movimiento.js'
import { bloqueMarca, bloquePromesa, bloquePrueba, bloquesCifra, bloquesFrase, bloquePedido } from '../bloques.js'
import { colorDePeso, grisDePeso } from '../recetas.js'
import { LOOK, nivel, E, b } from '../../demo/kit.js'

export const meta = {
  id: 'imprenta',
  nombre: 'Imprenta',
  familia: 'arquitectura',
  necesita: ['nada'],
  beats: 38,
  tiempos: { espacio: 0, marca: 5, promesa: 12, prueba: 18, razones: 26, pedido: 33 },
  pitch: 'Tipos móviles gigantes que caen en su lugar y componen cada línea a la vista. Para marcas editoriales, de imprenta y de estudio gráfico.',
}

export function build(ctx) {
  const { escena, pagina, camara, tl, mundoW, mundoH, distBase } = ctx
  const uso = {}
  const respiraciones = []

  // ---------------------------------------------------------------- LO QUE LA PAGINA DECIDE
  //
  // `ctx.recetas` sale de `backend/retrato.py`, que mide la tira, el DOM y los recortes de ESTA pagina.
  // Sin retrato devuelve los valores neutros y la plantilla compone como se componia antes de que el
  // analisis existiera: no hay una rama distinta ni un caso especial. La explicacion larga de cada
  // receta esta en `render3d/boveda/recetas.js`, y la de por que existe el mecanismo, en `atrio.js`.
  //
  // Lo que cada una cambia EN ESTE VIDEO, que es lo unico que este archivo tiene que explicar:
  //
  //   R.velocidad   cuanta caja pasa por delante en los mismos 38 beats — y, por lo tanto, cuanto tiene
  //                 que viajar cada linea compuesta para que se alcance a leer (ver `retrasoPara`).
  //   R.capas       2 = la caja y el plomo suelto; 3 suma las galeras del fondo; 4 suma la trama lejana.
  //   R.dureza      LA FORMA DEL TIPO. `prismaDe` girado de canto pone su SECCION de frente, asi que la
  //                 dureza deja de decidir "que tan redonda es la columna" y pasa a decidir la cara que
  //                 imprime: cuadrada en una marca de aristas vivas, un tarugo redondo en una que
  //                 redondea todo. Es lo primero que se ve y no hay que explicarlo.
  //   R.margen      va a cada bloque de `bloques.js`, que es el unico sitio donde se aplica.
  //   R.cifras      cuantas lineas cortas se componen arriba en RAZONES.
  //   R.frases      cuantas abajo.
  //   R.acentoMasa  si el acento de la marca ocupa superficie de verdad, LA CAJA ENTERA se funde en ese
  //                 color; si es un detalle, la caja va en el gris de mas peso y el acento queda en las
  //                 muescas de los tipos y en los dos corondeles. Es la diferencia entre un taller
  //                 pintado de la marca y un taller de plomo con la marca senalizada.
  //   R.vacio       EL ESPACIO ENTRE TIPOS y los cajetines vacios de la caja. En una imprenta el aire
  //                 es una pieza mas —el espacio, el cuadratin— asi que una pagina que compone con
  //                 mucho blanco compone tambien con mas plomo en blanco.
  const R = ctx.recetas || { velocidad: 1, capas: 3, dureza: 0.75, margen: 0.88, cifras: 3, frases: 2,
    acentoMasa: false, vacio: 0.5, movimientos: 4, paleta: [], medido: false }
  uso.retrato = !!R.medido

  // Semilla propia y determinista. `ctx.rnd` la comparten los bloques, y compartirla haria que el
  // dibujo de la caja cambiara porque la pagina trajo una frase mas. Una caja que cambia con el texto
  // es una caja que no se puede depurar.
  let sem = 14401503
  const az = () => { sem = (sem * 1664525 + 1013904223) >>> 0; return sem / 4294967296 }

  iluminar(escena, { key: 1.2, relleno: 0.44 })
  const uDomo = domo(escena, { fuerza: 0.18 })
  const motas = polvo(escena, 820, 24)

  // ---------------------------------------------------------------- el vuelo, y la cuenta que lo fija
  //
  // LA VELOCIDAD DEL DESLIZ NO ES UN GUSTO: SALE DE CUANTO TIENE QUE DURAR UNA LINEA LEGIBLE.
  //
  // La camara recorre `LARGO · R.velocidad` en `beats`, o sea `V = LARGO · R.velocidad / beats`
  // unidades por beat. Un objeto plantado en un punto fijo esta ENTERO dentro del cuadro solo mientras
  // su centro no se aleje mas de `(CARA - w)/2` del eje — no `mundoW/V` beats, que es la cuenta para un
  // punto y la que deja un titular cortado a un lado con el numero "bien" puesto.
  //
  // Con `LARGO = mundoW · 4.0` eso da `38 / 4.0 = 9.5` beats de ventana para un punto a velocidad
  // neutra y 6.55 a la maxima; para una linea de 3.9 de ancho en un cuadro de 4.73, la ventana honesta
  // baja a 1.4 beats. Ninguno de los seis tiempos dura tan poco, y de ahi sale `retrasoPara`: las
  // lineas VIAJAN mientras se leen. La camara no frena —la regla 1 no lo admite— y no hace falta que
  // frene, porque la caja sigue pasando detras a toda velocidad.
  const LARGO = mundoW * 4.0
  const vuelo = vueloDesliz(camara, tl, { distBase, beats: meta.beats, largo: LARGO * R.velocidad, dist: 1.0 })
  const xEn = vuelo.xEn
  const Z_CAM = distBase
  const V = LARGO * R.velocidad / meta.beats          // unidades de mundo por beat

  // Lo que el vaiven del propio vuelo se come del ancho, con la cuenta hecha: el balanceo de z es +-0.7
  // y a 0.7 mas cerca el cuadro se angosta `mundoW · 0.7 / distBase` = 0.23, o sea 0.11 por lado; el
  // balanceo de 0.008 rad en z se lleva otros `mundoH/2 · 0.008` = 0.04. Son 0.15 por lado y se reserva
  // el doble, que es lo que cuesta no tener que volver a mirarlo.
  const DERIVA = 0.30

  // ---------------------------------------------------------------- las medidas del taller
  const FRENTE = 0.9            // el plano donde se componen las lineas: la cara del tipo vive aca
  const CUERPO = 0.60           // el cuadratin — la unidad de ancho de un tipo
  const PROF = 1.15             // el fondo del tipo (lo que no se ve, y por eso se ve que es un objeto)
  const MARGEN = 0.24           // aire entre el bloque de texto y el canto de su linea
  const PASO_RENGLON = 1.45     // de cuanto en cuanto se corre una linea si su renglon esta ocupado
  const Z_CAJA = -1.9           // la cara de la caja tipografica, casi tres unidades detras del frente
  const PROF_CAJA = 0.75
  const CUERPO_CAJA = 0.50
  const CAJETIN = 0.95, PASO_CAJETIN = 1.42, JUNTA_C = 0.07
  const FILAS_CAJA = 3          // de -3 a 3: la caja cubre +-4.97, que es todo el alto util a su z

  // EL ANCHO DE UNA LINEA SE MIDE CONTRA EL CUADRO QUE HAY A SU DISTANCIA, que no es `mundoW`: la cara
  // esta a `Z_CAM - FRENTE` = 16.5 del lente, donde el cuadro mide `mundoW · 16.5 / 17.4` = 5.33 y no
  // 5.62. Medir contra `mundoW` daria lineas un 6% mas anchas que el cuadro que las tiene que contener
  // — o sea texto cortado a los dos lados justo en el beat en que hay que leerlo.
  const CARA = anchoADistancia(mundoW, distBase, Z_CAM - FRENTE, DERIVA)
  const ANCHO_TXT = CARA - MARGEN * 2
  // Y el alto por la misma cuenta. `TOPE_Y` deja fuera el vaiven vertical de +-0.42 que el desliz le
  // mete a la camara: una linea que llega justo al borde en reposo se sale medio beat de cada dos.
  const ALTO_CARA = mundoH * ((Z_CAM - FRENTE) / distBase)
  const TOPE_Y = ALTO_CARA * 0.45
  const CIELO = ALTO_CARA / 2 + 0.5                   // desde donde caen los tipos: fuera de cuadro

  // ---------------------------------------------------------------- los materiales
  //
  // EL COLOR DE LA CAJA SALE DE LOS PIXELES, no de `LOOK.acento` a secas. `colorDePeso` devuelve la
  // primera masa CROMATICA de la paleta medida sobre la tira saltando los grises, que no es lo mismo
  // que el acento del ADN: el acento es el color de los BOTONES y lo que hace falta aca es el color que
  // de verdad ocupa superficie. Y solo se usa como masa si `acentoMasa` dice que esa marca tiene con
  // que: por debajo del 3% de cobertura, fundir la caja entera en ese tono lo convierte en otra cosa.
  const COLOR_MASA = colorDePeso(R, LOOK.acento, 0.20)
  const GRIS = grisDePeso(R, nivel(0.30))
  // Plomo: mate y oscuro, para que la cara del tipo se despegue. `metal()` ya usa `metalness 0.30` y NO
  // hay que subirlo — un metal PBR sin mapa de entorno no tiene componente difusa y renderiza NEGRO por
  // claro que sea su color base. Esta escrito en `nucleo.js:metal` y costo media Boveda.
  const matCuerpo = metal(GRIS, 0.46)
  const matCara = metal(nivel(0.52), 0.30)
  const matCaja = metal(R.acentoMasa ? COLOR_MASA : nivel(0.24), 0.52)
  const matCaraCaja = metal(R.acentoMasa ? COLOR_MASA : nivel(0.40), 0.38)

  // ---------------------------------------------------------------- un tipo movil
  //
  // UNA SOLA GEOMETRIA POR TAMANO DE CUERPO, Y EL ANCHO DE CADA TIPO SALE DE LA ESCALA DE SU GRUPO.
  // Entre la caja y las seis lineas se dibujan del orden de doscientos cincuenta tipos; un `prismaDe`
  // por cada uno serian doscientas cincuenta `CylinderGeometry` distintas para dos formas.
  //
  // Escalar el GRUPO y no la malla no es un detalle de estilo: la escala de una malla se aplica en su
  // espacio local, ANTES de su giro, y el prisma de cuatro lados viene girado 45 grados — estirar su X
  // local le clavaria el cuadrado en diagonal. La del grupo se aplica despues del giro del hijo, o sea
  // sobre los ejes del mundo, que es lo que hace falta para pasar de un cuadrado a un rectangulo.
  const cacheGeo = new Map()
  const geoDe = (lado, prof) => {
    const k = lado + '|' + prof
    let g = cacheGeo.get(k)
    if (!g) {
      // `prismaDe` decide cuantos lados tiene la seccion segun la dureza Y, si son cuatro, la gira 45
      // grados para que no quede apoyada en un vertice. Las dos cosas hacen falta, asi que se construye
      // uno de referencia y se le copian geometria y giro en vez de reimplementar la cuenta aca.
      const ref = prismaDe(lado, prof, R.dureza, matCuerpo)
      g = { geo: ref.geometry, giroY: ref.rotation.y, cara: new THREE.BoxGeometry(lado * 0.70, lado * 0.70, 0.055) }
      cacheGeo.set(k, g)
    }
    return g
  }

  // `w` y `h` son el ancho y el alto QUE SE VEN; `lado` es solo el tamano de la geometria compartida.
  const tipo = (lado, prof, w, h, matC, matF, conMuesca) => {
    const g = new THREE.Group()
    const d = geoDe(lado, prof)
    const cuerpo = new THREE.Mesh(d.geo, matC)
    // EL EJE DEL PRISMA MIRA A LA CAMARA, y ahi esta la idea entera de la plantilla. `prismaDe` lo
    // construye vertical, que es lo que necesita una columnata; un tipo movil es lo contrario: lo que
    // se ve de el es su SECCION, o sea la cara que imprime. Girarlo 90 grados en X manda el eje a Z y
    // pone la seccion de frente — y con eso `R.dureza` pasa a decidir la forma de la cara.
    //
    // El orden de Euler por defecto es XYZ, o sea `Rx · Ry`: el giro de 45 grados de `prismaDe` ocurre
    // primero, alrededor del eje del prisma, y despues el prisma entero se acuesta. Al reves quedaria
    // un rombo acostado, que es el defecto que `prismaDe` documenta para el caso vertical.
    cuerpo.rotation.set(Math.PI / 2, d.giroY, 0)
    // El origen del grupo queda EN LA CARA y no en el centro del cuerpo: asi montar algo encima es
    // ponerle una z chica, sin que nadie tenga que saber cuanto fondo tiene el tipo.
    cuerpo.position.z = -prof / 2
    g.add(cuerpo)
    // LA CARA EN RELIEVE. Es una caja de 5 centesimas de fondo, no un plano: el canto es lo que le da a
    // la luz donde pegar, y sin ese canto un tipo de frente se lee como un rectangulo pintado.
    const cara = new THREE.Mesh(d.cara, matF)
    cara.position.z = 0.030
    g.add(cara)
    // LA MUESCA. En un tipo de verdad es la ranura que dice de que lado va; aca es ademas el sitio
    // donde vive el acento cuando la marca no da para pintar la caja entera. Una malla, y con eso la
    // pieza tiene el color de la marca repartido por todo el plano en vez de en un cartel.
    if (conMuesca) {
      const mu = barra(lado * 0.40, lado * 0.055, LOOK.acento, 1.35)
      mu.position.set(0, -lado * 0.29, 0.062)
      g.add(mu)
    }
    g.scale.set(w / lado, h / lado, 1)
    return g
  }

  // ---------------------------------------------------------------- una linea que se compone
  //
  // Los anchos NO son todos iguales, y esa es la mitad de que se lea como tipografia y no como una
  // reja: en una caja de verdad una `i` y una `M` no ocupan lo mismo. El reparto sale del sorteo propio,
  // asi que es el mismo para la misma plantilla y no cambia porque la pagina haya traido otra frase.
  const SETS = [0.62, 0.82, 1.0, 1.0, 1.28]
  // EL ESPACIO ENTRE TIPOS ES LA RECETA DEL AIRE. Un sitio apretado compone sin blancos y uno muy
  // aireado deja ver el corondel entre pieza y pieza.
  const HUECO = 0.018 + 0.070 * (R.vacio != null ? R.vacio : 0.5)

  const linea = (w, h, x, y) => {
    const g = new THREE.Group()
    g.position.set(x, y, FRENTE)
    escena.add(g)
    const piezas = []
    let cx = -w / 2
    while (cx < w / 2 - 0.02) {
      const an = Math.min(SETS[Math.floor(az() * SETS.length)] * CUERPO, w / 2 - cx)
      if (an < HUECO + 0.06) break                    // el resto es mas angosto que un espacio: sobra
      const p = tipo(CUERPO, PROF, an - HUECO, h, matCuerpo, matCara, az() < 0.5)
      p.position.set(cx + an / 2, 0, 0)
      g.add(p)
      piezas.push(p)
      cx += an
    }
    return { g, piezas, w, h, y }
  }

  // COMPONER: los tipos CAEN, de a uno y en orden, y aterrizan con `acelera` — que es la gravedad y no
  // una eleccion de gusto. `llega` (back.out) se pasa de largo y despues vuelve, o sea que sobre una
  // caida de cinco unidades el tipo se hunde medio metro en el renglon de abajo antes de acomodarse.
  //
  // La caida se calcula para que el punto de partida quede FUERA del cuadro a la altura de esa linea, y
  // la duracion crece con la distancia para que todos lleguen a la misma velocidad. Estacionar un tipo
  // dentro del encuadre y encenderlo ahi seria exactamente el cartel que prohibe la regla 2.
  const componer = (L, t0, paso) => {
    const p = paso != null ? paso : 0.15
    const caida = Math.max(3.6, CIELO + L.h / 2 + 0.6 - L.y)
    const dur = 0.42 + caida * 0.055
    L.piezas.forEach((pz, i) => {
      entra(pz, tl, t0 + i * p, { desde: 'arriba', dist: caida, dur, ease: E.acelera(2) })
    })
    const fin = t0 + (L.piezas.length - 1) * p + dur
    // EL APRIETE. La cuna que cierra la linea contra el componedor: cuatro centesimas de escala en x,
    // medio beat, justo cuando aterriza el ultimo tipo. Es la unica senal de que la linea ya es UNA
    // COSA y no ocho — y sin ella el texto sale del metal sin que nada haya terminado.
    tl.fromTo(L.g.scale, { x: 1.045 }, { x: 1, duration: b(0.55), ease: E.frena(3), immediateRender: false }, b(fin - 0.1))
    return fin
  }

  // LEVANTAR: la linea se va entera hacia arriba, se lleva su texto y deja de existir.
  //
  // ES `sale()` MENOS EL EJE X, Y ESA DIFERENCIA ES OBLIGATORIA. `sale()` escribe los tres ejes de
  // `position`, y para "arriba" apunta x a `g.position.x + 0` — o sea al valor que x tenia CUANDO SE
  // CONSTRUYO la plantilla. Las lineas de aca viajan por la galera con un tween sobre `position.x`
  // (ver `retrasoPara`), asi que un `sale()` normal las arrastraria de vuelta al punto donde se
  // compusieron mientras suben. No da error, no da aviso: la linea sube en diagonal hacia atras.
  //
  // Se apaga cuando ya salio del cuadro, asi que el apagado no lo ve nadie. Y sube con `frena`, no con
  // `acelera`: una mano que levanta una galera arranca fuerte. Ademas eso despeja el renglon rapido,
  // que es lo que le permite a la linea siguiente usar esa altura enseguida.
  const levantar = (L, t0, dur) => {
    const d = CIELO - L.y + L.h
    const du = dur != null ? dur : 1.15
    tl.to(L.g.position, { y: L.g.position.y + d, duration: b(du), ease: E.frena(2.5) }, b(t0))
    tl.to(L.g.rotation, { z: 0.05, duration: b(du), ease: E.frena(2) }, b(t0))
    tl.set(L.g, { visible: false }, b(t0 + du * 1.15))
  }

  // LA ESTAMPA. Un destello cortisimo sobre el pase de pelicula: es el papel encontrandose con el tipo.
  // Se usa TRES VECES y no en las seis lineas — un golpe por linea seria un estrobo, y el destello vale
  // justamente porque marca los tres momentos donde algo se imprime de verdad: el nombre, el pliego y
  // el pedido. `uFlash` suma sobre el color final, asi que 0.05 ya es un golpe visible.
  const estampar = (t0, fuerza) => {
    if (!ctx.pelicula || !ctx.pelicula.uFlash) return
    const f = fuerza != null ? fuerza : 0.05
    tl.to(ctx.pelicula.uFlash, { value: f, duration: b(0.16), ease: E.acelera(2) }, b(t0))
    tl.to(ctx.pelicula.uFlash, { value: 0, duration: b(1.1), ease: E.frena(3) }, b(t0 + 0.18))
  }

  // ---------------------------------------------------------------- cuanto tiene que viajar una linea
  //
  // LA CUENTA QUE ORDENA TODA LA PIEZA. La camara se corre `V` unidades por beat. Una linea de ancho `w`
  // plantada en un punto fijo se mantiene ENTERA dentro del cuadro mientras su centro no se aleje mas de
  // `(CARA - w)/2` del eje; si su lectura dura `L` beats y esta centrada, se aleja `V·L/2` para cada
  // lado. Viajar a `r` de la velocidad de la camara multiplica la holgura por `1/(1-r)`, asi que:
  //
  //     r = 1 - holgura / (V · L / 2)
  //
  // Con la marca —linea de 3.9, lectura de 4.3 beats— eso da 0.55 a velocidad neutra y 0.70 a la
  // maxima: la linea acompana, pero la caja sigue pasando detras a la mitad de la velocidad, que es de
  // donde sale la sensacion de avance. Con una lectura corta la cuenta devuelve 0 y la linea no viaja.
  //
  // El tope de 0.9 no es cosmetico: a 1.0 la linea queda clavada al ojo y deja de haber desliz. El unico
  // que se lo permite es el PEDIDO, y por la razon que `movimiento.js:acompanar` deja escrita.
  const retrasoPara = (w, L) => {
    const holgura = Math.max(0.25, (CARA - w) / 2)
    const solo = Math.max(0.001, V * L / 2)
    return Math.max(0, Math.min(0.9, 1 - holgura / solo))
  }

  // ---------------------------------------------------------------- el renglon libre
  //
  // BUSCAR UNA ALTURA LIBRE NO ES UNA PRECAUCION TEORICA, y la leccion es de `archivo`: el ancho de una
  // linea sale del ancho de SU texto y el texto sale de la pagina del cliente, asi que dos tiempos que
  // con una pagina quedan a media unidad se pisan con la siguiente. Y aca hay un segundo eje que alli
  // no existia: con `R.velocidad` en 0.7 la camara recorre la mitad, o sea que dos lineas separadas por
  // seis beats quedan separadas por la mitad de la distancia y empiezan a solaparse.
  //
  // Se compara en las TRES dimensiones que importan —x, y y TIEMPO— porque dos lineas que ocupan el
  // mismo rectangulo en distintos beats no se pisan: la primera ya se levanto. `barrido` estira el
  // rectangulo hacia la derecha con lo que la linea va a viajar, que es lo que la reserva tiene que
  // cubrir de verdad y no la posicion en que se la construyo.
  const AIRE_R = 0.10
  const ocupadas = []
  const rectDe = (x, y, w, h, ta, tb, barrido) => ({
    x0: x - w / 2 - AIRE_R, x1: x + w / 2 + AIRE_R + Math.max(0, barrido || 0),
    y0: y - h / 2 - AIRE_R, y1: y + h / 2 + AIRE_R, ta, tb,
  })
  const chocan = (r) => ocupadas.some(o =>
    r.ta < o.tb && r.tb > o.ta && r.x0 < o.x1 && r.x1 > o.x0 && r.y0 < o.y1 && r.y1 > o.y0)
  const renglon = (x, y, w, h, ta, tb, barrido) => {
    for (const d of [0, 1, -1, 2, -2, 3, -3, 4, -4]) {
      const yy = y + d * PASO_RENGLON
      if (Math.abs(yy) + h / 2 > TOPE_Y) continue
      const r = rectDe(x, yy, w, h, ta, tb, barrido)
      if (!chocan(r)) { ocupadas.push(r); return yy }
    }
    ocupadas.push(rectDe(x, y, w, h, ta, tb, barrido))
    return y
  }

  // ---------------------------------------------------------------- montar un bloque en su linea
  //
  // LO QUE UN BLOQUE DIBUJA NO ES SIEMPRE LO QUE DECLARA, y es el agujero por el que se cuela el unico
  // bloque que no entra en su propia linea. `bloquePromesa` monta una CAMA detras del claim y `cama()`
  // la hace `alto·0.32` mas ancha y `alto·0.34` mas alta que el texto: con tres renglones son tres
  // decimas por lado que no figuran en `bloque.ancho` ni en `bloque.alto`. Cortado el plomo a la medida
  // declarada, la placa cuelga fuera de la linea. `cama()` y `letras()` anotan su tamano en `userData`,
  // asi que se mide lo que hay COLGADO DEL GRUPO en vez de creerle al informe. La leccion es de
  // `archivo`; la cuenta es la misma.
  const dibujado = (bloque) => {
    let w = bloque.ancho, h = bloque.alto
    for (const o of bloque.g.children) {
      const u = o.userData || {}
      if (u.ancho > w) w = u.ancho
      if (u.alto > h) h = u.alto
    }
    return { w, h }
  }

  // `sesgo` sube el bloque dentro de la linea y hace falta en tres de los seis, porque el centro de
  // DIBUJO de esos bloques no es el centro de su caja: la marca cuelga su filete y su rotulo, la cifra
  // su etiqueta y el pedido su dominio. Los tres numeros salen de donde cada bloque pone sus hijos —la
  // marca dibuja de +0.5·alto a -1.22·alto, o sea con el centro en -0.36·alto sobre un total de 1.5— y
  // son los mismos que `archivo` ya calculo para el mismo motivo.
  const montar = (bloque, ta, tb, yPref, op) => {
    op = op || {}
    const dib = dibujado(bloque)
    const w = Math.max(0.7, Math.min(CARA, dib.w + MARGEN * 2))
    const h = Math.max(bloque.alto * (op.altoK != null ? op.altoK : 1), dib.h) + MARGEN * 1.4
    const L = tb - ta
    const r = op.retraso != null ? op.retraso : retrasoPara(w, L)
    // Se planta media ventana ADELANTE del comienzo de la lectura para que el viaje la deje simetrica:
    // arranca corrida `V·(1-r)·L/2` a la derecha y termina lo mismo a la izquierda. Plantarla en el
    // medio de la lectura y hacerla viajar despues la deja toda la lectura de un solo lado.
    const x = xEn(ta + (1 - r) * L / 2)
    const barrido = r > 0 ? (xEn(tb) - xEn(ta)) * r : 0
    const y = renglon(x, yPref, w, h, op.ta != null ? op.ta : ta - 1.8, (op.tb != null ? op.tb : tb) + 1.0, barrido)
    const Lin = linea(w, h, x, y)
    bloque.g.position.set(0, (op.sesgo || 0) * bloque.alto, 0.14)
    Lin.g.add(bloque.g)
    return { L: Lin, retraso: r, ta, tb }
  }
  // Y el viaje se engancha aparte, DESPUES de que el bloque tenga su entrada montada: `acompanar`
  // escribe un tween sobre `position.x` de la linea y no toca a sus hijos, asi que el bloque puede
  // entrar volando desde un costado mientras la linea entera se corre.
  const viajar = (m) => { if (m.retraso > 0) acompanar(m.L.g, tl, m.ta, m.tb, xEn, m.retraso) }

  // ---------------------------------------------------------------- los bloques, medidos contra la cara
  //
  // Cada `anchoMax` es una fraccion de `ANCHO_TXT` y no un numero suelto: lo que decide cuanto puede
  // ocupar un texto es el cuadro que hay a la distancia de su linea, y eso ya esta medido arriba una
  // sola vez. `margen: R.margen` es lo unico que este archivo tiene que hacer con esa receta — el
  // margen se aplica dentro de `bloques.js`, en un solo sitio para las dieciocho plantillas.
  const marca = bloqueMarca({ alto: 1.05, anchoMax: ANCHO_TXT * 0.74, cama: true, camaOpacidad: 0.80, margen: R.margen })
  const promesa = bloquePromesa({ alto: 0.50, anchoMax: ANCHO_TXT * 0.78, maxLineas: 3, margen: R.margen })
  const prueba = bloquePrueba(ctx, { ancho: mundoW * 0.46, ar: 1.5 })
  const cifras = bloquesCifra(R.cifras, { alto: 0.80, anchoMax: ANCHO_TXT * 0.44, margen: R.margen })
  const frases = bloquesFrase(R.frases, { alto: 0.28, anchoMax: ANCHO_TXT * 0.70, maxLineas: 2, margen: R.margen })
  const pedido = bloquePedido({ alto: 0.32, anchoMax: ANCHO_TXT * 0.60, margen: R.margen })

  // ---------------------------------------------------------------- 2 · MARCA
  //
  // El nombre SALE DEL METAL: entra desde el fondo, o sea desde detras del plano de la linea, creciendo
  // hacia el frente. Es el unico gesto de aparicion que esta plantilla se reserva para dos tiempos —este
  // y el pedido— porque es literalmente lo que hace un tipo: el relieve empuja hacia adelante y lo que
  // queda es la letra. Los otros cuatro entran de costado o desde abajo para que este siga significando
  // algo.
  //
  // Y la linea se compone ANTES: primero se ve al taller hacer algo y recien despues aparece que era eso
  // lo que traia. Al reves, el texto llega a un sitio que todavia no existe.
  if (marca) {
    const m = montar(marca, 5.6, 9.9, 1.9, { altoK: 1.15, sesgo: 0.24 })
    const fin = componer(m.L, 3.6)
    viajar(m)
    estampar(fin - 0.1, 0.05)
    entra(marca.g, tl, 5.2, { desde: 'fondo', dist: 2.2, dur: 1.5 })
    marca.escribir(tl, 5.6, 1.3)
    marca.borrar(tl, 9.7)
    sale(marca.g, tl, 9.9, { hacia: 'arriba', dist: 5.5, dur: 1.0 })
    levantar(m.L, 10.7)
    uso.marca = true
  }

  // ---------------------------------------------------------------- 3 · PROMESA
  // Cruza su propia linea de lado a lado. Es el unico bloque que entra y sale por lados OPUESTOS: el
  // claim es lo que hay que leer entero, y un texto que atraviesa se lee mas tiempo que uno que vuelve.
  if (promesa) {
    const m = montar(promesa, 12.0, 16.4, -1.2, {})
    componer(m.L, 10.4)
    viajar(m)
    entra(promesa.g, tl, 11.2, { desde: 'izq', dist: 6.5, dur: 1.7 })
    promesa.escribir(tl, 12.0, 1.0)
    promesa.borrar(tl, 16.2)
    sale(promesa.g, tl, 16.4, { hacia: 'der', dist: 7, dur: 1.1 })
    levantar(m.L, 17.3)
    uso.claim = true
    uso.claimRecortado = promesa.recortado
  }

  // ---------------------------------------------------------------- 4 · PRUEBA
  //
  // LA FORMA Y EL PLIEGO. La pagina no se monta sobre una linea como los otros bloques: se compone una
  // forma baja —una linea de tipos sin texto, que es la mancha de la pagina en plomo— y el pliego se
  // LEVANTA de ella. Ese es el gesto correcto y ademas el unico posible: la pagina mide casi cuatro
  // unidades de alto y ninguna linea de esta pieza pasa de dos y media, asi que no hay cara que la
  // sostenga.
  //
  // Y va a `ctx.pagina`, que es OTRA ESCENA y se dibuja en un pase posterior, asi que no se puede colgar
  // del grupo de la forma como los demas bloques. Se las mantiene pegadas con DOS `acompanar` identicos
  // —mismo t0, mismo t1, mismo retraso, misma ease lineal— que es lo unico que garantiza que no se
  // separen. Por lo mismo la pagina se dibuja SIEMPRE por encima de la forma: ese pase no comparte la
  // profundidad. Se compone contando con eso, no peleandolo — un pliego tapa al tipo del que salio.
  if (prueba) {
    const wF = Math.max(1.2, Math.min(CARA, prueba.ancho * 0.78 + 0.5))
    const RF = retrasoPara(wF, 6.0)
    const xF = xEn(19.0 + (1 - RF) * 3.0)
    const yF = renglon(xF, -3.1, wF, 1.35, 16.6, 27.2, (xEn(24.8) - xEn(19.0)) * RF)
    const forma = linea(wF, 1.35, xF, yF)
    componer(forma, 17.0, 0.12)

    // LA PAGINA SE APOYA SOBRE LA FORMA, y su altura se acota contra el cuadro que hay a SU distancia.
    // Si el buscador de renglones tuvo que subir la forma, el pliego no puede seguirla hacia arriba sin
    // salirse por el techo: en ese caso se queda mas bajo y lo tapa, que es lo que hace un pliego.
    const ALTO_PAG = mundoH * ((Z_CAM - (FRENTE + 0.1)) / distBase)
    const TECHO_PAG = ALTO_PAG / 2 - prueba.alto / 2 - 0.35
    const yPag = Math.min(TECHO_PAG, yF + prueba.alto / 2 + 0.45)
    prueba.g.position.set(xF, yPag, FRENTE + 0.1)
    prueba.g.rotation.y = 0.28
    pagina.add(prueba.g)

    // ENTRA Y SALE POR FUERA DEL CUADRO, Y EL CUADRO A SU PROFUNDIDAD NO MIDE `mundoH`. El salto se
    // calcula desde donde esta parada hasta el piso del cuadro, mas su propio medio alto y un margen;
    // el piso de `alto·0.9 + 1.4` queda por si la forma termina muy abajo y la cuenta diera corto. Con
    // una distancia fija la pagina se encenderia y se apagaria a la vista, que es el cartel que prohibe
    // la regla 2, y encima en la unica capa que se dibuja siempre por encima de todo.
    const SALTO = Math.max(prueba.alto * 0.9 + 1.4, yPag + ALTO_PAG / 2 + prueba.alto / 2 + 0.6)
    entra(prueba.g, tl, 18.0, { desde: 'abajo', dist: SALTO, dur: 2.0 })
    prueba.escribir(tl, 18.2, 1.2)
    estampar(18.1, 0.075)
    prueba.recorrer(tl, 18.8, 5.2, 0.92)
    // El giro es lo que la vuelve un OBJETO. Un plano de frente con una captura encima es una textura
    // pegada; el mismo plano girando mientras la camara lo pasa es un pliego en un taller.
    tl.to(prueba.g.rotation, { y: -0.22, duration: b(5.6), ease: 'none' }, b(18.6))
    acompanar(prueba.g, tl, 19.0, 24.8, xEn, RF)
    acompanar(forma.g, tl, 19.0, 24.8, xEn, RF)
    sale(prueba.g, tl, 24.2, { hacia: 'abajo', dist: SALTO, dur: 1.3 })
    levantar(forma, 25.4)
    respiraciones.push(respirar(prueba.g, { amp: 0.07, giro: 0.018, fase: 0.9 }))
    uso.pagina = prueba.fuente
  }

  // ---------------------------------------------------------------- 5 · RAZONES
  //
  // LINEAS CORTAS ENCABALGADAS, que es el unico tiempo donde el mecanismo se ve como mecanismo: una se
  // esta levantando mientras la siguiente ya esta cayendo. Las cifras arriba y las frases abajo, con dos
  // alturas preferidas cada familia para que dos vecinas no queden en el mismo renglon; cuando la
  // velocidad medida junta todo en x, `renglon` las corre sola.
  const Y_CIFRA = [2.6, 1.1]
  cifras.forEach((c, i) => {
    const t0 = 26 + i * 2.4
    const s = i % 2 === 0 ? 1 : -1
    const m = montar(c, t0 + 0.3, t0 + 2.3, Y_CIFRA[i % 2], { altoK: 1.35, sesgo: 0.15 })
    componer(m.L, t0 - 1.6, 0.11)
    viajar(m)
    entra(c.g, tl, t0, { desde: s > 0 ? 'der' : 'izq', dist: 5.5, dur: 1.2 })
    c.escribir(tl, t0 + 0.3, 0.75)
    sale(c.g, tl, t0 + 2.3, { hacia: s > 0 ? 'izq' : 'der', dist: 6, dur: 0.9 })
    levantar(m.L, t0 + 3.0, 1.0)
  })
  uso.cifras = cifras.length

  const Y_FRASE = [-2.9, -1.5]
  frases.forEach((f, i) => {
    const t0 = 26.8 + i * 3.6
    const m = montar(f, t0 + 0.4, t0 + 2.6, Y_FRASE[i % 2], {})
    componer(m.L, t0 - 1.6, 0.11)
    viajar(m)
    entra(f.g, tl, t0, { desde: 'abajo', dist: 4.5, dur: 1.3 })
    f.escribir(tl, t0 + 0.4, 0.8)
    f.borrar(tl, t0 + 2.4)
    sale(f.g, tl, t0 + 2.6, { hacia: 'abajo', dist: 5, dur: 1.0 })
    levantar(m.L, t0 + 3.4, 1.0)
  })
  uso.frases = frases.length

  // ---------------------------------------------------------------- 6 · PEDIDO
  //
  // LA ULTIMA LINEA NO SE LEVANTA. Se compone entrando por la derecha —los ultimos tipos aterrizan justo
  // cuando termina de centrarse— y a partir de ahi queda clavada al cuadro mientras la caja entera sigue
  // corriendo detras. Es lo unico de la pieza que no se mueve respecto del ojo, que es lo que hace falta
  // para leer y tipear un CTA; la camara no frena y no hace falta que frene, porque el plomo pasando
  // atras alcanza y sobra para que se siga sintiendo el avance.
  //
  // El retraso va forzado en 1.0 y no por `retrasoPara`: la cuenta de legibilidad devolveria 0.6, que
  // alcanza para que no se corte pero deja el CTA derivando. La razon esta en `movimiento.js:acompanar`
  // y es de producto, no de geometria.
  let latido = null
  if (pedido) {
    const m = montar(pedido, 33.0, meta.beats, 0.1, { altoK: 0.80, sesgo: 0.15, retraso: 1.0, ta: 31.0 })
    componer(m.L, 31.4, 0.13)
    viajar(m)
    entra(pedido.g, tl, 32.6, { desde: 'fondo', dist: 2.4, dur: 1.8 })
    pedido.escribir(tl, 33.2, 0.9)
    estampar(33.0, 0.06)
    latido = pedido.latir(0.032)
    uso.cta = pedido.tieneCta
    // El unico sitio de la pieza donde la luz sube. El ojo lo lee como que algo se resolvio.
    tl.to(ctx.bloom, { strength: (ctx.bloom.strength || 0.5) * 1.6, duration: b(2.0), ease: E.frena(2) }, b(32.2))
  }

  // ---------------------------------------------------------------- capa 1 · la caja tipografica
  //
  // SE MIDE CONTRA EL RECORRIDO REAL, NO CONTRA `LARGO`. La camara viaja `LARGO · R.velocidad` y el
  // retrato manda esa velocidad hasta 1.45, asi que el multiplicador tiene que estar en los DOS lados de
  // la cuenta. Con el solo en el vuelo, en el ultimo beat —el del CTA— el borde del cuadro se queda sin
  // caja, y lo que se ve ahi no es el vacio: es el plano emisivo del fondo, a intensidad plena y encima
  // floreciendo con el bloom. No hay sintoma a velocidad neutra, y por eso se escapa leyendo. Es el
  // mismo aviso que `reticula` y `archivo` dejan escritos para sus muros.
  const ANCHO_CAJA = LARGO * R.velocidad + mundoW * 2.6

  // LA LUZ VIVE DETRAS DE LA CAJA Y SE VE POR LOS CAJETINES VACIOS. Una sola malla ilumina la
  // cuadricula entera: cada hueco y cada junta se vuelve una linea encendida y no hay que modelar
  // ninguna. Va en el acento y no en `nivel(k)`: `nivel(0.05)` es casi blanco en un aire claro y casi
  // negro en uno oscuro, o sea que la lampara se apagaria sola en la mitad de los once aires. El acento
  // es lo unico de la paleta con contraste garantizado contra los dos fondos. La razon es de `archivo`.
  const fondoLuz = new THREE.Mesh(new THREE.PlaneGeometry(mundoW * 3.4, mundoH * 3.2),
    luz(LOOK.acento2 || LOOK.acento, 0.85))
  fondoLuz.position.z = Z_CAJA - PROF_CAJA - 1.3
  escena.add(fondoLuz)

  // CAJETIN, PASO_CAJETIN y JUNTA_C ya estan declaradas arriba, con el resto de las medidas.
  const ANCHOS_C = [1, 1, 1.4, 1.9]
  // Un cajetin vacio es un blanco de la caja, y cuantos hay lo dice el aire de la pagina: de 12% en un
  // sitio apretado a 42% en uno que respira. Es la misma receta que separa los tipos de una linea.
  const VACIOS = 0.12 + 0.30 * (R.vacio != null ? R.vacio : 0.5)
  const caja = new THREE.Group()
  escena.add(caja)
  const coro = []
  for (let j = -3; j <= 3; j++) {
    const y = j * PASO_CAJETIN
    let x = -ANCHO_CAJA / 2
    while (x < ANCHO_CAJA / 2) {
      const w = CAJETIN * ANCHOS_C[Math.floor(az() * 4)]
      const cx = x + w / 2
      x += w + JUNTA_C
      if (az() < VACIOS) continue
      const conCara = az() < 0.34
      const g = tipo(CUERPO_CAJA, PROF_CAJA, w - JUNTA_C, PASO_CAJETIN - JUNTA_C,
        matCaja, conCara ? matCaraCaja : matCaja, az() < 0.22)
      g.position.set(cx, y, Z_CAJA)
      caja.add(g)
      // EL CORO. Uno de cada siete tipos se levanta solo de su cajetin y vuelve a bajar durante toda la
      // pieza, y es lo unico que pasa en el tiempo de ESPACIO: sin el, los primeros cinco beats serian
      // un muro quieto pasando y la plantilla no se distinguiria de `reticula` hasta el beat cinco.
      // El levante se acota a 0.26 —bastante menos que las 0.35 unidades de junta entre filas— para que
      // ninguno se meta en el renglon de arriba.
      if (coro.length < 26 && az() < 0.15) {
        coro.push({ g, y0: y, z0: Z_CAJA, sal: 0.16 + az() * 0.10, per: 4.0 + az() * 5.5, fase: cx / 7 + az() * 0.4 })
      }
    }
  }
  let capas = 1

  // LOS DOS CORONDELES. Las dos alas del componedor, arriba y abajo del plano de composicion: dos
  // filetes encendidos que corren toda la pieza. Cuestan dos mallas y son lo que le da DIRECCION al
  // espacio — sin ellos, un desliz frente a una cuadricula no tiene contra que medirse. Van al acento
  // siempre, tambien cuando la caja se fundio en color: son la senalizacion del taller.
  for (const s of [-1, 1]) {
    const c = barra(ANCHO_CAJA, 0.055, LOOK.acento, 1.3)
    c.position.set(0, s * (TOPE_Y + 0.30), FRENTE - 0.55)
    escena.add(c)
  }

  // ---------------------------------------------------------------- capa 2 · el plomo suelto, cerca
  //
  // Tipos girando que cruzan delante del lente a mas del doble de la velocidad de la camara. Van
  // repartidos hacia arriba y hacia abajo A PROPOSITO: uno cruzando delante del claim es ruido en el
  // unico momento en que hay que LEER, y a mas de 1.9 del eje pasan por donde no hay texto.
  const PASO_S = 10.5
  const sueltos = new THREE.Group()
  escena.add(sueltos)
  for (let i = 0; i < 11; i++) {
    const s = tipo(CUERPO_CAJA, PROF_CAJA, 0.28 + az() * 0.22, 0.55 + az() * 0.4, matCuerpo, matCara, az() < 0.4)
    s.userData.x0 = az() * PASO_S
    s.userData.y = (az() < 0.5 ? -1 : 1) * (1.9 + az() * 2.3)
    s.userData.z = distBase * (0.22 + az() * 0.15)
    s.userData.gir = 0.4 + az() * 0.9
    sueltos.add(s)
  }
  capas++

  // ---------------------------------------------------------------- capa 3 · las galeras del fondo
  //
  // Lineas ya compuestas apiladas detras de la caja, a media profundidad. Solo se ven POR LOS CAJETINES
  // VACIOS, y eso es exactamente lo que un hueco tiene que decir: que ahi atras hay mas taller y que se
  // mueve a otro ritmo. Aparecen en las paginas que el retrato midio densas.
  let hondo = null
  if (R.capas >= 3) {
    hondo = new THREE.Group()
    escena.add(hondo)
    for (let i = 0; i < 34; i++) {
      const g = new THREE.Mesh(new THREE.BoxGeometry(1.1 + az() * 1.9, 0.34 + az() * 0.26, 0.35), matCaja)
      g.position.set(-ANCHO_CAJA / 2 + az() * ANCHO_CAJA, (az() - 0.5) * mundoH * 1.6, Z_CAJA - 3.2 - az() * 1.4)
      hondo.add(g)
    }
    capas++
  }

  // ---------------------------------------------------------------- capa 4 · la trama lejana
  //
  // Solo en los sitios mas densos que el motor midio. No se lee como objetos sino como que el taller
  // sigue mas alla: renglones sin detalle, casi sin contraste, derivando lentisimo.
  let trama = null
  if (R.capas >= 4) {
    trama = new THREE.Group()
    escena.add(trama)
    for (let i = 0; i < 26; i++) {
      const g = new THREE.Mesh(new THREE.BoxGeometry(2.4 + az() * 3.2, 0.22, 0.3), matCaja)
      g.position.set(-ANCHO_CAJA / 2 + az() * ANCHO_CAJA * 1.2, (az() - 0.5) * mundoH * 2.4, Z_CAJA - 8.5 - az() * 3)
      trama.add(g)
    }
    capas++
  }
  uso.capas = capas

  // ---------------------------------------------------------------- lo continuo
  //
  // Todo lo de aca se evalua en CADA submuestra del obturador. Escrito como tween se muestrearia una vez
  // por cuadro y saldria a saltos justo donde el obturador deberia barrerlo — y en esta plantilla eso se
  // llevaria puesto el coro entero, que es su idea.
  //
  // `paralaje()` no sirve: mueve en z y aca el eje es x. No es una excepcion a la regla 3 sino la misma
  // regla en el otro eje.
  //
  // Y TODO LO DE ABAJO ASIGNA, NO SUMA, y eso no es una eleccion de estilo. `seek()` corre `tl.time(t)`
  // primero y `alSeek(t)` despues: sobre una clave que un tween anima hay que SUMAR —el tween restablece
  // el valor y la suma lo desplaza— y sobre una que no anima nadie hay que ASIGNAR sobre una base
  // guardada, porque sumar acumularia en cada submuestra y el motor dejaria de ser determinista. Ninguna
  // de estas capas es objetivo de un tween: la caja, las galeras, la trama, el plomo suelto y el coro se
  // colocan aca y en ningun otro lado. Las unicas que suman son las respiraciones, sobre la pagina, que
  // si tiene tweens de entrada y de giro.
  const V_SEG = LARGO * R.velocidad / b(meta.beats)   // unidades por SEGUNDO: `alSeek` recibe segundos
  const T0 = b(31.5), TF = b(meta.beats)
  const alSeek = juntar(vuelo.alSeek, latido, (t) => {
    uDomo.uT.value = t

    // EL RUIDO BAJA PARA EL PEDIDO Y LA CAMARA NO. El desliz sigue a la misma velocidad; lo que se
    // aquieta es el plomo suelto, que es lo unico que estorba para leer un CTA. Se frena DEFORMANDO EL
    // TIEMPO y no multiplicando la velocidad: con un factor sobre la velocidad, la posicion —que sale de
    // `t · vel`— pega un salto en cuanto el factor cambia. El descuento crece con el cuadrado del avance,
    // asi que la velocidad al entrar en el freno es continua y no se ve un tiron.
    const d = Math.min(1, Math.max(0, (t - T0) / (TF - T0)))
    const tf = t - 0.45 * Math.max(0, t - T0) * d

    // EL CORO. Cada tipo tiene su periodo y su fase depende de su x, asi que la ola RECORRE la caja en
    // vez de que se levanten todos a la vez. `sin^2` arranca y termina con velocidad cero: ninguno pega
    // un tiron al salir ni al volver, y entre medio se queda apoyado el resto del ciclo. Sube y se
    // adelanta a la vez, que es como se saca un tipo de su cajetin y no como se abre un cajon.
    for (const c of coro) {
      const u = ((tf / c.per + c.fase) % 1 + 1) % 1
      const k = Math.min(1, Math.max(0, (u - 0.04) / 0.42))
      const s = Math.sin(Math.PI * k)
      const s2 = s * s
      c.g.position.y = c.y0 + c.sal * s2
      c.g.position.z = c.z0 + c.sal * 1.6 * s2
    }

    // El plomo suelto vive en una franja de 10.5 unidades ANCLADA A LA CAMARA, y por eso la capa no se
    // acaba nunca sin tener que dibujar cuarenta metros de tipos para que pasen once. El salto del bucle
    // cae en `cam.x - 5.25`, y a su distancia el cuadro mide 1.5 de medio ancho: la vuelta ocurre a mas
    // de tres cuadros del borde, o sea que no la ve nadie.
    for (const s of sueltos.children) {
      const u = ((s.userData.x0 - tf * V_SEG * 2.3) % PASO_S + PASO_S) % PASO_S
      s.position.set(camara.position.x + u - PASO_S / 2, s.userData.y, s.userData.z)
      s.rotation.set(t * s.userData.gir * 0.5, t * s.userData.gir, t * s.userData.gir * 0.3)
    }

    // Las dos capas del fondo derivan a fracciones de la velocidad de la camara, que es de donde sale la
    // profundidad: lo lejano casi no se corre. Se expresan como fraccion de `V_SEG` y no como un numero
    // suelto justamente para que sigan significando lo mismo cuando el retrato cambie la velocidad.
    if (hondo) hondo.position.x = t * V_SEG * 0.34
    if (trama) trama.position.x = t * V_SEG * 0.13

    fondoLuz.position.x = camara.position.x
    motas.position.x = camara.position.x
    motas.rotation.z = t * 0.012
  }, ...respiraciones)

  return { dur: b(meta.beats), alSeek, uso }
}
