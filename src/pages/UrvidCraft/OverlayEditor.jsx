import { OVERLAY_PRESETS } from '../../lib/timeline.js'

// Tipografias para los overlays: las MISMAS familias que ofrece "Estilos" (todas ya precargadas en index.html -> se dibujan
// bien en el canvas del preview y del export). value = la font-family CSS que consume overlay.js (ctx.font = `${weight} ${size}px ${font}`).
const OVERLAY_FONTS = [
  { group: 'Sans', items: [
    ['Inter', "'Inter Tight', 'Inter', system-ui, sans-serif"],
    ['Archivo', "'Archivo', sans-serif"],
    ['Space Grotesk', "'Space Grotesk', sans-serif"],
    ['Sora', "'Sora', sans-serif"],
    ['Outfit', "'Outfit', sans-serif"],
    ['Plus Jakarta', "'Plus Jakarta Sans', sans-serif"],
    ['Familjen', "'Familjen Grotesk', sans-serif"],
    ['Onest', "'Onest', sans-serif"],
    ['Bricolage', "'Bricolage Grotesque', sans-serif"],
    ['Quicksand', "'Quicksand', sans-serif"],
  ] },
  { group: 'Display', items: [
    ['Anton', "'Anton', sans-serif"],
    ['Big Shoulders', "'Big Shoulders Display', sans-serif"],
    ['Unbounded', "'Unbounded', sans-serif"],
    ['Oswald', "'Oswald', sans-serif"],
    ['Righteous', "'Righteous', sans-serif"],
    ['Darker Grotesque', "'Darker Grotesque', sans-serif"],
    ['Chakra Petch', "'Chakra Petch', sans-serif"],
    ['Bagel Fat One', "'Bagel Fat One', system-ui"],
    ['Caprasimo', "'Caprasimo', serif"],
  ] },
  { group: 'Serif', items: [
    ['Fraunces', "'Fraunces', serif"],
    ['Playfair', "'Playfair Display', serif"],
    ['DM Serif', "'DM Serif Display', serif"],
    ['Spectral', "'Spectral', serif"],
    ['Newsreader', "'Newsreader', serif"],
  ] },
  { group: 'Manuscrita', items: [
    ['Caveat', "'Caveat', cursive"],
    ['Permanent Marker', "'Permanent Marker', cursive"],
  ] },
  { group: 'Mono', items: [
    ['JetBrains Mono', "'JetBrains Mono', monospace"],
    ['Space Mono', "'Space Mono', monospace"],
    ['IBM Plex Mono', "'IBM Plex Mono', monospace"],
  ] },
]

const T = { ink: '#1a1d29', sub: '#7a7f8c', line: 'rgba(20,22,34,0.11)', accent: '#7048e8', accentSoft: '#f1ecff', soft: '#f7f8fc' }
const CHEV = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%237a7f8c' stroke-width='2.6' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")"
const S = {
  card: { border: `1px solid ${T.line}`, borderRadius: 14, padding: 14, background: '#fff', marginTop: 10, boxShadow: '0 1px 3px rgba(20,22,34,0.05)' },
  head: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 14, fontWeight: 700, color: T.ink, letterSpacing: -0.2 },
  add: { fontSize: 12.5, fontWeight: 600, padding: '6px 12px', border: 'none', borderRadius: 9, background: T.accent, color: '#fff', cursor: 'pointer', boxShadow: '0 1px 2px rgba(112,72,232,0.35)' },
  empty: { fontSize: 12, lineHeight: 1.5, color: T.sub, margin: 0 },
  chips: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  field: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 11 },
  lbl: { width: 54, flexShrink: 0, fontSize: 10.5, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase', color: T.sub },
  input: { flex: 1, minWidth: 0, fontSize: 13, padding: '8px 11px', border: `1px solid ${T.line}`, borderRadius: 9, background: '#fff', color: T.ink, outline: 'none' },
  select: { flex: 1, minWidth: 0, fontSize: 13, padding: '8px 26px 8px 11px', border: `1px solid ${T.line}`, borderRadius: 9, background: `#fff ${CHEV} no-repeat right 9px center`, color: T.ink, outline: 'none', cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none' },
  slider: { flex: 1, minWidth: 0, accentColor: T.accent, cursor: 'pointer' },
  val: { width: 40, textAlign: 'right', flexShrink: 0, fontSize: 12, fontWeight: 600, color: T.ink, fontVariantNumeric: 'tabular-nums' },
  swatch: (c) => ({ position: 'relative', width: 42, height: 30, borderRadius: 9, border: `1px solid ${T.line}`, background: c, cursor: 'pointer', flexShrink: 0, boxShadow: '0 1px 2px rgba(20,22,34,0.08)' }),
  swInput: { position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', border: 'none', padding: 0, margin: 0 },
  hex: { fontSize: 12, color: T.sub, fontFamily: "'JetBrains Mono', monospace", letterSpacing: -0.3 },
  actions: { display: 'flex', gap: 8, marginTop: 6 },
  rec: (on) => ({ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, padding: '9px 10px', borderRadius: 10, cursor: 'pointer', border: `1px solid ${on ? '#e0533b' : T.line}`, background: on ? '#ffece7' : '#fff', color: on ? '#e0533b' : T.ink }),
  del: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 40, borderRadius: 10, cursor: 'pointer', border: `1px solid ${T.line}`, background: '#fff', color: '#8a8f9c' },
  hint: { fontSize: 11, lineHeight: 1.5, color: T.sub, margin: '10px 0 0' },
}
const chip = (on) => ({ fontSize: 11.5, padding: '5px 11px', borderRadius: 20, cursor: 'pointer', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', border: `1px solid ${on ? T.accent : T.line}`, background: on ? T.accentSoft : '#fff', color: on ? T.accent : T.ink, fontWeight: on ? 600 : 500 })

const IconTrash = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
)

// OverlayEditor (Fase 3) — agregar/editar objetos overlay (texto) que se animan SOBRE el video. Tema claro, panel angosto.
// El posicionamiento y la grabacion del movimiento pasan en el PREVIEW (Craft engancha los pointer events del canvas).
export default function OverlayEditor({ overlays, selId, onSelect, onAdd, onPatch, onRemove, recording, onToggleRecord, duration }) {
  const sel = (overlays || []).find(o => o.id === selId)
  const dur = Math.max(1, duration || 12)
  const st = (sel && sel.style) || {}
  const color = st.color || '#ffffff'
  const animValue = sel && sel.anim?.kind === 'recorded' ? 'recorded' : (sel && sel.anim?.preset) || 'none'
  return (
    <div style={S.card}>
      <div style={S.head}>
        <span style={S.title}>Animaciones</span>
        <button onClick={onAdd} style={S.add}>+ Texto</button>
      </div>

      {(!overlays || !overlays.length) && (
        <p style={S.empty}>Agregá un texto para animarlo sobre el video (fade, deslizar, pop…) o grabá su movimiento arrastrándolo en el preview.</p>
      )}

      {overlays && overlays.length > 0 && (
        <div style={{ ...S.chips, marginBottom: sel ? 14 : 0 }}>
          {overlays.map(o => (
            <button key={o.id} onClick={() => onSelect(o.id)} title={o.text} style={chip(selId === o.id)}>
              {o.anim?.kind === 'recorded' ? '⦿ ' : ''}{o.text || '(texto)'}
            </button>
          ))}
        </div>
      )}

      {sel && (
        <div>
          <div style={S.field}>
            <span style={S.lbl}>Texto</span>
            <input value={sel.text} onChange={e => onPatch(sel.id, { text: e.target.value })} style={S.input} placeholder="Tu texto" />
          </div>

          <div style={S.field}>
            <span style={S.lbl}>Fuente</span>
            <select value={st.font || ''} onChange={e => onPatch(sel.id, { style: { font: e.target.value } })} style={{ ...S.select, fontFamily: st.font || undefined }}>
              <option value="">Inter · por defecto</option>
              {OVERLAY_FONTS.map(g => (
                <optgroup key={g.group} label={g.group}>
                  {g.items.map(([name, css]) => <option key={name} value={css} style={{ fontFamily: css }}>{name}</option>)}
                </optgroup>
              ))}
            </select>
          </div>

          <div style={S.field}>
            <span style={S.lbl}>Animación</span>
            <select value={animValue}
              onChange={e => { const v = e.target.value; if (v === 'recorded') return; onPatch(sel.id, { anim: { kind: v === 'none' ? 'none' : 'preset', preset: v === 'none' ? null : v, ease: sel.anim?.ease || 'suave', keyframes: null } }) }}
              style={S.select}>
              {OVERLAY_PRESETS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
              {sel.anim?.kind === 'recorded' && <option value="recorded">Movimiento grabado ✓</option>}
            </select>
          </div>

          <div style={S.field}>
            <span style={S.lbl}>Color</span>
            <label style={S.swatch(color)}>
              <input type="color" value={color} onChange={e => onPatch(sel.id, { style: { color: e.target.value } })} style={S.swInput} />
            </label>
            <span style={S.hex}>{color.toUpperCase()}</span>
          </div>

          <div style={S.field}>
            <span style={S.lbl}>Tamaño</span>
            <input type="range" min="24" max="140" value={st.size || 56} onChange={e => onPatch(sel.id, { style: { size: +e.target.value } })} style={S.slider} />
            <span style={S.val}>{st.size || 56}px</span>
          </div>

          <div style={S.field}>
            <span style={S.lbl}>Desde</span>
            <input type="range" min="0" max={Math.max(0.1, dur - 0.2)} step="0.1" value={Math.min(sel.startSec || 0, dur)} onChange={e => onPatch(sel.id, { startSec: +e.target.value })} style={S.slider} />
            <span style={S.val}>{(sel.startSec || 0).toFixed(1)}s</span>
          </div>

          <div style={S.field}>
            <span style={S.lbl}>Dura</span>
            <input type="range" min="0.4" max={dur} step="0.1" value={Math.min(sel.durSec || 2.5, dur)} onChange={e => onPatch(sel.id, { durSec: +e.target.value })} style={S.slider} />
            <span style={S.val}>{(sel.durSec || 0).toFixed(1)}s</span>
          </div>

          <div style={S.actions}>
            <button onClick={onToggleRecord} style={S.rec(recording)}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: recording ? '#e0533b' : T.accent, display: 'inline-block' }} />
              {recording ? 'Grabando… arrastrá en el preview' : 'Grabar movimiento'}
            </button>
            <button onClick={() => onRemove(sel.id)} title="Eliminar" style={S.del}><IconTrash /></button>
          </div>
          <p style={S.hint}>Arrastrá el objeto en el preview para posicionarlo. Con “Grabar”, arrastralo para grabar su recorrido.</p>
        </div>
      )}
    </div>
  )
}
