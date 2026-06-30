// urvid 1.0 · PALETA — el contrato de color. ROLES con legibilidad garantizada (regla texto-en-tinta).
// finalize() es el FINALIZADOR compartido: dado accent/accent2/bg0/bg1 + tono, computa los roles de texto legibles.
// Los modulos de la biblioteca color/ deciden accent/accent2/bg0/bg1 (el "esquema") y llaman finalize -> el motor
// garantiza legibilidad sin que cada esquema repita la logica. derivePalette = el esquema por defecto (back-compat).
import { hexToHsl, hslToHex, lighten, darken, clamp, contrast, legibleOn, legibleOnBest } from './util.js'
import { seedFor, range } from './prng.js'

// acento usable COMO texto, legible segun tono (verde/amarillo de alta luminancia caen a tinta en claro).
function accentAsText(accent, tone) {
  if (tone === 'light') { const d = darken(accent, 0.55); return contrast(d, '#ffffff') >= 3.2 ? d : '#1c1510' }
  return lighten(accent, 0.2)
}

// CLAMP DE GAMUT (perceptual). Scope REAL: comprime ~61% de TODAS las combos (no solo brandColor neon: los esquemas
// harmony/temp/tone suben S a 0.84-0.95 a proposito). Comprime SOLO el tope de saturacion (soft-knee: S<=SK intacto;
// [SK..1] -> [SK..SMAX]) conservando HUE y L EXACTOS -> menos "neon barato"/dureza sin cambiar la identidad de marca.
// GUARD: revierte al acento original si comprimir bajaria el onAccent REAL (mismos anchors que finalize) por debajo del
// margen Y por debajo del valor previo -> nunca empeora la legibilidad. PURO/determinista (sin r()/Date -> no re-rollea).
function clampGamut(accent, tone) {
  const c = hexToHsl(accent)
  const SK = 0.82, SMAX = 0.92, GUARD = 3.5
  if (c.s <= SK) return accent
  const t = (c.s - SK) / (1 - SK)
  const cand = hslToHex(c.h, SK + (SMAX - SK) * t, c.l)
  const light = tone === 'light' ? '#ffffff' : '#fbf6ec', dark = tone === 'light' ? '#1c1510' : '#14090e'   // EXACTO a finalize
  const before = contrast(legibleOnBest(accent, light, dark), accent)
  const after = contrast(legibleOnBest(cand, light, dark), cand)
  return (after >= GUARD || after >= before) ? cand : accent
}

// GUARDRAIL determinista de accent2: debe (a) distinguirse de accent y (b) no perderse contra el bg. PURO (sin PRNG/
// Date). NO toca accent/ink/dim/onAccent (accent2 es relleno/stroke/gradiente, nunca texto). Separa por LUMINANCIA
// (preserva el hue) -> esquemas monocromaticos y marcas grises siguen coherentes, no se inventa un hue nuevo.
function separateAccent2(accent, accent2, bg0, bg1, tone) {
  const aH = hexToHsl(accent), cH = hexToHsl(accent2)
  // (a) accent2 casi identico a accent (mismo hue Y misma luminancia) -> empujar su L lejos de la de accent.
  const hueGap = Math.abs(((cH.h - aH.h) % 360 + 540) % 360 - 180)   // 0..180 distancia angular real
  if (hueGap < 24 && Math.abs(cH.l - aH.l) < 0.10) {
    const dir = aH.l < 0.5 ? 1 : -1                                   // accent oscuro -> accent2 mas claro (y viceversa)
    accent2 = hslToHex(cH.h, cH.s, clamp(aH.l + dir * 0.18, 0.18, 0.82))
  }
  // (b) contraste minimo contra el bg PEOR (asi se garantizan ambos fondos): empuja la L lejos del fondo por pasos fijos.
  const MIN = 1.6                                                     // accent2 es acento, no texto -> piso suave
  let worstBg = contrast(accent2, bg0) <= contrast(accent2, bg1) ? bg0 : bg1
  for (let i = 0; i < 8 && contrast(accent2, worstBg) < MIN; i++) {
    accent2 = tone === 'light' ? darken(accent2, 0.12) : lighten(accent2, 0.12)
    worstBg = contrast(accent2, bg0) <= contrast(accent2, bg1) ? bg0 : bg1
  }
  return accent2
}

// FINALIZER compartido: roles de texto/superficie legibles para CUALQUIER esquema.
// onAccent (texto SOBRE el chip de acento) se elige por CONTRASTE REAL via legibleOn, NO por umbral de luminancia HSL:
// la luminancia HSL no es la perceptual, asi que un corte .l>0.6 dejaba a hues luminosos (verde/ambar) con texto
// ilegible (la "banda muerta"). Elegir el mejor de off-white/near-black por contraste garantiza >=~4.2 para todo hue.
export function finalize(accent, accent2, bg0, bg1, tone) {
  accent = clampGamut(accent, tone)                            // gamut/sat clamp perceptual ANTES de derivar roles (hue/L intactos; onAccent garantizado por el guard)
  accent2 = separateAccent2(accent, accent2, bg0, bg1, tone)   // garantiza accent2 distinguible de accent y visible sobre el bg
  if (tone === 'light') return {
    tone, accent, accent2, bg0, bg1, surface: 'rgba(20,16,24,0.05)',
    ink: '#1c1510', dim: '#564a3e', inkText: accentAsText(accent, 'light'),
    onAccent: legibleOnBest(accent, '#ffffff', '#1c1510'),   // APCA + piso WCAG (mata la "banda muerta")
  }
  return {
    tone, accent, accent2, bg0, bg1, surface: 'rgba(255,255,255,0.05)',
    ink: '#fbf6ec', dim: '#cfc6d6', inkText: accentAsText(accent, 'dark'),
    onAccent: legibleOnBest(accent, '#fbf6ec', '#14090e'),   // APCA + piso WCAG (perceptual, mejor en oscuro)
  }
}

// fondos por tono a partir del hue de marca (reusable por los modulos de color)
export function tonedBg(brandHsl, tone, satMul = 1, lightL = 0.07, darkL = 0.03) {
  if (tone === 'light') return [hslToHex(brandHsl.h, 0.18, 0.965), hslToHex(brandHsl.h, 0.14, 0.92)]
  return [hslToHex(brandHsl.h, clamp(brandHsl.s * 0.5 * satMul, 0.2, 0.55), lightL), hslToHex(brandHsl.h, clamp(brandHsl.s * 0.45 * satMul, 0.18, 0.5), darkL)]
}

// FIDELIDAD DE MARCA: ancla el HUE del acento al de la marca por `blend` (0 = acento del mood puro, 1 = hue de marca),
// conservando la S y la L del mood -> el CONTRASTE (onAccent/APCA) no cambia y el acento queda al brillo/saturacion del
// esquema. Default 1 (ancla completa): el acento PROTAGONISTA lee como la marca; el MOOD termico se preserva en accent2
// y el bg (que NO se anclan). Un blend parcial daria un hue intermedio turbio cuando marca y mood son opuestos (azul en
// dorado -> verde), por eso anclamos full. PURO/determinista (sin PRNG/Date). Lo usan los moods de temperatura fuertes.
export function brandAccent(brandColor, accentHex, blend = 1) {
  if (!brandColor) return accentHex
  const a = hexToHsl(accentHex), b = hexToHsl(brandColor)
  const d = ((b.h - a.h + 540) % 360) - 180
  return hslToHex((a.h + d * blend + 360) % 360, a.s, a.l)
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
