import { useEffect, useRef, useState } from 'react'
import { createTimelineEngine } from './engine'
import { DEMO_TIMELINE } from './engineCore'
import { useAuth } from '../../contexts/AuthContext'
import cine from '../Cinematicas/Cinematicas.module.css'
import styles from './TimelineStudio.module.css'

const API_URL = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:8000')
const HEADERS = { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }
const STEP_LABELS = {
  queued: 'En cola…', script: 'Analizando el sitio y escribiendo el guion…',
  build: 'Armando la composición…', render: 'Renderizando en tu PC (esto tarda)…',
  upload: 'Subiendo a la nube…', export: 'Listo',
}
const FORMATOS = [
  { key: 'vertical', label: 'Vertical 9:16', on: true },
  { key: 'square', label: 'Cuadrado 1:1', on: false },
  { key: 'wide', label: 'Horizontal 16:9', on: false },
]
const PROPOSITOS = [
  { key: 'marketing', label: '📣 Marketing' },
  { key: 'conversion', label: '🎯 Conversión' },
  { key: 'branding', label: '✨ Branding' },
  { key: 'awareness', label: '👋 Awareness' },
]

// Resumen corto de una escena del timeline (para el "plan" del resultado, estilo Home).
function sceneSummary(s) {
  if (!s) return ''
  if (s.type === 'paintTitle') return [s.title, (s.subtitles || []).join(' / ')].filter(Boolean).join(' · ')
  if (s.type === 'statement') return s.text || ''
  if (s.type === 'checklist') return [(s.title || ''), (s.items || []).join(', ')].filter(Boolean).join(': ')
  if (s.type === 'bigStat') return [(s.prefix || '') + s.value + (s.suffix || ''), s.label].filter(Boolean).join(' · ')
  if (s.type === 'outro') return s.cta || ''
  return ''
}

/**
 * Animaciones — misma interfaz que Home (Cinemáticas), pero para el motor Canvas por timeline.
 * Pegás un link + (opcional) qué contar y la IA REAL (Sonnet director + Opus crítico) escribe el
 * timeline desde el sitio — mismo análisis/rotación/anti-repetición que cinematicas. El video se
 * renderiza por Remotion (tu PC) → Cloudinary. Una generación = un video.
 */
export default function TimelineStudio() {
  const canvasRef = useRef(null)
  const engineRef = useRef(null)
  const beatRef = useRef(null)
  const timeRef = useRef(null)
  const seekRef = useRef(null)
  const pollRef = useRef(null)
  const { user } = useAuth()

  const [playing, setPlaying] = useState(true)
  const [speed, setSpeed] = useState(1)
  const [url, setUrl] = useState('')
  const [desarrollo, setDesarrollo] = useState('')
  const [proposito, setProposito] = useState('marketing')
  const [formato, setFormato] = useState('vertical')
  const [gen, setGen] = useState(null)   // { status, step, progress, videoUrl, error, timeline }

  useEffect(() => {
    const eng = createTimelineEngine(canvasRef.current, {
      timeline: DEMO_TIMELINE,
      onFrame: ({ playhead, T, label }) => {
        if (timeRef.current) timeRef.current.textContent = `${playhead.toFixed(1)} / ${T.toFixed(1)}`
        if (seekRef.current) seekRef.current.value = String(Math.round((playhead / T) * 1000))
        if (beatRef.current) beatRef.current.innerHTML = label
      },
    })
    engineRef.current = eng
    return () => eng.destroy()
  }, [])

  useEffect(() => () => clearInterval(pollRef.current), [])

  const toggle = () => setPlaying(engineRef.current.toggle())
  const restart = () => engineRef.current.restart()
  const onSeek = (e) => engineRef.current.seek(Number(e.target.value) / 1000)
  const pickSpeed = (s) => { engineRef.current.setSpeed(s); setSpeed(s) }

  const canGenerate = url.trim() && !(gen?.status === 'running')

  async function generate() {
    const u = url.trim()
    if (!u || gen?.status === 'running') return
    setGen({ status: 'running', step: 'script', progress: 0, videoUrl: null, error: null, timeline: null })
    try {
      const r = await fetch(`${API_URL}/api/timeline/generate`, {
        method: 'POST', headers: HEADERS,
        body: JSON.stringify({ userId: user?.uid || '', url: u, desarrollo, proposito, formato: 'vertical', idioma: '' }),
      })
      const d = await r.json()
      if (d.error || !d.job_id) { setGen(g => ({ ...g, status: 'error', error: d.error || 'No se pudo iniciar' })); return }
      clearInterval(pollRef.current)
      pollRef.current = setInterval(async () => {
        try {
          const jr = await fetch(`${API_URL}/api/jobs/${d.job_id}`, { headers: HEADERS })
          const j = await jr.json()
          setGen(g => g ? ({ ...g, step: j.step || j.status, progress: j.progress || 0 }) : g)
          // Apenas la IA devuelve el guion, lo previsualizamos en vivo (aunque el MP4 siga renderizando).
          if (j.timeline?.scenes && engineRef.current) {
            engineRef.current.setTimeline(j.timeline); setPlaying(true)
            setGen(g => g && !g.timeline ? ({ ...g, timeline: j.timeline }) : g)
          }
          if (j.status === 'done') {
            clearInterval(pollRef.current)
            setGen(g => ({ ...g, status: 'done', progress: 100, timeline: j.timeline || g.timeline, videoUrl: j.cloudinaryUrl || (j.videoFilename ? `${API_URL}/api/video/${j.videoFilename}` : null) }))
          } else if (j.status === 'error') {
            clearInterval(pollRef.current)
            setGen(g => ({ ...g, status: 'error', error: j.error || 'Error en la generación' }))
          }
        } catch { /* reintenta */ }
      }, 2500)
    } catch (e) { setGen(g => ({ ...g, status: 'error', error: e.message })) }
  }

  const pct = Math.max(4, gen?.progress || 0)
  const planScenes = gen?.timeline?.scenes || []

  return (
    <div className={cine.body}>
      <div className={cine.left}>
        <div className={styles.head}>
          <div className={styles.title}>Animaciones <span className={styles.beta}>beta</span></div>
          <div className={styles.sub}>Animaciones reales por timeline (Canvas). La IA escribe el guion desde tu link.</div>
        </div>

        <div className={cine.cineSection}>
          <div className={cine.cineSectionLabel}>URL del sitio</div>
          <input className={cine.nameInput} placeholder="https://tusitio.com" value={url}
            onChange={e => setUrl(e.target.value)} disabled={gen?.status === 'running'} />
        </div>
        <div className={cine.cineSection}>
          <div className={cine.cineSectionLabel}>Qué querés contar <span className={cine.desarrolloOpcional}>(opcional)</span></div>
          <textarea className={cine.textarea} rows={3} placeholder="Dejalo vacío y la IA decide, o tirá un ángulo / qué destacar / tono…"
            value={desarrollo} onChange={e => setDesarrollo(e.target.value)} disabled={gen?.status === 'running'} />
        </div>
        <div className={cine.cineSection}>
          <div className={cine.cineSectionLabel}>Propósito</div>
          <div className={cine.propGrid}>
            {PROPOSITOS.map(p => (
              <button key={p.key} className={`${cine.propBtn} ${proposito === p.key ? cine.propBtnActive : ''}`}
                disabled={gen?.status === 'running'} onClick={() => setProposito(p.key)}>{p.label}</button>
            ))}
          </div>
        </div>
        <div className={cine.cineSection}>
          <div className={cine.cineSectionLabel}>Formato</div>
          <div className={cine.propGrid}>
            {FORMATOS.map(f => (
              <button key={f.key} className={`${cine.propBtn} ${formato === f.key ? cine.propBtnActive : ''}`}
                disabled={!f.on || gen?.status === 'running'} title={f.on ? '' : 'Próximamente'}
                onClick={() => f.on && setFormato(f.key)}>{f.label}{!f.on ? ' ·' : ''}</button>
            ))}
          </div>
        </div>

        <button
          className={`${cine.forgeBtn} ${gen?.status === 'running' ? cine.forgeBtnRunning : ''} ${!canGenerate ? cine.forgeBtnDisabled : ''}`}
          onClick={generate} disabled={!canGenerate}>
          {gen?.status === 'running'
            ? <><span className={cine.spinner} />Generando…</>
            : !url.trim() ? 'Ingresá una URL' : '✨ Generar animación'}
        </button>
      </div>

      <div className={cine.right}>
        <div className={styles.frame}>
          <canvas ref={canvasRef} className={styles.canvas} />
        </div>
        <div className={styles.beat} ref={beatRef} />
        <div className={styles.controls}>
          <button className={`${styles.ctl} ${styles.primary}`} onClick={toggle}>{playing ? '⏸ Pausa' : '▶ Play'}</button>
          <button className={styles.ctl} onClick={restart}>↺ Reiniciar</button>
          <div className={styles.seek}>
            <input type="range" min="0" max="1000" defaultValue="0" ref={seekRef} onChange={onSeek} className={styles.range} />
            <span className={styles.time} ref={timeRef}>0.0 / 0.0</span>
          </div>
          <div className={styles.seg}>
            <button className={speed === 0.5 ? styles.on : ''} onClick={() => pickSpeed(0.5)}>0.5×</button>
            <button className={speed === 1 ? styles.on : ''} onClick={() => pickSpeed(1)}>1×</button>
          </div>
        </div>

        {gen && (
          <div className={styles.renderPanel}>
            {gen.status === 'running' && (
              <div className={styles.progressWrap}>
                <div className={styles.progressBar}><div className={styles.progressFill} style={{ width: `${pct}%` }} /></div>
                <span className={styles.progressMsg}>{STEP_LABELS[gen.step] || 'Procesando…'}</span>
              </div>
            )}
            {gen.status === 'error' && <div className={styles.err}>⚠️ {gen.error}</div>}
            {gen.status === 'done' && gen.videoUrl && (
              <div className={styles.done}>
                <video src={gen.videoUrl} controls autoPlay loop playsInline className={styles.resultVideo} />
                <a className={`${styles.ctl} ${styles.primary}`} href={gen.videoUrl} target="_blank" rel="noreferrer" download>⬇ Descargar MP4</a>
              </div>
            )}
            {planScenes.length > 0 && (
              <div className={cine.cinePlan} style={{ width: '100%' }}>
                {gen.timeline?.brand && (
                  <div className={cine.cinePlanItem}>
                    <div className={cine.cinePlanOrder}>🎬</div>
                    <div className={cine.cinePlanInfo}>
                      <div className={cine.cinePlanName}>{gen.timeline.brand}</div>
                      <div className={cine.cinePlanProp}>guion de la IA · {planScenes.length} escenas</div>
                    </div>
                  </div>
                )}
                {planScenes.map((s, i) => (
                  <div key={i} className={cine.cinePlanItem}>
                    <div className={cine.cinePlanOrder}>{i + 1}</div>
                    <div className={cine.cinePlanInfo}>
                      <div className={cine.cinePlanName}>{s.type}</div>
                      <div className={cine.cinePlanProp}>{sceneSummary(s)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
