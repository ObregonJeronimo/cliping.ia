import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import LOTTIE from '../../urvid/lottie/manifest.js'
import styles from './LottieGallery.module.css'

// Visor/CURADOR de la biblioteca Lottie (las ~2050 del manifiesto). Pasar el mouse sobre una card -> se reproduce en loop
// (lottie-web, carga LAZY desde el CDN y se destruye al salir -> liviano aunque haya miles). Clic -> la marca "a borrar".
// La seleccion persiste en localStorage. El boton "Copiar IDs" da la lista para pasarmela y que yo las borre del manifiesto.
const RUBRO_LBL = { default: 'General', tech: 'Tech', finanzas: 'Finanzas', moda: 'Moda', gastronomia: 'Gastronomia', educacion: 'Educacion', salud: 'Salud', fitness: 'Fitness', inmobiliaria: 'Inmobiliaria', belleza: 'Belleza' }
const ITEMS = (LOTTIE && LOTTIE.items) || []
const RUBROS = [...new Set(ITEMS.map(i => i.rubro))]
const TRASH_KEY = 'lottie.trash'
const CAP0 = 150, CAP_STEP = 150

let _lottieP = null
function lottieLib() { if (!_lottieP) _lottieP = import('lottie-web').then(m => m.default || m).catch(() => null); return _lottieP }

// Una card: thumbnail estatico; al pasar el mouse carga la Lottie del CDN y la reproduce en loop; al salir la destruye.
const LottieCard = memo(function LottieCard({ item, selected, onToggle }) {
  const boxRef = useRef(null)
  const animRef = useRef(null)
  const [hover, setHover] = useState(false)

  useEffect(() => {
    if (!hover) return
    let alive = true
    lottieLib().then(lib => {
      if (!alive || !lib || !boxRef.current) return
      try {
        animRef.current = lib.loadAnimation({ container: boxRef.current, renderer: 'svg', loop: true, autoplay: true, path: item.url })
      } catch { /* noop */ }
    })
    return () => {
      alive = false
      if (animRef.current) { try { animRef.current.destroy() } catch { /* noop */ } animRef.current = null }
      if (boxRef.current) boxRef.current.innerHTML = ''
    }
  }, [hover, item.url])

  return (
    <button type="button" className={`${styles.card} ${selected ? styles.cardSel : ''}`} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onClick={() => onToggle(item.id)} title={item.id}>
      <div className={styles.thumb}>
        <div className={styles.lottieBox} ref={boxRef} />
        {!hover && <span className={styles.playHint}>&#9658;</span>}
        {selected && <span className={styles.delTag}>borrar</span>}
      </div>
      <div className={styles.meta}>
        <b>{item.name || item.concept}</b>
        <span>{RUBRO_LBL[item.rubro] || item.rubro} &middot; {item.concept}</span>
      </div>
    </button>
  )
})

export default function LottieGallery() {
  const [selected, setSelected] = useState(() => { try { return new Set(JSON.parse(localStorage.getItem(TRASH_KEY) || '[]')) } catch { return new Set() } })
  const [rubro, setRubro] = useState('todas')
  const [concept, setConcept] = useState('todos')
  const [q, setQ] = useState('')
  const [cap, setCap] = useState(CAP0)
  const [showList, setShowList] = useState(false)

  // persiste la seleccion (sesion de curaduria larga: sobrevive navegar / recargar)
  useEffect(() => { try { localStorage.setItem(TRASH_KEY, JSON.stringify([...selected])) } catch { /* noop */ } }, [selected])

  const toggle = useCallback((id) => setSelected(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n }), [])

  // conceptos presentes en el rubro elegido (para el dropdown)
  const concepts = useMemo(() => {
    const pool = rubro === 'todas' ? ITEMS : ITEMS.filter(i => i.rubro === rubro)
    return [...new Set(pool.map(i => i.concept))].sort()
  }, [rubro])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return ITEMS.filter(i =>
      (rubro === 'todas' || i.rubro === rubro) &&
      (concept === 'todos' || i.concept === concept) &&
      (!needle || (i.id + ' ' + (i.name || '') + ' ' + i.concept).toLowerCase().includes(needle))
    )
  }, [rubro, concept, q])

  const shown = useMemo(() => filtered.slice(0, cap), [filtered, cap])

  const setRubroF = (r) => { setRubro(r); setConcept('todos'); setCap(CAP0) }
  const setConceptF = (c) => { setConcept(c); setCap(CAP0) }
  const setQF = (v) => { setQ(v); setCap(CAP0) }

  const selectFiltered = () => setSelected(prev => { const n = new Set(prev); for (const i of filtered) n.add(i.id); return n })
  const unselectFiltered = () => setSelected(prev => { const n = new Set(prev); for (const i of filtered) n.delete(i.id); return n })
  const clearAll = () => setSelected(new Set())

  const ids = useMemo(() => [...selected], [selected])
  const copyIds = async () => { try { await navigator.clipboard.writeText(ids.join('\n')) } catch { /* noop */ } setShowList(true) }

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <h1 className="urvidTitleIn">Lotties</h1>
        <p>Biblioteca &middot; {ITEMS.length} animaciones &middot; pasá el mouse para reproducir, clic para marcar a borrar</p>
      </header>

      <div className={styles.toolbar}>
        <input className={styles.search} placeholder="Buscar por nombre / id / concepto" value={q} onChange={e => setQF(e.target.value)} />
        <select className={styles.select} value={concept} onChange={e => setConceptF(e.target.value)}>
          <option value="todos">Todos los conceptos</option>
          {concepts.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className={styles.rubros}>
        <button type="button" className={`${styles.chip} ${rubro === 'todas' ? styles.chipOn : ''}`} onClick={() => setRubroF('todas')}>Todas</button>
        {RUBROS.map(r => <button key={r} type="button" className={`${styles.chip} ${rubro === r ? styles.chipOn : ''}`} onClick={() => setRubroF(r)}>{RUBRO_LBL[r] || r}</button>)}
      </div>

      <div className={styles.selbar}>
        <span className={styles.count}><b>{selected.size}</b> marcadas a borrar &middot; mostrando {shown.length} de {filtered.length}</span>
        <div className={styles.actions}>
          <button type="button" className={styles.btn} onClick={selectFiltered} disabled={!filtered.length}>Marcar filtradas ({filtered.length})</button>
          <button type="button" className={styles.btn} onClick={unselectFiltered} disabled={!selected.size}>Desmarcar filtradas</button>
          <button type="button" className={styles.btn} onClick={clearAll} disabled={!selected.size}>Limpiar</button>
          <button type="button" className={styles.btnPrimary} onClick={copyIds} disabled={!selected.size}>Copiar IDs ({selected.size})</button>
        </div>
      </div>

      {showList && (
        <div className={styles.listBox}>
          <div className={styles.listHead}><span>{ids.length} IDs &mdash; pasámelos y las borro del manifiesto</span><button type="button" className={styles.btn} onClick={() => setShowList(false)}>Cerrar</button></div>
          <textarea className={styles.textarea} readOnly value={ids.join('\n')} onFocus={e => e.target.select()} />
        </div>
      )}

      <div className={styles.grid}>
        {shown.map(item => <LottieCard key={item.id} item={item} selected={selected.has(item.id)} onToggle={toggle} />)}
      </div>
      {filtered.length > shown.length && (
        <button type="button" className={styles.more} onClick={() => setCap(c => c + CAP_STEP)}>Ver mas ({shown.length} de {filtered.length})</button>
      )}
      {!filtered.length && <p className={styles.empty}>No hay animaciones con ese filtro.</p>}
    </div>
  )
}
