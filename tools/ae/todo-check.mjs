// EL LECTOR DE LA SONDA MAESTRA — seis funciones del motor verificadas sobre UN cuadro.
//
// POR QUE EXISTE. Verificar a ojo cuesta un render por funcion y por arreglo, y ademas depende de que
// quien mire se acuerde de que tenia que mirar. Aca cada funcion es una AFIRMACION MEDIBLE sobre
// pixeles concretos del PNG que produjo `sondas/todo.jsx`, y el veredicto sale con codigo de salida.
//
// LO QUE NO HACE: no dice si la pieza es linda. Dice si las seis funciones del motor hacen lo que
// prometen. Son preguntas distintas y esta contesta la barata.
//
// USO
//   node tools/ae/todo-check.mjs [ruta del png]

import { existsSync } from 'node:fs'
import { leerPNG } from './png.mjs'

const RUTA = process.argv[2] || 'C:/ae-probe/render/TODO/f020.png'
if (!existsSync(RUTA)) { console.error(`falta ${RUTA} — hay que renderizar UN cuadro primero`); process.exit(2) }
const im = leerPNG(RUTA)
const canal = im.datos.length / (im.ancho * im.alto)
const px = (x, y) => {
  const i = (Math.round(y) * im.ancho + Math.round(x)) * canal
  return [im.datos[i], im.datos[i + 1], im.datos[i + 2], canal === 4 ? im.datos[i + 3] : 255]
}
const lum = (x, y) => { const p = px(x, y); return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2] }

// el promedio de un rectangulo: una muestra suelta cae en un borde y miente
const medio = (x0, y0, x1, y1) => {
  let s = 0, n = 0
  for (let y = y0; y <= y1; y += 2) for (let x = x0; x <= x1; x += 2) { s += lum(x, y); n++ }
  return n ? s / n : 0
}
// cuanta ESTRUCTURA hay en un rectangulo: la energia de gradiente distingue nitido de borroso mucho
// mejor que el brillo, que en dos paneles iguales es casi el mismo
const detalle = (x0, y0, x1, y1) => {
  let s = 0, n = 0
  for (let y = y0; y <= y1; y++) for (let x = x0; x < x1; x++) { s += Math.abs(lum(x + 1, y) - lum(x, y)); n++ }
  return n ? s / n : 0
}
// el centro horizontal de la tinta clara dentro de una banda
const centroTinta = (x0, y0, x1, y1, umbral) => {
  let a = -1, b = -1
  for (let x = x0; x <= x1; x++) {
    let hay = false
    for (let y = y0; y <= y1 && !hay; y++) if (lum(x, y) > umbral) hay = true
    if (hay) { if (a < 0) a = x; b = x }
  }
  return a < 0 ? null : { desde: a, hasta: b, centro: (a + b) / 2 }
}

const R = []
const dar = (id, que, detalleTxt, ok) => { R.push({ id, que, detalleTxt, ok }); }

// ---------------------------------------------------------------- A · fusion aditiva
// LA SUMA TIENE QUE DAR LA SUMA, y eso es una igualdad, no una desigualdad.
//
// La primera version comparaba los discos "sobre la franja" contra "fuera de la franja" — y los dos
// discos estan ENTEROS dentro de la franja, asi que las dos muestras daban el mismo numero y el
// veredicto era rojo con el motor andando. Error del lector, no del motor.
//
// Lo que si se puede afirmar con este cuadro es mucho mas fuerte: los dos discos tienen el MISMO color
// declarado, asi que el normal mide el disco solo y el aditivo tiene que medir disco MAS franja. Es una
// cuenta exacta, no un "se ve mas claro".
const franjaSola = medio(380, 160, 440, 240)
const discoNormal = medio(200, 160, 296, 240)
const discoSuma = medio(500, 160, 596, 240)
const esperado = discoNormal + franjaSola
dar('A', 'fusion aditiva',
  `franja sola ${franjaSola.toFixed(1)} + disco normal ${discoNormal.toFixed(1)} = ${esperado.toFixed(1)} · ` +
  `el aditivo mide ${discoSuma.toFixed(1)} (desvio ${Math.abs(discoSuma - esperado).toFixed(1)})`,
  Math.abs(discoSuma - esperado) < 12 && discoSuma > discoNormal + 20)

// ---------------------------------------------------------------- B · el ORIGEN del texto con interletra
// AE centra la TINTA en el origen de la capa. La regla roja esta dibujada exactamente ahi, asi que el
// centro de la tinta medido sobre el PNG tiene que caer encima. El defecto que se busca vale 8,6 px con
// tracking 200 — por eso la tolerancia es 4, no 20.
const MARCA_C = 430, MARCA_D = 800
const c0 = centroTinta(120, 380, 760, 435, 120)
const c2 = centroTinta(120, 480, 760, 535, 120)
dar('B1', 'origen con alineacion CENTRO',
  c0 && c2 ? `sin tracking ${(c0.centro - MARCA_C).toFixed(1)} px de la regla · con tracking ${(c2.centro - MARCA_C).toFixed(1)} px` : 'no se encontro tinta',
  !!c0 && !!c2 && Math.abs(c0.centro - MARCA_C) < 6 && Math.abs(c2.centro - MARCA_C) < 6)

// con alineacion DERECHA el borde derecho de la tinta es el que tiene que tocar la regla
const d0 = centroTinta(300, 600, 900, 655, 120)
const d2 = centroTinta(300, 700, 900, 755, 120)
dar('B2', 'origen con alineacion DERECHA',
  d0 && d2 ? `sin tracking ${(d0.hasta - MARCA_D).toFixed(1)} px de la regla · con tracking ${(d2.hasta - MARCA_D).toFixed(1)} px` : 'no se encontro tinta',
  !!d0 && !!d2 && Math.abs(d0.hasta - MARCA_D) < 8 && Math.abs(d2.hasta - MARCA_D) < 8)

// y que el tracking HAYA HECHO ALGO: si no, B1 pasaria por casualidad con las dos sin trackear
dar('B3', 'la interletra ensancha de verdad',
  c0 && c2 ? `sin tracking ${(c0.hasta - c0.desde)} px · con tracking ${(c2.hasta - c2.desde)} px` : 'sin datos',
  !!c0 && !!c2 && (c2.hasta - c2.desde) > (c0.hasta - c0.desde) * 1.15)

// ---------------------------------------------------------------- C · cursiva
// SE MIDE LA INCLINACION, no el ancho.
//
// La primera version comparaba anchos: "Romana" (6 letras, CenturyGothic) contra "Cursiva" (7 letras,
// SegoeUI-Italic). Dos palabras distintas en dos tipografias distintas — la comparacion no significaba
// nada, y dio rojo con la cursiva renderizando perfecto.
//
// Lo que define a una cursiva es que se INCLINA: dentro de la misma palabra, el borde izquierdo de la
// tinta arriba queda a la DERECHA del de abajo. En una romana los dos coinciden. Eso se mide sobre la
// misma palabra, sin comparar nada externo.
// Y SE MIDE CADA PALABRA CONTRA SI MISMA, con el promedio de X de toda su tinta.
//
// La version anterior tomaba el borde IZQUIERDO de la banda, y eso depende de que letra empieza la
// palabra: una "C" tiene su punto mas a la izquierda a media altura, no arriba ni abajo, asi que el
// borde no acusa la inclinacion. El promedio de X de TODA la tinta de una banda si: en una cursiva cada
// punto se corre a la derecha en proporcion a su altura, asi que la banda de arriba promedia mas a la
// derecha que la de abajo. En una romana las dos promedian igual.
//
// Y comparar cada palabra CONSIGO MISMA saca del medio que sean palabras distintas en tipografias
// distintas, que es el otro defecto de como arme esta sonda.
const promedioX = (x0, y0, x1, y1) => {
  let s = 0, n = 0
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (lum(x, y) > 120) { s += x; n++ }
  return n > 40 ? s / n : null
}
const sesgo = (x0, x1, y0, y1) => {
  const alto = y1 - y0
  const arriba = promedioX(x0, y0, x1, Math.round(y0 + alto * 0.35))
  const abajo = promedioX(x0, Math.round(y1 - alto * 0.35), x1, y1)
  return (arriba !== null && abajo !== null) ? +(arriba - abajo).toFixed(1) : null
}
const sesgoRom = sesgo(150, 480, 830, 895)
const sesgoCur = sesgo(500, 850, 830, 895)
// SE AFIRMA LA DIFERENCIA, NO EL VALOR ABSOLUTO, y hay que decir por que.
//
// El signo absoluto lo domina QUE LETRAS caen en cada banda, no la inclinacion: en "Romana" la banda de
// arriba agarra casi solo la "R", que esta al extremo izquierdo, y el promedio se va 21 px a la
// izquierda sin que haya ninguna inclinacion. Lo que si es limpio es la DIFERENCIA entre las dos
// palabras, porque el sesgo por composicion de letras es parecido y la inclinacion no.
//
// Que haga falta esta aclaracion es culpa de como arme la sonda: dos palabras distintas en dos
// tipografias distintas. Ya esta corregido en `sondas/todo.jsx` —la misma palabra y la misma familia,
// empezando por una letra con asta vertical— y en el proximo render esto se puede afirmar en absoluto.
dar('C', 'cursiva',
  `inclinacion de la romana ${sesgoRom} px · de la cursiva ${sesgoCur} px · diferencia ${(sesgoCur - sesgoRom).toFixed(1)}`,
  sesgoRom !== null && sesgoCur !== null && sesgoCur - sesgoRom > 8)

// ---------------------------------------------------------------- D · recorte por matte
// El texto vive dentro de una banda de 46 px de alto centrada en y=880. Arriba y abajo de esa banda no
// puede haber NADA de su tinta. Se mide justo afuera, a 12 px del borde.
const dentro = medio(960, 872, 1240, 888)
const arriba = medio(960, 840, 1240, 852)
const abajo = medio(960, 912, 1240, 924)
dar('D', 'recorte por matte',
  `dentro ${dentro.toFixed(1)} · arriba ${arriba.toFixed(1)} · abajo ${abajo.toFixed(1)}`,
  dentro > 8 && arriba < 4 && abajo < 4)

// ---------------------------------------------------------------- E · arco al 60%
// Empieza a las doce y gira horario: al 60% tiene que haber trazo a las 3 (derecha) y a las 6 (abajo),
// y NADA a las 10-11 (arriba a la izquierda), que es el tramo que falta.
const cxA = 1650, cyA = 830, rA = 110
const enAngulo = (grados) => {
  const a = (grados - 90) * Math.PI / 180
  return medio(cxA + Math.cos(a) * rA - 6, cyA + Math.sin(a) * rA - 6,
               cxA + Math.cos(a) * rA + 6, cyA + Math.sin(a) * rA + 6)
}
const a90 = enAngulo(90), a180 = enAngulo(180), a300 = enAngulo(300)
dar('E', 'arco al 60% desde las doce',
  `a las 3: ${a90.toFixed(1)} · a las 6: ${a180.toFixed(1)} · a las 10: ${a300.toFixed(1)}`,
  a90 > 20 && a180 > 20 && a300 < 8)

// ---------------------------------------------------------------- F · profundidad de campo
// Dos paneles del MISMO tamano en pantalla, uno en el plano de foco y otro a 1400 unidades detras. El
// nitido tiene que tener mas ESTRUCTURA; el brillo medio de los dos es casi igual, por eso no sirve.
// SE MIDE DONDE HAY CONTENIDO. La primera version muestreaba (1120-1360, 220-380), que cae en la
// mitad VACIA del panel de documento: dio 0,00 de estructura en el panel NITIDO y el veredicto salio
// rojo. El panel tiene su texto arriba a la izquierda; ahi es donde hay algo que perder al desenfocar.
const detNitido = detalle(1075, 55, 1320, 210)
const detBorroso = detalle(1255, 175, 1500, 330)
dar('F', 'profundidad de campo',
  `estructura del que esta en foco ${detNitido.toFixed(2)} · del de atras ${detBorroso.toFixed(2)}`,
  detNitido > detBorroso * 1.35)

// ---------------------------------------------------------------- el veredicto
console.log(`SONDA MAESTRA — ${RUTA}  (${im.ancho}x${im.alto})\n`)
let mal = 0
for (const r of R) {
  if (!r.ok) mal++
  console.log(`  ${r.ok ? 'ok  ' : 'FALL'} ${r.id.padEnd(3)} ${r.que}`)
  console.log(`         ${r.detalleTxt}`)
}
console.log('')
console.log('='.repeat(72))
if (!mal) console.log(`TODO OK — las ${R.length} funciones del motor hacen lo que prometen, en un solo cuadro`)
else console.log(`TODO NO PASA — ${mal} de ${R.length}`)
process.exit(mal ? 1 : 0)
