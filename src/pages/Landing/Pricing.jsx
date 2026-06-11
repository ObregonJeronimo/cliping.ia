import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './Pricing.module.css'

// Iconos de check / cruz inline (sin dependencias)
const Check = () => (
  <svg className={styles.icoCheck} width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M3 8.5l3 3 7-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
const Cross = () => (
  <svg className={styles.icoCross} width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
)

// Definicion de planes. annual = precio mensual cobrado anual (2 meses gratis).
const PLANS = [
  {
    id: 'free',
    name: 'Prueba gratis',
    tagline: 'Para conocer el potencial',
    monthly: 0,
    annual: 0,
    cta: 'Empezar gratis',
    highlight: false,
    features: [
      { t: '3 videos de prueba', ok: true },
      { t: 'Modo simple de la IA', ok: true },
      { t: 'Formato vertical (9:16)', ok: true },
      { t: 'Con marca de agua', ok: true, muted: true },
      { t: 'Modo avanzado de IA', ok: false },
      { t: 'Sin marca de agua', ok: false },
    ],
  },
  {
    id: 'esencial',
    name: 'Esencial',
    tagline: 'Para creadores y pymes',
    monthly: 19.99,
    annual: 16.66,
    cta: 'Elegir Esencial',
    highlight: true,
    badge: 'Mas elegido',
    features: [
      { t: '40 videos por mes', ok: true },
      { t: 'Modo simple de la IA', ok: true },
      { t: 'Todos los formatos (9:16, 16:9, 1:1)', ok: true },
      { t: 'Sin marca de agua', ok: true },
      { t: 'Tu marca aplicada (logo, colores)', ok: true },
      { t: 'Modo avanzado de IA', ok: false },
    ],
  },
  {
    id: 'studio',
    name: 'Studio',
    tagline: 'Para agencias y power users',
    monthly: 59.99,
    annual: 49.99,
    cta: 'Elegir Studio',
    highlight: false,
    features: [
      { t: 'Todo lo del plan Esencial', ok: true, strong: true },
      { t: '150 videos por mes', ok: true },
      { t: 'Modo avanzado de IA', ok: true, strong: true },
      { t: 'Render en maxima calidad', ok: true },
      { t: 'Voz en off premium', ok: true },
      { t: 'Soporte prioritario', ok: true },
    ],
  },
]

export default function Pricing() {
  const navigate = useNavigate()
  const [annual, setAnnual] = useState(true)

  const fmt = (n) => (n === 0 ? '0' : n.toFixed(2))

  return (
    <section id="pricing" className={styles.section}>
      <div className={styles.head}>
        <h2 className={styles.title}>
          Empeza gratis. Escala <span className={styles.accent}>cuando crezcas.</span>
        </h2>
        <p className={styles.subtitle}>
          Sin contratos ni sorpresas. Cambia o cancela tu plan cuando quieras.
        </p>

        <div className={styles.toggle} role="group" aria-label="Ciclo de facturacion">
          <button
            className={`${styles.toggleBtn} ${!annual ? styles.toggleActive : ''}`}
            onClick={() => setAnnual(false)}
          >
            Mensual
          </button>
          <button
            className={`${styles.toggleBtn} ${annual ? styles.toggleActive : ''}`}
            onClick={() => setAnnual(true)}
          >
            Anual
            <span className={styles.toggleSave}>2 meses gratis</span>
          </button>
        </div>
      </div>

      <div className={styles.grid}>
        {PLANS.map((p) => (
          <div
            key={p.id}
            className={`${styles.card} ${p.highlight ? styles.cardHighlight : ''}`}
          >
            {p.badge && <div className={styles.badge}>{p.badge}</div>}

            <div className={styles.cardHead}>
              <h3 className={styles.planName}>{p.name}</h3>
              <p className={styles.planTagline}>{p.tagline}</p>
            </div>

            <div className={styles.priceRow}>
              <span className={styles.currency}>$</span>
              <span className={styles.price}>{fmt(annual ? p.annual : p.monthly)}</span>
              <span className={styles.period}>{p.monthly === 0 ? '' : '/mes'}</span>
            </div>
            {p.monthly > 0 && annual && (
              <div className={styles.billedNote}>Facturado anualmente</div>
            )}
            {p.monthly === 0 && (
              <div className={styles.billedNote}>Para siempre</div>
            )}

            <button
              className={`${styles.cta} ${p.highlight ? styles.ctaPrimary : styles.ctaGhost}`}
              onClick={() => navigate('/login')}
            >
              {p.cta}
            </button>

            <ul className={styles.features}>
              {p.features.map((f, i) => (
                <li
                  key={i}
                  className={`${styles.feat} ${!f.ok ? styles.featOff : ''} ${f.muted ? styles.featMuted : ''} ${f.strong ? styles.featStrong : ''}`}
                >
                  {f.ok ? <Check /> : <Cross />}
                  <span>{f.t}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <p className={styles.footNote}>
        Todos los planes incluyen acceso a futuras mejoras del producto.
      </p>
    </section>
  )
}
