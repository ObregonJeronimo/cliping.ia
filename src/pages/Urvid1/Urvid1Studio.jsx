import { useEffect, useRef, useState, useMemo } from 'react'
import { makeVideo, drawFrame, beatAt, W, H } from '../../urvid/index.js'
import { useAuth } from '../../contexts/AuthContext'
import styles from './Urvid1Studio.module.css'

const RUBROS = ['default', 'tech', 'finanzas', 'moda', 'gastronomia', 'educacion', 'salud', 'fitness', 'inmobiliaria', 'belleza']

// Backend (perception): mismo patron que el resto del front. En dev pega a localhost:8000 (start.bat).
const API_URL = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:8000')
const HEADERS = { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }

// urvid 1.0 · estudio. Arma un video con el motor de bibliotecas (determinista) y lo reproduce EN VIVO (transport).
// El almacen de videos vive aca mismo (localStorage) — no hay item aparte. NO toca "Animaciones".
export default function Urvid1Studio() {
  const { user } = useAuth()
  const [brief, setBrief] = useState({ brand: 'Nodo', rubro: 'tech', tone: 'dark', brandColor: '#22e06a', tagline: 'Automatiza lo aburrido y enfocate en lo que importa', claim: 'Menos tareas repetitivas, mas resultados reales', cta: 'Probalo gratis' })
  const [seed, setSeed] = useState(0)
  // TONO = SOLO COLOR: al togglear claro/oscuro bloqueamos la receta (lockRecipe) -> el director reusa los mismos
  // modulos y solo re-deriva la paleta. Cualquier otro cambio (marca/rubro/texto/semilla) LIBERA el lock -> build fresco.
  const [lock, setLock] = useState(null)
  const video = useMemo(() => makeVideo({ ...brief, seed: seed || undefined, lockRecipe: lock || undefined }), [brief, seed, lock])
  const [playing, setPlaying] = useState(true)
  const [speed, setSpeed] = useState(1)
  const [head, setHead] = useState(0)
  const headRef = useRef(0)
  const cvRef = useRef(null)
  const [saved, setSaved] = useState(() => { try { return JSON.parse(localStorage.getItem('urvid1.saved') || '[]') } catch { return [] } })
  const [url, setUrl] = useState('')
  const [analyzing, setAnalyzing] = useState('')   // '' | 'loading' | mensaje de error
  const [shared, setShared] = useState('')         // estado del boton "Compartir con Claude"

  useEffect(() => {
    const cv = cvRef.current; if (!cv) return
    const ctx = cv.getContext('2d')
    const DPR = Math.min(window.devicePixelRatio || 1, 2.5)
    cv.width = W * DPR; cv.height = H * DPR
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

  // PERCEPTION: pega una URL -> el backend analiza la pagina y arma el brief -> lo cargamos al estudio.
  const analyze = async () => {
    if (!url.trim() || analyzing === 'loading') return
    setAnalyzing('loading')
    try {
      const r = await fetch(`${API_URL}/api/urvid/perceive`, { method: 'POST', headers: HEADERS, body: JSON.stringify({ url: url.trim(), userId: user?.uid || '' }) })
      const j = await r.json()
      const b = j && j.brief
      if (!b || j.error) { setAnalyzing(j && j.error ? j.error : 'No se pudo analizar la pagina'); return }
      setBrief({
        brand: b.brand || 'Marca', rubro: RUBROS.includes(b.rubro) ? b.rubro : 'default',
        tone: b.tone === 'light' ? 'light' : 'dark', brandColor: b.brandColor || '#5b8cff',
        tagline: b.tagline || '', claim: b.claim || '', cta: b.cta || '',
        bullets: Array.isArray(b.bullets) ? b.bullets : [], stats: Array.isArray(b.stats) ? b.stats : [], proof: b.proof || '',
      })
      setLock(null); setSeed(0); headRef.current = 0; setAnalyzing('')
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

  const up = (k, v) => { setLock(null); setBrief(b => ({ ...b, [k]: v })) }
  // toggle de tono: NO libera el lock -> congela la receta actual y solo recolorea al otro tono.
  const setTone = (tn) => { if (tn === brief.tone) return; setLock(video.recipe); setBrief(b => ({ ...b, tone: tn })) }
  const reroll = () => { setLock(null); setSeed(s => ((s || 1) + 0x9e3779b1) >>> 0 || 1) }
  const save = () => { const next = [{ ...brief, seed, ts: Date.now() }, ...saved].slice(0, 24); setSaved(next); localStorage.setItem('urvid1.saved', JSON.stringify(next)) }
  const load = (it) => { setLock(null); setBrief({ brand: it.brand, rubro: it.rubro, tone: it.tone, brandColor: it.brandColor, tagline: it.tagline, claim: it.claim, cta: it.cta, bullets: it.bullets || [], stats: it.stats || [], proof: it.proof || '' }); setSeed(it.seed || 0); headRef.current = 0 }
  const del = (i) => { const next = saved.filter((_, j) => j !== i); setSaved(next); localStorage.setItem('urvid1.saved', JSON.stringify(next)) }

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
              <input placeholder="https://tu-sitio.com" value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') analyze() }} />
              <button className={styles.primary} onClick={analyze} disabled={analyzing === 'loading'}>{analyzing === 'loading' ? 'Analizando…' : '✨ Analizar'}</button>
            </div>
          </label>
          {analyzing && analyzing !== 'loading' && <p style={{ margin: '0 0 6px', fontSize: 12, color: '#e08a8a' }}>{analyzing}</p>}
          <label className={styles.field}>Marca<input value={brief.brand} onChange={e => up('brand', e.target.value)} /></label>
          <div className={styles.two}>
            <label className={styles.field}>Color<input type="color" value={brief.brandColor} onChange={e => up('brandColor', e.target.value)} /></label>
            <label className={styles.field}>Rubro<select value={brief.rubro} onChange={e => up('rubro', e.target.value)}>{RUBROS.map(r => <option key={r}>{r}</option>)}</select></label>
          </div>
          <label className={styles.field}>Tono<div className={styles.seg}>{['dark', 'light'].map(tn => <button key={tn} className={brief.tone === tn ? styles.on : ''} onClick={() => setTone(tn)}>{tn === 'dark' ? 'oscuro' : 'claro'}</button>)}</div></label>
          <label className={styles.field}>Gancho<input value={brief.tagline} onChange={e => up('tagline', e.target.value)} /></label>
          <label className={styles.field}>Claim<input value={brief.claim} onChange={e => up('claim', e.target.value)} /></label>
          <label className={styles.field}>CTA<input value={brief.cta} onChange={e => up('cta', e.target.value)} /></label>
          <div className={styles.row}>
            <button className={styles.primary} onClick={reroll}>↻ Otra variante</button>
            <button className={styles.ghost} onClick={save}>★ Guardar</button>
          </div>
          <span className={styles.seedpill}><i>semilla</i>{seed ? '#' + (seed >>> 0).toString(16).slice(0, 6) : 'auto (marca + rubro)'}</span>
          <button className={styles.share} onClick={share} title="Manda este video a Claude para que lo vea">{shared === '...' ? 'Compartiendo…' : '↗ Compartir con Claude'}</button>
          {shared && shared !== '...' && <p style={{ margin: 0, fontSize: 12, color: shared.indexOf('✓') >= 0 ? '#8fe0a8' : '#e08a8a' }}>{shared}</p>}
          <p className={styles.note}>Cada "otra variante" cambia la semilla → el director ensambla una carta distinta. Misma semilla = mismo video, siempre.</p>
        </div>

        <div className={styles.stage}>
          <div className={styles.frame}><canvas ref={cvRef} /></div>
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
                <button className={styles.del} onClick={() => del(i)} title="Borrar">×</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
