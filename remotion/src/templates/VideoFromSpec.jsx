import { AbsoluteFill, Sequence, useCurrentFrame, interpolate } from 'remotion'
import { loadFont } from '@remotion/google-fonts/Inter'
import { getTheme } from './theme'
import KineticStatement from './scenes/KineticStatement'
import IntegrationCluster from './scenes/IntegrationCluster'
import MockupShowcase from './scenes/MockupShowcase'
import CtaOutro from './scenes/CtaOutro'
import IconTransform from './scenes/IconTransform'

// Carga Inter (pesos puntuales) para que las escenas usen la tipografía real del estilo.
loadFont('normal', { weights: ['400', '600', '700'], subsets: ['latin'], ignoreTooManyRequestsWarning: true })

/**
 * VideoFromSpec — arma el video completo a partir de un storyboard spec.
 *
 * spec = {
 *   theme: 'saas-explainer',
 *   scenes: [ { type, durationInFrames, ...props }, ... ]
 * }
 *
 * Cada escena se ubica con un solape de FADE frames para crossfade.
 */

const REGISTRY = { KineticStatement, IntegrationCluster, MockupShowcase, CtaOutro, IconTransform }
const FADE = 12

const Fader = ({ duration, children }) => {
  const frame = useCurrentFrame()
  const opIn = interpolate(frame, [0, FADE], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const opOut = interpolate(frame, [duration - FADE, duration], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  return <AbsoluteFill style={{ opacity: Math.min(opIn, opOut) }}>{children}</AbsoluteFill>
}

export const computeTotal = (scenes) => {
  let cursor = 0, last = 0
  scenes.forEach((s, i) => {
    const dur = s.durationInFrames || 90
    const from = i === 0 ? 0 : cursor
    last = from + dur
    cursor = from + dur - FADE
  })
  return last
}

export const VideoFromSpec = ({ spec }) => {
  const theme = getTheme(spec.theme)
  let cursor = 0
  const placed = (spec.scenes || []).map((s, i) => {
    const dur = s.durationInFrames || 90
    const from = i === 0 ? 0 : cursor
    cursor = from + dur - FADE
    return { s, from, dur }
  })

  return (
    <AbsoluteFill style={{ backgroundColor: theme.bgSolid }}>
      {placed.map(({ s, from, dur }, i) => {
        const Comp = REGISTRY[s.type] || KineticStatement
        return (
          <Sequence key={i} from={from} durationInFrames={dur}>
            <Fader duration={dur}>
              <Comp theme={theme} {...s} />
            </Fader>
          </Sequence>
        )
      })}
    </AbsoluteFill>
  )
}

export default VideoFromSpec
