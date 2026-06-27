import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'

// Cine IA — genera un clip de video con IA (varios modelos de fal) desde las IMAGENES REALES del sitio + un prompt
// por beats derivado del analisis (perception). Extraer imagenes = $0; solo paga la generacion. El usuario elige el
// MODELO; cada modelo dice cuantas imagenes acepta. Backend: /api/urvid/perceive, /api/seedance/models, /api/seedance/generate.
const API_URL = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:8000')
const HEADERS = { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }

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
  const [modelId, setModelId] = useState('ltx23-fast')
  const [desarrollo, setDesarrollo] = useState('')
  const [seconds, setSeconds] = useState(10)
  const [resolution, setResolution] = useState('')
  const [prompt, setPrompt] = useState('')
  const [analyzing, setAnalyzing] = useState('')
  const [gen, setGen] = useState('')
  const [video, setVideo] = useState(null)
  const pollRef = useRef(null)

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

  useEffect(() => () => clearInterval(pollRef.current), [])

  async function analyze() {
    if (!url.trim()) return
    setAnalyzing('Analizando la pagina...'); setBrief(null); setImages([]); setSel([]); setVideo(null)
    try {
      const d = await (await fetch(`${API_URL}/api/urvid/perceive`, { method: 'POST', headers: HEADERS, body: JSON.stringify({ url: url.trim(), userId: user?.uid || '' }) })).json()
      if (d.error) { setAnalyzing(d.error); return }
      setBrief(d.brief); setImages(d.images || [])
      setAnalyzing(`${d.brief?.brand || '?'} · ${d.brief?.rubro || '?'} · ${(d.images || []).length} imagenes encontradas`)
      buildPrompt(d.brief, 1)
    } catch { setAnalyzing('Backend apagado — abri "start.bat" (corre en localhost:8000)') }
  }

  async function buildPrompt(b = brief, n = sel.length) {
    try {
      const d = await (await fetch(`${API_URL}/api/seedance/prompt`, { method: 'POST', headers: HEADERS, body: JSON.stringify({ brief: b, model: modelId, images: Math.max(1, n), desarrollo, seconds: Number(seconds) }) })).json()
      if (d.prompt) setPrompt(d.prompt)
    } catch { /* backend apagado */ }
  }

  const toggle = (u) => setSel(s => s.includes(u) ? s.filter(x => x !== u) : (s.length >= maxImg ? (maxImg === 1 ? [u] : s) : [...s, u]))

  async function generate() {
    if (!sel.length) { setGen('Elegi al menos 1 imagen'); return }
    setGen('Iniciando...'); setVideo(null)
    try {
      const d = await (await fetch(`${API_URL}/api/seedance/generate`, {
        method: 'POST', headers: HEADERS,
        body: JSON.stringify({ images: sel, brief, desarrollo, prompt: prompt.trim(), model: modelId, seconds: Number(seconds), resolution, userId: user?.uid || '' }),
      })).json()
      if (d.error || !d.job_id) { setGen(d.error || 'no se pudo iniciar'); return }
      poll(d.job_id)
    } catch { setGen('Backend apagado — abri "start.bat"') }
  }

  function poll(jobId) {
    clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const j = await (await fetch(`${API_URL}/api/jobs/${jobId}`, { headers: HEADERS })).json()
        if (j.status === 'done') { clearInterval(pollRef.current); setGen(''); setVideo({ url: j.videoUrl, prompt: j.prompt }) }
        else if (j.status === 'error') { clearInterval(pollRef.current); setGen('Error: ' + (j.error || '')) }
        else setGen(`${j.step || 'generando'}... ${j.progress || 0}%`)
      } catch { /* sigue */ }
    }, 3000)
  }

  const est = (model?.price_s || 0.04) * Number(seconds)

  return (
    <div style={{ maxWidth: 920, margin: '0 auto', padding: '24px 20px', color: '#e8ecf6' }}>
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
            <label style={{ fontSize: 13, color: '#8a93a6' }}>Desarrollo (que querés mostrar / enfatizar)</label>
            <textarea style={{ ...inp, marginTop: 6, minHeight: 64, resize: 'vertical' }} value={desarrollo} onChange={e => setDesarrollo(e.target.value)} placeholder="ej: enfocar el producto en cocina natural, ritmo calmo, terminar en una caja de envio" />
            <div style={{ display: 'flex', gap: 14, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <label style={{ fontSize: 13, color: '#8a93a6' }}>Duracion
                <select style={{ ...inp, width: 'auto', marginLeft: 6 }} value={seconds} onChange={e => setSeconds(e.target.value)}>
                  {(model?.durations || [5, 10]).map(n => <option key={n} value={n}>{n}s</option>)}
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
            <div style={{ marginTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <label style={{ fontSize: 13, color: '#8a93a6' }}>Prompt (generado del analisis — editable)</label>
                <button onClick={() => buildPrompt()} style={{ background: 'none', border: 0, color: '#5b8cff', cursor: 'pointer', fontSize: 12, padding: 0 }}>↻ regenerar desde el analisis</button>
              </div>
              <textarea style={{ ...inp, marginTop: 6, minHeight: 110, resize: 'vertical', fontSize: 12.5, lineHeight: 1.5 }} value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Se arma del analisis al apretar Analizar. Editalo para controlar cada toma." />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
            <button style={{ ...btn, opacity: gen ? 0.6 : 1 }} onClick={generate} disabled={!!gen}>Generar video IA</button>
            {gen && <span style={{ color: '#8a93a6', fontSize: 13 }}>{gen}</span>}
          </div>
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
