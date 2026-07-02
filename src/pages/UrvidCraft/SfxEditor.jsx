import { SFX } from '../../lib/sfxLib.js'

// SfxEditor (Fase 4) — librería de SFX (sintetizados, libres) para agregar al video. Escuchar (▶), agregar en el playhead,
// y editar (tiempo/volumen) o quitar el clip seleccionado. Compacto, tema claro.
export default function SfxEditor({ audio, selId, onSelect, onAdd, onPreview, onPatch, onRemove, duration }) {
  const sel = (audio || []).find(a => a.id === selId)
  const box = { border: '1px solid rgba(0,0,0,0.1)', borderRadius: 10, padding: '10px 12px', background: 'rgba(255,255,255,0.6)', marginTop: 10 }
  const row = { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7, fontSize: 12 }
  const lbl = { width: 56, opacity: 0.6, flexShrink: 0 }
  const dur = Math.max(1, duration || 12)
  return (
    <div style={box}>
      <b style={{ fontSize: 13 }}>SFX (efectos de sonido)</b>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '8px 0' }}>
        {SFX.map(s => (
          <span key={s.id} style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid rgba(0,0,0,0.15)', borderRadius: 20, overflow: 'hidden' }}>
            <button onClick={() => onPreview && onPreview(s.id)} title="Escuchar" style={{ border: 'none', background: '#fff', cursor: 'pointer', padding: '3px 7px', fontSize: 11 }}>▶</button>
            <button onClick={() => onAdd && onAdd(s.id)} title={`Agregar ${s.name} en el playhead`} style={{ border: 'none', borderLeft: '1px solid rgba(0,0,0,0.1)', background: '#fff', cursor: 'pointer', padding: '3px 9px', fontSize: 11 }}>{s.name} +</button>
          </span>
        ))}
      </div>
      {audio && audio.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: sel ? 10 : 0 }}>
          {audio.map(a => (
            <button key={a.id} onClick={() => onSelect(a.id)}
              style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, cursor: 'pointer', border: selId === a.id ? '1px solid #c98a2b' : '1px solid rgba(0,0,0,0.15)', background: selId === a.id ? '#fbf1dd' : '#fff' }}>
              ♪ {a.sfx} · {(a.startSec || 0).toFixed(1)}s
            </button>
          ))}
        </div>
      )}
      {sel && (
        <div>
          <div style={row}><span style={lbl}>Desde</span>
            <input type="range" min="0" max={dur} step="0.1" value={Math.min(sel.startSec || 0, dur)} onChange={e => onPatch(sel.id, { startSec: +e.target.value })} style={{ flex: 1 }} />
            <span style={{ width: 34, textAlign: 'right' }}>{(sel.startSec || 0).toFixed(1)}s</span></div>
          <div style={row}><span style={lbl}>Volumen</span>
            <input type="range" min="0" max="1" step="0.05" value={sel.gain == null ? 0.9 : sel.gain} onChange={e => onPatch(sel.id, { gain: +e.target.value })} style={{ flex: 1 }} />
            <span style={{ width: 34, textAlign: 'right' }}>{Math.round((sel.gain == null ? 0.9 : sel.gain) * 100)}%</span></div>
          <button onClick={() => onRemove(sel.id)} style={{ fontSize: 12, padding: '4px 11px', borderRadius: 7, cursor: 'pointer', border: '1px solid rgba(0,0,0,0.15)', background: '#fff' }}>🗑 Quitar</button>
        </div>
      )}
      <p style={{ fontSize: 10.5, opacity: 0.5, margin: '7px 0 0' }}>Tocá ▶ para escuchar cada efecto; “+” lo agrega en la posición del playhead. Los SFX salen en el video descargado.</p>
    </div>
  )
}
