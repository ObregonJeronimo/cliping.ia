import { useEffect, useMemo, useRef } from 'react'
import { makeVideo, drawFrame } from '../../urvid/index.js'
import { registerPreview } from './previewLoop.js'
import { shortId } from './craftLib.js'
import styles from './UrvidCraftStudio.module.css'

const TARGET_W = 190   // ancho del backing del mini-canvas (chico = barato; se escala a 100% en CSS)

// Una opcion de biblioteca. 3 modos: 'canvas' (gif del modulo en contexto), 'swatch' (paleta de color), 'type' (muestra
// de tipografia). El gif usa el rAF MAESTRO (previewLoop) + IntersectionObserver -> solo anima si esta visible.
export default function OptionCard({ slot, beat, mod, mode, selected, onSelect, brief, seed, fullRecipe }) {
  // receta de ESTA opcion = la receta actual con el slot (o el beat de escena) sobreescrito -> se ve EN CONTEXTO.
  const lockForOption = useMemo(() => {
    if (slot === 'scenes') return { ...fullRecipe, scenes: fullRecipe.scenes.map((s, i) => (i === beat ? mod.id : s)) }
    return { ...fullRecipe, [slot]: mod.id }
  }, [slot, mod.id, beat, fullRecipe])

  // SWATCH (color): deriva la paleta directo (sin armar video).
  const pal = useMemo(() => {
    if (mode !== 'swatch' || typeof mod.derive !== 'function') return null
    try { return mod.derive(brief.brandColor, { tone: brief.tone, rubro: brief.rubro, seed }) } catch { return null }
  }, [mode, mod, brief.brandColor, brief.tone, brief.rubro, seed])

  const fonts = mode === 'type' ? (mod.fonts || {}) : null

  // CANVAS (gif): arma el video de la opcion y registra un draw(t) en el rAF maestro.
  const cvRef = useRef(null)
  const wrapRef = useRef(null)
  useEffect(() => {
    if (mode !== 'canvas') return
    const cv = cvRef.current, wrap = wrapRef.current; if (!cv || !wrap) return
    let video
    try { video = makeVideo({ ...brief, brand: brief.brand || 'Tu marca', seed, lockRecipe: lockForOption }) } catch { return }
    if (!video.scenes || !video.scenes.length) return
    // que mostrar: transicion -> el video entero (la transicion vive entre escenas); escena -> ese beat; resto -> escena 0.
    const scIdx = slot === 'scenes' ? Math.min(beat, video.scenes.length - 1) : 0
    const sc = video.scenes[scIdx]
    const solo = slot === 'transition' ? video : { ...video, scenes: [{ ...sc, start: 0 }], duration: sc.dur }
    const dur = (slot === 'transition' ? video.duration : sc.dur) || 4
    const W = video.W, H = video.H
    const DPR = Math.min(window.devicePixelRatio || 1, 2)
    const bw = Math.round(TARGET_W * DPR), bh = Math.round(TARGET_W * (H / W) * DPR)
    cv.width = bw; cv.height = bh
    const ctx = cv.getContext('2d')
    const sx = bw / W
    const entry = { active: false, draw: (t) => { ctx.setTransform(sx, 0, 0, sx, 0, 0); drawFrame(ctx, t % dur, solo) } }
    entry.draw(dur * 0.4)   // 1 frame inmediato (no queda en blanco antes de ser visible)
    const unreg = registerPreview(entry)
    const io = new IntersectionObserver(es => { entry.active = es[0].isIntersecting }, { threshold: 0.15 })
    io.observe(wrap)
    return () => { io.disconnect(); unreg() }
  }, [mode, slot, beat, brief, seed, lockForOption])

  return (
    <button ref={wrapRef} type="button" className={`${styles.opt} ${selected ? styles.optOn : ''}`} onClick={() => onSelect(mod.id)} title={shortId(mod.id)}>
      <div className={styles.optThumb}>
        {mode === 'canvas' && <canvas ref={cvRef} />}
        {mode === 'swatch' && pal && (
          <div className={styles.swatch}>
            {[pal.bg0, pal.bg1, pal.accent, pal.accent2 || pal.accent, pal.ink].map((c, i) => <span key={i} style={{ background: c }} />)}
          </div>
        )}
        {mode === 'type' && (
          <div className={styles.typeSample} style={{ background: brief.tone === 'light' ? '#fff' : '#16150f', color: brief.tone === 'light' ? '#16150f' : '#f3f2ee' }}>
            <b style={{ fontFamily: fonts.display }}>Aa</b>
            <span style={{ fontFamily: fonts.text }}>{(brief.brand || 'Tu marca').slice(0, 14)}</span>
          </div>
        )}
      </div>
      <span className={styles.optLabel}>{shortId(mod.id)}</span>
    </button>
  )
}
