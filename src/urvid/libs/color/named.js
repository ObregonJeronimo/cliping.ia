// urvid 1.0 · biblioteca COLOR — paletas CURADAS a mano (estilo Coolors). PREFIJO: color.named.<nombre>.
// A diferencia de los esquemas, estas paletas tienen un set FIJO de hexes elegidos con gusto (NO derivados del
// brandColor). Mapeo hexes curados -> roles (accent/accent2/bg0/bg1) y SIEMPRE termino con finalize().
// El brandColor se IGNORA (la gracia es la curaduria fija); solo se usa como leve desempate determinista
// para elegir cual de los dos hexes va a accent vs accent2 (sin romper el contraste, que ya esta validado).
import { register } from '../../core/registry.js'
import { finalize } from '../../core/palette.js'
import { hexToHsl } from '../../core/util.js'

// Helper: registra una paleta curada. `p` = { accent, accent2, bg0, bg1 } (hexes FIJOS).
// El tono se declara segun el fondo real (lo verifica el script de contraste). brandColor se IGNORA a proposito:
// la gracia de una paleta curada es que es FIJA -> mismo resultado para cualquier marca (y robusta en WCAG).
// El orden accent/accent2 es FIJO: accent es el protagonista (el que va al chip). Lo elijo curado para que
// finalize() le asigne el onAccent legible correcto (su regla: accent muy claro -> texto oscuro; si no -> claro).
function named(name, tone, p, { rubros = ['*'], weight = 1, tags = [] } = {}) {
  register({
    id: 'color.named.' + name, lib: 'color', category: 'named-palettes', tones: [tone], rubros, weight, tags: ['curada', ...tags],
    hue: hexToHsl(p.accent).h,   // PSICOLOGIA DE COLOR: el hue del acento curado (fijo) -> el scorer lo matchea al rubro del brief
    derive(_brandColor, { tone: _t, seed: _seed }) {
      return finalize(p.accent, p.accent2, p.bg0, p.bg1, tone)
    },
  })
}

// ============================ PALETAS OSCURAS (tones: 'dark') ============================
// bg0/bg1 oscuros y profundos; accent/accent2 luminosos que popean. ink claro lo pone finalize().

named('midnight-bloom', 'dark', { accent: '#ff6ec7', accent2: '#7b8cff', bg0: '#161228', bg1: '#0c0a18' },
  { rubros: ['*', 'belleza', 'moda', 'eventos'], weight: 1.0, tags: ['noche', 'floral', 'vibrante'] })

named('electric-indigo', 'dark', { accent: '#7c5cff', accent2: '#33d9ff', bg0: '#14121f', bg1: '#0a0912' },
  { rubros: ['*', 'tech', 'eventos'], weight: 1.1, tags: ['neon', 'electrico', 'futurista'] })

named('deep-emerald', 'dark', { accent: '#64ecb9', accent2: '#a3e635', bg0: '#0e1a16', bg1: '#06100d' },
  { rubros: ['*', 'finanzas', 'salud', 'fitness'], weight: 1.0, tags: ['esmeralda', 'fresco', 'natural'] })

named('royal-plum', 'dark', { accent: '#c084fc', accent2: '#f0abfc', bg0: '#1a1126', bg1: '#0e0817' },
  { rubros: ['*', 'belleza', 'moda', 'eventos'], weight: 0.9, tags: ['ciruela', 'lujo', 'real'] })

named('ocean-deep', 'dark', { accent: '#57c7f9', accent2: '#22d3ee', bg0: '#0c1a26', bg1: '#061019' },
  { rubros: ['*', 'tech', 'salud', 'inmobiliaria'], weight: 1.1, tags: ['oceano', 'profundo', 'corporativo'] })

named('charcoal-amber', 'dark', { accent: '#fccd55', accent2: '#fb923c', bg0: '#1c1a17', bg1: '#100f0c' },
  { rubros: ['*', 'gastronomia', 'inmobiliaria', 'finanzas'], weight: 1.0, tags: ['ambar', 'calido', 'sobrio'] })

named('burgundy-gold', 'dark', { accent: '#e7bc6a', accent2: '#e05a6a', bg0: '#1f1014', bg1: '#13080b' },
  { rubros: ['*', 'gastronomia', 'moda', 'eventos'], weight: 0.9, tags: ['borgona', 'dorado', 'premium'] })

named('slate-teal', 'dark', { accent: '#6fe2d3', accent2: '#60a5fa', bg0: '#14191f', bg1: '#0a0e13' },
  { rubros: ['*', 'tech', 'finanzas', 'inmobiliaria'], weight: 1.2, tags: ['pizarra', 'teal', 'corporativo'] })

named('sunflower-noir', 'dark', { accent: '#fbda55', accent2: '#fde047', bg0: '#16140d', bg1: '#0c0b07' },
  { rubros: ['*', 'eventos', 'educacion', 'fitness'], weight: 0.9, tags: ['girasol', 'amarillo', 'energico'] })

named('crimson-night', 'dark', { accent: '#f43f5e', accent2: '#fb7185', bg0: '#1c1015', bg1: '#10080b' },
  { rubros: ['*', 'eventos', 'moda', 'fitness'], weight: 1.0, tags: ['carmesi', 'intenso', 'dramatico'] })

named('cyber-lime', 'dark', { accent: '#b9ec65', accent2: '#22d3ee', bg0: '#121711', bg1: '#080c08' },
  { rubros: ['*', 'tech', 'fitness', 'eventos'], weight: 0.9, tags: ['lima', 'cyber', 'joven'] })

named('cocoa-blush', 'dark', { accent: '#f4a8a8', accent2: '#e8b98c', bg0: '#1d1614', bg1: '#110c0a' },
  { rubros: ['*', 'belleza', 'gastronomia', 'moda'], weight: 0.9, tags: ['cacao', 'rubor', 'calido'] })

named('forest-mist', 'dark', { accent: '#6ee7b7', accent2: '#bef264', bg0: '#101a17', bg1: '#07100d' },
  { rubros: ['*', 'salud', 'inmobiliaria', 'educacion'], weight: 1.0, tags: ['bosque', 'verde', 'sereno'] })

named('violet-dusk', 'dark', { accent: '#a78bfa', accent2: '#f472b6', bg0: '#17131f', bg1: '#0c0915' },
  { rubros: ['*', 'belleza', 'moda', 'tech'], weight: 1.0, tags: ['violeta', 'crepusculo', 'suave'] })

named('copper-steel', 'dark', { accent: '#ff9d6c', accent2: '#7dd3fc', bg0: '#171a1d', bg1: '#0c0e11' },
  { rubros: ['*', 'tech', 'inmobiliaria', 'finanzas'], weight: 1.0, tags: ['cobre', 'acero', 'industrial'] })

named('arctic-blue', 'dark', { accent: '#67e8f9', accent2: '#a5b4fc', bg0: '#0e161f', bg1: '#070d14' },
  { rubros: ['*', 'tech', 'salud', 'finanzas'], weight: 1.0, tags: ['artico', 'frio', 'limpio'] })

named('magenta-volt', 'dark', { accent: '#f0abfc', accent2: '#818cf8', bg0: '#190f1c', bg1: '#0d0710' },
  { rubros: ['*', 'eventos', 'moda', 'tech'], weight: 0.8, tags: ['magenta', 'volt', 'audaz'] })

named('honey-graphite', 'dark', { accent: '#fcd34d', accent2: '#94a3b8', bg0: '#17181a', bg1: '#0c0d0e' },
  { rubros: ['*', 'finanzas', 'inmobiliaria', 'educacion'], weight: 1.0, tags: ['miel', 'grafito', 'profesional'] })

// ============================ PALETAS CLARAS (tones: 'light') ============================
// bg0/bg1 claros y suaves; accent/accent2 saturados que popean sobre el papel. finalize pone ink oscuro.

named('sage-cream', 'light', { accent: '#5a8a6a', accent2: '#b08968', bg0: '#f5f3ea', bg1: '#ebe7d8' },
  { rubros: ['*', 'salud', 'inmobiliaria', 'gastronomia'], weight: 1.1, tags: ['salvia', 'crema', 'organico'] })

named('nordic-frost', 'light', { accent: '#3b82c4', accent2: '#5a93a8', bg0: '#f4f7fa', bg1: '#e6edf3' },
  { rubros: ['*', 'tech', 'finanzas', 'salud'], weight: 1.1, tags: ['nordico', 'escarcha', 'minimal'] })

named('peach-coral', 'light', { accent: '#e8623f', accent2: '#d98b3a', bg0: '#fdf3ed', bg1: '#f9e6da' },
  { rubros: ['*', 'gastronomia', 'belleza', 'eventos'], weight: 1.0, tags: ['durazno', 'coral', 'fresco'] })

named('dusty-rose', 'light', { accent: '#b54a6a', accent2: '#a06c8c', bg0: '#faf2f3', bg1: '#f1e2e6' },
  { rubros: ['*', 'belleza', 'moda', 'eventos'], weight: 0.9, tags: ['rosa', 'polvoriento', 'romantico'] })

named('mint-graphite', 'light', { accent: '#1f9e8a', accent2: '#4b5563', bg0: '#f2f7f5', bg1: '#e4eeea' },
  { rubros: ['*', 'tech', 'salud', 'finanzas'], weight: 1.0, tags: ['menta', 'grafito', 'clinico'] })

named('lavender-haze', 'light', { accent: '#7c5fc0', accent2: '#c06a9e', bg0: '#f6f3fb', bg1: '#ebe4f4' },
  { rubros: ['*', 'belleza', 'moda', 'educacion'], weight: 0.9, tags: ['lavanda', 'bruma', 'suave'] })

named('citrus-pop', 'light', { accent: '#d97706', accent2: '#65a30d', bg0: '#fbf7ec', bg1: '#f3edd8' },
  { rubros: ['*', 'gastronomia', 'fitness', 'educacion'], weight: 1.0, tags: ['citrico', 'pop', 'energico'] })

named('terracotta-clay', 'light', { accent: '#b5532f', accent2: '#9a7b4f', bg0: '#f8f0e8', bg1: '#efe1d3' },
  { rubros: ['*', 'inmobiliaria', 'gastronomia', 'moda'], weight: 1.0, tags: ['terracota', 'arcilla', 'calido'] })

named('blush-navy', 'light', { accent: '#2b4a8c', accent2: '#c0617d', bg0: '#f6f4f7', bg1: '#e9e4ec' },
  { rubros: ['*', 'finanzas', 'inmobiliaria', 'moda'], weight: 1.0, tags: ['rubor', 'marino', 'elegante'] })

named('olive-sand', 'light', { accent: '#6b7d2c', accent2: '#a86a3d', bg0: '#f6f4e9', bg1: '#ece7d4' },
  { rubros: ['*', 'gastronomia', 'inmobiliaria', 'salud'], weight: 0.9, tags: ['oliva', 'arena', 'terroso'] })

named('cobalt-paper', 'light', { accent: '#1d4ed8', accent2: '#0891b2', bg0: '#f4f6fb', bg1: '#e6ebf6' },
  { rubros: ['*', 'tech', 'finanzas', 'educacion'], weight: 1.1, tags: ['cobalto', 'papel', 'confiable'] })

named('berry-linen', 'light', { accent: '#a3265a', accent2: '#7a4ba8', bg0: '#faf3f5', bg1: '#f0e3e9' },
  { rubros: ['*', 'belleza', 'moda', 'gastronomia'], weight: 0.9, tags: ['baya', 'lino', 'femenino'] })

named('teal-bone', 'light', { accent: '#0e7c7b', accent2: '#b87333', bg0: '#f3f6f5', bg1: '#e5edeb' },
  { rubros: ['*', 'salud', 'tech', 'inmobiliaria'], weight: 1.0, tags: ['teal', 'hueso', 'sobrio'] })

named('plum-oat', 'light', { accent: '#86327a', accent2: '#8a6a3a', bg0: '#f7f4ee', bg1: '#ece5da' },
  { rubros: ['*', 'belleza', 'eventos', 'moda'], weight: 0.8, tags: ['ciruela', 'avena', 'calido'] })

named('forest-paper', 'light', { accent: '#15803d', accent2: '#a16207', bg0: '#f4f6ef', bg1: '#e6ebdb' },
  { rubros: ['*', 'salud', 'inmobiliaria', 'finanzas'], weight: 1.0, tags: ['bosque', 'papel', 'natural'] })

named('rust-ash', 'light', { accent: '#c2410c', accent2: '#57534e', bg0: '#f7f4f2', bg1: '#ebe5e1' },
  { rubros: ['*', 'inmobiliaria', 'gastronomia', 'fitness'], weight: 0.9, tags: ['oxido', 'ceniza', 'industrial'] })
