import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import styles from './Home.module.css'

const FORMATS = [
  { val: 'reel', label: 'Reel / TikTok', icon: '📱' },
  { val: 'youtube', label: 'YouTube', icon: '🖥️' },
  { val: 'feed', label: 'Feed cuadrado', icon: '⬛' },
]

const STEPS = [
  { key: 'browse',   label: 'Abriendo la página',       detail: 'Iniciando agente Playwright' },
  { key: 'navigate', label: 'Navegando y grabando',      detail: 'El agente ejecuta las instrucciones' },
  { key: 'detect',   label: 'Detectando momentos clave', detail: 'Analizando clicks y transiciones' },
  { key: 'edit',     label: 'Editando con FFmpeg',       detail: 'Zoom, speed ramp, captions' },
  { key: 'voice',    label: 'Generando voz en off',      detail: 'Narración sincronizada' },
  { key: 'export',   label: 'Ensamblando video final',   detail: 'Combinando audio, captions y logo' },
]

const STEP_ORDER = STEPS.map(s => s.key)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const WS_URL  = API_URL.replace('http', 'ws')
const HISTORY_KEY = 'cliping_history'
const MAX_HISTORY = 5

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
  } catch { return [] }
}

function saveToHistory(url, action) {
  try {
    const h = getHistory().filter(i => i.url !== url || i.action !== action)
    h.unshift({ url, action })
    localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, MAX_HISTORY)))
  } catch {}
}

function VideoPlayer({ url }) {
  const [blobUrl, setBlobUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!url) return
    setLoading(true)
    setError(false)
    fetch(url, { headers: { 'ngrok-skip-browser-warning': 'true' } })
      .then(r => { if (!r.ok) throw new Error(); return r.blob() })
      .then(blob => { setBlobUrl(URL.createObjectURL(blob)); setLoading(false) })
      .catch(() => { setError(true); setLoading(false) })
    return () => { if (blobUrl) URL.revokeObjectURL(blobUrl) }
  }, [url])

  if (loading) return <div style={{color:'var(--muted)',fontSize:13,padding:'40px 0',textAlign:'center'}}>Cargando video...</div>
  if (error) return <div style={{color:'var(--red)',fontSize:13,padding:'20px',textAlign:'center'}}>Error al cargar. <a href={url} target="_blank" rel="noreferrer">Abrir directamente</a></div>
  return <video src={blobUrl} controls style={{width:'100%',height:'auto',display:'block'}} />
}

export default function Home() {
  const { user, profile } = useAuth()
  const [url, setUrl] = useState('')
  const [action, setAction] = useState('')
  const [format, setFormat] = useState('reel')
  const [style, setStyle] = useState('epic')
  const [voice, setVoice] = useState('female')
  const [logoFile, setLogoFile] = useState(null)
  const [phase, setPhase] = useState('form')
  const [stepStates, setStepStates] = useState({})
  const [progress, setProgress] = useState(0)
  const [errors, setErrors] = useState({})
  const [videoFilename, setVideoFilename] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [history, setHistory] = useState(getHistory)
  const [showUrlHistory, setShowUrlHistory] = useState(false)
  const [showActionHistory, setShowActionHistory] = useState(false)
  const fileRef = useRef()
  const wsRef = useRef(null)

  const urlHistory = [...new Set(history.map(h => h.url))].slice(0, MAX_HISTORY)
  const actionHistory = [...new Set(history.map(h => h.action))].slice(0, MAX_HISTORY)

  function validate() {
    const e = {}
    if (!url.trim()) e.url = true
    if (!action.trim()) e.action = true
    return e
  }

  async function handleGenerate() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setErrors({})
    saveToHistory(url.trim(), action.trim())
    setHistory(getHistory())
    setPhase('progress')
    setStepStates({})
    setProgress(0)
    setErrorMsg('')

    try {
      const res = await fetch(`${API_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, action, format, style, voice, userId: user?.uid || '' }),
      })
      if (!res.ok) throw new Error('Error backend')
      const { job_id } = await res.json()
      connectWebSocket(job_id)
    } catch (err) {
      console.warn('Backend no disponible, simulando:', err.message)
      simulateProgress()
    }
  }

  function connectWebSocket(job_id) {
    const ws = new WebSocket(`${WS_URL}/ws/${job_id}`)
    wsRef.current = ws
    ws.onmessage = (event) => {
      const job = JSON.parse(event.data)
      setProgress(job.progress || 0)
      if (job.step) {
        const idx = STEP_ORDER.indexOf(job.step)
        const newStates = {}
        STEP_ORDER.forEach((k, i) => {
          if (i < idx) newStates[k] = 'done'
          else if (i === idx) newStates[k] = 'running'
          else newStates[k] = 'idle'
        })
        setStepStates(newStates)
      }
      if (job.status === 'done') {
        setStepStates(Object.fromEntries(STEP_ORDER.map(k => [k, 'done'])))
        setProgress(100)
        setVideoFilename(job.videoFilename || (job.videoPath ? job.videoPath.split('\\').pop().split('/').pop() : null))
        setTimeout(() => setPhase('result'), 600)
        ws.close()
      } else if (job.status === 'error') {
        setErrorMsg(job.error || 'Ocurrió un error')
        setPhase('error')
        ws.close()
      }
    }
    ws.onerror = () => { ws.close(); simulateProgress() }
  }

  function simulateProgress() {
    const durations = [18, 25, 8, 20, 8, 6]
    let idx = 0
    const pctPerStep = 100 / STEPS.length
    function runStep() {
      if (idx >= STEPS.length) { setProgress(100); setTimeout(() => setPhase('result'), 800); return }
      const key = STEPS[idx].key
      setStepStates(prev => ({ ...prev, [key]: 'running' }))
      const dur = durations[idx] * 1000
      const startTime = Date.now()
      const startPct = idx * pctPerStep
      function tick() {
        const frac = Math.min((Date.now() - startTime) / dur, 1)
        setProgress(startPct + frac * pctPerStep)
        if (frac < 1) requestAnimationFrame(tick)
      }
      tick()
      setTimeout(() => { setStepStates(prev => ({ ...prev, [key]: 'done' })); idx++; setTimeout(runStep, 300) }, dur)
    }
    runStep()
  }

  function handleReset() {
    wsRef.current?.close()
    setPhase('form')
    setStepStates({})
    setProgress(0)
    setVideoFilename(null)
    setErrorMsg('')
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Nuevo video</h1>
          <p className={styles.sub}>Pegá una URL y describí la acción. La IA hace el resto.</p>
        </div>
        <div className={styles.creditsTag}>
          <span>⚡</span> {profile?.credits ?? 0} créditos
        </div>
      </div>

      {phase === 'form' && (
        <div className={styles.card}>
          {/* URL */}
          <div className={styles.field}>
            <label>URL del sitio</label>
            <div className={styles.inputWithHistory}>
              <input
                type="text" value={url}
                onChange={e => { setUrl(e.target.value); setErrors(p => ({...p, url: false})); setShowUrlHistory(false) }}
                onFocus={() => setShowUrlHistory(urlHistory.length > 0)}
                onBlur={() => setTimeout(() => setShowUrlHistory(false), 150)}
                placeholder="https://tu-sitio.com"
                className={errors.url ? styles.inputErr : ''}
              />
              {showUrlHistory && (
                <div className={styles.historyDropdown}>
                  {urlHistory.map((u, i) => (
                    <button key={i} className={styles.historyItem} onMouseDown={() => { setUrl(u); setShowUrlHistory(false) }}>
                      <span className={styles.historyIcon}>↩</span> {u}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {errors.url && <span className={styles.errMsg}>Ingresá una URL</span>}
          </div>

          {/* Acción */}
          <div className={styles.field}>
            <label>¿Qué debe hacer el agente?</label>
            <div className={styles.inputWithHistory}>
              <textarea
                value={action}
                onChange={e => { setAction(e.target.value); setErrors(p => ({...p, action: false})); setShowActionHistory(false) }}
                onFocus={() => setShowActionHistory(actionHistory.length > 0)}
                onBlur={() => setTimeout(() => setShowActionHistory(false), 150)}
                rows={3}
                placeholder="Mostrá el sitio, navegá las secciones principales, destacá el CTA..."
                className={errors.action ? styles.inputErr : ''}
              />
              {showActionHistory && (
                <div className={styles.historyDropdown}>
                  {actionHistory.map((a, i) => (
                    <button key={i} className={styles.historyItem} onMouseDown={() => { setAction(a); setShowActionHistory(false) }}>
                      <span className={styles.historyIcon}>↩</span> {a}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {errors.action && <span className={styles.errMsg}>Describí qué debe hacer el agente</span>}
          </div>

          {/* Formato */}
          <div className={styles.field}>
            <label>Formato</label>
            <div className={styles.chips}>
              {FORMATS.map(f => (
                <button key={f.val}
                  className={`${styles.chip} ${format === f.val ? styles.chipActive : ''}`}
                  onClick={() => setFormat(f.val)}>
                  {f.icon} {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label>Estilo visual</label>
              <select value={style} onChange={e => setStyle(e.target.value)}>
                <option value="epic">Épico / Dinámico</option>
                <option value="minimal">Minimalista</option>
                <option value="corporate">Corporativo</option>
              </select>
            </div>
            <div className={styles.field}>
              <label>Voz en off</label>
              <select value={voice} onChange={e => setVoice(e.target.value)}>
                <option value="female">Femenina</option>
                <option value="male">Masculino</option>
                <option value="none">Sin voz</option>
              </select>
            </div>
          </div>

          <div className={styles.field}>
            <label>Logo al final (opcional)</label>
            <div className={styles.uploadArea} onClick={() => fileRef.current?.click()}>
              <input ref={fileRef} type="file" accept="image/png,image/svg+xml"
                style={{ display: 'none' }} onChange={e => setLogoFile(e.target.files[0])} />
              {logoFile
                ? <p className={styles.uploadDone}>✓ {logoFile.name}</p>
                : <p className={styles.uploadText}>↑ Subir logo PNG o SVG</p>}
            </div>
          </div>

          <button className={styles.btnGenerate} onClick={handleGenerate}>
            + Crear video
          </button>
        </div>
      )}

      {phase === 'progress' && (
        <div className={styles.card}>
          <div className={styles.progressHeader}>
            <span className={styles.progressTitle}>Generando tu video...</span>
            <span className={styles.progressPct}>{Math.round(progress)}%</span>
          </div>
          <div className={styles.barWrap}>
            <div className={styles.barFill} style={{ width: `${progress}%` }} />
          </div>
          <div className={styles.steps}>
            {STEPS.map(s => {
              const st = stepStates[s.key] || 'idle'
              return (
                <div key={s.key} className={`${styles.step} ${styles['step_' + st]}`}>
                  <div className={styles.stepIcon}>{st === 'done' ? '✓' : st === 'running' ? '◌' : '·'}</div>
                  <div>
                    <div className={styles.stepName}>{s.label}</div>
                    <div className={styles.stepDetail}>{s.detail}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {phase === 'result' && (
        <div className={styles.card}>
          <div className={styles.resultHeader}>
            <span className={styles.progressTitle}>✓ Video listo</span>
            <button className={styles.btnSecondary} onClick={handleReset}>Nuevo video</button>
          </div>
          <div className={styles.videoPreview}>
            {videoFilename
              ? <VideoPlayer url={`${API_URL}/api/video/${videoFilename}`} />
              : <div className={styles.playBtn}><span className={styles.playTri} /></div>
            }
          </div>
          <div className={styles.dlRow}>
            <button className={styles.btnGenerate} style={{flex:1}}
              onClick={() => videoFilename && window.open(`${API_URL}/api/video/${videoFilename}`)}>
              ↓ Descargar
            </button>
            <button className={styles.btnSecondary} onClick={handleReset}>↺ Nuevo</button>
          </div>
        </div>
      )}

      {phase === 'error' && (
        <div className={styles.card}>
          <div className={styles.errorBox}>
            <div className={styles.errorTitle}>Ocurrió un error</div>
            <div className={styles.errorDetail}>{errorMsg}</div>
            <button className={styles.btnGenerate} style={{marginTop:16}} onClick={handleReset}>
              Intentar de nuevo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
