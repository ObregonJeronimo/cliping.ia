// templates · ANIM — estado de animacion de una capa en su tiempo local ts. Reusa el motor de motion
// de aemotion (springs con overshoot, easings). Entradas calibre Motion/Kinetic + idle continuo +
// salidas. Devuelve { alpha, dx, dy, scale, rot, enterP, outP }.
import { spring, springVel, win, cubicOut, expoOut, clamp, TAU } from '../aemotion/index.js'

// entradas (e = eased 0..1, s = spring con overshoot 0..~1.1). Cada una devuelve un parcial del estado.
const PRESETS_IN = {
  none: () => ({}),
  fade: (e) => ({ alpha: e }),
  rise: (e) => ({ alpha: e, dy: (1 - e) * 44 }),
  drop: (e) => ({ alpha: e, dy: -(1 - e) * 44 }),
  'slide-l': (e) => ({ alpha: e, dx: -(1 - e) * 90 }),
  'slide-r': (e) => ({ alpha: e, dx: (1 - e) * 90 }),
  zoom: (e) => ({ alpha: e, scale: 1.35 - 0.35 * e }),          // entra grande y se asienta (cine)
  'zoom-in': (e, s) => ({ alpha: clamp(e * 1.5, 0, 1), scale: 0.5 + 0.5 * s }),
  pop: (e, s) => ({ alpha: clamp(e * 1.4, 0, 1), scale: 0.6 + 0.4 * s }),  // spring con overshoot
  whip: (e, s) => ({ alpha: clamp(e * 1.6, 0, 1), dx: (1 - s) * 70, rot: (1 - e) * 0.25 }),
  'peel-l': (e) => ({ alpha: clamp(e * 1.5, 0, 1), dx: -(1 - e) * 220, rot: -(1 - cubicOut(e)) * 0.85 }),  // despega de la pared izquierda
  'peel-r': (e) => ({ alpha: clamp(e * 1.5, 0, 1), dx: (1 - e) * 220, rot: (1 - cubicOut(e)) * 0.85 }),
  cascade: () => ({ alpha: 1 }),                                // el alpha lo maneja el barrido per-caracter del texto
  kinetic: () => ({ alpha: 1 }),                               // texto: revelado por PALABRA (render.js)
  typewriter: () => ({ alpha: 1 }),                            // texto: tipeo char-por-char (render.js)
  flip3d: (e) => ({ alpha: clamp(e * 1.4, 0, 1) }),            // imagen: giro 3D en Y (el squash lo aplica render.js)
}
export const ANIM_IN = Object.keys(PRESETS_IN)
export const ANIM_OUT = ['none', 'fade', 'rise', 'drop', 'scale', 'slide-l', 'slide-r']
export const IDLE_KINDS = ['none', 'drift', 'float', 'pulse', 'sway', 'spin', 'wobble3d']

export function animState(ts, dur, layer, isLast) {
  const a = layer.anim || {}
  const inKind = a.in || 'rise'
  const inDur = a.inDur == null ? 0.6 : a.inDur
  const delay = a.delay || 0
  const raw = win(ts, delay, delay + inDur)
  const e = expoOut(raw)
  const s = spring(raw, 0.58, 13)
  let st = { alpha: 1, dx: 0, dy: 0, scale: 1, rot: 0, enterP: raw }
  Object.assign(st, (PRESETS_IN[inKind] || PRESETS_IN.rise)(e, s))

  // idle: nada queda muerto. drift (default) / float / pulse / sway / spin continuo.
  const idle = a.idle === false ? 'none' : (a.idle === true || a.idle == null ? 'drift' : a.idle)
  const ph = (layer._i || 0) * 1.7, done = raw >= 0.99 ? 1 : 0
  if (idle === 'drift') { st.dx += Math.sin(ts / 6 + ph) * 2.4; st.dy += Math.cos(ts / 7.3 + ph + 1.1) * 2 }
  else if (idle === 'float') st.dy += Math.sin(ts / 2.4 + ph) * 7 * done
  else if (idle === 'pulse') st.scale *= 1 + 0.03 * Math.sin(ts * 2.1 + ph) * done
  else if (idle === 'sway') st.rot += Math.sin(ts / 2.8 + ph) * 0.05 * done
  else if (idle === 'spin') st.rot += ts * (a.spinSpeed || 0.6) * done

  // salida: si NO es la ultima escena, se despide en los ultimos ~0.45s (acelera, ease-in)
  if (!isLast && (a.out || 'fade') !== 'none') {
    const op = win(ts, dur - 0.45, dur - 0.08)
    if (op > 0) { const oe = op * op * op; st.alpha *= 1 - clamp(op * 1.2, 0, 1); const o = a.out || 'fade'; if (o === 'rise') st.dy -= oe * 40; else if (o === 'drop') st.dy += oe * 40; else if (o === 'slide-l') st.dx -= oe * 90; else if (o === 'slide-r') st.dx += oe * 90; else if (o === 'scale') st.scale *= 1 - oe * 0.3 }
    st.outP = op
  }
  // scale/rot ESTATICOS o KEYFRAMEADOS los aplica render.js (kf); animState devuelve solo la anim.
  return st
}

export { cubicOut }
