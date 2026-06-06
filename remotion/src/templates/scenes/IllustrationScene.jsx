import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion'
import { fitHeadline, segText, clamp } from '../theme'
import { EASE, prog, enter, entrance, floatY, breathe, camera, parallax } from '../motion'

/**
 * IllustrationScene — ilustración hero (estilo unDraw) como elemento ESTÁTICO con
 * movimiento de cámara + entrada + flote sutil. Recolorea al acento de la marca.
 *
 * Props:
 *   theme
 *   title : segmentos { t, accent }  (titular opcional)
 *   name  : cuál del set embebido: 'growth' | 'audience' | 'launch' | 'connect' | 'idea'
 *   svg   : { body, viewBox } de unDraw (opcional). Si viene, se usa en vez del set
 *           embebido (el backend ya lo recoloreó al acento). Habilita la librería completa.
 *   variant : 'center' (default) | 'top'  (posición del titular)
 */

// Paleta derivada del theme para las ilustraciones (acento + neutros claros sobre fondo oscuro)
const palette = (theme) => ({
  a1: theme.accentFrom, a2: theme.accentTo,
  n1: 'rgba(255,255,255,0.92)', n2: 'rgba(255,255,255,0.55)', n3: 'rgba(255,255,255,0.22)',
})

// ── Set embebido (viewBox 0 0 400 300), flat, themeable, sin red ──────────────
const FIGURES = {
  growth: (c) => (
    <>
      <line x1="40" y1="250" x2="370" y2="250" stroke={c.n3} strokeWidth="3" />
      {[0, 1, 2, 3].map(i => (
        <rect key={i} x={70 + i * 70} y={250 - (60 + i * 45)} width="44" height={60 + i * 45} rx="8"
          fill={i === 3 ? c.a2 : c.a1} opacity={i === 3 ? 1 : 0.45 + i * 0.18} />
      ))}
      <path d="M 70 200 L 140 165 L 210 175 L 300 70" fill="none" stroke={c.n1} strokeWidth="5"
        strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 300 70 l -26 4 l 14 22 z" fill={c.n1} />
      <circle cx="330" cy="60" r="22" fill={c.a2} opacity="0.9" />
    </>
  ),
  audience: (c) => (
    <>
      {[90, 64, 38].map((r, i) => (
        <circle key={i} cx="200" cy="150" r={r} fill="none" stroke={i === 2 ? c.a2 : c.a1} strokeWidth="4"
          opacity={0.4 + i * 0.2} />
      ))}
      <circle cx="200" cy="150" r="16" fill={c.a2} />
      {[[200, 36], [330, 150], [200, 264], [70, 150]].map(([x, y], i) => (
        <g key={i} transform={`translate(${x},${y})`}>
          <circle cx="0" cy="-12" r="13" fill={i % 2 ? c.a1 : c.n1} />
          <path d="M -16 22 a 16 18 0 0 1 32 0 z" fill={i % 2 ? c.a1 : c.n1} opacity="0.92" />
        </g>
      ))}
    </>
  ),
  launch: (c) => (
    <>
      {[[70, 70], [330, 90], [90, 230], [320, 240]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 2 ? 3 : 5} fill={c.n2} />
      ))}
      <path d="M 200 70 q 42 50 42 120 q 0 30 -16 50 l -52 0 q -16 -20 -16 -50 q 0 -70 42 -120 z" fill={c.n1} />
      <circle cx="200" cy="150" r="18" fill={c.a1} />
      <path d="M 174 230 q -28 8 -34 44 q 28 -8 34 -28 z" fill={c.a1} opacity="0.8" />
      <path d="M 226 230 q 28 8 34 44 q -28 -8 -34 -28 z" fill={c.a1} opacity="0.8" />
      <path d="M 184 248 q 16 36 32 0 q -8 28 -16 40 q -8 -12 -16 -40 z" fill={c.a2} />
    </>
  ),
  connect: (c) => {
    const out = [[80, 80], [320, 70], [350, 200], [200, 270], [60, 210]]
    return (
      <>
        {out.map(([x, y], i) => <line key={'l' + i} x1="200" y1="150" x2={x} y2={y} stroke={c.n3} strokeWidth="3" />)}
        {out.map(([x, y], i) => <circle key={'n' + i} cx={x} cy={y} r="20" fill={i % 2 ? c.a2 : c.a1} opacity="0.92" />)}
        <circle cx="200" cy="150" r="34" fill={c.n1} />
        <circle cx="200" cy="150" r="34" fill="none" stroke={c.a1} strokeWidth="4" />
      </>
    )
  },
  idea: (c) => (
    <>
      <circle cx="200" cy="135" r="62" fill={c.a1} opacity="0.9" />
      <circle cx="200" cy="135" r="62" fill="none" stroke={c.n1} strokeWidth="4" />
      <rect x="182" y="196" width="36" height="26" rx="6" fill={c.n2} />
      <rect x="186" y="224" width="28" height="10" rx="5" fill={c.n3} />
      <path d="M 200 110 l 0 38 M 184 132 l 32 0" stroke={c.n1} strokeWidth="5" strokeLinecap="round" />
      {[[120, 70], [280, 70], [110, 150], [290, 150]].map(([x, y], i) => (
        <line key={i} x1={x} y1={y} x2={x + (x < 200 ? 26 : -26)} y2={y + 14} stroke={c.a2} strokeWidth="4" strokeLinecap="round" />
      ))}
    </>
  ),
}

export const IllustrationScene = ({
  theme, title = [], name = 'growth', svg = null, variant = 'center', durationInFrames: durProp,
}) => {
  const frame = useCurrentFrame()
  const vc = useVideoConfig()
  const dur = durProp || vc.durationInFrames
  const m = theme.motion
  const c = palette(theme)

  const cam = camera(theme.art, frame, dur, m.cameraDrift)
  const fl = floatY(frame, 14, 150)
  const pop = entrance(theme.art, frame, 2, { dur: m.enterFrames + 4, dist: 60 })
  const titleE = enter(frame, 18, { dur: m.enterFrames, dist: 34, ease: EASE.out })
  const glow = clamp(frame / 16, 0, 1) * breathe(frame, 0.05, 150)
  const top = variant === 'top'

  const Fig = FIGURES[name] || FIGURES.growth

  return (
    <AbsoluteFill style={{ background: theme.bg, fontFamily: theme.font, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${cam.scale}) translate(${cam.x}px, ${cam.y}px)`, transformOrigin: '50% 46%' }}>
        <div style={{ position: 'absolute', left: '50%', top: top ? '60%' : '46%', width: 980, height: 980,
          transform: 'translate(-50%,-50%)', opacity: glow,
          background: `radial-gradient(circle, ${theme.glow}, rgba(0,0,0,0) 62%)` }} />

        <AbsoluteFill style={{ alignItems: 'center', justifyContent: top ? 'flex-start' : 'center',
          paddingTop: top ? 200 : 0, gap: 70 }}>
          {top && title.length > 0 && (
            <div style={{ transform: titleE.transform, opacity: titleE.opacity, textAlign: 'center', padding: '0 80px',
              fontWeight: theme.headWeight, fontSize: fitHeadline(segText(title), 104, 56), lineHeight: 1.05,
              letterSpacing: '-0.03em', color: theme.text }}>
              {title.map((s, i) => <span key={i} style={s.accent ? { color: 'transparent', backgroundImage: theme.accentGrad, WebkitBackgroundClip: 'text', backgroundClip: 'text' } : null}>{s.t}</span>)}
            </div>
          )}

          <div style={{ transform: `translateY(${fl}px) scale(${clamp(pop.opacity ? 0.6 + pop.opacity * 0.4 : 1, 0, 1)})`,
            opacity: pop.opacity, width: 760, filter: `drop-shadow(0 30px 60px ${theme.glow})` }}>
            {svg && svg.body
              ? <svg viewBox={svg.viewBox || '0 0 400 300'} width="760" dangerouslySetInnerHTML={{ __html: svg.body }} />
              : <svg viewBox="0 0 400 300" width="760">{Fig(c)}</svg>}
          </div>

          {!top && title.length > 0 && (
            <div style={{ transform: titleE.transform, opacity: titleE.opacity, textAlign: 'center', padding: '0 80px',
              fontWeight: theme.headWeight, fontSize: fitHeadline(segText(title), 104, 56), lineHeight: 1.05,
              letterSpacing: '-0.03em', color: theme.text }}>
              {title.map((s, i) => <span key={i} style={s.accent ? { color: 'transparent', backgroundImage: theme.accentGrad, WebkitBackgroundClip: 'text', backgroundClip: 'text' } : null}>{s.t}</span>)}
            </div>
          )}
        </AbsoluteFill>
      </div>
    </AbsoluteFill>
  )
}

export default IllustrationScene
