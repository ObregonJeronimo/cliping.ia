import { clipLabel } from '../../lib/audioAssets.js'

// AudioEditor — librería de audio (SFX o Música) para agregar clips al timeline. Genérico: recibe `library` (lista
// { id, name, cat, dur } agrupable por cat), escuchar (▶), agregar en el playhead, y editar (tiempo/volumen) o quitar
// el clip seleccionado. Tema claro, panel angosto — mismo lenguaje visual que OverlayEditor.
const T = { ink: '#1a1d29', sub: '#7a7f8c', line: 'rgba(20,22,34,0.11)' }
const S = {
  card: { border: `1px solid ${T.line}`, borderRadius: 14, padding: 14, background: '#fff', marginTop: 10, boxShadow: '0 1px 3px rgba(20,22,34,0.05)' },
  title: { fontSize: 14, fontWeight: 700, color: T.ink, letterSpacing: -0.2 },
  lead: { fontSize: 11.5, lineHeight: 1.5, color: T.sub, margin: '5px 0 12px' },
  cat: { fontSize: 10, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: T.sub, margin: '12px 0 7px' },
  grid: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  pill: { display: 'inline-flex', alignItems: 'stretch', border: `1px solid ${T.line}`, borderRadius: 20, overflow: 'hidden', background: '#fff' },
  play: { border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px 7px', fontSize: 10, color: T.sub, display: 'inline-flex', alignItems: 'center' },
  addBtn: (ac) => ({ border: 'none', borderLeft: `1px solid ${T.line}`, background: 'transparent', cursor: 'pointer', padding: '4px 10px', fontSize: 11.5, fontWeight: 600, color: ac, whiteSpace: 'nowrap' }),
  sub: { fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: T.sub, margin: '16px 0 7px' },
  clips: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  clip: (on, ac) => ({ fontSize: 11, padding: '4px 10px', borderRadius: 20, cursor: 'pointer', border: `1px solid ${on ? ac : T.line}`, background: on ? ac + '18' : '#fff', color: on ? ac : T.ink, fontWeight: on ? 600 : 500 }),
  field: { display: 'flex', alignItems: 'center', gap: 10, marginTop: 11 },
  lbl: { width: 54, flexShrink: 0, fontSize: 10.5, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase', color: T.sub },
  slider: (ac) => ({ flex: 1, minWidth: 0, accentColor: ac, cursor: 'pointer' }),
  val: { width: 42, textAlign: 'right', flexShrink: 0, fontSize: 12, fontWeight: 600, color: T.ink, fontVariantNumeric: 'tabular-nums' },
  del: { display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: 12, fontSize: 12.5, fontWeight: 600, padding: '8px 12px', borderRadius: 10, cursor: 'pointer', border: `1px solid ${T.line}`, background: '#fff', color: '#8a8f9c' },
  hint: { fontSize: 11, lineHeight: 1.5, color: T.sub, margin: '12px 0 0' },
}
const IconTrash = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
)

function groupByCat(library) {
  const order = []; const map = {}
  for (const it of library || []) { if (!map[it.cat]) { map[it.cat] = []; order.push(it.cat) } map[it.cat].push(it) }
  return order.map(cat => ({ cat, items: map[cat] }))
}

export default function AudioEditor({ library, title, lead, accent = '#c98a2b', hint, audio, selId, onSelect, onAdd, onPreview, onPatch, onRemove, duration }) {
  const sel = (audio || []).find(a => a.id === selId)
  const dur = Math.max(1, duration || 12)
  const groups = groupByCat(library)
  return (
    <div style={S.card}>
      <span style={S.title}>{title}</span>
      {lead && <p style={S.lead}>{lead}</p>}

      {groups.map(g => (
        <div key={g.cat}>
          <div style={S.cat}>{g.cat}</div>
          <div style={S.grid}>
            {g.items.map(it => (
              <span key={it.id} style={S.pill}>
                <button onClick={() => onPreview && onPreview(it.id)} title="Escuchar" style={S.play}>▶</button>
                <button onClick={() => onAdd && onAdd(it.id)} title={`Agregar “${it.name}” en el playhead`} style={S.addBtn(accent)}>{it.name} +</button>
              </span>
            ))}
          </div>
        </div>
      ))}

      {audio && audio.length > 0 && (
        <>
          <div style={S.sub}>En el timeline ({audio.length})</div>
          <div style={S.clips}>
            {audio.map(a => (
              <button key={a.id} onClick={() => onSelect(a.id)} style={S.clip(selId === a.id, accent)}>
                ♪ {clipLabel(a.sfx)} · {(a.startSec || 0).toFixed(1)}s
              </button>
            ))}
          </div>
        </>
      )}

      {sel && (
        <div>
          <div style={S.field}>
            <span style={S.lbl}>Desde</span>
            <input type="range" min="0" max={dur} step="0.1" value={Math.min(sel.startSec || 0, dur)} onChange={e => onPatch(sel.id, { startSec: +e.target.value })} style={S.slider(accent)} />
            <span style={S.val}>{(sel.startSec || 0).toFixed(1)}s</span>
          </div>
          <div style={S.field}>
            <span style={S.lbl}>Volumen</span>
            <input type="range" min="0" max="1" step="0.05" value={sel.gain == null ? 0.9 : sel.gain} onChange={e => onPatch(sel.id, { gain: +e.target.value })} style={S.slider(accent)} />
            <span style={S.val}>{Math.round((sel.gain == null ? 0.9 : sel.gain) * 100)}%</span>
          </div>
          <button onClick={() => onRemove(sel.id)} style={S.del}><IconTrash /> Quitar clip</button>
        </div>
      )}

      <p style={S.hint}>{hint || 'Tocá ▶ para escuchar; “+” agrega el sonido en la posición del playhead. Sale en el video descargado.'}</p>
    </div>
  )
}
