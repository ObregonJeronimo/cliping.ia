// templates · ANIM — estado de animacion de una capa en el tiempo local ts de su escena. Reusa el
// motor de motion de aemotion (springs, easings). Devuelve { alpha, dx, dy, scale, rot, enterP, outP }.
// enterP lo usa el texto para cascada per-caracter; el resto se aplica al transform de la capa.
import { spring, win, cubicOut, expoOut, clamp } from '../aemotion/index.js'

const PRESETS_IN = {
  none: () => ({}),
  fade: (e) => ({ alpha: e }),
  rise: (e) => ({ alpha: e, dy: (1 - e) * 44 }),
  drop: (e) => ({ alpha: e, dy: -(1 - e) * 44 }),
  'slide-l': (e) => ({ alpha: e, dx: -(1 - e) * 90 }),
  'slide-r': (e) => ({ alpha: e, dx: (1 - e) * 90 }),
  pop: (e, s) => ({ alpha: clamp(e * 1.4, 0, 1), scale: 0.6 + 0.4 * s }),
  cascade: (e) => ({ alpha: 1 }),   // el alpha lo maneja el barrido per-caracter del texto
}

export function animState(ts, dur, layer, isLast) {
  const a = layer.anim || {}
  const inKind = a.in || 'rise'
  const inDur = a.inDur == null ? 0.6 : a.inDur
  const delay = a.delay || 0
  const raw = win(ts, delay, delay + inDur)
  const e = expoOut(raw)
  const s = spring(raw, 0.6, 13)
  let st = { alpha: 1, dx: 0, dy: 0, scale: 1, rot: 0, enterP: raw }
  Object.assign(st, (PRESETS_IN[inKind] || PRESETS_IN.rise)(e, s))

  // idle: deriva sutil continua (nada queda muerto)
  if (a.idle !== false) { const ph = (layer._i || 0) * 1.7; st.dx += Math.sin(ts / 6 + ph) * 2.4; st.dy += Math.cos(ts / 7.3 + ph + 1.1) * 2 }

  // salida: si NO es la ultima escena, se despide en los ultimos ~0.45s (acelera, ease-in)
  if (!isLast && (a.out || 'fade') !== 'none') {
    const op = win(ts, dur - 0.45, dur - 0.08)
    if (op > 0) { const oe = op * op * op; st.alpha *= 1 - clamp(op * 1.2, 0, 1); if ((a.out || 'fade') === 'rise') st.dy -= oe * 40 }
    st.outP = op
  }
  st.scale *= (layer.scale == null ? 1 : layer.scale)
  st.rot += (layer.rot || 0)
  return st
}

export { cubicOut }
