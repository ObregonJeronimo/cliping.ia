import { AbsoluteFill, Easing, Img, useCurrentFrame, useVideoConfig } from 'remotion'
import { TransitionSeries, linearTiming } from '@remotion/transitions'
import { fade } from '@remotion/transitions/fade'
import { slide } from '@remotion/transitions/slide'
import { CameraMotionBlur } from '@remotion/motion-blur'
import { loadFont } from '@remotion/google-fonts/Inter'
import { getTheme, applyAccent } from './theme'
import { clamp } from './theme'
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
import ProcessSteps from './scenes/ProcessSteps'
import OfferPrice from './scenes/OfferPrice'
import MapLocation from './scenes/MapLocation'
import ProductShowcase from './scenes/ProductShowcase'
import FinishLayer from './FinishLayer'
import SoundLayer from './SoundLayer'
import Backdrop, { ContinuousBg } from './Backdrop'

// Carga Inter (pesos puntuales).
loadFont('normal', { weights: ['400', '600', '700'], subsets: ['latin'], ignoreTooManyRequestsWarning: true })

/**
 * VideoFromSpec — arma el video desde un storyboard spec.
 * spec = { theme, scenes: [{ type, durationInFrames, ...props }], motionBlur? }
 *
 * Fondo único continuo (ContinuousBg) + escenas transparentes + crossfade entre cortes
 * (duración fija TDUR para que el cálculo de total sea exacto) -> video fusionado/fluido.
 */

const REGISTRY = { KineticStatement, IntegrationCluster, MockupShowcase, CtaOutro, IconTransform, StatReveal, Comparison, Testimonial, SocialProof, FeatureList, LogoReveal, IllustrationScene, ProcessSteps, OfferPrice, MapLocation, ProductShowcase }
const TDUR = 14
// Perillas de INTENSIDAD del "dial" de variedad de Cine (0..1, el director las dosifica por publico/seriedad).
// Defaults neutros -> specs sin estos campos renderizan como siempre. glowIntensity ya la usa ContinuousBg.
const DEFAULT_ART = { camera: 'drift', entrance: 'rise', motif: 'none', decor: 'pills', glowIntensity: 1, glassDensity: 0.5, decorIntensity: 1 }

// Transición única: crossfade entre escenas sobre el fondo continuo (sensación fusionada).
// Duración fija TDUR (para que el cálculo de total sea exacto) y easing suave (no lineal).
const EASED = linearTiming({ durationInFrames: TDUR, easing: Easing.inOut(Easing.cubic) })

// SceneShell — envuelve el contenido de cada escena. Hace dos cosas:
//  1) ZONA SEGURA: sesga el contenido hacia arriba (SAFE_UP) para que el texto clave no quede
//     tapado por la UI de Reels/TikTok (botones a la derecha, caption/audio abajo).
//  2) SALIDA SINCRONIZADA: la salida se ADELANTA para terminar casi cuando arranca el crossfade
//     (TDUR), de modo que el contenido viejo ya está ~ido (opacidad ~0) cuando entra el nuevo.
//     Así no se superponen los dos contenidos ~0.5s; se siente "sale -> entra", no "los dos juntos".
//     La última escena no tiene salida (no hay nada después).
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x)
const SAFE_UP = 40
const EXIT_LEN = 20          // dura ~0.66s
const EXIT_END_PAD = 10      // termina ~10f antes del final (la transición dura TDUR=14)
const SceneShell = ({ durationInFrames, exit, children }) => {
  const frame = useCurrentFrame()
  const { width, height } = useVideoConfig()
  // En vertical (9:16) sesgamos hacia arriba para esquivar la UI de Reels/TikTok; en cuadrado/
  // horizontal el contenido va centrado (no hay esa UI abajo).
  const safeUp = (width / height) < 0.85 ? SAFE_UP : 0
  const end = durationInFrames - EXIT_END_PAD
  const p = exit ? clamp01((frame - (end - EXIT_LEN)) / EXIT_LEN) : 0
  const e = p * p * (3 - 2 * p) // smoothstep: acelera la salida suave
  return (
    <div style={{ position: 'absolute', inset: 0, transformOrigin: '50% 48%',
      transform: `translateY(${-safeUp - 52 * e}px) scale(${1 - 0.06 * e})`, opacity: 1 - e }}>
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

// Handle de marca sutil y PERSISTENTE: identidad en cada frame (recordación de marca). Arriba,
// dentro de la zona segura (lejos de la UI de Reels/TikTok). Se puede apagar con watermark:false.
// Capa táctil: viñeta suave (foco + profundidad) + grano fino (textura premium, menos "plano
// digital"). Sutil y apagable con tactile:false. Es lo que separa "limpio" de "se ve caro".
const TactileLayer = () => (
  <AbsoluteFill style={{ pointerEvents: 'none' }}>
    <AbsoluteFill style={{ background:
      'radial-gradient(ellipse 75% 65% at 50% 42%, transparent 52%, rgba(0,0,0,0.34) 100%)' }} />
    <svg width="100%" height="100%" preserveAspectRatio="none"
      style={{ position: 'absolute', inset: 0, opacity: 0.05, mixBlendMode: 'overlay' }}>
      <filter id="cl-grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
      </filter>
      <rect width="100%" height="100%" filter="url(#cl-grain)" />
    </svg>
  </AbsoluteFill>
)

const BrandMark = ({ theme, brand, logo }) => {
  const frame = useCurrentFrame()
  if (!brand) return null
  const op = clamp((frame - 6) / 14, 0, 1) * 0.85
  const initial = (brand.trim()[0] || '').toUpperCase()
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-start', pointerEvents: 'none' }}>
      <div style={{ marginTop: 64, display: 'flex', alignItems: 'center', gap: 13, opacity: op,
        maxWidth: 820, overflow: 'hidden' }}>
        {logo
          ? <div style={{ width: 42, height: 42, borderRadius: 12, overflow: 'hidden', flex: '0 0 auto',
              background: '#fff', boxShadow: `0 4px 16px ${theme.accentTo}66`,
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Img src={logo} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
          : <div style={{ width: 42, height: 42, borderRadius: 12, backgroundImage: theme.accentGrad,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto',
              color: '#fff', fontWeight: 800, fontSize: 24, fontFamily: theme.font,
              boxShadow: `0 4px 16px ${theme.accentTo}66` }}>
              {initial}
            </div>}
        <span style={{ fontFamily: theme.font, fontWeight: 700, fontSize: 31, letterSpacing: '0.01em',
          color: theme.text, whiteSpace: 'nowrap' }}>{brand}</span>
      </div>
    </AbsoluteFill>
  )
}

export const VideoFromSpec = ({ spec }) => {
  const base = spec.accent ? applyAccent(getTheme(spec.theme), spec.accent) : getTheme(spec.theme)
  const art = { ...DEFAULT_ART, ...(spec.art || {}) }
  const theme = { ...base, art }   // las escenas leen theme.art para cámara/entrada
  // Las escenas van TRANSPARENTES: el fondo lo pinta ContinuousBg (único y continuo),
  // así no corta en cada transición -> sensación fusionada/fluida (estilo Canva).
  const sceneTheme = { ...theme, bg: 'transparent' }
  const sc = spec.scenes || []

  // ── Transiciones diseñadas por ENERGÍA ──────────────────────────────────────
  // Por defecto crossfade (fusionado, lo de hoy). Solo en energía ALTA se alternan slides
  // diseñados (presentaciones oficiales de Remotion) en cortes impares -> ritmo punchy con variedad.
  // El timing es fijo (EASED/TDUR) en TODAS las transiciones -> el total de frames sigue EXACTO.
  // medio/bajo: 100% fade -> idéntico a hoy, cero regresión.
  const energy = art.energy || 'medio'
  const isSlide = (i) => energy === 'alto' && i % 2 === 1
  const slideDir = (i) => (Math.floor(i / 2) % 2 === 0 ? 'from-right' : 'from-bottom')
  const presFor = (i) => (isSlide(i) ? slide({ direction: slideDir(i) }) : fade())

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
            <SceneShell durationInFrames={dur} exit={i < sc.length - 1 && !isSlide(i + 1)}>
              {blurred}
            </SceneShell>
          )
          const seq = (
            <TransitionSeries.Sequence key={`s${i}`} durationInFrames={dur}>
              {content}
            </TransitionSeries.Sequence>
          )
          if (i === 0) return [seq]
          // Transición del corte i: fade (fusionado) o slide diseñado si energía alta.
          // Si el corte es slide, la escena saliente NO hace su fade-scale de salida (evita doble
          // movimiento): la presentación del slide se encarga de sacarla.
          return [
            <TransitionSeries.Transition key={`t${i}`} presentation={presFor(i)} timing={EASED} />,
            seq,
          ]
        })}
      </TransitionSeries>
      <Backdrop theme={theme} kind={art.motif} />
      {spec.tactile !== false && <TactileLayer />}
      {spec.finish !== false && <FinishLayer />}
      {spec.watermark !== false && <BrandMark theme={theme} brand={spec.brand} logo={spec.brandLogo} />}
      <SoundLayer audio={audio} />
    </AbsoluteFill>
  )
}

export default VideoFromSpec
