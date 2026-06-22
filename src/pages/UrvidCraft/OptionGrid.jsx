import { useMemo, useState } from 'react'
import OptionCard from './OptionCard.jsx'
import { previewMode } from './craftLib.js'
import styles from './UrvidCraftStudio.module.css'

// Grilla de opciones de un slot (o de un beat de escena). Capea el display (las mas afines primero) con un "ver mas";
// para slots OPCIONALES agrega una card "Ninguno" (null). Con withRubro=true muestra un FILTRO por rubro arriba
// (default = el rubro del brief) -> solo se ven las de esa categoria, no todas. Cada card es un OptionCard (hover-play).
const CAP0 = 24, CAP_STEP = 36
const RUBRO_LBL = { default: 'General', tech: 'Tech', finanzas: 'Finanzas', moda: 'Moda', gastronomia: 'Gastro', educacion: 'Educacion', salud: 'Salud', fitness: 'Fitness', inmobiliaria: 'Inmob.', belleza: 'Belleza' }
const rubrosOf = (m) => ((m.rubros && m.rubros.length) ? m.rubros : ['*'])
const rubroMatch = (m, r) => { const rs = rubrosOf(m); return rs[0] === '*' || rs.includes(r) }

export default function OptionGrid({ slot, beat, options, selectedId, onPick, brief, seed, fullRecipe, optional, withRubro }) {
  const [cap, setCap] = useState(CAP0)
  const [rubro, setRubro] = useState(() => (withRubro && (brief.rubro || 'todos')) || 'todos')
  const mode = previewMode(slot)

  // rubros presentes en las opciones (para los chips del filtro)
  const present = useMemo(() => {
    if (!withRubro) return []
    const s = new Set()
    for (const m of options) for (const r of rubrosOf(m)) if (r !== '*' && RUBRO_LBL[r]) s.add(r)
    return [...s]
  }, [options, withRubro])

  const filtered = useMemo(() => (withRubro && rubro !== 'todos' ? options.filter(m => rubroMatch(m, rubro)) : options), [options, withRubro, rubro])

  const shown = useMemo(() => {
    const list = filtered.slice(0, cap)
    if (selectedId && !list.some(m => m.id === selectedId)) {
      const sel = filtered.find(m => m.id === selectedId)
      if (sel) return [sel, ...list.slice(0, Math.max(0, cap - 1))]
    }
    return list
  }, [filtered, cap, selectedId])

  return (
    <div>
      {withRubro && present.length > 1 && (
        <div className={styles.rubroBar}>
          <button type="button" className={`${styles.rubroChip} ${rubro === 'todos' ? styles.rubroChipOn : ''}`} onClick={() => { setRubro('todos'); setCap(CAP0) }}>Todos</button>
          {present.map(r => (
            <button key={r} type="button" className={`${styles.rubroChip} ${rubro === r ? styles.rubroChipOn : ''}`} onClick={() => { setRubro(r); setCap(CAP0) }}>{RUBRO_LBL[r] || r}</button>
          ))}
        </div>
      )}
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
      {filtered.length > shown.length && (
        <button type="button" className={styles.gridMore} onClick={() => setCap(c => c + CAP_STEP)}>
          Ver mas ({shown.length} de {filtered.length})
        </button>
      )}
    </div>
  )
}
