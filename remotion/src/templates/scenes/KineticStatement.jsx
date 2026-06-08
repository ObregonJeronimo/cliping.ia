import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion'
import { fitHeadline, segText, clamp } from '../theme'
import { EASE, SPRING, prog, spr, enter, entrance, stagger, floatY, camera, parallax } from '../motion'
import { fmt } from '../layout'
import Decor from '../Decor'

/**
 * KineticStatement — texto cinético al estilo del explainer de SaaS.
 * Movimiento vía motion.js (easings premium, springs con overshoot, parallax, cámara).
 */

const GradientText = ({ theme, children }) => (
  <span style={{
    backgroundImage: theme.accentGrad, WebkitBackgroundClip: 'text', backgroundClip: 'text',
    color: 'transparent', filter: `drop-shadow(0 0 24px ${theme.accentTo}55)`,
  }}>{children}</span>
)

const Sparkle = ({ theme, frame, fps, delay = 0 }) => {
  const s = spr(frame, fps, delay, SPRING.pop, 24)
  const rot = prog(frame, delay, 30, EASE.out) * 45
  const op = clamp((frame - delay) / 8, 0, 1)
  return (
    <svg width={66} height={66} viewBox="-1 -1 2 2"
      style={{ opacity: op, transform: `scale(${s}) rotate(${rot}deg)`,
        filter: `drop-shadow(0 0 16px ${theme.accentTo}b0)` }}>
      <defs>
        <linearGradient id="spk" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={theme.accentFrom} /><stop offset="1" stopColor={theme.accentTo} />
        </linearGradient>
      </defs>
      <path d="M0,-1 C0.12,-0.12 0.12,-0.12 1,0 C0.12,0.12 0.12,0.12 0,1 C-0.12,0.12 -0.12,0.12 -1,0 C-0.12,-0.12 -0.12,-0.12 0,-1 Z" fill="url(#spk)" />
    </svg>
  )
}

const Pill = ({ theme, frame, fps, x, y, rot, delay, accent, blur, opacity = 1, px }) => {
  const e = spr(frame, fps, delay, SPRING.bouncy, 22)
  const fl = floatY(frame - delay, 8, 132)
  return (
    <div style={{
      position: 'absolute', left: x, top: y,
      transform: `translate(${px.x}px, ${px.y + fl}px) rotate(${rot}deg) scale(${e})`,
      opacity: clamp(e, 0, 1) * opacity, filter: blur ? `blur(${blur}px)` : 'none',
      height: 60, borderRadius: 30, display: 'flex', alignItems: 'center', gap: 14, padding: '0 26px',
      background: accent ? theme.accentGrad : theme.pillBg,
      border: accent ? 'none' : `2px solid ${theme.pillBorder}`, boxShadow: '0 18px 50px rgba(0,0,0,0.4)',
    }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', background: accent ? '#ffffffe6' : theme.accentTo }} />
      <div style={{ width: 80, height: 16, borderRadius: 8, background: accent ? '#ffffffcc' : '#ffffff2e' }} />
    </div>
  )
}

const Arcs = ({ theme, frame, px }) => {
  const draw = prog(frame, 0, 44, EASE.inOut)
  return (
    <svg width="1080" height="1920" viewBox="0 0 1080 1920"
      style={{ position: 'absolute', inset: 0, opacity: 0.35, transform: `translate(${px.x}px, ${px.y}px)` }}>
      <path d="M-60 1280 C 320 1120, 780 1200, 1160 940" stroke={theme.accentFrom}
        strokeWidth="3" fill="none" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
      <path d="M-60 760 C 360 600, 760 720, 1160 500" stroke={theme.accentTo}
        strokeWidth="2.4" fill="none" opacity="0.7" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
    </svg>
  )
}

const Caret = ({ theme, frame, solid }) => {
  const on = solid ? true : Math.floor(frame / 15) % 2 === 0
  return <span style={{ display: 'inline-block', width: '0.06em', height: '0.92em', verticalAlign: '-0.12em',
    marginLeft: '0.04em', background: theme.accentTo, opacity: on ? 1 : 0, borderRadius: 2,
    boxShadow: `0 0 18px ${theme.accentTo}` }} />
}

// Texto que aparece "tipeado" (carácter por carácter) con cursor. Respeta acentos por segmento.
const TypewriterLines = ({ theme, lines, frame, dur = 100 }) => {
  const START = 8
  const ranges = []
  let acc = 0
  lines.forEach(segs => { const len = segs.reduce((b, s) => b + s.t.length, 0); ranges.push([acc, acc + len]); acc += len })
  const total = acc || 1
  // Velocidad adaptativa: termina de tipear ~al 55% de la escena (deja tiempo para LEER),
  // pero a ritmo humano (entre ~0.5 y ~1.1 chars/frame, o sea ~15-33 chars/seg).
  const typeWindow = Math.max(12, dur * 0.55 - START)
  const CPS = clamp(total / typeWindow, 0.5, 1.1)
  const revealed = Math.max(0, Math.floor((frame - START) * CPS))
  const done = revealed >= total
  return lines.map((segs, i) => {
    let off = ranges[i][0]
    const cursorHere = done ? i === lines.length - 1 : revealed >= ranges[i][0] && revealed < ranges[i][1]
    return (
      <div key={i}>
        {segs.map((s, j) => {
          const segStart = off; off += s.t.length
          const show = clamp(revealed - segStart, 0, s.t.length)
          const sub = s.t.slice(0, show)
          if (!sub) return null
          return s.accent ? <GradientText key={j} theme={theme}>{sub}</GradientText> : <span key={j}>{sub}</span>
        })}
        {cursorHere && <Caret theme={theme} frame={frame} solid={!done} />}
      </div>
    )
  })
}

export const KineticStatement = ({ theme, lines = [], subtitle = '', variant = 'center', reveal = 'none', durationInFrames: durProp }) => {
  const frame = useCurrentFrame()
  const vc = useVideoConfig()
  const fps = vc.fps
  const dur = durProp || vc.durationInFrames
  const m = theme.motion
  const leftish = variant === 'left' || variant === 'bar'
  const F = fmt(vc)

  const cam = camera(theme.art, frame, dur, m.cameraDrift)
  const pxBg = parallax(cam, 0.3)
  const pxFg = parallax(cam, 0.7)
  const glowOp = clamp(frame / 14, 0, 1)

  return (
    <AbsoluteFill style={{ background: theme.bg, fontFamily: theme.font, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0,
        transform: `scale(${cam.scale}) translate(${cam.x}px, ${cam.y}px)`, transformOrigin: '50% 42%' }}>
        <Decor kind={(theme.art || {}).decor} theme={theme} frame={frame} fps={fps} cam={cam} />

        <div style={{ position: 'absolute', left: '50%', top: '34%', width: 1100, height: 1100,
          transform: 'translate(-50%,-50%)', opacity: glowOp,
          background: `radial-gradient(circle, ${theme.glow}, rgba(0,0,0,0) 62%)` }} />

        <AbsoluteFill style={{ alignItems: leftish ? 'flex-start' : 'center',
          justifyContent: 'center', padding: leftish ? '0 0 0 90px' : 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%',
            alignItems: leftish ? 'flex-start' : 'center', transform: `scale(${F.uiScale})` }}>
          <div style={{ display: 'flex', alignItems: 'stretch', gap: 36 }}>
            {variant === 'bar' && (
              <div style={{ flexShrink: 0, width: 12, borderRadius: 6, alignSelf: 'stretch',
                background: theme.accentGrad, boxShadow: `0 0 34px ${theme.glow}`,
                opacity: clamp(frame / 12, 0, 1), transform: `scaleY(${clamp(frame / 12, 0, 1)})`, transformOrigin: 'top' }} />
            )}
            <div style={{ textAlign: leftish ? 'left' : 'center', fontWeight: theme.headWeight, fontSize: fitHeadline(lines.map(segText).join(' ')),
              lineHeight: 1.08, letterSpacing: '-0.025em', color: theme.text, maxWidth: 940, padding: leftish ? '0 60px 0 0' : '0 70px', textWrap: 'balance' }}>
              {reveal === 'type'
                ? <TypewriterLines theme={theme} lines={lines} frame={frame} dur={dur} />
                : (() => {
                let wi = 0  // índice global de palabra -> stagger tipo "caption kinético"
                return lines.map((segs, i) => (
                  <div key={i}>
                    {segs.map((s, j) => s.t.split(' ').map((w, k) => {
                      if (w === '') return null
                      const delay = 6 + wi * 3
                      wi++
                      const p = prog(frame, delay, m.enterFrames, EASE.back)
                      const op = clamp((frame - delay) / Math.max(1, m.enterFrames * 0.6), 0, 1)
                      // La palabra de ACENTO pega un "pop" de escala justo al aterrizar -> el ojo
                      // va directo al mensaje (clave en consumo mudo / scroll rápido).
                      const land = delay + m.enterFrames
                      const t = frame - land
                      const pop = (s.accent && t >= 0 && t <= 12) ? Math.sin((t / 12) * Math.PI) : 0
                      const sc = 1 + 0.16 * pop
                      const st = { display: 'inline-block', marginRight: '0.26em',
                        transform: `translateY(${(1 - p) * 42}px) scale(${sc})`, opacity: op,
                        transformOrigin: 'center bottom' }
                      return s.accent
                        ? <span key={`${j}-${k}`} style={st}><GradientText theme={theme}>{w}</GradientText></span>
                        : <span key={`${j}-${k}`} style={st}>{w}</span>
                    }))}
                  </div>
                ))
              })()}
            </div>
          </div>

          {subtitle && (() => {
            const e = entrance(theme.art, frame, 8 + lines.length * m.stagger * 2 + 6, { dur: m.enterFrames, dist: 30, ease: EASE.out })
            return (
              <div style={{ marginTop: 40, transform: e.transform, opacity: e.opacity,
                color: theme.textMuted, fontSize: 46, fontWeight: 400, maxWidth: 880,
                textAlign: leftish ? 'left' : 'center', lineHeight: 1.3, padding: '0 80px', textWrap: 'balance' }}>{subtitle}</div>
            )
          })()}
          </div>
        </AbsoluteFill>
      </div>
    </AbsoluteFill>
  )
}

export default KineticStatement
