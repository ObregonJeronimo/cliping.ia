// director · LINKER — decide COMO se pasa de una escena a la siguiente. Es la pieza que convierte una
// serie de laminas estaticas en un video que parece editado por una persona.
//
// Contrato (docs/MOTOR-DIRECTOR.md §5): link(A, B, seed, look) -> descriptor. El linker NO dibuja y NO
// escribe keyframes: describe QUE hace cada capa. El compilador de timeline traduce eso a keys.
//
// NUESTRO FLIP (sin libreria): si una capa de A y una de B comparten `matchKey`, no se corta — la
// MISMA capa viaja de su caja en A a su caja en B. First = caja al final de A · Last = caja al inicio
// de B · Invert = delta · Play = spring. La continuidad queda garantizada por construccion (el gate
// E-OBJ-JUMP mide que el salto sea <= 2px).
//
// REGLA ANTI-FRAME-VACIO (la que arreglo el defecto mas visible del motor viejo): la ventana de
// transicion esta CENTRADA en el corte y B empieza a entrar ANTES de que A termine de salir. En ningun
// instante la pantalla queda con solo la placa.

import { seedFor, weightedPick, range } from './prng.js'
import { clamp } from './util.js'

// ---------------------------------------------------------------- catalogo (12 recetas v1)
// ok(A, B, m, look) -> puede aplicarse · dur -> segundos de ventana · espectacular -> tope de 1 por video
// carries -> que matchKeys viajan (FLIP) · salida/entrada -> gesto de las capas que no viajan
export const RECETAS = [
  {
    name: 'carry', peso: 3.0, dur: 0.62, espectacular: false,
    ok: (A, B, m) => m.some(x => x.key === 'hero' && x.de.kind === x.a.kind),
    carries: m => m.filter(x => x.de.kind === x.a.kind).map(x => x.key),
    salida: 'fade', entrada: 'rise',
  },
  {
    name: 'morph-punto', peso: 1.1, dur: 0.55, espectacular: true,
    ok: (A, B, m) => haiHero(A) && haiHero(B) && !m.some(x => x.key === 'hero'),
    carries: () => [], salida: 'colapso', entrada: 'expande',
  },
  {
    name: 'zoom-out-card', peso: 1.0, dur: 0.60, espectacular: true,
    ok: A => A.layers.some(l => l.sangra && l.kind === 'photo'),
    carries: m => m.map(x => x.key), salida: 'encoge', entrada: 'rise',
  },
  {
    name: 'push-reveal', peso: 1.2, dur: 0.52, espectacular: false,
    ok: (A, B) => B.layers.some(l => l.sangra && l.kind === 'photo'),
    carries: m => m.map(x => x.key), salida: 'empuja', entrada: 'empuja-in',
  },
  {
    name: 'mask-swap', peso: 1.6, dur: 0.50, espectacular: false,
    ok: (A, B) => foco(A) && foco(B) && foco(A).kind === 'text' && foco(B).kind === 'text',
    carries: m => m.filter(x => x.key !== 'mensaje').map(x => x.key), salida: 'sube', entrada: 'mask',
  },
  {
    name: 'crossfade-parallax', peso: 1.3, dur: 0.55, espectacular: false,
    ok: (A, B) => A.layers.some(l => l.kind === 'photo') && B.layers.some(l => l.kind === 'photo'),
    carries: m => m.map(x => x.key), salida: 'aleja', entrada: 'acerca',
  },
  {
    name: 'trace', peso: 1.4, dur: 0.48, espectacular: false,
    ok: (A, B) => B.layers.some(l => l.kind === 'stepper'),
    carries: m => m.map(x => x.key), salida: 'fade', entrada: 'traza',
  },
  {
    name: 'flash-cut', peso: 0.9, dur: 0.22, espectacular: false,
    // solo si la placa cambia de valor Y el video es energico: en una pieza calma es una agresion
    ok: (A, B, m, look) => look.energia >= 0.6,
    carries: () => [], salida: 'corte', entrada: 'flash',
  },
  {
    name: 'impact', peso: 2.2, dur: 0.42, espectacular: false,
    ok: (A, B) => B.layers.some(l => l.role === 'stat'),
    carries: m => m.map(x => x.key), salida: 'fade', entrada: 'impacto',
  },
  {
    name: 'stagger-pop', peso: 1.8, dur: 0.46, espectacular: false,
    ok: (A, B) => B.layers.filter(l => /^(cel|cet|logos|rb|ri|ln)/.test(l.id)).length >= 2 || B.layers.some(l => l.kind === 'logoRow'),
    carries: m => m.map(x => x.key), salida: 'fade', entrada: 'pop',
  },
  {
    name: 'gather', peso: 1.5, dur: 0.58, espectacular: true,
    ok: (A, B) => B.rol === 'cierre',
    carries: m => m.map(x => x.key), salida: 'recoge', entrada: 'rise',
  },
  {
    // Peso BAJO a proposito: es el fallback. Con peso 1.0 le ganaba a las recetas especificas casi la
    // mitad de las veces y el video terminaba siendo todo el mismo corte. Cuando es la unica candidata
    // gana igual (weightedPick sobre un solo item), que es exactamente lo que tiene que pasar.
    name: 'dip-solapado', peso: 0.35, dur: 0.44, espectacular: false,
    ok: () => true,                                     // el default: siempre disponible
    carries: m => m.map(x => x.key), salida: 'fade', entrada: 'rise',
  },
]
const haiHero = sc => sc.layers.some(l => l.kind === 'heroObj' || l.kind === 'photo')
const foco = sc => sc.layers.find(l => l.focal)

// ---------------------------------------------------------------- eleccion
// link(A, B, matches, seed, look, estado) -> { name, dur, carries[], salida, entrada }
export function link(A, B, matches, seed, look, estado = {}) {
  const r = seedFor(seed, 'dir.link.' + A.id + '>' + B.id)
  const cand = RECETAS.filter(rc => {
    if (rc.espectacular && estado.espectacularUsada) return false   // tope: 1 por video
    // nunca dos cortes IGUALES seguidos: dos flash-cut pegados se leen como un tic del motor, no como
    // una decision de edicion. Misma logica que "nunca dos escenas de la misma familia seguidas".
    if (rc.name === estado.ultima) return false
    try { return rc.ok(A, B, matches, look) } catch { return false }
  })
  const usables = cand.length ? cand : [RECETAS[RECETAS.length - 1]]
  const rc = weightedPick(r, usables, x => x.peso * (1 + (x.name === 'flash-cut' ? look.energia - 0.5 : 0)))
  if (rc.espectacular) estado.espectacularUsada = true
  estado.ultima = rc.name
  const carries = (rc.carries(matches) || []).filter(k => k !== 'plate')
  return {
    name: rc.name,
    dur: +(rc.dur * clamp(1.25 - look.energia * 0.45, 0.82, 1.22)).toFixed(3),   // pieza energica = cortes mas secos
    carries, salida: rc.salida, entrada: rc.entrada,
    jitter: +range(r, -0.03, 0.03).toFixed(3),           // micro-variacion: dos videos no cortan igual
  }
}

// ---------------------------------------------------------------- gestos -> deltas
// Cada gesto describe DE DONDE viene una capa que entra (o A DONDE va una que sale), en unidades
// normalizadas. El compilador convierte esto en keyframes sobre x/y/scale/alpha/reveal.
// Devuelve { from:{...}, ease } para entradas y { to:{...}, ease } para salidas.
export function gestoEntrada(nombre, l, i, look) {
  const dz = look.dark ? 1 : -1
  switch (nombre) {
    case 'mask': return { from: { reveal: 0 }, ease: 'eo' }
    case 'rise': return { from: { alpha: 0, dy: 0.028, scale: 0.985 }, ease: 'spring:0.72,14' }
    case 'pop': return { from: { alpha: 0, scale: 0.86 }, ease: 'spring:0.55,16' }
    case 'impacto': return l.role === 'stat'
      ? { from: { alpha: 0, scale: 0.72 }, ease: 'spring:0.42,15' }
      : { from: { alpha: 0, dy: 0.02 }, ease: 'eo' }
    case 'expande': return { from: { alpha: 0, scale: 0.12 }, ease: 'spring:0.62,13' }
    case 'empuja-in': return { from: { alpha: 1, dx: 0.55 }, ease: 'qo' }
    case 'acerca': return { from: { alpha: 0, scale: 0.94 }, ease: 'eo' }
    case 'traza': return l.kind === 'stepper' ? { from: { reveal: 0 }, ease: 'lin' } : { from: { alpha: 0, dy: 0.02 }, ease: 'eo' }
    case 'flash': return { from: { alpha: 0 }, ease: 'step' }
    default: return { from: { alpha: 0, dy: 0.02 * dz }, ease: 'eo' }
  }
}
export function gestoSalida(nombre, l, i, look) {
  switch (nombre) {
    case 'sube': return { to: { alpha: 0, dy: -0.035 }, ease: 'ci' }
    case 'colapso': return { to: { alpha: 0, scale: 0.06 }, ease: 'ci' }
    case 'encoge': return { to: { alpha: 0, scale: 0.62 }, ease: 'cio' }
    case 'empuja': return { to: { alpha: 1, dx: -0.55 }, ease: 'qo' }
    case 'aleja': return { to: { alpha: 0, scale: 1.06 }, ease: 'eio' }
    case 'recoge': return { to: { alpha: 0, hacia: 'centro', scale: 0.9 }, ease: 'ci' }
    case 'corte': return { to: { alpha: 0 }, ease: 'step' }
    default: return { to: { alpha: 0, dy: -0.014 }, ease: 'ei' }
  }
}
