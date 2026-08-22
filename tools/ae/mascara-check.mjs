// EL CUADRO DE AFTER EFFECTS CONTRA EL CUADRO DEL MOTOR, PIXEL A PIXEL.
//
// POR QUE EXISTE, Y POR QUE NO SE PARECE A NINGUNA OTRA COMPUERTA DE ESTE REPO. Todas las demas
// comparan NUMEROS que AE expone: `valueAtTime` para las curvas, `sourceRectAtTime` para la tipografia
// y para los animadores de texto. Con las MASCARAS ese camino se termina, y esta medido en
// `sondas/mascara.jsx`: un solido de 400x300 sigue midiendo 400x300 con la mascara puesta, invertida,
// con calado, con expansion, con opacidad y con varias mascaras en TODOS los modos. `sourceRectAtTime`
// no las refleja. Sin ningun numero que dependa de la mascara, no hay compuerta posible.
//
// La salida fue descubrir que `comp.saveFrameToPng` EXISTE y anda. AE puede escribir un cuadro suelto a
// disco, con alfa. Eso NO contradice la arquitectura —AE sigue sin renderizar el video— porque
// renderizar un cuadro para MEDIR es la misma categoria que `valueAtTime`: es medicion, no produccion.
//
// QUE COMPARA. El PNG de AE contra el PNG del motor, canal por canal. Se informan tres numeros que
// fallan por razones distintas, y separarlos es el punto:
//   · ALFA        la mascara misma. Es lo que esta compuerta existe para medir.
//   · COLOR       donde los dos tienen tinta. Un color distinto no es un defecto de mascara.
//   · COBERTURA   cuantos pixeles tiene uno y no el otro. Es el borde: calado, antialias, expansion.
//
// LAS CAPAS CON RECHAZO DECLARADO SE EXCLUYEN, con nombre. Si el documento dijo que algo de una capa no
// viaja, el motor la dibuja distinto A PROPOSITO y compararla es medir dos cosas distintas. Se tapa su
// caja proyectada usando la misma cinematica que usa el reproductor.
//
// USO
//   node tools/ae/cuadro-ae.mjs SONDA-MASCARA2 0,20,40,55
//   python tools/ae/motor/capturar-comp.py --doc <doc> --salida <dir> --obturador 1 --cuadros 0,20,40,55
//   node tools/ae/mascara-check.mjs <doc.json> <dir del motor> 0,20,40,55
//
//   --inyectar   CONTROL NEGATIVO: corre el alfa del motor y comprueba que se pone roja

import { existsSync, readFileSync } from 'node:fs'
import { cinematica } from './cinematica.mjs'

const args = process.argv.slice(2)
const INYECTAR = args.includes('--inyectar')
const libres = args.filter(a => !a.startsWith('--'))
const DOC = libres[0] || 'C:/ae-probe/mascara2.json'
const DIR_MOTOR = libres[1] || 'C:/ae-probe/render/MASC'
const CUADROS = (libres[2] || '0').split(',').filter(s => s !== '').map(Number)
// la carpeta de AE se deduce del NOMBRE de la composicion que trae el documento: asi la
// compuerta no puede comparar contra los cuadros de otra pieza aunque midan lo mismo
const DIR_AE = `C:/ae-probe/ae-cuadros/${JSON.parse(readFileSync(DOC, 'utf8')).comp.nombre}`

// SE SEPARA EL BORDE DEL INTERIOR, Y ES LA DIFERENCIA ENTRE UN DEFECTO Y UN UMBRAL MAL PUESTO.
//
// AE y Chromium suavizan los bordes de un poligono distinto, siempre. Eso pone una diferencia
// IRREDUCIBLE que crece con la cantidad de borde de la escena, no con lo mal que este el motor: una
// rueda de ocho paneles superpuestos tiene cuatro veces mas borde que una caja de seis caras, y con un
// umbral global salia roja por ser mas detallada.
//
// Medido sobre la rueda: de 1141 pixeles con el color distinto, **1074 estaban en un borde y 67
// adentro de una cara** — y esos 67 eran valores intermedios, o sea antialias en costuras. Cero error
// de orden de dibujo.
//
// Asi que el veredicto lo da el INTERIOR, que es donde un pixel distinto significa que se dibujo otra
// cosa. El borde se informa y no reprueba.
const TOL_ALFA = 0.05       // % del cuadro con el alfa distinto LEJOS de toda transicion
const TOL_INTERIOR = 0.12   // % de la tinta con color distinto LEJOS de todo borde
const DELTA_A = 24
const DELTA_C = 20

if (!existsSync(DOC)) { console.error(`falta ${DOC}`); process.exit(2) }
const doc = JSON.parse(readFileSync(DOC, 'utf8'))
const { loadImage, createCanvas } = await import('@napi-rs/canvas')

// ---------------------------------------------------------------- las capas que no se comparan
const conRechazo = new Map()
for (const r of (doc.noSoportado || [])) {
  const c = String(r.capa)
  if (!conRechazo.has(c)) conRechazo.set(c, [])
  conRechazo.get(c).push(`${r.que}${r.detalle && r.detalle !== '-' ? ` (${r.detalle})` : ''}`)
}
const K = cinematica(doc)
const { ancho, alto, fps } = K

function zonasExcluidas(cuadro) {
  if (!conRechazo.size) return []
  K.enCuadro(cuadro)
  const t = cuadro / fps
  const zonas = []
  for (const c of doc.capas) {
    if (!conRechazo.has(String(c.indice))) continue
    const q = K.esquinas(c, t)
    if (!q) continue
    // se tapa la caja envolvente con un margen: el borde de una capa mal reproducida sangra
    const m = 6
    zonas.push({
      x0: Math.min(...q.map(p => p[0])) - m, y0: Math.min(...q.map(p => p[1])) - m,
      x1: Math.max(...q.map(p => p[0])) + m, y1: Math.max(...q.map(p => p[1])) + m,
    })
  }
  return zonas
}

async function pixeles(ruta) {
  const im = await loadImage(ruta)
  const cv = createCanvas(im.width, im.height)
  const g = cv.getContext('2d')
  g.drawImage(im, 0, 0)
  return { d: g.getImageData(0, 0, im.width, im.height).data, w: im.width, h: im.height }
}

if (INYECTAR) {
  console.log('CONTROL NEGATIVO — el alfa del motor se recorta al 88%. Tiene que ponerse roja.\n')
}

console.log(`MASCARA — "${doc.comp.nombre}" · ${CUADROS.length} cuadro(s) de AE contra el motor`)
if (conRechazo.size) {
  console.log('\n  EXCLUIDAS (el documento declaro que algo de estas capas no viaja, asi que el motor las')
  console.log('  dibuja distinto A PROPOSITO; se tapa su caja proyectada):')
  for (const [c, motivos] of conRechazo) {
    const capa = doc.capas.find(x => String(x.indice) === c)
    console.log(`    capa ${c} "${capa ? capa.nombre : '?'}" — ${motivos.join(' · ')}`)
  }
}
console.log('')

const filas = []
for (const k of CUADROS) {
  const nom = `f${String(k).padStart(3, '0')}.png`
  const rAE = `${DIR_AE}/${nom}`, rMO = `${DIR_MOTOR}/${nom}`
  if (!existsSync(rAE)) { console.error(`falta el cuadro de AE ${rAE} — corre tools/ae/cuadro-ae.mjs`); process.exit(2) }
  if (!existsSync(rMO)) { console.error(`falta el cuadro del motor ${rMO} — corre capturar-comp.py`); process.exit(2) }
  const A = await pixeles(rAE), M = await pixeles(rMO)
  if (A.w !== M.w || A.h !== M.h) {
    console.error(`el cuadro ${k} mide ${A.w}x${A.h} en AE y ${M.w}x${M.h} en el motor`)
    process.exit(2)
  }
  const zonas = zonasExcluidas(k)
  const dentro = (x, y) => zonas.some(z => x >= z.x0 && x <= z.x1 && y >= z.y0 && y <= z.y1)

  let total = 0, malA = 0, malC = 0, conTinta = 0, soloAE = 0, soloMO = 0
  let malBorde = 0, malDentro = 0, malABorde = 0, malADentro = 0
  for (let y = 0; y < A.h; y++) {
    for (let x = 0; x < A.w; x++) {
      if (zonas.length && dentro(x, y)) continue
      const i = (y * A.w + x) * 4
      total++
      let aM = M.d[i + 3]
      if (INYECTAR) aM = Math.round(aM * 0.88)
      const aA = A.d[i + 3]
      if (Math.abs(aA - aM) > DELTA_A) {
        malA++
        // EL MISMO CRITERIO QUE PARA EL COLOR: un alfa distinto pegado a una transicion de alfa es
        // antialias de silueta, y crece con el detalle de la escena. Uno LEJOS de toda transicion
        // significa que falta o sobra algo, y ese es el que importa.
        let bordeA = x < 2 || y < 2 || x >= A.w - 2 || y >= A.h - 2
        if (!bordeA) {
          for (let dy = -2; dy <= 2 && !bordeA; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
              if (!dx && !dy) continue
              if (Math.abs(A.d[i + 3] - A.d[((y + dy) * A.w + (x + dx)) * 4 + 3]) > 24) { bordeA = true; break }
            }
          }
        }
        if (bordeA) malABorde++; else malADentro++
      }
      if (aA > 200 && aM > 200) {
        conTinta++
        const dc = Math.max(Math.abs(A.d[i] - M.d[i]), Math.abs(A.d[i + 1] - M.d[i + 1]),
                            Math.abs(A.d[i + 2] - M.d[i + 2]))
        if (dc > DELTA_C) {
          malC++
          // ¿esta en un borde? Se mira si algun vecino es transparente o de otro color EN AE. Si lo
          // esta, la diferencia es antialias; si no, el motor dibujo otra cosa.
          // EL VECINDARIO ES DE DOS PIXELES, no de uno. Una transicion de antialias ocupa dos, asi
          // que mirar solo los cuatro vecinos inmediatos deja pasar como "interior" al segundo pixel
          // de la rampa. Con radio 2 el interior queda limpio: en la rueda paso de 0,34% a lo que
          // muestra la corrida, y lo que sobrevive es de verdad otra cara dibujada.
          let borde = x < 2 || y < 2 || x >= A.w - 2 || y >= A.h - 2
          if (!borde) {
            for (let dy = -2; dy <= 2 && !borde; dy++) {
              for (let dx = -2; dx <= 2; dx++) {
                if (!dx && !dy) continue
                const j = ((y + dy) * A.w + (x + dx)) * 4
                if (A.d[j + 3] < 200) { borde = true; break }
                if (Math.max(Math.abs(A.d[i] - A.d[j]), Math.abs(A.d[i + 1] - A.d[j + 1]),
                             Math.abs(A.d[i + 2] - A.d[j + 2])) > 20) { borde = true; break }
              }
            }
          }
          if (borde) malBorde++; else malDentro++
        }
      } else if (aA > 200 && aM < 40) soloAE++
      else if (aM > 200 && aA < 40) soloMO++
    }
  }
  filas.push({
    k, pctA: malA / total * 100,
    pctADentro: malADentro / total * 100, pctABorde: malABorde / total * 100,
    pctC: conTinta ? malC / conTinta * 100 : 0,
    pctBorde: conTinta ? malBorde / conTinta * 100 : 0,
    pctDentro: conTinta ? malDentro / conTinta * 100 : 0,
    soloAE: soloAE / total * 100, soloMO: soloMO / total * 100,
  })
}

console.log('  cuadro   alfa borde/adentro   color borde/adentro    solo AE   solo motor')
for (const f of filas) {
  console.log(`  ${String(f.k).padStart(5)}  ${f.pctABorde.toFixed(3).padStart(6)}%/${f.pctADentro.toFixed(3).padStart(6)}%   ` +
    `${f.pctBorde.toFixed(3).padStart(7)}% / ${f.pctDentro.toFixed(3).padStart(7)}%   ` +
    `${f.soloAE.toFixed(3).padStart(10)}%   ${f.soloMO.toFixed(3).padStart(14)}%`)
}
const peorA = Math.max(...filas.map(f => f.pctADentro))
const peorATotal = Math.max(...filas.map(f => f.pctA))
const peorC = Math.max(...filas.map(f => f.pctDentro))

console.log('\n  QUE SIGNIFICA CADA COLUMNA')
console.log('    alfa distinto   la mascara misma. Es lo que esta compuerta existe para medir.')
console.log('    color distinto  donde los dos tienen tinta. No es un defecto de mascara.')
console.log('    solo en uno     el borde: calado, antialias y expansion. Un pixel de orla en una')
console.log('                    figura de 500x260 son ~0,3% del cuadro y no se ve.')

console.log('')
console.log('='.repeat(72))
const mal = peorA > TOL_ALFA || peorC > TOL_INTERIOR
const peorBorde = Math.max(...filas.map(f => f.pctBorde))
if (!mal) console.log(`MASCARA OK — alfa adentro ${peorA.toFixed(3)}% (techo ${TOL_ALFA}%, borde ${peorATotal.toFixed(2)}%) · adentro ${peorC.toFixed(3)}% (techo ${TOL_INTERIOR}%) · borde ${peorBorde.toFixed(2)}% (informativo)`)
else console.log(`MASCARA NO PASA — alfa adentro ${peorA.toFixed(3)}% (techo ${TOL_ALFA}%) · adentro ${peorC.toFixed(3)}% (techo ${TOL_INTERIOR}%)`)
process.exit(mal ? 1 : 0)
