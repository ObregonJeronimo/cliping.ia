import { useEffect, useRef, useState, useMemo } from 'react'
import { collection, getDocs, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore'
import { makeKinetic, drawKineticFrame } from '../../kinetic/index.js'
import { exportCanvasVideo } from '../../lib/exportVideo.js'
import { drawWatermark } from '../../lib/watermark.js'
import { MUSIC_LIBRARY, ASSET_BY_ID } from '../../lib/audioAssets.js'
import { playPreview } from '../../lib/audioMix.js'
import { useAuth } from '../../contexts/AuthContext'
import { db } from '../../lib/firebase'
import styles from './KineticStudio.module.css'

// Backend (perception): MISMO endpoint que urvid IA. En dev pega a localhost:8000 (start.bat).
const API_URL = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:8000')
const HEADERS = { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }

// KINETIC IA · estudio del motor nuevo (src/kinetic): manifiestos tipograficos cineticos calibre AE.
// Pega un link -> el backend analiza la pagina -> makeKinetic genera un video DETERMINISTA con Style DNA
// propio (ningun video se parece a otro). Galeria propia (kinetic_videos). $0 por video: todo en tu PC.
export default function KineticStudio() {
  const { user } = useAuth()
  const [brief, setBrief] = useState({ brand: 'Nodo', rubro: 'tech', brandColor: '#22e06a', tagline: 'Automatiza lo aburrido', claim: 'Menos tareas repetitivas, mas resultados', cta: 'Probalo gratis', bullets: ['Rapido de integrar', 'Reportes en vivo', 'Soporte 24/7'], stats: [{ value: '+400', label: 'equipos lo usan' }], images: [] })
  const [seed, setSeed] = useState(1)
  const video = useMemo(() => makeKinetic(brief, { seed }), [brief, seed])
  const [playing, setPlaying] = useState(true)
  const [head, setHead] = useState(0)
  const headRef = useRef(0)
  const cvRef = useRef(null)
  const [url, setUrl] = useState('')
  const [analyzing, setAnalyzing] = useState('')
  const [exporting, setExporting] = useState('')
  const [saved, setSaved] = useState(() => { try { return JSON.parse(localStorage.getItem('kinetic.saved') || '[]') } catch { return [] } })
  const [musicId, setMusicId] = useState('')
  const [sfxOnCuts, setSfxOnCuts] = useState(true)
  const audioRef = useRef(null)   // handle de playPreview (para stop/restart en pausa/seek/wrap)

  // timeline de audio sintetico: musica LOOPEADA en clips deterministas + whoosh en cada hard-cut
  const audioClips = useMemo(() => {
    const out = []
    if (musicId) {
      const a = ASSET_BY_ID.get(musicId)
      const dur = (a && a.dur) || 2
      for (let k = 0, t = 0; t < video.duration && k < 64; k++, t += dur) out.push({ id: 'music_' + k, sfx: musicId, startSec: t, durSec: dur, gain: 0.45 })
    }
    if (sfxOnCuts) video.cutTimes.forEach((t, i) => out.push({ id: 'cut_' + i, sfx: 'whoosh', startSec: t, durSec: 0.3, gain: 0.85 }))
    return out
  }, [musicId, sfxOnCuts, video])
  const videoWithAudio = useMemo(() => audioClips.length ? { ...video, timeline: { audio: audioClips } } : video, [video, audioClips])

  const stopAudio = () => { if (audioRef.current) { try { audioRef.current.stop() } catch { /* noop */ } audioRef.current = null } }
  const startAudio = (from) => { stopAudio(); if (audioClips.length && playing) { try { audioRef.current = playPreview(videoWithAudio, from) } catch { /* noop */ } } }

  // preview EN VIVO (rAF): igual que urvid IA, con watermark solo-preview; el export sale limpio.
  useEffect(() => {
    const cv = cvRef.current; if (!cv) return
    const ctx = cv.getContext('2d')
    const DPR = Math.min(window.devicePixelRatio || 1, 2.5)
    cv.width = video.W * DPR; cv.height = video.H * DPR
    let raf, last = performance.now()
    const loop = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05); last = now
      if (playing) {
        headRef.current += dt
        if (headRef.current >= video.duration) { headRef.current -= video.duration; startAudio(0) }   // wrap: re-ancla el audio
      }
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
      drawKineticFrame(ctx, headRef.current, video)
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
      drawWatermark(ctx, video.W, video.H)
      setHead(headRef.current)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [video, playing]) // eslint-disable-line react-hooks/exhaustive-deps

  // audio de preview: arranca/para con el toggle de play y cuando cambia el timeline
  useEffect(() => { if (playing) startAudio(headRef.current); else stopAudio(); return stopAudio }, [playing, videoWithAudio]) // eslint-disable-line react-hooks/exhaustive-deps

  // galeria: Firestore al loguearse (fuente de verdad), localStorage como cache/offline
  useEffect(() => {
    if (!user?.uid) return
    let alive = true
    getDocs(collection(db, 'users', user.uid, 'kinetic_videos')).then(snap => {
      if (!alive) return
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, 24)
      if (items.length) { setSaved(items); localStorage.setItem('kinetic.saved', JSON.stringify(items)) }
    }).catch(() => { /* offline -> localStorage */ })
    return () => { alive = false }
  }, [user?.uid])

  // BRAND-KIT compartido con urvid: si el perfil tiene logo, lo usamos tambien aca
  useEffect(() => {
    if (!user?.uid) return
    let alive = true
    getDoc(doc(db, 'users', user.uid, 'urvid_profile', 'main')).then(s => { if (alive && s.exists() && s.data().logo) setBrief(b => ({ ...b, logo: s.data().logo })) }).catch(() => { /* noop */ })
    return () => { alive = false }
  }, [user?.uid])

  // ANALIZAR: mismo endpoint/brief que urvid IA; kinetic ademas consume images[] COMPLETO (polaroids/collage)
  const analyze = async (refresh = false) => {
    if (!url.trim() || analyzing === 'loading') return
    setAnalyzing('loading')
    try {
      const r = await fetch(`${API_URL}/api/urvid/perceive`, { method: 'POST', headers: HEADERS, body: JSON.stringify({ url: url.trim(), userId: user?.uid || '', refresh }) })
      const j = await r.json()
      const b = j && j.brief
      if (!b || j.error) { setAnalyzing((j && j.error) || 'No se pudo analizar la pagina'); return }
      setBrief(prev => ({
        brand: b.brand || 'Marca', rubro: b.rubro || 'default', brandColor: b.brandColor || '#5b8cff',
        tagline: b.tagline || '', claim: b.claim || '', cta: b.cta || '',
        bullets: Array.isArray(b.bullets) ? b.bullets : [], stats: Array.isArray(b.stats) ? b.stats : [],
        images: Array.isArray(j.images) ? j.images.filter(x => typeof x === 'string').slice(0, 8) : [],
        logo: prev.logo,
        audience: (b.audience && typeof b.audience === 'object') ? b.audience : undefined,
        seriousness: (typeof b.seriousness === 'number') ? b.seriousness : undefined,
        energyHint: ['alto', 'medio', 'bajo'].includes(b.energyHint) ? b.energyHint : undefined,
      }))
      setSeed(1); headRef.current = 0; setHead(0); setAnalyzing('')
    } catch {
      setAnalyzing('Backend no disponible — abri "start.bat" (corre en localhost:8000)')
    }
  }

  // OTRA VARIANTE: salto aureo de semilla (mismo patron urvid) -> DNA/guion/casting completamente nuevos
  const reroll = () => { setSeed(s => (((s || 1) + 0x9e3779b1) >>> 0) || 1); headRef.current = 0; setHead(0) }

  // EXPORT: precarga las imagenes de escena (polaroids) y exporta con el drawFrame de ESTE motor.
  const exportVideo = async () => {
    if (exporting) return
    setExporting('preparando...')
    await Promise.all((video.images || []).map(src => new Promise(res => {
      const im = new Image(); try { im.crossOrigin = 'anonymous' } catch { /* noop */ }
      im.onload = res; im.onerror = res; im.src = src; setTimeout(res, 2500)
    })))
    const ok = exportCanvasVideo(videoWithAudio, {
      filename: `${(brief.brand || 'kinetic')}-kinetic-9x16`,
      bitrate: 12e6,
      drawFrameFn: drawKineticFrame,
      onProgress: pct => setExporting(pct + '%'),
      onError: m => { setExporting(m); setTimeout(() => setExporting(''), 5000) },
      onDone: () => setExporting(''),
    })
    if (!ok) setExporting('')
  }

  // GALERIA: guarda brief+seed+receta (NUNCA mp4) — se re-renderiza identico al abrir (motor determinista)
  const save = () => {
    const id = 'v' + Date.now().toString(36)
    const cleanRecipe = JSON.parse(JSON.stringify(video.recipe))   // sanea undefined (Firestore los rechaza)
    const item = {
      id, brand: brief.brand, brandColor: brief.brandColor, rubro: brief.rubro || 'default',
      tagline: brief.tagline || '', claim: brief.claim || '', cta: brief.cta || '',
      bullets: brief.bullets || [], stats: brief.stats || [], images: brief.images || [],
      ...(brief.audience ? { audience: JSON.parse(JSON.stringify(brief.audience)) } : {}),
      ...(typeof brief.seriousness === 'number' ? { seriousness: brief.seriousness } : {}),
      ...(brief.energyHint ? { energyHint: brief.energyHint } : {}),
      recipe: cleanRecipe, seed, ...(musicId ? { musicId } : {}), sfxOnCuts, ts: Date.now(),
    }
    const next = [item, ...saved].slice(0, 24)
    setSaved(next); localStorage.setItem('kinetic.saved', JSON.stringify(next))
    if (user?.uid) { try { setDoc(doc(db, 'users', user.uid, 'kinetic_videos', id), item) } catch { /* offline */ } }
  }
  const loadSaved = (it) => {
    setBrief({ brand: it.brand, rubro: it.rubro, brandColor: it.brandColor, tagline: it.tagline, claim: it.claim, cta: it.cta, bullets: it.bullets || [], stats: it.stats || [], images: it.images || [], audience: it.audience, seriousness: it.seriousness, energyHint: it.energyHint })
    setSeed(it.seed || 1); setMusicId(it.musicId || ''); setSfxOnCuts(!!it.sfxOnCuts)
    headRef.current = 0; setHead(0)
  }
  const delSaved = (it) => {
    const next = saved.filter(x => x.id !== it.id)
    setSaved(next); localStorage.setItem('kinetic.saved', JSON.stringify(next))
    if (user?.uid) { try { deleteDoc(doc(db, 'users', user.uid, 'kinetic_videos', it.id)) } catch { /* offline */ } }
  }

  const seek = (v) => { headRef.current = v; setHead(v); if (playing) startAudio(v) }
  const dna = video.dna

  return (
    <div className={styles.wrap}>
      <div className={styles.left}>
        <h1 className={styles.title}>Kinetic <span className={styles.ia}>IA</span></h1>
        <p className={styles.sub}>Manifiestos tipograficos calibre After Effects. Pega un link: cada video sale con su propia identidad (tipografia, color, ritmo, movimiento) — nunca dos iguales.</p>

        <div className={styles.row}>
          <input className={styles.input} value={url} onChange={e => setUrl(e.target.value)} placeholder="https://tusitio.com" onKeyDown={e => e.key === 'Enter' && analyze()} />
          <button className={styles.btn} onClick={() => analyze()} disabled={analyzing === 'loading'}>{analyzing === 'loading' ? 'Analizando…' : 'Analizar'}</button>
        </div>
        {analyzing && analyzing !== 'loading' && <div className={styles.err}>{analyzing}</div>}

        <div className={styles.dna}>
          <span className={styles.chip}>{dna.pairId}</span>
          <span className={styles.chip}>{dna.colorFamily}</span>
          <span className={styles.chip}>{video.script.templateId}</span>
          <span className={styles.chip}>{Math.round(dna.bpm)} bpm</span>
          <span className={styles.chip}>{dna.garnishDialect}</span>
        </div>

        <div className={styles.row}>
          <button className={styles.btn} onClick={reroll}>Otra variante</button>
          <button className={styles.btn} onClick={save}>Guardar</button>
          <button className={`${styles.btn} ${styles.primary}`} onClick={exportVideo} disabled={!!exporting}>{exporting || 'Exportar MP4'}</button>
        </div>

        <div className={styles.row}>
          <select className={styles.input} value={musicId} onChange={e => setMusicId(e.target.value)}>
            <option value="">Sin musica</option>
            {MUSIC_LIBRARY.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <label className={styles.check}><input type="checkbox" checked={sfxOnCuts} onChange={e => setSfxOnCuts(e.target.checked)} /> SFX al corte</label>
        </div>

        <h2 className={styles.h2}>Mis videos</h2>
        <div className={styles.gallery}>
          {saved.length === 0 && <div className={styles.empty}>Todavia no guardaste videos. Genera uno y toca "Guardar".</div>}
          {saved.map(it => (
            <div key={it.id} className={styles.card}>
              <button className={styles.cardMain} onClick={() => loadSaved(it)} title="Abrir (se re-renderiza identico)">
                <span className={styles.cardDot} style={{ background: it.brandColor || '#888' }} />
                <span className={styles.cardBrand}>{it.brand}</span>
                <span className={styles.cardMeta}>{(it.recipe && it.recipe.dna && it.recipe.dna.pairId) || ''} · {(it.recipe && it.recipe.templateId) || ''}</span>
              </button>
              <button className={styles.cardDel} onClick={() => delSaved(it)} title="Borrar">×</button>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.stage}>
        <div className={styles.frame} style={{ aspectRatio: `${video.W} / ${video.H}` }}>
          <canvas ref={cvRef} className={styles.canvas} onClick={() => setPlaying(p => !p)} />
        </div>
        <div className={styles.transport}>
          <button className={styles.btn} onClick={() => setPlaying(p => !p)}>{playing ? '⏸' : '▶'}</button>
          <input type="range" min={0} max={video.duration} step={0.01} value={Math.min(head, video.duration)} onChange={e => seek(Number(e.target.value))} className={styles.scrub} />
          <span className={styles.time}>{head.toFixed(1)}s / {video.duration.toFixed(1)}s</span>
        </div>
      </div>
    </div>
  )
}
