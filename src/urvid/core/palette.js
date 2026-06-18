// urvid 1.0 · PALETA — el contrato de color. ROLES con legibilidad garantizada (regla texto-en-tinta).
// finalize() es el FINALIZADOR compartido: dado accent/accent2/bg0/bg1 + tono, computa los roles de texto legibles.
// Los modulos de la biblioteca color/ deciden accent/accent2/bg0/bg1 (el "esquema") y llaman finalize -> el motor
// garantiza legibilidad sin que cada esquema repita la logica. derivePalette = el esquema por defecto (back-compat).
import { hexToHsl, hslToHex, lighten, darken, clamp, contrast } from './util.js'
import { seedFor, range } from './prng.js'

// acento usable COMO texto, legible segun tono (verde/amarillo de alta luminancia caen a tinta en claro).
function accentAsText(accent, tone) {
  if (tone === 'light') { const d = darken(accent, 0.55); return contrast(d, '#ffffff') >= 3.2 ? d : '#1c1510' }
  return lighten(accent, 0.2)
}

// FINALIZER compartido: roles de texto/superficie legibles para CUALQUIER esquema.
export function finalize(accent, accent2, bg0, bg1, tone) {
  if (tone === 'light') return {
    tone, accent, accent2, bg0, bg1, surface: 'rgba(20,16,24,0.05)',
    ink: '#1c1510', dim: '#564a3e', inkText: accentAsText(accent, 'light'), onAccent: '#ffffff',
  }
  return {
    tone, accent, accent2, bg0, bg1, surface: 'rgba(255,255,255,0.05)',
    ink: '#fbf6ec', dim: '#cfc6d6', inkText: accentAsText(accent, 'dark'),
    onAccent: hexToHsl(accent).l > 0.6 ? '#14090e' : '#fbf6ec',
  }
}

// fondos por tono a partir del hue de marca (reusable por los modulos de color)
export function tonedBg(brandHsl, tone, satMul = 1, lightL = 0.07, darkL = 0.03) {
  if (tone === 'light') return [hslToHex(brandHsl.h, 0.18, 0.965), hslToHex(brandHsl.h, 0.14, 0.92)]
  return [hslToHex(brandHsl.h, clamp(brandHsl.s * 0.5 * satMul, 0.2, 0.55), lightL), hslToHex(brandHsl.h, clamp(brandHsl.s * 0.45 * satMul, 0.18, 0.5), darkL)]
}

// esquema POR DEFECTO (back-compat: lo usa el motor si no hay biblioteca color/ o como fallback).
export function derivePalette(brandColor, { tone = 'dark', rubro = 'default', seed = 1 } = {}) {
  const prng = seedFor(seed, 'color')
  const a = hexToHsl(brandColor || '#5b8cff')
  const accent = hslToHex(a.h, clamp(a.s, 0.5, 0.92), clamp(a.l, 0.42, 0.68))
  const shift = range(prng, 18, 42) * (prng() < 0.5 ? -1 : 1)
  const accent2 = hslToHex(a.h + shift, clamp(a.s * 0.92, 0.45, 0.9), clamp(a.l + 0.04, 0.42, 0.7))
  const [bg0, bg1] = tonedBg(a, tone)
  return finalize(accent, accent2, bg0, bg1, tone)
}
