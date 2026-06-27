import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'

// Cine IA — genera un clip de video con IA (varios modelos de fal) desde las IMAGENES REALES del sitio + un prompt
// por beats derivado del analisis (perception). Extraer imagenes = $0; solo paga la generacion. El usuario elige el
// MODELO; cada modelo dice cuantas imagenes acepta. Backend: /api/urvid/perceive, /api/seedance/models, /api/seedance/generate.
const API_URL = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:8000')
const HEADERS = { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }

// costo REAL estimado (casi todos los modelos de fal cobran por RESOLUCION, no plano por segundo)
function estCost(model, resolution, seconds) {
  const s = Number(seconds) || 0
  const p = model?.price
  if (!p) return (model?.price_s || 0.04) * s
  if (p.mode === 'flat') return p.usd
  if (p.mode === 'per_s') return p.rate * s
  if (p.mode === 'per_s_res') { const r = p.rates[resolution] ?? Object.values(p.rates)[0]; return r * s + (p.img_fee || 0) }
  if (p.mode === 'pixverse') { const base = p.base[resolution] ?? p.base['720p']; const m = p.mult[String(s)] ?? (s / 5); return base * m }
  return (model?.price_s || 0.04) * s
}
// duraciones validas para la resolucion elegida (ej. pixverse 1080p no permite 10s)
function availDurations(model, resolution) {
  const cap = (model?.dur_caps || {})[resolution]
  return (model?.durations || [5, 10]).filter(n => !cap || n <= cap)
}
const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`

const card = { background: '#161b2e', border: '1px solid #232a42', borderRadius: 14, padding: 16 }
const btn = { background: '#5b8cff', color: '#fff', border: 0, borderRadius: 10, padding: '10px 18px', fontWeight: 600, cursor: 'pointer' }
const inp = { background: '#0f1320', border: '1px solid #2a3350', borderRadius: 10, padding: '10px 12px', color: '#e8ecf6', width: '100%', fontSize: 14 }

export default function CineStudio() {
  const { user } = useAuth()
  const [url, setUrl] = useState('')
  const [brief, setBrief] = useState(null)
  const [images, setImages] = useState([])
  const [sel, setSel] = useState([])
  const [models, setModels] = useState([])
  const [modelId, setModelId] = useState('kling-v3-pro')
  const [desarrollo, setDesarrollo] = useState('')
  const [seconds, setSeconds] = useState(10)
  const [resolution, setResolution] = useState('')
  const [prompt, setPrompt] = useState('')
  const [promptEdited, setPromptEdited] = useState(false)
  const [promptReady, setPromptReady] = useState(false)
  const [analyzing, setAnalyzing] = useState('')
  const [gen, setGen] = useState('')
  const [busy, setBusy] = useState(false)   // generando de verdad (deshabilita el boton); separado del mensaje `gen`
  const [genLog, setGenLog] = useState([])  // [{t: segundos, msg}] historial de pasos para ver si avanza o se clavo
  const [elapsed, setElapsed] = useState(0) // cronometro en segundos
  const [video, setVideo] = useState(null)
  const pollRef = useRef(null)
  const timerRef = useRef(null)
  const startRef = useRef(0)
  const lastStepRef = useRef('')

  const model = models.find(m => m.id === modelId) || null
  const maxImg = model?.max_images || 1

  // traer la lista de modelos una vez
  useEffect(() => {
    fetch(`${API_URL}/api/seedance/models`, { headers: HEADERS })
      .then(r => r.json()).then(d => { if (d.models?.length) { setModels(d.models); if (!d.models.find(m => m.id === modelId)) setModelId(d.models[0].id) } })
      .catch(() => { /* backend apagado */ })
  }, [])

  // al cambiar de modelo: recortar seleccion al maximo y resetear resolucion/duracion a las del modelo
  useEffect(() => {
    if (!model) return
    setSel(s => s.slice(0, model.max_images))
    setResolution(model.resolutions?.[0] || '')
    setSeconds(s => model.durations?.includes(Number(s)) ? s : (model.durations?.[model.durations.length - 1] || 10))
  }, [modelId, models])

  // si la resolucion elegida no admite la duracion actual (ej. pixverse 1080p max 8s), bajarla al maximo valido
  useEffect(() => {
    if (!model) return
    const ok = availDurations(model, resolution)
    if (ok.length && !ok.includes(Number(seconds))) setSeconds(ok[ok.length - 1])
  }, [resolution, modelId])

  useEffect(() => () => { clearInterval(pollRef.current); clearInterval(timerRef.current) }, [])

  // agrega una linea al log (con el segundo en que paso) solo cuando el paso CAMBIA
  function pushLog(msg) {
    if (!msg || msg === lastStepRef.current) return
    lastStepRef.current = msg
    const t = Math.floor((Date.now() - startRef.current) / 1000)
    setGenLog(l => [...l, { t, msg }])
  }
  const stopTimer = () => clearInterval(timerRef.current)

  async function analyze() {
    if (!url.trim()) return
    setAnalyzing('Analizando la pagina...'); setBrief(null); setImages([]); setSel([]); setVideo(null)
    try {
      const d = await (await fetch(`${API_URL}/api/urvid/perceive`, { method: 'POST', headers: HEADERS, body: JSON.stringify({ url: url.trim(), userId: user?.uid || '' }) })).json()
      if (d.error) { setAnalyzing(d.error); return }
      setBrief(d.brief); setImages(d.images || [])
      setAnalyzing(`${d.brief?.brand || '?'} · ${d.brief?.rubro || '?'} · ${(d.images || []).length} imagenes encontradas`)
      setPromptEdited(false); setPromptReady(false); setPrompt('')
    } catch { setAnalyzing('Backend apagado — abri "start.bat" (corre en localhost:8000)') }
  }

  async function buildPrompt() {
    if (!brief) return
    try {
      const d = await (await fetch(`${API_URL}/api/seedance/prompt`, { method: 'POST', headers: HEADERS, body: JSON.stringify({ brief, model: modelId, images: Math.max(1, sel.length), desarrollo, seconds: Number(seconds) }) })).json()
      if (d.prompt) setPrompt(d.prompt)
    } catch { /* backend apagado */ }
  }

  // una vez creado el prompt, se mantiene EN VIVO con el "desarrollo" (a menos que lo edites a mano). $0, determinista.
  useEffect(() => {
    if (!brief || !promptReady || promptEdited) return
    const t = setTimeout(buildPrompt, 500)
    return () => clearTimeout(t)
  }, [brief, desarrollo, modelId, seconds, promptReady, promptEdited])

  const toggle = (u) => { if (!busy) setGen(''); setSel(s => s.includes(u) ? s.filter(x => x !== u) : (s.length >= maxImg ? (maxImg === 1 ? [u] : s) : [...s, u])) }

  async function generate() {
    if (!sel.length) { setGen('Elegi al menos 1 imagen'); return }
    setBusy(true); setVideo(null)
    startRef.current = Date.now(); lastStepRef.current = ''
    setElapsed(0); setGenLog([]); pushLog('Enviando el pedido a fal…'); setGen('Iniciando…')
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000)
    try {
      const d = await (await fetch(`${API_URL}/api/seedance/generate`, {
        method: 'POST', headers: HEADERS,
        body: JSON.stringify({ images: sel, brief, desarrollo, prompt: prompt.trim(), model: modelId, seconds: Number(seconds), resolution, userId: user?.uid || '' }),
      })).json()
      if (d.error || !d.job_id) { stopTimer(); pushLog('✗ ' + (d.error || 'no se pudo iniciar')); setGen(d.error || 'no se pudo iniciar'); setBusy(false); return }
      pushLog('Pedido aceptado, esperando a fal…')
      poll(d.job_id)
    } catch { stopTimer(); pushLog('✗ Backend apagado'); setGen('Backend apagado — abri "start.bat"'); setBusy(false) }
  }

  function poll(jobId) {
    clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const j = await (await fetch(`${API_URL}/api/jobs/${jobId}`, { headers: HEADERS })).json()
        if (j.status === 'done') { clearInterval(pollRef.current); stopTimer(); pushLog('✓ Video listo'); setBusy(false); setGen(''); setVideo({ url: j.videoUrl, prompt: j.prompt }) }
        else if (j.status === 'error') { clearInterval(pollRef.current); stopTimer(); pushLog('✗ ' + (j.error || 'error')); setBusy(false); setGen('Error: ' + (j.error || '')) }
        else { const step = j.step || 'generando'; pushLog(step); setGen(`${step}${j.progress ? ` · ${j.progress}%` : ''}`) }
      } catch { /* sigue */ }
    }, 3000)
  }

  const est = estCost(model, resolution, seconds)

  return (
    <div style={{ maxWidth: 920, margin: '0 auto', padding: '24px 20px', color: '#e8ecf6' }}>
      <style>{`@keyframes cineBlink{0%,100%{opacity:1}50%{opacity:.2}} .cineBlink{color:#3ad29f;animation:cineBlink 1s infinite;margin-right:6px}`}</style>
      <h1 className="urvidTitleIn" style={{ marginBottom: 4 }}>Cine <span className="urvidIA">IA</span></h1>
      <p style={{ color: '#8a93a6', marginTop: 0, fontSize: 14 }}>Video generativo desde las imagenes reales de tu pagina. Extraer imagenes = $0; solo paga la generacion.</p>

      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <input style={inp} placeholder="https://tu-sitio.com" value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && analyze()} />
          <button style={btn} onClick={analyze}>Analizar</button>
        </div>
        {analyzing && <p style={{ color: '#8a93a6', fontSize: 13, margin: '8px 0 0' }}>{analyzing}</p>}
      </div>

      {brief && (
        <>
          {/* modelo */}
          <div style={{ ...card, marginBottom: 16 }}>
            <label style={{ fontSize: 13, color: '#8a93a6' }}>Modelo de IA</label>
            <select style={{ ...inp, marginTop: 6 }} value={modelId} onChange={e => setModelId(e.target.value)}>
              {models.map(m => <option key={m.id} value={m.id}>{m.label} — ${m.price_s}/s · hasta {m.max_images} img</option>)}
            </select>
            {model && <p style={{ color: '#8a93a6', fontSize: 12.5, margin: '8px 0 0' }}>{model.desc}</p>}
          </div>

          {/* imagenes */}
          <div style={{ ...card, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <b>Elegi imagenes ({sel.length}/{maxImg})</b>
              <span style={{ color: '#8a93a6', fontSize: 12 }}>{maxImg > 1 ? 'la 1ra = primer frame' : 'este modelo acepta 1 imagen'}</span>
            </div>
            {images.length === 0 && <p style={{ color: '#8a93a6', fontSize: 13 }}>No se encontraron imagenes usables en la pagina.</p>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
              {images.map((u) => {
                const i = sel.indexOf(u)
                return (
                  <button key={u} onClick={() => toggle(u)} style={{ position: 'relative', padding: 0, border: i >= 0 ? '2px solid #5b8cff' : '2px solid transparent', borderRadius: 10, overflow: 'hidden', cursor: 'pointer', background: '#0f1320', aspectRatio: '1' }}>
                    <img src={u} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    {i >= 0 && <span style={{ position: 'absolute', top: 6, left: 6, background: '#5b8cff', color: '#fff', borderRadius: 999, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{i + 1}</span>}
                  </button>
                )
              })}
            </div>
          </div>

          {/* desarrollo + opciones */}
          <div style={{ ...card, marginBottom: 16 }}>
            <label style={{ fontSize: 13, color: '#cfd6e6', fontWeight: 600 }}>Desarrollo — escribí primero qué querés mostrar</label>
            <p style={{ color: '#8a93a6', fontSize: 12, margin: '4px 0 0' }}>Escena · mood/luz · ritmo · dónde termina · qué evitar. Esto manda en el prompt.</p>
            <textarea style={{ ...inp, marginTop: 8, minHeight: 72, resize: 'vertical' }} value={desarrollo} onChange={e => setDesarrollo(e.target.value)} placeholder="ej: enfocar el producto en una cocina natural con luz de mañana, ritmo calmo, primer plano del frasco, terminar con una mano poniéndolo en una caja de envío" />
            <div style={{ display: 'flex', gap: 14, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <label style={{ fontSize: 13, color: '#8a93a6' }}>Duracion
                <select style={{ ...inp, width: 'auto', marginLeft: 6 }} value={seconds} onChange={e => setSeconds(e.target.value)} disabled={availDurations(model, resolution).length <= 1}>
                  {availDurations(model, resolution).map(n => <option key={n} value={n}>{n}s</option>)}
                </select>
              </label>
              {model?.resolutions?.length > 0 && (
                <label style={{ fontSize: 13, color: '#8a93a6' }}>Resolucion
                  <select style={{ ...inp, width: 'auto', marginLeft: 6 }} value={resolution} onChange={e => setResolution(e.target.value)}>
                    {model.resolutions.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </label>
              )}
              <span style={{ color: '#8a93a6', fontSize: 12 }}>≈ ${est.toFixed(2)} este video</span>
            </div>

            {!promptReady ? (
              <div style={{ marginTop: 16 }}>
                <button onClick={() => { setPromptEdited(false); setPromptReady(true); buildPrompt() }} style={btn}>Crear prompt con el análisis + tu desarrollo</button>
                <p style={{ color: '#8a93a6', fontSize: 12, margin: '8px 0 0' }}>Se arma con lo que escribiste arriba. Gratis, no usa IA — y lo vas a poder editar.</p>
              </div>
            ) : (
              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <label style={{ fontSize: 13, color: '#8a93a6' }}>Prompt (tu desarrollo + análisis — editable)</label>
                  <button onClick={() => { setPromptEdited(false); buildPrompt() }} style={{ background: 'none', border: 0, color: '#5b8cff', cursor: 'pointer', fontSize: 12, padding: 0 }}>↻ regenerar</button>
                </div>
                <textarea style={{ ...inp, marginTop: 6, minHeight: 110, resize: 'vertical', fontSize: 12.5, lineHeight: 1.5 }} value={prompt} onChange={e => { setPrompt(e.target.value); setPromptEdited(true) }} placeholder="Se arma del Desarrollo + análisis. Editalo para controlar cada toma." />
                <p style={{ color: '#8a93a6', fontSize: 12, margin: '6px 0 0' }}>Mientras no lo edites a mano, se actualiza solo cuando cambiás el Desarrollo.</p>
              </div>
            )}
          </div>

          {promptReady && (
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
              <button style={{ ...btn, opacity: busy ? 0.6 : 1 }} onClick={generate} disabled={busy}>{busy ? 'Generando…' : 'Generar video IA'}</button>
              {!busy && gen && <span style={{ color: '#8a93a6', fontSize: 13 }}>{gen}</span>}
            </div>
          )}

          {/* consola de progreso: cronometro + log de pasos, para saber si avanza o se clavo */}
          {(busy || genLog.length > 0) && (
            <div style={{ ...card, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <b style={{ fontSize: 13 }}>{busy ? 'Generando video' : (video ? 'Listo' : 'Generación')}</b>
                <span style={{ fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums', color: busy ? '#5b8cff' : '#8a93a6', fontSize: 14 }}>⏱ {fmtTime(elapsed)}</span>
              </div>
              <div style={{ maxHeight: 170, overflowY: 'auto', fontSize: 12.5, lineHeight: 1.8, fontFamily: 'monospace' }}>
                {genLog.map((e, i) => (
                  <div key={i} style={{ color: i === genLog.length - 1 ? '#e8ecf6' : '#7e879c' }}>
                    <span style={{ color: '#5b8cff' }}>{fmtTime(e.t)}</span> · {e.msg}
                  </div>
                ))}
                {busy && <div style={{ color: '#8a93a6' }}><span className="cineBlink">●</span> consultando a fal cada 3s… (la generación puede tardar varios minutos en silencio — eso es normal)</div>}
              </div>
              {busy && (
                <p style={{ color: '#8a93a6', fontSize: 11.5, margin: '10px 0 0' }}>
                  Mientras el cronómetro avance y veas “●”, sigue vivo. Si pasa de ~15 min sin terminar, probablemente quedó clavado en cola: pará, reintentá, o probá un modelo @480p.
                </p>
              )}
            </div>
          )}
        </>
      )}

      {video && (
        <div style={card}>
          <video src={video.url} controls autoPlay loop style={{ width: '100%', maxWidth: 360, borderRadius: 12, display: 'block', margin: '0 auto' }} />
          <details style={{ marginTop: 12 }}>
            <summary style={{ cursor: 'pointer', color: '#8a93a6', fontSize: 13 }}>Prompt usado</summary>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, color: '#9aa3b8', background: '#0f1320', padding: 12, borderRadius: 10, marginTop: 8 }}>{video.prompt}</pre>
          </details>
          <a href={video.url} download style={{ ...btn, display: 'inline-block', marginTop: 12, textDecoration: 'none' }}>Descargar</a>
        </div>
      )}
    </div>
  )
}
