import { useEffect, useState } from 'react'
import { collection, getDocs, deleteDoc, doc, orderBy, query } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../contexts/AuthContext'
import styles from './Videos.module.css'

const API = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:8000')

export default function Videos() {
  const { user } = useAuth()
  const [videos, setVideos]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [debugData, setDebugData] = useState(null)
  const [debugModal, setDebugModal] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    if (!user) return
    load()
  }, [user])

  async function load() {
    setLoading(true)
    try {
      // Leer de la sub-colección users/{uid}/videos
      const ref  = collection(db, 'users', user.uid, 'videos')
      const q    = query(ref, orderBy('createdAt', 'desc'))
      const snap = await getDocs(q)
      setVideos(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (e) {
      console.error('[Videos] Error cargando:', e)
    }
    setLoading(false)
  }

  async function handleDelete(videoId) {
    if (!confirm('¿Eliminar este video?')) return
    setDeletingId(videoId)
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'videos', videoId))
      setVideos(vs => vs.filter(v => v.id !== videoId))
    } catch (e) {
      console.error('[Videos] Error eliminando:', e)
    }
    setDeletingId(null)
  }

  async function handleDebug() {
    try {
      const [last, anims] = await Promise.all([
        fetch(`${API}/api/debug/last`).then(r => r.json()),
        fetch(`${API}/api/debug/animations`).then(r => r.json()),
      ])
      setDebugData({ last, animations: anims })
      setDebugModal(true)
    } catch (e) {
      alert('No se pudo conectar al backend. ¿Está corriendo?')
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Mis videos</h1>
          <p className={styles.sub}>Todos los videos generados con tu cuenta.</p>
        </div>
        <button className={styles.debugBtn} onClick={handleDebug}>
          🔍 Logs debug
        </button>
      </div>

      {loading ? (
        <div className={styles.empty}>Cargando...</div>
      ) : videos.length === 0 ? (
        <div className={styles.emptyCard}>
          <div className={styles.emptyIcon}>▶</div>
          <p className={styles.emptyTitle}>Todavía no generaste ningún video</p>
          <p className={styles.emptySub}>Cuando generes tu primer video aparecerá acá.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {videos.map(video => (
            <div key={video.id} className={styles.videoCard}>
              <div className={styles.thumb}>
                {video.videoUrl
                  ? <video src={video.videoUrl} controls preload="metadata" />
                  : <div className={styles.thumbEmpty}>▶</div>
                }
                <span className={`${styles.status} ${video.renderOk ? styles.statusOk : styles.statusError}`}>
                  {video.renderOk ? 'OK' : 'Error render'}
                </span>
              </div>

              <div className={styles.cardInfo}>
                <p className={styles.cardSite}>{video.siteName || video.url}</p>
                <p className={styles.cardHeadline}>{video.headline}</p>
                <div className={styles.cardMeta}>
                  <span>{video.url}</span>
                  <span>{video.createdAt?.toDate?.()?.toLocaleDateString('es-AR') ?? '—'}</span>
                </div>
                {video.animations && (
                  <div className={styles.animTags}>
                    {Object.values(video.animations).filter(Boolean).slice(0, 4).map((a, i) => (
                      <span key={i} className={styles.animTag}>{a}</span>
                    ))}
                  </div>
                )}
              </div>

              <div className={styles.cardActions}>
                {video.videoUrl && (
                  <a href={video.videoUrl} target="_blank" rel="noreferrer" className={styles.dlBtn}>
                    ↓ Descargar
                  </a>
                )}
                <button
                  className={styles.deleteBtn}
                  onClick={() => handleDelete(video.id)}
                  disabled={deletingId === video.id}
                >
                  {deletingId === video.id ? '...' : '🗑 Eliminar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de debug */}
      {debugModal && debugData && (
        <div className={styles.modalOverlay} onClick={() => setDebugModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Logs de debug</h2>
              <button onClick={() => setDebugModal(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <h3>Último video generado</h3>
              <pre>{JSON.stringify(debugData.last, null, 2)}</pre>
              <h3>Última selección de animaciones</h3>
              <pre>{JSON.stringify(debugData.animations, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
