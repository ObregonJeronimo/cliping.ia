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
  leaf:     'M5 19 C5 10 11 4 19 4 C19 13 13 19 5 19 Z',
  shield:   'M12 2 L20 5 V11 C20 16.5 16.5 20.5 12 22 C7.5 20.5 4 16.5 4 11 V5 Z',
  // ── ampliación por rubro (todas de UN solo trazo cerrado, morfeables) ──
  cup:      'M5 4 H19 V11 A7 7 0 0 1 5 11 Z',
  bottle:   'M10 2 H14 V5 L16 9 V20 A1 1 0 0 1 15 21 H9 A1 1 0 0 1 8 20 V9 L10 5 Z',
  flame:    'M12 2 C15 6 18 9 17 14 A5 5 0 0 1 7 14 C6 11 8 10 9 8 C10 10 12 9 12 2 Z',
  cloud:    'M7 19 A5 5 0 0 1 6.5 9.1 A6 6 0 0 1 18 10 A4 4 0 0 1 18 19 Z',
  bulb:     'M12 2 A7 7 0 0 0 8 15 V18 H16 V15 A7 7 0 0 0 12 2 Z',
  plane:    'M2 12 L22 3 L13 22 L10 14 Z',
  mail:     'M3 6 L12 13 L21 6 L21 19 L3 19 Z',
  bell:     'M12 2 C8 2 6 5 6 9 V14 L4 18 H20 L18 14 V9 C18 5 16 2 12 2 Z',
  eye:      'M2 12 C6 5 18 5 22 12 C18 19 6 19 2 12 Z',
  pencil:   'M3 21 L5 14 L15 4 L20 9 L10 19 Z',
  cap:      'M2 9 L12 4 L22 9 L12 14 Z',
  book:     'M4 4 C8 2 11 3 12 5 V21 C11 19 8 18 4 20 Z',
  apple:    'M12 7 C10 4 7 5 7 5 C9 5 10 6 11 7 C7 6 5 9 5 13 C5 18 9 21 12 21 C15 21 19 18 19 13 C19 9 16 6 12 7 Z',
  gem:      'M5 4 H19 L22 9 L12 22 L2 9 Z',
  crown:    'M3 8 L7 13 L12 5 L17 13 L21 8 L19 20 H5 Z',
  rocket:   'M12 2 C16 6 17 11 16 16 L13 19 H11 L8 16 C7 11 8 6 12 2 Z',
}
const KEYS = Object.keys(SHAPES)

// Easing fuerte (quint inOut): arranca lento, acelera, frena suave -> morph más natural.
const easeQuint = (t) => (t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2)

// Centro del bounding box. El output de flubber es poligonal (solo M/L), así que
// emparejar todos los números como (x,y) da el bbox real -> centramos sin "salto".
const bboxCenter = (d) => {
  const nums = (d.match(/-?\d+(?:\.\d+)?/g) || []).map(Number)
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (let i = 0; i + 1 < nums.length; i += 2) {
    const x = nums[i], y = nums[i + 1]
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }
  if (!isFinite(minX)) return { cx: 12, cy: 12 }
  return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 }
}

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

  // Interpoladores entre formas consecutivas (memoizados). maxSegmentLength bajo = más
  // puntos de muestreo = morph más suave y predecible.
  const interps = useMemo(
    () => paths.slice(0, -1).map((p, i) => flubber(p, paths[i + 1], { maxSegmentLength: 1 })),
    [paths]
  )

  // Timeline con ESPERAS: pequeña espera inicial (HEAD) para leer la 1ra forma, los morphs
  // ocurren en el medio, y una espera final (TAIL) mantiene la ÚLTIMA forma para que se "lea"
  // y el morph TERMINE antes de que la escena haga el crossfade de salida (~14f).
  const n = paths.length
  const TAIL = Math.min(30, Math.max(20, Math.round(dur * 0.18)))
  const HEAD = Math.min(16, Math.max(8, Math.round(dur * 0.08)))
  const morphSpan = Math.max(1, dur - TAIL - HEAD)
  const segDur = morphSpan / (n - 1)
  const fLocal = clamp(frame - HEAD, 0, morphSpan)
  const seg = Math.min(n - 2, Math.floor(fLocal / segDur))
  const local = fLocal - seg * segDur
  const holdF = segDur * 0.28
  const tRaw = clamp(local <= holdF ? 0 : (local - holdF) / (segDur - holdF), 0, 1)
  const t = easeQuint(tRaw)
  const d = interps[seg](t)

  // Centrado por-frame: saca el "salto" de posición cuando dos formas ocupan distinto lugar.
  const { cx, cy } = bboxCenter(d)
  const dx = 12 - cx, dy = 12 - cy

  // Actividad del morph (campana, pico en la mitad de la transición): mueve rotación,
  // respiración, blur de transición y glow -> el cambio se siente orgánico y cinematográfico.
  const act = Math.sin(tRaw * Math.PI)
  const intro = prog(frame, 0, m.enterFrames, EASE.back)
  const breathe2 = 1 + Math.sin(frame / 14) * 0.012 + act * 0.05
  const rot = act * 6
  const blur = act * 2.6
  const glowBoost = 1 + act * 0.6

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
          transform: `scale(${(0.6 + 0.4 * clamp(intro, 0, 1)) * breathe2}) rotate(${rot}deg)`,
          filter: `drop-shadow(0 0 ${44 * glowBoost}px ${theme.glow})${blur > 0.05 ? ` blur(${blur}px)` : ''}`,
        }}>
          <svg viewBox="0 0 24 24" width="440" height="440" style={{ overflow: 'visible' }}>
            <defs>
              <linearGradient id="morphGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={theme.accentTo} />
                <stop offset="100%" stopColor={theme.accentFrom} />
              </linearGradient>
            </defs>
            <g transform={`translate(${dx} ${dy})`}>
              <path d={d} fill="url(#morphGrad)" />
            </g>
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
