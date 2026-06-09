import { useCurrentFrame, useVideoConfig } from 'remotion'
import { useLayoutEffect, useRef } from 'react'
import { W as LOGICAL_W, drawFrame } from '../../../src/pages/Animaciones/engineCore'

/**
 * TimelineVideo — renderiza el motor de animacion (engineCore) cuadro a cuadro para que Remotion
 * lo exporte a MP4. Es EL MISMO nucleo que el preview en vivo del sidebar, asi que lo que ves en la
 * app es lo que sale en el video.
 *
 * El dibujo es sincronico, asi que se pinta en useLayoutEffect (antes de que Remotion capture el frame).
 * Por ahora el timeline esta horneado en el nucleo (la demo); el prop `timeline` queda reservado para
 * cuando la IA lo escriba desde la URL.
 */
export const TimelineVideo = ({ timeline = null }) => {
  const frame = useCurrentFrame()
  const { fps, width, height } = useVideoConfig()
  const ref = useRef(null)

  useLayoutEffect(() => {
    const c = ref.current
    if (!c) return
    const ctx = c.getContext('2d')
    // El nucleo dibuja en un espacio logico de 405x720 (9:16). Escalamos uniforme al tamano real
    // de la composicion (1080x1920): 1080/405 == 1920/720, asi que una sola escala alcanza.
    const scale = width / LOGICAL_W
    ctx.setTransform(scale, 0, 0, scale, 0, 0)
    drawFrame(ctx, frame / fps)
  }, [frame, width, fps, timeline])

  return (
    <canvas
      ref={ref}
      width={width}
      height={height}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  )
}

export default TimelineVideo
