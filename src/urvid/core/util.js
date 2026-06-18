// urvid 1.0 · util — math + color + fuentes. Puro, sin estado, sin DOM (solo el ctx que le pasen).
// Base compartida por TODOS los modulos de las bibliotecas. No depende de engineCore (urvid 1.0 vive aparte).

export const W = 405, H = 720, FPS = 30, TAU = Math.PI * 2

// ---- math ----
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
export const lerp = (a, b, t) => a + (b - a) * t
export const inv = (t, a, b) => clamp((t - a) / (b - a || 1e-6), 0, 1)   // progreso normalizado en [a,b]
export const mix = (a, b, t) => a + (b - a) * t

// ---- easings ----
export const eOutCubic = t => 1 - Math.pow(1 - t, 3)
export const eInCubic = t => t * t * t
export const eInOutCubic = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
export const eOutBack = (t, s = 1.7) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2)
export const eOutExpo = t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)
export const smooth = t => t * t * (3 - 2 * t)
// spring analitico (oscilador amortiguado) -> asentamiento premium, determinista por progreso
export function spring(t, { zeta = 0.5, freq = 2.0 } = {}) {
  if (t <= 0) return 0; if (t >= 1) return 1
  const w = freq * TAU, zd = zeta * w, wd = w * Math.sqrt(Math.max(0, 1 - zeta * zeta))
  return 1 - Math.exp(-zd * t) * (Math.cos(wd * t) + (zd / (wd || 1)) * Math.sin(wd * t))
}

// ---- color (hex <-> hsl, lighten/darken, rgba) ----
export function hexToHsl(hex) {
  let h = (hex || '#888').replace('#', '')
  if (h.length === 3) h = h.split('').map(c => c + c).join('')
  const r = parseInt(h.slice(0, 2), 16) / 255, g = parseInt(h.slice(2, 4), 16) / 255, b = parseInt(h.slice(4, 6), 16) / 255
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn
  let hue = 0
  if (d) {
    if (mx === r) hue = ((g - b) / d) % 6
    else if (mx === g) hue = (b - r) / d + 2
    else hue = (r - g) / d + 4
    hue *= 60; if (hue < 0) hue += 360
  }
  const l = (mx + mn) / 2, s = d ? d / (1 - Math.abs(2 * l - 1)) : 0
  return { h: hue, s, l }
}
export function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360; s = clamp(s, 0, 1); l = clamp(l, 0, 1)
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2
  let r = 0, g = 0, b = 0
  if (h < 60) [r, g, b] = [c, x, 0]; else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]; else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]; else [r, g, b] = [c, 0, x]
  const hx = v => Math.round((v + m) * 255).toString(16).padStart(2, '0')
  return '#' + hx(r) + hx(g) + hx(b)
}
export function lighten(hex, amt) { const a = hexToHsl(hex); return hslToHex(a.h, a.s, clamp(a.l + (1 - a.l) * amt, 0, 1)) }
export function darken(hex, amt) { const a = hexToHsl(hex); return hslToHex(a.h, a.s, clamp(a.l * (1 - amt), 0, 1)) }
export function rgba(hex, alpha) {
  let h = (hex || '#000').replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join('')
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${clamp(alpha, 0, 1)})`
}
// luminancia relativa + contraste WCAG (el guard de legibilidad del motor nuevo)
function _lin(c) { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }
export function luminance(hex) { let h = hex.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); return 0.2126 * _lin(parseInt(h.slice(0, 2), 16)) + 0.7152 * _lin(parseInt(h.slice(2, 4), 16)) + 0.0722 * _lin(parseInt(h.slice(4, 6), 16)) }
export function contrast(a, b) { const la = luminance(a), lb = luminance(b), hi = Math.max(la, lb), lo = Math.min(la, lb); return (hi + 0.05) / (lo + 0.05) }
// devuelve el color (de 'ink' u 'onLight') que mejor contrasta con bg -> texto SIEMPRE legible (regla dura)
export function legibleOn(bg, ink = '#fbf6ec', dark = '#161018') { return contrast(ink, bg) >= contrast(dark, bg) ? ink : dark }

// ---- fuentes ----
const FALLBACK = 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif'
export function fontStr(weight, size, family) { return `${weight} ${Math.round(size)}px "${family || 'Inter'}",${FALLBACK}` }
