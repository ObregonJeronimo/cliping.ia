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
  delUp: { border: 'none', borderLeft: `1px solid ${T.line}`, background: 'transparent', cursor: 'pointer', padding: '4px 8px', fontSize: 13, lineHeight: 1, color: '#b04a3a' },
  upload: (ac) => ({ display: 'inline-flex', alignItems: 'center', gap: 5, border: `1px solid ${ac}`, borderRadius: 9, background: ac + '12', color: ac, cursor: 'pointer', padding: '6px 11px', fontSize: 12.5, fontWeight: 600 }),
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

export default function AudioEditor({ library, title, lead, accent = '#c98a2b', hint, audio, selId, onSelect, onAdd, onPreview, onUpload, uploading, onDeleteUpload }) {
  const groups = groupByCat(library)
  const busy = uploading === 'Subiendo…'
  return (
    <div style={S.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <span style={S.title}>{title}</span>
        {onUpload && <button onClick={onUpload} disabled={busy} style={{ ...S.upload(accent), opacity: busy ? 0.6 : 1 }}>⬆ {busy ? 'Subiendo…' : 'Subir'}</button>}
      </div>
      {lead && <p style={S.lead}>{lead}</p>}
      {uploading && !busy && <p style={{ ...S.lead, color: '#b04a3a', margin: '0 0 10px' }}>{uploading}</p>}

      {groups.map(g => (
        <div key={g.cat}>
          <div style={S.cat}>{g.cat}</div>
          <div style={S.grid}>
            {g.items.map(it => (
              <span key={it.id} style={S.pill} draggable
                onDragStart={e => { e.dataTransfer.setData('application/urvid-audio', it.id); e.dataTransfer.setData('text/plain', it.name); e.dataTransfer.effectAllowed = 'copy' }}
                title="Arrastrá a la pista SFX del timeline, o usá “+”">
                <button onClick={() => onPreview && onPreview(it.id)} title="Escuchar" style={S.play}>▶</button>
                <button onClick={() => onAdd && onAdd(it.id)} title={`Agregar “${it.name}” en el playhead`} style={S.addBtn(accent)}>{it.name} +</button>
                {onDeleteUpload && it.id.indexOf('up:') === 0 && <button onClick={() => onDeleteUpload(it.id)} title="Eliminar esta subida" style={S.delUp}>×</button>}
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
                ♪ {a.name || clipLabel(a.sfx)} · {(a.startSec || 0).toFixed(1)}s
              </button>
            ))}
          </div>
        </>
      )}

      <p style={S.hint}>{hint || 'Tocá ▶ para escuchar; “+” (o arrastrá a la pista SFX) agrega el sonido. Ajustá volumen/tiempo en el recuadro del clip seleccionado. Sale en el video descargado.'}</p>
    </div>
  )
}

// ClipInspector — recuadro FLOTANTE (fuera del sidebar) que edita el clip de audio seleccionado: tiempo, volumen, quitar.
// Se renderiza en el área del stage (a la derecha del panel de secciones). name = nombre legible del clip.
const IN = {
  card: { width: 236, background: '#fff', border: '1px solid rgba(20,22,34,0.12)', borderRadius: 14, boxShadow: '0 8px 30px rgba(20,22,34,0.16)', padding: 14 },
  head: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 10 },
  ttl: { fontSize: 13, fontWeight: 700, color: '#1a1d29', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  close: { border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 18, lineHeight: 1, color: '#9aa0ac', padding: '0 2px' },
  field: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 11 },
  lbl: { width: 54, flexShrink: 0, fontSize: 10.5, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase', color: '#7a7f8c' },
  val: { width: 42, textAlign: 'right', flexShrink: 0, fontSize: 12, fontWeight: 600, color: '#1a1d29', fontVariantNumeric: 'tabular-nums' },
  del: { display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: 4, fontSize: 12.5, fontWeight: 600, padding: '8px 12px', borderRadius: 10, cursor: 'pointer', border: '1px solid rgba(20,22,34,0.12)', background: '#fff', color: '#b04a3a', width: '100%', justifyContent: 'center' },
}
export function ClipInspector({ clip, name, accent = '#c98a2b', duration, onPatch, onRemove, onClose }) {
  if (!clip) return null
  const dur = Math.max(1, duration || 12)
  const sl = { flex: 1, minWidth: 0, accentColor: accent, cursor: 'pointer' }
  return (
    <div style={IN.card}>
      <div style={IN.head}>
        <span style={IN.ttl}>♪ {name || 'Clip'}</span>
        <button style={IN.close} onClick={onClose} title="Cerrar">×</button>
      </div>
      <div style={IN.field}>
        <span style={IN.lbl}>Desde</span>
        <input type="range" min="0" max={dur} step="0.1" value={Math.min(clip.startSec || 0, dur)} onChange={e => onPatch(clip.id, { startSec: +e.target.value })} style={sl} />
        <span style={IN.val}>{(clip.startSec || 0).toFixed(1)}s</span>
      </div>
      <div style={IN.field}>
        <span style={IN.lbl}>Volumen</span>
        <input type="range" min="0" max="1" step="0.05" value={clip.gain == null ? 0.9 : clip.gain} onChange={e => onPatch(clip.id, { gain: +e.target.value })} style={sl} />
        <span style={IN.val}>{Math.round((clip.gain == null ? 0.9 : clip.gain) * 100)}%</span>
      </div>
      <button style={IN.del} onClick={() => onRemove(clip.id)}><IconTrash /> Quitar clip</button>
    </div>
  )
}
