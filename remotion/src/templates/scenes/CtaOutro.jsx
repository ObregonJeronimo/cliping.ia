import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion'
import { clamp, fitHeadline } from '../theme'
import { EASE, SPRING, prog, spr, enter, floatY, breathe } from '../motion'

/**
 * CtaOutro — cierre con marca + llamado a la acción.
 * Props: theme, brand, cta.
 */

export const CtaOutro = ({ theme, brand = '', cta = 'Empezá gratis' }) => {
  const frame = useCurrentFrame()
  const vc = useVideoConfig()
  const fps = vc.fps
  const m = theme.motion

  const spk = spr(frame, fps, 0, SPRING.pop, 24)
  const spkRot = prog(frame, 0, 36, EASE.out) * 40
  const brandE = enter(frame, 8, { dur: m.enterFrames, dist: 44, ease: EASE.back })
  const barW = prog(frame, 16, 18, EASE.out)
  const ctaS = spr(frame, fps, 22, SPRING.bouncy, 24)
  const pulse = 1 + 0.025 * Math.sin(frame / 9)
  const glowOp = clamp(frame / 16, 0, 1) * breathe(frame, 0.06, 150)
  const fl = floatY(frame, 5, 150)

  return (
    <AbsoluteFill style={{ background: theme.bg, fontFamily: theme.font,
      alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: '50%', top: '50%', width: 1000, height: 1000,
        transform: 'translate(-50%,-50%)', opacity: glowOp,
        background: `radial-gradient(circle, ${theme.glow}, rgba(0,0,0,0) 62%)` }} />

      <div style={{ transform: `translateY(${fl}px) scale(${spk})`, marginBottom: 50,
        filter: `drop-shadow(0 0 30px ${theme.accentTo}aa)` }}>
        <svg width={120} height={120} viewBox="-1 -1 2 2" style={{ transform: `rotate(${spkRot}deg)` }}>
          <defs>
            <linearGradient id="spkout" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={theme.accentFrom} /><stop offset="1" stopColor={theme.accentTo} />
            </linearGradient>
          </defs>
          <path d="M0,-1 C0.12,-0.12 0.12,-0.12 1,0 C0.12,0.12 0.12,0.12 0,1 C-0.12,0.12 -0.12,0.12 -1,0 C-0.12,-0.12 -0.12,-0.12 0,-1 Z" fill="url(#spkout)" />
        </svg>
      </div>

      <div style={{ transform: brandE.transform, opacity: brandE.opacity,
        fontWeight: theme.headWeight, fontSize: fitHeadline(brand, 150, 70), letterSpacing: '-0.03em',
        color: theme.text, textAlign: 'center', padding: '0 60px' }}>
        {brand}
      </div>

      <div style={{ marginTop: 36, width: 280 * barW, height: 10, borderRadius: 6, background: theme.accentGrad }} />

      <div style={{ marginTop: 70, transform: `scale(${clamp(ctaS, 0, 1.2) * pulse})`, opacity: clamp(ctaS, 0, 1),
        padding: '34px 70px', borderRadius: theme.radius * 1.6, background: theme.accentGrad,
        color: '#fff', fontSize: 52, fontWeight: 600, boxShadow: `0 24px 70px ${theme.glow}` }}>
        {cta}
      </div>
    </AbsoluteFill>
  )
}

export default CtaOutro
