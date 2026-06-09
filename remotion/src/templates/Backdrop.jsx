import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion'

/**
 * Backdrop — capa de ATMÓSFERA global (variedad cinematográfica). Se monta sobre
 * las escenas (que pintan su fondo opaco) con blend modes y opacidad moderada, así
 * agrega "aire" sin tapar el contenido. El motivo lo elige la art direction por
 * video (spec.art.motif), así dos videos con las mismas escenas se ven distintos.
 *
 * Motivos: particles | grid | aurora | rays | bokeh | dots | waves | none
 * Todos los motivos reciben W/H REALES del formato (9:16 / 1:1 / 16:9) para cubrir
 * toda la pantalla. No interactúan con el contenido (pointerEvents none).
 */

// pseudo-random determinista (estable por frame) a partir de un índice.
const rnd = (i, s = 1) => {
  const x = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453
  return x - Math.floor(x)
}

const Particles = ({ theme, frame, W, H }) => {
  const N = 40
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', inset: 0, mixBlendMode: 'screen', opacity: 0.55 }}>
      {Array.from({ length: N }, (_, i) => {
        const x = rnd(i, 1) * W
        const speed = 0.25 + rnd(i, 2) * 0.7
        const y = (H + 40 - ((frame * speed + rnd(i, 3) * H) % (H + 80)))
        const r = 1.5 + rnd(i, 4) * 4
        const c = i % 3 === 0 ? theme.accentTo : i % 3 === 1 ? theme.accentFrom : '#ffffff'
        const tw = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(frame / 14 + i))
        return <circle key={i} cx={x} cy={y} r={r} fill={c} opacity={tw * 0.8} />
      })}
    </svg>
  )
}

const Bokeh = ({ theme, frame, W, H }) => {
  const N = 11
  return (
    <AbsoluteFill style={{ mixBlendMode: 'screen', opacity: 0.45, filter: 'blur(2px)' }}>
      {Array.from({ length: N }, (_, i) => {
        const baseX = rnd(i, 5) * W
        const speed = 0.15 + rnd(i, 6) * 0.4
        const y = (H + 160 - ((frame * speed + rnd(i, 7) * H) % (H + 320)))
        const x = baseX + Math.sin(frame / 90 + i) * 40
        const size = 70 + rnd(i, 8) * 180
        const c = i % 2 ? theme.accentFrom : theme.accentTo
        return (
          <div key={i} style={{ position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, height: size,
            borderRadius: '50%', background: `radial-gradient(circle, ${c}cc, ${c}00 70%)`, filter: 'blur(8px)' }} />
        )
      })}
    </AbsoluteFill>
  )
}

const Aurora = ({ theme, frame, W, H }) => {
  const blobs = [
    { c: theme.accentFrom, bx: 0.28, by: 0.30, s: 760, px: 120, py: 90, ph: 0 },
    { c: theme.accentTo, bx: 0.72, by: 0.62, s: 820, px: 150, py: 110, ph: 2 },
    { c: theme.accentFrom, bx: 0.5, by: 0.85, s: 680, px: 90, py: 70, ph: 4 },
  ]
  return (
    <AbsoluteFill style={{ mixBlendMode: 'screen', opacity: 0.4, filter: 'blur(36px)' }}>
      {blobs.map((b, i) => {
        const x = b.bx * W + Math.sin(frame / 110 + b.ph) * b.px
        const y = b.by * H + Math.cos(frame / 130 + b.ph) * b.py
        return (
          <div key={i} style={{ position: 'absolute', left: x - b.s / 2, top: y - b.s / 2, width: b.s, height: b.s,
            borderRadius: '50%', background: `radial-gradient(circle, ${b.c}, ${b.c}00 65%)` }} />
        )
      })}
    </AbsoluteFill>
  )
}

const Rays = ({ theme, frame, W, H }) => {
  // El gradiente repite cada 160px -> el loop debe reiniciar cada 160px (no 360) para no saltar.
  const shift = (frame * 1.2) % 160
  return (
    <AbsoluteFill style={{ mixBlendMode: 'screen', opacity: 0.18, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', left: -200, top: -400, width: W + 400, height: H + 800,
        transform: `rotate(24deg) translateX(${shift - 80}px)`,
        background: `repeating-linear-gradient(90deg, ${theme.accentFrom}00 0px, ${theme.accentTo}55 60px, ${theme.accentFrom}00 160px)`,
      }} />
    </AbsoluteFill>
  )
}

const Grid = ({ theme, frame }) => {
  const off = (frame * 0.6) % 90  // patrón 90px, loop cada 90 -> sin salto
  return (
    <AbsoluteFill style={{ mixBlendMode: 'soft-light', opacity: 0.5 }}>
      <div style={{ position: 'absolute', inset: -90,
        backgroundImage: `linear-gradient(${theme.accentFrom}40 1px, transparent 1px), linear-gradient(90deg, ${theme.accentFrom}40 1px, transparent 1px)`,
        backgroundSize: '90px 90px', transform: `translateY(${off}px) perspective(700px) rotateX(46deg)`,
        transformOrigin: '50% 100%', maskImage: 'linear-gradient(180deg, transparent, #000 40%, #000 70%, transparent)' }} />
    </AbsoluteFill>
  )
}

const Dots = ({ theme, frame }) => {
  // patrón 54px -> loop cada 54 en AMBOS ejes (antes el eje Y usaba off*0.6 y saltaba).
  const off = (frame * 0.5) % 54
  return (
    <AbsoluteFill style={{ mixBlendMode: 'soft-light', opacity: 0.5 }}>
      <div style={{ position: 'absolute', inset: -60,
        backgroundImage: `radial-gradient(${theme.accentTo}66 2.4px, transparent 2.8px)`,
        backgroundSize: '54px 54px', transform: `translate(${off}px, ${off}px)`,
        maskImage: 'radial-gradient(120% 90% at 50% 45%, transparent 30%, #000 100%)' }} />
    </AbsoluteFill>
  )
}

const Waves = ({ theme, frame, W, H }) => {
  const lines = [
    { y: H * 0.32, amp: 60, k: 0.006, sp: 1.4, c: theme.accentFrom, o: 0.5 },
    { y: H * 0.55, amp: 90, k: 0.005, sp: -1.0, c: theme.accentTo, o: 0.4 },
    { y: H * 0.78, amp: 70, k: 0.007, sp: 1.8, c: theme.accentFrom, o: 0.3 },
  ]
  const path = (y, amp, k, ph) => {
    let d = `M -40 ${y}`
    for (let x = -40; x <= W + 40; x += 40) d += ` L ${x} ${y + Math.sin(x * k + ph) * amp}`
    return d
  }
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', inset: 0, mixBlendMode: 'screen', opacity: 0.5 }}>
      {lines.map((l, i) => (
        <path key={i} d={path(l.y, l.amp, l.k, frame * 0.04 * l.sp)} fill="none" stroke={l.c} strokeWidth="2.5" opacity={l.o} />
      ))}
    </svg>
  )
}

const MOTIFS = { particles: Particles, bokeh: Bokeh, aurora: Aurora, rays: Rays, grid: Grid, dots: Dots, waves: Waves }

/**
 * ContinuousBg — fondo ÚNICO y CONTINUO detrás de TODO el video. Usa el frame global
 * (no se reinicia entre escenas) -> el gradiente y el glow nunca "cortan" en las
 * transiciones, y como se mueve con senoidales puras NO tiene punto de reinicio (nunca salta).
 */
export const ContinuousBg = ({ theme }) => {
  const frame = useCurrentFrame()
  // Glow principal (base, igual que antes -> no cambia el carácter).
  const gx = 50 + Math.sin(frame / 150) * 12
  const gy = 36 + Math.cos(frame / 190) * 9
  const breath = 0.55 + 0.10 * Math.sin(frame / 80)
  // Blob de acento 1 (accentFrom).
  const ax = 50 + Math.cos(frame / 220) * 22
  const ay = 60 + Math.sin(frame / 180) * 16
  // Blob de acento 2 (accentTo) en otra fase -> profundidad de color tipo gradient-mesh.
  const bx = 30 + Math.sin(frame / 260 + 1.3) * 20
  const by = 30 + Math.cos(frame / 240 + 0.7) * 18
  const bBreath = 0.16 + 0.06 * Math.sin(frame / 110 + 2)
  return (
    <AbsoluteFill style={{ background: theme.bg, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', left: `${gx}%`, top: `${gy}%`, width: 1500, height: 1500,
        transform: 'translate(-50%,-50%)', opacity: breath,
        background: `radial-gradient(circle, ${theme.glow}, rgba(0,0,0,0) 60%)` }} />
      <div style={{ position: 'absolute', left: `${ax}%`, top: `${ay}%`, width: 1000, height: 1000,
        transform: 'translate(-50%,-50%)', opacity: 0.22, mixBlendMode: 'screen',
        background: `radial-gradient(circle, ${theme.accentFrom}55, rgba(0,0,0,0) 65%)` }} />
      <div style={{ position: 'absolute', left: `${bx}%`, top: `${by}%`, width: 1180, height: 1180,
        transform: 'translate(-50%,-50%)', opacity: bBreath, mixBlendMode: 'screen',
        background: `radial-gradient(circle, ${theme.accentTo}44, rgba(0,0,0,0) 68%)` }} />
      {/* Viñeta cinematográfica: oscurece sutil los bordes -> enfoca el centro, se siente "filmado". */}
      <AbsoluteFill style={{
        background: 'radial-gradient(ellipse 75% 75% at 50% 46%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.34) 100%)' }} />
    </AbsoluteFill>
  )
}

export const Backdrop = ({ theme, kind = 'none' }) => {
  const frame = useCurrentFrame()
  const { width: W, height: H } = useVideoConfig()
  const Comp = MOTIFS[kind]
  if (!Comp) return null
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <Comp theme={theme} frame={frame} W={W} H={H} />
    </AbsoluteFill>
  )
}

export default Backdrop
