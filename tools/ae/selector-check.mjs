// LA CUENTA DEL SELECTOR CONTRA AE, caso por caso, sin renderizar nada.
//
// POR QUE EXISTE. `tools/ae/selector.mjs` reimplementa en JavaScript la funcion del selector de rango
// de After Effects. Toda reimplementacion de una cuenta ajena diverge en silencio: este repo ya lo pago
// con la proyeccion de la camara, donde la metrica medía una pieza que el reproductor dibujaba
// distinto. La unica defensa es COMPARAR contra la fuente, y aca la fuente son las mediciones que las
// sondas sacaron de AE.
//
// QUE COMPARA. Cada linea de C:/ae-probe/animador{2,3,4,5}.txt es una configuracion del selector y los
// factores que AE le dio a cada caracter. Esta compuerta reconstruye la misma configuracion, corre
// `factorDe` y exige que coincidan dentro de la tolerancia.
//
// LA TOLERANCIA. 1e-4, la misma para todo. La medicion tiene resolucion ~1e-5 (el ancho lo devuelve
// AE con dos decimales sobre un peso de 100 px), asi que 1e-4 son diez veces la resolucion: no tapa un
// error de formula y no exige mas precision de la que el dato tiene.
//
// SI FALTAN LAS MEDICIONES, NO PASA EN VERDE: sale con codigo 2 y dice que sonda hay que correr. Una
// compuerta que se saltea sola cuando no encuentra sus datos es peor que no tenerla.
//
// USO
//   node tools/ae/selector-check.mjs
//   node tools/ae/selector-check.mjs --inyectar   CONTROL NEGATIVO: rompe la formula a proposito

import { existsSync, readFileSync } from 'node:fs'
import { factorDe, UNIDADES, FORMA } from './selector.mjs'

const INYECTAR = process.argv.includes('--inyectar')
// UNA SOLA TOLERANCIA, 1e-4. La primera version tenia dos —una floja para las dos formas que yo
// resolvia por tabla— y esa distincion desaparecio: las seis formas tienen formula cerrada, asi que ya
// no hay excusa para una tolerancia floja. Bajar la tolerancia es lo que prueba que el modelo mejoro.
const TOL = 1e-4

const F = {
  a2: 'C:/ae-probe/animador2.txt',
  a3: 'C:/ae-probe/animador3.txt',
  a4: 'C:/ae-probe/animador4.txt',
  a5: 'C:/ae-probe/animador5.txt',
}
for (const [k, ruta] of Object.entries(F)) {
  if (!existsSync(ruta)) {
    console.error(`falta ${ruta} — corre: node tools/ae/llamar.mjs tools/ae/sondas/animador${k[1]}.jsx`)
    process.exit(2)
  }
}
const leer = (r) => readFileSync(r, 'utf8').trim().split(/\r?\n/)
const nums = (l) => l.split('|').pop().split(';').filter(s => s !== '').map(Number)

// ---------------------------------------------------------------- los casos, sacados de las sondas
const casos = []

// animador2: N=10
for (const l of leer(F.a2)) {
  let m
  if ((m = l.match(/^FACTOR_FORMA\|(\d)\|/))) {
    casos.push({ n: 10, ae: nums(l), exacto: true,
      sel: { unidades: UNIDADES.porcentaje, forma: +m[1], inicio: 0, fin: 100 },
      que: `forma ${m[1]}, rango entero` })
  } else if ((m = l.match(/^RANGO_(CUADRADA|RAMPA)\|(\d+)-(\d+)\|/))) {
    casos.push({ n: 10, ae: nums(l), exacto: true,
      sel: { unidades: UNIDADES.porcentaje, forma: m[1] === 'CUADRADA' ? 1 : 2,
             inicio: +m[2], fin: +m[3] },
      que: `${m[1].toLowerCase()} rango ${m[2]}-${m[3]}` })
  } else if ((m = l.match(/^DESPLAZ\|rampa 0-50 off=(-?\d+)\|/))) {
    casos.push({ n: 10, ae: nums(l), exacto: true,
      sel: { unidades: UNIDADES.porcentaje, forma: 2, inicio: 0, fin: 50, desplazamiento: +m[1] },
      que: `rampa 0-50 desplazada ${m[1]}` })
  } else if ((m = l.match(/^EASE\|alto=(-?\d+)\|bajo=(-?\d+)\|/))) {
    casos.push({ n: 10, ae: nums(l), exacto: true,
      sel: { unidades: UNIDADES.porcentaje, forma: 2, inicio: 0, fin: 100,
             easeAlto: +m[1], easeBajo: +m[2] },
      que: `ease alto=${m[1]} bajo=${m[2]}` })
  }
}

// animador3: N=40, las formas densas y el barrido de ease
for (const l of leer(F.a3)) {
  let m
  if ((m = l.match(/^FORMA(\d)\|/))) {
    casos.push({ n: 40, ae: nums(l), exacto: true,
      sel: { unidades: UNIDADES.porcentaje, forma: +m[1], inicio: 0, fin: 100 },
      que: `forma ${m[1]} con 40 muestras` })
  } else if ((m = l.match(/^EASE_(ALTO|BAJO)\|(-?\d+)\|/))) {
    casos.push({ n: 40, ae: nums(l), exacto: true,
      sel: { unidades: UNIDADES.porcentaje, forma: 2, inicio: 0, fin: 100,
             easeAlto: m[1] === 'ALTO' ? +m[2] : 0, easeBajo: m[1] === 'BAJO' ? +m[2] : 0 },
      que: `ease ${m[1].toLowerCase()}=${m[2]} con 40 muestras` })
  }
}

// animador4: N=20, el comportamiento FUERA del rango, que es la parte contraintuitiva
for (const l of leer(F.a4)) {
  let m
  if ((m = l.match(/^AFUERA\|(\d)\|/))) {
    casos.push({ n: 20, ae: nums(l), exacto: true,
      sel: { unidades: UNIDADES.porcentaje, forma: +m[1], inicio: 40, fin: 60 },
      que: `forma ${m[1]} con rango 40-60 (fuera del rango a los dos lados)` })
  } else if ((m = l.match(/^FINAL\|(\d)\|/))) {
    casos.push({ n: 20, ae: nums(l), exacto: true,
      sel: { unidades: UNIDADES.porcentaje, forma: +m[1], inicio: 60, fin: 100 },
      que: `forma ${m[1]} con rango 60-100` })
  }
}

// animador5: N=8, el TECLEO — la cuadrada con rangos fraccionarios y la suavidad. Es el caso de uso
// principal y el unico que distingue cobertura de celda de muestreo del centro.
for (const l of leer(F.a5)) {
  const m = l.match(/^TECLEO\|suavidad=(\d+)\|fin=([\d.]+)\|/)
  if (!m) continue
  casos.push({ n: 8, ae: nums(l), exacto: true,
    sel: { unidades: UNIDADES.porcentaje, forma: FORMA.cuadrada, inicio: 0, fin: +m[2], suavidad: +m[1] },
    que: `TECLEO cuadrada 0-${m[2]} con suavidad ${m[1]}` })
}

// ---------------------------------------------------------------- el control negativo
// Se rompe la parte MENOS obvia de la formula: que la rampa sostiene 1 pasando el final. Si la
// compuerta no se pone roja con eso, no esta midiendo lo que dice medir.
let romper = false
if (INYECTAR) {
  romper = true
  console.log('CONTROL NEGATIVO — se fuerza el factor a 0 fuera del rango, para TODAS las formas.')
  console.log('La compuerta TIENE que ponerse roja en los casos de rampa con rango parcial.\n')
}
function calcular(sel, k, n) {
  const f = factorDe(sel, k, n)
  if (!romper) return f
  const p = (k + 0.5) / n
  const ini = ((sel.inicio ?? 0) + (sel.desplazamiento ?? 0)) / 100
  const fin = ((sel.fin ?? 100) + (sel.desplazamiento ?? 0)) / 100
  return (p < ini || p > fin) ? 0 : f
}

// ---------------------------------------------------------------- comparar
const NOM = { 1: 'cuadrada', 2: 'rampa-arriba', 3: 'rampa-abajo', 4: 'triangulo', 5: 'redonda', 6: 'suave' }
const malos = []
let peorExacto = 0, peorTabla = 0

console.log(`SELECTOR — ${casos.length} configuraciones medidas en AE, contra tools/ae/selector.mjs\n`)
for (const c of casos) {
  let peor = 0, dondeK = -1
  for (let k = 0; k < c.n; k++) {
    const mio = calcular(c.sel, k, c.n)
    const dif = Math.abs(mio - c.ae[k])
    if (dif > peor) { peor = dif; dondeK = k }
  }
  if (c.exacto) peorExacto = Math.max(peorExacto, peor); else peorTabla = Math.max(peorTabla, peor)
  if (peor > TOL) malos.push({ ...c, peor, dondeK, tol: TOL })
}

if (malos.length) {
  console.log('  NO COINCIDEN CON AE')
  for (const m of malos.slice(0, 14)) {
    console.log(`    desvio ${m.peor.toFixed(5)} (tolerancia ${m.tol})  en el caracter ${m.dondeK} de ${m.n}` +
      `\n      ${m.que}`)
  }
  if (malos.length > 14) console.log(`    ... y ${malos.length - 14} mas`)
} else {
  console.log('  todas coinciden')
}
console.log(`\n  peor desvio contra AE: ${Math.max(peorExacto, peorTabla).toExponential(2)}  (tolerancia ${TOL})`)
console.log(`  formas cubiertas: ${Object.values(NOM).join(', ')}`)
console.log('\n  NO CUBIERTO (se rechaza en el exportador): orden aleatorio · selector de expresion')

console.log('')
console.log('='.repeat(72))
if (!malos.length) console.log('SELECTOR OK — la cuenta del motor coincide con la de AE en las ' + casos.length + ' configuraciones')
else console.log(`SELECTOR NO PASA — ${malos.length} de ${casos.length} configuraciones no coinciden con AE`)
process.exit(malos.length ? 1 : 0)
