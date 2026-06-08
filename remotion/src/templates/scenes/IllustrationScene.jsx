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
  organic: (c) => (
    <>
      <path d="M200 252 C120 200 96 150 96 116 C150 120 200 160 200 252 Z" fill={c.a1} opacity="0.92" />
      <path d="M200 252 C280 200 304 150 304 116 C250 120 200 160 200 252 Z" fill={c.a2} />
      <line x1="200" y1="258" x2="200" y2="150" stroke={c.n2} strokeWidth="6" strokeLinecap="round" />
      <circle cx="200" cy="118" r="13" fill={c.a2} />
    </>
  ),
  care: (c) => (
    <>
      <path d="M200 248 C120 188 95 152 95 120 A42 42 0 0 1 200 106 A42 42 0 0 1 305 120 C305 152 280 188 200 248 Z" fill={c.a1} />
      <path d="M132 158 H172 L188 130 L210 192 L226 158 H268" fill="none" stroke={c.n1} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  quality: (c) => (
    <>
      <path d="M200 64 L292 98 V162 C292 218 252 248 200 264 C148 248 108 218 108 162 V98 Z" fill={c.a1} opacity="0.95" />
      <path d="M164 166 L192 194 L242 134" fill="none" stroke={c.n1} strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
}

const Title = ({ theme, title, e }) => (
  <div style={{ transform: e.transform, opacity: e.opacity, textAlign: 'center', padding: '0 10px',
    fontWeight: theme.headWeight, fontSize: fitHeadline(segText(title), 100, 56), lineHeight: 1.05,
    letterSpacing: '-0.03em', color: theme.text }}>
    {title.map((s, i) => <span key={i} style={s.accent ? { color: 'transparent', backgroundImage: theme.accentGrad, WebkitBackgroundClip: 'text', backgroundClip: 'text' } : null}>{s.t}</span>)}
  </div>
)

export const IllustrationScene = ({
  theme, title = [], subtitle = '', name = 'growth', svg = null, variant = 'center', durationInFrames: durProp,
}) => {
  const frame = useCurrentFrame()
  const vc = useVideoConfig()
  const dur = durProp || vc.durationInFrames
  const m = theme.motion
  const c = palette(theme)

  const cam = camera(theme.art, frame, dur, m.cameraDrift)
  const fl = floatY(frame, 14, 150)
  const pop = entrance(theme.art, frame, 2, { dur: m.enterFrames + 4, dist: 60 })
  const titleE = enter(frame, 16, { dur: m.enterFrames, dist: 34, ease: EASE.out })
  const subE = enter(frame, 26, { dur: m.enterFrames, dist: 24, ease: EASE.out })
  const glow = clamp(frame / 16, 0, 1) * breathe(frame, 0.05, 150)

  const Fig = FIGURES[name] || FIGURES.growth
  // Puntos flotantes para llenar el aire (decorativos, themeados)
  const DOTS = [[150, 360, 7], [720, 300, 5], [120, 1500, 6], [770, 1540, 8], [80, 840, 4], [840, 1000, 5], [260, 1660, 4], [650, 1720, 6]]

  return (
    <AbsoluteFill style={{ background: theme.bg, fontFamily: theme.font, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${cam.scale}) translate(${cam.x}px, ${cam.y}px)`, transformOrigin: '50% 50%' }}>
        <div style={{ position: 'absolute', left: '50%', top: '50%', width: 1150, height: 1150,
          transform: 'translate(-50%,-50%)', opacity: glow,
          background: `radial-gradient(circle, ${theme.glow}, rgba(0,0,0,0) 60%)` }} />

        {DOTS.map(([x, y, r], i) => (
          <div key={i} style={{ position: 'absolute', left: x, top: y + floatY(frame - i * 7, 10, 150),
            width: r * 2, height: r * 2, borderRadius: '50%', background: i % 3 === 0 ? c.a2 : c.n3,
            opacity: clamp(frame / 20, 0, 1) * (i % 3 === 0 ? 0.8 : 0.5) }} />
        ))}

        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', gap: 54, padding: '0 70px' }}>
          {segText(title) && <Title theme={theme} title={title} e={titleE} />}

          <div style={{ transform: `translateY(${fl}px) scale(${clamp(0.6 + pop.opacity * 0.4, 0, 1)})`,
            opacity: pop.opacity, width: 860, filter: `drop-shadow(0 30px 70px ${theme.glow})` }}>
            {svg && svg.body
              ? <svg viewBox={svg.viewBox || '0 0 400 300'} width="860" dangerouslySetInnerHTML={{ __html: svg.body }} />
              : <svg viewBox="0 0 400 300" width="860">{Fig(c)}</svg>}
          </div>

          {subtitle && (
            <div style={{ transform: subE.transform, opacity: subE.opacity, color: theme.textMuted,
              fontSize: 44, textAlign: 'center', maxWidth: 820, lineHeight: 1.35 }}>{subtitle}</div>
          )}
        </AbsoluteFill>
      </div>
    </AbsoluteFill>
  )
}

export default IllustrationScene
