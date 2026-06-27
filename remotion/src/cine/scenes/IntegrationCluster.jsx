import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion'
import { fitHeadline, segText, clamp, accentPalette } from '../theme'
import { EASE, SPRING, prog, spr, enter, entrance, stagger, floatY, camera, parallax } from '../motion'
import { fmt } from '../layout'

/**
 * IntegrationCluster — hub central + fuentes alrededor conectadas por líneas.
 * Props: theme, title (segmentos {t,accent}), colors (array de hex). Si no se pasan
 * colors, se derivan del color de marca (no hay lista fija).
 */

const GradientText = ({ theme, children }) => (
  <span style={{ backgroundImage: theme.accentGrad, WebkitBackgroundClip: 'text',
    backgroundClip: 'text', color: 'transparent' }}>{children}</span>
)

export const IntegrationCluster = ({ theme, title = [], colors = null, variant = '', hubMark = '', durationInFrames: durProp }) => {
  const frame = useCurrentFrame()
  const vc = useVideoConfig()
  const fps = vc.fps
  const dur = durProp || vc.durationInFrames
  const m = theme.motion
  const F = fmt(vc)
  // Variedad estable por video (mismo título -> mismo look; títulos distintos -> looks distintos):
  // si el director no fijó variant/hubMark, los derivamos de un hash del título.
  const _txt = (title || []).map(s => s && s.t ? s.t : '').join('')
  let _h = 0
  for (let i = 0; i < _txt.length; i++) _h = (_h * 31 + _txt.charCodeAt(i)) >>> 0
  const _variants = ['hub', 'orbit', 'arc']
  const _marks = ['spark', 'rings', 'orb', 'plus', 'hex']
  variant = variant || _variants[_h % _variants.length]
  hubMark = hubMark || _marks[(_h >> 3) % _marks.length]
  // Posiciones RELATIVAS al formato (en vertical 1080x1920 equivalen a las de antes).
  const HUB = { x: F.cx, y: F.H * 0.594 }
  const REL_SLOTS = [[0.231, 0.458], [0.769, 0.458], [0.199, 0.599], [0.801, 0.599], [0.50, 0.745]]
    .map(([fx, fy]) => ({ x: F.W * fx, y: F.H * fy }))
  const cols = (colors && colors.length) ? colors : accentPalette(theme, REL_SLOTS.length)

  const cam = camera(theme.art, frame, dur, m.cameraDrift)
  const pxFg = parallax(cam, 0.35)
  const cap = entrance(theme.art, frame, 0, { dur: m.enterFrames, dist: 50, ease: EASE.out })
  const hub = spr(frame, fps, 8, SPRING.pop, 26)
  const hubRot = prog(frame, 8, 40, EASE.out) * 30
  const lineDraw = prog(frame, 14, 26, EASE.inOut)
  const glowOp = clamp(frame / 16, 0, 1)
  const n = Math.min(cols.length, REL_SLOTS.length)
  const _Rmin = Math.min(F.W, F.H)
  // Disposición de los nodos según la variante (las líneas hub->nodo sirven para cualquiera).
  const slots = (() => {
    if (variant === 'orbit') {
      const R = _Rmin * 0.305
      return Array.from({ length: n }, (_, i) => {
        const a = -Math.PI / 2 + (i / n) * Math.PI * 2
        return { x: HUB.x + Math.cos(a) * R, y: HUB.y + Math.sin(a) * R }
      })
    }
    if (variant === 'arc') {
      const R = _Rmin * 0.333
      return Array.from({ length: n }, (_, i) => {
        const t = n === 1 ? 0.5 : i / (n - 1)
        const a = Math.PI * (1 - t) // dome por encima del hub
        return { x: HUB.x + Math.cos(a) * R, y: HUB.y - Math.sin(a) * R * 0.92 }
      })
    }
    return REL_SLOTS.slice(0, n) // 'hub' (disperso, default)
  })()

  return (
    <AbsoluteFill style={{ background: theme.bg, fontFamily: theme.font, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0,
        transform: `scale(${cam.scale}) translate(${cam.x}px, ${cam.y}px)`, transformOrigin: '50% 55%' }}>
        <div style={{ position: 'absolute', left: '50%', top: '59%', width: 900, height: 900,
          transform: 'translate(-50%,-50%)', opacity: glowOp,
          background: `radial-gradient(circle, ${theme.glow}, rgba(0,0,0,0) 60%)` }} />

        <div style={{ position: 'absolute', top: F.H * 0.13, width: '100%', textAlign: 'center',
          fontWeight: theme.headWeight, fontSize: fitHeadline(segText(title), 112), lineHeight: 1.08, letterSpacing: '-0.025em',
          color: theme.text, padding: '0 70px', transform: cap.transform, opacity: cap.opacity }}>
          {title.map((s, j) => s.accent
            ? <GradientText key={j} theme={theme}>{s.t}</GradientText>
            : <span key={j}>{s.t}</span>)}
        </div>

        <svg width={F.W} height={F.H} viewBox={`0 0 ${F.W} ${F.H}`} style={{ position: 'absolute', inset: 0 }}>
          <g stroke={theme.accentFrom} strokeWidth="3" strokeDasharray="8 12" opacity="0.4" fill="none">
            {slots.map((p, i) => {
              const x2 = HUB.x + (p.x - HUB.x) * lineDraw
              const y2 = HUB.y + (p.y - HUB.y) * lineDraw
              return <line key={i} x1={HUB.x} y1={HUB.y} x2={x2} y2={y2} />
            })}
          </g>
        </svg>

        {slots.map((p, i) => {
          const e = spr(frame, fps, stagger(i, 12, m.stagger), SPRING.bouncy, 22)
          const fl = floatY(frame - i * 7, 7, 120)
          return (
            <div key={i} style={{ position: 'absolute', left: p.x, top: p.y,
              transform: `translate(-50%,-50%) translate(${pxFg.x}px, ${pxFg.y + fl}px) scale(${e})`, opacity: clamp(e, 0, 1),
              height: 108, borderRadius: 54, display: 'flex', alignItems: 'center', gap: 18, padding: '0 32px',
              maxWidth: 300, transformOrigin: 'center center', boxSizing: 'border-box',
              background: theme.pillBg, border: `2px solid ${theme.pillBorder}`, boxShadow: '0 16px 40px rgba(0,0,0,0.45)' }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: cols[i] }} />
              <div style={{ width: 108, height: 22, borderRadius: 12, background: '#ffffff2a' }} />
            </div>
          )
        })}

        <div style={{ position: 'absolute', left: HUB.x, top: HUB.y,
          transform: `translate(-50%,-50%) scale(${hub})`,
          width: 260, height: 260, borderRadius: hubMark === 'orb' ? '50%' : 72, background: theme.accentGrad,
          boxShadow: `0 0 120px ${theme.glow}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {hubMark === 'spark' && (
            <svg width={112} height={112} viewBox="-1 -1 2 2" style={{ transform: `rotate(${hubRot}deg)` }}>
              <path d="M0,-1 C0.12,-0.12 0.12,-0.12 1,0 C0.12,0.12 0.12,0.12 0,1 C-0.12,0.12 -0.12,0.12 -1,0 C-0.12,-0.12 -0.12,-0.12 0,-1 Z" fill="#fff" />
            </svg>
          )}
          {hubMark === 'plus' && (
            <div style={{ width: 120, height: 120, position: 'relative', transform: `rotate(${hubRot * 0.3}deg)` }}>
              <div style={{ position: 'absolute', left: '50%', top: 0, width: 26, height: '100%', transform: 'translateX(-50%)', background: '#fff', borderRadius: 13 }} />
              <div style={{ position: 'absolute', top: '50%', left: 0, height: 26, width: '100%', transform: 'translateY(-50%)', background: '#fff', borderRadius: 13 }} />
            </div>
          )}
          {hubMark === 'rings' && (
            <svg width={140} height={140} viewBox="0 0 140 140">
              {[58, 40, 22].map((r, i) => (
                <circle key={i} cx="70" cy="70" r={r} fill="none" stroke="#fff" strokeWidth={i === 2 ? 14 : 8}
                  opacity={0.55 + i * 0.2} />
              ))}
            </svg>
          )}
          {hubMark === 'orb' && (
            <div style={{ width: 150, height: 150, borderRadius: '50%', background: 'rgba(255,255,255,0.92)',
              boxShadow: 'inset 0 0 40px rgba(0,0,0,0.18)' }} />
          )}
          {hubMark === 'hex' && (
            <svg width={130} height={130} viewBox="0 0 100 100" style={{ transform: `rotate(${hubRot * 0.4}deg)` }}>
              <polygon points="50,6 91,28 91,72 50,94 9,72 9,28" fill="#fff" />
            </svg>
          )}
        </div>
      </div>
    </AbsoluteFill>
  )
}

export default IntegrationCluster
