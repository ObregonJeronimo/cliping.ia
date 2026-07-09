// aemotion 0.1 · GUION — brief -> beats retoricos. Plantillas curadas (no generacion libre); cada una
// exige materia prima del brief o pesa 0; MANIFIESTO siempre viable. Texto recortado por PALABRA a
// presupuestos punch (frases cortas gigantes) — el fit de dibujo es la red final.
import { seedFor, weightedPick, pick } from './prng.js'

const DANGLING = new Set(['y', 'e', 'o', 'u', 'de', 'del', 'la', 'el', 'los', 'las', 'a', 'al', 'en', 'con', 'para', 'por', 'que', 'tu', 'su', 'sus', 'un', 'una', 'mas', 'más', 'sin', 'se', 'lo', 'te', 'and', 'or', 'the', 'of', 'to', 'for', 'with', 'your'])
const cut = (s, maxChars) => {
  s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim()
  if (s.length <= maxChars) return s
  const words = s.split(' '); let kept = []
  for (const w of words) { if ((kept.join(' ') + ' ' + w).trim().length > maxChars) break; kept.push(w) }
  while (kept.length > 1 && DANGLING.has(kept[kept.length - 1].toLowerCase().replace(/[.,:;!?]+$/, ''))) kept.pop()
  return (kept.join(' ') || s.slice(0, maxChars)).replace(/[,;:]+$/, '')   // sin puntuacion colgante
}
const B = { hook: 32, line: 26, cta: 22, stat: 8, statLabel: 20 }

// beat = { role: hook|line|stat|breath|cta, text, sub?, durBeats }
const TEMPLATES = [
  {
    id: 'manifiesto', weight: () => 1,
    build(brief) {
      const hook = brief.claim || brief.tagline || brief.brand
      const frags = [{ role: 'hook', text: cut(hook, B.hook), durBeats: 5 }]
      const pool = [brief.tagline, ...(brief.bullets || [])].filter(x => x && cut(x, B.line) !== cut(hook, B.line))
      // dwell de lectura (research legibility): lineas 4 beats (~2.4-2.9s), no 3 (~1.4-2s quedaba corto)
      for (const b of pool.slice(0, 3)) frags.push({ role: 'line', text: cut(b, B.line), durBeats: 4 })
      return frags
    },
  },
  {
    id: 'enumeracion', weight: b => ((b.bullets || []).length >= 2 ? 1.2 : 0),
    build(brief) {
      const frags = [{ role: 'hook', text: cut(brief.claim || brief.tagline || brief.brand, B.hook), durBeats: 5 }]
      for (const b of (brief.bullets || []).slice(0, 3)) frags.push({ role: 'line', text: cut(b, B.line), durBeats: 4 })
      return frags
    },
  },
  {
    id: 'stat-punch', weight: b => ((b.stats || []).length ? 1.3 : 0),
    build(brief, r) {
      const st = pick(r, brief.stats)
      return [
        { role: 'hook', text: cut(brief.claim || brief.tagline || brief.brand, B.hook), durBeats: 5 },
        { role: 'stat', text: cut(st.value, B.stat), sub: cut(st.label, B.statLabel), durBeats: 5 },
        ...(brief.bullets && brief.bullets.length ? [{ role: 'line', text: cut(brief.bullets[0], B.line), durBeats: 4 }] : []),
      ]
    },
  },
  {
    id: 'contraste', weight: b => (b.tagline && b.claim && cut(b.tagline, 40) !== cut(b.claim, 40) ? 1.15 : 0),
    build(brief) {
      return [
        { role: 'hook', text: cut(brief.tagline, B.hook), durBeats: 4 },
        { role: 'breath', text: '', durBeats: 2 },
        { role: 'line', text: cut(brief.claim, B.hook), durBeats: 4, slam: true },
        ...(brief.bullets && brief.bullets.length ? [{ role: 'line', text: cut(brief.bullets[0], B.line), durBeats: 4 }] : []),
      ]
    },
  },
]

export function buildScript(brief, seed, dna) {
  const r = seedFor(seed, 'am.script')
  const tpl = weightedPick(r, TEMPLATES, t => t.weight(brief))
  const beats = tpl.build(brief, r)
  // beat de FOTO si el sitio dio imagenes (la escena degrada a tipografia si no cargan)
  const imgs = (brief.images || []).filter(Boolean)
  if (imgs.length >= 1) {
    const txt = cut(brief.tagline && tpl.id !== 'contraste' ? brief.tagline : (brief.bullets || [])[1] || brief.brand, B.line)
    beats.splice(Math.min(beats.length, 2 + ((r() * 2) | 0)), 0, { role: 'photo', text: txt, durBeats: 4 })
  }
  if (!beats.some(b => b.role === 'breath')) {
    const at = Math.max(1, Math.min(beats.length - 1, Math.round(beats.length * dna.breathPos)))
    beats.splice(at, 0, { role: 'breath', text: '', durBeats: 2 })   // corto: es un sting, no una escena
  }
  beats.push({ role: 'cta', text: cut(brief.cta || 'Conocenos', B.cta), sub: brief.brand, durBeats: 5 })
  return { templateId: tpl.id, beats }
}
