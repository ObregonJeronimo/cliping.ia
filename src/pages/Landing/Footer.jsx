import { useNavigate } from 'react-router-dom'
import styles from './Footer.module.css'

export default function Footer() {
  const navigate = useNavigate()
  const year = new Date().getFullYear()

  return (
    <footer className={styles.footer}>
      {/* ── Bloque CTA con fondo de puntos ─────────────────────────────── */}
      <div className={styles.cta}>
        <div className={styles.dots} aria-hidden="true" />
        <div className={styles.ctaInner}>
          <span className={styles.eyebrow}>Empeza ahora</span>
          <h2 className={styles.ctaTitle}>
            Lo que antes necesitaba un equipo,<br />
            <span className={styles.accent}>ahora toma un clic.</span>
          </h2>
          <p className={styles.ctaSub}>
            Pega la URL de tu sitio y deja que la IA arme tu proximo video de marketing.
          </p>
          <div className={styles.ctaActions}>
            <button className={styles.btnPrimary} onClick={() => navigate('/login')}>
              Crear mi primer video
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button className={styles.btnGhost} onClick={() => navigate('/login')}>
              Empezar gratis
            </button>
          </div>
        </div>
      </div>

      {/* ── Links y legal ──────────────────────────────────────────────── */}
      <div className={styles.bottom}>
        <div className={styles.cols}>
          <div className={styles.brandCol}>
            <div className={styles.logoRow}>
              <img src="/logo.svg" alt="cliping.ia" width="28" height="28" />
              <span className={styles.logo}>cliping<span>.ia</span></span>
            </div>
            <p className={styles.tagline}>
              Videos de marketing generados con IA, desde la URL de tu sitio.
            </p>
          </div>

          <div className={styles.linkCol}>
            <span className={styles.colTitle}>Producto</span>
            <a href="#features">Features</a>
            <a href="#pricing">Precios</a>
            <button className={styles.linkBtn} onClick={() => navigate('/login')}>Empezar gratis</button>
          </div>

          <div className={styles.linkCol}>
            <span className={styles.colTitle}>Recursos</span>
            <a href="#features">Como funciona</a>
            <a href="#pricing">Planes</a>
            <a href="#">Contacto</a>
          </div>

          <div className={styles.linkCol}>
            <span className={styles.colTitle}>Legal</span>
            <a href="#">Terminos de uso</a>
            <a href="#">Politica de privacidad</a>
          </div>
        </div>

        <div className={styles.legal}>
          <span>© {year} cliping.ia. Todos los derechos reservados.</span>
          <span className={styles.madeWith}>Hecho con IA en Argentina</span>
        </div>
      </div>
    </footer>
  )
}
