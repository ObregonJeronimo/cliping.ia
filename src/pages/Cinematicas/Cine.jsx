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

export default function Cine() {
  const [library, setLibrary] = useState([])
  const [selected, setSelected] = useState([]) // ids seleccionados
  const [url, setUrl] = useState('')
  const [proposito, setProposito] = useState('marketing')
  const [desarrollo, setDesarrollo] = useState('')
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState(null)

  useEffect(() => { loadLibrary() }, [])

  async function loadLibrary() {
    try {
      const r = await fetch(`${API_URL}/api/forge/library`, { headers: HEADERS })
      const d = await r.json()
      // Solo las que compilaron y tienen video
      setLibrary((d.animations || []).filter(a => a.success))
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

  async function handleGenerate() {
    if (!canGenerate || generating) return
    setGenerating(true)
    setResult(null)
    // TODO: endpoint /api/cine/generate
    // Por ahora mostramos el plan que se generaría
    setTimeout(() => {
      setResult({
        plan: selectedAnims.map((a, i) => ({
          order: i + 1,
          component: a.component_name,
          video_url: a.video_url,
          proposito: i === 0 ? 'Hook' : i === selectedAnims.length - 1 ? 'Cierre' : i <= 2 ? 'Producto' : 'Beneficio',
        }))
      })
      setGenerating(false)
    }, 1500)
  }

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
        {result ? (
          <div className={styles.cineResult}>
            <div className={styles.cineResultHeader}>
              <div className={styles.previewName}>Cinematografía lista</div>
              <div className={styles.previewMeta}>{url} · {proposito}</div>
            </div>
            <div className={styles.cinePlan}>
              {result.plan.map((item, i) => (
                <div key={i} className={styles.cinePlanItem}>
                  <div className={styles.cinePlanOrder}>{item.order}</div>
                  <div className={styles.cinePlanInfo}>
                    <div className={styles.cinePlanName}>{item.component}</div>
                    <div className={styles.cinePlanProp}>{item.proposito}</div>
                  </div>
                  {item.video_url && (
                    <video src={item.video_url} autoPlay loop muted className={styles.cinePlanThumb} />
                  )}
                </div>
              ))}
            </div>
            <div className={styles.cineNote}>
              🚧 El render completo de la cinematografía estará disponible próximamente.
            </div>
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
