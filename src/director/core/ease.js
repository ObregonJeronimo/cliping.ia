// director · EASINGS — todas las curvas del motor en FORMA CERRADA (sin integracion numerica, sin
// estado): evaluar en cualquier t da SIEMPRE el mismo valor -> seek gratis y export frame-a-frame
// determinista. La "calidad After Effects" es 80% easing+timing: esta es la mitad de esa ecuacion.
// Contrato del ease STRING (lo que viaja en el timeline.json y lo que edita el usuario en la UI):
//   'lin' | 'eo' | 'ei' | 'eio' | 'co' | 'ci' | 'cio' | 'back:s' | 'spring:z,w' | 'step'
// parseEase(str) -> (t:0..1) => 0..1   ·   easeName(str) -> etiqueta legible para el Inspector

const clamp01 = t => (t < 0 ? 0 : t > 1 ? 1 : t)

// --- curvas base (t en [0,1]) ---
export const lin = t => t
export const expoOut = t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t))
export const expoIn = t => (t <= 0 ? 0 : Math.pow(2, 10 * (t - 1)))
export const expoInOut = t => (t < 0.5 ? expoIn(t * 2) / 2 : 0.5 + expoOut(t * 2 - 1) / 2)
export const cubicOut = t => 1 - Math.pow(1 - t, 3)
export const cubicIn = t => t * t * t
export const cubicInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
export const quintOut = t => 1 - Math.pow(1 - t, 5)
// backOut: se pasa de largo y vuelve. s = fuerza del overshoot (1.70158 = 10% clasico).
export const backOut = (t, s = 1.70158) => { const u = t - 1; return 1 + u * u * ((s + 1) * u + s) }

// SPRING amortiguado en forma cerrada: respuesta al escalon de un sistema masa-resorte subamortiguado.
//   x(t) = 1 - e^(-z*w*t) * ( cos(wd*t) + (z*w/wd) * sin(wd*t) ),  wd = w*sqrt(1-z^2)
// z (zeta) = amortiguacion 0..1 : 0.4 rebota mucho · 0.6 rebote elegante · 0.85 casi sin rebote
// w (omega) = velocidad angular : 9 lento/pesado · 13 medio · 20 rapido/liviano
// En t=1 devuelve exactamente 1 (clamp) -> la capa queda ASENTADA y pixel-estable (regla anti-shimmer).
export function spring(t, z = 0.6, w = 13) {
  if (t <= 0) return 0
  if (t >= 1) return 1
  const zz = z < 0.05 ? 0.05 : z > 0.999 ? 0.999 : z
  const wd = w * Math.sqrt(1 - zz * zz)
  const e = Math.exp(-zz * w * t)
  return 1 - e * (Math.cos(wd * t) + (zz * w / wd) * Math.sin(wd * t))
}

// --- parser del ease string (el formato que persiste el timeline y edita la UI) ---
const CACHE = new Map()
export function parseEase(str) {
  const key = str == null ? 'eo' : String(str)
  const hit = CACHE.get(key)
  if (hit) return hit
  let fn = expoOut
  const [name, argstr] = key.split(':')
  // OJO: ''.split(',') da [''] y Number('') es 0 -> sin el filtro de vacios, 'back' quedaba con s=0
  // (cero overshoot) en silencio. Lo cazo el gate director-test; el filtro es la correccion.
  const args = (argstr || '').split(',').filter(x => x !== '').map(Number).filter(n => Number.isFinite(n))
  switch (name) {
    case 'lin': fn = lin; break
    case 'eo': fn = expoOut; break
    case 'ei': fn = expoIn; break
    case 'eio': fn = expoInOut; break
    case 'co': fn = cubicOut; break
    case 'ci': fn = cubicIn; break
    case 'cio': fn = cubicInOut; break
    case 'qo': fn = quintOut; break
    case 'back': { const s = args[0] != null ? args[0] : 1.70158; fn = t => backOut(t, s); break }
    case 'spring': { const z = args[0] != null ? args[0] : 0.6, w = args[1] != null ? args[1] : 13; fn = t => spring(t, z, w); break }
    case 'step': fn = t => (t >= 1 ? 1 : 0); break
    default: fn = expoOut
  }
  const safe = t => fn(clamp01(t))
  CACHE.set(key, safe)
  return safe
}
// valida SIN construir (para el gate de schema): true si el string es parseable
export function isEase(str) {
  if (str == null) return true                                   // ausente -> default 'eo'
  const [name, argstr] = String(str).split(':')
  const KNOWN = ['lin', 'eo', 'ei', 'eio', 'co', 'ci', 'cio', 'qo', 'back', 'spring', 'step']
  if (KNOWN.indexOf(name) < 0) return false
  if (name === 'spring') { const a = (argstr || '').split(',').map(Number); return a.length === 2 && a.every(n => Number.isFinite(n)) && a[0] > 0 && a[0] < 1 && a[1] > 0 }
  if (name === 'back') { const a = Number(argstr); return argstr == null || Number.isFinite(a) }
  return argstr == null
}
export const easeName = (str) => ({
  lin: 'Lineal', eo: 'Expo out', ei: 'Expo in', eio: 'Expo in-out', co: 'Cubic out', ci: 'Cubic in',
  cio: 'Cubic in-out', qo: 'Quint out', back: 'Overshoot', spring: 'Resorte', step: 'Corte',
}[String(str || 'eo').split(':')[0]] || 'Expo out')

// --- helpers de tiempo que usan las recetas (puros) ---
// progreso de t dentro de [a,b] (clampeado). El "win" que ya usamos en todos los motores.
export const win = (t, a, b) => clamp01((t - a) / (b - a || 1e-6))
// oscilacion amortiguada alrededor de 0 (wobble de asentamiento; NO usar sobre texto asentado)
export const wobble = (t, cycles = 2.5, decay = 4) => (t <= 0 || t >= 1) ? 0 : Math.sin(t * Math.PI * 2 * cycles) * Math.exp(-decay * t) * (1 - t)
// t local del item i de n dentro de [0,1]; overlap 0 = secuencial puro, 1 = todos juntos
export function stagger(t, i, n, overlap = 0.6) {
  if (n <= 1) return clamp01(t)
  const dur = 1 / (1 + (n - 1) * (1 - overlap))
  return clamp01((t - i * dur * (1 - overlap)) / dur)
}
