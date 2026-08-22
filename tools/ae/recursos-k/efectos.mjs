// LO QUE BRILLA Y LO QUE ESTALLA — PIEZA-K.
//
// Tres familias que el motor no puede fabricar en vivo y que acá salen horneadas:
//
//   1. LA BARRA DE PROGRESO   cama + relleno + cabezal + halo, y despues pastilla + rastro.
//   2. LA INSIGNIA DEL FINAL  el disco, SIN el tilde adentro.
//   3. LO QUE ESTALLA         seis papelitos de confeti, la chispa y su estela.
//
// TRES COSAS QUE MANDAN SOBRE EL DISEÑO DE ESTE ARCHIVO Y NO SON ESTETICAS:
//
// · LA CAMA Y EL RELLENO SON EL MISMO LIENZO CON LAS MISMAS COORDENADAS. No es prolijidad: es la unica
//   forma de que dos PNG se puedan apilar y cruzar. Un relleno de 880x54 sobre una cama de 900x60
//   obligaria a compensar la diferencia a mano en el motor, y esa cuenta se hace mal una vez y queda
//   corrida para siempre. El relleno se dibuja COMPLETO —los 900 px— porque en la pieza se escala en X
//   desde el ancla izquierda; dibujarlo "al 40%" seria hornear un estado de algo que se mueve, que es
//   justo lo que un PNG no puede hacer.
//
// · LO QUE VA EN MODO AÑADIR NO PUEDE TENER NADA OSCURO. En Añadir el negro es invisible pero un gris
//   sucio levanta el fondo entero, asi que halo, cabezal y estela son celestes sobre transparente y
//   llegan a alfa CERO adentro del lienzo, nunca contra el borde: una parada de alfa 0,02 cortada por el
//   canto se ve como un rectangulo fantasma flotando sobre el fondo lavanda.
//
// · shadowBlur Y shadowOffsetY VAN EN PIXELES DEL BITMAP, no en coordenadas logicas. `lienzoK` aplica un
//   `scale(k,k)`, y ese scale NO toca a ninguno de los dos. Lo del desenfoque ya estaba medido en
//   fondo.mjs; el del desplazamiento lo MEDI acá antes de escribir esto, con un rectangulo logico en
//   (10,10,10,10) a k=2 y offsetY 10: la sombra aparecio en el bitmap 30..50 (o sea 10 px del bitmap) y
//   no en 40..60. Por eso existe `sombraK`, que multiplica los dos por k y deja que el resto del archivo
//   piense en unidades logicas.
//
// USO
//   node tools/ae/recursos-k/efectos.mjs

import {
  P, lienzoK, guardar, rgba, ruta, lineal, radial, sombra, margenDe, azar, informe,
} from './lib.mjs'

const lista = []

// ================================================================ utiles locales

// Sombra pensada en unidades LOGICAS. Ver la nota de arriba: sin este ajuste, a k=2 una sombra "de 14"
// sale de 7 y una bajada "de 8" sale de 4 — la mitad, en silencio y sin error.
function sombraK (g, dibujarRuta, o, k) {
  sombra(g, dibujarRuta, { ...o, desenfoque: o.desenfoque * k, bajada: o.bajada * k })
}

// El tamaño del lienzo de estos recursos lo fija el motor, asi que cuando una sombra no entra no se
// puede agrandar el PNG: hay que meter el objeto para adentro. Esto tira ANTES de dibujar, porque una
// caida cortada contra el canto se ve como un filo recto alrededor del objeto y es de las cosas que uno
// mira diez veces sin darse cuenta de que es el margen.
function comprobarMargen (nombre, W, H, x, y, w, h, desenfoque, bajada) {
  const m = margenDe(desenfoque)
  const faltas = []
  const pide = (lado, hay, min) => { if (hay < min) faltas.push(`${lado}: hay ${hay}, hacen falta ${min}`) }
  pide('izquierda', x, m)
  pide('derecha', W - (x + w), m)
  pide('arriba', y, m - bajada)          // la sombra baja, asi que arriba necesita menos
  pide('abajo', H - (y + h), m + bajada) // y abajo necesita el desplazamiento tambien
  if (faltas.length) {
    throw new Error(`${nombre}: la caida de la sombra se corta contra el borde del lienzo · ${faltas.join(' · ')}`)
  }
}

// Elipse con degradado radial. `createRadialGradient` solo hace circulos: la elipse sale de achatar el
// sistema de coordenadas antes de crear el degradado, porque el degradado se define en espacio de
// usuario y la matriz lo deforma junto con la ruta.
function resplandor (g, cx, cy, rx, ry, paradas) {
  g.save()
  g.translate(cx, cy); g.scale(1, ry / rx)
  g.fillStyle = radial(g, 0, 0, 0, rx, paradas)
  g.beginPath(); g.arc(0, 0, rx, 0, Math.PI * 2); g.fill()
  g.restore()
}

// MULTIPLICAR UN PERFIL HORIZONTAL POR UNO VERTICAL, que es como se construye una mancha alargada sin
// que se le note la forma de elipse. Se pinta el perfil horizontal en todo el lienzo y despues se
// recorta con `destination-in` usando el vertical: el alfa final es el producto de los dos. Es mas
// controlable que apilar tres elipses (que dejan bultos donde se solapan) y garantiza el cero en los
// cuatro bordes, que es la condicion de Añadir.
function mascaraVertical (g, w, h, paradas) {
  g.save()
  g.globalCompositeOperation = 'destination-in'
  g.fillStyle = lineal(g, 0, 0, 0, h, paradas)
  g.fillRect(0, 0, w, h)
  g.restore()
}

// UNA COLA QUE SE AFINA, que es lo unico que el producto de dos perfiles NO sabe hacer: ese da una
// mancha de ancho constante, y una estela de ancho constante no es una estela, es una barra borrosa.
// Se apilan bocanadas elipticas a lo largo del eje, cada una mas chica y mas floja que la anterior.
// Van en 'source-over' y no en 'lighter' a proposito: apiladas normalmente el alfa se acumula como
// 1-(1-a)^n, que NUNCA se pasa de 1 y crece parejo; sumando, el nucleo se clava en opaco enseguida y el
// unico control que queda es bajar tanto el alfa que la cola desaparece.
// Devuelve la caja que ocupo DE VERDAD, para poder comprobar despues que no llego a ningun canto.
function cola (g, o) {
  const caja = { izq: Infinity, der: -Infinity, arr: Infinity, aba: -Infinity }
  for (let i = 0; i < o.pasos; i++) {
    const t = i / (o.pasos - 1)                       // 0 en la cabeza, 1 en la punta
    const x = o.cabeza - t * (o.cabeza - o.punta)
    const ry = o.ry * Math.pow(1 - t, 0.58) + 1.5     // exponente <1: conserva cuerpo cerca de la cabeza
    const rx = ry * o.ancho                           // cada bocanada es mas ancha que alta: va en X
    const a = o.alfa * Math.pow(1 - t, 1.5)
    const c = o.color(t)
    resplandor(g, x, o.eje, rx, ry, [
      [0, c, a], [0.34, c, a * 0.62], [0.62, c, a * 0.26], [0.84, c, a * 0.06], [1, c, 0],
    ])
    caja.izq = Math.min(caja.izq, x - rx); caja.der = Math.max(caja.der, x + rx)
    caja.arr = Math.min(caja.arr, o.eje - ry); caja.aba = Math.max(caja.aba, o.eje + ry)
  }
  return caja
}

// Que nada toque el canto no se razona, se mide. Un degradado cortado por el borde del lienzo deja un
// filo recto, y en una capa difusa ese filo es el defecto mas caro de este archivo: no se lee como "el
// resplandor esta cortado" sino como "hay un rectangulo flotando", que manda a buscar el problema en el
// motor.
function comprobarCanto (nombre, W, H, caja, minimo) {
  const afuera = Object.entries({
    izquierda: caja.izq, arriba: caja.arr, derecha: W - caja.der, abajo: H - caja.aba,
  }).filter(([, v]) => v < minimo)
  if (afuera.length) {
    throw new Error(`${nombre}: el resplandor llega al borde (${afuera.map(([k, v]) => `${k} ${v.toFixed(1)} px, minimo ${minimo}`).join(' · ')})`)
  }
}

// mezcla hacia el blanco en hex. Se trabaja sobre la CADENA, nunca sobre canales de un objeto de color:
// en este repo ya costo caro leer canales que venian en otro espacio.
const aclarar = (hex, t) => '#' + [1, 3, 5]
  .map(i => Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - t) + 255 * t))
  .map(v => v.toString(16).padStart(2, '0')).join('')

// ================================================================ 1. LA BARRA
//
// La cama y el relleno comparten TODO: lienzo, k, y estas cuatro constantes. Estan afuera de los dos
// bloques justamente para que no puedan divergir.
const BW = 900, BH = 60, BK = 2
const BR = BH / 2   // pastilla perfecta: el radio es media altura, asi los extremos son semicirculos

// ---------------------------------------------------------------- 1a. la cama
// El gris va de mas oscuro arriba a mas claro abajo, al reves de lo que uno pondria en un boton. Es a
// proposito: una canaleta hundida recibe menos luz en el borde de arriba, y ese medio tono de diferencia
// es lo unico que hace que el riel se lea como un hueco y no como una pastilla gris apoyada.
{
  const [cv, g] = lienzoK(BW, BH, BK)
  ruta(g, 0, 0, BW, BH, BR)
  g.fillStyle = lineal(g, 0, 0, 0, BH, [[0, '#DFE2EE'], [0.55, '#E9EBF4'], [1, '#F1F2F9']])
  g.fill()
  lista.push(guardar('barra-cama', cv))
}

// ---------------------------------------------------------------- 1b. el relleno
// LOS DOS EXTREMOS VAN REDONDEADOS, no solo el derecho, y la razon es lo que pasa al escalarlo. En la
// pieza esta capa se estira en X desde el ancla izquierda: con el extremo izquierdo cuadrado, las dos
// esquinas asomarian por fuera del casquete redondo de la cama SIEMPRE, en todos los cuadros. Redondeado
// encastra exacto al 100%, y mientras la barra esta llena a medias lo unico que se ve es que el casquete
// izquierdo del relleno queda un poco mas chato que el del riel — un detalle que dura lo que dura el
// llenado, contra un defecto permanente.
//
// El degradado tambien se estira con la capa, y eso es lo que se busca: el cabezal es el punto mas cian
// de la barra en cualquier momento del llenado, no recien al final.
{
  const [cv, g] = lienzoK(BW, BH, BK)
  ruta(g, 0, 0, BW, BH, BR)
  g.save(); g.clip()

  g.fillStyle = lineal(g, 0, 0, BW, 0, [
    [0, P.violeta], [0.42, '#5A87F6'], [0.74, P.azul], [1, P.cian],
  ])
  g.fillRect(0, 0, BW, BH)

  // el reflejo de arriba. Sin esto el relleno es una franja plana; con esto tiene volumen, que es lo que
  // separa una barra de referencia de una barra dibujada.
  g.fillStyle = lineal(g, 0, 0, 0, BH * 0.62, [
    [0, '#FFFFFF', 0.30], [0.45, '#FFFFFF', 0.10], [1, '#FFFFFF', 0],
  ])
  g.fillRect(0, 0, BW, BH * 0.62)

  g.restore()
  lista.push(guardar('barra-relleno', cv))
}

// ---------------------------------------------------------------- 1c. el cabezal
// Nucleo para modo Añadir: blanco al centro, cian afuera, cero antes del borde. El radio (46) es menor
// que el medio lienzo (50) para que quede un anillo de pixeles COMPLETAMENTE vacios alrededor: en Añadir
// una ultima parada de alfa 0,01 pegada al canto se ve como un cuadrado tenue, y se ve siempre.
{
  const W = 100, K = 2
  const [cv, g] = lienzoK(W, W, K)
  resplandor(g, W / 2, W / 2, 46, 46, [
    [0, '#FFFFFF', 1], [0.10, '#F0FEFF', 0.92], [0.24, P.cianClaro, 0.60],
    [0.46, P.cian, 0.24], [0.70, P.cian, 0.07], [0.88, P.cian, 0.015], [1, P.cian, 0],
  ])
  lista.push(guardar('barra-cabeza', cv))
}

// ---------------------------------------------------------------- 1d. el halo
// k=1 y no da lastima: acá no hay un solo borde que se pueda ver pixelado. Es una mancha difusa cuyo
// gradiente mas empinado cambia de valor cada varias decenas de pixeles, asi que multiplicar los
// pixeles nativos no agregaria informacion, solo peso.
//
// El perfil horizontal tiene MESETA: el halo de una barra llena es parejo a lo largo y se apaga en las
// puntas, no un bulto en el medio. Eso no lo da una elipse, lo da el producto de dos perfiles.
// El vertical tiene el pico ARRIBA del centro (34%) y la cola larga para abajo, porque lo que se dibuja
// es luz que cae DEBAJO de la barra.
//
// EL PERFIL VERTICAL ES UNA AGUJA, NO UNA CAMPANA, y eso lo decidio una cuenta, no el gusto. Sobre el
// fondo de la pieza (#F4F2FC = 244,242,252) en modo Añadir, el alfa a partir del cual cada canal se clava
// en 255 es: R 0,060 · G 0,055 · B 0,012. O sea que CUALQUIER resplandor visible sobre este fondo satura;
// no hay un alfa "prolijo" que tiña de cian sin blanquear, porque el azul ya esta a 252.
//
// La primera version ignoraba eso: meseta al 0,50 y una campana ancha. Resultado sobre la hoja de
// contacto: una PLANCHA BLANCA de 900x84 con los cantos a la vista. Y la respuesta no es bajar el alfa
// hasta que no sature —a 0,012 el halo directamente no existe— sino ACHICAR EL NUCLEO. Un resplandor
// real tiene el centro quemado; lo que lo hace parecer luz es la caida. Con esta aguja el tramo saturado
// es una franja de ~10 px pegada a la barra y el resto del lienzo vive en la banda 0-0,06, que es
// justamente donde el ojo todavia ve degradado.
{
  const W = 900, H = 200, K = 1
  const [cv, g] = lienzoK(W, H, K)

  g.fillStyle = lineal(g, 0, 0, W, 0, [
    [0, P.cian, 0], [0.07, P.cian, 0.06], [0.18, P.cianClaro, 0.20],
    [0.34, '#A9EBFF', 0.28], [0.50, '#B6EEFF', 0.30], [0.66, '#A9EBFF', 0.28],
    [0.82, P.cianClaro, 0.20], [0.93, P.cian, 0.06], [1, P.cian, 0],
  ])
  g.fillRect(0, 0, W, H)

  mascaraVertical(g, W, H, [
    [0, '#FFFFFF', 0], [0.18, '#FFFFFF', 0.02], [0.26, '#FFFFFF', 0.20],
    [0.30, '#FFFFFF', 1], [0.35, '#FFFFFF', 1], [0.40, '#FFFFFF', 0.34],
    [0.47, '#FFFFFF', 0.15], [0.57, '#FFFFFF', 0.06], [0.70, '#FFFFFF', 0.022],
    [0.84, '#FFFFFF', 0.006], [1, '#FFFFFF', 0],
  ])
  lista.push(guardar('barra-halo', cv))
}

// ---------------------------------------------------------------- 1e. la pastilla del final
// Acá el lienzo lo fija el motor (160x60) y la sombra tiene que entrar adentro, asi que la pastilla no
// puede llenarlo: se dibuja 128x28 con aire alrededor. Los numeros no estan elegidos a ojo, los valida
// `comprobarMargen` — si alguien sube el desenfoque a 8 esto tira en vez de entregar un PNG con un filo
// recto abajo.
{
  const W = 160, H = 60, K = 2
  const DES = 5, BAJADA = 3               // sombra suave y BAJA, que es el registro de toda la pieza
  const x = 16, y = 13, w = 128, h = 28
  comprobarMargen('pastilla-final', W, H, x, y, w, h, DES, BAJADA)

  const [cv, g] = lienzoK(W, H, K)
  const camino = () => ruta(g, x, y, w, h, h / 2)

  // la sombra en azul agrisado y no en negro: un negro puro debajo de un celeste sobre fondo lavanda
  // ensucia y se nota enseguida.
  sombraK(g, camino, { color: '#1E5B7A', alfa: 0.26, desenfoque: DES, bajada: BAJADA }, K)

  camino()
  g.fillStyle = lineal(g, x, y, x, y + h, [[0, '#A6EAFF'], [0.55, P.cianClaro], [1, P.cian]])
  g.fill()

  // el mismo reflejo de arriba que el relleno de la barra, en chico: son el mismo objeto en dos momentos
  // y si uno tuviera volumen y el otro no, el encogimiento se leeria como un corte.
  g.save(); camino(); g.clip()
  g.fillStyle = lineal(g, x, y, x, y + h * 0.6, [[0, '#FFFFFF', 0.42], [1, '#FFFFFF', 0]])
  g.fillRect(x, y, w, h * 0.6)
  g.restore()

  lista.push(guardar('pastilla-final', cv))
}

// ---------------------------------------------------------------- 1f. el rastro
// Lo que queda a la izquierda cuando la barra se encoge hacia la pastilla. Acá NO sirve el truco de los
// dos perfiles del halo, y la primera version lo demostro: salio una mancha de 300x60 de ancho parejo,
// o sea una barra palida con los bordes suaves. Un rastro tiene que AFINARSE, porque lo que dice no es
// "hay luz acá" sino "esto venia de allá". Va con `cola`, gordo a la derecha —donde estaba la barra— y
// en punta a la izquierda.
//
// Este NO va en modo Añadir: es palido sobre el fondo lavanda, asi que en normal se lee como un tinte
// cian y en Añadir se lo comeria el fondo casi blanco. Igual llega a cero antes de los cuatro cantos,
// que en normal tambien importa: un corte recto se ve en cualquier modo.
//
// Y VA EN CIAN, NO EN CIAN BLANQUEADO, que es lo contrario de lo que sugiere la palabra "palido". Sobre
// este fondo un #CFF5FF al alfa acumulado de 0,35 da 231,243,253 contra un fondo de 244,242,252: mueve
// TRECE niveles de rojo y uno de los otros dos, o sea que no se ve. El mismo alfa con #3FC7F6 da
// 181,227,250 — sesenta niveles de rojo. Lo palido lo tiene que poner el alfa; el color tiene que estar
// lejos del fondo o no hay rastro que valga.
{
  const W = 300, H = 60, K = 1
  const [cv, g] = lienzoK(W, H, K)
  const caja = cola(g, {
    eje: H / 2, cabeza: 250, punta: 14, ry: 20, ancho: 1.6, alfa: 0.055, pasos: 72,
    color: t => (t < 0.30 ? P.cianClaro : P.cian),
  })
  comprobarCanto('rastro-celeste', W, H, caja, 4)
  lista.push(guardar('rastro-celeste', cv))
}

// ================================================================ 2. LA INSIGNIA
//
// SIN EL TILDE ADENTRO, y no es una simplificacion: el tilde son dos barras que se dibujan solas en la
// pieza porque un recorte de trazado animado —el gesto de que el tilde se escriba— no viaja al motor.
// Horneado, el tilde estaria siempre completo desde el primer cuadro y el remate perderia su unico
// momento de animacion.
//
// El interior queda deliberadamente vacio y muy claro: encima van dos barras y todo lo que se agregue
// acá compite con ellas.
{
  const W = 260, H = 260, K = 2
  const DES = 14, BAJADA = 8
  const R = 84, cx = W / 2, cy = 126     // el centro va 4 px arriba del centro geometrico: la sombra baja
  comprobarMargen('disco-check', W, H, cx - R, cy - R, R * 2, R * 2, DES, BAJADA)

  const [cv, g] = lienzoK(W, H, K)
  const camino = () => { g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.closePath() }

  sombraK(g, camino, { color: '#2A4A75', alfa: 0.26, desenfoque: DES, bajada: BAJADA }, K)

  // blanco arriba a la izquierda, celeste palido abajo a la derecha: la misma direccion de luz que usa
  // el resto de la familia (la luz viene de arriba).
  camino()
  g.fillStyle = lineal(g, cx - R * 0.7, cy - R, cx + R * 0.6, cy + R, [
    [0, '#FFFFFF'], [0.42, '#F6FBFF'], [0.78, '#E4F1FC'], [1, '#D2E8F8'],
  ])
  g.fill()

  // el brillo de arriba, recortado al disco. Sin el, el degradado lineal solo se lee como una placa
  // inclinada; con el, la insignia parece tener una superficie.
  g.save(); camino(); g.clip()
  resplandor(g, cx, cy - R * 0.52, R * 0.95, R * 0.72, [
    [0, '#FFFFFF', 0.85], [0.45, '#FFFFFF', 0.34], [1, '#FFFFFF', 0],
  ])
  g.restore()

  // el filo. 1,5 px logicos de un celeste apenas mas saturado que el borde del degradado: sin filo, el
  // canto inferior derecho del disco se funde con el fondo lavanda y la insignia parece cortada.
  camino()
  g.strokeStyle = rgba('#7FC0E6', 0.42); g.lineWidth = 1.5; g.stroke()

  lista.push(guardar('disco-check', cv))
}

// ================================================================ 3. EL CONFETI
//
// Seis papelitos, uno por color, que en la pieza se reinstancian 36 veces. De ahi salen las dos
// decisiones raras de esta seccion:
//
// · LAS SEIS SILUETAS SON DISTINTAS Y ESTAN ESCRITAS A MANO. Con una sola forma rotada, 36 copias se
//   leen como 36 copias; el ojo caza la repeticion mucho antes en la SILUETA que en el color. Y a mano
//   porque un cuadrilatero sorteado sale casi siempre parecido a un rectangulo — el azar no produce
//   formas interesantes, produce formas promedio.
// · EL TEMBLOR DE LOS VERTICES SI ES SORTEADO, con semilla escrita. Rompe lo que quedaba de simetria en
//   los trazos dibujados a mano sin que haya que pensar cada punto dos veces.
//
// No llevan sombra: son objetos que giran en el aire y una sombra horneada tendria una direccion fija
// que se contradice en cuanto el papelito da media vuelta.
{
  const W = 60, H = 80, K = 2
  const INSET = 4                          // aire para el temblor y para que el antialias no toque el canto
  const bx = INSET, by = INSET, bw = W - INSET * 2, bh = H - INSET * 2

  // Cada figura es una lista de operaciones en coordenadas 0..1 de la caja interior. La 'Q' lleva primero
  // el punto de control. Que un control se pase de 1 no saca la figura del lienzo: una cuadratica se
  // acerca a su control hasta la mitad y nunca lo toca, asi que el control 1,08 de confeti-03 da una
  // panza que llega a 0,945 de la caja. El punto de control es lo unico que NO tiembla, justamente para
  // poder hacer esa cuenta.
  const PAPELES = [
    { n: 'confeti-01', color: P.cian, semilla: 1301, fig: [
      ['M', 0.07, 0.02], ['L', 0.93, 0.15], ['L', 0.86, 0.98], ['L', 0.12, 0.85]] },

    { n: 'confeti-02', color: P.azul, semilla: 2207, fig: [   // angosto y muy inclinado
      ['M', 0.26, 0.00], ['L', 1.00, 0.12], ['L', 0.74, 1.00], ['L', 0.00, 0.88]] },

    { n: 'confeti-03', color: P.azulHondo, semilla: 3313, fig: [   // panza a la derecha
      ['M', 0.10, 0.05], ['L', 0.82, 0.00], ['Q', 1.08, 0.50, 0.80, 0.96], ['L', 0.06, 0.90]] },

    { n: 'confeti-04', color: P.cianClaro, semilla: 4111, fig: [   // corto y ancho
      ['M', 0.00, 0.20], ['L', 0.96, 0.02], ['L', 1.00, 0.74], ['L', 0.08, 0.96]] },

    { n: 'confeti-05', color: P.rosa, semilla: 5023, fig: [   // doblado: un lado se mete para adentro
      ['M', 0.14, 0.00], ['L', 0.92, 0.10], ['L', 0.86, 1.00], ['Q', 0.34, 0.62, 0.04, 0.70]] },

    { n: 'confeti-06', color: P.magenta, semilla: 6247, fig: [   // esquina cortada, cinco lados
      ['M', 0.08, 0.10], ['L', 0.66, 0.00], ['L', 0.98, 0.22], ['L', 0.88, 0.94], ['L', 0.04, 0.80]] },
  ]

  for (const papel of PAPELES) {
    const [cv, g] = lienzoK(W, H, K)
    const r = azar(papel.semilla)
    const tiembla = (v, span) => (r() - 0.5) * 3 + v * span      // +-1,5 px sobre la coordenada ya escalada

    g.beginPath()
    for (const op of papel.fig) {
      if (op[0] === 'M') g.moveTo(bx + tiembla(op[1], bw), by + tiembla(op[2], bh))
      else if (op[0] === 'L') g.lineTo(bx + tiembla(op[1], bw), by + tiembla(op[2], bh))
      else g.quadraticCurveTo(bx + op[1] * bw, by + op[2] * bh,
                              bx + tiembla(op[3], bw), by + tiembla(op[4], bh))
    }
    g.closePath()

    g.save(); g.clip()
    g.fillStyle = lineal(g, bx, by, bx + bw, by + bh, [
      [0, aclarar(papel.color, 0.34)], [0.55, papel.color], [1, aclarar(papel.color, 0.06)],
    ])
    g.fillRect(0, 0, W, H)

    // EL DOBLEZ. Una banda de luz cruzando el papel en diagonal, con la inclinacion sorteada por la
    // misma semilla. Es lo que convierte un poligono de color plano en algo que parece papel: sugiere
    // que la pieza no es del todo plana y por lo tanto que puede darse vuelta.
    const alto = 0.30 + r() * 0.26, caida = 0.18 + r() * 0.30
    g.beginPath()
    g.moveTo(bx - bw, by + (alto + caida) * bh)
    g.lineTo(bx + bw * 2, by + (alto - caida) * bh)
    g.lineTo(bx + bw * 2, by - bh); g.lineTo(bx - bw, by - bh)
    g.closePath()
    g.fillStyle = rgba('#FFFFFF', 0.20); g.fill()
    g.restore()

    lista.push(guardar(papel.n, cv))
  }
}

// ================================================================ 4. LA CHISPA
//
// La estrella de cuatro puntas de lados concavos, que es la forma con la que todo el mundo dibuja "IA"
// desde hace unos años. Los lados concavos salen de una curva cuadratica cuyo punto de control esta muy
// cerca del centro: cuanto mas cerca, mas se pellizca la cintura y mas afiladas quedan las puntas.
//
// LAS PUNTAS VERTICALES SON MAS LARGAS QUE LAS HORIZONTALES (138 contra 100). Con los cuatro radios
// iguales la figura se lee como un rombo hinchado; el estirado vertical es lo que la hace verse como un
// destello y no como una flor de cuatro petalos.
//
// k=3 y no 2 porque esta es la unica capa de este archivo que se acerca a la camara: en pantalla mide
// unos 70 px, pero en el momento del acercamiento necesita reserva para no quedar blanda justo cuando es
// lo unico que se esta mirando.
{
  const W = 300, K = 3
  const [cv, g] = lienzoK(W, W, K)
  const cx = W / 2, cy = W / 2
  const RV = 138, RH = 100
  const PELLIZCO = 0.16

  const camino = () => {
    g.beginPath()
    g.moveTo(cx, cy - RV)
    g.quadraticCurveTo(cx + RH * PELLIZCO, cy - RV * PELLIZCO, cx + RH, cy)
    g.quadraticCurveTo(cx + RH * PELLIZCO, cy + RV * PELLIZCO, cx, cy + RV)
    g.quadraticCurveTo(cx - RH * PELLIZCO, cy + RV * PELLIZCO, cx - RH, cy)
    g.quadraticCurveTo(cx - RH * PELLIZCO, cy - RV * PELLIZCO, cx, cy - RV)
    g.closePath()
  }

  // El degradado se mide contra RV, el radio mayor. Consecuencia buscada: las puntas horizontales, que
  // llegan a 100/138 = 0,72 del recorrido, quedan azules pero no en el azul mas hondo — solo las puntas
  // de arriba y abajo tocan el fondo de la escala, y eso refuerza el eje vertical de la figura.
  camino()
  g.fillStyle = radial(g, cx, cy, 0, RV, [
    [0, '#FFFFFF'], [0.12, '#E8FAFF'], [0.30, P.cianClaro],
    [0.52, P.cian], [0.78, P.azul], [1, P.azulHondo],
  ])
  g.fill()

  // el nucleo, RECORTADO a la estrella. Sin el recorte se desborda por las diagonales, que es justo
  // donde la figura esta pellizcada, y el destello termina pareciendo un circulo con cuatro pinches.
  g.save(); camino(); g.clip()
  resplandor(g, cx, cy, 46, 46, [
    [0, '#FFFFFF', 0.92], [0.35, '#FFFFFF', 0.42], [0.70, '#EAFBFF', 0.12], [1, '#EAFBFF', 0],
  ])
  g.restore()

  lista.push(guardar('chispa', cv))
}

// ---------------------------------------------------------------- la estela de la chispa
// Cola difusa para modo Añadir: sobre transparente, sin nada oscuro, cabeza a la derecha (donde va la
// chispa) y punta a la izquierda.
//
// EL ALFA ES TRES VECES MAS BAJO QUE EL DEL RASTRO Y NO ES UNA CONTRADICCION: este se SUMA sobre un
// fondo que ya esta en 244,242,252. Con el alfa del rastro, sobre la pieza esto no era una estela sino
// un chorro blanco de 450 px con forma de nada. Acá la cola casi no tiene color propio; lo que se ve es
// que el aire alrededor de la chispa esta mas claro de un lado, que es exactamente lo que se busca.
{
  const W = 450, H = 300, K = 1
  const [cv, g] = lienzoK(W, H, K)
  const caja = cola(g, {
    eje: H / 2, cabeza: 366, punta: 42, ry: 26, ancho: 1.8, alfa: 0.016, pasos: 80,
    // se enfria al alejarse de la fuente: cian blanqueado en la cabeza, azul en la punta
    color: t => (t < 0.28 ? '#E4F9FF' : t < 0.62 ? P.cianClaro : P.azul),
  })
  comprobarCanto('chispa-estela', W, H, caja, 6)
  lista.push(guardar('chispa-estela', cv))
}

informe('efectos', lista)
