import { AbsoluteFill, useCurrentFrame } from 'remotion'

/**
 * FinishLayer — capa de "terminación" sobre TODO el video. Lo que el ojo lee como
 * "caro": grano de film sutil, viñeta y un barrido de luz arriba.
 * No interactúa con el contenido (pointerEvents none) y va arriba de todo.
 *
 * Props: grain (0-1 intensidad), vignette (0-1 oscuridad de bordes).
 */
export const FinishLayer = ({ grain = 0.055, vignette = 0.4 }) => {
  const frame = useCurrentFrame()
  const seed = Math.floor(frame / 2) % 100 // grano que se mueve (cada 2 frames)

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {/* viñeta: oscurece bordes, foco al centro */}
      <AbsoluteFill style={{
        background: `radial-gradient(120% 78% at 50% 45%, rgba(0,0,0,0) 52%, rgba(0,0,0,${vignette}) 100%)`,
      }} />

      {/* barrido de luz sutil desde arriba (profundidad) */}
      <AbsoluteFill style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0) 24%)',
        mixBlendMode: 'soft-light',
      }} />

      {/* grano de film */}
      <AbsoluteFill style={{ opacity: grain, mixBlendMode: 'overlay' }}>
        <svg width="100%" height="100%" style={{ width: '100%', height: '100%' }}>
          <filter id="finishGrain">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={seed} stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#finishGrain)" />
        </svg>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}

export default FinishLayer
