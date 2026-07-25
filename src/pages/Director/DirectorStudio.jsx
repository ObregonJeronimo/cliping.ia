import { useEffect, useMemo, useRef, useState } from 'react'
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore'
import {
  normalizePageModel, briefToPageModel, buildGuion, deriveLook, composeStoryboard,
  compile, drawFrame, applyEdits, emptyEdits, corpusHero,
} from '../../director/index.js'
import { exportCanvasVideo } from '../../lib/exportVideo.js'
import { drawWatermark } from '../../lib/watermark.js'
import { MUSIC_LIBRARY, ASSET_BY_ID } from '../../lib/audioAssets.js'
import { playPreview } from '../../lib/audioMix.js'
import { useAuth } from '../../contexts/AuthContext'
import { db } from '../../lib/firebase'
import Timeline from './Timeline.jsx'
import Inspector from './Inspector.jsx'
import styles from './DirectorStudio.module.css'

// Backend (perception): MISMO endpoint que urvid IA / Kinetic. En dev pega a localhost:8000 (start.bat).
const API_URL = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:8000')
const HEADERS = { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }

// El motor mide los objetos heroe en un canvas OFFSCREEN (draw.js -> medirObjeto). En Node se lo da
// @napi-rs/canvas; en el browser lo damos nosotros. Si falta, el renderer cae a una tabla nominal y
// los objetos quedan desencuadrados -> siempre se pasa este makeCanvas.
const makeCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c }

// PAGEMODEL DEMO: el estudio tiene que verse VIVO al entrar (antes de analizar nada). Es el mismo
// formato que emite el backend, asi que entra por normalizePageModel igual que una pagina real.
const DEMO = normalizePageModel({
  brand: 'Urvid',
  url: 'https://urvid.app',
  captura: { estado: 'ok', confianza: 0.9 },
  dna: {
    palette: { accent: '#7c5cff', bg: '#0a0a0d', inkOnBg: '#f2f0ea' },
    typography: { displayHint: 'grotesk', bodyHint: 'grotesk', caseHint: 'sentence' },
    shape: { radius: 14, radiusRatio: 0.06, borderStyle: 'hairline', shadowStyle: 'soft' },
    density: { nivel: 'medio', score: 0.42, fill: 0.3, nodos: 46 },
    mood: { calidez: 0.42, formalidad: 0.48, energia: 0.62 },
    modernidad: ['bigtype', 'bento'],
  },
  semantica: {
    queHace: 'Convertimos cualquier link en un reel vertical listo para publicar',
    comoFunciona: ['Pegas el link', 'La IA lee la pagina', 'Descargas el reel'],
    tipoNegocio: 'saas', modeloUso: 'suscripcion',
    features: [
      { titulo: 'Lee tu web sola', detalle: 'Sin cargar nada a mano' },
      { titulo: 'Guion con sentido', detalle: 'Escenas que cuentan algo' },
      { titulo: 'Edicion total', detalle: 'Tocas cualquier capa' },
      { titulo: 'Export 1080x1920', detalle: 'MP4 listo para subir' },
    ],
    pruebas: { stats: [{ valor: '9:16', etiqueta: 'listo para reels' }] },
    cta: 'Probalo gratis',
    idioma: 'es',
  },
  assets: { images: [] },
})

// ESTUDIO DIRECTOR — el editor del motor storyboard-first (src/director). Pega un link, el backend
// devuelve el pagemodel, y el motor arma guion -> look -> storyboard -> timeline de keyframes. Todo lo
// que se ve aca es DETERMINISTA: mismo pagemodel + mismo seed + mismos edits = el mismo video.
export default function DirectorStudio() {
  const { user } = useAuth()
  const [pm, setPm] = useState(DEMO)
  const [seed, setSeed] = useState(1)
  const [edits, setEdits] = useState(() => emptyEdits())
  const [url, setUrl] = useState('')
  const [analyzing, setAnalyzing] = useState('')
  const [exporting, setExporting] = useState('')
  const [playing, setPlaying] = useState(true)
  const [head, setHead] = useState(0)
  const [selected, setSelected] = useState('')
  const [zoom, setZoom] = useState(64)                 // pixeles por segundo de la timeline
  const [musicId, setMusicId] = useState('')
  const [sfxOnCuts, setSfxOnCuts] = useState(true)
  const [saved, setSaved] = useState(() => { try { return JSON.parse(localStorage.getItem('director.saved') || '[]') } catch { return [] } })
  const headRef = useRef(0)
  const cvRef = useRef(null)
  const audioRef = useRef(null)                        // handle de playPreview (stop/restart en pausa/seek/wrap)
  const imagesRef = useRef(new Map())                  // url -> Image ya decodeada (el motor NO hace fetch)
  const imagesReady = useRef(Promise.resolve())

  // --- CADENA DEL MOTOR: cada eslabon es puro, asi que un useMemo por paso alcanza para que solo se
  // recalcule lo que cambio. Editar una capa NO vuelve a correr el guionista ni el look.
  const guion = useMemo(() => buildGuion(pm, seed), [pm, seed])
  const look = useMemo(() => deriveLook(pm, seed), [pm, seed])
  const sbBase = useMemo(() => composeStoryboard(pm, guion, look, seed), [pm, guion, look, seed])
  // regla del overlay: una edicion invalida jamas puede romper el render -> si applyEdits explota,
  // se dibuja el storyboard SIN editar en vez de dejar la pagina en blanco.
  const sb = useMemo(() => { try { return applyEdits(sbBase, edits) } catch { return sbBase } }, [sbBase, edits])
  const tl = useMemo(() => compile(sb, seed), [sb, seed])

  // --- IMAGENES: el renderer las quiere ya decodeadas en un Map. Se precargan al cambiar el pagemodel;
  // onerror/timeout resuelven igual (una foto rota no puede colgar el preview ni el export).
  // 18 y no 12: es el tope que conserva normalizePageModel, y el guionista puede elegir CUALQUIERA de
  // ellas segun el seed. Precargando solo las primeras 12, un seed que eligiera la 15 dibujaba un
  // hueco gris — en el preview y en el MP4. Se precargan todas: cambiar de variante no vuelve a bajar
  // nada, y la foto que el storyboard referencie siempre esta en el Map.
  const imgUrls = useMemo(() => (pm.assets.images || []).map(i => i.url).filter(Boolean).slice(0, 18), [pm])
  const imgKey = imgUrls.join('|')
  useEffect(() => {
    const map = new Map()
    imagesRef.current = map
    imagesReady.current = Promise.all(imgUrls.map(src => new Promise(res => {
      const im = new Image()
      try { im.crossOrigin = 'anonymous' } catch { /* noop */ }
      im.onload = () => { map.set(src, im); res() }
      im.onerror = res
      im.src = src
      setTimeout(res, 2500)
    })))
  }, [imgKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // --- AUDIO: musica LOOPEADA en clips deterministas + whoosh en cada corte de escena (los t0 de las
  // escenas 2..n son, por definicion, los instantes de corte).
  // CORPUS: lo que la pagina DIJO. El objeto heroe solo puede escribir esto adentro (si no, dibuja
  // porcentajes salidos del seed sobre la marca del cliente).
  const corpus = useMemo(() => corpusHero(pm), [pm])
  const cortes = useMemo(() => tl.escenas.slice(1).map(e => e.t0), [tl])
  const audioClips = useMemo(() => {
    const out = []
    if (musicId) {
      const a = ASSET_BY_ID.get(musicId)
      const d = (a && a.dur) || 2
      for (let k = 0, t = 0; t < tl.dur && k < 64; k++, t += d) out.push({ id: 'music_' + k, sfx: musicId, startSec: t, durSec: d, gain: 0.45 })
    }
    if (sfxOnCuts) cortes.forEach((t, i) => out.push({ id: 'cut_' + i, sfx: 'whoosh', startSec: t, durSec: 0.3, gain: 0.85 }))
    return out
  }, [musicId, sfxOnCuts, cortes, tl.dur])
  // adaptador al contrato de lib/exportVideo + lib/audioMix: { W, H, duration, timeline.audio }
  const videoExp = useMemo(() => ({
    W: tl.canvas.W, H: tl.canvas.H, duration: tl.dur,
    ...(audioClips.length ? { timeline: { audio: audioClips } } : {}),
  }), [tl, audioClips])

  const stopAudio = () => { if (audioRef.current) { try { audioRef.current.stop() } catch { /* noop */ } audioRef.current = null } }
  const startAudio = (from) => { stopAudio(); if (audioClips.length && playing) { try { audioRef.current = playPreview(videoExp, from) } catch { /* noop */ } } }
  // El bucle de rAF vive en un efecto que NO depende del audio (si dependiera, cambiar la musica
  // reiniciaria el video). Pero entonces la funcion que el bucle capturo es la del render en que se
  // creo: al dar la vuelta, re-agendaba la pista VIEJA y el cambio de musica se revertia solo. El ref
  // se actualiza en cada render, asi que el bucle siempre llama a la version actual.
  const startAudioRef = useRef(startAudio)
  startAudioRef.current = startAudio

  // --- PREVIEW EN VIVO (rAF): mismo patron que Kinetic. El watermark va SOLO aca; el export sale limpio.
  useEffect(() => {
    const cv = cvRef.current; if (!cv) return
    const ctx = cv.getContext('2d')
    const W = tl.canvas.W, H = tl.canvas.H
    const DPR = Math.min(window.devicePixelRatio || 1, 2.5)
    cv.width = W * DPR; cv.height = H * DPR
    let raf, last = performance.now()
    const loop = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05); last = now
      if (playing) {
        headRef.current += dt
        if (headRef.current >= tl.dur) { headRef.current -= tl.dur; startAudioRef.current(0) }   // wrap: re-ancla el audio
      }
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
      drawFrame(ctx, tl, headRef.current, { W, H, makeCanvas, brand: pm.brand, images: imagesRef.current, corpus })
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
      drawWatermark(ctx, W, H)
      setHead(headRef.current)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [tl, playing, corpus]) // eslint-disable-line react-hooks/exhaustive-deps

  // el head no puede quedar fuera del video cuando una edicion acorta la duracion
  useEffect(() => { if (headRef.current > tl.dur) { headRef.current = 0; setHead(0) } }, [tl.dur])

  useEffect(() => { if (playing) startAudio(headRef.current); else stopAudio(); return stopAudio }, [playing, videoExp]) // eslint-disable-line react-hooks/exhaustive-deps

  // --- GALERIA: Firestore al loguearse (fuente de verdad), localStorage como cache/offline
  useEffect(() => {
    if (!user?.uid) return
    let alive = true
    getDocs(collection(db, 'users', user.uid, 'director_videos')).then(snap => {
      if (!alive) return
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, 24)
      if (items.length) { setSaved(items); localStorage.setItem('director.saved', JSON.stringify(items)) }
    }).catch(() => { /* offline -> localStorage */ })
    return () => { alive = false }
  }, [user?.uid])

  // --- ANALIZAR: el backend nuevo devuelve `pagemodel`; el viejo solo `brief`. Los dos tienen que
  // funcionar, asi que si no hay pagemodel se adapta el brief legacy y despues se normaliza igual.
  const analyze = async (refresh = false) => {
    if (!url.trim() || analyzing === 'loading') return
    setAnalyzing('loading')
    try {
      const r = await fetch(`${API_URL}/api/urvid/perceive`, { method: 'POST', headers: HEADERS, body: JSON.stringify({ url: url.trim(), userId: user?.uid || '', refresh }) })
      const j = await r.json()
      if (!j || j.error) { setAnalyzing((j && j.error) || 'No se pudo analizar la pagina'); return }
      if (!j.pagemodel && !j.brief) { setAnalyzing('No se pudo analizar la pagina'); return }
      const crudo = j.pagemodel ? j.pagemodel : briefToPageModel({ ...j.brief, url: url.trim(), images: Array.isArray(j.images) ? j.images : [] })
      setPm(normalizePageModel({ ...crudo, url: crudo.url || url.trim() }))
      setSeed(1); setEdits(emptyEdits()); setSelected('')
      headRef.current = 0; setHead(0); setAnalyzing('')
    } catch {
      setAnalyzing('Backend no disponible — abri "start.bat" (corre en localhost:8000)')
    }
  }

  // OTRA VARIANTE: salto aureo de semilla (mismo patron que urvid/kinetic) -> guion, look y montaje
  // completamente nuevos. Las ediciones se limpian porque apuntan a ids de capa que ya no existen.
  const reroll = () => {
    setSeed(s => (((s || 1) + 0x9e3779b1) >>> 0) || 1)
    setEdits(emptyEdits()); setSelected('')
    headRef.current = 0; setHead(0)
  }

  // --- EXPORT: dibuja con el drawFrame de ESTE motor sobre la timeline actual (ya editada).
  const exportVideo = async () => {
    if (exporting) return
    setExporting('preparando...')
    // EL PREVIEW SE PARA. No es cosmetico: el camino de respaldo del export (MediaRecorder) captura en
    // TIEMPO REAL, asi que dibujar ademas el preview en cada frame le pelea el hilo principal y sale
    // un MP4 con la cadencia irregular. Y de paso no se escucha la musica del preview encima.
    setPlaying(false)
    stopAudio()
    const restaurar = () => { setExporting(''); setPlaying(true) }
    await imagesReady.current                       // sin esto el MP4 puede salir con huecos donde van las fotos
    const opts = { W: tl.canvas.W, H: tl.canvas.H, makeCanvas, brand: pm.brand, images: imagesRef.current, corpus }
    const ok = exportCanvasVideo(videoExp, {
      filename: `${pm.brand || 'director'}-director-9x16`,
      bitrate: 12e6,
      drawFrameFn: (ctx, t) => drawFrame(ctx, tl, t, opts),
      onProgress: pct => setExporting(pct + '%'),
      onError: m => { setExporting(m); setPlaying(true); setTimeout(() => setExporting(''), 5000) },
      onDone: restaurar,
    })
    if (!ok) restaurar()
  }

  // --- GUARDAR: pagemodel + seed + edits. NUNCA el MP4: el motor es determinista y lo re-renderiza
  // identico. JSON.parse(JSON.stringify(...)) saca los undefined (Firestore los rechaza).
  const save = () => {
    const id = 'd' + Date.now().toString(36)
    const item = JSON.parse(JSON.stringify({ id, brand: pm.brand, url: pm.url || '', pagemodel: pm, seed, edits, ts: Date.now() }))
    const next = [item, ...saved].slice(0, 24)
    setSaved(next); localStorage.setItem('director.saved', JSON.stringify(next))
    // .catch y no try/catch: setDoc devuelve una promesa, asi que sin red el rechazo NO pasa por el
    // try sincronico y sale como unhandled rejection. La galeria local ya quedo guardada igual.
    if (user?.uid) setDoc(doc(db, 'users', user.uid, 'director_videos', id), item).catch(() => { /* offline */ })
  }
  const loadSaved = (it) => {
    setPm(normalizePageModel(it.pagemodel))
    setSeed(it.seed || 1)
    setEdits(it.edits && it.edits.v ? it.edits : emptyEdits())
    setSelected(''); headRef.current = 0; setHead(0)
  }
  const delSaved = (it) => {
    const next = saved.filter(x => x.id !== it.id)
    setSaved(next); localStorage.setItem('director.saved', JSON.stringify(next))
    if (user?.uid) deleteDoc(doc(db, 'users', user.uid, 'director_videos', it.id)).catch(() => { /* offline */ })
  }

  const seek = (v) => { const t = Math.max(0, Math.min(tl.dur, v)); headRef.current = t; setHead(t); if (playing) startAudio(t) }

  // --- EDICIONES (overlay E1). Todo lo que toca el Inspector entra por aca; el estado es un objeto
  // plano y serializable, que es exactamente lo que se guarda en la galeria.
  // una entrada solo sobrevive si edita ALGO: null, `oculta:false` y `size:1` son "sin cambios" y se
  // descartan para que el contador del Inspector no mienta. `text:''` SI es una edicion (vacia el
  // texto, y el overlay oculta la capa en vez de dibujar un renglon en blanco).
  const limpio = (o) => {
    const out = {}
    for (const k of Object.keys(o)) {
      const v = o[k]
      if (v == null || v === false) continue
      if (v === '' && k !== 'text') continue
      if (k === 'size' && v === 1) continue
      out[k] = v
    }
    return out
  }
  const onEdit = (key, patch) => setEdits(e => {
    const capas = { ...e.capas }
    const next = limpio({ ...(capas[key] || {}), ...patch })
    if (Object.keys(next).length) capas[key] = next; else delete capas[key]
    return { ...e, capas }
  })
  const onDur = (sceneId, segs) => setEdits(e => ({ ...e, escenas: { ...e.escenas, [sceneId]: { dur: segs } } }))
  const onReorder = (orden) => setEdits(e => ({ ...e, orden }))
  const onLook = (patch) => setEdits(e => ({ ...e, look: { ...e.look, ...patch } }))
  const onReset = () => { setEdits(emptyEdits()); setSelected('') }

  const objetos = (sb.rubro || []).join(' · ')

  return (
    <div className={styles.wrap}>
      <div className={styles.top}>
        <div className={styles.left}>
          <h1 className={styles.title}>Director <span className={styles.ia}>IA</span></h1>
          <p className={styles.sub}>Storyboard primero: la pagina se lee, se escribe un guion con sentido, se componen escenas estaticas y recien despues se anima. Todo editable, todo determinista.</p>

          <div className={styles.row}>
            <input className={styles.input} value={url} onChange={e => setUrl(e.target.value)} placeholder="https://tusitio.com" onKeyDown={e => e.key === 'Enter' && analyze()} />
            <button className={styles.btn} onClick={() => analyze()} disabled={analyzing === 'loading'}>{analyzing === 'loading' ? 'Analizando…' : 'Analizar'}</button>
          </div>
          {analyzing && analyzing !== 'loading' && <div className={styles.err}>{analyzing}</div>}

          <div className={styles.dna}>
            <span className={styles.chip} title="gramatica del guion">✦ {guion.gramatica}</span>
            {guion.sesgos.map(s => <span key={s} className={styles.chip} title="sesgo de modernidad">◎ {s}</span>)}
            <span className={styles.chip} title="familia de placa">● {sb.look.placa}</span>
            <span className={styles.chip} title="tipografia display / apoyo">{sb.look.fonts.display} / {sb.look.fonts.support}</span>
            {objetos && <span className={styles.chip} title="objetos heroe del rubro">{objetos}</span>}
            <span className={styles.chip}>{tl.dur.toFixed(1)}s · {sb.scenes.length} escenas</span>
          </div>
          <div className={styles.cortes}>
            <span className={styles.cortesLbl}>cortes</span>
            {tl.links.length ? tl.links.map((l, i) => <span key={i} className={styles.corte}>{l}</span>) : <span className={styles.corte}>—</span>}
          </div>

          <div className={styles.row}>
            <button className={styles.btn} onClick={reroll} title="Nueva semilla: otro guion, otro look, otro montaje. Se pierden las ediciones.">Otra variante</button>
            <button className={styles.btn} onClick={save} title="Guarda pagemodel + seed + ediciones (no el MP4)">Guardar</button>
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
                  <span className={styles.cardDot} style={{ background: (it.pagemodel && it.pagemodel.dna && it.pagemodel.dna.palette.accent) || '#888' }} />
                  <span className={styles.cardBrand}>{it.brand}</span>
                  <span className={styles.cardMeta}>seed {it.seed}</span>
                </button>
                <button className={styles.cardDel} onClick={() => delSaved(it)} title="Borrar">×</button>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.stage}>
          <div className={styles.frame} style={{ aspectRatio: `${tl.canvas.W} / ${tl.canvas.H}` }}>
            <canvas ref={cvRef} className={styles.canvas} onClick={() => setPlaying(p => !p)} />
          </div>
          <div className={styles.transport}>
            <button className={styles.btn} onClick={() => setPlaying(p => !p)}>{playing ? '⏸' : '▶'}</button>
            <input type="range" min={0} max={tl.dur} step={0.01} value={Math.min(head, tl.dur)} onChange={e => seek(Number(e.target.value))} className={styles.scrub} />
            <span className={styles.time}>{head.toFixed(1)}s / {tl.dur.toFixed(1)}s</span>
          </div>
        </div>

        <div className={styles.right}>
          <Inspector
            sb={sb} sbBase={sbBase} tl={tl} selected={selected} edits={edits} look={sb.look}
            onEdit={onEdit} onReorder={onReorder} onDur={onDur} onLook={onLook} onReset={onReset}
          />
        </div>
      </div>

      <div className={styles.bottom}>
        <Timeline tl={tl} head={head} onSeek={seek} selected={selected} onSelect={setSelected} zoom={zoom} onZoom={setZoom} />
      </div>
    </div>
  )
}
