// urvid 1.0 · FIT — el contrato de "para que SIRVE cada modulo" + el scorer del director.
// Tres ejes ORTOGONALES que el director matchea contra el brief para no usar piezas que no pegan:
//   - rubros:    a que RUBROS (de los 10 canonicos) le queda bien la pieza. '*' = neutral/universal.
//   - register:  la VIBE/formalidad (corporate..playful) -> se matchea contra brief.seriousness.
//   - intensity: cuanto PESA visualmente (calm..loud) -> se penaliza lo fuerte en briefs serios.
// El scoring es SUAVE (afinidad, no exclusion dura): una pieza fuera de su rubro/vibe NO se prohibe, se
// DESPRIORIZA. Asi hay variedad pero deja de usarse lo que no corresponde. El TONO si es filtro duro
// (un modulo dark-only no entra a un build claro). register/intensity son OPCIONALES: si faltan se
// INFIEREN de los tags (back-compat -> el motor anda igual aunque un modulo no este auditado todavia).

// rubros canonicos = los unicos que conocen el estudio + la perception. Toda la metadata se normaliza a estos.
export const RUBROS = ['default', 'tech', 'finanzas', 'moda', 'gastronomia', 'educacion', 'salud', 'fitness', 'inmobiliaria', 'belleza', 'eventos']

// register -> la SERIEDAD que le sienta (0..1). El director compara con brief.seriousness.
export const REGISTERS = { corporate: 0.85, editorial: 0.65, neutral: 0.5, friendly: 0.4, playful: 0.2 }
// intensity -> el PESO visual (0..1). Lo alto se tolera menos cuanto mas serio es el brief.
export const INTENSITIES = { calm: 0.2, soft: 0.4, medium: 0.6, bold: 0.8, loud: 1.0 }

// alias de tokens de rubro viejos/no-canonicos -> canonico (normaliza la metadata historica + sirve de hint a los agentes).
const RUBRO_ALIAS = {
  arte: 'moda', gaming: 'tech', legal: 'finanzas', corporativo: 'finanzas',
  servicios: 'default', retail: 'default', turismo: 'default', social: 'default', creatividad: 'moda',
  musica: 'moda', logistica: 'tech', startup: 'tech', construccion: 'inmobiliaria', industria: 'tech',
  editorial: 'default', seguros: 'finanzas', deportes: 'fitness', deporte: 'fitness', hogar: 'inmobiliaria',
  ecommerce: 'default', automotor: 'default', podcast: 'default', marketing: 'tech', agro: 'default',
  lujo: 'moda', viajes: 'default', veterinaria: 'salud', transporte: 'tech', telecom: 'tech',
  peluqueria: 'belleza', mascotas: 'default', lectura: 'educacion', lavanderia: 'default',
  jardineria: 'default', entretenimiento: 'default', energia: 'tech', cafe: 'gastronomia',
}
export function canonRubro(r) {
  if (r === '*') return '*'
  if (RUBROS.indexOf(r) >= 0) return r
  return RUBRO_ALIAS[r] || 'default'
}

// --- INFERENCIA desde tags (fallback cuando register/intensity no estan declarados explicitos) ---
const T_PLAYFUL = new Set(['y2k', 'cyber', 'glitch', 'retro', 'joven', 'pop', 'vibrante', 'neon', 'chrome', 'jugado', 'divertido', 'gaming', 'kinetico', 'snappy', 'rebote', 'elastico', 'arcade'])
const T_CORP = new Set(['sobrio', 'sobria', 'corporativo', 'tecnico', 'swiss', 'institucional', 'formal', 'legal', 'preciso'])
const T_EDIT = new Set(['premium', 'editorial', 'cinematografico', 'lujo', 'elegante', 'dramatico', 'masivo', 'mega-tipografia'])
const T_FRIEND = new Set(['calido', 'amigable', 'humano', 'cercano', 'organico'])
const T_LOUD = new Set(['impacto', 'potente', 'bold', 'saturado', 'vibrante', 'neon', 'glitch', 'energico', 'dramatico', 'masivo'])
const T_CALM = new Set(['calmo', 'calma', 'sutil', 'suave', 'minimal', 'quieto', 'fino', 'limpio'])

export function inferRegister(mod) {
  const tags = mod.tags || []
  if (tags.some(t => T_PLAYFUL.has(t))) return 'playful'
  if (tags.some(t => T_CORP.has(t))) return 'corporate'
  if (tags.some(t => T_EDIT.has(t))) return 'editorial'
  if (tags.some(t => T_FRIEND.has(t))) return 'friendly'
  return 'neutral'
}
export function inferIntensity(mod) {
  const tags = mod.tags || []
  if (tags.some(t => T_LOUD.has(t))) return 'loud'
  if (tags.some(t => T_CALM.has(t))) return 'calm'
  return 'medium'
}
const registerVal = (mod) => REGISTERS[mod.register] ?? REGISTERS[inferRegister(mod)]
const intensityVal = (mod) => INTENSITIES[mod.intensity] ?? INTENSITIES[inferIntensity(mod)]

// --- los tres factores de afinidad (todos SUAVES, nunca 0 duro) ---
// rubro: universal/neutral = pleno; listado = favorito; especifico-pero-fuera-de-este-rubro = desprioriza.
export function rubroAffinity(mod, rubro) {
  const rs = (mod.rubros && mod.rubros.length) ? mod.rubros : ['*']
  if (rs[0] === '*') return 1.0                          // universal
  if (!rubro || rubro === 'default') return 0.9          // brief sin rubro claro -> casi neutro
  for (const r of rs) if (canonRubro(r) === rubro) return 1.3   // hace match -> favorito
  return 0.45                                            // tiene vibe de otro rubro -> baja, no se prohibe
}
// register: cercania entre la seriedad del brief y la que le sienta al modulo. Cae fuerte pero nunca a 0.
export function registerFit(mod, seriousness) {
  const s = seriousness == null ? 0.5 : seriousness
  const d = Math.abs(s - registerVal(mod))               // 0..~0.65
  return Math.max(0.2, 1 - d * 1.1)
}
// intensity: lo FUERTE se penaliza cuando el brief es serio; lo calmo es neutro. Suave.
export function intensityFit(mod, seriousness) {
  const s = seriousness == null ? 0.5 : seriousness
  const i = intensityVal(mod)
  const tolerated = 1 - 0.55 * s                         // serio(0.85)->0.53 ; relajado(0.2)->0.89
  const over = Math.max(0, i - tolerated)
  return Math.max(0.3, 1 - over * 1.4)
}

// SCORER unico que el director usa como weightOf de weightedPick (reemplaza al viejo wadj de seriedad).
// ctx = { rubro, seriousness }. Las escenas multiplican ademas por sceneBias (señal de contenido).
export function fitWeight(mod, ctx = {}) {
  const w = mod.weight == null ? 1 : mod.weight
  return Math.max(0, w) * rubroAffinity(mod, ctx.rubro) * registerFit(mod, ctx.seriousness) * intensityFit(mod, ctx.seriousness)
}
