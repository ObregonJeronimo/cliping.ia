import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion'
import { fitHeadline, segText, clamp } from '../theme'
import { EASE, SPRING, prog, spr, entrance, camera, breathe } from '../motion'

/**
 * OfferPrice — oferta/precio (ideal ecommerce). Badge opcional + titular + PRECIO grande con
 * pop, precio viejo tachado opcional y caption. El precio/descuento debe ser REAL: el director
 * sólo arma esta escena si el sitio tiene precios (el backend los extrae).
 *
 * Props:
 *   theme    : objeto de theme
 *   badge    : string corto (ej "OFERTA", "-20%") — opcional
 *   title    : array de segmentos { t, accent } — opcional
 *   price    : string (ej "$15.000")
 *   oldPrice : string tachado — opcional
 *   caption  : string abajo (ej "Envío gratis · Solo esta semana") — opcional
 *   variant  : 'stack' (default) | 'tag'
 */

const GradientText = ({ theme, children }) => (
  <span style={{ backgroundImage: theme.accentGrad, WebkitBackgroundClip: 'text',
    backgroundClip: 'text', color: 'transparent' }}>{children}</span>
)

const Seg = ({ theme, segs }) => (segs || []).map((s, j) => s.accent
  ? <GradientText key={j} theme={theme}>{s.t}</GradientText>
  : <span key={j}>{s.t}</span>)

export const OfferPrice = ({ theme, badge = '', title = [], price = '', oldPrice = '',
                             caption = '', variant = 'stack', durationInFrames: durProp }) => {
  const frame = useCurrentFrame()
  const vc = useVideoConfig()
  const fps = vc.fps
  const dur = durProp || vc.durationInFrames
  const m = theme.motion

  const cam = camera(theme.art, frame, dur, m.cameraDrift)
  const glowOp = clamp(frame / 16, 0, 1)
  const bd = entrance(theme.art, frame, 2, { dur: m.enterFrames, dist: 40, ease: EASE.out })
  const tl = entrance(theme.art, frame, 8, { dur: m.enterFrames, dist: 40, ease: EASE.out })
  const pop = spr(frame, fps, 14, SPRING.pop, 26)
  const capE = prog(frame, 24, 16, EASE.out)
  const br = breathe(frame, 0.014, 110)
  const priceSize = (price || '').length > 9 ? 132 : (price || '').length > 6 ? 168 : 200

  return (
    <AbsoluteFill style={{ background: theme.bg, fontFamily: theme.font, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0,
        transform: `scale(${cam.scale}) translate(${cam.x}px, ${cam.y}px)`, transformOrigin: '50% 50%' }}>
        <div style={{ position: 'absolute', left: '50%', top: '50%', width: 1100, height: 1100,
          transform: 'translate(-50%,-50%)', opacity: glowOp,
          background: `radial-gradient(circle, ${theme.glow}, rgba(0,0,0,0) 60%)` }} />

        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', gap: 30, padding: '0 90px' }}>
          {badge ? (
            <div style={{ transform: bd.transform, opacity: bd.opacity, padding: '14px 36px',
              borderRadius: 999, background: theme.accentGrad, color: '#fff', fontWeight: theme.headWeight,
              fontSize: 42, letterSpacing: '0.02em', boxShadow: `0 12px 34px ${theme.glow}` }}>
              {badge}
            </div>
          ) : null}

          {segText(title) ? (
            <div style={{ textAlign: 'center', fontWeight: theme.headWeight,
              fontSize: fitHeadline(segText(title), 80, 46), lineHeight: 1.08, letterSpacing: '-0.025em',
              color: theme.text, transform: tl.transform, opacity: tl.opacity }}>
              <Seg theme={theme} segs={title} />
            </div>
          ) : null}

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
            transform: `scale(${clamp(pop, 0, 1.1) * br})`, opacity: clamp(pop, 0, 1) }}>
            {oldPrice ? (
              <div style={{ fontSize: 56, color: theme.textMuted, textDecoration: 'line-through',
                opacity: 0.7, marginBottom: 6 }}>{oldPrice}</div>
            ) : null}
            <div style={{ fontSize: priceSize, fontWeight: theme.headWeight, lineHeight: 0.95,
              letterSpacing: '-0.04em', textAlign: 'center' }}>
              <GradientText theme={theme}>{price}</GradientText>
            </div>
          </div>

          {caption ? (
            <div style={{ textAlign: 'center', fontSize: 40, color: theme.textMuted,
              opacity: clamp(capE, 0, 1), lineHeight: 1.3 }}>{caption}</div>
          ) : null}
        </AbsoluteFill>
      </div>
    </AbsoluteFill>
  )
}

export default OfferPrice
