// EL SUELO DE LA PIEZA-M. Cuatro capas de paralaje que juntas hacen el fondo, y ninguna tiene dibujo.
//
// Existe por un reclamo que ya costo una pieza entera: "el fondo es demasiado simple". La respuesta NO
// es un PNG mas lindo, es que el fondo deje de ser UNA cosa. Un solido plano detras de veinte segundos
// de movimiento se lee como una pared; cuatro capas que se mueven a distinta velocidad en Z se leen
// como aire, aunque cada una por separado sea casi nada:
//
//   1. m-fondo         el suelo, lejisimos, casi quieto
//   2. m-reticula      lineas de 1 px, capa intermedia — LA QUE DA LA PROFUNDIDAD
//   3. m-mancha-naranja  el unico acento, en modo Anadir, lavadisimo
//   4. m-grano-1/2/3   ciclado cada 2 cuadros, adelante de todo
//
// LA RETICULA ES LA PIEZA CLAVE Y ES LA MAS BARATA. El paralaje solo se percibe si hay algo con BORDE
// que se mueva a otra velocidad: dos degradados corridos uno sobre otro no producen ninguna sensacion
// de profundidad, porque no hay ningun rasgo que el ojo pueda seguir. Una grilla finita si lo tiene, y
// no compite con el titular porque no dibuja nada.
//
// POR QUE EL FONDO NO LLEVA RUIDO HORNEADO ADENTRO, que es la decision menos obvia de este archivo:
// un degradado sobre 5,7 millones de pixeles cambia de valor cada 60-80 px, o sea bandas anchas, y la
// tentacion es meterle dither. No se hace, y esta MEDIDO en el repo (`recursos-k/fondo.mjs`): el ruido
// es incompresible —PNG predice cada pixel del anterior y el ruido no se predice— asi que un cuadro de
// grano de 1920x1080 pesa 3,2 MB mientras un fondo de 2600x1600 de puro degradado pesa 296 KB. Once
// veces mas, en menos pixeles. El grano va aparte, en un lienzo chico, tres veces — y ESE es el dither
// de las otras tres capas. Por eso el grano no es decoracion: si se apaga, vuelven las bandas.
//
// Y las bandas existen, no son una precaucion teorica: medido sobre este PNG, la meseta mas ancha de
// valor identico es de 421 px en horizontal y 303 px en vertical. Son escalones de UN nivel cada 300-400
// px, o sea invisibles de a uno pero perfectamente visibles como borde donde el escalon cae. El grano
// mete +-11 niveles encima y se los come.
//
// NO HAY UNA SOLA SOMBRA EN ESTE MODULO, asi que no hay ningun margen que calcular. Queda escrito para
// el que venga a agregarle un resplandor con `shadowBlur`: el margen del lienzo tiene que ser 3x el
// desenfoque, y como `shadowBlur` NO lo escala la matriz de transformacion, en un lienzo multiplicado
// por k el desenfoque va en pixeles NATIVOS y el margen logico es 3*blur/k. Sin eso la caida se corta
// contra el borde y queda un rectangulo visible, que es lo unico que nunca se puede disimular despues.
//
// TAMPOCO ESTA EL HELPER `ruta()` del patron (el rectangulo redondeado): en este modulo no hay una sola
// esquina. Son cuatro capas de degradado y una grilla de lineas rectas. Un helper que no se usa es
// codigo muerto, y prefiero explicar la ausencia a arrastrarlo.
//
// USO
//   node tools/ae/recursos-m/suelo.mjs

import { writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs'
import { createCanvas } from '@napi-rs/canvas'

const DESTINO = process.env.RECURSOS_M || 'C:/ae-probe/recursos-m'
if (!existsSync(DESTINO)) mkdirSync(DESTINO, { recursive: true })

// ---------------------------------------------------------------- helpers (patron de recursos-l.mjs)

const guardar = (n, cv, nota = '') => {
  const archivo = `${DESTINO}/${n}.png`
  writeFileSync(archivo, cv.toBuffer('image/png'))
  const kb = Math.round(statSync(archivo).size / 1024)
  return { linea: `${(n + '.png').padEnd(20)} ${String(cv.width).padStart(4)}x${String(cv.height).padStart(4)}` +
                  `  ${String(kb).padStart(5)} KB   ${nota}`, kb }
}

// k multiplica los pixeles del PNG sin tocar las coordenadas con las que se dibuja
const lienzo = (w, h, k) => {
  const cv = createCanvas(w * k, h * k)
  const g = cv.getContext('2d')
  g.scale(k, k)
  return [cv, g]
}

const rgba = (hex, a) => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))
  return `rgba(${r},${g},${b},${Math.round(a * 10000) / 10000})`
}

// Mezcla dos colores DE LA PALETA. Existe para poder poner una parada intermedia en el degradado del
// suelo sin escribir a mano un hex nuevo: un color inventado a ojo en el medio de un degradado es
// exactamente como se cuela un quinto color a una paleta de cuatro. Asi queda demostrado que el valor
// sale de papel y papel2 y de ningun otro lado.
const mezcla = (hexA, hexB, t) => {
  const canal = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))
  const a = canal(hexA), b = canal(hexB)
  return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('')
}

// Un degradado radial de DOS paradas cae linealmente, y una caida lineal de luz no existe en ninguna
// parte: se lee como un disco con borde, que es la firma visual de "esto lo genero un programa". Con
// una curva de caida el borde desaparece. Se usa en el foco, en la vinieta y en la mancha.
const paradas = (gr, hex, aMax, curva, n = 24) => {
  for (let i = 0; i <= n; i++) { const t = i / n; gr.addColorStop(t, rgba(hex, aMax * curva(t))) }
}
const caidaBlob = t => Math.pow(1 - t * t, 2)          // luz: fuerte al centro, se apaga sin borde
const suave = t => t * t * (3 - 2 * t)                 // smoothstep: entra y sale sin arranque visible

// NADA DE Math.random. Congruencial lineal (a=1664525, c=1013904223, m=2^32) con la semilla escrita al
// lado de cada uso, asi que los tres cuadros de grano salen IDENTICOS en cada corrida — si no, cada vez
// que alguien rehornea los recursos el video cambia y no hay forma de comparar dos renders.
//
// Y devuelve el BYTE ALTO (`s >>> 24`), no el resto: en un congruencial con modulo potencia de dos los
// bits bajos tienen periodo cortisimo —el bit 0 alterna 0,1,0,1— asi que tomar `s % 256` da un patron
// de damero visible en el grano. Los bits altos son los unicos que sirven.
const azar = semilla => {
  let s = semilla >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s >>> 24 }
}

// ---------------------------------------------------------------- la paleta, completa y a proposito
// Se declara entera aunque este modulo toque cinco de los ocho: el archivo es el contrato de color de
// la pieza. Aca no hay texto ni sombras, asi que `tinta` y `gris` no aparecen; y del acento se usa SOLO
// `naranja` — `naranjaHondo` y `naranjaClaro` son para volumenes con degradado, y una mancha de luz al
// 10% con tres naranjas adentro es un degradado que nadie va a ver y una excusa para que despues entren
// cuatro.
const P = {
  papel: '#FAFAF8', papel2: '#F0EFEA',
  tinta: '#0E0E10', gris: '#6E7076', grisClaro: '#C9CAC8',
  naranja: '#FF4D1C', naranjaHondo: '#D93A0E', naranjaClaro: '#FF8A5C',
}

const hechos = []
const notas = []

// ============================================================================ 1. m-fondo
//
// 3000x1900 con k=1, y el k=1 no es una distraccion: este PNG no tiene UN SOLO borde. La regla de
// tener entre 2x y 4x los pixeles con que se dibuja protege el DETALLE (un texto, una esquina, un
// recorte), y un degradado no tiene detalle que perder — reescalarlo da el mismo degradado. Lo que si
// tiene que sobrar es LIENZO, porque esta capa se mueve: contra un cuadro de 1920x1080 sobran 1080 px
// de recorrido horizontal y 820 de vertical para el paralaje sin que se vea el borde del PNG. Ese es
// el motivo del tamano, y conviene decirlo con el numero (1,56x del cuadro) en vez de fingir un 2x.
{
  const W = 3000, H = 1900
  const [cv, g] = lienzo(W, H, 1)

  // (a) el suelo. La diagonal no es a 45 grados ni cae en una esquina: un degradado alineado con los
  // ejes o con la diagonal exacta se delata solo. La parada del medio va en 0,58 y no en 0,50, o sea
  // la rampa esta apenas frenada del lado claro — asi el cambio no es perfectamente uniforme, que es
  // lo unico que distingue una luz de una interpolacion.
  const base = g.createLinearGradient(W * 0.14, 0, W * 0.74, H)
  base.addColorStop(0, P.papel)
  base.addColorStop(0.58, mezcla(P.papel, P.papel2, 0.5))
  base.addColorStop(1, P.papel2)
  g.fillStyle = base; g.fillRect(0, 0, W, H)

  // (b) una barrida diagonal desde abajo a la izquierda. Es la capa que impide que el fondo quede
  // perfectamente simetrico: con el foco al centro y la vinieta centrada, el resultado es un ojo de
  // buey, y un ojo de buey se lee como plantilla. Va en grisClaro y no en tinta porque el negro sobre
  // papel calido ensucia — mancha de gris en vez de sombra.
  const barrida = g.createLinearGradient(0, H, W * 0.55, H * 0.22)
  barrida.addColorStop(0, rgba(P.grisClaro, 0.10))
  barrida.addColorStop(0.5, rgba(P.grisClaro, 0.02))
  barrida.addColorStop(1, rgba(P.grisClaro, 0))   // termina en el MISMO rgb con alfa 0, ver nota (d)
  g.fillStyle = barrida; g.fillRect(0, 0, W, H)

  // (c) el foco, arriba al centro. `createRadialGradient` solo hace circulos, asi que se achata el
  // sistema de ejes y el circulo sale elipse. Achatado 0,52: mas ancho que alto, como una luz que
  // pega en un fondo de estudio y no como una linterna.
  //
  // VA AL 50% Y NO AL 92%, Y ESO SALIO DE MEDIRLO, no de mirarlo. Sobre papel que ya esta en 250 un
  // foco blanco casi no tiene donde aclarar: hay 5 niveles de techo. Al 92% el centro media
  // rgb(254,254,254) — cuatro niveles mas brillante que el papel y COMPLETAMENTE NEUTRO, porque lo que
  // el blanco si tiene margen para hacer es empujar el azul de 248 a 254. O sea le sacaba el calor al
  // papel justo donde cae el ojo, a cambio de nada. Al 50% el centro queda en rgb(252,252,250): sigue
  // siendo el punto mas claro y sigue teniendo el tinte calido de la pieza.
  //
  // Y la conclusion que importa para el que venga a retocar esto: EL RANGO DEL FONDO LO HACE LA
  // VINIETA, NO EL FOCO. El suelo va de 230 a 252, y esos 22 niveles son casi todos hacia abajo. Si
  // hace falta mas profundidad se toca (b) y (d), subirle el alfa al foco no da mas que blanco.
  g.save()
  g.translate(W * 0.5, H * 0.24); g.scale(1, 0.52)
  const foco = g.createRadialGradient(0, 0, 0, 0, 0, W * 0.46)
  paradas(foco, '#FFFFFF', 0.50, caidaBlob)
  g.fillStyle = foco; g.fillRect(-W, -H * 3, W * 2, H * 6)
  g.restore()

  // (d) la vinieta, elipse con la proporcion del lienzo (scale(1, H/W) convierte el circulo de radio
  // R en x en una elipse que sigue el cuadro). Arranca en alfa 0 al 36% del ancho: si arrancara en el
  // centro se comeria el foco, y si arrancara mas afuera se veria el anillo donde empieza.
  //
  // Y LAS DOS PARADAS TERMINAN EN EL MISMO RGB. Un degradado que va a `transparent` interpola hacia
  // NEGRO transparente, y en el medio del recorrido el color ya se ensucio aunque el alfa sea bajo:
  // aparece un halo gris alrededor de todo. Se apaga el alfa, nunca el color.
  g.save()
  g.translate(W / 2, H / 2); g.scale(1, H / W)
  const vig = g.createRadialGradient(0, 0, W * 0.36, 0, 0, W * 0.82)
  paradas(vig, P.grisClaro, 0.30, suave)
  g.fillStyle = vig; g.fillRect(-W, -W, W * 2, W * 2)
  g.restore()

  hechos.push(guardar('m-fondo', cv, 'suelo · 1,56x el cuadro para el paralaje'))
}

// ============================================================================ 2. m-grano-1/2/3
//
// Tres cuadros que se ciclan cada 2. Con uno solo el grano queda CONGELADO y deja de leerse como grano:
// se lee como suciedad en la lente, porque el ojo lo asocia al vidrio y no a la imagen.
//
// 1920x1080 exactos y k=1 obligatorio, por dos motivos distintos. Uno: `putImageData` IGNORA la matriz
// de transformacion, asi que en un lienzo con k>1 el ruido se escribiria en la esquina y el resto
// quedaria vacio. Dos: el grano tiene que caer 1 a 1 sobre los pixeles del cuadro final. Reescalar
// ruido lo promedia, y ruido promediado es una superficie gris — se pierde el efecto y queda el velo.
//
// EL DATO QUE HAY QUE SABER ANTES DE COMPONER, medido sobre el compuesto real y no deducido: un gris
// medio al 8,6% encima de papel de 250 NO es neutro. En modo Normal el grano BAJA el suelo 10,1
// niveles — de rgb(245,8 / 245,7 / 242,4) a rgb(235,7 / 235,6 / 232,5). O sea que el papel que dice
// #FAFAF8 se ve como #F0F0EE, y la pieza entera arranca un escalon mas apagada de lo que dice la
// paleta. El calor casi no se toca (R-B pasa de 3,47 a 3,27): oscurece parejo, no destine.
//
// Las dos salidas honestas, y la eleccion es de quien compone: el grano va en Superponer / Luz suave,
// que son neutros con el gris medio y solo dejan la textura; o va en Normal y entonces el suelo tiene
// que hornearse ~10 niveles mas claro para compensar. Lo que NO sirve es bajarle el alfa, porque eso
// se lleva puesta la unica cosa que el grano vino a hacer, que es tapar el bandeado de abajo.
const medias = []
for (const [n, semilla] of [[1, 13], [2, 6421], [3, 77003]]) {
  const W = 1920, H = 1080
  const [cv, g] = lienzo(W, H, 1)
  const img = g.createImageData(W, H)
  const d = img.data
  const sig = azar(semilla)
  let suma = 0
  for (let i = 0; i < d.length; i += 4) {
    const v = sig()
    d[i] = d[i + 1] = d[i + 2] = v
    d[i + 3] = 22            // el alfa lo fija la pieza: ~8,6%, o sea +-11 niveles de oscilacion
    suma += v
  }
  g.putImageData(img, 0, 0)
  medias.push(suma / (d.length / 4))
  hechos.push(guardar('m-grano-' + n, cv, `semilla ${semilla}`))
}

// LA MISMA REGLA DE LOS EMPALMES, PERO EN EL TIEMPO. Cuando una forma se arma con partes que se
// repiten, lo que no puede cambiar entre las partes es lo que las une. Aca las "partes" son los tres
// cuadros y lo que las une es el BRILLO MEDIO: si una semilla saliera un par de niveles mas clara, el
// ciclado de a 2 cuadros metaria un latido de luz en todo el video, a 10 Hz, imposible de diagnosticar
// mirando un cuadro solo. Por eso se mide en vez de suponerlo — el generador es el mismo, pero la
// afirmacion "las tres medias son iguales" no vale gratis.
{
  const lo = Math.min(...medias), hi = Math.max(...medias)
  notas.push(`grano · media por cuadro ${medias.map(m => m.toFixed(3)).join(' / ')}` +
             `  (ideal 127,500 · dispersion ${(hi - lo).toFixed(3)} niveles)`)
  if (hi - lo > 0.5) throw new Error(`las medias del grano se separan ${(hi - lo).toFixed(3)} niveles: al ciclarlo va a latir`)
}

// ============================================================================ 3. m-reticula
//
// Lineas de 1 px cada 120, en grisClaro al 25%, sobre transparente. Dos decisiones que no se ven pero
// se notan:
//
// (a) `fillRect(x, 0, 1, H)` Y NO `stroke()`. Un trazo de 1 px centrado en una coordenada entera se
// reparte medio pixel a cada lado del borde, asi que Skia lo resuelve como DOS columnas al 50%: la
// linea sale de 2 px y borrosa. Se arregla corriendo medio pixel, pero `fillRect` con enteros no tiene
// el problema en absoluto y no hay que acordarse de nada.
//
// (b) LA GRILLA SE PINTA OPACA EN UN LIENZO APARTE Y SE COMPONE UNA SOLA VEZ AL 25%. Si se dibujaran
// las verticales y despues las horizontales directamente al 25%, en cada cruce el alfa se acumula
// (0,25 sobre 0,25 = 0,4375) y aparece un punto mas oscuro en cada interseccion: la reticula deja de
// leerse como grilla y pasa a leerse como una trama de puntos. Pintar opaco primero hace que el cruce
// sea el mismo pixel una sola vez.
{
  const W = 3000, H = 1900, PASO = 120
  const [scratch, sg] = lienzo(W, H, 1)
  sg.fillStyle = P.grisClaro
  // el sobrante se reparte a los dos lados para que la grilla quede centrada en el lienzo: con
  // 1900 de alto y paso 120 sobran 100 px, y todos juntos abajo se ven como un margen raro cuando la
  // capa se mueve
  const offX = Math.floor((W % PASO) / 2), offY = Math.floor((H % PASO) / 2)
  for (let x = offX; x < W; x += PASO) sg.fillRect(x, 0, 1, H)
  for (let y = offY; y < H; y += PASO) sg.fillRect(0, y, W, 1)

  const [cv, g] = lienzo(W, H, 1)
  g.globalAlpha = 0.25
  g.drawImage(scratch, 0, 0)
  g.globalAlpha = 1

  const vert = Math.ceil((W - offX) / PASO), horiz = Math.ceil((H - offY) / PASO)
  hechos.push(guardar('m-reticula', cv, `${vert}x${horiz} lineas · paso ${PASO}`))
  // AL COMPONER: esta capa va a escala 1,0 y se mueve en pixeles ENTEROS. Una linea de 1 px puesta en
  // una coordenada fraccionaria se reparte entre dos columnas y titila en cada cuadro; a escala 0,64
  // directamente desaparece de a ratos. Si la capa tiene que achicarse si o si, la linea pasa a 2 px.
  notas.push('reticula · va a escala 1,0 y en pixeles enteros: una linea de 1 px en coordenada fraccionaria titila')
}

// ============================================================================ 4. m-mancha-naranja
//
// El unico acento de la pieza, y esta apenas insinuado a proposito: alfa maximo 0,10 sobre transparente
// para modo Anadir. Un acento que se ve claramente en el fondo compite con el titular, que es lo que la
// pieza tiene para decir.
//
// LO QUE HAY QUE SABER PARA COMPONERLA, porque si no se pierde media hora subiendole el alfa: en modo
// Anadir el resultado es fondo + color*alfa, y el papel ya esta en 250. La cuenta sobre el papel puro
// da R 250+25=275 y G 250+8=258 — LOS DOS CLIPEAN a 255, o sea que sobre la zona clara la mancha es
// invisible. Sobre la esquina oscurecida por la vinieta (~229) da (254,237,229), un crema calido que si
// se ve. Conclusion: la mancha NO va sobre el foco, va sobre la vinieta o sobre la tinta. Subirle el
// alfa no la hace mas visible ahi arriba, solo clipea antes.
{
  const D = 1400
  const [cv, g] = lienzo(D, D, 1)
  const gr = g.createRadialGradient(D / 2, D / 2, 0, D / 2, D / 2, D / 2)
  // misma trampa que la vinieta: todas las paradas son el MISMO naranja y lo unico que baja es el alfa.
  // Con un `transparent` al final, en Anadir el halo sumaria negro — que no suma nada — y el borde de
  // la mancha se cortaria en seco en vez de apagarse.
  paradas(gr, P.naranja, 0.10, caidaBlob, 32)

  // ESTO NO ES UN DEFECTO Y YA LO MEDI, asi que queda escrito antes de que alguien lo "arregle".
  // Si se lee este PNG con getImageData, el naranja PARECE derivar hacia el amarillo al alejarse del
  // centro: r=0 da rgb(255,82,31), r=400 da rgb(255,70,23) y r=600 da rgb(255,128,0). El original es
  // #FF4D1C = (255,77,28) y no cambia en ninguna parada.
  //
  // Es el redondeo de la alfa PREMULTIPLICADA, que es como el canvas guarda los pixeles. A alfa 2/255
  // el verde premultiplicado vale 77*2/255 = 0,60 y se redondea a 1; al des-premultiplicar para
  // devolverlo, 1*255/2 = 128. De ahi el "amarillo". Lo que se suma en pantalla es el valor
  // premultiplicado —(2,1,0)— que es el correcto con un error de menos de 1/255, asi que en modo
  // Anadir no se ve nada de esto. Comprobado en el otro extremo: a alfa 11 la lectura da (255,70,23),
  // que es EXACTAMENTE lo que predice la cuenta. El degradado esta bien; lo que engana es la lectura.
  g.fillStyle = gr; g.fillRect(0, 0, D, D)
  hechos.push(guardar('m-mancha-naranja', cv, 'modo Anadir · alfa max 0,10'))
}

// ============================================================================ el parte
console.log(`\nrecursos-m / suelo  ->  ${DESTINO}\n`)
for (const h of hechos) console.log('  ' + h.linea)
console.log(`\n  ${hechos.length} recurso(s) · ${hechos.reduce((a, h) => a + h.kb, 0)} KB en total`)
for (const n of notas) console.log('  · ' + n)
console.log()
