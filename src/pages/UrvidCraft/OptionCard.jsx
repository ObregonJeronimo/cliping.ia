import { useEffect, useMemo, useRef } from 'react'
import { makeVideo, drawFrame, get } from '../../urvid/index.js'
import { registerPreview, wakePreview } from './previewLoop.js'
import { shortId } from './craftLib.js'
import styles from './UrvidCraftStudio.module.css'

const TARGET_W = 190   // ancho del backing del mini-canvas (chico = barato; se escala a 100% en CSS)

// Una opcion de biblioteca. Modos: 'canvas' (modulo en contexto), 'swatch' (paleta), 'type' (muestra de tipografia).
// HOVER-PLAY: el canvas muestra un frame ESTATICO; solo ANIMA mientras el mouse esta encima (y arranca desde 0 al entrar).
export default function OptionCard({ slot, beat, mod, mode, selected, onSelect, brief, seed, fullRecipe }) {
  // receta de ESTA opcion = la receta actual con el slot (o el beat de escena) sobreescrito -> se ve EN CONTEXTO.
  const lockForOption = useMemo(() => {
    if (slot === 'scenes') return { ...fullRecipe, scenes: fullRecipe.scenes.map((s, i) => (i === beat ? mod.id : s)) }
    return { ...fullRecipe, [slot]: mod.id }
  }, [slot, mod.id, beat, fullRecipe])

  const pal = useMemo(() => {
    if (mode !== 'swatch' || typeof mod.derive !== 'function') return null
    try { return mod.derive(brief.brandColor, { tone: brief.tone, rubro: brief.rubro, seed }) } catch { return null }
  }, [mode, mod, brief.brandColor, brief.tone, brief.rubro, seed])

  const fonts = mode === 'type' ? (mod.fonts || {}) : null

  const cvRef = useRef(null)
  const entryRef = useRef(null)   // { active, t0, draw(t), drawStatic() }
  useEffect(() => {
    if (mode !== 'canvas') return
    const cv = cvRef.current; if (!cv) return
    let video
    try { video = makeVideo({ ...brief, brand: brief.brand || 'Tu marca', seed, lockRecipe: lockForOption }) } catch { return }
    if (!video.scenes || !video.scenes.length) return
    const W = video.W, H = video.H, DPR = Math.min(window.devicePixelRatio || 1, 2)
    cv.width = Math.round(TARGET_W * DPR); cv.height = Math.round(TARGET_W * (H / W) * DPR)
    const ctx = cv.getContext('2d'), sx = cv.width / W
    // que mostrar + ventana de loop. transicion -> ventana centrada en el PASO entre escenas (asi SE VE el wipe/slide);
    // escena -> ese beat aislado; resto (fondo/sub/atm/post/etc) -> escena 0.
    let base, span, solo
    if (slot === 'transition' && video.scenes[1]) { solo = video; const t1 = video.scenes[1].start; base = Math.max(0, t1 - 0.7); span = 1.4 }
    else { const i = slot === 'scenes' ? Math.min(beat, video.scenes.length - 1) : 0; const sc = video.scenes[i]; solo = { ...video, scenes: [{ ...sc, start: 0 }], duration: sc.dur }; base = 0; span = sc.dur || 4 }
    // FONDO: la opcion muestra SOLO la capa de fondo (sin texto/escena encima) -> es el fondo de verdad, no un preview real.
    const bgMod = slot === 'bg' ? get(video.bgId) : null
    const drawAt = (local) => {
      const t = base + (((local % span) + span) % span)
      ctx.setTransform(sx, 0, 0, sx, 0, 0)
      if (bgMod) { ctx.clearRect(0, 0, W, H); bgMod.render(ctx, t, { pal: video.palette, content: video.content, seed: video.bgSeed, energy: 1 }) }
      else drawFrame(ctx, t, solo)
    }
    const entry = { active: false, t0: 0, draw: (t) => drawAt(t - entry.t0), drawStatic: () => drawAt(span * (slot === 'transition' ? 0.5 : 0.35)) }
    entry.drawStatic()   // thumbnail estatico (NO auto-play)
    entryRef.current = entry
    const unreg = registerPreview(entry)
    return () => { unreg(); entryRef.current = null }
  }, [mode, slot, beat, brief, seed, lockForOption])

  const onEnter = () => { const e = entryRef.current; if (e) { e.t0 = performance.now() / 1000; e.active = true; wakePreview() } }
  const onLeave = () => { const e = entryRef.current; if (e) { e.active = false; e.drawStatic() } }

  return (
    <button type="button" className={`${styles.opt} ${selected ? styles.optOn : ''}`} onClick={() => onSelect(mod.id)} onMouseEnter={onEnter} onMouseLeave={onLeave} title={shortId(mod.id)}>
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
