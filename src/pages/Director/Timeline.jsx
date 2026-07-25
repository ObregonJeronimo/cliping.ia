import { useEffect, useMemo, useRef, useState } from 'react'
import { dibujarTimeline, capasDe, keysPorCapa, filaEn, altoDe, anchoDe, GUT, RULER } from './timelineDraw.js'
import styles from './Timeline.module.css'

// TIMELINE del Director — el panel se dibuja en UN canvas, no en DOM. Una pieza tiene 20-40 capas y
// cada una puede traer decenas de keyframes: con un div por bloque, el playhead a 30fps repinta
// cientos de nodos por frame. Con una sola superficie 2D el costo es constante y el scroll no se traba.
// Todo el dibujo vive en timelineDraw.js (puro, sin DOM); aca quedan el marco, el scroll y el mouse.

export default function Timeline({ tl, head, onSeek, selected, onSelect, zoom, onZoom }) {
  const boxRef = useRef(null)
  const cvRef = useRef(null)
  const drag = useRef(false)
  const [ancho, setAncho] = useState(0)                 // ancho del contenedor (ResizeObserver)
  // el scroll entra al dibujo porque la regla y el canal de etiquetas se dibujan PEGADOS: con 30 capas,
  // perder la regla o los nombres al scrollear vuelve inutil el panel.
  const [scrollX, setScrollX] = useState(0)
  const [scrollY, setScrollY] = useState(0)

  const capas = useMemo(() => capasDe(tl), [tl])
  const keys = useMemo(() => keysPorCapa(tl), [tl])

  // el contenedor manda el ancho MINIMO (si el video entra, la timeline ocupa todo el panel)
  useEffect(() => {
    const host = boxRef.current; if (!host || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(es => { for (const e of es) setAncho(Math.round(e.contentRect.width)) })
    ro.observe(host)
    setAncho(host.clientWidth)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const host = boxRef.current, cv = cvRef.current
    if (!host || !cv || !tl) return
    const cssW = Math.max(ancho || host.clientWidth || 320, anchoDe(Math.max(0.1, tl.dur || 1), zoom))
    const cssH = altoDe(capas.length)
    const DPR = Math.min(window.devicePixelRatio || 1, 2)
    const pw = Math.round(cssW * DPR), ph = Math.round(cssH * DPR)
    // el backing store solo se reasigna si cambio de verdad: hacerlo en cada frame lo realoca al pedo
    if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph }
    cv.style.width = cssW + 'px'; cv.style.height = cssH + 'px'
    const ctx = cv.getContext('2d')
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
    dibujarTimeline(ctx, { tl, head, selected, zoom, cssW, cssH, sx: Math.min(scrollX, cssW - (ancho || cssW)), sy: scrollY, capas, keys })
  }, [tl, head, selected, zoom, ancho, scrollX, scrollY, capas, keys])

  // --- interaccion: la regla y las pistas hacen scrub; el canal de etiquetas solo selecciona
  const posDe = (e) => { const r = cvRef.current.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top } }
  const seekEn = (x) => { if (onSeek) onSeek(Math.max(0, Math.min(tl.dur, (x - GUT) / zoom))) }

  const down = (e) => {
    const { x, y } = posDe(e)
    const host = boxRef.current
    const sx = host ? host.scrollLeft : 0
    const sy = host ? host.scrollTop : 0
    // la regla se dibuja pegada arriba: lo que se ve ahi es la regla, aunque en coordenadas de
    // contenido caiga sobre una fila tapada. Sin este corte, hacer scrub seleccionaba capas invisibles.
    const fila = y >= sy + RULER ? filaEn(capas, y) : null
    if (fila && onSelect) onSelect(fila.id)
    if (x >= sx && x <= sx + GUT) return                 // click en la etiqueta: no mueve el cabezal
    drag.current = true
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* noop */ }
    seekEn(x)
  }
  const move = (e) => { if (drag.current) seekEn(posDe(e).x) }
  const up = (e) => { drag.current = false; try { e.currentTarget.releasePointerCapture(e.pointerId) } catch { /* noop */ } }

  if (!tl) return null

  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        <span className={styles.ttl}>Timeline</span>
        <span className={styles.hint}>{tl.layers.length} capas · {tl.tracks.length} tracks · arrastra para mover el cabezal</span>
        <div className={styles.zoom}>
          <button className={styles.zbtn} onClick={() => onZoom(Math.max(14, Math.round(zoom / 1.4)))} title="Alejar">−</button>
          <span className={styles.zval}>{zoom} px/s</span>
          <button className={styles.zbtn} onClick={() => onZoom(Math.min(260, Math.round(zoom * 1.4)))} title="Acercar">+</button>
        </div>
      </div>
      <div className={styles.scroll} ref={boxRef} onScroll={e => { setScrollX(e.currentTarget.scrollLeft); setScrollY(e.currentTarget.scrollTop) }}>
        <canvas ref={cvRef} className={styles.cv} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
      </div>
    </div>
  )
}
