// urvid 1.0 · STRATEGY — el "cerebro" del director (v2). Analiza el CONTENIDO del brief (no solo la semilla) y
// decide la ESTRUCTURA: que arco narrativo tiene sentido y que escenas favorecer. Asi un brief con un dato grande
// abre con un numero, una pregunta abre con un hook de pregunta, una lista usa checklist, etc. PURO + DETERMINISTA
// (las señales salen del texto; el seed solo desempata/varia). El analisis REAL desde una URL (perception) es la
// pieza de PRODUCCION pendiente (engancha con backend/) y alimentaria estas mismas señales.
import { seedFor, shuffled } from './prng.js'

const NUM = /(?:^|[^\w])([+\-]?\$?\s?\d[\d.,]*\s?(?:%|x|k|mil|millones)?)/i

// analiza el contenido -> señales booleanas/numericas que guian la estructura.
export function analyzeContent(content = {}, rubro = 'default') {
  const claim = String(content.claim || ''), tag = String(content.tagline || ''), cta = String(content.cta || '')
  const all = [claim, tag, cta].filter(Boolean).join('  ')
  const head = claim || tag
  // material SELECCIONADO por la perception (mas confiable que partir el texto): bullets/stats/proof.
  const bullets = Array.isArray(content.bullets) ? content.bullets.filter(Boolean) : []
  const stats = Array.isArray(content.stats) ? content.stats.filter(Boolean) : []
  const proof = String(content.proof || '')
  const split = head.split(/\s*[·•|\/\n]\s*|\s*,\s+/).map(s => s.trim()).filter(Boolean).length
  const items = bullets.length || split
  return {
    hasData: stats.length > 0 || NUM.test(all),
    isQuestion: /\?|¿/.test(tag || claim),
    hasList: bullets.length >= 2 || split >= 2,
    hasCompare: /\bvs\.?\b|antes|despu[eé]s|mejor que|m[aá]s que|menos que/i.test(all),
    hasProof: !!proof,   // SOLO con testimonio real de la perception. El heuristico por texto invitaba a reciclar el claim como "resena" (falso).
    longClaim: head.length > 42,
    items,
  }
}

// ARCO CONSCIENTE del contenido: apertura segun la señal dominante, 1-3 beats de cuerpo que matchean las señales
// (sin repetir), cierre. El seed desempata y agrega variedad cuando faltan señales.
export function buildArcSmart(seed, sig, awareness = 'solution', seriousness = 0.5, duration = 'medio') {
  const r = seedFor(seed, 'arc')
  let open = 'openers/hero'
  // GARANTIA hook-2.5s + dirigido al publico: la SERIEDAD modula cuanto se arriesga a abrir con gancho (serio->hero
  // medido/creible; relajado->gancho directo). Promesa/dolor (claim con cuerpo o comparacion) sube la prob de gancho aun
  // en rubros serios REUSANDO el mismo draw del else-if final (no consume PRNG extra -> el cuerpo del arco queda IGUAL).
  const hookProb = Math.max(0.5 * (1 - seriousness), (sig.hasCompare || sig.longClaim) ? 0.5 : 0)
  if (sig.isQuestion) open = 'openers/hook'
  // AUDIENCIA: si el publico aun NO busca (unaware) o recien SIENTE el problema, hay que ENGANCHAR fuerte / nombrar el dolor -> hook.
  else if (awareness === 'unaware' || awareness === 'problem') open = 'openers/hook'
  else if (sig.hasData && r() < 0.7) open = 'openers/hook'
  else if (r() < hookProb) open = 'openers/hook'
  // Un DATO SIEMPRE abre con numero (gran gancho): override de la DECISION, no de la secuencia -> no re-rollea el cuerpo.
  if (sig.hasData) open = 'openers/hook'
  // beats que pide el contenido (en orden de prioridad), sin repetir
  const want = []
  if (sig.hasData) want.push(r() < 0.5 ? 'data/single' : 'data/multi')
  if (sig.hasCompare) want.push('lists/comparison')
  if (sig.hasList && !sig.hasCompare) want.push('lists/checklist')
  if (sig.hasProof) want.push('social/proof')
  // SIEMPRE garantizar un beat de MENSAJE (statement/checklist): un video no puede ser SOLO numeros/datos/proof
  // (eso se veia como "una escena con un numero y nada mas"). Si no hay beat de texto, anteponemos el statement.
  const hasText = c => c === 'statements/editorial' || c === 'lists/checklist'
  if (sig.longClaim || !want.length || !want.some(hasText)) want.unshift('statements/editorial')
  const body = []
  for (const c of want) if (body.indexOf(c) < 0 && body.length < 3) body.push(c)
  // completar hasta 1-3 beats con cuerpo variado. SOLO beats de TEXTO (derivan del claim/tagline real): los beats
  // de data/proof/comparison salen UNICAMENTE de `want` (señales reales) -> el director nunca rellena con un grafico
  // o un testimonio cuando no hay datos que mostrar (eso obligaba a las escenas a fabricar numeros/citas).
  // DURACION 'corto' alcanzable: el cuerpo se acota a 1 beat (arco de 3: opener+1+outro -> el target ~8s se logra).
  // bodyCap se aplica DESPUES de consumir los mismos draws de r() (shuffled/target abajo) -> medio/largo byte-identicos.
  const bodyCap = duration === 'corto' ? 1 : 3
  const filler = shuffled(r, ['statements/editorial', 'lists/checklist'])
  const target = Math.min(bodyCap, Math.max(body.length, 1 + (r() * 3 | 0)))
  for (const c of filler) { if (body.length >= target || body.length >= bodyCap) break; if (body.indexOf(c) < 0) body.push(c) }
  return [open, ...body.slice(0, bodyCap), 'closers/outro']
}

// SESGO de eleccion de escena por señales: boost a los modulos cuyos tags matchean el contenido (un beat de hook
// con una pregunta favorece hook.question; con un dato favorece hook.bignum/shockstat; etc).
const RULES = [
  { on: s => s.isQuestion, tags: ['pregunta', 'binaria', 'gancho'], boost: 3 },
  { on: s => s.hasData, tags: ['dato', 'numero', 'estadistica', 'kpi', 'stat', 'shock', 'mono'], boost: 2.4 },
  { on: s => s.hasCompare, tags: ['comparacion', 'vs', 'antes-despues', 'balanza', 'split'], boost: 2.6 },
  { on: s => s.hasList, tags: ['lista', 'checklist', 'pasos', 'grilla'], boost: 2 },
  { on: s => s.hasProof, tags: ['prueba-social', 'rating', 'estrellas', 'cita', 'logos'], boost: 2.4 },
  { on: s => s.longClaim, tags: ['mega-tipografia', 'editorial', 'masivo'], boost: 1.6 },
]
export function sceneBias(mod, sig) {
  let b = 1
  const tags = mod.tags || []
  for (const rule of RULES) if (rule.on(sig) && tags.some(t => rule.tags.indexOf(t) >= 0)) b *= rule.boost
  return b
}
