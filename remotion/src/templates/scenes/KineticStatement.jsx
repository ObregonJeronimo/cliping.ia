import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring } from 'remotion'
import { easeOut, easeInOut, clamp } from '../theme'

/**
 * KineticStatement — escena de texto cinético al estilo del explainer de SaaS.
 *
 * Props:
 *   theme    : objeto de theme (de THEMES)
 *   lines    : array de líneas; cada línea es array de segmentos { t, accent }
 *              ej: [[{t:'Centralizá todo tu'}], [{t:'feedback', accent:true}]]
 *   subtitle : string opcional bajo el título
 *
 * Nota: requiere la fuente Inter cargada (ej. @remotion/google-fonts/Inter).
 */

const GradientText = ({ theme, children }) => (
  <span style={{
    backgroundImage: theme.accentGrad,
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
    filter: `drop-shadow(0 0 24px ${theme.accentTo}55)`,
  }}>{children}</span>
)

const Sparkle = ({ theme, frame, fps, delay = 0 }) => {
  const s = spring({ frame: frame - delay, fps, config: { damping: 11 }, durationInFrames: 24 })
  const rot = easeOut(clamp((frame - delay) / 30, 0, 1)) * 45
  const op = clamp((frame - delay) / 8, 0, 1)
  return (
    <svg width={66} height={66} viewBox="-1 -1 2 2"
      style={{ opacity: op, transform: `scale(${s}) rotate(${rot}deg)`,
        filter: `drop-shadow(0 0 16px ${theme.accentTo}b0)` }}>
      <defs>
        <linearGradient id="spk" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={theme.accentFrom} />
          <stop offset="1" stopColor={theme.accentTo} />
        </linearGradient>
      </defs>
      <path d="M0,-1 C0.12,-0.12 0.12,-0.12 1,0 C0.12,0.12 0.12,0.12 0,1 C-0.12,0.12 -0.12,0.12 -1,0 C-0.12,-0.12 -0.12,-0.12 0,-1 Z" fill="url(#spk)" />
    </svg>
  )
}

const Pill = ({ theme, frame, fps, x, y, rot, delay, accent, blur, opacity = 1 }) => {
  const enter = spring({ frame: frame - delay, fps, config: { damping: 16 }, durationInFrames: 22 })
  const float = Math.sin((frame - delay) / 22) * 8
  return (
    <div style={{
      position: 'absolute', left: x, top: y,
      transform: `translateY(${float}px) rotate(${rot}deg) scale(${enter})`,
      opacity: enter * opacity, filter: blur ? `blur(${blur}px)` : 'none',
      height: 60, borderRadius: 30, display: 'flex', alignItems: 'center', gap: 14, padding: '0 26px',
      background: accent ? theme.accentGrad : theme.pillBg,
      border: accent ? 'none' : `2px solid ${theme.pillBorder}`,
      boxShadow: '0 18px 50px rgba(0,0,0,0.4)',
    }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%',
        background: accent ? '#ffffffe6' : theme.accentTo }} />
      <div style={{ width: 80, height: 16, borderRadius: 8,
        background: accent ? '#ffffffcc' : '#ffffff2e' }} />
    </div>
  )
}

const Arcs = ({ theme, frame }) => {
  const draw = easeInOut(clamp(frame / 40, 0, 1))
  return (
    <svg width="1080" height="1920" viewBox="0 0 1080 1920"
      style={{ position: 'absolute', inset: 0, opacity: 0.35 }}>
      <path d="M-60 1280 C 320 1120, 780 1200, 1160 940" stroke={theme.accentFrom}
        strokeWidth="3" fill="none" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
      <path d="M-60 760 C 360 600, 760 720, 1160 500" stroke={theme.accentTo}
        strokeWidth="2.4" fill="none" opacity="0.7" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
    </svg>
  )
}

export const KineticStatement = ({ theme, lines = [], subtitle = '', durationInFrames: durProp }) => {
  const frame = useCurrentFrame()
  const vc = useVideoConfig()
  const fps = vc.fps
  const dur = durProp || vc.durationInFrames
  const m = theme.motion

  const camT = easeInOut(clamp(frame / dur, 0, 1))
  const camScale = 1 + m.cameraDrift * camT
  const glowOp = clamp(frame / 14, 0, 1)

  return (
    <AbsoluteFill style={{ background: theme.bg, fontFamily: theme.font, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${camScale})`, transformOrigin: '50% 42%' }}>
        {theme.motifs.arcs && <Arcs theme={theme} frame={frame} />}

        <div style={{
          position: 'absolute', left: '50%', top: '34%', width: 1100, height: 1100,
          transform: 'translate(-50%,-50%)', opacity: glowOp,
          background: `radial-gradient(circle, ${theme.glow}, rgba(0,0,0,0) 62%)`,
        }} />

        {theme.motifs.pills && <>
          <Pill theme={theme} frame={frame} fps={fps} x={140} y={500} rot={-8} delay={6} accent />
          <Pill theme={theme} frame={frame} fps={fps} x={720} y={450} rot={6} delay={10} blur={0.8} opacity={0.9} />
          <Pill theme={theme} frame={frame} fps={fps} x={240} y={680} rot={4} delay={14} blur={1.6} opacity={0.55} />
        </>}

        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
          {theme.motifs.sparkle &&
            <div style={{ marginBottom: 26 }}><Sparkle theme={theme} frame={frame} fps={fps} delay={4} /></div>}

          <div style={{ textAlign: 'center', fontWeight: theme.headWeight, fontSize: 128,
            lineHeight: 1.05, letterSpacing: '-0.025em', color: theme.text, padding: '0 70px' }}>
            {lines.map((segs, i) => {
              const d = 8 + i * m.stagger * 2
              const up = (1 - easeOut(clamp((frame - d) / m.enterFrames, 0, 1))) * 60
              const op = clamp((frame - d) / m.enterFrames, 0, 1)
              return (
                <div key={i} style={{ transform: `translateY(${up}px)`, opacity: op }}>
                  {segs.map((s, j) => s.accent
                    ? <GradientText key={j} theme={theme}>{s.t}</GradientText>
                    : <span key={j}>{s.t}</span>)}
                </div>
              )
            })}
          </div>

          {subtitle && (() => {
            const d = 8 + lines.length * m.stagger * 2 + 6
            const up = (1 - easeOut(clamp((frame - d) / m.enterFrames, 0, 1))) * 30
            const op = clamp((frame - d) / m.enterFrames, 0, 1)
            return (
              <div style={{ marginTop: 40, transform: `translateY(${up}px)`, opacity: op,
                color: theme.textMuted, fontSize: 50, fontWeight: 400 }}>{subtitle}</div>
            )
          })()}
        </AbsoluteFill>
      </div>
    </AbsoluteFill>
  )
}

export default KineticStatement
