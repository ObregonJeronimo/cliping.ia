// urvid 1.0 · biblioteca MOTION — PERSONALIDADES de movimiento. Cada modulo es DATO+curvas: make() devuelve el
// objeto que el motor pone en env.motion. El director elige UNA por video -> cambia el FEEL (entrada, asentamiento,
// stagger, drift) de TODAS las escenas sin tocar cada escena. PURO + DETERMINISTA (curvas de t; sin Math.random).
// Contrato del objeto (ver core/motion.js): { ease, settle, smooth, stagger, enter:{dx,dy,scale,rotate}, enterDur, ambient }.
// REGLA DE ORO: ease/smooth MONOTONICOS (barras/reglas no se pasan de 1); settle puede hacer overshoot (pops/escala).
import { register } from '../../core/registry.js'
import { clamp, eOutCubic, eInOutCubic, eOutBack, eOutExpo, spring } from '../../core/util.js'

const C = p => clamp(p, 0, 1)
const eOutQuint = p => 1 - Math.pow(1 - p, 5)
const eOutQuart = p => 1 - Math.pow(1 - p, 4)
// FLUIDEZ · ambients (micro-vida continua, amplitudes MINIMAS: dan vida sin marear ni romper legibilidad).
// BASE es el default de toda personalidad (respiracion + flote sutil) -> ninguna escena queda muerto-estatica.
const BASE = (t, seed) => ({ x: Math.sin(t * 0.5 + (seed % 7)) * 1.1, y: Math.sin(t * 0.7 + (seed % 5)) * 1.4, scale: Math.sin(t * 0.6) * 0.005, rot: 0 })
const breathe = (t, seed) => ({ x: 0, y: Math.sin(t * 0.6 + (seed % 5)) * 0.9, scale: Math.sin(t * 0.7 + (seed % 7)) * 0.008, rot: 0 })   // mas respiracion (calmo/cine)
const driftAmb = (t, seed) => ({ x: Math.sin(t * 0.55 + (seed % 11)) * 2.2, y: Math.cos(t * 0.5 + (seed % 5)) * 1.7, scale: Math.sin(t * 0.45) * 0.005, rot: 0 })   // flota (organico/drift)
const swayX = (t, seed) => ({ x: Math.sin(t * 0.55 + (seed % 6)) * 2.6, y: Math.sin(t * 0.4) * 0.6, scale: 0, rot: 0 })   // vaiven lateral (glide)
const tiltAmb = (t, seed) => ({ x: 0, y: Math.sin(t * 0.6) * 0.7, scale: Math.sin(t * 0.5) * 0.002, rot: Math.sin(t * 0.5 + (seed % 4)) * 0.005 })   // leve cabeceo (tilt)
const calm = (t, seed) => ({ x: 0, y: 0, scale: Math.sin(t * 0.45 + (seed % 7)) * 0.0025, rot: 0 })   // casi imperceptible (preciso/tecnico)

// P: registra una personalidad. opts = curvas+params (incluye life 0..1 = fluidez/ken-burns); meta = tones/rubros/weight/tags.
function P(id, opts, meta = {}) {
  const { ease, settle, smooth = eInOutCubic, stagger, enter, enterDur, ambient = BASE, life = 0.6 } = opts
  register({
    id, lib: 'motion', category: 'personalities',
    tones: meta.tones || ['dark', 'light'], rubros: meta.rubros || ['*'], weight: meta.weight || 1, tags: meta.tags || [],
    register: meta.register, intensity: meta.intensity,   // EJES EXPLICITOS (vibe/peso): el scorer los usa directo en vez de inferir de tags (mas preciso para el match con la seriedad+audiencia).
    make() {
      return {
        id,
        ease: p => ease(C(p)),
        settle: p => settle(C(p)),
        smooth: p => smooth(C(p)),
        stagger, enter, enterDur, ambient, life,
      }
    },
  })
}

// --- las personalidades ---

P('motion.personality.clean', {
  ease: eOutCubic, settle: p => spring(p, { zeta: 0.6, freq: 2.0 }), smooth: eInOutCubic,
  stagger: 0.16, enter: { dx: 0, dy: 14, scale: 0.02, rotate: 0 }, enterDur: 0.5,
}, { weight: 1.3, register: 'neutral', intensity: 'soft', tags: ['limpio', 'sobrio', 'universal'] })

P('motion.personality.snappy', {
  ease: eOutQuint, settle: p => eOutBack(p, 2.2),
  stagger: 0.1, enter: { dx: 0, dy: 20, scale: 0.03, rotate: 0 }, enterDur: 0.42, life: 0.35,
}, { weight: 1.1, register: 'friendly', intensity: 'bold', tags: ['rapido', 'energico', 'snappy'] })

P('motion.personality.bouncy', {
  ease: eOutCubic, settle: p => spring(p, { zeta: 0.32, freq: 2.4 }),
  stagger: 0.12, enter: { dx: 0, dy: 10, scale: 0.06, rotate: 0 }, enterDur: 0.5,
}, { weight: 0.9, register: 'playful', intensity: 'bold', rubros: ['*', 'gastronomia', 'fitness', 'educacion', 'eventos'], tags: ['jugado', 'divertido', 'rebote'] })

P('motion.personality.cine', {
  ease: eInOutCubic, settle: p => spring(p, { zeta: 0.72, freq: 1.6 }), smooth: eInOutCubic,
  stagger: 0.2, enter: { dx: 0, dy: 0, scale: 0.04, rotate: 0 }, enterDur: 0.72, ambient: breathe, life: 1.0,
}, { weight: 1, register: 'editorial', intensity: 'calm', tags: ['cinematografico', 'calmo', 'premium'] })

P('motion.personality.precise', {
  ease: eOutExpo, settle: p => spring(p, { zeta: 0.85, freq: 2.2 }),
  stagger: 0.08, enter: { dx: 0, dy: 8, scale: 0.012, rotate: 0 }, enterDur: 0.4, ambient: calm, life: 0.32,
}, { weight: 1, register: 'corporate', intensity: 'calm', rubros: ['*', 'finanzas', 'inmobiliaria', 'tech', 'salud'], tags: ['preciso', 'tecnico', 'corporativo'] })

P('motion.personality.elastic', {
  ease: eOutQuint, settle: p => spring(p, { zeta: 0.26, freq: 2.6 }),
  stagger: 0.14, enter: { dx: 0, dy: 8, scale: 0.05, rotate: 0 }, enterDur: 0.55,
}, { weight: 0.85, register: 'playful', intensity: 'bold', rubros: ['*', 'gastronomia', 'fitness', 'moda', 'eventos'], tags: ['elastico', 'jugado'] })

P('motion.personality.drift', {
  ease: eOutCubic, settle: p => spring(p, { zeta: 0.75, freq: 1.7 }),
  stagger: 0.22, enter: { dx: 0, dy: 18, scale: 0.02, rotate: 0 }, enterDur: 0.8, ambient: driftAmb, life: 0.95,
}, { weight: 0.9, register: 'friendly', intensity: 'calm', tags: ['organico', 'suave', 'calmo'] })

P('motion.personality.punch', {
  ease: eOutExpo, settle: p => eOutBack(p, 3.0),
  stagger: 0.09, enter: { dx: 0, dy: 24, scale: 0.08, rotate: 0 }, enterDur: 0.38, life: 0.3,
}, { weight: 1, register: 'friendly', intensity: 'loud', rubros: ['*', 'fitness', 'eventos', 'tech'], tags: ['impacto', 'potente', 'bold'] })

P('motion.personality.glide', {
  ease: eOutQuart, settle: p => spring(p, { zeta: 0.6, freq: 2.0 }),
  stagger: 0.12, enter: { dx: 34, dy: 0, scale: 0, rotate: 0 }, enterDur: 0.55, ambient: swayX, life: 0.7,
}, { weight: 0.95, register: 'editorial', intensity: 'soft', tags: ['lateral', 'editorial', 'fluido'] })

P('motion.personality.soft', {
  ease: eOutCubic, settle: p => spring(p, { zeta: 0.78, freq: 1.8 }),
  stagger: 0.18, enter: { dx: 0, dy: 10, scale: 0.015, rotate: 0 }, enterDur: 0.55, ambient: breathe, life: 0.75,
}, { weight: 1, register: 'friendly', intensity: 'soft', rubros: ['*', 'salud', 'belleza', 'educacion', 'gastronomia'], tags: ['suave', 'amigable', 'calido'] })

P('motion.personality.kinetic', {   // MICRO-KINETICO: cascada veloz de MUCHOS items con desplazamiento minimo (vs snappy = pocos items con entrada marcada)
  ease: eOutQuint, settle: p => eOutBack(p, 2.0),
  stagger: 0.04, enter: { dx: 0, dy: 10, scale: 0.014, rotate: 0 }, enterDur: 0.34, life: 0.4,
}, { weight: 0.95, register: 'friendly', intensity: 'bold', tags: ['kinetico', 'rapido', 'energico'] })

P('motion.personality.tilt', {
  ease: eOutCubic, settle: p => spring(p, { zeta: 0.5, freq: 2.0 }),
  stagger: 0.13, enter: { dx: 10, dy: 8, scale: 0.03, rotate: 0.03 }, enterDur: 0.5, ambient: tiltAmb, life: 0.6,
}, { weight: 0.8, register: 'editorial', intensity: 'medium', rubros: ['*', 'moda', 'eventos', 'default'], tags: ['dinamico', 'editorial', 'tilt'] })
