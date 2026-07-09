// aemotion 0.1 · EASE — curvas temporales en forma cerrada. Dos piezas:
//  1) cubicBezier(x1,y1,x2,y2) estilo CSS — vendorizado de gre/bezier-easing (MIT, Gaetan Renaudeau;
//     mismo algoritmo que Blink/WebKit: LUT + Newton-Raphson + biseccion de respaldo).
//  2) el solver de x compartido (xSolver) que keys.js usa para el speed graph estilo After Effects.
// Todo funcion pura de t: mismo t -> mismo valor (determinismo y seek gratis en browser y Node).

const NEWTON_ITER = 4, NEWTON_MIN_SLOPE = 0.001, SUBDIV_PREC = 1e-7, SUBDIV_ITER = 10
const SAMPLES = 11, STEP = 1 / (SAMPLES - 1)

const A = (a1, a2) => 1 - 3 * a2 + 3 * a1
const B = (a1, a2) => 3 * a2 - 6 * a1
const C = a1 => 3 * a1
const calc = (u, a1, a2) => ((A(a1, a2) * u + B(a1, a2)) * u + C(a1)) * u
const slope = (u, a1, a2) => 3 * A(a1, a2) * u * u + 2 * B(a1, a2) * u + C(a1)

// dado el eje "x" de un bezier temporal con controles x1,x2 en [0,1] (monotono garantizado),
// devuelve u(x): el parametro del bezier para un progreso x dado. Es el nucleo de todo el modulo.
export function xSolver(x1, x2) {
  const table = new Float64Array(SAMPLES)
  for (let i = 0; i < SAMPLES; i++) table[i] = calc(i * STEP, x1, x2)
  return function tForX(x) {
    if (x <= 0) return 0
    if (x >= 1) return 1
    let start = 0, i = 1
    for (; i !== SAMPLES - 1 && table[i] <= x; i++) start += STEP
    i--
    const span = table[i + 1] - table[i]
    let u = start + (span > 0 ? (x - table[i]) / span : 0) * STEP
    const s0 = slope(u, x1, x2)
    if (s0 >= NEWTON_MIN_SLOPE) {
      for (let k = 0; k < NEWTON_ITER; k++) {
        const s = slope(u, x1, x2)
        if (s === 0) return u
        u -= (calc(u, x1, x2) - x) / s
      }
      return u
    }
    if (s0 === 0) return u
    let a = start, b = start + STEP                       // biseccion de respaldo (pendiente ~0)
    for (let k = 0; k < SUBDIV_ITER; k++) {
      u = a + (b - a) / 2
      const cx = calc(u, x1, x2) - x
      if (Math.abs(cx) < SUBDIV_PREC) break
      if (cx > 0) b = u; else a = u
    }
    return u
  }
}

// bezier cubico 1D sobre valores arbitrarios (v0 -> v3 con controles c1, c2): el eje "valor" del speed graph
export const cubicVal = (u, v0, c1, c2, v3) => {
  const w = 1 - u
  return w * w * w * v0 + 3 * w * w * u * c1 + 3 * w * u * u * c2 + u * u * u * v3
}

// cubic-bezier(x1,y1,x2,y2) -> f(x) normalizado [0,1]->[0,1], identico a CSS
export function cubicBezier(x1, y1, x2, y2) {
  if (!(x1 >= 0 && x1 <= 1 && x2 >= 0 && x2 <= 1)) throw new Error('cubicBezier: x fuera de [0,1]')
  if (x1 === y1 && x2 === y2) return t => t
  const tForX = xSolver(x1, x2)
  return x => (x <= 0 ? 0 : x >= 1 ? 1 : calc(tForX(x), y1, y2))
}

// --- presets AE (para keys.js): Easy Ease exacto = speed 0 + influence 33.33% ---
export const EASY = { speed: 0, influence: 33.33 }
export const EASY_STRONG = { speed: 0, influence: 66 }   // frenada/arranque mas dramatico (graph editor tipico)
