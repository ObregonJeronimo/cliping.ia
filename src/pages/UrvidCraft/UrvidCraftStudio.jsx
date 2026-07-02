import { useEffect, useMemo, useRef, useState } from 'react'
import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore'
import { makeVideo, drawFrame } from '../../urvid/index.js'
import { exportCanvasVideo } from '../../lib/exportVideo.js'
import { estimateTokens } from '../../lib/tokens.js'
import { applyTimeline, identityOrder, makeTextOverlay, patchOverlay, finalizeRecording } from '../../lib/timeline.js'
import Timeline from './Timeline.jsx'
import OverlayEditor from './OverlayEditor.jsx'
import SfxEditor from './SfxEditor.jsx'
import { SFX, sfxBuffer } from '../../lib/sfxLib.js'
import { playPreview } from '../../lib/audioMix.js'
import { useAuth } from '../../contexts/AuthContext'
import { db } from '../../lib/firebase'
import OptionGrid from './OptionGrid.jsx'
import EffectPreview from './EffectPreview.jsx'
import LayoutPreview from './LayoutPreview.jsx'
import Collapsible from './Collapsible.jsx'
import { optionsFor, allSceneOptions, categoryOf, topCategoryOfScene, shortId, SLOT_LIB } from './craftLib.js'
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
const DRAFT_KEY = 'urvidcraft.draft'   // el wizard PERSISTE (brief+picks+seed+paso) -> retoma donde quedaste. Solo datos, re-renderiza determinista.
const SAVED_KEY = 'urvidcraft.saved'   // "Mis videos" de advanced — SEPARADO de urvid IA (que usa urvid1.saved)
const SAVED_COL = 'urvidcraft_videos'  // coleccion Firestore propia de advanced (urvid IA usa urvid_videos)
const newSeed = () => (Math.floor((typeof performance !== 'undefined' ? performance.now() : 1) * 1000) >>> 0) || 1

// iconos de las tabs del rail (line-icons SVG, heredan el color de la tab via currentColor) — reemplazan los emojis.
const _ic = (d) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
const ICONS = {
  datos: _ic(<><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.6 2.7 2.6 15.3 0 18M12 3c-2.6 2.7-2.6 15.3 0 18" /></>),
  estilo: _ic(<path d="M12 3s6 6.4 6 10a6 6 0 1 1-12 0c0-3.6 6-10 6-10z" />),
  fondo: _ic(<><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9.5" r="1.5" /><path d="M21 16l-5-5-8 8" /></>),
  escenas: _ic(<><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M8 4v16M16 4v16M3 9h5M3 15h5M16 9h5M16 15h5" /></>),
  cierre: _ic(<path d="M5 21V4M5 4h11l-2 3.5L16 11H5" />),
  avanzado: _ic(<><path d="M5 8h9M18 8h1M5 12h1M9 12h10M5 16h6M15 16h4" /><circle cx="16" cy="8" r="2" /><circle cx="7.5" cy="12" r="2" /><circle cx="13" cy="16" r="2" /></>),
  animaciones: _ic(<path d="M5 6V5h14v1M12 5v14M9 19h6" />),
  sfx: _ic(<><path d="M11 5L6 9H3v6h3l5 4z" /><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 6a9 9 0 0 1 0 12" /></>),
  guardados: _ic(<path d="M6 3h12v18l-6-4-6 4z" />),
}

export default function UrvidCraftStudio() {
  const { user } = useAuth()
  // BORRADOR persistido (se lee UNA vez): retoma brief+picks+seed+paso si volves al wizard.
  const [d0] = useState(() => { try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null') } catch { return null } })
  const [brief, setBrief] = useState(() => (d0 && d0.brief ? { ...BRIEF0, ...d0.brief } : BRIEF0))
  // picks = elecciones EXPLICITAS del usuario por slot ({color, type, bg, ...}, null = quitar opcional) + scenes:{[beat]:id}.
  // La receta AUTO de base se MERGEA con los picks -> receta COMPLETA, que se pasa como lockRecipe (pinea TODO, incl. escenas).
  const [picks, setPicks] = useState(() => (d0 && d0.picks) || {})
  const [seed, setSeed] = useState(() => (d0 && d0.seed) || newSeed())  // FIJO toda la sesion -> ir/volver estable
  const [step, setStep] = useState(() => (d0 && d0.step) || 0)
  const [url, setUrl] = useState(() => (d0 && d0.url) || '')
  const [analyzing, setAnalyzing] = useState('')  // '' | 'loading' | mensaje de error
  const [analyzed, setAnalyzed] = useState(() => !!(d0 && d0.analyzed))
  const [exporting, setExporting] = useState('')  // '' | 'NN%' | error
  const [savedMsg, setSavedMsg] = useState('')
  // "Mis videos" de advanced (almacen propio). Cache local inmediato + Firestore (coleccion separada) como fuente de verdad.
  const [saved, setSaved] = useState(() => { try { return JSON.parse(localStorage.getItem(SAVED_KEY) || '[]') } catch { return [] } })

  // receta AUTO de base (deterministica por brief+seed). El usuario la edita con `picks`; el resto queda auto y ESTABLE.
  const baseRecipe = useMemo(() => makeVideo({ ...brief, brand: brief.brand || 'Tu marca', seed }).recipe, [brief, seed])
  const fullRecipe = useMemo(() => {
    const r = { ...baseRecipe }
    for (const k of Object.keys(picks)) { if (k !== 'scenes') r[k] = picks[k] }   // null = quitar un opcional
    if (picks.scenes) r.scenes = baseRecipe.scenes.map((s, i) => (picks.scenes[i] || s))
    return r
  }, [baseRecipe, picks])
  // VIDEO en vivo: receta completa LOCKEADA (pinea cada slot elegido + los auto). Determinista.
  const baseVideo = useMemo(() => makeVideo({ ...brief, brand: brief.brand || 'Tu marca', seed, lockRecipe: fullRecipe }), [brief, seed, fullRecipe])
  // TIMELINE (Fase 1): `order` = permutacion de las escenas base editada por el usuario. Se reconcilia a identidad si cambia
  // la CANTIDAD de escenas (ej cambiar duracion); si solo cambia el contenido, se conserva. applyTimeline reordena + recalcula
  // los starts (fail-safe al base si el orden no es valido). El preview y el export usan `video` -> ambos reflejan el reorden.
  // DOCUMENTO del timeline (Fase 2+): { order, sceneText:{baseIdx:{campo:valor}}, overlays[], audio[] }. Serializable ->
  // se persiste con el video (draft + Firestore). order se reconcilia a identidad si cambia la CANTIDAD de escenas.
  const [tl, setTl] = useState(() => { const t = (d0 && d0.timeline) || {}; return { v: 1, order: t.order || [], sceneText: t.sceneText || {}, overlays: t.overlays || [], audio: t.audio || [] } })
  useEffect(() => { setTl(t => (t.order.length === baseVideo.scenes.length ? t : { ...t, order: identityOrder(baseVideo.scenes.length) })) }, [baseVideo])
  // applyTimeline aplica order + sceneText a las escenas; ADEMAS adjuntamos el documento `tl` como video.timeline para que
  // drawFrame dibuje los overlays (y, en Fase 4, mezcle el audio). Sin overlays/audio -> drawOverlays no-op -> nada cambia.
  const video = useMemo(() => ({ ...applyTimeline(baseVideo, tl.order, tl.sceneText), timeline: tl }), [baseVideo, tl])
  // edita el texto de UNA escena (por indice BASE) -> override en tl.sceneText; vacio -> quita el override (vuelve al global).
  const editSceneText = (baseIdx, key, val) => setTl(t => {
    const cur = { ...(t.sceneText[baseIdx] || {}) }
    if (val == null || val === '') delete cur[key]; else cur[key] = val
    const st = { ...t.sceneText }
    if (Object.keys(cur).length) st[baseIdx] = cur; else delete st[baseIdx]
    return { ...t, sceneText: st }
  })
  // OVERLAYS (Fase 3): objetos texto animados SOBRE el video. selOv = seleccionado; recording = grabando el gesto.
  const [selOv, setSelOv] = useState(null)
  const [recording, setRecording] = useState(false)
  const dragOvRef = useRef(null)   // 'move' | 'record' | null (accion en curso sobre el canvas)
  const recRef = useRef(null)      // { t0, pts:[{ms,x,y}] } mientras se graba
  const lastDrawRef = useRef(0)    // throttle del redibujo mientras se arrastra/graba (evita saturar el CPU)
  const addOverlay = () => setTl(t => { const ov = makeTextOverlay(headRef.current, video.W, video.H); setSelOv(ov.id); return { ...t, overlays: [...(t.overlays || []), ov] } })
  const patchOv = (id, patch) => setTl(t => ({ ...t, overlays: patchOverlay(t.overlays, id, patch) }))
  const removeOv = (id) => { setTl(t => ({ ...t, overlays: (t.overlays || []).filter(o => o.id !== id) })); setSelOv(null); setRecording(false) }
  const toggleRecord = () => { setRecording(r => !r); setPlaying(false) }
  // coords del puntero -> espacio LOGICO del video (misma conversion que AnimLab: rect del canvas -> W/H del video).
  const evToLogical = (e) => { const cv = cvRef.current; if (!cv) return { x: 0, y: 0 }; const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / (r.width || 1) * video.W, y: (e.clientY - r.top) / (r.height || 1) * video.H } }
  const onCanvasDown = (e) => {
    if (!selOv) return
    try { cvRef.current.setPointerCapture(e.pointerId) } catch { /* noop */ }
    const p = evToLogical(e), x = Math.round(p.x), y = Math.round(p.y)
    lastDrawRef.current = 0
    if (recording) {
      recRef.current = { t0: performance.now(), pts: [{ ms: 0, x, y }] }; dragOvRef.current = 'record'
      // mientras graba: el overlay queda VISIBLE en el punto de agarre desde el playhead, sin animacion -> feedback en vivo
      patchOv(selOv, { startSec: +headRef.current.toFixed(2), anim: { kind: 'none' }, transform: { x, y } })
    } else { dragOvRef.current = 'move'; patchOv(selOv, { transform: { x, y } }) }
  }
  const onCanvasMove = (e) => {
    if (!dragOvRef.current || !selOv) return
    const p = evToLogical(e), x = Math.round(p.x), y = Math.round(p.y)
    if (dragOvRef.current === 'record' && recRef.current) recRef.current.pts.push({ ms: performance.now() - recRef.current.t0, x: p.x, y: p.y })
    // THROTTLE del redibujo (~30/s): sin esto, patchOv en CADA pointermove (~120/s) redibuja todo el frame y satura el CPU
    // -> el preview se traba. El gesto se graba COMPLETO igual (los puntos van a recRef arriba); solo el feedback visual se limita.
    const now = performance.now()
    if (now - lastDrawRef.current > 33) { lastDrawRef.current = now; patchOv(selOv, { transform: { x, y } }) }
  }
  const onCanvasUp = () => {
    if (dragOvRef.current === 'record' && recRef.current) {
      const r = finalizeRecording(recRef.current.pts)
      if (r) patchOv(selOv, { anim: r.anim, durSec: r.durSec, startSec: +headRef.current.toFixed(2), transform: { x: r.home.x, y: r.home.y } })
      setRecording(false)
    }
    dragOvRef.current = null; recRef.current = null
  }
  // SFX (Fase 4): clips de audio en video.timeline.audio. selSfx = seleccionado.
  const [selSfx, setSelSfx] = useState(null)
  const addSfx = (sfxId) => setTl(t => { const meta = SFX.find(s => s.id === sfxId) || { dur: 0.3 }; const clip = { id: 'sfx_' + Date.now().toString(36) + '_' + ((t.audio || []).length), sfx: sfxId, startSec: +headRef.current.toFixed(2), durSec: meta.dur, gain: 0.9 }; setSelSfx(clip.id); return { ...t, audio: [...(t.audio || []), clip] } })
  const patchSfx = (id, patch) => setTl(t => ({ ...t, audio: (t.audio || []).map(a => a.id === id ? { ...a, ...patch } : a) }))
  const removeSfx = (id) => { setTl(t => ({ ...t, audio: (t.audio || []).filter(a => a.id !== id) })); setSelSfx(null) }
  // escuchar un SFX una vez (gesto del usuario -> autoplay OK). Cierra el contexto al terminar.
  const previewSfx = (sfxId) => { try { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; const ctx = new AC(); const src = ctx.createBufferSource(); src.buffer = sfxBuffer(ctx, sfxId); src.connect(ctx.destination); src.onended = () => { try { ctx.close() } catch (e) { /* noop */ } }; src.start() } catch (e) { /* noop */ } }
  const tokens = useMemo(() => estimateTokens(video, brief), [video, brief])   // consumo APROXIMADO por elemento (reemplaza "creditos")

  // opciones por slot (lista completa ordenada por afinidad; la grilla capea el display). Recalcula al cambiar tono/rubro.
  const opts = useMemo(() => ({
    color: optionsFor('color', brief), type: optionsFor('type', brief),
    bg: optionsFor('bg', brief), transition: optionsFor('transition', brief), post: optionsFor('post', brief),
    sub: optionsFor('sub', brief), atm: optionsFor('atm', brief), motion: optionsFor('motion', brief),
    typekit: optionsFor('typekit', brief), layout: optionsFor('layout', brief), mark: optionsFor('mark', brief),
  }), [brief.tone, brief.rubro, brief.seriousness])
  // al ELEGIR una opcion, reinicia el mini-player a 0 -> el usuario ve el resultado desde el principio (no a mitad del loop).
  const restartPreview = () => { headRef.current = 0; setHead(0); setPlaying(true) }
  const pick = (slot, id) => { setPicks(p => ({ ...p, [slot]: id })); restartPreview() }
  const pickScene = (i, id) => { setPicks(p => ({ ...p, scenes: { ...(p.scenes || {}), [i]: id } })); restartPreview() }

  // PERSISTENCIA: guarda el borrador ante cualquier cambio (solo datos -> el video se re-renderiza determinista al retomar).
  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ brief, picks, seed, step, url, analyzed, timeline: tl })) } catch { /* noop */ }
  }, [brief, picks, seed, step, url, analyzed])

  // al loguearse, trae "Mis videos" de advanced de Firestore (coleccion propia); sin sesion queda el cache de localStorage.
  useEffect(() => {
    if (!user?.uid) return
    let alive = true
    getDocs(collection(db, 'users', user.uid, SAVED_COL)).then(snap => {
      if (!alive) return
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, 24)
      if (items.length) { setSaved(items); localStorage.setItem(SAVED_KEY, JSON.stringify(items)) }
    }).catch(() => { /* offline -> localStorage */ })
    return () => { alive = false }
  }, [user?.uid])
  // EMPEZAR DE NUEVO: descarta el borrador y vuelve al estado inicial (semilla nueva).
  const restart = () => {
    try { localStorage.removeItem(DRAFT_KEY) } catch { /* noop */ }
    setBrief(BRIEF0); setPicks({}); setUrl(''); setAnalyzed(false); setStep(0); setSeed(newSeed()); setTl({ v: 1, order: [], sceneText: {}, overlays: [], audio: [] })
    headRef.current = 0; setHead(0)
  }

  // al CAMBIAR de paso, sube el scroll arriba de todo (antes quedaba abajo donde estabas).
  const topRef = useRef(null)
  useEffect(() => { topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }, [step])

  // ---- mini-player (client-side, sin backend) -------------------------------------------------
  const cvRef = useRef(null)
  const headRef = useRef(0)
  const [head, setHead] = useState(0)
  const [playing, setPlaying] = useState(true)
  const audioPrevRef = useRef(null)          // handle del audio de preview (SFX en vivo) mientras reproduce
  const restartAudioRef = useRef(() => {})   // reprograma el audio al reiniciar el loop (siempre la ultima version)
  useEffect(() => {
    const cv = cvRef.current; if (!cv) return
    const ctx = cv.getContext('2d')
    const DPR = Math.min(window.devicePixelRatio || 1, 2.5)
    cv.width = video.W * DPR; cv.height = video.H * DPR
    const draw = () => { ctx.setTransform(DPR, 0, 0, DPR, 0, 0); drawFrame(ctx, headRef.current, video, { quality: 0.7 }) }   // preview a calidad reducida (item L717); el export va a full
    // EN PAUSA: dibuja UN frame y NO entra al loop -> la pagina queda idle (sin re-render por frame).
    if (!playing) { draw(); setHead(headRef.current); return }
    // REPRODUCIENDO: anima en canvas cada frame, pero el estado de React (la hora) se actualiza THROTTLEADO (~8/s)
    // para no re-renderizar el componente entero 60 veces por segundo.
    let raf, last = performance.now(), lastUI = 0
    const loop = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05); last = now
      headRef.current += dt; if (headRef.current >= video.duration) { headRef.current -= video.duration; restartAudioRef.current() }   // al reiniciar el loop, reprograma los SFX desde 0
      draw()
      if (now - lastUI > 120) { lastUI = now; setHead(headRef.current) }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [video, playing])
  // seek desde el timeline (clic/arrastre) -> mueve el playhead a ese tiempo. Reajusta el frame aunque este en pausa.
  const seek = (t) => { headRef.current = Math.max(0, Math.min(t || 0, video.duration)); setHead(headRef.current) }
  // PREVIEW de AUDIO (Fase 4): al reproducir, agenda los SFX del timeline en un AudioContext vivo -> se escuchan MIENTRAS
  // editas (sin descargar). Se (re)programa al play y al cambiar los clips, se reprograma al reiniciar el loop, y se corta al pausar.
  const stopPreviewAudio = () => { if (audioPrevRef.current) { audioPrevRef.current.stop(); audioPrevRef.current = null } }
  const startPreviewAudio = (fromSec) => { stopPreviewAudio(); if (tl.audio && tl.audio.length) audioPrevRef.current = playPreview({ duration: video.duration, timeline: { audio: tl.audio } }, fromSec || 0) }
  restartAudioRef.current = () => startPreviewAudio(0)
  useEffect(() => {
    if (playing) startPreviewAudio(headRef.current); else stopPreviewAudio()
    return stopPreviewAudio
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, tl.audio, video.duration])

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
        // ENERGIA del PLAYBOOK del rubro (item L142): el vertical dirige el ritmo del video. Ausente/invalido -> neutra en el motor.
        energyHint: ['alto', 'medio', 'bajo'].includes(b.energyHint) ? b.energyHint : undefined,
      })
      setPicks({}); setTl({ v: 1, order: [], sceneText: {}, overlays: [], audio: [] }); headRef.current = 0; setHead(0); setAnalyzed(true); setAnalyzing('')
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

  // ---- export en ALTA CALIDAD (client-side) ---------------------------------------------------
  // EXPORT: modulo COMPARTIDO (src/lib/exportVideo.js) — canvas OFFSCREEN a 1080 real, una vuelta exacta. Mismo camino
  // que urvid IA. Este estudio YA usaba offscreen; ahora el codigo vive en un solo lugar (unificado -> item L134).
  const exportVideo = () => {
    if (exporting) return
    const ok = exportCanvasVideo(video, {
      filename: `${(brief.brand || 'urvid')}-${(brief.format || '9-16').replace(':', 'x')}`,
      bitrate: 12e6,
      onProgress: pct => setExporting(pct + '%'),
      onError: m => { setExporting(m); setTimeout(() => setExporting(''), 5000) },
      onDone: () => setExporting(''),
    })
    if (ok) setExporting('0%')
  }

  // ---- guardar en "Mis videos" (Firestore + localStorage) -------------------------------------
  const save = async () => {
    const id = 'v' + Date.now().toString(36)
    const item = { id, brand: brief.brand || 'Marca', rubro: brief.rubro, tone: brief.tone, brandColor: brief.brandColor, format: brief.format || '9:16', duration: brief.duration || 'medio', tagline: brief.tagline || '', claim: brief.claim || '', cta: brief.cta || '', bullets: brief.bullets || [], stats: brief.stats || [], proof: brief.proof || '', ...(brief.energyHint ? { energyHint: brief.energyHint } : {}), recipe: video.recipe, timeline: tl, seed, ts: Date.now() }   // energyHint (item L142): energy/xf NO estan en la receta. timeline (Fase 2+): reorden/overrides/overlays/audio del editor -> el guardado los conserva
    const next = [item, ...saved].slice(0, 24)
    setSaved(next)
    try { localStorage.setItem(SAVED_KEY, JSON.stringify(next)) } catch { /* noop */ }
    if (user?.uid) { try { await setDoc(doc(db, 'users', user.uid, SAVED_COL, id), item) } catch { /* offline -> localStorage */ } }
    setSavedMsg('Guardado ✓ — lo tenes abajo en "Mis videos".'); setTimeout(() => setSavedMsg(''), 8000)
  }
  // cargar un guardado de vuelta al wizard: restaura brief+seed y RECONSTRUYE los picks desde la receta -> reproduce ese video.
  const loadSaved = (it) => {
    setBrief({ ...BRIEF0, brand: it.brand || '', rubro: it.rubro || 'default', tone: it.tone || 'dark', brandColor: it.brandColor || BRIEF0.brandColor, format: it.format || '9:16', duration: it.duration || 'medio', tagline: it.tagline || '', claim: it.claim || '', cta: it.cta || '', bullets: it.bullets || [], stats: it.stats || [], proof: it.proof || '', energyHint: it.energyHint })   // energyHint del playbook (item L142) round-trip; guardados viejos -> undefined -> neutro
    setSeed(it.seed || newSeed())
    const r = it.recipe || {}
    const p = {}
    for (const k of Object.keys(SLOT_LIB)) { if (r[k] != null) p[k] = r[k] }   // todos los slots del recipe (auto-incluye futuros)
    if (Array.isArray(r.scenes)) p.scenes = Object.fromEntries(r.scenes.map((s, i) => [i, s]))
    setPicks(p)
    const t = (it.timeline && typeof it.timeline === 'object') ? it.timeline : {}   // restaura el documento del timeline (reorden/overrides/overlays/audio)
    setTl({ v: 1, order: t.order || [], sceneText: t.sceneText || {}, overlays: t.overlays || [], audio: t.audio || [] })
    setAnalyzed(true); setStep(6)   // salta a "Crear" (revision) para ver el preview armado
    headRef.current = 0; setHead(0); setPlaying(true)
  }
  const delSaved = async (it) => {
    const next = saved.filter(s => s !== it)
    setSaved(next)
    try { localStorage.setItem(SAVED_KEY, JSON.stringify(next)) } catch { /* noop */ }
    if (user?.uid && it.id) { try { await deleteDoc(doc(db, 'users', user.uid, SAVED_COL, it.id)) } catch { /* noop */ } }
  }

  // ---- pasos: Datos -> Estilo -> Fondo -> Escenas -> Cierre -> Crear. (FASE C agregara "Avanzado" plegable.) ----
  // NO memoizar con [] (capturaria closures viejos del estado): array fresco cada render, las funciones cierran sobre el estado actual.
  const STEPS = [
    { key: 'datos', label: 'Datos', eyebrow: 'Tu pagina', render: renderDatos },
    { key: 'estilo', label: 'Estilo', eyebrow: 'Identidad', render: renderEstilo },
    { key: 'fondo', label: 'Fondo', eyebrow: 'Escenario', render: renderFondo },
    { key: 'escenas', label: 'Escenas', eyebrow: 'El arco', render: renderEscenas },
    { key: 'cierre', label: 'Cierre', eyebrow: 'Movimiento', render: renderCierre },
    { key: 'avanzado', label: 'Avanzado', eyebrow: 'Ajuste fino', render: renderAvanzado },
    { key: 'revision', label: 'Crear', eyebrow: 'Revision', render: renderRevision },
  ]
  const cur = STEPS[Math.min(step, STEPS.length - 1)]
  const canNext = step < STEPS.length - 1
  const canPrev = step > 0
  const next = () => setStep(s => Math.min(STEPS.length - 1, s + 1))
  const prev = () => setStep(s => Math.max(0, s - 1))
  // TABS del rail (editor Canva-style): pasos de config + Animaciones + SFX + Guardados. Reusan los render de los pasos.
  const [railTab, setRailTab] = useState('datos')
  const RAIL_TABS = [
    { key: 'datos', label: 'Datos', icon: ICONS.datos }, { key: 'estilo', label: 'Estilo', icon: ICONS.estilo },
    { key: 'fondo', label: 'Fondo', icon: ICONS.fondo }, { key: 'escenas', label: 'Escenas', icon: ICONS.escenas },
    { key: 'cierre', label: 'Cierre', icon: ICONS.cierre }, { key: 'avanzado', label: 'Avanzado', icon: ICONS.avanzado },
    { key: 'animaciones', label: 'Animaciones', icon: ICONS.animaciones }, { key: 'sfx', label: 'SFX', icon: ICONS.sfx },
    { key: 'guardados', label: 'Guardados', icon: ICONS.guardados },
  ]
  const STEP_RENDER = { datos: renderDatos, estilo: renderEstilo, fondo: renderFondo, escenas: renderEscenas, cierre: renderCierre, avanzado: renderAvanzado }

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
        <div className={styles.flowLine}>{video.scenes.map(s => s.sceneId.replace(/^[^.]+\./, '')).join('  →  ')}</div>
        {/* CONSUMO en TOKENS (aprox) — desglose por elemento; mismo modelo que urvid IA (src/lib/tokens.js) */}
        <div style={{ marginTop: 14, borderTop: '1px solid rgba(0,0,0,0.09)', paddingTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, marginBottom: 8 }}>
            <span style={{ opacity: 0.65 }}>⚡ Consumo estimado</span><strong>≈ {tokens.total.toLocaleString('es')} tokens</strong>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', fontSize: 12, opacity: 0.68 }}>
            {tokens.items.map(it => <span key={it.key}>{it.label}: <b>{it.tokens}</b></span>)}
          </div>
        </div>
        <div className={styles.actions}>
          <button className={styles.primary} onClick={save}>★ Crear y guardar</button>
          <button className={styles.ghost} onClick={exportVideo} disabled={!!exporting}>{exporting ? `Exportando ${exporting}` : '⬇ Descargar video'}</button>
        </div>
        {savedMsg && <p className={styles.ok}>{savedMsg}</p>}
        {exporting && exporting.indexOf('%') < 0 && <p className={styles.err}>{exporting}</p>}
      </div>
    )
  }

  function renderEstilo() {
    return (
      <div className={styles.stepBody}>
        <p className={styles.lead}>La identidad de tu marca: el esquema de color y la tipografia.</p>
        <div className={styles.libSection}>
          <span className={styles.eyebrowSm}>Color</span>
          <OptionGrid slot="color" options={opts.color} selectedId={fullRecipe.color} onPick={id => pick('color', id)} brief={brief} seed={seed} fullRecipe={fullRecipe} />
        </div>
        <div className={styles.libSection}>
          <span className={styles.eyebrowSm}>Tipografia</span>
          <OptionGrid slot="type" options={opts.type} selectedId={fullRecipe.type} onPick={id => pick('type', id)} brief={brief} seed={seed} fullRecipe={fullRecipe} />
        </div>
      </div>
    )
  }

  function renderFondo() {
    return (
      <div className={styles.stepBody}>
        <p className={styles.lead}>El escenario del video. Filtra por rubro (arranca en el tuyo) y pasa el mouse para ver el movimiento.</p>
        <OptionGrid slot="bg" options={opts.bg} selectedId={fullRecipe.bg} onPick={id => pick('bg', id)} brief={brief} seed={seed} fullRecipe={fullRecipe} withRubro />
      </div>
    )
  }

  function renderEscenas() {
    return (
      <div className={styles.stepBody}>
        <p className={styles.lead}>El arco lo armamos por vos desde tu contenido. Cambiá cualquier escena: filtrá por tipo y elegí de cualquier categoria.</p>
        {video.scenes.map((sc, i) => (
          <div key={i} className={styles.beatRow}>
            <span className={styles.eyebrowSm}>Beat {i + 1} · {categoryOf(sc.sceneId)}</span>
            <OptionGrid slot="scenes" beat={i} options={allSceneOptions(brief)} selectedId={sc.sceneId} onPick={id => pickScene(i, id)} brief={brief} seed={seed} fullRecipe={fullRecipe} withCategory defaultCategory={topCategoryOfScene(sc.sceneId)} />
          </div>
        ))}
      </div>
    )
  }

  function renderAvanzado() {
    const adv = [
      { slot: 'sub', title: 'Textura (substrate)', optional: true },
      { slot: 'atm', title: 'Atmosfera', optional: true },
      { slot: 'motion', title: 'Movimiento', optional: false },
      { slot: 'typekit', title: 'Texto cinetico', optional: true },
      { slot: 'layout', title: 'Composicion (layout)', optional: false },
      { slot: 'mark', title: 'Icono', optional: true },
    ]
    return (
      <div className={styles.stepBody}>
        <p className={styles.lead}>Ajustes finos, todos opcionales. Esta en automatico — abri solo lo que quieras tocar.</p>
        {adv.map(a => (
          <Collapsible key={a.slot} title={a.title} hint={shortId(fullRecipe[a.slot]) || 'ninguno'}>
            {a.slot === 'layout'
              ? <LayoutPreview options={opts.layout} selectedId={fullRecipe.layout} onPick={id => pick('layout', id)} />
              : <EffectPreview slot={a.slot} options={opts[a.slot]} selectedId={fullRecipe[a.slot]} onPick={id => pick(a.slot, id)} brief={brief} seed={seed} fullRecipe={fullRecipe} optional={a.optional} />}
          </Collapsible>
        ))}
      </div>
    )
  }

  function renderCierre() {
    return (
      <div className={styles.stepBody}>
        <p className={styles.lead}>Como pasan las escenas y el acabado final. El preview grande reproduce la opcion elegida; en el acabado, la mitad izquierda es SIN efecto y la derecha CON.</p>
        <div className={styles.libSection}>
          <span className={styles.eyebrowSm}>Transicion</span>
          <EffectPreview slot="transition" options={opts.transition} selectedId={fullRecipe.transition} onPick={id => pick('transition', id)} brief={brief} seed={seed} fullRecipe={fullRecipe} />
        </div>
        <div className={styles.libSection}>
          <span className={styles.eyebrowSm}>Acabado</span>
          <EffectPreview slot="post" options={opts.post} selectedId={fullRecipe.post} onPick={id => pick('post', id)} brief={brief} seed={seed} fullRecipe={fullRecipe} optional />
        </div>
      </div>
    )
  }

  return (
    <div className={styles.wrap}>
      {/* TOPBAR: marca + acciones globales (guardar / descargar / empezar de cero) */}
      <div className={styles.topbar}>
        <div className={`${styles.logo} urvidTitleIn`}>urvid <span className="urvidIA">IA</span> advanced</div>
        <div className={styles.topActions}>
          {analyzed && <>
            <button className={styles.ghost} onClick={save}>★ Guardar</button>
            <button className={styles.primary} onClick={exportVideo} disabled={!!exporting}>{exporting ? `Exportando ${exporting}` : '⬇ Descargar'}</button>
          </>}
          {(analyzed || step > 0) && <button className={styles.restartTop} onClick={restart} title="Descarta este video y empeza uno desde cero">↺ Empezar de cero</button>}
        </div>
      </div>

      <div className={styles.body}>
        {/* RAIL izquierdo: tabs (pasos + animaciones + SFX + guardados) + panel scrolleable */}
        <aside className={styles.rail}>
          <div className={styles.railTabs}>
            {RAIL_TABS.map(t => (
              <button key={t.key} className={`${styles.railTab} ${railTab === t.key ? styles.railTabOn : ''}`} onClick={() => setRailTab(t.key)}>
                <span className={styles.railIcon}>{t.icon}</span>{t.label}
              </button>
            ))}
          </div>
          <div className={styles.railPanel} key={railTab}>
            {railTab === 'animaciones'
              ? <OverlayEditor overlays={tl.overlays} selId={selOv} onSelect={setSelOv} onAdd={addOverlay} onPatch={patchOv} onRemove={removeOv} recording={recording} onToggleRecord={toggleRecord} duration={video.duration} />
              : railTab === 'sfx'
                ? <SfxEditor audio={tl.audio} selId={selSfx} onSelect={setSelSfx} onAdd={addSfx} onPreview={previewSfx} onPatch={patchSfx} onRemove={removeSfx} duration={video.duration} />
                : railTab === 'guardados'
                  ? <div className={styles.myVideos}>
                      <span className={styles.eyebrowSm}>Mis videos</span>
                      {saved.length === 0
                        ? <p className={styles.myEmpty}>Todavia no guardaste ninguno. Tocá <b>★ Guardar</b> arriba y aparecen acá.</p>
                        : <div className={styles.myList}>{saved.map((it, i) => (
                            <div key={it.id || i} className={styles.myCard} style={{ '--c': it.brandColor }}>
                              <button className={styles.myCardBtn} onClick={() => loadSaved(it)}><b>{it.brand || 'Marca'}</b><span>{RUBRO_LBL[it.rubro] || it.rubro} · {it.tone === 'dark' ? 'oscuro' : 'claro'}</span></button>
                              <button className={styles.myDel} onClick={() => delSaved(it)} title="Borrar">×</button>
                            </div>))}</div>}
                    </div>
                  : <div className={styles.stepAnim}>{(STEP_RENDER[railTab] || renderDatos)()}</div>}
            {savedMsg && <p className={styles.ok}>{savedMsg}</p>}
          </div>
        </aside>

        {/* CENTRO: video + transport + timeline (todo junto, sin scroll de pagina) */}
        <div className={styles.stageCol}>
          <div className={styles.stage}>
            {analyzed
              ? <div className={styles.frame} style={{ aspectRatio: `${video.W} / ${video.H}` }}>
                  <canvas ref={cvRef} onPointerDown={onCanvasDown} onPointerMove={onCanvasMove} onPointerUp={onCanvasUp} onPointerLeave={onCanvasUp} style={{ cursor: selOv ? (recording ? 'crosshair' : 'move') : 'default', touchAction: 'none' }} />
                </div>
              : <div className={styles.stageEmpty}><b>Empezá por “Datos”</b><span>Pegá el link de tu página y analizala para armar el video.</span></div>}
          </div>
          <div className={styles.transportBar}>
            <button className={styles.tbtn} onClick={() => setPlaying(p => !p)}>{playing ? '⏸' : '▶'}</button>
            <button className={styles.tbtn} onClick={() => { headRef.current = 0; setHead(0) }} title="Volver al inicio">↺</button>
            <span className={styles.time}>{head.toFixed(1)} / {video.duration.toFixed(1)}s</span>
            {exporting && exporting.indexOf('%') < 0 && <span className={styles.err}>{exporting}</span>}
          </div>
          {analyzed && (
            <div className={styles.timelineDock}>
              <Timeline video={video} head={head} order={tl.order} onReorder={o => setTl(t => ({ ...t, order: o }))} brief={brief} sceneText={tl.sceneText} onEditSceneText={editSceneText} onSeek={seek} overlays={tl.overlays} selOverlay={selOv} onSelectOverlay={setSelOv} audio={tl.audio} selSfx={selSfx} onSelectSfx={setSelSfx} onPatchOverlay={patchOv} onPatchSfx={patchSfx} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
