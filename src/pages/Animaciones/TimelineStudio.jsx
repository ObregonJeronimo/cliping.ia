import { useRef, useState, useEffect } from 'react'
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../contexts/AuthContext'
import styles from '../Cinematicas/Cinematicas.module.css'

const API_URL = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:8000')
const HEADERS = { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }
const STEP_LABELS = {
  queued: 'En cola…', script: 'Analizando el sitio y escribiendo el guion…',
  build: 'Armando la composición…', render: 'Renderizando (esto tarda)…',
  upload: 'Subiendo a la nube…', export: 'Listo',
}
const FORMATOS = [
  { key: 'vertical', label: 'Vertical 9:16', on: true },
  { key: 'square', label: 'Cuadrado 1:1', on: false },
  { key: 'wide', label: 'Horizontal 16:9', on: false },
]
const PROPOSITOS = [
  { key: 'marketing', label: '📣 Marketing' },
  { key: 'conversion', label: '🎯 Conversión' },
  { key: 'branding', label: '✨ Branding' },
  { key: 'awareness', label: '👋 Awareness' },
]

function sceneSummary(s) {
  if (!s) return ''
  if (s.type === 'paintTitle') return [s.title, (s.subtitles || []).join(' / ')].filter(Boolean).join(' · ')
  if (s.type === 'statement') return s.text || ''
  if (s.type === 'checklist') return [(s.title || ''), (s.items || []).join(', ')].filter(Boolean).join(': ')
  if (s.type === 'bigStat') return [(s.prefix || '') + s.value + (s.suffix || ''), s.label].filter(Boolean).join(' · ')
  if (s.type === 'outro') return s.cta || ''
  return ''
}

/**
 * Animaciones — MISMA interfaz que Home (Cinemáticas), pero para el motor de animación Canvas.
 * Pegás un link + (opcional) qué contar y la IA real (Sonnet director + Opus crítico) escribe el
 * guion desde el sitio (mismo análisis/rotación que cinematicas). El video lo renderiza Remotion
 * (tu PC) → Cloudinary, y queda guardado en "Mis animaciones". Una generación = un video.
 */
export default function TimelineStudio() {
  const { user } = useAuth()
  const videoRef = useRef(null)
  const pollRef = useRef(null)

  const [mode, setMode] = useState('simple')
  const [url, setUrl] = useState('')
  const [desarrollo, setDesarrollo] = useState('')
  const [proposito, setProposito] = useState('marketing')
  const [formato, setFormato] = useState('vertical')
  const [gen, setGen] = useState(null)   // { status, step, progress, videoUrl, error, timeline }
  const [cached, setCached] = useState([])        // páginas cacheadas (ADN guardado por URL)
  const [cacheLoading, setCacheLoading] = useState(true)
  const [cacheDel, setCacheDel] = useState(null)  // id que se está borrando

  const generating = gen?.status === 'running'
  const canGenerate = url.trim() && !generating
  const pct = Math.max(4, gen?.progress || 0)
  const showResult = !!gen
  const planScenes = gen?.timeline?.scenes || []

  function reset() { clearInterval(pollRef.current); setGen(null) }

  // Caché de marcas: el análisis (ADN) de cada URL queda guardado en users/{uid}/brand_cache
  // (lo escribe el backend al generar). Acá lo listamos y borramos client-side, como Mis cinemáticas.
  useEffect(() => { if (user) loadCache() }, [user])
  async function loadCache() {
    if (!user?.uid) { setCacheLoading(false); return }
    setCacheLoading(true)
    try {
      const snap = await getDocs(collection(db, 'users', user.uid, 'brand_cache'))
      const list = snap.docs.map(d => {
        const x = d.data() || {}
        return { id: d.id, accent: x.dna?.accent || '', summary: x.dna?.summary || '', ts: x.ts || 0 }
      })
      list.sort((a, b) => (b.ts || 0) - (a.ts || 0))
      setCached(list)
    } catch (e) { console.error('[Animaciones] cache load:', e) }
    setCacheLoading(false)
  }
  async function delCacheOne(id) {
    if (!user?.uid) return
    setCacheDel(id)
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'brand_cache', id))
      setCached(cs => cs.filter(c => c.id !== id))
    } catch (e) { console.error('[Animaciones] cache delete:', e) }
    setCacheDel(null)
  }
  async function clearAllCache() {
    if (!user?.uid || cached.length === 0) return
    if (!confirm(`¿Borrar las ${cached.length} páginas cacheadas?`)) return
    const ids = cached.map(c => c.id)
    setCached([])
    for (const id of ids) {
      try { await deleteDoc(doc(db, 'users', user.uid, 'brand_cache', id)) } catch { /* sigue */ }
    }
  }

  async function generate() {
    const u = url.trim()
    if (!u || generating) return
    setGen({ status: 'running', step: 'script', progress: 0, videoUrl: null, error: null, timeline: null, url: u })
    try {
      const r = await fetch(`${API_URL}/api/timeline/generate`, {
        method: 'POST', headers: HEADERS,
        body: JSON.stringify({ userId: user?.uid || '', url: u, desarrollo, proposito, formato: 'vertical', idioma: '' }),
      })
      const d = await r.json()
      if (d.error || !d.job_id) { setGen(g => ({ ...g, status: 'error', error: d.error || 'No se pudo iniciar' })); return }
      clearInterval(pollRef.current)
      pollRef.current = setInterval(async () => {
        try {
          const jr = await fetch(`${API_URL}/api/jobs/${d.job_id}`, { headers: HEADERS })
          const j = await jr.json()
          setGen(g => g ? ({ ...g, step: j.step || j.status, progress: j.progress || 0, timeline: j.timeline || g.timeline }) : g)
          if (j.status === 'done') {
            clearInterval(pollRef.current)
            setGen(g => ({ ...g, status: 'done', progress: 100, timeline: j.timeline || g.timeline, videoUrl: j.cloudinaryUrl || (j.videoFilename ? `${API_URL}/api/video/${j.videoFilename}` : null) }))
            loadCache()
          } else if (j.status === 'error') {
            clearInterval(pollRef.current)
            setGen(g => ({ ...g, status: 'error', error: j.error || 'Error en la generación' }))
            loadCache()
          }
        } catch { /* reintenta */ }
      }, 2500)
    } catch (e) { setGen(g => ({ ...g, status: 'error', error: e.message })) }
  }

  return (
    <div className={styles.body}>
      <div className={styles.left}>
        <div className={styles.modeToggle}>
          <button className={`${styles.modeBtn} ${mode === 'simple' ? styles.modeBtnActive : ''}`} onClick={() => setMode('simple')} disabled={generating}>Simple</button>
          <button className={`${styles.modeBtn} ${mode === 'avanzado' ? styles.modeBtnActive : ''}`} onClick={() => setMode('avanzado')} disabled={generating}>Avanzado</button>
        </div>

        <div className={styles.cineSection}>
          <div className={styles.cineSectionLabel}>URL del sitio</div>
          <input className={styles.nameInput} placeholder="https://tusitio.com" value={url}
            onChange={e => setUrl(e.target.value)} disabled={generating} />
        </div>

        <div className={styles.cineSection}>
          <div className={styles.cineSectionLabel}>
            {mode === 'simple' ? 'Qué querés contar' : 'Desarrollo'} <span className={styles.desarrolloOpcional}>(opcional)</span>
          </div>
          <textarea className={styles.textarea} rows={3}
            placeholder={mode === 'simple' ? 'Dejalo vacío y la IA decide todo, o tirá una idea…' : 'Ángulo, qué destacar, tono…'}
            value={desarrollo} onChange={e => setDesarrollo(e.target.value)} disabled={generating} />
        </div>

        {mode === 'avanzado' && (
          <>
            <div className={styles.cineSection}>
              <div className={styles.cineSectionLabel}>Propósito</div>
              <div className={styles.propGrid}>
                {PROPOSITOS.map(p => (
                  <button key={p.key} className={`${styles.propBtn} ${proposito === p.key ? styles.propBtnActive : ''}`}
                    onClick={() => setProposito(p.key)} disabled={generating}>{p.label}</button>
                ))}
              </div>
            </div>
            <div className={styles.cineSection}>
              <div className={styles.cineSectionLabel}>Formato</div>
              <div className={styles.propGrid}>
                {FORMATOS.map(f => (
                  <button key={f.key} className={`${styles.propBtn} ${formato === f.key ? styles.propBtnActive : ''}`}
                    disabled={!f.on || generating} title={f.on ? '' : 'Próximamente'}
                    onClick={() => f.on && setFormato(f.key)}>{f.label}{!f.on ? ' ·' : ''}</button>
                ))}
              </div>
            </div>
          </>
        )}

        <button
          className={`${styles.forgeBtn} ${generating ? styles.forgeBtnRunning : ''} ${!canGenerate ? styles.forgeBtnDisabled : ''}`}
          onClick={generate} disabled={!canGenerate}>
          {generating ? <><span className={styles.spinner} />Generando animación…</>
            : !url.trim() ? 'Ingresá una URL' : '✨ Generar animación'}
        </button>

        <div className={styles.cineSection} style={{ marginTop: 4 }}>
          <div className={styles.cineSectionLabel}>
            <span>Páginas cacheadas{cached.length > 0 ? ` · ${cached.length}` : ''}</span>
            {cached.length > 0 && (
              <button onClick={clearAllCache}
                style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer', padding: 0 }}>
                Borrar todo
              </button>
            )}
          </div>
          {cacheLoading ? (
            <div className={styles.selEmpty}>cargando…</div>
          ) : cached.length === 0 ? (
            <div className={styles.selEmpty}>Cuando generes, la página queda cacheada acá (no se re-analiza la próxima vez).</div>
          ) : (
            <div className={styles.selList}>
              {cached.map(c => (
                <div key={c.id} className={styles.selItem}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', flexShrink: 0, background: c.accent || '#ddd' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.id}</div>
                    {c.summary && <div style={{ fontSize: 10, color: '#999', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.summary}</div>}
                  </div>
                  <button className={styles.delBtn} onClick={() => delCacheOne(c.id)} disabled={cacheDel === c.id}
                    title="Borrar del caché" aria-label="Borrar del caché">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={styles.right}>
        {showResult ? (
          <div className={styles.cineResult}>
            <div className={styles.cineResultHeader}>
              <div className={styles.previewName}>
                {gen.videoUrl ? 'Animación lista' : gen.status === 'error' ? 'No se pudo generar' : 'Generando tu animación…'}
              </div>
              <div className={styles.previewMeta}>{gen.url || 'sin URL'} · Canvas · {proposito}</div>
            </div>

            {generating && (
              <div className={styles.log}>
                <div className={`${styles.logLine} ${styles.logActive}`}>
                  <div className={styles.progressBar}><div className={styles.progressFill} style={{ width: `${pct}%` }} /></div>
                  <span className={styles.logMsg}>{STEP_LABELS[gen.step] || 'Procesando…'}</span>
                </div>
              </div>
            )}

            {gen.status === 'error' && <div className={styles.cineNote}>⚠️ {gen.error}</div>}

            {gen.videoUrl && (
              <div className={styles.playerWrap}>
                <video ref={videoRef} src={gen.videoUrl} controls autoPlay loop playsInline className={styles.video} />
              </div>
            )}

            {planScenes.length > 0 && (
              <div className={styles.cinePlan}>
                {gen.timeline?.brand && (
                  <div className={styles.cinePlanItem}>
                    <div className={styles.cinePlanOrder}>🎬</div>
                    <div className={styles.cinePlanInfo}>
                      <div className={styles.cinePlanName}>{gen.timeline.brand}</div>
                      <div className={styles.cinePlanProp}>guion de la IA · {planScenes.length} escenas</div>
                    </div>
                  </div>
                )}
                {planScenes.map((s, i) => (
                  <div key={i} className={styles.cinePlanItem}>
                    <div className={styles.cinePlanOrder}>{i + 1}</div>
                    <div className={styles.cinePlanInfo}>
                      <div className={styles.cinePlanName}>{s.type}</div>
                      <div className={styles.cinePlanProp}>{sceneSummary(s)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {(gen.videoUrl || gen.status === 'error') && (
              <button className={styles.forgeBtn} style={{ marginTop: 14 }} onClick={reset}>← Generar otra</button>
            )}
          </div>
        ) : (
          <div className={styles.cineLibrary}>
            <div className={styles.empty}>
              <div style={{ fontSize: 36 }}>🎬</div>
              <div className={styles.emptyTitle}>Tu animación aparece acá</div>
              <div className={styles.emptySub}>Pegá la URL de tu sitio y dale generar — la IA escribe el guion y el motor anima.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
