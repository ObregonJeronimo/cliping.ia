import { AbsoluteFill } from 'remotion'
import { TransitionSeries, linearTiming } from '@remotion/transitions'
import { fade } from '@remotion/transitions/fade'
import { slide } from '@remotion/transitions/slide'
import { wipe } from '@remotion/transitions/wipe'
import { CameraMotionBlur } from '@remotion/motion-blur'
import { loadFont } from '@remotion/google-fonts/Inter'
import { getTheme, applyAccent } from './theme'
import KineticStatement from './scenes/KineticStatement'
import IntegrationCluster from './scenes/IntegrationCluster'
import MockupShowcase from './scenes/MockupShowcase'
import CtaOutro from './scenes/CtaOutro'
import IconTransform from './scenes/IconTransform'
import StatReveal from './scenes/StatReveal'
import Comparison from './scenes/Comparison'
import Testimonial from './scenes/Testimonial'
import SocialProof from './scenes/SocialProof'
import FeatureList from './scenes/FeatureList'
import LogoReveal from './scenes/LogoReveal'
import FinishLayer from './FinishLayer'
import SoundLayer from './SoundLayer'

// Carga Inter (pesos puntuales).
loadFont('normal', { weights: ['400', '600', '700'], subsets: ['latin'], ignoreTooManyRequestsWarning: true })

/**
 * VideoFromSpec — arma el video desde un storyboard spec.
 * spec = { theme, scenes: [{ type, durationInFrames, ...props }], motionBlur? }
 *
 * Transiciones con continuidad: pool curado que varía por corte (fade/slide/wipe),
 * todas con duración fija TDUR (para que el cálculo de total sea exacto).
 */

const REGISTRY = { KineticStatement, IntegrationCluster, MockupShowcase, CtaOutro, IconTransform, StatReveal, Comparison, Testimonial, SocialProof, FeatureList, LogoReveal }
const TDUR = 14

const POOL = [
  () => ({ presentation: fade(), timing: linearTiming({ durationInFrames: TDUR }) }),
  () => ({ presentation: slide({ direction: 'from-right' }), timing: linearTiming({ durationInFrames: TDUR }) }),
  () => ({ presentation: slide({ direction: 'from-bottom' }), timing: linearTiming({ durationInFrames: TDUR }) }),
  () => ({ presentation: wipe({ direction: 'from-left' }), timing: linearTiming({ durationInFrames: TDUR }) }),
  () => ({ presentation: fade(), timing: linearTiming({ durationInFrames: TDUR }) }),
  () => ({ presentation: slide({ direction: 'from-top' }), timing: linearTiming({ durationInFrames: TDUR }) }),
]

const pickTransition = (i, seed) => POOL[(i + seed) % POOL.length]()

export const computeTotal = (scenes) => {
  const sum = (scenes || []).reduce((a, s) => a + (s.durationInFrames || 90), 0)
  return sum - Math.max(0, (scenes || []).length - 1) * TDUR
}

// Frames donde ocurre cada corte/transición (inicio de cada escena salvo la 1ª).
// Sirve para sincronizar whooshes en SoundLayer. Considera el solape TDUR.
const cutFrames = (scenes) => {
  const cuts = []
  let start = 0
  ;(scenes || []).forEach((s, i) => {
    if (i > 0) cuts.push(start)
    start += (s.durationInFrames || 90) - TDUR
  })
  return cuts
}

export const VideoFromSpec = ({ spec }) => {
  const theme = spec.accent ? applyAccent(getTheme(spec.theme), spec.accent) : getTheme(spec.theme)
  const sc = spec.scenes || []
  const seed = typeof spec.seed === 'number' ? spec.seed : (spec.brand || '').length

  // Audio (Fase 3): si el spec trae audio sin whooshAt, los completamos con los cortes.
  const audio = spec.audio
    ? { ...spec.audio, whooshAt: spec.audio.whooshAt || cutFrames(sc) }
    : null

  return (
    <AbsoluteFill style={{ backgroundColor: theme.bgSolid }}>
      <TransitionSeries>
        {sc.flatMap((s, i) => {
          const Comp = REGISTRY[s.type] || KineticStatement
          const dur = s.durationInFrames || 90
          const inner = <Comp theme={theme} {...s} />
          const content = spec.motionBlur
            ? <CameraMotionBlur shutterAngle={120} samples={6}>{inner}</CameraMotionBlur>
            : inner
          const seq = (
            <TransitionSeries.Sequence key={`s${i}`} durationInFrames={dur}>
              {content}
            </TransitionSeries.Sequence>
          )
          if (i === 0) return [seq]
          const t = pickTransition(i, seed)
          return [
            <TransitionSeries.Transition key={`t${i}`} presentation={t.presentation} timing={t.timing} />,
            seq,
          ]
        })}
      </TransitionSeries>
      {spec.finish !== false && <FinishLayer />}
      <SoundLayer audio={audio} />
    </AbsoluteFill>
  )
}

export default VideoFromSpec
