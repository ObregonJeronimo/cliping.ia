import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import styles from './Settings.module.css'

const PLANS = [
  { key: 'free',    label: 'Free',    price: '$0',  credits: 10,  features: ['10 créditos/mes', '3 videos max', 'Con watermark'] },
  { key: 'starter', label: 'Starter', price: '$9',  credits: 30,  features: ['30 créditos/mes', 'Sin watermark', 'HD export'] },
  { key: 'pro',     label: 'Pro',     price: '$29', credits: 150, features: ['150 créditos/mes', 'Voces premium', 'Prioridad en cola'] },
  { key: 'agency',  label: 'Agency',  price: '$99', credits: 999, features: ['Ilimitado', 'API access', 'White label'] },
]

export default function Settings() {
  const { user, profile, logout } = useAuth()
  const [tab, setTab] = useState('account')

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Configuración</h1>
        <p className={styles.sub}>Gestioná tu cuenta y plan.</p>
      </div>

      <div className={styles.tabs}>
        {['account', 'plan', 'api'].map(t => (
          <button key={t}
            className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`}
            onClick={() => setTab(t)}>
            {{ account: 'Cuenta', plan: 'Plan y créditos', api: 'API' }[t]}
          </button>
        ))}
      </div>

      {tab === 'account' && (
        <div className={styles.section}>
          <div className={styles.card}>
            <div className={styles.profileRow}>
              {user?.photoURL
                ? <img src={user.photoURL} alt="" className={styles.avatar} referrerPolicy="no-referrer" />
                : <div className={styles.avatarFallback}>{user?.email?.[0]?.toUpperCase()}</div>
              }
              <div>
                <div className={styles.profileName}>{user?.displayName}</div>
                <div className={styles.profileEmail}>{user?.email}</div>
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardLabel}>Zona horaria</div>
            <select className={styles.select}>
              <option>America/Argentina/Buenos_Aires</option>
              <option>America/Sao_Paulo</option>
              <option>America/New_York</option>
              <option>Europe/Madrid</option>
            </select>
          </div>

          <div className={styles.card}>
            <div className={styles.cardLabel}>Integraciones</div>
            <p className={styles.cardSub}>Conectá tus redes para publicar directo.</p>
            <div className={styles.integrations}>
              {['TikTok', 'Instagram', 'YouTube'].map(s => (
                <button key={s} className={styles.integrationBtn}>{s}</button>
              ))}
            </div>
          </div>

          <button className={styles.btnDanger} onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      )}

      {tab === 'plan' && (
        <div className={styles.section}>
          <div className={styles.creditsCard}>
            <div className={styles.creditsMain}>
              <span className={styles.creditsNum}>{profile?.credits ?? 0}</span>
              <span className={styles.creditsLabel}>créditos disponibles</span>
            </div>
            <div className={styles.creditsPlan}>
              Plan actual: <strong>{profile?.plan?.toUpperCase() ?? 'FREE'}</strong>
            </div>
          </div>

          <div className={styles.plansGrid}>
            {PLANS.map(p => (
              <div key={p.key}
                className={`${styles.planCard} ${profile?.plan === p.key ? styles.planActive : ''}`}>
                {profile?.plan === p.key && <div className={styles.planBadge}>Plan actual</div>}
                <div className={styles.planName}>{p.label}</div>
                <div className={styles.planPrice}>{p.price}<span>/mes</span></div>
                <ul className={styles.planFeatures}>
                  {p.features.map(f => <li key={f}>✓ {f}</li>)}
                </ul>
                {profile?.plan !== p.key && (
                  <button className={styles.planBtn}>
                    {p.key === 'free' ? 'Bajar a Free' : `Suscribirme`}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'api' && (
        <div className={styles.section}>
          <div className={styles.card}>
            <div className={styles.cardLabel}>API Key</div>
            <p className={styles.cardSub}>Usá esta clave para integrar cliping.ia en tus propias apps.</p>
            <div className={styles.apiKeyRow}>
              <code className={styles.apiKey}>ck_••••••••••••••••••••••••••••••••</code>
              <button className={styles.btnSecondary}>Mostrar</button>
              <button className={styles.btnSecondary}>Rotar</button>
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardLabel}>Documentación</div>
            <p className={styles.cardSub}>La API permite generar videos de forma programática. Próximamente disponible.</p>
          </div>
        </div>
      )}
    </div>
  )
}
