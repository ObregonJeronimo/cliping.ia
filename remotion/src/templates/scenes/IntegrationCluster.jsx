import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion'
import { fitHeadline, segText, clamp, accentPalette } from '../theme'
import { EASE, SPRING, prog, spr, enter, entrance, stagger, floatY, camera, parallax } from '../motion'

/**
 * IntegrationCluster — hub central + fuentes alrededor conectadas por líneas.
 * Props: theme, title (segmentos {t,accent}), colors (array de hex). Si no se pasan
 * colors, se derivan del color de marca (no hay lista fija).
 */

const GradientText = ({ theme, children }) => (
  <span style={{ backgroundImage: theme.accentGrad, WebkitBackgroundClip: 'text',
    backgroundClip: 'text', color: 'transparent' }}>{children}</span>
)

const SLOTS = [
  { x: 150, y: 880 }, { x: 930, y: 880 },
  { x: 90, y: 1140 }, { x: 990, y: 1140 },
  { x: 540, y: 1420 },
]

export const IntegrationCluster = ({ theme, title = [], colors = null, durationInFrames: durProp }) => {
  const frame = useCurrentFrame()
  const vc = useVideoConfig()
  const fps = vc.fps
  const dur = durProp || vc.durationInFrames
  const m = theme.motion
  const HUB = { x: 540, y: 1140 }
  const cols = (colors && colors.length) ? colors : accentPalette(theme, SLOTS.length)

  const cam = camera(theme.art, frame, dur, m.cameraDrift)
  const pxFg = parallax(cam, 0.6)
  const cap = entrance(theme.art, frame, 0, { dur: m.enterFrames, dist: 50, ease: EASE.out })
  const hub = spr(frame, fps, 8, SPRING.pop, 26)
  const hubRot = prog(frame, 8, 40, EASE.out) * 30
  const lineDraw = prog(frame, 14, 26, EASE.inOut)
  const glowOp = clamp(frame / 16, 0, 1)
  const n = Math.min(cols.length, SLOTS.length)

  return (
    <AbsoluteFill style={{ background: theme.bg, fontFamily: theme.font, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0,
        transform: `scale(${cam.scale}) translate(${cam.x}px, ${cam.y}px)`, transformOrigin: '50% 55%' }}>
        <div style={{ position: 'absolute', left: '50%', top: '59%', width: 900, height: 900,
          transform: 'translate(-50%,-50%)', opacity: glowOp,
          background: `radial-gradient(circle, ${theme.glow}, rgba(0,0,0,0) 60%)` }} />

        <div style={{ position: 'absolute', top: 250, width: '100%', textAlign: 'center',
          fontWeight: theme.headWeight, fontSize: fitHeadline(segText(title), 112), lineHeight: 1.08, letterSpacing: '-0.025em',
          color: theme.text, padding: '0 70px', transform: cap.transform, opacity: cap.opacity }}>
          {title.map((s, j) => s.accent
            ? <GradientText key={j} theme={theme}>{s.t}</GradientText>
            : <span key={j}>{s.t}</span>)}
        </div>

        <svg width="1080" height="1920" viewBox="0 0 1080 1920" style={{ position: 'absolute', inset: 0 }}>
          <g stroke={theme.accentFrom} strokeWidth="3" strokeDasharray="8 12" opacity="0.4" fill="none">
            {SLOTS.slice(0, n).map((p, i) => {
              const x2 = HUB.x + (p.x - HUB.x) * lineDraw
              const y2 = HUB.y + (p.y - HUB.y) * lineDraw
              return <line key={i} x1={HUB.x} y1={HUB.y} x2={x2} y2={y2} />
            })}
          </g>
        </svg>

        {SLOTS.slice(0, n).map((p, i) => {
          const e = spr(frame, fps, stagger(i, 12, m.stagger), SPRING.bouncy, 22)
          const fl = floatY(frame - i * 7, 7, 120)
          return (
            <div key={i} style={{ position: 'absolute', left: p.x, top: p.y,
              transform: `translate(-50%,-50%) translate(${pxFg.x}px, ${pxFg.y + fl}px) scale(${e})`, opacity: clamp(e, 0, 1),
              height: 112, borderRadius: 56, display: 'flex', alignItems: 'center', gap: 22, padding: '0 40px',
              background: theme.pillBg, border: `2px solid ${theme.pillBorder}`, boxShadow: '0 16px 40px rgba(0,0,0,0.45)' }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: cols[i] }} />
              <div style={{ width: 108, height: 22, borderRadius: 12, background: '#ffffff2a' }} />
            </div>
          )
        })}

        <div style={{ position: 'absolute', left: HUB.x, top: HUB.y,
          transform: `translate(-50%,-50%) scale(${hub})`,
          width: 260, height: 260, borderRadius: 72, background: theme.accentGrad,
          boxShadow: `0 0 120px ${theme.glow}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width={112} height={112} viewBox="-1 -1 2 2" style={{ transform: `rotate(${hubRot}deg)` }}>
            <path d="M0,-1 C0.12,-0.12 0.12,-0.12 1,0 C0.12,0.12 0.12,0.12 0,1 C-0.12,0.12 -0.12,0.12 -1,0 C-0.12,-0.12 -0.12,-0.12 0,-1 Z" fill="#fff" />
          </svg>
        </div>
      </div>
    </AbsoluteFill>
  )
}

export default IntegrationCluster
