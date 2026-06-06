import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { VideoJobProvider } from '../../contexts/VideoJobContext'
import styles from './AppLayout.module.css'

export default function AppLayout() {
  return (
    <div className={styles.layout}>
      <Sidebar />
      <main className={styles.main}>
        <VideoJobProvider>
          <Outlet />
        </VideoJobProvider>
      </main>
    </div>
  )
}
