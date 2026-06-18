// urvid 1.0 · biblioteca COLOR — esquemas/moods. Cada modulo: derive(brandColor, { tone, rubro, seed }) -> paleta.
// Decide accent/accent2/bg0/bg1 (el "esquema") y llama finalize() (legibilidad garantizada). El director elige UNO.
// ESTA es la PLANTILLA para que los agentes llenen color/ con cientos de esquemas/moods/paletas curadas.
import { register } from '../../core/registry.js'
import { finalize, tonedBg } from '../../core/palette.js'
import { hexToHsl, hslToHex, lighten, darken, clamp } from '../../core/util.js'
import { seedFor, range } from '../../core/prng.js'

register({
  id: 'color.scheme.brand-classic', lib: 'color', category: 'harmony-schemes', tones: ['dark', 'light'], rubros: ['*'], weight: 1.4, tags: ['universal', 'seguro'],
  derive(brandColor, { tone, rubro, seed }) {
    const prng = seedFor(seed, 'color'), a = hexToHsl(brandColor || '#5b8cff')
    const accent = hslToHex(a.h, clamp(a.s, 0.5, 0.92), clamp(a.l, 0.42, 0.68))
    const sh = range(prng, 18, 42) * (prng() < 0.5 ? -1 : 1)
    const accent2 = hslToHex(a.h + sh, clamp(a.s * 0.92, 0.45, 0.9), clamp(a.l + 0.04, 0.42, 0.7))
    const [bg0, bg1] = tonedBg(a, tone)
    return finalize(accent, accent2, bg0, bg1, tone)
  },
})

register({
  id: 'color.scheme.split-comp', lib: 'color', category: 'harmony-schemes', tones: ['dark', 'light'], rubros: ['*'], weight: 1, tags: ['colorido', 'gradiente'],
  derive(brandColor, { tone, seed }) {
    const a = hexToHsl(brandColor || '#5b8cff')
    const accent = hslToHex(a.h, clamp(a.s + 0.06, 0.55, 0.95), clamp(a.l, 0.44, 0.66))
    const accent2 = hslToHex(a.h + (seedFor(seed, 'c2')() < 0.5 ? 150 : 210), clamp(a.s, 0.5, 0.9), clamp(a.l + 0.05, 0.45, 0.7))   // split-complementario -> gradientes ricos
    const [bg0, bg1] = tonedBg(a, tone)
    return finalize(accent, accent2, bg0, bg1, tone)
  },
})

register({
  id: 'color.scheme.duotone', lib: 'color', category: 'tone-systems', tones: ['dark', 'light'], rubros: ['*', 'moda', 'tech', 'belleza'], weight: 0.9, tags: ['duotono', 'editorial'],
  derive(brandColor, { tone }) {
    const a = hexToHsl(brandColor || '#5b8cff')
    const accent = hslToHex(a.h, clamp(a.s, 0.55, 0.95), tone === 'light' ? 0.48 : 0.6)
    const accent2 = hslToHex(a.h + 28, clamp(a.s, 0.5, 0.9), tone === 'light' ? 0.42 : 0.66)
    const bg0 = tone === 'light' ? hslToHex(a.h, 0.22, 0.95) : hslToHex(a.h, clamp(a.s, 0.3, 0.6), 0.10)
    const bg1 = tone === 'light' ? hslToHex(a.h, 0.16, 0.9) : hslToHex(a.h, clamp(a.s, 0.28, 0.55), 0.04)
    return finalize(accent, accent2, bg0, bg1, tone)
  },
})

register({
  id: 'color.scheme.mono-ink', lib: 'color', category: 'tone-systems', tones: ['dark', 'light'], rubros: ['*', 'finanzas', 'inmobiliaria', 'tech', 'default'], weight: 0.8, tags: ['sobrio', 'grafito', 'corporativo'],
  derive(brandColor, { tone }) {
    const a = hexToHsl(brandColor || '#5b8cff')
    const accent = hslToHex(a.h, clamp(a.s, 0.55, 0.9), clamp(a.l, 0.46, 0.64))   // UN acento que popea
    const accent2 = hslToHex(a.h, clamp(a.s * 0.4, 0.1, 0.3), tone === 'light' ? 0.55 : 0.5)   // grafito casi-neutro
    const [bg0, bg1] = tone === 'light' ? [hslToHex(a.h, 0.04, 0.97), hslToHex(a.h, 0.03, 0.93)] : [hslToHex(a.h, 0.12, 0.08), hslToHex(a.h, 0.1, 0.035)]
    return finalize(accent, accent2, bg0, bg1, tone)
  },
})

register({
  id: 'color.mood.luxe', lib: 'color', category: 'mood-grading', tones: ['dark'], rubros: ['*', 'moda', 'belleza', 'inmobiliaria', 'gastronomia'], weight: 0.8, tags: ['lujo', 'oscuro', 'premium'],
  derive(brandColor, { tone }) {
    const a = hexToHsl(brandColor || '#5b8cff')
    const accent = hslToHex(a.h, clamp(a.s, 0.45, 0.8), 0.62)   // rico, no candy
    const accent2 = hslToHex(a.h - 14, clamp(a.s * 0.85, 0.4, 0.7), 0.55)
    const bg0 = hslToHex(a.h, clamp(a.s * 0.3, 0.12, 0.3), 0.05), bg1 = '#050406'
    return finalize(accent, accent2, bg0, bg1, 'dark')   // luxe es siempre oscuro+contraste
  },
})

register({
  id: 'color.mood.vibrant', lib: 'color', category: 'mood-grading', tones: ['dark', 'light'], rubros: ['*', 'fitness', 'gastronomia', 'educacion', 'moda'], weight: 0.9, tags: ['vibrante', 'energico', 'joven'],
  derive(brandColor, { tone, seed }) {
    const a = hexToHsl(brandColor || '#5b8cff')
    const accent = hslToHex(a.h, clamp(a.s + 0.15, 0.7, 1), tone === 'light' ? 0.5 : 0.62)
    const accent2 = hslToHex(a.h + (seedFor(seed, 'cv')() < 0.5 ? 40 : -40), clamp(a.s + 0.1, 0.65, 0.98), tone === 'light' ? 0.48 : 0.64)
    const [bg0, bg1] = tonedBg(a, tone, 1.25)
    return finalize(accent, accent2, bg0, bg1, tone)
  },
})
