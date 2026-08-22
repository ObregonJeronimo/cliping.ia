// LOS OBJETOS SUELTOS DE LA PIEZA-K.
//
// Todo lo que en el aviso no es fondo ni tarjeta: el cursor, la carpeta despiezada en cinco capas, el
// globo, el boton y la marca. Son los recursos que el motor NO puede dibujar —degradado, esquina muy
// redondeada, sombra— y por eso se hornean acá con Skia.
//
// TRES COSAS QUE ORDENAN ESTE ARCHIVO
//
// 1. LOS PARES SALEN DEL MISMO LIENZO Y DE LAS MISMAS COORDENADAS. `cursor-mano`/`cursor-click` y
//    `boton-negro`/`boton-azul` son DOS ESTADOS de un objeto, no dos objetos. En AE se cruzan en
//    opacidad, así que basta con que uno esté tres píxeles corrido para que el cruce se vea como un
//    salto. Por eso cada par se dibuja con la misma función y la misma geometría, y lo único que cambia
//    es el relleno (botón) o una deformación anclada al mismo pivote (cursor).
//
// 2. LA CARPETA VA DESPIEZADA A PROPÓSITO. Cinco PNG —trasero, dos hojas, frente y la insignia— en vez
//    de un icono. Es lo que permite que las hojas salgan de adentro cuando la carpeta se abre: un icono
//    entero sólo puede escalarse. Y por eso `carpeta-doc-2` NO viene rotado ni corrido: el "asomar" es
//    una transformación de AE. Horneada, fijaría una sola composición para siempre y las dos hojas
//    dejarían de ser intercambiables.
//
// 3. EL TEXTO VIVO NO SE HORNEA. El globo sale vacío y el botón sin rótulo porque esas palabras se
//    animan (entran letra por letra, cambian de idioma). Un PNG tiene un estado; una palabra que se
//    escribe sola tiene treinta.
//
// LA MEDICIÓN QUE HAY QUE SABER ANTES DE TOCAR UNA SOMBRA. `shadowBlur` y `shadowOffsetY` van en
// PÍXELES DEL BITMAP y la matriz NO los escala. Medido en este Skia: con `scale(2,2)`, un offset de 10
// mueve la sombra 10 px del bitmap (o sea 5 lógicos) y un desenfoque de 10 se extiende 16 px del bitmap.
// Como todo acá se dibuja en coordenadas lógicas sobre un lienzo k veces mayor, `caida()` multiplica los
// dos por K a mano. Sin eso, cada sombra saldría a la mitad del tamaño diseñado y nadie lo notaría hasta
// ver el video.
//
// USO
//   node tools/ae/recursos-k/piezas.mjs

import {
  P, DISPLAY, lienzoK, guardar, rgba, ruta, texto,
  lineal, radial, sombra, margenDe, informe,
} from './lib.mjs'

const K = 2

// El azul marino del contorno del cursor y el azul agrisado de las sombras no entran en `P` a propósito:
// no son cromo de interfaz reutilizable, son la tinta de UN objeto. Metidos en la paleta quedarían
// disponibles para un botón, y ahí empieza el desorden.
const MARINO = '#132A5E'
const SOMBRA = '#2A2F55'

const lista = []
const medidas = []

// ================================================================ ANDAMIO LOCAL

// Rectángulo redondeado que se AGREGA al camino en curso. `ruta()` de lib.mjs abre camino nuevo cada
// vez, y para el cursor hace falta un camino compuesto: cinco cajas que se rellenan como una sola
// silueta (regla nonzero) para que las uniones entre palma y dedos no dejen costura.
function sub (g, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2)
  g.moveTo(x + rr, y)
  g.lineTo(x + w - rr, y); g.arcTo(x + w, y, x + w, y + rr, rr)
  g.lineTo(x + w, y + h - rr); g.arcTo(x + w, y + h, x + w - rr, y + h, rr)
  g.lineTo(x + rr, y + h); g.arcTo(x, y + h, x, y + h - rr, rr)
  g.lineTo(x, y + rr); g.arcTo(x, y, x + rr, y, rr)
  g.closePath()
}

// Sombra pensada en unidades LÓGICAS. Ver la nota de arriba: la conversión a píxeles del bitmap es lo
// único que hace esta función, y existe para que el resto del archivo no tenga que acordarse.
function caida (g, dibujar, o) {
  sombra(g, dibujar, {
    color: o.color || SOMBRA,
    alfa: o.alfa === undefined ? 0.20 : o.alfa,
    desenfoque: o.des * K,
    bajada: (o.baja || 0) * K,
  })
}

// LA LUZ DE CANTO, Y POR QUÉ NO SE RECORTA CONTRA UNA BANDA.
//
// La primera versión de esto trazaba el contorno recortado contra un rectángulo de 20 px de alto, para
// que la luz apareciera sólo arriba. Se ve el resultado en el primer `boton-azul` y en la primera
// `carpeta-atras`: donde la banda cruza la esquina redondeada, el trazo se corta con un tajo recto y
// queda un escalón de luz en el aire. Es el mismo error que `margenDe` evita en las sombras — un corte
// duro donde el diseño pedía una caída.
//
// La versión que anda no recorta nada de eso: el degradado DEL PROPIO TRAZO llega a alfa 0 antes de que
// el contorno doble hacia abajo, así que la luz se apaga sola. El único recorte que queda es contra la
// silueta, y ese es el que convierte un marco de 5 px en un canto de 2,5.
function luzDeCanto (g, camino, pintura, grosor) {
  g.save()
  camino(); g.clip()
  camino(); g.lineWidth = grosor; g.strokeStyle = pintura; g.stroke()
  g.restore()
}

// La regla del margen, comprobada en vez de confiada. Se le pasa la caja QUE PROYECTA (no la pintada:
// un contorno por fuera no cambia de dónde sale la sombra) y verifica los cuatro lados por separado,
// porque la bajada le roba margen abajo y se lo devuelve arriba.
function comprobarMargen (nombre, W, H, [x0, y0, x1, y1], des, baja) {
  const pide = margenDe(des)
  const faltas = []
  if (x0 < pide) faltas.push(`izquierda ${x0.toFixed(1)} < ${pide}`)
  if (W - x1 < pide) faltas.push(`derecha ${(W - x1).toFixed(1)} < ${pide}`)
  if (y0 < pide - baja) faltas.push(`arriba ${y0.toFixed(1)} < ${pide - baja}`)
  if (H - y1 < pide + baja) faltas.push(`abajo ${(H - y1).toFixed(1)} < ${pide + baja}`)
  if (faltas.length) {
    throw new Error(`${nombre}: la sombra (desenfoque ${des}, bajada ${baja}) se cortaria contra el ` +
      `borde del lienzo -> ${faltas.join(' · ')}`)
  }
}

// Y la comprobación empírica, que es la que de verdad caza el error. La aritmética de arriba habla de la
// caja que yo declaré; esto mira EL BITMAP TERMINADO y exige que el anillo de un píxel del borde esté
// vacío. Si una sombra, un reflejo o una rayita se pasó, acá aparece — no hay forma de que se me escape
// por haber declarado mal una caja.
function sinCorte (nombre, cv, g) {
  const w = cv.width, h = cv.height
  const d = g.getImageData(0, 0, w, h).data
  let peor = 0, donde = ''
  const mirar = (x, y) => { const a = d[(y * w + x) * 4 + 3]; if (a > peor) { peor = a; donde = `${x},${y}` } }
  for (let x = 0; x < w; x++) { mirar(x, 0); mirar(x, h - 1) }
  for (let y = 0; y < h; y++) { mirar(0, y); mirar(w - 1, y) }
  if (peor > 6) {
    throw new Error(`${nombre}: el borde del lienzo tiene alfa ${peor}/255 en (${donde}): algo se corta ` +
      `contra el canto y va a quedar una linea recta visible`)
  }
  medidas.push(`${nombre}: alfa maxima en el borde ${peor}/255`)
  return peor
}

// El objeto no puede salir del lienzo, pero TAMPOCO puede salir vacío. Un PNG transparente entero es un
// fallo perfectamente silencioso: el archivo se escribe, pesa poco y no se ve hasta que la capa de AE
// está en negro. Se mide la tinta en la banda central, donde sí o sí tiene que haber objeto.
function tieneTinta (nombre, cv, g) {
  const w = cv.width, h = cv.height
  const d = g.getImageData(0, 0, w, h).data
  let opacos = 0
  for (let i = 3; i < d.length; i += 4) if (d[i] > 200) opacos++
  const pct = opacos / (w * h)
  if (pct < 0.02) throw new Error(`${nombre}: sólo el ${(pct * 100).toFixed(2)}% del lienzo es opaco, el PNG salió vacío`)
  return pct
}

// La caja de lo OPACO, en píxeles del bitmap. Deja afuera la sombra a propósito: la sombra de los dos
// botones tiene distinta densidad —uno está encendido— y lo que tiene que coincidir es el objeto.
function cajaOpaca (cv, g) {
  const w = cv.width, h = cv.height
  const d = g.getImageData(0, 0, w, h).data
  let x0 = w, y0 = h, x1 = -1, y1 = -1
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] > 250) {
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
    }
  }
  return [x0, y0, x1, y1]
}

// Cierre común: las comprobaciones y el guardado, para que ninguna pieza pueda saltearse una por olvido
// al agregarla.
const ENCUADRES = {}
function entregar (nombre, cv, g) {
  sinCorte(nombre, cv, g)
  tieneTinta(nombre, cv, g)
  ENCUADRES[nombre] = cajaOpaca(cv, g)
  lista.push(guardar(nombre, cv))
}

// ================================================================ 1. EL CURSOR, LOS DOS ESTADOS
//
// Aparece cuatro veces en la pieza, así que cualquier defecto suyo se ve cuatro veces.
//
// CÓMO SE HACE EL CONTORNO SIN COSTURAS INTERNAS. La mano son cinco cajas redondeadas superpuestas. Si
// se rellena y se traza cada una por separado, los bordes internos quedan dibujados y la mano se lee
// como cinco pastillas apiladas. Y si se traza el camino compuesto de una, Skia traza igual cada
// subcamino, con el mismo resultado. La maniobra que funciona son DOS PASADAS sobre el camino compuesto:
// primero trazo grueso + relleno en marino (eso da la silueta ENSANCHADA en `BORDE`), después relleno
// blanco encima (eso tapa todas las costuras y deja marino sólo el anillo de afuera).
//
// LOS TRES DEDOS PLEGADOS SON UN SOLO LOMO, Y ESO NO ES SIMPLIFICAR: ES EL DISEÑO.
//
// La primera versión les daba una caja a cada uno, con las tapas escalonadas 22 y 16 px por encima de la
// palma. La técnica de arriba funcionó perfecto —lo comprobé midiendo el píxel del medio de la costura,
// que salió blanco puro— y justamente por eso el contorno exterior dibujó lo que yo había descrito: TRES
// dedos levantados al lado del índice. En un aviso de lanzamiento eso es un gesto obsceno, encontrado
// mirando el PNG y no razonando sobre el código.
//
// Queda anotado porque la conclusión fácil era "el relleno no tapa" y me habría mandado a arreglar el
// relleno, que estaba bien. Los dedos plegados van como UN lomo redondeado que apenas asoma sobre el
// puño, y su separación se cuenta con rayas, no con silueta.
//
// Las rayas se agregan DESPUÉS, a mano, y arrancan SOBRE el contorno de la silueta: una raya que empieza
// en el aire se lee como una marca flotando, no como un pliegue.
const CUR_W = 140, CUR_H = 180
const CUR_DES = 7, CUR_BAJA = 5
const BORDE = 7

// El pivote es la muñeca, centro y base de la palma. El aplastado tiene que anclarse ahí y no en el
// centro geométrico: una mano que se aplasta desde el centro se despega del punto que está tocando, y
// justamente lo que la animación cuenta es que ese punto no se movió.
const PIVOTE_X = 70, PIVOTE_Y = 145

const MANO = [
  [32, 72, 76, 73, 26],     // el puño
  [45, 25, 25, 62, 12.5],   // índice, el único que apunta
  [68, 60, 40, 42, 20],     // los tres dedos plegados, un solo lomo
  [26, 88, 28, 38, 14],     // pulgar
]
const MANO_CAJA = [26, 25, 108, 145]   // la envolvente de las cuatro, que es lo que proyecta sombra

// Los pliegues: curvas CORTAS que nacen enterradas en el contorno y mueren adentro de la palma.
// Escritas a mano y no deducidas de las cajas, porque el borde de una caja pasa por lugares donde no va
// ningún pliegue — el fondo del índice, por ejemplo, está enterrado en el puño.
//
// Y CORTAS POR UNA MEDICIÓN, no por gusto. La primera versión tenía el del índice muriendo en y=99 y el
// del pulgar naciendo en y=96: a la altura y=95 quedaban dos marcas separadas por 7 px de blanco, y de
// lejos se leían como UNA sola raya bajando por el medio de la mano, como si el dedo siguiera de largo
// hasta la muñeca. No se veía en el código y a ojo lo confundí con un fallo del relleno; salió de medir
// las corridas de color de cada fila del PNG. Ahora el hueco entre los dos es de 15 px.
const PLIEGUES = [
  [[68, 74], [66, 81], [64, 89]],      // el índice contra el lomo de los nudillos
  [[84, 61], [83, 73], [81, 86]],
  [[97, 64], [96, 75], [94, 87]],
  [[54, 100], [51, 110], [51, 121]],   // el pulgar contra la palma
]

function pintarMano (g, apretada) {
  // El aplastado: se achata un 12% y se ensancha un 5%, que es la conservación de volumen de manual.
  // Los dos números están topeados por el margen del lienzo, no elegidos por gusto — con más ensanche la
  // silueta se come el margen que necesita la sombra por la izquierda.
  const sx = apretada ? 1.05 : 1, sy = apretada ? 0.88 : 1

  const caja = apretada
    ? [PIVOTE_X + (MANO_CAJA[0] - PIVOTE_X) * sx, PIVOTE_Y + (MANO_CAJA[1] - PIVOTE_Y) * sy,
       PIVOTE_X + (MANO_CAJA[2] - PIVOTE_X) * sx, PIVOTE_Y + (MANO_CAJA[3] - PIVOTE_Y) * sy]
    : MANO_CAJA
  comprobarMargen(apretada ? 'cursor-click' : 'cursor-mano', CUR_W, CUR_H, caja, CUR_DES, CUR_BAJA)

  g.save()
  g.translate(PIVOTE_X, PIVOTE_Y); g.scale(sx, sy); g.translate(-PIVOTE_X, -PIVOTE_Y)

  const silueta = () => { g.beginPath(); for (const p of MANO) sub(g, p[0], p[1], p[2], p[3], p[4]) }

  caida(g, silueta, { des: CUR_DES, baja: CUR_BAJA, alfa: 0.26 })

  // pasada 1: silueta ensanchada en marino
  g.lineJoin = 'round'; g.lineCap = 'round'
  g.strokeStyle = MARINO; g.fillStyle = MARINO; g.lineWidth = BORDE * 2
  silueta(); g.stroke(); g.fill()

  // pasada 2: el relleno claro, que borra las costuras internas de la pasada anterior. No es blanco puro
  // sino un degradado hacia el hueso: sobre un fondo lavanda casi blanco, un cursor blanco plano
  // desaparece en el borde de abajo y parece recortado.
  silueta()
  g.fillStyle = lineal(g, 0, 25, 0, 145, [[0, '#FFFFFF'], [0.55, '#FFFFFF'], [1, '#E8ECF7']])
  g.fill()

  // los pliegues, ya sobre el relleno
  g.strokeStyle = MARINO; g.lineWidth = 3.4
  for (const [a, b, c] of PLIEGUES) {
    g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo(b[0], b[1], c[0], c[1]); g.stroke()
  }
  g.restore()
}

{
  const [cv, g] = lienzoK(CUR_W, CUR_H, K)
  pintarMano(g, false)
  entregar('cursor-mano', cv, g)
}

{
  const [cv, g] = lienzoK(CUR_W, CUR_H, K)
  pintarMano(g, true)

  // Las rayitas de impacto van FUERA de la deformación: adentro se aplastarían con la mano y perderían
  // el grosor parejo, que es lo único que las hace leer como impacto y no como pelos. Tampoco proyectan
  // sombra: son un símbolo, no un objeto, y una sombra las convertiría en tres palitos flotando.
  const tx = PIVOTE_X + (57.5 - PIVOTE_X) * 1.05      // punta del índice ya aplastada
  const ty = PIVOTE_Y + (25 - PIVOTE_Y) * 0.88 - 6
  g.strokeStyle = MARINO; g.lineWidth = 5; g.lineCap = 'round'
  for (const grados of [-145, -90, -35]) {
    const a = grados * Math.PI / 180
    g.beginPath()
    g.moveTo(tx + Math.cos(a) * 11, ty + Math.sin(a) * 11)
    g.lineTo(tx + Math.cos(a) * 22, ty + Math.sin(a) * 22)
    g.stroke()
  }
  entregar('cursor-click', cv, g)
}

// ================================================================ 2. LA CARPETA, EN CINCO CAPAS

// --- 2a. el cuerpo trasero ---------------------------------------------------------------------------
// Dos cajas: la pestaña de arriba a la izquierda y el cuerpo. Van como camino compuesto para que la
// unión entre las dos no tenga costura, igual que el cursor.
//
// LA PESTAÑA BAJA HASTA 126 Y NO HASTA 90, que es lo que parecía suficiente. Las dos cajas comparten el
// canto izquierdo en x=40, pero cada una lo redondea: entre y=68 y y=96 las dos esquinas se curvan hacia
// adentro al mismo tiempo y la unión quedaba con un MORDISCO cóncavo en el borde izquierdo — se ve en el
// primer PNG, un pellizco a media altura. Alargando la pestaña, su canto izquierdo pasa recto por toda
// esa franja y tapa la curva del cuerpo. La parte que sobra queda enterrada adentro y no cuesta nada.
//
// LA DIRECCIÓN DEL DEGRADADO NO ES DECORATIVA. De este trasero, en la pieza, sólo se ve la FRANJA DE
// ARRIBA: el frente le tapa los dos tercios de abajo y las hojas el resto. Un degradado vertical dejaría
// esa franja de un solo azul plano. Corre en diagonal y muere a media altura, así que la parte visible
// es justo donde el degradado tiene recorrido.
{
  const W = 450, H = 380, DES = 12, BAJA = 9
  const [cv, g] = lienzoK(W, H, K)
  const CAJA = [40, 30, 410, 328]
  comprobarMargen('carpeta-atras', W, H, CAJA, DES, BAJA)

  const cuerpo = () => {
    g.beginPath()
    sub(g, 40, 30, 150, 96, 22)     // pestaña
    sub(g, 40, 62, 370, 266, 34)    // cuerpo
  }
  caida(g, cuerpo, { des: DES, baja: BAJA, alfa: 0.22 })
  cuerpo()
  g.fillStyle = lineal(g, 40, 30, 410, 180, [[0, '#1F6FE0'], [0.55, '#4E92E8'], [1, '#7FB3F0']])
  g.fill()

  // ACÁ NO VA `luzDeCanto`, Y ES LA ÚNICA PIEZA DEL ARCHIVO DONDE NO VA. Esta silueta es un camino
  // COMPUESTO, y trazar un camino compuesto traza todos sus subcaminos: el contorno entero de la
  // pestaña, incluido el pedazo que está enterrado adentro del cuerpo. En el cursor eso no molesta
  // porque el relleno claro viene DESPUÉS y tapa las costuras; acá la luz va después del relleno, así
  // que las costuras quedan encendidas. Se vio clarito en el PNG anterior: el rectángulo de la pestaña
  // dibujado con luz por adentro de la carpeta.
  //
  // La luz va entonces como un lavado de arriba recortado contra la silueta. Pierde el filo del canto y
  // lo gana en que no puede dejar ningún borde interno prendido — y de este trasero, en la pieza, se ve
  // la franja de arriba y poco más.
  g.save()
  cuerpo(); g.clip()
  g.fillStyle = lineal(g, 0, 30, 0, 160, [
    [0, '#FFFFFF', 0.34], [0.45, '#FFFFFF', 0.10], [1, '#FFFFFF', 0],
  ])
  g.fillRect(40, 30, 370, 130)
  g.restore()

  entregar('carpeta-atras', cv, g)
}

// --- 2b. la hoja de adelante, con la tabla -----------------------------------------------------------
// La tabla se dibuja con pastillas y no con texto: a este tamaño una palabra de 9 px es barro, y además
// cualquier palabra horneada acá quedaría en castellano en una pieza cuyo gesto es "el mismo material en
// cuatro idiomas". Las pastillas son legibles en cualquiera.
{
  const W = 380, H = 300, DES = 10, BAJA = 8
  const [cv, g] = lienzoK(W, H, K)
  const HX = 34, HY = 26, HW = 312, HH = 232, HR = 20
  comprobarMargen('carpeta-doc-1', W, H, [HX, HY, HX + HW, HY + HH], DES, BAJA)

  const hoja = () => ruta(g, HX, HY, HW, HH, HR)
  caida(g, hoja, { des: DES, baja: BAJA, alfa: 0.18 })
  hoja()
  g.fillStyle = lineal(g, HX, HY, HX, HY + HH, [[0, '#FFFFFF'], [1, '#F4F6FB']])
  g.fill()
  hoja(); g.strokeStyle = rgba(P.grisClaro, 0.75); g.lineWidth = 1; g.stroke()

  // cabecera de la hoja: un titular y un subtítulo, en pastillas
  ruta(g, 60, 52, 116, 12, 6); g.fillStyle = rgba(P.azul, 0.85); g.fill()
  ruta(g, 60, 72, 74, 8, 4); g.fillStyle = rgba(P.gris, 0.45); g.fill()

  const TX = 60, TY = 96, TW = 260, TH = 138, TR = 10
  const CABEZA = 28, FILA = (TH - CABEZA) / 4
  const COLS = [[74, 78], [168, 62], [246, 60]]

  g.save()
  ruta(g, TX, TY, TW, TH, TR); g.clip()
  g.fillStyle = P.azulPalido; g.fillRect(TX, TY, TW, CABEZA)
  g.restore()

  // barras de la cabecera, un poco más cortas que las de las filas para que se lean como rótulos
  for (const [cx, cw] of COLS) {
    ruta(g, cx, TY + CABEZA / 2 - 4, cw * 0.68, 8, 4)
    g.fillStyle = rgba(P.azul, 0.60); g.fill()
  }

  // Los anchos de cada celda están escritos uno por uno y no sorteados: con `azar()` el resultado sería
  // reproducible igual, pero acá la irregularidad tiene que estar CONTROLADA — una fila entera corta o
  // tres celdas iguales en columna leen como error de dibujo, y el sorteo no sabe evitarlo.
  const ANCHOS = [
    [1.00, 0.86, 0.55],
    [0.78, 1.00, 0.70],
    [0.92, 0.62, 0.85],
    [0.66, 0.90, 0.48],
  ]
  for (let f = 0; f < 4; f++) {
    const cy = TY + CABEZA + FILA * f + FILA / 2
    COLS.forEach(([cx, cw], c) => {
      ruta(g, cx, cy - 4.5, cw * ANCHOS[f][c], 9, 4.5)
      g.fillStyle = rgba(P.gris, 0.50); g.fill()
    })
    if (f > 0) {
      g.beginPath(); g.moveTo(TX, TY + CABEZA + FILA * f); g.lineTo(TX + TW, TY + CABEZA + FILA * f)
      g.strokeStyle = rgba(P.grisClaro, 0.85); g.lineWidth = 1; g.stroke()
    }
  }
  for (const dx of [160, 238]) {
    g.beginPath(); g.moveTo(dx, TY + CABEZA); g.lineTo(dx, TY + TH)
    g.strokeStyle = rgba(P.grisClaro, 0.70); g.lineWidth = 1; g.stroke()
  }
  ruta(g, TX, TY, TW, TH, TR); g.strokeStyle = rgba(P.grisClaro, 1); g.lineWidth = 1; g.stroke()

  entregar('carpeta-doc-1', cv, g)
}

// --- 2c. la segunda hoja, la que asoma ---------------------------------------------------------------
// Mismo lienzo y MISMO CENTRO que la primera, sólo que más chica y más gris: así se lee como una hoja
// que está más atrás, y las dos siguen entrando en la misma ranura de AE.
//
// VA CASI VACÍA A PROPÓSITO. De esta hoja se ve el canto y nada más. Dibujarle una tabla adentro son
// píxeles que nadie va a mirar y peso de archivo que sí se paga al decodificarla.
{
  const W = 380, H = 300, DES = 10, BAJA = 8
  const [cv, g] = lienzoK(W, H, K)
  const HX = 44, HY = 34, HW = 292, HH = 216, HR = 18
  comprobarMargen('carpeta-doc-2', W, H, [HX, HY, HX + HW, HY + HH], DES, BAJA)

  const hoja = () => ruta(g, HX, HY, HW, HH, HR)
  caida(g, hoja, { des: DES, baja: BAJA, alfa: 0.16 })
  hoja()
  g.fillStyle = lineal(g, HX, HY, HX, HY + HH, [[0, '#F2F3F8'], [1, '#DCDFEA']])
  g.fill()
  hoja(); g.strokeStyle = rgba(P.gris, 0.40); g.lineWidth = 1; g.stroke()

  // el canto iluminado de arriba: es LO ÚNICO que se ve de esta hoja cuando está detrás de la otra, así
  // que es la única parte que recibe trabajo.
  luzDeCanto(g, hoja, lineal(g, 0, HY, 0, HY + 90, [
    [0, '#FFFFFF', 0.95], [0.30, '#FFFFFF', 0.35], [1, '#FFFFFF', 0],
  ]), 4)

  for (const [bx, by, bw, bh, a] of [[70, 64, 104, 10, 0.22], [70, 88, 158, 8, 0.15]]) {
    ruta(g, bx, by, bw, bh, bh / 2); g.fillStyle = rgba(P.gris, a); g.fill()
  }

  entregar('carpeta-doc-2', cv, g)
}

// --- 2d. la solapa del frente -------------------------------------------------------------------------
{
  const W = 450, H = 300, DES = 12, BAJA = 9
  const [cv, g] = lienzoK(W, H, K)
  const FX = 38, FY = 40, FW = 374, FH = 210, FR = 30
  comprobarMargen('carpeta-frente', W, H, [FX, FY, FX + FW, FY + FH], DES, BAJA)

  const solapa = () => ruta(g, FX, FY, FW, FH, FR)
  caida(g, solapa, { des: DES, baja: BAJA, alfa: 0.24 })
  solapa()
  g.fillStyle = lineal(g, FX, FY, FX + FW, FY + FH, [[0, '#3B86EF'], [0.55, '#6AA6F3'], [1, '#8FC0F5']])
  g.fill()

  // beso de cian abajo a la derecha: la carpeta comparte cuadro con el resplandor cian del fondo, y sin
  // esta contaminación de color el objeto se lee pegado encima en vez de metido en la escena.
  g.save()
  solapa(); g.clip()
  g.fillStyle = radial(g, FX + FW * 0.92, FY + FH * 1.02, 0, FW * 0.55, [
    [0, P.cian, 0.42], [0.45, P.cian, 0.16], [1, P.cian, 0],
  ])
  g.fillRect(FX, FY, FW, FH)
  g.restore()

  // la luz de borde de arriba
  luzDeCanto(g, solapa, lineal(g, 0, FY, 0, FY + 110, [
    [0, '#FFFFFF', 0.75], [0.30, '#FFFFFF', 0.30], [1, '#FFFFFF', 0],
  ]), 5)

  // --- la etiqueta
  const EX = 72, EY = 92, EW = 244, EH = 106, ER = 26
  const etiqueta = () => ruta(g, EX, EY, EW, EH, ER)
  caida(g, etiqueta, { des: 5, baja: 3, color: '#123A7A', alfa: 0.28 })
  etiqueta()
  g.fillStyle = lineal(g, EX, EY, EX, EY + EH, [[0, '#FFFFFF'], [1, '#EFF3FC']])
  g.fill()

  const ancho = texto(g, 'Folder', EX + 28, 150, {
    tam: 36, familia: DISPLAY, peso: 'bold', color: P.tinta, espaciado: -0.6,
  })
  if (EX + 28 + ancho > EX + EW - 20) {
    throw new Error(`carpeta-frente: "Folder" mide ${ancho.toFixed(1)} px y no entra en la etiqueta de ${EW} con sus márgenes`)
  }

  // La línea de subtítulo va como pastilla y no como palabra: cualquier texto de verdad ahí abajo
  // tendría que decir algo, y lo que diga la carpeta cambia en cada corte de la pieza. Una pastilla no
  // miente en ningún idioma.
  ruta(g, EX + 28, 164, 118, 11, 5.5); g.fillStyle = rgba(P.gris, 0.50); g.fill()

  entregar('carpeta-frente', cv, g)
}

// --- 2e. la insignia de esquina -----------------------------------------------------------------------
// 80x80 es un lienzo chico para una sombra: con desenfoque 5 y bajada 3, el margen de abajo queda EXACTO
// en 18 px. Por eso el radio es 22 y no 26, que era lo primero que había puesto — `comprobarMargen` lo
// rechazó y tenía razón.
{
  const W = 80, H = 80, DES = 5, BAJA = 3, R = 22
  const [cv, g] = lienzoK(W, H, K)
  comprobarMargen('carpeta-disco', W, H, [40 - R, 40 - R, 40 + R, 40 + R], DES, BAJA)

  const disco = () => { g.beginPath(); g.arc(40, 40, R, 0, Math.PI * 2); g.closePath() }
  caida(g, disco, { des: DES, baja: BAJA, alfa: 0.30 })
  disco()
  g.fillStyle = lineal(g, 40 - R, 40 - R, 40 + R, 40 + R, [[0, '#3B90FF'], [0.5, P.azul], [1, P.azulHondo]])
  g.fill()
  disco(); g.strokeStyle = rgba('#FFFFFF', 0.35); g.lineWidth = 1.6; g.stroke()

  g.strokeStyle = '#FFFFFF'; g.lineWidth = 5.5; g.lineCap = 'round'; g.lineJoin = 'round'
  g.beginPath(); g.moveTo(30, 40.5); g.lineTo(37, 47.5); g.lineTo(51, 32.5); g.stroke()

  entregar('carpeta-disco', cv, g)
}

// ================================================================ 3. EL GLOBO
//
// Sale VACÍO: el texto es una capa viva de AE porque entra animado y cambia de idioma. Y por eso mismo
// no lleva pico. Un pico fija hacia dónde apunta el globo, y lo que apunta depende de dónde caiga el
// texto en cada corte; horneado, ataría la composición entera a una sola posición.
{
  const W = 700, H = 200, DES = 14, BAJA = 11
  const [cv, g] = lienzoK(W, H, K)
  const GX = 46, GY = 38, GW = 608, GH = 106, GR = 53
  comprobarMargen('globo-negro', W, H, [GX, GY, GX + GW, GY + GH], DES, BAJA)

  const globo = () => ruta(g, GX, GY, GW, GH, GR)
  caida(g, globo, { des: DES, baja: BAJA, alfa: 0.26 })
  globo()
  // No es negro plano: un sólido #0B0D12 de 608 px de ancho sobre lavanda se lee como un agujero
  // recortado. El degradado apenas se ve y es justo lo que lo convierte en un objeto con volumen.
  g.fillStyle = lineal(g, GX, GY, GX, GY + GH, [[0, '#191C25'], [0.55, '#101319'], [1, P.negro]])
  g.fill()
  globo(); g.strokeStyle = rgba('#FFFFFF', 0.07); g.lineWidth = 1.4; g.stroke()

  luzDeCanto(g, globo, lineal(g, 0, GY, 0, GY + 55, [
    [0, '#FFFFFF', 0.16], [0.35, '#FFFFFF', 0.06], [1, '#FFFFFF', 0],
  ]), 4)

  entregar('globo-negro', cv, g)
}

// ================================================================ 4. EL BOTÓN, LOS DOS ESTADOS
//
// La geometría está afuera de las dos funciones y es la misma constante: es la única manera de garantizar
// que el cruce en opacidad no muestre un salto. Lo único que cambia entre reposo y apretado es el
// relleno y el tinte de la sombra — una sombra azul debajo de un botón encendido es lo que hace que el
// estado apretado se lea como encendido y no como "otro botón".
const BOT_W = 500, BOT_H = 150
const BOT = [32, 24, 436, 88, 44]
const BOT_DES = 10, BOT_BAJA = 8

function boton (nombre, pintar, tinte, alfa) {
  const [cv, g] = lienzoK(BOT_W, BOT_H, K)
  comprobarMargen(nombre, BOT_W, BOT_H, [BOT[0], BOT[1], BOT[0] + BOT[2], BOT[1] + BOT[3]], BOT_DES, BOT_BAJA)

  const cuerpo = () => ruta(g, BOT[0], BOT[1], BOT[2], BOT[3], BOT[4])
  caida(g, cuerpo, { des: BOT_DES, baja: BOT_BAJA, color: tinte, alfa })
  cuerpo()
  pintar(g, cuerpo)
  entregar(nombre, cv, g)
}

boton('boton-negro', (g, cuerpo) => {
  g.fillStyle = lineal(g, 0, BOT[1], 0, BOT[1] + BOT[3], [[0, '#1B1F29'], [0.55, '#101319'], [1, P.negro]])
  g.fill()
  cuerpo(); g.strokeStyle = rgba('#FFFFFF', 0.08); g.lineWidth = 1.4; g.stroke()
  luzDeCanto(g, cuerpo, lineal(g, 0, BOT[1], 0, BOT[1] + 46, [
    [0, '#FFFFFF', 0.18], [0.35, '#FFFFFF', 0.07], [1, '#FFFFFF', 0],
  ]), 4)
}, SOMBRA, 0.22)

boton('boton-azul', (g, cuerpo) => {
  g.fillStyle = lineal(g, BOT[0], 0, BOT[0] + BOT[2], 0, [[0, P.cian], [0.45, '#37A3FA'], [1, P.azul]])
  g.fill()

  // El reflejo del borde superior izquierdo. La pintura del trazo es RADIAL y está centrada en esa
  // esquina: así se apaga en todas las direcciones a la vez y no hace falta recortarlo contra nada. Con
  // un degradado lineal habría que decidir un eje, y sobre un contorno cerrado cualquier eje deja el
  // reflejo encendido en el lado opuesto — con el diagonal, el canto de abajo a la izquierda salía casi
  // tan brillante como el de arriba.
  luzDeCanto(g, cuerpo, radial(g, BOT[0] + 42, BOT[1] + 8, 0, 240, [
    [0, '#FFFFFF', 0.92], [0.35, '#FFFFFF', 0.42], [0.70, '#FFFFFF', 0.12], [1, '#FFFFFF', 0],
  ]), 6)

  // y un lavado claro pegado al canto de arriba, que es lo que separa un botón encendido de un
  // rectángulo con degradado
  g.save()
  cuerpo(); g.clip()
  g.fillStyle = lineal(g, 0, BOT[1], 0, BOT[1] + BOT[3] * 0.5, [[0, '#FFFFFF', 0.26], [1, '#FFFFFF', 0]])
  g.fillRect(BOT[0], BOT[1], BOT[2], BOT[3])
  g.restore()
}, '#123A7A', 0.28)

// ================================================================ 5. LA MARCA
//
// Barra vertical con las puntas redondeadas, cortada en diagonal abajo a la derecha, y una estrella de
// cuatro puntas encajada en esa muesca. El nombre va como capa viva: se escribe solo en la pieza.
//
// CÓMO SE HACE EL CORTE. No con `destination-out`, que borraría también la sombra ya dibujada y dejaría
// un agujero en ella. Se recorta ANTES, con un camino que es "todo el lienzo MENOS el triángulo" y
// relleno par-impar: el rectángulo del lienzo y el triángulo adentro se anulan, así que el triángulo
// queda fuera del recorte. Verificado que `clip('evenodd')` existe en este Skia antes de apoyarme en él.
//
// Y la sombra de la barra se recorta igual que la barra. Es a propósito: si la sombra se derramara sobre
// la muesca, el corte se leería como una máscara puesta encima y no como la forma real del objeto.
{
  const W = 200, H = 240, DES = 9, BAJA = 6
  const [cv, g] = lienzoK(W, H, K)
  const BX = 42, BY = 24, BW = 58, BH = 168
  const EST_X = 122, EST_Y = 160, EST_R = 40
  comprobarMargen('marca-langease', W, H,
    [BX, BY, EST_X + EST_R, EST_Y + EST_R], DES, BAJA)

  const muesca = () => { g.moveTo(104, 110); g.lineTo(104, 210); g.lineTo(50, 210); g.closePath() }

  g.save()
  g.beginPath(); g.rect(0, 0, W, H); muesca(); g.clip('evenodd')

  const barra = () => ruta(g, BX, BY, BW, BH, BW / 2)
  caida(g, barra, { des: DES, baja: BAJA, color: '#0A3A9E', alfa: 0.28 })
  barra()
  g.fillStyle = lineal(g, BX, BY, BX + BW, BY + BH, [[0, '#1E6BFF'], [0.60, P.azulHondo], [1, '#0844C4']])
  g.fill()
  g.restore()

  // La estrella se dibuja FUERA del recorte: es otro objeto, y si compartiera el recorte la muesca se la
  // comería justamente por donde tiene que encajar.
  //
  // La cintura (0,16 del radio) es lo que decide si esto es una estrella o una flor: es la distancia del
  // punto de control al centro, y con valores por encima de 0,3 los brazos dejan de ser cóncavos.
  const estrella = () => {
    const c = EST_R * 0.16
    g.beginPath()
    g.moveTo(EST_X, EST_Y - EST_R)
    g.quadraticCurveTo(EST_X + c, EST_Y - c, EST_X + EST_R, EST_Y)
    g.quadraticCurveTo(EST_X + c, EST_Y + c, EST_X, EST_Y + EST_R)
    g.quadraticCurveTo(EST_X - c, EST_Y + c, EST_X - EST_R, EST_Y)
    g.quadraticCurveTo(EST_X - c, EST_Y - c, EST_X, EST_Y - EST_R)
    g.closePath()
  }
  caida(g, estrella, { des: DES, baja: BAJA, color: '#0A3A9E', alfa: 0.24 })
  estrella()
  g.fillStyle = lineal(g, EST_X - EST_R, EST_Y - EST_R, EST_X + EST_R, EST_Y + EST_R,
    [[0, P.cian], [0.5, '#2E9BFB'], [1, P.azulHondo]])
  g.fill()

  entregar('marca-langease', cv, g)
}

// ================================================================ LOS PARES, MEDIDOS
//
// Que los dos estados de un par estén registrados no lo garantiza haberlos escrito con la misma
// constante: eso garantiza la INTENCIÓN. Cualquier cosa que cambie la silueta de uno solo —un reflejo
// que se derrame, un trazo más grueso— rompe el cruce en opacidad sin tocar una sola coordenada. Así que
// se mide sobre el bitmap terminado.
{
  const a = ENCUADRES['boton-negro'], b = ENCUADRES['boton-azul']
  const desvio = a.map((v, i) => Math.abs(v - b[i]))
  const peor = Math.max(...desvio)
  // LA TOLERANCIA ES DE UN PÍXEL DEL BITMAP Y ESO ESTÁ MEDIDO, no aflojado para que pase. Con tolerancia
  // cero esto falló, y el fallo señalaba un solo número: x0 = 64 en el azul contra 65 en el negro, o sea
  // el canto IZQUIERDO y ninguno de los otros tres. Los dos botones salen del MISMO camino, así que la
  // silueta es idéntica; lo que cambia es cuánta pintura recibe el píxel del borde, que está cubierto a
  // medias. El azul lleva el reflejo encima, o sea una segunda pasada sobre esa misma cobertura parcial,
  // y un píxel que en el negro queda en alfa 249 en el azul llega a 251 y cruza el umbral. Que el desvío
  // aparezca justo donde el reflejo es más brillante es lo que confirma la explicación.
  // Medio píxel lógico: invisible en un cruce de opacidad. Dos ya serían otra cosa y por eso corta acá.
  if (peor > 1) {
    throw new Error(`el par de botones no está registrado: negro [${a}] vs azul [${b}] (px del bitmap), ` +
      `desvío ${peor}. Al cruzarlos en opacidad se vería el salto.`)
  }
  medidas.push(`par boton: [${a.join(', ')}] contra [${b.join(', ')}], desvío máximo ${peor} px del bitmap`)
}
{
  const a = ENCUADRES['cursor-mano'], b = ENCUADRES['cursor-click']
  // Acá NO se exige encuadre idéntico y sería un error exigirlo: el apretado se achata y se ensancha, o
  // sea que las cajas TIENEN que diferir. Lo que no puede moverse es el ancla — la base, que es el punto
  // que el cursor está tocando, y el eje vertical, porque el aplastado es simétrico.
  const base = Math.abs(a[3] - b[3]) / K
  const eje = Math.abs((a[0] + a[2]) - (b[0] + b[2])) / (2 * K)
  if (base > 2) throw new Error(`cursor: la base se movió ${base.toFixed(2)} px lógicos al apretar, el cursor se despega de lo que toca`)
  if (eje > 1.5) throw new Error(`cursor: el eje se corrió ${eje.toFixed(2)} px lógicos al apretar`)
  medidas.push(`par cursor: la base se mueve ${base.toFixed(2)} px y el eje ${eje.toFixed(2)} px lógicos`)
}

// ---------------------------------------------------------------- corrida
informe('piezas', lista)
for (const m of medidas) console.log('  · ' + m)
