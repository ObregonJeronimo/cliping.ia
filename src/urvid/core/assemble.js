// urvid 1.0 · ASSEMBLE — el DIRECTOR. Dado un BRIEF (lo que el analisis de la pagina + el LLM producen), arma el
// VIDEO eligiendo de las bibliotecas: paleta, fuentes, un fondo, capas y una secuencia de escenas por BEAT narrativo.
// Determinista por semilla. Devuelve un objeto VIDEO que render.js dibuja.
// SELECCION (v3): el rubro YA NO es un filtro DURO (dejaba modulos de nicho muertos y colaba '*' en briefs serios);
// ahora cada slot se ELIGE con un SCORER SUAVE (core/fit.js) que matchea rubro + register(vibe) + intensity contra el
// brief. El unico filtro duro es el TONO. Asi deja de usar piezas que no pegan sin perder variedad.
// TONO = SOLO COLOR: si el brief trae lockRecipe (el toggle claro/oscuro del estudio), se REUSA la receta y solo se
// re-deriva la paleta; un slot se re-elige unicamente si su modulo no soporta el tono nuevo.
import { derivePalette } from './palette.js'
import { FORMATS, clamp, hexToHsl, hslToHex } from './util.js'
import { query, get } from './registry.js'
import { seedFor, weightedPick, hashStr, stableSeed, shuffled } from './prng.js'
import { analyzeContent, buildArcSmart, sceneBias, atmoSubBias, colorEnergyBias, audienceWarmBias } from './strategy.js'
import { fitWeight, canonRubro, layoutBias, RUBRO_HUE } from './fit.js'
import { fitContent, BUDGETS, BUDGETS_WIDE } from './script.js'

// ARCO narrativo VARIADO por semilla: apertura (hook|hero) -> 1-3 beats de cuerpo SIN repetir -> cierre. Usa todas
// las categorias de escena disponibles -> dos videos no comparten estructura (no siempre hero->statement->outro).
const _DUR = { 'openers/hero': 3.0, 'openers/hook': 2.6, 'statements/editorial': 3.4, 'lists/checklist': 3.9, 'lists/comparison': 3.6, 'data/single': 3.0, 'data/multi': 3.6, 'social/proof': 3.4, 'connectors/interstitial': 2.4, 'closers/outro': 3.6 }   // interstitial = beat-puente corto   // openers cortos -> el gancho/mensaje cae <=2.5s tras el scaling de durK (garantia hook-2.5s)


export function makeVideo(brief = {}) {
  const { brand = 'Marca', rubro: _rubroRaw = 'default', tone = 'dark', brandColor: _brandColorRaw = '#5b8cff', style = null } = brief
  const rubro = canonRubro(_rubroRaw)   // normaliza al set canonico de fit.js (perception y motor ya comparten 11 rubros, incl. eventos) -> el scorer matchea sin degradar.
  // brandColor ACROMATICO (negro/blanco/gris puro, S~0): hexToHsl da hue=0 -> TODOS los esquemas (incl. los mono) derivan
  // un ROJO/granate ARBITRARIO (off-brand para marcas minimalistas negro/blanco: Notion, Sephora, Apple-like). Lo
  // normalizamos al hue del RUBRO (sobrio y coherente: tech->azul, belleza->rosa; default->slate 220) con S moderada -> el
  // motor produce una paleta coherente, no un rojo random. Determinista (puro). e2e: cazado en Notion/Sephora (#000000).
  const _bcHsl = hexToHsl(_brandColorRaw)
  const brandColor = (_bcHsl.s < 0.12) ? hslToHex(RUBRO_HUE[rubro] != null ? RUBRO_HUE[rubro] : 220, 0.34, clamp(_bcHsl.l, 0.34, 0.6)) : _brandColorRaw
  // FORMATO (aspect-ratio). No afecta la receta (mismo seed -> misma carta), solo la forma del lienzo.
  const format = FORMATS[brief.format] ? brief.format : '9:16'
  const dims = FORMATS[format]
  // CONTENT puede venir ANIDADO (brief.content = {tagline,claim,cta}) o SUELTO en el brief (brief.tagline/claim/cta,
  // como lo arma el estudio y la perception). Unimos ambos -> el anidado gana. Asi el texto SIEMPRE llega a las escenas.
  // fitContent (core/script.js) = RED DE SEGURIDAD del guion: ata cada campo a su presupuesto y recorta en limite de
  // palabra (nunca a la mitad) -> el texto se muestra COMPLETO en cualquier escena (no se corta con "..."). Determinista.
  const rawUnion = {
    ...(brief.tagline != null ? { tagline: brief.tagline } : {}),
    ...(brief.claim != null ? { claim: brief.claim } : {}),
    ...(brief.cta != null ? { cta: brief.cta } : {}),
    // material SELECCIONADO por la perception (si viene): props reales, datos reales, prueba social.
    ...(Array.isArray(brief.bullets) && brief.bullets.length ? { bullets: brief.bullets } : {}),
    ...(Array.isArray(brief.stats) && brief.stats.length ? { stats: brief.stats } : {}),
    ...(brief.proof ? { proof: brief.proof } : {}),
    ...(brief.content || {}),
  }
  const content = fitContent(rawUnion)   // RECETA (BUDGETS, formato-INDEPENDIENTE): alimenta analyzeContent + buildArcSmart + ruteo de anim
  // RENDER: en 9:16 (lienzo mas alto) mostramos MAS del mensaje real del usuario (BUDGETS_WIDE, con margen bajo la capacidad
  // que mide el sweep); 4:5/1:1 usan los BUDGETS conservadores -> byte-identico ahi. NO afecta la receta (mismo seed -> mismo
  // arco/escenas/anims), solo el TEXTO dibujado. El prefit gate asserta los 3 formatos con contenido crudo.
  const renderContent = fitContent(rawUnion, format === '9:16' ? BUDGETS_WIDE : BUDGETS)
  const seed = brief.seed != null ? (brief.seed >>> 0) : stableSeed(brand, rubro)
  // AUDIENCIA (de la perception): {who, register, awareness}. register -> nudge de seriedad; awareness -> sesgo del arco. Default {} (back-compat).
  const audience = (brief.audience && typeof brief.audience === 'object') ? brief.audience : {}
  // CEREBRO v2 · STRATEGY: el arco y las escenas salen de SEÑALES del contenido (numeros/pregunta/lista/comparacion/
  // prueba), no solo del azar. Un brief con un dato abre con numero; una pregunta con un hook de pregunta; etc.
  const sig = analyzeContent(content, rubro)
  // CEREBRO v1 · SERIEDAD: brief.seriousness o default por rubro -> alimenta el scorer de fit (register/intensity).
  // Un consultorio (0.85) desfavorece lo jugado/fuerte; una gastronomia (0.35) lo deja brillar. Se calcula ANTES del
  // arco porque el ARCO tambien se dirige al publico (un publico serio abre medido/hero; uno relajado, con mas gancho).
  const seriousness0 = brief.seriousness != null ? brief.seriousness : ({ salud: 0.85, finanzas: 0.8, inmobiliaria: 0.7, educacion: 0.55, tech: 0.5, default: 0.5, gastronomia: 0.35, moda: 0.4, belleza: 0.35, fitness: 0.35, eventos: 0.3 }[rubro] ?? 0.5)
  // El REGISTER del publico nudgea la seriedad EFECTIVA: formal = mas sobrio; casual/warm = mas relajado (clamp 0..1).
  const _regNudge = { formal: 0.15, warm: -0.05, casual: -0.12 }[audience.register] || 0
  const seriousness = Math.max(0, Math.min(1, seriousness0 + _regNudge))
  // ENERGIA del PLAYBOOK del rubro (item L142/L849): perception cablea brief.energyHint (alto|medio|bajo) desde el playbook
  // de marketing del vertical. Lo leemos como NIVEL con SIGNO (alto +1, bajo -1, medio/ausente 0) que dirige el RITMO del
  // video hacia la energia del rubro: un fitness/evento (alto) acelera, un consultorio/lujo/inmobiliaria (bajo) calma.
  // Centrado en 0 (medio/ausente) -> los 3 usos (energy, xf, hookProb) colapsan a hoy -> byte-identico (patron audience.register).
  const energyLevel = ({ alto: 1, medio: 0, bajo: -1 })[brief.energyHint] || 0
  // ENERGIA del copy (urgency/valence) — ORTOGONAL a seriousness (un brief puede ser serio Y urgente) — MAS el nudge del
  // playbook. Mueve el COLOR (colorEnergyBias) y el MOVIMIENTO (motion.energy -> staggerK comprime la cascada). PURO (sin
  // r() -> no re-rollea). energyLevel 0 -> el termino se anula -> byte-identico.
  const energy = Math.max(0, Math.min(1, (sig.urgency ? 0.55 : 0) + (sig.valence !== 'neu' ? 0.45 : 0) + energyLevel * 0.32))
  const arc = brief.arc || buildArcSmart(seed, sig, audience.awareness, seriousness, brief.duration || 'medio', energyLevel).map(c => ({ category: c, dur: _DUR[c] || 3.4 }))
  // CAP de bullets por DURACION (puro, sin PRNG): en videos cortos 4 bullets saturan y el ojo no los lee. Se aplica
  // DESPUES de analyzeContent(L155) y buildArcSmart(L163) -> el arco y la deteccion de señales ven SIEMPRE el set
  // COMPLETO (seleccion de escena byte-identica a hoy); solo el render y las Lotties por-escena ven el set capado.
  // Descarta items ENTEROS (fitContent ya recorto en limite de palabra) -> nunca a media palabra. Min 2 (no flipea hasList).
  if (Array.isArray(content.bullets) && content.bullets.length) {
    const bcap = { corto: 2, medio: 3, largo: 4 }[brief.duration] || 3
    if (content.bullets.length > bcap) content.bullets = content.bullets.slice(0, bcap)
  }
  // DENSIDAD de texto del brief (0..1): muchos items/bullets + datos + claim largo => contenido denso => sesgo a pairing
  // legible. PURA (deriva de sig, NO consume r() -> no mueve ninguna secuencia PRNG). sig.items = bullets || split del head.
  const density = Math.min(1, (sig.items || 0) / 4 * 0.6 + (sig.hasData ? 0.2 : 0) + (sig.longClaim ? 0.2 : 0))
  // STATS REALES (item L152): las cifras que la perception SELECCIONO de la pagina (value no vacio). Gatean datakit: un
  // modulo de data-viz solo entra al pool si hay suficientes stats reales -> nunca se fabrica un numero (honestidad de datos).
  const realStats = Array.isArray(content.stats) ? content.stats.filter(s => s && (s.value || s.value === 0)) : []
  // SCORER de fit: peso × afinidad-rubro × match-seriedad(register) × match-intensidad × legibilidad(densidad). Reemplaza al viejo wadj.
  const fitCtx = { rubro, seriousness, density }
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
  const required = (lockId, keepId, prng, pool, scoreFn = score) => {
    if (lock) { const m = lockId ? get(lockId) : null; if (toneOk(m)) return m }
    else if (keepId) { const m = get(keepId); if (toneOk(m)) return m }
    return pool.length ? weightedPick(prng, pool, scoreFn) : null   // scoreFn opcional (sesgo por contenido); default=score -> los callers de 4 args quedan byte-identicos
  }
  // slot OPCIONAL (~prob): lock preserva presencia/ausencia; keep PRESERVA presencia/ausencia del original (re-rolea CUAL
  // modulo si lo tenia, sigue ausente si no) -> nunca AGREGA una capa que el original no tenia; si no hay keep, sorteo de prob.
  const optional = (lockId, keepId, prng, prob, pool, scoreFn = score) => {
    if (lock) { if (!lockId) return null; const m = get(lockId); return toneOk(m) ? m : (pool.length ? weightedPick(prng, pool, scoreFn) : null) }
    if (keep) { return keepId ? (pool.length ? weightedPick(prng, pool, scoreFn) : null) : null }   // keepId truthy = el original tenia la capa -> re-rolea identidad; falsy = no la tenia -> queda ausente
    return (pool.length && prng() < prob) ? weightedPick(prng, pool, scoreFn) : null
  }

  // COLOR (esquema/mood) + TIPOGRAFIA (pairing) de sus bibliotecas; fallback a los derivadores base
  const colMod = required(lock && lock.color, keep && keep.color, seedFor(seed, 'colorpick'), query('color', { tone }), m => score(m) * colorEnergyBias(m, sig) * audienceWarmBias(m, audience.register))
  const palette = colMod ? colMod.derive(brandColor, { tone, rubro, seed }) : derivePalette(brandColor, { tone, rubro, seed })
  // HUE del acento de la paleta -> temperatura para la afinidad de fondo (bgTempAffinity). Solo afecta backgrounds con
  // mod.temp; todo otro slot queda 1.0 (identico). Se setea aca (post-paleta) -> el pick de color de arriba no lo ve.
  fitCtx.paletteHue = (palette && palette.accent) ? hexToHsl(palette.accent).h : null
  const typMod = required(lock && lock.type, keep && keep.type, seedFor(seed, 'typepick'), query('typography', { tone }), m => score(m) * audienceWarmBias(m, audience.register))
  const fonts = typMod ? typMod.fonts : { display: 'Space Grotesk', text: 'Inter', accent: 'JetBrains Mono' }   // typMod SIEMPRE gana (typography no queda vacio para dark/light); fallback estatico sano (= pairing grotesk-clean, el de mayor weight) por defensa
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
  // PACING: la ventana de transicion (XF) sale de la PERSONALIDAD de movimiento (snappy corta, calmo larga).
  const motId = (motMod && motMod.id) || ''
  const baseXf = /snappy|punch|rebote|elastic|kinetic|arcade/.test(motId) ? 0.3 : /glide|calm|slow|cine|drift|float/.test(motId) ? 0.5 : 0.4
  // PACING content-aware: publico serio lee mejor con XF mas larga/suave; energico con cortes mas snappy. PURO (sin PRNG).
  // Centrado en seriousness=0.5 -> seriousK=1 -> xf===baseXf (back-compat byte-identico). Banda [0.24,0.6]: tope 0.6 << dur
  // minima de escena (2.2s) -> ventanas separadas >=1.6s, sin solape (el gate qa de coexistencia A/B sigue inmune).
  // energyLevel del playbook acorta (alto: cortes snappy) o alarga (bajo: transiciones suaves) la ventana; 0 -> factor 1 -> byte-identico.
  const xf = clamp(baseXf * clamp(1 + (seriousness - 0.5) * 0.5, 0.8, 1.25) * (1 - energyLevel * 0.15), 0.24, 0.6)
  // POST: acabado (grano/vignette/leak/grade/scanlines) -> video.postId. Opcional (~58%).
  const postMod = optional(lock && lock.post, keep && keep.post, seedFor(seed, 'post'), 0.58, query('post', { tone }))
  // LAYOUT: arquitectura de composicion (centrado/editorial/poster/anclado...). El director elige UNA por video;
  // las escenas piden slots y el solver (core/layout.js) los ubica. Tono-agnostico -> filtra solo por fit.
  const layMod = required(lock && lock.layout, keep && keep.layout, seedFor(seed, 'layout'), query('layouts', { tone }), m => score(m) * layoutBias(m, sig))

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
  const sub = optional(lock && lock.sub, keep && keep.sub, seedFor(seed, 'substrate'), 0.65, query('substrates', { tone }), m => score(m) * atmoSubBias(m, sig))
  // COORDINACION sub<->atm: si el SUB ya es de familia 'overlay-light' (pinta luz atmosferica) y el ATM cae en la MISMA
  // familia de luz (vignette/glow-bloom/light-rays/lens-fx/depth-haze) -> DOS capas redundantes (render apila sub->atm
  // sin dedup). Desfavorece (x0.45, nunca prohibe) esa colision; scrim-legibility/color-grade/shadow NO entran -> APCA
  // intacto. PURO sobre el `sub` ya resuelto (0 PRNG; weightedPick consume 1 prng() sin importar pesos -> determinista).
  const _SUB_LIGHT_CLASH = new Set(['vignette', 'glow-bloom', 'light-rays', 'lens-fx', 'depth-haze'])
  const subAtmGuard = (sm, am) => (sm && sm.category === 'overlay-light' && am && _SUB_LIGHT_CLASH.has(am.category)) ? 0.45 : 1
  const atm = optional(lock && lock.atm, keep && keep.atm, seedFor(seed, 'atmosphere'), 0.55, query('atmosphere', { tone }), m => score(m) * atmoSubBias(m, sig) * subAtmGuard(sub, m))

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
    // DATAKIT HONESTO (item L152): un beat de DATOS con stats REALES suficientes suma al pool los modulos datakit MIGRADOS
    // (m.real -> leen content.stats, NUNCA fabrican). Gatea por realStats.length -> SIN stats el pool queda byte-identico (los
    // briefs de gates sin stats quedan iguales) y el beat degrada a la escena honesta scene.data.* (statAt/numFrom). Los ~65
    // modulos NO migrados no tienen m.real -> siguen fuera (fabricarian). Determinismo: weightedPick consume 1 prng() sin
    // importar el tamaño del pool + seedFor(arco) es independiente del contenido del pool -> el resto queda intacto.
    if (beat.category === 'data/single' && realStats.length >= 1) {
      opts = opts.concat(query('datakit', { tone }).filter(m => m.real && (m.needsStats || 1) <= realStats.length))
    }
    const prng = seedFor(seed ^ hashStr('arc' + i), 'scene')
    let mod = null
    const lockId = lock && lock.scenes && lock.scenes[i]
    if (lock) { const lm = lockId ? get(lockId) : null; if (toneOk(lm)) mod = lm }
    if (!mod) mod = opts.length ? weightedPick(prng, opts, m => score(m) * sceneBias(m, sig)) : null
    // SLOT-MEDIA: si el brief trae la FOTO real del producto, el PRIMER opener se sustituye por la escena showcase a
    // sangre (foto cover-crop + scrim + texto). DESPUES del weightedPick (el prng del arco ya avanzo identico) y SOLO con
    // brief.mediaImage -> los briefs sin foto (los 9 gates) corren byte-identico. No pisa una escena lockeada (!lockId).
    if (brief.mediaImage && mod && !lockId && i === 0) mod = get('scene.showcase.fullbleed') || mod   // i===0 es SIEMPRE el opener (hero/hook/statement) -> la foto ES el opener (como los competidores), sea cual sea su categoria
    if (mod) {
      const dur = clamp((beat.dur || 3.4) * durK, 2.2, 6)
      const sc = { start, dur, sceneId: mod.id, seed: (seed ^ hashStr('s' + i)) >>> 0, bgSeed: (seed ^ hashStr('bg|' + beat.category + '|' + i)) >>> 0 }   // variante de fondo por beat (mismo eje 'bg' que video.bgSeed)
      scenes.push(sc); start += dur
    }
  })

  return {
    brand, rubro, tone, seed, seriousness, energy, palette, fonts, format, W: dims.w, H: dims.h, xf, logo: brief.logo || null, mediaImage: brief.mediaImage || null,
    bgId: bg ? bg.id : null, bgSeed: (seed ^ hashStr('bg')) >>> 0,
    subId: sub ? sub.id : null, subSeed: (seed ^ hashStr('sub')) >>> 0,
    atmId: atm ? atm.id : null, atmSeed: (seed ^ hashStr('atm')) >>> 0,
    motionId: motMod ? motMod.id : null,
    typekitId: tkMod ? tkMod.id : null,
    markId: markMod ? markMod.id : null, markSeed: (seed ^ hashStr('mark')) >>> 0,
    transitionId: trMod ? trMod.id : null,
    postId: postMod ? postMod.id : null, postSeed: (seed ^ hashStr('post')) >>> 0,
    layoutId: layMod ? layMod.id : null,
    content: { brand, ...renderContent },   // lo que se DIBUJA (BUDGETS_WIDE en 9:16, BUDGETS en 4:5/1:1); la receta usa `content`
    scenes, duration: start || 8,
    recipe: { color: colMod ? colMod.id : null, type: typMod ? typMod.id : null, bg: bg ? bg.id : null, sub: sub ? sub.id : null, atm: atm ? atm.id : null, motion: motMod ? motMod.id : null, typekit: tkMod ? tkMod.id : null, mark: markMod ? markMod.id : null, transition: trMod ? trMod.id : null, post: postMod ? postMod.id : null, layout: layMod ? layMod.id : null, scenes: scenes.map(s => s.sceneId) },   // la "carta" del video
  }
}
