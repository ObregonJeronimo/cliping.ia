import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring } from 'remotion'
import { easeOut, clamp } from '../theme'

/**
 * CtaOutro — cierre con marca + llamado a la acción.
 *
 * Props:
 *   theme : objeto de theme
 *   brand : nombre de marca
 *   cta   : texto del botón / llamado a la acción
 */

export const CtaOutro = ({ theme, brand = '', cta = 'Empezá gratis' }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const m = theme.motion

  const spk = spring({ frame, fps, config: { damping: 11 }, durationInFrames: 24 })
  const brandUp = (1 - easeOut(clamp((frame - 8) / m.enterFrames, 0, 1))) * 40
  const brandOp = clamp((frame - 8) / m.enterFrames, 0, 1)
  const barW = easeOut(clamp((frame - 16) / 18, 0, 1))
  const cta_ = spring({ frame: frame - 22, fps, config: { damping: 14 }, durationInFrames: 24 })
  const pulse = 1 + 0.03 * Math.sin(frame / 7)
  const glowOp = clamp(frame / 16, 0, 1)

  return (
    <AbsoluteFill style={{ background: theme.bg, fontFamily: theme.font,
      alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: '50%', top: '50%', width: 1000, height: 1000,
        transform: 'translate(-50%,-50%)', opacity: glowOp,
        background: `radial-gradient(circle, ${theme.glow}, rgba(0,0,0,0) 62%)` }} />

      <div style={{ transform: `scale(${spk})`, marginBottom: 50,
        filter: `drop-shadow(0 0 30px ${theme.accentTo}aa)` }}>
        <svg width={120} height={120} viewBox="-1 -1 2 2">
          <defs>
            <linearGradient id="spkout" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={theme.accentFrom} />
              <stop offset="1" stopColor={theme.accentTo} />
            </linearGradient>
          </defs>
          <path d="M0,-1 C0.12,-0.12 0.12,-0.12 1,0 C0.12,0.12 0.12,0.12 0,1 C-0.12,0.12 -0.12,0.12 -1,0 C-0.12,-0.12 -0.12,-0.12 0,-1 Z" fill="url(#spkout)" />
        </svg>
      </div>

      <div style={{ transform: `translateY(${brandUp}px)`, opacity: brandOp,
        fontWeight: theme.headWeight, fontSize: 150, letterSpacing: '-0.03em', color: theme.text }}>
        {brand}
      </div>

      <div style={{ marginTop: 36, width: 280 * barW, height: 10, borderRadius: 6, background: theme.accentGrad }} />

      <div style={{ marginTop: 70, transform: `scale(${cta_ * pulse})`, opacity: cta_,
        padding: '34px 70px', borderRadius: theme.radius * 1.6, background: theme.accentGrad,
        color: '#fff', fontSize: 52, fontWeight: 600,
        boxShadow: `0 24px 70px ${theme.glow}` }}>
        {cta}
      </div>
    </AbsoluteFill>
  )
}

export default CtaOutro
