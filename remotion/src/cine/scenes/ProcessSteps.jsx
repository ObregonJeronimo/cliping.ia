import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion'
import { fitHeadline, segText, clamp } from '../theme'
import { EASE, SPRING, prog, spr, enter, entrance, stagger, camera } from '../motion'

/**
 * ProcessSteps — flujo de pasos 1 -> 2 -> 3 ("cómo funciona" / el proceso). Badges numerados
 * conectados por una línea que se dibuja, con entrada en cascada. Suma variedad estructural
 * sin ser una lista de features (es secuencial, no enumerativo).
 *
 * Props:
 *   theme   : objeto de theme
 *   title   : array de segmentos { t, accent } arriba — opcional
 *   steps   : array de { label: [segmentos {t,accent}] }
 *   variant : 'flow' (default, línea conectora + badges) | 'cards' (cada paso en tarjeta)
 */

const GradientText = ({ theme, children }) => (
  <span style={{ backgroundImage: theme.accentGrad, WebkitBackgroundClip: 'text',
    backgroundClip: 'text', color: 'transparent' }}>{children}</span>
)

const Seg = ({ theme, segs }) => (segs || []).map((s, j) => s.accent
  ? <GradientText key={j} theme={theme}>{s.t}</GradientText>
  : <span key={j}>{s.t}</span>)

export const ProcessSteps = ({ theme, title = [], steps = [], variant = 'flow', durationInFrames: durProp }) => {
  const frame = useCurrentFrame()
  const vc = useVideoConfig()
  const fps = vc.fps
  const dur = durProp || vc.durationInFrames
  const m = theme.motion

  const cam = camera(theme.art, frame, dur, m.cameraDrift * 0.8)
  const glowOp = clamp(frame / 16, 0, 1)
  const cap = entrance(theme.art, frame, 0, { dur: m.enterFrames, dist: 44, ease: EASE.out })

  const rows = (steps || []).slice(0, 4)
  const cards = variant === 'cards'
  const base = segText(title) ? 12 : 6
  const lineGrow = clamp(prog(frame, base, Math.max(1, rows.length) * (m.stagger + 5), EASE.inOut), 0, 1)

  return (
    <AbsoluteFill style={{ background: theme.bg, fontFamily: theme.font, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0,
        transform: `scale(${cam.scale}) translate(${cam.x}px, ${cam.y}px)`, transformOrigin: '50% 50%' }}>
        <div style={{ position: 'absolute', left: '50%', top: '50%', width: 1050, height: 1100,
          transform: 'translate(-50%,-50%)', opacity: glowOp,
          background: `radial-gradient(circle, ${theme.glow}, rgba(0,0,0,0) 62%)` }} />

        {segText(title) && (
          <div style={{ position: 'absolute', top: 220, width: '100%', textAlign: 'center',
            fontWeight: theme.headWeight, fontSize: fitHeadline(segText(title), 96), lineHeight: 1.08,
            letterSpacing: '-0.025em', color: theme.text, padding: '0 80px',
            transform: cap.transform, opacity: cap.opacity }}>
            <Seg theme={theme} segs={title} />
          </div>
        )}

        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center',
          paddingTop: segText(title) ? 170 : 0 }}>
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 34, width: 840 }}>
            {!cards && rows.length > 1 && (
              <div style={{ position: 'absolute', left: 47, top: 48, bottom: 48, width: 4,
                background: theme.pillBorder, borderRadius: 2,
                transformOrigin: 'top', transform: `scaleY(${lineGrow})` }} />
            )}
            {rows.map((it, i) => {
              const e = enter(frame, base + stagger(i, 6, m.stagger + 4), { dur: m.enterFrames, dist: 60, axis: 'x', ease: EASE.out })
              const ic = spr(frame, fps, base + stagger(i, 6, m.stagger + 4) + 2, SPRING.pop, 22)
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 30, position: 'relative',
                  transform: e.transform, opacity: e.opacity,
                  padding: cards ? '24px 30px' : 0,
                  background: cards ? theme.pillBg : 'transparent',
                  border: cards ? `2px solid ${theme.pillBorder}` : 'none',
                  borderRadius: theme.radius * 1.3,
                  boxShadow: cards ? '0 16px 44px rgba(0,0,0,0.4)' : 'none' }}>
                  <div style={{ flexShrink: 0, width: 96, height: 96, borderRadius: '50%',
                    transform: `scale(${clamp(ic, 0, 1.12)})`, background: theme.accentGrad,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: `0 12px 34px ${theme.glow}`, fontWeight: theme.headWeight, fontSize: 52,
                    color: '#fff', lineHeight: 1 }}>
                    {i + 1}
                  </div>
                  <div style={{ fontSize: fitHeadline(segText(it.label), 54, 34), fontWeight: 600,
                    lineHeight: 1.18, letterSpacing: '-0.015em', color: theme.text, flex: 1 }}>
                    <Seg theme={theme} segs={it.label} />
                  </div>
                </div>
              )
            })}
          </div>
        </AbsoluteFill>
      </div>
    </AbsoluteFill>
  )
}

export default ProcessSteps
