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
// ESTILO visual del video (lo elige el usuario). Orden seguro -> audaz; debe coincidir con backend/style_catalog.py.
// '' = Auto: el sistema recomienda un estilo segun el rubro del link.
const STYLES = [
  { id: '', label: '✨ Auto', vibe: 'recomendado por rubro' },
  { id: 'blueprint', label: 'Blueprint', vibe: 'plano técnico, serio' },
  { id: 'swiss', label: 'Swiss', vibe: 'grilla clara, ordenado' },
  { id: 'platinum', label: 'Platinum', vibe: 'spotlight premium' },
  { id: 'obsidian', label: 'Obsidian', vibe: 'lujo oscuro' },
  { id: 'meshflow', label: 'Mesh Flow', vibe: 'fluido moderno' },
  { id: 'aurora', label: 'Aurora', vibe: 'soñador, calmo' },
  { id: 'handmade', label: 'Hecho a mano', vibe: 'cálido, cercano' },
  { id: 'typographic', label: 'Tipográfico', vibe: 'tipografía gigante' },
  { id: 'riso', label: 'Risograph', vibe: 'tramado táctil' },
  { id: 'retro70s', label: 'Retro 70s', vibe: 'sunburst nostálgico' },
  { id: 'brutalist', label: 'Brutalist', vibe: 'crudo, audaz' },
  { id: 'sport', label: 'Sport', vibe: 'velocidad, urgencia' },
  { id: 'editorial', label: 'Editorial', vibe: 'revista premium, serif' },
  { id: 'corporate', label: 'Corporate', vibe: 'profesional B2B, claro' },
  { id: 'broadcast', label: 'Breaking News', vibe: 'urgente, oferta' },
  { id: 'organic', label: 'Organic', vibe: 'natural, calmo, wellness' },
  { id: 'cyber', label: 'Cyber', vibe: 'tech futurista, glitch' },
  { id: 'surveillanceHUD', label: 'HUD / Data', vibe: 'dashboard, datos' },
  { id: 'y2k', label: 'Y2K Chrome', vibe: 'retro 2000s, brillante' },
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
  const [styleId, setStyleId] = useState('')   // ESTILO visual elegido ('' = recomendado por rubro). Ver STYLES.
  const [idioma, setIdioma] = useState('es')   // IDIOMA del anuncio (es/en). Default español SIEMPRE (no el de la pagina).
  const [gen, setGen] = useState(null)   // { status, step, progress, videoUrl, error, timeline }
  const [cached, setCached] = useState([])        // páginas cacheadas (ADN guardado por URL)
  const [cacheLoading, setCacheLoading] = useState(true)
  const [cacheDel, setCacheDel] = useState(null)  // id que se está borrando
  const [batchUrl, setBatchUrl] = useState('')
  const [batch, setBatch] = useState(null)        // estado de la prueba de 5
  const [logCopied, setLogCopied] = useState(false)
  const batchPoll = useRef(null)

  const generating = gen?.status === 'running'
  const canGenerate = url.trim() && !generating
  const pct = Math.max(4, gen?.progress || 0)
  const showResult = !!gen
  const planScenes = gen?.timeline?.scenes || []
  const batchRunning = batch?.status === 'running'
  const BATCH_STEPS = { queued: 'En cola…', capture: 'Analizando el sitio…', script: 'Escribiendo el guion…', render: 'Renderizando…', vision: 'Analizando el video con visión…', export: 'Listo', done: 'Listo' }

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

  // Prueba de 5: arranca el batch en el backend y poolea el estado (cada video + su análisis).
  async function startBatch() {
    const u = (batchUrl.trim() || url.trim())
    if (!u || batchRunning) return
    setBatch({ status: 'running', current: 0, total: 5, step: 'queued', progress: 0, videos: [] })
    try {
      const r = await fetch(`${API_URL}/api/timeline/batch`, {
        method: 'POST', headers: HEADERS,
        body: JSON.stringify({ userId: user?.uid || '', url: u, desarrollo, proposito, formato: 'vertical', idioma, n: 5 }),
      })
      const d = await r.json()
      if (d.error || !d.job_id) { setBatch(b => ({ ...b, status: 'error', error: d.error || 'No se pudo iniciar' })); return }
      clearInterval(batchPoll.current)
      batchPoll.current = setInterval(async () => {
        try {
          const jr = await fetch(`${API_URL}/api/jobs/${d.job_id}`, { headers: HEADERS })
          const j = await jr.json()
          if (!j.error) setBatch(j)
          if (j.status === 'done' || j.status === 'error') { clearInterval(batchPoll.current); loadCache() }
        } catch { /* reintenta */ }
      }, 3000)
    } catch (e) { setBatch(b => ({ ...b, status: 'error', error: e.message })) }
  }

  function buildBatchLog() {
    const vids = batch?.videos || []
    const head = `# Prueba de ${batch?.total || vids.length} videos — ${(batchUrl.trim() || url.trim())}\n`
      + `Modelo de crítica: ${vids.find(v => v.critModel)?.critModel || 'sonnet'}\n`
      + `Costo total: ${batch?.cost || '-'}\n\n`
    const body = vids.map(v => {
      const sc = v.scores
      const ejes = sc?.ejes ? Object.entries(sc.ejes).map(([k, val]) => `${k}: ${val}`).join(' · ') : ''
      return `---\n\n## Video ${v.index}${v.brand ? ' — ' + v.brand : ''}\n`
        + (v.sceneSummary ? `Escenas: ${v.sceneSummary}\n` : '')
        + (sc?.puntaje != null ? `Puntaje global: ${sc.puntaje}/10\n` : '')
        + (ejes ? `Ejes: ${ejes}\n` : '')
        + (sc?.veredicto ? `Veredicto: ${sc.veredicto}\n` : '')
        + `\n${v.analysis || (v.error ? '(error: ' + v.error + ')' : '(sin análisis)')}\n`
    }).join('\n')
    return head + body
  }
  function copyBatchLog() {
    navigator.clipboard.writeText(buildBatchLog())
      .then(() => { setLogCopied(true); setTimeout(() => setLogCopied(false), 1500) })
      .catch(() => {})
  }
  function downloadBatchLog() {
    const blob = new Blob([buildBatchLog()], { type: 'text/markdown' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `prueba-5-${Date.now()}.md`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  async function generate() {
    const u = url.trim()
    if (!u || generating) return
    setGen({ status: 'running', step: 'script', progress: 0, videoUrl: null, error: null, timeline: null, url: u })
    try {
      const r = await fetch(`${API_URL}/api/timeline/generate`, {
        method: 'POST', headers: HEADERS,
        body: JSON.stringify({ userId: user?.uid || '', url: u, desarrollo, proposito, formato: 'vertical', idioma, styleId }),
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
    <>
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
              <div className={styles.cineSectionLabel}>Estilo <span style={{ opacity: 0.5, fontWeight: 400 }}>· cómo se ve el video</span></div>
              <div className={styles.propGrid}>
                {STYLES.map(s => (
                  <button key={s.id || 'auto'} className={`${styles.propBtn} ${styleId === s.id ? styles.propBtnActive : ''}`}
                    onClick={() => setStyleId(s.id)} disabled={generating} title={s.vibe}>{s.label}</button>
                ))}
              </div>
            </div>
            <div className={styles.cineSection}>
              <div className={styles.cineSectionLabel}>Idioma del anuncio <span style={{ opacity: 0.5, fontWeight: 400 }}>· no depende del idioma de la página</span></div>
              <div className={styles.propGrid}>
                {[{ k: 'es', label: '🇦🇷 Español' }, { k: 'en', label: '🇺🇸 English' }].map(l => (
                  <button key={l.k} className={`${styles.propBtn} ${idioma === l.k ? styles.propBtnActive : ''}`}
                    onClick={() => setIdioma(l.k)} disabled={generating}>{l.label}</button>
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

    {/* ── Laboratorio de auto-mejora: prueba de 5 con crítica de visión ── */}
    <div style={{ marginTop: 30, paddingTop: 22, borderTop: '1px solid #ececec' }}>
      <div className={styles.cineSectionLabel} style={{ marginBottom: 8 }}>
        <span>🧪 Laboratorio · prueba de 5 (crítica con visión)</span>
      </div>
      <p style={{ fontSize: 12, color: '#888', margin: '0 0 14px', maxWidth: 660, lineHeight: 1.5 }}>
        Genera 5 videos seguidos del mismo sitio. Después de cada uno, una IA mira los fotogramas y escribe
        un análisis profundo (marketing + diseño) antes de pasar al siguiente. Al final tenés el log de los
        5 para copiar o bajar en .md. Tu PC queda ocupada ~15-25 min.
      </p>

      <div style={{ display: 'flex', gap: 8, maxWidth: 660, marginBottom: 16 }}>
        <input className={styles.nameInput} style={{ flex: 1 }} disabled={batchRunning}
          placeholder={url.trim() ? `usar ${url.trim()}` : 'https://tusitio.com'}
          value={batchUrl} onChange={e => setBatchUrl(e.target.value)} />
        <button className={`${styles.forgeBtn} ${batchRunning ? styles.forgeBtnRunning : ''}`}
          style={{ width: 'auto', whiteSpace: 'nowrap', flexShrink: 0 }}
          onClick={startBatch} disabled={batchRunning || (!batchUrl.trim() && !url.trim())}>
          {batchRunning ? <><span className={styles.spinner} />Trabajando…</> : '▶ Iniciar prueba de 5'}
        </button>
      </div>

      {batch && (
        <div>
          {batchRunning && (
            <div className={styles.log} style={{ marginBottom: 16 }}>
              <div className={`${styles.logLine} ${styles.logActive}`}>
                <div className={styles.progressBar}><div className={styles.progressFill} style={{ width: `${Math.max(4, batch.progress || 0)}%` }} /></div>
                <span className={styles.logMsg}>Video {batch.current || 0} de {batch.total} — {BATCH_STEPS[batch.step] || 'Procesando…'}</span>
              </div>
            </div>
          )}
          {batch.status === 'error' && <div className={styles.cineNote}>⚠️ {batch.error}</div>}

          <div style={{ display: 'grid', gap: 16 }}>
            {(batch.videos || []).map(v => (
              <div key={v.index} style={{ border: '1px solid #ececec', borderRadius: 12, padding: 14, display: 'grid', gridTemplateColumns: '190px 1fr', gap: 16, alignItems: 'start' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Video {v.index}{v.brand ? ` · ${v.brand}` : ''}</div>
                  {v.videoUrl
                    ? <video src={v.videoUrl.startsWith('http') ? v.videoUrl : `${API_URL}${v.videoUrl}`} controls loop playsInline style={{ width: '100%', borderRadius: 8, background: '#000', aspectRatio: '9 / 16' }} />
                    : <div style={{ aspectRatio: '9 / 16', borderRadius: 8, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#bbb', fontSize: 12 }}>
                        {v.status === 'error' ? 'falló' : <><span className={styles.spinner} />{BATCH_STEPS[v.step] || '…'}</>}
                      </div>}
                  {v.scores?.puntaje != null && <div style={{ marginTop: 8, fontSize: 13, fontWeight: 700 }}>Puntaje: {v.scores.puntaje}/10</div>}
                  {v.scores?.ejes && (
                    <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {Object.entries(v.scores.ejes).map(([k, val]) => (
                        <span key={k} style={{ fontSize: 10, background: '#f3f3f3', borderRadius: 5, padding: '2px 6px', color: '#555' }}>{k} {val}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ minWidth: 0 }}>
                  {v.scores?.veredicto && <div style={{ fontSize: 13, fontStyle: 'italic', color: '#444', marginBottom: 8 }}>“{v.scores.veredicto}”</div>}
                  {v.analysis
                    ? <div style={{ fontSize: 12.5, lineHeight: 1.55, color: '#333', whiteSpace: 'pre-wrap', maxHeight: 380, overflowY: 'auto', background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 8, padding: 12 }}>{v.analysis}</div>
                    : v.status === 'error'
                      ? <div className={styles.cineNote}>⚠️ {v.error}</div>
                      : <div style={{ fontSize: 12, color: '#aaa' }}>{v.status === 'running' ? `${BATCH_STEPS[v.step] || 'trabajando'}…` : 'en cola…'}</div>}
                </div>
              </div>
            ))}
          </div>

          {(batch.videos || []).some(v => v.analysis) && (
            <div style={{ marginTop: 18 }}>
              <div className={styles.cineSectionLabel} style={{ marginBottom: 8 }}>
                <span>Log completo de los {batch.total}{batch.cost ? ` · costo ${batch.cost}` : ''}</span>
                <span style={{ display: 'flex', gap: 10 }}>
                  <button onClick={copyBatchLog} style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer', padding: 0 }}>{logCopied ? '✓ copiado' : 'Copiar'}</button>
                  <button onClick={downloadBatchLog} style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer', padding: 0 }}>Descargar .md</button>
                </span>
              </div>
              <div style={{ fontSize: 11.5, lineHeight: 1.5, color: '#444', whiteSpace: 'pre-wrap', maxHeight: 320, overflowY: 'auto', background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 8, padding: 12, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{buildBatchLog()}</div>
            </div>
          )}
        </div>
      )}
    </div>
    </>
  )
}
