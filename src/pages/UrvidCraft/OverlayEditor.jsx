import { OVERLAY_PRESETS } from '../../lib/timeline.js'

// OverlayEditor (Fase 3) — agregar/editar objetos overlay (texto) que se animan SOBRE el video. Compacto, tema claro.
// El posicionamiento y la grabacion del movimiento pasan en el PREVIEW (Craft engancha los pointer events del canvas).
export default function OverlayEditor({ overlays, selId, onSelect, onAdd, onPatch, onRemove, recording, onToggleRecord, duration }) {
  const sel = (overlays || []).find(o => o.id === selId)
  const box = { border: '1px solid rgba(0,0,0,0.1)', borderRadius: 10, padding: '10px 12px', background: 'rgba(255,255,255,0.6)', marginTop: 10 }
  const row = { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7, fontSize: 12 }
  const lbl = { width: 62, opacity: 0.6, flexShrink: 0 }
  const dur = Math.max(1, duration || 12)
  return (
    <div style={box}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <b style={{ fontSize: 13 }}>Animaciones</b>
        <button onClick={onAdd} style={{ fontSize: 12, padding: '4px 10px', border: '1px solid rgba(0,0,0,0.15)', borderRadius: 7, background: '#fff', cursor: 'pointer' }}>+ Texto</button>
      </div>
      {(!overlays || !overlays.length) && <p style={{ fontSize: 11, opacity: 0.55, margin: 0 }}>Agregá un texto para animarlo sobre el video (fade, desde-izquierda, pop… o grabá el movimiento arrastrándolo en el preview).</p>}
      {overlays && overlays.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: sel ? 10 : 0 }}>
          {overlays.map(o => (
            <button key={o.id} onClick={() => onSelect(o.id)} title={o.text}
              style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, cursor: 'pointer', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', border: selId === o.id ? '1px solid #7048e8' : '1px solid rgba(0,0,0,0.15)', background: selId === o.id ? '#efeaff' : '#fff' }}>
              {o.anim?.kind === 'recorded' ? '⦿ ' : ''}{o.text || '(texto)'}
            </button>
          ))}
        </div>
      )}
      {sel && (
        <div>
          <div style={row}><span style={lbl}>Texto</span>
            <input value={sel.text} onChange={e => onPatch(sel.id, { text: e.target.value })} style={{ flex: 1, fontSize: 12, padding: '3px 6px', border: '1px solid rgba(0,0,0,0.2)', borderRadius: 5 }} /></div>
          <div style={row}><span style={lbl}>Animación</span>
            <select value={sel.anim?.kind === 'recorded' ? 'recorded' : (sel.anim?.preset || 'none')}
              onChange={e => { const v = e.target.value; if (v === 'recorded') return; onPatch(sel.id, { anim: { kind: v === 'none' ? 'none' : 'preset', preset: v === 'none' ? null : v, ease: sel.anim?.ease || 'suave', keyframes: null } }) }}
              style={{ flex: 1, fontSize: 12 }}>
              {OVERLAY_PRESETS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
              {sel.anim?.kind === 'recorded' && <option value="recorded">Movimiento grabado ✓</option>}
            </select></div>
          <div style={row}><span style={lbl}>Color</span>
            <input type="color" value={sel.style?.color || '#ffffff'} onChange={e => onPatch(sel.id, { style: { color: e.target.value } })} style={{ width: 34, height: 22, padding: 0, border: 'none', background: 'none', cursor: 'pointer' }} />
            <span style={{ opacity: 0.6 }}>Tamaño</span>
            <input type="range" min="24" max="140" value={sel.style?.size || 56} onChange={e => onPatch(sel.id, { style: { size: +e.target.value } })} style={{ flex: 1 }} /></div>
          <div style={row}><span style={lbl}>Desde</span>
            <input type="range" min="0" max={Math.max(0.1, dur - 0.2)} step="0.1" value={Math.min(sel.startSec || 0, dur)} onChange={e => onPatch(sel.id, { startSec: +e.target.value })} style={{ flex: 1 }} />
            <span style={{ width: 34, textAlign: 'right' }}>{(sel.startSec || 0).toFixed(1)}s</span></div>
          <div style={row}><span style={lbl}>Dura</span>
            <input type="range" min="0.4" max={dur} step="0.1" value={Math.min(sel.durSec || 2.5, dur)} onChange={e => onPatch(sel.id, { durSec: +e.target.value })} style={{ flex: 1 }} />
            <span style={{ width: 34, textAlign: 'right' }}>{(sel.durSec || 0).toFixed(1)}s</span></div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button onClick={onToggleRecord} style={{ flex: 1, fontSize: 12, padding: '5px 8px', borderRadius: 7, cursor: 'pointer', border: '1px solid ' + (recording ? '#e0533b' : 'rgba(0,0,0,0.15)'), background: recording ? '#ffe9e4' : '#fff', color: recording ? '#e0533b' : 'inherit' }}>
              {recording ? '● Grabando… arrastrá en el preview' : '⦿ Grabar movimiento'}</button>
            <button onClick={() => onRemove(sel.id)} title="Eliminar" style={{ fontSize: 13, padding: '5px 11px', borderRadius: 7, cursor: 'pointer', border: '1px solid rgba(0,0,0,0.15)', background: '#fff' }}>🗑</button>
          </div>
          <p style={{ fontSize: 10.5, opacity: 0.5, margin: '7px 0 0' }}>Arrastrá el objeto en el preview para posicionarlo. Con “Grabar”, arrastralo para grabar su recorrido.</p>
        </div>
      )}
    </div>
  )
}
