// templates · CONTENIDO — el director de slots. Un template autorado tiene capas de texto que son
// SLOTS TIPADOS ({ kind, maxChars, maxLines, maxItems }); esta capa rellena cada slot con el contenido
// generado del brief (claim/tagline/bullets/stats/cta/brand) RESPETANDO el tipo y las restricciones,
// y SIN REPETIR entre escenas (mata el bug del "Nodo" repetido). Determinista: mismo template+brief
// -> mismo resultado. Es la pieza que hace el template "parametrizable por marca".

const norm = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim()
const DANGLING = new Set(['y', 'e', 'o', 'u', 'de', 'del', 'la', 'el', 'los', 'las', 'a', 'al', 'en', 'con', 'para', 'por', 'que', 'tu', 'su', 'sus', 'un', 'una', 'mas', 'más', 'sin', 'se', 'lo', 'te', 'and', 'or', 'the', 'of', 'to', 'for', 'with', 'your'])
function cut(s, maxChars) {
  s = norm(s); if (!maxChars || s.length <= maxChars) return s
  const words = s.split(' '); const kept = []
  for (const w of words) { if ((kept.join(' ') + ' ' + w).trim().length > maxChars) break; kept.push(w) }
  while (kept.length > 1 && DANGLING.has(kept[kept.length - 1].toLowerCase().replace(/[.,:;!?]+$/, ''))) kept.pop()
  return (kept.join(' ') || s.slice(0, maxChars)).replace(/[,;:]+$/, '')
}

// resuelve TODOS los slots del template contra el brief. Devuelve scenes con layers que tienen
// `resolved` (string, o string[] para 'list', o {value,label} implicito para stat/statLabel).
export function resolveContent(template, brief) {
  const b = brief || {}
  const brand = norm(b.brand) || 'Marca'
  const claim = norm(b.claim), tagline = norm(b.tagline), cta = norm(b.cta) || 'Conocenos'
  const bullets = (b.bullets || []).map(norm).filter(Boolean)
  const stats = (b.stats || []).filter(s => s && (s.value != null))

  const used = new Set()                                    // strings ya usados (anti-repeticion)
  const mark = (s) => { if (s) used.add(s.toLowerCase()) }
  const isFree = (s) => s && !used.has(s.toLowerCase())
  const firstFree = (arr) => arr.find(isFree) || arr.find(Boolean) || ''
  let statIdx = 0

  const resolveSlot = (slot, sceneStat) => {
    const k = slot.kind
    let out
    if (k === 'brand') out = brand                          // la marca aparece SOLO donde el autor la puso
    else if (k === 'tagline') { out = tagline; mark(out) }
    else if (k === 'cta') out = cta
    else if (k === 'headline') { out = firstFree([claim, tagline, ...bullets]); mark(out) }
    else if (k === 'line') { out = firstFree([...bullets, tagline, claim]); mark(out) }
    else if (k === 'list') {
      const items = bullets.filter(isFree).slice(0, slot.maxItems || 4); items.forEach(mark)
      return items.map(x => cut(x, slot.maxChars || 30))     // string[]
    } else if (k === 'stat') out = sceneStat ? String(sceneStat.value) : ''
    else if (k === 'statLabel') out = sceneStat ? norm(sceneStat.label) : ''
    else out = firstFree([claim, tagline, ...bullets])
    return cut(out, slot.maxChars || 40)
  }

  const scenes = (template.scenes || []).map(sc => {
    // stat de la escena: si algun slot es stat, tomo el proximo sin usar (para que stat+statLabel casen)
    let sceneStat = null
    if ((sc.layers || []).some(l => l.slot && (l.slot.kind === 'stat' || l.slot.kind === 'statLabel'))) {
      sceneStat = stats[statIdx % Math.max(1, stats.length)] || null
      if (stats.length) statIdx++
    }
    const layers = (sc.layers || []).map(l => l.slot ? { ...l, resolved: resolveSlot(l.slot, sceneStat) } : l)
    return { ...sc, layers }
  })
  return { ...template, scenes }
}
