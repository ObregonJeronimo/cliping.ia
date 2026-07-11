// templates · PALETA — deriva una paleta de tokens del brandColor + modo (dark/light). Un template
// autorado usa TOKENS de color (accent / accent2 / ink / bg / surface / dim), no hex fijos, para que
// el MISMO template se adapte a la marca de cada cliente (parametrizable). Puro y determinista.

function hexToHsl(hex) {
  let h = String(hex || '#5b8cff').replace('#', '')
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
  const n = parseInt(h.slice(0, 6), 16) || 0x5b8cff
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn
  let hh = 0
  if (d > 0) { if (mx === r) hh = ((g - b) / d + (g < b ? 6 : 0)); else if (mx === g) hh = (b - r) / d + 2; else hh = (r - g) / d + 4; hh *= 60 }
  const l = (mx + mn) / 2
  return { h: hh, s: d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1)), l }
}
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360; s = clamp(s, 0, 1); l = clamp(l, 0, 1)
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2
  let r = 0, g = 0, b = 0
  if (h < 60) { r = c; g = x } else if (h < 120) { r = x; g = c } else if (h < 180) { g = c; b = x }
  else if (h < 240) { g = x; b = c } else if (h < 300) { r = x; b = c } else { r = c; b = x }
  const q = v => clamp(Math.round((v + m) * 255), 0, 255).toString(16).padStart(2, '0')
  return '#' + q(r) + q(g) + q(b)
}
function relLum(hex) { const n = parseInt(String(hex).replace('#', '').slice(0, 6), 16) || 0; const f = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }; return 0.2126 * f((n >> 16) & 255) + 0.7152 * f((n >> 8) & 255) + 0.0722 * f(n & 255) }
function contrast(a, b) { const la = relLum(a), lb = relLum(b), hi = Math.max(la, lb), lo = Math.min(la, lb); return (hi + 0.05) / (lo + 0.05) }

// deriveTemplatePalette(brandColor, mode) -> { bg, surface, ink, dim, accent, accent2, onAccent }
export function deriveTemplatePalette(brandColor, mode = 'dark') {
  const dark = mode !== 'light'
  const b = hexToHsl(brandColor || '#5b8cff')
  const achroma = b.s < 0.12
  const hue = achroma ? 220 : b.h
  let accent = hslToHex(hue, clamp((achroma ? 0.6 : b.s) + 0.05, 0.5, 0.95), dark ? 0.6 : 0.5)
  for (let i = 0; i < 8 && contrast(accent, '#fff') < 3 && contrast(accent, '#0b0b0e') < 3; i++) { const a = hexToHsl(accent); accent = hslToHex(a.h, a.s, a.l > 0.5 ? a.l - 0.06 : a.l + 0.06) }
  const accent2 = hslToHex(hue + 150, 0.65, dark ? 0.58 : 0.5)
  const bg = dark ? hslToHex(hue, 0.22, 0.06) : hslToHex(hue, 0.06, 0.96)
  const surface = dark ? hslToHex(hue, 0.2, 0.11) : hslToHex(hue, 0.05, 0.99)
  const ink = dark ? hslToHex(hue, 0.08, 0.96) : hslToHex(hue, 0.12, 0.08)
  const dim = dark ? hslToHex(hue, 0.08, 0.62) : hslToHex(hue, 0.1, 0.42)
  const onAccent = contrast(accent, '#fff') >= contrast(accent, '#0b0b0e') ? '#ffffff' : '#0b0b0e'
  return { mode: dark ? 'dark' : 'light', bg, surface, ink, dim, accent, accent2, onAccent }
}

// resuelve un color que puede ser un TOKEN ('accent'..) o un hex directo
export function resolveColor(c, pal) {
  if (!c) return pal.ink
  if (c[0] === '#') return c
  return pal[c] || c
}
