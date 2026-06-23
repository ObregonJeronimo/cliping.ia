import { useCallback, useEffect, useRef, useState } from 'react'
import styles from './AnimLab.module.css'

// ANIMACIONES IA · PROTOTIPO (beta). Valida el loop riesgoso end-to-end, client-side:
//  1) reconocer/separar un objeto de una imagen con SAM (transformers.js, corre en el navegador);
//  2) recortarlo como sprite RGBA (capa);
//  3) dibujarle un PATH (recto o curvo) con clics;
//  4) animarlo por ese path (fluido, easing) y exportar un video (WebM, MediaRecorder).
// SAM se carga del CDN solo cuando tocas "Cargar modelo" (no pesa el bundle). Fallbacks sin SAM
// (objeto = imagen entera / subir PNG) para probar path+export aunque la segmentacion falle.
// Esto es un PROTOTIPO para de-riskear antes de invertir en la feature completa.

const STAGE_W = 480   // ancho de display del lienzo (el alto sale del aspecto de la imagen)
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

// Catmull-Rom -> puntos finos para el path curvo (suave). Recto = los anclas tal cual.
function sample(points, curved, segs = 22) {
  if (!curved || points.length < 3) return points.slice()
  const out = [], P = [points[0], ...points, points[points.length - 1]]
  for (let i = 1; i < P.length - 2; i++) {
    const p0 = P[i - 1], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2]
    for (let j = 0; j < segs; j++) {
      const t = j / segs, t2 = t * t, t3 = t2 * t
      out.push({
        x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      })
    }
  }
  out.push(points[points.length - 1])
  return out
}
// posicion a lo largo del path por LONGITUD DE ARCO (velocidad pareja).
function posAt(s, t) {
  if (!s.length) return null
  if (s.length === 1) return s[0]
  const seg = []; let total = 0
  for (let i = 1; i < s.length; i++) { const l = Math.hypot(s[i].x - s[i - 1].x, s[i].y - s[i - 1].y); seg.push(l); total += l }
  let d = t * total, i = 0
  while (i < seg.length && d > seg[i]) { d -= seg[i]; i++ }
  if (i >= seg.length) return s[s.length - 1]
  const f = seg[i] > 0 ? d / seg[i] : 0
  return { x: s[i].x + (s[i + 1].x - s[i].x) * f, y: s[i].y + (s[i + 1].y - s[i].y) * f }
}

export default function AnimLab() {
  const stageRef = useRef(null)
  const imgRef = useRef(null)            // HTMLImageElement original (fuente del recorte)
  const modelRef = useRef(null)          // { SamModel, processor, RawImage }
  const rafRef = useRef(null)
  const recRef = useRef(null)

  const [dims, setDims] = useState(null) // { w0, h0, sw, sh, scale }
  const [sprites, setSprites] = useState([]) // [{ id, canvas, bw, bh, homeX, homeY, path: [{x,y}], curved }]
  const [sel, setSel] = useState(-1)
  const [mode, setMode] = useState('segment') // 'segment' | 'path'
  const [curved, setCurved] = useState(true)
  const [duration, setDuration] = useState(3)
  const [playing, setPlaying] = useState(false)
  const [model, setModel] = useState('idle') // 'idle' | 'loading' | 'ready' | 'error'
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [exporting, setExporting] = useState('')

  const spritesRef = useRef(sprites); spritesRef.current = sprites
  const selRef = useRef(sel); selRef.current = sel
  const modeRef = useRef(mode); modeRef.current = mode

  // ---- dibujo del lienzo (estatico o animado por t) ----
  const draw = useCallback((t) => {
    const cv = stageRef.current; if (!cv || !dims) return
    const ctx = cv.getContext('2d'), { sw, sh, scale } = dims
    ctx.setTransform(cv.width / sw, 0, 0, cv.width / sw, 0, 0)
    ctx.clearRect(0, 0, sw, sh)
    // fondo: la imagen original atenuada (para que la capa que se mueve se distinga)
    if (imgRef.current) { ctx.globalAlpha = 0.28; ctx.drawImage(imgRef.current, 0, 0, sw, sh); ctx.globalAlpha = 1 }
    const list = spritesRef.current
    for (let k = 0; k < list.length; k++) {
      const sp = list[k]
      let cx = sp.homeX, cy = sp.homeY
      if (sp.path.length >= 2) { const p = posAt(sample(sp.path, sp.curved), easeInOut(t ?? 0)); if (p) { cx = p.x; cy = p.y } }
      const dw = sp.bw * scale, dh = sp.bh * scale
      ctx.drawImage(sp.canvas, cx - dw / 2, cy - dh / 2, dw, dh)
    }
    // overlay del path del sprite seleccionado (solo en modo path / estatico)
    if ((t == null) && modeRef.current === 'path' && selRef.current >= 0 && list[selRef.current]) {
      const sp = list[selRef.current]
      if (sp.path.length) {
        const fine = sp.path.length >= 2 ? sample(sp.path, sp.curved) : sp.path
        ctx.lineWidth = 2; ctx.strokeStyle = '#7048e8'; ctx.beginPath()
        fine.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke()
        // flecha al final
        if (fine.length >= 2) {
          const a = fine[fine.length - 2], b = fine[fine.length - 1], ang = Math.atan2(b.y - a.y, b.x - a.x)
          ctx.fillStyle = '#7048e8'; ctx.beginPath(); ctx.moveTo(b.x, b.y)
          ctx.lineTo(b.x - 11 * Math.cos(ang - 0.4), b.y - 11 * Math.sin(ang - 0.4))
          ctx.lineTo(b.x - 11 * Math.cos(ang + 0.4), b.y - 11 * Math.sin(ang + 0.4)); ctx.closePath(); ctx.fill()
        }
        sp.path.forEach(p => { ctx.fillStyle = '#fff'; ctx.strokeStyle = '#7048e8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, 7); ctx.fill(); ctx.stroke() })
      }
    }
  }, [dims])

  useEffect(() => { if (!playing) draw(null) }, [sprites, sel, mode, curved, playing, draw])

  // ---- reproducir (rAF) ----
  const play = () => {
    if (playing || !dims) return
    setPlaying(true)
    const t0 = performance.now()
    const loop = (now) => {
      const t = Math.min(1, (now - t0) / 1000 / duration)
      draw(t)
      if (t < 1) rafRef.current = requestAnimationFrame(loop)
      else { setPlaying(false); draw(null) }
    }
    rafRef.current = requestAnimationFrame(loop)
  }
  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }, [])

  // ---- exportar WebM (graba el lienzo durante una vuelta) ----
  const exportVideo = () => {
    const cv = stageRef.current
    if (!cv || exporting || !dims) return
    if (typeof cv.captureStream !== 'function' || typeof window.MediaRecorder === 'undefined') { setExporting('Tu navegador no soporta exportar'); setTimeout(() => setExporting(''), 4000); return }
    const types = ['video/webm;codecs=vp9', 'video/webm']
    const mime = types.find(t => { try { return MediaRecorder.isTypeSupported(t) } catch { return false } }) || ''
    let rec; try { rec = new MediaRecorder(cv.captureStream(30), mime ? { mimeType: mime, videoBitsPerSecond: 8e6 } : undefined) } catch { setExporting('No se pudo grabar'); setTimeout(() => setExporting(''), 4000); return }
    const chunks = []
    rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data) }
    rec.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' }), href = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = href; a.download = 'animacion-ia.webm'; document.body.appendChild(a); a.click(); a.remove()
      setTimeout(() => URL.revokeObjectURL(href), 4000); setExporting('')
    }
    recRef.current = rec; rec.start()
    const t0 = performance.now()
    const tick = (now) => {
      const t = Math.min(1, (now - t0) / 1000 / duration); draw(t); setExporting(Math.round(t * 100) + '%')
      if (t < 1) requestAnimationFrame(tick)
      else { setTimeout(() => { try { rec.stop() } catch { /* noop */ } }, 120); draw(null) }
    }
    setExporting('0%'); requestAnimationFrame(tick)
  }

  // ---- cargar imagen ----
  const onImage = (e) => {
    const file = e.target.files && e.target.files[0]; if (!file) return
    const fr = new FileReader()
    fr.onload = () => {
      const img = new Image()
      img.onload = () => {
        imgRef.current = img
        const w0 = img.naturalWidth, h0 = img.naturalHeight
        const sw = STAGE_W, sh = Math.round(STAGE_W * h0 / w0), scale = sw / w0
        const cv = stageRef.current
        if (cv) { const DPR = Math.min(window.devicePixelRatio || 1, 2); cv.width = sw * DPR; cv.height = sh * DPR; cv.style.width = sw + 'px'; cv.style.height = sh + 'px' }
        setSprites([]); setSel(-1); setMode('segment'); setDims({ w0, h0, sw, sh, scale })
        setStatus('Imagen cargada. Toca un objeto para recortarlo (o usa los atajos sin IA).')
      }
      img.src = fr.result
    }
    fr.readAsDataURL(file)
  }

  // ---- cargar modelo SAM (transformers.js desde CDN; lazy) ----
  const loadModel = async () => {
    if (model === 'loading' || model === 'ready') return
    setModel('loading'); setStatus('Cargando modelo de segmentacion (se baja una vez del CDN)...')
    try {
      const TF = await import(/* @vite-ignore */ 'https://esm.sh/@huggingface/transformers@3')
      const { SamModel, AutoProcessor, RawImage, env } = TF
      try { env.allowLocalModels = false } catch { /* noop */ }
      const id = 'Xenova/slimsam-77-uniform'
      const pc = (p) => { if (p && p.progress != null) setStatus(`Cargando modelo... ${Math.round(p.progress)}%`) }
      const SamModelP = await SamModel.from_pretrained(id, { progress_callback: pc })
      const processor = await AutoProcessor.from_pretrained(id, { progress_callback: pc })
      modelRef.current = { model: SamModelP, processor, RawImage }
      setModel('ready'); setStatus('Modelo listo. Toca un objeto de la imagen para recortarlo.')
    } catch (err) {
      console.error('[AnimLab] modelo fallo', err)
      setModel('error'); setStatus('No se pudo cargar el modelo (revisa la consola). Podes probar el pipeline con los atajos sin IA.')
    }
  }

  // ---- segmentar en (display x,y) -> sprite recortado ----
  const segmentAt = async (dx, dy) => {
    const m = modelRef.current, img = imgRef.current
    if (!m || !img || !dims || busy) return
    setBusy(true); setStatus('Segmentando...')
    try {
      const { w0, h0, scale } = dims
      const raw = await m.RawImage.read(img.src)
      const px = Math.round(dx / scale), py = Math.round(dy / scale)
      const inputs = await m.processor(raw, { input_points: [[[px, py]]] })
      const outputs = await m.model(inputs)
      const masks = await m.processor.post_process_masks(outputs.pred_masks, inputs.original_sizes, inputs.reshaped_input_sizes)
      const mt = masks[0]
      const d = mt.dims, slab = mt.data
      const nm = d.length === 4 ? d[1] : d[0], H = d[d.length - 2], W = d[d.length - 1]
      const scores = outputs.iou_scores.data
      let best = 0; for (let i = 1; i < nm; i++) if (scores[i] > scores[best]) best = i
      const off = best * H * W
      // recorte: imagen original -> alpha por mascara -> crop a bbox
      const full = document.createElement('canvas'); full.width = w0; full.height = h0
      const fctx = full.getContext('2d'); fctx.drawImage(img, 0, 0, w0, h0)
      const idata = fctx.getImageData(0, 0, w0, h0), data = idata.data
      let minX = w0, minY = h0, maxX = 0, maxY = 0, any = false
      for (let y = 0; y < h0; y++) for (let x = 0; x < w0; x++) {
        const on = slab[off + y * W + x]
        if (!on) { data[(y * w0 + x) * 4 + 3] = 0 }
        else { any = true; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y }
      }
      if (!any) { setStatus('No se detecto objeto ahi. Proba otro punto.'); setBusy(false); return }
      fctx.putImageData(idata, 0, 0)
      const bw = maxX - minX + 1, bh = maxY - minY + 1
      const spr = document.createElement('canvas'); spr.width = bw; spr.height = bh
      spr.getContext('2d').drawImage(full, minX, minY, bw, bh, 0, 0, bw, bh)
      addSprite(spr, bw, bh, (minX + bw / 2) * scale, (minY + bh / 2) * scale)
      setStatus('Objeto recortado. Pasa a "Path" para dibujarle el movimiento.')
    } catch (err) {
      console.error('[AnimLab] segmentacion fallo', err)
      setStatus('Fallo la segmentacion (revisa la consola).')
    }
    setBusy(false)
  }

  const addSprite = (canvas, bw, bh, homeX, homeY) => {
    setSprites(prev => {
      const next = [...prev, { id: 'o' + prev.length + '_' + Math.round(homeX), canvas, bw, bh, homeX, homeY, path: [], curved }]
      setSel(next.length - 1)
      return next
    })
    setMode('path')
  }

  // atajos SIN IA (para testear path+export aunque SAM no este)
  const addWholeImage = () => {
    const img = imgRef.current; if (!img || !dims) return
    const c = document.createElement('canvas'); c.width = dims.w0; c.height = dims.h0
    c.getContext('2d').drawImage(img, 0, 0); addSprite(c, dims.w0, dims.h0, dims.sw / 2, dims.sh / 2)
  }
  const addPng = (e) => {
    const file = e.target.files && e.target.files[0]; if (!file || !dims) return
    const fr = new FileReader()
    fr.onload = () => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; c.getContext('2d').drawImage(im, 0, 0); addSprite(c, im.naturalWidth, im.naturalHeight, dims.sw / 2, dims.sh / 2) }; im.src = fr.result }
    fr.readAsDataURL(file)
  }

  // ---- click en el lienzo (segmentar o agregar punto al path) ----
  const onStageClick = (e) => {
    if (!dims || playing) return
    const r = stageRef.current.getBoundingClientRect()
    const x = (e.clientX - r.left) * (dims.sw / r.width), y = (e.clientY - r.top) * (dims.sh / r.height)
    if (mode === 'segment') { if (model === 'ready') segmentAt(x, y); else setStatus('Carga el modelo primero (o usa un atajo sin IA).') }
    else if (mode === 'path' && sel >= 0) {
      setSprites(prev => prev.map((sp, i) => i === sel ? { ...sp, path: [...sp.path, { x, y }], curved } : sp))
    }
  }
  const clearPath = () => setSprites(prev => prev.map((sp, i) => i === sel ? { ...sp, path: [] } : sp))
  const delSprite = (i) => setSprites(prev => prev.filter((_, k) => k !== i))

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <h1 className="urvidTitleIn">Animaciones <span className="urvidIA">IA</span> <span className={styles.beta}>beta</span></h1>
        <p>Prototipo: reconoce un objeto, lo separa en capa, le dibujas un movimiento (recto o curvo) y lo exportas como video. Corre 100% en tu navegador.</p>
      </header>

      <div className={styles.cols}>
        <div className={styles.panel}>
          <label className={styles.field}>1 · Imagen<input type="file" accept="image/*" onChange={onImage} /></label>

          <div className={styles.block}>
            <div className={styles.blockTitle}>2 · Reconocer objeto (IA)</div>
            {model !== 'ready'
              ? <button className={styles.btn} onClick={loadModel} disabled={model === 'loading'}>{model === 'loading' ? 'Cargando modelo…' : '⤓ Cargar modelo de segmentacion'}</button>
              : <div className={styles.ok}>Modelo listo · toca un objeto en la imagen</div>}
            <div className={styles.shortcuts}>
              <span>Sin IA:</span>
              <button className={styles.mini} onClick={addWholeImage} disabled={!dims}>Imagen entera</button>
              <label className={styles.mini}>Subir PNG<input type="file" accept="image/png" onChange={addPng} style={{ display: 'none' }} /></label>
            </div>
          </div>

          <div className={styles.block}>
            <div className={styles.blockTitle}>3 · Movimiento</div>
            <div className={styles.seg}>
              {['segment', 'path'].map(mo => <button key={mo} className={mode === mo ? styles.on : ''} onClick={() => setMode(mo)}>{mo === 'segment' ? 'Recortar' : 'Path'}</button>)}
            </div>
            <label className={styles.check}><input type="checkbox" checked={curved} onChange={e => setCurved(e.target.checked)} /> Curva (si no, recta)</label>
            <button className={styles.mini} onClick={clearPath} disabled={sel < 0}>Limpiar path del objeto</button>
            <label className={styles.field}>Duracion: {duration}s<input type="range" min="1" max="8" step="0.5" value={duration} onChange={e => setDuration(Number(e.target.value))} /></label>
          </div>

          <div className={styles.row}>
            <button className={styles.btn} onClick={play} disabled={playing || !sprites.length}>▶ Reproducir</button>
            <button className={styles.btn} onClick={exportVideo} disabled={!!exporting || !sprites.length}>{exporting ? `Exportando ${exporting}` : '⬇ Exportar WebM'}</button>
          </div>

          {sprites.length > 0 && (
            <div className={styles.block}>
              <div className={styles.blockTitle}>Objetos</div>
              <div className={styles.objs}>
                {sprites.map((sp, i) => (
                  <div key={sp.id} className={`${styles.obj} ${sel === i ? styles.objOn : ''}`}>
                    <button className={styles.objSel} onClick={() => { setSel(i); setMode('path') }}>Objeto {i + 1} {sp.path.length >= 2 ? '· con path' : ''}</button>
                    <button className={styles.objDel} onClick={() => delSprite(i)} title="Borrar">×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {status && <p className={styles.status}>{status}</p>}
          <p className={styles.note}>Beta: la segmentacion automatica de TODOS los objetos y el export en MP4 son los 2 puntos a pulir; esto valida que el camino funciona.</p>
        </div>

        <div className={styles.stageWrap}>
          {dims
            ? <canvas ref={stageRef} className={styles.stage} onClick={onStageClick} style={{ cursor: mode === 'segment' ? 'crosshair' : 'copy' }} />
            : <div className={styles.empty}>Subi una imagen para empezar</div>}
        </div>
      </div>
    </div>
  )
}
