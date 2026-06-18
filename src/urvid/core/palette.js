// urvid 1.0 · PALETA — el contrato de color. De (color de marca, tono, rubro, semilla) deriva los ROLES con
// LEGIBILIDAD garantizada. Es lo que consumen backgrounds/typography/scenes (no hardcodean color). Determinista.
// Roles: bg0/bg1 (fondo), surface (paneles), accent/accent2 (marca), ink/dim (texto), inkText (acento usable COMO
// texto, legible por tono -> regla "texto en tinta, acento en deco" que validamos con el legibility-check).

import { hexToHsl, hslToHex, lighten, darken, clamp, contrast, legibleOn } from './util.js'
import { seedFor, range } from './prng.js'

// acento usable COMO texto, legible segun el tono. En claro: si el acento es de alta luminancia (verde/amarillo)
// no contrasta -> cae a tinta oscura neutra (lo aprendido con el gate). En oscuro: el acento aclarado.
function accentAsText(accent, tone) {
  if (tone === 'light') {
    const dark = darken(accent, 0.55)
    return contrast(dark, '#ffffff') >= 3.2 ? dark : '#1c1510'   // si ni oscurecido contrasta -> tinta neutra
  }
  return lighten(accent, 0.2)
}

export function derivePalette(brandColor, { tone = 'dark', rubro = 'default', seed = 1 } = {}) {
  const prng = seedFor(seed, 'color')
  const a = hexToHsl(brandColor || '#5b8cff')
  // acento principal: respeta el hue de marca, brillo/saturacion clamped a un rango vivo+legible
  const accent = hslToHex(a.h, clamp(a.s, 0.5, 0.92), clamp(a.l, 0.42, 0.68))
  // acento 2: corrimiento de hue sembrado (analogo/split) -> gradientes de marca, no candy random
  const shift = range(prng, 18, 42) * (prng() < 0.5 ? -1 : 1)
  const accent2 = hslToHex(a.h + shift, clamp(a.s * 0.92, 0.45, 0.9), clamp(a.l + 0.04, 0.42, 0.7))

  if (tone === 'light') {
    const bg0 = hslToHex(a.h, 0.18, 0.965), bg1 = hslToHex(a.h, 0.14, 0.92)
    return {
      tone, accent, accent2,
      bg0, bg1, surface: 'rgba(20,16,24,0.05)',
      ink: '#1c1510', dim: '#564a3e', inkText: accentAsText(accent, 'light'),
      onAccent: '#ffffff',   // texto sobre una pildora/barra de acento
    }
  }
  // dark
  const bg0 = hslToHex(a.h, clamp(a.s * 0.5, 0.2, 0.55), 0.07), bg1 = hslToHex(a.h, clamp(a.s * 0.45, 0.18, 0.5), 0.03)
  return {
    tone, accent, accent2,
    bg0, bg1, surface: 'rgba(255,255,255,0.05)',
    ink: '#fbf6ec', dim: '#cfc6d6', inkText: accentAsText(accent, 'dark'),
    onAccent: hexToHsl(accent).l > 0.6 ? '#14090e' : '#fbf6ec',
  }
}
