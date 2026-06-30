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
// PSICOLOGIA DE COLOR: hue PREFERIDO por rubro (grados HSL 0..360). Suave, nunca filtro duro.
// finanzas->azul/confianza · salud->verde-teal · gastronomia->calido rojo-ambar · belleza->rosa-violeta · tech->azul-cian
// educacion->azul-amistoso · fitness->naranja-energia · inmobiliaria->verde-tierra · moda->magenta · eventos->violeta-fiesta.
export const RUBRO_HUE = { finanzas: 215, salud: 165, gastronomia: 25, belleza: 330, tech: 200, educacion: 220, fitness: 30, inmobiliaria: 150, moda: 320, eventos: 285, default: null }
const _hueDist = (a, b) => Math.abs(((a - b) % 360 + 540) % 360 - 180)   // 0..180, distancia angular mas corta
// hue: SOLO los modulos de color que portan un hue de acento legible declaran mod.hue (grados). Sin hue -> 1.0 (neutro,
// back-compat: el resto de las libs no son color). Misma forma SUAVE que rubroAffinity: cae con la distancia hue<->rubro
// pero NUNCA a 0 (afinidad, no exclusion). dist 0 -> 1.25 (match); 180 -> 0.55 (opuesto). Es un desempate fino, no domina.
export function hueAffinity(mod, rubro) {
  if (mod.hue == null || !rubro || rubro === 'default') return 1.0
  const target = RUBRO_HUE[rubro]
  if (target == null) return 1.0
  return 1.25 - 0.7 * (_hueDist(mod.hue, target) / 180)
}
// TEMPERATURA del fondo vs HUE de la paleta del video. Solo los backgrounds que portan mod.temp declaran su temperatura
// ('warm'|'cool'); el resto -> 1.0 (back-compat: no son temp-aware). Un fondo calido pega con paleta calida y el frio con
// frio -> coherencia cromatica. SUAVE (1.18 match .. 0.6 opuesto, nunca 0): desempate fino, no domina la seleccion.
export const TEMP_HUE = { warm: 35, cool: 210 }   // centro calido (ambar/rojo) y frio (azul/cian) en grados HSL
export function bgTempAffinity(mod, paletteHue) {
  if (mod.temp == null || mod.temp === 'neutral' || paletteHue == null) return 1.0
  const center = TEMP_HUE[mod.temp]
  if (center == null) return 1.0
  return 1.18 - 0.58 * (_hueDist(paletteHue, center) / 180)
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
// LEGIBILIDAD del pairing (deriva de tags YA presentes en libs/typography/index.js). 'legible' = grotesk/sans neutro
// (alta lectura en cuerpo/listas); 'display' = condensada/decorativa/dramatica (lee peor cuanto mas denso el contenido).
// Tags verificados contra los pairings reales. SUAVE, nunca 0.
const T_LEGIBLE = new Set(['limpio', 'moderno', 'neutro', 'sobrio', 'prolijo', 'swiss', 'geometrico', 'amigable', 'calido', 'humano', 'corporativo', 'tight', 'lectura', 'saas', 'confianza', 'contraste', 'clasico', 'startup'])
const T_DISPLAY = new Set(['condensado', 'display', 'dramatico', 'impacto', 'poster', 'maximal', 'brutalista', 'industrial', 'funk', 'retro', 'vintage', 'chunky', 'goloso', 'cyber', 'futurista', 'glamour'])
// caracter de legibilidad de un pairing en [-1..+1]: +legible / -display.
function legChar(mod) {
  const tags = mod.tags || []
  let leg = 0, dis = 0
  for (const t of tags) { if (T_LEGIBLE.has(t)) leg++; if (T_DISPLAY.has(t)) dis++ }
  if (leg === 0 && dis === 0) return 0
  return (leg - dis) / (leg + dis)
}
// 4to eje ORTOGONAL: densidad-de-texto-del-brief x caracter-del-pairing. Brief DENSO -> sesga a pairings legibles y
// aleja de los display. SOLO afecta modulos con .fonts (pairings); el resto -> 1.0 (back-compat: color/motion/typekit/
// mark/bg no tienen .fonts -> byte-identicos, determinismo intacto). SUAVE, nunca 0 (banda [0.7..1.27]).
export function legibilityFit(mod, density) {
  if (density == null || !mod.fonts) return 1.0
  const c = legChar(mod)
  if (c === 0) return 1.0
  return Math.max(0.7, 1 + density * 0.27 * c)
}

// SESGO de LAYOUT por la FORMA del contenido (no solo rubro/seriedad): una lista larga encaja en un preset aireado;
// un dato gigante en uno centrado; un claim editorial en editorial.left. Solo-boost (>=1, nunca penaliza), PURO sobre
// sig (sin r()). Tags TEXTUALES de libs/layouts/index.js. Se pasa como scoreFn del pick de layout -> mismo consumo PRNG.
const LAYOUT_RULES = [
  { on: s => s.hasList || s.items >= 3, tags: ['aireado', 'espaciado', 'respira', 'arriba'], boost: 1.5 },
  { on: s => s.hasData, tags: ['centrado', 'simetrico', 'compacto', 'universal'], boost: 1.4 },
  { on: s => s.hasCompare, tags: ['centrado', 'simetrico', 'compacto'], boost: 1.3 },
  { on: s => s.longClaim || s.audienceNamed, tags: ['editorial', 'izquierda', 'poster', 'masivo', 'tapa', 'asimetrico'], boost: 1.5 },
  { on: s => s.isQuestion, tags: ['poster', 'masivo', 'arriba', 'editorial'], boost: 1.3 },
]
export function layoutBias(mod, sig) {
  if (!sig) return 1
  let b = 1; const tags = mod.tags || []
  for (const rule of LAYOUT_RULES) if (rule.on(sig) && tags.some(t => rule.tags.indexOf(t) >= 0)) b *= rule.boost
  return b
}

// SCORER unico que el director usa como weightOf de weightedPick (reemplaza al viejo wadj de seriedad).
// ctx = { rubro, seriousness, paletteHue, density }. Las escenas multiplican ademas por sceneBias (señal de contenido).
export function fitWeight(mod, ctx = {}) {
  const w = mod.weight == null ? 1 : mod.weight
  return Math.max(0, w) * rubroAffinity(mod, ctx.rubro) * hueAffinity(mod, ctx.rubro) * bgTempAffinity(mod, ctx.paletteHue) * registerFit(mod, ctx.seriousness) * intensityFit(mod, ctx.seriousness) * legibilityFit(mod, ctx.density)
}
