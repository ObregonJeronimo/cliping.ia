import { useEffect, useMemo, useRef, useState } from 'react'
import { doc, setDoc } from 'firebase/firestore'
import { makeVideo, drawFrame } from '../../urvid/index.js'
import { useAuth } from '../../contexts/AuthContext'
import { db } from '../../lib/firebase'
import styles from './UrvidCraftStudio.module.css'

// Urvid CRAFT — arma el video PASO A PASO. El usuario pega un link, lo analizamos (perception) y va eligiendo de cada
// biblioteca (su "receta") con previews por opcion. Identidad visual = la LANDING (papel claro), NO el estudio oscuro.
// FASE A (esqueleto end-to-end): framework de pasos + Analisis + Revision/Crear con receta AUTO + mini-player en vivo.
// FASE B insertara los pasos de libreria (estilo/fondo/escenas/cierre) con previews; FASE C el "avanzado" + pulido.
// El motor corre en el navegador (client-side): el mini-player y los previews NO tocan el backend -> cero costo en la nube.

const RUBROS = ['default', 'tech', 'finanzas', 'moda', 'gastronomia', 'educacion', 'salud', 'fitness', 'inmobiliaria', 'belleza']
const RUBRO_LBL = { default: 'General', tech: 'Tech', finanzas: 'Finanzas', moda: 'Moda', gastronomia: 'Gastronomia', educacion: 'Educacion', salud: 'Salud', fitness: 'Fitness', inmobiliaria: 'Inmobiliaria', belleza: 'Belleza' }
// Backend (perception): mismo patron que el estudio. En dev pega a localhost:8000 (start.bat); en prod, mismo origen.
const API_URL = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:8000')
const HEADERS = { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }

const BRIEF0 = { brand: '', rubro: 'default', tone: 'dark', brandColor: '#5b8cff', format: '9:16', duration: 'medio', tagline: '', claim: '', cta: '', bullets: [], stats: [], proof: '' }

export default function UrvidCraftStudio() {
  const { user } = useAuth()
  const [brief, setBrief] = useState(BRIEF0)
  const [recipe, setRecipe] = useState({})        // receta PARCIAL (keepRecipe): lo elegido se fija; el resto se auto-sortea
  const [seed] = useState(() => (Math.floor((typeof performance !== 'undefined' ? performance.now() : 1) * 1000) >>> 0) || 1)  // FIJO toda la sesion -> ir/volver estable
  const [step, setStep] = useState(0)
  const [url, setUrl] = useState('')
  const [analyzing, setAnalyzing] = useState('')  // '' | 'loading' | mensaje de error
  const [analyzed, setAnalyzed] = useState(false)
  const [exporting, setExporting] = useState('')  // '' | 'NN%' | error
  const [savedMsg, setSavedMsg] = useState('')

  // VIDEO en vivo: brief + receta parcial (keepRecipe) + seed fijo. Determinista.
  const video = useMemo(
    () => makeVideo({ ...brief, brand: brief.brand || 'Tu marca', seed, keepRecipe: Object.keys(recipe).length ? recipe : undefined }),
    [brief, seed, recipe],
  )

  // ---- mini-player (client-side, sin backend) -------------------------------------------------
  const cvRef = useRef(null)
  const headRef = useRef(0)
  const [head, setHead] = useState(0)
  const [playing, setPlaying] = useState(true)
  useEffect(() => {
    const cv = cvRef.current; if (!cv) return
    const ctx = cv.getContext('2d')
    const DPR = Math.min(window.devicePixelRatio || 1, 2.5)
    cv.width = video.W * DPR; cv.height = video.H * DPR
    const draw = () => { ctx.setTransform(DPR, 0, 0, DPR, 0, 0); drawFrame(ctx, headRef.current, video) }
    // EN PAUSA: dibuja UN frame y NO entra al loop -> la pagina queda idle (sin re-render por frame).
    if (!playing) { draw(); setHead(headRef.current); return }
    // REPRODUCIENDO: anima en canvas cada frame, pero el estado de React (la hora) se actualiza THROTTLEADO (~8/s)
    // para no re-renderizar el componente entero 60 veces por segundo.
    let raf, last = performance.now(), lastUI = 0
    const loop = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05); last = now
      headRef.current += dt; if (headRef.current >= video.duration) headRef.current -= video.duration
      draw()
      if (now - lastUI > 120) { lastUI = now; setHead(headRef.current) }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [video, playing])

  // ---- perception -----------------------------------------------------------------------------
  const analyze = async (refresh = false) => {
    if (!url.trim() || analyzing === 'loading') return
    setAnalyzing('loading')
    try {
      const r = await fetch(`${API_URL}/api/urvid/perceive`, { method: 'POST', headers: HEADERS, body: JSON.stringify({ url: url.trim(), userId: user?.uid || '', refresh }) })
      const j = await r.json()
      const b = j && j.brief
      if (!b || j.error) { setAnalyzing(j && j.error ? j.error : 'No se pudo analizar la pagina'); return }
      setBrief({
        brand: b.brand || 'Marca', rubro: RUBROS.includes(b.rubro) ? b.rubro : 'default',
        tone: b.tone === 'light' ? 'light' : 'dark', brandColor: b.brandColor || '#5b8cff',
        format: '9:16', duration: 'medio',
        tagline: b.tagline || '', claim: b.claim || '', cta: b.cta || '',
        bullets: Array.isArray(b.bullets) ? b.bullets : [], stats: Array.isArray(b.stats) ? b.stats : [], proof: b.proof || '',
      })
      setRecipe({}); headRef.current = 0; setHead(0); setAnalyzed(true); setAnalyzing('')
    } catch {
      setAnalyzing('Backend no disponible — abri "start.bat" (corre en localhost:8000)')
    }
  }

  const up = (k, v) => setBrief(b => ({ ...b, [k]: v }))
  const upBullet = (i, v) => setBrief(b => ({ ...b, bullets: b.bullets.map((x, j) => j === i ? v : x) }))
  const addBullet = () => setBrief(b => ({ ...b, bullets: [...(b.bullets || []), ''] }))
  const delBullet = (i) => setBrief(b => ({ ...b, bullets: b.bullets.filter((_, j) => j !== i) }))
  const upStat = (i, k, v) => setBrief(b => ({ ...b, stats: b.stats.map((x, j) => j === i ? { ...x, [k]: v } : x) }))
  const addStat = () => setBrief(b => ({ ...b, stats: [...(b.stats || []), { value: '', label: '' }] }))
  const delStat = (i) => setBrief(b => ({ ...b, stats: b.stats.filter((_, j) => j !== i) }))

  // ---- export (MediaRecorder sobre el canvas; client-side) ------------------------------------
  const exportVideo = () => {
    const cv = cvRef.current
    if (!cv || exporting) return
    if (typeof cv.captureStream !== 'function' || typeof window.MediaRecorder === 'undefined') {
      setExporting('Tu navegador no soporta exportar'); setTimeout(() => setExporting(''), 5000); return
    }
    const types = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm']
    const mime = types.find(t => { try { return MediaRecorder.isTypeSupported(t) } catch { return false } }) || ''
    const ext = mime.indexOf('mp4') >= 0 ? 'mp4' : 'webm'
    let rec
    try { rec = new MediaRecorder(cv.captureStream(30), mime ? { mimeType: mime, videoBitsPerSecond: 8e6 } : { videoBitsPerSecond: 8e6 }) }
    catch { setExporting('No se pudo iniciar la grabacion'); setTimeout(() => setExporting(''), 5000); return }
    const chunks = []
    rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data) }
    rec.onstop = () => {
      const blob = new Blob(chunks, { type: mime || 'video/webm' }), href = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = href; a.download = `${(brief.brand || 'urvid').replace(/\s+/g, '-')}-${(brief.format || '9-16').replace(':', 'x')}.${ext}`
      document.body.appendChild(a); a.click(); a.remove()
      setTimeout(() => URL.revokeObjectURL(href), 4000); setExporting('')
    }
    headRef.current = 0; setHead(0); setPlaying(true)
    rec.start()
    const dur = video.duration, t0 = performance.now()
    const tick = () => {
      const el = (performance.now() - t0) / 1000, pct = Math.min(100, Math.round(el / dur * 100))
      setExporting(pct + '%')
      if (el >= dur + 0.1) { try { rec.stop() } catch { /* noop */ } }
      else requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }

  // ---- guardar en "Mis videos" (Firestore + localStorage) -------------------------------------
  const save = async () => {
    const id = 'v' + Date.now().toString(36)
    const item = { id, brand: brief.brand || 'Marca', rubro: brief.rubro, tone: brief.tone, brandColor: brief.brandColor, format: brief.format || '9:16', duration: brief.duration || 'medio', tagline: brief.tagline || '', claim: brief.claim || '', cta: brief.cta || '', bullets: brief.bullets || [], stats: brief.stats || [], proof: brief.proof || '', recipe: video.recipe, seed, ts: Date.now() }
    try {
      const prev = JSON.parse(localStorage.getItem('urvid1.saved') || '[]')
      localStorage.setItem('urvid1.saved', JSON.stringify([item, ...prev].slice(0, 24)))
    } catch { /* noop */ }
    if (user?.uid) { try { await setDoc(doc(db, 'users', user.uid, 'urvid_videos', id), item) } catch { /* offline -> localStorage */ } }
    setSavedMsg('Guardado en Mis videos ✓'); setTimeout(() => setSavedMsg(''), 4000)
  }

  // ---- pasos (FASE A: Datos + Crear; FASE B insertara estilo/fondo/escenas/cierre/avanzado) ----
  const STEPS = useMemo(() => [
    { key: 'datos', label: 'Datos', eyebrow: 'Tu pagina', render: renderDatos },
    { key: 'revision', label: 'Crear', eyebrow: 'Revision', render: renderRevision },
  ], [])
  const cur = STEPS[step]
  const canNext = step < STEPS.length - 1
  const canPrev = step > 0
  const next = () => setStep(s => Math.min(STEPS.length - 1, s + 1))
  const prev = () => setStep(s => Math.max(0, s - 1))

  // ---------- render de cada paso ----------
  function renderDatos() {
    const used = [
      brief.tagline && ['Gancho', brief.tagline],
      brief.claim && ['Claim', brief.claim],
      brief.cta && ['CTA', brief.cta],
      ...(brief.bullets || []).filter(Boolean).map((b, i) => [`Bullet ${i + 1}`, b]),
      ...(brief.stats || []).filter(s => s && s.value).map((s, i) => [`Dato ${i + 1}`, `${s.value} · ${s.label || ''}`]),
      brief.proof && ['Prueba', brief.proof],
    ].filter(Boolean)
    return (
      <div className={styles.stepBody}>
        <label className={styles.field}>
          <span className={styles.lbl}>Link de tu pagina</span>
          <div className={styles.urlRow}>
            <input className={styles.input} placeholder="https://tu-sitio.com" value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') analyze(false) }} />
            <button className={styles.primary} onClick={() => analyze(false)} disabled={analyzing === 'loading'}>{analyzing === 'loading' ? 'Analizando…' : 'Analizar'}</button>
          </div>
        </label>
        {analyzed && <button className={styles.ghost} onClick={() => analyze(true)} disabled={analyzing === 'loading' || !url.trim()}>↻ Re-analizar (ignora cache)</button>}
        {analyzing && analyzing !== 'loading' && <p className={styles.err}>{analyzing}</p>}

        {analyzed && used.length > 0 && (
          <div className={styles.usedBox}>
            <span className={styles.eyebrowSm}>Lo que va a usar el video</span>
            <div className={styles.usedList}>
              {used.map(([k, v], i) => <div key={i} className={styles.usedItem}><i>{k}</i><span>{v}</span></div>)}
            </div>
          </div>
        )}

        <div className={styles.grid2}>
          <label className={styles.field}><span className={styles.lbl}>Marca</span><input className={styles.input} value={brief.brand} onChange={e => up('brand', e.target.value)} placeholder="Nombre de la marca" /></label>
          <label className={styles.field}><span className={styles.lbl}>Rubro</span>
            <select className={styles.input} value={brief.rubro} onChange={e => up('rubro', e.target.value)}>{RUBROS.map(r => <option key={r} value={r}>{RUBRO_LBL[r]}</option>)}</select>
          </label>
        </div>
        <div className={styles.grid2}>
          <label className={styles.field}><span className={styles.lbl}>Color de marca</span><input className={styles.color} type="color" value={brief.brandColor} onChange={e => up('brandColor', e.target.value)} /></label>
          <label className={styles.field}><span className={styles.lbl}>Tono</span>
            <div className={styles.seg}>{['dark', 'light'].map(tn => <button key={tn} className={brief.tone === tn ? styles.segOn : ''} onClick={() => up('tone', tn)}>{tn === 'dark' ? 'Oscuro' : 'Claro'}</button>)}</div>
          </label>
        </div>
        <div className={styles.grid2}>
          <label className={styles.field}><span className={styles.lbl}>Formato</span>
            <div className={styles.seg}>{[['9:16', 'Reel'], ['4:5', 'Feed'], ['1:1', 'Cuadr.']].map(([f, l]) => <button key={f} className={(brief.format || '9:16') === f ? styles.segOn : ''} onClick={() => up('format', f)}>{l}</button>)}</div>
          </label>
          <label className={styles.field}><span className={styles.lbl}>Duracion</span>
            <div className={styles.seg}>{[['corto', 'Corto'], ['medio', 'Medio'], ['largo', 'Largo']].map(([d, l]) => <button key={d} className={(brief.duration || 'medio') === d ? styles.segOn : ''} onClick={() => up('duration', d)}>{l}</button>)}</div>
          </label>
        </div>
        <label className={styles.field}><span className={styles.lbl}>Gancho</span><input className={styles.input} value={brief.tagline} onChange={e => up('tagline', e.target.value)} placeholder="Frase corta de enganche" /></label>
        <label className={styles.field}><span className={styles.lbl}>Claim (mensaje principal)</span><input className={styles.input} value={brief.claim} onChange={e => up('claim', e.target.value)} placeholder="El mensaje del reel" /></label>
        <label className={styles.field}><span className={styles.lbl}>CTA</span><input className={styles.input} value={brief.cta} onChange={e => up('cta', e.target.value)} placeholder="Llamado a la accion" /></label>

        <div className={styles.field}>
          <span className={styles.lbl}>Bullets (props/beneficios)</span>
          {(brief.bullets || []).map((b, i) => (
            <div key={i} className={styles.listRow}>
              <input className={styles.input} value={b} onChange={e => upBullet(i, e.target.value)} placeholder={`Beneficio ${i + 1}`} />
              <button className={styles.iconBtn} onClick={() => delBullet(i)} title="Quitar">×</button>
            </div>
          ))}
          <button className={styles.ghost} onClick={addBullet}>+ Agregar bullet</button>
        </div>

        <div className={styles.field}>
          <span className={styles.lbl}>Datos (numero + etiqueta)</span>
          {(brief.stats || []).map((s, i) => (
            <div key={i} className={styles.listRow}>
              <input className={`${styles.input} ${styles.inputNum}`} value={s.value || ''} onChange={e => upStat(i, 'value', e.target.value)} placeholder="92%" />
              <input className={styles.input} value={s.label || ''} onChange={e => upStat(i, 'label', e.target.value)} placeholder="de clientes lo recomienda" />
              <button className={styles.iconBtn} onClick={() => delStat(i)} title="Quitar">×</button>
            </div>
          ))}
          <button className={styles.ghost} onClick={addStat}>+ Agregar dato</button>
        </div>
      </div>
    )
  }

  function renderRevision() {
    const chips = [['color', video.recipe.color], ['tipo', video.recipe.type], ['fondo', video.recipe.bg], ['substrate', video.recipe.sub], ['atmosfera', video.recipe.atm], ['motion', video.recipe.motion], ['typekit', video.recipe.typekit], ['mark', video.recipe.mark], ['transicion', video.recipe.transition], ['post', video.recipe.post], ['layout', video.recipe.layout]].filter(([, v]) => v)
    return (
      <div className={styles.stepBody}>
        <p className={styles.lead}>Asi quedo tu receta. Mira el preview y, si te gusta, crealo.</p>
        <div className={styles.recipeChips}>
          {chips.map(([k, v]) => <span key={k} className={styles.chip}><i>{k}</i>{String(v).replace(/^[^.]+\./, '')}</span>)}
        </div>
        <div className={styles.flowLine}>{video.recipe.scenes.map(s => s.replace(/^[^.]+\./, '')).join('  →  ')}</div>
        <div className={styles.actions}>
          <button className={styles.primary} onClick={save}>★ Crear y guardar</button>
          <button className={styles.ghost} onClick={exportVideo} disabled={!!exporting}>{exporting ? `Exportando ${exporting}` : '⬇ Descargar video'}</button>
        </div>
        {savedMsg && <p className={styles.ok}>{savedMsg}</p>}
        {exporting && exporting.indexOf('%') < 0 && <p className={styles.err}>{exporting}</p>}
      </div>
    )
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.inner}>
        <header className={styles.header}>
          <div className={styles.logo}>Ur<span>vid</span> Craft</div>
          <div className={styles.steps}>
            {STEPS.map((s, i) => (
              <button key={s.key} className={`${styles.stepTab} ${i === step ? styles.stepOn : ''} ${i < step ? styles.stepDone : ''}`} onClick={() => setStep(i)}>
                <span className={styles.stepNum}>{String(i + 1).padStart(2, '0')}</span>{s.label}
              </button>
            ))}
          </div>
        </header>

        <div className={styles.cols}>
          <section className={styles.main}>
            <span className={styles.eyebrow}>{cur.eyebrow} · paso {step + 1} de {STEPS.length}</span>
            <h2 className={styles.title}>{cur.label}</h2>
            {cur.render()}
            <div className={styles.nav}>
              <button className={styles.ghost} onClick={prev} disabled={!canPrev}>← Atras</button>
              {canNext
                ? <button className={styles.primary} onClick={next}>Siguiente →</button>
                : <span className={styles.endHint}>Listo para crear</span>}
            </div>
          </section>

          <aside className={styles.aside}>
            <span className={styles.eyebrowSm}>Como va quedando</span>
            <div className={styles.frame} style={{ aspectRatio: `${video.W} / ${video.H}` }}>
              <canvas ref={cvRef} />
            </div>
            <div className={styles.transport}>
              <button className={styles.tbtn} onClick={() => setPlaying(p => !p)}>{playing ? '⏸' : '▶'}</button>
              <button className={styles.tbtn} onClick={() => { headRef.current = 0 }}>↺</button>
              <span className={styles.time}>{head.toFixed(1)} / {video.duration.toFixed(1)}s</span>
            </div>
            <p className={styles.miniNote}>Preview en tu navegador — no consume nada del servidor.</p>
          </aside>
        </div>
      </div>
    </div>
  )
}
