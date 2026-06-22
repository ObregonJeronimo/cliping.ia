import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import styles from './Sidebar.module.css'

// Dos estudios urvid: "urvid IA" (simple, index de /studio) y "urvid IA advanced" (wizard, /studio/craft).
// El motor viejo "Animaciones" fue eliminado por completo.
const NAV = [
  { to: '/studio', icon: '●', label: 'urvid IA' },
  { to: '/studio/craft', icon: '✦', label: 'urvid IA advanced' },
]

export default function Sidebar() {
  const { user, profile, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <span className={styles.logoMark}>Urvid</span>
        <span className={styles.logoDot} />
      </div>

      <nav className={styles.nav}>
        {NAV.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/studio'}
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.navActive : ''}`
            }
          >
            <span className={styles.navIcon}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className={styles.bottom}>
        <div className={styles.credits}>
          <span className={styles.creditsIcon}>⚡</span>
          <span><strong>{profile?.credits ?? 0}</strong> créditos</span>
        </div>

        <div className={styles.userRow}>
          {user?.photoURL
            ? <img src={user.photoURL} alt="" className={styles.avatar} referrerPolicy="no-referrer" />
            : <div className={styles.avatarFallback}>{user?.email?.[0]?.toUpperCase()}</div>
          }
          <div className={styles.userInfo}>
            <div className={styles.userName}>{user?.displayName || 'Usuario'}</div>
            <div className={styles.userEmail}>{user?.email}</div>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout} title="Cerrar sesión">↪</button>
        </div>
      </div>
    </aside>
  )
}
