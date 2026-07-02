// audioMix — mezcla los clips de SFX del timeline. Para el EXPORT: un unico AudioBuffer via OfflineAudioContext (mux por
// MediaRecorder). Para el PREVIEW: agenda los clips en un AudioContext vivo. Clips = video.timeline.audio = [{id,sfx,startSec,durSec,gain}].
import { sfxBuffer } from './sfxLib.js'

const _gainOf = (c) => (c && c.gain != null ? c.gain : 0.9)

// mixTimeline(video, sampleRate) -> Promise<AudioBuffer|null>. null si no hay clips o no hay OfflineAudioContext.
export async function mixTimeline(video, sampleRate = 48000) {
  const clips = video && video.timeline && video.timeline.audio
  if (!clips || !clips.length) return null
  const OAC = typeof window !== 'undefined' && (window.OfflineAudioContext || window.webkitOfflineAudioContext)
  if (!OAC) return null
  const dur = Math.max(0.1, video.duration || 1)
  const ctx = new OAC(2, Math.ceil(dur * sampleRate), sampleRate)
  for (const c of clips) {
    try {
      const buf = sfxBuffer(ctx, c.sfx || c.id)
      const src = ctx.createBufferSource(); src.buffer = buf
      const g = ctx.createGain(); g.gain.value = _gainOf(c)
      src.connect(g); g.connect(ctx.destination)
      src.start(Math.max(0, c.startSec || 0))
    } catch (e) { /* clip invalido -> saltea */ }
  }
  return ctx.startRendering()
}

// playPreview(video, fromSec) — agenda los clips en un AudioContext vivo relativo al playhead. Devuelve { stop() }.
export function playPreview(video, fromSec = 0) {
  const clips = video && video.timeline && video.timeline.audio
  const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)
  if (!clips || !clips.length || !AC) return { stop() {} }
  const ctx = new AC(); const now = ctx.currentTime; const srcs = []
  for (const c of clips) {
    const start = (c.startSec || 0) - fromSec
    if (start + (c.durSec || 0.3) < 0) continue   // el clip ya termino antes del playhead
    try {
      const buf = sfxBuffer(ctx, c.sfx || c.id)
      const src = ctx.createBufferSource(); src.buffer = buf
      const g = ctx.createGain(); g.gain.value = _gainOf(c)
      src.connect(g); g.connect(ctx.destination)
      const offset = start < 0 ? -start : 0
      src.start(now + Math.max(0, start), offset)
      srcs.push(src)
    } catch (e) { /* noop */ }
  }
  return { stop() { for (const s of srcs) { try { s.stop() } catch (e) {} } try { ctx.close() } catch (e) {} } }
}

// bufferToStreamTrack(mix) -> { track, start() } | null — convierte el mix en un MediaStreamTrack de audio para agregarlo
// al captureStream del MediaRecorder. Llamar start() cuando arranca la grabacion (sincroniza el audio con el video).
export function bufferToStreamTrack(mix) {
  const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)
  if (!AC || !mix) return null
  const ctx = new AC()
  const dest = ctx.createMediaStreamDestination()
  const src = ctx.createBufferSource(); src.buffer = mix; src.connect(dest)
  const track = dest.stream.getAudioTracks()[0]
  return track ? { track, ctx, start: () => { try { ctx.resume() } catch (e) {} try { src.start() } catch (e) {} }, stop: () => { try { ctx.close() } catch (e) {} } } : null
}
