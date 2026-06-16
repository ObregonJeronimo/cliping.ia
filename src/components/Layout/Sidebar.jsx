import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import styles from './Sidebar.module.css'

// Nav real (las paginas "(lab)" eran POCs de desarrollo -> se ocultan del menu; sus rutas siguen
// existiendo en App.jsx por si se necesitan, pero no confunden al usuario. Lo nuevo vive en "Animaciones".
const NAV = [
  { to: '/studio',             icon: '⊞', label: 'Home' },
  { to: '/studio/animaciones', icon: '◆', label: 'Animaciones' },
  { to: '/studio/mis-animaciones', icon: '◇', label: 'Mis animaciones' },
  { to: '/studio/cinematicas', icon: '✦', label: 'Mis cinemáticas' },
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

      <button className={styles.newBtn} onClick={() => navigate('/studio')}>
        + Nuevo video
      </button>

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
