// LOS OBJETOS DE LA PIEZA-M. Son las formas que la pieza anima, y son siete archivos para CUATRO
// objetos: el punto, la pildora, la placa y la marca. La diferencia entre "siete archivos" y "cuatro
// objetos" es toda la idea de este modulo.
//
// LO QUE ORDENA TODO: un objeto no es un PNG. La pildora, por ejemplo, no existe como archivo — son dos
// copias de `m-punto` (las tapas) con `m-barra` estirada entre ellas. Y el punto que entra al principio
// de la pieza ES la tapa izquierda: no hay morphing ni cambio de textura, el mismo objeto cambia de rol.
// Por eso la barra no tiene esquinas redondeadas: las tapan los circulos, asi que se puede estirar todo
// lo que haga falta sin que se aplaste ningun radio.
//
// LAS SOMBRAS DURAS VAN EN CAPA APARTE (`-tinta`). En los proyectos medidos la sombra de estos objetos
// tiene suavizado 0 — o sea es un DESPLAZAMIENTO, no un desenfoque. Se resuelve con una copia en tinta
// plana corrida unos pixeles, que ademas puede MOVERSE y DESFASARSE con el objeto durante la animacion.
// Hornearla adentro del PNG la dejaria clavada, y la pieza pierde justo el recurso que le da peso.
//
// LO QUE NO ESTA ACA Y NO ES UN OLVIDO: la placa no lleva sombra horneada. No es una decision estetica,
// es geometria — ver el comentario largo arriba de `m-placa`.
//
// USO
//   node tools/ae/recursos-m/objetos.mjs
//   RECURSOS_M=D:/otra/carpeta node tools/ae/recursos-m/objetos.mjs

import { writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs'
import { createCanvas } from '@napi-rs/canvas'

const DESTINO = process.env.RECURSOS_M || 'C:/ae-probe/recursos-m'
if (!existsSync(DESTINO)) mkdirSync(DESTINO, { recursive: true })

// ============================================================================ paleta
// La de la pieza, exacta. UN SOLO acento: la familia del naranja. `blanco` no es un segundo acento —
// es el papel de la tarjeta, y esta aparte de la paleta a proposito: `papel` (#FAFAF8) es EL SUELO, asi
// que una tarjeta pintada de `papel` sobre el suelo desaparece. Lo que la separa del fondo es que es
// mas clara que el suelo, no que sea de otro color.
const P = {
  papel: '#FAFAF8',
  papel2: '#F0EFEA',
  tinta: '#0E0E10',
  gris: '#6E7076',
  grisClaro: '#C9CAC8',
  naranja: '#FF4D1C',
  naranjaHondo: '#D93A0E',
  naranjaClaro: '#FF8A5C',
}
const BLANCO = '#FFFFFF'

// EL COLOR DE LA SOMBRA DURA, Y POR QUE ES UN COLOR OPACO Y NO TINTA TRANSLUCIDA.
//
// La pildora son TRES capas (dos tapas y una barra) y su sombra eran otras tres, cada una con la capa
// al 14% de opacidad. Donde dos se superponen —y se superponen siempre, un radio entero de cada lado—
// el alfa se acumula: 1 - 0,86^2 = 0,26, casi el doble. En el cuadro 50 eso se ve como DOS ESCALONES en
// el borde de abajo de la sombra, uno en cada junta. No lo caza ninguna compuerta: las tres capas estan
// donde tienen que estar, se ven, no se cortan y no chocan con texto.
//
// Con un color OPACO el problema desaparece por aritmetica: opaco sobre opaco del mismo color da ese
// mismo color, sea cual sea el orden y cuantas capas se pisen. El valor es el que daba la tinta al 14%
// sobre el papel (0,86*250 + 0,14*14 = 217), asi que la sombra se ve igual que antes — menos los
// escalones.
const SOMBRA_DURA = '#D9D8D4'

// ============================================================================ helpers
const lienzo = (w, h, k) => {
  const cv = createCanvas(w * k, h * k)
  const g = cv.getContext('2d')
  g.scale(k, k)
  return [cv, g]
}
const rgba = (hex, a) => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))
  return `rgba(${r},${g},${b},${a})`
}
// Se mezcla y se mide SOBRE LA CADENA HEX, nunca sobre los canales de un objeto de color de una libreria
// 3D: los de three vienen en LINEAL y aplicarles la conversion de nuevo comprime todas las diferencias.
// Es la regla de la casa y vale igual aca, donde no hay three: el hex es el dato, todo lo demas deriva.
const hex2rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))

// Mezcla dos colores SOBRE LA CADENA HEX. Vale la misma advertencia que ya esta escrita arriba para
// `rgba`: los canales de un objeto de color de una libreria pueden venir en lineal, y mezclar ahi
// comprime las diferencias y da otro color.
function mezclaHex (a, b, t) {
  const c = (h, i) => parseInt(h.slice(i, i + 2), 16)
  const m = (i) => Math.round(c(a, i) * (1 - t) + c(b, i) * t)
  return `rgb(${m(1)},${m(3)},${m(5)})`
}

function ruta (g, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2)
  g.beginPath()
  g.moveTo(x + rr, y)
  g.lineTo(x + w - rr, y); g.arcTo(x + w, y, x + w, y + rr, rr)
  g.lineTo(x + w, y + h - rr); g.arcTo(x + w, y + h, x + w - rr, y + h, rr)
  g.lineTo(x + rr, y + h); g.arcTo(x, y + h, x, y + h - rr, rr)
  g.lineTo(x, y + rr); g.arcTo(x, y, x + rr, y, rr)
  g.closePath()
}

// Poligono de puntas redondeadas. Existe por el triangulo de la marca: una punta en angulo vivo, cuando
// el PNG se baja a 60 px de pantalla, se le come el vertice el suavizado y queda una punta sucia y
// asimetrica. Redondeada, el filtro tiene curva de donde agarrarse y la punta sobrevive al achique.
function poligonoRedondo (g, pts, r) {
  const n = pts.length
  const medio = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  g.beginPath()
  g.moveTo(...medio(pts[0], pts[1]))
  for (let i = 0; i < n; i++) {
    const v = pts[(i + 1) % n]              // el vertice que se redondea
    const hacia = medio(v, pts[(i + 2) % n]) // el punto medio de la arista siguiente: siempre pasado el redondeo
    g.arcTo(v[0], v[1], hacia[0], hacia[1], r)
  }
  g.closePath()
}

// ============================================================================ el azar, que no es azar
// NADA de Math.random: un recurso que sale distinto en cada corrida no se puede comparar contra el
// anterior, y una diferencia de un cuadro deja de ser un dato. Generador congruencial con la semilla
// ESCRITA aca abajo.
const SEMILLA = 20260821   // la fecha de la pieza. Escrita, no sorteada.

// Y NO es un flujo (`azar()` que avanza en cada llamada) sino una FUNCION PURA DE UN INDICE. La razon es
// el empalme de la pildora, no la prolijidad: si el dither del circulo saliera de un flujo, el circulo
// consumiria 880 numeros y la barra otros 880 distintos, y las dos partes tendrian ruido diferente en la
// misma fila. Se veria exactamente el mismo defecto que un degradado diagonal — una costura vertical
// donde la tapa se junta con la barra. Sembrado por fila, la fila 317 da el mismo numero en los dos.
//
// Dos vueltas del LCG con un xor en el medio porque UNA sola vuelta sobre semillas consecutivas devuelve
// numeros consecutivos: el ruido saldria una rampa suave, que es justo lo contrario de un dither.
function azar (n) {
  let s = (Math.imul(n >>> 0, 2654435761) + SEMILLA) >>> 0
  s = (Math.imul(s, 1664525) + 1013904223) >>> 0
  s = (Math.imul(s ^ (s >>> 16), 1664525) + 1013904223) >>> 0
  return s / 4294967296
}

// ============================================================================ el degradado de la pildora
//
// REGLA DEL EMPALME: el punto se usa TRES veces —el punto que entra y las dos tapas— asi que el color
// tiene que depender de una coordenada que NO cambie entre las partes. Si el degradado fuera diagonal,
// el circulo tendria su lado claro a la izquierda; la tapa DERECHA, que es el mismo PNG, tambien lo
// tendria a la izquierda, o sea en el medio de la pildora: un disco mas claro pegado al centro que
// delata que la pildora son tres piezas. Vertical, las tres comparten la misma direccion de luz.
//
// Y para que "vertical" alcance, los tres lienzos tienen que medir LO MISMO DE ALTO y usar el MISMO k:
// el color de la fila 317 tiene que ser el mismo numero en los tres archivos. Por eso el alto es una
// constante compartida y hay una comprobacion abajo que se niega a construir si dejan de coincidir.
const ALTO_PILDORA = 220
const K_PILDORA = 4
const D_PUNTO = 220        // el circulo es pleno: diametro = alto del lienzo, tangente a los cuatro bordes
const W_BARRA = 520

const PARADAS = [
  [0.0, hex2rgb(P.naranjaClaro)],
  [0.5, hex2rgb(P.naranja)],
  [1.0, hex2rgb(P.naranjaHondo)],
]
function mezclaParadas (t) {
  t = Math.max(0, Math.min(1, t))
  for (let i = 1; i < PARADAS.length; i++) {
    if (t <= PARADAS[i][0]) {
      const [t0, c0] = PARADAS[i - 1]
      const [t1, c1] = PARADAS[i]
      const u = (t - t0) / (t1 - t0)
      return [0, 1, 2].map(j => c0[j] + (c1[j] - c0[j]) * u)
    }
  }
  return PARADAS[PARADAS.length - 1][1].slice()
}

// El color de UNA fila nativa. Se calcula a mano en vez de usar `createLinearGradient` por dos motivos,
// y ninguno es capricho:
//   1. control exacto — el gradiente de canvas interpola donde quiere; asi la fila 317 del circulo y la
//      fila 317 de la barra son el MISMO calculo, no dos aproximaciones parecidas.
//   2. dither — de #FF8A5C a #D93A0E el verde recorre 61 niveles en 880 filas, o sea cambia de valor
//      cada 14 filas: bandas horizontales de 14 px sobre una forma naranja grande y lisa. Sumandole
//      medio nivel de ruido antes de redondear, el redondeo se vuelve probabilistico y la banda se
//      disuelve. Es dither de verdad, no "textura".
function filaNaranja (y, alto) {
  const c = mezclaParadas((y + 0.5) / alto)
  const v = c.map((canal, i) => Math.max(0, Math.min(255, Math.round(canal + azar(y * 3 + i) - 0.5))))
  return `rgb(${v[0]},${v[1]},${v[2]})`
}

// Pinta la figura con el degradado vertical, fila por fila, en pixeles NATIVOS.
// El truco del `setTransform`: `clip()` guarda la region en espacio de dispositivo, asi que cambiar la
// matriz DESPUES no mueve el recorte. Entonces se define el camino en coordenadas logicas (comodo) y se
// pinta en nativas (una fila = un pixel de verdad, sin filas a medias).
function pintarVertical (g, w, h, k, camino) {
  g.save()
  camino(g)
  g.clip()
  g.setTransform(1, 0, 0, 1, 0, 0)
  const alto = h * k, ancho = w * k
  for (let y = 0; y < alto; y++) {
    g.fillStyle = filaNaranja(y, alto)
    g.fillRect(0, y, ancho, 1)
  }
  g.restore()
}

// ============================================================================ salida
const hechos = []
function guardar (nombre, cv, k, nota) {
  const archivo = `${DESTINO}/${nombre}.png`
  writeFileSync(archivo, cv.toBuffer('image/png'))
  hechos.push({
    nombre: nombre + '.png',
    nativo: `${cv.width}x${cv.height}`,
    logico: `${cv.width / k}x${cv.height / k}`,
    k,
    // La ventana de la regla de nitidez: entre 2x y 4x los pixeles con los que se dibuja. O sea que el
    // ancho en pantalla tiene que caer entre nativo/4 y nativo/2. Se imprime para que sea auditable sin
    // tener que rehacer la cuenta a mano.
    ventana: `${Math.round(cv.width / 4)}-${Math.round(cv.width / 2)} px`,
    kb: statSync(archivo).size / 1024,
    nota,
  })
  return cv
}

// ============================================================================ 1. m-punto
// El punto que entra, y las dos tapas de la pildora. Circulo PLENO: diametro = lado del lienzo, tangente
// a los cuatro bordes. Nada de dejarle un margen "por prolijidad" — si el circulo midiera 216 en un
// lienzo de 220 y la barra siguiera midiendo 220 de alto, la union daria un escaloncito de 2 px arriba y
// abajo de cada empalme, que a k=4 son 8 pixeles nativos bien visibles.
const cvPunto = (() => {
  const [cv, g] = lienzo(D_PUNTO, D_PUNTO, K_PILDORA)
  pintarVertical(g, D_PUNTO, D_PUNTO, K_PILDORA, gg => {
    gg.beginPath(); gg.arc(D_PUNTO / 2, D_PUNTO / 2, D_PUNTO / 2, 0, Math.PI * 2)
  })
  return guardar('m-punto', cv, K_PILDORA, 'el punto y las dos tapas de la pildora')
})()

// ============================================================================ 2. m-punto-tinta
// MISMO lienzo, MISMAS coordenadas, tinta plana. Que sea el mismo lienzo no es prolijidad: es lo que
// permite que en el motor la sombra sea la misma capa con el mismo anclaje y un desplazamiento en X/Y.
// Si el lienzo fuera mas chico habria que compensar el centro, y esa compensacion se olvida siempre.
{
  const [cv, g] = lienzo(D_PUNTO, D_PUNTO, K_PILDORA)
  g.beginPath(); g.arc(D_PUNTO / 2, D_PUNTO / 2, D_PUNTO / 2, 0, Math.PI * 2)
  g.fillStyle = SOMBRA_DURA; g.fill()
  guardar('m-punto-tinta', cv, K_PILDORA, 'sombra dura del punto (opaca: se superpone sin acumular)')
}

// ============================================================================ 3. m-barra
// El centro de la pildora. Lisa, sin esquinas: los extremos los tapan los dos circulos, asi que se puede
// estirar en X sin deformar ningun radio.
//
// MIDE 520 DE ANCHO Y NO 220 POR NITIDEZ, no por diseno. Estirar una barra lisa es gratis en forma pero
// NO en pixeles: a 220 logicos son 880 nativos, y si la pildora se abre hasta unos 1000 px de pantalla
// la barra queda en 0,9x — borrosa. A 520 son 2080 nativos, o sea 2,08x en el peor caso (la pildora
// abierta del todo) y 4x cerrada. Justo adentro de la ventana.
if (ALTO_PILDORA !== D_PUNTO) {
  throw new Error(`el punto (${D_PUNTO}) y la barra (${ALTO_PILDORA}) tienen que medir lo mismo de alto o el empalme de la pildora se ve`)
}
const cvBarra = (() => {
  const [cv, g] = lienzo(W_BARRA, ALTO_PILDORA, K_PILDORA)
  pintarVertical(g, W_BARRA, ALTO_PILDORA, K_PILDORA, gg => {
    gg.beginPath(); gg.rect(0, 0, W_BARRA, ALTO_PILDORA)
  })
  return guardar('m-barra', cv, K_PILDORA, 'centro de la pildora, se estira en X')
})()

// ============================================================================ 4. m-barra-tinta
{
  const [cv, g] = lienzo(W_BARRA, ALTO_PILDORA, K_PILDORA)
  g.fillStyle = SOMBRA_DURA; g.fillRect(0, 0, W_BARRA, ALTO_PILDORA)
  guardar('m-barra-tinta', cv, K_PILDORA, 'sombra dura de la barra (opaca, ver SOMBRA_DURA)')
}

// ============================================================================ 5. m-placa
//
// POR QUE LA PLACA NO LLEVA SOMBRA HORNEADA, que es la pregunta obvia mirando el archivo:
// una sombra desenfocada necesita margen en el lienzo — 3x el desenfoque, o la caida se corta contra el
// borde y queda un rectangulo visible alrededor de la nada. Pero el canto (`m-placa-canto`) mide 380 de
// alto, o sea LA ALTURA ENTERA de este lienzo: la placa tiene que llegar borde a borde para que el canto
// empalme. Margen y canto no entran los dos. Se elige el canto, que es lo que la vuelve un objeto.
// Ademas la placa se DUPLICA Y SE APILA, y una sombra horneada se apilaria con ella, oscureciendo la de
// atras en el lugar equivocado.
const W_PLACA = 560, H_PLACA = 380, R_PLACA = 40, K_PLACA = 3
{
  const [cv, g] = lienzo(W_PLACA, H_PLACA, K_PLACA)
  // El borde es de 2 px CENTRADO sobre el camino, asi que el camino va a 1 px de adentro y el trazo cae
  // justo entre 0 y 2. Dibujado sobre el borde exacto del lienzo se perderia la mitad de afuera y el
  // borde se veria de 1 px — el clasico "puse 2 y se ve mas finito".
  ruta(g, 1, 1, W_PLACA - 2, H_PLACA - 2, R_PLACA)
  g.fillStyle = BLANCO; g.fill()

  // La banda naranja de 10 px, recortada contra el camino de la tarjeta para que se coma las esquinas
  // redondeadas en vez de asomar por afuera. Adentro de esos 10 px va un degradado vertical con las
  // paradas de arriba de la pildora (claro -> naranja): asi la luz de la banda apunta para el mismo lado
  // que la de la pildora, que es lo unico que hace que las dos formas parezcan del mismo mundo.
  g.save()
  ruta(g, 1, 1, W_PLACA - 2, H_PLACA - 2, R_PLACA); g.clip()
  const banda = g.createLinearGradient(0, 0, 0, 10)
  banda.addColorStop(0, P.naranjaClaro); banda.addColorStop(1, P.naranja)
  g.fillStyle = banda; g.fillRect(0, 0, W_PLACA, 10)
  g.restore()

  // ================================ LO QUE HAY ADENTRO DE LA TARJETA
  //
  // ESTUVO VACIA Y ESO CONVERTIA UN ACTO ENTERO EN NADA. La placa se duplica seis veces y el acto F son
  // esas seis abriendose en profundidad: abriendo el cuadro 470 lo que hay es una pila de TARJETAS EN
  // BLANCO. Ninguna compuerta lo puede decir —las seis estan en cuadro, se mueven, tienen contraste
  // contra el papel y no chocan con nada— y es exactamente el defecto que dejo vacia a la PIEZA-J.
  //
  // Y no alcanza con "ponerle algo": la pieza cuenta que una web se convierte en VIDEOS, asi que la
  // tarjeta tiene que ser un video. Miniatura, triangulo de reproducir, titulo, y la chapita de
  // duracion abajo a la derecha de la miniatura, que es donde la pone todo el mundo. Seis de estas
  // apiladas dicen "muchos videos", que es el remate del argumento.
  const MI = { x: 26, y: 34, w: 508, h: 196, r: 14 }
  ruta(g, MI.x, MI.y, MI.w, MI.h, MI.r)
  g.fillStyle = P.papel2; g.fill()

  // la colina, el mismo recurso visual que usan las imagenes de la web falsa: es lo que hace que la
  // tarjeta parezca sacada de ese mundo y no pegada de otro lado
  g.save()
  ruta(g, MI.x, MI.y, MI.w, MI.h, MI.r); g.clip()
  g.beginPath()
  g.ellipse(MI.x + MI.w * 0.42, MI.y + MI.h * 1.06, MI.w * 0.46, MI.h * 0.62, 0, 0, Math.PI * 2)
  g.fillStyle = mezclaHex(P.grisClaro, P.papel2, 0.45); g.fill()
  g.beginPath()
  g.ellipse(MI.x + MI.w * 0.78, MI.y + MI.h * 1.12, MI.w * 0.38, MI.h * 0.54, 0, 0, Math.PI * 2)
  g.fillStyle = mezclaHex(P.grisClaro, P.papel2, 0.7); g.fill()
  g.restore()

  // el triangulo de reproducir, con las puntas redondeadas: a 60 px de pantalla un vertice vivo se
  // ensucia con el suavizado, que es la misma razon por la que el triangulo de la marca usa `poligono`
  {
    const cx = MI.x + MI.w / 2, cy = MI.y + MI.h / 2, R = 30
    g.beginPath(); g.arc(cx, cy, R + 14, 0, Math.PI * 2)
    g.fillStyle = 'rgba(255,255,255,0.92)'; g.fill()
    poligonoRedondo(g, [[cx - R * 0.46, cy - R * 0.62], [cx + R * 0.66, cy], [cx - R * 0.46, cy + R * 0.62]], 4)
    g.fillStyle = P.naranja; g.fill()
  }

  // la chapita de duracion
  ruta(g, MI.x + MI.w - 76, MI.y + MI.h - 40, 58, 24, 7)
  g.fillStyle = 'rgba(14,14,16,0.55)'; g.fill()
  ruta(g, MI.x + MI.w - 68, MI.y + MI.h - 31, 42, 6, 3)
  g.fillStyle = 'rgba(255,255,255,0.9)'; g.fill()

  // titulo y bajada
  ruta(g, 26, 258, 296, 18, 9); g.fillStyle = P.gris; g.fill()
  ruta(g, 26, 292, 188, 14, 7); g.fillStyle = P.grisClaro; g.fill()
  ruta(g, 26, 322, 240, 14, 7); g.fillStyle = mezclaHex(P.grisClaro, BLANCO, 0.45); g.fill()

  // El borde va ULTIMO para que pase por encima de la banda: si fuera al reves, la banda le taparia los
  // 10 px de arriba y el contorno quedaria abierto justo en la parte mas visible.
  ruta(g, 1, 1, W_PLACA - 2, H_PLACA - 2, R_PLACA)
  g.strokeStyle = P.grisClaro; g.lineWidth = 2; g.stroke()

  // NO lleva grano de papel horneado, aunque el blanco liso se vea muerto. A 1680x1140 serian 1,9
  // millones de pixeles de ruido, y el PNG predice cada pixel del anterior: el ruido no se predice, asi
  // que el archivo pasaria de unas decenas de KB a varios MB. El grano de la pieza va aparte, en un
  // lienzo chico y encima de todo.
  guardar('m-placa', cv, K_PLACA, 'tarjeta que se duplica y se apila')
}

// ============================================================================ 6. m-placa-canto
//
// El canto es lo que vuelve la placa un objeto y no una calcomania. Y su silueta NO es un rectangulo de
// 16x380, aunque el lienzo mida eso.
//
// La placa tiene esquinas de radio 40. Un canto recto pegado a su derecha asomaria por arriba y por
// abajo de la curva — cuatro cuernitos, el defecto tipico del "borde 3D" hecho a ojo. La forma correcta
// sale de la geometria: el canto es la cara lateral de una extrusion, y en la esquina esa cara GIRA
// hasta quedar de perfil, asi que su ancho proyectado se va a cero. Por fila:
//
//   a(y)     = cuanto avanzo la curva de la placa en ese renglon (0 en la punta, 40 en el tramo recto)
//   izq(y)   = a - 40   -> donde empieza el canto, tomando 0 = borde derecho de la placa
//   ancho(y) = 16 * a/40 -> la profundidad que todavia se ve de frente
//
// En el tramo recto da izq=0, ancho=16: el rectangulo de siempre. En la esquina se va corriendo hacia
// afuera del lienzo y adelgazando, y el resultado es una hoja que apoya exacta contra la curva.
const W_CANTO = 16, H_CANTO = 380
if (H_CANTO !== H_PLACA) {
  throw new Error(`el canto (${H_CANTO}) y la placa (${H_PLACA}) tienen que medir lo mismo de alto`)
}
{
  const [cv, g] = lienzo(W_CANTO, H_CANTO, K_PLACA)
  g.setTransform(1, 0, 0, 1, 0, 0)   // el resto de este bloque trabaja en pixeles nativos
  // Degradado horizontal: claro donde nace, contra el frente de la placa (ahi el doblez todavia agarra
  // luz), y gris pleno en el filo de afuera, que es la parte que ya mira para otro lado. Sin este salto
  // el canto se lee como una segunda tarjeta gris pegada al costado.
  const gr = g.createLinearGradient(0, 0, W_CANTO * K_PLACA, 0)
  gr.addColorStop(0, P.papel2)
  gr.addColorStop(0.42, P.grisClaro)
  gr.addColorStop(1, P.gris)
  g.fillStyle = gr

  for (let yn = 0; yn < H_CANTO * K_PLACA; yn++) {
    const y = (yn + 0.5) / K_PLACA
    let a
    if (y < R_PLACA) a = Math.sqrt(Math.max(0, R_PLACA * R_PLACA - (R_PLACA - y) ** 2))
    else if (y > H_CANTO - R_PLACA) a = Math.sqrt(Math.max(0, R_PLACA * R_PLACA - (y - (H_CANTO - R_PLACA)) ** 2))
    else a = R_PLACA
    const izq = a - R_PLACA
    const x0 = Math.max(0, izq)
    const x1 = Math.min(W_CANTO, izq + W_CANTO * (a / R_PLACA))
    if (x1 <= x0) continue                       // en la punta de la esquina el canto no se ve
    g.fillRect(x0 * K_PLACA, yn, (x1 - x0) * K_PLACA, 1)
  }
  guardar('m-placa-canto', cv, K_PLACA, 'cara lateral de la placa; va pegado a su borde derecho')
}

// ============================================================================ 7. m-marca
//
// La marca de Urvid. Cuadrado naranja de esquinas muy redondeadas con el triangulo de reproduccion
// blanco adentro. Tiene que ser reconocible a 60 px de pantalla, y eso manda dos decisiones:
//   - el triangulo ocupa casi la mitad del cuadrado. Un glifo chico y elegante a 60 px es una mancha.
//   - las puntas van redondeadas (ver `poligonoRedondo`).
//
// ESTA SI LLEVA SOMBRA DESENFOCADA, y es la unica. Es la unica forma de la pieza que APOYA sobre el
// papel y se queda quieta (el cierre), asi que la sombra no tiene que seguir a nadie. Y la cuenta del
// margen, que es donde se rompe siempre:
//
//   `shadowBlur` y `shadowOffset` NO los escala la matriz de transformacion — van en pixeles NATIVOS,
//   aunque el contexto este escalado por k. Entonces el margen que hace falta, medido en las unidades
//   LOGICAS en las que dibujo, se DIVIDE por k:
//
//     margen_logico = (3 * desenfoque_nativo + corrimiento_nativo) / k
//                   = (3 * 26 + 10) / 4 = 22
//
// Con menos de eso la caida se corta contra el borde del lienzo y queda un rectangulo visible alrededor
// del cuadrado, que es el defecto que mas veces se confundio con "la sombra quedo dura".
const W_MARCA = 260, K_MARCA = 4
{
  const DESENFOQUE = 26, CORRIMIENTO = 10                       // nativos
  const MARGEN = (3 * DESENFOQUE + CORRIMIENTO) / K_MARCA       // logicos -> 22
  const LADO = W_MARCA - MARGEN * 2                             // 216
  const [cv, g] = lienzo(W_MARCA, W_MARCA, K_MARCA)

  g.save()
  g.shadowColor = rgba(P.tinta, 0.18)
  g.shadowBlur = DESENFOQUE
  g.shadowOffsetY = CORRIMIENTO
  ruta(g, MARGEN, MARGEN, LADO, LADO, LADO * 0.24)   // 24% del lado: la proporcion de icono de app
  // Mismas paradas que la pildora. No es un segundo acento: es la misma familia de naranja con la misma
  // luz desde arriba, para que la marca pertenezca al mismo mundo que las formas que la pieza anima.
  const gr = g.createLinearGradient(0, MARGEN, 0, MARGEN + LADO)
  gr.addColorStop(0, P.naranjaClaro); gr.addColorStop(0.5, P.naranja); gr.addColorStop(1, P.naranjaHondo)
  g.fillStyle = gr; g.fill()
  g.restore()                                         // saca la sombra: el triangulo no proyecta nada

  // El triangulo NO se centra por su caja. Un triangulo que apunta a la derecha tiene dos tercios de su
  // tinta pegados a la base, asi que centrado por la caja se lee corrido a la IZQUIERDA. La correccion
  // clasica es centrarlo por el CENTROIDE, que en un triangulo esta a 1/3 de la base — o sea correrlo a
  // la derecha `tw/2 - tw/3 = tw/6`.
  //
  // Y la correccion entera se pasa: con `tw/6` el triangulo queda visiblemente pegado a la derecha del
  // cuadrado. Esto NO es una deduccion, es lo que se ve abriendo el PNG — el ojo no balancea solo por
  // masa de tinta, tambien mira la caja, asi que lo que queda centrado es el promedio de los dos
  // criterios. Se aplica el 65% del corrimiento, que es donde deja de leerse cargado para ningun lado.
  const c = W_MARCA / 2
  const tw = LADO * 0.39, th = LADO * 0.45
  const x0 = c - tw / 2 + (tw / 6) * 0.65, y0 = c - th / 2
  poligonoRedondo(g, [[x0, y0], [x0 + tw, y0 + th / 2], [x0, y0 + th]], LADO * 0.042)
  g.fillStyle = BLANCO; g.fill()

  guardar('m-marca', cv, K_MARCA, 'la marca; el cuadrado ocupa 216 de los 260 (22 de margen por la sombra)')
}

// ============================================================================ comprobaciones
// No son adorno: son las tres cosas que ya salieron mal en recursos parecidos y que no se ven hasta que
// el video esta armado. Si alguna falla, el modulo revienta ACA y no dentro de un render de 20 minutos.
{
  const gp = cvPunto.getContext('2d'), gb = cvBarra.getContext('2d')
  const px = (g, x, y) => Array.from(g.getImageData(x, y, 1, 1).data)

  // (a) el circulo esta lleno de naranja y las esquinas del lienzo estan VACIAS. Si la esquina tuviera
  //     tinta, el "circulo" seria en realidad un rectangulo redondeado y el empalme de la pildora
  //     mostraria un hombro.
  const centro = px(gp, 440, 440)
  if (!(centro[3] === 255 && centro[0] > 200 && centro[2] < 120)) {
    throw new Error('m-punto: el centro no quedo naranja opaco -> ' + centro)
  }
  if (px(gp, 3, 3)[3] !== 0) throw new Error('m-punto: la esquina del lienzo no quedo transparente')

  // (b) LA COMPROBACION DEL EMPALME. La fila N del punto y la fila N de la barra tienen que ser el MISMO
  //     color, bit a bit. Si algun dia alguien cambia el alto de uno de los dos, o pasa el dither a un
  //     flujo, esto falla y dice por que — en vez de aparecer como una costura en el video.
  for (const y of [4, 97, 317, 440, 661, 875]) {
    const a = px(gp, 440, y), b = px(gb, 1040, y)
    if (a[0] !== b[0] || a[1] !== b[1] || a[2] !== b[2]) {
      throw new Error(`empalme roto en la fila ${y}: punto ${a.slice(0, 3)} vs barra ${b.slice(0, 3)}`)
    }
  }

  // (c) el dither existe de verdad. Dos filas vecinas del tramo llano tienen que poder diferir; si el
  //     ruido se anulara (por ejemplo si `azar` devolviera siempre lo mismo) esto no lo notaria nadie
  //     hasta ver bandas en el video.
  let distintas = 0
  for (let y = 200; y < 700; y++) {
    const a = px(gb, 1040, y), b = px(gb, 1040, y + 1)
    if (a[1] !== b[1] || a[2] !== b[2]) distintas++
  }
  if (distintas < 100) throw new Error(`el dither no esta trabajando: solo ${distintas} filas vecinas difieren de 500`)
}

// ============================================================================ el informe
console.log(`\nrecursos-m / objetos  ->  ${DESTINO}`)
const anchoNombre = Math.max(...hechos.map(h => h.nombre.length))
for (const h of hechos) {
  console.log(
    '  ' + h.nombre.padEnd(anchoNombre) +
    '  ' + h.nativo.padEnd(10) +
    '  (' + h.logico + ' x' + h.k + ')'.padEnd(2) +
    '  se dibuja a ' + h.ventana.padEnd(11) +
    '  ' + h.kb.toFixed(1).padStart(7) + ' KB' +
    '   ' + h.nota
  )
}
console.log(`  ${hechos.length} recurso(s) · ${(hechos.reduce((s, h) => s + h.kb, 0) / 1024).toFixed(2)} MB en total`)
console.log('  "se dibuja a" = la ventana de 2x-4x: el ancho en pantalla tiene que caer ahi adentro.\n')
