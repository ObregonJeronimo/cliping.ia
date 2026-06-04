import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring } from 'remotion'
import { easeOut, clamp, fitHeadline, segText } from '../theme'

/**
 * IconTransform — beat de transformación genérico.
 *
 * Ícono A hace un "click"/apretón, colapsa con un estallido (flash + anillo +
 * partículas) y de ahí brota el ícono B con rebote. Sirve para CUALQUIER par
 * de íconos: el director elige los conceptos según la página (carrito->plata,
 * candado->check, semilla->planta, etc.). NADA hardcodeado.
 *
 * Props:
 *   theme    : objeto de theme
 *   iconFrom : { body, viewBox } (SVG de Iconify) — opcional, fallback a sparkle
 *   iconTo   : { body, viewBox } — opcional
 *   label    : array de segmentos { t, accent } bajo la transformación (opcional)
 */

const Sparkle = ({ color, size }) => (
  <svg width={size} height={size} viewBox="-1 -1 2 2">
    <path d="M0,-1 C0.12,-0.12 0.12,-0.12 1,0 C0.12,0.12 0.12,0.12 0,1 C-0.12,0.12 -0.12,0.12 -1,0 C-0.12,-0.12 -0.12,-0.12 0,-1 Z" fill={color} />
  </svg>
)

const Icon = ({ icon, color, size }) =>
  icon && icon.body ? (
    <svg viewBox={icon.viewBox || '0 0 24 24'} width={size} height={size}
      style={{ color }} dangerouslySetInnerHTML={{ __html: icon.body }} />
  ) : (
    <Sparkle color={color} size={size * 0.8} />
  )

export const IconTransform = ({ theme, iconFromSvg = null, iconToSvg = null, label = [], durationInFrames: durProp }) => {
  const frame = useCurrentFrame()
  const vc = useVideoConfig()
  const fps = vc.fps
  const d = durProp || vc.durationInFrames
  const f = frame
  const pr = (a, b) => clamp((f - a * d) / ((b - a) * d), 0, 1)

  const enterA = spring({ frame, fps, config: { damping: 13 }, durationInFrames: 18 })
  const squash = Math.sin(pr(0.16, 0.30) * Math.PI) * 0.16
  const collapseA = pr(0.30, 0.42)
  const aScale = enterA * (1 - collapseA)

  const ring1 = pr(0.16, 0.40)
  const flash = Math.sin(pr(0.30, 0.52) * Math.PI)
  const ring2 = pr(0.32, 0.64)
  const burstP = pr(0.32, 0.66)

  const bSpring = spring({ frame: frame - Math.round(0.42 * d), fps, config: { damping: 10 }, durationInFrames: 26 })
  const bOp = pr(0.42, 0.52)
  const spk = pr(0.52, 0.72)
  const labText = segText(label)
  const labUp = (1 - easeOut(pr(0.56, 0.74))) * 40
  const labOp = pr(0.56, 0.74)

  const glowOp = clamp(frame / 14, 0, 1)
  const aColor = theme.accentFrom
  const bColor = theme.accentTo
  const CX = 540, CY = 820

  const particles = Array.from({ length: 10 }, (_, i) => {
    const ang = (i * 36 * Math.PI) / 180
    const r = 30 + burstP * 150
    return { x: CX + r * Math.cos(ang), y: CY + r * Math.sin(ang), c: i % 2 ? theme.accentFrom : theme.accentTo, s: i % 2 ? 7 : 11 }
  })

  return (
    <AbsoluteFill style={{ background: theme.bg, fontFamily: theme.font, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: '50%', top: CY, width: 900, height: 900,
        transform: 'translate(-50%,-50%)', opacity: glowOp,
        background: `radial-gradient(circle, ${theme.glow}, rgba(0,0,0,0) 60%)` }} />

      {/* anillos */}
      <svg width="1080" height="1920" viewBox="0 0 1080 1920" style={{ position: 'absolute', inset: 0 }}>
        {ring1 > 0 && ring1 < 1 &&
          <circle cx={CX} cy={CY} r={60 + ring1 * 130} fill="none" stroke={theme.accentTo} strokeWidth="4" opacity={(1 - ring1) * 0.6} />}
        {ring2 > 0 && ring2 < 1 &&
          <circle cx={CX} cy={CY} r={30 + ring2 * 210} fill="none" stroke={theme.accentFrom} strokeWidth="4" opacity={(1 - ring2) * 0.5} />}
        {burstP > 0 && burstP < 1 && particles.map((p, i) =>
          <circle key={i} cx={p.x} cy={p.y} r={p.s} fill={p.c} opacity={(1 - burstP)} />)}
      </svg>

      {/* flash central */}
      {flash > 0.01 && (
        <div style={{ position: 'absolute', left: CX, top: CY, width: 240, height: 240, borderRadius: '50%',
          transform: 'translate(-50%,-50%)', opacity: flash,
          background: `radial-gradient(circle, #ffffff, ${theme.accentTo} 55%, rgba(0,0,0,0) 72%)` }} />
      )}

      {/* íconos: comparten EXACTAMENTE la misma caja centrada -> quedan alineados */}
      <div style={{ position: 'absolute', left: CX, top: CY, width: 300, height: 300, transform: 'translate(-50%,-50%)' }}>
        {aScale > 0.01 && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            transform: `scale(${aScale}) scaleY(${1 - squash})`,
            filter: `drop-shadow(0 0 26px ${aColor}88)` }}>
            <Icon icon={iconFromSvg} color={aColor} size={260} />
          </div>
        )}
        {bOp > 0.01 && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            transform: `scale(${bSpring})`, opacity: bOp,
            filter: `drop-shadow(0 0 34px ${bColor}aa)` }}>
            <Icon icon={iconToSvg} color={bColor} size={260} />
          </div>
        )}
      </div>

      {/* sparkles del revelado */}
      {spk > 0.01 && (
        <svg width="1080" height="1920" viewBox="0 0 1080 1920" style={{ position: 'absolute', inset: 0 }}>
          {[[CX - 200, CY - 150, 34], [CX + 210, CY - 120, 26], [CX + 180, CY + 170, 20]].map(([x, y, s], i) => (
            <g key={i} transform={`translate(${x},${y}) scale(${s * spk})`} opacity={spk}>
              <path d="M0,-1 C0.12,-0.12 0.12,-0.12 1,0 C0.12,0.12 0.12,0.12 0,1 C-0.12,0.12 -0.12,0.12 -1,0 C-0.12,-0.12 -0.12,-0.12 0,-1 Z" fill={theme.accentTo} />
            </g>
          ))}
        </svg>
      )}

      {/* label */}
      {labText && (
        <div style={{ position: 'absolute', top: 1180, width: '100%', textAlign: 'center',
          fontWeight: theme.headWeight, fontSize: fitHeadline(labText, 96), lineHeight: 1.08, letterSpacing: '-0.025em',
          color: theme.text, padding: '0 80px', transform: `translateY(${labUp}px)`, opacity: labOp }}>
          {label.map((s, j) => s.accent
            ? <span key={j} style={{ backgroundImage: theme.accentGrad, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>{s.t}</span>
            : <span key={j}>{s.t}</span>)}
        </div>
      )}
    </AbsoluteFill>
  )
}

export default IconTransform
