import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring } from 'remotion'
import { easeOut, easeInOut, clamp } from '../theme'

/**
 * IntegrationCluster — hub central + fuentes alrededor conectadas por líneas.
 *
 * Props:
 *   theme  : objeto de theme
 *   title  : array de segmentos { t, accent } para el caption
 *   colors : array de colores para los puntos de las fuentes (default 5)
 */

const GradientText = ({ theme, children }) => (
  <span style={{ backgroundImage: theme.accentGrad, WebkitBackgroundClip: 'text',
    backgroundClip: 'text', color: 'transparent' }}>{children}</span>
)

const DEFAULT_COLORS = ['#e01e5a', '#ea4335', '#5865f2', '#25d366', '#36c5e0']
// Posiciones (en canvas 1080x1920) de cada pill alrededor del hub (540,1140).
const SLOTS = [
  { x: 150, y: 880 }, { x: 930, y: 880 },
  { x: 90, y: 1140 }, { x: 990, y: 1140 },
  { x: 540, y: 1420 },
]

export const IntegrationCluster = ({ theme, title = [], colors = DEFAULT_COLORS }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const m = theme.motion
  const HUB = { x: 540, y: 1140 }

  const capUp = (1 - easeOut(clamp(frame / m.enterFrames, 0, 1))) * 50
  const capOp = clamp(frame / m.enterFrames, 0, 1)
  const hub = spring({ frame: frame - 8, fps, config: { damping: 12 }, durationInFrames: 26 })
  const lineDraw = easeInOut(clamp((frame - 14) / 26, 0, 1))
  const glowOp = clamp(frame / 16, 0, 1)
  const n = Math.min(colors.length, SLOTS.length)

  return (
    <AbsoluteFill style={{ background: theme.bg, fontFamily: theme.font, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: '50%', top: '59%', width: 900, height: 900,
        transform: 'translate(-50%,-50%)', opacity: glowOp,
        background: `radial-gradient(circle, ${theme.glow}, rgba(0,0,0,0) 60%)` }} />

      <div style={{ position: 'absolute', top: 250, width: '100%', textAlign: 'center',
        fontWeight: theme.headWeight, fontSize: 112, lineHeight: 1.07, letterSpacing: '-0.025em',
        color: theme.text, padding: '0 70px', transform: `translateY(${capUp}px)`, opacity: capOp }}>
        {title.map((s, j) => s.accent
          ? <GradientText key={j} theme={theme}>{s.t}</GradientText>
          : <span key={j}>{s.t}</span>)}
      </div>

      <svg width="1080" height="1920" viewBox="0 0 1080 1920" style={{ position: 'absolute', inset: 0 }}>
        <g stroke={theme.accentFrom} strokeWidth="3" strokeDasharray="8 12" opacity="0.4" fill="none">
          {SLOTS.slice(0, n).map((p, i) => {
            const x2 = HUB.x + (p.x - HUB.x) * lineDraw
            const y2 = HUB.y + (p.y - HUB.y) * lineDraw
            return <line key={i} x1={HUB.x} y1={HUB.y} x2={x2} y2={y2} />
          })}
        </g>
      </svg>

      {SLOTS.slice(0, n).map((p, i) => {
        const e = spring({ frame: frame - 12 - i * m.stagger, fps, config: { damping: 16 }, durationInFrames: 22 })
        const float = Math.sin((frame - i * 7) / 24) * 7
        return (
          <div key={i} style={{ position: 'absolute', left: p.x, top: p.y,
            transform: `translate(-50%,-50%) translateY(${float}px) scale(${e})`, opacity: e,
            height: 112, borderRadius: 56, display: 'flex', alignItems: 'center', gap: 22, padding: '0 40px',
            background: theme.pillBg, border: `2px solid ${theme.pillBorder}`, boxShadow: '0 16px 40px rgba(0,0,0,0.45)' }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: colors[i] }} />
            <div style={{ width: 108, height: 22, borderRadius: 12, background: '#ffffff2a' }} />
          </div>
        )
      })}

      <div style={{ position: 'absolute', left: HUB.x, top: HUB.y,
        transform: `translate(-50%,-50%) scale(${hub})`,
        width: 260, height: 260, borderRadius: 72, background: theme.accentGrad,
        boxShadow: `0 0 120px ${theme.glow}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width={112} height={112} viewBox="-1 -1 2 2">
          <path d="M0,-1 C0.12,-0.12 0.12,-0.12 1,0 C0.12,0.12 0.12,0.12 0,1 C-0.12,0.12 -0.12,0.12 -1,0 C-0.12,-0.12 -0.12,-0.12 0,-1 Z" fill="#fff" />
        </svg>
      </div>
    </AbsoluteFill>
  )
}

export default IntegrationCluster
