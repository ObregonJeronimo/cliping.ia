import { clamp } from './theme'
import { SPRING, spr, floatY, parallax } from './motion'
import { useVideoConfig } from 'remotion'
import { fmt } from './layout'

/**
 * Decor — decoración flotante de PRIMER PLANO, elegida POR VIDEO (theme.art.decor) y coherente
 * en todas las escenas, en vez de atada al tema (antes las "pastillas" salían en casi todos los
 * videos). Muchos tipos -> variedad real entre videos, sin mezclar tipos dentro de un mismo video.
 *
 * Tipos: pills | orbs | sparks | rings | chips | cross | none
 * Se posiciona en las ESQUINAS/bordes (evita la banda central donde va el texto), relativo al
 * formato real (9:16 / 1:1 / 16:9) para no caer encima del texto en cuadrado/horizontal.
 * pointerEvents none.
 */

// Posiciones en esquinas/bordes, lejos de la banda central de texto (y 0.30-0.70) y del centro
// superior (donde va la marca). Las primeras son las más seguras (las usan los counts bajos).
const SPOTS = [
  { x: 0.12, y: 0.16 }, { x: 0.88, y: 0.14 },
  { x: 0.13, y: 0.85 }, { x: 0.87, y: 0.86 },
  { x: 0.50, y: 0.93 }, { x: 0.09, y: 0.50 }, { x: 0.91, y: 0.50 },
]

const SHAPES = {
  pills: (theme, i) => (
    <div style={{ height: 56, borderRadius: 28, display: 'flex', alignItems: 'center', gap: 12,
      padding: '0 22px', transform: `rotate(${i % 2 ? 6 : -7}deg)`,
      background: i % 3 === 0 ? theme.accentGrad : theme.pillBg,
      border: i % 3 === 0 ? 'none' : `2px solid ${theme.pillBorder}`, boxShadow: '0 16px 44px rgba(0,0,0,0.4)' }}>
      <div style={{ width: 26, height: 26, borderRadius: '50%', background: i % 3 === 0 ? '#ffffffe6' : theme.accentTo }} />
      <div style={{ width: 70, height: 14, borderRadius: 7, background: i % 3 === 0 ? '#ffffffcc' : '#ffffff2e' }} />
    </div>
  ),
  orbs: (theme, i) => (
    <div style={{ width: 120 + i * 16, height: 120 + i * 16, borderRadius: '50%', filter: 'blur(2px)', opacity: 0.8,
      background: `radial-gradient(circle at 35% 30%, ${theme.accentTo}, ${theme.accentFrom}00 70%)` }} />
  ),
  sparks: (theme, i) => (
    <svg width={46 + (i % 3) * 16} height={46 + (i % 3) * 16} viewBox="-1 -1 2 2"
      style={{ filter: `drop-shadow(0 0 14px ${theme.accentTo}aa)` }}>
      <path d="M0,-1 C0.12,-0.12 0.12,-0.12 1,0 C0.12,0.12 0.12,0.12 0,1 C-0.12,0.12 -0.12,0.12 -1,0 C-0.12,-0.12 -0.12,-0.12 0,-1 Z"
        fill={i % 2 ? theme.accentTo : theme.accentFrom} />
    </svg>
  ),
  rings: (theme, i) => (
    <div style={{ width: 108 + i * 18, height: 108 + i * 18, borderRadius: '50%',
      border: `4px solid ${i % 2 ? theme.accentTo : theme.accentFrom}`, opacity: 0.5 }} />
  ),
  chips: (theme, i) => (
    <div style={{ width: 68, height: 68, borderRadius: 20, transform: `rotate(${i % 2 ? 12 : -10}deg)`,
      background: i % 2 ? theme.pillBg : theme.accentGrad, border: i % 2 ? `2px solid ${theme.pillBorder}` : 'none',
      boxShadow: '0 14px 38px rgba(0,0,0,0.4)' }} />
  ),
  cross: (theme, i) => (
    <svg width="54" height="54" viewBox="0 0 24 24" style={{ filter: `drop-shadow(0 0 12px ${theme.glow})` }}>
      <path d="M11 3h2v8h8v2h-8v8h-2v-8H3v-2h8z" fill={i % 2 ? theme.accentTo : theme.accentFrom} opacity="0.85" />
    </svg>
  ),
}

const COUNTS = { pills: 3, orbs: 4, sparks: 5, rings: 3, chips: 4, cross: 4 }

export const Decor = ({ kind = 'none', theme, frame, fps, cam }) => {
  const F = fmt(useVideoConfig())
  if (!kind || kind === 'none' || !SHAPES[kind]) return null
  const n = COUNTS[kind] || 3
  const px = parallax(cam || { x: 0, y: 0 }, 0.5)
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {Array.from({ length: n }, (_, i) => {
        const sp = SPOTS[i % SPOTS.length]
        const e = spr(frame, fps, 4 + i * 4, SPRING.bouncy, 24)
        const fl = floatY(frame - i * 12, 9, 128 + i * 9)
        return (
          <div key={i} style={{ position: 'absolute', left: sp.x * F.W, top: sp.y * F.H,
            transform: `translate(-50%,-50%) translate(${px.x}px, ${px.y + fl}px) scale(${clamp(e, 0, 1.1)})`, opacity: clamp(e, 0, 1) }}>
            {SHAPES[kind](theme, i)}
          </div>
        )
      })}
    </div>
  )
}

export default Decor
