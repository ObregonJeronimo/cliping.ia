// LA TERCERA COLUMNA: ¿el motor web dibuja lo mismo que After Effects?
//
// POR QUE HACE FALTA, dicho sin adornos: la Prueba 3 comparaba los píxeles de AE contra un número
// calculado en Node. Eso mide UN eslabón de dos. La cadena real es
//
//     AE ──(keyframes, curvas)──► documento de escena ──(GSAP + navegador)──► píxeles
//
// y el segundo tramo —el que decide si la animación portada se VE igual— no estaba medido. Que
// `curvas.mjs` coincida con GSAP `CustomEase` a 5,8e-4 compara *funciones de easing*, no cuadros: no
// toca el armado de la timeline, ni el reloj, ni el origen de coordenadas, ni el orden de las
// transformaciones. Ahí viven los errores de medio cuadro y de eje espejado.
//
// LAS CUATRO COLUMNAS QUE SALEN DE ACA
//
//   AE dice        valueAtTime de After Effects              <- la verdad de AE, sin píxeles
//   AE pinta       centroide medido sobre el PNG de AE       <- el render de AE
//   motor cree     lo que la página dice haber puesto        <- GSAP + nuestra conversión
//   motor pinta    centroide medido sobre el PNG del navegador
//
// Con eso, cuando algo falla se sabe DÓNDE: si "motor cree" difiere de "AE dice", el problema está en
// la conversión o en la timeline; si coinciden y "motor pinta" difiere de "AE pinta", el problema es
// de rasterizado. Un solo número no distingue esas dos cosas, y llevan a arreglos opuestos.
//
// USO
//   node tools/ae/motor-check.mjs --exportar    escribe el documento de escena
//   python tools/ae/motor/capturar.py           renderiza en el navegador
//   node tools/ae/motor-check.mjs               compara

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { leerPNG, medirHuella } from './png.mjs'
import { documentoDe, predecirDe } from './escena.mjs'

const DIR = 'C:/ae-probe/p3'
const MOTOR = join(DIR, 'motor')

// ---------------------------------------------------------------- exportar el documento
if (process.argv.includes('--exportar')) {
  const doc = documentoDe(DIR)
  if (!existsSync(MOTOR)) mkdirSync(MOTOR, { recursive: true })
  writeFileSync(join(MOTOR, 'escena.json'), JSON.stringify(doc, null, 1))
  console.log(`documento de escena: ${join(MOTOR, 'escena.json')}`)
  console.log(`${doc.piezas.length} piezas · mundo ${doc.mundo.ancho}x${doc.mundo.alto} @ ${doc.mundo.fps}fps`)
  for (const p of doc.piezas) {
    const tramos = p.pistas.flatMap(x => x.tramos)
    const tipos = [...new Set(tramos.map(t => t.tipo))].join('+')
    console.log(`  ${p.id.padEnd(7)}${String(tramos.length).padStart(2)} tramo(s) ${tipos.padEnd(18)}` +
      (p.rechazado ? `RECHAZADO: ${p.motivo}` : ''))
  }
  process.exit(0)
}

// ---------------------------------------------------------------- comparar
const escena = join(MOTOR, 'escena.json')
if (!existsSync(escena)) {
  console.error('Falta el documento de escena. Corre:  node tools/ae/motor-check.mjs --exportar')
  process.exit(2)
}
const doc = JSON.parse(readFileSync(escena, 'utf8'))
const estadosRuta = join(MOTOR, 'estados.json')
if (!existsSync(estadosRuta)) {
  console.error('Falta la captura del motor. Corre:  python tools/ae/motor/capturar.py')
  process.exit(2)
}
const estados = JSON.parse(readFileSync(estadosRuta, 'utf8'))

// el volcado crudo de AE, para las dos columnas de AE
const crudo = documentoDe(DIR)
const { leerVolcado } = await import('./escena.mjs')
const { casos, mundo } = leerVolcado(DIR)
const porId = new Map(casos.map(c => [c.id, c]))

const medir = (ruta) => {
  if (!existsSync(ruta)) return null
  const img = leerPNG(ruta)
  if (img.canales !== 4) return { sinAlfa: true }
  const h = medirHuella(img)
  return h.vacia ? { vacia: true } : h
}

console.log('LA TERCERA COLUMNA — After Effects contra el motor web, sobre los mismos cuadros')
console.log(`${doc.piezas.length} piezas · ${mundo.ancho}x${mundo.alto} @ ${mundo.fps}fps\n`)

// LOS MODOS SALEN DE LOS DATOS, NO DE UNA LISTA ESCRITA ACA. Si la pagina agrega uno, aparece solo.
const MODOS = [...new Set(Object.keys(estados).map(k => k.split('/')[0]))]

let rojo = false
const problemas = []
const detalle = []
const resumen = new Map()

for (const modo of MODOS) {
console.log(`\n=== modo "${modo}" ${modo === 'custom' ? '(GSAP CustomEase con la cadena de nuestro conversor)'
  : '(una funcion de ease que resuelve el bezier, como hace el navegador con cubic-bezier de CSS)'}`)
console.log('pieza  conversion    render        AE vs MOTOR   que se mide')
console.log('       (motor cree   (motor pinta  (los dos')
console.log('        vs AE dice)   vs cree)      renders)')
console.log('-'.repeat(76))

for (const pieza of doc.piezas) {
  if (pieza.rechazado) {
    console.log(`${pieza.id.padEnd(7)}${'—'.padEnd(14)}${'—'.padEnd(14)}${'—'.padEnd(14)}rechazado: ${pieza.motivo}`)
    continue
  }
  const caso = porId.get(pieza.id)
  const st = estados[`${modo}/${pieza.id}`]
  if (!st) { problemas.push(`${modo}/${pieza.id}: el motor no lo capturo`); rojo = true; continue }

  const eC = [], eR = [], eT = []
  for (const fila of st) {
    const cuadroAE = caso.cuadros.find(q => q.k === fila.k)
    if (!cuadroAE) continue
    const hAE = medir(join(DIR, cuadroAE.archivo))
    const hMo = medir(join(MOTOR, modo, pieza.id, `f${String(fila.k).padStart(3, '0')}.png`))
    if (!hAE || !hMo || hAE.vacia || hMo.vacia || hAE.sinAlfa || hMo.sinAlfa) {
      problemas.push(`${modo}/${pieza.id} f${fila.k}: falta o esta vacio uno de los dos cuadros`); rojo = true
      continue
    }
    if (hAE.tocaBorde || hMo.tocaBorde) continue

    const valorAE = caso.valores.get(fila.k)
    if (pieza.magnitud === 'escala') {
      const aeAncho = mundo.lado * valorAE[0] / 100, aeAlto = mundo.lado * valorAE[1] / 100
      eC.push(Math.max(Math.abs(mundo.lado * fila.ex / 100 - aeAncho),
                       Math.abs(mundo.lado * fila.ey / 100 - aeAlto)))
      eR.push(Math.max(Math.abs(hMo.anchoHuella - mundo.lado * fila.ex / 100),
                       Math.abs(hMo.altoHuella - mundo.lado * fila.ey / 100)))
      eT.push(Math.max(Math.abs(hMo.anchoHuella - hAE.anchoHuella),
                       Math.abs(hMo.altoHuella - hAE.altoHuella)))
      detalle.push({ modo, id: pieza.id, k: fila.k, ae: hAE.anchoHuella, motor: hMo.anchoHuella })
    } else {
      const enY = pieza.eje === 'y'
      const comp = Math.min(enY ? 1 : 0, valorAE.length - 1)
      const creeMotor = enY ? fila.y : fila.x
      eC.push(Math.abs(creeMotor - valorAE[comp]))
      eR.push(Math.abs((enY ? hMo.y : hMo.x) - creeMotor))
      eT.push(Math.abs((enY ? hMo.y : hMo.x) - (enY ? hAE.y : hAE.x)))
      detalle.push({ modo, id: pieza.id, k: fila.k, ae: enY ? hAE.y : hAE.x, motor: enY ? hMo.y : hMo.x })
    }
  }

  const max = (a) => a.length ? Math.max(...a) : NaN
  const UMBRAL = 1.0
  const pasa = max(eT) < UMBRAL
  if (!pasa) { rojo = true; problemas.push(`${modo}/${pieza.id}: los dos renders difieren ${max(eT).toFixed(3)} px`) }
  resumen.set(`${modo}/${pieza.id}`, { modo, id: pieza.id, eC: max(eC), eR: max(eR), eT: max(eT) })
  console.log(`${pieza.id.padEnd(7)}${(max(eC).toFixed(4) + ' px').padEnd(14)}${(max(eR).toFixed(4) + ' px').padEnd(14)}` +
    `${(max(eT).toFixed(4) + ' px').padEnd(14)}${pieza.desc.slice(0, 30)}`)
}
}

// LA COMPARACION QUE RESPONDE DE DONDE VIENE EL RESIDUO.
// Si el modo 'propio' baja mucho respecto de 'custom', el error no era de la conversion —que ya esta
// medida contra AE en 0,016 px— sino del muestreo interno de CustomEase. Y entonces la recomendacion
// para produccion cambia: la cadena de CustomEase es comoda, pero resolver el bezier es mas fiel.
if (MODOS.length > 1) {
  console.log('\nDE DONDE VIENE EL ERROR: los dos modos, lado a lado (AE contra motor, en px)')
  console.log(`${'pieza'.padEnd(8)}${MODOS.map(m => m.padStart(12)).join('')}   mejora`)
  console.log('-'.repeat(50))
  for (const pieza of doc.piezas) {
    if (pieza.rechazado) continue
    const vs = MODOS.map(m => resumen.get(`${m}/${pieza.id}`)?.eT)
    if (vs.some(v => v === undefined)) continue
    const mejora = vs[0] / Math.max(vs[1], 1e-9)
    console.log(`${pieza.id.padEnd(8)}${vs.map(v => v.toFixed(4).padStart(12)).join('')}   ${mejora.toFixed(1)}x`)
  }
}

console.log('\npeor cuadro de cada pieza (AE contra motor, sobre pixeles):')
const porPieza = new Map()
for (const d of detalle) {
  const dif = Math.abs(d.ae - d.motor)
  const clave = `${d.modo}/${d.id}`
  const p = porPieza.get(clave)
  if (!p || dif > Math.abs(p.ae - p.motor)) porPieza.set(clave, d)
}
for (const [clave, d] of porPieza) {
  console.log(`  ${clave.padEnd(15)} f${String(d.k).padStart(2)}  AE pinto ${d.ae.toFixed(3)}  motor pinto ${d.motor.toFixed(3)}  ` +
    `diferencia ${Math.abs(d.ae - d.motor).toFixed(4)} px`)
}

console.log('\n' + '='.repeat(76))
if (problemas.length) {
  console.log(`NO ES VERDE — ${problemas.length} problema(s):`)
  for (const p of problemas.slice(0, 12)) console.log(`  · ${p}`)
  if (problemas.length > 12) console.log(`  ... y ${problemas.length - 12} mas`)
}
console.log(rojo
  ? '\nTERCERA COLUMNA NO PASA.'
  : '\nTERCERA COLUMNA OK — el motor web dibuja lo mismo que After Effects, cuadro por cuadro.')
process.exit(rojo ? 1 : 0)
