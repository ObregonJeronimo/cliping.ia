import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion'
import { fitHeadline, segText, clamp } from '../theme'
import { EASE, SPRING, prog, spr, enter, entrance, stagger, floatY, camera, parallax } from '../motion'

/**
 * Comparison — antes vs después / "sin esto" vs "con esto".
 * Dos paneles: el izquierdo (negativo, apagado, ✕) entra desde la izquierda; el
 * derecho (positivo, con acento, ✓) entra desde la derecha. En el medio late un
 * conector ("VS" o flecha).
 *
 * Props:
 *   theme       : objeto de theme
 *   title       : array de segmentos { t, accent } arriba — opcional
 *   leftLabel   : array de segmentos (ej "Antes", "Sin Cliping")
 *   rightLabel  : array de segmentos (ej "Después", "Con Cliping")
 *   leftItems   : array de strings (puntos negativos)
 *   rightItems  : array de strings (puntos positivos)
 *   connector   : 'vs' (default) | 'arrow'
 *   variant     : 'sideBySide' (default) | 'stacked'
 */

const GradientText = ({ theme, children }) => (
  <span style={{ backgroundImage: theme.accentGrad, WebkitBackgroundClip: 'text',
    backgroundClip: 'text', color: 'transparent' }}>{children}</span>
)

const Cross = ({ size = 34 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="#ff6b6b" strokeWidth="3.4" strokeLinecap="round">
    <path d="M6 6 L18 18 M18 6 L6 18" />
  </svg>
)

const Check = ({ color, size = 34, draw = 1 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.5 12.5 L10 18 L20 6" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
  </svg>
)

const Panel = ({ theme, frame, fps, side, accent, label, items, fromX, baseDelay, m }) => {
  const e = enter(frame, baseDelay, { dur: m.enterFrames, dist: fromX, axis: 'x', ease: EASE.out })
  const fl = floatY(frame - (side === 'left' ? 0 : 10), 6, 150)
  return (
    <div style={{
      position: 'relative', width: 440, padding: '40px 36px',
      transform: `${e.transform} translateY(${fl}px)`, opacity: e.opacity,
      background: accent ? `linear-gradient(160deg, ${theme.pillBg}, ${theme.bgSolid})` : theme.pillBg,
      border: `2px solid ${accent ? theme.accentFrom : theme.pillBorder}`, borderRadius: theme.radius * 1.4,
      boxShadow: accent ? `0 30px 80px ${theme.glow}` : '0 20px 50px rgba(0,0,0,0.4)',
    }}>
      <div style={{ fontSize: 46, fontWeight: theme.headWeight, letterSpacing: '-0.02em',
        color: accent ? theme.text : theme.textMuted, marginBottom: 26 }}>
        {(label || []).map((s, j) => s.accent
          ? <GradientText key={j} theme={theme}>{s.t}</GradientText>
          : <span key={j}>{s.t}</span>)}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        {(items || []).map((it, i) => {
          const ie = spr(frame, fps, baseDelay + stagger(i, 10, m.stagger + 1), SPRING.gentle, 20)
          const drawC = prog(frame, baseDelay + stagger(i, 10, m.stagger + 1) + 4, 14, EASE.out)
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 16,
              transform: `translateX(${(1 - clamp(ie, 0, 1)) * (side === 'left' ? -20 : 20)}px)`, opacity: clamp(ie, 0, 1) }}>
              <div style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: accent ? `${theme.accentFrom}22` : '#ff6b6b1f' }}>
                {accent ? <Check color={theme.accentTo} draw={drawC} /> : <Cross />}
              </div>
              <div style={{ fontSize: 36, lineHeight: 1.25, fontWeight: 400,
                color: accent ? theme.text : theme.textMuted, opacity: accent ? 1 : 0.82, paddingTop: 3 }}>
                {it}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Variante 'split': media pantalla por lado, a sangre, sin tarjetas flotantes.
const SplitHalf = ({ theme, frame, fps, accent, label, items, side, m }) => {
  const e = enter(frame, side === 'left' ? 6 : 12, { dur: m.enterFrames, dist: side === 'left' ? -80 : 80, axis: 'x', ease: EASE.out })
  const base = side === 'left' ? 6 : 12
  return (
    <div style={{
      position: 'relative', flex: 1, height: '100%', overflow: 'hidden',
      display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 26, padding: '0 70px',
      transform: e.transform, opacity: e.opacity,
      background: accent
        ? `linear-gradient(180deg, ${theme.pillBg}, ${theme.bgSolid})`
        : 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.28))',
    }}>
      <div style={{ fontSize: 52, fontWeight: theme.headWeight, letterSpacing: '-0.02em', marginBottom: 8,
        color: accent ? theme.text : theme.textMuted }}>
        {(label || []).map((s, j) => s.accent
          ? <GradientText key={j} theme={theme}>{s.t}</GradientText>
          : <span key={j}>{s.t}</span>)}
      </div>
      {(items || []).map((it, i) => {
        const ie = spr(frame, fps, base + stagger(i, 10, m.stagger + 1), SPRING.gentle, 20)
        const drawC = prog(frame, base + stagger(i, 10, m.stagger + 1) + 4, 14, EASE.out)
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 16, opacity: clamp(ie, 0, 1),
            transform: `translateY(${(1 - clamp(ie, 0, 1)) * 14}px)` }}>
            <div style={{ flexShrink: 0, width: 42, height: 42, borderRadius: 12, display: 'flex',
              alignItems: 'center', justifyContent: 'center', background: accent ? `${theme.accentFrom}22` : '#ff6b6b1f' }}>
              {accent ? <Check color={theme.accentTo} draw={drawC} /> : <Cross />}
            </div>
            <div style={{ fontSize: 38, lineHeight: 1.25, color: accent ? theme.text : theme.textMuted,
              opacity: accent ? 1 : 0.82, paddingTop: 2 }}>{it}</div>
          </div>
        )
      })}
    </div>
  )
}

export const Comparison = ({
  theme, title = [], leftLabel = [{ t: 'Antes' }], rightLabel = [{ t: 'Después', accent: true }],
  leftItems = [], rightItems = [], connector = 'vs', variant = 'sideBySide', durationInFrames: durProp,
}) => {
  const frame = useCurrentFrame()
  const vc = useVideoConfig()
  const fps = vc.fps
  const dur = durProp || vc.durationInFrames
  const m = theme.motion

  const cam = camera(theme.art, frame, dur, m.cameraDrift * 0.8)
  const glowOp = clamp(frame / 16, 0, 1)
  const cap = entrance(theme.art, frame, 0, { dur: m.enterFrames, dist: 44, ease: EASE.out })

  const conn = spr(frame, fps, 18, SPRING.pop, 24)
  const connPulse = 1 + 0.06 * Math.sin(frame / 10)
  const stacked = variant === 'stacked'

  return (
    <AbsoluteFill style={{ background: theme.bg, fontFamily: theme.font, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0,
        transform: `scale(${cam.scale}) translate(${cam.x}px, ${cam.y}px)`, transformOrigin: '50% 52%' }}>
        <div style={{ position: 'absolute', left: '50%', top: '52%', width: 1100, height: 1000,
          transform: 'translate(-50%,-50%)', opacity: glowOp,
          background: `radial-gradient(circle, ${theme.glow}, rgba(0,0,0,0) 62%)` }} />

        {segText(title) && (
          <div style={{ position: 'absolute', top: 220, width: '100%', textAlign: 'center',
            fontWeight: theme.headWeight, fontSize: fitHeadline(segText(title), 96), lineHeight: 1.08,
            letterSpacing: '-0.025em', color: theme.text, padding: '0 80px',
            transform: cap.transform, opacity: cap.opacity }}>
            {title.map((s, j) => s.accent
              ? <GradientText key={j} theme={theme}>{s.t}</GradientText>
              : <span key={j}>{s.t}</span>)}
          </div>
        )}

        {variant === 'split' ? (
          <AbsoluteFill style={{ flexDirection: 'row', paddingTop: segText(title) ? 300 : 0 }}>
            <SplitHalf theme={theme} frame={frame} fps={fps} accent={false} label={leftLabel} items={leftItems} side="left" m={m} />
            <SplitHalf theme={theme} frame={frame} fps={fps} accent label={rightLabel} items={rightItems} side="right" m={m} />
            <div style={{ position: 'absolute', left: '50%', top: '58%',
              transform: `translate(-50%,-50%) scale(${clamp(conn, 0, 1.1) * connPulse})`, opacity: clamp(conn, 0, 1),
              width: 104, height: 104, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: theme.accentGrad, boxShadow: `0 0 50px ${theme.glow}`, color: '#fff',
              fontSize: connector === 'vs' ? 40 : 52, fontWeight: 700 }}>
              {connector === 'vs' ? 'VS' : '→'}
            </div>
          </AbsoluteFill>
        ) : (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', paddingTop: segText(title) ? 140 : 0 }}>
          <div style={{ display: 'flex', flexDirection: stacked ? 'column' : 'row',
            alignItems: 'center', justifyContent: 'center', gap: stacked ? 28 : 40 }}>
            <Panel theme={theme} frame={frame} fps={fps} side="left" accent={false}
              label={leftLabel} items={leftItems} fromX={stacked ? -10 : -90} baseDelay={6} m={m} />

            <div style={{ flexShrink: 0, transform: `scale(${clamp(conn, 0, 1.1) * connPulse})`, opacity: clamp(conn, 0, 1),
              width: 96, height: 96, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: theme.accentGrad, boxShadow: `0 0 50px ${theme.glow}`, color: '#fff',
              fontSize: connector === 'vs' ? 38 : 50, fontWeight: 700 }}>
              {connector === 'vs' ? 'VS' : (stacked ? '↓' : '→')}
            </div>

            <Panel theme={theme} frame={frame} fps={fps} side="right" accent
              label={rightLabel} items={rightItems} fromX={stacked ? 10 : 90} baseDelay={12} m={m} />
          </div>
        </AbsoluteFill>
        )}
      </div>
    </AbsoluteFill>
  )
}

export default Comparison
