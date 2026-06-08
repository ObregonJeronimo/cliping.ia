import { useState, useEffect } from 'react'
import { collection, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore'
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
  const [qy, setQy] = useState('')
  const [copiedId, setCopiedId] = useState(null)

  useEffect(() => { if (user) load() }, [user])

  async function load() {
    setLoading(true)
    try {
      // Los videos los guarda /api/video/generate en users/{uid}/videos.
      const snap = await getDocs(collection(db, 'users', user.uid, 'videos'))
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      list.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
      setVideos(list)
    } catch (e) {
      console.error('[MisCinematicas] error cargando:', e)
    }
    setLoading(false)
  }

  async function handleDelete(id) {
    const v = videos.find(x => x.id === id)
    if (!confirm('¿Eliminar esta cinemática?')) return
    setDeletingId(id)
    try {
      // Borrar el asset de Cloudinary (best-effort: si el backend está caído, igual
      // se quita de la galería). publicId del doc, o derivado del id para los viejos.
      const publicId = v?.publicId || (v?.id ? `cinematicas/video_${String(v.id).slice(0, 8)}` : '')
      if (publicId) {
        try {
          await fetch(`${API_URL}/api/video/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
            body: JSON.stringify({ publicId }),
          })
        } catch { /* backend offline: se borra igual de la galería */ }
      }
      await deleteDoc(doc(db, 'users', user.uid, 'videos', id))
      setVideos(vs => vs.filter(v => v.id !== id))
    } catch (e) {
      console.error('[MisCinematicas] error eliminando:', e)
    }
    setDeletingId(null)
  }

  // Rating del video (loop de feedback): 1 = me gustó, -1 = no, 0 = sin puntuar (toggle).
  // Se guarda junto a la "receta" del video -> a futuro sesga la rotación hacia lo que funciona.
  const rateVideo = async (v, value) => {
    const next = v.rating === value ? 0 : value
    try {
      await updateDoc(doc(db, 'users', user.uid, 'videos', v.id), { rating: next })
      setVideos(vs => vs.map(x => x.id === v.id ? { ...x, rating: next } : x))
    } catch (e) {
      console.error('[MisCinematicas] error puntuando:', e)
    }
  }

  const srcOf = (v) => v.videoUrl || (v.localFile ? `${API_URL}/api/video/${v.localFile}` : null)
  const fmtDate = (s) => {
    const d = new Date(s)
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
  }
  // Cloudinary: fl_attachment fuerza la descarga ("Guardar como").
  const downloadUrl = (v) => v.videoUrl
    ? v.videoUrl.replace('/upload/', '/upload/fl_attachment/')
    : srcOf(v)

  async function copyLink(v) {
    const link = v.videoUrl || srcOf(v)
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setCopiedId(v.id)
      setTimeout(() => setCopiedId(c => (c === v.id ? null : c)), 1500)
    } catch { /* no-op */ }
  }

  const q = qy.trim().toLowerCase()
  const filtered = q
    ? videos.filter(v => `${v.brand || ''} ${v.url || ''}`.toLowerCase().includes(q))
    : videos

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Mis cinemáticas</h1>
          <p className={styles.sub}>Los videos que ya generaste, guardados acá.</p>
        </div>
        {videos.length > 0 && (
          <input
            className={styles.search}
            type="text"
            placeholder="Buscar por marca o URL…"
            value={qy}
            onChange={e => setQy(e.target.value)}
          />
        )}
      </div>

      {loading ? (
        <div className={styles.state}><div className={styles.spinner} /> Cargando...</div>
      ) : videos.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>🎬</div>
          <div className={styles.emptyTitle}>Todavía no hiciste ninguna</div>
          <div className={styles.emptySub}>Generá tu primer video desde Home y va a aparecer acá.</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>🔍</div>
          <div className={styles.emptyTitle}>Nada coincide con "{qy}"</div>
          <div className={styles.emptySub}>Probá con otra marca o URL.</div>
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map(v => {
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
                  {fmtDate(v.createdAt) && <div className={styles.date}>{fmtDate(v.createdAt)}</div>}
                  <div className={styles.rateRow}>
                    <span className={styles.rateLabel}>¿Te sirvió?</span>
                    <button className={`${styles.rateBtn} ${v.rating === 1 ? styles.rateUp : ''}`}
                      onClick={() => rateVideo(v, 1)} title="Me gustó" aria-label="Me gustó">👍</button>
                    <button className={`${styles.rateBtn} ${v.rating === -1 ? styles.rateDown : ''}`}
                      onClick={() => rateVideo(v, -1)} title="No me gustó" aria-label="No me gustó">👎</button>
                  </div>
                  <div className={styles.actions}>
                    {src && (
                      <a className={styles.actBtn} href={downloadUrl(v)} download target="_blank" rel="noreferrer">Descargar</a>
                    )}
                    {(v.videoUrl || src) && (
                      <button className={styles.actBtn} onClick={() => copyLink(v)}>
                        {copiedId === v.id ? '✓ Copiado' : 'Copiar link'}
                      </button>
                    )}
                    <button
                      className={`${styles.actBtn} ${styles.del}`}
                      onClick={() => handleDelete(v.id)}
                      disabled={deletingId === v.id}
                    >
                      {deletingId === v.id
                        ? <><span className={styles.btnSpinner} />Eliminando…</>
                        : 'Eliminar'}
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
