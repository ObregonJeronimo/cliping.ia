// urvid 1.0 · biblioteca COLOR — esquemas de ARMONIA cromatica (rotaciones de matiz sobre la rueda).
// Cada modulo deriva accent/accent2/bg0/bg1 del HUE de la marca y llama finalize() (legibilidad garantizada).
// Categoria: harmony-schemes. Prefijo de id: color.harmony.<nombre>. Determinista (cero Math.random/Date.now).
//
// REGLA DE LEGIBILIDAD (clave): finalize() elige onAccent (texto sobre el chip de acento) segun la luminancia
// del accent. Para que onAccent contraste >=3 con CUALQUIER hue (incluido verde/amarillo, que son muy luminosos),
// el accent se construye SIEMPRE via mkAccent(): en dark cae en L alto (onAccent->tinta oscura legible),
// en light cae en L bajo (onAccent->blanco legible). accent2 (que NO determina onAccent) conserva la rotacion
// de armonia con libertad de satur/luz -> de ahi viene la variedad cromatica de cada esquema.
import { register } from '../../core/registry.js'
import { finalize, tonedBg } from '../../core/palette.js'
import { hexToHsl, hslToHex, clamp } from '../../core/util.js'
import { seedFor } from '../../core/prng.js'

const BRAND_FALLBACK = '#5b8cff'

// accent legible para CUALQUIER hue: lightness en banda segura por tono (ver nota arriba).
// dark -> L alto (finalize pone texto oscuro encima); light -> L bajo (finalize pone texto blanco encima).
function mkAccent(h, s, tone, opts = {}) {
  const sat = clamp(s, opts.sLo ?? 0.5, opts.sHi ?? 0.95)
  const L = tone === 'light' ? clamp(opts.lLight ?? 0.30, 0.22, 0.34) : clamp(opts.lDark ?? 0.66, 0.62, 0.70)
  return hslToHex(h, sat, L)
}

// helper de modulo: registra un esquema cuyo accent2 es el accent rotado `rot` grados (+ ajustes de s/l).
function harmony(id, rot, { weight = 1, rubros = ['*'], tags = [], tones = ['dark', 'light'], a2sMul = 0.9, a2lDark = 0.62, a2lLight = 0.46, sLo = 0.5, sHi = 0.95 } = {}) {
  register({
    id, lib: 'color', category: 'harmony-schemes', tones, rubros, weight, tags,
    derive(brandColor, { tone }) {
      const a = hexToHsl(brandColor || BRAND_FALLBACK)
      const accent = mkAccent(a.h, a.s, tone, { sLo, sHi })
      const accent2 = hslToHex(a.h + rot, clamp(a.s * a2sMul, 0.3, sHi), tone === 'light' ? a2lLight : a2lDark)
      const [bg0, bg1] = tonedBg(a, tone)
      return finalize(accent, accent2, bg0, bg1, tone)
    },
  })
}

// ---- ANALOGAS (hue +-30) ----
harmony('color.harmony.analogous', 30, { weight: 1.2, tags: ['armonia', 'analogo', 'suave'] })
harmony('color.harmony.analogous-warm-bias', -36, { weight: 1.1, rubros: ['*', 'gastronomia', 'moda', 'belleza'], tags: ['armonia', 'analogo', 'calido'] })
harmony('color.harmony.analogous-cool-bias', 36, { weight: 1.1, rubros: ['*', 'tech', 'finanzas', 'salud'], tags: ['armonia', 'analogo', 'frio'] })
harmony('color.harmony.analogous-wide', 55, { weight: 0.95, tags: ['armonia', 'analogo', 'amplio'] })
harmony('color.harmony.near-analogous-tight', 15, { weight: 1, rubros: ['*', 'salud', 'finanzas', 'inmobiliaria'], tags: ['armonia', 'analogo', 'sutil'], a2sMul: 0.92 })
harmony('color.harmony.analogous-dusk', -28, { weight: 0.9, rubros: ['*', 'inmobiliaria', 'gastronomia'], tags: ['armonia', 'analogo', 'atardecer'], a2lDark: 0.56, a2lLight: 0.44 })

// ---- TRIADAS (+120/-120) ----
harmony('color.harmony.triadic', 120, { weight: 1.05, rubros: ['*', 'educacion', 'eventos'], tags: ['armonia', 'triada', 'colorido'] })
harmony('color.harmony.triad-muted', 120, { weight: 1, rubros: ['*', 'inmobiliaria', 'finanzas'], tags: ['armonia', 'triada', 'sobrio'], a2sMul: 0.55 })
harmony('color.harmony.triad-warm', -120, { weight: 0.95, rubros: ['*', 'gastronomia', 'fitness'], tags: ['armonia', 'triada', 'calido'] })
harmony('color.harmony.triad-cool', 120, { weight: 0.9, rubros: ['*', 'tech', 'salud'], tags: ['armonia', 'triada', 'frio'], a2sMul: 0.65 })

// ---- TETRADA / SQUARE (+90/+270) ----
harmony('color.harmony.tetradic', 90, { weight: 0.9, rubros: ['*', 'eventos', 'moda'], tags: ['armonia', 'tetrada', 'colorido'] })
harmony('color.harmony.tetrad-balanced', 60, { weight: 0.85, tags: ['armonia', 'tetrada', 'equilibrado'], a2sMul: 0.78 })

// ---- COMPLEMENTARIA (+180) ----
harmony('color.harmony.complementary', 180, { weight: 1.15, rubros: ['*', 'fitness', 'eventos'], tags: ['armonia', 'complementario', 'contraste'] })
harmony('color.harmony.complementary-soft', 180, { weight: 1, rubros: ['*', 'salud', 'belleza', 'inmobiliaria'], tags: ['armonia', 'complementario', 'suave'], a2sMul: 0.5 })
harmony('color.harmony.near-complement-warm', 165, { weight: 1, tags: ['armonia', 'complementario', 'tension', 'calido'], a2sMul: 0.88 })
harmony('color.harmony.near-complement-cool', 195, { weight: 1, tags: ['armonia', 'complementario', 'tension', 'frio'], a2sMul: 0.88 })

// ---- SPLIT-COMPLEMENTARIA (lados del +180) ----
harmony('color.harmony.split-comp-warm', 150, { weight: 1, rubros: ['*', 'gastronomia', 'fitness'], tags: ['armonia', 'split', 'calido'] })
harmony('color.harmony.split-comp-cool', 210, { weight: 0.95, rubros: ['*', 'tech', 'finanzas', 'salud'], tags: ['armonia', 'split', 'frio'], a2sMul: 0.82 })

// ---- DOBLE COMPLEMENTARIA / COMPOUND ----
harmony('color.harmony.double-complementary', 60 + 180, { weight: 0.85, rubros: ['*', 'eventos'], tags: ['armonia', 'doble-comp', 'rico'] })
harmony('color.harmony.compound', 180 - 24, { weight: 0.9, rubros: ['*', 'moda', 'belleza'], tags: ['armonia', 'compound', 'editorial'], a2sMul: 0.85 })

// ---- ACCENTED NEUTRAL (1 acento + neutro casi-gris) ----
register({
  id: 'color.harmony.accented-neutral', lib: 'color', category: 'harmony-schemes', tones: ['dark', 'light'], rubros: ['*', 'inmobiliaria', 'finanzas', 'tech', 'salud'], weight: 1.25, tags: ['armonia', 'neutro', 'minimal'],
  derive(brandColor, { tone }) {
    const a = hexToHsl(brandColor || BRAND_FALLBACK)
    const accent = mkAccent(a.h, a.s, tone)
    const accent2 = hslToHex(a.h, clamp(a.s * 0.18, 0.05, 0.18), tone === 'light' ? 0.55 : 0.55)   // neutro casi-gris
    const [bg0, bg1] = tone === 'light'
      ? [hslToHex(a.h, 0.05, 0.97), hslToHex(a.h, 0.04, 0.93)]
      : [hslToHex(a.h, 0.1, 0.075), hslToHex(a.h, 0.08, 0.035)]
    return finalize(accent, accent2, bg0, bg1, tone)
  },
})

register({
  id: 'color.harmony.accented-neutral-cool', lib: 'color', category: 'harmony-schemes', tones: ['dark', 'light'], rubros: ['*', 'tech', 'finanzas'], weight: 1, tags: ['armonia', 'neutro', 'frio'],
  derive(brandColor, { tone }) {
    const a = hexToHsl(brandColor || BRAND_FALLBACK)
    const accent = mkAccent(a.h, a.s, tone)
    const accent2 = hslToHex(220, clamp(a.s * 0.2, 0.08, 0.22), tone === 'light' ? 0.5 : 0.55)   // neutro de bias azulado
    const [bg0, bg1] = tone === 'light'
      ? [hslToHex(220, 0.08, 0.97), hslToHex(220, 0.06, 0.92)]
      : [hslToHex(220, 0.14, 0.08), hslToHex(220, 0.12, 0.035)]
    return finalize(accent, accent2, bg0, bg1, tone)
  },
})

// ---- MONOCROMATICA (mismo hue, varias luminancias) ----
register({
  id: 'color.harmony.monochromatic-rich', lib: 'color', category: 'harmony-schemes', tones: ['dark', 'light'], rubros: ['*', 'moda', 'tech', 'belleza'], weight: 1.1, tags: ['armonia', 'mono', 'cohesivo'],
  derive(brandColor, { tone }) {
    const a = hexToHsl(brandColor || BRAND_FALLBACK)
    const accent = mkAccent(a.h, a.s, tone)
    const accent2 = hslToHex(a.h, clamp(a.s * 0.8, 0.4, 0.85), tone === 'light' ? 0.5 : 0.48)   // mismo hue, otra luz
    const [bg0, bg1] = tone === 'light'
      ? [hslToHex(a.h, 0.2, 0.96), hslToHex(a.h, 0.15, 0.91)]
      : [hslToHex(a.h, clamp(a.s * 0.5, 0.2, 0.55), 0.085), hslToHex(a.h, clamp(a.s * 0.45, 0.18, 0.5), 0.035)]
    return finalize(accent, accent2, bg0, bg1, tone)
  },
})

register({
  id: 'color.harmony.monochromatic-deep', lib: 'color', category: 'harmony-schemes', tones: ['dark'], rubros: ['*', 'moda', 'belleza', 'inmobiliaria'], weight: 0.85, tags: ['armonia', 'mono', 'profundo'],
  derive(brandColor) {
    const a = hexToHsl(brandColor || BRAND_FALLBACK)
    const accent = mkAccent(a.h, a.s, 'dark')
    const accent2 = hslToHex(a.h, clamp(a.s * 0.85, 0.4, 0.85), 0.5)
    const bg0 = hslToHex(a.h, clamp(a.s * 0.55, 0.22, 0.55), 0.07)
    const bg1 = hslToHex(a.h, clamp(a.s * 0.5, 0.2, 0.5), 0.025)
    return finalize(accent, accent2, bg0, bg1, 'dark')   // mono profundo: solo se ve bien oscuro
  },
})

register({
  id: 'color.harmony.monochromatic-airy', lib: 'color', category: 'harmony-schemes', tones: ['light'], rubros: ['*', 'salud', 'belleza', 'educacion'], weight: 0.85, tags: ['armonia', 'mono', 'claro'],
  derive(brandColor) {
    const a = hexToHsl(brandColor || BRAND_FALLBACK)
    const accent = mkAccent(a.h, a.s, 'light')
    const accent2 = hslToHex(a.h, clamp(a.s * 0.7, 0.32, 0.72), 0.54)
    const bg0 = hslToHex(a.h, 0.22, 0.975)
    const bg1 = hslToHex(a.h, 0.16, 0.93)
    return finalize(accent, accent2, bg0, bg1, 'light')   // mono aireado: solo claro
  },
})

register({
  id: 'color.harmony.mono-accent-pop', lib: 'color', category: 'harmony-schemes', tones: ['dark', 'light'], rubros: ['*', 'tech', 'moda'], weight: 0.95, tags: ['armonia', 'mono', 'pop'],
  derive(brandColor, { tone }) {
    const a = hexToHsl(brandColor || BRAND_FALLBACK)
    const accent = mkAccent(a.h, a.s, tone, { sLo: 0.7 })   // acento muy saturado
    const accent2 = hslToHex(a.h, clamp(a.s * 0.55, 0.28, 0.58), tone === 'light' ? 0.55 : 0.5)
    const [bg0, bg1] = tonedBg(a, tone)
    return finalize(accent, accent2, bg0, bg1, tone)
  },
})

// ---- VARIANTES VIVAS (fondo con mas tincion del hue de marca) ----
register({
  id: 'color.harmony.complement-clash', lib: 'color', category: 'harmony-schemes', tones: ['dark', 'light'], rubros: ['*', 'eventos', 'moda'], weight: 0.8, tags: ['armonia', 'complementario', 'audaz'],
  derive(brandColor, { tone }) {
    const a = hexToHsl(brandColor || BRAND_FALLBACK)
    const accent = mkAccent(a.h, a.s, tone, { sLo: 0.72 })
    const accent2 = hslToHex(a.h + 180, clamp(a.s + 0.1, 0.66, 1), tone === 'light' ? 0.46 : 0.62)   // choque de complementarios
    const [bg0, bg1] = tone === 'light'
      ? [hslToHex(a.h, 0.06, 0.97), hslToHex(a.h, 0.05, 0.92)]
      : [hslToHex(a.h, 0.16, 0.07), hslToHex(a.h, 0.12, 0.03)]
    return finalize(accent, accent2, bg0, bg1, tone)
  },
})

register({
  id: 'color.harmony.triadic-vivid', lib: 'color', category: 'harmony-schemes', tones: ['dark', 'light'], rubros: ['*', 'eventos', 'fitness', 'educacion'], weight: 0.9, tags: ['armonia', 'triada', 'vibrante'],
  derive(brandColor, { tone, seed }) {
    const a = hexToHsl(brandColor || BRAND_FALLBACK)
    const dir = seedFor(seed, 'h-trv')() < 0.5 ? 1 : -1
    const accent = mkAccent(a.h, a.s, tone, { sLo: 0.72 })
    const accent2 = hslToHex(a.h + 120 * dir, clamp(a.s + 0.08, 0.66, 0.98), tone === 'light' ? 0.46 : 0.64)
    const [bg0, bg1] = tonedBg(a, tone, 1.15)
    return finalize(accent, accent2, bg0, bg1, tone)
  },
})

register({
  id: 'color.harmony.split-comp-vivid', lib: 'color', category: 'harmony-schemes', tones: ['dark', 'light'], rubros: ['*', 'fitness', 'moda'], weight: 0.9, tags: ['armonia', 'split', 'vibrante'],
  derive(brandColor, { tone, seed }) {
    const a = hexToHsl(brandColor || BRAND_FALLBACK)
    const off = seedFor(seed, 'h-spv')() < 0.5 ? 150 : 210
    const accent = mkAccent(a.h, a.s, tone, { sLo: 0.68 })
    const accent2 = hslToHex(a.h + off, clamp(a.s + 0.06, 0.62, 0.96), tone === 'light' ? 0.47 : 0.64)
    const [bg0, bg1] = tonedBg(a, tone, 1.2)
    return finalize(accent, accent2, bg0, bg1, tone)
  },
})

register({
  id: 'color.harmony.analogous-triple', lib: 'color', category: 'harmony-schemes', tones: ['dark', 'light'], rubros: ['*', 'educacion', 'eventos'], weight: 0.85, tags: ['armonia', 'analogo', 'gradiente'],
  derive(brandColor, { tone, seed }) {
    const a = hexToHsl(brandColor || BRAND_FALLBACK)
    const dir = seedFor(seed, 'h-at3')() < 0.5 ? 1 : -1
    // accent corrido 15deg dentro de la banda analoga, accent2 al extremo -> gradiente fluido
    const accent = mkAccent(a.h + 15 * dir, a.s, tone)
    const accent2 = hslToHex(a.h + 45 * dir, clamp(a.s * 0.95, 0.5, 0.9), tone === 'light' ? 0.46 : 0.66)
    const [bg0, bg1] = tonedBg(a, tone)
    return finalize(accent, accent2, bg0, bg1, tone)
  },
})
