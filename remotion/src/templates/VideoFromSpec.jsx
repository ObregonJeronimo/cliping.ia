import { AbsoluteFill, Easing, useCurrentFrame } from 'remotion'
import { TransitionSeries, linearTiming, springTiming } from '@remotion/transitions'
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
import IllustrationScene from './scenes/IllustrationScene'
import FinishLayer from './FinishLayer'
import SoundLayer from './SoundLayer'
import Backdrop, { ContinuousBg } from './Backdrop'

// Carga Inter (pesos puntuales).
loadFont('normal', { weights: ['400', '600', '700'], subsets: ['latin'], ignoreTooManyRequestsWarning: true })

/**
 * VideoFromSpec — arma el video desde un storyboard spec.
 * spec = { theme, scenes: [{ type, durationInFrames, ...props }], motionBlur? }
 *
 * Transiciones con continuidad: pool curado que varía por corte (fade/slide/wipe),
 * todas con duración fija TDUR (para que el cálculo de total sea exacto).
 */

const REGISTRY = { KineticStatement, IntegrationCluster, MockupShowcase, CtaOutro, IconTransform, StatReveal, Comparison, Testimonial, SocialProof, FeatureList, LogoReveal, IllustrationScene }
const TDUR = 14
const DEFAULT_ART = { camera: 'drift', entrance: 'rise', motif: 'none', transitions: 'mixed' }

// Transiciones (factories). El SET se elige por art.transitions, así un video puede
// ser todo fundidos suaves y otro a pura cortina/slide -> se sienten distintos.
// Duración fija TDUR (para que el cálculo de total sea exacto), pero NO lineal:
//  · eased  -> acelera y frena suave (cinematográfico, no robótico).
//  · spring -> con un poco de vida/inercia (clampado a TDUR para no romper el total).
const EASED  = linearTiming({ durationInFrames: TDUR, easing: Easing.inOut(Easing.cubic) })
const SPRING = (damping) => springTiming({ config: { damping, mass: 0.7, stiffness: 120 }, durationInFrames: TDUR, durationRestThreshold: 0.0001 })
const ease = (presentation) => ({ presentation, timing: EASED })
const sprg = (presentation, damping = 160) => ({ presentation, timing: SPRING(damping) })
const tx = {
  fade:    () => ease(fade()),
  slideR:  () => ease(slide({ direction: 'from-right' })),
  slideL:  () => ease(slide({ direction: 'from-left' })),
  slideB:  () => ease(slide({ direction: 'from-bottom' })),
  slideT:  () => ease(slide({ direction: 'from-top' })),
  wipeL:   () => ease(wipe({ direction: 'from-left' })),
  wipeR:   () => ease(wipe({ direction: 'from-right' })),
  wipeT:   () => ease(wipe({ direction: 'from-top' })),
  wipeTL:  () => ease(wipe({ direction: 'from-top-left' })),
  wipeBR:  () => ease(wipe({ direction: 'from-bottom-right' })),
  // versiones con vida para el set 'slides'
  springR: () => sprg(slide({ direction: 'from-right' })),
  springB: () => sprg(slide({ direction: 'from-bottom' })),
  springL: () => sprg(slide({ direction: 'from-left' })),
}
const POOLS = {
  mixed:  [tx.fade, tx.slideR, tx.wipeL, tx.slideB, tx.fade, tx.wipeTL, tx.slideL, tx.wipeT],
  soft:   [tx.fade],                                                // todo fundido (elegante/premium)
  slides: [tx.springR, tx.slideB, tx.springL, tx.slideT, tx.springB], // con inercia
  wipes:  [tx.wipeL, tx.wipeTL, tx.wipeR, tx.fade, tx.wipeBR, tx.wipeT],
}

const pickTransition = (i, seed, set) => {
  const pool = POOLS[set] || POOLS.mixed
  return pool[(i + seed) % pool.length]()
}

// SceneShell — envuelve el contenido de cada escena y le da SALIDA (no solo entrada): en los
// últimos frames el contenido se eleva apenas, se achica un toque y se desvanece, sincronizado
// con el crossfade. Así el contenido "se va con gracia" en vez de cortar seco. La última escena
// no tiene salida (no hay nada después).
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x)
const SceneShell = ({ durationInFrames, exit, children }) => {
  const frame = useCurrentFrame()
  const EXIT = 18
  const p = exit ? clamp01((frame - (durationInFrames - EXIT)) / EXIT) : 0
  const e = p * p * (3 - 2 * p) // smoothstep: acelera la salida suave
  return (
    <div style={{ position: 'absolute', inset: 0, transformOrigin: '50% 48%',
      transform: `translateY(${-30 * e}px) scale(${1 - 0.05 * e})`, opacity: 1 - 0.45 * e }}>
      {children}
    </div>
  )
}

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
  const base = spec.accent ? applyAccent(getTheme(spec.theme), spec.accent) : getTheme(spec.theme)
  const art = { ...DEFAULT_ART, ...(spec.art || {}) }
  const theme = { ...base, art }   // las escenas leen theme.art para cámara/entrada
  // Las escenas van TRANSPARENTES: el fondo lo pinta ContinuousBg (único y continuo),
  // así no corta en cada transición -> sensación fusionada/fluida (estilo Canva).
  const sceneTheme = { ...theme, bg: 'transparent' }
  const sc = spec.scenes || []
  const seed = typeof spec.seed === 'number' ? spec.seed : (spec.brand || '').length

  // Audio (Fase 3): si el spec trae audio sin whooshAt, los completamos con los cortes.
  const audio = spec.audio
    ? { ...spec.audio, whooshAt: spec.audio.whooshAt || cutFrames(sc) }
    : null

  return (
    <AbsoluteFill style={{ backgroundColor: theme.bgSolid }}>
      <ContinuousBg theme={theme} />
      <TransitionSeries>
        {sc.flatMap((s, i) => {
          const Comp = REGISTRY[s.type] || KineticStatement
          const dur = s.durationInFrames || 90
          const inner = <Comp theme={sceneTheme} {...s} />
          const blurred = spec.motionBlur
            ? <CameraMotionBlur shutterAngle={120} samples={6}>{inner}</CameraMotionBlur>
            : inner
          const content = (
            <SceneShell durationInFrames={dur} exit={i < sc.length - 1}>
              {blurred}
            </SceneShell>
          )
          const seq = (
            <TransitionSeries.Sequence key={`s${i}`} durationInFrames={dur}>
              {content}
            </TransitionSeries.Sequence>
          )
          if (i === 0) return [seq]
          // Fundido (crossfade) entre escenas: el contenido se funde sobre el fondo continuo.
          // Es lo que da la sensación "fusionada"; las cortinas/slides cortaban la continuidad.
          return [
            <TransitionSeries.Transition key={`t${i}`} presentation={fade()} timing={EASED} />,
            seq,
          ]
        })}
      </TransitionSeries>
      <Backdrop theme={theme} kind={art.motif} />
      {spec.finish !== false && <FinishLayer />}
      <SoundLayer audio={audio} />
    </AbsoluteFill>
  )
}

export default VideoFromSpec
