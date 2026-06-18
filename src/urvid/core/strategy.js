// urvid 1.0 · STRATEGY — el "cerebro" del director (v2). Analiza el CONTENIDO del brief (no solo la semilla) y
// decide la ESTRUCTURA: que arco narrativo tiene sentido y que escenas favorecer. Asi un brief con un dato grande
// abre con un numero, una pregunta abre con un hook de pregunta, una lista usa checklist, etc. PURO + DETERMINISTA
// (las señales salen del texto; el seed solo desempata/varia). El analisis REAL desde una URL (perception) es la
// pieza de PRODUCCION pendiente (engancha con backend/) y alimentaria estas mismas señales.
import { seedFor, shuffled } from './prng.js'

const NUM = /(?:^|[^\w])([+\-]?\$?\s?\d[\d.,]*\s?(?:%|x|k|mil|millones)?)/i

// analiza el contenido -> señales booleanas/numericas que guian la estructura.
export function analyzeContent(content = {}, rubro = 'default') {
  const claim = String(content.claim || '') , tag = String(content.tagline || ''), cta = String(content.cta || '')
  const all = [claim, tag, cta].filter(Boolean).join('  ')
  const head = claim || tag
  const items = head.split(/\s*[·•|\/\n]\s*|\s*,\s+/).map(s => s.trim()).filter(Boolean).length
  return {
    hasData: NUM.test(all),
    isQuestion: /\?|¿/.test(tag || claim),
    hasList: items >= 2,
    hasCompare: /\bvs\.?\b|antes|despu[eé]s|mejor que|m[aá]s que|menos que/i.test(all),
    hasProof: /opini[oó]n|estrella|clientes|rese[nñ]|rating|confian|recomien|\b[45][.,]\d\b|\b5\s*\/\s*5\b/i.test(all),
    longClaim: head.length > 42,
    items,
  }
}

// ARCO CONSCIENTE del contenido: apertura segun la señal dominante, 1-3 beats de cuerpo que matchean las señales
// (sin repetir), cierre. El seed desempata y agrega variedad cuando faltan señales.
export function buildArcSmart(seed, sig) {
  const r = seedFor(seed, 'arc')
  let open = 'openers/hero'
  if (sig.isQuestion) open = 'openers/hook'
  else if (sig.hasData && r() < 0.7) open = 'openers/hook'
  else if (r() < 0.28) open = 'openers/hook'
  // beats que pide el contenido (en orden de prioridad), sin repetir
  const want = []
  if (sig.hasData) want.push(r() < 0.5 ? 'data/single' : 'data/multi')
  if (sig.hasCompare) want.push('lists/comparison')
  if (sig.hasList && !sig.hasCompare) want.push('lists/checklist')
  if (sig.hasProof) want.push('social/proof')
  if (sig.longClaim || !want.length) want.push('statements/editorial')
  const body = []
  for (const c of want) if (body.indexOf(c) < 0 && body.length < 3) body.push(c)
  // completar hasta 1-3 beats con cuerpo variado (para que no sea siempre lo mismo)
  const filler = shuffled(r, ['statements/editorial', 'lists/checklist', 'data/single', 'social/proof', 'lists/comparison', 'data/multi'])
  const target = Math.max(body.length, 1 + (r() * 3 | 0))
  for (const c of filler) { if (body.length >= target || body.length >= 3) break; if (body.indexOf(c) < 0) body.push(c) }
  return [open, ...body.slice(0, 3), 'closers/outro']
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
