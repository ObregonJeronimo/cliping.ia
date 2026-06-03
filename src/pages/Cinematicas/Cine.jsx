import { useState, useEffect, useRef } from 'react'
import styles from './Cinematicas.module.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const HEADERS = { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }

const PROPOSITOS = [
  { key: 'marketing',    label: 'Marketing',     icon: '📣' },
  { key: 'informativo',  label: 'Informativo',   icon: '📋' },
  { key: 'presentacion', label: 'Presentación',  icon: '🎯' },
  { key: 'storytelling', label: 'Storytelling',  icon: '📖' },
  { key: 'producto',     label: 'Producto',      icon: '📦' },
  { key: 'branding',     label: 'Branding',      icon: '✨' },
]

const STEP_LABELS = {
  queued:   'En cola...',
  fetch:    'Cargando animaciones...',
  analyze:  'Analizando el sitio...',
  script:   'Escribiendo el guion con IA...',
  build:    'Armando la composición...',
  render:   'Renderizando el video (esto tarda)...',
  upload:   'Subiendo a la nube...',
  export:   'Listo',
}

export default function Cine() {
  const [library, setLibrary] = useState([])
  const [selected, setSelected] = useState([]) // ids seleccionados
  const [url, setUrl] = useState('')
  const [proposito, setProposito] = useState('marketing')
  const [desarrollo, setDesarrollo] = useState('')
  const [generating, setGenerating] = useState(false)
  const [status, setStatus] = useState(null)   // { step, progress }
  const [plan, setPlan] = useState(null)
  const [videoUrl, setVideoUrl] = useState(null)
  const [error, setError] = useState(null)
  const pollRef = useRef(null)

  useEffect(() => {
    loadLibrary()
    return () => clearInterval(pollRef.current)
  }, [])

  async function loadLibrary() {
    try {
      const r = await fetch(`${API_URL}/api/forge/library`, { headers: HEADERS })
      const d = await r.json()
      // Solo las que compilaron y tienen video (necesitamos el código renderizable)
      setLibrary((d.animations || []).filter(a => a.success !== false))
    } catch {}
  }

  function toggleSelect(id) {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id)
      if (prev.length >= 10) return prev // máximo 10
      return [...prev, id]
    })
  }

  function moveUp(idx) {
    if (idx === 0) return
    setSelected(prev => { const a = [...prev]; [a[idx-1], a[idx]] = [a[idx], a[idx-1]]; return a })
  }

  function moveDown(idx) {
    if (idx === selected.length - 1) return
    setSelected(prev => { const a = [...prev]; [a[idx], a[idx+1]] = [a[idx+1], a[idx]]; return a })
  }

  const selectedAnims = selected.map(id => library.find(a => a.id === id)).filter(Boolean)
  const canGenerate = selected.length >= 5 && url.trim()

  function resetResult() {
    setPlan(null); setVideoUrl(null); setError(null); setStatus(null)
  }

  async function handleGenerate() {
    if (!canGenerate || generating) return
    setGenerating(true)
    resetResult()
    setStatus({ step: 'queued', progress: 0 })
    try {
      const r = await fetch(`${API_URL}/api/cine/generate`, {
        method: 'POST', headers: HEADERS,
        body: JSON.stringify({
          animation_ids: selected,
          url: url.trim(),
          proposito,
          desarrollo: desarrollo.trim(),
        }),
      })
      const d = await r.json()
      if (d.error || !d.job_id) {
        setError(d.error || 'No se pudo iniciar la generación')
        setGenerating(false)
        return
      }
      pollJob(d.job_id)
    } catch (e) {
      setError(e.message)
      setGenerating(false)
    }
  }

  function pollJob(jobId) {
    clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`${API_URL}/api/jobs/${jobId}`, { headers: HEADERS })
        const j = await r.json()
        setStatus({ step: j.step || j.status, progress: j.progress || 0 })
        if (j.plan) setPlan(j.plan)
        if (j.status === 'done') {
          clearInterval(pollRef.current)
          setVideoUrl(j.cloudinaryUrl || (j.videoFilename ? `${API_URL}/api/video/${j.videoFilename}` : null))
          setGenerating(false)
        } else if (j.status === 'error') {
          clearInterval(pollRef.current)
          setError(j.error || 'Error en el render')
          setGenerating(false)
        }
      } catch {}
    }, 2000)
  }

  const showResultPanel = generating || plan || videoUrl || error
  const pct = Math.max(4, status?.progress || 0)

  return (
    <div className={styles.body}>
      {/* LEFT — Configuración */}
      <div className={styles.left}>
        <div className={styles.cineSection}>
          <div className={styles.cineSectionLabel}>URL del sitio</div>
          <input
            className={styles.nameInput}
            placeholder="https://tusitio.com"
            value={url}
            onChange={e => setUrl(e.target.value)}
          />
        </div>

        <div className={styles.cineSection}>
          <div className={styles.cineSectionLabel}>Propósito</div>
          <div className={styles.propGrid}>
            {PROPOSITOS.map(p => (
              <button
                key={p.key}
                className={`${styles.propBtn} ${proposito === p.key ? styles.propBtnActive : ''}`}
                onClick={() => setProposito(p.key)}>
                {p.icon} {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.cineSection}>
          <div className={styles.cineSectionLabel}>Desarrollo <span className={styles.desarrolloOpcional}>(opcional)</span></div>
          <textarea
            className={styles.textarea}
            rows={3}
            placeholder="Contá el ángulo narrativo, el tono, qué querés destacar..."
            value={desarrollo}
            onChange={e => setDesarrollo(e.target.value)}
          />
        </div>

        <div className={styles.cineSection}>
          <div className={styles.cineSectionLabel}>
            Animaciones seleccionadas
            <span className={`${styles.selCount} ${selected.length >= 5 ? styles.selCountOk : ''}`}>
              {selected.length}/10 {selected.length < 5 ? `(mínimo 5)` : '✓'}
            </span>
          </div>
          {selectedAnims.length === 0 ? (
            <div className={styles.selEmpty}>Seleccioná animaciones de la biblioteca →</div>
          ) : (
            <div className={styles.selList}>
              {selectedAnims.map((a, i) => (
                <div key={a.id} className={styles.selItem}>
                  <div className={styles.selOrder}>{i + 1}</div>
                  <div className={styles.selName}>{a.component_name}</div>
                  <div className={styles.selControls}>
                    <button onClick={() => moveUp(i)} disabled={i === 0}>↑</button>
                    <button onClick={() => moveDown(i)} disabled={i === selectedAnims.length - 1}>↓</button>
                    <button onClick={() => toggleSelect(a.id)} className={styles.selRemove}>×</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          className={`${styles.forgeBtn} ${generating ? styles.forgeBtnRunning : ''} ${!canGenerate ? styles.forgeBtnDisabled : ''}`}
          onClick={handleGenerate}
          disabled={!canGenerate || generating}>
          {generating
            ? <><span className={styles.spinner} />Generando cinematografía...</>
            : !url.trim()
            ? 'Ingresá la URL del sitio'
            : selected.length < 5
            ? `Seleccioná ${5 - selected.length} animación${5 - selected.length !== 1 ? 'es' : ''} más`
            : '🎥 Generar cinematografía'}
        </button>
      </div>

      {/* RIGHT — Biblioteca para seleccionar + resultado */}
      <div className={styles.right}>
        {showResultPanel ? (
          <div className={styles.cineResult}>
            <div className={styles.cineResultHeader}>
              <div className={styles.previewName}>
                {videoUrl ? 'Cinematografía lista' : error ? 'No se pudo generar' : 'Generando cinematografía...'}
              </div>
              <div className={styles.previewMeta}>{url} · {proposito}</div>
            </div>

            {/* Progreso */}
            {generating && (
              <div className={styles.log}>
                <div className={`${styles.logLine} ${styles.logActive}`}>
                  <div className={styles.progressBar}><div className={styles.progressFill} style={{ width: `${pct}%` }} /></div>
                  <span className={styles.logMsg}>{STEP_LABELS[status?.step] || 'Procesando...'}</span>
                </div>
              </div>
            )}

            {/* Error */}
            {error && <div className={styles.cineNote}>⚠️ {error}</div>}

            {/* Video final */}
            {videoUrl && (
              <div className={styles.playerWrap}>
                <video src={videoUrl} controls autoPlay loop className={styles.video} />
              </div>
            )}

            {/* Plan narrativo */}
            {plan && (
              <div className={styles.cinePlan}>
                {plan.intro_title && (
                  <div className={styles.cinePlanItem}>
                    <div className={styles.cinePlanOrder}>▶</div>
                    <div className={styles.cinePlanInfo}>
                      <div className={styles.cinePlanName}>Intro · {plan.intro_title}</div>
                      <div className={styles.cinePlanProp}>Apertura de marca</div>
                    </div>
                  </div>
                )}
                {(plan.segments || []).map((seg, i) => {
                  const anim = selectedAnims[i]
                  return (
                    <div key={i} className={styles.cinePlanItem}>
                      <div className={styles.cinePlanOrder}>{i + 1}</div>
                      <div className={styles.cinePlanInfo}>
                        <div className={styles.cinePlanName}>{anim?.component_name || `Clip ${i + 1}`}</div>
                        <div className={styles.cinePlanProp}>{seg.role}{seg.text ? ` · “${seg.text}”` : ''}</div>
                      </div>
                      {anim?.video_url && (
                        <video src={anim.video_url} autoPlay loop muted className={styles.cinePlanThumb} />
                      )}
                    </div>
                  )
                })}
                {plan.outro_cta && (
                  <div className={styles.cinePlanItem}>
                    <div className={styles.cinePlanOrder}>■</div>
                    <div className={styles.cinePlanInfo}>
                      <div className={styles.cinePlanName}>Cierre · {plan.outro_cta}</div>
                      <div className={styles.cinePlanProp}>Llamado a la acción</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {(videoUrl || error) && (
              <button className={styles.forgeBtn} style={{ marginTop: 14 }} onClick={() => { resetResult(); }}>
                ← Volver a la biblioteca
              </button>
            )}
          </div>
        ) : (
          <div className={styles.cineLibrary}>
            <div className={styles.libMiniHeader}>
              Biblioteca — seleccioná de 5 a 10 animaciones
            </div>
            {library.length === 0 ? (
              <div className={styles.empty}>
                <div style={{ fontSize: 36 }}>✦</div>
                <div className={styles.emptyTitle}>No hay animaciones todavía</div>
                <div className={styles.emptySub}>Creá animaciones en la pestaña "Animaciones" primero</div>
              </div>
            ) : (
              <div className={styles.cineLibList}>
                {library.map(anim => {
                  const isSelected = selected.includes(anim.id)
                  const idx = selected.indexOf(anim.id)
                  return (
                    <div
                      key={anim.id}
                      className={`${styles.cineLibCard} ${isSelected ? styles.cineLibCardSelected : ''}`}
                      onClick={() => toggleSelect(anim.id)}>
                      {anim.video_url ? (
                        <video src={anim.video_url} autoPlay loop muted className={styles.cineLibThumb} />
                      ) : (
                        <div className={styles.cineLibThumbEmpty}>▶</div>
                      )}
                      <div className={styles.cineLibName}>{anim.component_name}</div>
                      {isSelected && <div className={styles.cineLibBadge}>{idx + 1}</div>}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
