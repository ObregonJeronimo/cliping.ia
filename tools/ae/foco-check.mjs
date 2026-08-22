// EL FOCO — que la pieza no le pida al motor un desenfoque que el motor no sabe dibujar.
//
// ESTA COMPUERTA EXISTE POR UNA COSTUMBRE QUE YA SALIO MAL TRES VECES EN UNA SOLA SESION: escribir la
// limitacion de una funcion en un comentario AL LADO DE LA FUNCION, y despues escribir a doscientas
// lineas de distancia una pieza que la viola. Los tres casos:
//
//   1. `sondas/camara.jsx:103` decia, textual, que `addCamera` deja la camara en (0,0,-zoom) y hay que
//      centrarla a mano. Seis piezas despues —b, c, d, g, h, i— ninguna la centraba.
//   2. `motor/comp3d.html` decia que el desenfoque por capa se ve liso hasta cierto radio y que "el uso
//      medido es la entrada por foco, no el fondo completamente fuera de foco". La PIEZA-I puso un
//      panel a 32 px de circulo de confusion y el defecto se vio de una.
//   3. El recorte por matte NO fallo. Y la diferencia no es que yo tuviera mas cuidado: es que ese caso
//      lo escribi como un RECHAZO DEL EXPORTADOR, con nombre y motivo, en vez de como un comentario.
//
// De ahi la regla, que es la unica conclusion util de las tres: UNA LIMITACION QUE NO ES UNA COMPUERTA
// NO EXISTE. Esta es la version de maquina de la limitacion (2).
//
// QUE MIDE. El circulo de confusion de cada capa 3D con textura, en cada cuadro, con la MISMA formula
// que usa el reproductor (`radioDesenfoque`, comp3d.html):
//
//     coc = apertura * |distancia - enfoque| / distancia * (difusion / 100)
//
// en pixeles de pantalla. La distancia es la del EJE de la camara, no la del ojo, que es la que usa el
// motor. No renderiza nada: sale del documento.
//
// EL LIMITE Y DE DONDE SALE. 24 px, y hay que decir de que esta hecho ese numero porque no es un
// barrido: son DOS puntos medidos sobre la PIEZA-I con el reproductor actual (48 muestras en espiral de
// angulo aureo, giradas por pixel). A 32 px el grano se ve en un cuadro quieto, mirando el PNG a
// resolucion nativa. A los 5-20 px que pide una entrada por foco, no se ve. El limite esta puesto
// abajo del unico caso malo conocido y arriba del unico caso bueno conocido, y se va a poder subir el
// dia que el desenfoque se haga en dos pasadas separables. Mientras tanto es un piso honesto, no una
// medicion fina.
//
// Y NO ES SOLO UN LIMITE TECNICO. Un panel que es EL SUJETO de su tiempo y esta fuera de foco no es un
// defecto de motor: es un defecto de camara. La compuerta informa las dos cosas por separado.
//
// EXENCION, con nombre: comentario que contenga FUERADEFOCO en la capa de AE.
//
// USO
//   node tools/ae/foco-check.mjs [comp.json]
//   node tools/ae/foco-check.mjs [comp.json] --tabla       todas las capas, no solo las que se pasan
//   node tools/ae/foco-check.mjs [comp.json] --inyectar N  CONTROL NEGATIVO: aleja el plano de foco

import { existsSync, readFileSync } from 'node:fs'
import { cinematica, rectanguloDe, propEn } from './cinematica.mjs'

const args = process.argv.slice(2)
const RUTA = args.find(a => !a.startsWith('--')) || 'C:/ae-probe/pieza-i.json'
const TABLA = args.includes('--tabla')
const INYECTAR = args.includes('--inyectar')

if (!existsSync(RUTA)) { console.error(`falta ${RUTA}`); process.exit(2) }
const doc = JSON.parse(readFileSync(RUTA, 'utf8'))

const camaraDoc = doc.capas.find(c => c.tipo === 'camara')
if (!camaraDoc || !camaraDoc.camara?.conProfundidad) {
  console.log('FOCO OK — la composicion no usa profundidad de campo')
  process.exit(0)
}

if (INYECTAR) {
  // el plano de foco se lleva al infinito: TODO lo que este cerca tiene que pasarse del limite
  const T = camaraDoc.transformacion
  if (T.enfoque?.pistas?.[0]) for (const s of T.enfoque.pistas[0].tramos) { s.v1 = 9000; s.v2 = 9000 }
  else T.enfoque = { estatico: [9000] }
  console.log('CONTROL NEGATIVO — plano de foco a 9000. La compuerta TIENE que ponerse roja.\n')
}

const K = cinematica(doc)
const { fps } = K
const CUADROS = Math.round(doc.comp.duracion * fps)
const LIMITE = 24

// solo las capas que el motor desenfoca: 3D y con textura. Un solido o un texto 2D no pasan por el
// shader del mapa, asi que preguntarles por su foco seria inventar un dato.
const medibles = doc.capas.filter(c =>
  c.es3D && c.tipo !== 'camara' && rectanguloDe(c) && (c.raster || c.origen || c.texto))
const eximidas = []
const capas = medibles.filter(c => {
  if (/FUERADEFOCO/i.test(c.comentario || '')) { eximidas.push(c.nombre); return false }
  return true
})

const peor = new Map()
for (let f = 0; f < CUADROS; f++) {
  K.enCuadro(f)
  const t = f / fps
  const T = camaraDoc.transformacion
  const enfoque = propEn(T, 'enfoque', 0, t, camaraDoc.camara.enfoque)
  const apertura = propEn(T, 'apertura', 0, t, camaraDoc.camara.apertura)
  const difusion = (camaraDoc.camara.difusion ?? 100) / 100
  for (const c of capas) {
    if (!(t >= c.entra - 1e-9 && t < c.sale - 1e-9 && c.visible !== false)) continue
    const op = propEn(c.transformacion, 'opacidad', 0, t, 100)
    if (op < 25) continue                       // entrando o saliendo: su foco no es lo que se juzga
    const d = K.profundidad(c, t)
    if (!(d > 1)) continue
    const coc = apertura * Math.abs(d - enfoque) / d * difusion
    const q = K.esquinas(c, t)
    const area = q ? Math.abs(
      (q[0][0] * q[1][1] - q[1][0] * q[0][1]) + (q[1][0] * q[2][1] - q[2][0] * q[1][1]) +
      (q[2][0] * q[3][1] - q[3][0] * q[2][1]) + (q[3][0] * q[0][1] - q[0][0] * q[3][1])) / 2 : 0
    const g = peor.get(c.nombre) || { coc: 0, f: 0, n: 0, area: 0, d: 0, enfoque: 0 }
    if (coc > g.coc) { g.coc = coc; g.f = f; g.d = d; g.enfoque = enfoque }
    if (coc > LIMITE) g.n++
    g.area = Math.max(g.area, area / (K.ancho * K.alto))
    peor.set(c.nombre, g)
  }
}

const pasadas = [...peor].filter(([, g]) => g.n > 0).sort((a, b) => b[1].coc - a[1].coc)

console.log(`FOCO — "${doc.comp.nombre}" · ${capas.length} capas 3D con textura · limite ${LIMITE} px`)

console.log('\n  CAPAS QUE PIDEN MAS DESENFOQUE DEL QUE EL MOTOR DIBUJA LISO')
if (!pasadas.length) console.log('    ninguna')
for (const [n, g] of pasadas) {
  const sujeto = (g.area > 0.18 && g.area < 1.2) ? '  <- Y ADEMAS OCUPA EL ' + (g.area * 100).toFixed(0) + '% DEL CUADRO: es el sujeto, no el fondo' : ''
  console.log(`    ${g.coc.toFixed(0).padStart(4)} px  ${String(g.n).padStart(4)} cuadros pasados  ${n.padEnd(20)} ` +
    `peor en f${g.f} (a ${g.d.toFixed(0)} de la camara, foco en ${g.enfoque.toFixed(0)})${sujeto}`)
}

if (TABLA) {
  console.log('\n  TODAS (circulo de confusion maximo)')
  for (const [n, g] of [...peor].sort((a, b) => b[1].coc - a[1].coc)) {
    console.log(`    ${g.coc.toFixed(1).padStart(6)} px  ${n}`)
  }
}
if (eximidas.length) console.log(`\n  EXIMIDAS (declaradas FUERADEFOCO): ${eximidas.join(', ')}`)

console.log('')
console.log('='.repeat(72))
if (!pasadas.length) console.log(`FOCO OK — ningun desenfoque pasa los ${LIMITE} px que el motor dibuja liso`)
else console.log(`FOCO NO PASA — ${pasadas.length} capa(s) piden un desenfoque que el motor no sabe dibujar`)
process.exit(pasadas.length ? 1 : 0)
