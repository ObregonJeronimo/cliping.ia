import { useEffect, useMemo, useRef, useState } from 'react'
import { makeVideo, drawFrame } from '../../urvid-cine/index.js'
import { useAuth } from '../../contexts/AuthContext'

// Cine IA (motor) — usa el FORK del motor de urvid (src/urvid-cine, canvas client-side) para poner texto/marca/escenas
// LEGIBLES, y le compone un FONDO DE IA (video generado con fal, o una URL pegada) por debajo, con un scrim para que el
// texto se lea. La IA aporta el fondo/movimiento; nuestro motor aporta el texto. Base de urvid IA/Advanced intacta.
const API_URL = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:8000')
const HEADERS = { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }
const RUBROS = ['default', 'tech', 'finanzas', 'moda', 'gastronomia', 'educacion', 'salud', 'fitness', 'inmobiliaria', 'belleza']

const card = { background: '#161b2e', border: '1px solid #232a42', borderRadius: 14, padding: 16, marginBottom: 14 }
const btn = { background: '#5b8cff', color: '#fff', border: 0, borderRadius: 10, padding: '10px 16px', fontWeight: 600, cursor: 'pointer' }
const ghost = { background: '#0f1320', color: '#cfd6e6', border: '1px solid #2a3350', borderRadius: 10, padding: '9px 14px', cursor: 'pointer' }
const inp = { background: '#0f1320', border: '1px solid #2a3350', borderRadius: 10, padding: '9px 11px', color: '#e8ecf6', width: '100%', fontSize: 14 }
const lbl = { fontSize: 12.5, color: '#8a93a6', display: 'block', marginBottom: 4 }

// ── modo Cine: el video de IA es el protagonista; nuestro motor le pone el texto del brief en los BEATS analizados ──
// material del brief (gancho/claim/features/CTA) -> textos a repartir en los beats.
function briefTexts(b) {
  const out = []
  if (b.tagline) out.push(b.tagline)
  if (b.claim && b.claim !== b.tagline) out.push(b.claim)
  ;(b.bullets || []).slice(0, 3).forEach(x => { const t = typeof x === 'string' ? x : (x?.title || ''); if (t) out.push(t) })
  if (b.cta) out.push(b.cta)
  return out.filter(Boolean)
}
// reparte los textos sobre los beats: gancho al 1ro, CTA al último, el resto al medio.
function captionBeats(beats, texts) {
  const n = beats.length
  if (!n) return []
  const res = beats.map(b => ({ ...b, text: '' }))
  if (!texts.length) return res
  res[0].text = texts[0]
  if (texts.length > 1) res[n - 1].text = texts[texts.length - 1]
  texts.slice(1, -1).forEach((t, k) => { if (res[k + 1] && k + 1 < n - 1) res[k + 1].text = t })
  return res
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
}
function wrapText(ctx, text, maxW) {
  const words = String(text).split(/\s+/), lines = []; let line = ''
  for (const w of words) { const test = line ? line + ' ' + w : w; if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w } else line = test }
  if (line) lines.push(line); return lines.slice(0, 3)
}
function drawCover(ctx, vid, W, H) {
  const vr = vid.videoWidth / vid.videoHeight, cr = W / H
  let dw = W, dh = H
  if (vr > cr) { dh = H; dw = H * vr } else { dw = W; dh = W / vr }
  ctx.drawImage(vid, (W - dw) / 2, (H - dh) / 2, dw, dh)
}
function drawCaption(ctx, beat, t, W, H) {
  if (!beat.text) return
  const r = beat.calmRegion, x = r.x * W, y = r.y * H, w = r.w * W, h = r.h * H
  const fade = Math.min(1, Math.max(0, (t - beat.start) / 0.35))
  ctx.save(); ctx.globalAlpha = fade
  const dark = beat.textColor === '#FFFFFF'
  ctx.fillStyle = dark ? 'rgba(8,12,20,0.46)' : 'rgba(245,247,252,0.58)'
  roundRect(ctx, x, y, w, h, Math.min(18, h * 0.3)); ctx.fill()
  const fs = Math.min(h * 0.42, w * 0.09)
  ctx.font = `700 ${Math.round(fs)}px Inter, system-ui, sans-serif`
  ctx.fillStyle = beat.textColor; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  const lines = wrapText(ctx, beat.text, w * 0.9), lh = fs * 1.18, total = lines.length * lh
  lines.forEach((ln, i) => ctx.fillText(ln, x + w / 2, y + h / 2 - total / 2 + lh * (i + 0.5)))
  ctx.restore()
}

export default function CineEngineStudio() {
  const { user } = useAuth()
  const [url, setUrl] = useState('')
  const [analyzing, setAnalyzing] = useState('')
  const [brief, setBrief] = useState({ brand: 'Nodo', rubro: 'tech', tone: 'dark', brandColor: '#22e06a', format: '9:16', duration: 'corto', tagline: 'Automatiza lo aburrido', claim: 'Menos tareas repetitivas, mas resultados reales', cta: 'Probalo gratis' })
  const [images, setImages] = useState([])
  const [screenshotUrl, setScreenshotUrl] = useState('')   // screenshot HD del sitio (fallback del fondo IA si no hay fotos)
  const [seed, setSeed] = useState(0)

  // FONDO IA
  const [aiBgUrl, setAiBgUrl] = useState('')
  const [aiBgIntensity, setAiBgIntensity] = useState(0.5)
  const [models, setModels] = useState([])
  const [modelId, setModelId] = useState('pixverse55')
  const [seconds, setSeconds] = useState(5)
  const [aiGen, setAiGen] = useState('')      // mensaje (progreso, aviso o error)
  const [aiBusy, setAiBusy] = useState(false) // generando de verdad (deshabilita el boton) — separado del mensaje
  const aiPoll = useRef(null)

  // ANALISIS del video -> beats (modo Cine)
  const [beats, setBeats] = useState([])
  const [anStatus, setAnStatus] = useState('')
  const [anDuration, setAnDuration] = useState(0)
  const aiVidRef = useRef(null)
  const capBeats = useMemo(() => captionBeats(beats, briefTexts(brief)), [beats, brief])
  const cineMode = !!aiBgUrl && capBeats.length > 0

  // preview / transport
  const [playing, setPlaying] = useState(true)
  const [speed, setSpeed] = useState(1)
  const [head, setHead] = useState(0)
  const [exporting, setExporting] = useState('')
  const headRef = useRef(0)
  const cvRef = useRef(null)
  const recRef = useRef(null)

  const video = useMemo(
    () => makeVideo({ ...brief, seed: seed || undefined, aiBgUrl: aiBgUrl || undefined, aiBgIntensity, perSceneAnims: true }),
    [brief, seed, aiBgUrl, aiBgIntensity],
  )

  useEffect(() => {
    fetch(`${API_URL}/api/seedance/models`, { headers: HEADERS })
      .then(r => r.json()).then(d => { if (d.models?.length) { setModels(d.models); if (!d.models.find(m => m.id === modelId)) setModelId(d.models[0].id) } })
      .catch(() => { /* backend apagado */ })
  }, [])
  useEffect(() => () => clearInterval(aiPoll.current), [])

  // al tener un video de IA (generado o pegado): ANALIZARLO -> beats (cortes/movimiento/zonas) para colocar el texto.
  useEffect(() => {
    if (!aiBgUrl) { setBeats([]); setAnDuration(0); setAnStatus(''); return }
    let alive = true
    setAnStatus('Analizando el video…')
    fetch(`${API_URL}/api/cine/analyze`, { method: 'POST', headers: HEADERS, body: JSON.stringify({ url: aiBgUrl }) })
      .then(r => r.json()).then(d => {
        if (!alive) return
        if (d.error || !d.beats) { setAnStatus(d.error || 'no se pudo analizar el video'); setBeats([]); return }
        setBeats(d.beats); setAnDuration(d.duration || 0); setAnStatus(`${d.beats.length} beats · ${(d.cuts || []).length} cortes detectados`)
      }).catch(() => { if (alive) setAnStatus('backend apagado (análisis)') })
    return () => { alive = false }
  }, [aiBgUrl])

  // en modo Cine el <video> manda la reproducción: play/pause segun transport.
  useEffect(() => { const v = aiVidRef.current; if (!v) return; if (playing) v.play?.().catch(() => {}); else v.pause?.() }, [playing, aiBgUrl, cineMode])

  // La DURACIÓN del clip de IA se ata al video, sin pasar el MÁXIMO del modelo (si el video es más largo, se loopea).
  useEffect(() => {
    const m = models.find(x => x.id === modelId)
    const ds = (m?.durations || [5]).slice().sort((a, b) => a - b)
    const need = Math.ceil(video.duration || 0)
    setSeconds(ds.find(d => d >= need) ?? ds[ds.length - 1])
  }, [video.duration, modelId, models])

  // preview loop (canvas)
  useEffect(() => {
    const cv = cvRef.current; if (!cv) return
    const ctx = cv.getContext('2d')
    const DPR = Math.min(window.devicePixelRatio || 1, 2.5)
    cv.width = video.W * DPR; cv.height = video.H * DPR
    let raf, last = performance.now()
    const loop = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05) * speed; last = now
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
      const vid = aiVidRef.current
      if (cineMode && vid && vid.readyState >= 2 && vid.videoWidth) {
        // MODO CINE: el video de IA es el protagonista + texto del brief en los beats analizados.
        const W = video.W, H = video.H
        ctx.clearRect(0, 0, W, H)
        try { drawCover(ctx, vid, W, H) } catch { /* CORS: el preview puede fallar de leer, igual reproduce */ }
        const t = vid.currentTime || 0
        const beat = capBeats.find(b => t >= b.start && t < b.end)
        if (beat) drawCaption(ctx, beat, t, W, H)
        setHead(t)
      } else {
        // sin video de IA: motor procedural de urvid-cine (preview de siempre).
        if (playing) { headRef.current += dt; if (headRef.current >= video.duration) headRef.current -= video.duration }
        drawFrame(ctx, headRef.current, video)
        setHead(headRef.current)
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [video, playing, speed, cineMode, capBeats])

  const up = (k, v) => setBrief(b => ({ ...b, [k]: v }))

  const analyze = async (refresh = false) => {
    if (!url.trim() || analyzing === 'loading') return
    setAnalyzing('loading')
    try {
      const j = await (await fetch(`${API_URL}/api/urvid/perceive`, { method: 'POST', headers: HEADERS, body: JSON.stringify({ url: url.trim(), userId: user?.uid || '', refresh }) })).json()
      const b = j && j.brief
      if (!b || j.error) { setAnalyzing(j?.error || 'No se pudo analizar'); return }
      setBrief({
        brand: b.brand || 'Marca', rubro: RUBROS.includes(b.rubro) ? b.rubro : 'default',
        tone: b.tone === 'light' ? 'light' : 'dark', brandColor: b.brandColor || '#5b8cff',
        format: '9:16', duration: 'corto',
        tagline: b.tagline || '', claim: b.claim || '', cta: b.cta || '',
        bullets: Array.isArray(b.bullets) ? b.bullets : [], stats: Array.isArray(b.stats) ? b.stats : [], proof: b.proof || '',
      })
      setImages(j.images || [])
      setScreenshotUrl(j.screenshotUrl || '')
      setAiGen(''); setSeed(0); headRef.current = 0; setHead(0); setAnalyzing('')
    } catch { setAnalyzing('Backend apagado — abri "start.bat"') }
  }

  // GENERAR FONDO IA: anima la 1ra imagen del sitio con el modelo elegido (fal) -> el videoUrl pasa a ser el fondo.
  const genAiBg = async () => {
    if (aiBusy) return
    const seedImg = images[0] || screenshotUrl   // si no hay fotos de producto, anima el SCREENSHOT del sitio
    if (!seedImg) { setAiGen('Analizá una página primero (o pegá una URL de video abajo).'); return }
    setAiGen('Iniciando…'); setAiBusy(true)
    try {
      const d = await (await fetch(`${API_URL}/api/seedance/generate`, {
        method: 'POST', headers: HEADERS,
        body: JSON.stringify({ images: [seedImg], brief, desarrollo: '', prompt: '', model: modelId, seconds: Number(seconds), resolution: '', userId: user?.uid || '' }),
      })).json()
      if (d.error || !d.job_id) { setAiGen(d.error || 'no se pudo iniciar'); setAiBusy(false); return }
      clearInterval(aiPoll.current)
      aiPoll.current = setInterval(async () => {
        try {
          const j = await (await fetch(`${API_URL}/api/jobs/${d.job_id}`, { headers: HEADERS })).json()
          if (j.status === 'done') { clearInterval(aiPoll.current); setAiBusy(false); setAiGen(''); setAiBgUrl(j.videoUrl || '') }
          else if (j.status === 'error') { clearInterval(aiPoll.current); setAiBusy(false); setAiGen('Error: ' + (j.error || '')) }
          else setAiGen(`${j.step || 'generando'}${j.progress ? ` · ${j.progress}%` : ''}`)
        } catch { /* sigue */ }
      }, 3000)
    } catch { setAiGen('Backend apagado — abrí "start.bat"'); setAiBusy(false) }
  }

  const model = models.find(m => m.id === modelId)
  const estCost = model ? ((model.price?.mode === 'flat' ? model.price.usd : (model.price_s || 0.05) * Number(seconds))) : 0

  // EXPORT (MediaRecorder, igual que urvid IA). Si el fondo IA es cross-origin sin CORS, el canvas queda "tainted" y la
  // grabacion puede fallar -> se avisa.
  const exportVideo = () => {
    const cv = cvRef.current
    if (!cv || exporting) return
    if (typeof cv.captureStream !== 'function' || typeof window.MediaRecorder === 'undefined') { setExporting('Tu navegador no soporta exportar'); setTimeout(() => setExporting(''), 5000); return }
    const types = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm']
    const mime = types.find(t => { try { return MediaRecorder.isTypeSupported(t) } catch { return false } }) || ''
    const ext = mime.indexOf('mp4') >= 0 ? 'mp4' : 'webm'
    let rec
    try { rec = new MediaRecorder(cv.captureStream(30), mime ? { mimeType: mime, videoBitsPerSecond: 8e6 } : { videoBitsPerSecond: 8e6 }) }
    catch { setExporting('No se pudo grabar (¿fondo IA sin CORS?)'); setTimeout(() => setExporting(''), 6000); return }
    const chunks = []
    rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data) }
    rec.onstop = () => {
      const blob = new Blob(chunks, { type: mime || 'video/webm' }), href = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = href; a.download = `${(brief.brand || 'cine').replace(/\s+/g, '-')}-cine.${ext}`
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(href), 4000); setExporting('')
    }
    headRef.current = 0; setHead(0); setPlaying(true)
    if (cineMode && aiVidRef.current) { try { aiVidRef.current.currentTime = 0; aiVidRef.current.play?.() } catch { /* noop */ } }
    recRef.current = rec; rec.start()
    const dur = cineMode ? (anDuration || aiVidRef.current?.duration || video.duration) : video.duration
    const t0 = performance.now()
    const tick = () => {
      if (!recRef.current) return
      const el = (performance.now() - t0) / 1000
      setExporting(Math.min(100, Math.round(el / dur * 100)) + '%')
      if (el >= dur + 0.1) { try { rec.stop() } catch { /* noop */ } recRef.current = null }
      else requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 18, padding: '20px 18px', color: '#e8ecf6', maxWidth: 1100, margin: '0 auto' }}>
      <div>
        <h1 className="urvidTitleIn" style={{ margin: '0 0 2px' }}>Cine <span className="urvidIA">IA</span></h1>
        <p style={{ color: '#8a93a6', fontSize: 13, marginTop: 0 }}>Nuestro motor pone el texto/marca legible; la IA pone el fondo en movimiento.</p>

        <div style={card}>
          <label style={lbl}>Analizar página</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input style={inp} placeholder="https://tu-sitio.com" value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && analyze(false)} />
            <button style={btn} onClick={() => analyze(false)} disabled={analyzing === 'loading'}>{analyzing === 'loading' ? '…' : 'Analizar'}</button>
          </div>
          {analyzing && analyzing !== 'loading' && <p style={{ color: '#e0708a', fontSize: 12, margin: '6px 0 0' }}>{analyzing}</p>}
          {images.length > 0
            ? <p style={{ color: '#8a93a6', fontSize: 12, margin: '6px 0 0' }}>{images.length} imágenes encontradas (se anima la 1ra de fondo)</p>
            : (screenshotUrl ? <p style={{ color: '#8a93a6', fontSize: 12, margin: '6px 0 0' }}>Sin fotos de producto → se anima el <b>screenshot HD</b> del sitio.</p> : null)}
        </div>

        <div style={card}>
          <label style={lbl}>Marca</label>
          <input style={inp} value={brief.brand} onChange={e => up('brand', e.target.value)} />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <div style={{ flex: 1 }}><label style={lbl}>Color</label><input type="color" value={brief.brandColor} onChange={e => up('brandColor', e.target.value)} style={{ ...inp, padding: 4, height: 38 }} /></div>
            <div style={{ flex: 1 }}><label style={lbl}>Rubro</label><select style={inp} value={brief.rubro} onChange={e => up('rubro', e.target.value)}>{RUBROS.map(r => <option key={r}>{r}</option>)}</select></div>
          </div>
          <div style={{ marginTop: 8 }}><label style={lbl}>Tono</label>
            <div style={{ display: 'flex', gap: 8 }}>{['dark', 'light'].map(tn => <button key={tn} style={brief.tone === tn ? btn : ghost} onClick={() => up('tone', tn)}>{tn === 'dark' ? 'oscuro' : 'claro'}</button>)}</div>
          </div>
          <label style={{ ...lbl, marginTop: 10 }}>Gancho</label><input style={inp} value={brief.tagline} onChange={e => up('tagline', e.target.value)} />
          <label style={{ ...lbl, marginTop: 8 }}>Claim</label><input style={inp} value={brief.claim} onChange={e => up('claim', e.target.value)} />
          <label style={{ ...lbl, marginTop: 8 }}>CTA</label><input style={inp} value={brief.cta} onChange={e => up('cta', e.target.value)} />
          <div style={{ marginTop: 10 }}><label style={lbl}>Duración del video</label>
            <div style={{ display: 'flex', gap: 8 }}>{[['corto', 'Corto'], ['medio', 'Medio'], ['largo', 'Largo']].map(([d, l]) => <button key={d} style={(brief.duration || 'corto') === d ? btn : ghost} onClick={() => up('duration', d)}>{l}</button>)}</div>
          </div>
          <button style={{ ...ghost, marginTop: 10, width: '100%' }} onClick={() => setSeed(s => ((s || 1) + 0x9e3779b1) >>> 0 || 1)}>↻ Otra variante</button>
        </div>

        <div style={card}>
          <label style={{ ...lbl, color: '#cfd6e6', fontWeight: 600 }}>Fondo de IA (opcional)</label>
          <select style={{ ...inp, marginBottom: 8 }} value={modelId} onChange={e => setModelId(e.target.value)}>
            {models.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <label style={{ ...lbl, margin: 0 }}>Clip IA</label>
            <select style={{ ...inp, width: 84 }} value={seconds} onChange={e => setSeconds(Number(e.target.value))}>{(model?.durations || [5]).map(n => <option key={n} value={n}>{n}s</option>)}</select>
            <span style={{ color: '#8a93a6', fontSize: 11.5 }}>el video dura {video.duration.toFixed(0)}s{Number(seconds) < video.duration ? ' → el fondo se loopea' : ''}</span>
          </div>
          <button style={{ ...btn, width: '100%', opacity: aiBusy ? 0.6 : 1 }} onClick={genAiBg} disabled={aiBusy}>{aiBusy ? `Generando… ${aiGen}` : `Generar fondo IA (≈ $${estCost.toFixed(2)})`}</button>
          {!aiBusy && aiGen && <p style={{ color: '#e0708a', fontSize: 12, margin: '6px 0 0' }}>{aiGen}</p>}
          <label style={{ ...lbl, marginTop: 10 }}>…o pegá la URL de un video (mp4/webm)</label>
          <input style={inp} placeholder="https://…/clip.mp4" value={aiBgUrl} onChange={e => setAiBgUrl(e.target.value)} />
          {aiBgUrl && anStatus && <p style={{ color: anStatus.includes('beats') ? '#3ad29f' : '#8a93a6', fontSize: 12, margin: '8px 0 0' }}>🎬 {anStatus} — el texto del brief se coloca en los beats.</p>}
          {aiBgUrl && <button style={{ ...ghost, marginTop: 8 }} onClick={() => setAiBgUrl('')}>Quitar video IA</button>}
        </div>

        <button style={{ ...btn, width: '100%' }} onClick={exportVideo} disabled={!!exporting}>{exporting ? `Exportando ${exporting}` : '⬇ Descargar video'}</button>
        {exporting && exporting.indexOf('%') < 0 && <p style={{ color: '#e0708a', fontSize: 12, marginTop: 6 }}>{exporting}</p>}
      </div>

      <div>
        {aiBgUrl && <video ref={aiVidRef} key={aiBgUrl} src={aiBgUrl} muted loop autoPlay playsInline crossOrigin="anonymous" style={{ display: 'none' }} />}
        <div style={{ aspectRatio: `${video.W} / ${video.H}`, maxHeight: '78vh', margin: '0 auto', borderRadius: 14, overflow: 'hidden', background: '#0a0a0f', border: '1px solid #232a42' }}>
          <canvas ref={cvRef} style={{ width: '100%', height: '100%', display: 'block' }} />
        </div>
        {(() => { const dispDur = cineMode ? (anDuration || video.duration) : video.duration; return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, justifyContent: 'center' }}>
          <button style={ghost} onClick={() => setPlaying(p => !p)}>{playing ? '⏸' : '▶'}</button>
          <button style={ghost} onClick={() => { headRef.current = 0; if (aiVidRef.current) aiVidRef.current.currentTime = 0 }}>↺</button>
          <input type="range" min="0" max="1000" value={Math.round(head / (dispDur || 1) * 1000) || 0} onChange={e => { const tt = (Number(e.target.value) / 1000) * dispDur; headRef.current = tt; if (cineMode && aiVidRef.current) aiVidRef.current.currentTime = tt }} style={{ flex: 1, maxWidth: 360 }} />
          <span style={{ color: '#8a93a6', fontSize: 12, fontFamily: 'monospace' }}>{head.toFixed(1)} / {dispDur.toFixed(1)}</span>
        </div>
        ) })()}
      </div>
    </div>
  )
}
