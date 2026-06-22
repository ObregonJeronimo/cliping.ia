import { useEffect, useRef, useState, useMemo } from 'react'
import { collection, getDocs, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore'
import { makeVideo, drawFrame, beatAt, W, H } from '../../urvid/index.js'
import { useAuth } from '../../contexts/AuthContext'
import { db } from '../../lib/firebase'
import styles from './Urvid1Studio.module.css'

const RUBROS = ['default', 'tech', 'finanzas', 'moda', 'gastronomia', 'educacion', 'salud', 'fitness', 'inmobiliaria', 'belleza']

// Backend (perception): mismo patron que el resto del front. En dev pega a localhost:8000 (start.bat).
const API_URL = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:8000')
const HEADERS = { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }

// urvid 1.0 · estudio. Arma un video con el motor de bibliotecas (determinista) y lo reproduce EN VIVO (transport).
// El almacen de videos vive aca mismo (localStorage) — no hay item aparte. NO toca "Animaciones".
export default function Urvid1Studio() {
  const { user } = useAuth()
  const [brief, setBrief] = useState({ brand: 'Nodo', rubro: 'tech', tone: 'dark', brandColor: '#22e06a', format: '9:16', duration: 'medio', tagline: 'Automatiza lo aburrido y enfocate en lo que importa', claim: 'Menos tareas repetitivas, mas resultados reales', cta: 'Probalo gratis' })
  const [seed, setSeed] = useState(0)
  // TONO = SOLO COLOR: al togglear claro/oscuro bloqueamos la receta (lockRecipe) -> el director reusa los mismos
  // modulos y solo re-deriva la paleta. Cualquier otro cambio (marca/rubro/texto/semilla) LIBERA el lock -> build fresco.
  const [lock, setLock] = useState(null)
  // KEEP: "otra variante" mantiene la IDENTIDAD de la pagina (color + tipografia) y re-rolea el resto. Se limpia
  // ante cualquier cambio del brief (marca/color/rubro/texto) o al analizar/cargar otro -> ahi el estilo se re-elige.
  const [keep, setKeep] = useState(null)
  const video = useMemo(() => makeVideo({ ...brief, seed: seed || undefined, lockRecipe: lock || undefined, keepRecipe: keep || undefined }), [brief, seed, lock, keep])
  const [playing, setPlaying] = useState(true)
  const [speed, setSpeed] = useState(1)
  const [head, setHead] = useState(0)
  const headRef = useRef(0)
  const cvRef = useRef(null)
  const recRef = useRef(null)
  const [saved, setSaved] = useState(() => { try { return JSON.parse(localStorage.getItem('urvid1.saved') || '[]') } catch { return [] } })
  const [url, setUrl] = useState('')
  const [analyzing, setAnalyzing] = useState('')   // '' | 'loading' | mensaje de error
  const [shared, setShared] = useState('')         // estado del boton "Compartir con Claude"
  const [exporting, setExporting] = useState('')   // '' | 'NN%' | mensaje de error
  const [variants, setVariants] = useState([])     // [{seed, url}] miniaturas de variantes para elegir

  useEffect(() => {
    const cv = cvRef.current; if (!cv) return
    const ctx = cv.getContext('2d')
    const DPR = Math.min(window.devicePixelRatio || 1, 2.5)
    cv.width = video.W * DPR; cv.height = video.H * DPR   // backing store al formato del video (9:16 / 1:1 / 4:5)
    let raf, last = performance.now()
    const loop = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05) * speed; last = now
      if (playing) { headRef.current += dt; if (headRef.current >= video.duration) headRef.current -= video.duration }
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
      drawFrame(ctx, headRef.current, video)
      setHead(headRef.current)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [video, playing, speed])

  // al loguearse, trae "Mis videos" de Firestore (fuente de verdad); si no hay sesion, queda el cache de localStorage.
  useEffect(() => {
    if (!user?.uid) return
    let alive = true
    getDocs(collection(db, 'users', user.uid, 'urvid_videos')).then(snap => {
      if (!alive) return
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, 24)
      if (items.length) { setSaved(items); localStorage.setItem('urvid1.saved', JSON.stringify(items)) }
    }).catch(() => { /* offline -> localStorage */ })
    return () => { alive = false }
  }, [user?.uid])

  // BRAND-KIT: al loguearse trae el logo guardado del perfil (users/{uid}/urvid_profile/main).
  useEffect(() => {
    if (!user?.uid) return
    let alive = true
    getDoc(doc(db, 'users', user.uid, 'urvid_profile', 'main')).then(s => { if (alive && s.exists() && s.data().logo) setBrief(b => ({ ...b, logo: s.data().logo })) }).catch(() => { /* noop */ })
    return () => { alive = false }
  }, [user?.uid])

  // PERCEPTION: pega una URL -> el backend analiza la pagina y arma el brief -> lo cargamos al estudio.
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
        tagline: b.tagline || '', claim: b.claim || '', cta: b.cta || '',
        bullets: Array.isArray(b.bullets) ? b.bullets : [], stats: Array.isArray(b.stats) ? b.stats : [], proof: b.proof || '',
      })
      setLock(null); setKeep(null); setSeed(0); headRef.current = 0; setHead(0); setAnalyzing('')
    } catch {
      setAnalyzing('Backend no disponible — abri "start.bat" (corre en localhost:8000)')
    }
  }

  // Comparte el {brief, seed, recipe} del video actual con el backend -> Claude lo regenera exacto y lo ve.
  const share = async () => {
    if (shared === '...') return
    setShared('...')
    try {
      const r = await fetch(`${API_URL}/api/urvid/share`, { method: 'POST', headers: HEADERS, body: JSON.stringify({ brief, seed, recipe: video.recipe }) })
      const j = await r.json()
      setShared(j && j.ok ? 'Compartido ✓ — pedile a Claude que lo vea' : ((j && j.error) || 'No se pudo compartir'))
    } catch {
      setShared('Backend apagado — abri "start.bat" (localhost:8000)')
    }
    setTimeout(() => setShared(''), 7000)
  }

  // EXPORT: graba el canvas (que ya se dibuja en vivo) con MediaRecorder -> baja un archivo de video. El motor corre
  // en el browser, asi que esto no necesita backend. Graba UNA vuelta exacta (de 0 a video.duration) y lo descarga.
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
    recRef.current = rec; rec.start()
    const dur = video.duration, t0 = performance.now()
    const tick = () => {
      if (!recRef.current) return
      const el = (performance.now() - t0) / 1000, pct = Math.min(100, Math.round(el / dur * 100))
      setExporting(pct + '%')
      if (el >= dur + 0.1) { try { rec.stop() } catch { /* noop */ } recRef.current = null }
      else requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }

  // VARIANTES: genera N recetas distintas (N semillas) y las muestra como miniaturas para ELEGIR (en vez de un reroll
  // a ciegas). Cada miniatura es 1 frame representativo. Click -> adopta esa semilla (receta completa). Determinista.
  const genVariants = () => {
    const out = []
    for (let k = 0; k < 6; k++) {
      const s = (((seed || 1) + (k + 1) * 0x9e3779b1) >>> 0) || 1
      const v = makeVideo({ ...brief, seed: s })
      const cv = document.createElement('canvas'); cv.width = Math.round(v.W * 1.1); cv.height = Math.round(v.H * 1.1)
      const c = cv.getContext('2d'); c.setTransform(1.1, 0, 0, 1.1, 0, 0)
      try { drawFrame(c, v.duration * 0.35, v) } catch { /* skip */ }
      out.push({ seed: s, url: cv.toDataURL('image/png') })
    }
    setVariants(out)
  }
  const pickVariant = (s) => { setLock(null); setKeep(null); setSeed(s); headRef.current = 0; setHead(0); setVariants([]) }

  // BRAND-KIT: sube un logo, lo DOWNSCALEA a <=256px (para no inflar el doc de Firestore), lo guarda en el brief
  // (-> se dibuja en una esquina) y lo persiste en el perfil. Un logo NO es "foto real" -> respeta la decision no-fotos.
  const onLogo = (e) => {
    const file = e.target.files && e.target.files[0]; if (!file) return
    const fr = new FileReader()
    fr.onload = () => {
      const img = new Image()
      img.onload = () => {
        const max = 256, sc = Math.min(1, max / Math.max(img.width, img.height))
        const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(img.width * sc)); cv.height = Math.max(1, Math.round(img.height * sc))
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height)
        const url = cv.toDataURL('image/png')
        setBrief(b => ({ ...b, logo: url }))
        if (user?.uid) { try { setDoc(doc(db, 'users', user.uid, 'urvid_profile', 'main'), { logo: url, brandColor: brief.brandColor, ts: Date.now() }) } catch { /* noop */ } }
      }
      img.src = fr.result
    }
    fr.readAsDataURL(file)
  }
  const clearLogo = () => { setBrief(b => ({ ...b, logo: null })); if (user?.uid) { try { setDoc(doc(db, 'users', user.uid, 'urvid_profile', 'main'), { logo: '', brandColor: brief.brandColor, ts: Date.now() }) } catch { /* noop */ } } }

  const up = (k, v) => { setLock(null); setKeep(null); setBrief(b => ({ ...b, [k]: v })) }
  // toggle de tono: NO libera el lock -> congela la receta actual y solo recolorea al otro tono.
  const setTone = (tn) => { if (tn === brief.tone) return; setKeep(null); setLock(video.recipe); setBrief(b => ({ ...b, tone: tn })) }
  // OTRA VARIANTE: nueva semilla PERO conserva color+tipografia (la identidad de la pagina) -> mismo estilo,
  // composicion distinta (fondo/escenas/motion/transicion). Y REINICIA el reproductor a 0 (antes seguia en el
  // segundo donde estabas y habia que rebobinar a mano).
  const reroll = () => { setLock(null); setKeep({ color: video.recipe.color, type: video.recipe.type }); setSeed(s => ((s || 1) + 0x9e3779b1) >>> 0 || 1); headRef.current = 0; setHead(0) }
  // "Mis videos" persiste en Firestore (users/{uid}/urvid_videos) cuando hay sesion; localStorage es el cache local
  // inmediato + fallback offline. Antes era SOLO localStorage (se perdia al limpiar cache; el uid no se usaba).
  const save = async () => {
    const id = 'v' + Date.now().toString(36)
    const item = { id, brand: brief.brand, rubro: brief.rubro, tone: brief.tone, brandColor: brief.brandColor, format: brief.format || '9:16', duration: brief.duration || 'medio', tagline: brief.tagline || '', claim: brief.claim || '', cta: brief.cta || '', bullets: brief.bullets || [], stats: brief.stats || [], proof: brief.proof || '', seed, ts: Date.now() }
    const next = [item, ...saved].slice(0, 24)
    setSaved(next); localStorage.setItem('urvid1.saved', JSON.stringify(next))
    if (user?.uid) { try { await setDoc(doc(db, 'users', user.uid, 'urvid_videos', id), item) } catch { /* offline -> queda en localStorage */ } }
  }
  const load = (it) => { setLock(null); setKeep(null); setBrief({ brand: it.brand, rubro: it.rubro, tone: it.tone, brandColor: it.brandColor, format: it.format || '9:16', duration: it.duration || 'medio', tagline: it.tagline, claim: it.claim, cta: it.cta, bullets: it.bullets || [], stats: it.stats || [], proof: it.proof || '' }); setSeed(it.seed || 0); headRef.current = 0; setHead(0) }
  const del = async (it) => {
    const next = saved.filter(s => s !== it)
    setSaved(next); localStorage.setItem('urvid1.saved', JSON.stringify(next))
    if (user?.uid && it.id) { try { await deleteDoc(doc(db, 'users', user.uid, 'urvid_videos', it.id)) } catch { /* noop */ } }
  }

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <div className={styles.brand}>
          <h1>urvid <span>1.0</span></h1>
          <p>Motor de bibliotecas · ensamblaje determinista</p>
        </div>
        <div className={styles.recipe}>
          {[['color', video.recipe.color], ['tipo', video.recipe.type], ['fondo', video.recipe.bg], ['motion', video.recipe.motion], ['trans', video.recipe.transition], ['post', video.recipe.post]]
            .filter(([, v]) => v).map(([k, v]) => <span key={k} className={styles.chip}><i>{k}</i>{v.replace(/^[^.]+\./, '')}</span>)}
        </div>
        <p className={styles.flow}>{video.recipe.scenes.map(s => s.replace(/^[^.]+\./, '')).join('  →  ')}</p>
      </header>

      <div className={styles.cols}>
        <div className={styles.panel}>
          <label className={styles.field}>Analizar pagina (IA)
            <div className={`${styles.row} ${styles.analyze}`}>
              <input placeholder="https://tu-sitio.com" value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') analyze(false) }} />
              <button className={styles.primary} onClick={() => analyze(false)} disabled={analyzing === 'loading'}>{analyzing === 'loading' ? 'Analizando…' : '✨ Analizar'}</button>
            </div>
          </label>
          <button className={styles.ghost} onClick={() => analyze(true)} disabled={analyzing === 'loading' || !url.trim()} title="Ignora el cache y vuelve a analizar la pagina">↻ Re-analizar</button>
          {analyzing && analyzing !== 'loading' && <p style={{ margin: '0 0 6px', fontSize: 12, color: 'var(--red)' }}>{analyzing}</p>}
          <label className={styles.field}>Marca<input value={brief.brand} onChange={e => up('brand', e.target.value)} /></label>
          <div className={styles.two}>
            <label className={styles.field}>Color<input type="color" value={brief.brandColor} onChange={e => up('brandColor', e.target.value)} /></label>
            <label className={styles.field}>Rubro<select value={brief.rubro} onChange={e => up('rubro', e.target.value)}>{RUBROS.map(r => <option key={r}>{r}</option>)}</select></label>
          </div>
          <label className={styles.field}>Logo (marca){brief.logo
            ? <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><img src={brief.logo} alt="logo" style={{ height: 28, maxWidth: 100, objectFit: 'contain', background: 'var(--surface2)', borderRadius: 6, padding: 3 }} /><button className={styles.ghost} onClick={clearLogo} style={{ padding: '4px 8px', fontSize: 12 }}>Quitar</button></span>
            : <input type="file" accept="image/*" onChange={onLogo} />}</label>
          <label className={styles.field}>Tono<div className={styles.seg}>{['dark', 'light'].map(tn => <button key={tn} className={brief.tone === tn ? styles.on : ''} onClick={() => setTone(tn)}>{tn === 'dark' ? 'oscuro' : 'claro'}</button>)}</div></label>
          <label className={styles.field}>Formato<div className={styles.seg}>{[['9:16', 'Reel'], ['4:5', 'Feed'], ['1:1', 'Cuadr.']].map(([f, lbl]) => <button key={f} className={(brief.format || '9:16') === f ? styles.on : ''} onClick={() => up('format', f)}>{lbl} {f}</button>)}</div></label>
          <label className={styles.field}>Duración<div className={styles.seg}>{[['corto', 'Corto'], ['medio', 'Medio'], ['largo', 'Largo']].map(([d, lbl]) => <button key={d} className={(brief.duration || 'medio') === d ? styles.on : ''} onClick={() => up('duration', d)}>{lbl}</button>)}</div></label>
          <label className={styles.field}>Gancho<input value={brief.tagline} onChange={e => up('tagline', e.target.value)} /></label>
          <label className={styles.field}>Claim<input value={brief.claim} onChange={e => up('claim', e.target.value)} /></label>
          <label className={styles.field}>CTA<input value={brief.cta} onChange={e => up('cta', e.target.value)} /></label>
          <div className={styles.row}>
            <button className={styles.primary} onClick={reroll}>↻ Otra variante</button>
            <button className={styles.ghost} onClick={save}>★ Guardar</button>
          </div>
          <button className={styles.primary} onClick={exportVideo} disabled={!!exporting} style={{ width: '100%' }}>{exporting ? `Exportando ${exporting}` : '⬇ Descargar video'}</button>
          {exporting && exporting.indexOf('%') < 0 && <p style={{ margin: 0, fontSize: 12, color: 'var(--red)' }}>{exporting}</p>}
          <button className={styles.ghost} onClick={genVariants} style={{ width: '100%' }} title="Genera 6 variantes para elegir">⊞ Ver variantes</button>
          {variants.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
              {variants.map(v => (
                <button key={v.seed} onClick={() => pickVariant(v.seed)} title="Usar esta variante" style={{ padding: 0, border: '1px solid var(--border2)', borderRadius: 8, overflow: 'hidden', cursor: 'pointer', background: '#0a0a0f', aspectRatio: `${video.W} / ${video.H}` }}>
                  <img src={v.url} alt="variante" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </button>
              ))}
            </div>
          )}
          <span className={styles.seedpill}><i>semilla</i>{seed ? '#' + (seed >>> 0).toString(16).slice(0, 6) : 'auto (marca + rubro)'}</span>
          {import.meta.env.DEV && <button className={styles.share} onClick={share} title="Manda este video a Claude para que lo vea (solo dev)">{shared === '...' ? 'Compartiendo…' : '↗ Compartir con Claude'}</button>}
          {import.meta.env.DEV && shared && shared !== '...' && <p style={{ margin: 0, fontSize: 12, color: shared.indexOf('✓') >= 0 ? 'var(--green)' : 'var(--red)' }}>{shared}</p>}
          <p className={styles.note}>"Otra variante" mantiene el color y la tipografía de la página y varía la composición (fondo, escenas, movimiento). Cambiá la marca, el color o el rubro para un estilo nuevo.</p>
        </div>

        <div className={styles.stage}>
          <div className={styles.frame} style={{ aspectRatio: `${video.W} / ${video.H}` }}><canvas ref={cvRef} /></div>
          <div className={styles.transport}>
            <button className={styles.tbtn} onClick={() => setPlaying(p => !p)}>{playing ? '⏸' : '▶'}</button>
            <button className={styles.tbtn} onClick={() => { headRef.current = 0 }}>↺</button>
            <input className={styles.seek} type="range" min="0" max="1000" value={Math.round(head / video.duration * 1000) || 0} onChange={e => { headRef.current = (Number(e.target.value) / 1000) * video.duration }} />
            <span className={styles.time}>{head.toFixed(1)} / {video.duration.toFixed(1)}</span>
            <div className={styles.seg}>{[0.5, 1].map(s => <button key={s} className={speed === s ? styles.on : ''} onClick={() => setSpeed(s)}>{s}×</button>)}</div>
          </div>
        </div>

        <div className={`${styles.panel} ${styles.side}`}>
          <h3 className={styles.h3}>Mis videos</h3>
          {saved.length === 0 && <div className={styles.empty}><b>Sin videos guardados</b>Tocá ★ Guardar y tus variantes quedan acá.</div>}
          <div className={styles.gallery}>
            {saved.map((it, i) => (
              <div key={i} className={styles.card} style={{ '--c': it.brandColor }}>
                <button className={styles.cardBtn} onClick={() => load(it)}><b>{it.brand}</b><span>{it.rubro} · {it.tone === 'dark' ? 'oscuro' : 'claro'}</span></button>
                <button className={styles.del} onClick={() => del(it)} title="Borrar">×</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
