// aemotion 0.1 · BLUR — motion blur REAL por multi-sampling temporal (la tecnica de AE/Remotion):
// como drawFrame es funcion pura de t, se evalua la capa en N sub-tiempos dentro de la ventana del
// shutter y se PROMEDIA. Ventana = (shutterAngle/360)/fps seg (AE: 180°@24fps = 1/48s; permite hasta
// 720° para smear estilizado). Promedio exacto: cada muestra se rasteriza opaca en un scratch propio
// y se acumula con alpha 1/(i+1) (promedio progresivo uniforme).
// Scratch: browser -> OffscreenCanvas; Node -> inyectar con setScratchFactory (tools). Sin scratch
// degrada a 1 muestra (dibuja nitido) — mismo contrato que las transiciones de kinetic.
// Costo real: N rasterizados de la capa -> usarlo POR CAPA rapida, no en el frame entero.
import { clamp } from './util.js'

let scratchFactory = null
export function setScratchFactory(f) { scratchFactory = f }
function scratch(w, h) {
  if (scratchFactory) return scratchFactory(w, h)
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h)
  return null
}

// motionBlur(ctx, t, opts, drawAt): drawAt(ctx2, ti) dibuja la capa en el sub-tiempo ti.
//  opts: samples (2..16, def 8) · shutter (grados, def 180) · fps (def 30) · phase (-1..0, def -0.5
//  centra la ventana en t como AE moderno; 0 = ventana hacia adelante como AE clasico).
export function motionBlur(ctx, t, opts, drawAt) {
  const samples = clamp(Math.round(opts.samples || 8), 1, 16)
  const shutter = opts.shutter == null ? 180 : opts.shutter
  const fps = opts.fps || 30
  const phase = opts.phase == null ? -0.5 : clamp(opts.phase, -1, 0)
  const win = (shutter / 360) / fps
  if (samples <= 1 || win <= 0) { drawAt(ctx, t); return }

  const cw = ctx.canvas.width, ch = ctx.canvas.height
  const acc = scratch(cw, ch), smp = scratch(cw, ch)
  if (!acc || !smp) { drawAt(ctx, t); return }

  const m = ctx.getTransform()
  const actx = acc.getContext('2d'), sctx = smp.getContext('2d')
  actx.setTransform(1, 0, 0, 1, 0, 0); actx.clearRect(0, 0, cw, ch)
  for (let i = 0; i < samples; i++) {
    const ti = t + (phase + i / (samples - 1)) * win
    sctx.setTransform(1, 0, 0, 1, 0, 0); sctx.clearRect(0, 0, cw, ch)
    sctx.setTransform(m.a, m.b, m.c, m.d, m.e, m.f)      // mismo transform (ss del supersampling incluido)
    drawAt(sctx, Math.max(0, ti))
    actx.globalAlpha = 1 / (i + 1)                       // promedio progresivo: acc = media(muestras 0..i)
    actx.drawImage(smp, 0, 0)
  }
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.drawImage(acc, 0, 0)
  ctx.restore()
}
