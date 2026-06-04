/**
 * Sistema de themes para las plantillas de video.
 *
 * Un THEME es el "look": colores, tipografía, personalidad de movimiento y
 * motivos. Las ESCENAS (scenes/) son agnósticas de contenido y se renderizan
 * con el theme que les pase el director. Así, la misma escena bajo dos themes
 * distintos da dos videos visualmente distintos (saas vs dietética vs sistema)
 * sin duplicar plantillas.
 *
 * Para agregar un rubro nuevo: agregás un theme acá. No tocás las escenas.
 */

export const THEMES = {
  // El look del ejemplo de referencia (explainer de SaaS).
  'saas-explainer': {
    mode: 'dark',
    bg: 'radial-gradient(125% 85% at 50% 33%, #2a1356 0%, #150d28 44%, #0b0b13 100%)',
    bgSolid: '#0b0b13',
    text: '#f5f3fb',
    textMuted: '#9b93b8',
    accentFrom: '#a855f7',
    accentTo: '#e0489f',
    accentGrad: 'linear-gradient(105deg, #a855f7, #e0489f)',
    glow: 'rgba(124,31,222,0.45)',
    pillBg: '#15131f',
    pillBorder: '#2f2746',
    font: "'Inter', system-ui, sans-serif",
    headWeight: 700,
    radius: 20,
    motion: { enterFrames: 16, stagger: 4, damping: 14, cameraDrift: 0.05 },
    motifs: { sparkle: true, pills: true, arcs: true },
  },

  // Dietética / productos naturales: cálido, calmo, orgánico.
  'organic-natural': {
    mode: 'dark',
    bg: 'radial-gradient(120% 85% at 50% 32%, #0f4a39 0%, #093124 46%, #04190f 100%)',
    bgSolid: '#04190f',
    text: '#f3f7ec',
    textMuted: '#9cc4ad',
    accentFrom: '#e8b04b',
    accentTo: '#9be7b8',
    accentGrad: 'linear-gradient(105deg, #f0c069, #7fd9a8)',
    glow: 'rgba(232,176,75,0.30)',
    pillBg: '#0c3a2c',
    pillBorder: '#1c5a44',
    font: "'Inter', system-ui, sans-serif",
    headWeight: 700,
    radius: 28,
    motion: { enterFrames: 20, stagger: 5, damping: 18, cameraDrift: 0.035 },
    motifs: { sparkle: false, pills: true, arcs: false, blobs: true },
  },

  // Sistema / software serio (consultorios, B2B): preciso, formal, frío.
  'clinical-formal': {
    mode: 'dark',
    bg: 'radial-gradient(120% 85% at 50% 34%, #0b1f3a 0%, #081730 46%, #050e1d 100%)',
    bgSolid: '#050e1d',
    text: '#eaf4ff',
    textMuted: '#8fb0d4',
    accentFrom: '#36c5e0',
    accentTo: '#3b82f6',
    accentGrad: 'linear-gradient(105deg, #5fe0f0, #3b82f6)',
    glow: 'rgba(54,197,224,0.22)',
    pillBg: '#0a2440',
    pillBorder: '#1d3a5c',
    font: "'Inter', system-ui, sans-serif",
    headWeight: 700,
    radius: 10,
    motion: { enterFrames: 12, stagger: 3, damping: 12, cameraDrift: 0.02 },
    motifs: { sparkle: false, pills: true, arcs: false, grid: true },
  },
};

export const DEFAULT_THEME = 'saas-explainer';

export function getTheme(name) {
  return THEMES[name] || THEMES[DEFAULT_THEME];
}

// Helpers de animación compartidos (mismos que usa el forge).
export const easeOut = (t) => 1 - Math.pow(1 - t, 3);
export const easeInOut = (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const lerp = (a, b, t) => a + (b - a) * t;

// Ajusta el tamaño del título según el largo del texto (evita desbordes).
export const fitHeadline = (text, base = 120, min = 54) => {
  const t = (text || '').length;
  return clamp(min, base - Math.max(0, t - 22) * 0.95, base);
};

export const segText = (segs) => (segs || []).map((s) => s.t).join('');
