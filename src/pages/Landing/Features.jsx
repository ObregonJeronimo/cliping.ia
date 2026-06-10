import { useEffect, useRef, useState } from 'react'
import styles from './Features.module.css'

const TYPED_TEXT = 'Un video que muestre todas las herramientas de mi sitio, profesional y listo para publicar'
const SCRIPT = ['Hook', 'Problema', 'Beneficios', 'CTA']

// ── DEMO 1 — prompt -> guion ────────────────────────────────────────────
function DemoPromptToScript({ active }) {
  const [typed, setTyped] = useState('')
  const [scriptStep, setScriptStep] = useState(-1)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    if (!active) return
    let timers = []
    setTyped(''); setScriptStep(-1); setGenerating(false)
    let i = 0
    const type = () => {
      if (i <= TYPED_TEXT.length) {
        setTyped(TYPED_TEXT.slice(0, i)); i++
        timers.push(setTimeout(type, 28))
      } else {
        timers.push(setTimeout(() => setGenerating(true), 400))
        SCRIPT.forEach((_, idx) => {
          timers.push(setTimeout(() => { setGenerating(false); setScriptStep(idx) }, 900 + idx * 700))
        })
      }
    }
    timers.push(setTimeout(type, 500))
    return () => timers.forEach(clearTimeout)
  }, [active])

  return (
    <div className={styles.demoStack}>
      <div className={styles.inputBox}>
        <span className={styles.inputText}>{typed}<span className={styles.inputCaret} /></span>
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
          <div key={s} className={`${styles.scriptItem} ${i <= scriptStep ? styles.scriptShown : ''}`}>
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

// ── DEMO 2 — formatos ───────────────────────────────────────────────────
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
        <div key={f.label} className={`${styles.fmt} ${i === idx ? styles.fmtActive : ''}`} style={{ width: f.w, height: f.h }}>
          <span>{f.label}</span>
        </div>
      ))}
    </div>
  )
}

// ── DEMO 3 — B-Roll: 6 celdas, cada una con su micro-animacion en loop ───
// Celda 0: texto que se sobrescribe por otro (typewriter ciclico)
function CellTyper() {
  const words = ['Hook', 'Escena', 'Corte', 'Zoom']
  const [w, setW] = useState(0)
  const [txt, setTxt] = useState('')
  useEffect(() => {
    let timers = []
    let i = 0
    const cur = words[w]
    const tick = () => {
      if (i <= cur.length) { setTxt(cur.slice(0, i)); i++; timers.push(setTimeout(tick, 130)) }
      else timers.push(setTimeout(() => setW(v => (v + 1) % words.length), 900))
    }
    timers.push(setTimeout(tick, 200))
    return () => timers.forEach(clearTimeout)
  }, [w])
  return <div className={styles.cellTyper}>{txt}<span className={styles.cellCaret} /></div>
}

// Celda 1: gotita que cae
function CellDrop() {
  return (
    <div className={styles.cellDrop}>
      <span className={styles.drop} />
      <span className={styles.ripple} />
    </div>
  )
}

// Celda 2: barras de un mini-chart que crecen
function CellBars() {
  return (
    <div className={styles.cellBars}>
      {[0,1,2,3].map(i => <span key={i} style={{ animationDelay: `${i * 0.18}s` }} />)}
    </div>
  )
}

// Celda 3: play que late
function CellPlay() {
  return (
    <div className={styles.cellPlay}>
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M6 4l10 6-10 6V4z" fill="currentColor" /></svg>
    </div>
  )
}

// Celda 4: linea de scan que recorre
function CellScan() {
  return <div className={styles.cellScan}><span /></div>
}

// Celda 5: puntos orbitando
function CellOrbit() {
  return (
    <div className={styles.cellOrbit}>
      <span /><span /><span />
    </div>
  )
}

function DemoBroll({ active }) {
  const cells = [CellTyper, CellDrop, CellBars, CellPlay, CellScan, CellOrbit]
  return (
    <div className={`${styles.demoBroll} ${active ? styles.brollGo : ''}`}>
      {cells.map((Cell, i) => (
        <div key={i} className={styles.brollCell} style={{ transitionDelay: `${i * 90}ms` }}>
          {active && <Cell />}
        </div>
      ))}
    </div>
  )
}

// ── DEMO 4 — voz ────────────────────────────────────────────────────────
function DemoVoice({ active }) {
  return (
    <div className={styles.demoVoice}>
      {Array.from({ length: 32 }).map((_, i) => (
        <span key={i} className={active ? styles.waveBar : ''} style={{ animationDelay: `${i * 60}ms`, height: '30%' }} />
      ))}
    </div>
  )
}

// ── DEMO 5 — marca (con logo de Urvid) ──────────────────────────────────
function DemoBrand({ active }) {
  return (
    <div className={`${styles.demoBrand} ${active ? styles.brandGo : ''}`}>
      <span className={styles.swatch} style={{ background: '#16150f', transitionDelay: '0ms' }} />
      <span className={styles.swatch} style={{ background: '#74716a', transitionDelay: '120ms' }} />
      <span className={styles.swatch} style={{ background: '#c4c0b6', transitionDelay: '240ms' }} />
      <span className={styles.brandLogo} style={{ transitionDelay: '360ms' }}>
        <img src="/logo.svg" alt="Urvid" width="32" height="32" />
      </span>
    </div>
  )
}

// ── DEMO 6 — avanzado ───────────────────────────────────────────────────
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

// ── Datos de las features ───────────────────────────────────────────────
const FEATURES = [
  {
    key: 'core',
    eyebrow: '01 — El nucleo',
    title: 'De tu URL a un video, sin tocar un editor',
    desc: 'Pega el link de tu sitio y describe lo que queres. La IA analiza tu negocio, escribe el guion y arma el video completo. Sin software de edicion, sin curva de aprendizaje.',
    Demo: DemoPromptToScript,
  },
  {
    key: 'dist',
    eyebrow: '02 — Distribucion',
    title: 'Un video, todos los formatos',
    desc: 'Vertical para TikTok y Reels, cuadrado para el feed, horizontal para YouTube. Cada plataforma con su formato ideal, en una sola generacion.',
    Demo: DemoFormats,
  },
  {
    key: 'broll',
    eyebrow: '03 — Narrativa',
    title: 'Visuales y B-Roll automaticos',
    desc: 'La IA elige y genera imagenes y clips que acompañan cada escena del guion. Sin buscar stock ni grabar nada.',
    Demo: DemoBroll,
  },
  {
    key: 'audio',
    eyebrow: '04 — Audio',
    title: 'Voz en off y subtitulos',
    desc: 'Narracion con voz natural y subtitulos sincronizados automaticamente. Listos para que tu video funcione con o sin sonido.',
    Demo: DemoVoice,
  },
  {
    key: 'brand',
    eyebrow: '05 — Identidad',
    title: 'Tu marca, siempre',
    desc: 'Tus colores, tu logo y tu tipografia aplicados de forma consistente en cada video que generes.',
    Demo: DemoBrand,
  },
  {
    key: 'pro',
    eyebrow: '06 — Pro',
    title: 'Modo avanzado de IA',
    desc: 'Control fino sobre el guion, el ritmo y el estilo visual. Render en maxima calidad y resultados de nivel agencia.',
    Demo: DemoAdvanced,
    badge: 'Studio',
  },
]

// ── Stack con scroll: cada panel queda fijo y el siguiente se apila encima
//    mientras el anterior se achica/atenua hacia atras. El scroll dicta todo.
function FeatureStack() {
  const stackRef = useRef(null)
  const cardRefs = useRef([])
  const [active, setActive] = useState(0)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) { setActive(-1); return }   // -1 => todas las demos activas, sin transform

    let raf = null
    const n = FEATURES.length

    const update = () => {
      raf = null
      const stack = stackRef.current
      if (!stack) return
      const vh = window.innerHeight || 1
      const stackTop = stack.getBoundingClientRect().top + window.scrollY
      // p: 0 cuando el panel 0 recien se fija; 1 cuando el 1 lo cubre; etc.
      const p = (window.scrollY - stackTop) / vh

      for (let i = 0; i < n; i++) {
        const card = cardRefs.current[i]
        if (!card) continue
        // cuanto fue cubierto este panel por el siguiente (0..1)
        const cov = Math.min(Math.max(p - i, 0), 1)
        const scale = 1 - cov * 0.09
        const ty = -cov * 26
        const op = 1 - cov * 0.55
        card.style.transform = `translateY(${ty}px) scale(${scale})`
        card.style.opacity = String(op)
      }

      let act = Math.round(p)
      if (act < 0) act = 0
      if (act > n - 1) act = n - 1
      setActive(prev => (prev === act ? prev : act))
    }

    const onScroll = () => { if (raf == null) raf = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div className={styles.stack} ref={stackRef}>
      {FEATURES.map((f, i) => {
        const Demo = f.Demo
        return (
          <div key={f.key} className={styles.panel}>
            <div
              className={styles.card}
              ref={el => { cardRefs.current[i] = el }}
            >
              <div className={styles.cardText}>
                <span className={styles.rowEyebrow}>
                  {f.eyebrow}{f.badge && <span className={styles.rowBadge}>{f.badge}</span>}
                </span>
                <h3 className={styles.rowTitle}>{f.title}</h3>
                <p className={styles.rowDesc}>{f.desc}</p>
              </div>
              <div className={styles.cardDemo}>
                <div className={styles.demoFrame}>
                  <Demo active={active === i || active === -1} />
                </div>
              </div>
            </div>
          </div>
        )
      })}
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

      <FeatureStack />
    </section>
  )
}
