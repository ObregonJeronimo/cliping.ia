import { useState, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { doc, setDoc, collection } from 'firebase/firestore'
import { db } from '../lib/firebase'
import styles from './Home.module.css'

// ─── Constantes ────────────────────────────────────────────────────────────

const FORMATS = [
  { val: 'reel', label: 'Reel / TikTok', icon: '📱' },
  { val: 'youtube', label: 'YouTube', icon: '🖥️' },
  { val: 'feed', label: 'Feed cuadrado', icon: '⬛' },
]

const STEPS = [
  { key: 'browse',   label: 'Analizando la página',      detail: 'Extrayendo datos y assets' },
  { key: 'navigate', label: 'Navegando',                  detail: 'El agente recorre el sitio' },
  { key: 'detect',   label: 'Seleccionando momentos',     detail: 'IA elige los mejores clips' },
  { key: 'edit',     label: 'Generando animaciones',      detail: 'Remotion crea el video' },
  { key: 'voice',    label: 'Voz en off',                 detail: 'Narración sincronizada' },
  { key: 'export',   label: 'Exportando',                 detail: 'Ensamblando el video final' },
]

const VISUAL_STYLES = [
  { val: 'dark_premium', label: 'Dark Premium', desc: 'Oscuro, elegante, moderno', icon: '🌑' },
  { val: 'neon',         label: 'Neon',         desc: 'Colores vibrantes, cyberpunk', icon: '⚡' },
  { val: 'minimal',      label: 'Minimalista',  desc: 'Limpio, blanco, tipografía', icon: '◻️' },
  { val: 'brand',        label: 'Marca',        desc: 'Usa los colores del sitio', icon: '🎨' },
  { val: 'corporate',    label: 'Corporativo',  desc: 'Profesional, serio', icon: '💼' },
]

const NARRATIVES = [
  { val: 'problem_solution', label: 'Problema → Solución', desc: 'Mostrá el pain point y la respuesta', icon: '💡' },
  { val: 'before_after',     label: 'Antes / Después',    desc: 'Transformación clara y poderosa', icon: '🔄' },
  { val: 'features',         label: 'Features destacadas', desc: 'Mostrá las funciones clave', icon: '✨' },
  { val: 'social_proof',     label: 'Social proof',        desc: 'Confianza, testimonios, números', icon: '⭐' },
  { val: 'urgency',          label: 'Urgencia / CTA',      desc: 'Directo al grano, llamada a actuar', icon: '🚀' },
  { val: 'story',            label: 'Historia',            desc: 'Narrativa emocional de 3 actos', icon: '📖' },
]

const HOOKS = [
  { val: 'question',   label: '¿Pregunta impactante?',   icon: '❓' },
  { val: 'stat',       label: 'Dato sorprendente',        icon: '📊' },
  { val: 'bold',       label: 'Afirmación bold',          icon: '🔥' },
  { val: 'did_you',    label: '¿Sabías que...?',          icon: '💭' },
  { val: 'result',     label: 'Resultado prometido',      icon: '🎯' },
  { val: 'pain',       label: 'Dolor directo',            icon: '😤' },
]

const TONES = [
  { val: 'professional', label: 'Profesional', icon: '👔' },
  { val: 'enthusiastic', label: 'Entusiasta',  icon: '🙌' },
  { val: 'urgent',       label: 'Urgente',     icon: '⏰' },
  { val: 'trustworthy',  label: 'Confiable',   icon: '🤝' },
  { val: 'disruptive',   label: 'Disruptivo',  icon: '💥' },
]

const FOCUSES = [
  { val: 'product',   label: 'Mostrar el producto',   icon: '📱' },
  { val: 'problem',   label: 'El problema que resuelve', icon: '🎯' },
  { val: 'benefits',  label: 'Beneficios clave',       icon: '✅' },
  { val: 'flow',      label: 'Cómo funciona',          icon: '🔄' },
  { val: 'proof',     label: 'Prueba social',          icon: '⭐' },
]

const DURATIONS = [
  { val: 15,  label: '15s', desc: 'Hook directo' },
  { val: 30,  label: '30s', desc: 'Completo' },
  { val: 45,  label: '45s', desc: 'Con detalle' },
  { val: 60,  label: '60s', desc: 'Extenso' },
]

const STEP_ORDER = STEPS.map(s => s.key)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const WS_URL  = API_URL.replace('http', 'ws')
const URL_LIST_KEY    = 'cliping_url_list'
const ACTION_LIST_KEY = 'cliping_action_list'

function loadList(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] }
}
function saveList(key, list) {
  try { localStorage.setItem(key, JSON.stringify(list)) } catch {}
}

// ─── SavedList ─────────────────────────────────────────────────────────────

function SavedList({ listKey, value, onSelect, multiline = false }) {
  const [items, setItems] = useState(() => loadList(listKey))
  const [open, setOpen] = useState(false)
  const [editIdx, setEditIdx] = useState(null)
  const [editVal, setEditVal] = useState('')

  function add() {
    if (!value.trim()) return
    const next = [value.trim(), ...items.filter(i => i !== value.trim())].slice(0, 10)
    setItems(next); saveList(listKey, next)
  }
  function remove(idx) {
    const next = items.filter((_, i) => i !== idx)
    setItems(next); saveList(listKey, next)
  }
  function saveEdit() {
    if (!editVal.trim()) return
    const next = items.map((it, i) => i === editIdx ? editVal.trim() : it)
    setItems(next); saveList(listKey, next); setEditIdx(null)
  }

  return (
    <div className={styles.savedListWrap}>
      <button className={styles.saveBtn} onClick={add} title="Guardar" type="button">+</button>
      {items.length > 0 && (
        <button className={`${styles.listToggleBtn} ${open ? styles.listToggleActive : ''}`}
          onClick={() => setOpen(o => !o)} type="button">
          ▾ {items.length}
        </button>
      )}
      {open && (
        <div className={styles.savedDropdown}>
          <div className={styles.savedDropdownHeader}>Guardados</div>
          {items.map((item, idx) => (
            <div key={idx} className={styles.savedRow}>
              {editIdx === idx ? (
                <div className={styles.savedEditRow}>
                  {multiline
                    ? <textarea className={styles.savedEditInput} value={editVal} onChange={e => setEditVal(e.target.value)} rows={2} />
                    : <input className={styles.savedEditInput} value={editVal} onChange={e => setEditVal(e.target.value)} />
                  }
                  <button className={styles.savedAction} onClick={saveEdit}>✓</button>
                  <button className={styles.savedAction} onClick={() => setEditIdx(null)}>✕</button>
                </div>
              ) : (
                <>
                  <button className={styles.savedItemBtn} onClick={() => { onSelect(item); setOpen(false) }}>{item}</button>
                  <button className={styles.savedAction} onClick={() => { setEditIdx(idx); setEditVal(item) }}>✎</button>
                  <button className={styles.savedAction} onClick={() => remove(idx)}>✕</button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── OptionGrid ─────────────────────────────────────────────────────────────

function OptionGrid({ options, value, onChange, cols = 2 }) {
  return (
    <div className={styles.optionGrid} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {options.map(opt => (
        <button
          key={opt.val}
          type="button"
          className={`${styles.optionCard} ${value === opt.val ? styles.optionCardActive : ''}`}
          onClick={() => onChange(opt.val)}
        >
          <span className={styles.optionIcon}>{opt.icon}</span>
          <span className={styles.optionLabel}>{opt.label}</span>
          {opt.desc && <span className={styles.optionDesc}>{opt.desc}</span>}
        </button>
      ))}
    </div>
  )
}

// ─── DurationPicker ─────────────────────────────────────────────────────────

function DurationPicker({ value, onChange }) {
  return (
    <div className={styles.durationRow}>
      {DURATIONS.map(d => (
        <button
          key={d.val}
          type="button"
          className={`${styles.durationBtn} ${value === d.val ? styles.durationActive : ''}`}
          onClick={() => onChange(d.val)}
        >
          <span className={styles.durationLabel}>{d.label}</span>
          <span className={styles.durationDesc}>{d.desc}</span>
        </button>
      ))}
    </div>
  )
}

// ─── VideoPlayer ─────────────────────────────────────────────────────────────

function VideoPlayer({ url }) {
  const [blobUrl, setBlobUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useState(() => {
    if (!url) return
    setLoading(true); setError(false)
    fetch(url, { headers: { 'ngrok-skip-browser-warning': 'true' } })
      .then(r => { if (!r.ok) throw new Error(); return r.blob() })
      .then(blob => { setBlobUrl(URL.createObjectURL(blob)); setLoading(false) })
      .catch(() => { setError(true); setLoading(false) })
  }, [url])

  if (loading) return <div style={{color:'var(--muted)',fontSize:13,padding:'40px 0',textAlign:'center'}}>Cargando video...</div>
  if (error) return <div style={{color:'var(--red)',fontSize:13,padding:'20px',textAlign:'center'}}>Error al cargar. <a href={url} target="_blank" rel="noreferrer">Abrir directamente</a></div>
  return <video src={blobUrl} controls style={{width:'100%',height:'auto',display:'block'}} />
}

// ─── Home ───────────────────────────────────────────────────────────────────

export default function Home() {
  const { user, profile } = useAuth()
  const fileRef = useRef()

  // Form básico
  const [url, setUrl] = useState('')
  const [action, setAction] = useState('')
  const [format, setFormat] = useState('reel')
  const [voice, setVoice] = useState('female')
  const [logoFile, setLogoFile] = useState(null)
  const [mode, setMode] = useState('simple') // simple | advanced

  // Parámetros avanzados
  const [visualStyle, setVisualStyle] = useState('dark_premium')
  const [narrative, setNarrative] = useState('problem_solution')
  const [hook, setHook] = useState('question')
  const [tone, setTone] = useState('enthusiastic')
  const [focus, setFocus] = useState('product')
  const [duration, setDuration] = useState(30)

  // Estado del proceso
  const [phase, setPhase] = useState('form')
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef(null)
  const [stepStates, setStepStates] = useState({})
  const [progress, setProgress] = useState(0)
  const [errors, setErrors] = useState({})
  const [videoFilename, setVideoFilename] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const wsRef = useRef(null)

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
    setPhase('progress'); setStepStates({}); setProgress(0); setErrorMsg(''); setElapsed(0)
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)

    const payload = {
      url, action, format, voice,
      userId: user?.uid || '',
      // parámetros de video
      visualStyle, narrative, hook, tone, focus, duration,
      mode,
    }

    try {
      const res = await fetch(`${API_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error()
      const { job_id } = await res.json()
      connectWebSocket(job_id)
    } catch {
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
        const s = {}
        STEP_ORDER.forEach((k, i) => { s[k] = i < idx ? 'done' : i === idx ? 'running' : 'idle' })
        setStepStates(s)
      }
      if (job.status === 'done') {
        setStepStates(Object.fromEntries(STEP_ORDER.map(k => [k, 'done'])))
        setProgress(100)
        const fn = job.videoFilename || (job.videoPath ? job.videoPath.split('\\').pop().split('/').pop() : null)
        setVideoFilename(fn)
        if (fn) saveVideoToFirestore(job_id, fn, job)
        setTimeout(() => setPhase('result'), 600)
        clearInterval(timerRef.current)
        ws.close()
      } else if (job.status === 'error') {
        setErrorMsg(job.error || 'Ocurrió un error'); setPhase('error'); clearInterval(timerRef.current); ws.close()
      }
    }
    ws.onerror = () => { ws.close(); simulateProgress() }
  }

  function simulateProgress() {
    const durs = [18, 25, 8, 60, 8, 6]
    let idx = 0
    const pct = 100 / STEPS.length
    function run() {
      if (idx >= STEPS.length) { setProgress(100); setTimeout(() => setPhase('result'), 800); return }
      const key = STEPS[idx].key
      setStepStates(prev => ({ ...prev, [key]: 'running' }))
      const dur = durs[idx] * 1000; const t = Date.now(); const sp = idx * pct
      function tick() { const f = Math.min((Date.now()-t)/dur,1); setProgress(sp+f*pct); if(f<1) requestAnimationFrame(tick) }
      tick()
      setTimeout(() => { setStepStates(prev => ({...prev,[key]:'done'})); idx++; setTimeout(run,300) }, dur)
    }
    run()
  }

  async function saveVideoToFirestore(jobId, videoFilename, jobData) {
    if (!user) return
    try {
      const videoRef = doc(collection(db, 'users', user.uid, 'videos'), jobId)
      await setDoc(videoRef, {
        jobId,
        userId: user.uid,
        url,
        action,
        videoUrl: `${API_URL}/api/video/${videoFilename}`,
        filename: videoFilename,
        siteName: '',
        headline: '',
        animations: {},
        renderOk: true,
        createdAt: new Date(),
      })
    } catch (e) {
      console.error('[Home] Error guardando video en Firestore:', e)
    }
  }

  function handleReset() {
    wsRef.current?.close()
    setPhase('form'); setStepStates({}); setProgress(0); setVideoFilename(null); setErrorMsg('')
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Nuevo video</h1>
          <p className={styles.sub}>Ingresá una URL y configurá tu video. La IA hace el resto.</p>
        </div>
        <div className={styles.creditsTag}><span>⚡</span> {profile?.credits ?? 0} créditos</div>
      </div>

      {phase === 'form' && (
        <>
          {/* Toggle Modo */}
          <div className={styles.modeToggle}>
            <button
              className={`${styles.modeBtn} ${mode === 'simple' ? styles.modeBtnActive : ''}`}
              onClick={() => setMode('simple')}
            >
              ⚡ Modo simple
            </button>
            <button
              className={`${styles.modeBtn} ${mode === 'advanced' ? styles.modeBtnActive : ''}`}
              onClick={() => setMode('advanced')}
            >
              🎛️ Modo avanzado
            </button>
          </div>

          <div className={styles.card}>
            {/* URL */}
            <div className={styles.field}>
              <div className={styles.labelRow}>
                <label>URL del sitio</label>
                <SavedList listKey={URL_LIST_KEY} value={url} onSelect={setUrl} />
              </div>
              <input type="text" value={url}
                onChange={e => { setUrl(e.target.value); setErrors(p=>({...p,url:false})) }}
                placeholder="https://tu-sitio.com"
                className={errors.url ? styles.inputErr : ''} />
              {errors.url && <span className={styles.errMsg}>Ingresá una URL</span>}
            </div>

            {/* Acción */}
            <div className={styles.field}>
              <div className={styles.labelRow}>
                <label>¿Qué debe mostrar el video?</label>
                <SavedList listKey={ACTION_LIST_KEY} value={action} onSelect={setAction} multiline />
              </div>
              <textarea value={action}
                onChange={e => { setAction(e.target.value); setErrors(p=>({...p,action:false})) }}
                rows={3}
                placeholder="Mostrá el sitio y sus secciones principales para un video de marketing."
                className={errors.action ? styles.inputErr : ''} />
              {errors.action && <span className={styles.errMsg}>Describí qué debe mostrar</span>}
            </div>

            {/* Formato */}
            <div className={styles.field}>
              <label>Formato</label>
              <div className={styles.chips}>
                {FORMATS.map(f => (
                  <button key={f.val} className={`${styles.chip} ${format===f.val?styles.chipActive:''}`}
                    onClick={() => setFormat(f.val)} type="button">{f.icon} {f.label}</button>
                ))}
              </div>
            </div>

            {/* Voz */}
            <div className={styles.field}>
              <label>Voz en off</label>
              <div className={styles.voiceRow}>
                <select value={voice} onChange={e => setVoice(e.target.value)} style={{flex:1}}>
                  <option value="female">Femenina — Dalia</option>
                  <option value="male">Masculina — Jorge</option>
                  <option value="none">Sin voz</option>
                </select>
                {voice !== 'none' && (
                  <button className={styles.previewBtn} type="button"
                    onClick={async () => {
                      try {
                        const res = await fetch(`${API_URL}/api/voice-preview?voice=${voice}`, { headers: { 'ngrok-skip-browser-warning': 'true' } })
                        const blob = await res.blob()
                        new Audio(URL.createObjectURL(blob)).play()
                      } catch { alert('Backend no disponible') }
                    }}>▶ Escuchar</button>
                )}
              </div>
            </div>

            {/* MODO SIMPLE: solo duración */}
            {mode === 'simple' && (
              <div className={styles.field}>
                <label>Duración</label>
                <DurationPicker value={duration} onChange={setDuration} />
              </div>
            )}

            {/* MODO AVANZADO: todos los parámetros */}
            {mode === 'advanced' && (
              <>
                <div className={styles.advancedDivider}>
                  <span>Personalización avanzada</span>
                </div>

                <div className={styles.field}>
                  <label>Duración</label>
                  <DurationPicker value={duration} onChange={setDuration} />
                </div>

                <div className={styles.field}>
                  <label>Estilo visual</label>
                  <OptionGrid options={VISUAL_STYLES} value={visualStyle} onChange={setVisualStyle} cols={2} />
                </div>

                <div className={styles.field}>
                  <label>Estructura narrativa</label>
                  <OptionGrid options={NARRATIVES} value={narrative} onChange={setNarrative} cols={2} />
                </div>

                <div className={styles.field}>
                  <label>Hook de apertura</label>
                  <OptionGrid options={HOOKS} value={hook} onChange={setHook} cols={3} />
                </div>

                <div className={styles.field}>
                  <label>Tono</label>
                  <OptionGrid options={TONES} value={tone} onChange={setTone} cols={3} />
                </div>

                <div className={styles.field}>
                  <label>Foco del video</label>
                  <OptionGrid options={FOCUSES} value={focus} onChange={setFocus} cols={2} />
                </div>

                <div className={styles.field}>
                  <label>Logo al final (opcional)</label>
                  <div className={styles.uploadArea} onClick={() => fileRef.current?.click()}>
                    <input ref={fileRef} type="file" accept="image/png,image/svg+xml"
                      style={{display:'none'}} onChange={e => setLogoFile(e.target.files[0])} />
                    {logoFile ? <p className={styles.uploadDone}>✓ {logoFile.name}</p>
                              : <p className={styles.uploadText}>↑ Subir logo PNG o SVG</p>}
                  </div>
                </div>
              </>
            )}

            <button className={styles.btnGenerate} onClick={handleGenerate}>
              {mode === 'simple' ? '✦ Generar video' : '✦ Generar video personalizado'}
            </button>
          </div>
        </>
      )}

      {phase === 'progress' && (
        <div className={styles.card}>
          <div className={styles.progressHeader}>
            <span className={styles.progressTitle}>Generando tu video...</span>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <span style={{fontSize:12,color:'var(--muted)',fontVariantNumeric:'tabular-nums'}}>{Math.floor(elapsed/60).toString().padStart(2,'0')}:{(elapsed%60).toString().padStart(2,'0')}</span>
              <span className={styles.progressPct}>{Math.round(progress)}%</span>
            </div>
          </div>
          <div className={styles.barWrap}><div className={styles.barFill} style={{width:`${progress}%`}} /></div>
          <div className={styles.steps}>
            {STEPS.map(s => {
              const st = stepStates[s.key] || 'idle'
              return (
                <div key={s.key} className={`${styles.step} ${styles['step_'+st]}`}>
                  <div className={styles.stepIcon}>{st==='done'?'✓':st==='running'?'◌':'·'}</div>
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
              : <div className={styles.playBtn}><span className={styles.playTri} /></div>}
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
            <button className={styles.btnGenerate} style={{marginTop:16}} onClick={handleReset}>Intentar de nuevo</button>
          </div>
        </div>
      )}
    </div>
  )
}
