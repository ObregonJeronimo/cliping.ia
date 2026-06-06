import { useState, useCallback, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './Landing.module.css'
import HeroText from './HeroText'

const ParticleHero = lazy(() => import('./ParticleHero'))

const STATE_LABELS = {
  url:      { tag: 'Analizando sitio',       desc: 'La IA escanea tu URL y extrae el contenido' },
  prompt:   { tag: 'Procesando instruccion', desc: 'Interpreta lo que queres comunicar' },
  timeline: { tag: 'Construyendo narrativa', desc: 'Arma la estructura del video en segundos' },
}

export default function Landing() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState('url')       // fase activa (texto a mostrar)
  const [textVisible, setTextVisible] = useState(true)

  // ParticleHero emite { phase, visible } en cada cambio del ciclo
  const handlePhaseChange = useCallback(({ phase: p, visible }) => {
    if (visible) setPhase(p)        // al aparecer: fijar fase y mostrar
    setTextVisible(visible)
  }, [])

  const info = STATE_LABELS[phase] || STATE_LABELS.url

  return (
    <div className={styles.page}>
      <div className={styles.grain} />

      <nav className={styles.nav}>
        <div className={styles.logo}>cliping<span>.ia</span></div>
        <div className={styles.navLinks}>
          <a href="#features">Features</a>
          <a href="#pricing">Precios</a>
        </div>
        <button className={styles.navCta} onClick={() => navigate('/login')}>
          Empezar gratis
        </button>
      </nav>

      <section className={styles.hero}>
        <div className={styles.left}>
          <h1 className={styles.title}>
            Tu video de<br />
            marketing,<br />
            <span className={styles.titleAccent}>en segundos.</span>
          </h1>

          <p className={styles.subtitle}>
            Ingresa la URL de tu sitio, describe lo que queres
            y la IA genera un video profesional listo para publicar.
          </p>

          <div className={styles.actions}>
            <button className={styles.ctaPrimary} onClick={() => navigate('/login')}>
              Crear mi primer video
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <span className={styles.ctaNote}>Sin tarjeta de credito</span>
          </div>

          <div className={`${styles.stateIndicator} ${textVisible ? styles.stateVisible : styles.stateHidden}`}>
            <div className={styles.stateTag}>{info.tag}</div>
            <div className={styles.stateDesc}>{info.desc}</div>
          </div>
        </div>

        <div className={styles.right}>
          <div className={styles.canvasWrapper}>
            <Suspense fallback={<div className={styles.canvasPlaceholder} />}>
              <ParticleHero onPhaseChange={handlePhaseChange} />
            </Suspense>
            <div className={styles.vignette} />
            <HeroText phase={phase} visible={textVisible} />
          </div>
        </div>
      </section>

      <section className={styles.steps}>
        {[
          { num: '01', label: 'Ingresas tu URL',    desc: 'La IA analiza tu sitio completo' },
          { num: '02', label: 'Describes el video', desc: 'En lenguaje natural, sin tecnicismos' },
          { num: '03', label: 'Recibes tu video',   desc: 'Listo para Instagram, TikTok o YouTube' },
        ].map((s) => (
          <div key={s.num} className={styles.step}>
            <div className={styles.stepNum}>{s.num}</div>
            <div className={styles.stepLabel}>{s.label}</div>
            <div className={styles.stepDesc}>{s.desc}</div>
          </div>
        ))}
      </section>
    </div>
  )
}
