import { useEffect, useMemo, useRef, useState } from 'react'
import { makeTemplateVideo, drawTemplateFrame, normalizeTemplate, EXAMPLE_TEMPLATES, OBJECTS, OBJECT_IDS, BACKGROUNDS, ANIM_IN, ANIM_OUT, IDLE_KINDS, hitTest } from '../../templates/index.js'
import { useAuth } from '../../contexts/AuthContext'
import { isAdmin } from '../../lib/admin'
import { loadTemplates, saveTemplate, deleteTemplate } from '../../lib/templateStore'
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
const blankTemplate = () => normalizeTemplate({ id: uid('tpl'), name: 'Nuevo template', mode: 'dark', scenes: [{ id: uid('sc'), dur: 3, background: { kind: 'glow' }, layers: [{ id: uid('ly'), type: 'text', y: 0.47, slot: { kind: 'headline', maxChars: 40, maxLines: 3 }, style: { size: 74, weight: 900, color: 'ink', font: 'Archivo' }, anim: { in: 'cascade', inDur: 1, delay: 0, idle: true, out: 'fade' } }] }] })
const blankLayer = (type) => ({
  text: { id: uid('ly'), type: 'text', x: 0.5, y: 0.5, scale: 1, rot: 0, text: 'Texto', style: { size: 60, weight: 800, color: 'ink', font: 'Archivo', align: 'center' }, anim: { in: 'rise', inDur: 0.6, delay: 0, idle: 'drift', out: 'fade' } },
  shape: { id: uid('ly'), type: 'shape', x: 0.5, y: 0.6, scale: 1, rot: 0, shape: 'line', shapeStyle: { w: 130, stroke: 'accent', width: 4 }, anim: { in: 'slide-l', inDur: 0.5, delay: 0, idle: 'drift', out: 'fade' } },
  image: { id: uid('ly'), type: 'image', x: 0.5, y: 0.42, scale: 1, rot: 0, shapeStyle: { w: 240, h: 300, r: 10 }, anim: { in: 'pop', inDur: 0.5, delay: 0, idle: 'drift', out: 'fade' } },
  object: { id: uid('ly'), type: 'object', objectId: 'morph', x: 0.5, y: 0.42, scale: 1, rot: 0, params: {}, anim: { in: 'pop', inDur: 0.6, delay: 0, idle: 'float', out: 'fade' } },
}[type])

export default function TemplateEditor() {
  const { user } = useAuth()
  const [tpl, setTpl] = useState(blankTemplate)
  const [sceneIdx, setSceneIdx] = useState(0)
  const [layerId, setLayerId] = useState(null)
  const [saved, setSaved] = useState([])
  const [playing, setPlaying] = useState(true)
  const [head, setHead] = useState(0)
  const [status, setStatus] = useState('')
  const [io, setIo] = useState(null)
  const headRef = useRef(0), cvRef = useRef(null), dragRef = useRef(null)

  const video = useMemo(() => makeTemplateVideo(tpl, SAMPLE), [tpl])
  useEffect(() => { loadTemplates().then(setSaved) }, [])

  const scene = tpl.scenes[sceneIdx] || tpl.scenes[0]
  const layer = scene?.layers.find(l => l.id === layerId) || null

  // el loop lee todo por refs -> se monta UNA vez y no se desarma en cada edit (robusto)
  const videoRef = useRef(video); videoRef.current = video
  const playingRef = useRef(playing); playingRef.current = playing
  const layerRef = useRef(layer); layerRef.current = layer
  useEffect(() => {
    const cv = cvRef.current; if (!cv) return
    const ctx = cv.getContext('2d'); const DPR = Math.min(window.devicePixelRatio || 1, 2)
    let raf, last = performance.now()
    const loop = (now) => {
      const v = videoRef.current
      if (cv.width !== Math.round(v.W * DPR)) { cv.width = Math.round(v.W * DPR); cv.height = Math.round(v.H * DPR) }
      const dt = Math.min((now - last) / 1000, 0.05); last = now
      if (playingRef.current) { headRef.current += dt; if (headRef.current >= v.duration) headRef.current = 0 }
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
      drawTemplateFrame(ctx, headRef.current, v)
      const L = layerRef.current
      if (L) { const lx = (L.x ?? 0.5) * v.W, ly = (L.y ?? 0.5) * v.H; ctx.strokeStyle = '#4f9dff'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]); ctx.strokeRect(lx - 46, ly - 30, 92, 60); ctx.setLineDash([]); ctx.fillStyle = '#4f9dff'; ctx.beginPath(); ctx.arc(lx, ly, 4, 0, 6.283); ctx.fill() }
      setHead(headRef.current)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  // --- updates inmutables ---
  const commit = (next) => setTpl({ ...next })
  const patchScene = (i, p) => { const scenes = tpl.scenes.map((s2, j) => j === i ? { ...s2, ...p } : s2); commit({ ...tpl, scenes }) }
  const patchLayer = (p) => { const scenes = tpl.scenes.map((s2, j) => j === sceneIdx ? { ...s2, layers: s2.layers.map(l => l.id === layerId ? deepMerge(l, p) : l) } : s2); commit({ ...tpl, scenes }) }
  const addLayer = (type) => { const l = blankLayer(type); const scenes = tpl.scenes.map((s2, j) => j === sceneIdx ? { ...s2, layers: [...s2.layers, l] } : s2); commit({ ...tpl, scenes }); setLayerId(l.id) }
  const delLayer = () => { if (!layerId) return; const scenes = tpl.scenes.map((s2, j) => j === sceneIdx ? { ...s2, layers: s2.layers.filter(l => l.id !== layerId) } : s2); commit({ ...tpl, scenes }); setLayerId(null) }
  const addScene = () => { const sc = { id: uid('sc'), dur: 3, background: { kind: 'glow' }, layers: [] }; commit({ ...tpl, scenes: [...tpl.scenes, sc] }); setSceneIdx(tpl.scenes.length); seek(video.duration) }
  const delScene = (i) => { if (tpl.scenes.length <= 1) return; const scenes = tpl.scenes.filter((_, j) => j !== i); commit({ ...tpl, scenes }); setSceneIdx(Math.max(0, i - 1)) }
  const moveScene = (i, d) => { const j = i + d; if (j < 0 || j >= tpl.scenes.length) return; const scenes = [...tpl.scenes]; [scenes[i], scenes[j]] = [scenes[j], scenes[i]]; commit({ ...tpl, scenes }); setSceneIdx(j) }

  const seek = (t) => { headRef.current = t; setHead(t); setPlaying(false) }
  const selectScene = (i) => { setSceneIdx(i); setLayerId(null); seek(tpl.scenes.slice(0, i).reduce((a, s2) => a + s2.dur, 0) + 0.4) }

  // click en el lienzo -> selecciona la capa mas cercana (hit-test); luego arrastra para moverla
  const norm = (e) => { const r = cvRef.current.getBoundingClientRect(); return [clamp((e.clientX - r.left) / r.width, 0, 1), clamp((e.clientY - r.top) / r.height, 0, 1)] }
  const onDown = (e) => { const [nx, ny] = norm(e); const hit = hitTest(video, sceneIdx, nx, ny); if (hit) { setLayerId(hit); dragRef.current = { id: hit } } else dragRef.current = null }
  const onMove = (e) => { if (!dragRef.current) return; const [x, y] = norm(e); const id = dragRef.current.id; const scenes = tpl.scenes.map((s2, j) => j === sceneIdx ? { ...s2, layers: s2.layers.map(l => l.id === id ? { ...l, x: +x.toFixed(3), y: +y.toFixed(3) } : l) } : s2); commit({ ...tpl, scenes }) }
  const onUp = () => { dragRef.current = null }

  const save = async () => { setStatus('guardando…'); const { synced } = await saveTemplate(tpl); const list = await loadTemplates(); setSaved(list); setStatus(synced ? 'guardado ✓' : 'guardado local'); setTimeout(() => setStatus(''), 2500) }
  const load = (t) => { setTpl(normalizeTemplate(t)); setSceneIdx(0); setLayerId(null); seek(0) }
  const del = async (id) => { const { list } = await deleteTemplate(id); setSaved(list) }
  const loadExample = () => load({ ...EXAMPLE_TEMPLATES[0], id: uid('tpl'), name: 'Promo basico (copia)' })
  const newBlank = () => { setTpl(blankTemplate()); setSceneIdx(0); setLayerId(null); seek(0) }

  if (!isAdmin(user?.email)) return <div className={s.wrap}><div className={s.denied}>Acceso restringido.</div></div>

  return (
    <div className={s.editor}>
      {/* IZQUIERDA · escenas + template */}
      <aside className={s.left}>
        <input className={s.name} value={tpl.name} onChange={e => commit({ ...tpl, name: e.target.value })} />
        <div className={s.row}>
          <select className={s.sel} value={tpl.mode} onChange={e => commit({ ...tpl, mode: e.target.value })}><option value="dark">Oscuro</option><option value="light">Claro</option></select>
          <button className={s.btn} onClick={newBlank}>Nuevo</button>
          <button className={s.btn} onClick={loadExample}>Ejemplo</button>
        </div>
        <button className={s.btn} style={{ width: '100%' }} onClick={() => setIo(JSON.stringify(tpl, null, 2))}>Importar / Exportar JSON</button>
        <div className={s.secLabel}>Escenas</div>
        <div className={s.scenes}>
          {tpl.scenes.map((sc, i) => (
            <div key={sc.id} className={`${s.sceneRow} ${i === sceneIdx ? s.on : ''}`} onClick={() => selectScene(i)}>
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
        <div className={s.secLabel}>Mis templates</div>
        <div className={s.saved}>
          {saved.length === 0 && <div className={s.empty}>Todavia no guardaste ninguno.</div>}
          {saved.map(t => (
            <div key={t.id} className={s.savedRow}>
              <button className={s.savedMain} onClick={() => load(t)}>{t.name}<span>{(t.scenes || []).length} esc.</span></button>
              <button className={s.savedDel} onClick={() => del(t.id)}>×</button>
            </div>
          ))}
        </div>
      </aside>

      {/* CENTRO · stage */}
      <div className={s.stage}>
        <div className={s.frame}>
          <canvas ref={cvRef} className={s.canvas} onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp} />
        </div>
        <div className={s.transport}>
          <button className={s.btn} onClick={() => setPlaying(p => !p)}>{playing ? '⏸' : '▶'}</button>
          <input type="range" min={0} max={video.duration} step={0.01} value={Math.min(head, video.duration)} onChange={e => seek(Number(e.target.value))} className={s.scrub} />
          <span className={s.time}>{head.toFixed(1)}s / {video.duration.toFixed(1)}s</span>
          <button className={`${s.btn} ${s.primary}`} onClick={save}>{status || 'Guardar'}</button>
        </div>
        <div className={s.hint}>Selecciona una capa a la derecha y arrastrala en el lienzo para moverla.</div>
      </div>

      {/* DERECHA · propiedades */}
      <aside className={s.right}>
        <div className={s.secLabel}>Escena {sceneIdx + 1}</div>
        <Field label="Duracion (s)"><input className={s.inp} type="number" min={1} max={12} step={0.1} value={scene.dur} onChange={e => patchScene(sceneIdx, { dur: Math.max(1, +e.target.value) })} /></Field>
        <Field label="Fondo"><select className={s.sel} value={scene.background?.ref || 'bg.glow-corner'} onChange={e => patchScene(sceneIdx, { background: { ...scene.background, ref: e.target.value } })}>{BACKGROUNDS.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}</select></Field>

        <div className={s.secLabel}>Capas</div>
        <div className={s.layers}>
          {scene.layers.map(l => (
            <button key={l.id} className={`${s.layerRow} ${l.id === layerId ? s.on : ''}`} onClick={() => setLayerId(l.id)}>
              <span className={s.layerType}>{l.type === 'text' ? (l.slot ? '{ }' : 'T') : l.type === 'shape' ? '◆' : '▣'}</span>
              <span className={s.layerName}>{l.type === 'text' ? (l.slot ? l.slot.kind : (l.text || 'texto')) : l.type === 'shape' ? l.shape : 'imagen'}</span>
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
            <Field label="Color"><TokenSel value={layer.style?.color || 'ink'} onChange={v => patchLayer({ style: { color: v } })} /></Field>
            <Field label="Alineacion"><select className={s.sel} value={layer.style?.align || 'center'} onChange={e => patchLayer({ style: { align: e.target.value } })}><option value="left">izq</option><option value="center">centro</option><option value="right">der</option></select></Field>
          </>}

          {layer.type === 'shape' && <>
            <Field label="Forma"><select className={s.sel} value={layer.shape} onChange={e => patchLayer({ shape: e.target.value })}>{SHAPES.map(sh => <option key={sh} value={sh}>{sh}</option>)}</select></Field>
            <Field label="Relleno"><TokenSel value={layer.shapeStyle?.fill || ''} onChange={v => patchLayer({ shapeStyle: { fill: v } })} allowNone /></Field>
            <Field label="Borde"><TokenSel value={layer.shapeStyle?.stroke || ''} onChange={v => patchLayer({ shapeStyle: { stroke: v } })} allowNone /></Field>
            <Field label="Tamano"><input className={s.inp} type="number" min={8} max={400} value={layer.shapeStyle?.r || layer.shapeStyle?.w || 100} onChange={e => patchLayer({ shapeStyle: { r: +e.target.value, w: +e.target.value } })} /></Field>
            <Field label="Glow"><input className={s.inp} type="range" min={0} max={1} step={0.05} value={layer.shapeStyle?.glow || 0} onChange={e => patchLayer({ shapeStyle: { glow: +e.target.value } })} /></Field>
          </>}

          {layer.type === 'object' && <>
            <Field label="Objeto"><select className={s.sel} value={layer.objectId} onChange={e => patchLayer({ objectId: e.target.value, params: {} })}>{OBJECTS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}</select></Field>
            <Field label="Tamano"><input className={s.inp} type="number" min={10} max={220} value={layer.params?.size || layer.params?.r || 60} onChange={e => patchLayer({ params: { size: +e.target.value, r: +e.target.value } })} /></Field>
            <Field label="Glow"><input className={s.inp} type="range" min={0} max={1} step={0.05} value={layer.params?.glow ?? 0.4} onChange={e => patchLayer({ params: { glow: +e.target.value } })} /></Field>
            <Field label="Giro (°/s)"><input className={s.inp} type="number" min={-180} max={180} value={layer.params?.degPerSec || 0} onChange={e => patchLayer({ params: { degPerSec: +e.target.value } })} /></Field>
            <Field label="Color"><TokenSel value={layer.params?.color || 'accent'} onChange={v => patchLayer({ params: { color: v } })} /></Field>
            {layer.objectId === 'morph' && <>
              <Field label="Desde"><select className={s.sel} value={layer.params?.from || 'square'} onChange={e => patchLayer({ params: { from: e.target.value } })}>{['square', 'circle', 'star', 'triangle', 'hexagon', 'drop'].map(k => <option key={k} value={k}>{k}</option>)}</select></Field>
              <Field label="Hacia"><select className={s.sel} value={layer.params?.to || 'drop'} onChange={e => patchLayer({ params: { to: e.target.value } })}>{['drop', 'circle', 'star', 'square', 'triangle', 'hexagon'].map(k => <option key={k} value={k}>{k}</option>)}</select></Field>
            </>}
          </>}

          <div className={s.secLabel2}>Animacion</div>
          <Field label="Entrada"><select className={s.sel} value={layer.anim?.in || 'rise'} onChange={e => patchLayer({ anim: { in: e.target.value } })}>{ANIM_IN.map(a => <option key={a} value={a}>{a}</option>)}</select></Field>
          <Field label="Duracion"><input className={s.inp} type="range" min={0.2} max={1.6} step={0.05} value={layer.anim?.inDur ?? 0.6} onChange={e => patchLayer({ anim: { inDur: +e.target.value } })} /></Field>
          <Field label="Retraso"><input className={s.inp} type="range" min={0} max={2.5} step={0.05} value={layer.anim?.delay ?? 0} onChange={e => patchLayer({ anim: { delay: +e.target.value } })} /></Field>
          <Field label="Idle"><select className={s.sel} value={layer.anim?.idle === false ? 'none' : (layer.anim?.idle === true || layer.anim?.idle == null ? 'drift' : layer.anim.idle)} onChange={e => patchLayer({ anim: { idle: e.target.value } })}>{IDLE_KINDS.map(k => <option key={k} value={k}>{k}</option>)}</select></Field>
          <Field label="Salida"><select className={s.sel} value={layer.anim?.out || 'fade'} onChange={e => patchLayer({ anim: { out: e.target.value } })}>{ANIM_OUT.map(a => <option key={a} value={a}>{a}</option>)}</select></Field>
        </div>}
      </aside>

      {io != null && <div className={s.modal} onClick={() => setIo(null)}>
        <div className={s.modalBox} onClick={e => e.stopPropagation()}>
          <div className={s.secLabel}>Template como JSON <span>pega el que te paso, o copia el tuyo</span></div>
          <textarea className={s.io} value={io} onChange={e => setIo(e.target.value)} spellCheck={false} />
          <div className={s.row}>
            <button className={s.btn} onClick={() => { navigator.clipboard?.writeText(io) }}>Copiar</button>
            <button className={s.btn} onClick={() => setIo(null)}>Cerrar</button>
            <button className={`${s.btn} ${s.primary}`} onClick={() => { try { const t = normalizeTemplate(JSON.parse(io)); setTpl(t); setSceneIdx(0); setLayerId(null); seek(0); setIo(null) } catch (err) { alert('JSON invalido: ' + err.message) } }}>Aplicar</button>
          </div>
        </div>
      </div>}
    </div>
  )
}

function Field({ label, children }) { return <label className={s.field}><span>{label}</span>{children}</label> }
function TokenSel({ value, onChange, allowNone }) {
  return <select className={s.sel} value={value} onChange={e => onChange(e.target.value)}>
    {allowNone && <option value="">(ninguno)</option>}
    {TOKENS.map(t => <option key={t} value={t}>{t}</option>)}
  </select>
}
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
// merge superficial por sub-objeto (style/anim/slot/shapeStyle se fusionan, no se pisan)
function deepMerge(l, p) { const out = { ...l }; for (const k in p) { if (p[k] && typeof p[k] === 'object' && !Array.isArray(p[k]) && l[k] && typeof l[k] === 'object') out[k] = { ...l[k], ...p[k] }; else out[k] = p[k] } return out }
