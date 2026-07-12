import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { makeTemplateVideo, drawTemplateFrame, normalizeTemplate, GALLERY, OBJECTS, OBJECT_IDS, BACKGROUNDS, ANIM_IN, ANIM_OUT, IDLE_KINDS, hitTest, layerExtent, paintTemplateBackground, drawObject, deriveTemplatePalette, resolveColor } from '../../templates/index.js'
import { circlePath, rectPath, starPath, polygonPath, linePath, tracePath } from '../../aemotion/index.js'
import { useAuth } from '../../contexts/AuthContext'
import { isAdmin } from '../../lib/admin'
import { loadTemplates, saveTemplate, deleteTemplate, makeTemplateId } from '../../lib/templateStore'
import s from './TemplateEditor.module.css'

// EDITOR DE TEMPLATES (admin) — crea/edita templates autorados: escenas, capas (texto fijo o SLOT
// tipado, formas, imagenes), animaciones, fondos, orden. Preview en vivo con un brief de muestra
// (los slots se rellenan como en produccion). Guarda en la base (localStorage + Firestore).

const SAMPLE = { brand: 'Nodo', rubro: 'tech', brandColor: '#22e06a', tagline: 'Automatiza lo aburrido', claim: 'Menos tareas repetitivas, mas resultados', cta: 'Probalo gratis', bullets: ['Rapido de integrar', 'Reportes en vivo', 'Soporte 24/7'], stats: [{ value: '+400', label: 'equipos lo usan' }] }
const FONTS = ['Archivo', 'Anton', 'Inter', 'Oswald', 'Playfair Display', 'Space Grotesk', 'Sora', 'Unbounded', 'DM Sans', 'Bricolage Grotesque', 'Fraunces', 'Chakra Petch', 'Big Shoulders Display', 'Quicksand']
const TOKENS = ['ink', 'dim', 'accent', 'accent2', 'onAccent', 'bg', 'surface']
const SLOTS = ['brand', 'headline', 'tagline', 'line', 'list', 'stat', 'statLabel', 'cta']
const SHAPES = ['rect', 'circle', 'star', 'poly', 'line']

let _id = 0
const uid = (p) => p + Date.now().toString(36) + (_id++).toString(36)
const scaffoldScenes = () => [{ id: uid('sc'), dur: 3, background: { ref: 'bg.glow-corner' }, layers: [{ id: uid('ly'), type: 'text', y: 0.47, slot: { kind: 'headline', maxChars: 40, maxLines: 3 }, style: { size: 74, weight: 900, color: 'ink', font: 'Archivo' }, anim: { in: 'cascade', inDur: 1, delay: 0, idle: true, out: 'fade' } }] }]
const blankTemplate = (name, id) => normalizeTemplate({ id: id || uid('tpl'), name: name || 'Nuevo template', mode: 'dark', scenes: scaffoldScenes() })
const blankLayer = (type) => ({
  text: { id: uid('ly'), type: 'text', x: 0.5, y: 0.5, scale: 1, rot: 0, text: 'Texto', style: { size: 60, weight: 800, color: 'ink', font: 'Archivo', align: 'center' }, anim: { in: 'rise', inDur: 0.6, delay: 0, idle: 'drift', out: 'fade' } },
  shape: { id: uid('ly'), type: 'shape', x: 0.5, y: 0.6, scale: 1, rot: 0, shape: 'line', shapeStyle: { w: 130, stroke: 'accent', width: 4 }, anim: { in: 'slide-l', inDur: 0.5, delay: 0, idle: 'drift', out: 'fade' } },
  image: { id: uid('ly'), type: 'image', x: 0.5, y: 0.42, scale: 1, rot: 0, shapeStyle: { w: 240, h: 300, r: 10 }, anim: { in: 'pop', inDur: 0.5, delay: 0, idle: 'drift', out: 'fade' } },
  object: { id: uid('ly'), type: 'object', objectId: 'morph', x: 0.5, y: 0.42, scale: 1, rot: 0, params: {}, anim: { in: 'pop', inDur: 0.6, delay: 0, idle: 'float', out: 'fade' } },
}[type])

export default function TemplateEditor() {
  const { user } = useAuth()
  const [tpl, setTpl] = useState(blankTemplate)
  const [mode, setMode] = useState('manager')      // 'manager' (gestor de templates) | 'editor'
  const [layerId, setLayerId] = useState(null)
  const [saved, setSaved] = useState([])
  const [playing, setPlaying] = useState(true)
  const [head, setHead] = useState(0)
  const [status, setStatus] = useState('')
  const [io, setIo] = useState(null)
  const [newOpen, setNewOpen] = useState(false)    // dialogo "nuevo template" (pide solo nombre)
  const [newName, setNewName] = useState('')
  const [copiedId, setCopiedId] = useState(null)   // id recien copiado (feedback por-tarjeta/chip)
  const headRef = useRef(0), cvRef = useRef(null), dragRef = useRef(null)
  const savedSnapRef = useRef('')                  // snapshot del contenido ya guardado (dirty-check)
  const tplRef = useRef(tpl); tplRef.current = tpl // ultimo tpl (para flush al desmontar)
  const dirtyRef = useRef(false)

  const video = useMemo(() => makeTemplateVideo(tpl, SAMPLE), [tpl])
  useEffect(() => { loadTemplates().then(setSaved) }, [])

  // paleta de muestra para las miniaturas (refleja el modo del template)
  const thumbPal = useMemo(() => deriveTemplatePalette('#5b8cff', tpl.mode), [tpl.mode])
  const bgThumb = useCallback((ctx, id, W, H) => { ctx.setTransform(W / 405, 0, 0, H / 720, 0, 0); paintTemplateBackground(ctx, { ref: id }, 0.4, thumbPal, 405, 720) }, [thumbPal])
  const objThumb = useCallback((ctx, id, W, H) => { ctx.setTransform(W / 405, 0, 0, H / 720, 0, 0); ctx.fillStyle = thumbPal.bg; ctx.fillRect(0, 0, 405, 720); drawObject(ctx, id, 1.3, 2.5, { x: 202, y: 360, pal: thumbPal, params: {} }) }, [thumbPal])
  const shapeThumb = useCallback((ctx, id, W, H) => { ctx.setTransform(W / 120, 0, 0, H / 120, 0, 0); ctx.fillStyle = thumbPal.surface; ctx.fillRect(0, 0, 120, 120); const p = (SHAPE_PATH[id] || SHAPE_PATH.circle)(60, 40); if (id === 'line') { tracePath(ctx, p); ctx.strokeStyle = thumbPal.accent; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.stroke() } else { tracePath(ctx, p); ctx.fillStyle = thumbPal.accent; ctx.fill() } }, [thumbPal])

  // ESCENA ACTIVA = la que se ve en el playhead (no una selección aparte). Así lo que editás/arrastrás
  // es SIEMPRE la escena visible en el lienzo (antes divergían y se movía la capa equivocada / el fondo).
  const activeIdx = useMemo(() => {
    const ss = video.scenes; let i = 0
    for (let k = 0; k < ss.length; k++) if (head >= ss[k].t0 - 1e-6) i = k
    return Math.max(0, Math.min(i, tpl.scenes.length - 1))
  }, [head, video, tpl.scenes.length])
  const scene = tpl.scenes[activeIdx] || tpl.scenes[0]
  const layer = scene?.layers.find(l => l.id === layerId) || null

  // el loop lee todo por refs -> se monta UNA vez y no se desarma en cada edit (robusto)
  const videoRef = useRef(video); videoRef.current = video
  const playingRef = useRef(playing); playingRef.current = playing
  const layerRef = useRef(layer); layerRef.current = layer
  useEffect(() => {
    if (mode !== 'editor') return       // el loop de preview solo corre en el editor (no en el gestor)
    const cv = cvRef.current; if (!cv) return
    const ctx = cv.getContext('2d'); const DPR = Math.min(window.devicePixelRatio || 1, 2)
    let raf, last = performance.now()
    const loop = (now) => {
      const v = videoRef.current
      if (cv.width !== Math.round(v.W * DPR)) { cv.width = Math.round(v.W * DPR); cv.height = Math.round(v.H * DPR) }
      const dt = Math.min((now - last) / 1000, 0.05); last = now
      // el playhead solo avanza (y re-renderiza React) mientras reproduce; pausado queda ocioso
      if (playingRef.current) { headRef.current += dt; if (headRef.current >= v.duration) headRef.current = 0; setHead(headRef.current) }
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
      drawTemplateFrame(ctx, headRef.current, v)
      const L = layerRef.current
      if (L) {
        const lx = (typeof L.x === 'number' ? L.x : 0.5) * v.W, ly = (typeof L.y === 'number' ? L.y : 0.5) * v.H
        const { hw, hh } = layerExtent(v, L)
        ctx.strokeStyle = '#4f9dff'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]); ctx.strokeRect(lx - hw, ly - hh, hw * 2, hh * 2); ctx.setLineDash([])
        ctx.fillStyle = '#4f9dff'; ctx.beginPath(); ctx.arc(lx, ly, 4, 0, 6.283); ctx.fill()
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [mode])

  // AUTO-GUARDADO del template activo mientras editás (debounce), como urvid advanced. Solo guarda si
  // el CONTENIDO cambió (dirty-check por snapshot) -> abrir un template sin tocarlo no bumpea su ts ni
  // lo reordena ni genera un write. Persiste en localStorage + Firestore (best-effort).
  useEffect(() => {
    if (mode !== 'editor') return
    const cur = JSON.stringify(tpl)
    if (cur === savedSnapRef.current) { dirtyRef.current = false; return }
    dirtyRef.current = true
    const h = setTimeout(async () => { savedSnapRef.current = cur; dirtyRef.current = false; const { list } = await saveTemplate(tpl); setSaved(list) }, 900)
    return () => clearTimeout(h)
  }, [tpl, mode])

  // FLUSH al desmontar (ej. navegar a otra sección por el sidebar): writeLS de saveTemplate es
  // síncrono -> persiste la última edición aunque el componente se desarme antes del debounce.
  useEffect(() => () => { if (dirtyRef.current) saveTemplate(tplRef.current) }, [])

  // t0 (inicio) de una escena por índice, a partir de sus duraciones (para saltar el playhead ahí)
  const sceneStart = (scenes, i) => scenes.slice(0, i).reduce((a, s2) => a + (s2.dur || 0), 0)

  // --- updates inmutables (todo opera sobre la escena ACTIVA = la del playhead) ---
  const commit = (next) => setTpl({ ...next })
  const patchScene = (i, p) => { const scenes = tpl.scenes.map((s2, j) => j === i ? { ...s2, ...p } : s2); commit({ ...tpl, scenes }) }
  const patchLayer = (p) => { const scenes = tpl.scenes.map((s2, j) => j === activeIdx ? { ...s2, layers: s2.layers.map(l => l.id === layerId ? deepMerge(l, p) : l) } : s2); commit({ ...tpl, scenes }) }
  const addLayer = (type) => { const l = blankLayer(type); const scenes = tpl.scenes.map((s2, j) => j === activeIdx ? { ...s2, layers: [...s2.layers, l] } : s2); commit({ ...tpl, scenes }); setLayerId(l.id); setPlaying(false) }
  const delLayer = () => { if (!layerId) return; const scenes = tpl.scenes.map((s2, j) => j === activeIdx ? { ...s2, layers: s2.layers.filter(l => l.id !== layerId) } : s2); commit({ ...tpl, scenes }); setLayerId(null) }
  const addScene = () => { const sc = { id: uid('sc'), dur: 3, background: { ref: 'bg.glow-corner' }, layers: [] }; const scenes = [...tpl.scenes, sc]; commit({ ...tpl, scenes }); setLayerId(null); seek(sceneStart(scenes, scenes.length - 1) + 0.05) }
  const delScene = (i) => { if (tpl.scenes.length <= 1) return; const scenes = tpl.scenes.filter((_, j) => j !== i); commit({ ...tpl, scenes }); setLayerId(null); seek(sceneStart(scenes, Math.max(0, i - 1)) + 0.05) }
  const moveScene = (i, d) => { const j = i + d; if (j < 0 || j >= tpl.scenes.length) return; const scenes = [...tpl.scenes]; [scenes[i], scenes[j]] = [scenes[j], scenes[i]]; commit({ ...tpl, scenes }); seek(sceneStart(scenes, j) + 0.05) }

  const seek = (t) => { headRef.current = t; setHead(t); setPlaying(false) }
  // seleccionar una escena = mover el playhead a su inicio (así activeIdx pasa a ser esa escena)
  const selectScene = (i) => { setLayerId(null); seek(sceneStart(tpl.scenes, i) + 0.05) }

  // click en el lienzo -> selecciona la capa que está debajo (hit-test topmost); luego arrastra para
  // moverla. Pausa al agarrar (la escena no se mueve mientras editás). Si no acertás pero hay una capa
  // seleccionada en esta escena, la arrastra igual.
  const norm = (e) => { const r = cvRef.current.getBoundingClientRect(); return [clamp((e.clientX - r.left) / r.width, 0, 1), clamp((e.clientY - r.top) / r.height, 0, 1)] }
  const onDown = (e) => {
    const [nx, ny] = norm(e); setPlaying(false)
    const hit = hitTest(video, activeIdx, nx, ny)
    if (hit) { setLayerId(hit); dragRef.current = { id: hit } }
    else if (layer && scene.layers.some(l => l.id === layer.id)) dragRef.current = { id: layer.id }
    else dragRef.current = null
  }
  const onMove = (e) => { if (!dragRef.current) return; const [x, y] = norm(e); const id = dragRef.current.id; const scenes = tpl.scenes.map((s2, j) => j === activeIdx ? { ...s2, layers: s2.layers.map(l => l.id === id ? { ...l, x: +x.toFixed(3), y: +y.toFixed(3) } : l) } : s2); commit({ ...tpl, scenes }) }
  const onUp = () => { dragRef.current = null }

  // --- persistencia / GESTOR de templates (patrón urvid advanced: gestor -> editor) ---
  // entra a un template al editor sin re-guardarlo (el snapshot evita el write/bump-ts al solo abrir)
  const enterEditor = (t) => { const nt = normalizeTemplate(t); if (!nt.scenes.length) nt.scenes = scaffoldScenes(); savedSnapRef.current = JSON.stringify(nt); dirtyRef.current = false; setTpl(nt); setLayerId(null); seek(0); setMode('editor') }
  // flush del template saliente si tenía cambios sin guardar (antes de reemplazarlo por otro)
  const flushCurrent = async () => { if (dirtyRef.current) { dirtyRef.current = false; await saveTemplate(tplRef.current) } }
  const save = async () => { setStatus('guardando…'); savedSnapRef.current = JSON.stringify(tpl); dirtyRef.current = false; const { list, synced } = await saveTemplate(tpl); setSaved(list); setStatus(synced ? 'guardado ✓' : 'guardado local'); setTimeout(() => setStatus(''), 2500) }
  const del = async (id) => { const { list } = await deleteTemplate(id); setSaved(list) }
  const openTemplate = (t) => enterEditor(t)
  // crear: pide SOLO el nombre; se le asigna un ID único (a la vista, lo usan los motores) y se guarda al crear.
  const createTemplate = async (name) => {
    const id = makeTemplateId(saved.map(t => t.id))
    const t = blankTemplate((name || '').trim() || 'Template sin título', id)
    savedSnapRef.current = JSON.stringify(t); dirtyRef.current = false
    setTpl(t); setLayerId(null); seek(0); setMode('editor')
    const { list } = await saveTemplate(t); setSaved(list)
  }
  const duplicateTemplate = async (t) => {
    const id = makeTemplateId(saved.map(x => x.id))
    const copy = normalizeTemplate({ ...JSON.parse(JSON.stringify(t)), id, name: (t.name || 'Template') + ' (copia)' })
    const { list } = await saveTemplate(copy); setSaved(list)
  }
  // volver al gestor: flush del actual + RE-SYNC desde Firestore (para ver cambios de otros admins)
  const backToManager = async () => { setPlaying(false); await save(); const list = await loadTemplates(); setSaved(list); setMode('manager') }
  // cargar un diseño de galería como template NUEVO (id fresco): flushea el saliente y guarda el nuevo ya
  const loadGallery = async (id) => {
    const g = GALLERY.find(t => t.id === id); if (!g) return
    await flushCurrent()
    const nid = makeTemplateId(saved.map(t => t.id))
    const t = normalizeTemplate({ ...JSON.parse(JSON.stringify(g)), id: nid, name: g.name })
    savedSnapRef.current = JSON.stringify(t); dirtyRef.current = false
    setTpl(t); setLayerId(null); seek(0)
    const { list } = await saveTemplate(t); setSaved(list)
  }
  // aplicar un template pegado como JSON: flushea el saliente, garantiza ID único (si no trae uno con
  // formato TPL-, le asigna uno nuevo -> no pisa otro por colisión) y >=1 escena (evita crash), y lo guarda
  const applyJson = async () => {
    let parsed; try { parsed = JSON.parse(io) } catch (err) { alert('JSON invalido: ' + err.message); return }
    await flushCurrent()
    const id = (typeof parsed.id === 'string' && /^TPL-/.test(parsed.id)) ? parsed.id : makeTemplateId(saved.map(t => t.id))
    const t = normalizeTemplate({ ...parsed, id })
    if (!t.scenes.length) t.scenes = scaffoldScenes()
    savedSnapRef.current = JSON.stringify(t); dirtyRef.current = false
    setTpl(t); setLayerId(null); seek(0); setIo(null); setMode('editor')   // entra al editor con el importado (sirve desde el gestor tambien)
    const { list } = await saveTemplate(t); setSaved(list)
  }
  const copyId = (id) => { try { navigator.clipboard && navigator.clipboard.writeText(id) } catch { /* noop */ } setCopiedId(id); setTimeout(() => setCopiedId(cur => cur === id ? null : cur), 1600) }

  // modal Importar/Exportar JSON — compartido por el gestor (importar un template pegado) y el editor
  // (exportar/importar el actual). applyJson le asigna ID único, garantiza >=1 escena y entra al editor.
  const jsonModal = io != null && (
    <div className={s.modal} onClick={() => setIo(null)}>
      <div className={s.modalBox} onClick={e => e.stopPropagation()}>
        <div className={s.secLabel}>Template como JSON <span>pegá el que te paso, o copiá el tuyo</span></div>
        <textarea className={s.io} value={io} onChange={e => setIo(e.target.value)} spellCheck={false} placeholder="Pegá acá el JSON del template…" />
        <div className={s.row}>
          <button className={s.btn} onClick={() => { navigator.clipboard?.writeText(io) }}>Copiar</button>
          <button className={s.btn} onClick={() => setIo(null)}>Cerrar</button>
          <button className={`${s.btn} ${s.primary}`} onClick={applyJson}>Aplicar</button>
        </div>
      </div>
    </div>
  )

  if (!isAdmin(user?.email)) return <div className={s.wrap}><div className={s.denied}>Acceso restringido.</div></div>

  // ---- GESTOR de templates (grid de tarjetas; se ve el sidebar de la app) ----
  if (mode === 'manager') {
    return (
      <div className={s.mgrWrap}>
        <div className={s.mgr}>
          <div className={s.mgrHead}>
            <div>
              <h1 className={s.mgrTitle}>Editor de templates</h1>
              <p className={s.mgrLead}>Tus templates autorados. Creá uno nuevo o abrí uno para seguir editándolo. Cada template tiene un ID único que los motores van a usar para identificarlo.</p>
            </div>
            <div className={s.mgrHeadBtns}>
              <button className={s.mgrGhost} onClick={() => setIo('')}>Importar JSON</button>
              <button className={s.mgrNew} onClick={() => { setNewName(''); setNewOpen(true) }}>＋ Nuevo template</button>
            </div>
          </div>
          {saved.length === 0
            ? <div className={s.mgrEmpty}><b>Todavía no tenés templates</b><span>Creá tu primer template para empezar a editar.</span><button className={s.mgrNew} onClick={() => { setNewName(''); setNewOpen(true) }}>＋ Crear template</button></div>
            : <div className={s.mgrGrid}>
                {saved.map(t => (
                  <div key={t.id} className={s.card}>
                    <button className={s.cardOpen} onClick={() => openTemplate(t)} title="Abrir">
                      <div className={s.cardThumb}><TemplateThumb tpl={t} /></div>
                      <div className={s.cardBody}>
                        <div className={s.cardName}>{t.name}</div>
                        <div className={s.cardMeta}>{(t.scenes || []).length} escena{(t.scenes || []).length === 1 ? '' : 's'} · {new Date(t.ts || Date.now()).toLocaleDateString('es')}</div>
                      </div>
                    </button>
                    <div className={s.cardIdRow}>
                      <code className={s.cardId} title="Identificador único (lo usan los motores)">{t.id}</code>
                      <button className={s.cardIdCopy} onClick={() => copyId(t.id)} title="Copiar ID">{copiedId === t.id ? '✓' : '⧉'}</button>
                    </div>
                    <div className={s.cardActions}>
                      <button className={s.cardBtn} onClick={() => duplicateTemplate(t)}>Duplicar</button>
                      <button className={`${s.cardBtn} ${s.cardDel}`} onClick={() => del(t.id)}>Borrar</button>
                    </div>
                  </div>
                ))}
              </div>}
        </div>
        {newOpen && (
          <div className={s.mgrModalBg} onClick={() => setNewOpen(false)}>
            <div className={s.mgrModalBox} onClick={e => e.stopPropagation()}>
              <div className={s.mgrModalTitle}>Nuevo template</div>
              <label className={s.mgrField}><span>Nombre del template</span>
                <input className={s.mgrInput} autoFocus value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ej: Promo lanzamiento" onKeyDown={e => { if (e.key === 'Enter') { setNewOpen(false); createTemplate(newName) } }} />
              </label>
              <div className={s.mgrHint}>Al crearlo se le asigna un ID único (visible en el editor) que los motores usarán para identificarlo.</div>
              <div className={s.row} style={{ justifyContent: 'flex-end', marginTop: 4 }}>
                <button className={s.mgrBtn} onClick={() => setNewOpen(false)}>Cancelar</button>
                <button className={`${s.mgrBtn} ${s.mgrPrimary}`} onClick={() => { setNewOpen(false); createTemplate(newName) }}>Crear y editar</button>
              </div>
            </div>
          </div>
        )}
        {jsonModal}
      </div>
    )
  }

  return (
    <div className={s.editor}>
      {/* IZQUIERDA · escenas + template */}
      <aside className={s.left}>
        <button className={s.backBtn} onClick={backToManager} title="Volver al gestor de templates">‹ Templates</button>
        <input className={s.name} value={tpl.name} onChange={e => commit({ ...tpl, name: e.target.value })} />
        <div className={s.idChip} title="Identificador único del template — lo usan los motores para referenciarlo">
          <span className={s.idLabel}>ID</span><code className={s.idVal}>{tpl.id}</code>
          <button className={s.idCopy} onClick={() => copyId(tpl.id)}>{copiedId === tpl.id ? '✓' : '⧉'}</button>
        </div>
        <div className={s.row}>
          <select className={s.sel} value={tpl.mode} onChange={e => commit({ ...tpl, mode: e.target.value })}><option value="dark">Oscuro</option><option value="light">Claro</option></select>
        </div>
        <select className={s.sel} style={{ width: '100%', marginBottom: 8 }} value="" onChange={e => loadGallery(e.target.value)}>
          <option value="">Empezar desde galería…</option>
          {GALLERY.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <button className={s.btn} style={{ width: '100%' }} onClick={() => setIo(JSON.stringify(tpl, null, 2))}>Importar / Exportar JSON</button>
        <div className={s.secLabel}>Escenas</div>
        <div className={s.scenes}>
          {tpl.scenes.map((sc, i) => (
            <div key={sc.id} className={`${s.sceneRow} ${i === activeIdx ? s.on : ''}`} onClick={() => selectScene(i)}>
              <span className={s.sceneNo}>{i + 1}</span>
              <span className={s.sceneMeta}>{sc.layers.length} capas · {sc.dur}s</span>
              <span className={s.sceneActions}>
                <button onClick={e => { e.stopPropagation(); moveScene(i, -1) }} title="Subir">▲</button>
                <button onClick={e => { e.stopPropagation(); moveScene(i, 1) }} title="Bajar">▼</button>
                <button onClick={e => { e.stopPropagation(); delScene(i) }} title="Borrar">×</button>
              </span>
            </div>
          ))}
          <button className={s.addScene} onClick={addScene}>+ Escena</button>
        </div>
      </aside>

      {/* CENTRO · stage */}
      <div className={s.stage}>
        <div className={s.frame}>
          <canvas ref={cvRef} className={s.canvas} onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp} />
          {/* indicador de escena en vivo (se actualiza con el playhead) */}
          <div className={s.sceneTag}><b>Escena {activeIdx + 1}</b><span>/ {tpl.scenes.length}</span></div>
        </div>
        <div className={s.transport}>
          <button className={s.btn} onClick={() => setPlaying(p => !p)}>{playing ? '⏸' : '▶'}</button>
          <input type="range" min={0} max={video.duration} step={0.01} value={Math.min(head, video.duration)} onChange={e => seek(Number(e.target.value))} className={s.scrub} />
          <span className={s.time}>{head.toFixed(1)}s / {video.duration.toFixed(1)}s</span>
          <button className={`${s.btn} ${s.primary}`} onClick={save}>{status || 'Guardar'}</button>
        </div>
        <div className={s.hint}>Hacé click en una capa del lienzo para seleccionarla y arrastrala para moverla · o elegila en la lista de la derecha.</div>
      </div>

      {/* DERECHA · propiedades */}
      <aside className={s.right}>
        <div className={s.secLabel}>Escena {activeIdx + 1} <span style={{ color: '#5a6377', fontWeight: 600 }}>de {tpl.scenes.length}</span></div>
        <Field label="Duracion (s)"><input className={s.inp} type="number" min={1} max={12} step={0.1} value={scene.dur} onChange={e => patchScene(activeIdx, { dur: Math.max(1, +e.target.value) })} /></Field>
        <div className={s.pickLabel}>Fondo</div>
        <ThumbGrid items={BACKGROUNDS} value={scene.background?.ref || 'bg.glow-corner'} onChange={v => patchScene(activeIdx, { background: { ...scene.background, ref: v } })} render={bgThumb} w={48} h={85} />

        <div className={s.secLabel}>Capas</div>
        <div className={s.layers}>
          {scene.layers.map(l => (
            <button key={l.id} className={`${s.layerRow} ${l.id === layerId ? s.on : ''}`} onClick={() => setLayerId(l.id)}>
              <span className={s.layerType}>{l.type === 'text' ? (l.slot ? '{ }' : 'T') : l.type === 'shape' ? '◆' : l.type === 'object' ? '✳' : '▣'}</span>
              <span className={s.layerName}>{l.type === 'text' ? (l.slot ? l.slot.kind : (l.text || 'texto')) : l.type === 'shape' ? l.shape : l.type === 'object' ? (l.objectId || 'objeto') : 'imagen'}</span>
            </button>
          ))}
        </div>
        <div className={s.row}>
          <button className={s.btn} onClick={() => addLayer('text')}>+ Texto</button>
          <button className={s.btn} onClick={() => addLayer('object')}>+ Objeto</button>
          <button className={s.btn} onClick={() => addLayer('shape')}>+ Forma</button>
          <button className={s.btn} onClick={() => addLayer('image')}>+ Imagen</button>
        </div>

        {layer && <div className={s.props}>
          <div className={s.secLabel}>Capa · {layer.type}<button className={s.delLayer} onClick={delLayer}>Eliminar</button></div>
          <Field label="Posicion X"><input className={s.inp} type="range" min={0} max={1} step={0.01} value={layer.x ?? 0.5} onChange={e => patchLayer({ x: +e.target.value })} /></Field>
          <Field label="Posicion Y"><input className={s.inp} type="range" min={0} max={1} step={0.01} value={layer.y ?? 0.5} onChange={e => patchLayer({ y: +e.target.value })} /></Field>
          <Field label="Escala"><input className={s.inp} type="range" min={0.2} max={2.5} step={0.05} value={layer.scale ?? 1} onChange={e => patchLayer({ scale: +e.target.value })} /></Field>
          <Field label="Rotacion"><input className={s.inp} type="range" min={-0.5} max={0.5} step={0.01} value={layer.rot ?? 0} onChange={e => patchLayer({ rot: +e.target.value })} /></Field>

          {layer.type === 'text' && <>
            <Field label="Contenido">
              <select className={s.sel} value={layer.slot ? 'slot' : 'fijo'} onChange={e => patchLayer(e.target.value === 'slot' ? { slot: { kind: 'headline', maxChars: 40, maxLines: 3 }, text: undefined } : { slot: undefined, text: layer.text || 'Texto' })}>
                <option value="fijo">Texto fijo</option><option value="slot">Slot (automatico)</option></select>
            </Field>
            {layer.slot
              ? <>
                <Field label="Tipo de slot"><select className={s.sel} value={layer.slot.kind} onChange={e => patchLayer({ slot: { ...layer.slot, kind: e.target.value } })}>{SLOTS.map(k => <option key={k} value={k}>{k}</option>)}</select></Field>
                <Field label="Max caracteres"><input className={s.inp} type="number" min={4} max={200} value={layer.slot.maxChars || 40} onChange={e => patchLayer({ slot: { ...layer.slot, maxChars: +e.target.value } })} /></Field>
                {layer.slot.kind === 'list'
                  ? <Field label="Max items"><input className={s.inp} type="number" min={1} max={6} value={layer.slot.maxItems || 3} onChange={e => patchLayer({ slot: { ...layer.slot, maxItems: +e.target.value } })} /></Field>
                  : <Field label="Max lineas"><input className={s.inp} type="number" min={1} max={4} value={layer.slot.maxLines || 2} onChange={e => patchLayer({ slot: { ...layer.slot, maxLines: +e.target.value } })} /></Field>}
              </>
              : <Field label="Texto"><input className={s.inp} value={layer.text || ''} onChange={e => patchLayer({ text: e.target.value })} /></Field>}
            <Field label="Fuente"><select className={s.sel} value={layer.style?.font || 'Archivo'} onChange={e => patchLayer({ style: { font: e.target.value } })}>{FONTS.map(f => <option key={f} value={f}>{f}</option>)}</select></Field>
            <Field label="Tamano"><input className={s.inp} type="number" min={12} max={160} value={layer.style?.size || 60} onChange={e => patchLayer({ style: { size: +e.target.value } })} /></Field>
            <Field label="Peso"><select className={s.sel} value={layer.style?.weight || 800} onChange={e => patchLayer({ style: { weight: +e.target.value } })}>{[400, 500, 600, 700, 800, 900].map(w => <option key={w} value={w}>{w}</option>)}</select></Field>
            <Field label="Color"><TokenSel value={layer.style?.color || 'ink'} onChange={v => patchLayer({ style: { color: v } })} pal={thumbPal} /></Field>
            <Field label="Alineacion"><select className={s.sel} value={layer.style?.align || 'center'} onChange={e => patchLayer({ style: { align: e.target.value } })}><option value="left">izq</option><option value="center">centro</option><option value="right">der</option></select></Field>
          </>}

          {layer.type === 'shape' && <>
            <div className={s.pickLabel}>Forma</div>
            <ThumbGrid items={SHAPES.map(sh => ({ id: sh, label: sh }))} value={layer.shape} onChange={v => patchLayer({ shape: v })} render={shapeThumb} w={54} h={54} />
            <Field label="Relleno"><TokenSel value={layer.shapeStyle?.fill || ''} onChange={v => patchLayer({ shapeStyle: { fill: v } })} allowNone pal={thumbPal} /></Field>
            <Field label="Borde"><TokenSel value={layer.shapeStyle?.stroke || ''} onChange={v => patchLayer({ shapeStyle: { stroke: v } })} allowNone pal={thumbPal} /></Field>
            <Field label="Tamano"><input className={s.inp} type="number" min={8} max={400} value={layer.shapeStyle?.r || layer.shapeStyle?.w || 100} onChange={e => patchLayer({ shapeStyle: { r: +e.target.value, w: +e.target.value } })} /></Field>
            <Field label="Glow"><input className={s.inp} type="range" min={0} max={1} step={0.05} value={layer.shapeStyle?.glow || 0} onChange={e => patchLayer({ shapeStyle: { glow: +e.target.value } })} /></Field>
          </>}

          {layer.type === 'object' && <>
            <div className={s.pickLabel}>Objeto</div>
            <ThumbGrid items={OBJECTS} value={layer.objectId} onChange={v => patchLayer({ objectId: v, params: {} })} render={objThumb} w={48} h={85} />
            <Field label="Tamano"><input className={s.inp} type="number" min={10} max={220} value={layer.params?.size || layer.params?.r || 60} onChange={e => patchLayer({ params: { size: +e.target.value, r: +e.target.value } })} /></Field>
            <Field label="Glow"><input className={s.inp} type="range" min={0} max={1} step={0.05} value={layer.params?.glow ?? 0.4} onChange={e => patchLayer({ params: { glow: +e.target.value } })} /></Field>
            <Field label="Giro (°/s)"><input className={s.inp} type="number" min={-180} max={180} value={layer.params?.degPerSec || 0} onChange={e => patchLayer({ params: { degPerSec: +e.target.value } })} /></Field>
            <Field label="Color"><TokenSel value={layer.params?.color || 'accent'} onChange={v => patchLayer({ params: { color: v } })} pal={thumbPal} /></Field>
            {layer.objectId === 'morph' && <>
              <Field label="Desde"><select className={s.sel} value={layer.params?.from || 'square'} onChange={e => patchLayer({ params: { from: e.target.value } })}>{['square', 'circle', 'star', 'triangle', 'hexagon', 'drop'].map(k => <option key={k} value={k}>{k}</option>)}</select></Field>
              <Field label="Hacia"><select className={s.sel} value={layer.params?.to || 'drop'} onChange={e => patchLayer({ params: { to: e.target.value } })}>{['drop', 'circle', 'star', 'square', 'triangle', 'hexagon'].map(k => <option key={k} value={k}>{k}</option>)}</select></Field>
            </>}
          </>}

          <div className={s.secLabel2}>Animacion</div>
          <AnimPreview animIn={layer.anim?.in || 'rise'} pal={thumbPal} />
          <Field label="Entrada"><select className={s.sel} value={layer.anim?.in || 'rise'} onChange={e => patchLayer({ anim: { in: e.target.value } })}>{ANIM_IN.map(a => <option key={a} value={a}>{a}</option>)}</select></Field>
          <Field label="Duracion"><input className={s.inp} type="range" min={0.2} max={1.6} step={0.05} value={layer.anim?.inDur ?? 0.6} onChange={e => patchLayer({ anim: { inDur: +e.target.value } })} /></Field>
          <Field label="Retraso"><input className={s.inp} type="range" min={0} max={2.5} step={0.05} value={layer.anim?.delay ?? 0} onChange={e => patchLayer({ anim: { delay: +e.target.value } })} /></Field>
          <Field label="Idle"><select className={s.sel} value={layer.anim?.idle === false ? 'none' : (layer.anim?.idle === true || layer.anim?.idle == null ? 'drift' : layer.anim.idle)} onChange={e => patchLayer({ anim: { idle: e.target.value } })}>{IDLE_KINDS.map(k => <option key={k} value={k}>{k}</option>)}</select></Field>
          <Field label="Salida"><select className={s.sel} value={layer.anim?.out || 'fade'} onChange={e => patchLayer({ anim: { out: e.target.value } })}>{ANIM_OUT.map(a => <option key={a} value={a}>{a}</option>)}</select></Field>
        </div>}
      </aside>

      {jsonModal}
    </div>
  )
}

function Field({ label, children }) { return <label className={s.field}><span>{label}</span>{children}</label> }

// selector de color: swatches con el color real de la paleta (o select si no hay pal)
function TokenSel({ value, onChange, allowNone, pal }) {
  if (!pal) return <select className={s.sel} value={value} onChange={e => onChange(e.target.value)}>{allowNone && <option value="">(ninguno)</option>}{TOKENS.map(t => <option key={t} value={t}>{t}</option>)}</select>
  return <div className={s.swatches}>
    {allowNone && <button className={`${s.swatch} ${value === '' ? s.swOn : ''}`} style={{ background: 'transparent', border: '1px dashed #556' }} onClick={() => onChange('')} title="ninguno">∅</button>}
    {TOKENS.map(t => <button key={t} className={`${s.swatch} ${value === t ? s.swOn : ''}`} style={{ background: resolveColor(t, pal) }} onClick={() => onChange(t)} title={t} />)}
  </div>
}

// SHAPE path para miniaturas
const SHAPE_PATH = { rect: (c, r) => rectPath(c - r, c - r * 0.7, r * 2, r * 1.4, r * 0.14), circle: (c, r) => circlePath(c, c, r), star: (c, r) => starPath(c, c, r, r * 0.44, 5), poly: (c, r) => polygonPath(c, c, r, 6), line: (c, r) => linePath(c - r, c, c + r, c) }

// canvas de miniatura: render(ctx, id, W, H) — se dibuja UNA vez (deps estables: render + id)
function Thumb({ render, id, w, h }) {
  const ref = useRef(null)
  useEffect(() => { const cv = ref.current; if (!cv) return; const ctx = cv.getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); try { render(ctx, id, cv.width, cv.height) } catch { /* noop */ } }, [render, id])
  return <canvas ref={ref} width={w} height={h} className={s.thumb} />
}

// grilla de miniaturas seleccionable
function ThumbGrid({ items, value, onChange, render, w, h }) {
  return <div className={s.thumbGrid}>
    {items.map(it => (
      <button key={it.id} className={`${s.thumbCell} ${value === it.id ? s.thumbOn : ''}`} onClick={() => onChange(it.id)} title={it.label}>
        <Thumb render={render} id={it.id} w={w} h={h} />
        <span className={s.thumbLabel}>{it.label}</span>
      </button>
    ))}
  </div>
}

// miniatura ESTATICA de un template (primer frame de la escena 1, con el brief de muestra) para las
// tarjetas del gestor. Se dibuja una vez con el motor -> vista previa real del diseño.
function TemplateThumb({ tpl }) {
  const ref = useRef(null)
  useEffect(() => {
    const cv = ref.current; if (!cv) return
    const ctx = cv.getContext('2d')
    try {
      const rv = makeTemplateVideo(tpl, SAMPLE)
      const DPR = Math.min(window.devicePixelRatio || 1, 2)
      cv.width = Math.round(96 * DPR); cv.height = Math.round(170 * DPR)
      ctx.setTransform(cv.width / rv.W, 0, 0, cv.height / rv.H, 0, 0)
      const t0 = (rv.scenes[0] && rv.scenes[0].t0) || 0
      drawTemplateFrame(ctx, t0 + 0.6, rv)
    } catch { /* template invalido -> miniatura vacia */ }
  }, [tpl])
  return <canvas ref={ref} className={s.cardCanvas} />
}

// preview animado (loop) de la entrada seleccionada, sobre un cuadrado de muestra
function AnimPreview({ animIn, pal }) {
  const ref = useRef(null), raf = useRef(0)
  useEffect(() => {
    const cv = ref.current; if (!cv) return; const ctx = cv.getContext('2d'); const t0 = performance.now()
    const loop = (now) => {
      const ts = ((now - t0) / 1000) % 2.6
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height)
      ctx.fillStyle = pal.surface; ctx.fillRect(0, 0, cv.width, cv.height)
      const e = Math.min(ts / 0.7, 1), s = 1 - Math.pow(1 - e, 3)
      let a = 1, dx = 0, dy = 0, sc = 1, rot = 0
      if (animIn === 'fade') a = s; else if (animIn === 'rise') { a = s; dy = (1 - s) * 22 } else if (animIn === 'drop') { a = s; dy = -(1 - s) * 22 } else if (animIn === 'slide-l') { a = s; dx = -(1 - s) * 40 } else if (animIn === 'slide-r') { a = s; dx = (1 - s) * 40 } else if (animIn === 'zoom') { a = s; sc = 1.4 - 0.4 * s } else if (animIn === 'zoom-in' || animIn === 'pop') { a = s; sc = 0.4 + 0.6 * s } else if (animIn === 'whip') { a = s; dx = (1 - s) * 34; rot = (1 - s) * 0.3 } else if (animIn === 'peel-l') { a = s; dx = -(1 - s) * 44; rot = -(1 - s) * 0.8 } else if (animIn === 'peel-r') { a = s; dx = (1 - s) * 44; rot = (1 - s) * 0.8 }
      const cx = cv.width / 2, cy = cv.height / 2
      ctx.globalAlpha = Math.max(0, a); ctx.translate(cx + dx, cy + dy); ctx.rotate(rot); ctx.scale(sc, sc)
      ctx.fillStyle = pal.accent; ctx.fillRect(-14, -14, 28, 28)
      raf.current = requestAnimationFrame(loop)
    }
    raf.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf.current)
  }, [animIn, pal])
  return <canvas ref={ref} width={190} height={80} className={s.animPrev} />
}

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
// merge superficial por sub-objeto (style/anim/slot/shapeStyle se fusionan, no se pisan)
function deepMerge(l, p) { const out = { ...l }; for (const k in p) { if (p[k] && typeof p[k] === 'object' && !Array.isArray(p[k]) && l[k] && typeof l[k] === 'object') out[k] = { ...l[k], ...p[k] }; else out[k] = p[k] } return out }
