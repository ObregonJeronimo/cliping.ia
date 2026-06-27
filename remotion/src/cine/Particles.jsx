import { useCurrentFrame, useVideoConfig } from 'remotion'
import { clamp } from './theme'
import { spr, SPRING } from './motion'

/**
 * Particles — sistema de partículas reutilizable y ADITIVO (se monta encima, no toca el layout).
 *
 * Dos modos:
 *  - <SparkBurst at={f} .../>   estallido radial de chispas en el frame `at` (momento héroe:
 *    cuando aterriza un número, cuando entra el CTA, etc.). Corto y elegante, color de marca.
 *  - <AmbientMotes .../>        motas finas flotando de fondo (vida sutil, no distrae).
 *
 * Determinista (seed) -> el mismo video siempre rinde igual. pointerEvents none.
 */

const rnd = (i, s = 1) => {
  const x = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453
  return x - Math.floor(x)
}

/** Estallido radial de chispas centrado en (cx,cy) (px), que dispara en el frame `at`. */
export const SparkBurst = ({ at = 0, cx, cy, color = '#ffffff', count = 16, spread = 280, size = 7 }) => {
  const frame = useCurrentFrame()
  const { width, height } = useVideoConfig()
  const X = cx == null ? width / 2 : cx
  const Y = cy == null ? height / 2 : cy
  const t = frame - at
  if (t < 0 || t > 40) return null
  const grow = spr(frame, 30, at, SPRING.pop, 30)          // 0->1 con overshoot (empuje)
  const life = clamp(t / 36, 0, 1)
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3 }}>
      {Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2 + rnd(i, 3) * 0.4
        const dist = spread * (0.55 + rnd(i, 5) * 0.6) * grow
        const x = X + Math.cos(a) * dist
        const y = Y + Math.sin(a) * dist
        const s = size * (0.6 + rnd(i, 7) * 0.9) * (1 - life * 0.7)
        const c = i % 4 === 0 ? '#ffffff' : color
        return (
          <div key={i} style={{
            position: 'absolute', left: x - s / 2, top: y - s / 2, width: s, height: s,
            borderRadius: '50%', background: c, opacity: (1 - life) * 0.9,
            boxShadow: `0 0 ${s * 2}px ${c}`,
          }} />
        )
      })}
    </div>
  )
}

/** Motas finas flotando (vida ambiente sutil). Cubre todo el cuadro. */
export const AmbientMotes = ({ color = '#ffffff', count = 14, opacity = 0.18 }) => {
  const frame = useCurrentFrame()
  const { width: W, height: H } = useVideoConfig()
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', mixBlendMode: 'screen' }}>
      {Array.from({ length: count }, (_, i) => {
        const x = rnd(i, 1) * W
        const drift = Math.sin(frame / (90 + rnd(i, 2) * 80) + i) * 26
        const y = (H - ((frame * (0.18 + rnd(i, 4) * 0.3) + rnd(i, 6) * H) % (H + 60)))
        const s = 2 + rnd(i, 8) * 3
        const tw = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(frame / 18 + i))
        return (
          <div key={i} style={{
            position: 'absolute', left: x + drift, top: y, width: s, height: s, borderRadius: '50%',
            background: i % 3 === 0 ? color : '#ffffff', opacity: opacity * tw,
            filter: 'blur(0.4px)',
          }} />
        )
      })}
    </div>
  )
}

export default SparkBurst
