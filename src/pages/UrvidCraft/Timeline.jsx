import { useEffect, useRef, useState } from 'react'
import { sceneMeta, blockText, isInlineEditable, moveItem } from '../../lib/timeline.js'
import { clipLabel } from '../../lib/audioAssets.js'
import styles from './Timeline.module.css'

// TIMELINE de edicion — escenas (pista Gráfica: reordenar por drag + editar texto inline), overlays (pista Animaciones) y
// SFX (pista SFX) como BLOQUES posicionados por tiempo y ARRASTRABLES para moverlos. Playhead (linea roja) arrastrable por
// el ruler. Opera sobre el video ya reordenado; el tiempo se calcula desde la posicion X del cursor sobre la lane.

const HUE = { Apertura: '#5f7cf5', Mensaje: '#1fa876', Lista: '#c9902b', 'Comparación': '#b3612f', Dato: '#8a5cf0', Prueba: '#d0417a', Cierre: '#e0533b', Puente: '#7d8a99', Detalle: '#2b9bc9', Escena: '#888' }

export default function Timeline({ video, head, order, onReorder, brief, sceneText, onEditSceneText, onSeek, overlays, selOverlay, onSelectOverlay, audio, selSfx, onSelectSfx, onPatchOverlay, onPatchSfx }) {
  const scenes = (video && video.scenes) || []
  const dur = (video && video.duration) || 1
  const [sel, setSel] = useState(-1)          // escena seleccionada (indice de display)
  const [editing, setEditing] = useState(-1)  // escena en edicion de texto
  const dragFrom = useRef(-1)                  // reorden de escenas (HTML5 DnD)
  const dragRef = useRef(null)                 // arrastre en TIEMPO: { mode:'scrub'|'ov'|'sfx', id?, laneEl, blockDur? }

  const pct = (t) => Math.max(0, Math.min(100, (t / dur) * 100))
  const timeFromX = (clientX, laneEl) => { const r = laneEl.getBoundingClientRect(); return Math.max(0, Math.min(dur, ((clientX - r.left) / (r.width || 1)) * dur)) }

  // arrastre global (playhead + bloques): un solo par de listeners en window mientras dura el gesto.
  useEffect(() => {
    const onMove = (e) => {
      const d = dragRef.current; if (!d) return
      const t = timeFromX(e.clientX, d.laneEl)
      if (d.mode === 'scrub') onSeek && onSeek(t)
      else if (d.mode === 'ov') onPatchOverlay && onPatchOverlay(d.id, { startSec: +Math.max(0, Math.min(dur - (d.blockDur || 0), t)).toFixed(2) })
      else if (d.mode === 'sfx') onPatchSfx && onPatchSfx(d.id, { startSec: +Math.max(0, Math.min(dur - (d.blockDur || 0), t)).toFixed(2) })
    }
    const onUp = () => { dragRef.current = null }
    window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp)
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp) }
  }, [dur, onSeek, onPatchOverlay, onPatchSfx])

  if (!scenes.length) return null

  const move = (from, to) => { if (from < 0 || to < 0 || from === to) return; onReorder && onReorder(moveItem(order, from, to)); setSel(to) }
  const startScrub = (e) => { dragRef.current = { mode: 'scrub', laneEl: e.currentTarget }; onSeek && onSeek(timeFromX(e.clientX, e.currentTarget)) }
  const startBlockDrag = (e, mode, id, durSec) => {
    e.stopPropagation()
    if (mode === 'ov') onSelectOverlay && onSelectOverlay(id); else onSelectSfx && onSelectSfx(id)
    dragRef.current = { mode, id, laneEl: e.currentTarget.parentElement, blockDur: durSec || 0 }
  }

  return (
    <div className={styles.timeline}>
      <div className={styles.head}>
        <span className={styles.ttl}>Timeline</span>
        <span className={styles.hint}>Arrastrá los bloques para moverlos · la línea roja marca el tiempo (arrastrala en la regla)</span>
      </div>

      {/* REGLA: scrubber del playhead (arrastrable) */}
      <div className={styles.track}>
        <span className={styles.trackLbl}>{head.toFixed(1)}s</span>
        <div className={styles.ruler} onPointerDown={startScrub} title="Arrastrá para mover el cursor de tiempo">
          <div className={styles.playheadTop} style={{ left: `${pct(head)}%` }} />
        </div>
      </div>

      {/* PISTA GRÁFICA — escenas (reordenar por drag, editar texto inline) */}
      <div className={styles.track}>
        <span className={styles.trackLbl}>Gráfica</span>
        <div className={styles.lane}>
          <div className={styles.playhead} style={{ left: `${pct(head)}%` }} />
          {scenes.map((sc, i) => {
            const m = sceneMeta(sc.sceneId)
            const baseIdx = sc.baseIndex != null ? sc.baseIndex : i
            const ov = sceneText && sceneText[baseIdx]
            const txt = blockText((ov && Object.keys(ov).length) ? { ...brief, ...ov } : brief, m.textKey)
            const overridden = !!(ov && ov[m.textKey] != null)
            const editable = isInlineEditable(m.textKey)
            return (
              <div key={i}
                className={`${styles.block} ${sel === i ? styles.selBlock : ''}`}
                style={{ flexGrow: sc.dur || 1, '--hue': HUE[m.label] || '#888' }}
                draggable={editing !== i}
                onDragStart={() => { dragFrom.current = i }}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); move(dragFrom.current, i); dragFrom.current = -1 }}
                onClick={() => { setSel(i); onSeek && onSeek(sc.start) }}
                title={`${m.label} · ${(sc.dur || 0).toFixed(1)}s`}>
                <span className={styles.blockTop}>{m.label}{overridden ? ' ✎' : ''}</span>
                {editing === i && editable
                  ? <input className={styles.blockInput} autoFocus defaultValue={txt}
                      onClick={e => e.stopPropagation()}
                      onBlur={e => { onEditSceneText && onEditSceneText(baseIdx, m.textKey, e.target.value); setEditing(-1) }}
                      onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); else if (e.key === 'Escape') setEditing(-1) }} />
                  : <span className={styles.blockTxt} onClick={e => { if (editable) { e.stopPropagation(); setSel(i); setEditing(i) } }}>{txt || <i className={styles.ph}>{editable ? '+ texto' : '—'}</i>}</span>}
              </div>
            )
          })}
        </div>
      </div>

      {/* PISTA ANIMACIONES — overlays arrastrables en el tiempo */}
      <div className={styles.track}>
        <span className={styles.trackLbl}>Animaciones</span>
        <div className={styles.lane}>
          <div className={styles.playhead} style={{ left: `${pct(head)}%` }} />
          {(overlays || []).map(ov => (
            <div key={ov.id}
              className={`${styles.ovBlock} ${selOverlay === ov.id ? styles.selBlock : ''}`}
              style={{ left: `${Math.max(0, Math.min(97, pct(ov.startSec || 0)))}%`, width: `${Math.max(5, ((ov.durSec || 1) / dur) * 100)}%` }}
              onPointerDown={e => startBlockDrag(e, 'ov', ov.id, ov.durSec)}
              title={`${ov.text || '(texto)'} · ${(ov.startSec || 0).toFixed(1)}–${((ov.startSec || 0) + (ov.durSec || 0)).toFixed(1)}s · arrastrá para mover`}>
              <span className={styles.ovTxt}>{ov.anim?.kind === 'recorded' ? '⦿ ' : ''}{ov.text || '(texto)'}</span>
            </div>
          ))}
          {(!overlays || !overlays.length) && <span className={styles.soonLbl}>agregá un texto en la pestaña “Animaciones”</span>}
        </div>
      </div>

      {/* PISTA SFX — clips arrastrables en el tiempo */}
      <div className={styles.track}>
        <span className={styles.trackLbl}>SFX</span>
        <div className={styles.lane}>
          <div className={styles.playhead} style={{ left: `${pct(head)}%` }} />
          {(audio || []).map(a => (
            <div key={a.id}
              className={`${styles.sfxBlock} ${selSfx === a.id ? styles.selBlock : ''}`}
              style={{ left: `${Math.max(0, Math.min(97, pct(a.startSec || 0)))}%`, width: `${Math.max(4, ((a.durSec || 0.3) / dur) * 100)}%` }}
              onPointerDown={e => startBlockDrag(e, 'sfx', a.id, a.durSec)}
              title={`${a.name || clipLabel(a.sfx)} · ${(a.startSec || 0).toFixed(1)}s · arrastrá para mover`}>
              <span className={styles.sfxTxt}>♪ {a.name || clipLabel(a.sfx)}</span>
            </div>
          ))}
          {(!audio || !audio.length) && <span className={styles.soonLbl}>agregá un efecto en la pestaña “SFX”</span>}
        </div>
      </div>

      {/* reorden confiable de escenas por botones (además del drag) */}
      {sel >= 0 && sel < scenes.length && (
        <div className={styles.selBar}>
          <span>{sceneMeta(scenes[sel].sceneId).label} · escena {sel + 1} de {scenes.length}</span>
          <div className={styles.selBtns}>
            <button onClick={() => move(sel, sel - 1)} disabled={sel === 0} title="Mover a la izquierda">◀</button>
            <button onClick={() => move(sel, sel + 1)} disabled={sel === scenes.length - 1} title="Mover a la derecha">▶</button>
          </div>
        </div>
      )}
    </div>
  )
}
