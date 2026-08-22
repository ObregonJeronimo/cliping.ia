// LAS TARJETAS DE CONTENIDO DE LA PIEZA-K.
//
// En la pieza estas cuatro tarjetas se abren hacia las esquinas y pasan de largo la camara. Eso obliga
// a tres cosas que estan escritas en la geometria de abajo y no son negociables:
//
//   1. LAS CUATRO COMPARTEN GEOMETRIA EXACTA (mismo lienzo, mismo k, mismas coordenadas de miniatura,
//      titulo, bandera y fecha). No son cuatro estados de una tarjeta —eso serian dos PNG cruzados en
//      opacidad— son cuatro CONTENIDOS intercambiables en la misma ranura. Si una tuviera el pie tres
//      pixeles mas abajo, al abrirse en abanico se veria el salto.
//   2. LA BANDERA ES DISTINTA EN CADA UNA, y con ella el idioma del titulo. El gesto de la pieza es
//      "el mismo video, cuatro idiomas": cuatro banderas iguales convierten la apertura en decoracion.
//   3. LA SOMBRA NO VA ADENTRO DE LA TARJETA. Sale como PNG aparte, ya desenfocada, porque el motor no
//      puede desenfocar una capa y porque una tarjeta que gira necesita que su sombra se mueva distinto.
//
// La miniatura es una IMAGEN SINTETICA dibujada acá: no hay fotos que licenciar ni que cargar, y ademas
// asi el color de cada miniatura queda dentro de la paleta de la pieza en vez de pelearse con ella.
//
// USO
//   node tools/ae/recursos-k/tarjetas.mjs

import {
  P, DISPLAY, UI, lienzoK, guardar, rgba, ruta, texto, fuente,
  lineal, radial, sombra, margenDe, azar, informe,
} from './lib.mjs'

// ---------------------------------------------------------------- geometria compartida
// Todo en coordenadas LOGICAS. El lienzo real es k veces mas grande (lienzoK ya aplica el scale), asi
// que estos numeros son los mismos con los que la tarjeta se dibuja en pantalla.
const W = 600, H = 450, K = 2
const PAD = 16
const MX = PAD, MY = PAD, MW = W - PAD * 2, MH = 300   // 300/450 = exactamente los 2/3 de la tarjeta
const RADIO = 30, RADIO_MINI = 20
const BORDE = 2

// ---------------------------------------------------------------- utiles locales
// Poligono en coordenadas normalizadas (0..1) sobre una caja. Las crestas de la montaña se escriben a
// mano y no con ruido: un perfil sorteado da picos parejos, que es justo lo que no parece una montaña.
function poli (g, x, y, w, h, pts) {
  g.beginPath()
  pts.forEach(([a, b], i) => {
    const px = x + a * w, py = y + b * h
    if (i === 0) g.moveTo(px, py); else g.lineTo(px, py)
  })
  g.closePath()
}

const disco = (g, cx, cy, r) => { g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.closePath() }

// ================================================================ LAS CUATRO MINIATURAS
//
// Cada una recibe la caja ya recortada por el llamador. Ninguna hace save/restore del recorte: eso lo
// maneja `miniatura()`, para que agregar una quinta escena no obligue a acordarse del par.

// --- 1. paisaje de montaña -------------------------------------------------------------------------
// Amanecer a contraluz: el sol bajo justifica que las crestas salgan planas y oscuras, que es lo unico
// que hace legible una montaña dibujada con cuatro poligonos.
function montana (g, x, y, w, h) {
  g.fillStyle = lineal(g, x, y, x, y + h, [
    [0, '#4B3AD6'], [0.30, P.azul], [0.58, P.cian], [0.82, P.cianClaro], [1, '#F2FBFF'],
  ])
  g.fillRect(x, y, w, h)

  g.fillStyle = radial(g, x + w * 0.70, y + h * 0.50, 0, h * 0.62, [
    [0, '#FFFFFF', 0.95], [0.28, '#FFF4CE', 0.55], [1, '#FFF4CE', 0],
  ])
  g.fillRect(x, y, w, h)

  // tres crestas de atras hacia adelante. La niebla entre una y otra es lo que da la profundidad: sin
  // ella los tres poligonos se leen como un solo recorte de cartulina.
  const capas = [
    { c: rgba(P.violeta, 0.34), base: 0.60, p: [[0, 0.62], [0.12, 0.44], [0.23, 0.56], [0.37, 0.33], [0.50, 0.51], [0.63, 0.40], [0.78, 0.57], [0.90, 0.47], [1, 0.59], [1, 1], [0, 1]] },
    { c: rgba(P.violetaHondo, 0.55), base: 0.70, p: [[0, 0.73], [0.16, 0.58], [0.30, 0.69], [0.45, 0.50], [0.58, 0.64], [0.72, 0.54], [0.87, 0.67], [1, 0.61], [1, 1], [0, 1]] },
    { c: rgba('#241E52', 0.92), base: 0.82, p: [[0, 0.87], [0.10, 0.80], [0.28, 0.61], [0.43, 0.79], [0.56, 0.70], [0.69, 0.85], [0.85, 0.76], [1, 0.89], [1, 1], [0, 1]] },
  ]
  capas.forEach((capa, i) => {
    poli(g, x, y, w, h, capa.p); g.fillStyle = capa.c; g.fill()
    // La niebla va SOLO entre cresta y cresta, nunca delante de la ultima: la mas cercana no tiene aire
    // por delante que la empañe. Y la banda ABRE Y CIERRA en transparente —no arranca opaca arriba—
    // porque una franja que empieza de golpe deja un filo horizontal cruzando el cielo. La primera
    // version tenia las dos cosas mal y se veian tres costuras rectas atravesando la miniatura.
    if (i === capas.length - 1) return
    const alto = h * 0.20, arriba = y + h * capa.base - alto * 0.35
    g.fillStyle = lineal(g, x, arriba, x, arriba + alto, [
      [0, '#FFFFFF', 0], [0.4, '#FFFFFF', 0.40], [1, '#FFFFFF', 0],
    ])
    g.fillRect(x, arriba, w, alto)
  })

  // el pico nevado va sobre la cresta de adelante (x=0.28), que es la unica que tiene contraste
  // suficiente abajo como para que el blanco se lea.
  poli(g, x, y, w, h, [[0.28, 0.61], [0.355, 0.705], [0.325, 0.685], [0.30, 0.72], [0.275, 0.685], [0.245, 0.715], [0.215, 0.695]])
  g.fillStyle = rgba('#FFFFFF', 0.80); g.fill()
}

// --- 2. interior calido ----------------------------------------------------------------------------
// Los calidos de esta escena (crema, ambar, madera) NO estan en la paleta de la pieza a proposito: son
// el contenido de una foto, no cromo de interfaz. Meterlos en P los volveria disponibles para botones.
function interior (g, x, y, w, h) {
  const CREMA = '#FBF1E0', PARED = '#EFDCBE', MADERA = '#C08549', MADERA2 = '#8E5A2E'
  const LUZ = '#FFE9BC', HUMO = '#7A5233'
  const suelo = y + h * 0.66

  g.fillStyle = lineal(g, x, y, x, suelo, [[0, CREMA], [1, PARED]])
  g.fillRect(x, y, w, h)
  g.fillStyle = lineal(g, x, suelo, x, y + h, [[0, MADERA], [1, MADERA2]])
  g.fillRect(x, suelo, w, y + h - suelo)

  // el derrame de luz se dibuja ANTES que la ventana: asi el marco queda por encima y el haz parece
  // salir de atras del vidrio en vez de estar apoyado sobre el.
  const vx = x + w * 0.09, vy = y + h * 0.13, vw = w * 0.30, vh = h * 0.40
  g.beginPath()
  g.moveTo(vx, suelo); g.lineTo(vx + vw, suelo)
  g.lineTo(vx + vw + w * 0.34, y + h); g.lineTo(vx - w * 0.05, y + h)
  g.closePath()
  g.fillStyle = rgba(LUZ, 0.45); g.fill()

  ruta(g, vx, vy, vw, vh, 10)
  g.fillStyle = lineal(g, vx, vy, vx + vw, vy + vh, [[0, '#FFFFFF'], [1, LUZ]])
  g.fill()
  g.strokeStyle = rgba(HUMO, 0.55); g.lineWidth = 4; g.stroke()
  g.beginPath()
  g.moveTo(vx + vw / 2, vy); g.lineTo(vx + vw / 2, vy + vh)
  g.moveTo(vx, vy + vh * 0.5); g.lineTo(vx + vw, vy + vh * 0.5)
  g.lineWidth = 3; g.stroke()

  // planta: maceta mas tres hojas giradas. Rompe la horizontal del suelo, que sin nada encima se lee
  // como una franja de color y no como una habitacion.
  const px = x + w * 0.76, py = suelo + h * 0.06
  for (const [ang, largo] of [[-0.75, 0.30], [-0.10, 0.36], [0.62, 0.28]]) {
    g.save(); g.translate(px, py); g.rotate(ang)
    g.beginPath(); g.ellipse(0, -h * largo * 0.5, w * 0.035, h * largo * 0.5, 0, 0, Math.PI * 2)
    g.fillStyle = rgba('#3F5B33', 0.88); g.fill()
    g.restore()
  }
  ruta(g, px - w * 0.055, py - h * 0.01, w * 0.11, h * 0.14, 6)
  g.fillStyle = lineal(g, px, py, px, py + h * 0.14, [[0, '#E0B389'], [1, '#B07C4E']]); g.fill()

  // lampara fuera de cuadro arriba a la derecha + viñeta: las dos cosas que hacen que esto parezca una
  // foto tomada y no un dibujo plano.
  g.fillStyle = radial(g, x + w * 0.90, y + h * 0.04, 0, h * 0.55, [[0, '#FFDF9E', 0.65], [1, '#FFDF9E', 0]])
  g.fillRect(x, y, w, h)
  g.fillStyle = radial(g, x + w * 0.5, y + h * 0.5, h * 0.32, h * 0.82, [[0, HUMO, 0], [1, HUMO, 0.38]])
  g.fillRect(x, y, w, h)
}

// --- 3. silueta sobre fondo desenfocado -------------------------------------------------------------
// El "desenfoque" no es un desenfoque: son discos con degradado radial que se apagan al borde. Skia no
// tiene blur de imagen y el motor tampoco, asi que el bokeh se DIBUJA blando en vez de emborronarse.
function retrato (g, x, y, w, h, semilla) {
  g.fillStyle = lineal(g, x, y, x + w, y + h, [[0, '#25325E'], [0.5, '#3C5CA6'], [1, P.violetaHondo]])
  g.fillRect(x, y, w, h)

  const r = azar(semilla)
  const tintes = [P.cianClaro, P.cian, P.azulPalido, P.rosa, '#FFFFFF']
  for (let i = 0; i < 11; i++) {
    const cx = x + r() * w, cy = y + r() * h
    const rad = h * (0.08 + r() * 0.20)
    const c = tintes[(r() * tintes.length) | 0]
    g.fillStyle = radial(g, cx, cy, 0, rad, [[0, c, 0.30], [0.55, c, 0.16], [1, c, 0]])
    g.fillRect(cx - rad, cy - rad, rad * 2, rad * 2)
  }
  g.fillStyle = radial(g, x + w * 0.5, y + h * 0.45, h * 0.28, h * 0.85, [[0, '#0B1026', 0], [1, '#0B1026', 0.45]])
  g.fillRect(x, y, w, h)

  const cx = x + w * 0.5
  // la silueta no es negra plana: aclara arriba, donde le pega la luz del fondo. Negra plana sobre un
  // fondo de color se lee como un agujero recortado.
  const tinta = lineal(g, x, y + h * 0.25, x, y + h, [[0, '#1A2340'], [1, '#0D1226']])

  // UN SOLO CAMINO: hombro izquierdo, cuello, cabeza por arriba, cuello, hombro derecho. La primera
  // version eran dos figuras sueltas —una elipse y una cupula— y entre el menton y los hombros quedaba
  // un hueco de fondo: no leia como una persona sino como un huevo flotando sobre una loma. Ademas dos
  // figuras significan dos contornos, y la luz de borde marcaba la juntura por adentro.
  // LA PROPORCION MANDA: un hombro entra ~2,5 anchos de cabeza. La version anterior tenia una cabeza de
  // 0,15·h contra un cuerpo de 1,04·w —seis cabezas y media— y por mas que el contorno estuviera bien
  // dibujado seguia leyendose como una loma con una pelota arriba. Se agranda la cabeza, no se corrige
  // la curva. Los brazos salen por ABAJO y dejan dos cuñas de fondo en las esquinas: eso es lo que se ve
  // en un retrato real, y es distinto del defecto anterior, que era el cuerpo cortado a pique adentro
  // del cuadro con una franja de fondo pareja a los costados.
  const rx = h * 0.205, ry = h * 0.250, hy = y + h * 0.315   // cabeza ovalada: un circulo da icono de usuario
  const nw = rx * 0.44                                       // medio ancho del cuello
  const ny = hy + ry * Math.sqrt(1 - (nw / rx) ** 2)         // donde el costado del cuello toca la cabeza
  const yN = y + h * 0.68                                    // arranque de los hombros
  const sw = w * 0.40, yBot = y + h + 6                      // el cierre cae FUERA del recorte: si no, se ve la raya
  // El angulo de `ellipse` es el PARAMETRO de la elipse (x = rx·cos t), no el angulo geometrico: por eso
  // los contactos se calculan sobre las coordenadas normalizadas y no sobre nw y la altura crudas.
  // El barrido va de uno al otro POR ARRIBA, que con la y hacia abajo es el sentido de angulo creciente.
  const nwN = nw / rx, dyN = Math.sqrt(1 - nwN ** 2)
  const aL = Math.atan2(dyN, -nwN), aR = Math.atan2(dyN, nwN)

  // El hombro son TRES tramos, no una curva sola: costado casi vertical, la vuelta del hombro, y recien
  // ahi la subida al cuello. Con un unico bezier de la base al cuello sale una cupula —una loma— y la
  // silueta se lee como el icono de usuario de un formulario, que es justo lo contrario de un retrato.
  // La articulacion del hombro es el punto donde el trapecio deja de bajar despacio y empieza a caer el
  // brazo. Si se la corre hacia el borde, los dos tramos se funden en una pendiente sola y vuelve a
  // salir una loma.
  const bx = w * 0.26, by = y + h * 0.775
  g.beginPath()
  g.moveTo(cx - sw, yBot)
  g.bezierCurveTo(cx - w * 0.385, y + h * 0.885, cx - w * 0.325, y + h * 0.815, cx - bx, by)
  g.bezierCurveTo(cx - w * 0.205, y + h * 0.742, cx - nw * 2.5, yN + h * 0.015, cx - nw, yN)
  g.lineTo(cx - nw, ny)
  g.ellipse(cx, hy, rx, ry, 0, aL, aR, false)
  g.lineTo(cx + nw, yN)
  g.bezierCurveTo(cx + nw * 2.5, yN + h * 0.015, cx + w * 0.205, y + h * 0.742, cx + bx, by)
  g.bezierCurveTo(cx + w * 0.325, y + h * 0.815, cx + w * 0.385, y + h * 0.885, cx + sw, yBot)
  g.closePath()
  g.fillStyle = tinta; g.fill()
  g.strokeStyle = rgba(P.cianClaro, 0.30); g.lineWidth = 2.5; g.stroke()
}

// --- 4. plano abstracto de color --------------------------------------------------------------------
function abstracto (g, x, y, w, h) {
  g.fillStyle = lineal(g, x, y + h, x + w, y, [[0, P.azulHondo], [0.55, P.violetaHondo], [1, P.magenta]])
  g.fillRect(x, y, w, h)

  // manchas por degradado radial y no por composicion 'screen': el modo de fusion depende del backend y
  // acá lo que importa es que dos corridas den el mismo PNG.
  const manchas = [
    [0.30, 0.34, 0.52, P.cian, 0.62], [0.76, 0.70, 0.58, P.rosa, 0.50], [0.55, 0.16, 0.34, '#FFFFFF', 0.38],
  ]
  for (const [fx, fy, fr, c, a] of manchas) {
    const cx = x + w * fx, cy = y + h * fy, rad = h * fr
    g.fillStyle = radial(g, cx, cy, 0, rad, [[0, c, a], [0.6, c, a * 0.35], [1, c, 0]])
    g.fillRect(cx - rad, cy - rad, rad * 2, rad * 2)
  }

  g.save(); g.translate(x + w * 0.46, y + h * 0.56); g.rotate(-0.30)
  ruta(g, -w * 0.26, -h * 0.17, w * 0.52, h * 0.34, 22)
  g.fillStyle = lineal(g, -w * 0.26, -h * 0.17, w * 0.26, h * 0.17, [[0, '#FFFFFF', 0.26], [1, '#FFFFFF', 0.04]])
  g.fill()
  g.strokeStyle = rgba('#FFFFFF', 0.34); g.lineWidth = 2; g.stroke()
  g.restore()

  // El centro de los arcos cae DEBAJO del recorte a proposito. Con el centro adentro, la media
  // circunferencia termina sobre su propio diametro y quedan tres lineas cortadas en seco en el medio
  // del cuadro; con el centro afuera, las tres salen por el borde y las corta el recorte.
  g.strokeStyle = rgba('#FFFFFF', 0.22); g.lineWidth = 2.5
  for (const f of [0.55, 0.75, 0.95]) {
    g.beginPath(); g.arc(x + w * 0.82, y + h * 1.08, h * f, Math.PI, Math.PI * 2); g.stroke()
  }
}

// ================================================================ LAS BANDERAS
// Dos o tres rectangulos y nada mas: a 24x16 px cualquier detalle se convierte en barro. El contorno
// gris existe porque las franjas blancas de Francia e Italia desaparecen sobre la tarjeta blanca.
function bandera (g, franjas, vertical, x, y, w, h) {
  g.save()
  ruta(g, x, y, w, h, 3); g.clip()
  let d = 0
  for (const [peso, color] of franjas) {
    const largo = (vertical ? w : h) * peso
    g.fillStyle = color
    if (vertical) g.fillRect(x + d, y, largo + 0.5, h); else g.fillRect(x, y + d, w, largo + 0.5)
    d += largo
  }
  g.restore()
  ruta(g, x, y, w, h, 3)
  g.strokeStyle = rgba(P.tinta2, 0.28); g.lineWidth = 1; g.stroke()
}

const FR = { vertical: true, franjas: [[1 / 3, '#0B4EA2'], [1 / 3, '#FFFFFF'], [1 / 3, '#EF4135']] }
const DE = { vertical: false, franjas: [[1 / 3, '#1A1A1A'], [1 / 3, '#DD0000'], [1 / 3, '#FFCE00']] }
const IT = { vertical: true, franjas: [[1 / 3, '#008C45'], [1 / 3, '#FFFFFF'], [1 / 3, '#CD212A']] }
const ES = { vertical: false, franjas: [[0.25, '#AA151B'], [0.50, '#F1BF00'], [0.25, '#AA151B']] }

// ================================================================ LA TARJETA
const TARJETAS = [
  { n: 1, titulo: 'Le sommet', fecha: '12 mar 2026', dur: '2:14', escena: montana, band: FR, semilla: 1101 },
  { n: 2, titulo: 'Warmes Licht', fecha: '04 abr 2026', dur: '1:38', escena: interior, band: DE, semilla: 2202 },
  { n: 3, titulo: 'Il ritratto', fecha: '27 abr 2026', dur: '3:05', escena: retrato, band: IT, semilla: 3303 },
  { n: 4, titulo: 'Color puro', fecha: '09 may 2026', dur: '0:52', escena: abstracto, band: ES, semilla: 4404 },
]

function miniatura (g, t) {
  g.save()
  ruta(g, MX, MY, MW, MH, RADIO_MINI); g.clip()
  t.escena(g, MX, MY, MW, MH, t.semilla)
  g.restore()

  // menu de tres puntos: pastilla blanca casi opaca, no puntos sueltos. Sobre cuatro miniaturas de
  // colores distintos unos puntos claros se pierden en la de cielo y unos oscuros en la de silueta.
  const bw = 38, bh = 26, bx = MX + MW - 12 - bw, by = MY + 12
  ruta(g, bx, by, bw, bh, 13)
  g.fillStyle = rgba('#FFFFFF', 0.90); g.fill()
  for (let i = -1; i <= 1; i++) {
    disco(g, bx + bw / 2 + i * 8, by + bh / 2, 2.2)
    g.fillStyle = rgba(P.tinta2, 0.85); g.fill()
  }

  // la duracion es lo que dice "esto es un video" sin escribirlo. Va en la esquina de siempre.
  fuente(g, 15, UI, '600')
  const dw = g.measureText(t.dur).width
  const px = MX + 12, ph = 24, py = MY + MH - 12 - ph, pw = dw + 20
  ruta(g, px, py, pw, ph, 8)
  g.fillStyle = rgba(P.negro, 0.45); g.fill()
  texto(g, t.dur, px + pw / 2, py + ph / 2 + 0.5, { tam: 15, familia: UI, peso: '600', color: '#FFFFFF', alinear: 'center', base: 'middle' })
}

function tarjeta (t) {
  const [cv, g] = lienzoK(W, H, K)

  // la losa se dibuja media raya adentro para que el contorno de 2 px entre entero: trazado sobre el
  // borde exacto, Skia deja la mitad afuera del lienzo y el borde se ve de 1 px.
  const o = BORDE / 2
  ruta(g, o, o, W - BORDE, H - BORDE, RADIO)
  g.fillStyle = P.blanco; g.fill()
  g.strokeStyle = rgba(P.azul, 0.35); g.lineWidth = BORDE; g.stroke()

  miniatura(g, t)

  texto(g, t.titulo, MX + 4, MY + MH + 42, {
    tam: 27, familia: DISPLAY, peso: 'bold', color: P.tinta, espaciado: -0.4,
  })

  const fy = MY + MH + 84
  bandera(g, t.band.franjas, t.band.vertical, MX + 4, fy - 8, 24, 16)
  texto(g, t.fecha, MX + 4 + 24 + 12, fy, { tam: 17, familia: UI, color: P.gris, base: 'middle' })

  return guardar(`tarjeta-video-${t.n}`, cv)
}

// ================================================================ EL CANTO DE LA LOSA
// 12 px de ancho contra 450 de alto: es la cara lateral de la tarjeta, la que se ve cuando la losa gira
// hacia la camara. Va casi sin color —gris claro— porque un canto teñido delata que la tarjeta es una
// lamina y no un objeto.
function canto () {
  const [cv, g] = lienzoK(12, 450, 2)
  g.save()
  ruta(g, 0, 0, 12, 450, 6); g.clip()
  g.fillStyle = lineal(g, 0, 0, 12, 0, [
    [0, '#C7C4D6'], [0.18, '#EDEBF4'], [0.42, '#FFFFFF'], [0.72, '#DEDBE9'], [1, '#BBB7CD'],
  ])
  g.fillRect(0, 0, 12, 450)
  // el canto recibe la misma luz de arriba que la cara: sin esta caida los dos planos no pegan.
  g.fillStyle = lineal(g, 0, 0, 0, 450, [[0, '#FFFFFF', 0.40], [0.35, '#FFFFFF', 0], [1, '#2A2F55', 0.16]])
  g.fillRect(0, 0, 12, 450)
  g.restore()
  return guardar('tarjeta-canto', cv)
}

// ================================================================ LA SOMBRA, EN CAPA APARTE
// Dos sombras apiladas, como en un diseño real: una AMBIENTE grande y floja que separa la tarjeta del
// fondo, y una de CONTACTO corta y mas densa que la apoya. Una sola sombra grande flota; una sola corta
// parece pegada.
//
// El lienzo es 700x550 con la tarjeta de 600x450 centrada, o sea 50 px de aire por lado. Las dos cajas
// que proyectan estan METIDAS HACIA ADENTRO de la tarjeta lo suficiente como para que la caida entera
// —tres veces el desenfoque, `margenDe`— entre en el lienzo. Si no entra, se corta contra el borde y
// aparece un rectangulo visible; por eso abajo se verifica en vez de confiar en la aritmetica mental.
//
// EL `alfa` DE `sombra()` NO ES LINEAL: SALE AL CUADRADO. Medido acá con el helper de lib.mjs, caja de
// 200x200 y desenfoque 26, leyendo la alfa maxima del PNG:
//     alfa 0,15 -> 6/255      alfa 0,30 -> 23/255      alfa 0,50 -> 63/255      alfa 1,00 -> 255/255
// o sea salida ~= alfa^2 (y la pasada doble la vuelve a duplicar). La primera version de este archivo
// pedia 0,15 creyendo que daba un 15% de negro y entregaba un 2%: una sombra que en el video no existe.
// Los numeros de abajo estan elegidos SOBRE ESA CURVA, no sobre la intuicion.
function sombraTarjeta () {
  const SW = 700, SH = 550
  const [cv, g] = lienzoK(SW, SH, 1)

  const capas = [
    { x: 80, y: 78, w: 540, h: 380, r: 34, des: 26, baja: 14, alfa: 0.34 },
    { x: 70, y: 75, w: 560, h: 400, r: 30, des: 9, baja: 6, alfa: 0.30 },
  ]
  for (const s of capas) {
    const pide = margenDe(s.des)
    const hay = Math.min(s.x, SW - (s.x + s.w), s.y, SH - (s.y + s.h) - s.baja)
    if (hay < pide) throw new Error(`la sombra de desenfoque ${s.des} pide ${pide} px de margen y hay ${hay}: se cortaria contra el borde`)
    sombra(g, () => ruta(g, s.x, s.y, s.w, s.h, s.r), { color: '#2A2F55', alfa: s.alfa, desenfoque: s.des, bajada: s.baja })
  }

  // El unico contenido de este PNG es la caida, asi que "salio transparente" es un fallo perfectamente
  // silencioso: el archivo pesa, se escribe y no se ve nada. El piso de 60/255 no es decorativo, es el
  // que separa esta version de la anterior, que pasaba con 20 y era invisible.
  const d = g.getImageData(0, 0, SW, SH).data
  let maxA = 0
  for (let i = 3; i < d.length; i += 4) if (d[i] > maxA) maxA = d[i]
  if (maxA < 60) throw new Error(`la sombra salio demasiado floja (alfa maxima ${maxA}/255, piso 60)`)
  console.log(`  sombra-tarjeta: alfa maxima ${maxA}/255`)

  return guardar('sombra-tarjeta', cv)
}

// ---------------------------------------------------------------- corrida
const lista = []
for (const t of TARJETAS) lista.push(tarjeta(t))
lista.push(canto())
lista.push(sombraTarjeta())
informe('tarjetas', lista)
