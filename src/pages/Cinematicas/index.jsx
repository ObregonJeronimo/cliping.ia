import { useState } from 'react'
import styles from './Cinematicas.module.css'
import Animaciones from './Animaciones'
import Cine from './Cine'

export default function Cinematicas() {
  const [tab, setTab] = useState('animaciones')

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>🎬 Cinemáticas</h1>
          <p className={styles.sub}>Animaciones generadas por IA — construí tu biblioteca y creá cinematografías completas.</p>
        </div>
        <div className={styles.tabs}>
          <button
            className={`${styles.tabBtn} ${tab === 'animaciones' ? styles.tabBtnActive : ''}`}
            onClick={() => setTab('animaciones')}>
            ✦ Animaciones
          </button>
          <button
            className={`${styles.tabBtn} ${tab === 'cine' ? styles.tabBtnActive : ''}`}
            onClick={() => setTab('cine')}>
            🎥 Cine
          </button>
        </div>
      </div>

      <div className={styles.tabContent}>
        {tab === 'animaciones' ? <Animaciones /> : <Cine />}
      </div>
    </div>
  )
}
