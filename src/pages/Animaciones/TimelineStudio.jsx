import { useEffect, useRef, useState } from 'react'
import { createTimelineEngine } from './engine'
import styles from './TimelineStudio.module.css'

/**
 * Animaciones (beta) — el método NUEVO para los videos: animaciones reales por timeline
 * (Canvas 2D determinístico), no plantillas de texto. El motor vive en engine.js (reutilizable);
 * esta página solo lo monta y le da controles. El render es gratis (no hay IA generativa);
 * más adelante la IA escribe el timeline y se exporta a MP4 con Remotion.
 */
export default function TimelineStudio() {
  const canvasRef = useRef(null)
  const engineRef = useRef(null)
  const beatRef = useRef(null)
  const timeRef = useRef(null)
  const seekRef = useRef(null)
  const [playing, setPlaying] = useState(true)
  const [speed, setSpeed] = useState(1)

  useEffect(() => {
    const eng = createTimelineEngine(canvasRef.current, {
      onFrame: ({ playhead, T, label }) => {
        if (timeRef.current) timeRef.current.textContent = `${playhead.toFixed(1)} / ${T.toFixed(1)}`
        if (seekRef.current) seekRef.current.value = String(Math.round((playhead / T) * 1000))
        if (beatRef.current) beatRef.current.innerHTML = label
      },
    })
    engineRef.current = eng
    return () => eng.destroy()
  }, [])

  const toggle = () => setPlaying(engineRef.current.toggle())
  const restart = () => engineRef.current.restart()
  const onSeek = (e) => engineRef.current.seek(Number(e.target.value) / 1000)
  const pickSpeed = (s) => { engineRef.current.setSpeed(s); setSpeed(s) }

  return (
    <div className={styles.body}>
      <div className={styles.head}>
        <div className={styles.title}>Animaciones <span className={styles.beta}>beta</span></div>
        <div className={styles.sub}>
          Método nuevo: animaciones reales por <strong>timeline</strong> (no plantillas de texto). Render
          determinístico, sin IA generativa.
        </div>
      </div>

      <div className={styles.stage}>
        <div className={styles.frame}>
          <canvas ref={canvasRef} className={styles.canvas} />
        </div>

        <div className={styles.beat} ref={beatRef} />

        <div className={styles.controls}>
          <button className={`${styles.ctl} ${styles.primary}`} onClick={toggle}>
            {playing ? '⏸ Pausa' : '▶ Play'}
          </button>
          <button className={styles.ctl} onClick={restart}>↺ Reiniciar</button>
          <div className={styles.seek}>
            <input type="range" min="0" max="1000" defaultValue="0" ref={seekRef} onChange={onSeek} className={styles.range} />
            <span className={styles.time} ref={timeRef}>0.0 / 0.0</span>
          </div>
          <div className={styles.seg}>
            <button className={speed === 0.5 ? styles.on : ''} onClick={() => pickSpeed(0.5)}>0.5×</button>
            <button className={speed === 1 ? styles.on : ''} onClick={() => pickSpeed(1)}>1×</button>
          </div>
        </div>

        <div className={styles.foot}>
          Demo de ejemplo (e-commerce). Próximo: que la IA escriba el timeline desde tu sitio y exportar a MP4 con Remotion.
        </div>
      </div>
    </div>
  )
}
