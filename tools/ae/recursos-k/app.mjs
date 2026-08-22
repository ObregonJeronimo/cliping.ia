// RECURSOS-K · MODULO "app": LA INTERFAZ DEL PRODUCTO (LangEase)
//
// Son los PNG mas grandes de la pieza porque la camara se mete adentro de la ventana. Todo lo que acá
// se hornea —esquinas muy redondeadas, sombras bajas, degradados azul→violeta— no existe en el motor:
// se dibuja con Skia una sola vez y después el motor lo mueve como una lámina.
//
// LAS DOS DECISIONES QUE ORDENAN EL ARCHIVO
//
// 1. `fila-detalle.png` y las cinco filas de `app-escritorio.png` salen de UNA SOLA funcion,
//    `dibujarFila`, y de UNA SOLA tabla de proporciones, `FILA`. En la pieza hay un acercamiento de 20x
//    sobre una fila: si el detalle se dibujara aparte, el corte se notaría en el instante del cruce
//    (otra sangría, otro cuerpo de letra, la banderita corrida). Y no se puede resolver estirando
//    `app-escritorio.png`, porque una fila ahí mide 1590x142 lógicos y el detalle la muestra a pantalla
//    completa: el estirón deja la imagen por debajo del 2x que pide `lectura-check` Q2. El detalle la
//    redibuja 2,4 veces más grande (142 → 340 de alto), que es ganancia real de píxeles, no interpolada.
//
// 2. `FILA` guarda FRACCIONES DEL ALTO DE LA FILA, no píxeles. Es lo único que permite que las dos
//    versiones sean la misma fila a dos tamaños: cambiar el alto reescala miniatura, sangrías, cuerpos
//    y banderita a la vez. Las tres cosas ancladas a la derecha (chevron, fecha, banderita) se apoyan
//    una en otra midiendo el texto, así que tampoco se pisan cuando cambia el ancho.
//
// Todo el texto de interfaz va en UI (Segoe UI). La única excepción es el logotipo "LangEase", que es
// una marca y no interfaz, y va en DISPLAY (Century Gothic) — la geométrica que usa el resto de la pieza.

import {
  P, DISPLAY, UI, lienzoK, guardar, rgba, ruta, texto, fuente,
  lineal, radial, sombra, margenDe, azar, informe,
} from './lib.mjs'

// ================================================================================ medir antes de dibujar
// Varias piezas se apoyan una en otra (la banderita se para a la izquierda de la fecha, y la fecha no
// mide siempre lo mismo). Esto deja el ancho sin pintar nada.
const ancho = (g, s, tam, peso, familia = UI) => { fuente(g, tam, familia, peso); return g.measureText(s).width }

// El azul de la marca nunca es plano: siempre es la cuña azul→violeta, que es lo que da el aire de
// producto nuevo. Se pide con la caja para que el ángulo del degradado siga a la forma.
const cunaMarca = (g, x, y, w, h) => lineal(g, x, y, x + w, y + h, [[0, P.azul], [1, P.violeta]])
const cunaFria = (g, x, y, w, h) => lineal(g, x, y, x + w, y + h, [[0, P.cian], [1, P.azul]])

// ================================================================================ glifos
// Dibujados a mano y no con una fuente de iconos: una familia que no está la sustituye Skia sin avisar,
// y un icono equivocado no se ve hasta que el video está armado.

function chevron (g, cx, cy, r, color) {
  g.save()
  g.beginPath()
  g.moveTo(cx - r * 0.34, cy - r * 0.62)
  g.lineTo(cx + r * 0.30, cy)
  g.lineTo(cx - r * 0.34, cy + r * 0.62)
  g.lineWidth = Math.max(1.4, r * 0.24)
  g.lineCap = 'round'; g.lineJoin = 'round'
  g.strokeStyle = color || P.grisClaro
  g.stroke()
  g.restore()
}

function lupa (g, cx, cy, r, color, grosor) {
  g.save()
  g.strokeStyle = color; g.lineWidth = grosor || r * 0.26; g.lineCap = 'round'
  g.beginPath(); g.arc(cx - r * 0.12, cy - r * 0.12, r * 0.62, 0, Math.PI * 2); g.stroke()
  g.beginPath(); g.moveTo(cx + r * 0.32, cy + r * 0.32); g.lineTo(cx + r * 0.72, cy + r * 0.72); g.stroke()
  g.restore()
}

// Avatar sin nombre ni iniciales: una silueta. Poner iniciales obliga a inventar una persona, y la
// pieza no tiene por qué afirmar quién usa el producto.
function avatar (g, cx, cy, r) {
  g.save()
  g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2)
  g.fillStyle = cunaMarca(g, cx - r, cy - r, r * 2, r * 2); g.fill()
  g.clip()
  g.fillStyle = rgba('#FFFFFF', 0.92)
  g.beginPath(); g.arc(cx, cy - r * 0.26, r * 0.32, 0, Math.PI * 2); g.fill()
  // los hombros son media elipse y no dos curvas cuadráticas: con las curvas el vértice del medio
  // hacía una punta que a 40 px de diámetro se leía como una mancha con pico, no como una persona
  g.beginPath(); g.ellipse(cx, cy + r * 1.06, r * 0.74, r * 0.60, 0, Math.PI, 0); g.fill()
  g.restore()
}

// Iconos de la barra lateral. Todos caben en un cuadrado de lado `s` centrado en (cx, cy).
function icono (g, tipo, cx, cy, s, color) {
  g.save()
  g.fillStyle = color; g.strokeStyle = color
  g.lineWidth = s * 0.11; g.lineCap = 'round'; g.lineJoin = 'round'
  const h = s / 2
  if (tipo === 'biblioteca') {
    // tres barras de largo distinto: la pila de contenido
    const anchos = [1, 0.72, 0.86]
    for (let i = 0; i < 3; i++) {
      const y = cy - h + s * (0.12 + i * 0.32)
      ruta(g, cx - h, y, s * anchos[i], s * 0.16, s * 0.08); g.fill()
    }
  } else if (tipo === 'proyectos') {
    for (let i = 0; i < 4; i++) {
      const x = cx - h + (i % 2) * s * 0.56
      const y = cy - h + Math.floor(i / 2) * s * 0.56
      ruta(g, x, y, s * 0.44, s * 0.44, s * 0.13); g.fill()
    }
  } else if (tipo === 'equipo') {
    g.beginPath(); g.arc(cx - s * 0.18, cy - s * 0.16, s * 0.20, 0, Math.PI * 2); g.fill()
    g.beginPath(); g.arc(cx + s * 0.24, cy - s * 0.10, s * 0.15, 0, Math.PI * 2); g.fill()
    g.beginPath()
    g.moveTo(cx - s * 0.52, cy + h)
    g.quadraticCurveTo(cx - s * 0.18, cy + s * 0.06, cx + s * 0.16, cy + h)
    g.closePath(); g.fill()
  }
  g.restore()
}

// ================================================================================ banderitas
// Dos o tres franjas de color y nada más: ningún emblema. Alcanza para leer "otro idioma" de un vistazo
// y evita afirmar un país concreto con un dibujo a medias.
const BANDERAS = {
  es: { v: false, c: ['#D64545', '#E8C547', '#D64545'] },
  fr: { v: true, c: ['#3B5BDB', '#FFFFFF', '#E03131'] },
  it: { v: true, c: ['#2F9E44', '#FFFFFF', '#E03131'] },
  de: { v: false, c: ['#2B2B2B', '#E03131', '#E8C547'] },
  nl: { v: false, c: ['#E03131', '#FFFFFF', '#3B5BDB'] },
  pt: { v: true, c: ['#2F9E44', '#E03131'] },
  ar: { v: false, c: ['#6FB6E8', '#FFFFFF', '#6FB6E8'] },
  br: { v: false, c: ['#2F9E44', '#E8C547', '#2F9E44'] },
}

function bandera (g, x, y, w, h, clave) {
  const d = BANDERAS[clave] || BANDERAS.es
  const r = Math.min(w, h) * 0.18
  g.save()
  ruta(g, x, y, w, h, r); g.clip()
  const n = d.c.length
  for (let i = 0; i < n; i++) {
    g.fillStyle = d.c[i]
    if (d.v) g.fillRect(x + (w / n) * i, y, w / n + 1, h)
    else g.fillRect(x, y + (h / n) * i, w, h / n + 1)
  }
  g.restore()
  // el contorno no es decoración: varias banderas tienen franja blanca y sin él se derriten en la tarjeta
  ruta(g, x, y, w, h, r)
  g.strokeStyle = rgba(P.grisClaro, 0.9); g.lineWidth = Math.max(1, h * 0.045); g.stroke()
}

// ================================================================================ miniaturas sintéticas
// Cuatro imágenes dibujadas, no fotos: la pieza no puede mostrar material de terceros y una miniatura
// gris "de relleno" delata el mockup. Cada una recibe su semilla y varía siempre igual.

// SEMILLAS VECINAS NO SON INDEPENDIENTES. `azar` es un generador congruencial: con 7001…7008 los ocho
// primeros valores caían todos del mismo lado del 0,5, así que la "variación" existía en el código y no
// en la imagen — las dos miniaturas de interior salieron idénticas. Esto revuelve la semilla antes de
// entregarla (el finalizador de splitmix32). Comprobado: las mismas ocho semillas ahora dan dEEdEddE.
const mezclar = (n) => {
  let h = (n ^ 0x9E3779B9) >>> 0
  h = Math.imul(h ^ (h >>> 15), 0x85EBCA6B) >>> 0
  h = Math.imul(h ^ (h >>> 13), 0xC2B2AE35) >>> 0
  return (h ^ (h >>> 16)) >>> 0
}

function miniatura (g, x, y, w, h, r, tipo, semilla, espejo) {
  const rnd = azar(mezclar(semilla >>> 0))
  g.save()
  ruta(g, x, y, w, h, r); g.clip()

  // EL ESPEJO NO SALE DEL AZAR, y ese fue el segundo error: cada tipo de miniatura aparece dos veces en
  // la grilla y con el sorteo las dos copias podían caer para el mismo lado igual (pasó con las dos de
  // interior, dos veces seguidas). Que la segunda copia vaya dada vuelta es una decisión de composición,
  // así que viaja en los datos y se cumple siempre.
  if (espejo) { g.translate(x * 2 + w, 0); g.scale(-1, 1) }

  if (tipo === 'paisaje') {
    g.fillStyle = lineal(g, x, y, x, y + h, [[0, P.cianClaro], [0.55, '#DCEEFF'], [1, '#F6F3FF']])
    g.fillRect(x, y, w, h)
    const sx = x + w * (0.62 + rnd() * 0.16), sy = y + h * (0.22 + rnd() * 0.08)
    g.fillStyle = radial(g, sx, sy, 0, h * 0.30, [[0, '#FFFFFF', 0.95], [1, '#FFFFFF', 0]])
    g.beginPath(); g.arc(sx, sy, h * 0.30, 0, Math.PI * 2); g.fill()
    g.fillStyle = rgba('#FFFFFF', 0.9)
    g.beginPath(); g.arc(sx, sy, h * 0.10, 0, Math.PI * 2); g.fill()
    // dos lomas superpuestas: la de atrás más pálida, para que se lea profundidad en 120 px de alto
    const loma = (base, alto, color) => {
      g.beginPath()
      g.moveTo(x - 1, y + h + 1)
      g.lineTo(x - 1, y + h * base)
      g.quadraticCurveTo(x + w * 0.32, y + h * (base - alto), x + w * 0.58, y + h * base)
      g.quadraticCurveTo(x + w * 0.82, y + h * (base + alto * 0.5), x + w + 1, y + h * (base - alto * 0.2))
      g.lineTo(x + w + 1, y + h + 1)
      g.closePath(); g.fillStyle = color; g.fill()
    }
    loma(0.62 + rnd() * 0.10, 0.26, rgba(rnd() > 0.5 ? P.violeta : P.magenta, 0.28))
    loma(0.80, 0.20, rgba(P.azul, 0.55))
    g.fillStyle = rgba(P.azulHondo, 0.35); g.fillRect(x, y + h * 0.90, w, h * 0.12)

  } else if (tipo === 'interior') {
    g.fillStyle = lineal(g, x, y, x + w, y + h, [[0, '#F4F1FB'], [1, '#DED8EE']])
    g.fillRect(x, y, w, h)
    g.fillStyle = '#D6CFE6'; g.fillRect(x, y + h * 0.70, w, h * 0.32)
    g.fillStyle = rgba('#FFFFFF', 0.35)
    g.beginPath()
    g.moveTo(x + w * 0.10, y + h * 1.02); g.lineTo(x + w * 0.30, y + h * 0.70)
    g.lineTo(x + w * 0.72, y + h * 0.70); g.lineTo(x + w * 0.98, y + h * 1.02)
    g.closePath(); g.fill()
    // La ventana va contra el borde izquierdo y la lámpara en el 0,46: son las dos únicas piezas altas
    // de la escena y a 120 px de ancho la pantalla de la lámpara se montaba arriba del marco, lo que
    // dejaba una mancha blanca sin forma en vez de dos objetos.
    const vx = x + w * 0.07, vy = y + h * 0.14, vw = w * 0.26, vh = h * 0.42
    ruta(g, vx, vy, vw, vh, h * 0.05)
    g.fillStyle = lineal(g, vx, vy, vx, vy + vh, [[0, '#FFFFFF'], [1, '#CFE5FF']]); g.fill()
    g.strokeStyle = rgba(P.gris, 0.5); g.lineWidth = Math.max(1, h * 0.012)
    g.beginPath(); g.moveTo(vx + vw / 2, vy); g.lineTo(vx + vw / 2, vy + vh)
    g.moveTo(vx, vy + vh / 2); g.lineTo(vx + vw, vy + vh / 2); g.stroke()
    // sillón, apoyado sobre la línea del piso
    const sx = x + w * 0.55, sy = y + h * 0.50, sw = w * 0.38, sh = h * 0.32
    ruta(g, sx, sy, sw, sh, h * 0.09)
    g.fillStyle = rgba(rnd() > 0.5 ? P.violeta : P.azul, 0.42); g.fill()
    ruta(g, sx + sw * 0.10, sy + sh * 0.42, sw * 0.80, sh * 0.34, h * 0.05)
    g.fillStyle = rgba('#FFFFFF', 0.30); g.fill()
    // lámpara de pie
    const lx2 = x + w * 0.46
    g.strokeStyle = rgba(P.tinta2, 0.45); g.lineWidth = Math.max(1.2, h * 0.02)
    g.beginPath(); g.moveTo(lx2, y + h * 0.30); g.lineTo(lx2, y + h * 0.74); g.stroke()
    g.beginPath()
    g.moveTo(lx2 - w * 0.06, y + h * 0.30); g.lineTo(lx2 + w * 0.06, y + h * 0.30)
    g.lineTo(lx2 + w * 0.035, y + h * 0.15); g.lineTo(lx2 - w * 0.035, y + h * 0.15)
    g.closePath(); g.fillStyle = rgba(P.hueso, 0.95); g.fill()
    g.strokeStyle = rgba(P.gris, 0.45); g.lineWidth = Math.max(1, h * 0.012); g.stroke()

  } else if (tipo === 'silueta') {
    const frio = rnd() > 0.5
    g.fillStyle = lineal(g, x, y, x + w, y + h,
      frio ? [[0, P.azulPalido], [1, '#D2C9F7']] : [[0, '#FBE7F6'], [1, '#CFE0FA']])
    g.fillRect(x, y, w, h)
    const cx = x + w * (0.48 + rnd() * 0.06)
    g.fillStyle = radial(g, cx, y + h * 0.40, 0, h * 0.46, [[0, '#FFFFFF', 0.85], [1, '#FFFFFF', 0]])
    g.beginPath(); g.arc(cx, y + h * 0.40, h * 0.46, 0, Math.PI * 2); g.fill()
    g.fillStyle = rgba(P.tinta2, 0.62)
    g.beginPath(); g.arc(cx, y + h * 0.40, h * 0.15, 0, Math.PI * 2); g.fill()
    g.beginPath()
    g.moveTo(cx - w * 0.26, y + h + 1)
    g.lineTo(cx - w * 0.21, y + h * 0.80)
    g.quadraticCurveTo(cx, y + h * 0.52, cx + w * 0.21, y + h * 0.80)
    g.lineTo(cx + w * 0.26, y + h + 1)
    g.closePath(); g.fill()

  } else { // 'abstracto'
    g.fillStyle = cunaMarca(g, x, y, w, h); g.fillRect(x, y, w, h)
    g.save()
    // una banda diagonal clara: es lo que evita que el plano quede como un rectángulo de color y nada más
    g.translate(x + w * 0.5, y + h * 0.5); g.rotate(-0.5 + rnd() * 0.2)
    g.fillStyle = rgba('#FFFFFF', 0.22); g.fillRect(-w, -h * 0.14, w * 2, h * 0.28)
    g.fillStyle = rgba('#FFFFFF', 0.12); g.fillRect(-w, h * 0.22, w * 2, h * 0.16)
    g.restore()
    const burbuja = (fx, fy, fr, col, a) => {
      const bx = x + w * fx, by = y + h * fy, br = h * fr
      g.fillStyle = radial(g, bx, by, 0, br, [[0, col, a], [1, col, 0]])
      g.beginPath(); g.arc(bx, by, br, 0, Math.PI * 2); g.fill()
    }
    const calido = rnd() > 0.5
    burbuja(0.18 + rnd() * 0.1, 0.28, 0.55, calido ? P.magenta : P.cian, 0.72)
    burbuja(0.82, 0.72 + rnd() * 0.1, 0.50, calido ? P.cianClaro : P.rosa, 0.60)
  }

  g.restore()
  ruta(g, x, y, w, h, r)
  g.strokeStyle = rgba(P.grisClaro, 0.55); g.lineWidth = 1; g.stroke()
}

// ================================================================================ LA FILA, compartida
// Fracciones del ALTO de la fila. Ver la cabecera: es lo que hace que `fila-detalle` y la lista de
// `app-escritorio` sean la misma fila y no dos dibujos parecidos.
const FILA = Object.freeze({
  radio: 0.16,
  padX: 0.12,          // sangría izquierda y derecha
  sepTitulo: 0.11,     // aire entre la miniatura y el texto
  thumbAlto: 0.60,
  thumbAncho: 0.60 * 1.55,
  baseTitulo: 0.45,    // línea de base del título, medida desde arriba
  baseSub: 0.73,
  tamTitulo: 0.20,
  tamSub: 0.125,
  tamFecha: 0.14,
  banderaAlto: 0.20,
  banderaAncho: 0.30,
  sepBandera: 0.18,    // aire entre la banderita y la fecha
  sepFecha: 0.22,      // aire entre la fecha y el chevron
  chevron: 0.085,
})
const FILA_FONDO = '#F7F6FC'

// Las cinco filas de la lista. `fila-detalle` usa FILAS[1], así que el acercamiento cae sobre una fila
// que existe de verdad en la ventana y dice lo mismo.
const FILAS = [
  { titulo: 'Onboarding v3', sub: 'Video · 2:14', fecha: '12 Aug 2026', bandera: 'es', imagen: 'abstracto', semilla: 1101 },
  { titulo: 'Beach walk', sub: 'Video · 0:48', fecha: '11 Aug 2026', bandera: 'fr', imagen: 'paisaje', semilla: 2202 },
  { titulo: 'Kitchen tour', sub: 'Video · 1:36', fecha: '09 Aug 2026', bandera: 'it', imagen: 'interior', semilla: 3303 },
  { titulo: 'Team intro', sub: 'Video · 3:02', fecha: '08 Aug 2026', bandera: 'de', imagen: 'silueta', semilla: 4404 },
  { titulo: 'Field notes', sub: 'Audio · 4:20', fecha: '05 Aug 2026', bandera: 'nl', imagen: 'abstracto', semilla: 5505, espejo: true },
]

function dibujarFila (g, x, y, w, h, d) {
  const u = (f) => f * h

  ruta(g, x, y, w, h, u(FILA.radio))
  g.fillStyle = FILA_FONDO; g.fill()
  g.strokeStyle = rgba(P.grisClaro, 0.45); g.lineWidth = Math.max(1, u(0.007)); g.stroke()

  const tw = u(FILA.thumbAncho), th = u(FILA.thumbAlto)
  const tx = x + u(FILA.padX), ty = y + (h - th) / 2
  miniatura(g, tx, ty, tw, th, u(0.07), d.imagen, d.semilla, d.espejo)

  // De derecha a izquierda: chevron, fecha, banderita. Se apoyan una en otra midiendo el texto — con
  // columnas fijas la banderita se comía el título en la versión ancha o al revés en la angosta.
  const cxCh = x + w - u(FILA.padX) - u(FILA.chevron)
  chevron(g, cxCh, y + h / 2, u(FILA.chevron), P.grisClaro)

  const tamFecha = u(FILA.tamFecha)
  const derFecha = cxCh - u(FILA.chevron) - u(FILA.sepFecha)
  const anFecha = ancho(g, d.fecha, tamFecha)
  texto(g, d.fecha, derFecha, y + u(0.58), { tam: tamFecha, color: P.gris, alinear: 'right' })

  const bw = u(FILA.banderaAncho), bh = u(FILA.banderaAlto)
  bandera(g, derFecha - anFecha - u(FILA.sepBandera) - bw, y + (h - bh) / 2, bw, bh, d.bandera)

  const xTexto = tx + tw + u(FILA.sepTitulo)
  texto(g, d.titulo, xTexto, y + u(FILA.baseTitulo), { tam: u(FILA.tamTitulo), peso: 600, color: P.tinta })
  texto(g, d.sub, xTexto, y + u(FILA.baseSub), { tam: u(FILA.tamSub), color: P.gris })
}

// ================================================================================ piezas de interfaz

// Pastilla de filtro / item. Devuelve su ancho porque las cuatro se encadenan en una fila.
function pastilla (g, x, y, alto, etiqueta, activo) {
  const tam = alto * 0.40
  const w = ancho(g, etiqueta, tam, 600) + alto * 1.05
  ruta(g, x, y, w, alto, alto / 2)
  g.fillStyle = activo ? cunaMarca(g, x, y, w, alto) : P.blanco
  g.fill()
  if (!activo) { g.strokeStyle = rgba(P.grisClaro, 0.8); g.lineWidth = 1.6; g.stroke() }
  texto(g, etiqueta, x + w / 2, y + alto / 2 + tam * 0.02, {
    tam, peso: 600, color: activo ? P.blanco : P.tinta2, alinear: 'center', base: 'middle',
  })
  return w
}

function buscador (g, x, y, w, h, marcador) {
  ruta(g, x, y, w, h, h / 2)
  g.fillStyle = '#F3F2FA'; g.fill()
  g.strokeStyle = rgba(P.grisClaro, 0.7); g.lineWidth = 1.6; g.stroke()
  lupa(g, x + h * 0.62, y + h / 2, h * 0.30, P.gris, h * 0.075)
  texto(g, marcador, x + h * 1.10, y + h / 2 + h * 0.01, { tam: h * 0.36, color: P.gris, base: 'middle' })
}

// El botón oscuro de la esquina: el único bloque de tinta plena de toda la interfaz, y por eso es lo
// primero que encuentra el ojo cuando la cámara abre.
function botonOscuro (g, x, y, w, h, etiqueta) {
  sombra(g, () => ruta(g, x, y, w, h, h / 2), { desenfoque: h * 0.34, bajada: h * 0.14, alfa: 0.20, color: '#12141C' })
  ruta(g, x, y, w, h, h / 2)
  g.fillStyle = lineal(g, x, y, x, y + h, [[0, P.tinta2], [1, P.tinta]]); g.fill()
  const tam = h * 0.34
  const s = h * 0.26
  const cx = x + h * 0.62
  g.strokeStyle = P.blanco; g.lineWidth = Math.max(2, h * 0.055); g.lineCap = 'round'
  g.beginPath()
  g.moveTo(cx - s / 2, y + h / 2); g.lineTo(cx + s / 2, y + h / 2)
  g.moveTo(cx, y + h / 2 - s / 2); g.lineTo(cx, y + h / 2 + s / 2)
  g.stroke()
  texto(g, etiqueta, cx + s * 0.9, y + h / 2 + tam * 0.02, { tam, peso: 600, color: P.blanco, base: 'middle' })
}

// La barra lateral, la misma en `app-barra.png` y adentro de `app-escritorio.png`. Los items van
// anclados arriba y la tarjeta del espacio de trabajo abajo, así el mismo dibujo aguanta 1500 y 1240
// de alto sin que quede un hueco raro en el medio.
function dibujarBarra (g, x, y, w, h) {
  g.fillStyle = lineal(g, x, y, x, y + h, [[0, P.blanco], [1, P.hueso]])
  g.fillRect(x, y, w, h)
  g.fillStyle = rgba(P.grisClaro, 0.55)
  g.fillRect(x + w - 1.5, y, 1.5, h)

  const pad = w * 0.09
  const L = w * 0.125
  const lx = x + pad, ly = y + w * 0.105
  ruta(g, lx, ly, L, L, L * 0.30)
  g.fillStyle = cunaMarca(g, lx, ly, L, L); g.fill()
  // el glifo de la marca: dos barras blancas, la de abajo más corta (una "línea de subtítulo")
  g.fillStyle = rgba('#FFFFFF', 0.96)
  ruta(g, lx + L * 0.24, ly + L * 0.30, L * 0.52, L * 0.12, L * 0.06); g.fill()
  ruta(g, lx + L * 0.24, ly + L * 0.56, L * 0.32, L * 0.12, L * 0.06); g.fill()
  texto(g, 'LangEase', lx + L * 1.30, ly + L * 0.5, {
    tam: w * 0.078, familia: DISPLAY, peso: 600, color: P.tinta, base: 'middle',
  })

  texto(g, 'WORKSPACE', lx + w * 0.03, ly + L + w * 0.20, {
    tam: w * 0.036, peso: 600, color: P.gris, espaciado: w * 0.008,
  })

  const items = [
    { t: 'Library', ic: 'biblioteca', activo: true },
    { t: 'Projects', ic: 'proyectos', activo: false },
    { t: 'Team', ic: 'equipo', activo: false },
  ]
  const altoIt = w * 0.142
  const px = x + pad * 0.55
  const pw = w - pad * 1.10
  let iy = ly + L + w * 0.27
  for (const it of items) {
    if (it.activo) {
      // el activo lleva sombra propia: es la pastilla que la cámara persigue en el plano de la barra
      sombra(g, () => ruta(g, px, iy, pw, altoIt, altoIt * 0.36),
        { desenfoque: altoIt * 0.42, bajada: altoIt * 0.16, alfa: 0.26, color: P.azulHondo })
      ruta(g, px, iy, pw, altoIt, altoIt * 0.36)
      g.fillStyle = cunaMarca(g, px, iy, pw, altoIt); g.fill()
    }
    const col = it.activo ? P.blanco : P.gris
    icono(g, it.ic, px + altoIt * 0.52, iy + altoIt / 2, altoIt * 0.42, col)
    texto(g, it.t, px + altoIt * 0.92, iy + altoIt / 2 + w * 0.002, {
      tam: w * 0.056, peso: it.activo ? 600 : 500, color: it.activo ? P.blanco : P.tinta2, base: 'middle',
    })
    iy += altoIt + w * 0.028
  }

  const cy = y + h - w * 0.09 - w * 0.30
  g.fillStyle = rgba(P.grisClaro, 0.5)
  g.fillRect(px, cy - w * 0.09, pw, 1.4)
  ruta(g, px, cy, pw, w * 0.30, w * 0.07)
  g.fillStyle = '#F2F0FA'; g.fill()
  const ar = w * 0.075
  avatar(g, px + w * 0.115, cy + w * 0.15, ar)
  texto(g, 'Studio Nord', px + w * 0.215, cy + w * 0.125, { tam: w * 0.050, peso: 600, color: P.tinta })
  texto(g, 'Pro plan', px + w * 0.215, cy + w * 0.225, { tam: w * 0.040, color: P.gris })
}

// ================================================================================ 1 · app-barra.png
function barra () {
  const [cv, g] = lienzoK(450, 1500, 2)
  dibujarBarra(g, 0, 0, 450, 1500)
  return guardar('app-barra', cv)
}

// ================================================================================ 2 · app-encabezado.png
function encabezado () {
  const W = 2000, H = 300
  const [cv, g] = lienzoK(W, H, 2)
  g.fillStyle = P.blanco; g.fillRect(0, 0, W, H)

  texto(g, 'Library', 64, 116, { tam: 74, peso: 600, color: P.tinta })

  const tabs = ['All', 'Videos', 'Files', 'Audio']
  const tamTab = 36
  let tx = 66
  for (let i = 0; i < tabs.length; i++) {
    const activa = i === 0
    const w = ancho(g, tabs[i], tamTab, activa ? 600 : 500)
    texto(g, tabs[i], tx, 232, { tam: tamTab, peso: activa ? 600 : 500, color: activa ? P.tinta : P.gris })
    if (activa) {
      // el subrayado se corre 3 px a la izquierda y suma 6 de ancho para que abrace la palabra y no
      // arranque pegado a la primera letra
      ruta(g, tx - 3, 254, w + 6, 6, 3)
      g.fillStyle = cunaMarca(g, tx, 254, w, 6); g.fill()
    }
    tx += w + tamTab * 1.20
  }

  const ar = 44
  const cxAv = W - 64 - ar
  avatar(g, cxAv, 150, ar)
  buscador(g, cxAv - ar - 40 - 560, 108, 560, 84, 'Search library')

  g.fillStyle = rgba(P.grisClaro, 0.55); g.fillRect(0, H - 1.5, W, 1.5)
  return guardar('app-encabezado', cv)
}

// ================================================================================ 3 · app-grilla.png
// Los cuatro tipos entran dos veces cada uno, pero DESFASADOS entre las dos hileras y con la segunda
// copia espejada: con el mismo orden arriba y abajo, cada columna repetía su imagen en vertical y la
// grilla se leía como una fila copiada.
const TARJETAS = [
  { titulo: 'Onboarding v3', fecha: '12 Aug', bandera: 'es', imagen: 'abstracto', semilla: 7001 },
  { titulo: 'Beach walk', fecha: '11 Aug', bandera: 'fr', imagen: 'paisaje', semilla: 7002 },
  { titulo: 'Kitchen tour', fecha: '09 Aug', bandera: 'it', imagen: 'interior', semilla: 7003 },
  { titulo: 'Team intro', fecha: '08 Aug', bandera: 'de', imagen: 'silueta', semilla: 7004 },
  { titulo: 'Loft rewalk', fecha: '07 Aug', bandera: 'nl', imagen: 'interior', semilla: 7005, espejo: true },
  { titulo: 'Voice memo', fecha: '06 Aug', bandera: 'pt', imagen: 'silueta', semilla: 7006, espejo: true },
  { titulo: 'Studio B-roll', fecha: '05 Aug', bandera: 'ar', imagen: 'abstracto', semilla: 7007, espejo: true },
  { titulo: 'Sunset drive', fecha: '04 Aug', bandera: 'br', imagen: 'paisaje', semilla: 7008, espejo: true },
]

function grilla () {
  const W = 2000, H = 1200
  const [cv, g] = lienzoK(W, H, 2)
  g.fillStyle = P.fondoA; g.fillRect(0, 0, W, H)

  const DESENF = 22
  const pad = Math.max(80, margenDe(DESENF))   // el borde tiene que aguantar la caída de la sombra entera
  const gapX = 44, gapY = 80
  const cw = (W - pad * 2 - gapX * 3) / 4
  const ch = (H - pad * 2 - gapY) / 2
  const th = ch * 0.625
  const radio = 30

  const caja = (i) => ({
    x: pad + (i % 4) * (cw + gapX),
    y: pad + Math.floor(i / 4) * (ch + gapY),
  })

  // DOS PASADAS: primero todas las sombras, después todas las tarjetas. Con el hueco (44) más chico que
  // el margen de la sombra (66), dibujando tarjeta por tarjeta la sombra de la siguiente caía sobre el
  // blanco de la anterior y ensuciaba el borde derecho de cada una.
  for (let i = 0; i < 8; i++) {
    const { x, y } = caja(i)
    sombra(g, () => ruta(g, x, y, cw, ch, radio), { desenfoque: DESENF, bajada: 12, alfa: 0.13, color: '#2A2F55' })
  }

  for (let i = 0; i < 8; i++) {
    const d = TARJETAS[i]
    const { x, y } = caja(i)
    ruta(g, x, y, cw, ch, radio); g.fillStyle = P.blanco; g.fill()

    // la miniatura se recorta contra la tarjeta: arriba toma sus esquinas redondeadas y abajo corta recto
    g.save()
    ruta(g, x, y, cw, ch, radio); g.clip()
    miniatura(g, x - 1, y - 1, cw + 2, th + 1, radio, d.imagen, d.semilla, d.espejo)
    g.restore()

    const padT = 28
    texto(g, d.titulo, x + padT, y + th + 66, { tam: 34, peso: 600, color: P.tinta })
    const bw = 46, bh = 30
    bandera(g, x + padT, y + ch - 76, bw, bh, d.bandera)
    texto(g, d.fecha, x + cw - padT, y + ch - 54, { tam: 24, color: P.gris, alinear: 'right' })
  }

  return guardar('app-grilla', cv)
}

// ================================================================================ 4 · app-escritorio.png
function escritorio () {
  const W = 2400, H = 1500
  const [cv, g] = lienzoK(W, H, 2)
  // FONDO TRANSPARENTE A PROPÓSITO: es una ventana que flota sobre el fondo lavanda de la pieza, que ya
  // viene horneado en otro plano. Un rectángulo opaco acá taparía el degradado y el grano de ese plano.

  const DESENF = 36
  const M = margenDe(DESENF)              // 108: lo que necesita la caída para no cortarse contra el borde
  const X = M + 12, Y = M + 2
  const VW = W - X * 2, VH = H - Y - (M + 42)
  const R = 40

  sombra(g, () => ruta(g, X, Y, VW, VH, R), { desenfoque: DESENF, bajada: 20, alfa: 0.17, color: '#2A2F55' })
  ruta(g, X, Y, VW, VH, R); g.fillStyle = P.blanco; g.fill()

  g.save()
  ruta(g, X, Y, VW, VH, R); g.clip()      // recorta la barra lateral contra las esquinas de la ventana
  const barraW = 430
  dibujarBarra(g, X, Y, barraW, VH)
  g.restore()

  const cx0 = X + barraW + 70
  const cx1 = X + VW - 70
  const cw = cx1 - cx0

  texto(g, 'Library', cx0, Y + 122, { tam: 68, peso: 600, color: P.tinta })

  const ar = 42
  const cxAv = cx1 - ar
  avatar(g, cxAv, Y + 100, ar)
  const btW = 262, btH = 82
  botonOscuro(g, cxAv - ar - 36 - btW, Y + 100 - btH / 2, btW, btH, 'Upload')

  let px = cx0
  const filtros = ['All', 'Videos', 'Files', 'Audio']
  for (let i = 0; i < filtros.length; i++) px += pastilla(g, px, Y + 190, 68, filtros[i], i === 0) + 18

  buscador(g, cx0, Y + 305, cw, 84, 'Search library')

  // La lista: cinco filas del MISMO `dibujarFila` que `fila-detalle`. El alto 142 es lo que entra entre
  // el buscador y el pie de la ventana; el detalle usa 340, o sea 2,4x más píxeles por fila.
  const altoFila = 142, hueco = 12
  let fy = Y + 440
  for (const d of FILAS) { dibujarFila(g, cx0, fy, cw, altoFila, d); fy += altoFila + hueco }

  return guardar('app-escritorio', cv)
}

// ================================================================================ 5 · fila-detalle.png
function filaDetalle () {
  const W = 1500, H = 400
  const [cv, g] = lienzoK(W, H, 2)
  // El mismo blanco que el cuerpo de la ventana: cuando la cámara cruza de `app-escritorio` a este PNG,
  // lo único que tiene que cambiar es la resolución, nunca el color de atrás.
  g.fillStyle = P.blanco; g.fillRect(0, 0, W, H)
  dibujarFila(g, 30, 30, W - 60, H - 60, FILAS[1])
  return guardar('fila-detalle', cv)
}

// ================================================================================ 6 · panel-soltar.png
function panelSoltar () {
  const W = 1200, H = 750
  const [cv, g] = lienzoK(W, H, 2)

  const DESENF = 30
  const M = margenDe(DESENF)              // 90
  const X = M, Y = M - 10
  const VW = W - M * 2, VH = H - Y - (M + 20)
  const R = 34

  sombra(g, () => ruta(g, X, Y, VW, VH, R), { desenfoque: DESENF, bajada: 16, alfa: 0.15, color: '#2A2F55' })
  ruta(g, X, Y, VW, VH, R); g.fillStyle = P.blanco; g.fill()
  g.strokeStyle = rgba(P.grisClaro, 0.55); g.lineWidth = 1.6; g.stroke()

  // la zona de soltar, con borde de puntos y un fondo apenas azulado
  const zx = X + 44, zy = Y + 44, zw = VW - 88, zh = VH - 44 - 104
  ruta(g, zx, zy, zw, zh, 26)
  g.fillStyle = rgba(P.azulPalido, 0.35); g.fill()
  g.save()
  g.setLineDash([16, 14])
  g.strokeStyle = rgba(P.azul, 0.45); g.lineWidth = 3
  ruta(g, zx, zy, zw, zh, 26); g.stroke()
  g.restore()

  const cx = zx + zw / 2
  const icy = zy + zh * 0.34
  g.fillStyle = radial(g, cx, icy, 0, 82, [[0, P.azul, 0.20], [1, P.azul, 0]])
  g.beginPath(); g.arc(cx, icy, 82, 0, Math.PI * 2); g.fill()
  ruta(g, cx - 46, icy - 46, 92, 92, 26)
  g.fillStyle = cunaFria(g, cx - 46, icy - 46, 92, 92); g.fill()
  g.strokeStyle = P.blanco; g.lineWidth = 7; g.lineCap = 'round'; g.lineJoin = 'round'
  g.beginPath(); g.moveTo(cx, icy + 22); g.lineTo(cx, icy - 22); g.stroke()
  g.beginPath(); g.moveTo(cx - 17, icy - 6); g.lineTo(cx, icy - 23); g.lineTo(cx + 17, icy - 6); g.stroke()

  texto(g, 'Drop files here', cx, zy + zh * 0.68, { tam: 48, peso: 600, color: P.tinta, alinear: 'center' })
  texto(g, 'or click to browse · MP4, MOV, WAV', cx, zy + zh * 0.82, { tam: 28, color: P.gris, alinear: 'center' })

  // los dos controles diminutos del pie: no dicen nada, sostienen la esquina para que la ventana no
  // termine en un vacío blanco
  const cs = 46, cy = Y + VH - 34 - cs
  for (let i = 0; i < 2; i++) {
    const bx = X + 36 + i * (cs + 14)
    ruta(g, bx, cy, cs, cs, 15)
    g.fillStyle = '#F3F2FA'; g.fill()
    g.strokeStyle = rgba(P.grisClaro, 0.8); g.lineWidth = 1.4; g.stroke()
    g.strokeStyle = P.gris; g.lineWidth = 3; g.lineCap = 'round'
    const mx = bx + cs / 2, my = cy + cs / 2
    if (i === 0) {
      g.beginPath(); g.moveTo(mx - 9, my); g.lineTo(mx + 9, my)
      g.moveTo(mx, my - 9); g.lineTo(mx, my + 9); g.stroke()
    } else {
      g.beginPath(); g.arc(mx, my, 9, 0, Math.PI * 2); g.stroke()
      g.beginPath(); g.arc(mx, my, 2.5, 0, Math.PI * 2); g.fillStyle = P.gris; g.fill()
    }
  }

  return guardar('panel-soltar', cv)
}

// ================================================================================
informe('app', [barra(), encabezado(), grilla(), escritorio(), filaDetalle(), panelSoltar()])
