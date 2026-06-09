import { useEffect, useRef, useState } from 'react'
import { createTimelineEngine } from './engine'
import { DEMO_TIMELINE } from './engineCore'
import { useAuth } from '../../contexts/AuthContext'
import cine from '../Cinematicas/Cinematicas.module.css'
import styles from './TimelineStudio.module.css'

const API_URL = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:8000')
const HEADERS = { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }
const STEP_LABELS = {
  queued: 'En cola…', build: 'Armando la composición…', render: 'Renderizando en tu PC (esto tarda)…',
  upload: 'Subiendo a la nube…', export: 'Listo',
}
const FORMATOS = [
  { key: 'vertical', label: 'Vertical 9:16', on: true },
  { key: 'square', label: 'Cuadrado 1:1', on: false },
  { key: 'wide', label: 'Horizontal 16:9', on: false },
]

// ─────────────────────────────────────────────────────────────────────────────
// "IA FALSA" — timelines hardcodeados de proyectos reales (yo, Claude, haciendo de IA).
// Sirve para testear el pipeline COMPLETO end-to-end a $0 (sin análisis ni llamadas al modelo).
// Cada uno tiene distinto arco/orden de escenas y copy real -> prueba que NO hay patrones repetidos.
// Es exactamente la estructura que despues va a escribir la IA de verdad desde un link.
// ─────────────────────────────────────────────────────────────────────────────
const PROJECTS = [
  {
    key: 'consulpay', label: 'ConsulPay',
    timeline: {
      brand: 'ConsulPay', accent: '#6366f1',
      scenes: [
        { type: 'paintTitle', title: 'ConsulPay', subtitles: ['Tu consultorio', 'sin papeles ni planillas'], durationInFrames: 234 },
        { type: 'statement', text: 'Dejá de perseguir pagos y turnos', durationInFrames: 150 },
        { type: 'checklist', title: 'Todo bajo control', items: ['Agenda y pacientes', 'Cobros al instante', 'Reportes en vivo', 'Equipo coordinado'], durationInFrames: 198 },
        { type: 'outro', brand: 'ConsulPay', cta: 'Creá tu consultorio gratis', durationInFrames: 150 },
      ],
    },
  },
  {
    key: 'yerco', label: 'YERCO',
    timeline: {
      brand: 'YERCO', accent: '#3fae5a',
      scenes: [
        { type: 'paintTitle', title: 'YERCO', subtitles: ['Dietética online', 'directo a tu casa'], durationInFrames: 234 },
        { type: 'checklist', title: 'Por qué YERCO', items: ['Productos naturales', 'Envío en el día', 'Precios claros', 'A granel o envasado'], durationInFrames: 198 },
        { type: 'statement', text: 'Comé mejor, sin complicarte', durationInFrames: 150 },
        { type: 'outro', brand: 'YERCO', cta: 'Comprá online', durationInFrames: 150 },
      ],
    },
  },
  {
    key: 'cliping', label: 'cliping.ia',
    timeline: {
      brand: 'cliping.ia', accent: '#ff5a8a',
      scenes: [
        { type: 'statement', text: 'Tu marca merece un video, no una excusa', durationInFrames: 162 },
        { type: 'paintTitle', title: 'cliping.ia', subtitles: ['Videos de marketing', 'en minutos'], durationInFrames: 234 },
        { type: 'checklist', title: 'Sin diseñadores', items: ['Pegás tu link', 'La IA arma el guion', 'Listo para postear'], durationInFrames: 174 },
        { type: 'outro', brand: 'cliping.ia', cta: 'Probalo gratis', durationInFrames: 150 },
      ],
    },
  },
  {
    key: 'brujula', label: 'Brújula KIT',
    timeline: {
      brand: 'Brújula KIT', accent: '#2bb3c0',
      scenes: [
        { type: 'paintTitle', title: 'Brújula KIT', subtitles: ['Evaluación fono', 'más simple'], durationInFrames: 234 },
        { type: 'statement', text: 'Siete herramientas clínicas en un lugar', durationInFrames: 156 },
        { type: 'checklist', title: 'Para fonoaudiólogos', items: ['Tests clínicos guiados', 'Informes con IA', 'Resultados al toque'], durationInFrames: 174 },
        { type: 'outro', brand: 'Brújula KIT', cta: 'Empezá gratis', durationInFrames: 150 },
      ],
    },
  },
]

/**
 * Animaciones — misma interfaz que Home (Cinemáticas), pero para el motor NUEVO (Canvas por timeline).
 * El formulario URL/desarrollo es el shell para cuando conectemos la IA (próximo paso). Mientras tanto,
 * la sección "Testing" hace de IA: timelines hardcodeados de proyectos reales que renderizan el MP4
 * completo (Remotion en tu PC -> Cloudinary), a $0, para testear todo el pipeline end-to-end.
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
  const [active, setActive] = useState(-1)        // proyecto en preview / generando
  const [gen, setGen] = useState(null)            // { status, step, progress, videoUrl, error, label }
  const [url, setUrl] = useState('')
  const [desarrollo, setDesarrollo] = useState('')
  const [formato, setFormato] = useState('vertical')

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

  // Click en un proyecto: previsualiza al toque + dispara el render del MP4.
  function runProject(i) {
    setActive(i)
    engineRef.current.setTimeline(PROJECTS[i].timeline)
    engineRef.current.play(); setPlaying(true)
    generate(PROJECTS[i].timeline, PROJECTS[i].label)
  }

  async function generate(timeline, label) {
    if (gen?.status === 'running') return
    setGen({ status: 'running', step: 'queued', progress: 0, videoUrl: null, error: null, label })
    try {
      const r = await fetch(`${API_URL}/api/timeline/generate`, {
        method: 'POST', headers: HEADERS,
        body: JSON.stringify({ userId: user?.uid || '', formato: 'vertical', timeline }),
      })
      const d = await r.json()
      if (d.error || !d.job_id) { setGen(g => ({ ...g, status: 'error', error: d.error || 'No se pudo iniciar' })); return }
      clearInterval(pollRef.current)
      pollRef.current = setInterval(async () => {
        try {
          const jr = await fetch(`${API_URL}/api/jobs/${d.job_id}`, { headers: HEADERS })
          const j = await jr.json()
          setGen(g => g ? ({ ...g, step: j.step || j.status, progress: j.progress || 0 }) : g)
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

  const pct = Math.max(4, gen?.progress || 0)

  return (
    <div className={cine.body}>
      <div className={cine.left}>
        <div className={styles.head}>
          <div className={styles.title}>Animaciones <span className={styles.beta}>beta</span></div>
          <div className={styles.sub}>Motor nuevo: animaciones reales por timeline (Canvas), no plantillas de texto.</div>
        </div>

        {/* TESTING — yo haciendo de IA, $0 */}
        <div className={cine.cineSection}>
          <div className={cine.cineSectionLabel}>🧪 Testing end-to-end <span className={cine.desarrolloOpcional}>(sin IA · $0)</span></div>
          <div className={styles.testNote}>
            Hago de IA con timelines hardcodeados de tus proyectos. Cada uno se previsualiza al toque y
            renderiza el MP4 completo por Remotion (tu PC) → Cloudinary, sin análisis ni gasto.
          </div>
          <div className={cine.propGrid}>
            {PROJECTS.map((p, i) => (
              <button key={p.key}
                className={`${cine.propBtn} ${active === i ? cine.propBtnActive : ''}`}
                disabled={gen?.status === 'running'}
                onClick={() => runProject(i)}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* FORM — shell para la IA (próximo paso) */}
        <div className={cine.cineSection}>
          <div className={cine.cineSectionLabel}>URL del sitio</div>
          <input className={cine.nameInput} placeholder="https://tusitio.com" value={url} onChange={e => setUrl(e.target.value)} />
        </div>
        <div className={cine.cineSection}>
          <div className={cine.cineSectionLabel}>Qué querés contar <span className={cine.desarrolloOpcional}>(opcional)</span></div>
          <textarea className={cine.textarea} rows={3} placeholder="Ángulo, qué destacar, tono…" value={desarrollo} onChange={e => setDesarrollo(e.target.value)} />
        </div>
        <div className={cine.cineSection}>
          <div className={cine.cineSectionLabel}>Formato</div>
          <div className={cine.propGrid}>
            {FORMATOS.map(f => (
              <button key={f.key}
                className={`${cine.propBtn} ${formato === f.key ? cine.propBtnActive : ''}`}
                disabled={!f.on}
                title={f.on ? '' : 'Próximamente'}
                onClick={() => f.on && setFormato(f.key)}>
                {f.label}{!f.on ? ' ·' : ''}
              </button>
            ))}
          </div>
        </div>
        <button className={`${cine.forgeBtn} ${cine.forgeBtnDisabled}`} disabled title="Próximo paso">
          Próximamente: la IA escribe el guion desde tu link
        </button>
      </div>

      <div className={cine.right}>
        {/* PREVIEW EN VIVO */}
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

        {/* RESULTADO DEL RENDER */}
        {gen && (
          <div className={styles.renderPanel}>
            {gen.status === 'running' && (
              <div className={styles.progressWrap}>
                <div className={styles.progressBar}><div className={styles.progressFill} style={{ width: `${pct}%` }} /></div>
                <span className={styles.progressMsg}>{(gen.label ? gen.label + ' · ' : '') + (STEP_LABELS[gen.step] || 'Procesando…')}</span>
              </div>
            )}
            {gen.status === 'error' && <div className={styles.err}>⚠️ {gen.error}</div>}
            {gen.status === 'done' && gen.videoUrl && (
              <div className={styles.done}>
                <video src={gen.videoUrl} controls autoPlay loop playsInline className={styles.resultVideo} />
                <a className={`${styles.ctl} ${styles.primary}`} href={gen.videoUrl} target="_blank" rel="noreferrer" download>⬇ Descargar MP4 ({gen.label})</a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
