import { useEffect, useMemo, useRef, useState } from 'react'
import {
  makeMotionVideo, drawMotionFrame, FAMILIAS, FONT_PAIRS, listModules,
  deriveDNA, drawShape, circlePath, starPath, rectPath, linePath, paintPlate,
  rgba, fontStr, applyCase,
} from '../../aemotion/index.js'
import { useAuth } from '../../contexts/AuthContext'
import { isAdmin } from '../../lib/admin'
import { loadRemoved, saveRemoved } from '../../lib/contentLibrary'
import styles from './BibliotecaStudio.module.css'

// BIBLIOTECA DE CONTENIDO (admin) — catalogo visual de TODO lo que compone un video del motor Motion
// IA, separado por categorias: familias visuales, fondos, fuentes, esquemas de color, formas y
// escenas + transiciones. Cada item se PREVISUALIZA con un frame real del motor (busqueda por seed)
// y se ANIMA al pasar el mouse. Eliminar un item lo saca de la generacion (makeMotionVideo lo honra
// con fallback seguro). Persistencia: localStorage + Firestore compartido (best-effort).

const PREV_W = 270, PREV_H = 480, K = PREV_W / 405
// imagen de muestra (data-URI 2x3 degrade) — hace previsualizable la escena de foto sin depender del backend
const SAMPLE_IMG = 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a5bd0"/><stop offset="1" stop-color="#0d1a3a"/></linearGradient></defs><rect width="240" height="300" fill="url(#g)"/><circle cx="170" cy="90" r="46" fill="#e8a13c"/></svg>')
const SAMPLE = { brand: 'Marca', rubro: 'tech', brandColor: '#4f7cff', tagline: 'Tu historia en video', claim: 'Menos esfuerzo, mas impacto', cta: 'Empeza gratis', bullets: ['Rapido', 'Simple', 'Profesional'], stats: [{ value: '+400', label: 'ya lo usan' }], images: [SAMPLE_IMG] }
const SDNA = deriveDNA(SAMPLE, 7)

const LABEL = {
  fam: { orbita: 'Orbital', editorial: 'Editorial', liquidpop: 'Liquid Pop', blueprint: 'Blueprint', poster: 'Poster' },
  scheme: { mono: 'Monocromo', duo: 'Complementario', tri: 'Triadico' },
  dialect: { anillos: 'Anillos', gotas: 'Gotas', arcos: 'Arcos', subrayados: 'Subrayados', bloques: 'Bloques', grid: 'Grilla', estrellas: 'Estrellas' },
  scene: { 'am.scene.cascade': 'Cascada de texto', 'am.scene.morphmark': 'Morph + marca', 'am.scene.orbit': 'Orbitas', 'am.scene.liquidstat': 'Stat liquido', 'am.scene.pathline': 'Trazo + recorrido', 'am.scene.stripes': 'Franjas', 'am.scene.ctapill': 'Cierre / CTA', 'am.scene.photocard': 'Foto del sitio' },
  xf: { 'am.xf.iris': 'Iris liquido', 'am.xf.push': 'Empuje', 'am.xf.shapewipe': 'Barrido de forma' },
}

// busca el primer seed (1..max) cuyo video cumple pred; cachea. Da previews con contenido REAL.
const _vcache = new Map()
function findVideo(key, pred, max = 500) {
  if (_vcache.has(key)) return _vcache.get(key)
  let found = null
  for (let s = 1; s <= max && !found; s++) { const v = makeMotionVideo({ ...SAMPLE, seed: s }); if (pred(v)) found = v }
  if (!found) found = makeMotionVideo({ ...SAMPLE, seed: 1 })
  _vcache.set(key, found)
  return found
}

// prepara el ctx en coords logicas 405x720 y limpia
function frame(ctx) { ctx.setTransform(K, 0, 0, K, 0, 0); ctx.clearRect(0, 0, 405, 720) }

// --- draws de cada categoria (draw(ctx, t) — t en segundos; dur = largo del loop de hover) ---

function famDraw(famId) {
  const v = findVideo('fam:' + famId, x => x.dna.familia === famId)
  return { dur: v.duration, draw: (ctx, t) => { frame(ctx); drawMotionFrame(ctx, t, v) }, still: v.duration * 0.16 }
}

function bgDraw(fam) {
  const v = findVideo('fam:' + fam.id, x => x.dna.familia === fam.id)
  // placa de solo-FONDO (sin contenido) via paintPlate; el t global hace driftar aurora/glow
  const sc = v.scenes.find(s => s.polarity === 'dark') || v.scenes.find(s => s.polarity === 'light') || v.scenes[0]
  return {
    dur: 8, still: 3,
    draw: (ctx, t) => { frame(ctx); paintPlate(ctx, 405, 720, sc, sc.t0 + t, v) },
  }
}

function fontDraw(pair) {
  return {
    dur: 0, still: 0,
    draw: (ctx) => {
      frame(ctx)
      ctx.fillStyle = SDNA.paperDark; ctx.fillRect(0, 0, 405, 720)
      ctx.textAlign = 'center'
      ctx.fillStyle = SDNA.inkDark
      ctx.textBaseline = 'middle'
      ctx.font = fontStr(pair.dw, 150, pair.display)
      ctx.fillText('Aa', 202, 250)
      ctx.font = fontStr(pair.dw, 40, pair.display)
      ctx.fillText(applyCase('Titular', 'upper'), 202, 400)
      ctx.fillStyle = rgba(SDNA.inkDark, 0.6)
      ctx.font = fontStr(pair.sw, 22, pair.support)
      ctx.fillText('Texto de soporte 123', 202, 470)
      ctx.fillStyle = rgba(SDNA.accent, 0.9)
      ctx.font = fontStr(pair.sw, 14, pair.support)
      ctx.fillText((pair.display + ' / ' + pair.support).toUpperCase(), 202, 560)
    },
  }
}

function schemeDraw(schemeId) {
  const v = findVideo('scheme:' + schemeId, x => x.dna.scheme === schemeId)
  const a = v.dna.accent, a2 = v.dna.accent2
  return {
    dur: 0, still: 0,
    draw: (ctx) => {
      frame(ctx)
      ctx.fillStyle = '#0c0e14'; ctx.fillRect(0, 0, 405, 720)
      // dos anillos entrelazados en los dos colores del esquema + swatches
      drawShape(ctx, 0, { path: circlePath(150, 250, 95), stroke: { color: a, width: 12 } })
      drawShape(ctx, 0, { path: circlePath(255, 250, 95), stroke: { color: a2, width: 12 } })
      ctx.fillStyle = a; ctx.fillRect(70, 430, 120, 120)
      ctx.fillStyle = a2; ctx.fillRect(215, 430, 120, 120)
      ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.font = fontStr(600, 18, 'Inter')
      ctx.fillText(a.toUpperCase(), 130, 600); ctx.fillText(a2.toUpperCase(), 275, 600)
    },
  }
}

function dialectDraw(d) {
  const a = SDNA.accent, a2 = SDNA.accent2
  const cx = 202, cy = 240, R = 120
  return {
    dur: 4, still: 1,
    draw: (ctx, t) => {
      frame(ctx)
      ctx.fillStyle = '#0c0e14'; ctx.fillRect(0, 0, 405, 720)
      const rot = t * 0.5
      if (d === 'anillos') {
        drawShape(ctx, 0, { path: circlePath(cx, cy, R), stroke: { color: a, width: 6 }, trim: { start: 0, end: 0.8, offset: rot * 0.16 } })
        drawShape(ctx, 0, { path: circlePath(cx, cy, R * 0.6), stroke: { color: a2, width: 4 }, trim: { start: 0, end: 0.6, offset: -rot * 0.16 } })
      } else if (d === 'gotas') {
        drawShape(ctx, 0, { path: circlePath(cx - 40, cy, 34), fill: a })
        drawShape(ctx, 0, { path: circlePath(cx + 30 + Math.sin(t * 2) * 10, cy, 22), fill: a })
      } else if (d === 'arcos') {
        ctx.strokeStyle = a; ctx.lineWidth = 6; ctx.lineCap = 'round'
        ctx.beginPath(); ctx.arc(cx, cy, R, rot, rot + 2.2); ctx.stroke()
        ctx.strokeStyle = a2; ctx.lineWidth = 4
        ctx.beginPath(); ctx.arc(cx, cy, R * 0.62, -rot, -rot + 1.6); ctx.stroke()
      } else if (d === 'subrayados') {
        drawShape(ctx, 0, { path: linePath(cx - R, cy, cx + R, cy), stroke: { color: a, width: 8 }, trim: { start: 0, end: (Math.sin(t) + 1) / 2 } })
      } else if (d === 'bloques') {
        for (let i = 0; i < 3; i++) drawShape(ctx, 0, { path: rectPath(cx - 90 + i * 70, cy - 50 + Math.sin(t * 2 + i) * 8, 56, 100, 8), fill: i % 2 ? a2 : a })
      } else if (d === 'grid') {
        ctx.strokeStyle = rgba(a, 0.6); ctx.lineWidth = 2
        for (let i = 0; i <= 6; i++) { ctx.beginPath(); ctx.moveTo(cx - R + i * (2 * R / 6), cy - R); ctx.lineTo(cx - R + i * (2 * R / 6), cy + R); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx - R, cy - R + i * (2 * R / 6)); ctx.lineTo(cx + R, cy - R + i * (2 * R / 6)); ctx.stroke() }
        ctx.strokeStyle = a2; ctx.lineWidth = 3; const mx = cx - R + ((t * 40) % (2 * R)); ctx.beginPath(); ctx.moveTo(mx, cy - 12); ctx.lineTo(mx, cy + 12); ctx.stroke()
      } else if (d === 'estrellas') {
        drawShape(ctx, 0, { path: starPath(cx, cy, R, R * 0.44, 5, rot), fill: a })
        drawShape(ctx, 0, { path: starPath(cx, cy - 4, R * 0.5, R * 0.22, 5, -rot), fill: a2 })
      }
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.font = fontStr(500, 20, 'Inter'); ctx.fillText(LABEL.dialect[d] || d, cx, 470)
    },
  }
}

function sceneDraw(sceneId) {
  const v = findVideo('scene:' + sceneId, x => x.scenes.some(s => s.sceneId === sceneId))
  const sc = v.scenes.find(s => s.sceneId === sceneId) || v.scenes[0]
  return {
    dur: sc.dur, still: sc.dur * 0.45,
    draw: (ctx, t) => { frame(ctx); drawMotionFrame(ctx, sc.t0 + (t % sc.dur), v) },
  }
}

function xfDraw(xfId) {
  const v = findVideo('xf:' + xfId, x => x.cuts.some(c => c.id === xfId))
  const cut = v.cuts.find(c => c.id === xfId)
  if (!cut) return { dur: 0, still: 0, draw: (ctx) => frame(ctx) }
  const d = cut.dur, t0 = cut.at - d / 2
  return {
    dur: d + 1.2, still: d / 2,   // still en el medio de la transicion
    draw: (ctx, t) => { frame(ctx); drawMotionFrame(ctx, t0 + Math.min(t, d), v) },
  }
}

// tarjeta con preview animado al hover
function Card({ id, label, meta, removed, onToggle, spec }) {
  const ref = useRef(null)
  const raf = useRef(0)
  useEffect(() => {
    const ctx = ref.current.getContext('2d')
    spec.draw(ctx, spec.still || 0)
    return () => cancelAnimationFrame(raf.current)
  }, [spec])
  const enter = () => {
    if (!spec.dur) return
    const ctx = ref.current.getContext('2d')
    const t0 = performance.now()
    const loop = (now) => { spec.draw(ctx, ((now - t0) / 1000) % spec.dur); raf.current = requestAnimationFrame(loop) }
    raf.current = requestAnimationFrame(loop)
  }
  const leave = () => { cancelAnimationFrame(raf.current); const ctx = ref.current.getContext('2d'); spec.draw(ctx, spec.still || 0) }
  return (
    <div className={`${styles.card} ${removed ? styles.removed : ''}`} onMouseEnter={enter} onMouseLeave={leave}>
      <div className={styles.canvasWrap}>
        <canvas ref={ref} width={PREV_W} height={PREV_H} className={styles.canvas} />
        {removed && <div className={styles.removedTag}>Eliminado</div>}
      </div>
      <div className={styles.cardFoot}>
        <div className={styles.cardText}>
          <div className={styles.cardLabel}>{label}</div>
          {meta && <div className={styles.cardMeta}>{meta}</div>}
        </div>
        {removed
          ? <button className={styles.restoreBtn} onClick={() => onToggle(id, false)} title="Restaurar">↺</button>
          : <button className={styles.delBtn} onClick={() => onToggle(id, true)} title="Eliminar de la generacion">🗑</button>}
      </div>
    </div>
  )
}

export default function BibliotecaStudio() {
  const { user } = useAuth()
  const [removed, setRemoved] = useState(() => new Set())
  const [synced, setSynced] = useState(null)

  useEffect(() => { loadRemoved().then(setRemoved) }, [])

  const catalog = useMemo(() => {
    const dialects = [...new Set(FAMILIAS.flatMap(f => f.dialects))]
    const scenes = listModules('scenes').map(m => m.id).sort()
    const xfs = listModules('transitions').filter(m => m.dur > 0).map(m => m.id).sort()
    return [
      { key: 'fam', title: 'Familias visuales', note: 'El sistema de diseno completo (fondo + paleta + ritmo). Eliminar una la saca de la generacion.', items: FAMILIAS.map(f => ({ id: 'fam:' + f.id, label: LABEL.fam[f.id] || f.id, meta: f.bg, spec: famDraw(f.id) })) },
      { key: 'bg', title: 'Fondos', note: 'Cada fondo es parte de su familia (mismo on/off).', items: FAMILIAS.map(f => ({ id: 'fam:' + f.id, label: LABEL.fam[f.id] || f.id, meta: 'fondo ' + f.bg, spec: bgDraw(f) })) },
      { key: 'font', title: 'Fuentes', note: 'Pares display + soporte.', items: FONT_PAIRS.map(p => ({ id: 'font:' + p.id, label: p.display, meta: '+ ' + p.support, spec: fontDraw(p) })) },
      { key: 'scheme', title: 'Esquemas de color', note: 'Como se deriva el 2do color del color de marca.', items: Object.keys(LABEL.scheme).map(s => ({ id: 'scheme:' + s, label: LABEL.scheme[s], spec: schemeDraw(s) })) },
      { key: 'dialect', title: 'Formas', note: 'El vocabulario de formas (garnish, morphs, flotantes).', items: dialects.map(d => ({ id: 'dialect:' + d, label: LABEL.dialect[d] || d, spec: dialectDraw(d) })) },
      { key: 'scene', title: 'Escenas', note: 'Las plantillas que arman cada beat del video.', items: scenes.map(id => ({ id, label: LABEL.scene[id] || id, spec: sceneDraw(id) })) },
      { key: 'xf', title: 'Transiciones', note: 'Los cortes con movimiento entre escenas.', items: xfs.map(id => ({ id, label: LABEL.xf[id] || id, spec: xfDraw(id) })) },
    ]
  }, [])

  const toggle = async (id, remove) => {
    const next = new Set(removed)
    if (remove) next.add(id); else next.delete(id)
    setRemoved(next)
    const ok = await saveRemoved(next)
    setSynced(ok)
  }

  if (!isAdmin(user?.email)) {
    return <div className={styles.wrap}><div className={styles.denied}>Acceso restringido.</div></div>
  }

  const removedCount = removed.size

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <h1 className={styles.title}>Biblioteca de contenido</h1>
        <p className={styles.sub}>Todo lo que compone un video del motor <strong>Motion IA</strong>, por categoria. Pasa el mouse sobre cada item para verlo en movimiento. Eliminar un item lo saca de la generacion de nuevos videos (con resguardo: nunca vacia una categoria).</p>
        <div className={styles.statusRow}>
          <span className={styles.badge}>{removedCount} eliminado{removedCount === 1 ? '' : 's'}</span>
          {synced === true && <span className={styles.sync}>✓ sincronizado</span>}
          {synced === false && <span className={styles.syncWarn}>guardado local (sincroniza al desplegar reglas)</span>}
        </div>
      </div>

      {catalog.map(cat => (
        <section key={cat.key} className={styles.section}>
          <div className={styles.secHead}>
            <h2 className={styles.secTitle}>{cat.title} <span className={styles.secCount}>{cat.items.length}</span></h2>
            <span className={styles.secNote}>{cat.note}</span>
          </div>
          <div className={styles.grid}>
            {cat.items.map(it => (
              <Card key={cat.key + it.id} id={it.id} label={it.label} meta={it.meta} removed={removed.has(it.id)} onToggle={toggle} spec={it.spec} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
