import { AbsoluteFill } from 'remotion'
import { Lottie } from '@remotion/lottie'
import TimelineVideo from './TimelineVideo'
import { isSafeLottie } from '../../../src/pages/Animaciones/lottieGate'

/**
 * LottieOverlay — compone una animacion Lottie como ACENTO premium SOBRE el motor Canvas (POC 4).
 *
 * El fondo + escenas los dibuja engineCore (TimelineVideo, Canvas 2D); la Lottie va en una capa React
 * por encima. @remotion/lottie sincroniza la Lottie a useCurrentFrame (goToAndStop) -> DETERMINISTA.
 * GATE: solo se renderiza si la Lottie pasa isSafeLottie (sin expresiones/efectos); si no, se ignora
 * y el video sale igual (sin romper el render reproducible).
 *
 * lottieData se pasa por props (el director lo busca con backend/lottie_search.py y lo baja).
 */
export const LottieOverlay = ({ timeline = null, lottieData = null, x = 0, y = 0, scale = 1, opacity = 1 }) => {
  const safe = lottieData && isSafeLottie(lottieData)
  return (
    <AbsoluteFill>
      <TimelineVideo timeline={timeline} />
      {safe && (
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', opacity }}>
          <div style={{ transform: `translate(${x}px, ${y}px) scale(${scale})`, width: '46%' }}>
            <Lottie animationData={lottieData} loop />
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  )
}

export default LottieOverlay
