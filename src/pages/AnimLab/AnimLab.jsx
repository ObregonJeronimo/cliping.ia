import { useCallback, useEffect, useRef, useState } from 'react'
import styles from './AnimLab.module.css'

// ANIMACIONES IA · PROTOTIPO (beta). Loop client-side: reconocer objeto (SAM, transformers.js del CDN) -> recortar capa
// RGBA -> dibujar/EDITAR un path (recto o curvo, arrastrar anclas) -> animar (easing, stagger, opcional girar con el
// camino) -> exportar MP4 (WebCodecs + Mediabunny) con fallback a WebM. Fallbacks sin IA para testear path+export igual.
// De-riskea las 2 partes duras: segmentacion en el navegador y export MP4. Todo corre en el browser (render $0).

const STAGE_W = 480
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const EASE = {
  suave: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  arranque: (t) => 1 - Math.pow(1 - t, 3),
  lineal: (t) => t,
}

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
  const imgRef = useRef(null)
  const modelRef = useRef(null)
  const rafRef = useRef(null)
  const dragRef = useRef(null)

  const [dims, setDims] = useState(null)
  const [sprites, setSprites] = useState([])  // [{ id, canvas, bw, bh, homeX, homeY, path:[{x,y}], curved, delay, spin }]
  const [sel, setSel] = useState(-1)
  const [mode, setMode] = useState('segment') // 'segment' | 'path'
  const [curved, setCurved] = useState(true)
  const [ease, setEase] = useState('suave')
  const [duration, setDuration] = useState(3)
  const [playing, setPlaying] = useState(false)
  const [model, setModel] = useState('idle')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [exporting, setExporting] = useState('')

  const spritesRef = useRef(sprites); spritesRef.current = sprites
  const selRef = useRef(sel); selRef.current = sel
  const modeRef = useRef(mode); modeRef.current = mode
  const easeRef = useRef(ease); easeRef.current = ease

  // ---- pintar en cualquier ctx (display o export). geometria en coords de display; el transform escala a backing. ----
  const paint = useCallback((ctx, t, overlay) => {
    if (!dims) return
    const { sw, sh, scale } = dims, ef = EASE[easeRef.current] || EASE.suave
    ctx.clearRect(0, 0, sw, sh)
    if (imgRef.current) { ctx.globalAlpha = 0.28; ctx.drawImage(imgRef.current, 0, 0, sw, sh); ctx.globalAlpha = 1 }
    const list = spritesRef.current
    for (const sp of list) {
      let cx = sp.homeX, cy = sp.homeY, ang = 0
      if (t != null && sp.path.length >= 2) {
        const fine = sample(sp.path, sp.curved)
        const local = clamp((t - sp.delay) / Math.max(0.001, 1 - sp.delay), 0, 1)
        const et = ef(local), p = posAt(fine, et)
        if (p) { cx = p.x; cy = p.y; if (sp.spin) { const p2 = posAt(fine, Math.min(1, et + 0.02)); if (p2) ang = Math.atan2(p2.y - p.y, p2.x - p.x) } }
      }
      const dw = sp.bw * scale, dh = sp.bh * scale
      ctx.save(); ctx.translate(cx, cy); if (ang) ctx.rotate(ang); ctx.drawImage(sp.canvas, -dw / 2, -dh / 2, dw, dh); ctx.restore()
    }
    if (overlay && modeRef.current === 'path' && selRef.current >= 0 && list[selRef.current]) {
      const sp = list[selRef.current]
      if (sp.path.length) {
        const fine = sp.path.length >= 2 ? sample(sp.path, sp.curved) : sp.path
        ctx.lineWidth = 2; ctx.strokeStyle = '#7048e8'; ctx.beginPath()
        fine.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke()
        if (fine.length >= 2) {
          const a = fine[fine.length - 2], b = fine[fine.length - 1], an = Math.atan2(b.y - a.y, b.x - a.x)
          ctx.fillStyle = '#7048e8'; ctx.beginPath(); ctx.moveTo(b.x, b.y)
          ctx.lineTo(b.x - 11 * Math.cos(an - 0.4), b.y - 11 * Math.sin(an - 0.4))
          ctx.lineTo(b.x - 11 * Math.cos(an + 0.4), b.y - 11 * Math.sin(an + 0.4)); ctx.closePath(); ctx.fill()
        }
        sp.path.forEach(p => { ctx.fillStyle = '#fff'; ctx.strokeStyle = '#7048e8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, 7); ctx.fill(); ctx.stroke() })
      }
    }
  }, [dims])

  const redraw = useCallback(() => {
    const cv = stageRef.current; if (!cv || !dims) return
    const ctx = cv.getContext('2d'); ctx.setTransform(cv.width / dims.sw, 0, 0, cv.width / dims.sw, 0, 0); paint(ctx, null, true)
  }, [dims, paint])
  useEffect(() => { if (!playing) redraw() }, [sprites, sel, mode, curved, playing, redraw])

  // ---- reproducir (rAF, loop) ----
  const play = () => {
    if (playing || !dims) return
    setPlaying(true); const cv = stageRef.current, ctx = cv.getContext('2d'); ctx.setTransform(cv.width / dims.sw, 0, 0, cv.width / dims.sw, 0, 0)
    let t0 = performance.now()
    const loop = (now) => {
      let t = (now - t0) / 1000 / duration
      if (t >= 1) { t0 = now; t = 0 }   // loop continuo
      paint(ctx, t, false)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
  }
  const stop = () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = null; setPlaying(false); redraw() }
  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }, [])

  // ---- exportar (MP4 via WebCodecs+Mediabunny, fallback WebM) en alta resolucion ----
  const download = (blob, name) => { const href = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = href; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(href), 5000) }

  const exportVideo = async () => {
    if (exporting || !dims || !sprites.length) return
    const fps = 30, frames = Math.max(1, Math.round(duration * fps))
    const expW = Math.min(1080, dims.w0), S = expW / dims.sw
    const ecv = document.createElement('canvas'); ecv.width = Math.round(dims.sw * S); ecv.height = Math.round(dims.sh * S)
    const ectx = ecv.getContext('2d')
    const frame = (i) => { const t = frames > 1 ? i / (frames - 1) : 0; ectx.setTransform(S, 0, 0, S, 0, 0); paint(ectx, t, false) }
    setExporting('0%')
    // intento MP4 (determinista, calidad alta)
    if ('VideoEncoder' in window) {
      try {
        const MB = await import(/* @vite-ignore */ 'https://esm.sh/mediabunny')
        const out = new MB.Output({ format: new MB.Mp4OutputFormat(), target: new MB.BufferTarget() })
        const src = new MB.CanvasSource(ecv, { codec: 'avc', bitrate: MB.QUALITY_HIGH })
        out.addVideoTrack(src)
        await out.start()
        for (let i = 0; i < frames; i++) { frame(i); await src.add(i / fps, 1 / fps); if (i % 3 === 0) setExporting(Math.round(i / frames * 100) + '%') }
        await out.finalize()
        download(new Blob([out.target.buffer], { type: 'video/mp4' }), 'animacion-ia.mp4')
        setExporting(''); redraw(); return
      } catch (err) { console.warn('[AnimLab] MP4 fallo -> WebM', err) }
    }
    // fallback WebM (MediaRecorder, tiempo real sobre el canvas de alta resolucion)
    if (typeof ecv.captureStream !== 'function' || typeof window.MediaRecorder === 'undefined') { setExporting('Tu navegador no soporta exportar'); setTimeout(() => setExporting(''), 4000); return }
    const mime = ['video/webm;codecs=vp9', 'video/webm'].find(t => { try { return MediaRecorder.isTypeSupported(t) } catch { return false } }) || ''
    let rec; try { rec = new MediaRecorder(ecv.captureStream(fps), mime ? { mimeType: mime, videoBitsPerSecond: 1.2e7 } : undefined) } catch { setExporting('No se pudo grabar'); setTimeout(() => setExporting(''), 4000); return }
    const chunks = []; rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data) }
    rec.onstop = () => { download(new Blob(chunks, { type: 'video/webm' }), 'animacion-ia.webm'); setExporting(''); redraw() }
    rec.start(); const t0 = performance.now()
    const tick = (now) => { const t = Math.min(1, (now - t0) / 1000 / duration); ectx.setTransform(S, 0, 0, S, 0, 0); paint(ectx, t, false); setExporting(Math.round(t * 100) + '%'); if (t < 1) requestAnimationFrame(tick); else setTimeout(() => { try { rec.stop() } catch { /* noop */ } }, 120) }
    requestAnimationFrame(tick)
  }

  // ---- cargar imagen ----
  const onImage = (e) => {
    const file = e.target.files && e.target.files[0]; if (!file) return
    const fr = new FileReader()
    fr.onload = () => {
      const img = new Image()
      img.onload = () => {
        imgRef.current = img
        const w0 = img.naturalWidth, h0 = img.naturalHeight, sw = STAGE_W, sh = Math.round(STAGE_W * h0 / w0), scale = sw / w0
        const cv = stageRef.current
        if (cv) { const DPR = Math.min(window.devicePixelRatio || 1, 2); cv.width = sw * DPR; cv.height = sh * DPR; cv.style.width = sw + 'px'; cv.style.height = sh + 'px' }
        setSprites([]); setSel(-1); setMode('segment'); setDims({ w0, h0, sw, sh, scale })
        setStatus('Imagen cargada. Carga el modelo y toca un objeto (o usa los atajos sin IA).')
      }
      img.src = fr.result
    }
    fr.readAsDataURL(file)
  }

  // ---- modelo SAM (transformers.js del CDN, lazy) ----
  const loadModel = async () => {
    if (model === 'loading' || model === 'ready') return
    setModel('loading'); setStatus('Cargando modelo (se baja una vez del CDN)...')
    try {
      const TF = await import(/* @vite-ignore */ 'https://esm.sh/@huggingface/transformers@3')
      const { SamModel, AutoProcessor, RawImage, env } = TF
      try { env.allowLocalModels = false } catch { /* noop */ }
      const id = 'Xenova/slimsam-77-uniform'
      const pc = (p) => { if (p && p.progress != null) setStatus(`Cargando modelo... ${Math.round(p.progress)}%`) }
      const m = await SamModel.from_pretrained(id, { progress_callback: pc })
      const processor = await AutoProcessor.from_pretrained(id, { progress_callback: pc })
      modelRef.current = { model: m, processor, RawImage }
      setModel('ready'); setStatus('Modelo listo. Toca un objeto de la imagen para recortarlo.')
    } catch (err) {
      console.error('[AnimLab] modelo fallo', err)
      setModel('error'); setStatus('No se pudo cargar el modelo (revisa la consola). Proba el pipeline con los atajos sin IA.')
    }
  }

  // ---- segmentar (display x,y) -> sprite ----
  const segmentAt = async (dx, dy) => {
    const m = modelRef.current, img = imgRef.current
    if (!m || !img || !dims || busy) return
    setBusy(true); setStatus('Segmentando...')
    try {
      const { w0, h0, scale } = dims
      const raw = await m.RawImage.read(img.src)
      const inputs = await m.processor(raw, { input_points: [[[Math.round(dx / scale), Math.round(dy / scale)]]] })
      const outputs = await m.model(inputs)
      const masks = await m.processor.post_process_masks(outputs.pred_masks, inputs.original_sizes, inputs.reshaped_input_sizes)
      const mt = masks[0], d = mt.dims, slab = mt.data
      const nm = d.length === 4 ? d[1] : d[0], H = d[d.length - 2], W = d[d.length - 1]
      const scores = outputs.iou_scores.data
      let best = 0; for (let i = 1; i < nm; i++) if (scores[i] > scores[best]) best = i
      const off = best * H * W
      const full = document.createElement('canvas'); full.width = w0; full.height = h0
      const fctx = full.getContext('2d'); fctx.drawImage(img, 0, 0, w0, h0)
      const idata = fctx.getImageData(0, 0, w0, h0), data = idata.data
      let minX = w0, minY = h0, maxX = 0, maxY = 0, any = false
      for (let y = 0; y < h0; y++) for (let x = 0; x < w0; x++) {
        if (!slab[off + y * W + x]) { data[(y * w0 + x) * 4 + 3] = 0 }
        else { any = true; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y }
      }
      if (!any) { setStatus('No se detecto objeto ahi. Proba otro punto.'); setBusy(false); return }
      fctx.putImageData(idata, 0, 0)
      const bw = maxX - minX + 1, bh = maxY - minY + 1
      const spr = document.createElement('canvas'); spr.width = bw; spr.height = bh
      spr.getContext('2d').drawImage(full, minX, minY, bw, bh, 0, 0, bw, bh)
      addSprite(spr, bw, bh, (minX + bw / 2) * scale, (minY + bh / 2) * scale)
      setStatus('Objeto recortado. Modo "Path": clic agrega anclas, arrastralas para ajustar, doble clic borra una.')
    } catch (err) { console.error('[AnimLab] segmentacion fallo', err); setStatus('Fallo la segmentacion (revisa la consola).') }
    setBusy(false)
  }

  const addSprite = (canvas, bw, bh, homeX, homeY) => {
    setSprites(prev => { const next = [...prev, { id: 'o' + prev.length + '_' + Math.round(homeX), canvas, bw, bh, homeX, homeY, path: [], curved, delay: 0, spin: false }]; setSel(next.length - 1); return next })
    setMode('path')
  }
  const addWholeImage = () => { const img = imgRef.current; if (!img || !dims) return; const c = document.createElement('canvas'); c.width = dims.w0; c.height = dims.h0; c.getContext('2d').drawImage(img, 0, 0); addSprite(c, dims.w0, dims.h0, dims.sw / 2, dims.sh / 2) }
  const addPng = (e) => { const file = e.target.files && e.target.files[0]; if (!file || !dims) return; const fr = new FileReader(); fr.onload = () => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; c.getContext('2d').drawImage(im, 0, 0); addSprite(c, im.naturalWidth, im.naturalHeight, dims.sw / 2, dims.sh / 2) }; im.src = fr.result }; fr.readAsDataURL(file) }

  const evPos = (e) => { const r = stageRef.current.getBoundingClientRect(); return { x: (e.clientX - r.left) * (dims.sw / r.width), y: (e.clientY - r.top) * (dims.sh / r.height) } }
  const nearAnchor = (sp, x, y) => { for (let i = 0; i < sp.path.length; i++) if (Math.hypot(sp.path[i].x - x, sp.path[i].y - y) <= 9) return i; return -1 }

  const onDown = (e) => {
    if (!dims || playing) return
    const { x, y } = evPos(e)
    if (mode === 'path' && sel >= 0) {
      const ai = nearAnchor(sprites[sel], x, y)
      dragRef.current = ai >= 0 ? { kind: 'anchor', ai, moved: false } : { kind: 'add', x, y, moved: false }
    } else if (mode === 'segment') { dragRef.current = { kind: 'seg', x, y, moved: false } }
    try { stageRef.current.setPointerCapture(e.pointerId) } catch { /* noop */ }
  }
  const onMove = (e) => {
    const dr = dragRef.current; if (!dr || !dims) return
    const { x, y } = evPos(e); dr.moved = dr.moved || Math.hypot(x - (dr.x ?? x), y - (dr.y ?? y)) > 4
    if (dr.kind === 'anchor') setSprites(prev => prev.map((sp, i) => i === sel ? { ...sp, path: sp.path.map((p, k) => k === dr.ai ? { x, y } : p) } : sp))
  }
  const onUp = (e) => {
    const dr = dragRef.current; dragRef.current = null; if (!dr || !dims) return
    if (dr.kind === 'add' && !dr.moved) setSprites(prev => prev.map((sp, i) => i === sel ? { ...sp, path: [...sp.path, { x: dr.x, y: dr.y }], curved } : sp))
    else if (dr.kind === 'seg' && !dr.moved) { if (model === 'ready') segmentAt(dr.x, dr.y); else setStatus('Carga el modelo primero (o usa un atajo sin IA).') }
  }
  const onDouble = (e) => {
    if (mode !== 'path' || sel < 0 || !dims) return
    const { x, y } = evPos(e), ai = nearAnchor(sprites[sel], x, y)
    if (ai >= 0) setSprites(prev => prev.map((sp, i) => i === sel ? { ...sp, path: sp.path.filter((_, k) => k !== ai) } : sp))
  }

  const updSel = (patch) => setSprites(prev => prev.map((sp, i) => i === sel ? { ...sp, ...patch } : sp))
  const clearPath = () => updSel({ path: [] })
  const undoPoint = () => setSprites(prev => prev.map((sp, i) => i === sel ? { ...sp, path: sp.path.slice(0, -1) } : sp))
  const delSprite = (i) => setSprites(prev => prev.filter((_, k) => k !== i))
  const cur = sel >= 0 ? sprites[sel] : null

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
            <div className={styles.two}>
              <label className={styles.fieldSm}>Easing
                <select value={ease} onChange={e => setEase(e.target.value)}><option value="suave">Suave</option><option value="arranque">Arranque</option><option value="lineal">Lineal</option></select>
              </label>
              <label className={styles.fieldSm}>Duracion: {duration}s<input type="range" min="1" max="8" step="0.5" value={duration} onChange={e => setDuration(Number(e.target.value))} /></label>
            </div>
            <div className={styles.row}>
              <button className={styles.mini} onClick={undoPoint} disabled={!cur || !cur.path.length}>↶ deshacer punto</button>
              <button className={styles.mini} onClick={clearPath} disabled={!cur || !cur.path.length}>limpiar path</button>
            </div>
          </div>

          {cur && (
            <div className={styles.block}>
              <div className={styles.blockTitle}>Objeto {sel + 1}</div>
              <label className={styles.fieldSm}>Demora de arranque: {Math.round(cur.delay * 100)}%<input type="range" min="0" max="0.7" step="0.05" value={cur.delay} onChange={e => updSel({ delay: Number(e.target.value) })} /></label>
              <label className={styles.check}><input type="checkbox" checked={cur.spin} onChange={e => updSel({ spin: e.target.checked })} /> Girar hacia el camino</label>
            </div>
          )}

          <div className={styles.row}>
            {playing ? <button className={styles.btn} onClick={stop}>⏸ Frenar</button> : <button className={styles.btn} onClick={play} disabled={!sprites.length}>▶ Reproducir</button>}
            <button className={styles.btn} onClick={exportVideo} disabled={!!exporting || !sprites.length}>{exporting ? `Exportando ${exporting}` : '⬇ Exportar'}</button>
          </div>

          {sprites.length > 0 && (
            <div className={styles.block}>
              <div className={styles.blockTitle}>Objetos</div>
              <div className={styles.objs}>
                {sprites.map((sp, i) => (
                  <div key={sp.id} className={`${styles.obj} ${sel === i ? styles.objOn : ''}`}>
                    <button className={styles.objSel} onClick={() => { setSel(i); setMode('path') }}>Objeto {i + 1}{sp.path.length >= 2 ? ' · con path' : ''}</button>
                    <button className={styles.objDel} onClick={() => delSprite(i)} title="Borrar">×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {status && <p className={styles.status}>{status}</p>}
          <p className={styles.note}>Beta: la segmentacion automatica de TODOS los objetos sigue siendo el punto a pulir; export MP4 (WebCodecs) con fallback WebM.</p>
        </div>

        <div className={styles.stageWrap}>
          {dims
            ? <canvas ref={stageRef} className={styles.stage} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onDoubleClick={onDouble} style={{ cursor: mode === 'segment' ? 'crosshair' : 'copy', touchAction: 'none' }} />
            : <div className={styles.empty}>Subi una imagen para empezar</div>}
        </div>
      </div>
    </div>
  )
}
