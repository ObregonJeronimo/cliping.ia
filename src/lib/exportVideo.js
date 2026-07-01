// Export de video del motor urvid (browser-only). Graba un canvas OFFSCREEN a resolucion REAL (1080 de ancho ->
// 1080x1920 en 9:16) con MediaRecorder: una vuelta EXACTA (0..duration) dibujada con drawFrame por t (determinista,
// pixel-estable). Cero backend / cero costo de servidor. Es el UNICO camino de export -> urvid IA (flujo principal) y
// urvid IA Advanced (craft) lo COMPARTEN. Antes Urvid1 grababa el canvas del preview VIVO (menor resolucion = W*DPR,
// acoplado al loop de reproduccion); UrvidCraft ya usaba este metodo offscreen -> unificado (item L134).
import { drawFrame } from '../urvid/index.js'

const MIME_TYPES = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm']

// Arranca la grabacion. Devuelve true si arranco, false si el navegador no soporta (y ya llamo onError).
// opts: { filename, bitrate=12e6, fps=30, onProgress(pct), onError(msg), onDone() } — callbacks opcionales.
export function exportCanvasVideo(video, opts = {}) {
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
    const blob = new Blob(chunks, { type: mime || 'video/webm' }), href = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = href; a.download = `${String(filename).replace(/\s+/g, '-')}.${ext}`
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(href), 4000)
    if (onDone) onDone()
  }
  const dur = video.duration
  const startRecording = () => {
    rec.start()
    const t0 = performance.now()
    // CADENCIA CONSTANTE (item L828): antes se redibujaba en CADA rAF (60/120Hz + jitter segun el monitor) -> presentacion
    // despareja al stream de 30fps. Ahora presentamos un cuadro nuevo SOLO al cruzar el proximo tick de 1/fps -> pasos parejos
    // garantizados (30 fijo por defecto) + ~mitad/cuarto de draws. La grabacion sigue atada al reloj (stop en dur) -> la
    // duracion del mp4 no cambia; lo que se empareja es la separacion entre cuadros. La firma sync no cambia.
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
  // PRECARGA del LOGO (item L138): el logo se decodea async y drawFrame lo SALTEA hasta que esta listo -> antes salia recien
  // tras 1-2 loops (el opener exportaba SIN marca). Calentamos el cache + un warm-up drawFrame antes de grabar -> la marca
  // aparece desde el frame 0. Timeout DURO (1.5s): si el logo tarda o falla, el export arranca igual (nunca cuelga).
  if (video.logo) {
    let started = false
    const go = () => {
      if (started) return
      started = true
      ectx.setTransform(scale, 0, 0, scale, 0, 0); drawFrame(ectx, 0, video)   // warm-up: instancia la Image del logo con el cache HTTP ya caliente
      requestAnimationFrame(() => requestAnimationFrame(startRecording))        // 2 frames para que el onload del logo dispare antes de grabar
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
