// CURVAS DE AFTER EFFECTS -> CUBIC-BEZIER, y la verificacion de que la conversion es fiel.
//
// POR QUE ESTO ES LA PIEZA CENTRAL DEL PROYECTO.
//
// El plan es autorar animacion en AE y reproducirla en un motor web SIN AE. De todo lo que hay adentro
// de una composicion, lo unico que de verdad viaja es el MOVIMIENTO: los keyframes con sus curvas. Si
// esa conversion no es exacta, no viaja nada — la animacion portada se ve parecida y se SIENTE
// distinta, que es la peor forma de fallar porque no se puede señalar.
//
// LA CUENTA, que es lo que hace que esto funcione.
//
// AE no guarda cubic-bezier: guarda VELOCIDAD e INFLUENCIA por cada lado del keyframe. Eso asusta al
// principio y despues resulta que son el MISMO bezier en otras coordenadas.
//
//   · influencia (0.1 a 100) es que porcentaje del intervalo de TIEMPO ocupa la manija. O sea la X.
//   · velocidad esta en unidades por segundo. Multiplicada por el intervalo de tiempo y dividida por
//     el cambio de valor, queda normalizada: cuanto sube la manija por unidad de tiempo. O sea la
//     PENDIENTE. Y con X y pendiente sale la Y.
//
// Para un tramo de t1 a t2 con valores v1 a v2, normalizado al cuadrado [0,1]x[0,1]:
//
//     dt = t2 - t1        dv = v2 - v1
//     x1 = i1 / 100                       y1 = (s1 * dt / dv) * x1
//     x2 = 1 - i2 / 100                   y2 = 1 - (s2 * dt / dv) * (i2 / 100)
//
// donde (s1, i1) es el ease de SALIDA del primer keyframe y (s2, i2) el de ENTRADA del segundo.
//
// LA PRUEBA DE QUE ESTA BIEN: el "Easy Ease" de AE es influencia 33.33 y velocidad 0 de los dos lados.
// Metido en la cuenta da cubic-bezier(0.3333, 0, 0.6667, 1), que es la equivalencia canonica conocida
// y publicada. Si esta funcion no devuelve eso, esta mal.
//
// DONDE DEJA DE SER EXACTA, y hay que decirlo porque son casos reales:
//   1. POSICION CON TRAYECTORIA CURVA. Cuando la posicion tiene tangentes espaciales, el ease no
//      gobierna cada eje por separado: gobierna el avance por LARGO DE ARCO sobre la curva. Convertir
//      eje por eje da otra cosa. Para trayectorias rectas no hay problema.
//   2. EXPRESIONES. No son datos, son un programa. No se convierten: se hornean o se reescriben.
//   3. dv = 0. Si el valor no cambia, la normalizacion se indefine. Se devuelve lineal, que es lo
//      unico honesto: no hay curva que describir si no hay recorrido.
//
// USO
//   node tools/ae/curvas.mjs            -> corre la verificacion contra GSAP y muestra la tabla
//   import { aeACubicBezier, evaluar } from './curvas.mjs'

// ---------------------------------------------------------------- la conversion
export function aeACubicBezier(salida, entrada, dt, dv) {
  // `salida` = { velocidad, influencia } del keyframe de la IZQUIERDA (su ease de salida)
  // `entrada` = { velocidad, influencia } del keyframe de la DERECHA (su ease de entrada)
  const i1 = Math.min(100, Math.max(0.1, salida.influencia))
  const i2 = Math.min(100, Math.max(0.1, entrada.influencia))
  const x1 = i1 / 100
  const x2 = 1 - i2 / 100

  // SIN RECORRIDO NO HAY CURVA. Con dv = 0 la pendiente normalizada se indefine (division por cero) y
  // cualquier cosa que devolvieramos seria inventada. Lineal es la respuesta honesta.
  if (!dv || !dt) return { x1, y1: 0, x2, y2: 1, degenerada: true }

  const k = dt / dv
  const y1 = salida.velocidad * k * x1
  const y2 = 1 - entrada.velocidad * k * (i2 / 100)
  return { x1, y1, x2, y2, degenerada: false }
}

// Presets de AE, para tenerlos escritos y no adivinarlos
export const EASY_EASE = { velocidad: 0, influencia: 33.33 }
export const LINEAL = { velocidad: null, influencia: 0.1 }   // lineal es tipo de interpolacion, no ease

// ---------------------------------------------------------------- evaluar un cubic-bezier
// Un cubic-bezier de CSS no es y=f(x) directo: hay que resolver primero que t da ese x, y recien ahi
// sacar la y. Se hace con Newton y se cae a biseccion si la derivada es chica, que es exactamente lo
// que hacen los navegadores.
const bz = (a, b, t) => {
  const u = 1 - t
  return 3 * u * u * t * a + 3 * u * t * t * b + t * t * t
}
const dbz = (a, b, t) => {
  const u = 1 - t
  return 3 * u * u * a + 6 * u * t * (b - a) + 3 * t * t * (1 - b)
}

export function evaluar({ x1, y1, x2, y2 }, x) {
  if (x <= 0) return 0
  if (x >= 1) return 1
  let t = x
  for (let i = 0; i < 8; i++) {
    const err = bz(x1, x2, t) - x
    if (Math.abs(err) < 1e-7) return bz(y1, y2, t)
    const d = dbz(x1, x2, t)
    if (Math.abs(d) < 1e-6) break
    t -= err / d
  }
  let lo = 0, hi = 1
  t = x
  for (let i = 0; i < 60; i++) {
    const v = bz(x1, x2, t)
    if (Math.abs(v - x) < 1e-7) break
    if (v > x) hi = t; else lo = t
    t = (lo + hi) / 2
  }
  return bz(y1, y2, t)
}

export const aCadenaGSAP = ({ x1, y1, x2, y2 }) =>
  `M0,0 C${x1.toFixed(6)},${y1.toFixed(6)} ${x2.toFixed(6)},${y2.toFixed(6)} 1,1`

// ---------------------------------------------------------------- verificacion
if (process.argv[1]?.endsWith('curvas.mjs')) {
  const { createRequire } = await import('node:module')
  const require = createRequire(import.meta.url)
  const { gsap } = require('gsap/dist/gsap.js')
  const { CustomEase } = require('gsap/dist/CustomEase.js')
  gsap.registerPlugin(CustomEase)

  console.log('CONVERSION DE CURVAS DE AE\n')

  // --- 1. el caso canonico
  const ee = aeACubicBezier(EASY_EASE, EASY_EASE, 1, 100)
  const esperado = [0.3333, 0, 0.6667, 1]
  const dado = [ee.x1, ee.y1, ee.x2, ee.y2]
  const errCanon = Math.max(...dado.map((v, i) => Math.abs(v - esperado[i])))
  console.log('1. Easy Ease (influencia 33.33, velocidad 0) debe dar el bezier canonico')
  console.log(`   esperado  cubic-bezier(${esperado.join(', ')})`)
  console.log(`   obtenido  cubic-bezier(${dado.map(v => v.toFixed(4)).join(', ')})`)
  console.log(`   error maximo ${errCanon.toExponential(2)}  ${errCanon < 1e-3 ? 'OK' : 'FALLA'}\n`)

  // --- 2. mi evaluador contra el de GSAP, sobre varios casos
  // Si los dos coinciden, el motor web puede consumir estas curvas SIN escribir un interpolador:
  // se le pasa la cadena a CustomEase y listo.
  console.log('2. Mi evaluador contra GSAP CustomEase (200 muestras por caso)')
  const CASOS = [
    ['Easy Ease',            EASY_EASE,                        EASY_EASE,                        1, 100],
    ['salida dura',          { velocidad: 0, influencia: 80 },  { velocidad: 0, influencia: 15 },  1, 100],
    ['entrada dura',         { velocidad: 0, influencia: 15 },  { velocidad: 0, influencia: 80 },  1, 100],
    ['con overshoot',        { velocidad: 260, influencia: 40 },{ velocidad: 0, influencia: 60 },  1, 100],
    ['casi lineal',          { velocidad: 100, influencia: 0.1 },{ velocidad: 100, influencia: 0.1 }, 1, 100],
    ['tramo corto y rapido', { velocidad: 0, influencia: 33.33 },{ velocidad: 0, influencia: 33.33 }, 0.2, 540],
  ]
  let peorGlobal = 0
  for (const [nom, sal, ent, dt, dv] of CASOS) {
    const c = aeACubicBezier(sal, ent, dt, dv)
    const g = CustomEase.create('tmp' + nom.replace(/\W/g, ''), aCadenaGSAP(c))
    let peor = 0
    for (let i = 0; i <= 200; i++) {
      const x = i / 200
      peor = Math.max(peor, Math.abs(evaluar(c, x) - g(x)))
    }
    peorGlobal = Math.max(peorGlobal, peor)
    const sobrepasa = c.y1 < -0.001 || c.y2 > 1.001 || c.y1 > 1.001 || c.y2 < -0.001
    console.log(`   ${nom.padEnd(22)} bezier(${[c.x1, c.y1, c.x2, c.y2].map(v => v.toFixed(3)).join(', ')})` +
      `  error ${peor.toExponential(2)}${sobrepasa ? '   (con overshoot)' : ''}`)
  }
  console.log(`   error maximo global ${peorGlobal.toExponential(2)}  ${peorGlobal < 1e-3 ? 'OK' : 'FALLA'}\n`)

  // --- 3. el caso degenerado
  const deg = aeACubicBezier(EASY_EASE, EASY_EASE, 1, 0)
  console.log('3. Sin recorrido (dv = 0) devuelve lineal y lo marca')
  console.log(`   degenerada=${deg.degenerada}  y1=${deg.y1}  y2=${deg.y2}` +
    `  ${deg.degenerada && deg.y1 === 0 && deg.y2 === 1 ? 'OK' : 'FALLA'}\n`)

  const ok = errCanon < 1e-3 && peorGlobal < 1e-3 && deg.degenerada
  console.log(ok
    ? 'CURVAS OK — la conversion da el bezier canonico y GSAP la reproduce. El motor web puede\n' +
      'consumir curvas de AE sin escribir un interpolador propio.'
    : 'CURVAS FALLA')
  process.exit(ok ? 0 : 1)
}
