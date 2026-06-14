import { useRef, useState, useEffect } from 'react'
import { drawMotionDemo, MOTION_KINDS } from './motionDemo.js'

/**
 * MotionLab — seccion AISLADA del sidebar para ver el motion premium NATIVO del Canvas (POC 2).
 * Ejerce motion2d (easings premium, motion-path por curva, morph entre formas arbitrarias, stagger)
 * con el MISMO codigo puro que puede usar el motor real. Determinista (funcion de t) => lo que ves
 * aca es lo que saldria en el MP4.
 */
const W = 405, H = 720, LOOP = 8.05
const KIND_LABEL = { eases: 'Easings', path: 'Motion path', morph: 'Morph', stagger: 'Stagger' }

export default function MotionLab() {
  const dpr = Math.min(typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1, 2.5)
  const canvasRef = useRef(null)
  const tRef = useRef(0)
  const playRef = useRef(true)
  const [kind, setKind] = useState('morph')
  const [accent, setAccent] = useState('#5aa0ff')
  const [playing, setPlaying] = useState(true)
  const [t, setT] = useState(0)

  useEffect(() => { playRef.current = playing }, [playing])

  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    cv.width = W * dpr; cv.height = H * dpr
    const ctx = cv.getContext('2d')
    let raf = 0, last = performance.now()
    const loop = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05); last = now
      if (playRef.current) { tRef.current += dt; if (tRef.current > LOOP) tRef.current -= LOOP; setT(tRef.current) }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      drawMotionDemo(ctx, tRef.current, kind, { accent })
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [kind, accent, dpr])

  return (
    <div style={{ padding: '8px 4px 40px' }}>
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: '#111', display: 'flex', alignItems: 'center', gap: 10 }}>
          Motion premium <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6366f1', background: '#eef0ff', borderRadius: 6, padding: '3px 8px' }}>lab · POC 2</span>
        </h2>
        <p style={{ fontSize: 13, color: '#666', lineHeight: 1.55, margin: '8px 0 0', maxWidth: 620 }}>
          Vocabulario de movimiento nativo del motor Canvas (determinista, sin dependencias): easings
          premium, recorridos por curva (motion-path), morph entre formas arbitrarias y cascadas (stagger).
          Es la materia prima que la direccion generativa (POC 3) combina por marca.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
          <canvas ref={canvasRef} style={{ height: '64vh', maxHeight: 760, aspectRatio: `${W} / ${H}`, width: 'auto', borderRadius: 16, display: 'block', boxShadow: '0 14px 50px rgba(0,0,0,0.35)' }} />
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', width: '100%', maxWidth: 430 }}>
            <button style={btn} onClick={() => setPlaying(p => !p)}>{playing ? '⏸ Pausar' : '▶ Reproducir'}</button>
            <input type="range" min={0} max={LOOP} step={0.01} value={t} onChange={e => { tRef.current = parseFloat(e.target.value); setT(tRef.current) }} style={{ flex: 1 }} />
            <span style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12, color: '#888', width: 44, textAlign: 'right' }}>{t.toFixed(1)}s</span>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 260, maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <label style={lbl}>Demo</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {MOTION_KINDS.map(k => (
                <button key={k} onClick={() => setKind(k)} style={{ ...btn, fontWeight: 700, background: kind === k ? '#111' : '#fff', color: kind === k ? '#fff' : '#222' }}>{KIND_LABEL[k]}</button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <label style={lbl}>Acento</label>
            <input type="color" value={accent} onChange={e => setAccent(e.target.value)} style={{ width: 44, height: 32, border: 'none', background: 'none', cursor: 'pointer' }} />
          </div>
          <p style={{ fontSize: 12, color: '#888', lineHeight: 1.5, margin: '4px 0 0', borderTop: '1px solid #eee', paddingTop: 14 }}>
            Validado: <strong>determinista</strong> (mismas ops por t) + invariantes (easings 0→1, path por
            longitud de arco, morph exacto en extremos). El "feel" final lo confirma el MP4.
          </p>
        </div>
      </div>
    </div>
  )
}

const btn = { padding: '9px 14px', borderRadius: 9, border: '1px solid #ddd', background: '#fff', color: '#222', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const lbl = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#444' }
