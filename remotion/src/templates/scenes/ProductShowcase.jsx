import { AbsoluteFill, useCurrentFrame, useVideoConfig, Img } from 'remotion'
import { clamp, segText } from '../theme'
import { EASE, prog, entrance, floatY } from '../motion'

/**
 * ProductShowcase — fotos REALES del sitio (producto/hero) con movimiento.
 * Props: theme, title (string | segmentos), images (array de URLs ya re-hosteadas).
 *
 * 1 imagen  -> card grande con Ken Burns (zoom/pan lento).
 * 2-3 imágenes -> cards en columna con entrada escalonada + leve parallax.
 * Si no llegan imágenes, muestra un placeholder sutil (nunca rompe el render).
 */

const GradientText = ({ theme, children }) => (
  <span style={{ backgroundImage: theme.accentGrad, WebkitBackgroundClip: 'text',
    backgroundClip: 'text', color: 'transparent' }}>{children}</span>
)

const Title = ({ theme, title, frame }) => {
  if (!title) return null
  const segs = typeof title === 'string' ? [{ t: title }] : title
  const e = entrance(theme.art || {}, frame, 4, { dur: 16, dist: 36, ease: EASE.back })
  return (
    <div style={{ transform: e.transform, opacity: e.opacity, marginBottom: 54,
      fontFamily: theme.font, fontWeight: theme.headWeight, fontSize: 78, lineHeight: 1.08,
      letterSpacing: '-0.025em', color: theme.text, textAlign: 'center', padding: '0 70px',
      textWrap: 'balance' }}>
      {segs.map((s, i) => s.accent
        ? <GradientText key={i} theme={theme}>{s.t}</GradientText>
        : <span key={i}>{s.t}</span>)}
    </div>
  )
}

const Card = ({ theme, src, frame, fps, idx, total, kenBurns }) => {
  const delay = 8 + idx * 9
  const e = entrance(theme.art || {}, frame, delay, { dur: 20, dist: 60, ease: EASE.back })
  const fl = floatY(frame, 5, 150 + idx * 30)
  // Ken Burns sólo en la card principal cuando hay una sola imagen.
  const kb = kenBurns ? 1 + prog(frame, 0, 150, EASE.inOut) * 0.1 : 1
  const panX = kenBurns ? (prog(frame, 0, 150, EASE.inOut) - 0.5) * 24 : 0
  const big = total === 1
  return (
    <div style={{
      transform: `${e.transform} translateY(${fl}px)`, opacity: e.opacity,
      width: big ? 880 : 760, height: big ? 1000 : 320,
      borderRadius: theme.radius * 2, overflow: 'hidden', position: 'relative',
      boxShadow: `0 32px 90px rgba(0,0,0,0.55), 0 0 60px ${theme.glow}`,
      border: `1.5px solid ${theme.accentTo}44`,
    }}>
      <Img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover',
        transform: `scale(${kb}) translateX(${panX}px)` }} />
      {/* velo de color sutil para integrar con la paleta */}
      <div style={{ position: 'absolute', inset: 0,
        background: `linear-gradient(160deg, transparent 55%, ${theme.bgSolid}cc)`,
        mixBlendMode: 'normal' }} />
    </div>
  )
}

const Placeholder = ({ theme }) => (
  <div style={{ width: 820, height: 940, borderRadius: theme.radius * 2,
    background: theme.pillBg, border: `1.5px solid ${theme.pillBorder}`,
    boxShadow: `0 0 60px ${theme.glow}` }} />
)

export const ProductShowcase = ({ theme, title = '', images = [] }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const imgs = Array.isArray(images) ? images.filter(Boolean).slice(0, 3) : []
  const single = imgs.length === 1

  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center',
      fontFamily: theme.font, overflow: 'hidden' }}>
      {title ? <Title theme={theme} title={title} frame={frame} /> : null}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
        {imgs.length === 0
          ? <Placeholder theme={theme} />
          : imgs.map((src, i) => (
            <Card key={i} theme={theme} src={src} frame={frame} fps={fps}
              idx={i} total={imgs.length} kenBurns={single} />
          ))}
      </div>
    </AbsoluteFill>
  )
}

export default ProductShowcase
