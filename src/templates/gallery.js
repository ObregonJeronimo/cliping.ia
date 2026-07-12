// templates · GALERIA — set de templates de FABRICA (curados por Claude). Parametrizados: los slots
// se rellenan con el brief de cada marca. Vienen built-in en el editor (galeria). Cada uno es un
// sistema visual distinto (fondo + objetos + animaciones + ritmo). Todo dato puro -> determinista.

const eyebrow = (text, y, extra = {}) => ({ type: 'text', y, text, style: { size: 30, weight: 700, color: 'dim', tracking: 4 }, anim: { in: 'fade', inDur: 0.5, idle: 'drift', out: 'fade', ...extra.anim } })
const cta = (y = 0.46, color = 'onAccent') => ({ type: 'text', y, slot: { kind: 'cta', maxChars: 22 }, style: { size: 64, weight: 900, color }, anim: { in: 'pop', inDur: 0.55, idle: 'pulse', out: 'none' } })
const brandSmall = (y, color = 'onAccent') => ({ type: 'text', y, slot: { kind: 'brand', maxChars: 22 }, style: { size: 24, weight: 600, color, tracking: 3 }, anim: { in: 'fade', delay: 0.4, out: 'none' } })

export const GALLERY = [
  // 1 · LANZAMIENTO — oscuro, dramatico, glow
  {
    id: 'g.lanzamiento', name: 'Lanzamiento', mode: 'dark', scenes: [
      { id: 's1', dur: 3.2, background: { ref: 'bg.spotlight' }, layers: [
        eyebrow('PRESENTAMOS', 0.34),
        { type: 'text', y: 0.49, slot: { kind: 'brand', maxChars: 18 }, style: { size: 104, weight: 900, color: 'ink' }, anim: { in: 'cascade', inDur: 1, idle: 'drift', out: 'fade' } },
        { type: 'object', objectId: 'ring-trim', x: 0.5, y: 0.49, params: { r: 150, width: 2, color: 'accent', glow: 0.5, dur: 1.6, spinSec: 12 }, anim: { in: 'fade', inDur: 0.6, delay: 0.4, idle: 'spin', out: 'fade' } },
      ] },
      { id: 's2', dur: 3.4, background: { ref: 'bg.glow-corner' }, layers: [
        { type: 'text', y: 0.47, slot: { kind: 'headline', maxChars: 40, maxLines: 3 }, style: { size: 76, weight: 900, color: 'ink' }, anim: { in: 'cascade', idle: 'drift', out: 'fade' } },
      ] },
      { id: 's3', dur: 2.8, background: { ref: 'bg.mesh' }, layers: [
        { type: 'object', objectId: 'morph', x: 0.5, y: 0.4, params: { from: 'square', to: 'drop', size: 70, degPerSec: 18, fill: { gradient: ['accent', 'accent2'], angle: 60 }, glow: 0.8 }, anim: { in: 'pop', inDur: 0.7, idle: 'float', out: 'fade' } },
        { type: 'text', y: 0.72, slot: { kind: 'tagline', maxChars: 30, maxLines: 2 }, style: { size: 42, weight: 800, color: 'ink' }, anim: { in: 'rise', delay: 0.6, out: 'fade' } },
      ] },
      { id: 's4', dur: 3, background: { ref: 'bg.accent' }, layers: [cta(0.44), brandSmall(0.56)] },
    ],
  },

  // 2 · OFERTA — energico, acento, el numero manda
  {
    id: 'g.oferta', name: 'Oferta', mode: 'dark', scenes: [
      { id: 's1', dur: 2.8, background: { ref: 'bg.duotone' }, layers: [
        eyebrow('SOLO POR HOY', 0.3, { anim: { in: 'slide-l' } }),
        { type: 'text', y: 0.52, slot: { kind: 'stat', maxChars: 8 }, style: { size: 150, weight: 900, color: 'onAccent' }, anim: { in: 'zoom-in', inDur: 0.6, idle: 'pulse', out: 'scale' } },
        { type: 'text', y: 0.68, slot: { kind: 'statLabel', maxChars: 24 }, style: { size: 34, weight: 700, color: 'onAccent' }, anim: { in: 'rise', delay: 0.5, out: 'fade' } },
      ] },
      { id: 's2', dur: 3, background: { ref: 'bg.glow-corner' }, layers: [
        { type: 'text', y: 0.47, slot: { kind: 'headline', maxChars: 38, maxLines: 3 }, style: { size: 72, weight: 900, color: 'ink' }, anim: { in: 'cascade', out: 'slide-l' } },
        { type: 'object', objectId: 'line-draw', x: 0.5, y: 0.66, params: { len: 200, width: 5, color: 'accent', glow: 0.5, dur: 1 }, anim: { in: 'fade', delay: 0.4, out: 'fade' } },
      ] },
      { id: 's3', dur: 2.8, background: { ref: 'bg.accent' }, layers: [{ ...cta(0.44), style: { size: 68, weight: 900, color: 'onAccent' } }, brandSmall(0.56)] },
    ],
  },

  // 3 · SAAS / PRODUCTO — tech, orbital
  {
    id: 'g.saas', name: 'SaaS / Producto', mode: 'dark', scenes: [
      { id: 's1', dur: 3, background: { ref: 'bg.glow-corner' }, layers: [
        { type: 'object', objectId: 'orbit', x: 0.5, y: 0.4, params: { count: 3, r: 90, dot: 7, color: 'accent', secPerTurn: 7, glow: 0.5 }, anim: { in: 'fade', inDur: 0.6, idle: 'none', out: 'fade' } },
        { type: 'text', y: 0.4, slot: { kind: 'brand', maxChars: 16 }, style: { size: 66, weight: 900, color: 'ink' }, anim: { in: 'zoom', idle: 'drift', out: 'fade' } },
        eyebrow('LA PLATAFORMA', 0.62),
      ] },
      { id: 's2', dur: 4, background: { ref: 'bg.grid' }, layers: [
        { type: 'text', y: 0.18, text: 'BENEFICIOS', style: { size: 38, weight: 800, color: 'accent', tracking: 2 }, anim: { in: 'rise', out: 'fade' } },
        { type: 'text', y: 0.56, slot: { kind: 'list', maxItems: 3, maxChars: 26 }, style: { size: 40, weight: 700, color: 'ink', align: 'left', maxW: 0.82 }, anim: { in: 'fade', idle: 'none', out: 'fade' } },
      ] },
      { id: 's3', dur: 3, background: { ref: 'bg.mesh' }, layers: [
        { type: 'object', objectId: 'pulse', x: 0.5, y: 0.4, params: { rings: 3, r: 44, color: 'accent', width: 2, period: 1.8 }, anim: { in: 'fade', out: 'fade' } },
        { type: 'text', y: 0.4, slot: { kind: 'stat', maxChars: 8 }, style: { size: 96, weight: 900, color: 'ink' }, anim: { in: 'pop', idle: 'pulse', out: 'fade' } },
        { type: 'text', y: 0.56, slot: { kind: 'statLabel', maxChars: 22 }, style: { size: 26, weight: 600, color: 'dim' }, anim: { in: 'fade', delay: 0.4, out: 'fade' } },
      ] },
      { id: 's4', dur: 3, background: { ref: 'bg.accent' }, layers: [cta(0.44), brandSmall(0.56)] },
    ],
  },

  // 4 · TESTIMONIAL — editorial, claro, calmo
  {
    id: 'g.testimonial', name: 'Testimonial', mode: 'light', scenes: [
      { id: 's1', dur: 3.6, background: { ref: 'bg.plain' }, layers: [
        { type: 'text', y: 0.2, text: '“', style: { size: 140, weight: 900, color: 'accent' }, anim: { in: 'pop', out: 'fade' } },
        { type: 'text', y: 0.5, slot: { kind: 'headline', maxChars: 60, maxLines: 4 }, style: { size: 52, weight: 700, color: 'ink', font: 'Fraunces' }, anim: { in: 'fade', inDur: 0.8, idle: 'drift', out: 'fade' } },
        { type: 'text', y: 0.78, slot: { kind: 'brand', maxChars: 24 }, style: { size: 26, weight: 600, color: 'dim', tracking: 2 }, anim: { in: 'rise', delay: 0.8, out: 'fade' } },
      ] },
      { id: 's2', dur: 3, background: { ref: 'bg.gradient' }, layers: [
        { type: 'text', y: 0.42, slot: { kind: 'stat', maxChars: 8 }, style: { size: 130, weight: 900, color: 'accent', font: 'Fraunces' }, anim: { in: 'zoom-in', idle: 'pulse', out: 'fade' } },
        { type: 'text', y: 0.6, slot: { kind: 'statLabel', maxChars: 26 }, style: { size: 30, weight: 600, color: 'ink' }, anim: { in: 'rise', delay: 0.4, out: 'fade' } },
      ] },
      { id: 's3', dur: 2.8, background: { ref: 'bg.plain' }, layers: [
        { type: 'text', y: 0.46, slot: { kind: 'cta', maxChars: 22 }, style: { size: 58, weight: 800, color: 'accent', font: 'Fraunces' }, anim: { in: 'rise', idle: 'float', out: 'none' } },
        { type: 'object', objectId: 'line-draw', x: 0.5, y: 0.56, params: { len: 160, width: 3, color: 'accent', glow: 0, dur: 0.9 }, anim: { in: 'fade', delay: 0.5, out: 'none' } },
      ] },
    ],
  },

  // 5 · EVENTO — poster, alto contraste
  {
    id: 'g.evento', name: 'Evento', mode: 'dark', scenes: [
      { id: 's1', dur: 3, background: { ref: 'bg.duotone' }, layers: [
        { type: 'text', y: 0.44, slot: { kind: 'tagline', maxChars: 28, maxLines: 2 }, style: { size: 78, weight: 900, color: 'onAccent' }, anim: { in: 'whip', idle: 'sway', out: 'slide-l' } },
        { type: 'object', objectId: 'line-draw', x: 0.5, y: 0.6, params: { len: 240, width: 6, color: 'ink', glow: 0, dur: 1 }, anim: { in: 'fade', delay: 0.5, out: 'fade' } },
      ] },
      { id: 's2', dur: 2.8, background: { ref: 'bg.dots' }, layers: [
        { type: 'object', objectId: 'morph', x: 0.5, y: 0.38, params: { from: 'hexagon', to: 'star', size: 64, degPerSec: 30, fill: 'accent', glow: 0.5 }, anim: { in: 'peel-l', inDur: 0.9, idle: 'spin', out: 'fade' } },
        { type: 'text', y: 0.68, slot: { kind: 'headline', maxChars: 36, maxLines: 2 }, style: { size: 48, weight: 800, color: 'ink' }, anim: { in: 'rise', delay: 0.5, out: 'fade' } },
      ] },
      { id: 's3', dur: 2.8, background: { ref: 'bg.accent' }, layers: [{ ...cta(0.44), style: { size: 64, weight: 900, color: 'onAccent' } }, brandSmall(0.56)] },
    ],
  },

  // 6 · MINIMAL — elegante, claro, mucho aire
  {
    id: 'g.minimal', name: 'Minimal', mode: 'light', scenes: [
      { id: 's1', dur: 3.2, background: { ref: 'bg.plain' }, layers: [
        { type: 'text', y: 0.16, slot: { kind: 'brand', maxChars: 20 }, style: { size: 24, weight: 600, color: 'dim', tracking: 5 }, anim: { in: 'fade', out: 'fade' } },
        { type: 'text', y: 0.5, slot: { kind: 'headline', maxChars: 44, maxLines: 3 }, style: { size: 68, weight: 800, color: 'ink' }, anim: { in: 'rise', inDur: 0.8, idle: 'drift', out: 'rise' } },
      ] },
      { id: 's2', dur: 2.8, background: { ref: 'bg.plain' }, layers: [
        { type: 'object', objectId: 'blob', x: 0.5, y: 0.4, params: { r: 58, fill: { gradient: ['accent', 'accent2'], angle: 45 }, glow: 0.4 }, anim: { in: 'pop', idle: 'float', out: 'fade' } },
        { type: 'text', y: 0.7, slot: { kind: 'tagline', maxChars: 30, maxLines: 2 }, style: { size: 40, weight: 700, color: 'ink' }, anim: { in: 'fade', delay: 0.5, out: 'fade' } },
      ] },
      { id: 's3', dur: 2.8, background: { ref: 'bg.plain' }, layers: [
        { type: 'text', y: 0.46, slot: { kind: 'cta', maxChars: 22 }, style: { size: 56, weight: 800, color: 'accent' }, anim: { in: 'rise', idle: 'float', out: 'none' } },
        { type: 'object', objectId: 'line-draw', x: 0.5, y: 0.56, params: { len: 150, width: 3, color: 'accent', glow: 0, dur: 0.9 }, anim: { in: 'fade', delay: 0.5, out: 'none' } },
      ] },
    ],
  },

  // 7 · GASTRONOMIA — calido, la foto manda
  {
    id: 'g.gastro', name: 'Gastronomia', mode: 'dark', scenes: [
      { id: 's1', dur: 3.2, background: { ref: 'bg.glow-corner' }, layers: [
        { type: 'image', x: 0.5, y: 0.38, shapeStyle: { w: 300, h: 360, r: 18 }, anim: { in: 'pop', inDur: 0.6, idle: 'float', out: 'fade' } },
        { type: 'text', y: 0.74, slot: { kind: 'brand', maxChars: 18 }, style: { size: 56, weight: 900, color: 'ink', font: 'Fraunces' }, anim: { in: 'rise', delay: 0.4, out: 'fade' } },
        eyebrow('SABOR REAL', 0.84),
      ] },
      { id: 's2', dur: 3, background: { ref: 'bg.mesh' }, layers: [
        { type: 'text', y: 0.47, slot: { kind: 'headline', maxChars: 40, maxLines: 3 }, style: { size: 62, weight: 800, color: 'ink', font: 'Fraunces' }, anim: { in: 'cascade', out: 'fade' } },
      ] },
      { id: 's3', dur: 2.8, background: { ref: 'bg.accent' }, layers: [cta(0.44), brandSmall(0.56)] },
    ],
  },

  // 8 · FITNESS — bold, energetico, el resultado manda
  {
    id: 'g.fitness', name: 'Fitness', mode: 'dark', scenes: [
      { id: 's1', dur: 2.6, background: { ref: 'bg.duotone' }, layers: [
        eyebrow('TU CAMBIO EMPIEZA HOY', 0.28, { anim: { in: 'whip' } }),
        { type: 'text', y: 0.52, slot: { kind: 'stat', maxChars: 8 }, style: { size: 150, weight: 900, color: 'onAccent' }, anim: { in: 'zoom-in', idle: 'pulse', out: 'scale' } },
        { type: 'text', y: 0.68, slot: { kind: 'statLabel', maxChars: 22 }, style: { size: 32, weight: 800, color: 'onAccent' }, anim: { in: 'rise', delay: 0.4, out: 'fade' } },
      ] },
      { id: 's2', dur: 2.8, background: { ref: 'bg.spotlight' }, layers: [
        { type: 'object', objectId: 'morph', x: 0.5, y: 0.36, params: { from: 'triangle', to: 'star', size: 62, degPerSec: 40, fill: 'accent', glow: 0.6 }, anim: { in: 'peel-l', inDur: 0.8, idle: 'spin', out: 'fade' } },
        { type: 'text', y: 0.66, slot: { kind: 'headline', maxChars: 34, maxLines: 2 }, style: { size: 56, weight: 900, color: 'ink' }, anim: { in: 'rise', delay: 0.4, out: 'fade' } },
      ] },
      { id: 's3', dur: 2.6, background: { ref: 'bg.accent' }, layers: [{ ...cta(0.44), style: { size: 66, weight: 900, color: 'onAccent' } }, brandSmall(0.56)] },
    ],
  },

  // 9 · INMOBILIARIA — elegante, foto + dato
  {
    id: 'g.inmo', name: 'Inmobiliaria', mode: 'dark', scenes: [
      { id: 's1', dur: 3.2, background: { ref: 'bg.plain' }, layers: [
        { type: 'image', x: 0.5, y: 0.4, shapeStyle: { w: 340, h: 300, r: 12 }, anim: { in: 'zoom', inDur: 0.8, idle: 'drift', out: 'fade' } },
        { type: 'text', y: 0.72, slot: { kind: 'headline', maxChars: 34, maxLines: 2 }, style: { size: 46, weight: 700, color: 'ink' }, anim: { in: 'rise', delay: 0.4, out: 'fade' } },
      ] },
      { id: 's2', dur: 2.8, background: { ref: 'bg.gradient' }, layers: [
        { type: 'text', y: 0.42, slot: { kind: 'stat', maxChars: 10 }, style: { size: 110, weight: 900, color: 'accent' }, anim: { in: 'zoom-in', idle: 'pulse', out: 'fade' } },
        { type: 'text', y: 0.58, slot: { kind: 'statLabel', maxChars: 24 }, style: { size: 30, weight: 600, color: 'ink', tracking: 2 }, anim: { in: 'fade', delay: 0.4, out: 'fade' } },
      ] },
      { id: 's3', dur: 2.8, background: { ref: 'bg.accent' }, layers: [cta(0.44), brandSmall(0.56)] },
    ],
  },

  // 10 · MODA — editorial, tipografia grande, claro
  {
    id: 'g.moda', name: 'Moda', mode: 'light', scenes: [
      { id: 's1', dur: 3, background: { ref: 'bg.plain' }, layers: [
        { type: 'text', y: 0.44, slot: { kind: 'brand', maxChars: 16 }, style: { size: 120, weight: 900, color: 'ink', font: 'Playfair Display' }, anim: { in: 'cascade', idle: 'drift', out: 'rise' } },
        eyebrow('NUEVA COLECCION', 0.6),
      ] },
      { id: 's2', dur: 3, background: { ref: 'bg.duotone' }, layers: [
        { type: 'image', x: 0.5, y: 0.42, shapeStyle: { w: 300, h: 380, r: 4 }, anim: { in: 'slide-r', inDur: 0.7, idle: 'float', out: 'slide-l' } },
        { type: 'text', y: 0.82, slot: { kind: 'tagline', maxChars: 26, maxLines: 1 }, style: { size: 40, weight: 700, color: 'onAccent', font: 'Playfair Display' }, anim: { in: 'rise', delay: 0.5, out: 'fade' } },
      ] },
      { id: 's3', dur: 2.6, background: { ref: 'bg.plain' }, layers: [
        { type: 'text', y: 0.46, slot: { kind: 'cta', maxChars: 20 }, style: { size: 54, weight: 800, color: 'accent', font: 'Playfair Display' }, anim: { in: 'rise', idle: 'float', out: 'none' } },
        { type: 'object', objectId: 'line-draw', x: 0.5, y: 0.56, params: { len: 160, width: 2, color: 'ink', glow: 0, dur: 0.9 }, anim: { in: 'fade', delay: 0.5, out: 'none' } },
      ] },
    ],
  },

  // 11 · BELLEZA / SALUD — suave, claro, calmo
  {
    id: 'g.belleza', name: 'Belleza / Salud', mode: 'light', scenes: [
      { id: 's1', dur: 3.2, background: { ref: 'bg.gradient' }, layers: [
        { type: 'object', objectId: 'blob', x: 0.5, y: 0.36, params: { r: 66, fill: { gradient: ['accent', 'accent2'], angle: 50 }, glow: 0.5 }, anim: { in: 'pop', inDur: 0.7, idle: 'float', out: 'fade' } },
        { type: 'text', y: 0.66, slot: { kind: 'brand', maxChars: 20 }, style: { size: 52, weight: 700, color: 'ink', font: 'Fraunces' }, anim: { in: 'rise', delay: 0.4, out: 'fade' } },
        eyebrow('CUIDATE', 0.76),
      ] },
      { id: 's2', dur: 3, background: { ref: 'bg.plain' }, layers: [
        { type: 'text', y: 0.47, slot: { kind: 'headline', maxChars: 44, maxLines: 3 }, style: { size: 54, weight: 600, color: 'ink', font: 'Fraunces' }, anim: { in: 'fade', inDur: 0.8, idle: 'drift', out: 'fade' } },
      ] },
      { id: 's3', dur: 2.8, background: { ref: 'bg.plain' }, layers: [
        { type: 'text', y: 0.46, slot: { kind: 'cta', maxChars: 22 }, style: { size: 52, weight: 700, color: 'accent', font: 'Fraunces' }, anim: { in: 'rise', idle: 'float', out: 'none' } },
      ] },
    ],
  },

  // 12 · EDUCACION — claro, lista de lo que aprendes
  {
    id: 'g.educacion', name: 'Educacion / Curso', mode: 'dark', scenes: [
      { id: 's1', dur: 3, background: { ref: 'bg.glow-corner' }, layers: [
        eyebrow('APRENDE', 0.32),
        { type: 'text', y: 0.5, slot: { kind: 'headline', maxChars: 36, maxLines: 3 }, style: { size: 64, weight: 900, color: 'ink' }, anim: { in: 'cascade', out: 'fade' } },
      ] },
      { id: 's2', dur: 4, background: { ref: 'bg.dots' }, layers: [
        { type: 'text', y: 0.16, text: 'VAS A LOGRAR', style: { size: 34, weight: 800, color: 'accent', tracking: 2 }, anim: { in: 'rise', out: 'fade' } },
        { type: 'text', y: 0.56, slot: { kind: 'list', maxItems: 3, maxChars: 28 }, style: { size: 38, weight: 700, color: 'ink', align: 'left', maxW: 0.84 }, anim: { in: 'fade', idle: 'none', out: 'fade' } },
      ] },
      { id: 's3', dur: 2.8, background: { ref: 'bg.accent' }, layers: [cta(0.44), brandSmall(0.56)] },
    ],
  },

  // 13 · URVID — showcase propio con ESTRUCTURA de marketing (gancho -> como -> que -> rapidez ->
  // prueba -> CTA; la marca CIERRA, no abre). Demuestra las capacidades nuevas: texto KINETICO por
  // palabra, TYPEWRITER, CAMARA de escena, IMAGEN 3D (flip Y + wobble), y capas fx (Animaciones FX).
  {
    id: 'g.urvid', name: 'Urvid — Promo FX', mode: 'dark', scenes: [
      // 1 · GANCHO (propuesta de valor, sin logo) — TEXTO PINNED (sin cámara) + MASK-REVEAL + leading
      //     apretado + jerarquía (kicker chico -> hero de acento). Nace desde un borde, asienta y CONGELA.
      { id: 's1', dur: 3.0, background: { ref: 'bg.spotlight' }, layers: [
        { type: 'text', y: 0.455, text: 'Videos de marketing', pinned: true, style: { size: 38, weight: 800, color: 'ink', maxW: 0.9, maxLines: 1, tracking: 0.5 }, anim: { in: 'mask-reveal', delay: 0.15, revealDur: 0.72, out: 'fade' } },
        { type: 'text', y: 0.56, text: 'que venden.', pinned: true, style: { size: 76, weight: 900, color: 'accent2', maxW: 0.92, maxLines: 1 }, anim: { in: 'mask-reveal', delay: 0.34, revealDur: 0.72, out: 'fade' } },
      ] },
      // 2 · COMO (tu idea) — typewriter
      { id: 's2', dur: 2.6, background: { ref: 'bg.glow-corner' }, camera: { kind: 'push', amt: 0.7 }, layers: [
        { type: 'text', y: 0.34, text: 'PASO 1 · TU IDEA', style: { size: 18, weight: 800, color: 'dim', tracking: 3 }, anim: { in: 'fade', inDur: 0.4, out: 'fade' } },
        { type: 'text', y: 0.5, text: 'Escribí tu idea', style: { size: 48, weight: 900, color: 'ink' }, anim: { in: 'typewriter', cps: 9, delay: 0.3, out: 'fade' } },
      ] },
      // 3 · QUE OBTENES (el video) — IMAGEN 3D (flip Y + wobble); reemplaza animacion sin sentido
      { id: 's3', dur: 2.8, background: { ref: 'bg.mesh' }, camera: { kind: 'push', amt: 0.5 }, layers: [
        { type: 'image', x: 0.5, y: 0.36, shapeStyle: { w: 208, h: 132, r: 16, placeholder: 'video' }, anim: { in: 'flip3d', inDur: 0.8, idle: 'wobble3d', out: 'fade' } },
        { type: 'text', y: 0.66, text: 'La IA lo convierte', style: { size: 42, weight: 900, color: 'ink', maxW: 0.86 }, anim: { in: 'kinetic', delay: 0.55, stagger: 0.1, out: 'fade' } },
        { type: 'text', y: 0.75, text: 'en un video.', style: { size: 42, weight: 900, color: 'accent2' }, anim: { in: 'kinetic', delay: 0.9, stagger: 0.1, out: 'fade' } },
      ] },
      // 4 · RAPIDEZ — spinner->check
      { id: 's4', dur: 2.2, background: { ref: 'bg.glow-corner' }, layers: [
        { type: 'fx', fxId: 'check-draw', x: 0.5, y: 0.4, params: { size: 108 }, anim: { in: 'fade', inDur: 0.4, out: 'fade' } },
        { type: 'text', y: 0.66, text: 'En segundos.', style: { size: 58, weight: 900, color: 'ink' }, anim: { in: 'rise', delay: 0.3, out: 'fade' } },
      ] },
      // 5 · PRUEBA — stat + barras
      { id: 's5', dur: 2.2, background: { ref: 'bg.grid' }, layers: [
        { type: 'text', y: 0.32, text: '+2.500', style: { size: 100, weight: 900, color: 'ink' }, anim: { in: 'zoom-in', inDur: 0.5, idle: 'pulse', out: 'fade' } },
        { type: 'text', y: 0.44, text: 'videos ya creados', style: { size: 21, weight: 600, color: 'dim', tracking: 1 }, anim: { in: 'fade', delay: 0.35, out: 'fade' } },
        { type: 'fx', fxId: 'barras-crecen', x: 0.5, y: 0.64, params: { size: 108 }, anim: { in: 'fade', inDur: 0.4, delay: 0.2, out: 'fade' } },
      ] },
      // 6 · CTA + MARCA (la marca cierra)
      { id: 's6', dur: 3.0, background: { ref: 'bg.accent' }, layers: [
        { type: 'text', y: 0.42, text: 'Probalo gratis', style: { size: 72, weight: 900, color: 'onAccent' }, anim: { in: 'pop', inDur: 0.55, idle: 'pulse', out: 'none' } },
        { type: 'text', y: 0.56, text: 'urvid', style: { size: 42, weight: 900, color: 'onAccent' }, anim: { in: 'rise', delay: 0.5, out: 'none' } },
        { type: 'text', y: 0.64, text: 'urvid.app', style: { size: 18, weight: 700, color: 'onAccent', tracking: 2 }, anim: { in: 'fade', delay: 0.8, out: 'none' } },
      ] },
    ],
  },
]
