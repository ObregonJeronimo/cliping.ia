// urvid 1.0 · ASSEMBLE — el DIRECTOR. Dado un BRIEF (lo que el analisis de la pagina + el LLM producen), arma el
// VIDEO eligiendo de las bibliotecas: paleta, fuentes, un fondo, capas y una secuencia de escenas por BEAT narrativo.
// Determinista por semilla. Devuelve un objeto VIDEO que render.js dibuja.
// SELECCION (v3): el rubro YA NO es un filtro DURO (dejaba modulos de nicho muertos y colaba '*' en briefs serios);
// ahora cada slot se ELIGE con un SCORER SUAVE (core/fit.js) que matchea rubro + register(vibe) + intensity contra el
// brief. El unico filtro duro es el TONO. Asi deja de usar piezas que no pegan sin perder variedad.
// TONO = SOLO COLOR: si el brief trae lockRecipe (el toggle claro/oscuro del estudio), se REUSA la receta y solo se
// re-deriva la paleta; un slot se re-elige unicamente si su modulo no soporta el tono nuevo.
import { derivePalette } from './palette.js'
import { FORMATS, clamp } from './util.js'
import { query, get } from './registry.js'
import { seedFor, weightedPick, hashStr, stableSeed, pick, shuffled } from './prng.js'
import { deriveFonts } from './fonts.js'
import { analyzeContent, buildArcSmart, sceneBias } from './strategy.js'
import { fitWeight, canonRubro } from './fit.js'
import { fitContent } from './script.js'
import LOTTIE from '../lottie/manifest.js'

// ARCO narrativo VARIADO por semilla: apertura (hook|hero) -> 1-3 beats de cuerpo SIN repetir -> cierre. Usa todas
// las categorias de escena disponibles -> dos videos no comparten estructura (no siempre hero->statement->outro).
const _DUR = { 'openers/hero': 4.0, 'openers/hook': 3.2, 'statements/editorial': 3.4, 'lists/checklist': 3.9, 'lists/comparison': 3.6, 'data/single': 3.0, 'data/multi': 3.6, 'social/proof': 3.4, 'closers/outro': 3.6 }
function buildArc(seed) {
  const r = seedFor(seed, 'arc')
  const open = pick(r, ['openers/hero', 'openers/hero', 'openers/hook'])
  const body = ['statements/editorial', 'lists/checklist', 'lists/comparison', 'data/single', 'data/multi', 'social/proof']
  const n = 1 + (r() * 3 | 0)
  const cats = [open, ...shuffled(r, body).slice(0, n), 'closers/outro']
  return cats.map(c => ({ category: c, dur: _DUR[c] || 3.4 }))
}

// RUTEO de ANIM por concepto: mapea palabras-clave del contenido (es) + el rubro -> set de conceptos candidatos.
// Asi el director elige una animacion por NECESIDAD (un brief de compras -> carrito; de finanzas -> crecimiento).
const _ANIM_KW = {
  cart: ['compr', 'carrito', 'tienda', 'pedido', 'ecommerce', 'shop', 'venta'],
  rating: ['recomien', 'estrella', 'resena', 'reseña', 'review', 'valora', 'rating', 'punta'],
  growth: ['crec', 'aument', 'result', 'mejora', 'productiv', 'ahorr', 'escala', 'mas resultados'],
  trend: ['tendenc', 'subir', 'sube', 'rendi', 'invers', 'gana', 'roi'],
  chat: ['chat', 'mensaj', 'conversa', 'consulta', 'contact', 'hablar', 'respond', 'whatsapp'],
  send: ['envi', 'manda', 'entrega', 'rapido', 'al instante'],
  notify: ['avis', 'novedad', 'noticia', 'alert', 'recorda', 'enterate'],
  search: ['busc', 'encontr', 'descubr', 'explora', 'filtr'],
  secure: ['segur', 'proteg', 'privac', 'confia', 'garant', 'encript', 'respald'],
  toggle: ['activ', 'encend', 'automat', 'configura', 'simple'],
  network: ['conect', 'integra', 'equipo', ' red ', 'colabora', 'sincron', 'plataforma'],
  check: ['list', 'confirm', 'complet', 'verifica', 'aprob', 'check', 'sin vueltas'],
}
const _RUBRO_CONCEPTS = {
  finanzas: ['growth', 'trend', 'secure', 'check'], tech: ['network', 'toggle', 'growth', 'search'],
  inmobiliaria: ['search', 'check', 'secure'], salud: ['check', 'secure', 'chat'],
  educacion: ['check', 'search', 'growth'], gastronomia: ['rating', 'cart', 'send'],
  moda: ['cart', 'rating', 'send'], belleza: ['rating', 'cart', 'check'], fitness: ['growth', 'check', 'rating'],
  default: ['check', 'chat', 'growth'],
}
function routeAnimConcepts(content, rubro) {
  const text = [content.tagline, content.claim, content.cta, ...(Array.isArray(content.bullets) ? content.bullets : [])].filter(Boolean).join(' ').toLowerCase()
  const hits = []
  for (const concept in _ANIM_KW) if (_ANIM_KW[concept].some(k => text.indexOf(k) >= 0)) hits.push(concept)
  return new Set(hits.length ? hits : (_RUBRO_CONCEPTS[rubro] || _RUBRO_CONCEPTS.default))
}

export function makeVideo(brief = {}) {
  const { brand = 'Marca', rubro = 'default', tone = 'dark', brandColor = '#5b8cff', style = null } = brief
  // FORMATO (aspect-ratio). No afecta la receta (mismo seed -> misma carta), solo la forma del lienzo.
  const format = FORMATS[brief.format] ? brief.format : '9:16'
  const dims = FORMATS[format]
  // CONTENT puede venir ANIDADO (brief.content = {tagline,claim,cta}) o SUELTO en el brief (brief.tagline/claim/cta,
  // como lo arma el estudio y la perception). Unimos ambos -> el anidado gana. Asi el texto SIEMPRE llega a las escenas.
  // fitContent (core/script.js) = RED DE SEGURIDAD del guion: ata cada campo a su presupuesto y recorta en limite de
  // palabra (nunca a la mitad) -> el texto se muestra COMPLETO en cualquier escena (no se corta con "..."). Determinista.
  const content = fitContent({
    ...(brief.tagline != null ? { tagline: brief.tagline } : {}),
    ...(brief.claim != null ? { claim: brief.claim } : {}),
    ...(brief.cta != null ? { cta: brief.cta } : {}),
    // material SELECCIONADO por la perception (si viene): props reales, datos reales, prueba social.
    ...(Array.isArray(brief.bullets) && brief.bullets.length ? { bullets: brief.bullets } : {}),
    ...(Array.isArray(brief.stats) && brief.stats.length ? { stats: brief.stats } : {}),
    ...(brief.proof ? { proof: brief.proof } : {}),
    ...(brief.content || {}),
  })
  const seed = brief.seed != null ? (brief.seed >>> 0) : stableSeed(brand, rubro)
  // CEREBRO v2 · STRATEGY: el arco y las escenas salen de SEÑALES del contenido (numeros/pregunta/lista/comparacion/
  // prueba), no solo del azar. Un brief con un dato abre con numero; una pregunta con un hook de pregunta; etc.
  const sig = analyzeContent(content, rubro)
  const arc = brief.arc || buildArcSmart(seed, sig).map(c => ({ category: c, dur: _DUR[c] || 3.4 }))
  // CEREBRO v1 · SERIEDAD: brief.seriousness o default por rubro -> alimenta el scorer de fit (register/intensity).
  // Un consultorio (0.85) desfavorece lo jugado/fuerte; una gastronomia (0.35) lo deja brillar.
  const seriousness = brief.seriousness != null ? brief.seriousness : ({ salud: 0.85, finanzas: 0.8, inmobiliaria: 0.7, educacion: 0.55, tech: 0.5, default: 0.5, gastronomia: 0.35, moda: 0.4, belleza: 0.35, fitness: 0.35 }[rubro] ?? 0.5)
  // SCORER de fit: peso × afinidad-rubro × match-seriedad(register) × match-intensidad. Reemplaza al viejo wadj.
  const fitCtx = { rubro, seriousness }
  const score = (m) => fitWeight(m, fitCtx)

  // TONO = SOLO COLOR. Con lockRecipe (toggle claro/oscuro), se reusa cada slot salvo que su modulo no soporte el tono.
  const lock = brief.lockRecipe || null
  // KEEP (variante que RESPETA el estilo): pin PARCIAL. "Otra variante" fija la IDENTIDAD de la pagina (color +
  // tipografia) y RE-ROLEA el resto (fondo, escenas, motion, transicion, post...) con la semilla nueva -> mismo
  // look, video distinto. Distinto del lock (que reusa TODO). Un slot sin keepId se elige NORMAL (los opcionales
  // conservan su sorteo de probabilidad), asi la variante mantiene variedad real sin cambiar de "marca".
  const keep = brief.keepRecipe || null
  const toneOk = (m) => m && m.tones.indexOf(tone) >= 0
  // slot REQUERIDO: lock reusa su id; si no, keep lo fija si vino; si no, re-elige del pool de ESE tono.
  const required = (lockId, keepId, prng, pool) => {
    if (lock) { const m = lockId ? get(lockId) : null; if (toneOk(m)) return m }
    else if (keepId) { const m = get(keepId); if (toneOk(m)) return m }
    return pool.length ? weightedPick(prng, pool, score) : null
  }
  // slot OPCIONAL (~prob): lock preserva presencia/ausencia; keep fija el id que vino; si no, sorteo de probabilidad.
  const optional = (lockId, keepId, prng, prob, pool) => {
    if (lock) { if (!lockId) return null; const m = get(lockId); return toneOk(m) ? m : (pool.length ? weightedPick(prng, pool, score) : null) }
    if (keepId) { const m = get(keepId); if (toneOk(m)) return m }
    return (pool.length && prng() < prob) ? weightedPick(prng, pool, score) : null
  }

  // COLOR (esquema/mood) + TIPOGRAFIA (pairing) de sus bibliotecas; fallback a los derivadores base
  const colMod = required(lock && lock.color, keep && keep.color, seedFor(seed, 'colorpick'), query('color', { tone }))
  const palette = colMod ? colMod.derive(brandColor, { tone, rubro, seed }) : derivePalette(brandColor, { tone, rubro, seed })
  const typMod = required(lock && lock.type, keep && keep.type, seedFor(seed, 'typepick'), query('typography', { tone }))
  const fonts = typMod ? typMod.fonts : deriveFonts(rubro, style, seed)
  // MOTION: personalidad de movimiento (entrada/asentamiento/stagger/drift) -> env.motion.
  const motMod = required(lock && lock.motion, keep && keep.motion, seedFor(seed, 'motionpick'), query('motion', { tone }))
  // TYPEKIT: efecto de texto cinetico para los titulos -> env.typekit. ~30% sin efecto (plain) para no saturar.
  const tkMod = optional(lock && lock.typekit, keep && keep.typekit, seedFor(seed, 'typekit'), 0.7, query('typekit', { tone }))
  // MARKKIT garnish: un ICONO (por rubro) en una esquina, chico y tenue, opcional (~50%). Solo iconos
  // (NUNCA un blob/forma centrada detras del titulo). Los divisores/marcos quedan para composicion per-escena.
  const MARK_GARNISH_CATS = new Set(['iconos-rubro', 'iconos-animados'])
  const markPool = query('markkit', { tone }).filter(m => MARK_GARNISH_CATS.has(m.category))
  const markMod = optional(lock && lock.mark, keep && keep.mark, seedFor(seed, 'markgarnish'), 0.5, markPool)
  // ANIM (Lottie PRE-HECHA): elige una animacion del MANIFIESTO por concepto del brief + rubro (no al azar). Optional ~45%.
  // El manifiesto (gateado por determinismo, categorizado) vive en ../lottie/manifest.js; el JSON crudo se fetchea en
  // runtime y se rendea con lottie-web por t (player.js, solo browser; en Node es no-op -> los gates no lo testean).
  const wantConcepts = routeAnimConcepts(content, rubro)
  const animItems = (LOTTIE && LOTTIE.items) || []
  let animPool = animItems.filter(it => it.rubro === rubro)
  if (animPool.length < 4) animPool = animPool.concat(animItems.filter(it => it.rubro === 'default'))   // suma universales
  const animByConcept = animPool.filter(it => wantConcepts.has(it.concept))
  if (animByConcept.length) animPool = animByConcept
  let animPick = null
  if (lock) animPick = lock.anim ? animItems.find(it => it.id === lock.anim) : null
  else if (keep && keep.anim) animPick = animItems.find(it => it.id === keep.anim)
  else if (animPool.length && seedFor(seed, 'anim')() < 0.45) animPick = pick(seedFor(seed, 'animpick'), animPool)
  // TRANSICION escena-a-escena (wipe/slide/iris/bars/cut) -> video.transitionId.
  const trMod = required(lock && lock.transition, keep && keep.transition, seedFor(seed, 'transition'), query('transitions', { tone }))
  // PACING: la ventana de transicion (XF) sale de la PERSONALIDAD de movimiento (snappy corta, calmo larga).
  const motId = (motMod && motMod.id) || ''
  const xf = /snappy|punch|rebote|elastic|kinetic|arcade/.test(motId) ? 0.3 : /glide|calm|slow|cine|drift|float/.test(motId) ? 0.5 : 0.4
  // POST: acabado (grano/vignette/leak/grade/scanlines) -> video.postId. Opcional (~58%).
  const postMod = optional(lock && lock.post, keep && keep.post, seedFor(seed, 'post'), 0.58, query('post', { tone }))
  // LAYOUT: arquitectura de composicion (centrado/editorial/poster/anclado...). El director elige UNA por video;
  // las escenas piden slots y el solver (core/layout.js) los ubica. Tono-agnostico -> filtra solo por fit.
  const layMod = required(lock && lock.layout, keep && keep.layout, seedFor(seed, 'layout'), query('layouts', { tone }))

  // FONDO: IDENTIDAD POR RUBRO. Si el rubro tiene fondos PROPIOS suficientes, el pool = los propios + una MINORIA
  // de universales (cantidad pareja) y se descartan los de OTROS rubros. Asi un brief tech usa fondos tech (no
  // genericos ni de otro rubro), con algo de universal para variar. Sin rubro claro -> pool completo de siempre.
  let bgPool = query('backgrounds', { tone })
  if (rubro && rubro !== 'default') {
    const own = bgPool.filter(m => { const rs = (m.rubros && m.rubros.length) ? m.rubros : ['*']; return rs[0] !== '*' && rs.some(r => canonRubro(r) === rubro) })
    if (own.length >= 6) {
      const univ = shuffled(seedFor(seed, 'bgpool'), bgPool.filter(m => ((m.rubros && m.rubros[0]) || '*') === '*')).slice(0, Math.max(3, Math.ceil(own.length * 0.4)))
      bgPool = own.concat(univ)   // ~75% fondo propio del rubro, ~25% universal para variar
    }
  }
  const bg = required(lock && lock.bg, keep && keep.bg, seedFor(seed, 'bg'), bgPool)
  const sub = optional(lock && lock.sub, keep && keep.sub, seedFor(seed, 'substrate'), 0.65, query('substrates', { tone }))
  const atm = optional(lock && lock.atm, keep && keep.atm, seedFor(seed, 'atmosphere'), 0.55, query('atmosphere', { tone }))

  // ESCENAS: por cada beat del arco, query de scene-layouts de esa categoria -> pick por fit × sesgo de contenido.
  // Bajo lock se reusa el sceneId del mismo beat (el arco es identico: mismo seed+content) salvo incompat. de tono.
  // PRESUPUESTO DE DURACION: escala los beats para acercarse a un target segun brief.duration (corto/medio/largo).
  // Antes la duracion era emergente (sumaba los _DUR -> hasta ~15s para un promo corto). Cada beat queda en [2.2, 6]s.
  const DUR_TARGET = { corto: 8, medio: 12, largo: 18 }
  const rawTotal = arc.reduce((s, b) => s + (b.dur || 3.4), 0)
  const durK = clamp((DUR_TARGET[brief.duration] || DUR_TARGET.medio) / (rawTotal || 1), 0.55, 1.7)
  const scenes = []; let start = 0
  arc.forEach((beat, i) => {
    let opts = query('scene-layouts', { tone, category: beat.category })
    // DATAKIT queda FUERA del pool: sus charts FABRICAN los numeros (mulberry32 por seed) -> contradice la
    // honestidad de datos (no inventar). Las escenas data/* honestas ya cubren 1 numero REAL (statAt/numFrom) y
    // scene.data.multi cubre 2-3 stats reales; sin datos reales el beat degrada a texto. (Antes datakit entraba
    // justo cuando NO habia stats -> grafico inventado.) Reactivar datakit recien cuando lea content.stats reales
    // (pendiente: reescritura de los 66 modulos para que rendericen datos reales y se salteen si no alcanzan).
    const prng = seedFor(seed ^ hashStr('arc' + i), 'scene')
    let mod = null
    const lockId = lock && lock.scenes && lock.scenes[i]
    if (lock) { const lm = lockId ? get(lockId) : null; if (toneOk(lm)) mod = lm }
    if (!mod) mod = opts.length ? weightedPick(prng, opts, m => score(m) * sceneBias(m, sig)) : null
    if (mod) { const dur = clamp((beat.dur || 3.4) * durK, 2.2, 6); scenes.push({ start, dur, sceneId: mod.id, seed: (seed ^ hashStr('s' + i)) >>> 0 }); start += dur }
  })

  return {
    brand, rubro, tone, seed, palette, fonts, format, W: dims.w, H: dims.h, xf, logo: brief.logo || null,
    bgId: bg ? bg.id : null, bgSeed: (seed ^ hashStr('bg')) >>> 0,
    subId: sub ? sub.id : null, subSeed: (seed ^ hashStr('sub')) >>> 0,
    atmId: atm ? atm.id : null, atmSeed: (seed ^ hashStr('atm')) >>> 0,
    motionId: motMod ? motMod.id : null,
    typekitId: tkMod ? tkMod.id : null,
    markId: markMod ? markMod.id : null, markSeed: (seed ^ hashStr('mark')) >>> 0,
    animId: animPick ? animPick.id : null, animFile: animPick ? animPick.file : null, animSeed: (seed ^ hashStr('anim')) >>> 0,
    transitionId: trMod ? trMod.id : null,
    postId: postMod ? postMod.id : null, postSeed: (seed ^ hashStr('post')) >>> 0,
    layoutId: layMod ? layMod.id : null,
    content: { brand, ...content },
    scenes, duration: start || 8,
    recipe: { color: colMod ? colMod.id : null, type: typMod ? typMod.id : null, bg: bg ? bg.id : null, sub: sub ? sub.id : null, atm: atm ? atm.id : null, motion: motMod ? motMod.id : null, typekit: tkMod ? tkMod.id : null, mark: markMod ? markMod.id : null, anim: animPick ? animPick.id : null, transition: trMod ? trMod.id : null, post: postMod ? postMod.id : null, layout: layMod ? layMod.id : null, scenes: scenes.map(s => s.sceneId) },   // la "carta" del video
  }
}
