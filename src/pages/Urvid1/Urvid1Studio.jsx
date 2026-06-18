import { useEffect, useRef, useState, useMemo } from 'react'
import { makeVideo, drawFrame, beatAt, W, H } from '../../urvid/index.js'
import styles from './Urvid1Studio.module.css'

const RUBROS = ['default', 'tech', 'finanzas', 'moda', 'gastronomia', 'educacion', 'salud', 'fitness', 'inmobiliaria', 'belleza']

// urvid 1.0 · estudio. Arma un video con el motor de bibliotecas (determinista) y lo reproduce EN VIVO (transport).
// El almacen de videos vive aca mismo (localStorage) — no hay item aparte. NO toca "Animaciones".
export default function Urvid1Studio() {
  const [brief, setBrief] = useState({ brand: 'Nodo', rubro: 'tech', tone: 'dark', brandColor: '#22e06a', tagline: 'Automatiza lo aburrido y enfocate en lo que importa', claim: 'Menos tareas repetitivas, mas resultados reales', cta: 'Probalo gratis' })
  const [seed, setSeed] = useState(0)
  const video = useMemo(() => makeVideo({ ...brief, seed: seed || undefined }), [brief, seed])
  const [playing, setPlaying] = useState(true)
  const [speed, setSpeed] = useState(1)
  const [head, setHead] = useState(0)
  const headRef = useRef(0)
  const cvRef = useRef(null)
  const [saved, setSaved] = useState(() => { try { return JSON.parse(localStorage.getItem('urvid1.saved') || '[]') } catch { return [] } })

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

  const up = (k, v) => setBrief(b => ({ ...b, [k]: v }))
  const reroll = () => setSeed(s => ((s || 1) + 0x9e3779b1) >>> 0 || 1)
  const save = () => { const next = [{ ...brief, seed, ts: Date.now() }, ...saved].slice(0, 24); setSaved(next); localStorage.setItem('urvid1.saved', JSON.stringify(next)) }
  const load = (it) => { setBrief({ brand: it.brand, rubro: it.rubro, tone: it.tone, brandColor: it.brandColor, tagline: it.tagline, claim: it.claim, cta: it.cta }); setSeed(it.seed || 0); headRef.current = 0 }
  const del = (i) => { const next = saved.filter((_, j) => j !== i); setSaved(next); localStorage.setItem('urvid1.saved', JSON.stringify(next)) }

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <div><h1>urvid <span>1.0</span></h1><p>motor de bibliotecas · ensamblaje determinista · <b>{video.recipe.bg}</b> → {video.recipe.scenes.join(' · ')}</p></div>
      </header>

      <div className={styles.cols}>
        <div className={styles.panel}>
          <label className={styles.field}>Marca<input value={brief.brand} onChange={e => up('brand', e.target.value)} /></label>
          <div className={styles.two}>
            <label className={styles.field}>Color<input type="color" value={brief.brandColor} onChange={e => up('brandColor', e.target.value)} /></label>
            <label className={styles.field}>Rubro<select value={brief.rubro} onChange={e => up('rubro', e.target.value)}>{RUBROS.map(r => <option key={r}>{r}</option>)}</select></label>
          </div>
          <label className={styles.field}>Tono<div className={styles.seg}>{['dark', 'light'].map(tn => <button key={tn} className={brief.tone === tn ? styles.on : ''} onClick={() => up('tone', tn)}>{tn === 'dark' ? 'oscuro' : 'claro'}</button>)}</div></label>
          <label className={styles.field}>Gancho<input value={brief.tagline} onChange={e => up('tagline', e.target.value)} /></label>
          <label className={styles.field}>Claim<input value={brief.claim} onChange={e => up('claim', e.target.value)} /></label>
          <label className={styles.field}>CTA<input value={brief.cta} onChange={e => up('cta', e.target.value)} /></label>
          <div className={styles.row}>
            <button className={styles.primary} onClick={reroll}>↻ Otra variante</button>
            <button className={styles.ghost} onClick={save}>★ Guardar</button>
          </div>
          <p className={styles.note}>Cada "otra variante" cambia la semilla → el director elige distinto de las bibliotecas.</p>
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

        <div className={styles.panel}>
          <h3 className={styles.h3}>Mis videos</h3>
          {saved.length === 0 && <p className={styles.note}>Guardá un video para tenerlo acá.</p>}
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
