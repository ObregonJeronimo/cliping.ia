// kinetic 1.0 · SHAPES — formas parametricas por radios polares: blob organico <-> rombo <-> "casi rect".
// Un solo sampler (polarShape) interpola entre familias -> el MORPH es lerp de parametros, nunca de paths
// (cero auto-cruces, siempre suave). Los armonicos del blob salen del seed -> cada video tiene SU blob.
import { TAU, clamp, lerp } from './util.js'

// radio en el angulo a para una mezcla de: circulo(1) + armonicos organicos (blob) + diamante + cuadrado.
// k = { blob, diamond, square } pesos 0..1 (no hace falta que sumen 1; se normaliza contra el circulo base).
// harm = [{ f, amp, ph }] armonicos del blob (f entera >= 2).
export function polarRadius(a, k, harm) {
  let r = 1
  if (k.blob > 0 && harm && harm.length) {
    let o = 0
    for (const h of harm) o += Math.sin(a * h.f + h.ph) * h.amp
    r += o * k.blob
  }
  if (k.diamond > 0) {
    const d = 1 / (Math.abs(Math.cos(a)) + Math.abs(Math.sin(a)))       // rombo unitario
    r = lerp(r, d, k.diamond)
  }
  if (k.square > 0) {
    const s = 1 / Math.max(Math.abs(Math.cos(a)), Math.abs(Math.sin(a))) // cuadrado unitario
    r = lerp(r, s, k.square)
  }
  return r
}

// path cerrado y suave en ctx (64 muestras bastan a 1080p; usa lineTo denso, mas robusto que bezier)
export function polarShapePath(ctx, cx, cy, radius, k, harm, rot = 0, steps = 72) {
  ctx.beginPath()
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * TAU
    const r = radius * polarRadius(a + rot, k, harm)
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
  }
  ctx.closePath()
}

// armonicos deterministas de un prng: 2-3 frecuencias bajas, amplitud suave -> blob "de diseno", no ruido
export function blobHarmonics(prng, wildness = 0.14) {
  const n = 2 + ((prng() * 2) | 0)
  const out = []
  for (let i = 0; i < n; i++) out.push({ f: 2 + i + ((prng() * 2) | 0), amp: wildness * (0.5 + prng() * 0.5) / (i + 1), ph: prng() * TAU })
  return out
}

// mezcla de familias para el morph del reel: p=0 blob puro -> p=1 rombo puro (con blob desvaneciendose)
export const morphBlobToDiamond = p => ({ blob: (1 - p) * 1, diamond: clamp(p, 0, 1), square: 0 })

// wipe liquido: clip con un blob que crece desde un borde (edge: 'left'|'right'|'top'|'bottom') hasta
// cubrir todo el frame. p=0 nada, p=1 cubierto (radio sobrado). El llamador hace save/clip/draw/restore.
export function liquidWipePath(ctx, W, H, p, edge, harm) {
  const diag = Math.hypot(W, H)
  const r = p * diag * 1.25 + 1
  const cx = edge === 'left' ? 0 : edge === 'right' ? W : W / 2
  const cy = edge === 'top' ? 0 : edge === 'bottom' ? H : H / 2
  polarShapePath(ctx, cx, cy, r, { blob: 0.8, diamond: 0, square: 0 }, harm, p * 1.2)
}
