// ¿SE PUEDE LEER, Y SE VE NITIDO? — sin renderizar un solo cuadro.
//
// Las dos compuertas que ya existen contestan otras preguntas: `ritmo` pregunta si hay coreografia y
// `escena` pregunta si el movimiento llega a la pantalla. Ninguna pregunta si el texto se puede LEER ni
// si una textura llega NITIDA, y las dos cosas son defectos que el espectador ve en el primer segundo.
//
// Las reglas salen de `aesthetic-rules.md` de video-shotcraft, que es la primera lista de criterios
// estéticos COMPROBABLES que vi. Dos de ellas son aritmética pura sobre la geometria proyectada, o sea
// que entran en este motor sin costo:
//
//   Q11 · ALTURA MINIMA DE TEXTO
//     "字幕有效字高 >=56px (>=5.2% 帧高), 辅助文字 >=32px (>=3%)"
//     Subtitulo narrativo >= 5,2% del alto de cuadro; texto de apoyo >= 3%. Y la parte que mas me
//     gusto: **el texto existe en dos modos, decorativo o legible, y no hay termino medio**. Un texto
//     a medio camino —chico pero nitido, presente pero ilegible— es el que delata que nadie lo penso.
//     Se mide sobre los PIXELES RENDERIZADOS, no sobre el cuerpo declarado: una capa de 132 px vista
//     de lejos y girada puede proyectar 20.
//
//   Q2 · RASTERIZACION 2-4x
//     "3D 场景里的 UI 纹理按显示尺寸的 2-4 倍原生栅格化"
//     Una textura de interfaz se rasteriza entre 2 y 4 veces el tamaño con que se dibuja. Y la frase
//     que corrige el diagnostico equivocado mas comun: **si el texto de una captura sale borroso, fallo
//     la rasterizacion, no la profundidad de campo**. Se mide comparando los pixeles NATIVOS del
//     recurso contra los pixeles con que se dibuja.
//
// LO QUE ESTA COMPUERTA NO DICE: si el texto dice algo que valga la pena, ni si la composicion es
// buena. Dice si llega legible y si llega nitido.
//
// USO
//   node tools/ae/lectura-check.mjs [comp.json]

import { existsSync, readFileSync } from 'node:fs'
import { cinematica, rectanguloDe, propEn } from './cinematica.mjs'

const RUTA = process.argv[2] || 'C:/ae-probe/p3/motor/comp.json'
if (!existsSync(RUTA)) { console.error(`falta ${RUTA}`); process.exit(2) }
const doc = JSON.parse(readFileSync(RUTA, 'utf8'))
const K = cinematica(doc)
const { ancho, alto, fps } = K
const CUADROS = Math.round(doc.comp.duracion * fps)

// los pisos de Q11, en fraccion del alto de cuadro
const PISO_NARRATIVO = 0.052
const PISO_APOYO = 0.030
// una capa DECORATIVA esta declarada: o se llama asi, o esta lo bastante atenuada como para que nadie
// intente leerla. El punto de la regla es que no exista el termino medio.
const esDecorativo = (c, op) => /^deco|^textura|^grano/i.test(c.nombre) || op < 25

const alturaQuad = (q) => {
  const ys = q.map(p => p[1])
  return Math.max(...ys) - Math.min(...ys)
}
const anchoQuad = (q) => {
  const xs = q.map(p => p[0])
  return Math.max(...xs) - Math.min(...xs)
}

// Q2 HABLA DE TEXTURAS DE INTERFAZ, y una mancha de luz no lo es.
//
// La regla dice "UI 纹理" — textura de interfaz — y su razon es que el texto y los bordes de una captura
// se deshacen al estirarse. Un degradado radial no tiene ni texto ni bordes: estirarlo al 0,74x no
// pierde absolutamente nada, porque no hay nada que perder. Aplicarle la regla igual da un fallo que no
// corresponde a ningun defecto visible, y un fallo asi es peor que no medir: entrena a saltearla.
//
// Se exime por NOMBRE, con el mismo prefijo `deco-` que ya usa Q11, y no por adivinar el contenido. El
// que escribe la pieza declara que esa capa es decorativa; la compuerta no lo deduce.
const esSuave = (c) => /^deco-|^grano/i.test(c.nombre)

const textos = doc.capas.filter(c => c.tipo === 'texto' && rectanguloDe(c))
const imagenes = doc.capas.filter(c => c.tipo === 'av' && c.origen?.copiado && rectanguloDe(c) && !esSuave(c))
const eximidas = doc.capas.filter(c => c.tipo === 'av' && c.origen?.copiado && esSuave(c)).length

const legibilidad = new Map()
const nitidez = new Map()

for (let f = 0; f < CUADROS; f++) {
  K.enCuadro(f)
  const t = f / fps
  const dentro = (c) => t >= c.entra - 1e-9 && t < c.sale - 1e-9 && c.visible !== false

  for (const c of textos) {
    if (!dentro(c)) continue
    const op = propEn(c.transformacion, 'opacidad', 0, t, 100)
    if (op < 1) continue
    const q = K.esquinas(c, t)
    if (!q) continue
    // LA ALTURA EFECTIVA DE CARACTER, NO LA DE LA TINTA.
    //
    // Medir la caja de tinta parecia lo mas honesto y tiene un sesgo que la hace inservible: depende de
    // QUE LETRAS tenga la cadena. Medido: la misma fuente de 36 px da 3,2% del alto en "una pieza de
    // producto" (tiene 'p' con descendente y 'd' con ascendente) y 2,2% en "otra vez". El texto es el
    // mismo tamaño; lo que cambia es el alfabeto.
    //
    // Q11 habla de 有效字高 — altura EFECTIVA de caracter. Se obtiene escalando el cuerpo declarado por
    // el factor con que la proyeccion agranda o achica la caja: cuanto mide esa fuente EN PANTALLA.
    const cajaCapa = Math.max(c.caja.alto, 1)
    const factor = alturaQuad(q) / cajaCapa
    const h = (c.texto.tamano * factor) / alto
    const g = legibilidad.get(c.nombre) || { n: 0, min: 1, max: 0, deco: 0, tam: c.texto?.tamano || 0 }
    g.n++
    g.min = Math.min(g.min, h)
    g.max = Math.max(g.max, h)
    if (esDecorativo(c, op)) g.deco++
    legibilidad.set(c.nombre, g)
  }

  for (const c of imagenes) {
    if (!dentro(c)) continue
    const op = propEn(c.transformacion, 'opacidad', 0, t, 100)
    if (op < 1) continue
    const q = K.esquinas(c, t)
    if (!q) continue
    const dibujado = Math.max(anchoQuad(q), 1)
    const razon = c.origen.ancho / dibujado          // >1 = sobra resolucion, <1 = se estira
    const g = nitidez.get(c.nombre) || { n: 0, peor: Infinity, nativo: c.origen.ancho }
    g.n++
    g.peor = Math.min(g.peor, razon)
    nitidez.set(c.nombre, g)
  }
}

// ---------------------------------------------------------------- el veredicto
console.log(`LECTURA — "${doc.comp.nombre}" · ${CUADROS} cuadros · ${textos.length} textos · ${imagenes.length} imagenes`)

console.log(`\n  ALTURA DEL TEXTO EN PANTALLA (piso narrativo ${(PISO_NARRATIVO * 100).toFixed(1)}% · apoyo ${(PISO_APOYO * 100).toFixed(1)}%)`)
let ilegibles = 0
if (!legibilidad.size) console.log('    (la composicion no tiene texto)')
for (const [n, g] of [...legibilidad].sort((a, b) => a[1].max - b[1].max)) {
  // se juzga por el MAXIMO: un texto que en algun momento se lee, se leyo. El minimo cuenta la
  // entrada, donde puede estar chico a proposito.
  const pct = (g.max * 100).toFixed(1)
  const decorativo = g.deco > g.n * 0.8
  const estado = decorativo ? 'deco' : g.max >= PISO_NARRATIVO ? 'ok  ' : g.max >= PISO_APOYO ? 'apoyo' : 'ILEG'
  if (estado === 'ILEG') ilegibles++
  console.log(`    ${estado.padEnd(5)} ${pct.padStart(5)}% del alto  ${String(g.tam).padStart(4)}px declarados  ${n}`)
}

console.log(`\n  RESOLUCION DE LAS IMAGENES (Q2: nativo entre 2x y 4x de lo dibujado)` +
  (eximidas ? ` · ${eximidas} eximida(s) por decorativas` : ''))
let estiradas = 0
if (!nitidez.size) console.log('    (la composicion no tiene imagenes)')
for (const [n, g] of [...nitidez].sort((a, b) => a[1].peor - b[1].peor)) {
  const estado = g.peor >= 2 ? 'ok  ' : g.peor >= 1 ? 'justo' : 'BORRO'
  if (g.peor < 1) estiradas++
  console.log(`    ${estado.padEnd(5)} ${g.peor.toFixed(2)}x en su peor cuadro  ${String(g.nativo).padStart(5)} px nativos  ${n}`)
}

console.log('')
console.log('='.repeat(72))
const mal = ilegibles + estiradas
if (!mal) console.log('LECTURA OK — todo el texto se lee y ninguna imagen se estira')
else console.log(`LECTURA NO PASA — ${ilegibles} texto(s) por debajo del piso · ${estiradas} imagen(es) estirada(s)`)
process.exit(mal ? 1 : 0)
