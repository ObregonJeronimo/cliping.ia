import { useRef, useState } from 'react'
import { sceneMeta, blockText, isInlineEditable, moveItem } from '../../lib/timeline.js'
import styles from './Timeline.module.css'

// TIMELINE de edicion (Fase 1) — muestra las escenas del video como BLOQUES en una pista "Gráfica", con playhead
// sincronizado, clic-para-navegar, ARRASTRAR-para-reordenar y edicion INLINE del texto (mapeado al campo del brief que
// esa escena muestra). Las pistas "Animaciones" y "SFX" quedan como estructura (contenido en fases proximas).
// Opera sobre el video YA reordenado (video.scenes en orden de display); reordenar = mover elementos del `order`.

const HUE = { Apertura: '#5f7cf5', Mensaje: '#1fa876', Lista: '#c9902b', 'Comparación': '#b3612f', Dato: '#8a5cf0', Prueba: '#d0417a', Cierre: '#e0533b', Puente: '#7d8a99', Detalle: '#2b9bc9', Escena: '#888' }

export default function Timeline({ video, head, order, onReorder, brief, sceneText, onEditSceneText, onSeek }) {
  const scenes = (video && video.scenes) || []
  const dur = (video && video.duration) || 1
  const [sel, setSel] = useState(-1)          // bloque seleccionado (indice de display)
  const [editing, setEditing] = useState(-1)  // bloque en edicion de texto
  const dragFrom = useRef(-1)

  if (!scenes.length) return null

  const move = (from, to) => {
    if (from < 0 || to < 0 || from === to) return
    onReorder && onReorder(moveItem(order, from, to))
    setSel(to)
  }

  return (
    <div className={styles.timeline}>
      <div className={styles.head}>
        <span className={styles.ttl}>Timeline</span>
        <span className={styles.hint}>Arrastrá para reordenar · clic en el texto para editarlo</span>
      </div>

      {/* PISTA GRÁFICA — las escenas del video */}
      <div className={styles.track}>
        <span className={styles.trackLbl}>Gráfica</span>
        <div className={styles.lane}>
          <div className={styles.playhead} style={{ left: `${Math.max(0, Math.min(100, (head / dur) * 100))}%` }} />
          {scenes.map((sc, i) => {
            const m = sceneMeta(sc.sceneId)
            const baseIdx = sc.baseIndex != null ? sc.baseIndex : i          // el override se guarda por indice BASE (sigue a la escena al reordenar)
            const ov = sceneText && sceneText[baseIdx]
            const txt = blockText((ov && Object.keys(ov).length) ? { ...brief, ...ov } : brief, m.textKey)
            const overridden = !!(ov && ov[m.textKey] != null)
            const editable = isInlineEditable(m.textKey)
            const hue = HUE[m.label] || '#888'
            return (
              <div
                key={i}
                className={`${styles.block} ${sel === i ? styles.selBlock : ''}`}
                style={{ flexGrow: sc.dur || 1, '--hue': hue }}
                draggable={editing !== i}
                onDragStart={() => { dragFrom.current = i }}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); move(dragFrom.current, i); dragFrom.current = -1 }}
                onClick={() => { setSel(i); onSeek && onSeek(sc.start) }}
                title={`${m.label} · ${(sc.dur || 0).toFixed(1)}s`}
              >
                <span className={styles.blockTop}>{m.label}{overridden ? ' ✎' : ''}</span>
                {editing === i && editable
                  ? <input
                      className={styles.blockInput}
                      autoFocus
                      defaultValue={txt}
                      onClick={e => e.stopPropagation()}
                      onBlur={e => { onEditSceneText && onEditSceneText(baseIdx, m.textKey, e.target.value); setEditing(-1) }}
                      onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); else if (e.key === 'Escape') setEditing(-1) }}
                    />
                  : <span
                      className={styles.blockTxt}
                      onClick={e => { if (editable) { e.stopPropagation(); setSel(i); setEditing(i) } }}
                    >{txt || <i className={styles.ph}>{editable ? '+ texto' : '—'}</i>}</span>}
              </div>
            )
          })}
        </div>
      </div>

      {/* PISTAS de fases próximas (estructura) */}
      <div className={`${styles.track} ${styles.soon}`}><span className={styles.trackLbl}>Animaciones</span><div className={styles.lane}><span className={styles.soonLbl}>próximamente</span></div></div>
      <div className={`${styles.track} ${styles.soon}`}><span className={styles.trackLbl}>SFX</span><div className={styles.lane}><span className={styles.soonLbl}>próximamente</span></div></div>

      {/* controles del bloque seleccionado (reorden confiable por botones, además del drag) */}
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
