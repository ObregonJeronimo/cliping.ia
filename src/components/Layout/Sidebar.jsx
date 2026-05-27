import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import styles from './Sidebar.module.css'

const NAV = [
  { to: '/',        icon: '⊞', label: 'Home' },
  { to: '/videos',  icon: '▶', label: 'Mis videos' },
  { to: '/settings',icon: '⚙', label: 'Configuración' },
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
        cliping<span>.ia</span>
      </div>

      <button className={styles.newBtn} onClick={() => navigate('/')}>
        + Nuevo video
      </button>

      <nav className={styles.nav}>
        {NAV.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
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
          {profile?.plan === 'free' && (
            <button className={styles.upgradeBtn} onClick={() => navigate('/settings')}>
              Upgrade
            </button>
          )}
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
