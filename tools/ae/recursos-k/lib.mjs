// BIBLIOTECA COMUN DE LOS RECURSOS DE LA PIEZA-K.
//
// La PIEZA-K es una version propia de un aviso de lanzamiento SaaS. Todo lo que en ese aviso es
// "suave" —degradados, esquinas redondeadas, sombras, resplandores— NO EXISTE en el motor: cero
// ocurrencias de gradient, borderRadius, shadow y blur en `motor/comp3d.html`. Se hornea acá, con Skia,
// que sí tiene `createLinearGradient`, `createRadialGradient`, `shadowBlur` y `arcTo`.
//
// LA REGLA QUE ORDENA TODO: UN PNG HORNEADO TIENE UN SOLO ESTADO. Lo que tenga que cambiar en el tiempo
// no puede vivir adentro del PNG. Un botón que pasa de negro a azul son DOS PNG del mismo tamaño y con
// las mismas coordenadas, cruzados en opacidad; no un PNG con el color animado, que no existe.
//
// ================================================================ LA FUENTE, QUE ES EL RIESGO Nº 1
//
// Skia falla en silencio: `g.font = '72px "NoExiste"'` no tira error, dibuja con la sustituta. Igual
// que AE y que Chromium. Y la pieza es tipografía de punta a punta, así que una capa horneada con la
// sustituta y un titular vivo con la buena se ven distintos recién cuando el usuario mira el video.
//
// MEDIDO con `tools/ae/fuentes-skia.mjs` (control negativo: dos nombres imposibles miden lo mismo):
//   · "Century Gothic"  SI existe   892,13 px    <- la geométrica, para titulares
//   · "CenturyGothic"   NO existe   841,89 px    <- el nombre de AE. Con este, Skia cae a la sustituta
//   · "Segoe UI"        SI existe   814,64 px    <- para el texto de interfaz de las capturas
//   · "Poppins"/"Inter"/"Montserrat"/"Futura"    NO existen en esta máquina
//   · "Segoe UI Light"/"Arial Black"             NO existen: son PESOS, no familias
//
// De ahí las dos constantes de abajo, y de ahí `pedirFuente()`, que se niega a dibujar con una familia
// que no está en vez de entregar un PNG con la tipografía equivocada.

import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { createCanvas } from '@napi-rs/canvas'

export const DESTINO = process.env.RECURSOS_K || 'C:/ae-probe/recursos-k'
if (!existsSync(DESTINO)) mkdirSync(DESTINO, { recursive: true })

// EN SKIA VA CON ESPACIO. En el .jsx de AE la misma familia se pide como "CenturyGothic".
export const DISPLAY = 'Century Gothic'
export const UI = 'Segoe UI'

// ---------------------------------------------------------------- la paleta, leída de la referencia
export const P = {
  // el suelo: lavanda casi blanco. NUNCA se usa como sólido plano en la pieza — va horneado con
  // degradado radial, viñeta y manchas, que es la respuesta directa a "el fondo es demasiado simple".
  fondoA: '#F8F7FF', fondoB: '#EFEDF7', fondoC: '#E6E3F2',
  blanco: '#FFFFFF', hueso: '#FBFAFF',

  tinta: '#16181D', tinta2: '#3A3F4A', gris: '#8A90A0', grisClaro: '#C8CCD8',

  azul: '#2B7FFF',        // el acento principal
  azulHondo: '#0A57F5',   // la marca
  azulClaro: '#A8C8E8',   // las palabras que pierden foco
  azulPalido: '#DCE9FB',
  violeta: '#6E5BF0', violetaHondo: '#5B3FF0',
  cian: '#3FC7F6', cianClaro: '#8EE3FF',
  rosa: '#F06BD8', magenta: '#C13BE8',
  negro: '#0B0D12',
}

// ---------------------------------------------------------------- el andamio
export const lienzo = (w, h) => { const cv = createCanvas(Math.round(w), Math.round(h)); return [cv, cv.getContext('2d')] }
export const guardar = (n, cv) => {
  writeFileSync(`${DESTINO}/${n}.png`, cv.toBuffer('image/png'))
  return `${n}.png ${cv.width}x${cv.height}`
}
export const rgba = (hex, a) => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))
  return `rgba(${r},${g},${b},${a})`
}

// UN LIENZO CON MULTIPLICADOR. `k` es el multiplicador de píxeles NATIVOS: se dibuja en las mismas
// coordenadas lógicas sobre un lienzo k veces más grande. Existe porque `lectura-check` Q2 exige que la
// imagen tenga entre 2x y 4x los píxeles con que se dibuja, y los objetos que en algún momento llenan
// el cuadro salían a 0,8x. Subir el número acá es gratis; descubrirlo mirando un cuadro borroso, no.
export function lienzoK(w, h, k) {
  const [cv, g] = lienzo(w * k, h * k)
  g.scale(k, k)
  return [cv, g]
}

// EL MARGEN DE UNA SOMBRA ES TRES VECES SU DESENFOQUE, y no es un número elegido: con menos, la caída
// se corta contra el borde del lienzo y queda un rectángulo visible alrededor del objeto.
export const margenDe = (desenfoque) => Math.ceil(desenfoque * 3)

// ================================================================ LA TRAMPA DE `shadowBlur` CON `k`
//
// **`shadowBlur` y `shadowOffsetY` NO los toca la matriz de transformación.** Van en píxeles del
// BITMAP, no en las coordenadas lógicas donde se dibuja todo lo demás. Con `lienzoK(w, h, k)` eso se
// paga dos veces y en direcciones opuestas:
//
//   · un `shadowBlur = 20` con k=2 rinde **10** en coordenadas lógicas: sombra dura y corta
//   · `margenDe(20)` reserva 60 lógicos = 120 nativos, o sea **el doble** del margen necesario
//
// MEDIDO, no deducido: el mismo círculo a k=1, 2 y 4 con el mismo `shadowBlur` extendió la caída 13, 14
// y 14 px de bitmap mientras el círculo crecía de 10 a 40. La caída no escala. Dos de los seis
// generadores de esta pieza lo pisaron por separado — uno terminó con un pico de sombra de 0,06
// (invisible) adentro de 66 px de margen vacío antes de medirlo.
//
// LA REGLA: con `lienzoK`, el desenfoque y la bajada se piden en NATIVOS y el margen se divide por k.
export const sombraK = (desenfoqueLogico, k) => ({
  desenfoque: desenfoqueLogico * k,
  margen: Math.ceil(margenDe(desenfoqueLogico * k) / k),
})

// Y UNA SEGUNDA, DE LA MISMA FAMILIA: **la sombra no hereda el alfa del relleno.** Con el relleno al
// 0,001 la sombra sale igual de densa que con relleno opaco (alfa 234 en el centro en los dos casos).
// Eso es lo que hace posible `sombra()` de abajo —dibujar una forma invisible sólo para quedarse con su
// sombra— y también el truco de la marca de agua, que es una sombra sin objeto que la proyecte.

// ---------------------------------------------------------------- rectángulo redondeado
// A mano con arcTo y no con roundRect, para poder repetir exactamente la misma ruta en el borde
// interior (un contorno de 1,5 px por dentro necesita el mismo camino con el radio corregido).
export function ruta(g, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2)
  g.beginPath()
  g.moveTo(x + rr, y)
  g.lineTo(x + w - rr, y); g.arcTo(x + w, y, x + w, y + rr, rr)
  g.lineTo(x + w, y + h - rr); g.arcTo(x + w, y + h, x + w - rr, y + h, rr)
  g.lineTo(x + rr, y + h); g.arcTo(x, y + h, x, y + h - rr, rr)
  g.lineTo(x, y + rr); g.arcTo(x, y, x + rr, y, rr)
  g.closePath()
}

// ---------------------------------------------------------------- la fuente, con negativa explícita
//
// Se mide contra la sustituta ANTES de dibujar. Si la familia no está, esto TIRA en vez de entregar un
// PNG con la tipografía equivocada — que es el modo de fallo que nadie ve hasta que mira el video.
const _cvF = createCanvas(8, 8), _gF = _cvF.getContext('2d')
function _anchoCon(fam, txt) { _gF.font = `72px "${fam}"`; return _gF.measureText(txt).width }
const _SUSTITUTA = _anchoCon('NoExisteEstaFuenteXYZ', 'LangEase Handoff 95/100')
const _yaVistas = new Map()
export function pedirFuente(familia) {
  if (_yaVistas.has(familia)) return _yaVistas.get(familia)
  const a = _anchoCon(familia, 'LangEase Handoff 95/100')
  const existe = Math.abs(a - _SUSTITUTA) > 0.01
  if (!existe) {
    throw new Error(
      `la familia "${familia}" NO existe en Skia: mide exactamente lo mismo que una inventada ` +
      `(${a.toFixed(2)} px). Dibujaría con la sustituta y el PNG saldría con otra tipografía, sin aviso. ` +
      `Corré: node tools/ae/fuentes-skia.mjs`)
  }
  _yaVistas.set(familia, true)
  return true
}

// texto ya con la familia comprobada. `peso` va adelante porque en Skia los pesos NO son familias.
export function fuente(g, tam, familia, peso) {
  pedirFuente(familia)
  g.font = `${peso ? peso + ' ' : ''}${tam}px "${familia}"`
}
export function texto(g, s, x, y, o) {
  o = o || {}
  fuente(g, o.tam || 32, o.familia || UI, o.peso)
  g.fillStyle = o.color || P.tinta
  g.textAlign = o.alinear || 'left'
  g.textBaseline = o.base || 'alphabetic'
  if (o.espaciado) g.letterSpacing = `${o.espaciado}px`
  g.fillText(s, x, y)
  if (o.espaciado) g.letterSpacing = '0px'
  return g.measureText(s).width
}

// ---------------------------------------------------------------- degradados de una línea
export function lineal(g, x0, y0, x1, y1, paradas) {
  const d = g.createLinearGradient(x0, y0, x1, y1)
  for (const [p, c, a] of paradas) d.addColorStop(p, a === undefined ? c : rgba(c, a))
  return d
}
export function radial(g, x, y, r0, r1, paradas) {
  const d = g.createRadialGradient(x, y, r0, x, y, r1)
  for (const [p, c, a] of paradas) d.addColorStop(p, a === undefined ? c : rgba(c, a))
  return d
}

// ---------------------------------------------------------------- sombra suave bajo una ruta
// Se aplica DOS VECES a propósito: una pasada de Skia con shadowBlur da una caída más floja que la de
// un diseño real. Dos pasadas apiladas dan la densidad que tiene la referencia sin subir el radio.
export function sombra(g, dibujarRuta, o) {
  o = o || {}
  g.save()
  g.shadowColor = rgba(o.color || '#2A2F55', o.alfa === undefined ? 0.18 : o.alfa)
  g.shadowBlur = o.desenfoque || 40
  g.shadowOffsetY = o.bajada === undefined ? 18 : o.bajada
  g.fillStyle = rgba('#000000', 0.001)   // el relleno no se ve; lo que se ve es su sombra
  dibujarRuta(); g.fill()
  if (o.doble !== false) { dibujarRuta(); g.fill() }
  g.restore()
}

// ---------------------------------------------------------------- ruido determinista
// NADA DE Math.random EN UN GENERADOR: dos corridas darían dos PNG distintos y una pieza dejaría de ser
// reproducible. Generador congruencial con la semilla escrita en la llamada.
export function azar(semilla) {
  let s = semilla >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
}

export function grano(nombre, w, h, semilla, fuerza) {
  const [cv, g] = lienzo(w, h)
  const img = g.createImageData(w, h)
  const r = azar(semilla)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const v = (r() * 255) | 0
    d[i] = d[i + 1] = d[i + 2] = v
    d[i + 3] = (fuerza * 255) | 0
  }
  g.putImageData(img, 0, 0)
  return guardar(nombre, cv)
}

// ---------------------------------------------------------------- informe
export function informe(nombre, lista) {
  console.log(`\n${nombre} -> ${DESTINO}`)
  for (const l of lista) console.log('  ' + l)
  console.log(`  ${lista.length} recurso(s)`)
}
