import { useEffect, useState, useRef } from 'react'
import styles from './HeroText.module.css'

const TL_ITEMS = ['Hook', 'Problema', 'Features', 'Diferenciador', 'Beneficios', 'CTA']

// Capa de texto vectorial nitido que se superpone al canvas de particulas.
// Recibe { phase, visible } desde ParticleHero y anima la entrada/salida.
export default function HeroText({ phase, visible }) {
  // checks del timeline que se van marcando en secuencia
  const [activeCheck, setActiveCheck] = useState(-1)
  const timers = useRef([])

  useEffect(() => {
    // limpiar timers previos
    timers.current.forEach(clearTimeout)
    timers.current = []

    if (phase === 'timeline' && visible) {
      setActiveCheck(-1)
      TL_ITEMS.forEach((_, i) => {
        timers.current.push(setTimeout(() => setActiveCheck(i), 350 + i * 850))
      })
    } else if (phase !== 'timeline') {
      setActiveCheck(-1)
    }

    return () => {
      timers.current.forEach(clearTimeout)
      timers.current = []
    }
  }, [phase, visible])

  const cls = `${styles.layer} ${visible ? styles.show : styles.hide}`

  if (phase === 'url') {
    return (
      <div className={cls} key="url">
        <div className={styles.urlBar}>
          <span className={styles.urlDot} />
          <span className={styles.urlScheme}>https://</span>
          <span className={styles.urlDomain}>tunegocio.com</span>
          <span className={styles.caret} />
        </div>
        <div className={styles.urlHint}>Analizando el contenido del sitio</div>
      </div>
    )
  }

  if (phase === 'prompt') {
    return (
      <div className={cls} key="prompt">
        <p className={styles.prompt}>
          <span className={styles.quote}>"</span>
          Un video <em>profesional</em> que muestre todas
          las herramientas de mi sitio, listo para publicar
          <span className={styles.quote}>"</span>
        </p>
      </div>
    )
  }

  if (phase === 'timeline') {
    return (
      <div className={cls} key="timeline">
        <ul className={styles.timeline}>
          {TL_ITEMS.map((label, i) => (
            <li
              key={label}
              className={`${styles.tlItem} ${i <= activeCheck ? styles.tlDone : ''}`}
            >
              <span className={styles.tlCheck}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2.5 7.5l3 3 6-7" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className={styles.tlLabel}>{label}</span>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return null
}
