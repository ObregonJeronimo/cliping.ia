import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion'
import { fitHeadline, segText, clamp } from '../theme'
import { EASE, SPRING, prog, spr, enter, entrance, stagger, floatY, camera, parallax } from '../motion'

/**
 * FeatureList — lista de features/beneficios: filas con ícono + texto que entran
 * en cascada (stagger). El beat de "todo lo que hace / por qué conviene".
 *
 * Props:
 *   theme   : objeto de theme
 *   title   : array de segmentos { t, accent } arriba — opcional
 *   items   : array de { iconSvg: {body, viewBox}|null, label: [segmentos {t,accent}] }
 *             El director pasa el CONCEPTO de ícono (en inglés) como `icon` y el
 *             backend lo resuelve a `iconSvg` vía Iconify (igual que IconTransform).
 *   variant : 'cards' (default, cada fila en su tarjeta) | 'bare' (sin tarjeta)
 */

const GradientText = ({ theme, children }) => (
  <span style={{ backgroundImage: theme.accentGrad, WebkitBackgroundClip: 'text',
    backgroundClip: 'text', color: 'transparent' }}>{children}</span>
)

const Spark = ({ color, size }) => (
  <svg width={size} height={size} viewBox="-1 -1 2 2">
    <path d="M0,-1 C0.12,-0.12 0.12,-0.12 1,0 C0.12,0.12 0.12,0.12 0,1 C-0.12,0.12 -0.12,0.12 -1,0 C-0.12,-0.12 -0.12,-0.12 0,-1 Z" fill={color} />
  </svg>
)

const Icon = ({ icon, color, size }) =>
  icon && icon.body ? (
    <svg viewBox={icon.viewBox || '0 0 24 24'} width={size} height={size}
      style={{ color }} dangerouslySetInnerHTML={{ __html: icon.body }} />
  ) : (
    <Spark color={color} size={size * 0.8} />
  )

export const FeatureList = ({ theme, title = [], items = [], variant = 'cards', durationInFrames: durProp }) => {
  const frame = useCurrentFrame()
  const vc = useVideoConfig()
  const fps = vc.fps
  const dur = durProp || vc.durationInFrames
  const m = theme.motion

  const cam = camera(theme.art, frame, dur, m.cameraDrift * 0.8)
  const pxFg = parallax(cam, 0.5)
  const glowOp = clamp(frame / 16, 0, 1)
  const cap = entrance(theme.art, frame, 0, { dur: m.enterFrames, dist: 44, ease: EASE.out })

  const rows = (items || []).slice(0, 5)
  const numbered = variant === 'numbered'
  const cards = variant === 'cards'
  const base = segText(title) ? 12 : 6

  return (
    <AbsoluteFill style={{ background: theme.bg, fontFamily: theme.font, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0,
        transform: `scale(${cam.scale}) translate(${cam.x}px, ${cam.y}px)`, transformOrigin: '50% 50%' }}>
        <div style={{ position: 'absolute', left: '50%', top: '50%', width: 1050, height: 1100,
          transform: 'translate(-50%,-50%)', opacity: glowOp,
          background: `radial-gradient(circle, ${theme.glow}, rgba(0,0,0,0) 62%)` }} />

        {segText(title) && (
          <div style={{ position: 'absolute', top: 230, width: '100%', textAlign: 'center',
            fontWeight: theme.headWeight, fontSize: fitHeadline(segText(title), 100), lineHeight: 1.08,
            letterSpacing: '-0.025em', color: theme.text, padding: '0 80px',
            transform: cap.transform, opacity: cap.opacity }}>
            {title.map((s, j) => s.accent
              ? <GradientText key={j} theme={theme}>{s.t}</GradientText>
              : <span key={j}>{s.t}</span>)}
          </div>
        )}

        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center',
          paddingTop: segText(title) ? 180 : 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 30, width: 860 }}>
            {rows.map((it, i) => {
              const e = enter(frame, base + stagger(i, 6, m.stagger + 2), { dur: m.enterFrames, dist: 70, axis: 'x', ease: EASE.out })
              const ic = spr(frame, fps, base + stagger(i, 6, m.stagger + 2) + 2, SPRING.pop, 22)
              const fl = floatY(frame - i * 12, 4, 150)
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 30,
                  transform: `${e.transform} translateY(${fl}px)`, opacity: e.opacity,
                  padding: cards ? '26px 32px' : '4px 0',
                  background: cards ? theme.pillBg : 'transparent',
                  border: cards ? `2px solid ${theme.pillBorder}` : 'none',
                  borderRadius: theme.radius * 1.3,
                  boxShadow: cards ? '0 16px 44px rgba(0,0,0,0.4)' : 'none',
                }}>
                  {numbered ? (
                    <div style={{ flexShrink: 0, width: 100, textAlign: 'center', fontSize: 80,
                      fontWeight: theme.headWeight, lineHeight: 1, letterSpacing: '-0.02em',
                      transform: `scale(${clamp(ic, 0, 1.12)})` }}>
                      <GradientText theme={theme}>{String(i + 1).padStart(2, '0')}</GradientText>
                    </div>
                  ) : (
                    <div style={{ flexShrink: 0, width: 96, height: 96, borderRadius: theme.radius,
                      transform: `scale(${clamp(ic, 0, 1.12)})`,
                      background: theme.accentGrad, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: `0 12px 34px ${theme.glow}` }}>
                      <Icon icon={it.iconSvg} color="#fff" size={54} />
                    </div>
                  )}
                  <div style={{ fontSize: fitHeadline(segText(it.label), 56, 36), fontWeight: 600,
                    lineHeight: 1.18, letterSpacing: '-0.015em', color: theme.text }}>
                    {(it.label || []).map((s, j) => s.accent
                      ? <GradientText key={j} theme={theme}>{s.t}</GradientText>
                      : <span key={j}>{s.t}</span>)}
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

export default FeatureList
