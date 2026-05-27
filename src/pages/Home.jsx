import { useState, useRef } from 'react'
import styles from './Home.module.css'

const FORMATS = [
  { val: 'reel', label: 'Reel / TikTok', icon: '📱' },
  { val: 'youtube', label: 'YouTube', icon: '🖥️' },
  { val: 'feed', label: 'Feed cuadrado', icon: '⬛' },
]

const STEPS = [
  { key: 'browse',   label: 'Abriendo la página',        detail: 'Iniciando agente Playwright' },
  { key: 'navigate', label: 'Navegando y grabando',       detail: 'El agente ejecuta las instrucciones' },
  { key: 'detect',   label: 'Detectando momentos clave',  detail: 'Analizando clicks y transiciones' },
  { key: 'edit',     label: 'Editando con FFmpeg',        detail: 'Zoom, speed ramp, captions' },
  { key: 'voice',    label: 'Generando voz en off',       detail: 'Narración sincronizada' },
  { key: 'export',   label: 'Ensamblando video final',    detail: 'Combinando audio, captions y logo' },
]

const DURATIONS = [18, 25, 8, 20, 8, 6] // seg simulados por paso

export default function Home() {
  const [url, setUrl] = useState('')
  const [action, setAction] = useState('')
  const [format, setFormat] = useState('reel')
  const [style, setStyle] = useState('epic')
  const [voice, setVoice] = useState('female')
  const [logoFile, setLogoFile] = useState(null)
  const [phase, setPhase] = useState('form') // form | progress | result
  const [stepStates, setStepStates] = useState({})
  const [progress, setProgress] = useState(0)
  const [errors, setErrors] = useState({})
  const [videoUrl, setVideoUrl] = useState(null)
  const fileRef = useRef()

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
    setPhase('progress')
    setStepStates({})
    setProgress(0)

    // TODO: reemplazar con llamada real al backend
    // const res = await fetch(`${import.meta.env.VITE_API_URL}/api/generate`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ url, action, format, style, voice })
    // })
    // const { job_id } = await res.json()
    // conectar WebSocket: new WebSocket(`${WS_URL}/ws/${job_id}`)

    simulateProgress()
  }

  function simulateProgress() {
    let idx = 0
    const pctPerStep = 100 / STEPS.length

    function runStep() {
      if (idx >= STEPS.length) {
        setProgress(100)
        setTimeout(() => setPhase('result'), 800)
        return
      }
      const key = STEPS[idx].key
      setStepStates(prev => ({ ...prev, [key]: 'running' }))

      const dur = DURATIONS[idx] * 1000
      const startTime = Date.now()
      const startPct = idx * pctPerStep

      function tick() {
        const elapsed = Date.now() - startTime
        const frac = Math.min(elapsed / dur, 1)
        setProgress(startPct + frac * pctPerStep)
        if (frac < 1) requestAnimationFrame(tick)
      }
      tick()

      setTimeout(() => {
        setStepStates(prev => ({ ...prev, [key]: 'done' }))
        idx++
        setTimeout(runStep, 300)
      }, dur)
    }
    runStep()
  }

  function handleReset() {
    setPhase('form')
    setStepStates({})
    setProgress(0)
    setVideoUrl(null)
  }

  return (
    <div className={styles.page}>
      <div className={styles.glow} />

      <div className={styles.wrap}>
        <nav className={styles.nav}>
          <div className={styles.logo}>cliping<span>.ia</span></div>
          <div className={styles.badge}>BETA</div>
        </nav>

        {phase === 'form' && (
          <>
            <div className={styles.hero}>
              <div className={styles.heroTag}>
                <span className={styles.dot} />
                IA navega, graba y edita por vos
              </div>
              <h1>Tu producto en acción,<br />convertido en <em>reel</em></h1>
              <p className={styles.sub}>
                Pegá una URL, describí la acción. La IA navega como un humano,
                graba todo y te entrega un video de marketing listo para publicar.
              </p>
            </div>

            <div className={styles.card}>
              <div className={styles.field}>
                <label>URL del sitio</label>
                <input
                  type="text"
                  value={url}
                  onChange={e => { setUrl(e.target.value); setErrors(p => ({ ...p, url: false })) }}
                  placeholder="https://tu-tienda.com"
                  className={errors.url ? styles.inputError : ''}
                />
                {errors.url && <span className={styles.errorMsg}>Ingresá una URL</span>}
              </div>

              <div className={styles.field}>
                <label>¿Qué debe hacer el agente?</label>
                <textarea
                  value={action}
                  onChange={e => { setAction(e.target.value); setErrors(p => ({ ...p, action: false })) }}
                  rows={3}
                  placeholder="Hacé un pedido de chocolate, registrate en el sitio, navegá el catálogo..."
                  className={errors.action ? styles.inputError : ''}
                />
                {errors.action && <span className={styles.errorMsg}>Describí qué debe hacer el agente</span>}
              </div>

              <div className={styles.field}>
                <label>Formato del video</label>
                <div className={styles.chips}>
                  {FORMATS.map(f => (
                    <button
                      key={f.val}
                      className={`${styles.chip} ${format === f.val ? styles.chipActive : ''}`}
                      onClick={() => setFormat(f.val)}
                    >
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
                    <option value="male">Masculina</option>
                    <option value="none">Sin voz</option>
                  </select>
                </div>
              </div>

              <div className={styles.field}>
                <label>Logo al final (opcional)</label>
                <div
                  className={styles.uploadArea}
                  onClick={() => fileRef.current?.click()}
                >
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/svg+xml"
                    style={{ display: 'none' }}
                    onChange={e => setLogoFile(e.target.files[0])}
                  />
                  <div className={styles.uploadIcon}>↑</div>
                  {logoFile
                    ? <p className={styles.uploadDone}>{logoFile.name} cargado ✓</p>
                    : <p className={styles.uploadText}>Arrastrá tu logo o <strong>hacé click para subir</strong><br /><small>PNG o SVG — aparece animado al final</small></p>
                  }
                </div>
              </div>

              <button className={styles.btnGenerate} onClick={handleGenerate}>
                ✦ Generar video
              </button>
            </div>
          </>
        )}

        {phase === 'progress' && (
          <div className={styles.card}>
            <div className={styles.progressHeader}>
              <div className={styles.progressTitle}>Generando tu video...</div>
              <div className={styles.progressEta}>
                {progress < 100 ? `${Math.round(progress)}%` : 'Listo!'}
              </div>
            </div>

            <div className={styles.steps}>
              {STEPS.map(s => {
                const state = stepStates[s.key] || 'idle'
                return (
                  <div key={s.key} className={`${styles.step} ${styles['step_' + state]}`}>
                    <div className={styles.stepIcon}>
                      {state === 'done' ? '✓' : state === 'running' ? '↻' : '·'}
                    </div>
                    <div className={styles.stepInfo}>
                      <div className={styles.stepName}>{s.label}</div>
                      <div className={styles.stepDetail}>{s.detail}</div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className={styles.barWrap}>
              <div className={styles.barFill} style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {phase === 'result' && (
          <div className={styles.card}>
            <div className={styles.sectionLabel}>Tu video está listo</div>
            <div className={styles.videoPreview}>
              {videoUrl
                ? <video src={videoUrl} controls style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }} />
                : <div className={styles.playBtn}><div className={styles.playTri} /></div>
              }
            </div>
            <div className={styles.dlRow}>
              <button
                className={`${styles.btnDl} ${styles.btnDlPrimary}`}
                onClick={() => videoUrl ? window.open(videoUrl) : alert('Backend no conectado aún')}
              >
                ↓ Descargar
              </button>
              <button className={`${styles.btnDl} ${styles.btnDlSecondary}`} onClick={handleReset}>
                ↺ Nuevo video
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
