// director · RENDER DE VIDEO — dibuja el frame en el tiempo t a partir de la TIMELINE.
//
// Contrato: drawFrame(ctx, tl, t, opts) -> reporte. Es SEEK-SAFE por construccion: todo sale de
// propsAt(t), que no mira el frame anterior. Saltar a t=7.3s da exactamente el mismo pixel que
// llegar reproduciendo desde 0 — condicion para que el scrub del editor no mienta.
//
// Las transformaciones (scale, rot) se aplican alrededor del CENTRO de la caja: escalar una capa no
// la desplaza. La caja animada reemplaza a la del storyboard, asi que el texto se re-fitea al ancho
// nuevo en cada frame y la garantia nunca-desborda sigue valiendo durante toda la animacion.

import { propsAt, boxDe } from '../core/timeline.js'
import { drawCapa } from './draw.js'
import { drawPlaca } from './plate.js'
import { clamp } from '../core/util.js'

export function drawFrame(ctx, tl, t, opts = {}) {
  const W = opts.W || tl.canvas.W, H = opts.H || tl.canvas.H
  const look = tl.look
  const rep = { faltantes: [], desbordes: [], elementos: [], capas: 0, t }
  ctx.save()
  ctx.clearRect(0, 0, W, H)

  const props = propsAt(tl, clamp(t, 0, tl.dur))
  const vivos = tl.layers.filter(l => props.has(l.id)).sort((a, b) => a.z - b.z || a.id.localeCompare(b.id))

  for (const l of vivos) {
    const p = props.get(l.id)
    rep.capas++
    if (l.kind === 'plate') { drawPlaca(ctx, look, W, H, { ...l.base, deriva: p.x - 0.5 }); continue }
    const box = boxDe(p, W, H)
    const cx = box[0] + box[2] / 2, cy = box[1] + box[3] / 2
    ctx.save()
    ctx.globalAlpha *= clamp(p.alpha, 0, 1)
    if (p.scale !== 1 || p.rot !== 0) {
      ctx.translate(cx, cy)
      if (p.rot) ctx.rotate(p.rot)
      if (p.scale !== 1) ctx.scale(p.scale, p.scale)
      ctx.translate(-cx, -cy)
    }
    // TEXTO CON CAJA ANIMADA: se dibuja con la caja EN REPOSO y se ESCALA hasta la animada.
    // Pasarle la caja animada lo obligaba a re-fitear en cada frame, y el fitter trabaja en pasos de
    // 1px: durante todo un match-cut el tamano del texto saltaba 34 -> 33 -> 34, o sea temblaba. Es el
    // defecto de motion mas facil de leer como "hecho por un script". Ademas asi el reveal por
    // caracter no se recalcula a mitad de camino. El escalado es UNIFORME (por el ancho): estirar la
    // tipografia en un eje se ve peor que cualquier cosa que estemos evitando.
    let capa = { ...l.base, box: [box[0] / W, box[1] / H, box[2] / W, box[3] / H] }
    if (l.base.kind === 'text' && l.base.box && Math.abs(l.base.box[2] - p.w) > 1e-6) {
      const k = l.base.box[2] > 1e-6 ? p.w / l.base.box[2] : 1
      ctx.translate(cx, cy); ctx.scale(k, k); ctx.translate(-cx, -cy)
      const bw = l.base.box[2], bh = l.base.box[3]
      capa = { ...l.base, box: [cx / W - bw / 2, cy / H - bh / 2, bw, bh] }
    }
    drawCapa(ctx, capa, look, W, H, clamp(p.reveal, 0, 1), opts, rep)
    ctx.restore()
  }
  ctx.restore()
  return rep
}

// frames(tl) — cantidad total de frames del video
export const frames = tl => Math.round(tl.dur * tl.fps)
// tDe(tl, i) — tiempo del frame i (centro del frame: evita que el ultimo caiga justo en tl.dur)
export const tDe = (tl, i) => Math.min(tl.dur, (i + 0.5) / tl.fps)
