// kinetic 1.0 · DIRECTOR — makeKinetic(brief,{seed}) -> video. Orquesta: DNA (identidad) -> guion (beats
// retoricos) -> grilla ritmica (los cortes CAEN EN BEAT: firma del genero) -> casting de escenas (registry,
// anti-repeticion) -> placas por polaridad (regla del arc, no azar) -> transiciones (cut default; 1-2 bordes
// "feature"). Determinismo: todo de seedFor(seed, ns); iterar un eje no desbarata otro.
import { seedFor, weightedPick, range, stableSeed } from './prng.js'
import { deriveDNA } from './dna.js'
import { buildScript } from './script.js'
import { query, get } from './registry.js'
import { clamp } from './util.js'

export const KW = 405, KH = 720

// polaridad concreta para un token del motivo (M = mesh resuelto por familia de color, racionado por budget)
function resolvePolarity(tok, dna, meshUsed) {
  if (tok === 'M' && meshUsed.n < dna.meshBudget) { meshUsed.n++; return dna.colorFamily === 'neon-oscuro' ? 'mesh-dark' : 'mesh-light' }
  if (tok === 'M') tok = dna.colorFamily === 'neon-oscuro' ? 'D' : 'L'
  if (tok === 'D') return 'dark'
  return 'light'
}

export function makeKinetic(brief, opts = {}) {
  const seed = (opts.seed != null ? opts.seed : (brief.seed != null ? brief.seed : stableSeed(brief.brand, brief.rubro))) >>> 0
  const dna = deriveDNA(brief, seed)
  const script = buildScript(brief, seed, dna)
  const beatDur = 60 / dna.bpm

  // --- casting: cada beat retorico -> una escena del registry (por kind), anti-repeticion x0.15 ---
  const rC = seedFor(seed, 'kin.cast')
  const used = new Set()
  const images = (brief.images || []).filter(Boolean).slice(0, 8)
  const scenes = []
  let t = 0
  const meshUsed = { n: 0 }
  const motif = dna.polarityMotif
  let mi = 0

  for (const beat of script.beats) {
    const pool = query('scenes', { kind: beat.role }).filter(m => !m.needs || (
      (!m.needs.photos || images.length >= m.needs.photos) &&
      (!m.needs.maxChars || String(beat.text || '').length <= m.needs.maxChars)
    ))
    if (!pool.length) continue                                 // sin modulo para el rol -> se salta (v1: roles cubiertos)
    const mod = weightedPick(rC, pool, m => ((beat.role === 'hook' && m.hookWeight != null ? m.hookWeight : m.weight) || 1) * (used.has(m.id) ? 0.15 : 1))
    used.add(mod.id)
    // polaridad: CTA fuerza contraste maximo con la anterior; el resto sigue el motivo
    let polarity
    if (beat.role === 'cta') {
      const prev = scenes[scenes.length - 1]
      polarity = prev && (prev.polarity === 'dark' || prev.polarity === 'mesh-dark') ? 'light' : 'dark'
      if (dna.ctaVariant === 'button' && dna.colorFamily !== 'neon-oscuro') polarity = 'accent'
    } else {
      polarity = resolvePolarity(motif[mi % motif.length], dna, meshUsed); mi++
    }
    // escenas mesh solo si el modulo la banca (todos la bancan en v1: pintan placa via paintPlate)
    const dur = Math.max(2, beat.durBeats + (mod.extraBeats || 0)) * beatDur
    const rS = seedFor(seed, 'kin.scene.' + scenes.length)
    // garnish: fuera del centro (el texto vive en el tercio medio); esquinas sampleadas
    const garnish = dna.garnishDialect !== 'none' && rS() < dna.garnishDensity && beat.role !== 'breath'
      ? { cx: rS() < 0.5 ? range(rS, 0.12, 0.24) : range(rS, 0.76, 0.88), cy: rS() < 0.5 ? range(rS, 0.1, 0.2) : range(rS, 0.78, 0.9), r: range(rS, 0.05, 0.09), kind: rS() < 0.6 ? 'circle' : 'arc' }
      : null
    scenes.push({
      sceneId: mod.id, role: beat.role, t0: t, dur, polarity,
      text: beat.text, sub: beat.sub || '', slam: !!beat.slam,
      seed: (seed ^ (scenes.length * 0x9e3779b1)) >>> 0, garnish,
    })
    t += dur
  }

  // --- transiciones: default cut (dur 0); 1-2 bordes feature (post-hook y pre-cta) ---
  const rX = seedFor(seed, 'kin.cuts')
  const cuts = []
  const featurePool = query('transitions', {}).filter(m => m.id !== 'kin.xf.cut')
  for (let i = 1; i < scenes.length; i++) {
    const isPostHook = i === 1, isPreCta = i === scenes.length - 1
    let id = 'kin.xf.cut', dur = 0
    if ((isPostHook || isPreCta) && featurePool.length && rX() < (dna.mood[2] > 0.5 ? 0.75 : 0.45)) {
      const m = weightedPick(rX, featurePool, x => x.weight || 1)
      id = m.id; dur = m.dur != null ? m.dur : 0.5
    }
    cuts.push({ at: scenes[i].t0, id, dur, seed: (seed ^ (i * 0x85ebca6b)) >>> 0 })
  }

  const duration = clamp(t, 8, 30)
  const video = {
    engine: 'kinetic', v: 1, seed, W: KW, H: KH, duration,
    brand: brief.brand || '', logo: brief.logo || null, cta: brief.cta || '',
    images, dna, script, scenes, cuts,
    xf: 0.001,                                                 // compat con llamadores que lean xf (no se usa)
    recipe: {
      v: 1, seed, templateId: script.templateId, dna,
      sceneIds: scenes.map(s => s.sceneId), cutIds: cuts.map(c => c.id), polarities: scenes.map(s => s.polarity),
    },
  }
  // tiempos de corte (para SFX del estudio) — deterministas
  video.cutTimes = cuts.filter(c => c.dur === 0).map(c => c.at)
  return video
}
