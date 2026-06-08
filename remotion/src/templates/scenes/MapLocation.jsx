import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion'
import { fitHeadline, segText, clamp } from '../theme'
import { EASE, SPRING, prog, spr, entrance, camera, floatY } from '../motion'

/**
 * MapLocation — ubicación estilizada para negocios locales. NO usa mapa real (sin API): dibuja
 * una grilla de "calles" abstracta que se revela + un pin que cae con spring + la ciudad/zona.
 * Da vibra de cercanía/local sin depender de servicios externos.
 *
 * Props:
 *   theme : objeto de theme
 *   city  : string (ej "Villa Allende")
 *   area  : string secundario (ej "Córdoba · Av. San Martín 123") — opcional
 *   label : array de segmentos { t, accent } (ej "Te esperamos") — opcional
 *   variant : 'pin' (default) | 'card'
 */

const GradientText = ({ theme, children }) => (
  <span style={{ backgroundImage: theme.accentGrad, WebkitBackgroundClip: 'text',
    backgroundClip: 'text', color: 'transparent' }}>{children}</span>
)

const Seg = ({ theme, segs }) => (segs || []).map((s, j) => s.accent
  ? <GradientText key={j} theme={theme}>{s.t}</GradientText>
  : <span key={j}>{s.t}</span>)

const Pin = ({ color, glow, size }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} style={{ filter: `drop-shadow(0 12px 24px ${glow})` }}>
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill={color} />
    <circle cx="12" cy="9" r="2.6" fill="#fff" />
  </svg>
)

const W = 1080, H = 1920

export const MapLocation = ({ theme, city = '', area = '', label = [], variant = 'pin', durationInFrames: durProp }) => {
  const frame = useCurrentFrame()
  const vc = useVideoConfig()
  const fps = vc.fps
  const dur = durProp || vc.durationInFrames
  const m = theme.motion

  const cam = camera(theme.art, frame, dur, m.cameraDrift * 0.7)
  const glowOp = clamp(frame / 16, 0, 1)
  const drop = spr(frame, fps, 8, SPRING.pop, 30)
  const dropY = (1 - clamp(drop, 0, 1)) * -130
  const fl = floatY(frame, 5, 120)
  const cityE = prog(frame, 16, 16, EASE.out)
  const lab = entrance(theme.art, frame, 22, { dur: m.enterFrames, dist: 36, ease: EASE.out })
  const gridReveal = clamp(prog(frame, 0, 26, EASE.out), 0, 1)

  const vlines = Array.from({ length: 8 }, (_, i) => (i + 1) * (W / 9))
  const hlines = Array.from({ length: 13 }, (_, i) => (i + 1) * (H / 14))

  return (
    <AbsoluteFill style={{ background: theme.bg, fontFamily: theme.font, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0,
        transform: `scale(${cam.scale}) translate(${cam.x}px, ${cam.y}px)`, transformOrigin: '50% 50%' }}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}
          style={{ position: 'absolute', inset: 0, opacity: 0.16 * gridReveal }}>
          {vlines.map((x, i) => <line key={`v${i}`} x1={x} y1="0" x2={x} y2={H} stroke={theme.text} strokeWidth="2" />)}
          {hlines.map((y, i) => <line key={`h${i}`} x1="0" y1={y} x2={W} y2={y} stroke={theme.text} strokeWidth="2" />)}
        </svg>

        <div style={{ position: 'absolute', left: '50%', top: '46%', width: 920, height: 920,
          transform: 'translate(-50%,-50%)', opacity: glowOp,
          background: `radial-gradient(circle, ${theme.glow}, rgba(0,0,0,0) 60%)` }} />

        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 22 }}>
          <div style={{ transform: `translateY(${dropY + fl}px) scale(${clamp(drop, 0, 1.1)})` }}>
            <Pin color={theme.accentFrom} glow={theme.glow} size={220} />
          </div>
          {city ? (
            <div style={{ fontSize: fitHeadline(city, 112, 60), fontWeight: theme.headWeight,
              letterSpacing: '-0.02em', color: theme.text, opacity: clamp(cityE, 0, 1),
              textAlign: 'center', padding: '0 70px' }}>
              {city}
            </div>
          ) : null}
          {area ? (
            <div style={{ fontSize: 42, color: theme.textMuted, opacity: clamp(cityE, 0, 1) * 0.9,
              textAlign: 'center', padding: '0 80px' }}>{area}</div>
          ) : null}
          {segText(label) ? (
            <div style={{ fontSize: 46, color: theme.text, opacity: lab.opacity, transform: lab.transform,
              textAlign: 'center', marginTop: 8, fontWeight: 600 }}>
              <Seg theme={theme} segs={label} />
            </div>
          ) : null}
        </AbsoluteFill>
      </div>
    </AbsoluteFill>
  )
}

export default MapLocation
