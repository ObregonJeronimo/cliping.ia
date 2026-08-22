// QUE TIPOGRAFIAS VE SKIA DE VERDAD — preguntado midiendo, no leyendo una lista.
//
// POR QUE EXISTE. Una pieza de este motor pasa la tipografia por TRES manos distintas y las tres fallan
// del mismo modo silencioso: si la familia no esta, dibujan otra y no avisan.
//   · AE la usa para componer y para `sourceRectAtTime`  -> `sondas/fuentes.jsx` lo mide
//   · Chromium la usa para dibujar el texto del motor    -> `comp3d.html:610` cae a sans-serif callado
//   · Skia la usa para HORNEAR los PNG de recursos       -> esto
//
// La captura de una app dibujada con la sustituta y el texto vivo dibujado con la buena no se ven
// distintos en una tira reescalada: se ven distintos cuando el usuario abre el video.
//
// COMO SE MIDE SIN CREERLE A NADIE. Se pide una familia que seguro no existe y se anota el ancho de lo
// que sale — esa es la sustituta. Despues se mide cada candidata: si su ancho es EXACTAMENTE el de la
// sustituta, no existe. Un `measureText` que devuelve un numero no prueba que la fuente este; prueba
// que algo dibujo.
//
// USO
//   node tools/ae/fuentes-skia.mjs

import { createCanvas } from '@napi-rs/canvas'

const MUESTRA = 'LangEase Handoff 95/100'
const TAM = 72

const CANDIDATAS = [
  'Century Gothic', 'CenturyGothic', 'Poppins', 'Inter', 'Montserrat', 'Futura', 'Avenir Next',
  'Segoe UI', 'Segoe UI Light', 'Segoe UI Semibold', 'Bahnschrift', 'Arial', 'Arial Black',
  'Verdana', 'Trebuchet MS', 'Calibri', 'Tahoma', 'Corbel', 'Candara', 'Franklin Gothic Medium',
  'Gill Sans MT', 'Nirmala UI', 'Ebrima', 'Selawik', 'Leelawadee UI', 'Microsoft JhengHei UI',
]

const cv = createCanvas(10, 10)
const g = cv.getContext('2d')

function medir(familia) {
  g.font = `${TAM}px "${familia}"`
  const m = g.measureText(MUESTRA)
  return {
    ancho: m.width,
    alto: (m.actualBoundingBoxAscent || 0) + (m.actualBoundingBoxDescent || 0),
  }
}

// dos nombres imposibles, no uno: si los dos dan lo mismo, ese es el ancho de la sustituta
const f1 = medir('NoExisteEstaFuenteXYZ')
const f2 = medir('TampocoExisteEstaOtraQWE')
const coincide = Math.abs(f1.ancho - f2.ancho) < 0.01
console.log(`sustituta: ancho ${f1.ancho.toFixed(2)} · alto ${f1.alto.toFixed(2)}` +
            `  (dos nombres imposibles dan ${coincide ? 'LO MISMO, control OK' : 'DISTINTO — el control fallo'})`)
if (!coincide) {
  console.error('\nEl control negativo no se cumple: dos familias inexistentes miden distinto.')
  console.error('Sin ese control, "existe" y "no existe" no se pueden separar. No sigo.')
  process.exit(2)
}
console.log('')

const hay = []
for (const f of CANDIDATAS) {
  const m = medir(f)
  const existe = Math.abs(m.ancho - f1.ancho) > 0.01 || Math.abs(m.alto - f1.alto) > 0.01
  console.log(`  ${existe ? 'SI ' : 'no '} ${f.padEnd(24)} ancho ${m.ancho.toFixed(2).padStart(8)}` +
              `  alto ${m.alto.toFixed(2).padStart(7)}`)
  if (existe) hay.push({ f, ...m })
}

console.log('')
console.log(`${hay.length} de ${CANDIDATAS.length} familias existen en Skia.`)
console.log('')
console.log('OJO: que exista en Skia no alcanza. La misma familia tiene que estar en AE (que compone)')
console.log('y en Chromium (que dibuja el texto vivo). Una que este en dos de las tres da una pieza')
console.log('donde las capturas horneadas y los titulares no son la misma tipografia.')
