import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion'
import { useMemo } from 'react'
import { interpolate as flubber } from 'flubber'
import { fitHeadline, segText, clamp } from '../theme'
import { EASE, prog, camera } from '../motion'

/**
 * MorphScene — transformación FLUIDA entre formas vectoriales (morph de paths SVG con
 * flubber). Gratis, controlado y reproducible: una forma se convierte en la siguiente
 * encadenando 2-4 figuras. Sonnet elige la cadena que cuenta la historia de la marca.
 *
 * Props:
 *   theme
 *   title    : segmentos { t, accent }  (titular opcional)
 *   subtitle : string opcional
 *   shapes   : array de 2 a 4 KEYS de SHAPES (ej ["droplet","circle","check"])
 *   variant  : 'center' (default)
 */

// Formas de 24x24, UN solo path cada una (flubber morfea mejor con paths simples).
const SHAPES = {
  circle:   'M12 2 A10 10 0 1 0 12 22 A10 10 0 1 0 12 2 Z',
  square:   'M5 5 H19 V19 H5 Z',
  triangle: 'M12 3 L21 20 L3 20 Z',
  star:     'M12 2 L14.6 8.6 L21.5 9.2 L16.2 13.8 L17.9 20.5 L12 16.9 L6.1 20.5 L7.8 13.8 L2.5 9.2 L9.4 8.6 Z',
  heart:    'M12 21 C5 15 3 11 3 8 A4.5 4.5 0 0 1 12 6 A4.5 4.5 0 0 1 21 8 C21 11 19 15 12 21 Z',
  plus:     'M10 3 H14 V10 H21 V14 H14 V21 H10 V14 H3 V10 H10 Z',
  play:     'M6 4 L20 12 L6 20 Z',
  arrow:    'M3 10 H14 V6 L21 12 L14 18 V14 H3 Z',
  droplet:  'M12 2 C12 2 5 10 5 15 A7 7 0 0 0 19 15 C19 10 12 2 12 2 Z',
  house:    'M12 3 L21 11 H17 V21 H7 V11 H3 Z',
  bolt:     'M13 2 L4 13 H11 L9 22 L20 10 H13 Z',
  pin:      'M12 2 A7 7 0 0 0 5 9 C5 14 12 22 12 22 C12 22 19 14 19 9 A7 7 0 0 0 12 2 Z',
  box:      'M4 7 L12 3 L20 7 V17 L12 21 L4 17 Z',
  chat:     'M3 4 H21 V16 H9 L4 21 V16 H3 Z',
  check:    'M4 12 L9 18 L20 5 L21.5 6.5 L9 21 L2.5 13.5 Z',
  bag:      'M6 8 H18 V21 H6 Z',
}
const KEYS = Object.keys(SHAPES)

export const MorphScene = ({ theme, title = [], subtitle = '', shapes = [], variant = 'center', durationInFrames: durProp }) => {
  const frame = useCurrentFrame()
  const vc = useVideoConfig()
  const m = theme.motion
  const dur = durProp || vc.durationInFrames
  const cam = camera(theme.art, frame, dur, m.cameraDrift)

  // Resolver keys -> paths (con fallback). Mínimo 2 formas.
  const paths = useMemo(() => {
    let ks = (shapes || []).filter(k => SHAPES[k])
    if (ks.length < 2) ks = ['droplet', 'circle', 'check']
    return ks.slice(0, 4).map(k => SHAPES[k])
  }, [shapes])

  // Interpoladores entre formas consecutivas (memoizados).
  const interps = useMemo(
    () => paths.slice(0, -1).map((p, i) => flubber(p, paths[i + 1], { maxSegmentLength: 2 })),
    [paths]
  )

  // Timeline: D se reparte en (N-1) tramos. Cada tramo: HOLD 35% + MORPH 65% (con ease).
  const n = paths.length
  const segDur = dur / (n - 1)
  const seg = Math.min(n - 2, Math.floor(frame / segDur))
  const local = frame - seg * segDur
  const holdF = segDur * 0.35
  const tRaw = local <= holdF ? 0 : (local - holdF) / (segDur - holdF)
  const t = EASE.inOut(clamp(tRaw, 0, 1))
  const d = frame >= dur - 1 ? paths[n - 1] : interps[seg](t)

  // Entrada + respiración sutil de la figura
  const intro = prog(frame, 0, m.enterFrames, EASE.back)
  const pulse = 1 + Math.sin(frame / 14) * 0.012
  const morphing = local > holdF && local < segDur * 0.98
  const glowBoost = morphing ? 1.4 : 1

  const Title = ({ size }) => (
    <div style={{ textAlign: 'center', fontWeight: theme.headWeight, fontSize: size, lineHeight: 1.06,
      letterSpacing: '-0.02em', color: theme.text, padding: '0 70px' }}>
      {title.map((s, i) => (
        <span key={i} style={s.accent ? { color: 'transparent', backgroundImage: theme.accentGrad, WebkitBackgroundClip: 'text', backgroundClip: 'text' } : null}>{s.t}</span>
      ))}
    </div>
  )

  return (
    <AbsoluteFill style={{ background: theme.bg, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${cam.scale}) translate(${cam.x}px, ${cam.y}px)`, transformOrigin: '50% 46%',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 54 }}>

        {segText(title) && <Title size={fitHeadline(segText(title), 96, 54)} />}

        <div style={{
          opacity: clamp(intro, 0, 1),
          transform: `scale(${(0.6 + 0.4 * clamp(intro, 0, 1)) * pulse})`,
          filter: `drop-shadow(0 0 ${44 * glowBoost}px ${theme.glow})`,
        }}>
          <svg viewBox="0 0 24 24" width="440" height="440" style={{ overflow: 'visible' }}>
            <defs>
              <linearGradient id="morphGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={theme.accentFrom} />
                <stop offset="100%" stopColor={theme.accentTo} />
              </linearGradient>
            </defs>
            <path d={d} fill="url(#morphGrad)" />
          </svg>
        </div>

        {subtitle && (
          <div style={{ fontSize: 34, color: theme.textMuted, opacity: clamp(prog(frame, 8, 16, EASE.out), 0, 1) * 0.9,
            textAlign: 'center', padding: '0 90px', lineHeight: 1.4 }}>{subtitle}</div>
        )}
      </div>
    </AbsoluteFill>
  )
}

export default MorphScene
