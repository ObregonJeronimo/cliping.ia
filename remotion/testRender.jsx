// testRender.jsx — entry de Remotion para renderizar UN timeline a MP4 real (fidelidad total: mismo
// Chromium headless que produce la app). Solo para testeo/fidelidad; el render de produccion arma su
// propio Root dinamico. Uso:
//   cd remotion && npx remotion render testRender.jsx Brand ../tools/out/<name>.mp4 --props=<props.json>
// donde props.json = { "timeline": { ...timeline... } }
import { registerRoot, Composition } from 'remotion'
import { TimelineVideo } from './src/compositions/TimelineVideo'

const FPS = 30
function totalFrames(tl) {
  const scenes = (tl && tl.scenes) || []
  if (!scenes.length) return (tl && tl.durationInFrames) || 732
  return scenes.reduce((a, s) => a + Math.max(30, s.durationInFrames || 120), 0)
}

const RemotionRoot = () => (
  <Composition
    id="Brand"
    component={TimelineVideo}
    fps={FPS}
    width={1080}
    height={1920}
    defaultProps={{ timeline: null }}
    calculateMetadata={({ props }) => ({ durationInFrames: totalFrames(props.timeline) })}
  />
)

registerRoot(RemotionRoot)
