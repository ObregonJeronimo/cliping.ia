import { Audio, Sequence, staticFile, useVideoConfig } from 'remotion'

/**
 * SoundLayer — capa de sonido global (Fase 3). Toda la parte TÉCNICA cableada;
 * solo falta tirar archivos royalty-free en `remotion/public/audio/` y activarlos
 * desde el spec. Sin archivos => no suena nada (no rompe el render).
 *
 * Convención de archivos (en remotion/public/audio/):
 *   music/<nombre>.mp3   -> camas musicales por mood
 *   sfx/whoosh.mp3       -> barrido para transiciones
 *   sfx/tick.mp3         -> tick sutil para entradas/acentos
 *
 * Forma del spec.audio (todo opcional):
 *   spec.audio = {
 *     music: "calm" | "energetic" | ...   // nombre de archivo sin extensión en audio/music/
 *     musicVolume: 0.18,                   // 0..1 (default 0.18)
 *     whooshAt: [42, 96, 150],             // frames donde pegar un whoosh (cortes)
 *     whooshVolume: 0.5,
 *   }
 *
 * El director, cuando haya música disponible, elige `music` por mood y llena
 * `whooshAt` con los frames de corte (inicio de cada escena salvo la primera).
 * Hasta entonces el campo no se setea y esta capa es inerte.
 */

export const SoundLayer = ({ audio }) => {
  const { durationInFrames } = useVideoConfig()
  if (!audio || typeof audio !== 'object') return null

  const musicVol = typeof audio.musicVolume === 'number' ? audio.musicVolume : 0.18
  const whooshVol = typeof audio.whooshVolume === 'number' ? audio.whooshVolume : 0.5
  const whooshAt = Array.isArray(audio.whooshAt) ? audio.whooshAt : []

  return (
    <>
      {audio.music && (
        <Audio
          src={staticFile(`audio/music/${audio.music}.mp3`)}
          volume={(f) =>
            // fade-in 0..18f y fade-out en los últimos 24f
            musicVol *
            Math.min(1, f / 18) *
            Math.min(1, Math.max(0, durationInFrames - f) / 24)
          }
        />
      )}

      {audio.whoosh !== false && whooshAt.map((f, i) => (
        <Sequence key={i} from={Math.max(0, Math.round(f) - 6)} durationInFrames={24}>
          <Audio src={staticFile('audio/sfx/whoosh.mp3')} volume={whooshVol} />
        </Sequence>
      ))}
    </>
  )
}

export default SoundLayer
