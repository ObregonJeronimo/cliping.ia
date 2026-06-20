import { useMemo, useState } from 'react'
import OptionCard from './OptionCard.jsx'
import { previewMode } from './craftLib.js'
import styles from './UrvidCraftStudio.module.css'

// Grilla de opciones de un slot (o de un beat de escena). Capea el display (las mas afines primero) con un "ver mas";
// para slots OPCIONALES agrega una card "Ninguno" (null). Cada card es un OptionCard (gif/swatch/type).
const CAP0 = 24, CAP_STEP = 36

export default function OptionGrid({ slot, beat, options, selectedId, onPick, brief, seed, fullRecipe, optional }) {
  const [cap, setCap] = useState(CAP0)
  const mode = previewMode(slot)
  // la opcion ACTIVA siempre visible (aunque la auto-elegida no entre en el cap), para que el seleccionado se vea.
  const shown = useMemo(() => {
    const list = options.slice(0, cap)
    if (selectedId && !list.some(m => m.id === selectedId)) {
      const sel = options.find(m => m.id === selectedId)
      if (sel) return [sel, ...list.slice(0, Math.max(0, cap - 1))]
    }
    return list
  }, [options, cap, selectedId])
  return (
    <div>
      <div className={styles.grid}>
        {optional && (
          <button type="button" className={`${styles.opt} ${!selectedId ? styles.optOn : ''}`} onClick={() => onPick(null)} title="ninguno">
            <div className={styles.optThumb}><div className={styles.optNone}>Ninguno</div></div>
            <span className={styles.optLabel}>ninguno</span>
          </button>
        )}
        {shown.map(mod => (
          <OptionCard key={mod.id} slot={slot} beat={beat} mod={mod} mode={mode} selected={selectedId === mod.id} onSelect={onPick} brief={brief} seed={seed} fullRecipe={fullRecipe} />
        ))}
      </div>
      {options.length > shown.length && (
        <button type="button" className={styles.gridMore} onClick={() => setCap(c => c + CAP_STEP)}>
          Ver mas ({shown.length} de {options.length})
        </button>
      )}
    </div>
  )
}
