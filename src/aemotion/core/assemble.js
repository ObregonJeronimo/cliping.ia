// aemotion 0.1 · DIRECTOR — makeMotionVideo(brief,{seed}) -> video. Orquesta (patron probado de
// kinetic, copia independiente): DNA (identidad, 5 familias visuales) -> guion (beats retoricos) ->
// grilla ritmica (cortes en beat) -> casting con bias de FAMILIA (famBias: la misma escena pesa
// distinto en cada sistema de diseno) + anti-repeticion -> polaridad por motivo -> transiciones
// seamless en 1-2 bordes feature. Determinismo: todo de seedFor(seed, ns).
import { seedFor, weightedPick, stableSeed } from './prng.js'
import { deriveDNA } from './dna.js'
import { buildScript } from './script.js'
import { query } from './registry.js'
import { clamp } from './util.js'
import '../libs/index.js'                                     // registra escenas + transiciones

export const MW = 405, MH = 720

export function makeMotionVideo(brief, opts = {}) {
  const seed = (opts.seed != null ? opts.seed : (brief.seed != null ? brief.seed : stableSeed(brief.brand, brief.rubro))) >>> 0
  const dna = deriveDNA(brief, seed)
  const script = buildScript(brief, seed, dna)
  const beatDur = 60 / dna.bpm

  // --- casting: rol -> escena, pesada por famBias de la familia + anti-repeticion x0.15 ---
  const rC = seedFor(seed, 'am.cast')
  const used = new Set()
  const scenes = []
  const motif = dna.polarityMotif
  let t = 0, mi = 0

  for (const beat of script.beats) {
    const pool = query('scenes', { kind: beat.role })
    if (!pool.length) continue
    const mod = weightedPick(rC, pool, m => {
      const base = (beat.role === 'hook' && m.hookWeight != null ? m.hookWeight : m.weight) || 1
      const fam = (m.famBias && m.famBias[dna.familia]) || 1
      return base * fam * (used.has(m.id) ? 0.15 : 1)
    })
    used.add(mod.id)
    let polarity
    if (beat.role === 'cta') {
      const prev = scenes[scenes.length - 1]
      polarity = dna.ctaKind === 'block' && dna.familia !== 'orbita' ? 'accent'
        : prev && prev.polarity === 'dark' ? 'light' : 'dark'
    } else {
      const tok = motif[mi % motif.length]; mi++
      polarity = tok === 'A' ? 'accent' : tok === 'D' ? 'dark' : 'light'
    }
    const dur = Math.max(2, beat.durBeats) * beatDur
    scenes.push({
      sceneId: mod.id, role: beat.role, t0: t, dur, polarity,
      text: beat.text, sub: beat.sub || '', slam: !!beat.slam,
      seed: (seed ^ (scenes.length * 0x9e3779b1)) >>> 0,
    })
    t += dur
  }

  // --- cortes: default seco (en beat); 1-2 bordes feature (post-hook y pre-cta) con seamless real ---
  const rX = seedFor(seed, 'am.cuts')
  const featurePool = query('transitions', {}).filter(m => m.dur > 0)
  const cuts = []
  for (let i = 1; i < scenes.length; i++) {
    const isPostHook = i === 1, isPreCta = i === scenes.length - 1
    let id = 'am.xf.cut', dur = 0
    if ((isPostHook || isPreCta) && featurePool.length && rX() < (dna.mood[2] > 0.5 ? 0.8 : 0.5)) {
      const m = weightedPick(rX, featurePool, x => x.weight || 1)
      id = m.id; dur = m.dur
    }
    cuts.push({ at: scenes[i].t0, id, dur, seed: (seed ^ (i * 0x85ebca6b)) >>> 0 })
  }

  const duration = clamp(t, 8, 30)
  const video = {
    engine: 'aemotion', v: 1, seed, W: MW, H: MH, duration,
    brand: brief.brand || '', cta: brief.cta || '',
    dna, script, scenes, cuts,
    recipe: {
      v: 1, seed, templateId: script.templateId, dna,
      sceneIds: scenes.map(s => s.sceneId), cutIds: cuts.map(c => c.id), polarities: scenes.map(s => s.polarity),
    },
  }
  video.cutTimes = cuts.filter(c => c.dur === 0).map(c => c.at)
  return video
}
