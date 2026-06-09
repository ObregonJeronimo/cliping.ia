import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import styles from './Login.module.css'

export default function Login() {
  const { user, signInWithGoogle, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && user) navigate('/studio')
  }, [user, loading, navigate])

  return (
    <div className={styles.page}>
      {/* Columna izquierda: card de login */}
      <div className={styles.left}>
        <div className={styles.card}>
          <div className={styles.logoRow}>
            <img src="/logo.svg" alt="cliping.ia" width="34" height="34" />
            <span className={styles.logo}>cliping<span>.ia</span></span>
          </div>

          <h1 className={styles.title}>Bienvenido</h1>
          <p className={styles.sub}>
            Genera videos de marketing con IA en segundos.
            Ingresa con tu cuenta de Google para continuar.
          </p>

          <button className={styles.googleBtn} onClick={signInWithGoogle}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
              <path d="M3.964 10.707A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continuar con Google
          </button>

          <p className={styles.terms}>
            Al ingresar aceptas los terminos de uso y la politica de privacidad.
          </p>
        </div>
      </div>

      {/* Columna derecha: panel animado (placeholder, se afina luego) */}
      <div className={styles.right} aria-hidden="true">
        <div className={styles.glow} />
        <div className={styles.orbits}>
          <span className={styles.orbit} />
          <span className={styles.orbit} />
          <span className={styles.orbit} />
        </div>

        <div className={styles.floatCards}>
          <div className={`${styles.fcard} ${styles.fcard1}`}>
            <div className={styles.fcardBar}><span style={{ width: '70%' }} /></div>
            <div className={styles.fcardBar}><span style={{ width: '45%' }} /></div>
          </div>
          <div className={`${styles.fcard} ${styles.fcard2}`}>
            <div className={styles.fcardPlay}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M5 3.5l7 4.5-7 4.5v-9z" fill="currentColor" />
              </svg>
            </div>
          </div>
          <div className={`${styles.fcard} ${styles.fcard3}`}>
            <div className={styles.fcardWave}>
              {Array.from({ length: 12 }).map((_, i) => (
                <span key={i} style={{ animationDelay: `${i * 80}ms` }} />
              ))}
            </div>
          </div>
        </div>

        <div className={styles.brandMark}>
          <img src="/logo.svg" alt="" width="52" height="52" />
        </div>
      </div>
    </div>
  )
}
