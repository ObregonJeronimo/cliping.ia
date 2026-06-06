import { useState, useEffect } from 'react'
import { collection, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../contexts/AuthContext'
import styles from './MisCinematicas.module.css'

const API_URL = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:8000')

const THEME_LABEL = {
  'saas-explainer': 'SaaS', 'ocean-deep': 'Ocean', 'clinical-formal': 'Clínico',
  'organic-natural': 'Orgánico', 'sunset-warm': 'Sunset', 'crimson-bold': 'Crimson',
  'berry-glow': 'Berry', 'gold-lux': 'Gold', 'cyber-neon': 'Cyber', 'mono-ink': 'Mono',
}

export default function MisCinematicas() {
  const { user } = useAuth()
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => { if (user) load() }, [user])

  async function load() {
    setLoading(true)
    try {
      // Los videos los guarda /api/video/generate en la colección 'videos' con userId.
      const snap = await getDocs(query(collection(db, 'videos'), where('userId', '==', user.uid)))
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      list.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
      setVideos(list)
    } catch (e) {
      console.error('[MisCinematicas] error cargando:', e)
    }
    setLoading(false)
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar esta cinemática?')) return
    setDeletingId(id)
    try {
      await deleteDoc(doc(db, 'videos', id))
      setVideos(vs => vs.filter(v => v.id !== id))
    } catch (e) {
      console.error('[MisCinematicas] error eliminando:', e)
    }
    setDeletingId(null)
  }

  const srcOf = (v) => v.videoUrl || (v.localFile ? `${API_URL}/api/video/${v.localFile}` : null)
  const fmtDate = (s) => { try { return new Date(s).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }) } catch { return '' } }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Mis cinemáticas</h1>
        <p className={styles.sub}>Los videos que ya generaste, guardados acá.</p>
      </div>

      {loading ? (
        <div className={styles.state}><div className={styles.spinner} /> Cargando...</div>
      ) : videos.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>🎬</div>
          <div className={styles.emptyTitle}>Todavía no hiciste ninguna</div>
          <div className={styles.emptySub}>Generá tu primer video desde Home y va a aparecer acá.</div>
        </div>
      ) : (
        <div className={styles.grid}>
          {videos.map(v => {
            const src = srcOf(v)
            return (
              <div key={v.id} className={styles.card}>
                <div className={styles.videoWrap}>
                  {src
                    ? <video className={styles.video} src={src} controls preload="metadata" />
                    : <div className={styles.videoEmpty}>sin archivo</div>}
                </div>
                <div className={styles.meta}>
                  <div className={styles.metaTop}>
                    <span className={styles.brand}>{v.brand || v.url || 'Sin título'}</span>
                    {v.theme && <span className={styles.themeBadge}>{THEME_LABEL[v.theme] || v.theme}</span>}
                  </div>
                  <div className={styles.metaBottom}>
                    <span className={styles.date}>{fmtDate(v.createdAt)}</span>
                    <button
                      className={styles.delBtn}
                      onClick={() => handleDelete(v.id)}
                      disabled={deletingId === v.id}
                      title="Eliminar"
                    >
                      {deletingId === v.id ? '…' : 'Eliminar'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
