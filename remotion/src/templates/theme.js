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

  // Cálido lifestyle / gastronomía / moda: atardecer, naranjas y rosas.
  'sunset-warm': {
    mode: 'dark',
    bg: 'radial-gradient(125% 85% at 50% 30%, #5a1e3a 0%, #3a1530 45%, #1a0d18 100%)',
    bgSolid: '#1a0d18',
    text: '#fff3ec',
    textMuted: '#d4a594',
    accentFrom: '#ff8a3d',
    accentTo: '#ff5a8a',
    accentGrad: 'linear-gradient(105deg, #ffb05a, #ff5a8a)',
    glow: 'rgba(255,120,90,0.34)',
    pillBg: '#2a1422',
    pillBorder: '#4a2438',
    font: "'Inter', system-ui, sans-serif",
    headWeight: 700,
    radius: 24,
    motion: { enterFrames: 18, stagger: 4, damping: 16, cameraDrift: 0.045 },
    motifs: { sparkle: true, pills: true, arcs: true },
  },

  // Energía / deporte / eventos: rojo y magenta intensos.
  'crimson-bold': {
    mode: 'dark',
    bg: 'radial-gradient(125% 85% at 50% 32%, #4a0e22 0%, #2e0a1a 46%, #120308 100%)',
    bgSolid: '#120308',
    text: '#fff0f2',
    textMuted: '#d39aa6',
    accentFrom: '#ff3b54',
    accentTo: '#ff2d95',
    accentGrad: 'linear-gradient(105deg, #ff5a3c, #ff2d95)',
    glow: 'rgba(255,59,84,0.36)',
    pillBg: '#240810',
    pillBorder: '#48121f',
    font: "'Inter', system-ui, sans-serif",
    headWeight: 700,
    radius: 14,
    motion: { enterFrames: 12, stagger: 3, damping: 11, cameraDrift: 0.06 },
    motifs: { sparkle: true, pills: true, arcs: false },
  },

  // Premium / lujo / inmobiliaria: negro y dorado.
  'gold-lux': {
    mode: 'dark',
    bg: 'radial-gradient(120% 85% at 50% 30%, #2a2310 0%, #15110a 46%, #0a0805 100%)',
    bgSolid: '#0a0805',
    text: '#fbf3e0',
    textMuted: '#bda77c',
    accentFrom: '#e6c15a',
    accentTo: '#f0d98a',
    accentGrad: 'linear-gradient(105deg, #d9a93c, #f5e2a0)',
    glow: 'rgba(230,193,90,0.28)',
    pillBg: '#1c1610',
    pillBorder: '#3a2f1c',
    font: "'Inter', system-ui, sans-serif",
    headWeight: 700,
    radius: 6,
    motion: { enterFrames: 20, stagger: 4, damping: 20, cameraDrift: 0.03 },
    motifs: { sparkle: true, pills: false, arcs: false },
  },

  // Tech / gaming / cripto: neón cyan y lima sobre casi negro.
  'cyber-neon': {
    mode: 'dark',
    bg: 'radial-gradient(125% 85% at 50% 32%, #0a2a2e 0%, #06181f 46%, #03090d 100%)',
    bgSolid: '#03090d',
    text: '#e7fff8',
    textMuted: '#79b8b0',
    accentFrom: '#22e3c4',
    accentTo: '#9bff5a',
    accentGrad: 'linear-gradient(105deg, #22e3ff, #9bff5a)',
    glow: 'rgba(34,227,196,0.34)',
    pillBg: '#08222a',
    pillBorder: '#13414a',
    font: "'Inter', system-ui, sans-serif",
    headWeight: 700,
    radius: 8,
    motion: { enterFrames: 11, stagger: 3, damping: 10, cameraDrift: 0.055 },
    motifs: { sparkle: false, pills: true, arcs: false, grid: true },
  },

  // Viajes / bienestar / finanzas: turquesa y azul profundo.
  'ocean-deep': {
    mode: 'dark',
    bg: 'radial-gradient(120% 85% at 50% 32%, #0a3a4a 0%, #082636 46%, #04121d 100%)',
    bgSolid: '#04121d',
    text: '#e8f7ff',
    textMuted: '#8bb6c8',
    accentFrom: '#2bd6c0',
    accentTo: '#2e9bff',
    accentGrad: 'linear-gradient(105deg, #34e0c4, #2e9bff)',
    glow: 'rgba(43,214,192,0.28)',
    pillBg: '#082c3c',
    pillBorder: '#154457',
    font: "'Inter', system-ui, sans-serif",
    headWeight: 700,
    radius: 18,
    motion: { enterFrames: 18, stagger: 4, damping: 17, cameraDrift: 0.04 },
    motifs: { sparkle: false, pills: true, arcs: true },
  },

  // Editorial / agencia / minimal: monocromo tinta con un acento cálido.
  'mono-ink': {
    mode: 'dark',
    bg: 'radial-gradient(120% 85% at 50% 32%, #20232a 0%, #14161b 46%, #0a0b0e 100%)',
    bgSolid: '#0a0b0e',
    text: '#f4f5f7',
    textMuted: '#9aa0aa',
    accentFrom: '#ff6a4d',
    accentTo: '#ff9166',
    accentGrad: 'linear-gradient(105deg, #ff6a4d, #ffb27a)',
    glow: 'rgba(255,106,77,0.22)',
    pillBg: '#181a20',
    pillBorder: '#2c2f37',
    font: "'Inter', system-ui, sans-serif",
    headWeight: 700,
    radius: 4,
    motion: { enterFrames: 14, stagger: 3, damping: 14, cameraDrift: 0.035 },
    motifs: { sparkle: false, pills: true, arcs: false },
  },

  // Belleza / creativo / nightlife: púrpura y rosa con glow.
  'berry-glow': {
    mode: 'dark',
    bg: 'radial-gradient(125% 85% at 50% 30%, #3a1250 0%, #260a38 46%, #120420 100%)',
    bgSolid: '#120420',
    text: '#fbeeff',
    textMuted: '#bf9bd6',
    accentFrom: '#c44dff',
    accentTo: '#ff5ad0',
    accentGrad: 'linear-gradient(105deg, #c44dff, #ff5ad0)',
    glow: 'rgba(196,77,255,0.32)',
    pillBg: '#23123a',
    pillBorder: '#3e2057',
    font: "'Inter', system-ui, sans-serif",
    headWeight: 700,
    radius: 22,
    motion: { enterFrames: 16, stagger: 4, damping: 14, cameraDrift: 0.05 },
    motifs: { sparkle: true, pills: true, arcs: true },
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

// ── Marca real: aplica el color del sitio como acento del theme ───────────────
const _hexLighten = (hex, amt) => {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.round(r + (255 - r) * amt);
  g = Math.round(g + (255 - g) * amt);
  b = Math.round(b + (255 - b) * amt);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};
const _hexA = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

// Devuelve el theme con el acento reemplazado por el color de marca (si es válido).
export function applyAccent(base, hex) {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex || '')) return base;
  const to = _hexLighten(hex, 0.32);
  return {
    ...base,
    accentFrom: hex,
    accentTo: to,
    accentGrad: `linear-gradient(105deg, ${hex}, ${to})`,
    glow: _hexA(hex, 0.4),
  };
}
