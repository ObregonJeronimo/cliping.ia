import { useEffect, useRef, useState, useMemo } from 'react'
import { collection, getDocs, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore'
import { makeMotionVideo, drawMotionFrame } from '../../aemotion/index.js'
import { makeFxVideo, drawFxFrame } from '../../motionfx/index.js'
import { exportCanvasVideo } from '../../lib/exportVideo.js'
import { drawWatermark } from '../../lib/watermark.js'
import { MUSIC_LIBRARY, ASSET_BY_ID } from '../../lib/audioAssets.js'
import { playPreview } from '../../lib/audioMix.js'
import { useAuth } from '../../contexts/AuthContext'
import { db } from '../../lib/firebase'
import { loadRemoved } from '../../lib/contentLibrary'
import styles from './MotionStudio.module.css'

// Backend (perception): MISMO endpoint que urvid IA. En dev pega a localhost:8000 (start.bat).
const API_URL = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:8000')
const HEADERS = { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }

// MOTION IA · estudio del motor aemotion (src/aemotion): motion graphics calibre After Effects —
// morphing, liquid, trim paths, text animators, motion blur real. 5 familias visuales de diseno:
// cada video sale con SU sistema (orbital / editorial / liquid pop / blueprint / poster), nunca dos
// iguales. Determinista: brief+seed -> siempre el mismo video. Galeria propia (aemotion_videos).
export default function MotionStudio() {
  const { user } = useAuth()
  const [brief, setBrief] = useState({ brand: 'Nodo', rubro: 'tech', brandColor: '#22e06a', tagline: 'Automatiza lo aburrido', claim: 'Menos tareas repetitivas, mas resultados', cta: 'Probalo gratis', bullets: ['Rapido de integrar', 'Reportes en vivo', 'Soporte 24/7'], stats: [{ value: '+400', label: 'equipos lo usan' }] })
  const [seed, setSeed] = useState(1)
  // curacion admin (Biblioteca): el contenido eliminado no se usa al generar. Vacio -> comportamiento normal.
  // Los ids vienen namespaceados por motor ('motion|...'); acepta tambien ids legacy sin prefijo.
  const [removedRaw, setRemovedRaw] = useState(() => new Set())
  useEffect(() => { loadRemoved().then(setRemovedRaw) }, [])
  const disabled = useMemo(() => new Set([...removedRaw]
    .filter(id => id.startsWith('motion|') || !id.includes('|'))
    .map(id => id.startsWith('motion|') ? id.slice(7) : id)), [removedRaw])
  // MOTOR de animación: 'motion' = aemotion actual (5 familias) | 'fx' = FX Kinético (animaciones FX de la
  // Biblioteca + entradas de texto nuevas + transiciones enérgicas). Selector abajo.
  const [engineMode, setEngineMode] = useState('motion')
  const video = useMemo(() => engineMode === 'fx' ? makeFxVideo(brief, { seed, disabled }) : makeMotionVideo(brief, { seed, disabled }), [brief, seed, disabled, engineMode])
  const drawFrame = engineMode === 'fx' ? drawFxFrame : drawMotionFrame
  const [playing, setPlaying] = useState(true)
  const [head, setHead] = useState(0)
  const headRef = useRef(0)
  const cvRef = useRef(null)
  const [url, setUrl] = useState('')
  const [analyzing, setAnalyzing] = useState('')
  const [exporting, setExporting] = useState('')
  const [saved, setSaved] = useState(() => { try { return JSON.parse(localStorage.getItem('aemotion.saved') || '[]') } catch { return [] } })
  const [musicId, setMusicId] = useState('')
  const [sfxOnCuts, setSfxOnCuts] = useState(false)   // opt-in: el whoosh en cada corte molestaba por defecto
  const audioRef = useRef(null)

  // timeline de audio sintetico: musica loopeada + whoosh en cada hard-cut (mismo patron kinetic)
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

  // preview EN VIVO (rAF) con watermark solo-preview; el export sale limpio
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
        if (headRef.current >= video.duration) { headRef.current -= video.duration; startAudio(0) }
      }
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
      drawFrame(ctx, headRef.current, video)
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
      drawWatermark(ctx, video.W, video.H)
      setHead(headRef.current)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [video, playing]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (playing) startAudio(headRef.current); else stopAudio(); return stopAudio }, [playing, videoWithAudio]) // eslint-disable-line react-hooks/exhaustive-deps

  // galeria: Firestore al loguearse, localStorage como cache/offline
  useEffect(() => {
    if (!user?.uid) return
    let alive = true
    getDocs(collection(db, 'users', user.uid, 'aemotion_videos')).then(snap => {
      if (!alive) return
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, 24)
      if (items.length) { setSaved(items); localStorage.setItem('aemotion.saved', JSON.stringify(items)) }
    }).catch(() => { /* offline -> localStorage */ })
    return () => { alive = false }
  }, [user?.uid])

  // ANALIZAR: mismo endpoint/brief que urvid IA
  const analyze = async (refresh = false) => {
    if (!url.trim() || analyzing === 'loading') return
    setAnalyzing('loading')
    try {
      const r = await fetch(`${API_URL}/api/urvid/perceive`, { method: 'POST', headers: HEADERS, body: JSON.stringify({ url: url.trim(), userId: user?.uid || '', refresh }) })
      const j = await r.json()
      const b = j && j.brief
      if (!b || j.error) { setAnalyzing((j && j.error) || 'No se pudo analizar la pagina'); return }
      setBrief({
        brand: b.brand || 'Marca', rubro: b.rubro || 'default', brandColor: b.brandColor || '#5b8cff',
        tagline: b.tagline || '', claim: b.claim || '', cta: b.cta || '',
        bullets: Array.isArray(b.bullets) ? b.bullets : [], stats: Array.isArray(b.stats) ? b.stats : [],
        images: Array.isArray(j.images) ? j.images.filter(x => typeof x === 'string').slice(0, 8) : [],
        audience: (b.audience && typeof b.audience === 'object') ? b.audience : undefined,
        seriousness: (typeof b.seriousness === 'number') ? b.seriousness : undefined,
        energyHint: ['alto', 'medio', 'bajo'].includes(b.energyHint) ? b.energyHint : undefined,
      })
      setSeed(1); headRef.current = 0; setHead(0); setAnalyzing('')
    } catch {
      setAnalyzing('Backend no disponible — abri "start.bat" (corre en localhost:8000)')
    }
  }

  // OTRA VARIANTE: salto aureo de semilla -> familia/paleta/guion/casting nuevos
  const reroll = () => { setSeed(s => (((s || 1) + 0x9e3779b1) >>> 0) || 1); headRef.current = 0; setHead(0) }

  const exportVideo = async () => {
    if (exporting) return
    setExporting('preparando...')
    // precargar las imagenes de escena antes de renderizar (sin esto la photocard sale en fallback)
    await Promise.all((video.images || []).map(src => new Promise(res => {
      const im = new Image(); try { im.crossOrigin = 'anonymous' } catch { /* noop */ }
      im.onload = res; im.onerror = res; im.src = src; setTimeout(res, 2500)
    })))
    const ok = exportCanvasVideo(videoWithAudio, {
      filename: `${(brief.brand || 'motion')}-motion-9x16`,
      bitrate: 12e6,
      drawFrameFn: drawFrame,
      onProgress: pct => setExporting(pct + '%'),
      onError: m => { setExporting(m); setTimeout(() => setExporting(''), 5000) },
      onDone: () => setExporting(''),
    })
    if (!ok) setExporting('')
  }

  // GALERIA: guarda brief+seed+receta (NUNCA mp4) — se re-renderiza identico al abrir
  const save = () => {
    const id = 'v' + Date.now().toString(36)
    const cleanRecipe = JSON.parse(JSON.stringify(video.recipe))
    const item = {
      id, brand: brief.brand, brandColor: brief.brandColor, rubro: brief.rubro || 'default',
      tagline: brief.tagline || '', claim: brief.claim || '', cta: brief.cta || '',
      bullets: brief.bullets || [], stats: brief.stats || [], images: brief.images || [],
      ...(brief.audience ? { audience: JSON.parse(JSON.stringify(brief.audience)) } : {}),
      ...(typeof brief.seriousness === 'number' ? { seriousness: brief.seriousness } : {}),
      ...(brief.energyHint ? { energyHint: brief.energyHint } : {}),
      recipe: cleanRecipe, seed, engineMode, ...(musicId ? { musicId } : {}), sfxOnCuts, ts: Date.now(),
    }
    const next = [item, ...saved].slice(0, 24)
    setSaved(next); localStorage.setItem('aemotion.saved', JSON.stringify(next))
    if (user?.uid) { try { setDoc(doc(db, 'users', user.uid, 'aemotion_videos', id), item) } catch { /* offline */ } }
  }
  const loadSaved = (it) => {
    setBrief({ brand: it.brand, rubro: it.rubro, brandColor: it.brandColor, tagline: it.tagline, claim: it.claim, cta: it.cta, bullets: it.bullets || [], stats: it.stats || [], images: it.images || [], audience: it.audience, seriousness: it.seriousness, energyHint: it.energyHint })
    setSeed(it.seed || 1); setMusicId(it.musicId || ''); setSfxOnCuts(!!it.sfxOnCuts); setEngineMode(it.engineMode || 'motion')
    headRef.current = 0; setHead(0)
  }
  const delSaved = (it) => {
    const next = saved.filter(x => x.id !== it.id)
    setSaved(next); localStorage.setItem('aemotion.saved', JSON.stringify(next))
    if (user?.uid) { try { deleteDoc(doc(db, 'users', user.uid, 'aemotion_videos', it.id)) } catch { /* offline */ } }
  }

  const seek = (v) => { headRef.current = v; setHead(v); if (playing) startAudio(v) }
  const dna = video.dna

  return (
    <div className={styles.wrap}>
      <div className={styles.left}>
        <h1 className={styles.title}>Motion <span className={styles.ia}>IA</span></h1>
        <p className={styles.sub}>Motion graphics calibre After Effects: morphing, liquid, trim paths, text animators y motion blur real. 5 sistemas de diseno distintos — cada video sale con identidad propia, nunca dos iguales.</p>

        <div className={styles.row}>
          <input className={styles.input} value={url} onChange={e => setUrl(e.target.value)} placeholder="https://tusitio.com" onKeyDown={e => e.key === 'Enter' && analyze()} />
          <button className={styles.btn} onClick={() => analyze()} disabled={analyzing === 'loading'}>{analyzing === 'loading' ? 'Analizando…' : 'Analizar'}</button>
        </div>
        {analyzing && analyzing !== 'loading' && <div className={styles.err}>{analyzing}</div>}

        <div className={styles.dna}>
          <span className={styles.chip}>{dna.familia}</span>
          <span className={styles.chip}>{dna.pairId}</span>
          <span className={styles.chip}>{dna.shapeDialect}</span>
          <span className={styles.chip}>{video.script.templateId}</span>
          <span className={styles.chip}>{Math.round(dna.bpm)} bpm</span>
        </div>

        <div className={styles.row}>
          <select className={styles.input} value={engineMode} onChange={e => { setEngineMode(e.target.value); headRef.current = 0; setHead(0) }} title="Motor de animación">
            <option value="motion">Animaciones: Motion IA (actual)</option>
            <option value="fx">Animaciones: FX Kinético (nuevo)</option>
          </select>
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
                <span className={styles.cardMeta}>{(it.recipe && it.recipe.dna && it.recipe.dna.familia) || ''} · {(it.recipe && it.recipe.templateId) || ''}</span>
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
