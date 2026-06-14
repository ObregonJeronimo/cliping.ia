import { useRef, useEffect } from 'react'
import { W, H, drawBackground } from './engineCore'
import samples from './styleSamples.json'

/**
 * DireccionLab — seccion AISLADA del sidebar para la DIRECCION GENERATIVA (POC 3).
 * Muestra los "presets de estilo" que produce backend/style_engine.py (gramatica por rubro, pura y
 * determinista) para marcas de ejemplo, con el fondo que generan. Sirve para CURAR el mapeo
 * rubro->tokens a ojo. El JSON se regenera con: python backend/style_engine.py > src/.../styleSamples.json
 *
 * Idea: el director (timeline_director.py) usa este preset para acotar el vocabulario y meter una
 * semilla -> dos marcas del mismo rubro NO salen iguales, y rubros distintos se sienten distintos.
 */
function PresetCard({ p }) {
  const ref = useRef(null)
  const dpr = Math.min(typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1, 2)
  const cw = 150, ch = Math.round(cw * H / W)
  useEffect(() => {
    const cv = ref.current; if (!cv) return
    cv.width = cw * dpr; cv.height = ch * dpr
    const ctx = cv.getContext('2d')
    ctx.setTransform((cw / W) * dpr, 0, 0, (ch / H) * dpr, 0, 0)
    drawBackground(ctx, 3.0, { theme: p.theme, accent: p.accent, seed: p.seed })
  }, [p, cw, ch, dpr])
  return (
    <div style={card}>
      <canvas ref={ref} style={{ width: cw, height: ch, borderRadius: 10, display: 'block', flexShrink: 0 }} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 2 }}>{p.label}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <span style={{ width: 14, height: 14, borderRadius: 4, background: p.accent, border: '1px solid #0002' }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{p.rubro}</span>
          <code style={{ fontSize: 11, color: '#888' }}>{p.accent}</code>
        </div>
        <Row k="tema" v={p.theme} />
        <Row k="ritmo / densidad" v={`${p.pacing} · ${p.density}`} />
        <Row k="formas" v={(p.morphs || []).join(', ')} />
        <Row k="motion" v={(p.motion || []).join(', ')} />
        <Row k="gancho" v={p.hook_bias} />
        <Row k="seed" v={String(p.seed)} mono />
      </div>
    </div>
  )
}
function Row({ k, v, mono }) {
  return (
    <div style={{ display: 'flex', gap: 6, fontSize: 11.5, lineHeight: 1.5 }}>
      <span style={{ color: '#999', minWidth: 92, flexShrink: 0 }}>{k}</span>
      <span style={{ color: '#333', fontFamily: mono ? 'ui-monospace, Menlo, monospace' : 'inherit', wordBreak: 'break-word' }}>{v}</span>
    </div>
  )
}

export default function DireccionLab() {
  return (
    <div style={{ padding: '8px 4px 40px' }}>
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: '#111', display: 'flex', alignItems: 'center', gap: 10 }}>
          Direccion generativa <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6366f1', background: '#eef0ff', borderRadius: 6, padding: '3px 8px' }}>lab · POC 3</span>
        </h2>
        <p style={{ fontSize: 13, color: '#666', lineHeight: 1.55, margin: '8px 0 0', maxWidth: 640 }}>
          Presets de <strong>style_engine.py</strong> (gramatica por rubro, pura y determinista) para marcas
          de ejemplo. El director los usa para ACOTAR el vocabulario (paleta, formas, ritmo) y meter una
          semilla por marca: rubros distintos se sienten distintos y dos marcas del mismo rubro NO salen
          iguales. Curá el mapeo rubro→tokens a ojo y regenerá el JSON desde el backend.
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: 14 }}>
        {samples.map((p, i) => <PresetCard key={i} p={p} />)}
      </div>
      <p style={{ fontSize: 12, color: '#888', lineHeight: 1.5, margin: '18px 0 0', borderTop: '1px solid #eee', paddingTop: 14, maxWidth: 640 }}>
        Validado: <strong>determinista</strong> + clasificacion correcta + familias disjuntas por rubro
        (pytest 8/8). La diversidad REAL del copy la confirma Jero al correr el LLM (no se puede medir aca).
      </p>
    </div>
  )
}

const card = { display: 'flex', gap: 14, padding: 12, border: '1px solid #ececec', borderRadius: 14, background: '#fff' }
