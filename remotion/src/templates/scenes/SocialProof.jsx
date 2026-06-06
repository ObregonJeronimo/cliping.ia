import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion'
import { fitHeadline, segText, clamp } from '../theme'
import { EASE, SPRING, prog, spr, enter, entrance, stagger, floatY, breathe, camera, parallax } from '../motion'

/**
 * SocialProof — "lo usan X / confían en nosotros": avatares en arco que aparecen
 * con stagger y flotan. El beat de "no estás solo, ya lo eligieron otros".
 *
 * Props:
 *   theme   : objeto de theme
 *   title   : array de segmentos { t, accent } (ej "+500 equipos ya lo usan")
 *   subtitle: línea chica abajo (string) — opcional
 *   colors  : array de hex para teñir los avatares — opcional
 *   count   : cuántos avatares mostrar (3-7) — opcional, default según colors o 6
 *   variant : 'arc' (default) | 'row'
 */

const GradientText = ({ theme, children }) => (
  <span style={{ backgroundImage: theme.accentGrad, WebkitBackgroundClip: 'text',
    backgroundClip: 'text', color: 'transparent' }}>{children}</span>
)

const DEFAULT_COLORS = ['#a855f7', '#36c5e0', '#e8b04b', '#25d366', '#e0489f', '#5865f2', '#ff7a59']

// Silueta abstracta de persona (universal, sin IP).
const Bust = ({ size = 56 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#ffffffea">
    <circle cx="12" cy="8.4" r="4.1" />
    <path d="M4 20.5c0-4.2 3.6-6.6 8-6.6s8 2.4 8 6.6z" />
  </svg>
)

export const SocialProof = ({
  theme, title = [], subtitle = '', colors = DEFAULT_COLORS, count, variant = 'arc', durationInFrames: durProp,
}) => {
  const frame = useCurrentFrame()
  const vc = useVideoConfig()
  const fps = vc.fps
  const dur = durProp || vc.durationInFrames
  const m = theme.motion

  const cam = camera(theme.art, frame, dur, m.cameraDrift)
  const pxFg = parallax(cam, 0.6)
  const glowOp = clamp(frame / 16, 0, 1) * breathe(frame, 0.05, 150)

  const n = clamp(count || colors.length || 6, 3, 7)
  const palette = Array.from({ length: n }, (_, i) => colors[i % colors.length])

  const titleE = entrance(theme.art, frame, Math.round(dur * 0.3), { dur: m.enterFrames, dist: 44, ease: EASE.out })
  const subE = entrance(theme.art, frame, Math.round(dur * 0.42), { dur: m.enterFrames, dist: 26, ease: EASE.out })

  const arc = variant === 'arc'
  const CX = 540
  const CY = arc ? 760 : 720
  const R = 300
  const SIZE = 150

  // Posiciones: en arco (semicírculo superior) o en fila.
  const positions = Array.from({ length: n }, (_, i) => {
    const t = n === 1 ? 0.5 : i / (n - 1)
    if (arc) {
      const a = Math.PI * (1 - t) // 180° -> 0°
      return { x: CX + Math.cos(a) * R, y: CY - Math.sin(a) * (R * 0.62) }
    }
    const span = (n - 1) * (SIZE + 28)
    return { x: CX - span / 2 + i * (SIZE + 28), y: CY }
  })

  // Línea-arco punteada de fondo que se dibuja (solo en variante arc).
  const draw = prog(frame, 8, 30, EASE.inOut)

  return (
    <AbsoluteFill style={{ background: theme.bg, fontFamily: theme.font, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0,
        transform: `scale(${cam.scale}) translate(${cam.x}px, ${cam.y}px)`, transformOrigin: '50% 42%' }}>
        <div style={{ position: 'absolute', left: '50%', top: '40%', width: 1050, height: 950,
          transform: 'translate(-50%,-50%)', opacity: glowOp,
          background: `radial-gradient(circle, ${theme.glow}, rgba(0,0,0,0) 60%)` }} />

        {arc && (
          <svg width="1080" height="1920" viewBox="0 0 1080 1920" style={{ position: 'absolute', inset: 0 }}>
            <path d={`M ${CX - R} ${CY} A ${R} ${R * 0.62} 0 0 1 ${CX + R} ${CY}`}
              fill="none" stroke={theme.accentFrom} strokeWidth="3" strokeDasharray="6 16"
              strokeLinecap="round" opacity={0.4 * draw} />
          </svg>
        )}

        {/* avatares */}
        {positions.map((p, i) => {
          const e = spr(frame, fps, stagger(i, 8, m.stagger + 1), SPRING.bouncy, 22)
          const fl = floatY(frame - i * 9, 8, 120 + i * 6)
          const big = i === Math.floor(n / 2)
          const sz = big ? SIZE * 1.18 : SIZE
          return (
            <div key={i} style={{ position: 'absolute', left: p.x, top: p.y,
              transform: `translate(-50%,-50%) translate(${pxFg.x}px, ${pxFg.y + fl}px) scale(${clamp(e, 0, 1.1)})`,
              opacity: clamp(e, 0, 1), zIndex: big ? 2 : 1,
              width: sz, height: sz, borderRadius: '50%',
              background: `linear-gradient(160deg, ${palette[i]}, ${palette[i]}aa)`,
              border: `4px solid ${theme.bgSolid}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: big ? `0 18px 50px ${theme.glow}` : '0 14px 36px rgba(0,0,0,0.45)' }}>
              <Bust size={sz * 0.5} />
            </div>
          )
        })}

        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 360 }}>
          <div style={{ textAlign: 'center', fontWeight: theme.headWeight,
            fontSize: fitHeadline(segText(title), 100), lineHeight: 1.08, letterSpacing: '-0.025em',
            color: theme.text, padding: '0 80px', transform: titleE.transform, opacity: titleE.opacity }}>
            {title.map((s, j) => s.accent
              ? <GradientText key={j} theme={theme}>{s.t}</GradientText>
              : <span key={j}>{s.t}</span>)}
          </div>
          {subtitle && (
            <div style={{ marginTop: 24, color: theme.textMuted, fontSize: 44, fontWeight: 400,
              transform: subE.transform, opacity: subE.opacity }}>{subtitle}</div>
          )}
        </AbsoluteFill>
      </div>
    </AbsoluteFill>
  )
}

export default SocialProof
