// urvid · OVERLAY — dibuja los objetos del usuario (texto/imagen) del timeline ENCIMA del video, animados por t.
// PURO respecto al PRNG del motor (no consume r()). NULL-SAFE: video.timeline ausente o sin overlays -> no dibuja nada
// -> gates byte-identicos. Coordenadas en espacio LOGICO del video (video.W x video.H) -> correcto en 9:16/4:5/1:1.
import { EASE, sample, posAt } from './anim.js'

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

// preset(local[0,1], ease) -> {dx,dy,alpha,scale} — la animacion entra en el primer ~28% de la ventana y HOLDea (o sale
// al final para fadeOut). Offsets en unidades del video (VW/VH).
function presetPose(preset, local, ease, VW, VH) {
  const inT = 0.28
  const ei = ease(clamp(local / inT, 0, 1))            // progreso de ENTRADA (0->1 en el primer 28%)
  const eo = ease(clamp((1 - local) / inT, 0, 1))      // progreso de SALIDA (1 al inicio, 0 al final)
  switch (preset) {
    case 'fadeIn': return { alpha: ei }
    case 'fadeOut': return { alpha: eo }
    case 'slideLeft': return { dx: (1 - ei) * -VW * 0.42, alpha: ei }
    case 'slideRight': return { dx: (1 - ei) * VW * 0.42, alpha: ei }
    case 'slideUp': return { dy: (1 - ei) * VH * 0.28, alpha: ei }
    case 'slideDown': return { dy: (1 - ei) * -VH * 0.28, alpha: ei }
    case 'pop': return { scale: 0.5 + 0.5 * ei, alpha: ei }
    default: return {}
  }
}

function paintOverlay(ctx, ov, local, getImg, VW, VH) {
  const tf = ov.transform || {}
  const anim = ov.anim || { kind: 'none' }
  const ease = EASE[anim.ease] || EASE.suave
  let x = tf.x != null ? tf.x : VW / 2, y = tf.y != null ? tf.y : VH / 2
  let scale = tf.scale || 1, rot = tf.rot || 0, alpha = tf.alpha == null ? 1 : tf.alpha
  if (anim.kind === 'recorded' && Array.isArray(anim.keyframes) && anim.keyframes.length >= 2) {
    const p = posAt(sample(anim.keyframes, anim.curved !== false), ease(local))
    if (p) { x = p.x; y = p.y }
  } else if (anim.kind === 'preset' && anim.preset) {
    const ps = presetPose(anim.preset, local, ease, VW, VH)
    x += ps.dx || 0; y += ps.dy || 0; alpha *= (ps.alpha == null ? 1 : ps.alpha); if (ps.scale != null) scale *= ps.scale
  }
  if (alpha <= 0.01) return
  ctx.save()
  ctx.globalAlpha = clamp(alpha, 0, 1)
  ctx.translate(x, y); if (rot) ctx.rotate(rot); if (scale !== 1) ctx.scale(scale, scale)
  if (ov.type === 'image' && ov.imgSrc) {
    const img = getImg && getImg(ov.imgSrc)
    if (img && img.width) { const w = ov.w || img.width, h = ov.h || img.height; ctx.drawImage(img, -w / 2, -h / 2, w, h) }
  } else {
    const st = ov.style || {}, size = st.size || 48, txt = ov.text || ''
    ctx.font = `${st.weight || 800} ${size}px ${st.font || 'Inter, system-ui, sans-serif'}`
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    if (st.stroke) { ctx.lineWidth = size * 0.14; ctx.strokeStyle = st.stroke; ctx.lineJoin = 'round'; ctx.strokeText(txt, 0, 0) }
    ctx.fillStyle = st.color || '#ffffff'
    ctx.fillText(txt, 0, 0)
  }
  ctx.restore()
}

// drawOverlays(ctx, t, video, getImg) — dibuja los overlays activos en el tiempo t (segundos, absoluto del video).
export function drawOverlays(ctx, t, video, getImg) {
  const tl = video && video.timeline
  if (!tl || !Array.isArray(tl.overlays) || !tl.overlays.length) return   // short-circuit -> gates byte-identicos
  const VW = video.W || 405, VH = video.H || 720
  for (const ov of tl.overlays) {
    if (!ov) continue
    const durSec = ov.durSec || video.duration || 1, start = ov.startSec || 0
    const local = (t - start) / Math.max(0.001, durSec)
    if (local < -0.0001 || local > 1.0001) continue                      // fuera de su ventana temporal
    paintOverlay(ctx, ov, clamp(local, 0, 1), getImg, VW, VH)
  }
}
