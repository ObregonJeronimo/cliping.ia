// Export de video del motor urvid (browser-only). DOS caminos bajo la MISMA firma exportCanvasVideo(video, opts):
//   1) WebCodecs (mediabunny) — DETERMINISTA frame-a-frame (item L156/L820): cada cuadro se dibuja en t=i/fps y se codifica
//      H.264/MP4 SIN tiempo real -> sin cuadros perdidos por carga del sistema, cadencia exacta, calidad pareja. Preferido.
//   2) MediaRecorder — fallback en TIEMPO REAL (captureStream) si el navegador no tiene VideoEncoder o si WebCodecs falla en
//      cualquier punto -> el usuario SIEMPRE obtiene un video. = el export previo (unificado L134 + logo-frame0 L138 + cadencia L828).
// Cero backend / cero costo de servidor. Lo comparten urvid IA (flujo principal) y urvid IA Advanced (craft). El patron
// WebCodecs+mediabunny (import del CDN esm.sh, sin dependencia npm) ya esta probado y andando en AnimLab.
import { drawFrame } from '../urvid/index.js'

const MIME_TYPES = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm']

function download(blob, filename, ext) {
  const href = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = href; a.download = `${String(filename).replace(/\s+/g, '-')}.${ext}`
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(href), 5000)
}

// Espera a que el LOGO este decodeado (o timeout duro 1.5s) -> el cuadro 0 sale CON la marca (item L138). Resuelve SIEMPRE.
function preloadLogo(video) {
  return new Promise(resolve => {
    if (!video || !video.logo) return resolve()
    let done = false; const finish = () => { if (!done) { done = true; resolve() } }
    const img = new Image()
    try { img.crossOrigin = 'anonymous' } catch { /* noop */ }
    img.onload = finish; img.onerror = finish; img.src = video.logo
    setTimeout(finish, 1500)
  })
}
const rafTwice = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))

// CAMINO 1 — WebCodecs (mediabunny): MP4 DETERMINISTA frame-a-frame. Async; LANZA si no hay soporte o si algo falla
// (el dispatcher lo captura y cae a MediaRecorder). Cada cuadro se dibuja en t=i/fps -> reproducible, sin cuadros perdidos.
async function exportWithWebCodecs(video, opts) {
  const { filename = 'urvid', fps = 30, onProgress, onDone } = opts
  const scale = 1080 / video.W
  const ecv = document.createElement('canvas')
  ecv.width = Math.round(video.W * scale); ecv.height = Math.round(video.H * scale)
  const ectx = ecv.getContext('2d')
  const dur = video.duration, frames = Math.max(1, Math.round(dur * fps))
  const drawAt = (t) => { ectx.setTransform(scale, 0, 0, scale, 0, 0); drawFrame(ectx, Math.min(t, dur), video) }
  // LOGO desde el cuadro 0: precarga (calienta el cache HTTP) -> warm-up drawFrame(0) (instancia la Image interna del logo)
  // -> 2 rAF para que su decode dispare, ANTES de codificar el cuadro 0. (mismo objetivo que L138 en el camino MediaRecorder.)
  await preloadLogo(video); drawAt(0); await rafTwice()
  const MB = await import(/* @vite-ignore */ 'https://esm.sh/mediabunny')
  const out = new MB.Output({ format: new MB.Mp4OutputFormat(), target: new MB.BufferTarget() })
  const source = new MB.CanvasSource(ecv, { codec: 'avc', bitrate: MB.QUALITY_HIGH })
  out.addVideoTrack(source)
  await out.start()
  for (let i = 0; i < frames; i++) {
    drawAt(i / fps)                          // cuadro DETERMINISTA en t = i/fps (no tiempo real -> sin cuadros perdidos)
    await source.add(i / fps, 1 / fps)
    if (onProgress && i % 3 === 0) onProgress(Math.round(i / frames * 100))
  }
  await out.finalize()
  download(new Blob([out.target.buffer], { type: 'video/mp4' }), filename, 'mp4')
  if (onProgress) onProgress(100)
  if (onDone) onDone()
}

// CAMINO 2 — MediaRecorder (fallback en tiempo real). = el export previo (L134/L138/L828). Devuelve true/false SYNC.
function exportWithMediaRecorder(video, opts = {}) {
  const { filename = 'urvid', bitrate = 12e6, fps = 30, onProgress, onError, onDone } = opts
  const fail = (m) => { if (onError) onError(m); return false }
  if (typeof window === 'undefined' || typeof window.MediaRecorder === 'undefined') return fail('Tu navegador no soporta exportar')
  const scale = 1080 / video.W
  const ecv = document.createElement('canvas')
  ecv.width = Math.round(video.W * scale); ecv.height = Math.round(video.H * scale)
  if (typeof ecv.captureStream !== 'function') return fail('Tu navegador no soporta exportar')
  const ectx = ecv.getContext('2d')
  const mime = MIME_TYPES.find(t => { try { return MediaRecorder.isTypeSupported(t) } catch { return false } }) || ''
  const ext = mime.indexOf('mp4') >= 0 ? 'mp4' : 'webm'
  let rec
  try { rec = new MediaRecorder(ecv.captureStream(fps), mime ? { mimeType: mime, videoBitsPerSecond: bitrate } : { videoBitsPerSecond: bitrate }) }
  catch { return fail('No se pudo iniciar la grabacion') }
  const chunks = []
  rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data) }
  rec.onstop = () => {
    download(new Blob(chunks, { type: mime || 'video/webm' }), filename, ext)
    if (onDone) onDone()
  }
  const dur = video.duration
  const startRecording = () => {
    rec.start()
    const t0 = performance.now()
    // CADENCIA CONSTANTE (item L828): presenta un cuadro nuevo SOLO al cruzar el proximo tick de 1/fps -> pasos parejos.
    const frameDur = 1 / fps
    let nextFrame = 0
    const tick = () => {
      const el = (performance.now() - t0) / 1000
      if (el >= nextFrame) {
        ectx.setTransform(scale, 0, 0, scale, 0, 0)
        drawFrame(ectx, Math.min(el, dur), video)
        if (onProgress) onProgress(Math.min(100, Math.round(el / dur * 100)))
        nextFrame += frameDur
        if (nextFrame < el) nextFrame = el + frameDur   // rAF atrasado (tab en 2do plano): reprograma, no dispares una rafaga
      }
      if (el >= dur + 0.1) { try { rec.stop() } catch { /* noop */ } }
      else requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }
  // LOGO desde el cuadro 0 (item L138): warm-up + 2 rAF antes de grabar; timeout duro 1.5s (nunca cuelga).
  if (video.logo) {
    let started = false
    const go = () => {
      if (started) return
      started = true
      ectx.setTransform(scale, 0, 0, scale, 0, 0); drawFrame(ectx, 0, video)
      requestAnimationFrame(() => requestAnimationFrame(startRecording))
    }
    const img = new Image()
    try { img.crossOrigin = 'anonymous' } catch { /* noop */ }
    img.onload = go; img.onerror = go
    img.src = video.logo
    setTimeout(go, 1500)
  } else {
    startRecording()
  }
  return true
}

// DISPATCHER: prefiere WebCodecs (MP4 determinista) y cae a MediaRecorder si no hay VideoEncoder o si WebCodecs FALLA en
// cualquier punto -> el usuario siempre obtiene un video. Mantiene la firma SYNC (true si arranco un camino). El progreso/fin
// van por callbacks -> el caller no distingue el camino. opts: { filename, bitrate, fps, onProgress(pct), onError(msg), onDone() }.
export function exportCanvasVideo(video, opts = {}) {
  const { onError } = opts
  if (typeof window === 'undefined' || typeof document === 'undefined') { if (onError) onError('Tu navegador no soporta exportar'); return false }
  if (typeof window.VideoEncoder !== 'undefined') {
    exportWithWebCodecs(video, opts).catch(err => {
      console.warn('[export] WebCodecs fallo -> MediaRecorder', err)
      exportWithMediaRecorder(video, opts)   // fallback robusto
    })
    return true
  }
  return exportWithMediaRecorder(video, opts)
}
