import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion'
import { fitHeadline, segText, clamp } from '../theme'
import { EASE, SPRING, prog, spr, enter, entrance, floatY, breathe, camera, parallax } from '../motion'

/**
 * Testimonial — una cita destacada con autor. El beat de "prueba social humana".
 * Comilla grande con acento, la frase entra palabra por línea con stagger, y abajo
 * el autor con un avatar de iniciales (derivadas del nombre real, nada hardcodeado).
 *
 * Props:
 *   theme   : objeto de theme
 *   quote   : array de segmentos { t, accent } (la cita; marcá la parte clave)
 *   author  : nombre del autor (string)
 *   role    : cargo / empresa (string) — opcional
 *   stars   : cantidad de estrellas a mostrar (0-5) — opcional, default 0 (off)
 *   variant : 'card' (default) | 'plain'
 */

const GradientText = ({ theme, children }) => (
  <span style={{ backgroundImage: theme.accentGrad, WebkitBackgroundClip: 'text',
    backgroundClip: 'text', color: 'transparent' }}>{children}</span>
)

const initials = (name) => (name || '')
  .trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '★'

const Star = ({ color, size = 40, fill = true }) => (
  <svg width={size} height={size} viewBox="-1 -1 2 2"
    style={{ filter: `drop-shadow(0 0 8px ${color}66)` }}>
    <path d="M0,-1 L0.225,-0.31 L0.95,-0.31 L0.363,0.118 L0.588,0.809 L0,0.382 L-0.588,0.809 L-0.363,0.118 L-0.95,-0.31 L-0.225,-0.31 Z"
      fill={fill ? color : 'none'} stroke={color} strokeWidth={fill ? 0 : 0.08} />
  </svg>
)

export const Testimonial = ({
  theme, quote = [], author = '', role = '', stars = 0, variant = 'card', durationInFrames: durProp,
}) => {
  const frame = useCurrentFrame()
  const vc = useVideoConfig()
  const fps = vc.fps
  const dur = durProp || vc.durationInFrames
  const m = theme.motion

  const cam = camera(theme.art, frame, dur, m.cameraDrift * 0.7)
  const glowOp = clamp(frame / 16, 0, 1) * breathe(frame, 0.05, 150)
  const fl = floatY(frame, 7, 150)

  const markS = spr(frame, fps, 2, SPRING.pop, 26)
  const qText = segText(quote)
  const card = variant === 'card'

  const starsDelay = Math.round(dur * 0.42)
  const authorE = entrance(theme.art, frame, Math.round(dur * 0.5), { dur: m.enterFrames, dist: 36, ease: EASE.out })
  const avatarS = spr(frame, fps, Math.round(dur * 0.5), SPRING.bouncy, 22)

  return (
    <AbsoluteFill style={{ background: theme.bg, fontFamily: theme.font, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0,
        transform: `scale(${cam.scale}) translate(${cam.x}px, ${cam.y}px)`, transformOrigin: '50% 48%' }}>
        <div style={{ position: 'absolute', left: '50%', top: '46%', width: 1050, height: 1000,
          transform: 'translate(-50%,-50%)', opacity: glowOp,
          background: `radial-gradient(circle, ${theme.glow}, rgba(0,0,0,0) 60%)` }} />

        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', padding: '0 80px' }}>
          <div style={{
            transform: `translateY(${fl}px)`,
            maxWidth: 920, width: card ? '100%' : 'auto',
            padding: card ? '70px 64px' : 0,
            background: card ? `linear-gradient(165deg, ${theme.pillBg}, ${theme.bgSolid})` : 'transparent',
            border: card ? `2px solid ${theme.pillBorder}` : 'none', borderRadius: theme.radius * 1.6,
            boxShadow: card ? '0 36px 90px rgba(0,0,0,0.45)' : 'none',
          }}>
            {/* comilla grande */}
            <div style={{ transform: `scale(${clamp(markS, 0, 1.1)})`, transformOrigin: 'left top',
              fontSize: 200, lineHeight: 0.6, height: 96, fontWeight: 700, marginBottom: 14 }}>
              <GradientText theme={theme}>“</GradientText>
            </div>

            {stars > 0 && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                {Array.from({ length: 5 }).map((_, i) => {
                  const on = i < stars
                  const s = spr(frame, fps, starsDelay + i * 3, SPRING.pop, 18)
                  return (
                    <div key={i} style={{ transform: `scale(${clamp(s, 0, 1.15)})`, opacity: on ? 1 : 0.25 }}>
                      <Star color={theme.accentTo} fill={on} />
                    </div>
                  )
                })}
              </div>
            )}

            {/* cita */}
            <div style={{ fontWeight: theme.headWeight, fontSize: fitHeadline(qText, 78, 44),
              lineHeight: 1.22, letterSpacing: '-0.02em', color: theme.text }}>
              {quote.map((s, i) => {
                const e = entrance(theme.art, frame, 8 + i * (m.stagger + 2), { dur: m.enterFrames, dist: 26, ease: EASE.out })
                return (
                  <span key={i} style={{ display: 'inline', opacity: e.opacity }}>
                    {s.accent ? <GradientText theme={theme}>{s.t}</GradientText> : <span>{s.t}</span>}
                  </span>
                )
              })}
            </div>

            {/* autor */}
            {author && (
              <div style={{ marginTop: 46, display: 'flex', alignItems: 'center', gap: 22,
                transform: authorE.transform, opacity: authorE.opacity }}>
                <div style={{ flexShrink: 0, width: 92, height: 92, borderRadius: '50%',
                  transform: `scale(${clamp(avatarS, 0, 1.1)})`,
                  background: theme.accentGrad, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 38, fontWeight: 700, boxShadow: `0 12px 36px ${theme.glow}` }}>
                  {initials(author)}
                </div>
                <div>
                  <div style={{ fontSize: 42, fontWeight: 600, color: theme.text, letterSpacing: '-0.01em' }}>{author}</div>
                  {role && <div style={{ fontSize: 32, fontWeight: 400, color: theme.textMuted, marginTop: 4 }}>{role}</div>}
                </div>
              </div>
            )}
          </div>
        </AbsoluteFill>
      </div>
    </AbsoluteFill>
  )
}

export default Testimonial
