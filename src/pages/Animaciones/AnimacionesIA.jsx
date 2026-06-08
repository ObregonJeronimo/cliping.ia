import { useState } from 'react'
import styles from './AnimacionesIA.module.css'

const API_URL = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:8000')
const HEADERS = { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }

export default function AnimacionesIA() {
  const [url, setUrl] = useState('')
  const [idea, setIdea] = useState('')
  const [loading, setLoading] = useState(false)
  const [concept, setConcept] = useState(null)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(null)

  const canRun = (url.trim() || idea.trim()) && !loading

  async function run() {
    if (!canRun) return
    setLoading(true); setError(null); setConcept(null)
    try {
      const r = await fetch(`${API_URL}/api/anim/concept`, {
        method: 'POST', headers: HEADERS,
        body: JSON.stringify({ url: url.trim(), idea: idea.trim() }),
      })
      const d = await r.json()
      if (!d.ok) { setError(d.error || 'No se pudo idear la animación'); }
      else setConcept(d.concept)
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  async function copy(text, key) {
    try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(c => c === key ? null : c), 1400) } catch {}
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Animaciones IA <span className={styles.beta}>prototipo</span></h1>
        <p className={styles.sub}>Sonnet lee el sitio e idea una animación de transformación encadenada,
          única para esa marca. Acá generamos el concepto + los prompts; el render generativo es el siguiente paso.</p>
      </div>

      <div className={styles.form}>
        <input className={styles.input} placeholder="https://sitio-del-cliente.com" value={url} onChange={e => setUrl(e.target.value)} />
        <textarea className={styles.textarea} rows={2}
          placeholder="Idea opcional (ej: 'el logo se derrite en una gota que pinta un botón...'). Dejalo vacío y la IA inventa."
          value={idea} onChange={e => setIdea(e.target.value)} />
        <button className={`${styles.btn} ${!canRun ? styles.btnOff : ''}`} onClick={run} disabled={!canRun}>
          {loading ? <><span className={styles.spinner} />Ideando...</> : '✨ Idear animación'}
        </button>
      </div>

      {error && <div className={styles.error}>⚠️ {error}</div>}

      {concept && (
        <div className={styles.result}>
          <div className={styles.concHead}>
            <div className={styles.concTitle}>{concept.title}</div>
            <div className={styles.concLog}>{concept.logline}</div>
            <div className={styles.concMeta}>
              {concept.style && <span className={styles.tag}>{concept.style}</span>}
              {concept.totalSeconds ? <span className={styles.tag}>~{concept.totalSeconds}s</span> : null}
              <span className={styles.tag}>{(concept.beats || []).length} beats</span>
            </div>
          </div>

          <div className={styles.timeline}>
            {(concept.beats || []).map((b, i) => (
              <div key={i}>
                <div className={styles.beat}>
                  <div className={styles.beatNum}>{b.n ?? i + 1}</div>
                  <div className={styles.beatBody}>
                    <div className={styles.beatScene}>{b.scene} <span className={styles.beatSecs}>{b.seconds}s</span></div>
                    <div className={styles.prompts}>
                      <PromptBlock label="Frame inicial (imagen)" text={b.imagePrompt} k={`i${i}`} copied={copied} onCopy={copy} styles={styles} />
                      <PromptBlock label="Movimiento (image-to-video)" text={b.motionPrompt} k={`m${i}`} copied={copied} onCopy={copy} styles={styles} />
                    </div>
                  </div>
                </div>
                {b.linkToNext && i < (concept.beats.length - 1) && (
                  <div className={styles.link}><span className={styles.linkArrow}>↓</span> {b.linkToNext}</div>
                )}
              </div>
            ))}
          </div>

          <div className={styles.note}>
            Esto es el <b>concepto creativo</b> (fase 1). El siguiente paso es generar cada frame con un modelo de
            imagen y encadenar los beats con <b>Kling</b> (control de primer/último frame) vía fal.ai — eso se conecta
            cuando definamos la API key del proveedor.
          </div>
        </div>
      )}
    </div>
  )
}

function PromptBlock({ label, text, k, copied, onCopy, styles }) {
  if (!text) return null
  return (
    <div className={styles.promptBlock}>
      <div className={styles.promptTop}>
        <span className={styles.promptLabel}>{label}</span>
        <button className={styles.copyBtn} onClick={() => onCopy(text, k)}>{copied === k ? '✓' : 'Copiar'}</button>
      </div>
      <code className={styles.promptText}>{text}</code>
    </div>
  )
}
