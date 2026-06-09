import { useEffect, useRef, useState } from 'react'
import styles from './Features.module.css'

const TYPED_TEXT = 'Un video que muestre todas las herramientas de mi sitio, profesional y listo para publicar'
const SCRIPT = ['Hook', 'Problema', 'Beneficios', 'CTA']

// ── Hook: dispara una sola vez cuando el elemento entra en viewport ──────
function useInView(threshold = 0.4) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const node = ref.current
    if (!node) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setInView(true) },
      { threshold }
    )
    obs.observe(node)
    return () => obs.disconnect()
  }, [threshold])
  return [ref, inView]
}

// ───────────────────────────────────────────────────────────────────────
//  DEMO 1 — De tu URL a un video: typewriter del prompt + guion cargando
// ───────────────────────────────────────────────────────────────────────
function DemoPromptToScript({ active }) {
  const [typed, setTyped] = useState('')
  const [scriptStep, setScriptStep] = useState(-1)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    if (!active) return
    let timers = []
    setTyped(''); setScriptStep(-1); setGenerating(false)

    // 1) typewriter
    let i = 0
    const type = () => {
      if (i <= TYPED_TEXT.length) {
        setTyped(TYPED_TEXT.slice(0, i))
        i++
        timers.push(setTimeout(type, 28))
      } else {
        // 2) generando
        timers.push(setTimeout(() => setGenerating(true), 400))
        // 3) guion en secuencia
        SCRIPT.forEach((_, idx) => {
          timers.push(setTimeout(() => {
            setGenerating(false)
            setScriptStep(idx)
          }, 900 + idx * 700))
        })
      }
    }
    timers.push(setTimeout(type, 500))
    return () => timers.forEach(clearTimeout)
  }, [active])

  return (
    <div className={styles.demoStack}>
      <div className={styles.inputBox}>
        <span className={styles.inputText}>
          {typed}<span className={styles.inputCaret} />
        </span>
        <div className={styles.inputBar}>
          <span className={styles.inputPlus}>+</span>
          <span className={styles.inputSend}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M8 13V3M4 7l4-4 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
      </div>

      <div className={styles.scriptBox}>
        {generating && <div className={styles.generating}><span /><span /><span /></div>}
        {!generating && SCRIPT.map((s, i) => (
          <div
            key={s}
            className={`${styles.scriptItem} ${i <= scriptStep ? styles.scriptShown : ''}`}
          >
            <span className={styles.scriptCheck}>
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M2.5 7.5l3 3 6-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            {s}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── DEMO 2 — Formatos: se destacan por turnos ───────────────────────────
function DemoFormats({ active }) {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setIdx(v => (v + 1) % 3), 1100)
    return () => clearInterval(id)
  }, [active])
  const fmts = [
    { label: '9:16', w: 44, h: 76 },
    { label: '1:1',  w: 66, h: 66 },
    { label: '16:9', w: 100, h: 58 },
  ]
  return (
    <div className={styles.demoFormats}>
      {fmts.map((f, i) => (
        <div
          key={f.label}
          className={`${styles.fmt} ${i === idx ? styles.fmtActive : ''}`}
          style={{ width: f.w, height: f.h }}
        >
          <span>{f.label}</span>
        </div>
      ))}
    </div>
  )
}

// ── DEMO 3 — B-Roll: celdas que aparecen escalonadas ────────────────────
function DemoBroll({ active }) {
  return (
    <div className={`${styles.demoBroll} ${active ? styles.brollGo : ''}`}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className={styles.brollCell} style={{ transitionDelay: `${i * 90}ms` }} />
      ))}
    </div>
  )
}

// ── DEMO 4 — Voz en off: waveform reproduciendose ───────────────────────
function DemoVoice({ active }) {
  return (
    <div className={styles.demoVoice}>
      {Array.from({ length: 32 }).map((_, i) => (
        <span
          key={i}
          className={active ? styles.waveBar : ''}
          style={{ animationDelay: `${i * 60}ms`, height: '30%' }}
        />
      ))}
    </div>
  )
}

// ── DEMO 5 — Tu marca: swatches y logo aplicandose ──────────────────────
function DemoBrand({ active }) {
  return (
    <div className={`${styles.demoBrand} ${active ? styles.brandGo : ''}`}>
      <span className={styles.swatch} style={{ background: '#6c5ce7', transitionDelay: '0ms' }} />
      <span className={styles.swatch} style={{ background: '#c8a8f0', transitionDelay: '120ms' }} />
      <span className={styles.swatch} style={{ background: '#9ad7b0', transitionDelay: '240ms' }} />
      <span className={styles.brandLogo} style={{ transitionDelay: '360ms' }}>logo</span>
    </div>
  )
}

// ── DEMO 6 — Modo avanzado: nodos conectados pulsando ───────────────────
function DemoAdvanced({ active }) {
  return (
    <div className={styles.demoAdvanced}>
      <svg viewBox="0 0 200 90" className={styles.advSvg}>
        <line x1="20" y1="45" x2="100" y2="20" className={active ? styles.advLine : ''} />
        <line x1="20" y1="45" x2="100" y2="70" className={active ? styles.advLine : ''} />
        <line x1="100" y1="20" x2="180" y2="45" className={active ? styles.advLine : ''} />
        <line x1="100" y1="70" x2="180" y2="45" className={active ? styles.advLine : ''} />
        {[[20,45],[100,20],[100,70],[180,45]].map(([cx,cy],i) => (
          <circle key={i} cx={cx} cy={cy} r="7" className={active ? styles.advNode : ''} style={{ animationDelay: `${i * 0.25}s` }} />
        ))}
      </svg>
    </div>
  )
}

// ── Franja de feature (texto + demo, alterna lado) ──────────────────────
function FeatureRow({ index, eyebrow, title, desc, demo, reverse, badge }) {
  const [ref, inView] = useInView(0.35)
  return (
    <div
      ref={ref}
      className={`${styles.row} ${reverse ? styles.rowReverse : ''} ${inView ? styles.rowIn : ''}`}
    >
      <div className={styles.rowText}>
        <span className={styles.rowEyebrow}>{eyebrow}{badge && <span className={styles.rowBadge}>{badge}</span>}</span>
        <h3 className={styles.rowTitle}>{title}</h3>
        <p className={styles.rowDesc}>{desc}</p>
      </div>
      <div className={styles.rowDemo}>
        <div className={styles.demoFrame}>{demo(inView)}</div>
      </div>
    </div>
  )
}

export default function Features() {
  return (
    <section id="features" className={styles.section}>
      <div className={styles.head}>
        <span className={styles.eyebrow}>Features</span>
        <h2 className={styles.title}>
          Todo un equipo de video,<br />
          <span className={styles.accent}>en una sola herramienta.</span>
        </h2>
        <p className={styles.subtitle}>
          Baja y descubri como cada paso de la produccion se automatiza. Vos solo pones la URL.
        </p>
      </div>

      <div className={styles.rows}>
        <FeatureRow
          eyebrow="01 — El nucleo"
          title="De tu URL a un video, sin tocar un editor"
          desc="Pega el link de tu sitio y describe lo que queres. La IA analiza tu negocio, escribe el guion y arma el video completo. Sin software de edicion, sin curva de aprendizaje."
          demo={(active) => <DemoPromptToScript active={active} />}
        />
        <FeatureRow
          reverse
          eyebrow="02 — Distribucion"
          title="Un video, todos los formatos"
          desc="Vertical para TikTok y Reels, cuadrado para el feed, horizontal para YouTube. Cada plataforma con su formato ideal, en una sola generacion."
          demo={(active) => <DemoFormats active={active} />}
        />
        <FeatureRow
          eyebrow="03 — Narrativa"
          title="Visuales y B-Roll automaticos"
          desc="La IA elige y genera imagenes y clips que acompañan cada escena del guion. Sin buscar stock ni grabar nada."
          demo={(active) => <DemoBroll active={active} />}
        />
        <FeatureRow
          reverse
          eyebrow="04 — Audio"
          title="Voz en off y subtitulos"
          desc="Narracion con voz natural y subtitulos sincronizados automaticamente. Listos para que tu video funcione con o sin sonido."
          demo={(active) => <DemoVoice active={active} />}
        />
        <FeatureRow
          eyebrow="05 — Identidad"
          title="Tu marca, siempre"
          desc="Tus colores, tu logo y tu tipografia aplicados de forma consistente en cada video que generes."
          demo={(active) => <DemoBrand active={active} />}
        />
        <FeatureRow
          reverse
          badge="Studio"
          eyebrow="06 — Pro"
          title="Modo avanzado de IA"
          desc="Control fino sobre el guion, el ritmo y el estilo visual. Render en maxima calidad y resultados de nivel agencia."
          demo={(active) => <DemoAdvanced active={active} />}
        />
      </div>
    </section>
  )
}
