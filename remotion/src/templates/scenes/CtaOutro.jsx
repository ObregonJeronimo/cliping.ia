import { AbsoluteFill, useCurrentFrame, useVideoConfig, Img } from 'remotion'
import { clamp, fitHeadline } from '../theme'
import { EASE, SPRING, prog, spr, enter, entrance, floatY, breathe } from '../motion'

/**
 * CtaOutro — cierre con marca + llamado a la acción.
 * Props: theme, brand, cta.
 */

export const CtaOutro = ({ theme, brand = '', cta = '', logo = '', mark = 'star', urgency = '' }) => {
  const frame = useCurrentFrame()
  const vc = useVideoConfig()
  const fps = vc.fps
  const m = theme.motion

  const spk = spr(frame, fps, 0, SPRING.pop, 24)
  const spkRot = prog(frame, 0, 36, EASE.out) * 40
  const brandE = entrance(theme.art, frame, 8, { dur: m.enterFrames, dist: 44, ease: EASE.back })
  const barW = prog(frame, 16, 18, EASE.out)
  const ctaS = spr(frame, fps, 22, SPRING.bouncy, 24)
  const pulse = 1 + 0.025 * Math.sin(frame / 9)
  const glowOp = clamp(frame / 16, 0, 1) * breathe(frame, 0.06, 150)
  const fl = floatY(frame, 5, 150)
  const ringP = prog(frame, 0, 40, EASE.out)

  // Elemento de marca: el logo real si existe; si no, una de varias decoraciones (rotada).
  const renderMark = () => {
    if (logo) {
      return (
        <Img src={logo} style={{ width: 150, height: 150, objectFit: 'contain', borderRadius: theme.radius * 1.4,
          background: 'rgba(255,255,255,0.06)', padding: 18, border: `1.5px solid ${theme.accentTo}55` }} />
      )
    }
    if (mark === 'none') return null
    if (mark === 'initial') {
      return (
        <div style={{ width: 132, height: 132, borderRadius: theme.radius * 1.5, background: theme.accentGrad,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 78, fontWeight: 800 }}>
          {(brand.trim()[0] || 'A').toUpperCase()}
        </div>
      )
    }
    if (mark === 'dot') {
      return (
        <div style={{ width: 120, height: 120, borderRadius: '50%', background: theme.accentGrad,
          boxShadow: `0 0 60px ${theme.glow}, inset 0 0 30px rgba(255,255,255,0.35)` }} />
      )
    }
    if (mark === 'ring') {
      return (
        <svg width={140} height={140} viewBox="0 0 140 140">
          <defs><linearGradient id="ringg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={theme.accentFrom} /><stop offset="1" stopColor={theme.accentTo} />
          </linearGradient></defs>
          {[58, 42, 26].map((r, i) => (
            <circle key={i} cx="70" cy="70" r={r} fill="none" stroke="url(#ringg)" strokeWidth={i === 2 ? 10 : 4}
              strokeDasharray={2 * Math.PI * r} strokeDashoffset={2 * Math.PI * r * (1 - ringP)}
              opacity={0.5 + i * 0.2} transform="rotate(-90 70 70)" />
          ))}
        </svg>
      )
    }
    // default: star (sparkle)
    return (
      <svg width={120} height={120} viewBox="-1 -1 2 2" style={{ transform: `rotate(${spkRot}deg)` }}>
        <defs>
          <linearGradient id="spkout" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={theme.accentFrom} /><stop offset="1" stopColor={theme.accentTo} />
          </linearGradient>
        </defs>
        <path d="M0,-1 C0.12,-0.12 0.12,-0.12 1,0 C0.12,0.12 0.12,0.12 0,1 C-0.12,0.12 -0.12,0.12 -1,0 C-0.12,-0.12 -0.12,-0.12 0,-1 Z" fill="url(#spkout)" />
      </svg>
    )
  }
  const hasMark = logo || mark !== 'none'

  return (
    <AbsoluteFill style={{ background: theme.bg, fontFamily: theme.font,
      alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: '50%', top: '50%', width: 1000, height: 1000,
        transform: 'translate(-50%,-50%)', opacity: glowOp,
        background: `radial-gradient(circle, ${theme.glow}, rgba(0,0,0,0) 62%)` }} />

      {hasMark && (
        <div style={{ transform: `translateY(${fl}px) scale(${spk})`, marginBottom: 50,
          filter: `drop-shadow(0 0 30px ${theme.accentTo}aa)` }}>
          {renderMark()}
        </div>
      )}

      <div style={{ transform: brandE.transform, opacity: brandE.opacity,
        fontWeight: theme.headWeight, fontSize: fitHeadline(brand, 150, 70), letterSpacing: '-0.03em',
        color: theme.text, textAlign: 'center', padding: '0 60px' }}>
        {brand}
      </div>

      <div style={{ marginTop: 36, width: 280 * barW, height: 10, borderRadius: 6, background: theme.accentGrad }} />

      {cta && (
        <div style={{ marginTop: 56, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
          {urgency && (
            <div style={{ opacity: clamp((frame - 26) / 12, 0, 1), transform: `scale(${pulse})`,
              padding: '10px 24px', borderRadius: 99, border: `1.5px solid ${theme.accentTo}66`,
              background: `${theme.accentTo}22`, color: theme.text, fontSize: 30, fontWeight: 700,
              letterSpacing: '0.02em' }}>
              {urgency}
            </div>
          )}
          <div style={{ transform: `scale(${clamp(ctaS, 0, 1.2) * pulse})`, opacity: clamp(ctaS, 0, 1),
            transformOrigin: 'center center', maxWidth: 860, boxSizing: 'border-box',
            padding: '30px 52px', borderRadius: theme.radius * 1.6, background: theme.accentGrad,
            color: '#fff', fontSize: cta.length > 24 ? 40 : 52, fontWeight: 600, boxShadow: `0 24px 70px ${theme.glow}`,
            display: 'flex', alignItems: 'center', gap: 16, textAlign: 'center', lineHeight: 1.15 }}>
            <span style={{ flex: '1 1 auto', whiteSpace: 'normal' }}>{cta}</span>
            <span style={{ flex: '0 0 auto', transform: `translateX(${4 * Math.sin(frame / 6)}px)`, fontWeight: 800 }}>→</span>
          </div>
        </div>
      )}
    </AbsoluteFill>
  )
}

export default CtaOutro
