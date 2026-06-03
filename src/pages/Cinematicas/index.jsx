import { useState, useEffect, useRef } from 'react'
import styles from './Cinematicas.module.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const HEADERS = { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }

const PRIMERA_IDEA = {
  idea: `Narrativa cinematográfica de ecommerce en 90 frames (3 segundos a 30fps):
Frames 0-15: Círculo con texto del siteName pulsa en el centro, color primario vibrante
Frames 15-30: El círculo se aplana hacia abajo morpheando su path a una gota que cae
Frames 30-45: La gota impacta, ondas circulares se expanden, la gota sube como path de carrito
Frames 45-60: El carrito morphea a un rectángulo (caja/paquete) que se sella
Frames 60-75: El paquete se achica y sale disparado hacia la derecha con estela
Frames 75-90: Explosión de pequeños círculos del color primario, siteName aparece brillando`,
  component_name: "EcommerceJourney",
  rubro: "ecommerce",
}

const RUBROS = [
  { key: "ecommerce", label: "E-commerce", icon: "🛒" },
  { key: "saas", label: "SaaS", icon: "⚡" },
  { key: "restaurant", label: "Restaurante", icon: "🍽️" },
  { key: "health", label: "Salud", icon: "💊" },
  { key: "legal", label: "Legal", icon: "⚖️" },
  { key: "real_estate", label: "Inmobiliaria", icon: "🏠" },
  { key: "fitness", label: "Fitness", icon: "💪" },
  { key: "education", label: "Educación", icon: "📚" },
]

export default function Cinematicas() {
  const [library, setLibrary] = useState([])
  const [activeJob, setActiveJob] = useState(null)
  const [progress, setProgress] = useState([])
  const [selectedAnim, setSelectedAnim] = useState(null)
  const [customIdea, setCustomIdea] = useState('')
  const [customName, setCustomName] = useState('')
  const [customRubro, setCustomRubro] = useState('ecommerce')
  const [mode, setMode] = useState('primera')
  const [copied, setCopied] = useState(false)
  const [renderJob, setRenderJob] = useState(null)
  const [videoUrl, setVideoUrl] = useState(null)
  const [rendering, setRendering] = useState(false)
  const pollRef = useRef(null)
  const renderPollRef = useRef(null)

  useEffect(() => {
    loadLibrary()
    return () => { clearInterval(pollRef.current); clearInterval(renderPollRef.current) }
  }, [])

  async function loadLibrary() {
    try {
      const r = await fetch(`${API_URL}/api/forge/library`, { headers: HEADERS })
      const d = await r.json()
      setLibrary(d.animations || [])
    } catch {}
  }

  async function startForge() {
    const payload = mode === 'primera'
      ? PRIMERA_IDEA
      : { idea: customIdea, component_name: customName || `Anim${Date.now()}`, rubro: customRubro }
    if (mode === 'custom' && !customIdea.trim()) return

    setProgress([{ msg: '🚀 Iniciando forja...', step: 0, total: 7 }])
    setActiveJob(null)
    setSelectedAnim(null)
    setVideoUrl(null)

    try {
      const r = await fetch(`${API_URL}/api/forge/generate`, {
        method: 'POST', headers: HEADERS, body: JSON.stringify(payload),
      })
      const d = await r.json()
      const animId = d.anim_id
      setActiveJob(animId)

      let lastLen = 0
      pollRef.current = setInterval(async () => {
        try {
          const sr = await fetch(`${API_URL}/api/forge/status/${animId}`, { headers: HEADERS })
          const sd = await sr.json()
          if (sd.progress?.length > lastLen) { setProgress(sd.progress); lastLen = sd.progress.length }
          if (sd.status === 'done' || sd.status === 'failed') {
            clearInterval(pollRef.current)
            setActiveJob(null)
            loadLibrary()
            if (sd.result?.success) setSelectedAnim(sd.result)
          }
        } catch {}
      }, 1500)
    } catch(e) {
      setProgress(p => [...p, { msg: `❌ Error: ${e.message}`, step: -1, total: 7 }])
    }
  }

  async function loadAnim(id) {
    const r = await fetch(`${API_URL}/api/forge/animation/${id}`, { headers: HEADERS })
    const d = await r.json()
    setSelectedAnim(d)
    setVideoUrl(null)
  }

  async function deleteAnim(id, e) {
    e.stopPropagation()
    await fetch(`${API_URL}/api/forge/animation/${id}`, { method: 'DELETE', headers: HEADERS })
    loadLibrary()
    if (selectedAnim?.id === id) { setSelectedAnim(null); setVideoUrl(null) }
  }

  function copyCode() {
    navigator.clipboard.writeText(selectedAnim?.code || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function renderAnim() {
    if (!selectedAnim?.id || rendering) return
    setRendering(true)
    setVideoUrl(null)

    try {
      const r = await fetch(`${API_URL}/api/forge/render/${selectedAnim.id}`, {
        method: 'POST', headers: HEADERS,
      })
      const d = await r.json()
      if (d.error) { setRendering(false); return }
      const jobId = d.job_id

      renderPollRef.current = setInterval(async () => {
        try {
          const sr = await fetch(`${API_URL}/api/jobs/${jobId}`, { headers: HEADERS })
          const sd = await sr.json()
          if (sd.status === 'done') {
            clearInterval(renderPollRef.current)
            setRendering(false)
            setVideoUrl(`${API_URL}/api/video/${sd.videoFilename}`)
          } else if (sd.status === 'error') {
            clearInterval(renderPollRef.current)
            setRendering(false)
          }
        } catch {}
      }, 2000)
    } catch { setRendering(false) }
  }

  const isRunning = !!activeJob

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>🎬 Cinemáticas</h1>
          <p className={styles.sub}>Animaciones de transformación generadas por IA — cada una única, corregida en loop hasta funcionar.</p>
        </div>
        <div className={styles.badge}>{library.filter(a=>a.success).length} listas · {library.length} total</div>
      </div>

      <div className={styles.body}>
        {/* LEFT — Generador */}
        <div className={styles.left}>
          <div className={styles.modeRow}>
            <button className={`${styles.modeBtn} ${mode==='primera'?styles.modeBtnActive:''}`} onClick={()=>setMode('primera')}>
              Primera animación
            </button>
            <button className={`${styles.modeBtn} ${mode==='custom'?styles.modeBtnActive:''}`} onClick={()=>setMode('custom')}>
              Idea propia
            </button>
          </div>

          {mode === 'primera' ? (
            <div className={styles.ideaCard}>
              <div className={styles.ideaTitle}>E-commerce Journey</div>
              <div className={styles.ideaSteps}>
                {['Logo pulsa', 'Se derrite → gota', 'Gota → carrito SVG', 'Carrito → paquete sellado', 'Paquete → cohete', 'Confetti + nombre brillando'].map((s,i)=>(
                  <div key={i} className={styles.step}>
                    <div className={styles.stepNum}>{i+1}</div>
                    <div>{s}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className={styles.customForm}>
              <div className={styles.formGroup}>
                <label>Rubro</label>
                <div className={styles.rubroGrid}>
                  {RUBROS.map(r=>(
                    <button key={r.key} className={`${styles.rubroBtn} ${customRubro===r.key?styles.rubroBtnActive:''}`} onClick={()=>setCustomRubro(r.key)}>
                      {r.icon} {r.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.formGroup}>
                <label>Nombre (sin espacios)</label>
                <input className={styles.input} placeholder="MiAnimacion" value={customName} onChange={e=>setCustomName(e.target.value.replace(/\s/g,''))} />
              </div>
              <div className={styles.formGroup}>
                <label>Narrativa visual</label>
                <textarea className={styles.textarea} rows={5} placeholder="Describí qué formas aparecen, cómo se transforman y qué historia cuentan..." value={customIdea} onChange={e=>setCustomIdea(e.target.value)} />
              </div>
            </div>
          )}

          <button className={`${styles.forgeBtn} ${isRunning?styles.forgeBtnRunning:''}`} onClick={startForge} disabled={isRunning||(mode==='custom'&&!customIdea.trim())}>
            {isRunning ? <><span className={styles.spinner}/>Generando en loop...</> : '⚡ Generar animación'}
          </button>

          {progress.length > 0 && (
            <div className={styles.log}>
              {progress.map((p,i)=>(
                <div key={i} className={`${styles.logLine} ${i===progress.length-1?styles.logActive:''}`}>
                  <div className={styles.progressBar}>
                    <div className={styles.progressFill} style={{width:`${Math.max(4,(p.step/(p.total||7))*100)}%`}} />
                  </div>
                  <span className={styles.logMsg}>{p.msg}</span>
                </div>
              ))}
            </div>
          )}

          {/* Biblioteca lista */}
          {library.length > 0 && (
            <div className={styles.libMini}>
              <div className={styles.libMiniHeader}>Biblioteca</div>
              <div className={styles.libMiniList}>
                {library.map(anim=>(
                  <div key={anim.id}
                    className={`${styles.libMiniCard} ${selectedAnim?.id===anim.id?styles.libMiniCardActive:''} ${!anim.success?styles.libMiniCardFailed:''}`}
                    onClick={()=>loadAnim(anim.id)}>
                    <div className={styles.libMiniName}>{anim.component_name}</div>
                    <div style={{display:'flex',gap:4,alignItems:'center'}}>
                      <span className={styles.libMiniRubro}>{anim.rubro}</span>
                      <span style={{fontSize:10}}>{anim.success?'✅':'❌'}</span>
                      <button className={styles.delBtn} onClick={e=>deleteAnim(anim.id,e)}>×</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — Código + Reproductor */}
        <div className={styles.right}>
          {selectedAnim ? (
            <div className={styles.preview}>
              {/* Header */}
              <div className={styles.previewHeader}>
                <div>
                  <div className={styles.previewName}>{selectedAnim.component_name}</div>
                  <div className={styles.previewMeta}>
                    {selectedAnim.rubro} · {selectedAnim.attempts} intentos · {selectedAnim.elapsed_s}s · {selectedAnim.success?'✅ OK':'❌ Falló'}
                  </div>
                </div>
                <button className={styles.closeBtn} onClick={()=>{setSelectedAnim(null);setVideoUrl(null)}}>×</button>
              </div>

              {/* Código con scroll */}
              <div className={styles.codeSection}>
                <div className={styles.codeSectionHeader}>
                  <span className={styles.codeLang}>JSX</span>
                  <button className={`${styles.copyBtn} ${copied?styles.copyBtnDone:''}`} onClick={copyCode}>
                    {copied ? '✓ Copiado' : '⎘ Copiar código'}
                  </button>
                </div>
                <div className={styles.codeWrap}>
                  <pre className={styles.code}>{selectedAnim.code}</pre>
                </div>
              </div>

              {/* Reproductor */}
              <div className={styles.playerSection}>
                {videoUrl ? (
                  <div className={styles.playerWrap}>
                    <video
                      src={videoUrl}
                      controls
                      autoPlay
                      loop
                      className={styles.video}
                      style={{ width: '100%', borderRadius: 8, background: '#000' }}
                    />
                  </div>
                ) : (
                  <div className={styles.playerEmpty}>
                    <button
                      className={`${styles.renderBtn} ${rendering?styles.renderBtnLoading:''}`}
                      onClick={renderAnim}
                      disabled={rendering || !selectedAnim?.success}>
                      {rendering
                        ? <><span className={styles.spinner}/>Renderizando (~30s)...</>
                        : '▶ Renderizar y reproducir'}
                    </button>
                    {!selectedAnim?.success && (
                      <div className={styles.renderNote}>Esta animación no compiló correctamente</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className={styles.empty}>
              <div style={{fontSize:48}}>🎬</div>
              <div className={styles.emptyTitle}>Generá o seleccioná una animación</div>
              <div className={styles.emptySub}>El código y el reproductor aparecen acá</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
