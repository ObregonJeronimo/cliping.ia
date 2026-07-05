// audioMix — mezcla los clips de SFX del timeline. Para el EXPORT: un unico AudioBuffer via OfflineAudioContext (mux por
// MediaRecorder). Para el PREVIEW: agenda los clips en un AudioContext vivo. Clips = video.timeline.audio = [{id,sfx,startSec,durSec,gain}].
import { sfxBuffer } from './sfxLib.js'
import { isAsset, decodeAsset, decodeUrl, cachedAsset } from './audioAssets.js'

const _gainOf = (c) => (c && c.gain != null ? c.gain : 0.9)
const _isUpload = (id) => typeof id === 'string' && id.indexOf('up:') === 0   // subida del usuario (Storage) -> la URL viaja en el clip
// aplica la envolvente de ganancia (fade in/out) a un GainNode en tiempos ABSOLUTOS del contexto [startT, endT]. Sin fades
// -> ganancia constante. Los fades se clampean a la mitad del segmento (no se cruzan). 0.0001 en vez de 0 (linearRamp no llega a 0).
function _envelope(g, gv, startT, endT, fadeIn, fadeOut) {
  const seg = Math.max(0.001, endT - startT)
  const fi = Math.max(0, Math.min(fadeIn || 0, seg / 2))
  const fo = Math.max(0, Math.min(fadeOut || 0, seg / 2))
  if (fi <= 0 && fo <= 0) { g.gain.value = gv; return }
  g.gain.setValueAtTime(fi > 0 ? 0.0001 : gv, startT)
  if (fi > 0) g.gain.linearRampToValueAtTime(gv, startT + fi)
  if (fo > 0) { g.gain.setValueAtTime(gv, Math.max(startT + fi, endT - fo)); g.gain.linearRampToValueAtTime(0.0001, endT) }
}
// resuelve el AudioBuffer de un clip: subida del usuario (decode desde su URL), asset built-in (decode del archivo) o
// sintetizado (generado en el acto). Puede tardar (fetch+decode la 1ra vez) -> el mix del export lo AWAITEA. null -> se saltea.
async function resolveBuffer(ctx, c) {
  const id = c.sfx || c.id
  if (_isUpload(id)) return c.url ? await decodeUrl(ctx, id, c.url) : null
  return isAsset(id) ? await decodeAsset(ctx, id) : sfxBuffer(ctx, id)
}

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
      const buf = await resolveBuffer(ctx, c)
      if (!buf) continue
      const src = ctx.createBufferSource(); src.buffer = buf
      const g = ctx.createGain()
      src.connect(g); g.connect(ctx.destination)
      const startT = Math.max(0, c.startSec || 0)
      const loop = !!c.loop
      const segDur = loop ? Math.max(0.05, dur - startT) : (buf.duration || c.durSec || 0.3)   // loop -> repite hasta el final del video
      const endT = startT + segDur
      _envelope(g, _gainOf(c), startT, endT, c.fadeIn, c.fadeOut)
      if (loop) { src.loop = true; src.start(startT); src.stop(endT) }
      else src.start(startT)
    } catch (e) { /* clip invalido -> saltea */ }
  }
  return ctx.startRendering()
}

// playPreview(video, fromSec) — agenda los clips en un AudioContext vivo relativo al playhead. Devuelve { stop() }.
// Los sintetizados se agendan en el acto; los ARCHIVOS que aún no están en cache se decodifican async y se agendan al
// terminar, anclados al reloj original (t0) para que el decode no los desfase. stopped corta los que llegan tarde.
export function playPreview(video, fromSec = 0) {
  const clips = video && video.timeline && video.timeline.audio
  const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)
  if (!clips || !clips.length || !AC) return { stop() {} }
  const ctx = new AC(); try { ctx.resume() } catch (e) { /* autoplay: se resume con el gesto del play */ }
  const t0 = ctx.currentTime; const srcs = []; let stopped = false
  const vdur = Math.max(0.1, (video && video.duration) || 1)
  const schedule = (buf, c) => {
    if (stopped || !buf) return
    const start = (c.startSec || 0) - fromSec
    const segFull = c.loop ? Math.max(0.05, vdur - (c.startSec || 0)) : (buf.duration || c.durSec || 0.3)
    if (start + segFull < 0) return   // el clip ya terminó antes del playhead
    try {
      const src = ctx.createBufferSource(); src.buffer = buf
      const g = ctx.createGain()
      src.connect(g); g.connect(ctx.destination)
      const offset = start < 0 ? -start : 0
      const at = Math.max(ctx.currentTime, t0 + Math.max(0, start))
      const endAt = t0 + Math.max(0, start) + segFull
      _envelope(g, _gainOf(c), at, Math.max(at + 0.02, endAt), c.fadeIn, c.fadeOut)
      if (c.loop) { src.loop = true; src.start(at, offset); src.stop(Math.max(at + 0.02, endAt)) }
      else src.start(at, offset)
      srcs.push(src)
    } catch (e) { /* noop */ }
  }
  for (const c of clips) {
    const id = c.sfx || c.id
    const upload = _isUpload(id)
    if (upload || isAsset(id)) {
      const cached = cachedAsset(id, ctx.sampleRate)
      if (cached) schedule(cached, c)
      else (upload ? decodeUrl(ctx, id, c.url) : decodeAsset(ctx, id)).then(buf => schedule(buf, c)).catch(() => { /* noop */ })
    } else {
      try { schedule(sfxBuffer(ctx, id), c) } catch (e) { /* noop */ }
    }
  }
  return { stop() { stopped = true; for (const s of srcs) { try { s.stop() } catch (e) {} } try { ctx.close() } catch (e) {} } }
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
