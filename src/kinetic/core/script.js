// kinetic 1.0 · GUION — brief -> beats de manifiesto. Biblioteca de PLANTILLAS RETORICAS (no generacion
// libre: eso ya fallo). Cada plantilla exige materia prima del brief (bullets/stats/imagenes); si no la hay
// pesa 0. MANIFIESTO siempre es viable (fallback garantizado). El texto se recorta por PALABRA a presupuestos
// punch (el genero vive de frases cortas gigantes) — el fit de dibujo es la red final, esto es la primera.
import { seedFor, weightedPick, pick } from './prng.js'

// conectores que NO pueden quedar colgando al final de un fragmento ("Lecciones cortas y" delata al robot)
const DANGLING = new Set(['y', 'e', 'o', 'u', 'de', 'del', 'la', 'el', 'los', 'las', 'a', 'al', 'en', 'con', 'para', 'por', 'que', 'tu', 'su', 'sus', 'un', 'una', 'mas', 'más', 'sin', 'se', 'lo', 'te', 'and', 'or', 'the', 'of', 'to', 'for', 'with', 'your'])
const cut = (s, maxChars) => {
  s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim()
  if (s.length <= maxChars) return s
  const words = s.split(' '); let kept = []
  for (const w of words) { if ((kept.join(' ') + ' ' + w).trim().length > maxChars) break; kept.push(w) }
  while (kept.length > 1 && DANGLING.has(kept[kept.length - 1].toLowerCase().replace(/[.,:;!?]+$/, ''))) kept.pop()
  return kept.join(' ') || s.slice(0, maxChars)
}
const B = { hook: 34, line: 26, breath: 16, cta: 22, stat: 8, statLabel: 20, photo: 24 }

// beat = { role: hook|line|photo|stat|breath|cta, text, sub?, durBeats }
const TEMPLATES = [
  {
    id: 'manifiesto', weight: () => 1,                        // SIEMPRE viable
    build(brief, r) {
      const frags = []
      const hook = brief.claim || brief.tagline || brief.brand
      frags.push({ role: 'hook', text: cut(hook, B.hook), durBeats: 5 })
      const pool = [brief.tagline, ...(brief.bullets || [])].filter(x => x && cut(x, B.line) !== cut(hook, B.line))
      for (const b of pool.slice(0, 3)) frags.push({ role: 'line', text: cut(b, B.line), durBeats: 3 })
      return frags
    },
  },
  {
    id: 'enumeracion', weight: b => ((b.bullets || []).length >= 2 ? 1.2 : 0),
    build(brief, r) {
      const frags = [{ role: 'hook', text: cut(brief.claim || brief.tagline || brief.brand, B.hook), durBeats: 5 }]
      for (const b of (brief.bullets || []).slice(0, 3)) frags.push({ role: 'line', text: cut(b, B.line), durBeats: 3 })
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
        ...(brief.bullets && brief.bullets.length ? [{ role: 'line', text: cut(brief.bullets[0], B.line), durBeats: 3 }] : []),
      ]
    },
  },
  {
    id: 'contraste', weight: b => (b.tagline && b.claim && cut(b.tagline, 40) !== cut(b.claim, 40) ? 1.15 : 0),
    build(brief, r) {
      return [
        { role: 'hook', text: cut(brief.tagline, B.hook), durBeats: 4 },
        { role: 'breath', text: '', durBeats: 3 },
        { role: 'line', text: cut(brief.claim, B.hook), durBeats: 4, slam: true },
        ...(brief.bullets && brief.bullets.length ? [{ role: 'line', text: cut(brief.bullets[0], B.line), durBeats: 3 }] : []),
      ]
    },
  },
]

export function buildScript(brief, seed, dna) {
  const r = seedFor(seed, 'kin.script')
  const tpl = weightedPick(r, TEMPLATES, t => t.weight(brief))
  let beats = tpl.build(brief, r)

  // beat de FOTO (token inline o collage, decide el casting) si el sitio dio imagenes
  const imgs = (brief.images || []).filter(Boolean)
  if (imgs.length >= 1) {
    const txt = cut(brief.tagline && tpl.id !== 'contraste' ? brief.tagline : (brief.bullets || [])[1] || brief.brand, B.photo)
    beats.splice(Math.min(beats.length, 2 + ((r() * 2) | 0)), 0, { role: 'photo', text: txt, durBeats: 4 })
  }
  // respiro en la posicion del DNA (si la plantilla no trajo uno)
  if (!beats.some(b => b.role === 'breath')) {
    const at = Math.max(1, Math.min(beats.length - 1, Math.round(beats.length * dna.breathPos)))
    beats.splice(at, 0, { role: 'breath', text: '', durBeats: 3 })
  }
  // cierre SIEMPRE: CTA + marca
  beats.push({ role: 'cta', text: cut(brief.cta || 'Conocenos', B.cta), sub: brief.brand, durBeats: 5 })
  return { templateId: tpl.id, beats }
}
