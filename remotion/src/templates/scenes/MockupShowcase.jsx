import { AbsoluteFill, useCurrentFrame, useVideoConfig, Img } from 'remotion'
import { clamp, fitHeadline, segText } from '../theme'
import { EASE, SPRING, prog, spr, enter, floatY, cameraDrift } from '../motion'

/**
 * MockupShowcase — captura de la app inclinada en 3D con glow.
 * Props: theme, title (segmentos {t,accent}), screenshot (URL opcional).
 */

const GradientText = ({ theme, children }) => (
  <span style={{ backgroundImage: theme.accentGrad, WebkitBackgroundClip: 'text',
    backgroundClip: 'text', color: 'transparent' }}>{children}</span>
)

const SkeletonBoard = ({ theme }) => (
  <div style={{ display: 'flex', height: '100%', background: '#141320' }}>
    <div style={{ width: 150, background: '#181626', padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ height: 16, borderRadius: 5, background: theme.accentGrad }} />
      {[0, 1, 2, 3].map(i => <div key={i} style={{ height: 16, borderRadius: 5, background: '#2a2740', width: i === 3 ? '70%' : '100%' }} />)}
    </div>
    <div style={{ flex: 1, display: 'flex', gap: 14, padding: 18 }}>
      {['Planned', 'En curso', 'Listo'].map((h, c) => (
        <div key={c} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 12, color: theme.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6 }}>{h}</div>
          {[0, 1].map(k => (
            <div key={k} style={{ background: '#201d33', borderRadius: 10, padding: 11, display: 'flex', flexDirection: 'column', gap: 7, boxShadow: '0 4px 10px rgba(0,0,0,.3)' }}>
              <div style={{ height: 9, width: 36, borderRadius: 5, background: [theme.accentFrom, theme.accentTo, '#28c840'][(c + k) % 3] }} />
              <div style={{ height: 8, width: '80%', borderRadius: 4, background: '#3a3556' }} />
              <div style={{ height: 7, width: '55%', borderRadius: 4, background: '#2f2b47' }} />
            </div>
          ))}
        </div>
      ))}
    </div>
  </div>
)

export const MockupShowcase = ({ theme, title = [], screenshot = null, variant = 'tiltLeft', durationInFrames: durProp }) => {
  const frame = useCurrentFrame()
  const vc = useVideoConfig()
  const fps = vc.fps
  const dur = durProp || vc.durationInFrames
  const m = theme.motion

  const cam = cameraDrift(frame, dur, m.cameraDrift * 0.7)
  const cap = enter(frame, 0, { dur: m.enterFrames, dist: 50, ease: EASE.out })
  const dev = spr(frame, fps, 8, SPRING.gentle, 30)
  const settle = prog(frame, 8, 38, EASE.out)
  const baseY = variant === 'tiltRight' ? 16 : variant === 'flat' ? -6 : -16
  const baseX = variant === 'flat' ? 6 : 10
  const rotY = baseY + (1 - settle) * (baseY <= 0 ? -10 : 10)
  const rotX = baseX - (1 - settle) * 6
  const fl = floatY(frame, 8, 120)
  const glowOp = clamp(frame / 16, 0, 1)

  return (
    <AbsoluteFill style={{ background: theme.bg, fontFamily: theme.font, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0,
        transform: `scale(${cam.scale}) translate(${cam.x}px, ${cam.y}px)`, transformOrigin: '50% 58%' }}>
        <div style={{ position: 'absolute', left: '50%', top: '60%', width: 1100, height: 900,
          transform: 'translate(-50%,-50%)', opacity: glowOp,
          background: `radial-gradient(circle, ${theme.glow}, rgba(0,0,0,0) 60%)` }} />

        <div style={{ position: 'absolute', top: 230, width: '100%', textAlign: 'center',
          fontWeight: theme.headWeight, fontSize: fitHeadline(segText(title), 112), lineHeight: 1.08, letterSpacing: '-0.025em',
          color: theme.text, padding: '0 70px', transform: cap.transform, opacity: cap.opacity }}>
          {title.map((s, j) => s.accent
            ? <GradientText key={j} theme={theme}>{s.t}</GradientText>
            : <span key={j}>{s.t}</span>)}
        </div>

        <div style={{ position: 'absolute', top: 720, left: 0, width: '100%', height: 900,
          perspective: 1600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 940, height: 600, borderRadius: 24, overflow: 'hidden',
            background: '#141320', border: `1px solid ${theme.pillBorder}`,
            transform: `translateY(${fl}px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(${0.9 + clamp(dev, 0, 1.1) * 0.1})`,
            opacity: clamp(dev, 0, 1),
            boxShadow: `0 60px 140px ${theme.glow}, 0 0 0 1px ${theme.accentFrom}40` }}>
            <div style={{ height: 56, background: '#1b1930', display: 'flex', alignItems: 'center', gap: 12, padding: '0 24px' }}>
              {['#ff5f57', '#febc2e', '#28c840'].map(c => <div key={c} style={{ width: 18, height: 18, borderRadius: '50%', background: c }} />)}
            </div>
            <div style={{ height: 'calc(100% - 56px)' }}>
              {screenshot
                ? <Img src={screenshot} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                : <SkeletonBoard theme={theme} />}
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  )
}

export default MockupShowcase
