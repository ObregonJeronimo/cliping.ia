import { useEffect, useRef } from 'react'
import { makeVideo, drawFrame } from '../../urvid/index.js'
import { registerPreview, wakePreview } from './previewLoop.js'
import { shortId } from './craftLib.js'
import styles from './UrvidCraftStudio.module.css'

const TARGET_W = 200   // preview GRANDE (vs 106px de las cards) -> el efecto se ve claro

// Preview GRANDE dedicado para los efectos "abstractos" (transicion / acabado / avanzado), donde un thumbnail chico
// no comunica la diferencia. UN canvas reproduce la opcion SELECCIONADA y las opciones pasan a chips compactos:
//  - transicion -> reproduce el PASO entre 2 escenas, mas lento (se ve el wipe/slide/iris/bars).
//  - acabado (post) -> SPLIT antes/despues: mitad izquierda SIN efecto, derecha CON efecto (la diferencia salta).
//  - resto (textura/atmosfera/movimiento/texto cinetico/composicion/icono) -> la escena con el efecto aplicado, grande.
// Auto-play (1 solo preview por seccion -> barato) usando el rAF compartido (entry siempre activo mientras esta montado).
export default function EffectPreview({ slot, options, selectedId, onPick, brief, seed, fullRecipe, optional }) {
  const cvRef = useRef(null)

  useEffect(() => {
    const cv = cvRef.current; if (!cv) return
    let videoOn
    try { videoOn = makeVideo({ ...brief, brand: brief.brand || 'Tu marca', seed, lockRecipe: { ...fullRecipe, [slot]: selectedId } }) } catch { return }
    if (!videoOn.scenes || !videoOn.scenes.length) return
    // acabado: tambien arma la version SIN post para el split antes/despues
    let videoOff = null
    if (slot === 'post') { try { videoOff = makeVideo({ ...brief, brand: brief.brand || 'Tu marca', seed, lockRecipe: { ...fullRecipe, post: null } }) } catch { videoOff = null } }

    const W = videoOn.W, H = videoOn.H, DPR = Math.min(window.devicePixelRatio || 1, 2)
    cv.width = Math.round(TARGET_W * DPR); cv.height = Math.round(TARGET_W * (H / W) * DPR)
    const ctx = cv.getContext('2d'), sx = cv.width / W

    // ventana de loop + velocidad por slot (transicion: centrada en el paso, mas lenta para que SE VEA el efecto)
    let base = 0, span = 4, speed = 0.85
    if (slot === 'transition' && videoOn.scenes[1]) { const t1 = videoOn.scenes[1].start; base = Math.max(0, t1 - 0.9); span = 1.8; speed = 0.55 }
    else { const sc = videoOn.scenes[0]; base = 0; span = sc.dur || 4 }

    const draw = (clock) => {
      const t = base + ((((clock * speed) % span) + span) % span)
      ctx.setTransform(sx, 0, 0, sx, 0, 0)
      ctx.clearRect(0, 0, W, H)
      if (slot === 'post' && videoOff) {
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W / 2, H); ctx.clip(); drawFrame(ctx, t, videoOff); ctx.restore()
        ctx.save(); ctx.beginPath(); ctx.rect(W / 2, 0, W / 2, H); ctx.clip(); drawFrame(ctx, t, videoOn); ctx.restore()
      } else {
        drawFrame(ctx, t, videoOn)
      }
    }
    draw(typeof performance !== 'undefined' ? performance.now() / 1000 : 0)   // primer frame inmediato
    const entry = { active: true, draw }
    const unreg = registerPreview(entry); wakePreview()
    return () => { unreg() }
  }, [slot, selectedId, brief, seed, fullRecipe])

  const isSplit = slot === 'post'
  return (
    <div className={styles.effectWrap}>
      <div className={`${styles.effectStage} ${isSplit ? styles.effectSplit : ''}`}>
        <canvas ref={cvRef} />
        {isSplit && <><span className={styles.effectTagL}>sin</span><span className={styles.effectTagR}>con</span></>}
      </div>
      <div className={styles.effectChips}>
        {optional && (
          <button type="button" className={`${styles.effectChip} ${!selectedId ? styles.effectChipOn : ''}`} onClick={() => onPick(null)}>ninguno</button>
        )}
        {options.map(m => (
          <button key={m.id} type="button" className={`${styles.effectChip} ${selectedId === m.id ? styles.effectChipOn : ''}`} onClick={() => onPick(m.id)} title={m.id}>{shortId(m.id)}</button>
        ))}
      </div>
    </div>
  )
}
