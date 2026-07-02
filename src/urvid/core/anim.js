// urvid · ANIM — primitivas de animacion compartidas (extraidas de AnimLab, fuente unica). PURAS/deterministas.
// Las usan el motor (overlay.js dibuja objetos animados sobre el video) y el editor (presets + grabar arrastrando).

// easings: mapean [0,1] -> [0,1]. 'suave' = ease-in-out cubico; 'arranque' = ease-out; 'lineal'.
export const EASE = {
  suave: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  arranque: (t) => 1 - Math.pow(1 - t, 3),
  lineal: (t) => t,
}

// sample(points, curved, segs) — suaviza una lista de puntos con Catmull-Rom (curved, >=3 puntos) o la devuelve recta.
export function sample(points, curved, segs = 22) {
  if (!curved || !points || points.length < 3) return points ? points.slice() : []
  const out = [], P = [points[0], ...points, points[points.length - 1]]
  for (let i = 1; i < P.length - 2; i++) {
    const p0 = P[i - 1], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2]
    for (let j = 0; j < segs; j++) {
      const t = j / segs, t2 = t * t, t3 = t2 * t
      out.push({
        x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      })
    }
  }
  out.push(points[points.length - 1])
  return out
}

// posAt(sampledPath, t) — posicion {x,y} en el path (t normalizado [0,1], interpolado por longitud de arco). null si vacio.
export function posAt(s, t) {
  if (!s || !s.length) return null
  if (s.length === 1) return s[0]
  const seg = []; let total = 0
  for (let i = 1; i < s.length; i++) { const l = Math.hypot(s[i].x - s[i - 1].x, s[i].y - s[i - 1].y); seg.push(l); total += l }
  let d = t * total, i = 0
  while (i < seg.length && d > seg[i]) { d -= seg[i]; i++ }
  if (i >= seg.length) return s[s.length - 1]
  const f = seg[i] > 0 ? d / seg[i] : 0
  return { x: s[i].x + (s[i + 1].x - s[i].x) * f, y: s[i].y + (s[i + 1].y - s[i].y) * f }
}

// decimate(kfs, epsilonPx) — Ramer-Douglas-Peucker: reduce un gesto grabado (~muchos puntos {t,x,y}) a pocos keyframes
// conservando la forma (y el campo `t`). Para "grabar animacion arrastrando" (Fase 3). PURO.
export function decimate(kfs, epsilonPx = 3) {
  if (!kfs || kfs.length <= 2) return kfs ? kfs.slice() : []
  const keep = new Array(kfs.length).fill(false)
  keep[0] = keep[kfs.length - 1] = true
  const stack = [[0, kfs.length - 1]]
  while (stack.length) {
    const [a, b] = stack.pop()
    const A = kfs[a], B = kfs[b], dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy) || 1
    let maxD = 0, idx = -1
    for (let i = a + 1; i < b; i++) {
      const P = kfs[i], dist = Math.abs((P.x - A.x) * dy - (P.y - A.y) * dx) / len
      if (dist > maxD) { maxD = dist; idx = i }
    }
    if (maxD > epsilonPx && idx > 0) { keep[idx] = true; stack.push([a, idx], [idx, b]) }
  }
  return kfs.filter((_, i) => keep[i])
}
