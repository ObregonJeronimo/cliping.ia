// aemotion 0.1 · LIQUID — la membrana vectorial de metaballs (algoritmo clasico de Hiroyuki Sato /
// Paper.js): dos circulos se conectan con un puente de dos bezier cuyos handles salen de radios y
// distancia. Resolucion-independiente y byte-identico entre browser y napi (cero blur, cero pixeles).
// Dibujando membrana + los dos circulos con el mismo fill -> gota que se funde/separa ("gooey").
// Todo funcion pura de las posiciones: animar los centros con keys/springs da liquid motion determinista.
import { clamp } from './util.js'

const HALF_PI = Math.PI / 2
const vec = (a, r) => ({ x: Math.cos(a) * r, y: Math.sin(a) * r })

// membrana entre (x1,y1,r1) y (x2,y2,r2). null si estan muy lejos (maxDist) o uno contiene al otro.
//  v      = cuanto "abraza" la membrana (0.2 tensa .. 0.8 gorda)
//  handle = largo de los handles del puente (2..3 tipico)
export function metaballPath(x1, y1, r1, x2, y2, r2, opts = {}) {
  const v = clamp(opts.v == null ? 0.5 : opts.v, 0.05, 0.95)
  const handle = opts.handle == null ? 2.4 : opts.handle
  const d = Math.hypot(x2 - x1, y2 - y1)
  const maxDist = opts.maxDist == null ? (r1 + r2) * 2.5 : opts.maxDist
  if (r1 <= 0 || r2 <= 0 || d <= 1e-9) return null
  if (d > maxDist || d <= Math.abs(r1 - r2)) return null

  // angulos de anclaje: si se solapan, arrancan del punto de interseccion (ley de cosenos)
  let u1 = 0, u2 = 0
  if (d < r1 + r2) {
    u1 = Math.acos(clamp((r1 * r1 + d * d - r2 * r2) / (2 * r1 * d), -1, 1))
    u2 = Math.acos(clamp((r2 * r2 + d * d - r1 * r1) / (2 * r2 * d), -1, 1))
  }
  const ang = Math.atan2(y2 - y1, x2 - x1)
  const maxSpread = Math.acos(clamp((r1 - r2) / d, -1, 1))

  const a1 = ang + u1 + (maxSpread - u1) * v
  const a2 = ang - u1 - (maxSpread - u1) * v
  const a3 = ang + Math.PI - u2 - (Math.PI - u2 - maxSpread) * v
  const a4 = ang - Math.PI + u2 + (Math.PI - u2 - maxSpread) * v

  const p1 = { x: x1 + Math.cos(a1) * r1, y: y1 + Math.sin(a1) * r1 }
  const p2 = { x: x1 + Math.cos(a2) * r1, y: y1 + Math.sin(a2) * r1 }
  const p3 = { x: x2 + Math.cos(a3) * r2, y: y2 + Math.sin(a3) * r2 }
  const p4 = { x: x2 + Math.cos(a4) * r2, y: y2 + Math.sin(a4) * r2 }

  // largo de handles: escala con el hueco entre anclas y se achica cuando los circulos se meten uno en otro
  const totalR = r1 + r2
  const d2 = Math.min(v * handle, Math.hypot(p3.x - p1.x, p3.y - p1.y) / totalR) * Math.min(1, (d * 2) / totalR)
  const hr1 = r1 * d2, hr2 = r2 * d2

  const h1 = vec(a1 - HALF_PI, hr1), h3 = vec(a3 + HALF_PI, hr2)
  const h4 = vec(a4 - HALF_PI, hr2), h2 = vec(a2 + HALF_PI, hr1)

  return [
    { c: 'M', x: p1.x, y: p1.y },
    { c: 'C', x1: p1.x + h1.x, y1: p1.y + h1.y, x2: p3.x + h3.x, y2: p3.y + h3.y, x: p3.x, y: p3.y },
    { c: 'L', x: p4.x, y: p4.y },
    { c: 'C', x1: p4.x + h4.x, y1: p4.y + h4.y, x2: p2.x + h2.x, y2: p2.y + h2.y, x: p2.x, y: p2.y },
    { c: 'Z' },
  ]
}
