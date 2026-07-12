import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { isAdmin } from '../../lib/admin'
import { loadRemoved, saveRemoved } from '../../lib/contentLibrary'
import buildUrvid from './adapters/urvid.js'
import buildUrvidAdv from './adapters/urvidAdvanced.js'
import buildKinetic from './adapters/kinetic.js'
import buildMotion from './adapters/motion.js'
import buildFx from './adapters/fx.js'
import { PREV_W, PREV_H } from './adapters/common.js'
import styles from './BibliotecaStudio.module.css'

// BIBLIOTECA DE CONTENIDO (admin) — catalogo visual de TODOS los motores. Switcher de motor arriba,
// filtro por categoria, y cada item se previsualiza con un frame REAL del motor (animado al hover).
// Eliminar persiste (localStorage + Firestore compartido). En Motion IA la eliminacion ademas
// EXCLUYE de la generacion; en el resto es curacion visual del catalogo (por ahora).

const ENGINES = [
  { key: 'urvid', build: buildUrvid },
  { key: 'urvid-adv', build: buildUrvidAdv },
  { key: 'kinetic', build: buildKinetic },
  { key: 'motion', build: buildMotion },
  { key: 'fx', build: buildFx },
]
const ENGINE_LABEL = { urvid: 'urvid IA', 'urvid-adv': 'urvid IA advanced', kinetic: 'Kinetic IA', motion: 'Motion IA', fx: 'Animaciones FX' }

// tarjeta con render PEREZOSO (IntersectionObserver) + animacion al hover. Guardas try/catch: un
// modulo raro nunca debe romper la grilla entera.
function Card({ item, removed, onToggle }) {
  const ref = useRef(null), raf = useRef(0), drawn = useRef(false)
  const spec = item.spec
  const paint = (t) => { try { spec.draw(ref.current.getContext('2d'), t) } catch { /* modulo problematico */ } }
  useEffect(() => {
    drawn.current = false
    const cv = ref.current
    const io = new IntersectionObserver((es) => es.forEach(e => {
      if (e.isIntersecting && !drawn.current) { drawn.current = true; paint(spec.still || 0) }
    }), { rootMargin: '250px' })
    io.observe(cv)
    return () => { io.disconnect(); cancelAnimationFrame(raf.current) }
  }, [spec]) // eslint-disable-line react-hooks/exhaustive-deps
  const enter = () => {
    if (!spec.dur) return
    const t0 = performance.now()
    const loop = (now) => { paint(((now - t0) / 1000) % spec.dur); raf.current = requestAnimationFrame(loop) }
    raf.current = requestAnimationFrame(loop)
  }
  const leave = () => { cancelAnimationFrame(raf.current); if (drawn.current) paint(spec.still || 0) }
  return (
    <div className={`${styles.card} ${removed ? styles.removed : ''}`} onMouseEnter={enter} onMouseLeave={leave}>
      <div className={styles.canvasWrap}>
        <canvas ref={ref} width={PREV_W} height={PREV_H} className={styles.canvas} />
        {removed && <div className={styles.removedTag}>Eliminado</div>}
        {item.play && <button className={styles.playBtn} onClick={item.play} title="Reproducir">▶</button>}
      </div>
      <div className={styles.cardFoot}>
        <div className={styles.cardText}>
          <div className={styles.cardLabel} title={item.label}>{item.label}</div>
          {item.meta && <div className={styles.cardMeta}>{item.meta}</div>}
        </div>
        {removed
          ? <button className={styles.restoreBtn} onClick={() => onToggle(item.id, false)} title="Restaurar">↺</button>
          : <button className={styles.delBtn} onClick={() => onToggle(item.id, true)} title="Eliminar">🗑</button>}
      </div>
    </div>
  )
}

export default function BibliotecaStudio() {
  const { user } = useAuth()
  const [engine, setEngine] = useState('urvid')
  const [catKey, setCatKey] = useState(null)
  const [removed, setRemoved] = useState(() => new Set())
  const [synced, setSynced] = useState(null)
  const [building, setBuilding] = useState(false)
  const cache = useRef(new Map())
  const [catalog, setCatalog] = useState(null)

  useEffect(() => { loadRemoved().then(setRemoved) }, [])

  // construye (perezoso, cacheado) el catalogo del motor seleccionado; cede un frame para pintar loading
  useEffect(() => {
    if (cache.current.has(engine)) { const c = cache.current.get(engine); setCatalog(c); setCatKey(c.categories[0]?.key); return }
    setBuilding(true); setCatalog(null)
    const id = setTimeout(() => {
      let c
      try { c = ENGINES.find(e => e.key === engine).build() } catch (e) { c = { key: engine, label: ENGINE_LABEL[engine], categories: [], error: String(e && e.message) } }
      cache.current.set(engine, c); setCatalog(c); setCatKey(c.categories[0]?.key); setBuilding(false)
    }, 16)
    return () => clearTimeout(id)
  }, [engine])

  const toggle = async (id, remove) => {
    const next = new Set(removed)
    if (remove) next.add(id); else next.delete(id)
    setRemoved(next)
    setSynced(await saveRemoved(next))
  }

  if (!isAdmin(user?.email)) return <div className={styles.wrap}><div className={styles.denied}>Acceso restringido.</div></div>

  const cats = catalog?.categories || []
  const cat = cats.find(c => c.key === catKey) || cats[0]
  const removedInEngine = [...removed].filter(id => id.startsWith(engine + '|')).length

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <h1 className={styles.title}>Biblioteca de contenido</h1>
        <p className={styles.sub}>Todo lo que compone un video, por motor y categoria. Pasa el mouse sobre cada item para verlo en movimiento. {removed.size} eliminado{removed.size === 1 ? '' : 's'} en total{synced === true ? ' · ✓ sincronizado' : synced === false ? ' · guardado local' : ''}.</p>
        <div className={styles.tabs}>
          {ENGINES.map(e => (
            <button key={e.key} className={`${styles.tab} ${engine === e.key ? styles.tabOn : ''}`} onClick={() => setEngine(e.key)}>{ENGINE_LABEL[e.key]}</button>
          ))}
        </div>
      </div>

      {building && <div className={styles.loading}>Cargando catalogo de {ENGINE_LABEL[engine]}…</div>}

      {catalog && !building && (
        <>
          {catalog.note && <div className={styles.engineNote}>{catalog.note}{removedInEngine ? ` · ${removedInEngine} eliminado(s) en este motor` : ''}</div>}
          <div className={styles.chips}>
            {cats.map(c => (
              <button key={c.key} className={`${styles.chip} ${cat?.key === c.key ? styles.chipOn : ''}`} onClick={() => setCatKey(c.key)}>
                {c.title} <span className={styles.chipCount}>{c.items.length}</span>
              </button>
            ))}
          </div>
          {cat && <div className={styles.catNote}>{cat.note}</div>}
          <div className={styles.grid}>
            {cat?.items.map(it => (
              <Card key={it.id} item={it} removed={removed.has(it.id)} onToggle={toggle} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
