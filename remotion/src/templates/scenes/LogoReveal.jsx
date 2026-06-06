import { AbsoluteFill, useCurrentFrame, useVideoConfig, Img } from 'remotion'
import { fitHeadline, clamp } from '../theme'
import { EASE, SPRING, prog, spr, enter, entrance, floatY, breathe, camera } from '../motion'

/**
 * LogoReveal — sello de marca (stinger). Revela el LOGO REAL del sitio (si el
 * director lo consiguió) con un anillo de glow que se abre, o cae a un wordmark
 * grande con el nombre de la marca. El beat de "esto es <marca>".
 *
 * Props:
 *   theme    : objeto de theme
 *   brand    : nombre de marca (string)
 *   logo     : URL del logo (la inyecta el backend re-hosteada; opcional)
 *   tagline  : línea chica debajo (string) — opcional
 *   variant  : 'mark' (default: logo/inicial en chip + nombre) | 'wordmark' (solo texto grande)
 */

const GradientText = ({ theme, children, style }) => (
  <span style={{
    backgroundImage: theme.accentGrad, WebkitBackgroundClip: 'text', backgroundClip: 'text',
    color: 'transparent', filter: `drop-shadow(0 0 26px ${theme.accentTo}55)`, ...style,
  }}>{children}</span>
)

const initials = (name) => (name || '')
  .trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '★'

export const LogoReveal = ({
  theme, brand = '', logo = null, tagline = '', variant = 'mark', durationInFrames: durProp,
}) => {
  const frame = useCurrentFrame()
  const vc = useVideoConfig()
  const fps = vc.fps
  const dur = durProp || vc.durationInFrames
  const m = theme.motion

  const cam = camera(theme.art, frame, dur, m.cameraDrift * 0.6)
  const glowOp = clamp(frame / 14, 0, 1) * breathe(frame, 0.06, 150)
  const fl = floatY(frame, 6, 150)

  // Anillo que se abre alrededor del sello.
  const ring = prog(frame, 6, 30, EASE.out)
  const mark = spr(frame, fps, 4, SPRING.pop, 28)
  const brandE = entrance(theme.art, frame, 16, { dur: m.enterFrames, dist: 40, ease: EASE.back })
  const barW = prog(frame, 24, 18, EASE.out)
  const tagE = entrance(theme.art, frame, 30, { dur: m.enterFrames, dist: 22, ease: EASE.out })

  const wordmark = variant === 'wordmark'
  const CX = 540, CY = wordmark ? 860 : 720

  return (
    <AbsoluteFill style={{ background: theme.bg, fontFamily: theme.font, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0,
        transform: `scale(${cam.scale}) translate(${cam.x}px, ${cam.y}px)`, transformOrigin: '50% 46%' }}>
        <div style={{ position: 'absolute', left: '50%', top: '44%', width: 1050, height: 1050,
          transform: 'translate(-50%,-50%)', opacity: glowOp,
          background: `radial-gradient(circle, ${theme.glow}, rgba(0,0,0,0) 60%)` }} />

        {/* anillos que se abren */}
        {!wordmark && (
          <svg width="1080" height="1920" viewBox="0 0 1080 1920" style={{ position: 'absolute', inset: 0 }}>
            <circle cx={CX} cy={CY} r={150 + ring * 90} fill="none" stroke={theme.accentFrom}
              strokeWidth="3" opacity={(1 - ring) * 0.6} />
            <circle cx={CX} cy={CY} r={150 + ring * 160} fill="none" stroke={theme.accentTo}
              strokeWidth="2" opacity={(1 - ring) * 0.4} />
          </svg>
        )}

        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', padding: '0 70px' }}>
          {!wordmark && (
            <div style={{ transform: `translateY(${fl}px) scale(${clamp(mark, 0, 1.12)})`, marginBottom: 56,
              width: 300, height: 300, borderRadius: theme.radius * 2.2, overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: logo ? theme.pillBg : theme.accentGrad,
              border: logo ? `2px solid ${theme.pillBorder}` : 'none',
              boxShadow: `0 24px 70px ${theme.glow}` }}>
              {logo
                ? <Img src={logo} style={{ width: '78%', height: '78%', objectFit: 'contain' }} />
                : <span style={{ color: '#fff', fontSize: 150, fontWeight: 800, letterSpacing: '-0.03em' }}>{initials(brand)}</span>}
            </div>
          )}

          <div style={{ transform: brandE.transform, opacity: brandE.opacity, textAlign: 'center',
            fontWeight: theme.headWeight, fontSize: fitHeadline(brand, wordmark ? 168 : 120, 64),
            letterSpacing: '-0.035em', lineHeight: 1.02, color: theme.text }}>
            {wordmark ? <GradientText theme={theme}>{brand}</GradientText> : brand}
          </div>

          <div style={{ marginTop: 30, width: 240 * barW, height: 9, borderRadius: 6, background: theme.accentGrad }} />

          {tagline && (
            <div style={{ marginTop: 30, transform: tagE.transform, opacity: tagE.opacity,
              color: theme.textMuted, fontSize: 46, fontWeight: 400, textAlign: 'center' }}>{tagline}</div>
          )}
        </AbsoluteFill>
      </div>
    </AbsoluteFill>
  )
}

export default LogoReveal
