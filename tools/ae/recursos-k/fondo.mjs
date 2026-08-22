// EL SUELO DE LA PIEZA-K.
//
// Existe por un reclamo concreto: "el fondo es demasiado simple". El motor no tiene degradados ni
// resplandores, así que si el suelo no se hornea acá, termina siendo un `fillStyle` liso — y un sólido
// plano detrás de 25 segundos de movimiento se lee como una pared, no como aire.
//
// La respuesta no es UN PNG más lindo sino CUATRO CAPAS que se mueven a distinta velocidad en Z:
//
//   1. fondo-base            el suelo, lejísimos, casi quieto
//   2. fondo-manchas         color lavado, capa intermedia del paralaje
//   3. fondo-resplandor-cian el brillo de esquina, en modo Añadir, sólo en dos escenas
//   4. grano-01/02/03        ciclado cada 2 cuadros, adelante de todo
//
// LO QUE HACE EL GRANO Y NO ES OBVIO: además de textura, es el DITHER de las otras tres. Un degradado
// al 5% estirado sobre miles de píxeles cambia de valor cada 40-70 px, o sea bandas anchas, que es lo
// que se ve como aros concéntricos alrededor de una mancha. MEDIDO sobre estos PNG: la capa de manchas
// tiene apenas 15 valores de alfa distintos en 560 px, con mesetas de hasta 70 px de ancho.
//
// Y sin embargo NO hay nada que arreglar ahí, que es la parte contraintuitiva. Esas mesetas de alfa se
// traducen en el compuesto a saltos de UN nivel de RGB como mucho (un alfa de 1/255 de azul sobre
// lavanda mueve menos de un nivel), y el grano mete un ruido de ±5 niveles encima. Medido en el
// compuesto real: sin grano, salto máximo 1; con grano, el ruido se lo come. Los aros que se ven al
// mirar una miniatura reescalada son de la miniatura, no del PNG — vale la pena dejarlo escrito porque
// ya me mandé a "arreglar" un degradado que estaba bien.
//
// Por eso fondo-base NO lleva ruido horneado adentro: sumarle ruido a un PNG de 10,9 millones de
// píxeles lo haría incompresible (PNG predice cada píxel del anterior, y el ruido no se predice) y el
// archivo pasaría de unos pocos MB a decenas. El ruido va aparte y en un lienzo chico, tres veces.

import { statSync } from 'node:fs'
import { P, DISPLAY, lienzo, lienzoK, guardar, rgba, radial, lineal, texto, grano, margenDe, informe, DESTINO } from './lib.mjs'

const lista = []

// ============================================================================ 1. EL SUELO
//
// Se dibuja en una función y no suelto porque puede haber que rehacerlo en otro tamaño: a 4200x2600 el
// PNG puede irse de peso, y el plan B es 3200x2000. La composición es la misma, expresada en fracciones
// del lienzo, así que el fondo se ve igual — sólo cambia cuántos píxeles tiene.
function pintarSuelo(w, h) {
  const [cv, g] = lienzo(w, h)

  // -- capa A: el degradado madre. El centro está ARRIBA (26% de la altura), no en el medio: así la luz
  // parece venir de arriba, que es de donde viene la luz en todas las piezas de esta familia.
  // El radio se calcula contra la esquina más lejana (la de abajo) para que el tono más oscuro llegue a
  // aparecer de verdad. Con el radio "obvio" —la diagonal entera— la esquina caía en 0,67 del degradado
  // y #E6E3F2 no se pintaba en ningún píxel del lienzo.
  const cx = w * 0.50, cy = h * 0.26
  const masLejos = Math.hypot(Math.max(cx, w - cx), Math.max(cy, h - cy))
  g.fillStyle = radial(g, cx, cy, 0, masLejos * 1.05, [
    [0, P.fondoA], [0.30, '#F6F4FD'], [0.58, P.fondoB], [0.82, '#EAE7F4'], [1, P.fondoC],
  ])
  g.fillRect(0, 0, w, h)

  // -- capa B: la deriva de temperatura. Cian arriba a la izquierda, violeta abajo a la derecha, los dos
  // por debajo del 4%. No se ve como color: se ve como que el fondo no es del mismo material en las dos
  // esquinas, que es lo único que distingue un suelo pintado de un papel escaneado.
  g.fillStyle = lineal(g, 0, 0, w, h, [
    [0, P.cian, 0.028], [0.45, P.azul, 0.010], [1, P.violeta, 0.042],
  ])
  g.fillRect(0, 0, w, h)

  // -- capa C: el resplandor de arriba, elíptico. `createRadialGradient` sólo hace círculos, así que la
  // elipse se consigue achatando el sistema de coordenadas antes de crear el degradado: el degradado se
  // define en espacio de usuario y la matriz lo deforma con todo lo demás.
  g.save()
  g.translate(w * 0.50, h * 0.10)
  g.scale(1, 0.45)
  const rl = w * 0.62
  g.fillStyle = radial(g, 0, 0, 0, rl, [
    [0, P.blanco, 0.42], [0.45, P.blanco, 0.20], [0.78, P.blanco, 0.05], [1, P.blanco, 0],
  ])
  g.beginPath(); g.arc(0, 0, rl, 0, Math.PI * 2); g.fill()
  g.restore()

  // -- capa D: el barrido diagonal. Una franja de luz ancha y flojísima cruzando el cuadro. Los ceros de
  // los dos lados son a propósito: la franja tiene que nacer y morir adentro del degradado, no en el
  // borde del lienzo, o el corte se vería como una línea recta.
  g.fillStyle = lineal(g, w * 0.15, 0, w * 0.85, h, [
    [0, P.blanco, 0], [0.30, P.blanco, 0], [0.46, P.blanco, 0.05], [0.62, P.blanco, 0], [1, P.blanco, 0],
  ])
  g.fillRect(0, 0, w, h)

  // -- capa E: la viñeta, también elíptica y con la misma maniobra. Va en el azul agrisado de las
  // sombras de la pieza (#2A2F55) y no en negro: un negro puro sobre lavanda ensucia y se nota.
  // Achatando en h/w, el cuadrado de lado w cubre exactamente el lienzo entero.
  g.save()
  g.translate(w / 2, h / 2)
  g.scale(1, h / w)
  const rv = w * 0.78
  g.fillStyle = radial(g, 0, 0, rv * 0.40, rv, [
    [0, '#2A2F55', 0], [0.62, '#2A2F55', 0.02], [0.86, '#2A2F55', 0.07], [1, '#2A2F55', 0.13],
  ])
  g.fillRect(-w / 2, -w / 2, w, w)
  g.restore()

  return cv
}

// El techo de 8 MB no es capricho: este PNG viaja a la máquina que renderiza y se decodifica entero en
// memoria. Se mide el archivo YA ESCRITO en vez de estimarlo, porque cuánto comprime un degradado
// depende del degradado.
lista.push(guardar('fondo-base', pintarSuelo(4200, 2600)))
let pesoBase = statSync(`${DESTINO}/fondo-base.png`).size
let notaBase = `fondo-base 4200x2600 = ${(pesoBase / 1048576).toFixed(2)} MB`
if (pesoBase > 8 * 1024 * 1024) {
  lista[0] = guardar('fondo-base', pintarSuelo(3200, 2000))
  const nuevo = statSync(`${DESTINO}/fondo-base.png`).size
  notaBase += ` -> PASABA DE 8 MB, rehecho a 3200x2000 = ${(nuevo / 1048576).toFixed(2)} MB`
}

// ============================================================================ 2. LAS MANCHAS
//
// Capa intermedia del paralaje, sobre transparente. La consigna es que se lea como AIRE y no como
// manchas, y eso depende de dos cosas más que del color:
//
//  · LA CAÍDA. Un degradado radial lineal (alfa 0,10 -> 0) tiene un aro visible más o menos a la mitad,
//    porque el ojo detecta la derivada constante. Las paradas de abajo aproximan una campana: caen
//    rápido al principio y se arrastran al final.
//  · QUE NINGUNA TOQUE EL BORDE. Una mancha cortada por el canto del lienzo deja una línea recta justo
//    donde termina el plano en 3D, y esa línea delata que hay un cartel flotando. Por eso cada centro
//    se mantiene a más de max(rx, ry) de los cuatro bordes; con la rotación, ese radio de seguridad es
//    el único que vale para las dos direcciones.
function mancha(g, cx, cy, rx, ry, giro, hex, alfa) {
  g.save()
  g.translate(cx, cy); g.rotate(giro); g.scale(1, ry / rx)
  g.fillStyle = radial(g, 0, 0, 0, rx, [
    [0, hex, alfa], [0.34, hex, alfa * 0.74], [0.60, hex, alfa * 0.34],
    [0.82, hex, alfa * 0.09], [1, hex, 0],
  ])
  g.beginPath(); g.arc(0, 0, rx, 0, Math.PI * 2); g.fill()
  g.restore()
}

{
  const W = 2400, H = 1600
  const [cv, g] = lienzo(W, H)
  mancha(g, 680, 540, 640, 500, -0.20, P.azul, 0.100)   // la principal, arriba a la izquierda
  mancha(g, 1780, 560, 580, 430, 0.28, P.cian, 0.085)   // el contrapunto frío, arriba a la derecha
  mancha(g, 1240, 1030, 560, 380, 0.12, P.azul, 0.055)  // la más lavada, abajo: sostiene el centro
  lista.push(guardar('fondo-manchas', cv))
}

// ============================================================================ 3. EL RESPLANDOR
//
// Va en modo Añadir, y eso cambia el diseño: en Añadir cada píxel SUMA, así que el borde tiene que
// llegar a cero exacto o se ve un disco. El radio (590) es menor que el medio lienzo (600) justamente
// para que la última parada del degradado, la del alfa 0, caiga adentro y quede un anillo de píxeles
// completamente vacíos alrededor.
// El núcleo no es cian sino cian blanqueado: un resplandor real satura hacia el blanco en el centro, y
// arrancar directamente del cian puro da un brillo de plástico.
{
  const [cv, g] = lienzo(1200, 1200)
  g.fillStyle = radial(g, 600, 600, 0, 590, [
    [0, '#EAFBFF', 0.90], [0.10, P.cianClaro, 0.68], [0.28, P.cian, 0.38],
    [0.55, P.cian, 0.13], [0.78, P.cian, 0.035], [1, P.cian, 0],
  ])
  g.beginPath(); g.arc(600, 600, 590, 0, Math.PI * 2); g.fill()
  lista.push(guardar('fondo-resplandor-cian', cv))
}

// ============================================================================ 4. EL GRANO
//
// Tres cuadros distintos que el motor cicla cada 2 cuadros. Con uno solo el ruido queda CONGELADO
// encima de una imagen que se mueve, y eso no se lee como grano de película: se lee como suciedad en
// el lente. Las semillas van escritas acá adentro, no sorteadas, porque dos corridas tienen que dar
// exactamente los mismos tres PNG.
for (const [n, semilla] of [['grano-01', 11], ['grano-02', 977], ['grano-03', 40503]]) {
  lista.push(grano(n, 1920, 1080, semilla, 0.030))
}

// ============================================================================ 5. LA MARCA DE AGUA
//
// El logotipo de esquina, YA DESENFOCADO. No es una decisión estética que se pueda deshacer después: el
// motor no tiene desenfoque, así que si el PNG sale nítido, en la pieza va a estar nítido.
//
// EL TRUCO, Y POR QUÉ FUNCIONA. Lo que se ve no es el relleno del texto sino SU SOMBRA: el relleno va
// al 0,1% (invisible) y la sombra, sin desplazamiento, queda centrada exactamente sobre las letras. Se
// apoya en algo que MEDÍ en este Skia y que no es lo que dice la intuición: la sombra NO hereda el alfa
// del relleno. Con un relleno al 0,001 la sombra sale igual de densa que con el relleno opaco (medido:
// alfa 234 en el centro en los dos casos). Por eso `sombra()` en lib.mjs usa el mismo truco.
//
// Y LA SEGUNDA MEDICIÓN, la que arruina el multiplicador k: `shadowBlur` NO lo escala la matriz. Va en
// píxeles del bitmap. Medido con el mismo círculo a k=1, 2 y 4: la caída se extendió 13, 14 y 14 px del
// bitmap, siempre la misma, mientras el círculo crecía de 10 a 40 px. O sea que a k=2 un desenfoque
// pedido "de 10" saldría de 5 en coordenadas lógicas — la mitad. Se multiplica a mano.
{
  const W = 380, H = 160, k = 2
  const DESENFOQUE = 10                    // en unidades lógicas, que es como está pensado el diseño
  const [cv, g] = lienzoK(W, H, k)

  // La regla del margen vale igual acá, sólo que el tamaño del lienzo está fijado por el motor: en vez
  // de agrandar el PNG se mete el texto para adentro. Si la palabra llegara al borde, la caída del
  // desenfoque se cortaría contra el canto y el logo tendría un lado recto.
  const m = margenDe(DESENFOQUE)

  g.shadowColor = rgba(P.gris, 0.55)
  g.shadowBlur = DESENFOQUE * k            // ver arriba: bitmap, no lógicas
  g.shadowOffsetX = 0; g.shadowOffsetY = 0

  // Tres pasadas encima porque una sola, tan desenfocada, queda por debajo del umbral en que se lee. Es
  // el mismo motivo por el que `sombra()` pasa dos veces, sólo que acá el radio es mayor y hace falta
  // una más. El ancho de la palabra se comprueba contra el hueco útil: `texto()` devuelve la medida.
  const cxT = W / 2, cyT = H / 2
  const o = { tam: 56, familia: DISPLAY, peso: '600', color: rgba(P.gris, 0.001),
              alinear: 'center', base: 'middle', espaciado: 2 }
  let ancho = 0
  for (let i = 0; i < 3; i++) ancho = texto(g, 'urvid', cxT, cyT, o)
  if (ancho > W - m * 2) throw new Error(`"urvid" mide ${ancho.toFixed(1)} px y el hueco útil es ${W - m * 2}: la caída del desenfoque se cortaría contra el borde`)

  lista.push(guardar('marca-agua', cv))
}

informe('fondo', lista)
console.log(`  nota: ${notaBase}`)
