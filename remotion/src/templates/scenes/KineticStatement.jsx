import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion'
import { fitHeadline, segText, clamp } from '../theme'
import { EASE, SPRING, prog, spr, enter, stagger, floatY, cameraDrift, parallax } from '../motion'

/**
 * KineticStatement — texto cinético al estilo del explainer de SaaS.
 * Movimiento vía motion.js (easings premium, springs con overshoot, parallax, cámara).
 */

const GradientText = ({ theme, children }) => (
  <span style={{
    backgroundImage: theme.accentGrad, WebkitBackgroundClip: 'text', backgroundClip: 'text',
    color: 'transparent', filter: `drop-shadow(0 0 24px ${theme.accentTo}55)`,
  }}>{children}</span>
)

const Sparkle = ({ theme, frame, fps, delay = 0 }) => {
  const s = spr(frame, fps, delay, SPRING.pop, 24)
  const rot = prog(frame, delay, 30, EASE.out) * 45
  const op = clamp((frame - delay) / 8, 0, 1)
  return (
    <svg width={66} height={66} viewBox="-1 -1 2 2"
      style={{ opacity: op, transform: `scale(${s}) rotate(${rot}deg)`,
        filter: `drop-shadow(0 0 16px ${theme.accentTo}b0)` }}>
      <defs>
        <linearGradient id="spk" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={theme.accentFrom} /><stop offset="1" stopColor={theme.accentTo} />
        </linearGradient>
      </defs>
      <path d="M0,-1 C0.12,-0.12 0.12,-0.12 1,0 C0.12,0.12 0.12,0.12 0,1 C-0.12,0.12 -0.12,0.12 -1,0 C-0.12,-0.12 -0.12,-0.12 0,-1 Z" fill="url(#spk)" />
    </svg>
  )
}

const Pill = ({ theme, frame, fps, x, y, rot, delay, accent, blur, opacity = 1, px }) => {
  const e = spr(frame, fps, delay, SPRING.bouncy, 22)
  const fl = floatY(frame - delay, 8, 132)
  return (
    <div style={{
      position: 'absolute', left: x, top: y,
      transform: `translate(${px.x}px, ${px.y + fl}px) rotate(${rot}deg) scale(${e})`,
      opacity: clamp(e, 0, 1) * opacity, filter: blur ? `blur(${blur}px)` : 'none',
      height: 60, borderRadius: 30, display: 'flex', alignItems: 'center', gap: 14, padding: '0 26px',
      background: accent ? theme.accentGrad : theme.pillBg,
      border: accent ? 'none' : `2px solid ${theme.pillBorder}`, boxShadow: '0 18px 50px rgba(0,0,0,0.4)',
    }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', background: accent ? '#ffffffe6' : theme.accentTo }} />
      <div style={{ width: 80, height: 16, borderRadius: 8, background: accent ? '#ffffffcc' : '#ffffff2e' }} />
    </div>
  )
}

const Arcs = ({ theme, frame, px }) => {
  const draw = prog(frame, 0, 44, EASE.inOut)
  return (
    <svg width="1080" height="1920" viewBox="0 0 1080 1920"
      style={{ position: 'absolute', inset: 0, opacity: 0.35, transform: `translate(${px.x}px, ${px.y}px)` }}>
      <path d="M-60 1280 C 320 1120, 780 1200, 1160 940" stroke={theme.accentFrom}
        strokeWidth="3" fill="none" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
      <path d="M-60 760 C 360 600, 760 720, 1160 500" stroke={theme.accentTo}
        strokeWidth="2.4" fill="none" opacity="0.7" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
    </svg>
  )
}

export const KineticStatement = ({ theme, lines = [], subtitle = '', variant = 'center', durationInFrames: durProp }) => {
  const frame = useCurrentFrame()
  const vc = useVideoConfig()
  const fps = vc.fps
  const dur = durProp || vc.durationInFrames
  const m = theme.motion

  const cam = cameraDrift(frame, dur, m.cameraDrift)
  const pxBg = parallax(cam, 0.3)
  const pxFg = parallax(cam, 0.7)
  const glowOp = clamp(frame / 14, 0, 1)

  return (
    <AbsoluteFill style={{ background: theme.bg, fontFamily: theme.font, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0,
        transform: `scale(${cam.scale}) translate(${cam.x}px, ${cam.y}px)`, transformOrigin: '50% 42%' }}>
        {theme.motifs.arcs && <Arcs theme={theme} frame={frame} px={pxBg} />}

        <div style={{ position: 'absolute', left: '50%', top: '34%', width: 1100, height: 1100,
          transform: 'translate(-50%,-50%)', opacity: glowOp,
          background: `radial-gradient(circle, ${theme.glow}, rgba(0,0,0,0) 62%)` }} />

        {theme.motifs.pills && <>
          <Pill theme={theme} frame={frame} fps={fps} x={140} y={500} rot={-8} delay={6} accent px={pxFg} />
          <Pill theme={theme} frame={frame} fps={fps} x={720} y={450} rot={6} delay={10} blur={0.8} opacity={0.9} px={pxFg} />
          <Pill theme={theme} frame={frame} fps={fps} x={240} y={680} rot={4} delay={14} blur={1.6} opacity={0.55} px={parallax(cam, 0.5)} />
        </>}

        <AbsoluteFill style={{ alignItems: variant === 'left' ? 'flex-start' : 'center',
          justifyContent: 'center', padding: variant === 'left' ? '0 0 0 90px' : 0 }}>
          {theme.motifs.sparkle &&
            <div style={{ marginBottom: 26 }}><Sparkle theme={theme} frame={frame} fps={fps} delay={4} /></div>}

          <div style={{ textAlign: variant === 'left' ? 'left' : 'center', fontWeight: theme.headWeight, fontSize: fitHeadline(lines.map(segText).join(' ')),
            lineHeight: 1.08, letterSpacing: '-0.025em', color: theme.text, maxWidth: 940, padding: variant === 'left' ? '0 60px 0 0' : '0 70px' }}>
            {lines.map((segs, i) => {
              const e = enter(frame, stagger(i, 8, m.stagger * 2), { dur: m.enterFrames, dist: 64, ease: EASE.back })
              return (
                <div key={i} style={{ transform: e.transform, opacity: e.opacity }}>
                  {segs.map((s, j) => s.accent
                    ? <GradientText key={j} theme={theme}>{s.t}</GradientText>
                    : <span key={j}>{s.t}</span>)}
                </div>
              )
            })}
          </div>

          {subtitle && (() => {
            const e = enter(frame, 8 + lines.length * m.stagger * 2 + 6, { dur: m.enterFrames, dist: 30, ease: EASE.out })
            return (
              <div style={{ marginTop: 40, transform: e.transform, opacity: e.opacity,
                color: theme.textMuted, fontSize: 50, fontWeight: 400 }}>{subtitle}</div>
            )
          })()}
        </AbsoluteFill>
      </div>
    </AbsoluteFill>
  )
}

export default KineticStatement
