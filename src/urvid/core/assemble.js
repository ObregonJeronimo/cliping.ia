// urvid 1.0 · ASSEMBLE — el DIRECTOR. Dado un BRIEF (lo que el analisis de la pagina + el LLM producen), arma el
// VIDEO eligiendo de las bibliotecas: paleta, fuentes, un fondo, capas y una secuencia de escenas por BEAT narrativo.
// Determinista por semilla. Devuelve un objeto VIDEO que render.js dibuja.
// SELECCION (v3): el rubro YA NO es un filtro DURO (dejaba modulos de nicho muertos y colaba '*' en briefs serios);
// ahora cada slot se ELIGE con un SCORER SUAVE (core/fit.js) que matchea rubro + register(vibe) + intensity contra el
// brief. El unico filtro duro es el TONO. Asi deja de usar piezas que no pegan sin perder variedad.
// TONO = SOLO COLOR: si el brief trae lockRecipe (el toggle claro/oscuro del estudio), se REUSA la receta y solo se
// re-deriva la paleta; un slot se re-elige unicamente si su modulo no soporta el tono nuevo.
import { derivePalette } from './palette.js'
import { query, get } from './registry.js'
import { seedFor, weightedPick, hashStr, stableSeed, pick, shuffled } from './prng.js'
import { deriveFonts } from './fonts.js'
import { analyzeContent, buildArcSmart, sceneBias } from './strategy.js'
import { fitWeight } from './fit.js'

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

export function makeVideo(brief = {}) {
  const { brand = 'Marca', rubro = 'default', tone = 'dark', brandColor = '#5b8cff', style = null } = brief
  // CONTENT puede venir ANIDADO (brief.content = {tagline,claim,cta}) o SUELTO en el brief (brief.tagline/claim/cta,
  // como lo arma el estudio y la perception). Unimos ambos -> el anidado gana. Asi el texto SIEMPRE llega a las escenas.
  const content = {
    ...(brief.tagline != null ? { tagline: brief.tagline } : {}),
    ...(brief.claim != null ? { claim: brief.claim } : {}),
    ...(brief.cta != null ? { cta: brief.cta } : {}),
    // material SELECCIONADO por la perception (si viene): props reales, datos reales, prueba social.
    ...(Array.isArray(brief.bullets) && brief.bullets.length ? { bullets: brief.bullets } : {}),
    ...(Array.isArray(brief.stats) && brief.stats.length ? { stats: brief.stats } : {}),
    ...(brief.proof ? { proof: brief.proof } : {}),
    ...(brief.content || {}),
  }
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
  // TRANSICION escena-a-escena (wipe/slide/iris/bars/cut) -> video.transitionId.
  const trMod = required(lock && lock.transition, keep && keep.transition, seedFor(seed, 'transition'), query('transitions', { tone }))
  // POST: acabado (grano/vignette/leak/grade/scanlines) -> video.postId. Opcional (~58%).
  const postMod = optional(lock && lock.post, keep && keep.post, seedFor(seed, 'post'), 0.58, query('post', { tone }))

  // FONDO: query por tono -> pick por fit. SUBSTRATE (~65%) + ATMOSPHERE (~55%) opcionales -> mas unicidad por capas.
  const bg = required(lock && lock.bg, keep && keep.bg, seedFor(seed, 'bg'), query('backgrounds', { tone }))
  const sub = optional(lock && lock.sub, keep && keep.sub, seedFor(seed, 'substrate'), 0.65, query('substrates', { tone }))
  const atm = optional(lock && lock.atm, keep && keep.atm, seedFor(seed, 'atmosphere'), 0.55, query('atmosphere', { tone }))

  // ESCENAS: por cada beat del arco, query de scene-layouts de esa categoria -> pick por fit × sesgo de contenido.
  // Bajo lock se reusa el sceneId del mismo beat (el arco es identico: mismo seed+content) salvo incompat. de tono.
  const scenes = []; let start = 0
  arc.forEach((beat, i) => {
    let opts = query('scene-layouts', { tone, category: beat.category })
    // las escenas de DATA tambien pueden ser charts DATAKIT, PERO datakit fabrica numeros por seed -> si la
    // perception trajo STATS REALES, usamos solo las escenas que muestran ESE numero real (statAt), no datakit.
    if (beat.category.indexOf('data/') === 0 && !(Array.isArray(content.stats) && content.stats.length)) opts = opts.concat(query('datakit', { tone }))
    const prng = seedFor(seed ^ hashStr('arc' + i), 'scene')
    let mod = null
    const lockId = lock && lock.scenes && lock.scenes[i]
    if (lock) { const lm = lockId ? get(lockId) : null; if (toneOk(lm)) mod = lm }
    if (!mod) mod = opts.length ? weightedPick(prng, opts, m => score(m) * sceneBias(m, sig)) : null
    if (mod) { scenes.push({ start, dur: beat.dur, sceneId: mod.id, seed: (seed ^ hashStr('s' + i)) >>> 0 }); start += beat.dur }
  })

  return {
    brand, rubro, tone, seed, palette, fonts,
    bgId: bg ? bg.id : null, bgSeed: (seed ^ hashStr('bg')) >>> 0,
    subId: sub ? sub.id : null, subSeed: (seed ^ hashStr('sub')) >>> 0,
    atmId: atm ? atm.id : null, atmSeed: (seed ^ hashStr('atm')) >>> 0,
    motionId: motMod ? motMod.id : null,
    typekitId: tkMod ? tkMod.id : null,
    markId: markMod ? markMod.id : null, markSeed: (seed ^ hashStr('mark')) >>> 0,
    transitionId: trMod ? trMod.id : null,
    postId: postMod ? postMod.id : null, postSeed: (seed ^ hashStr('post')) >>> 0,
    content: { brand, ...content },
    scenes, duration: start || 8,
    recipe: { color: colMod ? colMod.id : null, type: typMod ? typMod.id : null, bg: bg ? bg.id : null, sub: sub ? sub.id : null, atm: atm ? atm.id : null, motion: motMod ? motMod.id : null, typekit: tkMod ? tkMod.id : null, mark: markMod ? markMod.id : null, transition: trMod ? trMod.id : null, post: postMod ? postMod.id : null, scenes: scenes.map(s => s.sceneId) },   // la "carta" del video
  }
}
