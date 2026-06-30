// urvid 1.0 · STRATEGY — el "cerebro" del director (v2). Analiza el CONTENIDO del brief (no solo la semilla) y
// decide la ESTRUCTURA: que arco narrativo tiene sentido y que escenas favorecer. Asi un brief con un dato grande
// abre con un numero, una pregunta abre con un hook de pregunta, una lista usa checklist, etc. PURO + DETERMINISTA
// (las señales salen del texto; el seed solo desempata/varia). El analisis REAL desde una URL (perception) es la
// pieza de PRODUCCION pendiente (engancha con backend/) y alimentaria estas mismas señales.
import { seedFor, shuffled } from './prng.js'

const NUM = /(?:^|[^\w])([+\-]?\$?\s?\d[\d.,]*\s?(?:%|x|k|mil|millones)?)/i
// SEÑALES de AUDIENCIA en el copy (es-AR): URGENCIA/escasez (mueve el arco al gancho y favorece CTA), NAMING explicito
// del publico (habla directo -> favorece statement editorial), y VALENCIA (un dolor nombrado tambien es gancho).
const URGENCY = /\b(ya|ahora|hoy|urgent|aprovech|[uú]ltim[oa]s?|qued[ae]n|cupos?|vence|solo por|solo hoy|por tiempo|no te lo pierdas|apur|oferta|descuent|promo|rebaja|liquidaci|gratis|antes de que|termina)\b/i
const AUD_NAMED = /\b(para vos|para ti|para tu|para empresas|para pymes|para profesionales|para mam[aá]s|para emprendedores|pensado para|dise[nñ]ad[oa] para|ideal para|si sos|si ten[eé]s|para due[nñ]os|para tu negocio)\b/i
const POS = /\b(mejor|f[aá]cil|r[aá]pid|gratis|incre[ií]ble|[eé]xito|libre|feliz|ahorr|simpl|disfrut|crec[eé])\b/i
const NEG = /\b(problema|dolor|cansad|hart[oa]|perd[eé]?s?|error|dif[ií]cil|estr[eé]s|complic|frustr|miedo|riesgo|basta de|deja de|olvidate de|sin m[aá]s vueltas)\b/i

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
    isQuestion: /\?|¿/.test(claim) || /\?|¿/.test(tag),   // BUG fix: `tag || claim` ignoraba la pregunta del CLAIM cuando habia tagline -> ahora ve AMBOS
    hasList: bullets.length >= 2 || split >= 2,
    hasCompare: /\bvs\.?\b|antes|despu[eé]s|mejor que|m[aá]s que|menos que/i.test(all),
    hasProof: !!proof,   // SOLO con testimonio real de la perception. El heuristico por texto invitaba a reciclar el claim como "resena" (falso).
    longClaim: head.length > 42,
    urgency: URGENCY.test(all),               // oferta/escasez -> abre con gancho y favorece la escena de CTA/cierre
    audienceNamed: AUD_NAMED.test(all),       // "para vos/empresas/..." -> habla directo, favorece statement editorial
    valence: NEG.test(all) ? 'neg' : (POS.test(all) ? 'pos' : 'neu'),   // un DOLOR nombrado (neg) tambien es gancho
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
  const hookProb = Math.max(0.5 * (1 - seriousness), (sig.hasCompare || sig.longClaim || sig.urgency || sig.valence === 'neg') ? 0.5 : 0)
  if (sig.isQuestion) open = 'openers/hook'
  // AUDIENCIA: si el publico aun NO busca (unaware) o recien SIENTE el problema, hay que ENGANCHAR fuerte / nombrar el dolor -> hook.
  else if (awareness === 'unaware' || awareness === 'problem') open = 'openers/hook'
  else if (sig.hasData && r() < 0.7) open = 'openers/hook'
  else if (r() < hookProb) open = 'openers/hook'
  // Un DATO SIEMPRE abre con numero (gran gancho): override de la DECISION, no de la secuencia -> no re-rollea el cuerpo.
  if (sig.hasData) open = 'openers/hook'
  // OPENER editorial (PURO, sin r() -> no re-rollea el cuerpo): claim editorial fuerte para publico que YA conoce la marca
  // (most/product) o nombrado explicito -> abrir con STATEMENT en vez de hero generico. Solo re-proposita el HERO default
  // (nunca roba un hook: question/data/unaware/problem/urgency conservan prioridad).
  if (open === 'openers/hero' && sig.longClaim && (awareness === 'most' || awareness === 'product' || sig.audienceNamed)) open = 'statements/editorial'
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
  const finalBody = body.slice(0, bodyCap)
  // CONNECTOR/INTERSTITIAL: un beat-PUENTE de una palabra entre dos beats de cuerpo (activa una categoria que existia
  // pero el arco nunca usaba). PRNG de NAMESPACE separado ('arc-conn') -> sus draws NO mueven la secuencia 'arc' (el
  // cuerpo NO se re-rollea, mismo brief+seed = mismo arco). Solo con >=2 body y duracion != corto (no infla el corto).
  if (finalBody.length >= 2 && duration !== 'corto') {
    const conn = seedFor(seed, 'arc-conn')
    if (conn() < 0.5) { const at = 1 + (conn() * (finalBody.length - 1) | 0); finalBody.splice(at, 0, 'connectors/interstitial') }
  }
  // si el opener se volvio statement, sacar el editorial REDUNDANTE que want.unshift agrego al cuerpo (finalBody tiene a lo
  // sumo UN editorial por los guards body.indexOf<0) -> el filter quita exactamente ese 1 lider. Op pura post-r() (sin re-roll).
  const ob = (open === 'statements/editorial') ? finalBody.filter((c, i, a) => !(c === 'statements/editorial' && a.indexOf(c) === i)) : finalBody
  const seq = [open, ...ob]
  // MID-ROLL CTA: para publico con URGENCIA o muy consciente (most/product), un empujon de CTA ANTES del cierre final.
  // ADITIVO (no reemplaza beats de texto) y SIN consumir r() (decision pura sobre booleanos) -> no re-rollea el cuerpo.
  const ctaUrgent = sig.urgency || awareness === 'most' || awareness === 'product'
  if (ctaUrgent && duration !== 'corto' && seq.length >= 3) seq.push('closers/outro')
  return [...seq, 'closers/outro']
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
  { on: s => s.urgency, tags: ['cta', 'cierre', 'gancho', 'oferta', 'urgencia', 'ya', 'promo', 'descuento'], boost: 1.8 },   // oferta/escasez -> escenas de CTA/cierre fuertes
  { on: s => s.audienceNamed, tags: ['editorial', 'mensaje', 'masivo', 'mega-tipografia', 'statement'], boost: 1.4 },        // habla directo al publico -> statement editorial
]
export function sceneBias(mod, sig) {
  let b = 1
  const tags = mod.tags || []
  for (const rule of RULES) if (rule.on(sig) && tags.some(t => rule.tags.indexOf(t) >= 0)) b *= rule.boost
  return b
}

// SESGO de ATMOSFERA/SUBSTRATE por señales del contenido (analogo a sceneBias, sobre las capas de fondo). Urgencia ->
// mas ENERGICO; dolor(neg) -> sombrio; positivo -> calido; dato -> tecnico/editorial; audiencia-nombrada/claim-largo ->
// editorial + LEGIBILIDAD (que se boostea TAMBIEN con urgencia -> el CTA urgente no pierde el scrim). SOLO boosts (>=1):
// nunca penaliza, asi los guards de legibilidad jamas pierden peso relativo (APCA intacto). Tags REALES de las libs.
const ATMO_SUB_RULES = [
  { on: s => s.urgency, tags: ['volumetrico', 'destello', 'rayos', 'flare', 'barrido', 'spotlight', 'teal-orange', 'glow', 'estrella', 'tv', 'estatica'], boost: 1.7 },
  { on: s => s.valence === 'neg', tags: ['sombra', 'nocturno', 'desaturado', 'contraste', 'gobo', 'craquelado', 'desgaste', 'manchas', 'grabado'], boost: 1.6 },
  { on: s => s.valence === 'pos', tags: ['calido', 'bokeh', 'glow', 'destello', 'premium', 'vintage', 'analogico', 'cuero'], boost: 1.5 },
  { on: s => s.hasData, tags: ['enmarque', 'grounding', 'piso', 'tecnico', 'digital', 'celdas', 'maquetacion', 'isometrico', 'guilloche', 'billete', 'seguridad'], boost: 1.5 },
  { on: s => s.hasCompare, tags: ['lateral', 'vertical', 'diagonal', 'persiana', 'celdas', 'isometrico', 'maquetacion'], boost: 1.3 },
  { on: s => s.valence === 'pos' || s.audienceNamed, tags: ['premium', 'cuero', 'tela', 'print', 'papel'], boost: 1.25 },
  { on: s => s.urgency || s.longClaim || s.audienceNamed, tags: ['legibilidad', 'guard', 'vineta', 'foco', 'titulo', 'caption', 'editorial'], boost: 1.35 },
]
export function atmoSubBias(mod, sig) {
  let b = 1
  const tags = mod.tags || []
  for (const rule of ATMO_SUB_RULES) if (rule.on(sig) && tags.some(t => rule.tags.indexOf(t) >= 0)) b *= rule.boost
  return b
}

// SESGO de COLOR por la ENERGIA del copy: dos marcas del mismo rubro+brandColor parecido pero con copy de energia
// OPUESTA (urgencia/oferta vs sobrio) divergen su esquema de color -> diferenciacion CORRELACIONADA con el contenido,
// no solo ruido de semilla. Solo-boost (>=1, finalize() sigue gateando onAccent), PURO sobre sig (sin r()). Tags reales
// de libs/color/*. Desempate fino (<=1.5) como hueAffinity/bgTempAffinity, no un rediseño del scorer.
const COLOR_ENERGY_TAGS = ['vibrante', 'contraste', 'audaz', 'colorido', 'complementario', 'pop', 'energico', 'neon', 'electrico']
const COLOR_SOBER_TAGS = ['suave', 'sobrio', 'minimal', 'neutro', 'mono', 'cohesivo', 'calmo', 'tonal']
export function colorEnergyBias(mod, sig) {
  if (!sig) return 1
  const tags = mod.tags || []
  const energetic = sig.urgency || sig.valence === 'pos' || sig.valence === 'neg'
  const want = energetic ? COLOR_ENERGY_TAGS : COLOR_SOBER_TAGS
  return tags.some(t => want.indexOf(t) >= 0) ? (energetic ? 1.5 : 1.3) : 1
}

// SESGO de color/tipografia por REGISTER 'warm': warm es ORTOGONAL a la seriedad, pero el nudge register->seriousness lo
// COLAPSA con casual (ambos solo bajan seriousness) -> se pierde la calidez humanista. Este bias rescata esa calidez
// (esquemas/pairings calidos/humanos) SOLO para register warm. Solo-boost (>=1, techo 1.4 como colorEnergyBias). PURO.
const WARM_TAGS = ['calido', 'humano', 'amigable', 'organico', 'terroso', 'suave', 'redondo']
export function audienceWarmBias(mod, register) {
  if (register !== 'warm') return 1
  const tags = (mod && mod.tags) || []
  return tags.some(t => WARM_TAGS.indexOf(t) >= 0) ? 1.4 : 1
}
