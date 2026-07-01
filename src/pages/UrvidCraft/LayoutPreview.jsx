import { get, arrange, setFormat } from '../../urvid/index.js'
import { shortId } from './craftLib.js'
import styles from './UrvidCraftStudio.module.css'

// WIREFRAME de composicion (item L584): a diferencia de EffectPreview (que pinta el VIDEO real, donde la diferencia
// ESPACIAL entre presets de layout casi no se percibe), esto dibuja las CAJAS de los slots -> la eleccion de layout
// pasa a ser CONSCIENTE (el usuario ve donde caen kicker/titulo/cuerpo/CTA segun align/anchor/side/gap del preset).
const REQ = [{ id: 'k', kind: 'kicker' }, { id: 't', kind: 'title' }, { id: 'b', kind: 'body' }, { id: 'c', kind: 'cta' }]
const KIND = {
  kicker: { c: '#a78bfa', l: 'kicker' }, title: { c: '#60a5fa', l: 'título' },
  body: { c: '#94a3b8', l: 'cuerpo' }, cta: { c: '#4ade80', l: 'CTA' },
}

// cajas del preset en 9:16 (el wireframe se ve como un reel; el align/anchor/side/gap se aprecia igual en cualquier formato).
// arrange lee W/H globales -> forzamos 9:16 justo antes (SINCRONO; el rAF del preview del video re-setea su formato en su
// proximo drawFrame). Puro y determinista, sin PRNG.
function boxesFor(id) {
  try {
    setFormat('9:16')
    const mod = id ? get(id) : null
    const lay = (mod && typeof mod.make === 'function') ? mod.make() : null
    return lay ? lay.arrange(REQ) : arrange(REQ, {})
  } catch { return null }
}

export default function LayoutPreview({ options, selectedId, onPick }) {
  const out = boxesFor(selectedId)
  const VW = 405, VH = 720
  return (
    <div className={styles.effectWrap}>
      <div className={styles.lpStage}>
        <svg viewBox={`0 0 ${VW} ${VH}`} className={styles.lpSvg} preserveAspectRatio="xMidYMid meet">
          <rect x="1.5" y="1.5" width={VW - 3} height={VH - 3} rx="16" className={styles.lpFrame} />
          {out && ['k', 't', 'b', 'c'].map(k => {
            const s = out[k]; if (!s) return null
            const K = KIND[s.kind] || KIND.body
            const tx = s.align === 'left' ? s.x + 12 : s.align === 'right' ? s.x + s.w - 12 : s.cx
            const anchor = s.align === 'left' ? 'start' : s.align === 'right' ? 'end' : 'middle'
            return (
              <g key={k}>
                <rect x={s.x} y={s.y} width={s.w} height={s.h} rx="7" fill={K.c} fillOpacity="0.16" stroke={K.c} strokeWidth="2.5" />
                <text x={tx} y={s.cy + 7} textAnchor={anchor} fill={K.c} fontSize="21" fontWeight="700" fontFamily="system-ui, sans-serif">{K.l}</text>
              </g>
            )
          })}
        </svg>
      </div>
      <p className={styles.lpHint}>Dónde caen los bloques (kicker · título · cuerpo · CTA) según la composición elegida.</p>
      <div className={styles.effectChips}>
        {options.map(m => (
          <button key={m.id} type="button" className={`${styles.effectChip} ${selectedId === m.id ? styles.effectChipOn : ''}`} onClick={() => onPick(m.id)} title={m.id}>{shortId(m.id)}</button>
        ))}
      </div>
    </div>
  )
}
