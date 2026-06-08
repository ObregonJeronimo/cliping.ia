import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion'
import { fmt } from '../layout'
import { fitHeadline, segText, clamp } from '../theme'
import { EASE, SPRING, prog, spr, enter, entrance, floatY, breathe, camera, parallax } from '../motion'
import Decor from '../Decor'

/**
 * StatReveal — un número grande que CUENTA desde 0 hasta el valor, con pop al
 * aterrizar. El beat de "dato que impacta".
 *
 * Props:
 *   theme    : objeto de theme
 *   value    : número objetivo (entero o decimal, ej 95, 4.9, 12000)
 *   prefix   : texto antes del número (ej "$", "+") — opcional
 *   suffix   : texto después (ej "%", "x", "k", "M") — opcional
 *   caption  : línea chica ARRIBA del número (string) — opcional
 *   label    : array de segmentos { t, accent } DEBAJO del número — opcional
 *   variant  : 'stack' (default) | 'ring' (anillo de progreso, ideal %) | 'left'
 */

const GradientText = ({ theme, children, style }) => (
  <span style={{
    backgroundImage: theme.accentGrad, WebkitBackgroundClip: 'text', backgroundClip: 'text',
    color: 'transparent', filter: `drop-shadow(0 0 28px ${theme.accentTo}55)`, ...style,
  }}>{children}</span>
)

// Formato determinista (no depende de locale del runtime): agrupa miles con '.'.
const fmtNum = (n, decimals) => {
  const fixed = n.toFixed(decimals)
  const [int, dec] = fixed.split('.')
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return dec ? `${grouped},${dec}` : grouped
}

export const StatReveal = ({
  theme, value = 100, prefix = '', suffix = '', caption = '', label = [],
  variant = 'stack', durationInFrames: durProp,
}) => {
  const frame = useCurrentFrame()
  const vc = useVideoConfig()
  const fps = vc.fps
  const dur = durProp || vc.durationInFrames
  const m = theme.motion
  const F = fmt(vc)

  const cam = camera(theme.art, frame, dur, m.cameraDrift)
  const pxFg = parallax(cam, 0.6)
  const glowOp = clamp(frame / 14, 0, 1) * breathe(frame, 0.05, 150)

  // Conteo: 0 -> value con expo-out (monótono, nunca se pasa del objetivo).
  const safeVal = Number.isFinite(Number(value)) ? Number(value) : 0
  const decimals = (String(safeVal).split('.')[1] || '').length
  const countP = prog(frame, 10, Math.round(dur * 0.55), EASE.out)
  const shown = fmtNum(safeVal * countP, decimals)

  // Pop del número al entrar + micro-rebote cuando termina de contar.
  const pop = spr(frame, fps, 8, SPRING.pop, 26)
  const landed = countP >= 0.999
  const landPulse = landed ? 1 + 0.04 * Math.sin((frame) / 6) : 1
  const fl = floatY(frame, 6, 140)

  const left = variant === 'left'
  const ring = variant === 'ring'
  // Caption en mayúscula inicial (se veía en minúscula -> poco prolijo).
  const capTxt = caption ? caption.charAt(0).toUpperCase() + caption.slice(1) : ''

  // El número se achica si tiene muchos dígitos para no cortarse en pantalla. Se dimensiona
  // por el valor FINAL (no por lo que se muestra mientras cuenta) -> no cambia de tamaño.
  const numStr = fmtNum(safeVal, decimals)
  const approxChars = numStr.length + (prefix ? 0.5 : 0) + (suffix ? suffix.length * 0.5 : 0)
  const numSize = Math.min(ring ? 230 : 380, Math.round((ring ? 560 : 1040) / Math.max(1, approxChars * 0.58)))

  // Anillo de progreso (se dibuja al ritmo del conteo).
  const R = 360
  const C = 2 * Math.PI * R
  const capE = entrance(theme.art, frame, 2, { dur: m.enterFrames, dist: 30, ease: EASE.out })
  const labE = entrance(theme.art, frame, Math.round(dur * 0.4), { dur: m.enterFrames, dist: 34, ease: EASE.out })

  return (
    <AbsoluteFill style={{ background: theme.bg, fontFamily: theme.font, overflow: 'hidden' }}>
      <Decor kind={(theme.art || {}).decor} theme={theme} frame={frame} fps={fps} cam={cam} />
      <div style={{ position: 'absolute', inset: 0,
        transform: `scale(${cam.scale}) translate(${cam.x}px, ${cam.y}px)`, transformOrigin: '50% 46%' }}>
        <div style={{ position: 'absolute', left: '50%', top: '44%', width: 1000, height: 1000,
          transform: 'translate(-50%,-50%)', opacity: glowOp,
          background: `radial-gradient(circle, ${theme.glow}, rgba(0,0,0,0) 60%)` }} />

        <AbsoluteFill style={{
          alignItems: left ? 'flex-start' : 'center', justifyContent: 'center',
          padding: left ? '0 0 0 96px' : 0, textAlign: left ? 'left' : 'center',
        }}>
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column',
            alignItems: left ? 'flex-start' : 'center', justifyContent: 'center',
            transform: `scale(${F.uiScale})`,
            width: ring ? 820 : 'auto', height: ring ? 820 : 'auto' }}>
            {ring && (
              <svg width={820} height={820} viewBox="0 0 820 820"
                style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%) rotate(-90deg)' }}>
                <circle cx={410} cy={410} r={R} fill="none" stroke={theme.pillBorder} strokeWidth={20} opacity={0.5} />
                <circle cx={410} cy={410} r={R} fill="none" stroke={theme.accentFrom} strokeWidth={20} strokeLinecap="round"
                  pathLength={1} strokeDasharray={1} strokeDashoffset={1 - countP}
                  style={{ filter: `drop-shadow(0 0 18px ${theme.accentTo}aa)` }} />
              </svg>
            )}
            {capTxt && (
              <div style={{ transform: capE.transform, opacity: capE.opacity, marginBottom: 8,
                color: theme.textMuted, fontSize: ring ? 34 : 44, fontWeight: 600, letterSpacing: '-0.01em',
                maxWidth: ring ? 520 : 900, padding: ring ? '0 20px' : 0 }}>
                {capTxt}
              </div>
            )}

            {/* Número */}
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              transform: `translateY(${fl}px) scale(${clamp(pop, 0, 1.15) * landPulse})` }}>
              <div style={{ display: 'flex', alignItems: 'baseline', fontWeight: theme.headWeight,
                fontSize: numSize, lineHeight: 1, letterSpacing: '-0.04em' }}>
                {prefix && <span style={{ fontSize: '0.42em', color: theme.text, opacity: 0.85, marginRight: 6 }}>{prefix}</span>}
                <GradientText theme={theme}>{shown}</GradientText>
                {suffix && <GradientText theme={theme} style={{ fontSize: '0.5em' }}>{suffix}</GradientText>}
              </div>
            </div>

            {segText(label) && (
              <div style={{ marginTop: ring ? 18 : 24, transform: labE.transform, opacity: labE.opacity,
                fontWeight: theme.headWeight, fontSize: ring ? Math.min(56, fitHeadline(segText(label), 56, 36)) : fitHeadline(segText(label), 78, 46),
                lineHeight: 1.1, letterSpacing: '-0.02em', color: theme.text,
                maxWidth: ring ? 500 : 920, padding: left ? '0 60px 0 0' : ring ? '0 24px' : '0 80px' }}>
                {label.map((s, j) => s.accent
                  ? <GradientText key={j} theme={theme}>{s.t}</GradientText>
                  : <span key={j}>{s.t}</span>)}
              </div>
            )}
          </div>
        </AbsoluteFill>
      </div>
    </AbsoluteFill>
  )
}

export default StatReveal
