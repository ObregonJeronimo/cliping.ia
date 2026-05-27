import { useEffect, useState } from 'react'
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../contexts/AuthContext'
import styles from './Videos.module.css'

export default function Videos() {
  const { user } = useAuth()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    async function load() {
      try {
        const q = query(
          collection(db, 'jobs'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        )
        const snap = await getDocs(q)
        setJobs(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      } catch (e) {
        console.error(e)
      }
      setLoading(false)
    }
    load()
  }, [user])

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Mis videos</h1>
          <p className={styles.sub}>Todos los videos generados con tu cuenta.</p>
        </div>
      </div>

      {loading ? (
        <div className={styles.empty}>Cargando...</div>
      ) : jobs.length === 0 ? (
        <div className={styles.emptyCard}>
          <div className={styles.emptyIcon}>▶</div>
          <p className={styles.emptyTitle}>Todavía no generaste ningún video</p>
          <p className={styles.emptySub}>Cuando generes tu primer video aparecerá acá.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {jobs.map(job => (
            <div key={job.id} className={styles.videoCard}>
              <div className={styles.thumb}>
                {job.videoUrl
                  ? <video src={job.videoUrl} />
                  : <div className={styles.thumbEmpty}>▶</div>
                }
                <span className={`${styles.status} ${styles['status_' + job.status]}`}>
                  {job.status === 'done' ? 'Listo' : job.status === 'processing' ? 'Procesando' : 'Error'}
                </span>
              </div>
              <div className={styles.cardInfo}>
                <p className={styles.cardUrl}>{job.url}</p>
                <p className={styles.cardAction}>{job.action}</p>
                <div className={styles.cardMeta}>
                  <span>{job.format}</span>
                  <span>{job.createdAt?.toDate?.()?.toLocaleDateString('es-AR') ?? '—'}</span>
                </div>
              </div>
              {job.videoUrl && (
                <a href={job.videoUrl} target="_blank" rel="noreferrer" className={styles.dlBtn}>
                  ↓ Descargar
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
