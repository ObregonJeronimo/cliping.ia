import { useState, useCallback, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './Landing.module.css'
import HeroText from './HeroText'
import MarqueeShowcase from './MarqueeShowcase'
import Features from './Features'
import Pricing from './Pricing'
import Footer from './Footer'

const ParticleHero = lazy(() => import('./ParticleHero'))

const STATE_LABELS = {
  url:      { tag: 'Analizando sitio',       desc: 'La IA escanea tu URL y extrae el contenido' },
  prompt:   { tag: 'Procesando instruccion', desc: 'Interpreta lo que queres comunicar' },
  timeline: { tag: 'Construyendo narrativa', desc: 'Arma la estructura del video en segundos' },
}

export default function Landing() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState('url')
  const [textVisible, setTextVisible] = useState(true)

  const handlePhaseChange = useCallback(({ phase: p, visible }) => {
    if (visible) setPhase(p)
    setTextVisible(visible)
  }, [])

  const info = STATE_LABELS[phase] || STATE_LABELS.url

  return (
    <div className={styles.page}>
      <div className={styles.grain} />

      <nav className={styles.nav}>
        <div className={styles.logo}>Ur<span>vid</span></div>
        <div className={styles.navLinks}>
          <a href="#features">Features</a>
          <a href="#pricing">Precios</a>
        </div>
        <button className={styles.navCta} onClick={() => navigate('/login')}>
          Empezar gratis
        </button>
      </nav>

      <section className={styles.hero}>
        {/* Fondo full-bleed: canvas de particulas + overlay de texto */}
        <div className={styles.canvasWrapper}>
          <Suspense fallback={<div className={styles.canvasPlaceholder} />}>
            <ParticleHero onPhaseChange={handlePhaseChange} />
          </Suspense>
          <HeroText phase={phase} visible={textVisible} />
        </div>
        <div className={styles.vignette} />

        {/* Texto principal por encima del fondo */}
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
      </section>

      <MarqueeShowcase />

      <Features />

      <Pricing />

      <Footer />
    </div>
  )
}
