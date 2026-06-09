import { useEffect, useRef, useState } from 'react'
import { createTimelineEngine } from './engine'
import { DEMO_TIMELINE } from './engineCore'
import { useAuth } from '../../contexts/AuthContext'
import styles from './TimelineStudio.module.css'

const API_URL = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:8000')
const HEADERS = { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }
const STEP_LABELS = {
  queued: 'En cola…', build: 'Armando el render…', render: 'Renderizando en tu PC (esto tarda)…',
  upload: 'Subiendo a la nube…', export: 'Listo',
}

// Dos guiones escritos a mano COMO DATOS. Mismo motor, distinto contenido/orden/acento -> prueba que
// es data-driven (es exactamente lo que va a escribir la IA desde un link).
const PRESETS = [
  { label: 'E-commerce', timeline: DEMO_TIMELINE },
  {
    label: 'SaaS / consultorio',
    timeline: {
      brand: 'ConsulPay', accent: '#4f8bff',
      scenes: [
        { type: 'paintTitle', title: 'ConsulPay', subtitles: ['Tu consultorio', 'ordenado y al día'], durationInFrames: 240 },
        { type: 'statement', text: 'Del caos al control en un clic', durationInFrames: 150 },
        { type: 'checklist', title: 'Todo en un lugar', items: ['Pacientes y sesiones', 'Pagos al instante', 'Reportes claros'], durationInFrames: 186 },
        { type: 'outro', brand: 'ConsulPay', cta: 'Probalo gratis', durationInFrames: 150 },
      ],
    },
  },
]

/**
 * Animaciones (beta) — el método NUEVO para los videos: animaciones reales por timeline
 * (Canvas 2D determinístico), no plantillas de texto. El motor vive en engine.js (reutilizable);
 * esta página solo lo monta y le da controles. El render es gratis (no hay IA generativa);
 * más adelante la IA escribe el timeline y se exporta a MP4 con Remotion.
 */
export default function TimelineStudio() {
  const canvasRef = useRef(null)
  const engineRef = useRef(null)
  const beatRef = useRef(null)
  const timeRef = useRef(null)
  const seekRef = useRef(null)
  const [playing, setPlaying] = useState(true)
  const [speed, setSpeed] = useState(1)
  const [preset, setPreset] = useState(0)
  const { user } = useAuth()
  const [gen, setGen] = useState(null)   // { status, step, progress, videoUrl, error }
  const pollRef = useRef(null)

  useEffect(() => {
    const eng = createTimelineEngine(canvasRef.current, {
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
  const pickPreset = (i) => { setPreset(i); engineRef.current.setTimeline(PRESETS[i].timeline); engineRef.current.play(); setPlaying(true) }

  async function generateMp4() {
    if (gen?.status === 'running') return
    setGen({ status: 'running', step: 'queued', progress: 0, videoUrl: null, error: null })
    try {
      const r = await fetch(`${API_URL}/api/timeline/generate`, {
        method: 'POST', headers: HEADERS,
        body: JSON.stringify({ userId: user?.uid || '', formato: 'vertical', timeline: PRESETS[preset].timeline }),
      })
      const d = await r.json()
      if (d.error || !d.job_id) { setGen(g => ({ ...g, status: 'error', error: d.error || 'No se pudo iniciar' })); return }
      clearInterval(pollRef.current)
      pollRef.current = setInterval(async () => {
        try {
          const jr = await fetch(`${API_URL}/api/jobs/${d.job_id}`, { headers: HEADERS })
          const j = await jr.json()
          setGen(g => ({ ...g, step: j.step || j.status, progress: j.progress || 0 }))
          if (j.status === 'done') {
            clearInterval(pollRef.current)
            setGen(g => ({ ...g, status: 'done', progress: 100, videoUrl: j.cloudinaryUrl || (j.videoFilename ? `${API_URL}/api/video/${j.videoFilename}` : null) }))
          } else if (j.status === 'error') {
            clearInterval(pollRef.current)
            setGen(g => ({ ...g, status: 'error', error: j.error || 'Error en el render' }))
          }
        } catch { /* reintenta */ }
      }, 2000)
    } catch (e) { setGen(g => ({ ...g, status: 'error', error: e.message })) }
  }

  return (
    <div className={styles.body}>
      <div className={styles.head}>
        <div className={styles.title}>Animaciones <span className={styles.beta}>beta</span></div>
        <div className={styles.sub}>
          Método nuevo: animaciones reales por <strong>timeline</strong> (no plantillas de texto). Render
          determinístico, sin IA generativa.
        </div>
      </div>

      <div className={styles.stage}>
        <div className={styles.frame}>
          <canvas ref={canvasRef} className={styles.canvas} />
        </div>

        <div className={styles.beat} ref={beatRef} />

        <div className={styles.presets}>
          <span className={styles.presetsLabel}>Guion (datos):</span>
          {PRESETS.map((p, i) => (
            <button key={p.label} className={preset === i ? styles.presetOn : styles.preset} onClick={() => pickPreset(i)}>
              {p.label}
            </button>
          ))}
        </div>

        <div className={styles.controls}>
          <button className={`${styles.ctl} ${styles.primary}`} onClick={toggle}>
            {playing ? '⏸ Pausa' : '▶ Play'}
          </button>
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

        <div className={styles.render}>
          <button
            className={`${styles.ctl} ${styles.primary} ${styles.renderBtn}`}
            onClick={generateMp4}
            disabled={gen?.status === 'running'}>
            {gen?.status === 'running' ? '⏳ Generando MP4…' : `⬇ Generar MP4 (${PRESETS[preset].label})`}
          </button>

          {gen?.status === 'running' && (
            <div className={styles.progressWrap}>
              <div className={styles.progressBar}><div className={styles.progressFill} style={{ width: `${Math.max(4, gen.progress)}%` }} /></div>
              <span className={styles.progressMsg}>{STEP_LABELS[gen.step] || 'Procesando…'}</span>
            </div>
          )}
          {gen?.status === 'error' && <div className={styles.err}>⚠️ {gen.error}</div>}
          {gen?.status === 'done' && gen.videoUrl && (
            <div className={styles.done}>
              <video src={gen.videoUrl} controls autoPlay loop playsInline className={styles.resultVideo} />
              <a className={`${styles.ctl} ${styles.primary}`} href={gen.videoUrl} target="_blank" rel="noreferrer" download>⬇ Ver / descargar MP4</a>
            </div>
          )}
        </div>

        <div className={styles.foot}>
          El motor ahora es <strong>data-driven</strong>: cambiá el guion arriba y mirá cómo se rearma con
          otro contenido, orden y acento. El MP4 lo renderiza Remotion en tu PC (gratis) y se sube a
          Cloudinary. Próximo paso: que la IA escriba ese guion desde tu link.
        </div>
      </div>
    </div>
  )
}
