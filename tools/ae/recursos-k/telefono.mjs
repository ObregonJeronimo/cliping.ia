// ================================================================================================
// EL TELEFONO DE LA PIEZA-K, y las pantallas que van adentro.
//
// Seis de estos arman un anillo hexagonal con la camara ADENTRO, mirando hacia afuera. Es el momento
// mas fuerte de la pieza, asi que el objeto tiene que leerse como SOLIDO y no como una calcomania.
// Tres decisiones salen de ahi y explican casi todo el archivo:
//
//   1. LA PANTALLA DEL CHASIS ES UN AGUJERO, no un rectangulo negro. El chasis se usa seis veces y lo
//      unico que cambia entre las seis es la captura de atras. Un PNG horneado tiene un solo estado
//      (la regla que ordena toda la biblioteca), asi que el estado que cambia —la pantalla— vive en
//      otra capa. Se perfora con `destination-out` despues de dibujar el cuerpo.
//   2. EXISTE UN CANTO. Un plano suelto girando muestra que no tiene espesor justo cuando pasa de
//      perfil, que en un anillo pasa seis veces por vuelta. `tel-canto.png` es la cara lateral de la
//      losa y se coloca perpendicular al frente.
//   3. EL CANTO Y EL CHASIS COMPARTEN LIENZO Y COORDENADAS. Los dos miden 1400 de alto y el cuerpo
//      ocupa exactamente la misma banda vertical en los dos, asi que en AE se centran igual y encajan
//      sin numeros a mano. El sobrante del canto va transparente, no recortado.
//
// Las capturas (articulos, chat, video) son FALSAS y estan dibujadas con rectangulos: a este tamaño
// el texto real se vuelve papilla —el telefono en el anillo mide una fraccion del cuadro— y ademas
// tarda. Lo unico que va en tipografia de verdad es lo que se lee grande: titulos, hora, rotulos.
//
// Todo con `azar(semilla)` y la semilla escrita al lado. Dos corridas dan PNG identicos.
// ================================================================================================

import {
  P, DISPLAY, UI, lienzoK, guardar, rgba, ruta, texto, fuente,
  lineal, radial, sombra, margenDe, azar, informe,
} from './lib.mjs'

const K = 2   // el multiplicador de pixeles nativos que pide lectura-check Q2

// ---------------------------------------------------------------- geometria del chasis
//
// El lienzo mide 700x1400 pero el CUERPO no: la sombra necesita su margen o la caida se corta contra
// el borde y queda un rectangulo visible alrededor del telefono.
//
// Y ACA HAY UNA TRAMPA QUE COSTO UNA SOMBRA INVISIBLE. `margenDe()` supone que el desenfoque esta en
// las mismas unidades en que uno dibuja, y con `lienzoK` NO lo esta: `shadowBlur` y `shadowOffsetY`
// no los toca la matriz de transformacion, asi que con k=2 valen PIXELES NATIVOS mientras todo lo
// demas va en logicos. Se paga dos veces: el margen reservado sale del doble del que hace falta, y la
// caida real llega a la mitad de lejos, o sea que la sombra se ve dura y corta. Medido en este lienzo:
// con desenfoque 22 y alfa 0,20 el pico bajo el telefono daba 0,06 —invisible— y sobraban 66 px de
// margen vacio. De ahi las dos divisiones por K de abajo, y por eso el alfa parece alta y no lo es.
const CH_W = 700, CH_H = 1400
const DESENFOQUE = 40, BAJADA = 24          // en pixeles NATIVOS, como los toma Skia
const M = Math.ceil(margenDe(DESENFOQUE) / K)   // 60 logicos: el alcance real de la caida
const BAJADA_LOG = Math.round(BAJADA / K)       // 12 logicos

const CUERPO = {
  x: M,
  y: M,
  w: CH_W - M * 2,                        // 580
  h: CH_H - M * 2 - BAJADA_LOG,           // 1268 -> proporcion 0,457, la de un telefono real
  // El pedido es "radio ~92 sobre 700 de ancho", o sea 0,131 del ancho. Como el cuerpo no ocupa los
  // 700 (le comio el margen de la sombra), el radio se recalcula sobre el ancho REAL para conservar
  // la proporcion; copiar el 92 tal cual daria unas esquinas mas redondas que las pedidas.
  r: Math.round((CH_W - 60 * 2) * (92 / 700)),  // 76
}
const BISEL = 14
const PANTALLA = {
  x: CUERPO.x + BISEL,
  y: CUERPO.y + BISEL,
  w: CUERPO.w - BISEL * 2,
  h: CUERPO.h - BISEL * 2,
  r: CUERPO.r - BISEL,
}

// ---------------------------------------------------------------- rectangulo con cuatro radios
// `ruta()` de la biblioteca usa un radio unico, y las burbujas del chat necesitan tres esquinas
// redondas y una casi en punta: esa esquina chica es lo que las lee como burbuja y no como pastilla.
function ruta4(g, x, y, w, h, rs) {
  const [a, b, c, d] = rs.map(r => Math.min(r, w / 2, h / 2))
  g.beginPath()
  g.moveTo(x + a, y)
  g.lineTo(x + w - b, y); g.arcTo(x + w, y, x + w, y + b, b)
  g.lineTo(x + w, y + h - c); g.arcTo(x + w, y + h, x + w - c, y + h, c)
  g.lineTo(x + d, y + h); g.arcTo(x, y + h, x, y + h - d, d)
  g.lineTo(x, y + a); g.arcTo(x, y, x + a, y, a)
  g.closePath()
}

const disco = (g, x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2) }

// ================================================================================================
// 1. EL CHASIS
// ================================================================================================
function chasis() {
  const [cv, g] = lienzoK(CH_W, CH_H, K)
  const C = CUERPO
  const camino = () => ruta(g, C.x, C.y, C.w, C.h, C.r)

  sombra(g, camino, { color: '#171B3C', alfa: 0.48, desenfoque: DESENFOQUE, bajada: BAJADA })

  // Los botones van ANTES del cuerpo: el cuerpo opaco les tapa la mitad de adentro y solo asoman los
  // 5 px que sobresalen del contorno. Es lo que pide el brief con "apenas insinuados", y ademas es lo
  // que hace un boton de verdad.
  const boton = (x, y, h) => {
    ruta(g, x, y, 9, h, 4.5)
    g.fillStyle = lineal(g, x, y, x + 9, y, [[0, '#2E323D'], [0.5, '#171A23'], [1, '#090B10']])
    g.fill()
  }
  boton(C.x - 5, C.y + 250, 58)    // silenciador
  boton(C.x - 5, C.y + 344, 104)   // volumen +
  boton(C.x - 5, C.y + 470, 104)   // volumen -
  boton(C.x + C.w - 4, C.y + 396, 152)  // encendido, del otro lado y mas largo

  // El cuerpo no es un negro plano: un plano de color liso girando en 3D no cambia nunca de valor y
  // por eso se lee chato. El degradado vertical le da arriba y abajo distintos.
  camino()
  g.fillStyle = lineal(g, C.x, C.y, C.x, C.y + C.h, [
    [0, '#171B25'], [0.16, P.negro], [0.70, '#07090E'], [1, '#111520'],
  ])
  g.fill()

  // brillo diagonal amplio sobre la cara, recortado al cuerpo
  g.save(); camino(); g.clip()
  g.fillStyle = lineal(g, C.x, C.y, C.x + C.w, C.y + C.h * 0.6, [
    [0, '#FFFFFF', 0.09], [0.32, '#FFFFFF', 0.02], [0.62, '#FFFFFF', 0], [1, '#FFFFFF', 0.045],
  ])
  g.fillRect(C.x, C.y, C.w, C.h)

  // EL REFLEJO DEL BORDE. Se traza sobre el mismo camino con el recorte todavia puesto, asi la mitad
  // de afuera del trazo se descarta y queda un filo interior parejo de 3 px. Dos zonas encendidas y no
  // una: un canto metalico real toma luz arriba a la izquierda y devuelve otra abajo a la derecha, y
  // con un solo brillo el objeto parece dibujado.
  camino()
  g.lineWidth = 6
  g.strokeStyle = lineal(g, C.x, C.y, C.x + C.w, C.y + C.h, [
    [0, '#FFFFFF', 0.55], [0.10, '#FFFFFF', 0.16], [0.30, '#FFFFFF', 0.03],
    [0.50, '#8FB6FF', 0.10], [0.72, '#FFFFFF', 0.38], [0.88, '#FFFFFF', 0.10], [1, '#FFFFFF', 0.03],
  ])
  g.stroke()
  g.restore()

  // El filo del vidrio. Se dibuja un anillo centrado 2 px por fuera del hueco y despues el hueco se
  // perfora: la mitad de adentro del anillo se va con la perforacion y sobrevive solo la de afuera,
  // que es exactamente el reborde que se ve entre el bisel y la pantalla.
  const anillo = 2
  ruta(g, PANTALLA.x - anillo, PANTALLA.y - anillo,
    PANTALLA.w + anillo * 2, PANTALLA.h + anillo * 2, PANTALLA.r + anillo)
  g.lineWidth = anillo * 2
  g.strokeStyle = rgba('#93A6CE', 0.28)
  g.stroke()

  // EL AGUJERO. Lo que hace reusable al chasis.
  g.save()
  g.globalCompositeOperation = 'destination-out'
  ruta(g, PANTALLA.x, PANTALLA.y, PANTALLA.w, PANTALLA.h, PANTALLA.r)
  g.fillStyle = '#000000'
  g.fill()
  g.restore()

  // La isla dinamica va DESPUES de perforar y es opaca: esta sobre la pantalla, no dentro del bisel,
  // asi que si se dibujara antes se la llevaria el agujero.
  const isW = 126, isH = 37
  const isX = CH_W / 2 - isW / 2, isY = PANTALLA.y + 17
  ruta(g, isX, isY, isW, isH, isH / 2)
  g.fillStyle = '#05060A'
  g.fill()
  // el lente: un disco apenas mas claro y descentrado, que es lo unico que la distingue de una mancha
  disco(g, isX + isW - 23, isY + isH / 2, 9.5)
  g.fillStyle = radial(g, isX + isW - 25, isY + isH / 2 - 3, 0, 11,
    [[0, '#2C3A5C'], [0.55, '#161C2C'], [1, '#080A10']])
  g.fill()
  disco(g, isX + isW - 26, isY + isH / 2 - 3, 2.6)
  g.fillStyle = rgba('#8FB6FF', 0.5)
  g.fill()

  return guardar('tel-chasis', cv)
}

// ================================================================================================
// 2. EL CANTO
// ================================================================================================
function canto() {
  const W = 20
  const [cv, g] = lienzoK(W, CH_H, K)
  const y0 = CUERPO.y, hh = CUERPO.h   // la MISMA banda que ocupa el cuerpo en el chasis

  // Degradado a lo ancho, no a lo largo: es la seccion de la losa vista de canto, y lo que la vuelve
  // cilindrica es que el centro tome luz y los dos filos se vayan a negro.
  g.fillStyle = lineal(g, 0, 0, W, 0, [
    [0, '#04050A'], [0.14, '#22262F'], [0.30, '#171A22'], [0.55, P.negro], [0.86, '#0A0C11'], [1, '#030408'],
  ])
  g.fillRect(0, y0, W, hh)

  // la linea de luz del filo delantero, corrida del centro para que no parezca un tubo simetrico
  g.fillStyle = lineal(g, 0, 0, W, 0, [
    [0, '#FFFFFF', 0], [0.15, '#FFFFFF', 0.20], [0.24, '#FFFFFF', 0.05], [0.4, '#FFFFFF', 0],
    [0.9, '#FFFFFF', 0], [0.97, '#FFFFFF', 0.07], [1, '#FFFFFF', 0],
  ])
  g.fillRect(0, y0, W, hh)

  // Los extremos se apagan a lo largo del radio de la esquina: ahi el frente ya esta curvando y un
  // canto que siguiera recto hasta la punta asomaria por fuera de la silueta como una espina.
  const caida = CUERPO.r + 20
  g.save()
  g.globalCompositeOperation = 'destination-out'
  g.fillStyle = lineal(g, 0, y0, 0, y0 + hh, [
    [0, '#000000', 1], [caida / hh, '#000000', 0],
    [1 - caida / hh, '#000000', 0], [1, '#000000', 1],
  ])
  g.fillRect(0, y0, W, hh)
  g.restore()

  return guardar('tel-canto', cv)
}

// ================================================================================================
// LAS CAPTURAS: andamio comun
// ================================================================================================
const S_W = 650, S_H = 1300
const MX = 52                 // margen lateral
const CW = S_W - MX * 2       // ancho util del contenido

function pantalla(fondo) {
  const [cv, g] = lienzoK(S_W, S_H, K)
  g.fillStyle = fondo || P.blanco
  g.fillRect(0, 0, S_W, S_H)
  return [cv, g]
}

// La barra de estado se dibuja con formas y una sola cadena de texto. Es lo que hace que la captura
// se lea como un TELEFONO y no como una pagina web recortada, y encima cae justo a los lados de la
// isla del chasis, que es donde el ojo espera encontrarla.
function barraEstado(g, color) {
  texto(g, '9:41', MX, 43, { tam: 26, familia: UI, peso: '600', color })
  g.save()
  let x = S_W - 178
  for (let i = 0; i < 4; i++) {
    const h = 8 + i * 4
    g.fillStyle = rgba(color, i === 3 ? 0.32 : 1)   // la ultima barrita apagada: senal a tres cuartos
    ruta(g, x, 38 - h, 6, h, 2); g.fill()
    x += 10
  }
  const cx = S_W - 114, cy = 38
  g.strokeStyle = color; g.lineCap = 'round'
  for (let i = 0; i < 3; i++) {
    g.lineWidth = 3.5
    g.beginPath(); g.arc(cx, cy, 4.5 + i * 7, Math.PI * 1.27, Math.PI * 1.73); g.stroke()
  }
  disco(g, cx, cy, 1.8); g.fillStyle = color; g.fill()
  ruta(g, S_W - 92, 25, 42, 22, 7); g.lineWidth = 2.5; g.strokeStyle = rgba(color, 0.45); g.stroke()
  ruta(g, S_W - 88, 29, 27, 14, 4); g.fillStyle = color; g.fill()
  ruta(g, S_W - 47, 32, 4, 8, 2); g.fillStyle = rgba(color, 0.45); g.fill()
  g.restore()
}

const indicador = (g, color) => {
  ruta(g, S_W / 2 - 70, 1268, 140, 6, 3)
  g.fillStyle = rgba(color || P.tinta, 0.28)
  g.fill()
}

// EL TITULO SE ACHICA HASTA ENTRAR. Un desborde en un PNG horneado no da error ni se ve hasta que
// alguien mira el video: la palabra sale cortada contra el borde y ya esta adentro de un render.
function titulo(g, lineas, x, y, maxW, tam, color) {
  let t = tam
  while (t > 20) {
    fuente(g, t, DISPLAY, '700')
    if (lineas.every(l => g.measureText(l).width <= maxW)) break
    t -= 1
  }
  const salto = Math.round(t * 1.14)
  lineas.forEach((l, i) => texto(g, l, x, y + i * salto,
    { tam: t, familia: DISPLAY, peso: '700', color: color || P.tinta }))
  return y + (lineas.length - 1) * salto
}

// Los parrafos son RECTANGULOS. El ancho de cada renglon varia poco arriba (0,90-1,00 del ancho util,
// como un texto justificado) y el ultimo queda corto, que es la firma visual de un parrafo: sin eso
// el bloque se lee como una tabla.
function parrafo(g, x, y, w, n, o) {
  o = o || {}
  const alto = o.alto || 15, salto = o.salto || 29, r = o.r || 4
  const rnd = azar(o.semilla)
  g.fillStyle = o.color || '#DBDEE7'
  for (let i = 0; i < n; i++) {
    const ancho = i === n - 1 ? w * (0.32 + rnd() * 0.34) : w * (0.90 + rnd() * 0.10)
    ruta(g, x, y + i * salto, ancho, alto, r); g.fill()
  }
  return y + (n - 1) * salto + alto
}

const linea = (g, y, alfa) => {
  g.fillStyle = rgba(P.tinta, alfa === undefined ? 0.09 : alfa)
  g.fillRect(MX, y, CW, 1.5)
}

// ================================================================================================
// 3. LOS CUATRO ARTICULOS
//
// Cuatro DENSIDADES distintas y no cuatro veces lo mismo con otra semilla: en el anillo se ven varias
// a la vez y de costado, y a esa distancia lo unico que distingue una pantalla de otra es la mancha
// —donde hay tinta y donde hay aire—, no el contenido.
// ================================================================================================
function articulo(n) {
  const [cv, g] = pantalla()
  barraEstado(g, P.tinta)

  // barra de navegacion: la flecha de volver y los tres puntos. Dos gestos, cero texto.
  g.save()
  g.strokeStyle = rgba(P.tinta, 0.75); g.lineWidth = 3.4; g.lineCap = 'round'; g.lineJoin = 'round'
  g.beginPath(); g.moveTo(MX + 13, 96); g.lineTo(MX, 108); g.lineTo(MX + 13, 120); g.stroke()
  g.restore()
  for (let i = 0; i < 3; i++) {
    disco(g, S_W - MX - 22 + i * 11, 108, 2.8); g.fillStyle = rgba(P.tinta, 0.6); g.fill()
  }

  let y = 168
  const gris = '#DBDEE7'

  if (n === 1) {
    // UNA: imagen arriba. La mas aireada de las cuatro.
    ruta(g, MX, y, CW, 296, 30)
    g.fillStyle = lineal(g, MX, y, MX + CW, y + 296, [[0, P.azul], [0.55, P.violeta], [1, P.violetaHondo]])
    g.fill()
    g.save(); ruta(g, MX, y, CW, 296, 30); g.clip()
    g.fillStyle = radial(g, MX + CW * 0.28, y + 60, 0, 300,
      [[0, '#FFFFFF', 0.34], [0.5, '#FFFFFF', 0.08], [1, '#FFFFFF', 0]])
    g.fillRect(MX, y, CW, 296)
    g.fillStyle = radial(g, MX + CW * 0.9, y + 300, 0, 240,
      [[0, P.cian, 0.42], [1, P.cian, 0]])
    g.fillRect(MX, y, CW, 296)
    g.restore()
    y += 296 + 46

    y = titulo(g, ['El equipo que lee', 'por vos'], MX, y, CW, 44) + 34
    texto(g, 'Producto · 6 min de lectura', MX, y, { tam: 21, familia: UI, color: P.gris })
    y += 34
    linea(g, y); y += 40
    y = parrafo(g, MX, y, CW, 5, { semilla: 1101 }) + 40
    y = parrafo(g, MX, y, CW, 6, { semilla: 1102 }) + 40
    parrafo(g, MX, y, CW, 4, { semilla: 1103 })

  } else if (n === 2) {
    // DOS: la densa. Sin imagen y con el interlineado mas cerrado, para que la mancha sea casi pareja.
    y = titulo(g, ['Notas que se', 'ordenan solas'], MX, y + 16, CW, 44) + 32
    texto(g, 'Ingeniería · 11 min de lectura', MX, y, { tam: 21, familia: UI, color: P.gris })
    y += 32
    linea(g, y); y += 38
    const paso = { alto: 14, salto: 26, semilla: 0 }
    for (const [i, n2] of [8, 7, 9, 6, 7].entries()) {
      y = parrafo(g, MX, y, CW, n2, { ...paso, semilla: 2200 + i }) + 32
      if (y > 1180) break
    }

  } else if (n === 3) {
    // TRES: con subtitulos. Los ladrillos oscuros y cortos cada tantos renglones son lo que se ve de
    // lejos; el resto del bloque es el mismo gris que en las otras.
    y = titulo(g, ['La reunión que', 'no hace falta'], MX, y + 16, CW, 44) + 32
    texto(g, 'Método · 8 min de lectura', MX, y, { tam: 21, familia: UI, color: P.gris })
    y += 32
    linea(g, y); y += 40
    y = parrafo(g, MX, y, CW, 5, { semilla: 3301 }) + 46
    const subtitulo = (yy, f) => {
      ruta(g, MX, yy, CW * f, 21, 5); g.fillStyle = rgba(P.tinta, 0.78); g.fill()
      return yy + 21 + 26
    }
    y = subtitulo(y, 0.52)
    y = parrafo(g, MX, y, CW, 6, { semilla: 3302 }) + 46
    y = subtitulo(y, 0.40)
    y = parrafo(g, MX, y, CW, 5, { semilla: 3303 }) + 46
    y = subtitulo(y, 0.60)
    parrafo(g, MX, y, CW, 4, { semilla: 3304 })

  } else {
    // CUATRO: con listas y una cita. La mas irregular: sangrias, viñetas y una barra de color.
    y = titulo(g, ['Todo lo que cambia', 'en la versión 2'], MX, y + 16, CW, 44) + 32
    texto(g, 'Novedades · 4 min de lectura', MX, y, { tam: 21, familia: UI, color: P.gris })
    y += 32
    linea(g, y); y += 40
    y = parrafo(g, MX, y, CW, 4, { semilla: 4401 }) + 44

    const rnd = azar(4402)
    for (let i = 0; i < 5; i++) {
      disco(g, MX + 7, y + 7, 5.5); g.fillStyle = P.azul; g.fill()
      ruta(g, MX + 30, y, (CW - 30) * (0.55 + rnd() * 0.42), 14, 4)
      g.fillStyle = gris; g.fill()
      y += 34
    }
    y += 30

    // la cita: barra de acento a la izquierda y el texto sangrado
    ruta(g, MX, y, 5, 96, 2.5)
    g.fillStyle = lineal(g, MX, y, MX, y + 96, [[0, P.azul], [1, P.violeta]])
    g.fill()
    parrafo(g, MX + 28, y + 6, CW - 28, 3, { semilla: 4403, alto: 16, salto: 32, color: '#C6CAD6' })
    y += 96 + 44

    y = parrafo(g, MX, y, CW, 5, { semilla: 4404 }) + 40
    y = parrafo(g, MX, y, CW, 3, { semilla: 4405 }) + 40
    parrafo(g, MX, y, CW, 3, { semilla: 4406 })
  }

  indicador(g)
  return guardar(`tel-articulo-${n}`, cv)
}

// ================================================================================================
// 4. EL ARTICULO CON FOTO — la foto se DIBUJA, no se baja
// ================================================================================================
//
// Un atardecer es el paisaje mas barato de fabricar y el mas facil de reconocer en miniatura: casi
// toda la informacion esta en el degradado del cielo y en dos o tres siluetas apiladas. Las crestas
// salen de una suma de tres senos con las fases sorteadas por `azar`, que da un perfil irregular pero
// continuo; una linea quebrada al azar da picos de sierra, que no es lo que hace una montaña.
function cresta(g, x, y0, w, base, alt, semilla, color, alfa) {
  const rnd = azar(semilla)
  const ondas = [[1.0, 0.55], [2.3, 0.28], [4.9, 0.17]].map(([k, a]) => ({ k, a, fase: rnd() * Math.PI * 2 }))
  g.beginPath()
  g.moveTo(x, base + 500)
  for (let i = 0; i <= 120; i++) {
    const t = i / 120
    let v = 0
    for (const o of ondas) v += Math.sin(t * Math.PI * 2 * o.k + o.fase) * o.a
    // las amplitudes suman 1, asi que v cae en [-1,1] y la altura nunca se va abajo de la base
    g.lineTo(x + t * w, base - alt * (0.55 + v * 0.45))
  }
  g.lineTo(x + w, base + 500)
  g.closePath()
  g.fillStyle = rgba(color, alfa)
  g.fill()
  void y0
}

function fotoPaisaje(g, x, y, w, h, semilla) {
  g.save()
  g.beginPath(); g.rect(x, y, w, h); g.clip()

  g.fillStyle = lineal(g, x, y, x, y + h, [
    [0, '#2A2456'], [0.20, '#553B7C'], [0.40, '#A8567E'], [0.58, '#E07C4C'],
    [0.74, '#F5A954'], [0.88, '#FBCD8A'], [1, '#FADFB2'],
  ])
  g.fillRect(x, y, w, h)

  const sx = x + w * 0.64, sy = y + h * 0.70
  g.fillStyle = radial(g, sx, sy, 0, 200,
    [[0, '#FFE6AE', 0.80], [0.22, '#FFC46A', 0.42], [0.55, '#F79A55', 0.15], [1, '#F79A55', 0]])
  disco(g, sx, sy, 200); g.fill()
  disco(g, sx, sy, 31); g.fillStyle = '#FFF6D8'; g.fill()

  // Cuatro capas. Las lejanas van MAS transparentes: la bruma del aire se come el contraste con la
  // distancia, y esa diferencia de opacidad es lo unico que da profundidad en una silueta plana.
  cresta(g, x, y, w, y + h * 0.80, 78, semilla + 1, '#8A5F86', 0.42)
  cresta(g, x, y, w, y + h * 0.87, 96, semilla + 2, '#5E3C6B', 0.66)
  cresta(g, x, y, w, y + h * 0.95, 118, semilla + 3, '#3A2450', 0.86)
  cresta(g, x, y, w, y + h * 1.06, 140, semilla + 4, '#221530', 1)

  // la bruma tibia pegada al horizonte, que junta las capas
  g.fillStyle = lineal(g, x, y + h * 0.62, x, y + h * 0.92,
    [[0, '#FFC98A', 0], [0.55, '#FFD9A6', 0.26], [1, '#FFD9A6', 0]])
  g.fillRect(x, y + h * 0.62, w, h * 0.32)

  // viñeta suave en las esquinas de arriba, para que la barra de estado blanca tenga donde apoyarse
  g.fillStyle = lineal(g, x, y, x, y + 150, [[0, '#1A1236', 0.42], [1, '#1A1236', 0]])
  g.fillRect(x, y, w, 150)
  g.restore()
}

function articuloFoto() {
  const [cv, g] = pantalla()
  const FOTO_H = 470
  fotoPaisaje(g, 0, 0, S_W, FOTO_H, 7700)   // a sangre: el chasis ya le redondea las esquinas de arriba
  barraEstado(g, P.blanco)

  g.save()
  g.strokeStyle = rgba(P.blanco, 0.9); g.lineWidth = 3.4; g.lineCap = 'round'; g.lineJoin = 'round'
  g.beginPath(); g.moveTo(MX + 13, 96); g.lineTo(MX, 108); g.lineTo(MX + 13, 120); g.stroke()
  g.restore()

  let y = FOTO_H + 54
  texto(g, 'CRÓNICA', MX, y, { tam: 18, familia: UI, peso: '700', color: P.azul, espaciado: 2.4 })
  y += 40
  y = titulo(g, ['Un lugar para', 'pensar mejor'], MX, y, CW, 44) + 34
  texto(g, 'Sábado · 9 min de lectura', MX, y, { tam: 21, familia: UI, color: P.gris })
  y += 32
  linea(g, y); y += 40
  y = parrafo(g, MX, y, CW, 6, { semilla: 7701 }) + 40
  y = parrafo(g, MX, y, CW, 6, { semilla: 7702 }) + 40
  parrafo(g, MX, y, CW, 4, { semilla: 7703 })

  indicador(g)
  return guardar('tel-articulo-foto', cv)
}

// ================================================================================================
// 5. EL CHAT
// ================================================================================================
function burbuja(g, y, lado, anchos) {
  const CONT = 400, padX = 26, padY = 22, alto = 14, salto = 26
  const w = Math.round(CONT * Math.max(...anchos)) + padX * 2
  const h = (anchos.length - 1) * salto + alto + padY * 2
  const x = lado === 'der' ? S_W - 44 - w : 44
  const r = 28, cola = 9
  ruta4(g, x, y, w, h, lado === 'der' ? [r, r, cola, r] : [r, r, r, cola])
  g.fillStyle = lado === 'der'
    ? lineal(g, x, y, x + w, y + h, [[0, P.violetaHondo], [1, '#6E4BF5']])
    : '#EDEDF4'
  g.fill()
  const tinta = lado === 'der' ? rgba(P.blanco, 0.62) : rgba(P.tinta, 0.20)
  for (let i = 0; i < anchos.length; i++) {
    ruta(g, x + padX, y + padY + i * salto, Math.round(CONT * anchos[i]), alto, 4)
    g.fillStyle = tinta
    g.fill()
  }
  return y + h + 18
}

function chat() {
  // el fondo del chat NO es blanco puro: si lo fuera, las burbujas grises no se despegarian
  const [cv, g] = pantalla('#F7F7FC')

  g.fillStyle = P.blanco
  g.fillRect(0, 0, S_W, 170)
  g.fillStyle = rgba(P.tinta, 0.10)
  g.fillRect(0, 170, S_W, 1.5)
  barraEstado(g, P.tinta)

  g.save()
  g.strokeStyle = rgba(P.tinta, 0.7); g.lineWidth = 3.4; g.lineCap = 'round'; g.lineJoin = 'round'
  g.beginPath(); g.moveTo(46, 110); g.lineTo(33, 123); g.lineTo(46, 136); g.stroke()
  g.restore()

  disco(g, 100, 123, 28)
  g.fillStyle = lineal(g, 72, 95, 128, 151, [[0, P.azul], [1, P.violetaHondo]])
  g.fill()
  texto(g, 'AR', 100, 123, {
    tam: 22, familia: DISPLAY, peso: '700', color: P.blanco, alinear: 'center', base: 'middle',
  })

  texto(g, 'Ana Ruiz', 142, 117, { tam: 27, familia: UI, peso: '600', color: P.tinta })
  disco(g, 149, 140, 5); g.fillStyle = P.cian; g.fill()
  texto(g, 'en línea', 162, 148, { tam: 20, familia: UI, color: P.gris })

  // la pastilla del dia, centrada
  const pw = 84
  ruta(g, S_W / 2 - pw / 2, 198, pw, 34, 17); g.fillStyle = '#E8E8F0'; g.fill()
  texto(g, 'Hoy', S_W / 2, 215, {
    tam: 19, familia: UI, peso: '600', color: P.gris, alinear: 'center', base: 'middle',
  })

  // La conversacion arranca a la izquierda y termina a la derecha: en el anillo se ve un rato corto y
  // lo ultimo que queda en el ojo tiene que ser el bloque violeta, que es el color de la pieza.
  //
  // Y SON OCHO BURBUJAS, NO SEIS, porque un chat se llena DESDE ABAJO. Con seis la pila terminaba a
  // 260 px del campo de escritura y quedaba un hueco en el medio de la pantalla que ninguna aplicacion
  // de mensajes tiene: los mensajes nuevos empujan hacia arriba y el ultimo queda pegado al campo.
  let y = 252
  y = burbuja(g, y, 'izq', [0.68, 0.92, 0.41])
  y = burbuja(g, y, 'der', [0.76, 0.48])
  y = burbuja(g, y, 'izq', [0.55])
  y = burbuja(g, y, 'izq', [0.88, 0.72, 0.95, 0.36])
  y = burbuja(g, y, 'der', [0.90, 0.83, 0.52])
  y = burbuja(g, y, 'izq', [0.62, 0.44])
  y = burbuja(g, y, 'der', [0.95, 0.70, 0.88, 0.41])
  burbuja(g, y, 'der', [0.44])

  // el campo de escritura
  const bx = 44, by = 1182, bh = 64
  const sr = 32, scx = S_W - 44 - sr, scy = by + bh / 2
  const pill = () => ruta(g, bx, by, scx - sr - 16 - bx, bh, bh / 2)
  pill(); g.fillStyle = '#EEEEF6'; g.fill()
  pill(); g.lineWidth = 1.5; g.strokeStyle = rgba(P.tinta, 0.07); g.stroke()
  ruta(g, bx + 30, by + 25, 196, 14, 4); g.fillStyle = rgba(P.tinta, 0.17); g.fill()

  // El boton de enviar lleva sombra corta. Los numeros son nativos (ver la nota del chasis): 26 de
  // desenfoque son 13 logicos, asi que la caida muere unos 45 px debajo del boton, en y=1291, adentro
  // de los 1300 del lienzo. Con una sombra mas larga el borde de abajo la cortaria en seco.
  sombra(g, () => disco(g, scx, scy, sr), { color: '#3A2BA0', alfa: 0.5, desenfoque: 26, bajada: 12 })
  disco(g, scx, scy, sr)
  g.fillStyle = lineal(g, scx - sr, scy - sr, scx + sr, scy + sr, [[0, P.azul], [1, P.violetaHondo]])
  g.fill()
  g.beginPath()
  g.moveTo(scx - 9, scy - 12); g.lineTo(scx + 12, scy); g.lineTo(scx - 9, scy + 12)
  g.closePath()
  g.fillStyle = P.blanco
  g.fill()

  indicador(g)
  return guardar('tel-chat', cv)
}

// ================================================================================================
// 6. EL REPRODUCTOR
// ================================================================================================
//
// El desenfoque NO se hace con `g.filter`: existe la propiedad, pero un fondo fuera de foco de verdad
// no es una imagen nitida borroneada, son manchas de luz. Se dibuja directo con degradados radiales,
// que es literalmente la forma de un circulo de confusion, y sale mas creible y sin depender de que
// Skia soporte el filtro.
function imagenPersona(g, x, y, w, h, semilla) {
  g.save()
  g.beginPath(); g.rect(x, y, w, h); g.clip()

  g.fillStyle = lineal(g, x, y, x + w, y + h,
    [[0, '#7C5539'], [0.42, '#4B3229'], [1, '#241A1B']])
  g.fillRect(x, y, w, h)

  // LA VENTANA ES UNA MANCHA, NO UN RECTANGULO. Estaba dibujada como un rect con degradado solo
  // horizontal: se apagaba a los costados pero abajo terminaba en un canto recto, y esa linea cruzando
  // el fondo se leia como el borde de una mesa. Un disco estirado no tiene canto en ninguna direccion.
  g.save()
  g.translate(x + w * 0.20, y + h * 0.36); g.scale(1, 2.0)
  g.fillStyle = radial(g, 0, 0, 0, 165,
    [[0, '#FFE2B4', 0.34], [0.45, '#FFCE90', 0.15], [1, '#FFCE90', 0]])
  disco(g, 0, 0, 165); g.fill()
  g.restore()

  const rnd = azar(semilla)
  for (let i = 0; i < 16; i++) {
    const bx = x + rnd() * w, by = y + rnd() * h * 0.86, br = 14 + rnd() * 52
    g.fillStyle = radial(g, bx, by, 0, br,
      [[0, '#FFDBA6', 0.30], [0.5, '#FFC077', 0.13], [1, '#FFB05A', 0]])
    disco(g, bx, by, br); g.fill()
  }

  // LA SILUETA, EN UN SOLO CAMINO.
  //
  // Antes eran tres figuras dibujadas por separado, y el borde de luz se hacia con una copia corrida
  // abajo de cada una. Salio mal por dos motivos que solo se ven al mirar el PNG grande: cada figura
  // traia su propio contorno, asi que quedaba la costura del cuello marcada sobre el hombro; y el
  // contorno daba la vuelta entera, que es exactamente lo que la luz no hace. Parecia un alfil.
  //
  // Ahora las tres partes son SUBCAMINOS de un mismo `beginPath` —todas en el mismo sentido, para que
  // la regla de relleno las una en vez de agujerearlas— y el borde se pinta al final recortando contra
  // esa silueta unica. `ellipse` arranca en el angulo 0, asi que antes de cada una va un `moveTo` a ese
  // punto: sin eso el camino abierto se conecta con una recta y aparece una cuña.
  const cx = x + w * 0.66, hy = y + h * 0.38
  const sil = () => {
    g.beginPath()
    g.moveTo(cx + 58, hy); g.ellipse(cx, hy, 58, 68, 0, 0, Math.PI * 2); g.closePath()
    g.moveTo(cx - 30, hy + 38); g.lineTo(cx + 30, hy + 38)
    g.lineTo(cx + 40, hy + 134); g.lineTo(cx - 40, hy + 134); g.closePath()
    g.moveTo(cx + 215, hy + 262); g.ellipse(cx, hy + 262, 215, 168, 0, 0, Math.PI * 2); g.closePath()
  }
  // LA LUZ DE BORDE: la MISMA silueta corrida hacia la luz, pintada clara, y encima la silueta real.
  // Lo que asoma del corrimiento es una medialuna pegada al contorno de arriba a la izquierda, que es
  // justo lo que hace una luz de recorte.
  //
  // Se probaron las otras dos formas y las dos fallan, cada una a su manera:
  //   · franjas con degradado recortadas contra la silueta -> la luz del cuello se corta en seco a
  //     media altura, en una horizontal que no es borde de nada;
  //   · trazar el arco del contorno con el recorte puesto -> donde una parte tapa a otra (el cuello
  //     sobre el hombro) la mitad de afuera del trazo NO cae fuera del recorte, y aparece una banda
  //     encendida cruzando el medio de la figura.
  // El corrimiento no tiene ninguno de los dos problemas porque no conoce las partes: opera sobre la
  // silueta ya unida. Por eso importa que `sil()` sea un solo camino — con figuras sueltas cada una
  // traeria su propio contorno y volveria la costura del cuello.
  // El corrimiento es de 5 px y el degradado se apaga a poco mas de la mitad del recorrido: con la
  // caida larga la medialuna llegaba viva hasta el hombro derecho y ahi deja de leerse como luz y pasa
  // a leerse como el contorno de una calcomania. La luz viene de una sola ventana, arriba a la
  // izquierda; del otro lado no tiene por que haber nada.
  g.save(); g.translate(-5, -4); sil()
  g.fillStyle = lineal(g, cx - 215, hy - 68, cx + 70, hy + 330,
    [[0, '#FFE0B4', 0.85], [0.26, '#FFC58C', 0.44], [0.55, '#E9A473', 0.09], [0.8, '#E9A473', 0]])
  g.fill(); g.restore()

  sil()
  g.fillStyle = lineal(g, 0, y + h * 0.18, 0, y + h, [[0, '#31212A'], [1, '#0D0910']])
  g.fill()

  // viñeta: cierra los cuatro bordes y empuja el ojo al centro
  g.fillStyle = radial(g, x + w / 2, y + h * 0.45, h * 0.35, h * 0.95,
    [[0, '#000000', 0], [1, '#000000', 0.45]])
  g.fillRect(x, y, w, h)
  g.restore()
}

function video() {
  const [cv, g] = pantalla()
  const IMG_H = 470
  imagenPersona(g, 0, 0, S_W, IMG_H, 4021)
  barraEstado(g, P.blanco)

  // El disco de reproducir va al centro del cuadro, que es donde va siempre, y por eso la persona esta
  // corrida a la derecha: con los dos en el medio el disco caia justo sobre la cara y tapaba lo unico
  // que hace que la mancha se lea como alguien hablando.
  const px = S_W / 2, py = IMG_H * 0.50
  disco(g, px, py, 44); g.fillStyle = rgba('#0B0D12', 0.34); g.fill()
  disco(g, px, py, 44); g.lineWidth = 2; g.strokeStyle = rgba(P.blanco, 0.5); g.stroke()
  g.beginPath()
  g.moveTo(px - 12, py - 16); g.lineTo(px + 17, py); g.lineTo(px - 12, py + 16)
  g.closePath()
  g.fillStyle = P.blanco
  g.fill()

  // la barra de progreso
  const by = IMG_H + 34, av = 0.38
  ruta(g, MX, by, CW, 6, 3); g.fillStyle = rgba(P.tinta, 0.12); g.fill()
  ruta(g, MX, by, CW * av, 6, 3)
  g.fillStyle = lineal(g, MX, by, MX + CW * av, by, [[0, P.azul], [1, P.cian]])
  g.fill()
  disco(g, MX + CW * av, by + 3, 11); g.fillStyle = P.blanco; g.fill()
  disco(g, MX + CW * av, by + 3, 7.5); g.fillStyle = P.azul; g.fill()
  texto(g, '1:12', MX, by + 44, { tam: 20, familia: UI, color: P.gris })
  texto(g, '3:09', MX + CW, by + 44, { tam: 20, familia: UI, color: P.gris, alinear: 'right' })

  let y = by + 100
  y = titulo(g, ['Cómo grabamos', 'la demo en un día'], MX, y, CW, 36) + 40

  // la fila del canal: avatar, nombre y el boton de seguir
  disco(g, MX + 22, y - 4, 22)
  g.fillStyle = lineal(g, MX, y - 26, MX + 44, y + 18, [[0, P.violeta], [1, P.azul]])
  g.fill()
  texto(g, 'Estudio Nova', MX + 58, y + 2, { tam: 23, familia: UI, peso: '600', color: P.tinta })
  texto(g, '12,4 mil reproducciones · hace 2 días', MX, y + 44, { tam: 20, familia: UI, color: P.gris })
  const sw = 118
  ruta(g, S_W - MX - sw, y - 22, sw, 40, 20)
  g.fillStyle = P.tinta
  g.fill()
  texto(g, 'Seguir', S_W - MX - sw / 2, y - 2, {
    tam: 20, familia: UI, peso: '600', color: P.blanco, alinear: 'center', base: 'middle',
  })

  // La fila de pastillas no es decoracion: sin ella el tercio de abajo quedaba vacio y la pantalla se
  // leia como un articulo con una foto arriba, no como un reproductor.
  y += 84
  let cx0 = MX
  for (const [etiqueta, ancho] of [['Me gusta', 134], ['Compartir', 142], ['Guardar', 124]]) {
    ruta(g, cx0, y, ancho, 44, 22); g.fillStyle = '#F1F2F7'; g.fill()
    texto(g, etiqueta, cx0 + ancho / 2, y + 22, {
      tam: 19, familia: UI, peso: '600', color: P.tinta2, alinear: 'center', base: 'middle',
    })
    cx0 += ancho + 16
  }

  y += 78
  linea(g, y); y += 46
  texto(g, 'A continuación', MX, y, { tam: 23, familia: UI, peso: '600', color: P.tinta })
  y += 42

  // las dos filas. Miniaturas con los dos degradados de la pieza: azul->violeta y azul->cian.
  const fila = (yy, paradas, semilla) => {
    const tw = 152, th = 88
    ruta(g, MX, yy, tw, th, 16)
    g.fillStyle = lineal(g, MX, yy, MX + tw, yy + th, paradas)
    g.fill()
    g.save(); ruta(g, MX, yy, tw, th, 16); g.clip()
    g.fillStyle = radial(g, MX + tw * 0.25, yy + th * 0.15, 0, tw,
      [[0, '#FFFFFF', 0.30], [1, '#FFFFFF', 0]])
    g.fillRect(MX, yy, tw, th)
    g.restore()
    g.beginPath()
    g.moveTo(MX + tw / 2 - 9, yy + th / 2 - 11)
    g.lineTo(MX + tw / 2 + 12, yy + th / 2)
    g.lineTo(MX + tw / 2 - 9, yy + th / 2 + 11)
    g.closePath()
    g.fillStyle = rgba(P.blanco, 0.85)
    g.fill()
    const tx = MX + tw + 24, tW = S_W - MX - tx
    parrafo(g, tx, yy + 6, tW, 2, { semilla, alto: 15, salto: 27, color: '#D3D7E1' })
    ruta(g, tx, yy + 66, tW * 0.44, 12, 4); g.fillStyle = '#E3E6EE'; g.fill()
  }
  fila(y, [[0, P.azul], [1, P.violetaHondo]], 5501)
  fila(y + 130, [[0, P.azul], [1, P.cian]], 5502)

  indicador(g)
  return guardar('tel-video', cv)
}

// ================================================================================================
const salida = [
  chasis(),
  canto(),
  articulo(1), articulo(2), articulo(3), articulo(4),
  articuloFoto(),
  chat(),
  video(),
]
informe('telefono', salida)
