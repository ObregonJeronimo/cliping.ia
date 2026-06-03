import { useState, useEffect, useRef } from 'react'
import styles from './Cinematicas.module.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const HEADERS = { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }

const TAG_CATEGORIES = {
  'Formas': ['Círculo', 'Triángulo', 'Cuadrado', 'Hexágono', 'Espiral', 'Estrella', 'Blob', 'Onda', 'Diamante'],
  'Movimiento': ['Explosión', 'Implosión', 'Rotación', 'Pulso', 'Caída', 'Flotación', 'Rebote', 'Disparo', 'Morphing'],
  'Concepto': ['Transformación', 'Crecimiento', 'Conexión', 'Velocidad', 'Naturaleza', 'Tecnología', 'Energía', 'Flujo', 'Impacto'],
  'Estilo': ['Minimalista', 'Agresivo', 'Orgánico', 'Geométrico', 'Fluido', 'Fragmentado', 'Neon', 'Oscuro', 'Vibrante'],
  'Narrativa': ['Inicio→Fin', 'Problema→Solución', 'Caos→Orden', 'Pequeño→Grande', 'Lento→Rápido', 'Oculto→Revelado'],
}

function randomName() {
  const words = ['Burst', 'Flow', 'Morph', 'Rise', 'Pulse', 'Wave', 'Shift', 'Forge', 'Spark', 'Drift', 'Echo', 'Surge', 'Bloom', 'Crash', 'Glow']
  const a = words[Math.floor(Math.random() * words.length)]
  const b = words[Math.floor(Math.random() * words.length)]
  return `${a}${b}`
}

function randomTags() {
  const all = Object.values(TAG_CATEGORIES).flat()
  const shuffled = all.sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.floor(Math.random() * 4) + 2)
}

export default function Animaciones() {
  const [library, setLibrary] = useState([])
  const [activeJob, setActiveJob] = useState(null)
  const [progress, setProgress] = useState([])
  const [selectedAnim, setSelectedAnim] = useState(null)
  const [selectedTags, setSelectedTags] = useState([])
  const [desarrollo, setDesarrollo] = useState('')
  const [componentName, setComponentName] = useState(randomName())
  const [copied, setCopied] = useState(false)
  const [videoUrl, setVideoUrl] = useState(null)
  const [rendering, setRendering] = useState(false)
  const [openCategory, setOpenCategory] = useState('Formas')
  const [primaryColor, setPrimaryColor] = useState('#6366f1')
  const [secondaryColor, setSecondaryColor] = useState('#a78bfa')
  const [accentColor, setAccentColor] = useState('#f59e0b')
  const [colorPreset, setColorPreset] = useState(null)
  const [objects, setObjects] = useState([])
  const [objInput, setObjInput] = useState('')
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

  function toggleTag(tag) {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  function addObject() {
    const v = objInput.trim()
    if (!v) return
    setObjects(prev => prev.includes(v) || prev.length >= 4 ? prev : [...prev, v])
    setObjInput('')
  }

  function removeObject(o) {
    setObjects(prev => prev.filter(x => x !== o))
  }

  function handleRandom() {
    setSelectedTags(randomTags())
    setComponentName(randomName())
    setDesarrollo('')
  }

  async function startForge() {
    if (selectedTags.length === 0 && !desarrollo.trim() && objects.length === 0) return
    const name = componentName || randomName()
    setProgress([{ msg: '🚀 Iniciando forja...', step: 0, total: 7 }])
    setActiveJob(null)
    setSelectedAnim(null)
    setVideoUrl(null)
    try {
      const r = await fetch(`${API_URL}/api/forge/generate`, {
        method: 'POST', headers: HEADERS,
        body: JSON.stringify({ idea: '', component_name: name, rubro: 'cinematica', tags: selectedTags, desarrollo: desarrollo.trim(), objects, primaryColor, secondaryColor, accentColor }),
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
            // Si hay render automático corriendo, seguir esperándolo
            if (sd.render_job_id && sd.status === 'done') {
              clearInterval(pollRef.current)
              setActiveJob(null)
              loadLibrary()
              setSelectedAnim(sd.result)
              setRendering(true)
              setVideoUrl(null)
              setProgress(p => [...p, { msg: '🎬 Renderizando automáticamente...', step: 6, total: 7 }])
              startRenderPoll(sd.render_job_id)
            } else {
              clearInterval(pollRef.current)
              setActiveJob(null)
              loadLibrary()
              if (sd.result?.success) {
                setSelectedAnim(sd.result)
              } else if (sd.result) setSelectedAnim(sd.result)
            }
          }
        } catch {}
      }, 1500)
    } catch(e) {
      setProgress(p => [...p, { msg: `❌ Error: ${e.message}`, step: -1, total: 7 }])
    }
  }

  function startRenderPoll(jobId) {
    clearInterval(renderPollRef.current)
    renderPollRef.current = setInterval(async () => {
      try {
        const sr = await fetch(`${API_URL}/api/jobs/${jobId}`, { headers: HEADERS })
        const sd = await sr.json()
        if (sd.status === 'done') {
          clearInterval(renderPollRef.current)
          setRendering(false)
          setVideoUrl(sd.cloudinaryUrl || `${API_URL}/api/video/${sd.videoFilename}`)
          loadLibrary()
        } else if (sd.status === 'error') {
          clearInterval(renderPollRef.current)
          setRendering(false)
        }
      } catch {}
    }, 2000)
  }

  async function renderAnim() {
    if (!selectedAnim?.id || rendering) return
    setRendering(true)
    setVideoUrl(null)
    try {
      const r = await fetch(`${API_URL}/api/forge/render/${selectedAnim.id}`, { method: 'POST', headers: HEADERS })
      const d = await r.json()
      if (d.error) { setRendering(false); return }
      startRenderPoll(d.job_id)
    } catch { setRendering(false) }
  }

  async function loadAnim(id) {
    const r = await fetch(`${API_URL}/api/forge/animation/${id}`, { headers: HEADERS })
    const d = await r.json()
    setSelectedAnim(d)
    setRendering(false)
    setVideoUrl(d.video_url || null)
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

  const isRunning = !!activeJob
  const canGenerate = (selectedTags.length > 0 || desarrollo.trim().length > 0 || objects.length > 0) && !isRunning

  return (
    <div className={styles.body}>
      {/* LEFT */}
      <div className={styles.left}>
        <div className={styles.nameRow}>
          <input className={styles.nameInput} placeholder="NombreAnimacion" value={componentName} onChange={e => setComponentName(e.target.value.replace(/\s/g, ''))} />
          <button className={styles.randomBtn} onClick={handleRandom}>🎲 Aleatorio</button>
        </div>
        <div className={styles.tagsSection}>
          <div className={styles.tagsSectionLabel}>
            Conceptos
            {selectedTags.length > 0 && <button className={styles.clearTags} onClick={() => setSelectedTags([])}>Limpiar ({selectedTags.length})</button>}
          </div>
          <div className={styles.catTabs}>
            {Object.keys(TAG_CATEGORIES).map(cat => (
              <button key={cat} className={`${styles.catTab} ${openCategory === cat ? styles.catTabActive : ''}`} onClick={() => setOpenCategory(cat)}>{cat}</button>
            ))}
          </div>
          <div className={styles.tagGrid}>
            {TAG_CATEGORIES[openCategory]?.map(tag => (
              <button key={tag} className={`${styles.tag} ${selectedTags.includes(tag) ? styles.tagActive : ''}`} onClick={() => toggleTag(tag)}>{tag}</button>
            ))}
          </div>
          {selectedTags.length > 0 && (
            <div className={styles.selectedTagsRow}>
              {selectedTags.map(t => <span key={t} className={styles.selectedTag} onClick={() => toggleTag(t)}>{t} ×</span>)}
            </div>
          )}
        </div>
        <div className={styles.desarrolloSection}>
          <div className={styles.desarrolloLabel}>Descripción <span className={styles.desarrolloOpcional}>(opcional)</span></div>
          <textarea className={styles.textarea} rows={3} placeholder="Describí lo que querés ver..." value={desarrollo} onChange={e => setDesarrollo(e.target.value)} />
        </div>
        {/* Objetos reales (Iconify) */}
        <div className={styles.desarrolloSection}>
          <div className={styles.desarrolloLabel}>Objetos <span className={styles.desarrolloOpcional}>(opcional, máx 4)</span></div>
          <div className={styles.nameRow}>
            <input
              className={styles.nameInput}
              placeholder="ej: carrito, cursor de mouse, signo dólar"
              value={objInput}
              onChange={e => setObjInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addObject() } }}
            />
            <button className={styles.randomBtn} onClick={addObject} disabled={!objInput.trim() || objects.length >= 4}>+ Agregar</button>
          </div>
          {objects.length > 0 && (
            <div className={styles.selectedTagsRow}>
              {objects.map(o => <span key={o} className={styles.selectedTag} onClick={() => removeObject(o)}>{o} ×</span>)}
            </div>
          )}
        </div>
        {/* Selector de colores */}
        <div className={styles.colorSection}>
          <div className={styles.colorSectionLabel}>
            Paleta de colores
          </div>
          {/* Presets */}
          <div className={styles.colorPresets}>
            {[
              { name: 'Violeta', p: '#6366f1', s: '#a78bfa', a: '#f59e0b' },
              { name: 'Verde', p: '#22c55e', s: '#86efac', a: '#fbbf24' },
              { name: 'Rojo', p: '#ef4444', s: '#fca5a5', a: '#fb923c' },
              { name: 'Cyan', p: '#06b6d4', s: '#67e8f9', a: '#a78bfa' },
              { name: 'Rosa', p: '#ec4899', s: '#f9a8d4', a: '#818cf8' },
              { name: 'Naranja', p: '#f97316', s: '#fdba74', a: '#34d399' },
              { name: 'Gold', p: '#eab308', s: '#fde047', a: '#f43f5e' },
              { name: 'Oscuro', p: '#8b5cf6', s: '#4c1d95', a: '#c026d3' },
            ].map(preset => (
              <button key={preset.name}
                className={`${styles.colorPreset} ${primaryColor === preset.p ? styles.colorPresetActive : ''}`}
                style={{ background: `linear-gradient(135deg, ${preset.p}, ${preset.s})` }}
                onClick={() => { setPrimaryColor(preset.p); setSecondaryColor(preset.s); setAccentColor(preset.a) }}
                title={preset.name}
              />
            ))}
          </div>
          {/* Custom */}
          <div className={styles.colorPickers}>
            <div className={styles.colorPicker}>
              <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className={styles.colorInput} />
              <span>Principal</span>
            </div>
            <div className={styles.colorPicker}>
              <input type="color" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} className={styles.colorInput} />
              <span>Secundario</span>
            </div>
            <div className={styles.colorPicker}>
              <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} className={styles.colorInput} />
              <span>Acento</span>
            </div>
          </div>
          {/* Preview del degradado */}
          <div className={styles.gradientPreview} style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor}, ${accentColor})` }} />
        </div>

        <button className={`${styles.forgeBtn} ${isRunning ? styles.forgeBtnRunning : ''}`} onClick={startForge} disabled={!canGenerate}>
          {isRunning ? <><span className={styles.spinner} />Generando...</> : !canGenerate ? 'Seleccioná conceptos o describí algo' : '⚡ Generar animación'}
        </button>
        {progress.length > 0 && (
          <div className={styles.log}>
            {progress.map((p, i) => (
              <div key={i} className={`${styles.logLine} ${i === progress.length - 1 ? styles.logActive : ''}`}>
                <div className={styles.progressBar}><div className={styles.progressFill} style={{ width: `${Math.max(4, (p.step / (p.total || 7)) * 100)}%` }} /></div>
                <span className={styles.logMsg}>{p.msg}</span>
              </div>
            ))}
          </div>
        )}
        {library.length > 0 && (
          <div className={styles.libMini}>
            <div className={styles.libMiniHeader}>Biblioteca ({library.length})</div>
            <div className={styles.libMiniList}>
              {library.map(anim => (
                <div key={anim.id} className={`${styles.libMiniCard} ${selectedAnim?.id === anim.id ? styles.libMiniCardActive : ''} ${!anim.success ? styles.libMiniCardFailed : ''}`} onClick={() => loadAnim(anim.id)}>
                  <div className={styles.libMiniName}>{anim.component_name}</div>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <span style={{ fontSize: 10 }}>{anim.success ? '✅' : '❌'}</span>
                    <button className={styles.delBtn} onClick={e => deleteAnim(anim.id, e)}>×</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT */}
      <div className={styles.right}>
        {selectedAnim ? (
          <div className={styles.preview}>
            <div className={styles.previewHeader}>
              <div>
                <div className={styles.previewName}>{selectedAnim.component_name}</div>
                <div className={styles.previewMeta}>{selectedAnim.attempts} intentos · {selectedAnim.elapsed_s}s · {selectedAnim.success ? '✅ OK' : '❌ Falló'}</div>
              </div>
              <button className={styles.closeBtn} onClick={() => { setSelectedAnim(null); setVideoUrl(null) }}>×</button>
            </div>
            <div className={styles.codeSection}>
              <div className={styles.codeSectionHeader}>
                <span className={styles.codeLang}>JSX</span>
                <button className={`${styles.copyBtn} ${copied ? styles.copyBtnDone : ''}`} onClick={copyCode}>{copied ? '✓ Copiado' : '⎘ Copiar'}</button>
              </div>
              <div className={styles.codeWrap}><pre className={styles.code}>{selectedAnim.code}</pre></div>
            </div>
            <div className={styles.playerSection}>
              {videoUrl ? (
                <div className={styles.playerWrap}>
                  <video src={videoUrl} controls autoPlay loop className={styles.video} />
                </div>
              ) : (
                <div className={styles.playerEmpty}>
                  <button className={`${styles.renderBtn} ${rendering ? styles.renderBtnLoading : ''}`} onClick={renderAnim} disabled={rendering || !selectedAnim?.success}>
                    {rendering ? <><span className={styles.spinner} />Renderizando...</> : '▶ Renderizar y reproducir'}
                  </button>
                  {!selectedAnim?.success && <div className={styles.renderNote}>Esta animación no compiló</div>}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className={styles.empty}>
            <div style={{ fontSize: 48 }}>✦</div>
            <div className={styles.emptyTitle}>Generá o seleccioná una animación</div>
            <div className={styles.emptySub}>Seleccioná conceptos, describí algo y apretá generar</div>
          </div>
        )}
      </div>
    </div>
  )
}
