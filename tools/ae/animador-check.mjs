// EL ANIMADOR DE TEXTO: AFTER EFFECTS CONTRA EL MOTOR, CUADRO A CUADRO.
//
// POR QUE EXISTE, Y POR QUE NO ALCANZA CON `selector-check`. Esa compuerta verifica LA CUENTA DEL
// FACTOR —88 configuraciones medidas en AE, desvio 4,9e-5— y con eso queda probado que el motor le
// asigna a cada caracter el mismo numero que AE. Pero un factor correcto aplicado a una DISPOSICION
// distinta da un cuadro distinto: el motor coloca las letras con las metricas de fuente de Chromium y
// AE con las suyas. Verificar el factor y creer que el texto coincide es exactamente el error de
// escribir la prueba para la parte que uno implemento.
//
// QUE COMPARA. La caja de tinta de cada capa con animador, en los mismos cuadros, de los dos lados:
//   · AE      `sourceRectAtTime(t, false)` — via `sondas/cajas-animadas.jsx`
//   · el motor `window.__cajasAnimadas(t)` — via `capturar-comp.py --cajas-animadas`
// Las dos son la union de la tinta VISIBLE en coordenadas de capa, asi que son comparables.
//
// LOS DOS MOTORES DE TEXTO NO VAN A COINCIDIR, Y ESO NO ES EL DEFECTO. Chromium y AE miden distinto la
// misma fuente; lo que importa es CUANTO, y que no se mueva. Por eso el veredicto se da en PORCENTAJE
// del tamano de la caja y no en pixeles: un desvio del 2% sobre un titular de 900 px son 18 px y no se
// ve, y el mismo 2% sobre una etiqueta de 90 px son 1,8 px. El umbral se fija en 4%, que es el doble
// de lo que `comp-check` ya acepta para texto quieto — porque aca se suma el error de disposicion por
// caracter, que el texto quieto no tiene.
//
// Y UNA COSA QUE `sourceRectAtTime` NO MIDE: LA OPACIDAD. Lo refuto esta misma compuerta en su primera
// corrida — con el tecleo entero al 0%, AE informa 769,1 px de ancho en todos los cuadros, constante.
// O sea que la caja NO dice que letras se ven, dice donde esta la tinta. Un tecleo hecho con opacidad
// es invisible para esta comparacion, y hay que decirlo en vez de creer que esta verificado: lo que se
// verifica aca es la DISPOSICION (posicion, escala, interletra), no que letra esta encendida.
//
// USO
//   printf 'SONDA-ANIM6' > C:/ae-probe/exportar-comp.txt
//   printf '0,6,12,...'  > C:/ae-probe/cajas-cuadros.txt
//   node tools/ae/llamar.mjs tools/ae/sondas/cajas-animadas.jsx
//   python tools/ae/motor/capturar-comp.py --doc <doc> --salida <dir> --cajas-animadas 0,6,12,...
//   node tools/ae/animador-check.mjs
//
//   --inyectar   CONTROL NEGATIVO: corre la disposicion del motor un 6% y comprueba que se pone roja

import { existsSync, readFileSync } from 'node:fs'

const AE = 'C:/ae-probe/cajas-animadas.txt'
const MOTOR = 'C:/ae-probe/render/cajas-animadas.json'
const DOC = process.argv.find(a => a.endsWith('.json') && !a.startsWith('--')) || 'C:/ae-probe/anim6.json'
const INYECTAR = process.argv.includes('--inyectar')
const TOL_PCT = 4.0          // por ciento del tamano de la caja
const TOL_MIN = 2.0          // px: por debajo de esto no se exige nada, es ruido de subpixel

for (const [q, r] of [['la sonda de AE', AE], ['el volcado del motor', MOTOR]]) {
  if (!existsSync(r)) {
    console.error(`falta ${r}\n  (${q}) — ver el USO en la cabecera de este archivo`)
    process.exit(2)
  }
}

// ---------------------------------------------------------------- lo que midio AE
const lineas = readFileSync(AE, 'utf8').trim().split(/\r?\n/)
const nombres = new Map()
const deAE = new Map()          // `${capa}|${cuadro}` -> {x,y,ancho,alto}
let comp = '?'
for (const l of lineas) {
  const f = l.split('|')
  if (f[0] === 'COMP') comp = f[1]
  else if (f[0] === 'CAPA') nombres.set(+f[1], f[2])
  else if (f[0] === 'CAJA') {
    deAE.set(`${f[1]}|${f[2]}`, { x: +f[3], y: +f[4], ancho: +f[5], alto: +f[6] })
  } else if (f[0] === 'VACIO') {
    console.error('la composicion no tiene ninguna capa de texto con animador — nada que comparar')
    process.exit(2)
  }
}
if (!deAE.size) { console.error(`${AE} no trae ninguna caja`); process.exit(2) }

// ---------------------------------------------------------------- lo que dibujo el motor
const delMotor = JSON.parse(readFileSync(MOTOR, 'utf8'))

// ---------------------------------------------------------------- las capas que NO se pueden comparar
//
// UNA CAPA CON UN RECHAZO DECLARADO NO ES COMPARABLE, y creer que si lo es da un rojo falso que enseña
// a ignorar la compuerta. Medido: la capa de prueba llevaba un `ADBE Text Blur` de 12 px que el
// exportador rechaza — AE mete el desenfoque en su `sourceRectAtTime` y el motor no lo dibuja, asi que
// la caja salia 23,2 px mas ancha y la compuerta informaba un 7,39% de desvio constante. Sacando el
// desenfoque, la misma capa da 289,38 contra 290,2: 0,28%, igual que las demas.
//
// Se saltean CON NOMBRE Y MOTIVO. Saltearlas en silencio seria la otra mitad del mismo error.
const doc = existsSync(DOC) ? JSON.parse(readFileSync(DOC, 'utf8')) : null
const conRechazo = new Map()
for (const r of (doc?.noSoportado || [])) {
  if (!conRechazo.has(r.capa)) conRechazo.set(r.capa, [])
  conRechazo.get(r.capa).push(`${r.que}${r.detalle && r.detalle !== '-' ? ` (${r.detalle})` : ''}`)
}

// ---------------------------------------------------------------- el control negativo
// Se corre la disposicion un 6%: es la clase de error que da una metrica de fuente equivocada, y es lo
// que esta compuerta existe para cazar. Si con esto sigue verde, no esta midiendo lo que dice.
const torcer = (v) => INYECTAR ? v * 1.06 : v
if (INYECTAR) console.log('CONTROL NEGATIVO — la caja del motor se ensancha un 6%. Tiene que ponerse roja.\n')

// ---------------------------------------------------------------- comparar
const filas = []
let peorPct = 0, malCuenta = 0, comparados = 0
for (const [clave, ae] of deAE) {
  const [capa, cuadro] = clave.split('|')
  const mm = delMotor[cuadro]
  if (!mm || !mm[capa]) continue
  if (conRechazo.has(capa)) continue
  const mi = mm[capa]
  comparados++

  // la cantidad de caracteres visibles: esto NO es tolerancia de metricas, es la cuenta
  const aeVacia = ae.ancho < 0.5, miVacia = mi.caracteres === 0
  if (aeVacia !== miVacia) {
    malCuenta++
    filas.push({ capa, cuadro, tipo: 'presencia',
      detalle: `AE ${aeVacia ? 'no ve tinta' : 've tinta'} y el motor ${miVacia ? 'no dibuja nada' : `dibuja ${mi.caracteres} caracteres`}` })
    continue
  }
  if (aeVacia && miVacia) continue

  const dW = Math.abs(torcer(mi.ancho) - ae.ancho)
  const dH = Math.abs(mi.alto - ae.alto)
  const pctW = ae.ancho > TOL_MIN ? dW / ae.ancho * 100 : 0
  const pctH = ae.alto > TOL_MIN ? dH / ae.alto * 100 : 0
  const pct = Math.max(pctW, pctH)
  if (pct > peorPct) peorPct = pct
  if (pct > TOL_PCT && (dW > TOL_MIN || dH > TOL_MIN)) {
    filas.push({ capa, cuadro, tipo: 'tamano', pct,
      detalle: `ancho AE ${ae.ancho.toFixed(1)} contra motor ${mi.ancho.toFixed(1)} · ` +
               `alto AE ${ae.alto.toFixed(1)} contra motor ${mi.alto.toFixed(1)}` })
  }
}

console.log(`ANIMADOR — "${comp}" · ${comparados} comparaciones (capa x cuadro)`)
console.log(`  capas con animador: ${[...nombres].map(([i, n]) => `${n} (${i})`).join(', ')}`)
if (conRechazo.size) {
  console.log('\n  NO COMPARABLES — el documento declaró que algo de estas capas no viaja, así que las dos')
  console.log('  cajas miden cosas distintas. Se saltean CON NOMBRE: saltearlas en silencio dejaría una')
  console.log('  compuerta que dice 45 comparaciones donde había 60 y no explica las 15 que faltan.')
  for (const [c, motivos] of conRechazo) {
    console.log(`    capa ${c} "${nombres.get(+c) || '?'}" — ${motivos.join(' · ')}`)
  }
}
console.log('')

const presencia = filas.filter(f => f.tipo === 'presencia')
const tamano = filas.filter(f => f.tipo === 'tamano')

console.log('  CARACTERES VISIBLES (esto es la CUENTA, no las metricas: no tiene tolerancia)')
if (!presencia.length) console.log('    coinciden en todos los cuadros')
for (const f of presencia.slice(0, 10)) {
  console.log(`    capa ${f.capa} "${nombres.get(+f.capa) || '?'}" cuadro ${f.cuadro}: ${f.detalle}`)
}
if (presencia.length > 10) console.log(`    ... y ${presencia.length - 10} mas`)

console.log(`\n  TAMANO DE LA CAJA (dos motores de texto distintos; el umbral es ${TOL_PCT}%)`)
if (!tamano.length) console.log(`    todos dentro del umbral · peor desvio ${peorPct.toFixed(2)}%`)
for (const f of tamano.sort((a, b) => b.pct - a.pct).slice(0, 10)) {
  console.log(`    ${f.pct.toFixed(2)}%  capa ${f.capa} "${nombres.get(+f.capa) || '?'}" cuadro ${f.cuadro}` +
    `\n      ${f.detalle}`)
}
if (tamano.length > 10) console.log(`    ... y ${tamano.length - 10} mas`)

console.log('\n  NO CUBIERTO: el COLOR y la ROTACION no cambian la caja de tinta lo suficiente para que')
console.log('  esta compuerta los distinga. La cuenta del factor la cubre `selector-check.mjs`.')

console.log('')
console.log('='.repeat(72))
const mal = presencia.length + tamano.length
if (!mal) console.log(`ANIMADOR OK — el motor y AE coinciden en ${comparados} comparaciones (peor ${peorPct.toFixed(2)}%)`)
else console.log(`ANIMADOR NO PASA — ${presencia.length} de presencia · ${tamano.length} de tamano`)
process.exit(mal ? 1 : 0)
