import { useState } from 'react'
import styles from './Cinematicas.module.css'
import Animaciones from './Animaciones'
import Cine from './Cine'
import VideoStudio from './VideoStudio'

export default function Cinematicas() {
  const [tab, setTab] = useState('video')

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>🎬 Cinemáticas</h1>
          <p className={styles.sub}>Videos de marketing generados por IA — pegá una URL y listo, o construí tu biblioteca de animaciones.</p>
        </div>
        <div className={styles.tabs}>
          <button
            className={`${styles.tabBtn} ${tab === 'video' ? styles.tabBtnActive : ''}`}
            onClick={() => setTab('video')}>
            🎬 Video
          </button>
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
        {tab === 'video' ? <VideoStudio /> : tab === 'animaciones' ? <Animaciones /> : <Cine />}
      </div>
    </div>
  )
}
