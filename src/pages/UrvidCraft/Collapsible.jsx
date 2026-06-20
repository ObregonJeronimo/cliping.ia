import { useState } from 'react'
import styles from './UrvidCraftStudio.module.css'

// Seccion plegable (para el paso "Avanzado"). Monta el contenido SOLO al abrir -> no instancia decenas de mini-canvas
// de golpe (cada OptionCard arma un video al montar). Cerrado por defecto = no abruma.
export default function Collapsible({ title, hint, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className={`${styles.collap} ${open ? styles.collapOpen : ''}`}>
      <button type="button" className={styles.collapHead} onClick={() => setOpen(o => !o)}>
        <span className={styles.collapChev}>{open ? '−' : '+'}</span>
        <span className={styles.collapTitle}>{title}</span>
        {hint != null && <span className={styles.collapHint}>{hint}</span>}
      </button>
      {open && <div className={styles.collapBody}>{children}</div>}
    </div>
  )
}
